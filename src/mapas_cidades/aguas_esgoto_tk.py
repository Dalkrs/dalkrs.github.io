"""Águas Cinzas — o esgoto e o covil dos bandidos (inspiração: o Ratway de Riften). 1,5 m por quadrado, 64 x 48.
Entra-se pela grade no paredão do canal (oeste). Túnel principal com a vala de esgoto no meio; ao norte, o ninho dos
mendigos; a leste, a cisterna velha; ao sul, a taverna escondida dos bandidos ("A Caneca Afogada", nome proposto),
a sala do chefe e o depósito atrás de uma porta secreta. Da cisterna, um túnel sai para o lago."""
import math, numpy as np, cv2
from tk import *
M = Mapa(64, 48, seed=2111, cell_m=1.5)
M.rocha_fundo((34, 34, 32), 2111)
T = (0, 21, 44, 28)                  # túnel principal
NT = (17, 9, 21, 21)                 # túnel norte
WN = (5, 1, 33, 9)                   # ninho dos mendigos
CI = (44, 10, 62, 38)                # cisterna
S1 = (25, 28, 27, 32)                # passagem para a taverna
TV = (10, 32, 34, 46)                # A Caneca Afogada
S2 = (34, 38, 36, 40)                # porta para a sala do chefe
CH = (36, 35, 45, 46)                # sala do chefe
S3 = (45, 41, 46, 43)                # porta secreta
DP = (46, 39, 52, 46)                # depósito
LG = (54, 38, 58, 48)                # saída para o lago
salas = [T, NT, WN, CI, S1, TV, S2, CH, S3, DP, LG]
G = grade_salas(M, salas)
fl = mascara_grade(M, G)
# chão: tijolo velho e úmido nos túneis; tábua na taverna e no chefe
tij = M.stone(.42, (78, 74, 66), 12, (36, 34, 30), 2112, 1.0, .2)
M.salas(fl, tij, parede=(64, 62, 58))
lodo = (np.clip((M.noise(1.2, 2113, fl.shape) - .5) * 3, 0, 1) * 255).astype(np.uint8)
M.paint(cv2.bitwise_and(lodo, fl), (58, 66, 42), .45)
tab = M.rect(M.mask(), *TV); tab = cv2.bitwise_or(tab, M.rect(M.mask(), *CH))
M.paint(tab, M.planks((92, 70, 48), .5, 2114)); M.ao(tab, .8, .45)
# ---- a água: a vala do túnel, o fio d'água do norte, o poço da cisterna e o túnel do lago ----
vala = M.rect(M.mask(), 0, 23.4, 44.5, 25.6)
fio = M.rect(M.mask(), 18.4, 9, 19.6, 21.5)
poco = M.rect(M.mask(), 48, 16, 58, 32)
lago = M.rect(M.mask(), 55, 38, 57, 48)
esg = cv2.bitwise_or(cv2.bitwise_or(vala, fio), lago)
M.agua(m=esg, cor=(70, 76, 48), fundo=(42, 48, 30), margem=(60, 56, 44))
M.agua(m=poco, cor=(46, 60, 62), fundo=(18, 26, 30), margem=(70, 68, 62))
# a borda de pedra do poço e da vala
M.paint(M.edge(M.grow(poco, .35), .35), M.stone(.3, (92, 90, 86), 8, (40, 40, 40), 2115))
for y in (23.4, 25.6):
    with M.roi(0, y - .3, 45, y + .3):
        M.paint(M.rect(M.mask(), 0, y - .12, 44, y + .12), (96, 92, 84), .9)
# pinguelas de tábua por cima da vala
for x in (8, 26, 38):
    with M.roi(x - 1, 22.5, x + 1, 26.5):
        p = M.rect(M.mask(), x - .7, 22.8, x + .7, 26.2); M.sombra(p, .1, .15, .05, .5)
        M.paint(p, M.planks((104, 80, 54), .3, 2116, 90)); M.paint(M.edge(p, .04), (36, 26, 16), .9)
# as grades: a da entrada (canal) e a da saída (lago)
for (x0, y0, x1, y1, vert) in [(0, 21.2, .5, 27.8, True), (54.2, 47.4, 57.8, 48, False)]:
    with M.roi(x0, y0, x1, y1):
        g = M.mask()
        if vert:
            for y in np.arange(y0, y1, .45): M.line(g, [(x0, y), (x1, y)], .12)
        else:
            for x in np.arange(x0, x1, .45): M.line(g, [(x, y0), (x, y1)], .12)
        M.paint(g, (96, 70, 52))
# os pilares da cisterna e a passarela de tábuas por cima do poço
for x in (46, 60):
    for y in (13, 19, 25, 31, 36):
        pilar(M, x, y, .55, quadrado=True)
with M.roi(52, 16, 54, 32):
    p = M.rect(M.mask(), 52.3, 15.5, 53.7, 32.5); M.sombra(p, .2, .3, .1, .55)
    M.paint(p, M.planks((96, 74, 50), .3, 2117, 90)); M.paint(M.edge(p, .04), (32, 24, 16), .9)
M.escombros(57.5, 13, 1.2, 10, (100, 96, 88)); M.escombros(47.5, 35, 1.0, 8, (100, 96, 88))
for k in range(5): M.ossos(49 + M.rng.random() * 9, 33 + M.rng.random() * 3, 5, .45)
# o túnel principal: lixo, ossos, tochas, teias
for (x, y) in [(5, 22), (14, 27), (22, 22), (33, 27), (41, 22)]: lixo(M, x, y, .9)
for (x, y) in [(10, 21.3), (30, 21.3), (20, 27.7), (40, 27.7)]: M.tocha(x, y)
for (x, y, a) in [(.3, 21.3, 0), (43.7, 27.7, 180), (5.2, 1.2, 0), (32.8, 1.2, 90), (61.8, 10.2, 90), (44.2, 37.8, 270)]: M.teia(x, y, 1.2, a)
# o ninho dos mendigos: esteiras, trapos, fogueirinha
for k, x in enumerate(range(6, 33, 3)):
    if 16 <= x <= 21: continue
    M.esteira(x + .5, 3.0 if k % 2 else 7.0, 0 if k % 2 else 180, [(110, 90, 70), (90, 80, 70), (120, 70, 56)][k % 3])
M.fogueira(19, 5, .5)
for (x, y) in [(8, 5), (30, 5), (24, 5.5)]: lixo(M, x, y, .7)
for (x, y) in [(13, 4.5), (27, 4.5)]: M.barril(x, y)
# a passagem da taverna (com a porta)
porta_desenho(M, 25, 32, 27, 32)
# A Caneca Afogada: o balcão, as mesas, os barris, a lareira, os catres
with M.roi(11, 33, 22, 35):
    b = M.rect(M.mask(), 11, 33.6, 21, 34.6); M.sombra(b, .12, .18, .06, .5)
    M.paint(b, M.planks((110, 82, 52), .3, 2118)); M.paint(M.edge(b, .04), (40, 28, 18), .9)
for x in range(11, 21, 1): M.barril(x + .5, 32.6, .3)
for (x, y, a) in [(15, 38.5, 0), (21, 37.5, 0), (27, 39, 90), (17, 43.5, 0), (29.5, 43, 0), (23, 43, 0), (30.5, 37, 0), (15, 41, 0)]: M.mesa(x, y, 2.2, 1.0, a)
suporte_armas(M, 33.6, 40, 90); suporte_armas(M, 10.4, 36.5, 270)
for (x, y) in [(33.2, 38), (33.2, 42), (24, 33), (28, 33)]: M.barril(x, y, .34)
lixo(M, 20, 45, .6)
M.fogueira(32, 34, .7)
for (x, y) in [(11.2, 40), (11.2, 43.5)]: M.esteira(x + .5, y, 90, (100, 70, 60))
for (x, y) in [(23, 35), (13, 41), (31, 40), (25, 45)]: M.vela(x, y)
M.caixa(33, 45, .8, 10); M.caixa(32, 45.3, .7, 30); M.saco(33.3, 43.8)
# a sala do chefe: catre, mesa com o mapa, baú, armas
porta_desenho(M, 36, 38, 36, 40)
M.esteira(43.5, 37.5, 0, (140, 50, 46))
M.mesa(40, 41, 2.2, 1.2, 0, bancos=False)
with M.roi(39, 40, 41, 42):
    mp = M.rrect(M.mask(), 40, 41, 1.2, .8, 8); M.paint(mp, (200, 186, 150)); M.paint(M.edge(mp, .03), (90, 70, 40), .8)
M.vela(41.2, 40.6); M.caixa(37, 45, .9, 0, (96, 70, 44)); suporte_armas(M, 44.3, 43, 90)
# o depósito (o roubo da semana)
for k in range(5): M.caixa(47 + (k % 3) * 1.6, 40 + (k // 3) * 1.7, .9, k * 12)
for (x, y) in [(50.5, 44.5), (47, 45), (51, 41.5)]: M.barril(x, y)
for k in range(4): M.saco(48 + k * .7, 44.3)
M.tocha(52, 42)
# o túnel do lago: lodo e entulho
M.escombros(54.6, 41, .8, 6, (96, 92, 84)); lixo(M, 57.3, 44, .6)
# ---- as paredes (visão) ----
M.paredes_da_grade(G)
M.walls += [('door', 25, 32, 27, 32), ('door', 36, 38, 36, 40), ('secret', 46, 41, 46, 43)]
# (a parede reta entre a passagem e a taverna, entre a taverna e a sala do chefe e entre o chefe e o depósito já existe
#  nas bordas da grade; a porta é o vão que a grade deixa aberto)
M.walls = [w for w in M.walls if not (w[0] == 'wall' and ((w[2] == 32 and w[4] == 32 and w[1] >= 25 and w[3] <= 27)))]
# ---- os marcadores (escondidos) ----
M.tok(1.5, 24.5, 'Grade do canal', 'A entrada: a grade enferrujada no paredão do canal, na altura da passarela. Está solta de um lado.', interesse=True)
M.tok(19, 5, 'Ninho dos mendigos', 'Gente sem casa dorme aqui. Vendem informação por um pão. Alguns são olheiros dos bandidos.', interesse=True)
M.tok(53, 24, 'A Cisterna velha', 'Água parada e funda no meio. A passarela de tábuas range. Dizem que algo grande mora no fundo.', interesse=True)
M.tok(22, 40, 'A Caneca Afogada', 'A taverna escondida dos bandidos (nome proposto). Quem não é conhecido precisa de alguém que fale por ele.', interesse=True)
M.tok(40, 37, 'Sala do chefe', 'O mapa na mesa mostra as rotas das carroças que passam por Águas Cinzas.', interesse=True)
M.tok(45.5, 42, 'Porta secreta', 'Uma estante que gira. Teste de PER para achar.', interesse=True)
M.tok(49, 42.5, 'O depósito', 'O que foi roubado na semana: tecidos, vinho, ferramentas e uma caixa trancada.', interesse=True)
M.tok(56, 46.5, 'Saída para o lago', 'Uma grade que dá no lago, embaixo do cais. A rota de fuga dos bandidos.', interesse=True)
M.tok(26, 30, 'Mercenário (porteiro)', 'Guarda a porta da taverna. Pede a senha.', 'b_mercenario')
M.tok(16, 36, 'Bandido 1', '', 'b_bandido')
M.tok(22, 38.5, 'Bandido 2', '', 'b_bandido')
M.tok(28, 41, 'Bandido 3', '', 'b_bandido')
M.tok(14, 34.5, 'Bandido arqueiro', 'Atrás do balcão.', 'b_bandido_arqueiro')
M.tok(10, 7, 'Ladrão de cidade 1', 'Disfarçado de mendigo.', 'b_ladrao_de_cidade')
M.tok(28, 3, 'Ladrão de cidade 2', 'Disfarçado de mendigo.', 'b_ladrao_de_cidade')
M.tok(41, 43, 'Chefe do covil', 'O chefe dos bandidos de Águas Cinzas. O nome fica para o Bruno.', 'b_chefe_de_bandidos')
M.meta = dict(tone='breu', light='escuro')
M.acabar('out/ac_esgoto.webp', sat=.85, quente=(1.0, 1.0, .98))
