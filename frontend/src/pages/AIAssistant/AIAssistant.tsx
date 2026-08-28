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

import type { ChatMessageData } from "../../types/ai";

import { sendAIMessage } from "../../api/aiAssistant";

const STORAGE_KEY = "bahulu-cameron-ai-chat";
const CONVERSATION_ID_KEY = "bahulu-cameron-ai-conversation-id";

function createConversationId() {
  return crypto.randomUUID();
}

function loadConversationId() {
  const savedId = localStorage.getItem(CONVERSATION_ID_KEY);

  if (savedId) {
    return savedId;
  }

  const conversationId = createConversationId();
  localStorage.setItem(CONVERSATION_ID_KEY, conversationId);
  return conversationId;
}

function loadMessages(): ChatMessageData[] {
  const savedMessages = localStorage.getItem(STORAGE_KEY);

  if (!savedMessages) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(savedMessages);

    if (Array.isArray(parsed)) {
      return parsed as ChatMessageData[];
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return [];
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<ChatMessageData[]>(loadMessages);

  const [conversationId, setConversationId] = useState(loadConversationId);

  const [loading, setLoading] = useState(false);

  const [resetOpened, setResetOpened] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // SAVE CHAT HISTORY
  // ============================================================

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

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
      const conversationHistory = messages.slice(-20);

      const response = await sendAIMessage(
        message,
        conversationId,
        conversationHistory,
      );

      const assistantMessage: ChatMessageData = {
        role: "assistant",
        content: response,
      };

      setMessages((previous) => [...previous, assistantMessage]);
    } catch (error) {
      console.error("AI Assistant error:", error);

      const errorMessage: ChatMessageData = {
        role: "assistant",
        content: "Sorry, I couldn't process your request. Please try again.",
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
    localStorage.removeItem(STORAGE_KEY);

    const nextConversationId = createConversationId();
    localStorage.setItem(CONVERSATION_ID_KEY, nextConversationId);

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

            <Button
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
                <Text c="dimmed" size="sm">
                  Start a conversation
                </Text>
              </Center>
            ) : (
              <Stack gap="lg">
                {messages.map((message, index) => (
                  <ChatMessage key={index} message={message} />
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
              Bahulu Berry Cameron AI can make mistakes.
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
