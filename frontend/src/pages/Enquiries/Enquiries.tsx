import { Alert, Badge, Button, Card, Group, Modal, Paper, Select, SimpleGrid, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconClipboardCheck, IconMessageDots, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { type Enquiry, type EnquiryInput, type EnquirySource, type EnquiryStatus, createEnquiry, createEnquiryTask, getEnquiries, getEnquirySummary, updateEnquiry, updateEnquiryStatus } from "../../api/enquiries";
import { getApiError } from "../../api/errors";
import { getTeam } from "../../api/team";
import PageHeader from "../../components/common/PageHeader";

const sourceOptions = [
  { value: "WHATSAPP", label: "WhatsApp" }, { value: "CALL", label: "Call" }, { value: "WALK_IN", label: "Walk-in" }, { value: "SOCIAL", label: "Social media" }, { value: "OTHER", label: "Other" },
] satisfies { value: EnquirySource; label: string }[];

const statusOptions = [
  { value: "NEW", label: "New" }, { value: "WORKING", label: "Working" }, { value: "RESOLVED", label: "Resolved" }, { value: "SPAM", label: "Spam" },
] satisfies { value: EnquiryStatus; label: string }[];

const statusColor: Record<EnquiryStatus, string> = { NEW: "blue", WORKING: "yellow", RESOLVED: "green", SPAM: "gray" };
const statusLabel = (status: EnquiryStatus) => statusOptions.find((option) => option.value === status)?.label ?? status;

export default function EnquiriesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [status, setStatus] = useState<EnquiryStatus | null>(null);
  const [source, setSource] = useState<EnquirySource | null>(null);
  const [editing, setEditing] = useState<Enquiry | null>(null);
  const [formOpened, setFormOpened] = useState(false);
  const [taskEnquiry, setTaskEnquiry] = useState<Enquiry | null>(null);
  const enquiries = useQuery({ queryKey: ["enquiries", status, source], queryFn: () => getEnquiries({ status: status ?? undefined, source: source ?? undefined }) });
  const summary = useQuery({ queryKey: ["enquiries-summary"], queryFn: getEnquirySummary });
  const team = useQuery({ queryKey: ["team"], queryFn: getTeam, enabled: taskEnquiry !== null });
  const form = useForm<EnquiryInput>({
    initialValues: { title: "", notes: "", source: "WHATSAPP", contact_name: "", reply_contact: "" },
    validate: { title: (value) => value.trim().length < 2 ? "Enter a short title" : null, notes: (value) => value.trim().length < 2 ? "Enter the enquiry notes" : null },
  });
  const taskForm = useForm({ initialValues: { title: "", instructions: "", priority: "NORMAL", due_at: "", assigned_admin_id: "" }, validate: { title: (value) => value.trim().length < 2 ? "Enter a task title" : null, instructions: (value) => value.trim().length < 2 ? "Enter clear instructions for the assignee" : null } });

  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["enquiries"] }); void queryClient.invalidateQueries({ queryKey: ["enquiries-summary"] }); };
  const save = useMutation({
    mutationFn: (values: EnquiryInput) => editing ? updateEnquiry(editing.id, values) : createEnquiry(values),
    onSuccess: () => { refresh(); const wasEditing = Boolean(editing); setEditing(null); setFormOpened(false); form.reset(); notifications.show({ title: wasEditing ? "Enquiry updated" : "Enquiry recorded", message: "This private enquiry is ready for Owner follow-up.", color: "green" }); },
    onError: (error) => { const parsed = getApiError(error); form.setErrors(parsed.fieldErrors); notifications.show({ title: "Could not save enquiry", message: parsed.message, color: "red" }); },
  });
  const changeStatus = useMutation({ mutationFn: ({ id, nextStatus }: { id: number; nextStatus: Exclude<EnquiryStatus, "NEW"> }) => updateEnquiryStatus(id, nextStatus), onSuccess: () => { refresh(); notifications.show({ title: "Enquiry updated", message: "The enquiry status has been recorded.", color: "green" }); }, onError: (error) => notifications.show({ title: "Could not update enquiry", message: getApiError(error).message, color: "red" }) });
  const createTask = useMutation({
    mutationFn: () => taskEnquiry ? createEnquiryTask(taskEnquiry.id, { title: taskForm.values.title.trim(), instructions: taskForm.values.instructions.trim(), priority: taskForm.values.priority as "LOW" | "NORMAL" | "HIGH", due_at: taskForm.values.due_at ? new Date(`${taskForm.values.due_at}+08:00`).toISOString() : null, assigned_admin_id: taskForm.values.assigned_admin_id ? Number(taskForm.values.assigned_admin_id) : null }) : Promise.reject(new Error("Choose a working enquiry first.")),
    onSuccess: () => { refresh(); setTaskEnquiry(null); taskForm.reset(); notifications.show({ title: "Task created", message: "The task is linked privately to this enquiry.", color: "green" }); },
    onError: (error) => notifications.show({ title: "Could not create task", message: getApiError(error).message, color: "red" }),
  });

  function openCreate(item?: Enquiry) {
    setEditing(item ?? null);
    form.setValues(item ? { title: item.title, notes: item.notes, source: item.source, contact_name: item.contact_name ?? "", reply_contact: item.reply_contact ?? "" } : { title: "", notes: "", source: "WHATSAPP", contact_name: "", reply_contact: "" });
    form.resetDirty();
    setFormOpened(true);
  }
  function openTask(item: Enquiry) {
    setTaskEnquiry(item);
    taskForm.setValues({ title: item.title, instructions: "", priority: "NORMAL", due_at: "", assigned_admin_id: "" });
    taskForm.resetDirty();
  }
  function confirmStatus(item: Enquiry, nextStatus: Exclude<EnquiryStatus, "NEW">) {
    modals.openConfirmModal({ title: `Mark enquiry as ${statusLabel(nextStatus).toLowerCase()}?`, children: <Text size="sm">This updates the private Owner history. Spam stays out of the normal work list.</Text>, labels: { confirm: `Mark ${statusLabel(nextStatus).toLowerCase()}`, cancel: "Cancel" }, confirmProps: { color: nextStatus === "SPAM" ? "gray" : nextStatus === "RESOLVED" ? "green" : "yellow" }, onConfirm: () => changeStatus.mutate({ id: item.id, nextStatus }) });
  }

  return <Stack gap="lg">
    <PageHeader title="Enquiries" description="Private Owner log for WhatsApp, calls, walk-ins, and social messages." action={<Button leftSection={<IconPlus size={16} />} onClick={() => openCreate()}>Record enquiry</Button>} />
    <Alert color="blue" variant="light" icon={<IconMessageDots size={18} />}>Record only the minimum contact information needed to reply. Never enter passwords, card details, secrets, or unapproved business claims.</Alert>
    <SimpleGrid cols={{ base: 2, sm: 4 }}>{statusOptions.map((item) => <Card key={item.value} withBorder radius="md" p="md"><Text size="xs" c="dimmed">{item.label}</Text><Text fw={800} fz="xl">{summary.data?.[item.value] ?? 0}</Text></Card>)}</SimpleGrid>
    <Card withBorder radius="lg" p="lg"><Group wrap="wrap"><Select clearable label="Status" placeholder="Normal work" data={statusOptions} value={status} onChange={(value) => setStatus(value as EnquiryStatus | null)} /><Select clearable label="Source" placeholder="All sources" data={sourceOptions} value={source} onChange={(value) => setSource(value as EnquirySource | null)} />{(status || source) && <Button variant="subtle" color="gray" mt="xl" onClick={() => { setStatus(null); setSource(null); }}>Reset filters</Button>}</Group></Card>
    {enquiries.isLoading ? <Text c="dimmed">Loading enquiries...</Text> : enquiries.isError ? <Alert color="red" title="Could not load enquiries"><Button size="compact-sm" variant="light" color="red" onClick={() => void enquiries.refetch()}>Try again</Button></Alert> : !enquiries.data?.length ? <Card withBorder radius="lg" p="xl"><Text fw={600}>{status === "SPAM" ? "No spam enquiries." : "No enquiries to show."}</Text><Text size="sm" c="dimmed">{status ? "Try another filter or record an enquiry." : "Spam is hidden from this normal work view."}</Text></Card> : <Stack>{enquiries.data.map((item) => <Card key={item.id} withBorder radius="lg" p="lg"><Group justify="space-between" align="flex-start" wrap="wrap"><Stack gap="xs" style={{ maxWidth: 720 }}><Group gap="xs"><Text fw={700}>{item.title}</Text><Badge color={statusColor[item.status]} variant="light">{statusLabel(item.status)}</Badge><Badge variant="outline">{sourceOptions.find((option) => option.value === item.source)?.label ?? item.source}</Badge></Group>{(item.contact_name || item.reply_contact) && <Text size="sm" c="dimmed">Contact: {[item.contact_name, item.reply_contact].filter(Boolean).join(" - ")}</Text>}<Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{item.notes}</Text><Text size="xs" c="dimmed">Recorded {new Date(item.created_at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}{item.status_updated_at ? ` - updated ${new Date(item.status_updated_at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}` : ""}</Text>{item.task ? <Paper withBorder p="sm" radius="md"><Group justify="space-between" wrap="wrap"><Text size="sm">Linked task: <strong>{item.task.title}</strong> - {item.task.status.replaceAll("_", " ")}</Text><Button size="compact-sm" variant="subtle" onClick={() => navigate("/tasks")}>Open tasks</Button></Group></Paper> : null}</Stack><Group gap="xs" wrap="wrap">{["NEW", "WORKING"].includes(item.status) ? <Button size="compact-sm" variant="default" onClick={() => openCreate(item)}>Edit</Button> : null}{item.status === "NEW" ? <Button size="compact-sm" color="yellow" onClick={() => confirmStatus(item, "WORKING")}>Start working</Button> : null}{item.status === "WORKING" ? <><Button size="compact-sm" color="green" onClick={() => confirmStatus(item, "RESOLVED")}>Resolve</Button>{!item.task_id ? <Button size="compact-sm" leftSection={<IconClipboardCheck size={15} />} onClick={() => openTask(item)}>Create task</Button> : null}</> : null}{["NEW", "WORKING"].includes(item.status) ? <Button size="compact-sm" color="gray" variant="light" onClick={() => confirmStatus(item, "SPAM")}>Mark spam</Button> : null}</Group></Group></Card>)}</Stack>}
    <Modal opened={formOpened} onClose={() => !save.isPending && setFormOpened(false)} title={editing?.id ? "Edit enquiry" : "Record enquiry"} centered><form onSubmit={form.onSubmit((values) => save.mutate({ title: values.title.trim(), notes: values.notes.trim(), source: values.source, contact_name: values.contact_name?.trim() || null, reply_contact: values.reply_contact?.trim() || null }))}><Stack><TextInput label="Short title" withAsterisk {...form.getInputProps("title")} /><Select label="Source" data={sourceOptions} withAsterisk {...form.getInputProps("source")} /><TextInput label="Contact name" description="Optional - only if needed to reply." {...form.getInputProps("contact_name")} /><TextInput label="Reply contact" description="Optional phone, WhatsApp number, or social handle." {...form.getInputProps("reply_contact")} /><Textarea label="Private notes" minRows={6} description="Never include passwords, payment-card information, secrets, or unapproved business claims." withAsterisk {...form.getInputProps("notes")} /><Group justify="flex-end"><Button variant="default" type="button" onClick={() => { setFormOpened(false); setEditing(null); }}>Cancel</Button><Button type="submit" loading={save.isPending}>Save enquiry</Button></Group></Stack></form></Modal>
    <Modal opened={taskEnquiry !== null} onClose={() => !createTask.isPending && setTaskEnquiry(null)} title="Create task from working enquiry" centered><Stack><Paper withBorder p="sm" radius="md"><Text fw={600} size="sm">{taskEnquiry?.title}</Text><Text size="xs" c="dimmed">The private enquiry and its contact details remain visible only to Owners.</Text></Paper><form onSubmit={taskForm.onSubmit(() => createTask.mutate())}><Stack><TextInput label="Task" withAsterisk {...taskForm.getInputProps("title")} /><Textarea label="Final instructions" description="Give the assignee what they need; do not copy private contact details unless essential and authorised." minRows={4} withAsterisk {...taskForm.getInputProps("instructions")} /><Select label="Priority" data={["LOW", "NORMAL", "HIGH"]} {...taskForm.getInputProps("priority")} /><Select label="Assign to" clearable searchable data={(team.data ?? []).filter((member) => member.is_active).map((member) => ({ value: String(member.id), label: member.username }))} {...taskForm.getInputProps("assigned_admin_id")} /><TextInput label="Due (Malaysia time)" type="datetime-local" {...taskForm.getInputProps("due_at")} /><Group justify="flex-end"><Button variant="default" type="button" onClick={() => setTaskEnquiry(null)}>Cancel</Button><Button type="submit" loading={createTask.isPending}>Create linked task</Button></Group></Stack></form></Stack></Modal>
  </Stack>;
}
