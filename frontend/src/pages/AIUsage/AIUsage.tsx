import { Badge, Card, Group, Progress, SimpleGrid, Stack, Table, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { getAIUsage, getAIUsageSummary } from "../../api/aiUsage";
import PageHeader from "../../components/common/PageHeader";

const currency = new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" });

export default function AIUsage() {
  const summary = useQuery({ queryKey: ["ai-usage-summary"], queryFn: getAIUsageSummary });
  const usage = useQuery({ queryKey: ["ai-usage"], queryFn: getAIUsage });
  const data = summary.data;

  return <Stack gap="lg">
    <PageHeader title="AI Usage & Budget" description="Estimated OpenAI dashboard-AI cost for the current Malaysia calendar month." />
    {data ? <>
      <Card withBorder><Stack gap="sm"><Group justify="space-between"><Stack gap={0}><Text fw={700}>Monthly budget</Text><Text size="sm" c="dimmed">Hard cap: US${data.budget_usd.toFixed(2)} · about {currency.format(data.budget_rm_display)}</Text></Stack><Badge color={data.warning ? "orange" : "green"} variant="light">{data.warning ? "Budget warning" : "Within budget"}</Badge></Group><Progress value={Math.min(data.percent_used, 100)} color={data.percent_used >= 100 ? "red" : data.warning ? "orange" : "bahulu"} size="lg" /><Group justify="space-between"><Text size="sm">Used: {currency.format(data.spent_rm_display)} ({data.percent_used.toFixed(1)}%)</Text><Text size="sm" c="dimmed">Remaining: US${data.remaining_usd.toFixed(2)}</Text></Group><Text size="xs" c="dimmed">Warning starts at {data.warning_threshold_percent}% of the monthly cap. The estimate is based on provider token pricing; billing remains in USD.</Text></Stack></Card>
      <SimpleGrid cols={{ base: 1, md: 2 }}><Card withBorder><Text fw={700} mb="sm">Usage by account</Text>{data.by_admin.length ? <Stack gap="xs">{data.by_admin.map((item) => <Group key={`${item.admin_id}-${item.username}`} justify="space-between"><Text size="sm">{item.username}</Text><Text size="sm" fw={600}>US${item.estimated_cost_usd.toFixed(4)}</Text></Group>)}</Stack> : <Text size="sm" c="dimmed">No paid AI usage this month.</Text>}</Card><Card withBorder><Text fw={700} mb="sm">Recent daily usage</Text>{data.daily.length ? <Stack gap="xs">{data.daily.slice(-7).reverse().map((item) => <Group key={item.date} justify="space-between"><Text size="sm">{new Date(`${item.date}T00:00:00`).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}</Text><Text size="sm" fw={600}>US${item.estimated_cost_usd.toFixed(4)}</Text></Group>)}</Stack> : <Text size="sm" c="dimmed">No paid AI usage this month.</Text>}</Card></SimpleGrid>
    </> : <Card withBorder><Text c="dimmed">Loading AI budget…</Text></Card>}
    <Card withBorder p={0}><Table striped highlightOnHover><Table.Thead><Table.Tr><Table.Th>Time</Table.Th><Table.Th>Model</Table.Th><Table.Th>Tokens</Table.Th><Table.Th>Cost</Table.Th><Table.Th>Outcome</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{(usage.data ?? []).map((item) => <Table.Tr key={item.id}><Table.Td><Text size="sm">{new Date(item.created_at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}</Text></Table.Td><Table.Td>{item.model}</Table.Td><Table.Td>{item.input_tokens.toLocaleString()} in · {item.output_tokens.toLocaleString()} out</Table.Td><Table.Td>US${item.estimated_cost_usd.toFixed(6)}</Table.Td><Table.Td><Badge color={item.outcome === "COMPLETED" ? "green" : item.outcome === "FAILED" ? "red" : "orange"} variant="light">{item.outcome}</Badge></Table.Td></Table.Tr>)}{!usage.isLoading && usage.data?.length === 0 ? <Table.Tr><Table.Td colSpan={5}><Text ta="center" c="dimmed" py="xl">No paid dashboard AI requests yet.</Text></Table.Td></Table.Tr> : null}</Table.Tbody></Table></Card>
  </Stack>;
}
