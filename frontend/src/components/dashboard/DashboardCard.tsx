import { Group, Paper, Text, ThemeIcon } from "@mantine/core";

interface Props {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

export default function DashboardCard({ title, value, icon, color }: Props) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between">
        <div>
          <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
            {title}
          </Text>

          <Text fw={700} fz="xl" mt={4}>
            {value}
          </Text>
        </div>

        <ThemeIcon size={42} radius="md" variant="light" color={color}>
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}
