"""Porto da Baía — cidade baixa (cais, docas, estaleiro) e cidade alta no penhasco (Palácio do Concílio).
Muro só do lado de terra. 200 x 150 quadrados de 5 m (1 km x 750 m). Proposta do Claude, 8/nov/2026."""
import sys, math
import numpy as np, cv2
import motor as M

W, H = 200, 150
COSTA = [(-2, 104), (20, 106), (40, 110), (58, 111), (72, 108), (80, 99), (84, 96.6), (148, 96.6), (152, 100), (160, 106), (180, 108), (202, 106)]
MOLE_O = [(79, 100), (86, 110), (95, 119), (103, 125.5)]
MOLE_L = [(151, 101), (146, 112), (136, 121), (124, 126.5)]
PENHASCO = [(-2, 72), (20, 68), (40, 70), (60, 76), (80, 74), (100, 70), (120, 68), (140, 72), (160, 69), (180, 64), (202, 67)]
MURO = [(3, 107), (3, 72), (4, 40), (8, 10), (60, 5.5), (100, 5), (140, 5.5), (195, 9), (197, 40), (197, 66), (197, 108)]
PORTOES = [((100, 5), 'Portão da Estrada'), ((3, 90), 'Portão Oeste'), ((197, 88), 'Portão Leste')]
PALACIO = (114, 32, 142, 57)
PRACA = [(88, 58), (122, 58), (124, 67), (88, 69)]
TEMPLO = (156, 27, 6.0)
CAIS = [(82, 90.5), (150, 90.5), (150, 96.7), (82, 96.7)]
PEIXE = [(60, 88), (78, 88), (78, 97), (62, 99)]
ESCADAS = [((104, 80), (104, 66.5), 4.2, 'Escadaria do Concílio'), ((45, 79), (45, 68), 2.4, 'Escada do Oeste'), ((172, 75), (172, 62), 2.4, 'Escada do Leste')]
RAMPA = [(160, 84), (142, 75.5), (126, 66.5)]
PRINCIPAIS = [
    ([(100, -1), (100, 5), (99.5, 30), (100, 58)], 1.4),
    ([(4, 40), (40, 38), (70, 40), (99.5, 40), (113, 44)], 1.1),
    ([(142, 46), (170, 40), (197, 40)], 1.1),
    ([(-1, 90), (3, 90), (30, 90), (60, 88.5), (84, 86), (104, 82), (130, 84), (158, 84.5), (197, 88), (201, 88)], 1.3),
    ([(122, 62), (126, 66.5)], 1.0),
    ([(100, 30), (130, 26), (150, 27)], 1.0),
]

LUGARES = [
    ('Cidade Alta', 60, 28, 'A cidade no alto do penhasco: casas dos mercadores e do povo, longe do cheiro do porto.'),
    ('Cidade Baixa', 30, 96, 'A cidade de baixo, apertada entre o penhasco e o mar. Marinheiros, estivadores e tavernas.'),
    ('Palácio do Concílio', 128, 44, 'A sede do Concílio dos Mercadores. Lampía recebe aqui quem tem dinheiro ou segredo para vender.'),
    ('Praça do Concílio', 105, 63, 'A praça no alto do penhasco, com vista para o porto inteiro.'),
    ('Templo de Kalapro e Ab\'karê', 156, 27, 'O templo do comércio e do vento. Mercadores pagam promessas antes de cada viagem.'),
    ('Bairro dos Mercadores', 175, 30, 'Casarões com jardim das famílias ricas do Concílio.'),
    ('Escadaria do Concílio', 104, 73, 'A grande escada que liga a praça do Concílio ao cais.'),
    ('Rampa das Carroças', 143, 75, 'A rampa cortada no penhasco, por onde sobem as carroças de carga.'),
    ('Cais do Porto', 116, 93.5, 'O cais de pedra do porto, com os píeres e os navios de costa.'),
    ('Armazém do Concílio', 92, 88, 'O Concílio traz itens raros de fora. Preço alto, desconto para quem tem reputação.'),
    ('Loja do Cais', 86, 92, 'Para quem vai para o mar ou para a estrada.'),
    ('Alfândega', 119, 87, 'A casa da taxa: tudo o que entra e sai paga aqui (e a taxa sobre relíquias).'),
    ('Posto da Guarda do Porto', 130, 87.5, 'Guardas da Coroa nos arredores do porto. Fácil de subornar.'),
    ('Doca Sete (mercado negro)', 146, 88, 'Fechado: só com contato. Relíquias de Iroma e veneno.'),
    ('Mapa de pirata', 147, 91, 'Na Doca Sete se compra (caro) o mapa que leva ao Porto Fantasma, o esconderijo dos contrabandistas de relíquias.'),
    ('Mercado do Peixe', 69, 93, 'Peixe, sal e redes. Barulhento desde antes do sol.'),
    ('Estaleiro', 62, 104, 'Onde se fazem e consertam os barcos de costa. Só barcos de costa: nada de frota de guerra.'),
    ('Farol do Porto', 103.5, 126, 'O farol na ponta do quebra-mar oeste.'),
    ('Quebra-mar Oeste', 90, 113, 'O braço de pedra que fecha o porto pelo oeste.'),
    ('Quebra-mar Leste', 142, 115, 'O braço de pedra que fecha o porto pelo leste.'),
    ('Portão da Estrada', 100, 8, 'Saída para o norte: a estrada da Coroa (Forte da Estrada e Hemvria).'),
    ('Portão Oeste', 6, 90, 'Saída pela costa sul, para a Cidade do Eco (a Caravana da costa).'),
    ('Portão Leste', 194, 88, 'Saída para o leste, pela costa (Farol dos Recifes).'),
]
MUROS = [(MURO, False, [g for g, _ in PORTOES], 1.6)]


def pintar(S=8, out='porto_prev.png', previa=None):
    M.setup(W, H, S, seed=8111, fundo=(52, 64, 46))
    M.texturas_padrao()
    M.rocha_tex('rocha', (124, 116, 104), 31)
    M.flat('areia', (150, 138, 108), 10, 0.5, 32)
    M.log('traçado')
    terra = M.poly(M.mask(), COSTA + [(202, -2), (-2, -2)])
    m_o = M.pline(M.mask(), MOLE_O, 3.0); m_l = M.pline(M.mask(), MOLE_L, 3.0)
    moles = M.OR(m_o, m_l)
    mar = M.SUB(M.NOT(terra), moles)
    alto = M.AND(M.irregular(M.poly(M.mask(), PENHASCO + [(202, -2), (-2, -2)]), .5, 1.2), terra)
    face = M.SUB(M.dil(alto, 3.0), alto)
    dentro = M.poly(M.mask(), MURO + [(197, 160), (3, 160)])
    dentro = M.AND(dentro, terra)
    cx0, cy0, cx1, cy1 = PALACIO
    palacio = M.rect(M.mask(), cx0, cy0, cx1, cy1)
    praca = M.OR(M.poly(M.mask(), PRACA), M.poly(M.mask(), PEIXE))
    cais = M.AND(M.poly(M.mask(), CAIS), terra)
    templo_m = M.disc(M.mask(), TEMPLO[0], TEMPLO[1], TEMPLO[2] + 3.5)
    principais = M.mask()
    for pts, hw in PRINCIPAIS: M.pline(principais, pts, 2 * hw)
    principais = M.SUB(M.AND(principais, M.OR(terra, moles)), face)
    escadas = M.mask()
    for p0, p1, w, _ in ESCADAS:
        a, b = np.array(p0), np.array(p1); u = (b - a) / np.linalg.norm(b - a); n = np.array([-u[1], u[0]])
        M.poly(escadas, [a - n * w / 2, b - n * w / 2, b + n * w / 2, a + n * w / 2])
    rampa = M.pline(M.mask(), RAMPA, 2.4)
    estaleiro = M.rect(M.mask(), 54, 98, 78, 112)
    estaleiro = M.AND(estaleiro, terra)

    # os bairros
    def bairro(x, y):
        if not M.dentro(PENHASCO + [(202, -2), (-2, -2)], x, y):
            if 80 < x < 152 and y > 78: return 3
            if 54 < x < 78 and y > 97: return 4
            return 2
        if x > 146 and y < 62: return 1
        return 0
    dgrid = np.array([[bairro(i + .5, j + .5) for i in range(W)] for j in range(H)], np.uint8)
    esp = {0: 11, 1: 16, 2: 7.5, 3: 9, 4: 9}
    larg = {0: 1.3, 1: 1.4, 2: 1.0, 3: 1.2, 4: 1.2}
    reg = M.SUB(dentro, M.OR(M.dil(palacio, .8), M.dil(praca, .5), cais, face, templo_m, estaleiro))
    sec = M.mask()
    for alto_sim in (True, False):
        r = M.AND(reg, alto) if alto_sim else M.SUB(reg, alto)
        sec = M.OR(sec, M.ruas_voronoi(r, lambda x, y: esp[int(dgrid[min(H - 1, int(y)), min(W - 1, int(x))])],
                                       lambda x, y: larg[int(dgrid[min(H - 1, int(max(0, min(y, H - 1)))), min(W - 1, int(max(0, min(x, W - 1))))])]))
    # a rua de ronda por dentro do muro
    anel = M.pline(M.mask(), [(6, 104), (6.2, 72), (7, 40), (11, 13), (60, 8.8), (100, 8.3), (140, 8.8), (192, 12), (194, 40), (194, 66), (194, 104)], 1.3)
    sec = M.SUB(M.OR(sec, M.AND(anel, dentro)), face)
    sec = M.AND(sec, terra)
    pav = M.OR(principais, sec, praca, cais)

    # ---------- o chão ----------
    M.log('chão')
    fora = M.SUB(terra, dentro)
    M.paint(terra, 'grama_escura')
    quintal = M.SUB(M.AND(dentro, terra), pav)
    nz = M.noise(2.5, seed=41)
    M.paint(quintal, 'terra')
    M.paint(M.AND(quintal, ((nz > 0.55) * 255).astype(np.uint8)), 'grama', .8)
    del nz
    praia = M.SUB(M.AND(M.dil(mar, 1.2), terra), M.OR(cais, estaleiro))
    M.paint(praia, 'areia')
    jard = M.AND(quintal, ((cv2.resize(dgrid, (M.WP, M.HP), interpolation=cv2.INTER_NEAREST) == 1) * 255).astype(np.uint8))
    M.paint(jard, 'jardim')
    M.paint(M.AND(estaleiro, terra), 'terra')
    M.paint(sec, 'rua'); M.paint(M.AND(sec, M.SUB(M.NOT(alto), M.NOT(dentro))), 'rua', 1)
    M.paint(principais, 'rua_grande')
    M.paint(praca, 'praca')
    M.paint(cais, 'cais')
    M.paint(M.rect(M.mask(), cx0 + 1, cy0 + 1, cx1 - 1, cy1 - 1), 'patio')

    # ---------- o penhasco ----------
    M.log('penhasco')
    M.penhasco(alto, 3.0, 'rocha', estratos=.75)
    # ---------- o mar ----------
    M.log('mar')
    M.agua(mar, 'mar')
    M.ondas(mar, 900, .7)
    M.paint(moles, 'cais')
    M.paint(M.borda(moles, .25), 'muro')
    M.sombra(moles, .3, .4, .2, .4, onde=mar)

    # ---------- as casas ----------
    M.log('casas')
    livre = M.SUB(M.AND(dentro, terra), M.OR(pav, face, escadas, rampa, palacio, templo_m, estaleiro, praia, moles))
    livre = M.SUB(livre, M.dil(M.pline(M.mask(), MURO, 1.2), .8))
    PAR = {0: dict(depth=2.8, lot=2.4), 1: dict(depth=3.4, lot=4.4, second=False), 2: dict(depth=2.4, lot=1.9, dense=True),
           3: dict(depth=3.6, lot=3.4), 4: dict(depth=3.0, lot=3.0)}
    PAL = [(82, 86, 98), (74, 78, 92), (94, 96, 104), (66, 70, 82), (138, 84, 62), (124, 78, 58), (150, 100, 72), (112, 72, 56),
           (104, 84, 62), (92, 74, 54), (112, 98, 70), (100, 88, 64), (120, 104, 74), (70, 92, 98), (60, 80, 88), (62, 66, 74), (150, 146, 136)]
    PALW = {0: [4, 5, 6, 7, 4, 5, 2, 16], 1: [0, 1, 13, 4, 6, 16], 2: [4, 5, 7, 8, 9, 7, 10], 3: [8, 9, 2, 3, 5, 3], 4: [8, 9, 9]}
    foot, colidx = M.casario(livre, dgrid, PAR, PALW)
    especial = M.mask()
    def sp(m, c):
        nonlocal especial
        colidx[m > 127] = c; especial = M.OR(especial, m)
    # o palácio: quatro alas em volta de um pátio com jardim
    sp(M.rect(M.mask(), cx0, cy0, cx1, cy0 + 5), 13); sp(M.rect(M.mask(), cx0, cy1 - 5, cx1, cy1), 13)
    sp(M.rect(M.mask(), cx0, cy0, cx0 + 5, cy1), 13); sp(M.rect(M.mask(), cx1 - 5, cy0, cx1, cy1), 13)
    # armazéns compridos no cais, a alfândega, a doca sete
    for x0 in (84, 98.5):
        sp(M.rect(M.mask(), x0, 84.5, x0 + 13, 90), 3)
    sp(M.rect(M.mask(), 113, 83.5, 125, 90), 0)
    sp(M.rect(M.mask(), 126.5, 85, 134, 90), 1)
    sp(M.rect(M.mask(), 140, 84.5, 150, 90), 9)
    # galpões do estaleiro
    sp(M.rect(M.mask(), 55, 98.5, 64, 103), 9)
    especial = M.SUB(especial, principais)
    foot = M.OR(foot, especial)
    M.sombra(foot, .42, .55, .18, .42)
    M.telhados(foot, colidx, PAL)
    M.chamines(foot, especial, .1)
    # o pátio do palácio: jardim e fonte
    M.paint(M.rect(M.mask(), cx0 + 5.6, cy0 + 5.6, cx1 - 5.6, cy1 - 5.6), 'jardim')
    M.fonte((cx0 + cx1) / 2, (cy0 + cy1) / 2, 1.6)
    # o templo redondo, de cúpula de cobre, com colunata
    tx, ty, tr = TEMPLO
    with M.roi(tx - tr - 4, ty - tr - 4, tx + tr + 4, ty + tr + 4, 1):
        M.paint(M.disc(M.mask(), tx, ty, tr + 3), 'praca')
        col = M.mask()
        for a in np.arange(0, 2 * math.pi, 2 * math.pi / 20): M.disc(col, tx + math.cos(a) * (tr + 1.2), ty + math.sin(a) * (tr + 1.2), .35)
        M.sombra(col, .2, .3, .08, .4); M.paint(col, (170, 166, 156))
        m = M.disc(M.mask(), tx, ty, tr)
        M.sombra(m, 1.0, 1.3, .3, .45)
        M.telhado_local(m, (84, 122, 116), course=.18, contraste=.4)
        M.paint(M.disc(M.mask(), tx, ty, .9), (176, 160, 110))
    # o estaleiro: duas carreiras de madeira e um casco em obra
    for x in (66, 72.5):
        M.pier(x - 1.6, 101, x + 1.6, 114, ang_vertical=True)
    M.navio(66, 107.5, 9, 90, vela=None) if False else None
    with M.roi(64, 102, 69, 114, 1):
        casco = M.ellipse(M.mask(), 66, 108, .9, 4.2)
        M.sombra(casco, .2, .3, .1, .4); M.paint(casco, (88, 66, 44))
        cost = M.mask()
        for t in np.arange(104.5, 112, .55): M.pline(cost, [(65.1, t), (66.9, t)], .1)
        M.paint(M.AND(cost, casco), (52, 38, 26), .8)

    # ---------- o muro de terra, os portões ----------
    M.log('muro')
    gaps = M.gaps_de([g for g, _ in PORTOES], 1.6)
    M.muralha(MURO, 1.25, gaps, closed=False, lado=(100, 60))
    for p in M.torres_ao_longo(MURO, 20, [g for g, _ in PORTOES], closed=False):
        M.torre_redonda(p[0], p[1], 1.55)
    for (x, y), _ in PORTOES: M.portao(x, y, MURO, 1.45, closed=False)
    # as escadas e a rampa por cima do penhasco
    M.log('escadas')
    for p0, p1, w, _ in ESCADAS: M.escada(p0, p1, w)
    M.sombra(rampa, .2, .3, .15, .4)
    M.paint(rampa, 'rua_grande')
    M.paint(M.borda(M.dil(rampa, .15), .2), 'muro')
    # o parapeito na beira do penhasco (a praça e a rua de cima)
    M.paint(M.SUB(M.AND(M.borda(alto, .2), M.dil(praca, 1)), escadas), 'muro')

    # ---------- o porto: píeres, navios, barcos, farol ----------
    M.log('porto')
    for x in (95, 110, 125, 140):
        M.pier(x - .8, 96.6, x + .8, 107, ang_vertical=True)
    for x, y in ((88.5, 99.6), (103, 99.6), (117.5, 99.6), (132, 99.6), (102, 109.5), (117, 109.5), (132.5, 109.5)):
        M.navio(x, y, 9 + M.rng.random() * 2, 0)
    for x, y, a in ((60, 128, 20), (150, 138, 160), (100, 142, -10), (176, 126, 200)):
        M.navio(x, y, 10, a)
    for k in range(14):
        x = 84 + M.rng.random() * 64; y = 112 + M.rng.random() * 9
        M.barco(x, y, 2.2 + M.rng.random() * 1.2, .5, M.rng.random() * 180)
    for k in range(6):
        x = 20 + M.rng.random() * 30; y = 110 + M.rng.random() * 6
        M.barco(x, y, 2.4, .5, 20 + M.rng.random() * 40)
    M.torre_redonda(103.5, 126, 1.9, telhado=(70, 74, 82))
    # ---------- árvores, barracas, lampiões ----------
    M.log('árvores')
    livre_a = M.SUB(quintal, M.OR(M.dil(foot, .5), M.dil(palacio, 1), templo_m, M.dil(M.pline(M.mask(), MURO, 1.2), 1.0), praia, face))
    M.arvores_em(livre_a, dgrid, {0: .2, 1: .55, 2: .05, 3: .05, 4: .05})
    fl = M.mask(); M.paint(fl, 'grama')
    fora_a = M.SUB(fora, M.dil(dentro, 2))
    small = cv2.resize(fora_a, (W, H), interpolation=cv2.INTER_AREA)
    ys, xs = np.nonzero(small > 250)
    for j in M.rng.permutation(len(xs))[:int(len(xs) * .08)]:
        M.arvore(xs[j] + M.rng.random(), ys[j] + M.rng.random(), .8 + M.rng.random() * .6, M.GREENS[3])
    M.barracas((62.5, 89, 77, 96.5), p=.55)
    M.barracas((90, 59, 120, 67), passo=(2.4, 2.4), p=.25)
    lamps = M.lampioes_rua(PRINCIPAIS, 9, lambda q: M.em(dentro, *q))
    lamps += [(x, 96) for x in np.arange(86, 149, 6)]
    lamps += [(103.5, 126)]
    M.lampioes(lamps)
    M.acabamento()
    M.salvar(out, previa)


if __name__ == '__main__':
    pintar(float(sys.argv[1]) if len(sys.argv) > 1 else 8, sys.argv[2] if len(sys.argv) > 2 else 'porto_prev.png', sys.argv[3] if len(sys.argv) > 3 else None)
