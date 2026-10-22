import { Badge, Box, Button, Card, Group, Stack, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconFlask2, IconRefresh, IconSend } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getApiError } from "../../api/errors";
import { simulateInboundMessage } from "../../api/support";

type Line = { id: number; from: "customer" | "berry" | "note"; text: string };
const newChatId = () => `test-${Date.now().toString(36)}`;

export default function TestChat() {
  const queryClient = useQueryClient();
  const [chatId, setChatId] = useState(newChatId);
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState("");
  const add = (from: Line["from"], value: string) => setLines((current) => [...current, { id: current.length + 1, from, text: value }]);
  const send = useMutation({
    mutationFn: (message: string) => simulateInboundMessage({ message_id: `${chatId}-${lines.length + 1}`, conversation_id: chatId, sender_reference: chatId, message, language: "AUTO" }),
    onSuccess: (result) => {
      if (result.reply) add("berry", result.reply);
      if (result.outcome === "DRAFTED") add("note", "Berry wrote a draft for staff to approve. It is in the inbox.");
      else if (result.outcome === "HANDOFF" && !result.reply) add("note", "Passed to staff. Berry stays quiet in this chat.");
      void queryClient.invalidateQueries({ queryKey: ["support-conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["support-drafts"] });
    },
    onError: (error) => notifications.show({ color: "red", title: "Message not processed", message: getApiError(error).message }),
  });

  function submit() {
    const message = text.trim();
    if (!message || send.isPending) return;
    add("customer", message);
    setText("");
    send.mutate(message);
  }

  return (
    <Stack gap="md" maw={560}>
      <Card withBorder bg="var(--ui-subtle)">
        <Group gap="xs" align="flex-start" wrap="nowrap"><IconFlask2 size={20} color="var(--ui-muted)" /><Text size="sm">Chat with Berry as if you were a customer. Nothing is sent to WhatsApp. Test chats also appear in the inbox, so use made-up details only.</Text></Group>
      </Card>
      <Card withBorder p={0}>
        <Group justify="space-between" p="sm" style={{ borderBottom: "1px solid var(--ui-border)" }}>
          <Badge variant="light" color="gray">Test chat</Badge>
          <Button size="xs" variant="subtle" leftSection={<IconRefresh size={14} />} onClick={() => { setChatId(newChatId()); setLines([]); }}>New chat</Button>
        </Group>
        <Stack gap="sm" p="md" mih={320}>
          {!lines.length ? <Text size="sm" c="dimmed">Say hi to see Berry's menu.</Text> : null}
          {lines.map((line) => line.from === "note"
            ? <Text key={line.id} size="xs" c="dimmed" ta="center">{line.text}</Text>
            : (
              <Group key={line.id} justify={line.from === "customer" ? "flex-end" : "flex-start"}>
                <Box maw="85%" p="sm" style={{ borderRadius: 12, background: line.from === "customer" ? "var(--ui-accent-soft)" : "var(--ui-subtle)", border: "1px solid var(--ui-border)" }}>
                  <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{line.text}</Text>
                </Box>
              </Group>
            ))}
        </Stack>
        <Group gap="xs" p="sm" wrap="nowrap" style={{ borderTop: "1px solid var(--ui-border)" }}>
          <TextInput style={{ flex: 1 }} aria-label="Message to Berry" placeholder="Type a message" maxLength={2000} value={text} onChange={(event) => setText(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} />
          <Button leftSection={<IconSend size={16} />} loading={send.isPending} onClick={submit}>Send</Button>
        </Group>
      </Card>
    </Stack>
  );
}
