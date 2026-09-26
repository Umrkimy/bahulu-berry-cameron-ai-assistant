import { useCallback, useMemo } from "react";

import { ActionIcon, Anchor, Badge, Card, Group, Stack, Text, Tooltip } from "@mantine/core";

import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";

import { IconEdit, IconTrash } from "@tabler/icons-react";

import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";

import { DataTable } from "../common/DataTable";

import { useDeleteProduct, useProducts } from "../../hooks/useProducts";

import type { Product } from "../../types/product";
import useAuth from "../../auth/useAuth";
import { getApiError } from "../../api/errors";

interface ProductTableProps {
  onEdit: (product: Product) => void;
}

export default function ProductTable({ onEdit }: ProductTableProps) {
  const { admin } = useAuth();
  const isOwner = admin?.role === "OWNER";
  const { data, isLoading, isError } = useProducts();

  const deleteMutation = useDeleteProduct();

  const products = data?.items ?? [];

  const handleDelete = useCallback((product: Product) => {
    modals.openConfirmModal({
      title: `Delete ${product.name}?`,

      children: (
        <Text size="sm">
          Are you sure you want to delete <strong>{product.name}</strong>? This
          will also remove its inventory record. Products with order or stock
          history are retained; mark those inactive instead.
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
          onError: (error) => {
            notifications.show({
              title: "Unable to delete product",
              message: getApiError(error).message,
              color: "red",
            });
          },
        });
      },
    });
  }, [deleteMutation]);

  const columns = useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Product",

        cell: ({ row }) => <Anchor component={Link} to={`/products/${row.original.id}`} fw={600}>{row.original.name}</Anchor>,
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
          <>
            {getPriceDiscount(row.original) ? (
              <>
                <Text fw={700} c="red">
                  RM {getSalePrice(row.original).toFixed(2)}
                </Text>

                <Text size="xs" c="dimmed" td="line-through">
                  RM {Number(row.original.price).toFixed(2)}
                </Text>
              </>
            ) : (
              <Text fw={600}>RM {Number(row.original.price).toFixed(2)}</Text>
            )}
          </>
        ),
      },

      {
        id: "promotion",
        header: "Promotion",

        cell: ({ row }) => {
          const discounts = row.original.active_discounts ?? [];

          if (!discounts.length) {
            return <Text c="dimmed">-</Text>;
          }

          return (
            <Group gap={4}>
              {discounts.map((discount) => (
                <Badge key={discount.id} color="red" variant="light">
                  {getPromotionLabel(discount)}
                </Badge>
              ))}
            </Group>
          );
        },
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
        id: "storefront",
        header: "Storefront",
        enableSorting: false,
        cell: ({ row }) => (
          <Badge color={row.original.storefront_published ? "bahulu" : "gray"} variant="light">
            {row.original.storefront_published ? "PUBLISHED" : "DRAFT"}
          </Badge>
        ),
      },

      {
        id: "actions",
        header: "Actions",
        enableSorting: false,

        cell: ({ row }) => isOwner ? (
          <Group gap="xs">
            {/* EDIT */}
            <Tooltip label="Open product workspace" withArrow>
              <ActionIcon
                size="lg"
                variant="light"
                color="orange"
                onClick={() => onEdit(row.original)}
                aria-label="Open product workspace"
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
        ) : <Text c="dimmed">-</Text>,
      },
    ],
    [deleteMutation.isPending, handleDelete, isOwner, onEdit],
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
        renderMobileCard={(product) => (
          <Card withBorder radius="md" p="sm"><Group justify="space-between" align="flex-start" wrap="nowrap"><Stack gap={3}><Anchor component={Link} to={`/products/${product.id}`} fw={700}>{product.name}</Anchor><Text size="sm" c="dimmed">{product.category ?? "Uncategorised"}</Text><Group gap="xs"><Badge color={product.is_active ? "green" : "red"} variant="light">{product.is_active ? "ACTIVE" : "INACTIVE"}</Badge><Badge color={product.storefront_published ? "bahulu" : "gray"} variant="light">{product.storefront_published ? "PUBLISHED" : "DRAFT"}</Badge><Text size="sm">{product.inventory?.quantity ?? 0} in stock</Text></Group><Text fw={700} c={getPriceDiscount(product) ? "red" : undefined}>RM {getSalePrice(product).toFixed(2)}</Text></Stack>{isOwner ? <Group gap="xs"><ActionIcon variant="light" color="orange" onClick={() => onEdit(product)} aria-label="Open product workspace"><IconEdit size={18} /></ActionIcon><ActionIcon variant="light" color="red" onClick={() => handleDelete(product)} aria-label="Delete product"><IconTrash size={18} /></ActionIcon></Group> : null}</Group></Card>
        )}
      />
    </Card>
  );
}

function getSalePrice(product: Product) {
  return Number(product.sale_price ?? product.price);
}

function getPriceDiscount(product: Product) {
  return product.sale_price != null;
}

function getPromotionLabel(discount: NonNullable<Product["active_discount"]>) {
  if (discount.discount_type === "PERCENTAGE") {
    return `${Number(discount.discount_value)}% OFF`;
  }

  if (discount.discount_type === "FIXED_AMOUNT") {
    return `RM ${Number(discount.discount_value).toFixed(2)} OFF`;
  }

  return `BUY ${discount.bundle_quantity} FOR RM ${Number(discount.discount_value).toFixed(2)}`;
}
