import { Group, Paper, Text, ThemeIcon } from "@mantine/core";

import { IconArrowUpRight, IconArrowDownRight } from "@tabler/icons-react";

interface Props {
  title: string;
  value: string;
  diff: number;
  icon: React.ReactNode;
}

export default function DashboardCard({ title, value, diff, icon }: Props) {
  const DiffIcon = diff >= 0 ? IconArrowUpRight : IconArrowDownRight;

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

        <ThemeIcon
          size={42}
          radius="md"
          variant="light"
          color={diff >= 0 ? "teal" : "red"}
        >
          {icon}
        </ThemeIcon>
      </Group>

      <Text c="dimmed" fz="sm" mt="md">
        <Text component="span" fw={700} c={diff >= 0 ? "teal" : "red"}>
          <DiffIcon size={14} />
          {diff}%
        </Text>{" "}
        compared to last month
      </Text>
    </Paper>
  );
}
