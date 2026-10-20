import { ActionIcon, Menu } from "@mantine/core";
import { IconDots } from "@tabler/icons-react";
import type { ReactNode } from "react";

export interface RowAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  color?: string;
  disabled?: boolean;
  hidden?: boolean;
}

export default function RowActions({ label, actions }: { label: string; actions: RowAction[] }) {
  const visible = actions.filter((action) => !action.hidden);
  if (!visible.length) return null;
  return (
    <Menu position="bottom-end" withinPortal shadow="md" width={200}>
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" aria-label={`Actions for ${label}`} onClick={(event) => event.stopPropagation()}>
          <IconDots size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
        {visible.map((action) => (
          <Menu.Item key={action.label} leftSection={action.icon} color={action.color} disabled={action.disabled} onClick={action.onClick}>
            {action.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
