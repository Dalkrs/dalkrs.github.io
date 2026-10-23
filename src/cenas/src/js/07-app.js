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
  hoverTok: null,                   // o token sob o cursor (para mostrar os números dele)
  iniRolls: new Map(),              // iniciativas roladas pela mesa ao vivo que o mestre ainda pode anotar: id da ficha → { v, d, b, nome, at }
  escolhaReal: null,                // (lote 8) escolhendo no mapa o real de um Clone: o id do real de agora
  anim: true,
  showVision: false,                // mestre: escurecer no mapa o que os jogadores não veem (o "véu")
  opt: {
    stroke: '#f2c14e', fill: '#f2c14e', fillOn: false, sw: 4, alpha: 1, snap: false, top: false, gmOnly: false, arrow: false, fs: 28,
    wallKind: 'wall', wallMode: 'line',
    fogMode: 'r', fogShape: 'brush', fogSize: 2,
    fx: 'fogo', fxShape: 'circ', fxR: 2, fxAng: 60, fxW: 1, fxRW: 3, fxRH: 2, fxDir: 0, fxAttach: true, fxDur: 0,
    lightPreset: 'tocha',
    objCat: 'luz', obj: 'fogueira', objSize: 0, objHidden: false,       // objetos de cenário: categoria, qual, tamanho (0 = o do objeto) e oculto
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
// Os números do token (FOR, CAN, DFF, DFM, ESQ): os da ficha, quando ele tem uma aqui; senão, os que o mestre anotou
// nele. null se não há nenhum. Quem vê: o mestre e o dono do token.
function tokNums(t) {
  const f = t.char ? Fichas.numeros(t) : null;
  if (f) return f;
  const st = t.st ? cleanSt(t.st) : null;
  if (!st) return null;
  const o = {};
  for (const [k, K] of ST_CAMPOS) if (st[k] != null) o[K] = st[k];
  return o;
}
const numsShown = t => isGM() || ownsTok(t);
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
  return sc.tokens.filter(t => { if (t.prop) return false; const [cx, cy] = tokC(t, sc); return areaCtx.isPointInPath(path, cx, cy); });     // (objetos de cenário não levam dano)
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
  const p = { v: clamp(Math.round((b.v + d) * 10) / 10, -barLo(b), barPod(b) > 0 ? barTeto(b) : Math.max(b.m, b.v)) };     // (lote 8: a ferida permanente)
  if (x !== barX(b)) p.x = x;
  return p;
}
const areaDelta = (amt, half) => (half ? Math.sign(amt) * Math.floor(Math.abs(amt) / 2) : amt);
function areaNext(b, amt, half) { return barAfter(b, areaDelta(amt, half)).v; }

/* ---- (lote 7) as condições que mexem em alguma coisa ----
   As condições são lembretes (o contador e as rodadas de sempre), com duas exceções:
   · o Escudado: os pontos dele são a sobrevida do token (o número da condição mostra quanto ainda resta), e ele sai
     quando a sobrevida acaba (de mais de zero para zero);
   · o Agigantado dobra o token e o Encolhido o deixa na metade (de ½ a 8 quadrados); os dois juntos não — fica o que
     acabou de entrar. O tamanho de antes fica em t.tam0, e volta quando a condição sai.
   Quem acerta é o programa do mestre (ou o de quem usa sem mesa): no fim do passo que mudou o token, dentro dele (o
   mesmo Desfazer); e, para o que chegou de fora (um jogador, a ficha), num passo logo depois. */
// (na tela do jogador, a barra de um token do mestre que vai só em proporção traz os pontos da sobrevida em xn)
const sobrevidaTotal = t => Math.round(((t && t.bars) || []).reduce((s, b) => s + (Number(b && b.xn) > 0 ? Number(b.xn) : barX(b)), 0) * 10) / 10;
// o número de uma condição no token: o contador — no Escudado, a sobrevida que ainda resta
function condNum(t, id) { return id === 'escudado' ? sobrevidaTotal(t) : ((((t && t.cinfo) || {})[id] || {}).n || 0); }
const TAM_MIN = 0.25, TAM_MAX = 8;
// → o remendo do token, ou null. antes: { bars, conds } como estavam antes da mudança (o que não mudou, não vem)
function acertarCondicoes(t, antes) {
  if (!t || t.prop || !Array.isArray(t.conds)) return null;
  const p = {}, a = antes || {};
  let conds = t.conds.slice(), mudou = false;
  const info = Object.assign({}, t.cinfo || {});
  if (conds.includes('escudado') && Array.isArray(a.bars)) {
    const era = a.bars.reduce((s, b) => s + barX(b), 0);
    if (era > 0 && sobrevidaTotal(t) <= 0) { conds = conds.filter(c => c !== 'escudado'); delete info.escudado; mudou = true; }
  }
  const tinha = id => (Array.isArray(a.conds) ? a.conds.includes(id) : conds.includes(id));
  if (conds.includes('agigantado') && conds.includes('encolhido')) {
    const sai = tinha('agigantado') ? 'agigantado' : 'encolhido';
    conds = conds.filter(c => c !== sai); delete info[sai]; mudou = true;
  }
  if (Array.isArray(a.conds) && ['agigantado', 'encolhido'].some(id => tinha(id) !== conds.includes(id))) {
    const fator = conds.includes('agigantado') ? 2 : conds.includes('encolhido') ? 0.5 : 1, base = t.tam0 > 0 ? t.tam0 : t.size;
    const tam = fator === 1 ? base : clamp(base * fator, TAM_MIN, TAM_MAX);
    if (fator !== 1 && !(t.tam0 > 0)) p.tam0 = t.size;
    if (fator === 1 && t.tam0 > 0) p.tam0 = null;
    if (tam !== t.size) {
      const [x, y] = snapTok(Store.scene(), t.x, t.y, tam, false);
      Object.assign(p, { size: tam, x, y });
    }
  }
  /* (lote 8) a Ferida permanente e as barras podres andam juntas: a condição tirada leva o podre de todas as barras; a
     barra que apodreceu (pela ficha, por exemplo) traz a condição; e a última barra que deixou de estar podre a leva. */
  const podres = bs => (bs || []).some(b => barPod(b) > 0);
  if (Array.isArray(a.conds) && a.conds.includes('ferida') && !conds.includes('ferida') && podres(t.bars)) {
    p.bars = t.bars.map(b => { if (!barPod(b)) return b; const o = Object.assign({}, b); delete o.pod; return o; });
  } else if (podres(t.bars) && !conds.includes('ferida')) { conds = conds.concat('ferida'); mudou = true; }
  else if (conds.includes('ferida') && !podres(t.bars) && Array.isArray(a.bars) && podres(a.bars)) { conds = conds.filter(c => c !== 'ferida'); delete info.ferida; mudou = true; }
  if (mudou) { p.conds = conds; p.cinfo = info; }
  return Object.keys(p).length ? p : null;
}
/* o que estava antes, num token, pelas operações inversas de um passo ({ bars, conds }, ou as chaves pedidas; só o que
   mudou). As inversas vêm da mais nova para a mais antiga: a última que mexeu numa coisa guarda como ela estava no
   começo. */
function antesDoToken(inv, id, chaves) {
  const out = {}, ks = chaves || ['bars', 'conds'];
  for (const op of inv || []) if (op && op.t === 'upd' && op.c === 'tokens' && op.id === id && op.p) for (const k of ks) if (k in op.p) out[k] = op.p[k];
  return out;
}

/* ---- (lote 7) o Portal e as Runas-armadilha ----
   O token que é solto dentro de um dos círculos de um Portal — o centro dele estava fora dos dois e agora está num —
   vai para o centro do outro círculo, no mesmo passo (o mesmo Desfazer). Quem acerta é o programa do mestre, como nas
   condições: o pedido de um jogador atravessa num passo logo depois. E o token que entra nas Runas-armadilha
   escondidas avisa o mestre (nada muda: Store.emit('runas')). */
const centroTok = (t, sc, x, y) => { const h = t.size * sc.cell / 2; return [(x == null ? t.x : x) + h, (y == null ? t.y : y) + h]; };
const portaisDe = sc => (sc.effects || []).filter(e => e.fx === 'portal' && !e.token && Number.isFinite(e.x2) && Number.isFinite(e.y2));
// → { x, y, portal } (para onde o token vai) ou null. antes: { x, y } de antes do passo (só o que mudou)
function atravessar(t, antes, sc) {
  if (!t || t.prop || !antes || !('x' in antes || 'y' in antes)) return null;
  const [ax, ay] = centroTok(t, sc, antes.x, antes.y), [bx, by] = centroTok(t, sc);
  for (const e of portaisDe(sc)) {
    const g = FX.geom(e, sc), dentro = (x, y, cx, cy) => Math.hypot(x - cx, y - cy) <= g.R;
    if (dentro(ax, ay, g.x, g.y) || dentro(ax, ay, g.x2, g.y2)) continue;          // já estava num dos círculos: não atravessa
    const ent = dentro(bx, by, g.x, g.y), sai = !ent && dentro(bx, by, g.x2, g.y2);
    if (!ent && !sai) continue;
    const h = t.size * sc.cell / 2, [cx, cy] = ent ? [g.x2, g.y2] : [g.x, g.y];
    const [x, y] = snapTok(sc, cx - h, cy - h, t.size, false);
    return { x, y, portal: e.id };
  }
  return null;
}
// As runas escondidas em que o centro do token entrou neste passo
function runasPisadas(t, antes, sc) {
  if (!t || t.prop || !antes || !('x' in antes || 'y' in antes)) return [];
  const [ax, ay] = centroTok(t, sc, antes.x, antes.y), [bx, by] = centroTok(t, sc);
  return (sc.effects || []).filter(e => e.fx === 'runas' && e.gm && (() => { const p = FX.geom(e, sc).path; return areaCtx.isPointInPath(p, bx, by) && !areaCtx.isPointInPath(p, ax, ay); })());
}
const mexeuNoLugar = op => op.t === 'upd' && op.c === 'tokens' && !!op.p && ('x' in op.p || 'y' in op.p);
// A saída de um portal novo: ao lado da entrada, a um raio de folga (do outro lado, se não couber na cena).
function saidaDoPortal(e, sc) {
  const R = (e.r || 1) * sc.cell, d = 2 * R + sc.cell, W = sceneW(sc), y = clamp(e.y, R, Math.max(R, sceneH(sc) - R));
  const x = e.x + d + R <= W ? e.x + d : Math.max(R, e.x - d);
  return { x2: x, y2: y };
}
/* O remendo para trocar o tipo de uma zona (lote 7): o portal ganha a saída (e se solta do token), a muralha os pontos
   de vida, a zona de condição a condição dela; a condição guardada pela zona de antes (sem dano) sai junto com ela. */
function trocaDeZona(e, fx, sc) {
  const p = { fx }, pr = FX.P[fx] || {}, ant = FX.P[e.fx] || {};
  if (pr.portal) { p.k = 'circ'; p.token = null; if (!(Number.isFinite(e.x2) && Number.isFinite(e.y2))) { const g = FX.geom(e, sc); Object.assign(p, saidaDoPortal({ x: g.x, y: g.y, r: e.r }, sc), { x: g.x, y: g.y }); } }
  if (pr.pv > 0 && !(e.pvm > 0)) { p.pv = pr.pv; p.pvm = pr.pv; }
  const soCond = a => !!a && !!a.cond && !areaAmount(a.amt);
  if (pr.cond) { const q = e.apply && e.apply.cond && e.apply.cond.id; if (!e.apply || (soCond(e.apply) && !(pr.conds || [pr.cond]).includes(q))) p.apply = { bar: '', amt: '', cond: { id: pr.cond, n: 0, d: 0 }, skip: [] }; }
  else if (ant.cond && soCond(e.apply) && (ant.conds || [ant.cond]).includes(e.apply.cond.id)) p.apply = null;
  return p;
}
/* ---- (lote 8) o Clone: apoio ----
   n lugares livres para as cópias, a até R quadrados do real (em qualquer direção), dentro do mapa, sem encostar em
   ninguém e sem parede entre o real e o lugar. Ao acaso. → [[x, y]] (o canto de cima à esquerda, em unidades da cena) */
const MAX_CLONES = 10;
function vagasDoClone(sc, t, n, R) {
  const c = sc.cell, s = Math.max(1, Math.ceil(t.size)), occ = new Set();
  for (const o of sc.tokens) {
    const so = Math.max(1, Math.ceil(o.size)), c0 = Math.floor((o.x + 1) / c), r0 = Math.floor((o.y + 1) / c);
    for (let i = 0; i < so; i++) for (let j = 0; j < so; j++) occ.add((c0 + i) + ',' + (r0 + j));
  }
  const c0 = Math.round(t.x / c), r0 = Math.round(t.y / c), [ax, ay] = centroTok(t, sc), cand = [];
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const cx = c0 + dx, cy = r0 + dy;
    if ((!dx && !dy) || cx < 0 || cy < 0 || cx + s > sc.cols || cy + s > sc.rows) continue;
    if (Walls.blocksMove(sc, ax, ay, (cx + s / 2) * c, (cy + s / 2) * c)) continue;
    cand.push([cx, cy]);
  }
  for (let i = cand.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [cand[i], cand[k]] = [cand[k], cand[i]]; }
  // primeiro, os lugares que não encostam no real nem nas outras cópias (espalhadas, cada uma se vê); se não der, os que sobram
  const out = [], grupo = new Set();
  for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) grupo.add((c0 + i) + ',' + (r0 + j));
  const encosta = (cx, cy) => { for (let i = -1; i <= s; i++) for (let j = -1; j <= s; j++) if (grupo.has((cx + i) + ',' + (cy + j))) return true; return false; };
  for (const espalhar of [true, false]) for (const [cx, cy] of cand) {
    if (out.length >= n) break;
    let livre = true;
    for (let i = 0; i < s && livre; i++) for (let j = 0; j < s; j++) if (occ.has((cx + i) + ',' + (cy + j))) { livre = false; break; }
    if (!livre || (espalhar && encosta(cx, cy))) continue;
    for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) { occ.add((cx + i) + ',' + (cy + j)); grupo.add((cx + i) + ',' + (cy + j)); }
    out.push([cx * c, cy * c]);
  }
  return out;
}
// (dentro de um passo) o real e outro do grupo trocam de lugar
function trocarComOReal(realId, outroId) {
  const a = Store.get('tokens', realId), b = Store.get('tokens', outroId);
  if (!a || !b || a === b) return;
  const ax = a.x, ay = a.y;
  Store.upd('tokens', a.id, { x: b.x, y: b.y });
  Store.upd('tokens', b.id, { x: ax, y: ay });
}
// (dentro de um passo) tira tokens da cena, com o que é deles: os efeitos presos neles, a mira e as linhas da ordem
function tirarTokens(sc, ids) {
  const fora = new Set(ids.filter(id => Store.get('tokens', id)));
  if (!fora.size) return;
  for (const e of sc.effects.filter(e => fora.has(e.token))) Store.del('effects', e.id);
  if (sc.targets.some(x => fora.has(x.t))) Store.scn({ targets: sc.targets.filter(x => !fora.has(x.t)) });
  if ([...fora].some(id => inTurn(sc.turn, id))) {
    const tn = clone(sc.turn), before = tn.list.slice();
    turnDrop(tn, [...fora]); turnKeepCur(tn, before);
    Store.scn({ turn: tn });
  }
  for (const id of fora) Store.del('tokens', id);
  if (App.sel.some(x => x.c === 'tokens' && fora.has(x.id))) { App.sel = App.sel.filter(x => !(x.c === 'tokens' && fora.has(x.id))); Store.emit('sel'); }
}
// A barra da vida: a primeira em uso que se chama HP, Vida ou PV; sem nenhuma assim, a primeira em uso.
const VIDA_NOMES = /^(hp|vida|pv|pontos de vida)$/i;
function barraDaVida(bars) {
  const em = (bars || []).filter(b => b && b.on !== false && b.m > 0);
  return em.find(b => VIDA_NOMES.test(String(b.n || '').trim())) || em[0] || null;
}
// levou dano: a barra da vida desceu (o valor ou a sobrevida) entre antes e agora
function levouDano(antes, agora) {
  const a = barraDaVida(antes);
  if (!a) return false;
  const d = (agora || []).find(b => b && b.n === a.n && b.on !== false);
  return !!d && (d.v < a.v || barX(d) < barX(a));
}
/* O grupo de um Clone em que o token está (o real e as cópias), ou só ele. O mestre sabe pelo clone das cópias; o
   jogador, pela marca do grupo que a projeção manda em todos (cg), que não diz qual é o real. */
function grupoDoClone(t, sc) {
  if (!t || !sc) return t ? [t] : [];
  const rid = t.clone || t.id, g = sc.tokens.filter(x => x.id === rid || x.clone === rid);
  if (g.length > 1) return g;                    // (o mestre — e o "ver como jogador" dele — sabe pelo clone das cópias)
  return t.cg ? sc.tokens.filter(x => x.cg === t.cg) : [t];
}
// o real de um Clone (o token com cópias), para o mestre
const realDeClone = (t, sc) => !!t && !t.clone && sc.tokens.some(x => x.clone === t.id);
// o que muda no real e vai para as cópias (o lugar não: cada uma fica onde está)
const ESPELHO_CLONE = ['name', 'img', 'imgChar', 'size', 'tam0', 'shape', 'color', 'bars', 'conds', 'cinfo', 'hidden', 'owner', 'showName', 'barVis', 'fad', 'post', 'auras', 'light', 'char', 'ini'];
/* As regras do Clone, no fim de um passo (ops e inv: o que mudou e como estava antes). Devolve o que fazer, para quem
   chama aplicar dentro de um passo:
     · a cópia cujo real sumiu, ou cujo real não tem mais a condição (ela acabou ou foi tirada), some — e a cópia sem a
       condição também;
     · o real levou dano: todas as cópias somem;
     · uma cópia levou dano: só ela some;
     · senão, o que mudou no real vai para as cópias.
   → [{ k: 'fim' | 'real' | 'copia', real, nome, ids }] e [{ k: 'espelho', id, p }] */
function regrasDoClone(ops, inv) {
  const sc = Store.scene(), out = [];
  const copias = sc ? sc.tokens.filter(t => typeof t.clone === 'string') : [];
  if (!copias.length) return out;
  const grupos = new Map();
  for (const c of copias) { if (!grupos.has(c.clone)) grupos.set(c.clone, []); grupos.get(c.clone).push(c); }
  const mexidos = new Set((ops || []).filter(op => op.t === 'upd' && op.c === 'tokens' && op.p).map(op => op.id));
  const danoEm = t => mexidos.has(t.id) && (a => 'bars' in a && levouDano(a.bars, t.bars))(antesDoToken(inv, t.id, ['bars']));
  for (const [rid, cs] of grupos) {
    const real = Store.get('tokens', rid), nome = real ? tokName(real) : cs[0].name;
    if (!real || !real.conds.includes('clone')) { out.push({ k: 'fim', real: rid, nome, ids: cs.map(c => c.id), semReal: !real }); continue; }
    if (danoEm(real)) { out.push({ k: 'real', real: rid, nome, ids: cs.map(c => c.id) }); continue; }
    const sem = cs.filter(c => !c.conds.includes('clone')).map(c => c.id), dano = cs.filter(c => !sem.includes(c.id) && danoEm(c)).map(c => c.id);
    if (sem.length) out.push({ k: 'fim', real: rid, nome, ids: sem, parte: true });
    if (dano.length) out.push({ k: 'copia', real: rid, nome, ids: dano });
    if (mexidos.has(rid)) {
      const ks = new Set();
      for (const op of ops) if (op.t === 'upd' && op.c === 'tokens' && op.id === rid && op.p) for (const k in op.p) if (ESPELHO_CLONE.includes(k)) ks.add(k);
      if (ks.size) for (const c of cs) {
        if (sem.includes(c.id) || dano.includes(c.id)) continue;
        const p = {};
        for (const k of ks) if (JSON.stringify(c[k]) !== JSON.stringify(real[k])) p[k] = real[k] === undefined ? null : clone(real[k]);
        if (Object.keys(p).length) out.push({ k: 'espelho', id: c.id, p });
      }
    }
  }
  return out;
}
/* (lote 9) O gêmeo de um Duplicado que caiu neste passo: a barra da vida passou de mais de 0 para 0 ou menos (ops e
   inv: o que mudou e como estava antes). Nada muda sozinho: o aviso oferece tirar o gêmeo da cena. → [{ id, nome }] */
function gemeosQueCairam(ops, inv) {
  const sc = Store.scene(), out = [];
  if (!sc || !sc.tokens.some(t => t.dup)) return out;
  const ids = new Set((ops || []).filter(op => op.t === 'upd' && op.c === 'tokens' && op.p && 'bars' in op.p).map(op => op.id));
  for (const id of ids) {
    const t = Store.get('tokens', id), antes = antesDoToken(inv, id, ['bars']);
    if (!t || !t.dup || !('bars' in antes)) continue;
    const a = barraDaVida(antes.bars), d = a ? (t.bars || []).find(b => b && b.n === a.n && b.on !== false) : null;
    if (a && d && a.v > 0 && d.v <= 0) { const o = Store.get('tokens', t.dup); out.push({ id, nome: o ? tokName(o) : tokName(t) }); }
  }
  return out;
}
// aplica as regras (dentro de um passo) e avisa quem some
function aplicarRegrasDoClone(regras) {
  const sc = Store.scene();
  for (const r of regras) {
    if (r.k === 'espelho') { if (Store.get('tokens', r.id)) Store.upd('tokens', r.id, r.p); continue; }
    tirarTokens(sc, r.ids);
    Store.emit('clone', { k: r.k, nome: r.nome, n: r.ids.length, parte: !!r.parte, semReal: !!r.semReal });
  }
}
const acertaAqui = () => !(typeof Nuvem !== 'undefined' && Nuvem.jogador && Nuvem.jogador());
Store.aoFechar(tx => {
  if (!acertaAqui()) return;
  const ids = [...new Set(tx.fwd.filter(op => op.t === 'upd' && op.c === 'tokens').map(op => op.id))];
  for (const id of ids) {
    const t = Store.get('tokens', id), p = acertarCondicoes(t, antesDoToken(tx.inv, id));
    if (p) Store.upd('tokens', id, p);
  }
  // (lote 7) o portal e as runas: só os tokens que mudaram de lugar neste passo
  const sc = Store.scene(), andou = [...new Set(tx.fwd.filter(mexeuNoLugar).map(op => op.id))];
  for (const id of andou) {
    const t = Store.get('tokens', id), antes = antesDoToken(tx.inv, id, ['x', 'y']), v = atravessar(t, antes, sc);
    if (v) { Store.upd('tokens', id, { x: v.x, y: v.y }); Store.emit('portal', { tok: id, fx: v.portal }); continue; }
    for (const r of runasPisadas(t, antes, sc)) Store.emit('runas', { tok: id, fx: r.id });
    // (lote 18) a queda de um penhasco: o aviso sugere o dano (nada muda sozinho)
    const q = typeof Relevo !== 'undefined' ? Relevo.quedaDoPasso(sc, t, antes) : null;
    if (q) Store.emit('queda', q);
  }
  // (lote 8) o Clone: depois de tudo do passo (o dano, a condição que saiu, o que mudou no real)
  aplicarRegrasDoClone(regrasDoClone(tx.fwd, tx.inv));
  // (lote 9) o gêmeo de um Duplicado que caiu: o aviso (nada muda sozinho)
  for (const g of gemeosQueCairam(tx.fwd, tx.inv)) Store.emit('duplicado', Object.assign({ k: 'caiu' }, g));
});
Store.on('commit', e => {
  if (!e.remote || !acertaAqui() || e.sceneId !== Store.S.current) return;
  const ids = [...new Set((e.ops || []).filter(op => op.t === 'upd' && op.c === 'tokens').map(op => op.id))];
  const mud = ids.map(id => [id, acertarCondicoes(Store.get('tokens', id), antesDoToken(e.inv, id))]).filter(x => x[1]);
  if (mud.length) setTimeout(() => Store.tx('Condição', () => {
    for (const [id] of mud) { const p = acertarCondicoes(Store.get('tokens', id), antesDoToken(e.inv, id)); if (p) Store.upd('tokens', id, p); }
  }), 0);
  // (lote 7) o token que um jogador soltou num portal atravessa num passo logo depois; o que pisou nas runas avisa
  const sc = Store.scene(), andou = [...new Set((e.ops || []).filter(mexeuNoLugar).map(op => op.id))];
  const vao = [];
  for (const id of andou) {
    const t = Store.get('tokens', id), antes = antesDoToken(e.inv, id, ['x', 'y']);
    if (atravessar(t, antes, sc)) vao.push([id, antes]);
    else {
      for (const r of runasPisadas(t, antes, sc)) Store.emit('runas', { tok: id, fx: r.id });
      const q = typeof Relevo !== 'undefined' ? Relevo.quedaDoPasso(sc, t, antes) : null;              // (lote 18) a queda do token que um jogador moveu
      if (q) Store.emit('queda', q);
    }
  }
  if (vao.length) setTimeout(() => Store.tx('Atravessar o portal', () => {
    const agora = Store.scene();
    for (const [id, antes] of vao) { const v = atravessar(Store.get('tokens', id), antes, agora); if (v) { Store.upd('tokens', id, { x: v.x, y: v.y }); Store.emit('portal', { tok: id, fx: v.portal }); } }
  }), 0);
  // (lote 8) o Clone, para o que chegou de fora (a ficha deu dano no real, um jogador mexeu): num passo logo depois
  if (regrasDoClone(e.ops, e.inv).length) { const ops = e.ops, inv = e.inv; setTimeout(() => Store.tx('Clone', () => aplicarRegrasDoClone(regrasDoClone(ops, inv))), 0); }
  // (lote 9) o gêmeo que caiu pelo que chegou de fora (a ficha dele mudou nas Fichas)
  for (const g of gemeosQueCairam(e.ops, e.inv)) Store.emit('duplicado', Object.assign({ k: 'caiu' }, g));
});

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

/* (lote 15) A porcentagem numa barra, sempre do máximo (arredonda para baixo): "-10%" tira 10% do máximo (Vida 80/100
   → 70/100), "+25%" põe, "50%" deixa a barra na metade. → { d } (quanto somar), { v } (o valor novo) ou null. */
function barPct(b, s) {
  const m = /^([+-]?)(\d+(?:\.\d+)?)%$/.exec(s);
  if (!m || !b || !(b.m > 0)) return null;
  const q = Math.floor(b.m * Number(m[2]) / 100 + 1e-9);
  return m[1] ? { d: m[1] === '-' ? -q : q } : { v: Math.min(q, Math.max(b.m, b.v)) };
}
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
     grp .... o que une as entradas de um mesmo combatente avulso;
     toks ... só na faixa de um grupo: os tokens que jogam juntos nessa linha (uma iniciativa, rolada uma vez);
     reac ... true: esperando para reagir (segurou a vez para agir fora de ordem). Sai quando a vez dele chega. */
const turnEntry = (t, k) => ({ id: uid('tn'), token: t.id, name: t.name, init: null, roll: null, k });
const turnGroup = e => (e.token ? 't:' + e.token : e.grp ? 'g:' + e.grp : 'e:' + e.id);
const isBand = e => !!e && !e.token && Array.isArray(e.toks);
// A faixa em que um token está (ou null).
const bandOf = (tn, id) => tn.list.find(e => isBand(e) && e.toks.includes(id)) || null;
// O token já está na ordem? Por uma linha dele ou dentro de uma faixa.
const inTurn = (tn, id) => tn.list.some(e => e.token === id || (isBand(e) && e.toks.includes(id)));
// Os tokens de uma entrada que existem na cena: o dela, ou os da faixa.
const turnToks = e => (e.token ? [Store.get('tokens', e.token)] : isBand(e) ? e.toks.map(id => Store.get('tokens', id)) : []).filter(Boolean);
// Tira tokens da ordem: as linhas deles e o lugar deles nas faixas (a faixa fica, mesmo vazia: quem decide é o mestre).
function turnDrop(tn, ids) {
  const fora = new Set(ids);
  tn.list = tn.list.filter(e => !(e.token && fora.has(e.token)));
  for (const e of tn.list) if (isBand(e)) e.toks = e.toks.filter(id => !fora.has(id));
}
// Rótulo de uma entrada: o nome puro no primeiro turno; "Nome · 2º turno" nos outros.
const turnLabel = (e, name) => ((e.k || 1) > 1 ? `${name} · ${e.k}º turno` : name);
const turnName = e => { const t = e.token ? Store.get('tokens', e.token) : null; return turnLabel(e, t ? tokName(t) : e.name); };
// Bônus de iniciativa de uma entrada: o do turno dela (um chefe com 1d20 + 6, 1d20 + 4…), senão o do token, ou o da
// própria entrada avulsa.
function turnBonus(e) {
  if (!e.token) return clampIni(e.bonus);
  const t = Store.get('tokens', e.token);
  if (!t) return 0;
  const v = Array.isArray(t.inis) ? t.inis[(e.k || 1) - 1] : null;
  return v != null && isFinite(v) ? clampIni(v) : clampIni(t.ini);
}
const rollText = (d, b) => `${d} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`;        // "12 + 5", "12 − 2"
// Ordena por iniciativa, a maior primeiro; quem não tem fica no fim. Empate com a faixa de um grupo: o outro vai antes
// (o jogador que empata com a faixa joga primeiro). Outros empates: maior bônus; depois, a ordem em que já estavam.
function turnSort(list) {
  const rows = list.map((e, i) => ({ e, i, v: e.init == null || !isFinite(e.init) ? -Infinity : Number(e.init), b: turnBonus(e), f: isBand(e) ? 1 : 0 }));
  rows.sort((p, q) => (p.v === q.v ? 0 : q.v - p.v) || (p.f - q.f) || (q.b - p.b) || (p.i - q.i));
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
    const pc = barPct(b, s);                                                // (lote 15) "-10%", "+25%" e "50%": do máximo
    if (pc) { if (pc.d === 0 || pc.v === b.v) return false; p = pc.d != null ? barAfter(b, pc.d) : { v: barPod(b) > 0 ? Math.min(pc.v, barTeto(b)) : pc.v }; }
    else if (/^[+-]\d+(\.\d+)?$/.test(s)) p = barAfter(b, Number(s));      // "+5" e "-8": o dano gasta primeiro a sobrevida
    else { const v = parseBar(text, b.v, b.m, barLo(b)); if (v == null) return false; p = { v: barPod(b) > 0 ? Math.min(v, barTeto(b)) : v }; }     // (lote 8: nem acima do teto da ferida)
    if (p.v === b.v && p.x === undefined) return false;
    Store.tx('Alterar ' + b.n, () => Store.upd('tokens', t.id, { bars: t.bars.map((x, j) => (j === i ? barWith(x, p) : x)) }));
    return true;
  },
  /* (lote 15) A porcentagem para vários tokens, na barra de nome `barName`: cada um muda a porcentagem do máximo DELE
     (sem sinal, tira — como o número da caixa "Somar ou subtrair de todos"). Um passo de desfazer. → quantos mudaram,
     ou −1 se o texto não é uma porcentagem. */
  groupPct(tokens, barName, text) {
    const s0 = String(text).trim().replace(/\s+/g, '').replace(',', '.');
    if (!/^[+-]?\d+(\.\d+)?%$/.test(s0)) return -1;
    const s = /^[+-]/.test(s0) ? s0 : '-' + s0;
    let n = 0;
    Store.tx('Alterar ' + barName, () => {
      for (const t of tokens) {
        const i = t.bars.findIndex(b => b.on && b.n === barName);
        if (i < 0) continue;
        const b = t.bars[i], pc = barPct(b, s);
        if (!pc || !pc.d) continue;
        const q = barAfter(b, pc.d);
        if (q.v !== b.v || q.x !== undefined) { Store.upd('tokens', t.id, { bars: t.bars.map((x, j) => (j === i ? barWith(x, q) : x)) }); n++; }
      }
    });
    return n;
  },
  // Sobrevida de uma barra: pontos por cima dela, que absorvem o dano primeiro. Zero tira.
  barExtra(t, i, value) {
    const b = t.bars[i]; if (!b) return false;
    const x = Math.max(0, Math.round((Number(value) || 0) * 10) / 10);
    if (x === barX(b)) return false;
    Store.tx('Sobrevida de ' + b.n, () => Store.upd('tokens', t.id, { bars: t.bars.map((o, j) => (j === i ? barWith(o, { x }) : o)) }));
    return true;
  },
  /* Sobrevida para vários tokens de uma vez, na barra de nome `barName`: cada um fica com a MAIOR — a que já tinha ou
     esta (não soma: dar 10 a quem tem 15 deixa 15). Um passo de desfazer. Devolve quantos tokens mudaram. */
  groupExtra(tokens, barName, value) {
    const x = Math.max(0, Math.round((Number(value) || 0) * 10) / 10);
    if (!(x > 0)) return 0;
    let n = 0;
    Store.tx('Sobrevida', () => {
      for (const t of tokens) {
        const i = t.bars.findIndex(b => b.on && b.m > 0 && b.n === barName);
        if (i < 0 || barX(t.bars[i]) >= x) continue;
        Store.upd('tokens', t.id, { bars: t.bars.map((o, j) => (j === i ? barWith(o, { x }) : o)) });
        n++;
      }
    });
    return n;
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
  /* O contador ou as rodadas de uma condição em vários tokens de uma vez (lote 6), num passo de desfazer. Só mexe em
     quem tem a condição. op: { delta } soma no contador de cada um (descer de 1 tira a condição, como no + e − de um
     token; quem está sem contador não desce); { d } as mesmas rodadas para todos (0: sem prazo). → quantos mudaram */
  condLote(tokens, id, op) {
    let k = 0;
    Store.tx('Condição em vários tokens', () => {
      for (const t of tokens) {
        if (!t || !t.conds.includes(id)) continue;
        const info = Object.assign({}, t.cinfo), cur = Object.assign({}, info[id]);
        if (op.delta != null) {
          const n = (cur.n || 0) + op.delta;
          if (n <= 0) {
            if (!cur.n) continue;
            delete info[id];
            Store.upd('tokens', t.id, { conds: t.conds.filter(c => c !== id), cinfo: info }); k++;
            continue;
          }
          cur.n = n;
        } else if (op.d != null) {
          const d = Math.max(0, Math.round(Number(op.d) || 0));
          if ((cur.d || 0) === d) continue;
          if (d > 0) { cur.d = d; cur.d0 = d; } else { delete cur.d; delete cur.d0; }
        } else continue;
        if (Object.keys(cur).length) info[id] = cur; else delete info[id];
        Store.upd('tokens', t.id, { cinfo: info }); k++;
      }
    });
    return k;
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

  /* (lote 8) A ferida permanente numa barra: quanto da ponta apodrece (0 tira). O valor acima do teto desce para ele, e
     a condição acompanha (entra com a primeira barra podre, sai com a última). Um passo de desfazer. Num token ligado,
     o podre vai para a ficha (estado.podre), como a sobrevida. */
  podSet(t, i, amount, label) {
    const b = t && t.bars[i];
    if (!b || !(b.m > 0)) return false;
    const pod = clamp(Math.round((Number(amount) || 0) * 10) / 10, 0, b.m);
    if (pod === barPod(b)) return false;
    const nb = Object.assign({}, b);
    if (pod > 0) nb.pod = pod; else delete nb.pod;
    if (pod > 0 && nb.v > barTeto(nb)) nb.v = barTeto(nb);
    const bars = t.bars.map((x, j) => (j === i ? nb : x)), alguma = bars.some(x => barPod(x) > 0), p = { bars };
    if (alguma && !t.conds.includes('ferida')) p.conds = t.conds.concat('ferida');
    if (!alguma && t.conds.includes('ferida')) { const info = Object.assign({}, t.cinfo); delete info.ferida; p.conds = t.conds.filter(c => c !== 'ferida'); p.cinfo = info; }
    Store.tx(label || (pod > 0 ? 'Ferida permanente' : 'Tirar a ferida permanente'), () => Store.upd('tokens', t.id, p));
    return true;
  },

  /* (lote 8) O Clone. As cópias são tokens iguais ao real — nome, imagem, tamanho, barras, condições (com a Clone), dono
     e ficha (só para mostrar: ficam fora da sincronização com ela) —, com clone: <id do real>. O real é o token de sempre
     (a ficha, a vez na ordem). Escolher o real é trocar de lugar com a cópia escolhida: os tokens não deslizam, então os
     jogadores não notam. Devolve { n } (quantas cópias couberam) e { real } (o id de quem ficou sendo o real). */
  cloneCriar(t, quantas, raio, sortear) {
    const sc = Store.scene(), n = clamp(Math.round(Number(quantas)) || 3, 1, MAX_CLONES), R = clamp(Math.round(Number(raio)) || 2, 1, 10);
    if (!t || t.prop || t.clone) return { n: 0 };
    const lugares = vagasDoClone(sc, t, n, R);
    if (!lugares.length) return { n: 0 };
    const ids = [];
    Store.tx('Clone', () => {
      if (!t.conds.includes('clone')) Store.upd('tokens', t.id, { conds: t.conds.concat('clone') });
      const base = Store.get('tokens', t.id);
      for (const [x, y] of lugares) {
        const o = clone(base);
        o.id = uid('tk'); o.x = x; o.y = y; o.clone = t.id; o.notes = '';
        o.auras = (o.auras || []).map(a => Object.assign({}, a, { id: uid('au') }));
        Store.add('tokens', o);
        ids.push(o.id);
      }
      if (sortear) trocarComOReal(t.id, [t.id].concat(ids)[Math.floor(Math.random() * (ids.length + 1))]);
    });
    return { n: ids.length, real: t.id };
  },
  // Este é o real: o real troca de lugar com a cópia t (um passo de desfazer). → o id do real, ou null
  cloneReal(t) {
    const real = t && t.clone ? Store.get('tokens', t.clone) : null;
    if (!real) return null;
    Store.tx('Escolher o real', () => trocarComOReal(real.id, t.id));
    return real.id;
  },
  // Sorteia quem é o real entre ele e as cópias (pode ser ele mesmo, que fica onde está). → o id do real, ou null
  cloneSortear(realId) {
    const sc = Store.scene(), cs = sc.tokens.filter(x => x.clone === realId);
    if (!Store.get('tokens', realId) || !cs.length) return null;
    const alvo = [realId].concat(cs.map(x => x.id))[Math.floor(Math.random() * (cs.length + 1))];
    if (alvo !== realId) Store.tx('Sortear o real', () => trocarComOReal(realId, alvo));
    return realId;
  },
  // Desfazer os clones: as cópias somem e a condição sai do real (um passo de desfazer). → quantas cópias sumiram
  cloneDesfazer(realId) {
    const sc = Store.scene(), real = Store.get('tokens', realId), cs = sc.tokens.filter(x => x.clone === realId);
    if (!real && !cs.length) return 0;
    Store.tx('Desfazer os clones', () => {
      if (real && real.conds.includes('clone')) { const info = Object.assign({}, real.cinfo); delete info.clone; Store.upd('tokens', real.id, { conds: real.conds.filter(c => c !== 'clone'), cinfo: info }); }
      tirarTokens(sc, cs.map(x => x.id));
    });
    return cs.length;
  },

  /* (lote 9) O Duplicado: o gêmeo maligno de um personagem (o boss que copia alguém). Um token novo ao lado do
     copiado (a até 1 quadrado; sem lugar, a até 2 ou 3), igual a ele para os jogadores — nome, imagem, tamanho, cor,
     anel —, sem dono, com a condição Duplicado (só o mestre a vê) e dup: <id do copiado>. o.barras: 'cheias' (no
     máximo, sem sobrevida nem podre, sem condições) ou 'agora' (as barras e as condições de agora, com a ferida). Ligado a uma ficha,
     o gêmeo ganha uma ficha só dele (uma cópia, nas Fichas; Fichas.copiarFicha) — sem ela aqui, vai só o token.
     o.turnos: entra na ordem de turnos logo depois do copiado, com a mesma iniciativa. Um passo de desfazer (a ficha
     nova fica nas Fichas). → { id, ficha } ou { erro } */
  duplicadoCriar(t, o) {
    o = o || {};
    const sc = Store.scene();
    if (!t || t.prop) return { erro: 'só tokens' };
    let lugar = null;
    for (const R of [1, 2, 3]) { const v = vagasDoClone(sc, t, 1, R); if (v.length) { lugar = v[0]; break; } }
    if (!lugar) return { erro: 'sem lugar' };
    const agora = o.barras === 'agora';
    const ficha = t.char && typeof Fichas !== 'undefined' && Fichas.copiarFicha ? Fichas.copiarFicha(t.char, { barras: agora ? 'agora' : 'cheias' }) : null;
    let id = null;
    Store.tx('Duplicado', () => {
      /* (como estão agora: as condições vêm junto — a Ferida permanente também, porque o podre está nas barras —, menos o
         Clone, que é do grupo do original, e o Duplicado, que é só do gêmeo) */
      const base = Store.get('tokens', t.id), d = clone(base), fora = c => c !== 'clone' && c !== 'duplicado';
      d.id = uid('tk'); d.x = lugar[0]; d.y = lugar[1]; d.dup = t.id; d.notes = ''; d.owner = null; d.locked = false;
      delete d.clone; delete d.cg;
      d.auras = (d.auras || []).map(a => Object.assign({}, a, { id: uid('au') }));
      d.conds = (agora ? base.conds.filter(fora) : []).concat('duplicado');
      const ci = {};
      if (agora) for (const k of Object.keys(base.cinfo || {})) if (fora(k) && base.conds.includes(k)) ci[k] = clone(base.cinfo[k]);
      d.cinfo = ci;
      if (!agora) d.bars = d.bars.map(b => { const nb = Object.assign({}, b, { v: b.m }); delete nb.x; delete nb.pod; return nb; });
      d.char = ficha || null;
      if (!ficha) d.imgChar = false;                                   // (sem ficha, a imagem passa a ser do token)
      Store.add('tokens', d);
      id = d.id;
      // na ordem de turnos, logo depois do copiado (com a mesma iniciativa); dentro de uma faixa, no fim
      if (o.turnos && inTurn(sc.turn, t.id)) {
        const tn = clone(Store.scene().turn), meus = tn.list.filter(e => e.token === t.id);
        if (meus.length) {
          const i = tn.list.indexOf(meus[meus.length - 1]);
          tn.list.splice(i + 1, 0, ...meus.map(e => Object.assign(turnEntry(d, e.k || 1), { init: e.init == null ? null : e.init, roll: e.roll ? clone(e.roll) : null })));
        } else for (let k = 1; k <= clampTurns(d.turns); k++) tn.list.push(turnEntry(d, k));
        turnRenumber(tn.list);
        Store.scn({ turn: tn });
      }
    });
    return { id, ficha };
  },
  // (lote 9) tira o gêmeo da cena (a ficha dele continua nas Fichas). Um passo de desfazer. → true se tirou
  duplicadoTirar(id) {
    const sc = Store.scene(), t = Store.get('tokens', id);
    if (!t || !t.dup) return false;
    Store.tx('Tirar o gêmeo', () => tirarTokens(sc, [id]));
    return true;
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
    tokens = tokens.filter(t => !t.prop);                // objeto de cenário não é alvo
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
          if (inTurn(sc.turn, s.id)) {
            const tn = clone(sc.turn), before = tn.list.slice();
            turnDrop(tn, [s.id]);                                   // todas as entradas dele (um chefe tem mais de uma) e o lugar numa faixa
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
      if (t.prop || bandOf(tn, t.id)) continue;        // objeto de cenário não joga; e quem está numa faixa já joga nela
      const linhas = tn.list.filter(e => e.token === t.id), want = clampTurns(t.turns), have = linhas.length;
      if (have >= want) continue;
      const inv = have > 0 && linhas.every(e => e.inv);               // as linhas novas de quem está invisível também ficam
      for (let k = have + 1; k <= want; k++) tn.list.push(Object.assign(turnEntry(t, k), inv ? { inv: true } : null));
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
  /* Faixa de iniciativa de um grupo: uma linha só para vários tokens, com um bônus (1d20 + bônus, rolada uma vez no
     combate). Quem tirar mais que a faixa joga antes do grupo; quem tirar menos, depois; empate, o outro vai antes.
     Os tokens saem das linhas deles (e de outra faixa) e passam a jogar nela. Um passo de desfazer. Devolve a entrada. */
  turnBand(name, bonus, ids) {
    const tn = clone(Store.scene().turn), before = tn.list.slice();
    const toks = [...new Set(ids)].filter(id => { const k = Store.get('tokens', id); return k && !k.prop; }).slice(0, MAX_BAND);
    const cheias = new Set(tn.list.filter(e => isBand(e) && e.toks.length).map(e => e.id));
    turnDrop(tn, toks);
    tn.list = tn.list.filter(e => !(cheias.has(e.id) && !e.toks.length));     // a faixa que ficou vazia por isso sai
    const e = { id: uid('tn'), token: null, name: String(name || '').trim().slice(0, 40) || 'Grupo', init: null, roll: null, k: 1, bonus: clampIni(bonus), grp: uid('gr'), toks };
    tn.list.push(e);
    turnKeepCur(tn, before);
    if (!tn.cur) tn.cur = tn.list[0].id;
    Store.tx('Faixa do grupo', () => Store.scn({ turn: tn }));
    return e;
  },
  // Muda a faixa: nome, bônus e quem está nela. Quem entra sai da linha própria (ou de outra faixa).
  bandSet(id, p) {
    const tn = clone(Store.scene().turn), before = tn.list.slice();
    let e = tn.list.find(x => x.id === id);
    if (!isBand(e)) return false;
    if (p.toks) {
      const toks = [...new Set(p.toks)].filter(x => Store.get('tokens', x)).slice(0, MAX_BAND), novos = toks.filter(x => !e.toks.includes(x));
      turnDrop(tn, novos);
      e = tn.list.find(x => x.id === id);
      e.toks = toks;
    }
    if (p.name !== undefined) e.name = String(p.name || '').trim().slice(0, 40) || e.name;
    if (p.bonus !== undefined) e.bonus = clampIni(p.bonus);
    turnKeepCur(tn, before);
    Store.tx('Faixa do grupo', () => Store.scn({ turn: tn }));
    return true;
  },
  // Desfaz a faixa: cada token volta a ter as linhas dele (sem iniciativa), no lugar onde a faixa estava.
  bandSplit(id) {
    const tn = clone(Store.scene().turn), i = tn.list.findIndex(x => x.id === id), e = tn.list[i];
    if (!isBand(e)) return 0;
    const novas = [];
    for (const tid of e.toks) {
      const t = Store.get('tokens', tid);
      if (t) for (let k = 1, n = clampTurns(t.turns); k <= n; k++) novas.push(Object.assign(turnEntry(t, k), e.inv ? { inv: true } : null));   // (a faixa invisível dá linhas invisíveis)
    }
    tn.list.splice(i, 1, ...novas);
    turnRenumber(tn.list);
    if (tn.cur === id) tn.cur = novas.length ? novas[0].id : tn.list.length ? tn.list[Math.min(i, tn.list.length - 1)].id : null;
    Store.tx('Separar a faixa', () => Store.scn({ turn: tn }));
    return novas.length;
  },
  // "Esperando para reagir": marca (ou desmarca) quem segurou a vez para agir fora de ordem.
  turnReac(id, on) {
    const e = Store.scene().turn.list.find(x => x.id === id);
    if (!e || !!e.reac === !!on) return false;
    Act.turnPatch(x => { const y = x.list.find(z => z.id === id); if (on) y.reac = true; else delete y.reac; }, on ? 'Esperando reação' : 'Reagiu');
    return true;
  },
  /* Linha invisível (lote 6): os jogadores não veem a linha; na vez dela, só ficam sabendo que o turno está com o
     mestre. Vale para todas as linhas do mesmo combatente (os vários turnos de um token, ou de uma entrada avulsa).
     Um passo de desfazer. Devolve quantas linhas mudaram. */
  turnInv(id, on) {
    const tn = Store.scene().turn, e = tn.list.find(x => x.id === id);
    if (!e) return 0;
    const g = turnGroup(e), ids = tn.list.filter(x => turnGroup(x) === g && !!x.inv !== !!on).map(x => x.id);
    if (!ids.length) return 0;
    const muda = new Set(ids);
    Act.turnPatch(x => { for (const y of x.list) if (muda.has(y.id)) { if (on) y.inv = true; else delete y.inv; } }, on ? 'Linha invisível' : 'Linha visível');
    return ids.length;
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
      const inv = have.every(e => e.inv);
      if (have.length < n) for (let k = have.length + 1; k <= n; k++) tn.list.push(Object.assign(turnEntry(t, k), inv ? { inv: true } : null));
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
    for (const x of tn.list) if (isBand(x)) x.toks = x.toks.filter(id => id !== t.id);     // quem rolou a própria sai da faixa
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
    if (d > 0 && tn.list[i].reac) delete tn.list[i].reac;               // a vez chegou: a espera pela reação acabou
    if (d > 0) { if (tn.back > 0) tn.back--; else fresh = true; }
    else tn.back = (tn.back || 0) + 1;
    Store.tx(d > 0 ? 'Próximo turno' : 'Turno anterior', () => {
      const p = { turn: tn };
      if (sc.targets.length) p.targets = [];
      Store.scn(p);
      if (fresh) {
        // o turno "principal" de cada token na ordem: o de menor k (é k = 1, salvo dados estranhos)
        const firstK = new Map(), faixa = new Map();
        for (const e of tn.list) if (e.token) firstK.set(e.token, Math.min(firstK.has(e.token) ? firstK.get(e.token) : Infinity, e.k || 1));
        for (const e of tn.list) if (isBand(e)) for (const id of e.toks) faixa.set(id, e.id);       // quem joga numa faixa: a vez é a dela
        for (const t of sc.tokens.slice()) {
          const info = t.cinfo || {};
          const ids = t.conds.filter(id => info[id] && info[id].d > 0);
          if (!ids.length) continue;
          if (!(firstK.has(t.id) ? leaving && leaving.token === t.id && (leaving.k || 1) === firstK.get(t.id) : faixa.has(t.id) ? !!leaving && leaving.id === faixa.get(t.id) : wrapped)) continue;
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
