# Kết quả kiểm tra CNTT — 05/09/2026

- DB thử nghiệm: tangthu_cntt_test_20260905, localhost:5432; tách khỏi DB ứng dụng.
- Migration: 20260829031547_init + 20260905090000_cntt_three_roles; thành công.
- Seed: 1 đơn vị, 57 sinh viên, 3 cán bộ, 6 tài liệu, 11 đoạn.
- Backend: 85 test / 17 suite; **84 pass, 0 fail, 1 skip**.
- Test bỏ qua: truyHoiLai cần vector thật của model hiện tại, DB thử nghiệm chưa có embedding.
- Phân quyền: 16 ca tích hợp, gồm scope đọc của 3 vai, chặn ngoài ngành, phân tách tài liệu/tài khoản, JWT sau đổi vai/khóa, chặn vai cao từ khoa khác và các HTTP status tương ứng.
- Backend typecheck/build, frontend typecheck/lint/build: đạt.
- Sơ đồ: đã kiểm hiển thị trên trình duyệt.
- Chưa đánh giá chất lượng RAG qua Gemini; chưa chạy browser end-to-end đủ 3 vai.

Tái chạy: node server/scripts/test-cntt-db.mjs từ gốc repo. Runner chỉ ghi DB thử nghiệm local được cố định tên, không dùng địa chỉ DB trong server/.env.
