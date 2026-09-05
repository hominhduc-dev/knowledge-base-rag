import Image from "next/image";
import { LoginForm } from "@/features/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="relative h-dvh overflow-hidden bg-primary">
      <Image
        src="/campus-graduation-dau.png"
        alt="Sinh viên Trường Đại học Kiến trúc Đà Nẵng trong lễ tốt nghiệp"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-[#1f1b16]/35" aria-hidden="true" />

      <main className="relative z-10 flex h-dvh items-center justify-center overflow-hidden p-3 sm:p-4 lg:justify-start lg:px-16 xl:px-24">
        <section className="w-full max-w-[540px] rounded-[12px] border border-border bg-base p-5 overlay-shadow sm:p-6">
          <div className="flex items-center gap-3.5">
            <Image src="/logo-dau.png" alt="Logo Trường Đại học Kiến trúc Đà Nẵng" width={40} height={40} priority />
            <div className="max-w-[14em] font-mono text-[11px] uppercase leading-4 tracking-[0.14em] text-muted">
              Trường Đại học Kiến trúc Đà Nẵng
            </div>
          </div>
          <h1 className="mt-3 font-serif text-[32px] font-semibold leading-[38px] sm:text-[36px] sm:leading-[44px]">Sổ Tay Sinh Viên CNTT</h1>
          <p className="mt-1.5 text-[15px] leading-6 text-secondary">
            Hỏi đáp học vụ dành cho sinh viên ngành Công nghệ Thông tin. Đăng nhập bằng tài khoản được quản trị cấp.
          </p>

          <LoginForm />

          <p className="mt-4 border-t border-border pt-3 text-[13px] leading-5 text-muted [@media(max-height:660px)]:hidden">
            Tra cứu tài liệu ngành CNTT và quy định chung của Trường Đại học Kiến trúc Đà Nẵng.
          </p>
        </section>
      </main>
    </div>
  );
}
