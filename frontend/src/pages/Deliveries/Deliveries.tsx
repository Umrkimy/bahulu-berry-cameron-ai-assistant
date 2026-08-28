import { Card } from "@mantine/core";

import DeliveriesTable from "../../components/delivery/DeliveriesTable";
import PageHeader from "../../components/common/PageHeader";

export default function DeliveryPage() {
  return (
    <>
      <PageHeader title="Deliveries" description="Manage and track customer delivery progress." />
      <Card withBorder p="md">
      <DeliveriesTable />
      </Card>
    </>
  );
}
