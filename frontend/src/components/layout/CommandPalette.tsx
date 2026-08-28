import { useEffect } from "react";
import { Spotlight, spotlight } from "@mantine/spotlight";
import { useHotkeys } from "@mantine/hooks";
import { IconBox, IconBuildingWarehouse, IconDiscount2, IconHome, IconMessageChatbot, IconPackage, IconPlus, IconShoppingCart, IconTruck, IconUsers } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

export default function CommandPalette() {
  const navigate = useNavigate();
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
          { id: "assistant", label: "AI Assistant", onClick: () => navigate("/ai-assistant"), leftSection: <IconMessageChatbot size={18} /> },
        ] },
        { group: "Quick actions", actions: [
          { id: "new-order", label: "Create Order", onClick: () => navigate("/orders?create=1"), leftSection: <IconPlus size={18} /> },
          { id: "new-customer", label: "Add Customer", onClick: () => navigate("/customers?create=1"), leftSection: <IconPlus size={18} /> },
          { id: "new-product", label: "Add Product", onClick: () => navigate("/products?create=1"), leftSection: <IconPlus size={18} /> },
          { id: "new-discount", label: "Create Discount", onClick: () => navigate("/discounts?create=1"), leftSection: <IconPlus size={18} /> },
        ] },
      ]}
    />
  );
}
