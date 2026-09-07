import { Badge, Button, Card, Group, Stack, Text, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconBrandWhatsapp, IconMessage, IconUserCheck, IconWand } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { claimSupportConversation, getSupportMessages, getWhatsAppLink, requestHumanTakeover, returnSupportConversationToAi, sendSimulatedDashboardReply } from "../../api/support";
import { getApiError } from "../../api/errors";
import type { SupportMessagingConversation, SupportRequest } from "../../types/support";

interface HumanTakeoverPanelProps {
  ticket: SupportRequest;
  conversation: SupportMessagingConversation | null;
  currentAdmin: { id: number; role: "OWNER" | "STAFF" } | null;
  onTicketChanged: (ticket: SupportRequest) => void;
  onRefresh: () => void;
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" });
}

export default function HumanTakeoverPanel({ ticket, conversation, currentAdmin, onTicketChanged, onRefresh }: HumanTakeoverPanelProps) {
  const messages = useQuery({ queryKey: ["support-messages", ticket.id], queryFn: () => getSupportMessages(ticket.id), enabled: Boolean(conversation) });
  const canManage = Boolean(currentAdmin && (currentAdmin.role === "OWNER" || ticket.assigned_admin_id === currentAdmin.id));
  const replyForm = useForm({ initialValues: { content: "" }, validate: { content: (value) => value.trim() ? null : "Enter a reply" } });
  const link = useQuery({ queryKey: ["support-whatsapp-link", ticket.id], queryFn: () => getWhatsAppLink(ticket.id), enabled: Boolean(conversation && ticket.handoff_state === "HUMAN_HANDLING" && canManage), retry: false });
  const claim = useMutation({ mutationFn: () => claimSupportConversation(ticket.id), onSuccess: (item) => { onTicketChanged(item); onRefresh(); notifications.show({ title: "Conversation claimed", message: "AI is paused while you handle this customer.", color: "green" }); }, onError: (error) => notifications.show({ title: "Unable to claim conversation", message: getApiError(error).message, color: "red" }) });
  const requestTakeover = useMutation({ mutationFn: () => requestHumanTakeover(ticket.id), onSuccess: (item) => { onTicketChanged(item); onRefresh(); notifications.show({ title: "Human takeover requested", message: "The conversation is ready for a staff member to claim.", color: "green" }); }, onError: (error) => notifications.show({ title: "Unable to request human takeover", message: getApiError(error).message, color: "red" }) });
  const returnToAi = useMutation({ mutationFn: () => returnSupportConversationToAi(ticket.id), onSuccess: (item) => { onTicketChanged(item); onRefresh(); notifications.show({ title: "AI handling restored", message: "Future safe drafts can now be created.", color: "green" }); }, onError: (error) => notifications.show({ title: "Unable to return to AI", message: getApiError(error).message, color: "red" }) });
  const reply = useMutation({ mutationFn: () => sendSimulatedDashboardReply(ticket.id, replyForm.values.content.trim()), onSuccess: () => { replyForm.reset(); onRefresh(); notifications.show({ title: "Local reply recorded", message: "This test reply was not sent to WhatsApp.", color: "green" }); }, onError: (error) => notifications.show({ title: "Unable to record reply", message: getApiError(error).message, color: "red" }) });

  if (!conversation) return null;

  const stateLabel = ticket.handoff_state === "HUMAN_REQUESTED" ? "Human requested" : ticket.handoff_state === "HUMAN_HANDLING" ? "Human handling" : "AI active";
  const stateColor = ticket.handoff_state === "HUMAN_HANDLING" ? "bahulu" : ticket.handoff_state === "HUMAN_REQUESTED" ? "orange" : "green";

  return <Stack gap="sm"><Card withBorder bg="cream.0"><Stack gap="sm"><Group justify="space-between"><Group gap="xs"><IconUserCheck size={18} /><Text fw={700}>Human takeover</Text></Group><Badge color={stateColor} variant="light">{stateLabel}</Badge></Group><Text size="sm" c="dimmed">Messages are visible to the team for 30 days, then their text is automatically removed. Dashboard replies are local simulations until Meta sending is approved.</Text>{ticket.handoff_state === "AI_ACTIVE" ? <Button leftSection={<IconUserCheck size={16} />} onClick={() => requestTakeover.mutate()} loading={requestTakeover.isPending}>Request human takeover</Button> : null}{ticket.handoff_state === "HUMAN_REQUESTED" && ticket.assigned_admin_id === null ? <Button leftSection={<IconUserCheck size={16} />} onClick={() => claim.mutate()} loading={claim.isPending}>Claim conversation</Button> : null}{ticket.handoff_state === "HUMAN_HANDLING" && canManage ? <Group grow><Button component="a" href={link.data?.url} target="_blank" rel="noreferrer" leftSection={<IconBrandWhatsapp size={16} />} disabled={!link.data}>Open WhatsApp</Button><Button variant="light" leftSection={<IconWand size={16} />} onClick={() => returnToAi.mutate()} loading={returnToAi.isPending}>Return to AI</Button></Group> : null}</Stack></Card><Stack gap="xs"><Text fw={700} size="sm">30-day conversation timeline</Text>{messages.isLoading ? <Text size="sm" c="dimmed">Loading messages…</Text> : messages.data?.length ? messages.data.map((message) => <Card key={message.id} withBorder p="sm" bg={message.direction === "OUTBOUND" ? "cream.0" : "white"}><Text size="xs" fw={700} c="dimmed">{message.direction === "OUTBOUND" ? "Team reply" : "Customer message"} · {formatTime(message.processed_at)}</Text><Text size="sm" mt={4} style={{ whiteSpace: "pre-wrap" }}>{message.content ?? "Message text was removed after the 30-day retention period."}</Text></Card>) : <Text size="sm" c="dimmed">No retained messages for this conversation.</Text>}</Stack>{ticket.handoff_state === "HUMAN_HANDLING" && canManage ? <form onSubmit={replyForm.onSubmit(() => reply.mutate())}><Stack gap="xs"><Textarea label="Simulated dashboard reply" description="Local test mode only. It records a simulated outgoing message and does not contact WhatsApp." minRows={3} {...replyForm.getInputProps("content")} /><Group justify="flex-end"><Button type="submit" leftSection={<IconMessage size={16} />} loading={reply.isPending}>Record simulated reply</Button></Group></Stack></form> : null}</Stack>;
}
