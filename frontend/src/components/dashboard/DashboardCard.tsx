import { Text } from "@mantine/core";
import AnimatedNumber from "../common/motion/AnimatedNumber";

interface Props {
  title: string;
  value: number;
  format?: "currency" | "number";
  description?: string;
}

export default function DashboardCard({ title, value, format = "number", description }: Props) {
  return (
    <div className="kpi-cell">
      <Text size="sm" c="dimmed" fw={500}>{title}</Text>
      <Text className="metric-value" fw={600} fz={24} mt={4}>
        <AnimatedNumber value={value} format={format} />
      </Text>
      {description ? <Text size="xs" c="dimmed" mt={2}>{description}</Text> : null}
    </div>
  );
}
