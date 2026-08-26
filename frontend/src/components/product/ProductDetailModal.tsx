import {
  Badge,
  Divider,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
} from "@mantine/core";

import type { Product } from "../../types/product";

interface Props {
  opened: boolean;
  product: Product | null;
  onClose: () => void;
}

function getStockStatus(quantity: number, threshold: number) {
  if (quantity === 0) {
    return {
      label: "OUT OF STOCK",
      color: "red",
    };
  }

  if (quantity <= threshold) {
    return {
      label: "LOW STOCK",
      color: "orange",
    };
  }

  return {
    label: "IN STOCK",
    color: "green",
  };
}

export default function ProductDetailsModal({
  opened,
  product,
  onClose,
}: Props) {
  if (!product) {
    return null;
  }

  const quantity = product.inventory?.quantity ?? 0;

  const threshold = product.inventory?.low_stock_threshold ?? 0;

  const stockStatus = getStockStatus(quantity, threshold);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="lg"
      padding="xl"
      radius="md"
      title={
        <Stack gap={2}>
          <Text fw={700} size="lg">
            Product Details
          </Text>

          <Text size="sm" c="dimmed">
            Product #{product.id}
          </Text>
        </Stack>
      }
    >
      <Stack gap="lg">
        {/* PRODUCT SUMMARY */}

        <Paper withBorder radius="md" p="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="sm" c="dimmed">
                Product
              </Text>

              <Text fw={700} size="lg">
                {product.name}
              </Text>

              {product.category && (
                <Text size="sm" c="dimmed" mt={2}>
                  {product.category}
                </Text>
              )}
            </div>

            <Badge
              color={product.is_active ? "green" : "red"}
              variant="light"
              size="lg"
            >
              {product.is_active ? "ACTIVE" : "INACTIVE"}
            </Badge>
          </Group>
        </Paper>

        {/* PRODUCT INFORMATION */}

        <Divider label="Product Information" labelPosition="center" />

        <Paper withBorder radius="md" p="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Name
              </Text>

              <Text fw={600}>{product.name}</Text>
            </Group>

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Category
              </Text>

              <Text fw={500}>{product.category ?? "Not specified"}</Text>
            </Group>

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Price
              </Text>

              <Text fw={700}>RM {Number(product.price).toFixed(2)}</Text>
            </Group>

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Status
              </Text>

              <Badge
                color={product.is_active ? "green" : "red"}
                variant="light"
              >
                {product.is_active ? "ACTIVE" : "INACTIVE"}
              </Badge>
            </Group>
          </Stack>
        </Paper>

        {/* DESCRIPTION */}

        {product.description && (
          <>
            <Divider label="Description" labelPosition="center" />

            <Paper withBorder radius="md" p="md">
              <Text>{product.description}</Text>
            </Paper>
          </>
        )}

        {/* INVENTORY */}

        <Divider label="Inventory" labelPosition="center" />

        <Paper withBorder radius="md" p="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Current Stock
              </Text>

              <Text fw={700} size="lg">
                {quantity}
              </Text>
            </Group>

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Low Stock Threshold
              </Text>

              <Text fw={500}>{threshold}</Text>
            </Group>

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Stock Status
              </Text>

              <Badge color={stockStatus.color} variant="light" size="lg">
                {stockStatus.label}
              </Badge>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Modal>
  );
}
