import { Alert, Button, Card, Group, List, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconX } from "@tabler/icons-react";

import type { AIConfirmationPreview } from "../../types/ai";

type ConfirmationCardProps = {
  preview: AIConfirmationPreview;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

function formatExpiry(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Expires shortly"
    : `Expires ${new Intl.DateTimeFormat("en-MY", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kuala_Lumpur",
      }).format(date)} (Malaysia time)`;
}

export default function ConfirmationCard({
  preview,
  loading = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmationCardProps) {
  return (
    <Card withBorder radius="md" p="md" maw={620} style={{ marginLeft: 45 }}>
      <Stack gap="sm">
        <Group gap="xs">
          <IconAlertTriangle size={18} aria-hidden="true" />
          <Text fw={700}>{preview.action_title}</Text>
        </Group>
        <List size="sm" spacing={4}>
          {preview.details.map((detail) => <List.Item key={detail}>{detail}</List.Item>)}
        </List>
        <Text size="xs" c="dimmed">{formatExpiry(preview.expires_at)}</Text>
        {error ? <Alert color="red" title="Action not completed">{error}</Alert> : null}
        <Group grow={false} wrap="wrap">
          <Button
            color="green"
            leftSection={<IconCheck size={16} />}
            loading={loading}
            onClick={onConfirm}
            aria-label={`Confirm ${preview.action_title}`}
          >
            Confirm
          </Button>
          <Button
            color="red"
            variant="light"
            leftSection={<IconX size={16} />}
            disabled={loading}
            onClick={onCancel}
            aria-label={`Cancel ${preview.action_title}`}
          >
            Cancel
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
