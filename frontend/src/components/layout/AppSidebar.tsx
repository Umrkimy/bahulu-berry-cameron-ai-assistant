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
  IconCash,
  IconChartBar,
  IconBell,
  IconTruckLoading,
  IconChecklist,
  IconClipboardCheck,
  IconMessageDots,
} from "@tabler/icons-react";

import NavSection from "./NavSection";
import useAuth from "../../auth/useAuth";

export default function AppSidebar({ onNavigate }: { onNavigate: () => void }) {
  const { admin } = useAuth();
  return (
    <Stack p="md" gap="sm">
      <NavSection
        title="OVERVIEW"
        onNavigate={onNavigate}
        items={[
          {
            label: "Dashboard",
            link: "/dashboard",
            icon: <IconHome size={18} />,
          },
        ]}
      />

      <NavSection
        title="DAILY WORK"
        onNavigate={onNavigate}
        items={[
          {
            label: "Orders",
            link: "/orders",
            icon: <IconShoppingCart size={18} />,
          },

          {
            label: "Fulfilment",
            link: "/fulfillment",
            icon: <IconClipboardCheck size={18} />,
          },
          {
            label: "Deliveries",
            link: "/deliveries",
            icon: <IconTruck size={18} />,
          },
          {
            label: "Inventory",
            link: "/inventory",
            icon: <IconBuildingWarehouse size={18} />,
          },
          { label: "Tasks", link: "/tasks", icon: <IconChecklist size={18} /> },
          { label: "Updates", link: "/updates", icon: <IconBell size={18} /> },
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
        title="CATALOGUE"
        onNavigate={onNavigate}
        items={[
          {
            label: "Products",
            link: "/products",
            icon: <IconPackage size={18} />,
          },
        ]}
      />

      <NavSection
        title="MORE & ADMIN"
        onNavigate={onNavigate}
        collapsible
        initiallyCollapsed
        items={[
          { label: "Customers", link: "/customers", icon: <IconUsers size={18} /> },
          { label: "Discounts", link: "/discounts", icon: <IconDiscount2 size={18} /> },
          ...(admin?.role === "OWNER" ? [{ label: "Suppliers", link: "/suppliers", icon: <IconTruckLoading size={18} /> }] : []),
          { label: "Refund Requests", link: "/refund-requests", icon: <IconCash size={18} /> },
          ...(admin?.role === "OWNER" ? [{ label: "Activity", link: "/activity", icon: <IconActivity size={18} /> }] : []),
          ...(admin?.role === "OWNER" ? [{ label: "Reports", link: "/reports", icon: <IconChartBar size={18} /> }] : []),
          ...(admin?.role === "OWNER" ? [{ label: "AI Usage", link: "/ai-usage", icon: <IconChartBar size={18} /> }] : []),
          ...(admin?.role === "OWNER" ? [{ label: "Team & Roles", link: "/team", icon: <IconUsersGroup size={18} /> }] : []),
          ...(admin?.role === "OWNER" ? [{ label: "Settings", link: "/settings", icon: <IconSettings size={18} /> }] : []),
          ...(admin?.role === "OWNER" ? [{ label: "Enquiries", link: "/enquiries", icon: <IconMessageDots size={18} /> }] : []),
        ]}
      />
    </Stack>
  );
}
