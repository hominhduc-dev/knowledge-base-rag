import Image from "next/image";
import Link from "next/link";
import { AdminNavLink } from "./AdminNavLink";
import { UserMenu } from "./UserMenu";

type HeaderProps = { section: "documents" | "admin" };

export function Header({ section }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-base/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1184px] items-center gap-6 px-6 sm:px-8">
        <Link href="/chat" className="flex min-w-0 items-center gap-2.5 no-underline">
          <Image src="/logo-dau.png" alt="DAU" width={28} height={28} />
          <span className="truncate font-serif text-base font-semibold sm:text-lg">Sổ Tay Sinh Viên CNTT</span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Điều hướng chính">
          <Link href="/chat" className="rounded-[8px] px-3 py-2 text-sm text-secondary no-underline hover:bg-sunken">Hỏi đáp</Link>
          <Link href="/documents" className={section === "documents" ? "rounded-[8px] bg-sunken px-3 py-2 text-sm font-medium no-underline" : "rounded-[8px] px-3 py-2 text-sm text-secondary no-underline hover:bg-sunken"}>Tài liệu</Link>
          <AdminNavLink active={section === "admin"} />
        </nav>
        <div className="ml-auto"><UserMenu compact /></div>
      </div>
    </header>
  );
}
