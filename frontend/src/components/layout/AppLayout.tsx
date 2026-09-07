import { AppShell } from "@mantine/core";
import { NavigationProgress, nprogress } from "@mantine/nprogress";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import AppNavbar from "./AppNavbar";
import AppSidebar from "./AppSidebar";
import CommandPalette from "./CommandPalette";
import PageReveal from "../common/motion/PageReveal";

export default function AppLayout() {
  const location = useLocation();
  const [mobileOpened, setMobileOpened] = useState(false);

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
        collapsed: { mobile: !mobileOpened },
      }}
      padding={{ base: "md", sm: "xl" }}
      styles={{
        header: {
          background: "rgba(255, 253, 250, 0.94)",
          borderBottom: "1px solid #f1dedb",
        },
        navbar: {
          background: "#fffdf8",
          borderRight: "1px solid #e9e2dc",
        },
        main: {
          background: "transparent",
        },
      }}
    >
      <AppShell.Header>
        <AppNavbar mobileOpened={mobileOpened} onToggleNavigation={() => setMobileOpened((value) => !value)} />
      </AppShell.Header>

      <AppShell.Navbar className="berry-sidebar" style={{ overflowY: "auto" }}>
        <AppSidebar onNavigate={() => setMobileOpened(false)} />
      </AppShell.Navbar>

      <AppShell.Main>
        <div className="workspace-content"><PageReveal pageKey={location.pathname}><Outlet /></PageReveal></div>
      </AppShell.Main>
      </AppShell>
    </>
  );
}
