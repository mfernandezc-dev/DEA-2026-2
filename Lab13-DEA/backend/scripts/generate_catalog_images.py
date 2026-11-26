"""Draw original demo illustrations using Pillow, without external assets."""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from catalog.demo import DEMO_PRODUCTS  # noqa: E402


def draw_product(name, category, index):
    image = Image.new('RGB', (900, 600), '#edf2fa')
    draw = ImageDraw.Draw(image)
    accent = ['#2563eb', '#0d9488', '#7c3aed'][index % 3]
    draw.rounded_rectangle((30, 25, 870, 575), radius=28, fill='white')
    draw.text((65, 48), 'TechStore', fill=accent,
              font=ImageFont.load_default(size=26))
    draw.ellipse((170, 430, 730, 470), fill='#e2e8f0')
    if category in {'Laptops', 'Monitors'}:
        draw.rounded_rectangle((210, 140, 690, 390), 16, fill='#17243b')
        draw.rectangle((230, 160, 670, 365), fill=accent)
        draw.polygon([(230, 365), (430, 195), (570, 365)], fill='#93c5fd')
        draw.ellipse((540, 180, 610, 250), fill='#dbeafe')
        if category == 'Laptops':
            draw.polygon([(210, 390), (690, 390), (745, 440), (155, 440)],
                         fill='#64748b')
            draw.rounded_rectangle((375, 404, 525, 427), 5, fill='#cbd5e1')
        else:
            draw.rectangle((425, 390, 475, 435), fill='#64748b')
            draw.rounded_rectangle((345, 435, 555, 451), 7, fill='#17243b')
    elif name == 'Wireless Mouse':
        draw.rounded_rectangle((335, 130, 565, 440), 105, fill='#17243b')
        draw.line((450, 135, 450, 265), fill=accent, width=5)
        draw.rounded_rectangle((435, 180, 465, 235), 12, fill='#94a3b8')
        draw.arc((575, 150, 660, 235), 260, 90, fill=accent, width=7)
        draw.arc((580, 120, 700, 265), 265, 85, fill=accent, width=6)
    elif name == 'Mechanical Keyboard':
        draw.rounded_rectangle((130, 205, 770, 415), 18, fill='#17243b')
        for row in range(4):
            for column in range(12):
                x = 150 + column * 50
                y = 225 + row * 44
                draw.rounded_rectangle((x, y, x + 38, y + 32), 5,
                                       fill=accent if row == 0 else '#64748b')
        draw.rounded_rectangle((300, 405, 600, 425), 5, fill=accent)
    else:
        draw.arc((290, 120, 610, 440), 180, 360, fill='#17243b', width=38)
        draw.rounded_rectangle((285, 270, 360, 425), 28, fill=accent)
        draw.rounded_rectangle((540, 270, 615, 425), 28, fill=accent)
        draw.line((580, 390, 545, 455, 480, 455), fill='#17243b', width=12)
        draw.rounded_rectangle((445, 443, 490, 468), 10, fill='#17243b')
    draw.text((65, 490), name, fill='#17243b',
              font=ImageFont.load_default(size=32))
    draw.text((65, 540), 'Original demo illustration - not a photograph',
              fill='#64748b', font=ImageFont.load_default(size=18))
    return image


def main():
    destination = BACKEND / 'catalog' / 'assets' / 'demo'
    destination.mkdir(parents=True, exist_ok=True)
    for index, (name, category, *_, filename) in enumerate(DEMO_PRODUCTS):
        draw_product(name, category, index).save(destination / filename)
    print('Created 8 original local product illustrations (900 x 600 PNG).')


if __name__ == '__main__':
    main()
