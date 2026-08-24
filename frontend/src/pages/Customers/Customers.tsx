import { Button, Card, Group, Text } from "@mantine/core";
import { useState } from "react";

import type { Customer } from "../../api/customers";
import CreateCustomerModal from "../../components/customer/CreateCustomerModal";
import CustomerTable from "../../components/customer/CustomerTable";
import EditCustomerModal from "../../components/customer/EditCustomerModal";

export default function Customers() {
  const [createOpened, setCreateOpened] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  return (
    <Card withBorder radius="md" p="lg">
      <Group justify="space-between" mb="md">
        <div>
          <Text fw={700} size="lg">
            Customers Management
          </Text>

          <Text c="dimmed" size="sm">
            Manage customer details and contact information
          </Text>
        </div>

        <Button onClick={() => setCreateOpened(true)}>Add Customer</Button>
      </Group>

      <CustomerTable onEdit={setSelectedCustomer} />

      <CreateCustomerModal
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
      />

      <EditCustomerModal
        opened={selectedCustomer !== null}
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </Card>
  );
}
