import {
  Button,
  Divider,
  Group,
  Loader,
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
import { useEffect, useState } from "react";

import { getCustomers } from "../../api/customers";
import { quoteOrder } from "../../api/orders";
import { getProducts } from "../../api/products";
import { getApiError } from "../../api/errors";
import { useCreateOrder } from "../../hooks/useOrders";
import type { OrderQuote } from "../../types/order";
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
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const products = productsData?.items.filter(
    (product) => product.is_active && (product.inventory?.quantity ?? 0) > 0,
  ) ?? [];

  useEffect(() => {
    if (!items.length) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError(null);

      try {
        const nextQuote = await quoteOrder(
          items.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
        );
        setQuote(nextQuote);
      } catch (error) {
        const apiError = getApiError(error);
        setQuote(null);
        setQuoteError(apiError.message);
      } finally {
        setQuoteLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [items]);

  function resetForm() {
    setCustomerId(null);
    setProductId(null);
    setQuantity(1);
    setItems([]);
    setQuote(null);
    setQuoteError(null);
  }

  function handleClose() {
    if (createOrderMutation.isPending) return;

    resetForm();
    onClose();
  }

  function addItem() {
    if (!productId) {
      notifications.show({ title: "Select a product", message: "Choose a product before adding it.", color: "red" });
      return;
    }

    const product = products.find((item) => item.id === Number(productId));

    if (!product) {
      notifications.show({ title: "Product unavailable", message: "The selected product is no longer available.", color: "red" });
      return;
    }

    const existingQuantity = items.find((item) => item.product.id === product.id)?.quantity ?? 0;
    const newQuantity = existingQuantity + quantity;
    const availableStock = product.inventory?.quantity ?? 0;

    if (newQuantity > availableStock) {
      notifications.show({ title: "Not enough stock", message: `Only ${availableStock} units are available.`, color: "red" });
      return;
    }

    setItems((current) => {
      const existing = current.find((item) => item.product.id === product.id);

      if (existing) {
        return current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }

      return [...current, { product, quantity }];
    });
    setProductId(null);
    setQuantity(1);
  }

  function removeItem(productIdToRemove: number) {
    setItems((current) => current.filter((item) => item.product.id !== productIdToRemove));
  }

  async function handleSubmit() {
    if (!customerId || !items.length || !quote || quoteError) return;

    try {
      await createOrderMutation.mutateAsync({
        customer_id: Number(customerId),
        items: items.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
      });
      notifications.show({ title: "Order created", message: "Pricing and inventory have been updated.", color: "green" });
      resetForm();
      onClose();
    } catch (error) {
      const apiError = getApiError(error);
      notifications.show({
        title: "Create failed",
        message: apiError.message,
        color: "red",
      });
    }
  }

  const quoteItems = new Map(quote?.items.map((item) => [item.product_id, item]) ?? []);
  const isLoading = isLoadingCustomers || isLoadingProducts || createOrderMutation.isPending;

  return (
    <Modal opened={opened} onClose={handleClose} title="Create New Order" centered size="xl" padding="xl" closeOnClickOutside={!createOrderMutation.isPending} closeOnEscape={!createOrderMutation.isPending}>
      <Stack gap="lg">
        <Select label="Customer" placeholder="Select a customer" searchable clearable maxDropdownHeight={240} data={customers?.map((customer) => ({ value: String(customer.id), label: `${customer.full_name} - ${customer.phone_number}` })) ?? []} value={customerId} onChange={setCustomerId} disabled={isLoading} nothingFoundMessage="No customers found" />

        <Divider label="Add Products" labelPosition="center" />

        <Paper withBorder radius="md" p="md">
          <Group align="end" grow>
            <Select label="Product" placeholder="Select a product" searchable clearable maxDropdownHeight={240} data={products.map((product) => ({ value: String(product.id), label: `${product.name} - RM ${getDisplayedPrice(product).toFixed(2)} - Stock: ${product.inventory?.quantity ?? 0}` }))} value={productId} onChange={setProductId} disabled={isLoading} nothingFoundMessage="No products available" />
            <NumberInput label="Quantity" min={1} max={productId ? (products.find((product) => product.id === Number(productId))?.inventory?.quantity ?? undefined) : undefined} value={quantity} onChange={(value) => setQuantity(typeof value === "number" && value > 0 ? value : 1)} disabled={createOrderMutation.isPending} />
            <Button variant="light" onClick={addItem} disabled={createOrderMutation.isPending}>Add Product</Button>
          </Group>
        </Paper>

        {items.length > 0 && (
          <>
            <Divider label="Order Items" labelPosition="center" />
            <Table.ScrollContainer minWidth={720}>
              <Table verticalSpacing="sm">
                <Table.Thead><Table.Tr><Table.Th>Product</Table.Th><Table.Th>Regular Price</Table.Th><Table.Th>Promotion</Table.Th><Table.Th>Qty</Table.Th><Table.Th>Line Total</Table.Th><Table.Th /></Table.Tr></Table.Thead>
                <Table.Tbody>
                  {items.map((item) => {
                    const line = quoteItems.get(item.product.id);
                    return (
                      <Table.Tr key={item.product.id}>
                        <Table.Td><Text fw={600}>{item.product.name}</Text><Text size="xs" c="dimmed">Available stock: {item.product.inventory?.quantity ?? 0}</Text></Table.Td>
                        <Table.Td>RM {Number(item.product.price).toFixed(2)}</Table.Td>
                        <Table.Td>{line?.discount_name ? <><Text size="sm" c="red">-{`RM ${Number(line.discount_amount).toFixed(2)}`}</Text><Text size="xs" c="dimmed">{line.discount_name}</Text></> : "-"}</Table.Td>
                        <Table.Td>{item.quantity}</Table.Td>
                        <Table.Td fw={700}>{line ? `RM ${Number(line.total_amount).toFixed(2)}` : "-"}</Table.Td>
                        <Table.Td><Button color="red" variant="subtle" size="xs" onClick={() => removeItem(item.product.id)} disabled={createOrderMutation.isPending} leftSection={<IconTrash size={14} />}>Remove</Button></Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>

            <Paper withBorder radius="md" p="md">
              {quoteLoading ? <Group justify="center"><Loader size="sm" /><Text size="sm" c="dimmed">Calculating current promotion prices...</Text></Group> : quoteError ? <Text c="red">{quoteError}</Text> : quote ? <Stack gap="xs"><Group justify="space-between"><Text c="dimmed">Subtotal</Text><Text>RM {Number(quote.subtotal).toFixed(2)}</Text></Group><Group justify="space-between"><Text c="red">Discount</Text><Text c="red">-RM {Number(quote.discount_amount).toFixed(2)}</Text></Group><Group justify="space-between"><Text fw={700} size="lg">Order Total</Text><Text fw={700} size="lg">RM {Number(quote.total_amount).toFixed(2)}</Text></Group></Stack> : null}
            </Paper>
          </>
        )}

        <Button size="md" onClick={handleSubmit} loading={createOrderMutation.isPending} disabled={isLoadingCustomers || isLoadingProducts || quoteLoading || !customerId || !items.length || !quote || Boolean(quoteError)}>Create Order</Button>
      </Stack>
    </Modal>
  );
}

function getDisplayedPrice(product: Product) {
  const price = Number(product.price);
  const discount = product.active_discounts?.find(
    (item) => item.discount_type === "PERCENTAGE" || item.discount_type === "FIXED_AMOUNT",
  ) ?? product.active_discount;

  if (!discount || discount.discount_type === "BUNDLE_PRICE") return price;

  return discount.discount_type === "PERCENTAGE"
    ? price * (1 - Number(discount.discount_value) / 100)
    : Math.max(0, price - Number(discount.discount_value));
}
