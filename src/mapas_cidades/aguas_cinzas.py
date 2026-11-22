"""Águas Cinzas — cidade pequena de bandidos, na beira de um lago (inspiração: Riften).
Pedido do Dalmo (21/nov/2026): ~40 casas; um canal no meio, com passarelas de madeira lá embaixo, junto da água; um rio
cruzando de oeste a leste; valas de esgoto a céu aberto; paliçada de madeira velha com 2 portões; ruelas e cantos
escuros; noite com névoa. Igreja pequena e malcuidada, bordel decadente e a entrada do esgoto (o covil fica numa cena à
parte). Pontos só marcados: o cais, o mercado de peixe, a taverna e a praça da forca.
110 x 96 quadrados de 5 m (550 m x 480 m), 32 px por quadrado. O resto (onde fica cada coisa) é proposta do Claude."""
import sys, math, json
import numpy as np, cv2
import motor as M

# o traçado é desenhado em "unidades de projeto" (110 x 96) e encolhido por F na hora de pintar; as casas (o casario do
# motor) ficam no tamanho de verdade, então a cidade fica apertada, com ruelas estreitas
F = 0.72
W2, H2 = 79, 69                                        # a cena: 79 x 69 quadrados de 5 m (395 m x 345 m)


class G:
    poly = staticmethod(lambda m, pts, v=255: M.poly(m, [(x * F, y * F) for x, y in pts], v))
    pline = staticmethod(lambda m, pts, w, v=255, closed=False: M.pline(m, [(x * F, y * F) for x, y in pts], w * F, v, closed))
    disc = staticmethod(lambda m, x, y, r, v=255: M.disc(m, x * F, y * F, r * F, v))
    ellipse = staticmethod(lambda m, x, y, rx, ry, ang=0, v=255: M.ellipse(m, x * F, y * F, rx * F, ry * F, ang, v))
    rect = staticmethod(lambda m, x0, y0, x1, y1, v=255: M.rect(m, x0 * F, y0 * F, x1 * F, y1 * F, v))
    rrect = staticmethod(lambda m, cx, cy, w, h, ang, v=255: M.rrect(m, cx * F, cy * F, w * F, h * F, ang, v))
    em = staticmethod(lambda m, x, y: M.em(m, x * F, y * F))
    roi = staticmethod(lambda x0, y0, x1, y1, pad=2.0: M.roi(x0 * F, y0 * F, x1 * F, y1 * F, pad * F))
    irregular = staticmethod(lambda m, amp=.35, escala=1.5, seed=5: M.irregular(m, amp * F, escala * F, seed))
    dil = staticmethod(lambda m, sq: M.dil(m, sq * F))
    ero = staticmethod(lambda m, sq: M.ero(m, sq * F))
    borda = staticmethod(lambda m, w=None: M.borda(m, (w or .04) * F))
    sombra = staticmethod(lambda m, dx, dy, blur, k, onde=None: M.sombra(m, dx * F, dy * F, blur * F, k, onde))
    noise = staticmethod(lambda scale, shape=None, seed=None: M.noise(scale * F, shape, seed))
    ruas_voronoi = staticmethod(lambda reg, e, l: M.ruas_voronoi(reg, lambda x, y: e(x / F, y / F) * F, lambda x, y: l(x / F, y / F) * F))
    lampioes = staticmethod(lambda pts, raio=.9, **kw: M.lampioes([(x * F, y * F) for x, y in pts], raio * F, **kw))
    pier = staticmethod(lambda x0, y0, x1, y1, ang_vertical=False: M.pier(x0 * F, y0 * F, x1 * F, y1 * F, ang_vertical))
    barco = staticmethod(lambda bx, by, bl, larg=.55, ang=0: M.barco(bx * F, by * F, bl * F, larg * F, ang))
    barraca = staticmethod(lambda x, y, w, h, cores=None: M.barraca(x * F, y * F, w * F, h * F, cores))
    ondas = staticmethod(lambda m, n, comp=.6, w=.06, **kw: M.ondas(m, n, comp * F, w * F, **kw))

W, H = 110, 96
CX = 55.0                                              # o eixo do canal (norte → sul)
CAN_HW, PASS_W, PAREDE_W, BEIRA_W = 2.2, 1.5, .7, 2.2  # meia-largura da água, passarela baixa, paredão, rua de cima


def lago_y(x): return 77.5 + 2.2 * math.sin(x / 8.5) + 1.4 * math.sin(x / 3.7 + 1)
def rio_y(x): return 36.5 + 3.6 * math.sin(x / 13.0 + .6) + .8 * math.sin(x / 5.3)
RIO_HW = 1.9
RIO = [(x, rio_y(x)) for x in np.arange(-3, W + 3, 1.5)]
CANAL = [(CX, -3), (CX, lago_y(CX) + 1.5)]
# a paliçada: aberta só para o lago (as pontas entram na água)
PALI = [(9, lago_y(9) + 2.2), (7.5, 62), (5.5, 46), (6, 30), (9.5, 16), (18, 7.5), (32, 5), (50, 4.5), (64, 4.6), (80, 6), (94, 10), (102, 20), (104.5, 36), (104, 52), (102.5, 66), (101, lago_y(101) + 2.2)]
PORT = {'Portão Norte': (45.0, 4.7), 'Portão Oeste': (5.8, 27.0)}

# os prédios: (nome, x0, y0, x1, y1, cor do telhado, lado da porta, tipo do interior ou None)
PREDIOS = [
    ('Igreja', 77, 15, 83, 24, (70, 70, 78), 's', 'templo'),
    ('Bordel', 35, 61.5, 44, 67.5, (110, 38, 46), 'n', 'bordel'),
    ('Taverna', 66.5, 60.5, 74.5, 66, (96, 70, 50), 'o', None),
]
TORRE = (78.5, 11.5, 81.5, 15)                          # o campanário, atrás (norte)
CEMITERIO = (85, 13, 93, 23)
FORCA = (44.5, 27.0)                                     # a praça da forca, junto do cruzamento canal × rio
BUEIRO = (CX - CAN_HW - .2, 46.0)                        # a boca do esgoto, no paredão oeste do canal
PONTES_CANAL = [14.0, 58.0]                              # pontes de madeira por cima do canal (além do cruzamento)
PONTES_RIO = [24.0, 86.0]

LUGARES = [
    ('O Canal', CX + 3.2, 22, 'O canal do meio da cidade. Lá embaixo, junto da água, correm as passarelas de madeira; em cima, as ruas.'),
    ('O Cruzamento', CX + 3.5, rio_y(CX) - 3.4, 'Onde o rio corta o canal. A água fica parada e cinza: é daqui que vem o nome da cidade.'),
    ('Praça da Forca', FORCA[0], FORCA[1] - 2.3, 'Pracinha de lama com a forca. Quase sempre tem alguém pendurado ou um aviso pregado.'),
    ('Entrada do esgoto', BUEIRO[0] - .6, BUEIRO[1], 'Uma grade enferrujada no paredão do canal, na altura da passarela. Dá no esgoto e no covil dos bandidos.'),
    ('Igreja', 80, 20, 'A igreja pequena e malcuidada. Poucos fiéis, um padre sozinho e uma cripta embaixo.'),
    ('Cemitério', 89, 18, 'O cemitério atrás da igreja, com cruzes tortas e covas rasas.'),
    ('Bordel', 39.5, 64.5, 'Casa velha de lanternas vermelhas. Ponto de encontro dos bandidos.'),
    ('Taverna', 70.5, 63.2, 'A taverna do cais. Cerveja ruim, mesa de dados e ouvidos atentos.'),
    ('O Cais', 30, lago_y(30) - 1.2, 'O cais de tábuas na beira do lago, com os píeres e os barcos.'),
    ('Mercado de peixe', 70, lago_y(70) - 1.5, 'Barracas de peixe no cais, abertas desde antes do sol nascer.'),
    ('Portão Norte', PORT['Portão Norte'][0], PORT['Portão Norte'][1] + 2.6, 'Saída para o norte, ao lado de onde o canal entra na cidade.'),
    ('Portão Oeste', PORT['Portão Oeste'][0] + 2.6, PORT['Portão Oeste'][1], 'Saída para o oeste, pela margem norte do rio.'),
]


def ad(nome):
    for p in PREDIOS:
        if p[0] == nome: return p


def pintar(S=8, out='aguas_prev.png', previa=None):
    M.setup(W2, H2, S, seed=20261121, fundo=(54, 58, 48))
    M.texturas_padrao()
    M.flat('grama_suja', (66, 70, 52), 12, .6, 31)
    M.flat('lama_rua', (78, 68, 54), 10, .5, 32)
    M.flat('lodo', (52, 62, 44), 8, .9, 33)
    M.flat('esgoto', (58, 64, 40), 10, 1.4, 34)
    M.flat('agua_cinza', (52, 62, 66), 6, 1.2, 35)
    M.stone('paredao', .28, (80, 80, 82), 14, (32, 32, 34), 36, .9, .25)
    M.stone('calcada', .32, (78, 76, 74), 12, (36, 34, 32), 37, 1.1, .12)
    M.planks('tabua', (92, 72, 52), .26, 38)
    M.planks('tabua_v', (92, 72, 52), .26, 39, vertical=True)
    tudo = G.rect(M.mask(), -1, -1, W + 1, H + 1)
    M.log('traçado')
    lago = G.poly(M.mask(), [(x, lago_y(x)) for x in np.arange(-2, W + 3, .5)] + [(W + 2, H + 2), (-2, H + 2)])
    rio = G.pline(M.mask(), RIO, 2 * RIO_HW)
    rio = G.irregular(rio, .35, 1.2, 7)
    can_agua = G.pline(M.mask(), CANAL, 2 * CAN_HW)
    can_pass = M.SUB(G.pline(M.mask(), CANAL, 2 * (CAN_HW + PASS_W)), can_agua)
    can_par = M.SUB(G.pline(M.mask(), CANAL, 2 * (CAN_HW + PASS_W + PAREDE_W)), G.pline(M.mask(), CANAL, 2 * (CAN_HW + PASS_W)))
    can_beira = M.SUB(G.pline(M.mask(), CANAL, 2 * (CAN_HW + PASS_W + PAREDE_W + BEIRA_W)), G.pline(M.mask(), CANAL, 2 * (CAN_HW + PASS_W + PAREDE_W)))
    agua = M.OR(lago, rio, can_agua)
    # onde o rio corta o canal, as passarelas e os paredões se abrem
    corte = G.pline(M.mask(), RIO, 2 * (RIO_HW + .6))
    can_pass = M.SUB(can_pass, corte); can_par = M.SUB(can_par, corte); can_beira = M.SUB(can_beira, G.dil(corte, .2))
    can_pass = M.SUB(can_pass, lago); can_par = M.SUB(can_par, lago); can_beira = M.SUB(can_beira, G.dil(lago, 1.5))
    dentro = G.poly(M.mask(), PALI)
    # ---- as ruas: as de cima do canal, as das margens do rio, as dos portões e as ruelas (voronoi) ----
    est = []                                            # (pts, meia-largura)
    est.append(([PORT['Portão Norte'], (45, 12), (46, 22), (FORCA[0], FORCA[1])], 1.2))
    est.append(([PORT['Portão Oeste'], (16, rio_y(16) - 5.5), (30, rio_y(30) - 5.3), (FORCA[0], FORCA[1])], 1.2))
    est.append(([(FORCA[0], FORCA[1]), (CX - 6.5, rio_y(CX - 6.5) - 3.5)], 1.2))
    est.append(([(CX + 6.5, rio_y(CX + 6.5) - 3.8), (70, rio_y(70) - 4.5), (88, rio_y(88) - 4.4), (100, rio_y(100) - 4.5)], 1.0))
    est.append(([(14, rio_y(14) + 5), (30, rio_y(30) + 5), (CX - 6.5, rio_y(CX - 6.5) + 4.0)], 1.0))
    est.append(([(CX + 6.5, rio_y(CX + 6.5) + 4.0), (78, rio_y(78) + 4.8), (98, rio_y(98) + 5)], 1.0))
    for xb in PONTES_RIO:                               # das pontes do rio para as ruas das margens
        est.append(([(xb, rio_y(xb) - 5), (xb, rio_y(xb) + 5)], 1.0))
    for yb in PONTES_CANAL:
        est.append(([(CX - 12, yb), (CX + 12, yb)], 1.0))
    est.append(([(80, 25), (80, 30), (80, rio_y(80) - 4.5)], 1.0))   # da igreja para o rio
    est.append(([(CX - 9, 58), (39.5, 60.5)], 1.0))                  # para o bordel
    ruas = M.mask()
    for pts, hw in est: G.pline(ruas, pts, 2 * hw)
    ruas = M.AND(ruas, G.dil(dentro, 1))
    # o cais (tábuas na beira do lago, dentro e um pouco fora da paliçada)
    cais = M.SUB(M.AND(G.poly(M.mask(), [(x, lago_y(x) - 3.2) for x in np.arange(10, 101, .5)] + [(x, lago_y(x) + .6) for x in np.arange(100, 9.5, -.5)]), G.dil(dentro, 1.5)), M.OR(can_agua, G.dil(can_par, .1)))
    # as ruelas: voronoi nos quarteirões
    terra = M.SUB(dentro, M.OR(G.dil(agua, 1.0), can_pass, can_par, can_beira, G.dil(cais, .2)))
    ruelas = G.ruas_voronoi(terra, lambda x, y: 7.5, lambda x, y: 1.1)
    ruelas = M.SUB(ruelas, G.dil(agua, .5))
    # ---- os prédios especiais ----
    pred = {p[0]: G.rect(M.mask(), *p[1:5]) for p in PREDIOS}
    torre = G.rect(M.mask(), *TORRE)
    especiais = M.OR(*pred.values(), torre)
    cemit = G.rect(M.mask(), *CEMITERIO)
    praca = G.disc(M.mask(), FORCA[0], FORCA[1], 3.2)
    adro = G.rect(M.mask(), 76, 24, 84, 27.5)
    # ---------- o chão ----------
    M.log('chão')
    M.paint(tudo, 'grama_suja')
    M.paint(((G.noise(2.5, seed=41) > .55) * 255).astype(np.uint8), 'lodo', .55)
    M.paint(M.AND(dentro, ((G.noise(4, seed=42) > .4) * 255).astype(np.uint8)), 'lama_rua', .5)
    fora = M.SUB(tudo, G.dil(dentro, 2))
    M.paint(M.AND(fora, ((G.noise(6, seed=43) > .55) * 255).astype(np.uint8)), 'grama_escura', .7)
    # charco na beira do lago, fora da paliçada
    charco = M.SUB(M.AND(G.dil(lago, 3), ((G.noise(2, seed=44) > .45) * 255).astype(np.uint8)), M.OR(lago, G.dil(dentro, 1)))
    M.paint(charco, 'lodo', .9)
    # ruas e ruelas: lama com pedras soltas
    M.paint(ruelas, 'lama'); M.paint(G.borda(G.dil(ruelas, .1), .12), (40, 34, 28), .4)
    M.paint(ruas, 'calcada'); M.paint(G.borda(G.dil(ruas, .15), .15), (36, 32, 28), .5)
    M.paint(M.AND(ruas, ((G.noise(1.2, seed=45) > .6) * 255).astype(np.uint8)), 'lama', .7)
    M.paint(praca, 'lama'); M.paint(M.AND(praca, ((G.noise(.8, seed=46) > .5) * 255).astype(np.uint8)), 'calcada', .6)
    M.paint(adro, 'calcada')
    M.paint(cemit, 'grama_escura'); M.paint(G.borda(cemit, .15), (70, 56, 40), .9)
    M.paint(can_beira, 'calcada'); M.paint(M.AND(can_beira, ((G.noise(1.4, seed=47) > .62) * 255).astype(np.uint8)), 'lama', .6)
    # ---------- as valas de esgoto (a céu aberto, descendo para o canal, o rio e o lago) ----------
    M.log('esgoto')
    VALAS = [
        [(30, 10), (34, 16), (38, 20), (CX - 4.6, 22)],
        [(14, 20), (20, 26), (24, rio_y(24) - 2)],
        [(70, 10), (66, 16), (CX + 4.6, 20)],
        [(96, 26), (90, 30), (92, rio_y(92) - 1.8)],
        [(16, 52), (24, 50), (28, 46), (30, rio_y(30) + 1.8)],
        [(28, 70), (34, 70.5), (40, 71.2), (44, lago_y(44) - .5)],
        [(50, 50), (CX - 4.6, 52)],
        [(64, 50), (CX + 4.6, 48)],
        [(92, 48), (86, 46), (80, rio_y(80) + 1.8)],
        [(96, 66), (90, 70), (86, lago_y(86) - .5)],
    ]
    vala = M.mask()
    for v in VALAS: G.pline(vala, M.suave(v, 3), 1.0)
    vala = M.SUB(vala, M.OR(agua, especiais))
    beira_v = M.SUB(G.dil(vala, .22), vala)
    M.paint(beira_v, (60, 50, 38), .9)
    M.paint(M.SUB(G.dil(beira_v, .15), G.dil(vala, .22)), 'lodo', .6)
    M.paint(vala, 'esgoto'); M.paint(vala, (82, 88, 44), .35)
    M.mul(np.where(G.borda(vala, .12) > 0, .72, 1).astype(np.float32))
    M.paint(M.AND(vala, ((G.noise(.4, seed=48) > .72) * 255).astype(np.uint8)), (96, 98, 56), .55)    # espuma de esgoto
    # a boca das valas: manchas de sujeira na água
    for v in VALAS:
        x, y = v[-1]
        mm = M.AND(G.disc(M.mask(), x, y, 2.2), agua)
        M.paint(mm, (64, 70, 46), .35)
    # pinguelas de tábua por cima das valas onde cruzam as ruas e as ruelas
    cruz = M.AND(G.dil(vala, .1), M.OR(ruas, ruelas))
    M.paint(cruz, 'tabua', .95); M.paint(G.borda(cruz, .05), (40, 30, 20), .7)
    # ---------- a água ----------
    M.log('água')
    M.paint(M.SUB(G.dil(rio, .6), M.OR(rio, can_par, can_pass)), 'lodo', .9)
    M.agua(agua, 'agua_cinza')
    G.ondas(agua, 400, cor=(96, 108, 110), a=.25)
    # o canal: passarela baixa (tábuas sobre estacas), paredão de pedra, a rua de cima
    M.paint(can_pass, 'tabua_v', 1)
    M.paint(G.borda(can_pass, .05), (36, 26, 18), .8)
    # estacas da passarela na água
    est_m = M.mask()
    for y in np.arange(1, lago_y(CX), 2.2):
        for sx in (-1, 1):
            G.disc(est_m, CX + sx * (CAN_HW - .05), y, .13)
    M.paint(M.SUB(est_m, G.dil(rio, .3)), (40, 30, 22))
    M.paint(can_par, 'paredao')
    M.paint(G.borda(can_par, .06), (24, 24, 26), .8)
    # sombra do paredão por cima da passarela (está mais fundo)
    sh = M.SUB(G.dil(can_par, .6), M.OR(can_par, can_beira))
    M.mul(np.where(sh > 0, .62, 1).astype(np.float32))
    M.mul(np.where(can_pass > 0, .82, 1).astype(np.float32))
    # escadinhas que descem da rua para a passarela
    for (x, y) in [(CX - 4.1, 9), (CX + 4.1, 26), (CX - 4.1, 44), (CX + 4.1, 66), (CX - 4.1, 70)]:
        s = 1 if x > CX else -1
        with G.roi(x - 2, y - 2, x + 2, y + 2, 1):
            m = G.rect(M.mask(), min(x, x - s * 1.6), y - .7, max(x, x - s * 1.6), y + .7)
            M.paint(m, 'paredao')
            st = M.mask()
            for t in np.arange(0, 1.6, .32): G.pline(st, [(x - s * t, y - .7), (x - s * t, y + .7)], .05)
            M.paint(M.AND(st, m), (30, 30, 32), .8)
    # ---------- as pontes ----------
    M.log('pontes')
    def ponte(p0, p1, larg=1.2):
        a, b = np.array(p0, float), np.array(p1, float); u = (b - a) / np.linalg.norm(b - a); n = np.array([-u[1], u[0]])
        with G.roi(min(a[0], b[0]) - 2, min(a[1], b[1]) - 2, max(a[0], b[0]) + 2, max(a[1], b[1]) + 2, 2):
            m = G.poly(M.mask(), [a - n * larg, b - n * larg, b + n * larg, a + n * larg])
            G.sombra(m, .35, .5, .2, .55)
            M.paint(m, (98, 76, 54))
            l = M.mask()
            L = np.linalg.norm(b - a)
            for t in np.arange(0, L, .24): c = a + u * t; G.pline(l, [c - n * larg, c + n * larg], .045)
            M.paint(M.AND(l, m), (48, 36, 26), .7)
            cor = M.OR(G.pline(M.mask(), [a - n * (larg - .08), b - n * (larg - .08)], .14), G.pline(M.mask(), [a + n * (larg - .08), b + n * (larg - .08)], .14))
            M.paint(cor, (64, 46, 30)); M.paint(G.borda(m, .04), (30, 22, 14), .8)
    lc = CAN_HW + PASS_W + PAREDE_W + .6
    for yb in PONTES_CANAL: ponte((CX - lc, yb), (CX + lc, yb), 1.25)
    for xb in PONTES_RIO: ponte((xb, rio_y(xb) - RIO_HW - 1.2), (xb, rio_y(xb) + RIO_HW + 1.2), 1.15)
    # o cruzamento: duas pontes grandes de tábua (uma por cima do rio a oeste e a leste do canal) e uma por cima do canal
    yc = rio_y(CX)
    ponte((CX - 6.5, yc - 3.5), (CX - 6.5, yc + 4.0), 1.3)
    ponte((CX + 6.5, yc - 3.8), (CX + 6.5, yc + 4.0), 1.3)
    ponte((CX - 6.5, yc - 4.2), (CX + 6.5, yc - 4.2), 1.2)
    ponte((CX - 6.5, yc + 4.8), (CX + 6.5, yc + 4.8), 1.2)
    # ---------- o cais, os píeres e os barcos ----------
    M.log('cais')
    G.sombra(cais, .2, .3, .15, .45)
    M.paint(cais, 'tabua'); M.paint(G.borda(cais, .06), (32, 24, 16), .8)
    PIERES = [16, 26, 36, 46, 64, 80, 92]
    for px in PIERES:
        y0 = lago_y(px) - .5
        G.pier(px - .8, y0, px + .8, y0 + 8 + 2 * M.rng.random(), ang_vertical=True)
    for k, px in enumerate(PIERES):
        y0 = lago_y(px)
        G.barco(px + 2.1, y0 + 4 + (k % 3), 3.2, .6, 90 + (k * 13) % 20 - 10)
        if k % 2: G.barco(px - 2.1, y0 + 6, 2.6, .5, 85)
    for (x, y, a) in [(30, 90, 30), (75, 91, -20), (52, 93, 70)]: G.barco(x, y, 3.0, .6, a)
    # mercado de peixe: barracas tortas no cais
    COR_P = [((86, 70, 56), (150, 136, 112)), ((70, 74, 80), (140, 130, 110)), ((96, 60, 46), (150, 136, 112))]
    for x in np.arange(62, 78, 2.3):
        y = lago_y(x) - 2.0
        G.barraca(x - .9, y - .7, 1.8, 1.3, COR_P)
    # caixas e redes no cais
    for k in range(26):
        x = 12 + M.rng.random() * 86; y = lago_y(x) - 1 - M.rng.random() * 1.8
        if abs(x - CX) < 6: continue
        with G.roi(x - 1, y - 1, x + 1, y + 1, .5):
            if k % 3 == 0:
                m = G.disc(M.mask(), x, y, .35); G.sombra(m, .1, .15, .05, .45); M.paint(m, (90, 66, 42)); M.paint(G.borda(m, .05), (40, 28, 18), .8)
            elif k % 3 == 1:
                m = G.rrect(M.mask(), x, y, .8, .8, M.rng.random() * 40); G.sombra(m, .1, .15, .05, .45); M.paint(m, (110, 84, 54)); M.paint(G.borda(m, .05), (44, 32, 20), .8)
            else:
                m = G.ellipse(M.mask(), x, y, .9, .5, M.rng.random() * 180); M.paint(m, (120, 112, 92), .7)
                nt = M.mask()
                for t in np.arange(-1, 1, .18): G.pline(nt, [(x + t, y - 1), (x + t + .5, y + 1)], .03); G.pline(nt, [(x + t, y + 1), (x + t + .5, y - 1)], .03)
                M.paint(M.AND(nt, m), (60, 56, 44), .8)
    # ---------- as casas ----------
    M.log('casas')
    dgrid = np.zeros((H2, W2), np.uint8)
    reservado = M.OR(G.dil(especiais, .8), cemit, G.dil(praca, .3), adro, G.dil(vala, .35))
    livre = M.SUB(G.ero(dentro, 1.8), M.OR(G.dil(agua, 1.3), G.dil(can_par, .3), can_pass, G.dil(can_beira, .2), G.dil(ruas, .3), G.dil(ruelas, .25), G.dil(cais, .4), reservado))
    PAR = {0: dict(depth=3.9, lot=4.6, second=True)}
    PAL = [(78, 60, 46), (66, 54, 44), (90, 72, 52), (58, 60, 62), (72, 76, 64), (84, 66, 50), (62, 50, 42), (74, 70, 66)]
    PW = {0: list(range(len(PAL)))}
    foot, colidx = M.casario_ret(livre, dgrid, PAR, PW, frente=.3, inner=True)
    # mais duas passadas: o que sobrou do quarteirão ganha casas de fundo e barracos, encostados (é uma cidade apertada)
    for par2 in (dict(depth=3.0, lot=3.6, second=True), dict(depth=2.4, lot=2.8, second=True)):
        sobra_l = M.SUB(livre, M.dil(foot, .45))
        f2, c2 = M.casario_ret(sobra_l, dgrid, {0: par2}, PW, frente=.05, inner=True)
        foot = M.OR(foot, f2); colidx[f2 > 0] = c2[f2 > 0]
    n, lab = cv2.connectedComponents(foot, connectivity=4)
    print('casas comuns:', n - 1)
    # se passar de 42, as sobras viram ruínas (casas queimadas) — dá o ar de cidade largada
    areas = np.bincount(lab.ravel(), minlength=n)
    ids = sorted(range(1, n), key=lambda i: -areas[i])
    ruina_ids = set(ids[44:50])
    sobra = np.isin(lab, ids[50:]).astype(np.uint8) * 255 if len(ids) > 50 else np.zeros_like(foot)
    foot = M.SUB(foot, sobra)
    barraco = G.ero(sobra, .35)
    ruina = np.isin(lab, list(ruina_ids)).astype(np.uint8) * 255 if ruina_ids else np.zeros_like(foot)
    foot = M.SUB(foot, ruina)
    print('casas de pé:', min(n - 1, 44), ' ruínas:', len(ruina_ids), ' barracos:', max(0, n - 1 - 50))
    for i, nome in enumerate([p[0] for p in PREDIOS]): colidx[pred[nome] > 127] = 20 + i
    colidx[torre > 127] = 30
    foot = M.OR(foot, especiais)
    PAL2 = PAL + [(0, 0, 0)] * (20 - len(PAL)) + [p[5] for p in PREDIOS] + [(0, 0, 0)] * (30 - 20 - len(PREDIOS)) + [(58, 58, 66)]
    # casas sobre estacas na beira da água: um deque de tábua na frente
    G.sombra(foot, .55, .7, .22, .55)
    M.telhados(foot, colidx, PAL2, course=.14, contraste=.3)
    # musgo nos telhados
    M.paint(M.AND(foot, ((G.noise(.9, seed=49) > .66) * 255).astype(np.uint8)), (70, 84, 56), .35)
    chm = M.chamines(foot, especiais, .14, (60, 56, 52))
    # as ruínas: só as paredes queimadas e entulho
    if ruina_ids:
        M.paint(ruina, (46, 42, 38), .9)
        M.paint(G.borda(ruina, .2), (70, 66, 62))
        M.paint(M.AND(ruina, ((G.noise(.5, seed=50) > .55) * 255).astype(np.uint8)), (30, 26, 24), .8)
    # os barracos e depósitos (tábua, mais baixos)
    G.sombra(barraco, .3, .4, .12, .5)
    M.paint(barraco, 'tabua'); M.mul(np.where(barraco > 0, .78, 1).astype(np.float32))
    M.paint(M.AND(barraco, ((G.noise(.6, seed=53) > .6) * 255).astype(np.uint8)), (58, 64, 46), .4)
    M.paint(G.borda(barraco, .06), (28, 20, 14), .9)
    # o campanário e a cruz torta
    with G.roi(*TORRE, 3):
        tm = G.rect(M.mask(), *TORRE)
        G.sombra(tm, 1.4, 1.8, .4, .55)
        M.telhado_local(tm, (58, 58, 66), course=.2, contraste=.45)
        tx, ty = (TORRE[0] + TORRE[2]) / 2, (TORRE[1] + TORRE[3]) / 2
        cr = M.OR(G.rrect(M.mask(), tx, ty, .22, 1.6, 8), G.rrect(M.mask(), tx, ty - .25, 1.0, .22, 8))
        M.paint(cr, (150, 140, 110))
    # o cemitério: cruzes tortas e covas
    for k in range(22):
        x = CEMITERIO[0] + .8 + (k % 6) * 1.25 + (M.rng.random() - .5) * .4
        y = CEMITERIO[1] + 1 + (k // 6) * 2.3 + (M.rng.random() - .5) * .4
        with G.roi(x - 1, y - 1, x + 1, y + 1, .5):
            cova = G.rrect(M.mask(), x, y + .45, .55, 1.0, (M.rng.random() - .5) * 12)
            M.paint(cova, (62, 52, 40), .8)
            a = (M.rng.random() - .5) * 30
            cr = M.OR(G.rrect(M.mask(), x, y - .25, .12, .7, a), G.rrect(M.mask(), x, y - .4, .45, .1, a))
            G.sombra(cr, .1, .12, .04, .5); M.paint(cr, (104, 96, 84) if k % 3 else (90, 70, 50))
    # a forca: estrado, poste e a corda
    fx, fy = FORCA
    with G.roi(fx - 3, fy - 3, fx + 3, fy + 3, 1):
        e = G.rect(M.mask(), fx - 1.3, fy - 1.0, fx + 1.3, fy + 1.0)
        G.sombra(e, .3, .4, .1, .55); M.paint(e, 'tabua'); M.paint(G.borda(e, .05), (30, 22, 14), .9)
        p = M.OR(G.rect(M.mask(), fx - 1.0, fy - .15, fx + .9, fy + .15), G.disc(M.mask(), fx - 1.0, fy, .22))
        G.sombra(p, .5, .7, .1, .6); M.paint(p, (70, 50, 32))
        M.paint(G.disc(M.mask(), fx + .7, fy + .1, .2), (150, 130, 90))
        M.paint(G.disc(M.mask(), fx + .7, fy + .1, .1), (40, 30, 20))
    # a boca do esgoto: um arco escuro com grade no paredão
    bx, by = BUEIRO
    with G.roi(bx - 2, by - 2, bx + 2, by + 2, 1):
        bo = G.rect(M.mask(), bx - PAREDE_W - .05, by - .9, bx + .1, by + .9)
        M.paint(bo, (14, 14, 14))
        gr = M.mask()
        for t in np.arange(by - .8, by + .9, .28): G.pline(gr, [(bx - PAREDE_W, t), (bx, t)], .07)
        M.paint(M.AND(gr, bo), (92, 66, 48))
    sl = M.AND(G.ellipse(M.mask(), bx + .8, by, 1.2, 1.0), can_pass)
    M.paint(sl, (50, 58, 36), .6)
    # bueiros menores (saídas do esgoto) nos paredões
    for (x, y) in [(CX + CAN_HW + .2, 12), (CX - CAN_HW - .2, 30), (CX + CAN_HW + .2, 54), (CX - CAN_HW - .2, 64)]:
        s = 1 if x > CX else -1
        with G.roi(x - 2, y - 2, x + 2, y + 2, 1):
            bo = G.rect(M.mask(), min(x, x + s * PAREDE_W), y - .45, max(x, x + s * PAREDE_W), y + .45)
            M.paint(bo, (18, 18, 18))
        M.paint(M.AND(G.ellipse(M.mask(), x - s * .9, y, 1.0, .6), M.OR(can_agua, can_pass)), (60, 66, 40), .5)
    # ---------- a paliçada ----------
    M.log('paliçada')
    gaps = []
    for nome, g in PORT.items(): gaps.append(g)
    def palicada(pts, gaps, r=.34):
        mk = M.mask()
        for p, u in M.ao_longo(pts, r * 1.7):
            if any(math.hypot(p[0] - g[0], p[1] - g[1]) < 1.9 for g in gaps): continue
            if G.em(agua, *p) and not G.em(lago, *p): continue
            G.disc(mk, p[0] + (M.rng.random() - .5) * .08, p[1] + (M.rng.random() - .5) * .08, r * (0.85 + .3 * M.rng.random()))
        G.sombra(mk, .35, .5, .15, .6)
        M.paint(mk, (88, 66, 44))
        M.paint(M.AND(mk, ((G.noise(.25, seed=51) > .5) * 255).astype(np.uint8)), (60, 46, 32), .6)
        M.paint(G.borda(mk, .05), (30, 22, 14), .9)
        for p, u in M.ao_longo(pts, r * 1.7):
            M.paint(G.disc(M.mask(), p[0] - .06, p[1] - .06, r * .35), (130, 104, 72), .6) if not any(math.hypot(p[0] - g[0], p[1] - g[1]) < 1.9 for g in gaps) else None
    pts_pali = []
    for a, b in zip(PALI, PALI[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1]); n_ = max(2, int(L / 1.0))
        for t in np.linspace(0, 1, n_, endpoint=False): pts_pali.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    pts_pali.append(PALI[-1])
    palicada(pts_pali, gaps)
    # torres de vigia de madeira e os portões
    for (x, y) in [(9.5, 16), (32, 5), (64, 4.6), (94, 10), (104.5, 36), (102.5, 66), (5.5, 46)]:
        with G.roi(x - 2, y - 2, x + 2, y + 2, 1.5):
            t = G.rect(M.mask(), x - 1.1, y - 1.1, x + 1.1, y + 1.1)
            G.sombra(t, .8, 1.1, .25, .55); M.telhado_local(t, (70, 56, 42), course=.16, contraste=.35); M.paint(G.borda(t, .06), (26, 20, 14), .9)
    for nome, (x, y) in PORT.items():
        with G.roi(x - 3, y - 3, x + 3, y + 3, 1.5):
            for dx, dy in ([(-2.2, 0), (2.2, 0)] if nome == 'Portão Norte' else [(0, -2.2), (0, 2.2)]):
                t = G.rect(M.mask(), x + dx - .9, y + dy - .9, x + dx + .9, y + dy + .9)
                G.sombra(t, .8, 1.1, .25, .55); M.telhado_local(t, (70, 56, 42), course=.16, contraste=.35); M.paint(G.borda(t, .06), (26, 20, 14), .9)
    # a grade onde o canal e o rio entram/saem pela paliçada
    for (x, y, vert) in [(CX, 4.55, False), (6.1, rio_y(6.1), True), (104.4, rio_y(104.4), True)]:
        with G.roi(x - 3, y - 3, x + 3, y + 3, 1):
            gr = M.mask()
            hw = CAN_HW if not vert else RIO_HW + .3
            for t in np.arange(-hw, hw + .01, .45):
                if vert: G.pline(gr, [(x - .5, y + t), (x + .5, y + t)], .12)
                else: G.pline(gr, [(x + t, y - .5), (x + t, y + .5)], .12)
            M.paint(gr, (70, 66, 62))
    # ---------- detalhes de beco: barris, caixotes, lixo, varais ----------
    M.log('detalhes')
    ys, xs = np.nonzero(M.SUB(G.dil(foot, .6), G.dil(foot, .2))[::int(S), ::int(S)] > 0)
    for j in M.rng.choice(len(xs), size=min(len(xs), 140), replace=False):
        x, y = (xs[j] + M.rng.random()) / F, (ys[j] + M.rng.random()) / F
        if G.em(agua, x, y) or not G.em(dentro, x, y): continue
        with G.roi(x - 1, y - 1, x + 1, y + 1, .5):
            r = M.rng.random()
            if r < .35:
                m = G.disc(M.mask(), x, y, .3); G.sombra(m, .08, .12, .04, .45); M.paint(m, (84, 62, 40)); M.paint(G.borda(m, .05), (36, 26, 16), .8)
            elif r < .6:
                m = G.rrect(M.mask(), x, y, .65, .65, M.rng.random() * 40); G.sombra(m, .08, .12, .04, .45); M.paint(m, (96, 74, 48)); M.paint(G.borda(m, .04), (40, 28, 18), .8)
            else:
                m = M.mask()
                for _ in range(5): G.ellipse(m, x + (M.rng.random() - .5) * .8, y + (M.rng.random() - .5) * .8, .18, .1, M.rng.random() * 180)
                M.paint(m, [(70, 66, 54), (90, 80, 60), (56, 60, 46)][int(M.rng.random() * 3)], .85)
    # varais entre casas (roupas velhas)
    for k in range(14):
        x, y = 10 + M.rng.random() * 90, 8 + M.rng.random() * 64
        if not G.em(ruelas, x, y): continue
        a = M.rng.random() * math.pi
        p0, p1 = (x - math.cos(a) * 1.8, y - math.sin(a) * 1.8), (x + math.cos(a) * 1.8, y + math.sin(a) * 1.8)
        with G.roi(x - 2.5, y - 2.5, x + 2.5, y + 2.5, .5):
            M.paint(G.pline(M.mask(), [p0, p1], .04), (40, 36, 30), .8)
            for t in np.linspace(.15, .85, 4):
                q = (p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t)
                M.paint(G.rrect(M.mask(), q[0], q[1] + .2, .35, .45, math.degrees(a)), [(110, 100, 84), (90, 70, 60), (70, 80, 90)][int(t * 9) % 3], .9)
    # árvores mortas e arbustos fora da paliçada; poucas árvores dentro
    SECAS = [(70, 76, 50), (60, 66, 44), (84, 82, 54), (52, 58, 42)]
    ocup = M.OR(G.dil(foot, .6), G.dil(ruas, .4), G.dil(ruelas, .3), G.dil(agua, .5), can_pass, can_par, can_beira, cais, cemit, praca, G.dil(vala, .3))
    tg = np.zeros((H2, W2), np.uint8)
    M.arvores_em(M.SUB(M.SUB(tudo, G.dil(dentro, 2.5)), M.OR(G.dil(agua, .3))), tg, {0: .08}, cores=SECAS, rmin=.9, rmax=1.6)
    M.arvores_em(M.SUB(dentro, ocup), tg, {0: .015}, cores=SECAS, rmin=.7, rmax=1.1)
    # ---------- as luzes (poucas: a cidade é escura) ----------
    lamps = [(CX - 4.3, y) for y in (6, 20, 32, 52, 66)] + [(CX + 4.3, y) for y in (12, 26, 44, 60, 72)]
    lamps += [(FORCA[0] + 2, FORCA[1] + 2), (16, rio_y(16) - 4), (80, 26), (PORT['Portão Norte'][0] + 1.6, PORT['Portão Norte'][1] + 1.6), (PORT['Portão Oeste'][0] + 1.6, PORT['Portão Oeste'][1] - 1.6)]
    lamps += [(x, lago_y(x) - 2.4) for x in (20, 40, 62, 72, 88)]
    G.lampioes(lamps, raio=.8, brilho=1.3)
    ta = ad('Taverna'); G.lampioes([(ta[1] - .7, ta[2] + 1), (ta[1] - .7, ta[4] - 1)], raio=.8, brilho=1.4)
    bo = ad('Bordel')
    G.lampioes([(bo[1] + 1.2, bo[2] - .6), (bo[3] - 1.2, bo[2] - .6), ((bo[1] + bo[3]) / 2, bo[2] - 1.8)], raio=.9, cor_luz=(0.6, 0.08, 0.06), brilho=1.5, cor=(255, 90, 80))
    G.lampioes([(77.5, 25), (82.5, 25)], raio=.6, brilho=1.0)
    M.fumaca([(x, y) for x, y in chm[:30]], .5, .25)
    # a névoa: manchas claras e frias, mais fortes sobre a água
    nv = G.noise(5, seed=52).astype(np.float32)
    nv = np.clip((nv - .45) * 2.2, 0, 1) * .22
    perto = cv2.GaussianBlur(agua, (0, 0), S * 2.2).astype(np.float32) / 255
    k = (nv * (.5 + perto * .9))[..., None]
    M.cv[:] = M.cv * (1 - k) + np.array([150, 160, 168], np.float32) * k
    M.acabamento(desat=.62, tint=(0.94, 0.98, 1.06), vinheta=.32)
    M.salvar(out, previa)


def portas():
    out = []
    for nome, x0, y0, x1, y1, cor, lado, tp in PREDIOS:
        if not tp: continue
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        x, y = {'s': (cx, y1 + .6), 'n': (cx, y0 - .6), 'l': (x1 + .6, cy), 'o': (x0 - .6, cy)}[lado]
        out.append(dict(nome=nome, x=x * F, y=y * F, w=round(x1 - x0), h=round(y1 - y0), p=lado, t=tp))
    return out


if __name__ == '__main__':
    S = float(sys.argv[1]) if len(sys.argv) > 1 else 8
    pintar(S, sys.argv[2] if len(sys.argv) > 2 else 'aguas_prev.png', sys.argv[3] if len(sys.argv) > 3 else None)
    json.dump(dict(W=W2, H=H2, F=F, lugares=[(n, x * F, y * F, t) for n, x, y, t in LUGARES], portas=portas(), pali=[(x * F, y * F) for x, y in PALI], portoes={k: (x * F, y * F) for k, (x, y) in PORT.items()}, bueiro=(BUEIRO[0] * F, BUEIRO[1] * F)), open('/home/claude/aguas/aguas_meta.json', 'w'), ensure_ascii=False)
