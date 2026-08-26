import { NumberInput, Stack, Switch, TextInput, Textarea } from "@mantine/core";

import { notifications } from "@mantine/notifications";

import { useEffect } from "react";

import { useForm } from "@mantine/form";

import { FormModal } from "../common/DataTable";

import { useUpdateProduct } from "../../hooks/useProducts";

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
    });
  }, [product]);

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

    if (!hasChanges) {
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

        onError: () => {
          notifications.show({
            title: "Update Failed",
            message: "Unable to update the product.",
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
      </Stack>
    </FormModal>
  );
}
