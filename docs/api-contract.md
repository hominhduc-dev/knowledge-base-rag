# Hợp đồng API — Tàng Thư

**Bản v2.0 · viết lại 29/08/2026**

Đây là hợp đồng giữa `web/` và `server/`. Sửa file này **trước** khi sửa code hai bên.
Đây là tài liệu duy nhất mà cả bốn thành viên đều phụ thuộc: TV2, TV3 và TV4 làm song
song dựa trên nó.

Bản tóm tắt một trang nằm ở **Phụ lục A** của `docs/THIET-KE-HE-THONG.md`. File này là
bản chi tiết; khi hai bên lệch nhau thì **file này đúng**, vì nó được viết từ mã đang
chạy.

> **Trạng thái hiện thực.** Chỉ những endpoint đánh dấu ✅ là đã có thật và đã chạy thử.
> Phần còn lại là đặc tả để làm theo.

| Endpoint | Trạng thái |
|---|---|
| `GET /health` · `POST /auth/login` · `GET /auth/me` · `PUT /auth/password` | ✅ đã chạy |
| `POST /search` | ✅ bản tạm — 3 kết quả cứng |
| `/documents/*` | ⬜ TV2 |
| `POST /chat` · `/conversations/*` | ⬜ TV3 |
| `/departments/*` | ⬜ TV4 |
| `/eval/runs` | ⬜ Đức |

---

## 1. Ba quyết định về khuôn dạng

### 1.1 Tên khóa JSON dùng **camelCase**

Phụ lục A phác thảo bằng `snake_case` (`document_id`, `pending_jobs`) theo thói quen đặt
tên cột SQL. Hiện thực dùng **camelCase** cho toàn bộ JSON.

Lý do: cả hai đầu đều là TypeScript. Trộn `snake_case` vào JSON buộc frontend phải đổi
tên ở mọi chỗ chạm dữ liệu, hoặc mang theo một lớp chuyển đổi — thêm việc mà không được
gì. Ranh giới đổi tên nằm ở tầng truy cập dữ liệu: cột SQL `snake_case`, JSON `camelCase`.

Cụ thể: `pendingJobs` chứ không phải `pending_jobs`; `documentId` chứ không phải
`document_id`; `conversationId` chứ không phải `conversation_id`.

### 1.2 Mọi phản hồi đều có lớp vỏ

```jsonc
// thành công
{ "success": true, "data": { } }

// thất bại
{ "success": false, "error": { "code": "FORBIDDEN_SCOPE", "message": "Tài liệu không thuộc phạm vi của bạn" } }
```

`apiClient` phía frontend **bóc lớp vỏ này ra**, nên component chỉ thấy phần `data` và
không phải biết về khuôn dạng. Mọi ví dụ dưới đây mô tả phần `data`.

### 1.3 Trích dẫn giữ marker `[n]` trong câu trả lời

Marker `[1]` `[2]` được chèn thẳng trong văn bản trả lời, khớp với `Source.n`.

---

## 2. Quy ước chung

### Địa chỉ và xác thực

- Base URL lấy từ `NEXT_PUBLIC_API_URL`.
  - Qua Docker/Caddy: **`/api`** — đường dẫn tương đối, có chủ đích. Trình duyệt tự dùng
    đúng máy nó vừa tải trang, nên chạy đúng cho localhost, IP LAN và cả đường hầm tạm
    mà không phải build lại. Đây là cách gỡ tận gốc lỗi demo LAN phổ biến nhất.
  - Chạy `pnpm dev` trên máy: `http://localhost:4000/api`, vì giao diện ở cổng 3000 còn
    API ở 4000 — hai gốc khác nhau.
- Đường dẫn trong tài liệu này viết **không kèm** tiền tố `/api`; `apiClient` gắn sẵn.
- Mọi request sau đăng nhập gửi kèm `Authorization: Bearer <token>`.
- Token lưu ở `localStorage`, khóa `tang-thu-token`.

### Bảng mã lỗi

| Mã | HTTP | Khi nào |
|---|---|---|
| `UNAUTHENTICATED` | 401 | Thiếu token, token sai hoặc hết hạn |
| `ACCOUNT_DISABLED` | 403 | `users.is_active = false` |
| `FORBIDDEN_ROLE` | 403 | Vai không đủ quyền cho thao tác |
| `FORBIDDEN_SCOPE` | 403 | Tài nguyên thuộc đơn vị khác |
| `NOT_FOUND` | 404 | Không tồn tại, hoặc tồn tại nhưng ngoài phạm vi khi liệt kê |
| `DUPLICATE_DOCUMENT` | 409 | Trùng `fileHash` |
| `VALIDATION_ERROR` | 422 | Dữ liệu vào sai định dạng |
| `UPSTREAM_ERROR` | 503 | Lỗi từ cơ sở dữ liệu hoặc dịch vụ mô hình |
| `INTERNAL_ERROR` | 500 | Lỗi ngoài dự kiến |

Phía client `apiClient` còn sinh thêm hai mã cục bộ, **không** đến từ máy chủ:
`NETWORK_ERROR` (không kết nối được) và `INVALID_RESPONSE` (phản hồi không phải JSON,
thường là trang lỗi của reverse proxy).

**Phân biệt `FORBIDDEN_ROLE` và `FORBIDDEN_SCOPE` là có chủ đích.** Một bên là "vai của
bạn không được làm việc này", một bên là "việc này thuộc đơn vị khác". Cả hai đều là
HTTP 403, nên nếu chỉ giữ mã trạng thái thì không phân biệt được — đó là lý do `ApiError`
giữ nguyên trường `code`.

**`404` với tài nguyên ngoài phạm vi.** Khi người dùng truy cập tài liệu của đơn vị khác,
API trả `403 FORBIDDEN_SCOPE` cho tài nguyên họ *biết là tồn tại* (bấm nhầm liên kết cũ),
nhưng endpoint **liệt kê** không bao giờ trả 403 — tài liệu đơn vị khác đơn giản là
không xuất hiện. Trả 403 khi liệt kê là tiết lộ có tồn tại tài liệu đó.

### `details` của lỗi kiểm tra dữ liệu

`VALIDATION_ERROR` kèm mảng `details` để frontend tô đúng ô nhập:

```jsonc
{ "success": false, "error": {
    "code": "VALIDATION_ERROR",
    "message": "account: Vui lòng nhập tài khoản trường",
    "details": [
      { "field": "account",  "message": "Vui lòng nhập tài khoản trường" },
      { "field": "password", "message": "Vui lòng nhập mật khẩu" }
    ] } }
```

`details` **luôn được gửi, kể cả ở production** — đó là lỗi biểu mẫu của chính người
dùng, và tên trường ở đây là tên trong thân request họ vừa gửi, không phải tên cột CSDL.

---

## 3. Kiểu dữ liệu dùng chung

### `Source` — một trích dẫn

```ts
type Source = {
  n: number;            // số thứ tự, khớp marker [n] trong câu trả lời
  doc: string;          // tiêu đề tài liệu
  locator: string;      // "Điều 12, Khoản 1 · Trang 8" — backend ghép sẵn
  excerpt: string;      // đoạn trích hiển thị
  unit: string;         // "Toàn trường" hoặc tên đơn vị
  documentId: string;   // để gọi /documents/:id/file
  chunkId: string;      // phục vụ gỡ lỗi và bộ đánh giá
  headingPath: string | null;  // "Chương II > Điều 12 > Khoản 3"
  page: number | null;         // mở PDF đúng trang qua #page=N
  score: number;               // điểm truy hồi, mặc định ẩn trên giao diện
};
```

`unit` là chuỗi hiển thị: tài liệu toàn trường (`documents.departmentId = null`) trả
`"Toàn trường"`, ngược lại trả tên đơn vị.

`locator` ghép theo quy tắc: `headingPath` + `" · Trang "` + `page`. Thiếu `headingPath`
thì chỉ `"Trang N"`; thiếu cả hai thì `"Không rõ vị trí"`. Backend ghép sẵn bằng
`buildLocator()` — **đừng ghép tay ở chỗ khác**, nếu không hai nơi sẽ hiển thị khác nhau
cho cùng một đoạn văn.

> **Đổi tên so với v1:** trường `articleRef` nay là **`headingPath`**, khớp cột
> `chunks.heading_path`. Nội dung cũng khác: nay là đường dẫn cấu trúc đầy đủ, không chỉ
> số điều.

### `KnowledgeDocument` — một tài liệu trong danh sách

```ts
type DocumentStatus = "pending" | "processing" | "ready" | "failed";

type KnowledgeDocument = {
  id: string;
  name: string;               // documents.title
  unit: string;               // "Toàn trường" hoặc tên đơn vị
  status: DocumentStatus;
  chunks: number;             // số đoạn đã cắt được
  updated: string;            // ISO 8601, frontend tự format dd/MM/yyyy
  isGlobal: boolean;          // departmentId === null
  canEdit: boolean;           // backend tính sẵn
};
```

Ba điểm cần chú ý:

**`id` là định danh, không phải số hiệu văn bản.** Mọi URL dùng `id`.

**`updated` là ISO 8601.** Chuỗi `dd/MM/yyyy` không sắp xếp được và mơ hồ về múi giờ.

**`canEdit` do backend tính.** Frontend **không** tự suy "vai ADMIN thì hiện nút sửa" —
với mô hình hai vai thì ADMIN sửa được mọi tài liệu, nhưng quy tắc đó có thể đổi. Backend
biết cả vai lẫn phạm vi; frontend chỉ đọc cờ.

> **Bỏ so với v1:** `code` (số hiệu văn bản), `scope`, `approval`. Lược đồ v2 không còn
> cột `doc_number` và không còn luồng duyệt tài liệu.

### `ChunkItem`, `DepartmentItem`, `UserItem`

```ts
type ChunkItem = {
  id: string;
  locator: string;
  text: string;
  headingPath: string | null;
  pageFrom: number | null;
  pageTo: number | null;
  index: number;              // chunkIndex, thứ tự trong tài liệu
};

type DepartmentItem = {
  id: string;
  code: string;               // CNTT, KTR, PDT
  name: string;
  type: "FACULTY" | "OFFICE";
  docs: number;               // số đếm, chỉ ADMIN thấy
  members: number;
};

type UserItem = {
  id: string;
  code: string | null;        // MSSV hoặc mã cán bộ
  name: string;
  email: string;
  isActive: boolean;
  memberships: Membership[];  // MỘT người có thể thuộc NHIỀU đơn vị
};

type Membership = {
  departmentId: string;
  code: string;
  name: string;
  roleCode: "STUDENT" | "ADMIN";
};
```

**`UserItem` không có trường `role` phẳng.** Vai gắn với **từng** tư cách thành viên, nên
một người có thể là ADMIN ở phòng ban mình và STUDENT ở nơi khác. Vai hiệu dụng được gộp
lại phía máy chủ (`effectiveRole`) và chỉ xuất hiện ở `/auth/me`, chỗ nói về *chính người
đang đăng nhập*.

---

## 4. Xác thực ✅

Hệ thống **không có đăng ký**. Tài khoản do ADMIN cấp — xem `docs/phan-quyen.md` mục 2.

### `POST /auth/login` ✅

Đăng nhập bằng **mã số sinh viên hoặc email trường** — một ô nhập duy nhất.

```jsonc
// request — `account` nhận cả hai dạng
{ "account": "2351220193", "password": "..." }
{ "account": "duc_2351220193@dau.edu.vn", "password": "..." }

// data
{
  "token": "eyJhbGci...",
  "user": {
    "id": "ef995366-...", "code": "2351220193", "name": "Hồ Minh Đức",
    "email": "duc_2351220193@dau.edu.vn",
    "role": "Sinh viên", "roleCode": "STUDENT",
    "scope": "Khoa Công nghệ Thông tin"
  },
  "memberships": [
    { "departmentId": "165c73c7-...", "code": "CNTT",
      "name": "Khoa Công nghệ Thông tin", "roleCode": "STUDENT" }
  ]
}
```

> Phụ lục A chỉ ghi đăng nhập bằng email. Hiện thực nhận **cả hai** — cột `users.code` và
> logic phân biệt bằng dấu `@` đã có và chạy được.

**Cách phân biệt:** có ký tự `@` thì coi là email, ngược lại coi là mã. **Chuẩn hóa
trước khi tra:** email về chữ thường, mã về chữ hoa. Cả `users.code` lẫn chỉ mục duy nhất
trên `lower(email)` đều bảo đảm không mơ hồ.

`user.scope` là chuỗi hiển thị: ADMIN nhận `"Toàn trường"`, còn lại là tên các đơn vị nối
bằng ` · `.

Lỗi:

- `401 UNAUTHENTICATED` — sai tài khoản **hoặc** sai mật khẩu. **Thông báo giống hệt
  nhau cho cả hai trường hợp**, không tiết lộ mã hay email nào có thật. Máy chủ còn chạy
  một lần `bcrypt.compare` trên hash giả ở nhánh "không tìm thấy tài khoản", để thời gian
  phản hồi cũng không tiết lộ.
- `403 ACCOUNT_DISABLED` — kiểm **sau** khi đã xác nhận mật khẩu đúng; kiểm trước là cho
  phép dò tài khoản nào đang bị khóa mà không cần biết mật khẩu.

### `GET /auth/me` ✅

Trả `{ user, memberships }` — cùng khuôn như trên, không có `token`.

> Phụ lục A ghi `{ user, role, memberships[] }`. Bỏ `role` ở tầng ngoài vì nó đã nằm
> trong `user.roleCode`; hai chỗ giữ cùng một giá trị là hai cơ hội lệch nhau.

Dùng để khôi phục phiên khi tải lại trang. **Frontend phải gọi endpoint này thay vì tin
vào hồ sơ trong `localStorage`**: ADMIN có thể đã đổi vai hoặc vô hiệu hóa tài khoản
trong lúc người dùng đang mở tab, và tin bản lưu là giữ nguyên quyền cũ tới bảy ngày.

### `PUT /auth/password` ✅

```jsonc
{ "currentPassword": "...", "newPassword": "..." }   // → { "changed": true }
```

- `422 VALIDATION_ERROR` nếu mật khẩu mới dưới 8 ký tự, dài quá 72 byte (giới hạn bcrypt),
  hoặc trùng mật khẩu cũ.
- **Mật khẩu hiện tại sai cũng trả `422`, không phải `401`.** Người gọi đang đăng nhập
  hợp lệ, chỉ điền sai một ô; trả 401 sẽ khiến frontend đá họ ra màn đăng nhập.

---

## 5. Hỏi đáp ⬜

### `POST /chat` — Server-Sent Events

```jsonc
{ "question": "Điều kiện xét tốt nghiệp là gì?", "conversationId": null }
```

Phản hồi `Content-Type: text/event-stream`. **Bốn** loại sự kiện, theo thứ tự
`sources` → `token`* → `done`:

```
event: sources
data: {"items":[{"n":1,"doc":"Quy chế đào tạo trình độ đại học","locator":"Điều 12, Khoản 1 · Trang 8","excerpt":"Sinh viên được xét công nhận tốt nghiệp khi...","unit":"Toàn trường","documentId":"...","chunkId":"...","headingPath":"Điều 12, Khoản 1","page":8,"score":0.83}]}

event: token
data: {"text":"Sinh viên được xét tốt nghiệp khi tích lũy đủ"}

event: done
data: {"messageId":"...","conversationId":"...","latencyMs":2840}

event: error
data: {"code":"UPSTREAM_ERROR","message":"Dịch vụ mô hình tạm thời không phản hồi"}
```

**`sources` gửi TRƯỚC token đầu tiên.** Giao diện dựng panel nguồn ngay lúc đó, nên người
dùng thấy hệ thống dựa vào tài liệu nào **trước cả khi** đọc câu trả lời — chi tiết nhỏ
nhưng củng cố trực tiếp thông điệp minh bạch của sản phẩm.

> **Khác v1:** v1 dùng năm sự kiện với `citation` gửi từng cái **sau** phần chữ, và một
> sự kiện `no_source` riêng. v2 gộp mọi trích dẫn vào một sự kiện `sources` gửi **trước**,
> đúng phụ lục A.

**Trường hợp không có nguồn.** Backend gửi `sources` với mảng rỗng, rồi một `token` duy
nhất chứa câu từ chối, rồi `done`. **Không gọi mô hình sinh câu trả lời.** Đây là ràng
buộc bắt buộc — gọi mô hình khi không có ngữ cảnh thì nó trả lời bằng kiến thức chung,
đúng cái sai nguy hiểm nhất mà đề tài đặt ra để giải quyết.

**Ràng buộc marker.** Backend kiểm mọi marker `[n]` trong văn bản đều có nguồn tương ứng.
Nếu mô hình bịa `[4]` trong khi chỉ có 3 nguồn, backend **gỡ marker đó** khỏi văn bản
trước khi gửi. Prompt là gợi ý; mã nguồn là ràng buộc.

**Giới hạn.** `question` từ 3 đến 500 ký tự, ngoài khoảng trả `422`.

**Lưu ý triển khai:** Caddy phải đặt `flush_interval -1` cho `/api/*`, nếu không nó giữ
token lại và câu trả lời hiện ra một cục ở cuối thay vì chảy dần. Đã cấu hình sẵn.

### `GET /conversations` · `GET /conversations/:id` ⬜

```jsonc
// GET /conversations
{ "items": [ { "id": "...", "title": "Điều kiện nhận đồ án", "updatedAt": "2026-08-29T03:10:00Z" } ] }

// GET /conversations/:id
{ "id": "...", "title": "...",
  "messages": [
    { "id": "...", "role": "user", "content": "Điều kiện xét tốt nghiệp là gì?" },
    { "id": "...", "role": "assistant", "content": "Sinh viên được xét... [1]", "sources": [ /* Source[] */ ] }
  ] }
```

Chỉ trả hội thoại của chính người gọi. Hội thoại của người khác trả `404 NOT_FOUND`.

---

## 6. Tài liệu ⬜

### `GET /documents`

Tham số: `q` (tìm theo tên) · `scope` = `all` \| `department` \| `global` · `status` ·
`page` · `pageSize`.

```jsonc
{ "items": [ /* KnowledgeDocument[] */ ], "total": 7, "page": 1, "pageSize": 20 }
```

**Bắt buộc:** danh sách chỉ chứa tài liệu toàn trường hoặc thuộc đơn vị của người gọi.
**Bộ lọc nằm trong SQL**, lấy từ `server/src/lib/scope.ts` — không lọc ở tầng ứng dụng
sau khi đã lấy dữ liệu.

### `GET /documents/:id` · `GET /documents/:id/chunks`

```jsonc
// GET /documents/:id
{ "document": { /* KnowledgeDocument */ , "fileSize": 0, "sourceType": "PDF", "pageCount": 24 },
  "chunkCount": 6,
  "job": { "status": "DONE", "retryCount": 0, "lastError": null } }

// GET /documents/:id/chunks
{ "items": [ /* ChunkItem[] */ ], "total": 142 }
```

### `GET /documents/:id/file`

Trả **chính nội dung file**, không phải một URL.

> **Khác v1:** v1 có `/documents/:id/source-url` trả signed URL của Supabase Storage. v2
> lưu file trong volume `uploads` của Docker, nên backend kiểm phạm vi rồi **truyền thẳng
> nội dung**. Không phục vụ thư mục đó qua Caddy — làm vậy là bỏ qua toàn bộ kiểm soát,
> đoán được đường dẫn là đọc được tài liệu đơn vị khác.

Tham số tùy chọn `?page=8` để frontend nối `#page=8` khi mở.

### `POST /documents` — ADMIN

`multipart/form-data`: `file` (PDF hoặc DOCX, tối đa 20 MB) · `title` · `departmentId`
(bỏ trống nghĩa là toàn trường).

```jsonc
// 202 Accepted
{ "documentId": "...", "status": "pending", "jobId": "..." }
```

Lỗi: `403 FORBIDDEN_ROLE` · `409 DUPLICATE_DOCUMENT` (trùng `fileHash`) · `422`.

### `GET /documents/:id/status`

Cho thanh tiến trình:

```jsonc
{ "status": "processing", "phase": "process", "progress": 62, "chunks": 88, "error": null }
```

`phase` nhận `"upload"` \| `"process"` \| `"done"`.

### Các thao tác còn lại

| Method | Đường dẫn | Vai | Ghi chú |
|---|---|---|---|
| `PATCH` | `/documents/:id` | ADMIN | Sửa `title`, `departmentId` |
| `DELETE` | `/documents/:id` | ADMIN | → 204 |
| `POST` | `/documents/:id/retry` | ADMIN | → 202, đưa job `FAILED` về `PENDING` |

**Đổi `departmentId` sẽ tự động đồng bộ xuống `chunks`** nhờ trigger trong CSDL — xem
`docs/erd.md` mục 2.1. Không cần cập nhật tay.

---

## 7. Truy hồi ✅ (bản tạm)

### `POST /search`

Endpoint phục vụ gỡ lỗi và bộ đánh giá, không dùng ở giao diện chính. **Bắt buộc đăng
nhập** — phạm vi truy hồi phụ thuộc người gọi.

```jsonc
// request
{ "query": "điều kiện tốt nghiệp", "topK": 8 }

// data
{ "items": [ /* Source[] */ ], "tookMs": 240, "vectorHits": 6, "keywordHits": 4 }
```

`vectorHits` và `keywordHits` cho thấy mỗi nhánh của tìm kiếm lai đóng góp bao nhiêu —
hữu ích khi giải thích lúc bảo vệ.

> **Bản tạm hiện tại trả 3 kết quả cứng** và báo `vectorHits: 0`, `keywordHits: 0` — cố ý
> báo 0 thay vì bịa số, để lúc bảo vệ không ai nhầm đây là số đo thật. `unit` của kết quả
> thứ ba luôn là đơn vị của **chính người gọi**, không phải một tên khoa cứng: để tên
> cứng thì mọi tài khoản đều thấy tài liệu khoa khác và người kiểm thử sẽ tưởng cơ chế
> cách ly đã hỏng.

`query` từ 3 đến 500 ký tự; `topK` từ 1 đến 20.

---

## 8. Quản trị ⬜

### Đơn vị

| Method | Đường dẫn | Vai | Ghi chú |
|---|---|---|---|
| `GET` | `/departments` | STUDENT | Danh sách rút gọn `{id, code, name}` |
| `GET` | `/departments/full` | ADMIN | `DepartmentItem[]` đầy đủ kèm số đếm |
| `POST` | `/departments` | ADMIN | |
| `PATCH` | `/departments/:id` | ADMIN | |

Tách làm hai endpoint vì STUDENT cần tên đơn vị để hiển thị, nhưng **không được thấy số
lượng tài liệu và người dùng của đơn vị khác**.

### Người dùng và tư cách thành viên

| Method | Đường dẫn | Vai | Ghi chú |
|---|---|---|---|
| `GET` | `/users` | ADMIN | `UserItem[]` |
| `POST` | `/users` | ADMIN | `{ name, email, code, tempPassword }` |
| `PATCH` | `/users/:id` | ADMIN | Đổi `isActive` |
| `POST` | `/departments/:id/members` | ADMIN | `{ userId, roleCode }` → 201 |
| `DELETE` | `/departments/:id/members/:userId` | ADMIN | → 204 |

**Gán vai đi qua tư cách thành viên, không qua người dùng.** Vì một người có thể thuộc
nhiều đơn vị với vai khác nhau, "đổi vai" thật ra là sửa một dòng `department_members` —
vì vậy nó nằm dưới `/departments/:id/members` chứ không phải `PATCH /users/:id`.

**Không xóa người dùng**, chỉ đặt `isActive = false`. Xóa làm gãy khóa ngoại từ
`documents.uploadedBy` và `conversations.userId`.

### Ma trận quyền

**Không cần endpoint.** Ma trận là hằng số, đặt ở `web/src/features/admin/permissions.ts`.
Gọi API để lấy một thứ không bao giờ đổi là thêm một điểm hỏng mà không được gì.

*Khi dựng `packages/shared/` thì chuyển sang đó để hai bên dùng chung một định nghĩa.*

---

## 9. Bộ đánh giá ⬜ — ADMIN

| Method | Đường dẫn | Ghi chú |
|---|---|---|
| `POST` | `/eval/runs` | Body là cấu hình cắt đoạn và truy hồi; chạy nền, trả `{ runId }` |
| `GET` | `/eval/runs` | Danh sách kèm `recallAt5`, `recallAt10`, `mrr`, `faithfulness` |
| `GET` | `/eval/runs/:id` | Chi tiết từng câu hỏi |

Tiêu chí thành công số 4: bảng `eval_runs` phải có ít nhất **9 dòng** để so sánh.

---

## 10. Sức khỏe ✅

### `GET /health`

```jsonc
{ "status": "ok", "uptime": 1233, "pendingJobs": 0 }
```

`uptime` tính bằng giây. Endpoint này **chạm cơ sở dữ liệu** (đếm job đang chờ), nên nó
phân biệt được "tiến trình còn sống" với "còn nói chuyện được với CSDL" — bộ cân bằng tải
nhờ đó rút đúng node hỏng. Khi CSDL không tới được, trả `503 UPSTREAM_ERROR`.

---

## 11. Bảng đối chiếu — frontend bỏ mock thế nào

| Mock hiện tại | Thay bằng | Trạng thái |
|---|---|---|
| `useAuth` với `demoUsers` | `POST /auth/login` + `GET /auth/me` | ✅ **xong** |
| `permissions` | Hằng số `features/admin/permissions.ts` | ✅ **xong** |
| `mockAnswer()` | `POST /chat` | ⬜ TV3 |
| `history` | `GET /conversations` | ⬜ TV3 |
| `documents` | `GET /documents` | ⬜ TV2 |
| `documentChunks` | `GET /documents/:id/chunks` | ⬜ TV2 |
| `departments` | `GET /departments/full` | ⬜ TV4 |
| `users` | `GET /users` | ⬜ TV4 |
| `sampleQuestions` | Giữ nguyên — là hằng số giao diện | — |

---

## 12. Điểm còn treo

| # | Vấn đề | Đề xuất |
|---|---|---|
| 1 | Chưa có `packages/shared/` | Kiểu `Source`, `UserItem`, ma trận quyền đang được định nghĩa hai lần. Dựng khi bắt đầu module `documents` |
| 2 | `DELETE /documents/:id` xóa mềm hay cứng | Lược đồ v2 **không có** cột `deletedAt`. Hiện là xóa cứng, và `message_citations` dùng `ON DELETE SET NULL` nên lịch sử hội thoại vẫn hiển thị được trích dẫn — chỉ mất đường mở file |
| 3 | Phân trang cho `/documents` | Đã có `page`/`pageSize` trong contract nhưng frontend chưa có giao diện phân trang |
| 4 | Chuyển sang cookie `httpOnly` | Khi có tên miền chung; hiện dùng Bearer trong `localStorage` |
| 5 | Giới hạn tần suất `/auth/login` | Chưa có. Nên thêm trước khi demo LAN |
