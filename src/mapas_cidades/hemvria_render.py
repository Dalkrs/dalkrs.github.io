"""Hemvria — o pintor. Uso: python3 render.py <px por quadrado> <saida.png|webp>
No estilo da Fortaleza Cinzenta 3.0: lajes de pedra (Voronoi) com rejunte escuro, muralhas de pedra com ameias,
telhados com sombreado de luz do noroeste, lampiões quentes. Sem legenda, sem interior."""
import sys, math, json, time
import numpy as np, cv2
from scipy.spatial import cKDTree, Voronoi
import layout as L

F = float(sys.argv[1]) if len(sys.argv) > 1 else 8
OUTF = sys.argv[2] if len(sys.argv) > 2 else 'prev.png'
S = F
WP, HP = int(round(L.W * S)), int(round(L.H * S))
rng = np.random.default_rng(20261108)
T0 = time.time()
def log(*a): print(f'[{time.time()-T0:6.1f}s]', *a, flush=True)

SH = 4; K = 1 << SH
RX0, RY0, RW, RH = 0, 0, WP, HP          # a janela de trabalho (para os objetos pequenos não varrerem a imagem toda)
class roi:
    def __init__(self, x0, y0, x1, y1, pad=2.0):
        self.b = (max(0, int((x0 - pad) * S)), max(0, int((y0 - pad) * S)), min(WP, int(math.ceil((x1 + pad) * S))), min(HP, int(math.ceil((y1 + pad) * S))))
    def __enter__(self):
        global RX0, RY0, RW, RH
        self.old = (RX0, RY0, RW, RH)
        RX0, RY0, RW, RH = self.b[0], self.b[1], max(1, self.b[2] - self.b[0]), max(1, self.b[3] - self.b[1])
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
def disc(m, x, y, r, v=255): cv2.circle(m, (int((x * S - RX0) * K), int((y * S - RY0) * K)), max(1, int(r * S * K)), v, -1, cv2.LINE_AA, SH); return m
def rect(m, x0, y0, x1, y1, v=255): return poly(m, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], v)
def shift(m, dx, dy): return cv2.warpAffine(m, np.float32([[1, 0, dx], [0, 1, dy]]), (m.shape[1], m.shape[0]))

def noise(scale, shape=None, seed=None):
    """ruído suave (0..1) com manchas de 'scale' quadrados"""
    hh, ww = shape or (HP, WP)
    g = np.random.default_rng(seed).random((max(2, int(hh / (scale * S)) + 3), max(2, int(ww / (scale * S)) + 3))).astype(np.float32)
    n = cv2.resize(g, (int(g.shape[1] * scale * S), int(g.shape[0] * scale * S)), interpolation=cv2.INTER_CUBIC)[:hh, :ww]
    return np.clip(n, 0, 1)

# ---------------- texturas que se repetem (lado T) ----------------
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
    # o "relevo" da pedra: perto do centro mais claro, vetor do centro para luz
    c = big[i[:, 0]]
    off = ((q - c) / cell).reshape(T, T, 2).astype(np.float32)
    return cid, edge, off, r

def stone_tex(T, cell, base, var, mortar, seed, mortar_w=1.0, bevel=0.18):
    cid, edge, off, r = voronoi_tile(T, cell, seed)
    n = cid.max() + 1
    jit = (r.random((n, 1)) - .5) * 2 * var
    tint = r.random((n, 3)) * 6 - 3
    col = np.array(base, np.float32)[None] + jit + tint
    t = col[cid]
    # luz do noroeste: a borda de cima/esquerda da pedra mais clara, a de baixo/direita mais escura
    sh = -(off[..., 0] + off[..., 1]) * 0.5
    t *= (1 + bevel * np.clip(sh, -1, 1))[..., None]
    gr = np.random.default_rng(seed + 1).normal(0, 4, t.shape[:2]).astype(np.float32)
    t += gr[..., None]
    mw = mortar_w * max(1.0, cell * 0.09)
    a = np.clip((edge - mw * .3) / (mw), 0, 1)[..., None]
    t = t * a + np.array(mortar, np.float32) * (1 - a)
    return np.clip(t, 0, 255).astype(np.uint8)

def tile_get(tile, r0, r1, c0, c1):
    T = tile.shape[0]
    rows = np.arange(r0, r1) % T; cols = np.arange(c0, c1) % T
    return tile[rows][:, cols]

CH = 1024
def _tex(tex, r0, r1, c0, c1):
    if isinstance(tex, tuple) and len(tex) == 2 and tex[0] == 'LOCAL':
        return tex[1][r0 - RY0:r1 - RY0].astype(np.float32)
    if isinstance(tex, np.ndarray) and tex.ndim == 3 and tex.shape[0] == tex.shape[1] and tex.shape[0] <= 1024 and tex.dtype == np.uint8:
        return tile_get(tex, r0, r1, c0, c1).astype(np.float32)
    if isinstance(tex, np.ndarray) and tex.ndim == 3:
        return tex[r0:r1, c0:c1].astype(np.float32)
    return np.array(tex, np.float32).reshape(1, 1, 3)
def _full(col):
    return ('LOCAL', col)
def paint(cv, m, tex, alpha=1.0):
    """pinta a textura (tile, imagem inteira ou cor) onde a máscara m (0..255, do tamanho da janela) manda"""
    for r in range(0, RH, CH):
        rr = min(RH, r + CH)
        a = m[r:rr].astype(np.float32)[..., None] * (alpha / 255.0)
        if not a.any(): continue
        t = _tex(tex, RY0 + r, RY0 + rr, RX0, RX0 + RW)
        sl = cv[RY0 + r:RY0 + rr, RX0:RX0 + RW]
        sl[:] = sl * (1 - a) + t * a
def mul(cv, f):
    for r in range(0, RH, CH):
        rr = min(RH, r + CH)
        sl = cv[RY0 + r:RY0 + rr, RX0:RX0 + RW]
        sl *= f[r:rr, :, None] if f.ndim == 2 else f[r:rr]
def sombra(m, dx, dy, blur, k):
    sh = shift(m, dx * S, dy * S)
    mul(cv, 1 - k * cv2.GaussianBlur(sh, (0, 0), max(.5, S * blur)).astype(np.float32) / 255)

T = 512 if S >= 16 else 256
log('texturas')
TX = {
    'rua': stone_tex(T, 0.30 * S, (86, 86, 90), 13, (36, 36, 40), 1),
    'rua_grande': stone_tex(T, 0.36 * S, (92, 91, 95), 12, (38, 38, 42), 2),
    'praca': stone_tex(T, 0.55 * S, (100, 99, 103), 12, (44, 44, 48), 3, 1.2),
    'cais': stone_tex(T, 0.45 * S, (104, 100, 96), 10, (46, 44, 42), 4),
    'muro': stone_tex(T, 0.24 * S, (88, 88, 94), 14, (34, 34, 38), 5, 0.9, 0.25),
    'muro_topo': stone_tex(T, 0.20 * S, (72, 72, 78), 10, (30, 30, 34), 6, 0.8, 0.2),
    'patio': stone_tex(T, 0.42 * S, (94, 93, 97), 12, (40, 40, 44), 7),
    'lama': stone_tex(T, 0.5 * S, (84, 74, 60), 10, (66, 57, 45), 8, 1.4, 0.08),
}
def flat_tex(base, var, scale, seed):
    n = noise(scale, (T, T), seed)
    n2 = np.random.default_rng(seed).normal(0, 1, (T, T)).astype(np.float32)
    t = np.array(base, np.float32)[None, None] + ((n - .5) * 2 * var + n2 * var * .25)[..., None]
    return np.clip(t, 0, 255).astype(np.uint8)
# (as texturas planas se repetem: o tamanho das manchas tem de caber no tile)
TX['grama'] = flat_tex((70, 82, 58), 12, 0.6, 11)
TX['grama_escura'] = flat_tex((52, 64, 46), 10, 0.6, 12)
TX['terra'] = flat_tex((96, 84, 66), 10, 0.5, 13)
TX['jardim'] = flat_tex((66, 92, 56), 12, 0.5, 14)
TX['agua'] = flat_tex((38, 58, 70), 6, 1.2, 15)
TX['madeira'] = None

# ================= 1) as máscaras do traçado =================
log('traçado')
city = poly(mask(), L.OUT)
old = poly(mask(), L.OLD)
river = pline(mask(), L.RIV, 2 * L.RHW)
embank = pline(mask(), L.RIV, 2 * L.RHW + 1.4)

cx0, cy0, cx1, cy1 = L.CAS
castle = rect(mask(), cx0, cy0, cx1, cy1)
cathedral = mask()
for (a, b, c, d) in L.CATEDRAL: rect(cathedral, a, b, c, d)
disc(cathedral, L.APSE[0], L.APSE[1], L.APSE[2])
adro = mask(); poly(adro, L.PRACA_LUZ); rect(adro, 75.5, 33.5, 82, 50.5); rect(adro, 79, 36.5, 110, 47.5); rect(adro, 93, 29, 105, 55); disc(adro, 108, 42, 5)
plazas = mask()
for pl in (L.PRACA_LUZ, L.MERCADO, L.LARGO_PONTE, L.LARGO_SUL): poly(plazas, pl)
plazas = cv2.bitwise_or(plazas, cv2.bitwise_and(adro, cv2.bitwise_not(cathedral)))

# as ruas principais
streets_main = mask()
for pts, hw in L.MAIN: pline(streets_main, pts, 2 * hw)
# a rua da beira (anel por dentro da muralha) e o anel da cidade velha
def inset(pl, d):
    c = np.mean(pl, 0)
    return [tuple(c + (np.array(p) - c) * (1 - d / max(1e-6, np.linalg.norm(np.array(p) - c)))) for p in pl]
ring = pline(mask(), inset(L.OUT, 3.2), 1.4, closed=True)
ring_old = pline(mask(), inset(L.OLD, 2.4), 1.2, closed=True)
cas_ring = rect(mask(), cx0 - 2.2, cy0 - 2.2, cx1 + 2.2, cy1 + 2.2); cv2.subtract(cas_ring, castle, cas_ring)
cas_ring = cv2.bitwise_and(cas_ring, old)
# quem não ganha rua de bairro: o castelo, a catedral e o adro, as praças, o rio
keep_out = cv2.bitwise_or(cv2.bitwise_or(castle, adro), cv2.bitwise_or(plazas, embank))
cv2.dilate(keep_out, np.ones((3, 3), np.uint8), keep_out, iterations=max(1, int(S * 0.6)))

# ---- as ruas de bairro: as arestas de um Voronoi de sementes (mais apertadas no bairro pobre) ----
log('ruas de bairro')
ESP = {'velha': 10, 'escoadouro': 7, 'artesaos': 11, 'cais': 10, 'mercado': 11, 'nobre': 17, 'comum': 12}
def sementes(dentro_old):
    pts, tries = [], 0
    occ = []
    tree_pts = []
    cand = rng.random((60000, 2)) * (L.W, L.H)
    acc = []
    grid = {}
    for x, y in cand:
        if not L.dentro(L.OUT, x, y) or L.dentro(L.OLD, x, y) != dentro_old: continue
        b = L.bairro(x, y); r = ESP[b]
        gx, gy = int(x // 4), int(y // 4)
        ok = True
        for i in range(gx - 5, gx + 6):
            for j in range(gy - 5, gy + 6):
                for (px, py, pr) in grid.get((i, j), ()):
                    if (px - x) ** 2 + (py - y) ** 2 < (0.5 * (r + pr)) ** 2: ok = False; break
                if not ok: break
            if not ok: break
        if ok:
            acc.append((x, y)); grid.setdefault((gx, gy), []).append((x, y, r))
    return np.array(acc)
streets_sec = mask(); alleys = mask()
for inside in (True, False):
    sp = sementes(inside)
    far = np.array([(-500, -500), (800, -500), (-500, 800), (800, 800)])
    vor = Voronoi(np.r_[sp, far])
    m = mask()
    for (a, b) in vor.ridge_vertices:
        if a < 0 or b < 0: continue
        p, q = vor.vertices[a], vor.vertices[b]
        mx, my = (p + q) / 2
        bb = L.bairro(mx, my)
        w = 1.0 if bb == 'escoadouro' else 1.25 if bb in ('velha', 'cais') else 1.4
        pline(m, [p, q], w)
    lim = old if inside else cv2.bitwise_and(city, cv2.bitwise_not(old))
    m = cv2.bitwise_and(m, lim)
    streets_sec = cv2.bitwise_or(streets_sec, m)
streets_sec = cv2.bitwise_and(streets_sec, cv2.bitwise_not(keep_out))
streets_sec = cv2.bitwise_or(streets_sec, cv2.bitwise_or(ring, ring_old))
streets_sec = cv2.bitwise_or(streets_sec, cas_ring)
streets_sec = cv2.bitwise_and(streets_sec, cv2.bitwise_not(cv2.bitwise_or(castle, cv2.bitwise_or(cathedral, river))))
streets_main = cv2.bitwise_and(streets_main, cv2.bitwise_not(river))

# cais: a faixa de pedra na beira do rio, do sul da Ponte Grande ao muro
quay = mask()
pts_q = [(L.riox(y), y) for y in np.arange(104, 163, 1.0)]
pline(quay, pts_q, 2 * L.RHW + 5.0)
quay = cv2.bitwise_and(quay, cv2.bitwise_not(embank))
promen = cv2.bitwise_and(pline(mask(), L.RIV, 2 * L.RHW + 3.4), cv2.bitwise_not(embank))
quay = cv2.bitwise_or(quay, promen)
quay = cv2.bitwise_and(quay, city)

# as muralhas (faixas)
WALL_OUT, WALL_OLD, WALL_CAS = 1.25, 0.95, 1.0
wall_out = pline(mask(), L.OUT, WALL_OUT * 1.0, closed=True)
wall_old = pline(mask(), L.OLD, WALL_OLD, closed=True)
wall_cas = rect(mask(), cx0, cy0, cx1, cy1); cv2.subtract(wall_cas, rect(mask(), cx0 + WALL_CAS, cy0 + WALL_CAS, cx1 - WALL_CAS, cy1 - WALL_CAS), wall_cas)
walls_all = cv2.bitwise_or(wall_out, cv2.bitwise_or(wall_old, wall_cas))

# ================= 2) o chão onde se constrói e as casas =================
log('quadras')
pav = cv2.bitwise_or(cv2.bitwise_or(streets_main, streets_sec), cv2.bitwise_or(plazas, quay))
blocked = cv2.bitwise_or(cv2.bitwise_or(pav, embank), cv2.bitwise_or(walls_all, castle))
blocked = cv2.bitwise_or(blocked, adro)
land = cv2.bitwise_and(city, cv2.bitwise_not(blocked))
_, land = cv2.threshold(land, 127, 255, cv2.THRESH_BINARY)
# folga de meio quadrado junto das muralhas (o caminho de ronda)
wd = cv2.dilate(walls_all, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(S * 1.4) | 1, int(S * 1.4) | 1)))
land[wd > 0] = 0

# o bairro de cada ponto (numa grade grossa, 1 por quadrado)
BN = ['velha', 'escoadouro', 'artesaos', 'cais', 'mercado', 'nobre', 'comum']
bgrid = np.zeros((L.H, L.W), np.uint8)
for j in range(L.H):
    for i in range(L.W):
        bgrid[j, i] = BN.index(L.bairro(i + .5, j + .5))
bmap = cv2.resize(bgrid, (WP, HP), interpolation=cv2.INTER_NEAREST)
DEPTH = np.array([3.0, 2.2, 2.8, 3.6, 2.8, 3.4, 2.8], np.float32)     # fundo da casa por bairro (quadrados)
LOT = {'velha': 2.3, 'escoadouro': 1.7, 'artesaos': 2.4, 'cais': 3.6, 'mercado': 2.3, 'nobre': 4.2, 'comum': 2.5}

d = cv2.distanceTransform(land, cv2.DIST_L2, 5)
dep = DEPTH[bmap] * S
foot = ((d > 0) & (d < dep)).astype(np.uint8) * 255
# a segunda fileira, em manchas, nas quadras fundas (menos no bairro nobre: lá é jardim)
nz = noise(6, seed=31)
second = (d > dep + 1.2 * S) & (d < 2 * dep + 1.2 * S) & (nz > 0.45) & (bmap != 5)
foot[second] = 255
# no bairro pobre, quase tudo é casa
esc = (bmap == 1) & (d > 0) & (nz > 0.3)
foot[esc & (d < 3 * dep)] = 255
del dep, nz, second, esc

# os lotes: Voronoi de pontos na frente das quadras (as divisas ficam de través da rua)
log('lotes')
fr = ((d > 0.3 * S) & (d < 1.0 * S))
ys, xs = np.nonzero(fr[::max(1, int(S // 4)), ::max(1, int(S // 4))])
stp = max(1, int(S // 4))
cand = np.c_[xs * stp, ys * stp].astype(np.float32) / S
rng.shuffle(cand)
grid, lots = {}, []
for x, y in cand:
    b = BN[bgrid[min(L.H - 1, int(y)), min(L.W - 1, int(x))]]
    r = LOT[b] * (0.8 + 0.4 * rng.random())
    gx, gy = int(x // 3), int(y // 3); ok = True
    for i in range(gx - 2, gx + 3):
        for j in range(gy - 2, gy + 3):
            for (px, py, pr) in grid.get((i, j), ()):
                if (px - x) ** 2 + (py - y) ** 2 < (0.5 * (r + pr)) ** 2: ok = False; break
            if not ok: break
        if not ok: break
    if ok: lots.append((x, y)); grid.setdefault((gx, gy), []).append((x, y, r))
lots = np.array(lots)
# os pontos de dentro da quadra (segunda fileira e bairro pobre)
ys, xs = np.nonzero((d[::stp, ::stp] > 3.5 * S))
inner = np.c_[xs * stp, ys * stp].astype(np.float32) / S
rng.shuffle(inner)
for x, y in inner[:40000]:
    b = BN[bgrid[min(L.H - 1, int(y)), min(L.W - 1, int(x))]]
    r = LOT[b] * 1.1
    gx, gy = int(x // 3), int(y // 3); ok = True
    for i in range(gx - 2, gx + 3):
        for j in range(gy - 2, gy + 3):
            for (px, py, pr) in grid.get((i, j), ()):
                if (px - x) ** 2 + (py - y) ** 2 < (0.5 * (r + pr)) ** 2: ok = False; break
            if not ok: break
        if not ok: break
    if ok: lots = np.r_[lots, [(x, y)]]; grid.setdefault((gx, gy), []).append((x, y, r))
log('lotes:', len(lots))
cut = mask()
vor = Voronoi(np.r_[lots, [(-500, -500), (800, -500), (-500, 800), (800, 800)]])
for (a, b) in vor.ridge_vertices:
    if a < 0 or b < 0: continue
    pline(cut, [vor.vertices[a], vor.vertices[b]], max(1.2, S * 0.07) / S)
foot[cut > 60] = 0
del cut
# um lote ou outro fica vazio (o quintal, a passagem)
n, lab = cv2.connectedComponents(foot, connectivity=4)
keepl = rng.random(n) > 0.07
keepl[0] = False
small = np.bincount(lab.ravel(), minlength=n) < (0.9 * S) ** 2
keepl[small] = False
foot = (keepl[lab]).astype(np.uint8) * 255
# a cor de cada lote, pelo bairro
log('telhados:', n, 'lotes')
PAL = [  # (r,g,b)
    (82, 86, 98), (74, 78, 92), (94, 96, 104), (66, 70, 82),           # 0-3 ardósia
    (132, 84, 64), (118, 76, 60), (146, 98, 72), (108, 70, 56),         # 4-7 telha de barro gasta
    (104, 84, 62), (92, 74, 54),                                         # 8-9 tabuinha
    (112, 98, 70), (100, 88, 64), (120, 104, 74),                        # 10-12 sapé (velho, escuro)
    (70, 92, 98), (60, 80, 88),                                          # 13-14 cobre velho (verdete)
    (62, 66, 74),                                                        # 15 chumbo (catedral)
    (90, 90, 96),                                                        # 16 pedra (torres)
]
WB = {0: [0, 1, 2, 3, 0, 1, 4, 5, 13], 1: [10, 11, 12, 8, 9, 9, 5, 7], 2: [4, 5, 6, 7, 8, 4, 5, 1], 3: [8, 9, 3, 2, 5, 7],
      4: [4, 6, 5, 2, 0, 8], 5: [0, 1, 3, 13, 14, 4, 6], 6: [4, 5, 7, 8, 9, 1, 2, 6]}
comp_b = np.zeros(n, np.int32)
# o bairro de cada lote: o do primeiro pixel
idx = np.flatnonzero(lab.ravel())
first = np.full(n, -1, np.int64)
first[lab.ravel()[idx[::-1]]] = idx[::-1]
for k in range(1, n):
    if first[k] >= 0: comp_b[k] = bmap.ravel()[first[k]]
lotcol = np.array([rng.choice(WB[int(comp_b[k])]) for k in range(n)], np.uint8)
colidx = np.where(foot > 0, lotcol[lab], 255).astype(np.uint8)
del lab, idx, first, d

# ================= 3) os prédios especiais =================
log('especiais')
special = mask()
def sp(m, col):
    global special
    colidx[m > 127] = col
    special = cv2.bitwise_or(special, m)
# a catedral
sp(cathedral, 15)
# a torre do cruzeiro e as duas da fachada (pedra, mais altas: ficam por cima)
towers_sq = []      # (x0,y0,x1,y1)
towers_sq += [(96, 39, 102, 45), (77.4, 35.4, 82.4, 40.4), (77.4, 43.6, 82.4, 48.6)]
# o castelo: a torre de menagem, o paço, o quartel, o estábulo, a capela
kx0, ky0, kx1, ky1 = L.KEEP
sp(rect(mask(), 172.5, 24, 180, 39), 0)          # paço
sp(rect(mask(), 147, 48.5, 161, 54), 7)          # quartel
sp(rect(mask(), 147, 24.5, 153.5, 31), 8)         # estábulo
sp(rect(mask(), 166, 47, 171, 52), 2)            # capela do castelo
towers_sq += [(kx0, ky0, kx1, ky1)]
cas_towers = [(cx0, cy0), (cx1, cy0), (cx0, cy1), (cx1, cy1)]
# o templo da Luz, a ferraria real, os armazéns dos cais (compridos)
sp(rect(mask(), *L.TEMPLO), 13)
sp(rect(mask(), 149.5, 63, 157, 68), 9)
# a casa do mercado (prédio no meio da praça) e os armazéns
sp(rect(mask(), 148, 96.5, 158, 100.5), 4)
special = cv2.bitwise_and(special, cv2.bitwise_not(cv2.bitwise_or(streets_main, river)))
foot = cv2.bitwise_or(foot, special)

# ================= 4) o chão =================
log('chão')
cv = np.zeros((HP, WP, 3), np.float32)
paint(cv, np.full((HP, WP), 255, np.uint8), TX['grama_escura'])
yard = cv2.bitwise_and(city, cv2.bitwise_not(pav))
nz = noise(2.5, seed=41)
gm = ((nz > 0.52) * 255).astype(np.uint8)
paint(cv, yard, TX['terra'])
paint(cv, cv2.bitwise_and(yard, gm), TX['grama'], 0.85)
jard = cv2.bitwise_and(yard, ((bmap == 5) * 255).astype(np.uint8))
paint(cv, jard, TX['jardim'])
del nz, gm
# o pátio do castelo
inner_cas = rect(mask(), cx0 + 1, cy0 + 1, cx1 - 1, cy1 - 1)
paint(cv, inner_cas, TX['patio'])
treino = rect(mask(), 162.5, 53, 180, 58.5)
paint(cv, treino, TX['terra'])
jcas = rect(mask(), 155, 24.5, 171, 29)
paint(cv, jcas, TX['jardim'])
# as ruas
esc_m = ((bmap == 1) * 255).astype(np.uint8)
paint(cv, streets_sec, TX['rua'])
paint(cv, cv2.bitwise_and(streets_sec, esc_m), TX['lama'])
paint(cv, streets_main, TX['rua_grande'])
paint(cv, quay, TX['cais'])
paint(cv, plazas, TX['praca'])
del esc_m

# a água
log('rio')
paint(cv, embank, TX['muro'])
paint(cv, river, TX['agua'])
# as margens escuras e os reflexos
rv = cv2.GaussianBlur(river, (0, 0), S * 0.6)
edge = (river.astype(np.float32) - rv.astype(np.float32)).clip(0) / 255
dark = 1 - 0.5 * cv2.GaussianBlur(cv2.subtract(river, cv2.erode(river, np.ones((3, 3), np.uint8), iterations=max(1, int(S * 0.5)))), (0, 0), S * 0.4).astype(np.float32) / 255
mul(cv, np.where(river > 0, dark, 1).astype(np.float32))
del rv, edge, dark
# as ondinhas
rip = mask()
for k in range(int(L.H * 2.2)):
    y = rng.random() * L.H; x = L.riox(y) + (rng.random() - .5) * 2 * (L.RHW - 1)
    pline(rip, [(x - .6, y), (x, y - .12), (x + .6, y)], 0.06, 150)
rip = cv2.bitwise_and(rip, river)
paint(cv, rip, (120, 150, 160), 0.35)

# ================= 5) a sombra de tudo o que é alto =================
log('sombras')
tall = cv2.bitwise_or(foot, walls_all)
for (a, b, c2, d2) in towers_sq: rect(tall, a, b, c2, d2)
shadow = np.zeros((HP, WP), np.float32)
sombra(tall, .42, .55, .18, .42)

# ================= 6) os telhados =================
log('telhados: altura')
hgt = cv2.distanceTransform(foot, cv2.DIST_L2, 5)
gx = cv2.Sobel(hgt, cv2.CV_32F, 1, 0, ksize=3) / 8
gy = cv2.Sobel(hgt, cv2.CV_32F, 0, 1, ksize=3) / 8
mag = np.sqrt(gx * gx + gy * gy) + 1e-4
shade = (gx + gy) / (1.4142 * mag)
del gx, gy
course = max(2.0, 0.12 * S)
fr_ = (hgt / course) % 1.0
lines = np.where(fr_ < 0.22, 0.80, 1.0).astype(np.float32)
del fr_
ridge = np.where(mag < 0.55, 1.08, 1.0)
eave = np.clip(hgt / max(1.0, S * 0.05), 0.55, 1.0)
k = (0.80 + 0.26 * shade) * lines * ridge * eave
del shade, lines, ridge, mag
nn = np.random.default_rng(5).normal(1, 0.03, (HP, WP)).astype(np.float32)
k *= nn; del nn
palarr = np.array(PAL + [(0, 0, 0)] * (256 - len(PAL)), np.float32)
for r0 in range(0, HP, CH):
    r1 = min(HP, r0 + CH)
    m = foot[r0:r1] > 0
    if not m.any(): continue
    base = palarr[colidx[r0:r1]]
    # a variação de cor dentro do mesmo telhado (o desgaste)
    c = base * k[r0:r1, :, None]
    a = (foot[r0:r1].astype(np.float32) / 255)[..., None]
    cv[r0:r1] = cv[r0:r1] * (1 - a) + c * a
del k, hgt
# o contorno escuro dos telhados
ed = cv2.subtract(foot, cv2.erode(foot, np.ones((3, 3), np.uint8)))
paint(cv, ed, (28, 26, 26), 0.6)
del ed

# chaminés
ys, xs = np.nonzero((foot[::int(S), ::int(S)] > 0) & (cv2.dilate(special, np.ones((3, 3), np.uint8), iterations=int(S * .6))[::int(S), ::int(S)] == 0))
for j in rng.choice(len(xs), size=min(len(xs), int(len(xs) * 0.12)), replace=False):
    x, y = xs[j] + .2, ys[j] + .2
    with roi(x, y, x + .4, y + .4, .5):
        m = rect(mask(), x, y, x + .38, y + .38)
        sombra(m, .12, .16, .05, .4)
        paint(cv, m, (70, 64, 60)); paint(cv, rect(mask(), x + .09, y + .09, x + .29, y + .29), (25, 22, 22))

# ================= 7) as torres quadradas (catedral e menagem) =================
log('torres')
def torre_quadrada(*a, **k):
    with roi(a[0], a[1], a[2], a[3], 2.5): _torre_quadrada(*a, **k)
def _torre_quadrada(x0, y0, x1, y1, telhado=None):
    m = rect(mask(), x0, y0, x1, y1)
    sombra(m, 0.9, 1.1, 0.25, 0.45)
    paint(cv, m, TX['muro'])
    if telhado is not None:
        # telhado de pirâmide
        h = cv2.distanceTransform(m, cv2.DIST_L2, 5)
        gx = cv2.Sobel(h, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(h, cv2.CV_32F, 0, 1, ksize=3)
        sh2 = (gx + gy) / (np.sqrt(gx * gx + gy * gy) * 1.414 + 1e-4)
        col = np.array(telhado, np.float32)[None, None] * (0.82 + 0.28 * sh2)[..., None]
        lines = np.where(((h / max(2, 0.12 * S)) % 1) < 0.2, 0.82, 1.0)
        col *= lines[..., None]
        paint(cv, m, _full(col))
    else:
        inn = rect(mask(), x0 + .55, y0 + .55, x1 - .55, y1 - .55)
        paint(cv, inn, TX['praca'] if (x1 - x0) > 6 else TX['muro_topo'])
        # as ameias
        mer = mask()
        step = 0.7
        for t in np.arange(x0 + .15, x1 - .3, step):
            rect(mer, t, y0 + .05, t + .38, y0 + .45); rect(mer, t, y1 - .45, t + .38, y1 - .05)
        for t in np.arange(y0 + .15, y1 - .3, step):
            rect(mer, x0 + .05, t, x0 + .45, t + .38); rect(mer, x1 - .45, t, x1 - .05, t + .38)
        paint(cv, mer, (118, 118, 124))
    paint(cv, cv2.subtract(m, cv2.erode(m, np.ones((3, 3), np.uint8), iterations=max(1, int(S * .04)))), (26, 26, 30), .8)
for i, t in enumerate(towers_sq):
    torre_quadrada(*t, telhado=(64, 68, 76) if i < 3 else None)

# ================= 8) as muralhas, as torres redondas e os portões =================
log('muralhas')
def gaps_for(gates, w):
    g = mask()
    for (x, y), _ in gates: disc(g, x, y, w)
    return g
gate_gap_out = gaps_for(L.GATES_OUT, 1.6)
gate_gap_old = gaps_for(L.GATES_OLD, 1.4)
gate_gap_cas = mask()
for (x, y), lado in L.GATE_CAS: disc(gate_gap_cas, x, y, 1.3)
# a passagem do rio: a muralha continua, com a grade por baixo (desenhada como arco escuro)
def muralha(pl, w, gaps, closed=True, outward=True):
    band = pline(mask(), pl, w, closed=closed)
    band = cv2.bitwise_and(band, cv2.bitwise_not(gaps))
    paint(cv, band, TX['muro'])
    walk = pline(mask(), pl, w * 0.42, closed=closed)
    walk = cv2.bitwise_and(walk, cv2.bitwise_not(gaps))
    paint(cv, walk, TX['muro_topo'])
    # as ameias, do lado de fora
    mer = mask()
    pts = list(pl) + ([pl[0]] if closed else [])
    cxy = np.mean(pl, 0)
    for a, b in zip(pts, pts[1:]):
        a, b = np.array(a, float), np.array(b, float)
        ln = np.linalg.norm(b - a); u = (b - a) / ln; nrm = np.array([-u[1], u[0]])
        mid = (a + b) / 2
        if np.dot(mid + nrm - cxy, mid + nrm - cxy) < np.dot(mid - nrm - cxy, mid - nrm - cxy): nrm = -nrm
        off = nrm * (w * 0.5 - 0.17)
        for t in np.arange(0.3, ln - 0.3, 0.62):
            p0 = a + u * t + off
            pline(mer, [p0, p0 + u * 0.34], 0.26)
        offi = -nrm * (w * 0.5 - 0.1)
        pline(mer, [a + offi, b + offi], 0.12, 160)
    mer = cv2.bitwise_and(mer, cv2.bitwise_not(gaps))
    paint(cv, mer, (122, 122, 128))
    e = cv2.subtract(band, cv2.erode(band, np.ones((3, 3), np.uint8), iterations=max(1, int(S * .04))))
    paint(cv, e, (24, 24, 28), .85)
    return band
def torre_redonda(x, y, r):
    with roi(x - r, y - r, x + r, y + r, 1.5): _torre_redonda(x, y, r)
def _torre_redonda(x, y, r):
    m = disc(mask(), x, y, r)
    sombra(m, 0.55, 0.7, 0.2, 0.45)
    paint(cv, m, TX['muro'])
    paint(cv, disc(mask(), x, y, r * 0.72), TX['muro_topo'])
    mer = mask()
    for a in np.arange(0, 2 * math.pi, 2 * math.pi / max(10, int(r * 8))):
        p0 = (x + math.cos(a) * (r - .22), y + math.sin(a) * (r - .22))
        p1 = (x + math.cos(a + .18) * (r - .22), y + math.sin(a + .18) * (r - .22))
        pline(mer, [p0, p1], 0.28)
    paint(cv, mer, (124, 124, 130))
    paint(cv, cv2.subtract(m, cv2.erode(m, np.ones((3, 3), np.uint8), iterations=max(1, int(S * .04)))), (24, 24, 28), .85)
    # um alçapão de madeira no meio
    paint(cv, disc(mask(), x - r * .2, y - r * .2, r * 0.18), (78, 58, 40))

def torres_ao_longo(pl, cada, r, gates, closed=True):
    pts = list(pl) + ([pl[0]] if closed else [])
    out = []
    for a in pl: out.append(a)
    for a, b in zip(pts, pts[1:]):
        a, b = np.array(a, float), np.array(b, float); ln = np.linalg.norm(b - a)
        k = int(ln // cada)
        for i in range(1, k + 1):
            out.append(tuple(a + (b - a) * i / (k + 1)))
    res = []
    for p in out:
        if any(math.dist(p, g) < 5 for g, _ in gates): continue
        if abs(p[0] - L.riox(p[1])) < L.RHW + 1.5: continue
        res.append(p)
    return res
def gatehouse(x, y, pl, r):
    # direção da muralha naquele ponto
    best = None
    pts = list(pl) + [pl[0]]
    for a, b in zip(pts, pts[1:]):
        a, b = np.array(a, float), np.array(b, float); u = (b - a) / np.linalg.norm(b - a)
        t = np.clip(np.dot(np.array((x, y)) - a, u), 0, np.linalg.norm(b - a)); q = a + u * t
        dd = np.linalg.norm(q - (x, y))
        if best is None or dd < best[0]: best = (dd, u)
    u = best[1]
    for s in (-1, 1):
        torre_redonda(x + u[0] * s * (r + 1.5), y + u[1] * s * (r + 1.5), r)
    # a soleira e a grade levantada (uma faixa de pedra escura de través)
    nrm = np.array([-u[1], u[0]])
    m = pline(mask(), [(x - u[0] * 1.4, y - u[1] * 1.4), (x + u[0] * 1.4, y + u[1] * 1.4)], 0.3)
    paint(cv, m, (48, 44, 40), .8)

band_out = muralha(L.OUT, WALL_OUT, gate_gap_out)
band_old = muralha(L.OLD, WALL_OLD, gate_gap_old)
castle_pl = [(cx0, cy0), (cx1, cy0), (cx1, cy1), (cx0, cy1)]
band_cas = muralha(castle_pl, WALL_CAS, gate_gap_cas)
# as grades do rio (onde o rio passa pela muralha)
for pl, w in ((L.OUT, WALL_OUT), (L.OLD, WALL_OLD)):
    bm = cv2.bitwise_and(pline(mask(), pl, w + .2, closed=True), river)
    paint(cv, bm, (30, 30, 34), 0.9)
    gr = mask()
    for y in (4, 166, 11.3, 90.3):
        x = L.riox(y)
        for t in np.arange(-L.RHW + .3, L.RHW, .5): pline(gr, [(x + t, y - .6), (x + t, y + .6)], .1)
    gr = cv2.bitwise_and(gr, bm)
    paint(cv, gr, (110, 104, 96), .9)
for p in torres_ao_longo(L.OUT, 20, 1.55, L.GATES_OUT): torre_redonda(p[0], p[1], 1.55)
for p in torres_ao_longo(L.OLD, 16, 1.25, L.GATES_OLD): torre_redonda(p[0], p[1], 1.25)
for (x, y), _ in L.GATES_OUT: gatehouse(x, y, L.OUT, 1.45)
for (x, y), _ in L.GATES_OLD: gatehouse(x, y, L.OLD, 1.15)
for (x, y) in cas_towers: torre_quadrada(x - 2, y - 2, x + 2, y + 2)
for (x, y), lado in L.GATE_CAS:
    if lado == 'w': torre_quadrada(x - 1.2, y - 3.6, x + 1.2, y - 1.4); torre_quadrada(x - 1.2, y + 1.4, x + 1.2, y + 3.6)
    else: torre_quadrada(x - 3.6, y - 1.2, x - 1.4, y + 1.2); torre_quadrada(x + 1.4, y - 1.2, x + 3.6, y + 1.2)

# ================= 9) as pontes =================
log('pontes')
for (y, hw, nome, mat) in L.BRIDGES:
    x = L.riox(y); x0, x1 = x - L.RHW - 1.6, x + L.RHW + 1.6
    rb = roi(x0, y - hw - 1, x1, y + hw + 1, 1.5); rb.__enter__()
    m = rect(mask(), x0, y - hw, x1, y + hw)
    sombra(m, .3, .5, .2, .5)
    if mat == 'pedra':
        paint(cv, m, TX['rua_grande'])
        par = cv2.bitwise_or(rect(mask(), x0, y - hw, x1, y - hw + .35), rect(mask(), x0, y + hw - .35, x1, y + hw))
        paint(cv, par, TX['muro']); paint(cv, cv2.subtract(par, cv2.erode(par, np.ones((3, 3), np.uint8))), (24, 24, 28), .8)
        # os talha-mares (as pontas de pedra contra a corrente)
        for t in np.linspace(x - L.RHW + 1.4, x + L.RHW - 1.4, 3):
            tri = poly(mask(), [(t - .45, y - hw), (t + .45, y - hw), (t, y - hw - .9)])
            paint(cv, tri, TX['muro'])
    else:
        paint(cv, m, (92, 70, 48))
        pl_ = mask()
        for t in np.arange(x0, x1, .3): pline(pl_, [(t, y - hw), (t, y + hw)], .05)
        paint(cv, pl_, (52, 38, 26), .7)
        par = cv2.bitwise_or(rect(mask(), x0, y - hw, x1, y - hw + .2), rect(mask(), x0, y + hw - .2, x1, y + hw))
        paint(cv, par, (64, 46, 30))
    rb.__exit__()

# ================= 10) os detalhes: píeres, barcos, barracas, estátua, fontes =================
log('detalhes')
# píeres de madeira e barcos, nos cais
for y in np.arange(110, 160, 6.5):
    for side in (-1, 1):
        if rng.random() < 0.3: continue
        x = L.riox(y) + side * (L.RHW + 0.2)
        x2 = x - side * 2.2
        rb = roi(min(x, x2) - 3, y - 1, max(x, x2) + 3, y + 3, 1); rb.__enter__()
        m = rect(mask(), min(x, x2), y, max(x, x2), y + .8)
        sombra(m, .15, .3, .12, .4)
        paint(cv, m, (96, 74, 50))
        pl_ = mask()
        for t in np.arange(min(x, x2), max(x, x2), .22): pline(pl_, [(t, y), (t, y + .8)], .04)
        paint(cv, pl_, (54, 40, 28), .6)
        if rng.random() < 0.75:
            bx, by = x2 + side * 0.3 - side * 1.0, y + 1.6 + rng.random() * .4
            bl = 2.2 + rng.random() * 1.6
            hull = mask(); cv2.ellipse(hull, (int((bx * S - RX0) * K), int((by * S - RY0) * K)), (int(bl / 2 * S * K), int(.55 * S * K)), 90 if False else 0, 0, 360, 255, -1, cv2.LINE_AA, SH)
            sombra(hull, .15, .25, .1, .4)
            paint(cv, hull, (74, 52, 34))
            inn = mask(); cv2.ellipse(inn, (int((bx * S - RX0) * K), int((by * S - RY0) * K)), (int((bl / 2 - .25) * S * K), int(.36 * S * K)), 0, 0, 360, 255, -1, cv2.LINE_AA, SH)
            paint(cv, inn, (112, 86, 58))
            bancos = mask()
            for t in (-bl * .2, bl * .15): pline(bancos, [(bx + t, by - .35), (bx + t, by + .35)], .12)
            paint(cv, cv2.bitwise_and(bancos, inn), (70, 50, 32))
        rb.__exit__()
# as barracas do mercado (toldos listrados)
CORES = [((150, 60, 48), (210, 196, 168)), ((52, 92, 118), (210, 196, 168)), ((176, 136, 60), (110, 48, 42)), ((80, 112, 60), (210, 196, 168)), ((120, 50, 60), (200, 176, 120))]
def barraca(x, y, w, h):
    with roi(x, y, x + w, y + h, .6): _barraca(x, y, w, h)
def _barraca(x, y, w, h):
    c1, c2 = CORES[rng.integers(len(CORES))]
    m = rect(mask(), x, y, x + w, y + h)
    sombra(m, .12, .2, .08, .45)
    for s in range(5):
        paint(cv, rect(mask(), x + s * w / 5, y, x + (s + 1) * w / 5, y + h), c1 if s % 2 == 0 else c2)
    mul(cv, np.where(rect(mask(), x, y + h / 2, x + w, y + h) > 0, 0.85, 1).astype(np.float32))
for x in np.arange(138, 170, 2.2):
    for y in np.arange(94.5, 111, 2.0):
        if 146 < x < 160 and 95 < y < 102.5: continue
        if rng.random() < 0.72: barraca(x + rng.random() * .3, y + rng.random() * .3, 1.4, 1.05)
for x in np.arange(147.5, 159, 2.2):
    for y in (142, 145.5):
        if rng.random() < 0.6: barraca(x, y, 1.4, 1.0)
# a estátua do fundador na Praça da Luz e as fontes
def fonte(x, y, r, estatua=False):
    with roi(x - r, y - r, x + r, y + r, 1): _fonte(x, y, r, estatua)
def _fonte(x, y, r, estatua=False):
    m = disc(mask(), x, y, r)
    sombra(m, .15, .2, .1, .35)
    paint(cv, m, TX['muro'])
    if estatua:
        paint(cv, disc(mask(), x, y, r * .78), TX['muro_topo'])
        paint(cv, rect(mask(), x - r * .35, y - r * .35, x + r * .35, y + r * .35), (110, 108, 112))
        paint(cv, disc(mask(), x, y, r * .22), (150, 142, 120))      # o bronze
    else:
        paint(cv, disc(mask(), x, y, r * .78), (48, 76, 92))
        paint(cv, disc(mask(), x, y, r * .2), TX['muro'])
fonte(96, 62.5, 2.0, True)
fonte(104, 100, 1.1)
fonte(153, 146, 0.9)
fonte(165, 33, 0.0001) if False else None
# os bonecos do pátio de treino
for i in range(5):
    bx = 165 + i * 3; by = 55.5
    with roi(bx - 1, by - 1, bx + 1, by + 1, .5):
        pline_ = pline(mask(), [(bx - .5, by), (bx + .5, by)], .14); paint(cv, pline_, (70, 50, 32))
        paint(cv, disc(mask(), bx, by, .3), (176, 150, 100))

# ================= 11) as árvores =================
log('árvores')
def arvore(x, y, r, cor):
    with roi(x - r, y - r, x + r, y + r, 1.2 * r + .5): _arvore(x, y, r, cor)
def _arvore(x, y, r, cor):
    m = disc(mask(), x, y, r)
    sombra(m, .45 * r, .55 * r, .15 * r, .45)
    base = np.array(cor, np.float32)
    paint(cv, m, tuple(base * .72))
    for k in range(6):
        a = rng.random() * 2 * math.pi; rr = r * (.35 + rng.random() * .3)
        paint(cv, disc(mask(), x + math.cos(a) * r * .38, y + math.sin(a) * r * .38, rr), tuple(base * (.85 + rng.random() * .15)))
    paint(cv, disc(mask(), x - r * .25, y - r * .28, r * .38), tuple(np.minimum(base * 1.25, 255)))
GREENS = [(58, 86, 52), (52, 78, 50), (66, 92, 56), (48, 70, 46)]
# onde cabem: quintais sem casa, jardins nobres, adro, jardim do castelo, fora dos muros
yard_t = cv2.bitwise_and(yard, cv2.bitwise_not(cv2.bitwise_or(cv2.bitwise_or(embank, castle), cv2.bitwise_or(adro, quay))))
free = cv2.bitwise_and(yard_t, cv2.bitwise_not(cv2.dilate(foot, np.ones((3, 3), np.uint8), iterations=int(S * .5))))
free = cv2.bitwise_and(free, cv2.bitwise_not(cv2.dilate(walls_all, np.ones((3, 3), np.uint8), iterations=int(S * 1))))
small = cv2.resize(free, (L.W * 2, L.H * 2), interpolation=cv2.INTER_AREA)
ys, xs = np.nonzero(small > 250)
order = rng.permutation(len(xs))
placed = []
pt = cKDTree(np.zeros((1, 2)) - 999)
cnt = 0
taken = np.zeros_like(small)
for j in order:
    x, y = xs[j] / 2 + .25, ys[j] / 2 + .25
    b = BN[bgrid[min(L.H - 1, int(y)), min(L.W - 1, int(x))]]
    pr = {'nobre': .55, 'velha': .25, 'artesaos': .2, 'comum': .2, 'escoadouro': .08, 'cais': .1, 'mercado': .1}[b]
    if rng.random() > pr: continue
    if taken[ys[j], xs[j]]: continue
    r = .7 + rng.random() * .7
    cv2.circle(taken, (xs[j], ys[j]), int(r * 2 + 1), 1, -1)
    arvore(x, y, r, GREENS[rng.integers(4)])
    cnt += 1
# as árvores do jardim do castelo e do adro, alinhadas
for x in np.arange(156.5, 171, 2.6): arvore(x, 26.7, .9, GREENS[0])
for y in (56.5, 69):
    for x in np.arange(83, 111, 4.5): arvore(x, y, .8, GREENS[2])
# fora dos muros: só uma franja de mato
out = cv2.bitwise_not(cv2.dilate(city, np.ones((3, 3), np.uint8), iterations=int(S * 1.6)))
small = cv2.resize(out, (L.W, L.H), interpolation=cv2.INTER_AREA)
ys, xs = np.nonzero(small > 250)
for j in rng.permutation(len(xs))[:int(len(xs) * .07)]:
    arvore(xs[j] + rng.random(), ys[j] + rng.random(), .8 + rng.random() * .6, GREENS[3])
log('árvores:', cnt)

# ================= 12) os lampiões (as luzes quentes da Fortaleza) =================
log('lampiões')
glow = np.zeros((HP, WP), np.float32)
lamps = []
for pts, hw in L.MAIN:
    for a, b in zip(pts, pts[1:]):
        a, b = np.array(a, float), np.array(b, float); ln = np.linalg.norm(b - a)
        u = (b - a) / max(ln, 1e-6); nrm = np.array([-u[1], u[0]])
        for t in np.arange(3, ln, 9):
            p = a + u * t + nrm * (hw + .1) * (1 if int(t) % 2 else -1)
            if L.dentro(L.OUT, *p) and not abs(p[0] - L.riox(p[1])) < L.RHW + .5: lamps.append(p)
for pl in (L.PRACA_LUZ, L.MERCADO):
    for p in pl: lamps.append(np.array(p) + (np.mean(pl, 0) - p) * .06)
for p in lamps:
    cv2.circle(glow, (int(p[0] * S), int(p[1] * S)), max(1, int(S * .9)), 1.0, -1)
glow = cv2.GaussianBlur(glow, (0, 0), S * .7)
glow = np.clip(glow * 1.6, 0, 1)
for r0 in range(0, HP, CH):
    r1 = min(HP, r0 + CH); g = glow[r0:r1, :, None]
    cv[r0:r1] = cv[r0:r1] * (1 + g * np.array([0.55, 0.32, 0.08], np.float32)) + g * np.array([26, 14, 2], np.float32)
del glow
for p in lamps:
    with roi(p[0] - .3, p[1] - .3, p[0] + .3, p[1] + .3, .3):
        paint(cv, disc(mask(), p[0], p[1], .2), (40, 32, 24)); paint(cv, disc(mask(), p[0], p[1], .12), (255, 214, 140))

# ================= 13) o acabamento: o tom cinzento e a vinheta =================
log('acabamento')
for r0 in range(0, HP, CH):
    r1 = min(HP, r0 + CH)
    c = cv[r0:r1]
    g = c.mean(axis=2, keepdims=True)
    c[:] = g + (c - g) * 0.82                   # um pouco menos de cor
    c[:] = c * np.array([0.97, 0.98, 1.03], np.float32)
yy = (np.arange(HP, dtype=np.float32) / HP - .5)[:, None]
xx = (np.arange(WP, dtype=np.float32) / WP - .5)[None, :]
for r0 in range(0, HP, CH):
    r1 = min(HP, r0 + CH)
    v = 1 - 0.28 * np.clip((np.sqrt(xx ** 2 + yy[r0:r1] ** 2) - .32) / .4, 0, 1)
    cv[r0:r1] *= v[..., None]
img = np.clip(cv, 0, 255).astype(np.uint8)[..., ::-1]
del cv
if OUTF.endswith('.webp'): cv2.imwrite(OUTF, img, [cv2.IMWRITE_WEBP_QUALITY, 84])
elif OUTF.endswith('.jpg'): cv2.imwrite(OUTF, img, [cv2.IMWRITE_JPEG_QUALITY, 88])
else: cv2.imwrite(OUTF, img)
log('pronto', OUTF, img.shape)
