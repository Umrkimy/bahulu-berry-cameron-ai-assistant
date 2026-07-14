import { AppShell } from "@mantine/core";
import { Outlet } from "react-router-dom";

import AppNavbar from "./AppNavbar";
import AppSidebar from "./AppSidebar";

export default function AppLayout() {
  return (
    <AppShell
      header={{
        height: 64,
      }}
      navbar={{
        width: 260,
        breakpoint: "sm",
      }}
      padding="lg"
    >
      <AppShell.Header>
        <AppNavbar />
      </AppShell.Header>

      <AppShell.Navbar>
        <AppSidebar />
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          background: "#fafafa",
        }}
      >
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
