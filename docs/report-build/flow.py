# -*- coding: utf-8 -*-
"""Sơ đồ dạng luồng: quy trình nghiệp vụ, hoạt động, trạng thái."""
import math
from draw import (canvas, save, box, wrap, block, arrow, link, F,
                  INK, LINE, FILL, BAND, WHITE, ACT, caption_grid)


def _anchor(n, other):
    """Chọn điểm ra/vào trên cạnh hộp gần phía đối tượng kia nhất."""
    x, y, w, h = n[0], n[1], n[2], n[3]
    cx, cy = x + w / 2, y + h / 2
    ox, oy = other[0] + other[2] / 2, other[1] + other[3] / 2
    if abs(ox - cx) > abs(oy - cy) * 1.15:
        return (x + w, cy) if ox > cx else (x, cy)
    return (cx, y + h) if oy > cy else (cx, y)


def _shape(d, n, fonts):
    x, y, w, h, text, kind = n
    f = fonts['n']
    if kind == 'start':
        d.ellipse((x, y, x + w, y + h), fill='#3d6377', outline=LINE, width=3)
        if text:
            block(d, x + w / 2, y + h + 26, wrap(d, text, fonts['s'], 320), fonts['s'])
    elif kind == 'end':
        d.ellipse((x, y, x + w, y + h), fill=WHITE, outline=LINE, width=4)
        d.ellipse((x + 9, y + 9, x + w - 9, y + h - 9), fill='#3d6377')
        if text:
            block(d, x + w / 2, y + h + 26, wrap(d, text, fonts['s'], 320), fonts['s'])
    elif kind == 'dec':
        d.polygon([(x + w / 2, y), (x + w, y + h / 2), (x + w / 2, y + h), (x, y + h / 2)],
                  fill='#fdf6ea', outline=ACT, width=3)
        block(d, x + w / 2, y + h / 2, wrap(d, text, f, w - 90), f)
    elif kind == 'bar':
        d.rectangle((x, y, x + w, y + h), fill='#3d6377')
    elif kind == 'state':
        d.rounded_rectangle((x, y, x + w, y + h), radius=26, fill=FILL, outline=LINE, width=3)
        block(d, x + w / 2, y + h / 2, wrap(d, text, f, w - 30), f)
    elif kind == 'io':
        sk = 26
        d.polygon([(x + sk, y), (x + w, y), (x + w - sk, y + h), (x, y + h)],
                  fill='#f3f8fb', outline=LINE, width=3)
        block(d, x + w / 2, y + h / 2, wrap(d, text, f, w - 80), f)
    else:
        box(d, x, y, w, h, text, f)


def flow(name, nodes, edges, size, lanes=None, title=None, fs=27):
    """nodes: {id: (x, y, w, h, text, kind)}; edges: (a, b, label[, waypoints])."""
    w, h = size
    im, d = canvas(w, h)
    fonts = {'n': F(fs), 's': F(24), 'e': F(24)}
    if lanes:
        for (lx, lw, label) in lanes:
            d.rectangle((lx, 8, lx + lw, h - 8), outline='#b9cdd8', width=2)
            d.rectangle((lx, 8, lx + lw, 66), fill=BAND, outline='#b9cdd8', width=2)
            block(d, lx + lw / 2, 37, wrap(d, label, F(26, True), lw - 20), F(26, True))
    deferred = []
    for e in edges:
        a, b, label = e[0], e[1], e[2]
        wp = e[3] if len(e) > 3 else None
        na, nb = nodes[a], nodes[b]
        if wp:
            pts = [_anchor(na, (wp[0][0], wp[0][1], 0, 0))] + list(wp) + [_anchor(nb, (wp[-1][0], wp[-1][1], 0, 0))]
            for i in range(len(pts) - 2):
                link(d, pts[i], pts[i + 1])
            arrow(d, pts[-2], pts[-1], label=None)
            if label:
                mx, my = wp[0][0], wp[0][1]
                bb = d.textbbox((mx, my - 22), label, font=fonts['e'], anchor='mm')
                d.rectangle((bb[0] - 6, bb[1] - 3, bb[2] + 6, bb[3] + 3), fill=WHITE)
                d.text((mx, my - 22), label, font=fonts['e'], fill=INK, anchor='mm')
        else:
            p, q = _anchor(na, nb), _anchor(nb, na)
            arrow(d, p, q)
            if label:
                mx, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
                if abs(q[0] - p[0]) > abs(q[1] - p[1]):
                    my -= 24
                deferred.append((mx, my, label))
    for n in nodes.values():
        _shape(d, n, fonts)
    # Nhãn cung vẽ sau các nút: khe giữa hai nút thường hẹp hơn nhãn, vẽ trước
    # thì nút đè mất chữ.
    for mx, my, label in deferred:
        bb = d.textbbox((mx, my), label, font=fonts['e'], anchor='mm')
        d.rectangle((bb[0] - 7, bb[1] - 4, bb[2] + 7, bb[3] + 4), fill=WHITE,
                    outline='#dbe6ec')
        d.text((mx, my), label, font=fonts['e'], fill=INK, anchor='mm')
    if title:
        block(d, w / 2, 34, [title], F(30, True))
    caption_grid(d, w, h)
    return save(im, name)


def activity(name, steps, branch=None, width=1220, title=None, notes=()):
    """Biểu đồ hoạt động một cột, có thể tách một nhánh 'Không' sang trái.

    steps:  [(kind, text)] với kind = start | box | dec | end.
    branch: (chỉ số nút quyết định, nhãn nhánh chính, nhãn nhánh phụ,
             [text các nút nhánh phụ]) — nhánh phụ kết thúc bằng nút end riêng.
    """
    bw, bh, gap = 470, 92, 62
    cx = width * (0.63 if branch else 0.5)
    ys, y = [], 60
    for kind, text in steps:
        h = 46 if kind in ('start', 'end') else (118 if kind == 'dec' else bh)
        ys.append((y, h))
        y += h + gap
    total_h = y + (46 if notes else 0) + 20
    nodes, edges = {}, []
    for i, ((kind, text), (yy, hh)) in enumerate(zip(steps, ys)):
        if kind in ('start', 'end'):
            nodes['n%d' % i] = (cx - 23, yy, 46, 46, '', kind)
        elif kind == 'dec':
            nodes['n%d' % i] = (cx - 255, yy, 510, hh, text, 'dec')
        else:
            nodes['n%d' % i] = (cx - bw / 2, yy, bw, hh, text, 'box')
        if i:
            edges.append(('n%d' % (i - 1), 'n%d' % i, ''))
    if branch:
        di, yes_lab, no_lab, texts = branch
        edges = [e for e in edges if e[1] != 'n%d' % (di + 1)]
        edges.append(('n%d' % di, 'n%d' % (di + 1), yes_lab))
        bx = width * 0.20
        by = ys[di][0] + ys[di][1] + gap
        prev = 'n%d' % di
        for j, t in enumerate(texts):
            key = 'b%d' % j
            nodes[key] = (bx - 205, by, 410, bh, t, 'box')
            edges.append((prev, key, no_lab if j == 0 else ''))
            prev = key
            by += bh + gap
        nodes['bend'] = (bx - 23, by, 46, 46, '', 'end')
        edges.append((prev, 'bend', ''))
        total_h = max(total_h, by + 100)
    im_path = flow(name, nodes, edges, (int(width), int(total_h)), title=title)
    return im_path
