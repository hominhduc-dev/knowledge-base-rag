import Image from "next/image";
import Link from "next/link";
import { UserMenu } from "./UserMenu";

type HeaderProps = { section: "documents" | "admin" };

export function Header({ section }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-base/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1184px] items-center gap-6 px-6 sm:px-8">
        <Link href="/chat" className="flex items-center gap-2.5 no-underline">
          <Image src="/logo-dau.png" alt="DAU" width={28} height={28} />
          <span className="font-serif text-lg font-semibold">Tàng Thư</span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Điều hướng chính">
          <Link href="/chat" className="rounded-[8px] px-3 py-2 text-sm text-secondary no-underline hover:bg-sunken">Hỏi đáp</Link>
          <Link href="/documents" className={section === "documents" ? "rounded-[8px] bg-sunken px-3 py-2 text-sm font-medium no-underline" : "rounded-[8px] px-3 py-2 text-sm text-secondary no-underline hover:bg-sunken"}>Tài liệu</Link>
          <Link href="/admin/departments" className={section === "admin" ? "rounded-[8px] bg-sunken px-3 py-2 text-sm font-medium no-underline" : "rounded-[8px] px-3 py-2 text-sm text-secondary no-underline hover:bg-sunken"}>Quản trị</Link>
        </nav>
        <div className="ml-auto"><UserMenu compact /></div>
      </div>
    </header>
  );
}
