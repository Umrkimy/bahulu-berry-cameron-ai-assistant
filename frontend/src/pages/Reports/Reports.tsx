import { useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Group, Select, SimpleGrid, Stack, Table, Text, ThemeIcon } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconChartBar, IconDownload, IconPackage, IconReceipt2, IconTicket, IconTrendingUp } from "@tabler/icons-react";

import PageHeader from "../../components/common/PageHeader";
import OrderOutcomesChart from "../../components/reports/OrderOutcomesChart";
import ReportSalesChart from "../../components/reports/ReportSalesChart";
import { downloadReportCsv } from "../../api/reports";
import { useReportSummary } from "../../hooks/useReports";
import type { ReportFilters, ReportPreset } from "../../types/reports";

const currency = new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" });
const presets: { value: ReportPreset; label: string }[] = [
  { value: "TODAY", label: "Today" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "LAST_90_DAYS", label: "Last 90 days" },
  { value: "LAST_12_MONTHS", label: "Last 12 months" },
  { value: "MONTH_TO_DATE", label: "Month to date" },
];

function money(value: string | number) { return currency.format(Number(value)); }

function Metric({ title, value, detail, icon }: { title: string; value: string; detail: string; icon: React.ReactNode }) {
  return <Card withBorder radius="lg" p="lg"><Group justify="space-between" align="flex-start"><Stack gap={5}><Text size="sm" c="dimmed">{title}</Text><Text fw={800} fz={28} className="metric-value">{value}</Text><Text size="xs" c="dimmed">{detail}</Text></Stack><ThemeIcon variant="light" color="bahulu" size="lg" radius="md">{icon}</ThemeIcon></Group></Card>;
}

export default function Reports() {
  const [preset, setPreset] = useState<ReportPreset>("LAST_30_DAYS");
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const filters: ReportFilters = useMemo(() => start && end ? { start_date: start, end_date: end } : { preset }, [preset, start, end]);
  const report = useReportSummary(filters);
  const data = report.data;

  const selectPreset = (value: string | null) => {
    if (!value) return;
    setPreset(value as ReportPreset);
    setStart(null);
    setEnd(null);
  };
  const setCustomStart = (value: string | null) => { setStart(value); setPreset("LAST_30_DAYS"); };
  const setCustomEnd = (value: string | null) => { setEnd(value); setPreset("LAST_30_DAYS"); };

  return <Stack gap="lg">
    <PageHeader title="Owner Reports" description="Decision-ready sales, promotion, inventory, and support signals from authoritative operational records." action={<Button leftSection={<IconDownload size={16} />} variant="default" loading={report.isFetching} onClick={() => downloadReportCsv(filters)}>Download CSV</Button>} />
    <Card withBorder radius="lg"><Group align="end" wrap="wrap"><Select label="Report period" data={presets} value={start || end ? null : preset} onChange={selectPreset} w={{ base: "100%", sm: 190 }} /><DatePickerInput label="Custom start date" value={start} onChange={setCustomStart} maxDate={end ?? undefined} placeholder="Choose start" w={{ base: "100%", sm: 190 }} /><DatePickerInput label="Custom end date" value={end} onChange={setCustomEnd} minDate={start ?? undefined} placeholder="Choose end" w={{ base: "100%", sm: 190 }} /><Button variant="subtle" onClick={() => { setPreset("LAST_30_DAYS"); setStart(null); setEnd(null); }}>Reset</Button><Text size="sm" c="dimmed">Malaysia calendar dates</Text></Group></Card>
    {report.isError ? <Alert color="red" title="Could not load the report">Please refresh and try again.</Alert> : null}
    {report.isLoading || !data ? <Card withBorder p="xl"><Text c="dimmed" ta="center">Loading owner report…</Text></Card> : <>
      <Group justify="space-between"><Group gap="xs"><Badge color="bahulu" variant="light">{data.report_range.label}</Badge><Text size="sm" c="dimmed">{data.report_range.start_date} to {data.report_range.end_date}</Text></Group><Text size="xs" c="dimmed">Sales and support use this period. Inventory is live.</Text></Group>
      <SimpleGrid cols={{ base: 1, sm: 2, xl: 5 }}><Metric title="Paid revenue" value={money(data.kpis.paid_revenue)} detail="Paid, non-cancelled orders" icon={<IconTrendingUp size={19} />} /><Metric title="Paid orders" value={String(data.kpis.paid_order_count)} detail={`${data.kpis.total_orders_created} orders created`} icon={<IconReceipt2 size={19} />} /><Metric title="Average order" value={money(data.kpis.average_paid_order_value)} detail="Paid order value" icon={<IconChartBar size={19} />} /><Metric title="Discount granted" value={money(data.kpis.total_discount_granted)} detail="Non-cancelled order snapshots" icon={<IconTrendingUp size={19} />} /><Metric title="Open high priority" value={String(data.support_workload.current_open_high_priority_count)} detail="Current support workload" icon={<IconTicket size={19} />} /></SimpleGrid>
      <SimpleGrid cols={{ base: 1, lg: 2 }}><Card withBorder radius="lg"><Group justify="space-between" mb="md"><Text fw={700}>Paid sales trend</Text><Text size="xs" c="dimmed">{data.daily_sales.length > 90 ? "Monthly sales" : "Daily sales"}</Text></Group><ReportSalesChart points={data.daily_sales} /></Card><Card withBorder radius="lg"><Text fw={700} mb="md">Order outcomes</Text>{data.order_status_counts.length ? <OrderOutcomesChart items={data.order_status_counts} /> : <Text c="dimmed" size="sm" ta="center" py="xl">No orders created in this period.</Text>}</Card></SimpleGrid>
      <SimpleGrid cols={{ base: 1, lg: 2 }}><Card withBorder radius="lg"><Group justify="space-between" mb="md"><Text fw={700}>Top products</Text><Text size="xs" c="dimmed">Non-cancelled snapshots</Text></Group><Table.ScrollContainer minWidth={420}><Table striped highlightOnHover><Table.Thead><Table.Tr><Table.Th>Product</Table.Th><Table.Th ta="right">Units</Table.Th><Table.Th ta="right">Sales</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{data.top_products.map((item) => <Table.Tr key={item.product_id}><Table.Td fw={600}>{item.product_name}</Table.Td><Table.Td ta="right">{item.units_sold}</Table.Td><Table.Td ta="right">{money(item.final_line_total)}</Table.Td></Table.Tr>)}{data.top_products.length === 0 ? <Table.Tr><Table.Td colSpan={3}><Text c="dimmed" ta="center" py="lg">No product sales in this period.</Text></Table.Td></Table.Tr> : null}</Table.Tbody></Table></Table.ScrollContainer></Card><Card withBorder radius="lg"><Group justify="space-between" mb="md"><Text fw={700}>Promotion impact</Text><Text size="xs" c="dimmed">Historical discount snapshots</Text></Group><Table.ScrollContainer minWidth={420}><Table striped highlightOnHover><Table.Thead><Table.Tr><Table.Th>Promotion</Table.Th><Table.Th ta="right">Units</Table.Th><Table.Th ta="right">Discount</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{data.promotion_impact.map((item, index) => <Table.Tr key={`${item.promotion_name}-${index}`}><Table.Td><Text fw={600}>{item.promotion_name}</Text><Text size="xs" c="dimmed">{item.promotion_type?.replaceAll("_", " ") ?? "Promotion"}</Text></Table.Td><Table.Td ta="right">{item.affected_units}</Table.Td><Table.Td ta="right">{money(item.discount_amount)}</Table.Td></Table.Tr>)}{data.promotion_impact.length === 0 ? <Table.Tr><Table.Td colSpan={3}><Text c="dimmed" ta="center" py="lg">No promotion savings in this period.</Text></Table.Td></Table.Tr> : null}</Table.Tbody></Table></Table.ScrollContainer></Card></SimpleGrid>
      <SimpleGrid cols={{ base: 1, lg: 2 }}><Card withBorder radius="lg"><Group mb="md"><ThemeIcon color="bahulu" variant="light"><IconPackage size={17} /></ThemeIcon><Stack gap={0}><Text fw={700}>Current inventory health</Text><Text size="xs" c="dimmed">Live stock now, not historical movement.</Text></Stack></Group><SimpleGrid cols={3}><Stack gap={2}><Text c="dimmed" size="xs">Healthy</Text><Text fw={800} fz="xl">{data.inventory_health.healthy_count}</Text></Stack><Stack gap={2}><Text c="dimmed" size="xs">Low stock</Text><Text fw={800} fz="xl">{data.inventory_health.low_stock_count}</Text></Stack><Stack gap={2}><Text c="dimmed" size="xs">Out of stock</Text><Text fw={800} fz="xl">{data.inventory_health.out_of_stock_count}</Text></Stack></SimpleGrid></Card><Card withBorder radius="lg"><Group justify="space-between" mb="md"><Text fw={700}>Support workload</Text><Badge color={data.support_workload.current_open_high_priority_count ? "red" : "green"} variant="light">{data.support_workload.current_open_high_priority_count} open high priority</Badge></Group><Text size="sm" c="dimmed" mb="sm">{data.support_workload.tickets_created} tickets created in this period</Text><Group gap="xs" wrap="wrap">{data.support_workload.status_counts.map((item) => <Badge key={item.status} variant="light" color="gray">{item.status.replaceAll("_", " ")}: {item.count}</Badge>)}</Group></Card></SimpleGrid>
    </>}
  </Stack>;
}
