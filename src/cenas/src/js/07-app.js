/* ---------------------------------------------------------------
   7. APP — estado da interface, regras de permissão e ações comuns
   --------------------------------------------------------------- */
const App = {
  viewer: 'gm',                     // 'gm' ou o id de um jogador
  tool: 'select',
  sel: [],                          // [{ c: coleção, id }]
  view: { x: 0, y: 0, z: 1 },       // câmera: canto superior esquerdo + zoom
  mouse: { sx: 0, sy: 0, x: 0, y: 0, inside: false },
  keys: { space: false },
  tab: 'sel', sideOpen: true,
  clip: [], pings: [], floats: [],
  iniRolls: new Map(),              // iniciativas roladas pela mesa ao vivo que o mestre ainda pode anotar: id da ficha → { v, d, b, nome, at }
  anim: true,
  showVision: false,                // mestre: escurecer no mapa o que os jogadores não veem (o "véu")
  opt: {
    stroke: '#f2c14e', fill: '#f2c14e', fillOn: false, sw: 4, alpha: 1, snap: false, top: false, gmOnly: false, arrow: false, fs: 28,
    wallKind: 'wall', wallMode: 'line',
    fogMode: 'r', fogShape: 'brush', fogSize: 2,
    fx: 'fogo', fxShape: 'circ', fxR: 2, fxAng: 60, fxW: 1, fxRW: 3, fxRH: 2, fxDir: 0, fxAttach: true, fxDur: 0,
    lightPreset: 'tocha',
    tokOwner: '', tokSize: 1,
    terMode: 'paint', terShape: 'brush', terType: 'morro', terH: null, terSize: 2,     // terreno: terH vazio = a altura de fábrica do tipo
  },
};

const isGM = () => App.viewer === 'gm';
const sceneW = sc => sc.cols * sc.cell;
const sceneH = sc => sc.rows * sc.cell;
const tokC = (t, sc) => { const s = t.size * sc.cell; return [t.x + s / 2, t.y + s / 2, s / 2]; };
const ownsTok = t => !isGM() && !!t && !!t.owner && (t.owner === App.viewer || t.owner === '*');
const playerById = id => Store.S.players.find(p => p.id === id);
const viewerColor = () => (isGM() ? '#e6ab4f' : (playerById(App.viewer) || {}).color || '#4fb8e0');
const viewerName = () => (isGM() ? 'Mestre' : (playerById(App.viewer) || {}).name || 'Jogador');
const authorId = () => (isGM() ? null : App.viewer);

/* Quem pode o quê. O mestre pode tudo; o jogador depende dos interruptores da cena. */
function can(what, obj) {
  const sc = Store.scene();
  if (isGM()) return what === 'moveToken' ? !obj.locked : true;
  const p = sc.perms, me = App.viewer;
  switch (what) {
    case 'moveToken': return p.mover && ownsTok(obj) && !obj.locked;
    case 'bars': return p.barras && ownsTok(obj);
    case 'conds': return p.condicoes && ownsTok(obj);
    case 'auras': return p.auras && ownsTok(obj);
    case 'draw': return !!p.desenhar;
    case 'fx': return !!p.efeitos;
    case 'ruler': return !!p.regua;
    case 'ping': return !!p.ping;
    case 'doors': return !!p.portas;
    case 'turns': return !!p.turnos;
    case 'target': return !!p.mira;
    case 'editShape': return p.desenhar && !!obj && obj.by === me;
    case 'editFx': return p.efeitos && !!obj && obj.by === me;
    default: return false;
  }
}

/* Véu do mestre: escurece no mapa o que nenhum jogador enxerga agora. Com exatamente um token selecionado
   (e que enxergue), passa a mostrar só o que ESSE token vê, tenha dono ou não. Devolve null quando não há
   véu: visão de jogador, opção desligada, ou cena sem visão por paredes (aí não há o que escurecer). */
function veilState(sc) {
  if (!sc || !isGM() || !App.showVision || !sc.fog.dynamic) return null;
  let tok = null;
  if (App.sel.length === 1 && App.sel[0].c === 'tokens') {
    const t = sc.tokens.find(x => x.id === App.sel[0].id);
    if (t && t.vis && t.vis.on) tok = t;
  }
  return { tok };
}

/* O que quem está olhando enxerga de cada coisa. */
function tokShown(t, sc) {
  if (isGM()) return true;
  if (t.hidden) return false;
  if (ownsTok(t)) return true;
  const [cx, cy] = tokC(t, sc);
  return Vision.canSee(cx, cy);
}
// A porta aparece se quem olha enxerga algum dos dois lados dela.
function doorSeen(w, sc) {
  if (isGM() || !Vision.out.vis) return true;
  const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2;
  const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1, d = sc.cell * 0.18;
  const nx = -(w.y2 - w.y1) / len * d, ny = (w.x2 - w.x1) / len * d;
  return Vision.canSee(mx + nx, my + ny) || Vision.canSee(mx - nx, my - ny);
}
/* Ícones clicáveis das aberturas (porta, janela, cortina) que quem está olhando alcança: [{ w, x, y }].
   Em geral o ícone fica no meio da abertura. Quando dois cairiam no mesmo ponto (cortina sobre janela),
   eles se afastam ao longo do trecho, para os dois continuarem clicáveis e não se confundirem. */
function doorSpots(sc) {
  const gm = isGM(), out = [];
  for (const w of Walls.of(sc).openings) {
    if (w.secret && !gm) continue;                         // porta secreta: só o mestre alcança
    if (!doorSeen(w, sc)) continue;
    out.push({ w, x: (w.x1 + w.x2) / 2, y: (w.y1 + w.y2) / 2 });
  }
  const gap = 24 / App.view.z, gap2 = gap * gap;           // um ícone ocupa 22 px de tela
  const n = out.length, done = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (done[i]) continue;
    const xi = out[i].x, yi = out[i].y;
    let grp = null;
    for (let j = i + 1; j < n; j++) {
      if (done[j]) continue;
      const dx = out[j].x - xi;
      if (dx >= gap || dx <= -gap) continue;
      const dy = out[j].y - yi;
      if (dx * dx + dy * dy < gap2) (grp || (grp = [i])).push(j);
    }
    if (!grp) continue;
    // o grupo fica centrado onde estava, em fila ao longo do primeiro trecho, na ordem em que as aberturas foram criadas
    const w0 = out[i].w, L = Math.hypot(w0.x2 - w0.x1, w0.y2 - w0.y1) || 1, ux = (w0.x2 - w0.x1) / L, uy = (w0.y2 - w0.y1) / L;
    let mx = 0, my = 0;
    for (const j of grp) { mx += out[j].x; my += out[j].y; done[j] = 1; }
    mx /= grp.length; my /= grp.length;
    grp.forEach((j, q) => { const off = (q - (grp.length - 1) / 2) * gap; out[j].x = mx + ux * off; out[j].y = my + uy * off; });
  }
  return out;
}
const tokName = t => (isGM() || ownsTok(t) || t.showName ? t.name : '???');
// Como quem está olhando vê uma barra: 'num' (com números), 'bar' (só a proporção) ou 'none'.
const barMode = (t, b) => (isGM() || ownsTok(t) ? 'num' : (b && b.vis) || t.barVis);
// Barras de um token que aparecem para quem está olhando, com o índice original.
const barsShown = t => t.bars.map((b, i) => ({ b, i, mode: barMode(t, b) })).filter(x => x.b.on && x.b.m > 0 && x.mode !== 'none');
const shapeShown = s => isGM() || !s.gm;
const fxShown = e => isGM() || !e.gm;
// Efeito que quem está olhando pode ver: o jogador não vê (no mapa, na lista, nem pelo rótulo de duração)
// o efeito marcado como "só do mestre" nem o que está preso a um token oculto.
function fxVisible(e) {
  if (!fxShown(e)) return false;
  if (isGM() || !e.token) return true;
  const tk = Store.get('tokens', e.token);
  return !(tk && tk.hidden);
}

/* ---- Formas ---- */
const measureCtx = document.createElement('canvas').getContext('2d');
function textSize(s) {
  measureCtx.font = `600 ${s.fs}px ${FONT_UI}`;
  const lines = String(s.txt || '').split('\n');
  let w = 0;
  for (const l of lines) w = Math.max(w, measureCtx.measureText(l).width);
  return { w, h: lines.length * s.fs * 1.25 };
}
function shapeBBox(s) {
  if (s.k === 'rect' || s.k === 'ell') return { x: s.x, y: s.y, w: s.w, h: s.h };
  if (s.k === 'text') { const m = textSize(s); return { x: s.x, y: s.y, w: m.w, h: m.h }; }
  return Geo.bboxPts(s.pts);
}
function hitShape(s, x, y, tol) {
  const half = (s.sw || 0) / 2 + tol;
  switch (s.k) {
    case 'rect': {
      if (x < s.x - half || x > s.x + s.w + half || y < s.y - half || y > s.y + s.h + half) return false;
      if (s.f) return true;
      return !(x > s.x + half && x < s.x + s.w - half && y > s.y + half && y < s.y + s.h - half);
    }
    case 'ell': {
      const rx = s.w / 2, ry = s.h / 2, cx = s.x + rx, cy = s.y + ry;
      if (Math.hypot((x - cx) / (rx + half), (y - cy) / (ry + half)) > 1) return false;
      if (s.f || rx <= half || ry <= half) return true;
      return Math.hypot((x - cx) / (rx - half), (y - cy) / (ry - half)) >= 1;
    }
    case 'text': {
      const b = shapeBBox(s);
      return x >= b.x - tol && x <= b.x + b.w + tol && y >= b.y - tol && y <= b.y + b.h + tol;
    }
    case 'poly':
      if (s.f && Geo.inPoly(x, y, s.pts)) return true;
      return Geo.distPolyline(x, y, s.pts, true) <= half;
    default:
      return Geo.distPolyline(x, y, s.pts, false) <= half;
  }
}
// Patch para mover uma forma a partir do estado original s0.
function shapeMoved(s0, dx, dy) {
  if (s0.pts) return { pts: s0.pts.map((v, i) => v + (i % 2 ? dy : dx)) };
  return { x: s0.x + dx, y: s0.y + dy };
}
// Patch para encaixar a forma numa nova caixa.
function shapeScaled(s0, b0, b1) {
  if (s0.k === 'rect' || s0.k === 'ell') return { x: b1.x, y: b1.y, w: b1.w, h: b1.h };
  const sx = b0.w > 0.01 ? b1.w / b0.w : 1, sy = b0.h > 0.01 ? b1.h / b0.h : 1;
  return { pts: s0.pts.map((v, i) => (i % 2 ? b1.y + (v - b0.y) * sy : b1.x + (v - b0.x) * sx)) };
}

/* ---- Áreas: quem está dentro de uma aura ou de um efeito ---- */
const areaCtx = document.createElement('canvas').getContext('2d');
function auraShape(t, a, sc) {
  const [cx, cy, half] = tokC(t, sc);
  const R = a.r * sc.cell + half, p = new Path2D();
  if (a.k === 'quad') p.rect(cx - R, cy - R, R * 2, R * 2);
  else if (a.k === 'cone') {
    const d = rad(a.dir || 0), w = rad(clamp(a.ang || 60, 10, 340)) / 2;
    p.moveTo(cx, cy); p.arc(cx, cy, R, d - w, d + w); p.closePath();
  } else p.arc(cx, cy, R, 0, TAU);
  return p;
}
function tokensIn(path, sc) {
  return sc.tokens.filter(t => { const [cx, cy] = tokC(t, sc); return areaCtx.isPointInPath(path, cx, cy); });
}

// Número de dano ou cura que sobe do token quando uma barra muda: o nome da barra e o quanto, com sinal
// ("Vida −8", "Fé +2"). Vale para qualquer caminho que mexa numa barra, porque nasce da própria alteração.
function floatDelta(t, delta, tag, color) {
  if (!delta) return;
  App.floats.push({ id: t.id, text: (tag ? tag + ' ' : '') + (delta > 0 ? '+' : '−') + fmt(Math.abs(delta)), c: color || (delta > 0 ? '#86e8ad' : '#ff8f80'), t0: performance.now() });
  if (App.floats.length > 30) App.floats.shift();
  Render.request();
}

// O que uma aplicação guardada num efeito vai fazer, por extenso: "−8 Vida", "+5 Vida + Abençoado", "Queimando".
function applyLabel(a) {
  const parts = [], amt = a ? areaAmount(a.amt) : null;
  if (amt) parts.push((amt > 0 ? '+' : '−') + fmt(Math.abs(amt)) + ' ' + a.bar);
  if (a && a.cond && a.cond.id) parts.push((COND_BY_ID[a.cond.id] || {}).n || a.cond.id);
  return parts.join(' + ');
}
// Valor da barra depois de aplicar amt (metade arredonda para baixo). Nunca passa do máximo nem desce do piso
// (zero, ou o quanto a barra pode ficar negativa).
// Uma barra com um remendo por cima; a sobrevida zerada sai do objeto (não fica guardada à toa).
function barWith(b, p) { const o = Object.assign({}, b, p); if (!(o.x > 0)) delete o.x; return o; }
/* Uma variação numa barra. O dano (delta negativo) gasta primeiro a sobrevida; a cura não mexe nela.
   Devolve o remendo { v } ou { v, x }. */
function barAfter(b, delta) {
  let x = barX(b), d = delta;
  if (d < 0 && x > 0) { const usa = Math.min(x, -d); x = Math.round((x - usa) * 10) / 10; d += usa; }
  const p = { v: clamp(Math.round((b.v + d) * 10) / 10, -barLo(b), Math.max(b.m, b.v)) };
  if (x !== barX(b)) p.x = x;
  return p;
}
const areaDelta = (amt, half) => (half ? Math.sign(amt) * Math.floor(Math.abs(amt) / 2) : amt);
function areaNext(b, amt, half) { return barAfter(b, areaDelta(amt, half)).v; }

/* ---- Seleção ---- */
const selHas = (c, id) => App.sel.some(s => s.c === c && s.id === id);
function setSel(list) { App.sel = list; Store.emit('sel'); }
function selOf(c) { const out = []; for (const s of App.sel) if (s.c === c) { const o = Store.get(c, s.id); if (o) out.push(o); } return out; }
// Tira da seleção o que não existe mais (apagado, desfeito, efeito que acabou). Encolher também é mudar a seleção:
// quem depende dela fica sabendo (o véu do mestre troca de "visão de Fulano" para "visão dos jogadores", e vice-versa).
function pruneSel() {
  const n = App.sel.length;
  App.sel = App.sel.filter(s => Store.get(s.c, s.id));
  if (n === App.sel.length) return false;
  Store.emit('sel');
  return true;
}

/* ---- Grade ---- */
function snapTok(sc, x, y, size, free) {
  const st = size < 1 ? sc.cell / 2 : sc.cell;
  const nx = free ? x : snapTo(x, st), ny = free ? y : snapTo(y, st);
  return [clamp(nx, 0, Math.max(0, sceneW(sc) - size * sc.cell)), clamp(ny, 0, Math.max(0, sceneH(sc) - size * sc.cell))];
}
function snapPt(sc, x, y, free, step) {
  if (free) return [x, y];
  const st = sc.cell * (step || 0.5);
  return [snapTo(x, st), snapTo(y, st)];
}
function gridDist(sc, ax, ay, bx, by) {
  const dx = Math.abs(bx - ax) / sc.cell, dy = Math.abs(by - ay) / sc.cell;
  return sc.grid.diag === 'eucl' ? Math.hypot(dx, dy) : Math.max(dx, dy);
}
const distLabel = (sc, q) => `${fmt(q)} q · ${fmt(q * sc.grid.unit)} ${sc.grid.unitName}`;

// Interpreta o que foi digitado numa barra: "12" define, "+5" e "-8" somam.
function parseBar(text, cur, max, lo) {
  const s = String(text).trim().replace(/\s+/g, '').replace(',', '.');
  if (/^[+-]\d+(\.\d+)?$/.test(s)) return clamp(Math.round((cur + Number(s)) * 10) / 10, -(lo || 0), Math.max(max, cur));
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  return null;
}

/* ---- Ordem de turnos: apoio ----
   Cada entrada: { id, token | null, name, init, roll, k } e, nas avulsas (sem token), { bonus, grp }.
     k ...... qual dos turnos daquele combatente na rodada (1, 2…): um chefe com "turnos por rodada" 2 tem duas
              entradas, k = 1 e k = 2, cada uma com a própria iniciativa;
     roll ... { d, b } da última rolagem (dado e bônus), para mostrar "17 (12 + 5)"; null se o valor foi digitado;
     grp .... o que une as entradas de um mesmo combatente avulso. */
const turnEntry = (t, k) => ({ id: uid('tn'), token: t.id, name: t.name, init: null, roll: null, k });
const turnGroup = e => (e.token ? 't:' + e.token : e.grp ? 'g:' + e.grp : 'e:' + e.id);
// Rótulo de uma entrada: o nome puro no primeiro turno; "Nome · 2º turno" nos outros.
const turnLabel = (e, name) => ((e.k || 1) > 1 ? `${name} · ${e.k}º turno` : name);
const turnName = e => { const t = e.token ? Store.get('tokens', e.token) : null; return turnLabel(e, t ? tokName(t) : e.name); };
// Bônus de iniciativa de uma entrada: o do token dela, ou o da própria entrada avulsa.
function turnBonus(e) {
  if (!e.token) return clampIni(e.bonus);
  const t = Store.get('tokens', e.token);
  return t ? clampIni(t.ini) : 0;
}
const rollText = (d, b) => `${d} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`;        // "12 + 5", "12 − 2"
// Ordena por iniciativa, a maior primeiro; quem não tem fica no fim. Empate: maior bônus; depois, a ordem em que já estavam.
function turnSort(list) {
  const rows = list.map((e, i) => ({ e, i, v: e.init == null || !isFinite(e.init) ? -Infinity : Number(e.init), b: turnBonus(e) }));
  rows.sort((p, q) => (p.v === q.v ? 0 : q.v - p.v) || (q.b - p.b) || (p.i - q.i));
  for (let i = 0; i < rows.length; i++) list[i] = rows[i].e;
  return list;
}
// Renumera os turnos de cada combatente (1º, 2º…), mantendo a ordem em que já estavam numerados.
function turnRenumber(list) {
  const groups = new Map();
  for (const e of list) { const g = turnGroup(e); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(e); }
  for (const g of groups.values()) { g.sort((p, q) => (p.k || 1) - (q.k || 1)); g.forEach((e, i) => { e.k = i + 1; }); }
}
// Se a entrada de quem estava jogando saiu da ordem, a vez passa para a seguinte (ou para a primeira, se era a última).
function turnKeepCur(tn, before) {
  if (tn.list.some(e => e.id === tn.cur)) return;
  const i = before.findIndex(e => e.id === tn.cur);
  let next = null;
  for (let j = i + 1; i >= 0 && j < before.length && !next; j++) next = tn.list.find(e => e.id === before[j].id) || null;
  tn.cur = next ? next.id : tn.list.length ? tn.list[0].id : null;
}

/* ---- Ações usadas por ferramentas, menus e painéis ---- */
const Act = {
  barSet(t, i, text) {
    const b = t.bars[i];
    const s = String(text).trim().replace(/\s+/g, '').replace(',', '.');
    let p;
    if (/^[+-]\d+(\.\d+)?$/.test(s)) p = barAfter(b, Number(s));           // "+5" e "-8": o dano gasta primeiro a sobrevida
    else { const v = parseBar(text, b.v, b.m, barLo(b)); if (v == null) return false; p = { v }; }
    if (p.v === b.v && p.x === undefined) return false;
    Store.tx('Alterar ' + b.n, () => Store.upd('tokens', t.id, { bars: t.bars.map((x, j) => (j === i ? barWith(x, p) : x)) }));
    return true;
  },
  // Sobrevida de uma barra: pontos por cima dela, que absorvem o dano primeiro. Zero tira.
  barExtra(t, i, value) {
    const b = t.bars[i]; if (!b) return false;
    const x = Math.max(0, Math.round((Number(value) || 0) * 10) / 10);
    if (x === barX(b)) return false;
    Store.tx('Sobrevida de ' + b.n, () => Store.upd('tokens', t.id, { bars: t.bars.map((o, j) => (j === i ? barWith(o, { x }) : o)) }));
    return true;
  },
  // Cura total: enche todas as barras em uso de cada token (a barra que tem um começo próprio volta para ele).
  // Devolve quantos tokens mudaram.
  fullHeal(tokens) {
    let n = 0;
    Store.tx('Cura total', () => {
      for (const t of tokens) {
        let mudou = false;
        const bars = t.bars.map(b => {
          if (!b.on || !(b.m > 0)) return b;
          const alvo = barFull(b);
          if (b.st != null ? b.v === alvo : b.v >= alvo) return b;
          mudou = true; return Object.assign({}, b, { v: alvo });
        });
        if (mudou) { Store.upd('tokens', t.id, { bars }); n++; }
      }
    });
    return n;
  },
  barPatch(t, i, patch) {
    Store.tx('Alterar barra', () => Store.upd('tokens', t.id, { bars: t.bars.map((x, j) => (j === i ? Object.assign({}, x, patch) : x)) }));
  },
  barAdd(t) {
    if (t.bars.length >= MAX_BARS) return false;
    const used = t.bars.map(b => b.c);
    const c = BAR_COLORS.find(x => !used.includes(x)) || BAR_COLORS[t.bars.length % BAR_COLORS.length];
    Store.tx('Adicionar barra', () => Store.upd('tokens', t.id, { bars: t.bars.concat({ n: 'Barra ' + (t.bars.length + 1), c, v: 10, m: 10, k: 'bar', on: true, vis: '' }) }));
    return true;
  },
  barDel(t, i) {
    Store.tx('Remover barra', () => Store.upd('tokens', t.id, { bars: t.bars.filter((_, j) => j !== i) }));
  },

  condToggle(tokens, id) {
    const allOn = tokens.every(t => t.conds.includes(id));
    Store.tx('Condição', () => {
      for (const t of tokens) {
        const has = t.conds.includes(id);
        if (allOn && has) {
          const info = Object.assign({}, t.cinfo); delete info[id];
          Store.upd('tokens', t.id, { conds: t.conds.filter(c => c !== id), cinfo: info });
        } else if (!allOn && !has) Store.upd('tokens', t.id, { conds: t.conds.concat(id) });
      }
    });
  },
  // Contador (n, manual) e duração (d rodadas) de uma condição ativa. Valor vazio ou zero apaga o campo.
  condSet(t, id, patch, label) {
    const info = Object.assign({}, t.cinfo);
    const cur = Object.assign({}, info[id], patch);
    for (const k of ['n', 'd', 'd0']) if (!(cur[k] > 0)) delete cur[k];
    if (Object.keys(cur).length) info[id] = cur; else delete info[id];
    Store.tx(label || 'Condição', () => Store.upd('tokens', t.id, { cinfo: info }));
  },
  // + e − do contador. Descer de 1 encerra a condição; sem contador, − não faz nada.
  condStep(t, id, delta) {
    const cur = (t.cinfo || {})[id] || {};
    const n = (cur.n || 0) + delta;
    if (n <= 0) {
      if (!cur.n) return 'none';
      Act.condToggle([t], id);
      return 'removed';
    }
    Act.condSet(t, id, { n }, 'Contador de condição');
    return 'ok';
  },

  // Dano, cura e condição em vários tokens de uma vez. rows: [{ t, half }]; text: "12" ou "-12" tira, "+8" devolve.
  // keep: { id, skip } → guarda no efeito `id`, no mesmo passo de desfazer, a configuração usada (para o Reaplicar).
  areaApply(rows, barName, text, cond, keep, label) {
    const amt = areaAmount(text);
    if (amt == null) return -1;
    let n = 0;
    Store.tx(label || 'Aplicar em área', () => {
      // (se desta vez não há o que reaplicar, o que o efeito já tinha guardado fica como está)
      const cfg = keep && Store.get('effects', keep.id) ? cleanApply({ bar: barName, amt: text, cond, skip: keep.skip }) : null;
      if (cfg) Store.upd('effects', keep.id, { apply: cfg });
      for (const r of rows) {
        const t = r.t, p = {};
        if (amt) {
          const i = t.bars.findIndex(b => b.on && b.n === barName);
          if (i >= 0) {
            const q = barAfter(t.bars[i], areaDelta(amt, r.half));
            if (q.v !== t.bars[i].v || q.x !== undefined) p.bars = t.bars.map((x, j) => (j === i ? barWith(x, q) : x));
          }
        }
        if (cond && cond.id) {
          if (!t.conds.includes(cond.id)) p.conds = t.conds.concat(cond.id);
          if (cond.n > 0 || cond.d > 0) {
            const info = Object.assign({}, t.cinfo), cur = Object.assign({}, info[cond.id]);
            if (cond.n > 0) cur.n = (cur.n || 0) + cond.n;
            if (cond.d > 0) { cur.d = cond.d; cur.d0 = cond.d; }
            info[cond.id] = cur; p.cinfo = info;
          }
        }
        if (Object.keys(p).length) { Store.upd('tokens', t.id, p); n++; }
      }
    });
    return n;
  },

  /* Reaplica, num passo de desfazer, o que este efeito aplicou da última vez (e.apply) em quem está dentro da
     área AGORA, menos quem tinha ficado de fora. Devolve { inside, n }: quantos estão dentro e quantos mudaram;
     ou null se o efeito não tem nada guardado. */
  fxReapply(e) {
    const a = e && e.apply, sc = Store.scene();
    if (!a || areaAmount(a.amt) == null) return null;
    const skip = new Set(a.skip || []);
    const rows = tokensIn(FX.geom(e, sc).path, sc).filter(t => !skip.has(t.id)).map(t => ({ t, half: false }));
    if (!rows.length) return { inside: 0, n: 0 };
    return { inside: rows.length, n: Act.areaApply(rows, a.bar, a.amt, a.cond, null, 'Reaplicar em área') };
  },

  // Mira: liga ou desliga o alvo de quem está olhando em cada token.
  targetToggle(tokens) {
    if (!can('target') || !tokens.length) return;
    const sc = Store.scene(), me = App.viewer, list = sc.targets.slice();
    const all = tokens.every(t => list.some(x => x.by === me && x.t === t.id));
    for (const t of tokens) {
      const i = list.findIndex(x => x.by === me && x.t === t.id);
      if (all && i >= 0) list.splice(i, 1);
      else if (!all && i < 0) list.push({ by: me, t: t.id });
    }
    Store.tx(all ? 'Tirar a mira' : 'Mirar', () => Store.scn({ targets: list }));
  },

  deleteSel() {
    const sc = Store.scene();
    const list = App.sel.filter(s => {
      const o = Store.get(s.c, s.id);
      if (!o) return false;
      if (isGM()) return true;
      return (s.c === 'shapes' && can('editShape', o)) || (s.c === 'effects' && can('editFx', o));
    });
    if (!list.length) return 0;
    Store.tx('Apagar', () => {
      for (const s of list) {
        if (s.c === 'tokens') {
          for (const e of sc.effects.filter(e => e.token === s.id)) Store.del('effects', e.id);
          if (sc.targets.some(x => x.t === s.id)) Store.scn({ targets: sc.targets.filter(x => x.t !== s.id) });
          if (sc.turn.list.some(e => e.token === s.id)) {
            const tn = clone(sc.turn), before = tn.list.slice();
            tn.list = tn.list.filter(e => e.token !== s.id);       // todas as entradas dele (um chefe tem mais de uma)
            turnKeepCur(tn, before);
            Store.scn({ turn: tn });
          }
        }
        Store.del(s.c, s.id);
      }
    });
    setSel([]);
    return list.length;
  },

  // Cópias com ids novos, deslocadas (dx, dy).
  cloneItems(items, dx, dy) {
    const sc = Store.scene(), made = [];
    const map = new Map();
    Store.tx('Duplicar', () => {
      for (const it of items) {
        if (it.c === 'effects') continue;
        const o = clone(it.o);
        o.id = uid(it.c.slice(0, 2));
        if (o.pts) o.pts = o.pts.map((v, i) => v + (i % 2 ? dy : dx));
        else if (it.c === 'walls') { o.x1 += dx; o.y1 += dy; o.x2 += dx; o.y2 += dy; }
        else { o.x += dx; o.y += dy; }
        if (it.c === 'tokens') {
          [o.x, o.y] = snapTok(sc, o.x, o.y, o.size, false);
          for (const a of o.auras) a.id = uid('au');
        }
        if (it.c === 'shapes') o.by = authorId();
        map.set(it.o.id, o.id);
        Store.add(it.c, o);
        made.push({ c: it.c, id: o.id });
      }
      for (const it of items) {
        if (it.c !== 'effects') continue;
        const o = clone(it.o);
        o.id = uid('fx'); o.seed = 1 + Math.floor(Math.random() * 999);
        o.by = authorId();
        if (o.token) { if (map.has(o.token)) o.token = map.get(o.token); else if (!Store.get('tokens', o.token)) o.token = null; }
        if (!o.token || !map.has(it.o.token)) { o.x += dx; o.y += dy; }
        Store.add('effects', o);
        made.push({ c: 'effects', id: o.id });
      }
    });
    return made;
  },
  selItems() {
    const out = [];
    for (const s of App.sel) {
      const o = Store.get(s.c, s.id);
      if (!o) continue;
      if (!isGM() && !((s.c === 'shapes' && can('editShape', o)) || (s.c === 'effects' && can('editFx', o)))) continue;
      out.push({ c: s.c, o });
    }
    return out;
  },
  duplicateSel() {
    const items = Act.selItems();
    if (!items.length) return;
    const c = Store.scene().cell;
    setSel(Act.cloneItems(items, c, c));
  },
  copySel() {
    const items = Act.selItems();
    if (!items.length) return 0;
    App.clip = items.map(it => ({ c: it.c, o: clone(it.o) }));
    return items.length;
  },
  pasteAt(x, y) {
    if (!App.clip.length) return 0;
    const sc = Store.scene();
    // Ancora o grupo no primeiro item copiado.
    const a = App.clip[0].o;
    const ax = a.pts ? a.pts[0] : a.x1 != null ? a.x1 : a.x, ay = a.pts ? a.pts[1] : a.y1 != null ? a.y1 : a.y;
    const items = App.clip.filter(it => isGM() || it.c === 'shapes' || it.c === 'effects');
    if (!items.length) return 0;
    // Token cai no quadrado sob o cursor; o resto, com o primeiro ponto no cursor.
    const cell = sc.cell, tok = App.clip[0].c === 'tokens';
    const dx = tok ? Math.floor(x / cell) * cell - ax : x - ax, dy = tok ? Math.floor(y / cell) * cell - ay : y - ay;
    setSel(Act.cloneItems(items, dx, dy));
    return items.length;
  },

  toFront(c, ids, front) {
    const arr = Store.scene()[c];
    const move = arr.filter(o => ids.includes(o.id)).map(o => o.id);
    const rest = arr.filter(o => !ids.includes(o.id)).map(o => o.id);
    Store.tx(front ? 'Trazer para frente' : 'Enviar para trás', () => Store.ord(c, front ? rest.concat(move) : move.concat(rest)));
  },

  // Abre ou fecha uma abertura (porta, janela ou cortina) pelo ícone dela no mapa. O mestre pode sempre;
  // o jogador precisa da permissão da cena, e a abertura não pode estar trancada.
  toggleDoor(w) {
    const nm = OPENING_NAMES[w.k] || OPENING_NAMES.door;
    if (!isGM()) {
      if (!can('doors')) { UI.toast(`O mestre não liberou abrir ${nm[1]} nesta cena.`); return; }
      if (w.locked) { UI.toast('Está trancada.'); return; }
    }
    if (w.secret) {
      // Porta secreta está sempre fechada: abrir é revelar, e ela vira uma porta comum.
      Store.tx('Revelar porta secreta', () => Store.upd('walls', w.id, { secret: false, open: true }));
      UI.toast('Porta secreta revelada e aberta.', { action: 'Desfazer', run: Tools.undo });
      return;
    }
    const open = !w.open;
    Store.tx((open ? 'Abrir ' : 'Fechar ') + nm[0], () => Store.upd('walls', w.id, { open }));
    UI.toast(nm[0][0].toUpperCase() + nm[0].slice(1) + (open ? ' aberta' : ' fechada'), { action: 'Desfazer', run: Tools.undo });
  },

  ping(x, y) {
    if (!can('ping')) return;
    App.pings.push({ x, y, t0: performance.now(), c: viewerColor(), n: viewerName() });
    if (App.pings.length > 8) App.pings.shift();
    Render.request();
    Nuvem.ping(x, y);                 // numa mesa, o ping aparece para todos que estão na cena
  },

  /* ---- Ordem de turnos ---- */
  // Põe os tokens na ordem: uma entrada para cada turno que o token tem na rodada. Quem já está só ganha as que faltam.
  // Devolve quantos tokens ganharam entrada.
  turnAdd(tokens) {
    const sc = Store.scene(), tn = clone(sc.turn);
    let n = 0;
    for (const t of tokens) {
      const want = clampTurns(t.turns), have = tn.list.filter(e => e.token === t.id).length;
      if (have >= want) continue;
      for (let k = have + 1; k <= want; k++) tn.list.push(turnEntry(t, k));
      n++;
    }
    if (!n) return 0;
    turnRenumber(tn.list);
    if (!tn.cur && tn.list.length) tn.cur = tn.list[0].id;
    Store.tx('Adicionar aos turnos', () => Store.scn({ turn: tn }));
    return n;
  },
  // Entrada avulsa (sem token no mapa): nome, bônus de iniciativa e quantos turnos tem por rodada.
  turnLoose(name, bonus, turns) {
    const n = clampTurns(turns), grp = uid('gr'), b = clampIni(bonus);
    Act.turnPatch(x => { for (let k = 1; k <= n; k++) x.list.push({ id: uid('tn'), token: null, name, init: null, roll: null, k, bonus: b, grp }); }, 'Adicionar aos turnos');
    return n;
  },
  turnPatch(fn, label) {
    const tn = clone(Store.scene().turn), before = tn.list.slice();
    fn(tn);
    turnKeepCur(tn, before);
    Store.tx(label || 'Ordem de turnos', () => Store.scn({ turn: tn }));
  },
  // Tira UMA entrada da ordem. Se era um dos vários turnos de um token, o "turnos por rodada" dele desce junto
  // (no mesmo passo de desfazer) e os que sobram são renumerados. Devolve o token cujo número mudou, ou null.
  turnRemove(id) {
    const sc = Store.scene(), e = sc.turn.list.find(x => x.id === id);
    if (!e) return null;
    const tn = clone(sc.turn), before = tn.list.slice();
    tn.list = tn.list.filter(x => x.id !== id);
    turnRenumber(tn.list); turnKeepCur(tn, before);
    const left = e.token ? tn.list.filter(x => x.token === e.token).length : 0;
    const t = e.token && left >= 1 ? Store.get('tokens', e.token) : null;
    const lower = t && clampTurns(t.turns) !== left ? t : null;
    Store.tx('Tirar dos turnos', () => {
      if (lower) Store.upd('tokens', lower.id, { turns: left });
      Store.scn({ turn: tn });
    });
    return lower;
  },
  // Turnos por rodada de um token (1 a 4). Se ele já está na ordem, as entradas acompanham no mesmo passo de
  // desfazer: as novas entram no fim, sem iniciativa; ao diminuir, saem primeiro as de número mais alto.
  tokenTurns(t, n) {
    n = clampTurns(n);
    const sc = Store.scene(), have = sc.turn.list.filter(e => e.token === t.id);
    if (n === t.turns && (!have.length || have.length === n)) return false;
    Store.tx('Turnos por rodada', () => {
      Store.upd('tokens', t.id, { turns: n });
      if (!have.length || have.length === n) return;
      const tn = clone(sc.turn), before = tn.list.slice();
      if (have.length < n) for (let k = have.length + 1; k <= n; k++) tn.list.push(turnEntry(t, k));
      else {
        const drop = new Set(have.slice().sort((p, q) => (q.k || 1) - (p.k || 1)).slice(0, have.length - n).map(e => e.id));
        tn.list = tn.list.filter(e => !drop.has(e.id));
      }
      turnRenumber(tn.list); turnKeepCur(tn, before);
      Store.scn({ turn: tn });
    });
    return true;
  },
  /* Anota uma iniciativa que veio de fora (o jogador rolou pela telinha de dados da mesa ao vivo): na primeira
     entrada do token que ainda não tem iniciativa — ou na primeira, se todas têm. Se o token não está na ordem,
     entra. A lista é reordenada, como quando se rola por aqui. Um passo de desfazer. Devolve a entrada. */
  turnNote(t, total, d, b) {
    const sc = Store.scene(), tn = clone(sc.turn);
    let es = tn.list.filter(e => e.token === t.id);
    if (!es.length) {
      for (let k = 1, want = clampTurns(t.turns); k <= want; k++) tn.list.push(turnEntry(t, k));
      turnRenumber(tn.list);
      if (!tn.cur && tn.list.length) tn.cur = tn.list[0].id;
      es = tn.list.filter(e => e.token === t.id);
    }
    es.sort((p, q) => (p.k || 1) - (q.k || 1));
    const e = es.find(x => x.init == null) || es[0];
    e.init = total; e.roll = isFinite(d) && isFinite(b) ? { d, b } : null;
    turnSort(tn.list);
    Store.tx('Anotar iniciativa', () => Store.scn({ turn: tn }));
    return e;
  },
  /* Rola a iniciativa (1d20 + bônus) das entradas pedidas e reordena a lista, a maior primeiro. Tudo num passo
     de desfazer. A vez é guardada pelo id da entrada, então reordenar não muda de quem é a vez.
     Devolve o que saiu: [{ id, name, tokenId, d, bonus, total }], na ordem em que as entradas estavam. */
  turnRoll(ids) {
    const sc = Store.scene(), tn = clone(sc.turn), want = new Set(ids), out = [];
    for (const e of tn.list) {
      if (!want.has(e.id)) continue;
      const b = turnBonus(e), d = rollDie(20);
      e.init = d + b; e.roll = { d, b };
      out.push({ id: e.id, name: turnName(e), tokenId: e.token || null, d, bonus: b, total: d + b });
    }
    if (!out.length) return out;
    turnSort(tn.list);
    Store.tx('Rolar iniciativa', () => Store.scn({ turn: tn }));
    if (Ext.roll) {
      for (const r of out) {
        try { Ext.roll({ kind: 'iniciativa', name: r.name, tokenId: r.tokenId, d: r.d, bonus: r.bonus, total: r.total }); }
        catch (err) { console.error(err); }               // um erro de quem escuta não pode travar a mesa
      }
    }
    return out;
  },
  /* Passa a vez. Ao avançar, desconta as durações (no mesmo passo de desfazer):
     - condição com duração: perde uma rodada quando o próprio token termina a vez
       (ou na virada da rodada, se ele não estiver na ordem). Quem tem mais de um turno
       por rodada desconta uma vez só: ao terminar o primeiro deles (k = 1);
     - efeito com duração: perde uma rodada quando a vez volta para quem estava jogando
       quando ele foi criado (ou na virada da rodada, se foi criado fora de combate).
     Voltar a vez e avançar de novo não desconta duas vezes: turn.back conta quantos passos
     o mestre recuou, e só o passo que vai além do ponto mais adiantado desconta.
     As miras somem a cada troca de vez. Devolve a lista do que acabou. */
  turnStep(d) {
    const sc = Store.scene(), tn = clone(sc.turn), ended = [];
    if (!tn.list.length) return ended;
    if (!tn.on) {
      // Combate parado: o primeiro "próximo turno" só começa o combate, na vez de quem já estava marcado.
      tn.on = true; tn.back = 0;
      if (!tn.list.some(e => e.id === tn.cur)) tn.cur = tn.list[0].id;
      Store.tx('Iniciar combate', () => Store.scn({ turn: tn }));
      return ended;
    }
    let i = tn.list.findIndex(e => e.id === tn.cur);
    const from = i, fromRound = tn.round;
    const leaving = i >= 0 ? tn.list[i] : null;
    let wrapped = false, fresh = false;
    i += d;
    if (i >= tn.list.length) { i = 0; tn.round++; wrapped = true; }
    else if (i < 0) { if (tn.round > 1) { tn.round--; i = tn.list.length - 1; } else i = 0; }
    tn.cur = tn.list[i].id;
    if (d < 0 && i === from && tn.round === fromRound) return ended;     // já está no começo: nada a voltar
    if (d > 0) { if (tn.back > 0) tn.back--; else fresh = true; }
    else tn.back = (tn.back || 0) + 1;
    Store.tx(d > 0 ? 'Próximo turno' : 'Turno anterior', () => {
      const p = { turn: tn };
      if (sc.targets.length) p.targets = [];
      Store.scn(p);
      if (fresh) {
        // o turno "principal" de cada token na ordem: o de menor k (é k = 1, salvo dados estranhos)
        const firstK = new Map();
        for (const e of tn.list) if (e.token) firstK.set(e.token, Math.min(firstK.has(e.token) ? firstK.get(e.token) : Infinity, e.k || 1));
        for (const t of sc.tokens.slice()) {
          const info = t.cinfo || {};
          const ids = t.conds.filter(id => info[id] && info[id].d > 0);
          if (!ids.length) continue;
          if (!(firstK.has(t.id) ? leaving && leaving.token === t.id && (leaving.k || 1) === firstK.get(t.id) : wrapped)) continue;
          const next = Object.assign({}, info);
          let conds = t.conds;
          for (const id of ids) {
            if (info[id].d - 1 <= 0) { delete next[id]; conds = conds.filter(c => c !== id); ended.push(`${(COND_BY_ID[id] || {}).n || id} em ${t.name}`); }
            else next[id] = Object.assign({}, info[id], { d: info[id].d - 1 });
          }
          Store.upd('tokens', t.id, { cinfo: next, conds });
        }
        for (const e of sc.effects.slice()) {
          if (!(e.dur > 0)) continue;
          const anchored = !!e.at && tn.list.some(x => x.id === e.at);
          if (!(anchored ? tn.cur === e.at : wrapped)) continue;
          if (e.dur - 1 <= 0) { Store.del('effects', e.id); ended.push(`efeito ${(FX.P[e.fx] || FX.P.fogo).n}`); }
          else Store.upd('effects', e.id, { dur: e.dur - 1 });
        }
      }
    });
    return ended;
  },
};
