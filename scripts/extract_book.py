#!/usr/bin/env python3
"""
يحوّل كتاباً دراسياً بصيغة PDF إلى صور WebP مضغوطة، صفحة لكل ملف،
جاهزة للعرض داخل المنصة (whiteboard.html) بدون رفع الـPDF الأصلي الثقيل.

طريقة الاستخدام:
    ./venv/bin/python scripts/extract_book.py \
        --pdf "/Users/مسار/الكتاب.pdf" \
        --out books/g5/pages \
        --dpi 130 --quality 78

بعد التشغيل، راجع دليل "إضافة كتاب جديد" في CLAUDE.md أو اسأل Claude
عشان يربط الكتاب بـ app.js (Books.catalog) و whiteboard.html (BOOK).
"""
import argparse
import os
import fitz  # PyMuPDF
from PIL import Image


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pdf', required=True, help='مسار ملف الكتاب PDF')
    ap.add_argument('--out', required=True, help='مجلد الإخراج، مثال: books/g5/pages')
    ap.add_argument('--dpi', type=int, default=130, help='دقة الاستخراج (130 تعطي توازناً جيداً بين الوضوح والحجم)')
    ap.add_argument('--quality', type=int, default=78, help='جودة ضغط WebP (0-100)')
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    doc = fitz.open(args.pdf)
    total = len(doc)

    for i in range(total):
        pix = doc[i].get_pixmap(dpi=args.dpi)
        img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
        img.save(f'{args.out}/p{i+1:03d}.webp', 'WEBP', quality=args.quality, method=4)
        if (i + 1) % 50 == 0:
            print(f'تم {i + 1}/{total}', flush=True)

    print(f'انتهى — {total} صفحة في {args.out}')


if __name__ == '__main__':
    main()
