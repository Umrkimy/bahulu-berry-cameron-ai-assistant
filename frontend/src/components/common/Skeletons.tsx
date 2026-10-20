import { Card, Group, SimpleGrid, Skeleton, Stack } from "@mantine/core";

export function LinesSkeleton({ lines = 3, label = "Loading" }: { lines?: number; label?: string }) {
  return (
    <Stack gap="sm" role="status" aria-label={label}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} height={12} width={`${[92, 78, 64, 85, 70][index % 5]}%`} />
      ))}
    </Stack>
  );
}

export function CardSkeleton({ lines = 3, label }: { lines?: number; label?: string }) {
  return (
    <Card withBorder p="lg">
      <Skeleton height={14} width="35%" mb="lg" />
      <LinesSkeleton lines={lines} label={label} />
    </Card>
  );
}

export function TableRowsSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <Stack gap={14} p="md" role="status" aria-label="Loading rows">
      {Array.from({ length: rows }).map((_, row) => (
        <Group key={row} gap="lg" wrap="nowrap">
          {Array.from({ length: columns }).map((__, column) => (
            <Skeleton key={column} height={12} style={{ flex: column === 0 ? 2 : 1 }} />
          ))}
        </Group>
      ))}
    </Stack>
  );
}

export function PageSkeleton({ withHeader = true }: { withHeader?: boolean }) {
  return (
    <Stack gap="lg" role="status" aria-label="Loading page">
      {withHeader ? <Group justify="space-between" align="flex-start">
        <Stack gap={8} style={{ flex: 1 }}>
          <Skeleton height={24} width={180} />
          <Skeleton height={12} width="45%" />
        </Stack>
        <Skeleton height={36} width={120} radius="md" />
      </Group> : null}
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} withBorder p="md">
            <Skeleton height={12} width="45%" mb="sm" />
            <Skeleton height={24} width="60%" />
          </Card>
        ))}
      </SimpleGrid>
      <Card withBorder p={0}>
        <TableRowsSkeleton rows={6} />
      </Card>
    </Stack>
  );
}
