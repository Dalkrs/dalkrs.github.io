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
  clip: [], pings: [],
  anim: true,
  opt: {
    stroke: '#f2c14e', fill: '#f2c14e', fillOn: false, sw: 4, alpha: 1, snap: false, top: false, gmOnly: false, arrow: false, fs: 28,
    wallKind: 'wall',
    fogMode: 'r', fogShape: 'brush', fogSize: 2,
    fx: 'fogo', fxShape: 'circ', fxR: 2, fxAng: 60, fxW: 1, fxAttach: true,
    lightPreset: 'tocha',
    tokOwner: '', tokSize: 1,
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
    case 'editShape': return p.desenhar && !!obj && obj.by === me;
    case 'editFx': return p.efeitos && !!obj && obj.by === me;
    default: return false;
  }
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
const tokName = t => (isGM() || ownsTok(t) || t.showName ? t.name : '???');
const barsMode = t => (isGM() || ownsTok(t) ? 'num' : t.barVis);
const shapeShown = s => isGM() || !s.gm;
const fxShown = e => isGM() || !e.gm;

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

/* ---- Seleção ---- */
const selHas = (c, id) => App.sel.some(s => s.c === c && s.id === id);
function setSel(list) { App.sel = list; Store.emit('sel'); }
function selOf(c) { const out = []; for (const s of App.sel) if (s.c === c) { const o = Store.get(c, s.id); if (o) out.push(o); } return out; }
function pruneSel() {
  const n = App.sel.length;
  App.sel = App.sel.filter(s => Store.get(s.c, s.id));
  return n !== App.sel.length;
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
function parseBar(text, cur, max) {
  const s = String(text).trim().replace(/\s+/g, '').replace(',', '.');
  if (/^[+-]\d+(\.\d+)?$/.test(s)) return clamp(Math.round((cur + Number(s)) * 10) / 10, 0, Math.max(max, cur));
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  return null;
}

/* ---- Ações usadas por ferramentas, menus e painéis ---- */
const Act = {
  barSet(t, i, text) {
    const b = t.bars[i];
    const v = parseBar(text, b.v, b.m);
    if (v == null || v === b.v) return false;
    Store.tx('Alterar ' + b.n, () => Store.upd('tokens', t.id, { bars: t.bars.map((x, j) => (j === i ? Object.assign({}, x, { v }) : x)) }));
    return true;
  },
  barPatch(t, i, patch) {
    Store.tx('Alterar barra', () => Store.upd('tokens', t.id, { bars: t.bars.map((x, j) => (j === i ? Object.assign({}, x, patch) : x)) }));
  },
  condToggle(tokens, id) {
    const allOn = tokens.every(t => t.conds.includes(id));
    Store.tx('Condição', () => {
      for (const t of tokens) {
        const has = t.conds.includes(id);
        if (allOn && has) Store.upd('tokens', t.id, { conds: t.conds.filter(c => c !== id) });
        else if (!allOn && !has) Store.upd('tokens', t.id, { conds: t.conds.concat(id) });
      }
    });
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
          if (sc.turn.list.some(e => e.token === s.id)) {
            const tn = clone(sc.turn);
            tn.list = tn.list.filter(e => e.token !== s.id);
            if (!tn.list.some(e => e.id === tn.cur)) tn.cur = tn.list.length ? tn.list[0].id : null;
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

  toggleDoor(w) {
    if (!isGM()) {
      if (!can('doors')) { UI.toast('O mestre não liberou abrir portas nesta cena.'); return; }
      if (w.locked) { UI.toast('Está trancada.'); return; }
    }
    Store.tx(w.open ? 'Fechar porta' : 'Abrir porta', () => Store.upd('walls', w.id, { open: !w.open }));
  },

  ping(x, y) {
    if (!can('ping')) return;
    App.pings.push({ x, y, t0: performance.now(), c: viewerColor(), n: viewerName() });
    if (App.pings.length > 8) App.pings.shift();
    Render.request();
  },

  /* ---- Ordem de turnos ---- */
  turnAdd(tokens) {
    const sc = Store.scene(), tn = clone(sc.turn);
    let n = 0;
    for (const t of tokens) {
      if (tn.list.some(e => e.token === t.id)) continue;
      tn.list.push({ id: uid('tn'), token: t.id, name: t.name, init: null });
      n++;
    }
    if (!tn.cur && tn.list.length) tn.cur = tn.list[0].id;
    if (n) Store.tx('Adicionar aos turnos', () => Store.scn({ turn: tn }));
    return n;
  },
  turnPatch(fn, label) {
    const tn = clone(Store.scene().turn);
    fn(tn);
    if (!tn.list.some(e => e.id === tn.cur)) tn.cur = tn.list.length ? tn.list[0].id : null;
    Store.tx(label || 'Ordem de turnos', () => Store.scn({ turn: tn }));
  },
  turnStep(d) {
    Act.turnPatch(tn => {
      if (!tn.list.length) return;
      tn.on = true;
      let i = tn.list.findIndex(e => e.id === tn.cur);
      i += d;
      if (i >= tn.list.length) { i = 0; tn.round++; }
      else if (i < 0) { if (tn.round > 1) { tn.round--; i = tn.list.length - 1; } else i = 0; }
      tn.cur = tn.list[i].id;
    }, d > 0 ? 'Próximo turno' : 'Turno anterior');
  },
};
