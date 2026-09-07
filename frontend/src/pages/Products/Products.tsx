import { Button } from "@mantine/core";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import CreateProductModal from "../../components/product/CreateProductModal";
import EditProductModal from "../../components/product/EditProductModal";
import ProductTable from "../../components/product/ProductTable";
import PageHeader from "../../components/common/PageHeader";
import useAuth from "../../auth/useAuth";

import type { Product } from "../../types/product";
import type { DashboardRouteState } from "../../types/navigation";

export default function ProductsPage() {
  const { admin } = useAuth();
  const isOwner = admin?.role === "OWNER";
  const [createOpened, setCreateOpened] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isCreateRequested = isOwner && (location.state as DashboardRouteState | null)?.dashboardAction === "CREATE_PRODUCT";
  const closeCreate = () => { setCreateOpened(false); if (isCreateRequested) navigate(location.pathname, { replace: true, state: null }); };

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
        opened={isOwner && (createOpened || isCreateRequested)}
        onClose={closeCreate}
      />

      <EditProductModal
        opened={isOwner && selectedProduct !== null}
        product={selectedProduct}
        onClose={closeEdit}
      />
    </>
  );
}
