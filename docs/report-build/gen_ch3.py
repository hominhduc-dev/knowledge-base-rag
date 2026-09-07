# -*- coding: utf-8 -*-
"""Sinh sơ đồ Chương III: lớp, lớp tham gia ca sử dụng, trạng thái, hoạt động,
dữ liệu và phác thảo giao diện.

Tên thuộc tính lấy đúng theo server/prisma/schema.prisma; tên phương thức lấy
theo hàm thật trong server/src. Không đặt tên lớp không có trong mã nguồn.
"""
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

from draw import F, INK, WHITE, box_height
from flow import flow, activity
from uml import classes, vopc
import ui
from gen_ch12 import DETAIL, UCS, parts_of

HERE = Path(__file__).resolve().parent


def cbox(x, y, w, name, attrs, ops):
    lines = list(attrs) + ['──────────────'] + list(ops)
    return (x, y, w, box_height(name, lines), name, lines)


# ---------------------------------------------------------------------------
# 1. Biểu đồ lớp
# ---------------------------------------------------------------------------
def gen_classes():
    W = 420
    b = {
        'ui': cbox(40, 90, W, 'Lớp giao diện\n«boundary»',
                   ['LoginForm', 'ChatBox · useSseStream', 'DocumentManager',
                    'CitationDrawer', 'UserTable · PermissionMatrix'],
                   ['hienThi()', 'guiYeuCau()', 'nhanSuKienSSE()']),
        'ctl': cbox(640, 90, W, 'Lớp điều khiển\n«control»',
                    ['AuthController', 'ChatController', 'DocumentsController',
                     'AdminController', 'RetrievalController'],
                    ['kiemTraDauVao()', 'goiDichVu()', 'dinhDangPhanHoi()']),
        'svc': cbox(1240, 90, W, 'Lớp nghiệp vụ\n«control»',
                    ['ChatService.hoi()', 'RetrievalService.search()',
                     'DocumentsService', 'AdminService'],
                    ['dieuPhoiLuotHoiDap()', 'apDungPhamVi()', 'kiemTrichDan()']),
        'ent': cbox(640, 620, W, 'Lớp thực thể\n«entity»',
                    ['NguoiDung · DonVi · ThanhVien', 'TaiLieu · DoanVan · VectorNhung',
                     'HoiThoai · TinNhan · TrichDan', 'JobNhapLieu'],
                    ['docGhiQuaPrisma()', 'truyVanSQLTruyHoi()']),
        'ext': cbox(1240, 620, W, 'Dịch vụ ngoài\n«external»',
                    ['Gemini adapter'],
                    ['nhungVanBan()', 'sinhCauTraLoi()']),
        'wrk': cbox(40, 620, W, 'Worker nhập liệu',
                    ['ingest worker', 'hàng đợi ingest_jobs'],
                    ['trichVanBan()', 'catDoan()', 'nhungVector()']),
    }
    rels = [('ui', 'ctl', 'gọi HTTP / SSE', 'assoc'),
            ('ctl', 'svc', 'ủy quyền', 'assoc'),
            ('svc', 'ent', 'đọc ghi', 'assoc'),
            ('svc', 'ext', 'nhúng · sinh', 'dep'),
            ('wrk', 'ent', 'ghi đoạn văn', 'assoc'),
            ('wrk', 'ext', 'nhúng vector', 'dep')]
    classes('class_tongquat', b, rels, (1700, 1000))

    W = 380
    C = [36, 452, 868, 1284]
    b = {
        'nd': cbox(C[0], 90, W, 'NguoiDung\n«users»',
                   ['- id: Uuid', '- email: VarChar(255) UQ', '- code: VarChar(20) UQ',
                    '- passwordHash: VarChar(255)', '- fullName: VarChar(200)',
                    '- isActive: boolean', '- lastLoginAt: Timestamptz'],
                   ['+ dangNhap()', '+ doiMatKhau()', '+ khoaMoTaiKhoan()']),
        'tv': cbox(C[1], 90, W, 'ThanhVienDonVi\n«department_members»',
                   ['- id: Uuid', '- userId: Uuid FK', '- departmentId: Uuid FK',
                    '- role: member_role'],
                   ['+ ganThanhVien()', '+ goThanhVien()', '+ layVaiCNTT()']),
        'dv': cbox(C[2], 90, W, 'DonVi\n«departments»',
                   ['- id: Uuid', '- code: VarChar(20) UQ', '- name: VarChar(200)',
                    '- type: dept_type', '- parentId: Uuid FK'],
                   ['+ layPhamVi()']),
        'tl': cbox(C[3], 90, W, 'TaiLieu\n«documents»',
                   ['- id: Uuid', '- title: VarChar(500)', '- departmentId: Uuid FK',
                    '- visibility: SmallInt', '- sourceType: VarChar(10)',
                    '- fileHash: Char(64) UQ', '- status: doc_status'],
                   ['+ taiLen()', '+ suaThongTin()', '+ go()', '+ chayLai()']),
        'ht': cbox(C[0], 640, W, 'HoiThoai\n«conversations»',
                   ['- id: Uuid', '- userId: Uuid FK', '- title: VarChar(300)',
                    '- updatedAt: Timestamptz'],
                   ['+ taoMoi()', '+ lietKeCuaToi()']),
        'tn': cbox(C[1], 640, W, 'TinNhan\n«messages»',
                   ['- id: Uuid', '- conversationId: Uuid FK', '- role: message_role',
                    '- content: Text', '- latencyMs: integer'],
                   ['+ luuLuot()']),
        'jb': cbox(C[2], 640, W, 'JobNhapLieu\n«ingest_jobs»',
                   ['- id: Uuid', '- documentId: Uuid FK', '- status: job_status',
                    '- retryCount: integer', '- lastError: Text'],
                   ['+ nhanViec()', '+ ketThuc()']),
        'dvn': cbox(C[3], 640, W, 'DoanVan\n«chunks»',
                    ['- id: Uuid', '- documentId: Uuid FK', '- chunkIndex: integer',
                     '- content: Text', '- headingPath: Text',
                     '- departmentId: Uuid FK', '- visibility: SmallInt',
                     '- contentTsv: tsvector'],
                    ['+ locTheoPhamVi()', '+ timToanVan()']),
        'td': cbox(C[1], 1160, W, 'TrichDan\n«message_citations»',
                   ['- id: Uuid', '- messageId: Uuid FK', '- chunkId: Uuid FK',
                    '- documentId: Uuid FK', '- rank: integer', '- score: double',
                    '- quote: Text', '- page: integer'],
                   ['+ saoChepNguon()']),
        'vt': cbox(C[3], 1160, W, 'VectorNhung\n«chunk_embeddings»',
                   ['- id: BigInt', '- chunkId: Uuid FK', '- embedding: vector(1536)',
                    '- model: VarChar(64)'],
                   ['+ timTheoVector()']),
    }
    rels = [('nd', 'tv', '1 : N', 'assoc'), ('tv', 'dv', 'N : 1', 'assoc'),
            ('dv', 'tl', '0..1 : N', 'assoc'), ('tl', 'dvn', '1 : N', 'assoc'),
            ('dvn', 'vt', '1 : N', 'assoc'), ('tl', 'jb', '1 : N', 'assoc'),
            ('nd', 'ht', '1 : N', 'assoc'), ('ht', 'tn', '1 : N', 'assoc'),
            ('tn', 'td', '1 : N', 'assoc'), ('dvn', 'td', '0..1 : N', 'assoc')]
    classes('class_chitiet', b, rels, (1700, 1670))


# ---------------------------------------------------------------------------
# 2. Lớp tham gia ca sử dụng (VOPC)
# ---------------------------------------------------------------------------
VOPC_OPS = {
    'boundary': ['hiển thị dữ liệu', 'nhận thao tác người dùng'],
    'control': ['kiểm quyền và đầu vào', 'điều phối nghiệp vụ'],
    'entity': ['đọc ghi bản ghi', 'áp dụng ràng buộc'],
    'external': ['nhúng vector', 'sinh câu trả lời'],
}


def gen_vopc():
    for uid in DETAIL:
        parts = parts_of(uid)
        kinds = [p[3] for p in parts]
        items, links_ = [], []
        xs = {'boundary': 620, 'control': 1130, 'entity': 1130, 'external': 620}
        ys = {'boundary': 175, 'control': 175, 'entity': 430, 'external': 430}
        names = {}
        for key, label, sub, kind in parts:
            if kind == 'actor':
                continue
            names[kind] = label
            items.append((xs[kind], ys[kind], kind, label, VOPC_OPS[kind]))
        links_.append(('@actor', names['boundary'], 'thao tác'))
        links_.append((names['boundary'], names['control'], 'gọi API'))
        if 'entity' in names:
            links_.append((names['control'], names['entity'], 'đọc / ghi'))
        if 'external' in names:
            links_.append((names['control'], names['external'], 'nhúng · sinh'))
        h = 640 if 'external' in names or 'entity' in names else 420
        vopc('vopc_' + uid.lower(), UCS[uid]['actor'], items, links_,
             size=(1700, h))


# ---------------------------------------------------------------------------
# 3. Biểu đồ trạng thái
# ---------------------------------------------------------------------------
def st(name, nodes, edges, size):
    return flow(name, nodes, edges, size, fs=26)


def sn(x, y, w, h, text):
    return (x, y, w, h, text, 'state')


def gen_states():
    st('st_tailieu', {
        'i': (70, 250, 46, 46, '', 'start'),
        'p': sn(190, 210, 330, 120, 'PENDING\nchờ xử lý'),
        'r': sn(620, 210, 330, 120, 'PROCESSING\nđang trích và nhúng'),
        'k': sn(1080, 60, 340, 120, 'READY\nsẵn sàng truy hồi'),
        'f': sn(1080, 380, 340, 120, 'FAILED\nlỗi xử lý'),
        'e': (1560, 100, 46, 46, '', 'end'),
    }, [('i', 'p', 'tải lên'), ('p', 'r', 'worker nhận việc'),
        ('r', 'k', 'nhúng xong'), ('r', 'f', 'lỗi trích / nhúng'),
        ('f', 'p', 'chạy lại (UC13)'), ('k', 'e', 'gỡ tài liệu')], (1700, 580))

    st('st_job', {
        'i': (70, 240, 46, 46, '', 'start'),
        'p': sn(190, 200, 320, 120, 'PENDING\ntrong hàng đợi'),
        'r': sn(600, 200, 340, 120, 'PROCESSING\nSKIP LOCKED'),
        'd': sn(1050, 60, 330, 120, 'DONE'),
        'f': sn(1050, 350, 330, 120, 'FAILED\nretryCount + 1'),
        'e': (1500, 100, 46, 46, '', 'end'),
    }, [('i', 'p', 'tạo job'), ('p', 'r', 'worker lấy việc'),
        ('r', 'd', 'thành công'), ('r', 'f', 'lỗi'),
        ('f', 'p', 'retryCount < 3'), ('d', 'e', '')], (1700, 540))

    st('st_taikhoan', {
        'i': (70, 210, 46, 46, '', 'start'),
        'a': sn(200, 170, 360, 120, 'Hoạt động\nisActive = true'),
        'l': sn(700, 170, 360, 120, 'Bị khóa\nisActive = false'),
        'n': sn(1180, 170, 400, 120, 'Không có tư cách CNTT\nkhông dùng được ứng dụng'),
    }, [('i', 'a', 'seed / bootstrap'), ('a', 'l', 'quản trị khóa (UC15)'),
        ('l', 'a', 'quản trị mở lại'), ('a', 'n', 'gỡ thành viên (UC16)')], (1700, 400))

    st('st_luot', {
        'i': (70, 250, 46, 46, '', 'start'),
        't': sn(180, 210, 330, 120, 'Đang truy hồi\nlọc phạm vi CNTT'),
        'g': sn(610, 60, 340, 120, 'Đang sinh\nnhận token'),
        'c': sn(1050, 60, 330, 120, 'Kiểm trích dẫn'),
        'x': sn(610, 380, 340, 120, 'Từ chối\nkhông đủ căn cứ'),
        's': sn(1050, 380, 330, 120, 'Đã lưu hội thoại'),
        'e': (1560, 420, 46, 46, '', 'end'),
    }, [('i', 't', 'gửi câu hỏi'), ('t', 'g', 'có nguồn'), ('t', 'x', 'không có nguồn'),
        ('g', 'c', 'hết token'), ('c', 's', 'marker hợp lệ'),
        ('c', 'x', 'không có trích dẫn'), ('x', 's', 'lưu câu từ chối'),
        ('s', 'e', 'phát sự kiện done')], (1700, 580))

    st('st_hoithoai', {
        'i': (70, 190, 46, 46, '', 'start'),
        'm': sn(190, 150, 340, 120, 'Mới tạo\ntiêu đề từ câu hỏi đầu'),
        'd': sn(640, 150, 360, 120, 'Đang trao đổi\nthêm lượt hỏi đáp'),
        'l': sn(1110, 150, 380, 120, 'Chỉ đọc\nchủ sở hữu xem lại'),
    }, [('i', 'm', 'lượt hỏi đầu tiên'), ('m', 'd', 'lưu tin nhắn'),
        ('d', 'd', ''), ('d', 'l', 'mở từ lịch sử')], (1700, 360))

    # Trạng thái của các form chính (>= 30% số ca sử dụng chi tiết).
    def form(name, states, extra=()):
        nodes = {'i': (70, 190, 46, 46, '', 'start')}
        edges = []
        x = 190
        prev = 'i'
        for j, (t, lab) in enumerate(states):
            k = 's%d' % j
            nodes[k] = sn(x, 150, 330, 120, t)
            edges.append((prev, k, lab))
            prev = k
            x += 380
        for e in extra:
            edges.append(e)
        return st(name, nodes, edges, (int(x + 40), 360))

    form('stf_dangnhap', [('Trống', 'mở form'), ('Đang nhập', 'gõ mã và mật khẩu'),
                          ('Đang gửi', 'bấm đăng nhập'), ('Thành công', 'nhận JWT')],
         extra=[('s2', 's1', 'sai mật khẩu / bị khóa')])
    form('stf_hoidap', [('Rỗng', 'mở màn hỏi đáp'), ('Đang gõ câu hỏi', 'nhập nội dung'),
                        ('Đang nhận SSE', 'gửi'), ('Hiển thị kết quả', 'done')],
         extra=[('s2', 's1', 'lỗi mạng / lỗi Gemini')])
    form('stf_tailieu', [('Đang tải danh sách', 'mở kho'), ('Có kết quả', 'trả dữ liệu'),
                         ('Xem chi tiết', 'chọn tài liệu')],
         extra=[('s0', 's1', 'rỗng: không có tài liệu')])
    form('stf_tailen', [('Chờ chọn tệp', 'mở form'), ('Đang tải lên', 'chọn PDF/DOCX'),
                        ('Đang xử lý nền', 'tạo job'), ('READY hoặc FAILED', 'worker xong')],
         extra=[('s1', 's0', 'tệp trùng mã băm')])
    form('stf_taikhoan', [('Đang tải người dùng', 'mở màn quản trị'),
                          ('Danh sách CNTT', 'trả dữ liệu'),
                          ('Xác nhận khóa/mở', 'chọn tài khoản')],
         extra=[('s2', 's1', 'bị chặn: tự khóa chính mình')])
    form('stf_phanquyen', [('Ma trận quyền', 'mở phân quyền'),
                           ('Chọn vai mới', 'chọn tài khoản'),
                           ('Đang lưu', 'xác nhận'), ('Đã áp dụng', 'transaction xong')],
         extra=[('s2', 's1', 'bị chặn: tự hạ quyền quản trị')])


# ---------------------------------------------------------------------------
# 4. Biểu đồ hoạt động (12 ca sử dụng chi tiết)
# ---------------------------------------------------------------------------
ACTS = {
    'UC01': ([('start', ''), ('box', 'Mở form đăng nhập'),
              ('box', 'Nhập mã sinh viên hoặc email và mật khẩu'),
              ('dec', 'Tài khoản hợp lệ, đang hoạt động\nvà có tư cách CNTT?'),
              ('box', 'Phát JWT và hồ sơ người dùng'),
              ('box', 'Chuyển vào màn hình hỏi đáp'), ('end', '')],
             (3, 'Có', 'Không', ['Báo lỗi đăng nhập chung'])),
    'UC04': ([('start', ''), ('box', 'Mở form đổi mật khẩu'),
              ('box', 'Nhập mật khẩu hiện tại và mật khẩu mới'),
              ('dec', 'Mật khẩu hiện tại đúng\nvà mật khẩu mới hợp lệ?'),
              ('box', 'Băm bcrypt và cập nhật users.password_hash'),
              ('box', 'Báo đổi mật khẩu thành công'), ('end', '')],
             (3, 'Có', 'Không', ['Giữ nguyên mật khẩu cũ và báo lỗi'])),
    'UC05': ([('start', ''), ('box', 'Nhập câu hỏi học vụ và gửi'),
              ('box', 'Xác thực và xác định phạm vi CNTT'),
              ('box', 'Truy hồi lai: vector và toàn văn'),
              ('dec', 'Có đoạn nguồn phù hợp?'),
              ('box', 'Gọi Gemini sinh câu trả lời từ nguồn'),
              ('box', 'Lọc marker và kiểm trích dẫn hợp lệ'),
              ('box', 'Lưu hội thoại, tin nhắn, trích dẫn'),
              ('box', 'Phát sự kiện done kèm nguồn'), ('end', '')],
             (4, 'Có', 'Không', ['Trả câu từ chối vì không đủ căn cứ',
                                 'Lưu lượt hỏi với danh sách nguồn rỗng'])),
    'UC06': ([('start', ''), ('box', 'Mở danh sách hội thoại'),
              ('box', 'Lọc hội thoại theo chủ sở hữu'),
              ('dec', 'Hội thoại thuộc người gọi?'),
              ('box', 'Đọc tin nhắn và trích dẫn đã lưu'),
              ('box', 'Hiển thị nội dung kèm nguồn'), ('end', '')],
             (3, 'Có', 'Không', ['Không trả nội dung hội thoại'])),
    'UC07': ([('start', ''), ('box', 'Mở kho tài liệu hoặc nhập từ khóa'),
              ('box', 'Áp dụng scopeWhere CNTT và quy định chung'),
              ('dec', 'Có tài liệu trong phạm vi?'),
              ('box', 'Hiển thị danh sách và trạng thái xử lý'),
              ('box', 'Mở chi tiết tài liệu được chọn'), ('end', '')],
             (3, 'Có', 'Không', ['Hiển thị trạng thái không có kết quả'])),
    'UC08': ([('start', ''), ('box', 'Bấm nguồn trích dẫn trong câu trả lời'),
              ('box', 'Kiểm phạm vi tài liệu của người gọi'),
              ('dec', 'Được phép đọc tài liệu?'),
              ('box', 'Trả đoạn văn kèm vị trí trích dẫn'),
              ('box', 'Mở tệp gốc qua endpoint có kiểm quyền'), ('end', '')],
             (3, 'Có', 'Không', ['Từ chối truy cập đoạn văn và tệp'])),
    'UC09': ([('start', ''), ('box', 'Mở trạng thái xử lý của tài liệu'),
              ('box', 'Kiểm phạm vi rồi đọc document và ingest_job'),
              ('dec', 'Trạng thái là FAILED?'),
              ('box', 'Hiển thị PENDING / PROCESSING / READY'), ('end', '')],
             (3, 'Không', 'Có', ['Hiển thị lỗi và gợi ý chạy lại (UC13)'])),
    'UC10': ([('start', ''), ('box', 'Chọn tệp PDF hoặc DOCX và nhập tiêu đề'),
              ('box', 'Tính mã băm SHA-256 của tệp'),
              ('dec', 'Mã băm đã tồn tại?'),
              ('box', 'Lưu tệp vào kho uploads và tạo bản ghi documents'),
              ('box', 'Tạo ingest_job trạng thái PENDING'),
              ('box', 'Worker trích văn bản, cắt đoạn, nhúng vector'), ('end', '')],
             (3, 'Chưa có', 'Đã có', ['Trả về bản ghi cũ, không xử lý lại'])),
    'UC11': ([('start', ''), ('box', 'Mở tài liệu và sửa tiêu đề hoặc phạm vi'),
              ('dec', 'Đích thuộc CNTT hoặc quy định chung?'),
              ('box', 'Cập nhật bản ghi documents'),
              ('box', 'Trigger đồng bộ phạm vi xuống chunks'), ('end', '')],
             (2, 'Có', 'Không', ['Từ chối: không cho chuyển ra ngoài phạm vi'])),
    'UC12': ([('start', ''), ('box', 'Chọn tài liệu cần gỡ'),
              ('dec', 'Người gọi có quyền ghi nội dung?'),
              ('box', 'Xóa documents; chunks và job xóa theo ràng buộc'),
              ('box', 'Trích dẫn cũ giữ bản sao, khóa ngoại thành NULL'), ('end', '')],
             (2, 'Có', 'Không', ['Backend từ chối dù gọi thẳng API'])),
    'UC15': ([('start', ''), ('box', 'Mở danh sách tài khoản CNTT'),
              ('box', 'Chọn tài khoản và đặt isActive'),
              ('dec', 'Đang tự khóa chính mình?'),
              ('box', 'Cập nhật users.is_active trong transaction'),
              ('box', 'Request kế tiếp của tài khoản đó bị chặn'), ('end', '')],
             (3, 'Không', 'Có', ['Chặn thao tác và giữ nguyên trạng thái'])),
    'UC16': ([('start', ''), ('box', 'Mở ma trận phân quyền CNTT'),
              ('box', 'Chọn tài khoản và vai mới'),
              ('dec', 'Tự hạ quyền hoặc tự gỡ tư cách quản trị?'),
              ('box', 'Ghi department_members trong transaction tuần tự hóa'),
              ('box', 'Quyền mới áp dụng từ request kế tiếp'), ('end', '')],
             (3, 'Không', 'Có', ['Chặn thao tác, giữ nguyên vai'])),
}


def gen_activities():
    for uid, (steps, branch) in ACTS.items():
        activity('act_' + uid.lower(), steps, branch=branch)


# ---------------------------------------------------------------------------
# 5. Sơ đồ dữ liệu
# ---------------------------------------------------------------------------
def gen_erd():
    nodes = {
        'u': (60, 60, 380, 96, 'users', 'box'),
        'm': (630, 60, 400, 96, 'department_members', 'box'),
        'd': (1230, 60, 380, 96, 'departments', 'box'),
        'v': (60, 300, 380, 96, 'conversations', 'box'),
        'job': (630, 300, 400, 96, 'ingest_jobs', 'box'),
        'doc': (1230, 300, 380, 96, 'documents', 'box'),
        'msg': (60, 540, 380, 96, 'messages', 'box'),
        'cite': (630, 540, 400, 96, 'message_citations', 'box'),
        'chunk': (1230, 540, 380, 96, 'chunks', 'box'),
        'emb': (1230, 780, 380, 96, 'chunk_embeddings', 'box'),
    }
    edges = [('u', 'm', '1 : N'), ('d', 'm', '1 : N'), ('u', 'v', '1 : N'),
             ('v', 'msg', '1 : N'), ('d', 'doc', '0..1 : N'), ('doc', 'chunk', '1 : N'),
             ('chunk', 'emb', '1 : N'), ('doc', 'job', '1 : N'),
             ('msg', 'cite', '1 : N'), ('chunk', 'cite', '0..1 : N')]
    flow('erd', nodes, edges, (1700, 940), fs=27)


# ---------------------------------------------------------------------------
# 6. Phác thảo giao diện
# ---------------------------------------------------------------------------
NAV = ['Hỏi đáp', 'Kho tài liệu', 'Hội thoại của tôi',
       'Quản lý nội dung *', 'Quản lý tài khoản **']


def gen_ui():
    def sitemap(d, w, h):
        n = {
            'l': (60, 300, 330, 110, 'Đăng nhập', 'box'),
            'c': (520, 300, 360, 110, 'Hỏi đáp / Hội thoại', 'box'),
            'h': (1030, 60, 360, 110, 'Hội thoại của tôi', 'box'),
            'k': (1030, 240, 360, 110, 'Kho tài liệu', 'box'),
            't': (1030, 420, 360, 110, 'Chi tiết + ngăn trích dẫn', 'box'),
            'q': (1030, 600, 360, 110, 'Quản lý nội dung *', 'box'),
            'a': (1030, 780, 360, 110, 'Quản lý tài khoản **', 'box'),
            'p': (520, 600, 360, 110, 'Thông tin cá nhân', 'box'),
        }
        e = [('l', 'c', 'đăng nhập thành công'), ('c', 'h', ''), ('c', 'k', ''),
             ('k', 't', ''), ('c', 'q', 'giáo vụ · QTV'), ('c', 'a', 'QTV'),
             ('c', 'p', '')]
        from flow import _anchor, _shape
        from draw import arrow as _a, F as _F
        fonts = {'n': _F(25), 's': _F(22), 'e': _F(22)}
        for a, b, lab in e:
            na, nb = n[a], n[b]
            _a(d, _anchor(na, nb), _anchor(nb, na), label=lab, font=fonts['e'])
        for nd in n.values():
            _shape(d, nd, fonts)

    ui.screen('sitemap', 1560, 950, sitemap)

    def dangnhap(d, w, h):
        ui.frame(d, w, h, 'SỔ TAY SINH VIÊN CNTT')
        ui.card(d, 430, 190, 700, 470, [], fill='#f7fbfd')
        d.text((780, 250), 'Đăng nhập', font=F(32, True), fill=INK, anchor='mm')
        ui.field(d, 480, 330, 600, 60, 'Mã sinh viên hoặc email', label='Tài khoản')
        ui.field(d, 480, 440, 600, 60, '••••••••', label='Mật khẩu')
        ui.button(d, 480, 540, 600, 62, 'Đăng nhập')
        d.text((780, 630), 'Tài khoản do quản trị viên cấp — không có tự đăng ký',
               font=F(21), fill=ui.MUTED, anchor='mm')
    ui.screen('ui_dangnhap', 1560, 760, dangnhap)

    def hoidap(d, w, h):
        x0, y0 = ui.frame(d, w, h, 'Hỏi đáp học vụ', NAV, 'Hỏi đáp')
        ui.card(d, 400, 130, 1120, 90, ['Học phí kỳ này nộp trước ngày nào?'], fill=WHITE)
        ui.card(d, 400, 250, 1120, 330,
                ['Theo quy chế hiện hành, sinh viên nộp học phí trước ngày 15 của',
                 'tháng đầu học kỳ [1]. Trường hợp chậm nộp áp dụng mức xử lý ở [2].',
                 '', 'Nguồn [1]  Quy chế học vụ · Điều 12, Khoản 1 · Trang 8',
                 'Nguồn [2]  Thông báo học phí 2026 · Mục 3 · Trang 2'])
        ui.badge(d, 420, 620, 'đang nhận SSE')
        ui.badge(d, 640, 620, '2 nguồn được dẫn', '#e8f1f6', '#4a7590')
        ui.field(d, 400, 680, 940, 64, 'Nhập câu hỏi…')
        ui.button(d, 1360, 680, 160, 64, 'Gửi')
    ui.screen('ui_hoidap', 1560, 800, hoidap)

    def trichdan(d, w, h):
        x0, y0 = ui.frame(d, w, h, 'Ngăn nguồn trích dẫn', NAV, 'Hỏi đáp')
        ui.card(d, 400, 130, 620, 480,
                ['Câu trả lời có dẫn nguồn [1] và [2].', '',
                 'Bấm vào số hiệu nguồn để mở', 'ngăn trích dẫn bên phải.'], fill=WHITE)
        ui.card(d, 1050, 130, 470, 480,
                ['Quy chế học vụ (PDF)', 'Điều 12, Khoản 1 · Trang 8', '',
                 '“Sinh viên nộp học phí trước', 'ngày 15 của tháng đầu học kỳ.”', '',
                 'Phạm vi: quy định chung'], title='Nguồn [1]')
        ui.button(d, 1080, 540, 200, 56, 'Mở tệp gốc')
        ui.button(d, 1300, 540, 190, 56, 'Đóng', primary=False)
    ui.screen('ui_trichdan', 1560, 700, trichdan)

    def tailieu(d, w, h):
        x0, y0 = ui.frame(d, w, h, 'Kho tài liệu', NAV, 'Kho tài liệu')
        ui.field(d, 400, 130, 760, 58, 'Tìm theo tiêu đề…')
        ui.button(d, 1180, 130, 160, 58, 'Tìm')
        ui.button(d, 1360, 130, 160, 58, 'Tải lên *', primary=False)
        ui.table(d, 400, 220, 1120,
                 ['Tiêu đề', 'Phạm vi', 'Trang', 'Trạng thái'],
                 [['Quy chế học vụ 2026', 'Quy định chung', '24', 'READY'],
                  ['Chương trình đào tạo CNTT', 'CNTT', '58', 'READY'],
                  ['Thông báo học phí 2026', 'Quy định chung', '3', 'PROCESSING'],
                  ['Hướng dẫn thực tập CNTT', 'CNTT', '12', 'FAILED']],
                 [520, 300, 140, 160])
        d.text((400, 570), 'Chỉ hiện tài liệu CNTT và quy định chung — kể cả với quản trị viên.',
               font=F(21), fill=ui.MUTED, anchor='lm')
    ui.screen('ui_tailieu', 1560, 640, tailieu)

    def tailen(d, w, h):
        x0, y0 = ui.frame(d, w, h, 'Tải lên tài liệu', NAV, 'Quản lý nội dung *',
                          user='Trần Thị B · Giáo vụ khoa CNTT')
        ui.card(d, 400, 130, 1120, 190,
                ['Kéo thả tệp PDF hoặc DOCX vào đây, hoặc bấm để chọn',
                 'Tệp trùng mã băm SHA-256 sẽ trả về bản ghi cũ, không xử lý lại'])
        ui.field(d, 400, 360, 700, 58, 'Tiêu đề tài liệu', label='Tiêu đề')
        ui.field(d, 1130, 360, 390, 58, 'CNTT / Quy định chung', label='Phạm vi')
        ui.button(d, 400, 460, 220, 60, 'Tải lên')
        d.text((650, 490), 'Sau khi tải lên, tài liệu vào hàng đợi ingest_jobs.',
               font=F(21), fill=ui.MUTED, anchor='lm')
        ui.table(d, 400, 560, 1120, ['Tài liệu', 'Job', 'Số lần thử', 'Thao tác'],
                 [['Hướng dẫn thực tập CNTT', 'FAILED', '2', 'Chạy lại'],
                  ['Thông báo học phí 2026', 'PROCESSING', '0', '—']],
                 [520, 220, 200, 180])
    ui.screen('ui_tailen', 1560, 800, tailen)

    def hoithoai(d, w, h):
        x0, y0 = ui.frame(d, w, h, 'Hội thoại của tôi', NAV, 'Hội thoại của tôi')
        ui.table(d, 400, 130, 1120, ['Tiêu đề hội thoại', 'Số lượt', 'Cập nhật'],
                 [['Học phí kỳ này nộp trước ngày nào?', '3', '05/09/2026 09:12'],
                  ['Điều kiện xét tốt nghiệp CNTT', '5', '04/09/2026 15:40'],
                  ['Thủ tục đăng ký thực tập', '2', '02/09/2026 08:05']],
                 [640, 200, 280])
        d.text((400, 420), 'Chỉ hiện hội thoại của chính người đăng nhập.',
               font=F(21), fill=ui.MUTED, anchor='lm')
    ui.screen('ui_hoithoai', 1560, 500, hoithoai)

    def nguoidung(d, w, h):
        x0, y0 = ui.frame(d, w, h, 'Quản lý tài khoản', NAV, 'Quản lý tài khoản **',
                          user='Lê Thị C · Quản Trị Viên')
        ui.field(d, 400, 130, 760, 58, 'Tìm theo tên, mã hoặc email…')
        ui.button(d, 1180, 130, 160, 58, 'Tìm')
        ui.table(d, 400, 220, 1100, ['Họ tên', 'Mã', 'Vai tại CNTT', 'Trạng thái', 'Thao tác'],
                 [['Nguyễn Văn A', '22CT001', 'USER', 'Hoạt động', 'Khóa'],
                  ['Trần Thị B', 'GV0142', 'CONTENT_ADMIN', 'Hoạt động', 'Khóa'],
                  ['Lê Văn C', '22CT087', 'USER', 'Bị khóa', 'Mở']],
                 [340, 170, 300, 170, 120])
        d.text((400, 500), 'Không cho tự khóa hoặc tự hạ quyền tài khoản đang thao tác.',
               font=F(21), fill=ui.MUTED, anchor='lm')
    ui.screen('ui_nguoidung', 1560, 580, nguoidung)

    def phanquyen(d, w, h):
        x0, y0 = ui.frame(d, w, h, 'Phân quyền tài khoản CNTT', NAV, 'Quản lý tài khoản **',
                          user='Lê Thị C · Quản Trị Viên')
        ui.table(d, 400, 130, 1120, ['Chức năng', 'USER', 'CONTENT_ADMIN', 'SYSTEM_ADMIN'],
                 [['Hỏi đáp, đọc tài liệu, xem nguồn', '✓', '✓', '✓'],
                  ['Tải lên / sửa / gỡ / chạy lại', '—', '✓', '✓'],
                  ['Xem, khóa, mở tài khoản', '—', '—', '✓'],
                  ['Phân quyền tài khoản', '—', '—', '✓'],
                  ['Đọc ghi tài liệu khoa khác', '—', '—', '—']],
                 [560, 160, 220, 180])
        ui.button(d, 400, 560, 240, 60, 'Lưu thay đổi')
        d.text((670, 590), 'Ghi trong transaction, đọc lại quyền người gọi trước khi lưu.',
               font=F(21), fill=ui.MUTED, anchor='lm')
    ui.screen('ui_phanquyen', 1560, 680, phanquyen)

    def canhan(d, w, h):
        x0, y0 = ui.frame(d, w, h, 'Thông tin cá nhân', NAV, 'Hỏi đáp')
        ui.card(d, 400, 130, 540, 300,
                ['Họ tên:  Nguyễn Văn A', 'Mã:  22CT001', 'Email:  a.nv@dau.edu.vn',
                 'Đơn vị:  Khoa CNTT', 'Vai:  USER'], title='Hồ sơ')
        ui.card(d, 980, 130, 540, 300, [], fill='#f7fbfd', title='Đổi mật khẩu')
        ui.field(d, 1010, 220, 480, 54, 'Mật khẩu hiện tại')
        ui.field(d, 1010, 292, 480, 54, 'Mật khẩu mới')
        ui.button(d, 1010, 364, 220, 54, 'Cập nhật')
        d.text((400, 470), 'Vai trò đọc lại từ CSDL mỗi request; JWT chỉ mang danh tính.',
               font=F(21), fill=ui.MUTED, anchor='lm')
    ui.screen('ui_canhan', 1560, 540, canhan)


if __name__ == '__main__':
    gen_classes()
    gen_vopc()
    gen_states()
    gen_activities()
    gen_erd()
    gen_ui()
    print('Chương III: xong')
