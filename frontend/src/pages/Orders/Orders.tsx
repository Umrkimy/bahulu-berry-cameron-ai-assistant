import { Button, Card, Group, Text } from "@mantine/core";
import { useState } from "react";

import CreateOrderModal from "../../components/orders/CreateOrderModal";
import OrderDetailsDrawer from "../../components/orders/OrderDetailsDrawer";
import OrdersTable from "../../components/orders/OrdersTable";
import type { Order } from "../../types/order";

export default function Orders() {
  const [createOpened, setCreateOpened] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  return (
    <Card withBorder radius="md" p="lg">
      <Group justify="space-between" mb="md">
        <div>
          <Text fw={700} size="lg">
            Orders Management
          </Text>

          <Text c="dimmed" size="sm">
            Manage customer orders, payments, and delivery status
          </Text>
        </div>

        <Button onClick={() => setCreateOpened(true)}>Create Order</Button>
      </Group>

      <OrdersTable onEdit={setSelectedOrder} />

      <CreateOrderModal
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
      />

      <OrderDetailsDrawer
        opened={selectedOrder !== null}
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </Card>
  );
}
