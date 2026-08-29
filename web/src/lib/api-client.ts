const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export async function apiClient<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window === "undefined" ? null : window.localStorage.getItem("tang-thu-token");
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error("Không thể kết nối API Tàng Thư");
  return response.json() as Promise<T>;
}
