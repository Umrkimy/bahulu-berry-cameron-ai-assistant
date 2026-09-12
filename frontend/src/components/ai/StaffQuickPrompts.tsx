import { Button, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconBox, IconMessage2, IconTruck, IconClipboardList } from "@tabler/icons-react";
import { Link } from "react-router-dom";

const prompts = [
  { label: "Start my shift", description: "Get your live operational handover.", message: "Start my shift with my operational handover.", icon: IconClipboardList },
  { label: "Low-stock review", description: "Show current low-stock warnings.", message: "Show the current low-stock warnings.", icon: IconBox },
  { label: "Paid orders", description: "Review paid orders awaiting fulfilment.", message: "Show paid orders awaiting fulfilment.", icon: IconClipboardList },
  { label: "Order & delivery", description: "Look up an order’s payment and delivery state.", message: "I need to look up an order and delivery status.", icon: IconTruck },
  { label: "Support workload", description: "See new, waiting, and assigned support tickets.", message: "Show my current support queue workload.", icon: IconMessage2 },
  { label: "Support reply draft", description: "Open a ticket workspace to prepare a cited internal draft.", href: "/whatsapp", icon: IconMessage2 },
  { label: "Delivery issues", description: "Review delivery workload and reported issues.", message: "Show the current delivery workload and any delivery issues.", icon: IconTruck },
];

export default function StaffQuickPrompts({ onSelect }: { onSelect: (message: string) => void }) {
  return <Stack gap="md" w="100%" maw={760}><Stack gap={2} ta="center"><Text fw={700}>Operations Copilot</Text><Text size="sm" c="dimmed">Use live data for daily work. Staff access is read-only.</Text></Stack><SimpleGrid cols={{ base: 1, sm: 2 }}>{prompts.map(({ label, description, message, href, icon: Icon }) => <Card key={label} withBorder p="md"><Stack gap="xs"><Group gap="xs"><Icon size={18} /><Text fw={700} size="sm">{label}</Text></Group><Text size="xs" c="dimmed">{description}</Text>{href ? <Button component={Link} to={href} size="xs" variant="light">Open Support Queue</Button> : <Button size="xs" variant="light" onClick={() => onSelect(message!)}>Ask Copilot</Button>}</Stack></Card>)}</SimpleGrid></Stack>;
}
