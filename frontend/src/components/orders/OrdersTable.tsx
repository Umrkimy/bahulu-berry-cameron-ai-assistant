import { Badge, Button, Card, Table, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { getCustomers } from "../../api/customers";
import { useOrders } from "../../hooks/useOrders";
import type { Order } from "../../types/order";

interface Props {
  onEdit: (order: Order) => void;
}

function getOrderStatusColor(status: string) {
  if (status === "COMPLETED") return "green";
  if (status === "CANCELLED") return "red";
  if (status === "SHIPPED") return "blue";
  if (status === "PROCESSING") return "violet";

  return "yellow";
}

export default function OrdersTable({ onEdit }: Props) {
  const { data: orders, isLoading: isLoadingOrders } = useOrders();

  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  if (isLoadingOrders || isLoadingCustomers) {
    return (
      <Card withBorder p="lg">
        Loading orders...
      </Card>
    );
  }

  const customerNames = new Map(
    customers?.map((customer) => [customer.id, customer.full_name]) ?? [],
  );

  return (
    <Card withBorder radius="md" p="lg">
      <Table.ScrollContainer minWidth={1000}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Order</Table.Th>
              <Table.Th>Customer</Table.Th>
              <Table.Th>Total</Table.Th>
              <Table.Th>Payment</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {orders?.map((order) => (
              <Table.Tr key={order.id}>
                <Table.Td>
                  <Text fw={600}>#{order.id}</Text>
                </Table.Td>

                <Table.Td>
                  {customerNames.get(order.customer_id) ?? "-"}
                </Table.Td>

                <Table.Td>
                  <Text fw={600}>
                    RM {Number(order.total_amount).toFixed(2)}
                  </Text>
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
                  <Badge
                    variant="light"
                    color={getOrderStatusColor(order.status)}
                  >
                    {order.status}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  {new Date(order.created_at).toLocaleDateString("en-MY")}
                </Table.Td>

                <Table.Td>
                  <Button size="xs" onClick={() => onEdit(order)}>
                    Manage
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
}
