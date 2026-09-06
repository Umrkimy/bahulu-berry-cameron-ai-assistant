import { useMemo } from "react";
import type { EChartsOption } from "echarts";

import EChart from "../common/EChart";
import type { DailySalesPoint } from "../../types/reports";

function chartData(points: DailySalesPoint[]) {
  if (points.length <= 90) {
    return points.map((point) => ({
      date: new Date(`${point.date}T12:00:00Z`).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short" }),
      revenue: Number(point.paid_revenue),
    }));
  }
  const months = new Map<string, number>();
  for (const point of points) {
    const month = point.date.slice(0, 7);
    months.set(month, (months.get(month) ?? 0) + Number(point.paid_revenue));
  }
  return [...months.entries()].map(([month, revenue]) => ({
    date: new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur", month: "short", year: "2-digit" }),
    revenue,
  }));
}

export default function ReportSalesChart({ points }: { points: DailySalesPoint[] }) {
  const data = chartData(points);
  const option = useMemo<EChartsOption>(() => ({
    animationDuration: 420,
    grid: { top: 12, right: 12, bottom: 28, left: 8, containLabel: true },
    tooltip: { trigger: "axis", valueFormatter: (value: string | number) => `RM ${Number(value).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    xAxis: { type: "category", boundaryGap: false, data: data.map((item) => item.date), axisTick: { show: false }, axisLine: { lineStyle: { color: "#e9e2dc" } }, axisLabel: { color: "#85746c", fontSize: 11, hideOverlap: true } },
    yAxis: { type: "value", splitNumber: 3, axisLabel: { color: "#85746c", fontSize: 11, formatter: (value: string | number) => `RM ${Number(value).toLocaleString("en-MY")}` }, splitLine: { lineStyle: { color: "#f0e9e4", type: "dashed" } } },
    series: [{ type: "line", data: data.map((item) => item.revenue), smooth: 0.24, showSymbol: false, lineStyle: { color: "#b8171c", width: 3 }, itemStyle: { color: "#b8171c" }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(184, 23, 28, 0.28)" }, { offset: 1, color: "rgba(184, 23, 28, 0.02)" }] } } }],
  }), [data]);

  return <EChart option={option} height={260} label={`Paid sales trend with ${data.length} ${points.length > 90 ? "monthly" : "daily"} points`} />;
}
