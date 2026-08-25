import { Box, Group } from "@mantine/core";

export default function TypingIndicator() {
  return (
    <Group gap={5} mt={8}>
      <Box
        w={6}
        h={6}
        bg="gray.5"
        style={{
          borderRadius: "50%",
        }}
      />

      <Box
        w={6}
        h={6}
        bg="gray.5"
        style={{
          borderRadius: "50%",
        }}
      />

      <Box
        w={6}
        h={6}
        bg="gray.5"
        style={{
          borderRadius: "50%",
        }}
      />
    </Group>
  );
}
