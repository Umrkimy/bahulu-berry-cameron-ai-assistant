import { Button, Center, Paper, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft, IconRefresh } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { useNavigate } from "react-router-dom";

function DashboardErrorFallback({ resetErrorBoundary }: FallbackProps) {
  const navigate = useNavigate();

  return <Center mih="70vh" px="md"><Paper withBorder radius="lg" p="xl" maw={460} ta="center"><Stack gap="md"><Title order={2}>This page needs a refresh</Title><Text c="dimmed">Something unexpected happened while loading this dashboard area. No changes were made.</Text><Button leftSection={<IconRefresh size={16} />} onClick={resetErrorBoundary}>Try again</Button><Button variant="default" leftSection={<IconArrowLeft size={16} />} onClick={() => { resetErrorBoundary(); navigate("/dashboard"); }}>Return to Dashboard</Button></Stack></Paper></Center>;
}

export default function AppErrorBoundary({ children, onReset }: { children: ReactNode; onReset?: () => void }) {
  return <ErrorBoundary FallbackComponent={DashboardErrorFallback} onReset={onReset}>{children}</ErrorBoundary>;
}
