import { Alert, Button, Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";

import { IconPackage, IconShoppingCart } from "@tabler/icons-react";
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
    },
    {
      title: "This month",
      value: Number(data.sales.monthly_revenue),
      format: "currency" as const,
      description: "Month-to-date paid revenue",
    },
    {
      title: "Pending orders",
      value: data.orders.pending,
      description: `${data.orders.total} total orders`,
    },
  ];

  return (
    <Stack gap="md">
      <PageHeader
        title={`Good day, ${admin?.username || "there"}`}
        description="Today’s work, orders and sales at a glance."
        action={<Group gap="xs"><Button component={Link} to="/inventory" variant="default" leftSection={<IconPackage size={16} />}>Inventory</Button><Button component={Link} to="/orders" leftSection={<IconShoppingCart size={16} />}>Orders</Button></Group>}
      />

      <Paper withBorder className="kpi-strip">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={0}>
          {stats.map((item) => (
            <DashboardCard key={item.title} {...item} />
          ))}
        </SimpleGrid>
      </Paper>

      <TodayWorkPanel dashboard={data} role={admin?.role} />

      <Text fw={600} mt="xs">Business snapshot</Text>

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
