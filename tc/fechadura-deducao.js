/* Tiny Cats · as fechaduras de dedução (lote 207, pedido do Dalmo): jogos de pensar, não de reflexo, para a fechadura do
   Escudo (tc/fechadura.js). Pensar é de graça: mexer nas peças não custa nada. O que custa é Testar (forçar o
   cilindro): o teste errado quebra uma gazua e faz barulho; nos níveis baixos ele mostra onde falhou.
     · Perfil da chave — a altura de cada pino (1 a 5), descoberta pelas pistas gravadas no mecanismo.
         Fácil: pistas diretas · Médio: comparar · Difícil: contas · Extremo: uma pista é falsa · Absoluto: pistas de
         "nenhum" (e a falsa).
     · Engrenagens — ligar a manivela ao cilindro com engrenagens (pequena, média, grande) nos eixos. Cada engrenagem
         inverte o giro; as que se encostam giram juntas, as que se sobrepõem batem.
         Fácil: o lado do giro · Médio: os três tamanhos e eixos de enganar · Difícil: 2 cilindros · Extremo: a
         engrenagem presa e o eixo duplo (frente e trás giram juntas; o cilindro pede as voltas) · Absoluto: a catraca.
   Esta parte é a conta pura (Node e navegador): gerar, conferir e escrever as pistas. A tela fica no fim. */
(() => {
  'use strict';
  const W = typeof window !== 'undefined' ? window : globalThis;
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sortear = (l, r) => l[Math.floor(r() * l.length)];
  const embaralhar = (l, r) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; };
  const ord = i => (i + 1) + 'º';

  /* ============================== Perfil da chave ============================== */
  const PF = Object.freeze({ pinos: [4, 5, 6, 7, 8], alt: 5,
    tipos: [['faixa', 'par', 'max', 'min', 'val'], ['cmp', 'cmp', 'cmp', 'faixa', 'par', 'max', 'min', 'val'], ['cmp', 'dif', 'soma', 'soma', 'par', 'faixa'],
      ['cmp', 'dif', 'soma', 'soma', 'par', 'faixa'], ['cmp', 'dif', 'soma', 'viz', 'nao', 'conta', 'conta', 'par']],
    falsa: [false, false, false, true, true], mostraCertos: [true, true, true, false, false] });
  const FAIXAS = [[1, 2], [4, 5], [2, 4], [1, 3], [3, 5]];
  const DIGITOS = new Map();
  function todos(N) {
    if (DIGITOS.has(N)) return DIGITOS.get(N);
    const tot = Math.pow(PF.alt, N), a = new Uint8Array(tot * N);
    for (let c = 0; c < tot; c++) { let x = c; for (let i = 0; i < N; i++) { a[c * N + i] = 1 + (x % PF.alt); x = Math.floor(x / PF.alt); } }
    DIGITOS.set(N, a);
    return a;
  }
  // a pista vale para as alturas g (uma função: pino → altura)?
  function vale(c, g, N) {
    switch (c.k) {
      case 'val': return g(c.i) === c.v;
      case 'faixa': { const v = g(c.i); return v >= c.a && v <= c.b; }
      case 'par': return g(c.i) % 2 === c.p;
      case 'max': case 'min': { const v = g(c.i); for (let j = 0; j < N; j++) if (j !== c.i && (c.k === 'max' ? g(j) >= v : g(j) <= v)) return false; return true; }
      case 'cmp': { const a = g(c.i), b = g(c.j); return c.op === '>' ? a > b : c.op === '<' ? a < b : a === b; }
      case 'dif': return g(c.i) - g(c.j) === c.d;
      case 'soma': { let s = 0; for (const i of c.is) s += g(i); return s === c.s; }
      case 'viz': { for (let i = 1; i < N; i++) if (g(i) === g(i - 1)) return false; return true; }
      case 'nao': { for (let i = 0; i < N; i++) if (g(i) === c.v) return false; return true; }
      case 'conta': { let n = 0; for (let i = 0; i < N; i++) if (g(i) === c.v) n++; return n === c.c; }
    }
    return false;
  }
  const NOME_VEZES = ['nenhuma vez', 'uma vez só', 'duas vezes', 'três vezes', 'quatro vezes'];
  function textoPista(c) {
    switch (c.k) {
      case 'val': return 'O ' + ord(c.i) + ' pino tem altura ' + c.v + '.';
      case 'faixa': return 'O ' + ord(c.i) + ' pino tem altura ' + (c.b - c.a === 1 ? c.a + ' ou ' + c.b : c.a + ', ' + (c.a + 1) + ' ou ' + c.b) + '.';
      case 'par': return 'A altura do ' + ord(c.i) + ' pino é ' + (c.p === 0 ? 'par' : 'ímpar') + '.';
      case 'max': return 'O ' + ord(c.i) + ' pino é o mais alto de todos (nenhum empata com ele).';
      case 'min': return 'O ' + ord(c.i) + ' pino é o mais baixo de todos (nenhum empata com ele).';
      case 'cmp': return c.op === '=' ? 'O ' + ord(c.i) + ' e o ' + ord(c.j) + ' pino têm a mesma altura.' : 'O ' + ord(c.i) + ' pino é mais ' + (c.op === '>' ? 'alto' : 'baixo') + ' que o ' + ord(c.j) + '.';
      case 'dif': return 'O ' + ord(c.i) + ' pino é ' + c.d + ' mais alto que o ' + ord(c.j) + '.';
      case 'soma': return (c.is.length === 2 ? 'O ' + ord(c.is[0]) + ' e o ' + ord(c.is[1]) : 'O ' + ord(c.is[0]) + ', o ' + ord(c.is[1]) + ' e o ' + ord(c.is[2])) + ' pino somam ' + c.s + '.';
      case 'viz': return 'Nenhum pino tem a mesma altura do vizinho.';
      case 'nao': return 'Nenhum pino tem altura ' + c.v + '.';
      case 'conta': return c.c === 0 ? 'A altura ' + c.v + ' não aparece em nenhum pino.' : 'A altura ' + c.v + ' aparece ' + NOME_VEZES[c.c] + '.';
    }
    return '';
  }
  // uma pista do tipo k, verdadeira (ou falsa) para a solução sol
  function pistaDe(k, sol, verdade, r) {
    const N = sol.length, g = i => sol[i], i = Math.floor(r() * N);
    let j = Math.floor(r() * (N - 1)); if (j >= i) j++;
    let c = null;
    if (k === 'val') c = { k, i, v: sol[i] };
    else if (k === 'faixa') { const ok = FAIXAS.filter(f => (sol[i] >= f[0] && sol[i] <= f[1]) === verdade); if (!ok.length) return null; const f = sortear(ok, r); return { k, i, a: f[0], b: f[1] }; }
    else if (k === 'par') c = { k, i, p: sol[i] % 2 };
    else if (k === 'max' || k === 'min') c = { k, i };
    else if (k === 'cmp') c = { k, i, j, op: sol[i] > sol[j] ? '>' : sol[i] < sol[j] ? '<' : '=' };
    else if (k === 'dif') { if (sol[i] === sol[j]) return null; const [a, b] = sol[i] > sol[j] ? [i, j] : [j, i]; c = { k, i: a, j: b, d: sol[a] - sol[b] }; }
    else if (k === 'soma') { const qt = N >= 6 && r() < 0.5 ? 3 : 2; const is = embaralhar([...Array(N).keys()], r).slice(0, qt).sort((a, b) => a - b); c = { k, is, s: is.reduce((s, x) => s + sol[x], 0) }; }
    else if (k === 'viz') c = { k };
    else if (k === 'nao') { const fora = [1, 2, 3, 4, 5].filter(v => !sol.includes(v) === verdade); if (!fora.length) return null; return { k, v: sortear(fora, r) }; }
    else if (k === 'conta') { const v = 1 + Math.floor(r() * PF.alt); c = { k, v, c: sol.filter(x => x === v).length }; }
    if (!c) return null;
    if (!verdade) {
      // a mentira: muda o número, inverte a comparação
      if (k === 'val') c.v = 1 + ((c.v - 1 + 1 + Math.floor(r() * 4)) % 5);
      else if (k === 'par') c.p = 1 - c.p;
      else if (k === 'cmp') c.op = sortear(['>', '<', '='].filter(o => o !== c.op), r);
      else if (k === 'dif') c.d = c.d + (c.d > 1 && r() < 0.5 ? -1 : 1);
      else if (k === 'soma') c.s = c.s + (r() < 0.5 ? -1 : 1);
      else if (k === 'conta') c.c = c.c === 0 ? 1 : c.c + (r() < 0.5 ? -1 : 1);
    }
    const ok = vale(c, g, N);
    if (ok !== verdade) return null;
    if (k === 'conta' && (c.c < 0 || c.c > 4)) return null;
    return c;
  }
  // a chave: a solução e as pistas (o bastante para uma solução só)
  function gerarPerfil(r, n) {
    for (let volta = 0; volta < 40; volta++) {
      const x = tentarPerfil(r, n);
      if (x) return x;
    }
    // (não deve acontecer) o último recurso: as alturas, uma a uma
    const N = PF.pinos[n], sol = Array.from({ length: N }, () => 1 + Math.floor(r() * PF.alt));
    return { pub: { pinos: N, pistas: sol.map((v, i) => ({ k: 'val', i, v })), falsa: false }, sol };
  }
  function tentarPerfil(r, n) {
    const N = PF.pinos[n], A = todos(N), tot = A.length / N, tipos = PF.tipos[n];
    const sol = Array.from({ length: N }, () => 1 + Math.floor(r() * PF.alt));
    if (n >= 4 && sol.every((v, i) => i === 0 || v !== sol[i - 1]) === false && r() < 0.3) { /* (às vezes o "nenhum vizinho" não cabe; tudo bem) */ }
    const gDe = c => i => A[c * N + i];
    let vivos = Int32Array.from({ length: tot }, (_, c) => c);
    const pistas = [];
    let vals = 0;
    for (let t = 0; t < 600 && vivos.length > 1; t++) {
      const k = sortear(tipos, r);
      if (k === 'val' && (vals >= 1 || vivos.length < 6)) continue;
      const c = pistaDe(k, sol, true, r);
      if (!c || pistas.some(p => JSON.stringify(p) === JSON.stringify(c))) continue;
      const fica = vivos.filter(x => vale(c, gDe(x), N));
      if (fica.length >= vivos.length) continue;
      // (Fácil e Médio) a pista não pode fechar sozinha mais da metade do caminho logo de cara
      vivos = fica; pistas.push(c); if (k === 'val') vals++;
    }
    if (vivos.length !== 1) return null;
    let falsa = false;
    if (PF.falsa[n]) {
      // a pista falsa: só uma. Toda outra combinação precisa ter pelo menos duas pistas erradas.
      let f = null;
      for (let t = 0; t < 200 && !f; t++) f = pistaDe(sortear(tipos.filter(k => k !== 'viz'), r), sol, false, r);
      if (!f) return null;
      const erradas = new Uint8Array(tot);
      for (let x = 0; x < tot; x++) { const g = gDe(x); let e = 0; for (const p of pistas) if (!vale(p, g, N)) { e++; if (e > 1) break; } if (!vale(f, g, N)) e++; erradas[x] = Math.min(e, 3); }
      let uma = [];
      for (let x = 0; x < tot; x++) if (erradas[x] === 1) uma.push(x);
      pistas.push(f);
      for (let t = 0; t < 800 && uma.length > 1; t++) {
        const c = pistaDe(sortear(tipos, r), sol, true, r);
        if (!c || pistas.some(p => JSON.stringify(p) === JSON.stringify(c))) continue;
        const fica = uma.filter(x => vale(c, gDe(x), N));
        if (fica.length >= uma.length) continue;
        uma = fica; pistas.push(c);
      }
      if (uma.length !== 1) return null;
      falsa = true;
    }
    if (pistas.length > 16) return null;
    return { pub: { pinos: N, pistas: embaralhar(pistas, r), falsa }, sol };
  }
  // o teste: → { ok, certos, texto }
  function conferirPerfil(pub, sol, alturas, n) {
    const N = pub.pinos, a = Array.isArray(alturas) ? alturas : [];
    let certos = 0;
    for (let i = 0; i < N; i++) if (a[i] === sol[i]) certos++;
    if (certos === N) return { ok: true, certos, texto: 'Abriu!' };
    return { ok: false, certos, texto: PF.mostraCertos[n] ? 'Não abriu: ' + certos + ' de ' + N + ' pinos na altura certa.' : 'Não abriu.' };
  }

  /* ============================== Engrenagens ============================== */
  const RAIO = Object.freeze({ p: 1, m: 1.5, g: 2 });
  const NOME_TAM = Object.freeze({ p: 'pequena', m: 'média', g: 'grande' });
  const EG = Object.freeze({ W: [12, 13, 14, 16, 17], H: [8, 8, 9, 10, 10], eps: 0.06, folga: 0.5,
    tam: [['p', 'g'], ['p', 'm', 'g'], ['p', 'm', 'g'], ['p', 'm', 'g'], ['p', 'm', 'g']],
    meio: [2, 3, 3, 4, 4], meio2: [0, 0, 2, 2, 3], iscas: [1, 3, 3, 4, 5], cil: [1, 1, 2, 2, 2],
    presa: [0, 0, 0, 1, 1], duplo: [false, false, false, true, true], catraca: [false, false, false, false, true], diz: [true, true, true, false, false] });
  const R3 = v => Math.round(v * 1000) / 1000;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  /* As engrenagens de uma montagem: as fixas (manivela, cilindros, presa, catraca) e as postas (pos: { eixo: [frente, trás] }). */
  function engrenagens(pub, pos) {
    const gs = [];
    for (const e of pub.eixos) {
      if (e.f) gs.push({ e: e.id, x: e.x, y: e.y, c: e.f.c || 0, r: e.f.r, t: e.f.t, quer: e.f.quer || null });
      const p = ehObj(pos) && Array.isArray(pos[e.id]) ? pos[e.id] : [];
      /* (Extremo e Absoluto) os eixos são compridos: a engrenagem vai na frente ou atrás. Só o eixo duplo leva as duas,
         que giram juntas; o eixo comum leva uma só (a da frente, se vierem as duas). */
      const camadas = e.duplo ? [0, 1] : [p[0] ? 0 : 1];
      for (const c of camadas) {
        if (e.f) continue;
        const s = p[c];
        if (s && RAIO[s]) gs.push({ e: e.id, x: e.x, y: e.y, c, r: RAIO[s], t: 'livre', s });
      }
    }
    return gs;
  }
  // a engrenagem g bate em alguma outra (da mesma camada)?
  const bateEm = (gs, g) => gs.find(o => o !== g && o.e !== g.e && o.c === g.c && dist(o, g) < o.r + g.r - EG.eps) || null;
  const encosta = (a, b) => a.e !== b.e && a.c === b.c && Math.abs(dist(a, b) - (a.r + b.r)) <= EG.eps;
  /* Girar a manivela (uma volta, no sentido do relógio): → { ok, motivo, w (o giro de cada engrenagem: + horário;
     o número é quantas voltas ela dá), gs, onde }. motivo: bate · trava · presa · catraca · parado · lado · voltas */
  function girar(pub, pos) {
    const gs = engrenagens(pub, pos), w = new Array(gs.length).fill(null);
    for (const g of gs) { const b = bateEm(gs, g); if (b) return { ok: false, motivo: 'bate', w, gs, onde: [gs.indexOf(g), gs.indexOf(b)] }; }
    const m = gs.findIndex(g => g.t === 'manivela');
    w[m] = 1;
    const fila = [m];
    let pane = null;
    while (fila.length && !pane) {
      const a = fila.shift(), ga = gs[a];
      for (let b = 0; b < gs.length && !pane; b++) {
        if (b === a) continue;
        const gb = gs[b];
        let wb = null;
        if (gb.e === ga.e && gb.c !== ga.c) wb = w[a];
        else if (encosta(ga, gb)) wb = -w[a] * ga.r / gb.r;
        if (wb == null) continue;
        if (gb.t === 'presa') { pane = { motivo: 'presa', onde: [b] }; break; }
        if (w[b] == null) { w[b] = wb; fila.push(b); if (gb.t === 'catraca' && wb < 0) pane = { motivo: 'catraca', onde: [b] }; }
        else if (Math.abs(w[b] - wb) > 1e-6) pane = { motivo: 'trava', onde: [a, b] };
      }
    }
    if (pane) return Object.assign({ ok: false, w, gs }, pane);
    for (let i = 0; i < gs.length; i++) {
      const g = gs[i];
      if (g.t !== 'cilindro') continue;
      if (w[i] == null) return { ok: false, motivo: 'parado', w, gs, onde: [i] };
      if (Math.sign(w[i]) !== g.quer.d) return { ok: false, motivo: 'lado', w, gs, onde: [i] };
      if (g.quer.v && Math.abs(Math.abs(w[i]) - g.quer.v) > 0.01) return { ok: false, motivo: 'voltas', w, gs, onde: [i] };
    }
    return { ok: true, motivo: null, w, gs, onde: [] };
  }
  const MOTIVOS = { bate: 'Duas engrenagens batem uma na outra.', trava: 'Travou: duas engrenagens querem girar para lados contrários.', presa: 'Travou: a engrenagem enferrujada não gira.',
    catraca: 'Travou: a catraca não gira para trás.', parado: 'Um cilindro nem se mexeu.', lado: 'Um cilindro girou para o lado errado.', voltas: 'Um cilindro girou, mas não as voltas certas.' };
  function conferirEngr(pub, sol, pos, n) {
    const g = girar(pub, pos);
    if (g.ok) return Object.assign({ texto: 'Abriu!' }, g);
    return Object.assign({ texto: EG.diz[n] ? 'Não abriu. ' + MOTIVOS[g.motivo] : 'Não abriu.' }, g);
  }
  // voltas → texto ("1 volta", "meia volta", "2/3 de volta", "1 e 1/2 volta")
  function fracao(v) {
    let melhor = [Math.round(v), 1], erro = Math.abs(v - Math.round(v));
    for (let q = 2; q <= 8; q++) { const p = Math.round(v * q), e = Math.abs(v - p / q); if (e < erro - 1e-9) { melhor = [p, q]; erro = e; } }
    let [p, q] = melhor; const mdc = (a, b) => (b ? mdc(b, a % b) : a), d = mdc(p, q); p /= d; q /= d;
    if (q === 1) return p + (p === 1 ? ' volta' : ' voltas');
    if (p === 1 && q === 2) return 'meia volta';
    const int = Math.floor(p / q), rest = p - int * q;
    return (int ? int + ' e ' : '') + rest + '/' + q + (int ? ' volta' + (int > 1 ? 's' : '') : ' de volta');
  }
  // as voltas, curtinhas (no desenho): 1, 2, ½, 1½, ⅔, 1⅓…
  const GLIFO = { '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾', '1/5': '⅕', '2/5': '⅖', '3/5': '⅗', '4/5': '⅘', '1/6': '⅙', '5/6': '⅚', '1/8': '⅛', '3/8': '⅜', '5/8': '⅝', '7/8': '⅞' };
  function curta(v) {
    const t = fracao(v);
    if (t === 'meia volta') return '½';
    const m = /^(?:(\d+) e )?(\d+)\/(\d+)/.exec(t);
    if (m) { const f = m[2] + '/' + m[3]; return (m[1] || '') + (GLIFO[f] || (m[1] ? ' ' : '') + f); }
    return String(parseInt(t, 10));
  }
  const textoQuer = q => (q.d > 0 ? 'para a direita (como o relógio)' : 'para a esquerda (contra o relógio)') + (q.v ? ', ' + fracao(q.v) : '');

  function gerarEngr(r, n) {
    for (let volta = 0; volta < 2000; volta++) { const x = tentarEngr(r, n); if (x) return x; }
    throw new Error('Engrenagens: não consegui montar');
  }
  function tentarEngr(r, n) {
    const LW = EG.W[n], LH = EG.H[n], tams = EG.tam[n];
    const eixos = [], sol = {}, gs = [];             // gs: as engrenagens da solução (para as folgas)
    let id = 0;
    const novoEixo = (x, y, extra) => { const e = Object.assign({ id: 'e' + (id++), x: R3(x), y: R3(y) }, extra || {}); eixos.push(e); return e; };
    const cabe = (x, y, rr, c, pai, todas) => {
      if (x < rr + 0.25 || x > LW - rr - 0.25 || y < rr + 0.25 || y > LH - rr - 0.25) return false;
      for (const e of eixos) if (Math.hypot(e.x - x, e.y - y) < 1.95) return false;
      // (o cilindro não fica por cima de nada, nem de outra camada: senão não dá para ver)
      for (const g of gs) if (g !== pai && (g.c === c || todas) && Math.hypot(g.x - x, g.y - y) < g.r + rr + EG.folga) return false;
      return true;
    };
    const m0 = novoEixo(1.9, 2.5 + r() * (LH - 5), { f: { t: 'manivela', r: 1.5, c: 0 } });
    const gm = { e: m0.id, x: m0.x, y: m0.y, c: 0, r: 1.5 }; gs.push(gm);
    // um passo: a partir da engrenagem g, uma nova de raio rr, num ângulo; → a engrenagem nova (sem eixo ainda) ou null
    const passo = (g, rr, angs, todas) => {
      for (const a of embaralhar(angs, r)) {
        const d = g.r + rr, x = g.x + d * Math.cos(a * Math.PI / 180), y = g.y + d * Math.sin(a * Math.PI / 180);
        if (cabe(x, y, rr, g.c, g, todas)) return { x: R3(x), y: R3(y), r: rr, c: g.c };
      }
      return null;
    };
    const frente = [...Array(13).keys()].map(k => -90 + k * 15), todosAng = [...Array(24).keys()].map(k => k * 15);
    const cadeia = (ini, meio, angs, comDuplo) => {
      let g = ini;
      const meioDuplo = comDuplo ? Math.floor(meio / 2) : -1;
      for (let k = 0; k < meio; k++) {
        const s = sortear(tams, r), ng = passo(g, RAIO[s], angs);
        if (!ng) return null;
        const e = novoEixo(ng.x, ng.y, k === meioDuplo ? { duplo: 1 } : null);
        ng.e = e.id; ng.s = s; gs.push(ng);
        sol[e.id] = [null, null]; sol[e.id][ng.c] = s;
        g = ng;
        if (k === meioDuplo) {
          // o eixo duplo: atrás, outra engrenagem (de outro tamanho), e a cadeia segue na camada de trás
          const s2 = sortear(tams.filter(t => t !== s), r), g2 = { e: e.id, x: ng.x, y: ng.y, r: RAIO[s2], c: 1, s: s2 };
          if (!cabe2(g2)) return null;
          gs.push(g2); sol[e.id][1] = s2; g = g2;
        }
      }
      // o cilindro, no fim
      const ng = passo(g, 1.5, angs, true);
      if (!ng) return null;
      const e = novoEixo(ng.x, ng.y, { f: { t: 'cilindro', r: 1.5, c: ng.c } });
      ng.e = e.id; gs.push(ng);
      return e;
    };
    function cabe2(g2) { for (const g of gs) if (g.c === 1 && Math.hypot(g.x - g2.x, g.y - g2.y) < g.r + g2.r + EG.folga) return false; return true; }
    const c1 = cadeia(gm, EG.meio[n], frente, EG.duplo[n]);
    if (!c1) return null;
    if (EG.cil[n] > 1) {
      const livres = gs.filter(g => g.s && g.c === 0);
      if (!livres.length) return null;
      const c2 = cadeia(sortear(livres, r), EG.meio2[n], todosAng, false);
      if (!c2) return null;
    }
    // o que os cilindros querem: o que a solução dá
    const pos0 = {}; for (const k of Object.keys(sol)) pos0[k] = sol[k].slice();
    // (girar com um "quer" provisório: o que vale é o giro de cada cilindro)
    for (const e of eixos) if (e.f && e.f.t === 'cilindro') e.f.quer = { d: 1 };
    let gg = girar({ eixos }, pos0);
    if (gg.motivo === 'bate' || gg.motivo === 'trava' || gg.motivo === 'parado') return null;
    const cils = gg.gs.map((g, i) => [g, i]).filter(([g]) => g.t === 'cilindro');
    for (const [, i] of cils) {
      const w = gg.w[i];
      if (w == null) return null;
      const e = eixos.find(x => x.id === gg.gs[i].e);
      e.f.quer = { d: Math.sign(w) };
      if (EG.duplo[n]) { if (Math.abs(Math.abs(w) - 1) < 0.01 && e.f.c === 1) return null; e.f.quer.v = R3(Math.abs(w)); }
    }
    gg = girar({ eixos }, pos0);
    if (!gg.ok) return null;
    // a catraca: uma engrenagem do caminho que gira para a direita vira fixa e só gira para a direita
    if (EG.catraca[n]) {
      const cand = gg.gs.map((g, i) => [g, i]).filter(([g, i]) => g.t === 'livre' && g.c === 0 && gg.w[i] > 0 && !eixos.find(e => e.id === g.e).duplo);
      if (!cand.length) return null;
      const [g] = sortear(cand, r), e = eixos.find(x => x.id === g.e);
      e.f = { t: 'catraca', r: g.r, c: 0 }; delete sol[e.id];
    }
    // as iscas: eixos vazios onde uma engrenagem encostaria numa da solução (caminhos de enganar)
    const livresSol = () => gs.filter(g => g.s);
    for (let k = 0, t = 0; k < EG.iscas[n] && t < 200; t++) {
      const g = sortear(livresSol().concat([gm]), r), rr = RAIO[sortear(tams, r)];
      const a = sortear(todosAng, r) * Math.PI / 180, d = g.r + rr, x = g.x + d * Math.cos(a), y = g.y + d * Math.sin(a);
      if (x < rr + 0.25 || x > LW - rr - 0.25 || y < rr + 0.25 || y > LH - rr - 0.25) continue;
      if (eixos.some(e => Math.hypot(e.x - x, e.y - y) < 1.95)) continue;
      novoEixo(x, y); k++;
    }
    // a engrenagem presa (enferrujada): perto de uma do caminho, sem encostar na solução
    let presas = 0;
    for (let k = 0, t = 0; k < EG.presa[n] && t < 200; t++) {
      const g = sortear(livresSol().filter(x => x.c === 0), r);
      if (!g) break;
      const a = sortear(todosAng, r) * Math.PI / 180, d = g.r + 1 + 0.5, x = g.x + d * Math.cos(a), y = g.y + d * Math.sin(a);
      if (x < 1.25 || x > LW - 1.25 || y < 1.25 || y > LH - 1.25) continue;
      if (eixos.some(e => Math.hypot(e.x - x, e.y - y) < 1.95)) continue;
      if (gs.some(o => o.c === 0 && Math.hypot(o.x - x, o.y - y) < o.r + 1 + 0.3)) continue;
      novoEixo(x, y, { f: { t: 'presa', r: 1, c: 0 } }); k++; presas++;
    }
    if (presas < EG.presa[n]) return null;
    if (!girar({ eixos }, pos0).ok) return null;
    // a ordem dos eixos não pode entregar o caminho
    const ordem = embaralhar(eixos.filter(e => !e.f || e.f.t !== 'manivela'), r);
    const final = [eixos.find(e => e.f && e.f.t === 'manivela')].concat(ordem);
    const ren = new Map(final.map((e, i) => [e.id, 'e' + i]));
    const eixosPub = final.map(e => Object.assign({}, e, { id: ren.get(e.id) }));
    const solPub = {}; for (const k of Object.keys(sol)) solPub[ren.get(k)] = sol[k];
    return { pub: { W: LW, H: LH, tam: tams.slice(), atras: EG.duplo[n], eixos: eixosPub }, sol: solPub };
  }

  /* ============================== registro ============================== */
  const JOGOS = {
    perfil: { nome: 'Perfil da chave', gerar: gerarPerfil, conferir: conferirPerfil,
      resposta: (pub, sol) => 'alturas ' + sol.join('-') + (pub.falsa ? ' · a pista falsa: ' + textoPista(pub.pistas.find(c => !vale(c, i => sol[i], pub.pinos))) : '') },
    engrenagens: { nome: 'Engrenagens', gerar: gerarEngr, conferir: conferirEngr,
      resposta: (pub, sol) => Object.keys(sol).map(k => k + ': ' + sol[k].map(s => (s ? NOME_TAM[s] : '—')).join(' / ')).join(' · ') }
  };
  const api = { JOGOS, PF, EG, RAIO, NOME_TAM, MOTIVOS, vale, textoPista, girar, engrenagens, bateEm, encosta, fracao, curta, textoQuer, gerarPerfil, gerarEngr, conferirPerfil, conferirEngr };
  W.TC = W.TC || {}; W.TC.fechDeducao = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  /* ============================== as telas (navegador) ==============================
     Cada tela recebe cx: { palco, pub() (o jogo), n() (o nível), sol() (a solução, para as pistas da aptidão), fixos()
     (quantas peças a aptidão já põe certas), fechado() (aberta, falhou ou só olhando), testar(tentativa) → o resultado
     (ou null), msg(txt), mudou() (para guardar e mandar ao vivo), semente, guardado (o que estava guardado) }
     e devolve { atualizar(), passo(dt), vivo(), verVivo(d), ajuda, botoes() }. */
  if (typeof document === 'undefined') return;
  const NS = 'http://www.w3.org/2000/svg';
  const sv = (tag, a) => { const el = document.createElementNS(NS, tag); for (const k in a || {}) el.setAttribute(k, a[k]); return el; };
  const el = (tag, a, ...kids) => { const e = document.createElement(tag); for (const k in a || {}) { if (k.startsWith('on')) e[k] = a[k]; else if (k === 'text') e.textContent = a[k]; else e.setAttribute(k, a[k]); } for (const x of kids) if (x != null) e.append(x); return e; };
  function rngDe(txt) { let h = 0; for (const ch of String(txt)) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0; let a = h ^ 0x9e3779b9; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------------- Perfil da chave ----------------
  function telaPerfil(cx) {
    const P = cx.pub(), N = P.pinos, sol = cx.sol() || [];
    const st = { a: new Array(N).fill(0), x: {}, risca: {} };
    const g0 = cx.guardado;
    if (g0 && Array.isArray(g0.a) && g0.a.length === N) { st.a = g0.a.map(v => (Number.isInteger(v) && v >= 0 && v <= 5 ? v : 0)); st.x = ehObj(g0.x) ? g0.x : {}; st.risca = ehObj(g0.r) ? g0.r : {}; }
    // a aptidão (pista): alguns pinos já certos, sempre os mesmos para esta fechadura
    const travados = new Set(embaralhar([...Array(N).keys()], rngDe(cx.semente + ':pf')).slice(0, Math.min(N - 1, cx.fixos())));
    for (const i of travados) if (sol[i]) st.a[i] = sol[i];
    const raiz = el('div', { class: 'fpf' });
    const grade = el('div', { class: 'fpf-grade', style: 'grid-template-columns: 26px repeat(' + N + ', 1fr)' });
    const lista = el('ol', { class: 'fpf-pistas' });
    const aviso = P.falsa ? el('p', { class: 'fpf-falsa', text: 'Cuidado: uma destas pistas é falsa (só uma).' }) : null;
    raiz.append(...[grade, aviso, lista].filter(Boolean));
    cx.palco.classList.add('larga');
    cx.palco.append(raiz);
    const celulas = [];
    grade.append(el('span', { class: 'fpf-num' }));
    for (let i = 0; i < N; i++) grade.append(el('span', { class: 'fpf-num', text: ord(i) }));
    for (let h = PF.alt; h >= 1; h--) {
      grade.append(el('span', { class: 'fpf-alt', text: String(h) }));
      for (let i = 0; i < N; i++) {
        const b = el('button', { type: 'button', class: 'fpf-c', 'aria-label': ord(i) + ' pino, altura ' + h,
          onclick: () => { if (cx.fechado() || travados.has(i)) return; st.a[i] = st.a[i] === h ? 0 : h; delete st.x[i + ':' + h]; cx.mudou(); pintar(); },
          oncontextmenu: ev => { ev.preventDefault(); if (cx.fechado() || travados.has(i)) return; const k = i + ':' + h; if (st.x[k]) delete st.x[k]; else st.x[k] = 1; cx.mudou(); pintar(); } });
        celulas.push({ b, i, h });
        grade.append(b);
      }
    }
    const lis = P.pistas.map((c, k) => { const li = el('li', { text: textoPista(c), tabindex: '0', onclick: () => { if (st.risca[k]) delete st.risca[k]; else st.risca[k] = 1; cx.mudou(); pintar(); } }); lista.append(li); return li; });
    function pintar() {
      for (const { b, i, h } of celulas) {
        b.classList.toggle('cheio', st.a[i] >= h);
        b.classList.toggle('topo', st.a[i] === h);
        b.classList.toggle('x', !!st.x[i + ':' + h] && st.a[i] < h);
        b.classList.toggle('travado', travados.has(i));
        b.disabled = cx.fechado();
      }
      lis.forEach((li, k) => li.classList.toggle('riscada', !!st.risca[k]));
    }
    pintar();
    return {
      atualizar: pintar, passo() {},
      vivo: () => ({ a: st.a.slice(), x: st.x, r: st.risca }),
      verVivo(d) { if (d && Array.isArray(d.a) && d.a.length === N) { st.a = d.a.slice(); st.x = ehObj(d.x) ? d.x : {}; st.risca = ehObj(d.r) ? d.r : {}; pintar(); } },
      ajuda: 'Clique numa casa para pôr a altura daquele pino (clique de novo para tirar). O botão direito marca um X, para anotar o que não pode ser. Clique numa pista para riscar. Pensar é de graça: só o teste errado quebra a gazua.',
      botoes: () => {
        const b = el('button', { type: 'button', class: 'btn pri', 'data-k': 'fch:testar', onclick: () => {
          if (st.a.some(v => !v)) { cx.msg('Ponha a altura de todos os pinos antes de testar.'); return; }
          cx.testar(st.a.slice(), 0);
        } }, 'Testar a chave');
        if (cx.fechado()) b.disabled = true;
        return [b];
      }
    };
  }

  // ---------------- Engrenagens ----------------
  function dentes(r) {
    const n = Math.max(8, Math.round(r * 9)), fora = r + 0.14, dentro = r - 0.14, pts = [];
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * 2 * Math.PI, a1 = ((k + 0.25) / n) * 2 * Math.PI, a2 = ((k + 0.5) / n) * 2 * Math.PI, a3 = ((k + 0.75) / n) * 2 * Math.PI;
      pts.push([dentro, a0], [fora, a1], [fora, a2], [dentro, a3]);
    }
    return 'M' + pts.map(([rr, a]) => R3(rr * Math.cos(a)) + ' ' + R3(rr * Math.sin(a))).join('L') + 'Z';
  }
  function telaEngr(cx) {
    const P = cx.pub(), sol = cx.sol() || {};
    const st = { pos: {}, cam: 0, anim: null };
    const g0 = cx.guardado;
    if (g0 && ehObj(g0.p)) for (const e of P.eixos) { const v = g0.p[e.id]; if (Array.isArray(v)) st.pos[e.id] = [RAIO[v[0]] ? v[0] : null, RAIO[v[1]] ? v[1] : null]; }
    // a aptidão (pista): algumas engrenagens da solução já no lugar (e presas)
    const livresSol = Object.keys(sol).filter(k => P.eixos.some(e => e.id === k && !e.f));
    const travados = new Set(embaralhar(livresSol.sort(), rngDe(cx.semente + ':eg')).slice(0, Math.min(Math.max(0, livresSol.length - 1), cx.fixos())));
    for (const k of travados) st.pos[k] = sol[k].slice();
    const cils = P.eixos.filter(e => e.f && e.f.t === 'cilindro');
    const letra = e => String.fromCharCode(65 + cils.indexOf(e));
    cx.palco.classList.add('larga');
    const svg = sv('svg', { viewBox: '0 0 ' + P.W + ' ' + P.H, class: 'feg-svg' });
    const camada = sv('g'), topo = sv('g');
    svg.append(sv('rect', { x: 0, y: 0, width: P.W, height: P.H, rx: 0.4, class: 'feg-fundo' }), camada, topo);
    const legenda = el('ul', { class: 'feg-leg' });
    for (const e of cils) legenda.append(el('li', { text: 'Cilindro ' + letra(e) + ': gira ' + textoQuer(e.f.quer) + (P.atras ? (e.f.c ? ' (atrás)' : ' (na frente)') : '') + '.' }));
    if (P.eixos.some(e => e.f && e.f.t === 'presa')) legenda.append(el('li', { text: 'A engrenagem enferrujada (vermelha) não gira: se encostar nela, trava tudo.' }));
    if (P.eixos.some(e => e.f && e.f.t === 'catraca')) legenda.append(el('li', { text: 'A catraca (com a seta) só gira para a direita.' }));
    if (P.atras) legenda.append(el('li', { text: 'Cada eixo leva uma engrenagem, na frente ou atrás. O eixo duplo (dois anéis) leva as duas, e elas giram juntas. Só encostam as da mesma camada.' }));
    legenda.append(el('li', { text: 'Tamanhos: ' + P.tam.map(t => NOME_TAM[t]).join(', ') + '. Encostadas, uma gira ao contrário da outra; a menor gira mais rápido.' }));
    cx.palco.append(svg, legenda);
    const eixoDe = id => P.eixos.find(e => e.id === id);
    function posAtual() { const o = {}; for (const k of Object.keys(st.pos)) o[k] = st.pos[k].slice(); return o; }
    function desenhar(gs, ang, marca) {
      camada.replaceChildren(); topo.replaceChildren();
      const ordem = gs.map((g, i) => i).sort((a, b) => gs[b].c - gs[a].c);     // a camada de trás embaixo
      for (const i of ordem) {
        const g = gs[i], gr = sv('g', { transform: 'translate(' + g.x + ' ' + g.y + ') rotate(' + ((ang && ang[i]) || 0) + ')' });
        const cls = 'feg-g feg-' + g.t + (g.c ? ' atras' : '') + (P.atras && g.c !== st.cam ? ' outra' : '') + (marca && marca.includes(i) ? ' mal' : '') + (g.t === 'livre' && travados.has(g.e) ? ' travada' : '');
        gr.append(sv('path', { d: dentes(g.r), class: cls }));
        gr.append(sv('circle', { r: Math.max(0.22, g.r * 0.32), class: 'feg-cubo' }));
        if (g.t === 'manivela') gr.append(sv('line', { x1: 0, y1: 0, x2: 0, y2: -g.r * 0.85, class: 'feg-manivela' }), sv('circle', { cx: 0, cy: -g.r * 0.85, r: 0.18, class: 'feg-punho' }));
        if (g.t === 'cilindro') gr.append(sv('path', { d: 'M-0.12 -0.45 h0.24 v0.3 h0.14 v0.25 h-0.52 v-0.25 h0.14z', class: 'feg-buraco' }));
        if (g.t === 'catraca') gr.append(sv('path', { d: 'M0.35 -0.35 A0.5 0.5 0 1 1 -0.35 -0.35', class: 'feg-seta' }), sv('path', { d: 'M-0.35 -0.35 l0.05 0.22 l0.16 -0.16z', class: 'feg-seta-p' }));
        camada.append(gr);
        if (g.t === 'cilindro') {
          // o lado que ele precisa girar: uma seta em arco, por cima do buraco; embaixo, a letra e as voltas
          const e = eixoDe(g.e), d = e.f.quer.d, rr = 0.95, a0 = -150 * Math.PI / 180, a1 = -30 * Math.PI / 180;
          const [ini, fim] = d > 0 ? [a0, a1] : [a1, a0], P2 = a => [R3(g.x + rr * Math.cos(a)), R3(g.y + rr * Math.sin(a))];
          const [x0, y0] = P2(ini), [x1, y1] = P2(fim), tg = d > 0 ? fim + Math.PI / 2 : fim - Math.PI / 2;
          const pta = [x1 + 0.26 * Math.cos(tg), y1 + 0.26 * Math.sin(tg)], esq = [x1 + 0.17 * Math.cos(tg + 2.2), y1 + 0.17 * Math.sin(tg + 2.2)], dir = [x1 + 0.17 * Math.cos(tg - 2.2), y1 + 0.17 * Math.sin(tg - 2.2)];
          topo.append(sv('path', { d: 'M' + x0 + ' ' + y0 + ' A' + rr + ' ' + rr + ' 0 0 ' + (d > 0 ? 1 : 0) + ' ' + x1 + ' ' + y1, class: 'feg-quer' }),
            sv('path', { d: 'M' + pta.map(R3).join(' ') + 'L' + esq.map(R3).join(' ') + 'L' + dir.map(R3).join(' ') + 'Z', class: 'feg-quer-p' }));
          topo.append(Object.assign(sv('text', { x: g.x, y: g.y + 0.98, class: 'feg-rot' }), { textContent: letra(e) + (e.f.quer.v ? ' · ' + curta(e.f.quer.v) : '') }));
        }
      }
      for (const e of P.eixos) {
        if (e.f) continue;
        const ge = sv('g', { class: 'feg-eixo' + (e.duplo ? ' duplo' : '') + (travados.has(e.id) ? ' travado' : ''), 'data-e': e.id });
        ge.append(sv('circle', { cx: e.x, cy: e.y, r: 0.7, class: 'feg-alvo' }), sv('circle', { cx: e.x, cy: e.y, r: 0.16, class: 'feg-pino' }));
        if (e.duplo) ge.append(sv('circle', { cx: e.x, cy: e.y, r: 0.3, class: 'feg-anel' }));
        topo.append(ge);
      }
    }
    function pintar() { if (!st.anim) desenhar(engrenagens(P, st.pos), null, null); }
    function trocar(e, tirar) {
      if (cx.fechado() || st.anim) return;
      if (travados.has(e.id)) { cx.msg('Essa já está certa (a sua aptidão).'); return; }
      const c = P.atras ? st.cam : 0, atual = (st.pos[e.id] || [null, null]).slice();
      if (!e.duplo && P.atras && atual[1 - c]) atual[1 - c] = null;       // (eixo comum: uma engrenagem só, a camada é a de agora)
      if (tirar) { atual[c] = null; st.pos[e.id] = atual; cx.mudou(); pintar(); return; }
      const opcoes = [null].concat(P.tam), i0 = opcoes.indexOf(atual[c]);
      let pulou = false;
      for (let k = 1; k <= opcoes.length; k++) {
        const s = opcoes[(i0 + k) % opcoes.length];
        const teste = Object.assign({}, st.pos, { [e.id]: Object.assign(atual.slice(), { [c]: s }) });
        if (s) { const gs = engrenagens(P, teste), g = gs.find(x => x.e === e.id && x.c === c); if (g && bateEm(gs, g)) { pulou = true; continue; } }
        st.pos[e.id] = Object.assign(atual.slice(), { [c]: s });
        if (!s && pulou && k === opcoes.length - i0) cx.msg('Não cabe nenhuma maior aí: bateria na vizinha.');
        else if (pulou) cx.msg('A ' + NOME_TAM[opcoes[(i0 + k - 1 + opcoes.length) % opcoes.length]] + ' não cabe aí.');
        else cx.msg('');
        break;
      }
      cx.mudou(); pintar();
    }
    const eixoNoPonto = ev => {
      const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      const m = svg.getScreenCTM(); if (!m) return null;
      const q = pt.matrixTransform(m.inverse());
      let melhor = null, d0 = 0.8;
      for (const e of P.eixos) { const d = Math.hypot(e.x - q.x, e.y - q.y); if (d < d0) { d0 = d; melhor = e; } }
      return melhor;
    };
    svg.addEventListener('click', ev => { const e = eixoNoPonto(ev); if (!e) return; if (e.f) { cx.msg(e.f.t === 'manivela' ? 'A manivela: é ela que gira (uma volta, para a direita).' : e.f.t === 'cilindro' ? 'O cilindro ' + letra(e) + ': precisa girar ' + textoQuer(e.f.quer) + '.' : e.f.t === 'presa' ? 'Enferrujada: não gira.' : 'A catraca: só gira para a direita.'); return; } trocar(e, false); });
    svg.addEventListener('contextmenu', ev => { const e = eixoNoPonto(ev); ev.preventDefault(); if (e && !e.f) trocar(e, true); });
    pintar();
    const DUR = 1500;
    return {
      atualizar: pintar,
      passo(dt) {
        const A = st.anim;
        if (!A) return;
        A.t += dt;
        const f = Math.min(1, A.t / DUR), pane = !A.ok && ['bate', 'trava', 'presa', 'catraca'].includes(A.motivo);
        const ang = A.w.map(w => (w == null ? 0 : (pane ? Math.sin(A.t / 25) * 4 * Math.min(1, A.t / 200) : w * 360 * (1 - Math.pow(1 - f, 2)))));
        desenhar(A.gs, ang, f >= 0.5 || pane ? A.onde : null);
        if (A.t >= DUR + 400) { st.anim = null; pintar(); }
      },
      vivo: () => ({ p: posAtual(), c: st.cam }),
      verVivo(d) { if (d && ehObj(d.p)) { st.pos = {}; for (const k of Object.keys(d.p)) if (Array.isArray(d.p[k])) st.pos[k] = d.p[k].slice(0, 2); st.cam = d.c ? 1 : 0; pintar(); } },
      ajuda: 'Clique num eixo para pôr uma engrenagem (de novo troca o tamanho; o botão direito tira). Ligue a manivela aos cilindros: as que se encostam giram juntas, cada uma ao contrário da outra. Pensar é de graça: só o teste errado quebra a gazua.',
      botoes: () => {
        const out = [];
        if (P.atras) for (const [c, nm] of [[0, 'Frente'], [1, 'Trás']]) out.push(el('button', { type: 'button', class: 'btn' + (st.cam === c ? ' pri' : ''), 'aria-pressed': String(st.cam === c), 'data-k': 'feg:cam:' + c, onclick: () => { st.cam = c; cx.mudou(); pintar(); cx.repintarBotoes(); } }, nm));
        const t = el('button', { type: 'button', class: 'btn pri', 'data-k': 'fch:testar', onclick: () => {
          if (st.anim) return;
          const res = cx.testar(posAtual(), DUR + 300);
          if (res) st.anim = { t: 0, w: res.w, gs: res.gs, ok: res.ok, motivo: res.motivo, onde: res.onde || [] };
        } }, 'Girar a manivela (testar)');
        if (cx.fechado()) t.disabled = true;
        out.push(t);
        return out;
      }
    };
  }
  api.telas = { perfil: telaPerfil, engrenagens: telaEngr };
})();
