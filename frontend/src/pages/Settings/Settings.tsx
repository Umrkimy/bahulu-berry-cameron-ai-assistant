import { Card, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";

import PageHeader from "../../components/common/PageHeader";

export default function Settings() {
  return (
    <Stack gap="lg">
      <PageHeader title="Settings" description="Manage dashboard preferences and business configuration." />
      <Card withBorder p="xl" style={{ borderColor: "#f0dcd8", background: "rgba(255, 255, 255, 0.88)" }}>
        <Stack align="center" gap="sm" py="xl">
          <ThemeIcon size={56} radius="xl" color="bahulu" variant="light"><IconSettings size={28} /></ThemeIcon>
          <Title order={3}>Settings are coming soon</Title>
          <Text c="dimmed" ta="center" maw={460}>Business preferences, staff access, and connected services will be managed here.</Text>
        </Stack>
      </Card>
    </Stack>
  );
}
