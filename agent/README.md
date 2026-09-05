# Agent workspace — Sổ Tay Sinh Viên CNTT

Đây là thư mục handoff đúng theo yêu cầu người dùng; không dùng `.agent/`.

## Thứ tự đọc

1. `agent/STATUS.md`: trạng thái đã kiểm chứng và giới hạn.
2. `agent/HANDOFF.md`: thay đổi gần nhất, bước tiếp theo.
3. `docs/PHAM-VI-CNTT.md`: phạm vi hiện hành, ba vai và kế hoạch nâng cấp CSDL.
4. `docs/phan-quyen.md`: quyền hạn hiện hành.
5. Chạy `git status --short` trước khi sửa.

## Quyết định phải giữ

- Đối tượng: sinh viên ngành CNTT, Đại học Kiến trúc Đà Nẵng.
- Học phần Lập trình mạng: ưu tiên TCP/HTTP, REST/SSE, LAN, xử lý kết nối và đo đạc.
- Ba actor: Sinh Viên CNTT (USER), Giáo vụ khoa CNTT (CONTENT_ADMIN), Quản Trị Viên (SYSTEM_ADMIN). Giáo vụ quản lý nội dung trong phạm vi CNTT; không thêm chức năng quản trị nhiều khoa/đơn vị.
- Cùng phạm vi CNTT + quy định chung cho cả ba vai. Không xóa dữ liệu ngoài ngành để thu gọn sản phẩm.
- `HANDOFF-2026-09-04.md` và các phần v2 trong docs là lịch sử, không được dùng để phục hồi phạm vi đa khoa.

## Kết thúc mỗi phiên

Chạy kiểm tra phù hợp; cập nhật STATUS và HANDOFF theo mẫu. Phân biệt mã đã sửa, test đã chạy, migration đã áp dụng ở DB nào và trạng thái triển khai. Không gọi một tính năng “đã xong” chỉ vì đã có trong thiết kế.
