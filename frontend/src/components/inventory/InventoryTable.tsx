import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../auth/useAuth";

import { Badge, Card, Group, Stack, Text } from "@mantine/core";

import type { ColumnDef } from "@tanstack/react-table";

import { IconAdjustments, IconChecklist } from "@tabler/icons-react";

import { DataTable } from "../common/DataTable";
import RowActions, { type RowAction } from "../common/DataTable/RowActions";

import { useInventories } from "../../hooks/useInventory";

import type { Inventory } from "../../types/inventory";

import StockAdjustmentModal from "./StockAdjustmentModal";
import { can } from "../../auth/permissions";

export default function InventoryTable({ productId = null }: { productId?: number | null }) {
  const { admin } = useAuth();
  const { data, isLoading, isError, refetch } = useInventories();

  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(
    null,
  );

  const inventories = productId ? (data ?? []).filter((item) => item.product_id === productId) : (data ?? []);
  const location = useLocation();
  const navigate = useNavigate();

  const routedInventory = inventories.find((item) => item.id === (location.state as { openInventoryId?: number } | null)?.openInventoryId) ?? null;

  const inventoryActions = useCallback((inventory: Inventory): RowAction[] => [
    { label: "Adjust stock", icon: <IconAdjustments size={16} />, onClick: () => setSelectedInventory(inventory) },
    { label: "Create task", icon: <IconChecklist size={16} />, hidden: !can(admin, "tasks.manage"), onClick: () => navigate("/tasks", { state: { taskContext: { type: "INVENTORY", id: inventory.id, label: `${inventory.product_name} inventory` } } }) },
  ], [admin, navigate]);

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
        meta: { align: "right" },

        cell: ({ row }) => <Text fw={600}>{row.original.quantity}</Text>,
      },

      {
        id: "threshold",
        accessorKey: "low_stock_threshold",
        header: "Threshold",
        meta: { align: "right" },

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
                  label: "Out of stock",
                  color: "red",
                }
              : quantity <= threshold
                ? {
                    label: "Low stock",
                    color: "orange",
                  }
                : {
                    label: "In stock",
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

        cell: ({ row }) => <RowActions label={row.original.product_name} actions={inventoryActions(row.original)} />,
      },
    ],
    [inventoryActions],
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
          onRowClick={setSelectedInventory}
          renderMobileCard={(inventory) => {
            const status = inventory.quantity === 0 ? { label: "Out of stock", color: "red" } : inventory.quantity <= inventory.low_stock_threshold ? { label: "Low stock", color: "orange" } : { label: "In stock", color: "green" };
            return <Card withBorder radius="md" p="sm"><Group justify="space-between" align="flex-start" wrap="nowrap"><Stack gap={3}><Text fw={600}>{inventory.product_name}</Text><Text size="sm" c="dimmed">{inventory.product_category ?? "Uncategorised"}</Text><Group gap="xs"><Badge color={status.color} variant="light">{status.label}</Badge><Text size="sm">{inventory.quantity} in stock · Threshold {inventory.low_stock_threshold}</Text></Group></Stack><RowActions label={inventory.product_name} actions={inventoryActions(inventory)} /></Group></Card>;
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
