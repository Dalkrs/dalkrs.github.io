"""Motor comum para pintar as cidades no estilo da Fortaleza Cinzenta (o mesmo de Hemvria).
Tudo em quadrados (1 quadrado = 5 m); S = px por quadrado. Uso:
    import motor as M
    M.setup(W, H, S, seed)
    ... máscaras com M.poly / M.pline / M.disc / M.rect ...
    M.cv é a tela (float32, RGB)."""
import math, time
import numpy as np, cv2
from scipy.spatial import cKDTree, Voronoi

S = 8.0; W = H = 0; WP = HP = 0
cv = None
rng = np.random.default_rng(1)
T0 = time.time()
SH = 4; K = 1 << SH
RX0, RY0, RW, RH = 0, 0, 0, 0
CH = 1024
TX = {}
TT = 256


def log(*a): print(f'[{time.time() - T0:6.1f}s]', *a, flush=True)


def setup(w, h, s, seed=1, fundo=(52, 64, 46)):
    global S, W, H, WP, HP, cv, rng, RX0, RY0, RW, RH, TT, TX, T0
    S, W, H = float(s), w, h
    WP, HP = int(round(w * S)), int(round(h * S))
    RX0, RY0, RW, RH = 0, 0, WP, HP
    rng = np.random.default_rng(seed)
    TT = 512 if S >= 16 else 256
    TX = {}
    T0 = time.time()
    cv = np.empty((HP, WP, 3), np.float32); cv[:] = fundo


# ---------------- geometria ----------------
class roi:
    def __init__(self, x0, y0, x1, y1, pad=2.0):
        self.b = (max(0, int((x0 - pad) * S)), max(0, int((y0 - pad) * S)), min(WP, int(math.ceil((x1 + pad) * S))), min(HP, int(math.ceil((y1 + pad) * S))))
    def __enter__(self):
        global RX0, RY0, RW, RH
        self.old = (RX0, RY0, RW, RH)
        RX0, RY0, RW, RH = self.b[0], self.b[1], max(1, self.b[2] - self.b[0]), max(1, self.b[3] - self.b[1])
        return self
    def __exit__(self, *a):
        global RX0, RY0, RW, RH
        RX0, RY0, RW, RH = self.old


def P(pts):
    a = np.array(pts, float).reshape(-1, 2) * S - (RX0, RY0)
    return (a * K).round().astype(np.int32).reshape(-1, 1, 2)
def mask(): return np.zeros((RH, RW), np.uint8)
def poly(m, pts, v=255): cv2.fillPoly(m, [P(pts)], v, cv2.LINE_AA, SH); return m
def pline(m, pts, w, v=255, closed=False):
    cv2.polylines(m, [P(pts)], closed, v, max(1, int(round(w * S))), cv2.LINE_AA, SH); return m
def disc(m, x, y, r, v=255):
    cv2.circle(m, (int((x * S - RX0) * K), int((y * S - RY0) * K)), max(1, int(r * S * K)), v, -1, cv2.LINE_AA, SH); return m
def ellipse(m, x, y, rx, ry, ang=0, v=255):
    cv2.ellipse(m, (int((x * S - RX0) * K), int((y * S - RY0) * K)), (max(1, int(rx * S * K)), max(1, int(ry * S * K))), ang, 0, 360, v, -1, cv2.LINE_AA, SH); return m
def rect(m, x0, y0, x1, y1, v=255): return poly(m, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], v)
def rrect(m, cx, cy, w, h, ang, v=255):
    """retângulo girado (ang em graus) com centro cx, cy"""
    a = math.radians(ang); u = np.array([math.cos(a), math.sin(a)]); n = np.array([-u[1], u[0]]); c = np.array([cx, cy])
    pts = [c - u * w / 2 - n * h / 2, c + u * w / 2 - n * h / 2, c + u * w / 2 + n * h / 2, c - u * w / 2 + n * h / 2]
    return poly(m, pts, v)
def shift(m, dx, dy): return cv2.warpAffine(m, np.float32([[1, 0, dx], [0, 1, dy]]), (m.shape[1], m.shape[0]))
def OR(*ms):
    r = ms[0].copy()
    for m in ms[1:]: cv2.bitwise_or(r, m, r)
    return r
def AND(a, b): return cv2.bitwise_and(a, b)
def NOT(a): return cv2.bitwise_not(a)
def SUB(a, b): return cv2.bitwise_and(a, cv2.bitwise_not(b))
def dil(m, sq): return cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (max(1, int(sq * S * 2)) | 1,) * 2)) if sq > 0 else m
def ero(m, sq): return cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (max(1, int(sq * S * 2)) | 1,) * 2)) if sq > 0 else m
def borda(m, w=None): return cv2.subtract(m, cv2.erode(m, np.ones((3, 3), np.uint8), iterations=max(1, int(S * (w or .04)))))
def bin_(m): return ((m > 127) * 255).astype(np.uint8)
def em(m, x, y):
    xi, yi = int(x * S) - RX0, int(y * S) - RY0
    return 0 <= xi < m.shape[1] and 0 <= yi < m.shape[0] and m[yi, xi] > 127


def noise(scale, shape=None, seed=None):
    hh, ww = shape or (HP, WP)
    g = np.random.default_rng(seed).random((max(2, int(hh / (scale * S)) + 3), max(2, int(ww / (scale * S)) + 3))).astype(np.float32)
    n = cv2.resize(g, (int(g.shape[1] * scale * S), int(g.shape[0] * scale * S)), interpolation=cv2.INTER_CUBIC)[:hh, :ww]
    return np.clip(n, 0, 1)


def dentro(poly_, x, y):
    n, c = len(poly_), False
    j = n - 1
    for i in range(n):
        xi, yi = poly_[i]; xj, yj = poly_[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi: c = not c
        j = i
    return c


def suave(pts, n=3):
    """curva suave (Chaikin) pelos pontos"""
    p = np.array(pts, float)
    for _ in range(n):
        q = [p[0]]
        for a, b in zip(p, p[1:]): q += [a * .75 + b * .25, a * .25 + b * .75]
        q.append(p[-1]); p = np.array(q)
    return [tuple(x) for x in p]


def ao_longo(pts, cada, ini=0.0):
    """pontos (e direção) a cada 'cada' quadrados ao longo da linha"""
    out = []; acc = ini
    for a, b in zip(pts, pts[1:]):
        a, b = np.array(a, float), np.array(b, float); ln = np.linalg.norm(b - a)
        if ln < 1e-6: continue
        u = (b - a) / ln
        t = acc
        while t < ln:
            out.append((a + u * t, u)); t += cada
        acc = t - ln
    return out


# ---------------- texturas ----------------
def voronoi_tile(T, cell, seed):
    r = np.random.default_rng(seed)
    n = max(8, int(T * T / (cell * cell)))
    pts = r.random((n, 2)) * T
    big = np.concatenate([pts + (dx * T, dy * T) for dx in (-1, 0, 1) for dy in (-1, 0, 1)])
    ids = np.tile(np.arange(n), 9)
    yy, xx = np.mgrid[0:T, 0:T]
    q = np.c_[xx.ravel() + .5, yy.ravel() + .5]
    d, i = cKDTree(big).query(q, k=2)
    edge = (d[:, 1] - d[:, 0]).reshape(T, T).astype(np.float32)
    cid = ids[i[:, 0]].reshape(T, T)
    off = ((q - big[i[:, 0]]) / cell).reshape(T, T, 2).astype(np.float32)
    return cid, edge, off, r


def stone(name, cell, base, var, mortar, seed, mortar_w=1.0, bevel=0.18):
    """lajes de pedra (cell em quadrados)"""
    T = TT; cid, edge, off, r = voronoi_tile(T, cell * S, seed)
    n = cid.max() + 1
    col = np.array(base, np.float32)[None] + (r.random((n, 1)) - .5) * 2 * var + r.random((n, 3)) * 6 - 3
    t = col[cid]
    sh = -(off[..., 0] + off[..., 1]) * 0.5
    t *= (1 + bevel * np.clip(sh, -1, 1))[..., None]
    t += np.random.default_rng(seed + 1).normal(0, 4, t.shape[:2]).astype(np.float32)[..., None]
    mw = mortar_w * max(1.0, cell * S * 0.09)
    a = np.clip((edge - mw * .3) / mw, 0, 1)[..., None]
    t = t * a + np.array(mortar, np.float32) * (1 - a)
    TX[name] = np.clip(t, 0, 255).astype(np.uint8); return TX[name]


def flat(name, base, var, scale, seed):
    T = TT
    n = noise(scale, (T, T), seed)
    n2 = np.random.default_rng(seed).normal(0, 1, (T, T)).astype(np.float32)
    t = np.array(base, np.float32)[None, None] + ((n - .5) * 2 * var + n2 * var * .25)[..., None]
    TX[name] = np.clip(t, 0, 255).astype(np.uint8); return TX[name]


def planks(name, base, w, seed, vertical=False):
    """tábuas de madeira (w = largura da tábua em quadrados)"""
    T = TT; r = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:T, 0:T].astype(np.float32)
    a = yy if not vertical else xx
    b = xx if not vertical else yy
    pw = max(2.0, w * S)
    row = (a // pw).astype(int)
    shift_ = r.random(row.max() + 2) * T
    seg = ((b + shift_[row]) // (pw * 6)).astype(int)
    tone = r.normal(0, 8, (row.max() + 2, 64))
    t = np.array(base, np.float32)[None, None] + tone[row, seg % 64][..., None]
    t *= np.where((a % pw) < max(1, pw * .12), 0.62, 1.0)[..., None]
    t *= np.where(((b + shift_[row]) % (pw * 6)) < 1.2, 0.7, 1.0)[..., None]
    t += r.normal(0, 3, (T, T, 1))
    TX[name] = np.clip(t, 0, 255).astype(np.uint8); return TX[name]


def tile_get(tile, r0, r1, c0, c1):
    T = tile.shape[0]
    return tile[np.arange(r0, r1) % T][:, np.arange(c0, c1) % T]


def LOCAL(col): return ('LOCAL', col)


def _tex(tex, r0, r1, c0, c1):
    if isinstance(tex, str): tex = TX[tex]
    if isinstance(tex, tuple) and len(tex) == 2 and isinstance(tex[0], str) and tex[0] == 'LOCAL':
        return tex[1][r0 - RY0:r1 - RY0].astype(np.float32)
    if isinstance(tex, np.ndarray) and tex.ndim == 3 and tex.shape[0] == tex.shape[1] and tex.shape[0] <= 1024 and tex.dtype == np.uint8:
        return tile_get(tex, r0, r1, c0, c1).astype(np.float32)
    if isinstance(tex, np.ndarray) and tex.ndim == 3:
        return tex[r0:r1, c0:c1].astype(np.float32)
    return np.array(tex, np.float32).reshape(1, 1, 3)


def paint(m, tex, alpha=1.0):
    for r in range(0, RH, CH):
        rr = min(RH, r + CH)
        a = m[r:rr].astype(np.float32)[..., None] * (alpha / 255.0)
        if not a.any(): continue
        t = _tex(tex, RY0 + r, RY0 + rr, RX0, RX0 + RW)
        sl = cv[RY0 + r:RY0 + rr, RX0:RX0 + RW]
        sl[:] = sl * (1 - a) + t * a


def mul(f):
    for r in range(0, RH, CH):
        rr = min(RH, r + CH)
        sl = cv[RY0 + r:RY0 + rr, RX0:RX0 + RW]
        sl *= f[r:rr, :, None] if f.ndim == 2 else f[r:rr]


def add(f, col):
    """soma luz (f 0..1) da cor col"""
    c = np.array(col, np.float32)
    for r in range(0, RH, CH):
        rr = min(RH, r + CH)
        sl = cv[RY0 + r:RY0 + rr, RX0:RX0 + RW]
        sl += f[r:rr, :, None] * c


def sombra(m, dx, dy, blur, k, onde=None):
    sh = shift(m, dx * S, dy * S)
    g = cv2.GaussianBlur(sh, (0, 0), max(.5, S * blur)).astype(np.float32) / 255
    if onde is not None: g *= onde.astype(np.float32) / 255
    mul(1 - k * g)


# ---------------- ruas ----------------
def sementes(regiao, espac, n=60000, area=None):
    """pontos com espaçamento espac(x,y) dentro da máscara regiao (em quadrados)"""
    x0, y0, x1, y1 = area or (0, 0, W, H)
    cand = rng.random((n, 2)) * (x1 - x0, y1 - y0) + (x0, y0)
    acc, grid = [], {}
    for x, y in cand:
        if not em(regiao, x, y): continue
        r = espac(x, y)
        if r is None: continue
        gx, gy = int(x // 4), int(y // 4); ok = True
        rad = int(r // 4) + 2
        for i in range(gx - rad, gx + rad + 1):
            for j in range(gy - rad, gy + rad + 1):
                for (px, py, pr) in grid.get((i, j), ()):
                    if (px - x) ** 2 + (py - y) ** 2 < (0.5 * (r + pr)) ** 2: ok = False; break
                if not ok: break
            if not ok: break
        if ok: acc.append((x, y)); grid.setdefault((gx, gy), []).append((x, y, r))
    return np.array(acc).reshape(-1, 2)


def ruas_voronoi(regiao, espac, largura):
    sp = sementes(regiao, espac)
    m = mask()
    if len(sp) < 3: return m
    vor = Voronoi(np.r_[sp, [(-900, -900), (1900, -900), (-900, 1900), (1900, 1900)]])
    for (a, b) in vor.ridge_vertices:
        if a < 0 or b < 0: continue
        p, q = vor.vertices[a], vor.vertices[b]
        mx, my = (p + q) / 2
        pline(m, [p, q], largura(mx, my))
    return AND(m, regiao)


def ruas_grade(regiao, cx, cy, ang, sx, sy, w, jit=0.0):
    """grade de ruas girada (ang graus) passando por cx,cy"""
    m = mask(); a = math.radians(ang)
    u = np.array([math.cos(a), math.sin(a)]); n = np.array([-u[1], u[0]]); c = np.array([cx, cy])
    L_ = max(W, H) * 1.6
    for k in range(-60, 61):
        o = c + n * (k * sy + (rng.random() - .5) * jit)
        pline(m, [o - u * L_, o + u * L_], w)
    for k in range(-60, 61):
        o = c + u * (k * sx + (rng.random() - .5) * jit)
        pline(m, [o - n * L_, o + n * L_], w)
    return AND(m, regiao)


# ---------------- casario ----------------
def casario(land, dgrid, PAR, PALW, gap=0.07):
    """land: chão livre para casas. dgrid: bairro de cada quadrado (H x W, uint8).
    PAR[b] = dict(depth, lot, second(bool), dense(bool)). PALW[b] = lista de índices de paleta.
    Devolve (foot, colidx, comp_b) — foot = máscara dos telhados, colidx = índice da paleta."""
    bmap = cv2.resize(dgrid, (WP, HP), interpolation=cv2.INTER_NEAREST)
    nb = int(dgrid.max()) + 1
    DEP = np.array([PAR.get(b, PAR[0])['depth'] for b in range(nb)], np.float32)
    d = cv2.distanceTransform(land, cv2.DIST_L2, 5)
    dep = DEP[bmap] * S
    foot = ((d > 0) & (d < dep)).astype(np.uint8) * 255
    nz = noise(6, seed=int(rng.integers(1e6)))
    sec = np.array([PAR.get(b, PAR[0]).get('second', True) for b in range(nb)])[bmap]
    foot[(d > dep + 1.2 * S) & (d < 2 * dep + 1.2 * S) & (nz > 0.45) & sec] = 255
    dense = np.array([PAR.get(b, PAR[0]).get('dense', False) for b in range(nb)])[bmap]
    foot[dense & (d > 0) & (nz > 0.3) & (d < 3 * dep)] = 255
    del dep, nz, sec, dense
    stp = max(1, int(S // 4))
    fr = ((d > 0.3 * S) & (d < 1.0 * S))
    ys, xs = np.nonzero(fr[::stp, ::stp])
    cand = np.c_[xs * stp, ys * stp].astype(np.float32) / S
    ys, xs = np.nonzero(d[::stp, ::stp] > 3.5 * S)
    inner = np.c_[xs * stp, ys * stp].astype(np.float32) / S
    rng.shuffle(cand); rng.shuffle(inner)
    grid, lots = {}, []
    def tenta(x, y, mult):
        b = int(dgrid[min(H - 1, int(y)), min(W - 1, int(x))])
        r = PAR.get(b, PAR[0])['lot'] * mult
        gx, gy = int(x // 3), int(y // 3)
        for i in range(gx - 2, gx + 3):
            for j in range(gy - 2, gy + 3):
                for (px, py, pr) in grid.get((i, j), ()):
                    if (px - x) ** 2 + (py - y) ** 2 < (0.5 * (r + pr)) ** 2: return
        lots.append((x, y)); grid.setdefault((gx, gy), []).append((x, y, r))
    for x, y in cand: tenta(x, y, 0.8 + 0.4 * rng.random())
    for x, y in inner[:40000]: tenta(x, y, 1.1)
    log('lotes:', len(lots))
    cut = mask()
    if len(lots) > 3:
        vor = Voronoi(np.r_[np.array(lots), [(-900, -900), (1900, -900), (-900, 1900), (1900, 1900)]])
        segs = [P([vor.vertices[a], vor.vertices[b]]) for (a, b) in vor.ridge_vertices if a >= 0 and b >= 0]
        cv2.polylines(cut, segs, False, 255, max(1, int(round(max(1.2, S * 0.07)))), cv2.LINE_AA, SH)
    foot[cut > 60] = 0
    del cut, d
    n, lab = cv2.connectedComponents(foot, connectivity=4)
    keep = rng.random(n) > gap; keep[0] = False
    keep[np.bincount(lab.ravel(), minlength=n) < (0.9 * S) ** 2] = False
    foot = keep[lab].astype(np.uint8) * 255
    idx = np.flatnonzero(lab.ravel())
    first = np.full(n, -1, np.int64); first[lab.ravel()[idx[::-1]]] = idx[::-1]
    comp_b = np.zeros(n, np.int32)
    ok = first >= 0
    comp_b[ok] = bmap.ravel()[first[ok]]
    lotcol = np.array([rng.choice(PALW.get(int(comp_b[k]), PALW[0])) for k in range(n)], np.uint8)
    colidx = np.where(foot > 0, lotcol[lab], 255).astype(np.uint8)
    del lab, idx, first
    return foot, colidx


def telhados(foot, colidx, PAL, flat_mask=None, course=0.12, contraste=0.26):
    """telhados de quatro águas pelo campo de distância; onde flat_mask, telhado plano (terraço de barro/pedra)"""
    hgt = cv2.distanceTransform(foot, cv2.DIST_L2, 5)
    gx = cv2.Sobel(hgt, cv2.CV_32F, 1, 0, ksize=3) / 8
    gy = cv2.Sobel(hgt, cv2.CV_32F, 0, 1, ksize=3) / 8
    mag = np.sqrt(gx * gx + gy * gy) + 1e-4
    k = 0.80 + contraste * (gx + gy) / (1.4142 * mag)
    del gx, gy
    k *= np.where(((hgt / max(2.0, course * S)) % 1.0) < 0.22, 0.80, 1.0).astype(np.float32)
    k *= np.where(mag < 0.55, 1.08, 1.0).astype(np.float32)
    del mag
    k *= np.clip(hgt / max(1.0, S * 0.05), 0.55, 1.0)
    if flat_mask is not None:
        rim = max(1.5, S * 0.16)
        kf = np.where(hgt < rim, 1.06, np.where(hgt < rim + max(1.5, S * .12), 0.80, 0.95)).astype(np.float32)
        kf *= np.clip(hgt / max(1.0, S * 0.04), 0.6, 1.0)
        k = np.where(flat_mask > 0, kf, k)
        del kf
    k *= np.random.default_rng(5).normal(1, 0.03, (HP, WP)).astype(np.float32)
    pal = np.array(list(PAL) + [(0, 0, 0)] * (256 - len(PAL)), np.float32)
    for r0 in range(0, HP, CH):
        r1 = min(HP, r0 + CH)
        if not (foot[r0:r1] > 0).any(): continue
        c = pal[colidx[r0:r1]] * k[r0:r1, :, None]
        a = (foot[r0:r1].astype(np.float32) / 255)[..., None]
        cv[r0:r1] = cv[r0:r1] * (1 - a) + c * a
    del k, hgt
    paint(borda(foot, .001), (28, 26, 26), 0.6)


def chamines(foot, evita, frac=0.12, cor=(70, 64, 60)):
    st = max(1, int(S))
    ys, xs = np.nonzero((foot[::st, ::st] > 0) & (dil(evita, .6)[::st, ::st] == 0))
    pts = []
    for j in rng.choice(len(xs), size=min(len(xs), int(len(xs) * frac)), replace=False):
        x, y = xs[j] + .2, ys[j] + .2
        with roi(x, y, x + .4, y + .4, .5):
            m = rect(mask(), x, y, x + .38, y + .38)
            sombra(m, .12, .16, .05, .4)
            paint(m, cor); paint(rect(mask(), x + .09, y + .09, x + .29, y + .29), (25, 22, 22))
        pts.append((x + .19, y + .19))
    return pts


# ---------------- construções ----------------
def telhado_local(m, cor, course=0.12, contraste=0.28):
    h = cv2.distanceTransform(m, cv2.DIST_L2, 5)
    gx = cv2.Sobel(h, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(h, cv2.CV_32F, 0, 1, ksize=3)
    sh2 = (gx + gy) / (np.sqrt(gx * gx + gy * gy) * 1.414 + 1e-4)
    col = np.array(cor, np.float32)[None, None] * (0.82 + contraste * sh2)[..., None]
    col *= np.where(((h / max(2, course * S)) % 1) < 0.2, 0.82, 1.0)[..., None]
    col *= np.clip(h / max(1.0, S * .05), .6, 1)[..., None]
    paint(m, LOCAL(col))


def torre_quadrada(x0, y0, x1, y1, telhado=None, muro='muro', topo='muro_topo', alto=1.0):
    with roi(x0, y0, x1, y1, 2.5 * alto + 1):
        m = rect(mask(), x0, y0, x1, y1)
        sombra(m, 0.9 * alto, 1.1 * alto, 0.25, 0.45)
        paint(m, muro)
        if telhado is not None:
            telhado_local(m, telhado)
        else:
            paint(rect(mask(), x0 + .55, y0 + .55, x1 - .55, y1 - .55), topo)
            mer = mask()
            for t in np.arange(x0 + .15, x1 - .3, 0.7):
                rect(mer, t, y0 + .05, t + .38, y0 + .45); rect(mer, t, y1 - .45, t + .38, y1 - .05)
            for t in np.arange(y0 + .15, y1 - .3, 0.7):
                rect(mer, x0 + .05, t, x0 + .45, t + .38); rect(mer, x1 - .45, t, x1 - .05, t + .38)
            paint(mer, (118, 118, 124))
        paint(borda(m), (26, 26, 30), .8)


def torre_redonda(x, y, r, muro='muro', topo='muro_topo', telhado=None):
    with roi(x - r, y - r, x + r, y + r, 1.5):
        m = disc(mask(), x, y, r)
        sombra(m, 0.55, 0.7, 0.2, 0.45)
        paint(m, muro)
        if telhado is not None:
            telhado_local(m, telhado)
        else:
            paint(disc(mask(), x, y, r * 0.72), topo)
            mer = mask()
            for a in np.arange(0, 2 * math.pi, 2 * math.pi / max(10, int(r * 8))):
                pline(mer, [(x + math.cos(a) * (r - .22), y + math.sin(a) * (r - .22)), (x + math.cos(a + .18) * (r - .22), y + math.sin(a + .18) * (r - .22))], 0.28)
            paint(mer, (124, 124, 130))
            paint(disc(mask(), x - r * .2, y - r * .2, r * 0.18), (78, 58, 40))
        paint(borda(m), (24, 24, 28), .85)


def muralha(pl, w, gaps, closed=True, muro='muro', topo='muro_topo', ameias=(122, 122, 128), lado=None):
    """lado: ponto (x,y) do lado de dentro (para as ameias ficarem por fora)"""
    band = SUB(pline(mask(), pl, w, closed=closed), gaps)
    sombra(band, .42, .55, .18, .42)
    paint(band, muro)
    paint(SUB(pline(mask(), pl, w * 0.42, closed=closed), gaps), topo)
    mer = mask()
    pts = list(pl) + ([pl[0]] if closed else [])
    cxy = np.array(lado) if lado is not None else np.mean(pl, 0)
    for a, b in zip(pts, pts[1:]):
        a, b = np.array(a, float), np.array(b, float)
        ln = np.linalg.norm(b - a)
        if ln < 1e-6: continue
        u = (b - a) / ln; nrm = np.array([-u[1], u[0]])
        mid = (a + b) / 2
        if np.dot(mid + nrm - cxy, mid + nrm - cxy) < np.dot(mid - nrm - cxy, mid - nrm - cxy): nrm = -nrm
        off = nrm * (w * 0.5 - 0.17)
        for t in np.arange(0.3, ln - 0.3, 0.62):
            p0 = a + u * t + off
            pline(mer, [p0, p0 + u * 0.34], 0.26)
        offi = -nrm * (w * 0.5 - 0.1)
        pline(mer, [a + offi, b + offi], 0.12, 160)
    paint(SUB(mer, gaps), ameias)
    paint(borda(band), (24, 24, 28), .85)
    return band


def portao(x, y, pl, r, closed=True, **kw):
    best = None
    pts = list(pl) + ([pl[0]] if closed else [])
    for a, b in zip(pts, pts[1:]):
        a, b = np.array(a, float), np.array(b, float); ln = np.linalg.norm(b - a)
        if ln < 1e-6: continue
        u = (b - a) / ln
        t = np.clip(np.dot(np.array((x, y)) - a, u), 0, ln)
        dd = np.linalg.norm(a + u * t - (x, y))
        if best is None or dd < best[0]: best = (dd, u)
    u = best[1]
    for s in (-1, 1): torre_redonda(x + u[0] * s * (r + 1.5), y + u[1] * s * (r + 1.5), r, **kw)
    paint(pline(mask(), [(x - u[0] * 1.4, y - u[1] * 1.4), (x + u[0] * 1.4, y + u[1] * 1.4)], 0.3), (48, 44, 40), .8)


def gaps_de(pts, r):
    g = mask()
    for (x, y) in pts: disc(g, x, y, r)
    return g


def torres_ao_longo(pl, cada, gates, closed=True, evita=None, dist=5):
    pts = list(pl) + ([pl[0]] if closed else [])
    out = list(pl)
    for a, b in zip(pts, pts[1:]):
        a, b = np.array(a, float), np.array(b, float); ln = np.linalg.norm(b - a)
        k = int(ln // cada)
        for i in range(1, k + 1): out.append(tuple(a + (b - a) * i / (k + 1)))
    res = []
    for p in out:
        if any(math.dist(p, g) < dist for g in gates): continue
        if evita is not None and evita(p): continue
        res.append(p)
    return res


def arvore(x, y, r, cor, flor=None):
    with roi(x - r, y - r, x + r, y + r, 1.2 * r + .5):
        m = disc(mask(), x, y, r)
        sombra(m, .45 * r, .55 * r, .15 * r, .45)
        base = np.array(cor, np.float32)
        paint(m, tuple(base * .72))
        for k in range(6):
            a = rng.random() * 2 * math.pi; rr = r * (.35 + rng.random() * .3)
            paint(disc(mask(), x + math.cos(a) * r * .38, y + math.sin(a) * r * .38, rr), tuple(base * (.85 + rng.random() * .15)))
        paint(disc(mask(), x - r * .25, y - r * .28, r * .38), tuple(np.minimum(base * 1.25, 255)))
        if flor is not None:
            fm = mask()
            for k in range(int(10 * r)):
                a = rng.random() * 2 * math.pi; rr = rng.random() * r * .85
                disc(fm, x + math.cos(a) * rr, y + math.sin(a) * rr, .07 + rng.random() * .06)
            paint(AND(fm, m), flor, .9)


GREENS = [(58, 86, 52), (52, 78, 50), (66, 92, 56), (48, 70, 46)]


def arvores_em(free, dgrid, prob, cores=None, rmin=.7, rmax=1.4, flor=None):
    small = cv2.resize(free, (W * 2, H * 2), interpolation=cv2.INTER_AREA)
    ys, xs = np.nonzero(small > 250)
    taken = np.zeros_like(small); cnt = 0
    for j in rng.permutation(len(xs)):
        x, y = xs[j] / 2 + .25, ys[j] / 2 + .25
        b = int(dgrid[min(H - 1, int(y)), min(W - 1, int(x))])
        if rng.random() > prob.get(b, 0): continue
        if taken[ys[j], xs[j]]: continue
        r = rmin + rng.random() * (rmax - rmin)
        cv2.circle(taken, (xs[j], ys[j]), int(r * 2 + 1), 1, -1)
        f = flor(b) if callable(flor) else None
        arvore(x, y, r, (cores or GREENS)[rng.integers(len(cores or GREENS))], f)
        cnt += 1
    return cnt


def lampioes(pts, raio=.9, cor_luz=(0.55, 0.32, 0.08), brilho=1.6, cor=(255, 214, 140)):
    glow = np.zeros((HP, WP), np.float32)
    for p in pts: cv2.circle(glow, (int(p[0] * S), int(p[1] * S)), max(1, int(S * raio)), 1.0, -1)
    glow = np.clip(cv2.GaussianBlur(glow, (0, 0), S * .7 * raio / .9) * brilho, 0, 1)
    cl = np.array(cor_luz, np.float32)
    for r0 in range(0, HP, CH):
        r1 = min(HP, r0 + CH); g = glow[r0:r1, :, None]
        cv[r0:r1] = cv[r0:r1] * (1 + g * cl) + g * cl * 48
    del glow
    for p in pts:
        with roi(p[0] - .3, p[1] - .3, p[0] + .3, p[1] + .3, .3):
            paint(disc(mask(), p[0], p[1], .2), (40, 32, 24)); paint(disc(mask(), p[0], p[1], .12), cor)


def lampioes_rua(linhas, cada=9, ok=None):
    out = []
    for pts, hw in linhas:
        for i, (p, u) in enumerate(ao_longo(pts, cada, 3)):
            nrm = np.array([-u[1], u[0]])
            q = p + nrm * (hw + .1) * (1 if i % 2 else -1)
            if ok is None or ok(q): out.append(q)
    return out


CORES_TOLDO = [((150, 60, 48), (210, 196, 168)), ((52, 92, 118), (210, 196, 168)), ((176, 136, 60), (110, 48, 42)), ((80, 112, 60), (210, 196, 168)), ((120, 50, 60), (200, 176, 120))]


def barraca(x, y, w, h, cores=None):
    c1, c2 = (cores or CORES_TOLDO)[rng.integers(len(cores or CORES_TOLDO))]
    with roi(x, y, x + w, y + h, .6):
        m = rect(mask(), x, y, x + w, y + h)
        sombra(m, .12, .2, .08, .45)
        for s in range(5): paint(rect(mask(), x + s * w / 5, y, x + (s + 1) * w / 5, y + h), c1 if s % 2 == 0 else c2)
        mul(np.where(rect(mask(), x, y + h / 2, x + w, y + h) > 0, 0.85, 1).astype(np.float32))


def barracas(regiao_pts, passo=(2.2, 2.0), p=0.72, evita=None, tam=(1.4, 1.05), cores=None):
    x0, y0, x1, y1 = regiao_pts
    for x in np.arange(x0, x1, passo[0]):
        for y in np.arange(y0, y1, passo[1]):
            if evita and evita(x, y): continue
            if rng.random() < p: barraca(x + rng.random() * .3, y + rng.random() * .3, tam[0], tam[1], cores)


def fonte(x, y, r, estatua=False):
    with roi(x - r, y - r, x + r, y + r, 1):
        m = disc(mask(), x, y, r)
        sombra(m, .15, .2, .1, .35)
        paint(m, 'muro')
        if estatua:
            paint(disc(mask(), x, y, r * .78), 'muro_topo')
            paint(rect(mask(), x - r * .35, y - r * .35, x + r * .35, y + r * .35), (110, 108, 112))
            paint(disc(mask(), x, y, r * .22), (150, 142, 120))
        else:
            paint(disc(mask(), x, y, r * .78), (48, 76, 92))
            paint(disc(mask(), x, y, r * .2), 'muro')


def pier(x0, y0, x1, y1, ang_vertical=False):
    with roi(min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1), 1.5):
        m = rect(mask(), min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1))
        sombra(m, .15, .3, .12, .4)
        paint(m, (96, 74, 50))
        pl_ = mask()
        if ang_vertical:
            for t in np.arange(min(y0, y1), max(y0, y1), .22): pline(pl_, [(min(x0, x1), t), (max(x0, x1), t)], .04)
        else:
            for t in np.arange(min(x0, x1), max(x0, x1), .22): pline(pl_, [(t, min(y0, y1)), (t, max(y0, y1))], .04)
        paint(pl_, (54, 40, 28), .6)
        for (px, py) in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)):
            paint(disc(mask(), px, py, .12), (44, 32, 22))


def barco(bx, by, bl, larg=.55, ang=0):
    with roi(bx - bl, by - bl, bx + bl, by + bl, 1):
        hull = ellipse(mask(), bx, by, bl / 2, larg, ang)
        sombra(hull, .15, .25, .1, .4)
        paint(hull, (74, 52, 34))
        inn = ellipse(mask(), bx, by, bl / 2 - .25, larg * .65, ang)
        paint(inn, (112, 86, 58))
        a = math.radians(ang); u = np.array([math.cos(a), math.sin(a)]); n = np.array([-u[1], u[0]])
        bancos = mask()
        for t in (-bl * .2, bl * .15):
            c = np.array([bx, by]) + u * t
            pline(bancos, [c - n * larg * .7, c + n * larg * .7], .12)
        paint(AND(bancos, inn), (70, 50, 32))


def navio(bx, by, bl, ang=0, vela=(196, 186, 160)):
    """navio de costa: casco pontudo, convés de tábuas, mastros com a vela recolhida"""
    a = math.radians(ang); u = np.array([math.cos(a), math.sin(a)]); n = np.array([-u[1], u[0]]); c = np.array([bx, by])
    larg = bl * .17
    pts = [c + u * bl / 2] + [c + u * (bl / 2 - bl * .22) + n * larg, c - u * (bl / 2) + n * larg * .8, c - u * (bl / 2 + .2), c - u * (bl / 2) - n * larg * .8, c + u * (bl / 2 - bl * .22) - n * larg]
    with roi(bx - bl, by - bl, bx + bl, by + bl, 1.5):
        m = poly(mask(), pts)
        sombra(m, .3, .45, .2, .45)
        paint(m, (66, 46, 30))
        inn = poly(mask(), [c + (p - c) * .82 for p in pts])
        paint(inn, (128, 98, 64))
        pl_ = mask()
        for t in np.arange(-larg, larg, .22): pline(pl_, [c - u * bl * .45 + n * t, c + u * bl * .4 + n * t], .03)
        paint(AND(pl_, inn), (80, 60, 40), .6)
        for t in (-bl * .2, bl * .12):
            mc = c + u * t
            paint(pline(mask(), [mc - n * larg * 1.15, mc + n * larg * 1.15], .2), vela)
            paint(disc(mask(), mc[0], mc[1], .16), (50, 36, 24))
        paint(borda(m), (28, 20, 14), .8)


# ---------------- terreno ----------------
def irregular(m, amp=.35, escala=1.5, seed=5):
    """deixa a borda da máscara irregular (amp em fração, escala das manchas em quadrados)"""
    b = cv2.GaussianBlur(m, (0, 0), S * .6).astype(np.float32) / 255
    n = noise(escala, (m.shape[0], m.shape[1]), seed) - .5
    return (((b + n * amp) > .5) * 255).astype(np.uint8)


def rocha_tex(name, base, seed):
    """rocha sem rejunte: manchas grandes e pequenas e rachaduras"""
    T = TT
    n1 = noise(1.2, (T, T), seed); n2 = noise(.3, (T, T), seed + 1); n3 = noise(.12, (T, T), seed + 2)
    v = (n1 - .5) * 30 + (n2 - .5) * 26 + (n3 - .5) * 18
    t = np.array(base, np.float32)[None, None] + v[..., None]
    cid, edge, off, r = voronoi_tile(T, 2.6 * S, seed + 3)
    t *= np.where(edge < max(1.0, S * .03), .7, 1.0)[..., None]
    TX[name] = np.clip(t, 0, 255).astype(np.uint8); return TX[name]


def penhasco(alto, w, face='rocha', estratos=0.0, k_sombra=.55, cor_estrato=(0, 0, 0), parapeito=0, parapeito_tex='muro'):
    """a borda do terreno alto: uma face de rocha do lado de baixo, com luz do noroeste, e a sombra no chão baixo"""
    baixo = NOT(alto)
    face_m = SUB(dil(alto, w), alto)
    # o chão de baixo escurece perto do pé do penhasco (fica no fundo)
    pe = dil(alto, w)
    dl = cv2.distanceTransform(NOT(pe), cv2.DIST_L2, 5)
    mul(np.where(pe > 0, 1, 1 - 0.38 * np.exp(-dl / (S * 4.0))).astype(np.float32))
    del dl
    sombra(dil(alto, w * .6), w * .3 + .6, w * .45 + .8, .5, k_sombra, onde=SUB(baixo, face_m))
    d = cv2.distanceTransform(NOT(alto), cv2.DIST_L2, 5)
    b = cv2.GaussianBlur(alto, (0, 0), S * 0.8).astype(np.float32)
    gx = cv2.Sobel(b, cv2.CV_32F, 1, 0, ksize=5); gy = cv2.Sobel(b, cv2.CV_32F, 0, 1, ksize=5)
    mag = np.sqrt(gx * gx + gy * gy) + 1e-3
    lit = (-(gx + gy) / (1.414 * mag))          # a face que olha para o noroeste fica clara
    del gx, gy, mag, b
    f = (0.80 + 0.30 * lit) * (1.12 - 0.62 * np.clip(d / (w * S), 0, 1) ** 0.8)
    f *= (0.85 + 0.3 * noise(.35, seed=91))
    if estratos:
        f *= np.where(((d / (estratos * S)) % 1) < 0.25, 0.82, 1.0)
    paint(face_m, face)
    fm = (face_m > 0).astype(np.float32)
    mul(np.where(fm > 0, f, 1).astype(np.float32))
    del d, lit, f
    paint(borda(alto, .08), (196, 188, 170), .45)       # a quina de cima pega luz
    if parapeito: paint(borda(alto, parapeito), parapeito_tex); paint(borda(alto, .03), (20, 20, 22), .6)
    paint(SUB(dil(alto, w + .12), dil(alto, w - .02)), (22, 20, 20), .55)   # o pé do penhasco
    return face_m


def agua(m, tex='agua', espuma=True, fundo=True):
    paint(m, tex)
    if fundo:
        d = cv2.distanceTransform(m, cv2.DIST_L2, 5)
        mul(np.where(m > 0, 1 - 0.4 * np.clip(d / (S * 6), 0, 1), 1).astype(np.float32))
        del d
    dark = 1 - 0.45 * cv2.GaussianBlur(borda(m, .4), (0, 0), S * 0.4).astype(np.float32) / 255
    mul(np.where(m > 0, dark, 1).astype(np.float32))
    if espuma:
        paint(AND(dil(NOT(m), .12), m), (170, 186, 186), .35)


def ondas(m, n, comp=.6, w=.06, cor=(120, 150, 160), a=.35):
    rip = mask()
    ys, xs = np.nonzero(m[::max(1, int(S // 2)), ::max(1, int(S // 2))])
    st = max(1, int(S // 2)) / S
    for j in rng.choice(len(xs), size=min(n, len(xs)), replace=False):
        x, y = xs[j] * st, ys[j] * st
        pline(rip, [(x - comp, y), (x, y - comp * .2), (x + comp, y)], w, 150)
    paint(AND(rip, m), cor, a)


def lava(m, w_glow=2.0):
    d = cv2.distanceTransform(m, cv2.DIST_L2, 5)
    core = np.clip(d / (S * 1.2), 0, 1)
    nz = noise(.7, seed=77)
    crust = (nz < 0.36) & (d > S * .3)
    col = np.zeros((HP, WP, 3), np.float32)
    col[..., 0] = 150 + 105 * core; col[..., 1] = 40 + 150 * core ** 1.6; col[..., 2] = 10 + 40 * core ** 3
    col[crust] = col[crust] * 0.25 + np.array([30, 20, 18], np.float32) * 0.75
    paint(m, LOCAL(col))
    del col, d, core, nz, crust
    g = cv2.GaussianBlur(m, (0, 0), S * w_glow).astype(np.float32) / 255
    g = np.where(m > 0, 0, g)
    for r0 in range(0, HP, CH):
        r1 = min(HP, r0 + CH); gg = g[r0:r1, :, None]
        cv[r0:r1] = cv[r0:r1] * (1 + gg * np.array([.9, .35, .05], np.float32)) + gg * np.array([60, 18, 0], np.float32)
    del g


def escada(p0, p1, larg, passo=.35, cor_degrau=(150, 148, 150)):
    """escadaria de p0 (embaixo) a p1 (em cima), largura larg"""
    a, b = np.array(p0, float), np.array(p1, float); ln = np.linalg.norm(b - a); u = (b - a) / ln; n = np.array([-u[1], u[0]])
    with roi(min(a[0], b[0]) - larg, min(a[1], b[1]) - larg, max(a[0], b[0]) + larg, max(a[1], b[1]) + larg, 1):
        m = poly(mask(), [a - n * larg / 2, b - n * larg / 2, b + n * larg / 2, a + n * larg / 2])
        paint(m, 'praca')
        ln_m = mask()
        for t in np.arange(0, ln, passo): pline(ln_m, [a + u * t - n * larg / 2, a + u * t + n * larg / 2], .05)
        paint(AND(ln_m, m), (30, 30, 34), .7)
        g = mask()
        for t in np.arange(0, ln, passo): pline(g, [a + u * (t + .07) - n * larg / 2, a + u * (t + .07) + n * larg / 2], .05)
        paint(AND(g, m), cor_degrau, .5)
        par = OR(pline(mask(), [a - n * larg / 2, b - n * larg / 2], .25), pline(mask(), [a + n * larg / 2, b + n * larg / 2], .25))
        paint(par, 'muro'); paint(borda(m), (26, 26, 30), .7)


def fumaca(pts, r=.9, a=.35):
    f = np.zeros((HP, WP), np.float32)
    for (x, y) in pts:
        for k in range(4):
            cv2.circle(f, (int((x + .5 * k + rng.random() * .3) * S), int((y - .3 * k) * S)), max(1, int(S * r * (.6 + .25 * k))), 1.0, -1)
    f = cv2.GaussianBlur(f, (0, 0), S * .5) * a
    for r0 in range(0, HP, CH):
        r1 = min(HP, r0 + CH); g = f[r0:r1, :, None]
        cv[r0:r1] = cv[r0:r1] * (1 - g) + np.array([130, 128, 126], np.float32) * g
    del f


# ---------------- acabamento ----------------
def acabamento(desat=0.82, tint=(0.97, 0.98, 1.03), vinheta=0.28):
    for r0 in range(0, HP, CH):
        r1 = min(HP, r0 + CH)
        c = cv[r0:r1]
        g = c.mean(axis=2, keepdims=True)
        c[:] = (g + (c - g) * desat) * np.array(tint, np.float32)
    yy = (np.arange(HP, dtype=np.float32) / HP - .5)[:, None]
    xx = (np.arange(WP, dtype=np.float32) / WP - .5)[None, :]
    for r0 in range(0, HP, CH):
        r1 = min(HP, r0 + CH)
        cv[r0:r1] *= (1 - vinheta * np.clip((np.sqrt(xx ** 2 + yy[r0:r1] ** 2) - .32) / .4, 0, 1))[..., None]


def salvar(path, previa=None):
    global cv
    img = np.clip(cv, 0, 255).astype(np.uint8)[..., ::-1]
    if path.endswith('.webp'): cv2.imwrite(path, img, [cv2.IMWRITE_WEBP_QUALITY, 84])
    elif path.endswith('.jpg'): cv2.imwrite(path, img, [cv2.IMWRITE_JPEG_QUALITY, 88])
    else: cv2.imwrite(path, img)
    if previa:
        f = 2560 / img.shape[1]
        cv2.imwrite(previa, cv2.resize(img, (2560, int(img.shape[0] * f)), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 88])
    log('salvo', path, img.shape)


def texturas_padrao():
    stone('rua', 0.30, (86, 86, 90), 13, (36, 36, 40), 1)
    stone('rua_grande', 0.36, (92, 91, 95), 12, (38, 38, 42), 2)
    stone('praca', 0.55, (100, 99, 103), 12, (44, 44, 48), 3, 1.2)
    stone('cais', 0.45, (104, 100, 96), 10, (46, 44, 42), 4)
    stone('muro', 0.24, (88, 88, 94), 14, (34, 34, 38), 5, 0.9, 0.25)
    stone('muro_topo', 0.20, (72, 72, 78), 10, (30, 30, 34), 6, 0.8, 0.2)
    stone('patio', 0.42, (94, 93, 97), 12, (40, 40, 44), 7)
    stone('lama', 0.5, (84, 74, 60), 10, (66, 57, 45), 8, 1.4, 0.08)
    stone('rocha', 0.8, (92, 88, 84), 16, (54, 50, 48), 9, 2.0, 0.3)
    flat('grama', (70, 82, 58), 12, 0.6, 11)
    flat('grama_escura', (52, 64, 46), 10, 0.6, 12)
    flat('terra', (96, 84, 66), 10, 0.5, 13)
    flat('jardim', (66, 92, 56), 12, 0.5, 14)
    flat('agua', (38, 58, 70), 6, 1.2, 15)
    flat('mar', (34, 56, 72), 6, 1.5, 16)


def casario_ret(land, dgrid, PAR, PALW, frente=0.25, fill=0.9, inner=True):
    """casas retangulares viradas para a rua mais perto. PAR[b] = dict(depth, lot, ...).
    Devolve (foot, colidx) como casario()."""
    d = cv2.distanceTransform(land, cv2.DIST_L2, 5)
    st = max(1, int(S // 4))
    dc = d[::st, ::st]
    b = cv2.GaussianBlur(dc, (0, 0), 1.5)
    gx = cv2.Sobel(b, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(b, cv2.CV_32F, 0, 1, ksize=3)
    foot = np.zeros((HP, WP), np.uint8)
    colidx = np.full((HP, WP), 255, np.uint8)
    cands = []
    ys, xs = np.nonzero((dc > .3 * S) & (dc < 1.0 * S))
    cands += [(x, y, 0) for x, y in zip(xs, ys)]
    if inner:
        ys, xs = np.nonzero(dc > 3.2 * S)
        cands += [(x, y, 1) for x, y in zip(xs, ys)]
    order = rng.permutation(len(cands))
    n_ok = 0
    for j in order:
        cx_, cy_, inn = cands[j]
        x, y = cx_ * st / S, cy_ * st / S
        bb = int(dgrid[min(H - 1, int(y)), min(W - 1, int(x))])
        par = PAR.get(bb, PAR[0])
        if inn and not par.get('second', True): continue
        g = np.array([gx[cy_, cx_], gy[cy_, cx_]], float)
        if np.linalg.norm(g) < 1e-3: continue
        nrm = g / np.linalg.norm(g)                 # aponta para dentro da quadra
        u = np.array([-nrm[1], nrm[0]])
        wid = par['lot'] * (0.75 + 0.5 * rng.random())
        dep = par['depth'] * (0.8 + 0.35 * rng.random())
        d0 = d[min(HP - 1, int(y * S)), min(WP - 1, int(x * S))] / S
        c = np.array([x, y]) + nrm * (dep / 2 + frente - d0)
        pts = [c - u * wid / 2 - nrm * dep / 2, c + u * wid / 2 - nrm * dep / 2, c + u * wid / 2 + nrm * dep / 2, c - u * wid / 2 + nrm * dep / 2]
        r = wid + dep
        x0, y0 = int(max(0, (c[0] - r) * S)), int(max(0, (c[1] - r) * S)); x1, y1 = int(min(WP, (c[0] + r) * S)), int(min(HP, (c[1] + r) * S))
        if x1 - x0 < 2 or y1 - y0 < 2: continue
        m = np.zeros((y1 - y0, x1 - x0), np.uint8)
        a = (np.array(pts) * S - (x0, y0)) * K
        cv2.fillPoly(m, [a.round().astype(np.int32).reshape(-1, 1, 2)], 255, cv2.LINE_8, SH)
        area = int((m > 0).sum())
        if area < (0.8 * S) ** 2: continue
        lm = land[y0:y1, x0:x1]
        if ((m > 0) & (lm == 0)).sum() > area * .04: continue
        mm = cv2.dilate(m, np.ones((3, 3), np.uint8), iterations=max(1, int(S * .1)))
        if ((mm > 0) & (foot[y0:y1, x0:x1] > 0)).sum() > 0: continue
        foot[y0:y1, x0:x1][m > 0] = 255
        colidx[y0:y1, x0:x1][m > 0] = rng.choice(PALW.get(bb, PALW[0]))
        n_ok += 1
    log('casas:', n_ok)
    del d
    return foot, colidx
