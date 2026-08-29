import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { AdminDashboard } from "@/features/admin/AdminDashboard";

export const metadata: Metadata = { title: "Đơn vị" };

export default function DepartmentsPage() {
  return <main className="min-h-screen"><Header section="admin" /><AdminDashboard activeTab="departments" /></main>;
}
