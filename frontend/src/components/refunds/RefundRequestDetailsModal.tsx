import { Badge, Button, Grid, Group, Modal, SimpleGrid, Stack, Text } from "@mantine/core";

import type { Order } from "../../types/order";
import type { RefundRequest, RefundRequestStatus } from "../../types/refundRequest";
import { formatCode, formatDateTime, formatMoney } from "../../utils/format";
import { DetailField, DetailRow, DetailSection } from "../common/DetailSection";
import { refundStatusColor } from "./refundStatus";

const statusHelp: Record<RefundRequestStatus, string> = {
  REQUESTED: "Waiting for a decision. Review it to approve or reject.",
  UNDER_REVIEW: "Being checked. Approve or reject it when you have decided.",
  APPROVED: "Approved. Refund the payment to send the money back to the customer.",
  REJECTED: "Rejected. No money will be returned for this request.",
  REFUNDED: "Refunded. The payment has been returned to the customer.",
};

interface Props {
  request: RefundRequest | null;
  order?: Order;
  canReview: boolean;
  canRefund: boolean;
  refunding: boolean;
  onClose: () => void;
  onReview: (request: RefundRequest) => void;
  onRefund: (request: RefundRequest) => void;
  onOpenOrder: (orderId: number) => void;
}

export default function RefundRequestDetailsModal({ request, order, canReview, canRefund, refunding, onClose, onReview, onRefund, onOpenOrder }: Props) {
  return (
    <Modal
      opened={request !== null}
      onClose={onClose}
      centered
      size="min(1000px, 100%)"
      padding="xl"
      radius="md"
      title={request && (
        <Group gap="sm" wrap="wrap">
          <Text fw={700} size="lg">Refund request · Order #{request.order_id}</Text>
          <Badge variant="light" color={refundStatusColor[request.status]}>{formatCode(request.status)}</Badge>
        </Group>
      )}
    >
      {request && (
        <Grid gap="lg">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="lg">
              <DetailSection title="Request">
                <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="lg" verticalSpacing="md">
                  <DetailField label="Customer">{request.customer_name}</DetailField>
                  <DetailField label="Amount">{formatMoney(request.order_total)}</DetailField>
                </SimpleGrid>
                <DetailField label="Customer reason">{request.reason}</DetailField>
                <DetailField label="Internal note">{request.internal_note || <Text span size="sm" c="dimmed">None</Text>}</DetailField>
              </DetailSection>

              <DetailSection
                title={`Order #${request.order_id}`}
                aside={order && (
                  <Group gap={6}>
                    <Badge variant="light" color="gray">{formatCode(order.status)}</Badge>
                    <Badge variant="light" color="gray">{formatCode(order.payment_status)}</Badge>
                  </Group>
                )}
              >
                {order?.items?.length ? (
                  <Stack gap={6}>
                    {order.items.map((item, index) => (
                      <Group key={index} justify="space-between" wrap="nowrap">
                        <Text size="sm">{item.product_name}</Text>
                        <Text size="sm" c="dimmed">× {item.quantity}</Text>
                      </Group>
                    ))}
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">Item details are on the order.</Text>
                )}
                <Group justify="space-between" align="center">
                  {order && <Text size="sm" c="dimmed">Placed {formatDateTime(order.created_at)}</Text>}
                  <Button variant="default" size="sm" ml="auto" onClick={() => onOpenOrder(request.order_id)}>Open order</Button>
                </Group>
              </DetailSection>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 5 }}>
            <Stack gap="lg">
              <DetailSection title="Timeline">
                <Stack gap="sm">
                  <DetailRow label="Requested">{formatDateTime(request.created_at)}</DetailRow>
                  <DetailRow label="Reviewed">{request.reviewed_at ? formatDateTime(request.reviewed_at) : "Not yet"}</DetailRow>
                  <DetailRow label="Refunded">{request.refunded_at ? formatDateTime(request.refunded_at) : "Not yet"}</DetailRow>
                </Stack>
              </DetailSection>

              <DetailSection title="Next step">
                <Text size="sm" c="dimmed">{statusHelp[request.status]}</Text>
                {(canReview || canRefund) && (
                  <Stack gap="xs">
                    {canRefund && <Button color="green" loading={refunding} onClick={() => onRefund(request)}>Refund payment</Button>}
                    {canReview && <Button variant={canRefund ? "default" : "filled"} onClick={() => onReview(request)}>Review request</Button>}
                  </Stack>
                )}
              </DetailSection>
            </Stack>
          </Grid.Col>
        </Grid>
      )}
    </Modal>
  );
}
