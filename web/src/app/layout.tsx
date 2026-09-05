import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono, Lora } from "next/font/google";
import "./globals.css";

const sans = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600"],
});

const serif = Lora({
  variable: "--font-lora",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: { default: "Sổ Tay Sinh Viên CNTT", template: "%s · Sổ Tay Sinh Viên CNTT" },
  description: "Hỏi đáp học vụ có trích dẫn cho sinh viên ngành CNTT, Đại học Kiến trúc Đà Nẵng.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${sans.variable} ${serif.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
