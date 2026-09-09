import { useState } from "react";
import { ActionIcon, Alert, Badge, Button, Group, Modal, NumberInput, Paper, Select, Stack, Text, TextInput } from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useQuery } from "@tanstack/react-query";

import api from "../../api/axios";
import { getApiError } from "../../api/errors";
import { useBatchStockReceipt } from "../../hooks/useInventory";
import type { Inventory } from "../../types/inventory";

type ReceiptLine = { inventory_id: number; quantity: number };

export default function BatchStockReceiptModal({ opened, onClose, inventories }: { opened: boolean; onClose: () => void; inventories: Inventory[] }) {
  const receipt = useBatchStockReceipt();
  const suppliers = useQuery({ queryKey: ["supplier-options"], queryFn: async () => (await api.get<Array<{ id: number; name: string }>>("/inventories/supplier-options")).data, enabled: opened });
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number | string>(1);
  const [lines, setLines] = useState<ReceiptLine[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedIds = new Set(lines.map((line) => line.inventory_id));
  const inventoryOptions = inventories.filter((item) => !selectedIds.has(item.id)).map((item) => ({ value: String(item.id), label: `${item.product_name} · ${item.quantity} in stock` }));
  const lineInventory = (line: ReceiptLine) => inventories.find((item) => item.id === line.inventory_id);

  function reset() { setSupplierId(null); setReference(""); setSelectedInventoryId(null); setQuantity(1); setLines([]); setReviewing(false); setError(null); }
  function close() { if (!receipt.isPending) { reset(); onClose(); } }
  function addLine() {
    const parsedQuantity = Number(quantity);
    if (!selectedInventoryId || !Number.isInteger(parsedQuantity) || parsedQuantity < 1) { setError("Choose a product and enter a whole quantity of at least 1."); return; }
    const inventoryId = Number(selectedInventoryId);
    if (selectedIds.has(inventoryId)) { setError("A product can only appear once in this receipt."); return; }
    setLines((current) => [...current, { inventory_id: inventoryId, quantity: parsedQuantity }]);
    setSelectedInventoryId(null); setQuantity(1); setError(null);
  }
  function openReview() {
    if (!supplierId) { setError("Choose the supplier for this receipt."); return; }
    if (reference.trim().length < 2) { setError("Enter the delivery-note or invoice reference."); return; }
    if (!lines.length) { setError("Add at least one product to receive."); return; }
    setError(null); setReviewing(true);
  }
  async function confirmReceipt() {
    try {
      const result = await receipt.mutateAsync({ supplier_id: Number(supplierId), reference: reference.trim(), items: lines });
      notifications.show({ title: "Stock received", message: `${result.received_count} product${result.received_count === 1 ? "" : "s"} updated.`, color: "green" });
      close();
    } catch (exception) {
      setError(getApiError(exception).message);
      setReviewing(false);
    }
  }

  return <Modal opened={opened} onClose={close} centered size="lg" title={reviewing ? "Review stock receipt" : "Receive supplier stock"} closeOnClickOutside={!receipt.isPending} closeOnEscape={!receipt.isPending}>
    <Stack gap="md">
      {error ? <Alert color="red" title="Receipt needs attention">{error}</Alert> : null}
      {reviewing ? <><Paper withBorder p="md" radius="md"><Text fw={700}>{suppliers.data?.find((item) => item.id === Number(supplierId))?.name ?? "Selected supplier"}</Text><Text size="sm" c="dimmed">Reference: {reference.trim()}</Text></Paper><Stack gap="xs">{lines.map((line) => { const inventory = lineInventory(line); return <Paper key={line.inventory_id} withBorder p="sm" radius="md"><Group justify="space-between"><Text fw={600}>{inventory?.product_name ?? "Unavailable product"}</Text><Badge color="green" variant="light">+{line.quantity} units</Badge></Group></Paper>; })}</Stack><Text size="sm" c="dimmed">Confirming creates immutable receipt movements for every product using this shared reference.</Text><Group justify="flex-end"><Button variant="default" onClick={() => setReviewing(false)} disabled={receipt.isPending}>Back</Button><Button onClick={() => void confirmReceipt()} loading={receipt.isPending}>Confirm receipt</Button></Group></> : <><Select label="Supplier" placeholder={suppliers.isLoading ? "Loading suppliers…" : "Choose supplier"} data={(suppliers.data ?? []).map((item) => ({ value: String(item.id), label: item.name }))} value={supplierId} onChange={setSupplierId} searchable withAsterisk disabled={receipt.isPending} /><TextInput label="Delivery note or invoice reference" placeholder="e.g. DN-2026-001" value={reference} onChange={(event) => setReference(event.currentTarget.value)} withAsterisk disabled={receipt.isPending} /><Paper withBorder p="md" radius="md"><Stack gap="sm"><Text fw={700}>Products received</Text><Group align="end" wrap="wrap"><Select label="Product" placeholder="Choose product" data={inventoryOptions} value={selectedInventoryId} onChange={setSelectedInventoryId} searchable style={{ flex: 1, minWidth: 220 }} disabled={receipt.isPending || !inventoryOptions.length} /><NumberInput label="Units" min={1} allowDecimal={false} value={quantity} onChange={setQuantity} w={120} disabled={receipt.isPending} /><Button leftSection={<IconPlus size={16} />} onClick={addLine} disabled={receipt.isPending}>Add</Button></Group>{lines.length ? <Stack gap="xs">{lines.map((line) => { const inventory = lineInventory(line); return <Group key={line.inventory_id} justify="space-between" wrap="nowrap"><div><Text fw={600} size="sm">{inventory?.product_name ?? "Unavailable product"}</Text><Text size="xs" c="dimmed">{inventory?.quantity ?? 0} currently in stock</Text></div><Group gap="xs"><Badge variant="light">+{line.quantity}</Badge><ActionIcon aria-label={`Remove ${inventory?.product_name ?? "product"}`} color="red" variant="subtle" onClick={() => setLines((current) => current.filter((item) => item.inventory_id !== line.inventory_id))}><IconTrash size={16} /></ActionIcon></Group></Group>; })}</Stack> : <Text size="sm" c="dimmed">Add each product from this supplier delivery.</Text>}</Stack></Paper><Group justify="flex-end"><Button variant="default" onClick={close} disabled={receipt.isPending}>Cancel</Button><Button onClick={openReview} disabled={receipt.isPending}>Review receipt</Button></Group></>}
    </Stack>
  </Modal>;
}
