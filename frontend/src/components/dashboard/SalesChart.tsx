import { Card, Group, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import type { EChartsOption } from "echarts";

import { useSalesChart } from "../../hooks/useSalesChart";
import EChart from "../common/EChart";

import DashboardSkeleton from "./DashboardSkeleton";

export default function SalesChart() {
  const { data, isLoading, error } = useSalesChart();
  const option = useMemo<EChartsOption>(() => ({
    animationDuration: 420,
    grid: { top: 12, right: 12, bottom: 30, left: 8, containLabel: true },
    tooltip: { trigger: "axis", valueFormatter: (value: string | number) => `RM ${Number(value).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    xAxis: { type: "category", boundaryGap: false, data: (data ?? []).map((item) => item.month), axisTick: { show: false }, axisLine: { lineStyle: { color: "#e9e2dc" } }, axisLabel: { color: "#85746c", fontSize: 11, hideOverlap: true } },
    yAxis: { type: "value", splitNumber: 3, axisLabel: { color: "#85746c", fontSize: 11, formatter: (value: string | number) => `RM ${Number(value).toLocaleString("en-MY")}` }, splitLine: { lineStyle: { color: "#f0e9e4", type: "dashed" } } },
    series: [{ type: "line", data: (data ?? []).map((item) => Number(item.revenue)), smooth: 0.24, showSymbol: false, lineStyle: { color: "#b8171c", width: 3 }, itemStyle: { color: "#b8171c" }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(184, 23, 28, 0.28)" }, { offset: 1, color: "rgba(184, 23, 28, 0.02)" }] } } }],
  }), [data]);

  if (isLoading) {
    return (
      <Card withBorder radius="md" p="lg">
        <DashboardSkeleton />
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card withBorder radius="md" p="lg">
        <Text>Failed to load sales data</Text>
      </Card>
    );
  }

  return (
    <Card withBorder radius="lg" p="lg">
      <Group justify="space-between" mb="md">
        <Stack gap={1}>
          <Text fw={700}>Paid sales trend</Text>
          <Text size="xs" c="dimmed">Last 12 Malaysia calendar months</Text>
        </Stack>
        <Text size="sm" fw={700} c="bahulu">RM</Text>
      </Group>

      <EChart option={option} height={240} label="Paid sales trend for the last 12 Malaysia calendar months" />
    </Card>
  );
}
