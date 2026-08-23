# Bảng thuật ngữ — Tàng Thư

Dùng thống nhất trong **báo cáo, tài liệu và bình luận mã nguồn**. Tên biến, tên hàm, tên bảng trong code vẫn giữ tiếng Anh.

## Quy tắc dùng từ

**Lần đầu xuất hiện trong báo cáo:** viết tiếng Việt kèm tiếng Anh trong ngoặc — *"tìm kiếm lai (hybrid search)"*. Từ lần thứ hai trở đi chỉ dùng tiếng Việt.

**Không dịch:** tên riêng công nghệ (PostgreSQL, Prisma, Supabase, Gemini, Docker), tên định danh trong code (`department_id`, `chunks`, `retrieve.ts`), và các từ đã thành chuẩn quốc tế không có từ Việt gọn hơn (vector, token, JWT).

**Tránh dịch nửa vời.** Viết *"embedding các chunk"* trong báo cáo là lỗi thường gặp nhất — hoặc dịch cả cụm, hoặc giữ nguyên cả cụm, đừng trộn.

---

## 1. RAG và truy hồi

| Tiếng Anh | Dùng trong báo cáo | Ghi chú |
|---|---|---|
| RAG (Retrieval-Augmented Generation) | **sinh câu trả lời dựa trên truy hồi** | Viết đầy đủ lần đầu, sau đó dùng "RAG" |
| retrieval | **truy hồi** | Không dùng "lấy lại", "khôi phục" — dễ nhầm với recovery |
| chunk | **đoạn văn** hoặc **đoạn tài liệu** | Danh từ |
| chunking | **cắt đoạn** | Động từ. Không dùng "phân mảnh" — đó là fragmentation |
| chunk overlap | **phần chồng lấn giữa hai đoạn** | |
| embedding | **vector nhúng** (danh từ) · **nhúng vector** (động từ) | Đừng viết trống không là "nhúng" — người đọc tưởng embed video |
| embedding model | **mô hình nhúng** | |
| semantic search | **tìm kiếm ngữ nghĩa** | |
| full-text search | **tìm kiếm toàn văn** | |
| keyword search | **tìm kiếm từ khóa** | |
| hybrid search | **tìm kiếm lai** | Không dùng "tìm kiếm hỗn hợp" — kém rõ |
| RRF (Reciprocal Rank Fusion) | **hợp nhất theo nghịch đảo thứ hạng** | Giữ viết tắt RRF sau lần đầu |
| top-k | **k kết quả đầu** | |
| citation | **trích dẫn** | |
| source | **nguồn** | |
| locator | **vị trí trích dẫn** | Ví dụ: "Điều 12, Khoản 1 · Trang 8" |
| context / context window | **ngữ cảnh** / **cửa sổ ngữ cảnh** | |
| prompt | **câu lệnh nhắc** | Có thể giữ "prompt", nhưng phải nhất quán |
| system prompt | **câu lệnh nhắc hệ thống** | |
| hallucination | **bịa thông tin** | Tránh "ảo giác" — nghe như bệnh lý, không phải nghĩa kỹ thuật |
| grounding | **ràng buộc vào nguồn** | |
| streaming | **truyền theo luồng** | |
| token | **token** | Giữ nguyên. Đừng dịch "thẻ bài" |
| reranker | **mô hình xếp hạng lại** | Ngoài phạm vi đồ án |
| cosine similarity | **độ tương đồng cosin** | |
| cosine distance | **khoảng cách cosin** | `<=>` trong pgvector |
| L2 normalization | **chuẩn hóa L2** | |

## 2. Cơ sở dữ liệu

| Tiếng Anh | Dùng trong báo cáo | Ghi chú |
|---|---|---|
| schema | **lược đồ** | "lược đồ cơ sở dữ liệu" |
| ERD (Entity–Relationship Diagram) | **sơ đồ thực thể – quan hệ** | |
| entity | **thực thể** | |
| attribute / column | **thuộc tính** / **cột** | Thuộc tính khi nói mô hình, cột khi nói bảng thật |
| primary key | **khóa chính** | |
| foreign key | **khóa ngoại** | |
| constraint | **ràng buộc** | |
| index | **chỉ mục** | Không dùng "chỉ số" — đó là metric |
| query | **truy vấn** | |
| migration | **di trú lược đồ** | Có thể giữ "migration"; nhất quán là được |
| seed data | **dữ liệu mồi** | |
| normalization / denormalization | **chuẩn hóa** / **phi chuẩn hóa** | Quyết định lặp `department_id` là phi chuẩn hóa có chủ đích |
| ORM | **ánh xạ đối tượng – quan hệ** | Giữ viết tắt ORM sau lần đầu |
| transaction | **giao dịch** | |
| connection pooler | **bộ gom kết nối** | |
| generated column | **cột sinh tự động** | Cột `tsv` |
| extension | **phần mở rộng** | pgvector là một phần mở rộng của PostgreSQL |
| cache | **bộ nhớ đệm** | |

## 3. Phân quyền và bảo mật

| Tiếng Anh | Dùng trong báo cáo | Ghi chú |
|---|---|---|
| RBAC (Role-Based Access Control) | **phân quyền theo vai trò** | |
| role | **vai trò** hoặc **vai** | |
| permission | **quyền** | |
| permission matrix | **ma trận phân quyền** | |
| scope | **phạm vi** | |
| scope isolation | **cách ly phạm vi** | Thuật ngữ lõi của đồ án — dùng đúng từ này xuyên suốt |
| data leakage | **rò rỉ dữ liệu** | |
| department / unit | **đơn vị** | Gồm cả khoa và phòng ban |
| authentication | **xác thực** | Trả lời "anh là ai" |
| authorization | **phân quyền** | Trả lời "anh được làm gì". **Hai từ này khác nhau, đừng dùng lẫn** |
| JWT (JSON Web Token) | **JWT** | Giữ nguyên. Diễn giải: "chuỗi thông hành đã ký" |
| hash | **băm** | "mật khẩu được băm bằng bcrypt" |
| signed URL | **liên kết có chữ ký** | Kèm "có thời hạn" khi cần nhấn mạnh |
| private bucket | **kho lưu trữ riêng tư** | |
| middleware | **middleware** | Giữ nguyên; "phần mềm trung gian" nghe như hệ thống doanh nghiệp |
| RLS (Row Level Security) | **bảo mật mức dòng** | Có nhắc trong phần so sánh phương án |

## 4. Đánh giá chất lượng

| Tiếng Anh | Dùng trong báo cáo | Ghi chú |
|---|---|---|
| golden questions | **bộ câu hỏi vàng** | |
| ground truth | **đáp án chuẩn** | |
| recall@k | **độ bao phủ ở k** | Giữ ký hiệu `recall@k` trong bảng số liệu |
| precision | **độ chính xác** | |
| MRR (Mean Reciprocal Rank) | **nghịch đảo hạng trung bình** | |
| hit / miss | **trúng** / **trượt** | |
| evaluation run | **lần chạy đánh giá** | Bảng `eval_runs` |
| baseline | **cấu hình cơ sở** | Cấu hình đầu tiên để so sánh |
| benchmark | **phép đo đối chuẩn** | |

## 5. Hạ tầng và ứng dụng web

| Tiếng Anh | Dùng trong báo cáo | Ghi chú |
|---|---|---|
| endpoint | **điểm cuối API** | |
| request / response | **yêu cầu** / **phản hồi** | |
| payload | **dữ liệu gửi kèm** | |
| SSE (Server-Sent Events) | **sự kiện đẩy từ máy chủ** | |
| upload | **tải lên** | |
| ingest / ingestion | **nạp tài liệu** | Tên module `ingest` giữ nguyên trong code |
| parse | **trích xuất văn bản** | Rõ hơn "phân tích cú pháp" trong ngữ cảnh PDF |
| job queue | **hàng đợi công việc** | |
| worker | **tiến trình nền** | |
| deploy / deployment | **triển khai** | |
| CI/CD | **tích hợp và triển khai liên tục** | Giữ viết tắt sau lần đầu |
| container | **container** | Giữ nguyên |
| environment variable | **biến môi trường** | |
| monorepo | **kho mã hợp nhất** | Có thể giữ "monorepo" |
| frontend / backend | **giao diện người dùng** / **máy chủ ứng dụng** | Trong báo cáo nên dịch; trong code giữ `apps/frontend`, `apps/backend` |
| mock data | **dữ liệu giả lập** | |
| integration test | **kiểm thử tích hợp** | |
| unit test | **kiểm thử đơn vị** | Chú ý: "đơn vị" ở đây là *unit của code*, không phải khoa/phòng ban. Trong báo cáo nên viết rõ "kiểm thử đơn vị (unit test)" ở lần đầu để tránh nhầm |

---

## 6. Danh mục từ viết tắt cho báo cáo

Dán vào mục **DANH MỤC TỪ VIẾT TẮT**:

| Viết tắt | Tiếng Anh | Tiếng Việt |
|---|---|---|
| API | Application Programming Interface | Giao diện lập trình ứng dụng |
| BM25 | Best Matching 25 | Hàm xếp hạng văn bản BM25 |
| CI/CD | Continuous Integration / Continuous Deployment | Tích hợp và triển khai liên tục |
| DOCX | — | Định dạng văn bản của Microsoft Word |
| ERD | Entity–Relationship Diagram | Sơ đồ thực thể – quan hệ |
| GIN | Generalized Inverted Index | Chỉ mục đảo tổng quát |
| HNSW | Hierarchical Navigable Small World | Chỉ mục đồ thị phân cấp cho tìm kiếm vector |
| JWT | JSON Web Token | Chuỗi thông hành đã ký |
| LLM | Large Language Model | Mô hình ngôn ngữ lớn |
| MRR | Mean Reciprocal Rank | Nghịch đảo hạng trung bình |
| ORM | Object–Relational Mapping | Ánh xạ đối tượng – quan hệ |
| PDF | Portable Document Format | Định dạng tài liệu di động |
| RAG | Retrieval-Augmented Generation | Sinh câu trả lời dựa trên truy hồi |
| RBAC | Role-Based Access Control | Phân quyền theo vai trò |
| REST | Representational State Transfer | Kiến trúc dịch vụ web REST |
| RLS | Row Level Security | Bảo mật mức dòng |
| RRF | Reciprocal Rank Fusion | Hợp nhất theo nghịch đảo thứ hạng |
| SQL | Structured Query Language | Ngôn ngữ truy vấn có cấu trúc |
| SSE | Server-Sent Events | Sự kiện đẩy từ máy chủ |
| UI | User Interface | Giao diện người dùng |
| VPS | Virtual Private Server | Máy chủ riêng ảo |

---

## 7. Ba chỗ dễ sai nhất

**`authentication` và `authorization` không phải một.** Xác thực là "anh là ai", phân quyền là "anh được làm gì". Hai module khác nhau, hai loại lỗi khác nhau (`UNAUTHENTICATED` là 401, `FORBIDDEN_ROLE` là 403). Báo cáo dùng lẫn hai từ này là mất điểm ngay ở chương phân tích.

**"đơn vị" mang hai nghĩa.** Trong đồ án này, "đơn vị" mặc định là khoa/phòng ban. Khi nói *unit test* thì phải viết đầy đủ "kiểm thử đơn vị (unit test)".

**"chỉ mục" khác "chỉ số".** `index` là chỉ mục (HNSW, GIN). `metric` là chỉ số (recall@k, MRR). Đảo hai từ này là lỗi hay gặp trong báo cáo sinh viên.
