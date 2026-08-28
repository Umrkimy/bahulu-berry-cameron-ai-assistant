import {
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
} from "@mantine/core";
import type { ReactNode } from "react";
import { modals } from "@mantine/modals";

interface FormModalProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  submitLabel: string;
  loading?: boolean;
  isDirty?: boolean;
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
  isDirty = false,
  onSubmit,
}: FormModalProps) {
  const requestClose = () => {
    if (isDirty) {
      modals.openConfirmModal({
        title: "Discard unsaved changes?",
        children: <Text size="sm">Your changes have not been saved.</Text>,
        labels: { confirm: "Discard", cancel: "Keep editing" },
        confirmProps: { color: "red" },
        onConfirm: onClose,
      });
      return;
    }
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={requestClose}
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
              onClick={requestClose}
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
