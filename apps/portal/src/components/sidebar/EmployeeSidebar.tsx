"use client";

import { Home, Package, FileText, Settings } from "lucide-react";
import RoleSidebar from "./RoleSidebar";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/inventory", label: "Manage Inventory", icon: Package },
  { href: "/dashboard/manage-details", label: "Manage Details", icon: FileText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function EmployeeSidebar() {
  return <RoleSidebar title="Employee Panel" navItems={navItems} />;
}
