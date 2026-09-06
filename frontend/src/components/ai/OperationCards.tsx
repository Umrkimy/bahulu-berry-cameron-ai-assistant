import { Badge, Button, Card, Group, List, Stack, Text } from "@mantine/core";
import { IconArrowUpRight, IconCircleCheck, IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
import { Link } from "react-router-dom";

import type { AIOperationCard } from "../../types/ai";

const cardTone = {
  info: { color: "blue", icon: IconInfoCircle },
  warning: { color: "orange", icon: IconAlertTriangle },
  success: { color: "green", icon: IconCircleCheck },
} as const;

export default function OperationCards({ cards }: { cards: AIOperationCard[] }) {
  return <Stack gap="xs" ml={46} maw={620}>{cards.map((card) => {
    const tone = cardTone[card.tone];
    const Icon = tone.icon;
    return <Card key={`${card.title}-${card.href ?? "card"}`} withBorder p="sm" bg={card.tone === "warning" ? "orange.0" : "cream.0"}><Stack gap="xs"><Group justify="space-between"><Group gap="xs"><Icon size={16} /><Text fw={700} size="sm">{card.title}</Text></Group><Badge color={tone.color} variant="light">Live data</Badge></Group><List size="xs" spacing={2}>{card.facts.map((fact) => <List.Item key={fact}>{fact}</List.Item>)}</List>{card.href ? <Button component={Link} to={card.href} size="xs" variant="subtle" px={0} w="fit-content" rightSection={<IconArrowUpRight size={13} />}>Open dashboard area</Button> : null}</Stack></Card>;
  })}</Stack>;
}
