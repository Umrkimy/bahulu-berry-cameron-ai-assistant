import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Center,
  Loader,
  Modal,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";

import ChatMessage from "../../components/ai/ChatMessage";
import ChatInput from "../../components/ai/ChatInput";
import OperationCards from "../../components/ai/OperationCards";
import OwnerQuickPrompts from "../../components/ai/OwnerQuickPrompts";
import StaffQuickPrompts from "../../components/ai/StaffQuickPrompts";

import type { ChatMessageData } from "../../types/ai";

import { sendAIMessage } from "../../api/aiAssistant";
import { getApiError } from "../../api/errors";
import useAuth from "../../auth/useAuth";

const STORAGE_KEY = "bahulu-cameron-ai-chat";
const CONVERSATION_ID_KEY = "bahulu-cameron-ai-conversation-id";

function createConversationId() {
  return crypto.randomUUID();
}

function loadConversationId(key: string) {
  const savedId = sessionStorage.getItem(key);

  if (savedId) {
    return savedId;
  }

  const conversationId = createConversationId();
  sessionStorage.setItem(key, conversationId);
  return conversationId;
}

function loadMessages(key: string): ChatMessageData[] {
  const savedMessages = sessionStorage.getItem(key);

  if (!savedMessages) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(savedMessages);

    if (Array.isArray(parsed)) {
      return parsed as ChatMessageData[];
    }
  } catch {
    sessionStorage.removeItem(key);
  }

  return [];
}

export default function AIAssistant() {
  const { admin } = useAuth();
  return <AccountChat key={admin?.id} />;
}

function AccountChat() {
  const { admin } = useAuth();
  const storageKey = `${STORAGE_KEY}:${admin?.id}`;
  const conversationKey = `${CONVERSATION_ID_KEY}:${admin?.id}`;
  const [messages, setMessages] = useState<ChatMessageData[]>(() =>
    loadMessages(storageKey),
  );

  const [conversationId, setConversationId] = useState(() =>
    loadConversationId(conversationKey),
  );

  const [loading, setLoading] = useState(false);

  const [resetOpened, setResetOpened] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // SAVE CHAT HISTORY
  // ============================================================

  useEffect(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CONVERSATION_ID_KEY);
    sessionStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  // ============================================================
  // AUTO-SCROLL TO NEWEST MESSAGE
  // ============================================================

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const handleSend = async (message: string) => {
    const userMessage: ChatMessageData = {
      role: "user",
      content: message,
    };

    setMessages((previous) => [...previous, userMessage]);

    setLoading(true);

    try {
      const conversationHistory = messages.slice(-12);

      const response = await sendAIMessage(
        message,
        conversationId,
        conversationHistory,
      );

      const assistantMessage: ChatMessageData = {
        role: "assistant",
        content: response.response,
        cards: response.cards,
        outcome: response.outcome,
      };

      setMessages((previous) => [...previous, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessageData = {
        role: "assistant",
        content: getApiError(error).message,
        outcome: "FAILED",
      };

      setMessages((previous) => [...previous, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // NEW CHAT
  // ============================================================

  const handleNewChat = () => {
    sessionStorage.removeItem(storageKey);

    const nextConversationId = createConversationId();
    sessionStorage.setItem(conversationKey, nextConversationId);

    setMessages([]);

    setConversationId(nextConversationId);

    setResetOpened(false);
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <>
      <Box
        className="ai-assistant-shell"
        h="calc(100vh - 70px)"
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <Box
          px="md"
          py="sm"
          style={{
            borderBottom: "1px solid var(--mantine-color-default-border)",
          }}
        >
          <Box
            className="ai-chat-header"
            maw={900}
            mx="auto"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text fw={600} size="lg">
              AI Assistant
            </Text>

            <Text size="xs" c="dimmed" ml="auto" mr="md">
              {admin?.role === "STAFF"
                ? "Live operations help — no dashboard changes"
                : null}
              {admin?.role !== "STAFF" ? (
                <>
                  {admin?.role === "OWNER"
                    ? "Changes always need your confirmation"
                    : "Read-only help for staff — no dashboard changes"}
                </>
              ) : null}
            </Text>

            <Button
              className="ai-chat-actions"
              size="sm"
              variant="light"
              leftSection={<IconPlus size={16} />}
              onClick={() => setResetOpened(true)}
            >
              New Chat
            </Button>
          </Box>
        </Box>

        {/* ================================================== */}
        {/* CHAT MESSAGES */}
        {/* ================================================== */}

        <ScrollArea
          style={{
            flex: 1,
          }}
          type="auto"
        >
          <Box maw={900} mx="auto" px="md" py="xl">
            {messages.length === 0 ? (
              <Center h="calc(100vh - 220px)">
                {admin?.role === "OWNER" ? (
                  <OwnerQuickPrompts onSelect={handleSend} />
                ) : (
                  <StaffQuickPrompts onSelect={handleSend} />
                )}
              </Center>
            ) : (
              <Stack gap="lg">
                {messages.map((message, index) => (
                  <Stack key={index} gap="xs">
                    <ChatMessage message={message} />
                    {message.role === "assistant" && message.cards?.length ? (
                      <OperationCards cards={message.cards} />
                    ) : null}
                  </Stack>
                ))}

                {loading && (
                  <Box
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Loader size="sm" type="dots" />

                    <Text size="sm" c="dimmed">
                      Thinking...
                    </Text>
                  </Box>
                )}

                <div ref={bottomRef} />
              </Stack>
            )}
          </Box>
        </ScrollArea>

        {/* ================================================== */}
        {/* CHAT INPUT */}
        {/* ================================================== */}

        <Box px="md" pb="md" pt="sm">
          <Box maw={900} mx="auto">
            <ChatInput onSend={handleSend} loading={loading} />

            <Text ta="center" size="xs" c="dimmed" mt={6}>
              AI uses live dashboard data. Staff can only ask read-only
              questions; owners must confirm every change.
            </Text>
          </Box>
        </Box>
      </Box>

      {/* ==================================================== */}
      {/* NEW CHAT MODAL */}
      {/* ==================================================== */}

      <Modal
        opened={resetOpened}
        onClose={() => setResetOpened(false)}
        title="Start a new chat?"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            This will clear your current conversation. This action cannot be
            undone.
          </Text>

          <Box
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <Button variant="default" onClick={() => setResetOpened(false)}>
              Cancel
            </Button>

            <Button
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={handleNewChat}
            >
              New Chat
            </Button>
          </Box>
        </Stack>
      </Modal>
    </>
  );
}
