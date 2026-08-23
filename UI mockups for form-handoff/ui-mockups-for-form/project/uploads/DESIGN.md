# DESIGN.md — Tàng Thư

Hệ thống hỏi đáp tri thức học vụ cho trường đại học Việt Nam.

---

## 1. Bản chất sản phẩm

Sinh viên và cán bộ đặt câu hỏi về quy chế đào tạo, thủ tục hành chính, đề cương môn học bằng tiếng Việt tự nhiên. Hệ thống trả lời dựa trên tài liệu nội bộ của trường và **luôn kèm trích dẫn** đến đúng điều khoản trong văn bản gốc. Mỗi người chỉ thấy tài liệu thuộc khoa mình cộng với tài liệu toàn trường.

Ba màn chính: hội thoại · quản lý tài liệu · quản lý đơn vị và phân quyền.

**Điều quan trọng nhất về sản phẩm này:** nó xử lý dữ liệu mà một câu trả lời sai gây hậu quả thật — điều kiện tốt nghiệp, thời hạn nộp hồ sơ, quy định cảnh báo học vụ. Giao diện phải làm người dùng tin, và tin có căn cứ. Trích dẫn không phải chú thích trang trí; nó là bằng chứng.

---

## 2. Tinh thần thị giác

**Văn khố học thuật, không phải chatbot công nghệ.**

Hình dung một phòng lưu trữ tài liệu được số hóa cẩn thận: giấy ngà, mực đen, con dấu đỏ son, ngăn nắp và điềm đạm. Cảm giác cần đạt là *đáng tin và có trách nhiệm*, không phải *thông minh và nhanh nhẹn*.

**Tránh tuyệt đối:**
- Gradient tím–xanh và mọi biến thể của phong cách "AI startup"
- Hiệu ứng glassmorphism, neon glow, đổ bóng màu
- Biểu tượng tia sét, ngôi sao lấp lánh, bộ não, robot
- Emoji trong giao diện
- Nền tối mặc định kiểu terminal
- Viền dày và bo góc lớn

**Hướng đến:**
- Bố cục kiểu ấn phẩm học thuật: lề rộng, cột chữ dễ đọc, phân cấp rõ bằng cỡ chữ chứ không bằng màu
- Phân tách bằng khoảng trắng và đường kẻ mảnh, hạn chế thẻ có viền
- Chuyển động tối giản, chỉ dùng khi truyền đạt trạng thái

---

## 3. Màu

### Sáng (mặc định)

| Token | Giá trị | Dùng cho |
|---|---|---|
| `bg-base` | `#FAF7F0` | Nền trang — giấy ngà ấm |
| `bg-surface` | `#FFFDF8` | Thẻ, panel, khung nội dung |
| `bg-sunken` | `#F1EBE0` | Vùng chìm: sidebar, ô nhập, trích đoạn |
| `border-subtle` | `#E3DACB` | Đường kẻ phân tách |
| `border-strong` | `#C9BCA6` | Viền ô nhập khi focus |
| `text-primary` | `#1F1B16` | Chữ chính — mực đậm, không dùng đen tuyệt đối |
| `text-secondary` | `#5C544A` | Chữ phụ, nhãn, siêu dữ liệu |
| `text-muted` | `#8B8073` | Chữ mờ, gợi ý, dấu thời gian |
| `accent` | `#9B2C2C` | **Đỏ son** — trích dẫn, hành động chính |
| `accent-hover` | `#7F2222` | Trạng thái hover của accent |
| `accent-soft` | `#F6E7E4` | Nền nhạt khi làm nổi trích đoạn |
| `indigo` | `#2C4A7C` | **Chàm** — huy hiệu phạm vi, liên kết |
| `indigo-soft` | `#E6EBF3` | Nền huy hiệu phạm vi |
| `success` | `#3F6B3F` | Tài liệu đã xử lý xong |
| `warning` | `#8A6A1F` | Đang xử lý |
| `danger` | `#8C3A2E` | Lỗi xử lý tài liệu |

### Tối (dùng khi đọc lâu)

| Token | Giá trị |
|---|---|
| `bg-base` | `#17140F` |
| `bg-surface` | `#201C16` |
| `bg-sunken` | `#2A251E` |
| `border-subtle` | `#3A342B` |
| `text-primary` | `#EDE6D9` |
| `text-secondary` | `#B3A897` |
| `accent` | `#D97A6C` |
| `indigo` | `#8FA9D4` |

### Quy tắc dùng màu — bắt buộc

**Đỏ son chỉ xuất hiện ở hai nơi:** chỉ báo trích dẫn và nút hành động chính. Không dùng cho tiêu đề, không dùng cho biểu tượng trang trí, không dùng cho viền chung. Toàn màn hình nên có rất ít đỏ — chính vì hiếm nên mắt bị hút vào trích dẫn, đúng ý đồ sản phẩm.

**Chàm dành riêng cho phạm vi và liên kết.** Người dùng phải luôn biết mình đang hỏi trong phạm vi khoa nào; chàm là tín hiệu của thông tin đó.

Phân cấp thông tin dựng bằng **cỡ chữ, độ đậm và khoảng cách** — không bằng màu.

---

## 4. Chữ

### Font

| Vai trò | Font | Dự phòng |
|---|---|---|
| Tiêu đề | **Lora** | Source Serif 4, Noto Serif |
| Nội dung & giao diện | **Be Vietnam Pro** | Inter, system-ui |
| Mã, số hiệu văn bản | **JetBrains Mono** | ui-monospace |

**Ràng buộc bắt buộc:** mọi font phải hỗ trợ đầy đủ dấu tiếng Việt. Trước khi chốt, hiển thị thử dòng kiểm tra sau ở cả kiểu tiêu đề và kiểu nội dung, ở mọi độ đậm:

```
ữ ỹ ặ ổ ườ ẫ ợ ĩ ẳ ự ỗ ằ
Điều kiện xét tốt nghiệp — Quy chế đào tạo Đại học
```

Nếu bất kỳ dấu nào bị cắt, chồng lên chữ, lệch vị trí hoặc hiện ô vuông thì đổi font, không chấp nhận. Đây là lỗi phổ biến nhất với font serif phương Tây và phải phát hiện ở bước design system, không phải lúc dựng màn.

Không dùng font quá 3 họ. Không dùng font display trang trí.

### Thang cỡ chữ

| Token | Cỡ / Dòng | Dùng cho |
|---|---|---|
| `display` | 40 / 48, Lora 600 | Tiêu đề trang chủ |
| `h1` | 30 / 38, Lora 600 | Tiêu đề màn |
| `h2` | 22 / 30, Lora 600 | Tiêu đề mục |
| `h3` | 17 / 26, Be Vietnam Pro 600 | Tiêu đề thẻ, tên tài liệu |
| `body-lg` | 17 / 30, Be Vietnam Pro 400 | **Câu trả lời của hệ thống** |
| `body` | 15 / 26, Be Vietnam Pro 400 | Nội dung chung |
| `body-sm` | 14 / 22, Be Vietnam Pro 400 | Trích đoạn nguồn |
| `caption` | 13 / 20, Be Vietnam Pro 500 | Nhãn, siêu dữ liệu |
| `mono` | 13 / 20, JetBrains Mono 400 | Số hiệu văn bản, mã |

Câu trả lời dùng `body-lg` với giãn dòng rộng vì người dùng sẽ đọc kỹ từng chữ — đây là văn bản pháp quy, không phải tin nhắn chat.

Cột chữ tối đa 68 ký tự. Tiếng Việt nhiều dấu nên cần giãn dòng rộng hơn tiếng Anh khoảng 10%.

---

## 5. Khoảng cách và bố cục

Thang 4px: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`

Bo góc: `sm 4px` (huy hiệu, nhãn) · `md 8px` (nút, ô nhập) · `lg 12px` (thẻ, panel). Không bo tròn hơn 12px, trừ avatar.

Đổ bóng dùng rất hạn chế, chỉ cho lớp nổi (dropdown, modal, bottom sheet):
```
shadow-raised: 0 1px 2px rgba(31,27,22,.06), 0 4px 12px rgba(31,27,22,.06)
shadow-overlay: 0 8px 32px rgba(31,27,22,.12)
```
Thẻ trong luồng chính **không đổ bóng** — phân tách bằng nền và đường kẻ.

### Khung màn hội thoại (desktop)

```
┌──────────┬────────────────────────┬──────────────┐
│ Sidebar  │  Luồng hội thoại       │ Panel nguồn  │
│ 260px    │  linh hoạt, max 720px  │ 340px        │
│          │                        │              │
│ Huy hiệu │  Câu hỏi (phải)        │ Thẻ nguồn    │
│ phạm vi  │  Câu trả lời (trái)    │ theo thứ tự  │
│ Lịch sử  │  kèm [1][2]            │ trích dẫn    │
│          │  ─────────────────     │              │
│          │  Ô nhập cố định đáy    │              │
└──────────┴────────────────────────┴──────────────┘
```

Dưới 1280px: panel nguồn thu thành ngăn kéo trượt từ phải.
Dưới 768px: sidebar thành ngăn kéo, panel nguồn thành bottom sheet, chỉ báo phạm vi chuyển lên thanh trên cùng.

---

## 6. Thành phần đặc trưng

Ba thành phần dưới đây là bản sắc của sản phẩm. Chúng phải được dựng kỹ hơn mọi thành phần khác.

### 6.1 Chỉ báo trích dẫn — `<Citation>`

Số thứ tự chèn giữa câu văn, ngay sau mệnh đề mà nó chứng minh.

- Hình thức: số trong dấu ngoặc vuông, màu `accent`, cỡ nhỏ hơn chữ thân 2px, nâng lên như chỉ số trên
- Nền `accent-soft`, bo `sm`, đệm ngang 4px
- Hover: nền đậm hơn, hiện tooltip tên tài liệu và điều khoản
- Bấm: panel nguồn cuộn đến thẻ tương ứng và làm nổi trích đoạn bằng `accent-soft` trong 1.5 giây
- Trạng thái đang chọn: viền dưới `accent` dày 2px

Ví dụ trong câu:
> Sinh viên bị cảnh báo học vụ khi điểm trung bình học kỳ dưới 1.0 **[1]** hoặc nợ quá 24 tín chỉ **[2]**.

### 6.2 Thẻ nguồn — `<SourceCard>`

Nằm ở panel phải, một thẻ cho mỗi trích dẫn.

Cấu trúc từ trên xuống:
- Số thứ tự khớp với chỉ báo, đặt góc trái trên, màu `accent`
- Tên tài liệu, `h3`
- Vị trí chính xác: `Điều 12, Khoản 3 · Trang 8`, dùng `mono` cho số hiệu
- Trích đoạn 2–3 dòng, nền `bg-sunken`, viền trái 2px màu `border-strong`, chữ `body-sm`
- Nhãn khoa ở đáy nếu tài liệu thuộc phạm vi khoa
- Liên kết "Mở tài liệu gốc" màu `indigo`

Trạng thái được làm nổi: viền trái đổi sang `accent`, nền `accent-soft`.

### 6.3 Huy hiệu phạm vi — `<ScopeBadge>`

Cho biết người dùng đang hỏi trong phạm vi nào. Luôn hiển thị, không bao giờ ẩn.

- Hình thức: nền `indigo-soft`, chữ `indigo`, bo `sm`, cỡ `caption`
- Nội dung: `Khoa Công nghệ Thông tin` hoặc `Toàn trường`
- Vị trí: đầu sidebar trên desktop, thanh trên cùng trên mobile
- Nếu người dùng thuộc nhiều đơn vị: dạng nút chọn, mở dropdown

---

## 7. Thành phần chung

### Nút
- **Chính:** nền `accent`, chữ trắng, đệm 12/20, bo `md`, đậm 600
- **Phụ:** nền trong suốt, viền `border-strong`, chữ `text-primary`
- **Chìm:** không viền không nền, chữ `text-secondary`
- **Nguy hiểm:** nền `danger`
- Focus: vòng ngoài 2px màu accent, cách 2px

### Ô nhập câu hỏi
Cố định đáy luồng hội thoại. Nền `bg-surface`, viền `border-subtle`, bo `lg`, đệm 14/16. Tự giãn cao đến tối đa 5 dòng. Nút gửi màu `accent` đặt trong ô, góc phải. Khi focus: viền `border-strong`.

Chữ gợi ý mẫu: *"Hỏi về quy chế, thủ tục, đề cương môn học…"*

### Bảng tài liệu
Cột: Tên · Khoa · Trạng thái · Số đoạn · Cập nhật · Thao tác.
Hàng cao 56px, đường kẻ dưới `border-subtle`, không kẻ dọc, hover đổi nền sang `bg-sunken`.

### Huy hiệu trạng thái
Chấm tròn 6px kèm chữ, không dùng thẻ nền đậm:
`Đang xử lý` (warning) · `Sẵn sàng` (success) · `Lỗi` (danger)

### Khu vực kéo thả tải lên
Viền đứt `border-strong`, nền `bg-sunken`, bo `lg`, cao 180px. Khi kéo file vào: viền chuyển `accent`, nền `accent-soft`.

---

## 8. Trạng thái

Bốn trạng thái dưới đây phải được thiết kế đầy đủ, không được coi là phụ.

### Không tìm thấy nguồn — quan trọng nhất

Khi không có tài liệu nào chứa câu trả lời, hệ thống nói thẳng thay vì suy đoán.

Màn này phải trông **đáng tin, không giống lỗi**. Không icon cảnh báo, không màu đỏ, không nền tô. Chỉ là một câu trả lời điềm đạm trên nền `bg-sunken` với viền trái `border-strong`:

> Không tìm thấy thông tin này trong tài liệu hiện có của Khoa Công nghệ Thông tin và tài liệu toàn trường.
>
> Câu hỏi này có thể thuộc quy định chưa được số hóa. Anh/chị vui lòng liên hệ Giáo vụ khoa để được xác nhận chính thức.

Kèm nút phụ: "Đề xuất bổ sung tài liệu".

Sự thành thật ở trạng thái này là điểm bán hàng của sản phẩm — thiết kế phải làm nó trông như một tính năng, không như một thất bại.

### Đang tra cứu
Ba giai đoạn hiển thị nối tiếp, chữ `caption` màu `text-muted`, không dùng spinner quay:
`Đang tìm trong tài liệu…` → `Đã tìm thấy 5 đoạn liên quan` → chữ trả lời bắt đầu chảy từng từ, con trỏ nhấp nháy màu `accent`

### Rỗng — chưa có hội thoại
Tiêu đề `h2`: *"Hỏi bất cứ điều gì về quy chế học vụ"*
Bên dưới là 4 câu hỏi mẫu dạng nút phụ, bấm được:
- Điều kiện xét tốt nghiệp là gì?
- Bao nhiêu tín chỉ thì bị cảnh báo học vụ?
- Thủ tục xin bảo lưu kết quả học tập?
- Hạn nộp học phí học kỳ này?

### Lỗi hệ thống
Thông báo ngắn, một dòng, kèm nút "Thử lại". Không hiện chi tiết kỹ thuật cho người dùng cuối.

---

## 9. Ngôn ngữ và nội dung

**Toàn bộ giao diện bằng tiếng Việt có dấu đầy đủ.** Mọi nội dung mẫu trong bản thiết kế phải là câu hỏi và tài liệu học vụ thật, không dùng chữ giả Lorem ipsum.

Xưng hô: gọi người dùng là *anh/chị*, hệ thống không tự xưng ngôi thứ nhất. Viết câu ngắn, giọng hành chính trung tính, không thân mật quá và không máy móc.

Tài liệu mẫu dùng trong bản thiết kế:
- Quy chế đào tạo trình độ đại học
- Sổ tay sinh viên
- Quy định về đồ án tốt nghiệp — Khoa Công nghệ Thông tin
- Hướng dẫn thủ tục hành chính — Phòng Đào tạo

Đơn vị mẫu: Khoa Công nghệ Thông tin · Khoa Kiến trúc · Khoa Xây dựng · Phòng Đào tạo · Phòng Công tác Sinh viên

Vai trò: Sinh viên · Giảng viên · Giáo vụ khoa · Quản trị viên

---

## 10. Tiếp cận

- Tương phản chữ chính trên nền đạt tối thiểu 4.5:1; chữ lớn 3:1
- Chỉ báo trích dẫn không được phân biệt chỉ bằng màu — luôn có dấu ngoặc vuông và số
- Mọi thao tác dùng chuột đều thao tác được bằng bàn phím; vòng focus rõ ràng
- Vùng chạm trên mobile tối thiểu 44×44px
- Tôn trọng `prefers-reduced-motion`: tắt hiệu ứng chữ chảy, hiện nguyên câu trả lời
