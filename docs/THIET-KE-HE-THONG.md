# PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

## Xây dựng hệ thống hỏi đáp trực tuyến quá trình học tập cho sinh viên DAU

Tên sản phẩm: **Tàng Thư** · Phiên bản tài liệu 2.0
Môn học: Lập trình mạng máy tính · Nhóm 4 người · 8 tuần
Tech Lead: Hồ Minh Đức

> **Chú thích phạm vi.** "Quá trình học tập" được hiểu là các quy định, quy chế, thủ tục và hướng dẫn liên quan đến quá trình học tập. Hệ thống không truy vấn dữ liệu cá nhân của sinh viên (điểm số, tín chỉ tích lũy, học phí, lịch thi).

---

## 1. Yêu cầu

### 1.1 Chức năng

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| F1 | ADMIN upload tài liệu PDF/DOCX; hệ thống trích text, cắt đoạn, sinh vector | Bắt buộc |
| F2 | Người dùng đặt câu hỏi tiếng Việt, nhận câu trả lời có streaming | Bắt buộc |
| F3 | Mọi câu trả lời kèm trích dẫn mở được đến tài liệu và vị trí gốc | Bắt buộc |
| F4 | Truy hồi chỉ trong phạm vi đơn vị của người dùng + tài liệu toàn trường | Bắt buộc |
| F5 | Phân quyền 2 vai `STUDENT` / `ADMIN`, kết hợp phạm vi theo khoa | Bắt buộc |
| F6 | Không tìm thấy nguồn thì từ chối trả lời, không suy đoán | Bắt buộc |
| F7 | Bộ đánh giá chất lượng truy hồi với câu hỏi vàng | Bắt buộc |
| F8 | Module `netlab`: TCP server và HTTP server tự viết ở tầng socket | Bắt buộc |
| F9 | Lịch sử hội thoại theo người dùng | Nên có |
| F10 | MCP server cho phép truy vấn từ client ngoài | Tùy chọn |

### 1.2 Phi chức năng

| Thuộc tính | Mục tiêu | Cơ sở |
|---|---|---|
| Quy mô dữ liệu | 500 tài liệu · ~50.000 đoạn | Một trường trung bình, ước tính rộng |
| Người dùng đồng thời | 30 | Đồ án; demo thực tế dưới 10 |
| Độ trễ truy hồi | p95 < 300 ms | Chỉ tính bước SQL, chưa tính LLM |
| Độ trễ token đầu tiên | < 2,5 s | RTT + nhúng câu hỏi + truy hồi + LLM |
| Chất lượng truy hồi | recall@5 ≥ 0,80 | Đo trên bộ 30 câu hỏi vàng |
| Sẵn sàng | Không cam kết SLA | Một máy, chấp nhận downtime khi khởi động lại |
| Chi phí vận hành | Dưới 200.000đ/tháng | Chỉ chi phí API embedding |

Ba yêu cầu độ trễ trên được viết lại theo khuôn **Quality Attribute Scenario** ở mục 8, phục vụ chương yêu cầu phi chức năng trong báo cáo.

### 1.3 Ràng buộc

Đây là ràng buộc quyết định phần lớn thiết kế bên dưới, nên nêu trước:

- **Thời gian 8 tuần**, trong đó tuần 1 dành cho ôn tập và tuần 8 đóng băng tính năng — thực chất chỉ 6 tuần code.
- **Ba trong bốn thành viên ở mức CRUD cơ bản.** Mọi thành phần hạ tầng thêm vào đều là chi phí học tập, không chỉ chi phí vận hành.
- **Không có ngân sách hạ tầng.** Triển khai trên máy cá nhân.
- **Là đồ án môn Lập trình mạng**, nên phải có thành phần ở tầng socket và phân tích giao thức, không chỉ dùng framework.
- **Dữ liệu tĩnh.** Quy chế học vụ thay đổi vài lần mỗi năm, không phải mỗi giờ. Đây là ràng buộc *có lợi*, được khai thác triệt để ở mục 6.

---

## 2. Kiến trúc tổng thể

Trình bày theo ba khung nhìn kiến trúc: khung nhìn triển khai (2.2), khung nhìn thành phần và kết nối (2.3), khung nhìn module (2.4). Cách chia này lấy từ *Software Architecture in Practice* và mạnh hơn hẳn một sơ đồ khối đơn lẻ.

### 2.1 Mô hình client-server

Hệ thống theo mô hình client-server ba tầng:

| Tầng | Thành phần | Trách nhiệm |
|---|---|---|
| Trình bày | Next.js chạy trên trình duyệt | Hiển thị, thu nhận thao tác, nhận luồng SSE |
| Ứng dụng | Express + worker trên máy chủ | Xác thực, phân quyền, truy hồi, gọi LLM |
| Dữ liệu | PostgreSQL + pgvector | Lưu trữ, đánh chỉ mục, xếp hạng |

**Vì sao logic đặt ở server — điểm cốt lõi cần bảo vệ.** Toàn bộ cơ chế phân quyền theo khoa nằm ở server, bên trong câu SQL truy hồi. Client không bao giờ nhận được đoạn văn ngoài phạm vi của người dùng, kể cả khi có người sửa mã JavaScript trong trình duyệt hoặc gọi API trực tiếp bằng `curl`.

Nếu lọc ở client thì dữ liệu đã rời server rồi — bảo mật chỉ còn là hình thức. Đây chính là lý do mô hình client-server tồn tại: **ranh giới tin cậy**. Client là môi trường không tin được; server là nơi duy nhất áp đặt được quy tắc.

### 2.2 Khung nhìn triển khai

```
   Máy sinh viên / điện thoại              Máy chủ (máy cá nhân của nhóm)
  ┌──────────────────────────┐            ┌────────────────────────────────┐
  │  Trình duyệt             │            │  Docker Compose                │
  │  Next.js SPA             │            │  ┌──────────────────────────┐  │
  │                          │  HTTP/SSE  │  │ caddy   :80              │  │
  │  192.168.1.20            │◄──────────►│  │ web     :3000  (Next)    │  │
  └──────────────────────────┘   LAN      │  │ api     :4000  (Express) │  │
                                          │  │ db      :5432  (PG16)    │  │
   Claude Desktop (tùy chọn)              │  └──────────────────────────┘  │
  ┌──────────────────────────┐            │                                │
  │  MCP client              │◄──────────►│  netlab (chạy riêng)           │
  └──────────────────────────┘            │   tcp-server.js  :9999         │
                                          │   http-server.js :8080         │
                                          │  192.168.1.10                  │
                                          └───────────────┬────────────────┘
                                                          │ HTTPS ra Internet
                                          ┌───────────────▼────────────────┐
                                          │  API Embedding · API sinh câu  │
                                          │  trả lời (dịch vụ bên ngoài)   │
                                          └────────────────────────────────┘
```

Bốn container cho hệ thống chính, cộng module `netlab` chạy độc lập ở hai cổng riêng. Volume `uploads` gắn vào container `api`.

Điểm cần lưu ý khi cấu hình: các dịch vụ bind `0.0.0.0` chứ không phải `127.0.0.1`, và biến `NEXT_PUBLIC_API_URL` trỏ về IP LAN. Quên điều thứ hai là lỗi phổ biến nhất khi demo qua mạng nội bộ — máy khách vào được giao diện nhưng mọi lệnh gọi API đều thất bại.

### 2.3 Khung nhìn thành phần và kết nối

```
┌──────────────────────────────────────────────────────────┐
│                  API — Express 5 + TypeScript            │
│                                                          │
│  ┌────────────┐ ┌────────────┐ ┌─────────┐ ┌──────────┐  │
│  │   Auth     │ │  Documents │ │  Chat   │ │   Eval   │  │
│  │   RBAC     │ │   Ingest   │ │Retrieval│ │  Runner  │  │
│  └────────────┘ └─────┬──────┘ └────┬────┘ └────┬─────┘  │
│                       │             │           │        │
│              ┌────────▼─────────────▼───────────▼──────┐ │
│              │        Tầng truy cập dữ liệu            │ │
│              │  Prisma (CRUD) + raw SQL (tìm kiếm)     │ │
│              └────────────────┬────────────────────────┘ │
└───────────────────────────────┼──────────────────────────┘
                                │
        ┌───────────────────────▼────────────────────┐
        │          PostgreSQL 16 + pgvector          │
        │  Nghiệp vụ · Vector (HNSW) · Full-text     │
        │  (GIN) · Hàng đợi job · Dữ liệu đánh giá   │
        └────────────────────────▲───────────────────┘
                                 │
        ┌────────────────────────┴───────────────────┐
        │       Worker (cùng container API)          │
        │   Poll bảng job · parse · chunk · embed    │
        └────────────────────────────────────────────┘
```

### 2.4 Khung nhìn module

```
server/src/
├── modules/
│   ├── auth/          ← Thành viên 4
│   ├── documents/     ← Thành viên 2
│   ├── chat/          ← Đức
│   ├── retrieval/     ← Đức  (lõi hệ thống)
│   └── eval/          ← Đức
├── worker/            ← Thành viên 2
├── netlab/            ← Đức  (module môn Lập trình mạng)
│   ├── tcp-server.js
│   ├── tcp-client.js
│   └── http-server.js
└── shared/            ← dùng chung, chỉ Tech Lead sửa
```

Quy tắc: module không import chéo lẫn nhau, chỉ import từ `shared/`. Ranh giới này giúp bốn người làm song song không giẫm chân, và nếu sau này cần tách dịch vụ thì đường cắt đã có sẵn.

### 2.5 Vì sao là monolith

Với 4 người và 6 tuần code, mỗi ranh giới dịch vụ là một hợp đồng phải bảo trì, một điểm hỏng, một bộ log riêng. Kiến trúc phân tán chỉ trả lại giá trị khi có nhiều đội độc lập hoặc yêu cầu mở rộng khác nhau theo thành phần — dự án này không có cả hai.

### 2.6 Luồng dữ liệu

**Nạp tài liệu (bất đồng bộ)**

```
ADMIN upload
   → API lưu file vào volume, tính SHA-256
   → Trùng hash? → trả về tài liệu cũ, DỪNG
   → Ghi documents (status = PENDING) + đẩy job vào bảng jobs
   → Trả 202 kèm document_id
        ⋮
   Worker poll (2s/lần, SKIP LOCKED)
   → Trích text theo trang (unpdf / mammoth)
   → Cắt đoạn theo cấu trúc Điều/Khoản
   → Với từng đoạn: kiểm tra cache theo content_hash
        ├─ trúng → sao chép vector sẵn có
        └─ trượt → gọi API embedding theo lô 64 đoạn
   → Ghi chunks + chunk_embeddings trong một transaction
   → Cập nhật status = READY (hoặc FAILED kèm lỗi)
```

**Hỏi đáp (đồng bộ, có streaming)**

```
Người dùng gửi câu hỏi
   → Xác thực JWT → lấy danh sách department_id được phép
   → Nhúng câu hỏi (1 lệnh gọi API, ~80 ms)
   → MỘT câu SQL: lọc phạm vi → tìm kiếm lai → top-10
   → Không kết quả nào vượt ngưỡng? → trả lời từ chối, DỪNG
   → Gửi sự kiện SSE `sources` (panel nguồn dựng trước)
   → Dựng prompt kèm các đoạn có đánh số
   → Stream token về client qua SSE
   → Lưu messages + message_citations
```

Bước lọc phạm vi nằm **bên trong** câu SQL truy hồi, không phải một bước riêng trước hoặc sau. Lý do ở mục 4.2.

---

## 3. Mô hình dữ liệu

### 3.1 Sơ đồ quan hệ

```
departments ──┬─< department_members >── users
              │                            │
              └─< documents ──< chunks ────┼──< conversations
                     │            │        │        │
                 ingest_jobs      │        │     messages
                                  │        │        │
                        chunk_embeddings   │  message_citations
                                           │        │
                          eval_gold_chunks ┘        │
                                  │                 │
                     eval_questions ── eval_sets    │
                            │                       │
                      eval_results ── eval_runs ────┘
```

### 3.2 Bảng cốt lõi

```sql
CREATE TYPE member_role AS ENUM ('STUDENT', 'ADMIN');
CREATE TYPE dept_type   AS ENUM ('FACULTY', 'OFFICE');
CREATE TYPE doc_status  AS ENUM ('PENDING','PROCESSING','READY','FAILED');

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name     text NOT NULL,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE departments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        varchar(20) UNIQUE NOT NULL,   -- 'CNTT', 'KTRUC'
  name        text NOT NULL,
  type        dept_type NOT NULL,
  parent_id   uuid REFERENCES departments(id),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE department_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  role          member_role NOT NULL,
  UNIQUE (user_id, department_id)
);

CREATE TABLE documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  department_id uuid REFERENCES departments(id),  -- NULL = toàn trường
  visibility    smallint NOT NULL DEFAULT 1,      -- dự phòng mở rộng
  source_type   text NOT NULL,                    -- PDF | DOCX
  file_path     text NOT NULL,
  file_hash     char(64) UNIQUE NOT NULL,
  page_count    int,
  status        doc_status NOT NULL DEFAULT 'PENDING',
  uploaded_by   uuid NOT NULL REFERENCES users(id),
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE chunks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index   int NOT NULL,
  content       text NOT NULL,
  content_hash  char(64) NOT NULL,
  content_tsv   tsvector GENERATED ALWAYS AS
                  (to_tsvector('simple', content)) STORED,
  heading_path  text,          -- 'Chương II > Điều 12 > Khoản 3'
  page_from     int,
  page_to       int,
  token_count   int,
  -- Lặp lại có chủ đích từ documents, xem mục 4.2
  department_id uuid,
  visibility    smallint NOT NULL,
  UNIQUE (document_id, chunk_index)
);

CREATE TABLE chunk_embeddings (
  id         bigserial PRIMARY KEY,
  chunk_id   uuid NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  embedding  vector(768) NOT NULL,
  model      varchar(64) NOT NULL,
  UNIQUE (chunk_id, model)
);
```

### 3.3 Bốn quyết định về mô hình dữ liệu

**Chỉ hai vai, phạm vi tách khỏi vai trò.** `member_role` chỉ có `STUDENT` và `ADMIN`. Điều quan trọng: quyền *thấy tài liệu nào* không suy ra từ vai trò mà từ quan hệ trong `department_members`. Sinh viên khoa CNTT và sinh viên khoa Kiến trúc cùng vai `STUDENT` nhưng nhận hai tập kết quả khác nhau.

Vai trò quyết định *làm được gì* (upload, quản lý người dùng); đơn vị quyết định *thấy được gì*. Tách hai trục này giúp thêm vai mới sau này không phải sửa câu truy vấn truy hồi.

**Tách `chunk_embeddings` khỏi `chunks`.** Cho phép giữ nhiều vector của cùng một đoạn từ các model khác nhau. Khi bộ đánh giá cần so hai model embedding, ta thêm hàng mới thay vì xoá và nạp lại toàn bộ. Chi phí là một phép JOIN trong câu truy vấn nóng — chấp nhận được vì JOIN theo khoá chính.

**Lặp `department_id` và `visibility` xuống `chunks`.** Vi phạm chuẩn hoá 3NF một cách có ý thức. Phân tích đầy đủ ở mục 4.2. Nguy cơ dữ liệu lệch được chặn bằng trigger đồng bộ khi `documents.department_id` đổi — thao tác hiếm, chi phí không đáng kể.

**`content_tsv` là cột sinh tự động.** Postgres tự cập nhật, không cần trigger, không thể quên đồng bộ.

Cột `visibility` giữ lại dù hiện chỉ dùng một giá trị — bỏ đi thì mở rộng sau phải migrate, giữ lại chi phí bằng không.

### 3.4 Chỉ mục

```sql
CREATE INDEX idx_emb_hnsw ON chunk_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_chunks_tsv   ON chunks USING gin (content_tsv);
CREATE INDEX idx_chunks_scope ON chunks (department_id, visibility);
CREATE INDEX idx_chunks_hash  ON chunks (content_hash);
CREATE INDEX idx_msg_conv     ON messages (conversation_id, created_at);
```

Ở quy mô 50.000 đoạn, HNSW với `m = 16` cho recall xấp xỉ 0,95 so với tìm kiếm vét cạn, độ trễ dưới 20 ms. Không cần chỉnh thêm.

---

## 4. Đi sâu: truy hồi

Đây là phần lõi và là nơi tập trung giá trị kỹ thuật của đồ án.

### 4.1 Câu truy vấn lai

```sql
WITH scoped AS (
  SELECT c.id, c.content, c.heading_path, c.document_id,
         c.page_from, c.content_tsv, e.embedding
  FROM chunks c
  JOIN chunk_embeddings e
    ON e.chunk_id = c.id AND e.model = $model
  WHERE (c.department_id = ANY($dept_ids) OR c.department_id IS NULL)
    AND c.visibility <= $max_visibility
),
ranked AS (
  SELECT id, content, heading_path, document_id, page_from,
         1 - (embedding <=> $query_vec)                       AS vec_score,
         ts_rank(content_tsv, plainto_tsquery('simple', $q))  AS bm25_score
  FROM scoped
)
SELECT *,
       $alpha * vec_score + (1 - $alpha) * bm25_score AS score
FROM ranked
WHERE $alpha * vec_score + (1 - $alpha) * bm25_score > $threshold
ORDER BY score DESC
LIMIT $k;
```

Tham số mặc định: `alpha = 0.6`, `threshold = 0.35`, `k = 10`. Cả ba là biến số của bộ đánh giá ở mục 7 — không chọn bằng cảm tính.

### 4.2 Phân tích: vì sao lọc phạm vi phải nằm trong truy vấn

Ba phương án đã cân nhắc:

**Phương án A — lọc sau khi truy hồi.** Lấy top-10 toàn cục rồi bỏ các đoạn ngoài phạm vi ở tầng ứng dụng.
*Hỏng.* Nếu một khoa lớn chiếm phần lớn tài liệu, top-10 toàn cục có thể không chứa đoạn nào thuộc khoa của người hỏi. Kết quả: câu trả lời rỗng dù dữ liệu có tồn tại. Đây là lỗi im lặng, khó phát hiện khi test thủ công.

**Phương án B — JOIN sang `documents` để lọc.** Giữ chuẩn hoá, lọc qua bảng cha.
*Kém.* Bộ lập kế hoạch của Postgres phải chọn giữa quét chỉ mục HNSW rồi lọc, hoặc lọc rồi quét tuần tự. Với bộ lọc chọn lọc cao (một khoa chiếm 10% dữ liệu), nó thường chọn phương án sai, và độ trễ dao động mạnh theo phân bố dữ liệu.

**Phương án C — lặp cột lọc xuống `chunks` (đã chọn).** Bộ lọc nằm cùng bảng với dữ liệu được xếp hạng, cho phép Postgres lọc trước rồi mới xếp hạng trên tập nhỏ. Độ trễ ổn định, không phụ thuộc phân bố.

*Đánh đổi:* mất chuẩn hoá, cần trigger đồng bộ khi tài liệu chuyển khoa. Với tần suất thao tác đó (vài lần mỗi năm), đây là cái giá rẻ.

**Quy tắc phạm vi:**

| Vai | Tập `department_id` truy cập được |
|---|---|
| `STUDENT` | Khoa của mình **hoặc** `NULL` (tài liệu toàn trường) |
| `ADMIN` | Tất cả |

**Kiểm chứng bắt buộc.** Một kiểm thử tích hợp phải chứng minh: người dùng chỉ thuộc khoa A, với mọi câu hỏi trong bộ đánh giá, không bao giờ nhận được `chunk` có `department_id` bằng B. Kiểm thử này là bằng chứng chính khi bảo vệ và là điều kiện chặn merge trong CI.

**Kịch bản demo tương ứng.** Nạp ba tài liệu: quy chế đào tạo (toàn trường), quy định đồ án tốt nghiệp khoa CNTT, quy định đồ án tốt nghiệp khoa Kiến trúc. Hỏi cùng một câu *"Quy định về đồ án tốt nghiệp?"* bằng hai tài khoản sinh viên thuộc hai khoa — hai bộ nguồn trả về khác nhau. Cùng câu hỏi, cùng hệ thống, kết quả khác nhau: hội đồng thấy cơ chế hoạt động mà không cần giải thích thêm.

### 4.3 Vì sao cần tìm kiếm lai

Embedding nắm ngữ nghĩa nhưng trượt các chuỗi ký tự chính xác. Ba loại truy vấn thất bại nếu chỉ dùng vector:

| Truy vấn | Vấn đề với vector thuần |
|---|---|
| "Quyết định 1234/QĐ-ĐHKT quy định gì?" | Số hiệu văn bản không mang ngữ nghĩa; các quyết định khác nhau có vector gần như nhau |
| "Điều 15 nói gì?" | Tham chiếu vị trí, không phải nội dung |
| "Học phần GDTC1 có bắt buộc không?" | Mã học phần là chuỗi tùy ý |

BM25 qua `ts_rank` xử lý đúng ba trường hợp này. Dùng cấu hình `'simple'` thay vì `'english'` vì bộ stemmer tiếng Anh làm hỏng từ tiếng Việt; `'simple'` chỉ tách token và hạ chữ thường, đủ dùng.

*Hạn chế đã biết:* `'simple'` không chuẩn hoá dấu, nên "học phí" và "hoc phi" không khớp nhau. Ghi nhận là giới hạn, không xử lý trong phạm vi 8 tuần.

### 4.4 Chiến lược cắt đoạn

Văn bản quy chế có cấu trúc phân cấp rõ: Chương → Điều → Khoản. Cắt cứng theo số ký tự làm đứt giữa một khoản, khiến đoạn mất ngữ cảnh và trích dẫn chỉ sai vị trí.

Thuật toán:

1. Nhận diện ranh giới bằng biểu thức chính quy: `^(Chương|Điều|Khoản)\s+[IVXLC\d]+`
2. Mỗi Điều là một đơn vị cơ sở
3. Điều dài quá 800 token → cắt tiếp theo Khoản
4. Khoản vẫn quá dài → cắt theo câu, chồng lấn 100 token
5. Ghi `heading_path` đầy đủ cho mọi đoạn, phục vụ trích dẫn

Tài liệu không có cấu trúc (sổ tay, hướng dẫn) rơi về cắt theo tiêu đề markdown, rồi theo đoạn văn.

### 4.5 Ràng buộc trích dẫn

Prompt gửi LLM đánh số các đoạn và yêu cầu chèn `[n]` sau mỗi mệnh đề. Sau khi nhận đủ phản hồi, hệ thống trích các chỉ số, đối chiếu với danh sách đoạn đã gửi, và:

- Chỉ số không tồn tại → loại bỏ khỏi câu trả lời, ghi log
- Câu trả lời không có chỉ số nào → thay bằng thông điệp từ chối

Đây là kiểm tra ở tầng ứng dụng, không phụ thuộc vào việc LLM có tuân thủ prompt hay không. **Prompt là gợi ý; mã nguồn là ràng buộc.**

---

## 5. Đi sâu: tầng mạng

Phần này đáp ứng yêu cầu riêng của môn Lập trình mạng.

### 5.1 Module `netlab`

Ba chương trình viết thuần bằng module `net` của Node, đặt tại `server/src/netlab/`, chạy độc lập với hệ thống chính.

**`tcp-server.js` — TCP echo server (cổng 9999).** Đối chiếu trực tiếp với vòng đời socket trong giáo trình:

| Giáo trình (C#) | Node.js (`net`) |
|---|---|
| `new Socket(...)` | `net.createServer()` |
| `Bind(ipep)` + `Listen(10)` | `server.listen(port, host)` |
| `Accept()` | sự kiện `connection` |
| `Receive(data)` | sự kiện `data` |
| `Send(bytes)` | `socket.write()` |
| `Shutdown()` / `Close()` | `socket.end()` |

Khác biệt cần nêu rõ: C# gọi `Accept()` là hàm **chặn** — luồng dừng lại chờ client, muốn phục vụ nhiều client phải tạo thread cho mỗi kết nối, mỗi thread tốn khoảng 1 MB stack. Node dùng vòng lặp sự kiện, một luồng phục vụ hàng nghìn kết nối. Đánh đổi: tác vụ nặng CPU chặn toàn bộ vòng lặp — đây chính là lý do worker xử lý PDF được tách khỏi đường truy vấn ở mục 2.3.

**`http-server.js` — HTTP server tự viết trên TCP socket (cổng 8080).** Không dùng module `http` của Node, không dùng Express. Tự thực hiện:

1. Tách phần header khỏi body tại dãy `\r\n\r\n`
2. Parse request line (`METHOD SP TARGET SP VERSION`) và các dòng header
3. Đọc `Content-Length` để biết body dài bao nhiêu
4. Dựng response: status line, headers, dòng trống, body
5. Xử lý `Connection: keep-alive` và timeout

### 5.2 Vấn đề message framing

**TCP là luồng byte, không phải luồng thông điệp.** Một lần `write()` bên gửi không tương ứng một lần sự kiện `data` bên nhận. Dữ liệu có thể bị chia nhỏ hoặc dính vào nhau tùy MTU, độ trễ mạng và bộ đệm hệ điều hành.

Hệ quả: gọi `Receive()` đúng một lần rồi coi như đã nhận đủ là **sai**, dù trên localhost với thông điệp ngắn thì vẫn "chạy được". Đây là lỗi phổ biến nhất trong bài tập lập trình mạng.

Hai cách giải quyết:

- **Delimiter** — phân tách bằng ký tự đặc biệt. `tcp-server.js` dùng `\n`.
- **Length-prefix** — ghi trước độ dài phần thân.

HTTP dùng **cả hai**: `\r\n\r\n` phân tách header khỏi body (delimiter), rồi `Content-Length` cho biết body dài bao nhiêu (length-prefix). Nhận ra điều này là hiểu được vì sao giao thức được thiết kế như vậy.

**Kết quả kiểm chứng.** Đã test bằng cách gửi một request thành ba lần `write()` riêng biệt, cắt ngay giữa tên header (`Content-Len` / `gth: 26`) và giữa JSON body (`{"quest` / `ion":"..."}`). Server tích lũy buffer và xử lý đúng khi đủ dữ liệu, trả về 200.

### 5.3 `Content-Length` tính bằng byte

Ký tự tiếng Việt có dấu chiếm 2–3 byte trong UTF-8. Dùng `string.length` sẽ ra số nhỏ hơn thực tế, trình duyệt cắt mất phần cuối response hoặc treo chờ dữ liệu không bao giờ đến.

Trong `http-server.js`, `Content-Length` lấy từ `Buffer.byteLength()`. Đây là lỗi đặc thù của lập trình viên Việt Nam khi tự viết HTTP server, đáng nêu trong báo cáo.

### 5.4 Vì sao chọn SSE cho streaming

| Cơ chế | Chiều | Chi phí | Phù hợp |
|---|---|---|---|
| Long-polling | Hai chiều giả lập | Mỗi lần một RTT + bắt tay lại | Không — lãng phí |
| WebSocket | Hai chiều thật | Cần nâng cấp giao thức qua `Upgrade` | Thừa — ta chỉ cần một chiều |
| **SSE** | Một chiều (server → client) | Chạy trên HTTP thường, tự kết nối lại | **Chọn** |

Câu trả lời chảy từ server về client, client không gửi gì trong lúc đó — đúng mô hình một chiều. SSE không cần nâng cấp giao thức nên đi qua proxy và tường lửa dễ hơn WebSocket.

Ghi chú tài liệu: SSE không thuộc RFC nào, nó nằm trong đặc tả HTML của WHATWG. Còn HTTP thì dùng **RFC 9110** (Semantics) và **RFC 9112** (HTTP/1.1) — RFC 2616 đã bị thay thế từ 2014, trích trong báo cáo mới là lỗi dễ bị bắt.

Chi tiết triển khai: sự kiện `sources` được gửi **trước** token đầu tiên. Giao diện dựng panel nguồn ngay lúc đó, nên người dùng thấy hệ thống dựa vào tài liệu nào trước cả khi đọc câu trả lời — chi tiết nhỏ nhưng củng cố trực tiếp thông điệp minh bạch của sản phẩm.

### 5.5 Ba thí nghiệm đo đạc

**Bắt gói bằng Wireshark.** Lọc `tcp.port == 8080`, chạy một request hoàn chỉnh, chụp lại: bắt tay ba bước (SYN, SYN-ACK, ACK), gói PSH mang request, gói mang response, FIN đóng kết nối.

**Ngân sách độ trễ.** Chia thời gian từ lúc gửi câu hỏi đến token đầu tiên:

| Chặng | Ước tính | Cách đo |
|---|---|---|
| RTT mạng LAN | < 5 ms | Wireshark, chênh lệch timestamp |
| Nhúng câu hỏi | ~80 ms | Log ứng dụng |
| Truy vấn SQL lai | < 300 ms (p95) | `EXPLAIN ANALYZE` + log |
| Gọi LLM đến token đầu | 1–2 s | Log ứng dụng |

Vẽ biểu đồ cột chồng để thấy chặng nào chiếm tỉ trọng lớn nhất. Kết luận dự kiến: với thông điệp nhỏ, **độ trễ vòng chi phối chứ không phải băng thông** — và ở đây phần lớn thời gian nằm ở dịch vụ ngoài, không phải ở hệ thống của nhóm.

**Thí nghiệm tải.** Dùng `autocannon` bắn 1, 5, 10, 20 kết nối đồng thời vào `/api/health`, vẽ đường độ trễ theo mức đồng thời, tìm điểm bão hòa. So thêm kết quả giữa `http-server.js` tự viết và Express trên cùng endpoint — chênh lệch cho thấy chi phí của lớp trừu tượng.

Thí nghiệm này nối thẳng với nhược điểm cố hữu của mô hình client-server (dễ tắc nghẽn khi tải tăng), nhưng chứng minh bằng số của chính hệ thống mình.

---

## 6. Đi sâu: nạp tài liệu

### 6.1 Hàng đợi trong Postgres

Không dùng Redis. Bảng job với `SELECT ... FOR UPDATE SKIP LOCKED`:

```sql
UPDATE ingest_jobs
SET status = 'PROCESSING', started_at = now()
WHERE id = (
  SELECT id FROM ingest_jobs
  WHERE status = 'PENDING' AND retry_count < 3
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING *;
```

*Đánh đổi:* thông lượng thấp hơn Redis rõ rệt, và poll mỗi 2 giây tạo tải nền không cần thiết. Nhưng khối lượng thực tế là vài chục tài liệu mỗi học kỳ. Đổi lại: bớt một container, bớt một công nghệ cả nhóm phải học, và trạng thái job nằm cùng transaction với dữ liệu nghiệp vụ.

Đây là ví dụ rõ nhất của nguyên tắc chọn công nghệ trong dự án: **tối ưu cho chi phí nhận thức của nhóm, không cho thông lượng lý thuyết.**

### 6.2 Chiến lược cache embedding

Hai tầng khử trùng lặp:

**Tầng tài liệu** — `documents.file_hash` unique. Upload lại đúng file đó thì trả về bản ghi cũ, không xử lý gì.

**Tầng đoạn** — trước khi gọi API, tra `content_hash` trong các đoạn đã có vector. Trúng thì sao chép vector, không gọi API.

Tầng thứ hai có giá trị thật vì tài liệu học vụ thường được ban hành lại với vài điều sửa đổi: phiên bản 2026 của quy chế trùng phần lớn nội dung với 2025. Ước tính tiết kiệm 60–80% lệnh gọi API ở các lần cập nhật.

### 6.3 Xử lý lỗi

| Tình huống | Cách xử lý |
|---|---|
| PDF là ảnh scan, không có text | `FAILED` kèm thông báo rõ; loại từ khâu thu thập |
| API embedding trả 429 | Lùi theo cấp số nhân, 3 lần, có nhiễu ngẫu nhiên |
| API embedding lỗi sau 3 lần | `FAILED`, giữ nguyên các đoạn đã có, ADMIN bấm thử lại |
| Worker chết giữa chừng | Job `PROCESSING` quá 10 phút được đưa về `PENDING` |
| Ghi một phần | Toàn bộ ghi `chunks` + `chunk_embeddings` trong một transaction |

---

## 7. Đi sâu: bộ đánh giá

Đây là thành phần tách biệt dự án khỏi một bài tập gọi API.

### 7.1 Cơ chế

Bộ 30 câu hỏi vàng, mỗi câu gắn với các đoạn *đáng lẽ phải* được truy hồi (`eval_gold_chunks`). Một lần chạy đánh giá lặp qua toàn bộ câu hỏi với một cấu hình, ghi kết quả vào `eval_runs` và `eval_results`.

```sql
CREATE TABLE eval_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_set_id     uuid NOT NULL REFERENCES eval_sets(id),
  config          jsonb NOT NULL,
  recall_at_k     numeric(4,3),
  mrr             numeric(4,3),
  faithfulness    numeric(4,3),
  avg_latency_ms  int,
  created_at      timestamptz DEFAULT now()
);
```

Cấu hình lưu dạng `jsonb` để đổi tham số không cần migration:
`{"chunk_size": 800, "overlap": 100, "alpha": 0.6, "top_k": 10, "model": "..."}`

### 7.2 Chỉ số

**recall@k** — tỉ lệ câu hỏi có ít nhất một đoạn vàng nằm trong top-k. Chỉ số chính, mục tiêu ≥ 0,80 tại k = 5.

**MRR** — nghịch đảo thứ hạng của đoạn vàng đầu tiên. Đo chất lượng xếp hạng, không chỉ đo có tìm thấy hay không.

**Độ trung thực** — tỉ lệ mệnh đề trong câu trả lời có trích dẫn hợp lệ. Chấm bằng LLM với prompt riêng, đối chiếu thủ công 10 mẫu để hiệu chuẩn.

### 7.3 Chín thí nghiệm bắt buộc

| Thí nghiệm | Biến | Số lần chạy |
|---|---|---|
| Kích thước đoạn | 400 / 800 / 1200 token | 3 |
| Trọng số lai | alpha = 0 / 0,6 / 1,0 | 3 |
| Số đoạn lấy về | k = 3 / 5 / 10 | 3 |

Khoảng 2 giờ máy. Kết quả là bảng số liệu đưa thẳng vào báo cáo và là câu trả lời sẵn cho câu hỏi *"vì sao em chọn tham số này?"*.

Thí nghiệm alpha đáng giá nhất: `alpha = 1,0` là vector thuần, `alpha = 0` là BM25 thuần. Nếu 0,6 thắng cả hai, đó là **bằng chứng định lượng cho lựa chọn kiến trúc ở mục 4.3** — mạnh hơn mọi lập luận.

---

## 8. Yêu cầu phi chức năng theo khuôn Quality Attribute Scenario

Ba yêu cầu quan trọng nhất viết lại theo khuôn 6 phần (nguồn kích thích, kích thích, thành phần, môi trường, phản hồi, thước đo):

**QAS-1 — Bảo mật, cách ly phạm vi**
Một *sinh viên đã xác thực thuộc khoa CNTT* (nguồn) *gửi câu hỏi bất kỳ* (kích thích) tới *dịch vụ truy hồi* (thành phần) trong *chế độ vận hành bình thường* (môi trường). Hệ thống *chỉ trả về các đoạn thuộc khoa CNTT hoặc phạm vi toàn trường* (phản hồi), với *tỉ lệ rò rỉ bằng 0 trên toàn bộ bộ 30 câu hỏi vàng, kiểm chứng tự động trong CI* (thước đo).

**QAS-2 — Hiệu năng, độ trễ truy hồi**
*Người dùng* (nguồn) *gửi một câu hỏi* (kích thích) tới *dịch vụ truy hồi* (thành phần) khi *cơ sở dữ liệu chứa 50.000 đoạn và có 10 người dùng đồng thời* (môi trường). Hệ thống *hoàn tất bước truy vấn SQL lai* (phản hồi) *trong dưới 300 ms ở phân vị 95* (thước đo).

**QAS-3 — Tính đúng đắn, ràng buộc trích dẫn**
*Người dùng* (nguồn) *đặt câu hỏi không có đáp án trong kho tài liệu* (kích thích) tới *dịch vụ hỏi đáp* (thành phần) trong *vận hành bình thường* (môi trường). Hệ thống *trả về thông điệp từ chối thay vì suy đoán* (phản hồi), *đúng trong 100% trường hợp thử với 10 câu hỏi ngoài phạm vi* (thước đo).

Khuôn này biến các con số ở mục 1.2 thành yêu cầu kiểm chứng được, và là cách trình bày chuẩn trong tài liệu kiến trúc phần mềm.

---

## 9. Quy mô và độ tin cậy

### 9.1 Ước tính tải

| Đại lượng | Ước tính |
|---|---|
| Tài liệu | 500 |
| Đoạn (trung bình 100 đoạn/tài liệu) | 50.000 |
| Kích thước vector (768 chiều × 4 byte) | ~150 MB |
| Chỉ mục HNSW | ~250 MB |
| Toàn bộ CSDL | dưới 2 GB |
| Truy vấn cao điểm | 5 QPS |

Toàn bộ tập vector nằm gọn trong RAM của một máy 8 GB. Không cần phân mảnh, không cần bản sao đọc, không cần cache tầng riêng.

### 9.2 Điểm hỏng đơn lẻ

Hệ thống có nhiều điểm hỏng đơn lẻ và **đây là lựa chọn có ý thức**, không phải sơ suất. Một máy, một CSDL, không failover. Với đồ án môn học, chi phí của downtime bằng không, còn chi phí của độ phức tạp dự phòng là rất thật: thời gian của một nhóm chỉ có 6 tuần code.

Điều cần làm là **thừa nhận rõ ràng trong báo cáo**, kèm mô tả đường nâng cấp — điều này thể hiện hiểu biết tốt hơn nhiều so với việc dựng hạ tầng dự phòng không ai dùng.

### 9.3 Sao lưu

`pg_dump` hàng ngày qua cron, giữ 7 bản. Volume `uploads` sao lưu hàng tuần. Quan trọng hơn: **diễn tập phục hồi một lần ở tuần 7** — bản sao lưu chưa từng được phục hồi thì chưa phải bản sao lưu.

### 9.4 Giám sát

Ba thứ, không hơn:

- **Log có cấu trúc** (pino) — mọi truy vấn ghi lại `dept_ids`, số đoạn trả về, độ trễ từng chặng. Đây cũng là dữ liệu cho ngân sách độ trễ ở mục 5.5.
- **Endpoint `/health`** — kiểm tra kết nối CSDL và số job đang chờ.
- **Cảnh báo thủ công** — số job `FAILED` hiển thị trên bảng điều khiển ADMIN.

Không dựng Prometheus/Grafana. Với 30 người dùng, đó là hạ tầng nhiều hơn ứng dụng.

---

## 10. Tổng hợp đánh đổi

| Quyết định | Được | Mất | Xem lại khi nào |
|---|---|---|---|
| Monolith module hóa | Ít điểm hỏng, triển khai đơn giản, phù hợp năng lực nhóm | Không mở rộng độc lập theo thành phần | Có nhiều đội cùng làm |
| Postgres làm cả vector + full-text + hàng đợi | Một hệ CSDL, một transaction, một bản sao lưu | Thông lượng hàng đợi thấp; pgvector chậm hơn CSDL vector chuyên dụng ở quy mô lớn | Vượt 1 triệu đoạn |
| Lặp cột phạm vi xuống `chunks` | Độ trễ ổn định, lọc trước khi xếp hạng | Mất chuẩn hoá, cần trigger đồng bộ | Không — quyết định này bền |
| Chỉ 2 vai trò | Giảm khối lượng CRUD, dồn thời gian cho phần lõi | Không mô hình hóa được giáo vụ khoa | Triển khai thật cho trường |
| Không dùng LangChain | Kiểm soát hoàn toàn tầng SQL, giải thích được từng dòng | Tự viết cắt đoạn, thử lại, dựng prompt (~200 dòng) | Cần agent nhiều bước |
| Embedding qua API ngoài | Không cần GPU, chất lượng tiếng Việt tốt | Phụ thuộc mạng, phát sinh chi phí, dữ liệu rời hệ thống | Có yêu cầu dữ liệu không rời trường |
| Triển khai máy cá nhân | Chi phí bằng không, kiểm soát hoàn toàn | Không chịu lỗi, phụ thuộc mạng phòng học | Có người dùng thật phụ thuộc |
| Hàng đợi trong Postgres | Bớt một hạ tầng phải học | Thông lượng thấp, poll tạo tải nền | Xử lý hàng nghìn tài liệu/ngày |
| SSE thay vì WebSocket | Đơn giản, đi qua proxy dễ, tự kết nối lại | Chỉ một chiều | Cần client gửi dữ liệu liên tục |

---

## 11. Điều sẽ xem lại khi hệ thống lớn lên

Phần này trả lời câu hỏi hội đồng hay hỏi nhất: *"nếu triển khai thật cho cả trường thì sao?"*

**Ở mức 200.000 đoạn.** Chỉ mục HNSW bắt đầu chiếm bộ nhớ đáng kể. Cân nhắc `ivfflat` với phân cụm theo khoa, hoặc phân vùng bảng `chunks` theo `department_id` — phân vùng biến bộ lọc phạm vi thành phép cắt tỉa phân vùng, nhanh hơn nữa.

**Ở mức 100 người dùng đồng thời.** Tách worker nạp tài liệu thành tiến trình riêng để việc xử lý PDF nặng không tranh CPU với đường truy vấn. Đây là đường cắt đầu tiên, và mã nguồn đã sẵn sàng vì worker vốn là module độc lập.

**Khi chất lượng truy hồi chạm trần.** Thêm bước xếp hạng lại bằng mô hình cross-encoder trên top-50. Cải thiện rõ nhưng thêm 200–400 ms; chỉ đáng làm khi bộ đánh giá cho thấy tìm kiếm lai đã hết dư địa.

**Khi cần dữ liệu không rời trường.** Thay API embedding bằng mô hình tự vận hành. Thiết kế đã lường trước: `chunk_embeddings` có cột `model` và ràng buộc `UNIQUE(chunk_id, model)`, nên có thể nạp song song vector của model mới rồi chuyển đổi bằng một tham số, không downtime.

**Khi cần thêm vai trò.** Vì phạm vi tách khỏi vai trò (mục 3.3), thêm `LECTURER` hay `FACULTY_STAFF` chỉ là thêm giá trị enum và quy tắc quyền hạn — câu truy vấn truy hồi không phải sửa.

---

## 12. Rủi ro kỹ thuật

| Rủi ro | Khả năng | Tác động | Giảm thiểu |
|---|---|---|---|
| Thành viên bị chặn vì chờ API truy hồi | Cao | Cao | API giả lập hoàn thành trong tuần 1 — hạng mục ưu tiên số một |
| Cắt đoạn theo cấu trúc thất bại vì PDF lộn xộn | Cao | Trung bình | Có đường lùi về cắt theo đoạn văn; kiểm tra tập tài liệu ngay tuần 1 |
| Chất lượng embedding tiếng Việt kém hơn kỳ vọng | Trung bình | Cao | Tìm kiếm lai giảm phụ thuộc; đo bằng bộ đánh giá từ tuần 5 |
| Rò rỉ phạm vi không bị phát hiện | Thấp | Rất cao | Kiểm thử tích hợp bắt buộc, chạy trong CI mọi PR |
| Mạng phòng bảo vệ cô lập thiết bị | Trung bình | Cao | Thử trước tại phòng; đường hầm tạm và video dự phòng |
| Chi phí API vượt dự tính | Thấp | Trung bình | Cache hai tầng; đặt hạn mức trên bảng điều khiển |

Rủi ro rò rỉ phạm vi nghiêm trọng nhất về mặt sản phẩm: nó im lặng, không gây lỗi, và chỉ lộ ra khi có người thấy tài liệu không thuộc về mình. Vì vậy nó là kiểm thử duy nhất được đặt làm điều kiện chặn merge.

---

## Phụ lục A — Hợp đồng API

```
POST   /api/auth/login              → { token, user, memberships[] }
GET    /api/auth/me                 → { user, role, memberships[] }

POST   /api/documents               → 202 { document_id, status }     [ADMIN]
GET    /api/documents               ?department_id&status&page
GET    /api/documents/:id           → { document, chunk_count, job }
DELETE /api/documents/:id           → 204                             [ADMIN]
POST   /api/documents/:id/retry     → 202                             [ADMIN]

POST   /api/chat                    → SSE stream
       body: { question, conversation_id? }
       events: sources → token* → done
GET    /api/conversations           → { conversations[] }
GET    /api/conversations/:id       → { messages[], citations[] }

GET    /api/departments             → { departments[] }
POST   /api/departments/:id/members → 201                             [ADMIN]
DELETE /api/departments/:id/members/:userId → 204                     [ADMIN]

POST   /api/eval/runs               → 202 { run_id }                  [ADMIN]
GET    /api/eval/runs               → { runs[] }   // bảng so sánh

GET    /api/health                  → { status, uptime, pending_jobs }
```

## Phụ lục B — Cổng và cấu hình mạng

| Dịch vụ | Cổng | Bind | Ghi chú |
|---|---|---|---|
| Caddy | 80 | `0.0.0.0` | Reverse proxy, điểm vào duy nhất |
| Next.js | 3000 | nội bộ | Qua Caddy |
| Express | 4000 | nội bộ | Qua Caddy |
| PostgreSQL | 5432 | nội bộ | Không expose ra LAN |
| `netlab` TCP | 9999 | `0.0.0.0` | Demo môn Lập trình mạng |
| `netlab` HTTP | 8080 | `0.0.0.0` | Demo môn Lập trình mạng |

Biến môi trường quan trọng nhất khi demo LAN: `NEXT_PUBLIC_API_URL` phải trỏ về IP LAN của máy chủ, không phải `localhost`. Đây là lỗi phổ biến nhất — máy khách tải được giao diện nhưng mọi lệnh gọi API đều thất bại vì trình duyệt hiểu `localhost` là chính nó.
