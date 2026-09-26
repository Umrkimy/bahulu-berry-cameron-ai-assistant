import { Alert, Anchor, Badge, Button, Card, Divider, Group, Loader, NumberInput, Stack, Switch, Tabs, Text, TextInput, Textarea, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowLeft, IconCheck, IconExternalLink, IconLanguage, IconPhoto, IconSettings, IconStar } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import api from "../../api/axios";
import { getApiError } from "../../api/errors";
import useAuth from "../../auth/useAuth";
import ProductPhotos from "../../components/product/ProductPhotos";
import { useCreateProduct, useProduct, useUpdateProduct } from "../../hooks/useProducts";
import { useDiscounts } from "../../hooks/useDiscounts";
import type { Product } from "../../types/product";

type Section = "details" | "storefront" | "photos";

export default function ProductWorkspace() {
  const { productId: rawProductId } = useParams();
  const creating = rawProductId === undefined || rawProductId === "new";
  const productId = creating ? null : Number(rawProductId);
  const invalidId = !creating && (!Number.isSafeInteger(productId) || (productId ?? 0) < 1);
  const productQuery = useProduct(invalidId ? null : productId);
  const { admin } = useAuth();
  const canEdit = admin?.role === "OWNER";
  const location = useLocation();
  const navigate = useNavigate();
  const [dirty, setDirty] = useState(false);

  const section: Section = location.pathname.endsWith("/photos")
    ? "photos"
    : location.pathname.endsWith("/storefront")
      ? "storefront"
      : "details";

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const protectInternalNavigation = (event: MouseEvent) => {
      if (!dirty || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || target.target === "_blank" || target.hasAttribute("download")) return;
      const destination = new URL(target.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (!window.confirm("Discard unsaved product changes?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", protectInternalNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", protectInternalNavigation, true);
    };
  }, [dirty]);

  const openSection = (next: string | null) => {
    if (!next || next === section) return;
    if (dirty && !window.confirm("Discard unsaved product changes?")) return;
    setDirty(false);
    navigate(next === "details" ? `/products/${productId}` : `/products/${productId}/${next}`);
  };

  if (invalidId) return <Alert color="red" title="Invalid product">Return to the product list and choose a valid product.</Alert>;
  if (!creating && productQuery.isLoading) return <Group justify="center" py="xl"><Loader /><Text>Loading product workspace…</Text></Group>;
  if (!creating && productQuery.isError) return <Alert color="red" title="Product could not be loaded"><Button component={Link} to="/products" variant="light" mt="sm">Back to products</Button></Alert>;
  if (!creating && !productQuery.data) return null;

  const product = productQuery.data ?? null;
  return <Stack gap="lg">
    <Group justify="space-between" align="flex-start" wrap="wrap">
      <div>
        <Anchor component={Link} to="/products" size="sm"><Group gap={5}><IconArrowLeft size={14} />Back to products</Group></Anchor>
        <Title order={1} mt="xs">{creating ? "Add product" : product?.name}</Title>
        <Text c="dimmed">{creating ? "Create the product once, then add photos and publish it." : "Manage details, storefront content, and photos in one workspace."}</Text>
      </div>
      {!creating && product ? <Group><Badge color={product.is_active ? "green" : "gray"}>{product.is_active ? "Active for operations" : "Inactive"}</Badge><Badge color={product.storefront_published ? "bahulu" : "gray"}>{product.storefront_published ? "Published online" : "Storefront draft"}</Badge></Group> : null}
    </Group>

    {!canEdit ? <Alert color="blue" title="Read-only access">Only an Owner can change product details, publication, or photos.</Alert> : null}

    {creating ? <ProductDetailsForm product={null} canEdit={canEdit} onDirtyChange={setDirty} /> : <>
      <Tabs value={section} onChange={openSection} keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="details" leftSection={<IconSettings size={16} />}>Details</Tabs.Tab>
          <Tabs.Tab value="storefront" leftSection={<IconLanguage size={16} />}>Storefront</Tabs.Tab>
          <Tabs.Tab value="photos" leftSection={<IconPhoto size={16} />}>Photos</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      <Card withBorder radius="lg" p={{ base: "md", sm: "xl" }}>
        {section === "details" ? <ProductDetailsForm key={`${product!.id}-${product!.updated_at}`} product={product} canEdit={canEdit} onDirtyChange={setDirty} /> : null}
        {section === "storefront" ? <StorefrontForm key={`${product!.id}-${product!.updated_at}`} product={product!} canEdit={canEdit} onDirtyChange={setDirty} /> : null}
        {section === "photos" ? <ProductPhotos productId={product!.id} canEdit={canEdit} /> : null}
      </Card>
    </>}
  </Stack>;
}

function ProductDetailsForm({ product, canEdit, onDirtyChange }: { product: Product | null; canEdit: boolean; onDirtyChange: (dirty: boolean) => void }) {
  const navigate = useNavigate();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const discounts = useDiscounts();
  const activePromotions = useMemo(() => (discounts.data ?? []).filter((discount) => discount.product_id === product?.id && discount.is_active), [discounts.data, product?.id]);
  const form = useForm({
    initialValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      category: product?.category ?? "",
      price: Number(product?.price ?? 0),
      initial_quantity: 0,
      is_active: product?.is_active ?? true,
    },
    validate: {
      name: (value) => value.trim() ? null : "English product name is required.",
      price: (value) => value > 0 ? null : "Price must be greater than RM 0.00.",
      initial_quantity: (value) => value >= 0 ? null : "Opening stock cannot be negative.",
    },
    onValuesChange: () => onDirtyChange(true),
  });
  const pending = create.isPending || update.isPending;
  const submit = form.onSubmit(async (values) => {
    try {
      if (!product) {
        const created = await create.mutateAsync({
          name: values.name.trim(), description: values.description.trim(), category: values.category.trim(),
          price: values.price, initial_quantity: values.initial_quantity, is_active: values.is_active,
        });
        onDirtyChange(false);
        notifications.show({ color: "green", title: "Product created", message: "Add approved photos before publishing it." });
        navigate(`/products/${created.id}/photos`, { replace: true });
      } else {
        await update.mutateAsync({ productId: product.id, data: {
          name: values.name.trim(), description: values.description.trim(), category: values.category.trim(),
          price: values.price, is_active: values.is_active,
        } });
        form.resetDirty();
        onDirtyChange(false);
        notifications.show({ color: "green", title: "Product details saved", message: values.is_active ? "Operational details are current." : "The product is inactive and has been unpublished." });
      }
    } catch (error) {
      notifications.show({ color: "red", title: "Product could not be saved", message: getApiError(error).message });
    }
  });

  return <form onSubmit={submit}><Stack gap="lg">
    <div><Text fw={700} fz="lg">English product details</Text><Text size="sm" c="dimmed">These details are used by operations and as the English storefront content. Enter them only once.</Text></div>
    <TextInput label="Product name — English" withAsterisk disabled={!canEdit || pending} {...form.getInputProps("name")} />
    <Textarea label="Description — English" autosize minRows={4} disabled={!canEdit || pending} {...form.getInputProps("description")} />
    <Group grow align="start"><TextInput label="Category" disabled={!canEdit || pending} {...form.getInputProps("category")} /><NumberInput label="Base price" prefix="RM " min={0.01} decimalScale={2} fixedDecimalScale withAsterisk disabled={!canEdit || pending} {...form.getInputProps("price")} /></Group>
    {!product ? <NumberInput label="Opening stock" min={0} disabled={!canEdit || pending} {...form.getInputProps("initial_quantity")} /> : null}
    <Switch label="Active for operations" description={form.values.is_active ? "Available for operational workflows. Storefront publishing remains separate." : "Inactive products are also removed from the public storefront."} checked={form.values.is_active} disabled={!canEdit || pending} onChange={(event) => form.setFieldValue("is_active", event.currentTarget.checked)} />
    {product ? <><Divider /><Group grow align="stretch"><Card withBorder><Text size="xs" c="dimmed">Current stock</Text><Text fw={800} fz="xl">{product.inventory?.quantity ?? 0}</Text><Button component={Link} to={`/inventory?product_id=${product.id}`} variant="subtle" size="compact-sm">Open Inventory</Button></Card><Card withBorder><Text size="xs" c="dimmed">Active promotions</Text><Text fw={800} fz="xl">{activePromotions.length}</Text><Button component={Link} to={`/discounts?product_id=${product.id}`} variant="subtle" size="compact-sm">Open Promotions</Button></Card></Group></> : null}
    {canEdit ? <Group justify="flex-end"><Button type="submit" loading={pending}>{product ? "Save details" : "Create product"}</Button></Group> : null}
  </Stack></form>;
}

function StorefrontForm({ product, canEdit, onDirtyChange }: { product: Product; canEdit: boolean; onDirtyChange: (dirty: boolean) => void }) {
  const queryClient = useQueryClient();
  const update = useUpdateProduct();
  const featured = useQuery({ queryKey: ["storefront-featured-selection"], queryFn: async () => (await api.get<{ id: number } | null>("/storefront/featured")).data });
  const feature = useMutation({
    mutationFn: () => api.put(`/products/${product.id}/feature`),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["storefront-featured-selection"] }); notifications.show({ color: "green", title: "Homepage updated", message: "This product is now featured." }); },
    onError: (error) => notifications.show({ color: "red", title: "Homepage could not be updated", message: getApiError(error).message }),
  });
  const form = useForm({
    initialValues: { name_ms: product.name_ms ?? "", description_ms: product.description_ms ?? "", storefront_published: product.storefront_published },
    onValuesChange: () => onDirtyChange(true),
  });
  const readiness = [
    { ready: product.is_active, label: "Active for operations" },
    { ready: Boolean(form.values.name_ms.trim()), label: "Bahasa Melayu name added" },
    { ready: (product.images?.length ?? 0) > 0, label: "Approved cover photo uploaded" },
  ];
  const readyToPublish = readiness.every((item) => item.ready);
  const submit = form.onSubmit(async (values) => {
    try {
      await update.mutateAsync({ productId: product.id, data: { name_ms: values.name_ms.trim(), description_ms: values.description_ms.trim(), storefront_published: values.storefront_published } });
      form.resetDirty(); onDirtyChange(false);
      notifications.show({ color: "green", title: "Storefront settings saved", message: values.storefront_published ? "The product is published online." : "The product remains a storefront draft." });
    } catch (error) {
      notifications.show({ color: "red", title: "Storefront settings could not be saved", message: getApiError(error).message });
    }
  });
  const storefrontBase = import.meta.env.VITE_STOREFRONT_BASE_URL ?? "http://localhost:3000";

  return <form onSubmit={submit}><Stack gap="lg">
    <div><Text fw={700} fz="lg">Storefront content</Text><Text size="sm" c="dimmed">English comes from Product Details. Add the approved Bahasa Melayu translation here, then publish when the checklist is complete.</Text></div>
    <Card withBorder bg="#fffaf1"><Stack gap="xs"><Text fw={700}>English preview</Text><Text fw={600}>{product.name}</Text><Text size="sm" c="dimmed">{product.description || "No English description added."}</Text></Stack></Card>
    <TextInput label="Product name — Bahasa Melayu" withAsterisk disabled={!canEdit || update.isPending} {...form.getInputProps("name_ms")} />
    <Textarea label="Description — Bahasa Melayu" autosize minRows={4} disabled={!canEdit || update.isPending} {...form.getInputProps("description_ms")} />
    <Card withBorder><Stack gap="xs"><Text fw={700}>Publishing checklist</Text>{readiness.map((item) => <Group key={item.label} gap="xs"><Badge color={item.ready ? "green" : "gray"} circle>{item.ready ? <IconCheck size={12} /> : "–"}</Badge><Text size="sm" c={item.ready ? undefined : "dimmed"}>{item.label}</Text></Group>)}</Stack></Card>
    <Switch label="Published online" description={form.values.storefront_published ? "Visible in the public catalogue while active and available according to stock." : "Saved as a private storefront draft."} checked={form.values.storefront_published} disabled={!canEdit || update.isPending || (!readyToPublish && !form.values.storefront_published)} onChange={(event) => form.setFieldValue("storefront_published", event.currentTarget.checked)} />
    <Group justify="space-between" wrap="wrap">
      <Group><Button type="button" variant="light" leftSection={<IconStar size={16} />} loading={feature.isPending} disabled={!canEdit || !product.storefront_published || featured.data?.id === product.id} onClick={() => feature.mutate()}>{featured.data?.id === product.id ? "Featured on homepage" : "Feature on homepage"}</Button>{product.storefront_published ? <Button component="a" href={`${storefrontBase}/products/${product.id}`} target="_blank" rel="noreferrer" variant="default" rightSection={<IconExternalLink size={14} />}>Preview product</Button> : null}</Group>
      {canEdit ? <Button type="submit" loading={update.isPending}>Save storefront</Button> : null}
    </Group>
  </Stack></form>;
}
