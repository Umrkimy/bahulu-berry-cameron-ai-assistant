import {
  Badge,
  Button,
  Divider,
  Drawer,
  Group,
  Paper,
  Select,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { getCustomers } from "../../api/customers";
import { getOrderItems } from "../../api/orders";
import { getProducts } from "../../api/products";
import { useUpdateOrder } from "../../hooks/useOrders";
import type { Order, OrderStatus, PaymentStatus } from "../../types/order";

interface Props {
  opened: boolean;
  onClose: () => void;
  order: Order | null;
}

function getStatusColor(status: string) {
  if (status === "COMPLETED") return "green";
  if (status === "CANCELLED") return "red";
  if (status === "SHIPPED") return "blue";
  if (status === "PROCESSING") return "violet";

  return "yellow";
}

export default function OrderDetailsDrawer({ opened, onClose, order }: Props) {
  const updateOrderMutation = useUpdateOrder();

  const form = useForm<{
    status: OrderStatus;
    payment_status: PaymentStatus;
  }>({
    initialValues: {
      status: "PENDING",
      payment_status: "UNPAID",
    },
  });

  useEffect(() => {
    if (!order) return;

    form.setValues({
      status: order.status,
      payment_status: order.payment_status,
    });
  }, [order]);

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const { data: items, isLoading: isLoadingItems } = useQuery({
    queryKey: ["order-items", order?.id],
    queryFn: () => getOrderItems(order!.id),
    enabled: opened && order !== null,
  });

  if (!order) return null;

  const customerName =
    customers?.find((customer) => customer.id === order.customer_id)
      ?.full_name ?? `Customer #${order.customer_id}`;

  const productNames = new Map(
    productsData?.items.map((product) => [product.id, product.name]) ?? [],
  );

  async function handleSubmit(values: typeof form.values) {
    try {
      await updateOrderMutation.mutateAsync({
        orderId: order.id,
        data: values,
      });

      notifications.show({
        title: "Order Updated",
        message: "Order status was updated successfully.",
        color: "green",
      });

      onClose();
    } catch {
      notifications.show({
        title: "Update Failed",
        message: "Unable to update this order.",
        color: "red",
      });
    }
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="lg"
      padding="xl"
      title={`Order #${order.id}`}
    >
      <Stack gap="lg">
        <Paper withBorder radius="md" p="md">
          <Group justify="space-between" align="start">
            <div>
              <Text size="sm" c="dimmed">
                Customer
              </Text>

              <Text fw={700}>{customerName}</Text>
            </div>

            <div>
              <Text size="sm" c="dimmed">
                Total
              </Text>

              <Text fw={700} size="lg">
                RM {Number(order.total_amount).toFixed(2)}
              </Text>
            </div>
          </Group>
        </Paper>

        <Divider label="Order Items" labelPosition="center" />

        {isLoadingItems ? (
          <Text c="dimmed">Loading products...</Text>
        ) : items && items.length > 0 ? (
          <Table.ScrollContainer minWidth={500}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Product</Table.Th>
                  <Table.Th>Qty</Table.Th>
                  <Table.Th>Subtotal</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {items.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      {productNames.get(item.product_id) ??
                        `Product #${item.product_id}`}
                    </Table.Td>

                    <Table.Td>{item.quantity}</Table.Td>

                    <Table.Td fw={600}>
                      RM {Number(item.subtotal).toFixed(2)}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <Text c="dimmed">No products in this order.</Text>
        )}

        <Divider label="Order Management" labelPosition="center" />

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Select
              label="Order Status"
              data={[
                "PENDING",
                "PROCESSING",
                "SHIPPED",
                "COMPLETED",
                "CANCELLED",
              ]}
              {...form.getInputProps("status")}
            />

            <Select
              label="Payment Status"
              data={["UNPAID", "PAID"]}
              {...form.getInputProps("payment_status")}
            />

            <Group justify="space-between">
              <Group gap="xs">
                <Badge color={getStatusColor(order.status)}>
                  {order.status}
                </Badge>

                <Badge
                  color={order.payment_status === "PAID" ? "green" : "red"}
                >
                  {order.payment_status}
                </Badge>
              </Group>

              <Button type="submit" loading={updateOrderMutation.isPending}>
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Drawer>
  );
}
