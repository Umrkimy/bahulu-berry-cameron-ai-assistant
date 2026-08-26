import { useMemo, useState } from "react";
import { ActionIcon, Badge, Card, Group, Text, Tooltip } from "@mantine/core";
import { IconEdit, IconEye } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "../common/DataTable";

import { useDeliveries } from "../../hooks/useDeliveries";

import type { Delivery, DeliveryStatus } from "../../types/delivery";

import DeliveryDetailsModal from "./DeliveryDetailsModal";
import EditDeliveryModal from "./EditDeliveryModal";

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

export default function DeliveriesTable() {
  const { data, isLoading, isError } = useDeliveries();

  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null,
  );

  const [viewOpened, setViewOpened] = useState(false);

  const [editOpened, setEditOpened] = useState(false);

  const deliveries = data ?? [];

  function handleView(delivery: Delivery) {
    setSelectedDelivery(delivery);
    setViewOpened(true);
  }

  function handleEdit(delivery: Delivery) {
    setSelectedDelivery(delivery);
    setEditOpened(true);
  }

  function handleCloseView() {
    setViewOpened(false);
    setSelectedDelivery(null);
  }

  function handleCloseEdit() {
    setEditOpened(false);
    setSelectedDelivery(null);
  }

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
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <Group gap="xs">
            <Tooltip label="View delivery" withArrow>
              <ActionIcon
                size="lg"
                variant="light"
                color="blue"
                onClick={() => handleView(row.original)}
                aria-label="View delivery"
              >
                <IconEye size={20} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Edit delivery" withArrow>
              <ActionIcon
                size="lg"
                variant="light"
                color="orange"
                onClick={() => handleEdit(row.original)}
                aria-label="Edit delivery"
              >
                <IconEdit size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
    [],
  );

  if (isError) {
    return <Text c="red">Failed to load deliveries.</Text>;
  }

  return (
    <>
      <Card
        withBorder
        radius="md"
        p={0}
        style={{
          overflow: "hidden",
        }}
      >
        <DataTable
          data={deliveries}
          columns={columns}
          loading={isLoading}
          searchPlaceholder="Search deliveries..."
          emptyMessage="No deliveries found."
        />
      </Card>

      {/* VIEW DELIVERY */}
      <DeliveryDetailsModal
        opened={viewOpened}
        delivery={selectedDelivery}
        onClose={handleCloseView}
      />

      {/* EDIT DELIVERY */}
      <EditDeliveryModal
        opened={editOpened}
        delivery={selectedDelivery}
        onClose={handleCloseEdit}
      />
    </>
  );
}
