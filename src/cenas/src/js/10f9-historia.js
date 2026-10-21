/* ---------------------------------------------------------------
   10f9. A HISTÓRIA DO LUGAR E OS ACHADOS RAROS (lote 13, parte 13c)
   Para a Região livre e o Encontro. A história (caixas na janela; várias juntas): o que aconteceu ali antes, cada uma
   com as marcas dela, longe do meio da situação e do caminho:
   · Batalha antiga: as armas enferrujadas (as espadas, as lanças, os machados, os escudos, os elmos), os ossos de quem
     caiu, o túmulo e o estandarte rasgado;
   · Acampamento abandonado: a fogueira fria, a tenda rasgada, os caixotes, o barril e o tronco de sentar;
   · Incêndio: o chão queimado com as cinzas, as árvores carbonizadas e os tocos;
   · Ruínas pequenas: o alicerce com os pedaços de parede (de pé, tapando a visão; baixos, deixando ver; caídos, só o
     entulho), o chão de lajes, a coluna caída.
   O achado raro (a semente decide, uma em cada quatro cenas): um baú, um altar, uma árvore antiga, uma pedra rúnica ou
   um esqueleto com uma bolsa, num canto longe do meio. Cada marca da história e o achado ganham o marcador oculto do
   mestre, com o nome do que é.
   Tudo entra depois da vegetação e dos enfeites, com o sorteio dele: só a área da história (ou do achado) muda — as
   árvores, as pedrinhas e os enfeites que estavam ali saem —, e o resto do lugar fica igual.
   --------------------------------------------------------------- */
const Historia = (() => {
  const TAU = Math.PI * 2, MO = Encontro.motor;
  const LISTA = [['batalha', 'Batalha antiga', 'As armas enferrujadas, os ossos de quem caiu, o túmulo e o estandarte rasgado'],
    ['acampamento', 'Acampamento abandonado', 'A fogueira fria, a tenda rasgada e o que ficou para trás'],
    ['incendio', 'Incêndio', 'O chão queimado, as árvores carbonizadas e os tocos'],
    ['ruinas', 'Ruínas pequenas', 'O alicerce com os pedaços de parede, o chão de lajes e a coluna caída']];
  const NOME = { batalha: 'Batalha antiga', acampamento: 'Acampamento abandonado', incendio: 'Incêndio antigo', ruinas: 'Ruínas pequenas' };
  const ACHADOS = { bau: 'Baú escondido', altar: 'Altar esquecido', arvore: 'Árvore antiga', runa: 'Pedra rúnica', esqueleto: 'Esqueleto com uma bolsa' };
  const valida = v => (Array.isArray(v) ? LISTA.map(x => x[0]).filter(k => v.includes(k)) : []);
  // a pedra das ruínas pequenas, pelo chão: [clara, média, escura, a junta]
  const PEDRA = { areia: ['#d8be92', '#bea276', '#957b56', '#6c573a'], savana: ['#cdb68e', '#b39a72', '#8a7454', '#5e4e38'], canion: ['#d3a27a', '#b5835c', '#8a5e3e', '#5e3e28'],
    neve: ['#cdd1d5', '#adb2b7', '#868b91', '#5f6369'], tundra: ['#c4c9c4', '#a3a9a3', '#7c827c', '#565b56'] };
  const pedraDe = pal => PEDRA[pal] || ['#b1ab9f', '#938d82', '#6f6a61', '#4a463f'];
  // a árvore antiga de cada chão
  const ANTIGA = { savana: 'acacia', selva: 'selva', pantano: 'mangue', neve: 'pinheiro', tundra: 'pinheiro', rocha: 'pinheiro', areia: 'morta', canion: 'morta', corrompida: 'morta', basalto: 'morta' };
  const tirar = (arr, f) => { for (let i = arr.length - 1; i >= 0; i--) if (f(arr[i], i)) arr.splice(i, 1); };
  // um objeto perto de (x, y), no raio rr, pelo sorteio da história (o do lugar fica como está)
  const perto = (K, rnd, id, x, y, rr, ok) => { for (let k = 0; k < 30; k++) { const an = rnd() * TAU, d = rnd() * rr; if (K.objeto(id, Math.floor(x + Math.cos(an) * d), Math.floor(y + Math.sin(an) * d), Math.floor(rnd() * 4) * 90, ok)) return true; } return false; };

  /* O que havia antes da vegetação (a grade e quantas árvores, pedras e objetos), para saber o que pode sair. */
  const antes = K => ({ occ: Uint8Array.from(K.occ), arv: K.P.arvores.length, roc: K.P.rochas.length, obj: K.P.objetos.length });

  /* A história e o achado num lugar já com a vegetação. A: o que havia antes dela (antes(K)); op: { historia, seed (o do
     achado), evitar: [[x, y, r]] (o meio da situação, os pontos de interesse, a chegada), longe (a distância do meio,
     em quadrados) }. */
  function noLugar(K, A, op) {
    const { W, H, P } = K, hist = valida(op.historia), diag = Math.hypot(W, H);
    if ((P.cavernas && P.cavernas.length) || K.terreno === 'agua') return;   // (a gruta cobre o mapa; na água, o mar é o chão: não tem onde)
    const livre = (i, j) => i >= 0 && j >= 0 && i < W && j < H && A.occ[j * W + i] === 0 && (K.at(i, j) === 0 || K.at(i, j) === 4);
    const livreCirc = (x, y, rr) => { for (let j = Math.floor(y - rr); j <= Math.floor(y + rr); j++) for (let i = Math.floor(x - rr); i <= Math.floor(x + rr); i++) if (Math.hypot(i + 0.5 - x, j + 0.5 - y) <= rr && !livre(i, j)) return false; return true; };
    const evitar = (op.evitar || []).slice();
    const longe = (x, y, f) => evitar.every(([ex, ey, er]) => Math.hypot(x - ex, y - ey) >= er * f);
    // um lugar livre de raio rr, longe do que há para evitar (se não houver, cada vez mais perto)
    const lugar = (rnd, rr) => {
      for (const f of [1, 0.7, 0.45]) for (let k = 0; k < 160; k++) {
        const x = rr + 1 + rnd() * (W - 2 * rr - 2), y = rr + 1 + rnd() * (H - 2 * rr - 2);
        if (longe(x, y, f) && livreCirc(x, y, rr + 0.6)) return [x, y];
      }
      return null;
    };
    // a área sai limpa: as árvores, as pedrinhas e os enfeites que a vegetação pôs nela
    const limpar = dentro => {
      tirar(P.arvores, (a, i) => i >= A.arv && dentro(a.x, a.y));
      tirar(P.rochas, (r, i) => i >= A.roc && dentro(r.x, r.y));
      tirar(P.objetos, (o, i) => i >= A.obj && dentro(o.x + (o.s || 1) / 2, o.y + (o.s || 1) / 2));
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (A.occ[j * W + i] === 0 && K.at(i, j) === 4 && dentro(i + 0.5, j + 0.5)) K.pos(i, j, 0);
    };
    // (o marcador fica de pé ao lado; cx, cy: o meio da marca, e R: o tamanho dela)
    const marca = (lista, k, n, x, y, cx, cy, R) => { const [i, j] = MO.lugarDePe(K, x, y); lista.push({ k, n, x: i, y: j, cx: +cx.toFixed(2), cy: +cy.toFixed(2), R: +R.toFixed(2) }); };
    // (a história: as maiores primeiro, cada uma com o sorteio dela)
    if (hist.length) {
      P.historia = [];
      for (const k of ['ruinas', 'incendio', 'batalha', 'acampamento'].filter(x => hist.includes(x))) {
        const rH = mulberry((MO.sub(op.sT || 1, 140 + LISTA.findIndex(x => x[0] === k)) % 2147483000) + 1);
        // (sem lugar do tamanho de sempre, uma menor; sem nenhum, ela fica de fora — o resumo diz)
        const R0 = { ruinas: 3.4, incendio: 3.6, batalha: 2.8, acampamento: 2.4 }[k];
        let R = R0, l = null;
        for (const f of [1, 0.75, 0.55]) { R = R0 * f; l = lugar(rH, R); if (l) break; }
        if (!l) { (P.historiaFora = P.historiaFora || []).push(NOME[k]); continue; }
        const [x, y] = l;
        limpar((px, py) => Math.hypot(px - x, py - y) <= R + 0.8);
        FEITO[k](K, rH, x, y, R);
        marca(P.historia, k, NOME[k], x + 1.2, y + 0.4, x, y, R);
        evitar.push([x, y, R * 2 + 2]);
      }
      if (!P.historia.length) delete P.historia;
      if (P.historiaFora) P.historiaFora.sort((p, q) => Object.values(NOME).indexOf(p) - Object.values(NOME).indexOf(q));
    }
    // o achado raro: uma em cada quatro (a semente da cena decide), num canto longe do meio
    const rA = mulberry((MO.sub(op.seed || 1, 131) % 2147483000) + 1);
    if (op.achados && rA() < 0.25 && !P.aguaToda) {
      const tipos = Object.keys(ACHADOS), t = tipos[Math.floor(rA() * tipos.length) % tipos.length];
      evitar.push([W / 2, H / 2, diag * 0.3]);
      const l = lugar(rA, t === 'arvore' ? 2.2 : 1.3);
      if (l) {
        const [x, y] = l;
        limpar((px, py) => Math.hypot(px - x, py - y) <= (t === 'arvore' ? 2.6 : 1.8));
        const n = ACHADO[t](K, rA, x, y);
        if (n) { const lista = []; marca(lista, t, n, x + 1, y + 0.6, x, y, t === 'arvore' ? 2.6 : 1.8); P.achado = lista[0]; }
      }
    }
  }

  /* ================= cada história ================= */
  const FEITO = {
    // as armas no chão, os ossos, o túmulo e o estandarte
    batalha(K, rH, cx, cy, R) {
      const itens = [], tipos = ['espada', 'espada', 'espada', 'lanca', 'lanca', 'machado', 'escudo', 'elmo'];
      for (let k = 0, n = 7 + Math.floor(rH() * 4); k < 40 && itens.length < n; k++) {
        const an = rH() * TAU, d = Math.sqrt(rH()) * R, x = cx + Math.cos(an) * d, y = cy + Math.sin(an) * d;
        if (K.at(Math.floor(x), Math.floor(y)) !== 0 || itens.some(q => Math.hypot(q.x - x, q.y - y) < 0.7)) continue;
        itens.push({ x: +x.toFixed(2), y: +y.toFixed(2), ang: +(rH() * TAU).toFixed(2), t: tipos[Math.floor(rH() * tipos.length) % tipos.length] });
      }
      K.pinta(2, 'armasVelhas', { itens });
      for (let k = 0; k < 3; k++) { const an = rH() * TAU, d = R * (0.3 + rH() * 0.6), x = cx + Math.cos(an) * d, y = cy + Math.sin(an) * d; if (K.at(Math.floor(x), Math.floor(y)) === 0) K.pinta(2, 'ossos', { x, y, r: 0.55 }); }
      { const an = rH() * TAU, x = cx + Math.cos(an) * R * 0.6, y = cy + Math.sin(an) * R * 0.6; K.pinta(3, 'estandarteRasgado', { x, y, ang: rH() * TAU, cor: ['#7a2a22', '#2f4a6e', '#5a6a2e', '#6a4a7a'][Math.floor(rH() * 4) % 4] }); }
      K.marcaCirc(cx, cy, R, 5);
      K.objeto('tumulo', Math.floor(cx), Math.floor(cy), Math.floor(rH() * 4) * 90, v => v === 5);
    },
    // a fogueira fria, a tenda rasgada, os caixotes, o barril e o tronco
    acampamento(K, rH, cx, cy, R) {
      K.pinta(1, 'fogueiraApagada', { x: cx, y: cy });
      const an = rH() * TAU, tx = cx + Math.cos(an) * 1.7, ty = cy + Math.sin(an) * 1.7;
      K.pinta(2, 'tenda', { x: tx, y: ty, ang: an + Math.PI / 2 + (rH() - 0.5) * 0.4, l: 2.2, w: 1.6, cor: ['#9a8a6a', '#8a7a5e', '#a89878'][Math.floor(rH() * 3) % 3], rasgada: true });
      K.marcaCirc(cx, cy, R, 5);
      for (const id of ['caixote', 'barril', 'caixote', 'tronco']) perto(K, rH, id, cx, cy, R * 0.9, v => v === 5);
    },
    // o chão queimado, as árvores carbonizadas e os tocos
    incendio(K, rH, cx, cy, R) {
      const pts = MO.blob(rH, cx, cy, R, R * (0.72 + rH() * 0.2), 14, 0.32, rH() * TAU);
      K.mancha(pts, ['#2e2924', '#3a332c', '#24201c', '#46403a'], { pedrisco: ['#8a8580', '#1e1b18'] });
      K.marcaPoli(pts, 5);
      const arv = [];
      for (let k = 0, n = 4 + Math.floor(rH() * 4); k < 60 && arv.length < n; k++) {
        const x = cx + (rH() - 0.5) * 2 * R, y = cy + (rH() - 0.5) * 2 * R;
        if (!MO.dentroPoli(pts, x, y) || arv.some(q => Math.hypot(q[0] - x, q[1] - y) < 1.4)) continue;
        arv.push([x, y]); K.arvore(x, y, 0.7 + rH() * 0.35, 'queimada');
      }
      for (let k = 0; k < 2; k++) perto(K, rH, 'toco', cx, cy, R * 0.8, v => v === 5);
    },
    // o alicerce com os pedaços de parede, as lajes, o entulho e a coluna caída
    ruinas(K, rH, cx, cy) {
      const P = K.P, cores = pedraDe(K.pal), w = 4 + Math.floor(rH() * 3), h = 3 + Math.floor(rH() * 2), x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2);
      P.paredes = P.paredes || [];
      K.pinta(1, 'lajes', { x: x0, y: y0, w, h, cores, rachas: true });
      K.marcaPoli([[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], 5);
      const lados = [[[x0, y0], [x0 + w, y0]], [[x0 + w, y0], [x0 + w, y0 + h]], [[x0 + w, y0 + h], [x0, y0 + h]], [[x0, y0 + h], [x0, y0]]];
      const porta = Math.floor(rH() * 4) % 4;
      lados.forEach(([a, b], s) => {
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 1.8));
        for (let k = 0; k < n; k++) {
          const t0 = k / n, t1 = (k + 1) / n, p0 = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], p1 = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
          if (s === porta && k === Math.floor(n / 2)) continue;          // (a porta: a abertura no meio de um lado)
          const u = rH();
          if (u < 0.3) { K.pinta(2, 'entulhoRuina', { x: (p0[0] + p1[0]) / 2, y: (p0[1] + p1[1]) / 2, r: Math.max(0.7, L / n * 0.45), cores }); continue; }
          const pe = u < 0.68;
          P.paredes.push({ k: pe ? 'wall' : 'mureta', x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1] });
          K.pinta(2, 'paredeRuina', { a: p0, b: p1, esp: 0.45, alta: pe, cores });
          K.marcaLinha([p0, p1], 0.28, 3, true);
          if (pe) P.cobertura.push({ x: (p0[0] + p1[0]) / 2, y: (p0[1] + p1[1]) / 2, r: 0.7 });
        }
      });
      // a coluna caída, fora do alicerce, e o entulho em volta
      const ang = rH() * TAU, bx = cx + Math.cos(ang) * (Math.max(w, h) / 2 + 1.2), by = cy + Math.sin(ang) * (Math.max(w, h) / 2 + 1.2), angCai = ang + (rH() - 0.5) * 1.2, L = 2.6 + rH();
      if (K.dentro(bx + Math.cos(angCai) * L, by + Math.sin(angCai) * L, 1) && K.dentro(bx, by, 1)) {
        K.pinta(2, 'colunaCaida', { x: bx, y: by, ang: angCai, L, r: 0.42, cores, hera: false });
        K.marcaLinha([[bx, by], [bx + Math.cos(angCai) * L, by + Math.sin(angCai) * L]], 0.36, 4);
      }
      for (let k = 0; k < 3; k++) { const a2 = rH() * TAU, d = Math.max(w, h) / 2 + rH() * 1.5; K.pinta(1, 'entulhoRuina', { x: cx + Math.cos(a2) * d, y: cy + Math.sin(a2) * d, r: 0.45 + rH() * 0.3, cores }); }
    },
  };

  /* ================= cada achado ================= */
  const ACHADO = {
    bau: (K, rA, x, y) => (K.objeto('bau', Math.floor(x), Math.floor(y), Math.floor(rA() * 4) * 90, v => v === 0) ? ACHADOS.bau : null),
    altar: (K, rA, x, y) => (K.objeto('altar', Math.floor(x), Math.floor(y), Math.floor(rA() * 4) * 90, v => v === 0) ? ACHADOS.altar : null),
    runa: (K, rA, x, y) => (K.objeto('runa', Math.floor(x), Math.floor(y), 0, v => v === 0) ? ACHADOS.runa : null),
    arvore(K, rA, x, y) {
      if (K.pal === 'cristal') { K.cristalGrande(x, y, 1.4, 'azul'); return 'Cristal antigo'; }
      const esp = ANTIGA[K.pal] || 'folhosa', rr = esp === 'selva' ? 2.4 : esp === 'acacia' ? 2.2 : 2.0;
      K.arvore(x, y, rr, esp); K.P.cobertura.push({ x, y, r: Math.min(1.6, rr * 0.7) });
      return ACHADOS.arvore;
    },
    esqueleto(K, rA, x, y) {
      const ang = rA() * TAU;
      K.pinta(2, 'esqueleto', { x, y, ang });
      K.pinta(2, 'bolsa', { x: x + Math.cos(ang + 1.4) * 0.9, y: y + Math.sin(ang + 1.4) * 0.9, ang: rA() * TAU });
      K.marcaCirc(x, y, 1, 5);
      return ACHADOS.esqueleto;
    },
  };

  /* ================= o desenho ================= */
  const FERRUGEM = ['#8a5a3a', '#6e4a30', '#9a6a44'], FERRO = ['#8a8a86', '#6a6a66', '#4a4a46'], MAD = ['#6b4a2b', '#4e3420'];
  // as armas velhas no chão (cada uma: x, y, ang, t), enferrujadas, meio enterradas
  function armasVelhas(g, o, c) {
    g.save(); g.lineCap = 'round';
    c = c * 1.45;                                                    // (as armas um pouco maiores que o tamanho de verdade: para ver)
    for (const q of o.itens || []) {
      g.save(); g.translate(q.x * c / 1.45, q.y * c / 1.45); g.rotate(q.ang || 0);
      g.globalAlpha = 0.3; g.fillStyle = '#000'; g.beginPath(); g.ellipse(c * 0.04, c * 0.05, c * 0.42, c * 0.12, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
      if (q.t === 'escudo' || q.t === 'elmo') {
        const R = c * (q.t === 'escudo' ? 0.25 : 0.17);
        g.fillStyle = q.t === 'escudo' ? '#7a5a3a' : FERRO[1]; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
        g.strokeStyle = q.t === 'escudo' ? FERRO[1] : FERRUGEM[1]; g.lineWidth = Math.max(1, c * 0.045); g.stroke();
        if (q.t === 'escudo') { g.fillStyle = FERRUGEM[2]; g.beginPath(); g.arc(0, 0, R * 0.28, 0, TAU); g.fill(); g.strokeStyle = 'rgba(20,14,8,0.6)'; g.lineWidth = Math.max(1, c * 0.025); g.beginPath(); g.moveTo(-R * 0.9, -R * 0.2); g.lineTo(-R * 0.3, R * 0.1); g.stroke(); }
        else { g.fillStyle = 'rgba(20,14,8,0.7)'; g.fillRect(-R * 0.6, -R * 0.12, R * 1.2, R * 0.24); }
      } else if (q.t === 'lanca') {
        g.strokeStyle = MAD[0]; g.lineWidth = Math.max(1.5, c * 0.07); g.beginPath(); g.moveTo(-c * 0.55, 0); g.lineTo(c * 0.4, 0); g.stroke();
        g.fillStyle = '#9a9a92'; g.beginPath(); g.moveTo(c * 0.4, -c * 0.08); g.lineTo(c * 0.66, 0); g.lineTo(c * 0.4, c * 0.08); g.closePath(); g.fill();
        g.strokeStyle = FERRUGEM[0]; g.lineWidth = Math.max(1, c * 0.02); g.stroke();
      } else if (q.t === 'machado') {
        g.strokeStyle = MAD[1]; g.lineWidth = Math.max(1, c * 0.06); g.beginPath(); g.moveTo(-c * 0.35, 0); g.lineTo(c * 0.3, 0); g.stroke();
        g.fillStyle = FERRUGEM[1]; g.beginPath(); g.moveTo(c * 0.22, -c * 0.02); g.quadraticCurveTo(c * 0.32, -c * 0.24, c * 0.42, -c * 0.2); g.lineTo(c * 0.36, c * 0.04); g.closePath(); g.fill();
      } else {
        // a espada: a lâmina, a guarda e o cabo (às vezes quebrada)
        const L = c * (rLen(q) ? 0.42 : 0.6);
        g.strokeStyle = FERRO[2]; g.lineWidth = Math.max(1.5, c * 0.1); g.beginPath(); g.moveTo(-c * 0.1, 0); g.lineTo(L, 0); g.stroke();
        g.strokeStyle = '#b4b4ac'; g.lineWidth = Math.max(1, c * 0.06); g.beginPath(); g.moveTo(-c * 0.1, 0); g.lineTo(L, 0); g.stroke();
        g.strokeStyle = FERRUGEM[0]; g.lineWidth = Math.max(1, c * 0.025); g.beginPath(); g.moveTo(c * 0.05, 0); g.lineTo(L * 0.8, 0); g.stroke();
        g.strokeStyle = FERRUGEM[1]; g.lineWidth = Math.max(1, c * 0.05); g.beginPath(); g.moveTo(-c * 0.1, -c * 0.14); g.lineTo(-c * 0.1, c * 0.14); g.stroke();
        g.strokeStyle = MAD[1]; g.lineWidth = Math.max(1, c * 0.06); g.beginPath(); g.moveTo(-c * 0.1, 0); g.lineTo(-c * 0.3, 0); g.stroke();
      }
      g.restore();
    }
    g.restore();
  }
  const rLen = q => ((Math.round(q.x * 31 + q.y * 17) % 3) === 0);
  // o estandarte rasgado, caído: o mastro e o pano desbotado com os cortes
  function estandarteRasgado(g, o, c) {
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0); g.lineCap = 'round';
    g.globalAlpha = 0.3; g.fillStyle = '#000'; g.fillRect(-c * 0.9, -c * 0.05, c * 1.9, c * 0.5); g.globalAlpha = 1;
    g.strokeStyle = MAD[0]; g.lineWidth = Math.max(1.5, c * 0.07); g.beginPath(); g.moveTo(-c * 0.95, 0); g.lineTo(c * 0.95, 0); g.stroke();
    const cor = o.cor || '#7a2a22';
    g.fillStyle = Estilos.tom(cor, -0.1); g.globalAlpha = 0.92;
    g.beginPath(); g.moveTo(c * 0.2, 0); g.lineTo(c * 0.85, 0); g.lineTo(c * 0.8, c * 0.42); g.lineTo(c * 0.68, c * 0.3); g.lineTo(c * 0.56, c * 0.5); g.lineTo(c * 0.44, c * 0.32); g.lineTo(c * 0.3, c * 0.46); g.lineTo(c * 0.22, c * 0.28); g.closePath(); g.fill();
    g.globalAlpha = 0.7; g.strokeStyle = Estilos.tom(cor, 0.35); g.lineWidth = Math.max(1, c * 0.03); g.beginPath(); g.arc(c * 0.52, c * 0.17, c * 0.09, 0, TAU); g.stroke();
    g.restore();
  }
  // o esqueleto deitado (x, y: o meio; ang: da cabeça para os pés)
  function esqueleto(g, o, c) {
    const osso = '#e9e0c9', esc = '#8f8268';
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0); g.lineCap = 'round';
    g.globalAlpha = 0.25; g.fillStyle = '#000'; g.beginPath(); g.ellipse(c * 0.05, c * 0.06, c * 0.85, c * 0.32, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
    // a espinha, as costelas e a bacia
    g.strokeStyle = osso; g.lineWidth = Math.max(1, c * 0.05); g.beginPath(); g.moveTo(-c * 0.5, 0); g.lineTo(c * 0.2, 0); g.stroke();
    for (let k = 0; k < 4; k++) { const x = -c * (0.4 - k * 0.1); g.lineWidth = Math.max(1, c * 0.035); g.beginPath(); g.ellipse(x, 0, c * 0.05, c * 0.2, 0, -1.3, 1.3); g.stroke(); g.beginPath(); g.ellipse(x, 0, c * 0.05, c * 0.2, 0, Math.PI - 1.3, Math.PI + 1.3); g.stroke(); }
    g.fillStyle = osso; g.beginPath(); g.ellipse(c * 0.25, 0, c * 0.1, c * 0.16, 0, 0, TAU); g.fill();
    // os braços e as pernas
    Paisagem.ossinho(g, -c * 0.35, -c * 0.3, c * 0.34, 0.35, c); Paisagem.ossinho(g, -c * 0.32, c * 0.3, c * 0.34, -0.4, c);
    Paisagem.ossinho(g, c * 0.5, -c * 0.1, c * 0.42, 0.15, c); Paisagem.ossinho(g, c * 0.52, c * 0.12, c * 0.42, -0.25, c);
    // o crânio
    g.fillStyle = osso; g.beginPath(); g.arc(-c * 0.7, 0, c * 0.17, 0, TAU); g.fill(); g.strokeStyle = esc; g.lineWidth = Math.max(1, c * 0.02); g.stroke();
    g.fillStyle = '#3a3226'; for (const s of [-1, 1]) { g.beginPath(); g.arc(-c * 0.75, s * c * 0.06, c * 0.035, 0, TAU); g.fill(); }
    g.restore();
  }
  // a bolsa de couro, amarrada, com as moedas que escaparam
  function bolsa(g, o, c) {
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0);
    g.globalAlpha = 0.3; g.fillStyle = '#000'; g.beginPath(); g.ellipse(c * 0.04, c * 0.05, c * 0.24, c * 0.18, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
    g.fillStyle = '#7a5532'; g.beginPath(); g.ellipse(0, 0, c * 0.22, c * 0.17, 0, 0, TAU); g.fill();
    g.strokeStyle = '#4e3420'; g.lineWidth = Math.max(1, c * 0.03); g.stroke();
    g.fillStyle = '#9a7048'; g.beginPath(); g.ellipse(-c * 0.06, -c * 0.05, c * 0.09, c * 0.06, 0, 0, TAU); g.fill();
    g.strokeStyle = '#c9a45a'; g.lineWidth = Math.max(1, c * 0.025); g.beginPath(); g.moveTo(c * 0.16, -c * 0.1); g.lineTo(c * 0.26, -c * 0.16); g.stroke();
    g.fillStyle = '#e8c24a'; for (const [dx, dy] of [[0.3, 0.06], [0.36, 0.14], [0.27, 0.18]]) { g.beginPath(); g.arc(dx * c, dy * c, Math.max(1, c * 0.045), 0, TAU); g.fill(); }
    g.restore();
  }
  Object.assign(MO.PINTORES, { armasVelhas, estandarteRasgado, esqueleto, bolsa });

  /* ================= a janela ================= */
  // as caixas da história (várias juntas), no jeito das escolhas da janela
  function campo(st, kit, aoMudar, pre) {
    const sel = valida(st.historia);
    const caixas = h('div', { class: 'seg', role: 'group', id: pre + '-hist', 'aria-label': 'História do lugar (várias juntas)' }, LISTA.map(([k, n, dica]) => h('button', {
      type: 'button', class: 'seg-b' + (sel.includes(k) ? ' on' : ''), 'aria-pressed': String(sel.includes(k)), title: dica, 'data-hist': k,
      onclick: () => { st.historia = LISTA.map(x => x[0]).filter(x => (x === k ? !sel.includes(k) : sel.includes(x))); aoMudar(); },
    }, n)));
    return kit.field('História do lugar', caixas, 'stack');
  }
  // o que o resumo diz: a história e o achado (só o mestre vê o marcador)
  function texto(p) {
    const partes = [];
    if (p.historia && p.historia.length) partes.push('a história: ' + juntar(p.historia.map(q => q.n.toLowerCase())));
    if (p.historiaFora && p.historiaFora.length) partes.push('sem lugar para ' + juntar(p.historiaFora.map(n => n.toLowerCase())) + ' (a situação ocupa o mapa)');
    if (p.achado) partes.push('um achado raro (' + p.achado.n.toLowerCase() + ')');
    return partes;
  }
  const juntar = l => (l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]);
  return { LISTA, NOME, ACHADOS, valida, antes, noLugar, campo, texto };
})();
