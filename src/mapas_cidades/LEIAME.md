# Mapas das cidades (cenas)

Scripts que pintam os mapas de fundo das cidades grandes, no estilo da Fortaleza Cinzenta.
Escala: 1 quadrado = 5 m, 32 px por quadrado. As imagens prontas ficam em `cenas/mapas/`.

- `motor.py`: as peças comuns (texturas, telhados, muralhas, penhascos, água, lava, árvores, lampiões).
- `porto.py`, `fornalha.py`, `eco.py`, `kitsune.py`: uma cidade cada. Cada uma também tem `LUGARES` (os marcadores ocultos) e `MUROS` (as paredes da cena).
- `hemvria_layout.py` e `hemvria_render.py`: Hemvria (o primeiro, feito antes do motor).
- `cenas.py`: monta as paredes, as portas e os marcadores de cada cena.

Uso: `python3 porto.py 32 porto.webp porto_previa.jpg` (com 8 no lugar de 32 sai uma prévia rápida).
