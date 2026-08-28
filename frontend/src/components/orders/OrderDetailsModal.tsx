import {
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  Table,
} from "@mantine/core";

import { notifications } from "@mantine/notifications";

import { useQuery } from "@tanstack/react-query";

import { useNavigate } from "react-router-dom";

import { getCustomers } from "../../api/customers";
import { getOrderItems } from "../../api/orders";
import { getProducts } from "../../api/products";
import { getOrderDelivery } from "../../api/deliveries";
import { getApiError } from "../../api/errors";

import {
  useCreateOrderPayment,
  useOrderPayment,
} from "../../hooks/usePayments";
import { useOrderRefundRequest } from "../../hooks/useRefundRequests";

import type { Order } from "../../types/order";

interface Props {
  opened: boolean;
  onClose: () => void;
  order: Order | null;
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

export default function OrderDetailsModal({ opened, onClose, order }: Props) {
  const navigate = useNavigate();
  const createPaymentMutation = useCreateOrderPayment();

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
    opened && order !== null,
  );
  const { data: refundRequest } = useOrderRefundRequest(order?.id ?? 0);

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

  const canGeneratePayment =
    order.payment_status !== "PAID" &&
    order.status !== "CANCELLED" &&
    (!payment || payment.status === "EXPIRED" || payment.status === "FAILED");

  async function handleCreatePayment() {
    try {
      await createPaymentMutation.mutateAsync(orderId);

      notifications.show({
        title: "Payment Link Created",
        message: "Payment link was created successfully.",
        color: "green",
      });
    } catch (error) {
      const apiError = getApiError(error);
      notifications.show({
        title: "Payment Creation Failed",
        message: apiError.message,
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

    navigate("/deliveries");
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="xl"
      padding="xl"
      radius="md"
      title={`Order #${orderId}`}
      closeOnClickOutside={!createPaymentMutation.isPending}
      closeOnEscape={!createPaymentMutation.isPending}
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

            <Stack gap={2} align="flex-end">
              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  Subtotal
                </Text>
                <Text size="sm">RM {Number(order.subtotal).toFixed(2)}</Text>
              </Group>

              <Group gap="xs">
                <Text size="sm" c="red">
                  Discount
                </Text>
                <Text size="sm" c="red">
                  -RM {Number(order.discount_amount).toFixed(2)}
                </Text>
              </Group>

              <Text fw={700} size="lg">
                RM {Number(order.total_amount).toFixed(2)}
              </Text>
            </Stack>
          </Group>
        </Paper>

        {/* PAYMENT */}

        <Divider label="Payment" labelPosition="center" />

        <Paper withBorder radius="md" p="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={600}>Order Payment Status</Text>

              <Badge
                color={
                  order.payment_status === "PAID"
                    ? "green"
                    : order.payment_status === "REFUNDED"
                      ? "violet"
                      : order.payment_status === "UNPAID"
                        ? "red"
                        : "gray"
                }
                variant="light"
              >
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

                  <Badge
                    color={getPaymentStatusColor(payment.status)}
                    variant="light"
                  >
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

                {/* PAID */}

                {payment.status === "PAID" && (
                  <Paper withBorder radius="md" p="md">
                    <Stack gap="sm">
                      <Group justify="space-between">
                        <div>
                          <Text fw={600}>Payment Completed</Text>

                          <Text size="sm" c="dimmed" mt={4}>
                            This order has already been paid.
                          </Text>
                        </div>

                        <Badge color="green" size="lg" variant="light">
                          PAID
                        </Badge>
                      </Group>
                      {!refundRequest &&
                        ["PENDING", "PROCESSING"].includes(order.status) && (
                          <Button
                            color="red"
                            variant="light"
                            onClick={() =>
                              navigate(`/refund-requests?order=${orderId}`)
                            }
                          >
                            Record Refund Request
                          </Button>
                        )}
                    </Stack>
                  </Paper>
                )}

                {payment.status === "REFUNDED" && (
                  <Paper withBorder radius="md" p="md">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text fw={600}>Payment Refunded</Text>
                        <Badge color="violet" size="lg" variant="light">
                          REFUNDED
                        </Badge>
                      </Group>
                      <Text size="sm" c="dimmed">
                        Reason: {payment.refund_reason ?? "Not recorded"}
                      </Text>
                      {payment.refunded_at && (
                        <Text size="sm" c="dimmed">
                          Refunded{" "}
                          {new Date(payment.refunded_at).toLocaleString(
                            "en-MY",
                            { timeZone: "Asia/Kuala_Lumpur" },
                          )}
                        </Text>
                      )}
                    </Stack>
                  </Paper>
                )}

                {/* EXPIRED */}

                {payment.status === "EXPIRED" && (
                  <Paper withBorder radius="md" p="md">
                    <Stack gap="sm">
                      <Group justify="space-between">
                        <div>
                          <Text fw={600}>Payment Link Expired</Text>

                          <Text size="sm" c="dimmed" mt={4}>
                            This payment link has expired and can no longer be
                            used.
                          </Text>
                        </div>

                        <Badge color="orange" size="lg" variant="light">
                          EXPIRED
                        </Badge>
                      </Group>

                      {canGeneratePayment && (
                        <Button
                          onClick={handleCreatePayment}
                          loading={createPaymentMutation.isPending}
                        >
                          Generate New Payment Link
                        </Button>
                      )}
                    </Stack>
                  </Paper>
                )}

                {/* FAILED */}

                {payment.status === "FAILED" && (
                  <Paper withBorder radius="md" p="md">
                    <Stack gap="sm">
                      <Group justify="space-between">
                        <div>
                          <Text fw={600}>Payment Failed</Text>

                          <Text size="sm" c="dimmed" mt={4}>
                            The previous payment attempt failed.
                          </Text>
                        </div>

                        <Badge color="red" size="lg" variant="light">
                          FAILED
                        </Badge>
                      </Group>

                      {canGeneratePayment && (
                        <Button
                          onClick={handleCreatePayment}
                          loading={createPaymentMutation.isPending}
                        >
                          Generate Payment Link
                        </Button>
                      )}
                    </Stack>
                  </Paper>
                )}

                {/* PENDING */}

                {payment.status === "PENDING" && payment.payment_url && (
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

                    {order.status !== "CANCELLED" && (
                      <Group>
                        <Button size="sm" onClick={handleOpenPaymentLink}>
                          Open Payment
                        </Button>

                        <Button
                          size="sm"
                          variant="light"
                          onClick={handleCopyPaymentLink}
                        >
                          Copy Link
                        </Button>
                      </Group>
                    )}
                  </Stack>
                )}

                {/* OTHER PAYMENT STATES */}

                {payment.status !== "PAID" &&
                  payment.status !== "EXPIRED" &&
                  payment.status !== "FAILED" &&
                  payment.status !== "PENDING" &&
                  payment.payment_url && (
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
                    </Stack>
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
                    Generate Payment Link
                  </Button>
                )}
              </>
            )}
          </Stack>
        </Paper>

        <Divider label="Refund Request" labelPosition="center" />

        <Paper withBorder radius="md" p="md">
          {refundRequest ? (
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={600}>Refund request</Text>
                <Badge
                  color={
                    refundRequest.status === "REFUNDED"
                      ? "green"
                      : refundRequest.status === "REJECTED"
                        ? "red"
                        : refundRequest.status === "APPROVED"
                          ? "violet"
                          : "yellow"
                  }
                  variant="light"
                >
                  {refundRequest.status.replaceAll("_", " ")}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                Customer reason: {refundRequest.reason}
              </Text>
              {refundRequest.internal_note && (
                <Text size="sm" c="dimmed">
                  Internal note: {refundRequest.internal_note}
                </Text>
              )}
              <Button
                variant="light"
                onClick={() => navigate("/refund-requests")}
              >
                View Refund Requests
              </Button>
            </Stack>
          ) : (
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                {order.payment_status === "PAID" &&
                !["PENDING", "PROCESSING"].includes(order.status)
                  ? "Refunds can only be requested while a paid order is pending or processing."
                  : "No refund request has been recorded for this order."}
              </Text>
              {order.payment_status === "PAID" &&
                ["PENDING", "PROCESSING"].includes(order.status) && (
                  <Button
                    variant="light"
                    color="red"
                    onClick={() =>
                      navigate(`/refund-requests?order=${orderId}`)
                    }
                  >
                    Record Refund Request
                  </Button>
                )}
            </Stack>
          )}
        </Paper>

        {/* DELIVERY */}

        <Divider label="Delivery" labelPosition="center" />

        <Paper withBorder radius="md" p="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={600}>Delivery</Text>

              {delivery && (
                <Badge
                  color={getDeliveryStatusColor(delivery.status)}
                  variant="light"
                >
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

                  <Table.Th>Regular Total</Table.Th>

                  <Table.Th>Discount</Table.Th>

                  <Table.Th>Final Total</Table.Th>
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

                    <Table.Td>
                      {item.discount_name ? (
                        <>
                          <Text c="red">
                            -RM {Number(item.discount_amount).toFixed(2)}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {item.discount_name}
                          </Text>
                        </>
                      ) : (
                        "-"
                      )}
                    </Table.Td>

                    <Table.Td fw={700}>
                      RM {Number(item.total_amount).toFixed(2)}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <Text c="dimmed">No products in this order.</Text>
        )}

      </Stack>
    </Modal>
  );
}
