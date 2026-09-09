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

export default function NavSection({ title, items, onNavigate, collapsible = false, initiallyCollapsed = false }: NavSectionProps) {
  const location = useLocation();
  const containsActivePage = items.some((item) => location.pathname === item.link);
  const [collapsed, setCollapsed] = useState(initiallyCollapsed && !containsActivePage);
  const opened = !collapsed || containsActivePage;
  if (items.length === 0) return null;

  const heading = (
    <div
      className="nav-section-label"
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: "var(--mantine-color-dimmed)",
        padding: "0 12px",
        marginTop: 12,
        marginBottom: 4,
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
      {collapsible ? <UnstyledButton onClick={() => setCollapsed((value) => !value)} aria-expanded={opened}><Group justify="space-between" wrap="nowrap">{heading}{opened ? <IconChevronDown size={15} /> : <IconChevronRight size={15} />}</Group></UnstyledButton> : heading}
      {collapsible ? <Collapse expanded={opened}><Stack gap={4}>{links}</Stack></Collapse> : links}
    </Stack>
  );
}
