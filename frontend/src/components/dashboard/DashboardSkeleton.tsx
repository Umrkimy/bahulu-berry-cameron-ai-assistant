import { Card, SimpleGrid, Skeleton, Stack } from "@mantine/core";

export default function DashboardSkeleton() {
  return (
    <Stack gap="lg">
      {/* Stats loading */}

      <SimpleGrid
        cols={{
          base: 1,
          sm: 2,
          lg: 3,
        }}
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} withBorder radius="md" p="md">
            <Skeleton height={14} width="40%" mb="sm" />

            <Skeleton height={28} width="60%" />
          </Card>
        ))}
      </SimpleGrid>

      {/* Chart loading */}

      <Card withBorder radius="md" p="lg">
        <Skeleton height={240} />
      </Card>

      {/* Table loading */}

      <Card withBorder radius="md" p="lg">
        <Skeleton height={250} />
      </Card>
    </Stack>
  );
}
