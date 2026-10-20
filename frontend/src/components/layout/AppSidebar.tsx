import { Burger, Group, ScrollArea, Stack } from "@mantine/core";

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
  IconBrowser,
  IconPhoto,
  IconGauge,
} from "@tabler/icons-react";

import NavSection from "./NavSection";
import Logo from "../brand/Logo";
import useAuth from "../../auth/useAuth";
import { can, isOwner } from "../../auth/permissions";

export default function AppSidebar({ onNavigate }: { onNavigate: () => void }) {
  const { admin } = useAuth();
  return (
    <>
    <Group className="sidebar-brand" justify="space-between" wrap="nowrap">
      <Group gap={10} wrap="nowrap"><Logo size={28} alt="" /><span className="sidebar-brand-name">Bahulu Berry Cameron</span></Group>
      <Burger opened onClick={onNavigate} hiddenFrom="sm" size="sm" aria-label="Close navigation" />
    </Group>
    <ScrollArea className="sidebar-scroll" type="hover" scrollbarSize={6}>
    <Stack p="sm" gap="md">
      <NavSection
        title="Overview"
        onNavigate={onNavigate}
        items={[
          {
            label: "Dashboard",
            link: "/dashboard",
            icon: <IconHome size={17} stroke={1.75} />,
          },
          { label: "Updates", link: "/updates", icon: <IconBell size={17} stroke={1.75} /> },
        ]}
      />

      <NavSection
        title="Daily work"
        onNavigate={onNavigate}
        items={[
          {
            label: "Orders",
            link: "/orders",
            icon: <IconShoppingCart size={17} stroke={1.75} />,
          },

          {
            label: "Fulfilment",
            link: "/fulfillment",
            icon: <IconClipboardCheck size={17} stroke={1.75} />,
          },
          {
            label: "Deliveries",
            link: "/deliveries",
            icon: <IconTruck size={17} stroke={1.75} />,
          },
          {
            label: "Tasks",
            link: "/tasks",
            icon: <IconChecklist size={17} stroke={1.75} />,
          },
          {
            label: "Berry",
            link: "/ai-assistant",
            icon: <IconMessageChatbot size={17} stroke={1.75} />,
          },
          {
            label: "WhatsApp",
            link: "/whatsapp",
            icon: <IconBrandWhatsapp size={17} stroke={1.75} />,
          },
        ]}
      />

      <NavSection
        title="Catalogue"
        onNavigate={onNavigate}
        items={[
          {
            label: "Products",
            link: "/products",
            icon: <IconPackage size={17} stroke={1.75} />,
          },
          { label: "Media", link: "/media", icon: <IconPhoto size={17} stroke={1.75} /> },
          ...(admin?.role === "OWNER" ? [{ label: "Homepage", link: "/storefront/homepage", icon: <IconBrowser size={17} stroke={1.75} /> }] : []),
          {
            label: "Inventory",
            link: "/inventory",
            icon: <IconBuildingWarehouse size={17} stroke={1.75} />,
          },
          { label: "Discounts", link: "/discounts", icon: <IconDiscount2 size={17} stroke={1.75} /> },
          ...(can(admin, "suppliers.manage") ? [{ label: "Suppliers", link: "/suppliers", icon: <IconTruckLoading size={17} stroke={1.75} /> }] : []),
        ]}
      />

      <NavSection
        title="Customers"
        onNavigate={onNavigate}
        items={[
          { label: "Customers", link: "/customers", icon: <IconUsers size={17} stroke={1.75} /> },
          ...(can(admin, "enquiries.view") ? [{ label: "Enquiries", link: "/enquiries", icon: <IconMessageDots size={17} stroke={1.75} /> }] : []),
        ]}
      />

      {isOwner(admin) ? <NavSection
        title="Owner controls"
        onNavigate={onNavigate}
        items={[
          { label: "Refund Requests", link: "/refund-requests", icon: <IconCash size={17} stroke={1.75} /> },
          { label: "Reports", link: "/reports", icon: <IconChartBar size={17} stroke={1.75} /> },
          { label: "Activity", link: "/activity", icon: <IconActivity size={17} stroke={1.75} /> },
          { label: "AI Usage", link: "/ai-usage", icon: <IconGauge size={17} stroke={1.75} /> },
        ]}
      /> : can(admin, "reports.view") ? <NavSection
        title="Management"
        onNavigate={onNavigate}
        items={[{ label: "Reports", link: "/reports", icon: <IconChartBar size={17} stroke={1.75} /> }]}
      /> : null}

      {admin?.role === "OWNER" ? <NavSection
        title="Administration"
        onNavigate={onNavigate}
        items={[
          { label: "Team & Roles", link: "/team", icon: <IconUsersGroup size={17} stroke={1.75} /> },
          { label: "Settings", link: "/settings", icon: <IconSettings size={17} stroke={1.75} /> },
        ]}
      /> : null}
    </Stack>
    </ScrollArea>
    </>
  );
}
