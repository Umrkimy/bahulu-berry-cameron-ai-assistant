import {
  Alert,
  Badge,
  Card,
  Group,
  Progress,
  Table,
  Text,
} from "@mantine/core";

import { IconAlertTriangle } from "@tabler/icons-react";

import { useDashboardInventory } from "../../hooks/useDashboardInventory";

export default function InventoryCard() {
  const { data, isLoading, error } = useDashboardInventory();

  if (isLoading) {
    return (
      <Card withBorder radius="md" p="lg">
        Loading inventory...
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card withBorder radius="md" p="lg">
        <Text>Failed to load inventory</Text>
      </Card>
    );
  }

  const lowStockItems = data.filter((item) => item.status === "LOW");

  const outOfStockItems = data.filter((item) => item.status === "OUT");

  // Low stock first
  const sortedInventory = [...data].sort((a, b) => {
    const priority = {
      OUT: 1,
      LOW: 2,
      GOOD: 3,
    };

    return priority[a.status] - priority[b.status];
  });

  return (
    <Card withBorder radius="md" p="lg">
      <Group justify="space-between" mb="md">
        <Text fw={700}>Inventory Status</Text>

        <Badge variant="light">{data.length} Products</Badge>
      </Group>

      {lowStockItems.length > 0 && (
        <Alert
          variant="light"
          color="orange"
          title="Low Stock Alert"
          icon={<IconAlertTriangle size={18} />}
          mb="md"
        >
          <Text size="sm">{lowStockItems.length} products need restocking</Text>
        </Alert>
      )}

      <Group mb="lg">
        <Card
          withBorder
          radius="md"
          p="sm"
          style={{
            flex: 1,
          }}
        >
          <Text size="xs" c="dimmed">
            Low Stock
          </Text>

          <Text fw={700}>{lowStockItems.length}</Text>
        </Card>

        <Card
          withBorder
          radius="md"
          p="sm"
          style={{
            flex: 1,
          }}
        >
          <Text size="xs" c="dimmed">
            Out Of Stock
          </Text>

          <Text fw={700}>{outOfStockItems.length}</Text>
        </Card>
      </Group>

      <Table.ScrollContainer minWidth={650}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Product</Table.Th>

              <Table.Th>Stock</Table.Th>

              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {sortedInventory.map((item) => {
              const percentage = Math.min(
                (item.quantity / item.low_stock_threshold) * 100,
                100,
              );

              return (
                <Table.Tr key={item.product_name}>
                  <Table.Td>
                    <Text fw={600}>{item.product_name}</Text>
                  </Table.Td>

                  <Table.Td>
                    <Text size="sm">{item.quantity}</Text>

                    <Progress mt={5} value={percentage} />
                  </Table.Td>

                  <Table.Td>
                    <Badge
                      color={
                        item.status === "GOOD"
                          ? "green"
                          : item.status === "LOW"
                            ? "yellow"
                            : "red"
                      }
                    >
                      {item.status}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
}
