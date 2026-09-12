import { Badge, Button, Card, Group, Modal, Paper, Select, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createTask, getTasks, updateTask, type Task, type TaskContextType } from "../../api/tasks";
import { getTeam } from "../../api/team";
import { getOrders } from "../../api/orders";
import { getDeliveries } from "../../api/deliveries";
import { getInventories } from "../../api/inventory";
import useAuth from "../../auth/useAuth";
import PageHeader from "../../components/common/PageHeader";
import { getApiError } from "../../api/errors";

type TaskLocationState = { taskContext?: { type: TaskContextType; id: number; label: string } };

const contextNames: Record<TaskContextType, string> = { ORDER: "Order", DELIVERY: "Delivery", INVENTORY: "Inventory" };
const contextRoute: Record<TaskContextType, string> = { ORDER: "/orders", DELIVERY: "/deliveries", INVENTORY: "/inventory" };

export default function Tasks() {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const routeContext = (location.state as TaskLocationState | null)?.taskContext;
  const [opened, setOpened] = useState(Boolean(routeContext));
  const [completionTask, setCompletionTask] = useState<Task | null>(null);
  const { data: tasks = [], isLoading, isError, error, refetch } = useQuery({ queryKey: ["tasks", admin?.id], queryFn: getTasks });
  const team = useQuery({ queryKey: ["team"], queryFn: getTeam, enabled: admin?.role === "OWNER" });
  const orders = useQuery({ queryKey: ["orders"], queryFn: getOrders, enabled: opened && admin?.role === "OWNER" });
  const deliveries = useQuery({ queryKey: ["deliveries"], queryFn: getDeliveries, enabled: opened && admin?.role === "OWNER" });
  const inventory = useQuery({ queryKey: ["inventories"], queryFn: getInventories, enabled: opened && admin?.role === "OWNER" });
  const form = useForm({ initialValues: { title: "", description: "", priority: "NORMAL", assigned_admin_id: "", due_at: "", context_type: (routeContext?.type ?? "") as "" | TaskContextType, context_id: routeContext ? String(routeContext.id) : "" } , validate: { title: (value) => value.trim().length < 2 ? "Enter a task title" : null, context_id: (value, values) => values.context_type && !value ? "Choose the related record" : null } });
  const completionForm = useForm({ initialValues: { note: "" } });

  const save = useMutation({
    mutationFn: () => createTask({ ...form.values, assigned_admin_id: form.values.assigned_admin_id ? Number(form.values.assigned_admin_id) : null, due_at: form.values.due_at ? new Date(`${form.values.due_at}+08:00`).toISOString() : null, context_type: form.values.context_type || null, context_id: form.values.context_id ? Number(form.values.context_id) : null }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["tasks"] }); void queryClient.invalidateQueries({ queryKey: ["notifications"] }); setOpened(false); form.reset(); navigate(location.pathname, { replace: true, state: null }); notifications.show({ title: "Task created", message: "The task is ready for the assigned team member.", color: "green" }); },
    onError: (error) => { const parsed = getApiError(error); form.setErrors(parsed.fieldErrors); notifications.show({ title: "Could not create task", message: parsed.message, color: "red" }); },
  });
  const change = useMutation({
    mutationFn: ({ id, status, completion_note }: { id: number; status: Task["status"]; completion_note?: string }) => updateTask(id, { status, completion_note }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["tasks"] }); void queryClient.invalidateQueries({ queryKey: ["notifications"] }); setCompletionTask(null); completionForm.reset(); },
    onError: (error) => notifications.show({ title: "Could not update task", message: getApiError(error).message, color: "red" }),
  });
  const contextOptions = form.values.context_type === "ORDER" ? (orders.data ?? []).map((order) => ({ value: String(order.id), label: `Order #${order.id} · ${order.status}` })) : form.values.context_type === "DELIVERY" ? (deliveries.data ?? []).map((delivery) => ({ value: String(delivery.id), label: `Delivery for Order #${delivery.order_id} · ${delivery.status}` })) : (inventory.data ?? []).map((item) => ({ value: String(item.id), label: `${item.product_name} · ${item.quantity} in stock` }));

  function openTaskContext(task: Task) {
    if (!task.context_type || !task.context_id) return;
    navigate(contextRoute[task.context_type], { state: task.context_type === "ORDER" ? { openOrderId: task.context_id } : task.context_type === "DELIVERY" ? { openDeliveryId: task.context_id } : { openInventoryId: task.context_id } });
  }
  function changeStatus(task: Task, status: Task["status"]) {
    if (status === "COMPLETED" && task.status !== "COMPLETED" && !task.completion_note) { setCompletionTask(task); return; }
    change.mutate({ id: task.id, status });
  }
  function closeCreate() {
    if (save.isPending) return;
    if (form.isDirty()) modals.openConfirmModal({ title: "Discard unsaved task?", children: <Text>Your changes have not been saved.</Text>, labels: { confirm: "Discard", cancel: "Keep editing" }, onConfirm: () => { setOpened(false); form.reset(); } });
    else { setOpened(false); navigate(location.pathname, { replace: true, state: null }); }
  }

  return <>
    <PageHeader title={admin?.role === "OWNER" ? "Team tasks" : "My tasks"} description="Coordinate work with a clear order, delivery, or inventory context." action={admin?.role === "OWNER" ? <Button onClick={() => setOpened(true)}>Add task</Button> : undefined} />
    <Stack>{isLoading ? <Text c="dimmed">Loading tasks...</Text> : null}{isError ? <Card withBorder><Text c="red" role="alert">{getApiError(error).message}</Text><Button mt="sm" size="compact-xs" variant="light" onClick={() => void refetch()}>Try again</Button></Card> : null}{!isLoading && !isError && tasks.length === 0 ? <Text c="dimmed">No tasks assigned yet.</Text> : null}{!isLoading && !isError ? tasks.map((task) => <Card key={task.id} withBorder radius="md"><Group justify="space-between" align="flex-start" wrap="nowrap"><Stack gap="xs" style={{ minWidth: 0 }}><Text fw={700}>{task.title}</Text>{task.description && <Text size="sm" c="dimmed">{task.description}</Text>}{task.context_label && <Paper withBorder p="xs" radius="sm"><Group justify="space-between"><Text size="sm" fw={600}>Related to: {task.context_label}</Text><Button size="compact-xs" variant="subtle" onClick={() => openTaskContext(task)}>Open {task.context_type ? contextNames[task.context_type] : "record"}</Button></Group></Paper>}{task.due_at && <Text size="xs" c="dimmed">Due {new Date(task.due_at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}</Text>}{task.completion_note && <Text size="sm" c="dimmed">Completion note: {task.completion_note}</Text>}</Stack><Stack gap="xs" align="flex-end"><Badge color={task.priority === "HIGH" ? "red" : "blue"}>{task.priority}</Badge><Select aria-label={`Status for ${task.title}`} disabled={change.isPending} w={150} value={task.status} data={["OPEN", "IN_PROGRESS", "COMPLETED"]} onChange={(value) => value && changeStatus(task, value as Task["status"])} /></Stack></Group></Card>) : null}</Stack>
    <Modal opened={opened && admin?.role === "OWNER"} onClose={closeCreate} title="Create task" centered><form onSubmit={form.onSubmit(() => save.mutate())}><Stack><TextInput label="Task" withAsterisk {...form.getInputProps("title")} /><Textarea label="Instructions" {...form.getInputProps("description")} /><Select label="Priority" data={["LOW", "NORMAL", "HIGH"]} {...form.getInputProps("priority")} /><Select label="Assign to" clearable data={(team.data ?? []).filter((member) => member.is_active).map((member) => ({ value: String(member.id), label: member.username }))} {...form.getInputProps("assigned_admin_id")} /><Select label="Related to" clearable data={[{ value: "ORDER", label: "Order" }, { value: "DELIVERY", label: "Delivery" }, { value: "INVENTORY", label: "Product inventory" }]} {...form.getInputProps("context_type")} onChange={(value) => { form.setFieldValue("context_type", (value ?? "") as "" | TaskContextType); form.setFieldValue("context_id", ""); }} />{form.values.context_type && <Select label={`Choose ${contextNames[form.values.context_type]}`} searchable data={contextOptions} {...form.getInputProps("context_id")} />}<TextInput label="Due (Malaysia time)" type="datetime-local" {...form.getInputProps("due_at")} /><Button type="submit" loading={save.isPending}>Create task</Button></Stack></form></Modal>
    <Modal opened={completionTask !== null} onClose={() => !change.isPending && setCompletionTask(null)} title="Complete task" centered><form onSubmit={completionForm.onSubmit((values) => { if (completionTask) change.mutate({ id: completionTask.id, status: "COMPLETED", completion_note: values.note.trim() || undefined }); })}><Stack><Text size="sm">Add an optional short completion note. It cannot be edited after saving.</Text><Textarea label="Completion note" {...completionForm.getInputProps("note")} /><Group justify="flex-end"><Button variant="default" type="button" onClick={() => setCompletionTask(null)}>Cancel</Button><Button type="submit" loading={change.isPending}>Mark completed</Button></Group></Stack></form></Modal>
  </>;
}
