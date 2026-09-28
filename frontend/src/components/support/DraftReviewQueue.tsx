import { Anchor, Badge, Button, Card, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBrandWhatsapp, IconCheck, IconCopy, IconEdit, IconInbox, IconX } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getApiError } from "../../api/errors";
import { approveSupportDraft, rejectSupportDraft } from "../../api/support";
import type { SupportDraftApproval, SupportDraftReview } from "../../types/support";
import { usePendingDrafts } from "./usePendingDrafts";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    notifications.show({ color: "green", title: "Reply copied", message: "Paste it into WhatsApp and press Send yourself." });
  } catch {
    notifications.show({ color: "yellow", title: "Copy the reply manually", message: "Your browser blocked clipboard access." });
  }
}

const formatTime = (value: string) => new Date(value).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" });

function DraftCard({ draft, onApproved, onReject }: { draft: SupportDraftReview; onApproved: (approval: SupportDraftApproval) => void; onReject: (draft: SupportDraftReview) => void }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(draft.body ?? "");
  const trimmed = text.trim();
  const edited = trimmed !== (draft.body ?? "").trim();
  const approve = useMutation({
    mutationFn: () => approveSupportDraft(draft.id, edited ? trimmed : undefined),
    onSuccess: async (approval) => {
      onApproved(approval);
      await copyText(approval.text);
      void queryClient.invalidateQueries({ queryKey: ["support-drafts"] });
    },
    onError: (error) => notifications.show({ color: "red", title: "Draft not approved", message: getApiError(error).message }),
  });

  return (
    <Card withBorder>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Text fw={700}>{draft.support_request_id ? `Ticket #${draft.support_request_id}` : "WhatsApp message"}</Text>
          <Group gap="xs"><Badge variant="light">{draft.language === "MS" ? "Bahasa Melayu" : "English"}</Badge><Text size="sm" c="dimmed">{formatTime(draft.created_at)}</Text></Group>
        </Group>
        <Stack gap={2}>
          <Text size="sm" fw={600}>Customer wrote</Text>
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{draft.customer_message ?? "Message text has been removed after 30 days."}</Text>
        </Stack>
        <Stack gap={2}>
          <Text size="sm" fw={600}>Suggested reply</Text>
          {editing
            ? <Textarea aria-label="Edit reply" autosize minRows={3} maxLength={2000} value={text} onChange={(event) => setText(event.currentTarget.value)} />
            : <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{text}</Text>}
        </Stack>
        {draft.sources.length ? <Text size="sm" c="dimmed">Based on: {draft.sources.map((source) => `${source.label} (${source.type.toLowerCase()})`).join(", ")}</Text> : null}
        <Group gap="xs">
          <Button variant="light" leftSection={<IconEdit size={15} />} onClick={() => setEditing((value) => !value)}>{editing ? "Done editing" : "Edit"}</Button>
          <Button leftSection={<IconCheck size={15} />} loading={approve.isPending} disabled={trimmed.length < 2 || !draft.body} onClick={() => approve.mutate()}>Approve and copy</Button>
          <Button variant="subtle" color="red" leftSection={<IconX size={15} />} onClick={() => onReject(draft)}>Reject</Button>
        </Group>
      </Stack>
    </Card>
  );
}

export default function DraftReviewQueue() {
  const queryClient = useQueryClient();
  const drafts = usePendingDrafts();
  const [approved, setApproved] = useState<SupportDraftApproval[]>([]);
  const [rejecting, setRejecting] = useState<SupportDraftReview | null>(null);
  const reject = useMutation({
    mutationFn: (id: number) => rejectSupportDraft(id),
    onSuccess: () => {
      setRejecting(null);
      notifications.show({ color: "gray", title: "Draft rejected", message: "Nothing was sent to the customer." });
      void queryClient.invalidateQueries({ queryKey: ["support-drafts"] });
    },
    onError: (error) => notifications.show({ color: "red", title: "Draft not rejected", message: getApiError(error).message }),
  });
  const items = drafts.data?.items ?? [];

  return (
    <Stack gap="md">
      <Card withBorder bg="cream.0">
        <Group gap="xs"><IconInbox size={20} /><Stack gap={0}><Text fw={700}>Drafts to review</Text><Text size="sm" c="dimmed">The AI suggests replies from approved content. Nothing is sent automatically: approve a reply to copy it, then send it yourself in WhatsApp.</Text></Stack></Group>
      </Card>
      {approved.length ? (
        <Stack gap="xs">
          <Text fw={700}>Approved, ready to send</Text>
          {approved.map((item) => (
            <Card withBorder key={item.draft.id}>
              <Stack gap="xs">
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{item.text}</Text>
                <Group gap="xs">
                  <Button variant="light" leftSection={<IconCopy size={15} />} onClick={() => void copyText(item.text)}>Copy again</Button>
                  {item.whatsapp_url
                    ? <Button component="a" href={item.whatsapp_url} target="_blank" rel="noopener noreferrer" color="green" leftSection={<IconBrandWhatsapp size={15} />}>Open in WhatsApp</Button>
                    : <Text size="sm" c="dimmed">No WhatsApp number on file. Paste the reply into the chat yourself.</Text>}
                  <Anchor component="button" size="sm" onClick={() => setApproved((current) => current.filter((entry) => entry.draft.id !== item.draft.id))}>Done</Anchor>
                </Group>
              </Stack>
            </Card>
          ))}
        </Stack>
      ) : null}
      {drafts.isLoading ? <Text c="dimmed">Loading drafts…</Text>
        : drafts.isError ? <Card withBorder><Group justify="space-between"><Text size="sm" c="red">{getApiError(drafts.error).message}</Text><Button variant="light" onClick={() => void drafts.refetch()}>Try again</Button></Group></Card>
        : items.length ? items.map((draft) => <DraftCard key={draft.id} draft={draft} onApproved={(approval) => setApproved((current) => [approval, ...current])} onReject={setRejecting} />)
        : <Card withBorder><Text size="sm" c="dimmed">No drafts are waiting for review.</Text></Card>}
      <Modal opened={rejecting !== null} onClose={() => setRejecting(null)} title="Reject this draft?">
        <Stack>
          <Text size="sm">The suggested reply is discarded and nothing is sent. You can still answer the customer yourself.</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button color="red" loading={reject.isPending} onClick={() => rejecting && reject.mutate(rejecting.id)}>Reject draft</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
