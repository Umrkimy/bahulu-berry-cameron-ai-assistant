import { useEffect } from "react";

import {
  Button,
  Divider,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";

import { useForm } from "@mantine/form";

import { notifications } from "@mantine/notifications";

import {
  useOrderDelivery,
  useUpdateOrderDelivery,
} from "../../hooks/useDeliveries";
import { getApiError } from "../../api/errors";

import type { Delivery, DeliveryStatus } from "../../types/delivery";

interface Props {
  opened: boolean;
  delivery: Delivery | null;
  onClose: () => void;
}

const DELIVERY_STATUSES: DeliveryStatus[] = [
  "PENDING",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
];

function formatStatus(status: DeliveryStatus) {
  return status.replaceAll("_", " ");
}

export default function EditDeliveryModal({
  opened,
  delivery,
  onClose,
}: Props) {
  const updateDeliveryMutation = useUpdateOrderDelivery();

  const orderId = delivery?.order_id ?? 0;

  const { data: latestDelivery, isLoading: isLoadingDelivery } =
    useOrderDelivery(orderId);

  const form = useForm<{
    courier: string;
    tracking_number: string;
    status: DeliveryStatus;
  }>({
    initialValues: {
      courier: "",
      tracking_number: "",
      status: "PENDING",
    },
  });

  useEffect(() => {
    const currentDelivery = latestDelivery ?? delivery;

    if (!currentDelivery) {
      return;
    }

    form.setValues({
      courier: currentDelivery.courier ?? "",
      tracking_number: currentDelivery.tracking_number ?? "",
      status: currentDelivery.status,
    });
  }, [delivery, latestDelivery]);

  if (!delivery) {
    return null;
  }

  const currentDelivery: Delivery = latestDelivery ?? delivery;

  async function handleSubmit(values: typeof form.values) {
    const courier = values.courier.trim();

    const trackingNumber = values.tracking_number.trim();

    const hasChanges =
      courier !== (currentDelivery.courier ?? "") ||
      trackingNumber !== (currentDelivery.tracking_number ?? "") ||
      values.status !== currentDelivery.status;

    if (!hasChanges) {
      notifications.show({
        title: "No Changes",
        message: "No delivery information has been changed.",
        color: "blue",
      });

      return;
    }

    try {
      await updateDeliveryMutation.mutateAsync({
        orderId: currentDelivery.order_id,

        data: {
          courier: courier || null,
          tracking_number: trackingNumber || null,
          status: values.status,
        },
      });

      notifications.show({
        title: "Delivery Updated",
        message: "Delivery information was updated successfully.",
        color: "green",
      });

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
    if (updateDeliveryMutation.isPending) {
      return;
    }

    form.reset();

    onClose();
  }

  const isDisabled = updateDeliveryMutation.isPending || isLoadingDelivery;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      centered
      size="lg"
      radius="md"
      padding="xl"
      title={
        <Stack gap={2}>
          <Text fw={700} size="lg">
            Edit Delivery
          </Text>

          <Text size="sm" c="dimmed">
            Order #{currentDelivery.order_id}
          </Text>
        </Stack>
      }
      closeOnClickOutside={!updateDeliveryMutation.isPending}
      closeOnEscape={!updateDeliveryMutation.isPending}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="lg">
          {/* CURRENT STATUS */}

          <div>
            <Text size="sm" c="dimmed">
              Current Status
            </Text>

            <Text fw={600} mt={4}>
              {formatStatus(currentDelivery.status)}
            </Text>
          </div>

          <Divider />

          {/* SHIPMENT */}

          <Divider label="Shipment Information" labelPosition="center" />

          <TextInput
            label="Courier"
            placeholder="e.g. J&T Express"
            {...form.getInputProps("courier")}
            disabled={isDisabled}
          />

          <TextInput
            label="Tracking Number"
            placeholder="Enter tracking number"
            {...form.getInputProps("tracking_number")}
            disabled={isDisabled}
          />

          <Select
            label="Delivery Status"
            placeholder="Select delivery status"
            data={DELIVERY_STATUSES.map((status) => ({
              value: status,
              label: formatStatus(status),
            }))}
            {...form.getInputProps("status")}
            disabled={isDisabled}
          />

          <Divider />

          {/* ACTIONS */}

          <Group justify="flex-end">
            <Button
              variant="default"
              type="button"
              onClick={handleClose}
              disabled={updateDeliveryMutation.isPending}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              loading={updateDeliveryMutation.isPending}
              disabled={isLoadingDelivery}
            >
              Save Changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
