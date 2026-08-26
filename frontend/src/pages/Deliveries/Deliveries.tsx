import { useState } from "react";

import {
  Badge,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { useDeliveries } from "../../hooks/useDeliveries";

import type { Delivery, DeliveryStatus } from "../../types/delivery";

import DeliveriesTable from "../../components/delivery/DeliveriesTable";

import DeliveryDetailsDrawer from "../../components/delivery/DeliveryDetailsDrawer";

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

export default function Deliveries() {
  const { data: deliveries = [], isLoading, isError } = useDeliveries();

  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null,
  );

  const pendingCount = deliveries.filter(
    (delivery) => delivery.status === "PENDING",
  ).length;

  const inTransitCount = deliveries.filter(
    (delivery) =>
      delivery.status === "SHIPPED" || delivery.status === "IN_TRANSIT",
  ).length;

  const outForDeliveryCount = deliveries.filter(
    (delivery) => delivery.status === "OUT_FOR_DELIVERY",
  ).length;

  const deliveredCount = deliveries.filter(
    (delivery) => delivery.status === "DELIVERED",
  ).length;

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Deliveries</Title>

        <Text c="dimmed" size="sm">
          Manage and track customer deliveries.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
        <Paper withBorder radius="md" p="md">
          <Text size="sm" c="dimmed">
            Pending
          </Text>

          <Group justify="space-between" mt="xs">
            <Text fw={700} size="xl">
              {pendingCount}
            </Text>

            <Badge color={getStatusColor("PENDING")}>PENDING</Badge>
          </Group>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Text size="sm" c="dimmed">
            In Transit
          </Text>

          <Group justify="space-between" mt="xs">
            <Text fw={700} size="xl">
              {inTransitCount}
            </Text>

            <Badge color={getStatusColor("IN_TRANSIT")}>IN TRANSIT</Badge>
          </Group>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Text size="sm" c="dimmed">
            Out for Delivery
          </Text>

          <Group justify="space-between" mt="xs">
            <Text fw={700} size="xl">
              {outForDeliveryCount}
            </Text>

            <Badge color={getStatusColor("OUT_FOR_DELIVERY")}>
              OUT FOR DELIVERY
            </Badge>
          </Group>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Text size="sm" c="dimmed">
            Delivered
          </Text>

          <Group justify="space-between" mt="xs">
            <Text fw={700} size="xl">
              {deliveredCount}
            </Text>

            <Badge color={getStatusColor("DELIVERED")}>DELIVERED</Badge>
          </Group>
        </Paper>
      </SimpleGrid>

      <DeliveriesTable
        deliveries={deliveries}
        isLoading={isLoading}
        isError={isError}
        onSelectDelivery={setSelectedDelivery}
      />

      <DeliveryDetailsDrawer
        opened={selectedDelivery !== null}
        delivery={selectedDelivery}
        onClose={() => setSelectedDelivery(null)}
      />
    </Stack>
  );
}
