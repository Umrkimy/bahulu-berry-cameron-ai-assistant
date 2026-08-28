import { Button } from "@mantine/core";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import CreateProductModal from "../../components/product/CreateProductModal";
import EditProductModal from "../../components/product/EditProductModal";
import ProductTable from "../../components/product/ProductTable";
import PageHeader from "../../components/common/PageHeader";

import type { Product } from "../../types/product";

export default function ProductsPage() {
  const [createOpened, setCreateOpened] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateOpened(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  function openEdit(product: Product) {
    setSelectedProduct(product);
  }

  function closeEdit() {
    setSelectedProduct(null);
  }

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage products, prices, promotions, and availability."
        action={<Button onClick={() => setCreateOpened(true)}>Add Product</Button>}
      />

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
    </>
  );
}
