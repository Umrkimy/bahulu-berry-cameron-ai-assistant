import { Alert, Badge, Button, Card, Grid, Group, Loader, SimpleGrid, Stack, Switch, Tabs, Text, TextInput, Textarea, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconDeviceDesktop, IconLanguage, IconRefresh, IconWorld } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getApiError } from "../../api/errors";
import { checkStorefrontGoogleReadiness, getStorefrontHomepage, publishStorefrontHomepage, saveStorefrontHomepageDraft, type BilingualText, type HomepageAdminResponse, type HomepageContent } from "../../api/storefrontHomepage";

const queryKey = ["storefront-homepage-settings"];

export default function HomepageWorkspace() {
  const query = useQuery({ queryKey, queryFn: getStorefrontHomepage });
  if (query.isLoading) return <Group justify="center" py="xl"><Loader /><Text>Loading homepage workspace…</Text></Group>;
  if (query.isError || !query.data) return <Alert color="red" title="Homepage workspace could not be loaded"><Button mt="sm" variant="light" leftSection={<IconRefresh size={16} />} onClick={() => void query.refetch()}>Try again</Button></Alert>;
  return <HomepageEditor key={`${query.data.draft_version}-${query.data.published_version}`} initial={query.data} />;
}

function HomepageEditor({ initial }: { initial: HomepageAdminResponse }) {
  const queryClient = useQueryClient();
  const [locale, setLocale] = useState<"en" | "ms">("en");
  const [dirty, setDirty] = useState(false);
  const editableDraft = (content: HomepageContent): HomepageContent => ({ ...content, google_place_id: content.google_place_id ?? "" });
  const form = useForm<HomepageContent>({ initialValues: editableDraft(initial.draft), onValuesChange: () => setDirty(true) });

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    const protectNavigation = (event: MouseEvent) => {
      if (!dirty || event.defaultPrevented || event.button !== 0) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.target === "_blank" || new URL(anchor.href, location.href).origin !== location.origin) return;
      if (!window.confirm("Discard unsaved homepage changes?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", protectNavigation, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", protectNavigation, true); };
  }, [dirty]);

  const accept = (data: HomepageAdminResponse) => {
    queryClient.setQueryData(queryKey, data);
    const next = editableDraft(data.draft);
    form.setValues(next);
    form.resetDirty(next);
    setDirty(false);
  };
  const save = useMutation({
    mutationFn: () => saveStorefrontHomepageDraft(initial.draft_version, form.getValues()),
    onSuccess: (data) => { accept(data); notifications.show({ color: "green", title: "Homepage draft saved", message: "Your changes are private until you publish them." }); },
    onError: (error) => notifications.show({ color: "red", title: "Draft could not be saved", message: getApiError(error).message }),
  });
  const publish = useMutation({
    mutationFn: () => publishStorefrontHomepage(initial.draft_version),
    onSuccess: (data) => { accept(data); notifications.show({ color: "green", title: "Homepage published", message: "The approved draft is now the public homepage snapshot." }); },
    onError: (error) => notifications.show({ color: "red", title: "Homepage could not be published", message: getApiError(error).message }),
  });
  const checkGoogle = useMutation({
    mutationFn: checkStorefrontGoogleReadiness,
    onSuccess: (data) => notifications.show({ color: data.ready ? "green" : "yellow", title: data.ready ? "Google configuration ready" : "Google configuration not ready", message: data.message }),
    onError: (error) => notifications.show({ color: "red", title: "Readiness check failed", message: getApiError(error).message }),
  });
  const pending = save.isPending || publish.isPending;
  const languageName = locale === "en" ? "English" : "Bahasa Melayu";
  const field = (path: string, label: string, multiline = false) => multiline
    ? <Textarea label={`${label} — ${languageName}`} autosize minRows={3} maxLength={800} disabled={pending} {...form.getInputProps(`${path}.${locale}`)} />
    : <TextInput label={`${label} — ${languageName}`} maxLength={120} disabled={pending} {...form.getInputProps(`${path}.${locale}`)} />;
  const text = (value: BilingualText) => value[locale];
  const google = initial.google_readiness;

  return <Stack gap="lg">
    <Group justify="space-between" align="flex-start" wrap="wrap">
      <div><Title order={1}>Storefront homepage</Title><Text c="dimmed">Edit one fixed bilingual landing page. Saving stays private; publishing updates the public snapshot.</Text></div>
      <Group><Badge variant="light">Draft v{initial.draft_version}</Badge><Badge color="green" variant="light">Published v{initial.published_version}</Badge></Group>
    </Group>
    <Alert color="blue" title="One conversion goal">Hero and closing buttons always open Products. The brand story always opens About. Links and HTML cannot be changed here.</Alert>
    <Tabs value={locale} onChange={(value) => setLocale(value === "ms" ? "ms" : "en")}>
      <Tabs.List><Tabs.Tab value="en" leftSection={<IconLanguage size={16} />}>English</Tabs.Tab><Tabs.Tab value="ms" leftSection={<IconLanguage size={16} />}>Bahasa Melayu</Tabs.Tab></Tabs.List>
    </Tabs>
    <Grid align="start">
      <Grid.Col span={{ base: 12, lg: 7 }}><Stack>
        <EditorCard title="1. USP hero">{field("hero.title_primary", "Title line 1")}{field("hero.title_accent", "Accent line")}{field("hero.title_suffix", "Title line 3")}{field("hero.body", "Introduction", true)}{field("hero.cta_label", "Browse products label")}</EditorCard>
        <EditorCard title="2. Benefits" optional checked={form.values.benefits.enabled} onToggle={(checked) => form.setFieldValue("benefits.enabled", checked)}>{field("benefits.title", "Heading")}{form.values.benefits.items.map((_, index) => <Card key={index} withBorder p="sm"><Stack gap="sm"><Text fw={700}>Benefit {index + 1}</Text>{field(`benefits.items.${index}.title`, "Title")}{field(`benefits.items.${index}.body`, "Description", true)}</Stack></Card>)}</EditorCard>
        <EditorCard title="3. Featured collection">{field("collection.title", "Heading")}{field("collection.view_all_label", "View all label")}</EditorCard>
        <EditorCard title="4. Brand story">{field("story.title", "Heading")}{field("story.body", "Story", true)}{field("story.cta_label", "About label")}</EditorCard>
        <EditorCard title="5. Google reviews" optional checked={form.values.reviews.enabled} onToggle={(checked) => form.setFieldValue("reviews.enabled", checked)} disabled={!google.ready_for_reviews}>{field("reviews.title", "Heading")}</EditorCard>
        <EditorCard title="6. Location and map" optional checked={form.values.location.enabled} onToggle={(checked) => form.setFieldValue("location.enabled", checked)} disabled={!google.ready_for_map}>{field("location.title", "Heading")}{field("location.load_map_label", "Load map label")}{field("location.directions_label", "Directions label")}</EditorCard>
        <EditorCard title="7. Closing call to action">{field("closing.title", "Heading")}{field("closing.body", "Statement", true)}{field("closing.cta_label", "Browse products label")}</EditorCard>
      </Stack></Grid.Col>
      <Grid.Col span={{ base: 12, lg: 5 }}><Stack pos="sticky" top={20}>
        <Card withBorder radius="lg" p="lg"><Group mb="md"><IconDeviceDesktop size={18} /><Text fw={700}>Content preview — {languageName}</Text></Group><Stack gap="lg"><div><Title order={2}>{text(form.values.hero.title_primary)} <Text span c="red" inherit>{text(form.values.hero.title_accent)}</Text> {text(form.values.hero.title_suffix)}</Title><Text size="sm">{text(form.values.hero.body)}</Text><Badge mt="sm" color="red">{text(form.values.hero.cta_label)} → /products</Badge></div>{form.values.benefits.enabled ? <SimpleGrid cols={3}>{form.values.benefits.items.map((item, index) => <Card key={index} p="xs" bg="yellow.0"><Text size="xs" fw={700}>{text(item.title)}</Text></Card>)}</SimpleGrid> : null}<div><Text fw={700}>{text(form.values.collection.title)}</Text></div><div><Text fw={700}>{text(form.values.story.title)}</Text><Text size="xs">{text(form.values.story.body)}</Text></div><Card bg="yellow.1"><Text fw={700}>{text(form.values.closing.title)}</Text><Text size="xs">{text(form.values.closing.body)}</Text></Card></Stack></Card>
        <Card withBorder radius="lg" p="lg"><Group justify="space-between"><div><Text fw={700}>Google readiness</Text><Text size="sm" c="dimmed">Server-controlled and hidden publicly until every approval and key is ready.</Text></div><IconWorld size={22} /></Group><Stack gap="xs" mt="md">{[[google.integrations_enabled,"Server gate"],[google.place_id_configured,"Approved Place ID"],[google.places_key_configured,"Restricted Places key"],[google.maps_embed_key_configured,"Restricted Embed key"]].map(([ready,label]) => <Group key={String(label)} gap="xs"><IconCheck size={15} color={ready ? "green" : "gray"}/><Text size="sm" c={ready ? undefined : "dimmed"}>{label}</Text></Group>)}</Stack><TextInput mt="md" label="Google Place ID" description="An identifier only; no reviews or place content are stored." disabled={pending} {...form.getInputProps("google_place_id")} /><Button mt="md" variant="light" onClick={() => checkGoogle.mutate()} loading={checkGoogle.isPending}>Check readiness</Button></Card>
      </Stack></Grid.Col>
    </Grid>
    <Group justify="flex-end" pos="sticky" bottom={12} p="md" bg="rgba(255,255,255,.94)" style={{ borderRadius: 12, zIndex: 2, boxShadow: "0 8px 30px rgba(0,0,0,.08)" }}><Text size="sm" c="dimmed">{dirty ? "Save the draft before publishing." : "Draft saved and ready for validation."}</Text><Button variant="default" onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty || publish.isPending}>Save draft</Button><Button onClick={() => publish.mutate()} loading={publish.isPending} disabled={dirty || save.isPending}>Publish</Button></Group>
  </Stack>;
}

function EditorCard({ title, children, optional, checked, onToggle, disabled }: { title: string; children: React.ReactNode; optional?: boolean; checked?: boolean; onToggle?: (checked: boolean) => void; disabled?: boolean }) {
  return <Card withBorder radius="lg" p={{ base: "md", sm: "lg" }}><Stack><Group justify="space-between"><Text fw={800}>{title}</Text>{optional ? <Switch label={disabled ? "Not ready" : "Enabled"} checked={checked} disabled={disabled} onChange={(event) => onToggle?.(event.currentTarget.checked)} /> : null}</Group>{optional && !checked ? <Text size="sm" c="dimmed">This section is hidden on the public homepage.</Text> : children}</Stack></Card>;
}
