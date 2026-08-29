"use client";

// ---------------------------------------------------------------------------
// Chốt chặn phía giao diện cho mọi trang trong nhóm `(app)`.
//
// ĐÂY KHÔNG PHẢI CƠ CHẾ BẢO MẬT. Nó chỉ để người chưa đăng nhập không nhìn thấy
// một khung giao diện rỗng. Kiểm soát thật nằm ở máy chủ: mọi endpoint đều đòi
// `Authorization: Bearer`, và phạm vi dữ liệu nằm trong mệnh đề WHERE của truy
// vấn — xem docs/phan-quyen.md mục 4.
//
// Nói cách khác: gỡ file này đi thì giao diện xấu, chứ không rò rỉ dữ liệu.
// ---------------------------------------------------------------------------

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRestoreSession } from "./useAuth";

export function AuthGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const trangThai = useRestoreSession();
  const router = useRouter();

  useEffect(() => {
    if (trangThai === "khong-co-phien") router.replace("/login");
  }, [trangThai, router]);

  if (trangThai !== "co-phien") {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <p className="text-sm leading-[22px] text-muted">
          {trangThai === "dang-kiem" ? "Đang kiểm tra phiên đăng nhập…" : "Đang chuyển tới trang đăng nhập…"}
        </p>
      </div>
    );
  }

  return children;
}
