import { useEffect } from "react";
import { Spotlight, spotlight } from "@mantine/spotlight";
import { useHotkeys } from "@mantine/hooks";
import { IconBell, IconBox, IconBuildingWarehouse, IconCash, IconChartBar, IconDiscount2, IconHome, IconMessageChatbot, IconPackage, IconPlus, IconShoppingCart, IconTruck, IconUsers } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../auth/useAuth";
import type { DashboardRouteState } from "../../types/navigation";

export default function CommandPalette() {
  const navigate = useNavigate();
  const { admin } = useAuth();
  useHotkeys([["mod + K", () => spotlight.open()]]);

  useEffect(() => {
    const openPalette = () => spotlight.open();
    window.addEventListener("open-command-palette", openPalette);
    return () => window.removeEventListener("open-command-palette", openPalette);
  }, []);

  return (
    <Spotlight
      shortcut="mod + K"
      nothingFound="No page or action found"
      highlightQuery
      searchProps={{ placeholder: "Jump to a page or action..." }}
      actions={[
        { group: "Pages", actions: [
          { id: "dashboard", label: "Dashboard", onClick: () => navigate("/dashboard"), leftSection: <IconHome size={18} /> },
          { id: "customers", label: "Customers", onClick: () => navigate("/customers"), leftSection: <IconUsers size={18} /> },
          { id: "products", label: "Products", onClick: () => navigate("/products"), leftSection: <IconPackage size={18} /> },
          { id: "inventory", label: "Inventory", onClick: () => navigate("/inventory"), leftSection: <IconBuildingWarehouse size={18} /> },
          { id: "orders", label: "Orders", onClick: () => navigate("/orders"), leftSection: <IconShoppingCart size={18} /> },
          { id: "deliveries", label: "Deliveries", onClick: () => navigate("/deliveries"), leftSection: <IconTruck size={18} /> },
          { id: "discounts", label: "Discounts", onClick: () => navigate("/discounts"), leftSection: <IconDiscount2 size={18} /> },
          { id: "activity", label: "Activity", onClick: () => navigate("/activity"), leftSection: <IconBox size={18} /> },
          { id: "alerts", label: "Operations Alerts", onClick: () => navigate("/alerts"), leftSection: <IconBell size={18} /> },
          { id: "refund-requests", label: "Refund Requests", onClick: () => navigate("/refund-requests"), leftSection: <IconCash size={18} /> },
          { id: "assistant", label: "AI Assistant", onClick: () => navigate("/ai-assistant"), leftSection: <IconMessageChatbot size={18} /> },
          ...(admin?.role === "OWNER" ? [{ id: "ai-usage", label: "AI Usage & Budget", onClick: () => navigate("/ai-usage"), leftSection: <IconChartBar size={18} /> }] : []),
          ...(admin?.role === "OWNER" ? [{ id: "reports", label: "Owner Reports", onClick: () => navigate("/reports"), leftSection: <IconChartBar size={18} /> }] : []),
        ] },
        { group: "Quick actions", actions: [
          { id: "new-order", label: "Create Order", onClick: () => navigate("/orders", { state: { dashboardAction: "CREATE_ORDER" } satisfies DashboardRouteState }), leftSection: <IconPlus size={18} /> },
          { id: "new-customer", label: "Add Customer", onClick: () => navigate("/customers", { state: { dashboardAction: "CREATE_CUSTOMER" } satisfies DashboardRouteState }), leftSection: <IconPlus size={18} /> },
          ...(admin?.role === "OWNER" ? [
            { id: "new-product", label: "Add Product", onClick: () => navigate("/products", { state: { dashboardAction: "CREATE_PRODUCT" } satisfies DashboardRouteState }), leftSection: <IconPlus size={18} /> },
            { id: "new-discount", label: "Create Discount", onClick: () => navigate("/discounts", { state: { dashboardAction: "CREATE_DISCOUNT" } satisfies DashboardRouteState }), leftSection: <IconPlus size={18} /> },
          ] : []),
        ] },
      ]}
    />
  );
}
