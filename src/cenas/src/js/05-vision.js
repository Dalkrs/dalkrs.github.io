/* ---------------------------------------------------------------
   5. VISION — paredes, luz, escuridão e névoa
   Trabalha com máscaras (canvases fora da tela, em resolução reduzida):
     reveal/hide . névoa manual pintada pelo mestre
     lit/glow .... onde a luz alcança (e a cor dela)
     vis ......... o que quem está olhando enxerga agora
     explored .... o que cada jogador (ou o grupo) já explorou
     dark/fog .... as camadas finais desenhadas por cima do mapa
     veil ........ só para o mestre: escurece o que nenhum jogador vê agora
   --------------------------------------------------------------- */
const Vision = (() => {
  const FOG = 'rgb(6,8,14)';
  const mk = (w, hh, opt) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; c.g = c.getContext('2d', opt); return c; };
  const clear = c => { c.g.setTransform(1, 0, 0, 1, 0, 0); c.g.globalCompositeOperation = 'source-over'; c.g.globalAlpha = 1; c.g.clearRect(0, 0, c.width, c.height); };

  let sid = null, M = 1, mw = 0, mh = 0;
  let cReveal, cHide, cLit, cGlow, cLitS, cGlowS, cVis, cSample, cTmp, cTmp2, cDark, cFog;
  let cVeil = null, veilColor = 'rgba(6,9,20,0.52)';      // o véu só ganha canvas quando o mestre liga; a cor vem do tema
  const expl = new Map();
  let dirty = true, manualStale = true, staticStale = true;
  const stats = { ms: 0 };                // tempo do último recálculo, para acompanhar desempenho
  let viewerSrc = [];
  // veil: a camada do véu do mestre (ou null); veilOf: de quem é a visão que ele mostra ('*' = todos os jogadores, ou o id de um token)
  const out = { dark: null, glow: null, fog: null, vis: null, w: 0, h: 0, noSource: false, veil: null, veilOf: null };

  function ensure(sc) {
    const W = sc.cols * sc.cell, H = sc.rows * sc.cell;
    const m = Math.min(1, 1536 / Math.max(W, H));
    const w = Math.max(2, Math.ceil(W * m)), hh = Math.max(2, Math.ceil(H * m));
    if (sid === sc.id && w === mw && hh === mh && m === M) return;
    const same = sid === sc.id, oldM = M;
    if (!same && sid) flushExplored();
    sid = sc.id; M = m; mw = w; mh = hh;
    cReveal = mk(w, hh); cHide = mk(w, hh); cLit = mk(w, hh); cGlow = mk(w, hh); cLitS = mk(w, hh); cGlowS = mk(w, hh);
    cVis = mk(w, hh);
    // Cópia pequena da máscara de visão, só para consultar pontos (canSee) sem custo.
    cSample = mk(Math.max(2, Math.ceil(w / 2)), Math.max(2, Math.ceil(hh / 2)), { willReadFrequently: true });
    cTmp = mk(w, hh); cTmp2 = mk(w, hh); cDark = mk(w, hh); cFog = mk(w, hh);
    cVeil = null;
    manualStale = true; staticStale = true; dirty = true;
    if (same) {
      for (const [k, c] of expl) {
        const n = mk(w, hh);
        n.g.drawImage(c, 0, 0, c.width * m / oldM, c.height * m / oldM);
        n.touched = true; expl.set(k, n);
      }
    } else {
      expl.clear();
      for (const k in sc.explored || {}) {
        const c = mk(w, hh); expl.set(k, c);
        const im = new Image();
        im.onload = () => { if (expl.get(k) === c) { c.g.drawImage(im, 0, 0, c.width, c.height); dirty = true; Render.request(); } };
        im.src = sc.explored[k];
      }
    }
  }

  function flushExplored() {
    const sc = Store.S.scenes[sid];
    if (!sc) return;
    let any = false;
    for (const [k, c] of expl) {
      if (!c.touched) continue;
      c.touched = false;
      let url = '';
      try { url = c.toDataURL('image/webp', 0.7); if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/png'); } catch (e) { url = ''; }
      if (url) { sc.explored[k] = url; any = true; }
    }
    if (any) Persist.scene(sc.id);
  }
  const saveExplored = debounce(flushExplored, 1500);

  function polyPath(g, poly) {
    g.beginPath();
    g.moveTo(poly[0], poly[1]);
    for (let i = 2; i < poly.length; i += 2) g.lineTo(poly[i], poly[i + 1]);
    g.closePath();
  }

  /* ---- Névoa manual: cada pincelada é uma operação guardada na cena ---- */
  function drawOp(c, op, comp) {
    const g = c.g;
    g.save();
    g.setTransform(M, 0, 0, M, 0, 0);
    g.globalCompositeOperation = comp;
    g.fillStyle = g.strokeStyle = FOG;
    if (op.k === 'all') g.fillRect(-10, -10, mw / M + 20, mh / M + 20);
    else if (op.k === 'rect') g.fillRect(op.x, op.y, op.w, op.h);
    else if (op.pts && op.pts.length >= 2) {
      g.lineCap = g.lineJoin = 'round'; g.lineWidth = op.s;
      g.beginPath(); g.arc(op.pts[0], op.pts[1], op.s / 2, 0, TAU); g.fill();
      if (op.pts.length > 2) {
        g.beginPath(); g.moveTo(op.pts[0], op.pts[1]);
        for (let i = 2; i < op.pts.length; i += 2) g.lineTo(op.pts[i], op.pts[i + 1]);
        g.stroke();
      }
    }
    g.restore();
  }
  function paintOp(op) {
    const a = op.m === 'r' ? cReveal : cHide, b = op.m === 'r' ? cHide : cReveal;
    drawOp(a, op, 'source-over');
    drawOp(b, op, 'destination-out');
  }
  function rebuildManual(sc) {
    clear(cReveal); clear(cHide);
    for (const op of sc.fogOps) paintOp(op);
  }

  // O que barra a luz: as paredes efetivas (uma abertura sobre uma parede tira aquele trecho dela), com as
  // cortinas fechadas. Para a VISÃO de um token vale Walls.sightFor, que deixa passar pela cortina de quem
  // está encostado nela.
  const segsOf = sc => Walls.of(sc).sightAll;

  function fixedLights(sc) {
    const L = [], cell = sc.cell;
    for (const l of sc.lights) if (l.on && l.dim > 0) L.push({ x: l.x, y: l.y, bright: l.bright * cell, dim: l.dim * cell, c: l.c });
    return L;
  }
  function tokenLights(sc) {
    const L = [], cell = sc.cell;
    for (const t of sc.tokens) {
      if (!t.light || !t.light.on || t.hidden || !(t.light.dim > 0)) continue;
      const half = t.size * cell / 2;
      L.push({ x: t.x + half, y: t.y + half, bright: t.light.bright * cell + half, dim: t.light.dim * cell + half, c: t.light.c });
    }
    return L;
  }
  // Pinta uma luz (bloqueada pelas paredes) na máscara de alcance e na de cor.
  function paintLight(L, segs, lit, glow) {
    const poly = Geo.visPoly(L.x + 0.31, L.y + 0.17, segs, L.x - L.dim, L.y - L.dim, L.x + L.dim, L.y + L.dim);
    const mid = clamp(L.bright / L.dim, 0.05, 0.95);
    for (const c of [lit, glow]) {
      const g = c.g;
      g.save();
      g.setTransform(M, 0, 0, M, 0, 0);
      polyPath(g, poly); g.clip();
      const gr = g.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.dim);
      if (c === glow) { gr.addColorStop(0, hexA(L.c, 0.36)); gr.addColorStop(mid, hexA(L.c, 0.2)); gr.addColorStop(1, hexA(L.c, 0)); }
      else { gr.addColorStop(0, 'rgba(6,8,14,1)'); gr.addColorStop(mid, 'rgba(6,8,14,0.9)'); gr.addColorStop(1, 'rgba(6,8,14,0)'); }
      g.fillStyle = gr;
      g.fillRect(L.x - L.dim, L.y - L.dim, L.dim * 2, L.dim * 2);
      g.restore();
    }
  }

  const ownedBy = (t, key) => !!t.owner && (key === '*' || t.owner === key || t.owner === '*');

  // Desenha em `target` tudo o que enxergam os tokens escolhidos por `who` (uma função token → sim/não).
  function computeVis(sc, who, target, B, mode, isViewer) {
    const g = target.g, cell = sc.cell;
    clear(target);
    let n = 0;
    for (const t of sc.tokens) {
      if (!t.vis || !t.vis.on || !who(t)) continue;
      n++;
      const half = t.size * cell / 2, cx = t.x + half, cy = t.y + half;
      const range = t.vis.range > 0 ? t.vis.range * cell + half : 0;
      const bx = range ? [cx - range, cy - range, cx + range, cy + range] : B;
      const poly = Geo.visPoly(cx + 0.31, cy + 0.17, Walls.sightFor(sc, t), bx[0], bx[1], bx[2], bx[3]);
      const self = half + cell * 0.6;
      const dr = t.vis.dark > 0 ? t.vis.dark * cell + half : 0;
      // Desenha direto no alvo, recortado pela linha de visão (e pelo alcance, se houver).
      g.save();
      g.setTransform(M, 0, 0, M, 0, 0);
      polyPath(g, poly); g.clip();
      if (range) { g.beginPath(); g.arc(cx, cy, range, 0, TAU); g.clip(); }
      g.fillStyle = FOG;
      if (mode === 'escuro') {
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(cLit, 0, 0); g.restore();
        g.beginPath(); g.arc(cx, cy, Math.max(dr, self), 0, TAU); g.fill();
      } else {
        g.fillRect(bx[0] - 2, bx[1] - 2, bx[2] - bx[0] + 4, bx[3] - bx[1] + 4);
      }
      g.restore();
      if (isViewer) viewerSrc.push({ poly, cx, cy, dr });
    }
    if (sc.fog.manual) {
      g.drawImage(cReveal, 0, 0);
      g.globalCompositeOperation = 'destination-out';
      g.drawImage(cHide, 0, 0);
      g.globalCompositeOperation = 'source-over';
    }
    return n;
  }

  // Se o cálculo falhar no meio, as máscaras podem ter ficado pela metade: a visão continua marcada como
  // pendente, para o quadro seguinte tentar de novo (e a rede de segurança do desenho cobrir o mapa enquanto isso).
  function update(sc, viewer) {
    try { return compute(sc, viewer); }
    catch (err) { dirty = true; throw err; }
  }

  function compute(sc, viewer) {
    const t0 = performance.now();
    ensure(sc);
    if (manualStale) { rebuildManual(sc); manualStale = false; }
    dirty = false;
    const cell = sc.cell, W = sc.cols * cell, H = sc.rows * cell;
    const gm = viewer === 'gm';
    const mode = sc.light, fog = sc.fog;
    const fogOn = fog.dynamic || fog.manual;
    const lit = mode !== 'claro';
    const segs = segsOf(sc);
    const B = [-cell, -cell, W + cell, H + cell];
    out.w = mw / M; out.h = mh / M;
    out.noSource = false;
    viewerSrc = [];
    const veil = gm ? veilState(sc) : null;
    let groupReady = false;                // a visão de todos os jogadores já está em cTmp2?

    // 1) Onde a luz chega. As luzes fixas só são refeitas quando paredes ou luzes mudam;
    //    as que os tokens carregam são refeitas a cada movimento.
    if (lit) {
      if (staticStale) {
        clear(cLitS); clear(cGlowS);
        for (const L of fixedLights(sc)) paintLight(L, segs, cLitS, cGlowS);
        staticStale = false;
      }
      clear(cLit); clear(cGlow);
      cLit.g.drawImage(cLitS, 0, 0); cGlow.g.drawImage(cGlowS, 0, 0);
      for (const L of tokenLights(sc)) paintLight(L, segs, cLit, cGlow);
    }

    // 2) O que cada jogador (ou o grupo) enxerga
    const vkey = gm ? null : (fog.shared ? '*' : viewer);
    let nViewer = 0;
    if (fog.dynamic) {
      const keys = fog.shared ? ['*'] : Store.S.players.map(p => p.id);
      for (const key of keys) {
        const isViewer = key === vkey;
        if (!isViewer && !fog.explored) continue;
        const target = isViewer ? cVis : cTmp2;
        const n = computeVis(sc, t => ownedBy(t, key), target, B, mode, isViewer);
        if (isViewer) nViewer = n;
        groupReady = !isViewer && key === '*';
        if (fog.explored) {
          let e = expl.get(key);
          if (!e) { e = mk(mw, mh); expl.set(key, e); }
          e.g.drawImage(target, 0, 0);
          e.touched = true;
        }
      }
      if (fog.explored) saveExplored();
    } else if (!gm) {
      if (fog.manual) { clear(cVis); cVis.g.drawImage(cReveal, 0, 0); }
      for (const t of sc.tokens) {
        if (!t.vis || !t.vis.on || !ownedBy(t, vkey) || !(t.vis.dark > 0)) continue;
        const half = t.size * cell / 2;
        viewerSrc.push({ poly: null, cx: t.x + half, cy: t.y + half, dr: t.vis.dark * cell + half });
      }
    }

    // 3) Escuridão (com os buracos de luz)
    if (lit) {
      const g = cDark.g;
      clear(cDark);
      const a = mode === 'penumbra' ? 0.46 : (gm ? 0.68 : 0.9);
      g.fillStyle = `rgba(6,8,16,${a})`;
      g.fillRect(0, 0, mw, mh);
      g.globalCompositeOperation = 'destination-out';
      g.drawImage(cLit, 0, 0);
      g.setTransform(M, 0, 0, M, 0, 0);
      for (const s of viewerSrc) {
        if (!s.dr) continue;
        g.save();
        if (s.poly) { polyPath(g, s.poly); g.clip(); }
        const gr = g.createRadialGradient(s.cx, s.cy, 0, s.cx, s.cy, s.dr);
        gr.addColorStop(0, 'rgba(0,0,0,0.72)'); gr.addColorStop(0.8, 'rgba(0,0,0,0.62)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr;
        g.fillRect(s.cx - s.dr, s.cy - s.dr, s.dr * 2, s.dr * 2);
        g.restore();
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-over';
      out.dark = cDark; out.glow = cGlow;
    } else { out.dark = null; out.glow = null; }

    // 4) Névoa
    if (!fogOn) { out.fog = null; out.vis = null; }
    else if (gm) {
      out.vis = null;
      if (fog.manual) {
        const g = cFog.g;
        clear(cFog);
        if (fog.dynamic) {
          // revelado à força aparece num tom claro; escondido à força, num tom escuro
          const tg = cTmp.g;
          clear(cTmp);
          tg.fillStyle = 'rgba(150,235,180,0.16)'; tg.fillRect(0, 0, mw, mh);
          tg.globalCompositeOperation = 'destination-in'; tg.drawImage(cReveal, 0, 0);
          tg.globalCompositeOperation = 'source-over';
          g.drawImage(cTmp, 0, 0);
          g.globalAlpha = 0.5; g.drawImage(cHide, 0, 0); g.globalAlpha = 1;
        }
        else {
          g.fillStyle = 'rgba(6,8,14,0.5)'; g.fillRect(0, 0, mw, mh);
          g.globalCompositeOperation = 'destination-out'; g.drawImage(cReveal, 0, 0);
          g.globalCompositeOperation = 'source-over';
        }
        out.fog = cFog;
      } else out.fog = null;
    } else {
      const g = cFog.g;
      clear(cFog);
      g.fillStyle = FOG; g.fillRect(0, 0, mw, mh);
      g.globalCompositeOperation = 'destination-out';
      if (fog.dynamic && fog.explored) {
        const e = expl.get(vkey);
        if (e) { g.globalAlpha = 0.45; g.drawImage(e, 0, 0); g.globalAlpha = 1; }
      }
      g.drawImage(cVis, 0, 0);
      g.globalCompositeOperation = 'source-over';
      if (fog.manual && fog.dynamic) g.drawImage(cHide, 0, 0);
      out.fog = cFog; out.vis = cVis;
      out.noSource = fog.dynamic && nViewer === 0;
      const sg = cSample.g;
      sg.clearRect(0, 0, cSample.width, cSample.height);
      sg.drawImage(cVis, 0, 0, cSample.width, cSample.height);
    }
    // 5) Véu do mestre (quando ele pede): tudo o que nenhum jogador enxerga agora fica coberto por uma camada
    //    escura e translúcida; o que eles enxergam continua com o brilho normal. Vale a mesma conta da visão dos
    //    jogadores (paredes, portas, cortinas, escuridão, luzes, visão no escuro). Com um token selecionado
    //    sozinho, a conta é só a dele, tenha dono ou não.
    out.veil = null; out.veilOf = null;
    if (veil) {
      if (veil.tok) computeVis(sc, t => t === veil.tok, cTmp2, B, mode, false);
      else if (!groupReady) computeVis(sc, t => ownedBy(t, '*'), cTmp2, B, mode, false);
      if (!cVeil) cVeil = mk(mw, mh);
      const g = cVeil.g;
      clear(cVeil);
      g.fillStyle = veilColor; g.fillRect(0, 0, mw, mh);
      g.globalCompositeOperation = 'destination-out';
      g.drawImage(cTmp2, 0, 0);
      g.globalCompositeOperation = 'source-over';
      out.veil = cVeil; out.veilOf = veil.tok ? veil.tok.id : '*';
    }
    stats.ms = performance.now() - t0;
    return out;
  }

  // Quem está olhando enxerga este ponto do mapa?
  function canSee(x, y) {
    if (!out.vis) return true;
    const kx = cSample.width / mw, ky = cSample.height / mh;
    const px = Math.floor(x * M * kx), py = Math.floor(y * M * ky);
    if (px < 0 || py < 0 || px >= cSample.width || py >= cSample.height) return false;
    return cSample.g.getImageData(px, py, 1, 1).data[3] > 60;
  }

  function resetExplored(sc) {
    for (const c of expl.values()) clear(c);
    expl.clear();
    sc.explored = {};
    Persist.scene(sc.id);
    dirty = true;
  }

  // Decide, a partir de uma operação do Store, o que precisa ser refeito.
  function onOp(op) {
    if (op.t === 'scn') {
      // Só o que muda luz, névoa ou o tamanho da cena pede recálculo; turnos, miras e clima, não.
      const p = op.p || {};
      if ('light' in p || 'fog' in p || 'cols' in p || 'rows' in p || 'cell' in p) { dirty = true; staticStale = true; }
      return;
    }
    if (op.c === 'fogOps') { manualStale = true; dirty = true; return; }
    if (op.c === 'walls' || op.c === 'lights') { dirty = true; staticStale = true; return; }
    if (op.c === 'tokens') {
      if (op.t !== 'upd') { dirty = true; return; }
      const p = op.p;
      if ('x' in p || 'y' in p || 'size' in p || 'vis' in p || 'light' in p || 'owner' in p || 'hidden' in p) dirty = true;
    }
  }

  return {
    update, canSee, onOp, out, stats, resetExplored, flushExplored,
    isDirty: () => dirty,
    invalidate() { dirty = true; },
    // A seleção mudou: o véu do mestre pode passar a valer para outro token (ou voltar ao grupo). Só então refaz.
    selChanged() { const v = veilState(Store.scene()); if ((v ? (v.tok ? v.tok.id : '*') : null) !== out.veilOf) dirty = true; },
    setVeilColor(c) { if (c && c !== veilColor) { veilColor = c; dirty = true; } },
    previewOp(op) { if (cReveal) { paintOp(op); dirty = true; } },
    restoreManual() { manualStale = true; dirty = true; },
  };
})();
