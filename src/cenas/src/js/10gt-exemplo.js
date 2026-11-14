/* ---------------------------------------------------------------
   10gt. O ESTILO POR EXEMPLO (lote 156) — o colapso de funções de onda (Wave Function Collapse, o modelo de sobreposição):
   o gerador olha um exemplo pequeno, aprende os pedaços de 3 × 3 que aparecem nele (e quantas vezes) e monta um mapa
   grande só com pedaços que se encaixam como no exemplo. O mapa sai "no mesmo jeito": o labirinto vira labirinto, a
   caverna vira caverna.
   As casas: x (parede ou rocha), . (chão), p (porta), a (água), m (mato).
   O exemplo vem de três lugares: os prontos (abaixo), o desenho do mestre (uma grade de 12 × 12) e uma cena dele (as
   paredes viram casas de parede; um pedaço de até 24 × 24 do meio).
   --------------------------------------------------------------- */
const Exemplo = (() => {
  const CASAS = [['x', 'Parede'], ['.', 'Chão'], ['p', 'Porta'], ['a', 'Água'], ['m', 'Mato']];
  const COR = { x: '#2a2622', '.': '#b9a98a', p: '#d4893a', a: '#3f7396', m: '#5d8a3e' };
  const PRONTOS = {
    labirinto: { n: 'Labirinto', chao: 'laje', cerca: true, g: [
      '.x.x...x...x',
      'xx.xxxxxxxxx',
      '.x...x.x....',
      '.xxx.xxx.xxx',
      '.x.x.x...x..',
      '.xxx.xxxxxxx',
      '...x.x...x.x',
      '.x.xxx.x.x.x',
      '...x...x.x..',
      'xxxxxx.x.x.x',
      '...x.......x',
      '.x.xxx.xxx.x'] },
    caverna: { n: 'Caverna', chao: 'terra', g: [
      'xxxxxxxxxxxxxx',
      'xxx...xxxx..xx',
      'xx.....xx....x',
      'x......x...a.x',
      'x..xx.....aa.x',
      'xx.xxx.......x',
      'xx..xx..xx..xx',
      'x....x.xxx..xx',
      'x.aa......xxxx',
      'xx.a...x...xxx',
      'xxx...xxx..xxx',
      'xxxxxxxxxxxxxx'] },
    salas: { n: 'Salas e corredores', chao: 'laje', g: [
      'xxxxxxxxxxxxxx',
      'x....xxxxx...x',
      'x....p...p...x',
      'x....xx.xx...x',
      'xxpxxxx.xxxpxx',
      'xx.xxxx.xxx.xx',
      'xx.......xx.xx',
      'xx.xxxxx.xx.xx',
      'x...xx.....p.x',
      'x...p......x.x',
      'x...xx.....x.x',
      'xxxxxxxxxxxxxx'] },
    cidade: { n: 'Cidade em quarteirões', chao: 'calcada', g: [
      '.............',
      '.xxx.xxx.xxx.',
      '.xxx.xxx.xxx.',
      '.xxx.xxx.xxx.',
      '.............',
      '.xx.......xx.',
      '.xx..mmm..xx.',
      '.xx..mmm..xx.',
      '.............',
      '.xxx.xxxx.xx.',
      '.xxx.xxxx.xx.',
      '.............'] },
    jardim: { n: 'Jardim', chao: 'grama', g: [
      'mmmmmmmmmmmmm',
      'm.....m.....m',
      'm.mmm.m.mmm.m',
      'm.m.......m.m',
      'm.m..aaa..m.m',
      'm....aaa....m',
      'm.m..aaa..m.m',
      'm.m.......m.m',
      'm.mmm.m.mmm.m',
      'm.....m.....m',
      'mmmmmmmmmmmmm'] },
    ruinas: { n: 'Ruínas', chao: 'laje', g: [
      'mmm.....mmmm.',
      'm.xx.x...x..m',
      '..x....m.x...',
      '.xx.xx...xxx.',
      '....m..mm....',
      '.x.......x.x.',
      '.x..xx.x...x.',
      '.xx.x....xxx.',
      '..m...m......',
      'm..xx..xx.m.m',
      'mm.....m..mmm'] },
  };
  const LISTA = Object.keys(PRONTOS).map(k => [k, PRONTOS[k].n]);
  const valida = g => Array.isArray(g) && g.length >= 4 && g.length <= 40 && g.every(l => typeof l === 'string' && l.length === g[0].length && l.length >= 4 && l.length <= 40 && /^[x.pam]+$/.test(l));
  const vazio = (w, h) => Array.from({ length: h }, () => '.'.repeat(w));
  const desenhoPadrao = () => PRONTOS.salas.g.map(l => l.slice(0, 12)).slice(0, 12);

  /* ---------------- aprender: os pedaços N × N do exemplo (com os giros e os espelhos, se pedido) ---------------- */
  const gira = g => { const H = g.length, W = g[0].length, out = []; for (let x = 0; x < W; x++) { let l = ''; for (let y = H - 1; y >= 0; y--) l += g[y][x]; out.push(l); } return out; };
  const espelha = g => g.map(l => l.split('').reverse().join(''));
  function aprender(g, N, sim) {
    const H = g.length, W = g[0].length, pats = new Map();
    const grades = [g];
    if (sim) { let q = g; for (let i = 0; i < 3; i++) { q = gira(q); grades.push(q); } for (const x of grades.slice()) grades.push(espelha(x)); }
    // (a entrada dá a volta: o pedaço que passa da beira continua do outro lado — assim todo pedaço tem com quem se encaixar)
    for (const G of grades) { const gh = G.length, gw = G[0].length; for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { let s2 = ''; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) s2 += G[(y + j) % gh][(x + i) % gw]; pats.set(s2, (pats.get(s2) || 0) + 1); } }
    const P = [...pats.keys()], peso = P.map(k => pats.get(k));
    const at = (k, i, j) => P[k][j * N + i];
    // o encaixe: b pode ficar em (dx, dy) de a, se as partes que se cobrem são iguais
    const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const comb = DIRS.map(([dx, dy]) => P.map((_, a) => {
      const l = [];
      for (let b = 0; b < P.length; b++) {
        let ok = true;
        for (let j = Math.max(0, dy); j < Math.min(N, N + dy) && ok; j++) for (let i = Math.max(0, dx); i < Math.min(N, N + dx); i++) if (at(a, i, j) !== at(b, i - dx, j - dy)) { ok = false; break; }
        if (ok) l.push(b);
      }
      return l;
    }));
    return { N, P, peso, comb, at, borda: (g[0] + g[H - 1] + g.map(l => l[0] + l[W - 1]).join('')).split('').every(c => c === g[0][0]) ? g[0][0] : null };
  }

  /* ---------------- gerar: W × H casas (ou null, se não deu) ---------------- */
  function gerar(M, W, H, r) {
    const { N, P, peso, comb, at } = M, NP = P.length;
    if (!NP) return null;
    const GW = W - N + 1, GH = H - N + 1, C = GW * GH;
    if (GW < 1 || GH < 1) return null;
    const pode = new Uint8Array(C * NP).fill(1), n = new Int32Array(C).fill(NP);
    const somaP = new Float64Array(C), somaPL = new Float64Array(C);
    const pl = peso.map(w => w * Math.log(w)), tot = peso.reduce((a, b) => a + b, 0), totL = pl.reduce((a, b) => a + b, 0);
    somaP.fill(tot); somaPL.fill(totL);
    const OPP = [1, 0, 3, 2], DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    // os contadores do AC-4: cont[(c * 4 + d) * NP + b] = quantos de a, no vizinho do lado d, ainda deixam b
    const cont = new Int16Array(C * 4 * NP);
    for (let c = 0; c < C; c++) for (let d = 0; d < 4; d++) for (let b = 0; b < NP; b++) cont[(c * 4 + d) * NP + b] = comb[OPP[d]][b].length;
    const pilha = [];
    let erro = false;
    const tira = (c, b) => {
      if (!pode[c * NP + b]) return;
      pode[c * NP + b] = 0; n[c]--; somaP[c] -= peso[b]; somaPL[c] -= pl[b];
      if (n[c] <= 0) erro = true;
      pilha.push(c, b);
    };
    const espalha = () => {
      while (pilha.length && !erro) {
        const b = pilha.pop(), c = pilha.pop(), x = c % GW, y = (c - x) / GW;
        for (let d = 0; d < 4; d++) {
          const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
          if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
          const v = ny * GW + nx, l = comb[d][b];
          for (const k of l) { const i = (v * 4 + d) * NP + k; cont[i]--; if (cont[i] === 0) tira(v, k); }
        }
      }
    };
    // a beira: se o exemplo tem a beira toda de uma casa (a parede em volta), o mapa também tem
    if (M.borda) {
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const c = y * GW + x;
        for (let k = 0; k < NP; k++) {
          let ok = true;
          if (x === 0) for (let j = 0; j < N; j++) if (at(k, 0, j) !== M.borda) ok = false;
          if (y === 0) for (let i = 0; i < N; i++) if (at(k, i, 0) !== M.borda) ok = false;
          if (x === GW - 1) for (let j = 0; j < N; j++) if (at(k, N - 1, j) !== M.borda) ok = false;
          if (y === GH - 1) for (let i = 0; i < N; i++) if (at(k, i, N - 1) !== M.borda) ok = false;
          if (!ok) tira(c, k);
        }
      }
      espalha();
      if (erro) return null;
    }
    for (let passo = 0; passo < C; passo++) {
      // a casa com menos incerteza (a entropia de Shannon, com um ruído para desempatar)
      let melhor = -1, menor = Infinity;
      for (let c = 0; c < C; c++) {
        if (n[c] <= 1) continue;
        const e = Math.log(somaP[c]) - somaPL[c] / somaP[c] + r() * 1e-6;
        if (e < menor) { menor = e; melhor = c; }
      }
      if (melhor < 0) break;
      // sorteia um pedaço, pelo peso
      let alvo = r() * somaP[melhor], esc = -1;
      for (let k = 0; k < NP; k++) if (pode[melhor * NP + k]) { alvo -= peso[k]; if (alvo <= 0) { esc = k; break; } }
      if (esc < 0) for (let k = NP - 1; k >= 0; k--) if (pode[melhor * NP + k]) { esc = k; break; }
      for (let k = 0; k < NP; k++) if (k !== esc && pode[melhor * NP + k]) tira(melhor, k);
      espalha();
      if (erro) return null;
    }
    // o mapa: cada casa vem do canto do pedaço dela (as últimas fileiras, do resto do pedaço da beira)
    const out = Array.from({ length: H }, () => new Array(W).fill('x'));
    const pat = c => { for (let k = 0; k < NP; k++) if (pode[c * NP + k]) return k; return 0; };
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const k = pat(y * GW + x);
      out[y][x] = at(k, 0, 0);
      if (x === GW - 1) for (let i = 1; i < N; i++) out[y][x + i] = at(k, i, 0);
      if (y === GH - 1) for (let j = 1; j < N; j++) out[y + j][x] = at(k, 0, j);
      if (x === GW - 1 && y === GH - 1) for (let j = 1; j < N; j++) for (let i = 1; i < N; i++) out[y + j][x + i] = at(k, i, j);
    }
    return out.map(l => l.join(''));
  }
  // tenta algumas vezes (com outra semente); sem os giros, se o exemplo tiver pedaços demais
  function fazer(g, W, H, seed, sim, cerca) {
    if (!valida(g)) return null;
    let M = aprender(g, 3, sim);
    if (M.P.length > 420 && sim) M = aprender(g, 3, false);
    if (M.P.length > 700) return null;
    for (let t = 0; t < 10; t++) {
      const r = mulberry(((seed >>> 0) + t * 7919) || 1);
      let out = gerar(t < 6 ? M : Object.assign({}, M, { borda: null }), W, H, r);
      if (out && cerca) out = out.map((l, y) => (y === 0 || y === H - 1 ? 'x'.repeat(W) : 'x' + l.slice(1, W - 1) + 'x'));
      if (out) return { g: limpar(out), padroes: M.P.length, tentativas: t + 1 };
    }
    return null;
  }
  // depois: só a maior região de chão fica (o resto vira parede); a porta sem parede dos dois lados vira chão
  // depois: as regiões de chão soltas se ligam à maior por uma abertura numa parede de 1 casa (as que não dá, viram
  // parede); a porta sem parede dos dois lados vira chão
  function limpar(g) {
    const H = g.length, W = g[0].length, a = g.map(l => l.split('')), anda = c => c !== 'x';
    const regioes = () => {
      const id = new Int32Array(W * H).fill(-1), tam = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!anda(a[y][x]) || id[y * W + x] >= 0) continue;
        const k = tam.length, fila = [y * W + x]; id[y * W + x] = k;
        for (let i = 0; i < fila.length; i++) { const q = fila[i], qx = q % W, qy = (q - qx) / W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || !anda(a[ny][nx]) || id[ny * W + nx] >= 0) continue; id[ny * W + nx] = k; fila.push(ny * W + nx); } }
        tam.push(fila.length);
      }
      return { id, tam };
    };
    for (let volta = 0; volta < 60; volta++) {
      const { id, tam } = regioes();
      if (tam.length <= 1) break;
      const maior = tam.indexOf(Math.max(...tam));
      // a parede de 1 casa entre a maior e outra: abre (a do meio da lista, para não ser sempre na beira)
      const cand = [];
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        if (a[y][x] !== 'x') continue;
        for (const [p1, p2] of [[[x - 1, y], [x + 1, y]], [[x, y - 1], [x, y + 1]]]) {
          const i1 = id[p1[1] * W + p1[0]], i2 = id[p2[1] * W + p2[0]];
          if (i1 >= 0 && i2 >= 0 && i1 !== i2 && (i1 === maior || i2 === maior)) cand.push([x, y]);
        }
      }
      if (!cand.length) {
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (anda(a[y][x]) && id[y * W + x] !== maior && a[y][x] !== 'a' && a[y][x] !== 'm') a[y][x] = 'x';
        break;
      }
      const [x, y] = cand[Math.floor(cand.length / 2)];
      a[y][x] = '.';
    }
    const S = (x, y) => x < 0 || y < 0 || x >= W || y >= H || a[y][x] === 'x';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (a[y][x] === 'p' && !((S(x - 1, y) && S(x + 1, y) && !S(x, y - 1) && !S(x, y + 1)) || (S(x, y - 1) && S(x, y + 1) && !S(x - 1, y) && !S(x + 1, y)))) a[y][x] = '.';
    return a.map(l => l.join(''));
  }

  /* ---------------- o exemplo de uma cena: as paredes viram casas de parede (um pedaço do meio) ---------------- */
  function daCena(sc, max) {
    if (!sc || !sc.cols || !sc.rows) return null;
    max = max || 24;
    const c = sc.cell, W = sc.cols, H = sc.rows, M = Vigia.novo(W, H);
    for (const w of sc.walls || []) { const k = w.k || 'wall'; if (k === 'wall' || k === 'mureta' || k === 'door' || k === 'window') Vigia.parede(M, w.x1 / c, w.y1 / c, w.x2 / c, w.y2 / c, k !== 'door', true); }
    // fora: o que se alcança da beira sem passar parede (as portas fecham); fora vira parede
    const fora = new Uint8Array(W * H), fila = [];
    for (let x = 0; x < W; x++) for (const y of [0, H - 1]) { fora[y * W + x] = 1; fila.push(y * W + x); }
    for (let y = 0; y < H; y++) for (const x of [0, W - 1]) { fora[y * W + x] = 1; fila.push(y * W + x); }
    for (let i = 0; i < fila.length; i++) { const q = fila[i], x = q % W, y = (q - x) / W; for (const [dx, dy, b] of [[1, 0, M.pV[y * (W + 1) + x + 1]], [-1, 0, M.pV[y * (W + 1) + x]], [0, 1, M.pH[(y + 1) * W + x]], [0, -1, M.pH[y * W + x]]]) { const nx = x + dx, ny = y + dy; if (b || nx < 0 || ny < 0 || nx >= W || ny >= H || fora[ny * W + nx]) continue; fora[ny * W + nx] = 1; fila.push(ny * W + nx); } }
    const g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (fora[y * W + x] ? 'x' : '.')));
    // as paredes de dentro (entre duas casas de chão): a casa da direita (ou de baixo) vira parede; a porta, porta
    const porta = new Set();
    for (const w of sc.walls || []) if (w.k === 'door') porta.add(Math.round(Math.min(w.x1, w.x2) / c) + ',' + Math.round(Math.min(w.y1, w.y2) / c) + (Math.abs(w.x2 - w.x1) < Math.abs(w.y2 - w.y1) ? 'v' : 'h'));
    for (let y = 0; y < H; y++) for (let x = 1; x < W; x++) if (M.pV[y * (W + 1) + x] && g[y][x] === '.' && g[y][x - 1] === '.') g[y][x] = porta.has(x + ',' + y + 'v') ? 'p' : 'x';
    for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) if (M.pH[y * W + x] && g[y][x] === '.' && g[y - 1][x] === '.') g[y][x] = porta.has(x + ',' + y + 'h') ? 'p' : 'x';
    // a água e o mato, pelos objetos e pelas áreas da cena? (não: o exemplo da cena é de paredes e chão)
    // o pedaço do meio com mais chão (até max × max)
    const w = Math.min(W, max), h = Math.min(H, max);
    let best = null, bn = -1;
    for (let y0 = 0; y0 + h <= H; y0 += 2) for (let x0 = 0; x0 + w <= W; x0 += 2) {
      let n = 0; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (g[y][x] !== 'x') n++;
      const bom = n > 0 && n < w * h * 0.85 ? n : n * 0.3;
      if (bom > bn) { bn = bom; best = [x0, y0]; }
    }
    if (!best) return null;
    const out = []; for (let y = best[1]; y < best[1] + h; y++) out.push(g[y].slice(best[0], best[0] + w).join(''));
    return out.some(l => /[.p]/.test(l)) ? out : null;
  }

  /* ---------------- o desenho: a grade de 12 × 12 onde o mestre pinta ---------------- */
  function editor(g, K, aoMudar) {
    let tinta = '.', pintando = false;
    const L = 12, cel = 22, cv = h('canvas', { class: 'ex-cv', id: 'ex-cv', width: L * cel, height: L * cel, 'aria-label': 'O desenho do exemplo: clique e arraste para pintar' });
    const linhas = g.map(l => l.split(''));
    const pinta = () => { const c = cv.getContext('2d'); for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) { c.fillStyle = COR[linhas[y][x]] || '#000'; c.fillRect(x * cel, y * cel, cel, cel); c.strokeStyle = 'rgba(255,255,255,0.08)'; c.strokeRect(x * cel + 0.5, y * cel + 0.5, cel - 1, cel - 1); } };
    const casa = e => { const b = cv.getBoundingClientRect(); return [Math.floor((e.clientX - b.left) / b.width * L), Math.floor((e.clientY - b.top) / b.height * L)]; };
    const poe = e => { const [x, y] = casa(e); if (x < 0 || y < 0 || x >= L || y >= L || linhas[y][x] === tinta) return; linhas[y][x] = tinta; pinta(); };
    cv.addEventListener('pointerdown', e => { pintando = true; cv.setPointerCapture(e.pointerId); poe(e); });
    cv.addEventListener('pointermove', e => { if (pintando) poe(e); });
    const fim = () => { if (!pintando) return; pintando = false; aoMudar(linhas.map(l => l.join(''))); };
    cv.addEventListener('pointerup', fim); cv.addEventListener('pointercancel', fim);
    setTimeout(pinta, 0);
    const paleta = h('div', { class: 'ex-pal', id: 'ex-pal' }, CASAS.map(([k, n]) => h('button', { type: 'button', class: 'ex-tinta' + (k === tinta ? ' on' : ''), id: 'ex-t-' + (k === '.' ? 'chao' : k), title: n, onclick: e => { tinta = k; for (const b of e.currentTarget.parentNode.children) b.classList.toggle('on', b === e.currentTarget); } }, h('span', { class: 'ex-amostra', style: { background: COR[k] } }), n)));
    return h('div', { class: 'ex-ed' }, paleta, cv);
  }
  // uma miniatura de um exemplo (o pronto, o da cena)
  function miniatura(g) {
    const H = g.length, W = g[0].length, cel = Math.max(4, Math.floor(180 / Math.max(W, H))), cv = h('canvas', { class: 'ex-mini', width: W * cel, height: H * cel });
    setTimeout(() => { const c = cv.getContext('2d'); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { c.fillStyle = COR[g[y][x]] || '#000'; c.fillRect(x * cel, y * cel, cel, cel); } }, 0);
    return cv;
  }
  return { CASAS, COR, PRONTOS, LISTA, valida, vazio, desenhoPadrao, aprender, gerar, fazer, limpar, daCena, editor, miniatura };
})();
