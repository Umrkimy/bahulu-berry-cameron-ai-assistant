import { Collapse, Group, NavLink, Stack, UnstyledButton } from "@mantine/core";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { useState, type ReactNode } from "react";

import { Link, useLocation } from "react-router-dom";

interface NavItem {
  label: string;
  link: string;
  icon: ReactNode;
}

interface NavSectionProps {
  title: string;
  items: NavItem[];
  onNavigate: () => void;
  collapsible?: boolean;
  initiallyCollapsed?: boolean;
}

export default function NavSection(props: NavSectionProps) {
  const { pathname } = useLocation();
  return <NavSectionContent key={pathname} {...props} />;
}

function NavSectionContent({ title, items, onNavigate, collapsible = false, initiallyCollapsed = false }: NavSectionProps) {
  const location = useLocation();
  const containsActivePage = items.some((item) => location.pathname === item.link);
  const storageKey = `bahulu-cameron-nav-section:${title.toLowerCase().replaceAll(" ", "-")}`;
  const [collapsed, setCollapsed] = useState(() => {
    if (!collapsible) return false;
    const savedState = localStorage.getItem(storageKey);
    if (savedState !== null) return savedState === "collapsed";
    return initiallyCollapsed && !containsActivePage;
  });
  const opened = !collapsed;
  if (items.length === 0) return null;

  const heading = (
    <div
      className="nav-section-label"
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--mantine-color-dimmed)",
        letterSpacing: "0.04em",
        padding: "6px 8px",
      }}
    >
      {title}
    </div>
  );

  const links = items.map((item) => (
    <NavLink
      key={item.link}
      component={Link}
      to={item.link}
      onClick={onNavigate}
      label={item.label}
      leftSection={item.icon}
      active={location.pathname === item.link}
      aria-current={location.pathname === item.link ? "page" : undefined}
      variant="light"
      color="bahulu"
      styles={{ root: { borderRadius: 12, fontWeight: location.pathname === item.link ? 700 : 500 } }}
    />
  ));

  return (
    <Stack gap={4}>
      {collapsible ? <UnstyledButton onClick={() => setCollapsed((value) => { const next = !value; localStorage.setItem(storageKey, next ? "collapsed" : "expanded"); return next; })} aria-label={`Toggle ${title}`} aria-expanded={opened} style={{ borderRadius: 10 }}><Group justify="space-between" wrap="nowrap" px={4}>{heading}{opened ? <IconChevronDown size={16} aria-hidden="true" /> : <IconChevronRight size={16} aria-hidden="true" />}</Group></UnstyledButton> : heading}
      {collapsible ? <Collapse expanded={opened}><Stack gap={4}>{links}</Stack></Collapse> : links}
    </Stack>
  );
}
