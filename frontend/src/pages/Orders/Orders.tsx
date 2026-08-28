import { Button, Card } from "@mantine/core";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import CreateOrderModal from "../../components/orders/CreateOrderModal";
import OrdersTable from "../../components/orders/OrdersTable";
import PageHeader from "../../components/common/PageHeader";

export default function Orders() {
  const [createOpened, setCreateOpened] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateOpened(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  return (
    <>
      <PageHeader
        title="Orders"
        description="Manage customer orders, payments, and delivery progress."
        action={<Button onClick={() => setCreateOpened(true)}>Create Order</Button>}
      />
      <Card withBorder p="md">
      <OrdersTable />
      </Card>

      <CreateOrderModal
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
      />
    </>
  );
}
