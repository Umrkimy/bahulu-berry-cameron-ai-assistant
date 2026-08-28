import type { ReactNode } from "react";
import { Stack, Text, Title } from "@mantine/core";

interface PageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="app-page-header">
      <Stack gap={4}>
        <Title order={2}>{title}</Title>
        <Text c="dimmed">{description}</Text>
      </Stack>
      {action}
    </div>
  );
}
