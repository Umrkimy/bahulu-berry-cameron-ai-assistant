import {
  Badge,
  Button,
  Divider,
  Drawer,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  Table,
} from "@mantine/core";

import { modals } from "@mantine/modals";

import { useForm } from "@mantine/form";

import { notifications } from "@mantine/notifications";

import { useQuery } from "@tanstack/react-query";

import { useEffect } from "react";

import { useNavigate } from "react-router-dom";

import { getCustomers } from "../../api/customers";
import { getOrderItems } from "../../api/orders";
import { getProducts } from "../../api/products";
import { getOrderDelivery } from "../../api/deliveries";

import { useCancelOrder, useUpdateOrder } from "../../hooks/useOrders";

import {
  useCreateOrderPayment,
  useOrderPayment,
} from "../../hooks/usePayments";

import type { Order, OrderStatus } from "../../types/order";

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

function getPaymentStatusColor(status: string) {
  if (status === "PAID") return "green";
  if (status === "PENDING") return "yellow";
  if (status === "EXPIRED") return "orange";
  if (status === "FAILED") return "red";
  if (status === "REFUNDED") return "violet";

  return "gray";
}

function getDeliveryStatusColor(status: string) {
  if (status === "DELIVERED") return "green";
  if (status === "OUT_FOR_DELIVERY") return "blue";
  if (status === "IN_TRANSIT") return "cyan";
  if (status === "SHIPPED") return "violet";
  if (status === "FAILED") return "red";

  return "yellow";
}

export default function OrderDetailsDrawer({ opened, onClose, order }: Props) {
  const navigate = useNavigate();

  const updateOrderMutation = useUpdateOrder();

  const cancelOrderMutation = useCancelOrder();

  const createPaymentMutation = useCreateOrderPayment();

  const form = useForm<{
    status: OrderStatus;
  }>({
    initialValues: {
      status: "PENDING",
    },
  });

  useEffect(() => {
    if (!order) {
      return;
    }

    form.setValues({
      status: order.status,
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

  const { data: payment, isLoading: isLoadingPayment } = useOrderPayment(
    order?.id ?? 0,
  );

  const { data: delivery, isLoading: isLoadingDelivery } = useQuery({
    queryKey: ["delivery", order?.id],
    queryFn: () => getOrderDelivery(order!.id),
    enabled: opened && order !== null,
    retry: false,
  });

  if (!order) {
    return null;
  }

  const orderId = order.id;

  const customerName =
    customers?.find((customer) => customer.id === order.customer_id)
      ?.full_name ?? `Customer #${order.customer_id}`;

  const productNames = new Map(
    productsData?.items.map((product) => [product.id, product.name]) ?? [],
  );

  const isFinalOrder =
    order.status === "COMPLETED" || order.status === "CANCELLED";

  const canGeneratePayment =
    order.payment_status !== "PAID" &&
    order.status !== "CANCELLED" &&
    (!payment || payment.status === "EXPIRED" || payment.status === "FAILED");

  async function handleCreatePayment() {
    try {
      await createPaymentMutation.mutateAsync(orderId);

      notifications.show({
        title: "Payment Link Created",
        message: "Stripe payment link was created successfully.",
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Payment Creation Failed",
        message: "Unable to create a Stripe payment link for this order.",
        color: "red",
      });
    }
  }

  async function handleCopyPaymentLink() {
    if (!payment?.payment_url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(payment.payment_url);

      notifications.show({
        title: "Copied",
        message: "Payment link copied to clipboard.",
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Copy Failed",
        message: "Unable to copy the payment link.",
        color: "red",
      });
    }
  }

  function handleOpenPaymentLink() {
    if (!payment?.payment_url) {
      return;
    }

    window.open(payment.payment_url, "_blank", "noopener,noreferrer");
  }

  function handleViewDelivery() {
    onClose();

    navigate(`/deliveries`);
  }

  async function handleSubmit(values: typeof form.values) {
    try {
      await updateOrderMutation.mutateAsync({
        orderId,
        data: {
          status: values.status,
        },
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

  function handleCancelOrder() {
    modals.openConfirmModal({
      title: `Cancel Order #${orderId}`,

      children: (
        <Text size="sm">
          Are you sure you want to cancel this order? The ordered products will
          be returned to inventory.
        </Text>
      ),

      labels: {
        confirm: "Cancel Order",
        cancel: "Keep Order",
      },

      confirmProps: {
        color: "red",
      },

      closeOnConfirm: false,

      onConfirm: async () => {
        try {
          await cancelOrderMutation.mutateAsync(orderId);

          notifications.show({
            title: "Order Cancelled",
            message: "Order cancelled and inventory restored successfully.",
            color: "green",
          });

          modals.closeAll();
          onClose();
        } catch {
          notifications.show({
            title: "Cancellation Failed",
            message: "Unable to cancel this order.",
            color: "red",
          });
        }
      },
    });
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="lg"
      padding="xl"
      title={`Order #${orderId}`}
    >
      <Stack gap="lg">
        {/* ORDER SUMMARY */}
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

        {/* PAYMENT */}
        <Divider label="Payment" labelPosition="center" />

        <Paper withBorder radius="md" p="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={600}>Order Payment Status</Text>

              <Badge color={order.payment_status === "PAID" ? "green" : "red"}>
                {order.payment_status}
              </Badge>
            </Group>

            {isLoadingPayment ? (
              <Text size="sm" c="dimmed">
                Loading payment...
              </Text>
            ) : payment ? (
              <>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Payment Status
                  </Text>

                  <Badge color={getPaymentStatusColor(payment.status)}>
                    {payment.status}
                  </Badge>
                </Group>

                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Provider
                  </Text>

                  <Text fw={500}>{payment.provider}</Text>
                </Group>

                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Amount
                  </Text>

                  <Text fw={600}>
                    {payment.currency} {Number(payment.amount).toFixed(2)}
                  </Text>
                </Group>

                {payment.payment_url && (
                  <Stack gap="xs">
                    <Text size="sm" c="dimmed">
                      Payment Link
                    </Text>

                    <Text
                      size="sm"
                      style={{
                        wordBreak: "break-all",
                      }}
                    >
                      {payment.payment_url}
                    </Text>

                    <Group>
                      {payment.status !== "PAID" &&
                        order.status !== "CANCELLED" && (
                          <Button size="sm" onClick={handleOpenPaymentLink}>
                            Open Payment
                          </Button>
                        )}

                      {payment.status !== "PAID" &&
                        order.status !== "CANCELLED" && (
                          <Button
                            size="sm"
                            variant="light"
                            onClick={handleCopyPaymentLink}
                          >
                            Copy Link
                          </Button>
                        )}
                    </Group>
                  </Stack>
                )}

                {payment.status === "EXPIRED" &&
                  order.status !== "CANCELLED" && (
                    <Button
                      onClick={handleCreatePayment}
                      loading={createPaymentMutation.isPending}
                    >
                      Generate New Payment Link
                    </Button>
                  )}

                {payment.status === "FAILED" &&
                  order.status !== "CANCELLED" && (
                    <Button
                      onClick={handleCreatePayment}
                      loading={createPaymentMutation.isPending}
                    >
                      Generate Payment Link
                    </Button>
                  )}
              </>
            ) : (
              <>
                <Text size="sm" c="dimmed">
                  {order.status === "CANCELLED"
                    ? "This order has been cancelled. Payment cannot be generated."
                    : "No payment has been generated for this order."}
                </Text>

                {canGeneratePayment && (
                  <Button
                    onClick={handleCreatePayment}
                    loading={createPaymentMutation.isPending}
                  >
                    Generate Stripe Payment Link
                  </Button>
                )}
              </>
            )}
          </Stack>
        </Paper>

        {/* DELIVERY */}
        <Divider label="Delivery" labelPosition="center" />

        <Paper withBorder radius="md" p="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={600}>Delivery</Text>

              {delivery && (
                <Badge color={getDeliveryStatusColor(delivery.status)}>
                  {delivery.status}
                </Badge>
              )}
            </Group>

            {isLoadingDelivery ? (
              <Text size="sm" c="dimmed">
                Loading delivery...
              </Text>
            ) : delivery ? (
              <>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Recipient
                  </Text>

                  <Text fw={500}>
                    {delivery.recipient_name ?? "Not specified"}
                  </Text>
                </Group>

                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Courier
                  </Text>

                  <Text fw={500}>{delivery.courier ?? "Not assigned"}</Text>
                </Group>

                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Tracking Number
                  </Text>

                  <Text fw={500}>
                    {delivery.tracking_number ?? "Not assigned"}
                  </Text>
                </Group>

                <Button variant="light" onClick={handleViewDelivery}>
                  View Delivery
                </Button>
              </>
            ) : (
              <>
                <Text size="sm" c="dimmed">
                  No delivery record found for this order.
                </Text>

                <Button variant="light" onClick={handleViewDelivery}>
                  View Delivery
                </Button>
              </>
            )}
          </Stack>
        </Paper>

        {/* ORDER ITEMS */}
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

        {/* ORDER MANAGEMENT */}
        <Divider label="Order Management" labelPosition="center" />

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Select
              label="Order Status"
              data={["PENDING", "PROCESSING", "SHIPPED", "COMPLETED"]}
              disabled={
                updateOrderMutation.isPending ||
                cancelOrderMutation.isPending ||
                isFinalOrder
              }
              {...form.getInputProps("status")}
            />

            <Group justify="space-between" mt="sm">
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

              <Group>
                {!isFinalOrder && (
                  <Button
                    color="red"
                    variant="light"
                    onClick={handleCancelOrder}
                    loading={cancelOrderMutation.isPending}
                  >
                    Cancel Order
                  </Button>
                )}

                {!isFinalOrder && (
                  <Button type="submit" loading={updateOrderMutation.isPending}>
                    Save Changes
                  </Button>
                )}
              </Group>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Drawer>
  );
}
