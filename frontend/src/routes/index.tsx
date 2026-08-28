import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Auth/Login";

import Home from "../pages/Dashboard/Home";

import Products from "../pages/Products/Products";
import Orders from "../pages/Orders/Orders";
import Customers from "../pages/Customers/Customers";
import WhatsApp from "../pages/WhatsApp/Whatsapp";
import Settings from "../pages/Settings/Settings";
import Inventory from "../pages/Inventory/Inventory";
import AIAssistant from "../pages/AIAssistant/AIAssistant";
import Deliveries from "../pages/Deliveries/Deliveries";
import Discounts from "../pages/Discounts/Discounts";
import Activity from "../pages/Activity/Activity";
import Team from "../pages/Team/Team";

import ProtectedRoute from "../auth/ProtectedRoute";
import OwnerRoute from "../auth/OwnerRoute";

import AppLayout from "../components/layout/AppLayout";

export default function AppRoutes() {
  return (
    <Routes>
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

        <Route path="/whatsapp" element={<WhatsApp />} />

        <Route path="/settings" element={<Settings />} />

        <Route path="/deliveries" element={<Deliveries />} />

        <Route path="/discounts" element={<Discounts />} />

        <Route path="/activity" element={<Activity />} />

        <Route path="/team" element={<OwnerRoute><Team /></OwnerRoute>} />
      </Route>

      {/* Default route */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Unknown routes */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
