import { Card, Group, Text } from "@mantine/core";

import DeliveriesTable from "../../components/delivery/DeliveriesTable";

export default function DeliveryPage() {
  return (
    <Card withBorder radius="md" p="lg">
      <Group justify="space-between" mb="md">
        <div>
          <Text fw={700} size="lg">
            Delivery Management
          </Text>

          <Text c="dimmed" size="sm">
            Manage and track customer deliveries
          </Text>
        </div>
      </Group>

      <DeliveriesTable />
    </Card>
  );
}
