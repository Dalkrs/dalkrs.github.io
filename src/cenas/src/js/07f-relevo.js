/* ---------------------------------------------------------------
   7f. RELEVO (lote 18) — o relevo com regra: o sistema sugere, o mestre confirma
   As áreas de terreno (Morro, Montanha, Plataforma, Fosso…) têm altura. Com a tabela do mestre (a da mesa: uma só
   para todas as cenas, com valores de começo):
     - subir custa movimento: cada quadrado de altura subido vale `sobe` quadrados a mais (a régua e o arrastar
       mostram);
     - `penhasco` quadrados de altura de uma vez é penhasco: subir só escalando; descer assim é uma queda;
     - a queda sugere o dano: `queda`% da Vida máxima a cada `quedaCada` quadrados de queda (o aviso do mestre tem o
       "Aplicar");
     - de cima, `cima` no ataque; de baixo, `baixo` (a janelinha de atributos oferece somar, mirando alguém).
   E a visão pelo relevo (uma chave por cena, sc.relevoVisao): o que é mais alto que o olho de quem olha esconde o que
   está atrás; de dentro de um fosso, só se vê o fosso; de cima, o alcance da visão cresce com a altura.
   Nada se aplica sozinho. A tabela mora nas preferências da mesa (Store.S.prefs.relevo, só do mestre); a cena que
   vai para os jogadores leva uma cópia dela (relevoTab).
   --------------------------------------------------------------- */
const Relevo = (() => {
  const PADRAO = Object.freeze({ on: true, sobe: 1, penhasco: 3, cima: 2, baixo: -2, queda: 10, quedaCada: 2 });
  const numOk = (v, a, b, p) => { const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : NaN; return isFinite(n) ? clamp(Math.round(n * 10) / 10, a, b) : p; };
  function norm(t) {
    const o = t && typeof t === 'object' && !Array.isArray(t) ? t : {};
    return {
      on: o.on !== false,
      sobe: numOk(o.sobe, 0, 20, PADRAO.sobe),
      penhasco: numOk(o.penhasco, 1, 100, PADRAO.penhasco),
      cima: numOk(o.cima, -999, 999, PADRAO.cima),
      baixo: numOk(o.baixo, -999, 999, PADRAO.baixo),
      queda: numOk(o.queda, 0, 100, PADRAO.queda),
      quedaCada: numOk(o.quedaCada, 0.5, 100, PADRAO.quedaCada),
    };
  }
  const igualAoPadrao = t => JSON.stringify(norm(t)) === JSON.stringify(norm(null));
  // A tabela que vale: a da mesa (o mestre); para os jogadores, a cópia que veio com a cena; senão, a de começo.
  function tabela(sc) {
    const p = typeof Store !== 'undefined' && Store.S.prefs ? Store.S.prefs.relevo : null;
    return norm(p || (sc && sc.relevoTab) || null);
  }
  const unidade = sc => (sc && sc.grid && sc.grid.unit > 0 ? sc.grid.unit : 1.5);
  // a altura do chão num ponto, em quadrados (a área de terreno de cima manda; sem área, 0)
  function alturaEm(sc, x, y) {
    const s = Combate.terrainAt(sc, x, y);
    return s ? (Number(s.ter.h) || 0) / unidade(sc) : 0;
  }
  // a altura em que o token está (pelo centro), em quadrados
  function alturaDoToken(t, sc) {
    const s = Combate.terrainOf(t, sc);
    return s ? (Number(s.ter.h) || 0) / unidade(sc) : 0;
  }
  const temRelevo = sc => !!sc && Array.isArray(sc.shapes) && sc.shapes.some(s => isTer(s) && shapeShown(s) && Number(s.ter.h));

  /* O que o caminho reto (ou a linha quebrada, pts = [x0, y0, x1, y1, …]) atravessa: soma das subidas e das descidas,
     o maior degrau de subida e o de descida (em quadrados). Amostra a cada quarto de quadrado. */
  function perfil(sc, pts) {
    const out = { sobe: 0, desce: 0, maxSobe: 0, maxDesce: 0, de: 0, para: 0 };
    if (!sc || !Array.isArray(pts) || pts.length < 4 || !temRelevo(sc)) return out;
    const passo = Math.max(2, sc.cell / 4);
    let ant = alturaEm(sc, pts[0], pts[1]);
    out.de = ant;
    for (let i = 2; i + 1 < pts.length; i += 2) {
      const ax = pts[i - 2], ay = pts[i - 1], bx = pts[i], by = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / passo));
      for (let k = 1; k <= n; k++) {
        const h = alturaEm(sc, ax + (bx - ax) * k / n, ay + (by - ay) * k / n), d = h - ant;
        if (d > 1e-6) { out.sobe += d; out.maxSobe = Math.max(out.maxSobe, d); }
        else if (d < -1e-6) { out.desce -= d; out.maxDesce = Math.max(out.maxDesce, -d); }
        ant = h;
      }
    }
    out.para = ant;
    for (const k of ['sobe', 'desce', 'maxSobe', 'maxDesce', 'de', 'para']) out[k] = Math.round(out[k] * 100) / 100;
    return out;
  }
  /* O que o relevo diz de um caminho: { extra (quadrados a mais pela subida), escalar (há penhasco subindo), queda
     (quadrados do maior degrau de descida que é penhasco; 0 sem queda) } — ou null, sem relevo ou com a regra desligada. */
  function custo(sc, pts) {
    const t = tabela(sc);
    if (!t.on || !temRelevo(sc)) return null;
    const p = perfil(sc, pts);
    if (!p.sobe && !p.desce) return null;
    return { extra: Math.round(p.sobe * t.sobe * 10) / 10, sobe: p.sobe, escalar: p.maxSobe >= t.penhasco, queda: p.maxDesce >= t.penhasco ? p.maxDesce : 0, perfil: p };
  }
  // o texto que a régua e o arrastar acrescentam: " · subida +2 q = 6 q · penhasco: só escalando · queda de 4,5 m"
  function rotulo(sc, total, pts) {
    const c = custo(sc, pts);
    if (!c) return '';
    const u = unidade(sc), un = (sc.grid && sc.grid.unitName) || '';
    const p = [];
    if (c.extra > 0) p.push('subida +' + fmt(c.extra) + ' q = ' + fmt(total + c.extra) + ' q');
    if (c.escalar) p.push('penhasco: só escalando');
    if (c.queda) p.push('queda de ' + fmt(c.queda * u) + (un ? ' ' + un : ''));
    return p.length ? ' · ' + p.join(' · ') : '';
  }
  /* A queda sugere o dano: a porcentagem da Vida máxima (a cada `quedaCada` quadrados de queda, `queda`%) e quanto
     isso é na barra da vida do token. → { q (quadrados), m (na unidade da cena), pct, dano, barra } | null */
  function danoDaQueda(sc, t, q) {
    const tb = tabela(sc);
    if (!tb.on || !(q >= tb.penhasco)) return null;
    const pct = Math.min(100, Math.floor(q / tb.quedaCada + 1e-9) * tb.queda);
    const b = t ? barraDaVida(t.bars) : null;
    return { q: Math.round(q * 100) / 100, m: Math.round(q * unidade(sc) * 100) / 100, pct, dano: b && pct ? Math.max(1, Math.floor(b.m * pct / 100 + 1e-9)) : 0, barra: b ? b.n : null };
  }
  /* A queda de um token neste passo (de onde estava — antes: { x, y } — até onde está): o maior degrau de descida do
     caminho reto, se for penhasco. → o que danoDaQueda devolve, com o token, ou null. */
  function quedaDoPasso(sc, t, antes) {
    if (!sc || !t || t.prop || !antes || !('x' in antes || 'y' in antes)) return null;
    const h = t.size * sc.cell / 2, ax = (antes.x == null ? t.x : antes.x) + h, ay = (antes.y == null ? t.y : antes.y) + h;
    const c = custo(sc, [ax, ay, t.x + h, t.y + h]);
    if (!c || !c.queda) return null;
    const d = danoDaQueda(sc, t, c.queda);
    return d ? Object.assign({ tok: t.id, nome: tokName(t) }, d) : null;
  }
  /* De cima ou de baixo: a diferença de altura entre quem ataca e o alvo (em quadrados). Um quadrado de diferença já
     conta. → { lado: 'cima' | 'baixo', v (o bônus da tabela), dif } | null */
  function vantagem(sc, atacante, alvo) {
    const tb = tabela(sc);
    if (!tb.on || !atacante || !alvo || !temRelevo(sc)) return null;
    const dif = alturaDoToken(atacante, sc) - alturaDoToken(alvo, sc);
    if (Math.abs(dif) < 1 - 1e-6) return null;
    const lado = dif > 0 ? 'cima' : 'baixo', v = tb[lado];
    return v ? { lado, v, dif: Math.round(dif * 100) / 100 } : null;
  }

  /* ---- a visão pelo relevo ----
     O contorno de cada área mais alta que o olho de quem olha barra a visão (como uma parede); de dentro de um fosso, o
     contorno dele também. O contorno do pincel livre é a linha do meio da pincelada. */
  function contorno(s) {
    const o = [];
    const ligar = (pts, fecha) => { for (let i = 0; i + 3 < pts.length; i += 2) o.push(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]); if (fecha && pts.length >= 6) o.push(pts[pts.length - 2], pts[pts.length - 1], pts[0], pts[1]); };
    switch (s.k) {
      case 'rect': ligar([s.x, s.y, s.x + s.w, s.y, s.x + s.w, s.y + s.h, s.x, s.y + s.h], true); break;
      case 'ell': {
        const rx = s.w / 2, ry = s.h / 2, cx = s.x + rx, cy = s.y + ry, p = [];
        if (!(rx > 0 && ry > 0)) break;
        for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; p.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); }
        ligar(p, true); break;
      }
      case 'poly': if (Array.isArray(s.pts) && s.pts.length >= 6) ligar(s.pts, true); break;
      case 'free': if (Array.isArray(s.pts) && s.pts.length >= 4) ligar(s.pts, false); break;
    }
    return o;
  }
  const ligada = sc => !!(sc && sc.relevoVisao && sc.fog && sc.fog.dynamic);
  // os segmentos que o relevo põe na visão DESTE token ([] com a chave desligada ou sem relevo)
  function barreiras(sc, t) {
    if (!ligada(sc) || !t || !temRelevo(sc)) return [];
    const olho = alturaDoToken(t, sc), u = unidade(sc), out = [];
    const meu = Combate.terrainOf(t, sc);
    for (const s of sc.shapes) {
      if (!isTer(s) || !shapeShown(s)) continue;
      const h = (Number(s.ter.h) || 0) / u;
      if (h > olho + 1e-6 || (s === meu && h < -1e-6)) for (const v of contorno(s)) out.push(v);
    }
    return out;
  }
  // de cima se vê mais longe: o alcance da visão (quando tem) cresce um quadrado por quadrado de altura
  const alcanceExtra = (sc, t) => (ligada(sc) ? Math.max(0, Math.floor(alturaDoToken(t, sc) + 1e-6)) : 0);

  return { PADRAO, norm, igualAoPadrao, tabela, alturaEm, alturaDoToken, temRelevo, perfil, custo, rotulo, danoDaQueda, quedaDoPasso, vantagem, contorno, barreiras, alcanceExtra, ligada };
})();
