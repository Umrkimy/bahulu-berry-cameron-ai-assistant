import { Anchor, Badge, Button, Card, Group, Modal, Pagination, SegmentedControl, Stack, Text, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBrandWhatsapp, IconCheck, IconCopy, IconEdit, IconInbox, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getApiError } from "../../api/errors";
import { approveSupportDraft, getSupportDrafts, rejectSupportDraft } from "../../api/support";
import type { SupportDraftApproval, SupportDraftReview, SupportDraftStatus } from "../../types/support";
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
const EXPIRED_TEXT = "Message text has been removed after 30 days.";

type DraftView = "review" | "approved" | "rejected";
const HISTORY_FILTERS: Record<Exclude<DraftView, "review">, string> = { approved: "APPROVED,EDITED_APPROVED", rejected: "REJECTED" };
const HISTORY_PAGE_SIZE = 20;
const STATUS_LABELS: Partial<Record<SupportDraftStatus, { label: string; color: string }>> = {
  APPROVED: { label: "Approved", color: "green" },
  EDITED_APPROVED: { label: "Approved after edit", color: "teal" },
  REJECTED: { label: "Rejected", color: "red" },
};

const draftTitle = (draft: SupportDraftReview) => draft.support_request_id ? `Ticket #${draft.support_request_id}` : "WhatsApp message";

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
          <Text fw={700}>{draftTitle(draft)}</Text>
          <Group gap="xs"><Badge variant="light">{draft.language === "MS" ? "Bahasa Melayu" : "English"}</Badge><Text size="sm" c="dimmed">{formatTime(draft.created_at)}</Text></Group>
        </Group>
        <Stack gap={2}>
          <Text size="sm" fw={600}>Customer wrote</Text>
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{draft.customer_message ?? EXPIRED_TEXT}</Text>
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

function HistoryCard({ draft }: { draft: SupportDraftReview }) {
  const status = STATUS_LABELS[draft.status];
  const approved = draft.status === "APPROVED" || draft.status === "EDITED_APPROVED";
  const finalText = draft.edited_body ?? draft.body;
  return (
    <Card withBorder>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Group gap="xs"><Text fw={700}>{draftTitle(draft)}</Text>{status ? <Badge variant="light" color={status.color}>{status.label}</Badge> : null}</Group>
          <Group gap="xs"><Badge variant="light">{draft.language === "MS" ? "Bahasa Melayu" : "English"}</Badge><Text size="sm" c="dimmed">{draft.reviewed_at ? `Reviewed ${formatTime(draft.reviewed_at)}` : formatTime(draft.created_at)}</Text></Group>
        </Group>
        <Stack gap={2}>
          <Text size="sm" fw={600}>Customer wrote</Text>
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{draft.customer_message ?? EXPIRED_TEXT}</Text>
        </Stack>
        <Stack gap={2}>
          <Text size="sm" fw={600}>{approved ? "Approved reply" : "Suggested reply"}</Text>
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{finalText ?? EXPIRED_TEXT}</Text>
        </Stack>
        {draft.edited_body && draft.body ? (
          <Stack gap={2}>
            <Text size="sm" fw={600} c="dimmed">Original suggestion</Text>
            <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>{draft.body}</Text>
          </Stack>
        ) : null}
        {draft.sources.length ? <Text size="sm" c="dimmed">Based on: {draft.sources.map((source) => `${source.label} (${source.type.toLowerCase()})`).join(", ")}</Text> : null}
      </Stack>
    </Card>
  );
}

function DraftHistory({ view }: { view: Exclude<DraftView, "review"> }) {
  const [page, setPage] = useState(1);
  const status = HISTORY_FILTERS[view];
  const history = useQuery({ queryKey: ["support-drafts", status, page], queryFn: () => getSupportDrafts({ status_filter: status, page, page_size: HISTORY_PAGE_SIZE }) });
  const items = history.data?.items ?? [];
  const totalPages = history.data?.total_pages ?? 1;

  if (history.isLoading) return <Text c="dimmed">Loading drafts…</Text>;
  if (history.isError) return <Card withBorder><Group justify="space-between"><Text size="sm" c="red">{getApiError(history.error).message}</Text><Button variant="light" onClick={() => void history.refetch()}>Try again</Button></Group></Card>;
  if (!items.length) return <Card withBorder><Text size="sm" c="dimmed">{view === "approved" ? "No approved drafts yet." : "No rejected drafts yet."}</Text></Card>;
  return (
    <Stack gap="md">
      {items.map((draft) => <HistoryCard key={draft.id} draft={draft} />)}
      {totalPages > 1 ? <Pagination aria-label="Draft history pages" value={page} onChange={setPage} total={totalPages} /> : null}
    </Stack>
  );
}

export default function DraftReviewQueue() {
  const queryClient = useQueryClient();
  const drafts = usePendingDrafts();
  const [approved, setApproved] = useState<SupportDraftApproval[]>([]);
  const [rejecting, setRejecting] = useState<SupportDraftReview | null>(null);
  const [view, setView] = useState<DraftView>("review");
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
      <SegmentedControl aria-label="Draft status" value={view} onChange={(value) => setView(value as DraftView)} data={[{ label: "To review", value: "review" }, { label: "Approved", value: "approved" }, { label: "Rejected", value: "rejected" }]} />
      {view !== "review" ? <DraftHistory key={view} view={view} /> : null}
      {view === "review" && approved.length ? (
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
      {view !== "review" ? null
        : drafts.isLoading ? <Text c="dimmed">Loading drafts…</Text>
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
