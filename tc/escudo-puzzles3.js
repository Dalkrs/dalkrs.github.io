/* Tiny Cats · os puzzles do lote 209, parte 2 (a conta pura, sem DOM): mecanismos, caminhos e desenho, em 5 níveis.
     Mecanismos — torre dos discos, jarros d'água, travessia do rio, canos de água, empurrar estátuas, chão de gelo, resta um
     Caminhos e mapas — pontes entre ilhas, trilhos, mapa e bússola, cavalo do rei
     Desenho e encaixe — constelação, encaixar peças
   O mesmo contrato de tc/escudo-puzzles2.js (niveis, niv, demo). */
(() => {
  'use strict';
  const E = (typeof window !== 'undefined' && window.TC && window.TC.escudo) || (typeof require === 'function' ? require('./escudo.js') : null);
  if (!E) return;
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const embaralhar = (l, r) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; };
  const sortear = (l, r) => l[Math.floor(r() * l.length)];
  const intOk = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  const listaInt = (v, a, b, max) => (Array.isArray(v) ? v.filter(x => intOk(x, a, b)).slice(0, max || 400) : []);
  const NIV = E.DIF5;
  const nv = d => Math.max(0, NIV.indexOf(d));
  const seq = n => [...Array(n).keys()];
  const trocaChar = (s, i, c) => s.slice(0, i) + c + s.slice(i + 1);
  const CACHE = new Map();
  function memo(tipo, fn) {
    return (def, r, ctx) => {
      const k = tipo + '|' + JSON.stringify(def) + '|' + (ctx && ctx.sal);
      let s = CACHE.get(k);
      if (s == null) { let m = fn(def, r, ctx); for (let k = 0; k < 6 && !m; k++) m = fn(def, r, ctx); s = JSON.stringify(m); CACHE.set(k, s); if (CACHE.size > 120) CACHE.delete(CACHE.keys().next().value); }
      return JSON.parse(s);
    };
  }
  const D4 = { N: [0, -1], L: [1, 0], S: [0, 1], O: [-1, 0] };
  const passo = (w, h, i, d) => { const x = (i % w) + D4[d][0], y = Math.floor(i / w) + D4[d][1]; return x < 0 || y < 0 || x >= w || y >= h ? null : y * w + x; };
  // a busca em largura genérica: → o caminho de estados (do começo ao primeiro que serve) ou null
  function bfs(ini, chave, vizinhos, serve, max) {
    const vis = new Map([[chave(ini), null]]), fila = [ini];
    let k = 0;
    while (k < fila.length && vis.size < (max || 200000)) {
      const s = fila[k++];
      if (serve(s)) { const cam = [s]; let c = vis.get(chave(s)); while (c) { cam.unshift(c.s); c = vis.get(chave(c.s)); } return cam; }
      for (const t of vizinhos(s)) { const kk = chave(t); if (!vis.has(kk)) { vis.set(kk, { s }); fila.push(t); } }
    }
    return null;
  }

  /* ======================= Torre dos discos ======================= */
  const TOR_N = [3, 4, 5, 6, 5], TOR_ALVO = [2, 2, 1, 2, null];
  const pinosOk = p => Array.isArray(p) && p.length === 3 && p.every(l => Array.isArray(l) && l.every((v, i) => Number.isInteger(v) && (i === 0 || v < l[i - 1])));
  function torPos(p) { const pos = []; p.forEach((l, k) => l.forEach(d => { pos[d] = k; })); return pos; }
  // o primeiro lance do caminho mais curto até todos os discos no pino "alvo"
  function torLance(p, n, alvo) {
    const pos = torPos(p);
    const rec = (k, a) => { if (k < 1) return null; if (pos[k] === a) return rec(k - 1, a); const o = 3 - pos[k] - a; return rec(k - 1, o) || { de: pos[k], para: a }; };
    return rec(n, alvo);
  }
  function torLances(p, n, alvo) {
    const pos = torPos(p);
    const rec = (k, a) => (k < 1 ? 0 : pos[k] === a ? rec(k - 1, a) : rec(k - 1, 3 - pos[k] - a) + 1 + (2 ** (k - 1) - 1));
    return rec(n, alvo);
  }
  const mover = (p, de, para) => { const q = p.map(l => l.slice()); q[para].push(q[de].pop()); return q; };
  const montarTorre = memo('torre', (def, r) => {
    const lv = nv(def.dif), n = TOR_N[lv];
    let p0, alvo = TOR_ALVO[lv];
    if (lv === 4) {
      for (let t = 0; t < 200; t++) {
        const pos = seq(n + 1).map(() => Math.floor(r() * 3));
        p0 = [[], [], []]; for (let d = n; d >= 1; d--) p0[pos[d]].push(d);
        alvo = Math.floor(r() * 3);
        if (torLances(p0, n, alvo) >= 14) break;
      }
    } else p0 = [seq(n).map(i => n - i), [], []];
    return { pub: { n, alvo, p0 }, estado: { p: p0 }, provaCerta: 'torre:' + n, seg: { lances: torLances(p0, n, alvo) } };
  });
  const pinosDe = jg => (pinosOk(jg.estado.p) ? jg.estado.p : jg.pub.p0);
  const provaTorre = jg => (pinosDe(jg)[jg.pub.alvo].length === jg.pub.n ? 'torre:' + jg.pub.n : null);
  function dicaTorre(jg) { const l = torLance(pinosDe(jg), jg.pub.n, jg.pub.alvo); return l ? { mudas: { p: mover(pinosDe(jg), l.de, l.para), n: (jg.estado.n || 0) + 1 }, txt: 'um disco do pino ' + (l.de + 1) + ' para o ' + (l.para + 1) } : null; }
  function demoTorre(m) {
    const p = m.pub; let q = p.p0;
    const passos = [{ txt: 'Levem todos os discos para o pino marcado. Cliquem num pino para pegar o disco de cima, depois no pino de destino.', alvo: 'pino' + p.alvo }];
    for (let k = 0; k < 2; k++) { const l = torLance(q, p.n, p.alvo); if (!l) break; q = mover(q, l.de, l.para); passos.push({ txt: k ? 'Disco grande nunca vai em cima de disco pequeno.' : 'Um disco por vez.', alvo: 'pino' + l.para, mudas: { p: q } }); }
    const fim = [[], [], []]; fim[p.alvo] = seq(p.n).map(i => p.n - i);
    passos.push({ txt: 'Em ' + m.seg.lances + ' lances dá para fazer. Tudo no pino certo: resolvido!', mudas: { p: fim }, fim: true });
    return passos;
  }

  /* ======================= Jarros d'água ======================= */
  const JAR = [
    { q: 2, fonte: true, cap: [3, 8], min: [3, 6] },
    { q: 2, fonte: true, cap: [5, 12], min: [7, 12] },
    { q: 3, fonte: false, cap: [3, 12], min: [6, 14], meio: true },
    { q: 3, fonte: true, cap: [3, 13], min: [8, 14] },
    { q: 3, fonte: true, cap: [3, 13], min: [9, 16], par: true },
  ];
  function jarVizinhos(v, caps, fonte) {
    const o = [];
    for (let i = 0; i < v.length; i++) {
      if (fonte && v[i] < caps[i]) { const t = v.slice(); t[i] = caps[i]; o.push(t); }
      if (fonte && v[i] > 0) { const t = v.slice(); t[i] = 0; o.push(t); }
      for (let j = 0; j < v.length; j++) { if (i === j || !v[i] || v[j] >= caps[j]) continue; const q = Math.min(v[i], caps[j] - v[j]), t = v.slice(); t[i] -= q; t[j] += q; o.push(t); }
    }
    return o;
  }
  const jarAlvoOk = (v, a) => (a.k === 'algum' ? v.includes(a.v) : a.k === 'par' ? v[a.i] === a.vi && v[a.j] === a.vj : v.filter(x => x === a.v).length >= 2);
  const montarJarros = memo('jarros', (def, r) => {
    const lv = nv(def.dif), J = JAR[lv];
    for (let t = 0; t < 400; t++) {
      let caps = seq(J.q).map(() => J.cap[0] + Math.floor(r() * (J.cap[1] - J.cap[0] + 1)));
      if (new Set(caps).size < caps.length) continue;
      caps.sort((a, b) => b - a);
      if (J.meio && caps[0] % 2) caps[0]++;
      const ini = J.fonte ? caps.map(() => 0) : caps.map((c, i) => (i === 0 ? c : 0));
      // a distância de cada estado
      const dist = new Map([[ini.join(','), 0]]), fila = [ini];
      for (let k = 0; k < fila.length; k++) for (const s of jarVizinhos(fila[k], caps, J.fonte)) if (!dist.has(s.join(','))) { dist.set(s.join(','), dist.get(fila[k].join(',')) + 1); fila.push(s); }
      let alvo = null;
      const est = embaralhar(fila, r);
      if (J.meio) { const v = caps[0] / 2; const melhor = fila.filter(s => jarAlvoOk(s, { k: 'meio', v })).sort((a, b) => dist.get(a.join(',')) - dist.get(b.join(',')))[0]; if (melhor && dist.get(melhor.join(',')) >= J.min[0] && dist.get(melhor.join(',')) <= J.min[1] + 6) alvo = { k: 'meio', v }; }
      else if (J.par) {
        for (const s of est) { const i = 1, j = 2, a = { k: 'par', i, j, vi: s[i], vj: s[j] }; if (!s[i] || !s[j]) continue; const d = Math.min(...fila.filter(x => jarAlvoOk(x, a)).map(x => dist.get(x.join(',')))); if (d >= J.min[0] && d <= J.min[1]) { alvo = a; break; } }
      } else {
        for (const v of embaralhar(seq(caps[0]).map(x => x + 1), r)) { if (caps.includes(v)) continue; const a = { k: 'algum', v }; const ds = fila.filter(x => jarAlvoOk(x, a)).map(x => dist.get(x.join(','))); if (!ds.length) continue; const d = Math.min(...ds); if (d >= J.min[0] && d <= J.min[1]) { alvo = a; break; } }
      }
      if (!alvo) continue;
      const cam = bfs(ini, s => s.join(','), s => jarVizinhos(s, caps, J.fonte), s => jarAlvoOk(s, alvo));
      return { pub: { caps, ini, fonte: J.fonte, alvo }, estado: { v: ini }, provaCerta: 'jarros', seg: { cam } };
    }
    return { pub: { caps: [5, 3], ini: [0, 0], fonte: true, alvo: { k: 'algum', v: 4 } }, estado: { v: [0, 0] }, provaCerta: 'jarros', seg: { cam: bfs([0, 0], s => s.join(','), s => jarVizinhos(s, [5, 3], true), s => s.includes(4)) } };
  });
  const jarrosDe = jg => { const v = jg.estado.v; return Array.isArray(v) && v.length === jg.pub.caps.length && v.every((x, i) => intOk(x, 0, jg.pub.caps[i])) ? v : jg.pub.ini; };
  const provaJarros = jg => (jarAlvoOk(jarrosDe(jg), jg.pub.alvo) ? 'jarros' : null);
  function dicaJarros(jg) {
    const p = jg.pub, cam = bfs(jarrosDe(jg), s => s.join(','), s => jarVizinhos(s, p.caps, p.fonte), s => jarAlvoOk(s, p.alvo));
    if (!cam || cam.length < 3) return null;
    return { mudas: { v: cam[1], n: (jg.estado.n || 0) + 1 }, txt: 'um lance certo' };
  }
  const textoAlvoJarros = (pub, nomes) => (pub.alvo.k === 'algum' ? 'Deixem exatamente ' + pub.alvo.v + ' litros num dos jarros.' : pub.alvo.k === 'meio' ? 'Dividam a água ao meio: ' + pub.alvo.v + ' litros em dois jarros.' : 'Deixem ' + pub.alvo.vi + ' litros no jarro ' + nomes[pub.alvo.i] + ' e ' + pub.alvo.vj + ' no jarro ' + nomes[pub.alvo.j] + '.');
  function demoJarros(m) {
    const cam = m.seg.cam || [m.pub.ini], passos = [{ txt: 'Não há marcas nos jarros: só cheio ou vazio. ' + (m.pub.fonte ? 'Podem encher na fonte e jogar fora.' : 'Aqui não há fonte: só passar de um jarro para outro.'), alvo: 'j0' }];
    if (cam[1]) passos.push({ txt: 'Despejar passa água até o outro encher ou este esvaziar.', alvo: 'j1', mudas: { v: cam[1] } });
    if (cam[2]) passos.push({ txt: 'Pensem em quanto sobra em cada um.', mudas: { v: cam[2] } });
    passos.push({ txt: 'Chegaram à medida: resolvido!', mudas: { v: cam[cam.length - 1] }, fim: true });
    return passos;
  }

  /* ======================= Travessia do rio ======================= */
  const BARQ = [['o lobo', 'a cabra', 'o repolho', 'O lobo comeu a cabra.', 'A cabra comeu o repolho.'], ['a raposa', 'a galinha', 'o milho', 'A raposa comeu a galinha.', 'A galinha comeu o milho.'], ['o ogro', 'o bode', 'o feno', 'O ogro comeu o bode.', 'O bode comeu o feno.']];
  const PONTE4 = [[1, 2, 5, 10], [1, 3, 6, 8], [2, 3, 5, 9], [1, 2, 4, 8], [1, 4, 5, 9]], PONTE5 = [[1, 3, 6, 8, 12], [1, 2, 5, 7, 10], [2, 3, 4, 8, 9], [1, 2, 3, 6, 11]];
  const NOMES_PONTE = ['Lia', 'Tomé', 'Bia', 'Rufo', 'Nara'];
  function travVariante(lv, r) {
    if (lv === 0) { const b = sortear(BARQ, r); return { tipo: 'barqueiro', itens: ['o barqueiro', b[0], b[1], b[2]], cap: 2, remam: [0], perigo: [[1, 2, b[3]], [2, 3, b[4]]] }; }
    if (lv === 1 || lv === 4) { const k = lv === 1 ? 3 : 5; return { tipo: 'guardas', itens: seq(k).map(() => 'guarda').concat(seq(k).map(() => 'ladrão')), k, cap: lv === 1 ? 2 : 3, remam: seq(2 * k) }; }
    const t = sortear(lv === 2 ? PONTE4 : PONTE5, r);
    return { tipo: 'ponte', itens: t.map((x, i) => NOMES_PONTE[i]), tempos: t, cap: 2, remam: seq(t.length) };
  }
  // o estado: { s: lado de cada um (0/1), b: lado do barco/da tocha, t: tempo }
  function travProblema(V, s) {
    if (V.tipo === 'barqueiro') { for (const [a, b, txt] of V.perigo) if (s.s[a] === s.s[b] && s.s[0] !== s.s[a]) return txt; return null; }
    if (V.tipo === 'guardas') for (const lado of [0, 1]) { const g = seq(V.k).filter(i => s.s[i] === lado).length, l = seq(V.k).filter(i => s.s[V.k + i] === lado).length; if (g > 0 && l > g) return 'Os ladrões ficaram em maior número que os guardas numa margem.'; }
    return null;
  }
  function travCruzar(V, s, grupo) {
    const t = { s: s.s.slice(), b: 1 - s.b, t: s.t };
    for (const i of grupo) t.s[i] = 1 - t.s[i];
    if (V.tipo === 'ponte') t.t += Math.max(...grupo.map(i => V.tempos[i]));
    return t;
  }
  function travGrupos(V, s) {
    const aqui = seq(V.itens.length).filter(i => s.s[i] === s.b), out = [];
    for (let mask = 1; mask < 1 << aqui.length; mask++) {
      const g = aqui.filter((_, k) => (mask >> k) & 1);
      if (g.length > V.cap || !g.some(i => V.remam.includes(i))) continue;
      if (V.tipo === 'guardas') { const ch = g.filter(i => i < V.k).length + ',' + g.filter(i => i >= V.k).length; if (out.some(x => x.ch === ch)) continue; out.push({ g, ch }); continue; }
      out.push({ g });
    }
    return out.map(x => x.g);
  }
  const travChave = (V, s) => (V.tipo === 'guardas' ? seq(V.k).filter(i => s.s[i]).length + '|' + seq(V.k).filter(i => s.s[V.k + i]).length + '|' + s.b : s.s.join('') + s.b) + (V.tipo === 'ponte' ? '|' + s.t : '');
  // o caminho mais rápido (na ponte, o de menos tempo; fora dela, o de menos travessias)
  function travResolver(V, ini, limite) {
    const fim = s => s.s.every(x => x === 1);
    if (V.tipo !== 'ponte') return bfs(ini, s => travChave(V, s), s => travGrupos(V, s).map(g => travCruzar(V, s, g)).filter(t => !travProblema(V, t)), fim);
    // Dijkstra simples (poucos estados)
    const ch = s => s.s.join('') + s.b, best = new Map([[ch(ini), { s: ini, prev: null }]]), abertos = [ini];
    while (abertos.length) {
      abertos.sort((a, b) => a.t - b.t);
      const s = abertos.shift();
      if (fim(s)) { const cam = [s]; let c = best.get(ch(s)).prev; while (c) { cam.unshift(c); c = best.get(ch(c)).prev; } return limite == null || s.t <= limite ? cam : null; }
      for (const g of travGrupos(V, s)) { const t = travCruzar(V, s, g), k = ch(t), b = best.get(k); if (!b || b.s.t > t.t) { best.set(k, { s: t, prev: s }); abertos.push(t); } }
    }
    return null;
  }
  const montarTravessia = memo('travessia', (def, r) => {
    const lv = nv(def.dif), V = travVariante(lv, r), ini = { s: V.itens.map(() => 0), b: 0, t: 0 };
    const cam = travResolver(V, ini);
    if (V.tipo === 'ponte') V.limite = cam[cam.length - 1].t;
    return { pub: V, estado: { s: ini.s, b: 0, t: 0 }, provaCerta: 'travessia', seg: { cam } };
  });
  const travEstado = jg => { const e = jg.estado, n = jg.pub.itens.length; return { s: Array.isArray(e.s) && e.s.length === n && e.s.every(x => x === 0 || x === 1) ? e.s : Array(n).fill(0), b: e.b === 1 ? 1 : 0, t: intOk(e.t, 0, 9999) ? e.t : 0 }; };
  const provaTravessia = jg => { const s = travEstado(jg); return s.s.every(x => x === 1) && (jg.pub.tipo !== 'ponte' || s.t <= jg.pub.limite) ? 'travessia' : null; };
  function dicaTravessia(jg) {
    const V = jg.pub, s = travEstado(jg);
    const cam = travResolver(V, s, V.tipo === 'ponte' ? V.limite : null);
    if (!cam) return { mudas: { s: V.itens.map(() => 0), b: 0, t: 0 }, txt: 'voltar ao começo (dali não dava mais)' };
    if (cam.length < 3) return null;
    const p = cam[1], quem = seq(V.itens.length).filter(i => p.s[i] !== s.s[i]).map(i => V.itens[i]);
    return { mudas: { s: p.s, b: p.b, t: p.t }, txt: 'atravessar: ' + quem.join(' e ') };
  }
  function demoTravessia(m) {
    const V = m.pub, cam = m.seg.cam;
    const regra = V.tipo === 'barqueiro' ? 'Só o barqueiro rema, e o barco leva ele e mais um. Sem o barqueiro por perto, um come o outro.' : V.tipo === 'guardas' ? 'O barco leva até ' + V.cap + '. Numa margem, os ladrões nunca podem ser mais que os guardas (se houver guarda ali).' : 'A ponte aguenta 2 por vez, e precisam da tocha. Os dois andam no passo do mais lento. Têm ' + V.limite + ' minutos.';
    return [
      { txt: regra, alvo: 'it0' },
      { txt: 'Cliquem em quem embarca e depois em Atravessar.', alvo: 'ir', mudas: { s: cam[1].s, b: cam[1].b, t: cam[1].t } },
      { txt: 'Às vezes é preciso trazer alguém de volta.', mudas: { s: cam[2].s, b: cam[2].b, t: cam[2].t } },
      { txt: 'Todos do outro lado: resolvido!', mudas: { s: cam[cam.length - 1].s, b: cam[cam.length - 1].b, t: cam[cam.length - 1].t }, fim: true },
    ];
  }

  /* ======================= Canos de água ======================= */
  const CAN_N = [4, 5, 6, 7, 8], CAN_BUR = [0, 0, 2, 4, 7];
  const BIT = { N: 1, L: 2, S: 4, O: 8 }, OPO = { N: 'S', S: 'N', L: 'O', O: 'L' };
  const girarCano = (m, k) => { let x = m; for (let i = 0; i < (k & 3); i++) x = ((x << 1) | (x >> 3)) & 15; return x; };
  const montarCanos = memo('canos', (def, r) => {
    const lv = nv(def.dif), n = CAN_N[lv];
    for (let t = 0; t < 100; t++) {
      const bur = new Set(embaralhar(seq(n * n), r).slice(0, CAN_BUR[lv]));
      const fonte = sortear(seq(n * n).filter(i => !bur.has(i) && i % n > 0 && i % n < n - 1 && Math.floor(i / n) > 0 && Math.floor(i / n) < n - 1), r);
      const m = Array(n * n).fill(0), vis = new Set([fonte]), front = [fonte];
      while (front.length) {
        const k = Math.floor(r() * front.length), i = front[k];
        const op = Object.keys(D4).filter(d => { const j = passo(n, n, i, d); return j != null && !bur.has(j) && !vis.has(j); });
        // (nenhuma peça com 4 saídas: fica mais bonito e dá mais trabalho)
        if (!op.length || [1, 2, 4, 8].filter(b => m[i] & b).length >= 3) { front.splice(k, 1); continue; }
        const d = sortear(op, r), j = passo(n, n, i, d);
        m[i] |= BIT[d]; m[j] |= BIT[OPO[d]]; vis.add(j); front.push(j);
      }
      if (vis.size !== n * n - bur.size) continue;
      const base = m.map(x => girarCano(x, Math.floor(r() * 4)));
      if (seq(n * n).every(i => base[i] === m[i])) continue;
      return { pub: { n, base, bur: [...bur].sort((a, b) => a - b), fonte }, estado: {}, provaCerta: 'canos:' + n, seg: { sol: m } };
    }
    return { pub: { n: 2, base: [2, 8, 0, 0], bur: [2, 3], fonte: 0 }, estado: {}, provaCerta: 'canos:2', seg: { sol: [2, 8, 0, 0] } };
  });
  const rotCanos = jg => { const t = jg.pub.n * jg.pub.n; return typeof jg.estado.o === 'string' && jg.estado.o.length === t ? jg.estado.o : '0'.repeat(t); };
  const canoDe = (jg, i) => girarCano(jg.pub.base[i], Number(rotCanos(jg)[i]) || 0);
  // as casas com água (ligadas à fonte) e se está tudo certo
  function aguaCanos(jg) {
    const n = jg.pub.n, bur = new Set(jg.pub.bur), agua = new Set([jg.pub.fonte]), fila = [jg.pub.fonte];
    let vaza = false;
    for (let k = 0; k < fila.length; k++) {
      const i = fila[k], m = canoDe(jg, i);
      for (const d of Object.keys(D4)) {
        if (!(m & BIT[d])) continue;
        const j = passo(n, n, i, d);
        if (j == null || bur.has(j) || !(canoDe(jg, j) & BIT[OPO[d]])) { vaza = true; continue; }
        if (!agua.has(j)) { agua.add(j); fila.push(j); }
      }
    }
    return { agua, ok: !vaza && agua.size === n * n - bur.size };
  }
  const provaCanos = jg => (aguaCanos(jg).ok ? 'canos:' + jg.pub.n : null);
  function dicaCanos(jg, m) {
    const d = listaInt(jg.estado.d, 0, 999), n = jg.pub.n, bur = new Set(jg.pub.bur);
    const i = seq(n * n).find(k => !bur.has(k) && !d.includes(k) && canoDe(jg, k) !== m.seg.sol[k]);
    if (i == null) return null;
    const k = seq(4).find(x => girarCano(jg.pub.base[i], x) === m.seg.sol[i]);
    return { mudas: { o: trocaChar(rotCanos(jg), i, String(k)), d: d.concat(i) }, txt: 'um cano no lugar' };
  }
  function solCanos(m) { return m.pub.base.map((b, i) => (m.pub.bur.includes(i) ? '0' : String(seq(4).find(x => girarCano(b, x) === m.seg.sol[i])))).join(''); }
  function demoCanos(m) {
    const sol = solCanos(m), n = m.pub.n, i0 = seq(n * n).find(i => !m.pub.bur.includes(i) && sol[i] !== '0');
    return [
      { txt: 'A água sai da fonte. Girem os canos (um clique gira um quarto de volta) até a água chegar a todos.', alvo: 'c' + m.pub.fonte },
      { txt: 'O cano com água fica azul. Nenhuma ponta pode ficar aberta.', alvo: 'c' + i0, mudas: { o: trocaChar('0'.repeat(n * n), i0, sol[i0]) } },
      { txt: 'Tudo ligado e sem vazar: resolvido!', mudas: { o: sol }, fim: true },
    ];
  }

  /* ======================= Empurrar estátuas ======================= */
  const SOK_N = [6, 7, 7, 8, 8], SOK_K = [1, 2, 2, 3, 4], SOK_PUX = [4, 6, 9, 11, 13];
  const montarSokoban = memo('sokoban', (def, r) => {
    const lv = nv(def.dif), n = SOK_N[lv], k = SOK_K[lv];
    for (let t = 0; t < 400; t++) {
      const par = seq(n * n).map(i => { const x = i % n, y = Math.floor(i / n); return x === 0 || y === 0 || x === n - 1 || y === n - 1 || r() < 0.12 ? '#' : '.'; });
      const livres = seq(n * n).filter(i => par[i] === '.');
      if (livres.length < k + 8) continue;
      // tudo ligado
      const vis = new Set([livres[0]]), fila = [livres[0]];
      for (let q = 0; q < fila.length; q++) for (const d of Object.keys(D4)) { const j = passo(n, n, fila[q], d); if (j != null && par[j] === '.' && !vis.has(j)) { vis.add(j); fila.push(j); } }
      if (vis.size !== livres.length) continue;
      const alvos = embaralhar(livres, r).slice(0, k), caixas = alvos.slice();
      let p = sortear(livres.filter(i => !alvos.includes(i)), r);
      const p0r = p, hist = [];
      let puxoes = 0;
      for (let s = 0; s < 300; s++) {
        const d = sortear(Object.keys(D4), r), np = passo(n, n, p, d);
        if (np == null || par[np] === '#' || caixas.includes(np)) continue;
        const atras = passo(n, n, p, OPO[d]), c = atras == null ? -1 : caixas.indexOf(atras);
        const puxa = c >= 0 && r() < 0.6;
        if (puxa) { caixas[c] = p; puxoes++; }
        hist.push({ d, puxa });
        p = np;
      }
      const fora = caixas.filter(c => !alvos.includes(c)).length;
      if (puxoes < SOK_PUX[lv] || fora < Math.max(1, k - 1)) continue;
      // o caminho de ida (os primeiros lances), ao contrário da volta
      const ida = hist.slice().reverse().map(h => OPO[h.d]);
      return { pub: { n, par: par.join(''), alvos: alvos.sort((a, b) => a - b), b0: caixas.slice(), p0: p }, estado: { p, b: caixas.slice() }, provaCerta: 'estatuas', seg: { ida: ida.slice(0, 6), pFim: p0r } };
    }
    return { pub: { n: 5, par: '######.#.##...##...######'.slice(0, 25), alvos: [12], b0: [11], p0: 10 }, estado: { p: 10, b: [11] }, provaCerta: 'estatuas', seg: { ida: ['L'], pFim: 11 } };
  });
  const sokEstado = jg => { const t = jg.pub.n * jg.pub.n, b = listaInt(jg.estado.b, 0, t - 1, 10); return { p: intOk(jg.estado.p, 0, t - 1) ? jg.estado.p : jg.pub.p0, b: b.length ? b : jg.pub.b0.slice(), f: listaInt(jg.estado.f, 0, t - 1, 10) }; };
  // um passo: → { p, b } novos, ou null (parede, ou estátua que não anda)
  function sokPasso(jg, d) {
    const n = jg.pub.n, s = sokEstado(jg), np = passo(n, n, s.p, d);
    if (np == null || jg.pub.par[np] === '#') return null;
    const c = s.b.indexOf(np);
    if (c < 0) return { p: np, b: s.b, empurrou: false };
    const nb = passo(n, n, np, d);
    if (nb == null || jg.pub.par[nb] === '#' || s.b.includes(nb)) return null;
    const b = s.b.slice(); b[c] = nb;
    return { p: np, b, empurrou: true };
  }
  const provaSokoban = jg => { const s = sokEstado(jg); return jg.pub.alvos.every(a => s.f.includes(a) || s.b.includes(a)) ? 'estatuas' : null; };
  // o próximo empurrão de um caminho que resolve (busca pelos empurrões); → { p, b } ou null
  function sokProximo(jg, orcamento) {
    const p = jg.pub, n = p.n, s0 = sokEstado(jg), falta = p.alvos.filter(a => !s0.f.includes(a));
    const parede = i => p.par[i] === '#';
    const canto = i => !falta.includes(i) && ((parede(i - n) || parede(i + n)) && (parede(i - 1) || parede(i + 1)));
    const alcance = (pl, bs) => { const vis = new Set([pl]), fila = [pl]; for (let k = 0; k < fila.length; k++) for (const d of Object.keys(D4)) { const j = passo(n, n, fila[k], d); if (j != null && !parede(j) && !bs.includes(j) && !vis.has(j)) { vis.add(j); fila.push(j); } } return vis; };
    const ch = (pl, bs) => Math.min(...alcance(pl, bs)) + '|' + bs.slice().sort((a, b) => a - b).join(',');
    const pronto = bs => falta.every(a => bs.includes(a));
    if (pronto(s0.b)) return null;
    const vis = new Map([[ch(s0.p, s0.b), null]]), fila = [{ p: s0.p, b: s0.b }];
    for (let k = 0; k < fila.length && vis.size < (orcamento || 120000); k++) {
      const st = fila[k], al = alcance(st.p, st.b);
      for (let c = 0; c < st.b.length; c++) for (const d of Object.keys(D4)) {
        const atras = passo(n, n, st.b[c], OPO[d]), frente = passo(n, n, st.b[c], d);
        if (atras == null || frente == null || !al.has(atras) || parede(frente) || st.b.includes(frente) || canto(frente)) continue;
        const nb = st.b.slice(); nb[c] = frente;
        const nx = { p: st.b[c], b: nb }, kk = ch(nx.p, nb);
        if (vis.has(kk)) continue;
        vis.set(kk, st); fila.push(nx);
        if (pronto(nb)) { let cur = nx, prev = st; while (vis.get(ch(prev.p, prev.b)) !== null) { cur = prev; prev = vis.get(ch(prev.p, prev.b)); } return cur; }
      }
    }
    return null;
  }
  function dicaSokoban(jg) {
    const x = sokProximo(jg);
    if (x) return { mudas: { p: x.p, b: x.b, h: null }, txt: 'um empurrão certo' };
    const s = sokEstado(jg), livres = jg.pub.alvos.filter(a => !s.f.includes(a) && !s.b.includes(a)), fora = s.b.filter(c => !jg.pub.alvos.includes(c));
    if (fora.length <= 1 || !livres.length) return null;
    return { mudas: { b: s.b.filter(c => c !== fora[0]), f: s.f.concat(livres[0]), h: null }, txt: 'uma estátua já posta na placa' };
  }
  function demoSokoban(m) {
    const p = m.pub, passos = [{ txt: 'Empurrem as estátuas até as placas. Use as setas (ou clique ao lado do personagem).', alvo: 'irN' }];
    let jg = { pub: p, estado: { p: p.p0, b: p.b0 } };
    for (const d of m.seg.ida.slice(0, 3)) { const s = sokPasso(jg, d); if (!s) break; jg = { pub: p, estado: { p: s.p, b: s.b } }; passos.push({ txt: s.empurrou ? 'Estátua só anda empurrada, nunca puxada.' : 'Cuidado com os cantos: estátua no canto não sai mais. Aí, voltem um lance.', alvo: 'ir' + d, mudas: { p: s.p, b: s.b } }); }
    passos.push({ txt: 'Todas nas placas: resolvido!', mudas: { p: m.seg.pFim, b: p.alvos.slice() }, fim: true });
    return passos;
  }

  /* ======================= Chão de gelo ======================= */
  const GEL_N = [6, 7, 8, 9, 10], GEL_MIN = [3, 4, 5, 6, 7], GEL_BUR = [0, 0, 0, 3, 4], GEL_NEVE = [0, 0, 0, 0, 4];
  function deslizarGelo(pub, i, d) {
    const n = pub.n; let p = i;
    for (;;) {
      const j = passo(n, n, p, d);
      if (j == null || pub.pedras.includes(j)) break;
      p = j;
      if (pub.buracos.includes(p)) return { cai: true, p };
      if (pub.neve.includes(p)) break;
    }
    return p === i ? null : { cai: false, p };
  }
  const geloViz = pub => i => Object.keys(D4).map(d => deslizarGelo(pub, i, d)).filter(x => x && !x.cai).map(x => x.p);
  const montarGelo = memo('gelo', (def, r) => {
    const lv = nv(def.dif), n = GEL_N[lv];
    for (let t = 0; t < 300; t++) {
      const cel = embaralhar(seq(n * n), r), qp = Math.round(n * n * 0.15);
      const pedras = cel.slice(0, qp), buracos = cel.slice(qp, qp + GEL_BUR[lv]), neve = cel.slice(qp + GEL_BUR[lv], qp + GEL_BUR[lv] + GEL_NEVE[lv]);
      const ini = cel[qp + GEL_BUR[lv] + GEL_NEVE[lv]];
      const pub = { n, pedras: pedras.sort((a, b) => a - b), buracos: buracos.sort((a, b) => a - b), neve: neve.sort((a, b) => a - b), ini, fim: -1 };
      const dist = new Map([[ini, 0]]), fila = [ini];
      for (let k = 0; k < fila.length; k++) for (const j of geloViz(pub)(fila[k])) if (!dist.has(j)) { dist.set(j, dist.get(fila[k]) + 1); fila.push(j); }
      const ok = fila.filter(j => dist.get(j) >= GEL_MIN[lv] && dist.get(j) <= GEL_MIN[lv] + 3 && !pub.neve.includes(j));
      if (!ok.length) continue;
      pub.fim = ok.sort((a, b) => dist.get(b) - dist.get(a))[0];
      const cam = bfs(ini, x => String(x), geloViz(pub), x => x === pub.fim);
      return { pub, estado: { p: ini }, provaCerta: 'gelo', seg: { cam, dirs: cam.slice(1).map((x, k) => Object.keys(D4).find(d => { const s = deslizarGelo(pub, cam[k], d); return s && !s.cai && s.p === x; })) } };
    }
    return { pub: { n: 3, pedras: [], buracos: [], neve: [], ini: 0, fim: 2 }, estado: { p: 0 }, provaCerta: 'gelo', seg: { cam: [0, 2], dirs: ['L'] } };
  });
  const posGelo = jg => (intOk(jg.estado.p, 0, jg.pub.n * jg.pub.n - 1) ? jg.estado.p : jg.pub.ini);
  const provaGelo = jg => (posGelo(jg) === jg.pub.fim ? 'gelo' : null);
  function dicaGelo(jg) {
    const cam = bfs(posGelo(jg), x => String(x), geloViz(jg.pub), x => x === jg.pub.fim);
    if (!cam || cam.length < 3) return null;
    return { mudas: { p: cam[1], n: (jg.estado.n || 0) + 1 }, txt: 'um deslize certo' };
  }
  function demoGelo(m) {
    const cam = m.seg.cam, dirs = m.seg.dirs;
    return [
      { txt: 'No gelo, quem anda só para quando bate numa pedra ou na borda.' + (m.pub.buracos.length ? ' Buraco: cai e volta ao começo (conta um erro).' : '') + (m.pub.neve.length ? ' Na neve, para.' : ''), alvo: 'ir' + dirs[0] },
      { txt: 'Escolham a direção: o deslize vai até o fim.', alvo: 'ir' + dirs[0], mudas: { p: cam[1] } },
      { txt: 'Precisam PARAR em cima da saída (a bandeira).', alvo: 'm' + m.pub.fim, mudas: cam[2] != null ? { p: cam[2] } : null },
      { txt: 'Chegaram: resolvido!', mudas: { p: m.pub.fim }, fim: true },
    ];
  }

  /* ======================= Resta um ======================= */
  const RU_K = [3, 5, 7, 10, 13];
  function quadroRU(lv) {
    if (lv <= 1) return { w: 5, h: 5, q: '1'.repeat(25) };
    if (lv === 2) return { w: 6, h: 6, q: '1'.repeat(36) };
    return { w: 7, h: 7, q: seq(49).map(i => { const x = i % 7, y = Math.floor(i / 7); return (x < 2 || x > 4) && (y < 2 || y > 4) ? '0' : '1'; }).join('') };
  }
  function pulosRU(pub, p) {
    const out = [];
    for (let i = 0; i < p.length; i++) {
      if (p[i] !== '1') continue;
      for (const d of Object.keys(D4)) {
        const m = passo(pub.w, pub.h, i, d), a = m == null ? null : passo(pub.w, pub.h, m, d);
        if (a == null || pub.q[m] !== '1' || pub.q[a] !== '1' || p[m] !== '1' || p[a] !== '0') continue;
        out.push({ de: i, meio: m, para: a });
      }
    }
    return out;
  }
  const pular = (p, j) => trocaChar(trocaChar(trocaChar(p, j.de, '0'), j.meio, '0'), j.para, '1');
  const montarRestaUm = memo('restaum', (def, r) => {
    const lv = nv(def.dif), Q = quadroRU(lv), K = RU_K[lv];
    for (let t = 0; t < 300; t++) {
      const casas = seq(Q.q.length).filter(i => Q.q[i] === '1');
      const fim = lv === 4 ? 24 : sortear(casas, r);
      let p = seq(Q.q.length).map(i => (i === fim ? '1' : '0')).join('');
      const ida = [];
      for (let k = 0; k < K; k++) {
        // o contrário de um pulo: um pino em z volta para x, e o y reaparece
        const op = [];
        for (const z of casas) { if (p[z] !== '1') continue; for (const d of Object.keys(D4)) { const y = passo(Q.w, Q.h, z, d), x = y == null ? null : passo(Q.w, Q.h, y, d); if (x == null || Q.q[y] !== '1' || Q.q[x] !== '1' || p[y] !== '0' || p[x] !== '0') continue; op.push({ de: x, meio: y, para: z }); } }
        if (!op.length) break;
        const j = sortear(op, r);
        p = trocaChar(trocaChar(trocaChar(p, j.para, '0'), j.meio, '1'), j.de, '1');
        ida.unshift(j);
      }
      if (ida.length < K) continue;
      return { pub: { w: Q.w, h: Q.h, q: Q.q, p0: p, centro: lv === 4 ? 24 : null }, estado: { p }, provaCerta: 'resta1', seg: { ida, fim } };
    }
    return null;
  });
  const pinosRU = jg => (typeof jg.estado.p === 'string' && jg.estado.p.length === jg.pub.q.length ? jg.estado.p : jg.pub.p0);
  const provaRestaUm = jg => { const p = pinosRU(jg), q = [...p].filter(c => c === '1').length; return q === 1 && (jg.pub.centro == null || p[jg.pub.centro] === '1') ? 'resta1' : null; };
  function saidaRU(pub, p, memoRU) {
    const ok = q => [...q].filter(c => c === '1').length === 1 && (pub.centro == null || q[pub.centro] === '1');
    if (ok(p)) return [];
    if (memoRU.has(p)) return null;
    for (const j of pulosRU(pub, p)) { const c = saidaRU(pub, pular(p, j), memoRU); if (c) return [j].concat(c); }
    memoRU.add(p);
    return null;
  }
  function dicaRestaUm(jg) {
    const p = pinosRU(jg), c = saidaRU(jg.pub, p, new Set());
    if (!c) return { mudas: { p: jg.pub.p0 }, txt: 'voltar ao começo (dali não dava mais)' };
    if (c.length < 2) return null;
    return { mudas: { p: pular(p, c[0]) }, txt: 'um pulo certo' };
  }
  function demoRestaUm(m) {
    const p = m.pub, ida = m.seg.ida; let q = p.p0;
    const passos = [{ txt: 'Um pino pula outro, vizinho, e cai no buraco logo depois. O pino pulado sai.', alvo: 'h' + ida[0].de }];
    q = pular(q, ida[0]); passos.push({ txt: 'Cliquem no pino e depois no buraco onde ele cai.', alvo: 'h' + ida[0].para, mudas: { p: q } });
    passos.push({ txt: 'Só vale pular em linha reta, sem diagonal.' + (p.centro != null ? ' Neste nível, o último pino tem que ficar no centro.' : ''), alvo: ida[1] ? 'h' + ida[1].de : null });
    passos.push({ txt: 'Sobrou um: resolvido!', mudas: { p: seq(p.q.length).map(i => (i === m.seg.fim ? '1' : '0')).join('') }, fim: true });
    return passos;
  }

  /* ======================= Pontes entre ilhas ======================= */
  const PON_N = [5, 7, 8, 9, 10], PON_K = [4, 6, 9, 12, 15];
  const chavePonte = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
  // as casas entre duas ilhas alinhadas (sem as pontas); null se não estão alinhadas
  function entrePonte(ilhas, a, b) {
    const [ax, ay] = ilhas[a], [bx, by] = ilhas[b];
    if (ax !== bx && ay !== by) return null;
    const o = [];
    if (ay === by) for (let x = Math.min(ax, bx) + 1; x < Math.max(ax, bx); x++) o.push([x, ay]);
    else for (let y = Math.min(ay, by) + 1; y < Math.max(ay, by); y++) o.push([ax, y]);
    return o;
  }
  function parValido(ilhas, a, b) {
    const e = entrePonte(ilhas, a, b);
    return !!e && e.length > 0 && !ilhas.some(([x, y], k) => k !== a && k !== b && e.some(([ex, ey]) => ex === x && ey === y));
  }
  function cruzam(ilhas, p, q) {
    const [a, b] = p, [c, d] = q;
    if (a === c || a === d || b === c || b === d) return false;
    const e1 = entrePonte(ilhas, a, b), e2 = entrePonte(ilhas, c, d);
    return !!e1 && !!e2 && e1.some(([x, y]) => e2.some(([u, v]) => u === x && v === y));
  }
  const montarPontes = memo('pontes', (def, r) => {
    const lv = nv(def.dif), n = PON_N[lv], K = PON_K[lv];
    for (let t = 0; t < 300; t++) {
      const ilhas = [[Math.floor(r() * n), Math.floor(r() * n)]], ocupada = new Set(), pontes = {};
      const perto = (x, y) => ilhas.some(([a, b]) => Math.abs(a - x) <= 1 && Math.abs(b - y) <= 1);
      for (let tent = 0; tent < 600 && ilhas.length < K; tent++) {
        const i = Math.floor(r() * ilhas.length), d = sortear(Object.keys(D4), r), dist = 2 + Math.floor(r() * (n - 2));
        const x = ilhas[i][0] + D4[d][0] * dist, y = ilhas[i][1] + D4[d][1] * dist;
        if (x < 0 || y < 0 || x >= n || y >= n || perto(x, y) || ocupada.has(y * n + x)) continue;
        ilhas.push([x, y]);
        const k = ilhas.length - 1, e = entrePonte(ilhas, i, k);
        if (e.some(([ex, ey]) => ocupada.has(ey * n + ex) || ilhas.some(([a, b], j) => j !== i && j !== k && a === ex && b === ey))) { ilhas.pop(); continue; }
        for (const [ex, ey] of e) ocupada.add(ey * n + ex);
        pontes[chavePonte(i, k)] = r() < 0.35 ? 2 : 1;
      }
      if (ilhas.length < K) continue;
      // algumas pontes a mais entre ilhas já alinhadas (fazem voltas)
      for (let a = 0; a < K; a++) for (let b = a + 1; b < K; b++) {
        if (pontes[chavePonte(a, b)] || !parValido(ilhas, a, b) || r() > 0.3) continue;
        const e = entrePonte(ilhas, a, b);
        if (e.some(([ex, ey]) => ocupada.has(ey * n + ex))) continue;
        for (const [ex, ey] of e) ocupada.add(ey * n + ex);
        pontes[chavePonte(a, b)] = r() < 0.3 ? 2 : 1;
      }
      const num = ilhas.map((_, k) => Object.keys(pontes).reduce((s, c) => s + (c.split('-').map(Number).includes(k) ? pontes[c] : 0), 0));
      return { pub: { n, ilhas: ilhas.map(([x, y], k) => [x, y, num[k]]) }, estado: {}, provaCerta: 'pontes:' + K, seg: { b: pontes } };
    }
    return null;
  });
  const pontesDe = jg => { const o = {}, b = ehObj(jg.estado.b) ? jg.estado.b : {}; for (const k of Object.keys(b)) if (/^\d+-\d+$/.test(k) && (b[k] === 1 || b[k] === 2)) o[k] = b[k]; return o; };
  function estadoPontes(jg) {
    const il = jg.pub.ilhas, b = pontesDe(jg), grau = il.map(() => 0), pares = Object.keys(b).map(k => k.split('-').map(Number));
    for (const [a, c] of pares) { grau[a] += b[chavePonte(a, c)]; grau[c] += b[chavePonte(a, c)]; }
    const cruz = new Set();
    for (let i = 0; i < pares.length; i++) for (let j = i + 1; j < pares.length; j++) if (cruzam(il, pares[i], pares[j])) { cruz.add(chavePonte(...pares[i])); cruz.add(chavePonte(...pares[j])); }
    const vis = new Set([0]), fila = [0];
    for (let k = 0; k < fila.length; k++) for (const [a, c] of pares) { const o = a === fila[k] ? c : c === fila[k] ? a : -1; if (o >= 0 && !vis.has(o)) { vis.add(o); fila.push(o); } }
    return { grau, cruz, ligadas: vis.size === il.length };
  }
  const provaPontes = jg => { const s = estadoPontes(jg); return s.grau.every((g, k) => g === jg.pub.ilhas[k][2]) && !s.cruz.size && s.ligadas ? 'pontes:' + jg.pub.ilhas.length : null; };
  function dicaPontes(jg, m) {
    const b = pontesDe(jg), k = Object.keys(m.seg.b).find(c => b[c] !== m.seg.b[c]);
    if (!k) return null;
    const nb = Object.assign({}, b, { [k]: m.seg.b[k] }), par = k.split('-').map(Number);
    for (const c of Object.keys(nb)) if (c !== k && cruzam(jg.pub.ilhas, par, c.split('-').map(Number))) delete nb[c];
    return { mudas: { b: nb }, txt: 'uma ponte certa' };
  }
  function demoPontes(m) {
    const ks = Object.keys(m.seg.b), [a, b] = ks[0].split('-').map(Number);
    return [
      { txt: 'O número de cada ilha diz quantas pontes saem dela. Pontes só em linha reta, no máximo 2 entre duas ilhas.', alvo: 'i' + a },
      { txt: 'Cliquem numa ilha e depois em outra: uma ponte. Repetindo: duas. Mais uma vez: nenhuma.', alvo: 'i' + b, mudas: { b: { [ks[0]]: m.seg.b[ks[0]] } } },
      { txt: 'Pontes não se cruzam, e todas as ilhas têm que ficar ligadas.', alvo: 'i' + a },
      { txt: 'Resolvido!', mudas: { b: Object.assign({}, m.seg.b) }, fim: true },
    ];
  }

  /* ======================= Trilhos ======================= */
  const TRI_N = [5, 6, 7, 8, 9], TRI_DADAS = [3, 2, 2, 1, 1], TRI_OCULTAS = [0, 0, 0, 2, 4];
  const naBorda = (n, i) => { const x = i % n, y = Math.floor(i / n); return x === 0 || y === 0 || x === n - 1 || y === n - 1; };
  const ladoBorda = (n, i, exceto) => { const x = i % n, y = Math.floor(i / n); return ['O', 'N', 'L', 'S'].find(d => d !== exceto && ((d === 'O' && x === 0) || (d === 'L' && x === n - 1) || (d === 'N' && y === 0) || (d === 'S' && y === n - 1))); };
  const montarTrilhos = memo('trilhos', (def, r) => {
    const lv = nv(def.dif), n = TRI_N[lv], min = Math.round(n * n * 0.35), max = Math.round(n * n * 0.58);
    for (let t = 0; t < 600; t++) {
      const ini = Math.floor(r() * n) * n, cam = [ini], tem = new Set(cam);
      let ok = false;
      for (let s = 0; s < max * 3 && cam.length < max; s++) {
        const u = cam[cam.length - 1];
        const op = embaralhar(Object.keys(D4), r).map(d => passo(n, n, u, d)).filter(j => j != null && !tem.has(j) && Object.keys(D4).every(d => { const v = passo(n, n, j, d); return v == null || v === u || !tem.has(v); }));
        if (!op.length) break;
        const j = op[0]; cam.push(j); tem.add(j);
        if (cam.length >= min && naBorda(n, j) && j % n !== 0 && r() < 0.35) { ok = true; break; }
      }
      const fim = cam[cam.length - 1];
      if (!ok && !(cam.length >= min && naBorda(n, fim) && fim % n !== 0)) continue;
      const lin = seq(n).map(y => cam.filter(c => Math.floor(c / n) === y).length), col = seq(n).map(x => cam.filter(c => c % n === x).length);
      const oc = embaralhar(seq(2 * n), r).slice(0, TRI_OCULTAS[lv]);
      const dadas = embaralhar(cam.slice(1, -1), r).slice(0, TRI_DADAS[lv]).sort((a, b) => a - b);
      return { pub: { n, ini, fim, saida: ladoBorda(n, fim, null), lin: lin.map((v, y) => (oc.includes(y) ? null : v)), col: col.map((v, x) => (oc.includes(n + x) ? null : v)), dadas }, estado: {}, provaCerta: 'trilhos', seg: { cam } };
    }
    return null;
  });
  const triT = jg => { const t = jg.pub.n * jg.pub.n; return typeof jg.estado.t === 'string' && jg.estado.t.length === t ? jg.estado.t : '.'.repeat(t); };
  const temTrilho = (jg, i) => i === jg.pub.ini || i === jg.pub.fim || jg.pub.dadas.includes(i) || triT(jg)[i] === '1';
  function provaTrilhos(jg) {
    const n = jg.pub.n, S = seq(n * n).filter(i => temTrilho(jg, i)), tem = new Set(S);
    for (let y = 0; y < n; y++) if (jg.pub.lin[y] != null && S.filter(c => Math.floor(c / n) === y).length !== jg.pub.lin[y]) return null;
    for (let x = 0; x < n; x++) if (jg.pub.col[x] != null && S.filter(c => c % n === x).length !== jg.pub.col[x]) return null;
    for (const c of S) { const g = Object.keys(D4).filter(d => { const v = passo(n, n, c, d); return v != null && tem.has(v); }).length; if (g !== (c === jg.pub.ini || c === jg.pub.fim ? 1 : 2)) return null; }
    const vis = new Set([jg.pub.ini]), fila = [jg.pub.ini];
    for (let k = 0; k < fila.length; k++) for (const d of Object.keys(D4)) { const v = passo(n, n, fila[k], d); if (v != null && tem.has(v) && !vis.has(v)) { vis.add(v); fila.push(v); } }
    return vis.size === S.length ? 'trilhos' : null;
  }
  function dicaTrilhos(jg, m) {
    const t = triT(jg), cam = new Set(m.seg.cam), d = listaInt(jg.estado.d, 0, 999);
    const errada = seq(t.length).find(i => t[i] === '1' && !cam.has(i));
    if (errada != null) return { mudas: { t: trocaChar(t, errada, 'x'), d: d.concat(errada) }, txt: 'uma casa sem trilho' };
    const i = m.seg.cam.find(c => !temTrilho(jg, c));
    if (i == null) return null;
    return { mudas: { t: trocaChar(t, i, '1'), d: d.concat(i) }, txt: 'uma casa com trilho' };
  }
  function demoTrilhos(m) {
    const p = m.pub, cam = m.seg.cam; let t = '.'.repeat(p.n * p.n);
    const a = cam[1];
    if (!p.dadas.includes(a)) t = trocaChar(t, a, '1');
    const passos = [{ txt: 'O trem entra pela seta da esquerda e sai pela outra seta. Os números contam as casas com trilho em cada linha e coluna.', alvo: 'c' + p.ini }];
    passos.push({ txt: 'Clique põe trilho. Com o botão direito (ou o modo ✕), marquem onde não passa.', alvo: 'c' + a, mudas: { t } });
    for (const c of cam) if (c !== p.ini && c !== p.fim && !p.dadas.includes(c)) t = trocaChar(t, c, '1');
    passos.push({ txt: 'O trilho é uma linha só, sem se encostar nele mesmo: resolvido!', mudas: { t }, fim: true });
    return passos;
  }

  /* ======================= Constelação ======================= */
  const CON_S = [5, 7, 9, 11, 13], CON_E = [6, 9, 13, 17, 21];
  function distSeg(p, a, b) {
    const [px, py] = p, [ax, ay] = a, [bx, by] = b, dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l));
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  }
  const montarConstelacao = memo('constelacao', (def, r) => {
    const lv = nv(def.dif), S = CON_S[lv], M = CON_E[lv];
    for (let t = 0; t < 500; t++) {
      const st = [];
      for (let k = 0; k < 400 && st.length < S; k++) { const p = [8 + Math.round(r() * 84), 8 + Math.round(r() * 84)]; if (st.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) >= 18)) st.push(p); }
      if (st.length < S) continue;
      const usada = new Set(), trilha = [Math.floor(r() * S)];
      for (let k = 0; k < M * 6 && usada.size < M; k++) {
        const a = trilha[trilha.length - 1];
        const op = seq(S).filter(b => b !== a && !usada.has(chavePonte(a, b)) && Math.hypot(st[a][0] - st[b][0], st[a][1] - st[b][1]) < 62 && st.every((q, j) => j === a || j === b || distSeg(q, st[a], st[b]) > 6));
        if (!op.length) break;
        const b = sortear(op, r); usada.add(chavePonte(a, b)); trilha.push(b);
      }
      if (usada.size < M || new Set(trilha).size < S) continue;
      const ar = [];
      for (let k = 1; k < trilha.length; k++) { const a = trilha[k - 1], b = trilha[k]; ar.push(lv === 4 && r() < 0.4 ? [a, b, 1] : [Math.min(a, b), Math.max(a, b), 0]); }
      return { pub: { st, ar: embaralhar(ar, r), ini: lv < 2 ? trilha[0] : null }, estado: {}, provaCerta: 'const:' + M, seg: { trilha } };
    }
    return null;
  });
  const trilhaCon = jg => listaInt(jg.estado.t, 0, jg.pub.st.length - 1, 80);
  // a aresta k serve para ir de a até b?
  const serveAresta = (e, a, b) => (e[2] === 1 ? e[0] === a && e[1] === b : (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a));
  // as arestas usadas (índices) pela trilha, ou null se a trilha não vale
  function usadasCon(pub, t) {
    const us = [];
    for (let k = 1; k < t.length; k++) { const i = pub.ar.findIndex((e, j) => !us.includes(j) && serveAresta(e, t[k - 1], t[k])); if (i < 0) return null; us.push(i); }
    return us;
  }
  const provaConstelacao = jg => { const t = trilhaCon(jg), us = usadasCon(jg.pub, t); return us && us.length === jg.pub.ar.length && (jg.pub.ini == null || t[0] === jg.pub.ini) ? 'const:' + jg.pub.ar.length : null; };
  function dicaConstelacao(jg, m) {
    const t = trilhaCon(jg), tr = m.seg.trilha;
    let L = 0; while (L < t.length && L < tr.length && t[L] === tr[L]) L++;
    if (L + 1 >= tr.length - 1) return null;
    return { mudas: { t: tr.slice(0, L + 1 + (L === 0 ? 1 : 0)) }, txt: 'o traço certo até a próxima estrela' };
  }
  function demoConstelacao(m) {
    const tr = m.seg.trilha;
    return [
      { txt: 'Passem por todas as linhas da constelação sem tirar a pena e sem repetir linha.' + (m.pub.ini != null ? ' Comecem na estrela que brilha.' : ' Escolher onde começar faz parte do puzzle.'), alvo: 's' + tr[0], mudas: { t: [tr[0]] } },
      { txt: 'Cliquem na próxima estrela ligada.' + (m.pub.ar.some(e => e[2]) ? ' As setas só deixam passar num sentido.' : ''), alvo: 's' + tr[1], mudas: { t: tr.slice(0, 2) } },
      { txt: 'Travou? Desfaçam o último traço ou recomecem.', alvo: 'desfaz', mudas: { t: tr.slice(0, 3) } },
      { txt: 'Todas as linhas traçadas: resolvido!', mudas: { t: tr.slice() }, fim: true },
    ];
  }

  /* ======================= Encaixar peças ======================= */
  const ENC_N = [4, 5, 6, 6, 7], ENC_K = [4, 5, 7, 7, 9], ENC_BUR = [0, 0, 0, 0, 4];
  const normForma = cs => { const mx = Math.min(...cs.map(c => c[0])), my = Math.min(...cs.map(c => c[1])); return cs.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]); };
  // orientação o: 0–3 giros (sentido do relógio) + 4 espelhado
  const orientar = (cs, o) => normForma(cs.map(([x, y]) => { let a = o & 4 ? -x : x, b = y; for (let k = 0; k < (o & 3); k++) { const na = -b; b = a; a = na; } return [a, b]; }));
  const mesmaForma = (a, b) => a.length === b.length && a.every((c, i) => c[0] === b[i][0] && c[1] === b[i][1]);
  const montarEncaixar = memo('encaixar', (def, r) => {
    const lv = nv(def.dif), n = ENC_N[lv], K = ENC_K[lv], gira = lv >= 1, espelha = lv >= 3;
    for (let t = 0; t < 300; t++) {
      const bur = embaralhar(seq(n * n), r).slice(0, ENC_BUR[lv]);
      const livres = seq(n * n).filter(i => !bur.includes(i));
      const dono = Array(n * n).fill(-1), sementes = embaralhar(livres, r).slice(0, K);
      sementes.forEach((s, k) => { dono[s] = k; });
      const tam = sementes.map(() => 1), livreSet = new Set(livres);
      const borda = k => { const o = []; for (let i = 0; i < n * n; i++) if (dono[i] === k) for (const d of Object.keys(D4)) { const j = passo(n, n, i, d); if (j != null && livreSet.has(j) && dono[j] === -1) o.push(j); } return o; };
      for (let falta = livres.length - K; falta > 0;) {
        const ks = seq(K).filter(k => tam[k] < 7).sort((a, b) => tam[a] - tam[b] + (r() - 0.5) * 2.5);
        let cresceu = false;
        for (const k of ks) { const b = borda(k); if (!b.length) continue; dono[sortear(b, r)] = k; tam[k]++; falta--; cresceu = true; break; }
        if (!cresceu) break;
      }
      if (livres.some(i => dono[i] === -1) || tam.some(x => x < 2 || x > 7)) continue;
      const pecas = [], sol = [];
      let ok = true;
      for (let k = 0; k < K; k++) {
        const cel = livres.filter(i => dono[i] === k), forma = normForma(cel.map(i => [i % n, Math.floor(i / n)]));
        const oVis = gira ? Math.floor(r() * 4) + (espelha && r() < 0.5 ? 4 : 0) : 0, vis = orientar(forma, oVis);
        const oSol = [0, 1, 2, 3, 4, 5, 6, 7].filter(o => (gira || o === 0) && (espelha || o < 4)).find(o => mesmaForma(orientar(vis, o), forma));
        if (oSol == null) { ok = false; break; }
        pecas.push(vis); sol.push({ a: cel.sort((a, b) => a - b)[0], o: oSol });
      }
      if (!ok) continue;
      return { pub: { n, bur: bur.sort((a, b) => a - b), pecas, gira, espelha }, estado: {}, provaCerta: 'encaixe:' + K, seg: { sol } };
    }
    return null;
  });
  const pecaEst = (jg, i) => { const q = jg.estado['q' + i]; return { a: ehObj(q) && intOk(q.a, 0, jg.pub.n * jg.pub.n - 1) ? q.a : null, o: ehObj(q) && intOk(q.o, 0, 7) ? q.o : 0 }; };
  // as casas que a peça i ocupa na posição (a, o): → lista ou null (sai do quadro)
  function casasPeca(pub, i, a, o) {
    const f = orientar(pub.pecas[i], o), n = pub.n, ax = a % n, ay = Math.floor(a / n), out = [];
    for (const [x, y] of f) { const cx = ax + x - f[0][0], cy = ay + y - f[0][1]; if (cx < 0 || cy < 0 || cx >= n || cy >= n) return null; out.push(cy * n + cx); }
    return out;
  }
  function ocupacao(jg, menos) {
    const occ = {};
    jg.pub.pecas.forEach((_, i) => { if (i === menos) return; const e = pecaEst(jg, i); if (e.a == null) return; for (const c of casasPeca(jg.pub, i, e.a, e.o) || []) occ[c] = i; });
    return occ;
  }
  const provaEncaixar = jg => { const p = jg.pub, livres = p.n * p.n - p.bur.length; if (!p.pecas.every((_, i) => pecaEst(jg, i).a != null)) return null; const occ = ocupacao(jg, -1); let tot = 0; for (let i = 0; i < p.pecas.length; i++) { const e = pecaEst(jg, i), cs = casasPeca(p, i, e.a, e.o); if (!cs || cs.some(c => p.bur.includes(c))) return null; tot += cs.length; } return Object.keys(occ).length === livres && tot === livres ? 'encaixe:' + p.pecas.length : null; };
  function dicaEncaixar(jg, m) {
    const p = jg.pub, i = seq(p.pecas.length).find(k => { const e = pecaEst(jg, k), s = m.seg.sol[k]; return e.a !== s.a || !mesmaForma(orientar(p.pecas[k], e.o), orientar(p.pecas[k], s.o)); });
    if (i == null) return null;
    const s = m.seg.sol[i], novas = casasPeca(p, i, s.a, s.o), mudas = { ['q' + i]: { a: s.a, o: s.o } };
    p.pecas.forEach((_, k) => { if (k === i) return; const e = pecaEst(jg, k); if (e.a == null) return; const cs = casasPeca(p, k, e.a, e.o) || []; if (cs.some(c => novas.includes(c))) mudas['q' + k] = { a: null, o: e.o }; });
    return { mudas, txt: 'uma peça no lugar' };
  }
  function demoEncaixar(m) {
    const s = m.seg.sol, todas = {};
    s.forEach((x, i) => { todas['q' + i] = { a: x.a, o: x.o }; });
    return [
      { txt: 'Encham o quadro com todas as peças, sem sobrar buraco.' + (m.pub.gira ? ' Girar' + (m.pub.espelha ? ' e espelhar' : '') + ' faz parte.' : ''), alvo: 'pc0' },
      { txt: 'Escolham a peça embaixo e cliquem na casa onde vai o quadradinho marcado dela.', alvo: 'b' + s[0].a, mudas: { q0: { a: s[0].a, o: s[0].o } } },
      { txt: 'Clicar numa peça do quadro devolve ela.', alvo: 'b' + s[0].a },
      { txt: 'Tudo encaixado: resolvido!', mudas: todas, fim: true },
    ];
  }

  /* ======================= Mapa e bússola ======================= */
  const MARCOS = ['Poço', 'Árvore velha', 'Pedra grande', 'Ruína', 'Estátua', 'Fogueira', 'Cruz de pedra', 'Toco', 'Moinho', 'Lago'];
  const BUS_N = [6, 7, 8, 9, 10], BUS_I = [3, 4, 5, 6, 6], BUS_M = [4, 5, 6, 7, 8];
  const D8 = { N: [0, -1], NE: [1, -1], L: [1, 0], SE: [1, 1], S: [0, 1], SO: [-1, 1], O: [-1, 0], NO: [-1, -1] };
  const NOME_D = { N: 'norte', NE: 'nordeste', L: 'leste', SE: 'sudeste', S: 'sul', SO: 'sudoeste', O: 'oeste', NO: 'noroeste' };
  const RODA = ['N', 'L', 'S', 'O'];
  const plural = (q, s, p) => q + ' ' + (q === 1 ? s : p);
  function normBus(p, o) {
    const d = p.bus;
    if (!ehObj(d) || !Array.isArray(d.passos)) return;
    const passos = d.passos.filter(ehObj).map(x => ({ d: Object.prototype.hasOwnProperty.call(D8, x.d) ? x.d : 'N', n: intOk(Number(x.n), 1, 9) ? Number(x.n) : 1 })).slice(0, 8);
    if (passos.length) o.bus = { passos };
  }
  // anda as instruções a partir de "ini"; → as casas depois de cada uma (null se sai do mapa)
  function andarBus(pub, ins, ini, face0) {
    const n = pub.n, out = [];
    let x = ini % n, y = Math.floor(ini / n), f = face0;
    const marco = (cx, cy) => (pub.marcos.find(m => m[0] === cy * n + cx) || [])[1];
    for (const it of ins) {
      if (it.k === 'abs') { x += D8[it.d][0] * it.n; y += D8[it.d][1] * it.n; }
      else if (it.k === 'vire') f = RODA[(RODA.indexOf(f) + (it.l === 'd' ? 1 : it.l === 'e' ? 3 : 2)) % 4];
      else if (it.k === 'ande' || it.k === 'legua') { const q = it.k === 'legua' ? it.n * 2 : it.n; x += D4[f][0] * q; y += D4[f][1] * q; }
      else if (it.k === 'volte') { x -= D4[f][0] * it.n; y -= D4[f][1] * it.n; }
      else if (it.k === 'ate') { let k = 0; do { x += D4[f][0]; y += D4[f][1]; k++; } while (k < n && x >= 0 && y >= 0 && x < n && y < n && marco(x, y) !== it.m); }
      if (x < 0 || y < 0 || x >= n || y >= n) return null;
      out.push(y * n + x);
    }
    return out;
  }
  function textoBus(it, pub) {
    switch (it.k) {
      case 'abs': return 'Andem ' + plural(it.n, 'passo', 'passos') + ' para o ' + NOME_D[it.d] + '.';
      case 'vire': return it.l === 'd' ? 'Virem à direita.' : it.l === 'e' ? 'Virem à esquerda.' : 'Deem meia-volta.';
      case 'ande': return 'Andem ' + plural(it.n, 'passo', 'passos') + ' para a frente.';
      case 'legua': return 'Andem ' + plural(it.n, 'légua', 'léguas') + ' para a frente.';
      case 'volte': return 'Voltem ' + plural(it.n, 'passo', 'passos') + ' de costas, sem virar.';
      case 'ate': return 'Andem para a frente até chegar ' + (/^[AÁ]/.test(MARCOS[it.m]) || /^(Ruína|Estátua|Fogueira|Cruz|Pedra)/.test(MARCOS[it.m]) ? 'à ' : 'ao ') + MARCOS[it.m] + '.';
    }
    return '';
  }
  const montarBussola = memo('bussola', (def, r) => {
    const lv = nv(def.dif), manual = def.bus;
    for (let t = 0; t < 600; t++) {
      let n = BUS_N[lv];
      const tipos = embaralhar(seq(MARCOS.length), r), m0 = tipos[0];
      let ins = [], face = null, ini;
      if (manual) {
        ins = manual.passos.map(p => ({ k: 'abs', d: p.d, n: p.n }));
        // o tamanho e o começo que fazem o caminho caber
        let x = 0, y = 0, mnx = 0, mny = 0, mxx = 0, mxy = 0;
        for (const it of ins) { x += D8[it.d][0] * it.n; y += D8[it.d][1] * it.n; mnx = Math.min(mnx, x); mny = Math.min(mny, y); mxx = Math.max(mxx, x); mxy = Math.max(mxy, y); }
        n = Math.min(14, Math.max(n, mxx - mnx + 2, mxy - mny + 2));
        const sx = -mnx + Math.floor(r() * Math.max(1, n - (mxx - mnx))), sy = -mny + Math.floor(r() * Math.max(1, n - (mxy - mny)));
        ini = Math.min(n - 1, sy) * n + Math.min(n - 1, sx);
      } else ini = Math.floor(r() * n * n);
      const pub = { n, marcos: [[ini, m0]], ins: [], legua: lv === 4, face: null };
      if (!manual) {
        if (lv >= 2) face = sortear(RODA, r);
        let cur = ini, f = face, q = 0, viz = 1;
        const usados = new Set([ini]);
        for (let k = 0; k < BUS_I[lv] && q < 40; q++) {
          let it;
          if (lv <= 1) { const ds = lv === 0 ? RODA : Object.keys(D8); it = { k: 'abs', d: sortear(ds, r), n: 1 + Math.floor(r() * (lv === 0 ? 3 : 4)) }; }
          else {
            const op = ['vire', 'ande'].concat(lv >= 3 ? ['ate'] : []).concat(lv >= 4 ? ['legua', 'volte'] : []);
            const tp = k === 0 ? 'ande' : sortear(op, r);
            if (tp === 'vire') it = { k: 'vire', l: sortear(['d', 'e', 'm'], r) };
            else if (tp === 'ate') {
              const dist = 2 + Math.floor(r() * 3), x = (cur % n) + D4[f][0] * dist, y = Math.floor(cur / n) + D4[f][1] * dist;
              const ok = x >= 0 && y >= 0 && x < n && y < n && !pub.marcos.some(mm => mm[0] === y * n + x) && seq(dist - 1).every(s => { const cx = (cur % n) + D4[f][0] * (s + 1), cy = Math.floor(cur / n) + D4[f][1] * (s + 1); return !pub.marcos.some(mm => mm[0] === cy * n + cx); });
              if (!ok) continue;
              const mk = tipos[viz % tipos.length]; viz++;
              pub.marcos.push([y * n + x, mk]); it = { k: 'ate', m: mk };
            } else if (tp === 'legua') it = { k: 'legua', n: 1 + Math.floor(r() * 2) };
            else if (tp === 'volte') it = { k: 'volte', n: 1 + Math.floor(r() * 2) };
            else it = { k: 'ande', n: 1 + Math.floor(r() * 3) };
          }
          const cam = andarBus(pub, ins.concat(it), ini, face);
          if (!cam) { if (it.k === 'ate') pub.marcos.pop(); continue; }
          if (it.k !== 'vire' && usados.has(cam[cam.length - 1]) && it.k !== 'ate') continue;
          ins.push(it); cur = cam[cam.length - 1]; usados.add(cur);
          if (it.k === 'vire') f = RODA[(RODA.indexOf(f) + (it.l === 'd' ? 1 : it.l === 'e' ? 3 : 2)) % 4];
          k++;
        }
        if (ins.length < BUS_I[lv] || ins[ins.length - 1].k === 'vire') continue;
      }
      const cam = andarBus(pub, ins, ini, face);
      if (!cam) { if (manual) return { pub: Object.assign(pub, { ins: ['(O caminho sai do mapa: confira as instruções.)'], erro: true }), estado: {}, provaCerta: 'x:' + ini, seg: { fim: ini, cam: [ini] } }; continue; }
      const fim = cam[cam.length - 1];
      if (fim === ini) continue;
      // os marcos que só enfeitam (longe do caminho)
      const noCaminho = new Set([ini].concat(cam));
      const livres = embaralhar(seq(n * n).filter(i => !noCaminho.has(i) && !pub.marcos.some(mm => mm[0] === i)), r);
      let k = 0;
      while (pub.marcos.length < BUS_M[lv] && livres.length) { const i = livres.pop(); const tp = tipos[(pub.marcos.length + k) % tipos.length]; if (tp === m0 && pub.marcos.some(mm => mm[1] === m0)) { k++; continue; } pub.marcos.push([i, tp]); }
      // (os enfeites não podem mudar o "até")
      const conf = andarBus(pub, ins, ini, face);
      if (!conf || conf[conf.length - 1] !== fim) continue;
      pub.face = face;
      pub.ins = ['Comecem ' + (/^[AÁ]/.test(MARCOS[m0]) || /^(Ruína|Estátua|Fogueira|Cruz|Pedra)/.test(MARCOS[m0]) ? 'na ' : 'no ') + MARCOS[m0] + '.' + (face ? ' Olhem para o ' + NOME_D[face] + '.' : '')].concat(ins.map(it => textoBus(it, pub)));
      return { pub, estado: {}, provaCerta: 'x:' + fim, seg: { fim, cam: [ini].concat(cam) } };
    }
    return null;
  });
  const provaBussola = (jg, t) => (t && intOk(t.c, 0, jg.pub.n * jg.pub.n - 1) ? 'x:' + t.c : null);
  function dicaBussola(jg, m) {
    const d = intOk(jg.estado.d, 0, 20) ? jg.estado.d : 0;
    if (d + 2 >= m.seg.cam.length) return null;
    return { mudas: { d: d + 1, dc: m.seg.cam.slice(0, d + 2) }, txt: 'onde vocês estão depois da instrução ' + (d + 1) };
  }
  function demoBussola(m) {
    return [
      { txt: 'Sigam as instruções do mapa, uma de cada vez, a partir do marco do começo.' + (m.pub.legua ? ' Uma légua são 2 casas.' : ''), alvo: 'in0' },
      { txt: m.pub.face ? 'Virar à direita ou à esquerda muda para onde vocês olham. Prestem atenção na frente.' : 'Norte é para cima, como em todo mapa.', alvo: 'in1', mudas: { d: 1, dc: m.seg.cam.slice(0, 2) } },
      { txt: 'No fim, cliquem na casa do tesouro. Errar conta um erro.', alvo: 'm' + m.seg.fim },
      { txt: 'Acharam: resolvido!', t: { c: m.seg.fim }, fim: true },
    ];
  }

  /* ======================= Cavalo do rei ======================= */
  const CAV_N = [4, 5, 6, 7, 8], CAV_COB = [0.6, 0.64, 0.68, 0.72, 0.74];
  const SALTOS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const saltos = (n, i) => { const x = i % n, y = Math.floor(i / n); return SALTOS.map(([a, b]) => [x + a, y + b]).filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n).map(([a, b]) => b * n + a); };
  const montarCavalo = memo('cavalo', (def, r) => {
    const lv = nv(def.dif), n = CAV_N[lv];
    let melhor = null;
    for (let t = 0; t < 400; t++) {
      const cam = [Math.floor(r() * n * n)], vis = new Set(cam);
      for (;;) {
        const op = saltos(n, cam[cam.length - 1]).filter(j => !vis.has(j));
        if (!op.length) break;
        const grau = j => saltos(n, j).filter(k => !vis.has(k)).length;
        const g = Math.min(...op.map(grau)), j = sortear(op.filter(x => grau(x) <= g + (r() < 0.25 ? 1 : 0)), r);
        cam.push(j); vis.add(j);
      }
      if (!melhor || cam.length > melhor.length) melhor = cam;
      if (cam.length >= n * n * CAV_COB[lv]) break;
    }
    const cam = melhor, vis = new Set(cam);
    return { pub: { n, pedras: seq(n * n).filter(i => !vis.has(i)), ini: lv < 3 ? cam[0] : null, fim: lv === 4 ? cam[cam.length - 1] : null }, estado: {}, provaCerta: 'cavalo:' + cam.length, seg: { cam } };
  });
  const trilhaCav = jg => listaInt(jg.estado.t, 0, jg.pub.n * jg.pub.n - 1, 100);
  function provaCavalo(jg) {
    const p = jg.pub, t = trilhaCav(jg), livres = p.n * p.n - p.pedras.length;
    if (t.length !== livres || new Set(t).size !== t.length || t.some(c => p.pedras.includes(c))) return null;
    if (p.ini != null && t[0] !== p.ini) return null;
    if (p.fim != null && t[t.length - 1] !== p.fim) return null;
    for (let k = 1; k < t.length; k++) if (!saltos(p.n, t[k - 1]).includes(t[k])) return null;
    return 'cavalo:' + livres;
  }
  function dicaCavalo(jg, m) {
    const t = trilhaCav(jg), c = m.seg.cam;
    let L = 0; while (L < t.length && t[L] === c[L]) L++;
    if (L + 2 >= c.length) return null;
    return { mudas: { t: c.slice(0, L + 1 + (L === 0 ? 1 : 0)) }, txt: 'o caminho certo até a próxima casa' };
  }
  function demoCavalo(m) {
    const c = m.seg.cam;
    return [
      { txt: 'O cavalo anda em “L”: duas casas para um lado e uma para o outro. Ele pula por cima de tudo.', alvo: 'm' + c[0], mudas: { t: [c[0]] } },
      { txt: 'Passem por todas as casas livres, uma vez só cada.' + (m.pub.ini == null ? ' Onde começar é com vocês.' : ''), alvo: 'm' + c[1], mudas: { t: c.slice(0, 2) } },
      { txt: 'Dica de quem sabe: vão primeiro para as casas com menos saídas.', alvo: 'm' + c[2], mudas: { t: c.slice(0, 3) } },
      { txt: 'Todas as casas: resolvido!', mudas: { t: c.slice() }, fim: true },
    ];
  }

  /* ---------------- o registro ---------------- */
  const P = (tipo, x) => E.registrar(tipo, Object.assign({ niveis: 5 }, x));
  const NIVS = {
    torre: ['3 discos.', '4 discos.', '5 discos, e vão para o pino do meio.', '6 discos.', '5 discos começando espalhados, para um pino sorteado.'],
    jarros: ['2 jarros pequenos, com fonte.', '2 jarros maiores; mais lances.', '3 jarros sem fonte: dividir a água ao meio.', '3 jarros com fonte.', '3 jarros: uma medida em cada um de dois jarros.'],
    travessia: ['O barqueiro, um bicho, outro bicho e a comida.', '3 guardas e 3 ladrões, barco de 2.', 'A ponte e a tocha: 4 pessoas, tempo contado.', 'A ponte e a tocha com 5 pessoas.', '5 guardas e 5 ladrões, barco de 3.'],
    canos: ['Grade 4×4.', '5×5.', '6×6 com buracos.', '7×7 com mais buracos.', '8×8.'],
    sokoban: ['1 estátua.', '2 estátuas.', '2 estátuas mais longe.', '3 estátuas.', '4 estátuas.'],
    gelo: ['Grade 6×6, 3 deslizes ou mais.', '7×7.', '8×8.', '9×9 com buracos (cair conta erro).', '10×10 com buracos e neve (na neve, para).'],
    restaum: ['4 pinos.', '6 pinos.', '8 pinos.', '11 pinos no tabuleiro em cruz.', '14 pinos, e o último fica no centro.'],
    pontes: ['4 ilhas.', '6 ilhas.', '9 ilhas.', '12 ilhas.', '15 ilhas.'],
    trilhos: ['5×5, 3 casas de ajuda.', '6×6.', '7×7.', '8×8, com números escondidos.', '9×9, com mais números escondidos.'],
    constelacao: ['5 estrelas, começo marcado.', '7 estrelas, começo marcado.', '9 estrelas; o começo é com vocês.', '11 estrelas.', '13 estrelas e linhas de mão única (setas).'],
    encaixar: ['Quadro 4×4, peças já viradas certas.', '5×5; é preciso girar.', '6×6, 7 peças.', '6×6; é preciso espelhar.', '7×7 com buracos e 9 peças.'],
    bussola: ['3 instruções: norte, sul, leste e oeste.', '4 instruções, com as diagonais.', 'Vire à direita e à esquerda (5 instruções).', '“Ande até o marco” (6 instruções).', 'Léguas e “volte de costas”.'],
    cavalo: ['Tabuleiro 4×4, começo marcado.', '5×5.', '6×6.', '7×7; o começo é com vocês.', '8×8; o fim está marcado.'],
  };
  P('torre', { nome: 'Torre dos discos', grupo: 'Mecanismos', erra: false, desc: 'Levem a pilha para o pino marcado, um disco por vez, sem pôr disco grande em cima de pequeno.',
    montar: montarTorre, prova: provaTorre, dica: dicaTorre, demo: demoTorre, niv: NIVS.torre, resposta: m => 'dá em ' + m.seg.lances + ' lances' });
  P('jarros', { nome: 'Jarros d’água', grupo: 'Mecanismos', erra: false, desc: 'Encham, esvaziem e passem água de um jarro para outro até chegar à medida pedida.',
    montar: montarJarros, prova: provaJarros, dica: dicaJarros, demo: demoJarros, niv: NIVS.jarros, resposta: m => 'dá em ' + ((m.seg.cam || []).length - 1) + ' lances' });
  P('travessia', { nome: 'Travessia do rio', grupo: 'Mecanismos', erra: true, desc: 'Levem todos para a outra margem sem quebrar a regra. Quebrar conta um erro.',
    montar: montarTravessia, prova: provaTravessia, dica: dicaTravessia, demo: demoTravessia, niv: NIVS.travessia, resposta: m => 'dá em ' + (m.seg.cam.length - 1) + ' travessias' + (m.pub.limite ? ' (' + m.pub.limite + ' minutos)' : '') });
  P('canos', { nome: 'Canos de água', grupo: 'Mecanismos', erra: false, desc: 'Girem os canos até a água da fonte chegar a todos, sem vazar.',
    montar: montarCanos, prova: provaCanos, dica: dicaCanos, demo: demoCanos, niv: NIVS.canos, resposta: () => 'todos os canos ligados à fonte' });
  P('sokoban', { nome: 'Empurrar estátuas', grupo: 'Mecanismos', erra: false, desc: 'Empurrem as estátuas até as placas. Elas não se puxam.',
    montar: montarSokoban, prova: provaSokoban, dica: dicaSokoban, demo: demoSokoban, niv: NIVS.sokoban, resposta: m => m.pub.alvos.length + ' estátuas nas placas' });
  P('gelo', { nome: 'Chão de gelo', grupo: 'Mecanismos', erra: true, desc: 'No gelo, só se para quando bate em algo. Parem em cima da saída.',
    montar: montarGelo, prova: provaGelo, dica: dicaGelo, demo: demoGelo, niv: NIVS.gelo, resposta: m => 'dá em ' + (m.seg.cam.length - 1) + ' deslizes' });
  P('restaum', { nome: 'Resta um', grupo: 'Mecanismos', erra: false, desc: 'Um pino pula o vizinho e o tira. Pulem até sobrar um só.',
    montar: montarRestaUm, prova: provaRestaUm, dica: dicaRestaUm, demo: demoRestaUm, niv: NIVS.restaum, resposta: m => (m.seg.ida.length) + ' pulos' });
  P('pontes', { nome: 'Pontes entre ilhas', grupo: 'Caminhos e mapas', erra: false, desc: 'Liguem as ilhas com pontes retas. O número de cada ilha diz quantas pontes saem dela.',
    montar: montarPontes, prova: provaPontes, dica: dicaPontes, demo: demoPontes, niv: NIVS.pontes, resposta: () => 'todas as ilhas ligadas (a dica põe uma ponte)' });
  P('trilhos', { nome: 'Trilhos', grupo: 'Caminhos e mapas', erra: false, desc: 'Montem o trilho da entrada até a saída. Os números contam as casas com trilho.',
    montar: montarTrilhos, prova: provaTrilhos, dica: dicaTrilhos, demo: demoTrilhos, niv: NIVS.trilhos, resposta: m => m.seg.cam.length + ' casas de trilho' });
  P('constelacao', { nome: 'Constelação', grupo: 'Desenho e encaixe', erra: false, desc: 'Tracem todas as linhas da constelação sem tirar a pena e sem repetir.',
    montar: montarConstelacao, prova: provaConstelacao, dica: dicaConstelacao, demo: demoConstelacao, niv: NIVS.constelacao, resposta: m => m.pub.ar.length + ' linhas num traço só' });
  P('encaixar', { nome: 'Encaixar peças', grupo: 'Desenho e encaixe', erra: false, desc: 'Encham o quadro com as peças, sem sobrar buraco.',
    montar: montarEncaixar, prova: provaEncaixar, dica: dicaEncaixar, demo: demoEncaixar, niv: NIVS.encaixar, resposta: m => m.pub.pecas.length + ' peças' });
  P('bussola', { nome: 'Mapa e bússola', grupo: 'Caminhos e mapas', erra: true, desc: 'Sigam as instruções no mapa e apontem onde está o tesouro.', manual: true,
    normDef: normBus, montar: montarBussola, prova: provaBussola, dica: dicaBussola, demo: demoBussola, niv: NIVS.bussola, resposta: m => 'a casa ' + ((m.seg.fim % m.pub.n) + 1) + ' da linha ' + (Math.floor(m.seg.fim / m.pub.n) + 1) });
  P('cavalo', { nome: 'Cavalo do rei', grupo: 'Caminhos e mapas', erra: false, desc: 'Com o pulo do cavalo, passem por todas as casas livres, uma vez só.',
    montar: montarCavalo, prova: provaCavalo, dica: dicaCavalo, demo: demoCavalo, niv: NIVS.cavalo, resposta: m => m.seg.cam.length + ' casas' });

  const api = {
    D4, passo, bfs, pinosDe, torLance, mover, jarrosDe, jarVizinhos, jarAlvoOk, textoAlvoJarros, travEstado, travGrupos, travCruzar, travProblema,
    girarCano, canoDe, rotCanos, aguaCanos, BIT, sokEstado, sokPasso, sokProximo, deslizarGelo, posGelo, pinosRU, pulosRU, pular, entrePonte, parValido, cruzam,
    chavePonte, pontesDe, estadoPontes, triT, temTrilho, trilhaCon, usadasCon, serveAresta, orientar, pecaEst, casasPeca, ocupacao, MARCOS, trilhaCav, saltos,
  };
  E.mais3 = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
