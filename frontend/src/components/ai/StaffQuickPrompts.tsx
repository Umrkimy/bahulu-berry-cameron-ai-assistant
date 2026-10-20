import { SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
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
  return <Stack gap="md" w="100%" maw={760}><Text size="sm" c="dimmed" ta="center">Start with one of these, or type your own question below.</Text><SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">{prompts.map(({ label, description, message, href, icon: Icon }) => {
    const body = <><span className="list-row-icon"><Icon size={16} stroke={1.75} /></span><span><Text fw={500} size="sm">{label}</Text><Text size="sm" c="dimmed">{description}</Text></span></>;
    return href
      ? <UnstyledButton key={label} component={Link} to={href} className="prompt-tile" aria-label={`Open Support Queue: ${label}`}>{body}</UnstyledButton>
      : <UnstyledButton key={label} className="prompt-tile" onClick={() => onSelect(message!)} aria-label={`Ask Berry: ${label}`}>{body}</UnstyledButton>;
  })}</SimpleGrid></Stack>;
}
