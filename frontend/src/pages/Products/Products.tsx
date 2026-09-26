import { Button, Group } from "@mantine/core";
import { IconDownload, IconUpload } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import ProductImportModal from "../../components/product/ProductImportModal";
import ProductTable from "../../components/product/ProductTable";
import PageHeader from "../../components/common/PageHeader";
import useAuth from "../../auth/useAuth";

import { downloadProductImportTemplate } from "../../api/products";

export default function ProductsPage() {
  const { admin } = useAuth();
  const isOwner = admin?.role === "OWNER";
  const [importOpened, setImportOpened] = useState(false);
  const navigate = useNavigate();
  const downloadTemplate = async () => {
    const blob = await downloadProductImportTemplate();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "bahulu-product-import-template.csv"; link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage products, prices, promotions, and availability."
        action={isOwner ? <Group gap="xs"><Button variant="default" leftSection={<IconDownload size={16} />} onClick={() => void downloadTemplate()}>CSV template</Button><Button variant="light" leftSection={<IconUpload size={16} />} onClick={() => setImportOpened(true)}>Import CSV</Button><Button onClick={() => navigate("/products/new")}>Add Product</Button></Group> : undefined}
      />

      <ProductTable onEdit={(product) => navigate(`/products/${product.id}`)} />
      <ProductImportModal opened={isOwner && importOpened} onClose={() => setImportOpened(false)} />
    </>
  );
}
