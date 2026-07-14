import { Card, SimpleGrid, Skeleton, Stack } from "@mantine/core";

export default function DashboardSkeleton() {
  return (
    <Stack gap="lg">
      {/* Stats loading */}

      <SimpleGrid
        cols={{
          base: 1,
          sm: 2,
          lg: 4,
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} withBorder radius="md" p="lg">
            <Skeleton height={20} width="40%" mb="md" />

            <Skeleton height={35} width="60%" />
          </Card>
        ))}
      </SimpleGrid>

      {/* Chart loading */}

      <Card withBorder radius="md" p="lg">
        <Skeleton height={300} />
      </Card>

      {/* Table loading */}

      <Card withBorder radius="md" p="lg">
        <Skeleton height={250} />
      </Card>
    </Stack>
  );
}
