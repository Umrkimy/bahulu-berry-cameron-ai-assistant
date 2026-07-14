import { Card, RingProgress, Text, Group } from "@mantine/core";

export default function OrderStatusCard() {
  return (
    <Card withBorder radius="md" p="xl">
      <Text fw={700} fz="xl">
        Order Status
      </Text>

      <Group justify="center" mt="lg">
        <RingProgress
          size={160}
          thickness={10}
          roundCaps
          sections={[
            {
              value: 85,
              color: "red",
            },
          ]}
          label={
            <Text ta="center" fw={700}>
              85%
            </Text>
          }
        />
      </Group>

      <Text ta="center" c="dimmed" mt="md">
        102 completed out of 120 orders
      </Text>
    </Card>
  );
}
