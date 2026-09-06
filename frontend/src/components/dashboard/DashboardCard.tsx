import { Group, Paper, Text, ThemeIcon } from "@mantine/core";
import AnimatedNumber from "../common/motion/AnimatedNumber";

interface Props {
  title: string;
  value: number;
  format?: "currency" | "number";
  description?: string;
  icon: React.ReactNode;
  color: string;
}

export default function DashboardCard({ title, value, format = "number", description, icon, color }: Props) {
  return (
    <Paper className="dashboard-metric dashboard-metric-compact" withBorder p="md" radius="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
            {title}
          </Text>

          <Text className="metric-value" fw={750} fz="lg" mt={6}>
            <AnimatedNumber value={value} format={format} />
          </Text>

          {description && (
            <Text size="xs" c="dimmed" mt={4}>
              {description}
            </Text>
          )}
        </div>

        <ThemeIcon size={32} radius="md" variant="light" color={color === "orange" ? "orange" : "bahulu"} style={{ flexShrink: 0 }}>
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}
