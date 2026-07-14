import {
  Button,
  Modal,
  NumberInput,
  Stack,
  TextInput,
  Textarea,
  Switch,
} from "@mantine/core";

import { useForm } from "@mantine/form";

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
      name: (value) => (value.length < 1 ? "Product name is required" : null),

      price: (value) => (value <= 0 ? "Price must be greater than 0" : null),
    },
  });

  function handleSubmit(values: typeof form.values) {
    createMutation.mutate(
      values,

      {
        onSuccess() {
          form.reset();

          onClose();
        },
      },
    );
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Add Product">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Product Name"
            placeholder="Bahulu Berry"
            {...form.getInputProps("name")}
          />

          <Textarea
            label="Description"
            placeholder="Product description"
            {...form.getInputProps("description")}
          />

          <NumberInput
            label="Price"
            prefix="RM "
            min={0}
            {...form.getInputProps("price")}
          />

          <TextInput
            label="Category"
            placeholder="Berry"
            {...form.getInputProps("category")}
          />

          <NumberInput
            label="Initial Quantity"
            min={0}
            {...form.getInputProps("initial_quantity")}
          />

          <Switch
            label="Active Product"
            {...form.getInputProps("is_active", {
              type: "checkbox",
            })}
          />

          <Button type="submit" loading={createMutation.isPending}>
            Create Product
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
