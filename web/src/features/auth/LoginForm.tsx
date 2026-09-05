"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "./useAuth";

export function LoginForm() {
  const { login } = useAuth();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dangGui, setDangGui] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!account.trim() || !password) {
      setError("Vui lòng nhập tài khoản trường và mật khẩu.");
      return;
    }

    setDangGui(true);
    setError(null);
    try {
      await login(account, password);
      // Không tắt `dangGui` ở đây: đã điều hướng sang trang khác, đặt lại state
      // trên một component sắp bị gỡ chỉ tạo cảnh báo trong console.
    } catch (err) {
      // Máy chủ CỐ TÌNH trả cùng một thông báo cho "sai tài khoản" và "sai mật
      // khẩu". Hiển thị nguyên văn, đừng diễn giải thêm — nói rõ "không tìm
      // thấy mã này" là để lộ mã số sinh viên nào có thật.
      setError(
        err instanceof ApiError
          ? err.message
          : "Không đăng nhập được. Vui lòng thử lại.",
      );
      setDangGui(false);
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
            disabled={dangGui}
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
            disabled={dangGui}
            onChange={(event) => { setPassword(event.target.value); setError(null); }}
          />
        </div>
      </div>

      {error && <p role="alert" className="mt-3 text-sm leading-[22px] text-danger">{error}</p>}

      <Button type="submit" className="mt-4 w-full" disabled={dangGui}>
        {dangGui ? "Đang đăng nhập…" : "Đăng nhập"}
      </Button>

      <p className="mt-3 text-center text-[13px] leading-5 text-muted">
        Liên hệ quản trị viên khi cần cấp tài khoản hoặc hỗ trợ đăng nhập.
      </p>
    </form>
  );
}
