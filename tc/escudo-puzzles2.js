/* Tiny Cats · os puzzles do lote 209, parte 1 (a conta pura, sem DOM): lógica, dedução e palavras, em 5 níveis.
     Lógica e dedução — quadro de dedução, guardas que mentem, nonograma, somas de runas, quadrado mágico, conta cifrada,
                        oito guardas, campo de armadilhas, tesouro enterrado
     Palavras e códigos — palavra secreta, mensagem escondida, ordem dos acontecimentos
     Olhos — achar as diferenças
   Como os do lote 46 (tc/escudo-puzzles.js): tudo sai da semente; a resposta não vai para os jogadores (vai o md5); onde
   a tela precisa saber a resposta para responder (a palavra secreta), ela vai embaralhada com o sal.
   Cada tipo, além do contrato de sempre (montar, prova, dica, resposta), tem:
     niveis: 5 · niv: [o que muda em cada nível, numa frase] · demo(m, jg) → os passos do tutorial ({ txt, alvo, mudas, t });
     o último passo deixa o puzzle resolvido (os testes conferem). */
(() => {
  'use strict';
  const E = (typeof window !== 'undefined' && window.TC && window.TC.escudo) || (typeof require === 'function' ? require('./escudo.js') : null);
  if (!E) return;
  const X = E.mais || (typeof require === 'function' ? require('./escudo-puzzles.js') : null);
  if (!X) return;
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const embaralhar = (l, r) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; };
  const sortear = (l, r) => l[Math.floor(r() * l.length)];
  const intOk = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  const listaInt = (v, a, b, max) => (Array.isArray(v) ? v.filter(x => intOk(x, a, b)).slice(0, max || 400) : []);
  const NIV = E.DIF5;
  const nv = d => Math.max(0, NIV.indexOf(d));
  const N5 = (d, l) => l[nv(d)];
  const { cobrir, descobrir, chaveP } = X;
  const maiusc = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const ORD = ['primeiro', 'segundo', 'terceiro', 'quarto', 'quinto', 'sexto', 'sétimo', 'oitavo'];
  const seq = n => [...Array(n).keys()];
  const trocaChar = (s, i, c) => s.slice(0, i) + c + s.slice(i + 1);
  // o mesmo puzzle é montado muitas vezes (a tela, a prévia, a dica): guarda os últimos
  const CACHE = new Map();
  function memo(tipo, fn) {
    return (def, r, ctx) => {
      const k = tipo + '|' + JSON.stringify(def) + '|' + (ctx && ctx.sal);
      let s = CACHE.get(k);
      if (s == null) { s = JSON.stringify(fn(def, r, ctx)); CACHE.set(k, s); if (CACHE.size > 120) CACHE.delete(CACHE.keys().next().value); }
      return JSON.parse(s);
    };
  }
  function permutacoes(n) {
    const out = [], a = seq(n), usa = Array(n).fill(false), cur = [];
    const rec = () => { if (cur.length === n) { out.push(cur.slice()); return; } for (const x of a) { if (usa[x]) continue; usa[x] = true; cur.push(x); rec(); cur.pop(); usa[x] = false; } };
    rec();
    return out;
  }
  const PERMS = {};
  const permsDe = n => PERMS[n] || (PERMS[n] = permutacoes(n));
  // ordem aleatória com peso (os de peso maior tendem a vir antes)
  const porPeso = (l, peso, r) => l.map(x => [x, -Math.log(1 - r() * 0.999999) / Math.max(0.01, peso(x))]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  const listaTxt = (v, max, tam) => (Array.isArray(v) ? v.map(x => E.linha(x, tam || 40)).filter(Boolean).slice(0, max) : []);
  const unicos = l => { const vis = new Set(); return l.filter(x => { const k = E.sem(x).trim(); if (!k || vis.has(k)) return false; vis.add(k); return true; }); };

  /* ======================= Quadro de dedução ======================= */
  const DED_PES = ['Aldo', 'Brisa', 'Caio', 'Dora', 'Elio', 'Fiona', 'Gael', 'Hilda', 'Ivo', 'Lara'];
  // as categorias do banco: o nome, os valores [rótulo, a frase] e o verbo (sim, não)
  const DED_CATS = [
    { n: 'Lugar', s: 'estava', ns: 'não estava', v: [['Taverna', 'na Taverna'], ['Torre', 'na Torre'], ['Porto', 'no Porto'], ['Mercado', 'no Mercado'], ['Capela', 'na Capela'], ['Ponte', 'na Ponte'], ['Moinho', 'no Moinho']] },
    { n: 'Objeto', s: 'tinha', ns: 'não tinha', v: [['Cálice', 'o Cálice'], ['Adaga', 'a Adaga'], ['Mapa', 'o Mapa'], ['Anel', 'o Anel'], ['Chave', 'a Chave'], ['Vela', 'a Vela'], ['Livro', 'o Livro']] },
    { n: 'Capa', s: 'usava', ns: 'não usava', v: [['Vermelha', 'a capa vermelha'], ['Azul', 'a capa azul'], ['Verde', 'a capa verde'], ['Preta', 'a capa preta'], ['Branca', 'a capa branca'], ['Cinza', 'a capa cinza']] },
    { n: 'Hora', s: 'chegou', ns: 'não chegou', v: [['Manhã', 'de manhã'], ['Meio-dia', 'ao meio-dia'], ['Tarde', 'à tarde'], ['Noite', 'à noite'], ['Madrugada', 'de madrugada']] },
    { n: 'Bebida', s: 'bebia', ns: 'não bebia', v: [['Cerveja', 'cerveja'], ['Vinho', 'vinho'], ['Hidromel', 'hidromel'], ['Chá', 'chá'], ['Leite', 'leite']] },
  ];
  // os tipos de pista de cada nível e o peso de cada um
  const DED_TIPOS = [{ e: 3, n: 2 }, { e: 1, n: 3, x: 2 }, { n: 3, x: 2, xn: 2 }, { n: 2, x: 2, xn: 3, ou: 1 }, { n: 2, x: 1, xn: 3, ou: 2, um: 2 }];
  const DED_N = [3, 3, 4, 4, 5], DED_C = [1, 2, 2, 3, 3];
  function dedVale(p, A, B) {
    switch (p.k) {
      case 'e': return A[p.c][p.i] === p.v;
      case 'n': return A[p.c][p.i] !== p.v;
      case 'x': return B[p.c][p.v] === B[p.c2][p.v2];
      case 'xn': return B[p.c][p.v] !== B[p.c2][p.v2];
      case 'ou': return A[p.c][p.i] === p.v || A[p.c][p.i] === p.v2;
      case 'um': return B[p.c][p.v] === p.i || B[p.c][p.v] === p.i2;
    }
    return false;
  }
  const dedCats = p => (p.c2 != null ? Math.max(p.c, p.c2) : p.c);
  // quantas respostas as pistas deixam (para em "limite")
  function dedContar(n, C, pis, limite) {
    const P = permsDe(n), por = [...Array(C)].map(() => []);
    for (const p of pis) por[dedCats(p)].push(p);
    const A = [], B = [];
    let q = 0;
    const rec = c => {
      if (c === C) { q++; return; }
      for (const pm of P) {
        A[c] = pm; const inv = []; pm.forEach((v, i) => { inv[v] = i; }); B[c] = inv;
        if (por[c].every(p => dedVale(p, A, B))) rec(c + 1);
        if (q >= limite) return;
      }
    };
    rec(0);
    return q;
  }
  function dedPistas(n, C, sol, lv, r) {
    const B = sol.map(pm => { const inv = []; pm.forEach((v, i) => { inv[v] = i; }); return inv; });
    const tipos = DED_TIPOS[lv], pool = [];
    for (let c = 0; c < C; c++) for (let i = 0; i < n; i++) for (let v = 0; v < n; v++) {
      if (tipos.e && sol[c][i] === v) pool.push({ k: 'e', c, i, v });
      if (tipos.n && sol[c][i] !== v) pool.push({ k: 'n', c, i, v });
    }
    for (let c = 0; c < C; c++) for (let c2 = c + 1; c2 < C; c2++) for (let v = 0; v < n; v++) for (let v2 = 0; v2 < n; v2++) {
      const mesmo = B[c][v] === B[c2][v2];
      if (mesmo && tipos.x) pool.push({ k: 'x', c, v, c2, v2 });
      if (!mesmo && tipos.xn) pool.push({ k: 'xn', c, v, c2, v2 });
    }
    if (tipos.ou) for (let c = 0; c < C; c++) for (let i = 0; i < n; i++) { const v2 = sortear(seq(n).filter(v => v !== sol[c][i]), r); pool.push(r() < 0.5 ? { k: 'ou', c, i, v: sol[c][i], v2 } : { k: 'ou', c, i, v: v2, v2: sol[c][i] }); }
    if (tipos.um) for (let c = 0; c < C; c++) for (let v = 0; v < n; v++) { const i2 = sortear(seq(n).filter(i => i !== B[c][v]), r); pool.push(r() < 0.5 ? { k: 'um', c, v, i: B[c][v], i2 } : { k: 'um', c, v, i: i2, i2: B[c][v] }); }
    const ordem = porPeso(pool, p => tipos[p.k] || 0.01, r), pis = [];
    for (const p of ordem) { pis.push(p); if (dedContar(n, C, pis, 2) === 1) break; }
    // tira as que sobram (do fim para o começo)
    for (let k = pis.length - 1; k >= 0 && pis.length > 2; k--) {
      const sem = pis.slice(0, k).concat(pis.slice(k + 1));
      if (dedContar(n, C, sem, 2) === 1) pis.splice(k, 1);
    }
    return embaralhar(pis, r);
  }
  function dedFrase(p, pes, cats) {
    const P = i => pes[i], cat = c => cats[c];
    const banco = c => !!cat(c).s;
    const fr = (c, v) => (banco(c) ? cat(c).f[v] : cat(c).v[v]);
    const lig = (c, v, nao) => (banco(c) ? (nao ? cat(c).ns : cat(c).s) + ' ' + fr(c, v) : (nao ? 'não tem ' : 'tem ') + fr(c, v));
    switch (p.k) {
      case 'e': return banco(p.c) ? P(p.i) + ' ' + lig(p.c, p.v) : cat(p.c).n + ' de ' + P(p.i) + ': ' + fr(p.c, p.v);
      case 'n': return banco(p.c) ? P(p.i) + ' ' + lig(p.c, p.v, true) : cat(p.c).n + ' de ' + P(p.i) + ': não é ' + fr(p.c, p.v);
      case 'x': return 'Quem ' + lig(p.c, p.v) + (banco(p.c2) ? ' ' : ' também ') + lig(p.c2, p.v2);
      case 'xn': return 'Quem ' + lig(p.c, p.v) + ' ' + lig(p.c2, p.v2, true);
      case 'ou': return banco(p.c) ? P(p.i) + ' ' + cat(p.c).s + ' ' + fr(p.c, p.v) + ' ou ' + fr(p.c, p.v2) : cat(p.c).n + ' de ' + P(p.i) + ': ' + fr(p.c, p.v) + ' ou ' + fr(p.c, p.v2);
      case 'um': return banco(p.c) ? 'Ou ' + P(p.i) + ' ou ' + P(p.i2) + ' ' + cat(p.c).s + ' ' + fr(p.c, p.v) : fr(p.c, p.v) + ' é de ' + P(p.i) + ' ou de ' + P(p.i2);
    }
    return '';
  }
  function normDed(p, o) {
    const d = p.ded;
    if (!ehObj(d)) return;
    const pes = unicos(listaTxt(d.pes, 5, 24));
    if (pes.length < 3) return;
    const cats = [];
    for (const c of Array.isArray(d.cats) ? d.cats : []) {
      if (!ehObj(c)) continue;
      const v = listaTxt(c.v, pes.length, 30);
      if (v.length < pes.length || unicos(v).length < pes.length) continue;
      cats.push({ n: E.linha(c.n, 20) || 'Categoria ' + (cats.length + 1), v });
      if (cats.length >= 3) break;
    }
    if (cats.length) o.ded = { pes, cats };
  }
  const montarDeducao = memo('deducao', (def, r) => {
    const lv = nv(def.dif);
    let n, C, pes, cats, sol;
    if (def.ded) {
      n = def.ded.pes.length; C = def.ded.cats.length; pes = def.ded.pes;
      cats = []; sol = [];
      for (const c of def.ded.cats) {
        const ordem = embaralhar(seq(n), r);
        cats.push({ n: c.n, v: ordem.map(i => c.v[i]) });
        sol.push(seq(n).map(i => ordem.indexOf(i)));
      }
    } else {
      n = DED_N[lv]; C = DED_C[lv];
      pes = embaralhar(DED_PES, r).slice(0, n);
      cats = embaralhar(DED_CATS, r).slice(0, C).map(c => { const vs = embaralhar(c.v, r).slice(0, n); return { n: c.n, s: c.s, ns: c.ns, v: vs.map(x => x[0]), f: vs.map(x => x[1]) }; });
      sol = cats.map(() => embaralhar(seq(n), r));
    }
    const pis = dedPistas(n, C, sol, lv, r);
    return { pub: { n, C, pes, cats: cats.map(c => ({ n: c.n, v: c.v })), pis: pis.map(p => maiusc(dedFrase(p, pes, cats)) + '.') }, estado: {}, provaCerta: sol.map(pm => pm.join(',')).join(';'), seg: { sol } };
  });
  const dedIdx = (pub, c, i, v) => (c * pub.n + i) * pub.n + v;
  const dedMarcas = jg => { const t = jg.pub.C * jg.pub.n * jg.pub.n, m = typeof jg.estado.m === 'string' && jg.estado.m.length === t ? jg.estado.m : '.'.repeat(t); return m; };
  function dedResposta(jg) {
    const p = jg.pub, m = dedMarcas(jg), out = [];
    for (let c = 0; c < p.C; c++) {
      const pm = [];
      for (let i = 0; i < p.n; i++) { const vs = seq(p.n).filter(v => m[dedIdx(p, c, i, v)] === 'v'); if (vs.length !== 1) return null; pm.push(vs[0]); }
      if (new Set(pm).size !== p.n) return null;
      out.push(pm.join(','));
    }
    return out.join(';');
  }
  const provaDeducao = (jg, t) => (t === 'conferir' ? dedResposta(jg) : null);
  function dicaDeducao(jg, m) {
    const p = jg.pub; let mm = dedMarcas(jg); const d = listaInt(jg.estado.d, 0, 999);
    for (let c = 0; c < p.C; c++) for (let i = 0; i < p.n; i++) {
      const v = m.seg.sol[c][i];
      const certo = seq(p.n).every(w => (w === v ? mm[dedIdx(p, c, i, w)] === 'v' : mm[dedIdx(p, c, i, w)] !== 'v'));
      if (certo) continue;
      for (let w = 0; w < p.n; w++) mm = trocaChar(mm, dedIdx(p, c, i, w), w === v ? 'v' : 'x');
      return { mudas: { m: mm, d: d.concat(dedIdx(p, c, i, v)) }, txt: p.pes[i] + ' — ' + p.cats[c].n + ': ' + p.cats[c].v[v] };
    }
    return null;
  }
  function demoDeducao(m) {
    const p = m.pub, sol = m.seg.sol; let mm = '.'.repeat(p.C * p.n * p.n);
    const passos = [{ txt: 'Leiam as pistas. Cada pessoa tem um valor de cada coluna, e ninguém repete.', alvo: 'p0' }];
    const i0 = 0, c0 = 0, errado = seq(p.n).find(v => v !== sol[c0][i0]);
    mm = trocaChar(mm, dedIdx(p, c0, i0, errado), 'x');
    passos.push({ txt: 'Um clique põe ✕ (não pode ser). Use para riscar o que as pistas descartam.', alvo: 'm' + dedIdx(p, c0, i0, errado), mudas: { m: mm } });
    mm = trocaChar(mm, dedIdx(p, c0, i0, sol[c0][i0]), 'v');
    mm = trocaChar(mm, dedIdx(p, c0, i0, sol[c0][i0]), 'x'); mm = trocaChar(mm, dedIdx(p, c0, i0, sol[c0][i0]), 'v');
    passos.push({ txt: 'Dois cliques põem ✓ (é esse). Um ✓ em cada linha.', alvo: 'm' + dedIdx(p, c0, i0, sol[c0][i0]), mudas: { m: mm } });
    for (let c = 0; c < p.C; c++) for (let i = 0; i < p.n; i++) for (let v = 0; v < p.n; v++) mm = trocaChar(mm, dedIdx(p, c, i, v), sol[c][i] === v ? 'v' : 'x');
    passos.push({ txt: 'Com o quadro cheio, apertem Conferir. Errar conta um erro.', alvo: 'ok', mudas: { m: mm } });
    passos.push({ txt: 'Resolvido!', t: 'conferir', fim: true });
    return passos;
  }

  /* ======================= Guardas que mentem ======================= */
  const GRD_NOMES = ['Bram', 'Odo', 'Tessa', 'Varo', 'Ilsa', 'Corvo', 'Mira', 'Duro'];
  const GRD_PORTAS = ['de ferro', 'de madeira', 'de pedra', 'de bronze', 'de osso', 'de vidro'];
  const GRD_G = [2, 3, 3, 4, 5], GRD_D = [2, 3, 3, 4, 4];
  const GRD_TIPOS = [['porta', 'algum'], ['porta', 'papel', 'algum'], ['porta', 'papel', 'igual'], ['porta', 'papel', 'igual', 'conta'], ['papel', 'igual', 'conta', 'se', 'porta']];
  function grdVale(st, R, s, k) {
    switch (st.k) {
      case 'porta': return (s === st.d) === st.sim;
      case 'papel': return R[st.j] === st.sim;
      case 'igual': return R[st.j] === R[k];
      case 'algum': return R.some(x => !x);
      case 'conta': return R.filter(x => !x).length === st.q;
      case 'se': return !R[st.j] || s === st.d;
    }
    return false;
  }
  function grdDizer(tipo, k, R, s, g, d, r) {
    const outro = () => sortear(seq(g).filter(j => j !== k), r);
    for (let t = 0; t < 20; t++) {
      let st;
      if (tipo === 'porta') { const dd = Math.floor(r() * d); st = { k: 'porta', d: dd, sim: R[k] ? s === dd : s !== dd }; }
      else if (tipo === 'papel') { const j = outro(); st = { k: 'papel', j, sim: R[k] ? R[j] : !R[j] }; }
      else if (tipo === 'igual') st = { k: 'igual', j: outro() };
      else if (tipo === 'algum') st = { k: 'algum' };
      else if (tipo === 'conta') st = { k: 'conta', q: Math.floor(r() * (g + 1)) };
      else st = { k: 'se', j: outro(), d: Math.floor(r() * d) };
      if (grdVale(st, R, s, k) === R[k]) return st;
    }
    return null;
  }
  function grdSolucoes(g, d, ditos, umMente) {
    const out = [];
    for (let mask = 0; mask < 1 << g; mask++) {
      const R = seq(g).map(i => !((mask >> i) & 1));
      if (umMente && R.filter(x => !x).length !== 1) continue;
      for (let s = 0; s < d; s++) if (ditos.every((l, k) => l.every(st => grdVale(st, R, s, k) === R[k]))) out.push({ R, s });
    }
    return out;
  }
  function grdTexto(st, gs, ps) {
    switch (st.k) {
      case 'porta': return st.sim ? 'A porta ' + ps[st.d] + ' é a segura.' : 'A porta ' + ps[st.d] + ' não é a segura.';
      case 'papel': return st.sim ? gs[st.j] + ' diz a verdade.' : gs[st.j] + ' mente.';
      case 'igual': return 'Eu e ' + gs[st.j] + ' somos do mesmo tipo.';
      case 'algum': return 'Pelo menos um de nós mente.';
      case 'conta': return st.q === 0 ? 'Nenhum de nós mente.' : st.q === 1 ? 'Exatamente um de nós mente.' : 'Exatamente ' + st.q + ' de nós mentem.';
      case 'se': return 'Se ' + gs[st.j] + ' diz a verdade, a porta ' + ps[st.d] + ' é a segura.';
    }
    return '';
  }
  function normGrd(p, o) {
    const d = p.grd;
    if (!ehObj(d)) return;
    const portas = unicos(listaTxt(d.portas, 4, 30)), guardas = unicos(listaTxt(d.guardas, 5, 20));
    if (portas.length < 2 || guardas.length < 2) return;
    o.grd = { portas, guardas, certa: intOk(d.certa, 0, portas.length - 1) ? d.certa : 0 };
  }
  const montarGuardas = memo('guardas', (def, r) => {
    const lv = nv(def.dif), M = def.grd;
    const g = M ? M.guardas.length : GRD_G[lv], d = M ? M.portas.length : GRD_D[lv];
    const gs = M ? M.guardas : embaralhar(GRD_NOMES, r).slice(0, g), ps = M ? M.portas : embaralhar(GRD_PORTAS, r).slice(0, d);
    const umMente = lv === 0, papeis = lv >= 2, tipos = GRD_TIPOS[lv];
    for (let tent = 0; tent < 600; tent++) {
      let R;
      if (umMente) { const l = Math.floor(r() * g); R = seq(g).map(i => i !== l); }
      else { R = seq(g).map(() => r() < 0.5); if (R.every(x => x)) R[Math.floor(r() * g)] = false; }
      const s = M ? M.certa : Math.floor(r() * d);
      const ditos = [];
      let ok = true;
      for (let k = 0; k < g && ok; k++) {
        const q = lv === 0 || lv === 2 || (lv >= 3 && r() < 0.4) ? 2 : 1, l = [];
        for (let j = 0; j < q; j++) { const st = grdDizer(sortear(tipos, r), k, R, s, g, d, r); if (st && !l.some(x => x.k === st.k && x.j === st.j && x.d === st.d)) l.push(st); }
        if (!l.length) ok = false;
        ditos.push(l);
      }
      if (!ok) continue;
      const sols = grdSolucoes(g, d, ditos, umMente);
      const unica = papeis ? sols.length === 1 : sols.length >= 1 && sols.every(x => x.s === s);
      if (!unica || !sols.some(x => x.s === s)) continue;
      const cert = 'p:' + s + (papeis ? '|' + R.map(x => (x ? 'v' : 'm')).join('') : '');
      return { pub: { g, d, gs, ps, ditos: ditos.map(l => l.map(st => grdTexto(st, gs, ps))), papeis, umMente }, estado: {}, provaCerta: cert, seg: { R, s } };
    }
    // (não achou: as portas faladas direto)
    const R = seq(g).map(i => i !== 0), s = M ? M.certa : 0;
    const ditos = seq(g).map(k => [{ k: 'porta', d: s, sim: R[k] }]);
    return { pub: { g, d, gs, ps, ditos: ditos.map(l => l.map(st => grdTexto(st, gs, ps))), papeis, umMente }, estado: {}, provaCerta: 'p:' + s + (papeis ? '|' + R.map(x => (x ? 'v' : 'm')).join('') : ''), seg: { R, s, fb: true } };
  });
  const papelGrd = (jg, k) => (jg.estado['r' + k] === 'v' || jg.estado['r' + k] === 'm' ? jg.estado['r' + k] : '');
  function provaGuardas(jg, t) {
    if (!t || !intOk(t.porta, 0, jg.pub.d - 1)) return null;
    if (!jg.pub.papeis) return 'p:' + t.porta;
    const ps = seq(jg.pub.g).map(k => papelGrd(jg, k));
    return ps.every(Boolean) ? 'p:' + t.porta + '|' + ps.join('') : null;
  }
  function dicaGuardas(jg, m) {
    const dr = listaInt(jg.estado.dr, 0, 9), k = seq(jg.pub.g).find(i => !dr.includes(i));
    if (k == null || dr.length >= jg.pub.g - 1) return null;
    return { mudas: { dr: dr.concat(k), ['r' + k]: m.seg.R[k] ? 'v' : 'm' }, txt: jg.pub.gs[k] + (m.seg.R[k] ? ' diz a verdade' : ' mente') };
  }
  function demoGuardas(m) {
    const p = m.pub, passos = [{ txt: 'Cada guarda diz uma coisa. Quem diz a verdade sempre diz a verdade; quem mente, sempre mente.', alvo: 'g0' }];
    if (p.umMente) passos.push({ txt: 'Aqui, um deles mente e o outro não. Testem: se o primeiro mentir, o que muda?', alvo: 'g1' });
    const mudas = {};
    if (p.papeis) { m.seg.R.forEach((v, k) => { mudas['r' + k] = v ? 'v' : 'm'; }); passos.push({ txt: 'Marquem quem diz a verdade e quem mente (o botão embaixo de cada guarda).', alvo: 'r0', mudas }); }
    passos.push({ txt: 'Quando tiverem certeza, abram a porta segura. Porta errada conta um erro.', alvo: 'porta' + m.seg.s });
    passos.push({ txt: 'Resolvido!', t: { porta: m.seg.s }, fim: true });
    return passos;
  }

  /* ======================= Nonograma ======================= */
  const NONO_N = [5, 7, 8, 10, 12], NONO_DADAS = [3, 2, 1, 0, 0];
  const blocos = l => { const o = []; let k = 0; for (const c of l) { if (c) k++; else if (k) { o.push(k); k = 0; } } if (k) o.push(k); return o; };
  // uma linha: o que cada casa pode ser, com as pistas (null = contradição)
  function linhaPode(pista, cur) {
    const L = cur.length, k = pista.length, p0 = Array(L).fill(false), p1 = Array(L).fill(false), arr = Array(L).fill(0);
    let alguma = false;
    const rest = seq(k + 1).map(b => pista.slice(b).reduce((a, x) => a + x + 1, 0) - 1);
    const rec = (b, ini) => {
      if (b === k) {
        for (let i = ini; i < L; i++) if (cur[i] === 1) return;
        alguma = true;
        for (let i = 0; i < L; i++) { const v = i < ini ? arr[i] : 0; if (v) p1[i] = true; else p0[i] = true; }
        return;
      }
      const len = pista[b];
      for (let s = ini; s + rest[b] <= L - 0 && s + len <= L; s++) {
        if (s > ini && cur[s - 1] === 1) break;
        let ok = true;
        for (let i = s; i < s + len; i++) if (cur[i] === 0) { ok = false; break; }
        if (ok && s + len < L && cur[s + len] === 1) ok = false;
        if (!ok) continue;
        for (let i = ini; i < s; i++) arr[i] = 0;
        for (let i = s; i < s + len; i++) arr[i] = 1;
        if (s + len < L) arr[s + len] = 0;
        rec(b + 1, Math.min(L, s + len + 1));
      }
    };
    rec(0, 0);
    if (!alguma) return null;
    return cur.map((c, i) => (c !== -1 ? c : p1[i] && !p0[i] ? 1 : p0[i] && !p1[i] ? 0 : -1));
  }
  function nonoResolver(n, lin, col, g) {
    let mudou = true;
    while (mudou) {
      mudou = false;
      for (let y = 0; y < n; y++) {
        const cur = seq(n).map(x => g[y * n + x]), nov = linhaPode(lin[y], cur);
        if (!nov) return false;
        nov.forEach((v, x) => { if (v !== g[y * n + x]) { g[y * n + x] = v; mudou = true; } });
      }
      for (let x = 0; x < n; x++) {
        const cur = seq(n).map(y => g[y * n + x]), nov = linhaPode(col[x], cur);
        if (!nov) return false;
        nov.forEach((v, y) => { if (v !== g[y * n + x]) { g[y * n + x] = v; mudou = true; } });
      }
    }
    return true;
  }
  const montarNonograma = memo('nonograma', (def, r) => {
    const lv = nv(def.dif), n = NONO_N[lv];
    for (let tent = 0; tent < 80; tent++) {
      let g = seq(n * n).map(() => (r() < 0.56 ? 1 : 0));
      // um passo de suavizar: manchas, não chuvisco
      g = g.map((v, i) => { const x = i % n, y = Math.floor(i / n); let s = 0, t = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= n || b >= n) continue; t++; s += g[b * n + a]; } return s * 2 > t ? 1 : s * 2 === t ? v : 0; });
      const uns = g.filter(Boolean).length;
      if (uns < n * n * 0.35 || uns > n * n * 0.75) continue;
      const lin = seq(n).map(y => blocos(seq(n).map(x => g[y * n + x]))), col = seq(n).map(x => blocos(seq(n).map(y => g[y * n + x])));
      const dadas = Array(n * n).fill(-1);
      for (const i of embaralhar(seq(n * n), r).slice(0, NONO_DADAS[lv])) dadas[i] = g[i];
      let k = dadas.slice(), ok = nonoResolver(n, lin, col, k);
      let extra = 0;
      while (ok && k.includes(-1) && extra < n * n * 0.2) {
        const abertas = seq(n * n).filter(i => k[i] === -1), i = sortear(abertas, r);
        dadas[i] = g[i]; extra++;
        k = dadas.slice(); ok = nonoResolver(n, lin, col, k);
      }
      if (!ok || k.includes(-1)) continue;
      return { pub: { n, lin, col, dadas: dadas.map(v => (v === -1 ? '.' : String(v))).join('') }, estado: {}, provaCerta: g.join(''), seg: { sol: g.join('') } };
    }
    return { pub: { n: 3, lin: [[1], [1], [1]], col: [[1], [1], [1]], dadas: '1........' }, estado: {}, provaCerta: '100010001', seg: { sol: '100010001' } };
  });
  const nonoP = jg => { const t = jg.pub.n * jg.pub.n; return typeof jg.estado.p === 'string' && jg.estado.p.length === t ? jg.estado.p : '.'.repeat(t); };
  const valNono = (jg, i) => { const d = jg.pub.dadas[i]; if (d !== '.') return d === '1' ? '1' : '0'; return nonoP(jg)[i] === '1' ? '1' : '0'; };
  const provaNonograma = jg => seq(jg.pub.n * jg.pub.n).map(i => valNono(jg, i)).join('');
  function dicaNonograma(jg, m) {
    const sol = m.seg.sol, d = listaInt(jg.estado.d, 0, 999);
    const erradas = seq(sol.length).filter(i => jg.pub.dadas[i] === '.' && !d.includes(i) && (sol[i] === '1' ? nonoP(jg)[i] !== '1' : nonoP(jg)[i] === '1'));
    const vazias = seq(sol.length).filter(i => jg.pub.dadas[i] === '.' && !d.includes(i) && sol[i] === '1' && nonoP(jg)[i] !== '1');
    const i = (erradas.find(k => nonoP(jg)[k] === '1') != null ? erradas.find(k => nonoP(jg)[k] === '1') : vazias[0]);
    if (i == null) return null;
    return { mudas: { p: trocaChar(nonoP(jg), i, sol[i] === '1' ? '1' : 'x'), d: d.concat(i) }, txt: 'uma casa certa' };
  }
  function demoNonograma(m) {
    const p = m.pub, sol = m.seg.sol;
    const linha = seq(p.n).find(y => p.lin[y].length && p.lin[y][0] === p.n) ?? seq(p.n).reduce((a, y) => (p.lin[y].reduce((s, x) => s + x, 0) > p.lin[a].reduce((s, x) => s + x, 0) ? y : a), 0);
    let pp = '.'.repeat(p.n * p.n);
    const passos = [{ txt: 'Os números dizem os blocos pintados de cada linha e de cada coluna, na ordem.', alvo: 'l' + linha }];
    for (let x = 0; x < p.n; x++) pp = trocaChar(pp, linha * p.n + x, sol[linha * p.n + x] === '1' ? '1' : 'x');
    passos.push({ txt: 'Clique pinta. Com o modo ✕ (ou o botão direito), marque o que fica vazio.', alvo: 'c' + (linha * p.n + sol.slice(linha * p.n).indexOf('1')), mudas: { p: pp } });
    for (let i = 0; i < sol.length; i++) pp = trocaChar(pp, i, sol[i] === '1' ? '1' : 'x');
    passos.push({ txt: 'Quando todas as linhas e colunas batem, o desenho aparece.', mudas: { p: pp }, fim: true });
    return passos;
  }

  /* ======================= Somas de runas ======================= */
  const SOM_K = [3, 4, 5, 6, 7], SOM_WH = [[3, 3], [4, 3], [4, 4], [5, 4], [5, 5]], SOM_VMAX = [6, 9, 9, 9, 9], SOM_OCULTAS = [0, 0, 0, 1, 2];
  function somContar(k, vmax, eqs, dadas, limite) {
    // eqs: [{ c: [quantas vezes cada runa], s }]
    const ordem = seq(k).sort((a, b) => eqs.filter(e => e.c[b]).length - eqs.filter(e => e.c[a]).length);
    const val = Array(k).fill(0), usado = Array(vmax + 1).fill(false);
    const prontas = seq(k).map(j => eqs.filter(e => e.c.every((q, r) => !q || ordem.indexOf(r) <= j)));
    let q = 0;
    const rec = j => {
      if (j === k) { q++; return; }
      const rr = ordem[j];
      const cand = dadas[rr] != null ? [dadas[rr]] : seq(vmax).map(x => x + 1);
      for (const v of cand) {
        if (usado[v]) continue;
        val[rr] = v; usado[v] = true;
        if (prontas[j].every(e => e.c.reduce((a, qq, r2) => a + qq * val[r2], 0) === e.s)) rec(j + 1);
        usado[v] = false;
        if (q >= limite) return;
      }
    };
    rec(0);
    return q;
  }
  const montarSomas = memo('somas', (def, r) => {
    const lv = nv(def.dif), k = SOM_K[lv], [w, h] = SOM_WH[lv], vmax = SOM_VMAX[lv];
    const runas = embaralhar(E.RUNAS, r).slice(0, k);
    for (let tent = 0; tent < 120; tent++) {
      const vals = embaralhar(seq(vmax).map(x => x + 1), r).slice(0, k);
      let g = embaralhar(seq(w * h).map(i => (i < k ? i : Math.floor(r() * k))), r);
      const lin = seq(h).map(y => seq(w).reduce((a, x) => a + vals[g[y * w + x]], 0)), col = seq(w).map(x => seq(h).reduce((a, y) => a + vals[g[y * w + x]], 0));
      const ocultas = embaralhar(seq(w + h), r).slice(0, SOM_OCULTAS[lv]);
      const L = lin.map((s, y) => (ocultas.includes(y) ? null : s)), Cc = col.map((s, x) => (ocultas.includes(h + x) ? null : s));
      const eqs = [];
      L.forEach((s, y) => { if (s != null) { const c = Array(k).fill(0); for (let x = 0; x < w; x++) c[g[y * w + x]]++; eqs.push({ c, s }); } });
      Cc.forEach((s, x) => { if (s != null) { const c = Array(k).fill(0); for (let y = 0; y < h; y++) c[g[y * w + x]]++; eqs.push({ c, s }); } });
      const dadas = {};
      let q = somContar(k, vmax, eqs, dadas, 2);
      if (q !== 1 && tent < 60) continue;
      const ord = embaralhar(seq(k), r);
      while (q !== 1 && Object.keys(dadas).length < k - 1) { const rr = ord.find(x => dadas[x] == null); dadas[rr] = vals[rr]; q = somContar(k, vmax, eqs, dadas, 2); }
      if (q !== 1) continue;
      return { pub: { w, h, k, runas, g, lin: L, col: Cc, vmax, dadas }, estado: {}, provaCerta: vals.join(','), seg: { vals } };
    }
    return { pub: { w: 1, h: 1, k: 1, runas: [E.RUNAS[0]], g: [0], lin: [1], col: [1], vmax: 1, dadas: {} }, estado: {}, provaCerta: '1', seg: { vals: [1] } };
  });
  const valSoma = (jg, i) => { const d = (jg.pub.dadas || {})[i]; if (d != null) return d; const v = jg.estado['v' + i]; return intOk(v, 1, jg.pub.vmax) ? v : 0; };
  const provaSomas = (jg, t) => { if (t !== 'conferir') return null; const v = seq(jg.pub.k).map(i => valSoma(jg, i)); return v.every(Boolean) ? v.join(',') : null; };
  function dicaSomas(jg, m) {
    const d = listaInt(jg.estado.d, 0, 20), i = seq(jg.pub.k).find(x => (jg.pub.dadas || {})[x] == null && !d.includes(x) && valSoma(jg, x) !== m.seg.vals[x]) ?? seq(jg.pub.k).find(x => (jg.pub.dadas || {})[x] == null && !d.includes(x));
    if (i == null || d.length + Object.keys(jg.pub.dadas || {}).length >= jg.pub.k - 1) return null;
    return { mudas: { d: d.concat(i), ['v' + i]: m.seg.vals[i] }, txt: 'a runa ' + jg.pub.runas[i] + ' vale ' + m.seg.vals[i] };
  }
  function demoSomas(m) {
    const p = m.pub, mudas = {};
    const passos = [{ txt: 'Cada runa vale um número (de 1 a ' + p.vmax + ', sem repetir). As somas estão na ponta das linhas e embaixo das colunas.', alvo: 'sl0' }];
    const r0 = seq(p.k).find(i => p.dadas[i] == null);
    passos.push({ txt: 'Escolham o valor de cada runa na chave, embaixo.', alvo: 'v' + r0, mudas: { ['v' + r0]: m.seg.vals[r0] } });
    seq(p.k).forEach(i => { if (p.dadas[i] == null) mudas['v' + i] = m.seg.vals[i]; });
    passos.push({ txt: 'A soma de agora aparece ao lado. Quando tudo bater, apertem Conferir.', alvo: 'ok', mudas });
    passos.push({ txt: 'Resolvido!', t: 'conferir', fim: true });
    return passos;
  }

  /* ======================= Quadrado mágico ======================= */
  const MAG_N = [3, 3, 4, 4, 5], MAG_DADAS = [4, 2, 8, 6, 12];
  function magicoBase(n) {
    const g = Array(n * n).fill(0);
    if (n === 3) return [2, 7, 6, 9, 5, 1, 4, 3, 8];
    if (n === 4) { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = i * 4 + j + 1; g[i * 4 + j] = i % 4 === j % 4 || (i + j) % 4 === 3 ? 17 - v : v; } return g; }
    let i = 0, j = (n - 1) / 2;
    for (let k = 1; k <= n * n; k++) { g[i * n + j] = k; const ni = (i - 1 + n) % n, nj = (j + 1) % n; if (g[ni * n + nj]) i = (i + 1) % n; else { i = ni; j = nj; } }
    return g;
  }
  function transf(g, n, t) {
    const out = Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let a = x, b = y;
      for (let k = 0; k < (t & 3); k++) { const na = n - 1 - b; b = a; a = na; }
      if (t & 4) a = n - 1 - a;
      out[b * n + a] = g[y * n + x];
    }
    return out;
  }
  function magicoOk(g, n) {
    const M = n * (n * n + 1) / 2;
    if (g.some(v => !intOk(v, 1, n * n)) || new Set(g).size !== n * n) return false;
    for (let y = 0; y < n; y++) if (seq(n).reduce((a, x) => a + g[y * n + x], 0) !== M) return false;
    for (let x = 0; x < n; x++) if (seq(n).reduce((a, y) => a + g[y * n + x], 0) !== M) return false;
    return seq(n).reduce((a, i) => a + g[i * n + i], 0) === M && seq(n).reduce((a, i) => a + g[i * n + n - 1 - i], 0) === M;
  }
  const montarMagico = memo('magico', (def, r) => {
    const lv = nv(def.dif), n = MAG_N[lv];
    let g = transf(magicoBase(n), n, Math.floor(r() * 8));
    if (r() < 0.5) g = g.map(v => n * n + 1 - v);
    if (n === 4 && r() < 0.5) { const s = [0, 2, 1, 3], h = g.slice(); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) g[y * 4 + x] = h[s[y] * 4 + s[x]]; }
    const dadas = Array(n * n).fill(0);
    for (const i of embaralhar(seq(n * n), r).slice(0, MAG_DADAS[lv])) dadas[i] = g[i];
    return { pub: { n, M: lv < 2 ? n * (n * n + 1) / 2 : null, dadas }, estado: {}, provaCerta: 'magico:' + n, seg: { sol: g } };
  });
  const valMag = (jg, i) => jg.pub.dadas[i] || (intOk(jg.estado['c' + i], 1, jg.pub.n * jg.pub.n) ? jg.estado['c' + i] : 0);
  const provaMagico = jg => { const n = jg.pub.n, g = seq(n * n).map(i => valMag(jg, i)); return magicoOk(g, n) ? 'magico:' + n : null; };
  function dicaMagico(jg, m) {
    const n = jg.pub.n, sol = m.seg.sol, d = listaInt(jg.estado.d, 0, 99);
    const i = seq(n * n).find(k => !jg.pub.dadas[k] && !d.includes(k) && valMag(jg, k) !== sol[k]);
    if (i == null) return null;
    const mudas = { ['c' + i]: sol[i], d: d.concat(i) };
    for (let k = 0; k < n * n; k++) if (k !== i && !jg.pub.dadas[k] && jg.estado['c' + k] === sol[i]) mudas['c' + k] = null;
    return { mudas, txt: 'o número de uma casa' };
  }
  function demoMagico(m) {
    const p = m.pub, sol = m.seg.sol, mudas = {};
    const i0 = seq(p.n * p.n).find(i => !p.dadas[i]);
    const passos = [{ txt: 'Ponham os números de 1 a ' + p.n * p.n + ', cada um uma vez.', alvo: 'c' + i0, mudas: { ['c' + i0]: sol[i0] } }];
    passos.push({ txt: 'Todas as linhas, colunas e as duas diagonais têm que dar a mesma soma' + (p.M ? ' (' + p.M + ').' : '.'), alvo: 'sl0' });
    seq(p.n * p.n).forEach(i => { if (!p.dadas[i]) mudas['c' + i] = sol[i]; });
    passos.push({ txt: 'Fechou: todas as somas iguais.', mudas, fim: true });
    return passos;
  }

  /* ======================= Conta cifrada ======================= */
  const CC_OPS = [[2, 2], [3, 3], [3, 3, 3], [4, 4], [4, 4, 4]], CC_MIN = [2, 1, 0, 0, 0];
  function ccContar(ops, res, nR, lead, dadas, limite) {
    const L = res.length, val = Array(nR).fill(-1), usado = Array(10).fill(false);
    let q = 0;
    const colDe = c => ({ ds: ops.map(o => (c < o.length ? o[o.length - 1 - c] : -1)).filter(x => x >= 0), rr: c < L ? res[L - 1 - c] : -1 });
    const cols = seq(L).map(colDe);
    const rec = (c, carry) => {
      if (q >= limite) return;
      if (c === L) { if (carry === 0) q++; return; }
      const { ds, rr } = cols[c];
      const falta = [...new Set(ds.concat(rr))].filter(x => val[x] < 0);
      const tenta = j => {
        if (j === falta.length) {
          const s = ds.reduce((a, x) => a + val[x], 0) + carry;
          if (s % 10 !== val[rr]) return;
          rec(c + 1, Math.floor(s / 10));
          return;
        }
        const x = falta[j];
        const cand = dadas[x] != null ? [dadas[x]] : seq(10);
        for (const v of cand) {
          if (usado[v] || (v === 0 && lead.has(x))) continue;
          val[x] = v; usado[v] = true;
          tenta(j + 1);
          val[x] = -1; usado[v] = false;
          if (q >= limite) return;
        }
      };
      tenta(0);
    };
    rec(0, 0);
    return q;
  }
  const montarContaCifrada = memo('contacifrada', (def, r) => {
    const lv = nv(def.dif), lens = CC_OPS[lv];
    for (let tent = 0; tent < 60; tent++) {
      const nums = lens.map(l => Math.floor(10 ** (l - 1) + r() * 9 * 10 ** (l - 1)));
      const soma = nums.reduce((a, x) => a + x, 0);
      const digs = [...new Set((nums.join('') + soma).split('').map(Number))];
      if (digs.length < CC_MIN[lv] + 3) continue;
      const runasD = embaralhar(E.RUNAS, r).slice(0, digs.length);
      const idx = {}; digs.forEach((d, i) => { idx[d] = i; });
      const ops = nums.map(x => String(x).split('').map(c => idx[c])), res = String(soma).split('').map(c => idx[c]);
      const lead = new Set(ops.map(o => o[0]).concat(res[0]));
      const dadas = {};
      const ord = embaralhar(seq(digs.length), r);
      for (let k = 0; k < CC_MIN[lv]; k++) dadas[ord[k]] = digs[ord[k]];
      let q = ccContar(ops, res, digs.length, lead, dadas, 2), k = CC_MIN[lv];
      while (q !== 1 && k < digs.length - 2) { dadas[ord[k]] = digs[ord[k]]; k++; q = ccContar(ops, res, digs.length, lead, dadas, 2); }
      if (q !== 1) continue;
      return { pub: { ops, res, runas: runasD, dadas }, estado: {}, provaCerta: digs.join(','), seg: { digs } };
    }
    return { pub: { ops: [[0], [1]], res: [2], runas: E.RUNAS.slice(0, 3), dadas: { 0: 1, 1: 2 } }, estado: {}, provaCerta: '1,2,3', seg: { digs: [1, 2, 3] } };
  });
  const valCC = (jg, i) => { const d = (jg.pub.dadas || {})[i]; if (d != null) return d; const v = jg.estado['d' + i]; return intOk(v, 0, 9) ? v : -1; };
  const provaContaCifrada = (jg, t) => { if (t !== 'conferir') return null; const v = seq(jg.pub.runas.length).map(i => valCC(jg, i)); return v.every(x => x >= 0) ? v.join(',') : null; };
  function dicaContaCifrada(jg, m) {
    const d = listaInt(jg.estado.dd, 0, 20), n = jg.pub.runas.length;
    const i = seq(n).find(x => (jg.pub.dadas || {})[x] == null && !d.includes(x) && valCC(jg, x) !== m.seg.digs[x]) ?? seq(n).find(x => (jg.pub.dadas || {})[x] == null && !d.includes(x));
    if (i == null || d.length + Object.keys(jg.pub.dadas || {}).length >= n - 1) return null;
    return { mudas: { dd: d.concat(i), ['d' + i]: m.seg.digs[i] }, txt: 'a runa ' + jg.pub.runas[i] + ' é o ' + m.seg.digs[i] };
  }
  function demoContaCifrada(m) {
    const p = m.pub, mudas = {};
    const i0 = seq(p.runas.length).find(i => p.dadas[i] == null);
    const passos = [{ txt: 'Uma conta de somar com runas no lugar dos números. Cada runa é um algarismo, e runas diferentes são algarismos diferentes.', alvo: 'conta' }];
    passos.push({ txt: 'Comecem pela coluna da direita, como na escola. Nenhum número começa com 0.', alvo: 'd' + i0, mudas: { ['d' + i0]: m.seg.digs[i0] } });
    seq(p.runas.length).forEach(i => { if (p.dadas[i] == null) mudas['d' + i] = m.seg.digs[i]; });
    passos.push({ txt: 'Com todas as runas, apertem Conferir.', alvo: 'ok', mudas });
    passos.push({ txt: 'Resolvido!', t: 'conferir', fim: true });
    return passos;
  }

  /* ======================= Oito guardas ======================= */
  const G8_N = [4, 5, 6, 7, 8], G8_FIX = [0, 0, 1, 1, 2], G8_PEDRAS = [0, 0, 2, 4, 6];
  const ataca = (n, a, b) => { const ax = a % n, ay = Math.floor(a / n), bx = b % n, by = Math.floor(b / n); return ax === bx || ay === by || Math.abs(ax - bx) === Math.abs(ay - by); };
  function rainhas(n, r) {
    const col = [];
    const rec = y => { if (y === n) return true; for (const x of embaralhar(seq(n), r)) { if (col.some((cx, cy) => cx === x || Math.abs(cx - x) === y - cy)) continue; col.push(x); if (rec(y + 1)) return true; col.pop(); } return false; };
    rec(0);
    return col.map((x, y) => y * n + x);
  }
  const montarGuardas8 = memo('guardas8', (def, r) => {
    const lv = nv(def.dif), n = G8_N[lv], sol = rainhas(n, r);
    const fixos = embaralhar(sol, r).slice(0, G8_FIX[lv]).sort((a, b) => a - b);
    const pedras = embaralhar(seq(n * n).filter(i => !sol.includes(i)), r).slice(0, G8_PEDRAS[lv]).sort((a, b) => a - b);
    return { pub: { n, fixos, pedras }, estado: {}, provaCerta: 'g8:' + n, seg: { sol } };
  });
  const guardasDe = jg => [...new Set(jg.pub.fixos.concat(listaInt(jg.estado.g, 0, jg.pub.n * jg.pub.n - 1)))];
  const conflitosG8 = jg => { const g = guardasDe(jg), n = jg.pub.n, c = new Set(); for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) if (ataca(n, g[i], g[j])) { c.add(g[i]); c.add(g[j]); } return c; };
  const provaGuardas8 = jg => { const g = guardasDe(jg); return g.length === jg.pub.n && !g.some(i => jg.pub.pedras.includes(i)) && conflitosG8(jg).size === 0 ? 'g8:' + jg.pub.n : null; };
  function dicaGuardas8(jg, m) {
    const g = guardasDe(jg), i = m.seg.sol.find(x => !g.includes(x));
    if (i == null) return null;
    const meus = listaInt(jg.estado.g, 0, 999).filter(x => !ataca(jg.pub.n, x, i));
    return { mudas: { g: meus.concat(i) }, txt: 'um guarda no lugar' };
  }
  function demoGuardas8(m) {
    const p = m.pub, minhas = m.seg.sol.filter(i => !p.fixos.includes(i));
    return [
      { txt: 'Ponham ' + p.n + ' guardas no tabuleiro. Um guarda vê a linha, a coluna e as diagonais inteiras.', alvo: 'g' + minhas[0], mudas: { g: minhas.slice(0, 1) } },
      { txt: 'Nenhum guarda pode ver outro. Quem está à vista fica vermelho.', alvo: 'g' + minhas[1], mudas: { g: minhas.slice(0, 2) } },
      { txt: 'Todos escondidos uns dos outros: resolvido!', mudas: { g: minhas }, fim: true },
    ];
  }

  /* ======================= Campo de armadilhas ======================= */
  const CAMPO_N = [5, 6, 7, 8, 9], CAMPO_DENS = [0.16, 0.18, 0.2, 0.2, 0.22], CAMPO_TIRA = [0.3, 0.42, 0.52, 0.62, 0.7];
  const viz8 = (n, i) => { const x = i % n, y = Math.floor(i / n), o = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < n && b < n) o.push(b * n + a); } return o; };
  function campoContar(n, nums, M, limite, orcamento) {
    const vars = seq(n * n).filter(i => nums[i] == null);
    const pos = {}; vars.forEach((v, k) => { pos[v] = k; });
    const cons = seq(n * n).filter(i => nums[i] != null).map(i => ({ need: nums[i], free: viz8(n, i).filter(j => nums[j] == null).length, vs: viz8(n, i).filter(j => nums[j] == null) }));
    if (cons.some(c => c.need > c.free)) return 0;
    const deVar = vars.map(() => []);
    cons.forEach((c, k) => { for (const v of c.vs) deVar[pos[v]].push(k); });
    // as variáveis com mais restrições antes
    const ordem = seq(vars.length).sort((a, b) => deVar[b].length - deVar[a].length);
    let q = 0, nos = 0, minas = M;
    const rec = j => {
      if (q >= limite || ++nos > orcamento) return;
      const resto = vars.length - j;
      if (minas < 0 || minas > resto) return;
      if (j === vars.length) { if (minas === 0) q++; return; }
      const v = ordem[j];
      for (const x of [0, 1]) {
        let ok = true;
        for (const k of deVar[v]) { const c = cons[k]; c.free--; c.need -= x; if (c.need < 0 || c.need > c.free) ok = false; }
        minas -= x;
        if (ok) rec(j + 1);
        minas += x;
        for (const k of deVar[v]) { const c = cons[k]; c.free++; c.need += x; }
        if (q >= limite || nos > orcamento) return;
      }
    };
    rec(0);
    return nos > orcamento ? limite : q;
  }
  const montarCampo = memo('campo', (def, r) => {
    const lv = nv(def.dif), n = CAMPO_N[lv];
    for (let tent = 0; tent < 30; tent++) {
      const M = Math.round(n * n * CAMPO_DENS[lv]), minas = embaralhar(seq(n * n), r).slice(0, M).sort((a, b) => a - b), eh = new Set(minas);
      const nums = seq(n * n).map(i => (eh.has(i) ? null : viz8(n, i).filter(j => eh.has(j)).length));
      if (campoContar(n, nums, M, 2, 40000) !== 1) continue;
      const alvo = Math.round((n * n - M) * CAMPO_TIRA[lv]);
      let tiradas = 0;
      for (const i of embaralhar(seq(n * n).filter(i => !eh.has(i)), r)) {
        if (tiradas >= alvo) break;
        const v = nums[i]; nums[i] = null;
        if (campoContar(n, nums, M, 2, 20000) === 1) tiradas++; else nums[i] = v;
      }
      return { pub: { n, M, nums }, estado: {}, provaCerta: minas.join(','), seg: { minas } };
    }
    return { pub: { n: 2, M: 1, nums: [1, 1, 1, null] }, estado: {}, provaCerta: '3', seg: { minas: [3] } };
  });
  const campoM = jg => { const t = jg.pub.n * jg.pub.n; return typeof jg.estado.m === 'string' && jg.estado.m.length === t ? jg.estado.m : '.'.repeat(t); };
  const provaCampo = jg => { const m = campoM(jg); return seq(m.length).filter(i => jg.pub.nums[i] == null && m[i] === 'b').join(','); };
  function dicaCampo(jg, mm) {
    const m = campoM(jg), minas = new Set(mm.seg.minas), d = listaInt(jg.estado.d, 0, 999);
    const certo = i => (minas.has(i) ? 'b' : 's');
    const i = seq(m.length).find(k => jg.pub.nums[k] == null && !d.includes(k) && m[k] !== '.' && m[k] !== certo(k)) ?? seq(m.length).find(k => jg.pub.nums[k] == null && !d.includes(k) && m[k] !== certo(k));
    if (i == null) return null;
    return { mudas: { m: trocaChar(m, i, certo(i)), d: d.concat(i) }, txt: minas.has(i) ? 'uma armadilha' : 'uma casa segura' };
  }
  function demoCampo(m) {
    const p = m.pub, minas = new Set(m.seg.minas), t = p.n * p.n;
    let mm = '.'.repeat(t);
    const num = seq(t).find(i => p.nums[i] > 0);
    const mina = viz8(p.n, num).find(j => minas.has(j) && p.nums[j] == null);
    const passos = [{ txt: 'Cada número diz quantas armadilhas há nas 8 casas em volta dele. As casas com número são seguras.', alvo: 'm' + num }];
    if (mina != null) { mm = trocaChar(mm, mina, 'b'); passos.push({ txt: 'Um clique marca a armadilha (a caveira). Outro clique marca a casa como segura.', alvo: 'm' + mina, mudas: { m: mm } }); }
    for (let i = 0; i < t; i++) if (p.nums[i] == null) mm = trocaChar(mm, i, minas.has(i) ? 'b' : 's');
    passos.push({ txt: 'Todas as ' + p.M + ' armadilhas marcadas, sem erro: resolvido!', mudas: { m: mm }, fim: true });
    return passos;
  }

  /* ======================= Tesouro enterrado ======================= */
  const TES_N = [5, 6, 7, 8, 9], TES_FROTA = [[1, 1, 1], [2, 1, 1, 1], [3, 2, 1, 1], [3, 2, 2, 1, 1], [4, 3, 2, 2, 1, 1]], TES_DADAS = [3, 2, 2, 1, 1];
  function tesCelulas(n, s) { const o = []; for (let k = 0; k < s.len; k++) o.push(s.h ? s.y * n + s.x + k : (s.y + k) * n + s.x); return o; }
  function tesPosicoes(n, len) {
    const o = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (x + len <= n) o.push({ x, y, h: true, len });
      if (len > 1 && y + len <= n) o.push({ x, y, h: false, len });
    }
    return o;
  }
  function tesContar(n, frota, lin, col, dadas, limite, orcamento) {
    const occ = new Uint8Array(n * n), bloq = new Uint16Array(n * n);
    const rl = lin.slice(), rc = col.slice();
    const pos = frota.map(len => tesPosicoes(n, len));
    let q = 0, nos = 0;
    const bloqueia = (cs, d) => { for (const c of cs) for (const j of viz8(n, c).concat(c)) bloq[j] += d; };
    const viavel = () => {
      for (let y = 0; y < n; y++) { if (rl[y] < 0) return false; let av = 0; for (let x = 0; x < n; x++) { const i = y * n + x; if (!occ[i] && !bloq[i] && dadas[i] !== 'a') av++; } if (rl[y] > av) return false; }
      for (let x = 0; x < n; x++) { if (rc[x] < 0) return false; let av = 0; for (let y = 0; y < n; y++) { const i = y * n + x; if (!occ[i] && !bloq[i] && dadas[i] !== 'a') av++; } if (rc[x] > av) return false; }
      for (let i = 0; i < n * n; i++) if (dadas[i] === 'b' && !occ[i] && bloq[i]) return false;
      return true;
    };
    const rec = (k, minIdx) => {
      if (q >= limite || ++nos > orcamento) return;
      if (k === frota.length) {
        if (rl.every(v => v === 0) && rc.every(v => v === 0) && seq(n * n).every(i => dadas[i] !== 'b' || occ[i])) q++;
        return;
      }
      const l = pos[k];
      const ini = k > 0 && frota[k] === frota[k - 1] ? minIdx : 0;
      for (let pi = ini; pi < l.length; pi++) {
        const cs = tesCelulas(n, l[pi]);
        if (cs.some(c => occ[c] || bloq[c] || dadas[c] === 'a')) continue;
        for (const c of cs) { occ[c] = 1; rl[Math.floor(c / n)]--; rc[c % n]--; }
        bloqueia(cs, 1);
        if (viavel()) rec(k + 1, pi + 1);
        bloqueia(cs, -1);
        for (const c of cs) { occ[c] = 0; rl[Math.floor(c / n)]++; rc[c % n]++; }
        if (q >= limite || nos > orcamento) return;
      }
    };
    rec(0, 0);
    return nos > orcamento ? limite : q;
  }
  const montarTesouro = memo('tesouro', (def, r) => {
    const lv = nv(def.dif), n = TES_N[lv], frota = TES_FROTA[lv];
    for (let tent = 0; tent < 40; tent++) {
      const occ = new Set(), bloq = new Set();
      let ok = true;
      for (const len of frota) {
        const l = embaralhar(tesPosicoes(n, len), r).find(s => tesCelulas(n, s).every(c => !occ.has(c) && !bloq.has(c)));
        if (!l) { ok = false; break; }
        for (const c of tesCelulas(n, l)) { occ.add(c); for (const j of viz8(n, c)) bloq.add(j); }
      }
      if (!ok) continue;
      const sol = [...occ].sort((a, b) => a - b);
      const lin = seq(n).map(y => sol.filter(c => Math.floor(c / n) === y).length), col = seq(n).map(x => sol.filter(c => c % n === x).length);
      const dadas = Array(n * n).fill('.');
      const navio = embaralhar(sol, r), agua = embaralhar(seq(n * n).filter(i => !occ.has(i)), r);
      for (let k = 0; k < TES_DADAS[lv]; k++) { const i = k % 2 === 0 ? navio.pop() : agua.pop(); if (i != null) dadas[i] = occ.has(i) ? 'b' : 'a'; }
      let q = tesContar(n, frota, lin, col, dadas, 2, 60000), extra = 0;
      while (q !== 1 && extra < n * 2) { const i = extra % 3 === 2 ? agua.pop() : navio.pop() ?? agua.pop(); if (i == null) break; dadas[i] = occ.has(i) ? 'b' : 'a'; extra++; q = tesContar(n, frota, lin, col, dadas, 2, 60000); }
      if (q !== 1) continue;
      return { pub: { n, lin, col, frota, dadas: dadas.join('') }, estado: {}, provaCerta: sol.join(','), seg: { sol } };
    }
    return { pub: { n: 2, lin: [1, 0], col: [1, 0], frota: [1], dadas: '....' }, estado: {}, provaCerta: '0', seg: { sol: [0] } };
  });
  const tesM = jg => { const t = jg.pub.n * jg.pub.n; return typeof jg.estado.m === 'string' && jg.estado.m.length === t ? jg.estado.m : '.'.repeat(t); };
  const provaTesouro = jg => { const m = tesM(jg); return seq(m.length).filter(i => jg.pub.dadas[i] === 'b' || (jg.pub.dadas[i] === '.' && m[i] === 'b')).join(','); };
  function dicaTesouro(jg, mm) {
    const m = tesM(jg), sol = new Set(mm.seg.sol), d = listaInt(jg.estado.d, 0, 999), certo = i => (sol.has(i) ? 'b' : 'a');
    const i = seq(m.length).find(k => jg.pub.dadas[k] === '.' && !d.includes(k) && m[k] === 'b' && !sol.has(k)) ?? seq(m.length).find(k => jg.pub.dadas[k] === '.' && !d.includes(k) && sol.has(k) && m[k] !== 'b');
    if (i == null) return null;
    return { mudas: { m: trocaChar(m, i, certo(i)), d: d.concat(i) }, txt: sol.has(i) ? 'uma casa com tesouro' : 'uma casa sem tesouro' };
  }
  function demoTesouro(m) {
    const p = m.pub, sol = new Set(m.seg.sol), t = p.n * p.n;
    let mm = '.'.repeat(t);
    const lz = seq(p.n).find(y => p.lin[y] === 0);
    if (lz != null) for (let x = 0; x < p.n; x++) if (p.dadas[lz * p.n + x] === '.') mm = trocaChar(mm, lz * p.n + x, 'a');
    const passos = [{ txt: 'Os números dizem quantas casas com tesouro há em cada linha e coluna. Os baús, embaixo, mostram os tamanhos.', alvo: 'cl0' }];
    if (lz != null) passos.push({ txt: 'Linha com 0: tudo areia. Dois cliques marcam areia (vazio).', alvo: 'm' + lz * p.n, mudas: { m: mm } });
    passos.push({ txt: 'Os baús nunca se encostam, nem na diagonal. Um clique marca tesouro.', alvo: 'm' + m.seg.sol[0], mudas: { m: (mm = trocaChar(mm, m.seg.sol[0], p.dadas[m.seg.sol[0]] === '.' ? 'b' : mm[m.seg.sol[0]])) } });
    for (let i = 0; i < t; i++) if (p.dadas[i] === '.') mm = trocaChar(mm, i, sol.has(i) ? 'b' : 'a');
    passos.push({ txt: 'Todos os baús achados: resolvido!', mudas: { m: mm }, fim: true });
    return passos;
  }

  /* ======================= Palavra secreta ======================= */
  const PAL_L = [4, 5, 5, 6, 6], PAL_MAX = [8, 7, 6, 6, 7];
  function palavrasDoBanco(tema) {
    const temas = tema && X.TEMAS[tema] ? [tema] : X.ORDEM_TEMAS;
    const out = [];
    for (const t of temas) for (const [p] of X.TEMAS[t][1]) { const k = chaveP(p); if (k.length >= 4 && k.length <= 8 && !out.includes(k)) out.push(k); }
    return out;
  }
  function normPalavra(p, o) {
    o.tema = Object.prototype.hasOwnProperty.call(X.TEMAS, p.tema) ? p.tema : 'taverna';
    const k = chaveP(p.palavra || '');
    if (k.length >= 4 && k.length <= 8) o.palavra = k;
  }
  const montarPalavra = memo('palavra', (def, r, ctx) => {
    const lv = nv(def.dif);
    let pal = def.palavra;
    if (!pal) {
      const L = PAL_L[lv], ban = palavrasDoBanco(def.tema), todos = palavrasDoBanco(null);
      const l = ban.filter(w => w.length === L).length ? ban.filter(w => w.length === L) : todos.filter(w => w.length === L).length ? todos.filter(w => w.length === L) : ban;
      pal = sortear(l, r);
    }
    return { pub: { L: pal.length, max: PAL_MAX[lv], modo: lv === 4 ? 'conta' : 'cores', x: cobrir(pal, ctx.sal) }, estado: {}, provaCerta: pal, seg: { pal } };
  });
  const palDe = jg => { const v = descobrir(jg.pub.x, jg.sal); return typeof v === 'string' ? v : ''; };
  // as cores de um palpite: v (lugar certo), a (está, em outro lugar), c (não está)
  function corPalavra(chute, pal) {
    const o = Array(chute.length).fill('c'), resto = {};
    for (let i = 0; i < pal.length; i++) if (chute[i] === pal[i]) o[i] = 'v'; else resto[pal[i]] = (resto[pal[i]] || 0) + 1;
    for (let i = 0; i < chute.length; i++) if (o[i] !== 'v' && resto[chute[i]]) { o[i] = 'a'; resto[chute[i]]--; }
    return o;
  }
  const provaPalavra = (jg, t) => { if (typeof t !== 'string') return null; const k = chaveP(t); return k.length === jg.pub.L ? k : null; };
  function dicaPalavra(jg, m) {
    const d = listaInt(jg.estado.d, 0, 9), i = seq(jg.pub.L).find(k => !d.includes(k));
    if (i == null || d.length >= jg.pub.L - 1) return null;
    return { mudas: { d: d.concat(i) }, txt: 'a ' + (i + 1) + 'ª letra: ' + m.seg.pal[i] };
  }
  function demoPalavra(m) {
    const pal = m.seg.pal, outra = [...pal].reverse().join('');
    return [
      { txt: 'Descubram a palavra de ' + pal.length + ' letras. Escrevam um palpite e apertem Tentar.', alvo: 'in' },
      { txt: m.pub.modo === 'cores' ? 'Verde: letra no lugar certo. Amarelo: a letra existe, mas em outro lugar. Cinza: não existe.' : 'Neste nível não há cores: só a conta de letras no lugar e fora do lugar.', alvo: 'g0', mudas: { g: [outra] } },
      { txt: 'Acabaram as tentativas? Conta um erro e começa outra rodada.', alvo: 'in' },
      { txt: 'Acertaram!', t: pal, fim: true },
    ];
  }

  /* ======================= Mensagem escondida ======================= */
  const ESC_MET = ['tras', 'pula1', 'pula2', 'zigue2', 'zigue3'];
  const ESC_DICA = {
    tras: 'A mensagem foi escrita de trás para a frente.',
    pula1: 'Entre cada letra certa há uma letra que não vale.',
    pula2: 'Entre cada letra certa há duas letras que não valem.',
    zigue2: 'A mensagem desceu e subiu em zigue-zague em 2 linhas; depois leram a linha de cima e então a de baixo.',
    zigue3: 'A mensagem desceu e subiu em zigue-zague em 3 linhas; depois leram cada linha, de cima para baixo.',
  };
  const palavrasMsg = s => E.sem(s).toUpperCase().replace(/[^A-Z ]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  function zigue(l, k) {
    const linhas = [...Array(k)].map(() => []);
    let y = 0, d = 1;
    for (const c of l) { linhas[y].push(c); if (k > 1) { if (y === 0) d = 1; else if (y === k - 1) d = -1; y += d; } }
    return linhas.map(x => x.join(''));
  }
  const grupos5 = s => s.match(/.{1,5}/g).join(' ');
  const montarEspelhada = memo('espelhada', (def, r) => {
    const lv = nv(def.dif), met = ESC_MET[lv];
    let pal = palavrasMsg(def.msg || '');
    if (pal.join('').length < 4) pal = palavrasMsg(sortear(E.MENSAGENS, r));
    const letras = pal.join('');
    const lixo = () => 'ABCDEFGHILMNOPRSTUV'[Math.floor(r() * 19)];
    let txt;
    if (met === 'tras') txt = [...pal.join(' ')].reverse().join('');
    else if (met === 'pula1') txt = grupos5([...letras].map(c => c + lixo()).join('').slice(0, -1));
    else if (met === 'pula2') txt = grupos5([...letras].map(c => c + lixo() + lixo()).join('').slice(0, -2));
    else txt = grupos5(zigue([...letras], met === 'zigue2' ? 2 : 3).join(''));
    return { pub: { metodo: met, txt, dica: ESC_DICA[met], L: letras.length, nPal: pal.length }, estado: {}, provaCerta: letras, seg: { pal } };
  });
  const provaEspelhada = (jg, t) => { if (typeof t !== 'string') return null; const k = chaveP(t); return k.length ? k : null; };
  function dicaEspelhada(jg, m) {
    const ja = typeof jg.estado.w === 'string' && jg.estado.w ? jg.estado.w.split(' ').length : 0;
    if (ja >= m.seg.pal.length - 1) return null;
    return { mudas: { w: m.seg.pal.slice(0, ja + 1).join(' ') }, txt: 'mais uma palavra do começo' };
  }
  function demoEspelhada(m) {
    return [
      { txt: 'A mensagem está escrita de um jeito torto. A frase embaixo dela conta o truque.', alvo: 'txt' },
      { txt: 'Desfaçam o truque e escrevam a mensagem certa. Espaços e acentos não importam.', alvo: 'in' },
      { txt: 'Resposta errada conta um erro. Certa: resolvido!', t: m.seg.pal.join(' '), fim: true },
    ];
  }

  /* ======================= Ordem dos acontecimentos ======================= */
  const HISTORIAS = [
    ['O roubo do cálice', ['O bispo tranca o cálice', 'O sino toca a meia-noite', 'Um vulto pula o muro', 'O cão do jardineiro late', 'A janela da sacristia é forçada', 'O cálice some da caixa', 'Uma pegada de lama fica no altar', 'O vigia acha a porta aberta']],
    ['A noite da tempestade', ['O céu escurece no oeste', 'Os pescadores puxam os barcos', 'O primeiro raio cai no farol', 'A chuva apaga as tochas', 'O moinho perde uma pá', 'A ponte velha é levada', 'O vento acalma de madrugada', 'O sol nasce sobre a lama']],
    ['A caçada ao lobo', ['Somem três ovelhas', 'O pastor acha pegadas', 'Os caçadores se reúnem', 'Armam a isca na clareira', 'O lobo uiva na colina', 'A armadilha dispara', 'O lobo foge ferido', 'Acham a toca na pedreira']],
    ['A coroação', ['O velho rei morre', 'O conselho se reúne', 'O herdeiro volta do exílio', 'Os nobres juram lealdade', 'O bispo unge o herdeiro', 'A coroa é posta', 'O povo grita na praça', 'Começa o banquete']],
    ['O naufrágio', ['O navio deixa o porto', 'O vigia vê nuvens negras', 'O mastro racha', 'O casco bate no recife', 'Baixam os botes', 'O navio afunda', 'Os botes chegam à ilha', 'Acendem a fogueira de socorro']],
    ['O feitiço que deu errado', ['O aprendiz rouba o grimório', 'Lê o feitiço à luz de vela', 'Mistura a poção errada', 'O caldeirão transborda', 'Os gatos começam a falar', 'O mestre volta da viagem', 'O mestre desfaz o feitiço', 'O aprendiz lava o laboratório']],
  ];
  const ORD_N = [4, 5, 6, 7, 8];
  const ORD_TIPOS = [{ pos: 2, antes: 3, logo: 2 }, { antes: 3, logo: 2, npos: 2 }, { antes: 2, entre: 2, npos: 2, logo: 1 }, { antes: 2, entre: 2, dist: 2, npos: 1 }, { antes: 2, entre: 2, dist: 2, npos: 1 }];
  function ordVale(c, pos) {
    switch (c.k) {
      case 'pos': return pos[c.a] === c.q;
      case 'npos': return pos[c.a] !== c.q;
      case 'antes': return pos[c.a] < pos[c.b];
      case 'logo': return pos[c.b] === pos[c.a] + 1;
      case 'entre': return (pos[c.a] < pos[c.b] && pos[c.b] < pos[c.c]) || (pos[c.c] < pos[c.b] && pos[c.b] < pos[c.a]);
      case 'dist': return Math.abs(pos[c.a] - pos[c.b]) - 1 === c.q;
    }
    return false;
  }
  function ordAleatoria(k, n, r) {
    const a = Math.floor(r() * n); let b = Math.floor(r() * n); while (b === a) b = Math.floor(r() * n); let c = Math.floor(r() * n); while (c === a || c === b) c = Math.floor(r() * n);
    const q = Math.floor(r() * n);
    if (k === 'dist') return { k, a, b, q: Math.floor(r() * (n - 1)) };
    return { k, a, b, c, q };
  }
  function ordPistas(n, sol, lv, falsa, r) {
    const pos = []; sol.forEach((e, i) => { pos[e] = i; });
    const P = permsDe(n).map(pm => { const ps = []; pm.forEach((e, i) => { ps[e] = i; }); return ps; });
    const tipos = ORD_TIPOS[lv], ks = Object.keys(tipos);
    const verdade = c => { const v = new Uint8Array(P.length); for (let k = 0; k < P.length; k++) v[k] = ordVale(c, P[k]) ? 1 : 0; return v; };
    const contar = vs => { let q = 0; for (let k = 0; k < P.length; k++) { let ok = 1; for (const v of vs) if (!v[k]) { ok = 0; break; } q += ok; } return q; };
    let cand = seq(P.length), pis = [], vs = [];
    for (let t = 0; t < 400 && cand.length > 1; t++) {
      const k = porPeso(ks, x => tipos[x], r)[0], c = ordAleatoria(k, n, r);
      if (!ordVale(c, pos)) continue;
      const nov = cand.filter(i => ordVale(c, P[i]));
      if (nov.length === cand.length) continue;
      cand = nov; pis.push(c); vs.push(verdade(c));
    }
    for (let k = pis.length - 1; k >= 0 && pis.length > 2; k--) {
      const sem = vs.slice(0, k).concat(vs.slice(k + 1));
      if (contar(sem) === 1) { pis.splice(k, 1); vs.splice(k, 1); }
    }
    if (falsa) {
      // as ordens que quebram exatamente uma pista: a falsa tem que ser verdadeira em nenhuma delas
      const um = [];
      for (let k = 0; k < P.length; k++) { let f = 0; for (const v of vs) if (!v[k]) f++; if (f === 1) um.push(P[k]); }
      for (let t = 0; t < 400; t++) {
        const f = ordAleatoria(sortear(ks, r), n, r);
        if (ordVale(f, pos) || um.some(ps => ordVale(f, ps))) continue;
        pis = pis.concat(f); break;
      }
    }
    return embaralhar(pis, r);
  }
  function ordFrase(c, evs) {
    const Q = i => '“' + evs[i] + '”';
    switch (c.k) {
      case 'pos': return Q(c.a) + ' foi o ' + ORD[c.q] + ' acontecimento.';
      case 'npos': return Q(c.a) + ' não foi o ' + ORD[c.q] + '.';
      case 'antes': return Q(c.a) + ' aconteceu antes de ' + Q(c.b) + '.';
      case 'logo': return Q(c.b) + ' veio logo depois de ' + Q(c.a) + '.';
      case 'entre': return Q(c.b) + ' aconteceu entre ' + Q(c.a) + ' e ' + Q(c.c) + '.';
      case 'dist': return c.q === 0 ? Q(c.a) + ' e ' + Q(c.b) + ' aconteceram um logo depois do outro.' : 'Entre ' + Q(c.a) + ' e ' + Q(c.b) + ' houve exatamente ' + c.q + (c.q === 1 ? ' acontecimento.' : ' acontecimentos.');
    }
    return '';
  }
  function normOrd(p, o) {
    const d = p.ord;
    if (!ehObj(d)) return;
    const evs = unicos(listaTxt(d.evs, 8, 60));
    if (evs.length >= 3) o.ord = { tit: E.linha(d.tit, 60), evs };
  }
  const montarOrdem = memo('ordem', (def, r) => {
    const lv = nv(def.dif);
    let tit, certos;
    if (def.ord) { tit = def.ord.tit || 'O que aconteceu'; certos = def.ord.evs; }
    else {
      const [t, evs] = sortear(HISTORIAS, r), n = ORD_N[lv];
      tit = t; certos = embaralhar(seq(evs.length), r).slice(0, n).sort((a, b) => a - b).map(i => evs[i]);
    }
    const n = certos.length;
    let ver = embaralhar(seq(n), r);
    if (ver.every((x, i) => x === i)) ver = ver.slice(1).concat(ver[0]);
    const evs = ver.map(i => certos[i]);                     // como aparecem
    const sol = seq(n).map(i => ver.indexOf(i));             // a ordem certa, em índices de "evs"
    const pis = ordPistas(n, sol, lv, lv === 4, r);
    return { pub: { n, tit, evs, pis: pis.map(c => ordFrase(c, evs)), falsa: lv === 4 }, estado: {}, provaCerta: sol.join(','), seg: { sol } };
  });
  const ordemDe = jg => { const o = listaInt(jg.estado.o, 0, jg.pub.n - 1, 20); return o.length === jg.pub.n && new Set(o).size === jg.pub.n ? o : seq(jg.pub.n); };
  const provaOrdem = (jg, t) => (t === 'conferir' ? ordemDe(jg).join(',') : null);
  function dicaOrdem(jg, m) {
    const o = ordemDe(jg).slice(), d = listaInt(jg.estado.d, 0, 9), sol = m.seg.sol;
    const k = seq(jg.pub.n).find(i => !d.includes(sol[i]) && o[i] !== sol[i]) ?? seq(jg.pub.n).find(i => !d.includes(sol[i]));
    if (k == null || d.length >= jg.pub.n - 2) return null;
    const j = o.indexOf(sol[k]); [o[k], o[j]] = [o[j], o[k]];
    return { mudas: { o, d: d.concat(sol[k]) }, txt: '“' + jg.pub.evs[sol[k]] + '” no lugar (o ' + ORD[k] + ')' };
  }
  function demoOrdem(m) {
    const p = m.pub, sol = m.seg.sol, o = seq(p.n);
    const j = o.indexOf(sol[0]); [o[0], o[j]] = [o[j], o[0]];
    return [
      { txt: 'Os acontecimentos estão fora de ordem. As pistas dizem o que veio antes e depois.', alvo: 'p0' },
      { txt: 'Usem as setas para subir e descer cada cartão. Clicar numa pista risca ela.', alvo: 'up' + sol[0], mudas: { o } },
      { txt: 'Com a ordem montada, apertem Conferir. Errar conta um erro.', alvo: 'ok', mudas: { o: sol.slice() } },
      { txt: 'Resolvido!', t: 'conferir', fim: true },
    ];
  }

  /* ======================= Achar as diferenças ======================= */
  const DIF_N = [4, 5, 6, 6, 7], DIF_K = [3, 4, 5, 6, 7];
  const DIF_TIPOS = [['troca', 'some'], ['troca', 'some'], ['troca', 'some', 'cor'], ['troca', 'cor', 'gira', 'some'], ['troca', 'cor', 'gira', 'some']];
  // uma casa: -1 (vazia) ou símbolo*16 + cor*4 + giro
  const montarDiferencas = memo('diferencas', (def, r) => {
    const lv = nv(def.dif), n = DIF_N[lv], k = DIF_K[lv], S = E.ORDEM_SIMBOLOS.length, esp = lv === 4, comCor = lv >= 2;
    const a = seq(n * n).map(() => (r() < 0.12 ? -1 : Math.floor(r() * S) * 16 + (comCor ? Math.floor(r() * 4) : 0) * 4));
    const b = a.slice(), difs = embaralhar(seq(n * n), r).slice(0, k).sort((x, y) => x - y);
    for (const i of difs) {
      const v = a[i], tipo = v < 0 ? 'troca' : sortear(DIF_TIPOS[lv], r);
      if (tipo === 'some') b[i] = -1;
      else if (tipo === 'cor') b[i] = (v & ~12) | ((((v >> 2) & 3) + 1 + Math.floor(r() * 3)) % 4) << 2;
      else if (tipo === 'gira') b[i] = (v & ~3) | (1 + Math.floor(r() * 3));
      else { let s; do { s = Math.floor(r() * S); } while (v >= 0 && s === v >> 4); b[i] = s * 16 + (v >= 0 ? v & 15 : 0); }
    }
    // no Absoluto, a da direita está espelhada (vira de lado)
    const bv = esp ? seq(n * n).map(i => { const x = i % n, y = Math.floor(i / n), j = y * n + (n - 1 - x), v = b[j]; return v < 0 ? v : (v & ~3) | ((4 - (v & 3)) % 4); }) : b;
    return { pub: { n, a, b: bv, esp, k }, estado: {}, provaCerta: difs.join(','), seg: { difs } };
  });
  // a casa da direita (como aparece) → a da esquerda
  const difPar = (pub, i) => (pub.esp ? Math.floor(i / pub.n) * pub.n + (pub.n - 1 - (i % pub.n)) : i);
  const difsAchadas = jg => [...new Set(listaInt(jg.estado.f, 0, jg.pub.n * jg.pub.n - 1))].sort((a, b) => a - b);
  const provaDiferencas = jg => difsAchadas(jg).join(',');
  function dicaDiferencas(jg, m) {
    const f = difsAchadas(jg), i = m.seg.difs.find(x => !f.includes(x));
    if (i == null || f.length >= m.seg.difs.length - 1) return null;
    return { mudas: { f: f.concat(i) }, txt: 'uma diferença' };
  }
  function demoDiferencas(m) {
    const d = m.seg.difs;
    return [
      { txt: 'Os dois quadros parecem iguais, mas têm ' + m.pub.k + ' diferenças.' + (m.pub.esp ? ' O da direita está espelhado.' : ''), alvo: 'quadros' },
      { txt: 'Achou uma? Clique na casa (em qualquer um dos quadros).', alvo: 'a' + d[0], mudas: { f: [d[0]] } },
      { txt: 'Todas achadas: resolvido!', mudas: { f: d.slice() }, fim: true },
    ];
  }

  /* ---------------- o registro ---------------- */
  const P = (tipo, x) => E.registrar(tipo, Object.assign({ niveis: 5 }, x));
  const NIVS = {
    deducao: ['3 pessoas e 1 coluna; pistas diretas.', '3 pessoas e 2 colunas; entram as pistas de “quem… também…”.', '4 pessoas e 2 colunas; quase tudo por exclusão.', '4 pessoas e 3 colunas; entram as pistas de “ou”.', '5 pessoas e 3 colunas; pistas de “ou um ou outro”.'],
    guardas: ['2 guardas e 2 portas; um deles mente, o outro não.', '3 guardas e 3 portas; não se sabe quantos mentem.', 'Também é preciso dizer quem mente.', '4 guardas; alguns falam duas coisas, e contam quantos mentem.', '5 guardas e 4 portas; frases com “se…”.'],
    nonograma: ['Grade 5×5, com casas de ajuda.', 'Grade 7×7.', 'Grade 8×8.', 'Grade 10×10, sem ajuda.', 'Grade 12×12, sem ajuda.'],
    somas: ['3 runas que valem de 1 a 6.', '4 runas de 1 a 9.', '5 runas.', '6 runas e uma soma escondida.', '7 runas e duas somas escondidas.'],
    magico: ['3×3 com a soma à vista e 4 números dados.', '3×3 com só 2 números.', '4×4; a soma não aparece.', '4×4 com menos números dados.', '5×5.'],
    contacifrada: ['Duas parcelas de 2 runas; 2 runas já ditas.', 'Duas parcelas de 3 runas.', 'Três parcelas de 3 runas.', 'Duas parcelas de 4 runas.', 'Três parcelas de 4 runas.'],
    guardas8: ['Tabuleiro 4×4, 4 guardas.', '5×5, 5 guardas.', '6×6 com 1 guarda fixo e pedras onde não se pode pôr.', '7×7 com mais pedras.', '8×8 com 2 guardas fixos e 6 pedras.'],
    campo: ['5×5, muitos números.', '6×6.', '7×7, menos números.', '8×8.', '9×9, poucos números.'],
    tesouro: ['5×5, 3 baús de 1 casa.', '6×6, um baú de 2 casas.', '7×7, baús de até 3 casas.', '8×8, mais baús.', '9×9, baús de até 4 casas e quase sem ajuda.'],
    palavra: ['4 letras, 8 tentativas.', '5 letras, 7 tentativas.', '5 letras, 6 tentativas.', '6 letras, 6 tentativas.', '6 letras e sem cores: só a conta de letras certas.'],
    espelhada: ['De trás para a frente.', 'Uma letra falsa entre as certas.', 'Duas letras falsas entre as certas.', 'Zigue-zague em 2 linhas.', 'Zigue-zague em 3 linhas.'],
    ordem: ['4 acontecimentos; pistas de lugar exato.', '5 acontecimentos.', '6, com pistas de “entre”.', '7, com pistas de distância.', '8, e uma das pistas é falsa.'],
    diferencas: ['4×4, 3 diferenças.', '5×5, 4 diferenças.', '6×6, 5 diferenças; muda a cor. Clicar errado conta erro.', '6×6, 6 diferenças; o símbolo também gira.', '7×7, 7 diferenças, e o quadro da direita está espelhado.'],
  };
  P('deducao', { nome: 'Quadro de dedução', grupo: 'Lógica e dedução', erra: true, desc: 'Pelas pistas, descubram quem fez o quê: marquem ✓ e ✕ no quadro e apertem Conferir.', manual: true,
    normDef: normDed, montar: montarDeducao, prova: provaDeducao, dica: dicaDeducao, demo: demoDeducao, niv: NIVS.deducao,
    resposta: m => m.pub.pes.map((nm, i) => nm + ': ' + m.pub.cats.map((c, k) => c.v[m.seg.sol[k][i]]).join(', ')).join(' · ') });
  P('guardas', { nome: 'Guardas que mentem', grupo: 'Lógica e dedução', erra: true, desc: 'Uns guardas sempre dizem a verdade, outros sempre mentem. Pelo que dizem, achem a porta segura.', manual: true,
    normDef: normGrd, montar: montarGuardas, prova: provaGuardas, dica: dicaGuardas, demo: demoGuardas, niv: NIVS.guardas,
    resposta: m => 'a porta ' + m.pub.ps[m.seg.s] + (m.pub.papeis ? '; mentem: ' + (m.pub.gs.filter((_, k) => !m.seg.R[k]).join(', ') || 'ninguém') : '') });
  P('nonograma', { nome: 'Nonograma', grupo: 'Lógica e dedução', erra: false, desc: 'Os números dizem os blocos pintados de cada linha e coluna. Pintem até o desenho aparecer.',
    montar: montarNonograma, prova: provaNonograma, dica: dicaNonograma, demo: demoNonograma, niv: NIVS.nonograma, resposta: () => 'o desenho completo (a dica pinta uma casa)' });
  P('somas', { nome: 'Somas de runas', grupo: 'Lógica e dedução', erra: true, desc: 'Cada runa vale um número. As somas das linhas e colunas dizem quanto.',
    montar: montarSomas, prova: provaSomas, dica: dicaSomas, demo: demoSomas, niv: NIVS.somas, resposta: m => m.pub.runas.map((s, i) => s + ' = ' + m.seg.vals[i]).join(', ') });
  P('magico', { nome: 'Quadrado mágico', grupo: 'Lógica e dedução', erra: false, desc: 'Ponham os números para que todas as linhas, colunas e diagonais deem a mesma soma.',
    montar: montarMagico, prova: provaMagico, dica: dicaMagico, demo: demoMagico, niv: NIVS.magico, resposta: m => 'a soma de cada linha é ' + m.pub.n * (m.pub.n * m.pub.n + 1) / 2 });
  P('contacifrada', { nome: 'Conta cifrada', grupo: 'Lógica e dedução', erra: true, desc: 'Uma conta de somar com runas no lugar dos algarismos. Descubram cada um.',
    montar: montarContaCifrada, prova: provaContaCifrada, dica: dicaContaCifrada, demo: demoContaCifrada, niv: NIVS.contacifrada, resposta: m => m.pub.runas.map((s, i) => s + ' = ' + m.seg.digs[i]).join(', ') });
  P('guardas8', { nome: 'Oito guardas', grupo: 'Lógica e dedução', erra: false, desc: 'Ponham os guardas no tabuleiro sem que nenhum veja o outro (linha, coluna ou diagonal).',
    montar: montarGuardas8, prova: provaGuardas8, dica: dicaGuardas8, demo: demoGuardas8, niv: NIVS.guardas8, resposta: m => 'um guarda por linha e por coluna, sem diagonais' });
  P('campo', { nome: 'Campo de armadilhas', grupo: 'Lógica e dedução', erra: false, desc: 'Cada número conta as armadilhas em volta. Marquem todas as armadilhas.',
    montar: montarCampo, prova: provaCampo, dica: dicaCampo, demo: demoCampo, niv: NIVS.campo, resposta: m => m.seg.minas.length + ' armadilhas (a dica revela uma casa)' });
  P('tesouro', { nome: 'Tesouro enterrado', grupo: 'Lógica e dedução', erra: false, desc: 'Os números das bordas contam as casas com tesouro. Os baús não se encostam.',
    montar: montarTesouro, prova: provaTesouro, dica: dicaTesouro, demo: demoTesouro, niv: NIVS.tesouro, resposta: m => m.seg.sol.length + ' casas com tesouro (a dica revela uma)' });
  P('palavra', { nome: 'Palavra secreta', grupo: 'Palavras e códigos', erra: true, desc: 'Adivinhem a palavra. Cada palpite mostra as letras certas, as do lugar errado e as que não estão.', manual: true,
    normDef: normPalavra, montar: montarPalavra, prova: provaPalavra, dica: dicaPalavra, demo: demoPalavra, niv: NIVS.palavra, resposta: m => m.seg.pal });
  P('espelhada', { nome: 'Mensagem escondida', grupo: 'Palavras e códigos', erra: true, desc: 'A mensagem foi escrita torta. Desfaçam o truque e escrevam a mensagem.',
    normDef: (p, o) => { const v = E.linha(p.msg, 160); if (v) o.msg = v; }, montar: montarEspelhada, prova: provaEspelhada, dica: dicaEspelhada, demo: demoEspelhada, niv: NIVS.espelhada, resposta: m => m.seg.pal.join(' ') });
  P('ordem', { nome: 'Ordem dos acontecimentos', grupo: 'Palavras e códigos', erra: true, desc: 'Ponham os acontecimentos na ordem certa, pelas pistas.', manual: true,
    normDef: normOrd, montar: montarOrdem, prova: provaOrdem, dica: dicaOrdem, demo: demoOrdem, niv: NIVS.ordem, resposta: m => m.seg.sol.map(i => m.pub.evs[i]).join(' → ') });
  P('diferencas', { nome: 'Achar as diferenças', grupo: 'Olhos e memória', erra: true, desc: 'Os dois quadros têm diferenças. Achem todas.',
    montar: montarDiferencas, prova: provaDiferencas, dica: dicaDiferencas, demo: demoDiferencas, niv: NIVS.diferencas, resposta: m => m.seg.difs.length + ' diferenças (a dica mostra uma)' });

  const api = {
    DED_CATS, DED_PES, dedIdx, dedMarcas, dedResposta, dedContar, grdSolucoes, papelGrd, linhaPode, nonoResolver, nonoP, valNono, blocos,
    valSoma, somContar, magicoOk, valMag, valCC, ccContar, ataca, guardasDe, conflitosG8, viz8, campoM, campoContar, tesM, tesContar,
    palDe, corPalavra, palavrasDoBanco, palavrasMsg, zigue, HISTORIAS, ordemDe, ordVale, difPar, difsAchadas, ORD,
  };
  E.mais2 = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
