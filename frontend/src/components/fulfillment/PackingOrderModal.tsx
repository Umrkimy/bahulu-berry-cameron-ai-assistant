import { useMemo, useState } from "react";
import { Alert, Badge, Button, Checkbox, Divider, Group, Modal, Paper, Stack, Text, TextInput } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconCircleCheck, IconPackage, IconTruck } from "@tabler/icons-react";

import { getApiError } from "../../api/errors";
import { useDispatchOrder, useUpdateOrder } from "../../hooks/useOrders";
import type { FulfillmentOrder } from "../../types/order";

type PackingMode = "prepare" | "dispatch";

interface PackingOrderModalProps {
  opened: boolean;
  order: FulfillmentOrder | null;
  mode: PackingMode;
  onClose: () => void;
}

interface PackingOrderContentProps extends Omit<PackingOrderModalProps, "order"> {
  order: FulfillmentOrder;
}

function deliveryAddress(order: FulfillmentOrder) {
  const delivery = order.delivery;
  if (!delivery) return "Delivery record unavailable";
  return [delivery.address, delivery.postal_code, delivery.city, delivery.state, delivery.country].filter(Boolean).join(", ") || "Address not recorded";
}

export default function PackingOrderModal({ opened, order, mode, onClose }: PackingOrderModalProps) {
  if (!order) return null;
  return <PackingOrderContent key={`${order.id}-${mode}`} opened={opened} order={order} mode={mode} onClose={onClose} />;
}

function PackingOrderContent({ opened, order, mode, onClose }: PackingOrderContentProps) {
  const updateOrder = useUpdateOrder();
  const dispatchOrder = useDispatchOrder();
  const [checkedItemIds, setCheckedItemIds] = useState<number[]>([]);
  const [courier, setCourier] = useState(order.delivery?.courier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(order.delivery?.tracking_number ?? "");

  const allPacked = useMemo(() => Boolean(order.items.length) && order.items.every((item) => checkedItemIds.includes(item.id)), [checkedItemIds, order.items]);
  const pending = updateOrder.isPending || dispatchOrder.isPending;

  function toggleItem(itemId: number) {
    setCheckedItemIds((current) => current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]);
  }

  async function startPreparation() {
    try {
      await updateOrder.mutateAsync({ orderId: order.id, data: { status: "PROCESSING" } });
      notifications.show({ title: "Preparation started", message: `Order #${order.id} is ready to pack.`, color: "green" });
      onClose();
    } catch (error) {
      notifications.show({ title: "Could not start preparation", message: getApiError(error).message, color: "red" });
    }
  }

  function confirmDispatch() {
    modals.openConfirmModal({
      title: `Dispatch order #${order.id}?`,
      children: <Text size="sm">You confirmed every item is packed. This moves the paid order into delivery.</Text>,
      labels: { confirm: "Confirm and dispatch", cancel: "Keep packing" },
      confirmProps: { color: "bahulu" },
      onConfirm: async () => {
        try {
          await dispatchOrder.mutateAsync({ orderId: order.id, courier: courier.trim() || null, tracking_number: trackingNumber.trim() || null });
          notifications.show({ title: "Order dispatched", message: `Order #${order.id} is now in delivery.`, color: "green" });
          onClose();
        } catch (error) {
          notifications.show({ title: "Could not dispatch order", message: getApiError(error).message, color: "red" });
        }
      },
    });
  }

  return <Modal opened={opened} onClose={() => !pending && onClose()} centered size="lg" radius="md" padding="xl" title={<Stack gap={2}><Text fw={750} size="lg">{mode === "prepare" ? "Prepare order" : "Pack and dispatch"}</Text><Text size="sm" c="dimmed">Order #{order.id} · {order.customer_name}</Text></Stack>} closeOnClickOutside={!pending} closeOnEscape={!pending}>
    <Stack gap="lg">
      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" align="flex-start"><Stack gap={2}><Text fw={700}>Order items</Text><Text size="sm" c="dimmed">Pack the exact quantities shown below.</Text></Stack><Badge color="green" variant="light">Payment confirmed</Badge></Group>
        <Stack gap="xs" mt="md">{order.items.map((item) => mode === "dispatch" ? <Checkbox key={item.id} checked={checkedItemIds.includes(item.id)} onChange={() => toggleItem(item.id)} label={<Text size="sm" fw={600}>{item.product_name} <Text component="span" c="dimmed">× {item.quantity}</Text></Text>} disabled={pending} /> : <Group key={item.id} justify="space-between"><Text size="sm" fw={600}>{item.product_name}</Text><Badge variant="light" color="bahulu">× {item.quantity}</Badge></Group>)}</Stack>
        {mode === "dispatch" ? <Text size="xs" c={allPacked ? "green" : "dimmed"} mt="md">{allPacked ? "Every item has been confirmed packed." : "Confirm every item to enable dispatch."}</Text> : null}
      </Paper>

      <Paper withBorder p="md" radius="md"><Stack gap="xs"><Group gap="xs"><IconTruck size={17} /><Text fw={700}>Delivery handover</Text></Group><Text size="sm">{order.delivery?.recipient_name ?? "Recipient not recorded"}</Text>{order.delivery?.recipient_phone ? <Text size="sm" c="dimmed">{order.delivery.recipient_phone}</Text> : null}<Text size="sm" c="dimmed">{deliveryAddress(order)}</Text></Stack></Paper>

      {mode === "dispatch" && <><Divider label="Courier details" labelPosition="center" /><TextInput label="Courier" placeholder="Optional, e.g. J&T Express" value={courier} onChange={(event) => setCourier(event.currentTarget.value)} disabled={pending} /><TextInput label="Tracking number" placeholder="Optional" value={trackingNumber} onChange={(event) => setTrackingNumber(event.currentTarget.value)} disabled={pending} /></>}
      {mode === "dispatch" && !order.items.length ? <Alert color="red" title="Order items unavailable">This order cannot be dispatched until its item details are available.</Alert> : null}
      <Group justify="flex-end"><Button variant="default" onClick={onClose} disabled={pending}>Cancel</Button>{mode === "prepare" ? <Button leftSection={<IconPackage size={16} />} onClick={() => void startPreparation()} loading={updateOrder.isPending}>Start preparation</Button> : <Button leftSection={<IconCircleCheck size={16} />} disabled={!allPacked || pending} loading={dispatchOrder.isPending} onClick={confirmDispatch}>Mark as shipped</Button>}</Group>
    </Stack>
  </Modal>;
}
