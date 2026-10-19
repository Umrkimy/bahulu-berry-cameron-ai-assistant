import { Card, Group, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import type { EChartsOption } from "echarts";

import { useSalesChart } from "../../hooks/useSalesChart";
import EChart from "../common/EChart";

import DashboardSkeleton from "./DashboardSkeleton";
import { useChartTheme } from "../../hooks/useChartTheme";

export default function SalesChart() {
  const { data, isLoading, error } = useSalesChart();
  const chart = useChartTheme();
  const option = useMemo<EChartsOption>(() => ({
    animationDuration: 420,
    grid: { top: 12, right: 12, bottom: 30, left: 8, containLabel: true },
    tooltip: { trigger: "axis", valueFormatter: (value: unknown) => `RM ${Number(value ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    xAxis: { type: "category", boundaryGap: false, data: (data ?? []).map((item) => item.month), axisTick: { show: false }, axisLine: { lineStyle: { color: chart.axis } }, axisLabel: { color: chart.label, fontSize: 11, hideOverlap: true } },
    yAxis: { type: "value", splitNumber: 3, axisLabel: { color: chart.label, fontSize: 11, formatter: (value: string | number) => `RM ${Number(value).toLocaleString("en-MY")}` }, splitLine: { lineStyle: { color: chart.split, type: "dashed" } } },
    series: [{ type: "line", data: (data ?? []).map((item) => Number(item.revenue)), smooth: false, showSymbol: false, lineStyle: { color: chart.berry, width: 2 }, itemStyle: { color: chart.berry }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: chart.berryFill }, { offset: 1, color: "rgba(184, 23, 28, 0)" }] } } }],
  }), [data, chart]);

  if (isLoading) {
    return (
      <Card withBorder>
        <DashboardSkeleton />
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card withBorder>
        <Text>Failed to load sales data</Text>
      </Card>
    );
  }

  return (
    <Card withBorder>
      <Group justify="space-between" mb="md">
        <Stack gap={1}>
          <Text fw={600}>Paid sales trend</Text>
          <Text size="sm" c="dimmed">Last 12 Malaysia calendar months</Text>
        </Stack>
      </Group>

      <EChart option={option} height={240} label="Paid sales trend for the last 12 Malaysia calendar months" />
    </Card>
  );
}
