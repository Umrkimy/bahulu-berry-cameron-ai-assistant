import { Alert, Button, Loader, Modal } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { getOrderDelivery } from "../../api/deliveries";
import { getApiError } from "../../api/errors";
import type { Order } from "../../types/order";
import OrderDetailsModal from "../orders/OrderDetailsModal";
import EditDeliveryModal from "../delivery/EditDeliveryModal";

export default function RecordWorkspace({ orderId, kind, onClose }: { orderId: number; kind: "order" | "delivery"; onClose: () => void }) {
  const order = useQuery({ queryKey: ["order", orderId], queryFn: async () => (await api.get<Order>(`/orders/${orderId}`)).data, enabled: kind === "order" });
  const delivery = useQuery({ queryKey: ["delivery", orderId], queryFn: () => getOrderDelivery(orderId), enabled: kind === "delivery" });
  const active = kind === "order" ? order : delivery;
  if (active.isPending || active.isError) return <Modal opened onClose={onClose} title={`Order #${orderId}`} centered>
    {active.isError ? <Alert color="red" title="Could not open this record">{getApiError(active.error).message}<Button mt="sm" variant="light" onClick={() => void active.refetch()}>Try again</Button></Alert> : <Loader aria-label="Loading record" />}
  </Modal>;
  return kind === "order" ? <OrderDetailsModal opened order={order.data ?? null} onClose={onClose} /> : <EditDeliveryModal opened delivery={delivery.data ?? null} onClose={onClose} />;
}
