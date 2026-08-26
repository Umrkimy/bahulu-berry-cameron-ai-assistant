import { useMemo } from "react";

import { ActionIcon, Badge, Card, Group, Text, Tooltip } from "@mantine/core";

import { modals } from "@mantine/modals";

import { IconEdit, IconTrash } from "@tabler/icons-react";

import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "../common/DataTable";

import { useDeleteProduct, useProducts } from "../../hooks/useProducts";

import type { Product } from "../../types/product";

interface ProductTableProps {
  onEdit: (product: Product) => void;
}

export default function ProductTable({ onEdit }: ProductTableProps) {
  const { data, isLoading, isError } = useProducts();

  const deleteMutation = useDeleteProduct();

  const products = data?.items ?? [];

  function handleDelete(product: Product) {
    modals.openConfirmModal({
      title: `Delete ${product.name}?`,

      children: (
        <Text size="sm">
          Are you sure you want to delete <strong>{product.name}</strong>? This
          will also remove its inventory record. This action cannot be undone.
        </Text>
      ),

      labels: {
        confirm: "Delete Product",
        cancel: "Cancel",
      },

      confirmProps: {
        color: "red",
      },

      closeOnConfirm: false,

      onConfirm: () => {
        deleteMutation.mutate(product.id, {
          onSuccess: () => {
            modals.closeAll();
          },
        });
      },
    });
  }

  const columns = useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Product",

        cell: ({ row }) => <Text fw={600}>{row.original.name}</Text>,
      },

      {
        id: "category",
        accessorKey: "category",
        header: "Category",

        cell: ({ row }) => <Text>{row.original.category ?? "-"}</Text>,
      },

      {
        id: "price",
        accessorKey: "price",
        header: "Price",

        cell: ({ row }) => (
          <Text fw={600}>RM {Number(row.original.price).toFixed(2)}</Text>
        ),
      },

      {
        id: "stock",
        header: "Stock",

        accessorFn: (row) => row.inventory?.quantity ?? 0,

        cell: ({ row }) => <Text>{row.original.inventory?.quantity ?? 0}</Text>,
      },

      {
        id: "status",
        accessorKey: "is_active",
        header: "Status",

        cell: ({ row }) => (
          <Badge
            color={row.original.is_active ? "green" : "red"}
            variant="light"
          >
            {row.original.is_active ? "ACTIVE" : "INACTIVE"}
          </Badge>
        ),
      },

      {
        id: "actions",
        header: "Actions",
        enableSorting: false,

        cell: ({ row }) => (
          <Group gap="xs">
            {/* EDIT */}
            <Tooltip label="Edit product" withArrow>
              <ActionIcon
                size="lg"
                variant="light"
                color="orange"
                onClick={() => onEdit(row.original)}
                aria-label="Edit product"
              >
                <IconEdit size={20} />
              </ActionIcon>
            </Tooltip>

            {/* DELETE */}
            <Tooltip label="Delete product" withArrow>
              <ActionIcon
                size="lg"
                variant="light"
                color="red"
                onClick={() => handleDelete(row.original)}
                loading={deleteMutation.isPending}
                aria-label="Delete product"
              >
                <IconTrash size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
    [deleteMutation.isPending, onEdit],
  );

  if (isError) {
    return (
      <Text c="red" p="lg">
        Failed to load products.
      </Text>
    );
  }

  return (
    <Card
      withBorder
      radius="md"
      p={0}
      style={{
        overflow: "hidden",
      }}
    >
      <DataTable
        data={products}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Search products..."
        emptyMessage="No products found."
      />
    </Card>
  );
}
