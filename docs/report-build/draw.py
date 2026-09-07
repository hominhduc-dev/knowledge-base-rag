# -*- coding: utf-8 -*-
"""Bộ vẽ sơ đồ cho báo cáo Phân tích thiết kế hệ thống.

Nguyên tắc: mọi ảnh rộng tối đa 1700 px và chữ tối thiểu 26 px. Ảnh đặt vừa
khổ 16,5 cm trên A4 nên tỷ lệ đó cho cỡ chữ in khoảng 7,5 pt — đọc được.
Ảnh rộng hơn (kiểu 4700 px của bản cũ) khi thu về bề ngang trang sẽ mất chữ.
"""
from pathlib import Path
import math
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent / 'pttkht'
OUT.mkdir(exist_ok=True)

REG = 'C:/Windows/Fonts/arial.ttf'
BLD = 'C:/Windows/Fonts/arialbd.ttf'
ITA = 'C:/Windows/Fonts/ariali.ttf'

INK   = '#16323f'   # chữ
LINE  = '#3d6377'   # nét
FILL  = '#eef5f9'   # nền hộp
BAND  = '#dbe9f1'   # nền tiêu đề
WHITE = '#ffffff'
ACT   = '#8a4b12'   # nhấn (actor, ghi chú)
SEC   = '#a8322d'   # kiểm quyền
OKC   = '#1f6b4a'   # thành công


def F(size, bold=False, italic=False):
    return ImageFont.truetype(BLD if bold else (ITA if italic else REG), size)


def canvas(w, h):
    im = Image.new('RGB', (w, h), WHITE)
    return im, ImageDraw.Draw(im)


def save(im, name):
    im.save(OUT / (name + '.png'))
    return OUT / (name + '.png')


def wrap(draw, text, font, maxw):
    """Ngắt dòng theo bề rộng pixel. Tôn trọng \n có sẵn."""
    out = []
    for para in str(text).split('\n'):
        words, cur = para.split(' '), ''
        for w in words:
            probe = (cur + ' ' + w).strip()
            if cur and draw.textlength(probe, font=font) > maxw:
                out.append(cur)
                cur = w
            else:
                cur = probe
        out.append(cur)
    return out


def block(draw, cx, cy, lines, font, fill=INK, lead=None):
    lead = lead or int(font.size * 1.32)
    top = cy - (len(lines) - 1) * lead / 2
    for i, ln in enumerate(lines):
        draw.text((cx, top + i * lead), ln, font=font, fill=fill, anchor='mm')


def box(draw, x, y, w, h, text='', font=None, fill=FILL, outline=LINE,
        radius=14, width=3, tcolor=INK, pad=16, bold=False):
    font = font or F(27, bold)
    draw.rounded_rectangle((x, y, x + w, y + h), radius=radius, fill=fill,
                           outline=outline, width=width)
    if text:
        block(draw, x + w / 2, y + h / 2, wrap(draw, text, font, w - 2 * pad), font, tcolor)


TITLE_LEAD = 34
BODY_LEAD = 33


def band_height(title):
    return 16 + len(str(title).split('\n')) * TITLE_LEAD


def box_height(title, body):
    """Chiều cao vừa đủ cho hộp lớp. Dùng chung với titled_box để nội dung
    không tràn ra ngoài viền — lỗi hay gặp khi chiều cao gõ tay."""
    return band_height(title) + 16 + len(body) * BODY_LEAD + 14


def titled_box(draw, x, y, w, h, title, body, ft=None, fb=None):
    """Hộp có băng tiêu đề — dùng cho lớp, đối tượng, form."""
    ft = ft or F(25, True)
    fb = fb or F(23)
    draw.rounded_rectangle((x, y, x + w, y + h), radius=12, fill=WHITE,
                           outline=LINE, width=3)
    tlines = str(title).split('\n')
    bh = band_height(title)
    draw.rounded_rectangle((x, y, x + w, y + bh), radius=12, fill=BAND, outline=LINE, width=3)
    draw.rectangle((x, y + bh - 12, x + w, y + bh), fill=BAND, outline=None)
    draw.line((x, y + bh, x + w, y + bh), fill=LINE, width=3)
    block(draw, x + w / 2, y + bh / 2, tlines, ft, lead=TITLE_LEAD)
    if body:
        top = y + bh + 20
        for i, ln in enumerate(body):
            draw.text((x + 14, top + i * BODY_LEAD), ln, font=fb, fill=INK)
    return bh


def _dash(draw, p, q, color, width, on=14, off=11):
    x0, y0 = p
    x1, y1 = q
    total = math.hypot(x1 - x0, y1 - y0)
    if total == 0:
        return
    ux, uy = (x1 - x0) / total, (y1 - y0) / total
    t = 0.0
    while t < total:
        e = min(t + on, total)
        draw.line((x0 + ux * t, y0 + uy * t, x0 + ux * e, y0 + uy * e), fill=color, width=width)
        t = e + off


def head(draw, p, q, color, size=17, hollow=False):
    th = math.atan2(q[1] - p[1], q[0] - p[0])
    a = (q[0] - size * math.cos(th - .38), q[1] - size * math.sin(th - .38))
    b = (q[0] - size * math.cos(th + .38), q[1] - size * math.sin(th + .38))
    if hollow:
        draw.line([q, a], fill=color, width=3)
        draw.line([q, b], fill=color, width=3)
    else:
        draw.polygon([q, a, b], fill=color)


def arrow(draw, p, q, color=LINE, width=3, dashed=False, label=None,
          font=None, lcolor=None, hollow=False, above=True):
    if dashed:
        _dash(draw, p, q, color, width)
    else:
        draw.line([p, q], fill=color, width=width)
    head(draw, p, q, color, hollow=hollow)
    if label:
        font = font or F(25)
        mx, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
        if abs(q[0] - p[0]) > abs(q[1] - p[1]):
            my -= (int(font.size * 0.95) if above else -int(font.size * 0.95))
        bb = draw.textbbox((mx, my), label, font=font, anchor='mm')
        draw.rectangle((bb[0] - 6, bb[1] - 3, bb[2] + 6, bb[3] + 3), fill=WHITE)
        draw.text((mx, my), label, font=font, fill=lcolor or (color if color != LINE else INK), anchor='mm')


def link(draw, p, q, color=LINE, width=3, dashed=False):
    if dashed:
        _dash(draw, p, q, color, width)
    else:
        draw.line([p, q], fill=color, width=width)


def stick(draw, cx, y, label, sub=None, color=ACT):
    """Hình người que cho actor. y là đỉnh đầu."""
    r = 22
    draw.ellipse((cx - r, y, cx + r, y + 2 * r), outline=color, width=4)
    draw.line((cx, y + 2 * r, cx, y + 2 * r + 58), fill=color, width=4)
    draw.line((cx - 38, y + 2 * r + 20, cx + 38, y + 2 * r + 20), fill=color, width=4)
    draw.line((cx, y + 2 * r + 58, cx - 30, y + 2 * r + 108), fill=color, width=4)
    draw.line((cx, y + 2 * r + 58, cx + 30, y + 2 * r + 108), fill=color, width=4)
    f = F(27, True)
    block(draw, cx, y + 2 * r + 138, wrap(draw, label, f, 260), f, color)
    if sub:
        fs = F(23)
        block(draw, cx, y + 2 * r + 138 + 30 * len(wrap(draw, label, f, 260)), wrap(draw, sub, fs, 260), fs, '#6a7f8b')
    return y + 2 * r + 108


def oval(draw, cx, cy, w, h, text, font=None, fill=FILL, outline=LINE):
    font = font or F(25)
    draw.ellipse((cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), fill=fill, outline=outline, width=3)
    block(draw, cx, cy, wrap(draw, text, font, w - 34), font, INK)


def note(draw, x, y, w, text, font=None, fill='#fdf7ec', outline=ACT):
    font = font or F(24)
    lines = wrap(draw, text, font, w - 34)
    h = 26 + len(lines) * int(font.size * 1.4)
    fold = 22
    draw.polygon([(x, y), (x + w - fold, y), (x + w, y + fold), (x + w, y + h), (x, y + h)],
                 fill=fill, outline=outline)
    draw.line([(x + w - fold, y), (x + w - fold, y + fold), (x + w, y + fold)], fill=outline, width=2)
    for i, ln in enumerate(lines):
        draw.text((x + 16, y + 14 + i * int(font.size * 1.4)), ln, font=font, fill='#5c3f1c')
    return h


def caption_grid(draw, w, h):
    """Khung ngoài mảnh cho toàn hình — giúp ảnh không trôi trên nền trắng."""
    draw.rectangle((1, 1, w - 2, h - 2), outline='#cfdde5', width=2)
