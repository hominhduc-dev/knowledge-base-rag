# SRS — Sổ Tay Sinh Viên CNTT

Phiên bản 1.0 · Ngày 03/10/2026 · Đặc tả từ kho mã hiện hành.
Repository: https://github.com/hominhduc-dev/knowledge-base-rag
Commit khảo sát: `67094f9a71ee96e5a27e9e5135645a451a608b78`. Đây là rà soát tĩnh mã nguồn và tài liệu; chưa chạy hệ thống hoặc xác minh dữ liệu triển khai.

## 1. Mục đích và phạm vi

Hệ thống hỏi đáp trực tuyến bằng tiếng Việt về quy định, thủ tục và hướng dẫn học tập cho sinh viên ngành CNTT, Đại học Kiến trúc Đà Nẵng. RAG là truy hồi tài liệu rồi sử dụng mô hình sinh câu trả lời có trích dẫn. Kho tri thức gồm tài liệu CNTT và quy định chung áp dụng cho CNTT.

Ngoài phạm vi: tra cứu điểm, học phí cá nhân, lịch học và hồ sơ sinh viên; tự đăng ký; SSO; OCR tài liệu scan; quản trị đa khoa; quy trình duyệt tài liệu. Tạo tài khoản qua provisioning/seed và bootstrap quản trị là thao tác vận hành, chưa có POST /users. Bộ đánh giá chạy CLI. Netlab TCP/HTTP là phần thực hành học phần, không phải chức năng nghiệp vụ web.

Ranh giới hệ thống bao gồm frontend Next.js, API Express, worker xử lý tài liệu, lưu trữ tệp và PostgreSQL/pgvector. Gemini API ở ngoài ranh giới. CSDL, worker, JWT và trình duyệt không được đồng nhất với tác nhân nghiệp vụ.

## 2. Tác nhân tham gia

| Mã | Tác nhân | Vai / loại | Trách nhiệm |
|---|---|---|---|
| A01 | Sinh viên CNTT | USER | Hỏi đáp và tra cứu cá nhân. |
| A02 | Giáo vụ khoa CNTT | CONTENT_ADMIN | Mọi quyền USER và quản lý nội dung. |
| A03 | Quản trị viên | SYSTEM_ADMIN | Mọi quyền CONTENT_ADMIN và quản lý tài khoản CNTT. |
| A04 | Gemini API | Dịch vụ ngoài | Cung cấp embedding và sinh câu trả lời. |
| A05 | Người vận hành | Ngoài vai web | Provisioning, cấu hình, chạy đánh giá CLI. |
| A06 | Công cụ giám sát | Ngoài vai web | Gọi API sức khỏe. |

Quan hệ tổng quát hóa trên sơ đồ: Giáo vụ → Sinh viên; Quản trị viên → Giáo vụ. Mũi tên tam giác rỗng trỏ về vai tổng quát, diễn đạt kế thừa khả năng sử dụng, không có nghĩa giáo vụ là sinh viên ngoài đời. Người vận hành không tự động là SYSTEM_ADMIN; quyền CLI nằm ngoài mô hình RBAC web.

## 3. Đối tượng và thành phần hệ thống

### 3.1 Đối tượng dữ liệu

| Lớp / nhóm | Đối tượng | Vai trò |
|---|---|---|
| User | Tài khoản | Danh tính, mã, email, passwordHash, isActive. Không chứa điểm/lịch học. |
| Department | Đơn vị CNTT | Bảng vẫn tồn tại; ứng dụng không quản trị nhiều khoa. |
| DepartmentMember | Tư cách CNTT | Gắn User với CNTT và vai; là căn cứ phân quyền. |
| Document | Tài liệu | Tiêu đề, tệp gốc, hash, phạm vi, người tải lên, trạng thái. |
| Chunk | Đoạn tri thức | Nội dung, headingPath, trang, thứ tự, phạm vi phục vụ truy hồi. |
| ChunkEmbedding | Vector | Gắn đoạn với model; vector hiện 1536 chiều. |
| IngestJob | Công việc xử lý | Trạng thái, số lần thử, lỗi, thời gian xử lý. |
| Conversation | Hội thoại | Chủ sở hữu và tiêu đề. |
| Message | Tin nhắn | Câu hỏi/đáp án, thời điểm, latencyMs. |
| MessageCitation | Trích dẫn | Marker, điểm, bản sao trích đoạn và vị trí; giữ khi tài liệu bị gỡ. |
| EvalSet / EvalQuestion / EvalGoldChunk | Bộ đánh giá | Câu hỏi vàng và đoạn nguồn kỳ vọng; dùng CLI. |
| EvalRun / EvalResult | Kết quả đánh giá | Cấu hình chạy, recall@k/MRR và kết quả từng câu. |

### 3.2 Đối tượng tham gia thực hiện use case (Boundary–Control–Entity)

| Nhóm use case | Boundary | Control | Entity |
|---|---|---|---|
| Xác thực UC01–04 | LoginForm/useAuth, auth.controller | auth.service và middleware xác thực | User, DepartmentMember |
| Hỏi đáp UC05–06 | ChatBox, chat.controller/SSE | chat.service, retrieval.service, citation-guard, generate | Conversation, Message, MessageCitation, Chunk, ChunkEmbedding |
| Tra cứu UC07–09 | DocumentManager, CitationDrawer | documents.controller/service | Document, Chunk, IngestJob |
| Nội dung UC10–13 | Biểu mẫu upload, documents.controller | documents.service/parser/storage, worker | Document, Chunk, ChunkEmbedding, IngestJob |
| Quản trị UC14–17 | UserTable/PermissionMatrix, admin.controller | admin.service, managementTransaction | User, Department, DepartmentMember |
| Kỹ thuật UC18–20 | API search, CLI eval, API health | retrieval.service, runner đánh giá, health handler | Chunk, dữ liệu đánh giá, IngestJob |

BCE là cách phân tích trách nhiệm từ các module hiện có; không khẳng định repo định nghĩa mỗi trách nhiệm thành một lớp OOP riêng.

## 4. Chức năng chính và chức năng con

| Chức năng chính | Chức năng con | Use case |
|---|---|---|
| Xác thực và tài khoản cá nhân | Đăng nhập, đăng xuất, xem thông tin cá nhân, đổi mật khẩu | UC01–04 |
| Hỏi đáp học vụ bằng AI | Gửi câu hỏi, nhận đáp án có trích dẫn, xem nguồn và tệp gốc, xem lại hội thoại cá nhân | UC05–06, UC08 |
| Tra cứu tài liệu | Danh sách, tìm kiếm/lọc, chi tiết, trạng thái xử lý | UC07, UC09 |
| Quản lý kho tài liệu | Upload PDF/DOCX, sửa metadata, gỡ tài liệu, retry lỗi | UC10–13 |
| Quản trị người dùng và phân quyền | Tra cứu tài khoản CNTT, khóa/mở, đổi vai, thu hồi tư cách | UC14–17 |
| Hỗ trợ kỹ thuật | API truy hồi lai, CLI đánh giá, API sức khỏe | UC18–20 |

Quản trị viên (SYSTEM_ADMIN) quản lý tài khoản và quyền truy cập, đồng thời có toàn bộ quyền quản lý nội dung của giáo vụ. Vai này không được đọc hội thoại người khác, mở rộng phạm vi sang ngành khác, tự khóa, tự đổi vai hoặc tự thu hồi tư cách CNTT. Chưa có chức năng tạo tài khoản trên web.

### Ma trận quyền

| Nhóm chức năng | USER | CONTENT_ADMIN | SYSTEM_ADMIN |
|---|:---:|:---:|:---:|
| UC01–09 | Có | Có | Có |
| UC10–13 | Không | Có | Có |
| UC14–17 | Không | Không | Có |
| UC18 API truy hồi | Có | Có | Có |
| UC19 CLI đánh giá | Không thuộc quyền web | Không thuộc quyền web | Không thuộc quyền web |
| UC20 sức khỏe | Công khai | Công khai | Công khai |

Ba vai có cùng phạm vi đọc. Quyền quản trị không cho phép đọc tài liệu ngành khác hoặc hội thoại của người khác.

## 5. Danh mục và đặc tả use case

Mã giữ tương thích danh mục trong repo; UC17 được bổ sung để thể hiện API thu hồi tư cách CNTT đang tồn tại. Với UC03–18, tiền điều kiện mặc định là tài khoản hoạt động, có tư cách CNTT và JWT hợp lệ; nhóm Nội dung cần CONTENT_ADMIN/SYSTEM_ADMIN, nhóm Hệ thống cần SYSTEM_ADMIN. UC01 dùng tài khoản đã được cấp; UC02 cần phiên cục bộ; UC19 cần môi trường CLI được cấu hình; UC20 cần kết nối API.

| Mã | Chức năng | Nhóm | Giao diện / API |
|---|---|---|---|
| UC01 | Đăng nhập | Chung | `POST /api/auth/login` |
| UC02 | Đăng xuất | Chung | `Frontend useAuth` |
| UC03 | Xem thông tin cá nhân | Chung | `GET /api/auth/me` |
| UC04 | Đổi mật khẩu | Chung | `PUT /api/auth/password` |
| UC05 | Hỏi đáp học vụ | Chung | `POST /api/chat` |
| UC06 | Xem lại hội thoại | Chung | `GET /api/conversations; GET /api/conversations/:id` |
| UC07 | Tra cứu kho tài liệu | Chung | `GET /api/documents; GET /api/documents/:id` |
| UC08 | Xem nguồn trích dẫn | Chung | `GET /api/documents/:id/chunks; GET /api/documents/:id/file` |
| UC09 | Theo dõi xử lý tài liệu | Chung | `GET /api/documents/:id/status` |
| UC10 | Tải lên tài liệu | Nội dung | `POST /api/documents` |
| UC11 | Sửa thông tin tài liệu | Nội dung | `PATCH /api/documents/:id` |
| UC12 | Gỡ tài liệu | Nội dung | `DELETE /api/documents/:id` |
| UC13 | Chạy lại xử lý lỗi | Nội dung | `POST /api/documents/:id/retry` |
| UC14 | Tra cứu người dùng | Hệ thống | `GET /api/users` |
| UC15 | Khóa / mở tài khoản | Hệ thống | `PATCH /api/users/:id` |
| UC16 | Phân quyền tài khoản | Hệ thống | `POST /api/departments/:id/members` |
| UC17 | Thu hồi tư cách CNTT | Hệ thống | `DELETE /api/departments/:id/members/:userId` |
| UC18 | Tra cứu lai qua API | Kỹ thuật | `POST /api/search` |
| UC19 | Đánh giá truy hồi | Vận hành | `CLI eval` |
| UC20 | Kiểm tra sức khỏe | Vận hành | `GET /api/health` |

### UC01 — Đăng nhập

- Luồng chính: Nhập mã số hoặc email và mật khẩu; kiểm tài khoản hoạt động và tư cách CNTT; cấp JWT.
- Ngoại lệ / giới hạn: Sai thông tin, bị khóa hoặc không có tư cách CNTT: từ chối.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

### UC02 — Đăng xuất

- Luồng chính: Xóa token và hồ sơ phiên cục bộ, trở về đăng nhập.
- Ngoại lệ / giới hạn: Không có API logout; không khẳng định thu hồi JWT trên server.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

### UC03 — Xem thông tin cá nhân

- Luồng chính: Đọc danh tính và vai hiện hành từ server.
- Ngoại lệ / giới hạn: Token không hợp lệ hoặc quyền sử dụng bị thu hồi: từ chối.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

### UC04 — Đổi mật khẩu

- Luồng chính: Gửi mật khẩu hiện tại và mật khẩu mới; server xác minh rồi cập nhật hash.
- Ngoại lệ / giới hạn: Có API; chưa xác nhận có màn hình riêng.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

### UC05 — Hỏi đáp học vụ

- Luồng chính: Nhập câu hỏi; truy hồi trong phạm vi; gửi nguồn; Gemini sinh đáp án; kiểm marker; lưu câu trả lời và trích dẫn; gửi done.
- Ngoại lệ / giới hạn: Không có nguồn: không gọi mô hình, lưu lời từ chối. Gemini lỗi: gửi error. Không có marker hợp lệ: thay đáp án bằng lời từ chối.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

### UC06 — Xem lại hội thoại

- Luồng chính: Chọn hội thoại do chính mình sở hữu; đọc tin nhắn và nguồn đã lưu.
- Ngoại lệ / giới hạn: Hội thoại người khác trả 404; danh sách hiện giới hạn 50 hội thoại gần nhất.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

### UC07 — Tra cứu kho tài liệu

- Luồng chính: Lọc tên/phạm vi/trạng thái, phân trang, đọc chi tiết tài liệu trong phạm vi.
- Ngoại lệ / giới hạn: Tài liệu ngoài CNTT và quy định chung không được cung cấp.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

### UC08 — Xem nguồn trích dẫn

- Luồng chính: Chọn nguồn, xem trích đoạn/vị trí và mở tệp gốc nếu còn tồn tại.
- Ngoại lệ / giới hạn: Tài liệu bị gỡ: giữ bản sao trích dẫn trong lịch sử; không mở được tệp gốc.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

### UC09 — Theo dõi xử lý tài liệu

- Luồng chính: Đọc trạng thái PENDING, PROCESSING, READY hoặc FAILED của tài liệu trong phạm vi.
- Ngoại lệ / giới hạn: Không suy ra người xem trạng thái có quyền sửa hoặc retry.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

### UC10 — Tải lên tài liệu

- Luồng chính: Chọn PDF/DOCX có lớp chữ, đặt tiêu đề và phạm vi CNTT/chung; lưu tệp và tạo job; worker trích xuất, chia đoạn và nhúng.
- Ngoại lệ / giới hạn: Sai định dạng, trùng tệp hoặc sai phạm vi: từ chối. Lỗi xử lý nền: FAILED.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

### UC11 — Sửa thông tin tài liệu

- Luồng chính: Đổi tiêu đề hoặc phạm vi CNTT/chung; duy trì phạm vi các đoạn dữ liệu.
- Ngoại lệ / giới hạn: Không coi đây là chỉnh sửa nội dung tệp; không được chuyển sang khoa khác.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

### UC12 — Gỡ tài liệu

- Luồng chính: Xác định tài liệu trong phạm vi, thực hiện gỡ; dữ liệu phụ thuộc theo quan hệ CSDL.
- Ngoại lệ / giới hạn: Trích dẫn hội thoại giữ bản sao; documentId/chunkId có thể thành NULL.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

### UC13 — Chạy lại xử lý lỗi

- Luồng chính: Chọn tài liệu lỗi đủ điều kiện; yêu cầu xử lý lại và theo dõi trạng thái.
- Ngoại lệ / giới hạn: Sai vai/phạm vi/trạng thái: từ chối; không bảo đảm retry luôn thành công.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

### UC14 — Tra cứu người dùng

- Luồng chính: Tìm theo tên, email hoặc mã; phân trang danh sách tài khoản có tư cách CNTT.
- Ngoại lệ / giới hạn: Giáo vụ và sinh viên không được truy cập.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

### UC15 — Khóa / mở tài khoản

- Luồng chính: Đổi isActive; kiểm lại quyền người gọi trong transaction.
- Ngoại lệ / giới hạn: Cấm tự khóa; tài khoản ngoài phạm vi bị từ chối. Không phải xóa tài khoản.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

### UC16 — Phân quyền tài khoản

- Luồng chính: Đổi vai CNTT sang USER, CONTENT_ADMIN hoặc SYSTEM_ADMIN; ghi trong transaction tuần tự hóa.
- Ngoại lệ / giới hạn: Code cấm mọi thao tác tự đổi vai, kể cả tự nâng vai.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

### UC17 — Thu hồi tư cách CNTT

- Luồng chính: Gỡ tư cách CNTT của tài khoản đích; thu hồi khả năng dùng ứng dụng.
- Ngoại lệ / giới hạn: Cấm tự thu hồi; không xóa tài khoản hoặc dữ liệu ngoài ngành.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

### UC18 — Tra cứu lai qua API

- Luồng chính: Người gọi đã xác thực gửi truy vấn; nhận kết quả vector và toàn văn trong phạm vi.
- Ngoại lệ / giới hạn: Có API nhưng không phải chức năng màn hình chính; vẫn áp dụng quyền người gọi.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

### UC19 — Đánh giá truy hồi

- Luồng chính: Người vận hành chạy bộ câu hỏi vàng, lưu và so sánh recall@k/MRR.
- Ngoại lệ / giới hạn: Chưa có API /eval/runs hoặc màn hình đánh giá; không gán quyền web giả định.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

### UC20 — Kiểm tra sức khỏe

- Luồng chính: Công cụ giám sát đọc uptime và số job đang chờ; truy vấn chạm CSDL.
- Ngoại lệ / giới hạn: Không yêu cầu đăng nhập; không dùng kết quả này để kết luận toàn bộ RAG khỏe.
- Hậu điều kiện: thao tác thành công phản ánh kết quả nêu ở luồng chính; khi từ chối không cấp thêm quyền hoặc dữ liệu ngoài phạm vi.

## 6. Yêu cầu chức năng và quy tắc nghiệp vụ

| Mã | Yêu cầu | Truy vết |
|---|---|---|
| FR01 | Server xác minh tài khoản hoạt động và tư cách CNTT ở mỗi request bảo vệ; vai lấy từ CSDL. | UC01,03–18 |
| FR02 | Chỉ trả tài liệu chung hoặc CNTT có visibility phù hợp; lọc trước xếp hạng. | UC05,07–13,18 |
| FR03 | Nhận câu hỏi tiếng Việt và gửi sources → token* → done; đáp án cuối đồng nhất với dữ liệu lưu. | UC05 |
| FR04 | Không có nguồn thì không gọi mô hình; marker không hợp lệ bị gỡ; thiếu trích dẫn hợp lệ thì từ chối. | UC05 |
| FR05 | Lưu hội thoại, câu hỏi, đáp án và nguồn thực sự được trích; chỉ chủ sở hữu được đọc. | UC05–06 |
| FR06 | Mở nguồn/tệp gốc phải qua kiểm tra quyền, không phục vụ tệp tĩnh công khai. | UC08 |
| FR07 | Upload tạo job nền; worker trích xuất, chia đoạn, nhúng; trạng thái được tra cứu. | UC09–10 |
| FR08 | Giáo vụ/quản trị sửa metadata, gỡ tài liệu và retry trong phạm vi. | UC11–13 |
| FR09 | Chỉ quản trị xem/khóa/mở/đổi vai/thu hồi tư cách CNTT; cấm tự khóa, tự đổi vai, tự thu hồi. | UC14–17 |
| FR10 | Transaction đổi quyền kiểm lại quyền người gọi và tuần tự hóa các mutation quản trị. | UC15–17 |
| FR11 | Trích dẫn giữ bản sao khi nguồn bị gỡ; không hứa mở tệp đã mất. | UC06,08,12 |
| FR12 | Cung cấp API search có xác thực, CLI đánh giá và API health; không giả định có UI tương ứng. | UC18–20 |

Sinh câu trả lời và nhúng vector là hoạt động của hệ thống có Gemini hỗ trợ. UC08 “Xem nguồn” là hành động tùy chọn của người dùng, có thể mở từ câu trả lời hoặc lịch sử; không phải bước include bắt buộc của mỗi lần hỏi. Đăng nhập là tiền điều kiện của use case được bảo vệ, không vẽ include đăng nhập lặp lại ở mọi use case. Sơ đồ tổng quan ưu tiên association và actor generalization; không thêm include/extend khi chưa cần để tránh diễn đạt sai luồng.

## 7. Yêu cầu phi chức năng

Các mục dưới đây là tiêu chí nghiệm thu; rà soát tĩnh không chứng minh chúng đã đạt trên môi trường chạy.

| Mã | Yêu cầu và cách kiểm chứng |
|---|---|
| NFR01 Bảo mật | Thử thiếu/sai JWT, tài khoản khóa và tư cách bị gỡ; mọi API bảo vệ phải từ chối. Không lộ passwordHash qua DTO. |
| NFR02 Cách ly | Kiểm thử cả ba vai với tài liệu ngoài CNTT và hội thoại khác chủ; số lần đọc trái phép phải bằng 0. |
| NFR03 Tính nhất quán | done.text, câu trả lời sau tải lại và nội dung CSDL phải trùng; marker khớp nguồn được lưu. |
| NFR04 Chịu lỗi | Gemini/DB mất kết nối, upload lỗi và stream bị ngắt phải có kết quả lỗi rõ ràng; không báo READY cho tài liệu xử lý thất bại. |
| NFR05 Hiệu năng | Ghi latencyMs và đo độ trễ truy hồi/đáp án trên bộ dữ liệu CNTT. Ngưỡng p95 và số client đồng thời cần chốt bằng thực nghiệm, không tự coi số trong thiết kế cũ là đã đạt. |
| NFR06 Khả dụng | API health truy vấn được DB và báo số job chờ; kiểm health không thay thế kiểm embedding/generation. |
| NFR07 Sử dụng | Giao diện tiếng Việt, hiển thị nguồn/vị trí/trạng thái rõ; nội dung từ chối phân biệt với đáp án có căn cứ. |
| NFR08 Bảo trì | Tách controller, service, truy hồi và adapter Gemini; cấu hình model/API key qua môi trường, không ghi secret trong tài liệu. |

## 8. Tiêu chí nghiệm thu trọng yếu

1. USER hỏi câu có căn cứ: nhận đáp án cuối có marker hợp lệ, mở được đúng nguồn trong phạm vi và đọc lại đúng nội dung.
2. Câu không có nguồn: không gọi generation; hiển thị và lưu lời từ chối.
3. USER không upload được; CONTENT_ADMIN upload được nhưng không quản trị tài khoản; SYSTEM_ADMIN thực hiện được cả hai nhóm.
4. Tài liệu khoa khác bị chặn với cả ba vai; hội thoại người khác không đọc được.
5. Upload PDF/DOCX hợp lệ chuyển trạng thái qua job; lỗi xử lý hiện FAILED và thao tác retry có kiểm quyền.
6. Khóa tài khoản hoặc thu hồi tư cách khiến request sau bị từ chối dù còn JWT; tự khóa/tự đổi vai/tự thu hồi bị chặn.
7. Gỡ tài liệu không làm mất bản sao trích dẫn hội thoại, nhưng không còn mở được tệp đã gỡ.
8. Đăng xuất xóa phiên cục bộ. Không dùng tiêu chí này để tuyên bố JWT đã bị thu hồi trên server.

## 9. Truy vết nguồn và điểm cần lưu ý

Nguồn hiện hành được ưu tiên hơn mô tả hai vai/đa khoa trong các bản v2. Comment “chỉ SYSTEM_ADMIN” ở route ghi tài liệu đã lỗi thời: requireAdmin thực tế cho CONTENT_ADMIN và SYSTEM_ADMIN. Hành vi thực thi được dùng làm căn cứ.

- [README.md](https://github.com/hominhduc-dev/knowledge-base-rag/blob/67094f9a71ee96e5a27e9e5135645a451a608b78/README.md)
- [docs/PHAM-VI-CNTT.md](https://github.com/hominhduc-dev/knowledge-base-rag/blob/67094f9a71ee96e5a27e9e5135645a451a608b78/docs/PHAM-VI-CNTT.md)
- [docs/phan-quyen.md](https://github.com/hominhduc-dev/knowledge-base-rag/blob/67094f9a71ee96e5a27e9e5135645a451a608b78/docs/phan-quyen.md)
- [docs/use-cases/README.md](https://github.com/hominhduc-dev/knowledge-base-rag/blob/67094f9a71ee96e5a27e9e5135645a451a608b78/docs/use-cases/README.md)
- [server/src/lib/roles.ts](https://github.com/hominhduc-dev/knowledge-base-rag/blob/67094f9a71ee96e5a27e9e5135645a451a608b78/server/src/lib/roles.ts)
- [server/src/middleware/role.middleware.ts](https://github.com/hominhduc-dev/knowledge-base-rag/blob/67094f9a71ee96e5a27e9e5135645a451a608b78/server/src/middleware/role.middleware.ts)
- [server/src/modules/auth/auth.route.ts](https://github.com/hominhduc-dev/knowledge-base-rag/blob/67094f9a71ee96e5a27e9e5135645a451a608b78/server/src/modules/auth/auth.route.ts)
- [server/src/modules/admin/admin.service.ts](https://github.com/hominhduc-dev/knowledge-base-rag/blob/67094f9a71ee96e5a27e9e5135645a451a608b78/server/src/modules/admin/admin.service.ts)
- [server/src/modules/chat/chat.service.ts](https://github.com/hominhduc-dev/knowledge-base-rag/blob/67094f9a71ee96e5a27e9e5135645a451a608b78/server/src/modules/chat/chat.service.ts)
- [server/src/modules/documents/documents.route.ts](https://github.com/hominhduc-dev/knowledge-base-rag/blob/67094f9a71ee96e5a27e9e5135645a451a608b78/server/src/modules/documents/documents.route.ts)
- [server/prisma/schema.prisma](https://github.com/hominhduc-dev/knowledge-base-rag/blob/67094f9a71ee96e5a27e9e5135645a451a608b78/server/prisma/schema.prisma)
- [server/src/routes.ts](https://github.com/hominhduc-dev/knowledge-base-rag/blob/67094f9a71ee96e5a27e9e5135645a451a608b78/server/src/routes.ts)

## 10. Sơ đồ và trạng thái kiểm tra

- use-case.svg / use-case.html: UML tùy biến, ba nhóm nghiệp vụ và nhóm kỹ thuật; mã use case thống nhất với mục 5.
- components.archify.html: sơ đồ thành phần bổ trợ do Archify tạo. Archify không hỗ trợ loại UML use case trong schema hiện tại; bản UML không mang chứng nhận validation Archify.
- Archify dùng giao diện viewer và html lang mặc định tiếng Anh; nội dung được viết tiếng Việt.
- Archify: validate/deliver 9/9 showcase, 0 lỗi, 0 cảnh báo; receipt SHA-256 trong archify-receipt.json. Browser evidence skipped do thiếu Chrome/Chromium; chưa kiểm trực quan viewer trên browser. Hai vòng sửa hình học trước delivery.
