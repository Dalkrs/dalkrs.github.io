"""Mercado da Coroa (Hemvria) — mapa ampliado para a noite do Festival das Lanternas, para missão de furtividade.
1 quadrado = 1,5 m. 170 x 104 quadrados (255 m x 156 m). Sem tokens: tudo pintado no fundo.
Pedidos do Bruno: escadarias que descem aos porões dos prédios, um canto com acúmulo de barris e um painel de ferro."""
import sys, math
import numpy as np, cv2
import motor as M

W, H = 170, 104
PRACA = [(32, 17), (158, 18.5), (162, 85), (34, 87)]
CASA = (70, 32, 104, 47)
POSTO = (138, 22, 148, 30)
TORRE = (124, 42)
PALCO = (40, 58, 58, 72)
FONTE = (112, 63, 3.0)
TENDAS = [(128, 60, 140, 70, (120, 40, 52), (200, 176, 120)), (142, 67, 154, 79, (44, 60, 100), (210, 196, 168))]
QUINTAL = (60, 2.5, 76, 10)            # o canto dos barris (pátio sem saída atrás da fileira norte)
PORAOES = [((90, 28.4, 98, 31.4), 'l'), ((101, 84.2, 105, 88.0), 's'), ((60.6, 3.2, 63.8, 9.4), 'n'), ((24, 51.6, 31, 54.6), 'o'), ((164.5, 56, 167.5, 62), 's')]
PAINEL = (140.4, 30.0, 145.6, 31.1)
RUAS = [(8, 0, 12, 104), (12, 42, 34, 50), (118, 0, 128, 19), (50, 0, 54, 17.5), (158, 44, 170, 54), (86, 86, 96, 104),
        (44, 86.5, 47.5, 104), (130, 84.5, 133.5, 104), (12, 0, 170, 2.6), (12, 101.4, 170, 104), (66, 9.5, 70, 17.5)]


def casas_em_linha(x0, x1, y0, y1, horizontal=True, rng=None, wmin=7, wmax=13):
    out = []; t = x0 if horizontal else y0; fim = x1 if horizontal else y1
    while t < fim - 3:
        w = min(fim - t, wmin + rng.random() * (wmax - wmin))
        if fim - (t + w) < wmin * .6: w = fim - t
        out.append((t, y0, t + w, y1) if horizontal else (x0, t, x1, t + w))
        t += w
    return out


def pintar(S=12, out='mercado_prev.png', previa=None):
    M.setup(W, H, S, seed=4242, fundo=(60, 62, 60))
    M.texturas_padrao()
    M.stone('praca', .55, (104, 102, 104), 12, (44, 44, 48), 3, 1.2)
    M.planks('madeira', (112, 82, 54), .2, 71)
    M.planks('madeira_esc', (86, 62, 42), .18, 72)
    M.log('traçado')
    r = M.rng
    rio = M.rect(M.mask(), -1, -1, 6.5, H + 1)
    cais = M.rect(M.mask(), 6.5, -1, 8.2, H + 1)
    ponte = M.rect(M.mask(), -1, 41, 12, 51)
    praca = M.poly(M.mask(), PRACA)
    ruas = M.mask()
    for q in RUAS: M.rect(ruas, *q)
    quintal = M.rect(M.mask(), *QUINTAL)
    # ---------- os prédios ----------
    casas = []
    casas += casas_em_linha(12, 50, 2.6, 16, rng=r) + casas_em_linha(54, 60, 2.6, 16, rng=r)
    casas += [(60, 10, 66, 16), (70, 10, 76, 16)] + casas_em_linha(76, 118, 2.6, 16, rng=r) + casas_em_linha(128, 158, 2.6, 16.5, rng=r)
    casas += casas_em_linha(158, 170, 2.6, 44, horizontal=False, rng=r, wmin=8, wmax=12) + casas_em_linha(158.5, 170, 54, 101.4, horizontal=False, rng=r, wmin=8, wmax=12)
    casas += casas_em_linha(12, 32, 2.6, 42, horizontal=False, rng=r, wmin=8, wmax=11)
    casas += [(12, 50, 32, 66)] + casas_em_linha(12, 33, 66, 101.4, horizontal=False, rng=r, wmin=8, wmax=11)
    casas += casas_em_linha(33, 44, 88, 101.4, rng=r) + casas_em_linha(47.5, 86, 88, 101.4, rng=r) + casas_em_linha(96, 130, 87.5, 101.4, rng=r) + casas_em_linha(133.5, 158.5, 86, 101.4, rng=r)
    foot = M.mask(); colidx = np.full((M.HP, M.WP), 255, np.uint8)
    PAL = [(132, 84, 64), (118, 76, 60), (146, 98, 72), (108, 70, 56), (82, 86, 98), (74, 78, 92), (94, 96, 104), (104, 84, 62)]
    for k, (a, b, c, d) in enumerate(casas):
        m = M.rect(M.mask(), a + .12, b + .12, c - .12, d - .12)
        foot = M.OR(foot, m); colidx[m > 127] = r.choice([0, 1, 2, 3, 0, 1, 4, 5, 6, 7])
    for (a, b, c, d), col in ((CASA, 0), (POSTO, 4)):
        m = M.rect(M.mask(), a, b, c, d); foot = M.OR(foot, m); colidx[m > 127] = col
    foot = M.SUB(foot, M.OR(ruas, quintal))

    # ---------- o chão ----------
    M.log('chão')
    M.paint(M.NOT(rio), 'terra')
    M.paint(praca, 'praca')
    M.paint(ruas, 'rua'); M.paint(M.rect(M.mask(), 12, 42, 34, 50), 'rua_grande')
    M.paint(M.OR(M.rect(M.mask(), 12, 0, 170, 2.6), M.rect(M.mask(), 12, 101.4, 170, 104), M.rect(M.mask(), 44, 86.5, 47.5, 104), M.rect(M.mask(), 130, 84.5, 133.5, 104)), 'lama')
    M.paint(quintal, 'terra'); M.paint(M.rect(M.mask(), 66, 9.5, 70, 17.5), 'lama')
    # água e o cais
    M.agua(rio, 'agua'); M.ondas(rio, 140, 1.2, .1)
    M.paint(cais, 'muro'); M.paint(M.borda(cais, .1), (26, 26, 30), .8)
    # sujeira e poças nos becos
    becos = M.OR(M.rect(M.mask(), 12, 0, 170, 2.6), M.rect(M.mask(), 12, 101.4, 170, 104), quintal)
    M.paint(M.AND(becos, ((M.noise(1.2, seed=5) > .7) * 255).astype(np.uint8)), (40, 46, 52), .6)

    # ---------- a sombra e os telhados ----------
    M.log('telhados')
    M.sombra(foot, .6, .8, .2, .5)
    M.telhados(foot, colidx, PAL, course=.08)
    # claraboias e alçapões nos telhados (entrada por cima)
    for (a, b, c, d) in casas[::3]:
        x, y = a + (c - a) * (.25 + .5 * r.random()), b + (d - b) * (.3 + .4 * r.random())
        with M.roi(x, y, x + 1.2, y + 1.2, .5):
            m = M.rect(M.mask(), x, y, x + 1.1, y + 1.1); M.sombra(m, .1, .14, .05, .5); M.paint(m, 'madeira_esc'); M.paint(M.borda(m), (24, 20, 18), .9)
    M.chamines(foot, M.mask(), .02, (70, 64, 60))
    # a casa do mercado: arcada no térreo (pilares) aparecendo na beirada sul
    cx0, cy0, cx1, cy1 = CASA
    for x in np.arange(cx0 + 1.5, cx1 - 1, 3.2):
        with M.roi(x, cy1, x + 1, cy1 + 1.5, .5):
            p = M.rect(M.mask(), x - .4, cy1, x + .4, cy1 + .9); M.sombra(p, .15, .2, .05, .5); M.paint(p, 'muro')

    # ---------- a ponte ----------
    M.paint(ponte, 'rua_grande')
    par = M.OR(M.rect(M.mask(), -1, 41, 12, 41.8), M.rect(M.mask(), -1, 50.2, 12, 51))
    M.sombra(ponte, .3, .5, .2, .5, onde=rio)
    M.paint(par, 'muro'); M.paint(M.borda(par), (24, 24, 28), .8)

    # ---------- escadarias para os porões ----------
    M.log('porões')
    for (a, b, c, d), lado in PORAOES:
        with M.roi(a, b, c, d, 1):
            m = M.rect(M.mask(), a, b, c, d)
            borda_ = M.SUB(M.rect(M.mask(), a - .35, b - .35, c + .35, d + .35), m)
            M.sombra(borda_, .15, .2, .05, .5); M.paint(borda_, 'muro'); M.paint(M.borda(borda_), (24, 24, 28), .8)
            vert = lado in ('n', 's')
            n_ = int(((d - b) if vert else (c - a)) / .45)
            for i in range(n_):
                t = i / max(1, n_ - 1)
                if lado == 's': q = (a, b + i * .45, c, b + (i + 1) * .45)
                elif lado == 'n': q = (a, d - (i + 1) * .45, c, d - i * .45)
                elif lado == 'l': q = (a + i * .45, b, a + (i + 1) * .45, d)
                else: q = (c - (i + 1) * .45, b, c - i * .45, d)
                st = M.rect(M.mask(), *q)
                k = 1 - .85 * t
                M.paint(st, (int(120 * k), int(118 * k), int(122 * k)))
                M.paint(M.borda(st, .02), (12, 12, 14), .7)
            # a porta do porão, no fundo
            if lado == 's': q = (a + .3, d - .3, c - .3, d)
            elif lado == 'n': q = (a + .3, b, c - .3, b + .3)
            elif lado == 'l': q = (c - .3, b + .3, c, d - .3)
            else: q = (a, b + .3, a + .3, d - .3)
            M.paint(M.rect(M.mask(), *q), (70, 48, 30))

    # ---------- o canto dos barris ----------
    M.log('barris')
    def barril(x, y, rr=.42, cor=(110, 76, 46)):
        with M.roi(x - rr, y - rr, x + rr, y + rr, .5):
            m = M.disc(M.mask(), x, y, rr); M.sombra(m, .12, .16, .05, .55)
            M.telhado_local(m, cor, course=.06, contraste=.3)
            M.paint(M.SUB(M.disc(M.mask(), x, y, rr), M.disc(M.mask(), x, y, rr - .07)), (50, 46, 44))
            M.paint(M.SUB(M.disc(M.mask(), x, y, rr * .6), M.disc(M.mask(), x, y, rr * .6 - .05)), (60, 54, 50), .8)
    def caixa(x, y, s=.9, ang=0):
        with M.roi(x - s, y - s, x + s, y + s, .5):
            m = M.rrect(M.mask(), x, y, s, s, ang); M.sombra(m, .15, .2, .05, .5); M.paint(m, 'madeira'); M.paint(M.borda(m, .04), (40, 28, 18), .9)
            M.paint(M.AND(M.OR(M.pline(M.mask(), [(x - s / 2, y - s / 2), (x + s / 2, y + s / 2)], .07), M.pline(M.mask(), [(x + s / 2, y - s / 2), (x - s / 2, y + s / 2)], .07)), m), (60, 42, 26), .8)
    qx0, qy0, qx1, qy1 = QUINTAL
    muro_q = M.SUB(M.rect(M.mask(), qx0 - .1, qy0 - .1, qx1 + .1, qy1), M.rect(M.mask(), qx0 + .5, qy0 + .5, qx1 - .5, qy1 + 1))
    M.sombra(muro_q, .2, .3, .1, .5); M.paint(muro_q, 'muro'); M.paint(M.borda(muro_q), (24, 24, 28), .8)
    # pilhas de barris num canto do pátio e ao longo do muro
    for i in range(9):
        for j in range(5):
            if i + j * .7 > 8: continue
            barril(qx1 - .9 - i * .86 - (j % 2) * .43, qy0 + .95 + j * .78)
    for i in range(6): barril(qx0 + 4.2 + i * .9, qy1 - .7)
    for (x, y) in ((qx0 + 4.5, qy0 + 1.3), (qx0 + 5.5, qy0 + 1.3), (qx0 + 5, qy0 + 2.3)): caixa(x, y, .95, r.random() * 20)
    # mais barris na beira do beco e atrás da taverna
    for k in range(7): barril(67.3 + (k % 2) * .9, 10.6 + k * .8 * .5 + (k // 2) * .4)
    for k in range(6): barril(100.6 + k * .88, 102.6)

    # ---------- o posto da guarda e o painel de ferro ----------
    M.log('posto e painel')
    px0, py0, px1, py1 = POSTO
    with M.roi(*PAINEL, 1):
        a, b, c, d = PAINEL
        m = M.rect(M.mask(), a, b, c, d + .25)
        M.sombra(m, .1, .15, .04, .6); M.paint(m, (64, 68, 74)); M.paint(M.borda(m, .04), (18, 18, 20), .9)
        for x in np.arange(a + .25, c, .5):
            for y in (b + .15, d + .05): M.paint(M.disc(M.mask(), x, y, .06), (150, 150, 156))
        for x in (a + 1.2, a + 2.8):
            M.paint(M.pline(M.mask(), [(x, d + .1), (x + .35, d + .65)], .1), (40, 40, 44))
            M.paint(M.disc(M.mask(), x + .35, d + .65, .12), (160, 40, 30))
        cab = M.mask()
        for k in range(3): M.pline(cab, [(a + 1 + k * .9, b), (TORRE[0] + 1 + k * .3, TORRE[1] - 2.4)], .06)
    # ---------- a torre das lanternas (madeira) ----------
    tx, ty = TORRE
    with M.roi(tx - 3, ty - 3, tx + 3, ty + 3, 4):
        m = M.rect(M.mask(), tx - 2.4, ty - 2.4, tx + 2.4, ty + 2.4)
        M.sombra(m, 2.2, 2.8, .5, .5)
        M.paint(m, 'madeira'); M.paint(M.borda(m, .06), (30, 22, 14), .9)
        x_ = M.OR(M.pline(M.mask(), [(tx - 2.4, ty - 2.4), (tx + 2.4, ty + 2.4)], .18), M.pline(M.mask(), [(tx + 2.4, ty - 2.4), (tx - 2.4, ty + 2.4)], .18))
        M.paint(M.AND(x_, m), (70, 50, 32))
        M.paint(M.disc(M.mask(), tx, ty, 1.0), (176, 140, 70))
        esc = M.mask()
        for t in np.arange(ty + 2.4, ty + 6, .35): M.pline(esc, [(tx - .4, t), (tx + .4, t)], .07)
        M.pline(esc, [(tx - .45, ty + 2.4), (tx - .45, ty + 6)], .09); M.pline(esc, [(tx + .45, ty + 2.4), (tx + .45, ty + 6)], .09)
        M.paint(esc, (96, 70, 44))
    # cordas com lanternas: da torre para os telhados e de lado a lado da praça
    cordas = [((tx, ty), p) for p in ((40, 16.5), (80, 16), (112, 16), (152, 18.5), (160, 72), (118, 86.5), (80, 87.5), (36, 84), (33, 30), (66, 31.5))]
    cordas += [((50, 16), (52, 87)), ((96, 16), (98, 31.5)), ((140, 17), (150, 66)), ((12, 42), (34, 50)), ((118, 4), (128, 15)), ((158, 45), (170, 53)), ((86, 90), (96, 100))]
    lanternas = []
    corda_m = M.mask()
    for (a, b) in cordas:
        a, b = np.array(a, float), np.array(b, float)
        pts = [a + (b - a) * t + np.array([0, .9 * math.sin(math.pi * t)]) for t in np.linspace(0, 1, 24)]
        M.pline(corda_m, pts, .05)
        ln = np.linalg.norm(b - a)
        for t in np.linspace(0, 1, max(3, int(ln / 2.6)))[1:-1]:
            p = a + (b - a) * t + np.array([0, .9 * math.sin(math.pi * t)]); lanternas.append(p)
    M.paint(corda_m, (36, 30, 24), .85)
    CORES_L = [(255, 120, 70), (255, 190, 90), (240, 90, 90), (255, 220, 140), (180, 120, 255)]
    for p in lanternas:
        with M.roi(p[0] - .4, p[1] - .4, p[0] + .4, p[1] + .4, .4):
            M.paint(M.disc(M.mask(), p[0], p[1], .3), CORES_L[r.integers(len(CORES_L))])
            M.paint(M.disc(M.mask(), p[0] - .08, p[1] - .08, .12), (255, 240, 200))

    # ---------- o palco do festival ----------
    M.log('festival')
    a, b, c, d = PALCO
    with M.roi(a, b, c, d, 3):
        m = M.rect(M.mask(), a, b, c, d); M.sombra(m, .5, .7, .2, .55)
        M.paint(m, 'madeira'); M.paint(M.borda(m, .08), (30, 22, 14), .9)
        fundo = M.rect(M.mask(), a, b, a + 1.2, d); M.paint(fundo, (110, 30, 40)); M.paint(M.borda(fundo), (40, 10, 14), .9)
        for y in np.arange(b + 1, d - 1, 2.4): M.paint(M.rect(M.mask(), a + .2, y, a + 1.0, y + 1.2), (200, 170, 70), .9)
        for k, x in enumerate(np.arange(c, c + 2.1, .5)):
            M.paint(M.rect(M.mask(), x, b + 5, x + .5, d - 5), (int(110 - k * 8),) * 3)
    for (x, y) in ((a + .2, b + .2), (c - .8, b + .2), (a + .2, d - .8), (c - .8, d - .8)): pass
    # as tendas grandes (listradas)
    for (a, b, c, d, c1, c2) in TENDAS:
        with M.roi(a, b, c, d, 2):
            m = M.rect(M.mask(), a, b, c, d); M.sombra(m, .6, .8, .25, .5)
            for k in range(8):
                M.paint(M.AND(M.rect(M.mask(), a + k * (c - a) / 8, b, a + (k + 1) * (c - a) / 8, d), m), c1 if k % 2 == 0 else c2)
            h = cv2.distanceTransform(m, cv2.DIST_L2, 5)
            gx = cv2.Sobel(h, cv2.CV_32F, 1, 0); gy = cv2.Sobel(h, cv2.CV_32F, 0, 1)
            sh = (gx + gy) / (np.sqrt(gx * gx + gy * gy) * 1.414 + 1e-4)
            M.mul(np.where(m > 0, .82 + .25 * sh, 1).astype(np.float32))
            M.paint(M.disc(M.mask(), (a + c) / 2, (b + d) / 2, .4), (200, 170, 80))
    # a fonte
    M.fonte(FONTE[0], FONTE[1], FONTE[2])
    # barracas do festival, em fileiras com corredores
    def evita(x, y):
        z = [(CASA[0] - 2, CASA[1] - 3, CASA[2] + 2, CASA[3] + 3), (PALCO[0] - 2, PALCO[1] - 2, PALCO[2] + 4, PALCO[3] + 2), (tx - 5, ty - 5, tx + 5, ty + 8),
             (FONTE[0] - 6, FONTE[1] - 6, FONTE[0] + 6, FONTE[1] + 6), (POSTO[0] - 3, POSTO[1] - 2, POSTO[2] + 3, POSTO[3] + 3)] + [(t[0] - 2, t[1] - 2, t[2] + 2, t[3] + 2) for t in TENDAS]
        return any(z0 <= x <= z1 and w0 <= y <= w1 for z0, w0, z1, w1 in z) or not M.dentro(PRACA, x + 1.5, y + 1) or not M.dentro(PRACA, x, y) or not M.dentro(PRACA, x + 3, y + 2.2)
    # zonas de barracas: fileiras deitadas, fileiras em pé e um labirinto apertado
    ZONAS = [((36, 20, 68, 56), 'h', 4.4, 3.3, .2), ((60, 50, 100, 85), 'v', 3.3, 4.6, .15), ((96, 72, 128, 85), 'h', 4.0, 3.3, .25),
             ((128, 20, 158, 58), 'h', 3.6, 3.2, .1), ((150, 60, 160, 84), 'v', 3.3, 4.4, .2), ((106, 20, 126, 30), 'h', 4.2, 3.3, .3),
             ((36, 74, 60, 86), 'h', 4.2, 3.2, .25)]
    for (z0, w0, z1, w1), ori, dy, dx, falta in ZONAS:
        for y in np.arange(w0 + 1, w1 - 2, dy):
            for x in np.arange(z0, z1 - 2, dx):
                xx, yy = x + (r.random() - .5) * .6, y + (r.random() - .5) * .5
                if r.random() < falta: continue
                if ori == 'h':
                    if evita(xx, yy): continue
                    M.barraca(xx, yy, 3.0, 2.2)
                else:
                    if evita(xx, yy) or evita(xx - .8, yy + .8): continue
                    M.barraca(xx, yy, 2.2, 3.0)
                k = r.random()
                if k < .3: caixa(xx + .7 + r.random(), yy + (2.8 if ori == 'h' else 3.6), .8, r.random() * 30)
                elif k < .5: barril(xx + 2.4, yy + (2.8 if ori == 'h' else 3.6))
                elif k < .58: caixa(xx - .7, yy + 1, .8, r.random() * 30); caixa(xx - .7, yy + 1.9, .8, r.random() * 30)
    # mesas de comida perto da fonte
    for (x, y) in ((104, 56), (104, 70), (120, 56), (120, 70), (100, 63), (124, 63)):
        with M.roi(x - 2, y - 2, x + 2, y + 2, 1):
            m = M.rect(M.mask(), x - 1.4, y - .5, x + 1.4, y + .5); M.sombra(m, .15, .2, .05, .5); M.paint(m, 'madeira')
            for dy in (-.95, .95):
                bm = M.rect(M.mask(), x - 1.3, y + dy - .2, x + 1.3, y + dy + .2); M.paint(bm, 'madeira_esc')
    # carroças paradas e fardos de feno
    def carroca(x, y, ang, carga=(150, 130, 70)):
        with M.roi(x - 3, y - 3, x + 3, y + 3, 1):
            m = M.rrect(M.mask(), x, y, 3.4, 1.8, ang); M.sombra(m, .3, .4, .1, .5); M.paint(m, 'madeira'); M.paint(M.borda(m, .05), (36, 26, 16), .9)
            M.paint(M.rrect(M.mask(), x, y, 2.8, 1.3, ang), carga)
            u = np.array([math.cos(math.radians(ang)), math.sin(math.radians(ang))]); n = np.array([-u[1], u[0]])
            for s1 in (-1, 1):
                for s2 in (-.8, .8):
                    p = np.array([x, y]) + u * s2 + n * s1 * 1.0
                    M.paint(M.rrect(M.mask(), p[0], p[1], .9, .22, ang), (40, 30, 20))
            p = np.array([x, y]) + u * 2.4
            M.paint(M.pline(M.mask(), [p - n * .4, p + u * .8 - n * .4], .08), (70, 50, 30)); M.paint(M.pline(M.mask(), [p + n * .4, p + u * .8 + n * .4], .08), (70, 50, 30))
    carroca(10, 20, 90); carroca(10, 76, 90, (110, 104, 96)); carroca(164, 49, 0, (120, 90, 60)); carroca(91, 97, 90, (150, 130, 70))
    for (x, y) in ((13.5, 26), (13.5, 27.4), (14.8, 26.7), (37, 79), (38.3, 79.2)):
        with M.roi(x - 1, y - 1, x + 1, y + 1, .5):
            m = M.rect(M.mask(), x - .6, y - .4, x + .6, y + .4); M.sombra(m, .1, .15, .05, .5); M.paint(m, (176, 156, 90)); M.paint(M.borda(m, .03), (90, 76, 40), .9)

    # ---------- a guarda: guaritas, barreiras, o mirante ----------
    M.log('guarda')
    def guarita(x, y):
        with M.roi(x - 1.5, y - 1.5, x + 1.5, y + 1.5, 2):
            m = M.rect(M.mask(), x - 1, y - 1, x + 1, y + 1); M.sombra(m, .4, .55, .1, .55)
            M.telhado_local(m, (82, 86, 98), course=.08); M.paint(M.borda(m, .05), (26, 26, 30), .9)
            M.paint(M.rect(M.mask(), x - .5, y - .5, x + .5, y + .5), (140, 30, 30), .0)
    def barreira(a, b):
        a, b = np.array(a, float), np.array(b, float)
        with M.roi(min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1]), 1.5):
            m = M.pline(M.mask(), [a, b], .35); M.sombra(m, .15, .2, .05, .5); M.paint(m, 'madeira_esc')
            ln = np.linalg.norm(b - a); u = (b - a) / ln; n = np.array([-u[1], u[0]])
            for t in np.arange(.3, ln, 1.4):
                p = a + u * t
                M.paint(M.pline(M.mask(), [p - n * .4 - u * .4, p + n * .4 + u * .4], .14), (70, 50, 30))
                M.paint(M.pline(M.mask(), [p + n * .4 - u * .4, p - n * .4 + u * .4], .14), (70, 50, 30))
            for t in np.arange(.6, ln, 2.0):
                p = a + u * t; M.paint(M.pline(M.mask(), [p - u * .5, p + u * .5], .2), (176, 40, 34))
    barreira((118.5, 17.3), (122, 17.3)); guarita(116.3, 19.6)
    barreira((158.2, 44.5), (158.2, 48)); guarita(156, 42.2)
    barreira((86.5, 86.8), (90, 86.8)); guarita(84.2, 84.5)
    barreira((34.2, 42.4), (34.2, 45.6)); guarita(36.2, 40.2)
    barreira((50.4, 16.8), (53.6, 16.8)); barreira((44.4, 87.2), (47.1, 87.2)); barreira((130.4, 85.2), (133.1, 85.2))
    # o mirante de vigia (plataforma alta com escada)
    with M.roi(98, 48, 106, 56, 3):
        m = M.rect(M.mask(), 99.5, 49.5, 103.5, 53.5); M.sombra(m, 1.6, 2.1, .4, .5); M.paint(m, 'madeira'); M.paint(M.borda(m, .06), (30, 22, 14), .9)
        par = M.SUB(m, M.rect(M.mask(), 99.9, 49.9, 103.1, 53.1)); M.paint(par, 'madeira_esc')
        esc = M.mask()
        for t in np.arange(53.5, 56, .35): M.pline(esc, [(101.1, t), (101.9, t)], .07)
        M.pline(esc, [(101.05, 53.5), (101.05, 56)], .08); M.pline(esc, [(101.95, 53.5), (101.95, 56)], .08); M.paint(esc, (96, 70, 44))
    # escadas de mão nos becos (subida para os telhados) e o andaime
    for (x, y, vert) in ((30.5, 1.3, False), (78, 1.3, False), (140, 1.3, False), (60, 102.7, False), (112, 102.7, False), (150, 102.7, False), (11.5, 35, True), (11.5, 86, True), (69.5, 13, True)):
        with M.roi(x - 2, y - 2, x + 2, y + 2, 1):
            e = M.mask()
            if vert:
                M.pline(e, [(x - .35, y - 1.6), (x - .35, y + 1.6)], .08); M.pline(e, [(x + .35, y - 1.6), (x + .35, y + 1.6)], .08)
                for t in np.arange(y - 1.5, y + 1.6, .35): M.pline(e, [(x - .35, t), (x + .35, t)], .06)
            else:
                M.pline(e, [(x - 1.6, y - .35), (x + 1.6, y - .35)], .08); M.pline(e, [(x - 1.6, y + .35), (x + 1.6, y + .35)], .08)
                for t in np.arange(x - 1.5, x + 1.6, .35): M.pline(e, [(t, y - .35), (t, y + .35)], .06)
            M.sombra(e, .1, .15, .03, .5); M.paint(e, (120, 88, 52))
    with M.roi(112, 84, 130, 89, 1):
        and_ = M.mask()
        for x in np.arange(112.5, 130, 2.0):
            M.disc(and_, x, 85.3, .18); M.disc(and_, x, 87.2, .18)
        M.pline(and_, [(112.5, 85.3), (129.5, 85.3)], .12); M.pline(and_, [(112.5, 87.2), (129.5, 87.2)], .12)
        M.sombra(and_, .4, .5, .05, .5); M.paint(and_, (100, 74, 46))
        tab = M.mask()
        for x in np.arange(112.6, 129.5, 3.6): M.rect(tab, x, 85.6, x + 3.2, 86.9)
        M.paint(tab, 'madeira')
    # lanternas boiando no rio
    for k in range(26):
        x, y = .3 + r.random() * 5.6, r.random() * H
        if 40 < y < 52: continue
        with M.roi(x - .3, y - .3, x + .3, y + .3, .3): M.paint(M.disc(M.mask(), x, y, .22), (255, 190, 110))

    # ---------- a noite: o escuro e as luzes ----------
    M.log('noite')
    luzes = [(p[0], p[1], 3.2, (1.0, .62, .32), .9) for p in lanternas]
    luzes += [(x, y, 2.4, (1.0, .7, .4), .8) for (x, y) in ((116.3, 19.6), (156, 42.2), (84.2, 84.5), (36.2, 40.2), (101.5, 51.5), (143, 32))]
    luzes += [(a + .5, y, 4.5, (1.0, .6, .3), 1.0) for (a, b, c, d) in [PALCO] for y in (b + 1, d - 1)]
    luzes += [(tx, ty, 7, (1.0, .74, .42), 1.0)]
    for (a, b, c, d, *_ ) in TENDAS: luzes.append(((a + c) / 2, (b + d) / 2, 5, (1.0, .6, .34), .7))
    for k in range(26): luzes.append((.3 + r.random() * 5.6, r.random() * H, 1.4, (1.0, .7, .4), .5))
    for y in np.arange(5, 100, 14): luzes.append((10, y, 3.0, (1.0, .7, .4), .7))
    for (a, b, c, d) in casas[::2]:
        # janelas acesas: luz que vaza pela borda do prédio
        side = r.integers(4)
        x = a + (c - a) * r.random(); y = b + (d - b) * r.random()
        x = (a, c)[side % 2] if side < 2 else x; y = (b, d)[side % 2] if side >= 2 else y
        if r.random() < .55: luzes.append((x, y, 1.8, (1.0, .7, .38), .55))
    luz = np.zeros((M.HP, M.WP, 3), np.float32)
    for (x, y, rr, col, ii) in luzes:
        g = np.zeros((M.HP, M.WP), np.float32) if False else None
        x0, y0 = int((x - rr * 2) * S), int((y - rr * 2) * S); x1, y1 = int((x + rr * 2) * S), int((y + rr * 2) * S)
        x0, y0, x1, y1 = max(0, x0), max(0, y0), min(M.WP, x1), min(M.HP, y1)
        if x1 <= x0 or y1 <= y0: continue
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        dd = np.sqrt((xx / S - x) ** 2 + (yy / S - y) ** 2) / rr
        f = np.clip(1 - dd, 0, 1) ** 1.8 * ii
        luz[y0:y1, x0:x1] += f[..., None] * np.array(col, np.float32)
    amb = np.array([.44, .47, .60], np.float32)
    for r0 in range(0, M.HP, M.CH):
        r1 = min(M.HP, r0 + M.CH)
        L_ = np.minimum(amb + luz[r0:r1] * 1.15, 1.45)
        M.cv[r0:r1] *= L_
    del luz
    # as lanternas e as chamas brilham por cima do escuro
    for p in lanternas:
        with M.roi(p[0] - .4, p[1] - .4, p[0] + .4, p[1] + .4, .4):
            M.paint(M.disc(M.mask(), p[0], p[1], .26), CORES_L[r.integers(len(CORES_L))], .85)
            M.paint(M.disc(M.mask(), p[0] - .06, p[1] - .06, .1), (255, 244, 210))
    M.acabamento(desat=.9, tint=(1.0, .98, 1.02), vinheta=.35)
    M.salvar(out, previa)


if __name__ == '__main__':
    pintar(float(sys.argv[1]) if len(sys.argv) > 1 else 12, sys.argv[2] if len(sys.argv) > 2 else 'mercado_prev.png', sys.argv[3] if len(sys.argv) > 3 else None)
