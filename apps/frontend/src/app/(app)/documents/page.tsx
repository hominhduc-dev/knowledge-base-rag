import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { DocumentManager } from "@/features/documents/DocumentManager";

export const metadata: Metadata = { title: "Tài liệu" };

export default function DocumentsPage() {
  return (
    <main className="min-h-screen bg-base">
      <Header section="documents" />
      <DocumentManager />
    </main>
  );
}
