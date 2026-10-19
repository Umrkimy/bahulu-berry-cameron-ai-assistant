import { NavLink, Stack } from "@mantine/core";
import type { ReactNode } from "react";

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
}

export default function NavSection({ title, items, onNavigate }: NavSectionProps) {
  const { pathname } = useLocation();
  if (items.length === 0) return null;

  return (
    <Stack gap={1}>
      <div className="nav-section-label">{title}</div>
      {items.map((item) => {
        const active = pathname === item.link || pathname.startsWith(`${item.link}/`);
        return (
          <NavLink
            key={item.link}
            component={Link}
            to={item.link}
            onClick={onNavigate}
            label={item.label}
            leftSection={item.icon}
            active={active}
            aria-current={active ? "page" : undefined}
          />
        );
      })}
    </Stack>
  );
}
