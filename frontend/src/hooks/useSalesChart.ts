import { useQuery } from "@tanstack/react-query";

import { getSalesChart } from "../api/dashboard";

export function useSalesChart() {
  return useQuery({
    queryKey: ["sales-chart"],

    queryFn: getSalesChart,
  });
}
