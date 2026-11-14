/* ---------------------------------------------------------------
   7k. A FURTIVIDADE MEDIDA (lote 151) — o mapa de calor, as rotas e a dificuldade.
   Um modelo simples do lugar, em quadrados: as paredes (o que tapa a vista e o que barra a passagem) e os guardas (a
   rota, o passo, o cone). As rondas andam algumas vezes ("Avançar rondas"), e cada quadrado ganha o calor: a parte do
   tempo em que algum guarda o vê (cone, alcance, sem parede no meio — sem contar a luz: é o pior caso). Com o calor:
     · as rotas da chegada até o alvo: a curta (menos quadrados) e a segura (menos calor no caminho);
     · a dificuldade: o quanto a rota segura ainda se expõe (Fácil, Médio, Difícil, Muito difícil).
   Serve aos dois lados: o plano do gerador (Vigia.doPlano) e a cena (Vigia.daCena, só o mestre).
   A vista segue as paredes das Cenas; para andar, a parede e a mureta barram, e as aberturas passam (quem se infiltra
   abre a porta, pula a janela).
   --------------------------------------------------------------- */
const Vigia = (() => {
  const NIVEIS = [['facil', 'Fácil'], ['medio', 'Médio'], ['dificil', 'Difícil'], ['muito', 'Muito difícil']];
  const PASSOS = 24;                                      // quantas vezes as rondas andam na simulação

  /* O modelo: { W, H, bv (Uint8: a vista barrada, por aresta), bp (o passo barrado), guardas: [{ x, y, pts, passo, modo, r, a, dir }], de, para } */
  function novo(W, H) {
    // arestas: a vertical à esquerda do quadrado (x, y) = V[y*(W+1)+x]; a horizontal em cima = Hh[y*W+x]
    return { W, H, vV: new Uint8Array((W + 1) * H), vH: new Uint8Array(W * (H + 1)), pV: new Uint8Array((W + 1) * H), pH: new Uint8Array(W * (H + 1)), guardas: [], de: null, para: null };
  }
  // um trecho de parede (em quadrados): marca as arestas que ele cobre (os retos; o torto vira uma escada de arestas)
  // (lote 152) a parede w cruza o trecho (ax, ay)–(bx, by)?
  function cruza(w, ax, ay, bx, by) {
    const d = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
    const d1 = d(w.x1, w.y1, w.x2, w.y2, ax, ay), d2 = d(w.x1, w.y1, w.x2, w.y2, bx, by), d3 = d(ax, ay, bx, by, w.x1, w.y1), d4 = d(ax, ay, bx, by, w.x2, w.y2);
    return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9) || Math.abs(d3) <= 1e-9 || Math.abs(d4) <= 1e-9);
  }
  // um trecho de parede (em quadrados): fecha a aresta entre dois vizinhos quando cruza a linha entre os centros deles
  // (lote 152: assim as paredes tortas, das catacumbas e das cavernas, não fecham os túneis)
  function parede(M, x1, y1, x2, y2, vista, passo) {
    if (Math.hypot(x2 - x1, y2 - y1) < 0.01) return;
    const w = { x1, y1, x2, y2 }, W = M.W, H = M.H;
    const xa = Math.max(0, Math.floor(Math.min(x1, x2)) - 1), xb = Math.min(W - 1, Math.ceil(Math.max(x1, x2)) + 1);
    const ya = Math.max(0, Math.floor(Math.min(y1, y2)) - 1), yb = Math.min(H - 1, Math.ceil(Math.max(y1, y2)) + 1);
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      if (x + 1 < W && cruza(w, x + 0.5, y + 0.5, x + 1.5, y + 0.5)) { const k = y * (W + 1) + x + 1; if (vista) M.vV[k] = 1; if (passo) M.pV[k] = 1; }
      if (y + 1 < H && cruza(w, x + 0.5, y + 0.5, x + 0.5, y + 1.5)) { const k = (y + 1) * W + x; if (vista) M.vH[k] = 1; if (passo) M.pH[k] = 1; }
    }
  }
  // o que cada tipo de parede faz: [tapa a vista, barra o passo]
  // a vista: como no resto das Cenas (wallBlocksSight: a janela e a mureta deixam ver; a porta, a cortina e a parede
  // fechadas tapam). O passo de quem se infiltra: a parede e a mureta barram; a porta (até trancada), a janela e a cortina passam.
  function efeito(w) {
    const k = w.k || 'wall';
    return [wallBlocksSight(w), k === 'wall' || k === 'mureta'];
  }
  // passar do quadrado (x, y) para o vizinho (dx, dy ∈ −1..1), pelas arestas de vista (bloq = vV/vH) ou de passo
  function passa(M, V, Hh, x, y, dx, dy) {
    const W = M.W;
    const ve = (gx, gy) => V[gy * (W + 1) + gx], he = (gx, gy) => Hh[gy * W + gx];
    if (dx && !dy) return !ve(dx > 0 ? x + 1 : x, y);
    if (dy && !dx) return !he(x, dy > 0 ? y + 1 : y);
    // na diagonal: por um dos dois lados
    const a = !ve(dx > 0 ? x + 1 : x, y) && !he(x + dx, dy > 0 ? y + 1 : y);
    const b = !he(x, dy > 0 ? y + 1 : y) && !ve(dx > 0 ? x + 1 : x, y + dy);
    return a || b;
  }
  // a linha de vista de (ax, ay) a (bx, by) (centros dos quadrados), quadrado a quadrado
  function ve(M, ax, ay, bx, by) {
    let x = ax, y = ay;
    const dx = Math.sign(bx - ax), dy = Math.sign(by - ay), nx = Math.abs(bx - ax), ny = Math.abs(by - ay);
    let ix = 0, iy = 0;
    while (ix < nx || iy < ny) {
      const tx = (ix + 0.5) / (nx || 1), ty = (iy + 0.5) / (ny || 1);
      let sx = 0, sy = 0;
      if (nx && ny && Math.abs(tx - ty) < 1e-9) { sx = dx; sy = dy; ix++; iy++; }
      else if (ny === 0 || (nx && tx < ty)) { sx = dx; ix++; } else { sy = dy; iy++; }
      if (!passa(M, M.vV, M.vH, x, y, sx, sy)) return false;
      x += sx; y += sy;
    }
    return true;
  }
  // as casas por onde a ronda passa, na ordem (um ciclo: de ida e volta, ou em círculo)
  function trilha(g) {
    const pts = g.pts || [];
    if (pts.length < 2) return [[g.x, g.y, g.dir]];
    const seg = (a, b, out) => { let [x, y] = a; while (x !== b[0] || y !== b[1]) { const sx = Math.sign(b[0] - x), sy = Math.sign(b[1] - y); x += sx; y += sy; out.push([x, y, ((Math.round(Math.atan2(sy, sx) * 180 / Math.PI) % 360) + 360) % 360]); } };
    const ida = [[pts[0][0], pts[0][1], g.dir]];
    for (let i = 1; i < pts.length; i++) seg(pts[i - 1], pts[i], ida);
    if (g.modo === 'volta') { seg(pts[pts.length - 1], pts[0], ida); return ida; }
    const volta = [];
    for (let i = pts.length - 1; i > 0; i--) seg(pts[i], pts[i - 1], volta);
    return ida.concat(volta);
  }
  // onde o guarda começa na trilha (o ponto mais perto de onde ele está)
  function inicio(tr, g) { let best = 0, d = Infinity; tr.forEach(([x, y], i) => { const e = Math.abs(x - g.x) + Math.abs(y - g.y); if (e < d) { d = e; best = i; } }); return best; }

  /* O calor: Float32Array W×H (0 a 1), a parte das vezes em que algum guarda vê o quadrado. */
  function calor(M) {
    const { W, H } = M, out = new Float32Array(W * H), visto = new Float32Array(W * H);
    const todos = new Float32Array(W * H).fill(1);                       // a chance de NÃO ser visto por nenhum
    for (const g of M.guardas) {
      visto.fill(0);
      const tr = trilha(g), i0 = inicio(tr, g), passo = Math.max(1, g.passo || 3), R = g.r || 6, meia = ((g.a || 90) / 2) * Math.PI / 180;
      for (let s = 0; s < PASSOS; s++) {
        const [gx, gy, d] = tr[(i0 + s * passo) % tr.length], dir = (tr.length === 1 ? g.dir : d) * Math.PI / 180;
        for (let y = Math.max(0, gy - R); y <= Math.min(H - 1, gy + R); y++) for (let x = Math.max(0, gx - R); x <= Math.min(W - 1, gx + R); x++) {
          const dx = x - gx, dy = y - gy, dist = Math.hypot(dx, dy);
          if (dist > R + 0.01) continue;
          if (dist > 0.5) { let df = Math.atan2(dy, dx) - dir; df = Math.atan2(Math.sin(df), Math.cos(df)); if (Math.abs(df) > meia + 0.05) continue; }
          if (!ve(M, gx, gy, x, y)) continue;
          visto[y * W + x] += 1;
        }
      }
      for (let k = 0; k < W * H; k++) todos[k] *= 1 - visto[k] / PASSOS;
    }
    for (let k = 0; k < W * H; k++) out[k] = 1 - todos[k];
    return out;
  }

  /* A rota de `de` a `para` (Dijkstra, 8 vizinhos, pelas arestas de passo): o custo de cada quadrado é 1 + peso × calor.
     → { pts: [[x, y]…], n (quadrados), risco (a soma do calor) } | null */
  function rota(M, C, peso, evita) {
    if (!M.de || !M.para) return null;
    const { W, H } = M, N = W * H, dist = new Float64Array(N).fill(Infinity), de = new Int32Array(N).fill(-1), feito = new Uint8Array(N);
    const s = M.de[1] * W + M.de[0], t = M.para[1] * W + M.para[0];
    if (s < 0 || t < 0 || s >= N || t >= N) return null;
    dist[s] = 0;
    // a fila de prioridade (um heap binário de [custo, casa])
    const hc = [], hv = [];
    const poe = (c, v) => { let i = hc.length; hc.push(c); hv.push(v); while (i) { const p = (i - 1) >> 1; if (hc[p] <= hc[i]) break; [hc[p], hc[i]] = [hc[i], hc[p]]; [hv[p], hv[i]] = [hv[i], hv[p]]; i = p; } };
    const tira = () => { const v = hv[0], lc = hc.pop(), lv = hv.pop(); if (hc.length) { hc[0] = lc; hv[0] = lv; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < hc.length && hc[l] < hc[m]) m = l; if (r < hc.length && hc[r] < hc[m]) m = r; if (m === i) break; [hc[m], hc[i]] = [hc[i], hc[m]]; [hv[m], hv[i]] = [hv[i], hv[m]]; i = m; } } return v; };
    poe(0, s);
    while (hc.length) {
      const u = tira();
      if (feito[u]) continue; feito[u] = 1;
      if (u === t) break;
      const ux = u % W, uy = (u - ux) / W;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const vx = ux + dx, vy = uy + dy;
        if (vx < 0 || vy < 0 || vx >= W || vy >= H) continue;
        if (!passa(M, M.pV, M.pH, ux, uy, dx, dy)) continue;
        const v = vy * W + vx, c = dist[u] + (dx && dy ? 1.41 : 1) * (1 + peso * C[v] + (evita ? evita[v] : 0));
        if (c < dist[v]) { dist[v] = c; de[v] = u; poe(c, v); }
      }
    }
    if (!isFinite(dist[t])) return null;
    const pts = []; let risco = 0;
    for (let v = t; v !== -1; v = de[v]) { pts.push([v % W, Math.floor(v / W)]); risco += C[v]; if (v === s) break; }
    pts.reverse();
    return { pts, n: pts.length, risco };
  }
  // a nota da dificuldade pelo risco da rota segura (a soma do calor: ~ quantas vezes ela é vista no caminho)
  const nivelDe = risco => (risco < 1.2 ? 'facil' : risco < 2.8 ? 'medio' : risco < 4.5 ? 'dificil' : 'muito');
  const nomeNivel = k => (NIVEIS.find(x => x[0] === k) || NIVEIS[1])[1];

  // quanto duas rotas têm em comum (0 a 1, pela menor)
  function comum(a, b) { const sa = new Set(a.pts.map(([x, y]) => x + ',' + y)); return b.pts.filter(([x, y]) => sa.has(x + ',' + y)).length / Math.min(a.n, b.n); }
  const pc = r => Math.round(Math.min(1, r.risco / Math.max(1, r.n)) * 100);
  /* Tudo de uma vez → { C (o calor), curta, segura, outra (um caminho diferente, se houver), caminhos (1 ou 2), nivel, vigiado (%), texto } */
  function medir(M) {
    const C = calor(M), { W, H } = M;
    let soma = 0; for (let k = 0; k < W * H; k++) soma += C[k];
    const vigiado = Math.round(soma / (W * H) * 100);
    if (!M.de || !M.para) {
      const nivel = M.guardas.length ? nivelDe(vigiado / 6) : 'facil';
      return { C, curta: null, segura: null, outra: null, caminhos: 0, nivel, vigiado, semRota: true,
        texto: `${vigiado}% do mapa está à vista dos guardas (com eles andando). Para medir a dificuldade e os caminhos, ponha no mapa a Chegada e o Alvo da missão (os objetos do grupo Perigo).` };
    }
    const curta = rota(M, C, 0), segura = curta && rota(M, C, 25);
    if (!curta) return { C, curta: null, segura: null, outra: null, caminhos: 0, nivel: 'muito', vigiado, texto: 'Não há caminho da chegada até o alvo: as paredes fecham tudo. Abra uma porta ou uma janela.' };
    // um segundo caminho: o mais seguro que fuja da curta (se o seguro já foge dela, é ele)
    let outra = comum(curta, segura) < 0.6 ? segura : null;
    if (!outra) {
      const ev = new Float32Array(W * H);
      for (const [x, y] of curta.pts) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) ev[yy * W + xx] = 6; }
      [M.de, M.para].forEach(([x, y]) => { ev[y * W + x] = 0; });
      const r2 = rota(M, C, 25, ev);
      if (r2 && comum(curta, r2) < 0.6) outra = r2;
    }
    const caminhos = outra ? 2 : 1;
    const melhor = [curta, segura, outra].filter(Boolean).reduce((a, b) => (b.risco < a.risco ? b : a));
    const nivel = nivelDe(melhor.risco);
    let texto = `Dificuldade medida: ${nomeNivel(nivel)}. `;
    if (caminhos === 2) texto += `2 caminhos até o alvo: o curto (${curta.n} quadrados, ${pc(curta)}% à vista) e o ${outra === segura ? 'seguro' : 'outro'} (${outra.n} quadrados, ${pc(outra)}% à vista).`;
    else texto += `Só 1 caminho até o alvo (${curta.n} quadrados, ${pc(curta)}% à vista). Vale abrir outra entrada: uma janela, uma porta dos fundos.`;
    return { C, curta, segura, outra, caminhos, nivel, vigiado, texto };
  }
  const ordem = k => NIVEIS.findIndex(n => n[0] === k);
  /* (gerador) Põe ou tira guardas até a dificuldade medida bater com a escolhida. → { med, tirados, postos } */
  function ajustar(p, alvo) {
    const want = ordem(alvo);
    let med = medir(doPlano(p)), tirados = 0, postos = 0, volta = 0;
    if (want < 0 || med.semRota || !med.curta) return { med, tirados, postos };
    while (ordem(med.nivel) > want && p.guardas.length && volta++ < 14) {
      // tira o guarda que mais pesa (o que deixa o caminho mais seguro quando sai)
      let best = -1, bm = null;
      p.guardas.forEach((g, i) => { const m = medir(doPlano(Object.assign({}, p, { guardas: p.guardas.filter((_, j) => j !== i) }))); const r = melhorRisco(m); if (!bm || r < melhorRisco(bm)) { best = i; bm = m; } });
      p.guardas.splice(best, 1); med = bm; tirados++;
    }
    while (ordem(med.nivel) < want && postos < 6 && volta++ < 14) {
      // põe um guarda de posto no caminho mais seguro, onde está mais escuro, olhando para quem vem
      const rt = [med.curta, med.segura, med.outra].filter(Boolean).reduce((a, b) => (b.risco < a.risco ? b : a));
      if (rt.n < 6) break;
      let bi = -1, bv = Infinity;
      for (let i = Math.floor(rt.n * 0.3); i <= Math.floor(rt.n * 0.85); i++) { const [x, y] = rt.pts[i], v = med.C[y * p.W + x]; if (v < bv && !p.guardas.some(g => g.x === x && g.y === y)) { bv = v; bi = i; } }
      if (bi < 0) break;
      const [x, y] = rt.pts[bi], [bx, by] = rt.pts[Math.max(0, bi - 3)];
      const dir = ((Math.round(Math.atan2(by - y, bx - x) * 180 / Math.PI / 45) * 45) % 360 + 360) % 360;
      p.guardas.push({ x, y, ronda: { pts: [], r: 6, a: 100, dir }, posto: true, ajuste: true });
      med = medir(doPlano(p)); postos++;
    }
    return { med, tirados, postos };
  }
  const melhorRisco = m => (m.curta ? [m.curta, m.segura, m.outra].filter(Boolean).reduce((a, b) => Math.min(a, b.risco), Infinity) : 99);

  /* ---------------- o plano do gerador (em quadrados) ---------------- */
  function doPlano(p) {
    const M = novo(p.W, p.H);
    for (const w of p.paredes || []) { const [v, ps] = efeito(w); parede(M, w.x1, w.y1, w.x2, w.y2, v, ps); }
    for (const g of p.guardas || []) { const r = g.ronda || {}; M.guardas.push({ x: g.x, y: g.y, pts: r.pts || [], passo: r.passo, modo: r.modo, r: r.r, a: r.a, dir: r.dir || 0 }); }
    if (Array.isArray(p.chegada)) M.de = [clamp(Math.floor(p.chegada[0]), 0, p.W - 1), clamp(Math.floor(p.chegada[1]), 0, p.H - 1)];
    const mk = (p.marcas || []).find(m => m.id === 'alvoMissao'), esc = (p.objetos || []).find(o => o.id === 'escada' || o.id === 'alcapao');
    const av = p.alvo && typeof p.alvo === 'object' && isFinite(p.alvo.x) ? p.alvo : null;
    let para = mk ? [mk.x, mk.y] : av ? [av.x, av.y] : esc ? [esc.x, esc.y] : null;
    // sem alvo: o meio da sala mais longe da chegada (o fundo da casa)
    if (!para && M.de && (p.salas || []).length) { const q = p.salas.slice().sort((a, b) => Math.hypot(b.x + b.w / 2 - M.de[0], b.y + b.h / 2 - M.de[1]) - Math.hypot(a.x + a.w / 2 - M.de[0], a.y + a.h / 2 - M.de[1]))[0]; para = [q.x + Math.floor(q.w / 2), q.y + Math.floor(q.h / 2)]; }
    if (para) M.para = [clamp(Math.floor(para[0]), 0, p.W - 1), clamp(Math.floor(para[1]), 0, p.H - 1)];
    return M;
  }

  /* ---------------- a cena (em pixels → quadrados) ---------------- */
  function daCena(sc) {
    const c = sc.cell, M = novo(sc.cols, sc.rows);
    for (const w of sc.walls || []) { const [v, ps] = efeito(w); parede(M, w.x1 / c, w.y1 / c, w.x2 / c, w.y2 / c, v, ps); }
    for (const t of (sc.tokens || []).filter(x => !x.prop && x.ronda && typeof x.ronda === 'object')) {
      const r = t.ronda, al = t.alerta === 'desconfiado' ? [1.25, 20] : t.alerta === 'alerta' ? [1.5, 40] : [1, 0];
      M.guardas.push({ x: Math.round(t.x / c), y: Math.round(t.y / c), pts: t.alerta === 'alerta' ? [] : r.pts || [], passo: r.passo, modo: r.modo, r: Math.round((r.r || 6) * al[0]), a: (r.a || 90) + al[1], dir: r.dir || 0 });
    }
    const tk = sc.tokens || [], ch = tk.find(x => x.prop === 'chegada'), al = tk.find(x => x.prop === 'alvoMissao') || tk.find(x => x.prop === 'escada' || x.prop === 'alcapao');
    if (ch) M.de = [clamp(Math.floor(ch.x / c), 0, sc.cols - 1), clamp(Math.floor(ch.y / c), 0, sc.rows - 1)];
    if (al) M.para = [clamp(Math.floor(al.x / c), 0, sc.cols - 1), clamp(Math.floor(al.y / c), 0, sc.rows - 1)];
    return M;
  }

  /* ---------------- o desenho (o calor e as rotas), em cima de um canvas com `cell` px por quadrado e um deslocamento ---------------- */
  function desenhar(g, M, med, cell, ox, oy) {
    const { W, H } = M, C = med.C;
    g.save();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = C[y * W + x];
      if (v < 0.02) continue;
      const r = v < 0.35 ? [240, 200, 70] : v < 0.7 ? [240, 140, 60] : [230, 70, 60];
      g.fillStyle = `rgba(${r[0]},${r[1]},${r[2]},${(0.18 + v * 0.42).toFixed(3)})`;
      g.fillRect(ox + x * cell, oy + y * cell, cell, cell);
    }
    const linha = (rt, cor, tr) => {
      if (!rt || rt.pts.length < 2) return;
      g.strokeStyle = cor; g.lineWidth = Math.max(2, cell * 0.22); g.setLineDash(tr ? [cell * 0.5, cell * 0.35] : []); g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath(); rt.pts.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, ox + (x + 0.5) * cell, oy + (y + 0.5) * cell)); g.stroke();
    };
    linha(med.curta, 'rgba(255,214,90,0.95)', true);
    if (med.outra) linha(med.outra, 'rgba(110,220,140,0.95)', false);
    const ponto = (p, cor) => { if (!p) return; g.setLineDash([]); g.fillStyle = cor; g.strokeStyle = '#1a1208'; g.lineWidth = 2; g.beginPath(); g.arc(ox + (p[0] + 0.5) * cell, oy + (p[1] + 0.5) * cell, Math.max(4, cell * 0.38), 0, Math.PI * 2); g.fill(); g.stroke(); };
    ponto(M.de, '#7fd1ff'); ponto(M.para, '#ffd34d');
    g.restore();
  }
  /* ---------------- na cena (só o mestre): a medida, guardada até algo mudar (um guarda andar, uma porta abrir) ---------------- */
  let cache = { k: null, v: null };
  function chave(sc) {
    const gs = (sc.tokens || []).filter(t => !t.prop && t.ronda && typeof t.ronda === 'object').map(t => [t.x, t.y, t.ronda.i, t.ronda.dir, t.ronda.pts && t.ronda.pts.length, t.alerta || ''].join(','));
    const mk = (sc.tokens || []).filter(t => ['chegada', 'alvoMissao', 'escada', 'alcapao'].includes(t.prop)).map(t => t.prop + t.x + ',' + t.y);
    return [sc.id, sc.cols, sc.rows, gs.join(';'), mk.join(';'), (sc.walls || []).map(w => (w.k || 'w')[0] + (w.open ? 1 : 0)).join('')].join('|');
  }
  function daCenaMedida(sc) {
    const k = chave(sc);
    if (cache.k !== k) { const M = daCena(sc); cache = { k, v: { M, med: medir(M) } }; }
    return cache.v;
  }
  const ligado = () => App.opt.gdCalor === true;
  function desenharCena(c, sc) {
    if (!isGM() || !ligado()) return;
    if (!(sc.tokens || []).some(t => !t.prop && t.ronda && typeof t.ronda === 'object')) return;
    const { M, med } = daCenaMedida(sc);
    desenhar(c, M, med, sc.cell, 0, 0);
  }
  return { cruza, ligado, daCenaMedida, desenharCena, NIVEIS, nomeNivel, nivelDe, novo, parede, efeito, calor, rota, medir, ajustar, comum, doPlano, daCena, desenhar, trilha, ve };
})();
