# API Contract — Tàng Thư

**Chốt 22/08/2026** · Đây là hợp đồng giữa `apps/frontend` và `apps/backend`.

Sửa file này **trước** khi sửa code hai bên, bằng một PR riêng. Đây là tài liệu duy nhất mà cả bốn thành viên đều phụ thuộc: TV3 và TV4 làm song song với Đức dựa trên nó.

## Nguyên tắc đã chốt

| | Quyết định |
|---|---|
| Đặt tên khóa JSON | **Giữ tên frontend đang dùng** (`n`, `doc`, `locator`, `excerpt`, `unit`). Chỉ **bổ sung** trường còn thiếu, không đổi tên hàng loạt |
| `locator` | Trả **cả hai**: `articleRef` và `page` rời, cộng `locator` đã ghép sẵn để hiển thị |
| SSE | Dùng **event có tên**: `token` · `citation` · `no_source` · `done` · `error` |
| Marker trích dẫn | **Giữ** `[1]` `[2]` chèn trong câu trả lời, khớp với `Source.n` |

Trường được bổ sung so với mock hiện tại được đánh dấu **`MỚI`**.

---

## 1. Quy ước chung

### Địa chỉ và xác thực

- Base URL: `NEXT_PUBLIC_API_URL`, mặc định `http://localhost:4000/api`
- Đường dẫn trong tài liệu này viết **không kèm** tiền tố `/api` vì `apiClient` đã gắn sẵn
- Mọi request sau đăng nhập gửi kèm `Authorization: Bearer <token>`
- Token lưu ở `localStorage` khóa `tang-thu-token`

### Khuôn dạng phản hồi

```jsonc
// Thành công
{ "success": true, "data": { } }

// Thất bại
{ "success": false, "error": { "code": "FORBIDDEN_SCOPE", "message": "Tài liệu không thuộc phạm vi của bạn" } }
```

| Mã lỗi | HTTP | Khi nào |
|---|---|---|
| `UNAUTHENTICATED` | 401 | Thiếu token, token sai hoặc hết hạn |
| `ACCOUNT_DISABLED` | 403 | Tài khoản bị vô hiệu hóa |
| `FORBIDDEN_ROLE` | 403 | Vai trò không đủ quyền cho thao tác |
| `FORBIDDEN_SCOPE` | 403 | Tài nguyên thuộc đơn vị khác |
| `NOT_FOUND` | 404 | Không tồn tại, hoặc tồn tại nhưng ngoài phạm vi |
| `VALIDATION_ERROR` | 422 | Dữ liệu vào sai định dạng |
| `DUPLICATE_DOCUMENT` | 409 | Trùng `contentHash` |
| `UPSTREAM_ERROR` | 503 | Lỗi từ Gemini hoặc Supabase Storage |

Phân biệt `FORBIDDEN_ROLE` và `FORBIDDEN_SCOPE` là có chủ đích: một bên là "vai của bạn không được làm việc này", một bên là "việc này thuộc đơn vị khác". Frontend hiển thị hai thông báo khác nhau.

**Lưu ý về `NOT_FOUND` với tài nguyên ngoài phạm vi.** Khi người dùng truy cập tài liệu của đơn vị khác, API trả `403 FORBIDDEN_SCOPE` cho tài nguyên họ *biết là tồn tại* (ví dụ bấm nhầm liên kết cũ), nhưng trả `404 NOT_FOUND` khi liệt kê — tức là tài liệu đơn vị khác không bao giờ xuất hiện trong danh sách. Không dùng 403 ở endpoint liệt kê, vì như vậy là tiết lộ có tồn tại tài liệu đó.

### Thay đổi cần làm ở `api-client.ts`

Hàm hiện tại nuốt hết lỗi thành một chuỗi chung, nên không phân biệt được `FORBIDDEN_ROLE` với `FORBIDDEN_SCOPE`. Cần sửa ba chỗ:

```ts
export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}

export async function apiClient<T>(path: string, init: RequestInit = {}): Promise<T> {
  // ... giữ nguyên phần dựng headers
  const body = await response.json();
  if (!response.ok || body.success === false) {
    throw new ApiError(body?.error?.code ?? "UNKNOWN", body?.error?.message ?? "Lỗi không xác định", response.status);
  }
  return body.data as T;   // bóc lớp vỏ, component không phải biết
}
```

Đây là thay đổi duy nhất bắt buộc ở frontend ngoài việc bỏ mock data.

---

## 2. Kiểu dữ liệu dùng chung

Đặt trong `packages/shared/src/dto/`.

### `Source` — một trích dẫn

```ts
type Source = {
  n: number;            // số thứ tự, khớp marker [1] trong câu trả lời
  doc: string;          // tiêu đề tài liệu
  locator: string;      // "Điều 12, Khoản 1 · Trang 8" — backend ghép sẵn
  excerpt: string;      // đoạn trích hiển thị
  unit: string;         // "Toàn trường" hoặc tên khoa
  documentId: string;   // MỚI — để gọi /documents/:id/source-url
  chunkId: string;      // MỚI — phục vụ gỡ lỗi và bộ đánh giá
  articleRef: string | null;  // MỚI — "Điều 12, Khoản 1"
  page: number | null;        // MỚI — mở PDF đúng trang qua #page=N
  score: number;              // MỚI — điểm truy hồi, mặc định ẩn trên giao diện
};
```

`unit` là chuỗi hiển thị: `scope = GLOBAL` trả `"Toàn trường"`, ngược lại trả tên đơn vị.

`locator` ghép theo quy tắc: `articleRef` + `" · Trang "` + `page`. Thiếu `articleRef` thì chỉ `"Trang N"`; thiếu cả hai thì `"Không rõ vị trí"`.

### `KnowledgeDocument` — một tài liệu trong danh sách

```ts
type DocumentStatus = "pending" | "processing" | "ready" | "error";  // MỚI: thêm "pending"

type KnowledgeDocument = {
  id: string;           // MỚI — uuid, dùng trong mọi URL
  name: string;         // tiêu đề
  code: string | null;  // số hiệu văn bản, có thể rỗng
  unit: string;
  status: DocumentStatus;
  chunks: number;
  updated: string;      // ĐỔI ĐỊNH DẠNG — ISO 8601, frontend tự format dd/MM/yyyy
  scope: "GLOBAL" | "DEPARTMENT";   // MỚI — cho bộ lọc "Của khoa" / "Toàn trường"
  approval: "proposed" | "approved" | "rejected";  // MỚI
  canEdit: boolean;     // MỚI — backend đã tính sẵn, frontend không tự suy từ vai
};
```

Ba điểm cần chú ý:

**`id` thay `code` làm định danh.** Mock hiện dùng `code` làm khóa (`documentChunks` được đánh chỉ mục bằng `code`). Nhưng `code` có thể rỗng và không bảo đảm duy nhất, nên mọi URL dùng `id`.

**`updated` đổi sang ISO 8601.** Mock đang là `"12/08/2026"`. API trả `"2026-08-12T09:30:00Z"` vì chuỗi dd/MM/yyyy không sắp xếp được và mơ hồ về múi giờ. Frontend format khi hiển thị.

**`canEdit` do backend tính.** Frontend không tự suy "vai EDITOR thì hiện nút sửa" — vì còn phụ thuộc tài liệu có thuộc đơn vị của người đó không. Backend biết cả hai, frontend chỉ đọc cờ.

### `ChunkItem` — một đoạn văn

```ts
type ChunkItem = {
  id: string;
  locator: string;
  text: string;
  articleRef: string | null;  // MỚI
  page: number | null;        // MỚI
  index: number;              // MỚI — thứ tự trong tài liệu
};
```

### `DepartmentItem` và `UserItem`

```ts
type DepartmentItem = {
  id: string;      // MỚI
  code: string;    // MỚI — CNTT, KT, PDT
  name: string;
  kind: string;    // "Khoa" hoặc "Phòng ban"
  docs: number;
  users: number;
  staff: string | null;
};

type UserItem = {
  id: string;          // MỚI
  code: string | null; // MỚI — MSSV hoặc mã cán bộ, dùng để đăng nhập
  name: string;
  email: string;
  role: string;        // hiển thị: "Sinh viên" | "Giảng viên" | "Giáo vụ khoa" | "Quản trị viên"
  roleCode: "VIEWER" | "CONTRIBUTOR" | "EDITOR" | "ADMIN";  // MỚI — dùng cho logic
  scope: string;       // tên đơn vị
  departmentId: string;  // MỚI
  isActive: boolean;     // MỚI
};
```

Hai lưu ý:

**`kind` rút gọn.** Mock ghi `"Khoa · 4 bộ môn"`, nhưng bộ môn không được mô hình hóa trong `schema.prisma`. API trả `"Khoa"` hoặc `"Phòng ban"`; nếu muốn giữ hiển thị cũ thì frontend tự ghép thêm.

**`staff` là trường suy ra**, không có cột tương ứng: backend lấy `fullName` của EDITOR đầu tiên trong đơn vị, không có thì trả `null`.

---

## 3. Xác thực

Hệ thống **không có đăng ký**. Tài khoản do ADMIN cấp.

### `POST /auth/login`

Người dùng đăng nhập bằng **mã số sinh viên hoặc email trường** — một ô nhập duy nhất, giao diện đã đặt nhãn "Tài khoản trường".

```jsonc
// request — `account` nhận cả hai dạng
{ "account": "2151050123", "password": "..." }
{ "account": "minh.n@sv.dau.edu.vn", "password": "..." }

// data
{
  "token": "eyJhbGci...",
  "user": {
    "id": "uuid", "code": "2151050123", "name": "Nguyễn Minh",
    "email": "minh.n@sv.dau.edu.vn",
    "role": "Sinh viên", "roleCode": "VIEWER",
    "scope": "Khoa Công nghệ Thông tin", "departmentId": "uuid"
  }
}
```

**Cách phân biệt hai dạng:** có ký tự `@` thì coi là email, ngược lại coi là mã. Không cần người dùng chọn.

**Chuẩn hóa trước khi tra:** email đưa về chữ thường, mã đưa về chữ hoa. Cơ sở dữ liệu có chỉ mục duy nhất trên `lower(email)` và trên `code` nên không bao giờ mơ hồ.

Lỗi: `401 UNAUTHENTICATED` (sai tài khoản hoặc mật khẩu — **thông báo giống hệt nhau cho cả hai trường hợp**, không tiết lộ mã hay email nào có thật) · `403 ACCOUNT_DISABLED`.

**Frontend cần sửa:** trong `LoginForm.tsx`, biến state đang tên `email` — đổi thành `account` cho khỏi hiểu nhầm, vì ô đó giờ nhận cả mã số sinh viên. Nhãn hiển thị "Tài khoản trường" giữ nguyên, chỉ đổi placeholder thành `2151050123 hoặc minh.n@sv.dau.edu.vn`.

### `GET /auth/me`

Trả đúng object `user` như trên. Dùng để khôi phục phiên khi tải lại trang.

### `PUT /auth/password`

```jsonc
{ "currentPassword": "...", "newPassword": "..." }
```

Trả `{ "success": true, "data": { "changed": true } }`. Lỗi `422 VALIDATION_ERROR` nếu mật khẩu mới dưới 8 ký tự.

---

## 4. Hỏi đáp

### `POST /chat/stream` — Server-Sent Events

```jsonc
// request
{ "question": "Điều kiện xét tốt nghiệp là gì?", "conversationId": "uuid | null" }
```

Phản hồi `Content-Type: text/event-stream`, năm loại sự kiện:

```
event: token
data: {"text":"Sinh viên được xét tốt nghiệp khi tích lũy đủ"}

event: citation
data: {"n":1,"doc":"Quy chế đào tạo trình độ đại học","locator":"Điều 12, Khoản 1 · Trang 8","excerpt":"Sinh viên được xét công nhận tốt nghiệp khi...","unit":"Toàn trường","documentId":"uuid","chunkId":"uuid","articleRef":"Điều 12, Khoản 1","page":8,"score":0.83}

event: no_source
data: {"message":"Không tìm thấy thông tin này trong tài liệu của đơn vị bạn."}

event: done
data: {"messageId":"uuid","conversationId":"uuid","latencyMs":2840}

event: error
data: {"code":"UPSTREAM_ERROR","message":"Dịch vụ mô hình tạm thời không phản hồi"}
```

**Thứ tự sự kiện.** Các `token` đến trước, rồi toàn bộ `citation` theo thứ tự `n` tăng dần, cuối cùng là `done`. Frontend hiển thị dần phần chữ và chỉ kích hoạt marker `[n]` sau khi nhận được `citation` tương ứng.

**Trường hợp không có nguồn.** Backend gửi `no_source` rồi `done`, **không gửi `token` nào và không gọi Gemini sinh câu trả lời**. Đây là ràng buộc bắt buộc — gọi mô hình khi không có ngữ cảnh thì nó sẽ trả lời bằng kiến thức chung, đúng cái sai nguy hiểm nhất mà đề tài đặt ra để giải quyết.

**Ràng buộc marker.** Backend kiểm tra mọi marker `[n]` trong văn bản đều có `citation` tương ứng. Nếu mô hình bịa `[4]` trong khi chỉ có 3 nguồn, backend gỡ marker đó khỏi văn bản trước khi gửi đi.

**Giới hạn.** `question` từ 3 đến 500 ký tự, ngoài khoảng trả `422 VALIDATION_ERROR`.

### `GET /conversations`

```jsonc
{ "items": [ { "id": "uuid", "title": "Điều kiện nhận đồ án tốt nghiệp", "when": "2026-08-22T03:10:00Z" } ] }
```

Mock đang dùng `when` là chuỗi `"Hôm nay"` / `"18/08"`. API trả ISO, frontend tự quy đổi sang "Hôm nay" / "Hôm qua".

### `GET /conversations/:id`

```jsonc
{
  "id": "uuid", "title": "...",
  "messages": [
    { "id": "uuid", "role": "user", "content": "Điều kiện xét tốt nghiệp là gì?" },
    { "id": "uuid", "role": "assistant", "content": "Sinh viên được xét... [1]", "sources": [ /* Source[] */ ] }
  ]
}
```

Chỉ trả hội thoại của chính người gọi. Hội thoại của người khác trả `404 NOT_FOUND`.

---

## 5. Tài liệu

### `GET /documents`

Tham số: `q` (tìm theo tên hoặc số hiệu) · `scope` = `all` \| `department` \| `global` (ứng với bộ lọc "Tất cả" / "Của khoa" / "Toàn trường") · `status` · `page` · `pageSize`.

```jsonc
{ "items": [ /* KnowledgeDocument[] */ ], "total": 7, "page": 1, "pageSize": 20 }
```

**Bắt buộc:** danh sách chỉ chứa tài liệu `scope = GLOBAL` hoặc thuộc đơn vị của người gọi. Bộ lọc nằm trong SQL, không lọc ở tầng ứng dụng sau khi đã lấy dữ liệu.

### `GET /documents/:id`

Trả `KnowledgeDocument` kèm `fileSize`, `mimeType`, `pageCount`, `issuedDate`, `uploadedBy`, `approvedBy`.

### `GET /documents/:id/chunks`

```jsonc
{ "items": [ /* ChunkItem[] */ ], "total": 142 }
```

### `GET /documents/:id/source-url`

```jsonc
{ "url": "https://...supabase.co/storage/v1/object/sign/...", "expiresIn": 300, "page": 8 }
```

Tham số tùy chọn `?page=8` để frontend nối `#page=8` khi mở.

Backend **kiểm tra lại phạm vi trước khi cấp URL**. Bucket để private; nếu để public thì dù SQL lọc đúng, đoán được đường dẫn là đọc được tài liệu đơn vị khác.

### `POST /documents` — EDITOR

`multipart/form-data`: `file` (PDF hoặc DOCX, tối đa 20 MB) · `title` · `code` · `issuedDate` · `scope`.

```jsonc
// 202 Accepted
{ "id": "uuid", "status": "pending", "jobId": "uuid" }
```

Lỗi: `403 FORBIDDEN_ROLE` · `403 FORBIDDEN_SCOPE` (chọn phạm vi ngoài đơn vị mình) · `409 DUPLICATE_DOCUMENT` · `422 VALIDATION_ERROR`.

### `GET /documents/:id/status`

Cho thanh tiến trình của `UploadItem`:

```jsonc
{ "status": "processing", "phase": "process", "progress": 62, "chunks": 88, "error": null }
```

`phase` nhận `"upload"` \| `"process"` \| `"done"`, khớp đúng kiểu `UploadItem` frontend đang dùng.

### Các thao tác còn lại

| Method | Đường dẫn | Vai | Ghi chú |
|---|---|---|---|
| `PATCH` | `/documents/:id` | EDITOR | Sửa `title`, `code`, `issuedDate` |
| `DELETE` | `/documents/:id` | EDITOR | Xóa mềm hay xóa cứng — xem ghi chú cuối mục |
| `POST` | `/documents` với `scope` của khoa | CONTRIBUTOR | Tạo ở trạng thái `proposed` |
| `POST` | `/documents/:id/approve` | EDITOR | Chuyển sang `approved` |
| `POST` | `/documents/:id/reject` | EDITOR | Body `{ "reason": "..." }` |

Chỉ tài liệu `approval = approved` mới tham gia truy hồi. Điều kiện này nằm trong câu SQL.

---

## 6. Truy hồi

### `POST /search`

Endpoint phục vụ gỡ lỗi và bộ đánh giá, không dùng ở giao diện chính.

```jsonc
// request
{ "query": "điều kiện tốt nghiệp", "topK": 8 }

// data
{ "items": [ /* Source[] */ ], "tookMs": 240, "vectorHits": 6, "keywordHits": 4 }
```

`vectorHits` và `keywordHits` cho thấy mỗi nhánh của tìm kiếm lai đóng góp bao nhiêu — hữu ích khi giải thích lúc bảo vệ.

Tuần 1 endpoint này trả **3 kết quả cứng** để TV3 và TV4 làm được ngay, không phải chờ truy hồi thật.

---

## 7. Quản trị

### Đơn vị

| Method | Đường dẫn | Vai |
|---|---|---|
| `GET` | `/departments` | VIEWER — trả danh sách rút gọn `{id, code, name}` |
| `GET` | `/departments/full` | ADMIN — trả `DepartmentItem[]` đầy đủ kèm số đếm |
| `POST` | `/departments` | ADMIN |
| `PATCH` | `/departments/:id` | ADMIN |

VIEWER cần `/departments` để hiển thị tên đơn vị, nhưng không được thấy số lượng tài liệu và người dùng của đơn vị khác — vì vậy tách làm hai endpoint.

### Người dùng

| Method | Đường dẫn | Vai | Ghi chú |
|---|---|---|---|
| `GET` | `/users` | EDITOR | Chỉ người dùng trong đơn vị mình; ADMIN thấy tất cả |
| `POST` | `/users` | ADMIN | Body `{ name, email, roleCode, departmentId, tempPassword }` |
| `PATCH` | `/users/:id` | ADMIN | Đổi `roleCode` hoặc `departmentId` |
| `PATCH` | `/users/:id/disable` | ADMIN | Body `{ "isActive": false }` |

### Ma trận quyền

**Không cần endpoint.** Ma trận là hằng số, đặt trong `packages/shared/src/roles.ts` để hai bên dùng chung. Màn `/admin/permissions` đọc trực tiếp từ đó.

---

## 8. Bộ đánh giá — ADMIN

| Method | Đường dẫn | Ghi chú |
|---|---|---|
| `POST` | `/eval/runs` | Body là cấu hình cắt đoạn; chạy nền, trả `runId` |
| `GET` | `/eval/runs` | Danh sách các lần chạy kèm `recallAt5`, `recallAt10`, `mrr` |
| `GET` | `/eval/runs/:id` | Chi tiết từng câu hỏi |

---

## 9. Bảng đối chiếu — frontend bỏ mock thế nào

| Mock hiện tại | Thay bằng | Ai làm |
|---|---|---|
| `mockAnswer()` | `POST /chat/stream` | TV3 |
| `sampleQuestions` | Giữ nguyên — là hằng số giao diện | — |
| `history` | `GET /conversations` | TV3 |
| `documents` | `GET /documents` | TV2 |
| `documentChunks` | `GET /documents/:id/chunks` | TV2 |
| `departments` | `GET /departments/full` | TV4 |
| `users` | `GET /users` | TV4 |
| `permissions` | Chuyển sang `packages/shared/src/roles.ts` | TV4 |
| `useAuth` với `DemoRole` | `POST /auth/login` + `GET /auth/me` | TV4 |

### Việc phải làm trước khi nối API thật

**Xóa hẳn phần chọn vai trò ở màn đăng nhập.** Hiện `useAuth.ts` có kiểu `DemoRole` cho phép người dùng tự chọn vai. Khi auth thật vào thì phải bỏ hoàn toàn, **không giữ lại như "chế độ demo"** — để client tự chọn vai là kiểm soát ở tầng giao diện, đúng thứ mà toàn bộ đề tài này phủ định. Vai và đơn vị chỉ đến từ JWT.

**Sửa `apiClient` theo mục 1** để bóc lớp vỏ `data` và giữ được mã lỗi.

**Chuyển `Source`, `KnowledgeDocument`, `ChunkItem` từ `mock-data.ts` sang `packages/shared/src/dto/`** để hai app dùng chung một định nghĩa.

---

## 10. Điểm còn treo

| # | Vấn đề | Đề xuất |
|---|---|---|
| 1 | `DELETE /documents/:id` là xóa mềm hay xóa cứng? | Xóa mềm bằng cột `deletedAt` — tài liệu hết hiệu lực vẫn cần tra lại lịch sử hội thoại cũ. Cần thêm cột vào `schema.prisma` |
| 2 | Phân trang cho `/documents` | Đã đưa `page`/`pageSize` vào contract nhưng frontend chưa có UI phân trang |
| 3 | Chuyển sang cookie `httpOnly` | Khi có tên miền chung `app.` + `api.`; hiện dùng Bearer trong `localStorage` |
| 4 | Chuẩn hóa tên endpoint | `HANDOFF.md` ghi `GET /documents/:id/source-url`, tài liệu phân tích thiết kế ghi `signed-url`. **Chốt: `source-url`**, theo frontend |
