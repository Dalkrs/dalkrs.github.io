"""Raiz Fronteira — cidade murada da fronteira norte (perto do Forte do Norte).
Pedido do Dalmo (25/nov/2026): ~100 casas, bem povoada; zona dos inventores com tecnologia magitec (metal e linhas de luz
da era antiga) e uma grande academia nessa zona; um rio que passa ao lado da muralha e serve de esgoto da cidade (a
muralha tem uma abertura por onde sai o esgoto); estalagem de luxo; bairro pobre colado à muralha; muralha de pedra alta
com torres; praça com mercado, templo, quartel da guarda, ferraria e lojas; dia de outono.
150 x 124 quadrados de 5 m (750 m x 620 m), 32 px por quadrado. Onde fica cada coisa é proposta do Claude."""
import sys, math, json
import numpy as np, cv2
import motor as M

# o traçado é desenhado em unidades de projeto (150 x 124) e encolhido por F na hora de pintar; as casas ficam no tamanho
# de verdade, então a cidade fica mais apertada e com umas 100 casas
F = 0.76
W2, H2 = 114, 94                                       # a cena: 114 x 94 quadrados de 5 m (570 m x 470 m)


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
    fonte = staticmethod(lambda x, y, r, estatua=False: M.fonte(x * F, y * F, r * F, estatua))
    arvore = staticmethod(lambda x, y, r, cor, flor=None: M.arvore(x * F, y * F, r * F, cor, flor))
    muralha = staticmethod(lambda pl, w, gaps, closed=True, lado=None, **kw: M.muralha([(x * F, y * F) for x, y in pl], w * F, gaps, closed, lado=(lado[0] * F, lado[1] * F) if lado else None, **kw))
    gaps_de = staticmethod(lambda pts, r: M.gaps_de([(x * F, y * F) for x, y in pts], r * F))
    torres_ao_longo = staticmethod(lambda pl, cada, gates, closed=True, dist=5: [(x / F, y / F) for x, y in M.torres_ao_longo([(x * F, y * F) for x, y in pl], cada * F, [(x * F, y * F) for x, y in gates], closed, dist=dist * F)])
    torre_redonda = staticmethod(lambda x, y, r, **kw: M.torre_redonda(x * F, y * F, r * F, **kw))
    portao = staticmethod(lambda x, y, pl, r, closed=True, **kw: M.portao(x * F, y * F, [(a * F, b * F) for a, b in pl], r * F, closed, **kw))
    lampioes_rua = staticmethod(lambda linhas, cada=9, ok=None: [(x / F, y / F) for x, y in M.lampioes_rua([([(a * F, b * F) for a, b in pts], hw * F) for pts, hw in linhas], cada * F, (lambda q: ok((q[0] / F, q[1] / F))) if ok else None)])

W, H = 150, 124
MURO = [(14, 22), (22, 12), (40, 8), (70, 7), (100, 8), (118, 12), (126, 22), (128, 50), (128, 80), (126, 104), (118, 113),
        (96, 116), (66, 117), (38, 116), (20, 110), (13, 96), (11, 70), (12, 44)]
def seg(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
PORT = {'Portão Norte': seg((40, 8), (70, 7), .55), 'Portão Oeste': seg((11, 70), (12, 44), .5), 'Portão Sul': seg((66, 117), (38, 116), .2)}
ESGOTO_SAIDA = seg((128, 80), (126, 104), .3)               # a abertura do esgoto na muralha leste
def rio_x(y): return 138.5 + 2.4 * math.sin(y / 13.0) + .9 * math.sin(y / 4.7)
RIO = [(rio_x(y), y) for y in np.arange(-3, H + 3, 1.5)]
RIO_HW = 3.6
PRACA = (62.0, 62.0, 8.5)
# a vala do esgoto: desce do centro, atravessa o bairro pobre e sai pela abertura da muralha
VALA = [(70, 68), (78, 74), (88, 80), (98, 84), (110, 86), (120, 87), ESGOTO_SAIDA, (ESGOTO_SAIDA[0] + 4, ESGOTO_SAIDA[1] + .5), (rio_x(ESGOTO_SAIDA[1]) - RIO_HW + .4, ESGOTO_SAIDA[1] + 1)]
ZONA_INV = [(78, 9), (100, 8.5), (118, 12.5), (125.5, 22), (127, 50), (100, 52), (80, 46)]           # a zona dos inventores
POBRE = [(90, 70), (127.5, 68), (127, 80), (126, 104), (118, 112.5), (96, 115.5), (88, 102), (86, 84)]  # o bairro pobre

# (nome, x0, y0, x1, y1, cor do telhado, lado da porta, tipo do interior ou None)
PREDIOS = [
    ('Academia', 97, 17, 116, 31, (78, 90, 110), 's', 'senhor'),
    ('Estalagem de luxo', 34, 50, 46, 59, (150, 62, 50), 'l', 'taverna'),
    ('Taverna do Bueiro', 103, 92, 110, 97, (104, 86, 66), 'n', 'taverna'),
    ('Templo', 58, 39, 66, 49, (84, 86, 98), 's', None),
    ('Mercado', 58.5, 58.5, 65.5, 63.5, (150, 104, 62), 's', None),
    ('Quartel da guarda', 44, 101, 55, 108, (92, 86, 82), 'l', None),
    ('Ferraria', 64, 95, 70, 100, (72, 68, 66), 'o', None),
    ('Oficina do Cristal', 83, 16, 91, 22, (86, 98, 116), 's', None),
    ('Oficina das Engrenagens Vivas', 84, 33, 92, 39, (96, 104, 118), 'n', None),
    ('Galpão dos Autômatos', 106, 40, 118, 47, (82, 92, 108), 'n', None),
]
OBSERVATORIO = (93.0, 24.0, 3.3)                            # a torre redonda do observatório, colada na academia
PATIO_ACAD = (97, 31, 116, 37)
JARDIM_EST = (34, 59, 46, 66)
PATIO_QUARTEL = (44, 95.5, 55, 101)
INT = {'Academia': (14, 11), 'Estalagem de luxo': (11, 8), 'Taverna do Bueiro': (7, 5)}   # tamanho da planta de dentro

LUGARES = [
    ('Praça do Mercado', PRACA[0], PRACA[1] - 5.5, 'A praça do meio da cidade, com o salão do mercado e as barracas.'),
    ('Mercado', 62, 61, 'O salão do mercado.'),
    ('Templo', 62, 44, 'O templo da cidade, de frente para a praça.'),
    ('Zona dos Inventores', 104, 48.5, 'O bairro dos inventores: oficinas de metal, cristais e linhas de luz da era antiga (magitec).'),
    ('Academia', 106.5, 24, 'A grande academia dos inventores, com o pátio de testes e o observatório.'),
    ('Observatório', OBSERVATORIO[0], OBSERVATORIO[1], 'A torre redonda da academia, com a lente no alto.'),
    ('Oficina do Cristal', 87, 19, 'Oficina que lapida e carrega cristais magitec.'),
    ('Oficina das Engrenagens Vivas', 88, 36, 'Oficina de peças magitec que se mexem sozinhas.'),
    ('Galpão dos Autômatos', 112, 43.5, 'Galpão grande onde montam autômatos com peças das ruínas.'),
    ('Estalagem de luxo', 40, 54.5, 'A estalagem mais cara da cidade, com jardim e fonte. Mercadores e nobres de passagem.'),
    ('Bairro pobre', 108, 76, 'O distrito pobre, colado na muralha leste. Barracos apertados e a vala do esgoto no meio.'),
    ('Taverna do Bueiro', 106.5, 94.5, 'A taverna do bairro pobre (nome proposto).'),
    ('Saída do esgoto', ESGOTO_SAIDA[0] - 1.5, ESGOTO_SAIDA[1] - 1.5, 'A abertura na muralha por onde o esgoto da cidade cai no rio. Tem grade, mas está velha.'),
    ('Quartel da guarda', 49.5, 104.5, 'O quartel da guarda, junto do Portão Sul.'),
    ('Ferraria', 67, 97.5, 'A ferraria, na rua das lojas.'),
    ('Rua das Lojas', 62, 86, 'A rua que desce da praça para o Portão Sul, cheia de lojas.'),
    ('Portão Norte', PORT['Portão Norte'][0], PORT['Portão Norte'][1] + 2.8, 'Saída para o norte, para o Forte do Norte.'),
    ('Portão Oeste', PORT['Portão Oeste'][0] + 2.8, PORT['Portão Oeste'][1], 'Saída para o oeste.'),
    ('Portão Sul', PORT['Portão Sul'][0], PORT['Portão Sul'][1] - 2.8, 'A entrada principal.'),
    ('O Rio', rio_x(30) - 1, 30, 'O rio corre colado na muralha leste. Rio abaixo da saída do esgoto, a água é suja.'),
]


def ad(nome):
    for p in PREDIOS:
        if p[0] == nome: return p


def pintar(S=8, out='raiz_prev.png', previa=None):
    M.setup(W2, H2, S, seed=20261125, fundo=(96, 92, 56))
    M.texturas_padrao()
    M.flat('grama_outono', (112, 106, 62), 14, 0.6, 21)
    M.flat('grama_seca', (134, 118, 70), 12, 0.5, 22)
    M.flat('horta', (88, 72, 50), 10, 0.4, 24)
    M.flat('lama_p', (104, 88, 66), 10, 0.6, 25)
    M.flat('esgoto', (82, 86, 52), 10, 1.3, 26)
    M.stone('adro', 0.5, (112, 106, 100), 12, (52, 50, 48), 27, 1.2)
    M.stone('placas', 1.0, (104, 112, 120), 8, (52, 58, 66), 28, 1.6, .05)      # o chão de placas magitec
    tudo = G.rect(M.mask(), -1, -1, W + 1, H + 1)
    M.log('traçado')
    dentro = G.poly(M.mask(), MURO)
    zona = M.AND(G.poly(M.mask(), ZONA_INV), G.ero(dentro, 1.5))
    pobre = M.AND(G.poly(M.mask(), POBRE), G.ero(dentro, 1.5))
    rio = G.irregular(G.pline(M.mask(), RIO, 2 * RIO_HW), .3, 1.3, 7)
    praca = G.disc(M.mask(), PRACA[0], PRACA[1], PRACA[2])
    # ---- as ruas principais ----
    pn, po, ps = PORT['Portão Norte'], PORT['Portão Oeste'], PORT['Portão Sul']
    est = [([(pn[0], pn[1] - 4), pn, (pn[0] + 1, 20), (60, 32), (62, 39)], 1.5),
           ([(po[0] - 4, po[1]), po, (26, 58), (40, 60.5), (PRACA[0] - PRACA[2] + .5, 62)], 1.5),
           ([(ps[0], ps[1] + 4), ps, (59, 104), (61, 88), (62, PRACA[1] + PRACA[2] - .5)], 1.6),
           ([(PRACA[0] + PRACA[2] - .5, 58), (76, 52), (88, 45), (96, 41), (106, 38.5)], 1.4),      # para a zona dos inventores
           ([(68, 40), (76, 30), (86, 27), (96, 27)], 1.1),
           ([(PRACA[0] + 6, PRACA[1] + 6), (78, 74), (88, 78)], 1.1),                                 # para o bairro pobre
           ([(62, 39), (66, 39)], 1.0),
           ([(40, 60.5), (40, 34), (52, 26), (60, 32)], 1.0),
           ([(26, 58), (24, 84), (40, 96), (58, 100)], 1.0),
           ([(61, 88), (76, 92), (88, 96)], 1.0),
           ([(96, 41), (100, 52), (98, 64), (90, 70)], 1.0)]
    ruas = M.mask()
    for pts, hw in est: G.pline(ruas, pts, 2 * hw)
    ruas = M.AND(ruas, G.dil(dentro, 1.6))
    # ---- os prédios especiais e os pátios ----
    pred = {p[0]: G.rect(M.mask(), *p[1:5]) for p in PREDIOS}
    obs = G.disc(M.mask(), *OBSERVATORIO)
    especiais = M.OR(*pred.values(), obs)
    patio_a = G.rect(M.mask(), *PATIO_ACAD)
    jard = G.rect(M.mask(), *JARDIM_EST)
    patio_q = G.rect(M.mask(), *PATIO_QUARTEL)
    adro = G.rect(M.mask(), 56, 49, 68, 53.5)
    patio_f = G.rect(M.mask(), 70, 95, 73, 100)
    # ---- ruelas (voronoi): normais, apertadas no bairro pobre ----
    terra = M.SUB(G.ero(dentro, 1.6), M.OR(G.dil(ruas, .3), G.dil(especiais, 1.0), patio_a, jard, patio_q, adro, G.dil(praca, .8)))
    ruelas = G.ruas_voronoi(M.SUB(terra, pobre), lambda x, y: 11.0, lambda x, y: 1.05)
    becos = G.ruas_voronoi(M.AND(terra, pobre), lambda x, y: 6.5, lambda x, y: .75)
    vala = G.pline(M.mask(), M.suave(VALA, 3), 1.2)
    # ---------- o chão ----------
    M.log('chão')
    M.paint(tudo, 'grama_outono')
    M.paint(((G.noise(3.0, seed=41) > 0.58) * 255).astype(np.uint8), 'grama_seca', .7)
    fora = M.SUB(tudo, G.dil(dentro, 3))
    M.paint(M.AND(M.SUB(fora, G.dil(rio, 3)), ((G.noise(9, seed=5) > .5) * 255).astype(np.uint8)), 'horta', .7)
    M.paint(M.AND(pobre, dentro), 'lama_p', .9)
    M.paint(M.AND(M.AND(pobre, dentro), ((G.noise(1.2, seed=42) > .55) * 255).astype(np.uint8)), 'terra', .6)
    M.paint(M.AND(zona, ((G.noise(2, seed=43) > .5) * 255).astype(np.uint8)), 'terra', .35)
    M.paint(ruelas, 'rua'); M.paint(G.borda(G.dil(ruelas, .1), .12), (60, 58, 58), .45)
    M.paint(becos, 'lama'); M.paint(G.borda(G.dil(becos, .08), .1), (60, 48, 36), .5)
    rz = M.AND(ruas, zona)
    M.paint(M.SUB(ruas, rz), 'rua_grande'); M.paint(G.borda(G.dil(ruas, .2), .2), (70, 66, 60), .6)
    M.paint(rz, 'placas')
    M.paint(praca, 'praca'); M.paint(adro, 'adro')
    M.paint(patio_a, 'placas'); M.paint(G.borda(patio_a, .2), (70, 76, 86), .8)
    M.paint(jard, 'jardim'); M.paint(patio_q, 'terra'); M.paint(patio_f, 'terra')
    # ---------- o rio e a vala do esgoto ----------
    M.log('água')
    M.paint(M.SUB(G.dil(rio, 1.2), rio), 'lama_p', .8)
    M.agua(rio)
    G.ondas(rio, 500)
    # a água suja rio abaixo da saída do esgoto
    yy, xx = np.mgrid[0:M.HP, 0:M.WP]
    suja = (np.clip((yy / S / F - ESGOTO_SAIDA[1]) / 30, 0, 1) * (yy / S / F > ESGOTO_SAIDA[1] - 1)).astype(np.float32)
    suja = (suja * (rio > 0) * 255 * .55).astype(np.uint8)
    M.paint(suja, (84, 92, 58), 1)
    del yy, xx
    M.paint(M.SUB(G.dil(vala, .3), vala), (78, 64, 46), .9)
    M.paint(vala, 'esgoto'); M.paint(vala, (90, 96, 50), .3)
    M.mul(np.where(G.borda(vala, .15) > 0, .7, 1).astype(np.float32))
    cruz = M.AND(G.dil(vala, .1), M.OR(ruas, ruelas, becos))
    M.paint(cruz, (110, 84, 56), .95); M.paint(G.borda(cruz, .05), (40, 28, 18), .7)
    # ---------- as casas ----------
    M.log('casas')
    dgrid = np.zeros((H2, W2), np.uint8)
    dgrid[(zona > 0)[::int(S), ::int(S)][:H2, :W2]] = 1
    dgrid[(pobre > 0)[::int(S), ::int(S)][:H2, :W2]] = 2
    reservado = M.OR(G.dil(especiais, .8), patio_a, jard, patio_q, adro, patio_f, G.dil(praca, .3), G.dil(vala, .4))
    livre = M.SUB(G.ero(dentro, 2.0), M.OR(G.dil(ruas, .3), G.dil(ruelas, .25), G.dil(becos, .15), reservado, G.dil(rio, 1)))
    PAR = {0: dict(depth=3.3, lot=4.6, second=False), 1: dict(depth=3.6, lot=5.0, second=False), 2: dict(depth=2.3, lot=2.8, second=True)}
    PAL = [(150, 84, 56), (132, 70, 50), (160, 104, 62), (118, 82, 58), (104, 92, 76), (142, 118, 80), (96, 70, 56), (170, 92, 52),
           (86, 98, 116), (100, 110, 124), (74, 86, 104), (112, 120, 128),                     # metal (zona dos inventores)
           (116, 98, 74), (102, 90, 72), (124, 110, 84), (92, 80, 64)]                          # palha e tábua (bairro pobre)
    PW = {0: list(range(8)), 1: [8, 9, 10, 11], 2: [12, 13, 14, 15]}
    foot, colidx = M.casario_ret(livre, dgrid, PAR, PW, frente=.35, inner=True)
    n, lab = cv2.connectedComponents(foot, connectivity=4)
    zl = cv2.resize(dgrid, (M.WP, M.HP), interpolation=cv2.INTER_NEAREST)
    cont = {0: 0, 1: 0, 2: 0}
    for i in range(1, n):
        ys, xs = np.nonzero(lab == i)
        cont[int(zl[ys[0], xs[0]])] += 1
    print('casas comuns:', n - 1, cont)
    for i, nome in enumerate([p[0] for p in PREDIOS]): colidx[pred[nome] > 127] = 20 + i
    colidx[obs > 127] = 31
    foot_c = foot
    foot = M.OR(foot, especiais)
    PAL2 = PAL + [(0, 0, 0)] * (20 - len(PAL)) + [p[5] for p in PREDIOS] + [(0, 0, 0)] * (31 - 20 - len(PREDIOS)) + [(70, 80, 100)]
    G.sombra(foot, .5, .62, .2, .45)
    M.telhados(foot, colidx, PAL2)
    # remendos e palha velha nos telhados pobres
    M.paint(M.AND(M.AND(foot_c, pobre), ((G.noise(.6, seed=44) > .62) * 255).astype(np.uint8)), (80, 70, 56), .45)
    chm = M.chamines(M.SUB(foot, zona), especiais, .1)
    # ---------- magitec: linhas de luz nos telhados e nas ruas da zona, cristais, a lente do observatório ----------
    M.log('magitec')
    luz = M.mask()
    tz = M.AND(foot, zona)
        # linhas no meio dos telhados de metal (as cumeeiras brilham)
    for p in PREDIOS:
        if p[0] in ('Academia', 'Oficina do Cristal', 'Oficina das Engrenagens Vivas', 'Galpão dos Autômatos'):
            x0, y0, x1, y1 = p[1:5]
            if x1 - x0 >= y1 - y0: G.pline(luz, [(x0 + .6, (y0 + y1) / 2), (x1 - .6, (y0 + y1) / 2)], .14)
            else: G.pline(luz, [((x0 + x1) / 2, y0 + .6), ((x0 + x1) / 2, y1 - .6)], .14)
            G.pline(luz, [(x0 + .3, y0 + .3), (x1 - .3, y0 + .3), (x1 - .3, y1 - .3), (x0 + .3, y1 - .3), (x0 + .3, y0 + .3)], .08)
    # sulcos de luz nas ruas de placas e no pátio da academia
    for pts, hw in est[3:5]:
        for s in (-1, 1):
            q = []
            for a, b in zip(pts, pts[1:]):
                u = np.array(b) - np.array(a); u = u / np.linalg.norm(u); nn = np.array([-u[1], u[0]])
                q += [tuple(np.array(a) + nn * s * (hw - .35)), tuple(np.array(b) + nn * s * (hw - .35))]
            G.pline(luz, q, .07)
    for x in np.arange(PATIO_ACAD[0] + 1.5, PATIO_ACAD[2] - 1, 2.0): G.pline(luz, [(x, PATIO_ACAD[1] + .6), (x, PATIO_ACAD[3] - .6)], .06)
    luz = M.AND(luz, G.dil(zona, 1))
    glow = cv2.GaussianBlur(luz, (0, 0), S * .35)
    M.paint(np.clip(glow.astype(np.float32) * 2.2, 0, 255).astype(np.uint8), (90, 210, 235), .55)
    M.paint(luz, (190, 250, 255), .95)
    # o observatório: cúpula de metal com a lente
    ox, oy, orr = OBSERVATORIO
    with G.roi(ox - orr - 2, oy - orr - 2, ox + orr + 2, oy + orr + 2, 2):
        d = G.disc(M.mask(), ox, oy, orr)
        G.sombra(d, 1.3, 1.7, .4, .55)
        M.paint(d, (92, 104, 124))
        aneis = M.mask()
        for r in (orr * .85, orr * .55): G.disc(aneis, ox, oy, r);
        M.paint(G.borda(aneis, .1), (60, 70, 88), .8)
        fenda = G.rrect(M.mask(), ox + orr * .3, oy - orr * .3, orr * 1.1, .7, -45)
        M.paint(M.AND(fenda, d), (34, 40, 52))
        M.paint(G.disc(M.mask(), ox + orr * .35, oy - orr * .35, .45), (170, 240, 255))
        M.paint(G.borda(d, .08), (30, 34, 44), .9)
    # pilares de cristal (postes magitec) na zona, e o grande cristal no pátio da academia
    pil = []
    for pts, hw in est[3:5]:
        for a, b in zip(pts, pts[1:]):
            L = math.hypot(b[0] - a[0], b[1] - a[1])
            for t in np.arange(2.5, L, 6.0):
                u = ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
                pil.append((a[0] + u[0] * t - u[1] * (hw + .5), a[1] + u[1] * t + u[0] * (hw + .5)))
    pil += [(PATIO_ACAD[0] + 1, PATIO_ACAD[1] + 1), (PATIO_ACAD[2] - 1, PATIO_ACAD[1] + 1), (PATIO_ACAD[0] + 1, PATIO_ACAD[3] - 1), (PATIO_ACAD[2] - 1, PATIO_ACAD[3] - 1)]
    for (x, y) in pil:
        with G.roi(x - 1, y - 1, x + 1, y + 1, .5):
            b = G.disc(M.mask(), x, y, .38); G.sombra(b, .2, .3, .08, .5); M.paint(b, (70, 78, 92)); M.paint(G.borda(b, .05), (30, 34, 40), .9)
            c = G.rrect(M.mask(), x, y, .3, .5, 45); M.paint(c, (150, 236, 255))
    cx, cy = (PATIO_ACAD[0] + PATIO_ACAD[2]) / 2, (PATIO_ACAD[1] + PATIO_ACAD[3]) / 2
    with G.roi(cx - 3, cy - 3, cx + 3, cy + 3, 1):
        base = G.disc(M.mask(), cx, cy, 1.6); G.sombra(base, .2, .3, .1, .5); M.paint(base, 'muro'); M.paint(G.borda(base, .1), (40, 40, 46), .9)
        cr = G.poly(M.mask(), [(cx, cy - 1.3), (cx + .7, cy), (cx, cy + 1.3), (cx - .7, cy)])
        G.sombra(cr, .5, .7, .1, .5); M.paint(cr, (120, 220, 245)); M.paint(G.poly(M.mask(), [(cx, cy - 1.3), (cx + .7, cy), (cx, cy)]), (200, 250, 255), .8)
    G.lampioes(pil + [(cx, cy)] * 2 + [(ox + orr * .35, oy - orr * .35)], raio=.8, cor_luz=(0.08, 0.42, 0.55), brilho=1.4, cor=(150, 240, 255))
    # o pátio dos autômatos: peças e carcaças de metal
    for k in range(16):
        x, y = 106 + M.rng.random() * 12, 47.6 + M.rng.random() * 3
        if not G.em(dentro, x, y) or G.em(foot, x, y): continue
        with G.roi(x - 1, y - 1, x + 1, y + 1, .5):
            m = G.rrect(M.mask(), x, y, .5 + M.rng.random() * .6, .4 + M.rng.random() * .4, M.rng.random() * 90)
            G.sombra(m, .1, .15, .05, .5); M.paint(m, [(110, 118, 128), (86, 92, 100), (140, 120, 90)][k % 3]); M.paint(G.borda(m, .04), (30, 32, 36), .9)
    # ---------- os detalhes dos outros lugares ----------
    M.log('detalhes')
    # o mercado: barracas em volta
    COR_OUT = [((176, 96, 40), (220, 200, 160)), ((150, 50, 40), (220, 200, 160)), ((190, 140, 50), (110, 50, 36)), ((60, 90, 120), (220, 200, 160))]
    for a in np.arange(0, 360, 360 / 22):
        x, y = PRACA[0] + 6.4 * math.cos(math.radians(a)), PRACA[1] + 6.4 * math.sin(math.radians(a))
        if G.em(G.dil(ruas, .1), x, y) and not G.em(praca, x, y): continue
        if any(abs(((a - b + 180) % 360) - 180) < 12 for b in (90, 180, 270, 325)): continue
        G.barraca(x - .8, y - .6, 1.6, 1.2, COR_OUT)
    G.fonte(PRACA[0] - 4.5, PRACA[1] + 3.5, .9)
    # o jardim da estalagem: canteiros, árvores e a fonte
    je = JARDIM_EST
    G.fonte((je[0] + je[2]) / 2, (je[1] + je[3]) / 2, 1.1, estatua=True)
    fl = M.mask()
    for k in range(160): G.disc(fl, je[0] + .5 + M.rng.random() * (je[2] - je[0] - 1), je[1] + .5 + M.rng.random() * (je[3] - je[1] - 1), .16)
    fl = M.SUB(fl, G.disc(M.mask(), (je[0] + je[2]) / 2, (je[1] + je[3]) / 2, 2.0))
    M.paint(fl, (200, 120, 50), .9)
    M.paint(G.borda(jard, .25), 'muro')
    # o quartel: bonecos de treino e alvos no pátio
    for x in (45.5, 47.5, 49.5):
        M.paint(G.disc(M.mask(), x, 98, .4), (150, 120, 80)); M.paint(G.disc(M.mask(), x, 98, .18), (90, 60, 40))
    for x in (52, 54):
        M.paint(G.disc(M.mask(), x, 97, .5), (200, 190, 170)); M.paint(G.disc(M.mask(), x, 97, .3), (170, 50, 40)); M.paint(G.disc(M.mask(), x, 97, .12), (220, 210, 190))
    M.paint(G.borda(patio_q, .2), (100, 76, 48), .9)
    # a forja
    M.paint(G.disc(M.mask(), 71.5, 98.5, .8), (40, 36, 34))
    M.paint(G.rect(M.mask(), 70.6, 96, 72.2, 96.6), (70, 70, 76))
    # bancas das lojas na rua do Portão Sul (toldos)
    for y in np.arange(72, 94, 3.2):
        for s in (-1, 1):
            x = 61 + s * 2.6 + (y - 88) * -.05
            if G.em(foot, x + s * .9, y) and M.rng.random() < .7:
                G.barraca(x - .7, y - .5, 1.4, 1.0, COR_OUT)
    # o bairro pobre: varais, lixo, barris
    for k in range(60):
        x, y = 90 + M.rng.random() * 36, 70 + M.rng.random() * 44
        if not G.em(pobre, x, y) or G.em(foot, x, y) or G.em(vala, x, y): continue
        with G.roi(x - 1, y - 1, x + 1, y + 1, .5):
            if k % 3 == 0:
                m = G.disc(M.mask(), x, y, .28); G.sombra(m, .08, .12, .04, .45); M.paint(m, (84, 62, 40)); M.paint(G.borda(m, .05), (36, 26, 16), .8)
            else:
                m = M.mask()
                for _ in range(4): G.ellipse(m, x + (M.rng.random() - .5) * .7, y + (M.rng.random() - .5) * .7, .16, .09, M.rng.random() * 180)
                M.paint(m, [(70, 66, 54), (90, 80, 60), (56, 60, 46)][k % 3], .85)
    # ---------- a muralha ----------
    M.log('muralha')
    gates = list(PORT.values())
    G.muralha(MURO, 1.5, G.gaps_de(gates, 1.7), closed=True, lado=PRACA[:2])
    for p in G.torres_ao_longo(MURO, 15, gates + [ESGOTO_SAIDA], dist=5): G.torre_redonda(p[0], p[1], 1.75)
    for (x, y) in MURO[::3]: G.torre_redonda(x, y, 1.9)
    for nome, (x, y) in PORT.items(): G.portao(x, y, MURO, 1.55)
    # a abertura do esgoto: o arco com a grade velha e a cascata suja
    ex, ey = ESGOTO_SAIDA
    with G.roi(ex - 3, ey - 3, ex + 6, ey + 3, 1):
        ab = G.rect(M.mask(), ex - 1.0, ey - .8, ex + 1.0, ey + .8)
        M.paint(ab, (22, 22, 22))
        gr = M.mask()
        for t in np.arange(ey - .7, ey + .8, .3): G.pline(gr, [(ex - .9, t), (ex + .9, t)], .08)
        M.paint(M.AND(gr, ab), (110, 70, 46), .9)
        M.paint(M.AND(G.disc(M.mask(), ex + .2, ey - .5, .4), ab), (22, 22, 22))          # a grade quebrada num canto
    # ---------- árvores ----------
    M.log('árvores')
    OUTONO = [(196, 92, 36), (214, 132, 40), (176, 62, 40), (200, 160, 60), (150, 110, 50), (186, 76, 44), (120, 110, 56)]
    ocup = M.OR(G.dil(foot, .5), G.dil(ruas, .4), G.dil(ruelas, .3), G.dil(becos, .2), G.dil(rio, .6), praca, patio_a, patio_q, adro, G.dil(vala, .4))
    tg = np.zeros((H2, W2), np.uint8)
    for (x, y) in [(je[0] + 1.5, je[1] + 1.5), (je[2] - 1.5, je[1] + 1.5), (je[0] + 1.5, je[3] - 1.5), (je[2] - 1.5, je[3] - 1.5)]:
        G.arvore(x, y, 1.1, OUTONO[int(x) % len(OUTONO)])
    livres_t = M.SUB(M.SUB(dentro, M.OR(zona, pobre, jard)), ocup)
    M.arvores_em(livres_t, tg, {0: .05}, cores=OUTONO, rmin=.8, rmax=1.3)
    M.arvores_em(M.SUB(M.SUB(tudo, M.OR(G.dil(dentro, 3.5), G.dil(rio, .8))), G.dil(ruas, .5)), tg, {0: .06}, cores=OUTONO, rmin=1.0, rmax=1.8)
    # folhas no chão
    folhas = M.mask()
    for k in range(int(W2 * H2 * .8)):
        x, y = M.rng.random() * W, M.rng.random() * H
        G.ellipse(folhas, x, y, .12 + M.rng.random() * .08, .07, M.rng.random() * 180)
    folhas = M.SUB(folhas, M.OR(G.dil(foot, .05), rio, vala))
    M.paint(M.AND(folhas, ((G.noise(1.5, seed=77) > .45) * 255).astype(np.uint8)), (204, 110, 40), .7)
    M.paint(M.AND(folhas, ((G.noise(1.5, seed=78) > .62) * 255).astype(np.uint8)), (190, 70, 40), .65)
    # ---------- lampiões ----------
    lamps = G.lampioes_rua([(pts, hw) for pts, hw in est if pts is not est[3][0] and pts is not est[4][0]], 9,
                           lambda q: G.em(dentro, *q) and not G.em(zona, *q))
    G.lampioes(lamps)
    M.fumaca([(x, y) for x, y in chm[:50]], .5, .25)
    M.acabamento(desat=.9, tint=(1.03, 0.99, 0.95), vinheta=.22)
    M.salvar(out, previa)


def portas():
    out = []
    for nome, x0, y0, x1, y1, cor, lado, tp in PREDIOS:
        if not tp: continue
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        x, y = {'s': (cx, y1 + .6), 'n': (cx, y0 - .6), 'l': (x1 + .6, cy), 'o': (x0 - .6, cy)}[lado]
        w, h = INT[nome]
        out.append(dict(nome=nome, x=x * F, y=y * F, w=w, h=h, p=lado, t=tp))
    return out


if __name__ == '__main__':
    S = float(sys.argv[1]) if len(sys.argv) > 1 else 8
    pintar(S, sys.argv[2] if len(sys.argv) > 2 else 'raiz_prev.png', sys.argv[3] if len(sys.argv) > 3 else None)
    json.dump(dict(W=W2, H=H2, F=F, lugares=[(n, x * F, y * F, t) for n, x, y, t in LUGARES], portas=portas(), muro=[(x * F, y * F) for x, y in MURO], portoes={k: (x * F, y * F) for k, (x, y) in PORT.items()}, esgoto=(ESGOTO_SAIDA[0] * F, ESGOTO_SAIDA[1] * F)), open('/home/claude/raiz/raiz_meta.json', 'w'), ensure_ascii=False)
