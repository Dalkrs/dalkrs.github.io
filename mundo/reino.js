/* Tiny Cats · Mapa-múndi · os reinos (lote 10): as contas do território, sem página e sem DOM.
   As províncias são as regiões de fora (sem uma região em volta); as sub-regiões ficam dentro delas (os ducados, as
   prefeituras…, em quantos níveis o mestre quiser). As contas fecham na província; cada sub-região mostra a parte dela
   e pode ter outro dono (a facção dela vale para os hexágonos de dentro dela).
   Os hexágonos de uma região são os da grade com o centro dentro dela; os "próprios" são os dela menos os das
   sub-regiões de dentro (que ficam com a sub-região). O Livro do reino conta, por facção, as províncias, as sub-regiões,
   os hexágonos e os exércitos (com as tropas).
   (parte 2) A economia do mundo (mapa.eco, normalizada no núcleo): os recursos (os de começo: Lapros, Suprimentos,
   Madeira, Pedra, Orith e Runas), a produção por semana de cada hexágono pelo terreno, a da população dos
   assentamentos ((parte 5) por pessoa, pelos estratos: cada estrato produz ou consome por pessoa) e o valor que o
   mestre escreve na região. A parte própria de uma região soma os hexágonos próprios, os
   assentamentos dela (o de dentro de uma sub-região fica com a sub-região) e o valor do mestre; a província soma a dela
   e a das sub-regiões; cada facção, a parte própria das regiões dela. O estoque de cada facção é o número do recurso
   do mundo nela (f.rec, com o mesmo id).
   (parte 3) As construções: o catálogo (os de começo: produção, defesa e cívico, com 3 níveis cada), as exigências (o
   nível do assentamento, um terreno na região, outra construção pronta antes) e o espaço; começar a obra paga o custo
   do nível na hora (do estoque da facção escolhida, com o histórico), cancelar devolve, terminar põe o nível para valer.
   As prontas produzem e gastam por semana (na parte própria da região do assentamento) e somam a defesa na fortificação.
   A sede do clã: os números que o mestre dá às construções do clã vão para a facção ligada ao clã (sem ela, para a
   dona do lugar).
   (parte 4) A semana: quando o calendário passa de domingo para segunda, a semana que acabou fica para fechar. A prévia
   (semanaPrevia) soma, por facção, o estoque, a produção e a manutenção dos exércitos (por tipo de tropa, a cada 10
   soldados, na proporção) e propõe o que a falta traz (o estoque não fica abaixo de zero): sem comida, o apoio cai; sem
   moeda, as obras param e a moral dos exércitos cai; sem outro recurso, as construções que gastam dele param (e os
   exércitos que o usam na manutenção perdem moral). As obras andam uma semana. aplicarSemana faz tudo isso no
   rascunho, menos as consequências que o mestre recusou; as semanas pendentes vão uma de cada vez.
   (parte 5) A população por estrato: o que cada assentamento produz pelas pessoas de cada estrato, a divisão sugerida
   de um total pelas porcentagens do nível ("Distribuir…", pelos maiores restos) e, na prévia, os lembretes dos
   estratos (os aventureiros trazem rumores…), sem mudar nenhum número.
   (parte 5b) As guildas de cada cidade: o catálogo de começo (8 modelos, pelo papel dos recursos e pelos estratos de
   começo), a guilda nova a partir de um modelo, a parte do que ela produz que vai para a facção dona da cidade (na
   produção da região, como "guildas") e a que fica no estoque dela; na semana, o estoque da guilda recebe a parte dela
   e paga o gasto (o que falta só aparece: o estoque fica em zero).
   (parte 6) O que os jogadores veem: a caixa de cada assentamento ("os jogadores veem o que tem dentro"; sem ela, as
   cidades da facção dos jogadores começam marcadas), o que eles veem dentro (o nível, a população, as construções
   prontas e as guildas que não são secretas), a economia da facção deles (o estoque e a produção por fonte e por
   província, a manutenção e a linha do Livro do reino; as outras facções, nada) e o resumo da semana para o rascunho do
   Jornal (o saldo, as obras prontas e o que a falta trouxe).
   (lote 11, parte 3b) A diplomacia na semana: o tributo das vassalas e as trocas dos tratados (mundo/diplomacia.js)
   acontecem no fim da semana, com o que sobrou a quem manda (quem não tem tudo manda o que tem; o que chega não paga o
   que sai na mesma semana); o mestre desmarca o que não vale. Os tratados e os motivos de opinião que vencem na semana
   aparecem na prévia, e as decisões do mestre (encerrar, renovar, tirar) valem junto com a semana.
   (parte 4b) As intrigas em andamento (mundo/intrigas.js) aparecem na prévia, só para o mestre; as que ele marca passam a
   ser vistas pelos jogadores junto com a semana.
   Roda no navegador (window.MundoReino) e no Node (testes). */
(() => {
  'use strict';
  const NN = () => (typeof window !== 'undefined' && window.MundoNucleo) || (typeof require === 'function' ? require('./nucleo.js') : null);
  const DIP = () => (typeof window !== 'undefined' && window.MundoDiplomacia) || (typeof require === 'function' ? require('./diplomacia.js') : null);
  const INT = () => (typeof window !== 'undefined' && window.MundoIntrigas) || (typeof require === 'function' ? require('./intrigas.js') : null);
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
    // (parte 5) os estratos de começo e a divisão de começo de cada nível
    const N = NN(), estr = N.estratosDeComeco(rec), eids = new Set(estr.map(s => s.id));
    const e = { on: true, rec, ter, estr, niv: copia(NIVEIS_INICIAIS).map(n => Object.assign(n, { dist: N.distDeComeco(n.id, eids) })) };
    e.cons = catalogoPronto(m, e);                                   // (parte 3) o catálogo de construções de começo
    e.guildas = guildasProntas(m, e);                                // (parte 5b) o catálogo de guildas de começo
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
  /* (pente fino) O número que só uma facção tem com o mesmo nome (sem acento nem maiúscula) de um recurso do mundo:
     junta no estoque dele (soma), o histórico do número vai junto e ele sai da lista (no rascunho). → { nome, de, mais,
     para } ou null (não é o caso) */
  function juntarAoMundo(m, facId, recId, mot) {
    const N = NN(), e = ehObj(m) && ehObj(m.eco) ? m.eco : null, f = e ? (m.faccoes || []).find(x => x.id === facId) : null;
    const own = f && Array.isArray(f.rec) ? f.rec.find(r => r.id === recId) : null;
    if (!own || e.rec.some(w => w.id === own.id)) return null;
    const w = e.rec.find(x => semAcento(x.nome) === semAcento(own.nome));
    if (!w) return null;
    let fw = f.rec.find(r => r.id === w.id);
    if (!fw) { fw = { id: w.id, nome: w.nome, n: 0, ver: false }; f.rec.push(fw); }
    const de = Number(fw.n) || 0, mais = Number(own.n) || 0, para = arred2(de + mais), velho = 'r:' + own.id;
    for (const h of Array.isArray(f.hist) ? f.hist : []) for (const u of Array.isArray(h.mud) ? h.mud : []) if (u[0] === velho) u[0] = 'r:' + w.id;
    f.rec = f.rec.filter(r => r.id !== own.id);
    if (own.ver) fw.ver = true;
    N.facMudar(f, 'r:' + w.id, para, ehObj(m.cal) ? m.cal.dia : 0, mot || 'juntou ' + String(own.nome || '').trim());
    return { nome: w.nome, de, mais, para };
  }
  // (pente fino) a população de uma facção: a soma dos assentamentos das regiões dela
  function populacaoDaFaccao(m, fid) {
    const N = NN();
    let n = 0;
    for (const a of assentamentosDe(m)) if (a.r && N.facDaRegiao(m, a.r) === fid) n += Number(a.o.ass.pop) || 0;
    return n;
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
    m.eco.sem = semanaN(m, ehObj(m.cal) ? m.cal.dia : 0);           // (parte 4) a semana começa a contar agora (nenhuma pendente)
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
    const out = { terreno: {}, pop: {}, cons: {}, gasto: {}, guilda: {}, mestre: {}, total: {} };
    for (const k of hexesProprios(m, r)) { const t = terrenoDoHex(m, k); if (t && eco.ter[t.id]) somar(out.terreno, eco.ter[t.id]); }
    for (const a of assentamentosDe(m)) if (a.r && a.r.id === r.id && a.o.ass.estr) somar(out.pop, producaoDaPopulacao(m, a.o));
    for (const a of assentamentosDe(m)) if (a.r && a.r.id === r.id && a.o.ass.cons) { const e = efeitoDasConstrucoes(m, a.o); somar(out.cons, e.prod); somar(out.gasto, e.gasto); }
    // (parte 5b) a parte das guildas que vai para a facção dona da cidade
    for (const a of assentamentosDe(m)) if (a.r && a.r.id === r.id && a.o.ass.guildas) for (const g of a.o.ass.guildas) somar(out.guilda, partesDaGuilda(g).fac);
    somar(out.mestre, r.prod);
    somar(somar(somar(out.total, out.terreno), out.pop), out.mestre);
    somar(somar(somar(out.total, out.cons), out.gasto), out.guilda);
    if (c) c.set(r.id, out);
    return out;
  }
  // a produção de uma região com a das sub-regiões de dentro (a província soma tudo): o mesmo formato
  function producaoDaRegiao(m, r) {
    const p = producaoPropria(m, r);
    if (!p) return null;
    const out = { terreno: somar({}, p.terreno), pop: somar({}, p.pop), cons: somar({}, p.cons), gasto: somar({}, p.gasto), guilda: somar({}, p.guilda), mestre: somar({}, p.mestre), total: somar({}, p.total) };
    for (const { r: s } of subregioesDe(m, r)) { const q = producaoPropria(m, s); for (const k of ['terreno', 'pop', 'cons', 'gasto', 'guilda', 'mestre', 'total']) somar(out[k], q[k]); }
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
  /* ---------------- (parte 5) a população por estrato ---------------- */
  // o que a população de um assentamento produz por semana: as pessoas de cada estrato vezes o que cada uma produz
  function producaoDaPopulacao(m, o) {
    const e = ecoDe(m), out = {};
    if (!e || !ehObj(o) || !ehObj(o.ass) || !ehObj(o.ass.estr)) return out;
    for (const s of e.estr) { const n = Number(o.ass.estr[s.id]) || 0; if (n > 0) somar(out, s.prod, n); }
    return out;
  }
  /* A divisão sugerida de um total de pessoas pelos estratos: as porcentagens do nível (sem o nível, as do primeiro
     nível que tem divisão; não precisam somar 100: vale a proporção), arredondada pelos maiores restos (o empate fica
     com o estrato que vem antes). → { estrato: pessoas } sem os zeros ({} sem divisão ou sem gente) */
  function distribuir(m, nivId, total) {
    const e = ehObj(m) && ehObj(m.eco) ? m.eco : null, t = Math.floor(Number(total) || 0), nv = e && t > 0 ? nivelDaDivisao(m, nivId) : null;
    if (!nv) return {};
    const ids = e.estr.map(s => s.id).filter(id => nv.dist[id] > 0), soma = ids.reduce((s, id) => s + nv.dist[id], 0);
    const exato = ids.map(id => t * nv.dist[id] / soma), base = exato.map(x => Math.floor(x + 1e-9));
    const resto = t - base.reduce((s, x) => s + x, 0), ordem = ids.map((_, i) => i).sort((a, b) => (exato[b] - base[b]) - (exato[a] - base[a]) || a - b);
    for (let k = 0; k < resto; k++) base[ordem[k % ordem.length]]++;
    const out = {};
    ids.forEach((id, i) => { if (base[i]) out[id] = base[i]; });
    return out;
  }
  // o nível cuja divisão o "Distribuir…" usa para um assentamento (o dele, senão o primeiro com divisão) — ou null
  function nivelDaDivisao(m, nivId) {
    const e = ehObj(m) && ehObj(m.eco) ? m.eco : null;
    if (!e) return null;
    const temDist = n => n && ehObj(n.dist) && e.estr.some(s => n.dist[s.id] > 0);
    return temDist(nivelDe(m, nivId)) ? nivelDe(m, nivId) : e.niv.find(temDist) || null;
  }

  /* ---------------- (parte 5b) as guildas ---------------- */
  // o catálogo de começo: a produção e o gasto por semana pelo papel do recurso; os membros, de um estrato de começo; os
  // preços dos serviços na moeda do mapa ({m}); pct = quantos % do que produz vão para a facção dona da cidade
  const GUILDAS_INICIAIS = [
    { id: 'cacadores', nome: 'Guilda dos Caçadores', ic: 'arco', estr: 'camponeses', prod: { comida: 3 }, gasto: {}, pct: 50, txt: 'Caçam nas matas e vendem carne, peles e couro.',
      serv: [['contrato', 'Caçar uma fera', '30 {m}'], ['item', 'Peles e couro', '5 {m}'], ['info', 'As trilhas da região', '3 {m}']] },
    { id: 'assassinos', nome: 'Guilda dos Assassinos', ic: 'adaga', estr: 'aventureiros', prod: { moeda: 4 }, gasto: {}, pct: 0, secreta: true, txt: 'Ninguém admite que ela existe.',
      serv: [['contrato', 'Um alvo', '200 {m}'], ['info', 'Quem quer quem morto', '20 {m}']] },
    { id: 'ladroes', nome: 'Guilda dos Ladrões', ic: 'mascara', estr: 'camponeses', prod: { moeda: 3 }, gasto: {}, pct: 0, secreta: true, txt: 'Bolsos leves, portas abertas e mercadoria sem dono.',
      serv: [['contrato', 'Um roubo', '50 {m}'], ['item', 'Mercadoria roubada', 'a combinar'], ['info', 'As rondas da guarda', '10 {m}']] },
    { id: 'mercadores', nome: 'Guilda dos Mercadores', ic: 'balanca', estr: 'mercadores', prod: { moeda: 6 }, gasto: { comida: 1 }, pct: 50, txt: 'Controlam as rotas, os preços e as caravanas.',
      serv: [['contrato', 'Escoltar uma caravana', '40 {m}'], ['item', 'Bens raros', 'a combinar'], ['info', 'Os preços em outras cidades', '5 {m}']] },
    { id: 'magos', nome: 'Círculo dos Magos', ic: 'cajado', estr: 'clero', prod: { magia: 2 }, gasto: { moeda: 2 }, pct: 30, txt: 'Estudam as runas e vendem o que sabem.',
      serv: [['item', 'Pergaminhos', '25 {m}'], ['contrato', 'Identificar um item', '15 {m}'], ['info', 'Saber arcano', '10 {m}']] },
    { id: 'artesaos', nome: 'Guilda dos Artesãos', ic: 'oficina', estr: 'artesaos', prod: { madeira: 1, pedra: 1 }, gasto: { moeda: 1 }, pct: 50, txt: 'Ferreiros, carpinteiros e pedreiros da cidade.',
      serv: [['item', 'Ferramentas e armas', '10 {m}'], ['contrato', 'Uma encomenda especial', '30 {m}']] },
    { id: 'aventureiros', nome: 'Guilda dos Aventureiros', ic: 'mapa', estr: 'aventureiros', prod: { moeda: 2 }, gasto: { comida: 1 }, pct: 30, txt: 'O quadro de missões e quem as aceita.',
      serv: [['contrato', 'As missões do quadro', 'varia'], ['info', 'Rumores', '2 {m}']] },
    { id: 'bardos', nome: 'Guilda dos Bardos', ic: 'alaude', estr: 'camponeses', prod: { moeda: 1 }, gasto: {}, pct: 50, txt: 'Canções, notícias e fofocas.',
      serv: [['contrato', 'Uma apresentação', '5 {m}'], ['info', 'As fofocas da cidade', '2 {m}']] },
  ];
  // o catálogo de guildas de começo para esta economia (os recursos pelo papel, o estrato que existe, a moeda do mapa)
  function guildasProntas(m, eco) {
    const e = eco || (ehObj(m) && ehObj(m.eco) ? m.eco : null);
    if (!e) return [];
    const porPapel = {};
    for (const r of e.rec || []) if (r.papel && !porPapel[r.papel]) porPapel[r.papel] = r.id;
    const moeda = (e.rec || []).find(r => r.papel === 'moeda'), mNome = moeda ? moeda.nome : 'moedas', estrIds = new Set((e.estr || []).map(s => s.id));
    const tab = t => { const o = {}; for (const p of Object.keys(t || {})) if (porPapel[p]) o[porPapel[p]] = t[p]; return o; };
    return GUILDAS_INICIAIS.map(g => ({ id: g.id, nome: g.nome, ic: g.ic, txt: g.txt, estr: estrIds.has(g.estr) ? g.estr : null, prod: tab(g.prod), gasto: tab(g.gasto), pct: g.pct,
      serv: g.serv.map(([tipo, nome, preco], i) => ({ id: 'sv' + (i + 1), tipo, nome, preco: preco.replace('{m}', mNome), desc: '' })), secreta: !!g.secreta }));
  }
  // uma guilda nova numa cidade a partir de um modelo do catálogo (sem ele, em branco): o que é de cada cidade começa vazio
  function guildaDoModelo(t, id) {
    const b = ehObj(t) ? t : { nome: 'Guilda', ic: 'salao', txt: '', estr: null, prod: {}, gasto: {}, pct: 50, serv: [], secreta: false };
    return { id, nome: b.nome, ic: b.ic, txt: b.txt, estr: b.estr || null, membros: 0, lider: { nome: '', ficha: null }, infl: 0, rel: 0,
      prod: copia(b.prod || {}), gasto: copia(b.gasto || {}), pct: b.pct == null ? 50 : b.pct, est: {}, serv: copia(b.serv || []), secreta: !!b.secreta };
  }
  // as guildas do mapa: [{ o (o assentamento), r (a região dele), g (a guilda) }]
  function guildasDe(m) {
    const out = [];
    for (const a of assentamentosDe(m)) for (const g of Array.isArray(a.o.ass.guildas) ? a.o.ass.guildas : []) out.push({ o: a.o, r: a.r, g });
    return out;
  }
  // o que uma guilda produz por semana: a parte da facção dona da cidade (pct %) e a que fica no estoque dela
  function partesDaGuilda(g) {
    const k = Math.max(0, Math.min(100, Number(g && g.pct) || 0)) / 100;
    return { fac: somar({}, g && g.prod, k), guilda: somar({}, g && g.prod, 1 - k) };
  }

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

  /* ---------------- (parte 4) a semana ---------------- */
  // o número da semana de um dia (a semana vira de domingo para segunda); null sem os dias da semana no mapa
  const semanaN = (m, dia) => { const c = ehObj(m) && ehObj(m.cal) ? m.cal : null; return c && Number.isInteger(c.sem0) ? Math.floor((c.sem0 + Math.floor(Number(dia) || 0)) / 7) : null; };
  // as semanas que acabaram e ainda não foram fechadas
  function semanasPendentes(m) {
    const e = ecoDe(m), w = e ? semanaN(m, m.cal.dia) : null;
    return e && w != null && Number.isInteger(e.sem) ? Math.max(0, w - e.sem) : 0;
  }
  // o primeiro e o último dia (segunda e domingo) da semana de número n
  const diasDaSemana = (m, n) => { const d0 = 7 * n - m.cal.sem0; return { de: d0, ate: d0 + 6 }; };
  // a manutenção de um exército por semana: { recurso: n } — cada unidade, a do tipo dela (ou a das sem tipo) × tropas/10
  function manutencaoDe(m, g) {
    const e = ecoDe(m), out = {};
    if (!e || !ehObj(g) || !ehObj(g.exe)) return out;
    for (const u of Array.isArray(g.exe.unid) ? g.exe.unid : []) {
      const tab = u && u.tipo ? e.manut[u.tipo] : e.manut0;
      if (tab && Number(u.tropas) > 0) somar(out, tab, Number(u.tropas) / 10);
    }
    return out;
  }
  const exercitosDe = (m, fid) => objsDe(m).filter(o => ehObj(o) && o.k === 'g' && ehObj(o.exe) && fid && o.fac === fid);
  /* A prévia da semana que vai fechar (a primeira pendente), sem mexer no mapa — null se não há nenhuma. clas: como em
     producaoPorFaccao. → { n, de, ate, pendentes, fac: [{ id, est, prod, manut, fica, falta, exe: [{ id, manut }], paradas:
     [{ o, c, t, r }], envia, recebe }], obras: [{ o, c, t, n, sem0, sem1, pronta, parada, fac }], cons: [{ id, tipo: 'fome'
     | 'moral' | 'outro' | 'obras', fac, g, d, de, para, r }], fluxos, vencem, motivos } — cons.id é o que o mestre recusa
     (fome:facção, moral:exército, outro:exército, obras:facção).
     (lote 11, parte 3b) fluxos: o tributo e as trocas da semana (como em MundoDiplomacia.fluxosDaSemana, com pago: o que
     vai de fato, e recusado), na ordem; envia e recebe: o que cada facção manda e recebe (já na conta do que fica; a falta
     é a da economia dela, antes deles); recusadas: também os ids do tributo e das trocas que o mestre desmarcou (não vão).
     vencem: os ids dos tratados que vencem nesta semana; motivos: os motivos de opinião que vencem nela ({ de, sobre, id,
     txt, v }). (lote 11, parte 4b) intrigas: os ids das intrigas em andamento (o lembrete do mestre). */
  function semanaPrevia(m, clas, recusadas) {
    const N = NN(), e = ecoDe(m), pend = semanasPendentes(m);
    if (!e || !pend) return null;
    const n = e.sem, dias = diasDaSemana(m, n), rg = e.regras || {}, papel = new Map(e.rec.map(r => [r.id, r.papel || '']));
    const comida = r => papel.get(r) === 'comida', moeda = r => papel.get(r) === 'moeda';
    const prod = producaoPorFaccao(m, clas).por, out = { n, de: dias.de, ate: dias.ate, pendentes: pend, fac: [], obras: [], cons: [], lembretes: [], guildas: [], fluxos: [], vencem: [], motivos: [] };
    const dono = o => { const r = N.regiaoEm(m, o.x, o.y); return r ? N.facDaRegiao(m, r) : null; };
    const semMoeda = new Set(), contas = [];
    for (const f of m.faccoes || []) {
      const est = {}, p = somar({}, prod[f.id] || {}), manut = {}, exe = [], paradas = [];
      for (const w of e.rec) { const r = (f.rec || []).find(x => x.id === w.id); if (r && Number(r.n)) est[w.id] = arred2(Number(r.n)); }
      for (const g of exercitosDe(m, f.id)) { const u = manutencaoDe(m, g); if (Object.keys(u).length) { exe.push({ id: g.id, manut: u }); somar(manut, u); } }
      const saldo = () => { const b = {}; for (const w of e.rec) { const v = arred2((est[w.id] || 0) + (p[w.id] || 0) - (manut[w.id] || 0)); if (v) b[w.id] = v; } return b; };
      let b = saldo();
      // sem outro recurso (nem comida nem moeda): as construções desta facção que gastam dele param (nem produzem, nem gastam)
      const faltaOutro = Object.keys(b).filter(r => b[r] < 0 && !comida(r) && !moeda(r));
      if (rg.outro && faltaOutro.length) {
        for (const a of assentamentosDe(m)) {
          if (dono(a.o) !== f.id) continue;
          for (const c of a.o.ass.cons || []) {
            const t = tipoDe(m, c.t);
            if (!t || c.n < 1) continue;
            const nv = t.niveis[Math.min(c.n, t.niveis.length) - 1], r = faltaOutro.find(x => nv.gasto[x] > 0);
            if (!r) continue;
            paradas.push({ o: a.o.id, c: c.id, t: t.id, r });
            somar(p, nv.prod, -1); somar(p, nv.gasto);
          }
        }
        if (paradas.length) b = saldo();
      }
      const fica = {}, falta = {};
      for (const w of e.rec) { const v = b[w.id] || 0; if (v < 0) falta[w.id] = arred2(-v); if (v > 0) fica[w.id] = v; }
      const tem = [est, p, manut, falta].some(x => Object.keys(x).length) || paradas.length;
      contas.push({ id: f.id, est, prod: p, manut, fica, falta, exe, paradas, envia: {}, recebe: {}, tem });
      // as consequências (cada uma o mestre pode recusar)
      const fr = Object.keys(falta);
      if (fr.some(comida) && rg.fome > 0 && f.apoio != null) out.cons.push({ id: 'fome:' + f.id, tipo: 'fome', fac: f.id, d: rg.fome, de: f.apoio, para: Math.max(0, f.apoio - rg.fome) });
      if (fr.some(moeda)) {
        semMoeda.add(f.id);
        if (rg.obras) out.cons.push({ id: 'obras:' + f.id, tipo: 'obras', fac: f.id });
      }
      for (const g of exercitosDe(m, f.id)) {
        let moral = g.exe.moral;
        if (fr.some(moeda) && rg.moral > 0) { out.cons.push({ id: 'moral:' + g.id, tipo: 'moral', fac: f.id, g: g.id, d: rg.moral, de: moral, para: Math.max(0, moral - rg.moral) }); moral = Math.max(0, moral - rg.moral); }
        const u = (exe.find(x => x.id === g.id) || {}).manut || {}, r = fr.find(x => !comida(x) && !moeda(x) && u[x] > 0);
        if (r && rg.moralOutro > 0) out.cons.push({ id: 'outro:' + g.id, tipo: 'outro', fac: f.id, g: g.id, r, d: rg.moralOutro, de: moral, para: Math.max(0, moral - rg.moralOutro) });
      }
    }
    /* (lote 11, parte 3b) o tributo e as trocas: no fim da semana, com o que sobrou a quem manda (sobra: o que ainda dá
       para mandar); quem não tem tudo manda o que tem; o desmarcado pelo mestre não vai */
    const no = new Set(recusadas || []), conta = new Map(contas.map(c => [c.id, c])), sobra = new Map(contas.map(c => [c.id, Object.assign({}, c.fica)]));
    for (const fl of DIP().fluxosDaSemana(m, dias.de, dias.ate)) {
      const s = sobra.get(fl.de), recusado = no.has(fl.id), pago = recusado ? 0 : Math.min(fl.q, s[fl.rec] || 0);
      if (pago) { somar(s, { [fl.rec]: -pago }); somar(conta.get(fl.de).envia, { [fl.rec]: pago }); somar(conta.get(fl.para).recebe, { [fl.rec]: pago }); }
      out.fluxos.push(Object.assign({}, fl, { pago, recusado }));
    }
    for (const c of contas) {
      const troca = Object.keys(c.envia).length + Object.keys(c.recebe).length > 0;
      if (c.tem || troca) out.fac.push({ id: c.id, est: c.est, prod: c.prod, manut: c.manut, fica: somar(somar(Object.assign({}, c.fica), c.envia, -1), c.recebe), falta: c.falta, exe: c.exe, paradas: c.paradas, envia: c.envia, recebe: c.recebe });
    }
    out.vencem = DIP().tratadosQueVencem(m, dias.de, dias.ate).map(t => t.id);
    out.motivos = DIP().motivosQueVencem(m, dias.de, dias.ate);
    out.intrigas = INT().intrigasEmAndamento(m).map(x => x.id);
    // (parte 5) os lembretes dos estratos (os aventureiros trazem rumores…): por assentamento, só para o mestre ver
    for (const a of assentamentosDe(m)) {
      const itens = (e.estr || []).filter(s => s.lembra && a.o.ass.estr && a.o.ass.estr[s.id] > 0).map(s => ({ estr: s.id, n: a.o.ass.estr[s.id], txt: s.lembra }));
      if (itens.length) out.lembretes.push({ o: a.o.id, fac: dono(a.o), itens });
    }
    // (parte 5b) as guildas: a parte da facção já está na produção dela; a parte da guilda entra no estoque dela e o
    // gasto sai dele (o que falta só aparece: o estoque fica em zero)
    for (const { o, g } of guildasDe(m)) {
      const p = partesDaGuilda(g), est = somar({}, g.est), fica = {}, falta = {};
      for (const w of e.rec) { const v = arred2((est[w.id] || 0) + (p.guilda[w.id] || 0) - ((g.gasto || {})[w.id] || 0)); if (v > 0) fica[w.id] = v; if (v < 0) falta[w.id] = arred2(-v); }
      if ([est, g.prod || {}, g.gasto || {}].some(x => Object.keys(x).length)) out.guildas.push({ o: o.id, g: g.id, fac: dono(o), est, paraFac: p.fac, paraGuilda: p.guilda, gasto: somar({}, g.gasto), fica, falta });
    }
    // as obras: andam uma semana (sem moeda, a da facção que responde por ela para — quem pagou, senão a dona do lugar)
    for (const a of assentamentosDe(m)) for (const c of a.o.ass.cons || []) {
      if (!c.obra) continue;
      const fac = c.obra.fac || dono(a.o), parada = !!(rg.obras && fac && semMoeda.has(fac)), sem1 = parada ? c.obra.sem : Math.max(0, c.obra.sem - 1);
      out.obras.push({ o: a.o.id, c: c.id, t: c.t, n: c.obra.n, sem0: c.obra.sem, sem1, pronta: !parada && sem1 === 0, parada, fac });
    }
    return out;
  }
  /* Fechar a semana (no rascunho): a prévia de agora, com as consequências que o mestre não recusou (os ids em
     recusadas). Os estoques ficam no que sobrou (com o motivo no histórico de cada facção), o apoio e a moral caem, as
     obras andam (e as prontas sobem de nível) e a semana seguinte passa a ser a aberta. (lote 11, parte 3b) O tributo e
     as trocas entram no que fica (os desmarcados, em recusadas, não); dipl: as decisões da diplomacia (como em
     MundoDiplomacia.aplicarDecisoes: os tratados e os motivos que vencem nesta semana). (parte 4b) intr: os ids das intrigas
     que o mestre mostrou aos jogadores na prévia. → a prévia aplicada (com mostradas: quantas intrigas os jogadores passaram
     a ver), ou null */
  function aplicarSemana(m, clas, recusadas, mot, dipl, intr) {
    const N = NN(), prev = semanaPrevia(m, clas, recusadas);
    if (!prev) return null;
    const no = new Set(recusadas || []), dia = ehObj(m.cal) ? m.cal.dia : 0, e = m.eco;
    for (const pf of prev.fac) {
      const f = (m.faccoes || []).find(x => x.id === pf.id);
      if (!f) continue;
      recursosNaFaccao(m, f);
      for (const w of e.rec) N.facMudar(f, 'r:' + w.id, pf.fica[w.id] || 0, dia, mot || '');
    }
    // (parte 5b) o estoque de cada guilda fica no que sobrou
    for (const w of prev.guildas || []) {
      const o = achaObj(m, w.o), g = o && ehObj(o.ass) && Array.isArray(o.ass.guildas) ? o.ass.guildas.find(x => x.id === w.g) : null;
      if (g) g.est = somar({}, w.fica);
    }
    const moral = new Map();
    for (const c of prev.cons) {
      if (no.has(c.id)) continue;
      if (c.tipo === 'fome') { const f = (m.faccoes || []).find(x => x.id === c.fac); if (f && f.apoio != null) N.facMudar(f, 'apoio', Math.max(0, f.apoio - c.d), dia, mot || ''); }
      if (c.tipo === 'moral' || c.tipo === 'outro') moral.set(c.g, (moral.get(c.g) || 0) + c.d);
    }
    for (const [gid, d] of moral) { const g = achaObj(m, gid); if (g && ehObj(g.exe)) g.exe.moral = Math.max(0, Math.min(10, (Number(g.exe.moral) || 0) - d)); }
    for (const w of prev.obras) {
      if (w.parada && !no.has('obras:' + w.fac)) continue;
      const c = consDe(achaObj(m, w.o), w.c);
      if (!c || !c.obra) continue;
      c.obra.sem = Math.max(0, c.obra.sem - 1);
      if (!c.obra.sem) { c.n = c.obra.n; c.obra = null; }
    }
    DIP().aplicarDecisoes(m, dipl, prev.de, prev.ate);             // (lote 11, parte 3b) encerrar, renovar, tirar o motivo
    prev.mostradas = INT().mostrarIntrigas(m, intr);               // (parte 4b) as intrigas que os jogadores passam a ver
    e.sem = prev.n + 1;
    return prev;
  }

  /* ---------------- (parte 6) o que os jogadores veem ---------------- */
  // a facção dos jogadores (a marcada; null sem ela)
  const facJog = m => (ehObj(m) && Array.isArray(m.faccoes) ? m.faccoes.find(f => ehObj(f) && f.jog) || null : null);
  /* A caixa "os jogadores veem o que tem dentro" de um assentamento: a que o mestre marcou ou desmarcou; sem ela, as
     cidades da facção dos jogadores começam marcadas (e as outras, desmarcadas). */
  function verDentro(m, o) {
    if (!ehObj(o) || o.k !== 'm' || !ehObj(o.ass)) return false;
    if (o.ass.ver === true || o.ass.ver === false) return o.ass.ver;
    const N = NN(), fj = facJog(m), r = fj ? N.regiaoEm(m, o.x, o.y) : null;
    return !!r && N.facDaRegiao(m, r) === fj.id;
  }
  /* O que os jogadores veem dentro de um assentamento aberto para eles (vai na projeção): o nome do nível, a população (o
     total), as construções prontas (o nome, o ícone e o nível; sem as obras nem os números) e as guildas que não são
     secretas (o nome, o ícone, a descrição e os serviços com o preço; sem o líder, os membros, a influência nem a
     relação). → null sem nada para ver (ou sem a economia ligada) */
  function dentroParaJogadores(m, o) {
    if (!ecoDe(m) || !ehObj(o) || !ehObj(o.ass)) return null;
    const a = o.ass, nv = nivelDe(m, a.niv), cons = [], guildas = [];
    for (const c of Array.isArray(a.cons) ? a.cons : []) {
      const t = ehObj(c) && c.n >= 1 ? tipoDe(m, c.t) : null;
      if (t) cons.push({ nome: t.nome, ic: t.ic, n: Math.min(c.n, t.niveis.length) });
    }
    for (const g of Array.isArray(a.guildas) ? a.guildas : []) {
      if (!ehObj(g) || g.secreta) continue;
      guildas.push({ id: g.id, nome: g.nome, ic: g.ic, txt: g.txt || '', serv: (Array.isArray(g.serv) ? g.serv : []).map(s => ({ id: s.id, tipo: s.tipo, nome: s.nome, preco: s.preco || '', desc: s.desc || '' })) });
    }
    const out = { nivel: nv ? nv.nome : '', pop: Number(a.pop) || 0, cons, guildas };
    return out.nivel || out.pop || cons.length || guildas.length ? out : null;
  }
  /* A economia da facção dos jogadores como eles a veem (vai na projeção): o estoque (os recursos do mundo), a produção
     por semana por fonte (o terreno, a população, as construções — com o gasto delas —, as guildas, a sede do clã e a do
     mestre) e por província (as regiões dela juntas pela província onde ficam; a província que eles não veem, e o que fica
     fora das províncias, vai junto, sem nome: id null), a manutenção dos exércitos (todos os dela: é o estoque que paga) e
     a linha deles no Livro do reino (as províncias, as sub-regiões, os hexágonos e os exércitos que eles veem). clas:
     como em producaoPorFaccao; visivel(o): o objeto vai para os jogadores. (lote 11, parte 3b) trocas: o tributo e as
     trocas dela que valem hoje (por semana): [{ tipo ('trib' | 'troca'), sentido ('envia' | 'recebe'), com (a outra
     facção; null se ela é escondida), rec, q }]. → null sem a economia ligada ou sem a facção dos jogadores (ou com ela
     escondida) */
  function economiaDosJogadores(m, clas, visivel) {
    const N = NN(), e = ecoDe(m), f = e ? facJog(m) : null;
    if (!f || f.oculta) return null;
    const vis = typeof visivel === 'function' ? visivel : () => true;
    const nova = () => ({ terreno: {}, pop: {}, cons: {}, guilda: {}, cla: {}, mestre: {}, total: {} });
    const prod = nova(), porProv = new Map(), livro = { prov: 0, sub: 0, hex: 0, exe: 0, grade: !!N.temGrade(m) };
    const juntar = (r, k, t) => {
      if (!ehObj(t) || !Object.keys(t).length) return;
      const p = r ? provinciaDe(m, r) : null, vista = !!p && vis(p), chave = vista ? p.id : '';
      if (!porProv.has(chave)) porProv.set(chave, { id: vista ? p.id : null, nome: vista ? String(p.nome || '').trim() : '', prod: nova() });
      for (const alvo of [prod, porProv.get(chave).prod]) { somar(alvo[k], t); somar(alvo.total, t); }
    };
    for (const r of regioes(m)) {
      if (N.facDaRegiao(m, r) !== f.id) continue;
      const q = producaoPropria(m, r);
      juntar(r, 'terreno', q.terreno); juntar(r, 'pop', q.pop); juntar(r, 'cons', somar(somar({}, q.cons), q.gasto)); juntar(r, 'guilda', q.guilda); juntar(r, 'mestre', q.mestre);
      if (!vis(r)) continue;
      if (r.pai) livro.sub++; else livro.prov++;
      if (livro.grade) livro.hex += hexesProprios(m, r).length;
    }
    // a sede do clã: para a facção ligada ao clã (sem ela, para a dona do lugar), como em producaoPorFaccao
    for (const a of assentamentosDe(m)) {
      const c = a.o.ass.cla;
      if (!c) continue;
      const info = infoDoCla(clas, c.id), dono = a.r ? N.facDaRegiao(m, a.r) : null;
      const fid = info && info.fac && (m.faccoes || []).some(x => x.id === info.fac) ? info.fac : dono;
      if (fid === f.id) juntar(a.r, 'cla', producaoDoCla(m, a.o, info ? info.cons : null));
    }
    const manut = {}, est = {};
    for (const g of exercitosDe(m, f.id)) { somar(manut, manutencaoDe(m, g)); if (vis(g)) livro.exe++; }
    for (const w of e.rec) { const r = (f.rec || []).find(x => x.id === w.id); if (r && Number(r.n)) est[w.id] = arred2(Number(r.n)); }
    const prov = [...porProv.values()].sort((a, b) => (a.id ? 0 : 1) - (b.id ? 0 : 1));
    const hj = DIP().hojeDia(m), vista = id => (m.faccoes || []).some(x => x.id === id && !x.oculta);
    const trocas = DIP().fluxosDaSemana(m, hj, hj).filter(x => x.de === f.id || x.para === f.id).map(x => {
      const outra = x.de === f.id ? x.para : x.de;
      return { tipo: x.tipo, sentido: x.de === f.id ? 'envia' : 'recebe', com: vista(outra) ? outra : null, rec: x.rec, q: x.q };
    });
    return { fac: f.id, rec: e.rec.map(r => ({ id: r.id, nome: r.nome, cor: r.cor })), est, prod, manut, prov, livro, trocas };
  }
  /* O resumo da semana para o rascunho do Jornal (o mestre revisa e publica), só da facção dos jogadores: o saldo (quanto
     cada recurso mudou e com quanto fica), as obras que ficaram prontas nas cidades que eles veem por dentro e o que a
     falta trouxe (o que o mestre não recusou; o exército e a construção que eles não veem ficam sem o nome). prev: a
     prévia da semana (semanaPrevia); recusadas: os ids das consequências recusadas; ve(o): o objeto vai para os
     jogadores (a cidade, aberta por dentro). → { tit, txt } (com **negrito** do Jornal) ou null sem a facção dos
     jogadores */
  function resumoDaSemana(m, prev, recusadas, ve) {
    const N = NN(), e = ecoDe(m), f = e && ehObj(prev) ? facJog(m) : null;
    if (!f || f.oculta) return null;
    const vis = typeof ve === 'function' ? ve : () => true, no = new Set(recusadas || []);
    const fmtN = v => Number(arred2(v)).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    const sinal = v => (v > 0 ? '+' : '−') + fmtN(Math.abs(v));
    const rec = id => e.rec.find(r => r.id === id) || { id, nome: id };
    const nomeO = (o, outro) => String((o && o.nome) || '').trim() || outro;
    const pf = (prev.fac || []).find(x => x.id === f.id) || { est: {}, fica: {}, falta: {}, paradas: [] };
    const saldo = e.rec.map(r => { const para = pf.fica[r.id] || 0, d = arred2(para - (pf.est[r.id] || 0)); return d ? r.nome + ' ' + sinal(d) + ' (fica ' + fmtN(para) + ')' : null; }).filter(Boolean);
    const prontas = [];
    for (const w of prev.obras || []) {
      if (!(w.pronta || (w.parada && no.has('obras:' + w.fac) && w.sem0 <= 1))) continue;
      const o = achaObj(m, w.o), t = tipoDe(m, w.t);
      if (o && t && vis(o)) prontas.push(t.nome + ' (nível ' + w.n + '), em ' + nomeO(o, 'uma cidade'));
    }
    const falta = [], fr = Object.keys(pf.falta || {});
    if (fr.length) falta.push('Faltou ' + fr.map(id => rec(id).nome + ' (' + fmtN(pf.falta[id]) + ')').join(' e ') + '.');
    for (const c of prev.cons || []) {
      if (c.fac !== f.id || no.has(c.id)) continue;
      if (c.tipo === 'fome') falta.push('Com fome, o apoio caiu ' + c.d + ' (de ' + c.de + '% para ' + c.para + '%).');
      else if (c.tipo === 'obras') {
        // (só quando havia obra andando)
        const ms = fr.filter(id => rec(id).papel === 'moeda').map(id => rec(id).nome), k = (prev.obras || []).filter(w => w.parada && w.fac === f.id).length;
        if (k) falta.push('Sem ' + (ms.join(' e ') || 'moeda') + ', ' + (k === 1 ? '1 obra parou' : k + ' obras pararam') + ' esta semana.');
      } else {
        const g = achaObj(m, c.g);
        falta.push('Sem ' + (c.tipo === 'moral' ? 'moeda' : rec(c.r).nome) + ', a moral ' + (g && vis(g) ? 'de ' + nomeO(g, 'um exército') : 'de um exército') + ' caiu ' + c.d + ' (de ' + c.de + ' para ' + c.para + ').');
      }
    }
    for (const x of pf.paradas || []) {
      const o = achaObj(m, x.o), t = tipoDe(m, x.t);
      falta.push((o && t && vis(o) ? t.nome + ' (' + nomeO(o, 'uma cidade') + ')' : 'Uma construção') + ' não produziu nem gastou: faltou ' + rec(x.r).nome + '.');
    }
    // (lote 11, parte 3b) o tributo e as trocas que valeram (a facção escondida fica sem o nome)
    const trocas = [];
    for (const x of prev.fluxos || []) {
      if (!x.pago || (x.de !== f.id && x.para !== f.id)) continue;
      const o = (m.faccoes || []).find(y => y.id === (x.de === f.id ? x.para : x.de)), nome = o && !o.oculta ? String(o.nome || '').trim() || 'outra facção' : 'outra facção';
      const qt = fmtN(x.pago) + ' ' + rec(x.rec).nome, sai = x.de === f.id;
      trocas.push(x.tipo === 'trib' ? (sai ? 'pagou ' + qt + ' de tributo a ' : 'recebeu ' + qt + ' de tributo de ') + nome : (sai ? 'mandou ' + qt + ' para ' : 'recebeu ' + qt + ' de ') + nome);
    }
    const partes = ['**O saldo:** ' + (saldo.length ? saldo.join(' · ') : 'nada mudou nos estoques') + '.'];
    if (trocas.length) partes.push('**Tributo e trocas:** ' + trocas.join(' · ') + '.');
    if (prontas.length) partes.push('**Obras prontas:** ' + prontas.join(' · ') + '.');
    if (falta.length) partes.push('**O que a falta trouxe:** ' + falta.join(' '));
    return { tit: (String(f.nome || '').trim() || 'A facção dos jogadores') + ': a semana até ' + N.textoData(m.cal, prev.ate), txt: partes.join('\n\n') };
  }

  const MundoReino = { ehProvincia, provinciaDe, subregioesDe, hexesDaRegiao, hexesProprios, terrenoDoHex, terrenosDaRegiao, livroDoReino,
    RECURSOS_INICIAIS, TERRENO_INICIAL, NIVEIS_INICIAIS, ecoDe, somar, ecoInicial, recursosNaFaccao, ligarEconomia,
    producaoDaPopulacao, distribuir, nivelDaDivisao, juntarAoMundo, populacaoDaFaccao, GUILDAS_INICIAIS, guildasProntas, guildaDoModelo, guildasDe, partesDaGuilda,
    assentamentosDe, nivelDe, producaoPropria, producaoDaRegiao, producaoPorFaccao, assentamentosDaRegiao,
    CONSTRUCOES_INICIAIS, catalogoPronto, tipoDe, espacosDe, exigenciasDe, proximoNivel, faltaPara, moverEstoque, comecarObra, subirNivel, terminarObra,
    cancelarObra, demolir, efeitoDasConstrucoes, defDoAssentamento, producaoDoCla,
    semanaN, semanasPendentes, diasDaSemana, manutencaoDe, semanaPrevia, aplicarSemana,
    verDentro, dentroParaJogadores, economiaDosJogadores, resumoDaSemana };
  if (typeof module === 'object' && module && module.exports) module.exports = MundoReino;
  if (typeof window !== 'undefined') window.MundoReino = MundoReino;
})();
