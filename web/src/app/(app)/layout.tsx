import { AuthGuard } from "@/features/auth/AuthGuard";

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Mọi trang trong nhóm `(app)` đều đòi đăng nhập. Màn `/login` nằm ở nhóm
  // `(auth)` nên không đi qua đây — nếu không sẽ thành vòng lặp chuyển hướng.
  return <AuthGuard>{children}</AuthGuard>;
}
