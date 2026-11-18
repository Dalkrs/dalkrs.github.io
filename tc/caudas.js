/* =======================================================================
   TC.caudas — as caudas da Kitsune que guardam o poder de um yokai (lote 173). Lógica pura (Node e navegador).

   Quando a Kitsune come um yokai, ela guarda o poder dele numa das caudas: um poder por cauda, em qualquer cauda que
   ela tenha. O poder fica até ser usado (usar não queima a cauda). Alguns poderes APODRECEM a cauda enquanto estão
   guardados (lote 174): aquela cauda não pode ser queimada até o poder ser usado — na barra Caudas, ela fica podre,
   como a ferida permanente (estado.podre). Usou o poder, a cauda volta a servir.
   Uma cauda: { p: { y (o yokai), n (o nome do poder), e (o que ele faz), a (apodrece a cauda) } ou null }. São
   sempre 9 caudas (a Kitsune tem até 9).

   A biblioteca (lote 174): todo poder guardado fica também em estado.pb.kitsune.s.bib (os poderes que ela já
   guardou, sem repetir yokai + nome). A janela de guardar junta a biblioteca de todas as fichas que a pessoa vê.
   (lote 176) E a biblioteca do mestre (fichas:segredos, kitBib): recolhe os poderes de todas as fichas e fica mesmo se
   a ficha for apagada.

   Onde fica: estado.pb.kitsune.s.caudas da ficha — o mesmo lugar que o painel de barras das Cenas usa, para a ficha e
   as Cenas mostrarem a mesma coisa — e o podre da barra Caudas em estado.podre.ba_a_kitsune (quantas caudas podres).
     navegador   o script tc/caudas.js na página → window.TC.caudas
     Node        const C = require('./tc/caudas.js')
   ======================================================================= */
(function (root) {
  'use strict';
  /* (lote 183) Duas Kitsunes usam as caudas assim: a Kitsune lunar (yokais) e a Kitsune Nirus (RP, seres vivos e
     monstros: o Pedaço da Vítima). Cada uma tem o seu lugar no estado (pb.<slot>) e a sua barra (o podre). */
  const VARIANTES = {
    kitsune: { slot: 'kitsune', ref: 'ba_a_kitsune', arv: 'a_kitsune', quem: 'A Kitsune', de: 'yokai' },
    nirus: { slot: 'nirus', ref: 'ba_a_kitsune_nirus', arv: 'a_kitsune_nirus', quem: 'A Kitsune Nirus', de: 'presa' }
  };
  function fazer(V) {
  const N = 9, REF = V.ref, SLOT = V.slot, LIM = Object.freeze({ yokai: 60, nome: 60, efeito: 400 });
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const txt = (x, n) => String(x == null ? '' : x).replace(/\r/g, '').trim().slice(0, n);
  function poderDe(x) {
    if (!ehObj(x)) return null;
    const p = { y: txt(x.y, LIM.yokai), n: txt(x.n, LIM.nome), e: txt(x.e, LIM.efeito), a: !!(x.a || txt(x.f, 1)) };   // (f: o texto de ferida do lote 173 também apodrece)
    return p.n || p.e ? p : null;
  }
  function caudaDe(x) {
    const c = ehObj(x) ? x : {};
    return { p: poderDe(c.p) };
  }
  // as 9 caudas, arrumadas
  const norm = lista => Array.from({ length: N }, (_, i) => caudaDe(Array.isArray(lista) ? lista[i] : null));
  const sDa = estado => (ehObj(estado) && ehObj(estado.pb) && ehObj(estado.pb[SLOT]) && ehObj(estado.pb[SLOT].s) ? estado.pb[SLOT].s : {});
  // as caudas de uma ficha (estado.pb.kitsune.s.caudas)
  const daFicha = estado => norm(sDa(estado).caudas);
  // a biblioteca de poderes: sem repetir (yokai + nome); o mais novo fica
  const LIM_BIB = 80;
  const chave = p => (String(p.y || '') + '|' + String(p.n || '')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  function normBib(lista) {
    const out = [], vistos = new Set();
    for (const x of (Array.isArray(lista) ? lista : []).slice().reverse()) { const p = poderDe(x); if (!p || vistos.has(chave(p))) continue; vistos.add(chave(p)); out.unshift(p); }
    return out.slice(-LIM_BIB);
  }
  const bibDaFicha = estado => normBib(sDa(estado).bib);
  // juntar bibliotecas (de várias fichas), em ordem de nome
  const juntar = listas => normBib([].concat(...listas.map(l => normBib(l)))).sort((a, b) => (a.n || a.y).localeCompare(b.n || b.y, 'pt'));
  // um estado NOVO da ficha com estas caudas (o resto do painel da Kitsune fica como estava)
  function naFicha(estado, caudas) {
    const e = Object.assign({}, ehObj(estado) ? estado : {}), pb = Object.assign({}, ehObj(e.pb) ? e.pb : {});
    const k = ehObj(pb[SLOT]) ? pb[SLOT] : {};
    const cs = norm(caudas), bib = normBib([].concat(ehObj(k.s) && Array.isArray(k.s.bib) ? k.s.bib : [], cs.filter(c => c.p).map(c => c.p)));
    pb[SLOT] = Object.assign({ c: {}, u: {}, g: 0 }, k, { s: Object.assign({}, ehObj(k.s) ? k.s : {}, { caudas: cs, bib }) });
    e.pb = pb;
    return comPodre(e);
  }
  // as caudas podres viram o podre da barra Caudas (estado.podre.ba_a_kitsune), num estado NOVO
  function comPodre(estado) {
    const e = Object.assign({}, ehObj(estado) ? estado : {}), n = podres(daFicha(e)), pd = Object.assign({}, ehObj(e.podre) ? e.podre : {});
    if (n > 0) pd[REF] = n; else delete pd[REF];
    if (Object.keys(pd).length) e.podre = pd; else delete e.podre;
    return e;
  }
  const valido = i => Number.isInteger(i) && i >= 0 && i < N;
  /* Uma mudança. op:
       { t: 'guardar', i, p: { y, n, e, f } }   guarda o poder na cauda i (troca o que estava)
       { t: 'usar', i }                        usa: o poder sai (se a cauda estava podre, volta a servir)
       { t: 'tirar', i }                       descarta o poder sem usar
     → { caudas, mudou, usado (o poder usado) } — não altera o que recebeu. */
  function mudar(caudas, op) {
    const l = norm(caudas), nada = { caudas: l, mudou: false, usado: null };
    if (!ehObj(op) || !valido(op.i)) return nada;
    const c = l[op.i];
    if (op.t === 'guardar') { const p = poderDe(op.p); if (!p) return nada; c.p = p; return { caudas: l, mudou: true, usado: null }; }
    if (op.t === 'usar') { if (!c.p) return nada; const p = c.p; c.p = null; return { caudas: l, mudou: true, usado: p }; }
    if (op.t === 'tirar') { if (!c.p) return nada; c.p = null; return { caudas: l, mudou: true, usado: null }; }
    return nada;
  }
  const comPoder = caudas => norm(caudas).filter(c => c.p).length;
  const podres = caudas => norm(caudas).filter(c => c.p && c.p.a).length;
  // o texto do uso, para o registro: "Dain usa Pele de Pedra (Kappa), da cauda 3: …"
  const textoUso = (nome, i, p) => `${nome || V.quem} usa ${p.n || 'o poder'}${p.y ? ' (' + p.y + ')' : ''}, da cauda ${i + 1}${p.e ? ': ' + p.e : '.'}${p.a ? ' A cauda volta a servir.' : ''}`;

  // tirar um poder da biblioteca de uma ficha (num estado NOVO)
  function semDaBib(estado, p) {
    const e = Object.assign({}, ehObj(estado) ? estado : {}), pb = Object.assign({}, ehObj(e.pb) ? e.pb : {}), k = ehObj(pb[SLOT]) ? pb[SLOT] : {}, kp = poderDe(p);
    if (!kp) return e;
    pb[SLOT] = Object.assign({}, k, { s: Object.assign({}, ehObj(k.s) ? k.s : {}, { bib: bibDaFicha(e).filter(x => chave(x) !== chave(kp)) }) });
    e.pb = pb;
    return e;
  }

  return { N, REF, SLOT, ARV: V.arv, VAR: V, LIM, norm, daFicha, naFicha, comPodre, mudar, comPoder, podres, textoUso, bibDaFicha, normBib, juntar, semDaBib, chave };
  }
  // a Kitsune lunar continua sendo TC.caudas; a Nirus é TC.caudas.nirus
  const API = fazer(VARIANTES.kitsune);
  API.nirus = fazer(VARIANTES.nirus);
  API.variante = slot => (slot === 'nirus' ? API.nirus : API);
  // as caudas podres das duas viram o podre das suas barras
  const comPodreSo = API.comPodre;
  API.comPodreTodas = estado => API.nirus.comPodre(comPodreSo(estado));
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { root.TC = root.TC || {}; root.TC.caudas = API; }
})(typeof window !== 'undefined' ? window : globalThis);
