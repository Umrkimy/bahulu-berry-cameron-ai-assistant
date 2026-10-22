import { Badge, Card, Group, List, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconCheck, IconShieldCheck, IconX } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { getMetaConnectionStatus } from "../../api/support";

function Item({ ok, label }: { ok: boolean; label: string }) {
  return <List.Item icon={<ThemeIcon size={18} radius="xl" color={ok ? "green" : "gray"}>{ok ? <IconCheck size={12} /> : <IconX size={12} />}</ThemeIcon>}>{label}</List.Item>;
}

export default function MetaConnectionStatus() {
  const status = useQuery({ queryKey: ["meta-connection-status"], queryFn: getMetaConnectionStatus });
  const details = status.data;

  return <Card withBorder><Stack gap="sm"><Group justify="space-between" align="flex-start"><Group gap="xs"><IconShieldCheck size={21} color="var(--ui-muted)" /><Stack gap={0}><Text fw={600}>WhatsApp connection</Text><Text size="sm" c="dimmed">Set in the server environment. Never paste these values here.</Text></Stack></Group><Badge color={details?.outbound_enabled ? "green" : "gray"} variant="light">{details?.outbound_enabled ? "Sending on" : "Sending off"}</Badge></Group>{status.isLoading ? <Text size="sm" c="dimmed">Checking the connection…</Text> : details ? <List size="sm" spacing="xs"><Item ok={details.inbound_enabled} label="Receiving messages" /><Item ok={details.menu_enabled} label="Berry's menu" /><Item ok={details.outbound_enabled} label="Sending replies" /><Item ok={details.phone_number_configured} label="Phone number ID" /><Item ok={details.app_secret_configured} label="App secret" /><Item ok={details.verify_token_configured} label="Webhook verify token" /><Item ok={details.access_token_configured} label="Access token" /></List> : <Text size="sm" c="red">Could not load the connection status. Refresh and try again.</Text>}</Stack></Card>;
}
