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
}

export default function NavSection({ title, items }: NavSectionProps) {
  const location = useLocation();

  return (
    <Stack gap={4}>
      <div
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

      {items.map((item) => (
        <NavLink
          key={item.link}
          component={Link}
          to={item.link}
          label={item.label}
          leftSection={item.icon}
          active={location.pathname === item.link}
        />
      ))}
    </Stack>
  );
}
