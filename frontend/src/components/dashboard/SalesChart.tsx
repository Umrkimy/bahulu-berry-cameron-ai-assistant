import { Card, Text } from "@mantine/core";

import { LineChart } from "@mantine/charts";

import { useSalesChart } from "../../hooks/useSalesChart";

import DashboardSkeleton from "./DashboardSkeleton";

export default function SalesChart() {
  const { data, isLoading, error } = useSalesChart();

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
    <Card withBorder radius="md" p="lg">
      <Text fw={700} mb="md">
        Sales Overview
      </Text>

      <LineChart
        h={320}
        data={data}
        dataKey="month"
        series={[
          {
            name: "revenue",

            color: "#E51C23",
          },
        ]}
      />
    </Card>
  );
}
