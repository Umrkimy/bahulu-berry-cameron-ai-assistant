import { useMemo, useState } from "react";
import { Badge, Button, Card, Group, Loader, Select, SimpleGrid, Stack, Text, TextInput, ThemeIcon } from "@mantine/core";
import { IconArrowRight, IconPackage, IconSearch, IconTruck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import RecordWorkspace from "../../components/fulfillment/RecordWorkspace";

import { getApiError } from "../../api/errors";
import PageHeader from "../../components/common/PageHeader";
import DispatchOrderModal from "../../components/fulfillment/DispatchOrderModal";
import { useFulfillmentQueue, useUpdateOrder } from "../../hooks/useOrders";
import type { FulfillmentOrder, FulfillmentStage } from "../../types/order";

const SECTIONS: Array<{ stage: FulfillmentStage; title: string; description: string; color: string }> = [
  { stage: "NEEDS_ATTENTION", title: "Needs attention", description: "Payment or delivery issue", color: "red" },
  { stage: "READY_TO_PREPARE", title: "Ready to prepare", description: "Paid orders waiting to start", color: "yellow" },
  { stage: "IN_PREPARATION", title: "In preparation", description: "Pack and dispatch when ready", color: "violet" },
  { stage: "IN_DELIVERY", title: "In delivery", description: "Track delivery progress", color: "blue" },
];

function formatMoney(value: number | string) { return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(value)); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function label(value: string) { return value.replaceAll("_", " "); }

export default function Fulfillment() {
  const { data, isLoading, isError, refetch } = useFulfillmentQueue();
  const updateOrder = useUpdateOrder();
  const [record, setRecord] = useState<{ id: number; kind: "order" | "delivery" } | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [dispatchOrder, setDispatchOrder] = useState<FulfillmentOrder | null>(null);
  const normalizedSearch = search.trim().toLowerCase();
  const items = useMemo(() => (data?.items ?? []).filter((item) => (!stageFilter || item.queue_stage === stageFilter) && (!normalizedSearch || [item.id, item.customer_name, item.status, item.payment_status, item.delivery?.status, item.delivery?.courier, item.delivery?.tracking_number].filter(Boolean).join(" ").toLowerCase().includes(normalizedSearch))), [data?.items, normalizedSearch, stageFilter]);

  async function startPreparation(order: FulfillmentOrder) {
    try {
      await updateOrder.mutateAsync({ orderId: order.id, data: { status: "PROCESSING" } });
      await refetch();
      notifications.show({ title: "Preparation started", message: `Order #${order.id} is now in preparation.`, color: "green" });
    } catch (error) {
      notifications.show({ title: "Could not start preparation", message: getApiError(error).message, color: "red" });
    }
  }

  function cardAction(order: FulfillmentOrder) {
    if (order.queue_stage === "READY_TO_PREPARE") return <Button size="sm" rightSection={<IconArrowRight size={14} />} loading={updateOrder.isPending} onClick={() => startPreparation(order)}>Start preparation</Button>;
    if (order.queue_stage === "IN_PREPARATION") return <Button size="sm" rightSection={<IconTruck size={14} />} onClick={() => setDispatchOrder(order)}>Mark as shipped</Button>;
    if (order.queue_stage === "IN_DELIVERY" || order.delivery?.status === "FAILED") return <Button size="sm" variant="light" onClick={() => setRecord({ id: order.id, kind: "delivery" })}>Open delivery</Button>;
    return <Button size="sm" variant="light" onClick={() => setRecord({ id: order.id, kind: "order" })}>Open order</Button>;
  }

  if (isLoading) return <Group justify="center" py="xl"><Loader color="bahulu" /></Group>;
  if (isError) return <Card withBorder><Stack align="center" py="xl"><Text fw={600}>Couldn’t load the fulfilment queue.</Text><Button variant="light" onClick={() => refetch()}>Try again</Button></Stack></Card>;

  return <>
    <PageHeader title="Fulfilment" description="Work through paid orders from preparation to delivery." />
    <SimpleGrid cols={{ base: 2, sm: 4 }} mb="md">
      {SECTIONS.map((section) => <Card key={section.stage} withBorder p="sm"><Group justify="space-between"><Stack gap={1}><Text size="xs" c="dimmed">{section.title}</Text><Text fw={800} size="xl">{data?.counts[section.stage] ?? 0}</Text></Stack><ThemeIcon variant="light" color={section.color}><IconPackage size={18} /></ThemeIcon></Group></Card>)}
    </SimpleGrid>
    <Group align="end" mb="md" wrap="wrap">
      <TextInput style={{ flex: 1 }} leftSection={<IconSearch size={16} />} placeholder="Search order, customer, courier, tracking..." value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
      <Select clearable w={{ base: "100%", sm: 220 }} label="Queue stage" placeholder="All stages" value={stageFilter} onChange={setStageFilter} data={SECTIONS.map((section) => ({ value: section.stage, label: section.title }))} />
    </Group>
    <Group justify="space-between" mb="md"><Text size="sm" c="dimmed">{items.length} of {data?.items.length ?? 0} active orders shown</Text><Button variant="subtle" disabled={!search && !stageFilter} onClick={() => { setSearch(""); setStageFilter(null); }}>Reset filters</Button></Group>
    <Stack gap="lg">
      {SECTIONS.filter((section) => !stageFilter || section.stage === stageFilter).map((section) => {
        const sectionItems = items.filter((item) => item.queue_stage === section.stage);
        return <Card key={section.stage} withBorder p="md"><Group justify="space-between" mb="sm"><div><Group gap="xs"><Badge color={section.color} variant="light">{section.title}</Badge><Text size="sm" c="dimmed">{sectionItems.length} shown</Text></Group><Text size="xs" c="dimmed" mt={4}>{section.description}</Text></div></Group>
          {sectionItems.length === 0 ? <Text size="sm" c="dimmed">Nothing here right now.</Text> : <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>{sectionItems.map((order) => <Card key={order.id} withBorder p="sm" className="fulfillment-card"><Stack gap="xs"><Group justify="space-between" align="flex-start"><div><Text fw={700}>Order #{order.id}</Text><Text size="sm">{order.customer_name}</Text></div><Text fw={700}>{formatMoney(order.total_amount)}</Text></Group><Group gap="xs"><Badge variant="light" color={order.payment_status === "PAID" ? "green" : "red"}>{label(order.payment_status)}</Badge><Badge variant="light" color={section.color}>{label(order.status)}</Badge></Group>{order.delivery && <Text size="xs">Delivery: {label(order.delivery.status)}</Text>}{order.queue_stage === "NEEDS_ATTENTION" && <Text size="sm" c="red">{order.delivery?.status === "FAILED" ? "Delivery failed. Review before retrying." : "Payment must be confirmed before preparation."}</Text>}<Text size="xs" c="dimmed">Created {formatDate(order.created_at)}</Text>{order.status === "SHIPPED" && order.delivery && <Text size="xs" c={order.delivery.tracking_number ? "dimmed" : "orange"}>{order.delivery.tracking_number ? `${order.delivery.courier ?? "Delivery"} · ${order.delivery.tracking_number}` : "Tracking not added yet"}</Text>}<Group justify="space-between" mt={2}><Button size="xs" variant="subtle" onClick={() => setRecord({ id: order.id, kind: "order" })}>View details</Button>{cardAction(order)}</Group></Stack></Card>)}</SimpleGrid>}
        </Card>;
      })}
    </Stack>
    {dispatchOrder && <DispatchOrderModal key={dispatchOrder.id} opened order={dispatchOrder} onClose={() => setDispatchOrder(null)} />}
    {record && <RecordWorkspace key={`${record.kind}-${record.id}`} orderId={record.id} kind={record.kind} onClose={() => setRecord(null)} />}
  </>;
}
