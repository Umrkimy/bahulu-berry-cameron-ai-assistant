import { Button, Card, Stack } from "@mantine/core";
import { IconPackageImport } from "@tabler/icons-react";
import { useState } from "react";
import InventoryTable from "../../components/inventory/InventoryTable";
import StockMovementHistory from "../../components/inventory/StockMovementHistory";
import BatchStockReceiptModal from "../../components/inventory/BatchStockReceiptModal";
import PageHeader from "../../components/common/PageHeader";
import { useInventories } from "../../hooks/useInventory";

export default function InventoryPage() {
  const [receivingOpened, setReceivingOpened] = useState(false);
  const { data: inventories = [] } = useInventories();
  return (
    <>
      <PageHeader title="Inventory" description="Monitor stock levels and keep products available." action={<Button leftSection={<IconPackageImport size={16} />} onClick={() => setReceivingOpened(true)}>Receive stock</Button>} />
      <Stack><Card withBorder p="md"><InventoryTable /></Card><StockMovementHistory /></Stack>
      <BatchStockReceiptModal opened={receivingOpened} onClose={() => setReceivingOpened(false)} inventories={inventories} />
    </>
  );
}
