import { useCallback, useMemo, useState } from "react";
import { Badge, Button, Group, Modal, Select, Stack, Text, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconCash, IconChecklist, IconEye, IconPlus } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useLocation, useNavigate } from "react-router-dom";

import PageHeader from "../../components/common/PageHeader";
import { DataTable } from "../../components/common/DataTable";
import useAuth from "../../auth/useAuth";
import { useOrders } from "../../hooks/useOrders";
import { useCreateRefundRequest, useExecuteRefundRequest, useRefundRequests, useUpdateRefundRequest } from "../../hooks/useRefundRequests";
import type { RefundRequest, RefundRequestStatus } from "../../types/refundRequest";
import { getApiError } from "../../api/errors";
import type { DashboardRouteState } from "../../types/navigation";
import { formatCode, formatDateTime } from "../../utils/format";
import RowActions from "../../components/common/DataTable/RowActions";
import RefundRequestDetailsModal from "../../components/refunds/RefundRequestDetailsModal";
import { refundStatusColor as statusColor } from "../../components/refunds/refundStatus";

const nextStatuses: Record<RefundRequestStatus, RefundRequestStatus[]> = { REQUESTED: ["UNDER_REVIEW", "APPROVED", "REJECTED"], UNDER_REVIEW: ["APPROVED", "REJECTED"], APPROVED: ["REJECTED"], REJECTED: [], REFUNDED: [] };

export default function RefundRequests() {
  const { admin } = useAuth();
  const { data: requests, isLoading } = useRefundRequests();
  const { data: orders } = useOrders();
  const createMutation = useCreateRefundRequest();
  const updateMutation = useUpdateRefundRequest();
  const refundMutation = useExecuteRefundRequest();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as DashboardRouteState | null;
  const requestedOrderId = routeState?.dashboardAction === "CREATE_REFUND_REQUEST" ? routeState.orderId ?? "" : "";
  const [opened, setOpened] = useState(() => Boolean(requestedOrderId));
  const [reviewing, setReviewing] = useState<RefundRequest | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const routedOrderId = routeState?.openRefundForOrder;
  const viewing = requests?.find((request) => viewingId !== null ? request.id === viewingId : request.order_id === routedOrderId) ?? null;
  const isOwner = admin?.role === "OWNER";
  const createForm = useForm({ initialValues: { orderId: requestedOrderId, reason: "" }, validate: { orderId: (value) => value ? null : "Select a paid order", reason: (value) => value.trim().length >= 3 ? null : "Enter the customer reason" } });
  const reviewForm = useForm<{ status: RefundRequestStatus; internalNote: string }>({ initialValues: { status: "UNDER_REVIEW", internalNote: "" } });

  const existingOrderIds = useMemo(() => new Set(requests?.map((request) => request.order_id) ?? []), [requests]);
  const paidOrders = useMemo(() => (orders ?? []).filter((order) => order.payment_status === "PAID" && ["PENDING", "PROCESSING"].includes(order.status) && !existingOrderIds.has(order.id)), [existingOrderIds, orders]);

  function openCreate(orderId?: string) {
    createForm.setValues({ orderId: orderId ?? "", reason: "" });
    setOpened(true);
  }

  const closeCreate = () => { setOpened(false); if (requestedOrderId) navigate(location.pathname, { replace: true, state: null }); };

  const openReview = useCallback((request: RefundRequest) => {
    setReviewing(request);
    reviewForm.setValues({ status: nextStatuses[request.status][0] ?? request.status, internalNote: request.internal_note ?? "" });
  }, [reviewForm]);

  async function submitCreate(values: typeof createForm.values) {
    try {
      await createMutation.mutateAsync({ orderId: Number(values.orderId), reason: values.reason.trim() });
      notifications.show({ title: "Refund request recorded", message: "It is ready for review.", color: "green" });
      setOpened(false);
    } catch (error) {
      const apiError = getApiError(error);
      createForm.setErrors(apiError.fieldErrors);
      notifications.show({ title: "Unable to record request", message: apiError.message, color: "red" });
    }
  }

  async function submitReview(values: typeof reviewForm.values) {
    if (!reviewing) return;
    try {
      await updateMutation.mutateAsync({ requestId: reviewing.id, status: values.status, internalNote: values.internalNote.trim() || null });
      notifications.show({ title: "Refund request updated", message: values.status.replaceAll("_", " "), color: "green" });
      setReviewing(null);
    } catch (error) {
      const apiError = getApiError(error);
      reviewForm.setErrors(apiError.fieldErrors);
      notifications.show({ title: "Unable to update request", message: apiError.message, color: "red" });
    }
  }

  const confirmRefund = useCallback((request: RefundRequest) => {
    modals.openConfirmModal({ title: `Refund Order #${request.order_id}`, children: <Text size="sm">Refund RM {Number(request.order_total).toFixed(2)} through Stripe test mode? This cannot be undone.</Text>, labels: { confirm: "Refund payment", cancel: "Cancel" }, confirmProps: { color: "green" }, closeOnConfirm: false, onConfirm: async () => {
      try {
        await refundMutation.mutateAsync(request.id);
        notifications.show({ title: "Payment refunded", message: "Stripe confirmed the test refund.", color: "green" });
        modals.closeAll();
      } catch (error) {
        notifications.show({ title: "Refund failed", message: getApiError(error).message, color: "red" });
      }
    } });
  }, [refundMutation]);

  const closeView = () => { setViewingId(null); if (routedOrderId) navigate(location.pathname, { replace: true, state: null }); };

  const columns = useMemo<ColumnDef<RefundRequest, unknown>[]>(() => [
    { id: "order", accessorKey: "order_id", header: "Order", cell: ({ row }) => <Text fw={600}>#{row.original.order_id}</Text> },
    { id: "customer", accessorKey: "customer_name", header: "Customer" },
    { id: "reason", accessorKey: "reason", header: "Customer reason", cell: ({ row }) => <Text lineClamp={2}>{row.original.reason}</Text> },
    { id: "amount", accessorFn: (row) => Number(row.order_total), header: "Amount", cell: ({ row }) => <Text fw={600}>RM {Number(row.original.order_total).toFixed(2)}</Text> },
    { id: "status", accessorKey: "status", header: "Status", cell: ({ row }) => <Badge color={statusColor[row.original.status]} variant="light">{formatCode(row.original.status)}</Badge> },
    { id: "requested", accessorKey: "created_at", header: "Requested", cell: ({ row }) => <Text size="sm">{formatDateTime(row.original.created_at)}</Text> },
    { id: "actions", header: "Actions", enableSorting: false, cell: ({ row }) => <RowActions label={`refund request for order #${row.original.order_id}`} actions={[{ label: "View request", icon: <IconEye size={16} />, onClick: () => setViewingId(row.original.id) }, { label: "Review request", icon: <IconChecklist size={16} />, hidden: admin?.role !== "OWNER" || nextStatuses[row.original.status].length === 0, onClick: () => openReview(row.original) }, { label: "Refund payment", icon: <IconCash size={16} />, color: "green", hidden: admin?.role !== "OWNER" || row.original.status !== "APPROVED", disabled: refundMutation.isPending, onClick: () => confirmRefund(row.original) }]} /> },
  ], [admin?.role, confirmRefund, openReview, refundMutation.isPending]);

  return <>
    <PageHeader title="Refund Requests" description="Record customer requests, review them, and refund approved paid orders." action={<Button leftSection={<IconPlus size={16} />} onClick={() => openCreate()}>Record Request</Button>} />
    <DataTable data={requests ?? []} columns={columns} loading={isLoading} searchPlaceholder="Search orders, customers, reasons, statuses..." emptyMessage="No refund requests yet." onRowClick={(request) => setViewingId(request.id)} />
    <RefundRequestDetailsModal
      request={viewing}
      order={orders?.find((order) => order.id === viewing?.order_id)}
      canReview={isOwner && viewing !== null && nextStatuses[viewing.status].length > 0}
      canRefund={isOwner && viewing?.status === "APPROVED"}
      refunding={refundMutation.isPending}
      onClose={closeView}
      onReview={(request) => { closeView(); openReview(request); }}
      onRefund={confirmRefund}
      onOpenOrder={(orderId) => navigate("/orders", { state: { openOrderId: orderId } })}
    />
    <Modal opened={opened} onClose={closeCreate} title="Record Refund Request" centered>
      <form onSubmit={createForm.onSubmit(submitCreate)}><Stack>
        <Select label="Paid pending or processing order" withAsterisk searchable data={paidOrders.map((order) => ({ value: String(order.id), label: `Order #${order.id} — RM ${Number(order.total_amount).toFixed(2)}` }))} {...createForm.getInputProps("orderId")} />
        <Textarea label="Customer reason" withAsterisk minRows={3} maxLength={500} {...createForm.getInputProps("reason")} />
        <Group justify="flex-end"><Button variant="default" onClick={closeCreate}>Cancel</Button><Button type="submit" loading={createMutation.isPending}>Record Request</Button></Group>
      </Stack></form>
    </Modal>
    <Modal opened={reviewing !== null} onClose={() => setReviewing(null)} title={reviewing ? `Review Order #${reviewing.order_id}` : "Review Refund Request"} centered>
      <form onSubmit={reviewForm.onSubmit(submitReview)}><Stack>
        <Text size="sm" c="dimmed">Customer reason: {reviewing?.reason}</Text>
        <Select label="Decision" data={(reviewing ? nextStatuses[reviewing.status] : []).map((status) => ({ value: status, label: status.replaceAll("_", " ") }))} {...reviewForm.getInputProps("status")} />
        <Textarea label="Internal note" minRows={3} maxLength={500} {...reviewForm.getInputProps("internalNote")} />
        <Group justify="flex-end"><Button variant="default" onClick={() => setReviewing(null)}>Cancel</Button><Button type="submit" loading={updateMutation.isPending}>Save Decision</Button></Group>
      </Stack></form>
    </Modal>
  </>;
}
