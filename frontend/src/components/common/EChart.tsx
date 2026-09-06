import EChartsReactCoreModule from "echarts-for-react/lib/core";
import type { EChartsOption } from "echarts";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([BarChart, CanvasRenderer, GridComponent, LegendComponent, LineChart, PieChart, TooltipComponent]);

const EChartsReactCore = (EChartsReactCoreModule as unknown as { default?: typeof EChartsReactCoreModule }).default ?? EChartsReactCoreModule;

interface EChartProps {
  option: EChartsOption;
  height: number;
  label: string;
}

export default function EChart({ option, height, label }: EChartProps) {
  return <EChartsReactCore
    echarts={echarts}
    option={option}
    notMerge
    lazyUpdate
    opts={{ renderer: "canvas" }}
    style={{ height, width: "100%" }}
    role="img"
    aria-label={label}
  />;
}
