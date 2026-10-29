"use client";

import { Home, BarChart3, Users, Activity, Package, FileText, Settings } from "lucide-react";
import RoleSidebar from "./RoleSidebar";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/employees", label: "Manage Employees", icon: Users },
  { href: "/dashboard/activity-logs", label: "Activity Logs", icon: Activity },
  { href: "/dashboard/inventory", label: "Manage Inventory", icon: Package },
  { href: "/dashboard/manage-details", label: "Manage Details", icon: FileText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function AdminSidebar() {
  return <RoleSidebar title="Admin Panel" navItems={navItems} />;
}
