import { lazy, Suspense } from "react";
import { Center, Loader } from "@mantine/core";
import { Routes, Route, Navigate } from "react-router-dom";

const Login = lazy(() => import("../pages/Auth/Login"));
const Home = lazy(() => import("../pages/Dashboard/Home"));
const Products = lazy(() => import("../pages/Products/Products"));
const Orders = lazy(() => import("../pages/Orders/Orders"));
const Customers = lazy(() => import("../pages/Customers/Customers"));
const WhatsApp = lazy(() => import("../pages/WhatsApp/Whatsapp"));
const Settings = lazy(() => import("../pages/Settings/Settings"));
const Inventory = lazy(() => import("../pages/Inventory/Inventory"));
const AIAssistant = lazy(() => import("../pages/AIAssistant/AIAssistant"));
const Deliveries = lazy(() => import("../pages/Deliveries/Deliveries"));
const Discounts = lazy(() => import("../pages/Discounts/Discounts"));
const Activity = lazy(() => import("../pages/Activity/Activity"));
const Team = lazy(() => import("../pages/Team/Team"));
const RefundRequests = lazy(() => import("../pages/RefundRequests/RefundRequests"));
const AIUsage = lazy(() => import("../pages/AIUsage/AIUsage"));
const Alerts = lazy(() => import("../pages/Alerts/Alerts"));

import ProtectedRoute from "../auth/ProtectedRoute";
import OwnerRoute from "../auth/OwnerRoute";

import AppLayout from "../components/layout/AppLayout";

export default function AppRoutes() {
  return (
    <Suspense fallback={<Center h="100vh"><Loader color="bahulu" /></Center>}><Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Home />} />

        <Route path="/products" element={<Products />} />

        <Route path="/inventory" element={<Inventory />} />

        <Route path="/orders" element={<Orders />} />

        <Route path="/customers" element={<Customers />} />

        <Route path="/ai-assistant" element={<AIAssistant />} />

        <Route path="/ai-usage" element={<OwnerRoute><AIUsage /></OwnerRoute>} />

        <Route path="/whatsapp" element={<WhatsApp />} />

        <Route path="/settings" element={<OwnerRoute><Settings /></OwnerRoute>} />

        <Route path="/deliveries" element={<Deliveries />} />

        <Route path="/discounts" element={<Discounts />} />

        <Route path="/activity" element={<Activity />} />

        <Route path="/refund-requests" element={<RefundRequests />} />

        <Route path="/alerts" element={<Alerts />} />

        <Route path="/team" element={<OwnerRoute><Team /></OwnerRoute>} />
      </Route>

      {/* Default route */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Unknown routes */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes></Suspense>
  );
}
