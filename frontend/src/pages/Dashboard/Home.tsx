import { SimpleGrid, Stack, Title, Text } from "@mantine/core";

import {
  IconCurrencyDollar,
  IconShoppingCart,
  IconUsers,
  IconPackage,
} from "@tabler/icons-react";

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
      title: "Revenue",
      value: `RM ${data.sales.revenue}`,
      diff: 12,
      icon: <IconCurrencyDollar />,
    },

    {
      title: "Orders",
      value: String(data.orders.total),
      diff: 8,
      icon: <IconShoppingCart />,
    },

    {
      title: "Customers",
      value: String(data.customers.total),
      diff: 5,
      icon: <IconUsers />,
    },

    {
      title: "Products",
      value: String(data.products.total),
      diff: -2,
      icon: <IconPackage />,
    },
  ];

  return (
    <Stack gap="lg">
      {/* Header */}

      <div>
        <Title order={2}>Dashboard</Title>

        <Text c="dimmed">
          Welcome back, Umar 👋 Here is your business overview.
        </Text>
      </div>

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
