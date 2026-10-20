import { Group, Paper, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

export function DetailSection({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <Paper withBorder radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between" gap="sm" wrap="nowrap">
          <Title order={4} fz="md">{title}</Title>
          {aside}
        </Group>
        {children}
      </Stack>
    </Paper>
  );
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Group justify="space-between" align="flex-start" gap="md" wrap="nowrap">
      <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>{label}</Text>
      <Text size="sm" fw={500} ta="right" style={{ minWidth: 0, overflowWrap: "anywhere" }} component="div">{children}</Text>
    </Group>
  );
}

export function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={2} miw={0}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
      <Text size="sm" fw={500} style={{ overflowWrap: "anywhere" }} component="div">{children}</Text>
    </Stack>
  );
}
