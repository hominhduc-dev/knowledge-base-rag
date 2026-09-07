# -*- coding: utf-8 -*-
"""Dựng báo cáo Đồ án Phân tích thiết kế hệ thống — Sổ Tay Sinh Viên CNTT.

Bố cục theo đề cương môn học: Chương I xác định đề tài, Chương II phân tích,
Chương III thiết kế, Chương IV kết luận.

Chạy trước: python gen_ch12.py && python gen_ch3.py
"""
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

from report_doc import Report, ROOT, CENTER, LEFT, JUSTIFY
import chapters34

R = Report()

DETAIL = ['UC01', 'UC04', 'UC05', 'UC06', 'UC07', 'UC08',
          'UC09', 'UC10', 'UC11', 'UC12', 'UC15', 'UC16']
UC_NAME = {
    'UC01': 'Đăng nhập', 'UC02': 'Đăng xuất', 'UC03': 'Xem thông tin cá nhân',
    'UC04': 'Đổi mật khẩu', 'UC05': 'Hỏi đáp học vụ', 'UC06': 'Xem lại hội thoại',
    'UC07': 'Tra cứu kho tài liệu', 'UC08': 'Xem nguồn trích dẫn',
    'UC09': 'Theo dõi xử lý tài liệu', 'UC10': 'Tải lên tài liệu',
    'UC11': 'Sửa thông tin tài liệu', 'UC12': 'Gỡ tài liệu',
    'UC13': 'Chạy lại xử lý lỗi', 'UC14': 'Tra cứu người dùng',
    'UC15': 'Khóa / mở tài khoản', 'UC16': 'Phân quyền tài khoản',
    'UC18': 'Tra cứu lai qua API', 'UC19': 'Đánh giá truy hồi',
    'UC20': 'Kiểm tra sức khỏe',
}

# ===========================================================================
# TRANG BÌA
# ===========================================================================
R.p('BỘ GIÁO DỤC VÀ ĐÀO TẠO', align=CENTER, bold=True, size=13, space_after=0)
R.p('TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG', align=CENTER, bold=True, size=14, space_after=0)
R.p('KHOA: CÔNG NGHỆ THÔNG TIN', align=CENTER, bold=True, size=13, space_after=0)
R.p('---------oOo---------', align=CENTER, space_after=36)
R.p('BÁO CÁO MÔN HỌC', align=CENTER, bold=True, size=18, space_after=6)
R.p('ĐỒ ÁN PHÂN TÍCH THIẾT KẾ HỆ THỐNG', align=CENTER, bold=True, size=16, space_after=30)
R.p('ĐỀ TÀI: HỆ THỐNG SỔ TAY SINH VIÊN CNTT', align=CENTER, bold=True, size=17, space_after=4)
R.p('HỎI ĐÁP HỌC VỤ CÓ TRÍCH DẪN NGUỒN', align=CENTER, bold=True, size=17, space_after=48)
R.table(['', ''],
        [['Giáo viên hướng dẫn', 'Võ Thị Ngọc Tú'],
         ['Lớp', '22CT3'],
         ['Sinh viên thực hiện', 'Hồ Minh Đức'],
         ['', 'Trương Xuân Anh']],
        [5.5, 8.0], size=13, first_bold=True, header=False)
R.p('')
R.p('Đà Nẵng, tháng 09, năm 2026', align=CENTER, italic=True, size=13)

# ===========================================================================
# MỤC LỤC
# ===========================================================================
R.page()
R.p('MỤC LỤC', align=CENTER, bold=True, size=16, space_after=12)
for line, ind in [
    ('CHƯƠNG I. XÁC ĐỊNH ĐỀ TÀI', 0),
    ('1. Lý do chọn đề tài', 1), ('2. Mục tiêu và phạm vi hệ thống', 1),
    ('3. Chức năng của hệ thống', 1), ('4. Quy trình nghiệp vụ của hệ thống', 1),
    ('CHƯƠNG II. PHÂN TÍCH ĐỀ TÀI', 0),
    ('1. Biểu đồ ca sử dụng', 1), ('2. Biểu đồ tương tác đối tượng', 1),
    ('CHƯƠNG III. THIẾT KẾ HỆ THỐNG', 0),
    ('1. Biểu đồ lớp', 1), ('2. Biểu đồ hành vi', 1),
    ('3. Xây dựng và cài đặt cơ sở dữ liệu', 1), ('4. Phác họa giao diện', 1),
    ('CHƯƠNG IV. KẾT LUẬN', 0),
    ('1. Kết quả đạt được', 1), ('2. Hạn chế của phiên bản hiện tại', 1),
    ('3. Hướng phát triển', 1),
    ('TÀI LIỆU VÀ MÃ NGUỒN ĐỐI CHIẾU', 0),
]:
    par = R.p(line, align=LEFT, bold=(ind == 0), space_after=3)
    if ind:
        from docx.shared import Cm as _Cm
        par.paragraph_format.left_indent = _Cm(0.8)

# ===========================================================================
# CHƯƠNG I
# ===========================================================================
R.page()
R.h('CHƯƠNG I. XÁC ĐỊNH ĐỀ TÀI', 1)

R.h('1. Lý do chọn đề tài', 2)
R.p('Khảo sát hiện trạng tra cứu thông tin học vụ của sinh viên ngành Công nghệ '
    'thông tin cho thấy các vấn đề sau:')
R.bullets([
    'Quy chế học vụ, chương trình đào tạo, thông báo học phí và hướng dẫn thủ tục '
    'nằm rải rác trong nhiều tệp PDF và DOCX; sinh viên phải mở lần lượt từng văn '
    'bản mới tìm được đúng điều khoản.',
    'Sinh viên không xác định được văn bản nào còn hiệu lực và áp dụng cho khóa nào, '
    'dẫn tới hiểu sai quy định.',
    'Giáo vụ khoa phải trả lời lặp lại cùng một nhóm câu hỏi mỗi đầu học kỳ, tốn '
    'nhiều thời gian cho công việc có thể tự động hóa.',
    'Các công cụ hỏi đáp phổ thông trả lời trôi chảy nhưng không dẫn nguồn, người '
    'học không kiểm chứng được và dễ tin vào thông tin bịa.',
    'Tài liệu nội bộ của khoa không thể đưa lên dịch vụ công cộng, cần một hệ thống '
    'chạy trong phạm vi nhà trường và kiểm soát được ai đọc tài liệu nào.',
])
R.p('Từ hiện trạng đó, nhóm chọn đề tài xây dựng hệ thống hỏi đáp học vụ dựa trên '
    'kho tài liệu của ngành Công nghệ thông tin, trong đó mỗi câu trả lời đều kèm '
    'trích dẫn về đúng đoạn văn trong văn bản gốc để người học tự kiểm chứng.')

R.h('2. Mục tiêu và phạm vi hệ thống', 2)
R.h('2.1. Mục tiêu', 3)
R.bullets([
    'Rút ngắn thao tác tra cứu: sinh viên hỏi bằng tiếng Việt, hệ thống trả lời kèm '
    'vị trí trích dẫn (tên văn bản, điều khoản, số trang).',
    'Bảo đảm tính kiểm chứng: không có nguồn phù hợp thì trả thông báo từ chối, '
    'không suy đoán câu trả lời.',
    'Hỗ trợ giáo vụ quản lý kho nội dung: tải lên, sửa thông tin, gỡ tài liệu và '
    'chạy lại khi xử lý lỗi.',
    'Cách ly phạm vi dữ liệu: chỉ tài liệu của ngành Công nghệ thông tin và quy định '
    'chung được sử dụng, kể cả với tài khoản quản trị.',
    'Cho phép quản trị viên quản lý tài khoản và phân quyền trong phạm vi khoa.',
])
R.h('2.2. Phạm vi của hệ thống', 3)
R.table(['Thuộc phạm vi', 'Ngoài phạm vi'], [
    ['Hỏi đáp học vụ có dẫn nguồn; tra cứu kho tài liệu; xem lại hội thoại cá nhân.',
     'Quản lý đào tạo toàn trường: đăng ký tín chỉ, điểm số, thanh toán học phí.'],
    ['Tải lên, sửa thông tin, gỡ tài liệu, theo dõi và chạy lại xử lý lỗi.',
     'Quản trị nhiều khoa cùng lúc; tự đăng ký tài khoản hoặc đăng nhập một lần (SSO).'],
    ['Quản lý trạng thái và vai trò tài khoản trong phạm vi ngành Công nghệ thông tin.',
     'Nhận dạng ký tự quang học cho tệp PDF quét ảnh trong luồng nhập liệu thường.'],
    ['Đánh giá chất lượng truy hồi và kiểm tra sức khỏe hệ thống.',
     'Cam kết quy mô phục vụ toàn trường hoặc mức sẵn sàng của sản phẩm thương mại.'],
], [7.6, 7.9], caption='Phạm vi của hệ thống')
R.p('Người sử dụng hệ thống gồm ba vai:')
R.table(['Tác nhân', 'Vai kỹ thuật', 'Trách nhiệm chính'], [
    ['Sinh Viên CNTT', 'USER',
     'Hỏi đáp học vụ, đọc tài liệu, mở nguồn trích dẫn, xem lại hội thoại của mình.'],
    ['Giáo vụ khoa CNTT', 'CONTENT_ADMIN',
     'Có toàn bộ quyền tra cứu, thêm quyền quản lý kho tài liệu của khoa.'],
    ['Quản Trị Viên', 'SYSTEM_ADMIN',
     'Có quyền của giáo vụ, thêm quyền quản lý tài khoản và phân quyền.'],
], [3.6, 3.4, 8.5], caption='Tác nhân của hệ thống')
R.p('Quản trị viên không có thêm phạm vi tài liệu so với sinh viên: cả ba vai chỉ '
    'đọc được tài liệu của ngành Công nghệ thông tin và quy định chung. Ngoài ba vai '
    'nghiệp vụ còn có hai tác nhân kỹ thuật là dịch vụ Gemini API (nhúng vector và '
    'sinh câu trả lời) và người vận hành công cụ đánh giá chạy trên dòng lệnh.')

R.h('3. Chức năng của hệ thống', 2)
R.h('3.1. Chức năng cho sinh viên CNTT', 3)
R.bullets([
    'Đăng nhập bằng mã sinh viên hoặc email; đăng xuất; đổi mật khẩu.',
    'Xem thông tin cá nhân và vai trò hiện tại trong khoa.',
    'Đặt câu hỏi học vụ bằng tiếng Việt và nhận câu trả lời kèm trích dẫn.',
    'Mở nguồn trích dẫn để xem đoạn văn gốc và tệp gốc.',
    'Xem lại danh sách hội thoại của chính mình cùng nguồn đã dẫn.',
    'Tra cứu kho tài liệu và theo dõi trạng thái xử lý của từng tài liệu.',
])
R.h('3.2. Chức năng cho giáo vụ khoa CNTT', 3)
R.bullets([
    'Toàn bộ chức năng của sinh viên.',
    'Tải lên tài liệu định dạng PDF hoặc DOCX vào kho của khoa.',
    'Sửa tiêu đề và phạm vi của tài liệu đã có.',
    'Gỡ tài liệu khỏi kho khi văn bản hết hiệu lực.',
    'Theo dõi hàng đợi xử lý và chạy lại các tài liệu bị lỗi.',
])
R.h('3.3. Chức năng cho quản trị viên', 3)
R.bullets([
    'Toàn bộ chức năng của giáo vụ.',
    'Tra cứu danh sách tài khoản thuộc ngành Công nghệ thông tin.',
    'Khóa hoặc mở lại tài khoản.',
    'Phân quyền tài khoản: gán hoặc gỡ tư cách thành viên và vai trong khoa.',
])
R.p('Hệ thống không có chức năng tự đăng ký tài khoản. Tài khoản được cấp bằng quy '
    'trình seed hoặc provisioning khi triển khai, nhằm tránh trường hợp người ngoài '
    'tự chọn khoa và vượt qua cơ chế cách ly phạm vi ngay tại cửa vào.')

R.h('4. Quy trình nghiệp vụ của hệ thống', 2)
R.h('4.1. Xác định yêu cầu nghiệp vụ', 3)
R.p('Nghiệp vụ của hệ thống được chia thành năm nhóm:')
R.bullets([
    'Quản lý tài khoản và phân quyền: cấp tài khoản, đăng nhập, khóa hoặc mở tài '
    'khoản, gán vai trong khoa, đổi mật khẩu.',
    'Quản lý kho tài liệu: tải lên tệp PDF hoặc DOCX, đặt phạm vi tài liệu, sửa '
    'thông tin, gỡ tài liệu.',
    'Xử lý nhập liệu: trích văn bản, cắt đoạn có giữ đường dẫn tiêu đề và số trang, '
    'nhúng vector, quản lý hàng đợi và số lần thử lại.',
    'Hỏi đáp có trích dẫn: truy hồi lai theo vector và theo từ khóa, lọc phạm vi '
    'trước khi xếp hạng, sinh câu trả lời từ nguồn, kiểm tra trích dẫn hợp lệ.',
    'Tra cứu và giám sát: xem lại hội thoại, mở nguồn trích dẫn, theo dõi trạng thái '
    'tài liệu, đánh giá chất lượng truy hồi, kiểm tra sức khỏe hệ thống.',
])
R.h('4.2. Phác họa quy trình nghiệp vụ tổng quát', 3)
R.fig('qt_tongquat', 'Quy trình nghiệp vụ tổng quát của hệ thống', 15.5)
R.steps([
    'Người dùng đăng nhập bằng mã sinh viên hoặc email.',
    'Hệ thống xác thực tài khoản, kiểm tra tài khoản còn hoạt động và có tư cách '
    'thành viên ngành Công nghệ thông tin.',
    'Sinh viên đặt câu hỏi học vụ bằng tiếng Việt.',
    'Hệ thống truy hồi các đoạn tài liệu thuộc phạm vi được phép đọc.',
    'Hệ thống sinh câu trả lời từ các đoạn nguồn và kiểm tra trích dẫn.',
    'Sinh viên đọc câu trả lời và mở nguồn để kiểm chứng trong văn bản gốc.',
    'Giáo vụ tải lên hoặc cập nhật tài liệu học vụ của khoa.',
    'Hệ thống xử lý nền: trích văn bản, cắt đoạn, nhúng vector và cập nhật trạng thái.',
    'Giáo vụ theo dõi trạng thái xử lý và chạy lại các tài liệu bị lỗi.',
    'Quản trị viên quản lý tài khoản và phân quyền; quyền mới áp dụng ngay từ '
    'request kế tiếp.',
])
R.h('4.3. Phác họa quy trình nghiệp vụ của mỗi chức năng', 3)
R.h('4.3.1. Quy trình hỏi đáp học vụ', 4)
R.fig('qt_hoidap', 'Quy trình hỏi đáp học vụ', 15.5)
R.steps([
    'Sinh viên đăng nhập và mở màn hình hỏi đáp.',
    'Sinh viên nhập câu hỏi học vụ và gửi.',
    'Hệ thống truy hồi các đoạn tài liệu trong phạm vi ngành Công nghệ thông tin và '
    'quy định chung.',
    'Hệ thống sinh câu trả lời từ nguồn và kiểm tra các marker trích dẫn.',
    'Hệ thống lưu hội thoại và hiển thị đáp án kèm danh sách nguồn được dẫn.',
])
R.h('4.3.2. Quy trình nhập tài liệu', 4)
R.fig('qt_nhaplieu', 'Quy trình nhập tài liệu vào kho', 15.5)
R.steps([
    'Giáo vụ chọn tệp PDF hoặc DOCX và nhập tiêu đề, phạm vi.',
    'Hệ thống lưu tệp, tính mã băm SHA-256 và tạo công việc xử lý nền.',
    'Worker trích văn bản, cắt đoạn và nhúng vector cho từng đoạn.',
    'Trạng thái tài liệu chuyển sang READY khi thành công hoặc FAILED khi lỗi.',
    'Giáo vụ theo dõi trạng thái và chạy lại tài liệu bị lỗi.',
])
R.h('4.3.3. Quy trình quản trị tài khoản', 4)
R.fig('qt_taikhoan', 'Quy trình quản trị tài khoản và phân quyền', 15.5)
R.steps([
    'Quản trị viên mở danh sách tài khoản thuộc ngành Công nghệ thông tin.',
    'Quản trị viên khóa hoặc mở tài khoản, hoặc đổi vai của thành viên.',
    'Hệ thống chặn các thao tác tự khóa và tự hạ quyền của chính người đang thao tác.',
    'Quyền mới được áp dụng từ request kế tiếp vì mỗi request đọc lại quyền từ cơ sở '
    'dữ liệu.',
])

R.page()
R.h('4.4. Xây dựng bảng thuật ngữ', 3)
R.table(['Thuật ngữ', 'Định nghĩa'], [
    ['Tài liệu', 'Văn bản học vụ dạng PDF hoặc DOCX được đưa vào kho, kèm tiêu đề, '
     'phạm vi và trạng thái xử lý.'],
    ['Đoạn văn (chunk)', 'Phần văn bản được cắt ra từ tài liệu, giữ đường dẫn tiêu đề '
     'và khoảng trang, là đơn vị nhỏ nhất để truy hồi và trích dẫn.'],
    ['Vector nhúng (embedding)', 'Biểu diễn số của một đoạn văn dùng để so sánh ngữ '
     'nghĩa; hệ thống dùng vector 1536 chiều.'],
    ['Truy hồi (retrieval)', 'Thao tác tìm các đoạn văn liên quan tới câu hỏi trước '
     'khi sinh câu trả lời.'],
    ['Tìm kiếm lai (hybrid search)', 'Kết hợp tìm kiếm theo vector và tìm kiếm toàn '
     'văn rồi hợp nhất thứ hạng.'],
    ['Trích dẫn (citation)', 'Liên kết giữa một câu trả lời và đoạn văn nguồn, kèm bản '
     'sao đoạn trích, đường dẫn tiêu đề và số trang.'],
    ['Vị trí trích dẫn (locator)', 'Chuỗi mô tả chỗ đứng của đoạn trích trong văn bản '
     'gốc, ví dụ “Điều 12, Khoản 1 · Trang 8”.'],
    ['Phạm vi (scope)', 'Tập tài liệu mà một người dùng được phép đọc: tài liệu của '
     'ngành Công nghệ thông tin và các quy định chung toàn trường.'],
    ['Hội thoại', 'Chuỗi các lượt hỏi đáp của một người dùng, có tiêu đề sinh từ câu '
     'hỏi đầu tiên.'],
    ['Lượt hỏi đáp', 'Một cặp câu hỏi của người dùng và câu trả lời của hệ thống, kèm '
     'các trích dẫn thực sự được dẫn.'],
    ['Công việc nhập liệu (job)', 'Một mục trong hàng đợi xử lý tài liệu, có trạng '
     'thái và số lần thử lại.'],
    ['Bịa thông tin (hallucination)', 'Hiện tượng mô hình đưa ra nội dung nghe hợp lý '
     'nhưng không có trong tài liệu nguồn.'],
    ['SSE (Server-Sent Events)', 'Cơ chế máy chủ đẩy dữ liệu theo luồng trên một kết '
     'nối HTTP, dùng để hiển thị câu trả lời khi đang sinh.'],
    ['JWT', 'Chuỗi ký số mang danh tính người dùng giữa các request; hệ thống không '
     'tin vai trò khai trong JWT mà đọc lại từ cơ sở dữ liệu.'],
    ['Quản trị nội dung (CONTENT_ADMIN)', 'Vai của giáo vụ khoa, được ghi nội dung '
     'trong kho tài liệu.'],
    ['Quản trị hệ thống (SYSTEM_ADMIN)', 'Vai của quản trị viên, được quản lý tài '
     'khoản và phân quyền.'],
], [4.6, 10.9], caption='Bảng thuật ngữ sử dụng trong báo cáo')

# ===========================================================================
# CHƯƠNG II
# ===========================================================================
R.page()
R.h('CHƯƠNG II. PHÂN TÍCH ĐỀ TÀI', 1)

R.h('1. Biểu đồ ca sử dụng', 2)
R.h('1.1. Biểu đồ tổng quát', 3)
R.p('Hệ thống có 19 ca sử dụng, đánh mã từ UC01 đến UC20 (mã UC17 không được sử '
    'dụng). Để dễ đọc, biểu đồ tổng quát gom các ca sử dụng thành sáu nhóm chức năng.')
R.fig('uc_tongquat', 'Biểu đồ ca sử dụng tổng quát của hệ thống', 15.5)
R.p('Giáo vụ khoa kế thừa toàn bộ quyền tra cứu của sinh viên; quản trị viên kế thừa '
    'toàn bộ quyền quản lý nội dung của giáo vụ. Quan hệ kế thừa này chỉ mở rộng '
    'thao tác được phép, không mở rộng phạm vi tài liệu.')

R.h('1.2. Biểu đồ chi tiết', 3)
R.h('1.2.1. Nhóm chức năng của sinh viên CNTT', 4)
R.fig('uc_sinhvien', 'Biểu đồ ca sử dụng chi tiết — Sinh Viên CNTT', 15.5)
R.h('1.2.2. Nhóm chức năng của giáo vụ khoa CNTT', 4)
R.fig('uc_giaovu', 'Biểu đồ ca sử dụng chi tiết — Giáo vụ khoa CNTT', 15.5)
R.h('1.2.3. Nhóm chức năng của quản trị viên', 4)
R.fig('uc_quantri', 'Biểu đồ ca sử dụng chi tiết — Quản Trị Viên', 15.5)
R.h('1.2.4. Nhóm chức năng kỹ thuật', 4)
R.fig('uc_kythuat', 'Biểu đồ ca sử dụng chi tiết — giao tiếp API và công cụ', 15.5)

R.p('Danh mục đầy đủ các ca sử dụng kèm giao tiếp tương ứng:')
rows = []
readme = (ROOT / 'docs/use-cases/README.md').read_text(encoding='utf8')
for line in readme.splitlines():
    if line.startswith('| UC'):
        cols = [c.strip() for c in line.split('|')[1:-1]]
        rows.append(cols[:3])
R.table(['Mã', 'Tên ca sử dụng', 'Giao tiếp và giới hạn'], rows,
        [1.4, 4.6, 9.5], caption='Danh mục ca sử dụng của hệ thống', size=11)

R.page()
R.h('1.3. Đặc tả ca sử dụng', 3)
R.p('Phần này đặc tả 12 trên 19 ca sử dụng, tương đương 63% số ca sử dụng chi tiết, '
    'tập trung vào các chức năng chính thể hiện nghiệp vụ của hệ thống.')

SPECS = {
'UC01': dict(
    actors='Sinh Viên CNTT, Giáo vụ khoa CNTT, Quản Trị Viên',
    pre='Tài khoản đã được cấp bằng quy trình seed hoặc provisioning.',
    post='Người dùng nhận được JWT và hồ sơ kèm vai hiện tại trong khoa.',
    desc='Người dùng đăng nhập bằng mã sinh viên hoặc địa chỉ email. Hệ thống phân '
         'biệt hai dạng bằng dấu @. Đăng nhập chỉ thành công khi tài khoản đang hoạt '
         'động và có tư cách thành viên ngành Công nghệ thông tin.',
    main=['Người dùng chọn chức năng “Đăng nhập”.',
          'Hệ thống hiển thị form đăng nhập.',
          'Người dùng nhập mã sinh viên hoặc email và mật khẩu.',
          'Hệ thống đối chiếu mật khẩu bằng bcrypt.',
          'Hệ thống kiểm tra tài khoản còn hoạt động và có tư cách CNTT.',
          'Hệ thống phát JWT, trả hồ sơ và vai, chuyển vào màn hình hỏi đáp.'],
    alt=['4a. Sai mật khẩu: hệ thống báo lỗi đăng nhập chung, không nói sai ở khâu nào.',
         '5a. Tài khoản bị khóa: hệ thống từ chối, không phát JWT.',
         '5b. Không có tư cách CNTT: hệ thống từ chối cho sử dụng ứng dụng.']),
'UC04': dict(
    actors='Người dùng đã đăng nhập (cả ba vai)',
    pre='Người dùng đã đăng nhập và biết mật khẩu hiện tại.',
    post='Trường password_hash được cập nhật bằng hàm băm bcrypt mới.',
    desc='Người dùng tự đổi mật khẩu của mình. Hệ thống yêu cầu mật khẩu hiện tại để '
         'tránh trường hợp phiên bị chiếm dụng đổi mật khẩu của chủ tài khoản.',
    main=['Người dùng mở chức năng đổi mật khẩu.',
          'Người dùng nhập mật khẩu hiện tại và mật khẩu mới.',
          'Hệ thống đối chiếu mật khẩu hiện tại.',
          'Hệ thống kiểm tra mật khẩu mới đạt yêu cầu độ dài.',
          'Hệ thống băm bcrypt và cập nhật bản ghi người dùng.',
          'Hệ thống báo đổi mật khẩu thành công.'],
    alt=['3a. Mật khẩu hiện tại sai: hệ thống báo lỗi, giữ nguyên mật khẩu cũ.',
         '4a. Mật khẩu mới không hợp lệ: hệ thống yêu cầu nhập lại.']),
'UC05': dict(
    actors='Sinh Viên CNTT (giáo vụ và quản trị viên cũng được tra cứu)',
    pre='Đã đăng nhập bằng tài khoản đang hoạt động, có tư cách CNTT.',
    post='Câu hỏi, câu trả lời cuối và các nguồn thực sự được dẫn được lưu trong hội '
         'thoại của người dùng.',
    desc='Người dùng đặt câu hỏi học vụ bằng tiếng Việt. Hệ thống truy hồi các đoạn '
         'tài liệu trong phạm vi được phép đọc, sinh câu trả lời từ chính các đoạn đó '
         'và bắt buộc câu trả lời phải có trích dẫn hợp lệ. Không có nguồn thì trả '
         'thông báo từ chối thay vì suy đoán.',
    main=['Sinh viên nhập câu hỏi trên giao diện hỏi đáp và gửi.',
          'Giao diện gọi API hỏi đáp kèm JWT và mở luồng SSE.',
          'Hệ thống xác thực và xác định phạm vi tài liệu của người gọi.',
          'Hệ thống truy hồi lai theo vector và theo từ khóa, lọc phạm vi trước khi '
          'xếp hạng.',
          'Hệ thống phát sự kiện danh sách nguồn rồi gọi Gemini sinh câu trả lời.',
          'Giao diện nhận các sự kiện token và hiển thị dần.',
          'Hệ thống lọc marker do mô hình bịa và kiểm tra còn trích dẫn hợp lệ.',
          'Hệ thống lưu hội thoại, tin nhắn, trích dẫn và phát sự kiện kết thúc kèm '
          'nội dung cuối.',
          'Sinh viên mở nguồn để kiểm chứng trong văn bản gốc.'],
    alt=['3a. JWT không hợp lệ hoặc tài khoản bị khóa: trả lỗi xác thực, không truy hồi.',
         '4a. Không có đoạn nguồn phù hợp: trả câu từ chối vì không đủ căn cứ và vẫn '
         'lưu lượt hỏi với danh sách nguồn rỗng.',
         '5a. Gemini hoặc kết nối lỗi: phát sự kiện lỗi, không coi nội dung tạm là '
         'đáp án hoàn tất.',
         '7a. Không còn marker trích dẫn hợp lệ: thay toàn bộ nội dung bằng câu từ chối.']),
'UC06': dict(
    actors='Người dùng đã đăng nhập',
    pre='Người dùng đã có ít nhất một hội thoại.',
    post='Nội dung hội thoại và trích dẫn đã lưu được hiển thị lại.',
    desc='Người dùng xem lại các hội thoại của chính mình. Hội thoại thuộc riêng người '
         'tạo; hệ thống lọc theo chủ sở hữu ở tầng truy vấn chứ không ở giao diện.',
    main=['Người dùng mở danh sách hội thoại.',
          'Hệ thống lọc hội thoại theo mã người dùng đang đăng nhập.',
          'Hệ thống trả danh sách hội thoại kèm thời điểm cập nhật.',
          'Người dùng chọn một hội thoại.',
          'Hệ thống đọc các tin nhắn và trích dẫn của hội thoại đó.',
          'Hệ thống hiển thị nội dung kèm nguồn đã dẫn.'],
    alt=['4a. Hội thoại không thuộc người gọi: hệ thống không trả nội dung.',
         '5a. Tài liệu nguồn đã bị gỡ: bản sao đoạn trích vẫn hiển thị, liên kết mở '
         'tệp gốc không còn.']),
'UC07': dict(
    actors='Người dùng đã đăng nhập',
    pre='Đã đăng nhập bằng tài khoản có tư cách CNTT.',
    post='Danh sách tài liệu trong phạm vi được phép đọc được hiển thị.',
    desc='Người dùng tra cứu kho tài liệu theo tiêu đề. Truy vấn luôn áp dụng điều '
         'kiện phạm vi: tài liệu của ngành Công nghệ thông tin hoặc quy định chung.',
    main=['Người dùng mở kho tài liệu hoặc nhập từ khóa tìm kiếm.',
          'Hệ thống áp dụng điều kiện phạm vi cho truy vấn.',
          'Hệ thống trả danh sách tài liệu kèm phạm vi, số trang và trạng thái.',
          'Người dùng chọn một tài liệu để xem chi tiết.',
          'Hệ thống hiển thị thông tin chi tiết của tài liệu.'],
    alt=['3a. Không có tài liệu phù hợp: hiển thị trạng thái không có kết quả.',
         '4a. Tài liệu ngoài phạm vi: hệ thống trả lỗi không tìm thấy, kể cả với '
         'quản trị viên.']),
'UC08': dict(
    actors='Người dùng đã đăng nhập',
    pre='Câu trả lời hoặc tài liệu đang mở có ít nhất một nguồn trích dẫn.',
    post='Đoạn văn nguồn và tệp gốc được hiển thị cho người có quyền đọc.',
    desc='Người dùng mở nguồn trích dẫn để đối chiếu câu trả lời với văn bản gốc. '
         'Tệp gốc không được phục vụ tĩnh mà đi qua endpoint có kiểm tra phạm vi.',
    main=['Người dùng bấm vào số hiệu nguồn trong câu trả lời.',
          'Hệ thống kiểm tra phạm vi tài liệu của người gọi.',
          'Hệ thống trả các đoạn văn kèm đường dẫn tiêu đề và số trang.',
          'Người dùng chọn mở tệp gốc nếu cần.',
          'Hệ thống kiểm tra phạm vi một lần nữa rồi trả tệp.'],
    alt=['2a. Tài liệu ngoài phạm vi: từ chối truy cập cả đoạn văn lẫn tệp.',
         '5a. Tệp gốc không còn trên đĩa: báo lỗi và giữ nguyên bản sao đoạn trích.']),
'UC09': dict(
    actors='Người dùng đã đăng nhập; giáo vụ dùng để quyết định chạy lại',
    pre='Tài liệu đã được tải lên hệ thống.',
    post='Trạng thái xử lý hiện tại của tài liệu được hiển thị.',
    desc='Người dùng theo dõi tiến trình xử lý của một tài liệu: đang chờ, đang xử lý, '
         'sẵn sàng hay lỗi. Giáo vụ dựa vào trạng thái này để quyết định chạy lại.',
    main=['Người dùng mở trạng thái xử lý của một tài liệu.',
          'Hệ thống kiểm tra phạm vi tài liệu.',
          'Hệ thống đọc trạng thái tài liệu và công việc nhập liệu tương ứng.',
          'Hệ thống hiển thị trạng thái PENDING, PROCESSING, READY hoặc FAILED.'],
    alt=['2a. Tài liệu ngoài phạm vi: không trả trạng thái.',
         '4a. Trạng thái FAILED: hệ thống hiển thị thông báo lỗi và gợi ý chạy lại.']),
'UC10': dict(
    actors='Giáo vụ khoa CNTT, Quản Trị Viên',
    pre='Đã đăng nhập bằng tài khoản có quyền ghi nội dung.',
    post='Tài liệu được lưu, công việc nhập liệu được tạo ở trạng thái PENDING.',
    desc='Giáo vụ tải tệp PDF hoặc DOCX vào kho. Hệ thống tính mã băm SHA-256 để nhận '
         'biết tệp trùng: tải lại đúng tệp cũ thì trả về bản ghi cũ thay vì xử lý lại '
         'từ đầu.',
    main=['Giáo vụ chọn tệp PDF hoặc DOCX và nhập tiêu đề, phạm vi.',
          'Hệ thống kiểm tra định dạng và kích thước tệp.',
          'Hệ thống tính mã băm SHA-256 của tệp.',
          'Hệ thống lưu tệp vào kho uploads và tạo bản ghi tài liệu.',
          'Hệ thống tạo công việc nhập liệu ở trạng thái PENDING.',
          'Worker trích văn bản, cắt đoạn và nhúng vector; trạng thái chuyển READY.'],
    alt=['2a. Định dạng không hỗ trợ: từ chối tải lên.',
         '3a. Mã băm đã tồn tại: trả về bản ghi cũ, không tạo công việc mới.',
         '6a. Trích văn bản hoặc nhúng vector lỗi: trạng thái chuyển FAILED kèm thông '
         'báo lỗi.']),
'UC11': dict(
    actors='Giáo vụ khoa CNTT, Quản Trị Viên',
    pre='Tài liệu đã tồn tại và thuộc phạm vi được phép ghi.',
    post='Tiêu đề hoặc phạm vi của tài liệu được cập nhật; phạm vi của các đoạn văn '
         'được đồng bộ theo.',
    desc='Giáo vụ sửa tiêu đề hoặc phạm vi của tài liệu. Khi phạm vi thay đổi, trigger '
         'trong cơ sở dữ liệu cập nhật hai cột phạm vi trên bảng đoạn văn, tránh tình '
         'trạng tài liệu đã chuyển đơn vị nhưng các đoạn vẫn mang phạm vi cũ.',
    main=['Giáo vụ mở tài liệu cần sửa.',
          'Giáo vụ thay đổi tiêu đề hoặc phạm vi.',
          'Hệ thống kiểm tra đích thuộc ngành Công nghệ thông tin hoặc quy định chung.',
          'Hệ thống cập nhật bản ghi tài liệu.',
          'Trigger đồng bộ phạm vi xuống toàn bộ đoạn văn của tài liệu.'],
    alt=['3a. Đích nằm ngoài phạm vi cho phép: hệ thống từ chối cập nhật.',
         '3b. Người gọi không có quyền ghi: backend từ chối dù gọi thẳng API.']),
'UC12': dict(
    actors='Giáo vụ khoa CNTT, Quản Trị Viên',
    pre='Tài liệu đã tồn tại và thuộc phạm vi được phép ghi.',
    post='Tài liệu, các đoạn văn và công việc nhập liệu bị xóa; lịch sử trích dẫn '
         'vẫn giữ bản sao đoạn trích.',
    desc='Giáo vụ gỡ tài liệu khi văn bản hết hiệu lực. Các khóa ngoại trong bảng '
         'trích dẫn được đặt NULL thay vì xóa theo, nhờ vậy hội thoại cũ vẫn hiển thị '
         'được nội dung đã trích.',
    main=['Giáo vụ chọn tài liệu cần gỡ.',
          'Hệ thống kiểm tra quyền ghi nội dung và phạm vi tài liệu.',
          'Hệ thống xóa bản ghi tài liệu; đoạn văn và công việc xóa theo ràng buộc.',
          'Hệ thống đặt khóa ngoại nguồn trong bảng trích dẫn thành NULL.',
          'Hệ thống báo gỡ tài liệu thành công.'],
    alt=['2a. Người gọi không có quyền ghi: hệ thống từ chối.',
         '2b. Tài liệu ngoài phạm vi: hệ thống trả lỗi không tìm thấy.']),
'UC15': dict(
    actors='Quản Trị Viên',
    pre='Đã đăng nhập bằng tài khoản có vai quản trị hệ thống.',
    post='Trường is_active của tài khoản đích được cập nhật.',
    desc='Quản trị viên khóa hoặc mở lại tài khoản. Hệ thống chỉ cho phép thay đổi '
         'trạng thái hoạt động, không có chức năng xóa tài khoản, và chặn thao tác tự '
         'khóa chính mình.',
    main=['Quản trị viên mở danh sách tài khoản thuộc ngành Công nghệ thông tin.',
          'Quản trị viên chọn một tài khoản và đặt trạng thái hoạt động.',
          'Hệ thống kiểm tra tài khoản đích không phải chính người đang thao tác.',
          'Hệ thống cập nhật trạng thái trong một giao dịch.',
          'Request kế tiếp của tài khoản bị khóa sẽ bị chặn ở khâu xác thực.'],
    alt=['3a. Tự khóa chính mình: hệ thống chặn thao tác và giữ nguyên trạng thái.',
         '2a. Tài khoản ngoài phạm vi CNTT: không xuất hiện trong danh sách.']),
'UC16': dict(
    actors='Quản Trị Viên',
    pre='Đã đăng nhập bằng tài khoản có vai quản trị hệ thống.',
    post='Bản ghi thành viên trong khoa được thêm, đổi vai hoặc gỡ.',
    desc='Quản trị viên gán hoặc gỡ tư cách thành viên và vai của tài khoản trong '
         'khoa. Giao dịch đọc lại quyền của chính người gọi và được tuần tự hóa để '
         'tránh trường hợp hai quản trị viên thu hồi quyền của nhau bằng thông tin cũ.',
    main=['Quản trị viên mở ma trận phân quyền.',
          'Quản trị viên chọn tài khoản và vai mới.',
          'Hệ thống kiểm tra người gọi không tự hạ quyền hoặc tự gỡ tư cách quản trị.',
          'Hệ thống ghi bản ghi thành viên trong một giao dịch tuần tự hóa.',
          'Quyền mới được áp dụng từ request kế tiếp.'],
    alt=['3a. Tự hạ quyền hoặc tự gỡ tư cách quản trị: hệ thống chặn thao tác.',
         '4a. Có quản trị viên khác vừa đổi quyền: giao dịch đọc lại và áp dụng trạng '
         'thái mới nhất.']),
}

for uid in DETAIL:
    s = SPECS[uid]
    R.h('1.3.%d. Ca sử dụng %s — %s' % (DETAIL.index(uid) + 1, uid, UC_NAME[uid]), 4)
    R.uc_spec(uid, UC_NAME[uid], s['actors'], s['pre'], s['post'], s['desc'],
              s['main'], s['alt'])

R.page()
R.h('2. Biểu đồ tương tác đối tượng', 2)
R.p('Mỗi ca sử dụng được đặc tả ở mục 1.3 có một biểu đồ trình tự và một biểu đồ cộng '
    'tác. Các đối tượng tham gia được phân theo khuôn mẫu Boundary – Control – Entity: '
    'Boundary là màn hình hoặc thành phần giao diện, Control là controller và service '
    'phía máy chủ, Entity là các bảng dữ liệu truy cập qua Prisma và SQL. Dịch vụ '
    'Gemini được vẽ như một đối tượng ngoài hệ thống.')
R.p('Quy ước màu của thông điệp: xanh lá là yêu cầu do người dùng khởi phát, xám nét '
    'liền là lời gọi nội bộ, xám nét đứt là giá trị trả về, đỏ là bước kiểm tra quyền '
    'và phạm vi, tím nét đứt là lời gọi tới dịch vụ ngoài.')

for i, uid in enumerate(DETAIL, 1):
    R.h('2.%d. Chức năng %s — %s' % (i, uid, UC_NAME[uid]), 3)
    R.h('Biểu đồ trình tự', 4)
    R.fig('seq_' + uid.lower(),
          'Biểu đồ trình tự %s — %s' % (uid, UC_NAME[uid]), 15.5)
    R.h('Biểu đồ cộng tác', 4)
    R.fig('col_' + uid.lower(),
          'Biểu đồ cộng tác %s — %s' % (uid, UC_NAME[uid]), 15.5)

# ===========================================================================
# CHƯƠNG III + IV
# ===========================================================================
chapters34.write(R, DETAIL, UC_NAME)

target = ROOT / 'docs' / 'Bao-cao-PTTKHT-So-Tay-Sinh-Vien-CNTT.docx'
R.save(target, 'Đồ án Phân tích thiết kế hệ thống — Sổ Tay Sinh Viên CNTT',
       'Đồ án Phân tích thiết kế hệ thống')
print('Đã ghi:', target)
print('Số hình:', R.fig_no, '· số bảng:', R.tab_no)
