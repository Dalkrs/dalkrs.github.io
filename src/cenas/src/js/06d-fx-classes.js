/* ---------------------------------------------------------------
   6d. AS ZONAS DAS CLASSES (lote 20)
   O chão e as áreas que as árvores de classe criam (os rituais do mago, os círculos do sacerdote, o Rastro de Pólvora do
   bruxo, a Fermata do bardo…), no grupo Classes da aba Efeitos, como as das raças: o desenho, a regra escrita, a
   condição sugerida e o aviso do começo da vez — quem aplica é o mestre. As que andam com o personagem (presa: a Luz da
   Lanterna, o Círculo de Proteção, a Fermata, a Retaguarda) fazem a ferramenta prender a zona ao token clicado. A Muralha
   de Natu e o Pilar de Pedra barram a passagem e a visão e têm os pontos de vida (como a Muralha de cristais). As zonas
   de hoje que a classe também usa (o Chão consagrado, a Lama, o Pântano e o Silêncio) ganham a regra da classe e
   aparecem também no grupo Classes (g2).
   --------------------------------------------------------------- */
(() => {
  const { hsh, blob } = FX;
  const cnt = (g, per, min, max, pow) => clamp(Math.round(g.area * per * pow), min, max);
  // fumaça ou névoa: manchas que andam devagar
  function manchas(c, g, t, pow, per, cores, a, tam) {
    const n = cnt(g, per, 3, 40, pow);
    for (let i = 0; i < n; i++) { const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed)); blob(c, x + Math.sin(t * 0.3 + i) * g.cell * 0.4, y + Math.cos(t * 0.25 + i * 2) * g.cell * 0.3, g.cell * (tam || 0.9) * (0.8 + hsh(i, 3, g.seed) * 0.6), cores[i % cores.length], a * pow); }
  }
  // as chamas pequenas que sobem
  function chamas(c, g, t, pow, per, cores) {
    c.globalCompositeOperation = 'lighter';
    const n = cnt(g, per, 4, 70, pow);
    for (let i = 0; i < n; i++) {
      const ph = t * (0.5 + hsh(i, 3, g.seed) * 0.6) + hsh(i, 4, g.seed), life = ph % 1, cyc = Math.floor(ph);
      const [x, y] = g.sample(hsh(i + cyc * 17, 1, g.seed), hsh(i + cyc * 17, 2, g.seed));
      blob(c, x, y - life * g.cell * 0.35, g.cell * (0.18 + hsh(i, 5, g.seed) * 0.22) * (1 - life * 0.5), life < 0.4 ? cores[0] : life < 0.75 ? cores[1] : cores[2], Math.sin(life * Math.PI) * 0.5 * pow);
    }
    c.globalCompositeOperation = 'source-over';
  }
  // um anel de luz (os círculos e os selos)
  function anel(c, g, t, pow, cor, raios, giro) {
    c.save(); c.translate(g.cx, g.cy); c.rotate(t * (giro || 0.05));
    c.strokeStyle = cor; c.lineCap = 'round';
    const r = g.inR * 0.9;
    c.globalAlpha = (0.55 + 0.25 * Math.sin(t * 1.4)) * pow; c.lineWidth = Math.max(1, g.cell * 0.05); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
    c.lineWidth = Math.max(0.7, g.cell * 0.025); c.globalAlpha = 0.45 * pow; c.beginPath(); c.arc(0, 0, r * 0.82, 0, TAU); c.stroke();
    c.beginPath();
    for (let k = 0; k < (raios || 12); k++) { const a = k / (raios || 12) * TAU; c.moveTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.stroke();
    c.restore();
  }
  // galhos e raízes que se mexem
  function raizes(c, g, t, pow, per, cor, larg) {
    c.strokeStyle = cor; c.lineCap = 'round';
    const n = cnt(g, per, 3, 30, pow);
    for (let i = 0; i < n; i++) {
      const [x, y] = g.sample(hsh(i, 6, g.seed), hsh(i, 7, g.seed)), a = hsh(i, 8, g.seed) * TAU, L = g.cell * (0.6 + hsh(i, 9, g.seed) * 0.7), bal = Math.sin(t * 0.8 + i) * 0.15;
      c.globalAlpha = 0.85 * pow; c.lineWidth = Math.max(1, g.cell * (larg || 0.07));
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a + 1.4 + bal) * L * 0.4, y + Math.sin(a + 1.4 + bal) * L * 0.4, x + Math.cos(a + bal) * L, y + Math.sin(a + bal) * L); c.stroke();
    }
  }
  // flocos que caem
  function flocos(c, g, t, pow, per) {
    c.fillStyle = '#ffffff';
    const n = cnt(g, per, 6, 80, pow);
    for (let i = 0; i < n; i++) { const u = hsh(i, 21, g.seed), v = (hsh(i, 22, g.seed) + t * (0.08 + hsh(i, 23, g.seed) * 0.08)) % 1, [x, y] = g.sample(u, v); c.globalAlpha = 0.7 * pow; c.beginPath(); c.arc(x + Math.sin(t + i) * g.cell * 0.1, y, Math.max(0.6, g.cell * 0.03), 0, TAU); c.fill(); }
  }
  const novas = {
    retaguarda: {
      n: 'Retaguarda', r: 'Aégis', tint: '#3a4a66', base: 0.14, edge: '#9fb8e0', g: 'classes', presa: true, k: 'cone', rr: 2.5,
      regra: 'as cédulas atrás do Escudo Plantado (3; 5 ou mais com Muralha Larga e Muralha Abso\'natu): ataques à distância e magias de alvo único vindos da frente fixam −4 contra os aliados aqui; o ataque contra um aliado na Retaguarda que erra conta como proteger; vale enquanto o Escudo Plantado durar (gire a área para trás do Aégis)',
      draw(c, g, t, pow) {
        c.strokeStyle = '#c8d8f2'; c.lineWidth = Math.max(0.7, g.cell * 0.025);
        for (let k = 1; k <= 4; k++) { c.globalAlpha = (0.2 + 0.15 * Math.sin(t * 1.2 - k)) * pow; c.beginPath(); c.arc(g.x, g.y, g.R * k / 4, g.dir - 0.9, g.dir + 0.9); c.stroke(); }
      },
    },
    luzLanterna: {
      n: 'Luz da Lanterna', r: 'Sacerdote', tint: '#fff0b0', base: 0.1, edge: '#fff6d0', glow: true, g: 'classes', presa: true, rr: 3,
      regra: 'em volta do sacerdote (raio 3; 4 com a Lanterna Larga): sem escuridão mágica; forças Ayto não ficam Ocultas nem Invisíveis; aliados +2 contra Amedrontado e efeitos de forças Ayto; dura até o fim do combate; apaga se o sacerdote ficar Silenciado ou Inconsciente (com a Lanterna Abso\'yana, também quando falta Graça)',
      draw(c, g, t, pow) {
        c.globalCompositeOperation = 'lighter';
        blob(c, g.cx, g.cy, g.inR * (0.95 + 0.04 * Math.sin(t * 2)), '#fff2c0', 0.22 * pow);
        const n = cnt(g, 1.2, 4, 24, pow);
        for (let i = 0; i < n; i++) { const a = hsh(i, 1, g.seed) * TAU + t * 0.2, r = g.inR * (0.3 + hsh(i, 2, g.seed) * 0.6); blob(c, g.cx + Math.cos(a) * r, g.cy + Math.sin(a) * r, g.cell * 0.12, '#ffffff', (0.3 + 0.3 * Math.sin(t * 2 + i)) * pow); }
      },
    },
    circuloProtecao: {
      n: 'Círculo de Proteção', r: 'Sacerdote', tint: '#f5e6a0', base: 0.1, edge: '#fff2b8', glow: true, g: 'classes', presa: true, rr: 2, dur: 2,
      regra: 'em volta do sacerdote: força Ayto só entra andando passando num teste de CAN (mortos-vivos sem mente: VIT); existência absoluta entra e fica Lenta; aliados dentro não ficam Possuídos; dura 2 rodadas',
      draw(c, g, t, pow) { c.globalCompositeOperation = 'lighter'; anel(c, g, t, pow, '#fff0a8', 16, 0.08); },
    },
    seloMaior: {
      n: 'Selo Maior', r: 'Sacerdote', tint: '#f5e6a0', base: 0.12, edge: '#fff2b8', glow: true, g: 'classes', rr: 2, dur: 2,
      regra: 'o círculo de luz do Selo de Abso\'yana: a primeira condição ruim que cada aliado dentro pegaria por falhar num teste não pega (contra existência absoluta, pega e dura 1 rodada); dura 2 rodadas',
      draw(c, g, t, pow) {
        c.globalCompositeOperation = 'lighter'; anel(c, g, t, pow, '#ffe68a', 8, -0.04);
        c.save(); c.translate(g.cx, g.cy); c.rotate(-t * 0.04); c.strokeStyle = '#fff4c0'; c.globalAlpha = 0.5 * pow; c.lineWidth = Math.max(0.8, g.cell * 0.03);
        const r = g.inR * 0.6; c.beginPath(); for (let k = 0; k <= 8; k++) { const a = k * 3 / 8 * TAU; if (k) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.stroke(); c.restore();
      },
    },
    circuloRitual: {
      n: 'Círculo de Ritual', r: 'Mago', tint: '#2a1648', base: 0.14, edge: '#c9a6ff', glow: true, g: 'classes', rr: 1, dur: 1, sug: 'foco',
      regra: 'o círculo que o mago traçou: ele fica Concentrando e, no próximo turno, solta o ritual daqui sem gastar a ação, pagando o Preparo e o SP; sai quando o ritual é solto ou quando ele perde a concentração (falha no teste de CAN ao sofrer dano, fica Caído, Atordoado, Paralisado ou Inconsciente, ou é empurrado sem o Círculo Firme); o Preparo ganho ao traçar fica',
      draw(c, g, t, pow) { c.globalCompositeOperation = 'lighter'; anel(c, g, t, pow, '#c9a6ff', 6, 0.15); },
    },
    chaoBrasa: {
      n: 'Chão em Brasa', r: 'Mago', tint: '#2a1208', base: 0.45, edge: '#ff8a3a', glow: true, g: 'classes', sug: 'fogo', lembra: true, rr: 2, dur: 2,
      regra: 'terreno em chamas (Sol Caído, fusão de magma): o inimigo que entra ou começa o turno aqui sofre dano de fogo e fica Queimando por 1 rodada; dura 2 rodadas; sai antes quando uma magia de água (Simphus) passa por cima',
      draw(c, g, t, pow) {
        c.strokeStyle = '#ff6a1a'; c.lineCap = 'round';
        const n = cnt(g, 1.4, 3, 24, pow);
        for (let i = 0; i < n; i++) { const [x, y] = g.sample(hsh(i, 11, g.seed), hsh(i, 12, g.seed)), a = hsh(i, 13, g.seed) * TAU, L = g.cell * 0.6; c.globalAlpha = (0.5 + 0.3 * Math.sin(t * 2 + i)) * pow; c.lineWidth = Math.max(1, g.cell * 0.05); c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); c.stroke(); }
        chamas(c, g, t, pow, 3, ['#ffd98a', '#ff8a24', '#d6330f']);
      },
    },
    campoNapha: {
      n: 'Campo de Napha-ni', r: 'Mago', tint: '#bfe6ff', base: 0.26, edge: '#f0faff', g: 'classes', sug: 'resfriado', lembra: true, rr: 3, dur: 2,
      regra: 'geada (ritual do mago): os inimigos dentro ficam Resfriados e Lentos; quem começa o turno aqui testa VIT e, se falhar, fica Congelado até o fim desse turno (existência absoluta: só Lenta); dura 2 rodadas',
      draw(c, g, t, pow) { manchas(c, g, t, pow, 1.2, ['#e8f7ff', '#cfeaff'], 0.2); flocos(c, g, t, pow, 2); },
    },
    bosqueNirus: {
      n: 'Bosque de Nirus-ni', r: 'Mago', tint: '#2a5226', base: 0.3, edge: '#a8e890', g: 'classes', sug: 'enraizado', lembra: true, rr: 3, dur: 3,
      regra: 'terreno difícil para os inimigos; aliados dentro que não atacam ficam Ocultos; o inimigo que começa o turno aqui testa AGI ou FOR e, se falhar, fica Enraizado até o fim do próximo turno dele; dura 3 rodadas',
      draw(c, g, t, pow) {
        manchas(c, g, t, pow, 1.2, ['#2f6a2a', '#3f8a36'], 0.4, 0.7);
        raizes(c, g, t, pow, 1.2, '#5a3a1a', 0.06);
        // as copas
        const n = cnt(g, 0.9, 2, 14, pow);
        for (let i = 0; i < n; i++) { const [x, y] = g.sample(hsh(i, 31, g.seed), hsh(i, 32, g.seed)); blob(c, x, y, g.cell * 0.7, '#4c9a44', 0.5 * pow); }
      },
    },
    seloYana: {
      n: 'Selo de Yana', r: 'Mago', tint: '#fff0c0', base: 0.12, edge: '#fff8de', glow: true, g: 'classes', sug: 'ofuscado', rr: 2, dur: 2,
      regra: 'o círculo de luz em volta do mago (ritual): até 3 aliados dentro ficam Escudados com 20% do HP máximo ao surgir; o inimigo que entra testa VIT e, se falhar, fica Ofuscado até o fim do próximo turno dele; dura 2 rodadas',
      draw(c, g, t, pow) { c.globalCompositeOperation = 'lighter'; blob(c, g.cx, g.cy, g.inR * 0.8, '#fff6d0', 0.18 * pow); anel(c, g, t, pow, '#fff2b0', 12, 0.06); },
    },
    raizesNirus: {
      n: 'Raízes de Nirus', r: 'Mago', tint: '#3a2a14', base: 0.24, edge: '#a88a5a', g: 'classes', sug: 'enraizado', lembra: true, rr: 2, dur: 2,
      regra: 'terreno difícil para os inimigos; quem está aqui quando brotam ou começa o turno aqui testa AGI ou FOR e, se falhar, fica Enraizado até o fim do próximo turno dele; dura 2 rodadas',
      draw(c, g, t, pow) { raizes(c, g, t, pow, 2.4, '#6a4a22', 0.08); raizes(c, g, t * 1.3, pow, 1.2, '#9a7a42', 0.03); },
    },
    noiteAyto: {
      n: 'Noite de Ayto-ni', r: 'Mago', tint: '#0a0614', base: 0.62, edge: '#6a4a9a', g: 'classes', sug: 'ofuscado', lembra: true, rr: 3, dur: 2,
      regra: 'escuridão: os inimigos dentro ficam Ofuscados, e quem começa o turno aqui testa PER ou CAN (o maior) e, se falhar, fica Cego enquanto estiver dentro; o mago vê aqui dentro; aliados dentro que não atacam ficam Ocultos; dura 2 rodadas',
      draw(c, g, t, pow) {
        manchas(c, g, t, pow, 1.4, ['#120a22', '#1e1238'], 0.5);
        c.fillStyle = '#b89aff';
        const n = cnt(g, 1, 2, 16, pow);
        for (let i = 0; i < n; i++) { const [x, y] = g.sample(hsh(i, 41, g.seed), hsh(i, 42, g.seed)); c.globalAlpha = Math.max(0, Math.sin(t * 1.3 + i * 2)) * 0.6 * pow; c.beginPath(); c.arc(x, y, Math.max(0.6, g.cell * 0.03), 0, TAU); c.fill(); }
      },
    },
    invernoEterno: {
      n: 'Inverno Eterno', r: 'Mago', tint: '#dff2ff', base: 0.34, edge: '#ffffff', glow: true, g: 'classes', sug: 'resfriado', lembra: true, rr: 4, dur: 3,
      regra: 'o inverno de Ab\'napha-ni: os inimigos dentro ficam Resfriados e Lentos; quem começa o turno aqui testa VIT e, se falhar, fica Congelado até o fim desse turno (uma vez por inimigo; existência absoluta: só Lenta); os aliados dentro andam 1 cédula a menos; enquanto durar, o mago ganha só +2 de Preparo no começo do turno; dura 3 rodadas',
      draw(c, g, t, pow) { manchas(c, g, t, pow, 1.6, ['#ffffff', '#d8eeff'], 0.26); flocos(c, g, t * 1.6, pow, 4); },
    },
    tornadoArdente: {
      n: 'Tornado Ardente', r: 'Mago', tint: '#3a1206', base: 0.3, edge: '#ffb14d', glow: true, g: 'classes', sug: 'fogo', lembra: true, rr: 2, dur: 2,
      regra: 'ao surgir e no começo de cada turno do mago, dano de fogo em cada inimigo dentro, e quem falhar em Vigor (FOR ou VIT, o maior) é puxado 1 cédula para o centro e fica Queimando; o mago o leva 3 cédulas com o movimento; dura 2 rodadas',
      draw(c, g, t, pow) {
        c.globalCompositeOperation = 'lighter';
        const n = cnt(g, 3, 8, 60, pow);
        for (let i = 0; i < n; i++) { const r = g.inR * (0.15 + hsh(i, 1, g.seed) * 0.85), a = hsh(i, 2, g.seed) * TAU + t * (3 - r / g.inR * 2); blob(c, g.cx + Math.cos(a) * r, g.cy + Math.sin(a) * r * 0.8, g.cell * 0.2, i % 3 ? '#ff8a24' : '#ffd98a', 0.4 * pow); }
      },
    },
    sarcaArdente: {
      n: 'Sarça Ardente', r: 'Mago', tint: '#2a1a08', base: 0.36, edge: '#ff9a4a', glow: true, g: 'classes', sug: 'fogo', lembra: true, rr: 1, dur: 2,
      regra: 'moita de espinhos em brasa (fusão Nirus + Vas): quem está aqui ao surgir, entra ou começa o turno aqui fica Queimando por 1 rodada; terreno difícil para os inimigos; dura 2 rodadas; sai antes com água (Simphus)',
      draw(c, g, t, pow) { raizes(c, g, t, pow, 3, '#3a2208', 0.06); chamas(c, g, t, pow, 2.5, ['#ffd98a', '#ff8a24', '#b8330f']); },
    },
    muralhaNatu: {
      n: 'Muralha de Natu', r: 'Mago', tint: '#4a4036', base: 0.7, edge: '#a8988a', g: 'classes', bloqueia: true, barra: true, pv: 36, k: 'line', rr: 3, w: 1, dur: 3, fimPv: 'A muralha de pedra caiu',
      regra: 'parede de pedra numa linha de até 3 cédulas: dá cobertura e ninguém atravessa (barra a passagem e a visão); cada cédula tem 12 de HP (36 na linha de 3); dura 3 rodadas; some no fim desse tempo ou com o HP em zero',
      draw(c, g, t, pow) {
        c.strokeStyle = '#2a241e'; c.lineWidth = Math.max(0.8, g.cell * 0.04);
        const n = Math.max(2, Math.round(g.R / g.cell * 2));
        for (let k = 0; k <= n; k++) { const [x, y] = g.sample(k / n, 0.5); c.globalAlpha = 0.6 * pow; c.beginPath(); c.moveTo(x - g.sn * g.cell * 0.5, y + g.cs * g.cell * 0.5); c.lineTo(x + g.sn * g.cell * 0.5, y - g.cs * g.cell * 0.5); c.stroke(); }
        const m = cnt(g, 3, 4, 40, pow);
        c.fillStyle = '#7a6a5a';
        for (let i = 0; i < m; i++) { const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed)); c.globalAlpha = 0.5 * pow; c.beginPath(); c.arc(x, y, g.cell * 0.08, 0, TAU); c.fill(); }
      },
    },
    pilarPedra: {
      n: 'Pilar de Pedra', r: 'Mago', tint: '#4a4036', base: 0.72, edge: '#b8a898', g: 'classes', bloqueia: true, barra: true, pv: 15, k: 'quad', rr: 0.5, fimPv: 'O pilar caiu',
      regra: 'pilar erguido pelo Abso\'natu: Montanha Desperta, numa cédula: dá cobertura e ninguém o atravessa (barra a passagem e a visão); 15 de HP; dura até o fim do combate; cai com o HP em zero',
      draw(c, g, t, pow) {
        const s = g.inR * 0.8;
        c.globalAlpha = 0.9 * pow; c.fillStyle = '#8a7a6a'; c.beginPath(); c.arc(g.cx, g.cy, s, 0, TAU); c.fill();
        c.strokeStyle = '#2a241e'; c.lineWidth = Math.max(0.8, g.cell * 0.04); c.beginPath(); c.arc(g.cx, g.cy, s, 0, TAU); c.stroke();
        c.beginPath(); c.arc(g.cx, g.cy, s * 0.55, 0, TAU); c.stroke();
      },
    },
    rastroPolvora: {
      n: 'Rastro de Pólvora', r: 'Bruxo', tint: '#1a1410', base: 0.2, edge: '#8a7a5a', g: 'classes', sug: 'fogo', k: 'line', rr: 4, w: 0.5,
      regra: 'a linha de pólvora drenada (4 cédulas; 6 com a Pólvora Fina): não faz nada sozinha; o Bruxo a acende (Acender o Rastro, ou como reação com o Estopim Curto) e cada inimigo em cima ou adjacente testa AGI ou sofre dano de fogo e fica Queimando por 2 rodadas (metade do dano se passar); até 2 rastros; dura até ser acesa ou até o fim do combate; sai com água ou chuva forte',
      draw(c, g, t, pow) {
        c.fillStyle = '#6a5a40';
        const n = cnt(g, 14, 12, 140, pow);
        for (let i = 0; i < n; i++) { const [x, y] = g.sample(hsh(i, 1, g.seed), 0.3 + hsh(i, 2, g.seed) * 0.4); c.globalAlpha = 0.85 * pow; c.beginPath(); c.arc(x, y, Math.max(0.8, g.cell * 0.05), 0, TAU); c.fill(); }
        // uma faísca que corre devagar (para mostrar que acende)
        const u = (t * 0.1) % 1, [fx, fy] = g.sample(u, 0.5); c.globalCompositeOperation = 'lighter'; blob(c, fx, fy, g.cell * 0.15, '#ffb84a', 0.35 * pow);
      },
    },
    chaoEspinhos: {
      n: 'Chão de Espinhos', r: 'Feiticeiro', tint: '#2a3a1a', base: 0.26, edge: '#8aa85a', g: 'classes', sug: 'sangue', lembra: true, rr: 2, dur: 2,
      regra: 'terreno difícil para os inimigos; quem anda aqui sofre dano e fica Sangrando por 1 rodada (uma vez por turno); dura 2 rodadas (3 com a Mata que Engole); sai antes com fogo grande',
      draw(c, g, t, pow) {
        raizes(c, g, t, pow, 2, '#3a2a12', 0.05);
        c.fillStyle = '#c8d8a0';
        const n = cnt(g, 3, 6, 60, pow);
        for (let i = 0; i < n; i++) { const [x, y] = g.sample(hsh(i, 51, g.seed), hsh(i, 52, g.seed)), s = g.cell * 0.07, a = hsh(i, 53, g.seed) * TAU; c.globalAlpha = 0.8 * pow; c.beginPath(); c.moveTo(x + Math.cos(a) * s * 2, y + Math.sin(a) * s * 2); c.lineTo(x + Math.cos(a + 2.2) * s, y + Math.sin(a + 2.2) * s); c.lineTo(x + Math.cos(a - 2.2) * s, y + Math.sin(a - 2.2) * s); c.closePath(); c.fill(); }
      },
    },
    nirusSombrio: {
      n: 'Nirus-ni Sombrio', r: 'Feiticeiro', tint: '#141a10', base: 0.42, edge: '#6a8a4a', g: 'classes', sug: 'enraizado', lembra: true, rr: 2, dur: 2,
      regra: 'bosque maligno: os inimigos aqui testam FOR ou AGI no começo do turno e, se falharem, ficam Enraizados até o fim do turno; aliados aqui têm +2 de esquiva contra tiros; dura 2 rodadas (3 com a Mata que Engole); sai antes com fogo grande',
      draw(c, g, t, pow) { manchas(c, g, t, pow, 1.2, ['#1a2412', '#24301a'], 0.45, 0.8); raizes(c, g, t, pow, 1.6, '#0a0e08', 0.07); },
    },
    pocoBreu: {
      n: 'Poço de Breu', r: 'Feiticeiro', tint: '#040306', base: 0.8, edge: '#4a3a6a', g: 'classes', sug: 'cego', lembra: true, rr: 1, dur: 2,
      regra: 'escuridão: o inimigo que começa o turno aqui testa VIT e, se falhar, fica Cego enquanto estiver dentro; quem tem pacto com a sombra vê normalmente; dura 2 rodadas; sai antes com luz forte (magia Yana)',
      draw(c, g, t, pow) { manchas(c, g, t, pow, 2, ['#000000', '#0e0818'], 0.6, 0.7); },
    },
    fermata: {
      n: 'Fermata', r: 'Bardo', tint: '#3a2a4a', base: 0.16, edge: '#d8b8f0', g: 'classes', sug: 'silencio', lembra: true, presa: true, rr: 3, dur: 2,
      regra: 'a pausa de silêncio que anda com o bardo: no começo de cada turno deles, os inimigos dentro testam CAN ou VIT (o maior) com −2, e quem falhar fica Silenciado e Surdo enquanto estiver dentro; o bardo também fica Silenciado e só usa a Dança; dura 2 rodadas',
      draw(c, g, t, pow) {
        c.strokeStyle = '#e6d0ff'; c.lineWidth = Math.max(0.7, g.cell * 0.025);
        for (let k = 1; k <= 3; k++) { const ph = (t * 0.3 + k / 3) % 1; c.globalAlpha = (1 - ph) * 0.5 * pow; c.beginPath(); c.arc(g.cx, g.cy, g.inR * ph, 0, TAU); c.stroke(); }
        // o sinal da fermata no meio
        c.globalAlpha = 0.7 * pow; c.lineWidth = Math.max(1, g.cell * 0.05); c.beginPath(); c.arc(g.cx, g.cy + g.cell * 0.1, g.cell * 0.35, Math.PI, TAU); c.stroke();
        c.fillStyle = '#e6d0ff'; c.beginPath(); c.arc(g.cx, g.cy, g.cell * 0.07, 0, TAU); c.fill();
      },
    },
  };
  for (const [id, d] of Object.entries(novas)) { FX.P[id] = d; FX.ORDER.push(id); }
  FX.TAGS.push({ id: 'classes', n: 'Classes' });
  // as de hoje que as classes também usam: a regra da classe, e o grupo Classes junto do delas
  const daClasse = {
    consagrado: 'Na classe (Sacerdote): forças Ayto que começam o turno aqui sofrem dano de luz e aqui não ficam Ocultas nem Etéreas; dura 2 ou 3 rodadas',
    lama: 'Na classe (Mago, fusão Natu + Simphus): terreno difícil para os inimigos; quem está aqui ao surgir ou começa o turno aqui testa AGI e, se falhar, fica Lento até o fim do próximo turno dele; dura 2 rodadas',
    pantano: 'Na classe (Mago, fusão Nirus + Simphus): quem está aqui ao surgir ou começa o turno aqui testa AGI e, se falhar, fica Emaranhado até o fim do próximo turno dele; terreno difícil para os inimigos; dura 2 rodadas',
    silencio: 'Na classe (Bardo, a Zona de Silêncio): o inimigo que começa o turno dentro ou entra testa CAN ou VIT (o maior) e, se falhar, fica Silenciado enquanto estiver dentro; aliados não são afetados, e o bardo não canta de dentro dela; dura 2 rodadas (3 com Silêncio Largo)',
  };
  for (const [id, txt] of Object.entries(daClasse)) if (FX.P[id]) Object.assign(FX.P[id], { rc: txt, g2: 'classes' });     // (rc: a regra da classe, no painel; o lembrete do começo da vez fica com a de sempre)
})();
