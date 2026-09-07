import { Button, Card } from "@mantine/core";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import CreateOrderModal from "../../components/orders/CreateOrderModal";
import OrdersTable from "../../components/orders/OrdersTable";
import PageHeader from "../../components/common/PageHeader";
import type { DashboardRouteState } from "../../types/navigation";

export default function Orders() {
  const [createOpened, setCreateOpened] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isCreateRequested = (location.state as DashboardRouteState | null)?.dashboardAction === "CREATE_ORDER";
  const closeCreate = () => { setCreateOpened(false); if (isCreateRequested) navigate(location.pathname, { replace: true, state: null }); };
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
        opened={createOpened || isCreateRequested}
        onClose={closeCreate}
      />
    </>
  );
}
