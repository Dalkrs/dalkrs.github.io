"""Campo Alegre — cidade grande murada: uma praça central numa ilha do rio (com 4 pontes) e 5 distritos redondos em volta,
cada um cercado por árvores e por uma estrada. O distrito do leste é uma grande fazenda. O rio corre de leste a oeste.
Pedido do Dalmo (20/nov/2026): muralha de pedra; igreja no distrito Norte e no Sul; pequeno castelo no Sul; bordel fino no
Noroeste; guarita; estalagem, ferraria e mercado; outono. Os nomes dos distritos ficam para o Bruno.
200 x 170 quadrados de 5 m (1 km x 850 m), 32 px por quadrado. O resto (onde fica cada coisa) é proposta do Claude."""
import sys, math, json
import numpy as np, cv2
import motor as M

W, H = 200, 170
C = (100.0, 85.0)
RD, DD = 20.0, 50.0                                   # raio de cada distrito e distância do centro
ANG = {'N': 270, 'NO': 210, 'SO': 150, 'S': 90, 'L': 0}
DIST = {k: (C[0] + DD * math.cos(math.radians(a)), C[1] + DD * math.sin(math.radians(a))) for k, a in ANG.items()}
ILHA_R, AGUA_R = 10.0, 14.6                           # a praça (plataforma) e o anel de água em volta
RX, RY = 93.0, 82.0                                   # a muralha (elipse)
def elipse(a): return (C[0] + RX * math.cos(math.radians(a)), C[1] + RY * math.sin(math.radians(a)))
MURO = [elipse(a + 3 * math.sin(a / 23.0)) for a in np.arange(0, 360, 4)]
PORT = {'Portão Oeste': elipse(183), 'Portão Leste': elipse(357), 'Portão do Sul': elipse(57)}
def rio_y(x): return C[1] + 2.6 * math.sin(x / 21.0) * min(1, abs(x - C[0]) / 30)
RIO_O = [(x, rio_y(x)) for x in np.arange(-3, C[0] - AGUA_R + 1.5, 2)]
RIO_L = [(x, rio_y(x)) for x in np.arange(C[0] + AGUA_R - 1.5, W + 3, 2)]
RIO_HW = 2.6
PONTES = {'N': 270, 'NO': 212, 'SO': 148, 'S': 90}
def polar(c, r, a): return (c[0] + r * math.cos(math.radians(a)), c[1] + r * math.sin(math.radians(a)))
def ang_de(a, b): return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))

# os prédios especiais: (nome, x0, y0, x1, y1, cor do telhado, lado da porta, tipo do interior)
PREDIOS = [
    ('Igreja do Norte', 96.5, 25, 103.5, 37, (76, 80, 94), 's', 'templo'),
    ('Igreja do Sul', 85, 128, 91, 138, (88, 84, 96), 'l', 'templo'),
    ('Castelo', 101, 142, 111, 150, (74, 76, 86), 'n', 'senhor'),
    ('Bordel', 49.5, 50.5, 58.5, 57.5, (124, 40, 56), 's', 'bordel'),
    ('Estalagem', 59, 63.5, 67, 69.5, (140, 86, 56), 'o', 'taverna'),
    ('Ferraria', 51, 105, 57, 110, (72, 68, 66), 'n', 'ferraria'),
    ('Mercado', 96, 82, 104, 88, (150, 104, 62), 's', 'loja'),
    ('Guarita', 145.5, 142.5, 149.5, 146.5, (90, 84, 80), 'o', 'quartel'),
    ('Casa da Fazenda', 139, 72, 146, 77, (150, 120, 76), 's', 'casa'),
]
TORRE_N = (98.5, 37, 101.5, 40)                       # o campanário da igreja do Norte (na frente)
TORRE_S = (91, 131.5, 94, 134.5)
CASTELO_MURO = (97, 138, 115, 154)                     # o pátio murado do castelo
CELEIRO = (151, 71, 160, 76.5)
MOINHO = (156, rio_y(156))
JARDIM_BORDEL = (49.5, 57.5, 58.5, 60.5)

def ad(nome):
    for p in PREDIOS:
        if p[0] == nome: return p
LUGARES = [
    ('A Praça da Ilha', C[0], C[1] - 6.5, 'A praça central, numa ilha no meio do rio. Quatro pontes levam aos distritos.'),
    ('Mercado', 100, 85, 'O salão do mercado no meio da praça, com as barracas em volta.'),
    ('Distrito do Norte', DIST['N'][0] + 9, DIST['N'][1] + 8, 'O distrito do norte (nome a definir). A igreja grande fica no meio dele.'),
    ('Igreja do Norte', 100, 31, 'A igreja maior da cidade, com o campanário virado para a ponte do Norte.'),
    ('Distrito do Noroeste', DIST['NO'][0] + 8, DIST['NO'][1] + 9, 'O distrito do noroeste (nome a definir). O bordel e a estalagem.'),
    ('Bordel', 54, 54, 'Casa fina e chique, com jardim de flores e lanternas vermelhas.'),
    ('Estalagem', 63, 66.5, 'A estalagem de quem chega pelo Portão Oeste.'),
    ('Distrito do Sudoeste', DIST['SO'][0] + 8, DIST['SO'][1] - 6, 'O distrito do sudoeste (nome a definir). A ferraria.'),
    ('Ferraria', 54, 107.5, 'A ferraria, com o pátio da forja ao lado.'),
    ('Distrito do Sul', DIST['S'][0] - 9, DIST['S'][1] - 10, 'O distrito do sul (nome a definir). A igreja menor e o castelo.'),
    ('Igreja do Sul', 88, 133, 'A igreja menor, no distrito do sul.'),
    ('Castelo', 106, 146, 'O pequeno castelo, com pátio murado e torres nos cantos.'),
    ('A Fazenda', DIST['L'][0] + 6, DIST['L'][1] + 10, 'O distrito do leste inteiro é uma grande fazenda: plantações, pomar, currais e o moinho no rio.'),
    ('Casa da Fazenda', 142.5, 74.5, 'A casa-sede da fazenda.'),
    ('Celeiro', 155.5, 73.8, 'O celeiro grande da fazenda.'),
    ('Moinho do rio', MOINHO[0], MOINHO[1] - 2.5, 'O moinho de água, na beira do rio dentro da fazenda.'),
    ('Portão Oeste', PORT['Portão Oeste'][0] + 3, PORT['Portão Oeste'][1], 'Saída para o oeste, pela beira do rio.'),
    ('Portão Leste', PORT['Portão Leste'][0] - 3, PORT['Portão Leste'][1], 'Saída para o leste, pela fazenda.'),
    ('Portão do Sul', PORT['Portão do Sul'][0] - 2, PORT['Portão do Sul'][1] - 3, 'A entrada principal, na estrada que vem de Pasto Bonito.'),
    ('Guarita', 147.5, 144.5, 'A guarita da guarda, junto do Portão do Sul.'),
]


def pintar(S=8, out='campo_prev.png', previa=None):
    M.setup(W, H, S, seed=20261120, fundo=(96, 92, 56))
    M.texturas_padrao()
    M.flat('grama_outono', (112, 106, 62), 14, 0.6, 21)
    M.flat('grama_seca', (134, 118, 70), 12, 0.5, 22)
    M.flat('terra_rua', (122, 100, 72), 10, 0.5, 23)
    M.flat('horta', (88, 72, 50), 10, 0.4, 24)
    M.flat('palha', (176, 150, 86), 12, 0.3, 25)
    M.stone('adro', 0.5, (112, 106, 100), 12, (52, 50, 48), 26, 1.2)
    M.stone('ilha', 0.62, (104, 102, 104), 12, (46, 46, 50), 27, 1.3)
    tudo = M.rect(M.mask(), -1, -1, W + 1, H + 1)
    M.log('traçado')
    dentro_muro = M.poly(M.mask(), MURO)
    # ---- a água ----
    rio = M.OR(M.pline(M.mask(), RIO_O, 2 * RIO_HW), M.pline(M.mask(), RIO_L, 2 * RIO_HW))
    anel = M.SUB(M.disc(M.mask(), *C, AGUA_R), M.disc(M.mask(), *C, ILHA_R + .9))
    agua = M.OR(rio, anel)
    ilha = M.disc(M.mask(), *C, ILHA_R)
    # ---- os distritos ----
    disc = {k: M.disc(M.mask(), *c, RD) for k, c in DIST.items()}
    cinto = {k: M.SUB(M.disc(M.mask(), *c, RD + .4), M.disc(M.mask(), *c, RD - 2.2)) for k, c in DIST.items()}   # o cinturão de árvores
    # ---- as estradas (pedra) ----
    estradas = []                                     # (pts, meia-largura)
    for k, c in DIST.items(): estradas.append(([polar(c, RD + 1.6, a) for a in np.arange(0, 361, 6)], 1.0))   # a estrada em volta de cada distrito
    pontes = []
    for k, a in PONTES.items():
        p0, p1 = polar(C, ILHA_R - .5, a), polar(C, AGUA_R + 1.2, a)
        pontes.append((p0, p1))
        c = DIST[k]; alvo = polar(c, RD + 1.6, ang_de(c, C))
        estradas.append(([p1, alvo], 1.3))
    # as ligações entre os distritos vizinhos (pela estrada de volta)
    ordem = ['N', 'NO', 'SO', 'S', 'L']
    for i, k in enumerate(ordem):
        a, b = DIST[k], DIST[ordem[(i + 1) % 5]]
        pa, pb = polar(a, RD + 1.6, ang_de(a, b)), polar(b, RD + 1.6, ang_de(b, a))
        estradas.append(([pa, pb], 1.1))
    # dos portões
    po, pl, ps = PORT['Portão Oeste'], PORT['Portão Leste'], PORT['Portão do Sul']
    estradas.append(([(po[0] - 4, po[1]), po, (po[0] + 14, po[1] - 4.5), polar(DIST['NO'], RD + 1.6, 200)], 1.3))
    estradas.append(([(po[0] + 14, po[1] - 4.5), (C[0] - AGUA_R - 6, rio_y(C[0] - AGUA_R - 6) - 4.8), polar(DIST['NO'], RD + 1.6, 120)], 1.0))
    estradas.append(([(pl[0] + 4, pl[1]), pl, (pl[0] - 8, pl[1] + 1), polar(DIST['L'], RD + 1.6, -15)], 1.3))
    estradas.append(([(ps[0] + 3, ps[1] + 4), ps, (ps[0] - 6, ps[1] - 6), polar(DIST['S'], RD + 1.6, 10)], 1.4))
    estradas.append(([(ps[0] - 6, ps[1] - 6), polar(DIST['L'], RD + 1.6, 105)], 1.1))
    est = M.mask()
    for pts, hw in estradas: M.pline(est, pts, 2 * hw)
    est = M.SUB(M.AND(est, M.dil(dentro_muro, 2)), M.SUB(agua, M.mask()))
    est_fora = M.mask()
    for pts, hw in estradas[:0]: pass
    # ---- dentro de cada distrito: a pracinha do meio, o anel de rua e as ruas que cruzam ----
    ruas = M.mask()
    pracinhas = M.mask()
    for k, c in DIST.items():
        if k == 'L': continue
        M.pline(ruas, [polar(c, 11.5, a) for a in np.arange(0, 361, 8)], 1.5)
        for a in (ang_de(c, C), ang_de(c, C) + 90, ang_de(c, C) + 180, ang_de(c, C) + 270):
            M.pline(ruas, [polar(c, 3, a), polar(c, RD - 1.5, a)], 1.6)
        M.disc(pracinhas, *c, 4.2)
    # ---- os prédios especiais ----
    predios = {p[0]: M.rect(M.mask(), *p[1:5]) for p in PREDIOS}
    torres = M.OR(M.rect(M.mask(), *TORRE_N), M.rect(M.mask(), *TORRE_S))
    celeiro = M.rect(M.mask(), *CELEIRO)
    especiais = M.OR(*predios.values(), torres, celeiro)
    adro_n = M.rect(M.mask(), 93.5, 22.5, 106.5, 44)
    adro_s = M.rect(M.mask(), 83, 126, 96.5, 140)
    castelo = M.rect(M.mask(), *CASTELO_MURO)
    jardim_b = M.rect(M.mask(), *JARDIM_BORDEL)
    forja = M.rect(M.mask(), 57, 105, 60, 110)
    pateo_est = M.rect(M.mask(), 59, 69.5, 67, 72.5)
    # ---------- o chão ----------
    M.log('chão')
    M.paint(tudo, 'grama_outono')
    M.paint(((M.noise(3.0, seed=41) > 0.58) * 255).astype(np.uint8), 'grama_seca', .7)
    # fora da muralha: campos arados nas bordas
    fora = M.SUB(tudo, M.dil(dentro_muro, 3))
    M.paint(M.AND(fora, ((M.noise(9, seed=5) > .45) * 255).astype(np.uint8)), 'horta', .8)
    for k in ('N', 'NO', 'SO', 'S'):
        M.paint(M.SUB(M.disc(M.mask(), *DIST[k], RD - 2.0), M.OR(ruas, pracinhas)), 'grama', .35)
    # ---- a fazenda (distrito leste) ----
    M.log('fazenda')
    fz = M.disc(M.mask(), *DIST['L'], RD - 2.2)
    cx, cy = DIST['L']
    sulcos = M.mask()
    for t in np.arange(-30, 30, .75): M.pline(sulcos, [(cx - 30, cy + t - 10), (cx + 30, cy + t + 10)], .26)
    sulcos2 = M.mask()
    for t in np.arange(-30, 30, .75): M.pline(sulcos2, [(cx + t, cy - 30), (cx + t - 8, cy + 30)], .26)
    q_ne = M.AND(fz, M.poly(M.mask(), [(cx + 1, cy - 3), (cx + 30, cy - 3), (cx + 30, cy - 30), (cx + 1, cy - 30)]))
    q_se = M.AND(fz, M.poly(M.mask(), [(cx + 1, cy + 4), (cx + 30, cy + 4), (cx + 30, cy + 30), (cx + 1, cy + 30)]))
    q_sw = M.AND(fz, M.poly(M.mask(), [(cx - 30, cy + 4), (cx - 1, cy + 4), (cx - 1, cy + 30), (cx - 30, cy + 30)]))
    q_nw = M.AND(fz, M.poly(M.mask(), [(cx - 30, cy - 3), (cx - 1, cy - 3), (cx - 1, cy - 30), (cx - 30, cy - 30)]))
    q_ne = M.SUB(q_ne, M.dil(celeiro, 2.5))
    M.paint(q_ne, 'palha'); M.paint(M.AND(sulcos, q_ne), (150, 124, 66), .7)                    # trigo colhido
    M.paint(q_se, 'horta'); M.paint(M.AND(sulcos2, q_se), (62, 50, 36), .6)                     # terra arada
    M.paint(q_sw, 'horta'); M.paint(M.AND(sulcos, q_sw), (96, 108, 48), .9)                      # abóboras
    ab = M.mask()
    for k in range(260):
        x, y = cx - 18 + M.rng.random() * 18, cy + 4 + M.rng.random() * 16
        M.disc(ab, x, y, .3)
    ab = M.AND(ab, q_sw); M.sombra(ab, .06, .1, .04, .4); M.paint(ab, (222, 120, 38))
    M.paint(M.SUB(q_nw, M.dil(predios['Casa da Fazenda'], 2.5)), 'grama', .6)                  # o pomar e a horta da casa
    # o curral (perto do celeiro) e os fardos
    curral = M.rect(M.mask(), 160.5, 69, 167, 78)
    M.paint(curral, 'terra')
    M.paint(M.borda(curral, .25), (100, 76, 48))
    # ---- as estradas, as ruas, as pracinhas ----
    M.paint(ruas, 'rua'); M.paint(M.borda(M.dil(ruas, .1), .15), (60, 58, 58), .5)
    M.paint(est, 'rua_grande'); M.paint(M.borda(M.dil(est, .2), .2), (70, 66, 60), .6)
    M.paint(pracinhas, 'praca')
    M.paint(adro_n, 'adro'); M.paint(adro_s, 'adro')
    M.paint(castelo, 'patio')
    M.paint(jardim_b, 'jardim'); M.paint(forja, 'terra'); M.paint(pateo_est, 'terra')
    # ---- a água ----
    M.log('água')
    margem = M.SUB(M.dil(agua, .9), agua)
    M.paint(M.SUB(margem, ilha), 'muro')
    M.agua(agua)
    M.ondas(agua, 900)
    # a ilha (a plataforma da praça central)
    M.sombra(ilha, .3, .4, .2, .5)
    M.paint(ilha, 'ilha')
    M.paint(M.borda(ilha, .45), 'muro')
    M.paint(M.borda(ilha, .05), (26, 26, 30), .8)
    # as pontes
    M.log('pontes')
    for (p0, p1) in pontes:
        a, b = np.array(p0), np.array(p1); u = (b - a) / np.linalg.norm(b - a); n = np.array([-u[1], u[0]])
        pts = [a - n * 1.4, b - n * 1.4, b + n * 1.4, a + n * 1.4]
        with M.roi(min(a[0], b[0]) - 2, min(a[1], b[1]) - 2, max(a[0], b[0]) + 2, max(a[1], b[1]) + 2, 2):
            m = M.poly(M.mask(), pts)
            M.sombra(m, .3, .45, .2, .5)
            M.paint(m, 'rua_grande')
            par = M.OR(M.pline(M.mask(), [a - n * 1.3, b - n * 1.3], .3), M.pline(M.mask(), [a + n * 1.3, b + n * 1.3], .3))
            M.paint(par, 'muro'); M.paint(M.borda(M.dil(par, .02)), (24, 24, 28), .7)
    # as pontes dos portões (onde as estradas cruzam o rio, perto da muralha) e a pontezinha da fazenda
    for x in (po[0] + 12, cx - 5):
        y = rio_y(x)
        with M.roi(x - 2, y - 4, x + 2, y + 4, 1):
            m = M.rect(M.mask(), x - 1.2, y - RIO_HW - 1, x + 1.2, y + RIO_HW + 1)
            M.sombra(m, .2, .3, .1, .45)
            M.paint(m, M.TX.get('tabua') if False else (110, 84, 56))
            l = M.mask()
            for t in np.arange(y - RIO_HW - 1, y + RIO_HW + 1, .25): M.pline(l, [(x - 1.2, t), (x + 1.2, t)], .04)
            M.paint(M.AND(l, m), (64, 46, 30), .7)
            M.paint(M.borda(m), (40, 28, 18), .8)
    # ---------- as casas ----------
    M.log('casas')
    dgrid = np.zeros((H, W), np.uint8)
    for i, k in enumerate(('N', 'NO', 'SO', 'S')):
        c = DIST[k]
        yy, xx = np.mgrid[0:H, 0:W]
        dgrid[(xx + .5 - c[0]) ** 2 + (yy + .5 - c[1]) ** 2 < RD ** 2] = i + 1
    reservado = M.OR(M.dil(especiais, .8), adro_n, adro_s, castelo, jardim_b, forja, pateo_est, M.dil(pracinhas, .4))
    livre = M.mask()
    for k in ('N', 'NO', 'SO', 'S'): M.disc(livre, *DIST[k], RD - 2.6)
    livre = M.SUB(livre, M.OR(M.dil(ruas, .35), reservado))
    PAR = {0: dict(depth=3.0, lot=4.2, second=False)}
    for b in range(1, 5): PAR[b] = dict(depth=3.0, lot=4.4, second=False)
    PAL = [(150, 84, 56), (132, 70, 50), (160, 104, 62), (118, 82, 58), (104, 92, 76), (142, 118, 80), (96, 70, 56), (170, 92, 52), (90, 92, 100), (110, 112, 120)]
    PW = {0: list(range(10)), 1: [8, 9, 0, 3, 4], 2: [0, 1, 2, 5, 7], 3: [0, 2, 3, 6, 7], 4: [8, 9, 1, 4, 5]}
    foot, colidx = M.casario_ret(livre, dgrid, PAR, PW, frente=.4, inner=False)
    # só uma parte dos lotes vira casa (a cidade tem umas 60 casas): as outras ficam de quintal
    n, lab = cv2.connectedComponents(foot, connectivity=4)
    keep = np.zeros(n, bool); keep[1:] = True
    foot = (keep[lab]).astype(np.uint8) * 255
    print('casas comuns:', int(keep.sum()))
    # quintais: hortinhas atrás de algumas casas
    for i, nome in enumerate([p[0] for p in PREDIOS]): colidx[predios[nome] > 127] = 20 + i
    colidx[torres > 127] = 30; colidx[celeiro > 127] = 31
    foot = M.OR(foot, especiais)
    PAL2 = PAL + [(0, 0, 0)] * (20 - len(PAL)) + [p[5] for p in PREDIOS] + [(0, 0, 0)] * (30 - 20 - len(PREDIOS)) + [(70, 72, 84), (132, 64, 46)]
    M.sombra(foot, .5, .62, .2, .45)
    M.telhados(foot, colidx, PAL2)
    chm = M.chamines(foot, especiais, .1)
    # os campanários (mais altos) e as cruzes
    for T in (TORRE_N, TORRE_S):
        with M.roi(T[0], T[1], T[2], T[3], 3):
            tm = M.rect(M.mask(), *T)
            M.sombra(tm, 1.6, 2.0, .4, .5)
            M.telhado_local(tm, (70, 72, 84), course=.2, contraste=.45)
            tx, ty = (T[0] + T[2]) / 2, (T[1] + T[3]) / 2
            cr = M.OR(M.rect(M.mask(), tx - .12, ty - .8, tx + .12, ty + .8), M.rect(M.mask(), tx - .5, ty - .35, tx + .5, ty - .12))
            M.paint(cr, (210, 186, 116))
    # ---------- o castelo: muro do pátio, torres nos cantos, a torre de menagem ----------
    M.log('castelo')
    x0, y0, x1, y1 = CASTELO_MURO
    cmuro = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    gate_c = ((x0 + x1) / 2, y0)
    M.muralha(cmuro, 1.0, M.gaps_de([gate_c], 1.5), closed=True, lado=((x0 + x1) / 2, (y0 + y1) / 2))
    for (tx, ty) in cmuro: M.torre_redonda(tx, ty, 1.6)
    M.portao(gate_c[0], gate_c[1], cmuro, 1.1)
    M.torre_quadrada(108.5, 147.5, 112, 151, None, alto=1.6)
    # bonecos de treino no pátio
    for x in (99.5, 101.5, 103.5):
        M.paint(M.disc(M.mask(), x, 152, .4), (150, 120, 80)); M.paint(M.disc(M.mask(), x, 152, .18), (90, 60, 40))
    # ---------- a muralha da cidade ----------
    M.log('muralha')
    gates = list(PORT.values())
    # onde o rio passa: grades
    grade = [g for g in (elipse(180), elipse(0))]
    gm = M.gaps_de(gates, 1.6)
    M.muralha(MURO, 1.3, gm, closed=True, lado=C)
    for p in M.torres_ao_longo(MURO, 18, gates, dist=5): M.torre_redonda(p[0], p[1], 1.55)
    for nome, (x, y) in PORT.items(): M.portao(x, y, MURO, 1.45)
    for (x, y) in grade:
        with M.roi(x - 3, y - 4, x + 3, y + 4, 1):
            gr = M.mask()
            for t in np.arange(-RIO_HW + .3, RIO_HW, .5): M.pline(gr, [(x - .7, rio_y(x) + t), (x + .7, rio_y(x) + t)], .1)
            M.paint(gr, (110, 104, 96), .9)
    # ---------- o mercado: barracas na ilha, em volta do salão ----------
    M.log('mercado')
    COR_OUT = [((176, 96, 40), (220, 200, 160)), ((150, 50, 40), (220, 200, 160)), ((190, 140, 50), (110, 50, 36)), ((60, 90, 120), (220, 200, 160))]
    for a in np.arange(0, 360, 360 / 26):
        if any(abs(((a - pa + 180) % 360) - 180) < 9 for pa in PONTES.values()): continue
        x, y = polar(C, 7.6, a)
        if 95 < x < 105 and 81 < y < 89: continue
        if M.rng.random() < .15: continue
        M.barraca(x - .8, y - .6, 1.6, 1.2, COR_OUT)
    M.fonte(C[0], C[1] + 5.2, 1.0)
    # ---------- a fazenda: o moinho, os animais, os fardos, as cercas ----------
    M.log('detalhes')
    mx, my = MOINHO
    with M.roi(mx - 4, my - 6, mx + 4, my + 3, 2):
        mm = M.rect(M.mask(), mx - 2.2, my - 6, mx + 2.2, my - 2.4)
        M.sombra(mm, .6, .8, .2, .5)
        M.telhado_local(mm, (120, 92, 66))
        M.paint(M.borda(mm), (30, 26, 24), .8)
        roda = M.disc(M.mask(), mx + 2.9, my - 2.0, 1.4)
        M.sombra(roda, .2, .3, .1, .4); M.paint(roda, (100, 76, 50))
        for a in np.arange(0, 2 * math.pi, math.pi / 4):
            M.paint(M.pline(M.mask(), [(mx + 2.9, my - 2.0), (mx + 2.9 + math.cos(a) * 1.3, my - 2.0 + math.sin(a) * 1.3)], .12), (70, 52, 34))
    for k in range(9):
        x, y = 161.5 + M.rng.random() * 4.5, 70 + M.rng.random() * 7
        with M.roi(x - 1, y - 1, x + 1, y + 1, .5):
            b = M.ellipse(M.mask(), x, y, .55, .28, M.rng.random() * 180)
            M.sombra(b, .1, .14, .05, .4); M.paint(b, [(120, 84, 56), (60, 50, 44), (210, 200, 186)][k % 3])
    for (x, y) in [(151, 79), (152.5, 79.5), (154, 79), (150.5, 69.2), (158, 69)]:
        with M.roi(x - 1, y - 1, x + 1, y + 1, .5):
            f = M.disc(M.mask(), x, y, .55); M.sombra(f, .15, .2, .08, .45); M.paint(f, (196, 166, 92)); M.paint(M.borda(f, .05), (110, 86, 40), .8)
    # cercas dos campos
    cerca = M.mask()
    for q in (q_ne, q_se, q_sw): cerca = M.OR(cerca, M.borda(q, .08))
    M.paint(cerca, (110, 84, 54), .9)
    # o jardim do bordel: flores vermelhas e caminhos
    fl = M.mask()
    for k in range(140): M.disc(fl, JARDIM_BORDEL[0] + .5 + M.rng.random() * 8, JARDIM_BORDEL[1] + .4 + M.rng.random() * 2.2, .18)
    M.paint(fl, (178, 40, 60), .9)
    M.paint(M.borda(jardim_b, .2), (90, 70, 50), .8)
    # a forja
    M.paint(M.disc(M.mask(), 58.5, 108.5, .8), (40, 36, 34))
    M.paint(M.rect(M.mask(), 57.5, 105.8, 58.7, 106.4), (70, 70, 76))
    # ---------- as árvores: o cinturão em volta de cada distrito, o pomar, as pracinhas ----------
    M.log('árvores')
    OUTONO = [(196, 92, 36), (214, 132, 40), (176, 62, 40), (200, 160, 60), (150, 110, 50), (186, 76, 44), (120, 110, 56)]
    ocup = M.OR(M.dil(foot, .5), M.dil(est, .4), M.dil(ruas, .3), M.dil(agua, .6), castelo, ilha)
    cint = M.SUB(M.OR(*cinto.values()), ocup)
    tg = np.zeros((H, W), np.uint8)
    M.arvores_em(cint, tg, {0: .9}, cores=OUTONO, rmin=.9, rmax=1.4)
    pomar = M.SUB(q_nw, M.OR(M.dil(predios['Casa da Fazenda'], 2.5), M.dil(est, .5)))
    for x in np.arange(cx - 18, cx, 2.6):
        for y in np.arange(cy - 20, cy - 3, 2.6):
            if M.em(pomar, x, y): M.arvore(x, y, .9, [(176, 62, 40), (196, 120, 40), (120, 110, 56)][int(x * 7 + y) % 3], flor=(200, 40, 40))
    resto = M.SUB(dentro_muro, M.OR(ocup, M.OR(*disc.values()), M.dil(M.OR(*disc.values()), 1)))
    campos = M.AND(M.ero(resto, 1.0), ((M.noise(6, seed=95) > .6) * 255).astype(np.uint8))
    M.paint(campos, 'palha', .9)
    sl2 = M.mask()
    for t in np.arange(-H, W + H, .7): M.pline(sl2, [(t, 0), (t + H * .4, H)], .25)
    M.paint(M.AND(sl2, campos), (150, 124, 66), .6)
    M.paint(M.borda(campos, .08), (110, 84, 54), .8)
    resto = M.SUB(resto, M.dil(campos, .5))
    M.arvores_em(M.AND(resto, ((M.noise(7, seed=91) > .62) * 255).astype(np.uint8)), tg, {0: .05}, cores=OUTONO, rmin=1.0, rmax=1.8)
    M.arvores_em(M.SUB(tudo, M.OR(M.dil(dentro_muro, 3), M.dil(est, .5), M.dil(agua, .5))), tg, {0: .035}, cores=OUTONO, rmin=1.0, rmax=1.8)
    quint = M.SUB(M.OR(*[M.disc(M.mask(), *DIST[k], RD - 2.6) for k in ('N', 'NO', 'SO', 'S')]), M.OR(ocup, reservado))
    hq = M.AND(quint, ((M.noise(2.2, seed=93) > .58) * 255).astype(np.uint8))
    hq = M.SUB(hq, M.dil(foot, .3))
    M.paint(hq, 'horta', .95)
    sl = M.mask()
    for t in np.arange(0, W + H, .8): M.pline(sl, [(t, 0), (t - H, H)], .3)
    M.paint(M.AND(sl, hq), (92, 112, 50), .85)
    quint = M.SUB(quint, hq)
    M.arvores_em(quint, dgrid, {1: .06, 2: .06, 3: .06, 4: .06}, cores=OUTONO, rmin=.7, rmax=1.1)
    # folhas no chão
    folhas = M.mask()
    for k in range(int(W * H * .9)):
        x, y = M.rng.random() * W, M.rng.random() * H
        M.ellipse(folhas, x, y, .12 + M.rng.random() * .08, .07, M.rng.random() * 180)
    folhas = M.SUB(folhas, M.OR(M.dil(foot, .05), agua))
    M.paint(M.AND(folhas, ((M.noise(1.5, seed=77) > .4) * 255).astype(np.uint8)), (204, 110, 40), .7)
    M.paint(M.AND(folhas, ((M.noise(1.5, seed=78) > .6) * 255).astype(np.uint8)), (190, 70, 40), .65)
    # ---------- os lampiões ----------
    lamps = M.lampioes_rua([(pts, hw) for pts, hw in estradas[5:]], 9, lambda q: M.em(dentro_muro, *q) and not M.em(agua, *q))
    lamps += [polar(C, ILHA_R - .6, a) for a in np.arange(15, 360, 30)]
    M.lampioes(lamps)
    bo = ad('Bordel')
    M.lampioes([(bo[1] + 1, bo[4] + .5), (bo[3] - 1, bo[4] + .5), ((bo[1] + bo[3]) / 2, bo[4] + 3.2)], raio=.9, cor_luz=(0.6, 0.08, 0.06), brilho=1.4, cor=(255, 90, 80))
    M.fumaca([(x, y) for x, y in chm[:40]], .6, .25)
    M.acabamento(desat=.9, tint=(1.03, 0.99, 0.94), vinheta=.22)
    M.salvar(out, previa)


def portas():
    out = []
    for nome, x0, y0, x1, y1, cor, lado, tp in PREDIOS:
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        x, y = {'s': (cx, y1 + .6), 'n': (cx, y0 - .6), 'l': (x1 + .6, cy), 'o': (x0 - .6, cy)}[lado]
        if nome == 'Igreja do Norte': x = cx + 2.6
        out.append(dict(nome=nome, x=x, y=y, w=round(x1 - x0), h=round(y1 - y0), p=lado, t=tp))
    return out


if __name__ == '__main__':
    S = float(sys.argv[1]) if len(sys.argv) > 1 else 8
    pintar(S, sys.argv[2] if len(sys.argv) > 2 else 'campo_prev.png', sys.argv[3] if len(sys.argv) > 3 else None)
    json.dump(dict(W=W, H=H, lugares=LUGARES, portas=portas(), muro=MURO, portoes=list(PORT.values()), castelo=CASTELO_MURO), open('campo_meta.json', 'w'), ensure_ascii=False)
