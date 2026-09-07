# -*- coding: utf-8 -*-
"""Bản phác thảo giao diện (wireframe).

Cố ý vẽ ở mức phác thảo, không phải ảnh chụp ứng dụng đang chạy: hộp, nhãn và
trạng thái đủ để bảo vệ bố cục, không cam kết màu sắc hay khoảng cách cuối cùng.
"""
from draw import canvas, save, wrap, block, F, INK, LINE, WHITE, caption_grid

SHELL = '#f4f8fa'
EDGE = '#93aebd'
SOFT = '#e8f1f6'
MUTED = '#6d8898'


def frame(d, w, h, title, nav=None, active=None, user='Nguyễn Văn A · Sinh Viên CNTT'):
    d.rectangle((16, 16, w - 16, h - 16), fill=WHITE, outline=EDGE, width=3)
    d.rectangle((16, 16, w - 16, 92), fill='#dde9f0', outline=EDGE, width=3)
    d.text((44, 54), title, font=F(28, True), fill=INK, anchor='lm')
    d.text((w - 44, 54), user, font=F(22), fill=MUTED, anchor='rm')
    if nav is None:
        return 16, 92
    d.rectangle((16, 92, 356, h - 16), fill=SHELL, outline=EDGE, width=3)
    for i, item in enumerate(nav):
        y = 140 + i * 62
        if item == active:
            d.rounded_rectangle((36, y - 24, 336, y + 24), radius=8,
                                fill='#cfe2ed', outline=EDGE, width=2)
        d.text((56, y), item, font=F(24, True if item == active else False),
               fill=INK if item == active else MUTED, anchor='lm')
    d.text((56, h - 60), '*  Giáo vụ · **  Quản trị viên', font=F(20), fill=MUTED, anchor='lm')
    return 356, 92


def field(d, x, y, w, h, placeholder, value=None, label=None):
    if label:
        d.text((x, y - 18), label, font=F(21), fill=MUTED, anchor='lm')
    d.rounded_rectangle((x, y, x + w, y + h), radius=8, fill=WHITE, outline=EDGE, width=2)
    d.text((x + 18, y + h / 2), value or placeholder, font=F(23),
           fill=INK if value else '#9aafbc', anchor='lm')


def button(d, x, y, w, h, text, primary=True):
    d.rounded_rectangle((x, y, x + w, y + h), radius=8,
                        fill='#cfe2ed' if primary else WHITE, outline=EDGE, width=2)
    d.text((x + w / 2, y + h / 2), text, font=F(23, True), fill=INK, anchor='mm')


def card(d, x, y, w, h, lines, fill=SOFT, title=None):
    d.rounded_rectangle((x, y, x + w, y + h), radius=10, fill=fill, outline=EDGE, width=2)
    yy = y + 26
    if title:
        d.text((x + 20, yy), title, font=F(24, True), fill=INK, anchor='lm')
        yy += 38
    for t in lines:
        d.text((x + 20, yy), t, font=F(22), fill=INK, anchor='lm')
        yy += 32


def table(d, x, y, w, headers, rows, widths, rowh=54):
    d.rectangle((x, y, x + w, y + rowh), fill='#dde9f0', outline=EDGE, width=2)
    cx = x
    for hd, cw in zip(headers, widths):
        d.text((cx + 16, y + rowh / 2), hd, font=F(22, True), fill=INK, anchor='lm')
        cx += cw
    for i, row in enumerate(rows):
        ry = y + rowh * (i + 1)
        d.rectangle((x, ry, x + w, ry + rowh), fill=WHITE, outline=EDGE, width=2)
        cx = x
        for v, cw in zip(row, widths):
            d.text((cx + 16, ry + rowh / 2), v, font=F(22), fill=INK, anchor='lm')
            cx += cw
    return y + rowh * (len(rows) + 1)


def badge(d, x, y, text, tone='#e6f1e9', edge='#4c8a68'):
    f = F(20, True)
    tw = d.textlength(text, font=f)
    d.rounded_rectangle((x, y - 16, x + tw + 26, y + 16), radius=16, fill=tone,
                        outline=edge, width=2)
    d.text((x + 13, y), text, font=f, fill='#2c5b45', anchor='lm')
    return x + tw + 36


def screen(name, w, h, painter):
    im, d = canvas(w, h)
    painter(d, w, h)
    caption_grid(d, w, h)
    return save(im, name)
