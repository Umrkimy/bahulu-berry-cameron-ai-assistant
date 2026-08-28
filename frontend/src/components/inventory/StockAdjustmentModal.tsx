import {
  Badge,
  Button,
  Divider,
  Group,
  NumberInput,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { useEffect } from "react";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";

import { useUpdateInventory } from "../../hooks/useInventory";
import type { Inventory } from "../../types/inventory";
import { FormModal } from "../common/DataTable";

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

    validate: {
      quantity: (value) =>
        value < 0 ? "Stock quantity cannot be negative" : null,

      low_stock_threshold: (value) =>
        value < 0 ? "Threshold cannot be negative" : null,
    },
  });

  useEffect(() => {
    if (!inventory) return;

    form.setValues({
      quantity: inventory.quantity,
      low_stock_threshold: inventory.low_stock_threshold,
    });
  }, [inventory]);

  async function handleSubmit() {
    if (!inventory) return;

    const values = form.values;

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

      form.reset();
      onClose();
    } catch {
      notifications.show({
        title: "Update Failed",
        message: "Failed to update inventory.",
        color: "red",
      });
    }
  }

  function handleClose() {
    if (updateMutation.isPending) return;

    form.reset();
    onClose();
  }

  function adjustQuantity(amount: number) {
    const newQuantity = Math.max(0, form.values.quantity + amount);

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
    <FormModal
      opened={opened}
      onClose={handleClose}
      title="Manage Inventory"
      description={
        inventory
          ? `Update stock settings for ${inventory.product_name}.`
          : undefined
      }
      submitLabel="Save Changes"
      loading={updateMutation.isPending}
      isDirty={form.isDirty()}
      onSubmit={handleSubmit}
    >
      {inventory && (
        <Stack gap="lg">
          {/* CURRENT STOCK */}
          <Paper
            withBorder
            p="md"
            radius="md"
            style={{
              background: "var(--mantine-color-gray-0)",
            }}
          >
            <Group justify="space-between" align="center">
              <div>
                <Text size="sm" c="dimmed">
                  Current Stock
                </Text>

                <Text fw={700} size="xl">
                  {form.values.quantity} units
                </Text>
              </div>

              <Badge color={stockStatus.color} size="lg" variant="light">
                {stockStatus.label}
              </Badge>
            </Group>
          </Paper>

          {/* STOCK QUANTITY */}
          <div>
            <Text fw={600} size="sm">
              Stock Quantity
            </Text>

            <Text size="xs" c="dimmed" mb="sm">
              Adjust the number of units currently available.
            </Text>

            <NumberInput
              min={0}
              allowDecimal={false}
              size="md"
              {...form.getInputProps("quantity")}
            />

            <Group grow mt="sm">
              <Button
                variant="light"
                color="red"
                onClick={() => adjustQuantity(-10)}
                disabled={updateMutation.isPending}
              >
                −10
              </Button>

              <Button
                variant="light"
                color="red"
                onClick={() => adjustQuantity(-1)}
                disabled={updateMutation.isPending}
              >
                −1
              </Button>

              <Button
                variant="light"
                color="green"
                onClick={() => adjustQuantity(1)}
                disabled={updateMutation.isPending}
              >
                +1
              </Button>

              <Button
                variant="light"
                color="green"
                onClick={() => adjustQuantity(10)}
                disabled={updateMutation.isPending}
              >
                +10
              </Button>
            </Group>
          </div>

          <Divider />

          {/* LOW STOCK */}
          <div>
            <Text fw={600} size="sm">
              Low Stock Alert
            </Text>

            <Text size="xs" c="dimmed" mb="sm">
              Products at or below this quantity will be marked as low stock.
            </Text>

            <NumberInput
              label="Low Stock Threshold"
              min={0}
              allowDecimal={false}
              {...form.getInputProps("low_stock_threshold")}
            />
          </div>
        </Stack>
      )}
    </FormModal>
  );
}
