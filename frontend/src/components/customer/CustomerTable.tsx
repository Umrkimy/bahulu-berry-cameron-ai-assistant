import { Button, Card, Table, Text } from "@mantine/core";

import { useCustomers } from "../../hooks/useCustomers";
import type { Customer } from "../../api/customers";

interface Props {
  onEdit: (customer: Customer) => void;
}

export default function CustomerTable({ onEdit }: Props) {
  const { data: customers, isLoading } = useCustomers();

  if (isLoading) {
    return (
      <Card withBorder p="lg">
        Loading customers...
      </Card>
    );
  }

  return (
    <Card withBorder radius="md" p="lg">
      <Table.ScrollContainer minWidth={900}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Customer</Table.Th>
              <Table.Th>Phone</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Location</Table.Th>
              <Table.Th>Joined</Table.Th>
              <Table.Th>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {customers?.map((customer) => (
              <Table.Tr key={customer.id}>
                <Table.Td>
                  <Text fw={600}>{customer.full_name}</Text>
                </Table.Td>

                <Table.Td>{customer.phone_number}</Table.Td>

                <Table.Td>{customer.email ?? "-"}</Table.Td>

                <Table.Td>
                  {[customer.city, customer.state].filter(Boolean).join(", ") ||
                    "-"}
                </Table.Td>

                <Table.Td>
                  {new Date(customer.created_at).toLocaleDateString("en-MY")}
                </Table.Td>

                <Table.Td>
                  <Button size="xs" onClick={() => onEdit(customer)}>
                    Edit
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
}
