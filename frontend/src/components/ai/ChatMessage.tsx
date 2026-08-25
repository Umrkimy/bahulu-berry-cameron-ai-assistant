import { Box, Paper, Text } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import ReactMarkdown from "react-markdown";

import type { ChatMessageData } from "../../types/ai";

interface ChatMessageProps {
  message: ChatMessageData;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <Box
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        width: "100%",
      }}
    >
      <Box
        style={{
          display: "flex",
          gap: 10,
          maxWidth: "80%",
          alignItems: "flex-start",
        }}
      >
        {!isUser && (
          <Paper radius="xl" p={7} withBorder>
            <IconSparkles size={18} />
          </Paper>
        )}

        <Paper
          p="sm"
          px="md"
          radius="lg"
          bg={isUser ? "blue.6" : "gray.1"}
          c={isUser ? "white" : "dark"}
        >
          {isUser ? (
            <Text
              size="sm"
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}
            >
              {message.content}
            </Text>
          ) : (
            <Box
              className="ai-message"
              style={{
                fontSize: "var(--mantine-font-size-sm)",
                lineHeight: 1.6,
              }}
            >
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
