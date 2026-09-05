# Handoff — Sổ Tay Sinh Viên CNTT

## Thông tin

- Agent: Codex.
- Ngày: 05/09/2026.
- Nhánh: feat/thiet-ke-v2-docker-netlab.
- Commit nền: faad304; thay đổi phiên này chưa commit/push.
- Phạm vi: người dùng yêu cầu thu gọn cho sinh viên CNTT, Đại học Kiến trúc Đà Nẵng, học phần Lập trình mạng; chốt 3 actor Sinh Viên CNTT (USER), Giáo vụ khoa CNTT (CONTENT_ADMIN), Quản Trị Viên (SYSTEM_ADMIN); cập nhật trong agent/, không phải .agent/.
- Tên sản phẩm hiện hành: **Sổ Tay Sinh Viên CNTT**. Tên cũ đã được thay trong nhãn sản phẩm, tài liệu hiện hành và sơ đồ use case. Giữ nguyên định danh kỹ thuật `@tang-thu/*`, `tang-thu-token` và tên file `tang-thu-use-case.*` để không phá script, phiên trình duyệt và liên kết hiện có.

## Đã hoàn thành

- [x] Backend, Prisma enum/migration và giao diện dùng USER, CONTENT_ADMIN, SYSTEM_ADMIN.
- [x] Bỏ mô hình quản trị đa khoa khỏi trải nghiệm sản phẩm; cả ba vai chỉ đọc CNTT + quy định chung.
- [x] Lọc tư cách CNTT tại login và auth middleware trước khi gộp vai. JWT cũ không giữ quyền sau thay đổi.
- [x] Chặn ghi tài liệu ở route/service, kiểm nguồn/đích và giữ phạm vi trong mutation.
- [x] Chỉ SYSTEM_ADMIN quản lý tài khoản; không cho tự khóa/hạ vai. Mutation quyền được tuần tự hóa và kiểm quyền lại trong transaction.
- [x] Seed demo gọn: 1 đơn vị CNTT, 57 sinh viên, 3 cán bộ, 6 tài liệu/11 đoạn.
- [x] Bộ đánh giá cntt-v1: 27 câu; không ghi đè lịch sử golden-30.
- [x] Sơ đồ use case 3 vai và tài liệu hiện hành; lưu handoff trước thành HANDOFF-2026-09-04.md.
- [x] Đổi tên hiển thị từ Tàng Thư sang Sổ Tay Sinh Viên CNTT trong README, agent docs, docs hiện hành, UI header/sidebar/login, metadata, log server, eval/check và nguồn sinh sơ đồ.

## File thay đổi chính

| Nhóm | Nội dung |
|---|---|
| server/prisma/ | Enum, migration nâng cấp, seed CNTT |
| server/src/lib/roles.ts, scope.ts | Vai và phạm vi dùng chung |
| server/src/middleware/; modules/auth/ | Xác thực và role guards |
| server/src/modules/admin/ | Quản lý tài khoản CNTT chỉ bởi SYSTEM_ADMIN |
| server/src/modules/documents/ | Quyền ghi nội dung và chặn đích ngoài ngành |
| server/src/eval/; rag/prompt.ts | Phạm vi đánh giá và câu trả lời |
| server/src/modules/retrieval/*test.ts | Test ba vai, scope và HTTP/JWT |
| server/scripts/bootstrap-admin.ts | Chỉ định quản trị đầu tiên, mặc định xem kế hoạch |
| server/scripts/test-cntt-db.mjs | Migration/seed/test vào DB local riêng |
| web/src/ | Ba vai, ma trận quyền, chọn nhóm tài liệu, bỏ chọn khoa/SSO |
| docs/PHAM-VI-CNTT.md, phan-quyen.md | Đặc tả hiện hành; tài liệu v2 có thông báo bị thay thế |
| docs/use-cases/ | HTML, SVG, PlantUML và script dựng sơ đồ |
| README.md, agent/*.md, web/src/app/layout.tsx, Header/Sidebar/Login | Tên sản phẩm Sổ Tay Sinh Viên CNTT |
| docs/use-cases/so-tay-sequence-3-layer.* | Sequence diagram 3 lớp tạo bằng Archify |

## Quyết định kỹ thuật

1. Giữ bảng departments/department_members để không phá dữ liệu, nhưng chỉ dùng tư cách CNTT. Vai cao ở khoa khác không mở quyền.
2. Không có nhánh SYSTEM_ADMIN bỏ qua scope. Tài liệu chung vẫn áp dụng cho mọi người dùng hợp lệ.
3. CONTENT_ADMIN quản lý nội dung; SYSTEM_ADMIN quản lý tài khoản. Không có DEPARTMENT_ADMIN.
4. Migration đổi STUDENT → USER, ADMIN → CONTENT_ADMIN, thêm SYSTEM_ADMIN. Không tự đoán ai được nâng lên quản trị viên.
5. CLI bootstrap chỉ nhận tài khoản quản trị cũ còn hoạt động, chỉ dùng khi chưa có SYSTEM_ADMIN. Có dry-run rồi --apply.
6. Seed chỉ phục vụ demo, không dùng nâng cấp DB thật. Không xóa dữ liệu ngoài ngành.
7. Netlab/TCP/HTTP/SSE/LAN là trọng tâm học phần; không mở rộng bài toán quản trị đào tạo.

## Kiểm tra đã chạy

```powershell
corepack pnpm --filter @tang-thu/server db:generate
node server/scripts/test-cntt-db.mjs
corepack pnpm --filter @tang-thu/server typecheck
corepack pnpm --filter @tang-thu/server build
corepack pnpm --filter @tang-thu/web typecheck
corepack pnpm --filter @tang-thu/web lint
corepack pnpm --filter @tang-thu/web build
python docs/use-cases/build_diagrams.py
corepack pnpm --filter @tang-thu/web typecheck
node C:\Users\PC\.codex\skills\archify\bin\archify.mjs validate sequence docs/use-cases/so-tay-sequence-3-layer.sequence.json --quality showcase --json
node C:\Users\PC\.codex\skills\archify\bin\archify.mjs deliver sequence docs/use-cases/so-tay-sequence-3-layer.sequence.json docs/use-cases/so-tay-sequence-3-layer.html --quality showcase --json
node C:\Users\PC\.codex\skills\archify\bin\archify.mjs visual-check docs/use-cases/so-tay-sequence-3-layer.html --json
```

Kết quả: typecheck/lint/build đạt; 84/85 test đạt, 1 bỏ qua vì thiếu vector thật, 0 lỗi. Hai migration đã áp dụng thành công trên DB thử nghiệm local riêng. Bộ quyền có 16 test tích hợp SQL/Prisma/service/HTTP. Build frontend lần đầu bị chặn tải font, chạy lại có quyền mạng đã đạt. Sau đổi tên sản phẩm, đã chạy lại generator, reload trang use case trong trình duyệt và chạy `corepack pnpm --filter @tang-thu/web typecheck` đạt. Sequence diagram 3 lớp validate/deliver/visual-check bằng Archify đạt. Chưa chạy browser end-to-end trên ứng dụng.

## Chưa hoàn thành ở môi trường đang dùng

- [ ] Chọn DB cần nâng cấp và tài khoản SYSTEM_ADMIN đầu tiên; áp dụng migration/bootstrap và triển khai mã cùng đợt.
- [ ] Rà soát các sinh viên CNTT bị seed cũ gán sang KTR/XD; gán tư cách CNTT theo danh sách được xác nhận, không reset mật khẩu.
- [ ] Rà soát tài liệu chung cũ thực sự áp dụng cho CNTT.
- [ ] Chạy embedding/đánh giá thật và kiểm giao diện đủ 3 vai sau khi triển khai.
- [ ] Demo LAN, Wireshark, đo tải và độ trễ.

## Blocker

Không có blocker cho thay đổi mã nguồn. Việc kích hoạt trên DB đang dùng còn cần chọn tài khoản quản trị và kiểm tra đối tượng chuyển đổi. DB server/.env và container hiện tại chưa bị sửa; không được ghi là đã triển khai.

## Việc agent tiếp theo cần làm

1. Đọc docs/PHAM-VI-CNTT.md trước thiết kế v2; không phục hồi hai vai/đa khoa.
2. Kiểm tra git status, giữ thay đổi chưa commit của người dùng.
3. Dùng tên sản phẩm Sổ Tay Sinh Viên CNTT trong nội dung người dùng nhìn thấy; không đổi định danh package/storage/file `tang-thu` nếu không có yêu cầu riêng.
4. Nếu được giao triển khai, làm theo phần nâng cấp DB, xác nhận đối tượng quản trị đầu tiên; không tự chạy seed trên DB thật.
5. Sau triển khai, kiểm USER không ghi được tài liệu, CONTENT_ADMIN không vào được API tài khoản, SYSTEM_ADMIN phân quyền được, cả ba không đọc được khoa khác.

## Cách tiếp tục

Test độc lập: DB tangthu_cntt_test_20260905 đã tồn tại trong tang-thu-db-1. Chạy node server/scripts/test-cntt-db.mjs từ gốc repo. Không gọi lại createdb nếu DB đã có. Xem docs/use-cases/tang-thu-use-case.html và docs/use-cases/so-tay-sequence-3-layer.html; server preview tạm dùng cổng 8768.
