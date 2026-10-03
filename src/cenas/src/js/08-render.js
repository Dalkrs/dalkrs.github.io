/* ---------------------------------------------------------------
   8. RENDER — desenho da cena no canvas
   Ordem das camadas: fundo, grade, desenhos de baixo, efeitos sem brilho,
   luz e escuridão, auras, efeitos luminosos, tokens, desenhos de cima,
   névoa, véu do mestre e, por fim, o que é só da interface (paredes do
   mestre, portas, seleção, régua, pings).
   --------------------------------------------------------------- */
const Render = (() => {
  const cv = $('#cv'), stage = $('#stage');
  const ctx = cv.getContext('2d');
  const live = document.createElement('canvas'), lctx = live.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let dpr = 1, cw = 0, ch = 0, need = true, raf = 0, last = 0, tNow = 0, broke = false;
  let theme = { table: '#0d1017', lamp: '#e6ab4f' };
  const stats = { ms: 0, frames: 0 };       // tempo médio de desenho, para acompanhar desempenho

  function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    theme = {
      table: cs.getPropertyValue('--table').trim() || '#0d1017',
      lamp: cs.getPropertyValue('--lamp').trim() || '#e6ab4f',
    };
    Vision.setVeilColor(cs.getPropertyValue('--veil').trim());      // o véu do mestre acompanha o tema
    request();
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cw = stage.clientWidth; ch = stage.clientHeight;
    const w = Math.max(1, Math.round(cw * dpr)), hh = Math.max(1, Math.round(ch * dpr));
    if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; live.width = w; live.height = hh; }
    request();
  }

  function request() { need = true; if (!raf) raf = requestAnimationFrame(frame); }

  const motion = () => App.anim && !reduce.matches;
  function animating() {
    if (App.pings.length || App.floats.length) return true;
    const sc = Store.scene();
    return !!sc && motion() && (sc.effects.length > 0 || !!(sc.weather && sc.weather.k));
  }
  function frame(ts) {
    raf = 0;
    const anim = animating();
    if (need || (anim && ts - last > 30)) {
      need = false; last = ts; tNow = ts / 1000;
      const t0 = performance.now();
      try { draw(ts); broke = false; }
      catch (err) {
        // Um erro no meio do desenho não pode deixar o mapa pela metade (sem a névoa, por exemplo):
        // zera o estado do canvas, cobre tudo e avisa uma vez só.
        cv.width = cv.width; live.width = live.width;
        ctx.fillStyle = theme.table; ctx.fillRect(0, 0, cv.width, cv.height);
        stats.fail = (stats.fail || 0) + 1;
        if (!broke) { broke = true; console.error(err); UI.toast('Não consegui desenhar o mapa. Recarregue a página; se continuar, me avise.'); }
      }
      stats.ms = stats.ms * 0.9 + (performance.now() - t0) * 0.1; stats.frames++;
    }
    if (anim || need) raf = requestAnimationFrame(frame);
  }

  function setWorld(c) {
    const v = App.view, k = dpr * v.z;
    c.setTransform(k, 0, 0, k, -v.x * k, -v.y * k);
  }

  /* ---- Câmera ---- */
  const toScreen = (x, y) => [(x - App.view.x) * App.view.z, (y - App.view.y) * App.view.z];
  function zoomAt(sx, sy, z) {
    const v = App.view;
    z = clamp(z, 0.1, 4);
    const wx = v.x + sx / v.z, wy = v.y + sy / v.z;
    v.z = z; v.x = wx - sx / z; v.y = wy - sy / z;
    request();
  }
  function fit() {
    const sc = Store.scene();
    if (!sc || cw < 10) return;
    const W = sceneW(sc), H = sceneH(sc), pad = sc.cell * 1.2;
    const z = clamp(Math.min(cw / (W + pad * 2), ch / (H + pad * 2)), 0.1, 4);
    App.view.z = z; App.view.x = W / 2 - cw / (2 * z); App.view.y = H / 2 - ch / (2 * z);
    request();
  }
  function centerOn(x, y) {
    App.view.x = x - cw / (2 * App.view.z); App.view.y = y - ch / (2 * App.view.z);
    request();
  }

  /* ---- Peças de desenho ---- */
  function rr(c, x, y, w, hh, r) {
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, hh, Math.min(r, w / 2, hh / 2));
    else c.rect(x, y, w, hh);
  }
  function tokPath(c, shape, cx, cy, r) {
    if (shape === 'quad') rr(c, cx - r, cy - r, r * 2, r * 2, r * 0.22);
    else { c.beginPath(); c.arc(cx, cy, r, 0, TAU); }
  }

  // Etiqueta de texto em tamanho fixo de tela.
  function label(c, text, x, y, px, opt) {
    const o = opt || {};
    const fs = (o.size || 12.5) * px;
    c.font = `600 ${fs}px ${FONT_UI}`;
    const w = c.measureText(text).width, padX = fs * 0.55, hh = fs * 1.6;
    const bx = o.align === 'left' ? x : x - w / 2 - padX;
    c.fillStyle = o.bg || 'rgba(14,17,25,0.88)';
    rr(c, bx, y - hh / 2, w + padX * 2, hh, hh * 0.35); c.fill();
    if (o.stroke) { c.strokeStyle = o.stroke; c.lineWidth = 1.2 * px; c.stroke(); }
    c.fillStyle = o.color || '#f2f4f8';
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(text, bx + padX, y + fs * 0.04);
  }

  function drawGrid(sc, px) {
    const g = sc.grid, cell = sc.cell, v = App.view;
    if (!g.on || cell * v.z < 5) return;
    const x0 = clamp(Math.floor(v.x / cell), 0, sc.cols), x1 = clamp(Math.ceil((v.x + cw / v.z) / cell), 0, sc.cols);
    const y0 = clamp(Math.floor(v.y / cell), 0, sc.rows), y1 = clamp(Math.ceil((v.y + ch / v.z) / cell), 0, sc.rows);
    ctx.beginPath();
    for (let i = x0; i <= x1; i++) { ctx.moveTo(i * cell, y0 * cell); ctx.lineTo(i * cell, y1 * cell); }
    for (let j = y0; j <= y1; j++) { ctx.moveTo(x0 * cell, j * cell); ctx.lineTo(x1 * cell, j * cell); }
    ctx.strokeStyle = hexA(g.color, g.alpha);
    ctx.lineWidth = Math.max(1, px);
    ctx.stroke();
  }

  function drawShape(c, s) {
    c.save();
    c.globalAlpha *= s.a == null ? 1 : s.a;
    c.lineWidth = s.sw || 0; c.lineJoin = c.lineCap = 'round';
    c.strokeStyle = s.s; if (s.f) c.fillStyle = s.f;
    switch (s.k) {
      case 'rect':
        if (s.f) c.fillRect(s.x, s.y, s.w, s.h);
        if (s.sw > 0) c.strokeRect(s.x, s.y, s.w, s.h);
        break;
      case 'ell':
        c.beginPath(); c.ellipse(s.x + s.w / 2, s.y + s.h / 2, Math.abs(s.w / 2), Math.abs(s.h / 2), 0, 0, TAU);
        if (s.f) c.fill();
        if (s.sw > 0) c.stroke();
        break;
      case 'poly': {
        const p = s.pts;
        c.beginPath(); c.moveTo(p[0], p[1]);
        for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
        c.closePath();
        if (s.f) c.fill();
        if (s.sw > 0) c.stroke();
        break;
      }
      case 'line': {
        const p = s.pts;
        c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[2], p[3]); c.stroke();
        if (s.arrow) {
          const a = Math.atan2(p[3] - p[1], p[2] - p[0]), L = Math.max(14, s.sw * 3.4);
          c.beginPath();
          c.moveTo(p[2] - Math.cos(a - 0.45) * L, p[3] - Math.sin(a - 0.45) * L);
          c.lineTo(p[2], p[3]);
          c.lineTo(p[2] - Math.cos(a + 0.45) * L, p[3] - Math.sin(a + 0.45) * L);
          c.stroke();
        }
        break;
      }
      case 'text': {
        const lines = String(s.txt || '').split('\n');
        c.font = `600 ${s.fs}px ${FONT_UI}`;
        c.textAlign = 'left'; c.textBaseline = 'top';
        c.lineWidth = s.fs * 0.16; c.strokeStyle = inkOn(s.s) === '#ffffff' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.6)';
        c.fillStyle = s.s;
        lines.forEach((l, i) => { const y = s.y + i * s.fs * 1.25 + s.fs * 0.12; c.strokeText(l, s.x, y); c.fillText(l, s.x, y); });
        break;
      }
      default: {
        const p = s.pts, n = p.length / 2;
        c.beginPath(); c.moveTo(p[0], p[1]);
        if (n < 3) { c.lineTo(p[n * 2 - 2] + 0.01, p[n * 2 - 1]); }
        else {
          for (let i = 1; i < n - 1; i++) {
            const mx = (p[i * 2] + p[i * 2 + 2]) / 2, my = (p[i * 2 + 1] + p[i * 2 + 3]) / 2;
            c.quadraticCurveTo(p[i * 2], p[i * 2 + 1], mx, my);
          }
          c.lineTo(p[n * 2 - 2], p[n * 2 - 1]);
        }
        c.stroke();
      }
    }
    c.restore();
  }

  function drawAura(c, t, a, sc, px) {
    const p = auraShape(t, a, sc);
    c.save();
    if (t.hidden) c.globalAlpha = 0.5;
    c.fillStyle = hexA(a.c, a.a); c.fill(p);
    c.strokeStyle = hexA(a.c, Math.min(1, a.a * 2 + 0.3)); c.lineWidth = 2 * px; c.stroke(p);
    c.restore();
  }

  function drawTokenBody(c, t, sc, px) {
    const s = t.size * sc.cell, cx = t.x + s / 2, cy = t.y + s / 2, r = s / 2 - s * 0.05;
    const dead = t.conds.includes('morto');
    c.save();
    if (t.hidden) c.globalAlpha = 0.5;
    c.fillStyle = 'rgba(0,0,0,0.38)';
    tokPath(c, t.shape, cx, cy + s * 0.04, r * 1.03); c.fill();
    c.save();
    tokPath(c, t.shape, cx, cy, r); c.clip();
    const im = Assets.img(t.img);
    const fill = dead ? '#565b68' : t.color;
    c.fillStyle = fill; c.fillRect(cx - r, cy - r, r * 2, r * 2);
    if (im) {
      const k = Math.max(2 * r / im.naturalWidth, 2 * r / im.naturalHeight);
      const w = im.naturalWidth * k, hh = im.naturalHeight * k;
      if (dead && 'filter' in c) c.filter = 'grayscale(1) brightness(0.8)';
      c.drawImage(im, cx - w / 2, cy - hh / 2, w, hh);
      if (dead && 'filter' in c) c.filter = 'none';
    } else {
      c.fillStyle = inkOn(fill);
      c.font = `700 ${s * 0.36}px ${FONT_UI}`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(initials(t.name), cx, cy + s * 0.02);
    }
    c.restore();
    const owner = t.owner && t.owner !== '*' ? playerById(t.owner) : null;
    const lw = Math.max(2 * px, s * 0.05);
    tokPath(c, t.shape, cx, cy, r);
    c.lineWidth = lw + 2 * px; c.strokeStyle = 'rgba(0,0,0,0.6)'; c.stroke();
    c.lineWidth = lw; c.strokeStyle = owner ? owner.color : (im ? '#e3ded2' : inkOn(fill) === '#ffffff' ? hexA('#ffffff', 0.85) : hexA('#15181f', 0.8)); c.stroke();
    if (dead) {
      c.strokeStyle = 'rgba(214,52,46,0.85)'; c.lineWidth = s * 0.09; c.lineCap = 'round';
      const k = r * 0.6;
      c.beginPath(); c.moveTo(cx - k, cy - k); c.lineTo(cx + k, cy + k); c.moveTo(cx + k, cy - k); c.lineTo(cx - k, cy + k); c.stroke();
    }
    c.restore();
  }

  function badge(c, x, y, d, color, iconName, px) {
    c.fillStyle = color; c.beginPath(); c.arc(x, y, d / 2, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(8,10,16,0.85)'; c.lineWidth = 1.2 * px; c.stroke();
    const def = ICONS[iconName];
    if (!def) return;
    const k = d * 0.62 / 24;
    c.save();
    c.translate(x - 12 * k, y - 12 * k); c.scale(k, k);
    if (def.fill) { c.fillStyle = '#ffffff'; c.fill(iconPath(iconName)); }
    else { c.strokeStyle = '#ffffff'; c.lineWidth = 2.6; c.lineCap = c.lineJoin = 'round'; c.stroke(iconPath(iconName)); }
    c.restore();
  }

  function drawTokenTop(c, t, sc, px) {
    const z = App.view.z, s = t.size * sc.cell, sp = s * z;
    if (sp < 16) return;
    const cx = t.x + s / 2;
    c.save();
    if (t.hidden) c.globalAlpha = 0.6;

    // Condições, numa fileira na base do token; as que têm contador vêm primeiro
    const info = t.cinfo || {};
    const conds = t.conds.filter(id => COND_BY_ID[id]).sort((p, q) => ((info[q] && info[q].n) ? 1 : 0) - ((info[p] && info[p].n) ? 1 : 0));
    if (conds.length) {
      const d = clamp(s * 0.3, 13 * px, 26 * px), step = d * 1.06;
      const max = Math.max(1, Math.floor((s + d * 0.5) / step));
      const show = conds.length > max ? conds.slice(0, Math.max(1, max - 1)) : conds;
      const extra = conds.length - show.length;
      const n = show.length + (extra ? 1 : 0);
      let x = cx - (n * step) / 2 + step / 2;
      const y = t.y + s - d * 0.4;
      for (const id of show) {
        const cd = COND_BY_ID[id], ci = info[id] || {};
        badge(c, x, y, d, cd.c, cd.i, px);
        if (ci.d > 0) {                       // duração: arco do que ainda falta
          c.beginPath(); c.arc(x, y, d / 2 + 1.6 * px, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(ci.d / (ci.d0 || ci.d), 0.08, 1));
          c.strokeStyle = '#ffffff'; c.lineWidth = 1.6 * px; c.lineCap = 'round'; c.stroke();
        }
        if (ci.n > 0) {                       // contador: número no canto do marcador
          const r = d * 0.32, nx = x + d * 0.36, ny = y - d * 0.36;
          c.beginPath(); c.arc(nx, ny, r, 0, TAU); c.fillStyle = '#10131b'; c.fill();
          c.strokeStyle = '#ffffff'; c.lineWidth = 1 * px; c.stroke();
          c.fillStyle = '#ffffff'; c.font = `700 ${r * (ci.n > 9 ? 1.05 : 1.4)}px ${FONT_UI}`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(ci.n > 99 ? '99+' : String(ci.n), nx, ny + r * 0.08);
        }
        x += step;
      }
      if (extra) {
        c.fillStyle = '#2c3140'; c.beginPath(); c.arc(x, y, d / 2, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(8,10,16,0.85)'; c.lineWidth = 1.2 * px; c.stroke();
        c.fillStyle = '#fff'; c.font = `700 ${d * 0.5}px ${FONT_UI}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('+' + extra, x, y + d * 0.03);
      }
    }

    // Barras e pontos, empilhados acima do token; afinam quando são muitos
    const rows = barsShown(t);
    if (rows.length) {
      const n = rows.length, gap = 1.5 * px, w = s * 0.94, x = cx - w / 2;
      let bh = clamp(s * 0.11, 5 * px, 13 * px);
      if (n > 3) bh = Math.max(3 * px, Math.min(bh, (s * 0.46) / n - gap));
      let y = t.y - 2 * px - n * (bh + gap);
      for (const { b, mode } of rows) {
        // Pontos: uma bolinha por ponto. Se não couberem com folga (token pequeno na tela), a barra comum assume.
        const m = Math.round(b.m), d = m >= 1 ? Math.min(bh, (w - (m - 1) * gap) / m) : 0;
        if (b.k === 'pts' && mode === 'num' && m >= 1 && m <= 12 && d >= 2 * px) {
          const x0 = cx - (m * d + (m - 1) * gap) / 2;
          for (let k = 0; k < m; k++) {
            const full = k < Math.round(b.v);
            c.beginPath(); c.arc(x0 + k * (d + gap) + d / 2, y + bh / 2, d / 2, 0, TAU);
            c.fillStyle = full ? b.c : 'rgba(10,12,18,0.82)'; c.fill();
            c.strokeStyle = full ? 'rgba(0,0,0,0.7)' : hexA(b.c, 0.95); c.lineWidth = 1 * px; c.stroke();
          }
        } else {
          c.fillStyle = 'rgba(10,12,18,0.82)'; rr(c, x, y, w, bh, bh * 0.3); c.fill();
          const f = clamp(b.v / b.m, 0, 1);
          if (f > 0) { c.fillStyle = b.c; rr(c, x, y, w * f, bh, bh * 0.3); c.fill(); }
          c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 1 * px; rr(c, x, y, w, bh, bh * 0.3); c.stroke();
          if (mode === 'num' && bh * z >= 9) {
            c.font = `700 ${bh * 0.84}px ${FONT_UI}`; c.textAlign = 'center'; c.textBaseline = 'middle';
            c.lineWidth = bh * 0.22; c.strokeStyle = 'rgba(0,0,0,0.75)'; c.lineJoin = 'round';
            const tx = `${fmt(b.v)}/${fmt(b.m)}`;
            c.strokeText(tx, cx, y + bh * 0.54); c.fillStyle = '#fff'; c.fillText(tx, cx, y + bh * 0.54);
          }
        }
        y += bh + gap;
      }
    }

    // Nome
    if (sp >= 26) {
      const name = tokName(t);
      if (name) {
        const fs = clamp(s * 0.2, 11 * px, 15 * px);
        c.font = `600 ${fs}px ${FONT_UI}`;
        const w = c.measureText(name).width, padX = fs * 0.5, hh = fs * 1.5, y = t.y + s + fs * 0.3;
        c.fillStyle = 'rgba(12,14,20,0.74)'; rr(c, cx - w / 2 - padX, y, w + padX * 2, hh, hh * 0.35); c.fill();
        c.fillStyle = '#f4f5f8'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(name, cx, y + hh * 0.54);
      }
    }
    if (t.hidden && isGM()) badge(c, t.x + s * 0.14, t.y + s * 0.14, clamp(s * 0.3, 14 * px, 24 * px), '#3a4154', 'eyeOff', px);
    c.restore();
  }

  // Ícone clicável de uma abertura, no ponto que doorSpots escolheu. O desenho diz sempre o tipo (porta, janela,
  // cortina) e o estado: aberta em verde, com o desenho aberto; fechada, em claro. Trancada (só o mestre vê): um
  // cadeado pequeno no canto, e o aro vermelho enquanto está fechada. Assim janela e cortina trancadas, uma em
  // cima da outra, continuam se distinguindo, e dá para ver se a trancada está aberta.
  const OPENING_ICONS = { door: ['door', 'doorOpen'], window: ['window', 'windowOpen'], veil: ['veil', 'veilOpen'] };
  function drawOpening(c, s, px, gm) {
    const w = s.w, r = 11 * px, lock = gm && w.locked, open = !!w.open && !w.secret;
    const col = w.secret ? '#e39bff' : open ? '#8fe0a8' : lock ? '#ff8c7e' : '#e9edf5';
    c.save();
    c.fillStyle = open ? 'rgba(17,38,29,0.95)' : 'rgba(18,21,30,0.94)'; c.beginPath(); c.arc(s.x, s.y, r, 0, TAU); c.fill();
    c.strokeStyle = col; c.lineWidth = 1.5 * px; c.stroke();
    const k = 13 * px / 24;
    c.translate(s.x - 12 * k, s.y - 12 * k); c.scale(k, k);
    c.lineWidth = 2; c.lineCap = c.lineJoin = 'round';
    c.stroke(iconPath((OPENING_ICONS[w.k] || OPENING_ICONS.door)[open ? 1 : 0]));
    c.restore();
    if (lock) badge(c, s.x + r * 0.8, s.y - r * 0.8, 12 * px, '#c2473d', 'lock', px);
  }

  /* O que muda de um instante para o outro (e some na névoa para os jogadores) é
     desenhado em dois níveis: os efeitos sem brilho ficam embaixo da escuridão;
     auras, efeitos luminosos e tokens ficam por cima dela, sempre legíveis. */
  function drawFx(c, sc, px, t, glow) {
    const gm = isGM();
    for (const e of sc.effects) {
      if (!fxVisible(e) || !!(FX.P[e.fx] || FX.P.fogo).glow !== glow) continue;
      const g = FX.geom(e, sc);
      FX.draw(c, e, g, t, px);
      if (e.gm) badge(c, g.cx, g.cy, 18 * px, '#3a4154', 'eyeOff', px);
    }
  }
  function drawUpper(c, sc, px, t) {
    const gm = isGM();
    for (const tk of sc.tokens) {
      if (!gm && tk.hidden) continue;
      for (const a of tk.auras) { if (!a.pub && !gm && !ownsTok(tk)) continue; drawAura(c, tk, a, sc, px); }
    }
    drawFx(c, sc, px, t, true);
    for (const tk of sc.tokens) if (gm || !tk.hidden) drawTokenBody(c, tk, sc, px);
    for (const tk of sc.tokens) if (gm || !tk.hidden) drawTokenTop(c, tk, sc, px);
  }

  function drawWalls(sc, px) {
    const active = App.tool === 'wall', pieces = Walls.of(sc).pieces;
    ctx.save();
    ctx.lineCap = 'round';
    for (const w of sc.walls) {
      const sel = selHas('walls', w.id), door = w.k === 'door';
      ctx.globalAlpha = active || sel ? 1 : 0.5;
      // parede: âmbar; porta: azul (tracejada se aberta); secreta: lilás; janela: ciano pontilhado; cortina: roxo tracejado curto.
      // Janela e cortina abertas ficam com o mesmo traço, mais espaçado.
      const open = wallOpen(w);
      ctx.setLineDash(door ? (open ? [6 * px, 6 * px] : []) : w.k === 'window' ? [2 * px, (open ? 11 : 5) * px] : w.k === 'veil' ? (open ? [9 * px, 11 * px] : [9 * px, 4 * px, 2 * px, 4 * px]) : []);
      // Parede comum: só os trechos que sobraram dela (onde há uma abertura por cima, o traço é o da abertura).
      const pcs = pieces.get(w.id);
      ctx.beginPath();
      if (pcs) for (const q of pcs) { ctx.moveTo(q[0], q[1]); ctx.lineTo(q[2], q[3]); }
      else { ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); }
      ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 5.5 * px; ctx.stroke();
      ctx.strokeStyle = sel ? '#ffffff' : door ? (w.secret ? '#e39bff' : w.locked ? '#ff8c7e' : '#7fd1ff') : w.k === 'window' ? '#8fe9ff' : w.k === 'veil' ? '#b79bff' : '#f0c26a';
      ctx.lineWidth = 2.6 * px; ctx.stroke();
      if (active || sel) {
        ctx.setLineDash([]);
        ctx.fillStyle = sel ? '#ffffff' : '#f0c26a';
        for (const [x, y] of [[w.x1, w.y1], [w.x2, w.y2]]) { ctx.beginPath(); ctx.arc(x, y, (sel ? 5 : 3.2) * px, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1 * px; ctx.stroke(); }
      }
    }
    ctx.restore();
  }

  function drawLights(sc, px) {
    for (const l of sc.lights) {
      const sel = selHas('lights', l.id);
      if (sel || App.tool === 'light') {
        ctx.save();
        ctx.strokeStyle = hexA(l.c, 0.9); ctx.lineWidth = 1.4 * px;
        ctx.setLineDash([7 * px, 6 * px]); ctx.beginPath(); ctx.arc(l.x, l.y, l.dim * sc.cell, 0, TAU); ctx.stroke();
        ctx.setLineDash([2 * px, 5 * px]); ctx.beginPath(); ctx.arc(l.x, l.y, l.bright * sc.cell, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      const r = 11 * px;
      ctx.fillStyle = l.on ? l.c : '#566074';
      ctx.beginPath(); ctx.arc(l.x, l.y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = sel ? '#ffffff' : 'rgba(10,12,18,0.85)'; ctx.lineWidth = (sel ? 2.2 : 1.4) * px; ctx.stroke();
      const k = 14 * px / 24;
      ctx.translate(l.x - 12 * k, l.y - 12 * k); ctx.scale(k, k);
      ctx.strokeStyle = '#1b1608'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.stroke(iconPath('light'));
      ctx.restore();
    }
  }

  function drawSelection(sc, px) {
    ctx.save();
    for (const s of App.sel) {
      const o = Store.get(s.c, s.id);
      if (!o) continue;
      ctx.setLineDash([]);
      if (s.c === 'tokens') {
        const [cx, cy, half] = tokC(o, sc);
        tokPath(ctx, o.shape, cx, cy, half + 1.5 * px);
        ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 4.5 * px; ctx.stroke();
        ctx.strokeStyle = theme.lamp; ctx.lineWidth = 2.2 * px; ctx.stroke();
      } else if (s.c === 'shapes') {
        const b = shapeBBox(o), m = (o.sw || 0) / 2 + 4 * px;
        ctx.setLineDash([6 * px, 4 * px]);
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3 * px; ctx.strokeRect(b.x - m, b.y - m, b.w + m * 2, b.h + m * 2);
        ctx.strokeStyle = theme.lamp; ctx.lineWidth = 1.5 * px; ctx.strokeRect(b.x - m, b.y - m, b.w + m * 2, b.h + m * 2);
      } else if (s.c === 'effects') {
        const g = FX.geom(o, sc);
        ctx.setLineDash([7 * px, 5 * px]);
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3.5 * px; ctx.stroke(g.path);
        ctx.strokeStyle = theme.lamp; ctx.lineWidth = 1.8 * px; ctx.stroke(g.path);
      }
    }
    ctx.setLineDash([]);
    for (const hd of Tools.handles()) {
      ctx.beginPath();
      if (hd.round) ctx.arc(hd.x, hd.y, 5.5 * px, 0, TAU); else ctx.rect(hd.x - 4.5 * px, hd.y - 4.5 * px, 9 * px, 9 * px);
      ctx.fillStyle = hd.round ? theme.lamp : '#ffffff'; ctx.fill();
      ctx.strokeStyle = 'rgba(8,10,16,0.9)'; ctx.lineWidth = 1.4 * px; ctx.stroke();
    }
    ctx.restore();
  }

  function drawTurnRing(sc, px) {
    const tn = sc.turn;
    if (!tn.on || !tn.cur) return;
    if (!isGM() && !can('turns')) return;
    const e = tn.list.find(x => x.id === tn.cur);
    const t = e && e.token ? Store.get('tokens', e.token) : null;
    if (!t || !tokShown(t, sc)) return;
    const [cx, cy, half] = tokC(t, sc);
    ctx.save();
    tokPath(ctx, t.shape, cx, cy, half + 6 * px);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 5 * px; ctx.stroke();
    ctx.strokeStyle = theme.lamp; ctx.lineWidth = 2.5 * px; ctx.setLineDash([10 * px, 6 * px]); ctx.stroke();
    ctx.restore();
  }

  // Linha de medição com a distância total na ponta.
  function drawMeasure(pts, sc, px, color, extra) {
    if (!pts || pts.length < 4) return;
    ctx.save();
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 5 * px; ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = 2.4 * px; ctx.setLineDash([9 * px, 6 * px]); ctx.stroke();
    ctx.setLineDash([]);
    let total = 0;
    for (let i = 0; i < pts.length; i += 2) {
      if (i) total += gridDist(sc, pts[i - 2], pts[i - 1], pts[i], pts[i + 1]);
      ctx.beginPath(); ctx.arc(pts[i], pts[i + 1], 4 * px, 0, TAU);
      ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1.2 * px; ctx.stroke();
    }
    const n = pts.length;
    label(ctx, distLabel(sc, total) + (extra || ''), pts[n - 2], pts[n - 1] - 22 * px, px, { stroke: color });
    ctx.restore();
  }

  function drawPings(sc, px, now) {
    if (!App.pings.length) return;
    App.pings = App.pings.filter(p => now - p.t0 < 3200);
    const still = reduce.matches;
    ctx.save();
    for (const p of App.pings) {
      const age = (now - p.t0) / 1000;
      const out = age > 2.6 ? Math.max(0, (3.2 - age) / 0.6) : 1;
      for (let k = 0; k < 3; k++) {
        const f = still ? 0.3 + k * 0.3 : ((age * 0.8 - k * 0.3) % 1.1) / 1.1;
        if (f < 0) continue;
        const r = sc.cell * (0.2 + f * 1.25);
        ctx.globalAlpha = (1 - f) * out;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 5 * px; ctx.stroke();
        ctx.strokeStyle = p.c; ctx.lineWidth = 2.6 * px; ctx.stroke();
      }
      ctx.globalAlpha = out;
      ctx.beginPath(); ctx.arc(p.x, p.y, 5 * px, 0, TAU); ctx.fillStyle = p.c; ctx.fill();
      label(ctx, p.n, p.x, p.y - sc.cell * 0.2 - 20 * px, px, { stroke: p.c });
    }
    ctx.restore();
  }

  // Miras: um retículo em volta do alvo, na cor de quem mira.
  function drawTargets(sc, px) {
    if (!sc.targets.length) return;
    const count = new Map();
    ctx.save();
    ctx.lineCap = 'round';
    for (const tg of sc.targets) {
      const t = Store.get('tokens', tg.t);
      if (!t || !tokShown(t, sc)) continue;
      const k = count.get(t.id) || 0;
      count.set(t.id, k + 1);
      const col = tg.by === 'gm' ? theme.lamp : (playerById(tg.by) || {}).color || '#ffffff';
      const [cx, cy, half] = tokC(t, sc), r = half + (8 + k * 6) * px;
      for (const top of [false, true]) {
        ctx.strokeStyle = top ? col : 'rgba(0,0,0,0.7)'; ctx.lineWidth = (top ? 2.4 : 4.8) * px;
        ctx.beginPath();
        for (let q = 0; q < 4; q++) {
          const a = q * Math.PI / 2;
          ctx.moveTo(cx + Math.cos(a - 0.5) * r, cy + Math.sin(a - 0.5) * r); ctx.arc(cx, cy, r, a - 0.5, a + 0.5);
          ctx.moveTo(cx + Math.cos(a) * (r - 6 * px), cy + Math.sin(a) * (r - 6 * px)); ctx.lineTo(cx + Math.cos(a) * (r + 6 * px), cy + Math.sin(a) * (r + 6 * px));
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Números de dano e cura subindo do token.
  function drawFloats(sc, px, now) {
    if (!App.floats.length) return;
    App.floats = App.floats.filter(f => now - f.t0 < 1500);
    const seen = new Map();
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const f of App.floats) {
      const t = Store.get('tokens', f.id);
      if (!t || !tokShown(t, sc)) continue;
      const k = seen.get(f.id) || 0;
      seen.set(f.id, k + 1);
      const age = clamp((now - f.t0) / 1500, 0, 1), [cx, cy, half] = tokC(t, sc);
      const fs = clamp(sc.cell * 0.36, 16 * px, 28 * px);
      const y = cy - half * 0.15 - (reduce.matches ? 0 : age * sc.cell * 0.6) - k * fs * 1.05;
      ctx.globalAlpha = age < 0.7 ? 1 : (1 - age) / 0.3;
      ctx.font = `700 ${fs}px ${FONT_UI}`;
      ctx.lineWidth = fs * 0.24; ctx.strokeStyle = 'rgba(8,10,16,0.92)'; ctx.strokeText(f.text, cx, y);
      ctx.fillStyle = f.c; ctx.fillText(f.text, cx, y);
    }
    ctx.restore();
  }

  // Quantas rodadas ainda restam em cada efeito com duração.
  function drawDurations(sc, px) {
    const gm = isGM();
    for (const e of sc.effects) {
      if (!(e.dur > 0) || !fxVisible(e)) continue;
      const g = FX.geom(e, sc);
      // cone e linha: no meio da área; círculo e quadrado: por dentro, perto do topo; retângulo: por dentro,
      // junto do lado que fica mais alto na tela (vale também quando ele está girado)
      const mid = e.k === 'cone' || e.k === 'line';
      const lx = g.lab ? g.lab.x + g.lab.nx * 11 * px : mid ? g.cx : g.x;
      const ly = g.lab ? g.lab.y + g.lab.ny * 11 * px : mid ? g.cy : g.y - g.R + 11 * px;
      if (!gm && !Vision.canSee(lx, ly)) continue;
      label(ctx, e.dur === 1 ? '1 rodada' : e.dur + ' rodadas', lx, ly, px, { size: 10.5 });
    }
  }

  /* Clima sobre o mapa. As partículas não guardam estado: a posição de cada uma sai do
     tempo e de um sorteio fixo por ladrilho, então só se calculam as que estão na tela. */
  function drawWeather(sc, px, t) {
    const wz = sc.weather;
    if (!wz || !wz.k) return;
    const W = sceneW(sc), H = sceneH(sc), cell = sc.cell, T = cell * 10, v = App.view, h = FX.hsh;
    const pow = clamp(wz.pow || 0.6, 0.2, 1) * clamp(v.z * 1.6, 0.35, 1);
    const tx0 = Math.max(0, Math.floor(v.x / T)), tx1 = Math.min(Math.ceil(W / T) - 1, Math.floor((v.x + cw / v.z) / T));
    const ty0 = Math.max(0, Math.floor(v.y / T)), ty1 = Math.min(Math.ceil(H / T) - 1, Math.floor((v.y + ch / v.z) / T));
    const wrap = a => ((a % T) + T) % T;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    const each = (n, fn) => { for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { const seed = tx * 37 + ty * 91 + 5; for (let i = 0; i < n; i++) fn(tx * T, ty * T, i, seed); } };
    if (wz.k === 'chuva') {
      const len = cell * 0.55;
      ctx.beginPath();
      each(Math.round(34 * pow), (ox, oy, i, s) => {
        const x = ox + wrap(h(i, 1, s) * T - t * T * 0.35), y = oy + wrap(h(i, 2, s) * T + t * T * (1.5 + h(i, 3, s) * 0.5));
        ctx.moveTo(x, y); ctx.lineTo(x - len * 0.22, y + len);
      });
      ctx.strokeStyle = 'rgba(196,220,255,0.5)'; ctx.lineWidth = Math.max(1.1 * px, cell * 0.018); ctx.lineCap = 'round'; ctx.stroke();
    } else if (wz.k === 'neve') {
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.beginPath();
      each(Math.round(26 * pow), (ox, oy, i, s) => {
        const x = ox + wrap(h(i, 1, s) * T + Math.sin(t * 0.7 + i) * cell * 0.5 + t * cell * 0.3), y = oy + wrap(h(i, 2, s) * T + t * T * (0.09 + h(i, 3, s) * 0.06));
        const r = cell * (0.035 + h(i, 4, s) * 0.04);
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
      });
      ctx.fill();
    } else if (wz.k === 'neblina') {
      each(Math.max(2, Math.round(4 * pow)), (ox, oy, i, s) => {
        const x = ox + wrap(h(i, 1, s) * T + t * cell * (0.25 + h(i, 3, s) * 0.2)), y = oy + h(i, 2, s) * T + Math.sin(t * 0.2 + i * 2) * cell;
        FX.blob(ctx, x, y, cell * (3.2 + h(i, 4, s) * 2.5), '#e8eef2', 0.13 + 0.05 * Math.sin(t * 0.4 + i));
        FX.blob(ctx, x - T, y, cell * (3.2 + h(i, 4, s) * 2.5), '#e8eef2', 0.13 + 0.05 * Math.sin(t * 0.4 + i));
      });
    } else if (wz.k === 'cinzas') {
      ctx.fillStyle = 'rgba(40,40,46,0.75)';
      ctx.beginPath();
      each(Math.round(16 * pow), (ox, oy, i, s) => {
        const x = ox + wrap(h(i, 1, s) * T + Math.sin(t * 0.5 + i) * cell * 0.7), y = oy + wrap(h(i, 2, s) * T + t * T * (0.05 + h(i, 3, s) * 0.04));
        const r = cell * (0.03 + h(i, 4, s) * 0.035);
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
      });
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      each(Math.round(6 * pow), (ox, oy, i, s) => {
        const x = ox + wrap(h(i, 5, s) * T + Math.sin(t * 0.9 + i * 3) * cell * 0.6), y = oy + wrap(h(i, 6, s) * T - t * T * (0.06 + h(i, 7, s) * 0.05));
        FX.blob(ctx, x, y, cell * 0.11, '#ff8a3c', 0.5 + 0.4 * Math.sin(t * 3 + i));
      });
    } else if (wz.k === 'vagalumes') {
      ctx.globalCompositeOperation = 'lighter';
      each(Math.max(2, Math.round(7 * pow)), (ox, oy, i, s) => {
        const x = ox + h(i, 1, s) * T + Math.sin(t * (0.3 + h(i, 3, s) * 0.3) + i) * cell * 1.2, y = oy + h(i, 2, s) * T + Math.cos(t * (0.25 + h(i, 4, s) * 0.3) + i * 2) * cell * 1.2;
        const tw = Math.sin(t * (0.8 + h(i, 5, s)) + i * 1.7);
        FX.blob(ctx, x, y, cell * 0.2, '#dcff7a', tw > 0 ? tw * 0.85 : 0);
      });
    }
    ctx.restore();
  }

  /* ---- Quadro completo ---- */
  function draw(ts) {
    const sc = Store.scene();
    if (!sc || cw < 2) return;
    const z = App.view.z, px = 1 / z, W = sceneW(sc), H = sceneH(sc), gm = isGM();
    if (Vision.isDirty()) Vision.update(sc, App.viewer);
    const vo = Vision.out;
    const t = motion() ? tNow : 1.7;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = theme.table; ctx.fillRect(0, 0, cv.width, cv.height);
    setWorld(ctx);

    // Fundo e grade (recortados no retângulo da cena)
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 24 * dpr; ctx.shadowOffsetY = 6 * dpr;
    ctx.fillStyle = sc.bgColor; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    const bg = Assets.img(sc.bg.asset);
    if (bg) {
      if (sc.bg.stretch) ctx.drawImage(bg, 0, 0, W, H);
      else { const w = W * (sc.bg.scale || 1); ctx.drawImage(bg, sc.bg.dx || 0, sc.bg.dy || 0, w, w * bg.naturalHeight / bg.naturalWidth); }
    }
    drawGrid(sc, px);
    ctx.restore();

    for (const s of sc.shapes) if (!s.top && shapeShown(s)) { ctx.globalAlpha = s.gm ? 0.7 : 1; drawShape(ctx, s); }
    ctx.globalAlpha = 1;

    // Para os jogadores com névoa, cada nível vivo só aparece dentro do que eles enxergam.
    const masked = !gm && !!vo.vis;
    const layer = fn => {
      if (!masked) { fn(ctx); return; }
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.globalCompositeOperation = 'source-over'; lctx.globalAlpha = 1;
      lctx.clearRect(0, 0, live.width, live.height);
      setWorld(lctx);
      fn(lctx);
      lctx.globalCompositeOperation = 'destination-in'; lctx.globalAlpha = 1;
      lctx.drawImage(vo.vis, 0, 0, vo.w, vo.h);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(live, 0, 0);
      setWorld(ctx);
    };
    if (sc.effects.some(e => !(FX.P[e.fx] || FX.P.fogo).glow)) layer(c => drawFx(c, sc, px, t, false));

    // Tom da hora do dia: colore o mapa, não os tokens
    const tone = TONES.find(x => x.id === sc.tone);
    if (tone && tone.tint) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = tone.tint; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Luz e escuridão sobre o mapa
    if (vo.dark) {
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(vo.glow, 0, 0, vo.w, vo.h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(vo.dark, 0, 0, vo.w, vo.h);
    }

    // A neblina fica por baixo dos tokens, para eles continuarem legíveis; chuva, neve e afins caem por cima de tudo.
    const mist = sc.weather && sc.weather.k === 'neblina';
    if (mist) drawWeather(sc, px, t);

    layer(c => drawUpper(c, sc, px, t));

    for (const s of sc.shapes) if (s.top && shapeShown(s)) { ctx.globalAlpha = s.gm ? 0.7 : 1; drawShape(ctx, s); }
    ctx.globalAlpha = 1;

    if (!mist) drawWeather(sc, px, t);

    // Névoa
    if (vo.fog) ctx.drawImage(vo.fog, 0, 0, vo.w, vo.h);

    // Véu do mestre: por cima do mapa, dos desenhos, dos efeitos e dos tokens; por baixo de tudo o que é da interface.
    if (gm && vo.veil) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); ctx.drawImage(vo.veil, 0, 0, vo.w, vo.h); ctx.restore(); }

    // Interface sobre o mapa
    if (gm) { drawWalls(sc, px); drawLights(sc, px); }
    for (const s of doorSpots(sc)) drawOpening(ctx, s, px, gm);
    drawDurations(sc, px);
    drawTurnRing(sc, px);
    drawTargets(sc, px);
    drawSelection(sc, px);
    Tools.drawPreview(ctx, px, sc);
    drawFloats(sc, px, ts);
    drawPings(sc, px, ts);
    UI.frame();
  }

  return { request, resize, readTheme, fit, zoomAt, centerOn, toScreen, drawShape, drawMeasure, label, rr, size: () => [cw, ch], cv, stats };
})();
