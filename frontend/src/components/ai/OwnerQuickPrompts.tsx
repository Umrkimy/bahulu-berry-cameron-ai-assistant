import { SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
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
      <Text size="sm" c="dimmed" ta="center">Start with one of these, or type your own question below.</Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        {prompts.map(({ label, description, message, icon: Icon }) => (
          <UnstyledButton key={label} className="prompt-tile" onClick={() => onSelect(message)} aria-label={`Ask Berry: ${label}`}>
            <span className="list-row-icon"><Icon size={16} stroke={1.75} /></span>
            <span>
              <Text fw={500} size="sm">{label}</Text>
              <Text size="sm" c="dimmed">{description}</Text>
            </span>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
