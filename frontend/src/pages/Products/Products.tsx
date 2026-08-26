import { Button, Card, Group, Stack, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";

import ProductTable from "../../components/product/ProductTable";
import CreateProductModal from "../../components/product/CreateProductModal";
import EditProductModal from "../../components/product/EditProductModal";

import type { Product } from "../../types/product";

export default function ProductsPage() {
  const [createOpened, setCreateOpened] = useState(false);
  const [editOpened, setEditOpened] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  function openEdit(product: Product) {
    setSelectedProduct(product);
    setEditOpened(true);
  }

  function closeEditModal() {
    setSelectedProduct(null);
    setEditOpened(false);
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Text fw={700} size="xl">
            Products Management
          </Text>

          <Text c="dimmed" size="sm" mt={4}>
            Manage your products, prices, stock, and availability
          </Text>
        </div>

        <Button
          leftSection={<IconPlus size={17} />}
          onClick={() => setCreateOpened(true)}
        >
          Add Product
        </Button>
      </Group>

      <Card withBorder radius="md" p={0}>
        <ProductTable onEdit={openEdit} />
      </Card>

      <CreateProductModal
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
      />

      <EditProductModal
        opened={editOpened}
        onClose={closeEditModal}
        product={selectedProduct}
      />
    </Stack>
  );
}
