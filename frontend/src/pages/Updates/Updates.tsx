import { Badge, Button, Card, Divider, Group, Select, Stack, Switch, Text, TextInput, ThemeIcon } from "@mantine/core";
import { IconAlertTriangle, IconArrowUpRight, IconBell, IconCheck, IconExternalLink } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getApiError } from "../../api/errors";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../../api/notifications";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable/DataTable";
import { useOperationAlerts } from "../../hooks/useOperationAlerts";
import type { AppNotification, NotificationType } from "../../types/notifications";
import type { OperationAlert } from "../../types/operations";

const typeColors: Record<NotificationType, string> = { TASK: "blue", SUPPORT: "grape", REFUND: "orange", PAYMENT: "green", INVENTORY: "red" };
const typeLabels: Record<NotificationType, string> = { TASK: "Task", SUPPORT: "Support", REFUND: "Refund", PAYMENT: "Payment", INVENTORY: "Inventory" };
const typeOptions = (Object.keys(typeLabels) as NotificationType[]).map((value) => ({ value, label: typeLabels[value] }));
const formatTime = (value: string) => new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

function AlertItem({ item }: { item: OperationAlert }) {
  const critical = item.severity === "CRITICAL";
  return <Card withBorder radius="md" p="md">
    <Group justify="space-between" align="flex-start" wrap="nowrap">
      <Group align="flex-start" wrap="nowrap" gap="sm">
        <ThemeIcon color={critical ? "red" : "orange"} variant="light" radius="xl"><IconAlertTriangle size={17} /></ThemeIcon>
        <Stack gap={3} style={{ minWidth: 0 }}>
          <Group gap="xs"><Badge color={critical ? "red" : "orange"} variant="light">{critical ? "Critical" : "Warning"}</Badge><Badge color="gray" variant="light">{item.category}</Badge></Group>
          <Text fw={700}>{item.title}</Text>
          <Text size="sm" c="dimmed">{item.description}</Text>
        </Stack>
      </Group>
      <Button component={Link} to={item.href} size="compact-sm" variant="subtle" rightSection={<IconArrowUpRight size={14} />}>Open</Button>
    </Group>
  </Card>;
}

export default function Updates() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const alerts = useOperationAlerts({ limit: 100 });
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
  const liveAlerts = alerts.data?.items ?? [];
  const counts = alerts.data?.counts ?? { critical: 0, warning: 0, total: 0 };

  return <Stack gap="xl">
    <PageHeader title="Updates" description="Live work that needs attention, followed by your saved operational updates." action={<Button variant="default" leftSection={<IconCheck size={16} />} loading={markAll.isPending} onClick={() => markAll.mutate()}>Mark all read</Button>} />
    <Card withBorder p="lg">
      <Group justify="space-between" align="flex-start" mb="md" wrap="wrap">
        <Group gap="sm"><ThemeIcon color="bahulu" variant="light" radius="xl" size="lg"><IconAlertTriangle size={20} /></ThemeIcon><div><Text fw={700}>Needs attention</Text><Text size="sm" c="dimmed">Live issues clear automatically when the underlying work is resolved.</Text></div></Group>
        <Group gap="xs"><Badge color="red" variant="light">{counts.critical} critical</Badge><Badge color="orange" variant="light">{counts.warning} warnings</Badge></Group>
      </Group>
      {alerts.isError ? <Text c="red" size="sm">{getApiError(alerts.error).message}</Text> : alerts.isLoading ? <Text c="dimmed" py="md">Loading live issues…</Text> : liveAlerts.length ? <Stack gap="sm">{liveAlerts.map((item) => <AlertItem key={item.id} item={item} />)}</Stack> : <Card withBorder radius="md" p="lg" bg="var(--mantine-color-gray-0)"><Group gap="sm"><ThemeIcon color="green" variant="light" radius="xl"><IconCheck size={18} /></ThemeIcon><div><Text fw={600}>Everything is under control</Text><Text size="sm" c="dimmed">There are no live operational issues right now.</Text></div></Group></Card>}
    </Card>
    <Divider />
    <Stack gap="md">
      <Group gap="sm"><ThemeIcon color="bahulu" variant="light" radius="xl"><IconBell size={18} /></ThemeIcon><div><Text fw={700}>Notification history</Text><Text size="sm" c="dimmed">Your assigned work and operational updates are kept for 90 days.</Text></div></Group>
      <Card withBorder p="md"><Group gap="xs" wrap="wrap"><Select aria-label="Filter notification type" clearable placeholder="All types" value={type} onChange={(value) => { setType(value as NotificationType | null); setPage(1); }} data={typeOptions} w={155} /><Switch label="Unread only" checked={unreadOnly} onChange={(event) => { setUnreadOnly(event.currentTarget.checked); setPage(1); }} /><TextInput aria-label="Start date" type="date" value={startDate} onChange={(event) => { setStartDate(event.currentTarget.value); setPage(1); }} /><TextInput aria-label="End date" type="date" value={endDate} onChange={(event) => { setEndDate(event.currentTarget.value); setPage(1); }} /><Button size="xs" variant="subtle" onClick={reset}>Reset filters</Button></Group></Card>
      {notifications.isError ? <Card withBorder><Text c="red">{getApiError(notifications.error).message}</Text></Card> : <DataTable data={notifications.data?.items ?? []} columns={columns} loading={notifications.isLoading} emptyMessage="You have no notifications for this period." manualPagination={{ page, pageSize, total: notifications.data?.total ?? 0, onPageChange: setPage, onPageSizeChange: (value) => { setPageSize(value); setPage(1); } }} renderMobileCard={(item) => <Card className="data-table-mobile-card" withBorder radius="md" p="sm"><Stack gap="xs"><Group justify="space-between"><Badge color={typeColors[item.notification_type]} variant="light">{typeLabels[item.notification_type]}</Badge><Badge color={item.read_at ? "gray" : "bahulu"} variant="light">{item.read_at ? "Read" : "Unread"}</Badge></Group><Text fw={item.read_at ? 500 : 700}>{item.title}</Text><Text size="sm" c="dimmed">{item.description}</Text><Group justify="space-between"><Text size="xs" c="dimmed">{formatTime(item.created_at)}</Text><Button size="compact-xs" variant="subtle" onClick={() => openItem(item)}>Open</Button></Group></Stack></Card>} />}
    </Stack>
  </Stack>;
}
