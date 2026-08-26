import { NumberInput, Stack, Switch, TextInput, Textarea } from "@mantine/core";

import { useForm } from "@mantine/form";

import { FormModal } from "../common/DataTable";

import { useCreateProduct } from "../../hooks/useProducts";

interface ProductModalProps {
  opened: boolean;
  onClose: () => void;
}

export default function CreateProductModal({
  opened,
  onClose,
}: ProductModalProps) {
  const createMutation = useCreateProduct();

  const form = useForm({
    initialValues: {
      name: "",
      description: "",
      price: 0,
      category: "",
      initial_quantity: 0,
      is_active: true,
    },

    validate: {
      name: (value) =>
        value.trim().length < 1 ? "Product name is required" : null,

      price: (value) => (value <= 0 ? "Price must be greater than 0" : null),

      initial_quantity: (value) =>
        value < 0 ? "Stock cannot be negative" : null,
    },
  });

  function handleSubmit(values: typeof form.values) {
    createMutation.mutate(values, {
      onSuccess() {
        form.reset();
        onClose();
      },
    });
  }

  function handleClose() {
    if (!createMutation.isPending) {
      form.reset();
      onClose();
    }
  }

  return (
    <FormModal
      opened={opened}
      onClose={handleClose}
      title="Add Product"
      description="Create a new product and configure its availability."
      submitLabel="Create Product"
      loading={createMutation.isPending}
      onSubmit={() => form.onSubmit(handleSubmit)()}
    >
      <Stack gap="md">
        <TextInput
          label="Product Name"
          placeholder="Bahulu Berry"
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
          label="Initial Stock"
          placeholder="100"
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
