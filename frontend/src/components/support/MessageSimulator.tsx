import { useState } from "react";
import { Badge, Button, Card, Group, Select, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconFlask2, IconCopy, IconSparkles } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getApiError } from "../../api/errors";
import { simulateInboundMessage } from "../../api/support";
import type { SimulatorInboundResult } from "../../types/support";

export default function MessageSimulator() {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<SimulatorInboundResult | null>(null);
  const form = useForm({ initialValues: { message_id: "", conversation_id: "", sender_reference: "", message: "", language: "AUTO" as "AUTO" | "EN" | "MS" }, validate: { message_id: (value) => value.trim().length > 1 ? null : "Enter a fictional message ID", conversation_id: (value) => value.trim().length > 1 ? null : "Enter a fictional conversation ID", sender_reference: (value) => value.trim().length > 1 ? null : "Enter a fictional sender reference", message: (value) => value.trim().length > 1 ? null : "Enter a fictional message" } });
  const simulate = useMutation({ mutationFn: () => simulateInboundMessage({ ...form.values, message_id: form.values.message_id.trim(), conversation_id: form.values.conversation_id.trim(), sender_reference: form.values.sender_reference.trim(), message: form.values.message.trim() }), onSuccess: (value) => { setResult(value); void queryClient.invalidateQueries({ queryKey: ["support-requests"] }); notifications.show({ title: value.duplicate ? "Duplicate ignored" : "Simulator processed", message: value.duplicate ? "No new ticket or activity was created." : "No external message was sent.", color: value.duplicate ? "gray" : "green" }); }, onError: (error) => notifications.show({ title: "Unable to process simulator message", message: getApiError(error).message, color: "red" }) });

  function copyDraft() {
    if (!result?.draft?.reply) return;
    void navigator.clipboard.writeText(result.draft.reply);
    notifications.show({ title: "Draft copied", message: "This is still a fictional local test result.", color: "green" });
  }

  return <Stack gap="lg"><Card withBorder bg="cream.0"><Group align="flex-start"><IconFlask2 size={22} color="#a52a3a" /><Stack gap={2}><Text fw={700}>Local-only message simulator</Text><Text size="sm" c="dimmed">Use fictional information only. This does not contact WhatsApp or customers. Fictional message text is retained in the internal timeline for 30 days; general audit records contain no message text.</Text></Stack></Group></Card><Card withBorder><form onSubmit={form.onSubmit(() => simulate.mutate())}><Stack><Group grow><TextInput label="Fictional message ID" placeholder="demo-message-001" withAsterisk {...form.getInputProps("message_id")} /><TextInput label="Fictional conversation ID" placeholder="demo-conversation-001" withAsterisk {...form.getInputProps("conversation_id")} /></Group><Group grow><TextInput label="Fictional sender reference" placeholder="demo-customer" withAsterisk {...form.getInputProps("sender_reference")} /><Select label="Language" data={[{ value: "AUTO", label: "Auto-detect" }, { value: "EN", label: "English" }, { value: "MS", label: "Bahasa Melayu" }]} {...form.getInputProps("language")} /></Group><Textarea label="Fictional inbound message" placeholder="Use a fictional question to test approved replies or human handoff." minRows={4} withAsterisk {...form.getInputProps("message")} /><Group justify="flex-end"><Button type="submit" leftSection={<IconSparkles size={16} />} loading={simulate.isPending}>Process fictional message</Button></Group></Stack></form></Card>{result ? <Card withBorder bg={result.outcome === "HANDOFF" ? "red.0" : "cream.0"}><Stack gap="sm"><Badge color={result.outcome === "HANDOFF" ? "red" : result.duplicate ? "gray" : "green"} variant="light">{result.outcome === "HANDOFF" ? result.ticket_created ? "Human-handoff ticket created" : "Existing human-handoff ticket reused" : result.duplicate ? "Duplicate message ignored" : "Grounded draft only"}</Badge>{result.support_request_id ? <Text size="sm">Support ticket #{result.support_request_id}</Text> : null}{result.draft?.handoff_required ? <Text>{result.draft.handoff_reason}</Text> : result.draft ? <><Text style={{ whiteSpace: "pre-wrap" }}>{result.draft.reply}</Text><Text size="xs" c="dimmed">Sources: {result.draft.sources.map((source) => `${source.type} #${source.id}: ${source.label}`).join(" · ")}</Text><Group justify="flex-end"><Button size="xs" variant="light" leftSection={<IconCopy size={14} />} onClick={copyDraft}>Copy draft</Button></Group></> : null}</Stack></Card> : null}</Stack>;
}
