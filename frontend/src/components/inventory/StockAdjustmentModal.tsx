import {
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  Stack,
  Text,
} from "@mantine/core";

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
        data: {
          quantity: values.quantity,
          low_stock_threshold: values.low_stock_threshold,
        },
      });

      notifications.show({
        title: "Inventory Updated",
        message: `${inventory.product_name} inventory was updated successfully.`,
        color: "green",
      });

      onClose();
    } catch {
      notifications.show({
        title: "Update Failed",
        message: "Failed to update inventory.",
        color: "red",
      });
    }
  }

  function adjustQuantity(amount: number) {
    const currentQuantity = form.values.quantity;

    const newQuantity = Math.max(0, currentQuantity + amount);

    form.setFieldValue("quantity", newQuantity);
  }

  function getStockStatus() {
    const quantity = form.values.quantity;
    const threshold = form.values.low_stock_threshold;

    if (quantity === 0) {
      return {
        label: "Out of Stock",
        color: "red",
      };
    }

    if (quantity <= threshold) {
      return {
        label: "Low Stock",
        color: "orange",
      };
    }

    return {
      label: "Good Stock",
      color: "green",
    };
  }

  const stockStatus = getStockStatus();

  return (
    <Modal
      opened={opened}
      onClose={updateMutation.isPending ? () => {} : onClose}
      title={
        <div>
          <Text fw={700}>Manage Inventory</Text>

          {inventory && (
            <Text size="sm" c="dimmed" fw={400}>
              {inventory.product_name}
            </Text>
          )}
        </div>
      }
      size="md"
      centered
      closeOnEscape={!updateMutation.isPending}
      closeOnClickOutside={!updateMutation.isPending}
    >
      {inventory && (
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="lg">
            {/* CURRENT STOCK */}
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" align="center">
                <div>
                  <Text size="sm" c="dimmed">
                    Current Stock
                  </Text>

                  <Text fw={700} size="xl">
                    {form.values.quantity} units
                  </Text>
                </div>

                <Badge color={stockStatus.color} size="lg">
                  {stockStatus.label}
                </Badge>
              </Group>
            </Paper>

            {/* STOCK ADJUSTMENT */}
            <div>
              <Text fw={600} mb={4}>
                Stock Quantity
              </Text>

              <Text size="sm" c="dimmed" mb="sm">
                Adjust the number of units currently available.
              </Text>

              <NumberInput
                min={0}
                allowDecimal={false}
                disabled={updateMutation.isPending}
                {...form.getInputProps("quantity")}
              />

              <Group grow mt="sm">
                <Button
                  variant="light"
                  color="red"
                  disabled={updateMutation.isPending}
                  onClick={() => adjustQuantity(-10)}
                >
                  -10
                </Button>

                <Button
                  variant="light"
                  color="red"
                  disabled={updateMutation.isPending}
                  onClick={() => adjustQuantity(-1)}
                >
                  -1
                </Button>

                <Button
                  variant="light"
                  color="green"
                  disabled={updateMutation.isPending}
                  onClick={() => adjustQuantity(1)}
                >
                  +1
                </Button>

                <Button
                  variant="light"
                  color="green"
                  disabled={updateMutation.isPending}
                  onClick={() => adjustQuantity(10)}
                >
                  +10
                </Button>
              </Group>
            </div>

            <Divider />

            {/* LOW STOCK SETTINGS */}
            <div>
              <Text fw={600} mb={4}>
                Low Stock Alert
              </Text>

              <Text size="sm" c="dimmed" mb="sm">
                Products at or below this quantity will be marked as low stock.
              </Text>

              <NumberInput
                label="Low Stock Threshold"
                min={0}
                allowDecimal={false}
                disabled={updateMutation.isPending}
                {...form.getInputProps("low_stock_threshold")}
              />
            </div>

            {/* ACTIONS */}
            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={onClose}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>

              <Button type="submit" loading={updateMutation.isPending}>
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Modal>
  );
}
