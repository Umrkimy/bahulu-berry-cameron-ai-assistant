import { Badge, Button, Card, Table, Text } from "@mantine/core";

import { useState } from "react";

import { useInventories } from "../../hooks/useInventory";

import type { Inventory } from "../../types/inventory";

import StockAdjustmentModal from "./StockAdjustmentModal";

export default function InventoryTable() {
  const { data, isLoading } = useInventories();

  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(
    null,
  );

  if (isLoading) {
    return (
      <Card withBorder p="lg">
        Loading inventory...
      </Card>
    );
  }

  return (
    <Card withBorder radius="md" p="lg">
      <Table.ScrollContainer minWidth={900}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Product</Table.Th>

              <Table.Th>Category</Table.Th>

              <Table.Th>Quantity</Table.Th>

              <Table.Th>Threshold</Table.Th>

              <Table.Th>Status</Table.Th>

              <Table.Th>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {data?.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>
                  <Text fw={600}>{item.product_name}</Text>
                </Table.Td>

                <Table.Td>{item.product_category ?? "-"}</Table.Td>

                <Table.Td>{item.quantity}</Table.Td>

                <Table.Td>{item.low_stock_threshold}</Table.Td>

                <Table.Td>
                  <Badge
                    color={
                      item.quantity === 0
                        ? "red"
                        : item.quantity <= item.low_stock_threshold
                          ? "orange"
                          : "green"
                    }
                  >
                    {item.quantity === 0
                      ? "OUT"
                      : item.quantity <= item.low_stock_threshold
                        ? "LOW"
                        : "GOOD"}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => setSelectedInventory(item)}
                  >
                    Adjust
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <StockAdjustmentModal
        opened={selectedInventory !== null}
        inventory={selectedInventory}
        onClose={() => {
          setSelectedInventory(null);
        }}
      />
    </Card>
  );
}
