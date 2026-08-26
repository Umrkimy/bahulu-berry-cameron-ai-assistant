import { useMemo } from "react";
import { Badge, Button, Card, Group, Text } from "@mantine/core";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "../common/DataTable";

import { useProducts, useDeleteProduct } from "../../hooks/useProducts";
import type { Product } from "../../types/product";

interface ProductTableProps {
  onEdit: (product: Product) => void;
}

export default function ProductTable({ onEdit }: ProductTableProps) {
  const { data, isLoading } = useProducts();

  const deleteMutation = useDeleteProduct();

  const products = data?.items ?? [];

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
        cell: ({ row }) => (
          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              onClick={() => onEdit(row.original)}
            >
              Edit
            </Button>

            <Button
              size="xs"
              color="red"
              variant="light"
              onClick={() => {
                if (window.confirm(`Delete "${row.original.name}"?`)) {
                  deleteMutation.mutate(row.original.id);
                }
              }}
            >
              Delete
            </Button>
          </Group>
        ),
      },
    ],
    [deleteMutation, onEdit],
  );

  return (
    <Card withBorder radius="md" p="lg">
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
