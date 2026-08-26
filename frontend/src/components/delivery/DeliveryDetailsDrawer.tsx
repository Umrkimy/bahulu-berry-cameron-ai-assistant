import {
  Badge,
  Button,
  Divider,
  Drawer,
  Group,
  Paper,
  Select,
  Stack,
  Text,
} from "@mantine/core";

import { notifications } from "@mantine/notifications";

import { useEffect } from "react";

import { useForm } from "@mantine/form";

import {
  useOrderDelivery,
  useUpdateOrderDelivery,
} from "../../hooks/useDeliveries";

import type { Delivery, DeliveryStatus } from "../../types/delivery";

interface Props {
  opened: boolean;
  delivery: Delivery | null;
  onClose: () => void;
}

const DELIVERY_STATUSES: DeliveryStatus[] = [
  "PENDING",
  "IN_TRANSIT",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
];

function getStatusColor(status: DeliveryStatus) {
  switch (status) {
    case "DELIVERED":
      return "green";

    case "OUT_FOR_DELIVERY":
      return "blue";

    case "IN_TRANSIT":
      return "violet";

    case "SHIPPED":
      return "cyan";

    case "FAILED":
      return "red";

    case "PENDING":
    default:
      return "yellow";
  }
}

function formatStatus(status: DeliveryStatus) {
  return status.replaceAll("_", " ");
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DeliveryDetailsDrawer({
  opened,
  delivery,
  onClose,
}: Props) {
  const updateDeliveryMutation = useUpdateOrderDelivery();

  const form = useForm<{
    status: DeliveryStatus;
  }>({
    initialValues: {
      status: "PENDING",
    },
  });

  const { data: latestDelivery } = useOrderDelivery(delivery?.order_id ?? 0);

  useEffect(() => {
    if (!delivery) {
      return;
    }

    form.setValues({
      status: delivery.status,
    });
  }, [delivery]);

  if (!delivery) {
    return null;
  }

  const currentDelivery = latestDelivery ?? delivery;

  async function handleSubmit(values: typeof form.values) {
    if (values.status === currentDelivery.status) {
      notifications.show({
        title: "No Changes",
        message: "The delivery status has not changed.",
        color: "blue",
      });

      return;
    }

    try {
      await updateDeliveryMutation.mutateAsync({
        orderId: currentDelivery.order_id,
        data: {
          status: values.status,
        },
      });

      notifications.show({
        title: "Delivery Updated",
        message: "Delivery status was updated successfully.",
        color: "green",
      });

      onClose();
    } catch {
      notifications.show({
        title: "Update Failed",
        message: "Unable to update the delivery status.",
        color: "red",
      });
    }
  }

  async function handleCopyTrackingNumber() {
    if (!currentDelivery.tracking_number) {
      return;
    }

    try {
      await navigator.clipboard.writeText(currentDelivery.tracking_number);

      notifications.show({
        title: "Copied",
        message: "Tracking number copied to clipboard.",
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Copy Failed",
        message: "Unable to copy the tracking number.",
        color: "red",
      });
    }
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="lg"
      padding="xl"
      title={`Delivery — Order #${currentDelivery.order_id}`}
    >
      <Stack gap="lg">
        {/* Status */}
        <Paper withBorder radius="md" p="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" c="dimmed">
                Delivery Status
              </Text>

              <Text fw={700} size="lg" mt={4}>
                {formatStatus(currentDelivery.status)}
              </Text>
            </div>

            <Badge
              size="lg"
              color={getStatusColor(currentDelivery.status)}
              variant="light"
            >
              {formatStatus(currentDelivery.status)}
            </Badge>
          </Group>
        </Paper>

        {/* Recipient */}
        <Divider label="Recipient" labelPosition="center" />

        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Name
              </Text>

              <Text fw={500}>{currentDelivery.recipient_name ?? "—"}</Text>
            </Group>

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Phone
              </Text>

              <Text fw={500}>{currentDelivery.recipient_phone ?? "—"}</Text>
            </Group>
          </Stack>
        </Paper>

        {/* Address */}
        <Divider label="Delivery Address" labelPosition="center" />

        <Paper withBorder radius="md" p="md">
          <Stack gap="xs">
            <Text>{currentDelivery.address ?? "—"}</Text>

            <Text>
              {[currentDelivery.postal_code, currentDelivery.city]
                .filter(Boolean)
                .join(" ")}
            </Text>

            <Text>{currentDelivery.state ?? "—"}</Text>

            <Text>{currentDelivery.country}</Text>
          </Stack>
        </Paper>

        {/* Courier */}
        <Divider label="Courier" labelPosition="center" />

        <Paper withBorder radius="md" p="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Courier
              </Text>

              <Text fw={600}>{currentDelivery.courier ?? "—"}</Text>
            </Group>

            <Group justify="space-between" align="center">
              <div>
                <Text size="sm" c="dimmed">
                  Tracking Number
                </Text>

                <Text fw={600}>{currentDelivery.tracking_number ?? "—"}</Text>
              </div>

              {currentDelivery.tracking_number && (
                <Button
                  size="xs"
                  variant="light"
                  onClick={handleCopyTrackingNumber}
                >
                  Copy
                </Button>
              )}
            </Group>
          </Stack>
        </Paper>

        {/* Timeline */}
        <Divider label="Delivery Timeline" labelPosition="center" />

        <Paper withBorder radius="md" p="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={500}>Shipped</Text>

              <Text
                size="sm"
                c={currentDelivery.shipped_at ? undefined : "dimmed"}
              >
                {formatDate(currentDelivery.shipped_at)}
              </Text>
            </Group>

            <Group justify="space-between">
              <Text fw={500}>Out for Delivery</Text>

              <Text
                size="sm"
                c={currentDelivery.out_for_delivery_at ? undefined : "dimmed"}
              >
                {formatDate(currentDelivery.out_for_delivery_at)}
              </Text>
            </Group>

            <Group justify="space-between">
              <Text fw={500}>Delivered</Text>

              <Text
                size="sm"
                c={currentDelivery.delivered_at ? undefined : "dimmed"}
              >
                {formatDate(currentDelivery.delivered_at)}
              </Text>
            </Group>

            <Group justify="space-between">
              <Text fw={500}>Failed</Text>

              <Text
                size="sm"
                c={currentDelivery.failed_at ? undefined : "dimmed"}
              >
                {formatDate(currentDelivery.failed_at)}
              </Text>
            </Group>
          </Stack>
        </Paper>

        {/* Management */}
        <Divider label="Delivery Management" labelPosition="center" />

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Select
              label="Delivery Status"
              data={DELIVERY_STATUSES.map((status) => ({
                value: status,
                label: formatStatus(status),
              }))}
              {...form.getInputProps("status")}
              disabled={updateDeliveryMutation.isPending}
            />

            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={onClose}
                disabled={updateDeliveryMutation.isPending}
              >
                Close
              </Button>

              <Button type="submit" loading={updateDeliveryMutation.isPending}>
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Drawer>
  );
}
