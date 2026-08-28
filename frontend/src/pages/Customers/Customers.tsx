import { Button, Card } from "@mantine/core";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type { Customer } from "../../api/customers";
import CreateCustomerModal from "../../components/customer/CreateCustomerModal";
import CustomerTable from "../../components/customer/CustomerTable";
import EditCustomerModal from "../../components/customer/EditCustomerModal";
import PageHeader from "../../components/common/PageHeader";

export default function Customers() {
  const [createOpened, setCreateOpened] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateOpened(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
      />

      <EditCustomerModal
        opened={selectedCustomer !== null}
        customer={selectedCustomer}
        onClose={closeEdit}
      />
    </>
  );
}
