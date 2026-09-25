import { Button, FileButton, Group, Image, Stack, Text } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import api from "../../api/axios";
import { getApiError } from "../../api/errors";
import type { ProductImage } from "../../types/product";

export default function ProductGallery({ productId }: { productId: number }) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["product-images", productId], queryFn: async () => (await api.get<ProductImage[]>(`/products/${productId}/images`)).data });
  const images = query.data ?? [];
  const mutation = useMutation({
    mutationFn: async ({ action, file, imageId, ids }: { action: "upload" | "remove" | "order" | "feature"; file?: File; imageId?: number; ids?: number[] }) => {
      const path = `/products/${productId}`;
      if (action === "upload" && file) {
        const data = new FormData(); data.append("file", file);
        await api.request({ url: `${path}/images${imageId ? `/${imageId}` : ""}`, method: imageId ? "put" : "post", data, headers: { "Content-Type": "multipart/form-data" } });
      } else if (action === "remove") await api.delete(`${path}/images/${imageId}`);
      else if (action === "order") await api.put(`${path}/images`, { image_ids: ids });
      else if (action === "feature") await api.put(`${path}/feature`);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["product-images", productId] });
      void client.invalidateQueries({ queryKey: ["products"] });
      notifications.show({ color: "green", message: "Saved. Reload the storefront to see changes." });
    },
    onError: error => notifications.show({ color: "red", message: getApiError(error).message }),
  });
  const move = (index: number, offset: number) => {
    const ids = images.map(image => image.id);
    [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
    mutation.mutate({ action: "order", ids });
  };
  const origin = String(api.defaults.baseURL ?? "/api").replace(/\/api\/?$/, "");
  return <Stack gap="sm">
    <Text fw={600}>Product photos</Text>
    <Text size="sm" c="dimmed">Photos save separately from the form. First photo is the cover. Up to six JPEG, PNG or WebP photos, 5 MB and 20 megapixels each. Upload only approved images (fictional images for demo).</Text>
    {query.isError ? <Button type="button" onClick={() => void query.refetch()}>Retry loading photos</Button> : null}
    {query.isPending ? <Text>Loading photos…</Text> : null}
    {images.map((image, index) => <Group key={image.id} wrap="wrap">
      <Image src={`${origin}${image.image_path}?v=${query.dataUpdatedAt}`} alt={`Product photo ${index + 1}`} w={80} h={90} fit="contain" />
      <Stack gap={4}><Text size="sm">{index === 0 ? "Cover photo" : `Photo ${index + 1}`}</Text><Group gap={5}>
        <Button type="button" size="xs" variant="default" disabled={mutation.isPending || index === 0} onClick={() => move(index, -1)} aria-label={`Move photo ${index + 1} earlier`}>Earlier</Button>
        <Button type="button" size="xs" variant="default" disabled={mutation.isPending || index === images.length - 1} onClick={() => move(index, 1)} aria-label={`Move photo ${index + 1} later`}>Later</Button>
        <FileButton onChange={file => file && mutation.mutate({ action: "upload", file, imageId: image.id })} accept="image/jpeg,image/png,image/webp">{props => <Button {...props} type="button" size="xs" disabled={mutation.isPending}>Replace</Button>}</FileButton>
        <Button type="button" size="xs" color="red" variant="light" disabled={mutation.isPending} onClick={() => { if (window.confirm("Remove this photo from the product gallery?")) mutation.mutate({ action: "remove", imageId: image.id }); }}>Remove</Button>
      </Group></Stack>
    </Group>)}
    <Group><FileButton onChange={file => file && mutation.mutate({ action: "upload", file })} accept="image/jpeg,image/png,image/webp">{props => <Button {...props} type="button" disabled={mutation.isPending || !query.isSuccess || images.length >= 6}>Upload photo</Button>}</FileButton>
    <Button type="button" variant="light" disabled={mutation.isPending || !images.length} onClick={() => mutation.mutate({ action: "feature" })}>Feature on homepage</Button></Group>
    <Text size="xs" c="dimmed">Save and publish the product before featuring it. This replaces the current homepage selection.</Text>
  </Stack>;
}
