/* ---------------------------------------------------------------
   3b. WALLS — as paredes como elas valem na hora
   Os dados salvos nunca mudam aqui. O que este módulo responde é
   "o que barra o quê agora", a partir de duas regras:
     - abertura (porta, porta secreta, janela, cortina) desenhada em
       cima de uma parede comum tira aquele trecho da parede enquanto
       existir: para a visão, para a passagem e para o traço da parede.
       Apagou a abertura, a parede volta inteira;
     - aberturas empilhadas (cortina sobre janela) não se cortam: cada
       uma vale pela própria regra, e o trecho barra se QUALQUER uma
       delas barrar.
   O resultado fica guardado por cena e é refeito quando alguma parede
   muda: o módulo escuta as operações do Store. Quem mexer nos dados
   por fora do Store chama Walls.invalidate().
   --------------------------------------------------------------- */
const Walls = (() => {
  let ver = 0, builds = 0, cache = null;
  Store.on('live', op => { if (op.c === 'walls') ver++; });

  // Tolerâncias, proporcionais ao quadrado (os números valem para o quadrado padrão de 64 px):
  // a abertura conta como "em cima" da parede se estiver alinhada com ela a até 4 px
  // e as duas se sobrepuserem de verdade por mais de 2 px ao longo da parede.
  const tolOf = cell => Math.max(1.5, cell / 16);
  const minOf = cell => Math.max(1, cell / 32);

  // Trechos [de, até, ponta, ponta], em distância ao longo da parede, que alguma abertura cobre. As duas "pontas"
  // são as pontas da própria abertura quando caem dentro da parede (null quando a abertura passa do fim dela):
  // é nelas que o resto da parede vai terminar (ver remnants).
  function cuts(w, L, ux, uy, openings, tol, min) {
    const out = [];
    // caixa da parede, com a folga da tolerância: abertura que nem chega perto sai sem fazer conta
    const x0 = (w.x1 < w.x2 ? w.x1 : w.x2) - tol, x1 = (w.x1 > w.x2 ? w.x1 : w.x2) + tol;
    const y0 = (w.y1 < w.y2 ? w.y1 : w.y2) - tol, y1 = (w.y1 > w.y2 ? w.y1 : w.y2) + tol;
    for (const o of openings) {
      if ((o.x1 < x0 && o.x2 < x0) || (o.x1 > x1 && o.x2 > x1) || (o.y1 < y0 && o.y2 < y0) || (o.y1 > y1 && o.y2 > y1)) continue;
      const ax = o.x1 - w.x1, ay = o.y1 - w.y1, bx = o.x2 - w.x1, by = o.y2 - w.y1;
      const a = ax * ux + ay * uy, b = bx * ux + by * uy;          // as pontas da abertura, ao longo da parede
      const lo = Math.max(0, Math.min(a, b)), hi = Math.min(L, Math.max(a, b));
      if (hi - lo <= min) continue;                                // só encosta na ponta, cruza ou está longe
      const pa = ax * uy - ay * ux, pb = bx * uy - by * ux;        // afastamento de cada ponta em relação à linha da parede
      const off = s => pa + (pb - pa) * (s - a) / (b - a);         // … e em qualquer ponto do trecho comum
      if (Math.abs(off(lo)) > tol || Math.abs(off(hi)) > tol) continue;
      const p1 = [o.x1, o.y1], p2 = [o.x2, o.y2], first = a <= b ? p1 : p2, last = a <= b ? p2 : p1;
      out.push([lo, hi, Math.min(a, b) > 0 ? first : null, Math.max(a, b) < L ? last : null]);
    }
    return out;
  }

  // O que sobra de uma parede comum depois de tirar os trechos cobertos: lista de [x1, y1, x2, y2].
  // Onde uma abertura corta, o resto termina NA PONTA DA ABERTURA, e não no ponto da linha da parede em frente a
  // ela: a abertura pode estar até uns 4 px fora da linha, e sem isso sobraria entre as duas uma fresta por onde
  // a visão (e um token) passaria com a porta fechada.
  function remnants(w, openings, tol, min) {
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L = Math.hypot(dx, dy);
    const whole = [[w.x1, w.y1, w.x2, w.y2]];
    if (L < 1e-6 || !openings.length) return whole;
    const ux = dx / L, uy = dy / L;
    const cs = cuts(w, L, ux, uy, openings, tol, min);
    if (!cs.length) return whole;
    cs.sort((p, q) => p[0] - q[0]);
    const at = s => (s <= 0 ? [w.x1, w.y1] : s >= L ? [w.x2, w.y2] : [w.x1 + ux * s, w.y1 + uy * s]);
    const out = [];
    const piece = (s, e, ps, pe) => { if (e - s > tol) { const p = ps || at(s), q = pe || at(e); out.push([p[0], p[1], q[0], q[1]]); } };   // sobra menor que a tolerância não é parede
    let from = 0, fromPt = null;          // onde começa o próximo resto, e a ponta da abertura que cortou ali (se foi uma)
    for (const [lo, hi, pLo, pHi] of cs) {
      if (lo > from) piece(from, lo, fromPt, pLo);
      if (hi > from) { from = hi; fromPt = pHi; }
    }
    piece(from, L, fromPt, null);
    return out;
  }

  function build(sc) {
    const cell = sc.cell || 64, tol = tolOf(cell), min = minOf(cell);
    const openings = sc.walls.filter(isOpening);
    const d = {
      stamp: ++builds,          // muda a cada reconstrução: serve de chave para quem guarda algo derivado
      sight: [],                // [x1, y1, x2, y2, …] que barram a visão de qualquer um: restos de parede e portas fechadas
      curtains: [],             // cortinas fechadas: barram a visão, menos a de quem está encostado nelas
      sightAll: null,           // sight + todas as cortinas fechadas (luzes, e quem não está perto de nenhuma)
      move: [],                 // o que barra a passagem: restos de parede, portas e janelas fechadas
      pieces: new Map(),        // parede comum → os trechos dela que sobraram (para desenhar e para o clique)
      openings,
    };
    for (const w of sc.walls) {
      if (isOpening(w)) {
        if (wallBlocksMove(w)) d.move.push(w.x1, w.y1, w.x2, w.y2);
        if (wallBlocksSight(w)) { if (w.k === 'veil') d.curtains.push(w); else d.sight.push(w.x1, w.y1, w.x2, w.y2); }
        continue;
      }
      const pcs = remnants(w, openings, tol, min);
      d.pieces.set(w.id, pcs);
      for (const q of pcs) { d.sight.push(q[0], q[1], q[2], q[3]); d.move.push(q[0], q[1], q[2], q[3]); }
    }
    d.sightAll = d.sight;
    if (d.curtains.length) { d.sightAll = d.sight.slice(); for (const c of d.curtains) d.sightAll.push(c.x1, c.y1, c.x2, c.y2); }
    return d;
  }

  // As paredes efetivas da cena (guardadas até alguma parede mudar).
  function of(sc) {
    if (cache && cache.sc === sc && cache.walls === sc.walls && cache.n === sc.walls.length && cache.ver === ver && cache.cell === sc.cell) return cache.data;
    cache = { sc, walls: sc.walls, n: sc.walls.length, ver, cell: sc.cell, data: build(sc) };
    return cache.data;
  }

  // Encostado na cortina: o centro do token fica a até meio token + 0,75 quadrado dela.
  const curtainNear = (t, w, cell) => Geo.distSeg(t.x + t.size * cell / 2, t.y + t.size * cell / 2, w.x1, w.y1, w.x2, w.y2) <= t.size * cell / 2 + 0.75 * cell;

  // O que barra a visão DESTE token: o que barra a de qualquer um, mais as cortinas fechadas das quais ele
  // não está encostado. É recalculado a cada pedido (depende de onde o token está), então nunca fica velho.
  function sightFor(sc, t) {
    const d = of(sc);
    if (!d.curtains.length) return d.sight;
    const far = d.curtains.filter(c => !curtainNear(t, c, sc.cell));
    if (far.length === d.curtains.length) return d.sightAll;
    const s = d.sight.slice();
    for (const c of far) s.push(c.x1, c.y1, c.x2, c.y2);
    return s;
  }

  // O caminho reto de (ax, ay) a (bx, by) cruza algo que barra a passagem?
  function blocksMove(sc, ax, ay, bx, by) {
    const m = of(sc).move;
    for (let i = 0; i < m.length; i += 4) if (Geo.segHit(ax, ay, bx, by, m[i], m[i + 1], m[i + 2], m[i + 3])) return true;
    return false;
  }

  // Distância do ponto ao que se vê da parede: numa parede comum, só os trechos que sobraram.
  function dist(sc, w, x, y) {
    const pcs = of(sc).pieces.get(w.id);
    if (!pcs) return Geo.distSeg(x, y, w.x1, w.y1, w.x2, w.y2);
    let d = Infinity;
    for (const q of pcs) d = Math.min(d, Geo.distSeg(x, y, q[0], q[1], q[2], q[3]));
    return d;
  }

  return { of, sightFor, curtainNear, blocksMove, dist, invalidate() { ver++; } };
})();
