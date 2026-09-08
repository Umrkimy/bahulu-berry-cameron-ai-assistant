import { ActionIcon, Badge, Button, Divider, Group, Menu, Stack, Text } from "@mantine/core";
import { IconBell, IconCheck, IconExternalLink } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { getNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } from "../../api/notifications";
import { getApiError } from "../../api/errors";
import type { AppNotification } from "../../types/notifications";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const latest = useQuery({ queryKey: ["notifications", "latest"], queryFn: () => getNotifications({ page: 1, page_size: 5 }), refetchInterval: 60_000, refetchOnWindowFocus: true });
  const unread = useQuery({ queryKey: ["notifications", "unread-count"], queryFn: getUnreadNotificationCount, refetchInterval: 60_000, refetchOnWindowFocus: true });
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["notifications"] }), queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] })]);
  const markOne = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });
  const markAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh });
  const unreadCount = unread.data?.unread_count ?? 0;

  const open = (item: AppNotification) => {
    if (!item.read_at) markOne.mutate(item.id);
    navigate(item.route);
  };

  return <Menu shadow="md" width={360} position="bottom-end" withinPortal>
    <Menu.Target>
      <ActionIcon variant="light" color="bahulu" size="lg" aria-label="Open notifications" style={{ position: "relative" }}>
        <IconBell size={19} />
        {unreadCount > 0 ? <Badge size="xs" circle color="red" style={{ position: "absolute", top: -4, right: -4 }}>{unreadCount > 9 ? "9+" : unreadCount}</Badge> : null}
      </ActionIcon>
    </Menu.Target>
    <Menu.Dropdown p="sm">
      <Group justify="space-between" mb="xs"><Text fw={700}>Updates</Text>{(unread.data?.unread_count ?? 0) > 0 ? <Button variant="subtle" size="compact-xs" leftSection={<IconCheck size={14} />} loading={markAll.isPending} onClick={() => markAll.mutate()}>Mark all read</Button> : null}</Group>
      <Divider mb="xs" />
      {latest.isLoading ? <Text size="sm" c="dimmed" py="md">Loading notifications…</Text> : latest.isError ? <Text size="sm" c="red" py="md">{getApiError(latest.error).message}</Text> : !latest.data?.items.length ? <Text size="sm" c="dimmed" py="md">You are all caught up.</Text> : <Stack gap={4}>{latest.data.items.map((item) => <Menu.Item key={item.id} onClick={() => open(item)} leftSection={<IconBell size={15} />} rightSection={!item.read_at ? <Badge size="xs" color="bahulu">New</Badge> : null}>
        <Text size="sm" fw={item.read_at ? 500 : 700} lineClamp={1}>{item.title}</Text><Text size="xs" c="dimmed" lineClamp={2}>{item.description}</Text><Text size="xs" c="dimmed">{formatTime(item.created_at)}</Text>
      </Menu.Item>)}</Stack>}
      <Divider my="xs" />
      <Menu.Item leftSection={<IconExternalLink size={15} />} onClick={() => navigate("/updates")}>View all updates</Menu.Item>
    </Menu.Dropdown>
  </Menu>;
}
