import { Card, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconBrandWhatsapp } from "@tabler/icons-react";

import PageHeader from "../../components/common/PageHeader";

export default function WhatsApp() {
  return (
    <Stack gap="lg">
      <PageHeader title="WhatsApp AI" description="Prepare customer conversations and human handoff in one place." />
      <Card withBorder p="xl" style={{ borderColor: "#d8eddf", background: "rgba(255, 255, 255, 0.88)" }}>
        <Stack align="center" gap="sm" py="xl">
          <ThemeIcon size={56} radius="xl" color="green" variant="light"><IconBrandWhatsapp size={28} /></ThemeIcon>
          <Title order={3}>WhatsApp connection is planned</Title>
          <Text c="dimmed" ta="center" maw={500}>Once the business account is ready, this workspace will handle automated customer replies and staff handoff.</Text>
        </Stack>
      </Card>
    </Stack>
  );
}
