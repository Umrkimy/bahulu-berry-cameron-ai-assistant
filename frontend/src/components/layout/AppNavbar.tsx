import {
  ActionIcon,
  Avatar,
  Group,
  Menu,
  Text,
  Divider,
  Tooltip,
} from "@mantine/core";

import {
  IconBell,
  IconLogout,
  IconSettings,
  IconUser,
  IconSearch,
} from "@tabler/icons-react";
import BrandName from "../brand/BrandName";

import useAuth from "../../auth/useAuth";

export default function AppNavbar() {
  const { logout, admin } = useAuth();

  return (
    <Group h="100%" px="lg" justify="space-between">
      {/* Left side */}
      <Group gap="sm">
        <BrandName showDescription={false} />
      </Group>

      {/* Right side */}
      <Group gap="sm">
        <Tooltip label="Search">
          <ActionIcon variant="subtle" size="lg">
            <IconSearch size={20} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Notifications">
          <ActionIcon variant="subtle" size="lg">
            <IconBell size={20} />
          </ActionIcon>
        </Tooltip>

        <Menu shadow="md" width={200}>
          <Menu.Target>
            <Group
              gap="xs"
              style={{
                cursor: "pointer",
              }}
            >
              <Avatar radius="xl">
                {admin?.username?.charAt(0).toUpperCase()}
              </Avatar>

              <Text size="sm" fw={500}>
                {admin?.username}
              </Text>
            </Group>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Account</Menu.Label>

            <Menu.Item leftSection={<IconUser size={16} />}>Profile</Menu.Item>

            <Menu.Item leftSection={<IconSettings size={16} />}>
              Settings
            </Menu.Item>

            <Divider />

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
