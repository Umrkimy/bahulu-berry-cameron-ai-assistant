import { Button, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconBox, IconClipboardList, IconFilePlus, IconTruck, IconUserPlus } from "@tabler/icons-react";

const prompts = [
  {
    label: "Start my shift",
    description: "Review team tasks, fulfilment, delivery, and support.",
    message: "Start my shift with a team operational handover.",
    icon: IconClipboardList,
  },
  {
    label: "Low-stock review",
    description: "Check live inventory warnings before work begins.",
    message: "Show the current low-stock warnings.",
    icon: IconBox,
  },
  {
    label: "Delivery issues",
    description: "Review the current delivery workload and any delivery issues.",
    message: "Show the current delivery workload and any delivery issues.",
    icon: IconTruck,
  },
  {
    label: "Team task overview",
    description: "Review the team workload for the current shift.",
    message: "Give me the team task overview.",
    icon: IconClipboardList,
  },
  {
    label: "Prepare a task",
    description: "Prepare a task assignment for your review.",
    message: "Help me prepare a task assignment for a team member.",
    icon: IconUserPlus,
  },
  {
    label: "Prepare customer or order",
    description: "Gather details for a customer, order, stock, status, or eligible cancellation preview.",
    message: "Help me prepare a customer, order, stock adjustment, order update, or eligible cancellation.",
    icon: IconFilePlus,
  },
];

export default function OwnerQuickPrompts({
  onSelect,
}: {
  onSelect: (message: string) => void;
}) {
  return (
    <Stack gap="md" w="100%" maw={760}>
      <Stack gap={2} ta="center">
        <Text fw={700}>Owner operations copilot</Text>
        <Text size="sm" c="dimmed">
          Use live data for daily work. Proposed changes stay in preview until you confirm them.
        </Text>
      </Stack>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {prompts.map(({ label, description, message, icon: Icon }) => (
          <Card key={label} withBorder p="md">
            <Stack gap="xs">
              <Group gap="xs">
                <Icon size={18} />
                <Text fw={700} size="sm">
                  {label}
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                {description}
              </Text>
              <Button
                size="xs"
                variant="light"
                onClick={() => onSelect(message)}
              >
                Ask Copilot
              </Button>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
