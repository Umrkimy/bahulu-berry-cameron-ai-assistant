import { Badge, Box, Button, Card, Grid, Group, Modal, ScrollArea, SegmentedControl, Stack, Text, Textarea, UnstyledButton } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconBrandWhatsapp, IconMessage, IconRobot, IconUserCheck } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getApiError } from "../../api/errors";
import { claimSupportConversation, getConversationMessages, getSupportConversations, getWhatsAppLink, rejectSupportDraft, returnSupportConversationToAi, sendSimulatedDashboardReply } from "../../api/support";
import type { Role } from "../../auth/permissions";
import type { SupportConversation, SupportDraftApproval, SupportDraftReview, SupportMessage } from "../../types/support";
import { DraftCard } from "./DraftReviewQueue";
import { usePendingDrafts } from "./usePendingDrafts";

type Admin = { id: number; role: Role } | null;
const REFRESH_MS = 15_000;

const formatTime = (value: string) => new Date(value).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" });
const formatContact = (contact: string | null) => !contact ? "Unknown number" : /^\d{8,15}$/.test(contact) ? `+${contact}` : contact;

function stateBadge(conversation: SupportConversation, names: Map<number, string>) {
  if (conversation.handoff_state === "HUMAN_REQUESTED") return <Badge color="orange" variant="light">Waiting for staff</Badge>;
  if (conversation.handoff_state === "HUMAN_HANDLING") return <Badge color="bahulu" variant="light">With {names.get(conversation.assigned_admin_id ?? -1) ?? "staff"}</Badge>;
  return <Badge color="green" variant="light">Berry</Badge>;
}

function senderLabel(message: SupportMessage, names: Map<number, string>) {
  if (message.direction === "INBOUND") return "Customer";
  if (message.author_admin_id === null) return "Berry (automatic)";
  return names.get(message.author_admin_id) ?? "Staff";
}

const DELIVERY_LABELS: Record<string, string> = { PENDING_SEND: "Sending…", SENT: "Sent", DELIVERED: "Delivered", READ: "Read", SIMULATED_SENT: "Saved here only, sending is off", AUTO_REPLY: "Saved here only, sending is off" };

function DeliveryNote({ message }: { message: SupportMessage }) {
  if (message.outcome === "SEND_FAILED") return <Text size="xs" c="red" mt={4}>Not delivered{message.delivery_error ? ` (${message.delivery_error})` : ""}. Send it with Open WhatsApp.</Text>;
  const label = DELIVERY_LABELS[message.outcome];
  return label ? <Text size="xs" c="dimmed" mt={4} ta="right">{label}</Text> : null;
}

function MessageBubble({ message, names }: { message: SupportMessage; names: Map<number, string> }) {
  const outbound = message.direction === "OUTBOUND";
  return (
    <Group justify={outbound ? "flex-end" : "flex-start"}>
      <Box maw="80%" p="sm" style={{ borderRadius: 12, background: outbound ? "var(--ui-accent-soft)" : "var(--ui-subtle)", border: "1px solid var(--ui-border)" }}>
        <Text size="xs" fw={600} c="dimmed">{senderLabel(message, names)} · {formatTime(message.processed_at)}</Text>
        <Text size="sm" mt={4} style={{ whiteSpace: "pre-wrap" }}>{message.content ?? "Message text was removed after 30 days."}</Text>
        {outbound ? <DeliveryNote message={message} /> : null}
      </Box>
    </Group>
  );
}

function ConversationThread({ conversation, currentAdmin, names, drafts }: { conversation: SupportConversation; currentAdmin: Admin; names: Map<number, string>; drafts: SupportDraftReview[] }) {
  const queryClient = useQueryClient();
  const [approved, setApproved] = useState<SupportDraftApproval | null>(null);
  const [rejecting, setRejecting] = useState<SupportDraftReview | null>(null);
  const ticketId = conversation.support_request_id;
  const canManage = Boolean(currentAdmin && (currentAdmin.role === "OWNER" || conversation.assigned_admin_id === currentAdmin.id));
  const handling = conversation.handoff_state === "HUMAN_HANDLING" && canManage && ticketId !== null;
  const messages = useQuery({ queryKey: ["conversation-messages", conversation.id], queryFn: () => getConversationMessages(conversation.id), refetchInterval: REFRESH_MS });
  const link = useQuery({ queryKey: ["support-whatsapp-link", ticketId], queryFn: () => getWhatsAppLink(ticketId!), enabled: handling, retry: false });
  const replyForm = useForm({ initialValues: { content: "" }, validate: { content: (value) => value.trim() ? null : "Write a reply first" } });
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["support-conversations"] }), queryClient.invalidateQueries({ queryKey: ["conversation-messages", conversation.id] }), queryClient.invalidateQueries({ queryKey: ["support-drafts"] })]);
  const onError = (title: string) => (error: unknown) => notifications.show({ color: "red", title, message: getApiError(error).message });
  const claim = useMutation({ mutationFn: () => claimSupportConversation(ticketId!), onSuccess: () => { void refresh(); notifications.show({ color: "green", title: "Chat is yours", message: "Berry stays quiet while you handle this customer." }); }, onError: onError("Could not take this chat") });
  const handBack = useMutation({ mutationFn: () => returnSupportConversationToAi(ticketId!), onSuccess: () => { void refresh(); notifications.show({ color: "green", title: "Chat finished", message: "Berry asks the customer to rate the chat, then answers the menu again." }); }, onError: onError("Could not finish the chat") });
  const reply = useMutation({ mutationFn: () => sendSimulatedDashboardReply(ticketId!, replyForm.values.content.trim()), onSuccess: () => { replyForm.reset(); void refresh(); }, onError: onError("Reply not sent") });
  const reject = useMutation({ mutationFn: (id: number) => rejectSupportDraft(id), onSuccess: () => { setRejecting(null); void refresh(); }, onError: onError("Draft not rejected") });

  return (
    <Card withBorder p={0}>
      <Group justify="space-between" p="md" style={{ borderBottom: "1px solid var(--ui-border)" }}>
        <Stack gap={2}>
          <Text fw={600}>{formatContact(conversation.contact_reference)}</Text>
          <Group gap="xs">{stateBadge(conversation, names)}{conversation.language ? <Badge variant="outline" color="gray">{conversation.language === "MS" ? "Bahasa Melayu" : "English"}</Badge> : null}</Group>
        </Stack>
        <Group gap="xs">
          {conversation.handoff_state === "HUMAN_REQUESTED" && ticketId !== null ? <Button leftSection={<IconUserCheck size={16} />} loading={claim.isPending} onClick={() => claim.mutate()}>Take this chat</Button> : null}
          {handling ? <Button component="a" href={link.data?.url} target="_blank" rel="noopener noreferrer" variant="default" leftSection={<IconBrandWhatsapp size={16} />} disabled={!link.data}>Open WhatsApp</Button> : null}
          {handling ? <Button variant="default" leftSection={<IconRobot size={16} />} loading={handBack.isPending} onClick={() => handBack.mutate()}>Finish chat</Button> : null}
        </Group>
      </Group>
      <ScrollArea.Autosize mah={520} p="md">
        <Stack gap="sm">
          {messages.isLoading ? <Text size="sm" c="dimmed">Loading messages…</Text>
            : messages.isError ? <Text size="sm" c="red">{getApiError(messages.error).message}</Text>
            : messages.data?.map((message) => <MessageBubble key={message.id} message={message} names={names} />)}
        </Stack>
      </ScrollArea.Autosize>
      <Stack gap="sm" p="md" style={{ borderTop: "1px solid var(--ui-border)" }}>
        {drafts.map((draft) => <DraftCard key={draft.id} draft={draft} onApproved={(approval) => { setApproved(approval); void refresh(); }} onReject={setRejecting} />)}
        {approved && !approved.sent && approved.whatsapp_url ? <Group gap="xs"><Text size="sm">Reply approved and copied.</Text><Button size="xs" component="a" href={approved.whatsapp_url} target="_blank" rel="noopener noreferrer" color="green" leftSection={<IconBrandWhatsapp size={14} />}>Send it in WhatsApp</Button></Group> : null}
        {handling ? (
          <form onSubmit={replyForm.onSubmit(() => reply.mutate())}>
            <Stack gap="xs">
              <Textarea aria-label="Reply to customer" placeholder="Write your reply…" description="Goes to the customer on WhatsApp. If sending is off, it is saved here and you can send it with Open WhatsApp." autosize minRows={2} maxLength={2000} {...replyForm.getInputProps("content")} />
              <Group justify="flex-end"><Button type="submit" leftSection={<IconMessage size={16} />} loading={reply.isPending}>Send reply</Button></Group>
            </Stack>
          </form>
        ) : conversation.handoff_state === "AI_ACTIVE" && !drafts.length ? <Text size="sm" c="dimmed">Berry is handling this chat. It passes the chat to staff when the customer asks for a person.</Text> : null}
      </Stack>
      <Modal opened={rejecting !== null} onClose={() => setRejecting(null)} title="Reject this draft?">
        <Stack>
          <Text size="sm">The suggested reply is discarded and nothing is sent.</Text>
          <Group justify="flex-end"><Button variant="default" onClick={() => setRejecting(null)}>Cancel</Button><Button color="red" loading={reject.isPending} onClick={() => rejecting && reject.mutate(rejecting.id)}>Reject draft</Button></Group>
        </Stack>
      </Modal>
    </Card>
  );
}

export default function WhatsAppInbox({ currentAdmin, names }: { currentAdmin: Admin; names: Map<number, string> }) {
  const [filter, setFilter] = useState<"attention" | "all">("attention");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const conversations = useQuery({ queryKey: ["support-conversations", filter], queryFn: () => getSupportConversations({ needs_attention: filter === "attention", page_size: 50 }), refetchInterval: REFRESH_MS });
  const pendingDrafts = usePendingDrafts().data?.items ?? [];
  const items = conversations.data?.items ?? [];
  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <Grid gap="md">
      <Grid.Col span={{ base: 12, md: 4 }}>
        <Stack gap="sm">
          <SegmentedControl fullWidth aria-label="Which chats" value={filter} onChange={(value) => { setFilter(value as "attention" | "all"); setSelectedId(null); }} data={[{ label: "Needs you", value: "attention" }, { label: "All chats", value: "all" }]} />
          {conversations.isLoading ? <Text size="sm" c="dimmed">Loading chats…</Text>
            : conversations.isError ? <Card withBorder><Group justify="space-between"><Text size="sm" c="red">{getApiError(conversations.error).message}</Text><Button variant="default" onClick={() => void conversations.refetch()}>Try again</Button></Group></Card>
            : !items.length ? <Card withBorder><Text size="sm" c="dimmed">{filter === "attention" ? "Nothing needs you right now. Berry is handling the chats." : "No WhatsApp chats yet."}</Text></Card>
            : items.map((item) => (
              <UnstyledButton key={item.id} onClick={() => setSelectedId(item.id)} aria-pressed={item.id === selectedId}>
                <Card withBorder p="sm" style={{ borderColor: item.id === selectedId ? "var(--ui-accent)" : undefined }}>
                  <Group justify="space-between" wrap="nowrap"><Text fw={600} size="sm">{formatContact(item.contact_reference)}</Text><Text size="xs" c="dimmed">{formatTime(item.last_at)}</Text></Group>
                  <Text size="sm" c="dimmed" lineClamp={1}>{item.last_direction === "OUTBOUND" ? "Reply: " : ""}{item.last_message ?? "Message removed after 30 days"}</Text>
                  <Group gap="xs" mt={6}>{stateBadge(item, names)}{item.pending_drafts ? <Badge color="bahulu" variant="filled">{item.pending_drafts} to review</Badge> : null}</Group>
                </Card>
              </UnstyledButton>
            ))}
        </Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 8 }}>
        {selected ? <ConversationThread key={selected.id} conversation={selected} currentAdmin={currentAdmin} names={names} drafts={pendingDrafts.filter((draft) => draft.conversation_id === selected.id)} />
          : <Card withBorder><Text size="sm" c="dimmed">Pick a chat to read it.</Text></Card>}
      </Grid.Col>
    </Grid>
  );
}
