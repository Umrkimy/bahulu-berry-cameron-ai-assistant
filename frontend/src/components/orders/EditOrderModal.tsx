import { useEffect } from "react";

import {
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Text,
} from "@mantine/core";

import { modals } from "@mantine/modals";

import { useForm } from "@mantine/form";

import { notifications } from "@mantine/notifications";

import { useCancelOrder, useUpdateOrder } from "../../hooks/useOrders";
import { getApiError } from "../../api/errors";

import type { Order, OrderStatus } from "../../types/order";
import useAuth from "../../auth/useAuth";

interface Props {
  opened: boolean;
  onClose: () => void;
  order: Order | null;
}

function getStatusOptions(status: OrderStatus, paymentStatus: string): OrderStatus[] {
  const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ["PENDING", "PROCESSING"],
    PROCESSING: ["PROCESSING", "SHIPPED"],
    SHIPPED: paymentStatus === "PAID" ? ["SHIPPED", "COMPLETED"] : ["SHIPPED"],
    COMPLETED: ["COMPLETED"],
    CANCELLED: ["CANCELLED"],
  };
  return nextStatuses[status];
}

function getStatusColor(status: string) {
  switch (status) {
    case "COMPLETED":
      return "green";

    case "CANCELLED":
      return "red";

    case "SHIPPED":
      return "blue";

    case "PROCESSING":
      return "violet";

    case "PENDING":
    default:
      return "yellow";
  }
}

function formatStatus(status: OrderStatus) {
  return status.replaceAll("_", " ");
}

export default function EditOrderModal({ opened, onClose, order }: Props) {
  const { admin } = useAuth();
  const updateOrderMutation = useUpdateOrder();

  const cancelOrderMutation = useCancelOrder();

  const form = useForm<{
    status: OrderStatus;
  }>({
    initialValues: {
      status: "PENDING",
    },
  });

  useEffect(() => {
    if (!order) {
      return;
    }

    form.setValues({
      status: order.status,
    });
  }, [order]);

  if (!order) {
    return null;
  }

  const orderId = order.id;
  const isPaidOrder = order.payment_status === "PAID";

  const isFinalOrder =
    order.status === "COMPLETED" || order.status === "CANCELLED";
  const statusOptions = getStatusOptions(order.status, order.payment_status);

  const isLoading =
    updateOrderMutation.isPending || cancelOrderMutation.isPending;

  async function handleSubmit(values: typeof form.values) {
    if (!order) {
      return;
    }

    const hasChanges = values.status !== order.status;

    if (!hasChanges) {
      notifications.show({
        title: "No Changes",
        message: "No order information has been changed.",
        color: "blue",
      });

      return;
    }

    try {
      await updateOrderMutation.mutateAsync({
        orderId: order.id,
        data: {
          status: values.status,
        },
      });

      notifications.show({
        title: "Order Updated",
        message: "Order status was updated successfully.",
        color: "green",
      });

      onClose();
    } catch (error) {
      const apiError = getApiError(error);
      notifications.show({
        title: "Update Failed",
        message: apiError.message,
        color: "red",
      });
    }
  }

  function handleCancelOrder() {
    modals.openConfirmModal({
      title: `Cancel Order #${orderId}`,

      children: (
        <Text size="sm">
          Are you sure you want to cancel this order? The ordered products will
          be returned to inventory.
          {isPaidOrder
            ? " A refund request will be approved automatically, then an Owner must confirm the Stripe refund."
            : ""}
        </Text>
      ),

      labels: {
        confirm: "Cancel Order",
        cancel: "Keep Order",
      },

      confirmProps: {
        color: "red",
      },

      closeOnConfirm: false,

      onConfirm: async () => {
        try {
          await cancelOrderMutation.mutateAsync(orderId);

          notifications.show({
            title: "Order Cancelled",
            message:
              isPaidOrder
                ? "Order cancelled, stock restored, and the refund is ready for Owner confirmation."
                : "Order cancelled and inventory restored successfully.",
            color: "green",
          });

          modals.closeAll();

          onClose();
        } catch (error) {
          const apiError = getApiError(error);
          notifications.show({
            title: "Cancellation Failed",
            message: apiError.message,
            color: "red",
          });
        }
      },
    });
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="lg"
      padding="xl"
      radius="md"
      title={
        <Stack gap={2}>
          <Text fw={700} size="lg">
            Edit Order
          </Text>

          <Text size="sm" c="dimmed">
            Order #{orderId}
          </Text>
        </Stack>
      }
      closeOnClickOutside={!isLoading}
      closeOnEscape={!isLoading}
    >
      <Stack gap="lg">
        {/* CURRENT STATUS */}

        <Paper withBorder radius="md" p="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" c="dimmed">
                Current Order Status
              </Text>

              <Text fw={700} size="lg" mt={4}>
                {formatStatus(order.status)}
              </Text>
            </div>

            <Badge
              size="lg"
              variant="light"
              color={getStatusColor(order.status)}
            >
              {formatStatus(order.status)}
            </Badge>
          </Group>
        </Paper>

        {/* EDIT */}

        <Divider label="Order Status" labelPosition="center" />

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Select
              label="Order Status"
              placeholder="Select order status"
              data={statusOptions.map((status) => ({
                value: status,
                label: formatStatus(status),
              }))}
              disabled={isLoading || isFinalOrder}
              {...form.getInputProps("status")}
            />

            {isFinalOrder && (
              <Text size="sm" c="dimmed">
                This order is {order.status.toLowerCase()} and can no longer be
                edited.
              </Text>
            )}

            <Divider />

            <Group justify="space-between" mt="sm">
              <div>
                {!isFinalOrder && admin?.role === "OWNER" && (
                  <Button
                    color="red"
                    variant="light"
                    type="button"
                    onClick={handleCancelOrder}
                    loading={cancelOrderMutation.isPending}
                  >
                    Cancel Order
                  </Button>
                )}
              </div>

              <Group gap="xs">
                <Button
                  variant="default"
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Close
                </Button>

                {!isFinalOrder && (
                  <Button type="submit" loading={updateOrderMutation.isPending}>
                    Save Changes
                  </Button>
                )}
              </Group>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Modal>
  );
}
