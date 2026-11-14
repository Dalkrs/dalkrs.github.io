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
   (lote 132, pedido do Bruno) O guarda vira sozinho: na ronda, para onde deu o último passo — e, ao chegar num ponto
   da rota, já olha para o trecho seguinte; arrastado à mão (mouse ou setas), para onde foi.
   (lote 132) A vista revelada: quando um jogador usa uma skill para ver o campo de visão de um guarda, o mestre mostra
   o cone dele só para esse jogador (t.ronda.ver: para quem, se a rota vai junto, e por quanto tempo — até o mestre
   desligar, ou N vezes de "Avançar rondas", ou N rodadas de combate). A projeção leva t.vc (o cone, o estado, e a rota
   se o mestre deixou) — e só a tela de quem está em `para` desenha o cone, a cor do estado e o "!" de quem ele vê.
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
    if (t) limparVc(t);
    const r = t && t.ronda;
    if (!t || t.prop || !r || typeof r !== 'object' || Array.isArray(r)) { if (t) { delete t.ronda; delete t.alerta; } return; }
    const pts = Array.isArray(r.pts) ? r.pts.filter(p => Array.isArray(p) && p.length === 2 && p.every(v => Number.isFinite(Number(v)))).slice(0, MAX_PTS).map(p => [num(p[0], 0, 999, 0), num(p[1], 0, 999, 0)]) : [];
    t.ronda = { pts, i: num(r.i, 0, Math.max(0, pts.length - 1), 0), s: r.s === -1 ? -1 : 1, modo: r.modo === 'volta' ? 'volta' : 'ida', passo: num(r.passo, 1, 12, PADRAO.passo), r: num(r.r, 1, 40, PADRAO.r), a: num(r.a, 20, 360, PADRAO.a), dir: ((num(r.dir, -720, 720, 90) % 360) + 360) % 360 };
    const ver = verLimpo(r.ver);
    if (ver) t.ronda.ver = ver;
    // (lote 133) a rota guardada quando o mestre pôs o guarda de posto ("Voltar para a ronda" a traz de volta)
    const gp = r.guardada && Array.isArray(r.guardada.pts) ? r.guardada.pts.filter(p => Array.isArray(p) && p.length === 2 && p.every(v => Number.isFinite(Number(v)))).slice(0, MAX_PTS).map(p => [num(p[0], 0, 999, 0), num(p[1], 0, 999, 0)]) : [];
    if (gp.length > 1 && t.ronda.pts.length < 2) t.ronda.guardada = { pts: gp, i: num(r.guardada.i, 0, gp.length - 1, 0), s: r.guardada.s === -1 ? -1 : 1 };
    if (ESTADOS.some(e => e[0] === t.alerta)) { if (t.alerta === 'calmo') delete t.alerta; } else delete t.alerta;
  }
  // (lote 132) o cone revelado, como chega na tela do jogador (t.vc, da projeção): arrumado ou apagado
  function limparVc(t) {
    const v = t.vc;
    if (t.prop || !v || typeof v !== 'object' || Array.isArray(v) || !Array.isArray(v.para)) { delete t.vc; return; }
    const o = { para: v.para.filter(x => typeof x === 'string').slice(0, 12), r: num(v.r, 1, 40, PADRAO.r), a: num(v.a, 20, 360, PADRAO.a), dir: ((num(v.dir, -720, 720, 90) % 360) + 360) % 360, est: ESTADOS.some(e => e[0] === v.est) ? v.est : 'calmo' };
    if (Array.isArray(v.pts)) { o.pts = v.pts.filter(p => Array.isArray(p) && p.length === 2 && p.every(n => Number.isFinite(Number(n)))).slice(0, MAX_PTS).map(p => [num(p[0], 0, 999, 0), num(p[1], 0, 999, 0)]); o.modo = v.modo === 'volta' ? 'volta' : 'ida'; o.i = num(v.i, 0, Math.max(0, o.pts.length - 1), 0); }
    t.vc = o;
  }
  // (lote 132) a vista revelada: { para: [ids dos jogadores], rota: bool, por: '' | 'rondas' | 'rodadas', n }
  function verLimpo(v) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    const ids = l => (Array.isArray(l) ? [...new Set(l.filter(x => typeof x === 'string' && /^[A-Za-z0-9_*-]{1,60}$/.test(x)))].slice(0, 12) : []);
    // (lote 152) o cone (para) e a rota (rotas) separados, para quem o mestre quiser; o "rota: true" de antes = a rota para os mesmos do cone
    const para = ids(v.para), rotas = v.rota && !(Array.isArray(v.rotas) && v.rotas.length) ? para.slice() : ids(v.rotas);
    if (!para.length && !rotas.length) return null;
    const por = v.por === 'rondas' || v.por === 'rodadas' ? v.por : '';
    const o = { para, rotas, por, n: por ? num(v.n, 1, 99, 1) : 0 };
    return o;
  }
  const ehGuarda = t => !!(t && !t.prop && t.ronda && typeof t.ronda === 'object');
  // (lote 132) na tela de um jogador: o guarda cujo cone o mestre mostrou para ele (t.vc, da projeção)
  const tem = (l, id) => Array.isArray(l) && (l.includes(id) || l.includes('*'));
  const vcMeu = t => !!(t && !t.prop && t.vc && typeof t.vc === 'object' && (tem(t.vc.para, App.viewer) || tem(t.vc.rp, App.viewer)));
  // (lote 152) nesta tela: o cone e a rota de cada guarda (o mestre vê tudo; o jogador, o que foi mostrado a ele)
  const coneMeu = t => isGM() || tem(t.vc && t.vc.para, App.viewer);
  const rotaMeu = t => isGM() || (t.vc && (Array.isArray(t.vc.rp) ? tem(t.vc.rp, App.viewer) : tem(t.vc.para, App.viewer)));
  // o que vale para o cone: no mestre, a ronda; no jogador, o que veio na projeção
  const fonte = t => (ehGuarda(t) ? { r: t.ronda, est: estadoDe(t) } : { r: t.vc, est: ESTADOS.some(e => e[0] === t.vc.est) ? t.vc.est : 'calmo' });
  const vistos = sc => (sc ? (isGM() ? sc.tokens.filter(ehGuarda) : sc.tokens.filter(vcMeu)) : []);
  const estadoDe = t => (ESTADOS.some(e => e[0] === t.alerta) ? t.alerta : 'calmo');
  const guardas = sc => (sc ? sc.tokens.filter(ehGuarda) : []);
  const novaRonda = o => Object.assign({ pts: [], i: 0, s: 1, modo: PADRAO.modo, passo: PADRAO.passo, r: PADRAO.r, a: PADRAO.a, dir: 90 }, o || {});

  /* ---------------- o cone ---------------- */
  // → { cx, cy, R (em unidades da cena), dir, meia (radianos), est }
  function cone(t, sc) {
    const f = fonte(t), est = f.est, [k, mais] = MAIS[est], [cx, cy, half] = tokC(t, sc), r = f.r;
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
  function quemVe(sc, lista) {
    const out = [], alvos = sc.tokens.filter(t => !t.prop && t.owner && !t.hidden && !ehGuarda(t) && !(t.conds || []).includes('oculto'));
    if (!alvos.length) return out;
    for (const gd of lista || guardas(sc)) {
      const g = cone(gd, sc), segs = Walls.sightFor(sc, gd);
      for (const t of alvos) {
        const [x, y, half] = tokC(t, sc);
        if (!noCone(g, x, y, half * 0.6) || barra(segs, g.cx, g.cy, x, y)) continue;
        const perto = Math.hypot(x - g.cx, y - g.cy) <= g.R * 0.4;
        // (lote 133) disfarçado: nunca "visto", só "pode ter notado"
        const disf = typeof Roupas !== 'undefined' && Roupas.disfarcado(t);
        out.push({ g: gd, t, nivel: !disf && (perto || naLuz(sc, x, y)) ? 'visto' : 'sombra', disf });
      }
    }
    return out;
  }

  /* ---------------- avançar ---------------- */
  // o caminho do guarda nesta vez: anda `passo` quadrados (um de cada vez, também na diagonal) rumo ao ponto da vez
  function andar(t, sc) {
    const r = t.ronda, n = r.pts.length, c = sc.cell;
    if (n < 2 || estadoDe(t) === 'alerta') return null;
    let x = Math.round(t.x / c), y = Math.round(t.y / c), i = clamp(r.i, 0, n - 1), s = r.s, dir = r.dir, andou = 0, noPonto = false;
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
      noPonto = x === tx && y === ty;
      if (noPonto) proximo();
    }
    if (!andou) return null;
    // (lote 132) parou bem num ponto da rota: já olha para o trecho seguinte (vira antes da curva)
    if (noPonto) { const [px, py] = r.pts[i]; if (px !== x || py !== y) dir = rumo(px - x, py - y); }
    const [nx, ny] = snapTok(sc, x * c, y * c, t.size, false);
    return { x: nx, y: ny, ronda: Object.assign({}, r, { i, s, dir }) };
  }
  // o rumo (em graus, de 45 em 45) de um deslocamento
  const rumo = (dx, dy) => ((Math.round(deg(Math.atan2(dy, dx)) / 45) * 45) % 360 + 360) % 360;
  /* (lote 132) Arrastado à mão (mouse, setas, qualquer mudança de posição que não venha da ronda): o guarda vira para
     onde foi. Store.upd chama aqui; devolve o patch com o rumo novo, ou null. */
  function virar(id, p) {
    if (!isGM() || !p || p.ronda !== undefined || (p.x === undefined && p.y === undefined)) return null;
    const t = Store.get('tokens', id);
    if (!ehGuarda(t)) return null;
    const dx = (p.x === undefined ? t.x : p.x) - t.x, dy = (p.y === undefined ? t.y : p.y) - t.y;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return null;
    const dir = rumo(dx, dy);
    return dir === t.ronda.dir ? null : Object.assign({}, p, { ronda: Object.assign({}, t.ronda, { dir }) });
  }
  // (lote 132) o tempo da vista revelada passa: tira 1 de quem conta `por` ('rondas' ou 'rodadas'); no 0, apaga
  function contarVer(sc, por, mud) {
    const out = [];
    for (const t of guardas(sc)) {
      const v = t.ronda.ver;
      if (!v || v.por !== por) continue;
      const m = mud && mud.find(([x]) => x === t), base = m && m[1] ? m[1].ronda : t.ronda;
      const ver = v.n > 1 ? Object.assign({}, v, { n: v.n - 1 }) : undefined;
      out.push([t, ver]);
      if (m && m[1]) m[1].ronda = Object.assign({}, base, { ver });
    }
    return out;
  }
  function naRodada() {
    const sc = Store.scene();
    if (!sc || !isGM()) return;
    const ls = contarVer(sc, 'rodadas');
    if (!ls.length) return;
    Store.tx('Vista revelada: uma rodada', () => { for (const [t, ver] of ls) Store.upd('tokens', t.id, { ronda: Object.assign({}, t.ronda, { ver }) }); });
    const fim = ls.filter(([, v]) => !v).map(([t]) => t.name);
    if (fim.length) UI.toast(`Os jogadores não veem mais o cone de ${fim.join(', ')}.`, { key: 'rondas' });
  }
  function avancar() {
    const sc = Store.scene();
    if (!sc || !isGM()) return;
    const gs = guardas(sc);
    if (!gs.length) { UI.toast('Nenhum guarda nesta cena. No painel de um token, bloco "Guarda", ele ganha a ronda e o cone de visão.'); return; }
    const mud = gs.map(t => [t, andar(t, sc)]).filter(([, m]) => m);
    // (lote 132) a vista revelada "por rondas" conta uma vez (também de quem ficou parado)
    const conta = contarVer(sc, 'rondas', mud), so = conta.filter(([t]) => !mud.some(([x]) => x === t));
    if (mud.length || so.length) Store.tx('Avançar rondas', () => { for (const [t, m] of mud) Store.upd('tokens', t.id, m); for (const [t, ver] of so) Store.upd('tokens', t.id, { ronda: Object.assign({}, t.ronda, { ver }) }); });
    const fimVer = conta.filter(([, v]) => !v).map(([t]) => t.name);
    const parados = gs.filter(t => estadoDe(t) === 'alerta').length;
    const vistos = quemVe(Store.scene()), txt = resumoVistos(vistos);
    const base = mud.length ? `${mud.length === 1 ? '1 guarda andou' : mud.length + ' guardas andaram'}` : 'Nenhum guarda andou';
    UI.toast(base + (parados ? ` (${parados} em alerta, ${parados === 1 ? 'parado' : 'parados'})` : '') + '. ' + (txt || 'Ninguém foi visto.') + (fimVer.length ? ` Os jogadores não veem mais o cone de ${fimVer.join(', ')}.` : ''), Object.assign({ long: !!txt, key: 'rondas' }, mud.length ? { action: 'Desfazer', run: Tools.undo } : {}));
    if (vistos.some(v => v.nivel === 'visto') && typeof Som !== 'undefined' && Som.aviso) try { Som.aviso('alerta'); } catch (e) { /* sem som */ }
  }
  function resumoVistos(vistos) {
    if (!vistos.length) return '';
    const por = new Map();
    for (const v of vistos) { const k = v.t.id, o = por.get(k) || { t: v.t, visto: [], sombra: [], disf: v.disf }; o[v.nivel].push(v.g.name); por.set(k, o); }
    return [...por.values()].map(o => o.visto.length ? `${o.visto[0]} vê ${o.t.name}!` : `${o.sombra[0]} pode ter notado ${o.t.name} (${o.disf ? 'disfarçado' : 'na sombra'}).`).join(' ');
  }
  function mudarEstado(ts, est) {
    if (!ESTADOS.some(e => e[0] === est)) return;
    const gs = ts.filter(ehGuarda);
    Store.tx('Estado do guarda', () => gs.forEach(t => Store.upd('tokens', t.id, { alerta: est === 'calmo' ? undefined : est })));
    // (lote 145) com mais de um, o aviso (com Desfazer)
    if (gs.length > 1) UI.toast(`${gs.length} guardas ${est === 'calmo' ? 'calmos' : est === 'desconfiado' ? 'desconfiados' : 'em alerta'}.`, { key: 'rondas', action: 'Desfazer', run: Tools.undo });
  }
  /* (lote 145) Os guardas olham para um ponto (x, y em pixels da cena): cada um vira o cone para lá. Na ronda, o próximo
     "Avançar rondas" volta a apontar o caminho; de posto ou em alerta, ele fica olhando. */
  function olharPara(ts, x, y) {
    const sc = Store.scene(), gs = (ts || []).filter(ehGuarda);
    if (!sc || !gs.length) { UI.toast('Nenhum guarda escolhido.'); return 0; }
    Store.tx('Os guardas olham', () => gs.forEach(t => {
      const [cx, cy] = tokC(t, sc);
      if (Math.abs(x - cx) < 1 && Math.abs(y - cy) < 1) return;
      const dir = ((Math.round(deg(Math.atan2(y - cy, x - cx))) % 360) + 360) % 360;
      Store.upd('tokens', t.id, { ronda: Object.assign({}, t.ronda, { dir }) });
    }));
    UI.toast(gs.length === 1 ? `${gs[0].name} olha para lá.` : `${gs.length} guardas olham para lá.`, { key: 'rondas', action: 'Desfazer', run: Tools.undo });
    return gs.length;
  }
  // escolher o ponto no mapa (a ferramenta "olhar", 09-tools): ids = os guardas (vazio: todos da cena)
  function olharNoMapa(ids) {
    App.olharIds = ids && ids.length ? ids.slice() : null;
    Tools.set('olhar');
    UI.toast(`Clique no ponto para onde ${App.olharIds ? (App.olharIds.length === 1 ? 'o guarda vai' : `os ${App.olharIds.length} guardas vão`) : 'todos os guardas vão'} olhar. Esc cancela.`, { key: 'rondas' });
  }
  /* (lote 145) O bloco "Guardas (N)" do painel de vários tokens: o estado de todos de uma vez e o olhar para um ponto. */
  function blocoGrupo(toks, K) {
    if (!isGM()) return null;
    const gs = toks.filter(ehGuarda);
    if (!gs.length) return null;
    const est = gs.every(t => estadoDe(t) === estadoDe(gs[0])) ? estadoDe(gs[0]) : null;
    return K.secR('s-guardas', `Guardas (${gs.length})`, true, est ? ESTADOS.find(e => e[0] === est)[1] : 'estados diferentes',
      K.field('Estado de todos', K.seg('mt-alerta', est, ESTADOS, v => mudarEstado(gs, v)), 'stack'),
      h('div', { class: 'row' }, K.btn('Olhar para um ponto', () => olharNoMapa(gs.map(t => t.id)), { kind: 'small', icon: 'eye', id: 'mt-olhar', title: 'Clique no mapa: os guardas selecionados viram o cone para lá (um barulho, uma pedra jogada)' })),
      gs.length < toks.length ? K.note(`Só os guardas (${gs.length} de ${toks.length} selecionados).`) : null);
  }

  /* ---------------- o desenho (só o mestre) ---------------- */
  const mostrar = () => isGM() && App.opt.rondasVer !== false;
  const rgba = (est, a) => `rgba(${COR[est].join(',')},${a})`;
  // o que desenhar nesta tela: no mestre, todos os guardas (se a chave estiver ligada); no jogador, os revelados a ele
  const aDesenhar = sc => (isGM() ? (mostrar() ? guardas(sc) : []) : vistos(sc));
  const rotaDe = t => { const f = fonte(t).r; return f && Array.isArray(f.pts) && rotaMeu(t) ? f : null; };
  function desenhar(c, sc, px) {
    const gs = aDesenhar(sc);
    if (!gs.length) return;
    const cell = sc.cell, sel = new Set(App.sel.filter(s => s.c === 'tokens').map(s => s.id));
    c.save();
    // os cones (cortados pelas paredes), na cor do estado
    for (const t of gs.filter(coneMeu)) {
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
      const r = rotaDe(t), [w, h] = tokWH(t), m = [w * cell / 2, h * cell / 2], on = sel.has(t.id), est = fonte(t).est;
      if (!r || !r.pts.length) continue;
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
    const gs = aDesenhar(sc).filter(coneMeu);
    if (!gs.length) return;
    const selo = (x, y, txt, cor) => {
      const r = 9 * px;
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = cor; c.fill(); c.strokeStyle = 'rgba(8,10,16,0.9)'; c.lineWidth = 1.5 * px; c.stroke();
      c.fillStyle = '#16120a'; c.font = `700 ${12 * px}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, x, y + 0.5 * px);
    };
    c.save();
    for (const t of gs) {
      const est = fonte(t).est;
      if (est === 'calmo') continue;
      const [w] = tokWH(t);
      selo(t.x + w * sc.cell - 3 * px, t.y + 3 * px, est === 'alerta' ? '!' : '?', rgba(est, 1));
    }
    const vs = quemVe(sc, gs), ja = new Set();
    for (const v of vs) {
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
    if (t) { setSel([{ c: 'tokens', id: t.id }]); UI.toast(t.ronda.pts.length > 1 ? `A rota de ${t.name} tem ${t.ronda.pts.length} pontos. "Avançar rondas" (Shift+W, no grupo Mestre à esquerda ou no botão direito) faz os guardas andarem.` : `${t.name} fica de posto${t.ronda.pts.length ? ', olhando para o ponto marcado' : ''}.`, { key: 'rondas' }); }
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
        r.pts.length > 1 ? K.btn('Ficar de posto', () => R({ pts: [], i: 0, s: 1, guardada: { pts: r.pts, i: r.i, s: r.s } }), { kind: 'small', id: 'tk-gposto', title: 'Ele para onde está, olhando para o lado escolhido. A rota fica guardada para "Voltar para a ronda".' }) : null,
        // (lote 133) de posto, com a rota guardada: volta a andar por ela, do ponto mais perto de onde está
        r.pts.length < 2 && r.guardada ? K.btn('Voltar para a ronda', () => voltarRonda(t), { kind: 'small primary', icon: 'ronda', id: 'tk-gvolta', title: 'Ele volta a andar pela rota de antes, a partir do ponto mais perto' }) : null,
        K.btn('Não é mais guarda', () => U({ ronda: undefined, alerta: undefined }, 'Deixar de ser guarda'), { kind: 'small', id: 'tk-gfora' })),
      K.note(estadoDe(t) === 'alerta' ? 'Em Alerta, ele larga a rota: você o move à mão.' : 'Desconfiado, ele vê mais longe e mais aberto. Na sombra, só vê bem de perto. Quem está Oculto não é visto.'),
      blocoVer(t, R, K));
  }
  // (lote 133) "Voltar para a ronda": a rota guardada volta; o próximo ponto é o mais perto de onde ele está agora
  function voltarRonda(t) {
    const r = t.ronda, g = r.guardada, sc = Store.scene();
    if (!g || !sc) return;
    const x = Math.round(t.x / sc.cell), y = Math.round(t.y / sc.cell);
    let i = 0, best = Infinity;
    g.pts.forEach(([px, py], k) => { const d = Math.max(Math.abs(px - x), Math.abs(py - y)); if (d < best) { best = d; i = k; } });
    Store.tx('Voltar para a ronda', () => Store.upd('tokens', t.id, { ronda: Object.assign({}, r, { pts: g.pts, i, s: g.s, guardada: undefined }) }));
    UI.toast(`${t.name} volta para a ronda (${g.pts.length} pontos).`, { key: 'rondas' });
  }
  /* (lote 132) "Mostrar o cone a um jogador": para quem usou uma skill de ver o campo de visão. Escolhe o(s) jogador(es),
     se a rota vai junto e por quanto tempo. */
  function blocoVer(t, R, K) {
    const r = t.ronda, v = verLimpo(r.ver), js = (Store.S.players || []).filter(p => p && p.id);
    const nm = id => (js.find(p => p.id === id) || {}).name || 'um jogador';
    const veem = v ? [v.para.length ? 'o cone: ' + v.para.map(nm).join(', ') : null, v.rotas.length ? 'a rota: ' + v.rotas.map(nm).join(', ') : null].filter(Boolean).join('; ') : '';
    const quanto = v ? (v.por ? `ainda ${v.n} ${v.por === 'rondas' ? (v.n === 1 ? 'ronda' : 'rondas') : (v.n === 1 ? 'rodada' : 'rodadas')}` : 'até você esconder') : '';
    const novo = Object.assign({ para: [], rotas: [], por: '', n: 2 }, v || {});
    const troca = (k, id, on) => muda({ [k]: on ? novo[k].concat([id]) : novo[k].filter(x => x !== id) });
    const muda = o => R({ ver: verLimpo(Object.assign({}, novo, o)) || undefined });
    if (!js.length) return h('div', { class: 'tk-gver' }, K.note('Mostrar o cone a um jogador: chame os jogadores para a mesa primeiro.'));
    return h('div', { class: 'tk-gver' },
      h('div', { class: 'o-note', style: { marginTop: '8px', fontWeight: '600' }, text: v ? `Os jogadores veem ${veem} (${quanto})` : 'Mostrar o cone ou a rota a um jogador (quando ele usa uma skill para ver)' }),
      gradeVer(js, id => novo.para.includes(id), id => novo.rotas.includes(id), (id, on) => troca('para', id, on), (id, on) => troca('rotas', id, on), 'tk-gver', K),
      v ? K.field('Por quanto tempo', K.seg('tk-gver-por', v.por, [['', 'Até eu esconder'], ['rondas', 'Rondas'], ['rodadas', 'Rodadas']], x => muda({ por: x, n: v.n || 2 })), 'stack') : null,
      v && v.por ? K.field(v.por === 'rondas' ? 'Quantas vezes de "Avançar rondas"' : 'Quantas rodadas de combate', K.inNum('tk-gver-n', v.n, x => muda({ n: num(x, 1, 99, 1) }), { min: 1, max: 99, step: 1, label: 'Por quanto tempo o jogador vê o cone' })) : null,
      v ? h('div', { class: 'row' }, K.btn('Esconder o cone de novo', () => R({ ver: undefined }), { kind: 'small', id: 'tk-gver-fim' })) : null);
  }

  /* ---------------- o painel do grupo Mestre ---------------- */
  function painel(acao, linha, K) {
    const sc = Store.scene(), gs = guardas(sc);
    const n = { calmo: 0, desconfiado: 0, alerta: 0 };
    gs.forEach(t => n[estadoDe(t)]++);
    return [
      gs.length ? K.note(`${gs.length} ${gs.length === 1 ? 'guarda' : 'guardas'}: ${ESTADOS.filter(e => n[e[0]]).map(e => n[e[0]] + ' ' + e[1].toLowerCase()).join(', ')}.`) : K.note('Nenhum guarda nesta cena. No painel de um token (bloco "Guarda") ele ganha a ronda; os lugares de furtividade já vêm com eles.'),
      linha(acao('Avançar rondas', avancar, { icon: 'ronda', id: 'mtp-rondas', disabled: !gs.length, title: 'Cada guarda anda os passos dele pela rota; o aviso diz quem foi visto (atalho: Shift+W)' })),
      // (lote 145) todos os guardas da cena de uma vez (para só alguns: selecione e use o bloco "Guardas" do painel)
      gs.length ? linha(acao('Todos calmos', () => mudarEstado(gs, 'calmo'), { id: 'mtp-calmo', title: 'Todos os guardas da cena ficam Calmos' }),
        acao('Todos desconfiados', () => mudarEstado(gs, 'desconfiado'), { id: 'mtp-desconf', title: 'Todos os guardas da cena ficam Desconfiados: veem mais longe e mais aberto' }),
        acao('Todos em alerta', () => mudarEstado(gs, 'alerta'), { id: 'mtp-alerta', title: 'Todos os guardas da cena ficam em Alerta: largam a rota' })) : null,
      gs.length ? linha(acao('Todos olham para um ponto', () => olharNoMapa(null), { icon: 'eye', id: 'mtp-olhar', title: 'Clique no mapa: todos os guardas da cena viram o cone para lá (um barulho)' })) : null,
      K.toggle('mtp-rver', App.opt.rondasVer !== false, v => { App.opt.rondasVer = v; Render.request(); UI.refresh(); }, 'Mostrar rotas e cones (só você vê)'),
      // (lote 133) o "??" do disfarce: até quantos quadrados um NPC da mesma roupa repara
      K.field('Disfarce: o "??" a até (q)', K.inNum('mtp-disf', typeof Roupas !== 'undefined' ? Roupas.perto() : 3, v => { App.opt.disfPerto = clamp(Math.round(Number(v)) || 3, 1, 20); Render.request(); }, { min: 1, max: 20, step: 1, label: 'Até quantos quadrados um NPC com a mesma roupa repara no disfarçado' })),
    ];
  }

  /* ---------------- (lote 149) a aba Guardas do painel da direita (só o mestre) ----------------
     Pedido do Bruno: tudo da furtividade num lugar só, ao lado dos Turnos. Os botões de todos (avançar rondas, os estados,
     olhar para um ponto), os cones para os jogadores (de todos os guardas de uma vez), criar guarda (um novo, no meio da
     tela, ou os tokens selecionados) e a lista: cada guarda com o estado, a vida e a ronda; o nome seleciona e centraliza. */
  const VIDA = t => { const b = (t.bars || []).find(x => x && x.on !== false && /vida|pv|hp/i.test(x.n || '')) || (t.bars || [])[0]; return b ? `${b.v}/${b.m}` : null; };
  function meioDaTela(sc) {
    const [cw, ch] = Render.size(), c = sc.cell;
    const x = App.view.x + cw / 2 / App.view.z, y = App.view.y + ch / 2 / App.view.z;
    return [clamp(Math.floor(x / c), 0, sc.cols - 1) * c, clamp(Math.floor(y / c), 0, sc.rows - 1) * c];
  }
  function novoGuarda() {
    const sc = Store.scene();
    if (!sc || !isGM()) return;
    const n = guardas(sc).length + 1, [x, y] = meioDaTela(sc);
    const t = newToken(sc, x, y, { name: 'Guarda ' + n });
    t.ronda = novaRonda({ dir: 90 });
    if (typeof Roupas !== 'undefined' && Roupas.P && Roupas.P.guarda) t.roupa = { k: 'guarda' };
    Store.tx('Novo guarda', () => Store.add('tokens', t));
    setSel([{ c: 'tokens', id: t.id }]);
    desenharRota(Store.get('tokens', t.id));
  }
  function fazerGuardas(ts) {
    const novos = ts.filter(t => t && !t.prop && !ehGuarda(t));
    if (!novos.length) return;
    Store.tx('Fazer guarda', () => novos.forEach(t => Store.upd('tokens', t.id, { ronda: novaRonda({ dir: 90 }) })));
    UI.toast(novos.length === 1 ? `${novos[0].name} agora é guarda (de posto). No painel dele, "Desenhar a rota".` : `${novos.length} tokens agora são guardas (de posto).`, { key: 'rondas', action: 'Desfazer', run: Tools.undo });
    if (novos.length === 1) desenharRota(Store.get('tokens', novos[0].id));
  }
  // os cones de todos os guardas para os jogadores: quem vê (para), a rota junto; vazio esconde
  // (lote 152) o cone e a rota separados: para (quem vê o cone) e rotas (quem vê a rota); null deixa como está
  function verTodos(gs, para, rotas) {
    Store.tx('O que os jogadores veem', () => gs.forEach(t => {
      const v0 = verLimpo(t.ronda.ver) || { para: [], rotas: [], por: '', n: 0 };
      const ver = verLimpo(Object.assign({}, v0, para ? { para } : null, rotas ? { rotas } : null));
      Store.upd('tokens', t.id, { ronda: Object.assign({}, t.ronda, { ver: ver || undefined }) });
    }));
  }
  // a grade: um jogador por linha, com o Cone e a Rota
  function gradeVer(js, cone, rota, mudaCone, mudaRota, pre, K) {
    return h('div', { class: 'gd-ver' },
      h('div', { class: 'gd-ver-h' }, h('span', {}), h('span', { text: 'Cone' }), h('span', { text: 'Rota' })),
      ...js.map(p => h('div', { class: 'gd-ver-l' }, h('span', { class: 'gd-ver-n', text: p.name }),
        h('input', { type: 'checkbox', class: 'gd-ck', id: pre + '-c-' + p.id, checked: !!cone(p.id), 'aria-label': 'Cone para ' + p.name, onchange: e => mudaCone(p.id, e.target.checked) }),
        h('input', { type: 'checkbox', class: 'gd-ck', id: pre + '-r-' + p.id, checked: !!rota(p.id), 'aria-label': 'Rota para ' + p.name, onchange: e => mudaRota(p.id, e.target.checked) }))));
  }
  // (lote 152) seleciona todos os guardas da cena (no mapa)
  function selecionarTodos(gs) { setSel(gs.map(t => ({ c: 'tokens', id: t.id }))); Tools.set('select'); UI.refresh(); }
  function aba(K) {
    const sc = Store.scene(), gs = guardas(sc), js = (Store.S.players || []).filter(p => p && p.id);
    const sel = (App.sel || []).filter(x => x.c === 'tokens').map(x => Store.get('tokens', x.id)).filter(t => t && !t.prop && !ehGuarda(t));
    const n = { calmo: 0, desconfiado: 0, alerta: 0 };
    gs.forEach(t => n[estadoDe(t)]++);
    const out = [];
    out.push(h('p', { class: 'muted', text: gs.length ? `${gs.length} ${gs.length === 1 ? 'guarda' : 'guardas'} nesta cena: ${ESTADOS.filter(e => n[e[0]]).map(e => n[e[0]] + ' ' + e[1].toLowerCase()).join(', ')}.`
      : 'Nenhum guarda nesta cena. Crie um aqui embaixo, ou gere um lugar de Furtividade (eles já vêm com as rondas).' }));
    // os botões de todos
    out.push(K.sec('s-gd-todos', 'Todos os guardas', true,
      h('div', { class: 'row' }, K.btn('Avançar rondas', avancar, { icon: 'ronda', id: 'gd-avancar', kind: 'primary', disabled: !gs.length, title: 'Cada guarda anda os passos dele pela rota; o aviso diz quem foi visto (atalho: Shift+W)' })),
      gs.length ? h('div', { class: 'row' },
        K.btn('Todos calmos', () => mudarEstado(gs, 'calmo'), { kind: 'small', id: 'gd-calmo' }),
        K.btn('Todos desconfiados', () => mudarEstado(gs, 'desconfiado'), { kind: 'small', id: 'gd-desconf' }),
        K.btn('Todos em alerta', () => mudarEstado(gs, 'alerta'), { kind: 'small', id: 'gd-alerta' })) : null,
      gs.length ? h('div', { class: 'row' }, K.btn('Selecionar todos os guardas', () => selecionarTodos(gs), { kind: 'small', icon: 'select', id: 'gd-sel-todos', title: 'Seleciona no mapa todos os guardas desta cena' })) : null,
      gs.length ? h('div', { class: 'row' }, K.btn('Todos olham para um ponto', () => olharNoMapa(null), { kind: 'small', icon: 'eye', id: 'gd-olhar', title: 'Clique no mapa: todos os guardas viram o cone para lá (um barulho)' })) : null,
      K.toggle('gd-rver', App.opt.rondasVer !== false, v => { App.opt.rondasVer = v; Render.request(); UI.refresh(); }, 'Mostrar rotas e cones (só você vê)')));
    // (lote 152) a história da missão (os passos, em ordem; o mestre marca o que já fizeram)
    const tr = Trama.secao(K, sc);
    if (tr) out.push(tr);
    out.push(Segredos.secao(K));      // (lote 155) os segredos com três pistas
    // (lote 151) o calor e os caminhos: onde os guardas veem (com eles andando) e a dificuldade medida
    if (gs.length) {
      const md = Vigia.daCenaMedida(sc).med;
      out.push(K.sec('s-gd-calor', 'O calor e os caminhos', true,
        K.toggle('gd-calor', Vigia.ligado(), v => { App.opt.gdCalor = v; Render.request(); UI.refresh(); }, 'Ver o calor e os caminhos (só você vê)'),
        h('p', { class: 'gd-medida', id: 'gd-medida', text: md.texto }),
        Vigia.ligado() ? K.note('Quanto mais vermelho, mais tempo algum guarda olha para lá. O caminho curto vai em amarelo (tracejado); o outro, em verde. Muda quando os guardas andam ou uma porta abre.') : null));
    }
    // (lote 152) o que os jogadores veem: o cone e a rota, separados, por jogador; nos guardas selecionados (ou em todos)
    if (gs.length) {
      const selG = gs.filter(t => (App.sel || []).some(x => x.c === 'tokens' && x.id === t.id)), alvo = selG.length ? selG : gs;
      const tudo = (k, id) => alvo.every(t => { const v = verLimpo(t.ronda.ver); return v && v[k].includes(id); });
      const lista = k => js.filter(p => tudo(k, p.id)).map(p => p.id);
      const comVer = gs.filter(t => verLimpo(t.ronda.ver));
      out.push(K.sec('s-gd-ver', 'O que os jogadores veem', true,
        K.note(selG.length ? `Vale para ${selG.length === 1 ? 'o guarda selecionado' : 'os ' + selG.length + ' guardas selecionados'}.` : 'Vale para todos os guardas desta cena. Selecione alguns no mapa (ou na lista) para mudar só os deles.'),
        js.length ? gradeVer(js, id => tudo('para', id), id => tudo('rotas', id),
          (id, on) => verTodos(alvo, on ? lista('para').concat([id]) : lista('para').filter(x => x !== id), null),
          (id, on) => verTodos(alvo, null, on ? lista('rotas').concat([id]) : lista('rotas').filter(x => x !== id)), 'gd-ver', K) : K.note('Chame os jogadores para a mesa primeiro.'),
        comVer.length ? h('div', { class: 'row' }, K.btn(selG.length ? 'Esconder destes' : 'Esconder de todos', () => verTodos(alvo, [], []), { kind: 'small', id: 'gd-ver-fim' })) : null));
    }
    // criar guarda
    out.push(K.sec('s-gd-novo', 'Criar guarda', true,
      h('div', { class: 'row' }, K.btn('Novo guarda', novoGuarda, { kind: 'small', icon: 'plus', id: 'gd-novo', title: 'Põe um guarda no meio da tela e já começa a desenhar a ronda dele (clique os pontos; Enter termina)' }),
        sel.length ? K.btn(sel.length === 1 ? 'Fazer guarda: ' + sel[0].name : `Fazer guarda (${sel.length} selecionados)`, () => fazerGuardas(sel), { kind: 'small', icon: 'ronda', id: 'gd-fazer' }) : null),
      sel.length ? null : K.note('Ou selecione tokens no mapa: aparece aqui o botão para fazer deles guardas.')));
    // a lista
    if (gs.length) out.push(K.sec('s-gd-lista', `Os guardas (${gs.length})`, true,
      h('ul', { class: 'list gd-lista' }, gs.map(t => {
        const est = estadoDe(t), r = t.ronda, vida = VIDA(t), selec = (App.sel || []).some(x => x.c === 'tokens' && x.id === t.id);
        return h('li', { class: 'gd-li' + (selec ? ' on' : ''), data: { id: t.id } },
          h('span', { class: 'gd-cor', style: { background: rgba(est, 1) }, title: ESTADOS.find(e => e[0] === est)[1] }),
          h('button', { type: 'button', class: 'li-m gd-nome', id: 'gd-t-' + t.id, title: 'Selecionar e centralizar', onclick: () => { setSel([{ c: 'tokens', id: t.id }]); Tools.set('select'); const [cx, cy] = tokC(t, sc); Render.centerOn(cx, cy); } },
            h('b', { text: t.name }), h('small', { text: [r.pts.length > 1 ? `ronda, ${r.pts.length} pontos` : 'de posto', vida ? 'vida ' + vida : null, verLimpo(r.ver) ? 'à vista de jogador' : null].filter(Boolean).join(' · ') })),
          h('select', { class: 'in gd-est', id: 'gd-e-' + t.id, 'aria-label': 'Estado de ' + t.name, value: est, onchange: e => { const v = e.target.value; e.target.blur(); mudarEstado([t], v); } },
            ESTADOS.map(([k, nm]) => h('option', { value: k, text: nm, selected: k === est }))));
      }))));
    return out;
  }

  return { aba, novoGuarda, fazerGuardas, verTodos, selecionarTodos, coneMeu, rotaMeu, ESTADOS, MODOS, limpar, ehGuarda, estadoDe, guardas, novaRonda, cone, noCone, quemVe, naLuz, andar, avancar, virar, naRodada, verLimpo, vcMeu, vistos, mudarEstado, olharPara, olharNoMapa, blocoGrupo, desenhar, selos, secao, painel, porPonto, tirarPonto, terminar, previaRota, desenharRota, editando, resumoVistos };
})();
