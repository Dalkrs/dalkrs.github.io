/* ---------------------------------------------------------------
   10f7. REGIÃO LIVRE — uma área para explorar (lote 13, parte 13a)
   Uma aba da janela "Gerar um lugar…", feita com o motor dos biomas (Biomas.campo) e o dos encontros (Encontro.motor).
   Sem situação: a natureza aberta — o bioma principal com as manchas de um ou dois vizinhos (a Mistura: pouca, média
   ou muita), o rio que desce pelo relevo (ou o lago, ou nada), o mar na costa, os morros e os penhascos onde o chão
   sobe, o caminho (a trilha ou a estrada) com as pontes onde ele cruza a água, e os pontos de interesse sorteados (um
   no Pequeno, dois no Médio, três no Grande): a clareira com algo (o poço velho, a árvore antiga, o círculo de pedras),
   a entrada de gruta, o ninho ou a toca, o vau ou a ponte velha. Os marcadores da chegada e de cada ponto (com o nome
   do que há ali) nascem ocultos: só o mestre vê.
   O traçado (a água, o relevo, o caminho e os pontos) tem o sorteio dele: travá-lo deixa "Gerar outro" trocar só as
   árvores, as pedras e os enfeites. Nada muda nas cenas que já existem.
   --------------------------------------------------------------- */
const Regiao = (() => {
  const TAU = Math.PI * 2, MO = Encontro.motor, B = Biomas;
  const TAMANHOS = { pequeno: { n: 'Pequeno', W: 32, H: 24, pontos: 1 }, medio: { n: 'Médio', W: 40, H: 30, pontos: 2 }, grande: { n: 'Grande', W: 48, H: 36, pontos: 3 } };
  const AGUAS = [['surpresa', 'Surpresa', null, 'A semente escolhe: o rio, o rio que acaba num lago, só o lago ou nada'], ['rio', 'Rio'], ['lago', 'Lago'], ['nenhuma', 'Sem água']];
  const CAMINHOS = [['nenhum', 'Sem caminho'], ['trilha', 'Trilha'], ['estrada', 'Estrada']];
  // (lote 7, parte 5a) a seca do Mapa-múndi: o chão verde vira o capim seco
  const SECO = { campo: 'savana', floresta: 'savana', selva: 'savana', pantano: 'savana' };
  const hwDe = tipo => (tipo === 'estrada' ? 1.35 : 0.75);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const plural = (n, s, p) => n + ' ' + (n === 1 ? s : p || s + 's');
  const juntar = l => (l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]);

  /* ================= o plano (conta pura) ================= */
  // a trava: a semente do traçado; vale enquanto o bioma, o tamanho, a mistura, a água e o caminho forem os mesmos
  function limparTrava(t, o) {
    if (!t || typeof t !== 'object' || t.bioma !== o.bioma || t.tamanho !== o.tamanho || t.mistura !== o.mistura || t.agua !== o.agua || t.caminho !== o.caminho) return null;
    const s = Math.round(Number(t.s));
    return Number.isFinite(s) && s >= 1 && s <= 2147483647 ? { s } : null;
  }
  // a lava correndo: a zona de lava ao longo dela (só os pedaços dentro do mapa) e as luzes
  function lavaAoLongo(K, pts, hw) {
    const n = Math.max(3, Math.round(Paisagem.compr(pts) / 5));
    for (let k = 0; k < n; k++) {
      const a = Paisagem.aoLongo(pts, k / n), b = Paisagem.aoLongo(pts, (k + 1) / n), x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
      if (K.dentro(x, y, 0.5)) K.zona('lava', x, y, { k: 'rect', rw: Math.hypot(b.x - a.x, b.y - a.y) + 0.5, rh: hw * 2, dir: Math.round(Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI) });
    }
    for (let t = 0.1; t < 1; t += 0.2) { const q = Paisagem.aoLongo(pts, t); if (K.dentro(q.x, q.y, 0.5)) K.luz(q.x, q.y, 6, '#ff8a3a'); }
  }
  /* A travessia de um rio em (x, y), no sentido ang: o vau (as pedras de atravessar) no rio de água estreito; senão a
     ponte velha (o tronco, no riacho; a de pedra, na lava). → o nome do que ficou ali */
  function travessia(K, x, y, ang, hw, lava) {
    const P = K.P;
    if (!lava && hw <= 1.8 && K.rT() < 0.6) {
      const pedras = [];
      for (let t = -hw - 0.1; t <= hw + 0.15; t += 0.62) pedras.push([x + Math.cos(ang) * t, y + Math.sin(ang) * t]);
      K.pinta(1, 'pedras', { pts: pedras });
      for (const [px, py] of pedras) { K.marcaCirc(px, py, 0.45, 10, true); P.relevo.push({ t: 'plataforma', alt: 0.3, k: 'ell', x: px - 0.32, y: py - 0.25, w: 0.64, h: 0.5 }); }
      P.tracado.push({ k: 'linha', pts: pedras, hw: 0.4 });
      return 'Vau';
    }
    const mat = lava ? 'pedra' : hw <= 1.0 ? 'tronco' : null;
    K.ponte(x, y, hw * 2 + 1.6, lava ? 1.4 : mat === 'tronco' ? 0.85 : 1.2, ang, mat, lava ? 1 : 0.6);
    return lava ? 'Ponte de pedra velha' : mat === 'tronco' ? 'Tronco sobre o rio' : 'Ponte velha';
  }
  /* Os caminhos: de cada direção (as da rosa; sem elas, de um lado a outro), pelo caminho mais barato — subir custa, a
     água do rio custa (ele cruza onde é estreito, com a ponte), o lago, o mar e o penhasco não deixam. O primeiro vai de
     uma direção à outra; os outros, até ele. As pontes ficam onde ele cruza o rio (até quantas foram pedidas); o vau
     pedido fica no primeiro cruzamento. → { pontes } */
  function poeCaminhos(K, F, T8, tipo, vau, sT, doHex) {
    const { W, H, P } = K, N = W * H, hw = hwDe(tipo), alt = F.alt, conta = { pontes: 0 };
    const lagos = F.lagos.map(l => l.pts), naLago = (x, y) => F.ehMar(x, y) || lagos.some(l => Tracado.dentro(l, x, y));
    // as casas do rio (dá para cruzar); as outras de água (o lago, o mar) não
    const noRio = new Uint8Array(N);
    for (const a of P.aguas) if (a.k === 'rio') for (let k = 0; k < a.pts.length; k += 2) {
      const [x, y] = a.pts[k], rr = a.hw + 0.4;
      for (let j = Math.max(0, Math.floor(y - rr)); j <= Math.min(H - 1, Math.floor(y + rr)); j++) for (let i = Math.max(0, Math.floor(x - rr)); i <= Math.min(W - 1, Math.floor(x + rr)); i++)
        if (Math.hypot(i + 0.5 - x, j + 0.5 - y) <= rr && !naLago(i + 0.5, j + 0.5)) noRio[j * W + i] = 1;
    }
    const passa = q => { const v = K.occ[q]; return !(v === 3 || v === 7 || v === 8 || (v === 2 && !noRio[q])); };
    const nz = Tracado.ruido(MO.sub(sT, 46));
    const custo = (q, m, L) => {
      if (!passa(m)) return Infinity;
      const v = K.occ[m];
      let c = 1 + 12 * Math.abs(alt[m] - alt[q]) + 1.6 * nz((m % W) / 5, Math.floor(m / W) / 5);
      if (noRio[m]) c += 6;
      if (v === 5) c += 2;
      { const x = m % W + 0.5, y = Math.floor(m / W) + 0.5; if (Math.min(x, y, W - x, H - y) < 2) c += 1.5; }   // (não corre junto da borda)
      if (v === 6) c += 3.5;          // (lote 54: o caminho contorna o planalto, a duna e a neve funda, em vez de subir neles)
      return L * c;
    };
    const R = Math.max(3, Math.min(W, H) * 0.25);
    const naBorda = q => { const i = q % W, j = (q - i) / W; return i === 0 || j === 0 || i === W - 1 || j === H - 1; };
    const bordaPerto = id => {
      const p = Tracado.naBorda(id, W, H, 0, 0), out = [];
      for (let q = 0; q < N; q++) { if (!naBorda(q) || !passa(q) || noRio[q] || K.occ[q] === 5) continue; const d = Math.hypot(q % W + 0.5 - p[0], Math.floor(q / W) + 0.5 - p[1]); if (d <= R) out.push([d, q]); }
      return out.sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[1]);
    };
    const rios = () => P.aguas.filter(a => a.k === 'rio').map(a => ({ pts: a.pts, hw: a.hw, tipo: a.tipo }));
    const noCaminho = new Set();
    // (o caminho serpenteia de leve; se a curva passar pela água parada ou pela pedra, fica o rumo de antes)
    const cabe = linha => linha.every(([x, y]) => !K.dentro(x, y, 0.01) || passa(Math.min(H - 1, Math.floor(y)) * W + Math.min(W - 1, Math.floor(x))));
    let nCam = 0;
    // (lote 14, parte 14a: tipoC — o tipo deste caminho, quando não é o de todos; pI e pF — as pontas exatas do hexágono)
    const umCaminho = (cel, ini, fim, tipoC, pI, pF) => {
      const tp = tipoC || tipo, hwc = tipoC ? hwDe(tipoC) : hw;
      let pts = B.linhaDe(W, cel, ini, fim);
      const sr = MO.sub(sT, 47 + nCam++);
      for (const amp of [2.2, 1.3, 0.7]) { const ser = B.serpentear(pts, 4, mulberry((sr % 2147483000) + 1), amp, []); if (cabe(ser)) { pts = ser; break; } }
      if (pI || pF) pts = B.prenderPontas(pts, W, H, pI || null, pF || null);
      const n = pts.length, ctrl = pts.filter((_, i) => i % 3 === 0 || i === n - 1 || (pI && i === 1) || (pF && i === n - 2)), linha = MO.curva(ctrl), rs = rios();
      for (const q of rs.length ? Tracado.cruzamentos(linha, { rios: rs, lago: null }) : []) {
        if (naLago(q.x, q.y) || !K.dentro(q.x, q.y, 0)) continue;
        if (P.pintados.some(o => (o.k === 'ponte' && Math.hypot(o.x - q.x, o.y - q.y) < (o.comp || 2) / 2 + 2) || (o.k === 'pedras' && o.pts.some(pq => Math.hypot(pq[0] - q.x, pq[1] - q.y) < 2)))) continue;
        if (vau && vau.quer && !vau.feito && K.dentro(q.x, q.y, 3)) { vau.feito = { x: q.x, y: q.y, ang: q.ang, hw: q.rio.hw, nome: travessia(K, q.x, q.y, q.ang, q.rio.hw, q.rio.tipo === 'lava') }; continue; }
        if (T8.pontes != null && conta.pontes >= T8.pontes) continue;
        K.ponte(q.x, q.y, q.rio.hw * 2 + 1.6, hwc * 2 + 0.5, q.ang, q.rio.tipo === 'lava' ? 'pedra' : null, 1);
        conta.pontes++;
      }
      K.poeCaminho(ctrl, tp);
      for (const q of cel) noCaminho.add(q);
    };
    /* (lote 14, parte 14a) Os caminhos do hexágono: cada um vai da ponta dele na borda à outra (ou ao ponto onde ele acaba,
       ali dentro), pelo mais barato — os que atravessam primeiro, a estrada antes; o caminho que já existe sai mais
       barato (eles se juntam onde passam perto). A ponta que cai na água ou na pedra começa na casa livre mais perto. */
    if (doHex) {
      const livre = c0 => { if (passa(c0) && !noRio[c0]) return c0; let m = -1, dm = Infinity; const i0 = c0 % W, j0 = (c0 - i0) / W; for (let q = 0; q < N; q++) { if (!passa(q) || noRio[q]) continue; const d = Math.hypot(q % W - i0, Math.floor(q / W) - j0); if (d < dm) { dm = d; m = q; } } return m; };
      const barato = (q, m, L) => { const c = custo(q, m, L); return K.occ[m] === 1 ? c * 0.55 : c; };
      const ordem = doHex.filter(c => c.ini.borda || c.fim.borda).sort((a, b) => (b.ini.borda && b.fim.borda) - (a.ini.borda && a.fim.borda) || (b.t === 'estrada') - (a.t === 'estrada'));
      for (const c of ordem) {
        const [p, q2] = c.ini.borda ? [c.ini, c.fim] : [c.fim, c.ini], a = livre(p.cel), b = livre(q2.cel);
        if (a < 0 || b < 0 || a === b) continue;
        const cel = B.maisBarato(W, H, [a], x => x === b, barato);
        if (!cel || cel.length < 3) continue;
        const exA = a === p.cel, exB = q2.borda && b === q2.cel;
        umCaminho(cel, exA ? p.fora : null, exB ? q2.fora : null, c.t, exA ? p : null, exB ? q2 : null);
      }
      return conta;
    }
    // as direções: as da rosa (as do mar não contam); sem elas, um lado e o outro
    const noMar = id => { const p = Tracado.naBorda(id, W, H, 0, -1); return F.ehMar(p[0], p[1]); };
    let dirs = T8.portoes.filter(id => !noMar(id));
    if (!dirs.length && T8.portoes.length) return conta;
    if (!dirs.length) {
      const lados = ['n', 's', 'o', 'l'].filter(l => !noMar(l)), a = lados[Math.floor(K.rT() * lados.length) % lados.length];
      dirs = [a];
    }
    if (dirs.length === 1) {
      const b = Tracado.oposta(dirs[0]);
      if (!noMar(b)) dirs.push(b);
      else {
        // (o outro lado é o mar: vai para um dos lados de través)
        const outras = Tracado.IDS.filter(id => id !== dirs[0] && !noMar(id) && Math.abs(Tracado.difAng(Tracado.DIR[id].a, Tracado.DIR[dirs[0]].a)) > Math.PI / 2 - 0.01);
        if (outras.length) dirs.push(outras[Math.floor(K.rT() * outras.length) % outras.length]);
      }
    }
    const a0 = bordaPerto(dirs[0]), b0 = new Set(dirs[1] ? bordaPerto(dirs[1]) : []);
    if (a0.length && b0.size) {
      const f = a0[Math.floor(K.rT() * Math.min(3, a0.length)) % a0.length], cel = B.maisBarato(W, H, [f], q => b0.has(q), custo);
      if (cel && cel.length > 3) umCaminho(cel, B.foraDa(f, W, H), B.foraDa(cel[cel.length - 1], W, H));
    }
    for (const id of dirs.slice(2)) {
      const a = bordaPerto(id);
      if (!a.length) continue;
      const cel = noCaminho.size ? B.maisBarato(W, H, [a[0]], q => noCaminho.has(q), custo) : null;
      if (cel && cel.length > 3) umCaminho(cel, B.foraDa(a[0], W, H), null);
    }
    return conta;
  }
  // a espécie da árvore antiga (o cacto vira a árvore morta; o cristal, um cristal grande)
  const antigaDe = (b, E, rnd, estilo) => { const e = b.arv(E, rnd, estilo); return e === 'cacto' ? 'morta' : e; };
  /* Os pontos de interesse, longe uns dos outros e da chegada, a três quadrados da borda ou mais: o vau (se o caminho
     não o pôs), a gruta, a clareira e o ninho (ou a toca). → as clareiras ({ x, y, R }: as árvores ficam em volta) */
  function poePontos(K, F, tipos, estilo, tam, vau, chegada) {
    const { W, H, P } = K, diag = Math.hypot(W, H), E = Estilos.de(estilo), clareiras = [];
    const longe = (x, y, d) => P.pontos.every(q => Math.hypot(q.cx - x, q.cy - y) >= d) && (!chegada || Math.hypot(chegada[0] + 0.5 - x, chegada[1] + 0.5 - y) >= Math.max(5, d * 0.6));
    const filtro = (m, d) => (x, y) => x > m && y > m && x < W - m && y < H - m && longe(x, y, d);
    const tentar = fn => { for (const d of [diag * 0.28, diag * 0.18, 0]) { const r = fn(filtro(3, d)); if (r) return r; } return null; };
    const marcar = (k, n, cx, cy, mx, my) => { const [i, j] = MO.lugarDePe(K, mx, my); P.pontos.push({ k, n, x: i, y: j, cx: +cx.toFixed(2), cy: +cy.toFixed(2) }); P.tracado.push({ k: 'circ', x: cx, y: cy, r: 2.2 }); };
    const ordem = ['vau', 'gruta', 'clareira', 'ninho'].filter(t => tipos.includes(t));
    for (const t of ordem) {
      if (t === 'vau') {
        let f = vau.feito;
        if (!f) {
          // num rio, longe das pontes e dos lagos, dentro do mapa
          const rio = P.aguas.filter(a => a.k === 'rio').sort((a, b) => b.hw - a.hw)[0];
          for (let k = 0; rio && !f && k < 60; k++) {
            const q = Paisagem.aoLongo(rio.pts, K.r(0.2, 0.8));
            if (!K.dentro(q.x, q.y, 3.5) || F.ehMar(q.x, q.y) || F.lagos.some(l => Tracado.dentro(l.pts, q.x, q.y) || Tracado.distLinha(l.pts.concat([l.pts[0]]), q.x, q.y) < rio.hw + 1.5)) continue;
            if (P.pintados.some(o => (o.k === 'ponte' || o.k === 'pedras') && Math.hypot((o.x != null ? o.x : o.pts[0][0]) - q.x, (o.y != null ? o.y : o.pts[0][1]) - q.y) < 6) || !longe(q.x, q.y, k < 30 ? diag * 0.2 : 4)) continue;
            const ang = q.ang + Math.PI / 2;
            f = { x: q.x, y: q.y, ang, hw: rio.hw, nome: travessia(K, q.x, q.y, ang, rio.hw, rio.tipo === 'lava') };
          }
        }
        if (f) marcar('vau', f.nome, f.x, f.y, f.x - Math.cos(f.ang) * (f.hw + 1.3), f.y - Math.sin(f.ang) * (f.hw + 1.3));
      } else if (t === 'gruta') {
        const b = tentar(fl => {
          // na beira de um paredão que já existe, do lado aberto; senão, um penhasco novo
          const cands = [];
          for (const m of P.massas) {
            const [cx, cy] = Paisagem.centro(m.pts);
            for (let i = 0; i < m.pts.length; i += 2) {
              const [x, y] = m.pts[i], dx = x - cx, dy = y - cy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, fx = x + ux * 1.4, fy = y + uy * 1.4;
              if (!fl(fx, fy)) continue;
              const v = K.at(Math.floor(fx), Math.floor(fy));
              if (v === 0 || v === 6 || v === 5) cands.push({ x: x - ux * 0.15, y: y - uy * 0.15, ang: Math.atan2(uy, ux), cores: m.cores, nota: Math.hypot(fx - W / 2, fy - H / 2) + K.rT() * 4 });
            }
          }
          if (cands.length) return cands.sort((a, c) => a.nota - c.nota)[0];
          const l = K.lugar(2.9, v => v === 0 || v === 6, 150, fl);
          if (!l) return null;
          const BL = F.bioEm(l[0], l[1]), cores = Paisagem.pedraDe(BL.pedra || 'rocha'), rx = K.r(1.8, 2.4), pts = MO.blob(K.rT, l[0], l[1], rx, rx * K.r(0.75, 0.95), 12, 0.3, K.r(0, TAU));
          K.poePenhasco(pts, 4, cores);
          const ang = Math.atan2(H / 2 - l[1], W / 2 - l[0]) + K.r(-0.6, 0.6), q = Tracado.noContorno(pts, l[0], l[1], ang);
          return { x: (q ? q.x : l[0] + Math.cos(ang) * rx) - Math.cos(ang) * 0.15, y: (q ? q.y : l[1] + Math.sin(ang) * rx) - Math.sin(ang) * 0.15, ang, cores };
        });
        if (b) { K.pinta(2, 'bocaGruta', { x: b.x, y: b.y, ang: b.ang, r: 0.85, cores: b.cores }); marcar('gruta', 'Entrada de gruta', b.x, b.y, b.x + Math.cos(b.ang) * 1.3, b.y + Math.sin(b.ang) * 1.3); }
      } else if (t === 'clareira') {
        const R0 = { pequeno: 2.4, medio: 2.8, grande: 3.2 }[tam] + K.r(-0.3, 0.3);
        const l = tentar(fl => K.lugar(R0 + 0.4, v => v === 0, 150, fl));
        if (!l) continue;
        const [x, y] = l, b = F.bioEm(x, y), pts = MO.blob(K.rT, x, y, R0, R0 * K.r(0.78, 0.95), 14, 0.25, K.r(0, TAU));
        const verde = !['deserto', 'lava', 'cristais', 'neve', 'tundra', 'montanha'].includes(b.id);
        K.pinta(0, 'mancha', { pts, cores: Array.isArray(b.clareira) ? b.clareira : MO.CH[b.clareira] || MO.CH.clareira, op: verde ? { flores: ['#f2c94c', '#e85d75', '#ffffff', '#9b7bd8'], capim: ['#86a85a', '#4f6e3a'] } : { pedrisco: ['#d8d2c4', '#5e5a52'] } });
        K.marcaPoli(pts, 5);
        clareiras.push({ x, y, R: R0 });
        const oQue = K.pick(['poco', 'arvore', 'circulo']);
        if (oQue === 'poco' && K.objeto('poco', Math.floor(x - 0.5), Math.floor(y - 0.5), 0, v => v === 5 || v === 0)) {
          for (let k = 0; k < 4; k++) { const a = K.r(0, TAU), d = K.r(1.1, 1.7), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d; if (K.at(Math.floor(px), Math.floor(py)) === 5) { P.rochas.push({ x: px, y: py, r: K.r(0.18, 0.3), cores: Paisagem.pedraDe(b.pedra || 'rocha') }); K.pos(Math.floor(px), Math.floor(py), 4); } }
          marcar('clareira', 'Poço velho', x, y, x + 1.2, y);
        } else if (oQue === 'arvore' && b.id === 'cristais') {
          K.cristalGrande(x, y, K.r(1.2, 1.6), 'azul');
          marcar('clareira', 'Cristal antigo', x, y, x + 2, y);
        } else if (oQue === 'arvore') {
          const esp = antigaDe(b, E, K.rT, estilo), rr = esp === 'selva' ? K.r(2.3, 2.7) : esp === 'acacia' ? K.r(2.1, 2.5) : K.r(1.9, 2.3);
          K.arvore(x, y, rr, esp); P.cobertura.push({ x, y, r: Math.min(1.6, rr * 0.7) });
          marcar('clareira', 'Árvore antiga', x, y, x + rr * 0.9, y + 0.3);
        } else {
          const n = K.ri(7, 9), rc = Math.min(R0 * 0.62, 2.1), cores = Paisagem.pedraDe(b.pedra || 'rocha');
          for (let k = 0; k < n; k++) { const a = (k / n) * TAU + K.r(-0.12, 0.12), px = x + Math.cos(a) * rc, py = y + Math.sin(a) * rc; P.rochas.push({ x: px, y: py, r: K.r(0.36, 0.48), cores }); K.pos(Math.floor(px), Math.floor(py), 4); }
          marcar('clareira', 'Círculo de pedras', x, y, x, y);
        }
      } else if (t === 'ninho') {
        const l = tentar(fl => K.lugar(1.7, v => v === 0 || v === 6, 150, fl));
        if (!l) continue;
        const [x, y] = l, b = F.bioEm(x, y), toca = ['deserto', 'savana', 'campo', 'tundra', 'montanha'].includes(b.id) ? K.sorte(0.7) : K.sorte(0.3);
        if (toca) { const ang = K.r(0, TAU); K.pinta(2, 'toca', { x, y, r: 0.9, ang }); K.marcaCirc(x, y, 1.1, 4, true); marcar('ninho', 'Toca', x, y, x - Math.cos(ang) * 1.6, y - Math.sin(ang) * 1.6); }
        else { const rr = K.r(0.9, 1.2); K.pinta(2, 'ninho', { x, y, r: rr }); K.marcaCirc(x, y, rr + 0.2, 4, true); marcar('ninho', 'Ninho', x, y, x + rr + 1, y); }
      }
    }
    return clareiras;
  }
  /* O que cada bioma tem de seu, onde ele aparece: as poças (a água rasa e a lama no pântano, o lodo na terra corrompida,
     a lava), os cristais grandes, a neve funda e as fendas de lava. */
  function proprios(K, F) {
    const { W, H, P } = K, conta = {};
    for (let q = 0; q < W * H; q++) { const b = B.LISTA[F.bio[q]].id; conta[b] = (conta[b] || 0) + 1; }
    const noBioma = (id, m) => (x, y) => F.bioEm(x, y).id === id && K.dentro(x, y, m || 2) && P.pontos.every(q => Math.hypot(q.cx - x, q.cy - y) > 4);
    for (const id of Object.keys(conta)) {
      const b = B.BIO[id], n0 = conta[id];
      if (b.poca) for (let k = 0, n = Math.min(3, Math.floor(n0 / 150)); k < n; k++) {
        const l = K.lugar(2, v => v === 0, 80, noBioma(id));
        if (!l) break;
        const rx = K.r(0.9, 1.6), pts = MO.blob(K.rT, l[0], l[1], rx, rx * K.r(0.6, 0.85), 10, 0.3, K.r(0, TAU));
        if (b.poca === 'agua') { K.poeLago(pts, 'agua', -0.5); K.zona('lama', l[0], l[1], { r: rx + 0.8 }); }
        else if (b.poca === 'lodo') { K.poeLago(pts, 'lodo', -0.5); K.zona('toxica', l[0], l[1], { r: rx * 0.9 }); }
        else { K.poeLago(pts, 'lava', -1); K.zona('lava', l[0], l[1], { r: rx * 0.9 }); K.luz(l[0], l[1], 5, '#ff8a3a'); }
      }
      if (b.cristais) for (let k = 0, n = Math.min(3, 1 + Math.floor(n0 / 260)); k < n; k++) { const l = K.lugar(1.8, v => v === 0, 80, noBioma(id, 2.5)); if (l) K.cristalGrande(l[0], l[1], K.r(0.9, 1.4), 'azul'); }
      if (b.neve) for (let k = 0, n = Math.min(3, 1 + Math.floor(n0 / 300)); k < n; k++) {
        const l = K.lugar(1.8, v => v === 0, 80, noBioma(id));
        if (!l) break;
        const d = MO.blob(K.rT, l[0], l[1], K.r(1.4, 2.4), K.r(0.9, 1.4), 10, 0.3, K.r(0, TAU));
        K.pinta(0, 'mancha', { pts: d, cores: id === 'tundra' ? ['#dfe5e6', '#cfd7d9', '#eef2f3'] : MO.CH.neveFunda, op: id === 'tundra' ? { a: 0.8 } : null }); K.marcaPoli(d, 6);
      }
      if (id === 'lava') for (let k = 0, n = Math.min(2, 1 + Math.floor(n0 / 400)); k < n; k++) {
        const l = K.lugar(1.5, v => v === 0, 80, noBioma(id, 3));
        if (!l) break;
        const an = K.r(0, TAU), L = K.r(4, 7), pts = MO.curva([l, [l[0] + Math.cos(an + 0.4) * L * 0.5, l[1] + Math.sin(an + 0.4) * L * 0.5], [l[0] + Math.cos(an) * L, l[1] + Math.sin(an) * L]], 0.6);
        K.pinta(0, 'fenda', { pts, larg: 0.35, brilho: '#ff8a2a', cores: ['#1c1714', '#3a1206'] });
        const m = Paisagem.aoLongo(pts, 0.5); K.luz(m.x, m.y, 3, '#ff8a3a'); K.zona('brasas', m.x, m.y, { r: K.r(1.2, 1.8) });
      }
    }
  }

  function gerar(o) {
    o = o || {};
    const tam = TAMANHOS[o.tamanho] ? o.tamanho : 'medio', { W, H } = TAMANHOS[tam];
    const bioma = B.valido(o.bioma), BB = B.BIO[bioma], mistura = B.mistura(o.mistura);
    const aguaPedida = AGUAS.some(a => a[0] === o.agua) ? o.agua : 'surpresa', caminho = CAMINHOS.some(c => c[0] === o.caminho) ? o.caminho : 'trilha';
    const estilo = Estilos.valido(o.estilo), seed = (Math.round(Number(o.seed)) >>> 0) || 1, comMarcas = o.marcas !== false;
    const trava = limparTrava(o.trava, { bioma, tamanho: tam, mistura, agua: aguaPedida, caminho });
    const sT = trava ? trava.s : (MO.sub(seed, 1) % 2147483000) + 1;
    const palDe = id => { const p0 = B.BIO[id].pal; return o.seco && SECO[p0] ? SECO[p0] : p0; };
    const pal = palDe(bioma);
    const K = MO.contexto(W, H, BB.ter, 'regiao', estilo, caminho, sT, pal), P = K.P;
    const rV = mulberry((MO.sub(seed, 2) % 2147483000) + 1);
    const T8 = Tracado.escolhas(o, [], null);
    // (lote 14, parte 14a) o hexágono do Mapa-múndi: os vizinhos nas bordas (e a água deles), o rio e os caminhos do mapa
    // pelos pontos certos da borda (o que o mapa não tem fica à escolha: sem rio no mapa, a Água; sem caminho, o Caminho)
    const hex = HexCena.valida(o.hex), comHex = HexCena.aceita(hex), rioDoMapa = comHex && hex.rios.length > 0, camDoMapa = comHex && hex.caminhos.length > 0;
    // (lote 14, parte 14b) a guerra do hexágono (as marcas escolhidas na janela; a batalha de mais de 7 dias vai para a história)
    const GU = comHex && hex.guerra ? MarcasGuerra.escolha(hex.guerra, o.guerra) : null, hist = MarcasGuerra.comHistoria(Historia.valida(o.historia), GU);
    // a água: a Surpresa sorteia (escolher o rio na rosa garante o rio)
    let agua = aguaPedida, paraLago = false;
    if (rioDoMapa) agua = 'rio';
    else if (agua === 'surpresa') {
      if (Tracado.rioDaRosa(T8.rio)) agua = 'rio';
      else { const u = MO.sub(sT, 42) % 100; agua = u < 62 ? 'rio' : u < 85 ? 'lago' : 'nenhuma'; paraLago = u >= 45 && u < 62; }
    }
    const rioOp = agua === 'rio' ? { de: T8.rio.de, para: T8.rio.para || (paraLago ? 'lago' : null), curvas: T8.rio.curvas, hw: T8.rio.larg ? Tracado.LARGURA[T8.rio.larg] : 1.2, afluente: T8.rio.afluente, lago: T8.rio.lago } : null;
    const F = comHex ? HexCena.campo(W, H, MO.sub(sT, 40), { bioma, mistura, hex, agua, rio: rioOp }) : B.campo(W, H, MO.sub(sT, 40), { bioma, mistura, agua, rio: rioOp });
    P.biomas = []; P.pontos = []; P.lagos = []; P.rios = []; P.patamares = { morros: 0, planaltos: 0, paredoes: 0 };
    // o chão dos vizinhos (as manchas de beira macia, no desenho)
    for (const v of F.vizs) { const pts = F.manchas.filter(m => m.bio === v).map(m => m.pts); if (pts.length) P.biomas.push({ id: v, pal: palDe(v), pts }); }
    /* a água parada grande (o lago, o mar), em duas demãos: a de sempre, antes dos rios (a beira fica embaixo deles), e
       outra sem a beira, depois, por cima da ponta do rio que entra nela */
    const aguaParada = (pts, tipo, alt, v, palA) => {
      K.poeLago(pts, tipo, alt, v);
      if (palA) P.aguas[P.aguas.length - 1].pal = palA;
      K.pinta(1, 'aguaParada', { pts, tipo, pal: palA || null, semBeira: true });
    };
    // o mar (na costa): a praia, o mar e a espuma da beira
    if (F.mar) {
      K.pinta(0, 'praia', { pts: F.mar.praia }); K.marcaPoli(F.mar.praia, 5);
      aguaParada(F.mar.pts, 'mar', -2, 2);
      K.pinta(1, 'espuma', { pts: F.mar.beira });
      P.mar = { lado: F.mar.lado };
    }
    // (lote 14, parte 14a) a água dos vizinhos do hexágono: a praia, a água e a espuma, como o mar da costa
    for (const A of F.mares || []) {
      K.pinta(0, 'praia', { pts: A.praia }); K.marcaPoli(A.praia, 5);
      aguaParada(A.pts, 'mar', -2, 2);
      K.pinta(1, 'espuma', { pts: A.beira });
    }
    if (F.mares && F.mares.length) P.mar = { lado: null };
    // os lagos: o tipo é o do bioma onde ele fica (o gelo, na neve e na tundra: dá para andar, e escorrega)
    const agLagos = [];
    for (const L of F.lagos) {
      const BL = F.bioEm(L.centro[0], L.centro[1]), tipo = BL.lago || 'agua', rr = Math.sqrt(L.cel.size / Math.PI);
      if (tipo === 'gelo') {
        aguaParada(L.pts, 'gelo', null, 5, palDe(BL.id));
        K.zona('gelado', L.centro[0], L.centro[1], { r: rr * 0.95 });
        for (const q of Array.from(L.cel).filter((_, k) => k % 23 === 7).slice(0, 3)) K.zona('gelado', q % W + 0.5, Math.floor(q / W) + 0.5, { r: Math.max(1.5, rr * 0.55) });
      } else aguaParada(L.pts, tipo, tipo === 'lava' ? -1 : -1.5, 2, palDe(BL.id));
      if (tipo === 'lava') { K.zona('lava', L.centro[0], L.centro[1], { r: rr * 0.85 }); K.luz(L.centro[0], L.centro[1], 7, '#ff8a3a'); }
      P.lagos.push({ tipo }); agLagos.push(P.aguas.filter(a => a.k === 'lago' && a.pts === L.pts)[0] || null);
    }
    // os rios (o de lava na terra de lava, com a zona e a luz)
    const tipoRio = BB.agua === 'lava' ? 'lava' : 'agua';
    for (const rio of F.rios) {
      for (const pc of rio.pecas) { const pts = K.poeRio(pc, rio.hw, tipoRio, tipoRio === 'lava' ? -1 : rio.afluente ? -1 : -1.2); if (tipoRio === 'lava') lavaAoLongo(K, pts, rio.hw); }
      P.rios.push({ hw: rio.hw, afluente: rio.afluente, destino: rio.destino });
    }
    // os patamares: o planalto de pedra (andável, a beira em degraus) e o morro; o paredão (o penhasco: não passa)
    for (const pl of F.planaltos) {
      const BP = B.BIO[pl.bio], BC = o.seco && SECO[BP.pal] ? B.BIO.savana : BP, cores = BP.rocha ? Paisagem.pedraDe(BP.pedra) : BC.morro;
      K.pinta(0, BP.rocha ? 'planalto' : 'morro', { pts: pl.pts, alt: pl.alt, cores });
      if (BP.rocha) K.marcaPoli(pl.pts, 6);
      P.relevo.push({ t: 'morro', alt: pl.alt, k: 'poly', pts: pl.pts });
      P.tracado.push({ k: 'poli', pts: pl.pts });
      if (BP.rocha) P.patamares.planaltos++; else P.patamares.morros++;
    }
    for (const pd of F.paredoes) { K.poePenhasco(pd.pts, pd.alt, Paisagem.pedraDe(B.BIO[pd.bio].pedra || 'rocha')); P.patamares.paredoes++; }
    // os pontos de interesse: quantos, pelo tamanho; os tipos sorteados (o vau só com rio)
    const tipos = ['clareira', 'gruta', 'ninho', 'vau'].filter(t => t !== 'vau' || P.aguas.some(a => a.k === 'rio'));
    for (let i = tipos.length - 1; i > 0; i--) { const k = Math.floor(K.rT() * (i + 1)); [tipos[i], tipos[k]] = [tipos[k], tipos[i]]; }
    const escolhidos = tipos.slice(0, TAMANHOS[tam].pontos), vau = { quer: escolhidos.includes('vau'), feito: null };
    // o caminho (sem caminho, a rosa ainda põe trilhas)
    const tipoCam = caminho === 'nenhum' ? (T8.portoes.length ? 'trilha' : null) : caminho;
    const conta = camDoMapa ? poeCaminhos(K, F, T8, 'trilha', vau, sT, F.linhas.caminhos) : tipoCam ? poeCaminhos(K, F, T8, tipoCam, vau, sT) : { pontes: 0 };
    // a chegada: na ponta do caminho que entra no mapa; sem caminho, numa borda de terra
    let chegada;
    if (K.rota) { const p = K.rota.find(([x, y]) => x >= 0.6 && y >= 0.6 && x <= W - 0.6 && y <= H - 0.6) || K.rota[0]; chegada = MO.lugarDePe(K, clamp(p[0], 0.6, W - 0.6), clamp(p[1], 0.6, H - 0.6)); }
    else {
      const lados = ['o', 'l', 'n', 's'].filter(l => !F.mar || l !== F.mar.lado), lado = lados[Math.floor(K.rT() * lados.length) % lados.length], t = K.r(0.3, 0.7);
      chegada = MO.lugarDePe(K, lado === 'o' ? 0.8 : lado === 'l' ? W - 0.8 : t * W, lado === 'n' ? 0.8 : lado === 's' ? H - 0.8 : t * H);
    }
    const clareiras = poePontos(K, F, escolhidos, estilo, tam, vau, chegada);
    proprios(K, F);
    // (lote 13, parte 13c) a história do lugar e o achado raro entram depois da vegetação: guardar o que havia antes
    const comHist = hist.length > 0 || o.achados === true, A13 = comHist || GU ? Historia.antes(K) : null;
    // a mata (o relevo) onde o bosque fecha, nos biomas de mato; as árvores se juntam nos bosques
    const nb = Tracado.ruido(MO.sub(sT, 44)), EB = 1 / 6.5, bq = (x, y) => clamp((nb(x * EB, y * EB) - 0.42) / 0.22, 0, 1);
    const G = B.grupos(W, H, q => { const i = q % W, j = (q - i) / W; return K.at(i, j) === 0 && F.bioEm(i + 0.5, j + 0.5).mata && bq(i + 0.5, j + 0.5) > 0.62; });
    G.grupos.forEach((cel, g) => { if (cel.length < 10) return; const pts = B.contornoDe(cel, W, H, G.marca, g, 3, 0.75); if (pts) P.relevo.push({ t: 'mata', alt: 0, k: 'poly', pts }); });
    // a vegetação: a de cada bioma, onde ele está (na passagem de um para o outro, elas se misturam)
    const E = Estilos.de(estilo);
    const hsh = (i, j, k) => { let x = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1442695041) + (sT | 0); x = Math.imul(x ^ (x >>> 13), 1274126177); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
    const bioJ = (x, y) => { const i = Math.floor(x * 2), j = Math.floor(y * 2); return F.bioEm(x + (hsh(i, j, 1) - 0.5) * 2.4, y + (hsh(i, j, 2) - 0.5) * 2.4); };
    P.densBase = 1;
    P.dens = (x, y) => {
      for (const c of clareiras) { const d = Math.hypot(x - c.x, y - c.y) / c.R; if (d < 1.15) return 0; if (d < 1.6) return bioJ(x, y).dens * 2.2; }
      return bioJ(x, y).dens * (0.25 + 1.75 * bq(x, y));
    };
    P.esp = (x, y, rnd) => bioJ(x, y).arv(E, rnd, estilo);
    P.juncos = Math.max(0, ...[bioma].concat(F.vizs).map(id => B.BIO[id].juncos || 0));
    MO.vegetacao(K, rV);
    P.arvores = P.arvores.filter(a => a.esp !== 'juncos' || (F.bioEm(a.x, a.y).juncos || 0) > 0);
    for (const a of P.arvores) { const b = F.bioEm(a.x, a.y); if (a.pal == null) a.pal = palDe(b.id); if (a.neve == null) a.neve = !!b.neve; }
    // os enfeites (objetos que dá para mover) e as pedrinhas pintadas, de cada bioma
    for (let k = 0, tent = 0, n = Math.round(W * H / 150); k < n && tent < 200; tent++) {
      const i = 1 + Math.floor(rV() * (W - 2)), j = 1 + Math.floor(rV() * (H - 2)), ids = F.bioEm(i + 0.5, j + 0.5).enf, id = ids[Math.floor(rV() * ids.length) % ids.length];
      if (K.objeto(id, i, j, Math.floor(rV() * 4) * 90, v => v === 0)) k++;
    }
    for (let t = 0, n = Math.round(W * H / 4); t < n; t++) {
      const x = 0.5 + rV() * (W - 1), y = 0.5 + rV() * (H - 1), b = F.bioEm(x, y);
      if (rV() >= b.pedrinhas / 192 || K.at(Math.floor(x), Math.floor(y)) !== 0) continue;
      P.rochas.push({ x, y, r: 0.25 + rV() * 0.3, cores: Paisagem.pedraDe(b.pedra || palDe(b.id)) }); K.pos(Math.floor(x), Math.floor(y), 4);
    }
    const ev13 = P.pontos.map(q => [q.cx, q.cy, 5]).concat([[chegada[0] + 0.5, chegada[1] + 0.5, 5]]);
    // (lote 14, parte 14b) as marcas da guerra, antes da história (a história fica longe delas); elas chegam um pouco mais
    // perto dos pontos de interesse (só vão nas casas livres)
    const feitosG = GU ? MarcasGuerra.noLugar(K, A13, { g: GU, sT, evitar: ev13.map(([x, y, r]) => [x, y, r * 0.7]) }) : [];
    if (comHist) Historia.noLugar(K, A13, { historia: hist, achados: o.achados === true, seed, sT, evitar: ev13.concat(feitosG), bat: GU && GU.velha });
    // (lote 13, parte 13c) a estação: no inverno, a água parada e rasa congela (o lago, as poças do pântano)
    Estacoes.noPlano(K, o.estacao);
    agLagos.forEach((a, i) => { if (a && a.tipo === 'gelo') P.lagos[i].tipo = 'gelo'; });
    P.marcas = comMarcas ? { chegada } : {};
    if (!P.tracado.length) P.tracado.push({ k: 'circ', x: W / 2, y: H / 2, r: 3 });
    delete P.dens; delete P.esp;
    const seco = !!o.seco && [bioma].concat(F.vizs).some(id => SECO[B.BIO[id].pal]);
    // (lote 14, parte 14a: o hexágono — só quando veio; sem ele, o plano é o de sempre)
    if (comHex) P.hex = { k: hex.k, q: hex.q, r: hex.r, orient: hex.orient, viz: Object.assign({}, hex.viz), ter: hex.ter, nome: hex.nome, rios: F.linhas.rios.length, caminhos: F.linhas.caminhos.length, agua: (F.mares || []).length, rioDoMapa, camDoMapa };
    return Object.assign(P, { v: 1, lugar: 'regiao', bioma, mistura, aguaPedida, agua, seed, sT, tamanho: tam, vizinhos: F.vizs.slice(), pontesNovas: conta.pontes, travaTracado: !!trava, comMarcas, seco, sitPedida: null, occ: Array.from(K.occ) });
  }

  /* (os desenhos — a água parada em duas demãos, o morro macio, a boca da gruta, o ninho e a toca — são do motor dos
     encontros: Encontro.motor.pintar) */

  /* ================= a cena, a prévia e o lugar (a janela do gerador) ================= */
  const nomePadrao = p => 'Região livre ' + (B.BIO[p.bioma] || B.LISTA[0]).em;
  const criar = (p, nome, ex) => MO.criarPlano(p, nome, ex, nomePadrao);
  function resumo(p) {
    const Bp = B.BIO[p.bioma] || B.LISTA[0], viz = (p.vizinhos || []).filter(v => B.BIO[v]).map(v => B.BIO[v].n.toLowerCase());
    const partes = [Bp.n + (viz.length ? ' com ' + juntar(viz) : ''), p.W + ' × ' + p.H + ' quadrados'];
    const ag = [], rios = p.rios || [];
    if (rios.some(r => !r.afluente)) ag.push(rios.some(r => r.afluente) ? 'rio com afluente' : 'rio');
    for (const l of p.lagos || []) ag.push(l.tipo === 'gelo' ? 'lago congelado' : l.tipo === 'lava' ? 'lago de lava' : l.tipo === 'espelho' ? 'lago espelhado' : 'lago');
    if (p.mar) ag.push('o mar');
    if (ag.length) partes.push(juntar(ag));
    if (p.caminhos.length) partes.push(p.caminhos.some(c => c.tipo === 'estrada') ? 'estrada' : 'trilha');
    const pm = p.patamares || {}, rel = [];
    if (pm.morros) rel.push(plural(pm.morros, 'morro'));
    if (pm.planaltos) rel.push(plural(pm.planaltos, 'planalto'));
    if (pm.paredoes) rel.push(plural(pm.paredoes, 'penhasco'));
    if (rel.length) partes.push(juntar(rel));
    const pts = p.pontos || [];
    if (pts.length) partes.push(plural(pts.length, 'ponto de interesse', 'pontos de interesse') + ' (' + pts.map(q => q.n.toLowerCase()).join(', ') + ')');
    if (p.seco) partes.push('o chão seco');
    // (lote 13, parte 13c) a estação (no verão, nada), a história do lugar e o achado raro
    if (p.estacao) partes.push(Estacoes.texto(p));
    partes.push(...Historia.texto(p));
    // (lote 14, parte 14b) as marcas da guerra; (14a) o hexágono do Mapa-múndi
    partes.push(...MarcasGuerra.texto(p));
    if (p.hex) partes.push(HexCena.resumoTxt(p.hex));
    return partes.join(' · ') + '.';
  }
  const lembrar = st => { const o = App.opt; o.regBio = st.bioma; o.regMis = st.mistura; o.regAgua = st.agua; o.regCam = st.caminho; o.regTam = st.tamanho; o.regMarcas = st.marcas; o.regTracado = Tracado.soMudadas(st.t || Tracado.padrao()); o.regHist = Historia.valida(st.historia); o.regAchados = st.achados !== false; };
  // (o relevo natural não vale aqui: a Região já nasce do relevo)
  const tracadoDe = o => Object.assign(Tracado.limpar(o), { relevoNat: false, praca: 'centro', muroForma: null });
  function padrao() {
    const o = App.opt;
    return { bioma: B.BIO[o.regBio] ? o.regBio : 'floresta', mistura: B.mistura(o.regMis), agua: AGUAS.some(a => a[0] === o.regAgua) ? o.regAgua : 'surpresa', caminho: CAMINHOS.some(c => c[0] === o.regCam) ? o.regCam : 'trilha',
      tamanho: TAMANHOS[o.regTam] ? o.regTam : 'medio', marcas: o.regMarcas !== false, t: tracadoDe(o.regTracado),
      historia: Historia.valida(o.regHist), achados: o.regAchados !== false };        // (lote 13, parte 13c) a história do lugar e os achados raros
  }
  /* ctx.hex (lote 14, parte 14a): o hexágono do Mapa-múndi, quando a janela usa ele — o rio e os caminhos dele ficam no
     lugar da Água e do Caminho (e da rosa do Traçado); sem rio ou sem caminho no mapa, a escolha continua */
  function controles(st, K, mudou, ctx) {
    const { field, seg, toggle, note } = K;
    // (o bioma, a mistura, o tamanho, a água e o caminho trocam o traçado: soltam a trava)
    const muda = (campo, v) => { st[campo] = v; lembrar(st); mudou(true, { soltar: true }); };
    const hx = ctx && ctx.hex ? ctx.hex : null, rioHex = hx && hx.rios.length ? HexCena.rioTxt(hx) : '', camHex = hx && hx.caminhos.length ? HexCena.caminhosTxt(hx) : '';
    const doMapa = (id, txt) => { const n = note('Do Mapa-múndi: ' + txt + '.'); n.id = id; return n; };
    const temRio = !!rioHex || st.agua === 'rio' || st.agua === 'surpresa';
    return h('div', { class: 'ger-c' },
      field('Bioma', seg('reg-bio', st.bioma, B.LISTA.map(b => [b.id, b.n]), v => muda('bioma', v)), 'stack'),
      h('div', { class: 'ger-l' },
        field('Mistura', seg('reg-mis', st.mistura, B.MISTURAS, v => muda('mistura', v)), 'stack'),
        field('Tamanho', seg('reg-tam', st.tamanho, Object.keys(TAMANHOS).map(k => [k, TAMANHOS[k].n, null, TAMANHOS[k].W + ' × ' + TAMANHOS[k].H + ' quadrados · ' + plural(TAMANHOS[k].pontos, 'ponto de interesse', 'pontos de interesse')]), v => muda('tamanho', v)), 'stack')),
      h('div', { class: 'ger-l' },
        field('Água', rioHex ? doMapa('reg-agua-hex', rioHex) : seg('reg-agua', st.agua, AGUAS, v => muda('agua', v)), 'stack'),
        field('Caminho', camHex ? doMapa('reg-cam-hex', camHex) : seg('reg-cam', st.caminho, CAMINHOS, v => muda('caminho', v)), 'stack')),
      // (lote 13, parte 13c) a história do lugar e os achados raros
      Historia.campo(st, K, () => { lembrar(st); mudou(true); }, 'reg'),
      toggle('reg-achados', st.achados !== false, v => { st.achados = v; lembrar(st); mudou(true); }, 'Achados raros: a semente decide, um em cada quatro lugares (só você vê o marcador)'),
      toggle('reg-marcas', st.marcas, v => { st.marcas = v; lembrar(st); mudou(true); }, 'Marcar a chegada e os pontos de interesse (só você vê)'),
      Tracado.secao(st.t || (st.t = tracadoDe(null)), K, () => { lembrar(st); mudou(true); }, { pre: 'reg', portoes: 'Caminhos',
        portoesNota: 'De onde chegam os caminhos: o primeiro atravessa a região; os outros vão até ele.',
        rio: temRio, rioNota: st.agua === 'lago' ? 'Só o lago, sem rio: escolha "Rio" ou a Surpresa em Água para ter o rio.' : 'Sem água: escolha "Rio" ou a Surpresa em Água para ter o rio.',
        mar: st.bioma === 'costa', rioDica: rioHex ? 'O rio desce pelo relevo, do ponto por onde entra ao por onde sai.' : st.agua === 'surpresa' ? 'Na Surpresa, escolher de onde o rio vem (ou para onde vai) garante o rio.' : 'O rio desce pelo relevo: de onde ele vem, o chão é mais alto.', pontes: true, relevo: false,
        rioHex: rioHex ? 'O rio vem do hexágono do Mapa-múndi: ' + rioHex + '.' : null, portoesHex: camHex ? 'Os caminhos vêm do hexágono do Mapa-múndi: ' + camHex + '.' : null }));
  }
  const opcoesDe = st => Object.assign({ bioma: st.bioma, mistura: st.mistura, agua: st.agua, caminho: st.caminho, tamanho: st.tamanho, marcas: !!st.marcas },
    Historia.valida(st.historia).length ? { historia: Historia.valida(st.historia) } : null, { achados: st.achados !== false }, Tracado.soMudadas(st.t || Tracado.padrao()));
  function aplicarOpcoes(st, o, op) {
    if (B.BIO[o.bioma]) st.bioma = o.bioma;
    if (typeof o.mistura === 'string' && B.FRACAO[o.mistura] != null) st.mistura = o.mistura;
    if (AGUAS.some(a => a[0] === o.agua)) st.agua = o.agua;
    if (CAMINHOS.some(c => c[0] === o.caminho)) st.caminho = o.caminho;
    if (TAMANHOS[o.tamanho]) st.tamanho = o.tamanho;
    if (typeof o.marcas === 'boolean') st.marcas = o.marcas;
    // (lote 13, parte 13c: o modelo de antes não tem a história nem os achados — fica sem eles, o mesmo lugar)
    if (Array.isArray(o.historia) || (op && op.modelo)) st.historia = Historia.valida(o.historia);
    if (typeof o.achados === 'boolean') st.achados = o.achados; else if (op && op.modelo) st.achados = false;
    st.t = tracadoDe(o);
    lembrar(st);
  }
  // a parte que trava: o traçado inteiro (a água, o relevo, o caminho e os pontos de interesse)
  const partes = p => (p.tracado.length ? ['tracado'] : []);
  function parteEm(p, x, y) {
    for (const f of p.tracado) {
      if (f.k === 'linha' && MO.distLinha(f.pts, x, y) <= f.hw + 0.5) return 'tracado';
      if (f.k === 'poli' && MO.dentroPoli(f.pts, x, y)) return 'tracado';
      if (f.k === 'circ' && Math.hypot(x - f.x, y - f.y) <= f.r) return 'tracado';
    }
    return null;
  }
  const nomeDaParte = () => 'o traçado (a água, os morros e os penhascos, o caminho e os pontos de interesse)';
  const formaDaParte = (p, parte) => (parte === 'tracado' ? p.tracado.map(f => (f.k === 'linha' ? { k: 'linha', pts: f.pts, hw: f.hw } : f.k === 'circ' ? { k: 'circ', x: f.x, y: f.y, r: f.r } : { k: 'poli', pts: f.pts })) : []);
  const travada = (p, parte) => parte === 'tracado' && !!p.travaTracado;
  const travaDe = p => (p.travaTracado ? { bioma: p.bioma, tamanho: p.tamanho, mistura: p.mistura, agua: p.aguaPedida, caminho: p.caminho, s: p.sT } : null);
  function alternar(p, parte, trava) {
    if (parte !== 'tracado') return trava;
    p.travaTracado = !p.travaTracado;
    return travaDe(p);
  }
  const quantasTravadas = p => (p.travaTracado ? 1 : 0);
  const baseDe = () => null;
  // (lote 13, parte 13c: aceitaEstacao — a janela mostra a Estação e passa a escolhida)
  // (lote 14, parte 14a) a Região livre aceita o hexágono de terra
  const LUGAR = { aceitaHex: (st, hex) => HexCena.aceita(hex), biomaDe: st => st.bioma, aceitaEstacao: true, id: 'regiao', n: 'Região livre', padrao, controles, opcoesDe, aplicarOpcoes, gerar: (st, comum) => gerar(Object.assign({}, st, Tracado.soMudadas(st.t || Tracado.padrao()), comum)), previa: MO.previa, resumo, partes, parteEm, nomeDaParte, formaDaParte, travada, alternar, quantasTravadas, baseDe, travaDe, nomePadrao, criar,
    relevoTxt: 'Com relevo, formas e zonas (a água, os morros e os penhascos, as pontes, o gelo, a lava)',
    aceitaSeco: true,
    dica: 'Clique no traçado da prévia (a água, os morros, o caminho, os pontos de interesse) para travar: "Gerar outro" troca só as árvores, as pedras e os enfeites.',
    nota: 'Sai uma cena nova para explorar: o chão do bioma com as manchas dos vizinhos, a água que segue o relevo, os morros e os penhascos, o caminho e os pontos de interesse. Os marcadores da chegada e de cada ponto (com o nome do que há ali) nascem ocultos: só você vê. O relevo, as zonas e as luzes saem editáveis; nada sai escrito; as cenas que já existem não mudam.',
    feito: (sc, p) => `"${sc.name}" criada: ${resumo(p).replace(/\.$/, '')}. Tudo é editável.` };
  return { TAMANHOS, AGUAS, CAMINHOS, gerar, resumo, criar, nomePadrao, limparTrava, travaDe, LUGAR };
})();
