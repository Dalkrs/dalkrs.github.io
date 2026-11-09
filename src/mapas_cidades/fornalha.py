"""Cidade-fornalha — a cidade dos Anões em terraços na encosta da Cordilheira da Forja, com dois rios de lava
canalizados descendo entre os terraços, o Grande Portão da montanha em cima e um muro só embaixo.
170 x 130 quadrados de 5 m (850 m x 650 m). Proposta do Claude, 8/nov/2026."""
import sys, math
import numpy as np, cv2
import motor as M

W, H = 170, 130
def B(k, x):
    return (24 + 3 * math.sin(x / 14), 46 + 2.5 * math.sin(x / 12 + 1), 66 + 2.5 * math.sin(x / 15 + 2),
            86 + 2.5 * math.sin(x / 11 + .5), 106 + 2 * math.sin(x / 13 + 2.5))[k]
def espora_o(y): return 11 + 4 * math.sin(y / 9) - max(0, (y - 100) * .2)
def espora_l(y): return 159 - 4 * math.sin(y / 10 + 1) + max(0, (y - 100) * .2)
LAVA1_ = [(36, -2), (40, 14), (35, 34), (42, 56), (36, 78), (44, 100), (38, 132)]
LAVA2_ = [(134, -2), (128, 20), (135, 44), (126, 66), (132, 90), (124, 112), (128, 132)]
import motor as _m
LAVA1 = _m.suave(LAVA1_); LAVA2 = _m.suave(LAVA2_)
ESTRADA = [(85, 131), (85, 118), (70, 110), (100, 100), (70, 90), (100, 80), (72, 68), (98, 58), (85, 46), (85, 27)]
MURO = [(espora_o(126) - 1, 126), (60, 126.5), (85, 126.5), (110, 126.5), (espora_l(126) + 1, 126)]
PORTOES = [((85, 126.5), 'Portão de Baixo')]
PORTA_GRANDE = (78, 17, 92, 25)
PRACA_PORTAO = [(70, 27), (100, 27), (101, 40), (69, 40)]
SALAO = (46, 28.5, 66, 42)
TEMPLO = (114, 34, 6.5)
RUNAS = (52, 52, 64, 61)
FORJA = (110, 54, 121.5, 64.5)
BIGORNA = [(76, 71), (98, 71), (99, 84), (75, 84)]
CARAVANAS = [(58, 113), (112, 113), (112, 124), (58, 124)]
MINAS = [((espora_o(60) + .3, 60), 'Boca da Mina Oeste', 'w'), ((espora_l(80) - .3, 80), 'Boca da Mina Leste', 'e')]

LUGARES = [
    ('Grande Portão', 85, 23, 'A porta da montanha. Por dentro, os salões e as minas dos Anões.'),
    ('Praça do Portão', 85, 33, 'A praça diante do Grande Portão, onde se fazem os juramentos de clã.'),
    ('Salão de Pedregulho Forte', 56, 35, 'O salão do líder dos Anões. Pedregulho Forte: rabugento e honesto.'),
    ('Templo de Ato\'Vas', 114, 34, 'O templo do deus do fogo e forjador, com o fogo que nunca apaga no meio.'),
    ('Casa das Runas', 58, 56.5, 'Runas gravadas por encomenda e o estudo delas.'),
    ('Forja de Pedregulho', 116, 59, 'As melhores armas e armaduras da ilha. Anões dão desconto a quem ajudou a montanha.'),
    ('Praça da Bigorna', 87, 77.5, 'O mercado da cidade, em volta da bigorna gigante.'),
    ('Rio de Lava Oeste', 39, 70, 'Lava canalizada que desce da montanha e alimenta as forjas do oeste.'),
    ('Rio de Lava Leste', 130, 80, 'Lava canalizada que desce da montanha e alimenta as forjas do leste.'),
    ('Terraço dos Clãs', 140, 36, 'O terraço mais alto: as casas dos clãs antigos.'),
    ('Terraço das Oficinas', 30, 96, 'Oficinas de metal, de engrenagem e de pedra.'),
    ('Pátio das Caravanas', 85, 118.5, 'Onde param as carroças: o Comboio da Forja e as carroças de enxofre dos Kobolds.'),
    ('Boca da Mina Oeste', espora_o(60) + 2, 60, 'Entrada das minas. A Vigia das minas guarda a porta.'),
    ('Boca da Mina Leste', espora_l(80) - 2, 80, 'Entrada das minas. A Vigia das minas guarda a porta.'),
    ('Galeria lacrada', espora_o(60) + 2, 64, 'Uma galeria de mina fechada com pedra e runas depois de um desabamento. Dizem que leva à Mina Perdida.'),
    ('Portão de Baixo', 85, 123, 'A única entrada da cidade por terra.'),
]
MUROS = [(MURO, False, [g for g, _ in PORTOES], 1.6)]


def pintar(S=8, out='fornalha_prev.png', previa=None):
    M.setup(W, H, S, seed=7222, fundo=(60, 62, 60))
    M.texturas_padrao()
    M.rocha_tex('rocha', (108, 104, 100), 41)
    M.stone('terraco', .45, (84, 78, 72), 10, (46, 42, 40), 42, 1.3, .1)
    M.stone('muro_ter', .32, (104, 100, 96), 12, (40, 40, 42), 43, 1.0, .3)
    M.log('traçado')
    xs = np.arange(-2, W + 3, 1.0)
    def acima(k):    # o terreno acima da borda k (mais alto)
        return M.poly(M.mask(), [(x, B(k, x)) for x in xs] + [(W + 2, -2), (-2, -2)])
    ys = np.arange(-2, H + 3, 1.0)
    espora = M.OR(M.poly(M.mask(), [(espora_o(y), y) for y in ys] + [(-2, H + 2), (-2, -2)]),
                  M.poly(M.mask(), [(espora_l(y), y) for y in ys] + [(W + 2, H + 2), (W + 2, -2)]))
    monte = M.irregular(M.OR(acima(0), espora), .5, 1.4)
    niveis = [acima(k) for k in range(5)]
    lava_c = M.OR(M.pline(M.mask(), LAVA1, 4.8), M.pline(M.mask(), LAVA2, 4.8))
    lava = M.OR(M.pline(M.mask(), LAVA1, 2.8), M.pline(M.mask(), LAVA2, 2.8))
    estrada = M.pline(M.mask(), ESTRADA, 2.6)
    praca = M.OR(M.poly(M.mask(), PRACA_PORTAO), M.poly(M.mask(), BIGORNA))
    caravanas = M.poly(M.mask(), CARAVANAS)
    # ruas ao longo de cada terraço (perto da borda) e travessas
    ruas = M.mask()
    for k in range(1, 5):
        M.pline(ruas, [(x, B(k, x) - 2.6) for x in xs], 1.7)
    M.pline(ruas, [(x, 117) for x in xs], 1.6)
    for k in range(0, 5):
        y0f = lambda x: B(k, x) + 1.8
        y1f = (lambda x: B(k + 1, x) - 1.8) if k < 4 else (lambda x: 125)
        for x in (24, 55, 115, 146) if k else (24, 146):
            M.pline(ruas, [(x, y0f(x)), (x, y1f(x))], 1.3)
    ruas = M.SUB(M.SUB(ruas, monte), lava_c)
    # pontes onde rua ou estrada cruza a lava
    pontes = M.AND(M.dil(lava_c, .1), M.OR(M.dil(ruas, .2), M.dil(estrada, .2)))
    pav = M.OR(ruas, estrada, praca, caravanas)

    def nivel(x, y):
        for k in range(5):
            if y < B(k, x): return max(0, k - 1)
        return 4
    dgrid = np.array([[nivel(i + .5, j + .5) for i in range(W)] for j in range(H)], np.uint8)

    # ---------- o chão ----------
    M.log('chão')
    M.paint(M.NOT(monte), 'terraco')
    M.paint(M.AND(M.NOT(monte), ((M.noise(3, seed=3) > .6) * 255).astype(np.uint8)), 'terra', .35)
    M.paint(ruas, 'rua'); M.paint(estrada, 'rua_grande'); M.paint(praca, 'praca'); M.paint(caravanas, 'lama')
    M.paint(monte, 'rocha')
    # neve na montanha (é o norte, frio)
    neve = M.AND(monte, ((M.noise(5, seed=9) * .7 + M.noise(1, seed=10) * .3 > .6) * 255).astype(np.uint8))
    neve = cv2.GaussianBlur(neve, (0, 0), S * .35)
    M.paint(neve, (200, 204, 212), .75)
    # ---------- as bordas dos terraços (muros de arrimo) e a montanha ----------
    M.log('terraços')
    for k in range(4, 0, -1):
        alto = M.OR(niveis[k], monte)
        M.penhasco(alto, 1.8, 'muro_ter', estratos=.45, k_sombra=.6, parapeito=.22)
    M.penhasco(monte, 2.6, 'rocha', estratos=.7, k_sombra=.6)
    # a estrada e as ruas passam por cima (rampas)
    M.paint(M.SUB(estrada, monte), 'rua_grande')
    M.paint(M.borda(M.dil(M.SUB(estrada, monte), .1), .15), 'muro', .8)
    M.paint(M.SUB(praca, monte), 'praca')
    # ---------- a lava ----------
    M.log('lava')
    M.paint(lava_c, 'muro'); M.paint(M.borda(lava_c, .08), (24, 22, 22), .8)
    M.lava(lava, 2.4)
    # ---------- as casas ----------
    M.log('casas')
    face = M.mask()
    for k in range(1, 5): face = M.OR(face, M.SUB(M.dil(niveis[k], 1.8), niveis[k]))
    livre = M.SUB(M.NOT(monte), M.OR(pav, lava_c, face, M.dil(M.SUB(M.dil(monte, 2.6), monte), .3)))
    livre = M.SUB(livre, M.OR(M.rect(M.mask(), *SALAO), M.disc(M.mask(), TEMPLO[0], TEMPLO[1], TEMPLO[2] + 1.5),
                              M.rect(M.mask(), *RUNAS), M.rect(M.mask(), *FORJA), M.dil(M.pline(M.mask(), MURO, 1.2), .9)))
    livre = M.SUB(livre, M.rect(M.mask(), 0, 125, W, H))
    PAR = {0: dict(depth=3.4, lot=3.6, second=False), 1: dict(depth=3.0, lot=3.0), 2: dict(depth=3.0, lot=2.8),
           3: dict(depth=2.8, lot=2.6), 4: dict(depth=2.6, lot=2.2, dense=True)}
    PAL = [(104, 104, 108), (88, 90, 96), (118, 116, 114), (76, 78, 86), (70, 76, 92), (72, 100, 96), (62, 62, 68), (128, 80, 62), (108, 92, 72)]
    PALW = {0: [0, 2, 4, 5, 2], 1: [0, 1, 2, 3, 4, 6], 2: [0, 1, 3, 6, 7], 3: [1, 3, 6, 7, 8], 4: [3, 6, 7, 8, 8]}
    foot, colidx = M.casario(livre, dgrid, PAR, PALW, gap=.05)
    esp = M.mask()
    def sp(m, c):
        nonlocal esp
        colidx[m > 127] = c; esp = M.OR(esp, m)
    sp(M.rect(M.mask(), *SALAO), 4)
    sp(M.rect(M.mask(), *RUNAS), 4)
    sp(M.rect(M.mask(), *FORJA), 6)
    foot = M.OR(foot, esp)
    M.sombra(foot, .42, .55, .18, .42)
    M.telhados(foot, colidx, PAL, flat_mask=esp)
    chm = M.chamines(foot, esp, .16, (80, 74, 70))
    # o salão: claraboia no meio; a casa das runas: o círculo de runas azul
    sx0, sy0, sx1, sy1 = SALAO
    M.paint(M.rect(M.mask(), sx0 + 7, sy0 + 4.5, sx1 - 7, sy1 - 4.5), (54, 52, 50))
    M.paint(M.rect(M.mask(), sx0 + 7.4, sy0 + 4.9, sx1 - 7.4, sy1 - 4.9), (170, 140, 90), .5)
    rx0, ry0, rx1, ry1 = RUNAS
    with M.roi(rx0, ry0, rx1, ry1, 1):
        M.paint(M.disc(M.mask(), (rx0 + rx1) / 2, (ry0 + ry1) / 2, 2.6), 'praca')
        anel = M.SUB(M.disc(M.mask(), (rx0 + rx1) / 2, (ry0 + ry1) / 2, 2.2), M.disc(M.mask(), (rx0 + rx1) / 2, (ry0 + ry1) / 2, 1.9))
        M.paint(anel, (120, 190, 230), .9)
        g = cv2.GaussianBlur(anel, (0, 0), S * .4).astype(np.float32) / 255
        M.add(g, (20, 50, 80))
    # o templo de Ato'Vas: anel de telhado e o fogo no meio
    tx, ty, tr = TEMPLO
    with M.roi(tx - tr - 2, ty - tr - 2, tx + tr + 2, ty + tr + 2, 3):
        m = M.SUB(M.disc(M.mask(), tx, ty, tr), M.disc(M.mask(), tx, ty, tr * .42))
        M.sombra(M.disc(M.mask(), tx, ty, tr), .8, 1.0, .25, .45)
        M.telhado_local(m, (122, 76, 60), course=.16)
        M.paint(M.disc(M.mask(), tx, ty, tr * .42), 'praca')
        M.paint(M.disc(M.mask(), tx, ty, tr * .2), (40, 30, 26))
    fogo = M.disc(M.mask(), tx, ty, tr * .16)
    M.lava(fogo, 1.6)
    # a forja grande: bocas de fogo e fumaça
    fx0, fy0, fx1, fy1 = FORJA
    bocas = [(fx0 + 1.5 + i * 2.6, fy1 - .4) for i in range(4)]
    bm = M.mask()
    for (x, y) in bocas: M.rect(bm, x - .6, y - .3, x + .6, y + .3)
    M.lava(bm, 1.2)
    # forjas pequenas na beira da lava (brasa na porta)
    brasas = M.mask()
    for pts in (LAVA1, LAVA2):
        for p, u in M.ao_longo(pts, 7, 3):
            for s_ in (-1, 1):
                q = p + np.array([-u[1], u[0]]) * s_ * 3.1
                if M.em(foot, *q): M.disc(brasas, q[0], q[1], .28)
    M.lava(brasas, 1.0)
    # ---------- o Grande Portão ----------
    M.log('portão')
    gx0, gy0, gx1, gy1 = PORTA_GRANDE
    with M.roi(gx0 - 6, gy0 - 4, gx1 + 6, gy1 + 4, 1):
        mold = M.rect(M.mask(), gx0 - 2.5, gy0 - 1.5, gx1 + 2.5, gy1 + .6)
        M.paint(mold, 'muro_ter'); M.paint(M.borda(mold), (26, 24, 24), .8)
        porta = M.rect(M.mask(), gx0, gy0, gx1, gy1 + .6)
        M.paint(porta, (24, 22, 22))
        fol = M.OR(M.rect(M.mask(), gx0 + .3, gy1 - 1.2, (gx0 + gx1) / 2 - .1, gy1 + .5), M.rect(M.mask(), (gx0 + gx1) / 2 + .1, gy1 - 1.2, gx1 - .3, gy1 + .5))
        M.paint(fol, (96, 70, 44))
        for x in (gx0 - 4.2, gx1 + 4.2):
            st = M.disc(M.mask(), x, gy1 - 1, 1.6)
            M.sombra(st, .4, .6, .2, .5); M.paint(st, 'muro'); M.paint(M.disc(M.mask(), x, gy1 - 1.2, .8), (130, 126, 120))
    # ---------- as bocas das minas (trilhos entrando na rocha) ----------
    for (x, y), _, lado in MINAS:
        s_ = -1 if lado == 'w' else 1
        with M.roi(x - 5, y - 4, x + 5, y + 4, 1):
            M.paint(M.ellipse(M.mask(), x + s_ * .6, y, 1.4, 1.8), (20, 18, 18))
            tr_ = M.mask()
            for dy in (-.45, .45): M.pline(tr_, [(x + s_ * 1.2, y + dy), (x - s_ * 6, y + dy)], .1)
            for t in np.arange(0, 7, .5): M.pline(tr_, [(x - s_ * t, y - .7), (x - s_ * t, y + .7)], .12)
            M.paint(tr_, (70, 60, 50))
    # ---------- o muro de baixo ----------
    M.log('muro')
    gaps = M.gaps_de([g for g, _ in PORTOES], 1.6)
    M.muralha(MURO, 1.3, gaps, closed=False, lado=(85, 100))
    for p in M.torres_ao_longo(MURO, 22, [g for g, _ in PORTOES], closed=False):
        M.torre_quadrada(p[0] - 1.6, p[1] - 1.6, p[0] + 1.6, p[1] + 1.6)
    for (x, y), _ in PORTOES: M.portao(x, y, MURO, 1.5, closed=False)
    # a lava passa por baixo do muro (grade)
    for pts in (LAVA1, LAVA2):
        x = np.interp(126, [p[1] for p in pts], [p[0] for p in pts])
        gr = M.mask()
        for t in np.arange(-1.3, 1.4, .45): M.pline(gr, [(x + t, 125.2), (x + t, 127.2)], .12)
        M.paint(gr, (60, 56, 52))
    # ---------- as pontes sobre a lava ----------
    M.paint(pontes, 'rua_grande'); M.paint(M.borda(pontes, .12), 'muro')
    # ---------- praça da bigorna, carroças, lampiões, fumaça ----------
    M.log('detalhes')
    bx, by = 87, 77.5
    with M.roi(bx - 3, by - 3, bx + 3, by + 3, 1):
        base_ = M.rect(M.mask(), bx - 1.6, by - .9, bx + 1.6, by + .9)
        M.sombra(base_, .3, .4, .15, .5); M.paint(base_, 'muro')
        big = M.poly(M.mask(), [(bx - 2.2, by - .45), (bx + 1.3, by - .45), (bx + 2.4, by - .1), (bx + 1.3, by + .45), (bx - 2.2, by + .45)])
        M.sombra(big, .3, .4, .15, .5); M.paint(big, (70, 72, 78)); M.paint(M.borda(big), (20, 20, 24), .8)
    M.barracas((77, 72, 98, 83), passo=(2.2, 2.2), p=.45, evita=lambda x, y: abs(x - bx) < 3.5 and abs(y - by) < 2.5,
               cores=[((120, 72, 50), (180, 160, 120)), ((80, 84, 96), (170, 150, 110)), ((140, 110, 60), (90, 60, 40))])
    for k in range(9):
        x = 61 + M.rng.random() * 48; y = 114 + M.rng.random() * 8
        with M.roi(x - 2, y - 2, x + 2, y + 2, 1):
            c = M.rect(M.mask(), x, y, x + 2.2, y + 1.1)
            M.sombra(c, .15, .2, .08, .45); M.paint(c, (92, 70, 46))
            carga = (196, 176, 70) if k % 3 == 0 else (110, 104, 96)
            M.paint(M.rect(M.mask(), x + .2, y + .2, x + 2.0, y + .9), carga)
            for (wx, wy) in ((x + .4, y - .05), (x + 1.8, y - .05), (x + .4, y + 1.15), (x + 1.8, y + 1.15)):
                M.paint(M.disc(M.mask(), wx, wy, .2), (40, 30, 22))
    lamps = M.lampioes_rua([(ESTRADA, 1.3)], 7, lambda q: not M.em(monte, *q))
    for k in range(1, 5):
        lamps += [(x, B(k, x) - 1.35) for x in range(16, 160, 11) if not M.em(lava_c, x, B(k, x) - 1.35)]
    lamps += [(70.5, 27.5), (99.5, 27.5), (70.5, 39.5), (99.5, 39.5)]
    M.lampioes(lamps, cor_luz=(.6, .3, .06))
    M.fumaca([(fx0 + 2, fy0 + 1), (fx1 - 2, fy0 + 1.5)] + [chm[i] for i in range(0, len(chm), 7)], r=.8, a=.3)
    M.acabamento(desat=.85, tint=(.98, .97, 1.0))
    M.salvar(out, previa)


if __name__ == '__main__':
    pintar(float(sys.argv[1]) if len(sys.argv) > 1 else 8, sys.argv[2] if len(sys.argv) > 2 else 'fornalha_prev.png', sys.argv[3] if len(sys.argv) > 3 else None)
