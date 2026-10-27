import { useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Code, Group, Modal, SegmentedControl, SimpleGrid, Stack, Text, TextInput, Textarea, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconMessageChatbot } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { getApiError } from "../../api/errors";
import { getMenuCopy, MENU_STATUS_KEYS, MENU_TEXT_KEYS, saveMenuCopy, type MenuCopy, type MenuLanguage, type MenuStatusKey, type MenuTextKey } from "../../api/whatsappMenu";

const MAX_MESSAGE = 1000;
const MAX_STATUS = 60;
const REQUIRED: Partial<Record<MenuTextKey, string[]>> = { order_status: ["number", "status"] };

const SECTIONS: { title: string; fields: { key: MenuTextKey; label: string; description: string }[] }[] = [
  { title: "Main menu", fields: [
    { key: "menu", label: "Main menu", description: "Sent for a greeting, *, or the first message. Keep options 1 to 6 in this order; Berry's replies depend on the numbers." },
    { key: "back", label: "Back to menu line", description: "Added under most replies." },
  ] },
  { title: "1 Products", fields: [
    { key: "products", label: "Product list heading", description: "Shown above the products and RM prices, which come from the backend." },
    { key: "sold_out", label: "Sold-out label", description: "Shown next to a product with no stock." },
    { key: "no_products", label: "No products", description: "Sent when no product is published." },
    { key: "browse", label: "Website line", description: "Shown under the product list." },
  ] },
  { title: "2 and 3 Ordering", fields: [
    { key: "order", label: "How to order", description: "Reply to 2." },
    { key: "ask_order", label: "Ask for the order number", description: "Reply to 3." },
    { key: "order_status", label: "Order status", description: "Sent when the order matches the customer's WhatsApp number." },
    { key: "order_not_found", label: "Order not found", description: "Sent when the order is missing or belongs to another number." },
  ] },
  { title: "4 and 5 Hours and staff", fields: [
    { key: "hours", label: "Hours and location", description: "Reply to 4. Hours, address and map link are set in code." },
    { key: "handoff", label: "Talk to staff", description: "Reply to 5, or when the customer asks for a person." },
  ] },
  { title: "Ratings", fields: [
    { key: "rating_ask", label: "Ask for a rating", description: "Sent when staff press Finish chat." },
    { key: "rating_thanks", label: "Thanks for the rating", description: "Sent after the customer replies 1 to 5." },
    { key: "comment_thanks", label: "Thanks for the comment", description: "Sent after the optional comment." },
  ] },
];

const STATUS_LABELS: Record<MenuStatusKey, string> = { PENDING: "Pending", PROCESSING: "Processing", SHIPPED: "Shipped", COMPLETED: "Completed", CANCELLED: "Cancelled" };
const brace = (name: string) => `{${name}}`;

function menuTextIssue(key: MenuTextKey, text: string, allowed: string[]): string | null {
  const value = text.trim();
  if (!value) return "This message can't be empty.";
  if (value.length > MAX_MESSAGE) return `Keep this under ${MAX_MESSAGE} characters.`;
  const used = [...value.matchAll(/\{([a-z_]+)\}/g)].map((match) => match[1]);
  const unknown = [...new Set(used.filter((name) => !allowed.includes(name)))];
  if (unknown.length) return `Remove ${unknown.map(brace).join(", ")}; this message can only use ${allowed.map(brace).join(", ") || "no placeholders"}.`;
  if (/[{}]/.test(value.replace(/\{([a-z_]+)\}/g, ""))) return "Curly brackets can only be used for the placeholders listed.";
  const missing = (REQUIRED[key] ?? []).filter((name) => !used.includes(name));
  if (missing.length) return `Keep ${missing.map(brace).join(", ")} in this message.`;
  return null;
}

function statusIssue(text: string): string | null {
  const value = text.trim();
  if (!value) return "This label can't be empty.";
  if (value.length > MAX_STATUS) return `Keep this under ${MAX_STATUS} characters.`;
  if (/[{}]/.test(value)) return "Curly brackets are not allowed here.";
  return null;
}

function trimmed(copy: MenuCopy): MenuCopy {
  const language = (value: MenuCopy[MenuLanguage]) => ({ ...Object.fromEntries(MENU_TEXT_KEYS.map((key) => [key, value[key].trim()])), statuses: Object.fromEntries(MENU_STATUS_KEYS.map((key) => [key, value.statuses[key].trim()])) }) as MenuCopy[MenuLanguage];
  return { EN: language(copy.EN), MS: language(copy.MS) };
}

export default function BerryMenuEditor() {
  const queryClient = useQueryClient();
  const menu = useQuery({ queryKey: ["whatsapp-menu-copy"], queryFn: getMenuCopy });
  const [edits, setEdits] = useState<MenuCopy | null>(null);
  const [language, setLanguage] = useState<MenuLanguage>("EN");
  const [confirming, setConfirming] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const values = edits ?? menu.data?.current ?? null;

  const errors = useMemo(() => {
    const found: Record<string, string> = {};
    if (!values || !menu.data) return found;
    for (const lang of ["EN", "MS"] as MenuLanguage[]) {
      for (const key of MENU_TEXT_KEYS) { const issue = menuTextIssue(key, values[lang][key], menu.data.placeholders[key] ?? []); if (issue) found[`${lang}.${key}`] = issue; }
      for (const key of MENU_STATUS_KEYS) { const issue = statusIssue(values[lang].statuses[key]); if (issue) found[`${lang}.statuses.${key}`] = issue; }
    }
    return found;
  }, [values, menu.data]);

  const save = useMutation({
    mutationFn: () => saveMenuCopy(menu.data!.version, trimmed(values!)),
    onSuccess: (data) => {
      queryClient.setQueryData(["whatsapp-menu-copy"], data);
      setEdits(null);
      setConfirming(false);
      setServerErrors([]);
      notifications.show({ title: "Berry's menu text saved", message: "Berry uses it for the next WhatsApp reply.", color: "green" });
    },
    onError: (error) => {
      setConfirming(false);
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
      if (status === 409) { setConflict(true); return; }
      if (status === 422 && Array.isArray(detail)) { setServerErrors(detail.map((item: { msg?: string }) => String(item.msg ?? "").replace(/^Value error, /, "")).filter(Boolean)); return; }
      notifications.show({ title: "Unable to save Berry's menu text", message: getApiError(error).message, color: "red" });
    },
  });

  if (menu.isLoading) return <Card withBorder><Text size="sm" c="dimmed">Loading Berry's menu text…</Text></Card>;
  if (menu.isError || !menu.data || !values) return <Card withBorder><Text size="sm" c="red">Could not load Berry's menu text. Refresh and try again.</Text></Card>;

  const { defaults, current, placeholders } = menu.data;
  const dirty = JSON.stringify(trimmed(values)) !== JSON.stringify(current);
  const errorCount = (lang: MenuLanguage) => Object.keys(errors).filter((key) => key.startsWith(`${lang}.`)).length;
  const setText = (key: MenuTextKey, text: string) => setEdits((prev) => { const base = prev ?? current; return { ...base, [language]: { ...base[language], [key]: text } }; });
  const setStatus = (key: MenuStatusKey, text: string) => setEdits((prev) => { const base = prev ?? current; return { ...base, [language]: { ...base[language], statuses: { ...base[language].statuses, [key]: text } } }; });
  const reload = async () => { setConflict(false); setServerErrors([]); setEdits(null); await menu.refetch(); };
  const resetLink = (changed: boolean, onReset: () => void) => changed ? <Button size="compact-xs" variant="subtle" onClick={onReset}>Reset to default</Button> : null;

  return <Card withBorder>
    <Stack gap="md">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Group gap="xs" align="flex-start"><IconMessageChatbot size={21} color="var(--ui-muted)" /><Stack gap={0}><Text fw={600}>Berry's menu text</Text><Text size="sm" c="dimmed">The fixed replies Berry sends on WhatsApp. Saved text is used for the next reply.</Text></Stack></Group>
        <SegmentedControl value={language} onChange={(value) => setLanguage(value as MenuLanguage)} data={(["EN", "MS"] as MenuLanguage[]).map((lang) => ({ value: lang, label: `${lang === "EN" ? "English" : "Bahasa Melayu"}${errorCount(lang) ? ` (${errorCount(lang)})` : ""}` }))} />
      </Group>
      {conflict ? <Alert color="orange" icon={<IconAlertTriangle size={16} />} title="Changed in another session"><Group justify="space-between" wrap="wrap"><Text size="sm">Someone saved Berry's menu text after you opened it. Reload to see their version; your unsaved edits will be replaced.</Text><Button size="xs" variant="default" onClick={() => void reload()}>Reload</Button></Group></Alert> : null}
      {serverErrors.length ? <Alert color="red" icon={<IconAlertTriangle size={16} />} title="Not saved"><Stack gap={2}>{serverErrors.map((message) => <Text key={message} size="sm">{message}</Text>)}</Stack></Alert> : null}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Stack gap="lg">
          {SECTIONS.map((section) => <Stack key={section.title} gap="sm">
            <Title order={5}>{section.title}</Title>
            {section.fields.map(({ key, label, description }) => {
              const changed = values[language][key].trim() !== defaults[language][key];
              const allowed = placeholders[key] ?? [];
              return <Stack key={`${language}-${key}`} gap={4}><Textarea
                label={<Group gap={6} component="span">{label}{changed ? <Badge size="xs" variant="light">Changed</Badge> : null}</Group>}
                description={<>{description}{allowed.length ? <> Can use {allowed.map((name) => <Code key={name} mr={4}>{brace(name)}</Code>)}</> : null}</>}
                value={values[language][key]}
                onChange={(event) => setText(key, event.currentTarget.value)}
                error={errors[`${language}.${key}`]}
                autosize
                minRows={key === "menu" ? 9 : 2}
                maxRows={14}
              />{changed ? <Group justify="flex-end">{resetLink(changed, () => setText(key, defaults[language][key]))}</Group> : null}</Stack>;
            })}
          </Stack>)}
          <Stack gap="sm">
            <Title order={5}>Order status labels</Title>
            <Text size="sm" c="dimmed">Fill {brace("status")} in the order status reply.</Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              {MENU_STATUS_KEYS.map((key) => {
                const changed = values[language].statuses[key].trim() !== defaults[language].statuses[key];
                return <TextInput key={`${language}-${key}`} label={STATUS_LABELS[key]} value={values[language].statuses[key]} onChange={(event) => setStatus(key, event.currentTarget.value)} error={errors[`${language}.statuses.${key}`]} rightSectionWidth={changed ? 110 : undefined} rightSection={resetLink(changed, () => setStatus(key, defaults[language].statuses[key]))} />;
              })}
            </SimpleGrid>
          </Stack>
        </Stack>
        <Stack gap="xs" style={{ alignSelf: "start", position: "sticky", top: 16 }}>
          <Text size="sm" fw={600}>Main menu preview</Text>
          <Card radius="lg" p="sm" bg="var(--mantine-color-green-light)" maw={360} aria-label="Main menu preview"><Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{values[language].menu.trim()}</Text></Card>
          <Text size="xs" c="dimmed">How the greeting looks to a customer chatting in {language === "EN" ? "English" : "Bahasa Melayu"}.</Text>
        </Stack>
      </SimpleGrid>
      <Group justify="space-between" wrap="wrap">
        <Text size="xs" c="dimmed">{menu.data.updated_at && menu.data.version > 1 ? `Last saved ${new Date(menu.data.updated_at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}` : "Using the default text"}</Text>
        <Group>
          <Button variant="default" disabled={!dirty || save.isPending} onClick={() => { setEdits(null); setServerErrors([]); }}>Discard changes</Button>
          <Button disabled={!dirty || Object.keys(errors).length > 0} loading={save.isPending} onClick={() => setConfirming(true)}>Save menu text</Button>
        </Group>
      </Group>
    </Stack>
    <Modal opened={confirming} onClose={() => !save.isPending && setConfirming(false)} title="Save Berry's menu text?" centered>
      <Stack>
        <Text size="sm">Berry sends this text automatically from the next WhatsApp reply. It is not checked again before it goes to customers, so read both languages first.</Text>
        <Group justify="flex-end"><Button variant="default" onClick={() => setConfirming(false)} disabled={save.isPending}>Cancel</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button></Group>
      </Stack>
    </Modal>
  </Card>;
}
