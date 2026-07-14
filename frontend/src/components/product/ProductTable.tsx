import { Badge, Button, Card, Group, Table, Text } from "@mantine/core";

import { useProducts, useDeleteProduct } from "../../hooks/useProducts";
import type { Product } from "../../types/product";

interface ProductTableProps {
  onEdit: (product: Product) => void;
}

export default function ProductTable({ onEdit }: ProductTableProps) {
  const { data, isLoading } = useProducts();

  const deleteMutation = useDeleteProduct();

  if (isLoading) {
    return (
      <Card withBorder radius="md" p="lg">
        Loading products...
      </Card>
    );
  }

  const products = data?.items ?? [];

  return (
    <Card withBorder radius="md" p="lg">
      <Table.ScrollContainer minWidth={900}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Product</Table.Th>

              <Table.Th>Category</Table.Th>

              <Table.Th>Price</Table.Th>

              <Table.Th>Stock</Table.Th>

              <Table.Th>Status</Table.Th>

              <Table.Th>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {products.map((product) => (
              <Table.Tr key={product.id}>
                <Table.Td>
                  <Text fw={600}>{product.name}</Text>
                </Table.Td>

                <Table.Td>{product.category ?? "-"}</Table.Td>

                <Table.Td fw={600}>RM {product.price}</Table.Td>

                <Table.Td>{product.inventory?.quantity ?? 0}</Table.Td>

                <Table.Td>
                  <Badge color={product.is_active ? "green" : "red"}>
                    {product.is_active ? "ACTIVE" : "INACTIVE"}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  <Group gap="xs">
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() => onEdit(product)}
                    >
                      Edit
                    </Button>

                    <Button
                      size="xs"
                      color="red"
                      onClick={() => {
                        if (window.confirm(`Delete "${product.name}"?`)) {
                          deleteMutation.mutate(product.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
}
