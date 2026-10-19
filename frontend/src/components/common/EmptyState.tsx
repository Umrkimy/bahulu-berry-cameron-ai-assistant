import { Stack, Text, ThemeIcon } from "@mantine/core";

import { IconInbox } from "@tabler/icons-react";

interface Props {
  title: string;

  description: string;
}

export default function EmptyState({ title, description }: Props) {
  return (
    <Stack align="center" py="xl">
      <ThemeIcon size={60} radius="xl" variant="default">
        <IconInbox size={32} />
      </ThemeIcon>

      <Text fw={600} size="lg">
        {title}
      </Text>

      <Text c="dimmed" ta="center">
        {description}
      </Text>
    </Stack>
  );
}
