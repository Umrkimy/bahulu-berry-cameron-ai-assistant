import { useCallback, useMemo } from "react";
import { Card, Group, Stack, Text } from "@mantine/core";
import { IconArchive, IconEdit, IconRestore } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "../common/DataTable";
import RowActions, { type RowAction } from "../common/DataTable/RowActions";

import { useArchiveCustomer, useCustomers, useRestoreCustomer } from "../../hooks/useCustomers";
import type { Customer, CustomerStatus } from "../../api/customers";
import useAuth from "../../auth/useAuth";
import { notifications } from "@mantine/notifications";
import { formatDate } from "../../utils/format";
import { can } from "../../auth/permissions";

interface Props {
  onEdit: (customer: Customer) => void;
  customerStatus: CustomerStatus;
}

export default function CustomerTable({ onEdit, customerStatus }: Props) {
  const { data: customers, isLoading } = useCustomers(customerStatus);
  const { admin } = useAuth();
  const archiveCustomer = useArchiveCustomer();
  const restoreCustomer = useRestoreCustomer();
  const canArchive = can(admin, "customers.archive");
  const archived = customerStatus === "archived";

  const changeArchiveState = useCallback(async (customer: Customer) => {
    try {
      if (archived) await restoreCustomer.mutateAsync(customer.id);
      else await archiveCustomer.mutateAsync(customer.id);
      notifications.show({ title: archived ? "Customer Restored" : "Customer Archived", message: archived ? "The customer is active again." : "The customer and their history have been retained.", color: "green" });
    } catch {
      notifications.show({ title: "Customer Update Failed", message: "The archive status could not be changed.", color: "red" });
    }
  }, [archiveCustomer, archived, restoreCustomer]);

  const customerActions = useCallback((customer: Customer): RowAction[] => [
    { label: "Edit customer", icon: <IconEdit size={16} />, hidden: archived, onClick: () => onEdit(customer) },
    { label: archived ? "Restore customer" : "Archive customer", icon: archived ? <IconRestore size={16} /> : <IconArchive size={16} />, hidden: !canArchive, disabled: archiveCustomer.isPending || restoreCustomer.isPending, onClick: () => void changeArchiveState(customer) },
  ], [archived, canArchive, archiveCustomer.isPending, restoreCustomer.isPending, changeArchiveState, onEdit]);

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
            {formatDate(row.original.created_at)}
          </Text>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => <RowActions label={row.original.full_name} actions={customerActions(row.original)} />,
      },
    ],
    [customerActions],
  );

  return (
    <DataTable
      data={customers ?? []}
      columns={columns}
      loading={isLoading}
      searchPlaceholder="Search customers..."
      emptyMessage={archived ? "No archived customers found." : "No active customers found."}
      onRowClick={archived ? undefined : onEdit}
      renderMobileCard={(customer) => (
        <Card withBorder radius="md" p="sm">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Stack gap={2} style={{ minWidth: 0 }}><Text fw={600}>{customer.full_name}</Text><Text size="sm">{customer.phone_number}</Text><Text size="sm" c="dimmed">{customer.email ?? "No email"}{customer.city || customer.state ? ` · ${[customer.city, customer.state].filter(Boolean).join(", ")}` : ""}</Text></Stack>
            <RowActions label={customer.full_name} actions={customerActions(customer)} />
          </Group>
        </Card>
      )}
    />
  );
}
