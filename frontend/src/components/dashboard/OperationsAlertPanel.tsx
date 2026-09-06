import { Alert, Badge, Button, Card, Group, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconArrowUpRight, IconCircleCheck } from "@tabler/icons-react";
import { Link } from "react-router-dom";

import { useOperationAlerts } from "../../hooks/useOperationAlerts";

function formatMalaysiaTime(value: string) {
  return new Date(value).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" });
}

export default function OperationsAlertPanel() {
  const { data, error, isLoading } = useOperationAlerts({ limit: 4 });

  return (
    <Card withBorder radius="lg" p="lg">
      <Group justify="space-between" mb="md">
        <Stack gap={0}>
          <Text fw={700}>Operations attention</Text>
          <Text size="sm" c="dimmed">Live issues that resolve when the underlying work is completed.</Text>
        </Stack>
        <Button component={Link} to="/alerts" size="xs" variant="light" rightSection={<IconArrowUpRight size={14} />}>View all alerts</Button>
      </Group>

      {isLoading ? <Text size="sm" c="dimmed">Loading current alerts…</Text> : null}
      {error ? <Alert color="red" title="Alerts unavailable">Refresh the page to try again.</Alert> : null}
      {!isLoading && !error && data?.total === 0 ? <Group gap="xs"><IconCircleCheck size={18} color="var(--mantine-color-green-6)" /><Text size="sm" c="dimmed">Everything currently looks clear.</Text></Group> : null}
      {!isLoading && !error && data?.items.length ? <Stack gap="xs">{data.items.map((alert) => <Card key={alert.id} withBorder p="sm" bg={alert.severity === "CRITICAL" ? "red.0" : "orange.0"}><Group justify="space-between" align="flex-start" wrap="nowrap"><Stack gap={2}><Group gap="xs"><IconAlertTriangle size={16} color={alert.severity === "CRITICAL" ? "var(--mantine-color-red-6)" : "var(--mantine-color-orange-6)"} /><Text fw={600} size="sm">{alert.title}</Text></Group><Text size="xs" c="dimmed">{alert.description} Updated {formatMalaysiaTime(alert.source_at)}.</Text></Stack><Stack gap={6} align="flex-end"><Badge color={alert.severity === "CRITICAL" ? "red" : "orange"} variant="light">{alert.severity}</Badge><Button component={Link} to={alert.href} size="compact-xs" variant="subtle">Open</Button></Stack></Group></Card>)}</Stack> : null}
    </Card>
  );
}
