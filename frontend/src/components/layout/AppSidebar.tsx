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
  IconTruck,
  IconDiscount2,
  IconActivity,
  IconUsersGroup,
} from "@tabler/icons-react";

import NavSection from "./NavSection";
import useAuth from "../../auth/useAuth";

export default function AppSidebar() {
  const { admin } = useAuth();
  return (
    <Stack p="md" gap="sm">
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

      <NavSection
        title="COMMERCE"
        items={[
          {
            label: "Customers",
            link: "/customers",
            icon: <IconUsers size={18} />,
          },

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
            label: "Deliveries",
            link: "/deliveries",
            icon: <IconTruck size={18} />,
          },

          {
            label: "Discounts",
            link: "/discounts",
            icon: <IconDiscount2 size={18} />,
          },
        ]}
      />

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

      <NavSection
        title="OPERATIONS"
        items={[
          {
            label: "Activity",
            link: "/activity",
            icon: <IconActivity size={18} />,
          },
        ]}
      />

      <NavSection
        title="SYSTEM"
        items={[
          ...(admin?.role === "OWNER" ? [{ label: "Team & Roles", link: "/team", icon: <IconUsersGroup size={18} /> }] : []),
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
