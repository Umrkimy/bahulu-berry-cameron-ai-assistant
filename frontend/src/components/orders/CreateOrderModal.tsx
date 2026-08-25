import {
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
} from "@mantine/core";

import { notifications } from "@mantine/notifications";

import { IconTrash } from "@tabler/icons-react";

import { useQuery } from "@tanstack/react-query";

import { useState } from "react";

import { getCustomers } from "../../api/customers";

import { getProducts } from "../../api/products";

import { useCreateOrder } from "../../hooks/useOrders";

import type { Product } from "../../types/product";

interface Props {
  opened: boolean;
  onClose: () => void;
}

interface OrderLine {
  product: Product;
  quantity: number;
}

export default function CreateOrderModal({ opened, onClose }: Props) {
  const createOrderMutation = useCreateOrder();

  const [customerId, setCustomerId] = useState<string | null>(null);

  const [productId, setProductId] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);

  const [items, setItems] = useState<OrderLine[]>([]);

  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const products =
    productsData?.items.filter(
      (product) => product.is_active && (product.inventory?.quantity ?? 0) > 0,
    ) ?? [];

  function addItem() {
    const product = products.find((item) => item.id === Number(productId));

    if (!product) {
      notifications.show({
        title: "Select a product",
        message: "Choose a product before adding it.",
        color: "red",
      });

      return;
    }

    const existingQuantity =
      items.find((item) => item.product.id === product.id)?.quantity ?? 0;

    const availableStock = product.inventory?.quantity ?? 0;

    if (existingQuantity + quantity > availableStock) {
      notifications.show({
        title: "Not enough stock",
        message: `Only ${availableStock} units are available.`,
        color: "red",
      });

      return;
    }

    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.product.id === product.id,
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
              }
            : item,
        );
      }

      return [
        ...currentItems,
        {
          product,
          quantity,
        },
      ];
    });

    setProductId(null);
    setQuantity(1);
  }

  function removeItem(productId: number) {
    setItems((currentItems) =>
      currentItems.filter((item) => item.product.id !== productId),
    );
  }

  async function handleSubmit() {
    if (!customerId) {
      notifications.show({
        title: "Select a customer",
        message: "Choose a customer before creating the order.",
        color: "red",
      });

      return;
    }

    if (items.length === 0) {
      notifications.show({
        title: "Add products",
        message: "An order needs at least one product.",
        color: "red",
      });

      return;
    }

    try {
      await createOrderMutation.mutateAsync({
        customer_id: Number(customerId),

        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      });

      notifications.show({
        title: "Order Created",
        message: "Order was created successfully.",
        color: "green",
      });

      setCustomerId(null);
      setProductId(null);
      setQuantity(1);
      setItems([]);

      onClose();
    } catch {
      notifications.show({
        title: "Create Failed",
        message: "Unable to create the order. Check product stock.",
        color: "red",
      });
    }
  }

  const total = items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Create New Order"
      centered
      size="xl"
      padding="xl"
    >
      <Stack gap="lg">
        <Select
          label="Customer"
          placeholder="Select a customer"
          searchable
          maxDropdownHeight={240}
          data={
            customers?.map((customer) => ({
              value: String(customer.id),

              label: `${customer.full_name} — ${customer.phone_number}`,
            })) ?? []
          }
          value={customerId}
          onChange={setCustomerId}
          disabled={isLoadingCustomers || createOrderMutation.isPending}
        />

        <Divider label="Add Products" labelPosition="center" />

        <Paper withBorder radius="md" p="md">
          <Group align="end" grow>
            <Select
              label="Product"
              placeholder="Select a product"
              searchable
              maxDropdownHeight={240}
              data={products.map((product) => ({
                value: String(product.id),

                label: `${product.name} — RM ${Number(product.price).toFixed(
                  2,
                )} — Stock: ${product.inventory?.quantity ?? 0}`,
              }))}
              value={productId}
              onChange={setProductId}
              disabled={isLoadingProducts || createOrderMutation.isPending}
            />

            <NumberInput
              label="Quantity"
              min={1}
              value={quantity}
              onChange={(value) => setQuantity(Number(value) || 1)}
              disabled={createOrderMutation.isPending}
            />

            <Button
              variant="light"
              onClick={addItem}
              disabled={createOrderMutation.isPending}
            >
              Add Product
            </Button>
          </Group>
        </Paper>

        {items.length > 0 && (
          <>
            <Divider label="Order Items" labelPosition="center" />

            <Table.ScrollContainer minWidth={650}>
              <Table verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Product</Table.Th>

                    <Table.Th>Unit Price</Table.Th>

                    <Table.Th>Quantity</Table.Th>

                    <Table.Th>Total</Table.Th>

                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>

                <Table.Tbody>
                  {items.map((item) => (
                    <Table.Tr key={item.product.id}>
                      <Table.Td>
                        <Text fw={600}>{item.product.name}</Text>

                        <Text size="xs" c="dimmed">
                          Available stock:{" "}
                          {item.product.inventory?.quantity ?? 0}
                        </Text>
                      </Table.Td>

                      <Table.Td>
                        RM {Number(item.product.price).toFixed(2)}
                      </Table.Td>

                      <Table.Td>{item.quantity}</Table.Td>

                      <Table.Td fw={600}>
                        RM{" "}
                        {(Number(item.product.price) * item.quantity).toFixed(
                          2,
                        )}
                      </Table.Td>

                      <Table.Td>
                        <Button
                          color="red"
                          variant="subtle"
                          size="xs"
                          onClick={() => removeItem(item.product.id)}
                          leftSection={<IconTrash size={14} />}
                        >
                          Remove
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>

            <Paper withBorder radius="md" p="md">
              <Group justify="space-between">
                <Text fw={700} size="lg">
                  Order Total
                </Text>

                <Text fw={700} size="lg">
                  RM {total.toFixed(2)}
                </Text>
              </Group>
            </Paper>
          </>
        )}

        <Button
          size="md"
          onClick={handleSubmit}
          loading={createOrderMutation.isPending}
        >
          Create Order
        </Button>
      </Stack>
    </Modal>
  );
}
