import { Group, Paper, Text, ThemeIcon } from "@mantine/core";

interface Props {
  title: string;
  value: string;
  description?: string;
  icon: React.ReactNode;
  color: string;
}

export default function DashboardCard({ title, value, description, icon, color }: Props) {
  return (
    <Paper className="dashboard-metric" withBorder p="lg" radius="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
            {title}
          </Text>

          <Text className="metric-value" fw={700} fz="xl" mt={12}>
            {value}
          </Text>

          {description && (
            <Text size="xs" c="dimmed" mt={4}>
              {description}
            </Text>
          )}
        </div>

        <ThemeIcon size={36} radius="md" variant="light" color={color === "orange" ? "orange" : "bahulu"} style={{ flexShrink: 0 }}>
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}
