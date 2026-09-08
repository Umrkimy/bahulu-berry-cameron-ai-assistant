import { Button, Group } from "@mantine/core";
import { IconDownload, IconUpload } from "@tabler/icons-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import CreateProductModal from "../../components/product/CreateProductModal";
import EditProductModal from "../../components/product/EditProductModal";
import ProductImportModal from "../../components/product/ProductImportModal";
import ProductTable from "../../components/product/ProductTable";
import PageHeader from "../../components/common/PageHeader";
import useAuth from "../../auth/useAuth";

import type { Product } from "../../types/product";
import type { DashboardRouteState } from "../../types/navigation";
import { downloadProductImportTemplate } from "../../api/products";

export default function ProductsPage() {
  const { admin } = useAuth();
  const isOwner = admin?.role === "OWNER";
  const [createOpened, setCreateOpened] = useState(false);
  const [importOpened, setImportOpened] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isCreateRequested = isOwner && (location.state as DashboardRouteState | null)?.dashboardAction === "CREATE_PRODUCT";
  const closeCreate = () => { setCreateOpened(false); if (isCreateRequested) navigate(location.pathname, { replace: true, state: null }); };
  const downloadTemplate = async () => {
    const blob = await downloadProductImportTemplate();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "bahulu-product-import-template.csv"; link.click();
    URL.revokeObjectURL(url);
  };

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
        action={isOwner ? <Group gap="xs"><Button variant="default" leftSection={<IconDownload size={16} />} onClick={() => void downloadTemplate()}>CSV template</Button><Button variant="light" leftSection={<IconUpload size={16} />} onClick={() => setImportOpened(true)}>Import CSV</Button><Button onClick={() => setCreateOpened(true)}>Add Product</Button></Group> : undefined}
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
      <ProductImportModal opened={isOwner && importOpened} onClose={() => setImportOpened(false)} />
    </>
  );
}
