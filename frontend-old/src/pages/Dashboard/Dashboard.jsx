import { useEffect, useState } from "react";

import { getDashboardStats } from "../../api/dashboard";

import StatCard from "../../components/StatCard";

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function loadStats() {
      const data = await getDashboardStats();

      setStats(data);
    }

    loadStats();
  }, []);

  if (!stats) {
    return <h1>Loading...</h1>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-4 gap-5">
        <StatCard title="Products" value={stats.products.total} />

        <StatCard title="Customers" value={stats.customers.total} />

        <StatCard title="Orders" value={stats.orders.total} />

        <StatCard title="Revenue" value={`RM ${stats.sales.revenue}`} />
      </div>
    </div>
  );
}
