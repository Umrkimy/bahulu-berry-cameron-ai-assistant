import { useMemo, useState } from "react";

import { ActionIcon, Badge, Card, Text, Tooltip } from "@mantine/core";

import type { ColumnDef } from "@tanstack/react-table";

import { IconAdjustments } from "@tabler/icons-react";

import { DataTable } from "../common/DataTable";

import { useInventories } from "../../hooks/useInventory";

import type { Inventory } from "../../types/inventory";

import StockAdjustmentModal from "./StockAdjustmentModal";

export default function InventoryTable() {
  const { data, isLoading } = useInventories();

  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(
    null,
  );

  const inventories = data ?? [];

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
          <Tooltip label="Adjust Stock">
            <ActionIcon
              size="lg"
              variant="light"
              color="blue"
              onClick={() => setSelectedInventory(row.original)}
              aria-label="Adjust stock"
            >
              <IconAdjustments size={20} />
            </ActionIcon>
          </Tooltip>
        ),
      },
    ],
    [],
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
          searchPlaceholder="Search inventory..."
          emptyMessage="No inventory found."
        />
      </Card>

      <StockAdjustmentModal
        opened={selectedInventory !== null}
        inventory={selectedInventory}
        onClose={() => setSelectedInventory(null)}
      />
    </>
  );
}
