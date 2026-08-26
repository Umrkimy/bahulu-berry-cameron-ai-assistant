import { useEffect } from "react";

import {
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
} from "@mantine/core";

import { notifications } from "@mantine/notifications";

import { useOrderDelivery } from "../../hooks/useDeliveries";

import type { Delivery, DeliveryStatus } from "../../types/delivery";

interface Props {
  opened: boolean;
  delivery: Delivery | null;
  onClose: () => void;
}

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

export default function DeliveryDetailsModal({
  opened,
  delivery,
  onClose,
}: Props) {
  const orderId = delivery?.order_id ?? 0;

  const { data: latestDelivery, isLoading: isLoadingDelivery } =
    useOrderDelivery(orderId);

  useEffect(() => {
    if (!opened) {
      return;
    }
  }, [opened]);

  if (!delivery) {
    return null;
  }

  const currentDelivery: Delivery = latestDelivery ?? delivery;

  async function handleCopyTrackingNumber() {
    const trackingNumber = currentDelivery.tracking_number;

    if (!trackingNumber) {
      return;
    }

    try {
      await navigator.clipboard.writeText(trackingNumber);

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
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="xl"
      radius="md"
      padding="xl"
      title={
        <Stack gap={2}>
          <Text fw={700} size="lg">
            Delivery Details
          </Text>

          <Text size="sm" c="dimmed">
            Order #{currentDelivery.order_id}
          </Text>
        </Stack>
      }
    >
      <Stack gap="lg">
        {/* STATUS */}

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

        {/* RECIPIENT */}

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

        {/* ADDRESS */}

        <Divider label="Delivery Address" labelPosition="center" />

        <Paper withBorder radius="md" p="md">
          <Stack gap="xs">
            <Text>{currentDelivery.address ?? "—"}</Text>

            <Text>
              {[currentDelivery.postal_code, currentDelivery.city]
                .filter(Boolean)
                .join(" ") || "—"}
            </Text>

            <Text>{currentDelivery.state ?? "—"}</Text>

            <Text>{currentDelivery.country}</Text>
          </Stack>
        </Paper>

        {/* SHIPMENT */}

        <Divider label="Shipment" labelPosition="center" />

        <Paper withBorder radius="md" p="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Courier
              </Text>

              <Text fw={600}>{currentDelivery.courier ?? "Not assigned"}</Text>
            </Group>

            <Group justify="space-between" align="center">
              <div>
                <Text size="sm" c="dimmed">
                  Tracking Number
                </Text>

                <Text fw={600}>
                  {currentDelivery.tracking_number ?? "Not assigned"}
                </Text>
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

        {/* TIMELINE */}

        <Divider label="Delivery Timeline" labelPosition="center" />

        <Paper withBorder radius="md" p="md">
          {isLoadingDelivery ? (
            <Text size="sm" c="dimmed">
              Loading delivery timeline...
            </Text>
          ) : (
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
          )}
        </Paper>

        {/* CLOSE */}

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
