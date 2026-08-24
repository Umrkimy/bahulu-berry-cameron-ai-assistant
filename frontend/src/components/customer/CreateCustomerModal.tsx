import {
  Button,
  Modal,
  SimpleGrid,
  Stack,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";

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
    },
  });

  async function handleSubmit(values: typeof form.values) {
    try {
      await createCustomerMutation.mutateAsync({
        full_name: values.full_name,
        phone_number: values.phone_number,
        email: values.email || undefined,
        address: values.address || undefined,
        city: values.city || undefined,
        state: values.state || undefined,
        postal_code: values.postal_code || undefined,
        country: values.country,
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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Add Customer"
      centered
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Full Name"
              placeholder="Customer name"
              {...form.getInputProps("full_name")}
            />

            <TextInput
              label="Phone Number"
              placeholder="012-345 6789"
              {...form.getInputProps("phone_number")}
            />
          </SimpleGrid>

          <TextInput
            label="Email Address"
            placeholder="customer@email.com"
            {...form.getInputProps("email")}
          />

          <Textarea
            label="Address"
            placeholder="Street address"
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

            <TextInput label="Country" {...form.getInputProps("country")} />
          </SimpleGrid>

          <Button type="submit" loading={createCustomerMutation.isPending}>
            Add Customer
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
