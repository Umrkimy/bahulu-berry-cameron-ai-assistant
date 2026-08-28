import { Button } from "@mantine/core";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import CreateProductModal from "../../components/product/CreateProductModal";
import EditProductModal from "../../components/product/EditProductModal";
import ProductTable from "../../components/product/ProductTable";
import PageHeader from "../../components/common/PageHeader";
import useAuth from "../../auth/useAuth";

import type { Product } from "../../types/product";

export default function ProductsPage() {
  const { admin } = useAuth();
  const isOwner = admin?.role === "OWNER";
  const [createOpened, setCreateOpened] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (isOwner && searchParams.get("create") === "1") {
      setCreateOpened(true);
      setSearchParams({}, { replace: true });
    }
  }, [isOwner, searchParams, setSearchParams]);

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
        action={isOwner ? <Button onClick={() => setCreateOpened(true)}>Add Product</Button> : undefined}
      />

      <ProductTable onEdit={openEdit} />

      <CreateProductModal
        opened={isOwner && createOpened}
        onClose={() => setCreateOpened(false)}
      />

      <EditProductModal
        opened={isOwner && selectedProduct !== null}
        product={selectedProduct}
        onClose={closeEdit}
      />
    </>
  );
}
