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
    title: { text: `${completionRate}%`, subtext: "completed", left: "center", top: "35%", textStyle: { color: "#18181b", fontSize: 23, fontWeight: 600 }, subtextStyle: { color: "#71717a", fontSize: 11 } },
    tooltip: { trigger: "item", valueFormatter: (value: unknown) => `${value ?? 0} order${Number(value) === 1 ? "" : "s"}` },
    series: [{ type: "pie", radius: ["62%", "84%"], center: ["50%", "50%"], startAngle: 90, clockwise: true, label: { show: false }, labelLine: { show: false }, itemStyle: { borderColor: "#ffffff", borderWidth: 3, borderRadius: 4 }, data: [
      { value: orderSummary?.completed ?? 0, name: "Completed", itemStyle: { color: "#2f9e44" } },
      { value: activeOrders, name: "Active", itemStyle: { color: "#52525b" } },
      { value: orderSummary?.cancelled ?? 0, name: "Cancelled", itemStyle: { color: "#d4d4d8" } },
    ] }],
  }), [activeOrders, completionRate, orderSummary?.cancelled, orderSummary?.completed]);

  if (isLoading) {
    return (
      <Card withBorder>
        Loading order status...
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card withBorder>
        Failed to load order status.
      </Card>
    );
  }

  const orders = data.orders;

  return (
    <Card withBorder>
      <Group justify="space-between" mb="md">
        <Stack gap={1}>
          <Text fw={600}>Order overview</Text>
          <Text size="sm" c="dimmed">Current operational status</Text>
        </Stack>
        <Badge color="gray"><AnimatedNumber value={activeOrders} /> active</Badge>
      </Group>
      <EChart option={option} height={170} label={`Order fulfilment: ${orders.completed} completed, ${activeOrders} active, and ${orders.cancelled} cancelled`} />
      <SimpleGrid cols={3} spacing="sm" mt="sm">
        <Stack gap={2}><Text size="sm" c="dimmed">Completed</Text><Text fw={600} fz="lg"><AnimatedNumber value={orders.completed} /></Text></Stack>
        <Stack gap={2}><Text size="sm" c="dimmed">Active</Text><Text fw={600} fz="lg"><AnimatedNumber value={activeOrders} /></Text></Stack>
        <Stack gap={2}><Text size="sm" c="dimmed">Cancelled</Text><Text fw={600} fz="lg"><AnimatedNumber value={orders.cancelled} /></Text></Stack>
      </SimpleGrid>
    </Card>
  );
}
