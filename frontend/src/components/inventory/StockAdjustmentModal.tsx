import { Button, Modal, NumberInput, Stack } from "@mantine/core";

import { notifications } from "@mantine/notifications";

import { useEffect } from "react";

import { useForm } from "@mantine/form";

import { useUpdateInventory } from "../../hooks/useInventory";

import type { Inventory } from "../../types/inventory";

interface Props {
  opened: boolean;

  onClose: () => void;

  inventory: Inventory | null;
}

export default function StockAdjustmentModal({
  opened,
  onClose,
  inventory,
}: Props) {
  const updateMutation = useUpdateInventory();

  const form = useForm({
    initialValues: {
      quantity: 0,
      low_stock_threshold: 10,
    },
  });

  useEffect(() => {
    if (!inventory) return;

    form.setValues({
      quantity: inventory.quantity,
      low_stock_threshold: inventory.low_stock_threshold,
    });
  }, [inventory]);

  async function handleSubmit(values: typeof form.values) {
    if (!inventory) return;

    try {
      await updateMutation.mutateAsync({
        inventoryId: inventory.id,

        data: values,
      });

      notifications.show({
        title: "Inventory Updated",

        message: "Stock updated successfully",

        color: "green",
      });

      onClose();
    } catch {
      notifications.show({
        title: "Update Failed",

        message: "Failed to update inventory",

        color: "red",
      });
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={updateMutation.isPending ? () => {} : onClose}
      title="Adjust Inventory"
      closeOnEscape={!updateMutation.isPending}
      closeOnClickOutside={!updateMutation.isPending}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <NumberInput
            label="Quantity"
            min={0}
            disabled={updateMutation.isPending}
            {...form.getInputProps("quantity")}
          />

          <NumberInput
            label="Low Stock Threshold"
            min={0}
            disabled={updateMutation.isPending}
            {...form.getInputProps("low_stock_threshold")}
          />

          <Button type="submit" loading={updateMutation.isPending}>
            Save
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
