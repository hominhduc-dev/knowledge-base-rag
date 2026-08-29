import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { AdminDashboard } from "@/features/admin/AdminDashboard";

export const metadata: Metadata = { title: "Người dùng" };

export default function UsersPage() {
  return <main className="min-h-screen"><Header section="admin" /><AdminDashboard activeTab="users" /></main>;
}
