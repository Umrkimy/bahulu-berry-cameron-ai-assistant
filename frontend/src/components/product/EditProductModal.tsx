import { NumberInput, Stack, Switch, TextInput, Textarea } from "@mantine/core";

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
      initial_quantity: 0,
    },

    validate: {
      name: (value) =>
        value.trim().length < 1 ? "Product name is required" : null,

      price: (value) => (value <= 0 ? "Price must be greater than 0" : null),

      initial_quantity: (value) =>
        value < 0 ? "Stock cannot be negative" : null,
    },
  });

  useEffect(() => {
    if (!product) return;

    form.setValues({
      name: product.name,
      description: product.description ?? "",
      price: Number(product.price),
      category: product.category ?? "",
      is_active: product.is_active,
      initial_quantity: product.inventory?.quantity ?? 0,
    });
  }, [product]);

  function handleSubmit(values: typeof form.values) {
    if (!product) return;

    updateMutation.mutate(
      {
        productId: product.id,
        data: {
          name: values.name,
          description: values.description,
          price: values.price,
          category: values.category,
          is_active: values.is_active,
        },
      },
      {
        onSuccess: () => {
          form.reset();
          onClose();
        },
      },
    );
  }

  function handleClose() {
    if (!updateMutation.isPending) {
      form.reset();
      onClose();
    }
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
          {...form.getInputProps("name")}
        />

        <Textarea
          label="Description"
          placeholder="Enter product description"
          autosize
          minRows={3}
          {...form.getInputProps("description")}
        />

        <TextInput
          label="Category"
          placeholder="Bahulu"
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
          {...form.getInputProps("price")}
        />

        <NumberInput
          label="Stock Quantity"
          min={0}
          {...form.getInputProps("initial_quantity")}
        />

        <Switch
          label="Active Product"
          description={
            form.values.is_active
              ? "Product is available to customers"
              : "Product is hidden from customers"
          }
          checked={form.values.is_active}
          onChange={(event) =>
            form.setFieldValue("is_active", event.currentTarget.checked)
          }
        />
      </Stack>
    </FormModal>
  );
}
