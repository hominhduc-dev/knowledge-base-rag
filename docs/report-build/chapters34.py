# -*- coding: utf-8 -*-
"""Chương III (thiết kế hệ thống) và Chương IV (kết luận)."""
import re

from report_doc import ROOT, CENTER, LEFT

MIG = ROOT / 'server/prisma/migrations/20260829031547_init/migration.sql'

# Từ điển dữ liệu — đối chiếu server/prisma/schema.prisma.
TABLES = [
    ('users', 'Tài khoản người dùng', [
        ('id', 'UUID', 'PK'),
        ('email', 'VARCHAR(255)', 'NOT NULL, UNIQUE, UNIQUE lower(email)'),
        ('code', 'VARCHAR(20)', 'NULL, UNIQUE — mã sinh viên hoặc mã cán bộ'),
        ('password_hash', 'VARCHAR(255)', 'NOT NULL — băm bcrypt'),
        ('full_name', 'VARCHAR(200)', 'NOT NULL'),
        ('is_active', 'BOOLEAN', 'NOT NULL, DEFAULT true'),
        ('last_login_at', 'TIMESTAMPTZ(6)', 'NULL'),
        ('created_at', 'TIMESTAMPTZ(6)', 'NOT NULL, DEFAULT CURRENT_TIMESTAMP'),
        ('updated_at', 'TIMESTAMPTZ(6)', 'NOT NULL'),
    ], ['Khóa chính: id',
        'Ràng buộc: email là duy nhất, đồng thời có chỉ mục duy nhất trên lower(email) '
        'để chặn hai tài khoản chỉ khác nhau chữ hoa và chữ thường',
        'Ràng buộc: code cho phép NULL vì không phải người dùng nào cũng được cấp mã',
        'Ràng buộc: is_active = false thì chặn đăng nhập']),
    ('departments', 'Đơn vị (khoa, phòng ban)', [
        ('id', 'UUID', 'PK'),
        ('code', 'VARCHAR(20)', 'NOT NULL, UNIQUE — ví dụ CNTT'),
        ('name', 'VARCHAR(200)', 'NOT NULL'),
        ('type', 'dept_type', 'NOT NULL, CHECK (FACULTY, OFFICE)'),
        ('parent_id', 'UUID', 'NULL, FK → departments(id), ON DELETE RESTRICT'),
        ('created_at', 'TIMESTAMPTZ(6)', 'NOT NULL, DEFAULT CURRENT_TIMESTAMP'),
        ('updated_at', 'TIMESTAMPTZ(6)', 'NOT NULL'),
    ], ['Khóa chính: id', 'Khóa ngoại: parent_id trỏ về chính bảng để tạo cây đơn vị',
        'Ràng buộc: code là duy nhất trong toàn hệ thống']),
    ('department_members', 'Tư cách thành viên và vai trong đơn vị', [
        ('id', 'UUID', 'PK'),
        ('user_id', 'UUID', 'NOT NULL, FK → users(id), ON DELETE CASCADE'),
        ('department_id', 'UUID', 'NOT NULL, FK → departments(id), ON DELETE CASCADE'),
        ('role', 'member_role', 'NOT NULL, CHECK (USER, CONTENT_ADMIN, SYSTEM_ADMIN)'),
        ('created_at', 'TIMESTAMPTZ(6)', 'NOT NULL, DEFAULT CURRENT_TIMESTAMP'),
    ], ['Khóa chính: id', 'Khóa ngoại: user_id, department_id',
        'Ràng buộc: UNIQUE(user_id, department_id) — một người chỉ có một vai trong '
        'một đơn vị',
        'Chỉ mục: (user_id) để tra vai nhanh ở mỗi request',
        'Ghi chú: vai trò nằm ở bảng này chứ không nằm trong users; ứng dụng chỉ dùng '
        'dòng thuộc đơn vị CNTT']),
    ('documents', 'Tài liệu học vụ', [
        ('id', 'UUID', 'PK'),
        ('title', 'VARCHAR(500)', 'NOT NULL'),
        ('department_id', 'UUID', 'NULL, FK → departments(id), ON DELETE RESTRICT'),
        ('visibility', 'SMALLINT', 'NOT NULL, DEFAULT 1'),
        ('source_type', 'VARCHAR(10)', 'NOT NULL — PDF hoặc DOCX'),
        ('file_path', 'VARCHAR(500)', 'NOT NULL'),
        ('file_hash', 'CHAR(64)', 'NOT NULL, UNIQUE — SHA-256 của tệp'),
        ('page_count', 'INTEGER', 'NULL'),
        ('status', 'doc_status', 'NOT NULL, DEFAULT PENDING, CHECK (PENDING, '
                                 'PROCESSING, READY, FAILED)'),
        ('error_message', 'TEXT', 'NULL'),
        ('uploaded_by', 'UUID', 'NOT NULL, FK → users(id), ON DELETE RESTRICT'),
        ('created_at', 'TIMESTAMPTZ(6)', 'NOT NULL, DEFAULT CURRENT_TIMESTAMP'),
        ('updated_at', 'TIMESTAMPTZ(6)', 'NOT NULL'),
    ], ['Khóa chính: id', 'Khóa ngoại: department_id, uploaded_by',
        'Ràng buộc: file_hash là duy nhất — tải lại đúng tệp cũ trả về bản ghi cũ, '
        'không xử lý lại',
        'Ràng buộc: department_id NULL nghĩa là tài liệu chung của toàn trường',
        'Chỉ mục: (department_id, visibility, status) và (status)']),
    ('chunks', 'Đoạn văn cắt ra từ tài liệu', [
        ('id', 'UUID', 'PK'),
        ('document_id', 'UUID', 'NOT NULL, FK → documents(id), ON DELETE CASCADE'),
        ('chunk_index', 'INTEGER', 'NOT NULL'),
        ('content', 'TEXT', 'NOT NULL'),
        ('content_hash', 'CHAR(64)', 'NOT NULL'),
        ('heading_path', 'TEXT', 'NULL — ví dụ “Chương II > Điều 12 > Khoản 3”'),
        ('page_from', 'INTEGER', 'NULL'),
        ('page_to', 'INTEGER', 'NULL'),
        ('token_count', 'INTEGER', 'NOT NULL'),
        ('department_id', 'UUID', 'NULL, FK → departments(id) — lặp từ documents'),
        ('visibility', 'SMALLINT', 'NOT NULL — lặp từ documents'),
        ('content_tsv', 'TSVECTOR', 'GENERATED ALWAYS AS to_tsvector(simple, content) '
                                    'STORED'),
        ('created_at', 'TIMESTAMPTZ(6)', 'NOT NULL, DEFAULT CURRENT_TIMESTAMP'),
    ], ['Khóa chính: id', 'Khóa ngoại: document_id, department_id',
        'Ràng buộc: UNIQUE(document_id, chunk_index)',
        'Chỉ mục: (department_id, visibility) — chỉ mục quan trọng nhất, cho phép lọc '
        'phạm vi TRƯỚC khi xếp hạng',
        'Chỉ mục: GIN trên content_tsv phục vụ nhánh tìm kiếm toàn văn',
        'Ghi chú: hai cột phạm vi được lặp có chủ đích và giữ đồng bộ bằng trigger']),
    ('chunk_embeddings', 'Vector nhúng của đoạn văn', [
        ('id', 'BIGSERIAL', 'PK'),
        ('chunk_id', 'UUID', 'NOT NULL, FK → chunks(id), ON DELETE CASCADE'),
        ('embedding', 'VECTOR(1536)', 'NOT NULL'),
        ('model', 'VARCHAR(64)', 'NOT NULL — tên mô hình nhúng'),
        ('created_at', 'TIMESTAMPTZ(6)', 'NOT NULL, DEFAULT CURRENT_TIMESTAMP'),
    ], ['Khóa chính: id', 'Khóa ngoại: chunk_id',
        'Ràng buộc: UNIQUE(chunk_id, model) — một đoạn có thể có vector của nhiều mô '
        'hình, mọi truy hồi phải lọc theo mô hình hiện hành',
        'Chỉ mục: HNSW trên embedding với vector_cosine_ops']),
    ('ingest_jobs', 'Hàng đợi xử lý tài liệu', [
        ('id', 'UUID', 'PK'),
        ('document_id', 'UUID', 'NOT NULL, FK → documents(id), ON DELETE CASCADE'),
        ('status', 'job_status', 'NOT NULL, DEFAULT PENDING, CHECK (PENDING, '
                                 'PROCESSING, DONE, FAILED)'),
        ('retry_count', 'INTEGER', 'NOT NULL, DEFAULT 0'),
        ('last_error', 'TEXT', 'NULL'),
        ('started_at', 'TIMESTAMPTZ(6)', 'NULL'),
        ('finished_at', 'TIMESTAMPTZ(6)', 'NULL'),
        ('created_at', 'TIMESTAMPTZ(6)', 'NOT NULL, DEFAULT CURRENT_TIMESTAMP'),
    ], ['Khóa chính: id', 'Khóa ngoại: document_id',
        'Chỉ mục: (status, created_at) để worker lấy việc theo thứ tự',
        'Ghi chú: worker lấy việc bằng SELECT … FOR UPDATE SKIP LOCKED, dừng sau ba '
        'lần thử']),
    ('conversations', 'Hội thoại của người dùng', [
        ('id', 'UUID', 'PK'),
        ('user_id', 'UUID', 'NOT NULL, FK → users(id), ON DELETE CASCADE'),
        ('title', 'VARCHAR(300)', 'NOT NULL — sinh từ câu hỏi đầu tiên'),
        ('created_at', 'TIMESTAMPTZ(6)', 'NOT NULL, DEFAULT CURRENT_TIMESTAMP'),
        ('updated_at', 'TIMESTAMPTZ(6)', 'NOT NULL'),
    ], ['Khóa chính: id', 'Khóa ngoại: user_id',
        'Chỉ mục: (user_id, updated_at DESC)',
        'Ràng buộc nghiệp vụ: hội thoại thuộc riêng người tạo, mọi truy vấn đọc đều '
        'lọc theo user_id']),
    ('messages', 'Tin nhắn trong hội thoại', [
        ('id', 'UUID', 'PK'),
        ('conversation_id', 'UUID', 'NOT NULL, FK → conversations(id), ON DELETE CASCADE'),
        ('role', 'message_role', 'NOT NULL, CHECK (USER, ASSISTANT)'),
        ('content', 'TEXT', 'NOT NULL'),
        ('latency_ms', 'INTEGER', 'NULL — đo yêu cầu phi chức năng'),
        ('created_at', 'TIMESTAMPTZ(6)', 'NOT NULL, DEFAULT CURRENT_TIMESTAMP'),
    ], ['Khóa chính: id', 'Khóa ngoại: conversation_id',
        'Chỉ mục: (conversation_id, created_at)']),
    ('message_citations', 'Trích dẫn của một câu trả lời', [
        ('id', 'UUID', 'PK'),
        ('message_id', 'UUID', 'NOT NULL, FK → messages(id), ON DELETE CASCADE'),
        ('chunk_id', 'UUID', 'NULL, FK → chunks(id), ON DELETE SET NULL'),
        ('document_id', 'UUID', 'NULL, FK → documents(id), ON DELETE SET NULL'),
        ('rank', 'INTEGER', 'NOT NULL — khớp marker [n] trong câu trả lời'),
        ('score', 'DOUBLE PRECISION', 'NOT NULL'),
        ('quote', 'TEXT', 'NOT NULL — bản sao đoạn trích'),
        ('heading_path', 'TEXT', 'NULL'),
        ('page', 'INTEGER', 'NULL'),
    ], ['Khóa chính: id', 'Khóa ngoại: message_id, chunk_id, document_id',
        'Chỉ mục: (message_id, rank)',
        'Ràng buộc: hai khóa ngoại nguồn cho phép NULL và dùng ON DELETE SET NULL để '
        'lịch sử hội thoại vẫn hiển thị được trích dẫn sau khi tài liệu bị gỡ']),
    ('eval_sets', 'Bộ câu hỏi đánh giá', [
        ('id', 'UUID', 'PK'),
        ('name', 'VARCHAR(200)', 'NOT NULL, UNIQUE — ví dụ cntt-v1'),
        ('description', 'TEXT', 'NULL'),
        ('created_at', 'TIMESTAMPTZ(6)', 'NOT NULL, DEFAULT CURRENT_TIMESTAMP'),
    ], ['Khóa chính: id', 'Ràng buộc: name là duy nhất']),
    ('eval_questions', 'Câu hỏi trong bộ đánh giá', [
        ('id', 'UUID', 'PK'),
        ('eval_set_id', 'UUID', 'NOT NULL, FK → eval_sets(id), ON DELETE CASCADE'),
        ('code', 'VARCHAR(50)', 'NOT NULL'),
        ('question', 'TEXT', 'NOT NULL'),
        ('asker_department_id', 'UUID', 'NULL — đơn vị của người hỏi giả định'),
        ('note', 'TEXT', 'NULL'),
    ], ['Khóa chính: id', 'Khóa ngoại: eval_set_id',
        'Ràng buộc: UNIQUE(eval_set_id, code)']),
    ('eval_gold_chunks', 'Đoạn văn kỳ vọng của mỗi câu hỏi', [
        ('id', 'UUID', 'PK'),
        ('question_id', 'UUID', 'NOT NULL, FK → eval_questions(id), ON DELETE CASCADE'),
        ('chunk_id', 'UUID', 'NOT NULL, FK → chunks(id), ON DELETE CASCADE'),
    ], ['Khóa chính: id', 'Khóa ngoại: question_id, chunk_id',
        'Ràng buộc: UNIQUE(question_id, chunk_id)']),
    ('eval_runs', 'Một lần chạy bộ đánh giá', [
        ('id', 'UUID', 'PK'),
        ('eval_set_id', 'UUID', 'NOT NULL, FK → eval_sets(id), ON DELETE RESTRICT'),
        ('name', 'VARCHAR(200)', 'NOT NULL'),
        ('config', 'JSONB', 'NOT NULL — tham số cắt đoạn, alpha, top_k, mô hình'),
        ('recall_at_5', 'DOUBLE PRECISION', 'NULL'),
        ('recall_at_10', 'DOUBLE PRECISION', 'NULL'),
        ('mrr', 'DOUBLE PRECISION', 'NULL'),
        ('faithfulness', 'DOUBLE PRECISION', 'NULL'),
        ('avg_latency_ms', 'INTEGER', 'NULL'),
        ('note', 'TEXT', 'NULL'),
        ('created_at', 'TIMESTAMPTZ(6)', 'NOT NULL, DEFAULT CURRENT_TIMESTAMP'),
    ], ['Khóa chính: id', 'Khóa ngoại: eval_set_id']),
    ('eval_results', 'Kết quả của từng câu hỏi trong một lần chạy', [
        ('id', 'UUID', 'PK'),
        ('eval_run_id', 'UUID', 'NOT NULL, FK → eval_runs(id), ON DELETE CASCADE'),
        ('question_id', 'UUID', 'NOT NULL, FK → eval_questions(id), ON DELETE CASCADE'),
        ('hit', 'BOOLEAN', 'NOT NULL'),
        ('rank_of_first_hit', 'INTEGER', 'NULL'),
        ('latency_ms', 'INTEGER', 'NULL'),
        ('vector_hits', 'INTEGER', 'NULL'),
        ('keyword_hits', 'INTEGER', 'NULL'),
    ], ['Khóa chính: id', 'Khóa ngoại: eval_run_id, question_id',
        'Ràng buộc: UNIQUE(eval_run_id, question_id)']),
]

STATE_FIGS = [
    ('st_tailieu', 'Biểu đồ trạng thái lớp TaiLieu (documents)',
     'Tài liệu đi qua bốn trạng thái. Thao tác chạy lại đưa tài liệu FAILED trở về '
     'PENDING thay vì bắt giáo vụ tải lại tệp.'),
    ('st_job', 'Biểu đồ trạng thái lớp JobNhapLieu (ingest_jobs)',
     'Worker lấy việc bằng SELECT … FOR UPDATE SKIP LOCKED nên hai worker không nhận '
     'trùng một job. Số lần thử lại dừng ở ba.'),
    ('st_taikhoan', 'Biểu đồ trạng thái lớp NguoiDung (users)',
     'Tài khoản chỉ chuyển giữa hoạt động và bị khóa; hệ thống không có thao tác xóa '
     'tài khoản. Gỡ tư cách thành viên khiến tài khoản không dùng được ứng dụng dù '
     'vẫn tồn tại.'),
    ('st_luot', 'Biểu đồ trạng thái của một lượt hỏi đáp',
     'Đây là trạng thái quan trọng nhất của đề tài: mọi nhánh đều phải đi qua bước '
     'kiểm trích dẫn trước khi lưu, và nhánh không có nguồn kết thúc bằng câu từ chối '
     'chứ không bằng một câu trả lời suy đoán.'),
    ('st_hoithoai', 'Biểu đồ trạng thái lớp HoiThoai (conversations)',
     'Hội thoại được tạo ở lượt hỏi đầu tiên, nhận thêm lượt trong khi trao đổi và '
     'chuyển sang chế độ chỉ đọc khi người dùng mở lại từ lịch sử.'),
]
FORM_FIGS = [
    ('stf_dangnhap', 'Biểu đồ trạng thái form Đăng nhập'),
    ('stf_hoidap', 'Biểu đồ trạng thái form Hỏi đáp'),
    ('stf_tailieu', 'Biểu đồ trạng thái form Kho tài liệu'),
    ('stf_tailen', 'Biểu đồ trạng thái form Tải lên tài liệu'),
    ('stf_taikhoan', 'Biểu đồ trạng thái form Quản lý tài khoản'),
    ('stf_phanquyen', 'Biểu đồ trạng thái form Phân quyền'),
]
UI_FIGS = [
    ('ui_dangnhap', 'Giao diện đăng nhập',
     'Chỉ có ô tài khoản, ô mật khẩu và nút đăng nhập. Không có liên kết đăng ký vì '
     'hệ thống không cho tự tạo tài khoản.'),
    ('ui_hoidap', 'Giao diện hỏi đáp học vụ',
     'Câu trả lời hiển thị dần theo luồng SSE; các số hiệu nguồn trong ngoặc vuông là '
     'liên kết mở ngăn trích dẫn. Hai nhãn trạng thái cho biết đang nhận dữ liệu và '
     'số nguồn thực sự được dẫn.'),
    ('ui_trichdan', 'Giao diện ngăn nguồn trích dẫn',
     'Ngăn bên phải hiện đoạn văn gốc, vị trí trích dẫn và phạm vi của tài liệu. Nút '
     'mở tệp gốc đi qua endpoint có kiểm tra quyền chứ không phải liên kết tĩnh.'),
    ('ui_tailieu', 'Giao diện kho tài liệu',
     'Danh sách chỉ hiện tài liệu trong phạm vi được phép đọc. Cột trạng thái cho biết '
     'tài liệu đã sẵn sàng truy hồi hay chưa.'),
    ('ui_tailen', 'Giao diện tải lên và theo dõi xử lý',
     'Vùng kéo thả nhận tệp PDF hoặc DOCX. Bảng dưới liệt kê công việc nhập liệu kèm '
     'số lần thử và nút chạy lại cho tài liệu bị lỗi.'),
    ('ui_hoithoai', 'Giao diện danh sách hội thoại',
     'Chỉ liệt kê hội thoại của chính người đăng nhập; việc lọc thực hiện ở truy vấn '
     'chứ không ở giao diện.'),
    ('ui_canhan', 'Giao diện thông tin cá nhân và đổi mật khẩu',
     'Vai trò hiển thị ở đây được đọc lại từ cơ sở dữ liệu ở mỗi request.'),
    ('ui_nguoidung', 'Giao diện quản lý tài khoản',
     'Chỉ quản trị viên thấy màn hình này. Thao tác duy nhất trên tài khoản là khóa '
     'hoặc mở; không có nút xóa.'),
    ('ui_phanquyen', 'Giao diện phân quyền tài khoản',
     'Ma trận quyền theo ba vai. Thao tác tự hạ quyền của chính người đang đăng nhập '
     'bị chặn ở phía máy chủ.'),
]


def _ddl():
    """Lấy phần DDL thật trong migration khởi tạo, bỏ các dòng chú thích tiếng Việt
    không dấu để bảng mã trong báo cáo gọn hơn."""
    text = MIG.read_text(encoding='utf8')
    out, skip = [], False
    for line in text.split('\n'):
        s = line.rstrip()
        if s.strip().startswith('--'):
            continue
        if not s.strip() and (not out or not out[-1].strip()):
            continue
        out.append(s)
    return '\n'.join(out).strip()


def write(R, DETAIL, UC_NAME):
    R.page()
    R.h('CHƯƠNG III. THIẾT KẾ HỆ THỐNG', 1)

    # -- 1. Biểu đồ lớp -----------------------------------------------------
    R.h('1. Biểu đồ lớp', 2)
    R.h('1.1. Biểu đồ lớp tổng quát', 3)
    R.p('Hệ thống được tổ chức theo mô hình client – server ba lớp logic. Lớp giao '
        'diện chạy trên trình duyệt, lớp điều khiển và lớp nghiệp vụ chạy trên máy '
        'chủ ứng dụng, lớp thực thể ánh xạ xuống cơ sở dữ liệu PostgreSQL. Ba lớp '
        'logic không đồng nghĩa với ba máy chủ vật lý.')
    R.fig('class_tongquat', 'Biểu đồ lớp tổng quát theo ba lớp logic', 15.5)
    R.p('Worker nhập liệu là một tiến trình riêng đọc hàng đợi trong cơ sở dữ liệu; nó '
        'ghi đoạn văn và vector nhưng không phục vụ request nào của người dùng. Dịch '
        'vụ Gemini nằm ngoài hệ thống và chỉ được gọi từ lớp nghiệp vụ.')

    R.h('1.2. Biểu đồ lớp chi tiết', 3)
    R.p('Mười lớp thực thể dưới đây ánh xạ một–một với các bảng nghiệp vụ trong cơ sở '
        'dữ liệu. Tên thuộc tính giữ theo tên cột vật lý, kiểu dữ liệu ghi theo khai '
        'báo trong lược đồ.')
    R.fig('class_chitiet', 'Biểu đồ lớp chi tiết của các thực thể nghiệp vụ', 15.5)
    R.p('Nhóm năm lớp phục vụ đánh giá chất lượng truy hồi (eval_sets, eval_questions, '
        'eval_gold_chunks, eval_runs, eval_results) không vẽ ở đây vì chúng chỉ phục '
        'vụ công cụ dòng lệnh, không tham gia luồng nghiệp vụ của người dùng; cấu trúc '
        'đầy đủ nằm trong từ điển dữ liệu ở mục 3.1.')

    R.h('1.3. Biểu đồ lớp tham gia ca sử dụng', 3)
    R.p('Mỗi ca sử dụng được đặc tả ở Chương II có một biểu đồ lớp tham gia, cho thấy '
        'các lớp biên, lớp điều khiển và lớp thực thể cùng tham gia thực hiện chức '
        'năng đó.')
    for i, uid in enumerate(DETAIL, 1):
        R.h('1.3.%d. Ca sử dụng %s — %s' % (i, uid, UC_NAME[uid]), 4)
        R.fig('vopc_' + uid.lower(),
              'Lớp tham gia ca sử dụng %s — %s' % (uid, UC_NAME[uid]), 15.5)

    # -- 2. Biểu đồ hành vi -------------------------------------------------
    R.page()
    R.h('2. Biểu đồ hành vi', 2)
    R.h('2.1. Biểu đồ trạng thái', 3)
    R.h('2.1.1. Trạng thái của các lớp chính', 4)
    R.p('Năm lớp dưới đây có thay đổi trạng thái trong vòng đời của đối tượng.')
    for name, cap, note in STATE_FIGS:
        R.fig(name, cap, 15.5)
        R.p(note)
    R.h('2.1.2. Trạng thái của các form chính', 4)
    R.p('Sáu form dưới đây tương ứng hơn 30% số ca sử dụng chi tiết, gồm các màn hình '
        'có nhiều trạng thái hiển thị: đang tải, có kết quả, rỗng và lỗi.')
    for name, cap in FORM_FIGS:
        R.fig(name, cap, 15.0)

    R.page()
    R.h('2.2. Biểu đồ hoạt động', 3)
    R.p('Biểu đồ hoạt động của 12 ca sử dụng chính. Mỗi biểu đồ tách rõ nhánh thành '
        'công và nhánh bị chặn, vì phần lớn rủi ro của đề tài nằm ở nhánh bị chặn: rò '
        'phạm vi tài liệu, vượt quyền, hoặc trả lời không có căn cứ.')
    for i, uid in enumerate(DETAIL, 1):
        R.h('2.2.%d. Hoạt động của ca sử dụng %s — %s' % (i, uid, UC_NAME[uid]), 4)
        R.fig('act_' + uid.lower(),
              'Biểu đồ hoạt động %s — %s' % (uid, UC_NAME[uid]), 12.0)

    # -- 3. Cơ sở dữ liệu ---------------------------------------------------
    R.page()
    R.h('3. Xây dựng và cài đặt cơ sở dữ liệu', 2)
    R.h('3.1. Mô tả cơ sở dữ liệu', 3)
    R.h('3.1.1. Sơ đồ quan hệ giữa các bảng', 4)
    R.fig('erd', 'Quan hệ giữa các bảng nghiệp vụ', 15.5)
    R.p('Quan hệ 1 : N nghĩa là một bản ghi phía trái tương ứng nhiều bản ghi phía '
        'phải. Ký hiệu 0..1 : N cho biết khóa ngoại phía N có thể rỗng. Sơ đồ lược bớt '
        'ba đường ít dùng để dễ đọc: users → documents (người tải lên), '
        'departments → chunks (phạm vi lặp) và documents → message_citations; các ràng '
        'buộc đầy đủ nằm trong từ điển dữ liệu dưới đây.')
    R.p('Hệ thống dùng PostgreSQL 16 kèm phần mở rộng pgvector. Cơ sở dữ liệu gồm 15 '
        'bảng: 10 bảng nghiệp vụ và 5 bảng phục vụ đánh giá chất lượng truy hồi.')

    R.h('3.1.2. Định nghĩa các bảng và ràng buộc', 4)
    for tname, tdesc, cols, notes in TABLES:
        R.h('Bảng %s — %s' % (tname, tdesc), 4)
        R.table(['Thuộc tính', 'Kiểu dữ liệu', 'Ràng buộc'],
                [[c, t, r] for c, t, r in cols], [4.0, 3.9, 7.6], size=11)
        R.bullets(notes, dash='+')

    R.h('3.1.3. Bốn ràng buộc không diễn đạt được bằng ORM', 4)
    R.p('Bốn cấu trúc dưới đây phải viết tay trong migration vì lớp ánh xạ đối tượng '
        'không sinh ra được. Bỏ sót bất kỳ cấu trúc nào cũng gây lỗi im lặng chứ '
        'không báo lỗi khi chạy:')
    R.bullets([
        'Cột content_tsv khai báo GENERATED ALWAYS, dùng cấu hình simple thay vì '
        'english vì bộ tách từ tiếng Anh làm hỏng từ tiếng Việt.',
        'Chỉ mục HNSW trên chunk_embeddings.embedding và chỉ mục GIN trên content_tsv '
        '— hai nhánh của tìm kiếm lai.',
        'Chỉ mục duy nhất trên lower(email) để chặn hai tài khoản chỉ khác nhau chữ '
        'hoa và chữ thường.',
        'Trigger đồng bộ department_id và visibility từ documents xuống chunks; thiếu '
        'trigger này thì tài liệu chuyển đơn vị nhưng các đoạn vẫn mang phạm vi cũ, '
        'tức là rò dữ liệu mà không có thông báo lỗi nào.',
    ], dash='+')

    R.page()
    R.h('3.2. Thực hiện cài đặt cơ sở dữ liệu', 3)
    R.p('Đoạn mã dưới đây là nội dung migration khởi tạo đang chạy trong dự án, gồm '
        'phần mở rộng vector, các kiểu liệt kê, mười lăm bảng, các ràng buộc khóa '
        'ngoại và bốn khối viết tay nêu ở mục 3.1.3.')
    R.code(_ddl(), size=9)
    R.p('Migration thứ hai đổi tên giá trị của kiểu member_role cho khớp mô hình ba '
        'vai hiện hành, giữ nguyên toàn bộ dữ liệu tài khoản và lịch sử:')
    R.code("""ALTER TYPE "member_role" RENAME VALUE 'STUDENT' TO 'USER';
ALTER TYPE "member_role" RENAME VALUE 'ADMIN' TO 'CONTENT_ADMIN';
ALTER TYPE "member_role" ADD VALUE 'SYSTEM_ADMIN';""", size=10)

    R.h('3.3. Thủ tục, hàm và trigger', 3)
    R.p('Các thủ tục và hàm dưới đây hiện thực hóa những phương thức chính của các lớp '
        'ở mục 1.2 ngay trong cơ sở dữ liệu. Chúng được viết bằng PL/pgSQL cho '
        'PostgreSQL, đặt các bước phải toàn vẹn cùng nhau vào chung một giao dịch.')

    R.h('3.3.1. Thủ tục — Cấp tài khoản và gán vai', 4)
    R.p('Tương ứng phương thức NguoiDung.dangNhap() và ThanhVienDonVi.ganThanhVien(). '
        'Hệ thống không có tự đăng ký nên tài khoản được cấp bằng thủ tục này.')
    R.code("""CREATE OR REPLACE PROCEDURE sp_cap_tai_khoan(
    p_email        VARCHAR(255),
    p_code         VARCHAR(20),
    p_mat_khau_bam VARCHAR(255),
    p_ho_ten       VARCHAR(200),
    p_ma_don_vi    VARCHAR(20),
    p_vai          member_role
)
LANGUAGE plpgsql AS $$
DECLARE
    v_user_id UUID;
    v_dept_id UUID;
BEGIN
    SELECT id INTO v_dept_id FROM departments WHERE code = p_ma_don_vi;
    IF v_dept_id IS NULL THEN
        RAISE EXCEPTION 'Khong tim thay don vi %', p_ma_don_vi;
    END IF;

    INSERT INTO users (id, email, code, password_hash, full_name, updated_at)
    VALUES (gen_random_uuid(), lower(p_email), upper(p_code),
            p_mat_khau_bam, p_ho_ten, now())
    RETURNING id INTO v_user_id;

    INSERT INTO department_members (id, user_id, department_id, role)
    VALUES (gen_random_uuid(), v_user_id, v_dept_id, p_vai);
END;
$$;""")

    R.h('3.3.2. Thủ tục — Tải lên tài liệu và tạo công việc xử lý', 4)
    R.p('Tương ứng phương thức TaiLieu.taiLen(). Bản ghi tài liệu và công việc nhập '
        'liệu phải được tạo trong cùng một giao dịch; nếu tệp đã tồn tại theo mã băm '
        'thì trả về bản ghi cũ thay vì xử lý lại.')
    R.code("""CREATE OR REPLACE FUNCTION sp_tai_len_tai_lieu(
    p_tieu_de     VARCHAR(500),
    p_don_vi_id   UUID,
    p_loai_nguon  VARCHAR(10),
    p_duong_dan   VARCHAR(500),
    p_ma_bam      CHAR(64),
    p_nguoi_tai   UUID
) RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
    v_doc_id UUID;
BEGIN
    SELECT id INTO v_doc_id FROM documents WHERE file_hash = p_ma_bam;
    IF v_doc_id IS NOT NULL THEN
        RETURN v_doc_id;                      -- tep trung: tra ban ghi cu
    END IF;

    INSERT INTO documents (id, title, department_id, visibility, source_type,
                           file_path, file_hash, status, uploaded_by, updated_at)
    VALUES (gen_random_uuid(), p_tieu_de, p_don_vi_id, 1, p_loai_nguon,
            p_duong_dan, p_ma_bam, 'PENDING', p_nguoi_tai, now())
    RETURNING id INTO v_doc_id;

    INSERT INTO ingest_jobs (id, document_id, status)
    VALUES (gen_random_uuid(), v_doc_id, 'PENDING');

    RETURN v_doc_id;
END;
$$;""")

    R.h('3.3.3. Thủ tục — Lưu một lượt hỏi đáp', 4)
    R.p('Tương ứng phương thức TinNhan.luuLuot() và TrichDan.saoChepNguon(). Câu hỏi, '
        'câu trả lời và danh sách trích dẫn phải cùng thành công hoặc cùng thất bại; '
        'nếu không, hội thoại sẽ có câu trả lời không kèm nguồn.')
    R.code("""CREATE OR REPLACE FUNCTION sp_luu_luot_hoi_dap(
    p_user_id     UUID,
    p_hoi_thoai   UUID,          -- NULL thi tao hoi thoai moi
    p_cau_hoi     TEXT,
    p_cau_tra_loi TEXT,
    p_do_tre_ms   INTEGER,
    p_trich_dan   JSONB          -- [{rank, score, quote, chunk_id, document_id}]
) RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
    v_conv UUID := p_hoi_thoai;
    v_msg  UUID;
    v_item JSONB;
BEGIN
    IF v_conv IS NULL THEN
        INSERT INTO conversations (id, user_id, title, updated_at)
        VALUES (gen_random_uuid(), p_user_id, left(p_cau_hoi, 300), now())
        RETURNING id INTO v_conv;
    ELSE
        PERFORM 1 FROM conversations WHERE id = v_conv AND user_id = p_user_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Hoi thoai khong thuoc nguoi goi';
        END IF;
        UPDATE conversations SET updated_at = now() WHERE id = v_conv;
    END IF;

    INSERT INTO messages (id, conversation_id, role, content)
    VALUES (gen_random_uuid(), v_conv, 'USER', p_cau_hoi);

    INSERT INTO messages (id, conversation_id, role, content, latency_ms)
    VALUES (gen_random_uuid(), v_conv, 'ASSISTANT', p_cau_tra_loi, p_do_tre_ms)
    RETURNING id INTO v_msg;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_trich_dan) LOOP
        INSERT INTO message_citations (id, message_id, chunk_id, document_id,
                                       rank, score, quote, heading_path, page)
        VALUES (gen_random_uuid(), v_msg,
                (v_item->>'chunk_id')::UUID, (v_item->>'document_id')::UUID,
                (v_item->>'rank')::INT, (v_item->>'score')::FLOAT,
                v_item->>'quote', v_item->>'heading_path',
                (v_item->>'page')::INT);
    END LOOP;

    RETURN v_conv;
END;
$$;""")

    R.h('3.3.4. Hàm — Kiểm tra phạm vi đọc tài liệu', 4)
    R.p('Tương ứng phương thức DoanVan.locTheoPhamVi(). Hàm trả về đúng hay sai cho '
        'câu hỏi “người dùng này có được đọc tài liệu kia không”, dùng chung cho tra '
        'cứu tài liệu, mở nguồn trích dẫn và tải tệp gốc.')
    R.code("""CREATE OR REPLACE FUNCTION fn_duoc_doc_tai_lieu(
    p_user_id UUID,
    p_doc_id  UUID
) RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1
        FROM documents d
        JOIN users u ON u.id = p_user_id AND u.is_active
        JOIN department_members m ON m.user_id = u.id
        JOIN departments dv ON dv.id = m.department_id AND dv.code = 'CNTT'
        WHERE d.id = p_doc_id
          AND d.visibility <= 1
          AND (d.department_id IS NULL OR d.department_id = dv.id)
    );
$$;""")

    R.h('3.3.5. Hàm — Đếm số đoạn đã nhúng của một tài liệu', 4)
    R.p('Tương ứng phương thức TaiLieu.chayLai(): giáo vụ cần biết tài liệu đã nhúng '
        'được bao nhiêu đoạn trước khi quyết định chạy lại.')
    R.code("""CREATE OR REPLACE FUNCTION fn_dem_doan_da_nhung(
    p_doc_id UUID,
    p_model  VARCHAR(64)
) RETURNS TABLE (tong_doan BIGINT, da_nhung BIGINT)
LANGUAGE sql STABLE AS $$
    SELECT count(c.id),
           count(e.id) FILTER (WHERE e.model = p_model)
    FROM chunks c
    LEFT JOIN chunk_embeddings e ON e.chunk_id = c.id
    WHERE c.document_id = p_doc_id;
$$;""")

    R.h('3.3.6. Trigger — Đồng bộ phạm vi từ tài liệu xuống đoạn văn', 4)
    R.p('Đây là trigger đang chạy trong dự án. Hai cột phạm vi được lặp xuống bảng '
        'đoạn văn để lọc được trước khi xếp hạng; trigger trả cái giá của việc lặp đó '
        'thay vì trông chờ lập trình viên nhớ cập nhật cả hai nơi.')
    R.code("""CREATE OR REPLACE FUNCTION sync_chunk_scope() RETURNS trigger AS $$
BEGIN
    IF NEW."department_id" IS DISTINCT FROM OLD."department_id"
       OR NEW."visibility" IS DISTINCT FROM OLD."visibility" THEN
        UPDATE "chunks"
           SET "department_id" = NEW."department_id",
               "visibility"    = NEW."visibility"
         WHERE "document_id"   = NEW."id";
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "documents_sync_chunk_scope"
    AFTER UPDATE ON "documents"
    FOR EACH ROW
    EXECUTE FUNCTION sync_chunk_scope();""")

    R.h('3.3.7. Trigger — Cập nhật trạng thái tài liệu theo công việc nhập liệu', 4)
    R.p('Tương ứng phương thức JobNhapLieu.ketThuc(). Khi worker kết thúc một công '
        'việc, trạng thái tài liệu được cập nhật ngay trong cùng giao dịch, tránh '
        'trường hợp job đã DONE mà tài liệu vẫn hiển thị PROCESSING.')
    R.code("""CREATE OR REPLACE FUNCTION trg_cap_nhat_trang_thai_tai_lieu()
RETURNS trigger AS $$
BEGIN
    IF NEW.status = 'DONE' THEN
        UPDATE documents
           SET status = 'READY', error_message = NULL, updated_at = now()
         WHERE id = NEW.document_id;
    ELSIF NEW.status = 'FAILED' THEN
        UPDATE documents
           SET status = 'FAILED', error_message = NEW.last_error, updated_at = now()
         WHERE id = NEW.document_id;
    ELSIF NEW.status = 'PROCESSING' THEN
        UPDATE documents
           SET status = 'PROCESSING', updated_at = now()
         WHERE id = NEW.document_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ingest_jobs_sync_document_status"
    AFTER UPDATE OF status ON "ingest_jobs"
    FOR EACH ROW
    EXECUTE FUNCTION trg_cap_nhat_trang_thai_tai_lieu();""")

    R.p('Phiên bản đang chạy đặt cùng nghiệp vụ này ở tầng dịch vụ viết bằng '
        'TypeScript, trong các giao dịch Prisma. Phần SQL trên là thiết kế tương '
        'đương ở mức cơ sở dữ liệu, dùng để đối chiếu và để chuyển nghiệp vụ xuống '
        'gần dữ liệu hơn khi cần.')

    # -- 4. Giao diện -------------------------------------------------------
    R.page()
    R.h('4. Phác họa giao diện', 2)
    R.h('4.1. Sơ đồ SiteMap', 3)
    R.fig('sitemap', 'Sơ đồ di chuyển giữa các màn hình', 14.5)
    R.p('Sau khi đăng nhập, người dùng vào màn hình hỏi đáp. Từ đó mở được lịch sử hội '
        'thoại, kho tài liệu và thông tin cá nhân. Mục quản lý nội dung chỉ hiện với '
        'giáo vụ và quản trị viên; mục quản lý tài khoản chỉ hiện với quản trị viên. '
        'Đăng xuất xóa phiên cục bộ và quay về màn hình đăng nhập.')

    R.h('4.2. Các màn hình chính', 3)
    R.p('Các bản vẽ dưới đây là phác thảo bố cục, không phải ảnh chụp ứng dụng đang '
        'chạy. Ký hiệu * đánh dấu mục chỉ dành cho giáo vụ và quản trị viên, ** đánh '
        'dấu mục chỉ dành cho quản trị viên.')
    for i, (name, cap, note) in enumerate(UI_FIGS, 1):
        R.h('4.2.%d. %s' % (i, cap), 4)
        R.fig(name, cap, 15.0)
        R.p(note)

    # =======================================================================
    # CHƯƠNG IV
    # =======================================================================
    R.page()
    R.h('CHƯƠNG IV. KẾT LUẬN', 1)

    R.h('1. Kết quả đạt được', 2)
    R.bullets([
        'Phân tích được nghiệp vụ tra cứu học vụ của ngành Công nghệ thông tin thành '
        '19 ca sử dụng với ba vai nghiệp vụ, trong đó 12 ca sử dụng chính được đặc tả '
        'chi tiết kèm biểu đồ trình tự, biểu đồ cộng tác, biểu đồ lớp tham gia và '
        'biểu đồ hoạt động.',
        'Thiết kế được lược đồ cơ sở dữ liệu 15 bảng trên PostgreSQL kèm pgvector, '
        'trong đó cơ chế cách ly phạm vi được đặt ở tầng dữ liệu: hai cột phạm vi lặp '
        'xuống bảng đoạn văn cho phép lọc trước khi xếp hạng, và một trigger giữ chúng '
        'đồng bộ với tài liệu.',
        'Xác định được ràng buộc quan trọng nhất của đề tài và thể hiện nhất quán trên '
        'mọi biểu đồ: câu trả lời phải có trích dẫn hợp lệ, không có nguồn thì từ chối '
        'chứ không suy đoán.',
        'Thiết kế được luồng nhập liệu bất đồng bộ dùng hàng đợi ngay trong cơ sở dữ '
        'liệu, có trạng thái, số lần thử lại và thao tác chạy lại cho tài liệu lỗi.',
        'Phác thảo được chín màn hình chính kèm sơ đồ di chuyển, phân biệt rõ phần '
        'giao diện theo từng vai.',
    ])

    R.h('2. Hạn chế của phiên bản hiện tại', 2)
    R.bullets([
        'Hệ thống chỉ phục vụ một khoa. Cấu trúc bảng đơn vị vẫn giữ dạng cây nhiều '
        'cấp nhưng ứng dụng chỉ dùng tư cách thành viên của ngành Công nghệ thông tin.',
        'Chưa xử lý tệp PDF quét ảnh. Luồng nhập liệu giả định tệp có lớp văn bản; tài '
        'liệu quét ảnh sẽ dừng ở trạng thái lỗi.',
        'Chưa có màn hình quản trị cho phân hệ đánh giá chất lượng truy hồi; phần này '
        'chạy bằng công cụ dòng lệnh.',
        'Cấu hình tìm kiếm toàn văn dùng bộ simple nên không chuẩn hóa dấu tiếng Việt: '
        '“học phí” và “hoc phi” chưa khớp nhau ở nhánh từ khóa.',
        'Các ngưỡng phi chức năng nêu trong thiết kế là mục tiêu nghiệm thu, cần đo '
        'trong môi trường triển khai thật trước khi công bố.',
    ])

    R.h('3. Hướng phát triển', 2)
    R.bullets([
        'Mở rộng sang nhiều khoa: bật lại cây đơn vị nhiều cấp và bổ sung màn hình '
        'quản trị phạm vi theo đơn vị.',
        'Bổ sung nhận dạng ký tự quang học cho tệp PDF quét ảnh, đưa vào chính hàng '
        'đợi nhập liệu hiện có.',
        'Chuẩn hóa dấu tiếng Việt cho nhánh tìm kiếm toàn văn và bổ sung mô hình xếp '
        'hạng lại để cải thiện chất lượng truy hồi.',
        'Xây dựng phân hệ web cho bộ đánh giá, cho phép so sánh nhiều cấu hình truy '
        'hồi trực tiếp trên giao diện.',
        'Bổ sung nhật ký thao tác quản trị để truy vết ai đã khóa tài khoản hoặc đổi '
        'vai của ai, phục vụ kiểm toán nội bộ.',
    ])

    R.page()
    R.h('TÀI LIỆU VÀ MÃ NGUỒN ĐỐI CHIẾU', 1)
    R.p('Toàn bộ số liệu, tên bảng, tên cột, đường dẫn API và tên thành phần trong báo '
        'cáo này được đối chiếu trực tiếp với mã nguồn của dự án:')
    R.bullets([
        'server/prisma/schema.prisma và server/prisma/migrations/ — lược đồ cơ sở dữ '
        'liệu, ràng buộc, chỉ mục và trigger.',
        'server/src/routes.ts và server/src/modules/ — danh mục API, phân quyền và '
        'nghiệp vụ của từng ca sử dụng.',
        'server/src/modules/chat/chat.service.ts — luồng hỏi đáp, ràng buộc trích dẫn '
        'và các sự kiện SSE.',
        'server/src/lib/scope.ts — quy tắc phạm vi dùng chung cho truy hồi và tra cứu '
        'tài liệu.',
        'web/src/features/ — các thành phần giao diện tương ứng với phần phác thảo ở '
        'Chương III.',
        'docs/use-cases/README.md và docs/use-cases/sequences/ — danh mục ca sử dụng '
        'và luồng thông điệp của từng chức năng.',
        'docs/phan-quyen.md và docs/PHAM-VI-CNTT.md — mô hình ba vai và phạm vi dữ '
        'liệu hiện hành.',
        'docs/thuat-ngu.md — bảng thuật ngữ đối chiếu Việt – Anh dùng thống nhất trong '
        'báo cáo.',
    ])
    R.p('HẾT BÁO CÁO', align=CENTER, bold=True)
