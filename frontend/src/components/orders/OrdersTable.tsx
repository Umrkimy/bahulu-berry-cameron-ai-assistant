import { useMemo, useState } from "react";

import { ActionIcon, Badge, Card, Group, Text, Tooltip } from "@mantine/core";

import { IconEdit, IconEye } from "@tabler/icons-react";

import { useQuery } from "@tanstack/react-query";

import { getCustomers } from "../../api/customers";

import { useOrders } from "../../hooks/useOrders";

import type { Order } from "../../types/order";

import OrderDetailsModal from "./OrderDetailsModal";
import EditOrderModal from "./EditOrderModal";

function getOrderStatusColor(status: string) {
  switch (status) {
    case "COMPLETED":
      return "green";

    case "CANCELLED":
      return "red";

    case "SHIPPED":
      return "blue";

    case "PROCESSING":
      return "violet";

    case "PENDING":
    default:
      return "yellow";
  }
}

function getPaymentStatusColor(status: string) {
  switch (status) {
    case "PAID":
      return "green";

    case "FAILED":
      return "red";

    case "REFUNDED":
      return "violet";

    case "UNPAID":
    default:
      return "yellow";
  }
}

export default function OrdersTable() {
  const { data: orders, isLoading: isLoadingOrders } = useOrders();

  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [viewOpened, setViewOpened] = useState(false);

  const [editOpened, setEditOpened] = useState(false);

  const customerNames = useMemo(
    () =>
      new Map(
        customers?.map((customer) => [customer.id, customer.full_name]) ?? [],
      ),
    [customers],
  );

  function handleView(order: Order) {
    setSelectedOrder(order);
    setViewOpened(true);
  }

  function handleEdit(order: Order) {
    setSelectedOrder(order);
    setEditOpened(true);
  }

  function handleCloseView() {
    setViewOpened(false);
    setSelectedOrder(null);
  }

  function handleCloseEdit() {
    setEditOpened(false);
    setSelectedOrder(null);
  }

  if (isLoadingOrders || isLoadingCustomers) {
    return (
      <Card withBorder radius="md" p="lg">
        <Text c="dimmed">Loading orders...</Text>
      </Card>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Card withBorder radius="md" p="lg">
        <Text c="dimmed" ta="center">
          No orders found.
        </Text>
      </Card>
    );
  }

  return (
    <>
      <Card
        withBorder
        radius="md"
        p={0}
        style={{
          overflow: "hidden",
        }}
      >
        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              minWidth: 1000,
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    padding: "14px 16px",
                    textAlign: "left",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "var(--mantine-color-gray-0)",
                    borderBottom: "1px solid var(--mantine-color-gray-2)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Order
                </th>

                <th
                  style={{
                    padding: "14px 16px",
                    textAlign: "left",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "var(--mantine-color-gray-0)",
                    borderBottom: "1px solid var(--mantine-color-gray-2)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Customer
                </th>

                <th
                  style={{
                    padding: "14px 16px",
                    textAlign: "left",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "var(--mantine-color-gray-0)",
                    borderBottom: "1px solid var(--mantine-color-gray-2)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Total
                </th>

                <th
                  style={{
                    padding: "14px 16px",
                    textAlign: "left",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "var(--mantine-color-gray-0)",
                    borderBottom: "1px solid var(--mantine-color-gray-2)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Status
                </th>

                <th
                  style={{
                    padding: "14px 16px",
                    textAlign: "left",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "var(--mantine-color-gray-0)",
                    borderBottom: "1px solid var(--mantine-color-gray-2)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Payment
                </th>

                <th
                  style={{
                    padding: "14px 16px",
                    textAlign: "left",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "var(--mantine-color-gray-0)",
                    borderBottom: "1px solid var(--mantine-color-gray-2)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Date
                </th>

                <th
                  style={{
                    padding: "14px 16px",
                    textAlign: "left",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "var(--mantine-color-gray-0)",
                    borderBottom: "1px solid var(--mantine-color-gray-2)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  style={{
                    borderBottom: "1px solid var(--mantine-color-gray-2)",
                  }}
                >
                  <td
                    style={{
                      padding: "14px 16px",
                      fontSize: 14,
                    }}
                  >
                    <Text fw={600}>#{order.id}</Text>
                  </td>

                  <td
                    style={{
                      padding: "14px 16px",
                      fontSize: 14,
                    }}
                  >
                    <Text>
                      {customerNames.get(order.customer_id) ??
                        `Customer #${order.customer_id}`}
                    </Text>
                  </td>

                  <td
                    style={{
                      padding: "14px 16px",
                      fontSize: 14,
                    }}
                  >
                    <Text fw={600}>
                      RM {Number(order.total_amount).toFixed(2)}
                    </Text>
                  </td>

                  <td
                    style={{
                      padding: "14px 16px",
                      fontSize: 14,
                    }}
                  >
                    <Badge
                      variant="light"
                      color={getOrderStatusColor(order.status)}
                    >
                      {order.status}
                    </Badge>
                  </td>

                  <td
                    style={{
                      padding: "14px 16px",
                      fontSize: 14,
                    }}
                  >
                    <Badge
                      variant="light"
                      color={getPaymentStatusColor(order.payment_status)}
                    >
                      {order.payment_status}
                    </Badge>
                  </td>

                  <td
                    style={{
                      padding: "14px 16px",
                      fontSize: 14,
                    }}
                  >
                    {new Date(order.created_at).toLocaleDateString("en-MY", {
                      timeZone: "Asia/Kuala_Lumpur",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>

                  <td
                    style={{
                      padding: "14px 16px",
                      fontSize: 14,
                    }}
                  >
                    <Group gap="xs">
                      <Tooltip label="View order" withArrow>
                        <ActionIcon
                          size="lg"
                          variant="light"
                          color="blue"
                          onClick={() => handleView(order)}
                          aria-label="View order"
                        >
                          <IconEye size={20} />
                        </ActionIcon>
                      </Tooltip>

                      <Tooltip label="Edit order" withArrow>
                        <ActionIcon
                          size="lg"
                          variant="light"
                          color="orange"
                          onClick={() => handleEdit(order)}
                          aria-label="Edit order"
                        >
                          <IconEdit size={20} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <OrderDetailsModal
        opened={viewOpened}
        order={selectedOrder}
        onClose={handleCloseView}
      />

      <EditOrderModal
        opened={editOpened}
        order={selectedOrder}
        onClose={handleCloseEdit}
      />
    </>
  );
}
