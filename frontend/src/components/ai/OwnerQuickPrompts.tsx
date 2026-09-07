import { Button, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconClipboardList, IconUserPlus } from "@tabler/icons-react";

const prompts = [
  {
    label: "Team task overview",
    description: "Review the team workload for the current shift.",
    message: "Give me the team task overview.",
    icon: IconClipboardList,
  },
  {
    label: "Assign a task",
    description: "Delegate work to an active team member with confirmation.",
    message: "Assign a task to a team member.",
    icon: IconUserPlus,
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
          Review live operations or prepare a task for your confirmation.
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
                Ask AI
              </Button>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
