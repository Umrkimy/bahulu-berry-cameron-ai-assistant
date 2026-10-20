import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge, Card, Group, Stack, Text } from "@mantine/core";
import { IconEdit, IconEye } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";

import { getCustomers } from "../../api/customers";
import { DataTable } from "../common/DataTable";
import RowActions, { type RowAction } from "../common/DataTable/RowActions";
import { useOrders } from "../../hooks/useOrders";
import type { Order } from "../../types/order";
import OrderDetailsModal from "./OrderDetailsModal";
import EditOrderModal from "./EditOrderModal";
import { formatCode, formatDate } from "../../utils/format";

function getOrderStatusColor(status: string) {
  if (status === "COMPLETED") return "green";
  if (status === "CANCELLED") return "red";
  if (status === "SHIPPED") return "blue";
  if (status === "PROCESSING") return "violet";
  return "yellow";
}

function getPaymentStatusColor(status: string) {
  if (status === "PAID") return "green";
  if (status === "FAILED") return "red";
  if (status === "REFUNDED") return "violet";
  return "yellow";
}

function formatOrderDate(value: string) {
  return formatDate(value);
}

export default function OrdersTable() {
  const { data: orders, isLoading: isLoadingOrders, isError: ordersError, refetch: refetchOrders } = useOrders();
  const { data: customers, isLoading: isLoadingCustomers, isError: customersError, refetch: refetchCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewOpened, setViewOpened] = useState(false);
  const [editOpened, setEditOpened] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const routedOrder = orders?.find((item) => item.id === (location.state as { openOrderId?: number } | null)?.openOrderId) ?? null;
  const activeOrder = selectedOrder ?? routedOrder;

  const customerNames = useMemo(
    () => new Map(customers?.map((customer) => [customer.id, customer.full_name]) ?? []),
    [customers],
  );

  const orderActions = useCallback((order: Order): RowAction[] => [
    { label: "View order", icon: <IconEye size={16} />, onClick: () => { setSelectedOrder(order); setViewOpened(true); } },
    { label: "Edit order", icon: <IconEdit size={16} />, onClick: () => { setSelectedOrder(order); setEditOpened(true); } },
  ], []);

  const columns = useMemo<ColumnDef<Order, unknown>[]>(
    () => [
      {
        id: "order",
        accessorKey: "id",
        header: "Order",
        cell: ({ row }) => <Text fw={600}>#{row.original.id}</Text>,
      },
      {
        id: "customer",
        accessorFn: (row) => customerNames.get(row.customer_id) ?? `Customer #${row.customer_id}`,
        header: "Customer",
        cell: ({ row }) => <Text>{customerNames.get(row.original.customer_id) ?? `Customer #${row.original.customer_id}`}</Text>,
      },
      {
        id: "total",
        meta: { align: "right" },
        accessorFn: (row) => Number(row.total_amount),
        header: "Total",
        cell: ({ row }) => <Text fw={600}>RM {Number(row.original.total_amount).toFixed(2)}</Text>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Badge variant="light" color={getOrderStatusColor(row.original.status)}>{formatCode(row.original.status)}</Badge>,
      },
      {
        id: "payment",
        accessorKey: "payment_status",
        header: "Payment",
        cell: ({ row }) => <Badge variant="light" color={getPaymentStatusColor(row.original.payment_status)}>{formatCode(row.original.payment_status)}</Badge>,
      },
      {
        id: "date",
        accessorKey: "created_at",
        header: "Date",
        cell: ({ row }) => <Text size="sm">{formatOrderDate(row.original.created_at)}</Text>,
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => <RowActions label={`order #${row.original.id}`} actions={orderActions(row.original)} />,
      },
    ],
    [customerNames, orderActions],
  );

  return (
    <>
      <DataTable
        data={orders ?? []}
        columns={columns}
        loading={isLoadingOrders || isLoadingCustomers}
        error={ordersError || customersError}
        errorMessage="We couldn't load orders and customer details."
        onRetry={() => { void refetchOrders(); void refetchCustomers(); }}
        searchPlaceholder="Search orders, customers, statuses..."
        emptyMessage="No orders found."
        onRowClick={(order) => { setSelectedOrder(order); setViewOpened(true); }}
        renderMobileCard={(order) => (
          <Card withBorder radius="md" p="sm"><Stack gap="xs"><Group justify="space-between" align="flex-start"><Stack gap={2}><Text fw={600}>Order #{order.id}</Text><Text size="sm">{customerNames.get(order.customer_id) ?? `Customer #${order.customer_id}`}</Text><Text size="xs" c="dimmed">{formatOrderDate(order.created_at)}</Text></Stack><Text fw={600}>RM {Number(order.total_amount).toFixed(2)}</Text></Group><Group gap="xs"><Badge variant="light" color={getOrderStatusColor(order.status)}>{formatCode(order.status)}</Badge><Badge variant="light" color={getPaymentStatusColor(order.payment_status)}>{formatCode(order.payment_status)}</Badge></Group><Group justify="flex-end"><RowActions label={`order #${order.id}`} actions={orderActions(order)} /></Group></Stack></Card>
        )}
      />
      <OrderDetailsModal opened={viewOpened || routedOrder !== null} order={activeOrder} onClose={() => { setViewOpened(false); setSelectedOrder(null); navigate(location.pathname, { replace: true, state: null }); }} />
      <EditOrderModal opened={editOpened} order={selectedOrder} onClose={() => { setEditOpened(false); setSelectedOrder(null); }} />
    </>
  );
}
