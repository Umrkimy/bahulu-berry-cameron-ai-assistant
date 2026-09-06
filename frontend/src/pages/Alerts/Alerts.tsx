import { useMemo, useState } from "react";
import { Badge, Button, Group, Select, Text } from "@mantine/core";
import { IconArrowUpRight, IconRefresh } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";

import PageHeader from "../../components/common/PageHeader";
import { DataTable } from "../../components/common/DataTable";
import useAuth from "../../auth/useAuth";
import { useOperationAlerts } from "../../hooks/useOperationAlerts";
import type { OperationAlert, OperationAlertCategory, OperationAlertSeverity } from "../../types/operations";

const categories: { value: OperationAlertCategory; label: string }[] = [
  { value: "INVENTORY", label: "Inventory" },
  { value: "ORDER", label: "Orders" },
  { value: "SUPPORT", label: "Support" },
  { value: "REFUND", label: "Refunds" },
];

const severities: { value: OperationAlertSeverity; label: string }[] = [
  { value: "CRITICAL", label: "Critical" },
  { value: "WARNING", label: "Warning" },
];

function formatMalaysiaTime(value: string) {
  return new Date(value).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" });
}

export default function Alerts() {
  const { admin } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<OperationAlertCategory | null>(null);
  const [severity, setSeverity] = useState<OperationAlertSeverity | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data, isLoading } = useOperationAlerts({ category, severity, search, limit: pageSize, offset: (page - 1) * pageSize });
  const availableCategories = admin?.role === "OWNER" ? categories : categories.filter((item) => item.value !== "REFUND");

  const resetFilters = () => {
    setSearch("");
    setCategory(null);
    setSeverity(null);
    setPage(1);
  };

  const columns = useMemo<ColumnDef<OperationAlert, unknown>[]>(() => [
    { id: "severity", accessorKey: "severity", header: "Priority", cell: ({ row }) => <Badge color={row.original.severity === "CRITICAL" ? "red" : "orange"} variant="light">{row.original.severity}</Badge> },
    { id: "category", accessorKey: "category", header: "Area", cell: ({ row }) => <Text fw={600}>{row.original.category}</Text> },
    { id: "attention", accessorKey: "title", header: "Needs attention", cell: ({ row }) => <><Text fw={600}>{row.original.title}</Text><Text size="xs" c="dimmed">{row.original.description}</Text></> },
    { id: "updated", accessorKey: "source_at", header: "Updated", cell: ({ row }) => <Text size="sm">{formatMalaysiaTime(row.original.source_at)}</Text> },
    { id: "action", header: "Open", enableSorting: false, cell: ({ row }) => <Button component={Link} to={row.original.href} size="xs" variant="subtle" rightSection={<IconArrowUpRight size={13} />}>Open</Button> },
  ], []);

  return <>
    <PageHeader title="Operations Alerts" description="Live operational issues. Resolve the underlying work and the alert clears automatically." action={<Group><Badge color="red" variant="light">{data?.counts.critical ?? 0} critical</Badge><Badge color="orange" variant="light">{data?.counts.warning ?? 0} warnings</Badge></Group>} />
    <DataTable
      data={data?.items ?? []}
      columns={columns}
      loading={isLoading}
      searchValue={search}
      onSearchChange={(value) => { setSearch(value); setPage(1); }}
      searchPlaceholder="Search alerts..."
      emptyMessage="No operational alerts right now."
      manualPagination={{ page, pageSize, total: data?.total ?? 0, onPageChange: setPage, onPageSizeChange: (value) => { setPageSize(value); setPage(1); } }}
      toolbar={<Group gap="xs" wrap="wrap"><Select aria-label="Filter alerts by area" clearable data={availableCategories} placeholder="All areas" value={category} onChange={(value) => { setCategory(value as OperationAlertCategory | null); setPage(1); }} w={140} /><Select aria-label="Filter alerts by priority" clearable data={severities} placeholder="All priorities" value={severity} onChange={(value) => { setSeverity(value as OperationAlertSeverity | null); setPage(1); }} w={145} /><Button leftSection={<IconRefresh size={15} />} size="xs" variant="default" onClick={resetFilters}>Reset filters</Button></Group>}
    />
  </>;
}
