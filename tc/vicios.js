/* =======================================================================
   TC.vicios — os vícios de cada personagem (lote 175). Lógica pura (Node e navegador).

   Um vício (cigarro, bebida, sexo, jogo…) tem uma necessidade de 0 a 10 que sobe com os dias do mundo (o dia do
   Mapa-múndi). O mestre escolhe o ritmo de cada vício (quanto sobe por dia). Quando o personagem cumpre o vício, a
   necessidade baixa (o mestre diz quanto; cada vício tem um "baixa ao cumprir" de começo). O buff de cumprir o
   mestre dá na mão: o sistema só mostra se a necessidade está alta ou não.

   Cada vício: { id, m (o molde), n (o nome), d (a descrição), g (o grau), nec (0 a 10), rit (por dia), bx (baixa ao cumprir),
                 oc (secreto), dia (o dia do mundo em que a necessidade foi contada), mp (o mapa desse dia) }
   As faixas: 0–2 Tranquilo · 3–5 Inquieto · 6–8 Com fissura · 9–10 Desesperado.
   O grau (lote 208): leve, medio ou profundo — uma marca que o mestre põe e lê; não muda conta nenhuma. É de cada
   ficha (o mesmo vício pode ser leve num e profundo noutro), não do molde. Todo vício tem um: sem grau, é leve.

   Onde fica:
     segredos.vic[personagem]   a lista inteira (fichas:segredos, só quem mestra)
     segredos.vicBib            os moldes { id, n, d, rit, bx } (para pôr o mesmo vício em outra ficha)
     estado.vic                 o que o jogador vê: [{ id, n, d, g, nec }] dos que não são secretos (fora de uma mesa, tudo)

     navegador   <script src="../tc/vicios.js"></script> → window.TC.vicios
     Node        const V = require('./tc/vicios.js')
   ======================================================================= */
(function (root) {
  'use strict';
  const LIM = Object.freeze({ nome: 60, desc: 400, lista: 30, nec: 10, rit: 10, bib: 300 });
  const PADRAO = Object.freeze({ rit: 1, bx: 5 });
  const FAIXAS = Object.freeze([
    { k: 'tranquilo', n: 'Tranquilo', de: 0, cor: '#5fae6b' },
    { k: 'inquieto', n: 'Inquieto', de: 3, cor: '#d9b44a' },
    { k: 'fissura', n: 'Com fissura', de: 6, cor: '#e07b39' },
    { k: 'desesperado', n: 'Desesperado', de: 9, cor: '#d0473e' }
  ]);
  const GRAUS = Object.freeze([
    { k: 'leve', n: 'Leve', cor: '#7fa8c9' },
    { k: 'medio', n: 'Médio', cor: '#b98ad6' },
    { k: 'profundo', n: 'Profundo', cor: '#b04a76' }
  ]);
  const grauOk = g => (GRAUS.some(x => x.k === g) ? g : 'leve');
  const grau = g => GRAUS.find(x => x.k === grauOk(g));
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const idOk = k => typeof k === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(k);
  const txt = (x, n) => String(x == null ? '' : x).replace(/\r/g, '').trim().slice(0, n);
  const dec = (v, a, b, d) => { const n = Number(v); return v !== null && v !== '' && Number.isFinite(n) ? Math.round(Math.max(a, Math.min(b, n)) * 10) / 10 : d; };
  const inteiro = v => { const n = Number(v); return v !== null && v !== '' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null; };

  function umDe(x) {
    if (!ehObj(x) || !idOk(x.id)) return null;
    const v = { id: x.id, n: txt(x.n, LIM.nome) || 'Vício', d: txt(x.d, LIM.desc), g: grauOk(x.g), nec: dec(x.nec, 0, LIM.nec, 0),
      rit: dec(x.rit, 0, LIM.rit, PADRAO.rit), bx: dec(x.bx, 0.1, LIM.nec, PADRAO.bx), oc: !!x.oc };
    if (idOk(x.m)) v.m = x.m;
    const dia = inteiro(x.dia);
    if (dia != null) { v.dia = dia; if (typeof x.mp === 'string' && x.mp.length <= 80) v.mp = x.mp; }
    return v;
  }
  function norm(lista) {
    const out = [], vistos = new Set();
    for (const x of Array.isArray(lista) ? lista : []) {
      const v = umDe(x);
      if (!v || vistos.has(v.id) || out.length >= LIM.lista) continue;
      vistos.add(v.id); out.push(v);
    }
    return out;
  }
  // a faixa da necessidade: { k, n, cor, i (0 a 3) }
  function faixa(nec) {
    const x = dec(nec, 0, LIM.nec, 0);
    let i = 0;
    for (let k = 0; k < FAIXAS.length; k++) if (x >= FAIXAS[k].de) i = k;
    return Object.assign({ i }, FAIXAS[i]);
  }
  const alta = v => !!v && faixa(v.nec).i >= 2;            // com fissura ou desesperado
  const altos = lista => norm(lista).filter(alta);
  // o número como se lê: 6,5
  const num = x => String(Math.round(Number(x) * 10) / 10).replace('.', ',');
  const textoRitmo = v => (v.rit ? '+' + num(v.rit) + ' por dia' : 'não sobe sozinho');

  // o que o jogador vê (estado.vic): os não secretos, com o grau, sem o ritmo
  const publica = lista => norm(lista).filter(v => !v.oc).map(v => ({ id: v.id, n: v.n, d: v.d, g: v.g, nec: v.nec }));
  const doJogador = estado => (ehObj(estado) && Array.isArray(estado.vic) ? estado.vic : [])
    .filter(x => ehObj(x) && idOk(x.id)).slice(0, LIM.lista)
    .map(x => ({ id: x.id, n: txt(x.n, LIM.nome) || 'Vício', d: txt(x.d, LIM.desc), g: grauOk(x.g), nec: dec(x.nec, 0, LIM.nec, 0) }));

  /* "+2 -1", "3", "-1,5": a soma. null: não é uma conta dessas. */
  function conta(s) {
    const t = String(s == null ? '' : s).replace(/\s+/g, '').replace(/−/g, '-').replace(/,/g, '.');
    if (!/^[+-]?\d{1,3}(\.\d)?([+-]\d{1,3}(\.\d)?)*$/.test(t)) return null;
    return Math.round((t.match(/[+-]?\d+(\.\d)?/g) || []).reduce((a, n) => a + Number(n), 0) * 10) / 10;
  }

  /* Uma mudança na lista. op:
       { t: 'nova', id, n, d, rit, bx, nec, oc, m, dia, mp }
       { t: 'editar', id, n?, d?, g?, rit?, bx?, nec?, oc? }
       { t: 'nec', id, d }        soma d na necessidade (fica entre 0 e 10)
       { t: 'cumprir', id, d? }   baixa d (sem d: o "baixa ao cumprir" do vício)
       { t: 'oc', id, v }
       { t: 'tirar', id }
     → { lista, mudou, a (o vício depois), antes (a faixa antes), depois (a faixa depois) } — não altera o que recebeu. */
  function mudar(lista, op) {
    const l = norm(lista), i = ehObj(op) && idOk(op.id) ? l.findIndex(v => v.id === op.id) : -1;
    const nada = { lista: l, mudou: false, a: i >= 0 ? l[i] : null };
    if (!ehObj(op)) return nada;
    if (op.t === 'nova') {
      if (i >= 0 || !idOk(op.id) || l.length >= LIM.lista) return nada;
      const v = umDe(Object.assign({}, op, { t: undefined }));
      if (!v) return nada;
      l.push(v);
      return { lista: l, mudou: true, a: v, antes: null, depois: faixa(v.nec) };
    }
    if (i < 0) return nada;
    const antes = l[i], v = Object.assign({}, antes);
    if (op.t === 'tirar') { l.splice(i, 1); return { lista: l, mudou: true, a: null }; }
    if (op.t === 'nec') { const d = Number(op.d); if (!Number.isFinite(d) || !d) return nada; v.nec = antes.nec + d; }
    else if (op.t === 'cumprir') { const d = op.d == null ? antes.bx : Number(op.d); if (!Number.isFinite(d) || d <= 0) return nada; v.nec = antes.nec - d; }
    else if (op.t === 'oc') v.oc = !!op.v;
    else if (op.t === 'editar') { for (const k of ['n', 'd', 'g', 'rit', 'bx', 'nec', 'oc']) if (op[k] !== undefined) v[k] = op[k]; }
    else return nada;
    const b = umDe(v);
    if (JSON.stringify(b) === JSON.stringify(antes)) return nada;
    l[i] = b;
    return { lista: l, mudou: true, a: b, antes: faixa(antes.nec), depois: faixa(b.nec) };
  }

  /* Os dias passaram: cada vício soma o ritmo × os dias desde o último dia contado (até 10). dia: o dia do mundo de
     agora (os dias desde o começo do mapa); mp: o mapa. O vício que nunca contou (ou que contava por outro mapa), ou
     quando o dia voltou (o mestre desfez), só guarda o dia de agora, sem somar.
     → { lista, mudou, subiram: [{ id, n, de (faixa), para (faixa) }] } — não altera o que recebeu. */
  function avancar(lista, dia, mp) {
    const l = norm(lista), hoje = inteiro(dia), subiram = [];
    if (hoje == null) return { lista: l, mudou: false, subiram };
    let mudou = false;
    const out = l.map(v => {
      const mesmoMapa = (v.mp || '') === (mp || '');
      if (v.dia == null || !mesmoMapa || hoje < v.dia) {
        if (v.dia === hoje && mesmoMapa) return v;
        mudou = true;
        const w = Object.assign({}, v, { dia: hoje });
        if (mp) w.mp = mp; else delete w.mp;
        return umDe(w);
      }
      if (hoje === v.dia) return v;
      mudou = true;
      const de = faixa(v.nec), w = umDe(Object.assign({}, v, { dia: hoje, nec: v.nec + v.rit * (hoje - v.dia) })), para = faixa(w.nec);
      if (para.i > de.i) subiram.push({ id: v.id, n: v.n, de, para });
      return w;
    });
    return { lista: out, mudou, subiram };
  }

  /* ---------- a biblioteca de moldes ---------- */
  const chave = n => String(n == null ? '' : n).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  function moldeDe(x) {
    if (!ehObj(x) || !idOk(x.id)) return null;
    const v = umDe(Object.assign({}, x, { nec: 0, oc: false, dia: null }));
    return v && { id: v.id, n: v.n, d: v.d, rit: v.rit, bx: v.bx };
  }
  function normBib(lista) {
    const out = [], vistos = new Set();
    for (const x of Array.isArray(lista) ? lista : []) {
      const mo = moldeDe(x);
      if (!mo || vistos.has(mo.id) || out.length >= LIM.bib) continue;
      vistos.add(mo.id); out.push(mo);
    }
    return out.sort((a, b) => a.n.localeCompare(b.n, 'pt'));
  }
  const moldeDoVicio = (v, id) => moldeDe(Object.assign({}, v, { id }));
  const MOLDE = ['n', 'd', 'rit', 'bx'];
  const mesmoMolde = (v, mo) => MOLDE.every(k => JSON.stringify(v[k]) === JSON.stringify(mo[k]));
  // o molde vale para todos os vícios ligados a ele (a necessidade de cada um fica)
  function aplicarMolde(lista, molde) {
    const mo = moldeDe(molde), l = norm(lista);
    if (!mo) return { lista: l, mudou: false };
    let mudou = false;
    const out = l.map(v => {
      if (v.m !== mo.id || mesmoMolde(v, mo)) return v;
      mudou = true;
      return umDe(Object.assign({}, v, { n: mo.n, d: mo.d, rit: mo.rit, bx: mo.bx }));
    });
    return { lista: out, mudou };
  }
  // um vício novo a partir de um molde: necessidade 0, contando a partir de hoje
  function doMolde(molde, id, extra) {
    const mo = moldeDe(molde);
    return mo && idOk(id) ? umDe(Object.assign({ nec: 0 }, extra || {}, { id, m: mo.id, n: mo.n, d: mo.d, rit: mo.rit, bx: mo.bx })) : null;
  }
  function usos(listas) {
    const out = {};
    for (const pid of Object.keys(ehObj(listas) ? listas : {})) for (const v of norm(listas[pid])) if (v.m) (out[v.m] = out[v.m] || []).push(pid);
    return out;
  }

  const API = { LIM, PADRAO, FAIXAS, GRAUS, grau, grauOk, norm, faixa, alta, altos, num, textoRitmo, publica, doJogador, conta, mudar, avancar,
    chave, moldeDe, normBib, moldeDoVicio, mesmoMolde, aplicarMolde, doMolde, usos };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { root.TC = root.TC || {}; root.TC.vicios = API; }
})(typeof window !== 'undefined' ? window : globalThis);
