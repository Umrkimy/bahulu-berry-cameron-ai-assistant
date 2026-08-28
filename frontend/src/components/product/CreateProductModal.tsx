import { NumberInput, Stack, Switch, TextInput, Textarea } from "@mantine/core";

import { notifications } from "@mantine/notifications";

import { useForm } from "@mantine/form";

import { FormModal } from "../common/DataTable";

import { useCreateProduct } from "../../hooks/useProducts";
import { getApiError } from "../../api/errors";

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
    createMutation.mutate(
      {
        name: values.name.trim(),

        description: values.description.trim(),

        price: values.price,

        category: values.category.trim(),

        initial_quantity: values.initial_quantity,

        is_active: values.is_active,
      },
      {
        onSuccess: () => {
          notifications.show({
            title: "Product Created",
            message: "Product was created successfully.",
            color: "green",
          });

          form.reset();

          onClose();
        },

        onError: (error) => {
          const apiError = getApiError(error);
          form.setErrors(apiError.fieldErrors);
          notifications.show({
            title: "Create Failed",
            message: apiError.message,
            color: "red",
          });
        },
      },
    );
  }

  function handleClose() {
    if (createMutation.isPending) {
      return;
    }

    form.reset();

    onClose();
  }

  return (
    <FormModal
      opened={opened}
      onClose={handleClose}
      title="Add Product"
      description="Create a new product and configure its availability."
      submitLabel="Create Product"
      loading={createMutation.isPending}
      isDirty={form.isDirty()}
      onSubmit={() => form.onSubmit(handleSubmit)()}
    >
      <Stack gap="md">
        <TextInput
          label="Product Name"
          placeholder="Bahulu Berry"
          withAsterisk
          disabled={createMutation.isPending}
          {...form.getInputProps("name")}
        />

        <Textarea
          label="Description"
          placeholder="Enter product description"
          autosize
          minRows={3}
          disabled={createMutation.isPending}
          {...form.getInputProps("description")}
        />

        <TextInput
          label="Category"
          placeholder="Bahulu"
          disabled={createMutation.isPending}
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
          disabled={createMutation.isPending}
          {...form.getInputProps("price")}
        />

        <NumberInput
          label="Initial Stock"
          placeholder="100"
          min={0}
          disabled={createMutation.isPending}
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
          disabled={createMutation.isPending}
          onChange={(event) =>
            form.setFieldValue("is_active", event.currentTarget.checked)
          }
        />
      </Stack>
    </FormModal>
  );
}
