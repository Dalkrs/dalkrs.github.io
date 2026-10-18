/* Tiny Cats · Mapa-múndi · os reinos (lote 10): as contas do território, sem página e sem DOM.
   As províncias são as regiões de fora (sem uma região em volta); as sub-regiões ficam dentro delas (os ducados, as
   prefeituras…, em quantos níveis o mestre quiser). As contas fecham na província; cada sub-região mostra a parte dela
   e pode ter outro dono (a facção dela vale para os hexágonos de dentro dela).
   Os hexágonos de uma região são os da grade com o centro dentro dela; os "próprios" são os dela menos os das
   sub-regiões de dentro (que ficam com a sub-região). O Livro do reino conta, por facção, as províncias, as sub-regiões,
   os hexágonos e os exércitos (com as tropas).
   Roda no navegador (window.MundoReino) e no Node (testes). */
(() => {
  'use strict';
  const NN = () => (typeof window !== 'undefined' && window.MundoNucleo) || (typeof require === 'function' ? require('./nucleo.js') : null);
  const ehObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const MAX_NIVEL = 10;                       // regiões dentro de regiões: até quantos níveis (o mesmo do núcleo)
  const MAX_CONTA = 800000;                   // a conta de uma região não passa de tantos hexágonos olhados (mapa enorme, grade miúda)

  const objsDe = m => (ehObj(m) && Array.isArray(m.objs) ? m.objs : []);
  const regioes = m => objsDe(m).filter(o => ehObj(o) && o.k === 'r');
  const regiaoDe = (m, id) => (id ? regioes(m).find(o => o.id === id) || null : null);

  /* ---------------- províncias e sub-regiões ---------------- */
  // a região de fora é a província
  const ehProvincia = r => ehObj(r) && r.k === 'r' && !r.pai;
  // a província de uma região: subindo pelos pais até a de fora (ela mesma, quando é de fora)
  function provinciaDe(m, r) {
    let p = ehObj(r) && r.k === 'r' ? r : null, n = 0;
    while (p && p.pai && n < MAX_NIVEL) { const q = regiaoDe(m, p.pai); if (!q || q === r) break; p = q; n++; }
    return p;
  }
  // as sub-regiões de dentro de uma região, em árvore (cada uma seguida das de dentro dela): [{ r, nivel }] — nivel 1 = filha
  function subregioesDe(m, r) {
    const todas = regioes(m), out = [], vistos = new Set();
    if (!ehObj(r)) return out;
    vistos.add(r.id);
    const desce = (pai, nivel) => {
      if (nivel > MAX_NIVEL) return;
      for (const x of todas) if (x.pai === pai.id && !vistos.has(x.id)) { vistos.add(x.id); out.push({ r: x, nivel }); desce(x, nivel + 1); }
    };
    desce(r, 1);
    return out;
  }

  /* ---------------- os hexágonos de uma região ---------------- */
  const cacheHex = typeof WeakMap === 'function' ? new WeakMap() : null;       // por mapa (o normalizado é um objeto novo a cada mudança)
  // Os hexágonos da grade com o centro dentro da região: ['q,r', …] (sem grade ou sem área: nenhum)
  function hexesDaRegiao(m, r) {
    const N = NN();
    if (!N || !N.temGrade(m) || !ehObj(r) || !Array.isArray(r.pts) || r.pts.length < 3) return [];
    let c = cacheHex ? cacheHex.get(m) : null;
    if (cacheHex && !c) { c = new Map(); cacheHex.set(m, c); }
    const chave = r.id + '|' + JSON.stringify(r.pts);
    if (c && c.has(chave)) return c.get(chave);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of r.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    // q e r andam em linha reta com x e y: os quatro cantos da caixa da região dão o quanto olhar
    const cantos = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(p => N.hexDe(m, p[0], p[1]));
    const q0 = Math.min(...cantos.map(h => h.q)) - 1, q1 = Math.max(...cantos.map(h => h.q)) + 1;
    const r0 = Math.min(...cantos.map(h => h.r)) - 1, r1 = Math.max(...cantos.map(h => h.r)) + 1;
    const out = [];
    if ((q1 - q0 + 1) * (r1 - r0 + 1) <= MAX_CONTA) {
      for (let q = q0; q <= q1; q++) for (let rr = r0; rr <= r1; rr++) {
        const ct = N.centroHex(m, q, rr);
        if (ct.x < x0 || ct.x > x1 || ct.y < y0 || ct.y > y1) continue;
        if (N.dentroPoligono([ct.x, ct.y], r.pts)) out.push(N.chaveHex({ q, r: rr }));
      }
    }
    if (c) c.set(chave, out);
    return out;
  }
  // os hexágonos que são da própria região: os dela, menos os das sub-regiões de dentro (esses ficam com a sub-região)
  function hexesProprios(m, r) {
    if (!ehObj(r)) return [];
    const meus = hexesDaRegiao(m, r), filhas = regioes(m).filter(x => x.pai === r.id);
    if (!filhas.length) return meus;
    const delas = new Set();
    for (const f of filhas) for (const k of hexesDaRegiao(m, f)) delas.add(k);
    return meus.filter(k => !delas.has(k));
  }
  // o terreno de um hexágono ('q,r'): o que o mestre deu a ele ('-' = nenhum), senão o do desenho à mão; null: nenhum
  function terrenoDoHex(m, k) {
    const N = NN(), v = ehObj(m) && ehObj(m.hexes) ? m.hexes[k] : undefined;
    const ex = typeof v === 'string' ? v : Array.isArray(v) ? v[0] : '';
    if (ex === '-') return null;
    return N.terrenoDe(m, ex || N.terrenoPintado(m).get(k) || '') || null;
  }
  // os hexágonos de uma região por terreno: { n, por: [{ id, nome, cor, n }] (do que tem mais ao que tem menos), sem }
  function terrenosDaRegiao(m, r) {
    const hs = hexesDaRegiao(m, r), cont = new Map();
    let sem = 0;
    for (const k of hs) {
      const t = terrenoDoHex(m, k);
      if (!t) { sem++; continue; }
      const x = cont.get(t.id) || { id: t.id, nome: t.nome, cor: t.cor, n: 0 };
      x.n++;
      cont.set(t.id, x);
    }
    const por = [...cont.values()].sort((a, b) => b.n - a.n || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    return { n: hs.length, por, sem };
  }

  /* ---------------- o Livro do reino ----------------
     Por facção: as províncias, as sub-regiões, os hexágonos (os de cada região ficam com a facção dela — a sub-região de
     outro dono leva os dela) e os exércitos (os grupos do tipo Exército da facção, com as tropas). A linha "sem dono"
     junta o que não tem facção. */
  function livroDoReino(m) {
    const N = NN(), fs = ehObj(m) && Array.isArray(m.faccoes) ? m.faccoes : [], grade = !!(N && N.temGrade(m));
    const nova = fac => ({ fac, prov: 0, sub: 0, hex: 0, exe: 0, tropas: 0 });
    const por = new Map(fs.map(f => [f.id, nova(f.id)])), sem = nova(null);
    const de = id => por.get(id) || sem;
    for (const r of regioes(m)) {
      const l = de(N.facDaRegiao(m, r));
      if (r.pai) l.sub++; else l.prov++;
      if (grade) l.hex += hexesProprios(m, r).length;
    }
    for (const g of objsDe(m)) {
      if (!ehObj(g) || g.k !== 'g' || !ehObj(g.exe) || g.exe.pub) continue;
      const l = de(g.fac);
      l.exe++;
      l.tropas += (Array.isArray(g.exe.unid) ? g.exe.unid : []).reduce((s, u) => s + (Number(u && u.tropas) || 0), 0);
    }
    return { grade, linhas: fs.map(f => por.get(f.id)), sem };
  }

  const MundoReino = { ehProvincia, provinciaDe, subregioesDe, hexesDaRegiao, hexesProprios, terrenoDoHex, terrenosDaRegiao, livroDoReino };
  if (typeof module === 'object' && module && module.exports) module.exports = MundoReino;
  if (typeof window !== 'undefined') window.MundoReino = MundoReino;
})();
