"""Capital Kitsune — a maior cidade da nação Kitsune: o palácio da Corte lunar no morro (o único lugar murado),
ruas em grade, o Rio das Mil Fozes a oeste com canais, arrozais nas bordas, o Templo das Três Luas com pagodes,
cerejeiras e a Rua das Lanternas. 190 x 136 quadrados de 5 m (950 m x 680 m). Proposta do Claude, 8/nov/2026."""
import sys, math
import numpy as np, cv2
import motor as M

W, H = 190, 136
RIO = M.suave([(20, -4), (15, 30), (21, 60), (13, 90), (19, 118), (15, 140)], 3)
RHW = 5.0
def rio_x(y): return float(np.interp(y, [p[1] for p in RIO], [p[0] for p in RIO]))
CANAIS = [[(rio_x(70), 70), (60, 70), (110, 70.5), (170, 70)], [(rio_x(104), 104), (70, 104), (120, 103.5), (166, 104)]]
MORRO = (95, 30, 36, 24)
PALACIO = [(72, 14), (118, 14), (118, 47), (72, 47)]
PORTA_PAL = (95, 47)
AVENIDA = [(95, 47), (95, 60), (95, 136)]
RUA_LANTERNAS = [(30, 86), (95, 86), (166, 86)]
TEMPLO = (150, 36)
ARROZ_L = (170, 0, 190, 136)
ARROZ_S = (24, 122, 170, 136)
LUGARES = [
    ('Palácio da Corte lunar', 95, 27, 'O palácio de Aurora, a líder dos Kitsunes: serena e pragmática. O único lugar murado da cidade.'),
    ('Salão da Lua', 95, 26, 'O salão principal do palácio, com o telhado de cinco andares.'),
    ('Quartel das Lanças da Lua', 82, 41.5, 'A guarda da Corte. Vigiam a costa leste, de onde vêm os ataques da ilha de Iroma.'),
    ('Jardim do Lago', 108, 38, 'O jardim do palácio, com o lago e a ponte vermelha.'),
    ('Portão do Palácio', 95, 49, 'A única entrada do palácio, no alto da escadaria.'),
    ('Avenida da Lua', 95, 70, 'A avenida que desce do palácio até o Grande Torii.'),
    ('Grande Torii', 95, 121, 'O portal vermelho na entrada sul da cidade.'),
    ('Templo das Três Luas', 150, 36, 'Os três pagodes de Yamamune, Ayshiro e Semune, em volta do Lago da Lua.'),
    ('Rua das Lanternas', 60, 86, 'A rua do mercado, coberta de lanternas de papel. Aberta até tarde.'),
    ('Casa das Lâminas', 62, 82.5, 'Lâminas Kitsune, leques de guerra e armaduras leves.'),
    ('Boticário da Lua', 128, 89.5, 'Ervas, incensos, remédios e coisas para o mundo espiritual.'),
    ('Canal do Norte', 140, 70, 'Canal que traz a água do rio para os bairros e os arrozais.'),
    ('Canal do Sul', 140, 104, 'Canal que traz a água do rio para os bairros e os arrozais.'),
    ('Cais do Rio', rio_x(80) + 7, 80, 'O cais no Rio das Mil Fozes: barcos que descem para o delta.'),
    ('Arrozais', 180, 60, 'Os arrozais que alimentam a cidade.'),
    ('Altar sem nome', rio_x(122) + 8, 122, 'Um altar pequeno, sem nome, na beira do rio. Quem deixa oferenda aqui reza a Semune em segredo.'),
    ('Caminho da Serra', 172, 3, 'A trilha que sobe a serra de Cristal Lunar (o Ninho das Aranhas de Cristal fica lá em cima).'),
]
MUROS = [(PALACIO, True, [PORTA_PAL], 1.6)]


def pagode(x, y, tam, andares, cor=(70, 74, 88), cor2=(150, 52, 42)):
    """pagode visto de cima: telhados de quatro águas empilhados, cada um menor"""
    with M.roi(x - tam, y - tam, x + tam, y + tam, 3):
        for i in range(andares):
            s_ = tam * (1 - i / (andares + .6))
            m = M.rect(M.mask(), x - s_ / 2, y - s_ / 2, x + s_ / 2, y + s_ / 2)
            M.sombra(m, .5 + .3 * i, .65 + .35 * i, .2, .4)
            M.telhado_local(m, cor if i % 2 == 0 else tuple(np.array(cor) * 1.12), course=.1, contraste=.36)
            M.paint(M.borda(m, .06), cor2, .9)
        M.paint(M.disc(M.mask(), x, y, .3), (200, 170, 90))


def torii(x, y, larg, ang=0):
    a = math.radians(ang); u = np.array([math.cos(a), math.sin(a)]); n = np.array([-u[1], u[0]]); c = np.array([x, y])
    with M.roi(x - larg, y - larg, x + larg, y + larg, 1):
        trave = M.pline(M.mask(), [c - u * larg / 2, c + u * larg / 2], .45)
        M.sombra(trave, .5, .7, .1, .45)
        M.paint(trave, (176, 48, 36))
        M.paint(M.pline(M.mask(), [c - u * larg / 2 + n * .05, c + u * larg / 2 + n * .05], .14), (30, 24, 24))
        for s_ in (-.36, .36):
            p = c + u * larg * s_
            M.paint(M.disc(M.mask(), p[0], p[1], .3), (40, 30, 28))


def ponte_vermelha(x, y, comp, larg, vertical=True):
    with M.roi(x - comp, y - comp, x + comp, y + comp, 1):
        if vertical: m = M.rect(M.mask(), x - larg / 2, y - comp / 2, x + larg / 2, y + comp / 2)
        else: m = M.rect(M.mask(), x - comp / 2, y - larg / 2, x + comp / 2, y + larg / 2)
        M.sombra(m, .25, .4, .15, .5)
        M.paint(m, 'madeira')
        g = M.borda(m, .12)
        M.paint(g, (172, 50, 38))


def lanterna_pedra(x, y):
    with M.roi(x - .5, y - .5, x + .5, y + .5, .5):
        m = M.rect(M.mask(), x - .3, y - .3, x + .3, y + .3)
        M.sombra(m, .2, .3, .05, .5); M.paint(m, (120, 118, 112)); M.paint(M.disc(M.mask(), x, y, .12), (255, 220, 150))


def pintar(S=8, out='kitsune_prev.png', previa=None):
    M.setup(W, H, S, seed=9444, fundo=(56, 72, 52))
    M.texturas_padrao()
    M.stone('muro', .24, (196, 192, 182), 8, (120, 116, 110), 61, .8, .15)        # muro de reboco branco
    M.stone('muro_topo', .18, (64, 68, 80), 8, (36, 38, 46), 62, .8, .2)           # a telha escura em cima do muro
    M.stone('rua', .32, (104, 100, 92), 10, (64, 60, 56), 63, 1.0, .1)
    M.stone('rua_grande', .4, (118, 114, 106), 10, (70, 66, 60), 64, 1.0, .12)
    M.flat('encosta', (64, 84, 56), 12, .5, 65)
    M.planks('madeira', (120, 86, 58), .22, 66)
    M.flat('arrozal', (82, 118, 72), 10, .4, 67)
    M.log('traçado')
    mx, my, mrx, mry = MORRO
    morro = M.irregular(M.ellipse(M.mask(), mx, my, mrx, mry), .4, 1.5)
    colina_t = M.irregular(M.ellipse(M.mask(), TEMPLO[0], TEMPLO[1], 16, 12), .4, 1.2)
    alto = M.OR(morro, colina_t)
    rio = M.pline(M.mask(), RIO, 2 * RHW)
    margem = M.pline(M.mask(), RIO, 2 * RHW + 1.4)
    canais = M.mask()
    for c in CANAIS: M.pline(canais, c, 2.2)
    canais = M.SUB(canais, rio)
    canal_b = M.SUB(M.OR(*[M.pline(M.mask(), c, 3.4) for c in CANAIS]), M.OR(canais, rio))
    arroz = M.OR(M.rect(M.mask(), *ARROZ_L), M.rect(M.mask(), *ARROZ_S))
    arroz = M.SUB(arroz, M.dil(alto, 1))
    pal = M.poly(M.mask(), PALACIO)
    avenida = M.pline(M.mask(), AVENIDA, 3.2)
    lanternas = M.pline(M.mask(), RUA_LANTERNAS, 3.0)
    face = M.SUB(M.dil(alto, 2.4), alto)
    cidade = M.SUB(M.NOT(M.OR(margem, canais, canal_b, arroz)), M.rect(M.mask(), 0, 0, rio_x(0), H) if False else M.mask())
    a_oeste = M.poly(M.mask(), [(p[0] + RHW + .7, p[1]) for p in RIO] + [(-2, H + 2), (-2, -2)])
    cidade = M.SUB(cidade, a_oeste)
    grade = M.ruas_grade(M.SUB(cidade, M.OR(alto, face)), 95, 86, 0, 13, 11, 1.3)
    # caminhos no morro do templo e na encosta
    trilhas = M.OR(M.pline(M.mask(), [(95, 60), (120, 58), (138, 50), (150, 46)], 1.4), M.pline(M.mask(), [(150, 22), (165, 10), (172, -2)], 1.2))
    cais = M.SUB(M.AND(M.pline(M.mask(), [(rio_x(y), y) for y in np.arange(74, 98, 1.0)], 2 * RHW + 4), cidade), margem)
    pav = M.OR(M.AND(M.OR(grade, avenida, lanternas), cidade), cais, M.SUB(trilhas, pal))
    pav = M.SUB(pav, M.SUB(M.OR(alto, face), M.OR(avenida, trilhas)))

    def bairro(x, y):
        if y < 62 and 50 < x < 140: return 0
        if 78 < y < 94: return 2
        if x < 44: return 3
        return 1
    dgrid = np.array([[bairro(i + .5, j + .5) for i in range(W)] for j in range(H)], np.uint8)

    # ---------- o chão ----------
    M.log('chão')
    M.paint(cidade, 'jardim'); M.paint(M.AND(cidade, ((M.noise(2.5, seed=4) > .55) * 255).astype(np.uint8)), 'terra', .5)
    M.paint(alto, 'encosta')
    M.paint(a_oeste, 'grama_escura')
    # os arrozais: quadros de água verde com diques
    M.paint(arroz, 'arrozal')
    dq = M.mask()
    for x in np.arange(0, W, 6): M.pline(dq, [(x, 0), (x + 1, H)], .25)
    for y in np.arange(0, H, 4.5): M.pline(dq, [(0, y), (W, y + .5)], .25)
    M.paint(M.AND(dq, arroz), (96, 86, 62), .9)
    reflexo = M.AND(arroz, ((M.noise(1.2, seed=12) > .62) * 255).astype(np.uint8))
    M.paint(reflexo, (120, 150, 156), .35)
    M.paint(M.SUB(pav, alto), 'rua'); M.paint(M.AND(M.OR(avenida, lanternas), cidade), 'rua_grande')
    M.paint(cais, 'cais')
    M.flat('cascalho', (170, 164, 150), 10, .2, 68)
    M.paint(pal, 'cascalho')
    # ---------- o morro e a colina do templo (encostas) ----------
    M.log('morros')
    M.penhasco(alto, 2.4, 'encosta', estratos=0, k_sombra=.5)
    M.paint(M.AND(trilhas, M.NOT(pal)), 'rua')
    # ---------- o rio e os canais ----------
    M.log('água')
    M.paint(margem, 'muro'); M.paint(canal_b, 'muro')
    M.agua(rio, 'agua'); M.agua(canais, 'agua', espuma=False, fundo=False)
    M.ondas(rio, 220, .6)
    # ---------- as casas ----------
    M.log('casas')
    livre = M.SUB(cidade, M.OR(pav, alto, face, M.dil(pal, 1), canal_b, M.dil(avenida, .3)))
    PAR = {0: dict(depth=4.0, lot=4.4, second=False), 1: dict(depth=3.0, lot=3.0), 2: dict(depth=2.8, lot=2.6), 3: dict(depth=3.0, lot=3.0)}
    PAL = [(60, 66, 80), (70, 76, 92), (54, 58, 70), (78, 84, 96), (66, 82, 78), (150, 56, 44), (112, 90, 64), (96, 78, 60), (64, 70, 86)]
    PALW = {0: [0, 1, 3, 4, 8], 1: [0, 1, 2, 3, 8, 6], 2: [0, 2, 5, 6, 7, 1], 3: [6, 7, 0, 2, 7]}
    foot, colidx = M.casario_ret(livre, dgrid, PAR, PALW, frente=.3)
    l2 = M.SUB(livre, M.dil(foot, .4))
    f2, c2 = M.casario_ret(l2, dgrid, PAR, PALW, frente=.3)
    colidx[f2 > 0] = c2[f2 > 0]; foot = M.OR(foot, f2)
    # o palácio: o salão de cinco telhados, alas, o quartel
    esp = M.mask()
    def sp(m, c):
        nonlocal esp
        colidx[m > 127] = c; esp = M.OR(esp, m)
    sp(M.rect(M.mask(), 74.5, 17, 84, 31), 1); sp(M.rect(M.mask(), 106, 17, 115.5, 27), 1)
    sp(M.rect(M.mask(), 75.5, 38.5, 89, 44.5), 2)
    sp(M.rect(M.mask(), 109, 42, 115, 45), 5)
    foot = M.OR(foot, esp)
    M.sombra(foot, .42, .55, .18, .42)
    M.telhados(foot, colidx, PAL, contraste=.3)
    M.paint(M.borda(foot, .05), (40, 34, 36), .5)
    # o jardim do lago no palácio, com a ponte vermelha
    M.paint(M.rect(M.mask(), 99, 31.5, 116, 41), 'jardim')
    lago = M.irregular(M.ellipse(M.mask(), 108, 36.5, 5.5, 3.2), .3, .8)
    M.agua(lago, 'agua', espuma=False)
    ponte_vermelha(108, 36.5, 6.5, 1.0, vertical=True)
    pagode(95, 26, 13, 5)
    # ---------- o muro branco do palácio e a escadaria ----------
    M.log('palácio')
    gaps = M.gaps_de([PORTA_PAL], 1.6)
    M.muralha(PALACIO, 1.5, gaps, closed=True, ameias=(214, 210, 200))
    for p in PALACIO: M.torre_quadrada(p[0] - 2, p[1] - 2, p[0] + 2, p[1] + 2, telhado=(64, 68, 80))
    M.torre_quadrada(PORTA_PAL[0] - 4.2, PORTA_PAL[1] - 1.6, PORTA_PAL[0] - 1.7, PORTA_PAL[1] + 1.6, telhado=(64, 68, 80))
    M.torre_quadrada(PORTA_PAL[0] + 1.7, PORTA_PAL[1] - 1.6, PORTA_PAL[0] + 4.2, PORTA_PAL[1] + 1.6, telhado=(64, 68, 80))
    M.escada((95, 60), (95, 48.6), 4.0)
    # ---------- o Templo das Três Luas ----------
    tx, ty = TEMPLO
    M.paint(M.disc(M.mask(), tx, ty, 10), 'praca')
    lago_l = M.disc(M.mask(), tx, ty, 3.4)
    M.agua(lago_l, 'agua', espuma=False)
    for k in range(3):
        a = math.radians(-90 + k * 120)
        pagode(tx + math.cos(a) * 7, ty + math.sin(a) * 7, 5.2, 4, cor=(150, 56, 44) if k == 0 else (70, 74, 88), cor2=(190, 160, 90))
    for i, t in enumerate(np.linspace(0, 1, 6)):
        p = np.array([95, 60]) * 0 + np.array([(120, 58), (138, 50), (146, 47)][min(2, i // 2)])
        pass
    for p in M.ao_longo([(120, 58), (138, 50), (146, 46.5)], 3.2, 1):
        q, u = p
        torii(q[0], q[1], 3.4, math.degrees(math.atan2(u[1], u[0])) + 90)
    for a in np.linspace(0, 2 * math.pi, 9, endpoint=False):
        lanterna_pedra(tx + math.cos(a) * 9.2, ty + math.sin(a) * 9.2)
    # ---------- o Grande Torii, as pontes dos canais, o cais ----------
    torii(95, 121, 6.5, 0)
    torii(95, 117.5, 5.0, 0)
    for c in CANAIS:
        y = c[1][1]
        for x in np.arange(30, 170, 13):
            xx = 95 + round((x - 95) / 13) * 13
            if xx < rio_x(y) + RHW + 2 or xx > c[-1][0]: continue
            ponte_vermelha(xx, y, 4.0, 1.6 if xx != 95 else 3.2, vertical=True)
    for y in np.arange(76, 97, 5):
        x0 = rio_x(y) + RHW + .2
        M.pier(x0 - 3.2, y, x0, y + .8)
        M.barco(x0 - 4.8, y + 2, 2.6, .55, 90 + (M.rng.random() - .5) * 30)
    # ---------- a Rua das Lanternas: barracas e lanternas de papel ----------
    M.log('mercado')
    M.barracas((32, 84.2, 165, 85.5), passo=(2.2, 2.0), p=.6, evita=lambda x, y: abs(x - 95) < 3 or abs((x - 95) % 13) < 1.6,
               cores=[((168, 52, 40), (220, 200, 160)), ((44, 60, 96), (210, 196, 168)), ((190, 150, 60), (120, 40, 36))])
    # ---------- as árvores: cerejeiras e pinheiros ----------
    M.log('árvores')
    livre_a = M.SUB(M.OR(cidade, alto), M.OR(M.dil(foot, .4), pav, M.dil(pal, .2), M.disc(M.mask(), tx, ty, 10.5), face, arroz))
    livre_a = M.OR(livre_a, M.AND(M.rect(M.mask(), 99, 31.5, 116, 41), M.NOT(M.dil(lago, .5))))
    sakura = lambda b: (232, 170, 190) if M.rng.random() < .55 else None
    M.arvores_em(livre_a, dgrid, {0: .3, 1: .2, 2: .1, 3: .28}, cores=[(70, 96, 60), (58, 86, 52), (88, 104, 70)], flor=sakura)
    for x in np.arange(34, 168, 6.5):
        for c in CANAIS:
            y = c[1][1] + (2.6 if x % 13 < 6.5 else -2.6)
            if x > rio_x(y) + RHW + 3 and not M.em(foot, x, y): M.arvore(x, y, .9, (88, 104, 70), (236, 176, 196))
    # ---------- lanternas ----------
    papel = [(x, 84.4) for x in np.arange(33, 166, 3.2)] + [(x, 87.6) for x in np.arange(34.6, 166, 3.2)]
    M.lampioes(papel, raio=.7, cor_luz=(.7, .22, .1), cor=(255, 150, 110), brilho=1.3)
    M.lampioes(M.lampioes_rua([(AVENIDA, 1.6)], 7, lambda q: M.em(cidade, *q)), cor_luz=(.55, .32, .1))
    M.acabamento(desat=.84, tint=(.98, .98, 1.02))
    M.salvar(out, previa)


if __name__ == '__main__':
    pintar(float(sys.argv[1]) if len(sys.argv) > 1 else 8, sys.argv[2] if len(sys.argv) > 2 else 'kitsune_prev.png', sys.argv[3] if len(sys.argv) > 3 else None)
