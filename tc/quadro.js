/* =======================================================================
   TC.quadro — o quadro de pistas de quem joga (lote 143). Lógica pura (Node e navegador).

   Cada jogador monta os quadros dele, com nome ("Minha saga", "O mistério da Academia"): um mural de cortiça com
   cartões presos e fios entre eles, para organizar as pistas, as missões e a linha de pensamento. O mestre vê (sem mexer).
     documento   quadroj:<jogador>:<id>  (vis 'mestre', o jogador é o dono)
     dados       { n: nome, cartas: { id: carta }, fios: [fio], em }
     carta       { k: 'nota'|'pista'|'missao'|'pessoa'|'lugar'|'img', x, y, t (título), d (texto), cor, ref, url, w }
     fio         { id, a, b (ids das cartas), cor, tex (a textura), txt (o que o fio quer dizer) }

     navegador   <script src="../tc/quadro.js"></script> → window.TC.quadro
     Node        const Q = require('./tc/quadro.js')
   ======================================================================= */
(function (root) {
  'use strict';
  const PRE = 'quadroj:';
  const LIM = Object.freeze({ nome: 60, titulo: 80, texto: 1200, cartas: 200, fios: 400, fioTxt: 40, quadros: 30 });
  const TAM = Object.freeze({ w: 3600, h: 2400 });        // o tamanho da cortiça (lote 159: era 2400 × 1600; ficou pequena)
  const TIPOS = Object.freeze([
    ['nota', 'Nota'], ['pista', 'Pista'], ['missao', 'Missão'], ['pessoa', 'Pessoa'], ['lugar', 'Lugar'], ['img', 'Imagem']]);
  // a cor do cartão diz o que ele é para quem montou
  const CORES = Object.freeze([
    ['', 'Papel', '#efe4c8'], ['certo', 'Certeza', '#b9e0b0'], ['duvida', 'Dúvida', '#f4dd86'], ['perigo', 'Perigo', '#f0aaa0'],
    ['ideia', 'Ideia', '#b7d3f2'], ['descartado', 'Descartado', '#b9b9b9']]);
  const CORES_FIO = Object.freeze([
    ['vermelho', 'Vermelho', '#c0392b'], ['azul', 'Azul', '#2f6fb3'], ['verde', 'Verde', '#3f8f4f'], ['amarelo', 'Amarelo', '#d4a017'],
    ['roxo', 'Roxo', '#7b4fa8'], ['preto', 'Preto', '#26221e'], ['branco', 'Branco', '#ece6da']]);
  // a textura do fio
  const TEXTURAS = Object.freeze([
    ['barbante', 'Barbante'], ['torcido', 'Barbante torcido'], ['la', 'Lã grossa'], ['corrente', 'Corrente'], ['tracejado', 'Tracejado'], ['pontilhado', 'Pontilhado']]);
  /* (lote 144) a legenda: o que cada cor e cada textura de fio quer dizer (a de costume, que cada quadro pode mudar).
     A cor diz o tipo de ligação; a textura, o quanto se tem certeza dela. */
  const LEGENDA = Object.freeze({
    c: Object.freeze({ vermelho: 'O crime, o mistério ou o suspeito principal', azul: 'Pessoas: família, amizade, quem trabalha para quem', verde: 'Dinheiro: comércio, troca, suborno, dívida',
      amarelo: 'Lugar e tempo: esteve em, aconteceu antes ou depois', roxo: 'Magia, deuses, relíquias, o sobrenatural', preto: 'Ameaça, morte, traição, inimizade', branco: 'A minha saga e o meu personagem' }),
    t: Object.freeze({ barbante: 'Confirmado: vi, ouvi ou tenho a prova', torcido: 'Confirmado e importante: sustenta a teoria', la: 'Forte e antigo: sangue, juramento, aliança',
      corrente: 'Preso ou obrigado: chantagem, contrato, pacto', tracejado: 'Suspeita: faz sentido, mas falta prova', pontilhado: 'Palpite ou boato' }),
  });
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const idOk = k => typeof k === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(k);
  const txt = (x, n) => String(x == null ? '' : x).replace(/\r/g, '').slice(0, n);
  const num = (v, a, b, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d; };
  const de = (lista, k, d) => (lista.some(x => x[0] === k) ? k : d);
  const urlOk = u => typeof u === 'string' && /^https:\/\/[^\s"'<>]{4,600}$/.test(u) ? u : '';
  const novoId = (p) => (p || 'c') + Math.random().toString(36).slice(2, 10);

  const idDoc = (eu, qid) => PRE + eu + ':' + qid;
  // 'quadroj:<jogador>:<id>' → { dono, qid } (ou null)
  function partes(id) {
    const m = typeof id === 'string' && /^quadroj:([0-9a-zA-Z_-]{1,60}):([A-Za-z0-9_-]{1,40})$/.exec(id);
    return m ? { dono: m[1], qid: m[2] } : null;
  }

  function carta(x) {
    if (!ehObj(x)) return null;
    const o = { k: de(TIPOS, x.k, 'nota'), x: num(x.x, 0, TAM.w - 40, 40), y: num(x.y, 0, TAM.h - 40, 40), t: txt(x.t, LIM.titulo).trim(), d: txt(x.d, LIM.texto), cor: de(CORES, x.cor, '') };
    if (typeof x.ref === 'string' && /^[A-Za-z0-9_:@-]{1,120}$/.test(x.ref)) o.ref = x.ref;
    const u = urlOk(x.url); if (u) o.url = u;
    if (x.w != null) o.w = num(x.w, 140, 420, 200);
    if (!o.t && !o.d && !o.url) o.t = 'Sem título';
    return o;
  }
  function fio(x, cartas) {
    if (!ehObj(x) || !idOk(x.a) || !idOk(x.b) || x.a === x.b || !cartas[x.a] || !cartas[x.b]) return null;
    return { id: idOk(x.id) ? x.id : novoId('f'), a: x.a, b: x.b, cor: de(CORES_FIO, x.cor, 'vermelho'), tex: de(TEXTURAS, x.tex, 'barbante'), txt: txt(x.txt, LIM.fioTxt).trim() };
  }
  function norm(d) {
    const o = { n: '', cartas: {}, fios: [], em: '' };
    if (!ehObj(d)) { o.n = 'Quadro'; return o; }
    o.n = txt(d.n, LIM.nome).trim() || 'Quadro';
    if (typeof d.em === 'string') o.em = d.em.slice(0, 40);
    // (lote 144) a legenda deste quadro: só o que mudou da de costume
    if (ehObj(d.leg)) {
      const leg = {};
      for (const [g, lista] of [['c', CORES_FIO], ['t', TEXTURAS]]) if (ehObj(d.leg[g])) for (const [k] of lista) {
        const v = txt(d.leg[g][k], 60).replace(/\s+/g, ' ').trim();
        if (v && v !== LEGENDA[g][k]) (leg[g] = leg[g] || {})[k] = v;
      }
      if (leg.c || leg.t) o.leg = leg;
    }
    if (ehObj(d.cartas)) for (const id of Object.keys(d.cartas)) { if (Object.keys(o.cartas).length >= LIM.cartas) break; const c = idOk(id) ? carta(d.cartas[id]) : null; if (c) o.cartas[id] = c; }
    const vistos = new Set();
    if (Array.isArray(d.fios)) for (const f of d.fios) {
      if (o.fios.length >= LIM.fios) break;
      const ff = fio(f, o.cartas);
      if (!ff) continue;
      const par = [ff.a, ff.b].sort().join('|');
      if (vistos.has(par) || o.fios.some(x => x.id === ff.id)) continue;
      vistos.add(par); o.fios.push(ff);
    }
    return o;
  }
  /* Uma mudança no quadro → o quadro novo (não altera o que recebeu). ops:
       { t: 'nome', n }
       { t: 'carta', id, c }          cria ou troca a carta (c: os campos)
       { t: 'mover', id, x, y }
       { t: 'tirar', id }             a carta e os fios dela
       { t: 'fio', f }                cria (ou troca o de mesmo id, ou o do mesmo par)
       { t: 'semFio', id }  */
  function mudar(d, op) {
    const q = norm(JSON.parse(JSON.stringify(norm(d))));
    if (!ehObj(op)) return q;
    if (op.t === 'nome') q.n = txt(op.n, LIM.nome).trim() || q.n;
    else if (op.t === 'legenda') { if (ehObj(op.leg)) q.leg = op.leg; else delete q.leg; }
    else if (op.t === 'carta' && idOk(op.id)) { const c = carta(Object.assign({}, q.cartas[op.id] || {}, op.c || {})); if (c && (q.cartas[op.id] || Object.keys(q.cartas).length < LIM.cartas)) q.cartas[op.id] = c; }
    else if (op.t === 'mover' && q.cartas[op.id]) { q.cartas[op.id].x = num(op.x, 0, TAM.w - 40, q.cartas[op.id].x); q.cartas[op.id].y = num(op.y, 0, TAM.h - 40, q.cartas[op.id].y); }
    else if (op.t === 'tirar' && q.cartas[op.id]) { delete q.cartas[op.id]; q.fios = q.fios.filter(f => f.a !== op.id && f.b !== op.id); }
    else if (op.t === 'fio' && ehObj(op.f)) {
      const f = fio(op.f, q.cartas);
      if (f) {
        const par = [f.a, f.b].sort().join('|');
        q.fios = q.fios.filter(x => x.id !== f.id && [x.a, x.b].sort().join('|') !== par);
        if (q.fios.length < LIM.fios) q.fios.push(f);
      }
    }
    else if (op.t === 'semFio') q.fios = q.fios.filter(f => f.id !== op.id);
    return norm(q);
  }
  // os quadros de cada um, numa lista de linhas do banco: [{ id, dono, qid, q }]
  function quadrosEm(linhas) {
    return (Array.isArray(linhas) ? linhas : []).filter(l => l && !l.apagado && partes(l.id)).map(l => Object.assign({ id: l.id, q: norm(l.dados) }, partes(l.id)))
      .sort((a, b) => String(b.q.em || '').localeCompare(String(a.q.em || '')) || a.q.n.localeCompare(b.q.n));
  }
  // o que a cor (g 'c') ou a textura (g 't') quer dizer neste quadro
  const sentido = (q, g, k) => (q && q.leg && q.leg[g] && q.leg[g][k]) || LEGENDA[g][k] || '';
  const corDe = k => (CORES.find(x => x[0] === k) || CORES[0])[2];
  const corFio = k => (CORES_FIO.find(x => x[0] === k) || CORES_FIO[0])[2];

  const API = { PRE, LIM, TAM, TIPOS, CORES, CORES_FIO, TEXTURAS, LEGENDA, sentido, idDoc, partes, norm, mudar, quadrosEm, corDe, corFio, novoId };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { root.TC = root.TC || {}; root.TC.quadro = API; }
})(typeof window !== 'undefined' ? window : globalThis);
