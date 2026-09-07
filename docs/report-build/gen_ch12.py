# -*- coding: utf-8 -*-
"""Sinh sơ đồ Chương I (quy trình nghiệp vụ) và Chương II (ca sử dụng, tương tác).

Dữ liệu ca sử dụng lấy từ usecases.json — bản sao của mảng `useCases` trong
docs/use-cases/sequences/build_per_usecase_sequences.mjs, tức là cùng một nguồn
với bộ sequence riêng từng chức năng. Không gõ tay lại luồng thông điệp.
"""
import json, sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

from flow import flow, activity
from uml import sequence, collab, usecase

HERE = Path(__file__).resolve().parent
UCS = {u['id']: u for u in json.loads((HERE / 'usecases.json').read_text(encoding='utf8'))}

# 12/19 ca sử dụng được đặc tả sâu — trên mức 60% mà đề cương yêu cầu.
DETAIL = ['UC01', 'UC04', 'UC05', 'UC06', 'UC07', 'UC08',
          'UC09', 'UC10', 'UC11', 'UC12', 'UC15', 'UC16']

# Nhãn phụ dưới mỗi lifeline: tên tệp thật trong repo.
SUB = {
    'UC01': ('LoginForm.tsx', 'auth.controller.ts', 'users · department_members'),
    'UC02': ('useAuth.ts', 'auth state', 'localStorage'),
    'UC03': ('AuthGuard.tsx', 'auth.controller.ts', 'users · departments'),
    'UC04': ('Form đổi mật khẩu', 'auth.controller.ts', 'users'),
    'UC05': ('ChatBox · useSseStream', 'chat.service.ts', 'chunks · conversations'),
    'UC06': ('MessageList.tsx', 'chat.controller.ts', 'conversations · messages'),
    'UC07': ('DocumentTable.tsx', 'documents.service.ts', 'documents'),
    'UC08': ('CitationDrawer.tsx', 'documents.service.ts', 'chunks · uploads'),
    'UC09': ('StatusBadge.tsx', 'documents.service.ts', 'documents · ingest_jobs'),
    'UC10': ('UploadDropzone.tsx', 'documents.service.ts', 'documents · ingest_jobs'),
    'UC11': ('DocumentManager.tsx', 'documents.service.ts', 'documents · chunks'),
    'UC12': ('DocumentManager.tsx', 'documents.service.ts', 'documents · uploads'),
    'UC13': ('DocumentManager.tsx', 'documents.service.ts', 'ingest_jobs'),
    'UC14': ('UserTable.tsx', 'admin.service.ts', 'users · department_members'),
    'UC15': ('UserTable.tsx', 'admin.service.ts', 'users'),
    'UC16': ('PermissionMatrix.tsx', 'admin.service.ts', 'department_members'),
    'UC18': ('Client API', 'retrieval.controller.ts', 'chunks · chunk_embeddings'),
    'UC19': ('CLI run-eval.ts', 'eval runner', 'eval_runs · eval_results'),
    'UC20': ('Công cụ giám sát', 'routes.ts', 'ingest_jobs'),
}
ORDER = ['actor', 'boundary', 'control', 'entity', 'external']
POS = {
    4: [(250, 300), (830, 175), (1420, 470), (770, 770)],
    5: [(235, 330), (760, 170), (1275, 400), (700, 790), (1450, 770)],
    3: [(280, 430), (850, 200), (1400, 500)],
}


def parts_of(uid):
    u = UCS[uid]
    used = []
    for a, b, t, s in u['messages']:
        for k in (a, b):
            if k not in used:
                used.append(k)
    keys = [k for k in ORDER if k in used]
    sb, sc, se = SUB[uid]
    label = {'actor': (u['actor'], None), 'boundary': (u['boundary'], sb),
             'control': (u['control'], sc), 'entity': (u['entity'], se),
             'external': ('Gemini API', 'dịch vụ ngoài')}
    return [(k, label[k][0], label[k][1], k) for k in keys]


def msgs_of(uid):
    return [tuple(m) for m in UCS[uid]['messages']]


def gen_interaction():
    for uid in DETAIL:
        parts = parts_of(uid)
        msgs = msgs_of(uid)
        sequence('seq_' + uid.lower(), parts, msgs, notes=UCS[uid]['notes'])
        pts = POS[len(parts)]
        pos = {p[0]: pts[i] for i, p in enumerate(parts)}
        h = 940 if len(parts) >= 4 else 760
        collab('col_' + uid.lower(), parts, msgs, pos, size=(1700, h))


# ---------------------------------------------------------------------------
# Chương I — quy trình nghiệp vụ
# ---------------------------------------------------------------------------
def gen_business():
    L1, L2, L3 = (20, 520), (560, 560), (1140, 540)
    lanes = [(L1[0], L1[1], 'Sinh Viên CNTT'),
             (L2[0], L2[1], 'Hệ thống Sổ Tay Sinh Viên CNTT'),
             (L3[0], L3[1], 'Giáo vụ · Quản Trị Viên')]
    c1, c2, c3 = L1[0] + L1[1] / 2, L2[0] + L2[1] / 2, L3[0] + L3[1] / 2
    bw, bh = 430, 96

    def nb(cx, y, text, kind='box'):
        return (cx - bw / 2, y, bw, bh, text, kind)

    nodes = {
        'a1': nb(c1, 110, 'Đăng nhập bằng mã sinh viên hoặc email'),
        's1': nb(c2, 110, 'Xác thực tài khoản và tư cách CNTT'),
        'a2': nb(c1, 280, 'Đặt câu hỏi học vụ bằng tiếng Việt'),
        's2': nb(c2, 280, 'Truy hồi tài liệu CNTT và quy định chung'),
        'a3': nb(c1, 450, 'Đọc câu trả lời, mở nguồn để kiểm chứng'),
        's3': nb(c2, 450, 'Sinh câu trả lời kèm trích dẫn nguồn'),
        'g1': nb(c3, 620, 'Tải lên hoặc cập nhật tài liệu học vụ'),
        's4': nb(c2, 620, 'Xử lý nền: trích văn bản, cắt đoạn, nhúng vector'),
        'g2': nb(c3, 790, 'Theo dõi trạng thái xử lý, chạy lại khi lỗi'),
        'g3': nb(c3, 960, 'Quản lý tài khoản và phân quyền CNTT'),
        's5': nb(c2, 960, 'Áp dụng quyền mới cho request kế tiếp'),
    }
    edges = [('a1', 's1', ''), ('s1', 'a2', ''), ('a2', 's2', ''), ('s2', 's3', ''),
             ('s3', 'a3', ''), ('g1', 's4', ''), ('s4', 'g2', ''), ('s4', 's3', ''),
             ('g3', 's5', '')]
    flow('qt_tongquat', nodes, edges, (1700, 1110), lanes=lanes)

    # Ba quy trình chi tiết: chuỗi ngang, mỗi bước một hộp.
    def chain(name, steps, w=1700):
        n = len(steps)
        bwx = (w - 80 - 46 * (n - 1)) / n
        nodes, edges = {}, []
        for i, t in enumerate(steps):
            x = 40 + i * (bwx + 46)
            nodes['s%d' % i] = (x, 120, bwx, 190, t, 'box')
            if i:
                edges.append(('s%d' % (i - 1), 's%d' % i, ''))
        return flow(name, nodes, edges, (w, 400), fs=25)

    chain('qt_hoidap', [
        'Sinh viên đăng nhập và mở màn hình hỏi đáp',
        'Nhập câu hỏi học vụ và gửi',
        'Hệ thống truy hồi đoạn tài liệu trong phạm vi CNTT',
        'Sinh câu trả lời và kiểm tra trích dẫn',
        'Lưu hội thoại, hiển thị đáp án kèm nguồn',
    ])
    chain('qt_nhaplieu', [
        'Giáo vụ chọn tệp PDF hoặc DOCX',
        'Hệ thống lưu tệp, tính mã băm, tạo job',
        'Worker trích văn bản, cắt đoạn, nhúng vector',
        'Trạng thái chuyển READY hoặc FAILED',
        'Giáo vụ theo dõi, chạy lại khi lỗi',
    ])
    chain('qt_taikhoan', [
        'Quản trị viên mở danh sách tài khoản CNTT',
        'Khóa hoặc mở tài khoản, đổi vai thành viên',
        'Hệ thống chặn thao tác tự hạ quyền',
        'Quyền mới áp dụng từ request kế tiếp',
    ])


# ---------------------------------------------------------------------------
# Chương II — biểu đồ ca sử dụng
# ---------------------------------------------------------------------------
def gen_usecase():
    ow, oh = 480, 108
    # Tổng quát: gộp 19 ca sử dụng thành sáu nhóm chức năng cho dễ đọc.
    ovals = {
        'g1': (760, 200, ow, oh, 'Xác thực và tài khoản cá nhân\nUC01 – UC04'),
        'g2': (760, 350, ow, oh, 'Hỏi đáp học vụ có trích dẫn\nUC05 – UC06'),
        'g3': (760, 500, ow, oh, 'Tra cứu tài liệu và nguồn\nUC07 – UC09'),
        'g4': (1330, 275, ow, oh, 'Quản lý kho tài liệu\nUC10 – UC13'),
        'g5': (1330, 425, ow, oh, 'Quản trị tài khoản CNTT\nUC14 – UC16'),
        'g6': (1330, 575, ow, oh, 'Tra cứu API, đánh giá, giám sát\nUC18 – UC20'),
    }
    actors = {
        'sv': (330, 130, 'Sinh Viên CNTT', 'USER'),
        'gv': (330, 390, 'Giáo vụ khoa CNTT', 'CONTENT_ADMIN'),
        'qt': (330, 650, 'Quản Trị Viên', 'SYSTEM_ADMIN'),
    }
    edges = [('sv', 'g1'), ('sv', 'g2'), ('sv', 'g3'),
             ('gv', 'g4'), ('qt', 'g5'), ('qt', 'g6')]
    usecase('uc_tongquat', (1700, 900), (440, 90, 1200, 720,
            'HỆ THỐNG SỔ TAY SINH VIÊN CNTT'), ovals, actors, edges,
            actor_gen=[('gv', 'sv', 'kế thừa quyền tra cứu'),
                       ('qt', 'gv', 'kế thừa quyền nội dung')])

    def detail(name, size, sys_h, items, actor, sub, cols=2, y0=195, dy=142):
        ovals, edges = {}, []
        for i, (uid, text) in enumerate(items):
            col, row = i % cols, i // cols
            cx = 760 + col * 560
            cy = y0 + row * dy
            ovals[uid] = (cx, cy, ow, oh, uid + '. ' + text)
            edges.append(('a', uid))
        return usecase(name, size, (440, 90, 1200, sys_h, 'HỆ THỐNG SỔ TAY SINH VIÊN CNTT'),
                       ovals, {'a': (180, size[1] / 2 - 210, actor, sub)}, edges)

    detail('uc_sinhvien', (1700, 900), 730, [
        ('UC01', 'Đăng nhập'), ('UC02', 'Đăng xuất'),
        ('UC03', 'Xem thông tin cá nhân'), ('UC04', 'Đổi mật khẩu'),
        ('UC05', 'Hỏi đáp học vụ'), ('UC06', 'Xem lại hội thoại'),
        ('UC07', 'Tra cứu kho tài liệu'), ('UC08', 'Xem nguồn trích dẫn'),
        ('UC09', 'Theo dõi xử lý tài liệu'),
    ], 'Sinh Viên CNTT', 'USER')

    detail('uc_giaovu', (1700, 640), 470, [
        ('UC10', 'Tải lên tài liệu'), ('UC11', 'Sửa thông tin tài liệu'),
        ('UC12', 'Gỡ tài liệu'), ('UC13', 'Chạy lại xử lý lỗi'),
    ], 'Giáo vụ khoa CNTT', 'CONTENT_ADMIN', y0=210, dy=160)

    detail('uc_quantri', (1700, 640), 470, [
        ('UC14', 'Tra cứu người dùng'), ('UC15', 'Khóa / mở tài khoản'),
        ('UC16', 'Phân quyền tài khoản'),
    ], 'Quản Trị Viên', 'SYSTEM_ADMIN', y0=210, dy=160)

    ovals = {
        'UC18': (760, 210, ow, oh, 'UC18. Tra cứu lai qua API'),
        'UC19': (1330, 210, ow, oh, 'UC19. Đánh giá truy hồi (CLI)'),
        'UC20': (760, 370, ow, oh, 'UC20. Kiểm tra sức khỏe'),
    }
    usecase('uc_kythuat', (1700, 620), (440, 90, 1200, 400,
            'GIAO TIẾP KỸ THUẬT — API VÀ CÔNG CỤ'), ovals,
            {'a': (180, 110, 'Người dùng đã đăng nhập', 'gọi API trực tiếp'),
             'b': (180, 360, 'Người vận hành CLI', 'tác nhân kỹ thuật')},
            [('a', 'UC18'), ('a', 'UC20'), ('b', 'UC19'), ('b', 'UC20')])


if __name__ == '__main__':
    gen_business()
    gen_usecase()
    gen_interaction()
    print('Chương I + II: xong')
