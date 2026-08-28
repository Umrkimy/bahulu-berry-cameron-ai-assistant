import { ActionIcon, Badge, Button, Group, Modal, PasswordInput, Select, Stack, Switch, Text, TextInput, Tooltip } from "@mantine/core";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconEdit, IconPlus, IconUserCheck, IconUserOff } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { createTeamMember, getTeam, updateTeamMember, type TeamMember } from "../../api/team";
import { DataTable } from "../../components/common/DataTable";
import PageHeader from "../../components/common/PageHeader";
import { getApiError } from "../../api/errors";

const initialValues = { username: "", email: "", password: "", role: "STAFF" as "OWNER" | "STAFF", is_active: true };

export default function Team() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["team"], queryFn: getTeam });
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const form = useForm({ initialValues, validate: { username: (value) => value.trim().length >= 3 ? null : "Enter at least 3 characters", email: (value) => /^\S+@\S+\.\S+$/.test(value) ? null : "Enter a valid email", password: (value) => editing || value.length >= 8 ? null : "Use at least 8 characters" } });
  const save = useMutation({ mutationFn: () => editing ? updateTeamMember(editing.id, { username: form.values.username.trim(), email: form.values.email.trim(), role: form.values.role, is_active: form.values.is_active, ...(form.values.password ? { password: form.values.password } : {}) }) : createTeamMember({ username: form.values.username.trim(), email: form.values.email.trim(), password: form.values.password, role: form.values.role }), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["team"] }); notifications.show({ title: "Team updated", message: "Account changes were saved.", color: "green" }); setOpened(false); }, onError: (error) => { const apiError = getApiError(error); form.setErrors(apiError.fieldErrors); notifications.show({ title: "Unable to save", message: apiError.message, color: "red" }); } });
  const openCreate = () => { setEditing(null); form.setValues(initialValues); setOpened(true); };
  const openEdit = (member: TeamMember) => { setEditing(member); form.setValues({ username: member.username, email: member.email, password: "", role: member.role, is_active: member.is_active }); setOpened(true); };
  const changeActive = (member: TeamMember) => modals.openConfirmModal({ title: member.is_active ? "Deactivate account?" : "Reactivate account?", children: <Text size="sm">{member.is_active ? `${member.username} will no longer be able to sign in.` : `${member.username} will be able to sign in again.`}</Text>, labels: { confirm: member.is_active ? "Deactivate" : "Reactivate", cancel: "Cancel" }, confirmProps: { color: member.is_active ? "red" : "green" }, onConfirm: () => void updateTeamMember(member.id, { is_active: !member.is_active }).then(() => queryClient.invalidateQueries({ queryKey: ["team"] })).catch((error) => notifications.show({ title: "Unable to update account", message: getApiError(error).message, color: "red" })) });
  const columns = useMemo<ColumnDef<TeamMember, unknown>[]>(() => [
    { accessorKey: "username", header: "Team member", cell: ({ row }) => <Text fw={600}>{row.original.username}</Text> },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "role", header: "Role", cell: ({ row }) => <Badge color={row.original.role === "OWNER" ? "bahulu" : "blue"} variant="light">{row.original.role === "OWNER" ? "Owner" : "Staff"}</Badge> },
    { accessorKey: "is_active", header: "Status", cell: ({ row }) => <Badge color={row.original.is_active ? "green" : "gray"} variant="light">{row.original.is_active ? "Active" : "Inactive"}</Badge> },
    { accessorKey: "created_at", header: "Added", cell: ({ row }) => <Text size="sm">{new Date(row.original.created_at).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}</Text> },
    { id: "actions", header: "Actions", enableSorting: false, cell: ({ row }) => <Group gap="xs"><Tooltip label="Edit account"><ActionIcon aria-label="Edit account" variant="light" onClick={() => openEdit(row.original)}><IconEdit size={16} /></ActionIcon></Tooltip><Tooltip label={row.original.is_active ? "Deactivate" : "Reactivate"}><ActionIcon aria-label={row.original.is_active ? "Deactivate account" : "Reactivate account"} color={row.original.is_active ? "red" : "green"} variant="light" onClick={() => changeActive(row.original)}>{row.original.is_active ? <IconUserOff size={16} /> : <IconUserCheck size={16} />}</ActionIcon></Tooltip></Group> },
  ], [data]);
  return <>
    <PageHeader title="Team & Roles" description="Manage owner and staff access to the dashboard." action={<Button leftSection={<IconPlus size={16} />} onClick={openCreate}>Add team member</Button>} />
    <DataTable data={data} columns={columns} loading={isLoading} searchPlaceholder="Search team members..." emptyMessage="No team members found." />
    <Modal opened={opened} onClose={() => !save.isPending && setOpened(false)} title={editing ? "Edit team member" : "Add team member"} centered>
      <form onSubmit={form.onSubmit(() => save.mutate())}><Stack>
        <TextInput label="Name" withAsterisk {...form.getInputProps("username")} />
        <TextInput label="Email" withAsterisk {...form.getInputProps("email")} />
        <PasswordInput label={editing ? "New password (optional)" : "Password"} withAsterisk={!editing} {...form.getInputProps("password")} />
        <Select label="Role" data={[{ value: "STAFF", label: "Staff - daily operations" }, { value: "OWNER", label: "Owner - full access" }]} {...form.getInputProps("role")} />
        {editing ? <Switch label="Account is active" {...form.getInputProps("is_active", { type: "checkbox" })} /> : null}
        <Group justify="flex-end"><Button variant="default" onClick={() => setOpened(false)}>Cancel</Button><Button type="submit" loading={save.isPending}>Save account</Button></Group>
      </Stack></form>
    </Modal>
  </>;
}
