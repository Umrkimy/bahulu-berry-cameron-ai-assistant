import {
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
} from "@mantine/core";
import type { ReactNode } from "react";

interface FormModalProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  submitLabel: string;
  loading?: boolean;
  onSubmit: () => void;
}

export default function FormModal({
  opened,
  onClose,
  title,
  description,
  children,
  submitLabel,
  loading = false,
  onSubmit,
}: FormModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Stack gap={2}>
          <Text fw={700} size="lg">
            {title}
          </Text>

          {description && (
            <Text size="sm" c="dimmed" fw={400}>
              {description}
            </Text>
          )}
        </Stack>
      }
      centered
      size="lg"
      radius="md"
      padding="lg"
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Stack gap="lg">
          {children}

          <Divider />

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button type="submit" loading={loading}>
              {submitLabel}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}