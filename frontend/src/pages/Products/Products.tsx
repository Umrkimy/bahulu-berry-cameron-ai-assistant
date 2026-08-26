import { Button, Card, Group, Text } from "@mantine/core";
import { useState } from "react";

import CreateProductModal from "../../components/product/CreateProductModal";
import EditProductModal from "../../components/product/EditProductModal";
import ProductTable from "../../components/product/ProductTable";

import type { Product } from "../../types/product";

export default function ProductsPage() {
  const [createOpened, setCreateOpened] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  function openEdit(product: Product) {
    setSelectedProduct(product);
  }

  function closeEdit() {
    setSelectedProduct(null);
  }

  return (
    <Card withBorder radius="md" p={0} style={{ overflow: "hidden" }}>
      <Group justify="space-between" p="lg">
        <div>
          <Text fw={700} size="lg">
            Products Management
          </Text>

          <Text c="dimmed" size="sm">
            Manage your products, prices, stock, and availability
          </Text>
        </div>

        <Button onClick={() => setCreateOpened(true)}>Add Product</Button>
      </Group>

      <ProductTable onEdit={openEdit} />

      <CreateProductModal
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
      />

      <EditProductModal
        opened={selectedProduct !== null}
        product={selectedProduct}
        onClose={closeEdit}
      />
    </Card>
  );
}
