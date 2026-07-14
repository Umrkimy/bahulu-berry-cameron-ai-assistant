import { Avatar, Badge, Card, Group, Table, Text } from "@mantine/core";

import { useDashboard } from "../../hooks/useDashboard";

function getShortName(fullName: string) {
  const parts = fullName.trim().split(" ");

  if (parts.length === 1) {
    return parts[0];
  }

  return parts[0] === "Muhammad" ||
    parts[0] === "Mohammad" ||
    parts[0] === "Ahmad"
    ? parts[1]
    : parts[0];
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "COMPLETED" ? "green" : status === "PENDING" ? "yellow" : "blue";

  return <Badge color={color}>{status}</Badge>;
}

export default function RecentOrders() {
  const { data, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <Card withBorder radius="md" p="lg">
        Loading orders...
      </Card>
    );
  }

  const orders = data?.recent_orders ?? [];

  return (
    <Card withBorder radius="md" p="lg">
      <Text fw={700} mb="md">
        Recent Orders
      </Text>

      <Table.ScrollContainer minWidth={900}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Order</Table.Th>

              <Table.Th>Customer</Table.Th>

              <Table.Th>Products</Table.Th>

              <Table.Th>Quantity</Table.Th>

              <Table.Th>Total</Table.Th>

              <Table.Th>Payment</Table.Th>

              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {orders.map((order) => (
              <Table.Tr key={order.id}>
                <Table.Td>
                  <Text fw={600}>#{order.id}</Text>
                </Table.Td>

                <Table.Td>
                  <Group gap="sm">
                    <Avatar radius="xl">{order.customer_name.charAt(0)}</Avatar>

                    <Text fw={600} size="sm">
                      {getShortName(order.customer_name)}
                    </Text>
                  </Group>
                </Table.Td>

                {/* Products */}
                <Table.Td>
                  {order.items.length === 0 ? (
                    <Text fw={600} c="dimmed">
                      No items
                    </Text>
                  ) : (
                    order.items.map((item, index) => (
                      <Text fw={600} size="sm" key={index}>
                        {item.product_name}
                      </Text>
                    ))
                  )}
                </Table.Td>

                {/* Quantity */}
                <Table.Td>
                  {order.items.length === 0 ? (
                    <Text c="dimmed">-</Text>
                  ) : (
                    order.items.map((item, index) => (
                      <Text fw={600} size="sm" key={index}>
                        {item.quantity}
                      </Text>
                    ))
                  )}
                </Table.Td>

                {/* Order Total */}
                <Table.Td>
                  <Text fw={600}>RM {order.total_amount}</Text>
                </Table.Td>

                <Table.Td>
                  <Badge
                    variant="light"
                    color={order.payment_status === "PAID" ? "green" : "red"}
                  >
                    {order.payment_status}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  <StatusBadge status={order.status} />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
}
