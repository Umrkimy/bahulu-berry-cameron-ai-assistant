import { Card, Container, Group, Title, Text } from "@mantine/core";

import InventoryTable from "../../components/inventory/InventoryTable";

export default function Inventory() {
  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Inventory Management</Title>

          <Text c="dimmed" mt={4}>
            Monitor stock levels and adjust inventory
          </Text>
        </div>
      </Group>

      <Card withBorder radius="md">
        <InventoryTable />
      </Card>
    </Container>
  );
}
