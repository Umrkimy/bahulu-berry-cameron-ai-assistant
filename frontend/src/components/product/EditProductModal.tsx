import { Anchor, Divider, NumberInput, Stack, Switch, Text, TextInput, Textarea } from "@mantine/core";

import { notifications } from "@mantine/notifications";

import { useEffect } from "react";

import { useForm } from "@mantine/form";

import { FormModal } from "../common/DataTable";

import { useUpdateProduct } from "../../hooks/useProducts";
import { getApiError } from "../../api/errors";

import type { Product } from "../../types/product";

interface EditProductModalProps {
  opened: boolean;
  onClose: () => void;
  product: Product | null;
}

export default function EditProductModal({
  opened,
  onClose,
  product,
}: EditProductModalProps) {
  const updateMutation = useUpdateProduct();

  const form = useForm({
    initialValues: {
      name: "",
      description: "",
      price: 0,
      category: "",
      is_active: true,
      storefront_published: false,
      storefront_name_en: "",
      storefront_name_ms: "",
      storefront_description_en: "",
      storefront_description_ms: "",
    },

    validate: {
      name: (value) =>
        value.trim().length < 1 ? "Product name is required" : null,

      price: (value) => (value <= 0 ? "Price must be greater than 0" : null),
    },
  });

  useEffect(() => {
    if (!product) {
      return;
    }

    form.setValues({
      name: product.name,
      description: product.description ?? "",
      price: Number(product.price),
      category: product.category ?? "",
      is_active: product.is_active,
      storefront_published: product.storefront_published,
      storefront_name_en: product.storefront_name_en ?? "",
      storefront_name_ms: product.storefront_name_ms ?? "",
      storefront_description_en: product.storefront_description_en ?? "",
      storefront_description_ms: product.storefront_description_ms ?? "",
    });
  }, [form, product]);

  function handleSubmit(values: typeof form.values) {
    if (!product) {
      return;
    }

    const hasChanges =
      values.name.trim() !== product.name ||
      values.description !== (product.description ?? "") ||
      values.price !== Number(product.price) ||
      values.category !== (product.category ?? "") ||
      values.is_active !== product.is_active;

    const storefrontChanged =
      values.storefront_published !== product.storefront_published ||
      values.storefront_name_en.trim() !== (product.storefront_name_en ?? "") ||
      values.storefront_name_ms.trim() !== (product.storefront_name_ms ?? "") ||
      values.storefront_description_en.trim() !== (product.storefront_description_en ?? "") ||
      values.storefront_description_ms.trim() !== (product.storefront_description_ms ?? "");

    if (!hasChanges && !storefrontChanged) {
      notifications.show({
        title: "No Changes",
        message: "No product information has been changed.",
        color: "blue",
      });

      return;
    }

    updateMutation.mutate(
      {
        productId: product.id,

        data: {
          name: values.name.trim(),
          description: values.description.trim(),
          price: values.price,
          category: values.category.trim(),
          is_active: values.is_active,
          storefront_published: values.storefront_published,
          storefront_name_en: values.storefront_name_en.trim(),
          storefront_name_ms: values.storefront_name_ms.trim(),
          storefront_description_en: values.storefront_description_en.trim(),
          storefront_description_ms: values.storefront_description_ms.trim(),
        },
      },
      {
        onSuccess: () => {
          notifications.show({
            title: "Product Updated",
            message: "Product was updated successfully.",
            color: "green",
          });

          form.reset();

          onClose();
        },

        onError: (error) => {
          const apiError = getApiError(error);
          form.setErrors(apiError.fieldErrors);
          notifications.show({
            title: "Update Failed",
            message: apiError.message,
            color: "red",
          });
        },
      },
    );
  }

  function handleClose() {
    if (updateMutation.isPending) {
      return;
    }

    form.reset();

    onClose();
  }

  return (
    <FormModal
      opened={opened}
      onClose={handleClose}
      title="Edit Product"
      description="Update the product information and availability."
      submitLabel="Save Changes"
      loading={updateMutation.isPending}
      isDirty={form.isDirty()}
      onSubmit={() => form.onSubmit(handleSubmit)()}
    >
      <Stack gap="md">
        <TextInput
          label="Product Name"
          placeholder="Enter product name"
          withAsterisk
          disabled={updateMutation.isPending}
          {...form.getInputProps("name")}
        />

        <Textarea
          label="Description"
          placeholder="Enter product description"
          autosize
          minRows={3}
          disabled={updateMutation.isPending}
          {...form.getInputProps("description")}
        />

        <TextInput
          label="Category"
          placeholder="Bahulu"
          disabled={updateMutation.isPending}
          {...form.getInputProps("category")}
        />

        <NumberInput
          label="Price"
          placeholder="15.00"
          prefix="RM "
          min={0}
          decimalScale={2}
          fixedDecimalScale
          withAsterisk
          disabled={updateMutation.isPending}
          {...form.getInputProps("price")}
        />

        <Switch
          label="Active Product"
          description={
            form.values.is_active
              ? "Product is available to customers"
              : "Product is hidden from customers"
          }
          checked={form.values.is_active}
          disabled={updateMutation.isPending}
          onChange={(event) =>
            form.setFieldValue("is_active", event.currentTarget.checked)
          }
        />

        <Divider label="Customer storefront" labelPosition="center" />
        <Text size="sm" c="dimmed">
          Publish only content that the business has approved in both languages.
        </Text>
        <TextInput
          label="Storefront name — English"
          placeholder="Approved English product name"
          disabled={updateMutation.isPending}
          {...form.getInputProps("storefront_name_en")}
        />
        <TextInput
          label="Storefront name — Bahasa Melayu"
          placeholder="Approved Bahasa Melayu product name"
          disabled={updateMutation.isPending}
          {...form.getInputProps("storefront_name_ms")}
        />
        <Textarea
          label="Storefront description — English"
          placeholder="Optional approved English description"
          autosize
          minRows={2}
          disabled={updateMutation.isPending}
          {...form.getInputProps("storefront_description_en")}
        />
        <Textarea
          label="Storefront description — Bahasa Melayu"
          placeholder="Optional approved Bahasa Melayu description"
          autosize
          minRows={2}
          disabled={updateMutation.isPending}
          {...form.getInputProps("storefront_description_ms")}
        />
        <Switch
          label="Publish on storefront"
          description="Only active products with approved bilingual names can be published."
          checked={form.values.storefront_published}
          disabled={updateMutation.isPending}
          onChange={(event) => form.setFieldValue("storefront_published", event.currentTarget.checked)}
        />
        {product && product.storefront_published ? <Anchor href={`${import.meta.env.VITE_STOREFRONT_BASE_URL ?? "http://localhost:3000"}/products/${product.id}`} target="_blank" rel="noreferrer" size="sm">Preview published product ↗</Anchor> : null}
      </Stack>
    </FormModal>
  );
}
