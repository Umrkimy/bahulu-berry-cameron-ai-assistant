import { Alert, Button, Card, Stack } from "@mantine/core";
import { IconPackageImport } from "@tabler/icons-react";
import { useState } from "react";
import InventoryTable from "../../components/inventory/InventoryTable";
import StockMovementHistory from "../../components/inventory/StockMovementHistory";
import BatchStockReceiptModal from "../../components/inventory/BatchStockReceiptModal";
import PageHeader from "../../components/common/PageHeader";
import { useInventories } from "../../hooks/useInventory";
import { useSearchParams } from "react-router-dom";

export default function InventoryPage() {
  const [receivingOpened, setReceivingOpened] = useState(false);
  const { data: inventories = [] } = useInventories();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedProductId = Number(searchParams.get("product_id"));
  const productId = Number.isSafeInteger(requestedProductId) && requestedProductId > 0 ? requestedProductId : null;
  const productName = inventories.find((inventory) => inventory.product_id === productId)?.product_name;
  return (
    <>
      <PageHeader title="Inventory" description="Monitor stock levels and keep products available." action={<Button leftSection={<IconPackageImport size={16} />} onClick={() => setReceivingOpened(true)}>Receive stock</Button>} />
      {productId ? <Alert mb="md" color="blue" title={`Inventory for ${productName ?? `product #${productId}`}`}><Button variant="subtle" size="compact-sm" onClick={() => setSearchParams({})}>Show all inventory</Button></Alert> : null}
      <Stack><Card withBorder p="md"><InventoryTable productId={productId} /></Card><StockMovementHistory productId={productId} /></Stack>
      <BatchStockReceiptModal opened={receivingOpened} onClose={() => setReceivingOpened(false)} inventories={inventories} />
    </>
  );
}
