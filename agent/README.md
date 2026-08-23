# Agent workspace — Tàng Thư

Thư mục này là nguồn thông tin handoff cho các coding agent làm việc trên dự án.

## File trong thư mục

- `STATUS.md`: trạng thái hiện tại của toàn dự án.
- `HANDOFF.md`: context kỹ thuật và hướng dẫn cho agent tiếp theo.
- `HANDOFF-TEMPLATE.md`: mẫu bắt buộc khi một agent kết thúc công việc.

## Trước khi bắt đầu

1. Đọc `agent/STATUS.md`.
2. Đọc `agent/HANDOFF.md`.
3. Đọc `docs/cau-truc-thu-muc.md`.
4. Chạy `git status --short` để kiểm tra thay đổi chưa commit.
5. Chỉ sửa file nằm trong phạm vi nhiệm vụ được giao.

## Trước khi kết thúc

1. Chạy test tương ứng với phần đã sửa.
2. Ghi lại file đã thay đổi và quyết định kỹ thuật quan trọng.
3. Cập nhật `agent/STATUS.md`.
4. Viết lại `agent/HANDOFF.md` bằng mẫu trong `HANDOFF-TEMPLATE.md`.
5. Ghi rõ blocker và việc tiếp theo; không ghi chung chung như “tiếp tục hoàn thiện”.

## Quy ước trạng thái

- `[x]`: đã hoàn thành và đã kiểm tra.
- `[~]`: đang thực hiện.
- `[ ]`: chưa bắt đầu.
- `[!]`: đang bị chặn.

`STATUS.md` chỉ mô tả trạng thái hiện tại. Lịch sử thay đổi chi tiết phải xem qua Git commits.
