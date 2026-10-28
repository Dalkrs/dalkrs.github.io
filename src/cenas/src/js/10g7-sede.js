/* ---------------------------------------------------------------
   10g7. SEDE — as cenas da Casa do clã (lote 30)
   A aba Clã manda a sede inteira (TC.ponte.ir('cenas', { sede: { cla, nome, sede, ir } })) e aqui ela vira cenas:
   a cena de fora (o terreno, com o chão do lugar do clã no Mapa-múndi, as estradas, a muralha, os portões, o poço, os
   jardins e os prédios vistos de cima, com o telhado e uma Entrada na porta de cada um) e a de cada andar de cada
   prédio (o piso de cada cômodo, as paredes de fora e de dentro, as portas fechadas, as janelas, os móveis, a Saída
   junto da porta de entrada e as escadas, que levam aos outros andares). As cenas têm sempre os mesmos ids
   (sede-<clã>, sede-<clã>-<prédio>-<andar>): pedir de novo ATUALIZA — o que a Sede desenhou (marcado com "sede")
   sai e entra o novo; os tokens, a névoa, as luzes e o que o mestre desenhou à mão ficam. Antes de atualizar, a
   janela diz o que muda; depois, o aviso tem Desfazer (as cenas voltam como estavam; as novas saem).
   A conta da planta (os cômodos, as paredes, os móveis) é a de tc/sede.js, a mesma que a aba Clã usa.
   --------------------------------------------------------------- */
const SedeCenas = (() => {
  const L = () => (window.TC && window.TC.sede) || null;
  const M = 2;                                             // a margem em volta do prédio, na cena do andar (em quadrados)
  const idOk = v => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : null);
  const TIPO_TELHADO = { salao: 'senhor', templo: 'templo' };
  const desloca = (s, dx, dy) => (s ? Object.assign({}, s, { x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy }) : null);
  const marcar = o => { o.sede = 1; return o; };

  /* ================= o andar ================= */
  // o prédio como o Estilos vê (o contorno da torre, as paredes pintadas e as de verdade), com a porta e as janelas de fora
  function casaDe(pl, andar, segs, dx, dy) {
    return { x: dx, y: dy, w: pl.W, h: pl.H, forma: pl.forma, corte: pl.corte || 2, porta: andar.id === 't' ? desloca(pl.porta, dx, dy) : null,
      janelas: segs.filter(s => s.k === 'window' && s.fora).map(s => desloca(s, dx, dy)) };
  }
  function pintarAndar(pl, andar, c, est, seed) {
    const S = L(), W = (pl.W + 2 * M) * c, H = (pl.H + 2 * M) * c;
    const cv = document.createElement('canvas'); cv.width = Math.round(W); cv.height = Math.round(H);
    const g = cv.getContext('2d'), rnd = mulberry(((seed >>> 0) ^ 0x2f6b45) >>> 0 || 3), oct = pl.forma === 'oct';
    g.fillStyle = andar.id === 'p' ? '#0e0c0a' : '#16130f'; g.fillRect(0, 0, W, H);
    const segs = S.paredes(andar, pl.W, pl.H), k = casaDe(pl, andar, segs, M, M);
    g.save();
    if (oct) { const cont = Estilos.contorno(k); g.beginPath(); cont.forEach(([x, y], i) => (i ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); g.closePath(); g.clip(); }
    for (const q of andar.salas) {
      const x = (q.x + M) * c, y = (q.y + M) * c;
      g.save(); g.beginPath(); g.rect(x, y, q.w * c, q.h * c); g.clip();
      Estilos.piso(g, { x: q.x + M, y: q.y + M, w: q.w, h: q.h }, c, rnd, q.piso);
      const gr = g.createLinearGradient(0, y, 0, y + c * 0.35);
      gr.addColorStop(0, 'rgba(0,0,0,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, y, q.w * c, c * 0.35);
      g.restore();
    }
    g.restore();
    // as paredes pintadas: as de fora, grossas (a torre segue o contorno dela); as de dentro, mais finas; as janelas,
    // um traço claro no meio da parede de fora
    const P = Estilos.de(est).parede;
    g.lineCap = 'square';
    for (const s of segs) {
      if (s.k !== 'wall' || (oct && s.fora)) continue;
      g.strokeStyle = P.cor; g.lineWidth = Math.max(2, P.larg * c * (s.fora ? 1 : 0.75));
      g.beginPath(); g.moveTo((s.x1 + M) * c, (s.y1 + M) * c); g.lineTo((s.x2 + M) * c, (s.y2 + M) * c); g.stroke();
    }
    if (oct) Estilos.paredesPintadas(g, k, c, rnd, est, null);
    else {
      g.lineCap = 'butt';
      for (const s of segs) if (s.k === 'window' && s.fora) {
        g.strokeStyle = P.cor; g.lineWidth = Math.max(2, P.larg * c);
        g.beginPath(); g.moveTo((s.x1 + M) * c, (s.y1 + M) * c); g.lineTo((s.x2 + M) * c, (s.y2 + M) * c); g.stroke();
        g.strokeStyle = '#bfe3f2'; g.lineWidth = Math.max(1.5, P.larg * c * 0.35);
        g.beginPath(); g.moveTo((s.x1 + M) * c, (s.y1 + M) * c); g.lineTo((s.x2 + M) * c, (s.y2 + M) * c); g.stroke();
      }
    }
    return cv;
  }
  // as paredes de verdade do andar (que barram a visão), em pixels da cena
  function paredesDoAndar(pl, andar, c) {
    const S = L(), segs = S.paredes(andar, pl.W, pl.H), oct = pl.forma === 'oct', out = [];
    const add = (x1, y1, x2, y2, k) => out.push(marcar({ id: uid('wl'), k, x1: (x1 + M) * c, y1: (y1 + M) * c, x2: (x2 + M) * c, y2: (y2 + M) * c, open: false, locked: false }));
    if (oct) for (const s of Estilos.paredesDaCasa(casaDe(pl, andar, segs, 0, 0))) add(s.x1, s.y1, s.x2, s.y2, s.k || 'wall');
    for (const s of segs) { if (oct && s.fora) continue; add(s.x1, s.y1, s.x2, s.y2, s.k === 'wall' ? 'wall' : s.k); }
    return out;
  }
  // a casa logo para dentro de uma porta da parede de fora
  function dentroDa(p) {
    if (p.lado === 'n') return [p.x1, 0];
    if (p.lado === 's') return [p.x1, p.y1 - 1];
    if (p.lado === 'o') return [0, p.y1];
    return [p.x1 - 1, p.y1];
  }
  // a casa logo para fora (no terreno, em volta do prédio)
  function foraDa(p) {
    if (p.lado === 'n') return [p.x1, -1];
    if (p.lado === 's') return [p.x1, p.y1];
    if (p.lado === 'o') return [-1, p.y1];
    return [p.x1, p.y1];
  }
  // o que a Sede põe na cena do andar: as paredes, os móveis, as escadas, a Saída (no térreo) e, à noite, a luz de cada cômodo
  function conteudoDoAndar(sc, x, andar) {
    const S = L(), pl = x.pr.planta, c = sc.cell, walls = paredesDoAndar(pl, andar, c), tokens = [], lights = [];
    for (const m of andar.moveis.slice().sort((a, b) => (a.id === 'tapete' ? 0 : 1) - (b.id === 'tapete' ? 0 : 1))) {
      if (!Props.P[m.id]) continue;
      const t = Props.novo(sc, m.id, (m.x + M) * c, (m.y + M) * c, m.s, false);
      if (m.rot) t.rot = m.rot;
      tokens.push(marcar(t));
    }
    for (const e of andar.escadas) {
      const t = Props.novo(sc, 'escada', (e.x + M) * c, (e.y + M) * c, 1, false);
      t.name = (ORDEM_ANDAR(e.para) > ORDEM_ANDAR(andar.id) ? 'Escada que sobe: ' : 'Escada que desce: ') + S.nomeDoAndar(e.para);
      t.cena = S.cenaDoAndar(x.cla, x.pr.id, e.para);
      if (ORDEM_ANDAR(e.para) > ORDEM_ANDAR(andar.id)) t.rot = 180;
      tokens.push(marcar(t));
    }
    if (andar.id === 't' && pl.porta) {
      const [i, j] = dentroDa(pl.porta), t = Props.novo(sc, 'saida', (i + M) * c, (j + M) * c, 1, true);
      t.name = 'Saída: ' + (x.nomeFora || 'a sede'); t.cena = S.cenaDeFora(x.cla);
      tokens.push(marcar(t));
    }
    const noite = sc.tone === 'noite' || sc.tone === 'breu' || andar.id === 'p';
    if (noite) for (const q of andar.salas) lights.push(marcar({ id: uid('lz'), name: 'Luz do cômodo', x: (q.x + M + q.w / 2) * c, y: (q.y + M + q.h / 2) * c, bright: 1.5, dim: Math.max(3, Math.round(Math.max(q.w, q.h) * 0.8)), c: '#ffc77a', on: true }));
    return { walls, tokens, lights };
  }
  const ORDEM_ANDAR = id => { const i = (L() ? L().ANDARES : []).findIndex(([k]) => k === id); return i < 0 ? 1 : i; };

  /* ================= a cena de fora ================= */
  const PAL_PADRAO = { base: '#4b5b40', manchas: ['#3d4c35', '#56693f', '#445637'], fios: ['#6c7f4e', '#33412b'], rua: ['#5c5140', '#7a6950', '#8c7a5d'] };
  const paleta = ter => (typeof Vila !== 'undefined' && Vila.PAL && (Vila.PAL[ter] || Vila.PAL.campo)) || PAL_PADRAO;
  function pintarFora(sede, c, seed) {
    const S = L(), ter = S.terrenoDe(sede), pal = paleta(ter), est = Estilos.valido(sede.estilo);
    const W = sede.W * c, H = sede.H * c, cv = document.createElement('canvas'); cv.width = Math.round(W); cv.height = Math.round(H);
    const g = cv.getContext('2d'), rnd = mulberry(((seed >>> 0) ^ 0x5bd1e995) >>> 0 || 7);
    // o chão (as manchas e os fiapos de capim, como no vilarejo)
    g.fillStyle = pal.base; g.fillRect(0, 0, W, H);
    for (let i = 0, n = Math.round(sede.W * sede.H * 0.9); i < n; i++) {
      const rr = (0.45 + rnd() * 1.4) * c;
      g.globalAlpha = 0.1 + rnd() * 0.14; g.fillStyle = pal.manchas[i % pal.manchas.length];
      g.beginPath(); g.ellipse(rnd() * W, rnd() * H, rr, rr * (0.5 + rnd() * 0.6), rnd() * Math.PI, 0, TAU); g.fill();
    }
    g.globalAlpha = ter === 'neve' ? 0.22 : 0.3; g.lineWidth = Math.max(1, c * 0.024); g.lineCap = 'round';
    for (let i = 0, n = Math.round(sede.W * sede.H * (ter === 'areia' ? 0.6 : ter === 'neve' ? 1.2 : 3)); i < n; i++) {
      const x = rnd() * W, y = rnd() * H, a = -Math.PI / 2 + (rnd() - 0.5) * 0.9, l = c * (0.06 + rnd() * 0.1);
      g.strokeStyle = pal.fios[i % 2]; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    g.globalAlpha = 1;
    const linha = pts => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); };
    // os jardins (o canteiro mais verde, com a borda de pedrinhas)
    for (const e of sede.estruturas) if (e.k === 'jardim') {
      g.fillStyle = ter === 'neve' ? '#c9d3cc' : ter === 'areia' ? '#8a9a52' : '#3f6a34'; g.fillRect(e.x * c, e.y * c, e.w * c, e.h * c);
      for (let i = 0; i < e.w * e.h * 3; i++) { g.globalAlpha = 0.35; g.fillStyle = rnd() < 0.5 ? '#5f8a4a' : '#2f5428'; g.beginPath(); g.arc((e.x + rnd() * e.w) * c, (e.y + rnd() * e.h) * c, c * (0.1 + rnd() * 0.2), 0, TAU); g.fill(); }
      g.globalAlpha = 1; g.strokeStyle = '#8d8a80'; g.lineWidth = Math.max(2, c * 0.12); g.strokeRect(e.x * c, e.y * c, e.w * c, e.h * c);
    }
    // as estradas (de terra batida, com a borda mais escura)
    g.lineJoin = 'round'; g.lineCap = 'round';
    for (const e of sede.estruturas) if (e.k === 'estrada') {
      const lw = S.ESTRUTURAS.estrada.larg * c;
      linha(e.pts); g.strokeStyle = pal.rua[0]; g.lineWidth = lw + c * 0.3; g.stroke();
      linha(e.pts); g.strokeStyle = pal.rua[1]; g.lineWidth = lw; g.stroke();
      g.globalAlpha = 0.5; linha(e.pts); g.strokeStyle = pal.rua[2]; g.lineWidth = lw * 0.35; g.stroke(); g.globalAlpha = 1;
    }
    // os prédios: o telhado (com a sombra) e a porta, na beira
    sede.predios.forEach((pr, n) => {
      const pl = pr.planta, t = pl.andares.find(a => a.id === 't') || pl.andares[0];
      const area = t.salas.reduce((s, q) => s + q.w * q.h, 0), cheio = pl.forma === 'oct' || area >= pl.W * pl.H;
      const pedacos = cheio ? [{ x: pr.x, y: pr.y, w: pl.W, h: pl.H, forma: pl.forma, corte: pl.corte || 2 }] : t.salas.map(q => ({ x: pr.x + q.x, y: pr.y + q.y, w: q.w, h: q.h, forma: 'ret' }));
      for (const k of pedacos) Estilos.telhado(g, Object.assign(k, { tipo: TIPO_TELHADO[pr.tipo] || 'casa' }), c, rnd, est, (hashStr(pr.id) + n) % 997);
      if (pl.porta) {
        const p = desloca(pl.porta, pr.x, pr.y), horiz = p.y1 === p.y2;
        g.fillStyle = '#4a2c15'; g.strokeStyle = 'rgba(14,10,6,0.85)'; g.lineWidth = Math.max(1, c * 0.04);
        const r = horiz ? [p.x1 * c + c * 0.08, p.y1 * c - c * 0.14, (p.x2 - p.x1) * c - c * 0.16, c * 0.28] : [p.x1 * c - c * 0.14, p.y1 * c + c * 0.08, c * 0.28, (p.y2 - p.y1) * c - c * 0.16];
        g.fillRect(...r); g.strokeRect(...r);
      }
    });
    // a muralha (pedra, grossa, com as ameias) e os portões (as duas torrinhas e o portão de madeira)
    for (const e of sede.estruturas) if (e.k === 'muralha') {
      const lw = S.ESTRUTURAS.muralha.larg * c;
      g.lineCap = 'square';
      linha(e.pts); g.strokeStyle = 'rgba(0,0,0,0.38)'; g.save(); g.translate(c * 0.22, c * 0.28); g.lineWidth = lw; g.stroke(); g.restore();
      linha(e.pts); g.strokeStyle = '#6f727a'; g.lineWidth = lw; g.stroke();
      linha(e.pts); g.strokeStyle = '#9a9ea6'; g.lineWidth = lw * 0.55; g.setLineDash([c * 0.32, c * 0.22]); g.stroke(); g.setLineDash([]);
    }
    for (const e of sede.estruturas) if (e.k === 'portao') {
      const b = S.caixaDe(e), deitado = b.w >= b.h;
      g.fillStyle = '#5a3a1e'; g.fillRect(b.x * c + (deitado ? c : 0), b.y * c + (deitado ? 0 : c), deitado ? (b.w - 2) * c : b.w * c, deitado ? b.h * c : (b.h - 2) * c);
      g.strokeStyle = '#2e1a0b'; g.lineWidth = Math.max(1, c * 0.05);
      for (let k = 1; k < 4; k++) { g.beginPath(); if (deitado) { g.moveTo(b.x * c + c + k * (b.w - 2) * c / 4, b.y * c); g.lineTo(b.x * c + c + k * (b.w - 2) * c / 4, (b.y + b.h) * c); } else { g.moveTo(b.x * c, b.y * c + c + k * (b.h - 2) * c / 4); g.lineTo((b.x + b.w) * c, b.y * c + c + k * (b.h - 2) * c / 4); } g.stroke(); }
      for (const [tx, ty] of deitado ? [[b.x, b.y], [b.x + b.w - 1, b.y]] : [[b.x, b.y], [b.x, b.y + b.h - 1]]) {
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(tx * c + c * 0.2, ty * c + c * 0.25, c, c);
        g.fillStyle = '#7a7e86'; g.fillRect(tx * c, ty * c, c, c); g.strokeStyle = '#3d4047'; g.strokeRect(tx * c, ty * c, c, c);
      }
    }
    return cv;
  }
  // um trecho de linha (a, b) sem o que cai dentro das caixas (os portões cortam a muralha): os pedaços que sobram
  function cortar(a, b, caixas) {
    let pedacos = [[0, 1]];
    for (const q of caixas) {
      // Liang–Barsky: o trecho [t0, t1] da linha dentro da caixa
      const dx = b[0] - a[0], dy = b[1] - a[1], p = [-dx, dx, -dy, dy], qq = [a[0] - q.x, q.x + q.w - a[0], a[1] - q.y, q.y + q.h - a[1]];
      let t0 = 0, t1 = 1, ok = true;
      for (let i = 0; i < 4 && ok; i++) {
        if (p[i] === 0) { if (qq[i] < 0) ok = false; continue; }
        const r = qq[i] / p[i];
        if (p[i] < 0) { if (r > t1) ok = false; else if (r > t0) t0 = r; } else { if (r < t0) ok = false; else if (r < t1) t1 = r; }
      }
      if (!ok || t1 <= t0) continue;
      const novo = [];
      for (const [u0, u1] of pedacos) { if (t1 <= u0 || t0 >= u1) { novo.push([u0, u1]); continue; } if (t0 > u0) novo.push([u0, t0]); if (t1 < u1) novo.push([t1, u1]); }
      pedacos = novo;
    }
    return pedacos.filter(([u0, u1]) => u1 - u0 > 1e-6).map(([u0, u1]) => [[a[0] + (b[0] - a[0]) * u0, a[1] + (b[1] - a[1]) * u0], [a[0] + (b[0] - a[0]) * u1, a[1] + (b[1] - a[1]) * u1]]);
  }
  function conteudoDeFora(sc, sede, cla) {
    const S = L(), c = sc.cell, walls = [], tokens = [], lights = [];
    const add = (x1, y1, x2, y2, k) => walls.push(marcar({ id: uid('wl'), k, x1: x1 * c, y1: y1 * c, x2: x2 * c, y2: y2 * c, open: false, locked: false }));
    const rnd = mulberry((hashStr(cla) ^ 0x1b873593) >>> 0 || 5);
    // os prédios: as paredes de fora (a porta de entrada, fechada) e a Entrada, do lado de fora da porta
    for (const pr of sede.predios) {
      const pl = pr.planta, t = pl.andares.find(a => a.id === 't') || pl.andares[0];
      if (pl.forma === 'oct') for (const s of Estilos.paredesDaCasa({ x: pr.x, y: pr.y, w: pl.W, h: pl.H, forma: 'oct', corte: pl.corte || 2, porta: desloca(pl.porta, pr.x, pr.y), janelas: [] })) add(s.x1, s.y1, s.x2, s.y2, s.k === 'window' ? 'wall' : s.k || 'wall');
      else for (const s of S.paredes(t, pl.W, pl.H)) if (s.fora) add(s.x1 + pr.x, s.y1 + pr.y, s.x2 + pr.x, s.y2 + pr.y, s.k === 'window' ? 'wall' : s.k);
      if (pl.porta) {
        const [i, j] = foraDa(pl.porta), tk = Props.novo(sc, 'entrada', clamp(pr.x + i, 0, sede.W - 1) * c, clamp(pr.y + j, 0, sede.H - 1) * c, 1, true);
        tk.name = 'Entrada: ' + pr.nome; tk.cena = S.cenaDoAndar(cla, pr.id, t.id);
        tokens.push(marcar(tk));
      }
    }
    // a muralha (cortada pelos portões) e os portões (fechados)
    const portoes = sede.estruturas.filter(e => e.k === 'portao').map(e => S.caixaDe(e));
    // (o portão corta a muralha que passa por ele ou rente a ele: a caixa, meio quadrado mais larga para cada lado)
    const cortes = portoes.map(b => ({ x: b.x - 0.5, y: b.y - 0.5, w: b.w + 1, h: b.h + 1 }));
    for (const e of sede.estruturas) if (e.k === 'muralha') for (let k = 1; k < e.pts.length; k++) for (const [a, b] of cortar(e.pts[k - 1], e.pts[k], cortes)) add(a[0], a[1], b[0], b[1], 'wall');
    for (const b of portoes) { if (b.w >= b.h) add(b.x + 1, b.y + b.h / 2, b.x + b.w - 1, b.y + b.h / 2, 'door'); else add(b.x + b.w / 2, b.y + 1, b.x + b.w / 2, b.y + b.h - 1, 'door'); }
    // o poço e as plantas dos jardins
    for (const e of sede.estruturas) {
      if (e.k === 'poco' && Props.P.poco) tokens.push(marcar(Props.novo(sc, 'poco', e.x * c, e.y * c, 2, false)));
      if (e.k === 'jardim') {
        const n = Math.max(1, Math.round(e.w * e.h / 3)), ocup = new Set();
        for (let i = 0; i < n * 3 && ocup.size < n; i++) {
          const x = e.x + Math.floor(rnd() * e.w), y = e.y + Math.floor(rnd() * e.h);
          if (ocup.has(x + ',' + y)) continue;
          ocup.add(x + ',' + y);
          const id = rnd() < 0.6 ? 'flores' : 'arbusto';
          if (Props.P[id]) tokens.push(marcar(Props.novo(sc, id, x * c, y * c, 1, false)));
        }
      }
    }
    return { walls, tokens, lights };
  }

  /* ================= montar e atualizar ================= */
  // tira o que a Sede tinha posto e põe o novo (o resto da cena fica)
  function trocar(sc, novo) {
    sc.walls = sc.walls.filter(w => !w.sede).concat(novo.walls);
    sc.tokens = sc.tokens.filter(t => !t.sede).concat(novo.tokens);
    sc.lights = sc.lights.filter(l => !l.sede).concat(novo.lights);
    const fica = new Set(sc.tokens.map(t => t.id));
    sc.turn.list = sc.turn.list.filter(e => !e.token || fica.has(e.token));
  }
  const copia = x => JSON.parse(JSON.stringify(x));
  // o pedido (da aba Clã), conferido: { cla, nome, sede, ir }
  function pedidoValido(p) {
    const S = L();
    if (!S || !p || typeof p !== 'object') return null;
    const cla = idOk(p.cla);
    if (!cla) return null;
    return { cla, nome: String(p.nome || '').replace(/\s+/g, ' ').trim().slice(0, 50) || 'o clã', sede: S.normSede(p.sede), ir: typeof p.ir === 'string' ? p.ir : 'fora' };
  }
  // as cenas da sede: [{ id, nome, fora? , pr?, andar? }]
  function plano(p) {
    const S = L(), out = [{ id: S.cenaDeFora(p.cla), nome: 'Sede de ' + p.nome, fora: true }];
    for (const pr of p.sede.predios) for (const a of pr.planta.andares) out.push({ id: S.cenaDoAndar(p.cla, pr.id, a.id), nome: pr.nome + ' — ' + S.nomeDoAndar(a.id), pr, andar: a, cla: p.cla, nomeFora: 'Sede de ' + p.nome });
    return out;
  }
  async function montar(x, p, existente, fora) {
    const S = L(), sc = existente || newScene(x.nome);
    if (!existente) { sc.id = x.id; sc.fog.dynamic = !x.fora; sc.fog.explored = true; if (fora) { sc.tone = fora.tone; sc.light = fora.light; } }
    sc.name = x.nome;
    sc.bg.stretch = true; sc.bg.dx = 0; sc.bg.dy = 0; sc.bg.scale = 1;
    if (x.fora) {
      sc.cols = p.sede.W; sc.rows = p.sede.H;
      sc.bgColor = paleta(S.terrenoDe(p.sede)).base;
      const res = Math.max(16, Math.min(64, Math.floor(Math.sqrt(11e6 / (p.sede.W * p.sede.H)))));
      try { const cv = pintarFora(p.sede, res, hashStr(p.cla)); const a = await Assets.fromCanvas(cv, 'bg', sc.name); sc.bg.asset = a.id; } catch (e) { console.error(e); }
      trocar(sc, conteudoDeFora(sc, p.sede, p.cla));
    } else {
      const pl = x.pr.planta;
      sc.cols = pl.W + 2 * M; sc.rows = pl.H + 2 * M;
      sc.bgColor = '#16130f';
      try { const cv = pintarAndar(pl, x.andar, sc.cell, p.sede.estilo, hashStr(x.id)); const a = await Assets.fromCanvas(cv, 'bg', sc.name); sc.bg.asset = a.id; } catch (e) { console.error(e); }
      trocar(sc, conteudoDoAndar(sc, x, x.andar));
    }
    normalizeScene(sc);
    return sc;
  }
  let ocupado = false;
  async function aplicar(pedido) {
    const p = pedidoValido(pedido);
    if (!p || !isGM() || ocupado) return null;
    const S = L(), lista = plano(p), velhas = lista.filter(x => Store.S.scenes[x.id]), novas = lista.filter(x => !Store.S.scenes[x.id]);
    const pre = 'sede-' + p.cla + '-', orfas = Store.S.order.filter(id => id.startsWith(pre) && !lista.some(x => x.id === id));
    const ir = () => {
      const alvo = p.ir === 'fora' ? lista[0] : lista.find(x => x.pr && x.pr.id === p.ir && x.andar.id === 't') || lista.find(x => x.pr && x.pr.id === p.ir) || lista[0];
      if (alvo && Store.S.scenes[alvo.id] && Store.S.current !== alvo.id) UI.switchScene(alvo.id);
    };
    const fazer = async () => {
      ocupado = true;
      const antes = new Map(velhas.map(x => [x.id, copia(Store.S.scenes[x.id])])), criadas = [];
      try {
        const foraId = lista[0].id;
        for (const x of lista) {
          const ex = Store.S.scenes[x.id] || null, fora = Store.S.scenes[foraId] || null;
          const sc = await montar(x, p, ex, x.fora ? null : fora);
          if (!ex) { Store.addScene(sc); criadas.push(sc.id); }
          Persist.scene(sc.id);
          if (!x.fora && !ex) { UI.porNaFamilia(sc.id, foraId); UI.herdarCampanha(sc.id, foraId); }
        }
        Persist.meta(); Store.meta();
        UI.renderAll();
      } finally { ocupado = false; }
      ir();
      const n = criadas.length, m = velhas.length;
      UI.toast((n ? n + (n === 1 ? ' cena nova' : ' cenas novas') : '') + (n && m ? ' e ' : '') + (m ? m + (m === 1 ? ' atualizada' : ' atualizadas') : '') + ' da Sede de ' + p.nome + '.', {
        long: true, action: 'Desfazer', run: () => {
          for (const [id, sc] of antes) { Store.S.scenes[id] = sc; Persist.scene(id); }
          for (const id of criadas) { if (Store.S.current === id) Store.setCurrent(antes.size ? [...antes.keys()][0] : Store.S.order.find(x => !criadas.includes(x))); Store.removeScene(id); Persist.removeScene(id); }
          Persist.meta(); Store.meta(); UI.renderAll();
          UI.toast('As cenas da Sede voltaram como estavam.');
        },
      });
      return { criadas, atualizadas: velhas.map(x => x.id) };
    };
    if (!velhas.length) return fazer();
    // atualizar: a janela diz antes o que muda e o que fica
    return new Promise(res => UI.modal({
      title: 'Atualizar as cenas da Sede?',
      body: h('div', null,
        h('p', { class: 'modal-p', text: (novas.length ? novas.length + (novas.length === 1 ? ' cena nova e ' : ' cenas novas e ') : '') + velhas.length + (velhas.length === 1 ? ' cena que já existe vai' : ' cenas que já existem vão') + ' mudar: as paredes, o chão e os móveis que a Sede desenhou.' }),
        h('p', { class: 'note', text: 'Os tokens, a névoa, as luzes e o que você desenhou à mão ficam como estão. Depois, o aviso tem Desfazer.' }),
        orfas.length ? h('p', { class: 'note', text: orfas.length + (orfas.length === 1 ? ' cena de um prédio que saiu da sede fica' : ' cenas de prédios que saíram da sede ficam') + ' como está (apague se não quiser mais).' }) : null),
      onCancel: () => res(null),
      actions: [{ label: 'Cancelar', run: () => res(null) }, { label: 'Atualizar', kind: 'primary', run: () => { fazer().then(res, e => { console.error(e); UI.toast('Não deu para montar as cenas da Sede.'); res(null); }); } }],
    }));
  }
  return { aplicar, pintarAndar, pintarFora, paredesDoAndar, conteudoDoAndar, conteudoDeFora, plano, cortar, M };
})();
