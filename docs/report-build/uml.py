# -*- coding: utf-8 -*-
"""Sơ đồ UML: ca sử dụng, trình tự, cộng tác, lớp, lớp tham gia ca sử dụng."""
import math
from draw import (canvas, save, box, titled_box, wrap, block, arrow, link, head,
                  stick, oval, note, F, INK, LINE, FILL, BAND, WHITE, ACT, SEC,
                  OKC, caption_grid, _dash)

STYLE = {
    'emphasis': (OKC, False),
    'default':  ('#5c7a8a', False),
    'return':   ('#8497a2', True),
    'security': (SEC, False),
    'dashed':   ('#6b4fa8', True),
}
ICON = {
    'actor':    ('Actor', '#8a4b12', '#fdf6ec'),
    'boundary': ('Boundary', '#1c6b8c', '#e8f4fa'),
    'control':  ('Control', '#1f6b4a', '#e7f5ee'),
    'entity':   ('Entity', '#6b4fa8', '#f0ebfa'),
    'external': ('External', '#8a4b12', '#fdf3e2'),
}


# --------------------------------------------------------------------------
# Biểu đồ ca sử dụng
# --------------------------------------------------------------------------
def usecase(name, size, sysbox, ovals, actors, edges, stereo=(), title=None,
            actor_gen=()):
    w, h = size
    im, d = canvas(w, h)
    sx, sy, sw, sh, stitle = sysbox
    d.rectangle((sx, sy, sx + sw, sy + sh), outline=LINE, width=3)
    d.rectangle((sx, sy, sx + sw, sy + 58), fill=BAND, outline=LINE, width=3)
    block(d, sx + sw / 2, sy + 29, [stitle], F(28, True))
    apt = {}
    for k, (cx, ay, label, sub) in actors.items():
        stick(d, cx, ay, label, sub)
        apt[k] = (cx, ay + 66)
    for a, o, *rest in edges:
        cx, cy, ow, oh, _ = ovals[o]
        ax, ay = apt[a]
        dx = cx - ax
        px = cx - ow / 2 if dx > 0 else cx + ow / 2
        link(d, (ax + (46 if dx > 0 else -46), ay), (px, cy), '#8a4b12', 2)
    for a, b, lab in stereo:
        ca, cb = ovals[a], ovals[b]
        p = (ca[0], ca[1] + ca[3] / 2) if cb[1] > ca[1] else (ca[0], ca[1] - ca[3] / 2)
        q = (cb[0], cb[1] - cb[3] / 2) if cb[1] > ca[1] else (cb[0], cb[1] + cb[3] / 2)
        _dash(d, p, q, '#5c7a8a', 2)
        head(d, p, q, '#5c7a8a', hollow=True)
        mx, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
        f = F(22, italic=True)
        bb = d.textbbox((mx, my), lab, font=f, anchor='mm')
        d.rectangle((bb[0] - 5, bb[1] - 2, bb[2] + 5, bb[3] + 2), fill=WHITE)
        d.text((mx, my), lab, font=f, fill='#5c7a8a', anchor='mm')
    # Quan hệ kế thừa giữa các actor: đi vòng bằng ray dọc bên trái để không
    # cắt qua hình người và nhãn vai.
    if actor_gen:
        rail = min(v[0] for v in actors.values()) - 178
        for a, b, lab in actor_gen:
            (xa, ya), (xb, yb) = apt[a], apt[b]
            ay, by = ya + 40, yb + 108
            link(d, (xa - 42, ay), (rail, ay), '#8a4b12', 2)
            link(d, (rail, ay), (rail, by), '#8a4b12', 2)
            link(d, (rail, by), (xb - 62, by), '#8a4b12', 2)
            head(d, (rail, by), (xb - 44, by), '#8a4b12', size=20, hollow=True)
            f = F(21, italic=True)
            my = (ay + by) / 2
            bb = d.textbbox((rail + 8, my), lab, font=f, anchor='lm')
            d.rectangle((bb[0] - 5, bb[1] - 2, bb[2] + 5, bb[3] + 2), fill=WHITE)
            d.text((rail + 8, my), lab, font=f, fill='#8a4b12', anchor='lm')
    for cx, cy, ow, oh, text in ovals.values():
        oval(d, cx, cy, ow, oh, text)
    if title:
        block(d, w / 2, 34, [title], F(30, True))
    caption_grid(d, w, h)
    return save(im, name)


# --------------------------------------------------------------------------
# Biểu đồ trình tự
# --------------------------------------------------------------------------
def _label_bg(d, cx, cy, lines, font, color, maxw):
    """Chữ có nền trắng — tránh dính vào đường lifeline chạy phía sau."""
    lead = int(font.size * 1.3)
    top = cy - (len(lines) - 1) * lead / 2
    for i, ln in enumerate(lines):
        bb = d.textbbox((cx, top + i * lead), ln, font=font, anchor='mm')
        d.rectangle((bb[0] - 7, bb[1] - 2, bb[2] + 7, bb[3] + 2), fill=WHITE)
        d.text((cx, top + i * lead), ln, font=font, fill=color, anchor='mm')


def sequence(name, parts, messages, notes=(), width=1700, title=None):
    """parts: [(key, label, sublabel, kind)]; messages: [(from, to, text, style)]."""
    n = len(parts)
    left, right = 185, width - 185
    step = (right - left) / max(n - 1, 1)
    xs = {p[0]: left + i * step for i, p in enumerate(parts)}
    life_top = 218
    top = 268
    lead = 78
    h = top + len(messages) * lead + 70
    nh = (34 + 30 * len(notes)) if notes else 0
    im, d = canvas(width, int(h + nh))

    for key, label, sub, kind in parts:
        x = xs[key]
        stereo, color, fill = ICON[kind]
        bw = min(step - 30, 320)
        if kind == 'actor':
            stick(d, x, 30, '', None, color)
            fh = F(26, True) if len(label) < 20 else F(23, True)
            _label_bg(d, x, 182, wrap(d, label, fh, 300), fh, color, 300)
            if sub:
                _label_bg(d, x, 208, wrap(d, sub, F(22), 300), F(22), '#6a7f8b', 300)
        else:
            fh = F(26, True) if len(label) <= 18 else F(23, True)
            d.rounded_rectangle((x - bw / 2, 58, x + bw / 2, 196), radius=12,
                                fill=fill, outline=color, width=3)
            d.text((x, 82), '«' + stereo + '»', font=F(22, italic=True),
                   fill=color, anchor='mm')
            block(d, x, 128, wrap(d, label, fh, bw - 24), fh, color)
            if sub:
                block(d, x, 174, wrap(d, sub, F(21), bw - 20)[:1], F(21), '#6a7f8b')
        d.line((x, life_top, x, h - 40), fill='#9db4c1', width=2)

    fm = F(27)
    for key in xs:
        d.rectangle((xs[key] - 9, top - 26, xs[key] + 9, h - 54),
                    fill='#f2f7fa', outline='#9db4c1', width=2)

    for i, (a, b, text, st) in enumerate(messages):
        y = top + i * lead
        color, dashed = STYLE[st]
        x1, x2 = xs[a], xs[b]
        num = str(i + 1) + ': '
        if a == b:
            d.line((x1 + 9, y, x1 + 84, y), fill=color, width=3)
            d.line((x1 + 84, y, x1 + 84, y + 30), fill=color, width=3)
            arrow(d, (x1 + 84, y + 30), (x1 + 11, y + 30), color, 3, dashed)
            d.text((x1 + 100, y + 2), num + text, font=fm, fill=color, anchor='lm')
        else:
            sgn = 1 if x2 > x1 else -1
            arrow(d, (x1 + 9 * sgn, y), (x2 - 9 * sgn, y), color, 3, dashed,
                  label=num + text, font=fm, lcolor=color)
    if notes:
        y0 = h - 20
        d.line((70, y0 - 16, width - 70, y0 - 16), fill='#cfdde5', width=2)
        for i, t in enumerate(notes):
            d.text((78, y0 + 6 + i * 30), '•  ' + t, font=F(24), fill='#5c3f1c')
    if title:
        block(d, width / 2, 26, [title], F(30, True))
    caption_grid(d, width, int(h + nh))
    return save(im, name)


# --------------------------------------------------------------------------
# Biểu đồ cộng tác
# --------------------------------------------------------------------------
def _tri(d, cx, cy, direction, color, s=9):
    if direction == 'r':
        pts = [(cx - s, cy - s), (cx + s, cy), (cx - s, cy + s)]
    elif direction == 'l':
        pts = [(cx + s, cy - s), (cx - s, cy), (cx + s, cy + s)]
    elif direction == 'd':
        pts = [(cx - s, cy - s), (cx + s, cy - s), (cx, cy + s)]
    else:
        pts = [(cx - s, cy + s), (cx + s, cy + s), (cx, cy - s)]
    d.polygon(pts, fill=color)


def _hit(ax, ay, aw, ah, bx, by, bw_, bh_):
    return (abs(ax - bx) * 2 < aw + bw_) and (abs(ay - by) * 2 < ah + bh_)


def _avoid(mx, my, pw, ph, nx, ny, pos, bw, bh, W, H):
    """Đẩy khối nhãn dọc theo pháp tuyến cho tới khi không đè lên hộp nào."""
    for k in (0, 1, -1, 2, -2, 3, -3, 4, -4):
        cx, cy = mx + nx * 62 * k, my + ny * 62 * k
        if cx - pw / 2 < 8 or cx + pw / 2 > W - 8 or cy - ph / 2 < 8 or cy + ph / 2 > H - 8:
            continue
        if not any(_hit(cx, cy, pw + 18, ph + 18, bx, by, bw, bh) for bx, by in pos.values()):
            return cx, cy
    return mx, my


def collab(name, parts, messages, pos, size=(1700, 900), title=None, notes=(),
           panel=None):
    """Biểu đồ cộng tác.

    Mỗi cặp đối tượng có MỘT đường liên kết; các thông điệp đi trên đường đó
    được xếp thành một khối nhãn đánh số, kèm tam giác chỉ chiều. Vẽ từng mũi
    tên rời cho tám thông điệp thì nhãn chồng lên nhau và không ai đọc được.
    panel: {(a, b): (dx, dy)} để đẩy khối nhãn ra khỏi chỗ bị đè.
    """
    w, h = size
    im, d = canvas(w, h)
    bw, bh = 310, 116
    panel = panel or {}

    def edge(p, ux, uy):
        tx = (bw / 2) / abs(ux) if ux else 1e9
        ty = (bh / 2) / abs(uy) if uy else 1e9
        return (p[0] + ux * min(tx, ty), p[1] + uy * min(tx, ty))

    pairs = {}
    for i, (a, b, text, st) in enumerate(messages):
        pairs.setdefault(tuple(sorted((a, b))), []).append((i + 1, a, b, text, st))

    f = F(25)
    geo = {}
    for (ka, kb), msgs in pairs.items():
        pa, pb = pos[ka], pos[kb]
        vx, vy = pb[0] - pa[0], pb[1] - pa[1]
        ln = math.hypot(vx, vy) or 1
        ux, uy = vx / ln, vy / ln
        A, B = edge(pa, ux, uy), edge(pb, -ux, -uy)
        link(d, A, B, '#6d8797', 3)
        geo[(ka, kb)] = (A, B, ux, uy)

    for key, label, sub, kind in parts:
        if key not in pos:
            continue
        cx, cy = pos[key]
        stereo, color, fill = ICON[kind]
        d.rounded_rectangle((cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2),
                            radius=12, fill=fill, outline=color, width=3)
        d.text((cx, cy - bh / 2 + 22), '«' + stereo + '»',
               font=F(21, italic=True), fill=color, anchor='mm')
        fl = F(26, True) if len(label) <= 18 else F(22, True)
        block(d, cx, cy + 14, wrap(d, label, fl, bw - 22), fl, color)

    for (ka, kb), msgs in pairs.items():
        A, B, ux, uy = geo[(ka, kb)]
        rows = [(str(num) + ': ' + text, st, fa) for num, fa, fb, text, st in msgs]
        tw = max(d.textlength(t, font=f) for t, _, _ in rows)
        pw, ph = tw + 66, 14 + len(rows) * 33
        dx, dy = panel.get((ka, kb), panel.get((kb, ka), (0, 0)))
        mx = (A[0] + B[0]) / 2 + dx
        my = (A[1] + B[1]) / 2 + dy
        if (dx, dy) == (0, 0):
            mx, my = _avoid(mx, my, pw, ph, -uy, ux, pos, bw, bh, w, h)
        x0, y0 = mx - pw / 2, my - ph / 2
        d.rounded_rectangle((x0, y0, x0 + pw, y0 + ph), radius=8,
                            fill=WHITE, outline='#c3d4de', width=2)
        horiz = abs(ux) >= abs(uy)
        for j, (t, st, fa) in enumerate(rows):
            color, _ = STYLE[st]
            ry = y0 + 23 + j * 33
            fwd = (fa == ka)
            if horiz:
                dirn = 'r' if ((ux > 0) == fwd) else 'l'
            else:
                dirn = 'd' if ((uy > 0) == fwd) else 'u'
            _tri(d, x0 + 22, ry, dirn, color)
            d.text((x0 + 40, ry), t, font=f, fill=color, anchor='lm')

    if notes:
        for i, t in enumerate(notes):
            d.text((70, h - 74 + i * 30), '•  ' + t, font=F(24), fill='#5c3f1c')
    if title:
        block(d, w / 2, 34, [title], F(30, True))
    caption_grid(d, w, h)
    return save(im, name)


# --------------------------------------------------------------------------
# Biểu đồ lớp
# --------------------------------------------------------------------------
def classes(name, boxes, rels, size, title=None, notes=()):
    """boxes: {id: (x, y, w, h, tên, [dòng])}; rels: (a, b, nhãn, kiểu)."""
    w, h = size
    im, d = canvas(w, h)
    labels = []

    def edge(n, ox, oy):
        x, y, bw, bh = n[0], n[1], n[2], n[3]
        cx, cy = x + bw / 2, y + bh / 2
        vx, vy = ox - cx, oy - cy
        if vx == 0 and vy == 0:
            return cx, cy
        tx = (bw / 2) / abs(vx) if vx else 1e9
        ty = (bh / 2) / abs(vy) if vy else 1e9
        t = min(tx, ty)
        return (cx + vx * t, cy + vy * t)

    for a, b, lab, kind in rels:
        na, nb = boxes[a], boxes[b]
        ca = (na[0] + na[2] / 2, na[1] + na[3] / 2)
        cb = (nb[0] + nb[2] / 2, nb[1] + nb[3] / 2)
        A, B = edge(na, *cb), edge(nb, *ca)
        if kind == 'dep':
            _dash(d, A, B, '#7d94a1', 2)
            head(d, A, B, '#7d94a1', hollow=True)
        elif kind == 'agg':
            link(d, A, B, '#6d8797', 3)
            th = math.atan2(B[1] - A[1], B[0] - A[0])
            s = 15
            d.polygon([A,
                       (A[0] + s * math.cos(th - .5), A[1] + s * math.sin(th - .5)),
                       (A[0] + 2 * s * math.cos(th), A[1] + 2 * s * math.sin(th)),
                       (A[0] + s * math.cos(th + .5), A[1] + s * math.sin(th + .5))],
                      fill=WHITE, outline='#6d8797')
        else:
            link(d, A, B, '#6d8797', 3)
        if lab:
            labels.append(((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, lab))
    for x, y, bw, bh, nm, lines in boxes.values():
        titled_box(d, x, y, bw, bh, nm, lines)
    # Nhãn bội số vẽ sau hộp: khe giữa hai lớp hẹp hơn bề rộng nhãn, vẽ trước
    # thì hộp đè mất chữ.
    f = F(23)
    for mx, my, lab in labels:
        bb = d.textbbox((mx, my), lab, font=f, anchor='mm')
        d.rectangle((bb[0] - 7, bb[1] - 4, bb[2] + 7, bb[3] + 4), fill=WHITE,
                    outline='#cfdde5')
        d.text((mx, my), lab, font=f, fill=INK, anchor='mm')
    if notes:
        for i, t in enumerate(notes):
            d.text((60, h - 66 + i * 30), '•  ' + t, font=F(24), fill='#5c3f1c')
    if title:
        block(d, w / 2, 32, [title], F(30, True))
    caption_grid(d, w, h)
    return save(im, name)


# --------------------------------------------------------------------------
# Biểu đồ lớp tham gia ca sử dụng (VOPC)
# --------------------------------------------------------------------------
def vopc(name, actor_label, items, links_, size=(1700, 620), title=None, notes=()):
    """items: [(cx, cy, kind, tên, [dòng])] — kind: boundary/control/entity/external."""
    w, h = size
    im, d = canvas(w, h)
    ax, ay = 120, 150
    stick(d, ax, ay, actor_label)
    bw, bh = 340, 160
    pos = {nm: (cx, cy) for cx, cy, kind, nm, lines in items}

    for a, b, lab in links_:
        pa = (ax, ay + 90) if a == '@actor' else pos[a]
        pb = (ax, ay + 90) if b == '@actor' else pos[b]
        vx, vy = pb[0] - pa[0], pb[1] - pa[1]
        ln = math.hypot(vx, vy) or 1
        ux, uy = vx / ln, vy / ln

        def off(key, ux, uy):
            if key == '@actor':
                return 54
            return min((bw / 2) / abs(ux) if ux else 1e9, (bh / 2) / abs(uy) if uy else 1e9)

        A = (pa[0] + ux * off(a, ux, uy), pa[1] + uy * off(a, ux, uy))
        B = (pb[0] - ux * off(b, ux, uy), pb[1] - uy * off(b, ux, uy))
        link(d, A, B, '#6d8797', 3)
        if lab:
            mx, my = (A[0] + B[0]) / 2, (A[1] + B[1]) / 2
            f = F(23)
            bb = d.textbbox((mx, my - 18), lab, font=f, anchor='mm')
            d.rectangle((bb[0] - 6, bb[1] - 3, bb[2] + 6, bb[3] + 3), fill=WHITE)
            d.text((mx, my - 18), lab, font=f, fill=INK, anchor='mm')

    for cx, cy, kind, nm, lines in items:
        stereo, color, fill = ICON[kind]
        d.rounded_rectangle((cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2),
                            radius=12, fill=fill, outline=color, width=3)
        d.text((cx, cy - bh / 2 + 24), '«' + stereo + '»',
               font=F(22, italic=True), fill=color, anchor='mm')
        nlines = wrap(d, nm, F(27, True), bw - 24)
        block(d, cx, cy - 14, nlines, F(27, True), color)
        if lines:
            f = F(22)
            ls = []
            for t in lines:
                ls += wrap(d, t, f, bw - 30)
            block(d, cx, cy + bh / 2 - 24 - (len(ls) - 1) * 13, ls, f, '#54707f', lead=26)
    if notes:
        for i, t in enumerate(notes):
            d.text((60, h - 60 + i * 30), '•  ' + t, font=F(24), fill='#5c3f1c')
    if title:
        block(d, w / 2, 32, [title], F(30, True))
    caption_grid(d, w, h)
    return save(im, name)
