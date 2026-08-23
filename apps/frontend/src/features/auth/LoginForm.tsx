"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "./useAuth";

export function LoginForm() {
  const { login } = useAuth();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!account.trim() || !password) {
      setError("Vui lòng nhập tài khoản trường và mật khẩu.");
      return;
    }
    // Thông báo lỗi giống hệt nhau dù sai tài khoản hay sai mật khẩu — nói rõ
    // "không tìm thấy mã này" là để lộ mã số sinh viên nào có thật.
    if (!login(account)) {
      setError("Tài khoản hoặc mật khẩu không đúng.");
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 border-t border-border pt-4" noValidate>
      <div className="min-[520px]:grid min-[520px]:grid-cols-2 min-[520px]:gap-3">
        <div>
          <label htmlFor="account" className="text-[13px] font-medium leading-5 text-secondary">Tài khoản trường</label>
          <Input
            id="account"
            autoComplete="username"
            className="mt-1"
            placeholder="2351220193 hoặc duc_2351220193@dau.edu.vn"
            value={account}
            onChange={(event) => { setAccount(event.target.value); setError(null); }}
          />
          <p className="mt-1 text-[13px] leading-5 text-muted">Mã số sinh viên hoặc email trường.</p>
        </div>

        <div className="mt-3 min-[520px]:mt-0">
          <label htmlFor="password" className="block text-[13px] font-medium leading-5 text-secondary">Mật khẩu</label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="mt-1"
            placeholder="••••••••"
            value={password}
            onChange={(event) => { setPassword(event.target.value); setError(null); }}
          />
        </div>
      </div>

      {error && <p role="alert" className="mt-3 text-sm leading-[22px] text-danger">{error}</p>}

      <Button type="submit" className="mt-4 w-full">Đăng nhập</Button>

      <div className="my-3 flex items-center gap-3.5 text-[13px] text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span>hoặc</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Đăng nhập một lần với hệ thống trường nằm ngoài phạm vi đồ án (Mục 3).
          Giữ nút cho đúng thiết kế nhưng vô hiệu hóa — trước đây nút này bỏ qua
          hoàn toàn bước nhập tài khoản, tức là một cửa hậu vào hệ thống. */}
      <Button type="button" variant="outline" className="w-full font-medium" disabled>
        Đăng nhập một lần (SSO) của trường
      </Button>
      <p className="mt-1.5 text-center text-[13px] leading-5 text-muted">Chưa hỗ trợ trong bản này.</p>

      <div className="mt-3 flex justify-between gap-4 text-sm leading-[22px]">
        <a href="#">Quên mật khẩu</a>
        <a href="#">Hỗ trợ tài khoản</a>
      </div>
    </form>
  );
}
