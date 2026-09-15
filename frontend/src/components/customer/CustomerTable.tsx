import { useCallback, useMemo } from "react";
import { ActionIcon, Card, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconArchive, IconEdit, IconRestore } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "../common/DataTable";

import { useArchiveCustomer, useCustomers, useRestoreCustomer } from "../../hooks/useCustomers";
import type { Customer, CustomerStatus } from "../../api/customers";
import useAuth from "../../auth/useAuth";
import { notifications } from "@mantine/notifications";

interface Props {
  onEdit: (customer: Customer) => void;
  customerStatus: CustomerStatus;
}

export default function CustomerTable({ onEdit, customerStatus }: Props) {
  const { data: customers, isLoading } = useCustomers(customerStatus);
  const { admin } = useAuth();
  const archiveCustomer = useArchiveCustomer();
  const restoreCustomer = useRestoreCustomer();
  const isOwner = admin?.role === "OWNER";
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
            {!archived && <Tooltip label="Edit customer">
              <ActionIcon
              aria-label="Edit customer"
              variant="light"
              onClick={() => onEdit(row.original)}
              >
                <IconEdit size={18} />
              </ActionIcon>
            </Tooltip>}
            {isOwner && <Tooltip label={archived ? "Restore customer" : "Archive customer"}>
              <ActionIcon aria-label={archived ? "Restore customer" : "Archive customer"} variant="light" color={archived ? "green" : "orange"} loading={archiveCustomer.isPending || restoreCustomer.isPending} onClick={() => void changeArchiveState(row.original)}>
                {archived ? <IconRestore size={18} /> : <IconArchive size={18} />}
              </ActionIcon>
            </Tooltip>}
          </Group>
        ),
      },
    ],
    [onEdit, isOwner, archived, archiveCustomer.isPending, restoreCustomer.isPending, changeArchiveState],
  );

  return (
    <DataTable
      data={customers ?? []}
      columns={columns}
      loading={isLoading}
      searchPlaceholder="Search customers..."
      emptyMessage={archived ? "No archived customers found." : "No active customers found."}
      renderMobileCard={(customer) => (
        <Card withBorder radius="md" p="sm">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Stack gap={2}><Text fw={700}>{customer.full_name}</Text><Text size="sm">{customer.phone_number}</Text><Text size="xs" c="dimmed">{customer.email ?? "No email"}{customer.city || customer.state ? ` · ${[customer.city, customer.state].filter(Boolean).join(", ")}` : ""}</Text></Stack>
            <Group gap="xs">{!archived && <ActionIcon aria-label="Edit customer" variant="light" onClick={() => onEdit(customer)}><IconEdit size={18} /></ActionIcon>}{isOwner && <ActionIcon aria-label={archived ? "Restore customer" : "Archive customer"} variant="light" color={archived ? "green" : "orange"} onClick={() => void changeArchiveState(customer)}>{archived ? <IconRestore size={18} /> : <IconArchive size={18} />}</ActionIcon>}</Group>
          </Group>
        </Card>
      )}
    />
  );
}
