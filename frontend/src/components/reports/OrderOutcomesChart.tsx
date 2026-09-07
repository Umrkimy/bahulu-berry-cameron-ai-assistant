import { useMemo } from "react";
import type { EChartsOption } from "echarts";

import EChart from "../common/EChart";
import type { ReportStatusCount } from "../../types/reports";

const statusColors: Record<string, string> = {
  PENDING: "#d97706",
  PROCESSING: "#a15b15",
  SHIPPED: "#2563eb",
  COMPLETED: "#218c63",
  CANCELLED: "#9f3a47",
};

function label(status: string) {
  return status.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function OrderOutcomesChart({ items }: { items: ReportStatusCount[] }) {
  const option = useMemo<EChartsOption>(() => ({
    animationDuration: 360,
    grid: { top: 10, right: 42, bottom: 8, left: 86, containLabel: false },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (value: unknown) => `${value ?? 0} order${Number(value) === 1 ? "" : "s"}` },
    xAxis: { type: "value", minInterval: 1, splitNumber: 3, axisLabel: { color: "#85746c", fontSize: 11 }, splitLine: { lineStyle: { color: "#f0e9e4", type: "dashed" } } },
    yAxis: { type: "category", inverse: true, data: items.map((item) => label(item.status)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: "#594b45", fontSize: 12, fontWeight: 600 } },
    series: [{ type: "bar", data: items.map((item) => ({ value: item.count, itemStyle: { color: statusColors[item.status] ?? "#85746c", borderRadius: [0, 8, 8, 0] } })), barMaxWidth: 24, label: { show: true, position: "right", color: "#594b45", fontWeight: 700 } }],
  }), [items]);

  return <EChart option={option} height={260} label="Order outcomes by status" />;
}
