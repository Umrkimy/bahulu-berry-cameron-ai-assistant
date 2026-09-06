import { Alert, Button, Group, SimpleGrid, Stack } from "@mantine/core";

import {
  IconCurrencyDollar,
  IconShoppingCart,
  IconPackage,
  IconAlertTriangle,
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
import OperationsAlertPanel from "../../components/dashboard/OperationsAlertPanel";

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
        description="A clear view of your business. Orders, revenue, and what needs your attention."
        action={<Group><Button component={Link} to="/orders" leftSection={<IconShoppingCart size={16} />}>Manage Orders</Button><Button component={Link} to="/inventory" variant="default" leftSection={<IconPackage size={16} />}>View Inventory</Button></Group>}
      />

      {(data.inventory.low_stock > 0 || data.inventory.out_of_stock > 0) && (
        <Alert color="bahulu" variant="light" radius="lg" title="Inventory needs attention" icon={<IconAlertTriangle size={18} />}>
          {data.inventory.out_of_stock > 0 ? `${data.inventory.out_of_stock} product${data.inventory.out_of_stock === 1 ? " is" : "s are"} out of stock. ` : ""}{data.inventory.low_stock > 0 ? `${data.inventory.low_stock} product${data.inventory.low_stock === 1 ? " is" : "s are"} low in stock.` : ""}
        </Alert>
      )}

      {/* Stats */}

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

      <OperationsAlertPanel />

      {/* Charts */}

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
