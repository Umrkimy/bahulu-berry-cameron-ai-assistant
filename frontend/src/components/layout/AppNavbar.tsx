import {
  ActionIcon,
  Avatar,
  Group,
  Menu,
  Text,
} from "@mantine/core";

import {
  IconLogout,
  IconSearch,
} from "@tabler/icons-react";
import useAuth from "../../auth/useAuth";
import BrandName from "../brand/BrandName";

export default function AppNavbar() {
  const { logout, admin } = useAuth();

  return (
    <Group h="100%" px="lg" justify="space-between">
      <BrandName showDescription={false} />
      <Group gap="sm">
        <ActionIcon variant="light" color="bahulu" size="lg" aria-label="Open quick search" onClick={() => window.dispatchEvent(new Event("open-command-palette"))}>
          <IconSearch size={19} />
        </ActionIcon>
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <Group
              gap="xs"
              style={{
                cursor: "pointer",
              }}
            >
              <Avatar radius="xl" color="bahulu">
                {admin?.username?.charAt(0).toUpperCase()}
              </Avatar>

              <Text size="sm" fw={500}>
                {admin?.username}
              </Text>
              <Text size="xs" c="dimmed">{admin?.role === "OWNER" ? "Owner" : "Staff"}</Text>
            </Group>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item
              color="red"
              leftSection={<IconLogout size={16} />}
              onClick={logout}
            >
              Logout
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}
