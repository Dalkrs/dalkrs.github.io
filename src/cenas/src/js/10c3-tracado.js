/* ---------------------------------------------------------------
   10c3. TRAÇADO — o que os geradores de lugar usam para o traçado (lote 8, parte 5)
   A rosa dos ventos (as oito direções), o ponto da borda do mapa numa direção, o rio que vem de um lado e vai para
   outro (a largura, as curvas, o afluente e o lago), onde uma linha cruza a água e como cortá-la ali, o contorno da
   muralha (redonda ou irregular; o octógono de sempre fica com cada gerador), o ponto do contorno numa direção e as
   manchas do relevo natural (colinas, bosques e pedras), pelo ruído. Tudo é conta pura, sorteada pelo sorteio que o
   gerador passa: a mesma semente dá o mesmo traçado.
   --------------------------------------------------------------- */
const Tracado = (() => {
  const TAU = Math.PI * 2;
  // as oito direções, no sentido do relógio a partir do norte (o norte é o alto do mapa)
  const DIRS = [
    { id: 'n', n: 'Norte', c: 'N', a: -Math.PI / 2 }, { id: 'ne', n: 'Nordeste', c: 'NE', a: -Math.PI / 4 },
    { id: 'l', n: 'Leste', c: 'L', a: 0 }, { id: 'se', n: 'Sudeste', c: 'SE', a: Math.PI / 4 },
    { id: 's', n: 'Sul', c: 'S', a: Math.PI / 2 }, { id: 'so', n: 'Sudoeste', c: 'SO', a: 3 * Math.PI / 4 },
    { id: 'o', n: 'Oeste', c: 'O', a: Math.PI }, { id: 'no', n: 'Noroeste', c: 'NO', a: -3 * Math.PI / 4 },
  ];
  const DIR = Object.fromEntries(DIRS.map(d => [d.id, d]));
  const IDS = DIRS.map(d => d.id);
  const valida = id => typeof id === 'string' && !!DIR[id];
  // a lista de direções de uma escolha (sem repetir, na ordem da rosa); [] quando não é uma lista
  const lista = v => (Array.isArray(v) ? IDS.filter(id => v.includes(id)) : []);
  // a direção mais perto de um ângulo
  const maisPerto = a => DIRS.reduce((m, d) => (Math.abs(difAng(d.a, a)) < Math.abs(difAng(m.a, a)) ? d : m)).id;
  const difAng = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  const oposta = id => IDS[(IDS.indexOf(id) + 4) % 8];
  // as larguras do rio (meia largura, em quadrados): riacho, rio e rio largo
  const LARGURA = { riacho: 0.9, rio: 1.7, largo: 2.6 };
  const LARGURAS = [['riacho', 'Riacho'], ['rio', 'Rio'], ['largo', 'Rio largo']];
  const clampN = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---- geometria ---- */
  const distSeg = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  };
  const distLinha = (pts, x, y) => { let d = Infinity; for (let i = 1; i < pts.length; i++) d = Math.min(d, distSeg(x, y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])); return d; };
  const dentro = (poli, x, y) => { let d = false; for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) { const [xi, yi] = poli[i], [xj, yj] = poli[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d; } return d; };
  const comprimento = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  // o ponto a uma fração t do comprimento da linha, com o ângulo dela ali e o índice do trecho
  function aoLongo(pts, t) {
    const alvo = comprimento(pts) * clampN(t, 0, 1);
    let s = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], d = Math.hypot(bx - ax, by - ay);
      if (s + d >= alvo || i === pts.length - 1) { const u = d ? clampN((alvo - s) / d, 0, 1) : 0; return { x: ax + (bx - ax) * u, y: ay + (by - ay) * u, ang: Math.atan2(by - ay, bx - ax), i }; }
      s += d;
    }
    return { x: pts[0][0], y: pts[0][1], ang: 0, i: 0 };
  }
  // a interseção dos segmentos ab e cd: [x, y, t em ab, u em cd] ou null
  function cruza(a, b, c, d) {
    const r1 = b[0] - a[0], r2 = b[1] - a[1], s1 = d[0] - c[0], s2 = d[1] - c[1], den = r1 * s2 - r2 * s1;
    if (Math.abs(den) < 1e-12) return null;
    const t = ((c[0] - a[0]) * s2 - (c[1] - a[1]) * s1) / den, u = ((c[0] - a[0]) * r2 - (c[1] - a[1]) * r1) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + r1 * t, a[1] + r2 * t, t, u] : null;
  }
  // a curva suave por pontos de controle (Catmull-Rom), com um ponto a cada passo (em quadrados)
  function suave(ctl, passo) {
    if (ctl.length < 3) {
      const [a, b] = ctl, L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / passo)), out = [];
      for (let i = 0; i <= n; i++) out.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
      return out;
    }
    const P = [ctl[0]].concat(ctl, [ctl[ctl.length - 1]]), out = [ctl[0]];
    for (let i = 1; i < P.length - 2; i++) {
      const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2], L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(1, Math.ceil(L / passo));
      for (let k = 1; k <= n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const f = (q0, q1, q2, q3) => 0.5 * (2 * q1 + (-q0 + q2) * t + (2 * q0 - 5 * q1 + 4 * q2 - q3) * t2 + (-q0 + 3 * q1 - 3 * q2 + q3) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    return out;
  }
  // Chaikin: arredonda um contorno fechado (cada volta dobra os pontos)
  function arredondar(pts, voltas) {
    let p = pts;
    for (let v = 0; v < voltas; v++) {
      const q = [];
      for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
      p = q;
    }
    return p;
  }
  const area = pts => { let s = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]); return s / 2; };
  // um contorno fechado com menos pontos (Douglas-Peucker): tira a escada das casas, deixando a forma
  function simplificar(pts, eps) {
    if (pts.length < 8) return pts;
    const dseg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy, t = l2 ? clampN(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2, 0, 1) : 0; return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t); };
    const linha = q => {
      const manter = new Uint8Array(q.length), pilha = [[0, q.length - 1]];
      manter[0] = manter[q.length - 1] = 1;
      while (pilha.length) {
        const [a, b] = pilha.pop();
        let iM = -1, dM = eps;
        for (let i = a + 1; i < b; i++) { const d = dseg(q[i], q[a], q[b]); if (d > dM) { dM = d; iM = i; } }
        if (iM >= 0) { manter[iM] = 1; pilha.push([a, iM], [iM, b]); }
      }
      return q.filter((_, i) => manter[i]);
    };
    // (fechado: corta no ponto mais longe do primeiro e simplifica as duas metades)
    let longe = 0, dm = -1;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > dm) { dm = d; longe = i; } }
    const a = linha(pts.slice(0, longe + 1)), b = linha(pts.slice(longe).concat([pts[0]]));
    return a.slice(0, -1).concat(b.slice(0, -1));
  }

  /* ---- a borda do mapa numa direção ----
     O raio que sai do meio do mapa naquela direção, até um pouco para fora da borda (fora: quanto para fora); desvio
     anda ao longo da borda (sem passar dos cantos). */
  function naBorda(id, W, H, desvio, fora) {
    const d = DIR[id] || DIR.n, cx = W / 2, cy = H / 2, ux = Math.cos(d.a), uy = Math.sin(d.a), f = fora == null ? 1 : fora;
    const tx = ux > 1e-9 ? (W + f - cx) / ux : ux < -1e-9 ? (-f - cx) / ux : Infinity;
    const ty = uy > 1e-9 ? (H + f - cy) / uy : uy < -1e-9 ? (-f - cy) / uy : Infinity;
    const t = Math.min(tx, ty);
    let x = cx + ux * t, y = cy + uy * t;
    if (desvio) { if (tx < ty) y = clampN(y + desvio, 2, H - 2); else x = clampN(x + desvio, 2, W - 2); }
    return [x, y];
  }

  /* ---- o caminho com curvas ----
     De a até b: pontos de controle a cada uns sete quadrados, empurrados para os lados (um para cada lado, quase sempre),
     tanto mais quanto mais curvas (0 = reto; 10 = bem sinuoso); a curva suave passa por eles. As pontas ficam no lugar. */
  function caminho(a, b, curvas, rnd, passo, chegada) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = -uy, ny = ux;
    const k = clampN(Number(curvas), 0, 10) / 10, amp = k * Math.min(7.5, L * 0.11), esp = Math.max(6.5, amp * 2.3), n = Math.max(2, Math.round(L / esp));
    const ctl = [a];
    let lado = rnd() < 0.5 ? 1 : -1;
    for (let i = 1; i < n; i++) {
      const t = i / n, env = Math.sqrt(Math.sin(Math.PI * t));
      if (rnd() < 0.85) lado = -lado;
      const off = lado * amp * (0.6 + 0.4 * rnd()) * env, ao = (rnd() - 0.5) * k;
      ctl.push([a[0] + ux * (L * t + ao) + nx * off, a[1] + uy * (L * t + ao) + ny * off]);
    }
    // (a chegada: o caminho termina vindo nessa direção — o rio que deságua de frente para a beira)
    if (chegada) { const q = [b[0] - chegada[0] * 6, b[1] - chegada[1] * 6]; while (ctl.length > 1 && Math.hypot(ctl[ctl.length - 1][0] - b[0], ctl[ctl.length - 1][1] - b[1]) < 9) ctl.pop(); ctl.push(q); }
    ctl.push(b);
    return suave(ctl, passo || 0.5);
  }

  /* ---- o rio ----
     op: { de, para, larg, curvas, afluente, lago, desvio } — de e para são direções da rosa (para também pode ser 'lago': o rio
     acaba num lago dentro do mapa); o que faltar é sorteado (para: do outro lado, mais ou menos). serve(r): o gerador
     diz se o rio serve (longe da praça, por exemplo); até 40 tentativas, depois o melhor. → { rios: [{ k, pts, hw }],
     lago: contorno | null, de, para, junta: o ponto onde o afluente encontra o rio } */
  function rioPlano(op, W, H, rnd, serve, nota) {
    op = op || {};
    const hw = LARGURA[op.larg] || LARGURA.rio, curvas = op.curvas == null || op.curvas === '' ? 4 : clampN(Math.round(Number(op.curvas)), 0, 10);
    // (o lago não passa de um quinto do mapa — num encontro pequeno, o rio largo não vira um mar —, mas é mais largo que o rio)
    const lagoR = (a, b) => [Math.min(a, Math.max(hw + 2, Math.min(W, H) * 0.2)), Math.min(b, Math.max(hw + 1.6, Math.min(W, H) * 0.16))];
    const tenta = () => {
      const de = valida(op.de) ? op.de : IDS[Math.floor(rnd() * 8) % 8];
      let para = op.para === 'lago' || valida(op.para) ? op.para : null;
      if (!para || para === de) { const o = IDS.indexOf(oposta(de)), dd = [0, 1, -1][Math.floor(rnd() * 3) % 3]; para = IDS[(o + dd + 8) % 8]; }
      const desv = () => (rnd() - 0.5) * Math.min(W, H) * (op.desvio || 0.3);       // (desvio: quanto as pontas andam pela borda)
      const a = naBorda(de, W, H, desv(), 1.5);
      let lago = null, b;
      if (para === 'lago') {
        // o lago no meio do caminho entre a nascente e o outro lado, dentro do mapa
        const o = naBorda(oposta(de), W, H, desv(), -4), t = 0.55 + rnd() * 0.15;
        const cx = clampN(a[0] + (o[0] - a[0]) * t, 7, W - 7), cy = clampN(a[1] + (o[1] - a[1]) * t, 7, H - 7);
        lago = blob(cx, cy, ...lagoR(Math.max(4, hw * 3), Math.max(3.2, hw * 2.4)), rnd);
        b = [cx, cy];
      } else b = op.fim ? [op.fim[0] + (rnd() - 0.5) * (op.fimDesvio || 0) * Math.abs(op.chegada ? op.chegada[1] : 0), op.fim[1] + (rnd() - 0.5) * (op.fimDesvio || 0) * Math.abs(op.chegada ? op.chegada[0] : 0)] : naBorda(para, W, H, desv(), 1.5);
      const pts = caminho(a, b, curvas, rnd, 0.5, op.chegada || null);
      const rios = [{ k: 'rio', pts, hw }];
      let junta = null;
      if (op.afluente) {
        // o afluente: de outra direção (nem a da nascente nem a da foz), até um ponto do meio do rio
        const ja = new Set([de, para, IDS[(IDS.indexOf(de) + 1) % 8], IDS[(IDS.indexOf(de) + 7) % 8]]);
        const livres = IDS.filter(id => !ja.has(id) && (para === 'lago' || (id !== IDS[(IDS.indexOf(para) + 1) % 8] && id !== IDS[(IDS.indexOf(para) + 7) % 8])));
        const af = valida(op.afDe) && !ja.has(op.afDe) ? op.afDe : livres[Math.floor(rnd() * livres.length) % Math.max(1, livres.length)] || oposta(de);
        const j = aoLongo(pts, para === 'lago' ? 0.35 + rnd() * 0.2 : 0.38 + rnd() * 0.24);
        junta = [j.x, j.y];
        rios.push({ k: 'afluente', pts: caminho(naBorda(af, W, H, desv(), 1.5), junta, curvas, rnd), hw: Math.max(0.7, Math.round(hw * 0.62 * 10) / 10), de: af });
      }
      if (op.lago && !lago) {
        // o lago no caminho do rio (longe das pontas e do encontro com o afluente)
        let t = rnd() < 0.5 ? 0.22 + rnd() * 0.16 : 0.62 + rnd() * 0.16;
        if (junta) { const pj = aoLongo(pts, 0); void pj; }
        const q = aoLongo(pts, t);
        if (junta && Math.hypot(q.x - junta[0], q.y - junta[1]) < 9) t = t < 0.5 ? t + 0.42 : t - 0.42;
        const q2 = aoLongo(pts, t);
        lago = blob(clampN(q2.x, 6, W - 6), clampN(q2.y, 6, H - 6), ...lagoR(Math.max(4.2, hw * 3.2), Math.max(3.4, hw * 2.5)), rnd, q2.ang);
      }
      return { rios, lago, de, para, junta };
    };
    let melhor = null, nota0 = -Infinity;
    for (let k = 0; k < 40; k++) {
      const r = tenta();
      if (!serve) return r;
      const s = serve(r);
      if (s === true) return r;
      const v = typeof s === 'number' ? s : -k;
      if (v > nota0) { nota0 = v; melhor = r; }
    }
    if (nota) nota.desistiu = true;
    return melhor;
  }
  // um lago: um contorno redondo e torto em volta de (cx, cy), de raios rx e ry, deitado no ângulo ang
  function blob(cx, cy, rx, ry, rnd, ang) {
    const n = 18, a0 = ang || 0, c = Math.cos(a0), s = Math.sin(a0), raios = [];
    for (let i = 0; i < n; i++) raios.push(0.8 + rnd() * 0.32);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const r = (raios[(i + n - 1) % n] + 2 * raios[i] + raios[(i + 1) % n]) / 4, an = i / n * TAU, x = Math.cos(an) * rx * r, y = Math.sin(an) * ry * r;
      pts.push([cx + x * c - y * s, cy + x * s + y * c]);
    }
    return arredondar(pts, 1);
  }
  // a água de um rio planejado: a distância até ela (negativa dentro do lago) e se o ponto está na água (com folga)
  function agua(r) {
    const d = (x, y) => {
      let m = Infinity;
      for (const rio of r.rios) m = Math.min(m, distLinha(rio.pts, x, y) - rio.hw);
      if (r.lago) { const dl = distLinha(r.lago.concat([r.lago[0]]), x, y); m = Math.min(m, dentro(r.lago, x, y) ? -dl : dl); }
      return m;
    };
    return { dist: d, naAgua: (x, y, folga) => d(x, y) <= (folga || 0) };
  }

  /* ---- onde uma linha cruza a água ----
     Cada vez que a linha pts cruza um dos rios: o ponto, o ângulo da linha ali, a distância ao longo dela (s) e o rio.
     O lago não tem ponte: a linha que entra nele cruza com lago: true. */
  function cruzamentos(pts, r) {
    const out = [], acum = [0];
    for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const ver = (cont, rio, lago) => {
      for (let i = 1; i < pts.length; i++) for (let k = 1; k < cont.length; k++) {
        const q = cruza(pts[i - 1], pts[i], cont[k - 1], cont[k]);
        if (!q) continue;
        const s = acum[i - 1] + (acum[i] - acum[i - 1]) * q[2];
        if (out.some(o => Math.abs(o.s - s) < 0.3)) continue;
        out.push({ x: q[0], y: q[1], s, i, ang: Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]), rio, lago: !!lago, angRio: Math.atan2(cont[k][1] - cont[k - 1][1], cont[k][0] - cont[k - 1][0]) });
      }
    };
    for (const rio of r.rios) ver(rio.pts, rio, false);
    if (r.lago) ver(r.lago.concat([r.lago[0]]), null, true);
    return out.sort((a, b) => a.s - b.s);
  }
  /* A linha em pedaços, sem os trechos dos intervalos (de distâncias ao longo dela: [de, até]); os pedaços com menos
     de minimo de comprimento saem. */
  function cortar(pts, intervalos, minimo) {
    if (!intervalos.length) return [pts];
    const acum = [0];
    for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = acum[acum.length - 1], fora = intervalos.map(([a, b]) => [Math.min(a, b), Math.max(a, b)]).sort((a, b) => a[0] - b[0]);
    const vale = [];
    let s0 = 0;
    for (const [a, b] of fora) { if (a > s0) vale.push([s0, a]); s0 = Math.max(s0, b); }
    if (s0 < total) vale.push([s0, total]);
    const ponto = s => { for (let i = 1; i < pts.length; i++) if (acum[i] >= s) { const u = acum[i] > acum[i - 1] ? (s - acum[i - 1]) / (acum[i] - acum[i - 1]) : 0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u]; } return pts[pts.length - 1]; };
    return vale.filter(([a, b]) => b - a >= (minimo || 1)).map(([a, b]) => {
      const out = [ponto(a)];
      for (let i = 0; i < pts.length; i++) if (acum[i] > a && acum[i] < b) out.push(pts[i]);
      out.push(ponto(b));
      return out;
    });
  }
  // os trechos da linha (distâncias ao longo dela) em que dentro(x, y) vale, com margem para cada lado
  function dentroDe(pts, dentroFn, margem) {
    const out = [];
    let s = 0, ini = null;
    const passo = 0.25;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], d = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / passo));
      for (let k = 0; k < n; k++) {
        const u = k / n, x = ax + (bx - ax) * u, y = ay + (by - ay) * u, sd = s + d * u, em = dentroFn(x, y);
        if (em && ini == null) ini = sd;
        if (!em && ini != null) { out.push([ini - (margem || 0), sd + (margem || 0)]); ini = null; }
      }
      s += d;
    }
    if (ini != null) out.push([ini - (margem || 0), s + (margem || 0)]);
    return out;
  }

  /* ---- a muralha ----
     O contorno em volta de (cx, cy), de raios rx e ry: 'redonda' (28 lados) ou 'irregular' (16 pontos com o raio
     variando, arredondados); null nas outras. As torres ficam a cada uns dez quadrados do contorno (e nos cantos da
     irregular). → { ring, torres: [índices do ring] } */
  function muro(forma, cx, cy, rx, ry, rnd) {
    if (forma === 'redonda') {
      const n = 28, ring = [];
      for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i / n * TAU; ring.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
      return { ring, torres: torresPor(ring, 9.5) };
    }
    if (forma === 'irregular') {
      const n = 16, raios = [];
      for (let i = 0; i < n; i++) raios.push(0.8 + rnd() * 0.26);
      const base = [];
      for (let i = 0; i < n; i++) {
        const r = (raios[(i + n - 1) % n] + 2 * raios[i] + raios[(i + 1) % n]) / 4, a = -Math.PI / 2 + (i + (rnd() - 0.5) * 0.45) / n * TAU;
        base.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
      }
      // um pouco arredondada (os trechos retos entre as torres continuam visíveis)
      const ring = [];
      for (let i = 0; i < n; i++) { const a = base[i], b = base[(i + 1) % n]; ring.push(a, [a[0] * 0.5 + b[0] * 0.5, a[1] * 0.5 + b[1] * 0.5]); }
      return { ring, torres: ring.map((_, i) => i).filter(i => i % 2 === 0) };
    }
    return null;
  }
  // as torres ao longo do contorno, a cada passo (no vértice mais perto)
  function torresPor(ring, passo) {
    const out = [];
    let s = passo;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      s += Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (s >= passo) { out.push(i); s = 0; }
    }
    return out;
  }
  /* Os pedaços de uma paliçada num contorno fechado qualquer: o muro ('wall'), os portões ('door': onde uma rua cruza o
     contorno — o vão da largura da rua, mais meio quadrado de cada lado; maior quando ela cruza de viés) e, onde o
     contorno passa pela água (naAgua(x, y)), nada. Cada pedaço é uma linha (os cantos do contorno entram nela); os
     pedacinhos de muro que sobram entre dois portões saem. → [{ k: 'wall' | 'door', pts }] */
  function pecasDoAnel(ring, ruas, naAgua) {
    const n = ring.length, R = ring.concat([ring[0]]), acum = [0];
    for (let i = 0; i < n; i++) acum.push(acum[i] + Math.hypot(R[i + 1][0] - R[i][0], R[i + 1][1] - R[i][1]));
    const total = acum[n];
    if (!(n >= 3 && total > 0)) return [];
    const ponto = s0 => { const s = ((s0 % total) + total) % total; for (let i = 0; i < n; i++) if (acum[i + 1] >= s) { const u = (s - acum[i]) / ((acum[i + 1] - acum[i]) || 1); return [R[i][0] + (R[i + 1][0] - R[i][0]) * u, R[i][1] + (R[i + 1][1] - R[i][1]) * u]; } return R[0]; };
    // a linha do contorno de a até b (b pode passar do fim: dá a volta)
    const trecho = (a, b) => { const out = [ponto(a)]; for (let k = 0; k <= 2 * n; k++) { const sv = acum[k % n] + Math.floor(k / n) * total; if (sv > a + 1e-6 && sv < b - 1e-6) out.push(R[k % n]); } out.push(ponto(b)); return out; };
    const portas = [];
    for (const ru of ruas || []) for (let i = 1; i < ru.pts.length; i++) for (let k = 0; k < n; k++) {
      const q = cruza(ru.pts[i - 1], ru.pts[i], R[k], R[k + 1]);
      if (!q) continue;
      const ax = ru.pts[i][0] - ru.pts[i - 1][0], ay = ru.pts[i][1] - ru.pts[i - 1][1], bx = R[k + 1][0] - R[k][0], by = R[k + 1][1] - R[k][1];
      const sen = Math.abs(ax * by - ay * bx) / ((Math.hypot(ax, ay) * Math.hypot(bx, by)) || 1), meia = Math.min(4, (ru.hw || 1) / Math.max(0.35, sen) + 0.5), s = acum[k] + (acum[k + 1] - acum[k]) * q[3];
      portas.push([s - meia, s + meia]);
    }
    // cada passinho do contorno: a água vale mais que o portão, que vale mais que o muro
    const P = 0.1, N = Math.max(3, Math.ceil(total / P)), d = total / N, rot = [];
    const naPorta = s => portas.some(([a, b]) => { const m = (a + b) / 2, h = (b - a) / 2; let dd = Math.abs(s - m) % total; if (dd > total / 2) dd = total - dd; return dd <= h; });
    for (let i = 0; i < N; i++) { const s = (i + 0.5) * d, [x, y] = ponto(s); rot.push(naAgua && naAgua(x, y) ? 'agua' : naPorta(s) ? 'door' : 'wall'); }
    // os grupos seguidos (dando a volta: o último junta com o primeiro, se for igual)
    const grupos = [];
    for (let i = 0; i < N; i++) { const g = grupos[grupos.length - 1]; if (g && g.k === rot[i]) g.b = i + 1; else grupos.push({ k: rot[i], a: i, b: i + 1 }); }
    if (grupos.length > 1 && grupos[0].k === grupos[grupos.length - 1].k) { const u = grupos.pop(); grupos[0].a = u.a - N; }
    if (grupos.length === 1) return grupos[0].k === 'agua' ? [] : [{ k: grupos[0].k, pts: trecho(0, total) }];
    return grupos.filter(g => g.k !== 'agua' && (g.b - g.a) * d >= (g.k === 'wall' ? 0.8 : 0.6)).map(g => ({ k: g.k, pts: trecho(g.a * d, g.b * d) }));
  }
  // corta o contorno pela reta da beira do mar (fica o lado da terra: lado(x, y) >= 0); → { ring, aberto } (o lado novo,
  // ao longo da beira, fica sem muro)
  function cortarNoMar(ring, d) {
    const out = [];
    let aberto = -1;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length], da = d(a[0], a[1]), db = d(b[0], b[1]);
      if (da >= 0) out.push(a);
      if ((da >= 0) !== (db >= 0)) {
        const t = da / (da - db);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        if (da >= 0) aberto = out.length - 1;                    // daqui até o ponto em que o contorno volta à terra
      }
    }
    return { ring: out, aberto };
  }
  /* O ponto do contorno na direção ang (o raio que sai de (cx, cy)): o ponto, o lado (índice do trecho), o sentido do
     trecho (ex, ey) e o de fora (nx, ny). */
  function noContorno(ring, cx, cy, ang) {
    const ux = Math.cos(ang), uy = Math.sin(ang), longe = [cx + ux * 1e4, cy + uy * 1e4];
    let melhor = null;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length], q = cruza([cx, cy], longe, a, b);
      if (q && (!melhor || q[2] < melhor.t)) {
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L;
        let nx = ey, ny = -ex;
        if (nx * ux + ny * uy < 0) { nx = -nx; ny = -ny; }
        melhor = { x: q[0], y: q[1], t: q[2], i, ex, ey, nx, ny };
      }
    }
    return melhor;
  }

  /* ---- o ruído (para as manchas) ----
     Ruído de valor num reticulado, suave (as curvas de Hermite), em três oitavas: de 0 a 1. */
  function ruido(seed) {
    const h = (i, j) => { let x = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed | 0, 1442695041); x = Math.imul(x ^ (x >>> 13), 1274126177); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
    const s = t => t * t * (3 - 2 * t);
    const valor = (x, y) => {
      const i = Math.floor(x), j = Math.floor(y), fx = s(x - i), fy = s(y - j);
      const a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1);
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    };
    return (x, y) => (valor(x, y) * 0.57 + valor(x * 2.03 + 17.1, y * 2.03 + 3.7) * 0.29 + valor(x * 4.11 + 41.3, y * 4.11 + 29.9) * 0.14);
  }
  /* As manchas do relevo natural, num mapa W × H. livre(i, j): a casa pode ter relevo (fora da cidade, longe da água
     e das ruas). → { colinas: [{ pts, alt }], matas: [{ pts }], bosque(x, y): quanto mais árvores ali (0 a 1),
     pedras: [{ x, y, r }] } */
  function manchas(W, H, livre, seed) {
    const nc = ruido(seed ^ 0x1b873593), nb = ruido(seed ^ 0x2c1b3c6d), np = ruido(seed ^ 0x6a09e667);
    const EC = 1 / 9, EB = 1 / 6.5, EP = 1 / 3.6;
    // as colinas: as casas livres onde o ruído passa do limiar, em grupos (os pequenos não contam)
    const LIM = 0.6, marca = new Int32Array(W * H).fill(-1), colinas = [];
    const alta = (i, j) => i >= 0 && j >= 0 && i < W && j < H && livre(i, j) && nc((i + 0.5) * EC, (j + 0.5) * EC) > LIM;
    let g = 0;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      if (marca[j * W + i] >= 0 || !alta(i, j)) continue;
      const fila = [[i, j]], cel = [];
      marca[j * W + i] = g;
      let topo = 0;
      while (fila.length) {
        const [a, b] = fila.pop();
        cel.push([a, b]);
        topo = Math.max(topo, nc((a + 0.5) * EC, (b + 0.5) * EC));
        for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = a + da, y = b + db; if (x >= 0 && y >= 0 && x < W && y < H && marca[y * W + x] < 0 && alta(x, y)) { marca[y * W + x] = g; fila.push([x, y]); } }
      }
      if (cel.length >= 10) {
        const pts = contorno(cel, W, H, marca, g);
        if (pts && pts.length >= 6) colinas.push({ pts: arredondar(simplificar(pts, 0.75), 3), alt: clampN(Math.round(2 + (topo - LIM) * 22), 2, 5), n: cel.length });
      }
      g++;
    }
    // as pedras: em grupos, onde o terceiro ruído é alto (uma de cada vez, sem encostar)
    const pedras = [];
    const rp = mulberryLocal(seed ^ 0x3c6ef372);
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
      if (!livre(i, j) || np((i + 0.5) * EP, (j + 0.5) * EP) < 0.71 || rp() > 0.42) continue;
      const x = i + 0.2 + rp() * 0.6, y = j + 0.2 + rp() * 0.6, r = 0.22 + rp() * 0.38;
      if (pedras.some(q => Math.hypot(q.x - x, q.y - y) < q.r + r + 0.25)) continue;
      pedras.push({ x, y, r });
    }
    const bosque = (x, y) => clampN((nb(x * EB, y * EB) - 0.47) / 0.2, 0, 1);
    // as matas: os grupos de casas livres onde o bosque é fechado (o terreno Mata da cena, por baixo das árvores)
    const matas = [], mm = new Int32Array(W * H).fill(-1);
    const densa = (i, j) => i >= 0 && j >= 0 && i < W && j < H && livre(i, j) && bosque(i + 0.5, j + 0.5) > 0.62;
    let gm = 0;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      if (mm[j * W + i] >= 0 || !densa(i, j)) continue;
      const fila = [[i, j]], cel = [];
      mm[j * W + i] = gm;
      while (fila.length) {
        const [a, b] = fila.pop();
        cel.push([a, b]);
        for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = a + da, y = b + db; if (x >= 0 && y >= 0 && x < W && y < H && mm[y * W + x] < 0 && densa(x, y)) { mm[y * W + x] = gm; fila.push([x, y]); } }
      }
      if (cel.length >= 8) { const pts = contorno(cel, W, H, mm, gm); if (pts && pts.length >= 6) matas.push({ pts: arredondar(simplificar(pts, 0.75), 3), n: cel.length }); }
      gm++;
    }
    return { colinas, matas, pedras, bosque };
  }
  // o contorno de um grupo de casas (as arestas entre o grupo e o resto, ligadas em volta): o de fora (o maior)
  function contorno(cel, W, H, marca, g) {
    const em = (i, j) => i >= 0 && j >= 0 && i < W && j < H && marca[j * W + i] === g;
    const prox = new Map(), chave = (x, y) => x + ',' + y;
    const liga = (x1, y1, x2, y2) => { const k = chave(x1, y1); if (!prox.has(k)) prox.set(k, []); prox.get(k).push([x2, y2]); };
    for (const [i, j] of cel) {
      if (!em(i, j - 1)) liga(i, j, i + 1, j);
      if (!em(i + 1, j)) liga(i + 1, j, i + 1, j + 1);
      if (!em(i, j + 1)) liga(i + 1, j + 1, i, j + 1);
      if (!em(i - 1, j)) liga(i, j + 1, i, j);
    }
    const voltas = [];
    while (prox.size) {
      const [k0] = prox.keys(), [x0, y0] = k0.split(',').map(Number), volta = [[x0, y0]];
      let [x, y] = [x0, y0];
      for (let n = 0; n < 4 * cel.length + 8; n++) {
        const k = chave(x, y), lst = prox.get(k);
        if (!lst || !lst.length) break;
        const [nx, ny] = lst.shift();
        if (!lst.length) prox.delete(k);
        if (nx === x0 && ny === y0) break;
        volta.push([nx, ny]); x = nx; y = ny;
      }
      if (volta.length >= 4) voltas.push(volta);
    }
    if (!voltas.length) return null;
    return voltas.reduce((m, v) => (Math.abs(area(v)) > Math.abs(area(m)) ? v : m));
  }
  // um sorteio pequeno, próprio (o mulberry do motor também serve, mas este não depende da ordem dos arquivos)
  function mulberryLocal(a) { a = (a >>> 0) || 1; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---- os controles da janela ----
     A rosa dos ventos: oito botões em volta e, no meio, "Auto" (sem escolha); multi: vários (os portões) ou um só (de
     onde vem o rio). valor: a lista (multi) ou a direção (um), ou null (Auto). extra: [id, nome] a mais (o "Lago"). */
  function rosa(id, rotulo, valor, multi, mudou, extra, dica) {
    const sel = multi ? lista(valor) : valor;
    const marcado = d => (multi ? sel.includes(d) : sel === d);
    const caixa = h('div', { class: 'rosa', id, role: 'group', 'aria-label': rotulo });
    const POS = { no: [1, 1], n: [2, 1], ne: [3, 1], o: [1, 2], l: [3, 2], so: [1, 3], s: [2, 3], se: [3, 3] };
    for (const d of DIRS) {
      const b = h('button', { type: 'button', class: 'rosa-d' + (marcado(d.id) ? ' on' : ''), id: id + '-' + d.id, 'aria-pressed': marcado(d.id) ? 'true' : 'false', title: d.n, text: d.c,
        onclick: () => {
          if (multi) { const s2 = new Set(sel); if (s2.has(d.id)) s2.delete(d.id); else s2.add(d.id); mudou(s2.size ? IDS.filter(x => s2.has(x)) : null); }
          else mudou(sel === d.id ? null : d.id);
        } });
      b.style.gridColumn = POS[d.id][0]; b.style.gridRow = POS[d.id][1];
      caixa.append(b);
    }
    const auto = h('button', { type: 'button', class: 'rosa-a' + ((multi ? !sel.length : !sel) ? ' on' : ''), id: id + '-auto', 'aria-pressed': (multi ? !sel.length : !sel) ? 'true' : 'false', title: dica || 'Automático (como sempre)', text: 'Auto', onclick: () => mudou(null) });
    auto.style.gridColumn = 2; auto.style.gridRow = 2;
    caixa.append(auto);
    const lado = extra ? h('button', { type: 'button', class: 'rosa-x' + (valor === extra[0] ? ' on' : ''), id: id + '-' + extra[0], 'aria-pressed': valor === extra[0] ? 'true' : 'false', text: extra[1], onclick: () => mudou(valor === extra[0] ? null : extra[0]) }) : null;
    return h('div', { class: 'rosa-c' }, h('span', { class: 'lb', text: rotulo }), h('div', { class: 'rosa-l' }, caixa, lado));
  }
  /* As escolhas do traçado, como o gerador as usa (o que não veio fica como sempre): os portões (a lista da rosa), a
     forma da muralha (formas: as que o lugar tem além da de sempre; padraoForma: a de sempre), o rio, onde fica a praça,
     quantas pontes e o relevo natural. */
  function escolhas(o, formas, padraoForma) {
    o = o || {};
    const n = v => (v === null || v === undefined || v === '' || typeof v === 'boolean' || !Number.isFinite(Number(v)) ? null : Number(v));
    const curvas = n(o.rioCurvas), pontes = n(o.pontes);
    return {
      portoes: lista(o.portoes),
      muro: (formas || []).includes(o.muroForma) ? o.muroForma : padraoForma,
      rio: { de: valida(o.rioDe) ? o.rioDe : null, para: o.rioPara === 'lago' || valida(o.rioPara) ? o.rioPara : null, larg: ['riacho', 'rio', 'largo'].includes(o.rioLarg) ? o.rioLarg : null,
        curvas: curvas == null ? null : clampN(Math.round(curvas), 0, 10), afluente: o.afluente === true, lago: o.lago === true },
      praca: o.praca === 'rio' || o.praca === 'portao' ? o.praca : 'centro',
      pontes: pontes == null ? null : clampN(Math.round(pontes), 0, 6),
      relevo: o.relevoNat === true,
    };
  }
  // o rio escolhido na rosa (de onde vem, para onde vai, o afluente ou o lago)? (só a largura e as curvas não contam)
  const rioDaRosa = r => !!(r && (r.de || r.para || r.afluente || r.lago));
  /* As escolhas do traçado que um lugar guarda (no estado da janela e nos modelos): o que não está aqui fica como
     sempre. limpar(o): só as válidas; padrao(): todas no automático. */
  const CAMPOS = ['portoes', 'muroForma', 'rioDe', 'rioPara', 'rioLarg', 'rioCurvas', 'afluente', 'lago', 'praca', 'pontes', 'relevoNat'];
  const padrao = () => ({ portoes: null, muroForma: null, rioDe: null, rioPara: null, rioLarg: null, rioCurvas: null, afluente: false, lago: false, praca: 'centro', pontes: null, relevoNat: false });
  function limpar(o, formas) {
    o = o || {};
    const n = v => (v === null || v === undefined || v === '' || typeof v === 'boolean' || !Number.isFinite(Number(v)) ? null : Number(v));
    const c = n(o.rioCurvas), pt = n(o.pontes), ps = lista(o.portoes);
    return { portoes: ps.length ? ps : null, muroForma: (formas || ['oct', 'redonda', 'irregular']).includes(o.muroForma) ? o.muroForma : null,
      rioDe: valida(o.rioDe) ? o.rioDe : null, rioPara: o.rioPara === 'lago' || valida(o.rioPara) ? o.rioPara : null, rioLarg: ['riacho', 'rio', 'largo'].includes(o.rioLarg) ? o.rioLarg : null,
      rioCurvas: c == null ? null : clampN(Math.round(c), 0, 10), afluente: o.afluente === true, lago: o.lago === true,
      praca: o.praca === 'rio' || o.praca === 'portao' ? o.praca : 'centro', pontes: pt == null ? null : clampN(Math.round(pt), 0, 6), relevoNat: o.relevoNat === true };
  }
  // só o que saiu do automático (para guardar no modelo e nas escolhas da cena)
  function soMudadas(t) {
    const p = padrao(), out = {};
    for (const k of CAMPOS) if (JSON.stringify(t[k]) !== JSON.stringify(p[k])) out[k] = Array.isArray(t[k]) ? t[k].slice() : t[k];
    return out;
  }
  /* A seção "Traçado" da janela do gerador (abre e fecha; este aparelho lembra se estava aberta). t: as escolhas
     (padrao/limpar); mudou(): gera de novo. cfg: o que vale neste lugar —
       pre: o começo dos ids ('cid'); portoes: o nome ('Portões' ou 'Caminhos'; null = não tem);
       muro: { nome: 'Muralha', formas: [[id, nome]], ligada: bool, ligar(bool) } (null = não tem);
       rio: o lugar tem rio ligado (false: a seção diz como ligar — rioNota, se o lugar diz de outro jeito; null = não tem
       rio nenhum); mar: com mar (o rio vai para ele); praca: tem praça (true: os três lugares; ou a lista dos que valem
       ali); pontes: tem pontes; portoesNota: o que os portões fazem ali (senão, "uma rua principal…"). */
  function secao(t, K, mudou, cfg) {
    const { field, seg, toggle, btn, note, inSelect } = K, P = cfg.pre, linhas = [];
    if (cfg.portoes) {
      const sortear = () => { const ids = IDS.slice(); for (let i = ids.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [ids[i], ids[k]] = [ids[k], ids[i]]; } const n = 2 + Math.floor(Math.random() * 3); t.portoes = IDS.filter(id => ids.slice(0, n).includes(id)); mudou(); };
      linhas.push(h('div', { class: 'ger-trl' }, rosa(P + '-portoes', cfg.portoes, t.portoes, true, v => { t.portoes = v; mudou(); }, null, 'Automático: como sempre'),
        h('div', { class: 'ger-trn' }, note(cfg.portoesNota || (cfg.portoes === 'Caminhos' ? 'De onde chegam os caminhos (um de cada direção ligada).' : 'Uma rua principal sai de cada portão até a praça.')),
          btn('Sortear', sortear, { kind: 'small', id: P + '-portoes-sortear', icon: 'reset', title: 'Liga de duas a quatro direções ao acaso' }))));
    }
    if (cfg.muro) {
      const M = cfg.muro, val = M.ligada ? (t.muroForma || M.formas[0][0]) : 'sem';
      linhas.push(field(M.nome, seg(P + '-forma', val, M.formas.concat([['sem', 'Sem']]), v => { if (v === 'sem') M.ligar(false); else { t.muroForma = v === M.formas[0][0] ? null : v; M.ligar(true); } mudou(); }), 'stack'));
    }
    if (cfg.rio === false) linhas.push(note(cfg.rioNota || 'Ligue "Com rio" para escolher de onde ele vem, para onde vai, a largura e as curvas.'));
    else if (cfg.rio) {
      const para = cfg.mar ? note('Com mar, o rio deságua no mar.') : rosa(P + '-rio-para', 'Para onde vai', t.rioPara, false, v => { t.rioPara = v; if (v === 'lago') t.lago = false; mudou(); }, ['lago', 'Lago'], 'Automático: do outro lado');
      linhas.push(h('div', { class: 'ger-trl' }, rosa(P + '-rio-de', 'De onde vem o rio', t.rioDe, false, v => { t.rioDe = v; mudou(); }, null, 'Automático: como sempre'), para));
      const curv = h('input', { type: 'range', id: P + '-rio-curvas', min: 0, max: 10, step: 1, value: t.rioCurvas == null ? 4 : t.rioCurvas, 'aria-label': 'Curvas do rio: de reto a sinuoso', onchange: e => { t.rioCurvas = clampN(Math.round(Number(e.target.value)), 0, 10); mudou(); } });
      linhas.push(h('div', { class: 'ger-l' },
        field('Largura', seg(P + '-rio-larg', t.rioLarg || 'rio', LARGURAS, v => { t.rioLarg = v === 'rio' ? null : v; mudou(); }), 'stack'),
        field('Curvas', h('div', { class: 'ger-rg' }, h('span', { class: 'note', text: 'reto' }), curv, h('span', { class: 'note', text: 'sinuoso' })), 'stack')));
      linhas.push(h('div', { class: 'ger-l' },
        toggle(P + '-rio-af', t.afluente, v => { t.afluente = v; mudou(); }, 'Um afluente (dois rios que se juntam)'),
        toggle(P + '-rio-lago', t.lago || t.rioPara === 'lago', v => { t.lago = v; if (!v && t.rioPara === 'lago') t.rioPara = null; mudou(); }, 'Com lago', { disabled: t.rioPara === 'lago' })));
      if (cfg.rioDica) linhas.push(note(cfg.rioDica));
    }
    if (cfg.praca) {
      const ops = [['centro', 'No centro'], ['rio', 'Perto do rio', null, cfg.rio ? 'Na beira do rio' : 'Precisa do rio'], ['portao', 'Perto de um portão']].filter(x => !Array.isArray(cfg.praca) || cfg.praca.includes(x[0]));
      linhas.push(field('Praça', seg(P + '-praca', ops.some(x => x[0] === t.praca) ? t.praca : 'centro', ops, v => { t.praca = v; mudou(); }), 'stack'));
    }
    if (cfg.pontes && cfg.rio) linhas.push(field('Pontes', inSelect(P + '-pontes', t.pontes == null ? 'auto' : String(t.pontes), [['auto', 'Automático (uma em cada rua que cruza a água)'], ['0', 'Nenhuma (as ruas param na beira)'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']], v => { t.pontes = v === 'auto' ? null : Number(v); mudou(); }), 'stack'));
    linhas.push(toggle(P + '-relnat', t.relevoNat, v => { t.relevoNat = v; mudou(); }, 'Relevo natural (colinas, matas e pedras em manchas)'));
    const mud = Object.keys(soMudadas(t)).length;
    linhas.push(h('div', { class: 'row' }, btn('Voltar ao automático', () => { Object.assign(t, padrao()); if (cfg.muro && !cfg.muro.ligada && cfg.muro.padraoLigada) cfg.muro.ligar(true); mudou(); }, { kind: 'small', id: P + '-tr-auto', disabled: !mud, title: 'Tudo como sempre: os portões, o rio, a praça, as pontes e o relevo' })));
    const det = h('details', { class: 'ger-tr', id: P + '-tr', open: App.opt.genTracado === true, ontoggle: e => { App.opt.genTracado = e.target.open; } },
      h('summary', null, h('b', { text: 'Traçado' }), h('span', { class: 'note', id: P + '-tr-res', text: resumoDe(t, cfg) })), h('div', { class: 'ger-trc' }, linhas));
    return det;
  }
  // o que mudou no traçado, em palavras ("portões ao norte e a leste · rio de oeste para leste · 2 pontes")
  function resumoDe(t, cfg) {
    const out = [];
    if (cfg.portoes && t.portoes && t.portoes.length) out.push((cfg.portoes === 'Caminhos' ? 'caminhos: ' : 'portões: ') + nomes(t.portoes));
    if (cfg.muro && t.muroForma) out.push((cfg.muro.nome || 'muralha').toLowerCase() + ' ' + ((cfg.muro.formas.find(f => f[0] === t.muroForma) || [0, ''])[1]).toLowerCase());
    if (cfg.rio) {
      const r = [];
      if (t.rioDe) r.push('de ' + DIR[t.rioDe].n.toLowerCase());
      if (t.rioPara) r.push(t.rioPara === 'lago' ? 'até um lago' : 'para ' + DIR[t.rioPara].n.toLowerCase());
      if (t.rioLarg && t.rioLarg !== 'rio') r.push(t.rioLarg === 'riacho' ? 'riacho' : 'rio largo');
      if (t.rioCurvas != null) r.push(t.rioCurvas <= 1 ? 'quase reto' : t.rioCurvas >= 8 ? 'bem sinuoso' : 'curvas ' + t.rioCurvas);
      if (t.afluente) r.push('com afluente');
      if (t.lago && t.rioPara !== 'lago') r.push('com lago');
      if (r.length) out.push('rio ' + r.join(', '));
    }
    if (cfg.praca && t.praca && t.praca !== 'centro') out.push(t.praca === 'rio' ? 'praça perto do rio' : 'praça perto de um portão');
    if (cfg.pontes && cfg.rio && t.pontes != null) out.push(t.pontes === 0 ? 'sem pontes' : t.pontes === 1 ? '1 ponte' : t.pontes + ' pontes');
    if (t.relevoNat) out.push('relevo natural');
    return out.length ? out.join(' · ') : 'automático (como sempre)';
  }
  // o texto de uma escolha de direções ("Norte e Leste"; "automático")
  const nomes = ids => { const n = lista(ids).map(id => DIR[id].n.toLowerCase()); return !n.length ? 'automático' : n.length === 1 ? n[0] : n.slice(0, -1).join(', ') + ' e ' + n[n.length - 1]; };

  return { DIRS, DIR, IDS, valida, lista, maisPerto, oposta, difAng, LARGURA, LARGURAS, naBorda, caminho, suave, arredondar, rioPlano, blob, agua, cruzamentos, cortar, muro, torresPor, cortarNoMar, noContorno,
    pecasDoAnel, cruza, ruido, manchas, contorno, aoLongo, distLinha, dentro, dentroDe, comprimento, rosa, nomes, CAMPOS, padrao, limpar, soMudadas, escolhas, rioDaRosa, secao, resumoDe };
})();
