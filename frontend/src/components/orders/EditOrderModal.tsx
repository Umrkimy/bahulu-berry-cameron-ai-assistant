import { Button, Modal, Select, Stack } from "@mantine/core";

import { useForm } from "@mantine/form";

import { notifications } from "@mantine/notifications";

import { useEffect } from "react";

import { useUpdateOrder } from "../../hooks/useOrders";

import type { Order, OrderStatus, PaymentStatus } from "../../types/order";

interface Props {
  opened: boolean;
  onClose: () => void;
  order: Order | null;
}

export default function EditOrderModal({ opened, onClose, order }: Props) {
  const updateOrderMutation = useUpdateOrder();

  const form = useForm<{
    status: OrderStatus;
    payment_status: PaymentStatus;
  }>({
    initialValues: {
      status: "PENDING",
      payment_status: "UNPAID",
    },
  });

  useEffect(() => {
    if (!order) return;

    form.setValues({
      status: order.status,
      payment_status: order.payment_status,
    });
  }, [order]);

  async function handleSubmit(values: typeof form.values) {
    if (!order) return;

    try {
      await updateOrderMutation.mutateAsync({
        orderId: order.id,

        data: {
          status: values.status,
          payment_status: values.payment_status,
        },
      });

      notifications.show({
        title: "Order Updated",
        message: "Order status was updated successfully.",
        color: "green",
      });

      onClose();
    } catch {
      notifications.show({
        title: "Update Failed",
        message: "Unable to update this order.",
        color: "red",
      });
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Manage Order" centered>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Select
            label="Order Status"
            data={["PENDING", "PROCESSING", "SHIPPED", "COMPLETED"]}
            disabled={updateOrderMutation.isPending}
            {...form.getInputProps("status")}
          />

          <Select
            label="Payment Status"
            data={["UNPAID", "PAID"]}
            disabled={updateOrderMutation.isPending}
            {...form.getInputProps("payment_status")}
          />

          <Button type="submit" loading={updateOrderMutation.isPending}>
            Save Changes
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
