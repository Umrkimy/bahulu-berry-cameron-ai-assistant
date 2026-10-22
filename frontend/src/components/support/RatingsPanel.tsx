import { Badge, Button, Card, Group, Pagination, Rating, SegmentedControl, Stack, Switch, Table, Text } from "@mantine/core";
import { IconStar } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { getApiError } from "../../api/errors";
import { getRatings, getRatingSummary } from "../../api/support";
import { roleLabels, type Role } from "../../auth/permissions";

const formatTime = (value: string) => new Date(value).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" });
const PERIODS = [{ label: "7 days", value: "7" }, { label: "30 days", value: "30" }, { label: "90 days", value: "90" }];

export default function RatingsPanel({ role }: { role: Role | undefined }) {
  const [days, setDays] = useState("30");
  const [adminId, setAdminId] = useState<number | null>(null);
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const summary = useQuery({ queryKey: ["support-rating-summary", days], queryFn: () => getRatingSummary(Number(days)) });
  const list = useQuery({ queryKey: ["support-ratings", days, adminId, lowOnly, page], queryFn: () => getRatings({ days: Number(days), admin_id: adminId ?? undefined, low_only: lowOnly, page, page_size: 20 }) });
  const rows = summary.data ?? [];
  const selectedName = rows.find((row) => row.admin_id === adminId)?.username;
  const scope = role === "OWNER" ? "Everyone on the team." : role === "MANAGER" ? "Staff and your own ratings." : "Your own ratings.";

  return (
    <Stack gap="md">
      <Card withBorder bg="var(--ui-subtle)">
        <Group gap="xs" align="flex-start" wrap="nowrap"><IconStar size={20} color="var(--ui-muted)" /><Text size="sm">When staff finish a chat, Berry asks the customer for 1 to 5 stars and an optional comment. {scope} Scores of 1 or 2 are flagged and the owner is notified.</Text></Group>
      </Card>
      <SegmentedControl w="fit-content" aria-label="Period" value={days} onChange={(value) => { setDays(value); setPage(1); }} data={PERIODS} />
      {summary.isLoading ? <Text size="sm" c="dimmed">Loading ratings…</Text>
        : summary.isError ? <Text size="sm" c="red">{getApiError(summary.error).message}</Text>
        : !rows.length ? <Card withBorder><Text size="sm" c="dimmed">No ratings in this period yet.</Text></Card>
        : (
          <Card withBorder p={0}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead><Table.Tr><Table.Th>Team member</Table.Th><Table.Th>Average</Table.Th><Table.Th>Ratings</Table.Th><Table.Th>Low (1-2)</Table.Th><Table.Th /></Table.Tr></Table.Thead>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.admin_id}>
                    <Table.Td><Text size="sm" fw={600}>{row.username}</Text><Text size="xs" c="dimmed">{roleLabels[row.role as Role] ?? row.role}</Text></Table.Td>
                    <Table.Td><Group gap="xs" wrap="nowrap"><Rating readOnly fractions={4} value={row.average ?? 0} size="sm" /><Text size="sm">{row.average?.toFixed(1) ?? "-"}</Text></Group></Table.Td>
                    <Table.Td>{row.ratings}</Table.Td>
                    <Table.Td>{row.low ? <Badge color="red" variant="light">{row.low}</Badge> : 0}</Table.Td>
                    <Table.Td><Button size="xs" variant={adminId === row.admin_id ? "filled" : "default"} onClick={() => { setAdminId(adminId === row.admin_id ? null : row.admin_id); setPage(1); }}>{adminId === row.admin_id ? "Showing" : "View"}</Button></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        )}
      <Group justify="space-between">
        <Text fw={600}>{selectedName ? `Ratings for ${selectedName}` : "Recent ratings"}</Text>
        <Switch label="Low scores only" checked={lowOnly} onChange={(event) => { setLowOnly(event.currentTarget.checked); setPage(1); }} />
      </Group>
      {list.isLoading ? <Text size="sm" c="dimmed">Loading…</Text>
        : list.isError ? <Text size="sm" c="red">{getApiError(list.error).message}</Text>
        : !list.data?.items.length ? <Card withBorder><Text size="sm" c="dimmed">No ratings to show.</Text></Card>
        : list.data.items.map((item) => (
          <Card key={item.id} withBorder p="sm">
            <Group justify="space-between" align="flex-start">
              <Group gap="xs"><Rating readOnly value={item.score} size="sm" /><Text size="sm" fw={600}>{item.username}</Text>{item.flagged ? <Badge color="red" variant="light">Low score</Badge> : null}</Group>
              <Text size="xs" c="dimmed">{formatTime(item.rated_at)}</Text>
            </Group>
            <Text size="sm" mt={6} c={item.comment ? undefined : "dimmed"} style={{ whiteSpace: "pre-wrap" }}>{item.comment ?? "No comment"}</Text>
          </Card>
        ))}
      {(list.data?.total_pages ?? 1) > 1 ? <Pagination aria-label="Rating pages" value={page} onChange={setPage} total={list.data!.total_pages} /> : null}
    </Stack>
  );
}
