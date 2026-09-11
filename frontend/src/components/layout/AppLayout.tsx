import { AppShell } from "@mantine/core";
import { NavigationProgress, nprogress } from "@mantine/nprogress";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import AppNavbar from "./AppNavbar";
import AppSidebar from "./AppSidebar";
import CommandPalette from "./CommandPalette";
import PageReveal from "../common/motion/PageReveal";

export default function AppLayout() {
  const location = useLocation();
  const [mobileOpened, setMobileOpened] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);
  const hasMounted = useRef(false);

  useEffect(() => {
    nprogress.complete();
  }, [location.pathname]);

  useEffect(() => {
    if (hasMounted.current) mainContentRef.current?.focus();
    hasMounted.current = true;
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
      <a className="skip-to-content" href="#main-content">Skip to main content</a>
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

      <AppShell.Navbar component="nav" aria-label="Primary navigation" className="berry-sidebar" style={{ overflowY: "auto" }}>
        <AppSidebar onNavigate={() => setMobileOpened(false)} />
      </AppShell.Navbar>

      <AppShell.Main id="main-content" ref={mainContentRef} tabIndex={-1} aria-label="Admin workspace">
        <div className="workspace-content"><PageReveal pageKey={location.pathname}><Outlet /></PageReveal></div>
      </AppShell.Main>
      </AppShell>
    </>
  );
}
