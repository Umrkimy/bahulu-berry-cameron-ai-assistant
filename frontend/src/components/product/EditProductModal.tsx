import {
  Button,
  Modal,
  NumberInput,
  Stack,
  Switch,
  Textarea,
  TextInput,
} from "@mantine/core";

import { useEffect } from "react";
import { useForm } from "@mantine/form";

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
      name: (value) => (value.length < 1 ? "Product name is required" : null),

      price: (value) => (value <= 0 ? "Price must be greater than 0" : null),
    },
  });

  const { setValues } = form;

  // Fill form when product selected
  useEffect(() => {
    if (product) {
      setValues({
        name: product.name,

        description: product.description ?? "",

        price: Number(product.price),

        category: product.category ?? "",

        is_active: product.is_active,

        initial_quantity: product.inventory?.quantity ?? 0,
      });
    }
  }, [product, setValues]);

  function handleSubmit(values: typeof form.values) {
    if (!product) return;

    updateMutation.mutate(
      {
        productId: product.id,

        data: values,
      },
      {
        onSuccess() {
          form.reset();

          onClose();
        },
      },
    );
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Edit Product">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput label="Product Name" {...form.getInputProps("name")} />

          <Textarea
            label="Description"
            {...form.getInputProps("description")}
          />

          <NumberInput
            label="Price"
            prefix="RM "
            min={0}
            {...form.getInputProps("price")}
          />

          <TextInput label="Category" {...form.getInputProps("category")} />

          <NumberInput
            label="Stock Quantity"
            min={0}
            {...form.getInputProps("initial_quantity")}
          />

          <Switch
            label="Active Product"
            {...form.getInputProps("is_active", {
              type: "checkbox",
            })}
          />

          <Button type="submit" loading={updateMutation.isPending}>
            Update Product
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
