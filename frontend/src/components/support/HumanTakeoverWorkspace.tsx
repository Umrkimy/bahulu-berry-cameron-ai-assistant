import { Button, Card, Divider, Group, Stack, Text } from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconUserCheck } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getSupportMessagingConversation, getSupportRequests } from "../../api/support";
import type { SupportMessagingConversation, SupportRequest } from "../../types/support";
import HumanTakeoverPanel from "./HumanTakeoverPanel";

interface TicketCardProps {
  ticket: SupportRequest;
  selected: SupportRequest | null;
  onOpen: () => void;
  conversation: SupportMessagingConversation | null | undefined;
  currentAdmin: { id: number; role: "OWNER" | "STAFF" } | null;
  onTicketChanged: (ticket: SupportRequest) => void;
  onRefresh: () => void;
}

function TicketCard({ ticket, selected, onOpen, conversation, currentAdmin, onTicketChanged, onRefresh }: TicketCardProps) {
  const isOpen = selected?.id === ticket.id;
  return <Card withBorder><Group justify="space-between"><Stack gap={1}><Text fw={700}>#{ticket.id} · {ticket.customer_name}</Text><Text size="sm" c="dimmed">{ticket.handoff_reason ?? "Human handoff"} · {ticket.handoff_state.replaceAll("_", " ")}</Text></Stack><Button variant={isOpen ? "filled" : "light"} rightSection={isOpen ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />} onClick={onOpen}>{isOpen ? "Close" : "Open"}</Button></Group>{isOpen ? <Stack mt="md"><HumanTakeoverPanel ticket={selected} conversation={conversation ?? null} currentAdmin={currentAdmin} onTicketChanged={onTicketChanged} onRefresh={onRefresh} /></Stack> : null}</Card>;
}

export default function HumanTakeoverWorkspace({ currentAdmin }: { currentAdmin: { id: number; role: "OWNER" | "STAFF" } | null }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<SupportRequest | null>(null);
  const tickets = useQuery({ queryKey: ["human-takeover-requests"], queryFn: () => getSupportRequests({ has_handoff: true, page_size: 100 }) });
  const conversation = useQuery({ queryKey: ["support-messaging-conversation", selected?.id], queryFn: () => getSupportMessagingConversation(selected!.id), enabled: Boolean(selected) });
  const refresh = () => { void tickets.refetch(); void queryClient.invalidateQueries({ queryKey: ["support-requests"] }); void queryClient.invalidateQueries({ queryKey: ["support-request-activity", selected?.id] }); };
  const humanTickets = tickets.data?.items.filter((ticket) => ticket.handoff_state !== "AI_ACTIVE") ?? [];
  const aiActiveTickets = tickets.data?.items.filter((ticket) => ticket.handoff_state === "AI_ACTIVE") ?? [];
  const cardProps = (ticket: SupportRequest): TicketCardProps => ({ ticket, selected, onOpen: () => setSelected((current) => current?.id === ticket.id ? null : ticket), conversation: conversation.data, currentAdmin, onTicketChanged: setSelected, onRefresh: refresh });

  return <Stack gap="md"><Card withBorder bg="cream.0"><Group gap="xs"><IconUserCheck size={20} /><Stack gap={0}><Text fw={700}>Human takeover workspace</Text><Text size="sm" c="dimmed">Claim a handoff before replying. Customer and team messages are retained for 30 days, then message text is removed.</Text></Stack></Group></Card>{tickets.isLoading ? <Text c="dimmed">Loading human handoffs…</Text> : <Stack gap="md"><Stack gap="xs"><Group justify="space-between"><Text fw={700}>Human handling</Text><Text size="sm" c="dimmed">{humanTickets.length} active</Text></Group>{humanTickets.length ? humanTickets.map((ticket) => <TicketCard key={ticket.id} {...cardProps(ticket)} />) : <Card withBorder><Text size="sm" c="dimmed">No conversations are waiting for human handling.</Text></Card>}</Stack><Divider /><Stack gap="xs"><Group justify="space-between"><Text fw={700}>AI active</Text><Text size="sm" c="dimmed">{aiActiveTickets.length} available to reopen</Text></Group><Text size="sm" c="dimmed">Use “Request human takeover” only when a staff member needs to resume the conversation.</Text>{aiActiveTickets.length ? aiActiveTickets.map((ticket) => <TicketCard key={ticket.id} {...cardProps(ticket)} />) : <Card withBorder><Text size="sm" c="dimmed">No AI-active handoff conversations.</Text></Card>}</Stack></Stack>}</Stack>;
}
