import {
  ActionIcon,
  Box,
  Card,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconSearch,
  IconSelector,
  IconRefresh,
} from "@tabler/icons-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import type { ReactNode } from "react";
import { AnimatedList, AnimatedListItem } from "../motion/AnimatedList";

interface DataTableProps<TData extends object> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  pageSizeOptions?: string[];
  toolbar?: ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  manualPagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  renderMobileCard?: (record: TData) => ReactNode;
}

export default function DataTable<TData extends object>({
  data,
  columns,
  loading = false,
  error = false,
  errorMessage = "We couldn't load these records.",
  onRetry,
  searchPlaceholder = "Search...",
  emptyMessage = "No records found.",
  pageSizeOptions = ["10", "20", "30", "50"],
  toolbar,
  searchValue,
  onSearchChange,
  manualPagination,
  renderMobileCard,
}: DataTableProps<TData>) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // TanStack Table returns mutable instance methods by design; this component does not pass the instance to memoized children.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,

    state: {
      globalFilter: searchValue ?? globalFilter,
      sorting,
      pagination: manualPagination
        ? { pageIndex: manualPagination.page - 1, pageSize: manualPagination.pageSize }
        : pagination,
    },

    onGlobalFilterChange: (value) => {
      setGlobalFilter(value);
      onSearchChange?.(value);
    },
    onSortingChange: setSorting,
    onPaginationChange: manualPagination
      ? (updater) => {
          const current = { pageIndex: manualPagination.page - 1, pageSize: manualPagination.pageSize };
          const next = typeof updater === "function" ? updater(current) : updater;
          if (next.pageSize !== current.pageSize) {
            manualPagination.onPageSizeChange(next.pageSize);
          } else if (next.pageIndex !== current.pageIndex) {
            manualPagination.onPageChange(next.pageIndex + 1);
          }
        }
      : setPagination,

    manualPagination: Boolean(manualPagination),
    pageCount: manualPagination ? Math.max(1, Math.ceil(manualPagination.total / manualPagination.pageSize)) : undefined,

    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(manualPagination ? {} : { getPaginationRowModel: getPaginationRowModel() }),
  });

  const rows = table.getRowModel().rows;

  const totalRows = manualPagination ? manualPagination.total : table.getFilteredRowModel().rows.length;

  const startRow =
    totalRows === 0
      ? 0
      : manualPagination
        ? (manualPagination.page - 1) * manualPagination.pageSize + 1
        : pagination.pageIndex * pagination.pageSize + 1;

  const endRow = Math.min(
    manualPagination
      ? manualPagination.page * manualPagination.pageSize
      : (pagination.pageIndex + 1) * pagination.pageSize,
    totalRows,
  );

  const resetTable = () => {
    setGlobalFilter("");
    onSearchChange?.("");
    setSorting([]);
    if (manualPagination) {
      manualPagination.onPageChange(1);
    } else {
      table.setPageIndex(0);
    }
  };

  return (
    <Paper
      withBorder
      radius="md"
      style={{
        overflow: "hidden",
        background: "rgba(255, 255, 255, 0.88)",
        borderColor: "#f0dcd8",
      }}
    >
      {/* SEARCH */}
      <Group
        className="data-table-toolbar"
        justify="space-between"
        p="md"
        style={{
          borderBottom:
            "1px solid #f1e1de",
        }}
      >
        <Group gap="xs" wrap="wrap">
          <TextInput
            className="data-table-search"
            placeholder={searchPlaceholder}
            leftSection={<IconSearch size={16} />}
            value={searchValue ?? globalFilter}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setGlobalFilter(value);
              onSearchChange?.(value);
              setPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
            w={280}
          />
          <Tooltip label="Reset search and sorting">
            <ActionIcon variant="subtle" color="gray" onClick={resetTable} aria-label="Reset table controls">
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
          <Text size="sm" c="dimmed">{totalRows} visible</Text>
        </Group>
        {toolbar}
      </Group>

      {/* TABLE */}
      <div className="data-table-desktop"
        style={{
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();

                  const canSort = header.column.getCanSort();

                  return (
                    <th
                      key={header.id}
                      style={{
                        padding: "14px 16px",
                        textAlign: "left",
                        fontSize: "13px",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        background: "#fff7f4",
                        borderBottom:
                          "1px solid #f1e1de",
                      }}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <UnstyledButton
                          onClick={header.column.getToggleSortingHandler()}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontWeight: 600,
                          }}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}

                          {sorted === "asc" ? (
                            <IconChevronUp size={15} />
                          ) : sorted === "desc" ? (
                            <IconChevronDown size={15} />
                          ) : (
                            <IconSelector size={15} />
                          )}
                        </UnstyledButton>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            fontWeight: 600,
                          }}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {/* LOADING */}
            {error ? (
              <tr><td colSpan={columns.length} style={{ padding: "40px", textAlign: "center" }}><Stack align="center" gap="xs"><Text c="red">{errorMessage}</Text>{onRetry ? <ActionIcon variant="light" color="bahulu" aria-label="Try loading records again" onClick={onRetry}><IconRefresh size={16} /></ActionIcon> : null}</Stack></td></tr>
            ) : loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: "40px",
                    textAlign: "center",
                  }}
                >
                  <Text c="dimmed">
                    Loading...
                  </Text>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              /* EMPTY */
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: "40px",
                    textAlign: "center",
                  }}
                >
                  <Text c="dimmed">
                    {emptyMessage}
                  </Text>
                </td>
              </tr>
            ) : (
              /* ROWS */
              rows.map((row) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: "1px solid #f6e8e5",
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{
                        padding: "14px 16px",
                        fontSize: "14px",
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Box className="data-table-mobile" p="sm">
        {error ? (
          <Stack align="center" py="xl" gap="xs"><Text c="red" ta="center">{errorMessage}</Text>{onRetry ? <ActionIcon variant="light" color="bahulu" aria-label="Try loading records again" onClick={onRetry}><IconRefresh size={16} /></ActionIcon> : null}</Stack>
        ) : loading ? (
          <Text c="dimmed" ta="center" py="xl">Loading...</Text>
        ) : rows.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">{emptyMessage}</Text>
        ) : (
          <Stack gap="sm">
            <AnimatedList>{rows.map((row) => renderMobileCard ? (
              <AnimatedListItem key={row.id} itemKey={row.id}><Box>{renderMobileCard(row.original)}</Box></AnimatedListItem>
            ) : (
              <AnimatedListItem key={row.id} itemKey={row.id}><Card withBorder radius="md" p="sm" className="data-table-mobile-card">
                <Stack gap="xs">
                  {row.getVisibleCells().map((cell) => {
                    const label = typeof cell.column.columnDef.header === "string"
                      ? cell.column.columnDef.header
                      : cell.column.id === "actions" ? "Actions" : cell.column.id;
                    return (
                      <Group key={cell.id} justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
                        <Text size="xs" c="dimmed" fw={600}>{label}</Text>
                        <Box ta="right" style={{ minWidth: 0 }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Box>
                      </Group>
                    );
                  })}
                </Stack>
              </Card></AnimatedListItem>
            ))}</AnimatedList>
          </Stack>
        )}
      </Box>

      {/* PAGINATION */}
      <Group
        className="data-table-pagination"
        justify="space-between"
        p="md"
        style={{
          borderTop:
            "1px solid #f1e1de",
        }}
      >
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            Rows per page
          </Text>

          <Select
            size="xs"
            w={80}
            value={String(manualPagination?.pageSize ?? pagination.pageSize)}
            data={pageSizeOptions}
            onChange={(value) => {
              if (!value) return;

              const newSize = Number(value);

              table.setPageSize(newSize);
              table.setPageIndex(0);
            }}
          />
        </Group>

        <Group gap="xs">
          <Text size="sm" c="dimmed">
            {startRow}-{endRow} of {totalRows}
          </Text>

          <ActionIcon
            variant="default"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            aria-label="Previous page"
          >
            <IconChevronUp
              size={16}
              style={{
                transform: "rotate(-90deg)",
              }}
            />
          </ActionIcon>

          <ActionIcon
            variant="default"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            aria-label="Next page"
          >
            <IconChevronDown
              size={16}
              style={{
                transform: "rotate(-90deg)",
              }}
            />
          </ActionIcon>
        </Group>
      </Group>
    </Paper>
  );
}
