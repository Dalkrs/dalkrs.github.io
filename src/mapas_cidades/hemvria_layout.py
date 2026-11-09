"""Hemvria — o traçado (tudo em quadrados de 5 m; a imagem tem 256 x 170 quadrados).
Proposta do Claude a partir das respostas do Dalmo (8/nov/2026): rio cortando ao meio, cidade velha murada com o
castelo (murado, no plano) e a catedral, sete bairros, só o que fica dentro dos muros."""
import math
import numpy as np

W, H = 256, 170

# muralha de fora (sentido horário na tela)
OUT = [(20, 6), (60, 4.5), (118, 4), (150, 5), (195, 4.5), (234, 7), (250, 22), (251.5, 60), (251, 110), (249, 148),
       (234, 164.5), (180, 165.5), (131, 166), (80, 165.5), (22, 164.5), (6.5, 150), (5, 100), (5.5, 55), (7, 22)]
# a cidade velha
OLD = [(70, 24), (92, 14), (122, 11), (158, 12), (188, 20), (197, 44), (191, 72), (168, 86), (132, 91), (100, 89),
       (78, 78), (67, 52)]
# o castelo (retângulo murado, no plano)
CAS = (144, 22, 182, 60)       # x0, y0, x1, y1
KEEP = (158, 30, 172, 44)
# o Rio Dourado (norte -> sul) e a meia-largura
RIV = [(116, -4), (117, 10), (121, 25), (126, 40), (124.5, 55), (119.5, 70), (118, 85), (121.5, 100), (128, 115),
       (132.5, 130), (132, 145), (130.5, 158), (131, 174)]
RHW = 4.0


def riox(y):
    for (x0, y0), (x1, y1) in zip(RIV, RIV[1:]):
        if y0 <= y <= y1:
            t = (y - y0) / (y1 - y0)
            return x0 + t * (x1 - x0)
    return RIV[-1][0]


# portões (ponto na muralha, nome)
GATES_OUT = [((60, 4.5), 'Portão Norte'), ((5.1, 100), 'Portão Oeste'), ((160, 165.7), 'Portão Sul'), ((251.2, 86), 'Portão Leste')]
GATES_OLD = [((67.6, 53.5), 'Portão da Cidade Velha (oeste)'), ((110, 89.6), 'Portão da Cidade Velha (sul)'),
             ((168.6, 85.6), 'Portão da Cidade Velha (sudeste)'), ((196.4, 47.6), 'Portão da Cidade Velha (leste)')]
GATE_CAS = [((144, 41), 'w'), ((163, 60), 's')]

# pontes: (y, meia-largura do tabuleiro, comprimento extra, nome, material)
BRIDGES = [(41.5, 1.4, 'Ponte do Castelo', 'pedra'), (100, 1.7, 'Ponte Grande', 'pedra'), (135, 1.25, 'Ponte dos Cais', 'madeira')]

# praças
PRACA_LUZ = [(80, 54), (112, 54), (113, 70), (81, 71)]
MERCADO = [(134, 92), (172, 93), (174, 112), (136, 113)]
LARGO_PONTE = [(100, 95), (113, 95), (113, 105), (100, 105)]
LARGO_SUL = [(146, 140), (160, 140), (160, 150), (146, 150)]

# a catedral (retângulos que se juntam numa cruz) e o adro
CATEDRAL = [(80, 38.5, 108, 45.5), (95, 31, 103, 53), (78, 36, 82, 40), (78, 44, 82, 48)]
APSE = (108, 42, 3.5)
TEMPLO = (104, 72, 111, 77.5)

# ruas principais (meia-largura em quadrados)
MAIN = [
    ([(60, 0), (60, 4.5), (61.5, 14), (63, 30), (66, 46), (67.6, 53.5), (74, 58), (81, 62)], 1.3),          # Norte -> cidade velha -> praça
    ([(0, 100), (5.1, 100), (30, 99), (60, 98), (90, 98.5), (113, 100)], 1.4),                               # Oeste -> Ponte Grande
    ([(131, 100), (136, 101)], 1.4),
    ([(172, 102), (200, 98), (230, 90), (251.2, 86), (256, 85.5)], 1.4),                                       # mercado -> Leste
    ([(160, 170), (160, 165.7), (156, 150), (152, 130), (151, 113)], 1.3),                                   # Sul -> mercado
    ([(110, 89.6), (111, 95)], 1.1),
    ([(168.6, 85.6), (164, 93)], 1.1),
    ([(112, 70), (115, 48), (120, 41.5)], 1.1),                                                              # praça -> Ponte do Castelo
    ([(132, 41.5), (144, 41)], 1.1),
    ([(163, 60), (165, 72), (168.6, 85.6)], 1.0),
    ([(196.4, 47.6), (222, 50), (240, 56)], 1.0),
    ([(142.5, 135), (152, 135)], 1.0),
    ([(123.5, 135), (100, 132), (75, 130), (50, 128)], 1.0),
    ([(97, 70.5), (99, 80), (110, 89.6)], 0.9),
]

# os bairros (para o tipo de casa e o telhado)
def bairro(x, y):
    if dentro(OLD, x, y):
        return 'velha'
    rx = riox(y)
    if y > 104 and abs(x - rx) < 18:
        return 'cais'
    if x < rx:
        if y > 106 and x < 98:
            return 'escoadouro'
        return 'artesaos'
    if dentro(MERCADO, x, y) or (130 < x < 180 and 86 < y < 120):
        return 'mercado'
    if x > 186 and 54 < y < 150:
        return 'nobre'
    return 'comum'


def dentro(poly, x, y):
    n, c = len(poly), False
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]; xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi:
            c = not c
        j = i
    return c


# lugares com nome (para os marcadores ocultos da cena): nome, x, y, texto
LUGARES = [
    ('Cidade Velha', 130, 18, 'O coração antigo de Hemvria, dentro do muro de dentro: o castelo, a catedral e as casas mais velhas.'),
    ('Castelo de Hemvria', 165, 37, 'A sede da Coroa: o castelo murado da família que tomou o trono depois do reset.'),
    ('Quartel da Guarda de Juramento', 154, 51.5, 'O quartel da Guarda de Juramento, com o pátio de treino, dentro do castelo.'),
    ('Ferraria Real', 153, 65.5, 'O ferreiro da Guarda de Juramento. Armas e armaduras finas.'),
    ('Catedral de Luz', 92, 42, 'A catedral da Igreja da Luz. Destino dos peregrinos de Ano-Novo e da Queda do Dragão Roxo.'),
    ('Praça da Luz', 96, 62, 'A praça da catedral, com a estátua do fundador. Aqui se juntam os peregrinos.'),
    ('Templo da Luz', 107.5, 74.7, 'A Igreja da Luz cura por uma doação "opcional". Vende o que protege do mal.'),
    ('Mercado da Coroa', 154, 102, 'O mercado grande da capital: tudo o que é comum.'),
    ('Ponte Grande', 122, 100, 'A ponte principal sobre o Rio Dourado.'),
    ('Ponte do Castelo', 126, 41.5, 'A ponte da cidade velha, entre a catedral e o castelo.'),
    ('Ponte dos Cais', 133, 135, 'A ponte de madeira dos cais.'),
    ('Cais do Oeste', 120, 125, 'Cais e armazéns na margem oeste.'),
    ('Cais do Leste', 140, 150, 'Cais e armazéns na margem leste. Barcos que sobem e descem o rio.'),
    ('Escoadouro', 62, 138, 'O bairro pobre, rio abaixo, onde o esgoto da cidade sai.'),
    ('Porão do Corvo', 55, 146, 'O mercado negro. Fechado: só abre para quem tem contato.'),
    ('Boca das Catacumbas', 70, 119, 'Uma boca de esgoto que desce para as Catacumbas de Hemvria (o Carniceiro do Esgoto).'),
    ('Saída do esgoto', 124.5, 158, 'Onde o esgoto da cidade cai no rio. Por dentro, liga às Catacumbas.'),
    ('Bairro dos Artesãos', 38, 60, 'Oficinas, tinturarias e casas de artesãos.'),
    ('Bairro Nobre', 218, 112, 'Casarões com jardim das famílias ricas.'),
    ('Portão Norte', 60, 7, 'Saída para os Pastos Altos.'),
    ('Portão Oeste', 8, 100, 'Saída para o Forte do Rio.'),
    ('Portão Sul', 160, 162, 'Saída para a estrada do porto (Forte da Estrada, com pedágio).'),
    ('Portão Leste', 248, 86, 'Saída para o leste.'),
]
