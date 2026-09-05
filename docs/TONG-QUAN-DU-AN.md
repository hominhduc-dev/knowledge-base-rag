> **Cập nhật phạm vi 05/09/2026:** ứng dụng hiện chỉ phục vụ sinh viên CNTT, Đại học Kiến trúc Đà Nẵng; ba vai `USER`, `CONTENT_ADMIN`, `SYSTEM_ADMIN`. [PHAM-VI-CNTT.md](PHAM-VI-CNTT.md) và [phan-quyen.md](phan-quyen.md) là đặc tả hiện hành. Các phần hai vai/đa khoa bên dưới là thiết kế v2 được giữ để tham khảo, không còn là yêu cầu triển khai.

# TỔNG QUAN DỰ ÁN

## Xây dựng hệ thống hỏi đáp trực tuyến quá trình học tập cho sinh viên DAU

Tên sản phẩm: **Sổ Tay Sinh Viên CNTT** · Repository: `knowledge-base-rag`
Môn học: Lập trình mạng máy tính · Nhóm 4 người · 8 tuần
Tech Lead: Hồ Minh Đức

> **Chú thích phạm vi đề tài.** "Quá trình học tập" trong tên đề tài được hiểu là các **quy định, quy chế, thủ tục và hướng dẫn** liên quan đến quá trình học tập của sinh viên. Hệ thống **không** truy vấn dữ liệu cá nhân (điểm số, tín chỉ tích lũy, học phí, lịch thi).
>
> *Câu này phải xuất hiện ở trang bìa báo cáo và slide thứ hai khi bảo vệ.*

---

## 1. Bối cảnh và vấn đề

Thông tin học vụ trong trường nằm rải rác: website trường, website từng khoa, file PDF quy chế, thông báo trên group Facebook, giấy dán bảng tin. Ba hệ quả:

1. **Sinh viên hỏi lặp lại** những câu giống nhau qua nhiều kênh, không biết nguồn nào chính thức.
2. **Giáo vụ trả lời thủ công** hàng ngày cho các câu hỏi đã có sẵn đáp án trong văn bản.
3. **Ngữ cảnh sai lệch** — mỗi khoa có quy định riêng chồng lên quy chế chung, nên câu trả lời đúng với khoa này lại sai với khoa khác.

Công cụ AI phổ thông (ChatGPT, Gemini) không giải được: chúng không có dữ liệu nội bộ của trường, không phân biệt người hỏi thuộc khoa nào, và suy đoán khi không biết — điều đặc biệt nguy hiểm với dữ liệu học vụ, nơi một câu sai về điều kiện tốt nghiệp gây hậu quả thật.

---

## 2. Mục tiêu

**Mục tiêu sản phẩm.** Một cửa duy nhất để tra cứu quy định học vụ: hỏi bằng tiếng Việt tự nhiên, nhận câu trả lời kèm trích dẫn đúng điều khoản, giới hạn trong phạm vi đơn vị của người hỏi.

**Mục tiêu kỹ thuật.** Chứng minh nhóm làm chủ năm năng lực, không phải chỉ gọi API bên thứ ba:

| # | Năng lực | Thuộc môn |
|---|---|---|
| 1 | Tự lập trình server ở tầng socket và tầng ứng dụng | Lập trình mạng |
| 2 | Kiểm soát truy cập dữ liệu tại tầng truy vấn | CSDL / Bảo mật |
| 3 | Kết hợp tìm kiếm ngữ nghĩa và từ khóa trên cùng hệ CSDL | Xử lý dữ liệu |
| 4 | Ràng buộc câu trả lời vào nguồn kiểm chứng được | Ứng dụng AI |
| 5 | Đo lường chất lượng bằng số liệu, không bằng cảm tính | Phương pháp |

Năng lực 1 là yêu cầu riêng của môn Lập trình mạng, xử lý bằng module `netlab` (mục 7).

---

## 3. Phạm vi

### Trong phạm vi

- Quản lý tài liệu theo đơn vị (khoa, phòng ban) và phạm vi toàn trường
- Phân quyền 2 vai `STUDENT` / `ADMIN`, kết hợp phạm vi truy cập theo khoa
- Hỏi đáp hội thoại có streaming, kèm trích dẫn bấm mở được
- Tìm kiếm lai: vector (pgvector) + toàn văn (Postgres full-text)
- Bộ đánh giá chất lượng truy hồi với câu hỏi vàng
- Module lập trình mạng: TCP server thuần và HTTP server tự viết

### Ngoài phạm vi — cố ý loại trừ

| Không làm | Lý do |
|---|---|
| Tra cứu điểm số, tín chỉ, tiến độ cá nhân | Cần tích hợp hệ thống quản lý đào tạo và quyền truy cập dữ liệu cá nhân; đã nêu ở chú thích phạm vi |
| Thay thế quyết định hành chính | Câu trả lời mang tính tham khảo; quyết định chính thức thuộc phòng ban |
| Chatbot tuyển sinh đối ngoại | Khác đối tượng, khác dữ liệu |
| OCR tài liệu scan | Loại file scan từ khâu thu thập |
| Nhật ký kiểm toán, thống kê, phiên bản tài liệu | Khối lượng CRUD lớn, không thể hiện năng lực kỹ thuật |
| Vai trò Giảng viên, Giáo vụ khoa | Rút còn 2 vai để dồn thời gian cho phần lõi |

Ranh giới này chốt từ tuần 1 và **không thương lượng lại giữa kỳ**. Mở rộng phạm vi giữa chừng là nguyên nhân số một khiến đồ án nhóm không kịp tiến độ.

---

## 4. Người dùng

| Vai | Người thật | Quyền hạn |
|---|---|---|
| `STUDENT` | Sinh viên | Hỏi đáp và tra cứu; chỉ thấy tài liệu khoa mình + tài liệu toàn trường |
| `ADMIN` | Cán bộ Phòng Đào tạo / giáo vụ | Upload và quản lý tài liệu mọi khoa, quản lý người dùng và đơn vị |

Điểm cần thuộc khi bảo vệ: **vai trò quyết định làm được gì, đơn vị quyết định thấy được gì.** Hai sinh viên cùng vai `STUDENT` nhưng khác khoa vẫn nhận hai tập kết quả khác nhau, vì phạm vi lấy từ bảng `department_members` chứ không từ cột `role`.

---

## 5. Sản phẩm bàn giao

**A. Mã nguồn** — repository công khai, README kèm GIF demo, cài đặt bằng một lệnh `docker compose up`.

**B. Hệ thống chạy được** — trên máy cá nhân qua Docker Compose, truy cập được từ máy khác trong mạng LAN, có phương án dự phòng khi mạng phòng học không thông.

**C. Năm năng lực lõi hoạt động được:**

1. **Cách ly phạm vi** — sinh viên khoa A không bao giờ nhận nội dung khoa B, có kiểm thử tự động chứng minh
2. **Tìm kiếm lai** — vector + từ khóa, xử lý được số hiệu văn bản và mã học phần
3. **Trích dẫn bắt buộc** — bấm vào mở đúng trang gốc; không tìm được nguồn thì từ chối trả lời
4. **Bộ đánh giá** — ít nhất 9 lần chạy với cấu hình khác nhau, có bảng so sánh
5. **Module lập trình mạng** — TCP server và HTTP server tự viết, không dùng framework

**D. Tài liệu** — báo cáo, sơ đồ kiến trúc ba khung nhìn, ERD, bảng kết quả đánh giá, chương phân tích giao thức mạng (ảnh Wireshark, ngân sách độ trễ).

**E. Tùy chọn (chỉ khi tuần 6 đã xong hết):** MCP server cho phép truy vấn từ Claude Desktop — bằng chứng cho kiến trúc API-first.

---

## 6. Công nghệ

### Nguyên tắc chọn

Ưu tiên **ít thành phần, một ngôn ngữ, dễ triển khai**. Mọi thứ chạy bằng một lệnh Docker Compose. Không microservices, không message queue riêng, không dịch vụ lưu trữ đối tượng.

Nguyên tắc nền: **tối ưu cho chi phí nhận thức của nhóm, không cho thông lượng lý thuyết.** Ba trong bốn thành viên ở mức CRUD cơ bản, nên mỗi công nghệ thêm vào là một khoản học phí phải trả bằng thời gian.

### Danh sách

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind | Streaming qua SSE |
| Backend | Express 5 + TypeScript | REST, không GraphQL |
| Lập trình mạng | Module `net` của Node | TCP + HTTP server tự viết |
| ORM | Prisma | Truy vấn tìm kiếm dùng raw SQL |
| CSDL | PostgreSQL 16 + pgvector | Vector và full-text trên cùng một DB |
| Embedding | API bên thứ ba (Gemini / OpenAI) | Cache theo `content_hash` |
| Sinh câu trả lời | SDK chính thức của nhà cung cấp | Không dùng LangChain |
| Đọc tài liệu | `unpdf`, `mammoth` | PDF, DOCX |
| Hàng đợi | Bảng job trong Postgres | Không dùng Redis |
| Triển khai | Docker Compose + Caddy | Máy cá nhân hoặc VPS |

### Ba quyết định cần bảo vệ được

**Không dùng LangChain.** Điểm nhấn của dự án nằm ở tầng truy vấn SQL — nơi framework này trừu tượng hóa đi, làm mất khả năng chèn bộ lọc phân quyền trước bước xếp hạng. Toàn bộ lõi RAG chỉ khoảng 200 dòng. Tự viết cho phép nhóm giải thích được từng dòng khi bảo vệ.

**Lặp cột `department_id` xuống bảng `chunks`.** Vi phạm chuẩn hóa có chủ đích. Lý do ngắn gọn: chỉ mục HNSW không kết hợp tốt với JOIN lọc quyền, và lọc sau khi xếp hạng có thể trả về rỗng dù dữ liệu tồn tại. Phân tích đầy đủ ở mục 4.2 tài liệu thiết kế.

**Tìm kiếm lai thay vì thuần vector.** Embedding tiếng Việt trượt số hiệu văn bản và mã học phần. BM25 qua `ts_rank` bù đúng phần đó, và Postgres làm được cả hai nên không phát sinh hạ tầng.

---

## 7. Yêu cầu riêng của môn Lập trình mạng

Đề tài là ứng dụng web, nên nếu chỉ dùng Express thì phần "lập trình mạng" mỏng. Ba hạng mục dưới đây lấp khoảng đó, tổng chi phí khoảng 3 ngày công.

### 7.1 Module `netlab` — server tự viết ở tầng socket

Đặt tại `server/src/netlab/`, chạy độc lập với hệ thống chính:

- **`tcp-server.js`** — TCP echo server bằng module `net`, xử lý message framing bằng delimiter, hỗ trợ nhiều client đồng thời, tắt an toàn khi nhận SIGINT
- **`tcp-client.js`** — client đối chiếu, kết nối được qua LAN
- **`http-server.js`** — HTTP server tự viết trên nền TCP socket, **không dùng module `http`, không dùng Express**: tự tách header khỏi body tại `\r\n\r\n`, tự parse request line và headers, tự dựng status line và response

Ba khái niệm rút ra, đưa thẳng vào báo cáo:

**TCP là luồng byte, không phải luồng thông điệp.** Một lần `write()` bên gửi không tương ứng một lần `data` bên nhận. Gọi `Receive()` một lần rồi coi như đủ là sai, dù trên localhost vẫn "chạy được". Đã kiểm chứng bằng test cắt request thành 3 mảnh giữa tên header và giữa JSON body — server vẫn ghép đúng.

**`Content-Length` tính bằng byte, không phải ký tự.** Chữ tiếng Việt có dấu chiếm 2–3 byte UTF-8; dùng `string.length` khiến trình duyệt treo chờ dữ liệu không bao giờ đến. Lỗi đặc thù đáng nêu.

**Mô hình chặn và mô hình hướng sự kiện.** C# gọi `Accept()` chặn luồng, phải tạo thread cho mỗi client. Node đăng ký callback, một luồng phục vụ hàng nghìn kết nối — đánh đổi là tác vụ nặng CPU chặn cả vòng lặp. Đây chính là lý do worker xử lý PDF được tách khỏi đường truy vấn.

### 7.2 Phân tích giao thức

**Bắt gói bằng Wireshark.** Lọc `tcp.port == 8080`, chạy một request hoàn chỉnh, chụp lại: bắt tay ba bước (SYN, SYN-ACK, ACK), gói PSH mang request, gói mang response, FIN đóng kết nối.

**So sánh SSE, WebSocket và long-polling** cho bài toán streaming câu trả lời, kèm lý do chọn SSE: một chiều, tự kết nối lại, chạy trên HTTP thường, không cần nâng cấp giao thức.

**So sánh keep-alive và close.** Chạy 10 request mỗi kiểu, đo tổng thời gian. Chênh lệch chính là chi phí bắt tay TCP lặp lại.

### 7.3 Đo đạc thực nghiệm

**Ngân sách độ trễ.** Chia thời gian từ lúc gửi câu hỏi đến token đầu tiên thành từng chặng: RTT mạng, nhúng câu hỏi, truy vấn SQL, gọi LLM. Đo bằng log thật, vẽ biểu đồ cột.

**Thí nghiệm tải.** Dùng `autocannon` bắn 1, 5, 10, 20 kết nối đồng thời, vẽ đường độ trễ theo mức đồng thời, chỉ ra điểm bão hòa. Nối thẳng với nhược điểm cố hữu của mô hình client-server (dễ tắc nghẽn khi tải tăng) — nhưng chứng minh bằng số của chính hệ thống mình, không phải trích blog.

---

## 8. Đội ngũ và phân công

Chia theo **lát cắt dọc** — mỗi người sở hữu một luồng từ CSDL đến giao diện. Không chia ngang frontend/backend, vì cách đó luôn dẫn đến nghẽn ở người làm backend.

| Thành viên | Lát cắt | Phạm vi sở hữu |
|---|---|---|
| **Hồ Minh Đức** *(Tech Lead)* | Retrieval + Network | Truy hồi lai, cách ly phạm vi, bộ đánh giá, module `netlab`, đo đạc mạng, Docker, CI/CD, review toàn bộ PR |
| **Thành viên 2** | Ingest | Upload, phân tích PDF/DOCX, cắt đoạn, sinh vector, quản lý tài liệu |
| **Thành viên 3** | Chat UI | Giao diện hội thoại, streaming SSE, hiển thị trích dẫn, lịch sử |
| **Thành viên 4** | Auth + RBAC | Xác thực JWT, phân quyền 2 vai, quản lý đơn vị và thành viên, seed dữ liệu; từ sprint 4 hỗ trợ bộ đánh giá |

Tech Lead giữ thêm ba trách nhiệm quản lý: duyệt phạm vi (từ chối yêu cầu phát sinh), gỡ vướng khi thành viên bị chặn quá 1 ngày, bảo đảm mốc cuối mỗi sprint.

---

## 9. Tuần 1 — Ôn tập có sản phẩm

Nguyên tắc: **không ôn suông**. Mỗi người ôn đúng phần dự án cần và cuối tuần phải merge được một PR nhỏ chứng minh đã hiểu.

**Đức — RAG, hạ tầng và mạng**
*Ôn:* chiến lược cắt đoạn, embedding và cosine similarity, toán tử `<=>` của pgvector, `tsvector`/`ts_rank`; vòng đời TCP socket, cấu trúc thông điệp HTTP theo RFC 9110/9112.
*Không ôn:* agent, reranker, GraphRAG — ngoài phạm vi.
*Đầu ra:* repo khởi tạo, `docker-compose.yml` chạy Postgres + pgvector, `schema.prisma` đầy đủ, **API truy hồi giả lập** trả 3 kết quả cứng, module `netlab` chạy được, CI chạy lint.

**Thành viên 2 — Express / Node**
*Ôn:* router và middleware Express 5, upload file với `multer`, xử lý lỗi async/await, đọc PDF bằng `unpdf`.
*Đầu ra:* `POST /documents` nhận file PDF, lưu vào volume, ghi bản ghi vào bảng `documents`, in được text thô.

**Thành viên 3 — React / Next.js**
*Ôn:* App Router và phân biệt server/client component, `useState`/`useEffect`, đọc luồng SSE, Tailwind cơ bản.
*Đầu ra:* trang `/chat` gọi API giả lập, hiển thị được câu hỏi và câu trả lời. Chưa cần đẹp.

**Thành viên 4 — Auth và CSDL**
*Ôn:* JWT (ký, xác thực, nơi lưu), `bcrypt`, middleware kiểm tra vai trò, quan hệ Prisma, chỉ mục Postgres.
*Đầu ra:* đăng ký/đăng nhập chạy được, middleware `requireRole('ADMIN')` chặn đúng, script seed 3 khoa và 5 người dùng mẫu.

**Cả nhóm — Quy trình Git**
Đây mới là chỗ vỡ trận thật sự của nhóm sinh viên, không phải kiến thức framework. Mỗi người bắt buộc: tạo nhánh `feat/...`, mở PR, **review PR của người khác**, xử lý một lần xung đột (Tech Lead cố ý tạo ra để cả nhóm tập).

Quy ước chốt: không đẩy thẳng vào `main`; commit theo Conventional Commits; PR cần ít nhất một approve.

**Chủ nhật cuối tuần 1 — họp 60 phút.** Mỗi người trình bày 10 phút về thứ mình học và demo PR của mình. Ép trình bày là cách duy nhất biết ai thực sự đã đọc.

**Việc quan trọng nhất tuần 1:** API truy hồi giả lập phải xong sớm. Không có nó, thành viên 3 và 4 ngồi chờ suốt bốn tuần.

---

## 10. Lộ trình — 4 sprint × 2 tuần

### Sprint 1 (Tuần 1–2) — Xương sống
Docker Compose · schema Prisma đầy đủ · xác thực và seed đơn vị · luồng upload → phân tích → cắt đoạn → lưu CSDL · API truy hồi giả lập · module `netlab`.

> **Mốc:** upload một file PDF, thấy các đoạn văn trong bảng `chunks`.

### Sprint 2 (Tuần 3–4) — Chạy thông
Sinh vector và cache theo `content_hash` · tìm kiếm vector cơ bản · giao diện hội thoại ráp vào API thật.

> **Mốc:** hỏi được, trả lời được — dù chất lượng còn kém.

Đây là mốc sống còn. Hết tuần 4 chưa thông đầu-cuối thì phải cắt tiếp phạm vi, không phải cố làm bù.

### Sprint 3 (Tuần 5–6) — Bản sắc
Bộ lọc phạm vi trong SQL · phân quyền 2 vai · tìm kiếm lai · trích dẫn bấm mở đúng trang · kiểm thử tích hợp chống rò rỉ giữa các khoa.

> **Mốc:** kiểm thử rò rỉ phạm vi đạt và chạy trong CI.

### Sprint 4 (Tuần 7–8) — Đo lường và chốt
Bộ 30 câu hỏi vàng · 9 thí nghiệm đánh giá · đo đạc mạng (Wireshark, ngân sách độ trễ, thí nghiệm tải) · triển khai và thử demo LAN · README và báo cáo · tập demo.

> **Mốc:** bảng `eval_runs` có ít nhất 9 dòng; demo LAN chạy được tại đúng phòng bảo vệ.

**Luật cứng: tuần 8 không viết tính năng mới.** Cả tuần chỉ sửa lỗi, viết tài liệu, tập trình bày. Nhóm nào phá luật này đều ra demo lỗi.

---

## 11. Quy trình làm việc

**Bảng công việc.** GitHub Projects (template Iterative development), 4 iteration × 2 tuần. Trường tùy chỉnh: `Slice`, `Type`, `Size`. Ba view: Sprint hiện tại (board), Theo người (table), Lộ trình (roadmap).

**Tự động hóa.** Bật workflow `PR merged → Done` và `Item closed → Done`; mọi PR ghi `Closes #<số>`. Không ai kéo thẻ thủ công.

**Nhịp.** Đầu sprint kéo việc vào iteration; giữa tuần mỗi người tự cập nhật; cuối sprint rà cột Done và dời việc chưa xong sang iteration kế. Bảng không được cập nhật trong 5 ngày coi như bảng chết.

**Họp.** Một buổi 60 phút vào Chủ nhật hàng tuần: demo những gì đã merge, nêu vướng mắc, chốt việc tuần sau.

---

## 12. Triển khai và demo

Hệ thống triển khai trên **máy cá nhân** bằng Docker Compose. Ba việc phải chuẩn bị:

**Cấu hình LAN.** Server bind `0.0.0.0` thay vì `127.0.0.1`; đặt `NEXT_PUBLIC_API_URL` trỏ về IP LAN chứ không phải localhost — quên bước này thì máy khác vào được giao diện nhưng gọi API thất bại, và đây là lỗi phổ biến nhất khi demo LAN. Mở port trên firewall. Đặt IP tĩnh cho máy.

**Thử tại đúng phòng bảo vệ ít nhất một lần.** Mạng phòng học có thể cô lập thiết bị, không cho máy này thấy máy kia.

**Hai lớp dự phòng.** Đường hầm tạm bằng `cloudflared tunnel --url http://localhost:3000` cho URL công khai trong 30 giây, lệnh ghi sẵn trong file ghi chú. Và một video demo 3 phút quay sẵn — nếu mọi thứ hỏng vẫn bảo vệ được nội dung kỹ thuật.

Demo LAN có giá trị riêng cho môn Lập trình mạng: máy của nhóm là server, điện thoại hoặc laptop của thầy là client, ranh giới client-server hiện ra rõ ràng thay vì chỉ là hai hộp trên sơ đồ.

**Kịch bản demo chính** — chuẩn bị dữ liệu từ tuần 1:
- Tài liệu toàn trường: quy chế đào tạo, sổ tay sinh viên
- Tài liệu khoa CNTT: quy định đồ án tốt nghiệp CNTT
- Tài liệu khoa Kiến trúc: quy định đồ án tốt nghiệp Kiến trúc

Đăng nhập bằng sinh viên CNTT, hỏi *"Quy định về đồ án tốt nghiệp?"* → ra tài liệu CNTT và tài liệu chung. Đăng nhập bằng sinh viên Kiến trúc, hỏi **đúng câu đó** → kết quả khác hẳn. Cùng câu hỏi, cùng hệ thống, hai kết quả — hội đồng thấy ngay cơ chế mà không cần giải thích.

---

## 13. Rủi ro và cách chặn

| Rủi ro | Mức | Cách chặn |
|---|---|---|
| Thành viên bị chặn vì chờ API của Tech Lead | Cao | API giả lập hoàn thành ngay tuần 1 — ưu tiên số một |
| Tài liệu là file scan, không trích được text | Cao | Tuần 1 mở từng file kiểm tra; loại file scan khỏi tập dữ liệu |
| Phạm vi phình ra giữa kỳ | Cao | Mục 3 là hợp đồng; Tech Lead có quyền từ chối |
| Rò rỉ phạm vi không bị phát hiện | Thấp / rất nặng | Kiểm thử tích hợp chạy trong CI mọi PR, là điều kiện chặn merge |
| Cắt đoạn thất bại vì định dạng PDF lộn xộn | Cao | Có đường lùi về cắt theo đoạn văn |
| Chất lượng embedding tiếng Việt kém hơn kỳ vọng | Trung bình | Tìm kiếm lai giảm phụ thuộc; đo từ tuần 5, không đợi tuần 8 |
| Mạng phòng học cô lập thiết bị, demo LAN hỏng | Trung bình | Thử trước tại phòng; có đường hầm tạm và video dự phòng |
| Chi phí API vượt dự tính | Thấp | Cache hai tầng; đặt hạn mức trên bảng điều khiển nhà cung cấp |
| Một thành viên hụt tiến độ | Trung bình | Lát cắt dọc giúp phát hiện sớm; rà ở buổi họp Chủ nhật |

Rủi ro rò rỉ phạm vi nghiêm trọng nhất về mặt sản phẩm: nó im lặng, không gây lỗi, chỉ lộ ra khi có người thấy tài liệu không thuộc về mình. Vì vậy nó là kiểm thử duy nhất được đặt làm điều kiện chặn merge.

---

## 14. Tiêu chí thành công

Dự án đạt khi sáu điều sau đồng thời đúng:

1. Hệ thống chạy trên máy cá nhân, máy khác trong LAN truy cập được
2. Kiểm thử rò rỉ phạm vi giữa các khoa đạt và chạy trong CI
3. Mọi câu trả lời đều kèm trích dẫn mở được đến tài liệu gốc
4. Bảng `eval_runs` có số liệu so sánh ít nhất 9 cấu hình
5. Module `netlab` chạy được, có kết quả kiểm chứng framing
6. Người mới clone repo về, chạy `docker compose up` là dùng được

---

*Tài liệu này là hợp đồng làm việc của nhóm trong 8 tuần. Mọi thay đổi phạm vi phải được ghi lại kèm lý do và tác động đến lộ trình.*
