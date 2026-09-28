import { ActionIcon, Alert, Badge, Button, Card, FileButton, Group, Image, Modal, Pagination, SegmentedControl, SimpleGrid, Stack, Text, TextInput, Textarea, Tooltip } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconArchive, IconEdit, IconLayoutGrid, IconList, IconPhotoPlus, IconRestore, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { deleteMedia, getMedia, mediaUrl, setMediaArchived, updateMedia, uploadMedia } from "../../api/media";
import { getApiError } from "../../api/errors";
import useAuth from "../../auth/useAuth";
import PageHeader from "../../components/common/PageHeader";
import type { MediaAsset } from "../../types/media";

function bytes(value: number | null) {
  if (value === null) return "Size unavailable";
  return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export default function MediaLibrary() {
  const { admin } = useAuth();
  const canEdit = admin?.role === "OWNER";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(""); const [debounced] = useDebouncedValue(search, 250);
  const [status, setStatus] = useState<"active" | "archived" | "all">("active");
  const [view, setView] = useState<"grid" | "list">("grid"); const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<MediaAsset | null>(null); const [uploadProgress, setUploadProgress] = useState("");
  const form = useForm({ initialValues: { title: "", note: "" }, validate: { title: (value) => value.trim() ? null : "Enter an internal title" } });
  const query = useQuery({ queryKey: ["media", debounced, status, page], queryFn: () => getMedia({ search: debounced, status, page, page_size: 24 }) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["media"] });
  const upload = useMutation({ mutationFn: async (files: File[]) => { const errors: string[] = []; let reused = 0; for (let index = 0; index < files.length; index += 1) { setUploadProgress(`Uploading ${index + 1} of ${files.length}: ${files[index].name}`); try { if ((await uploadMedia(files[index])).was_reused) reused += 1; } catch (error) { errors.push(`${files[index].name}: ${getApiError(error).message}`); } } if (errors.length) throw new Error(errors.join("\n")); return reused; }, onSuccess: (reused) => { setUploadProgress(""); void refresh(); notifications.show({ color: "green", title: "Photos uploaded", message: reused ? `${reused} duplicate ${reused === 1 ? "photo was" : "photos were"} reused from the library.` : "The Media Library is up to date." }); }, onError: (error) => { setUploadProgress(""); void refresh(); notifications.show({ color: "red", title: "Some photos were not uploaded", message: error instanceof Error ? error.message : getApiError(error).message }); } });
  const save = useMutation({ mutationFn: () => updateMedia(editing!.id, { title: form.values.title.trim(), note: form.values.note.trim() || null }), onSuccess: () => { void refresh(); setEditing(null); notifications.show({ color: "green", title: "Photo details saved", message: "The internal media details were updated." }); }, onError: (error) => notifications.show({ color: "red", title: "Unable to save photo details", message: getApiError(error).message }) });
  const archive = useMutation({ mutationFn: ({ asset, archived }: { asset: MediaAsset; archived: boolean }) => setMediaArchived(asset.id, archived), onSuccess: (_, variables) => { void refresh(); notifications.show({ color: "green", title: variables.archived ? "Photo archived" : "Photo restored", message: variables.archived ? "Existing product uses remain visible." : "The photo can be selected again." }); }, onError: (error) => notifications.show({ color: "red", title: "Unable to update photo", message: getApiError(error).message }) });
  const remove = useMutation({ mutationFn: deleteMedia, onSuccess: () => { void refresh(); notifications.show({ color: "green", title: "Photo permanently deleted", message: "The unused media file was removed." }); }, onError: (error) => { void refresh(); notifications.show({ color: "red", title: "Unable to delete photo", message: getApiError(error).message }); } });
  const openEdit = (asset: MediaAsset) => { setEditing(asset); form.setValues({ title: asset.title, note: asset.note ?? "" }); form.resetDirty(); };
  const confirmArchive = (asset: MediaAsset) => modals.openConfirmModal({ title: `${asset.is_archived ? "Restore" : "Archive"} ${asset.title}?`, children: <Text size="sm">{asset.is_archived ? "This photo will be available for new product selections." : "Existing product uses remain visible, but this photo cannot be newly selected."}</Text>, labels: { confirm: asset.is_archived ? "Restore photo" : "Archive photo", cancel: "Cancel" }, onConfirm: () => archive.mutate({ asset, archived: !asset.is_archived }) });
  const confirmDelete = (asset: MediaAsset) => modals.openConfirmModal({ title: `Permanently delete ${asset.title}?`, children: <Text size="sm">This cannot be undone. The photo must be archived and unused by every product.</Text>, labels: { confirm: "Delete permanently", cancel: "Keep photo" }, confirmProps: { color: "red" }, onConfirm: () => remove.mutate(asset.id) });
  return <Stack gap="lg">
    <PageHeader title="Media Library" description="Upload approved product photos once and reuse them across product galleries." action={canEdit ? <FileButton multiple accept="image/jpeg,image/png,image/webp" onChange={(files) => files.length && upload.mutate(files)}>{(props) => <Button {...props} leftSection={<IconPhotoPlus size={16} />} loading={upload.isPending}>Upload photos</Button>}</FileButton> : undefined} />
    {uploadProgress ? <Alert color="blue" role="status">{uploadProgress}</Alert> : null}
    {!canEdit ? <Alert color="blue" title="Read-only access">Staff can review media and product usage. Only an Owner can upload or change photos.</Alert> : null}
    <Group align="end" justify="space-between">
      <TextInput label="Search" placeholder="Title or internal note" value={search} onChange={(event) => { setSearch(event.currentTarget.value); setPage(1); }} style={{ flex: 1, minWidth: 220 }} />
      <SegmentedControl aria-label="Media status" value={status} onChange={(value) => { setStatus(value as typeof status); setPage(1); }} data={[{ label: "Active", value: "active" }, { label: "Archived", value: "archived" }, { label: "All", value: "all" }]} />
      <SegmentedControl aria-label="Media layout" value={view} onChange={(value) => setView(value as typeof view)} data={[{ label: <IconLayoutGrid size={16} aria-label="Grid" />, value: "grid" }, { label: <IconList size={16} aria-label="List" />, value: "list" }]} />
    </Group>
    {query.isLoading ? <Text role="status" c="dimmed">Loading Media Library…</Text> : null}
    {query.isError ? <Alert color="red" title="Media Library could not be loaded"><Button variant="light" size="compact-sm" onClick={() => void query.refetch()}>Try again</Button></Alert> : null}
    {query.isSuccess && query.data.items.length === 0 ? <Alert title="No photos found">{search ? "Try another search." : status === "archived" ? "There are no archived photos." : "Upload an approved product photo to get started."}</Alert> : null}
    <SimpleGrid cols={view === "grid" ? { base: 1, sm: 2, lg: 3 } : 1}>
      {query.data?.items.map((asset) => <Card key={asset.id} withBorder radius="lg" p="sm">
        <Group align="flex-start" wrap="nowrap">
          <Image src={mediaUrl(asset.content_path)} alt="" w={view === "list" ? 140 : 120} h={120} fit="contain" bg="#fffaf1" radius="md" />
          <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
            <Group justify="space-between" wrap="nowrap"><Text fw={700} truncate>{asset.title}</Text>{asset.is_archived ? <Badge color="gray">Archived</Badge> : <Badge color="green">Active</Badge>}</Group>
            <Text size="xs" c="dimmed">{asset.width && asset.height ? `${asset.width} × ${asset.height}` : "Dimensions unavailable"} · {bytes(asset.byte_size)}</Text>
            <Text size="sm">Used by {asset.usage_count} {asset.usage_count === 1 ? "product" : "products"}</Text>
            {asset.usages.length ? <Text size="xs" c="dimmed" lineClamp={2}>{asset.usages.map((usage) => usage.product_name).join(", ")}</Text> : null}
            {asset.note ? <Text size="sm" c="dimmed" lineClamp={2}>{asset.note}</Text> : null}
            {canEdit ? <Group gap="xs">
              <Tooltip label="Edit details"><ActionIcon variant="light" aria-label={`Edit ${asset.title}`} onClick={() => openEdit(asset)}><IconEdit size={16} /></ActionIcon></Tooltip>
              <Tooltip label={asset.is_archived ? "Restore" : "Archive"}><ActionIcon variant="light" aria-label={`${asset.is_archived ? "Restore" : "Archive"} ${asset.title}`} onClick={() => confirmArchive(asset)}>{asset.is_archived ? <IconRestore size={16} /> : <IconArchive size={16} />}</ActionIcon></Tooltip>
              {asset.is_archived ? <Tooltip label={asset.usage_count ? "Remove all product uses first" : "Delete permanently"}><ActionIcon color="red" variant="light" disabled={asset.usage_count > 0} aria-label={`Permanently delete ${asset.title}`} onClick={() => confirmDelete(asset)}><IconTrash size={16} /></ActionIcon></Tooltip> : null}
            </Group> : null}
          </Stack>
        </Group>
      </Card>)}
    </SimpleGrid>
    {(query.data?.pages ?? 1) > 1 ? <Pagination value={page} onChange={setPage} total={query.data?.pages ?? 1} /> : null}
    <Modal opened={editing !== null} onClose={() => !save.isPending && setEditing(null)} title="Edit photo details" centered>
      <form onSubmit={form.onSubmit(() => save.mutate())}><Stack><TextInput label="Internal title" withAsterisk maxLength={120} {...form.getInputProps("title")} /><Textarea label="Internal note" description="Visible only in the dashboard." maxLength={1000} minRows={3} {...form.getInputProps("note")} /><Group justify="flex-end"><Button variant="default" disabled={save.isPending} onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={save.isPending}>Save details</Button></Group></Stack></form>
    </Modal>
  </Stack>;
}
