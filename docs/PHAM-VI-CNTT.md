# Phạm vi hiện hành — Sổ Tay Sinh Viên CNTT

Cập nhật 05/09/2026 theo quyết định của người dùng. Tài liệu này thay thế các yêu cầu đa khoa và hai vai trong thiết kế v2.

## Đề tài và đối tượng

**Xây dựng hệ thống hỏi đáp trực tuyến về quy định và quá trình học tập cho sinh viên ngành Công nghệ Thông tin, Trường Đại học Kiến trúc Đà Nẵng.** Học phần: Lập trình mạng máy tính.

“Quá trình học tập” là quy định, thủ tục và hướng dẫn chung: đăng ký học phần, điều kiện học đồ án, chuẩn đầu ra, bảo lưu, cảnh báo học vụ và xét tốt nghiệp. Không tra cứu điểm số, công nợ học phí, lịch học hoặc hồ sơ cá nhân của một sinh viên.

Kho tri thức chỉ gồm tài liệu CNTT và quy định chung của trường áp dụng cho sinh viên CNTT. Không triển khai nền tảng quản trị nhiều khoa/phòng ban. Các tài liệu khoa khác còn trong CSDL cũ được giữ nguyên nhưng không xuất hiện qua ứng dụng, kể cả đối với quản trị viên.

## Ba vai đã chốt

| Mã | Tên | Chức năng |
|---|---|---|
| `USER` | Sinh Viên CNTT | Sinh viên CNTT: đăng nhập/đăng xuất, đổi mật khẩu, hỏi đáp, xem trích dẫn, tài liệu và hội thoại cá nhân |
| `CONTENT_ADMIN` | Giáo vụ khoa CNTT | Có quyền USER; tải lên, sửa, gỡ tài liệu CNTT/quy định chung và chạy lại xử lý lỗi |
| `SYSTEM_ADMIN` | Quản Trị Viên | Có quyền CONTENT_ADMIN; xem, khóa/mở tài khoản và cấp một trong ba vai |

Cả ba vai dùng **cùng phạm vi tài liệu**. Không có vai quản trị đơn vị. Giáo vụ khoa CNTT không được đọc danh sách tài khoản, khóa người dùng hoặc tự cấp quyền quản trị. Quản Trị Viên không được tự khóa, tự hạ vai hay tự gỡ quyền sử dụng của mình.

Đánh giá truy hồi, cấu hình môi trường, Docker và bài thực hành TCP/HTTP do người vận hành chạy bằng CLI; không coi đó là các chức năng quản trị web đã có. Tạo tài khoản hiện qua seed/provisioning; chưa có `POST /users` hoặc màn hình tạo tài khoản. Không bổ sung CRUD đơn vị để phục vụ đồ án này.

## Chức năng giữ lại

1. Xác thực JWT; server đọc lại trạng thái tài khoản và vai mỗi request.
2. Upload PDF/DOCX có lớp chữ; lưu file, trích xuất, chia đoạn, nhúng vector bằng worker và bảng job trong Postgres.
3. Tìm kiếm lai vector + toàn văn, lọc CNTT/quy định chung trong truy vấn trước xếp hạng.
4. Hỏi đáp tiếng Việt qua HTTP/SSE, bắt buộc có trích dẫn; thiếu nguồn thì từ chối.
5. Danh sách tài liệu, trạng thái xử lý, nguồn trích dẫn và hội thoại cá nhân.
6. Phân quyền ba vai đơn giản và quản lý tài khoản CNTT.
7. Bộ câu hỏi vàng `cntt-v1`, đo recall@k/MRR bằng CLI.
8. Bài thực hành TCP/HTTP tự viết, framing, UTF-8 Content-Length, nhiều client, đóng kết nối và demo LAN.

## Trọng tâm học phần Lập trình mạng

- Mô hình client–server và giao tiếp qua LAN.
- TCP là luồng byte: ghép/tách thông điệp, nhiều kết nối đồng thời.
- HTTP request/response, header/body, mã trạng thái, keep-alive và đóng kết nối.
- SSE truyền câu trả lời một chiều, so sánh với polling/WebSocket.
- Timeout, ngắt kết nối, xử lý lỗi và dừng server.
- Wireshark: bắt tay TCP, request/response, kết thúc phiên; đo độ trễ và tải bằng số liệu thực nghiệm.

RAG là nghiệp vụ minh họa cho ứng dụng mạng. Không mở rộng vai trò hành chính, đa khoa, SSO, OCR, tuyển sinh, quản lý đào tạo hay cơ sở dữ liệu cá nhân.

## Quy tắc hiện thực

- Giữ bảng `departments`/`department_members` để không phá CSDL, nhưng ứng dụng chỉ nhận tư cách có `department.code = CNTT`.
- `effectiveRole`: SYSTEM_ADMIN > CONTENT_ADMIN > USER; chỉ gộp các tư cách CNTT đã lọc từ CSDL. Không tin role/phạm vi từ trình duyệt hoặc JWT tự khai.
- Người dùng không có tư cách CNTT không được đăng nhập hoặc sử dụng JWT cũ. Không xóa tài khoản ngoài ngành.
- `scopeWhere` và `scopeSql` cho phép tài liệu `department_id IS NULL` hoặc đúng đơn vị CNTT. Vai quản trị không có nhánh bỏ qua bộ lọc.
- Các API ghi tài liệu kiểm vai ở cả route và service; nhận đích CNTT hoặc NULL, kiểm phạm vi tài liệu hiện tại và giữ điều kiện lọc trong mutation.
- API quản trị tài khoản yêu cầu SYSTEM_ADMIN và lọc người dùng CNTT. Thay đổi quyền được tuần tự hóa trong transaction, đọc lại quyền người gọi để tránh dùng quyền vừa bị thu hồi.
- Màn hình chat không còn chọn khoa; trang quản trị chỉ quản lý tài khoản và ma trận quyền. URL đơn vị cũ chuyển về tài khoản.

## Nâng cấp CSDL đang có

Migration `20260905090000_cntt_three_roles` đổi `STUDENT` → `USER`, `ADMIN` → `CONTENT_ADMIN`, thêm `SYSTEM_ADMIN`. Không xóa dữ liệu, không tự nâng tài khoản cũ thành SYSTEM_ADMIN.

Thực hiện trong cửa sổ bảo trì, sau khi xác định đúng DB và sao lưu. Backend cũ không hiểu enum mới; cần triển khai schema và mã nguồn cùng đợt.

1. Áp dụng migration và generate Prisma Client bằng các script `db:deploy`, `db:generate`.
2. Chỉ định **một tài khoản quản trị cũ còn hoạt động** làm quản trị viên đầu tiên:

   ```powershell
   cd server
   corepack pnpm exec tsx --env-file=.env scripts/bootstrap-admin.ts --code=MA_CAN_BO
   # Lệnh trên chỉ xem kế hoạch. Khi đúng tài khoản:
   corepack pnpm exec tsx --env-file=.env scripts/bootstrap-admin.ts --code=MA_CAN_BO --apply
   ```

3. Rà soát danh sách sinh viên CNTT thực tế và gán tư cách CNTT cho tài khoản cần giữ quyền. Bản seed cũ từng phân tán sinh viên lớp CNTT sang khoa khác để demo; migration không tự suy đoán đối tượng để gán lại.
4. Chạy mã mới, đăng nhập lại và thử đủ ba vai. Không dùng `db:seed` trên dữ liệu thật để chuyển đổi vì seed đặt lại mật khẩu mẫu và có thể sửa các tài liệu mồi.

DB mới phục vụ demo: migration rồi seed tạo một đơn vị CNTT, 57 sinh viên tra cứu và ba tài khoản cán bộ mẫu; `CB0142` là CONTENT_ADMIN, `CB0006` là SYSTEM_ADMIN. Dữ liệu cũ ngoài ngành không bị dọn/xóa tự động.

## Kiểm thử

```powershell
# DB thử nghiệm local riêng, không dùng DB trong server/.env:
docker exec tang-thu-db-1 createdb -U tangthu tangthu_cntt_test_20260905
node server/scripts/test-cntt-db.mjs
corepack pnpm --filter @tang-thu/server typecheck
corepack pnpm --filter @tang-thu/web typecheck
corepack pnpm --filter @tang-thu/web lint
```

Runner đọc thông tin Postgres Docker local từ `.env` gốc, khóa đích tại `127.0.0.1/tangthu_cntt_test_20260905`, tắt khóa Gemini trong tiến trình thử nghiệm. Bộ test quyền có fixture riêng, bao phủ route HTTP, service, truy vấn Prisma/SQL và JWT bị thu hồi quyền. Test có ghi dữ liệu chỉ chạy với tên DB thử nghiệm.

