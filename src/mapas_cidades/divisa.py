"""Divisa Laranja — a cidadezinha cortada ao meio pela grande estrada, com a fonte enorme no meio da estrada.
Pedido do Dalmo (18/nov/2026): estrada larga dividindo a cidade em duas; quartelzinho, igreja, ferraria, apotecário e
bordel (os interiores em cenas próprias); casas comuns; barracas em volta da fonte; sem muro; tom de outono.
110 x 72 quadrados de 3 m (330 m x 216 m), 32 px por quadrado. O resto (onde fica cada coisa) é proposta do Claude."""
import sys, math
import numpy as np, cv2
import motor as M

W, H = 110, 72
ESTRADA = [(-2, 37.2), (20, 36.6), (40, 36.1), (55, 36), (70, 35.9), (90, 35.4), (112, 34.8)]
EST_HW = 3.0
PRACA = (55, 36, 12.5)                       # a praça redonda em volta da fonte (x, y, raio)
FONTE = (55, 36, 5.6)
# as ruas de terra (pts, meia-largura)
RUAS = [
    ([(28, 33), (27.5, 25), (26, 18), (25, 8), (24, -2)], 1.2),
    ([(83, 32.5), (84, 24), (86, 14), (88, -2)], 1.2),
    ([(30, 39.5), (31, 48), (32, 56), (33, 74)], 1.2),
    ([(84, 38.5), (83, 46), (81.5, 60), (80, 74)], 1.2),
    ([(8, 21), (18, 21.5), (27, 21), (40, 21.8), (47, 21.5)], 1.0),
    ([(63, 21.5), (72, 21), (84, 21.5), (100, 20.5)], 1.0),
    ([(10, 54), (22, 53.5), (31, 53), (44, 54), (56, 52.2)], 1.0),
    ([(70, 54), (82, 53.6), (100, 54.5)], 1.0),
    ([(55, 48), (56, 50.5)], 1.6),
]
# os prédios especiais: (nome, x0, y0, x1, y1, cor do telhado, lado da porta, tipo do interior)
PREDIOS = [
    ('Igreja', 50, 4, 60, 17, (78, 80, 92), 's', 'templo'),
    ('Apotecário', 35, 24.5, 42, 30.5, (96, 112, 70), 's', 'apotecario'),
    ('Ferraria', 18, 41, 26, 47, (70, 66, 64), 'n', 'ferraria'),
    ('Quartel', 73, 41.5, 86, 49.5, (118, 66, 54), 'n', 'quartel'),
    ('Bordel', 59, 51, 71, 60, (128, 42, 54), 'n', 'bordel'),
]
TORRE = (53, 13.5, 57, 17.5)                 # a torre do sino, na frente da igreja
ADRO = [(47, 17.5), (63, 17.5), (63.5, 23.5), (46.5, 23.5)]
CEMITERIO = (62, 5, 71, 15)
HORTA_APO = (43, 24.5, 48, 30.5)
PATIO_FORJA = (26.5, 41, 30, 47)
PATIO_QUARTEL = (73, 50.5, 86, 57)
JARDIM_BORDEL = (59, 61, 71, 66)

LUGARES = [
    ('A grande estrada', 12, 36.5, 'A estrada larga que corta a cidade em duas, de oeste a leste.'),
    ('A fonte da Divisa', 55, 31, 'A fonte enorme no meio da estrada, onde a cidade se divide. O ponto de encontro.'),
    ('Barracas da fonte', 49, 28, 'As barracas em volta da fonte: frutas, abóboras, panos, bugigangas de quem passa.'),
    ('Igreja', 55, 10, 'A igreja, ao norte da fonte, com a torre do sino virada para a praça.'),
    ('Adro da igreja', 55, 20.5, 'O pátio de pedra entre a igreja e a praça.'),
    ('Cemitério', 66.5, 10, 'O cemitério pequeno ao lado da igreja.'),
    ('Apotecário', 38.5, 27.5, 'Ervas, unguentos e remédios. A horta de ervas fica do lado.'),
    ('Ferraria', 22, 44, 'A ferraria, de frente para a estrada, com o pátio da forja ao lado.'),
    ('Quartel', 79.5, 45.5, 'O quartelzinho da guarda da cidade, com o pátio de treino atrás.'),
    ('Bordel', 65, 55.5, 'A casa noturna: fina na frente, suja nos fundos.'),
]


def pintar(S=8, out='divisa_prev.png', previa=None):
    M.setup(W, H, S, seed=4417, fundo=(92, 88, 52))
    M.texturas_padrao()
    M.flat('grama_outono', (112, 106, 62), 14, 0.6, 21)
    M.flat('grama_seca', (132, 116, 70), 12, 0.5, 22)
    M.flat('terra_rua', (122, 100, 72), 10, 0.5, 23)
    M.flat('horta', (84, 70, 50), 10, 0.4, 24)
    M.stone('adro', 0.5, (112, 106, 100), 12, (52, 50, 48), 25, 1.2)
    M.log('traçado')
    estrada = M.pline(M.mask(), ESTRADA, 2 * EST_HW)
    px, py, pr = PRACA
    praca = M.disc(M.mask(), px, py, pr)
    ruas = M.mask()
    for pts, hw in RUAS: M.pline(ruas, pts, 2 * hw)
    adro = M.poly(M.mask(), ADRO)
    predios = {}
    for nome, x0, y0, x1, y1, cor, lado, tp in PREDIOS: predios[nome] = M.rect(M.mask(), x0, y0, x1, y1)
    torre = M.rect(M.mask(), *TORRE)
    especiais = M.OR(*predios.values(), torre)
    cemit = M.rect(M.mask(), *CEMITERIO)
    horta = M.rect(M.mask(), *HORTA_APO)
    pforja = M.rect(M.mask(), *PATIO_FORJA)
    pquartel = M.rect(M.mask(), *PATIO_QUARTEL)
    jbordel = M.rect(M.mask(), *JARDIM_BORDEL)
    pav = M.OR(estrada, praca, adro)
    # ---------- o chão ----------
    M.log('chão')
    tudo = M.rect(M.mask(), -1, -1, W + 1, H + 1)
    M.paint(tudo, 'grama_outono')
    nz = M.noise(3.0, seed=41)
    M.paint(((nz > 0.58) * 255).astype(np.uint8), 'grama_seca', .7)
    del nz
    # os campos nas bordas (a cidade rareia até o campo): faixas aradas e de palha
    campos = M.mask()
    for (x0, y0, x1, y1) in ((0, 0, 14, 14), (96, 0, 110, 12), (0, 60, 18, 72), (92, 62, 110, 72), (0, 26, 6, 32), (104, 40, 110, 48)):
        M.rect(campos, x0, y0, x1, y1)
    M.paint(campos, 'horta', .9)
    sulcos = M.mask()
    for y in np.arange(0, H, .7): M.pline(sulcos, [(0, y), (W, y)], .12)
    M.paint(M.AND(sulcos, campos), (70, 58, 40), .6)
    M.paint(M.rect(M.mask(), 96, 0, 110, 12), 'grama_seca', .5)
    M.paint(ruas, 'terra_rua')
    M.paint(M.borda(M.dil(ruas, .15), .2), (96, 80, 58), .5)
    M.paint(estrada, 'rua_grande')
    M.paint(M.SUB(M.borda(M.dil(estrada, .25), .25), praca), (84, 78, 62), .7)
    M.paint(praca, 'praca')
    M.paint(M.SUB(M.borda(praca, .3), estrada), (78, 76, 80), .8)
    M.paint(adro, 'adro')
    M.paint(horta, 'horta')
    hl = M.mask()
    for x in np.arange(HORTA_APO[0] + .4, HORTA_APO[2], .9): M.pline(hl, [(x, HORTA_APO[1] + .4), (x, HORTA_APO[3] - .4)], .35)
    M.paint(M.AND(hl, horta), (78, 118, 60), .95)
    M.paint(pforja, 'terra'); M.paint(pquartel, 'terra')
    M.paint(jbordel, 'jardim')
    M.paint(cemit, (94, 98, 60))
    # ---------- as casas ----------
    M.log('casas')
    reservado = M.OR(M.dil(especiais, 1.0), cemit, horta, pforja, pquartel, jbordel, adro, campos, M.dil(praca, .6))
    livre = M.SUB(tudo, M.OR(M.dil(pav, .4), M.dil(ruas, .3), reservado))
    livre = M.SUB(livre, M.SUB(tudo, M.rect(M.mask(), 3, 3, W - 3, H - 3)))
    # só perto das ruas e da estrada (a cidade é pequena)
    perto = M.dil(M.OR(estrada, ruas), 5.5)
    livre = M.AND(livre, perto)
    dgrid = np.zeros((H, W), np.uint8)
    PAR = {0: dict(depth=3.6, lot=4.2, second=False)}
    PAL = [(150, 84, 56), (132, 70, 50), (160, 104, 62), (118, 82, 58), (104, 92, 76), (142, 118, 80), (96, 70, 56), (170, 92, 52)]
    foot, colidx = M.casario_ret(livre, dgrid, PAR, {0: [0, 1, 2, 3, 4, 5, 6, 7]}, frente=.5, inner=False)
    for nome, x0, y0, x1, y1, cor, lado, tp in PREDIOS:
        colidx[predios[nome] > 127] = 20 + [p[0] for p in PREDIOS].index(nome)
    colidx[torre > 127] = 25
    foot = M.OR(foot, especiais)
    PAL2 = PAL + [(0, 0, 0)] * (20 - len(PAL)) + [p[5] for p in PREDIOS] + [(70, 72, 84)]
    M.sombra(foot, .5, .62, .2, .45)
    M.telhados(foot, colidx, PAL2)
    M.chamines(foot, especiais, .12)
    # a torre da igreja (mais alta: sombra comprida) e a cruz
    with M.roi(TORRE[0], TORRE[1], TORRE[2], TORRE[3], 3):
        tm = M.rect(M.mask(), *TORRE)
        M.sombra(tm, 1.4, 1.8, .4, .5)
        M.telhado_local(tm, (70, 72, 84), course=.2, contraste=.45)
        cx, cy = (TORRE[0] + TORRE[2]) / 2, (TORRE[1] + TORRE[3]) / 2
        cr = M.OR(M.rect(M.mask(), cx - .12, cy - .8, cx + .12, cy + .8), M.rect(M.mask(), cx - .5, cy - .35, cx + .5, cy - .12))
        M.paint(cr, (200, 176, 110))
    # o cemitério: muro baixo, lápides e cruzes
    M.paint(M.borda(cemit, .25), 'muro')
    lap = M.mask()
    for x in np.arange(CEMITERIO[0] + 1.2, CEMITERIO[2] - .6, 1.4):
        for y in np.arange(CEMITERIO[1] + 1.2, CEMITERIO[3] - .6, 1.6):
            if M.rng.random() < .8: M.rect(lap, x, y, x + .55, y + .3)
    M.sombra(lap, .1, .15, .05, .5); M.paint(lap, (150, 150, 152))
    # o pátio de treino do quartel: cerca de toras, bonecos e alvos
    q0 = PATIO_QUARTEL
    M.paint(M.borda(pquartel, .3), (96, 72, 44))
    for x in np.arange(q0[0] + 2, q0[2] - 1, 3):
        M.paint(M.disc(M.mask(), x, q0[1] + 3.5, .45), (150, 120, 80)); M.paint(M.disc(M.mask(), x, q0[1] + 3.5, .2), (90, 60, 40))
    for x in np.arange(q0[0] + 2.5, q0[2] - 1, 4):
        M.paint(M.disc(M.mask(), x, q0[3] - 1.2, .55), (220, 210, 190)); M.paint(M.disc(M.mask(), x, q0[3] - 1.2, .35), (170, 50, 40)); M.paint(M.disc(M.mask(), x, q0[3] - 1.2, .15), (220, 210, 190))
    # o pátio da forja: a bigorna de fora, o carvão, a roda de carroça
    f0 = PATIO_FORJA
    M.paint(M.rect(M.mask(), f0[0] + .8, f0[1] + 1, f0[0] + 2, f0[1] + 1.6), (70, 70, 76))
    M.paint(M.disc(M.mask(), f0[0] + 2.2, f0[3] - 1.5, .9), (40, 36, 34))
    M.paint(M.disc(M.mask(), f0[0] + 1.2, f0[1] + 3.3, .7), (90, 66, 44)); M.paint(M.disc(M.mask(), f0[0] + 1.2, f0[1] + 3.3, .45), (70, 52, 34))
    # o jardim do bordel: canteiros de flores vermelhas
    fl = M.mask()
    for k in range(60): M.disc(fl, JARDIM_BORDEL[0] + .6 + M.rng.random() * 10.8, JARDIM_BORDEL[1] + .5 + M.rng.random() * 4.2, .2)
    M.paint(fl, (170, 40, 52), .9)
    M.paint(M.borda(jbordel, .2), (90, 70, 50), .8)
    # ---------- a fonte ----------
    M.log('fonte')
    fx, fy, fr = FONTE
    with M.roi(fx - fr, fy - fr, fx + fr, fy + fr, 2):
        m = M.disc(M.mask(), fx, fy, fr)
        M.sombra(m, .25, .35, .2, .45)
        M.paint(m, 'muro')
        M.paint(M.disc(M.mask(), fx, fy, fr - .55), 'muro_topo')
        agua = M.disc(M.mask(), fx, fy, fr - .75)
        M.paint(agua, (52, 92, 108))
        rip = M.mask()
        for r in np.arange(1.6, fr - .9, .55): cv2.circle(rip, (int((fx * M.S - M.RX0) * M.K), int((fy * M.S - M.RY0) * M.K)), int(r * M.S * M.K), 255, max(1, int(M.S * .05)), cv2.LINE_AA, M.SH)
        M.paint(M.AND(rip, agua), (120, 168, 182), .35)
        fol = M.mask()
        for k in range(40):
            a = M.rng.random() * 2 * math.pi; rr = 1.8 + M.rng.random() * (fr - 2.8)
            M.ellipse(fol, fx + math.cos(a) * rr, fy + math.sin(a) * rr, .16, .09, M.rng.random() * 180)
        M.paint(M.AND(fol, agua), (214, 116, 44), .9)
        m2 = M.disc(M.mask(), fx, fy, 2.3)
        M.sombra(m2, .15, .2, .1, .45); M.paint(m2, 'muro')
        M.paint(M.disc(M.mask(), fx, fy, 1.8), (64, 108, 124))
        for a in np.arange(0, 2 * math.pi, math.pi / 4):
            M.paint(M.disc(M.mask(), fx + math.cos(a) * 3.2, fy + math.sin(a) * 3.2, .22), (200, 230, 236), .8)
        st = M.disc(M.mask(), fx, fy, .85)
        M.sombra(st, .3, .4, .1, .5); M.paint(st, (120, 104, 70))
        M.paint(M.disc(M.mask(), fx - .2, fy - .25, .35), (176, 150, 96))
    # ---------- as barracas em volta da fonte (no anel da praça, fora da estrada) ----------
    M.log('barracas')
    COR_OUT = [((176, 96, 40), (220, 200, 160)), ((150, 50, 40), (220, 200, 160)), ((190, 140, 50), (110, 50, 36)), ((110, 70, 40), (210, 190, 150))]
    for a in np.arange(0, 2 * math.pi, 2 * math.pi / 22):
        x, y = px + math.cos(a) * 9.4, py + math.sin(a) * 9.4
        if abs(y - py) < EST_HW + 1.6: continue
        if M.rng.random() < .2: continue
        M.barraca(x - .8, y - .6, 1.6, 1.2, COR_OUT)
    # abóboras e cestos perto das barracas
    ab = M.mask()
    for k in range(26):
        a = M.rng.random() * 2 * math.pi; r = 7.2 + M.rng.random() * 1.0
        x, y = px + math.cos(a) * r, py + math.sin(a) * r
        if abs(y - py) < EST_HW + .8: continue
        M.disc(ab, x, y, .32)
    M.sombra(ab, .08, .12, .04, .4); M.paint(ab, (220, 120, 40))
    # ---------- as árvores de outono e as folhas no chão ----------
    M.log('árvores')
    OUTONO = [(196, 92, 36), (214, 132, 40), (176, 62, 40), (200, 160, 60), (150, 110, 50), (186, 76, 44), (120, 110, 56)]
    livre_a = M.SUB(tudo, M.OR(M.dil(foot, .6), M.dil(pav, .8), M.dil(ruas, .5), cemit, horta, pforja, pquartel, campos))
    M.arvores_em(livre_a, dgrid, {0: .055}, cores=OUTONO, rmin=.9, rmax=1.7)
    M.arvores_em(M.AND(livre_a, M.SUB(tudo, M.rect(M.mask(), 6, 6, W - 6, H - 6))), dgrid, {0: .25}, cores=OUTONO, rmin=1.0, rmax=1.9)
    for (cx, cy) in ((CEMITERIO[0] + 1, CEMITERIO[3] - 1), (CEMITERIO[2] - 1, CEMITERIO[1] + 1)):
        M.arvore(cx, cy, 1.3, (176, 62, 40))
    folhas = M.mask()
    for k in range(int(W * H * 1.1)):
        x, y = M.rng.random() * W, M.rng.random() * H
        M.ellipse(folhas, x, y, .12 + M.rng.random() * .08, .07, M.rng.random() * 180)
    folhas = M.SUB(folhas, M.dil(foot, .05))
    M.paint(M.AND(folhas, ((M.noise(1.5, seed=77) > .4) * 255).astype(np.uint8)), (204, 110, 40), .75)
    M.paint(M.AND(folhas, ((M.noise(1.5, seed=78) > .6) * 255).astype(np.uint8)), (190, 70, 40), .7)
    # ---------- os lampiões da estrada e as lanternas vermelhas do bordel ----------
    lamps = M.lampioes_rua([(ESTRADA, EST_HW)], 10, lambda q: math.hypot(q[0] - px, q[1] - py) > pr + .5)
    lamps += [(px + math.cos(a) * (pr - .4), py + math.sin(a) * (pr - .4)) for a in np.arange(math.pi / 8, 2 * math.pi, math.pi / 4)]
    M.lampioes(lamps)
    bx = (PREDIOS[4][1] + PREDIOS[4][3]) / 2
    M.lampioes([(bx - 1.6, PREDIOS[4][2] - .6), (bx + 1.6, PREDIOS[4][2] - .6)], raio=.9, cor_luz=(0.6, 0.08, 0.06), brilho=1.4, cor=(255, 90, 80))
    M.acabamento(desat=.9, tint=(1.03, 0.99, 0.94), vinheta=.22)
    M.salvar(out, previa)


def portas():
    """o ponto da porta de cada prédio (fora, junto da parede), para a Entrada"""
    out = []
    for nome, x0, y0, x1, y1, cor, lado, tp in PREDIOS:
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        if nome == 'Igreja': cx = (TORRE[0] + TORRE[2]) / 2 + 3.4
        x, y = {'s': (cx, y1 + .5), 'n': (cx, y0 - .5), 'l': (x1 + .5, cy), 'o': (x0 - .5, cy)}[lado]
        out.append(dict(nome=nome, x=x, y=y, w=x1 - x0, h=y1 - y0, p=lado, t=tp))
    return out


if __name__ == '__main__':
    pintar(float(sys.argv[1]) if len(sys.argv) > 1 else 8, sys.argv[2] if len(sys.argv) > 2 else 'divisa_prev.png', sys.argv[3] if len(sys.argv) > 3 else None)
