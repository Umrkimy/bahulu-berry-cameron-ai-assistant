import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ActionIcon, Table } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";
import type { CSSProperties } from "react";
import type { Header } from "@tanstack/react-table";

interface Props<TData extends object> {
  header: Header<TData, unknown>;
}

export default function DraggableTableHeader<TData extends object>({
  header,
}: Props<TData>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: header.column.id,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    position: "relative",
    zIndex: isDragging ? 1 : 0,
    whiteSpace: "nowrap",
  };

  const headerLabel =
    typeof header.column.columnDef.header === "string"
      ? header.column.columnDef.header
      : header.column.id;

  return (
    <Table.Th ref={setNodeRef} style={style}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <ActionIcon
          variant="subtle"
          size="sm"
          color="gray"
          {...attributes}
          {...listeners}
          style={{
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "none",
          }}
          aria-label={`Move ${headerLabel} column`}
        >
          <IconGripVertical size={16} />
        </ActionIcon>

        {header.isPlaceholder ? null : headerLabel}
      </div>
    </Table.Th>
  );
}
