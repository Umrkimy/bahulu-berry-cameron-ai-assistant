import {
  ActionIcon,
  Group,
  Paper,
  Select,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconSearch,
  IconSelector,
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

interface DataTableProps<TData extends object> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  loading?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  pageSizeOptions?: string[];
}

export default function DataTable<TData extends object>({
  data,
  columns,
  loading = false,
  searchPlaceholder = "Search...",
  emptyMessage = "No records found.",
  pageSizeOptions = ["10", "20", "30", "50"],
}: DataTableProps<TData>) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data,
    columns,

    state: {
      globalFilter,
      sorting,
      pagination,
    },

    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,

    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const rows = table.getRowModel().rows;

  const totalRows = table.getFilteredRowModel().rows.length;

  const startRow =
    totalRows === 0
      ? 0
      : pagination.pageIndex * pagination.pageSize + 1;

  const endRow = Math.min(
    (pagination.pageIndex + 1) * pagination.pageSize,
    totalRows,
  );

  return (
    <Paper
      withBorder
      radius="md"
      style={{
        overflow: "hidden",
      }}
    >
      {/* SEARCH */}
      <Group
        justify="space-between"
        p="md"
        style={{
          borderBottom:
            "1px solid var(--mantine-color-gray-2)",
        }}
      >
        <TextInput
          placeholder={searchPlaceholder}
          leftSection={<IconSearch size={16} />}
          value={globalFilter}
          onChange={(event) => {
            setGlobalFilter(event.currentTarget.value);

            setPagination((current) => ({
              ...current,
              pageIndex: 0,
            }));
          }}
          w={280}
        />
      </Group>

      {/* TABLE */}
      <div
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
                        background:
                          "var(--mantine-color-gray-0)",
                        borderBottom:
                          "1px solid var(--mantine-color-gray-2)",
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
            {loading ? (
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
                    borderBottom:
                      "1px solid var(--mantine-color-gray-2)",
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

      {/* PAGINATION */}
      <Group
        justify="space-between"
        p="md"
        style={{
          borderTop:
            "1px solid var(--mantine-color-gray-2)",
        }}
      >
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            Rows per page
          </Text>

          <Select
            size="xs"
            w={80}
            value={String(pagination.pageSize)}
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