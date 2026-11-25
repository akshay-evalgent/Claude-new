"""Paper props and printed textures, drawn with PIL into $QS_SCRATCH/gen: the typed partnership
contract, the withdrawal letter, the credit agreement, stylised (clearly fake) $100 bills and cash
bundles, a cheque, calendar pages, the pen sketch, a circuit board, the arcade screen, debt tags, the
auction board and paddles, and the newspaper. All original artwork; no real documents are copied."""
import math, os, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SCRATCH = os.environ["QS_SCRATCH"]
GEN = os.path.join(SCRATCH, "gen")
MONO = "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf"
MONO_B = "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf"
SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
SERIF_B = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SANS_B = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
HEAVY = os.path.join(SCRATCH, "..", "fonts", "OpenSans-ExtraBold.ttf")
PAPER = (238, 232, 214)
INK = (32, 30, 34)


def font(path, size):
    return ImageFont.truetype(path, size)


def _paper(w, h, base=PAPER, seed=0, grain=6):
    rnd = random.Random(seed)
    im = Image.new("RGB", (w, h), base)
    px = im.load()
    for _ in range(w * h // 40):
        x, y = rnd.randrange(w), rnd.randrange(h)
        d = rnd.randint(-grain, grain)
        r, g, b = px[x, y]
        px[x, y] = (r + d, g + d, b + d)
    return im.filter(ImageFilter.GaussianBlur(0.6))


def signature(d, x, y, w, h, seed, width=5, col=(20, 30, 90)):
    """A loopy generic scribble (not anyone's real signature)."""
    rnd = random.Random(seed)
    pts = []
    n = 70
    loops = rnd.uniform(5, 8)
    for i in range(n):
        t = i / (n - 1)
        a = t * loops * 2 * math.pi
        px = x + t * w + math.cos(a) * h * 0.22 * (1 - 0.5 * t)
        py = y + h * 0.5 - math.sin(a) * h * (0.35 + 0.25 * math.sin(t * 7 + seed)) + rnd.uniform(-2, 2)
        pts.append((px, py))
    d.line(pts, fill=col, width=width, joint="curve")
    d.line([(x + w * 0.05, y + h * 0.95), (x + w * 1.05, y + h * 0.8)], fill=col, width=width - 1)


def contract(path, struck=False):
    W, H = 1700, 2200
    im = _paper(W, H, seed=1)
    d = ImageDraw.Draw(im)
    f = font(MONO, 34); fb = font(MONO_B, 40)
    y = 150
    d.text((W // 2, y), "AGREEMENT", font=fb, fill=INK, anchor="mm"); y += 90
    body = [
        "This agreement is made on April 1, 1976,",
        "by and between the three partners named",
        "below, who together form a partnership",
        "under the name:",
        "",
        "        APPLE COMPUTER COMPANY",
        "",
        "The partners agree that the interest of",
        "each in the partnership shall be:",
        "",
        "    Steven P. Jobs ............ 45%",
        "    Stephen G. Wozniak ........ 45%",
        "    Ronald G. Wayne ........... 10%",
        "",
        "Should the partners disagree, the matter",
        "shall be settled by majority, with the",
        "third partner holding the deciding vote.",
        "",
        "Each partner shall share in the profits",
        "and the debts of the company.",
    ]
    for line in body:
        d.text((170, y), line, font=f, fill=INK); y += 58
    y += 120
    for i, nm in enumerate(["Steven P. Jobs", "Stephen G. Wozniak", "Ronald G. Wayne"]):
        yy = y + i * 190
        signature(d, 200, yy - 40, 520, 110, seed=11 + i * 7)
        d.line([(170, yy + 80), (880, yy + 80)], fill=INK, width=2)
        d.text((170, yy + 92), nm, font=f, fill=INK)
    if struck:
        yy = y + 2 * 190
        d.line([(150, yy + 40), (900, yy + 30)], fill=(150, 20, 20), width=9)
    im.save(path)
    return {"wayne_line_y": (y + 2 * 190 + 35) / H, "wayne_pct_y": (240 + 12 * 58 + 20) / H,
            "sig_y": [(y + i * 190) / H for i in range(3)]}


def letter(path, title, lines, seed=3, sig=True):
    W, H = 1700, 2200
    im = _paper(W, H, seed=seed)
    d = ImageDraw.Draw(im)
    f = font(MONO, 36); fb = font(MONO_B, 44)
    d.text((W // 2, 170), title, font=fb, fill=INK, anchor="mm")
    y = 300
    for line in lines:
        d.text((170, y), line, font=f, fill=INK); y += 62
    if sig:
        d.line([(170, 1750), (880, 1750)], fill=INK, width=2)
        d.text((170, 1765), "Signature", font=f, fill=INK)
    im.save(path)


def bill(path):
    """A stylised green note: obviously not real currency (no portrait, made-up text)."""
    W, H = 1000, 425
    im = Image.new("RGB", (W, H), (196, 206, 182))
    d = ImageDraw.Draw(im)
    rnd = random.Random(5)
    for i in range(0, W, 6):  # guilloche-ish fine lines
        d.line([(i, 0), (i + 40 * math.sin(i * 0.05), H)], fill=(178, 192, 166), width=1)
    d.rectangle([14, 14, W - 15, H - 15], outline=(52, 82, 60), width=8)
    d.rectangle([34, 34, W - 35, H - 35], outline=(72, 102, 78), width=3)
    d.ellipse([W // 2 - 120, 70, W // 2 + 120, H - 70], fill=(150, 172, 140), outline=(52, 82, 60), width=6)
    d.ellipse([W // 2 - 70, 110, W // 2 + 70, H - 110], fill=(120, 146, 112))
    fb = font(HEAVY, 92)
    for (x, y) in ((110, 95), (W - 110, 95), (110, H - 95), (W - 110, H - 95)):
        d.text((x, y), "100", font=fb, fill=(40, 72, 50), anchor="mm")
    d.text((W // 2, H - 45), "ONE HUNDRED", font=font(SERIF_B, 34), fill=(40, 72, 50), anchor="mm")
    im.save(path)


def cash_sides(path, bill_path):
    """Side of a pallet of banded bundles: stacked rows of notes (faces out) with mustard straps."""
    b = Image.open(bill_path).convert("RGB")
    W, H = 1024, 1024
    rows, cols = 12, 4
    bw, bh = W // cols, H // rows
    im = Image.new("RGB", (W, H), (200, 208, 188))
    rnd = random.Random(9)
    tile = b.resize((bw, bh))
    for r in range(rows):
        for c in range(cols):
            off = rnd.randint(-6, 6)
            t = tile.point(lambda v, o=off: max(0, min(255, v + o)))
            im.paste(t, (c * bw, r * bh))
    d = ImageDraw.Draw(im)
    for r in range(rows):
        for c in range(cols):
            mx = c * bw + bw // 2
            d.rectangle([mx - bw * 0.07, r * bh, mx + bw * 0.07, (r + 1) * bh - 1], fill=(200, 158, 52))
            d.line([(c * bw, (r + 1) * bh - 1), ((c + 1) * bw, (r + 1) * bh - 1)], fill=(150, 160, 140), width=2)
    im.save(path)


def cash_top(path, bill_path):
    b = Image.open(bill_path).resize((300, 128))
    W, H = 1024, 1024
    im = Image.new("RGB", (W, H), (190, 200, 178))
    for r in range(8):
        for c in range(4):
            im.paste(b, (c * 256 - 22, r * 128))
    d = ImageDraw.Draw(im)
    for c in range(4):
        d.rectangle([c * 256 + 100, 0, c * 256 + 150, H], fill=(196, 160, 60))
    im.save(path)


def cheque(path):
    W, H = 1400, 600
    im = _paper(W, H, base=(214, 228, 222), seed=7, grain=4)
    d = ImageDraw.Draw(im)
    for i in range(0, W, 14):
        d.line([(i, 0), (i - 60, H)], fill=(204, 220, 214), width=2)
    d.rectangle([10, 10, W - 11, H - 11], outline=(90, 120, 110), width=4)
    f = font(SERIF, 36); fb = font(SERIF_B, 40); fm = font(MONO_B, 54)
    d.text((50, 40), "APPLE COMPUTER COMPANY", font=fb, fill=(40, 50, 50))
    d.text((W - 60, 50), "No. 0042", font=f, fill=(60, 70, 70), anchor="ra")
    d.text((50, 200), "PAY TO THE ORDER OF", font=f, fill=(60, 70, 70))
    d.text((440, 190), "Ronald G. Wayne", font=font(MONO, 48), fill=INK)
    d.line([(430, 250), (1000, 250)], fill=(60, 70, 70), width=2)
    d.rectangle([1040, 180, 1350, 260], outline=(60, 70, 70), width=3)
    d.text((1195, 220), "$1,500.00", font=fm, fill=INK, anchor="mm")
    d.text((50, 300), "One thousand five hundred and 00/100 ---------- DOLLARS", font=font(MONO, 34), fill=INK)
    d.line([(860, 500), (1340, 500)], fill=(60, 70, 70), width=2)
    signature(d, 900, 420, 380, 80, seed=33, width=4)
    im.save(path)


def calendar_page(path, day):
    W, H = 600, 700
    im = Image.new("RGB", (W, H), (246, 244, 238))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 170], fill=(176, 40, 32))
    d.text((W // 2, 88), "APRIL 1976", font=font(SANS_B, 74), fill=(250, 246, 240), anchor="mm")
    d.text((W // 2, 430), str(day), font=font(HEAVY, 330), fill=(30, 30, 34), anchor="mm")
    days = ["THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY"]
    d.text((W // 2, 640), days[(day - 1) % 7], font=font(SANS_B, 48), fill=(120, 120, 124), anchor="mm")
    im.save(path)


def sketch(path):
    """Pen and ink: a man reading under an apple tree, an apple falling (our own drawing)."""
    W, H = 1400, 1400
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    rnd = random.Random(21)
    ink = (28, 26, 30, 255)

    def jline(pts, w=5):
        out = []
        for a, b in zip(pts, pts[1:]):
            for k in range(6):
                t = k / 6
                out.append((a[0] + (b[0] - a[0]) * t + rnd.uniform(-1.5, 1.5), a[1] + (b[1] - a[1]) * t + rnd.uniform(-1.5, 1.5)))
        out.append(pts[-1])
        d.line(out, fill=ink, width=w, joint="curve")

    # oval frame
    for k in range(2):
        d.ellipse([110 + k * 22, 90 + k * 22, W - 110 - k * 22, H - 90 - k * 22], outline=ink, width=6 - k * 2)
    # ground
    jline([(260, 1060), (520, 1040), (800, 1050), (1140, 1035)], 5)
    for i in range(40):
        x = 280 + i * 21
        jline([(x, 1060), (x + rnd.uniform(-8, 8), 1060 - rnd.uniform(14, 34))], 3)
    # trunk
    jline([(820, 1045), (835, 860), (820, 700), (800, 560)], 9)
    jline([(900, 1045), (880, 860), (885, 700), (900, 560)], 9)
    for i in range(10):
        y = 620 + i * 40
        jline([(828 + rnd.uniform(-4, 4), y), (870, y + rnd.uniform(10, 24))], 3)
    # canopy: overlapping scalloped loops
    for i in range(46):
        a = rnd.uniform(0, 2 * math.pi); r = rnd.uniform(0, 1) ** 0.5
        cx, cy = 850 + math.cos(a) * 300 * r, 420 + math.sin(a) * 200 * r
        rr = rnd.uniform(40, 80)
        d.arc([cx - rr, cy - rr, cx + rr, cy + rr], rnd.uniform(160, 220), rnd.uniform(320, 380), fill=ink, width=4)
    # apples
    for (ax, ay) in ((700, 470), (980, 380), (1040, 520), (760, 330)):
        d.ellipse([ax - 20, ay - 20, ax + 20, ay + 20], outline=ink, width=4)
        jline([(ax, ay - 20), (ax + 4, ay - 34)], 3)
    # the falling one, with motion ticks
    d.ellipse([560, 640, 600, 680], outline=ink, width=5)
    for k in range(3):
        jline([(570 + k * 10, 600 - k * 4), (572 + k * 10, 624 - k * 4)], 3)
    # the man sitting against the trunk, reading
    jline([(640, 1040), (660, 900), (700, 840), (760, 830)], 6)       # back
    jline([(660, 1040), (560, 1000), (480, 1040)], 6)                 # legs
    jline([(560, 1000), (520, 950), (470, 1000)], 6)
    d.ellipse([660, 720, 760, 820], outline=ink, width=6)             # head
    jline([(700, 880), (600, 900), (560, 870)], 5)                    # arm
    jline([(540, 860), (620, 835), (640, 905), (560, 930), (540, 860)], 5)  # open book
    # ribbon banner under the frame top
    jline([(400, 1180), (700, 1210), (1000, 1180)], 6)
    jline([(400, 1250), (700, 1280), (1000, 1250)], 6)
    jline([(400, 1180), (400, 1250)], 6); jline([(1000, 1180), (1000, 1250)], 6)
    im.save(path)


def pcb(path):
    W, H = 1024, 640
    im = Image.new("RGB", (W, H), (22, 92, 52))
    d = ImageDraw.Draw(im)
    rnd = random.Random(4)
    for _ in range(160):
        x, y = rnd.randrange(30, W - 30), rnd.randrange(30, H - 30)
        pts = [(x, y)]
        for k in range(rnd.randint(2, 5)):
            if k % 2:
                x += rnd.randint(-160, 160)
            else:
                y += rnd.randint(-90, 90)
            pts.append((max(20, min(W - 20, x)), max(20, min(H - 20, y))))
        d.line(pts, fill=(170, 150, 70), width=3)
    for _ in range(26):  # chips
        x, y = rnd.randrange(40, W - 200), rnd.randrange(40, H - 80)
        w = rnd.choice((120, 160, 200)); h = 46
        d.rectangle([x, y, x + w, y + h], fill=(18, 18, 20))
        for k in range(int(w / 14)):
            d.rectangle([x + 6 + k * 14, y - 8, x + 12 + k * 14, y], fill=(200, 200, 205))
            d.rectangle([x + 6 + k * 14, y + h, x + 12 + k * 14, y + h + 8], fill=(200, 200, 205))
    for _ in range(300):
        x, y = rnd.randrange(W), rnd.randrange(H)
        d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(190, 170, 80))
    im.save(path)


def arcade_screen(path):
    W, H = 512, 640
    im = Image.new("RGB", (W, H), (4, 6, 8))
    d = ImageDraw.Draw(im)
    cols = [(240, 60, 50), (250, 150, 40), (240, 220, 60), (70, 200, 90), (60, 140, 240)]
    for r, c in enumerate(cols):
        for k in range(8):
            d.rectangle([20 + k * 60, 80 + r * 30, 72 + k * 60, 104 + r * 30], fill=c)
    d.rectangle([200, 590, 300, 604], fill=(230, 230, 230))
    d.ellipse([310, 400, 326, 416], fill=(240, 240, 240))
    d.text((W // 2, 30), "0420", font=font(MONO_B, 40), fill=(230, 230, 230), anchor="mm")
    im = im.filter(ImageFilter.GaussianBlur(1.2))
    im.save(path)


def tag(path):
    W, H = 400, 640
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.polygon([(0, 140), (200, 0), (400, 140), (400, H), (0, H)], fill=(200, 28, 24, 255))
    d.ellipse([170, 70, 230, 130], fill=(0, 0, 0, 0))
    d.text((W // 2, 400), "$", font=font(HEAVY, 330), fill=(250, 245, 240, 255), anchor="mm")
    im.save(path)


def debt_board(path):
    W, H = 1600, 900
    im = _paper(W, H, base=(242, 238, 228), seed=12)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 200], fill=(186, 32, 28))
    d.text((W // 2, 100), "OWED", font=font(HEAVY, 140), fill=(255, 250, 245), anchor="mm")
    d.text((W // 2, 520), "$15,000", font=font(HEAVY, 300), fill=(30, 28, 30), anchor="mm")
    im.save(path)


def auction_board(path, price, sold=False):
    W, H = 1600, 900
    im = Image.new("RGB", (W, H), (14, 16, 22))
    d = ImageDraw.Draw(im)
    d.text((W // 2, 140), "LOT 241", font=font(SANS_B, 110), fill=(200, 200, 205), anchor="mm")
    d.text((W // 2, 470), price, font=font(HEAVY, 250), fill=(255, 216, 120), anchor="mm")
    if sold:
        d.rounded_rectangle([W // 2 - 260, 640, W // 2 + 260, 820], 30, fill=(200, 30, 30))
        d.text((W // 2, 730), "SOLD", font=font(HEAVY, 140), fill=(255, 255, 255), anchor="mm")
    else:
        d.text((W // 2, 730), "USD", font=font(SANS_B, 90), fill=(130, 130, 140), anchor="mm")
    im.save(path)


def paddle(path, n):
    W, H = 500, 500
    im = Image.new("RGB", (W, H), (246, 246, 242))
    d = ImageDraw.Draw(im)
    d.text((W // 2, H // 2), str(n), font=font(HEAVY, 260), fill=(20, 20, 24), anchor="mm")
    im.save(path)


def newspaper(path):
    W, H = 1500, 2000
    im = _paper(W, H, base=(232, 228, 218), seed=31, grain=5)
    d = ImageDraw.Draw(im)
    d.line([(60, 120), (W - 60, 120)], fill=INK, width=4)
    d.line([(60, 128), (W - 60, 128)], fill=INK, width=1)
    lines = ["APPLE CONTRACT", "SELLS FOR", "$1.6 MILLION"]
    for i, t in enumerate(lines):
        d.text((W // 2, 250 + i * 150), t, font=font(SERIF_B, 138), fill=INK, anchor="mm")
    d.text((W // 2, 760), "Paper signed by the company's three founders in 1976 goes under the hammer",
           font=font(SERIF, 40), fill=INK, anchor="mm")
    rnd = random.Random(2)
    for col in range(3):
        x0 = 80 + col * 460
        d.rectangle([x0, 840, x0 + 400, 1120], fill=(150, 146, 140)) if col == 1 else None
        y = 840 if col != 1 else 1160
        while y < H - 80:
            w = rnd.randint(300, 400)
            d.line([(x0, y), (x0 + w, y)], fill=(110, 108, 106), width=8)
            y += 26
    im.save(path)


def sig_overlay(path, seed):
    """Transparent page-sized layer with one signature on the signature line (revealed as it is signed)."""
    W, H = 1700, 2200
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    signature(d, 200, 1620, 600, 120, seed=seed, width=7, col=(20, 30, 90, 255))
    im.save(path)


def make_all():
    os.makedirs(GEN, exist_ok=True)
    p = lambda n: os.path.join(GEN, n)
    meta = contract(p("contract.png"))
    contract(p("contract_struck.png"), struck=True)
    letter(p("withdrawal.png"), "WITHDRAWAL", [
        "I, Ronald G. Wayne, hereby withdraw",
        "as a partner of", "", "        APPLE COMPUTER COMPANY", "",
        "and give up any further interest in,",
        "or claim against, the partnership.", "",
        "In consideration of the sum of", "",
        "        $1,500.00"], seed=5)
    letter(p("credit.png"), "CREDIT AGREEMENT", [
        "Parts on credit for the order of", "fifty (50) assembled computer boards.", "",
        "AMOUNT OF CREDIT:", "", "        $15,000.00", "",
        "Payment due in thirty (30) days."], seed=6)
    sig_overlay(p("sig_credit.png"), 51)
    sig_overlay(p("sig_withdraw.png"), 25)
    bill(p("bill.png"))
    cash_sides(p("cash_sides.png"), p("bill.png"))
    cash_top(p("cash_top.png"), p("bill.png"))
    cheque(p("cheque.png"))
    for day in range(1, 13):
        calendar_page(p(f"cal_{day:02d}.png"), day)
    sketch(p("sketch.png"))
    pcb(p("pcb.png"))
    arcade_screen(p("arcade.png"))
    tag(p("tag.png"))
    debt_board(p("debt.png"))
    for k, price in enumerate(["$150,000", "$400,000", "$800,000", "$1,100,000", "$1,350,000", "$1,594,500"]):
        auction_board(p(f"board_{k}.png"), price)
    auction_board(p("board_sold.png"), "$1,594,500", sold=True)
    for n in (17, 42, 108, 63):
        paddle(p(f"paddle_{n}.png"), n)
    newspaper(p("newspaper.png"))
    return meta


if __name__ == "__main__":
    print(make_all())
