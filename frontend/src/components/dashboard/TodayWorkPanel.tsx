import { Alert, Badge, Card, Group, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconBuildingWarehouse, IconChevronRight, IconCircleCheck, IconClipboardCheck, IconShoppingCart } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { getTasks, type Task } from "../../api/tasks";
import type { DashboardResponse } from "../../types/dashboard";

interface TodayWorkPanelProps {
  dashboard: DashboardResponse;
  teamView?: boolean;
}

function taskTone(task: Task) {
  if (task.priority === "HIGH") return "red";
  if (task.status === "IN_PROGRESS") return "orange";
  return "gray";
}

function taskLabel(task: Task) {
  if (task.status === "IN_PROGRESS") return "In progress";
  return task.priority === "HIGH" ? "High priority" : "Open";
}

function PanelHeader({ id, title, description, aside }: { id: string; title: string; description: string; aside?: ReactNode }) {
  return (
    <Group className="panel-header" justify="space-between" wrap="nowrap">
      <Stack gap={0}>
        <Text id={id} fw={600}>{title}</Text>
        <Text size="sm" c="dimmed">{description}</Text>
      </Stack>
      {aside}
    </Group>
  );
}

function QueueRow({ to, icon, title, detail, alert = false }: { to: string; icon: ReactNode; title: string; detail: string; alert?: boolean }) {
  return (
    <UnstyledButton component={Link} to={to} className="list-row">
      <span className="list-row-icon" data-alert={alert || undefined}>{icon}</span>
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" fw={500}>{title}</Text>
        <Text size="sm" c="dimmed">{detail}</Text>
      </Stack>
      <IconChevronRight size={16} className="list-row-chevron" aria-hidden="true" />
    </UnstyledButton>
  );
}

export default function TodayWorkPanel({ dashboard, teamView = false }: TodayWorkPanelProps) {
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: getTasks });
  const openTasks = (tasks.data ?? []).filter((task) => task.status !== "COMPLETED");
  const taskHeading = teamView ? "Team work" : "My work";
  const taskDescription = teamView ? "Open work across the team." : "Tasks currently assigned to you.";
  const pending = dashboard.orders.pending;

  return <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
    <Card withBorder p={0} aria-labelledby="today-work-title">
      <PanelHeader id="today-work-title" title={taskHeading} description={taskDescription} aside={<Badge color={openTasks.length ? "gray" : "green"}>{openTasks.length} open</Badge>} />
      {tasks.isLoading ? <Text size="sm" c="dimmed" p="md">Loading tasks…</Text> : null}
      {tasks.error ? <Alert m="md" color="red" title="Tasks unavailable">Open Tasks to try again.</Alert> : null}
      {!tasks.isLoading && !tasks.error && openTasks.length === 0 ? <Group gap="xs" p="md"><IconCircleCheck size={18} color="var(--mantine-color-green-7)" /><Text size="sm" c="dimmed">No open tasks right now.</Text></Group> : null}
      {!tasks.isLoading && !tasks.error && openTasks.length > 0 ? <>
        {openTasks.slice(0, 4).map((task) => (
          <div key={task.id} className="list-row list-row-static">
            <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={500} truncate>{task.title}</Text>
              {task.context_label ? <Text size="sm" c="dimmed" truncate>{task.context_label}</Text> : null}
            </Stack>
            <Badge color={taskTone(task)}>{taskLabel(task)}</Badge>
          </div>
        ))}
        <UnstyledButton component={Link} to="/tasks" className="panel-footer-link">
          Open {teamView ? "team" : "my"} tasks<IconChevronRight size={14} aria-hidden="true" />
        </UnstyledButton>
      </> : null}
    </Card>

    <Card withBorder p={0} aria-labelledby="ready-now-title">
      <PanelHeader id="ready-now-title" title="Ready now" description="The queues most likely to need your next action." />
      <QueueRow to="/fulfillment" icon={<IconClipboardCheck size={16} stroke={1.75} />} title="Orders waiting" detail={`${pending} pending order${pending === 1 ? "" : "s"} · Fulfilment`} alert={pending > 0} />
      <QueueRow to="/inventory" icon={<IconBuildingWarehouse size={16} stroke={1.75} />} title="Stock to review" detail={`${dashboard.inventory.out_of_stock} out · ${dashboard.inventory.low_stock} low · Inventory`} alert={dashboard.inventory.out_of_stock > 0} />
      <QueueRow to="/orders" icon={<IconShoppingCart size={16} stroke={1.75} />} title="Order workspace" detail={`${dashboard.orders.total} total orders recorded`} />
    </Card>
  </SimpleGrid>;
}
