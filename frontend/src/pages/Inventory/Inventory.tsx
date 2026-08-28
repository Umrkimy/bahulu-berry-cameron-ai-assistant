import { Card } from "@mantine/core";
import InventoryTable from "../../components/inventory/InventoryTable";
import PageHeader from "../../components/common/PageHeader";

export default function InventoryPage() {
  return (
    <>
      <PageHeader title="Inventory" description="Monitor stock levels and keep products available." />
      <Card withBorder p="md">
      <InventoryTable />
      </Card>
    </>
  );
}
