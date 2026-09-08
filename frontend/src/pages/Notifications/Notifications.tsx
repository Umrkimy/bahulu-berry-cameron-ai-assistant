import { Badge, Button, Card, Group, Select, Stack, Switch, Text, TextInput } from "@mantine/core";
import { IconExternalLink, IconRefresh } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../../api/notifications";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable/DataTable";
import { getApiError } from "../../api/errors";
import type { AppNotification, NotificationType } from "../../types/notifications";

const typeColors: Record<NotificationType, string> = { TASK: "blue", SUPPORT: "grape", REFUND: "orange", PAYMENT: "green", INVENTORY: "red" };
const typeLabels: Record<NotificationType, string> = { TASK: "Task", SUPPORT: "Support", REFUND: "Refund", PAYMENT: "Payment", INVENTORY: "Inventory" };
const typeOptions = (Object.keys(typeLabels) as NotificationType[]).map((value) => ({ value, label: typeLabels[value] }));
const formatTime = (value: string) => new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [type, setType] = useState<NotificationType | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const filters = { notification_type: type, unread_only: unreadOnly || undefined, start_at: startDate ? `${startDate}T00:00:00+08:00` : undefined, end_at: endDate ? `${endDate}T23:59:59.999+08:00` : undefined, page, page_size: pageSize };
  const notifications = useQuery({ queryKey: ["notifications", filters], queryFn: () => getNotifications(filters), refetchInterval: 60_000, refetchOnWindowFocus: true });
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["notifications"] }), queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] })]);
  const markOne = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });
  const markAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh });
  const openItem = useCallback((item: AppNotification) => { if (!item.read_at) markOne.mutate(item.id); navigate(item.route); }, [markOne, navigate]);
  const reset = () => { setType(null); setUnreadOnly(false); setStartDate(""); setEndDate(""); setPage(1); };
  const columns = useMemo<ColumnDef<AppNotification, unknown>[]>(() => [
    { accessorKey: "title", header: "Notification", cell: ({ row }) => <Stack gap={2}><Text fw={row.original.read_at ? 500 : 700}>{row.original.title}</Text><Text size="xs" c="dimmed">{row.original.description}</Text></Stack> },
    { accessorKey: "notification_type", header: "Type", cell: ({ row }) => <Badge color={typeColors[row.original.notification_type]} variant="light">{typeLabels[row.original.notification_type]}</Badge> },
    { accessorKey: "created_at", header: "Time", cell: ({ row }) => <Text size="sm">{formatTime(row.original.created_at)}</Text> },
    { id: "status", header: "Status", cell: ({ row }) => <Badge color={row.original.read_at ? "gray" : "bahulu"} variant="light">{row.original.read_at ? "Read" : "Unread"}</Badge> },
    { id: "actions", header: "", cell: ({ row }) => <Button size="compact-xs" variant="subtle" rightSection={<IconExternalLink size={14} />} onClick={() => openItem(row.original)}>Open</Button> },
  ], [openItem]);
  return <Stack gap="lg"><PageHeader title="Notifications" description="Your assigned work and operational updates. Notifications are kept for 90 days." action={<Button variant="default" leftSection={<IconRefresh size={16} />} loading={markAll.isPending} onClick={() => markAll.mutate()}>Mark all read</Button>} />
    <Card withBorder p="md"><Group gap="xs" wrap="wrap"><Select aria-label="Filter notification type" clearable placeholder="All types" value={type} onChange={(value) => { setType(value as NotificationType | null); setPage(1); }} data={typeOptions} w={155} /><Switch label="Unread only" checked={unreadOnly} onChange={(event) => { setUnreadOnly(event.currentTarget.checked); setPage(1); }} /><TextInput aria-label="Start date" type="date" value={startDate} onChange={(event) => { setStartDate(event.currentTarget.value); setPage(1); }} /><TextInput aria-label="End date" type="date" value={endDate} onChange={(event) => { setEndDate(event.currentTarget.value); setPage(1); }} /><Button size="xs" variant="subtle" onClick={reset}>Reset filters</Button></Group></Card>
    {notifications.isError ? <Card withBorder><Text c="red">{getApiError(notifications.error).message}</Text></Card> : <DataTable data={notifications.data?.items ?? []} columns={columns} loading={notifications.isLoading} emptyMessage="You have no notifications for this period." manualPagination={{ page, pageSize, total: notifications.data?.total ?? 0, onPageChange: setPage, onPageSizeChange: (value) => { setPageSize(value); setPage(1); } }} renderMobileCard={(item) => <Card className="data-table-mobile-card" withBorder radius="md" p="sm"><Stack gap="xs"><Group justify="space-between"><Badge color={typeColors[item.notification_type]} variant="light">{typeLabels[item.notification_type]}</Badge><Badge color={item.read_at ? "gray" : "bahulu"} variant="light">{item.read_at ? "Read" : "Unread"}</Badge></Group><Text fw={item.read_at ? 500 : 700}>{item.title}</Text><Text size="sm" c="dimmed">{item.description}</Text><Group justify="space-between"><Text size="xs" c="dimmed">{formatTime(item.created_at)}</Text><Button size="compact-xs" variant="subtle" onClick={() => openItem(item)}>Open</Button></Group></Stack></Card>} />}</Stack>;
}
