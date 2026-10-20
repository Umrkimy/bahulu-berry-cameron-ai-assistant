import { Button, Group, Menu } from "@mantine/core";
import { IconChevronDown, IconDownload, IconUpload } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import ProductImportModal from "../../components/product/ProductImportModal";
import ProductTable from "../../components/product/ProductTable";
import PageHeader from "../../components/common/PageHeader";
import useAuth from "../../auth/useAuth";

import { downloadProductImportTemplate } from "../../api/products";
import { can } from "../../auth/permissions";

export default function ProductsPage() {
  const { admin } = useAuth();
  const canManage = can(admin, "products.manage");
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
        action={canManage ? <Group gap="xs"><Menu position="bottom-end" withinPortal><Menu.Target><Button variant="default" rightSection={<IconChevronDown size={16} />}>CSV</Button></Menu.Target><Menu.Dropdown><Menu.Item leftSection={<IconUpload size={16} />} onClick={() => setImportOpened(true)}>Import products from CSV</Menu.Item><Menu.Item leftSection={<IconDownload size={16} />} onClick={() => void downloadTemplate()}>Download CSV template</Menu.Item></Menu.Dropdown></Menu><Button onClick={() => navigate("/products/new")}>Add Product</Button></Group> : undefined}
      />

      <ProductTable onEdit={(product) => navigate(`/products/${product.id}`)} />
      <ProductImportModal opened={canManage && importOpened} onClose={() => setImportOpened(false)} />
    </>
  );
}
