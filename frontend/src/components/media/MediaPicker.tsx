import { Alert, Badge, Button, Group, Image, Modal, Pagination, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getMedia, mediaUrl } from "../../api/media";
import type { MediaAsset } from "../../types/media";

export default function MediaPicker({ opened, onClose, onSelect, excluded = [] }: { opened: boolean; onClose: () => void; onSelect: (asset: MediaAsset) => void; excluded?: number[] }) {
  const [search, setSearch] = useState("");
  const [debounced] = useDebouncedValue(search, 250);
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ["media", "picker", debounced, page], queryFn: () => getMedia({ search: debounced, status: "active", page, page_size: 12 }), enabled: opened });
  const items = query.data?.items ?? [];
  return <Modal opened={opened} onClose={onClose} title="Choose from Media Library" size="xl" centered>
    <Stack>
      <TextInput label="Search photos" placeholder="Search by title or note" value={search} onChange={(event) => { setSearch(event.currentTarget.value); setPage(1); }} />
      {query.isLoading ? <Text role="status" c="dimmed">Loading media…</Text> : null}
      {query.isError ? <Alert color="red" title="Media could not be loaded"><Button size="compact-sm" variant="light" onClick={() => void query.refetch()}>Try again</Button></Alert> : null}
      {query.isSuccess && items.length === 0 ? <Alert title="No matching photos">Upload photos in Media Library, then return here to select them.</Alert> : null}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
        {items.map((asset) => { const used = excluded.includes(asset.id); return <Button key={asset.id} variant="default" h="auto" p="xs" disabled={used} onClick={() => onSelect(asset)} aria-label={`${used ? "Already attached: " : "Choose "}${asset.title}`}>
          <Stack gap="xs" w="100%"><Image src={mediaUrl(asset.content_path)} alt="" h={130} fit="contain" bg="#fffaf1" /><Group justify="space-between" wrap="nowrap"><Text fw={600} size="sm" truncate>{asset.title}</Text>{used ? <Badge size="xs">Used</Badge> : null}</Group></Stack>
        </Button>; })}
      </SimpleGrid>
      {(query.data?.pages ?? 1) > 1 ? <Pagination value={page} onChange={setPage} total={query.data?.pages ?? 1} /> : null}
    </Stack>
  </Modal>;
}
