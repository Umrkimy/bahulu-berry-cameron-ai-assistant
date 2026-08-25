import { Stack } from "@mantine/core";

import {
  IconHome,
  IconPackage,
  IconShoppingCart,
  IconUsers,
  IconBrandWhatsapp,
  IconSettings,
  IconBuildingWarehouse,
  IconMessageChatbot,
} from "@tabler/icons-react";

import NavSection from "./NavSection";

export default function AppSidebar() {
  return (
    <Stack p="md" gap="md">
      {/* OVERVIEW */}
      <NavSection
        title="OVERVIEW"
        items={[
          {
            label: "Dashboard",
            link: "/dashboard",
            icon: <IconHome size={18} />,
          },
        ]}
      />

      {/* COMMERCE */}
      <NavSection
        title="COMMERCE"
        items={[
          {
            label: "Products",
            link: "/products",
            icon: <IconPackage size={18} />,
          },

          {
            label: "Inventory",
            link: "/inventory",
            icon: <IconBuildingWarehouse size={18} />,
          },

          {
            label: "Orders",
            link: "/orders",
            icon: <IconShoppingCart size={18} />,
          },

          {
            label: "Customers",
            link: "/customers",
            icon: <IconUsers size={18} />,
          },
        ]}
      />

      {/* AI ASSISTANT */}
      <NavSection
        title="AI ASSISTANT"
        items={[
          {
            label: "ChatGPT",
            link: "/ai-assistant",
            icon: <IconMessageChatbot size={18} />,
          },

          {
            label: "WhatsApp",
            link: "/whatsapp",
            icon: <IconBrandWhatsapp size={18} />,
          },
        ]}
      />

      {/* SYSTEM */}
      <NavSection
        title="SYSTEM"
        items={[
          {
            label: "Settings",
            link: "/settings",
            icon: <IconSettings size={18} />,
          },
        ]}
      />
    </Stack>
  );
}
