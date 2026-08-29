# Đặc tả phân quyền — Tàng Thư

**Bản v2.0 · viết lại 29/08/2026 theo `THIET-KE-HE-THONG.md` v2.0**

Đây là đặc tả cho ba nơi trong mã nguồn. Sửa tài liệu này thì phải sửa cả ba:

| Tài liệu nói gì | Hiện thực ở đâu |
|---|---|
| Ai giữ vai nào | `server/prisma/seed.ts` |
| Vai nào làm được gì | `server/src/middleware/role.middleware.ts` |
| Ai thấy được gì | `server/src/lib/scope.ts` ← **quan trọng nhất** |

> **Thay đổi so với bản v1.** Bản cũ có bốn vai (`VIEWER` · `CONTRIBUTOR` · `EDITOR` ·
> `ADMIN`) và phạm vi gắn liền với vai qua cột `users.department_id`. Bản này rút còn
> **hai vai** và **tách phạm vi khỏi vai** qua bảng `department_members`. Lý do ở mục 2.

---

## 1. Hai vai và ai được gán

Tổ chức thật trong một trường có khoảng bảy chức danh, nhưng chúng chỉ tạo ra **hai
mức quyền khác nhau**. Không thêm vai thứ ba — thêm vai giữa kỳ là phình phạm vi.

| Vai | Người thật được gán | Làm được gì |
|---|---|---|
| `STUDENT` | Sinh viên · Giảng viên · Cố vấn học tập | Hỏi đáp và tra cứu trong phạm vi của mình |
| `ADMIN` | Giáo vụ khoa · Cán bộ Phòng Đào tạo | Thêm hết: quản lý tài liệu, người dùng, đơn vị, chạy bộ đánh giá |

Ba điều dễ nhầm:

- **Giảng viên là `STUDENT`, không phải một vai riêng.** Vai trả lời câu hỏi "được *làm*
  gì". Giảng viên chỉ cần *đọc* tài liệu của khoa mình — đúng bằng quyền `STUDENT`.
  Việc họ đọc được tài liệu Khoa CNTT còn sinh viên Khoa Kiến trúc thì không, là do
  **đơn vị**, không do vai. Đây là điểm cốt lõi của mục 2.
- **`ADMIN` là quản trị *hệ thống*, không phải quyền hành chính.** Đừng ánh xạ chức vụ
  thành quyền phần mềm.
- **"Đơn vị" gồm cả phòng ban**, không chỉ khoa. Phòng Đào tạo là một đơn vị; quy chế
  toàn trường thì **không thuộc đơn vị nào** (`documents.department_id IS NULL`).

---

## 2. Mô hình gán quyền

### Câu phải thuộc khi bảo vệ

> **VAI quyết định LÀM ĐƯỢC GÌ. ĐƠN VỊ quyết định THẤY ĐƯỢC GÌ.**

Hai sinh viên cùng vai `STUDENT` nhưng khác khoa vẫn nhận **hai tập kết quả khác nhau**,
vì phạm vi lấy từ bảng `department_members` chứ không từ cột `role`.

Tách hai trục này có một lợi ích cụ thể: thêm vai thứ ba sau này (nếu triển khai thật
cho trường) **không phải sửa câu truy vấn truy hồi** — quy tắc phạm vi nằm trọn trong
`lib/scope.ts` và không đọc tới `role` ngoài đúng một nhánh `ADMIN`.

### Quan hệ nhiều–nhiều

```prisma
model DepartmentMember {
  userId       String
  departmentId String
  role         MemberRole   // STUDENT | ADMIN

  @@unique([userId, departmentId])
}
```

Một người có thể thuộc **nhiều đơn vị**, mỗi tư cách mang một vai riêng. Giảng viên dạy
hai khoa có hai dòng ở bảng này thay vì hai tài khoản như bản v1.

**Vai hiệu dụng** trên toàn hệ thống được gộp lại trong `lib/roles.ts`:

```ts
export function effectiveRole(roles: readonly MemberRole[]): MemberRole {
  return roles.includes(MemberRole.ADMIN) ? MemberRole.ADMIN : MemberRole.STUDENT;
}
```

Hễ có **một** tư cách `ADMIN` thì hiệu dụng là `ADMIN`. Không có tư cách nào thì trả
`STUDENT` — mặc định là mức quyền **thấp nhất**. Mặc định mở là kiểu lỗi không ai phát
hiện cho tới khi đã muộn.

### Không có đăng ký — tài khoản do nhà trường cấp

Hệ thống chỉ có màn **đăng nhập**. Không có `POST /auth/register`, không có trang
`(auth)/register`, và **đừng thêm** hàm `register` vào `auth.service.ts`.

Lý do không chỉ là cho giống thực tế. Nếu người dùng tự đăng ký và tự chọn khoa, bất kỳ
ai cũng tạo được tài khoản khai mình thuộc Khoa Kiến trúc rồi đọc toàn bộ tài liệu khoa
đó — **cơ chế cách ly bị vô hiệu ngay tại cửa vào**, trong khi bộ kiểm thử vẫn xanh vì
nó dùng tài khoản seed chứ không đi qua đường đăng ký.

Người dùng đăng nhập bằng **mã số sinh viên hoặc email trường** — một ô nhập duy nhất,
hệ thống tự phân biệt bằng dấu `@`. Cả `users.code` lẫn `users.email` đều duy nhất nên
không bao giờ mơ hồ. Chuẩn hóa trước khi tra: email về **chữ thường**, mã về **chữ hoa**;
`seed.ts` và `auth.service.ts` phải chuẩn hóa giống hệt nhau.

> Phụ lục A của tài liệu thiết kế chỉ ghi đăng nhập bằng email. Hiện thực nhận **cả hai**
> — cần bổ sung vào phụ lục.

Luồng cấp tài khoản: ADMIN tạo tài khoản (mã · email · họ tên · đơn vị · vai · mật khẩu
tạm) → nhà trường chuyển mật khẩu tạm → người dùng tự đổi qua `PUT /auth/password`.

Vô hiệu hóa bằng `users.is_active = false`, **không xóa** — xóa làm gãy khóa ngoại từ
`documents.uploaded_by` và `conversations.user_id`.

Ngoài phạm vi, cố ý loại trừ: nhập hàng loạt từ CSV, quên mật khẩu qua email, đăng nhập
một lần (SSO).

### Phạm vi tài liệu

Không có cột `scope` riêng. Một cột `department_id` cho phép NULL đã mang đủ thông tin:

| `documents.department_id` | Nghĩa |
|---|---|
| `NULL` | **Toàn trường** — mọi người đọc được |
| có giá trị | Chỉ thành viên đúng đơn vị đó đọc được |

Hai cột (`scope` + `department_id`) như bản v1 là hai cơ hội lệch nhau, và cần thêm một
ràng buộc CHECK để chống mâu thuẫn. Một cột thì không có chuyện đó.

Cột `visibility SMALLINT` giữ lại làm dự phòng mở rộng, hiện chỉ dùng một giá trị (`1`).
Bỏ đi thì mở rộng sau phải migrate; giữ lại tốn không đồng nào.

---

## 3. Ma trận phân quyền

| Chức năng | `STUDENT` | `ADMIN` |
|---|:-:|:-:|
| Hỏi đáp trong phạm vi của mình | ✓ | ✓ |
| Xem danh sách tài liệu trong phạm vi | ✓ | ✓ |
| Mở file gốc | ✓ | ✓ |
| Đổi mật khẩu của chính mình | ✓ | ✓ |
| Upload · sửa · gỡ tài liệu | | ✓ |
| Chạy lại job xử lý thất bại | | ✓ |
| Xem và quản lý người dùng | | ✓ |
| Tạo · sửa đơn vị, gán thành viên | | ✓ |
| Chạy bộ đánh giá, xem `eval_runs` | | ✓ |

Bảng này là đặc tả trực tiếp cho `requireRole()`. Chỉ có hai vai nên **không cần thứ
hạng**: hoặc đòi `ADMIN`, hoặc không đòi gì.

```ts
export const requireAdmin = requireRole(MemberRole.ADMIN);
```

Thêm dòng ở bảng trên thì thêm test ở `scope-isolation.test.ts`.

---

## 4. Quy tắc phạm vi — chỉ được viết ở MỘT chỗ

Mọi truy vấn chạm `documents` hoặc `chunks` phải lấy điều kiện lọc từ
`server/src/lib/scope.ts`. Viết lại quy tắc ở chỗ khác là tạo một bản sao sẽ lệch đi
theo thời gian, và **bản lệch đó chính là chỗ rò rỉ**.

File này giữ **hai bản của cùng một quy tắc**, bắt buộc cùng nghĩa:

| Hàm | Dùng khi | Vì sao cần |
|---|---|---|
| `scopeWhere(user)` | Truy vấn qua Prisma | Danh sách tài liệu, đếm, CRUD |
| `scopeSql(user, alias)` | Truy vấn thô | Truy hồi cần `<=>` và `ts_rank`, Prisma không diễn đạt được |

```sql
-- người dùng thường
WHERE c.visibility <= 1
  AND (c.department_id IS NULL OR c.department_id = ANY($dept_ids::uuid[]))

-- ADMIN: nhánh riêng, trả TRUE
```

### Ba ràng buộc bắt buộc

1. **Bộ lọc nằm trong `WHERE`, chạy TRƯỚC khi xếp hạng.** Lấy top-k rồi mới lọc thì kết
   quả có thể **rỗng dù dữ liệu tồn tại** — lỗi im lặng, khó phát hiện khi thử tay. Đây
   là lý do `department_id` được lặp xuống bảng `chunks`; xem `docs/erd.md`.
2. **Không kiểm phạm vi ở controller.** Mục tiêu kỹ thuật số 2 của đồ án là kiểm soát ở
   *tầng truy vấn*. Kiểm ở controller rồi truy vấn không lọc thì `scope-isolation.test.ts`
   vẫn đỏ, vì nó gọi thẳng tầng truy vấn.
3. **Nhánh `ADMIN` là một nhánh RIÊNG BIỆT**, không phải `OR role = 'ADMIN'` nhét chung
   vào biểu thức. Viết chung là chỗ dễ vô tình mở quyền cho vai khác nhất, và cũng khó
   đọc nhất khi rà soát.

### Một chi tiết dễ sai

`scopeOf()` trả `null` cho `ADMIN`, **không phải mảng rỗng**. Hai thứ khác nghĩa:

- `null` = không giới hạn
- `[]` = không thuộc đơn vị nào, chỉ đọc được tài liệu toàn trường

Lẫn lộn hai cái này thì `ADMIN` không thấy gì cả.

### File gốc

Tài liệu gốc nằm trong volume `uploads`, **không phục vụ tĩnh**. Backend kiểm phạm vi
rồi mới trả nội dung. Để thư mục đó cho Caddy phục vụ trực tiếp là rò rỉ ngay, dù SQL có
lọc đúng — đoán được đường dẫn là đọc được tài liệu đơn vị khác.

---

## 5. Dữ liệu seed

Đã hiện thực trong `server/prisma/seed.ts`. Vì **không có đăng ký**, seed là cách duy
nhất để có tài khoản mà demo — seed hỏng thì không ai đăng nhập được, kể cả `ADMIN`.
Vì vậy nó phải nằm trong CI.

### Năm đơn vị

| Mã | Tên | Loại |
|---|---|---|
| `CNTT` | Khoa Công nghệ Thông tin | `FACULTY` |
| `KTR` | Khoa Kiến trúc | `FACULTY` |
| `XD` | Khoa Xây dựng | `FACULTY` |
| `PDT` | Phòng Đào tạo | `OFFICE` |
| `CTSV` | Phòng Công tác Sinh viên | `OFFICE` |

### Sáu cán bộ

Bố trí có chủ đích để kiểm thử rò rỉ theo **cả hai chiều**. Chỉ một chiều thì bộ kiểm
thử có thể xanh trong khi vẫn rò rỉ chiều ngược lại.

| Mã | Email | Vai | Đơn vị | Người thật |
|---|---|---|---|---|
| `CB0231` | `khoa.da@dau.edu.vn` | `STUDENT` | CNTT | Giảng viên |
| `CB0142` | `hoa.tt@dau.edu.vn` | `ADMIN` | CNTT | Giáo vụ khoa |
| `CB0388` | `dat.pq@dau.edu.vn` | `ADMIN` | XD | Giáo vụ khoa |
| `CB0205` | `bang.lv@dau.edu.vn` | `ADMIN` | KTR | Giáo vụ khoa |
| `CB0417` | `nam.vd@dau.edu.vn` | `ADMIN` | CTSV | Chuyên viên |
| `CB0006` | `ha.nt@dau.edu.vn` | `ADMIN` | PDT | Phòng Đào tạo |

`CB0231` giữ vai `STUDENT` là **có chủ đích, không phải sót**: giảng viên chỉ cần đọc,
đúng bằng quyền `STUDENT`. Đây là ví dụ sống của nguyên tắc "vai quyết định làm được gì".

### Năm mươi bảy sinh viên — dữ liệu thật

Trích từ danh sách điểm danh lớp *Lập trình mạng (NEP30103 - 23CT3)*, học kỳ 1 năm học
2026–2027.

- Mã số sinh viên vào cột `code`, **không phải `id`** — `id` là UUID khóa chính, mọi khóa
  ngoại trỏ vào đó; nếu trường cấp lại mã cho ai đó thì liên kết hỏng
- Email theo quy tắc `<tên>_<mã>@dau.edu.vn`, ví dụ `duc_2351220193@dau.edu.vn`
- Phân khoa theo **nhóm học tập**: mỗi nhóm vào trọn một khoa, luân phiên CNTT → KTR → XD.
  Tất định, giữ các bạn cùng nhóm chung khoa, tỉ lệ **CNTT 21 · KTR 18 · XD 18**
- Nhóm học tập **không** được lưu vào CSDL — lược đồ không có bảng tương ứng

> **Rủi ro riêng tư.** 57 người này là người thật, trong khi sản phẩm bàn giao A yêu cầu
> repo công khai. Hai điều đó xung đột — cần chốt ẩn danh hóa hay không trước khi công khai.

Bốn tài khoản tiện dùng khi kiểm thử, mật khẩu chung `Tangthu@123`:

| Mã | Họ tên | Đơn vị |
|---|---|---|
| `2351220193` | Hồ Minh Đức | CNTT |
| `2351220208` | Trương Xuân Anh | CNTT |
| `2351220221` | Võ Minh Hiếu | KTR |
| `2351220145` | Phùng Thị Thanh Huyền | XD |

### Cặp đối chứng — thứ làm cho lỗi lộ ra ngay

Bảy tài liệu, trong đó có một cặp dựng riêng cho bộ kiểm thử:

| Tài liệu | Đơn vị | Nội dung |
|---|---|---|
| `88/QĐ-CNTT` | CNTT | Nhận đồ án khi tích lũy tối thiểu **105 tín chỉ** |
| `77/QĐ-KTR` | KTR | Nhận đồ án khi tích lũy tối thiểu **90 tín chỉ** |

Cùng chủ đề, **khác con số**. Sinh viên CNTT hỏi về điều kiện nhận đồ án mà nhận được
con số 90 tức là đã rò rỉ phạm vi — con số khác nhau khiến lỗi lộ ra ngay, không cần
đọc kỹ nội dung.

Đây cũng là **kịch bản demo chính**: đăng nhập bằng sinh viên CNTT hỏi *"Quy định về đồ
án tốt nghiệp?"*, rồi đăng nhập bằng sinh viên Kiến trúc hỏi **đúng câu đó**. Cùng câu
hỏi, cùng hệ thống, hai kết quả — hội đồng thấy ngay cơ chế mà không cần giải thích.

---

## 6. Kiểm thử bắt buộc

`server/src/modules/retrieval/scope-isolation.test.ts` — **điều kiện chặn merge**.

Rủi ro rò rỉ phạm vi nghiêm trọng nhất về mặt sản phẩm: nó **im lặng**, không gây lỗi,
và chỉ lộ ra khi có người thấy tài liệu không thuộc về mình.

### Sáu trường hợp đã hiện thực và đang đạt

| # | Tình huống | Kỳ vọng | Trạng thái |
|---|---|---|:-:|
| 1 | Sinh viên CNTT hỏi về đồ án | Không đoạn nào của KTR lọt vào; không thấy "90 tín chỉ" | ✓ |
| 2 | Sinh viên KTR hỏi **đúng câu đó** | Không đoạn nào của CNTT lọt vào; không thấy "105 tín chỉ" | ✓ |
| 3 | Hai sinh viên khác khoa hỏi về quy chế toàn trường | Cả hai nhận **cùng một bộ** đoạn văn | ✓ |
| 4 | `ADMIN` tìm kiếm | Thấy tài liệu của cả hai khoa | ✓ |
| 5 | So truy vấn có lọc với không lọc | Bản không lọc phải trả **nhiều hơn** | ✓ |
| 6 | Người chưa gán đơn vị | Chỉ đọc được tài liệu toàn trường | ✓ |

**Trường hợp 1 là quan trọng nhất và dễ bỏ sót nhất.** Nó khẳng định *không có chunk nào
của khoa khác lọt vào ngữ cảnh*, chứ không chỉ kiểm câu trả lời cuối cùng. Câu trả lời có
thể vô tình đúng trong khi truy hồi đã rò rỉ.

**Trường hợp 5 là cái bẫy tự đặt cho chính mình.** Nếu `scopeSql` vô tình trả `TRUE` cho
mọi người, bốn trường hợp đầu **vẫn có thể xanh** khi dữ liệu thưa. Phép so sánh có lọc /
không lọc bắt đúng tình huống đó. Không có nó, bộ kiểm thử tự tin một cách sai lầm.

### Còn thiếu — cần thêm khi các module tương ứng xong

| # | Tình huống | Kỳ vọng | Chặn bởi |
|---|---|---|---|
| 7 | Sinh viên CNTT gọi `GET /documents` | Không tài liệu KTR nào trong kết quả | `modules/documents/` |
| 8 | Sinh viên CNTT xin file gốc của tài liệu KTR (biết trước id) | `403 FORBIDDEN_SCOPE` | `modules/documents/` |
| 9 | `STUDENT` gọi `POST /documents` | `403 FORBIDDEN_ROLE` | `modules/documents/` |
| 10 | Ngữ cảnh gửi cho mô hình sinh câu trả lời | Không chứa đoạn ngoài phạm vi | `modules/chat/` |

Phân biệt `FORBIDDEN_ROLE` và `FORBIDDEN_SCOPE` là có chủ đích: một bên là "vai của bạn
không được làm việc này", một bên là "việc này thuộc đơn vị khác". Frontend hiển thị hai
thông báo khác nhau.

Lưu ý về `404` so với `403`: endpoint **liệt kê** không bao giờ trả `403` cho tài nguyên
ngoài phạm vi — tài liệu đơn vị khác đơn giản là **không xuất hiện**. Trả `403` khi liệt
kê là tiết lộ có tồn tại tài liệu đó.
