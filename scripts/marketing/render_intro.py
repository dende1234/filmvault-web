#!/usr/bin/env python3
"""Render a reusable Filmory introduction Reel with Pillow and FFmpeg.

Usage:
  python3 scripts/marketing/render_intro.py --ffmpeg /path/to/ffmpeg
Requires Pillow. FFmpeg may be installed separately or supplied by imageio-ffmpeg.
All artwork is drawn from Filmory's existing brand geometry; no member data used.
"""
import argparse
import json
import math
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFilter, ImageFont

WIDTH, HEIGHT, FPS = 1080, 1920, 24
DURATIONS = (4.5, 5.0, 5.5, 5.0)
GOLD = '#e5a823'
WHITE = '#f4f1ea'
MUTED = '#b7b3ac'
ROOT = Path(__file__).resolve().parents[2]
FONT_DIR = Path('/System/Library/Fonts/Supplemental')


def font(size, serif=False, bold=False):
    filename = ('Georgia Bold.ttf' if bold else 'Georgia.ttf') if serif else ('Arial Bold.ttf' if bold else 'Arial.ttf')
    return ImageFont.truetype(str(FONT_DIR / filename), size)


def fitted(text, size, max_width=820, serif=False, bold=False):
    while font(size, serif, bold).getlength(text) > max_width:
        size -= 1
    return font(size, serif, bold)


def write(draw, text, x, y, size=40, color=WHITE, serif=False, bold=False, max_width=820):
    draw.text((x, y), text, font=fitted(text, size, max_width, serif, bold), fill=color, anchor='lt')


def reel(draw, cx, cy, size, color=GOLD):
    scale = size / 32
    draw.ellipse((cx - 14*scale, cy - 14*scale, cx + 14*scale, cy + 14*scale), outline=color, width=max(1, round(2.5*scale)))
    for i in range(6):
        angle = i * math.pi / 3 - math.pi / 2
        x, y = cx + math.cos(angle)*7.5*scale, cy + math.sin(angle)*7.5*scale
        r = 2.6*scale
        draw.ellipse((x-r, y-r, x+r, y+r), fill=color)
    r = 2.2*scale
    draw.ellipse((cx-r, cy-r, cx+r, cy+r), outline=color, width=max(1, round(1.6*scale)))


def background():
    image = Image.new('RGB', (WIDTH, HEIGHT), '#0b0b0d')
    glow = Image.new('RGBA', image.size)
    d = ImageDraw.Draw(glow)
    d.ellipse((-200, -350, 1100, 850), fill=(157, 104, 16, 38))
    d.ellipse((650, 800, 1400, 1800), fill=(130, 91, 30, 20))
    image = Image.alpha_composite(image.convert('RGBA'), glow.filter(ImageFilter.GaussianBlur(170))).convert('RGB')
    d = ImageDraw.Draw(image)
    reel(d, 137, 265, 72)
    write(d, 'Filmory', 195, 238, size=57, serif=True, bold=True)
    d.line((103, 347, 920, 347), fill='#3b3020', width=2)
    return image


def eyebrow(draw, text):
    write(draw, text, 104, 405, size=25, color=GOLD, bold=True)


def hero(draw, lines, gold_lines=()):
    for n, line in enumerate(lines):
        write(draw, line, 98, 490 + n*119, size=108, serif=True, bold=True, color=GOLD if n in gold_lines else WHITE)


def paragraph(draw, lines, y=795):
    for i, text in enumerate(lines):
        write(draw, text, 104, y+i*59, size=40, color=MUTED)


def cases(draw):
    entries = [('DVD', '#40434a', 108, 1115), ('BLU-RAY', '#253e57', 380, 1070), ('4K UHD', '#70582f', 652, 1115)]
    for label, color, x, y in entries:
        draw.rounded_rectangle((x+8,y+14,x+242,y+344), radius=14, fill='#060607')
        draw.rounded_rectangle((x,y,x+234,y+330), radius=14, fill=color, outline='#645f54', width=2)
        draw.rounded_rectangle((x+3,y+3,x+231,y+51), radius=11, fill='#171719')
        draw.rectangle((x+3,y+30,x+231,y+51), fill='#171719')
        f = font(21, bold=True)
        draw.text((x+117,y+20), label, font=f, fill=WHITE, anchor='mt')
        reel(draw, x+117,y+175,100,color='#d1c2a3')
        draw.line((x+41,y+271,x+193,y+271), fill='#b7ac96',width=2)
        write(draw,'Jouw collectie',x+38,y+291,size=21,max_width=170)


def shelf(draw):
    colors = ['#43434b','#684b39','#35516c','#4d6453','#a77b28','#584a60','#3f4247','#665337']
    x = 106
    heights = [264,300,274,330,292,314,268,305]
    for i, color in enumerate(colors):
        h = heights[i]
        draw.rounded_rectangle((x,1395-h,x+86,1395),radius=7,fill=color,outline='#82725a',width=1)
        draw.line((x+14,1418-h,x+72,1418-h),fill='#dfd5c5',width=4)
        draw.ellipse((x+35,1356,x+51,1372),fill='#e1ce9f')
        x += 99
    draw.rounded_rectangle((96,1403,911,1415),radius=5,fill='#7e6742')


def scene(number):
    layer = Image.new('RGBA', (WIDTH,HEIGHT))
    d = ImageDraw.Draw(layer)
    if number == 0:
        eyebrow(d, 'VOOR DE VERZAMELAAR')
        hero(d, ['Ik bouw', 'Filmory.'], (1,))
        paragraph(d, ['Voor mensen die hun films', 'het liefst in de kast hebben.'])
        shelf(d)
    elif number == 1:
        eyebrow(d, 'IK ZOEK JOU')
        hero(d, ['Verzamelaars', 'die meedenken.'], (0,))
        paragraph(d, ['Dvd, Blu-ray of 4K UHD:', 'jouw ervaring helpt Filmory verder.'])
        cases(d)
    elif number == 2:
        eyebrow(d, 'PROBEER HET ZELF')
        hero(d, ['Wat werkt fijn?', 'Wat mis jij?'], (1,))
        paragraph(d, ['Probeer Filmory en deel', 'je eerlijke feedback.'])
        for i, text in enumerate(['Voeg je eerste films toe.', 'Vertel wat je mist.', 'Denk mee over de app.']):
            y = 1045+i*118
            d.rounded_rectangle((104,y,911,y+91),radius=16,fill='#19191c',outline='#38332a',width=2)
            d.ellipse((127,y+29,159,y+61),outline=GOLD,width=2)
            write(d,str(i+1),138,y+34,size=21,color=GOLD,bold=True,max_width=25)
            write(d,text,181,y+29,size=35,max_width=690)
    else:
        eyebrow(d, 'BOUW MEE AAN FILMORY')
        hero(d, ['Doe je mee?'], (0,))
        paragraph(d, ['Ik zoek verzamelaars', 'die Filmory willen proberen.'], y=690)
        d.rounded_rectangle((104,900,900,1034),radius=25,fill=GOLD)
        f = font(51,bold=True)
        d.text((502,945),'Reageer: ik doe mee',font=f,fill='#191306',anchor='mt')
        paragraph(d, ['Of probeer het via de link in bio.'], y=1100)
        write(d,'www.filmory.nl',104,1220,size=60,serif=True,bold=True)
        write(d,'Nu gratis via de website',104,1321,size=31,color=MUTED)
    return layer


def ease(x):
    x = min(1,max(0,x))
    return 1 - (1-x)**3


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--ffmpeg', required=True)
    p.add_argument('--output', type=Path, default=ROOT/'out/marketing/filmory-zoekt-verzamelaars.mp4')
    args = p.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    base = background()
    scenes = [scene(i) for i in range(4)]
    # Contact sheet is a review artifact, not part of the film.
    contact = Image.new('RGB',(WIDTH*4//3,HEIGHT//3))
    for i, layer in enumerate(scenes):
        still = Image.alpha_composite(base.convert('RGBA'),layer).convert('RGB')
        still.save(args.output.parent/f'scene-{i+1}.png')
        contact.paste(still.resize((WIDTH//3,HEIGHT//3),Image.Resampling.LANCZOS),(i*WIDTH//3,0))
    contact.save(args.output.parent/'overzicht.png')
    # Use the stable final frame as the Reel cover.
    cover = Image.alpha_composite(base.convert('RGBA'),scenes[0]).convert('RGB')
    cover.save(args.output.parent/'filmory-reel-cover.jpg',quality=95)
    cmd = [args.ffmpeg,'-y','-loglevel','error','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{WIDTH}x{HEIGHT}','-r',str(FPS),'-i','-',
           '-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(args.output)]
    process = subprocess.Popen(cmd,stdin=subprocess.PIPE)
    try:
        for i,duration in enumerate(DURATIONS):
            frames = round(duration*FPS)
            for frame in range(frames):
                t = frame/FPS
                alpha = min(ease(t/.45),ease((duration-t)/.28))
                y = round(26*(1-ease(t/.65)))
                moved = Image.new('RGBA',base.size)
                moved.paste(scenes[i],(0,y))
                rendered = Image.alpha_composite(base.convert('RGBA'),moved).convert('RGB')
                rendered = Image.blend(base,rendered,alpha)
                d = ImageDraw.Draw(rendered)
                for segment in range(4):
                    x = 104+segment*203
                    d.rounded_rectangle((x,1535,x+181,1539),radius=2,fill='#34302a')
                    if segment < i:
                        d.rounded_rectangle((x,1535,x+181,1539),radius=2,fill=GOLD)
                    elif segment == i:
                        d.rounded_rectangle((x,1535,x+max(2,round(181*frame/max(1,frames-1))),1539),radius=2,fill=GOLD)
                process.stdin.write(rendered.tobytes())
            print(f'Scene {i+1}/4 encoded',flush=True)
    finally:
        process.stdin.close()
    if process.wait():
        raise SystemExit('FFmpeg encoding failed')
    caption = '''Ik bouw Filmory voor verzamelaars van fysieke films. 🎬

Ik zoek een paar verzamelaars die de app willen proberen en eerlijk willen vertellen wat fijn werkt en wat beter kan.

Dvd’s, Blu-rays, 4K’s of steelbooks: ook met een kleine collectie ben je welkom.

Wil je meedenken? Reageer met ‘ik doe mee’ of probeer Filmory via de link in mijn bio. Op dit moment gratis via de website.

#filmcollectie #bluray #dvdcollectie #steelbook #filmory
'''
    (args.output.parent/'bijschrift.txt').write_text(caption,encoding='utf-8')
    print(json.dumps({'video':str(args.output),'duration':sum(DURATIONS),'size':[WIDTH,HEIGHT],'fps':FPS,'bytes':args.output.stat().st_size}))


if __name__ == '__main__':
    main()
