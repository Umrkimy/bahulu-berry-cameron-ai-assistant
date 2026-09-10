import { Alert, Badge, Button, Card, Divider, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconArrowRight, IconBuildingWarehouse, IconCircleCheck, IconClipboardCheck, IconShoppingCart } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { getTasks, type Task } from "../../api/tasks";
import type { DashboardResponse } from "../../types/dashboard";

interface TodayWorkPanelProps {
  dashboard: DashboardResponse;
  role?: "OWNER" | "STAFF";
}

function taskTone(task: Task) {
  if (task.priority === "HIGH") return "red";
  if (task.status === "IN_PROGRESS") return "orange";
  return "bahulu";
}

function taskLabel(task: Task) {
  if (task.status === "IN_PROGRESS") return "In progress";
  return task.priority === "HIGH" ? "High priority" : "Open";
}

export default function TodayWorkPanel({ dashboard, role = "STAFF" }: TodayWorkPanelProps) {
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: getTasks });
  const openTasks = (tasks.data ?? []).filter((task) => task.status !== "COMPLETED");
  const taskHeading = role === "OWNER" ? "Team work" : "My work";
  const taskDescription = role === "OWNER" ? "Open work across the team." : "Tasks currently assigned to you.";

  return <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
    <Card withBorder radius="lg" p="lg" aria-labelledby="today-work-title">
      <Group justify="space-between" mb="md">
        <Stack gap={1}><Text id="today-work-title" fw={750}>{taskHeading}</Text><Text size="xs" c="dimmed">{taskDescription}</Text></Stack>
        <Badge color={openTasks.length ? "bahulu" : "green"} variant="light">{openTasks.length} open</Badge>
      </Group>
      {tasks.isLoading ? <Text size="sm" c="dimmed">Loading tasks…</Text> : null}
      {tasks.error ? <Alert color="red" title="Tasks unavailable">Open Tasks to try again.</Alert> : null}
      {!tasks.isLoading && !tasks.error && openTasks.length === 0 ? <Group gap="xs"><IconCircleCheck size={18} color="var(--mantine-color-green-6)" /><Text size="sm" c="dimmed">No open tasks right now.</Text></Group> : null}
      {!tasks.isLoading && !tasks.error && openTasks.length > 0 ? <Stack gap="xs">{openTasks.slice(0, 3).map((task) => <Paper key={task.id} withBorder p="sm" radius="md"><Group justify="space-between" align="flex-start" wrap="nowrap"><Stack gap={2} style={{ minWidth: 0 }}><Text fw={650} size="sm">{task.title}</Text>{task.context_label ? <Text size="xs" c="dimmed">{task.context_label}</Text> : null}</Stack><Badge color={taskTone(task)} variant="light">{taskLabel(task)}</Badge></Group></Paper>)}<Button component={Link} to="/tasks" size="compact-sm" variant="subtle" rightSection={<IconArrowRight size={14} />}>Open {role === "OWNER" ? "team" : "my"} tasks</Button></Stack> : null}
    </Card>

    <Card withBorder radius="lg" p="lg" aria-labelledby="ready-now-title">
      <Stack gap="md">
        <Stack gap={1}><Text id="ready-now-title" fw={750}>Ready now</Text><Text size="xs" c="dimmed">The operational queues most likely to need your next action.</Text></Stack>
        <Group justify="space-between" wrap="nowrap"><Group gap="sm"><ThemeIcon variant="light" color="orange" radius="md"><IconClipboardCheck size={17} /></ThemeIcon><div><Text fw={650} size="sm">Orders waiting</Text><Text size="xs" c="dimmed">{dashboard.orders.pending} pending order{dashboard.orders.pending === 1 ? "" : "s"}</Text></div></Group><Button component={Link} to="/fulfillment" size="compact-xs" variant="subtle">Fulfilment</Button></Group>
        <Divider />
        <Group justify="space-between" wrap="nowrap"><Group gap="sm"><ThemeIcon variant="light" color={dashboard.inventory.out_of_stock ? "red" : "orange"} radius="md"><IconBuildingWarehouse size={17} /></ThemeIcon><div><Text fw={650} size="sm">Stock to review</Text><Text size="xs" c="dimmed">{dashboard.inventory.out_of_stock} out · {dashboard.inventory.low_stock} low</Text></div></Group><Button component={Link} to="/inventory" size="compact-xs" variant="subtle">Inventory</Button></Group>
        <Divider />
        <Group justify="space-between" wrap="nowrap"><Group gap="sm"><ThemeIcon variant="light" color="bahulu" radius="md"><IconShoppingCart size={17} /></ThemeIcon><div><Text fw={650} size="sm">Order workspace</Text><Text size="xs" c="dimmed">{dashboard.orders.total} total orders recorded</Text></div></Group><Button component={Link} to="/orders" size="compact-xs" variant="subtle">Orders</Button></Group>
      </Stack>
    </Card>
  </SimpleGrid>;
}
