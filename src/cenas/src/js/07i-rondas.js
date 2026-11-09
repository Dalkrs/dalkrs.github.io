/* ---------------------------------------------------------------
   7i. AS RONDAS DOS GUARDAS (lote 121) — para as missões de furtividade.
   Um token vira guarda no painel dele (bloco "Guarda") ou já nasce guarda nos lugares de furtividade do "Gerar um
   lugar…". O guarda tem (em t.ronda, só do mestre — os jogadores nunca recebem):
     · a rota: os pontos por onde ele passa (o canto do token, em quadrados), percorridos de ida e volta ou em círculo;
       sem rota (um ponto só, ou nenhum), é um posto fixo, olhando para um lado;
     · os passos: quantos quadrados ele anda cada vez que o mestre aperta "Avançar rondas";
     · o cone de visão: o alcance (em quadrados), a abertura (em graus) e para onde ele olha (o rumo do último passo);
   e o estado (t.alerta): Calmo, Desconfiado ou Alerta. Desconfiado, ele enxerga mais longe e mais aberto; em Alerta, mais
   ainda, e larga a rota (o mestre move à mão).
   Só o mestre vê as rotas (tracejadas), os cones (na cor do estado, cortados pelas paredes) e o "!" de quem foi visto.
   Visto: dentro do cone, sem parede no meio, e na luz (de dia, ou ao alcance de uma luz); na sombra, só bem de perto —
   mais longe, "pode ter notado". Quem está Oculto (a condição) não é visto.
   Nada anda sozinho: o mestre aperta "Avançar rondas" (no grupo Mestre do trilho, ou no menu do botão direito), com
   Desfazer.
   --------------------------------------------------------------- */
const Rondas = (() => {
  const ESTADOS = [['calmo', 'Calmo'], ['desconfiado', 'Desconfiado'], ['alerta', 'Alerta']];
  const MODOS = [['ida', 'Vai e volta'], ['volta', 'Em círculo']];
  const COR = { calmo: [110, 200, 120], desconfiado: [240, 196, 72], alerta: [240, 92, 78] };
  const MAIS = { calmo: [1, 0], desconfiado: [1.25, 20], alerta: [1.5, 40] };       // o alcance × e a abertura + (graus)
  const PADRAO = { r: 6, a: 90, passo: 3, modo: 'ida' };
  const MAX_PTS = 40;
  const num = (v, a, b, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? clamp(n, a, b) : d; };

  /* ---------------- os dados ---------------- */
  function limpar(t) {
    const r = t && t.ronda;
    if (!t || t.prop || !r || typeof r !== 'object' || Array.isArray(r)) { if (t) { delete t.ronda; delete t.alerta; } return; }
    const pts = Array.isArray(r.pts) ? r.pts.filter(p => Array.isArray(p) && p.length === 2 && p.every(v => Number.isFinite(Number(v)))).slice(0, MAX_PTS).map(p => [num(p[0], 0, 999, 0), num(p[1], 0, 999, 0)]) : [];
    t.ronda = { pts, i: num(r.i, 0, Math.max(0, pts.length - 1), 0), s: r.s === -1 ? -1 : 1, modo: r.modo === 'volta' ? 'volta' : 'ida', passo: num(r.passo, 1, 12, PADRAO.passo), r: num(r.r, 1, 40, PADRAO.r), a: num(r.a, 20, 360, PADRAO.a), dir: ((num(r.dir, -720, 720, 90) % 360) + 360) % 360 };
    if (ESTADOS.some(e => e[0] === t.alerta)) { if (t.alerta === 'calmo') delete t.alerta; } else delete t.alerta;
  }
  const ehGuarda = t => !!(t && !t.prop && t.ronda && typeof t.ronda === 'object');
  const estadoDe = t => (ESTADOS.some(e => e[0] === t.alerta) ? t.alerta : 'calmo');
  const guardas = sc => (sc ? sc.tokens.filter(ehGuarda) : []);
  const novaRonda = o => Object.assign({ pts: [], i: 0, s: 1, modo: PADRAO.modo, passo: PADRAO.passo, r: PADRAO.r, a: PADRAO.a, dir: 90 }, o || {});

  /* ---------------- o cone ---------------- */
  // → { cx, cy, R (em unidades da cena), dir, meia (radianos), est }
  function cone(t, sc) {
    const est = estadoDe(t), [k, mais] = MAIS[est], [cx, cy, half] = tokC(t, sc), r = t.ronda;
    return { cx, cy, R: r.r * k * sc.cell + half, dir: rad(r.dir), meia: rad(Math.min(360, r.a + mais)) / 2, est };
  }
  // o que o guarda enxerga (o polígono das paredes), guardado até as paredes ou ele mudarem
  const cache = new Map();
  function poligono(t, sc, g) {
    g = g || cone(t, sc);
    const chave = [sc.id, Math.round(g.cx), Math.round(g.cy), Math.round(g.R), Walls.of(sc).stamp].join(':');
    const c = cache.get(t.id);
    if (c && c.k === chave) return c.p;
    const p = Geo.visPoly(g.cx + 0.31, g.cy + 0.17, Walls.sightFor(sc, t), g.cx - g.R, g.cy - g.R, g.cx + g.R, g.cy + g.R);
    cache.set(t.id, { k: chave, p });
    if (cache.size > 300) cache.clear();
    return p;
  }
  const angDif = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return Math.abs(d); };
  function noCone(g, x, y, folga) {
    const d = Math.hypot(x - g.cx, y - g.cy);
    if (d > g.R + (folga || 0)) return false;
    if (g.meia >= Math.PI - 1e-6 || d < 1e-6) return true;
    return angDif(Math.atan2(y - g.cy, x - g.cx), g.dir) <= g.meia + (d > 0 ? Math.atan2(folga || 0, d) : 0);
  }
  // a linha reta de a até b passa por algo que barra a vista?
  function barra(segs, ax, ay, bx, by) {
    for (let i = 0; i + 3 < segs.length; i += 4) if (Geo.segHit(ax, ay, bx, by, segs[i], segs[i + 1], segs[i + 2], segs[i + 3])) return true;
    return false;
  }
  // (x, y) está na luz? De dia, sempre; senão, ao alcance de uma luz acesa, sem parede no meio
  function naLuz(sc, x, y) {
    if (sc.light === 'claro') return true;
    const segs = Walls.of(sc).sightAll, c = sc.cell;
    const fontes = (sc.lights || []).filter(l => l.on !== false).map(l => [l.x, l.y, l.dim * c]);
    for (const t of sc.tokens) if (t.light && t.light.on && !t.hidden && t.light.dim > 0) { const [lx, ly, h] = tokC(t, sc); fontes.push([lx, ly, t.light.dim * c + h]); }
    return fontes.some(([lx, ly, r]) => Math.hypot(x - lx, y - ly) <= r && !barra(segs, lx, ly, x, y));
  }
  /* Quem cada guarda vê agora: [{ g (o guarda), t (o visto), nivel: 'visto' | 'sombra' }]. Os vistos: os tokens dos
     jogadores (com dono), à mostra, que não estão Ocultos. */
  function quemVe(sc) {
    const out = [], alvos = sc.tokens.filter(t => !t.prop && t.owner && !t.hidden && !ehGuarda(t) && !(t.conds || []).includes('oculto'));
    if (!alvos.length) return out;
    for (const gd of guardas(sc)) {
      const g = cone(gd, sc), segs = Walls.sightFor(sc, gd);
      for (const t of alvos) {
        const [x, y, half] = tokC(t, sc);
        if (!noCone(g, x, y, half * 0.6) || barra(segs, g.cx, g.cy, x, y)) continue;
        const perto = Math.hypot(x - g.cx, y - g.cy) <= g.R * 0.4;
        out.push({ g: gd, t, nivel: perto || naLuz(sc, x, y) ? 'visto' : 'sombra' });
      }
    }
    return out;
  }

  /* ---------------- avançar ---------------- */
  // o caminho do guarda nesta vez: anda `passo` quadrados (um de cada vez, também na diagonal) rumo ao ponto da vez
  function andar(t, sc) {
    const r = t.ronda, n = r.pts.length, c = sc.cell;
    if (n < 2 || estadoDe(t) === 'alerta') return null;
    let x = Math.round(t.x / c), y = Math.round(t.y / c), i = clamp(r.i, 0, n - 1), s = r.s, dir = r.dir, andou = 0;
    const proximo = () => {
      if (r.modo === 'volta') { i = (i + 1) % n; return; }
      if (i + s < 0 || i + s >= n) s = -s;
      i += s;
    };
    for (let volta = 0; andou < r.passo && volta < r.passo + n * 2 + 4; volta++) {
      const [tx, ty] = r.pts[i];
      if (x === tx && y === ty) { proximo(); continue; }
      const dx = Math.sign(tx - x), dy = Math.sign(ty - y);
      x += dx; y += dy; andou++;
      dir = ((Math.round(deg(Math.atan2(dy, dx))) % 360) + 360) % 360;
      if (x === tx && y === ty) proximo();
    }
    if (!andou) return null;
    const [nx, ny] = snapTok(sc, x * c, y * c, t.size, false);
    return { x: nx, y: ny, ronda: Object.assign({}, r, { i, s, dir }) };
  }
  function avancar() {
    const sc = Store.scene();
    if (!sc || !isGM()) return;
    const gs = guardas(sc);
    if (!gs.length) { UI.toast('Nenhum guarda nesta cena. No painel de um token, bloco "Guarda", ele ganha a ronda e o cone de visão.'); return; }
    const mud = gs.map(t => [t, andar(t, sc)]).filter(([, m]) => m);
    if (mud.length) Store.tx('Avançar rondas', () => { for (const [t, m] of mud) Store.upd('tokens', t.id, m); });
    const parados = gs.filter(t => estadoDe(t) === 'alerta').length;
    const vistos = quemVe(Store.scene()), txt = resumoVistos(vistos);
    const base = mud.length ? `${mud.length === 1 ? '1 guarda andou' : mud.length + ' guardas andaram'}` : 'Nenhum guarda andou';
    UI.toast(base + (parados ? ` (${parados} em alerta, ${parados === 1 ? 'parado' : 'parados'})` : '') + '. ' + (txt || 'Ninguém foi visto.'), Object.assign({ long: !!txt, key: 'rondas' }, mud.length ? { action: 'Desfazer', run: Tools.undo } : {}));
    if (vistos.some(v => v.nivel === 'visto') && typeof Som !== 'undefined' && Som.aviso) try { Som.aviso('alerta'); } catch (e) { /* sem som */ }
  }
  function resumoVistos(vistos) {
    if (!vistos.length) return '';
    const por = new Map();
    for (const v of vistos) { const k = v.t.id, o = por.get(k) || { t: v.t, visto: [], sombra: [] }; o[v.nivel].push(v.g.name); por.set(k, o); }
    return [...por.values()].map(o => o.visto.length ? `${o.visto[0]} vê ${o.t.name}!` : `${o.sombra[0]} pode ter notado ${o.t.name} (na sombra).`).join(' ');
  }
  function mudarEstado(ts, est) {
    if (!ESTADOS.some(e => e[0] === est)) return;
    Store.tx('Estado do guarda', () => ts.filter(ehGuarda).forEach(t => Store.upd('tokens', t.id, { alerta: est === 'calmo' ? undefined : est })));
  }

  /* ---------------- o desenho (só o mestre) ---------------- */
  const mostrar = () => isGM() && App.opt.rondasVer !== false;
  const rgba = (est, a) => `rgba(${COR[est].join(',')},${a})`;
  function desenhar(c, sc, px) {
    if (!mostrar()) return;
    const gs = guardas(sc);
    if (!gs.length) return;
    const cell = sc.cell, sel = new Set(App.sel.filter(s => s.c === 'tokens').map(s => s.id));
    c.save();
    // os cones (cortados pelas paredes), na cor do estado
    for (const t of gs) {
      const g = cone(t, sc), poly = poligono(t, sc, g);
      c.save();
      c.beginPath(); for (let i = 0; i < poly.length; i += 2) (i ? c.lineTo(poly[i], poly[i + 1]) : c.moveTo(poly[i], poly[i + 1])); c.closePath(); c.clip();
      c.beginPath(); c.moveTo(g.cx, g.cy);
      if (g.meia >= Math.PI - 1e-6) c.arc(g.cx, g.cy, g.R, 0, TAU); else c.arc(g.cx, g.cy, g.R, g.dir - g.meia, g.dir + g.meia);
      c.closePath();
      const gr = c.createRadialGradient(g.cx, g.cy, 0, g.cx, g.cy, g.R);
      gr.addColorStop(0, rgba(g.est, t.hidden ? 0.22 : 0.3)); gr.addColorStop(1, rgba(g.est, 0.06));
      c.fillStyle = gr; c.fill();
      c.strokeStyle = rgba(g.est, 0.75); c.lineWidth = 1.4 * px; c.setLineDash([5 * px, 4 * px]); c.stroke(); c.setLineDash([]);
      c.restore();
    }
    // as rotas: tracejadas, com os pontos e a seta para o próximo; a do selecionado, mais forte
    for (const t of gs) {
      const r = t.ronda, [w, h] = tokWH(t), m = [w * cell / 2, h * cell / 2], on = sel.has(t.id), est = estadoDe(t);
      if (!r.pts.length) continue;
      const P = r.pts.map(([i, j]) => [i * cell + m[0], j * cell + m[1]]);
      c.globalAlpha = on ? 0.95 : 0.55;
      c.strokeStyle = 'rgba(8,10,16,0.7)'; c.lineWidth = 4 * px; c.setLineDash([8 * px, 6 * px]);
      const traco = () => { c.beginPath(); P.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); if (r.modo === 'volta' && P.length > 2) c.closePath(); c.stroke(); };
      traco(); c.strokeStyle = rgba(est, 1); c.lineWidth = 2 * px; traco(); c.setLineDash([]);
      P.forEach(([x, y], k) => { c.beginPath(); c.arc(x, y, (k === r.i ? 5.5 : 3.5) * px, 0, TAU); c.fillStyle = k === r.i ? rgba(est, 1) : '#f3ead2'; c.fill(); c.strokeStyle = 'rgba(8,10,16,0.85)'; c.lineWidth = 1.2 * px; c.stroke(); });
      // do guarda até o ponto da vez
      const [cx, cy] = tokC(t, sc), alvo = P[clamp(r.i, 0, P.length - 1)];
      if (P.length > 1 && Math.hypot(alvo[0] - cx, alvo[1] - cy) > cell * 0.4) {
        c.strokeStyle = rgba(est, 0.9); c.lineWidth = 1.5 * px; c.setLineDash([2 * px, 4 * px]);
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(alvo[0], alvo[1]); c.stroke(); c.setLineDash([]);
      }
      c.globalAlpha = 1;
    }
    c.restore();
  }
  // os selos por cima dos tokens: o "?" e o "!" dos guardas e o "!" vermelho em quem está sendo visto
  function selos(c, sc, px) {
    if (!mostrar()) return;
    const gs = guardas(sc);
    if (!gs.length) return;
    const selo = (x, y, txt, cor) => {
      const r = 9 * px;
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = cor; c.fill(); c.strokeStyle = 'rgba(8,10,16,0.9)'; c.lineWidth = 1.5 * px; c.stroke();
      c.fillStyle = '#16120a'; c.font = `700 ${12 * px}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, x, y + 0.5 * px);
    };
    c.save();
    for (const t of gs) {
      const est = estadoDe(t);
      if (est === 'calmo') continue;
      const [w] = tokWH(t);
      selo(t.x + w * sc.cell - 3 * px, t.y + 3 * px, est === 'alerta' ? '!' : '?', rgba(est, 1));
    }
    const vistos = quemVe(sc), ja = new Set();
    for (const v of vistos) {
      if (ja.has(v.t.id) && v.nivel !== 'visto') continue;
      ja.add(v.t.id);
      const [cx, cy, half] = tokC(v.t, sc), cor = v.nivel === 'visto' ? '#f05c4e' : '#f0c448';
      c.beginPath(); c.arc(cx, cy, half + 5 * px, 0, TAU); c.strokeStyle = cor; c.lineWidth = 2.5 * px; c.setLineDash(v.nivel === 'visto' ? [] : [5 * px, 4 * px]); c.stroke(); c.setLineDash([]);
      selo(cx + half * 0.75, cy - half * 0.95, v.nivel === 'visto' ? '!' : '?', cor);
    }
    c.restore();
  }

  /* ---------------- a rota sendo desenhada ---------------- */
  // (a ferramenta "ronda" de 09-tools: cada clique põe um ponto na rota do guarda App.rondaDe; Enter, dois cliques ou
  // Esc terminam; Backspace tira o último ponto)
  function pontoDe(t, sc, p) {
    const [w, h] = tokWH(t);
    return [clamp(Math.round(p.x / sc.cell - w / 2), 0, sc.cols - Math.ceil(w)), clamp(Math.round(p.y / sc.cell - h / 2), 0, sc.rows - Math.ceil(h))];
  }
  function editando() { const sc = Store.scene(), t = sc && App.rondaDe ? Store.get('tokens', App.rondaDe) : null; return ehGuarda(t) ? t : null; }
  function porPonto(p) {
    const t = editando(), sc = Store.scene();
    if (!t) { Tools.set('select'); return; }
    const pt = pontoDe(t, sc, p), r = t.ronda, ult = r.pts[r.pts.length - 1];
    if (ult && ult[0] === pt[0] && ult[1] === pt[1]) return;
    if (r.pts.length >= MAX_PTS) { UI.toast(`A rota vai até ${MAX_PTS} pontos.`); return; }
    const pts = r.pts.concat([pt]);
    // o rumo do posto: do guarda para o primeiro ponto (com um ponto só, ele fica parado, olhando para lá)
    const [cx, cy] = tokC(t, sc), o = pts.length === 1 ? { dir: ((Math.round(deg(Math.atan2((pt[1] + tokWH(t)[1] / 2) * sc.cell - cy, (pt[0] + tokWH(t)[0] / 2) * sc.cell - cx))) % 360) + 360) % 360 } : {};
    Store.tx('Rota do guarda', () => Store.upd('tokens', t.id, { ronda: Object.assign({}, r, { pts, i: 0, s: 1 }, o) }));
  }
  function tirarPonto() {
    const t = editando();
    if (!t || !t.ronda.pts.length) return;
    Store.tx('Rota do guarda', () => Store.upd('tokens', t.id, { ronda: Object.assign({}, t.ronda, { pts: t.ronda.pts.slice(0, -1), i: 0, s: 1 }) }));
  }
  function terminar() {
    const t = editando();
    App.rondaDe = null;
    Tools.set('select');
    if (t) { setSel([{ c: 'tokens', id: t.id }]); UI.toast(t.ronda.pts.length > 1 ? `A rota de ${t.name} tem ${t.ronda.pts.length} pontos. "Avançar rondas" (no grupo Mestre, à esquerda, ou no botão direito) faz os guardas andarem.` : `${t.name} fica de posto${t.ronda.pts.length ? ', olhando para o ponto marcado' : ''}.`, { key: 'rondas' }); }
  }
  function previaRota(ctx, px, sc, mouse) {
    const t = editando();
    if (!t) return;
    const [w, h] = tokWH(t), c = sc.cell, r = t.ronda, ult = r.pts.length ? r.pts[r.pts.length - 1] : [Math.round(t.x / c), Math.round(t.y / c)];
    if (!mouse) return;
    const pt = pontoDe(t, sc, mouse);
    ctx.save(); ctx.strokeStyle = 'rgba(230,171,79,0.9)'; ctx.lineWidth = 2 * px; ctx.setLineDash([6 * px, 5 * px]);
    ctx.beginPath(); ctx.moveTo((ult[0] + w / 2) * c, (ult[1] + h / 2) * c); ctx.lineTo((pt[0] + w / 2) * c, (pt[1] + h / 2) * c); ctx.stroke();
    ctx.setLineDash([]); ctx.strokeRect(pt[0] * c + 2 * px, pt[1] * c + 2 * px, w * c - 4 * px, h * c - 4 * px);
    ctx.restore();
  }
  function desenharRota(t) {
    if (!ehGuarda(t)) return;
    App.rondaDe = t.id;
    Tools.set('ronda');
    UI.toast(`Clique no mapa para pôr os pontos da rota de ${t.name}, na ordem. Enter ou dois cliques terminam; Backspace tira o último.`, { key: 'rondas', long: true });
  }

  /* ---------------- o painel do token (bloco "Guarda") ---------------- */
  function secao(t, K) {
    if (!isGM() || t.prop) return null;
    const U = (p, l) => Store.tx(l || 'Guarda', () => Store.upd('tokens', t.id, p));
    if (!ehGuarda(t)) return K.secR('s-guarda', 'Guarda', false, 'não é guarda',
      K.note('Para missões de furtividade: o guarda ganha uma rota (ou um posto), o cone de visão e o estado (Calmo, Desconfiado, Alerta). Só o mestre vê.'),
      h('div', { class: 'row' }, K.btn('Fazer guarda', () => { U({ ronda: novaRonda({ dir: 90 }) }, 'Fazer guarda'); desenharRota(Store.get('tokens', t.id)); }, { kind: 'small', icon: 'ronda', id: 'tk-guarda' })));
    const r = t.ronda, R = v => U({ ronda: Object.assign({}, r, v) });
    const rumo = [[270, '↑'], [315, '↗'], [0, '→'], [45, '↘'], [90, '↓'], [135, '↙'], [180, '←'], [225, '↖']];
    return K.secR('s-guarda', 'Guarda', true, ESTADOS.find(e => e[0] === estadoDe(t))[1] + ' · ' + (r.pts.length > 1 ? r.pts.length + ' pontos na rota' : 'de posto'),
      K.field('Estado', K.seg('tk-alerta', estadoDe(t), ESTADOS, v => mudarEstado([t], v)), 'stack'),
      h('div', { class: 'grid2' },
        K.field('Vê até (q)', K.inNum('tk-gr', r.r, v => R({ r: num(v, 1, 40, 6) }), { min: 1, max: 40, step: 1, label: 'Alcance da vista, em quadrados' })),
        K.field('Abertura (°)', K.inNum('tk-ga', r.a, v => R({ a: num(v, 20, 360, 90) }), { min: 20, max: 360, step: 10, label: 'Abertura do cone de visão, em graus' }))),
      K.field('Olhando para', K.seg('tk-grumo', rumo.some(x => x[0] === r.dir) ? r.dir : null, rumo, v => R({ dir: v })), 'stack'),
      r.pts.length > 1 ? h('div', { class: 'grid2' },
        K.field('Passos por vez', K.inNum('tk-gp', r.passo, v => R({ passo: num(v, 1, 12, 3) }), { min: 1, max: 12, step: 1, label: 'Quadrados que ele anda a cada "Avançar rondas"' })),
        K.field('A rota', K.seg('tk-gmodo', r.modo, MODOS, v => R({ modo: v })))) : null,
      h('div', { class: 'row' },
        K.btn(r.pts.length ? 'Refazer a rota' : 'Desenhar a rota', () => { R({ pts: [], i: 0, s: 1 }); desenharRota(Store.get('tokens', t.id)); }, { kind: 'small', icon: 'ronda', id: 'tk-grota' }),
        r.pts.length ? K.btn('Ficar de posto', () => R({ pts: [], i: 0, s: 1 }), { kind: 'small', id: 'tk-gposto', title: 'Apaga a rota: ele fica parado, olhando para o lado escolhido' }) : null,
        K.btn('Não é mais guarda', () => U({ ronda: undefined, alerta: undefined }, 'Deixar de ser guarda'), { kind: 'small', id: 'tk-gfora' })),
      K.note(estadoDe(t) === 'alerta' ? 'Em Alerta, ele larga a rota: você o move à mão.' : 'Desconfiado, ele vê mais longe e mais aberto. Na sombra, só vê bem de perto. Quem está Oculto não é visto.'));
  }

  /* ---------------- o painel do grupo Mestre ---------------- */
  function painel(acao, linha, K) {
    const sc = Store.scene(), gs = guardas(sc), sel = selOf('tokens').filter(ehGuarda);
    const n = { calmo: 0, desconfiado: 0, alerta: 0 };
    gs.forEach(t => n[estadoDe(t)]++);
    return [
      gs.length ? K.note(`${gs.length} ${gs.length === 1 ? 'guarda' : 'guardas'}: ${ESTADOS.filter(e => n[e[0]]).map(e => n[e[0]] + ' ' + e[1].toLowerCase()).join(', ')}.`) : K.note('Nenhum guarda nesta cena. No painel de um token (bloco "Guarda") ele ganha a ronda; os lugares de furtividade já vêm com eles.'),
      linha(acao('Avançar rondas', avancar, { icon: 'ronda', id: 'mtp-rondas', disabled: !gs.length, title: 'Cada guarda anda os passos dele pela rota; o aviso diz quem foi visto' })),
      gs.length ? linha(acao(sel.length ? `Acalmar (${sel.length})` : 'Acalmar todos', () => mudarEstado(sel.length ? sel : gs, 'calmo'), { id: 'mtp-calmo' }),
        acao(sel.length ? `Alerta (${sel.length})` : 'Todos em alerta', () => mudarEstado(sel.length ? sel : gs, 'alerta'), { id: 'mtp-alerta' })) : null,
      K.toggle('mtp-rver', App.opt.rondasVer !== false, v => { App.opt.rondasVer = v; Render.request(); UI.refresh(); }, 'Mostrar rotas e cones (só você vê)'),
    ];
  }

  return { ESTADOS, MODOS, limpar, ehGuarda, estadoDe, guardas, novaRonda, cone, noCone, quemVe, naLuz, andar, avancar, mudarEstado, desenhar, selos, secao, painel, porPonto, tirarPonto, terminar, previaRota, desenharRota, editando, resumoVistos };
})();
