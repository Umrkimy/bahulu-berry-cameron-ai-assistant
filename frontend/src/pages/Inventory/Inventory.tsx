import { Card, Stack } from "@mantine/core";
import InventoryTable from "../../components/inventory/InventoryTable";
import StockMovementHistory from "../../components/inventory/StockMovementHistory";
import PageHeader from "../../components/common/PageHeader";

export default function InventoryPage() {
  return (
    <>
      <PageHeader title="Inventory" description="Monitor stock levels and keep products available." />
      <Stack><Card withBorder p="md"><InventoryTable /></Card><StockMovementHistory /></Stack>
    </>
  );
}
