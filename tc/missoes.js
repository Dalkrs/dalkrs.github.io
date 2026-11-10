/* =======================================================================
   TC.missoes — as missões da mesa (lote 123). Lógica pura (Node e navegador).

   A aba Missões (no modo Sessão) junta tudo o que antes ficava na ficha: o quadro da campanha, as missões do grupo e
   as de cada personagem. O mestre cria; quem joga pega no quadro, desiste e acompanha. Três documentos:

     fichas:mis:quadro[@campanha]  (vis mesa)  o quadro: o estilo da campanha e as missões publicadas
                                    { v, estilo, mig, ms: { id: missão } }
                                    Quem participa da campanha mexe nele (pegar e desistir): ver a migração 0040.
     fichas:mis:rasc[@campanha]    (vis mestre) os rascunhos do mestre: { v, ms: { id: missão } }
     fichas:mis:pc:<personagem>     (vis mestre, dono = quem joga o personagem) as missões da história, entregues
                                    direto a ele: { v, ms: { id: missão } }

   A missão: { t título, d descrição, r recompensa, o objetivos { oid: { t, n } }, ct quem pede, cti a imagem de quem
   pede, pe perigo (0 a 5), img a imagem, lug { mapa, obj, nome } o lugar no Mapa-múndi, pz prazo, c quando foi criada,
   quem, e, ok, pegas, alvo, fechada, de, tp }
     tp     (lote 129) 'principal' ou 'secundaria' — a da história nasce principal; as outras, secundárias
     o      cada objetivo pode ser opcional (op: 1): é o "opcional dentro da missão" dos marcadores de missão das Cenas
     quem   'um'     a primeira pessoa que pegar fica com ela (some do quadro)
            'todos'  cada personagem pega a sua (fica no quadro; cada um com o próprio andamento, em pegas)
            'grupo'  um pega e ela vira do grupo inteiro
            'pc'     da história: o mestre entrega direto a um personagem (alvo, nos rascunhos)
     e      'oferta' (no quadro, ninguém pegou) · 'ativa' · 'feita' · 'falhou'
     ok     os objetivos feitos { oid: 1 } (o andamento de 'um', 'grupo' e 'pc')
     pegas  { personagem: { u quem jogou, em, e, ok } } — quem pegou (em 'todos', com o andamento de cada um)

     navegador   a tag script com src="../tc/missoes.js" → window.TC.missoes
     Node        const M = require('./tc/missoes.js')
   ======================================================================= */
(function (root) {
  'use strict';
  const QUADRO = 'fichas:mis:quadro', RASC = 'fichas:mis:rasc', PRE_PC = 'fichas:mis:pc:';
  const comCamp = (base, camp) => base + (camp ? '@' + camp : '');
  const ESTILOS = Object.freeze([
    { k: 'mural', n: 'Mural de cartazes', dica: 'Aventureiro: cartazes pregados num quadro de madeira' },
    { k: 'dossie', n: 'Arquivos e dossiês', dica: 'Assassino: pastas com carimbo, a foto do alvo presa no clipe' },
    { k: 'ordem', n: 'Pergaminhos de ordem', dica: 'Militar ou nobre: ordens lacradas com selo de cera' },
    { k: 'diario', n: 'Diário simples', dica: 'Uma lista limpa, sem tema' }]);
  const QUEM = Object.freeze([
    { k: 'um', n: 'Para quem pegar primeiro', curto: 'Só um pega' },
    { k: 'todos', n: 'Cada personagem pega a sua', curto: 'Cada um pega a sua' },
    { k: 'grupo', n: 'Para o grupo (um pega por todos)', curto: 'Do grupo' },
    { k: 'pc', n: 'Da história (entregue direto a um personagem)', curto: 'Da história' }]);
  const ESTADOS = Object.freeze([
    { k: 'oferta', n: 'No quadro' }, { k: 'ativa', n: 'Ativa' }, { k: 'feita', n: 'Cumprida' }, { k: 'falhou', n: 'Falhou' }]);
  // (lote 129) o tipo da missão: o que os marcadores de missão das Cenas e do Mapa-múndi desenham
  const TIPOS = Object.freeze([{ k: 'principal', n: 'Principal' }, { k: 'secundaria', n: 'Secundária' }]);
  const tipoDe = k => TIPOS.find(x => x.k === k) || TIPOS[1];
  const PERIGO = Object.freeze(['Sem perigo', 'Tranquila', 'Arriscada', 'Perigosa', 'Mortal', 'Suicida']);

  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const txt = (x, max) => String(x == null ? '' : x).slice(0, max);
  const num = x => (typeof x === 'number' && isFinite(x) ? x : null);
  const copia = x => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
  const idOk = k => typeof k === 'string' && /^[A-Za-z0-9_.-]{1,60}$/.test(k);
  const estiloDe = k => ESTILOS.find(x => x.k === k) || ESTILOS[0];
  const quemDe = k => QUEM.find(x => x.k === k) || QUEM[0];
  const estadoDe = k => ESTADOS.find(x => x.k === k) || ESTADOS[1];
  const novoId = (p) => (p || 'm') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* A missão limpa (o que veio do documento pode ter qualquer coisa). */
  function okDe(x) { const o = {}; if (ehObj(x)) for (const k of Object.keys(x)) if (idOk(k) && x[k]) o[k] = 1; return o; }
  function missao(m) {
    m = ehObj(m) ? m : {};
    const o = {};
    if (ehObj(m.o)) Object.keys(m.o).forEach((oid, i) => { const x = m.o[oid]; if (idOk(oid) && ehObj(x)) { o[oid] = { t: txt(x.t, 200), n: num(x.n) == null ? i : num(x.n) }; if (x.op) o[oid].op = 1; } });
    const quem = QUEM.some(x => x.k === m.quem) ? m.quem : 'grupo';
    const r = { t: txt(m.t, 120), d: txt(m.d, 3000), r: txt(m.r, 300), o, ct: txt(m.ct, 80), cti: txt(m.cti, 600), pe: Math.max(0, Math.min(5, Math.round(num(m.pe) || 0))),
      img: txt(m.img, 600), lug: null, pz: txt(m.pz, 80), c: num(m.c) || 0, quem,
      e: ESTADOS.some(x => x.k === m.e) ? m.e : (quem === 'pc' ? 'ativa' : 'oferta'), ok: okDe(m.ok), pegas: {}, de: m.de === 'j' ? 'j' : 'm' };
    if (quem === 'pc' && r.e === 'oferta') r.e = 'ativa';
    r.tp = TIPOS.some(x => x.k === m.tp) ? m.tp : (quem === 'pc' ? 'principal' : 'secundaria');      // (lote 129)
    // (lote 126) a reputação que ela dá quando é cumprida: [{ f facção, n nome, v de −100 a +100 }]
    if (Array.isArray(m.rep)) { const rp = []; for (const x of m.rep) { if (!ehObj(x) || !idOk(x.f) || rp.length >= 6 || rp.some(y => y.f === x.f)) continue; const v = Math.max(-100, Math.min(100, Math.round(num(x.v) || 0))); if (v) rp.push({ f: x.f, n: txt(x.n, 60) || 'Facção', v }); } if (rp.length) r.rep = rp; }
    if (m.repDada) r.repDada = true;
    if (ehObj(m.lug) && typeof m.lug.mapa === 'string' && m.lug.mapa) r.lug = { mapa: txt(m.lug.mapa, 80), obj: typeof m.lug.obj === 'string' ? txt(m.lug.obj, 80) : '', nome: txt(m.lug.nome, 80) };
    if (ehObj(m.pegas)) for (const pc of Object.keys(m.pegas)) {
      const p = m.pegas[pc]; if (!idOk(pc) || !ehObj(p)) continue;
      r.pegas[pc] = { u: typeof p.u === 'string' ? p.u : null, em: num(p.em) || 0, e: ['ativa', 'feita', 'falhou'].includes(p.e) ? p.e : 'ativa', ok: okDe(p.ok) };
      if (p.repDada) r.pegas[pc].repDada = true;
    }
    if (typeof m.alvo === 'string' && idOk(m.alvo)) r.alvo = m.alvo;
    if (m.fechada) r.fechada = true;
    if (m.mig) r.mig = true;
    return r;
  }
  /* O documento: { v, ms } (o quadro também tem o estilo). */
  function doc(d) {
    const x = ehObj(d) ? d : {}, ms = {};
    if (ehObj(x.ms)) for (const id of Object.keys(x.ms)) if (idOk(id) && ehObj(x.ms[id])) ms[id] = missao(x.ms[id]);
    const r = { v: 1, ms };
    if (typeof x.estilo === 'string') r.estilo = estiloDe(x.estilo).k;
    if (x.mig) r.mig = true;
    return r;
  }
  const objs = m => Object.keys(m.o || {}).map(oid => ({ id: oid, t: m.o[oid].t, n: m.o[oid].n, op: !!m.o[oid].op })).sort((a, b) => (a.n - b.n) || (a.id < b.id ? -1 : 1));
  const ordem = (a, b) => (b.c - a.c) || (a.id < b.id ? -1 : 1);
  const lista = d => { const D = doc(d); return Object.keys(D.ms).map(id => Object.assign({ id }, D.ms[id])); };

  /* O andamento de uma missão para um personagem: o estado e os objetivos (feitos ou não). */
  function andamento(m, pc) {
    const p = pc && m.pegas && m.pegas[pc];
    const deCada = m.quem === 'todos';
    const e = deCada ? (p ? p.e : 'oferta') : m.e, ok = deCada ? (p ? p.ok : {}) : m.ok;
    const os = objs(m).map(o => Object.assign(o, { ok: !!ok[o.id] }));
    return { e, objs: os, feitos: os.filter(o => o.ok).length, total: os.length };
  }

  /* As missões de um personagem (as que ele carrega): as da história (o documento dele), as do quadro que ele pegou
     ('um' e 'todos') e as do grupo que alguém pegou (de todos da campanha). */
  function doPersonagem(quadro, docPc, pc) {
    const Q = doc(quadro), P = doc(docPc), out = [];
    for (const id of Object.keys(P.ms)) { const m = P.ms[id]; out.push(Object.assign({ id, onde: 'pc' }, m, andamento(m, pc))); }
    for (const id of Object.keys(Q.ms)) {
      const m = Q.ms[id];
      if (m.quem === 'grupo' && m.e !== 'oferta') out.push(Object.assign({ id, onde: 'quadro' }, m, andamento(m, pc)));
      else if ((m.quem === 'um' || m.quem === 'todos') && m.pegas[pc]) out.push(Object.assign({ id, onde: 'quadro' }, m, andamento(m, pc)));
    }
    const peso = { ativa: 0, feita: 1, falhou: 2, oferta: 3 };
    return out.sort((a, b) => (peso[a.e] - peso[b.e]) || ordem(a, b));
  }
  /* O que está no quadro para pegar: 'um' e 'grupo' que ninguém pegou; 'todos' que não foi fechada. */
  function noQuadro(quadro) {
    const Q = doc(quadro);
    return Object.keys(Q.ms).map(id => Object.assign({ id }, Q.ms[id]))
      .filter(m => (m.quem === 'todos' ? !m.fechada : m.e === 'oferta') && m.quem !== 'pc').sort(ordem);
  }
  /* As do grupo (já pegas): para a parte "Do grupo". */
  function doGrupo(quadro) {
    const Q = doc(quadro);
    return Object.keys(Q.ms).map(id => Object.assign({ id }, Q.ms[id], andamento(Q.ms[id], null))).filter(m => m.quem === 'grupo' && m.e !== 'oferta').sort(ordem);
  }

  /* Pegar uma missão do quadro: devolve o quadro novo, ou { erro }. */
  function pegar(quadro, id, pc, u, em) {
    const Q = doc(quadro), m = Q.ms[id];
    if (!m) return { erro: 'Esta missão não está mais no quadro.' };
    if (!idOk(pc)) return { erro: 'Escolha o personagem.' };
    if (m.quem === 'pc') return { erro: 'Esta missão é da história: o mestre entrega.' };
    if (m.quem === 'todos') {
      if (m.fechada) return { erro: 'O mestre tirou esta missão do quadro.' };
      if (m.pegas[pc]) return { erro: 'Este personagem já pegou esta missão.' };
      m.pegas[pc] = { u: u || null, em: em || Date.now(), e: 'ativa', ok: {} };
    } else {
      if (m.e !== 'oferta') return { erro: 'Alguém pegou esta missão antes.' };
      m.pegas = { [pc]: { u: u || null, em: em || Date.now(), e: 'ativa', ok: {} } };
      m.e = 'ativa'; m.ok = {};
    }
    return { quadro: Q, m };
  }
  /* Desistir: a do quadro volta para o quadro (o andamento some); a da história conta como falha. */
  function desistir(quadro, docPc, id, pc) {
    const Q = doc(quadro), P = doc(docPc);
    if (P.ms[id]) { if (P.ms[id].e !== 'ativa') return { erro: 'Esta missão já terminou.' }; P.ms[id].e = 'falhou'; return { pc: P, falhou: true }; }
    const m = Q.ms[id];
    if (!m) return { erro: 'Não achei esta missão.' };
    if (m.quem === 'todos') {
      if (!m.pegas[pc]) return { erro: 'Este personagem não pegou esta missão.' };
      if (m.pegas[pc].e !== 'ativa') return { erro: 'Esta missão já terminou.' };
      delete m.pegas[pc];
    } else {
      if (m.e !== 'ativa') return { erro: 'Esta missão já terminou.' };
      if (m.quem === 'um' && !m.pegas[pc]) return { erro: 'Este personagem não pegou esta missão.' };
      m.pegas = {}; m.e = 'oferta'; m.ok = {};
    }
    return { quadro: Q, voltou: true };
  }
  /* O mestre (ou quem pode) marca um objetivo ou muda o estado. pc: em 'todos', de quem. */
  function marcarObjetivo(d, id, oid, feito, pc) {
    const D = doc(d), m = D.ms[id]; if (!m || !m.o[oid]) return null;
    const alvo = m.quem === 'todos' ? m.pegas[pc] : m; if (!alvo) return null;
    if (feito) alvo.ok[oid] = 1; else delete alvo.ok[oid];
    return D;
  }
  function mudarEstado(d, id, e, pc) {
    const D = doc(d), m = D.ms[id]; if (!m || !ESTADOS.some(x => x.k === e)) return null;
    if (m.quem === 'todos') { if (!m.pegas[pc] || e === 'oferta') return null; m.pegas[pc].e = e; }
    else { m.e = e; if (e === 'oferta') { m.pegas = {}; m.ok = {}; } }
    return D;
  }

  /* Entregar: do rascunho para o quadro (publicar) ou para o personagem (a da história). */
  function publicar(rasc, quadro, id) {
    const R = doc(rasc), Q = doc(quadro), m = R.ms[id]; if (!m) return null;
    if (m.quem === 'pc') return null;
    delete R.ms[id]; delete m.alvo;
    m.e = 'oferta'; m.pegas = {}; m.ok = {};
    Q.ms[id] = m;
    return { rasc: R, quadro: Q };
  }
  function entregar(rasc, docPc, id) {
    const R = doc(rasc), P = doc(docPc), m = R.ms[id]; if (!m) return null;
    delete R.ms[id]; delete m.alvo;
    m.quem = 'pc'; m.e = 'ativa'; m.pegas = {};
    P.ms[id] = m;
    return { rasc: R, pc: P };
  }
  /* Recolher: volta para os rascunhos (some para quem joga). */
  function recolher(de, rasc, id, alvo) {
    const D = doc(de), R = doc(rasc), m = D.ms[id]; if (!m) return null;
    delete D.ms[id];
    if (m.quem === 'pc' && alvo) m.alvo = alvo;
    if (m.quem !== 'pc') { m.e = 'oferta'; m.pegas = {}; m.ok = {}; }
    R.ms[id] = m;
    return { de: D, rasc: R };
  }

  /* As missões de antes (lote 123): as que moravam na ficha passam para os documentos novos. Nada é apagado de onde
     estava; a cópia é feita uma vez (o quadro fica marcado com mig).
       velho: { grupo: { id: missão } (as do grupo, à mostra), grupoOcultas, pcs: [{ id, mis, ocultas }] }
     As do grupo vão para o quadro já como do grupo (com o estado que tinham); as escondidas, para os rascunhos;
     as de cada personagem, para o documento dele (as escondidas, para os rascunhos, com o alvo). */
  function deAntes(m, extra) {
    const o = {};
    if (ehObj(m.o)) Object.keys(m.o).forEach((oid, i) => { const x = m.o[oid]; if (idOk(oid) && ehObj(x)) { o[oid] = { t: txt(x.t, 200), n: num(x.n) == null ? i : num(x.n) }; if (x.op) o[oid].op = 1; } });
    const ok = {}; if (ehObj(m.o)) for (const oid of Object.keys(m.o)) if (idOk(oid) && ehObj(m.o[oid]) && m.o[oid].ok) ok[oid] = 1;
    const e = ['ativa', 'feita', 'falhou'].includes(m.e) ? m.e : 'ativa';
    return missao(Object.assign({ t: m.t, d: m.d, r: m.r, o, ok, e, c: num(m.c) || 0, de: m.de, mig: true }, extra));
  }
  function migrar(velho, quadro, rasc, pcsDocs) {
    const Q = doc(quadro), R = doc(rasc), P = {}, v = ehObj(velho) ? velho : {};
    let n = 0;
    const poe = (alvo, id, m) => { let k = idOk(id) ? id : novoId(); while (alvo[k]) k = novoId(); alvo[k] = m; n++; };
    if (ehObj(v.grupo)) for (const id of Object.keys(v.grupo)) if (ehObj(v.grupo[id])) poe(Q.ms, id, deAntes(v.grupo[id], { quem: 'grupo' }));
    if (ehObj(v.grupoOcultas)) for (const id of Object.keys(v.grupoOcultas)) if (ehObj(v.grupoOcultas[id])) { const m = deAntes(v.grupoOcultas[id], { quem: 'grupo' }); m.e = 'oferta'; poe(R.ms, id, m); }
    for (const pc of Array.isArray(v.pcs) ? v.pcs : []) {
      if (!pc || !idOk(pc.id)) continue;
      const D = P[pc.id] = doc(pcsDocs && pcsDocs[pc.id]);
      if (ehObj(pc.mis)) for (const id of Object.keys(pc.mis)) if (ehObj(pc.mis[id])) poe(D.ms, id, deAntes(pc.mis[id], { quem: 'pc' }));
      if (ehObj(pc.ocultas)) for (const id of Object.keys(pc.ocultas)) if (ehObj(pc.ocultas[id])) poe(R.ms, id, deAntes(pc.ocultas[id], { quem: 'pc', alvo: pc.id }));
    }
    Q.mig = true;
    return { quadro: Q, rasc: R, pcs: P, n };
  }

  /* O resumo para a ficha: as ativas do personagem (título, de onde, objetivos feitos). */
  function resumo(quadro, docPc, pc) {
    return doPersonagem(quadro, docPc, pc).filter(m => m.e === 'ativa')
      .map(m => ({ id: m.id, t: m.t || 'Missão sem título', quem: m.quem, feitos: m.feitos, total: m.total, objs: m.objs, pz: m.pz }));
  }

  /* (lote 129) Os marcadores de missão (Cenas e Mapa-múndi): uma missão de qualquer documento de missões, pelo id.
     linhas: [{ id, dados, apagado }] (os documentos da mesa). → { m (com id), docId, onde: 'rasc' | 'quadro' | 'pc' } ou null */
  function acharEmDocs(linhas, id) {
    if (!idOk(id)) return null;
    for (const l of linhas || []) {
      if (!l || l.apagado || typeof l.id !== 'string' || !l.id.startsWith('fichas:mis:') || !ehObj(l.dados) || !ehObj(l.dados.ms) || !ehObj(l.dados.ms[id])) continue;
      const onde = l.id.startsWith(PRE_PC) ? 'pc' : l.id.startsWith(RASC) ? 'rasc' : l.id.startsWith(QUADRO) ? 'quadro' : null;
      if (!onde) continue;
      return { m: Object.assign({ id }, missao(l.dados.ms[id])), docId: l.id, onde };
    }
    return null;
  }
  /* A situação geral de uma missão (para o marcador): 'oculta' (nos rascunhos), 'oferta', 'ativa', 'feita' ou 'falhou'.
     Em "Cada um pega a sua": ativa enquanto alguém faz; feita quando todos que pegaram cumpriram; falhou se todos falharam. */
  function situacao(m, onde) {
    if (onde === 'rasc') return 'oculta';
    if (m.quem !== 'todos') return m.e;
    const ps = Object.values(m.pegas || {});
    if (!ps.length) return 'oferta';
    if (ps.some(p => p.e === 'ativa')) return 'ativa';
    if (ps.some(p => p.e === 'feita')) return 'feita';
    return 'falhou';
  }
  /* O que o marcador mostra: a missão (ou um objetivo opcional dela, oid). → { t, tp, tpN, ot, e, op } ou null
     e do objetivo: 'feita' quando marcado (em "Cada um pega a sua", por alguém), 'falhou' quando a missão falhou. */
  function marcador(achada, oid) {
    if (!achada) return null;
    const m = achada.m, e = situacao(m, achada.onde), r = { t: m.t || 'Missão sem título', tp: m.tp, tpN: tipoDe(m.tp).n, e, op: false };
    if (oid) {
      const o = m.o[oid]; if (!o) return null;
      const feito = m.quem === 'todos' ? Object.values(m.pegas || {}).some(p => p.ok && p.ok[oid]) : !!(m.ok && m.ok[oid]);
      r.ot = o.t || 'Objetivo'; r.op = !!o.op;
      r.e = e === 'oculta' || e === 'oferta' ? e : feito ? 'feita' : e === 'falhou' ? 'falhou' : 'ativa';
    }
    return r;
  }

  const api = { QUADRO, RASC, PRE_PC, comCamp, ESTILOS, QUEM, ESTADOS, PERIGO, TIPOS, tipoDe, estiloDe, quemDe, estadoDe, novoId, missao, doc, objs, lista, andamento,
    doPersonagem, noQuadro, doGrupo, pegar, desistir, marcarObjetivo, mudarEstado, publicar, entregar, recolher, migrar, resumo, copia, acharEmDocs, situacao, marcador };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TC = root.TC || {}; root.TC.missoes = api;
})(typeof window !== 'undefined' ? window : globalThis);
