import { Card, Group, RingProgress, Text } from "@mantine/core";

import { useDashboard } from "../../hooks/useDashboard";

export default function OrderStatusCard() {
  const { data, isLoading, error } = useDashboard();

  if (isLoading) {
    return (
      <Card withBorder radius="md" p="xl">
        Loading order status...
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card withBorder radius="md" p="xl">
        Failed to load order status.
      </Card>
    );
  }

  const totalOrders = data.orders.total - data.orders.cancelled;
  const completedOrders = data.orders.completed;

  const completionRate =
    totalOrders === 0 ? 0 : Math.round((completedOrders / totalOrders) * 100);

  return (
    <Card withBorder radius="md" p="xl">
      <Text fw={700} fz="xl">
        Order Completion
      </Text>

      <Group justify="center" mt="lg">
        <RingProgress
          size={160}
          thickness={10}
          roundCaps
          sections={[
            {
              value: completionRate,
              color: "red",
            },
          ]}
          label={
            <Text ta="center" fw={700}>
              {completionRate}%
            </Text>
          }
        />
      </Group>

      <Text ta="center" c="dimmed" mt="md">
        {completedOrders} completed out of {totalOrders} active orders
      </Text>
    </Card>
  );
}
