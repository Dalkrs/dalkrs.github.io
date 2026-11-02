/* Tiny Cats · os modelos de unidade e os tipos de exército (lote 63): a lógica pura (sem página). Roda igual no
   navegador (TC.modelos) e no Node (testes).
   · Os modelos de unidade são da mesa (valem para os exércitos do Mapa-múndi e para as tropas do clã): o mestre cria e
     muda no Mapa-múndi (modo Guerra, aba Regras). Onde moram: o documento "mundo:modelos" ({ v, lista }); sem mesa,
     neste navegador. Sem lista guardada, os de começo: Aegis, Infantaria, Cavalaria, Arqueiros, Shajis, Sacerdotes e Magos.
   · Os tipos de exército (Batedores, Patrulha, Guarnição, Hoste, Horda, Cerco, Frota, Caravana armada, Mercenários e
     Caravana comercial): o desenho do token, a faixa de soldados (na escala do mundo: a maior cidade tem uns 80
     habitantes) e a composição — que fração de cada modelo. "Novo exército aqui" monta as unidades com eles. */
(() => {
  'use strict';
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const inteiro = (v, a, b, d) => { const n = Math.round(Number(v)); return v !== null && v !== '' && v !== undefined && Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d; };
  const linha = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
  const idOk = v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v);
  const DOC = 'mundo:modelos', LOCAL = 'tinycats:mundo:modelos';
  const MAX = { lista: 30, nome: 40, desc: 140, atr: 20, hpT: 50 };

  /* ---------------- os modelos de unidade ---------------- */
  const PADRAO = [
    { id: 'md_aegis', nome: 'Aegis', desc: 'Os escudos da linha de frente: seguram o golpe para os outros.', atq: 1, def: 5, hpT: 2, cura: 0, magos: false },
    { id: 'md_infantaria', nome: 'Infantaria', desc: 'A base de qualquer força: lança, espada e escudo.', atq: 3, def: 3, hpT: 1, cura: 0, magos: false },
    { id: 'md_cavalaria', nome: 'Cavalaria', desc: 'Rápida; bate forte na carga.', atq: 4, def: 2, hpT: 2, cura: 0, magos: false },
    { id: 'md_arqueiros', nome: 'Arqueiros', desc: 'Atiram de longe; fracos no corpo a corpo.', atq: 4, def: 1, hpT: 1, cura: 0, magos: false },
    { id: 'md_shajis', nome: 'Shajis', desc: 'Furtivos e rápidos: emboscada e golpe rápido; pouca defesa.', atq: 4, def: 1, hpT: 1, cura: 0, magos: false },
    { id: 'md_sacerdotes', nome: 'Sacerdotes', desc: 'Curam os feridos depois da luta.', atq: 1, def: 2, hpT: 1, cura: 20, magos: false },
    { id: 'md_magos', nome: 'Magos', desc: 'Magia na batalha: cada um conta como um mago.', atq: 2, def: 1, hpT: 1, cura: 0, magos: true },
  ];
  const copia = x => JSON.parse(JSON.stringify(x));
  function normModelo(m, i, vistos) {
    if (!ehObj(m)) return null;
    let id = idOk(m.id) ? m.id : 'md_' + i;
    while (vistos.has(id)) id += '_';
    vistos.add(id);
    return { id, nome: linha(m.nome, MAX.nome) || 'Modelo ' + (i + 1), desc: linha(m.desc, MAX.desc),
      atq: inteiro(m.atq, -MAX.atr, MAX.atr, 0), def: inteiro(m.def, -MAX.atr, MAX.atr, 0), hpT: inteiro(m.hpT, 1, MAX.hpT, 1),
      cura: inteiro(m.cura, 0, 100, 0), magos: !!m.magos };
  }
  // a lista que vale: a guardada (normalizada) ou, sem nenhuma, a de começo
  function lista(dados) {
    const l = ehObj(dados) && Array.isArray(dados.lista) ? dados.lista : null;
    if (!l) return copia(PADRAO);
    const vistos = new Set(), out = [];
    for (let i = 0; i < l.length && out.length < MAX.lista; i++) { const m = normModelo(l[i], i, vistos); if (m) out.push(m); }
    return out.length ? out : copia(PADRAO);
  }
  const docDe = l => ({ v: 1, lista: lista({ lista: l }) });
  function novoModelo(l) {
    const usados = new Set((l || []).map(m => m.id));
    let n = (l || []).length + 1, id = 'md_n' + n;
    while (usados.has(id)) id = 'md_n' + (++n);
    return { id, nome: 'Modelo novo', desc: '', atq: 2, def: 2, hpT: 1, cura: 0, magos: false };
  }

  /* ---------------- os tipos de exército ---------------- */
  const CARRO = '<path d="M2 15V9h11v6M13 11h4l3 3v1M2 15h18"/><circle cx="6" cy="17.5" r="2"/><circle cx="16" cy="17.5" r="2"/>';
  const ARMAS = {
    batedores: { nome: 'Batedores', min: 2, max: 6, txt: 'rápidos, veem antes do inimigo', comp: [['md_shajis', 0.5], ['md_cavalaria', 0.5]],
      svg: '<path d="M4 20 20 4"/><path d="M20 4l-6 1.5M20 4l-1.5 6"/><path d="M4 20l2.5-5.5M4 20l5.5-2.5"/>' },
    patrulha: { nome: 'Patrulha', min: 4, max: 12, txt: 'vigia estradas e fronteiras', comp: [['md_infantaria', 0.6], ['md_arqueiros', 0.4]],
      svg: '<path d="M7 21V3"/><path d="M7 4h11l-3 4 3 4H7"/>' },
    guarnicao: { nome: 'Guarnição', min: 6, max: 25, txt: 'defende um lugar; não marcha', comp: [['md_aegis', 0.4], ['md_infantaria', 0.3], ['md_arqueiros', 0.3]],
      svg: '<path d="M5 21V9h14v12"/><path d="M5 9V5h2.5v2h2V5h5v2h2V5H19v4"/><path d="M10 21v-5h4v5"/>' },
    hoste: { nome: 'Hoste', min: 15, max: 60, txt: 'o exército de um reino', comp: [['md_aegis', 0.2], ['md_infantaria', 0.35], ['md_arqueiros', 0.2], ['md_cavalaria', 0.15], ['md_sacerdotes', 0.05], ['md_magos', 0.05]],
      svg: '<path d="M6 21V3M18 21V3"/><path d="M6 4h12v8H6"/><path d="M9.5 7.5h5"/>' },
    horda: { nome: 'Horda', min: 20, max: 90, txt: 'muitos, pouco treino', comp: [['md_infantaria', 0.8], ['md_cavalaria', 0.2]],
      svg: '<path d="M7 21V3"/><path d="M7 4l12 1-3 2.5 3 2.5-3 2 3 2.5L7 15"/>' },
    cerco: { nome: 'Cerco', min: 8, max: 24, txt: 'máquinas contra muralhas', comp: [['md_infantaria', 0.6], ['md_arqueiros', 0.25], ['md_aegis', 0.15]],
      svg: '<path d="M4 19h16"/><circle cx="7.5" cy="19" r="1.8"/><circle cx="16.5" cy="19" r="1.8"/><path d="M6 17l11-11"/><path d="M15.5 4.5 19 8"/>' },
    frota: { nome: 'Frota', min: 8, max: 30, txt: 'de 1 a 3 barcos; vai pelo mar e pelos rios', comp: [['md_infantaria', 0.5], ['md_arqueiros', 0.5]],
      svg: '<path d="M3.5 15h17l-3 5h-11z"/><path d="M12 3v12M12 4l6 8h-6M12 6l-4.5 6H12"/>' },
    caravanaArmada: { nome: 'Caravana armada', min: 6, max: 20, txt: 'leva carga com escolta pronta para lutar', comp: [['md_aegis', 0.3], ['md_infantaria', 0.4], ['md_arqueiros', 0.3]],
      svg: CARRO + '<path d="M7.5 2.5 10.5 3.6v2.6c0 1.5-1.2 2.4-3 2.9-1.8-.5-3-1.4-3-2.9V3.6z"/>' },
    mercenarios: { nome: 'Mercenários', min: 4, max: 20, txt: 'lutam por quem paga', comp: [['md_infantaria', 0.4], ['md_shajis', 0.3], ['md_arqueiros', 0.3]],
      svg: '<circle cx="8" cy="15.5" r="5"/><path d="M9.6 13.2H7.4a1.1 1.1 0 0 0 0 2.2h1.2a1.1 1.1 0 0 1 0 2.2H6.4"/><path d="M13.5 10.5 21 3M17.6 3H21v3.4M14.6 6.6l2.8 2.8"/>' },
    caravanaComercial: { nome: 'Caravana comercial', min: 3, max: 12, txt: 'mercadores com poucos guardas', comp: [['md_infantaria', 0.6], ['md_arqueiros', 0.4]],
      svg: CARRO + '<path d="M6 8.5c-1.6-1-1.6-3.2 0-4.2h3.4c1.6 1 1.6 3.2 0 4.2zM6.6 4.3 7.7 2.5 8.8 4.3"/>' },
  };
  const ORDEM_ARMAS = ['batedores', 'patrulha', 'guarnicao', 'hoste', 'horda', 'cerco', 'frota', 'caravanaArmada', 'mercenarios', 'caravanaComercial'];
  const TAMANHOS = { p: { nome: 'Pequeno', f: 0.15 }, m: { nome: 'Médio', f: 0.5 }, g: { nome: 'Grande', f: 1 } };
  const ehArma = k => typeof k === 'string' && Object.prototype.hasOwnProperty.call(ARMAS, k);
  function totalDe(arma, tam) {
    const A = ARMAS[arma], T = TAMANHOS[tam] || TAMANHOS.m;
    return A ? Math.max(1, Math.round(A.min + (A.max - A.min) * T.f)) : 0;
  }
  const barcosDe = n => Math.max(1, Math.min(3, Math.ceil(n / 11)));
  // o modelo da composição na lista da mesa (pelo id; sumiu: um parecido pelo nome; nenhum: o primeiro da lista)
  const NOME_PADRAO = Object.fromEntries(PADRAO.map(m => [m.id, m.nome.toLowerCase()]));
  function modeloDe(id, modelos) {
    return modelos.find(m => m.id === id) || modelos.find(m => m.nome.toLowerCase() === NOME_PADRAO[id]) || null;
  }
  /* A divisão de n soldados pela composição (a maior sobra leva o que falta: a soma dá n). Os modelos que não existem
     mais na lista da mesa saem, e a parte deles vai para os outros. Com poucos soldados, a fração pequena pode ficar com
     zero e sai. → [{ m, n }] na ordem da composição */
  function dividir(arma, n, modelos) {
    const A = ARMAS[arma]; if (!A || !(n > 0)) return [];
    let partes = A.comp.map(([id, f]) => ({ m: modeloDe(id, modelos), f })).filter(p => p.m);
    if (!partes.length && modelos.length) partes = [{ m: modelos[0], f: 1 }];
    const soma = partes.reduce((s, p) => s + p.f, 0) || 1;
    partes.forEach(p => { p.x = (n * p.f) / soma; p.n = Math.floor(p.x); });
    let falta = n - partes.reduce((s, p) => s + p.n, 0);
    for (const p of partes.slice().sort((a, b) => (b.x - b.n) - (a.x - a.n))) { if (falta <= 0) break; p.n++; falta--; }
    // (junta duas partes do mesmo modelo, se a lista da mesa trocou um pelo outro)
    const out = [];
    for (const p of partes) { if (p.n <= 0) continue; const ja = out.find(o => o.m.id === p.m.id); if (ja) ja.n += p.n; else out.push({ m: p.m, n: p.n }); }
    return out;
  }
  const nrm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  /* As unidades de um exército novo, no formato do Mapa-múndi (o grupo, exe.unid): o modelo dá o ATQ, a DEF, o HP de
     cada soldado, a cura e os magos; o tipo de tropa do mapa (as vantagens da aba Regras) vem pelo nome, quando há um
     com o nome do modelo. O Cerco leva as máquinas (o aríete; do médio para cima, também a catapulta). */
  function unidadesDoMapa(arma, tam, modelos, tiposGuerra) {
    const n = totalDe(arma, tam), partes = dividir(arma, n, modelos || PADRAO);
    const tipos = Array.isArray(tiposGuerra) ? tiposGuerra : [];
    return partes.map((p, i) => {
      const t = tipos.find(x => x && nrm(x.nome) === nrm(p.m.nome));
      const u = { nome: p.m.nome, tropas: p.n, hpT: p.m.hpT, atq: p.m.atq, def: p.m.def, magos: p.m.magos ? p.n : 0, cura: p.m.cura, maq: {}, mod: p.m.id };
      if (t && t.id) u.tipo = t.id;
      if (arma === 'cerco' && i === 0) u.maq = tam === 'p' ? { ariete: 1 } : { ariete: 1, catapulta: 1 };
      return u;
    });
  }
  // o nome de começo do exército novo ("Hoste dos Caliels", "Frota de 2 barcos de Napha")
  function nomeDoExercito(arma, tam, facNome) {
    const A = ARMAS[arma]; if (!A) return 'Exército';
    const base = arma === 'frota' ? 'Frota de ' + barcosDe(totalDe(arma, tam)) + (barcosDe(totalDe(arma, tam)) === 1 ? ' barco' : ' barcos') : A.nome;
    return facNome ? base + ' — ' + linha(facNome, 40) : base;
  }
  // o que a janela mostra antes de criar: "36 soldados: 13 infantaria, 7 arqueiros…"
  function resumo(arma, tam, modelos) {
    const n = totalDe(arma, tam), partes = dividir(arma, n, modelos || PADRAO);
    return { n, partes: partes.map(p => ({ nome: p.m.nome, n: p.n })), barcos: arma === 'frota' ? barcosDe(n) : 0 };
  }
  /* A primeira unidade de uma tropa do clã, no formato das tropas das Fichas (tc/tropas.js): o modelo, os soldados e a
     veterania. */
  function unidadeDaTropa(modelo, n, vet) {
    const m = ehObj(modelo) ? modelo : PADRAO[1], q = inteiro(n, 1, 1e6, 10);
    return { nome: linha(m.nome, 60) || 'Unidade', tropas: q, cheio: q, hpT: m.hpT, atq: m.atq, def: m.def, vet: inteiro(vet, 1, 5, 1), magos: m.magos ? q : 0, cura: m.cura };
  }

  const api = { DOC, LOCAL, MAX, PADRAO, lista, docDe, novoModelo, normModelo, ARMAS, ORDEM_ARMAS, TAMANHOS, ehArma, totalDe, barcosDe, dividir, unidadesDoMapa, nomeDoExercito, resumo, unidadeDaTropa };
  if (typeof window !== 'undefined') { window.TC = window.TC || {}; window.TC.modelos = api; }
  if (typeof module === 'object' && module && module.exports) module.exports = api;
})();
