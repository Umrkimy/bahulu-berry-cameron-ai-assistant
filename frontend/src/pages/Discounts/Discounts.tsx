import { useEffect, useMemo, useState } from "react";
import { ActionIcon, Badge, Button, Group, Modal, NumberInput, Select, Stack, Switch, Text, TextInput, Tooltip } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useSearchParams } from "react-router-dom";

import { DataTable } from "../../components/common/DataTable";
import PageHeader from "../../components/common/PageHeader";
import { useProducts } from "../../hooks/useProducts";
import { useCreateDiscount, useDeleteDiscount, useDiscounts, useUpdateDiscount } from "../../hooks/useDiscounts";
import type { Discount, DiscountInput, DiscountType } from "../../types/discount";
import useAuth from "../../auth/useAuth";
import { getApiError } from "../../api/errors";

interface DiscountFormValues {
  product_id: string;
  name: string;
  discount_type: DiscountType;
  discount_value: number;
  bundle_quantity: number | "";
  stack_with_bundle: boolean;
  start_at: string;
  end_at: string;
  is_active: boolean;
}

const initialValues: DiscountFormValues = {
  product_id: "", name: "", discount_type: "PERCENTAGE", discount_value: 10,
  bundle_quantity: 3, stack_with_bundle: false, start_at: "", end_at: "", is_active: true,
};

function toMalaysiaDateTime(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function malaysiaDateTimeToIso(value: string) {
  return new Date(`${value}:00+08:00`).toISOString();
}

function getStatus(discount: Discount) {
  const now = new Date();
  if (!discount.is_active) return { label: "INACTIVE", color: "gray" };
  if (new Date(discount.end_at) <= now) return { label: "EXPIRED", color: "red" };
  if (new Date(discount.start_at) > now) return { label: "SCHEDULED", color: "blue" };
  return { label: "ACTIVE", color: "green" };
}

function getPromotionLabel(discount: Discount) {
  if (discount.discount_type === "PERCENTAGE") return `${Number(discount.discount_value)}% OFF`;
  if (discount.discount_type === "FIXED_AMOUNT") return `RM ${Number(discount.discount_value).toFixed(2)} OFF`;
  return `BUY ${discount.bundle_quantity} FOR RM ${Number(discount.discount_value).toFixed(2)}`;
}

function formatSchedule(value: string) {
  return new Date(value).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Discounts() {
  const { admin } = useAuth();
  const isOwner = admin?.role === "OWNER";
  const { data: discounts, isLoading } = useDiscounts();
  const { data: productsData } = useProducts();
  const createMutation = useCreateDiscount();
  const updateMutation = useUpdateDiscount();
  const deleteMutation = useDeleteDiscount();
  const [opened, setOpened] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const productNames = useMemo(() => new Map(productsData?.items.map((product) => [product.id, product.name]) ?? []), [productsData]);

  const form = useForm<DiscountFormValues>({
    initialValues,
    validate: {
      product_id: (value) => (!value ? "Select a product" : null),
      name: (value) => (!value.trim() ? "Enter a promotion name" : null),
      start_at: (value) => (!value ? "Select a start time" : null),
      end_at: (value, values) => !value ? "Select an end time" : new Date(value) <= new Date(values.start_at) ? "End time must be after start time" : null,
      discount_value: (value, values) => !value || value <= 0 ? "Enter a value greater than zero" : values.discount_type === "PERCENTAGE" && value > 100 ? "Percentage cannot exceed 100" : null,
      bundle_quantity: (value, values) => values.discount_type === "BUNDLE_PRICE" && (!value || value < 2) ? "Bundle quantity must be at least 2" : null,
    },
  });

  function openCreate() {
    setEditingDiscount(null);
    form.setValues(initialValues);
    form.resetDirty(initialValues);
    setOpened(true);
  }

  useEffect(() => {
    if (isOwner && searchParams.get("create") === "1") {
      openCreate();
      setSearchParams({}, { replace: true });
    }
  }, [isOwner, searchParams, setSearchParams]);

  function openEdit(discount: Discount) {
    setEditingDiscount(discount);
    form.setValues({
      product_id: String(discount.product_id), name: discount.name, discount_type: discount.discount_type,
      discount_value: Number(discount.discount_value), bundle_quantity: discount.bundle_quantity ?? 3,
      stack_with_bundle: discount.stack_with_bundle, start_at: toMalaysiaDateTime(discount.start_at),
      end_at: toMalaysiaDateTime(discount.end_at), is_active: discount.is_active,
    });
    setOpened(true);
  }

  async function submit(values: DiscountFormValues) {
    const payload: DiscountInput = {
      product_id: Number(values.product_id), name: values.name.trim(), discount_type: values.discount_type,
      discount_value: values.discount_value, bundle_quantity: values.discount_type === "BUNDLE_PRICE" ? Number(values.bundle_quantity) : null,
      stack_with_bundle: values.discount_type === "PERCENTAGE" && values.stack_with_bundle,
      start_at: malaysiaDateTimeToIso(values.start_at), end_at: malaysiaDateTimeToIso(values.end_at), is_active: values.is_active,
    };
    try {
      if (editingDiscount) await updateMutation.mutateAsync({ discountId: editingDiscount.id, data: payload });
      else await createMutation.mutateAsync(payload);
      notifications.show({ title: editingDiscount ? "Promotion updated" : "Promotion created", message: "The product promotion has been saved.", color: "green" });
      setOpened(false);
    } catch (error) {
      const apiError = getApiError(error);
      form.setErrors(apiError.fieldErrors);
      notifications.show({ title: "Unable to save promotion", message: apiError.message, color: "red" });
    }
  }

  async function deleteDiscount(discount: Discount) {
    try {
      await deleteMutation.mutateAsync(discount.id);
      notifications.show({ title: "Promotion deleted", message: discount.name, color: "green" });
    } catch (error) {
      notifications.show({ title: "Unable to delete promotion", message: getApiError(error).message, color: "red" });
    }
  }

  function removeDiscount(discount: Discount) {
    modals.openConfirmModal({
      title: "Delete promotion?",
      children: <Text size="sm">Delete {discount.name}? Historical orders keep their pricing snapshot.</Text>,
      labels: { confirm: "Delete", cancel: "Keep promotion" },
      confirmProps: { color: "red" },
      onConfirm: () => { void deleteDiscount(discount); },
    });
  }

  const columns = useMemo<ColumnDef<Discount, unknown>[]>(
    () => [
      { id: "promotion", accessorKey: "name", header: "Promotion", cell: ({ row }) => <Text fw={600}>{row.original.name}</Text> },
      { id: "product", accessorFn: (row) => productNames.get(row.product_id) ?? `Product #${row.product_id}`, header: "Product", cell: ({ row }) => <Text>{productNames.get(row.original.product_id) ?? `Product #${row.original.product_id}`}</Text> },
      { id: "value", accessorFn: getPromotionLabel, header: "Value", cell: ({ row }) => <Text>{getPromotionLabel(row.original)}</Text> },
      { id: "start", accessorKey: "start_at", header: "Starts", cell: ({ row }) => <Text size="sm">{formatSchedule(row.original.start_at)}</Text> },
      { id: "end", accessorKey: "end_at", header: "Ends", cell: ({ row }) => <Text size="sm">{formatSchedule(row.original.end_at)}</Text> },
      { id: "status", accessorFn: (row) => getStatus(row).label, header: "Status", cell: ({ row }) => { const status = getStatus(row.original); return <Badge color={status.color} variant="light">{status.label}</Badge>; } },
      { id: "actions", header: "Actions", enableSorting: false, cell: ({ row }) => isOwner ? <Group gap="xs"><Tooltip label="Edit promotion"><ActionIcon variant="light" color="orange" onClick={() => openEdit(row.original)} aria-label="Edit promotion"><IconEdit size={18} /></ActionIcon></Tooltip><Tooltip label="Delete promotion"><ActionIcon variant="light" color="red" loading={deleteMutation.isPending} onClick={() => removeDiscount(row.original)} aria-label="Delete promotion"><IconTrash size={18} /></ActionIcon></Tooltip></Group> : <Text c="dimmed">-</Text> },
    ],
    [deleteMutation.isPending, isOwner, productNames],
  );

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <PageHeader
        title="Discounts"
        description="Schedule product promotions and sale prices."
        action={isOwner ? <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>Create Discount</Button> : undefined}
      />
      <DataTable data={discounts ?? []} columns={columns} loading={isLoading} searchPlaceholder="Search promotions, products, statuses..." emptyMessage="No promotions created yet." />
      <Modal opened={isOwner && opened} onClose={() => setOpened(false)} title={editingDiscount ? "Edit Promotion" : "Create Promotion"} centered>
        <form onSubmit={form.onSubmit(submit)}><Stack>
          <Select label="Product" searchable data={productsData?.items.map((product) => ({ value: String(product.id), label: product.name })) ?? []} {...form.getInputProps("product_id")} />
          <TextInput label="Promotion Name" {...form.getInputProps("name")} />
          <Group grow><Select label="Discount Type" data={[{ value: "PERCENTAGE", label: "Percentage off" }, { value: "FIXED_AMOUNT", label: "Fixed amount off" }, { value: "BUNDLE_PRICE", label: "Buy X for RM Y" }]} {...form.getInputProps("discount_type")} /><NumberInput label={form.values.discount_type === "PERCENTAGE" ? "Percentage" : form.values.discount_type === "BUNDLE_PRICE" ? "Bundle price (RM)" : "Amount off (RM)"} min={0.01} max={form.values.discount_type === "PERCENTAGE" ? 100 : undefined} decimalScale={2} {...form.getInputProps("discount_value")} /></Group>
          {form.values.discount_type === "BUNDLE_PRICE" && <NumberInput label="Bundle quantity" description="For example, buy 3 items for the bundle price." min={2} value={form.values.bundle_quantity} onChange={(value) => form.setFieldValue("bundle_quantity", typeof value === "number" ? value : "")} error={form.errors.bundle_quantity} />}
          {form.values.discount_type === "PERCENTAGE" && <Switch label="Apply this percentage after a bundle price" description="Off by default: Buy 3 for RM25 stays RM25." {...form.getInputProps("stack_with_bundle", { type: "checkbox" })} />}
          <TextInput label="Start (Malaysia time)" type="datetime-local" {...form.getInputProps("start_at")} />
          <TextInput label="End (Malaysia time)" type="datetime-local" {...form.getInputProps("end_at")} />
          <Switch label="Promotion is active" {...form.getInputProps("is_active", { type: "checkbox" })} />
          <Group justify="flex-end"><Button variant="default" onClick={() => setOpened(false)}>Cancel</Button><Button type="submit" loading={saving}>{editingDiscount ? "Save Changes" : "Create Promotion"}</Button></Group>
        </Stack></form>
      </Modal>
    </>
  );
}
