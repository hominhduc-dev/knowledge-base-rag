import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { AdminDashboard } from "@/features/admin/AdminDashboard";

export const metadata: Metadata = { title: "Ma trận quyền" };

export default function PermissionsPage() {
  return <main className="min-h-screen"><Header section="admin" /><AdminDashboard activeTab="permissions" /></main>;
}
