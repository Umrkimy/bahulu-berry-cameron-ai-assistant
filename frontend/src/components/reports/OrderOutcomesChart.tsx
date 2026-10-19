import { useMemo } from "react";
import type { EChartsOption } from "echarts";

import EChart from "../common/EChart";
import type { ReportStatusCount } from "../../types/reports";
import { useChartTheme } from "../../hooks/useChartTheme";

const statusColors: Record<string, string> = {
  PENDING: "#d9b45b",
  PROCESSING: "#9d93c9",
  SHIPPED: "#7fa7d4",
  COMPLETED: "#6aa97a",
  CANCELLED: "#c4c4ca",
};

function label(status: string) {
  return status.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function OrderOutcomesChart({ items }: { items: ReportStatusCount[] }) {
  const chart = useChartTheme();
  const option = useMemo<EChartsOption>(() => ({
    animationDuration: 360,
    grid: { top: 10, right: 42, bottom: 8, left: 86, containLabel: false },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (value: unknown) => `${value ?? 0} order${Number(value) === 1 ? "" : "s"}` },
    xAxis: { type: "value", minInterval: 1, splitNumber: 3, axisLabel: { color: chart.label, fontSize: 11 }, splitLine: { lineStyle: { color: chart.split, type: "dashed" } } },
    yAxis: { type: "category", inverse: true, data: items.map((item) => label(item.status)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: chart.ink, fontSize: 12, fontWeight: 600 } },
    series: [{ type: "bar", data: items.map((item) => ({ value: item.count, itemStyle: { color: statusColors[item.status] ?? chart.neutral, borderRadius: [0, 3, 3, 0] } })), barMaxWidth: 24, label: { show: true, position: "right", color: chart.ink, fontWeight: 600 } }],
  }), [items, chart]);

  return <EChart option={option} height={260} label="Order outcomes by status" />;
}
