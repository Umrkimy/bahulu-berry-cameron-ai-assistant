import { useMemo } from "react";
import { Button, Group, Text } from "@mantine/core";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "../common/DataTable";

import { useCustomers } from "../../hooks/useCustomers";
import type { Customer } from "../../api/customers";

interface Props {
  onEdit: (customer: Customer) => void;
}

export default function CustomerTable({ onEdit }: Props) {
  const { data: customers, isLoading } = useCustomers();

  const columns = useMemo<ColumnDef<Customer, unknown>[]>(
    () => [
      {
        id: "customer",
        accessorKey: "full_name",
        header: "Customer",
        cell: ({ row }) => <Text fw={600}>{row.original.full_name}</Text>,
      },
      {
        id: "phone",
        accessorKey: "phone_number",
        header: "Phone",
        cell: ({ row }) => <Text size="sm">{row.original.phone_number}</Text>,
      },
      {
        id: "email",
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <Text size="sm" c={row.original.email ? undefined : "dimmed"}>
            {row.original.email ?? "No email"}
          </Text>
        ),
      },
      {
        id: "location",
        header: "Location",
        accessorFn: (row) => [row.city, row.state].filter(Boolean).join(", "),
        cell: ({ row }) => {
          const location = [row.original.city, row.original.state]
            .filter(Boolean)
            .join(", ");

          return (
            <Text size="sm" c={location ? undefined : "dimmed"}>
              {location || "No location"}
            </Text>
          );
        },
      },
      {
        id: "joined",
        accessorKey: "created_at",
        header: "Joined",
        cell: ({ row }) => (
          <Text size="sm">
            {new Date(row.original.created_at).toLocaleDateString("en-MY")}
          </Text>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              onClick={() => onEdit(row.original)}
            >
              Edit
            </Button>
          </Group>
        ),
      },
    ],
    [onEdit],
  );

  return (
    <DataTable
      data={customers ?? []}
      columns={columns}
      loading={isLoading}
      searchPlaceholder="Search customers..."
      emptyMessage="No customers found."
    />
  );
}
