import { Button, Card } from "@mantine/core";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import type { Customer } from "../../api/customers";
import CreateCustomerModal from "../../components/customer/CreateCustomerModal";
import CustomerTable from "../../components/customer/CustomerTable";
import EditCustomerModal from "../../components/customer/EditCustomerModal";
import PageHeader from "../../components/common/PageHeader";
import type { DashboardRouteState } from "../../types/navigation";

export default function Customers() {
  const [createOpened, setCreateOpened] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const routeAction = (location.state as DashboardRouteState | null)?.dashboardAction;
  const isCreateRequested = routeAction === "CREATE_CUSTOMER";
  const closeCreate = () => { setCreateOpened(false); if (isCreateRequested) navigate(location.pathname, { replace: true, state: null }); };

  function openEdit(customer: Customer) {
    setSelectedCustomer(customer);
  }

  function closeEdit() {
    setSelectedCustomer(null);
  }

  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage customer details and contact information."
        action={<Button onClick={() => setCreateOpened(true)}>Add Customer</Button>}
      />

      <Card withBorder p={0} style={{ overflow: "hidden" }}>
        <CustomerTable onEdit={openEdit} />
      </Card>

      <CreateCustomerModal
        opened={createOpened || isCreateRequested}
        onClose={closeCreate}
      />

      <EditCustomerModal
        opened={selectedCustomer !== null}
        customer={selectedCustomer}
        onClose={closeEdit}
      />
    </>
  );
}
