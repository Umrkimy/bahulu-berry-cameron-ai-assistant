import { AppShell } from "@mantine/core";
import { NavigationProgress, nprogress } from "@mantine/nprogress";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";

import AppNavbar from "./AppNavbar";
import AppSidebar from "./AppSidebar";
import CommandPalette from "./CommandPalette";

export default function AppLayout() {
  const location = useLocation();

  useEffect(() => {
    nprogress.complete();
  }, [location.pathname]);

  useEffect(() => {
    const startNavigation = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest("a");
      if (link?.href.startsWith(window.location.origin) && !event.defaultPrevented) nprogress.start();
    };
    document.addEventListener("click", startNavigation);
    return () => document.removeEventListener("click", startNavigation);
  }, []);

  return (
    <>
      <NavigationProgress color="bahulu" />
      <CommandPalette />
      <AppShell
      header={{
        height: 72,
      }}
      navbar={{
        width: 260,
        breakpoint: "sm",
      }}
      padding={{ base: "md", sm: "xl" }}
      styles={{
        header: {
          background: "rgba(255, 253, 250, 0.94)",
          borderBottom: "1px solid #f1dedb",
        },
        navbar: {
          background: "#fffdf9",
          borderRight: "1px solid #f1dedb",
        },
        main: {
          background: "transparent",
        },
      }}
    >
      <AppShell.Header>
        <AppNavbar />
      </AppShell.Header>

      <AppShell.Navbar>
        <AppSidebar />
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
      </AppShell>
    </>
  );
}
