import { Group, Stack, Text } from "@mantine/core";

import Logo from "./Logo";

interface BrandNameProps {
  showDescription?: boolean;
}

export default function BrandName({ showDescription = true }: BrandNameProps) {
  return (
    <Group gap="sm">
      <Logo />

      <Stack gap={0}>
        <Text fw={700} size="lg">
          Bahulu Cameron
        </Text>

        {showDescription && (
          <Text size="xs" c="dimmed">
            Admin Bakery
          </Text>
        )}
      </Stack>
    </Group>
  );
}
