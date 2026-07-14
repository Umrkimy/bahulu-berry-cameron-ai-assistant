import { Button, Card, Group, Text } from "@mantine/core";
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
    <Card withBorder radius="md" p="lg">
      <Group justify="space-between" mb="md">
        <Text fw={700} size="lg">
          Products Management
        </Text>

        <Button onClick={() => setCreateOpened(true)}>Add Product</Button>
      </Group>

      <ProductTable onEdit={openEdit} />

      <CreateProductModal
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
      />

      <EditProductModal
        opened={editOpened}
        onClose={closeEditModal}
        product={selectedProduct}
      />
    </Card>
  );
}
