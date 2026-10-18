/* Tiny Cats · Mapa-múndi · os reinos (lote 10): as contas do território, sem página e sem DOM.
   As províncias são as regiões de fora (sem uma região em volta); as sub-regiões ficam dentro delas (os ducados, as
   prefeituras…, em quantos níveis o mestre quiser). As contas fecham na província; cada sub-região mostra a parte dela
   e pode ter outro dono (a facção dela vale para os hexágonos de dentro dela).
   Os hexágonos de uma região são os da grade com o centro dentro dela; os "próprios" são os dela menos os das
   sub-regiões de dentro (que ficam com a sub-região). O Livro do reino conta, por facção, as províncias, as sub-regiões,
   os hexágonos e os exércitos (com as tropas).
   (parte 2) A economia do mundo (mapa.eco, normalizada no núcleo): os recursos (os de começo: Lapros, Suprimentos,
   Madeira, Pedra, Orith e Runas), a produção por semana de cada hexágono pelo terreno, a de cada mil pessoas dos
   assentamentos e o valor que o mestre escreve na região. A parte própria de uma região soma os hexágonos próprios, os
   assentamentos dela (o de dentro de uma sub-região fica com a sub-região) e o valor do mestre; a província soma a dela
   e a das sub-regiões; cada facção, a parte própria das regiões dela. O estoque de cada facção é o número do recurso
   do mundo nela (f.rec, com o mesmo id).
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

  /* ---------------- (parte 2) a economia ---------------- */
  // os recursos de começo (o mestre renomeia, tira e cria outros); o papel diz o que cada um é para as regras
  const RECURSOS_INICIAIS = [
    { id: 'lapros', nome: 'Lapros', cor: '#e6ab4f', papel: 'moeda' },
    { id: 'suprimentos', nome: 'Suprimentos', cor: '#9fbf4a', papel: 'comida' },
    { id: 'madeira', nome: 'Madeira', cor: '#a8743c', papel: 'madeira' },
    { id: 'pedra', nome: 'Pedra', cor: '#9aa3b5', papel: 'pedra' },
    { id: 'orith', nome: 'Orith', cor: '#7fb7e0', papel: 'metal' },
    { id: 'runas', nome: 'Runas', cor: '#b39cf0', papel: 'magia' },
  ];
  // a produção de começo de cada terreno (por hexágono, por semana), pelo papel do recurso
  const TERRENO_INICIAL = {
    pl: { comida: 2 }, fl: { madeira: 2, comida: 0.5 }, co: { pedra: 1, comida: 1 }, mo: { pedra: 2, metal: 1 }, pa: { comida: 0.5, magia: 0.5 },
    de: { moeda: 0.5 }, ne: {}, ag: { comida: 1 }, la: { comida: 3 }, ru: { pedra: 1, magia: 0.5 }, lv: { metal: 1, magia: 0.5 }, cr: { magia: 2 },
    se: { madeira: 2, comida: 1 }, sv: { comida: 1.5 }, tu: { comida: 0.5 }, tc: { magia: 1 },
  };
  const POP_INICIAL = { moeda: 5 };                                 // por mil pessoas, por semana
  const NIVEIS_INICIAIS = [{ id: 'aldeia', nome: 'Aldeia', esp: 2 }, { id: 'vila', nome: 'Vila', esp: 4 }, { id: 'cidade', nome: 'Cidade', esp: 6 }, { id: 'metropole', nome: 'Metrópole', esp: 8 }];
  const copia = x => JSON.parse(JSON.stringify(x));
  const ecoDe = m => (ehObj(m) && ehObj(m.eco) && m.eco.on ? m.eco : null);
  const arred2 = v => Math.round(v * 100) / 100 + 0;
  // soma b (vezes k) em a, recurso a recurso; o que dá zero sai
  function somar(a, b, k) {
    if (!ehObj(b)) return a;
    for (const id of Object.keys(b)) { const v = arred2((a[id] || 0) + (Number(b[id]) || 0) * (k == null ? 1 : k)); if (v) a[id] = v; else delete a[id]; }
    return a;
  }
  // a economia de começo para este mapa: os recursos, a tabela do terreno (dos terrenos que ele tem) e os níveis
  function ecoInicial(m) {
    const rec = copia(RECURSOS_INICIAIS), porPapel = {}, ter = {};
    for (const r of rec) porPapel[r.papel] = r.id;
    for (const t of ehObj(m) && Array.isArray(m.terrenos) ? m.terrenos : []) {
      const base = TERRENO_INICIAL[t.id], linha = {};
      if (base) for (const p of Object.keys(base)) if (porPapel[p] && base[p]) linha[porPapel[p]] = base[p];
      if (Object.keys(linha).length) ter[t.id] = linha;
    }
    const pop = {};
    for (const p of Object.keys(POP_INICIAL)) if (porPapel[p]) pop[porPapel[p]] = POP_INICIAL[p];
    return { on: true, rec, ter, pop, niv: copia(NIVEIS_INICIAIS) };
  }
  const semAcento = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  /* Os recursos do mundo numa facção (no rascunho de App.mudar): cada um vira um número dela, com o mesmo id e o mesmo
     nome — o que ela já tinha com o mesmo nome passa a ser ele (o histórico acompanha). → os que ela já tinha:
     [{ nome }] */
  function recursosNaFaccao(m, f) {
    const eco = ehObj(m) && ehObj(m.eco) ? m.eco : null, ligados = [];
    if (!eco || !ehObj(f)) return ligados;
    if (!Array.isArray(f.rec)) f.rec = [];
    const doMundo = new Set(eco.rec.map(r => r.id));
    for (const w of eco.rec) {
      let x = f.rec.find(r => r.id === w.id);
      if (!x) {
        x = f.rec.find(r => !doMundo.has(r.id) && semAcento(r.nome) === semAcento(w.nome));
        if (x) {
          const de = 'r:' + x.id;
          for (const e of Array.isArray(f.hist) ? f.hist : []) for (const u of Array.isArray(e.mud) ? e.mud : []) if (u[0] === de) u[0] = 'r:' + w.id;
          x.id = w.id;
          ligados.push({ nome: x.nome });
        } else if (f.rec.length < 40) { x = { id: w.id, nome: w.nome, n: 0, ver: false }; f.rec.push(x); }
      }
      if (x) x.nome = w.nome;
    }
    return ligados;
  }
  /* Ligar a economia (no rascunho): a de começo (ou a que estava guardada, desligada), os recursos do mundo em cada
     facção e o mapa contando os dias da semana (a semana fecha de domingo para segunda; sem a semana, hoje vira
     segunda-feira). → { ligados: [{ fac, nome }], semana: true se passou a contar a semana } */
  function ligarEconomia(m) {
    const N = NN();
    if (!ehObj(m.eco)) m.eco = ecoInicial(m);
    m.eco.on = true;
    const ligados = [];
    for (const f of m.faccoes || []) for (const l of recursosNaFaccao(m, f)) ligados.push({ fac: f.id, nome: l.nome });
    let semana = false;
    if (ehObj(m.cal) && !Number.isInteger(m.cal.sem0)) { m.cal.sem0 = N.sem0Para(m.cal.dia, 0); semana = true; }
    return { ligados, semana };
  }
  // os assentamentos (os marcadores com assentamento) e a região de cada um (a de mais dentro que tem o marcador)
  const cacheAss = typeof WeakMap === 'function' ? new WeakMap() : null;
  function assentamentosDe(m) {
    if (cacheAss && cacheAss.has(m)) return cacheAss.get(m);
    const N = NN(), out = [];
    for (const o of objsDe(m)) if (ehObj(o) && o.k === 'm' && ehObj(o.ass)) out.push({ o, r: N.regiaoEm(m, o.x, o.y) });
    if (cacheAss) cacheAss.set(m, out);
    return out;
  }
  const nivelDe = (m, id) => { const e = ehObj(m) && ehObj(m.eco) ? m.eco : null; return e && id ? e.niv.find(n => n.id === id) || null : null; };
  /* A parte própria de uma região, por semana: { terreno, pop, mestre, total } (cada um { recurso: n }); null sem a
     economia ligada. */
  const cacheProd = typeof WeakMap === 'function' ? new WeakMap() : null;
  function producaoPropria(m, r) {
    const eco = ecoDe(m);
    if (!eco || !ehObj(r) || r.k !== 'r') return null;
    let c = cacheProd ? cacheProd.get(m) : null;
    if (cacheProd && !c) { c = new Map(); cacheProd.set(m, c); }
    if (c && c.has(r.id)) return c.get(r.id);
    const out = { terreno: {}, pop: {}, mestre: {}, total: {} };
    for (const k of hexesProprios(m, r)) { const t = terrenoDoHex(m, k); if (t && eco.ter[t.id]) somar(out.terreno, eco.ter[t.id]); }
    for (const a of assentamentosDe(m)) if (a.r && a.r.id === r.id && a.o.ass.pop > 0) somar(out.pop, eco.pop, a.o.ass.pop / 1000);
    somar(out.mestre, r.prod);
    somar(somar(somar(out.total, out.terreno), out.pop), out.mestre);
    if (c) c.set(r.id, out);
    return out;
  }
  // a produção de uma região com a das sub-regiões de dentro (a província soma tudo): o mesmo formato
  function producaoDaRegiao(m, r) {
    const p = producaoPropria(m, r);
    if (!p) return null;
    const out = { terreno: somar({}, p.terreno), pop: somar({}, p.pop), mestre: somar({}, p.mestre), total: somar({}, p.total) };
    for (const { r: s } of subregioesDe(m, r)) { const q = producaoPropria(m, s); for (const k of ['terreno', 'pop', 'mestre', 'total']) somar(out[k], q[k]); }
    return out;
  }
  // a produção de cada facção por semana (a parte própria das regiões dela): { por: { facção: { recurso: n } }, sem }
  function producaoPorFaccao(m) {
    const N = NN(), por = {}, sem = {};
    if (!ecoDe(m)) return { por, sem };
    for (const f of m.faccoes || []) por[f.id] = {};
    for (const r of regioes(m)) { const fid = N.facDaRegiao(m, r); somar(fid && por[fid] ? por[fid] : sem, producaoPropria(m, r).total); }
    return { por, sem };
  }
  // os assentamentos de dentro de uma região (os dela e os das sub-regiões): [{ o, r, nivel }]
  function assentamentosDaRegiao(m, r) {
    if (!ehObj(r)) return [];
    const ids = new Set([r.id].concat(subregioesDe(m, r).map(x => x.r.id)));
    return assentamentosDe(m).filter(a => a.r && ids.has(a.r.id)).map(a => Object.assign({ nivel: nivelDe(m, a.o.ass.niv) }, a));
  }

  const MundoReino = { ehProvincia, provinciaDe, subregioesDe, hexesDaRegiao, hexesProprios, terrenoDoHex, terrenosDaRegiao, livroDoReino,
    RECURSOS_INICIAIS, TERRENO_INICIAL, POP_INICIAL, NIVEIS_INICIAIS, ecoDe, somar, ecoInicial, recursosNaFaccao, ligarEconomia,
    assentamentosDe, nivelDe, producaoPropria, producaoDaRegiao, producaoPorFaccao, assentamentosDaRegiao };
  if (typeof module === 'object' && module && module.exports) module.exports = MundoReino;
  if (typeof window !== 'undefined') window.MundoReino = MundoReino;
})();
