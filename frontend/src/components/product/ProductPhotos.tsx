import { ActionIcon, Alert, Badge, Button, Card, FileButton, Group, Image, SimpleGrid, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconArrowLeft, IconArrowRight, IconPhoto, IconStar, IconTrash, IconUpload } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import api from "../../api/axios";
import { getApiError } from "../../api/errors";
import type { ProductImage } from "../../types/product";

type GalleryAction =
  | { type: "upload"; files: File[] }
  | { type: "replace"; imageId: number; file: File }
  | { type: "order"; imageIds: number[] }
  | { type: "remove"; imageId: number };

export default function ProductPhotos({ productId, canEdit }: { productId: number; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState("");
  const query = useQuery({
    queryKey: ["product-images", productId],
    queryFn: async () => (await api.get<ProductImage[]>(`/products/${productId}/images`)).data,
  });
  const images = query.data ?? [];
  const mutation = useMutation({
    mutationFn: async (action: GalleryAction) => {
      const base = `/products/${productId}`;
      if (action.type === "upload") {
        const remaining = Math.max(0, 6 - images.length);
        const files = action.files.slice(0, remaining);
        for (let index = 0; index < files.length; index += 1) {
          setProgress(`Uploading photo ${index + 1} of ${files.length}…`);
          const data = new FormData();
          data.append("file", files[index]);
          await api.post(`${base}/images`, data, { headers: { "Content-Type": "multipart/form-data" } });
        }
      } else if (action.type === "replace") {
        const data = new FormData();
        data.append("file", action.file);
        await api.put(`${base}/images/${action.imageId}`, data, { headers: { "Content-Type": "multipart/form-data" } });
      } else if (action.type === "order") {
        await api.put(`${base}/images`, { image_ids: action.imageIds });
      } else {
        await api.delete(`${base}/images/${action.imageId}`);
      }
    },
    onSuccess: async () => {
      setProgress("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["product-images", productId] }),
        queryClient.invalidateQueries({ queryKey: ["products", productId] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]);
      notifications.show({ color: "green", title: "Photos updated", message: "The product gallery was saved." });
    },
    onError: (error) => {
      setProgress("");
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["product-images", productId] }),
        queryClient.invalidateQueries({ queryKey: ["products", productId] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]);
      notifications.show({ color: "red", title: "Photo update failed", message: getApiError(error).message });
    },
  });

  const reorder = (from: number, to: number) => {
    const ids = images.map((image) => image.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    mutation.mutate({ type: "order", imageIds: ids });
  };
  const makeCover = (imageId: number) => {
    mutation.mutate({ type: "order", imageIds: [imageId, ...images.filter((image) => image.id !== imageId).map((image) => image.id)] });
  };
  const confirmRemove = (image: ProductImage, index: number) => modals.openConfirmModal({
    title: `Remove photo ${index + 1}?`,
    children: <Text size="sm">This removes the photo from the product. A published product must keep at least one photo.</Text>,
    labels: { confirm: "Remove photo", cancel: "Keep photo" },
    confirmProps: { color: "red" },
    onConfirm: () => mutation.mutate({ type: "remove", imageId: image.id }),
  });
  const origin = String(api.defaults.baseURL ?? "/api").replace(/\/api\/?$/, "");

  return <Stack gap="lg">
    <div>
      <Text fw={700} fz="lg">Product photos</Text>
      <Text size="sm" c="dimmed">Upload up to six approved JPEG, PNG, or WebP photos. The cover appears first on product cards.</Text>
    </div>
    {query.isError ? <Alert color="red" title="Photos could not be loaded"><Button size="compact-sm" variant="light" onClick={() => void query.refetch()}>Try again</Button></Alert> : null}
    {query.isLoading ? <Text c="dimmed" role="status">Loading product photos…</Text> : null}
    {!query.isLoading && !query.isError && images.length === 0 ? <Alert icon={<IconPhoto size={18} />} title="No photos yet">Upload at least one approved photo before publishing this product.</Alert> : null}
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
      {images.map((image, index) => <Card key={image.id} withBorder radius="lg" p="sm">
        <Card.Section>
          <Image src={`${origin}${image.image_path}?v=${query.dataUpdatedAt}`} alt={`${index === 0 ? "Cover" : `Gallery ${index + 1}`} photo for this product`} h={220} fit="contain" bg="#fffaf1" />
        </Card.Section>
        <Stack gap="xs" mt="sm">
          <Group justify="space-between"><Text fw={700}>{index === 0 ? "Cover photo" : `Photo ${index + 1}`}</Text>{index === 0 ? <Badge color="bahulu" leftSection={<IconStar size={12} />}>Cover</Badge> : null}</Group>
          {canEdit ? <Group gap="xs" wrap="wrap">
            {index > 0 ? <Button size="compact-xs" variant="light" leftSection={<IconStar size={14} />} disabled={mutation.isPending} onClick={() => makeCover(image.id)}>Make cover</Button> : null}
            <ActionIcon variant="default" disabled={mutation.isPending || index === 0} onClick={() => reorder(index, index - 1)} aria-label={`Move photo ${index + 1} earlier`}><IconArrowLeft size={16} /></ActionIcon>
            <ActionIcon variant="default" disabled={mutation.isPending || index === images.length - 1} onClick={() => reorder(index, index + 1)} aria-label={`Move photo ${index + 1} later`}><IconArrowRight size={16} /></ActionIcon>
            <FileButton accept="image/jpeg,image/png,image/webp" onChange={(file) => file && mutation.mutate({ type: "replace", imageId: image.id, file })}>{(props) => <Button {...props} size="compact-xs" variant="default" disabled={mutation.isPending}>Replace</Button>}</FileButton>
            <ActionIcon color="red" variant="light" disabled={mutation.isPending} onClick={() => confirmRemove(image, index)} aria-label={`Remove photo ${index + 1}`}><IconTrash size={16} /></ActionIcon>
          </Group> : <Text size="xs" c="dimmed">Owner access is required to change photos.</Text>}
        </Stack>
      </Card>)}
    </SimpleGrid>
    {canEdit ? <Group>
      <FileButton multiple accept="image/jpeg,image/png,image/webp" onChange={(files) => files.length && mutation.mutate({ type: "upload", files })}>{(props) => <Button {...props} leftSection={<IconUpload size={16} />} loading={mutation.isPending} disabled={!query.isSuccess || images.length >= 6}>Upload photos</Button>}</FileButton>
      <Text size="sm" c="dimmed">{progress || `${images.length} of 6 photos`}</Text>
    </Group> : null}
  </Stack>;
}
