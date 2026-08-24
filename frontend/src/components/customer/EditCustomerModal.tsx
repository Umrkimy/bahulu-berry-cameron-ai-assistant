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
import { useEffect } from "react";

import { useUpdateCustomer } from "../../hooks/useCustomers";
import type { Customer } from "../../api/customers";

interface Props {
  opened: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export default function EditCustomerModal({
  opened,
  onClose,
  customer,
}: Props) {
  const updateCustomerMutation = useUpdateCustomer();

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
  });

  useEffect(() => {
    if (!customer) return;

    form.setValues({
      full_name: customer.full_name,
      phone_number: customer.phone_number,
      email: customer.email ?? "",
      address: customer.address ?? "",
      city: customer.city ?? "",
      state: customer.state ?? "",
      postal_code: customer.postal_code ?? "",
      country: customer.country,
    });
  }, [customer]);

  async function handleSubmit(values: typeof form.values) {
    if (!customer) return;

    try {
      await updateCustomerMutation.mutateAsync({
        customerId: customer.id,
        data: {
          full_name: values.full_name,
          phone_number: values.phone_number,
          email: values.email || null,
          address: values.address || null,
          city: values.city || null,
          state: values.state || null,
          postal_code: values.postal_code || null,
          country: values.country,
        },
      });

      notifications.show({
        title: "Customer Updated",
        message: "Customer information was saved.",
        color: "green",
      });

      onClose();
    } catch {
      notifications.show({
        title: "Update Failed",
        message: "Unable to update this customer.",
        color: "red",
      });
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Edit Customer"
      centered
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Full Name" {...form.getInputProps("full_name")} />

            <TextInput
              label="Phone Number"
              {...form.getInputProps("phone_number")}
            />
          </SimpleGrid>

          <TextInput label="Email Address" {...form.getInputProps("email")} />

          <Textarea
            label="Address"
            minRows={2}
            {...form.getInputProps("address")}
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="City" {...form.getInputProps("city")} />
            <TextInput label="State" {...form.getInputProps("state")} />
            <TextInput
              label="Postal Code"
              {...form.getInputProps("postal_code")}
            />
            <TextInput label="Country" {...form.getInputProps("country")} />
          </SimpleGrid>

          <Button type="submit" loading={updateCustomerMutation.isPending}>
            Save Changes
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
