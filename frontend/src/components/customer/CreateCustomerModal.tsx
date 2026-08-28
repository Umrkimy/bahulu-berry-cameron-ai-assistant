import {
  Divider,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";

import { FormModal } from "../common/DataTable";
import { useCreateCustomer } from "../../hooks/useCustomers";

interface Props {
  opened: boolean;
  onClose: () => void;
}

export default function CreateCustomerModal({ opened, onClose }: Props) {
  const createCustomerMutation = useCreateCustomer();

  const form = useForm({
    initialValues: {
      full_name: "",
      phone_number: "",
      email: "",
      address: "",
      city: "",
      state: "",
      postal_code: "",
      country: "Malaysia",
    },

    validate: {
      full_name: (value) =>
        value.trim().length < 1 ? "Customer name is required" : null,

      phone_number: (value) =>
        value.trim().length < 10 ? "Enter a valid phone number" : null,

      email: (value) =>
        value && !/^\S+@\S+\.\S+$/.test(value)
          ? "Enter a valid email address"
          : null,
    },
  });

  async function handleSubmit() {
    const validation = form.validate();

    if (validation.hasErrors) return;

    try {
      const values = form.values;

      await createCustomerMutation.mutateAsync({
        full_name: values.full_name.trim(),
        phone_number: values.phone_number.trim(),
        email: values.email.trim() || undefined,
        address: values.address.trim() || undefined,
        city: values.city.trim() || undefined,
        state: values.state.trim() || undefined,
        postal_code: values.postal_code.trim() || undefined,
        country: values.country.trim(),
      });

      notifications.show({
        title: "Customer Added",
        message: "The customer was created successfully.",
        color: "green",
      });

      form.reset();
      onClose();
    } catch {
      notifications.show({
        title: "Create Failed",
        message: "Unable to create this customer.",
        color: "red",
      });
    }
  }

  function handleClose() {
    if (createCustomerMutation.isPending) return;

    form.reset();
    onClose();
  }

  return (
    <FormModal
      opened={opened}
      onClose={handleClose}
      title="Add Customer"
      description="Add a new customer and their contact information."
      submitLabel="Add Customer"
      loading={createCustomerMutation.isPending}
      isDirty={form.isDirty()}
      onSubmit={handleSubmit}
    >
      <Stack gap="md">
        <div>
          <Text fw={600} size="sm">
            Customer Information
          </Text>

          <Text size="xs" c="dimmed">
            Enter the customer's basic contact details.
          </Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Full Name"
            placeholder="Muhammad Umar"
            withAsterisk
            {...form.getInputProps("full_name")}
          />

          <TextInput
            label="Phone Number"
            placeholder="012-345 6789"
            withAsterisk
            {...form.getInputProps("phone_number")}
          />
        </SimpleGrid>

        <TextInput
          label="Email Address"
          placeholder="customer@example.com"
          {...form.getInputProps("email")}
        />

        <Divider />

        <div>
          <Text fw={600} size="sm">
            Address Information
          </Text>

          <Text size="xs" c="dimmed">
            Add the customer's delivery or billing address.
          </Text>
        </div>

        <Textarea
          label="Address"
          placeholder="Street address"
          autosize
          minRows={2}
          {...form.getInputProps("address")}
        />

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="City"
            placeholder="Cameron Highlands"
            {...form.getInputProps("city")}
          />

          <TextInput
            label="State"
            placeholder="Pahang"
            {...form.getInputProps("state")}
          />

          <TextInput
            label="Postal Code"
            placeholder="39000"
            {...form.getInputProps("postal_code")}
          />

          <TextInput
            label="Country"
            placeholder="Malaysia"
            {...form.getInputProps("country")}
          />
        </SimpleGrid>
      </Stack>
    </FormModal>
  );
}
