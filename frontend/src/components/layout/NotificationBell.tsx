import { ActionIcon, Badge, Button, Divider, Group, Menu, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconAlertTriangle, IconBell, IconCheck, IconExternalLink } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import { getApiError } from "../../api/errors";
import { getNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } from "../../api/notifications";
import { useOperationAlerts } from "../../hooks/useOperationAlerts";
import type { AppNotification } from "../../types/notifications";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [menuOpened, setMenuOpened] = useState(false);
  const latest = useQuery({ queryKey: ["notifications", "latest"], queryFn: () => getNotifications({ page: 1, page_size: 5 }), enabled: menuOpened });
  const unread = useQuery({ queryKey: ["notifications", "unread-count"], queryFn: getUnreadNotificationCount, refetchInterval: 60_000, refetchOnWindowFocus: true });
  const alerts = useOperationAlerts({ limit: 3 });
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["notifications"] }), queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] })]);
  const markOne = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });
  const markAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh });
  const unreadCount = unread.data?.unread_count ?? 0;
  const attentionCount = alerts.data?.total ?? 0;
  const bellLabel = `Open updates${unreadCount ? `: ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : ""}${unreadCount && attentionCount ? " and" : ""}${attentionCount ? ` ${attentionCount} item${attentionCount === 1 ? "" : "s"} needing attention` : ""}`;

  const open = (item: AppNotification) => {
    if (!item.read_at) markOne.mutate(item.id);
    navigate(item.route);
  };

  return <Menu shadow="md" width={360} position="bottom-end" withinPortal onChange={setMenuOpened}>
    <Menu.Target>
      <ActionIcon variant="light" color="bahulu" size="lg" aria-label={bellLabel} style={{ position: "relative" }}>
        <IconBell size={19} />
        {unreadCount > 0 ? <Badge size="xs" circle color="red" style={{ position: "absolute", top: -4, right: -4 }}>{unreadCount > 9 ? "9+" : unreadCount}</Badge> : null}
        {attentionCount > 0 ? <Badge size="xs" color="orange" style={{ position: "absolute", bottom: -5, right: -7, minWidth: 16, paddingInline: 4 }}>{attentionCount > 9 ? "9+" : attentionCount}</Badge> : null}
      </ActionIcon>
    </Menu.Target>
    <Menu.Dropdown p="sm">
      <Group justify="space-between" mb="xs"><Text fw={700}>Updates</Text>{unreadCount > 0 ? <Button variant="subtle" size="compact-xs" leftSection={<IconCheck size={14} />} loading={markAll.isPending} onClick={() => markAll.mutate()}>Mark all read</Button> : null}</Group>
      <Divider mb="xs" />
      <Stack gap="xs" mb="xs">
        <Group justify="space-between" wrap="nowrap"><Group gap="xs" wrap="nowrap"><ThemeIcon color={attentionCount ? "orange" : "green"} variant="light" size="sm" radius="xl"><IconAlertTriangle size={13} /></ThemeIcon><div><Text size="sm" fw={650}>Needs attention</Text><Text size="xs" c="dimmed">Live issues clear when resolved.</Text></div></Group>{attentionCount ? <Badge color="orange" variant="light">{attentionCount}</Badge> : null}</Group>
        {alerts.isLoading ? <Text size="xs" c="dimmed">Checking live work…</Text> : null}
        {alerts.isError ? <Text size="xs" c="red">Live attention is unavailable. Open Updates to try again.</Text> : null}
        {!alerts.isLoading && !alerts.isError && !attentionCount ? <Text size="xs" c="dimmed">No live operational issues.</Text> : null}
        {!alerts.isLoading && !alerts.isError && alerts.data?.items.map((item) => <Menu.Item key={item.id} onClick={() => navigate(item.href)} leftSection={<IconAlertTriangle size={15} color={item.severity === "CRITICAL" ? "var(--mantine-color-red-6)" : "var(--mantine-color-orange-6)"} />} rightSection={<Badge size="xs" color={item.severity === "CRITICAL" ? "red" : "orange"}>{item.severity === "CRITICAL" ? "Critical" : "Warning"}</Badge>}>
          <Text size="sm" fw={650} lineClamp={1}>{item.title}</Text><Text size="xs" c="dimmed" lineClamp={1}>{item.description}</Text>
        </Menu.Item>)}
      </Stack>
      <Divider mb="xs" />
      <Text size="xs" fw={650} c="dimmed" mb={4}>Recent notifications</Text>
      {latest.isLoading ? <Text size="sm" c="dimmed" py="md">Loading notifications…</Text> : latest.isError ? <Text size="sm" c="red" py="md">{getApiError(latest.error).message}</Text> : !latest.data?.items.length ? <Text size="sm" c="dimmed" py="md">You are all caught up.</Text> : <Stack gap={4}>{latest.data.items.map((item) => <Menu.Item key={item.id} onClick={() => open(item)} leftSection={<IconBell size={15} />} rightSection={!item.read_at ? <Badge size="xs" color="bahulu">New</Badge> : null}>
        <Text size="sm" fw={item.read_at ? 500 : 700} lineClamp={1}>{item.title}</Text><Text size="xs" c="dimmed" lineClamp={2}>{item.description}</Text><Text size="xs" c="dimmed">{formatTime(item.created_at)}</Text>
      </Menu.Item>)}</Stack>}
      <Divider my="xs" />
      <Menu.Item leftSection={<IconExternalLink size={15} />} onClick={() => navigate("/updates")}>View all updates</Menu.Item>
    </Menu.Dropdown>
  </Menu>;
}
