import { useMemo, useState } from "react";
import { ActionIcon, Badge, Group, Text, Tooltip } from "@mantine/core";
import { IconEdit, IconEye } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";

import { getCustomers } from "../../api/customers";
import { DataTable } from "../common/DataTable";
import { useOrders } from "../../hooks/useOrders";
import type { Order } from "../../types/order";
import OrderDetailsModal from "./OrderDetailsModal";
import EditOrderModal from "./EditOrderModal";

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
  return new Date(value).toLocaleDateString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function OrdersTable() {
  const { data: orders, isLoading: isLoadingOrders } = useOrders();
  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewOpened, setViewOpened] = useState(false);
  const [editOpened, setEditOpened] = useState(false);

  const customerNames = useMemo(
    () => new Map(customers?.map((customer) => [customer.id, customer.full_name]) ?? []),
    [customers],
  );

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
        accessorFn: (row) => Number(row.total_amount),
        header: "Total",
        cell: ({ row }) => <Text fw={600}>RM {Number(row.original.total_amount).toFixed(2)}</Text>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Badge variant="light" color={getOrderStatusColor(row.original.status)}>{row.original.status}</Badge>,
      },
      {
        id: "payment",
        accessorKey: "payment_status",
        header: "Payment",
        cell: ({ row }) => <Badge variant="light" color={getPaymentStatusColor(row.original.payment_status)}>{row.original.payment_status}</Badge>,
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
        cell: ({ row }) => (
          <Group gap="xs">
            <Tooltip label="View order" withArrow>
              <ActionIcon size="lg" variant="light" color="blue" onClick={() => { setSelectedOrder(row.original); setViewOpened(true); }} aria-label="View order">
                <IconEye size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Edit order" withArrow>
              <ActionIcon size="lg" variant="light" color="orange" onClick={() => { setSelectedOrder(row.original); setEditOpened(true); }} aria-label="Edit order">
                <IconEdit size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
    [customerNames],
  );

  return (
    <>
      <DataTable
        data={orders ?? []}
        columns={columns}
        loading={isLoadingOrders || isLoadingCustomers}
        searchPlaceholder="Search orders, customers, statuses..."
        emptyMessage="No orders found."
      />
      <OrderDetailsModal opened={viewOpened} order={selectedOrder} onClose={() => { setViewOpened(false); setSelectedOrder(null); }} />
      <EditOrderModal opened={editOpened} order={selectedOrder} onClose={() => { setEditOpened(false); setSelectedOrder(null); }} />
    </>
  );
}
