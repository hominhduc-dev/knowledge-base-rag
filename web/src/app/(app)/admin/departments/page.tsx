import { redirect } from "next/navigation";

/** Tương thích liên kết cũ; đồ án hiện không có màn quản trị nhiều khoa. */
export default function DepartmentsPage() {
  redirect("/admin/users");
}
