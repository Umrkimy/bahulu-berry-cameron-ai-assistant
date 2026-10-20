import { useEffect } from "react";

import {
  Badge,
  Button,
  Grid,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Timeline,
} from "@mantine/core";

import { notifications } from "@mantine/notifications";

import { useOrderDelivery } from "../../hooks/useDeliveries";

import type { Delivery, DeliveryStatus } from "../../types/delivery";
import { formatCode } from "../../utils/format";
import { DetailField, DetailSection } from "../common/DetailSection";

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
  return formatCode(status);
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

  const steps = [
    { label: "Shipped", at: currentDelivery.shipped_at },
    { label: "Out for delivery", at: currentDelivery.out_for_delivery_at },
    { label: "Delivered", at: currentDelivery.delivered_at },
    ...(currentDelivery.failed_at ? [{ label: "Failed", at: currentDelivery.failed_at }] : []),
  ];
  const cityLine = [currentDelivery.postal_code, currentDelivery.city].filter(Boolean).join(" ");

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="min(1000px, 100%)"
      radius="md"
      padding="xl"
      title={
        <Group gap="sm" wrap="wrap">
          <Text fw={700} size="lg">Delivery · Order #{currentDelivery.order_id}</Text>
          <Badge color={getStatusColor(currentDelivery.status)} variant="light">{formatStatus(currentDelivery.status)}</Badge>
        </Group>
      }
    >
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Stack gap="lg">
            <DetailSection title="Recipient">
              <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="lg" verticalSpacing="md">
                <DetailField label="Name">{currentDelivery.recipient_name ?? "—"}</DetailField>
                <DetailField label="Phone">{currentDelivery.recipient_phone ?? "—"}</DetailField>
              </SimpleGrid>
              <DetailField label="Address">
                {[currentDelivery.address, cityLine, currentDelivery.state, currentDelivery.country].filter(Boolean).map((line) => <div key={line}>{line}</div>)}
              </DetailField>
            </DetailSection>

            <DetailSection title="Shipment">
              <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="lg" verticalSpacing="md">
                <DetailField label="Courier">{currentDelivery.courier ?? "Not assigned"}</DetailField>
                <DetailField label="Tracking number">
                  <Group gap="xs" wrap="nowrap">
                    <span>{currentDelivery.tracking_number ?? "Not assigned"}</span>
                    {currentDelivery.tracking_number && <Button size="compact-xs" variant="default" onClick={handleCopyTrackingNumber}>Copy</Button>}
                  </Group>
                </DetailField>
              </SimpleGrid>
            </DetailSection>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <DetailSection title="Timeline">
            {isLoadingDelivery ? (
              <Text size="sm" c="dimmed">Loading delivery timeline…</Text>
            ) : (
              <Timeline active={steps.filter((step) => step.at).length - 1} bulletSize={14} lineWidth={2}>
                {steps.map((step) => (
                  <Timeline.Item key={step.label} title={<Text size="sm" fw={500}>{step.label}</Text>} color={step.label === "Failed" ? "red" : undefined}>
                    <Text size="sm" c="dimmed">{step.at ? formatDate(step.at) : "Not yet"}</Text>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </DetailSection>
        </Grid.Col>
      </Grid>
    </Modal>
  );
}
