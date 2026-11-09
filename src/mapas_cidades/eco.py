"""Cidade do Eco — a cidade dos Konaitos no fundo de um cânion do Planalto do Eco: casas de teto plano, a Arena no meio,
casas escavadas nas paredes, torres em forma de chifre nas bordas e portões nas duas pontas do cânion.
200 x 120 quadrados de 5 m (1 km x 600 m). Proposta do Claude, 8/nov/2026."""
import sys, math
import numpy as np, cv2
import motor as M

W, H = 200, 104
EIXO = M.suave([(-4, 54), (20, 50), (45, 56), (70, 49), (100, 52), (130, 47), (160, 54), (185, 50), (204, 52)], 4)
def hw(x): return 24 + 12 * math.exp(-((x - 100) / 50) ** 2)
def eixo_y(x): return float(np.interp(x, [p[0] for p in EIXO], [p[1] for p in EIXO]))
TOPO = [(x, eixo_y(x) - hw(x)) for x in np.arange(-4, 205, 1.0)]
BASE = [(x, eixo_y(x) + hw(x)) for x in np.arange(-4, 205, 1.0)]
ARENA = (100, 52, 17, 12)
MERCADO = [(60, 40), (80, 39), (80, 62), (60, 63)]
CORRENTES = [(122, 38.5), (143, 37.5), (143, 56), (122, 57.5)]
PACO = (20, 30, 44, 44)
TEMPLO = (170, 40, 7)
PRINCIPAL = [(-1, 56), (8, 56), (30, 55), (50, 56), (60, 52), (82, 52), (118, 50), (146, 50), (160, 54), (192, 53), (201, 53)]
RAMPAS = [[(78, eixo_y(78) - hw(78) + 6.5), (88, eixo_y(88) - hw(88) + 1), (95, eixo_y(95) - hw(95) - 3)],
          [(150, eixo_y(150) + hw(150) - 6.5), (141, eixo_y(141) + hw(141) - 1), (134, eixo_y(134) + hw(134) + 3)]]
PORTOES_X = [(7, 'Portão Oeste'), (193, 'Portão Leste')]

LUGARES = [
    ('A Arena', 100, 52, 'A arena da cidade, onde o eco faz a multidão soar como trovão. Lutas, julgamentos e espetáculos.'),
    ('Loja da Arena', 100, 67.5, 'Armas e armaduras de gladiador, e o que sobra das lutas.'),
    ('Fundo da Arena (mercado negro)', 91, 59, 'Por baixo das arquibancadas. Fechado: só com contato.'),
    ('Mercado do Eco', 70, 51, 'O mercado comum da cidade: comida, couro, sal e cerâmica.'),
    ('Praça das Correntes', 132.5, 47, 'O maior mercado de escravizados da ilha. Cercados, a plataforma do leilão e os guardas do Coro de Guerra.'),
    ('Salão das Vozes', 32, 37, 'A sede do poder Konaito: as castas altas se reúnem aqui. Quem fala mais alto manda.'),
    ('Templo de Volkhum\'Pan', 170, 40, 'O templo do deus da voz, com o chifre gigante que canta quando o vento sopra no cânion.'),
    ('Casas na rocha', 40, 80, 'Casas escavadas nas paredes do cânion, com escadas de corda e varandas.'),
    ('Rampa Norte', 88, eixo_y(88) - hw(88) + 2, 'A rampa cortada na parede norte, que sobe para o planalto.'),
    ('Rampa Sul', 141, eixo_y(141) + hw(141) - 2, 'A rampa cortada na parede sul, que sobe para o planalto.'),
    ('Torres-chifre', 60, eixo_y(60) - hw(60) - 5, 'As torres em forma de chifre na borda do cânion. Guardam a cidade e amplificam a voz.'),
    ('Fenda dos Libertos', 60, eixo_y(60) + hw(60) + 4, 'Uma fenda estreita na parede sul. Dizem que por aqui fogem os escravizados para a Floresta das Raízes Altas.'),
    ('Trilha do Cânion dos Ecos', 194, 6, 'A trilha que sai pelo planalto rumo ao Cânion dos Ecos, o covil do Eco Faminto.'),
    ('Portão Oeste', 10, 56, 'Saída para o oeste: as Planícies de sal e a Cidadela Imaculada.'),
    ('Portão Leste', 190, 53, 'Saída para o leste: a costa sul e o Porto da Baía.'),
]


def muros():
    out = []
    for x, nome in PORTOES_X:
        y0, y1 = eixo_y(x) - hw(x) - .5, eixo_y(x) + hw(x) + .5
        out.append(([(x, y0), (x, y1)], False, [(x, 56 if x < 100 else 53)], 1.8))
    return out
MUROS = muros()


def torre_chifre(x, y, r, ang):
    """a torre em forma de chifre: base redonda e o chifre curvo que sobe e se enrola"""
    a = math.radians(ang)
    with M.roi(x - r * 3, y - r * 3, x + r * 3, y + r * 3, 3):
        base = M.disc(M.mask(), x, y, r * .75)
        M.sombra(base, 1.6, 2.1, .4, .5)
        M.paint(base, 'muro_eco')
        # o chifre: uma faixa que afina, curva
        pts_l, pts_r = [], []
        for i in range(14):
            t = i / 13
            th = a + t * 2.2
            c = np.array([x, y]) + np.array([math.cos(th), math.sin(th)]) * r * 2.1 * t
            w = r * .55 * (1 - t) + .08
            nrm = np.array([-math.sin(th), math.cos(th)])
            pts_l.append(c + nrm * w); pts_r.append(c - nrm * w)
        horn = M.poly(M.mask(), pts_l + pts_r[::-1])
        M.sombra(horn, 1.2, 1.6, .3, .35)
        M.telhado_local(horn, (196, 178, 148), course=.1, contraste=.45)
        M.paint(M.borda(horn), (60, 40, 30), .7)
        M.paint(M.borda(base), (50, 34, 26), .8)


def pintar(S=8, out='eco_prev.png', previa=None):
    M.setup(W, H, S, seed=5333, fundo=(150, 98, 72))
    M.texturas_padrao()
    M.rocha_tex('rocha', (156, 100, 74), 51)
    M.rocha_tex('rocha_face', (170, 116, 84), 52)
    M.flat('areia', (170, 140, 104), 10, .5, 53)
    M.stone('rua_eco', .42, (150, 124, 96), 10, (104, 84, 64), 54, 1.2, .1)
    M.stone('praca_eco', .6, (168, 142, 112), 10, (110, 90, 70), 55, 1.2)
    M.stone('muro_eco', .26, (152, 110, 82), 12, (84, 58, 44), 56, .9, .25)
    M.stone('topo_eco', .22, (128, 92, 70), 10, (78, 54, 40), 57, .8, .2)
    TX = M.TX
    M.log('traçado')
    chao = M.irregular(M.poly(M.mask(), TOPO + BASE[::-1]), .55, 1.2)
    planalto = M.NOT(chao)
    face = M.SUB(M.dil(planalto, 6.0), planalto)
    ax, ay, arx, ary = ARENA
    arena = M.ellipse(M.mask(), ax, ay, arx + 1.2, ary + 1.2)
    mercado = M.poly(M.mask(), MERCADO); correntes = M.poly(M.mask(), CORRENTES)
    paco = M.rect(M.mask(), *PACO)
    templo = M.disc(M.mask(), TEMPLO[0], TEMPLO[1], TEMPLO[2] + 2.5)
    principal = M.pline(M.mask(), PRINCIPAL, 2.6)
    anel_arena = M.SUB(M.ellipse(M.mask(), ax, ay, arx + 3.4, ary + 3.4), arena)
    def bairro(x, y):
        if x < 60: return 0
        if x > 150: return 2
        return 1
    dgrid = np.array([[bairro(i + .5, j + .5) for i in range(W)] for j in range(H)], np.uint8)
    reg = M.SUB(chao, M.OR(face, M.dil(arena, .5), mercado, correntes, M.dil(paco, .6), templo))
    sec = M.ruas_voronoi(reg, lambda x, y: 9 if 60 < x < 150 else 10, lambda x, y: 1.1)
    for x, _ in PORTOES_X: sec = M.SUB(sec, M.rect(M.mask(), x - 1.5, 0, x + 1.5, H)) if False else sec
    praca = M.OR(mercado, correntes, anel_arena)
    pav = M.OR(M.SUB(M.AND(principal, chao), face), sec, praca)
    pav = M.SUB(pav, arena)

    # ---------- o chão ----------
    M.log('chão')
    M.paint(chao, 'areia')
    M.paint(sec, 'rua_eco'); M.paint(M.SUB(M.AND(principal, chao), face), 'rua_eco')
    M.paint(praca, 'praca_eco')
    M.paint(planalto, 'rocha')
    arbustos = M.AND(planalto, ((M.noise(.5, seed=4) > .78) * 255).astype(np.uint8))
    M.paint(arbustos, (92, 92, 58), .55)
    # trilhas no planalto
    tr = M.OR(M.pline(M.mask(), [(95, eixo_y(95) - hw(95) - 3), (110, 8), (140, 3), (196, 4), (205, 3)], 1.0),
              M.pline(M.mask(), [(134, eixo_y(134) + hw(134) + 3), (120, 98), (90, 102), (60, 106)], 1.0))
    M.paint(M.AND(tr, planalto), (128, 98, 76), .7)
    # ---------- as paredes do cânion ----------
    M.log('paredes')
    M.penhasco(planalto, 6.0, 'rocha_face', estratos=.9, k_sombra=.6)
    # as casas escavadas na rocha: portas, janelas, varandas e escadas de corda
    M.log('casas na rocha')
    d = cv2.distanceTransform(M.NOT(planalto), cv2.DIST_L2, 5) / S
    ys, xs = np.nonzero((face[::int(S), ::int(S)] > 0))
    for j in M.rng.permutation(len(xs))[:int(len(xs) * .1)]:
        x, y = xs[j] + .5, ys[j] + .5
        dd = d[min(M.HP - 1, int(y * S)), min(M.WP - 1, int(x * S))]
        if dd < 1.0 or dd > 5.0: continue
        if any(abs(x - gx) < 4 for gx, _ in PORTOES_X): continue
        with M.roi(x - 1, y - 1, x + 1, y + 1, .5):
            M.paint(M.rect(M.mask(), x - .4, y - .1, x + .4, y + .3), (150, 112, 84))
            M.paint(M.rect(M.mask(), x - .2, y - .32, x + .2, y + .08), (34, 22, 18))
            if M.rng.random() < .4: M.paint(M.pline(M.mask(), [(x + .45, y + .45), (x + .45, y + 1.3)], .06), (90, 66, 44))
    del d
    # as rampas cortadas nas paredes
    for rp in RAMPAS:
        m = M.pline(M.mask(), rp, 2.2)
        M.sombra(m, .25, .35, .15, .45)
        M.paint(m, 'rua_eco'); M.paint(M.borda(M.dil(m, .1), .15), 'muro_eco')
    # a Fenda dos Libertos (fissura estreita na parede sul)
    fx = 60
    fenda = M.pline(M.mask(), [(fx, eixo_y(fx) + hw(fx) - 1), (fx + 2, eixo_y(fx) + hw(fx) + 4), (fx - 1, eixo_y(fx) + hw(fx) + 10), (fx + 3, H + 1)], .5)
    M.paint(fenda, (30, 18, 14), .9)
    # ---------- as casas (teto plano, de barro e pedra) ----------
    M.log('casas')
    livre = M.SUB(chao, M.OR(pav, face, arena, anel_arena, paco, templo, M.dil(principal, .1)))
    for x, _ in PORTOES_X: livre = M.SUB(livre, M.rect(M.mask(), x - 4, 0, x + 4, H))
    PAR = {0: dict(depth=2.4, lot=2.2), 1: dict(depth=2.8, lot=2.6), 2: dict(depth=3.2, lot=3.0)}
    PAL = [(176, 140, 104), (160, 124, 92), (188, 156, 118), (146, 110, 84), (130, 96, 74), (196, 184, 164), (150, 82, 62), (120, 100, 84)]
    PALW = {0: [3, 4, 1, 7, 4], 1: [0, 1, 2, 3, 5, 6], 2: [0, 2, 5, 5, 6, 1]}
    foot, colidx = M.casario_ret(livre, dgrid, PAR, PALW)
    f2, c2 = M.casario_ret(M.SUB(livre, M.dil(foot, .35)), dgrid, PAR, PALW)
    colidx[f2 > 0] = c2[f2 > 0]; foot = M.OR(foot, f2)
    esp = M.mask()
    def sp(m, c):
        nonlocal esp
        colidx[m > 127] = c; esp = M.OR(esp, m)
    px0, py0, px1, py1 = PACO
    for (a, b, c_, d_) in ((px0, py0, px1, py0 + 3.5), (px0, py1 - 3.5, px1, py1), (px0, py0, px0 + 3.5, py1), (px1 - 3.5, py0, px1, py1)):
        sp(M.rect(M.mask(), a, b, c_, d_), 6)
    sp(M.rect(M.mask(), 95, 66, 105, 69.5), 2)                      # loja da arena
    foot = M.OR(foot, esp)
    M.sombra(foot, .5, .65, .18, .45)
    M.telhados(foot, colidx, PAL, flat_mask=foot)
    # coisas nos terraços: potes, toldos e escadas de mão
    st = int(S)
    ys, xs = np.nonzero(foot[::st, ::st] > 0)
    for j in M.rng.choice(len(xs), size=int(len(xs) * .08), replace=False):
        x, y = xs[j] + .5, ys[j] + .5
        with M.roi(x - .5, y - .5, x + .5, y + .5, .4):
            if M.rng.random() < .5: M.paint(M.disc(M.mask(), x, y, .22), (120, 74, 50))
            else: M.paint(M.rect(M.mask(), x - .35, y - .25, x + .35, y + .25), [(150, 60, 48), (52, 92, 118), (176, 136, 60)][M.rng.integers(3)], .85)
    M.paint(M.rect(M.mask(), px0 + 4, py0 + 4, px1 - 4, py1 - 4), 'praca_eco')
    M.fonte((px0 + px1) / 2, (py0 + py1) / 2, 1.2)
    # ---------- a Arena ----------
    M.log('arena')
    with M.roi(ax - arx - 4, ay - ary - 4, ax + arx + 4, ay + ary + 4, 2):
        fora_ = M.ellipse(M.mask(), ax, ay, arx + 1.2, ary + 1.2)
        M.sombra(fora_, .8, 1.0, .3, .45)
        M.paint(fora_, 'muro_eco')
        for i, f in enumerate(np.linspace(1.0, .62, 9)):
            m = M.ellipse(M.mask(), ax, ay, arx * f, ary * f)
            M.paint(m, (150 - i * 3, 108 - i * 3, 82 - i * 2) if i % 2 else (166 - i * 3, 122 - i * 3, 92 - i * 2))
            M.paint(M.borda(m, .05), (70, 48, 36), .6)
        areia = M.ellipse(M.mask(), ax, ay, arx * .58, ary * .58)
        M.paint(areia, (186, 160, 120))
        M.paint(M.borda(areia, .12), (60, 40, 30), .8)
        mancha = M.AND(areia, ((M.noise(.8, (M.RH, M.RW), 8) > .72) * 255).astype(np.uint8))
        M.paint(mancha, (120, 56, 44), .25)
        for ang in (0, 180):
            a_ = math.radians(ang)
            gx_, gy_ = ax + math.cos(a_) * arx * .8, ay
            M.paint(M.rect(M.mask(), gx_ - 1.6, gy_ - 1.0, gx_ + 1.6, gy_ + 1.0), (40, 28, 22))
        M.paint(M.rect(M.mask(), 90.2, 58.3, 91.8, 59.7), (30, 20, 16))     # o alçapão do Fundo
        M.paint(M.borda(fora_), (40, 28, 22), .8)
    # ---------- a Praça das Correntes: cercados e a plataforma ----------
    with M.roi(121, 37, 144, 58, 1):
        cerca = M.mask()
        for (x0, y0) in ((124, 40.5), (128.5, 40.5), (133, 40.5), (124, 50), (128.5, 50), (133, 50)):
            M.pline(cerca, [(x0, y0), (x0 + 3.6, y0), (x0 + 3.6, y0 + 3.6), (x0, y0 + 3.6), (x0, y0)], .12)
            M.paint(M.rect(M.mask(), x0 + .2, y0 + .2, x0 + 3.4, y0 + 3.4), (128, 104, 74), .6)
        M.sombra(cerca, .1, .15, .05, .4); M.paint(cerca, (76, 52, 34))
        plat = M.rect(M.mask(), 138.5, 44.5, 141.5, 49.5)
        M.sombra(plat, .25, .35, .1, .5); M.paint(plat, 'muro_eco'); M.paint(M.borda(plat), (40, 28, 22), .8)
    # ---------- o templo de Volkhum'Pan ----------
    tx, ty, tr_ = TEMPLO
    with M.roi(tx - tr_ - 3, ty - tr_ - 3, tx + tr_ + 3, ty + tr_ + 3, 2):
        m = M.disc(M.mask(), tx, ty, tr_ + 2)
        M.paint(m, 'praca_eco')
        for k in range(3):
            M.paint(M.SUB(M.disc(M.mask(), tx, ty, tr_ + 1.6 - k * 1.2), M.disc(M.mask(), tx, ty, tr_ + 1.25 - k * 1.2)), (110, 76, 56), .7)
    torre_chifre(tx, ty, 3.0, -60)
    # ---------- os muros e portões nas pontas do cânion ----------
    M.log('portões')
    for x, nome in PORTOES_X:
        y0, y1 = eixo_y(x) - hw(x) - 1, eixo_y(x) + hw(x) + 1
        gy = 56 if x < 100 else 53
        pl = [(x, y0), (x, y1)]
        gaps = M.gaps_de([(x, gy)], 1.8)
        M.muralha(pl, 1.4, gaps, closed=False, muro='muro_eco', topo='topo_eco', ameias=(178, 140, 108), lado=(100, 60))
        M.portao(x, gy, pl, 1.5, closed=False, muro='muro_eco', topo='topo_eco')
    # ---------- as torres-chifre nas bordas ----------
    M.log('torres-chifre')
    for x in (22, 48, 74, 112, 146, 176):
        torre_chifre(x, eixo_y(x) - hw(x) - 4.5, 2.3, 200 + M.rng.random() * 40)
    for x in (34, 62, 98, 128, 162, 188):
        torre_chifre(x, eixo_y(x) + hw(x) + 4.5, 2.3, -30 + M.rng.random() * 40)
    # ---------- barracas, poços, lampiões ----------
    M.log('detalhes')
    M.barracas((61, 41, 79, 61), p=.65, cores=[((160, 70, 50), (210, 190, 150)), ((176, 136, 60), (110, 48, 42)), ((90, 60, 110), (200, 176, 120))])
    for (x, y) in ((50, 60), (154, 58), (112, 64)):
        M.fonte(x, y, .9)
    lamps = M.lampioes_rua([(PRINCIPAL, 1.3)], 8, lambda q: M.em(chao, *q) and ((q[0] - ax) / (arx + 3.5)) ** 2 + ((q[1] - ay) / (ary + 3.5)) ** 2 > 1)
    lamps += [(ax + math.cos(t) * (arx + 2.3), ay + math.sin(t) * (ary + 2.3)) for t in np.linspace(0, 2 * math.pi, 14, endpoint=False)]
    M.lampioes(lamps, cor_luz=(.6, .3, .06))
    M.acabamento(desat=.86, tint=(1.0, .97, .95), vinheta=.3)
    M.salvar(out, previa)


if __name__ == '__main__':
    pintar(float(sys.argv[1]) if len(sys.argv) > 1 else 8, sys.argv[2] if len(sys.argv) > 2 else 'eco_prev.png', sys.argv[3] if len(sys.argv) > 3 else None)
