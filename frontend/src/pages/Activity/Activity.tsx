import { Alert, Badge, Button, Card, Group, Select, Stack, Text, TextInput, Timeline } from "@mantine/core";
import { IconActivity, IconArrowRight } from "@tabler/icons-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { type Activity, getActivity } from "../../api/activity";
import { getTeam } from "../../api/team";
import PageHeader from "../../components/common/PageHeader";

const PAGE_SIZE = 50;
const entityOptions = [["customer", "Customers"], ["product", "Products"], ["inventory", "Inventory"], ["discount", "Discounts"], ["order", "Orders"], ["payment", "Payments"], ["delivery", "Deliveries"], ["refund_request", "Refund requests"], ["supplier", "Suppliers"], ["task", "Tasks"], ["enquiry", "Enquiries"], ["admin", "Team accounts"], ["support_request", "WhatsApp support"], ["support_faq", "Support FAQs"], ["support_template", "Support templates"], ["handoff_rule", "Handoff rules"], ["messaging_event", "Message simulator"], ["report", "Reports"], ["ai_action", "AI actions"], ["ai_usage", "AI usage"]].map(([value, label]) => ({ value, label }));
const actionOptions = ["created", "updated", "deleted", "adjusted", "stock_moved", "opening_balance_recorded", "confirmed", "cancelled", "completed", "exported", "requested", "under_review", "approved", "rejected", "refunded", "paid", "expired", "password_reset", "password_reset_requested", "working", "resolved", "marked_spam", "task_created", "claimed", "noted", "reopened_for_handoff", "returned_to_ai", "human_takeover_requested"].map((value) => ({ value, label: value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) }));
const destinationByEntity: Record<string, string> = { customer: "/customers", product: "/products", inventory: "/inventory", discount: "/discounts", order: "/orders", payment: "/orders", delivery: "/deliveries", refund_request: "/refund-requests", supplier: "/suppliers", task: "/tasks", enquiry: "/enquiries", admin: "/team", support_request: "/whatsapp", support_faq: "/whatsapp", support_template: "/whatsapp", handoff_rule: "/whatsapp", messaging_event: "/whatsapp", report: "/reports", ai_action: "/ai-assistant", ai_usage: "/ai-usage" };

function badgeColor(action: string) {
  if (["deleted", "cancelled", "rejected", "marked_spam", "expired"].includes(action)) return "red";
  if (["approved", "completed", "paid", "refunded", "resolved"].includes(action)) return "green";
  if (["requested", "under_review", "working", "claimed"].includes(action)) return "yellow";
  return "bahulu";
}

function displayAction(action: string) { return action.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function actorName(item: Activity) { return item.admin_username ?? (item.admin_id ? "Former team member" : "System"); }

export default function ActivityPage() {
  const navigate = useNavigate();
  const [entityType, setEntityType] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const team = useQuery({ queryKey: ["team"], queryFn: getTeam });
  const filters = useMemo(() => ({ entity_type: entityType || undefined, action: action || undefined, admin_id: adminId ? Number(adminId) : undefined, start_at: startDate ? new Date(`${startDate}T00:00:00+08:00`).toISOString() : undefined, end_at: endDate ? new Date(`${endDate}T23:59:59.999+08:00`).toISOString() : undefined }), [action, adminId, endDate, entityType, startDate]);
  const activity = useInfiniteQuery({ queryKey: ["activity", filters], queryFn: ({ pageParam }) => getActivity({ ...filters, limit: PAGE_SIZE, offset: pageParam }), initialPageParam: 0, getNextPageParam: (lastPage, pages) => { const loaded = pages.reduce((total, page) => total + page.items.length, 0); return loaded < lastPage.total ? loaded : undefined; } });
  const items = activity.data?.pages.flatMap((page) => page.items) ?? [];
  const total = activity.data?.pages[0]?.total ?? 0;
  const hasFilters = Boolean(entityType || action || adminId || startDate || endDate);
  const resetFilters = () => { setEntityType(null); setAction(null); setAdminId(null); setStartDate(""); setEndDate(""); };

  return <Stack gap="lg">
    <PageHeader title="Activity" description="Owner-only audit history for operational, account, AI, and payment actions." />
    <Card withBorder radius="lg" p="lg"><Stack gap="sm"><Group align="end" wrap="wrap"><Select clearable label="Record type" placeholder="All records" value={entityType} onChange={setEntityType} data={entityOptions} w={{ base: "100%", sm: 190 }} /><Select clearable label="Action" placeholder="All actions" value={action} onChange={setAction} data={actionOptions} w={{ base: "100%", sm: 190 }} /><Select clearable searchable label="Team member" placeholder={team.isLoading ? "Loading team..." : "All people"} value={adminId} onChange={setAdminId} data={(team.data ?? []).map((member) => ({ value: String(member.id), label: member.username }))} w={{ base: "100%", sm: 190 }} /><TextInput label="From" type="date" value={startDate} onChange={(event) => setStartDate(event.currentTarget.value)} w={{ base: "100%", sm: 160 }} /><TextInput label="To" type="date" value={endDate} onChange={(event) => setEndDate(event.currentTarget.value)} w={{ base: "100%", sm: 160 }} />{hasFilters && <Button variant="subtle" color="gray" onClick={resetFilters}>Reset filters</Button>}</Group><Text size="xs" c="dimmed">Audit entries are immutable. Contact details and private enquiry notes are not shown here.</Text></Stack></Card>
    {activity.isLoading ? <Text c="dimmed">Loading activity...</Text> : activity.isError ? <Alert color="red" title="Could not load activity"><Button size="compact-sm" variant="light" color="red" onClick={() => void activity.refetch()}>Try again</Button></Alert> : !items.length ? <Card withBorder radius="lg" p="xl"><Text fw={600}>No activity matches these filters.</Text><Text size="sm" c="dimmed">Try another date, person, record type, or action.</Text></Card> : <Card withBorder radius="lg" p="lg"><Stack gap="lg"><Group justify="space-between" wrap="wrap"><Text fw={700}>{total} record{total === 1 ? "" : "s"}</Text><Text size="sm" c="dimmed">Showing {items.length} of {total}</Text></Group><Timeline active={items.length} bulletSize={28} lineWidth={2}>{items.map((item) => { const destination = destinationByEntity[item.entity_type]; return <Timeline.Item key={item.id} bullet={<IconActivity size={15} />} title={<Group gap="xs" wrap="wrap"><Text fw={600}>{item.description}</Text><Badge variant="light" color={badgeColor(item.action)}>{displayAction(item.action)}</Badge></Group>}><Group justify="space-between" mt={4} wrap="wrap"><Text size="xs" c="dimmed">{new Date(item.created_at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" })} - {actorName(item)}</Text>{destination ? <Button size="compact-xs" variant="subtle" rightSection={<IconArrowRight size={13} />} onClick={() => navigate(destination)}>Open {entityOptions.find((option) => option.value === item.entity_type)?.label ?? "workspace"}</Button> : null}</Group></Timeline.Item>; })}</Timeline>{activity.hasNextPage && <Button variant="light" onClick={() => void activity.fetchNextPage()} loading={activity.isFetchingNextPage}>Load more</Button>}</Stack></Card>}
  </Stack>;
}
