import { useState } from "react";
import { ActionIcon, Box, Textarea } from "@mantine/core";
import { IconArrowUp } from "@tabler/icons-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  loading?: boolean;
}

export default function ChatInput({ onSend, loading = false }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    const trimmed = message.trim();

    if (!trimmed || loading) {
      return;
    }

    onSend(trimmed);
    setMessage("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      style={{
        position: "relative",
      }}
    >
      <Textarea
        value={message}
        onChange={(event) => setMessage(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message Bahulu Cameron AI..."
        autosize
        minRows={1}
        maxRows={6}
        disabled={loading}
        radius="xl"
        styles={{
          input: {
            paddingRight: 55,
            paddingTop: 14,
            paddingBottom: 14,
          },
        }}
      />

      <ActionIcon
        size={36}
        radius="xl"
        variant="filled"
        color="dark"
        onClick={handleSend}
        disabled={!message.trim() || loading}
        loading={loading}
        style={{
          position: "absolute",
          right: 8,
          bottom: 8,
        }}
      >
        <IconArrowUp size={18} />
      </ActionIcon>
    </Box>
  );
}
