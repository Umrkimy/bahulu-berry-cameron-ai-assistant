import { Badge, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import type { EChartsOption } from "echarts";

import { useDashboard } from "../../hooks/useDashboard";
import EChart from "../common/EChart";
import AnimatedNumber from "../common/motion/AnimatedNumber";

export default function OrderStatusCard() {
  const { data, isLoading, error } = useDashboard();
  const orderSummary = data?.orders;
  const totalOrders = Math.max((orderSummary?.total ?? 0) - (orderSummary?.cancelled ?? 0), 0);
  const activeOrders = Math.max(totalOrders - (orderSummary?.completed ?? 0), 0);
  const completionRate = totalOrders === 0 ? 0 : Math.round(((orderSummary?.completed ?? 0) / totalOrders) * 100);
  const option = useMemo<EChartsOption>(() => ({
    animationDuration: 420,
    title: { text: `${completionRate}%`, subtext: "completed", left: "center", top: "35%", textStyle: { color: "#33232c", fontSize: 23, fontWeight: 700 }, subtextStyle: { color: "#85746c", fontSize: 11 } },
    tooltip: { trigger: "item", valueFormatter: (value: string | number) => `${value} order${Number(value) === 1 ? "" : "s"}` },
    series: [{ type: "pie", radius: ["62%", "84%"], center: ["50%", "50%"], startAngle: 90, clockwise: true, label: { show: false }, labelLine: { show: false }, itemStyle: { borderColor: "#fffefd", borderWidth: 4, borderRadius: 8 }, data: [
      { value: orderSummary?.completed ?? 0, name: "Completed", itemStyle: { color: "#218c63" } },
      { value: activeOrders, name: "Active", itemStyle: { color: "#b8171c" } },
      { value: orderSummary?.cancelled ?? 0, name: "Cancelled", itemStyle: { color: "#d9ccc5" } },
    ] }],
  }), [activeOrders, completionRate, orderSummary?.cancelled, orderSummary?.completed]);

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

  const orders = data.orders;

  return (
    <Card withBorder radius="lg" p="lg">
      <Group justify="space-between" mb="md">
        <Stack gap={1}>
          <Text fw={700}>Order overview</Text>
          <Text size="xs" c="dimmed">Current operational status</Text>
        </Stack>
        <Badge color="bahulu" variant="light"><AnimatedNumber value={totalOrders} /> active</Badge>
      </Group>
      <EChart option={option} height={170} label={`Order fulfilment: ${orders.completed} completed, ${activeOrders} active, and ${orders.cancelled} cancelled`} />
      <SimpleGrid cols={3} spacing="sm" mt="sm">
        <Stack gap={2}><Text size="xs" c="dimmed">Completed</Text><Text fw={800} fz="lg"><AnimatedNumber value={orders.completed} /></Text></Stack>
        <Stack gap={2}><Text size="xs" c="dimmed">Active</Text><Text fw={800} fz="lg"><AnimatedNumber value={activeOrders} /></Text></Stack>
        <Stack gap={2}><Text size="xs" c="dimmed">Cancelled</Text><Text fw={800} fz="lg"><AnimatedNumber value={orders.cancelled} /></Text></Stack>
      </SimpleGrid>
    </Card>
  );
}
