import { Badge, Card, Code, Group, List, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconLock, IconShieldCheck } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { getMetaConnectionStatus } from "../../api/support";

export default function MetaConnectionStatus() {
  const status = useQuery({ queryKey: ["meta-connection-status"], queryFn: getMetaConnectionStatus });
  const details = status.data;
  const configured = details ? [details.app_secret_configured, details.verify_token_configured, details.phone_number_configured].filter(Boolean).length : 0;

  return <Card withBorder><Stack gap="sm"><Group justify="space-between" align="flex-start"><Group gap="xs"><IconShieldCheck size={21} color="#a52a3a" /><Stack gap={0}><Text fw={700}>Meta WhatsApp Cloud API readiness</Text><Text size="sm" c="dimmed">Inbound intake remains disabled until the client approves and configures Meta access.</Text></Stack></Group><Badge color={details?.inbound_enabled ? "green" : "gray"} variant="light">{details?.inbound_enabled ? "Inbound enabled" : "Disabled"}</Badge></Group>{status.isLoading ? <Text size="sm" c="dimmed">Checking connection readiness...</Text> : details ? <><Group gap="xs"><Badge variant="outline" color="bahulu">Draft-only mode</Badge><Badge variant="outline" color="gray">Outbound sending disabled</Badge><Code>{details.webhook_url}</Code></Group><List size="sm" spacing="xs" icon={<ThemeIcon size={18} radius="xl" color="gray"><IconLock size={12} /></ThemeIcon>}><List.Item>App secret: {details.app_secret_configured ? "configured" : "not configured"}</List.Item><List.Item>Webhook verify token: {details.verify_token_configured ? "configured" : "not configured"}</List.Item><List.Item>Phone number ID: {details.phone_number_configured ? "configured" : "not configured"}</List.Item></List><Text size="xs" c="dimmed">{configured}/3 connection values are configured. Do not add credentials here; store them only in the server environment after client approval.</Text></> : <Text size="sm" c="red">Unable to load readiness status. Refresh and try again.</Text>}</Stack></Card>;
}
