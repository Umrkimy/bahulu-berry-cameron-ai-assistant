import { Alert, Badge, Button, Card, Group, Image, Select, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconBrandGooglePhotos, IconKey, IconMail, IconShieldCheck } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { getApiError } from "../../api/errors";
import { getEmailConfigurationStatus, requestTeamPasswordReset } from "../../api/settings";
import { getTeam } from "../../api/team";
import PageHeader from "../../components/common/PageHeader";

export default function Settings() {
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const emailStatus = useQuery({ queryKey: ["settings", "email-status"], queryFn: getEmailConfigurationStatus });
  const team = useQuery({ queryKey: ["team"], queryFn: getTeam });
  const reset = useMutation({
    mutationFn: (adminId: number) => requestTeamPasswordReset(adminId),
    onSuccess: (data) => {
      notifications.show({ title: "Reset link requested", message: data.message, color: "green" });
      setSelectedAdminId(null);
    },
    onError: (error) => notifications.show({ title: "Unable to request reset link", message: getApiError(error).message, color: "red" }),
  });
  const members = (team.data ?? []).filter((member) => member.is_active);
  const status = emailStatus.data;

  const requestReset = () => {
    const member = members.find((item) => String(item.id) === selectedAdminId);
    if (!member) return;
    modals.openConfirmModal({
      title: "Send secure reset link?",
      children: <Text size="sm">A single-use reset link will be sent only to {member.email}. Any unused reset links for this account will stop working.</Text>,
      labels: { confirm: "Send reset link", cancel: "Cancel" },
      confirmProps: { color: "bahulu" },
      onConfirm: () => reset.mutate(member.id),
    });
  };

  return <Stack gap="lg">
    <PageHeader title="Settings" description="Owner controls for the dashboard brand preview and account email security." />
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
      <Card withBorder p="lg"><Stack gap="md">
        <Group justify="space-between"><Group gap="sm"><ThemeIcon color="bahulu" variant="light" radius="xl"><IconBrandGooglePhotos size={18} /></ThemeIcon><div><Text fw={700}>Brand preview</Text><Text size="sm" c="dimmed">Admin-only temporary artwork</Text></div></Group><Badge color="gray" variant="light">Temporary</Badge></Group>
        <Image src="/logo.jpeg" alt="Bahulu Berry Cameron temporary brand preview" h={160} fit="contain" radius="md" bg="cream.0" />
        <Alert color="blue" variant="light">This is the current dashboard logo preview only. It is not an image upload and does not change the storefront.</Alert>
      </Stack></Card>
      <Card withBorder p="lg"><Stack gap="md">
        <Group gap="sm"><ThemeIcon color={status?.delivery_enabled ? "green" : "orange"} variant="light" radius="xl"><IconMail size={18} /></ThemeIcon><div><Text fw={700}>Email delivery</Text><Text size="sm" c="dimmed">Password and account-security messages</Text></div></Group>
        {emailStatus.isLoading ? <Text c="dimmed" size="sm">Checking email configuration…</Text> : null}
        {status ? <>
          <Group justify="space-between"><Text size="sm">Status</Text><Badge color={status.delivery_enabled ? "green" : status.mode === "test" ? "orange" : "red"} variant="light">{status.delivery_enabled ? "Delivery enabled" : status.mode === "test" ? "Test mode" : "Not configured"}</Badge></Group>
          {status.sender ? <Group justify="space-between" align="flex-start"><Text size="sm">Sender</Text><Text size="sm" ta="right">{status.sender}</Text></Group> : null}
          <Group justify="space-between"><Text size="sm">Reset-link expiry</Text><Text size="sm">{status.reset_link_expiry_minutes} minutes</Text></Group>
          {!status.delivery_enabled ? <Alert color="orange" variant="light">{status.mode === "test" ? "Console mode records delivery locally; it does not send inbox email." : "Email delivery is not configured. Add the provider settings outside this dashboard."}</Alert> : null}
        </> : null}
      </Stack></Card>
    </SimpleGrid>
    <Card withBorder p="lg"><Stack gap="md">
      <Group gap="sm"><ThemeIcon color="bahulu" variant="light" radius="xl"><IconKey size={18} /></ThemeIcon><div><Text fw={700}>Send a password reset link</Text><Text size="sm" c="dimmed">The account holder receives the link; reset activity stays in the internal audit trail.</Text></div></Group>
      <Select label="Active team member" placeholder={team.isLoading ? "Loading team…" : "Choose an account"} data={members.map((member) => ({ value: String(member.id), label: `${member.username} — ${member.email}` }))} value={selectedAdminId} onChange={setSelectedAdminId} searchable disabled={team.isLoading || reset.isPending} />
      <Group justify="space-between" wrap="wrap"><Group gap="xs"><IconShieldCheck size={16} color="var(--mantine-color-green-6)" /><Text size="xs" c="dimmed">Single-use link; prior unused links are invalidated.</Text></Group><Button leftSection={<IconMail size={16} />} onClick={requestReset} loading={reset.isPending} disabled={!selectedAdminId}>Send reset link</Button></Group>
    </Stack></Card>
  </Stack>;
}
