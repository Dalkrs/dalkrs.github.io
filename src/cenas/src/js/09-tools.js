/* ---------------------------------------------------------------
   9. TOOLS — ferramentas e gestos de mouse e teclado
   --------------------------------------------------------------- */
const Tools = (() => {
  const cv = Render.cv;
  const T = {};
  const scratch = document.createElement('canvas').getContext('2d');
  let g = null;              // gesto em andamento
  let pan = null, rdown = null;
  let chain = null;          // parede sendo desenhada
  let poly = null;           // polígono sendo desenhado
  let ruler = null;          // medição na tela
  let ghost = null;          // posição do cursor para pré-visualizações
  let lastUp = null;         // último clique, para reconhecer clique duplo

  const KEYS = { v: 'select', h: 'pan', t: 'token', b: 'free', l: 'line', r: 'rect', o: 'ell', p: 'poly', x: 'text', w: 'wall', d: 'wall', i: 'light', n: 'fog', e: 'fx', m: 'ruler' };
  const LIST = [
    { id: 'select', n: 'Selecionar', k: 'V', i: 'select', grp: 0 },
    { id: 'pan', n: 'Mover a câmera', k: 'H', i: 'pan', grp: 0 },
    { id: 'token', n: 'Novo token', k: 'T', i: 'token', grp: 1, gm: true },
    { id: 'free', n: 'Desenho livre', k: 'B', i: 'pen', grp: 2, perm: 'draw' },
    { id: 'line', n: 'Linha', k: 'L', i: 'line', grp: 2, perm: 'draw' },
    { id: 'rect', n: 'Retângulo', k: 'R', i: 'rect', grp: 2, perm: 'draw' },
    { id: 'ell', n: 'Elipse', k: 'O', i: 'ell', grp: 2, perm: 'draw' },
    { id: 'poly', n: 'Polígono', k: 'P', i: 'poly', grp: 2, perm: 'draw' },
    { id: 'text', n: 'Texto', k: 'X', i: 'text', grp: 2, perm: 'draw' },
    { id: 'wall', n: 'Paredes e portas', k: 'W', i: 'wall', grp: 3, gm: true },
    { id: 'light', n: 'Luz', k: 'I', i: 'light', grp: 3, gm: true },
    { id: 'fog', n: 'Névoa manual', k: 'N', i: 'fog', grp: 3, gm: true },
    { id: 'fx', n: 'Efeito de magia', k: 'E', i: 'fx', grp: 4, perm: 'fx' },
    { id: 'ruler', n: 'Régua', k: 'M', i: 'ruler', grp: 5, perm: 'ruler' },
    { id: 'ping', n: 'Ping (ou tecla G sobre o mapa)', k: 'G', i: 'ping', grp: 5, perm: 'ping' },
  ];
  const allowed = id => {
    const d = LIST.find(x => x.id === id);
    if (!d) return false;
    if (d.gm) return isGM();
    return d.perm ? can(d.perm) : true;
  };

  function world(e) {
    const r = cv.getBoundingClientRect(), v = App.view;
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    return { sx, sy, x: v.x + sx / v.z, y: v.y + sy / v.z };
  }
  const r1 = v => Math.round(v * 10) / 10;
  const snapCenter = (sc, p, free) => (free ? [p.x, p.y] : [(Math.floor(p.x / sc.cell) + 0.5) * sc.cell, (Math.floor(p.y / sc.cell) + 0.5) * sc.cell]);

  /* ---- O que está debaixo do cursor ---- */
  function hitTest(p, opt) {
    const o = opt || {}, sc = Store.scene(), tol = 6 / App.view.z, gm = isGM();
    for (let i = sc.tokens.length - 1; i >= 0; i--) {
      const t = sc.tokens[i];
      if (!tokShown(t, sc)) continue;
      const [cx, cy, half] = tokC(t, sc);
      const inside = t.shape === 'quad' ? Math.abs(p.x - cx) <= half && Math.abs(p.y - cy) <= half : Math.hypot(p.x - cx, p.y - cy) <= half;
      if (inside) return { c: 'tokens', id: t.id };
    }
    if (o.tokensOnly) return null;
    if (gm) {
      for (let i = sc.lights.length - 1; i >= 0; i--) {
        const l = sc.lights[i];
        if (Math.hypot(p.x - l.x, p.y - l.y) <= 12 / App.view.z) return { c: 'lights', id: l.id };
      }
    }
    for (let i = sc.effects.length - 1; i >= 0; i--) {
      const e = sc.effects[i];
      if (!fxVisible(e) || !(gm || can('editFx', e))) continue;
      if (scratch.isPointInPath(FX.geom(e, sc).path, p.x, p.y)) return { c: 'effects', id: e.id };
    }
    for (const top of [true, false]) {
      for (let i = sc.shapes.length - 1; i >= 0; i--) {
        const s = sc.shapes[i];
        if (!!s.top !== top || !shapeShown(s)) continue;
        if (s.lock && !o.locked) continue;
        if (!(gm || can('editShape', s))) continue;
        if (hitShape(s, p.x, p.y, tol)) return { c: 'shapes', id: s.id };
      }
    }
    return null;
  }
  // A abertura (porta, janela, cortina) cujo ícone está sob o cursor: o mais próximo, entre os que quem olha alcança.
  function hitDoor(p) {
    let best = null, bd = 12 / App.view.z;
    for (const s of doorSpots(Store.scene())) {
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      if (d <= bd) { bd = d; best = s.w; }
    }
    return best;
  }
  // A parede sob o cursor. Numa parede comum só conta o trecho que sobrou dela (o que uma abertura cobre
  // é da abertura). Com duas empilhadas no mesmo lugar (cortina sobre janela), vale a de cima; clicar de
  // novo com ela selecionada passa para a de baixo.
  function hitWall(p) {
    const sc = Store.scene(), z = App.view.z, near = [];
    let best = 7 / z;
    for (const w of sc.walls) {
      const d = Walls.dist(sc, w, p.x, p.y);
      if (d < 7 / z) { near.push({ w, d }); if (d < best) best = d; }
    }
    const tie = near.filter(n => n.d <= best + 1.5 / z).map(n => n.w);
    if (tie.length < 2) return tie[0] || null;
    const i = App.sel.length === 1 ? tie.findIndex(w => selHas('walls', w.id)) : -1;
    return i < 0 ? tie[tie.length - 1] : tie[(i + tie.length - 1) % tie.length];
  }
  function snapWall(p, free, skipId) {
    const sc = Store.scene();
    let best = null, bd = 9 / App.view.z;
    for (const w of sc.walls) {
      if (w.id === skipId) continue;
      for (const [x, y] of [[w.x1, w.y1], [w.x2, w.y2]]) {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bd) { bd = d; best = [x, y]; }
      }
    }
    return best || snapPt(sc, p.x, p.y, free, 0.5);
  }
  const blockedPath = (sc, ax, ay, bx, by) => Walls.blocksMove(sc, ax, ay, bx, by);

  /* ---- Alças do objeto selecionado ---- */
  function handles() {
    if (g && g.type !== 'handle') return [];
    if (App.sel.length !== 1) return [];
    const s = App.sel[0], o = Store.get(s.c, s.id), sc = Store.scene();
    if (!o) return [];
    const out = [], gm = isGM(), selTool = App.tool === 'select';
    if (s.c === 'shapes' && selTool) {
      if (!(gm || can('editShape', o)) || o.lock) return out;
      if (o.k === 'line') out.push({ kind: 'end', i: 0, x: o.pts[0], y: o.pts[1] }, { kind: 'end', i: 1, x: o.pts[2], y: o.pts[3] });
      else if (o.k !== 'text') {
        const b = shapeBBox(o), xs = [b.x, b.x + b.w / 2, b.x + b.w], ys = [b.y, b.y + b.h / 2, b.y + b.h];
        for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) if (i !== 1 || j !== 1) out.push({ kind: 'box', hx: i, hy: j, x: xs[i], y: ys[j] });
      }
    } else if (s.c === 'effects' && selTool) {
      if (!(gm || can('editFx', o))) return out;
      const ge = FX.geom(o, sc);
      out.push({ kind: 'fx', x: ge.hx, y: ge.hy, round: true });
      // retângulo: a bolinha gira e muda a largura; o quadradinho do canto muda largura e altura
      if (o.k === 'rect') out.push({ kind: 'fxbox', x: ge.x + ge.cs * ge.hw - ge.sn * ge.hh, y: ge.y + ge.sn * ge.hw + ge.cs * ge.hh });
    } else if (s.c === 'tokens' && selTool) {
      if (!(gm || can('auras', o))) return out;
      const [cx, cy, half] = tokC(o, sc);
      o.auras.forEach((a, i) => {
        if (a.k !== 'cone') return;
        const R = a.r * sc.cell + half, d = rad(a.dir || 0);
        out.push({ kind: 'aura', i, x: cx + Math.cos(d) * R, y: cy + Math.sin(d) * R, round: true });
      });
    } else if (s.c === 'lights' && gm && (selTool || App.tool === 'light')) {
      out.push({ kind: 'light', x: o.x + o.dim * sc.cell, y: o.y, round: true });
    } else if (s.c === 'walls' && gm && App.tool === 'wall') {
      out.push({ kind: 'wall', i: 0, x: o.x1, y: o.y1 }, { kind: 'wall', i: 1, x: o.x2, y: o.y2 });
    }
    return out;
  }
  function hitHandle(p) {
    const r = 8 / App.view.z;
    for (const hd of handles()) if (Math.abs(p.x - hd.x) <= r && Math.abs(p.y - hd.y) <= r) return hd;
    return null;
  }
  function startHandle(hd) {
    const s = App.sel[0], o = Store.get(s.c, s.id);
    g = { type: 'handle', hd, c: s.c, id: s.id, o0: clone(o), b0: hd.kind === 'box' ? shapeBBox(o) : null, started: false };
  }
  function moveHandle(p, e) {
    const sc = Store.scene(), free = e.altKey, hd = g.hd, o0 = g.o0;
    if (!g.started) { Store.begin('Ajustar'); g.started = true; }
    const snapShape = App.opt.snap !== free;
    if (hd.kind === 'box') {
      const b0 = g.b0;
      let x0 = b0.x, y0 = b0.y, x1 = b0.x + b0.w, y1 = b0.y + b0.h;
      const [qx, qy] = snapPt(sc, p.x, p.y, !snapShape);
      if (hd.hx === 0) x0 = Math.min(qx, x1 - 2); else if (hd.hx === 2) x1 = Math.max(qx, x0 + 2);
      if (hd.hy === 0) y0 = Math.min(qy, y1 - 2); else if (hd.hy === 2) y1 = Math.max(qy, y0 + 2);
      Store.upd('shapes', g.id, shapeScaled(o0, b0, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }));
    } else if (hd.kind === 'end') {
      const [qx, qy] = snapPt(sc, p.x, p.y, !snapShape);
      const pts = o0.pts.slice();
      pts[hd.i * 2] = qx; pts[hd.i * 2 + 1] = qy;
      Store.upd('shapes', g.id, { pts });
    } else if (hd.kind === 'fxbox') {
      // canto do retângulo: largura e altura, com o centro parado
      const ge = FX.geom(o0, sc), dx = p.x - ge.x, dy = p.y - ge.y;
      const fit = v => clamp(free ? Math.round(v * 100) / 100 : snapTo(v, 0.5), 0.5, 60);
      Store.upd('effects', g.id, { rw: fit(Math.abs(dx * ge.cs + dy * ge.sn) * 2 / sc.cell), rh: fit(Math.abs(dy * ge.cs - dx * ge.sn) * 2 / sc.cell) });
    } else if (hd.kind === 'fx' || hd.kind === 'aura') {
      let ox, oy, half;
      if (hd.kind === 'fx') { const ge = FX.geom(o0, sc); ox = ge.x; oy = ge.y; half = ge.half; }
      else { [ox, oy, half] = tokC(o0, sc); }
      let dir = deg(Math.atan2(p.y - oy, p.x - ox));
      const rect = hd.kind === 'fx' && o0.k === 'rect';       // no retângulo a bolinha fica no meio do lado: a distância é meia largura
      let r = rect ? Math.hypot(p.x - ox, p.y - oy) * 2 / sc.cell : (Math.hypot(p.x - ox, p.y - oy) - half) / sc.cell;
      if (!free) { dir = snapTo(dir, 15); r = snapTo(r, 0.5); }
      r = clamp(r, 0.5, 60); dir = ((dir % 360) + 360) % 360;
      if (rect) Store.upd('effects', g.id, { rw: r, dir });
      else if (hd.kind === 'fx') Store.upd('effects', g.id, { r, dir });
      else Store.upd('tokens', g.id, { auras: o0.auras.map((a, i) => (i === hd.i ? Object.assign({}, a, { r, dir }) : a)) });
    } else if (hd.kind === 'light') {
      let dim = Math.hypot(p.x - o0.x, p.y - o0.y) / sc.cell;
      if (!free) dim = snapTo(dim, 0.5);
      dim = clamp(dim, 0.5, 60);
      const ratio = o0.dim > 0 ? o0.bright / o0.dim : 0.5;
      Store.upd('lights', g.id, { dim, bright: Math.round(dim * ratio * 2) / 2 });
    } else if (hd.kind === 'wall') {
      const [qx, qy] = snapWall(p, free, g.id);
      Store.upd('walls', g.id, hd.i === 0 ? { x1: qx, y1: qy } : { x2: qx, y2: qy });
    }
  }
  function endHandle() { if (g.started) Store.commit(); g = null; }

  /* ---- Arrastar a seleção ---- */
  function startMove(p) {
    const items = [], gm = isGM();
    for (const s of App.sel) {
      const o = Store.get(s.c, s.id);
      if (!o) continue;
      if (s.c === 'tokens') { if (can('moveToken', o)) items.push({ c: s.c, id: o.id, x: o.x, y: o.y, size: o.size }); }
      else if (s.c === 'shapes') { if ((gm || can('editShape', o)) && !o.lock) items.push({ c: s.c, id: o.id, o0: o.pts ? { pts: o.pts.slice() } : { x: o.x, y: o.y } }); }
      else if (s.c === 'effects') { if ((gm || can('editFx', o)) && !o.token) items.push({ c: s.c, id: o.id, x: o.x, y: o.y }); }
      else if (s.c === 'lights') { if (gm) items.push({ c: s.c, id: o.id, x: o.x, y: o.y }); }
    }
    if (!items.length) return null;
    return { type: 'move', p0: p, items, moved: false, lead: items.find(i => i.c === 'tokens') || items[0] };
  }
  function doMove(p, e) {
    const sc = Store.scene();
    let dx = p.x - g.p0.x, dy = p.y - g.p0.y;
    if (!g.moved) {
      if (Math.hypot(dx, dy) * App.view.z < 4) return;
      g.moved = true; Store.begin('Mover');
    }
    const free = e.altKey, L = g.lead;
    if (L.c === 'tokens') { const [nx, ny] = snapTok(sc, L.x + dx, L.y + dy, L.size, free); dx = nx - L.x; dy = ny - L.y; }
    else if (L.c === 'shapes') {
      if (App.opt.snap !== free) {
        const ax = L.o0.pts ? L.o0.pts[0] : L.o0.x, ay = L.o0.pts ? L.o0.pts[1] : L.o0.y;
        const [nx, ny] = snapPt(sc, ax + dx, ay + dy);
        dx = nx - ax; dy = ny - ay;
      }
    } else { const [nx, ny] = snapPt(sc, L.x + dx, L.y + dy, free); dx = nx - L.x; dy = ny - L.y; }
    for (const it of g.items) {
      if (it.c === 'tokens') { const [nx, ny] = snapTok(sc, it.x + dx, it.y + dy, it.size, true); Store.upd('tokens', it.id, { x: nx, y: ny }); }
      else if (it.c === 'shapes') Store.upd('shapes', it.id, shapeMoved(it.o0, dx, dy));
      else Store.upd(it.c, it.id, { x: it.x + dx, y: it.y + dy });
    }
  }
  function endMove() {
    if (!g.moved) return;
    const sc = Store.scene();
    if (!isGM() && sc.blockMove) {
      for (const it of g.items) {
        if (it.c !== 'tokens') continue;
        const t = Store.get('tokens', it.id), hf = it.size * sc.cell / 2;
        if (t && blockedPath(sc, it.x + hf, it.y + hf, t.x + hf, t.y + hf)) {
          Store.cancel();
          UI.toast('Há uma parede no caminho.');
          return;
        }
      }
    }
    Store.commit();
  }
  function nudge(dx, dy) {
    const sc = Store.scene(), toks = selOf('tokens').filter(t => can('moveToken', t));
    if (!toks.length) return false;
    const moves = toks.map(t => ({ t, to: snapTok(sc, t.x + dx * sc.cell, t.y + dy * sc.cell, t.size, false) }));
    if (!isGM() && sc.blockMove) {
      for (const m of moves) {
        const hf = m.t.size * sc.cell / 2;
        if (blockedPath(sc, m.t.x + hf, m.t.y + hf, m.to[0] + hf, m.to[1] + hf)) { UI.toast('Há uma parede no caminho.'); return true; }
      }
    }
    Store.tx('Mover', () => { for (const m of moves) Store.upd('tokens', m.t.id, { x: m.to[0], y: m.to[1] }); });
    return true;
  }

  function endMarquee() {
    const sc = Store.scene(), gm = isGM();
    const x0 = Math.min(g.x0, g.x1), x1 = Math.max(g.x0, g.x1), y0 = Math.min(g.y0, g.y1), y1 = Math.max(g.y0, g.y1);
    if ((x1 - x0) * App.view.z < 4 && (y1 - y0) * App.view.z < 4) return;
    const inR = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
    const picked = [];
    for (const t of sc.tokens) {
      if (!tokShown(t, sc)) continue;
      const [cx, cy] = tokC(t, sc);
      if (inR(cx, cy)) picked.push({ c: 'tokens', id: t.id });
    }
    if (!picked.length) {
      for (const s of sc.shapes) {
        if (!shapeShown(s) || s.lock || !(gm || can('editShape', s))) continue;
        const b = shapeBBox(s);
        if (inR(b.x, b.y) && inR(b.x + b.w, b.y + b.h)) picked.push({ c: 'shapes', id: s.id });
      }
      for (const e of sc.effects) {
        if (!fxVisible(e) || !(gm || can('editFx', e))) continue;
        const ge = FX.geom(e, sc);
        if (inR(ge.cx, ge.cy)) picked.push({ c: 'effects', id: e.id });
      }
      if (gm) for (const l of sc.lights) if (inR(l.x, l.y)) picked.push({ c: 'lights', id: l.id });
    }
    const base = g.add.filter(a => !picked.some(b => b.c === a.c && b.id === a.id));
    setSel(base.concat(picked));
  }

  // Desenho travado sob o cursor. O clique simples passa direto por ele (é para isso que se trava a arte
  // de fundo), então só é procurado quando nada mais foi acertado ali.
  const LOCK_HINT = 'Item travado · dois cliques para selecionar', LOCK_STUCK = 'Travado: destrave para mover';
  function lockedAt(p) {
    const hit = hitTest(p, { locked: true });
    if (!hit || hit.c !== 'shapes') return null;
    const s = Store.get('shapes', hit.id);
    return s && s.lock ? s : null;
  }

  // Cursor e dica conforme o que está sob o mouse (só na ferramenta Selecionar, uma vez por quadro).
  let hoverRaf = 0, hoverCur = '', hoverHint = '';
  function setHoverHint(t) { if (t !== hoverHint) { hoverHint = t; UI.hint(); } }
  function hover() {
    if (hoverRaf) return;
    hoverRaf = requestAnimationFrame(() => {
      hoverRaf = 0;
      if (g || App.tool !== 'select' || !App.mouse.inside) return;
      const q = App.mouse;
      let c = '', hint = '';
      if (hitHandle(q)) c = 'crosshair';
      else if (hitDoor(q)) c = 'pointer';
      else {
        const hit = hitTest(q);
        if (hit) {
          const o = Store.get(hit.c, hit.id);
          c = (hit.c === 'tokens' ? can('moveToken', o) : hit.c === 'effects' ? !o.token : true) ? 'grab' : 'pointer';
        } else {
          const lk = lockedAt(q);
          if (lk) hint = selHas('shapes', lk.id) ? LOCK_STUCK : LOCK_HINT;
        }
      }
      if (c !== hoverCur) { hoverCur = c; cursor(); }
      setHoverHint(hint);
    });
  }

  /* ---- Selecionar ---- */
  T.select = {
    hint: 'Clique para selecionar e arraste para mover. Arraste no vazio para selecionar vários. Botão direito abre o menu.',
    down(p, e) {
      const hd = hitHandle(p);
      if (hd) { startHandle(hd); return; }
      const door = hitDoor(p);
      if (door) { Act.toggleDoor(door); return; }
      const hit = hitTest(p);
      if (hit) {
        if (e.shiftKey) {
          if (selHas(hit.c, hit.id)) { setSel(App.sel.filter(s => !(s.c === hit.c && s.id === hit.id))); return; }
          setSel(App.sel.concat(hit));
        } else if (!selHas(hit.c, hit.id)) setSel([hit]);
        g = startMove(p);
        if (!g && hit.c === 'tokens') {
          // Não dá para mover: guarda o motivo para avisar se a pessoa tentar arrastar.
          const tk = Store.get('tokens', hit.id), sc = Store.scene();
          const why = isGM() ? (tk.locked ? 'Este token está com a posição travada. Destrave pelo botão direito.' : '')
            : !ownsTok(tk) ? '' : tk.locked ? 'O mestre travou a posição deste token.' : !sc.perms.mover ? 'O mestre não liberou mover tokens nesta cena.' : '';
          if (why) g = { type: 'stuck', p0: p, why };
        }
      } else {
        // Desenho travado que já está selecionado (por dois cliques): o clique não o solta, e arrastar
        // não move; quem tentar arrastar recebe o motivo. Travado e não selecionado: o clique passa direto.
        const lk = lockedAt(p);
        if (lk && selHas('shapes', lk.id)) {
          if (e.shiftKey) setSel(App.sel.filter(s => !(s.c === 'shapes' && s.id === lk.id)));
          else g = { type: 'stuck', p0: p, why: LOCK_STUCK };
          return;
        }
        const keep = e.shiftKey ? App.sel.slice() : [];
        if (!e.shiftKey && App.sel.length) setSel([]);
        g = { type: 'marquee', x0: p.x, y0: p.y, x1: p.x, y1: p.y, add: keep };
      }
    },
    move(p, e) {
      if (!g) { hover(); return; }
      if (g.type === 'handle') moveHandle(p, e);
      else if (g.type === 'move') { doMove(p, e); if (g.moved) cv.style.cursor = 'grabbing'; }
      else if (g.type === 'marquee') { g.x1 = p.x; g.y1 = p.y; }
      else if (g.type === 'stuck') { if (Math.hypot(p.x - g.p0.x, p.y - g.p0.y) * App.view.z > 8) { UI.toast(g.why); g = null; } return; }
      Render.request();
    },
    up() {
      if (!g) return;
      if (g.type === 'handle') { endHandle(); cursor(); return; }
      if (g.type === 'move') endMove();
      else if (g.type === 'marquee') endMarquee();
      g = null;
      cursor();
      Render.request();
    },
    dbl(p) {
      const hit = hitTest(p, { locked: true });
      if (!hit) return;
      // Texto solto: dois cliques editam. Texto travado: dois cliques selecionam, como qualquer desenho travado
      // (é o caminho para destravar ou apagar; editar continua no painel e no botão direito).
      if (hit.c === 'shapes') { const s = Store.get('shapes', hit.id); if (s.k === 'text' && !s.lock && (isGM() || can('editShape', s))) { UI.editText(s); return; } }
      setSel([hit]);
      UI.openTab('sel', hit.c === 'tokens' && isGM() ? 'tk-name' : null);
      hover();                               // a dica acompanha: de "dois cliques para selecionar" para "destrave para mover"
    },
    preview(ctx, px, sc) {
      if (!g) return;
      if (g.type === 'marquee') {
        const x = Math.min(g.x0, g.x1), y = Math.min(g.y0, g.y1), w = Math.abs(g.x1 - g.x0), hh = Math.abs(g.y1 - g.y0);
        ctx.fillStyle = 'rgba(230,171,79,0.12)'; ctx.fillRect(x, y, w, hh);
        ctx.strokeStyle = 'rgba(230,171,79,0.9)'; ctx.lineWidth = 1.2 * px; ctx.strokeRect(x, y, w, hh);
      } else if (g.type === 'move' && g.moved && g.lead.c === 'tokens') {
        const t = Store.get('tokens', g.lead.id);
        if (!t) return;
        const hf = g.lead.size * sc.cell / 2;
        ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(g.lead.x + hf, g.lead.y + hf, hf * 0.9, 0, TAU); ctx.fill(); ctx.restore();
        Render.drawMeasure([g.lead.x + hf, g.lead.y + hf, t.x + hf, t.y + hf], sc, px, viewerColor());
      }
    },
  };

  /* ---- Token ---- */
  T.token = {
    hint: 'Clique no mapa para criar um token. Arrastar um arquivo de imagem para o mapa cria o token já com ela.',
    down(p) {
      const sc = Store.scene(), size = App.opt.tokSize || 1;
      const [x, y] = snapTok(sc, p.x - size * sc.cell / 2, p.y - size * sc.cell / 2, size, false);
      const t = newToken(sc, x, y, { size, owner: App.opt.tokOwner || null });
      if (t.owner) t.barVis = 'num';
      Store.tx('Criar token', () => Store.add('tokens', t));
      setSel([{ c: 'tokens', id: t.id }]);
      set('select');
      UI.openTab('sel', 'tk-name');
    },
    move(p) { ghost = p; Render.request(); },
    preview(ctx, px, sc) {
      if (!ghost) return;
      const size = App.opt.tokSize || 1, s = size * sc.cell;
      const [x, y] = snapTok(sc, ghost.x - s / 2, ghost.y - s / 2, size, false);
      ctx.save(); ctx.setLineDash([6 * px, 5 * px]); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.6 * px;
      ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s / 2 - s * 0.05, 0, TAU); ctx.stroke(); ctx.restore();
    },
  };

  /* ---- Desenho e formas ---- */
  function shapeBase(k) {
    const o = App.opt;
    return { id: uid('sh'), k, s: o.stroke, sw: o.sw, f: o.fillOn ? o.fill : null, a: o.alpha, top: !!o.top, gm: isGM() && !!o.gmOnly, lock: false, by: authorId() };
  }
  function buildShape(d, preview) {
    const b = shapeBase(d.k), z = App.view.z;
    if (d.k === 'free') {
      b.f = null;
      b.pts = preview ? d.pts : Geo.simplify(d.pts, 1.2 / z);
      if (b.pts.length < 4) b.pts = [d.pts[0], d.pts[1], d.pts[0] + 0.1, d.pts[1]];
    } else if (d.k === 'line') {
      if (!preview && Math.hypot(d.x1 - d.x0, d.y1 - d.y0) * z < 4) return null;
      b.f = null; b.pts = [d.x0, d.y0, d.x1, d.y1]; b.arrow = !!App.opt.arrow;
    } else {
      const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1), w = Math.abs(d.x1 - d.x0), hh = Math.abs(d.y1 - d.y0);
      if (!preview && (w * z < 4 || hh * z < 4)) return null;
      b.x = x; b.y = y; b.w = w; b.h = hh;
    }
    return b;
  }
  function dragTool(k, hint) {
    return {
      hint, cursor: 'crosshair',
      down(p, e) {
        const sc = Store.scene();
        const q = k === 'free' ? [p.x, p.y] : snapPt(sc, p.x, p.y, App.opt.snap === e.altKey);
        g = { type: 'draw', k, x0: q[0], y0: q[1], x1: q[0], y1: q[1], pts: [r1(q[0]), r1(q[1])] };
      },
      move(p, e) {
        if (!g || g.type !== 'draw') return;
        const sc = Store.scene();
        if (k === 'free') {
          const n = g.pts.length;
          if (Math.hypot(p.x - g.pts[n - 2], p.y - g.pts[n - 1]) * App.view.z > 2.5) g.pts.push(r1(p.x), r1(p.y));
        } else {
          let [x, y] = snapPt(sc, p.x, p.y, App.opt.snap === e.altKey);
          if (e.shiftKey) {
            const dx = x - g.x0, dy = y - g.y0;
            if (k === 'line') { const a = snapTo(Math.atan2(dy, dx), Math.PI / 4), L = Math.hypot(dx, dy); x = g.x0 + Math.cos(a) * L; y = g.y0 + Math.sin(a) * L; }
            else { const m = Math.max(Math.abs(dx), Math.abs(dy)); x = g.x0 + Math.sign(dx || 1) * m; y = g.y0 + Math.sign(dy || 1) * m; }
          }
          g.x1 = x; g.y1 = y;
        }
        Render.request();
      },
      up() {
        if (!g || g.type !== 'draw') return;
        const s = buildShape(g, false);
        g = null;
        if (s) Store.tx('Desenhar', () => Store.add('shapes', s));
        Render.request();
      },
      preview(ctx) { if (g && g.type === 'draw') { const s = buildShape(g, true); if (s) Render.drawShape(ctx, s); } },
    };
  }
  T.free = dragTool('free', 'Arraste para desenhar à mão livre.');
  T.line = dragTool('line', 'Arraste para traçar uma linha. Shift trava em ângulos de 45°.');
  T.rect = dragTool('rect', 'Arraste para criar um retângulo. Shift faz um quadrado.');
  T.ell = dragTool('ell', 'Arraste para criar uma elipse. Shift faz um círculo.');

  function finishPoly() {
    const d = poly;
    poly = null;
    if (!d) return;
    const z = App.view.z, pts = [];
    for (let i = 0; i < d.pts.length; i += 2) {
      const n = pts.length;
      if (n && Math.hypot(d.pts[i] - pts[n - 2], d.pts[i + 1] - pts[n - 1]) * z < 3) continue;
      pts.push(d.pts[i], d.pts[i + 1]);
    }
    if (pts.length >= 6) {
      const b = shapeBase('poly');
      b.pts = pts;
      Store.tx('Desenhar', () => Store.add('shapes', b));
    } else UI.toast('Um polígono precisa de pelo menos três cantos.');
    Render.request();
  }
  T.poly = {
    hint: 'Clique para marcar cada canto. Clique duplo ou Enter fecha; Backspace desfaz o último canto; Esc cancela.',
    cursor: 'crosshair',
    down(p, e) {
      const sc = Store.scene(), q = snapPt(sc, p.x, p.y, App.opt.snap === e.altKey);
      if (!poly) poly = { pts: [], x: q[0], y: q[1] };
      if (poly.pts.length >= 6 && Math.hypot(q[0] - poly.pts[0], q[1] - poly.pts[1]) * App.view.z < 9) { finishPoly(); return; }
      poly.pts.push(q[0], q[1]);
      Render.request();
    },
    move(p, e) {
      if (!poly) return;
      [poly.x, poly.y] = snapPt(Store.scene(), p.x, p.y, App.opt.snap === e.altKey);
      Render.request();
    },
    dbl() { finishPoly(); },
    key(e) {
      if (!poly) return false;
      if (e.key === 'Enter') { finishPoly(); return true; }
      if (e.key === 'Escape') { poly = null; Render.request(); return true; }
      if (e.key === 'Backspace') { poly.pts.length = Math.max(0, poly.pts.length - 2); if (!poly.pts.length) poly = null; Render.request(); return true; }
      return false;
    },
    preview(ctx, px) {
      if (!poly || !poly.pts.length) return;
      const o = App.opt, p = poly.pts;
      ctx.save();
      ctx.globalAlpha = o.alpha; ctx.lineJoin = ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
      ctx.lineTo(poly.x, poly.y);
      if (o.fillOn) { ctx.fillStyle = hexA(o.fill, 0.5); ctx.fill(); }
      ctx.strokeStyle = o.stroke; ctx.lineWidth = Math.max(o.sw, 1.5 * px); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1 * px;
      ctx.beginPath(); ctx.arc(p[0], p[1], 4.5 * px, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    },
  };
  T.text = {
    hint: 'Clique onde o texto deve começar.',
    cursor: 'text',
    down(p) {
      const base = shapeBase('text');
      UI.prompt('Texto no mapa', 'Texto', '', { multiline: true, ok: 'Colocar' }).then(txt => {
        if (!txt || !txt.trim()) return;
        Object.assign(base, { x: p.x, y: p.y, txt: txt.trim(), fs: App.opt.fs, f: null, sw: 0 });
        Store.tx('Texto', () => Store.add('shapes', base));
        setSel([{ c: 'shapes', id: base.id }]);
        set('select');
      });
    },
  };

  /* ---- Paredes, portas, janelas e cortinas ---- */
  const WALL_COLORS = { wall: '#f0c26a', door: '#7fd1ff', secret: '#e39bff', window: '#8fe9ff', veil: '#b79bff' };
  const WALL_LABELS = { wall: 'Parede', door: 'Porta', secret: 'Porta secreta', window: 'Janela', veil: 'Cortina' };
  function wallProps(kind) {
    if (kind === 'door' || kind === 'secret') return { k: 'door', secret: kind === 'secret' };
    return { k: kind === 'window' || kind === 'veil' ? kind : 'wall', secret: false };
  }
  function newWall(x1, y1, x2, y2, kind) {
    return Object.assign({ id: uid('wl'), x1, y1, x2, y2, open: false, locked: false }, wallProps(kind));
  }
  function addWall(x1, y1, x2, y2) {
    if (Math.hypot(x2 - x1, y2 - y1) < 2) return;
    const kind = App.opt.wallKind, w = newWall(x1, y1, x2, y2, kind);
    Store.tx(WALL_LABELS[kind] || 'Parede', () => Store.add('walls', w));
    chain = w.k === 'door' ? null : { x: x2, y: y2, cx: x2, cy: y2 };
  }
  function selectWall(hit, e) {
    if (e.shiftKey) setSel(selHas('walls', hit.id) ? App.sel.filter(s => s.id !== hit.id) : App.sel.filter(s => s.c === 'walls').concat({ c: 'walls', id: hit.id }));
    else setSel([{ c: 'walls', id: hit.id }]);
  }
  T.wall = {
    get hint() {
      return App.opt.wallMode === 'room'
        ? 'Arraste um retângulo para levantar as quatro paredes de uma sala. Clique numa parede para selecioná-la. Alt solta da grade.'
        : 'Clique para começar e a cada canto; Enter, Esc ou clique duplo termina. Clique numa parede para selecioná-la. Alt solta da grade.';
    },
    cursor: 'crosshair',
    down(p, e) {
      const hd = hitHandle(p);
      if (hd && hd.kind === 'wall') { startHandle(hd); return; }
      const start = snapWall(p, e.altKey);
      if (App.opt.wallMode === 'room') { chain = null; g = { type: 'room', p0: p, x0: start[0], y0: start[1], x1: start[0], y1: start[1], moved: false }; return; }
      g = { type: 'wallDown', p0: p, moved: false, start };
    },
    move(p, e) {
      if (g && g.type === 'handle') { moveHandle(p, e); Render.request(); return; }
      const q = snapWall(p, e.altKey);
      if (g && g.type === 'room') {
        g.x1 = q[0]; g.y1 = q[1];
        if (Math.hypot(p.x - g.p0.x, p.y - g.p0.y) * App.view.z > 5) g.moved = true;
      } else if (g && g.type === 'wallDown' && !g.moved && Math.hypot(p.x - g.p0.x, p.y - g.p0.y) * App.view.z > 5) {
        g.moved = true;
        if (!chain) chain = { x: g.start[0], y: g.start[1], cx: g.start[0], cy: g.start[1] };
      }
      if (chain) { chain.cx = q[0]; chain.cy = q[1]; }
      ghost = { x: q[0], y: q[1] };
      Render.request();
    },
    up(p, e) {
      if (g && g.type === 'handle') { endHandle(); Render.request(); return; }
      if (g && g.type === 'room') {
        const d = g;
        g = null;
        const x0 = Math.min(d.x0, d.x1), x1 = Math.max(d.x0, d.x1), y0 = Math.min(d.y0, d.y1), y1 = Math.max(d.y0, d.y1);
        if (d.moved && x1 - x0 > 2 && y1 - y0 > 2) {
          // sala: as quatro paredes de uma vez (porta não fecha sala, então vira parede)
          const kind = App.opt.wallKind === 'door' || App.opt.wallKind === 'secret' ? 'wall' : App.opt.wallKind;
          Store.tx('Sala', () => { for (const [a, b2, c, d2] of [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]]) Store.add('walls', newWall(a, b2, c, d2, kind)); });
        } else { const hit = hitWall(p); if (hit) selectWall(hit, e); else if (App.sel.length) setSel([]); }
        Render.request();
        return;
      }
      if (!g || g.type !== 'wallDown') return;
      g = null;
      const q = snapWall(p, e.altKey);
      if (chain) { addWall(chain.x, chain.y, q[0], q[1]); Render.request(); return; }
      const hit = hitWall(p);
      if (hit) { selectWall(hit, e); return; }
      if (App.sel.length) setSel([]);
      chain = { x: q[0], y: q[1], cx: q[0], cy: q[1] };
      Render.request();
    },
    dbl() { chain = null; Render.request(); },
    key(e) {
      if (chain && (e.key === 'Enter' || e.key === 'Escape')) { chain = null; Render.request(); return true; }
      return false;
    },
    preview(ctx, px) {
      const col = WALL_COLORS[App.opt.wallKind] || WALL_COLORS.wall;
      ctx.save();
      ctx.lineCap = 'round';
      if (g && g.type === 'room' && g.moved) {
        const x = Math.min(g.x0, g.x1), y = Math.min(g.y0, g.y1), w = Math.abs(g.x1 - g.x0), hh = Math.abs(g.y1 - g.y0);
        ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 5.5 * px; ctx.strokeRect(x, y, w, hh);
        ctx.strokeStyle = col; ctx.lineWidth = 2.6 * px; ctx.setLineDash([8 * px, 5 * px]); ctx.strokeRect(x, y, w, hh);
      }
      if (chain) {
        ctx.beginPath(); ctx.moveTo(chain.x, chain.y); ctx.lineTo(chain.cx, chain.cy);
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 5.5 * px; ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = 2.6 * px; ctx.setLineDash([8 * px, 5 * px]); ctx.stroke();
      }
      if (ghost && !(g && g.type === 'handle')) {
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(ghost.x, ghost.y, 5 * px, 0, TAU);
        ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3.5 * px; ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5 * px; ctx.stroke();
      }
      ctx.restore();
    },
  };

  /* ---- Luz ---- */
  T.light = {
    hint: 'Clique para colocar uma fonte de luz. Ela só aparece quando a cena está em penumbra ou no escuro.',
    cursor: 'crosshair',
    down(p, e) {
      const hd = hitHandle(p);
      if (hd && hd.kind === 'light') { startHandle(hd); return; }
      const sc = Store.scene(), pr = LIGHT_PRESETS.find(x => x.id === App.opt.lightPreset) || LIGHT_PRESETS[1];
      const [x, y] = snapPt(sc, p.x, p.y, e.altKey, 0.5);
      const l = { id: uid('lz'), name: pr.n, x, y, bright: pr.bright, dim: pr.dim, c: pr.c, on: true };
      Store.tx('Colocar luz', () => Store.add('lights', l));
      setSel([{ c: 'lights', id: l.id }]);
      if (sc.light === 'claro') UI.toast('A cena está clara, então a luz não muda nada ainda.', { action: 'Pôr em penumbra', run: () => Store.tx('Luz ambiente', () => Store.scn({ light: 'penumbra' })) });
      set('select');
      UI.openTab('sel');
    },
    move(p, e) { if (g && g.type === 'handle') { moveHandle(p, e); Render.request(); } },
    up() { if (g && g.type === 'handle') { endHandle(); Render.request(); } },
  };

  /* ---- Névoa manual ---- */
  T.fog = {
    hint: 'Pinte para revelar ou esconder áreas dos jogadores. No modo retângulo, arraste a área.',
    cursor: 'crosshair',
    down(p, e) {
      const o = App.opt, sc = Store.scene();
      if (!sc.fog.manual) {
        UI.toast('A névoa manual está desligada nesta cena.', { action: 'Ligar', run: () => Store.tx('Ligar névoa manual', () => Store.scn({ fog: Object.assign({}, sc.fog, { manual: true }) })) });
        return;
      }
      if (o.fogShape === 'rect') {
        const q = snapPt(sc, p.x, p.y, e.altKey, 1);
        g = { type: 'fogRect', x0: q[0], y0: q[1], x1: q[0], y1: q[1] };
      } else {
        g = { type: 'fog', op: { id: uid('fg'), m: o.fogMode, k: 'brush', s: Math.round(o.fogSize * sc.cell), pts: [r1(p.x), r1(p.y)] } };
        Vision.previewOp(g.op);
      }
      Render.request();
    },
    move(p, e) {
      ghost = p;
      if (g && g.type === 'fog') {
        const pts = g.op.pts, n = pts.length;
        if (Math.hypot(p.x - pts[n - 2], p.y - pts[n - 1]) > g.op.s * 0.1) {
          pts.push(r1(p.x), r1(p.y));
          Vision.previewOp(Object.assign({}, g.op, { pts: pts.slice(-4) }));
        }
      } else if (g && g.type === 'fogRect') {
        const q = snapPt(Store.scene(), p.x, p.y, e.altKey, 1);
        g.x1 = q[0]; g.y1 = q[1];
      }
      Render.request();
    },
    up() {
      if (!g) return;
      const d = g;
      g = null;
      if (d.type === 'fog') {
        const op = d.op;
        if (op.pts.length > 6) op.pts = Geo.simplify(op.pts, op.s * 0.04);
        Store.tx(op.m === 'r' ? 'Revelar área' : 'Esconder área', () => Store.add('fogOps', op));
      } else if (d.type === 'fogRect') {
        const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1), w = Math.abs(d.x1 - d.x0), hh = Math.abs(d.y1 - d.y0);
        if (w > 1 && hh > 1) {
          const op = { id: uid('fg'), m: App.opt.fogMode, k: 'rect', x, y, w, h: hh };
          Store.tx(op.m === 'r' ? 'Revelar área' : 'Esconder área', () => Store.add('fogOps', op));
        }
      }
      Render.request();
    },
    preview(ctx, px, sc) {
      const o = App.opt, col = o.fogMode === 'r' ? '#8fe0a8' : '#ff8c7e';
      ctx.save();
      ctx.strokeStyle = col; ctx.lineWidth = 1.6 * px; ctx.setLineDash([6 * px, 4 * px]);
      if (g && g.type === 'fogRect') {
        const x = Math.min(g.x0, g.x1), y = Math.min(g.y0, g.y1), w = Math.abs(g.x1 - g.x0), hh = Math.abs(g.y1 - g.y0);
        ctx.fillStyle = hexA(col, 0.18); ctx.fillRect(x, y, w, hh); ctx.strokeRect(x, y, w, hh);
      } else if (ghost && o.fogShape === 'brush') {
        ctx.beginPath(); ctx.arc(ghost.x, ghost.y, o.fogSize * sc.cell / 2, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    },
  };

  /* ---- Efeitos de magia ---- */
  function fxFromOpt(x, y, tok) {
    const o = App.opt, sc = Store.scene();
    const dur = o.fxDur > 0 ? Math.round(o.fxDur) : 0;        // duração em rodadas; 0 = até alguém remover
    return {
      id: uid('fx'), fx: o.fx, k: o.fxShape, x, y, r: o.fxR, w: o.fxW, rw: o.fxRW, rh: o.fxRH, ang: o.fxAng, dir: o.fxShape === 'rect' ? o.fxDir : 0,
      pow: 0.8, token: tok ? tok.id : null, gm: false, by: authorId(),
      seed: 1 + Math.floor(Math.random() * 999), dur, dur0: dur, at: dur && sc.turn.on ? sc.turn.cur : null, apply: null,
    };
  }
  // Retângulo: arrasta-se a diagonal, de um canto ao outro (onde o botão desceu é um canto). Os dois cantos
  // encaixam na grade, de meio em meio quadrado; Alt solta. Preso a um token, cresce a partir do centro dele.
  // Com rotação nas opções, a diagonal é lida nos eixos do retângulo girado.
  function dragRect(p, e, sc) {
    if (!g.moved && Math.hypot(p.x - g.x0, p.y - g.y0) * App.view.z < 6) return;
    g.moved = true;
    const cell = sc.cell, [qx, qy] = snapPt(sc, p.x, p.y, e.altKey, 0.5);
    const d = rad(g.e.dir || 0), cs = Math.cos(d), sn = Math.sin(d);
    const dx = qx - g.x0, dy = qy - g.y0;
    let a = dx * cs + dy * sn, b = dy * cs - dx * sn;
    const size = v => clamp(e.altKey ? Math.round(Math.abs(v) / cell * 100) / 100 : snapTo(Math.abs(v) / cell, 0.5), 0.5, 60);
    if (g.tok) { g.e.rw = size(a * 2); g.e.rh = size(b * 2); return; }
    g.e.rw = size(a); g.e.rh = size(b);
    a = (a < 0 ? -1 : 1) * g.e.rw * cell; b = (b < 0 ? -1 : 1) * g.e.rh * cell;
    g.e.x = g.x0 + (cs * a - sn * b) / 2; g.e.y = g.y0 + (sn * a + cs * b) / 2;
  }
  function fxOrigin(p, e) {
    const sc = Store.scene();
    let tok = null;
    if (App.opt.fxAttach) { const hit = hitTest(p, { tokensOnly: true }); if (hit) tok = Store.get('tokens', hit.id); }
    if (tok && !isGM() && !ownsTok(tok)) tok = null;
    const [x, y] = tok ? tokC(tok, sc) : snapPt(sc, p.x, p.y, e.altKey, 0.5);
    return { x, y, tok };
  }
  T.fx = {
    get hint() {
      return App.opt.fxShape === 'rect'
        ? 'Arraste de um canto ao outro para desenhar o retângulo; um clique solta no tamanho das opções. Com "prender ao token" ligado, clicar num token faz o efeito acompanhá-lo.'
        : 'Clique para soltar o efeito; arraste para dar direção e tamanho. Com "prender ao token" ligado, clicar num token faz o efeito acompanhá-lo.';
    },
    cursor: 'crosshair',
    down(p, e) {
      const o = fxOrigin(p, e), sc = Store.scene();
      g = { type: 'fx', e: fxFromOpt(o.x, o.y, o.tok), half: o.tok ? o.tok.size * sc.cell / 2 : 0, moved: false, x0: o.x, y0: o.y, tok: !!o.tok };
      Render.request();
    },
    move(p, e) {
      ghost = { p, alt: e.altKey };
      if (g && g.type === 'fx' && g.e.k === 'rect') dragRect(p, e, Store.scene());
      else if (g && g.type === 'fx') {
        const sc = Store.scene(), dx = p.x - g.e.x, dy = p.y - g.e.y, dist = Math.hypot(dx, dy);
        if (g.moved || dist * App.view.z >= 6) {
          g.moved = true;
          let dir = deg(Math.atan2(dy, dx)), r = (dist - g.half) / sc.cell;
          if (!e.altKey) { dir = snapTo(dir, 15); r = snapTo(r, 0.5); }
          g.e.dir = ((dir % 360) + 360) % 360;
          g.e.r = clamp(r, 0.5, 60);
        }
      }
      Render.request();
    },
    up() {
      if (!g || g.type !== 'fx') return;
      const e = g.e;
      g = null;
      Store.tx('Soltar efeito', () => Store.add('effects', e));
      setSel([{ c: 'effects', id: e.id }]);
      set('select');
    },
    preview(ctx, px, sc) {
      let e = null;
      if (g && g.type === 'fx') e = g.e;
      else if (ghost && ghost.p) { const o = fxOrigin(ghost.p, { altKey: ghost.alt }); e = fxFromOpt(o.x, o.y, o.tok); }
      if (!e) return;
      const ge = FX.geom(e, sc), pr = FX.P[e.fx] || FX.P.fogo;
      ctx.save();
      ctx.fillStyle = hexA(pr.tint, 0.22); ctx.fill(ge.path);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3.5 * px; ctx.stroke(ge.path);
      ctx.strokeStyle = pr.edge; ctx.lineWidth = 1.8 * px; ctx.setLineDash([7 * px, 5 * px]); ctx.stroke(ge.path);
      ctx.restore();
      if (g) Render.label(ctx, e.k === 'rect' ? `${fmt(e.rw)} × ${fmt(e.rh)} q` : e.k === 'line' ? `${fmt(e.r)} q de comprimento` : `${fmt(e.r)} q`, ge.hx, ge.hy - 18 * px, px);
    },
  };

  /* ---- Régua ---- */
  T.ruler = {
    hint: 'Arraste para medir. Para medir um caminho, clique ponto a ponto e termine com clique duplo. Esc limpa.',
    cursor: 'crosshair',
    down(p, e) {
      const q = snapCenter(Store.scene(), p, e.altKey);
      if (ruler && ruler.live) ruler.pts.push(q[0], q[1]);
      else ruler = { pts: [q[0], q[1], q[0], q[1]], live: true };
      g = { type: 'ruler', p0: p, moved: false };
      Render.request();
    },
    move(p, e) {
      if (!ruler || !ruler.live) return;
      const q = snapCenter(Store.scene(), p, e.altKey), n = ruler.pts.length;
      ruler.pts[n - 2] = q[0]; ruler.pts[n - 1] = q[1];
      if (g && g.type === 'ruler' && Math.hypot(p.x - g.p0.x, p.y - g.p0.y) * App.view.z > 5) g.moved = true;
      Render.request();
    },
    up() {
      if (g && g.type === 'ruler') { if (g.moved && ruler) ruler.live = false; g = null; }
    },
    dbl() { if (ruler) { ruler.live = false; Render.request(); } },
    key(e) {
      if (e.key === 'Escape' && ruler) { ruler = null; Render.request(); return true; }
      return false;
    },
    preview(ctx, px, sc) { if (ruler) Render.drawMeasure(ruler.pts, sc, px, viewerColor()); },
  };

  T.ping = {
    hint: 'Clique para chamar a atenção de todos para um ponto. A tecla G faz o mesmo em qualquer ferramenta.',
    cursor: 'crosshair',
    down(p) { Act.ping(p.x, p.y); },
  };
  T.pan = { hint: 'Arraste para mover a câmera. Em qualquer ferramenta: espaço + arrastar, botão do meio ou botão direito.', cursor: 'grab' };

  /* ---- Troca de ferramenta ---- */
  function resetState() {
    if (g && g.type === 'handle' && g.started) Store.cancel();
    else if (g && g.type === 'move' && g.moved) Store.cancel();
    else if (g && g.type === 'fog') Vision.restoreManual();
    g = null; chain = null; poly = null; ghost = null; hoverCur = '';
    setHoverHint('');
  }
  function set(id, opt) {
    if (!T[id] || !allowed(id)) id = 'select';
    resetState();
    if (id !== 'ruler') ruler = null;
    App.tool = id;
    if (opt && opt.wallKind) { App.opt.wallKind = opt.wallKind; if (opt.wallKind === 'door') App.opt.wallMode = 'line'; }   // porta não fecha sala
    if (id !== 'wall' && App.sel.some(s => s.c === 'walls')) setSel(App.sel.filter(s => s.c !== 'walls'));
    cursor();
    Store.emit('tool');
    Render.request();
  }
  function cursor() {
    cv.style.cursor = pan ? 'grabbing' : App.keys.space ? 'grab' : App.tool === 'select' && hoverCur ? hoverCur : (T[App.tool].cursor || 'default');
  }

  /* ---- Eventos do mouse ---- */
  function trackMouse(p) {
    const m = App.mouse;
    m.sx = p.sx; m.sy = p.sy; m.x = p.x; m.y = p.y; m.inside = true;
  }
  cv.addEventListener('pointerdown', e => {
    if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();
    if (Store.inTx() && !g) Store.commit();   // fecha edição ao vivo que tenha ficado aberta num campo
    UI.closeMenus();
    e.preventDefault();                      // o clique no mapa não rouba o foco nem seleciona texto
    const p = world(e);
    trackMouse(p);
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* sem captura, segue normal */ }
    if (e.button === 1 || (e.button === 0 && (App.keys.space || App.tool === 'pan'))) {
      e.preventDefault();
      pan = { sx: e.clientX, sy: e.clientY, vx: App.view.x, vy: App.view.y };
      cursor();
      return;
    }
    if (e.button === 2) { rdown = { sx: e.clientX, sy: e.clientY, vx: App.view.x, vy: App.view.y, moved: false }; return; }
    if (e.button !== 0) return;
    const t = T[App.tool];
    if (t.down) t.down(p, e);
  });
  cv.addEventListener('pointermove', e => {
    const p = world(e);
    trackMouse(p);
    if (pan) {
      App.view.x = pan.vx - (e.clientX - pan.sx) / App.view.z;
      App.view.y = pan.vy - (e.clientY - pan.sy) / App.view.z;
      Render.request();
      return;
    }
    if (rdown) {
      if (!rdown.moved && Math.hypot(e.clientX - rdown.sx, e.clientY - rdown.sy) > 5) { rdown.moved = true; cv.style.cursor = 'grabbing'; }
      if (rdown.moved) {
        App.view.x = rdown.vx - (e.clientX - rdown.sx) / App.view.z;
        App.view.y = rdown.vy - (e.clientY - rdown.sy) / App.view.z;
        Render.request();
      }
      return;
    }
    const t = T[App.tool];
    if (t.move) t.move(p, e);
    UI.status();
  });
  function pointerEnd(e) {
    const p = world(e);
    if (pan) { pan = null; cursor(); return; }
    if (rdown) {
      const moved = rdown.moved;
      rdown = null; cursor();
      if (!moved && e.type === 'pointerup') UI.contextMenu(p, e.clientX, e.clientY);
      return;
    }
    const t = T[App.tool];
    if (e.type !== 'pointerup') { resetState(); Render.request(); return; }
    if (t.up) t.up(p, e);
    if (e.button !== 0) return;
    const now = performance.now();
    if (lastUp && now - lastUp.t < 380 && Math.hypot(e.clientX - lastUp.x, e.clientY - lastUp.y) < 7) {
      lastUp = null;
      const t2 = T[App.tool];
      if (t2.dbl) t2.dbl(p, e);
    } else lastUp = { t: now, x: e.clientX, y: e.clientY };
  }
  cv.addEventListener('pointerup', pointerEnd);
  cv.addEventListener('pointercancel', pointerEnd);
  cv.addEventListener('pointerleave', () => { App.mouse.inside = false; if (!g) { ghost = null; Render.request(); } setHoverHint(''); UI.status(); });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('mousedown', e => e.preventDefault());
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const p = world(e);
    const dy = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
    Render.zoomAt(p.sx, p.sy, App.view.z * Math.exp(-dy * (e.ctrlKey ? 0.008 : 0.0016)));
    UI.status();
  }, { passive: false });

  /* ---- Teclado ---- */
  function undo() { const e = Store.undo(); if (e) { pruneSel(); UI.toast('Desfeito' + (e.label ? ': ' + e.label.toLowerCase() : '') + '.'); } }
  function redo() { const e = Store.redo(); if (e) { pruneSel(); UI.toast('Refeito' + (e.label ? ': ' + e.label.toLowerCase() : '') + '.'); } }

  window.addEventListener('keydown', e => {
    if (UI.modalOpen()) return;
    const fk = focusKind(e.target);
    if (fk === 'text') return;                                   // digitando num campo: nenhum atalho
    const k = e.key, lk = k.length === 1 ? k.toLowerCase() : k, mod = e.ctrlKey || e.metaKey;
    // Espaço e Enter num botão ou caixa de marcar acionam o próprio controle; setas num deslizante ajustam o valor.
    if ((e.code === 'Space' || k === 'Enter') && fk !== 'none') return;
    if (fk === 'range' && k.startsWith('Arrow')) return;
    if (e.code === 'Space') { e.preventDefault(); if (!App.keys.space) { App.keys.space = true; cursor(); } return; }
    const t = T[App.tool];
    if (!mod && t.key && t.key(e)) { e.preventDefault(); return; }
    if (mod) {
      if (lk === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (lk === 'y') { e.preventDefault(); redo(); }
      else if (lk === 'c') { const n = Act.copySel(); if (n) UI.toast(n === 1 ? 'Copiado. Ctrl+V cola onde o cursor estiver.' : `${n} itens copiados. Ctrl+V cola onde o cursor estiver.`); }
      else if (lk === 'd') { e.preventDefault(); Act.duplicateSel(); }
      else if (lk === 'a' && isGM()) { e.preventDefault(); setSel(Store.scene().tokens.map(x => ({ c: 'tokens', id: x.id }))); }
      return;
    }
    if (k === 'Delete' || k === 'Backspace') {
      const n = Act.deleteSel();
      if (n) { e.preventDefault(); UI.toast(n === 1 ? 'Item apagado.' : `${n} itens apagados.`, { action: 'Desfazer', run: undo }); }
      return;
    }
    if (k === 'Escape') {
      if (g) { resetState(); Render.request(); }
      else if (App.sel.length) setSel([]);
      else if (App.tool !== 'select') set('select');
      return;
    }
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
      if (nudge(k === 'ArrowLeft' ? -1 : k === 'ArrowRight' ? 1 : 0, k === 'ArrowUp' ? -1 : k === 'ArrowDown' ? 1 : 0)) e.preventDefault();
      return;
    }
    if (k === '+' || k === '=') { const [w, hh] = Render.size(); Render.zoomAt(w / 2, hh / 2, App.view.z * 1.25); UI.status(); return; }
    if (k === '-') { const [w, hh] = Render.size(); Render.zoomAt(w / 2, hh / 2, App.view.z / 1.25); UI.status(); return; }
    if (k === '0' || k === 'Home') { Render.fit(); UI.status(); return; }
    if (lk === 'g') { if (App.mouse.inside) Act.ping(App.mouse.x, App.mouse.y); return; }
    if (lk === 'a') {                       // mira: o token sob o cursor, ou os selecionados
      if (!can('target')) return;
      const hit = App.mouse.inside ? hitTest(App.mouse, { tokensOnly: true }) : null;
      const toks = hit ? [Store.get('tokens', hit.id)] : selOf('tokens');
      if (toks.length) Act.targetToggle(toks);
      else UI.toast('Para mirar, passe o mouse sobre um token e aperte A.');
      return;
    }
    if (KEYS[lk] && allowed(KEYS[lk])) set(KEYS[lk], KEYS[lk] === 'wall' ? { wallKind: lk === 'd' ? 'door' : 'wall' } : null);
  });
  window.addEventListener('keyup', e => { if (e.code === 'Space') { App.keys.space = false; cursor(); } });
  window.addEventListener('blur', () => { App.keys.space = false; cursor(); });

  function drawPreview(ctx, px, sc) {
    const t = T[App.tool];
    if (t.preview) t.preview(ctx, px, sc);
  }

  return { LIST, set, allowed, handles, drawPreview, hitTest, undo, redo, busy: () => !!g, hint: () => hoverHint || T[App.tool].hint || '', cancel() { resetState(); Render.request(); } };
})();
