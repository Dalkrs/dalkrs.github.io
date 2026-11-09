/* =======================================================================
   TC.reputacao — a reputação de cada personagem com cada facção do Mapa-múndi (lote 126). Lógica pura (Node e
   navegador).

   De −100 a +100, com seis níveis: Odiado, Hostil, Neutro, Amigo, Honrado e Venerado. Só quem mestra muda (à mão, na
   ficha, ou pela recompensa de uma missão cumprida). Quem mestra escolhe, facção por facção, se o jogador vê.

   Onde fica:
     estado.rep    { facção: { v, n } }   as que o jogador vê (o valor e o nome da facção)
     estado.repOc  [facção]               as que o mestre escondeu do jogador (sem valor: o valor fica com o mestre)
     segredos      { facção: { v, n } }   o valor das escondidas — em fichas:segredos, rep[personagem], que só quem
                                          mestra recebe (seg = null: fora de uma mesa; aí tudo fica no estado)
   Uma facção escondida no mapa (oculta) começa escondida do jogador, até o mestre mostrar.
   Sem valor guardado, a reputação é 0 (Neutro).

     navegador   <script src="../tc/reputacao.js"></script> → window.TC.reputacao
     Node        const R = require('./tc/reputacao.js')
   ======================================================================= */
(function (root) {
  'use strict';
  const NIVEIS = Object.freeze([
    { min: 90, n: 'Venerado', k: 'venerado' }, { min: 60, n: 'Honrado', k: 'honrado' }, { min: 20, n: 'Amigo', k: 'amigo' },
    { min: -19, n: 'Neutro', k: 'neutro' }, { min: -59, n: 'Hostil', k: 'hostil' }, { min: -100, n: 'Odiado', k: 'odiado' }]);
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const idOk = k => typeof k === 'string' && /^[A-Za-z0-9_:.-]{1,60}$/.test(k);
  const lim = v => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(-100, Math.min(100, n)) : 0; };
  const nome = x => String(x == null ? '' : x).trim().slice(0, 60);
  const copia = x => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
  const nivel = v => NIVEIS.find(x => lim(v) >= x.min);
  /* O nível e quanto falta dentro dele (0 a 100%), para a barrinha. */
  function faixa(v) {
    v = lim(v);
    const i = NIVEIS.findIndex(x => v >= x.min), nv = NIVEIS[i], teto = i === 0 ? 100 : NIVEIS[i - 1].min - 1;
    return { nivel: nv, de: nv.min, ate: teto, pct: teto > nv.min ? Math.round(((v - nv.min) / (teto - nv.min)) * 100) : 100 };
  }
  function repDe(estado) {
    const out = {};
    const r = ehObj(estado) && ehObj(estado.rep) ? estado.rep : {};
    for (const f of Object.keys(r)) if (idOk(f) && ehObj(r[f])) out[f] = { v: lim(r[f].v), n: nome(r[f].n) };
    return out;
  }
  const ocDe = estado => (ehObj(estado) && Array.isArray(estado.repOc) ? estado.repOc.filter(idOk) : []);
  const segLimpo = seg => { const out = {}; if (ehObj(seg)) for (const f of Object.keys(seg)) if (idOk(f) && ehObj(seg[f])) out[f] = { v: lim(seg[f].v), n: nome(seg[f].n) }; return out; };

  /* As linhas que quem olha vê, na ordem das facções e depois as que só existem na ficha.
       facs: [{ id, nome, cor, oculta }] — as facções dos mapas (para quem joga: as que ele recebe)
       seg: os valores escondidos (quem mestra) ou null (quem joga, ou fora da mesa)
       mestre: quem mestra (ou a ficha fora da mesa) vê todas; quem joga, só as que não estão escondidas dele
     → [{ f, n, cor, v, oc, mapa }] — oc: escondida do jogador */
  function linhas(estado, seg, facs, mestre) {
    const rep = repDe(estado), oc = new Set(ocDe(estado)), sg = segLimpo(seg), out = [], vistas = new Set();
    const poe = (f, n, cor, fac) => {
      if (vistas.has(f)) return;
      vistas.add(f);
      const escondida = oc.has(f) || (!!(fac && fac.oculta) && !rep[f]);
      if (escondida && !mestre) return;
      const v = escondida ? (sg[f] ? sg[f].v : rep[f] ? rep[f].v : 0) : rep[f] ? rep[f].v : 0;
      out.push({ f, n: n || (rep[f] && rep[f].n) || (sg[f] && sg[f].n) || 'Facção', cor: cor || null, v, oc: escondida });
    };
    for (const x of Array.isArray(facs) ? facs : []) if (ehObj(x) && idOk(x.id)) poe(x.id, nome(x.nome), x.cor, x);
    for (const f of Object.keys(rep)) poe(f, rep[f].n, null, null);
    if (mestre) { for (const f of oc) poe(f, null, null, null); for (const f of Object.keys(sg)) poe(f, sg[f].n, null, { oculta: true }); }
    return out;
  }

  /* Uma mudança. op: { t: 'valor', f, n, v } · { t: 'mais', f, n, d } · { t: 'esconder', f, n } · { t: 'mostrar', f, n }
     · { t: 'tirar', f } (volta ao começo: Neutro, e à vista se a facção não é escondida)
     fac: a facção do mapa (para saber se ela é escondida), ou null. seg = null: fora da mesa (o valor fica no estado).
     → { estado, seg, mudou, v } — o estado e o seg novos (cópias) e o valor que ficou */
  function mudar(estado, seg, op, fac) {
    const est = ehObj(estado) ? copia(estado) : {}, sg = seg == null ? null : segLimpo(seg);
    const rep = repDe(est), oc = new Set(ocDe(est)), f = op && op.f;
    const antes = JSON.stringify([rep, [...oc], sg]);
    if (!idOk(f)) return { estado: est, seg: sg, mudou: false };
    const escondida = oc.has(f) || (!!(fac && fac.oculta) && !rep[f]);
    const atual = escondida ? (sg && sg[f] ? sg[f].v : rep[f] ? rep[f].v : 0) : rep[f] ? rep[f].v : 0;
    const n = nome(op.n) || (rep[f] && rep[f].n) || (sg && sg[f] && sg[f].n) || (fac && nome(fac.nome)) || 'Facção';
    const guardar = (v, esc) => {
      if (esc) {
        oc.add(f);
        if (sg) { sg[f] = { v: lim(v), n }; delete rep[f]; } else rep[f] = { v: lim(v), n };
      } else { oc.delete(f); rep[f] = { v: lim(v), n }; if (sg) delete sg[f]; }
    };
    let v = atual;
    if (op.t === 'valor') { v = lim(op.v); guardar(v, escondida); }
    else if (op.t === 'mais') { v = lim(atual + (Number(op.d) || 0)); guardar(v, escondida); }
    else if (op.t === 'esconder') guardar(atual, true);
    else if (op.t === 'mostrar') guardar(atual, false);
    else if (op.t === 'tirar') { delete rep[f]; oc.delete(f); if (sg) delete sg[f]; v = 0; }
    else return { estado: est, seg: sg, mudou: false };
    if (Object.keys(rep).length) est.rep = rep; else delete est.rep;
    if (oc.size) est.repOc = [...oc]; else delete est.repOc;
    const mudou = JSON.stringify([rep, [...oc], sg]) !== antes;
    return { estado: est, seg: sg, mudou, v };
  }

  /* A recompensa de reputação de uma missão: [{ f, n, v }] (até 6, de −100 a +100, sem zero). */
  function recompensa(x) {
    const out = [];
    for (const r of Array.isArray(x) ? x : []) {
      if (!ehObj(r) || !idOk(r.f) || out.length >= 6 || out.some(y => y.f === r.f)) continue;
      const v = lim(r.v);
      if (v) out.push({ f: r.f, n: nome(r.n) || 'Facção', v });
    }
    return out;
  }
  const texto = r => (r.v > 0 ? '+' : '−') + Math.abs(r.v) + ' com ' + r.n;

  const api = { NIVEIS, nivel, faixa, linhas, mudar, recompensa, texto, lim };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TC = root.TC || {}; root.TC.reputacao = api;
})(typeof window !== 'undefined' ? window : globalThis);
