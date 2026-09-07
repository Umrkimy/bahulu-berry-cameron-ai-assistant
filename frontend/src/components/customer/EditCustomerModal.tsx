import {
  Divider,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect } from "react";
import { notifications } from "@mantine/notifications";

import { useUpdateCustomer } from "../../hooks/useCustomers";
import { getApiError } from "../../api/errors";
import type { Customer } from "../../api/customers";
import { FormModal } from "../common/DataTable";

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
      tags: "",
      internal_note: "",
      follow_up_at: "",
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
      country: customer.country ?? "Malaysia",
      tags: customer.tags ?? "",
      internal_note: customer.internal_note ?? "",
      follow_up_at: customer.follow_up_at ? customer.follow_up_at.slice(0, 16) : "",
    });
  }, [customer, form]);

  async function handleSubmit() {
    if (!customer) return;

    const values = form.values;

    const validation = form.validate();

    if (validation.hasErrors) return;

    try {
      await updateCustomerMutation.mutateAsync({
        customerId: customer.id,

        data: {
          full_name: values.full_name.trim(),
          phone_number: values.phone_number.trim(),
          email: values.email.trim() || null,
          address: values.address.trim() || null,
          city: values.city.trim() || null,
          state: values.state.trim() || null,
          postal_code: values.postal_code.trim() || null,
          country: values.country.trim(),
          tags: values.tags.trim() || null,
          internal_note: values.internal_note.trim() || null,
          follow_up_at: values.follow_up_at ? new Date(values.follow_up_at).toISOString() : null,
        },
      });

      notifications.show({
        title: "Customer Updated",
        message: "Customer information was saved successfully.",
        color: "green",
      });

      form.reset();
      onClose();
    } catch (error) {
      const apiError = getApiError(error);
      form.setErrors(apiError.fieldErrors);
      notifications.show({
        title: "Update Failed",
        message: apiError.message,
        color: "red",
      });
    }
  }

  function handleClose() {
    if (updateCustomerMutation.isPending) return;

    form.reset();
    onClose();
  }

  return (
    <FormModal
      opened={opened}
      onClose={handleClose}
      title="Edit Customer"
      description="Update the customer's contact and address information."
      submitLabel="Save Changes"
      loading={updateCustomerMutation.isPending}
      isDirty={form.isDirty()}
      onSubmit={handleSubmit}
    >
      <Stack gap="lg">
        <div>
          <Text fw={600} size="sm">
            Customer Information
          </Text>

          <Text size="xs" c="dimmed">
            Update the customer's basic contact details.
          </Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Full Name"
            placeholder="Customer name"
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

        <div><Text fw={600} size="sm">Internal CRM</Text><Text size="xs" c="dimmed">Private staff-only labels, notes, and follow-up reminders.</Text></div>
        <TextInput label="Tags" placeholder="VIP, repeat customer" {...form.getInputProps("tags")} />
        <Textarea label="Internal note" minRows={2} {...form.getInputProps("internal_note")} />
        <TextInput label="Follow up on" type="datetime-local" {...form.getInputProps("follow_up_at")} />

        <div>
          <Text fw={600} size="sm">
            Address Information
          </Text>

          <Text size="xs" c="dimmed">
            Update the customer's delivery or billing location.
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
