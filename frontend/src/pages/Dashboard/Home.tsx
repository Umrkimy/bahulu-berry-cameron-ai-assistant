import { Alert, Button, Group, SimpleGrid, Stack, Text } from "@mantine/core";

import {
  IconCurrencyDollar,
  IconShoppingCart,
  IconUsers,
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

import { useDashboard } from "../../hooks/useDashboard";

export default function Home() {
  const { data, isLoading, error } = useDashboard();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return <Text>Failed to load dashboard</Text>;
  }

  const stats = [
    {
      title: "Paid Revenue",
      value: `RM ${Number(data.sales.revenue).toFixed(2)}`,
      description: "All-time paid, non-cancelled orders",
      icon: <IconCurrencyDollar />,
      color: "red",
    },
    {
      title: "This Month",
      value: `RM ${Number(data.sales.monthly_revenue).toFixed(2)}`,
      description: `Today: RM ${Number(data.sales.today_revenue).toFixed(2)}`,
      icon: <IconCalendarMonth />,
      color: "blue",
    },
    {
      title: "Pending Orders",
      value: String(data.orders.pending),
      description: `${data.orders.total} total orders`,
      icon: <IconShoppingCart />,
      color: "orange",
    },
    {
      title: "Inventory Alerts",
      value: String(data.inventory.low_stock + data.inventory.out_of_stock),
      description: `${data.inventory.out_of_stock} out of stock`,
      icon: <IconAlertTriangle />,
      color: "red",
    },
    {
      title: "Customers",
      value: String(data.customers.total),
      description: `${data.products.total} active products`,
      icon: <IconUsers />,
      color: "violet",
    },
  ];

  return (
    <Stack gap="lg">
      <PageHeader
        title="Good day, Umar"
        description="Your Malaysia-time business overview, based on paid and active orders."
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
          lg: 4,
        }}
      >
        {stats.map((item) => (
          <DashboardCard key={item.title} {...item} />
        ))}
      </SimpleGrid>

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
