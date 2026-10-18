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
   (parte 3) As construções: o catálogo (os de começo: produção, defesa e cívico, com 3 níveis cada), as exigências (o
   nível do assentamento, um terreno na região, outra construção pronta antes) e o espaço; começar a obra paga o custo
   do nível na hora (do estoque da facção escolhida, com o histórico), cancelar devolve, terminar põe o nível para valer.
   As prontas produzem e gastam por semana (na parte própria da região do assentamento) e somam a defesa na fortificação.
   A sede do clã: os números que o mestre dá às construções do clã vão para a facção ligada ao clã (sem ela, para a
   dona do lugar).
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
    const e = { on: true, rec, ter, pop, niv: copia(NIVEIS_INICIAIS) };
    e.cons = catalogoPronto(m, e);                                   // (parte 3) o catálogo de construções de começo
    return e;
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
  /* A parte própria de uma região, por semana: { terreno, pop, cons, gasto, mestre, total } (cada um { recurso: n }; o
     gasto das construções, negativo); null sem a economia ligada. */
  const cacheProd = typeof WeakMap === 'function' ? new WeakMap() : null;
  function producaoPropria(m, r) {
    const eco = ecoDe(m);
    if (!eco || !ehObj(r) || r.k !== 'r') return null;
    let c = cacheProd ? cacheProd.get(m) : null;
    if (cacheProd && !c) { c = new Map(); cacheProd.set(m, c); }
    if (c && c.has(r.id)) return c.get(r.id);
    const out = { terreno: {}, pop: {}, cons: {}, gasto: {}, mestre: {}, total: {} };
    for (const k of hexesProprios(m, r)) { const t = terrenoDoHex(m, k); if (t && eco.ter[t.id]) somar(out.terreno, eco.ter[t.id]); }
    for (const a of assentamentosDe(m)) if (a.r && a.r.id === r.id && a.o.ass.pop > 0) somar(out.pop, eco.pop, a.o.ass.pop / 1000);
    for (const a of assentamentosDe(m)) if (a.r && a.r.id === r.id && a.o.ass.cons) { const e = efeitoDasConstrucoes(m, a.o); somar(out.cons, e.prod); somar(out.gasto, e.gasto); }
    somar(out.mestre, r.prod);
    somar(somar(somar(out.total, out.terreno), out.pop), out.mestre);
    somar(somar(out.total, out.cons), out.gasto);
    if (c) c.set(r.id, out);
    return out;
  }
  // a produção de uma região com a das sub-regiões de dentro (a província soma tudo): o mesmo formato
  function producaoDaRegiao(m, r) {
    const p = producaoPropria(m, r);
    if (!p) return null;
    const out = { terreno: somar({}, p.terreno), pop: somar({}, p.pop), cons: somar({}, p.cons), gasto: somar({}, p.gasto), mestre: somar({}, p.mestre), total: somar({}, p.total) };
    for (const { r: s } of subregioesDe(m, r)) { const q = producaoPropria(m, s); for (const k of ['terreno', 'pop', 'cons', 'gasto', 'mestre', 'total']) somar(out[k], q[k]); }
    return out;
  }
  /* A produção de cada facção por semana (a parte própria das regiões dela; (parte 3) e as sedes dos clãs): { por: {
     facção: { recurso: n } }, sem }. clas (opcional): clã → { fac (a facção ligada a ele), cons (Set: as construções
     dele que existem) } | null — um Map ou uma função; sem o clã, a produção da sede vai para a dona do lugar. */
  function producaoPorFaccao(m, clas) {
    const N = NN(), por = {}, sem = {};
    if (!ecoDe(m)) return { por, sem };
    for (const f of m.faccoes || []) por[f.id] = {};
    for (const r of regioes(m)) { const fid = N.facDaRegiao(m, r); somar(fid && por[fid] ? por[fid] : sem, producaoPropria(m, r).total); }
    for (const a of assentamentosDe(m)) {
      const c = a.o.ass.cla;
      if (!c) continue;
      const info = infoDoCla(clas, c.id), p = producaoDoCla(m, a.o, info ? info.cons : null), dono = a.r ? N.facDaRegiao(m, a.r) : null;
      const fid = info && info.fac && por[info.fac] ? info.fac : dono;
      somar(fid && por[fid] ? por[fid] : sem, p);
    }
    return { por, sem };
  }
  const infoDoCla = (clas, id) => (!clas || !id ? null : typeof clas === 'function' ? clas(id) || null : typeof clas.get === 'function' ? clas.get(id) || null : null);
  // os assentamentos de dentro de uma região (os dela e os das sub-regiões): [{ o, r, nivel }]
  function assentamentosDaRegiao(m, r) {
    if (!ehObj(r)) return [];
    const ids = new Set([r.id].concat(subregioesDe(m, r).map(x => x.r.id)));
    return assentamentosDe(m).filter(a => a.r && ids.has(a.r.id)).map(a => Object.assign({ nivel: nivelDe(m, a.o.ass.niv) }, a));
  }

  /* ---------------- (parte 3) as construções ---------------- */
  // o catálogo de começo (pelo papel dos recursos; os terrenos e os níveis pelos ids de começo): 3 níveis cada
  const NV = (custo, sem, prod, gasto, def) => ({ custo, sem, prod: prod || {}, gasto: gasto || {}, def: def || 0, ef: '' });
  const CONSTRUCOES_INICIAIS = [
    // produção
    { id: 'fazenda', nome: 'Fazenda', ic: 'fazenda', esp: 1, exige: {}, niveis: [NV({ madeira: 10, moeda: 10 }, 2, { comida: 6 }), NV({ madeira: 15, moeda: 20 }, 2, { comida: 10 }), NV({ madeira: 25, moeda: 35 }, 3, { comida: 15 })] },
    { id: 'serraria', nome: 'Serraria', ic: 'serraria', esp: 1, exige: {}, niveis: [NV({ moeda: 15 }, 2, { madeira: 6 }), NV({ moeda: 25, pedra: 5 }, 2, { madeira: 10 }), NV({ moeda: 40, pedra: 10 }, 3, { madeira: 15 })] },
    { id: 'pedreira', nome: 'Pedreira', ic: 'mina', esp: 1, exige: { ter: ['co', 'mo'] }, niveis: [NV({ madeira: 10, moeda: 15 }, 3, { pedra: 5 }), NV({ madeira: 15, moeda: 25 }, 3, { pedra: 8 }), NV({ madeira: 25, moeda: 40 }, 4, { pedra: 12 })] },
    { id: 'mina', nome: 'Mina de Orith', ic: 'mina', esp: 1, exige: { ter: ['co', 'mo'] }, niveis: [NV({ madeira: 15, pedra: 10, moeda: 20 }, 4, { metal: 3 }), NV({ madeira: 20, pedra: 15, moeda: 35 }, 4, { metal: 5 }), NV({ madeira: 30, pedra: 25, moeda: 50 }, 5, { metal: 8 })] },
    { id: 'mercado', nome: 'Mercado', ic: 'mercado', esp: 1, exige: { niv: 'vila' }, niveis: [NV({ madeira: 15, pedra: 10 }, 3, { moeda: 10 }), NV({ madeira: 20, pedra: 20, moeda: 20 }, 3, { moeda: 16 }), NV({ madeira: 30, pedra: 30, moeda: 40 }, 4, { moeda: 24 })] },
    { id: 'santuario', nome: 'Santuário rúnico', ic: 'runa', esp: 1, exige: {}, niveis: [NV({ pedra: 15, metal: 5 }, 4, { magia: 3 }, { moeda: 2 }), NV({ pedra: 20, metal: 10, moeda: 20 }, 4, { magia: 5 }, { moeda: 3 }), NV({ pedra: 30, metal: 15, moeda: 40 }, 5, { magia: 8 }, { moeda: 4 })] },
    // defesa
    { id: 'palicada', nome: 'Paliçada', ic: 'palicada', esp: 1, exige: {}, niveis: [NV({ madeira: 20 }, 2, null, null, 1), NV({ madeira: 30, moeda: 10 }, 2, null, null, 2), NV({ madeira: 40, moeda: 20 }, 3, null, null, 3)] },
    { id: 'muralha', nome: 'Muralha', ic: 'muralha', esp: 2, exige: { niv: 'cidade' }, niveis: [NV({ pedra: 40, moeda: 30 }, 6, null, null, 3), NV({ pedra: 60, moeda: 45 }, 6, null, null, 5), NV({ pedra: 90, moeda: 70, metal: 10 }, 8, null, null, 7)] },
    { id: 'quartel', nome: 'Quartel', ic: 'quartel', esp: 1, exige: {}, niveis: [NV({ madeira: 20, pedra: 10 }, 3, null, { comida: 3 }), NV({ madeira: 30, pedra: 20, moeda: 20 }, 3, null, { comida: 5 }), NV({ madeira: 40, pedra: 30, moeda: 40 }, 4, null, { comida: 8 })] },
    { id: 'torre', nome: 'Torre de vigia', ic: 'torre', esp: 1, exige: {}, niveis: [NV({ madeira: 10, pedra: 10 }, 2), NV({ madeira: 15, pedra: 20 }, 2), NV({ pedra: 30, moeda: 20 }, 3)] },
    // cívico
    { id: 'templo', nome: 'Templo', ic: 'templo', esp: 1, exige: {}, niveis: [NV({ pedra: 20, moeda: 20 }, 4), NV({ pedra: 30, moeda: 35 }, 4), NV({ pedra: 50, moeda: 60 }, 6)] },
    { id: 'taverna', nome: 'Taverna', ic: 'taverna', esp: 1, exige: {}, niveis: [NV({ madeira: 10, moeda: 10 }, 2, { moeda: 3 }), NV({ madeira: 15, moeda: 20 }, 2, { moeda: 5 }), NV({ madeira: 25, moeda: 30 }, 3, { moeda: 8 })] },
    { id: 'celeiro', nome: 'Celeiro', ic: 'celeiro', esp: 1, exige: {}, niveis: [NV({ madeira: 15 }, 2), NV({ madeira: 25, pedra: 5 }, 2), NV({ madeira: 35, pedra: 15 }, 3)] },
    { id: 'porto', nome: 'Porto', ic: 'porto', esp: 2, exige: { ter: ['ag'] }, niveis: [NV({ madeira: 30, pedra: 10 }, 5, { moeda: 8, comida: 3 }), NV({ madeira: 45, pedra: 20, moeda: 20 }, 5, { moeda: 12, comida: 5 }), NV({ madeira: 60, pedra: 30, moeda: 40 }, 6, { moeda: 18, comida: 8 })] },
    { id: 'biblioteca', nome: 'Biblioteca', ic: 'biblioteca', esp: 1, exige: {}, niveis: [NV({ pedra: 15, moeda: 25 }, 4, { magia: 1 }), NV({ pedra: 25, moeda: 40 }, 4, { magia: 2 }), NV({ pedra: 35, moeda: 60 }, 5, { magia: 3 })] },
  ];
  /* O catálogo de começo para a economia deste mapa: os papéis viram os recursos dela (o primeiro de cada papel; o papel
     que nenhum recurso tem sai), os terrenos e os níveis que o mapa não tem saem das exigências. */
  function catalogoPronto(m, eco) {
    const e = eco || (ehObj(m) && ehObj(m.eco) ? m.eco : null), porPapel = {};
    for (const r of e && Array.isArray(e.rec) ? e.rec : []) if (r.papel && !porPapel[r.papel]) porPapel[r.papel] = r.id;
    const terIds = new Set((ehObj(m) && Array.isArray(m.terrenos) ? m.terrenos : []).map(t => t.id)), nivIds = new Set((e && Array.isArray(e.niv) ? e.niv : []).map(n => n.id));
    const tab = t => { const o = {}; for (const p of Object.keys(t || {})) if (porPapel[p] && t[p]) o[porPapel[p]] = t[p]; return o; };
    return CONSTRUCOES_INICIAIS.map(c => ({ id: c.id, nome: c.nome, ic: c.ic, esp: c.esp,
      exige: { niv: c.exige.niv && nivIds.has(c.exige.niv) ? c.exige.niv : null, ter: (c.exige.ter || []).filter(t => terIds.has(t)), cons: null },
      niveis: c.niveis.map(n => ({ custo: tab(n.custo), sem: n.sem, prod: tab(n.prod), gasto: tab(n.gasto), def: n.def, ef: n.ef })) }));
  }
  const tipoDe = (m, id) => { const e = ehObj(m) && ehObj(m.eco) ? m.eco : null; return e && Array.isArray(e.cons) && id ? e.cons.find(c => c.id === id) || null : null; };
  const idxNivel = (m, id) => { const e = ehObj(m) && ehObj(m.eco) ? m.eco : null; return e && id ? e.niv.findIndex(n => n.id === id) : -1; };
  const nomeRec = (m, id) => { const r = ehObj(m) && ehObj(m.eco) ? m.eco.rec.find(x => x.id === id) : null; return r ? r.nome : id; };
  const nomesOu = l => (l.length <= 1 ? l.join('') : l.slice(0, -1).join(', ') + ' ou ' + l[l.length - 1]);
  // os espaços de um assentamento: { total (o do nível), usados (pelas construções, com as que estão em obra), livres }
  function espacosDe(m, o) {
    const a = ehObj(o) && ehObj(o.ass) ? o.ass : null, nv = a ? nivelDe(m, a.niv) : null;
    let usados = 0;
    for (const c of (a && a.cons) || []) { const t = tipoDe(m, c.t); usados += t ? t.esp : 0; }
    const total = nv ? nv.esp : 0;
    return { total, usados, livres: Math.max(0, total - usados) };
  }
  /* O que falta para construir um tipo num assentamento: [{ k: 'niv' | 'ter' | 'cons' | 'esp', txt }] (vazio: pode). As
     exigências do tipo (o nível mínimo, um dos terrenos na região, a outra construção pronta aqui) e o espaço. */
  function exigenciasDe(m, o, t) {
    const N = NN(), out = [], a = ehObj(o) && ehObj(o.ass) ? o.ass : null;
    if (!a || !t) return [{ k: 'tipo', txt: 'não dá' }];
    if (t.exige.niv) { const precisa = idxNivel(m, t.exige.niv); if (precisa >= 0 && idxNivel(m, a.niv) < precisa) out.push({ k: 'niv', txt: 'precisa de ' + nivelDe(m, t.exige.niv).nome + ' ou maior' }); }
    if (t.exige.ter.length) {
      const r = N.regiaoEm(m, o.x, o.y), ters = new Set(r && N.temGrade(m) ? terrenosDaRegiao(m, r).por.map(x => x.id) : []);
      if (!t.exige.ter.some(id => ters.has(id))) out.push({ k: 'ter', txt: 'precisa de ' + nomesOu(t.exige.ter.map(id => (N.terrenoDe(m, id) || { nome: id }).nome)) + ' na região' });
    }
    if (t.exige.cons && !(a.cons || []).some(c => c.t === t.exige.cons && c.n >= 1)) { const o2 = tipoDe(m, t.exige.cons); out.push({ k: 'cons', txt: 'precisa antes de ' + (o2 ? o2.nome : 'outra construção') + ' neste assentamento' }); }
    const e = espacosDe(m, o);
    if (t.esp > e.livres) out.push({ k: 'esp', txt: e.total ? 'sem espaço (ocupa ' + t.esp + '; ' + (e.livres === 1 ? 'sobra 1' : e.livres ? 'sobram ' + e.livres : 'não sobra nenhum') + ')' : 'o assentamento precisa de um nível com espaços' });
    return out;
  }
  // o nível seguinte de uma construção: { n, nv, t } — null se já está no último ou se tem obra em andamento
  function proximoNivel(m, c) { const t = ehObj(c) ? tipoDe(m, c.t) : null; return !t || c.obra || c.n >= t.niveis.length ? null : { n: c.n + 1, nv: t.niveis[c.n], t }; }
  // o que falta no estoque de uma facção para um custo: [{ id, nome, falta }] (vazio: dá; sem facção, nada falta)
  function faltaPara(m, facId, custo) {
    const f = facId && ehObj(m) ? (m.faccoes || []).find(x => x.id === facId) : null, out = [];
    if (!f) return out;
    for (const id of Object.keys(custo || {})) { const r = (f.rec || []).find(x => x.id === id), tem = r ? Number(r.n) || 0 : 0; if (tem < custo[id]) out.push({ id, nome: nomeRec(m, id), falta: arred2(custo[id] - tem) }); }
    return out;
  }
  // mexe no estoque de uma facção (no rascunho): k = −1 paga, +1 devolve. Cada número entra no histórico, com o motivo. → o que mexeu
  function moverEstoque(m, facId, tab, k, mot) {
    const N = NN(), f = facId && ehObj(m) ? (m.faccoes || []).find(x => x.id === facId) : null, feito = {};
    if (!f || !ehObj(tab)) return feito;
    recursosNaFaccao(m, f);
    for (const id of Object.keys(tab)) {
      const r = f.rec.find(x => x.id === id);
      if (!r || !(tab[id] > 0)) continue;
      if (N.facMudar(f, 'r:' + id, arred2((Number(r.n) || 0) + k * tab[id]), ehObj(m.cal) ? m.cal.dia : 0, mot || '')) feito[id] = tab[id];
    }
    return feito;
  }
  const achaObj = (m, id) => objsDe(m).find(o => ehObj(o) && o.id === id) || null;
  const consDe = (o, id) => (ehObj(o) && ehObj(o.ass) && Array.isArray(o.ass.cons) ? o.ass.cons.find(c => c.id === id) || null : null);
  /* Começar a obra de um tipo num assentamento (no rascunho): paga o custo do nível 1 do estoque de facId (null: ninguém
     paga) e a construção entra com a obra (sem semanas de obra, fica pronta na hora). → a construção, ou null */
  function comecarObra(m, oId, tipoId, facId, mot) {
    const N = NN(), o = achaObj(m, oId), t = tipoDe(m, tipoId);
    if (!o || o.k !== 'm' || !ehObj(o.ass) || !t) return null;
    if (!Array.isArray(o.ass.cons)) o.ass.cons = [];
    if (o.ass.cons.length >= ((N.LIMITES && N.LIMITES.construcoesAss) || 16)) return null;
    const nv = t.niveis[0], pago = moverEstoque(m, facId, nv.custo, -1, mot);
    let id = N.novoId('ct');
    while (o.ass.cons.some(c => c.id === id)) id = N.novoId('ct');
    const c = { id, t: t.id, n: 0, obra: { n: 1, sem: nv.sem, fac: facId || null, pago } };
    if (!nv.sem) { c.n = 1; c.obra = null; }
    o.ass.cons.push(c);
    return c;
  }
  // subir de nível (no rascunho): paga o custo do nível seguinte e começa a obra dele (o nível de agora continua valendo)
  function subirNivel(m, oId, cId, facId, mot) {
    const c = consDe(achaObj(m, oId), cId), p = c ? proximoNivel(m, c) : null;
    if (!p) return null;
    c.obra = { n: p.n, sem: p.nv.sem, fac: facId || null, pago: moverEstoque(m, facId, p.nv.custo, -1, mot) };
    if (!p.nv.sem) { c.n = p.n; c.obra = null; }
    return c;
  }
  // terminar a obra agora (no rascunho): o nível dela passa a valer
  function terminarObra(m, oId, cId) { const c = consDe(achaObj(m, oId), cId); if (!c || !c.obra) return false; c.n = c.obra.n; c.obra = null; return true; }
  // cancelar a obra (no rascunho): devolve a quem pagou; a construção que ainda não tinha ficado pronta sai
  function cancelarObra(m, oId, cId, mot) {
    const o = achaObj(m, oId), c = consDe(o, cId);
    if (!c || !c.obra) return false;
    moverEstoque(m, c.obra.fac, c.obra.pago, 1, mot);
    if (c.n > 0) c.obra = null; else o.ass.cons = o.ass.cons.filter(x => x !== c);
    if (!o.ass.cons.length) delete o.ass.cons;
    return true;
  }
  // demolir (no rascunho): a construção sai (a obra em andamento devolve o que foi pago)
  function demolir(m, oId, cId, mot) {
    const o = achaObj(m, oId), c = consDe(o, cId);
    if (!c) return false;
    if (c.obra) moverEstoque(m, c.obra.fac, c.obra.pago, 1, mot);
    o.ass.cons = o.ass.cons.filter(x => x !== c);
    if (!o.ass.cons.length) delete o.ass.cons;
    return true;
  }
  // o que as construções prontas de um assentamento fazem por semana: { prod, gasto (negativo), def (até 20) }
  function efeitoDasConstrucoes(m, o) {
    const out = { prod: {}, gasto: {}, def: 0 };
    for (const c of (ehObj(o) && ehObj(o.ass) && o.ass.cons) || []) {
      const t = tipoDe(m, c.t);
      if (!t || c.n < 1) continue;
      const nv = t.niveis[Math.min(c.n, t.niveis.length) - 1];
      somar(out.prod, nv.prod); somar(out.gasto, nv.gasto, -1); out.def += nv.def;
    }
    out.def = Math.min(20, out.def);
    return out;
  }
  // a defesa que as construções somam na fortificação do marcador (só com a economia ligada)
  const defDoAssentamento = (m, o) => (ecoDe(m) && ehObj(o) && o.k === 'm' ? efeitoDasConstrucoes(m, o).def : 0);
  // a produção da sede do clã por semana (os números do mestre; cons: as construções do clã que existem — sem a lista, todas)
  function producaoDoCla(m, o, cons) {
    const out = {}, c = ehObj(o) && ehObj(o.ass) ? o.ass.cla : null;
    if (!ecoDe(m) || !ehObj(c)) return out;
    for (const k of Object.keys(c.prod || {})) if (!cons || cons.has(k)) somar(out, c.prod[k]);
    return out;
  }

  const MundoReino = { ehProvincia, provinciaDe, subregioesDe, hexesDaRegiao, hexesProprios, terrenoDoHex, terrenosDaRegiao, livroDoReino,
    RECURSOS_INICIAIS, TERRENO_INICIAL, POP_INICIAL, NIVEIS_INICIAIS, ecoDe, somar, ecoInicial, recursosNaFaccao, ligarEconomia,
    assentamentosDe, nivelDe, producaoPropria, producaoDaRegiao, producaoPorFaccao, assentamentosDaRegiao,
    CONSTRUCOES_INICIAIS, catalogoPronto, tipoDe, espacosDe, exigenciasDe, proximoNivel, faltaPara, moverEstoque, comecarObra, subirNivel, terminarObra,
    cancelarObra, demolir, efeitoDasConstrucoes, defDoAssentamento, producaoDoCla };
  if (typeof module === 'object' && module && module.exports) module.exports = MundoReino;
  if (typeof window !== 'undefined') window.MundoReino = MundoReino;
})();
