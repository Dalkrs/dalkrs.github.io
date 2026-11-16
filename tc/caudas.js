/* =======================================================================
   TC.caudas — as caudas da Kitsune que guardam o poder de um yokai (lote 173). Lógica pura (Node e navegador).

   Quando a Kitsune come um yokai, ela guarda o poder dele numa das caudas: um poder por cauda, em qualquer cauda que
   ela tenha. O poder fica até ser usado (usar não queima a cauda). Alguns poderes deixam uma ferida permanente na
   cauda quando são usados; a ferida fica escrita na cauda até o mestre tirar.
   Uma cauda: { p: { y (o yokai), n (o nome do poder), e (o que ele faz), f (a ferida que deixa ao usar; '' = nenhuma) }
   ou null, fer: [textos das feridas] }. São sempre 9 caudas (a Kitsune tem até 9).

   Onde fica: estado.pb.kitsune.s.caudas da ficha — o mesmo lugar que o painel de barras das Cenas usa, para a ficha e
   as Cenas mostrarem a mesma coisa.
     navegador   o script tc/caudas.js na página → window.TC.caudas
     Node        const C = require('./tc/caudas.js')
   ======================================================================= */
(function (root) {
  'use strict';
  const N = 9, LIM = Object.freeze({ yokai: 60, nome: 60, efeito: 400, ferida: 200, feridas: 6 });
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const txt = (x, n) => String(x == null ? '' : x).replace(/\r/g, '').trim().slice(0, n);
  function poderDe(x) {
    if (!ehObj(x)) return null;
    const p = { y: txt(x.y, LIM.yokai), n: txt(x.n, LIM.nome), e: txt(x.e, LIM.efeito), f: txt(x.f, LIM.ferida) };
    return p.n || p.e ? p : null;
  }
  function caudaDe(x) {
    const c = ehObj(x) ? x : {};
    return { p: poderDe(c.p), fer: (Array.isArray(c.fer) ? c.fer : []).map(t => txt(t, LIM.ferida)).filter(Boolean).slice(0, LIM.feridas) };
  }
  // as 9 caudas, arrumadas
  const norm = lista => Array.from({ length: N }, (_, i) => caudaDe(Array.isArray(lista) ? lista[i] : null));
  // as caudas de uma ficha (estado.pb.kitsune.s.caudas)
  const daFicha = estado => norm(ehObj(estado) && ehObj(estado.pb) && ehObj(estado.pb.kitsune) && ehObj(estado.pb.kitsune.s) ? estado.pb.kitsune.s.caudas : null);
  // um estado NOVO da ficha com estas caudas (o resto do painel da Kitsune fica como estava)
  function naFicha(estado, caudas) {
    const e = Object.assign({}, ehObj(estado) ? estado : {}), pb = Object.assign({}, ehObj(e.pb) ? e.pb : {});
    const k = ehObj(pb.kitsune) ? pb.kitsune : {};
    pb.kitsune = Object.assign({ c: {}, u: {}, g: 0 }, k, { s: Object.assign({}, ehObj(k.s) ? k.s : {}, { caudas: norm(caudas) }) });
    e.pb = pb;
    return e;
  }
  const valido = i => Number.isInteger(i) && i >= 0 && i < N;
  /* Uma mudança. op:
       { t: 'guardar', i, p: { y, n, e, f } }   guarda o poder na cauda i (troca o que estava)
       { t: 'usar', i }                        usa: o poder sai; se ele deixava ferida, a ferida fica na cauda
       { t: 'tirar', i }                       descarta o poder sem usar
       { t: 'curar', i, k }                    tira a ferida k da cauda i
     → { caudas, mudou, usado (o poder usado), ferida (a ferida nova) } — não altera o que recebeu. */
  function mudar(caudas, op) {
    const l = norm(caudas), nada = { caudas: l, mudou: false, usado: null, ferida: '' };
    if (!ehObj(op) || !valido(op.i)) return nada;
    const c = l[op.i];
    if (op.t === 'guardar') { const p = poderDe(op.p); if (!p) return nada; c.p = p; return { caudas: l, mudou: true, usado: null, ferida: '' }; }
    if (op.t === 'usar') {
      if (!c.p) return nada;
      const p = c.p; c.p = null;
      if (p.f && c.fer.length < LIM.feridas) c.fer.push(p.f);
      return { caudas: l, mudou: true, usado: p, ferida: p.f || '' };
    }
    if (op.t === 'tirar') { if (!c.p) return nada; c.p = null; return { caudas: l, mudou: true, usado: null, ferida: '' }; }
    if (op.t === 'curar') { const k = Math.round(Number(op.k)); if (!(k >= 0 && k < c.fer.length)) return nada; c.fer.splice(k, 1); return { caudas: l, mudou: true, usado: null, ferida: '' }; }
    return nada;
  }
  const comPoder = caudas => norm(caudas).filter(c => c.p).length;
  const comFerida = caudas => norm(caudas).filter(c => c.fer.length).length;
  // o texto do uso, para o registro: "Dain usa Pele de Pedra (Kappa), da cauda 3: …"
  const textoUso = (nome, i, p) => `${nome || 'A Kitsune'} usa ${p.n || 'o poder'}${p.y ? ' (' + p.y + ')' : ''}, da cauda ${i + 1}${p.e ? ': ' + p.e : '.'}`;

  const API = { N, LIM, norm, daFicha, naFicha, mudar, comPoder, comFerida, textoUso };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { root.TC = root.TC || {}; root.TC.caudas = API; }
})(typeof window !== 'undefined' ? window : globalThis);
