import { Alert, Button, Group, SimpleGrid, Stack, Text } from "@mantine/core";

import {
  IconCurrencyDollar,
  IconShoppingCart,
  IconPackage,
  IconCalendarMonth,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";

import DashboardSkeleton from "../../components/dashboard/DashboardSkeleton";

import DashboardCard from "../../components/dashboard/DashboardCard";

import SalesChart from "../../components/dashboard/SalesChart";

import RecentOrders from "../../components/dashboard/RecentOrders";

import OrderStatusCard from "../../components/dashboard/OrderStatusCard";

import InventoryCard from "../../components/dashboard/InventoryCard";
import TodayWorkPanel from "../../components/dashboard/TodayWorkPanel";

import { useDashboard } from "../../hooks/useDashboard";
import useAuth from "../../auth/useAuth";

export default function Home() {
  const { data, isLoading, error, refetch } = useDashboard();
  const { admin } = useAuth();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return <Alert color="red" title="Dashboard unavailable">We could not load the latest operational data. <Button size="compact-xs" variant="subtle" color="red" onClick={() => refetch()}>Try again</Button></Alert>;
  }

  const stats = [
    {
      title: "Today’s sales",
      value: Number(data.sales.today_revenue),
      format: "currency" as const,
      description: "Paid, non-cancelled orders today",
      icon: <IconCurrencyDollar />,
      color: "red",
    },
    {
      title: "This month",
      value: Number(data.sales.monthly_revenue),
      format: "currency" as const,
      description: "Month-to-date paid revenue",
      icon: <IconCalendarMonth />,
      color: "red",
    },
    {
      title: "Pending Orders",
      value: data.orders.pending,
      description: `${data.orders.total} total orders`,
      icon: <IconShoppingCart />,
      color: "orange",
    },
  ];

  return (
    <Stack gap="lg">
      <PageHeader
        title={`Good day, ${admin?.username || "there"}`}
        description="A clear view of today’s work, orders, and business performance. Open the bell for live updates."
        action={<Group><Button component={Link} to="/orders" leftSection={<IconShoppingCart size={16} />}>Manage Orders</Button><Button component={Link} to="/inventory" variant="default" leftSection={<IconPackage size={16} />}>View Inventory</Button></Group>}
      />

      <TodayWorkPanel dashboard={data} role={admin?.role} />

      <SimpleGrid
        cols={{
          base: 1,
          sm: 2,
          lg: 3,
        }}
      >
        {stats.map((item) => (
          <DashboardCard key={item.title} {...item} />
        ))}
      </SimpleGrid>

      <Stack gap={2} mt="sm">
        <Text fw={750} fz="lg">Business snapshot</Text>
        <Text size="sm" c="dimmed">Sales and order performance after today’s operational work.</Text>
      </Stack>

      <SimpleGrid
        cols={{
          base: 1,
          lg: 2,
        }}
      >
        <SalesChart />

        <OrderStatusCard />
      </SimpleGrid>

      {/* Orders */}

      <RecentOrders />

      <InventoryCard />
    </Stack>
  );
}
