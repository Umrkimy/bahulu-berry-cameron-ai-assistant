import {
  Alert,
  Badge,
  Button,
  Grid,
  SimpleGrid,
  Group,
  Modal,
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
import useAuth from "../../auth/useAuth";

import {
  useCreateOrderPayment,
  useOrderPayment,
  useRenewOrderPayment,
} from "../../hooks/usePayments";
import { useOrderRefundRequest } from "../../hooks/useRefundRequests";

import type { Order } from "../../types/order";
import { formatCode, formatDateTime, formatMoney } from "../../utils/format";
import { DetailField, DetailRow, DetailSection } from "../common/DetailSection";
import { refundStatusColor } from "../refunds/refundStatus";
import { can } from "../../auth/permissions";

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

function getOrderStatusColor(status: string) {
  if (status === "COMPLETED") return "green";
  if (status === "CANCELLED") return "red";
  if (status === "SHIPPED") return "blue";
  if (status === "PROCESSING") return "violet";
  return "yellow";
}

function getDeliveryStatusColor(status: string) {
  if (status === "DELIVERED") return "green";
  if (status === "OUT_FOR_DELIVERY") return "blue";
  if (status === "IN_TRANSIT") return "cyan";
  if (status === "SHIPPED") return "violet";
  if (status === "FAILED") return "red";

  return "yellow";
}

const PAYMENT_LINK_MINUTES = 30;

function linkExpiresAt(createdAt: string) {
  return new Date(new Date(createdAt).getTime() + PAYMENT_LINK_MINUTES * 60 * 1000);
}

function hasLinkExpired(createdAt: string) {
  return linkExpiresAt(createdAt).getTime() <= Date.now();
}

export default function OrderDetailsModal({ opened, onClose, order }: Props) {
  const navigate = useNavigate();
  const { admin } = useAuth();
  const createPaymentMutation = useCreateOrderPayment();
  const renewPaymentMutation = useRenewOrderPayment();

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
    enabled: opened && order !== null,
  });

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
    enabled: opened && order !== null,
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
  const { data: refundRequest } = useOrderRefundRequest(order?.id ?? 0, opened && order !== null);

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

  async function handleRenewPayment() {
    try {
      await renewPaymentMutation.mutateAsync(orderId);
      notifications.show({
        title: "New payment link ready",
        message: "The previous link was closed. Send the customer this new one.",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Couldn’t create a new link",
        message: getApiError(error).message,
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

  const busy = createPaymentMutation.isPending || renewPaymentMutation.isPending;
  const canRecordRefund = order.payment_status === "PAID" && ["PENDING", "PROCESSING"].includes(order.status);
  const address = delivery ? [delivery.address, [delivery.postal_code, delivery.city].filter(Boolean).join(" "), delivery.state].filter(Boolean).join(", ") : "";

  function goTo(path: string, state?: unknown) {
    onClose();
    navigate(path, state ? { state } : undefined);
  }

  const paymentDetails = isLoadingPayment ? (
    <Text size="sm" c="dimmed">Loading payment…</Text>
  ) : payment ? (
    <Stack gap="sm">
      <DetailRow label="Provider">{formatCode(payment.provider)}</DetailRow>
      <DetailRow label="Amount">{payment.currency} {Number(payment.amount).toFixed(2)}</DetailRow>
      {payment.status !== order.payment_status && (
        <DetailRow label="Latest link"><Badge color={getPaymentStatusColor(payment.status)} variant="light">{formatCode(payment.status)}</Badge></DetailRow>
      )}
      {payment.paid_at && <DetailRow label="Paid">{formatDateTime(payment.paid_at)}</DetailRow>}
      {payment.status === "REFUNDED" && (
        <>
          {payment.refunded_at && <DetailRow label="Refunded">{formatDateTime(payment.refunded_at)}</DetailRow>}
          <DetailRow label="Refund reason">{payment.refund_reason ?? "Not recorded"}</DetailRow>
        </>
      )}
      {(payment.status === "EXPIRED" || payment.status === "FAILED") && (
        <Text size="sm" c="dimmed">
          {payment.status === "EXPIRED" ? "This payment link has expired and can no longer be used." : "The previous payment attempt failed."}
        </Text>
      )}
      {(payment.status === "EXPIRED" || payment.status === "FAILED") && canGeneratePayment && (
        <Button onClick={handleCreatePayment} loading={createPaymentMutation.isPending}>
          {payment.status === "EXPIRED" ? "Generate New Payment Link" : "Generate Payment Link"}
        </Button>
      )}
      {payment.status === "PENDING" && payment.payment_url && hasLinkExpired(payment.created_at) && order.status !== "CANCELLED" && (
        <Alert color="orange" variant="light" title="This payment link has expired">
          <Stack gap="sm">
            <Text size="sm">
              Links stay open for {PAYMENT_LINK_MINUTES} minutes. This one expired at {linkExpiresAt(payment.created_at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" })}. Create a new link and send it to the customer.
            </Text>
            <Group>
              <Button onClick={handleRenewPayment} loading={renewPaymentMutation.isPending}>Create new payment link</Button>
            </Group>
          </Stack>
        </Alert>
      )}
      {payment.status === "PENDING" && payment.payment_url && !hasLinkExpired(payment.created_at) && (
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            Payment link · expires {linkExpiresAt(payment.created_at).toLocaleTimeString("en-MY", { timeZone: "Asia/Kuala_Lumpur", hour: "numeric", minute: "2-digit" })}
          </Text>
          <Text size="sm" lineClamp={2} style={{ wordBreak: "break-all" }}>{payment.payment_url}</Text>
          {order.status !== "CANCELLED" && (
            <Group gap="xs">
              <Button size="sm" onClick={handleOpenPaymentLink}>Open Payment</Button>
              <Button size="sm" variant="default" onClick={handleCopyPaymentLink}>Copy Link</Button>
              <Button size="sm" variant="subtle" color="gray" onClick={handleRenewPayment} loading={renewPaymentMutation.isPending}>Replace link</Button>
            </Group>
          )}
        </Stack>
      )}
    </Stack>
  ) : (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        {order.status === "CANCELLED" ? "This order has been cancelled. Payment cannot be generated." : "No payment has been generated for this order."}
      </Text>
      {canGeneratePayment && (
        <Button onClick={handleCreatePayment} loading={createPaymentMutation.isPending}>Generate Payment Link</Button>
      )}
    </Stack>
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="min(1200px, 100%)"
      padding="xl"
      radius="md"
      title={
        <Group gap="sm" wrap="wrap">
          <Text fw={700} size="lg">Order #{orderId}</Text>
          <Badge variant="light" color={getOrderStatusColor(order.status)}>{formatCode(order.status)}</Badge>
          <Badge variant="light" color={getPaymentStatusColor(order.payment_status)}>{formatCode(order.payment_status)}</Badge>
          <Text size="sm" c="dimmed">{formatDateTime(order.created_at)}</Text>
        </Group>
      }
      closeOnClickOutside={!busy}
      closeOnEscape={!busy}
    >
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 7, lg: 8 }}>
          <Stack gap="lg">
            <DetailSection title="Items">
              {isLoadingItems ? (
                <Text size="sm" c="dimmed">Loading products…</Text>
              ) : items && items.length > 0 ? (
                <>
                  <Stack gap="sm" hiddenFrom="sm">
                    {items.map((item) => (
                      <Group key={item.id} justify="space-between" align="flex-start" wrap="nowrap">
                        <div>
                          <Text size="sm" fw={500}>{productNames.get(item.product_id) ?? `Product #${item.product_id}`}</Text>
                          <Text size="xs" c="dimmed">
                            {item.quantity} × {formatMoney(item.unit_price)}
                            {item.discount_name && ` · ${item.discount_name} -${formatMoney(item.discount_amount)}`}
                          </Text>
                        </div>
                        <Text size="sm" fw={600} style={{ whiteSpace: "nowrap" }}>{formatMoney(item.total_amount)}</Text>
                      </Group>
                    ))}
                  </Stack>
                  <Table.ScrollContainer minWidth={480} visibleFrom="sm">
                    <Table verticalSpacing="sm" horizontalSpacing="md" style={{ whiteSpace: "nowrap" }}>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Product</Table.Th>
                          <Table.Th ta="right">Qty</Table.Th>
                          <Table.Th ta="right">Price</Table.Th>
                          <Table.Th ta="right">Discount</Table.Th>
                          <Table.Th ta="right">Total</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {items.map((item) => (
                          <Table.Tr key={item.id}>
                            <Table.Td fw={500}>{productNames.get(item.product_id) ?? `Product #${item.product_id}`}</Table.Td>
                            <Table.Td ta="right">{item.quantity}</Table.Td>
                            <Table.Td ta="right">{formatMoney(item.unit_price)}</Table.Td>
                            <Table.Td ta="right">
                              {item.discount_name ? (
                                <>
                                  <Text size="sm" c="red">-{formatMoney(item.discount_amount)}</Text>
                                  <Text size="xs" c="dimmed">{item.discount_name}</Text>
                                </>
                              ) : "—"}
                            </Table.Td>
                            <Table.Td ta="right" fw={600}>{formatMoney(item.total_amount)}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                </>
              ) : (
                <Text size="sm" c="dimmed">No products in this order.</Text>
              )}
              <Stack gap={6} ml="auto" w={{ base: "100%", xs: 280 }}>
                <DetailRow label="Subtotal">{formatMoney(order.subtotal)}</DetailRow>
                {Number(order.discount_amount) > 0 && <DetailRow label="Discount"><Text span c="red" size="sm" fw={500}>-{formatMoney(order.discount_amount)}</Text></DetailRow>}
                <Group justify="space-between">
                  <Text fw={600}>Total</Text>
                  <Text fw={700} size="lg">{formatMoney(order.total_amount)}</Text>
                </Group>
              </Stack>
            </DetailSection>

            <DetailSection
              title="Customer and delivery"
              aside={delivery && <Badge color={getDeliveryStatusColor(delivery.status)} variant="light">{formatCode(delivery.status)}</Badge>}
            >
              <SimpleGrid cols={{ base: 1, xs: 2, lg: 3 }} spacing="lg" verticalSpacing="md">
                <DetailField label="Customer">{customerName}</DetailField>
                {delivery?.recipient_name && <DetailField label="Recipient">{delivery.recipient_name}</DetailField>}
                {delivery?.recipient_phone && <DetailField label="Phone">{delivery.recipient_phone}</DetailField>}
                {delivery && address && <DetailField label="Address">{address}</DetailField>}
                {delivery && <DetailField label="Courier">{delivery.courier ?? "Not assigned"}</DetailField>}
                {delivery && <DetailField label="Tracking number">{delivery.tracking_number ?? "Not assigned"}</DetailField>}
              </SimpleGrid>
              {isLoadingDelivery ? (
                <Text size="sm" c="dimmed">Loading delivery…</Text>
              ) : !delivery && (
                <Text size="sm" c="dimmed">No delivery record for this order.</Text>
              )}
              <Group justify="flex-end">
                <Button variant="default" size="sm" onClick={handleViewDelivery}>View Delivery</Button>
              </Group>
            </DetailSection>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5, lg: 4 }}>
          <Stack gap="lg">
            <DetailSection title="Payment" aside={<Badge color={getPaymentStatusColor(order.payment_status)} variant="light">{formatCode(order.payment_status)}</Badge>}>
              {paymentDetails}
            </DetailSection>

            <DetailSection title="Refund" aside={refundRequest && <Badge color={refundStatusColor[refundRequest.status]} variant="light">{formatCode(refundRequest.status)}</Badge>}>
              {refundRequest ? (
                <Stack gap="sm">
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Customer reason</Text>
                    <Text size="sm">{refundRequest.reason}</Text>
                  </div>
                  {refundRequest.internal_note && (
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Internal note</Text>
                      <Text size="sm">{refundRequest.internal_note}</Text>
                    </div>
                  )}
                  <Button variant="default" onClick={() => goTo("/refund-requests", { openRefundForOrder: orderId })}>Open refund request</Button>
                </Stack>
              ) : (
                <Stack gap="sm">
                  <Text size="sm" c="dimmed">
                    {order.payment_status === "PAID" && !canRecordRefund
                      ? "Refunds can only be requested while a paid order is pending or processing."
                      : "No refund request has been recorded for this order."}
                  </Text>
                  {canRecordRefund && (
                    <Button variant="light" color="red" onClick={() => goTo("/refund-requests", { dashboardAction: "CREATE_REFUND_REQUEST", orderId: String(orderId) })}>
                      Record Refund Request
                    </Button>
                  )}
                </Stack>
              )}
            </DetailSection>

            {can(admin, "tasks.manage") && (
              <Button variant="default" onClick={() => goTo("/tasks", { taskContext: { type: "ORDER", id: orderId, label: `Order #${orderId}` } })}>
                Create task for this order
              </Button>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
    </Modal>
  );
}
