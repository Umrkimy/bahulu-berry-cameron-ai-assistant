import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../auth/useAuth";

import { ActionIcon, Badge, Card, Group, Stack, Text, Tooltip } from "@mantine/core";

import type { ColumnDef } from "@tanstack/react-table";

import { IconAdjustments, IconChecklist } from "@tabler/icons-react";

import { DataTable } from "../common/DataTable";

import { useInventories } from "../../hooks/useInventory";

import type { Inventory } from "../../types/inventory";

import StockAdjustmentModal from "./StockAdjustmentModal";

export default function InventoryTable() {
  const { admin } = useAuth();
  const { data, isLoading, isError, refetch } = useInventories();

  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(
    null,
  );

  const inventories = data ?? [];
  const location = useLocation();
  const navigate = useNavigate();

  const routedInventory = inventories.find((item) => item.id === (location.state as { openInventoryId?: number } | null)?.openInventoryId) ?? null;

  const columns = useMemo<ColumnDef<Inventory, unknown>[]>(
    () => [
      {
        id: "product",
        accessorKey: "product_name",
        header: "Product",

        cell: ({ row }) => <Text fw={600}>{row.original.product_name}</Text>,
      },

      {
        id: "category",
        accessorKey: "product_category",
        header: "Category",

        cell: ({ row }) => <Text>{row.original.product_category ?? "-"}</Text>,
      },

      {
        id: "quantity",
        accessorKey: "quantity",
        header: "Quantity",

        cell: ({ row }) => <Text fw={600}>{row.original.quantity}</Text>,
      },

      {
        id: "threshold",
        accessorKey: "low_stock_threshold",
        header: "Threshold",

        cell: ({ row }) => <Text>{row.original.low_stock_threshold}</Text>,
      },

      {
        id: "status",

        accessorFn: (row) => {
          if (row.quantity === 0) {
            return "OUT";
          }

          if (row.quantity <= row.low_stock_threshold) {
            return "LOW";
          }

          return "GOOD";
        },

        header: "Status",

        cell: ({ row }) => {
          const quantity = row.original.quantity;
          const threshold = row.original.low_stock_threshold;

          const status =
            quantity === 0
              ? {
                  label: "OUT",
                  color: "red",
                }
              : quantity <= threshold
                ? {
                    label: "LOW",
                    color: "orange",
                  }
                : {
                    label: "GOOD",
                    color: "green",
                  };

          return (
            <Badge color={status.color} variant="light">
              {status.label}
            </Badge>
          );
        },
      },

      {
        id: "actions",
        header: "Actions",
        enableSorting: false,

        cell: ({ row }) => (
          <Group gap="xs"><Tooltip label="Adjust Stock"><ActionIcon
              size="lg"
              variant="light"
              color="blue"
              onClick={() => setSelectedInventory(row.original)}
              aria-label="Adjust stock"
            >
              <IconAdjustments size={20} />
            </ActionIcon></Tooltip>{admin?.role === "OWNER" && <Tooltip label="Create task"><ActionIcon size="lg" variant="light" color="grape" onClick={() => navigate("/tasks", { state: { taskContext: { type: "INVENTORY", id: row.original.id, label: `${row.original.product_name} inventory` } } })} aria-label="Create inventory task"><IconChecklist size={18} /></ActionIcon></Tooltip>}</Group>
        ),
      },
    ],
    [admin?.role, navigate],
  );

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
          data={inventories}
          columns={columns}
          loading={isLoading}
          error={isError}
          errorMessage="We couldn't load inventory."
          onRetry={() => void refetch()}
          searchPlaceholder="Search inventory..."
          emptyMessage="No inventory found."
          renderMobileCard={(inventory) => {
            const status = inventory.quantity === 0 ? { label: "OUT", color: "red" } : inventory.quantity <= inventory.low_stock_threshold ? { label: "LOW", color: "orange" } : { label: "GOOD", color: "green" };
            return <Card withBorder radius="md" p="sm"><Group justify="space-between" align="flex-start" wrap="nowrap"><Stack gap={3}><Text fw={700}>{inventory.product_name}</Text><Text size="sm" c="dimmed">{inventory.product_category ?? "Uncategorised"}</Text><Group gap="xs"><Badge color={status.color} variant="light">{status.label}</Badge><Text size="sm">{inventory.quantity} in stock · Threshold {inventory.low_stock_threshold}</Text></Group></Stack><ActionIcon size="lg" variant="light" color="blue" onClick={() => setSelectedInventory(inventory)} aria-label="Adjust stock"><IconAdjustments size={20} /></ActionIcon></Group></Card>;
          }}
        />
      </Card>

      <StockAdjustmentModal
        opened={selectedInventory !== null || routedInventory !== null}
        inventory={selectedInventory ?? routedInventory}
        onClose={() => { setSelectedInventory(null); navigate(location.pathname, { replace: true, state: null }); }}
      />
    </>
  );
}
