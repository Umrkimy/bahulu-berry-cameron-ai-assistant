import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";

import { getApiError } from "../../api/errors";
import { useDispatchOrder } from "../../hooks/useOrders";
import type { FulfillmentOrder } from "../../types/order";

interface Props {
  opened: boolean;
  order: FulfillmentOrder | null;
  onClose: () => void;
}

export default function DispatchOrderModal({ opened, order, onClose }: Props) {
  const dispatchMutation = useDispatchOrder();
  const form = useForm({ initialValues: { courier: order?.delivery?.courier ?? "", tracking_number: order?.delivery?.tracking_number ?? "" } });

  function close() {
    if (!dispatchMutation.isPending) {
      if (form.isDirty()) {
        modals.openConfirmModal({ title: "Discard unsaved dispatch details?", children: <Text size="sm">Your changes have not been saved.</Text>, labels: { confirm: "Discard", cancel: "Keep editing" }, onConfirm: onClose });
      } else onClose();
    }
  }

  function submit(values: typeof form.values) {
    if (!order) return;
    modals.openConfirmModal({
      title: `Mark order #${order.id} as shipped?`,
      children: <Text size="sm">This moves the order into delivery. Courier and tracking details can be added later if needed.</Text>,
      labels: { confirm: "Mark as shipped", cancel: "Keep preparing" },
      confirmProps: { color: "bahulu" },
      onConfirm: async () => {
        try {
          await dispatchMutation.mutateAsync({
            orderId: order.id,
            courier: values.courier.trim() || null,
            tracking_number: values.tracking_number.trim() || null,
          });
          notifications.show({ title: "Order shipped", message: `Order #${order.id} is now in delivery.`, color: "green" });
          form.resetDirty();
          onClose();
        } catch (error) {
          const apiError = getApiError(error);
          form.setErrors(apiError.fieldErrors);
          notifications.show({ title: "Could not mark as shipped", message: apiError.message, color: "red" });
        }
      },
    });
  }

  return <Modal opened={opened} onClose={close} title="Dispatch order" centered>
    {order && <form onSubmit={form.onSubmit(submit)}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">Order #{order.id} · {order.customer_name}</Text>
        <TextInput label="Courier" placeholder="Optional, e.g. J&T Express" {...form.getInputProps("courier")} disabled={dispatchMutation.isPending} />
        <TextInput label="Tracking number" placeholder="Optional" {...form.getInputProps("tracking_number")} disabled={dispatchMutation.isPending} />
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={close} disabled={dispatchMutation.isPending}>Cancel</Button>
          <Button type="submit" loading={dispatchMutation.isPending}>Mark as shipped</Button>
        </Group>
      </Stack>
    </form>}
  </Modal>;
}
