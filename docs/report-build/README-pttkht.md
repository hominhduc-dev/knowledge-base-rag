# Báo cáo Đồ án Phân tích thiết kế hệ thống

Sản phẩm: `docs/Bao-cao-PTTKHT-So-Tay-Sinh-Vien-CNTT.docx` — 79 trang, 81 hình, 16 bảng.
Bố cục theo đề cương môn học và theo format báo cáo mẫu "Hệ thống bán vé xem phim".

## Tái tạo

```
cd docs/report-build
python gen_ch12.py     # sơ đồ Chương I + II  (quy trình, use case, trình tự, cộng tác)
python gen_ch3.py      # sơ đồ Chương III     (lớp, VOPC, trạng thái, hoạt động, ERD, giao diện)
python build_pttkht.py # dựng file .docx
```

Đóng file .docx trong Word trước khi chạy, nếu không bước ghi sẽ lỗi.

## Các tệp

| Tệp | Vai trò |
|---|---|
| `draw.py` | Bộ vẽ nền: hộp, mũi tên, hình người, ghi chú, ngắt dòng theo pixel |
| `flow.py` | Sơ đồ luồng, hoạt động, trạng thái, làn bơi |
| `uml.py` | Ca sử dụng, trình tự, cộng tác, lớp, lớp tham gia ca sử dụng |
| `ui.py` | Phác thảo giao diện |
| `gen_ch12.py` | Sinh ảnh Chương I và II |
| `gen_ch3.py` | Sinh ảnh Chương III |
| `report_doc.py` | Khung Word: style, hình, bảng, bảng đặc tả UC, khối mã |
| `build_pttkht.py` | Nội dung Chương I, II và điểm vào |
| `chapters34.py` | Nội dung Chương III và IV |
| `usecases.json` | Bản sao mảng `useCases` trong `docs/use-cases/sequences/build_per_usecase_sequences.mjs` |
| `pttkht/` | Ảnh sinh ra (81 tệp) |

## Ràng buộc khi sửa

- **Ảnh rộng tối đa 1700 px, chữ tối thiểu 25 px.** Ảnh đặt vừa 15,5 cm trên A4;
  vượt tỷ lệ đó thì chữ in ra dưới 6 pt và không đọc được.
- Từ điển dữ liệu trong `chapters34.py` phải khớp `server/prisma/schema.prisma`.
  Phần DDL ở mục 3.2 đọc thẳng từ migration nên tự đồng bộ.
- Danh mục ca sử dụng đọc từ `docs/use-cases/README.md`; luồng thông điệp đọc từ
  `usecases.json`. Đổi ở nguồn rồi chạy lại, đừng sửa tay trong báo cáo.

## Kiểm tra bản in

```powershell
$w = New-Object -ComObject Word.Application
$doc = $w.Documents.Open("D:\Source_code\knowledge-base-rag\docs\Bao-cao-PTTKHT-So-Tay-Sinh-Vien-CNTT.docx", $false, $true)
$doc.ExportAsFixedFormat("D:\Source_code\knowledge-base-rag\docs\report-build\rendered\pttkht.pdf", 17)
$doc.Close(0); $w.Quit()
```

Rồi rasterize bằng `pypdfium2` để soi từng trang. Thư mục `rendered/` là bản QA,
không phải sản phẩm bàn giao (đã ignore).
