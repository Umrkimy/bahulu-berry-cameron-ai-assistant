import { Button, Card, Group, Text } from "@mantine/core";
import InventoryTable from "../../components/inventory/InventoryTable";

export default function InventoryPage() {
  return (
    <Card withBorder radius="md" p="lg">
      <Group justify="space-between" mb="md">
        <div>
          <Text fw={700} size="lg">
            Inventory Management
          </Text>

          <Text c="dimmed" size="sm">
            Monitor stock levels and manage inventory
          </Text>
        </div>

        <Button>Stock Adjustment</Button>
      </Group>

      <InventoryTable />
    </Card>
  );
}
