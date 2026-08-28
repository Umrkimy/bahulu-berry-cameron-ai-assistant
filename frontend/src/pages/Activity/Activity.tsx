import { Badge, Button, Card, Group, Select, Stack, Text, Timeline } from "@mantine/core";
import { IconActivity } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import PageHeader from "../../components/common/PageHeader";
import { getActivity } from "../../api/activity";

export default function ActivityPage() {
  const [entityType, setEntityType] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [limit] = useState(50);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["activity", entityType, action, limit],
    queryFn: () => getActivity({ entity_type: entityType || undefined, action: action || undefined, limit }),
  });

  return (
    <Stack gap="lg">
      <PageHeader title="Activity" description="A safe record of recent staff, AI, and payment actions." />
      <Card withBorder p="xl">
        <Group mb="lg" wrap="wrap">
          <Select clearable placeholder="All records" aria-label="Filter activity by record type" value={entityType} onChange={setEntityType} data={["customer", "product", "inventory", "discount", "order", "payment", "delivery", "refund_request"]} />
          <Select clearable placeholder="All actions" aria-label="Filter activity by action" value={action} onChange={setAction} data={["created", "updated", "deleted", "adjusted", "cancelled", "completed", "exported", "requested", "under_review", "approved", "rejected", "refunded", "paid", "expired"]} />
          {(entityType || action) && <Button variant="subtle" color="gray" onClick={() => { setEntityType(null); setAction(null); }}>Reset filters</Button>}
        </Group>
        {isLoading ? <Text c="dimmed">Loading activity...</Text> : isError ? <Text c="red">Unable to load activity.</Text> : !data?.length ? <Text c="dimmed">No activity recorded yet. New staff actions will appear here.</Text> : (
          <Timeline active={data.length} bulletSize={28} lineWidth={2}>
            {data.map((item) => (
              <Timeline.Item key={item.id} bullet={<IconActivity size={15} />} title={<Group gap="xs"><Text fw={600}>{item.description}</Text><Badge variant="light" color="bahulu">{item.action}</Badge></Group>}>
                <Text size="xs" c="dimmed">{new Date(item.created_at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })} · {item.admin_id ? `Admin #${item.admin_id}` : "System"}</Text>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Card>
    </Stack>
  );
}
