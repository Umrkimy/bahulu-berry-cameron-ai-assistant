import { Alert, Button, FileInput, Group, Modal, ScrollArea, Stack, Table, Text } from "@mantine/core";
import { IconAlertTriangle, IconFileSpreadsheet, IconUpload } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";

import { importProducts, previewProductImport, type ProductImportPreview } from "../../api/products";
import { getApiError } from "../../api/errors";

export default function ProductImportModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ProductImportPreview | null>(null);
  const previewMutation = useMutation({
    mutationFn: () => previewProductImport(file!),
    onSuccess: setPreview,
    onError: (error) => notifications.show({ title: "Unable to preview CSV", message: getApiError(error).message, color: "red" }),
  });
  const importMutation = useMutation({
    mutationFn: () => importProducts(file!),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      notifications.show({ title: "Products imported", message: result.message, color: "green" });
      setFile(null); setPreview(null); onClose();
    },
    onError: (error) => notifications.show({ title: "Import not completed", message: getApiError(error).message, color: "red" }),
  });
  const changeFile = (selected: File | null) => { setFile(selected); setPreview(null); };
  const confirmImport = () => modals.openConfirmModal({
    title: "Import products?",
    children: <Text size="sm">This will add {preview?.rows.length ?? 0} products and their opening stock to the current database. Existing products will not be changed.</Text>,
    labels: { confirm: "Import products", cancel: "Go back" },
    confirmProps: { color: "bahulu" },
    onConfirm: () => void importMutation.mutate(),
  });
  const busy = previewMutation.isPending || importMutation.isPending;
  return <Modal opened={opened} onClose={() => !busy && onClose()} title="Import products from CSV" centered size="xl">
    <Stack gap="md">
      <Alert color="blue" variant="light" icon={<IconFileSpreadsheet size={18} />}>Upload the downloaded template. Previewing never changes the database; import creates every valid row together.</Alert>
      <FileInput label="CSV file" accept=".csv,text/csv" placeholder="Choose a product CSV" value={file} onChange={changeFile} disabled={busy} clearable />
      <Group justify="flex-end"><Button leftSection={<IconUpload size={16} />} onClick={() => previewMutation.mutate()} disabled={!file} loading={previewMutation.isPending}>Preview CSV</Button></Group>
      {preview ? <>
        <Alert color={preview.can_import ? "green" : "red"} icon={preview.can_import ? undefined : <IconAlertTriangle size={18} />}>{preview.can_import ? `${preview.rows.length} products are ready to import.` : `${preview.errors.length} issue${preview.errors.length === 1 ? "" : "s"} must be corrected before import.`}</Alert>
        {preview.errors.length ? <ScrollArea h={150}><Stack gap="xs">{preview.errors.map((issue, index) => <Text key={`${issue.row_number}-${issue.field}-${index}`} size="sm" c="red">{issue.row_number ? `Row ${issue.row_number}${issue.field ? ` (${issue.field})` : ""}: ` : ""}{issue.message}</Text>)}</Stack></ScrollArea> : null}
        {preview.rows.length ? <ScrollArea><Table striped withTableBorder highlightOnHover><Table.Thead><Table.Tr><Table.Th>Row</Table.Th><Table.Th>Name</Table.Th><Table.Th>Category</Table.Th><Table.Th>Price</Table.Th><Table.Th>Opening stock</Table.Th><Table.Th>Low-stock</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{preview.rows.map((row) => <Table.Tr key={row.row_number}><Table.Td>{row.row_number}</Table.Td><Table.Td>{row.name}</Table.Td><Table.Td>{row.category ?? "—"}</Table.Td><Table.Td>RM {Number(row.price_myr).toFixed(2)}</Table.Td><Table.Td>{row.opening_stock}</Table.Td><Table.Td>{row.low_stock_threshold}</Table.Td></Table.Tr>)}</Table.Tbody></Table></ScrollArea> : null}
        <Group justify="flex-end"><Button color="bahulu" onClick={confirmImport} disabled={!preview.can_import || importMutation.isPending} loading={importMutation.isPending}>Confirm import</Button></Group>
      </> : null}
    </Stack>
  </Modal>;
}
