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
    <Paper withBorder p="lg" radius="lg" style={{ borderColor: "#f0dcd8", background: "rgba(255, 255, 255, 0.88)" }}>
      <Group justify="space-between">
        <div>
          <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
            {title}
          </Text>

          <Text fw={700} fz="xl" mt={4}>
            {value}
          </Text>

          {description && (
            <Text size="xs" c="dimmed" mt={4}>
              {description}
            </Text>
          )}
        </div>

        <ThemeIcon size={46} radius="lg" variant="light" color={color}>
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}
