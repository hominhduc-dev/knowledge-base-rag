# Đặc tả phân quyền — Tàng Thư

**Chốt 22/08/2026** · Đây là đặc tả cho `role.middleware.ts`, `retrieval.sql.ts` và `seed.ts`. Sửa file này thì phải sửa cả ba nơi đó.

---

## 1. Bốn vai và ai được gán

Tổ chức thật trong một trường có khoảng bảy chức danh, nhưng chúng chỉ tạo ra **bốn mức quyền khác nhau**. Không thêm vai thứ năm — thêm vai là phình phạm vi, đúng rủi ro mức "Cao" trong Mục 11.

| Vai | Người thật được gán |
|---|---|
| **VIEWER** | Sinh viên |
| **CONTRIBUTOR** | Giảng viên · Cố vấn học tập · Chủ nhiệm bộ môn |
| **EDITOR** | Giáo vụ khoa · Trợ lý công tác sinh viên · Trưởng/Phó khoa · chuyên viên phòng ban |
| **ADMIN** | Phòng Đào tạo |

Ba điều dễ nhầm:

- **Trưởng khoa là EDITOR, không phải ADMIN.** ADMIN ở đây là quản trị *hệ thống* (tạo đơn vị, phân quyền, cấu hình), không phải quyền hành chính. Đừng ánh xạ chức vụ thành quyền phần mềm.
- **Cố vấn học tập không cần vai riêng** — họ chỉ cần đọc tài liệu của khoa, đúng bằng CONTRIBUTOR.
- **"Đơn vị" gồm cả phòng ban**, không chỉ khoa. Phòng Đào tạo là một đơn vị; quy chế toàn trường thì gắn phạm vi `GLOBAL` chứ không thuộc đơn vị nào.

---

## 2. Mô hình gán quyền

**Một người dùng thuộc đúng một đơn vị và giữ đúng một vai.**

```prisma
model User {
  id           String     @id @default(uuid())
  email        String     @unique
  passwordHash String
  role         Role                       // VIEWER | CONTRIBUTOR | EDITOR | ADMIN
  departmentId String                     // luôn có, kể cả ADMIN
  department   Department @relation(...)
}
```

Hệ quả đã cân nhắc và chấp nhận: giảng viên dạy hai khoa phải có hai tài khoản. Trong 8 tuần, đây là đánh đổi đúng — bảng `memberships` nhiều-nhiều làm mọi truy vấn phải JOIN thêm và tốn thêm 2–3 ngày của TV4 mà không minh họa thêm được năng lực nào.

### Không có đăng ký — tài khoản do nhà trường cấp

Hệ thống chỉ có màn **đăng nhập**. Không có `POST /auth/register`, không có trang `(auth)/register`.

Lý do không chỉ là cho giống thực tế. Nếu người dùng tự đăng ký và tự chọn khoa, bất kỳ ai cũng tạo được tài khoản khai mình thuộc Khoa Kinh tế rồi đọc toàn bộ tài liệu khoa đó — cơ chế cách ly bị vô hiệu ngay tại cửa vào, trong khi bộ kiểm thử vẫn xanh vì nó dùng tài khoản seed chứ không đi qua đường đăng ký.

Người dùng đăng nhập bằng **mã số sinh viên hoặc email trường** — một ô nhập duy nhất, hệ thống tự phân biệt bằng dấu `@`. Cột `users.code` giữ MSSV với sinh viên và mã cán bộ với các vai còn lại; cả `code` lẫn `email` đều duy nhất nên không bao giờ mơ hồ.

Luồng cấp tài khoản:

1. ADMIN tạo tài khoản ở màn quản trị: mã · email · họ tên · vai · đơn vị · mật khẩu tạm
2. Nhà trường chuyển mật khẩu tạm cho người dùng
3. Người dùng đăng nhập rồi tự đổi mật khẩu qua `PUT /auth/password`

Nhờ vậy `departmentId` **luôn có giá trị** — không cần cho phép rỗng, và `retrieval.sql.ts` không phải xử lý trường hợp người dùng chưa được gán đơn vị.

Bốn endpoint liên quan, tất cả đều chỉ ADMIN gọi được:

```
POST   /users              tạo tài khoản
PATCH  /users/:id          đổi vai, đổi đơn vị
PATCH  /users/:id/disable  vô hiệu hóa (không xóa — xóa làm gãy khóa ngoại)
GET    /users              danh sách
```

Thêm cột `isActive Boolean @default(true)` trên `User`; `identity.service.ts` từ chối đăng nhập khi `isActive = false`.

Ngoài phạm vi, cố ý loại trừ: nhập hàng loạt từ CSV, quên mật khẩu qua email, đăng nhập một lần (SSO) với hệ thống trường.

### Phạm vi tài liệu

Tài liệu có hai mức phạm vi:

```prisma
enum DocumentScope { GLOBAL, DEPARTMENT }
```

- `GLOBAL` — quy chế toàn trường, mọi người đọc được
- `DEPARTMENT` — chỉ người thuộc đúng đơn vị đó đọc được

---

## 3. Ma trận phân quyền

| Chức năng | VIEWER | CONTRIBUTOR | EDITOR | ADMIN |
|---|:-:|:-:|:-:|:-:|
| Hỏi đáp trong phạm vi của mình | ✓ | ✓ | ✓ | ✓ |
| Xem danh sách tài liệu trong phạm vi | ✓ | ✓ | ✓ | ✓ |
| Mở file gốc (signed URL) | ✓ | ✓ | ✓ | ✓ |
| Đề xuất tài liệu (chờ duyệt) | | ✓ | ✓ | ✓ |
| Upload · sửa · gỡ tài liệu của đơn vị mình | | | ✓ | ✓ |
| Duyệt đề xuất của CONTRIBUTOR | | | ✓ | ✓ |
| Xem người dùng trong đơn vị mình | | | ✓ | ✓ |
| Đổi mật khẩu của chính mình | ✓ | ✓ | ✓ | ✓ |
| Tạo tài khoản · vô hiệu hóa tài khoản | | | | ✓ |
| Tạo · sửa · xóa đơn vị | | | | ✓ |
| Đổi vai và đơn vị của người dùng | | | | ✓ |
| Chạy bộ đánh giá, xem `eval_runs` | | | | ✓ |

Bảng này là đặc tả trực tiếp cho `requireRole()`. Thêm dòng ở đây thì thêm test ở `tests/scope-isolation.test.ts`.

---

## 4. Quy tắc phạm vi — chỉ được viết ở MỘT chỗ

Mọi truy vấn chạm tài liệu hoặc đoạn văn đều phải đi qua đúng một hàm dựng điều kiện lọc, đặt trong `apps/backend/src/modules/retrieval/retrieval.sql.ts`:

```sql
-- người dùng thường
WHERE (c.scope = 'GLOBAL' OR c.department_id = $userDepartmentId)

-- ADMIN: bỏ điều kiện trên
```

Ba ràng buộc bắt buộc:

1. **Lọc nằm trong `WHERE`, chạy trước khi xếp hạng.** Lấy top-k rồi mới lọc thì kết quả có thể rỗng hoặc thiếu — đó là lý do cột `department_id` được lặp xuống bảng `chunks` (ADR 002).
2. **Không kiểm tra phạm vi ở controller.** Mục tiêu kỹ thuật số 1 của đồ án là kiểm soát ở *tầng truy vấn*. Kiểm ở controller rồi truy vấn không lọc thì test Sprint 3 vẫn đỏ.
3. **Nhánh ADMIN phải là một câu lệnh riêng biệt rõ ràng**, không phải `OR role = 'ADMIN'` nhét chung — viết chung là chỗ dễ vô tình mở quyền cho vai khác nhất.

File gốc trên Supabase Storage cũng theo quy tắc này: bucket để **private**, backend kiểm tra phạm vi rồi mới cấp signed URL có hạn. Bucket public là rò rỉ ngay, dù SQL có lọc đúng.

---

## 5. Dữ liệu seed

Đã hiện thực trong `apps/backend/prisma/seed.ts`, khớp với dữ liệu giả lập của giao diện.

Năm đơn vị:

| Mã | Tên | Loại |
|---|---|---|
| `CNTT` | Khoa Công nghệ Thông tin | Khoa |
| `KTR` | Khoa Kiến trúc | Khoa |
| `XD` | Khoa Xây dựng | Khoa |
| `PDT` | Phòng Đào tạo | Phòng ban |
| `CTSV` | Phòng Công tác Sinh viên | Phòng ban |

**Sáu cán bộ.** Bố trí có chủ đích để kiểm thử rò rỉ theo **cả hai chiều** — giáo vụ ở hai khoa khác nhau. Chỉ một chiều thì bộ kiểm thử có thể xanh trong khi vẫn rò rỉ chiều ngược lại.

| Mã | Email | Vai | Đơn vị |
|---|---|---|---|
| `CB0231` | `khoa.da@dau.edu.vn` | CONTRIBUTOR | CNTT |
| `CB0142` | `hoa.tt@dau.edu.vn` | EDITOR | CNTT |
| `CB0388` | `dat.pq@dau.edu.vn` | EDITOR | XD |
| `CB0205` | `bang.lv@dau.edu.vn` | EDITOR | KTR |
| `CB0417` | `nam.vd@dau.edu.vn` | EDITOR | CTSV |
| `CB0006` | `ha.nt@dau.edu.vn` | ADMIN | PDT |

**Năm mươi bảy sinh viên — dữ liệu thật**, trích từ danh sách điểm danh lớp học phần *Lập trình mạng (NEP30103 - 23CT3)*, học kỳ 1 năm học 2026–2027.

- Mã số sinh viên vào cột `code`, họ đệm và tên vào `fullName`
- Email theo quy tắc `<tên>_<mã sinh viên>@dau.edu.vn`, ví dụ `duc_2351220193@dau.edu.vn`
- Phân khoa theo **nhóm học tập**: mỗi nhóm vào trọn một khoa, luân phiên CNTT → KTR → XD. Cách này tất định, giữ các bạn cùng nhóm chung khoa, và ra tỉ lệ **CNTT 21 · KTR 18 · XD 18**
- Nhóm học tập không được lưu vào cơ sở dữ liệu — lược đồ không có bảng tương ứng

Bốn tài khoản tiện dùng khi kiểm thử:

| Mã | Email | Họ tên | Đơn vị |
|---|---|---|---|
| `2351220193` | `duc_2351220193@dau.edu.vn` | Hồ Minh Đức | CNTT |
| `2351220208` | `anh_2351220208@dau.edu.vn` | Trương Xuân Anh | CNTT |
| `2351220221` | `hieu_2351220221@dau.edu.vn` | Võ Minh Hiếu | KTR |
| `2351220145` | `huyen_2351220145@dau.edu.vn` | Phùng Thị Thanh Huyền | XD |

Đăng nhập được bằng **mã hoặc email**, cùng một mật khẩu.

Tất cả tài khoản seed dùng chung mật khẩu `Tangthu@123` cho tiện demo và chấm bài. Ghi rõ trong README.

Bảy tài liệu: 3 văn bản `GLOBAL`, 3 của CNTT, 1 của XD — trong đó có **một cặp đối chứng** quan trọng:

| Tài liệu | Đơn vị | Nội dung |
|---|---|---|
| `88/QĐ-CNTT` | CNTT | Nhận đồ án khi tích lũy tối thiểu **105 tín chỉ** |
| `77/QĐ-XD` | XD | Nhận đồ án khi tích lũy tối thiểu **90 tín chỉ** |

Cùng chủ đề, khác con số. Sinh viên CNTT hỏi về điều kiện nhận đồ án mà nhận được con số 90 tức là đã rò rỉ phạm vi — con số khác nhau khiến lỗi lộ ra ngay, không cần đọc kỹ.

Ba tài liệu còn lại phủ các trạng thái khác: `PROCESSING` + `PROPOSED` (đề cương do CONTRIBUTOR đề xuất, chờ duyệt) và `FAILED` (bản scan không trích được văn bản).

Vì không có đăng ký, **seed chính là cách duy nhất có tài khoản để demo** — nếu seed hỏng thì không ai đăng nhập được, kể cả ADMIN. Đưa `seed.ts` vào CI để phát hiện sớm.

---

## 6. Bảy trường hợp kiểm thử bắt buộc

`tests/scope-isolation.test.ts` — mốc sống còn của Sprint 3. Đạt cả bảy mới coi là qua mốc.

| # | Tình huống | Kỳ vọng |
|---|---|---|
| 1 | `sv.cntt` hỏi câu chỉ có đáp án trong tài liệu của KT | Trả "không có trong tài liệu"; không đoạn văn nào của KT lọt vào ngữ cảnh |
| 2 | `sv.cntt` gọi `GET /documents` | Không có tài liệu nào của KT trong kết quả |
| 3 | `sv.cntt` xin signed URL của một tài liệu KT (biết trước id) | 403 |
| 4 | `gv.cntt` (CONTRIBUTOR) gọi `POST /documents` | 403 |
| 5 | `gvu.cntt` (EDITOR) sửa tài liệu của KT | 403 |
| 6 | `sv.cntt` và `sv.kt` cùng hỏi về quy chế toàn trường | Cả hai đều nhận được, cùng trích dẫn |
| 7 | `admin` tìm kiếm | Thấy tài liệu của cả CNTT lẫn KT |

Trường hợp 1 là quan trọng nhất và cũng dễ bỏ sót nhất: phải khẳng định **không có chunk nào của khoa khác lọt vào ngữ cảnh gửi cho Gemini**, chứ không chỉ kiểm tra câu trả lời cuối cùng. Câu trả lời có thể vô tình đúng trong khi truy hồi đã rò rỉ.
