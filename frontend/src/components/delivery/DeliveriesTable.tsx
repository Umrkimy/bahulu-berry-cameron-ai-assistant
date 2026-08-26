import { useMemo } from "react";
import { Badge, Button, Text } from "@mantine/core";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "../common/DataTable";

import type { Delivery, DeliveryStatus } from "../../types/delivery";

interface Props {
  deliveries: Delivery[];
  isLoading: boolean;
  isError: boolean;
  onSelectDelivery: (delivery: Delivery) => void;
}

function getStatusColor(status: DeliveryStatus) {
  switch (status) {
    case "DELIVERED":
      return "green";

    case "OUT_FOR_DELIVERY":
      return "blue";

    case "IN_TRANSIT":
      return "violet";

    case "SHIPPED":
      return "cyan";

    case "FAILED":
      return "red";

    case "PENDING":
    default:
      return "yellow";
  }
}

function formatStatus(status: DeliveryStatus) {
  return status.replaceAll("_", " ");
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DeliveriesTable({
  deliveries,
  isLoading,
  isError,
  onSelectDelivery,
}: Props) {
  const columns = useMemo<ColumnDef<Delivery, unknown>[]>(
    () => [
      {
        id: "order",
        accessorKey: "order_id",
        header: "Order",
        cell: ({ row }) => <Text fw={600}>#{row.original.order_id}</Text>,
      },

      {
        id: "recipient",
        accessorKey: "recipient_name",
        header: "Recipient",
        cell: ({ row }) => (
          <div>
            <Text fw={500}>{row.original.recipient_name ?? "—"}</Text>

            {row.original.recipient_phone && (
              <Text size="xs" c="dimmed">
                {row.original.recipient_phone}
              </Text>
            )}
          </div>
        ),
      },

      {
        id: "courier",
        accessorKey: "courier",
        header: "Courier",
        cell: ({ row }) => <Text>{row.original.courier ?? "—"}</Text>,
      },

      {
        id: "tracking",
        accessorKey: "tracking_number",
        header: "Tracking",
        cell: ({ row }) => (
          <Text
            size="sm"
            style={{
              maxWidth: 180,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row.original.tracking_number ?? "—"}
          </Text>
        ),
      },

      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge color={getStatusColor(row.original.status)} variant="light">
            {formatStatus(row.original.status)}
          </Badge>
        ),
      },

      {
        id: "updated",
        accessorKey: "updated_at",
        header: "Updated",
        cell: ({ row }) => (
          <Text size="sm">{formatDate(row.original.updated_at)}</Text>
        ),
      },

      {
        id: "action",
        header: "Action",
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            size="xs"
            variant="light"
            onClick={(event) => {
              event.stopPropagation();
              onSelectDelivery(row.original);
            }}
          >
            View
          </Button>
        ),
      },
    ],
    [onSelectDelivery],
  );

  if (isError) {
    return (
      <Text c="red" p="lg">
        Failed to load deliveries.
      </Text>
    );
  }

  return (
    <DataTable
      data={deliveries}
      columns={columns}
      loading={isLoading}
      searchPlaceholder="Search deliveries..."
      emptyMessage="No deliveries found."
    />
  );
}
