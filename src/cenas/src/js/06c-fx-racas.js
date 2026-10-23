/* ---------------------------------------------------------------
   6c. AS ZONAS DAS RAÇAS (lote 19)
   O chão e as áreas que as árvores de raça criam (o Chão Rachado do Orc Natuphas, a Terra Morta do Magi'atach, o Enxame
   de Varejeiras do Necrosado…), os objetos com pontos de vida (o Totem do Magi'Ritu, a Parte Solta da Mãzier'na) e a
   Cerca de Espíritos entre dois totens. Ficam na aba Efeitos, no grupo Raças, como as outras zonas: o desenho próprio, a
   regra escrita (o painel), a condição sugerida (sug) e o aviso do começo da vez (lembra) — quem aplica é o mestre. A
   Arapuca e a Grande Arapuca nascem escondidas dos jogadores (oculta), como as runas-armadilha. dur, k, r e w: a duração,
   a forma e o tamanho de começo (a ferramenta Efeitos já vem com eles; o mestre muda antes de soltar).
   --------------------------------------------------------------- */
(() => {
  const { hsh, blob } = FX;
  const cnt = (g, per, min, max, pow) => clamp(Math.round(g.area * per * pow), min, max);
  // uma linha quebrada de (x, y) com n pedaços, para as rachaduras
  function racha(c, x, y, a, L, n, seed, i) {
    c.beginPath(); c.moveTo(x, y);
    let px = x, py = y, ang = a;
    for (let k = 0; k < n; k++) { ang += (hsh(i * 7 + k, 31, seed) - 0.5) * 1.2; px += Math.cos(ang) * L / n; py += Math.sin(ang) * L / n; c.lineTo(px, py); }
    c.stroke();
  }
  // moscas: pontinhos que rodam em volta de um ponto
  function moscas(c, g, t, pow, n, cor, raio) {
    c.fillStyle = cor;
    for (let i = 0; i < n; i++) {
      const [x, y] = g.sample(hsh(i, 41, g.seed), hsh(i, 42, g.seed)), v = 2 + hsh(i, 43, g.seed) * 3, r = g.cell * raio * (0.4 + hsh(i, 44, g.seed));
      const a = t * v + i, bx = x + Math.cos(a) * r, by = y + Math.sin(a * 1.3) * r * 0.7;
      c.globalAlpha = 0.85 * pow; c.beginPath(); c.arc(bx, by, Math.max(0.7, g.cell * 0.035), 0, TAU); c.fill();
      c.globalAlpha = 0.35 * pow; c.beginPath(); c.ellipse(bx, by - g.cell * 0.03, g.cell * 0.05, g.cell * 0.025, Math.sin(t * 30 + i), 0, TAU); c.fill();
    }
  }
  // traços ao longo da direção da área (o vento, os espíritos da cerca)
  function aoLongo(c, g, t, pow, n, cor, vel, larg) {
    c.strokeStyle = cor; c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const u = (hsh(i, 51, g.seed) + t * vel * (0.6 + hsh(i, 52, g.seed) * 0.8)) % 1, v = hsh(i, 53, g.seed);
      const [x, y] = g.sample(u, v), L = g.cell * (0.4 + hsh(i, 54, g.seed) * 0.6);
      c.globalAlpha = Math.sin(u * Math.PI) * 0.7 * pow; c.lineWidth = Math.max(0.8, g.cell * larg);
      c.beginPath(); c.moveTo(x - g.cs * L, y - g.sn * L); c.lineTo(x, y); c.stroke();
    }
  }
  // o chão seco, cinzento e rachado (a Terra Morta e os campos do Magi'atach por baixo)
  function chaoMorto(c, g, t, pow) {
    const m = cnt(g, 1.4, 3, 20, pow);
    for (let i = 0; i < m; i++) { const [x, y] = g.sample(hsh(i, 61, g.seed), hsh(i, 62, g.seed)); blob(c, x, y, g.cell * (0.6 + hsh(i, 63, g.seed) * 0.5), i % 2 ? '#8a8378' : '#5e584f', 0.28 * pow); }
    c.strokeStyle = '#2b2722'; c.lineWidth = Math.max(0.7, g.cell * 0.03); c.lineJoin = 'round';
    const n = cnt(g, 1.3, 3, 24, pow);
    for (let i = 0; i < n; i++) { const [x, y] = g.sample(hsh(i, 64, g.seed), hsh(i, 65, g.seed)); c.globalAlpha = 0.55 * pow; racha(c, x, y, hsh(i, 66, g.seed) * TAU, g.cell * 0.7, 4, g.seed, i); }
  }
  const novas = {
    chaoRachado: {
      n: 'Chão Rachado', r: 'Orc Natuphas', tint: '#3a2a1a', base: 0.3, edge: '#b08a5a', g: 'racas', dur: 2,
      regra: 'terreno difícil para os inimigos do orc (cada cédula custa 2 de movimento); o orc e os aliados andam normal, e várias habilidades dele ficam mais fortes contra quem está aqui (Caído, Lento, mais dano); dura 2 rodadas (3 com Fendas Fundas)',
      draw(c, g, t, pow) {
        c.lineCap = 'round'; c.lineJoin = 'round';
        const n = cnt(g, 1.6, 4, 28, pow);
        for (let i = 0; i < n; i++) {
          const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed)), a = hsh(i, 3, g.seed) * TAU, L = g.cell * (0.8 + hsh(i, 4, g.seed) * 0.9);
          c.globalAlpha = 0.85 * pow; c.strokeStyle = '#140c05'; c.lineWidth = Math.max(1.2, g.cell * 0.07); racha(c, x, y, a, L, 5, g.seed, i);
          c.globalAlpha = 0.35 * pow; c.strokeStyle = '#c9a272'; c.lineWidth = Math.max(0.6, g.cell * 0.02); racha(c, x + g.cell * 0.04, y + g.cell * 0.04, a, L, 5, g.seed, i);
        }
        // a poeira que ainda sobe das fendas
        const p = cnt(g, 0.8, 2, 10, pow);
        for (let i = 0; i < p; i++) { const ph = (t * 0.25 + hsh(i, 5, g.seed)) % 1, [x, y] = g.sample(hsh(i, 6, g.seed), hsh(i, 7, g.seed)); blob(c, x, y - ph * g.cell * 0.6, g.cell * (0.3 + ph * 0.4), '#b89a72', Math.sin(ph * Math.PI) * 0.18 * pow); }
      },
    },
    chaoRevirado: {
      n: 'Chão Revirado', r: 'Antro Equino', tint: '#4a3420', base: 0.32, edge: '#a8865a', g: 'racas', dur: 1, k: 'line', w: 1, rr: 6,
      regra: 'as cédulas por onde o Equino passou (andou 6 ou mais): terreno difícil só para os inimigos; some no começo do próximo turno dele',
      draw(c, g, t, pow) {
        // os torrões jogados e as marcas dos cascos
        const n = cnt(g, 2.2, 4, 40, pow);
        for (let i = 0; i < n; i++) {
          const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed)), r = g.cell * (0.06 + hsh(i, 3, g.seed) * 0.1);
          c.globalAlpha = 0.8 * pow; c.fillStyle = i % 3 ? '#3a2612' : '#6e4e2c';
          c.beginPath(); c.ellipse(x, y, r * 1.3, r, hsh(i, 4, g.seed) * TAU, 0, TAU); c.fill();
        }
        c.strokeStyle = '#1e140a'; c.lineWidth = Math.max(1, g.cell * 0.045); c.lineCap = 'round';
        const m = cnt(g, 0.9, 2, 16, pow);
        for (let i = 0; i < m; i++) { const [x, y] = g.sample((i + 0.5) / m, 0.5 + (i % 2 ? 0.18 : -0.18)), a = Math.atan2(g.sn, g.cs); c.globalAlpha = 0.6 * pow; c.beginPath(); c.arc(x, y, g.cell * 0.14, a + 0.6, a + TAU - 0.6); c.stroke(); }
      },
    },
    corredorVento: {
      n: 'Corredor de Vento', r: 'Antro Aviário', tint: '#9fd0e6', base: 0.12, edge: '#e2f4ff', g: 'racas', dur: 2, k: 'line', w: 1, rr: 6, lembra: true,
      regra: 'os aliados que andam nele andam 2 cédulas a mais (3 no grau 2); o inimigo que entra ou começa o turno aqui testa Vigor (FOR ou VIT, o maior) e, se falhar, é jogado 2 cédulas para fora; fumaça, névoa e gás não ficam nele; dura 2 rodadas',
      draw(c, g, t, pow) {
        aoLongo(c, g, t, pow, cnt(g, 3, 6, 40, pow), '#f2fbff', 0.9, 0.025);
        // as folhas levadas
        c.fillStyle = '#9ab86a';
        const n = cnt(g, 0.6, 1, 8, pow);
        for (let i = 0; i < n; i++) { const u = (hsh(i, 9, g.seed) + t * 0.6) % 1, [x, y] = g.sample(u, hsh(i, 10, g.seed)); c.globalAlpha = Math.sin(u * Math.PI) * 0.8 * pow; c.beginPath(); c.ellipse(x, y, g.cell * 0.08, g.cell * 0.04, t * 4 + i, 0, TAU); c.fill(); }
      },
    },
    enxameVarejeiras: {
      n: 'Enxame de Varejeiras', r: 'Ghoul Necrosado', tint: '#3a4220', base: 0.2, edge: '#9ab05a', g: 'racas', sug: 'doente', lembra: true, dur: 2, rr: 2,
      regra: 'só pega inimigos: quem começa o turno dentro ou entra testa VIT (uma vez por turno) e, se falhar, fica Doente por 2 rodadas (com as Moscas nos Olhos, também Ofuscado enquanto estiver dentro); dura 2 rodadas',
      draw(c, g, t, pow) {
        const m = cnt(g, 0.8, 2, 10, pow);
        for (let i = 0; i < m; i++) { const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed)); blob(c, x, y, g.cell * 0.9, '#4a5228', 0.25 * pow); }
        moscas(c, g, t, pow, cnt(g, 6, 10, 90, pow), '#14160c', 0.35);
      },
    },
    focoDoenca: {
      n: 'Foco de Doença', r: 'Ghoul Necrosado', tint: '#4a5a1a', base: 0.24, edge: '#b8d06a', g: 'racas', sug: 'doente', lembra: true, dur: 2, rr: 1.5,
      regra: 'o corpo de quem caiu com uma praga do Necrosado: o inimigo que termina o turno adjacente a ele testa VIT e, se falhar, fica Doente por 2 rodadas; não pega aliados; dura 2 rodadas (antes, se o corpo for queimado, devorado ou levado)',
      draw(c, g, t, pow) {
        c.globalCompositeOperation = 'lighter';
        const n = cnt(g, 2, 4, 20, pow);
        for (let i = 0; i < n; i++) { const ph = (t * 0.2 + hsh(i, 1, g.seed)) % 1, [x, y] = g.sample(hsh(i, 2, g.seed) * 0.7, hsh(i, 3, g.seed)); blob(c, x, y - ph * g.cell * 0.5, g.cell * (0.4 + ph * 0.5), '#9cc23a', Math.sin(ph * Math.PI) * 0.22 * pow); }
        c.globalCompositeOperation = 'source-over';
        moscas(c, g, t, pow, cnt(g, 2, 3, 20, pow), '#10120a', 0.25);
      },
    },
    arapuca: {
      n: 'Arapuca', r: "Taekeir Nistus'atach", tint: '#2a1e12', base: 0.18, edge: '#c9a46a', g: 'racas', oculta: true, k: 'quad', rr: 0.5, sug: 'enraizado',
      regra: 'escondida dos jogadores até você revelar; o primeiro inimigo que entra na cédula a dispara e testa o que o tipo pede (laço: AGI ou Enraizado; Fosso de Estacas: VIT ou dano e Sangrando; Laço de Tendão: AGI ou Caído; Mandíbula de Fera: AGI ou dano e Agarrado); dura até disparar ou até o fim do combate',
      draw(c, g, t, pow) {
        // a mandíbula de ferro aberta, com os dentes
        const r = Math.max(g.cell * 0.2, g.inR * 0.75), x = g.cx, y = g.cy;
        c.globalAlpha = 0.9 * pow; c.strokeStyle = '#3a3026'; c.lineWidth = Math.max(1.2, g.cell * 0.06);
        c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
        c.strokeStyle = '#b8a888'; c.lineWidth = Math.max(0.8, g.cell * 0.025);
        c.beginPath();
        for (let k = 0; k < 14; k++) { const a = k / 14 * TAU, b = (k + 0.5) / 14 * TAU; c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.lineTo(x + Math.cos(b) * r * 0.68, y + Math.sin(b) * r * 0.68); c.lineTo(x + Math.cos(a + TAU / 14) * r, y + Math.sin(a + TAU / 14) * r); }
        c.stroke();
        c.fillStyle = '#6a5a44'; c.beginPath(); c.arc(x, y, r * 0.18, 0, TAU); c.fill();
      },
    },
    grandeArapuca: {
      n: 'Grande Arapuca', r: "Taekeir Nistus'atach", tint: '#2a1e12', base: 0.2, edge: '#c9a46a', g: 'racas', oculta: true, rr: 2, sug: 'enraizado',
      regra: 'escondida dos jogadores até você revelar; no começo do próximo turno do Taekeir, cada inimigo dentro testa AGI ou sofre dano de perfuração, fica Sangrando por 2 rodadas e Enraizado (testa FOR ou AGI no fim de cada turno dele); uma por vez',
      draw(c, g, t, pow) {
        // a rede de laços e as estacas
        c.strokeStyle = '#a8875a'; c.lineWidth = Math.max(0.7, g.cell * 0.025); c.globalAlpha = 0.65 * pow;
        const passo = g.cell * 0.55;
        c.beginPath();
        for (let d = -g.R * 2; d <= g.R * 2; d += passo) { c.moveTo(g.cx + d - g.R, g.cy - g.R); c.lineTo(g.cx + d + g.R, g.cy + g.R); c.moveTo(g.cx + d + g.R, g.cy - g.R); c.lineTo(g.cx + d - g.R, g.cy + g.R); }
        c.stroke();
        const n = cnt(g, 1.2, 3, 20, pow);
        c.fillStyle = '#d8c8a0';
        for (let i = 0; i < n; i++) { const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed)), s = g.cell * 0.12; c.globalAlpha = 0.85 * pow; c.beginPath(); c.moveTo(x, y - s * 1.6); c.lineTo(x + s * 0.5, y + s * 0.5); c.lineTo(x - s * 0.5, y + s * 0.5); c.closePath(); c.fill(); }
      },
    },
    fumacaNistus: {
      n: "Fumaça do Nistus'atach", r: "Taekeir Nistus'atach", tint: '#3e4248', base: 0.45, edge: '#a3aab3', g: 'racas', sug: 'ofuscado', lembra: true, dur: 2, rr: 2,
      regra: 'o inimigo que está dentro ou entra testa VIT ou fica Ofuscado enquanto estiver nela (Cego até o fim do próximo turno dele, se falhar por 5 ou mais, no 2º grau); com a Fumaça Espessa, o Nistus\'atach e os aliados dentro ficam Ocultos; dura 2 rodadas',
      draw(c, g, t, pow) {
        const n = cnt(g, 2.4, 5, 30, pow);
        for (let i = 0; i < n; i++) { const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed)); blob(c, x + Math.sin(t * 0.3 + i) * g.cell * 0.4, y + Math.cos(t * 0.25 + i * 2) * g.cell * 0.3, g.cell * (0.9 + hsh(i, 3, g.seed) * 0.6), i % 2 ? '#8a9098' : '#5a5f66', 0.32 * pow); }
      },
    },
    terraMorta: {
      n: 'Terra Morta', r: "Taekeir Magi'atach", tint: '#5a554c', base: 0.34, edge: '#b0a898', g: 'racas',
      regra: 'nela, os inimigos de quem a fez fixam −2 em tudo (−4 com a Terra Arrasada, e aí os aliados dele também fixam −2, menos ele); as curas de qualquer um curam 20% menos; dura até o fim do combate (depois, o lugar fica seco por dias)',
      draw(c, g, t, pow) { chaoMorto(c, g, t, pow); },
    },
    chaoQuebradico: {
      n: 'Chão Quebradiço', r: "Taekeir Magi'atach", tint: '#5a554c', base: 0.36, edge: '#c9b89a', g: 'racas', sug: 'lento', lembra: true, dur: 2, rr: 2,
      regra: 'crosta seca que afunda: terreno difícil para os inimigos, e quem termina o movimento aqui testa AGI ou fica Lento até o fim do próximo turno dele (Caído também, se perder por 5 ou mais, no 2º grau); a área também é Terra Morta; dura 2 rodadas (3 com a Seca Longa)',
      draw(c, g, t, pow) {
        chaoMorto(c, g, t, pow);
        // os buracos onde a crosta já cedeu
        c.fillStyle = '#1a1714';
        const n = cnt(g, 0.7, 2, 12, pow);
        for (let i = 0; i < n; i++) { const [x, y] = g.sample(hsh(i, 71, g.seed), hsh(i, 72, g.seed)), r = g.cell * (0.12 + hsh(i, 73, g.seed) * 0.15); c.globalAlpha = 0.7 * pow; c.beginPath(); c.ellipse(x, y, r * 1.3, r, hsh(i, 74, g.seed) * 3, 0, TAU); c.fill(); }
      },
    },
    nuvemCinza: {
      n: 'Nuvem de Cinza', r: "Taekeir Magi'atach", tint: '#4a4640', base: 0.4, edge: '#b8b0a2', g: 'racas', sug: 'ofuscado', lembra: true, dur: 2, rr: 2,
      regra: 'o pó da terra morta no ar: o inimigo que entra ou começa o turno aqui testa VIT ou fica Ofuscado até o fim do próximo turno dele (Cego, se já estava Ofuscado, com o Pó nos Olhos); ataques à distância de inimigos que atravessam fixam −2; a área também é Terra Morta; dura 2 rodadas',
      draw(c, g, t, pow) {
        chaoMorto(c, g, t, pow * 0.6);
        const n = cnt(g, 2, 4, 26, pow);
        for (let i = 0; i < n; i++) { const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed)); blob(c, x + Math.sin(t * 0.4 + i) * g.cell * 0.5, y + Math.cos(t * 0.3 + i) * g.cell * 0.3, g.cell * (0.8 + hsh(i, 3, g.seed) * 0.5), '#a49a8a', 0.26 * pow); }
        c.fillStyle = '#d8d0c0';
        const p = cnt(g, 3, 6, 50, pow);
        for (let i = 0; i < p; i++) { const u = (hsh(i, 4, g.seed) + t * 0.05) % 1, [x, y] = g.sample(u, (hsh(i, 5, g.seed) + t * 0.03) % 1); c.globalAlpha = 0.5 * pow; c.fillRect(x, y, Math.max(0.7, g.cell * 0.03), Math.max(0.7, g.cell * 0.03)); }
      },
    },
    chaoPodre: {
      n: 'Chão Podre', r: "Taekeir Magi'atach", tint: '#3a3a1a', base: 0.4, edge: '#9aa04a', g: 'racas', sug: 'doente', lembra: true, dur: 2, rr: 2,
      regra: 'terra apodrecida: o inimigo que começa o turno aqui testa VIT ou fica Doente por 2 rodadas (e Envenenado por 2 rodadas, no 2º grau); a área também é Terra Morta; dura 2 rodadas (3 com a Seca Longa)',
      draw(c, g, t, pow) {
        chaoMorto(c, g, t, pow * 0.7);
        const n = cnt(g, 1.2, 3, 18, pow);
        for (let i = 0; i < n; i++) { const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed)); blob(c, x, y, g.cell * (0.5 + hsh(i, 3, g.seed) * 0.4), '#4a5a14', 0.4 * pow); }
        // as bolhas de podre
        c.strokeStyle = '#b8c05a';
        const b = cnt(g, 1, 2, 14, pow);
        for (let i = 0; i < b; i++) { const ph = t * (0.25 + hsh(i, 4, g.seed) * 0.2) + hsh(i, 5, g.seed), life = ph % 1, cyc = Math.floor(ph), [x, y] = g.sample(hsh(i + cyc * 7, 6, g.seed), hsh(i + cyc * 7, 7, g.seed)); c.globalAlpha = (1 - life) * 0.7 * pow; c.lineWidth = Math.max(0.6, g.cell * 0.025); c.beginPath(); c.arc(x, y, g.cell * 0.09 * (0.3 + life), 0, TAU); c.stroke(); }
      },
    },
    circuloSangue: {
      n: 'Círculo de Sangue', r: "Taekeir Zier'Asurper", tint: '#3a060c', base: 0.2, edge: '#e0404e', g: 'racas', dur: 1, rr: 2,
      regra: 'de dentro, as habilidades da árvore fixam +2 e saem os Ritos; com os nós do ramo Ritual, os aliados dentro ficam Protegidos (+2 de DEF F/M) e os inimigos que entram testam VIT ou ficam Sangrando; um círculo por vez; dura até o fim do próximo turno do Taekeir',
      draw(c, g, t, pow) {
        const r = g.inR * 0.88;
        c.save(); c.translate(g.cx, g.cy); c.rotate(t * 0.05);
        c.strokeStyle = '#a8121e'; c.lineCap = 'round';
        c.globalAlpha = 0.85 * pow; c.lineWidth = Math.max(1.4, g.cell * 0.08);
        c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
        c.lineWidth = Math.max(0.8, g.cell * 0.035);
        c.beginPath(); c.arc(0, 0, r * 0.78, 0, TAU); c.stroke();
        // os riscos de sangue entre os dois anéis, pulsando
        for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; c.globalAlpha = (0.4 + 0.4 * Math.max(0, Math.sin(t * 1.5 + k))) * pow; c.beginPath(); c.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); c.lineTo(Math.cos(a + 0.2) * r * 0.97, Math.sin(a + 0.2) * r * 0.97); c.stroke(); }
        c.restore();
        // os pingos
        c.fillStyle = '#8a0a14';
        const n = cnt(g, 1, 2, 14, pow);
        for (let i = 0; i < n; i++) { const [x, y] = g.sample(hsh(i, 1, g.seed) * 0.6, hsh(i, 2, g.seed)); c.globalAlpha = 0.7 * pow; c.beginPath(); c.arc(x, y, g.cell * (0.04 + hsh(i, 3, g.seed) * 0.05), 0, TAU); c.fill(); }
      },
    },
    nevoaRubra: {
      n: 'Névoa Rubra', r: "Taekeir Zier'Asurper", tint: '#4a0a14', base: 0.3, edge: '#ff6a7a', g: 'racas', sug: 'ofuscado', lembra: true, dur: 2, rr: 2,
      regra: 'névoa de sangue: os inimigos dentro ficam Ofuscados (−3 nos ataques), os aliados não; fica mesmo depois que o círculo se apaga; dura 2 rodadas (3 no 2º grau)',
      draw(c, g, t, pow) {
        const n = cnt(g, 2.2, 5, 28, pow);
        for (let i = 0; i < n; i++) { const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed)); blob(c, x + Math.sin(t * 0.35 + i) * g.cell * 0.4, y + Math.cos(t * 0.3 + i * 3) * g.cell * 0.3, g.cell * (0.8 + hsh(i, 3, g.seed) * 0.6), i % 2 ? '#c2263a' : '#7a0e1c', 0.3 * pow); }
      },
    },
    campoAquatico: {
      n: 'Campo Aquático', r: 'Taekeir Marítimo', tint: '#1c5f92', base: 0.34, edge: '#8fd0ff', g: 'racas', sug: 'molhado', lembra: true, dur: 2, rr: 2,
      regra: 'água chamada pelo Taekeir: conta como água para ele; os inimigos dentro ficam Molhados (−2 na esquiva) enquanto estiverem nele; terreno difícil para os inimigos que não nadam (com Fundo de Lodo, também para os que nadam); dura 2 rodadas',
      draw(c, g, t, pow) {
        // as ondinhas que andam e o brilho
        c.strokeStyle = '#cdeaff'; c.lineCap = 'round';
        const n = cnt(g, 2.2, 4, 30, pow);
        for (let i = 0; i < n; i++) {
          const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed)), L = g.cell * (0.3 + hsh(i, 3, g.seed) * 0.3), ph = t * 0.8 + i;
          c.globalAlpha = (0.3 + 0.3 * Math.sin(ph)) * pow; c.lineWidth = Math.max(0.7, g.cell * 0.03);
          c.beginPath(); c.moveTo(x - L, y); c.quadraticCurveTo(x - L / 2, y - L * 0.25 * Math.sin(ph), x, y); c.quadraticCurveTo(x + L / 2, y + L * 0.25 * Math.sin(ph), x + L, y); c.stroke();
        }
        c.globalCompositeOperation = 'lighter';
        const b = cnt(g, 1, 2, 12, pow);
        for (let i = 0; i < b; i++) { const tw = Math.max(0, Math.sin(t * 1.4 + i * 2)), [x, y] = g.sample(hsh(i, 4, g.seed), hsh(i, 5, g.seed)); blob(c, x, y, g.cell * 0.15 * tw, '#ffffff', tw * 0.5 * pow); }
      },
    },
    aguaOdre: {
      n: 'Água do Odre', r: 'Taekeir Marítimo', tint: '#2a6f8a', base: 0.3, edge: '#9fd8e8', g: 'racas', dur: 1, rr: 1.5,
      regra: 'poça de água do mar: conta como água só para a Maré do Taekeir (não serve para nadar e não deixa ninguém Molhado); dura até o fim da rodada seguinte',
      draw(c, g, t, pow) {
        const n = cnt(g, 1.4, 2, 12, pow);
        for (let i = 0; i < n; i++) { const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed)); blob(c, x, y, g.cell * (0.4 + hsh(i, 3, g.seed) * 0.4), '#4a9ab8', 0.35 * pow); }
        c.strokeStyle = '#d8f2ff'; c.lineWidth = Math.max(0.6, g.cell * 0.02);
        for (let i = 0; i < 3; i++) { const ph = (t * 0.4 + i / 3) % 1; c.globalAlpha = (1 - ph) * 0.5 * pow; c.beginPath(); c.arc(g.cx, g.cy, g.inR * 0.9 * ph, 0, TAU); c.stroke(); }
      },
    },
    cercaEspiritos: {
      n: 'Cerca de Espíritos', r: "Orc Magi'Ritu", tint: '#1a3a40', base: 0.18, edge: '#9ff0e0', glow: true, g: 'racas', sug: 'enraizado', k: 'line', w: 1, rr: 6,
      regra: 'a linha de espíritos entre dois totens (a até 6 cédulas um do outro; 8 no grau 2): o inimigo que a atravessa testa VIT ou CAN (o maior) e, se falhar, para na linha e fica Enraizado até o fim do turno dele; dura enquanto os dois totens existirem',
      draw(c, g, t, pow) {
        c.globalCompositeOperation = 'lighter';
        aoLongo(c, g, t, pow, cnt(g, 2, 4, 24, pow), '#bff8ea', 0.25, 0.04);
        const n = cnt(g, 1, 2, 12, pow);
        for (let i = 0; i < n; i++) { const u = (hsh(i, 1, g.seed) + t * 0.08) % 1, [x, y] = g.sample(u, 0.5 + Math.sin(t + i) * 0.25); blob(c, x, y, g.cell * 0.35, '#7fe0d0', (0.3 + 0.2 * Math.sin(t * 2 + i)) * pow); }
      },
    },
    totem: {
      n: 'Totem', r: "Orc Magi'Ritu", tint: '#3a2a14', base: 0.12, edge: '#e0a860', g: 'racas', pv: 12, dur: 2, rr: 2, fimPv: 'O totem caiu',
      regra: 'objeto numa cédula (12 de HP, até 20 com Cerne Duro; DEF F/M 12): não anda nem sofre condições; a aura de raio 2 (Ancestral, Seiva, Atoleiro, Mortos ou Guerra) os inimigos testam contra a CAN que ele rolou ao fincar; dura 2 rodadas (3 com Totem Antigo); some com o HP em zero',
      draw(c, g, t, pow) {
        // a aura (um anel que respira) e o poste entalhado no meio
        c.strokeStyle = '#e0a860'; c.lineWidth = Math.max(0.8, g.cell * 0.03);
        c.globalAlpha = (0.25 + 0.2 * Math.sin(t * 1.2)) * pow; c.beginPath(); c.arc(g.cx, g.cy, g.inR * (0.7 + 0.08 * Math.sin(t)), 0, TAU); c.stroke();
        const s = g.cell * 0.6, x = g.cx, y = g.cy;
        c.globalAlpha = 0.95 * pow;
        c.fillStyle = '#6a4424'; c.fillRect(x - s * 0.32, y - s * 1.1, s * 0.64, s * 2.1);
        c.fillStyle = '#8a5a30';
        for (let k = 0; k < 3; k++) { const yy = y - s * 1.05 + k * s * 0.7; c.fillRect(x - s * 0.42, yy, s * 0.84, s * 0.55); }
        c.fillStyle = '#e0a860';
        for (let k = 0; k < 3; k++) { const yy = y - s * 0.85 + k * s * 0.7; c.fillRect(x - s * 0.24, yy, s * 0.14, s * 0.1); c.fillRect(x + s * 0.1, yy, s * 0.14, s * 0.1); }
        // as asas do alto
        c.fillStyle = '#b87a3a'; c.beginPath(); c.moveTo(x - s * 0.4, y - s * 1); c.lineTo(x - s, y - s * 1.25); c.lineTo(x - s * 0.4, y - s * 0.75); c.moveTo(x + s * 0.4, y - s * 1); c.lineTo(x + s, y - s * 1.25); c.lineTo(x + s * 0.4, y - s * 0.75); c.fill();
      },
    },
    parteSolta: {
      n: 'Parte Solta', r: "Ghoul Mãzier'na", tint: '#3a2a26', base: 0.14, edge: '#c08a7a', g: 'racas', pv: 15, rr: 0.6, fimPv: 'A parte caiu (continua perdida até voltar)',
      regra: 'uma parte da Mãzier\'na em campo, longe do corpo (Braço Errante, Mão Rastejante, Pé-Mina…): a que luta tem HP próprio (braço 15, mão 6 — mude o máximo) e conta no teto de 2 ações de companheiros; com a Carne Armada, ele pode estourá-la; some com o HP em zero, quando estoura ou volta ao corpo (a marca de perdida fica)',
      draw(c, g, t, pow) {
        // a mão cinzenta que rasteja, com os dedos mexendo
        const s = g.cell * 0.42, x = g.cx + Math.sin(t * 0.8) * g.cell * 0.04, y = g.cy;
        c.globalAlpha = 0.95 * pow; c.fillStyle = '#9a8478';
        c.beginPath(); c.ellipse(x, y + s * 0.2, s * 0.55, s * 0.45, 0, 0, TAU); c.fill();
        c.strokeStyle = '#9a8478'; c.lineCap = 'round'; c.lineWidth = Math.max(1.2, s * 0.22);
        for (let k = 0; k < 4; k++) { const a = -Math.PI / 2 + (k - 1.5) * 0.4, L = s * (0.7 + 0.15 * Math.sin(t * 3 + k)); c.beginPath(); c.moveTo(x + Math.cos(a) * s * 0.35, y + Math.sin(a) * s * 0.35); c.lineTo(x + Math.cos(a) * (s * 0.35 + L), y + Math.sin(a) * (s * 0.35 + L)); c.stroke(); }
        c.strokeStyle = '#6a1a1a'; c.lineWidth = Math.max(0.8, s * 0.12);
        c.beginPath(); c.moveTo(x - s * 0.4, y + s * 0.6); c.lineTo(x + s * 0.4, y + s * 0.6); c.stroke();
      },
    },
  };
  for (const [id, d] of Object.entries(novas)) { FX.P[id] = d; FX.ORDER.push(id); }
  FX.TAGS.push({ id: 'racas', n: 'Raças' });
})();
