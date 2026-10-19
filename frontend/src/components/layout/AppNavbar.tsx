import { Avatar, Burger, Group, Kbd, Menu, Text, UnstyledButton } from "@mantine/core";
import { IconChevronDown, IconLogout, IconSearch } from "@tabler/icons-react";

import useAuth from "../../auth/useAuth";
import Logo from "../brand/Logo";
import NotificationBell from "./NotificationBell";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

export default function AppNavbar({ mobileOpened, onToggleNavigation }: { mobileOpened: boolean; onToggleNavigation: () => void }) {
  const { logout, admin } = useAuth();
  const roleLabel = admin?.role === "OWNER" ? "Owner" : "Staff";

  return (
    <Group h="100%" px={{ base: "sm", sm: "xl" }} justify="space-between" wrap="nowrap" gap="sm">
      <Group gap="xs" wrap="nowrap" hiddenFrom="sm">
        <Burger opened={mobileOpened} onClick={onToggleNavigation} size="sm" aria-label="Toggle navigation" />
        <Logo size={28} />
      </Group>
      <div className="header-spacer" />
      <Group className="header-actions" gap={6} wrap="nowrap">
        <UnstyledButton className="header-search" aria-label="Open quick search" onClick={() => window.dispatchEvent(new Event("open-command-palette"))}>
          <IconSearch size={16} stroke={1.75} aria-hidden="true" />
          <span className="header-search-label">Search</span>
          <Kbd className="header-search-kbd" size="xs">{isMac ? "⌘ K" : "Ctrl K"}</Kbd>
        </UnstyledButton>
        <NotificationBell />
        <Menu width={220} position="bottom-end">
          <Menu.Target>
            <UnstyledButton className="account-trigger" aria-label="Open account menu">
              <Avatar size={28} radius="xl" color="gray" variant="filled">
                {admin?.username?.charAt(0).toUpperCase()}
              </Avatar>
              <span className="account-name">{admin?.username}</span>
              <IconChevronDown className="account-chevron" size={14} aria-hidden="true" />
            </UnstyledButton>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>
              <Text size="sm" fw={600} c="var(--mantine-color-text)" truncate>{admin?.username}</Text>
              <Text size="xs" c="dimmed">{roleLabel}</Text>
            </Menu.Label>
            <Menu.Divider />
            <Menu.Item leftSection={<IconLogout size={16} />} onClick={logout}>
              Log out
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}
