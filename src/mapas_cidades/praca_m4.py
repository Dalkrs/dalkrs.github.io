"""Missão 4 — praça de uma cidade pequena, de noite, em festa. 1 quadrado = 1,5 m. 170 x 100 quadrados (255 m x 150 m).
Pedido do Bruno: praça central com barracas em volta, painéis que mantêm as luzes acesas, competição de arquearia e
uma pequena arena de duelos."""
import sys, math
import numpy as np, cv2
import motor as M

W, H = 170, 100
PRACA = [(52, 24), (118, 24), (122, 28), (122, 72), (118, 76), (52, 76), (48, 72), (48, 28)]
ESTRADA_N = (0, 18, 170, 24)
ESTRADA_S = (0, 76, 170, 82)
BECO_N = (0, 0, 170, 2.2)
BECO_S = (0, 97.8, 170, 100)
RUAS_N = [(27, 2.2, 31, 18), (59, 2.2, 63, 18), (104, 2.2, 108, 18), (146, 2.2, 150, 18)]
RUAS_S = [(34, 82, 38, 97.8), (82, 82, 88, 100), (134, 82, 138, 97.8)]
TEMPLO = (68, 3, 98, 15.5)
ADRO = (74, 15.5, 92, 18)
TAVERNA = (88, 83, 108, 95.5)
PATIO_TAV = (108, 85, 118, 97.8)
CONSELHO = (56, 83, 78, 96.5)
# a arena de duelos (oeste) e a arquearia (leste)
ARENA = (24, 50, 10.5)
TENDA_LUT = (3, 45, 9, 55)
ARQ = dict(x_tiro=131, x_alvo=160, y0=30, y1=60, faixas=6)
TRIBUNA = (124, 63, 131, 70)
# o mastro das lanternas, o poço, a árvore velha, os painéis de luz
MASTRO = (85, 50)
POCO = (68, 38)
ARVORE = (101, 63)
PAINEIS = [((83, 24.6, 87, 25.6), 's', 'Painel norte'), ((48.6, 48, 49.6, 52), 'l', 'Painel oeste'),
           ((120.4, 48, 121.4, 52), 'o', 'Painel leste'), ((83, 74.4, 87, 75.4), 'n', 'Painel sul')]


def casas_em_linha(x0, x1, y0, y1, horizontal=True, rng=None, wmin=6, wmax=10):
    out = []; t = x0 if horizontal else y0; fim = x1 if horizontal else y1
    while t < fim - 3:
        w = min(fim - t, wmin + rng.random() * (wmax - wmin))
        if fim - (t + w) < wmin * .6: w = fim - t
        out.append((t, y0, t + w, y1) if horizontal else (x0, t, x1, t + w))
        t += w
    return out


def predios(rng):
    """as casas da vila (fileira norte e sul), com quintais atrás; devolve a lista de retângulos"""
    casas = []
    xs_n = [0, 27, 31, 59, 63, 68, 98, 104, 108, 146, 150, 170]
    for a, b in ((0, 27), (31, 59), (63, 68), (98, 104), (108, 146), (150, 170)):
        for (p, q, r_, s) in casas_em_linha(a + .4, b - .4, 0, 1, rng=rng):
            fundo = 7 + rng.random() * 4
            casas.append((p, 17.2 - fundo, r_, 17.2))
    for a, b in ((0, 34), (38, 56), (78, 82), (118, 134), (138, 170)):
        for (p, q, r_, s) in casas_em_linha(a + .4, b - .4, 0, 1, rng=rng):
            fundo = 7 + rng.random() * 4
            casas.append((p, 82.8, r_, 82.8 + fundo))
    return [c for c in casas if c[2] - c[0] > 2.5]


def pintar(S=12, out='praca_prev.png', previa=None):
    M.setup(W, H, S, seed=4404, fundo=(60, 70, 52))
    M.texturas_padrao()
    M.stone('praca', .55, (104, 100, 98), 12, (46, 44, 44), 3, 1.2)
    M.planks('madeira', (112, 82, 54), .2, 71)
    M.planks('madeira_esc', (86, 62, 42), .18, 72)
    M.flat('areia', (150, 130, 96), 10, .5, 73)
    M.flat('feno', (176, 156, 90), 14, .4, 74)
    r = M.rng
    casas = predios(r)
    globals()['CASAS'] = casas
    M.log('chão')
    M.paint(M.rect(M.mask(), 0, 0, W, H), 'grama')
    M.paint(M.AND(M.rect(M.mask(), 0, 0, W, H), ((M.noise(3, seed=21) > .6) * 255).astype(np.uint8)), 'grama_escura', .6)
    estr = M.OR(M.rect(M.mask(), *ESTRADA_N), M.rect(M.mask(), *ESTRADA_S))
    for q in RUAS_N + RUAS_S: estr = M.OR(estr, M.rect(M.mask(), *q))
    M.paint(estr, 'terra')
    M.paint(M.AND(estr, ((M.noise(1.4, seed=22) > .62) * 255).astype(np.uint8)), 'lama', .7)
    becos = M.OR(M.rect(M.mask(), *BECO_N), M.rect(M.mask(), *BECO_S))
    M.paint(becos, 'lama')
    praca = M.poly(M.mask(), PRACA)
    M.paint(praca, 'praca')
    # a rua de pedra que sai da praça para o sul (a estrada da vila)
    M.paint(M.rect(M.mask(), 82, 76, 88, 100), 'rua')
    M.paint(M.rect(M.mask(), *ADRO), 'patio')
    # quintais atrás das casas (cercas e hortas)
    M.log('quintais')
    quint = M.mask()
    for (a, b, c, d) in casas:
        if b < 20: q = (a + .2, 2.2, c - .2, b - .1)
        else: q = (a + .2, d + .1, c - .2, 97.8)
        if q[3] - q[1] > 1.2 and r.random() < .8:
            M.rect(quint, *q)
            if r.random() < .5:
                with M.roi(*q, .5):
                    for y in np.arange(q[1] + .5, q[3] - .4, .9): M.paint(M.rect(M.mask(), q[0] + .5, y, q[2] - .5, y + .5), (78, 64, 46))
    cerca = M.borda(quint, .05)
    M.paint(cerca, (96, 72, 46), .9)

    # ---------- arena de duelos ----------
    M.log('arena')
    ax, ay, ar = ARENA
    campo = M.rect(M.mask(), 1, 25, 46, 75)
    M.paint(campo, 'terra'); M.paint(M.AND(campo, ((M.noise(2, seed=31) > .55) * 255).astype(np.uint8)), 'grama_escura', .45)
    M.paint(M.rect(M.mask(), 44, 46, 48, 54), 'terra')
    areia = M.disc(M.mask(), ax, ay, ar)
    M.paint(areia, 'areia')
    M.paint(M.AND(areia, ((M.noise(.6, seed=32) > .7) * 255).astype(np.uint8)), (128, 108, 78), .5)
    # arquibancadas de madeira (dois arcos, com as entradas a leste e a oeste)
    arq_m = M.mask()
    for (t0, t1) in ((200, 340), (20, 160)):
        pts_o = [(ax + math.cos(math.radians(t)) * 16, ay + math.sin(math.radians(t)) * 16) for t in np.linspace(t0, t1, 40)]
        pts_i = [(ax + math.cos(math.radians(t)) * 12, ay + math.sin(math.radians(t)) * 12) for t in np.linspace(t1, t0, 40)]
        M.poly(arq_m, pts_o + pts_i)
    M.sombra(arq_m, .5, .7, .2, .55)
    M.paint(arq_m, 'madeira')
    deg = M.mask()
    for rr in (13, 14, 15):
        for (t0, t1) in ((200, 340), (20, 160)):
            M.pline(deg, [(ax + math.cos(math.radians(t)) * rr, ay + math.sin(math.radians(t)) * rr) for t in np.linspace(t0, t1, 40)], .06)
    M.paint(deg, (54, 38, 24), .9)
    # o camarote (no alto da arquibancada norte)
    cam = M.rect(M.mask(), ax - 3, ay - 17.6, ax + 3, ay - 14.6)
    M.sombra(cam, .4, .6, .2, .5); M.paint(cam, 'madeira_esc')
    M.paint(M.rect(M.mask(), ax - 2.6, ay - 17.4, ax + 2.6, ay - 16.4), (120, 34, 40))
    # a cerca da arena (com as duas portinholas)
    cerc = M.mask()
    for (t0, t1) in ((14, 166), (194, 346)):
        M.pline(cerc, [(ax + math.cos(math.radians(t)) * (ar + .2), ay + math.sin(math.radians(t)) * (ar + .2)) for t in np.linspace(t0, t1, 60)], .14)
    M.sombra(cerc, .1, .15, .04, .5); M.paint(cerc, (90, 64, 40))
    for t in np.arange(0, 360, 12):
        if t in (0, 180) or 166 < t < 194 or t < 14 or t > 346: continue
        p = (ax + math.cos(math.radians(t)) * (ar + .2), ay + math.sin(math.radians(t)) * (ar + .2))
        M.paint(M.disc(M.mask(), *p, .18), (60, 42, 26))
    # a tenda dos lutadores e o cavalete de armas
    a, b, c, d = TENDA_LUT
    with M.roi(a, b, c, d, 2):
        m = M.rect(M.mask(), a, b, c, d); M.sombra(m, .5, .7, .25, .5)
        for k in range(6): M.paint(M.AND(M.rect(M.mask(), a, b + k * (d - b) / 6, c, b + (k + 1) * (d - b) / 6), m), (110, 40, 44) if k % 2 == 0 else (196, 180, 146))
        h_ = cv2.distanceTransform(m, cv2.DIST_L2, 5)
        gx = cv2.Sobel(h_, cv2.CV_32F, 1, 0); gy = cv2.Sobel(h_, cv2.CV_32F, 0, 1)
        M.mul(np.where(m > 0, .82 + .25 * (gx + gy) / (np.sqrt(gx * gx + gy * gy) * 1.414 + 1e-4), 1).astype(np.float32))
    def cavalete(x, y, vert=True):
        with M.roi(x - 1.5, y - 1.5, x + 1.5, y + 1.5, 1):
            m = M.rect(M.mask(), x - .25, y - 1.2, x + .25, y + 1.2) if vert else M.rect(M.mask(), x - 1.2, y - .25, x + 1.2, y + .25)
            M.sombra(m, .1, .15, .04, .5); M.paint(m, 'madeira_esc')
            for t in np.linspace(-1, 1, 5):
                p0 = (x - .5, y + t) if vert else (x + t, y - .5); p1 = (x + .5, y + t + .2) if vert else (x + t + .2, y + .5)
                M.paint(M.pline(M.mask(), [p0, p1], .07), (170, 170, 176))
    cavalete(11.5, 47); cavalete(11.5, 53)
    # braseiros em volta da arena
    BRAS = [(ax + math.cos(math.radians(t)) * 17.3, ay + math.sin(math.radians(t)) * 17.3) for t in (0, 60, 120, 180, 240, 300)]
    BRAS += [(ax + 11, ay - 1.6), (ax + 11, ay + 1.6), (ax - 11, ay - 1.6), (ax - 11, ay + 1.6)]
    for (x, y) in BRAS:
        with M.roi(x - .6, y - .6, x + .6, y + .6, .5):
            m = M.disc(M.mask(), x, y, .45); M.sombra(m, .12, .18, .05, .5); M.paint(m, (50, 48, 50))
            M.paint(M.disc(M.mask(), x, y, .3), (255, 150, 60)); M.paint(M.disc(M.mask(), x - .05, y - .05, .14), (255, 230, 160))

    # ---------- arquearia ----------
    M.log('arquearia')
    xt, xa, y0, y1, nf = ARQ['x_tiro'], ARQ['x_alvo'], ARQ['y0'], ARQ['y1'], ARQ['faixas']
    campo_a = M.rect(M.mask(), 124, 25, 169, 75)
    M.paint(campo_a, 'grama'); M.paint(M.AND(campo_a, ((M.noise(2.5, seed=41) > .55) * 255).astype(np.uint8)), 'jardim', .5)
    # as faixas de tiro: grama cortada, alternando o tom
    fw = (y1 - y0) / nf
    for k in range(nf):
        M.paint(M.rect(M.mask(), xt, y0 + k * fw, xa + 3, y0 + (k + 1) * fw), (78, 96, 62) if k % 2 == 0 else (70, 88, 56), .6)
    # cordas laterais (com estacas) e as linhas de giz
    corda = M.mask()
    for y in (y0 - .5, y1 + .5): M.pline(corda, [(126, y), (166.5, y)], .07)
    for k in range(1, nf): M.pline(corda, [(xt + 3, y0 + k * fw), (xa - 2, y0 + k * fw)], .04)
    M.paint(corda, (196, 176, 130), .8)
    for x in np.arange(126, 167, 3):
        for y in (y0 - .5, y1 + .5): M.paint(M.disc(M.mask(), x, y, .14), (90, 66, 42))
    M.paint(M.rect(M.mask(), xt - .1, y0, xt + .1, y1), (230, 226, 210), .9)            # a linha de tiro
    # muro de feno atrás dos alvos
    for y in np.arange(y0 - 1, y1 + 1, 1.6):
        for dx in (0, 1.1):
            x = xa + 3 + dx
            with M.roi(x - .7, y - .9, x + .7, y + .9, .4):
                m = M.rect(M.mask(), x - .5, y - .75, x + .5, y + .75); M.sombra(m, .15, .2, .05, .5); M.paint(m, 'feno'); M.paint(M.borda(m, .03), (110, 92, 50), .9)
    # os alvos (palha com anéis) e a estante de flechas em cada faixa
    for k in range(nf):
        y = y0 + (k + .5) * fw
        with M.roi(xa - 1.6, y - 1.6, xa + 1.6, y + 1.6, .6):
            m = M.disc(M.mask(), xa, y, 1.3); M.sombra(m, .3, .4, .1, .55); M.paint(m, 'feno')
            for rr, col in ((1.05, (230, 226, 214)), (.82, (40, 40, 44)), (.6, (52, 92, 160)), (.38, (196, 50, 44)), (.17, (232, 196, 70))):
                M.paint(M.disc(M.mask(), xa, y, rr), col)
            for _ in range(3):
                a_ = r.random() * 6.28; rr = r.random() * .9
                M.paint(M.pline(M.mask(), [(xa + math.cos(a_) * rr, y + math.sin(a_) * rr), (xa + math.cos(a_) * rr - .5, y + math.sin(a_) * rr + .1)], .05), (60, 40, 24))
        with M.roi(xt - 2, y - 1, xt - .5, y + 1, .5):
            m = M.rect(M.mask(), xt - 1.6, y - .5, xt - .8, y + .5); M.sombra(m, .1, .15, .04, .5); M.paint(m, 'madeira_esc')
            for t in np.linspace(-.35, .35, 4): M.paint(M.disc(M.mask(), xt - 1.2, y + t, .07), (200, 196, 180))
    # bancos da plateia (sul) e a tribuna dos juízes
    for row in range(4):
        y = 64 + row * 2.4
        for x in np.arange(134, 162, 7.5):
            with M.roi(x, y, x + 6, y + .7, .5):
                m = M.rect(M.mask(), x, y, x + 6, y + .7); M.sombra(m, .15, .2, .05, .5); M.paint(m, 'madeira')
    a, b, c, d = TRIBUNA
    with M.roi(a, b, c, d, 2):
        m = M.rect(M.mask(), a, b, c, d); M.sombra(m, .8, 1.1, .3, .55); M.paint(m, 'madeira'); M.paint(M.borda(m, .06), (30, 22, 14), .9)
        toldo = M.rect(M.mask(), a, b, c, b + 3.2)
        for k in range(7): M.paint(M.AND(M.rect(M.mask(), a + k * (c - a) / 7, b, a + (k + 1) * (c - a) / 7, b + 3.2), toldo), (44, 70, 120) if k % 2 == 0 else (210, 196, 160))
        M.paint(M.rect(M.mask(), a + .8, b + 4, c - .8, b + 4.8), 'madeira_esc')     # a mesa dos juízes
        esc_ = M.mask()
        for t in np.arange(d, d + 1.8, .35): M.pline(esc_, [(a + 2.5, t), (a + 4.5, t)], .07)
        M.paint(esc_, (96, 70, 44))
    # o quadro dos prêmios
    with M.roi(126, 26, 129, 28, 1):
        m = M.rect(M.mask(), 126.2, 26.2, 128.8, 27.1); M.sombra(m, .1, .15, .04, .5); M.paint(m, 'madeira_esc')
        for x in (126.6, 127.3, 128.0): M.paint(M.rect(M.mask(), x, 26.35, x + .5, 26.9), (220, 210, 180))

    # ---------- os prédios ----------
    M.log('prédios')
    foot = M.mask(); colidx = np.full((M.HP, M.WP), 255, np.uint8)
    PAL = [(132, 84, 64), (118, 76, 60), (146, 98, 72), (108, 70, 56), (96, 90, 84), (124, 100, 70), (84, 70, 58), (70, 76, 88)]
    for (a, b, c, d) in casas:
        m = M.rect(M.mask(), a + .12, b + .12, c - .12, d - .12); foot = M.OR(foot, m); colidx[m > 127] = r.choice([0, 1, 2, 3, 4, 5, 6, 0, 1, 2])
    for q, col in ((TEMPLO, 7), (TAVERNA, 0), (CONSELHO, 4)):
        m = M.rect(M.mask(), *q); foot = M.OR(foot, m); colidx[m > 127] = col
    M.sombra(foot, .6, .8, .2, .5)
    M.telhados(foot, colidx, PAL, course=.08)
    M.chamines(foot, M.rect(M.mask(), *TEMPLO), .03, (70, 64, 60))
    # a torre do sino do templo
    M.torre_quadrada(80, 4, 86, 10, telhado=(64, 70, 84))
    # o pátio da taverna (barris e caixas) e a porta do porão
    M.log('detalhes')
    pq = M.rect(M.mask(), *PATIO_TAV); M.paint(pq, 'terra')
    mq = M.SUB(M.rect(M.mask(), PATIO_TAV[0], PATIO_TAV[1], PATIO_TAV[2] + .3, PATIO_TAV[3]), M.rect(M.mask(), PATIO_TAV[0], PATIO_TAV[1] + .4, PATIO_TAV[2] - .4, PATIO_TAV[3] + 1))
    mq = M.SUB(mq, M.rect(M.mask(), 111, PATIO_TAV[1] - .5, 114, PATIO_TAV[1] + .6))           # o portão do pátio
    M.sombra(mq, .2, .3, .1, .5); M.paint(mq, 'muro'); M.paint(M.borda(mq), (24, 24, 28), .8)
    def barril(x, y, rr=.42, cor=(110, 76, 46)):
        with M.roi(x - rr, y - rr, x + rr, y + rr, .5):
            m = M.disc(M.mask(), x, y, rr); M.sombra(m, .12, .16, .05, .55)
            M.telhado_local(m, cor, course=.06, contraste=.3)
            M.paint(M.SUB(M.disc(M.mask(), x, y, rr), M.disc(M.mask(), x, y, rr - .07)), (50, 46, 44))
    def caixa(x, y, s=.9, ang=0):
        with M.roi(x - s, y - s, x + s, y + s, .5):
            m = M.rrect(M.mask(), x, y, s, s, ang); M.sombra(m, .15, .2, .05, .5); M.paint(m, 'madeira'); M.paint(M.borda(m, .04), (40, 28, 18), .9)
            M.paint(M.AND(M.OR(M.pline(M.mask(), [(x - s / 2, y - s / 2), (x + s / 2, y + s / 2)], .07), M.pline(M.mask(), [(x + s / 2, y - s / 2), (x - s / 2, y + s / 2)], .07)), m), (60, 42, 26), .8)
    for i in range(8):
        for j in range(3): barril(117.2 - i * .86 - (j % 2) * .43, 97 - j * .78)
    for (x, y) in ((109.2, 89), (109.2, 90), (110.2, 89.5), (109.3, 91.1)): caixa(x, y, .9, r.random() * 25)
    with M.roi(114, 86, 117.6, 88.6, 1):                                             # alçapão do porão da taverna
        m = M.rect(M.mask(), 114.6, 86.2, 117, 88); M.sombra(m, .1, .15, .04, .5); M.paint(m, 'madeira_esc'); M.paint(M.borda(m, .05), (20, 16, 12), .9)
        M.paint(M.pline(M.mask(), [(115.8, 86.2), (115.8, 88)], .05), (30, 22, 14))
    # o adro do templo: degraus
    for k in range(4): M.paint(M.rect(M.mask(), 76 + k * .3, 15.5 + k * .4, 90 - k * .3, 15.9 + k * .4), (int(130 - k * 10),) * 3, .9)

    # ---------- a praça ----------
    M.log('praça')
    # o poço
    px, py = POCO
    with M.roi(px - 2, py - 2, px + 2, py + 2, 1.5):
        m = M.disc(M.mask(), px, py, 1.5); M.sombra(m, .3, .4, .1, .5); M.paint(m, 'muro')
        M.paint(M.disc(M.mask(), px, py, 1.0), (24, 30, 36)); M.paint(M.borda(M.disc(M.mask(), px, py, 1.5), .06), (30, 30, 34), .9)
        tel = M.rect(M.mask(), px - 1.9, py - .3, px + 1.9, py + .3); M.sombra(tel, .4, .5, .1, .5); M.paint(tel, 'madeira_esc')
    # a árvore velha com o banco em volta
    bx, by = ARVORE
    with M.roi(bx - 4, by - 4, bx + 4, by + 4, 1):
        anel = M.SUB(M.disc(M.mask(), bx, by, 3.2), M.disc(M.mask(), bx, by, 2.6)); M.sombra(anel, .15, .2, .05, .5); M.paint(anel, 'madeira')
    M.arvore(bx, by, 3.0, (60, 88, 54))
    # o mastro das lanternas
    mx, my = MASTRO
    with M.roi(mx - 2.5, my - 2.5, mx + 2.5, my + 2.5, 4):
        base = M.disc(M.mask(), mx, my, 2.0); M.sombra(base, .3, .4, .1, .5); M.paint(base, 'muro'); M.paint(M.borda(base, .06), (26, 26, 30), .9)
        M.paint(M.disc(M.mask(), mx, my, 1.4), 'muro_topo')
        M.sombra(M.disc(M.mask(), mx, my, .5), 3.5, 4.5, .5, .45)
        M.paint(M.disc(M.mask(), mx, my, .55), (96, 70, 44)); M.paint(M.disc(M.mask(), mx, my, .3), (170, 130, 70))
    # os painéis de luz (caixas de ferro com alavancas, ligadas por cabos ao mastro)
    cab = M.mask()
    for (a, b, c, d), lado, _ in PAINEIS:
        cx_, cy_ = (a + c) / 2, (b + d) / 2
        M.pline(cab, [(cx_, cy_), ((cx_ + mx) / 2, (cy_ + my) / 2 + .6), (mx, my)], .07)
    M.paint(cab, (34, 32, 34), .85)
    for (a, b, c, d), lado, _ in PAINEIS:
        with M.roi(a, b, c, d, 1.5):
            m = M.rect(M.mask(), a, b, c, d)
            M.sombra(m, .12, .18, .04, .6); M.paint(m, (64, 68, 74)); M.paint(M.borda(m, .04), (18, 18, 20), .9)
            vert = (d - b) > (c - a)
            n_ = 4
            for k in range(n_):
                t = (k + .5) / n_
                p = (a + (c - a) * t, b + (d - b) / 2) if not vert else (a + (c - a) / 2, b + (d - b) * t)
                M.paint(M.disc(M.mask(), *p, .09), (150, 150, 156))
            for k in (1, 3):
                t = k / 4
                base_ = (a + (c - a) * t, d if lado == 's' else b) if not vert else (c if lado == 'l' else a, b + (d - b) * t)
                dv = {'s': (0, .6), 'n': (0, -.6), 'l': (.6, 0), 'o': (-.6, 0)}[lado]
                ponta = (base_[0] + dv[0] + (.2 if not vert else 0), base_[1] + dv[1] + (.2 if vert else 0))
                M.paint(M.pline(M.mask(), [base_, ponta], .1), (40, 40, 44)); M.paint(M.disc(M.mask(), *ponta, .12), (160, 40, 30))
            # lampadinha de sinal (verde: aceso)
            M.paint(M.disc(M.mask(), a + .3 if not vert else (a + c) / 2, (b + d) / 2 if not vert else b + .3, .1), (120, 230, 120))
    # barracas: dois anéis em volta da praça, com corredores
    def livre(x, y, w, h):
        cxs = [(MASTRO, 4.5), (POCO, 3.5), (ARVORE, 5)]
        for (qx, qy), rr in cxs:
            if abs(x + w / 2 - qx) < rr + w / 2 and abs(y + h / 2 - qy) < rr + h / 2: return False
        for (a, b, c, d), _, _ in PAINEIS:
            if x < c + 2 and x + w > a - 2 and y < d + 2 and y + h > b - 2: return False
        for (x_, y_) in ((x, y), (x + w, y), (x, y + h), (x + w, y + h)):
            if not M.dentro(PRACA, x_, y_): return False
        # os corredores em cruz (do mastro às quatro saídas) ficam livres
        if 82 < x + w and x < 88: return False
        if 47 < y + h and y < 53: return False
        return True
    BARR = []
    def fileira(x0, x1, y, w=2.6, h=1.8, gap=.5, falta=.12):
        x = x0
        while x + w <= x1:
            if r.random() > falta and livre(x, y, w, h): BARR.append((x, y, w, h))
            x += w + gap
    def coluna(x, y0, y1, w=1.8, h=2.6, gap=.5, falta=.12):
        y = y0
        while y + h <= y1:
            if r.random() > falta and livre(x, y, w, h): BARR.append((x, y, w, h))
            y += h + gap
    # anel de fora (encostado na borda da praça, viradas para dentro)
    fileira(52.5, 118, 24.6); fileira(52.5, 118, 73.4 - 1.8)
    coluna(48.6, 28.5, 72); coluna(121.4 - 1.8, 28.5, 72)
    # anel de dentro (com corredor de 4 quadrados)
    fileira(57, 113, 30.4); fileira(57, 113, 67.8 - 1.8)
    coluna(54.4, 34.5, 66); coluna(115.6 - 1.8, 34.5, 66)
    # um miolo de barracas soltas entre o anel e o mastro
    for (x, y) in ((62, 40), (65, 44), (73, 56), (63, 58), (95, 39), (106, 42), (108, 56), (92, 58), (76, 42), (99, 47)):
        if livre(x, y, 2.6, 1.8): BARR.append((x, y, 2.6, 1.8))
    for (x, y, w, h) in BARR:
        M.barraca(x, y, w, h)
        k = r.random()
        if k < .25: caixa(x + w + .5, y + h / 2, .7, r.random() * 30)
        elif k < .4: barril(x + w + .45, y + h / 2)
    globals()['BARRACAS'] = BARR
    # mesas de comida perto da árvore e do poço
    MESAS = [(95, 69.5), (107, 69.5), (60, 35), (60, 64), (110, 35)]
    for (x, y) in MESAS:
        with M.roi(x - 2, y - 2, x + 2, y + 2, 1):
            m = M.rect(M.mask(), x - 1.4, y - .45, x + 1.4, y + .45); M.sombra(m, .15, .2, .05, .5); M.paint(m, 'madeira')
            for dy in (-.9, .9): M.paint(M.rect(M.mask(), x - 1.3, y + dy - .18, x + 1.3, y + dy + .18), 'madeira_esc')
    globals()['MESAS'] = MESAS

    # ---------- coisas espalhadas: carroças, feno, árvores ----------
    M.log('carroças e árvores')
    def carroca(x, y, ang, carga=(150, 130, 70)):
        with M.roi(x - 3, y - 3, x + 3, y + 3, 1):
            m = M.rrect(M.mask(), x, y, 3.4, 1.8, ang); M.sombra(m, .3, .4, .1, .5); M.paint(m, 'madeira'); M.paint(M.borda(m, .05), (36, 26, 16), .9)
            M.paint(M.rrect(M.mask(), x, y, 2.8, 1.3, ang), carga)
            u = np.array([math.cos(math.radians(ang)), math.sin(math.radians(ang))]); n = np.array([-u[1], u[0]])
            for s1 in (-1, 1):
                for s2 in (-.8, .8):
                    p = np.array([x, y]) + u * s2 + n * s1 * 1.0
                    M.paint(M.rrect(M.mask(), p[0], p[1], .9, .22, ang), (40, 30, 20))
    CARROCAS = [(20, 20.5, 0), (126, 21, 0), (44, 79.5, 180), (150, 79, 0), (85, 90, 90)]
    for (x, y, a_) in CARROCAS: carroca(x, y, a_, ((150, 130, 70), (110, 104, 96), (120, 90, 60))[int(x) % 3])
    globals()['CARROCAS'] = CARROCAS
    FENO = [(40, 27), (41.3, 27.2), (40.6, 28.2), (126.5, 73), (127.8, 73.2), (2.5, 72), (3.8, 72.3), (167, 26), (167, 27.4), (46, 73.5)]
    for (x, y) in FENO:
        with M.roi(x - 1, y - 1, x + 1, y + 1, .5):
            m = M.rect(M.mask(), x - .6, y - .4, x + .6, y + .4); M.sombra(m, .1, .15, .05, .5); M.paint(m, 'feno'); M.paint(M.borda(m, .03), (90, 76, 40), .9)
    globals()['FENO'] = FENO
    ARV = [(3, 27), (2.5, 33), (42, 32), (43, 67), (3, 64), (14, 72.5), (34, 27.5), (37, 72), (46, 36.5),
           (167, 31), (167.5, 38), (167, 46), (167.5, 55), (167, 63), (166, 71), (124.5, 36), (124.5, 58),
           (124.8, 27), (156, 72.6), (139.5, 73.4)]
    for (x, y) in ARV: M.arvore(x, y, 1.1 + r.random() * .7, M.GREENS[r.integers(len(M.GREENS))])
    globals()['ARVORES'] = ARV

    # ---------- as cordas de lanternas ----------
    M.log('lanternas')
    cordas = [((mx, my), p) for p in ((52, 24), (70, 24), (100, 24), (118, 24), (122, 38), (122, 62), (118, 76), (100, 76), (70, 76), (52, 76), (48, 62), (48, 38))]
    cordas += [((48, 46), (36, 40)), ((48, 54), (36, 60)), ((122, 46), (131, 30)), ((122, 54), (131, 60)), ((85, 24), (85, 15.5)), ((85, 76), (85, 84))]
    lanternas = []
    corda_m = M.mask()
    for (a, b) in cordas:
        a, b = np.array(a, float), np.array(b, float)
        pts = [a + (b - a) * t + np.array([0, .9 * math.sin(math.pi * t)]) for t in np.linspace(0, 1, 24)]
        M.pline(corda_m, pts, .05)
        ln = np.linalg.norm(b - a)
        for t in np.linspace(0, 1, max(3, int(ln / 2.4)))[1:-1]:
            lanternas.append(a + (b - a) * t + np.array([0, .9 * math.sin(math.pi * t)]))
    M.paint(corda_m, (36, 30, 24), .85)
    CORES_L = [(255, 120, 70), (255, 190, 90), (240, 90, 90), (255, 220, 140), (180, 120, 255), (120, 200, 255)]
    # postes com lampião na arquearia e nas estradas
    POSTES = [(x, y0 - 1.6) for x in np.arange(128, 166, 8)] + [(x, y1 + 1.6) for x in np.arange(128, 166, 8)]
    POSTES += [(x, 18.6) for x in (14, 46, 66, 102, 120, 140, 160)] + [(x, 81.4) for x in (16, 30, 52, 80, 92, 124, 160)]
    for (x, y) in POSTES:
        with M.roi(x - .4, y - .4, x + .4, y + .4, .4):
            M.paint(M.disc(M.mask(), x, y, .22), (40, 32, 24)); M.paint(M.disc(M.mask(), x, y, .14), (255, 214, 140))

    # ---------- a noite ----------
    M.log('noite')
    luzes = [(p[0], p[1], 3.0, (1.0, .62, .32), .9) for p in lanternas]
    luzes += [(x, y, 3.6, (1.0, .55, .25), 1.0) for (x, y) in BRAS]
    luzes += [(x, y, 4.0, (1.0, .74, .45), .9) for (x, y) in POSTES]
    luzes += [(mx, my, 7, (1.0, .74, .42), 1.0), (ax, ay, 9, (1.0, .6, .3), .55), (TRIBUNA[0] + 3.5, TRIBUNA[1] + 3, 4.5, (1.0, .7, .4), .9)]
    luzes += [((a + c) / 2, (b + d) / 2, 2.0, (.7, 1.0, .7), .5) for (a, b, c, d), _, _ in PAINEIS]
    luzes += [(87, 16.5, 3, (1.0, .7, .4), .8), (98, 95.8, 2.6, (1.0, .7, .4), .9), (67, 96.8, 2.4, (1.0, .7, .4), .7), (6, 50, 3.0, (1.0, .6, .34), .8)]
    for (a, b, c, d) in casas:
        if r.random() < .5:
            y = d if b < 20 else b
            luzes.append((a + (c - a) * r.random(), y, 1.8, (1.0, .7, .38), .6))
    luz = np.zeros((M.HP, M.WP, 3), np.float32)
    for (x, y, rr, col, ii) in luzes:
        x0, y0_ = max(0, int((x - rr * 2) * S)), max(0, int((y - rr * 2) * S)); x1, y1_ = min(M.WP, int((x + rr * 2) * S)), min(M.HP, int((y + rr * 2) * S))
        if x1 <= x0 or y1_ <= y0_: continue
        yy, xx = np.mgrid[y0_:y1_, x0:x1].astype(np.float32)
        dd = np.sqrt((xx / S - x) ** 2 + (yy / S - y) ** 2) / rr
        luz[y0_:y1_, x0:x1] += (np.clip(1 - dd, 0, 1) ** 1.8 * ii)[..., None] * np.array(col, np.float32)
    amb = np.array([.40, .44, .58], np.float32)
    for r0 in range(0, M.HP, M.CH):
        r1 = min(M.HP, r0 + M.CH)
        M.cv[r0:r1] *= np.minimum(amb + luz[r0:r1] * 1.15, 1.45)
    del luz
    for p in lanternas:
        with M.roi(p[0] - .4, p[1] - .4, p[0] + .4, p[1] + .4, .4):
            M.paint(M.disc(M.mask(), p[0], p[1], .26), CORES_L[r.integers(len(CORES_L))], .85)
            M.paint(M.disc(M.mask(), p[0] - .06, p[1] - .06, .1), (255, 244, 210))
    for (x, y) in BRAS: M.paint(M.disc(M.mask(), x, y, .2), (255, 220, 150), .9) if False else None
    M.acabamento(desat=.9, tint=(1.0, .98, 1.02), vinheta=.3)
    M.salvar(out, previa)


if __name__ == '__main__':
    pintar(float(sys.argv[1]) if len(sys.argv) > 1 else 12, sys.argv[2] if len(sys.argv) > 2 else 'praca_prev.png', sys.argv[3] if len(sys.argv) > 3 else None)
