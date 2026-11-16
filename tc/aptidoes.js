/* =======================================================================
   TC.aptidoes — as aptidões de cada personagem (lote 131). Lógica pura (Node e navegador).

   Uma aptidão é algo que o personagem faz cada vez melhor com a prática: Furtividade, Rastreio, Escalada, Pescar…
   Só o mestre cria, uma a uma, ficha por ficha. Cada uma tem:
     id, n (o nome), d (uma descrição curta), nv (o nível), teto (o nível mais alto),
     xp (a barrinha secreta), max (o XP para subir), tx { nível: texto } (o que cada nível dá), oc (secreta)
   A barra enche como a de XP do personagem: o mestre clica +1/+5 ou escreve "+15 -4". Cheia, aparece "Subir de nível":
   o nível sobe, o que passou do máximo fica na barra.

   (lote 171) A biblioteca de moldes: toda aptidão nasce de um molde { id, n, d, teto, max, tx } (o nome, a descrição, o
   nível máximo, o XP para subir e o texto de cada nível). O molde fica guardado (segredos.aptBib) mesmo se a ficha
   sumir, e serve para pôr a mesma aptidão em outra ficha (começa no nível 1, com a barra vazia). As cópias ficam ligadas
   pelo campo m (o id do molde): mudar o texto numa ficha muda o molde e as outras fichas — o nível, a barra e o "secreta"
   de cada uma não mudam.

   Onde fica:
     segredos.apt[personagem]   a lista inteira (em fichas:segredos, que só quem mestra recebe)
     estado.apt                 o que o jogador vê: [{ id, n, d, nv }] das que não são secretas — sem a barra e sem o
                                texto do nível. Fora de uma mesa, a lista inteira mora aqui.

     navegador   <script src="../tc/aptidoes.js"></script> → window.TC.aptidoes
     Node        const A = require('./tc/aptidoes.js')
   ======================================================================= */
(function (root) {
  'use strict';
  const LIM = Object.freeze({ nome: 60, desc: 400, texto: 400, lista: 60, teto: 20, max: 99999 });
  const PADRAO = Object.freeze({ max: 10, teto: 5 });
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const idOk = k => typeof k === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(k);
  const txt = (x, n) => String(x == null ? '' : x).replace(/\r/g, '').trim().slice(0, n);
  const int = (v, a, b, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d; };
  const copia = x => JSON.parse(JSON.stringify(x));

  function umaDe(x) {
    if (!ehObj(x) || !idOk(x.id)) return null;
    const teto = int(x.teto, 1, LIM.teto, PADRAO.teto), nv = int(x.nv, 1, teto, 1);
    const tx = {};
    if (ehObj(x.tx)) for (const k of Object.keys(x.tx)) { const i = int(k, 1, teto, 0), t = txt(x.tx[k], LIM.texto); if (i && t && String(i) === k) tx[k] = t; }
    const a = { id: x.id, n: txt(x.n, LIM.nome) || 'Aptidão', d: txt(x.d, LIM.desc), nv, teto,
      xp: int(x.xp, 0, LIM.max * 10, 0), max: int(x.max, 1, LIM.max, PADRAO.max), tx, oc: !!x.oc };
    if (idOk(x.m)) a.m = x.m;
    return a;
  }
  // a lista arrumada (sem repetidos, no máximo LIM.lista)
  function norm(lista) {
    const out = [], vistos = new Set();
    for (const x of Array.isArray(lista) ? lista : []) {
      const a = umaDe(x);
      if (!a || vistos.has(a.id) || out.length >= LIM.lista) continue;
      vistos.add(a.id); out.push(a);
    }
    return out;
  }
  // o que o jogador vê (estado.apt): só as que não são secretas, sem a barra e sem o texto do nível
  const publica = lista => norm(lista).filter(a => !a.oc).map(a => ({ id: a.id, n: a.n, d: a.d, nv: a.nv }));
  // a lista que o jogador recebeu (estado.apt), lida com cuidado: só nome, descrição e nível
  const doJogador = estado => (ehObj(estado) && Array.isArray(estado.apt) ? estado.apt : [])
    .filter(x => ehObj(x) && idOk(x.id)).slice(0, LIM.lista)
    .map(x => ({ id: x.id, n: txt(x.n, LIM.nome) || 'Aptidão', d: txt(x.d, LIM.desc), nv: int(x.nv, 1, LIM.teto, 1) }));

  const noTeto = a => a.nv >= a.teto;
  const pronta = a => !!a && !noTeto(a) && a.xp >= a.max;
  const prontas = lista => norm(lista).filter(pronta);
  // a barra: 0 a 1 (no teto, cheia)
  const fracao = a => (noTeto(a) ? 1 : Math.max(0, Math.min(1, a.xp / a.max)));
  const textoDoNivel = (a, nv) => (a && a.tx && a.tx[String(nv == null ? a.nv : nv)]) || '';

  /* "+15 -4", "15", "-3", "+2+2": a soma (um número sem sinal soma). null: não é uma conta dessas. */
  function conta(s) {
    const t = String(s == null ? '' : s).replace(/\s+/g, '').replace(/−/g, '-');
    if (!/^[+-]?\d{1,6}([+-]\d{1,6})*$/.test(t)) return null;
    return (t.match(/[+-]?\d+/g) || []).reduce((s2, n) => s2 + Number(n), 0);
  }

  /* Uma mudança na lista. op:
       { t: 'nova', id, n, d, max, teto, nv, oc, tx }      cria (no fim)
       { t: 'editar', id, n?, d?, max?, teto?, nv?, oc?, tx? }
       { t: 'xp', id, d }                                  soma d na barra (não fica abaixo de 0)
       { t: 'subir', id }                                  com a barra cheia: +1 nível, o que passou fica
       { t: 'oc', id, v }                                  secreta (true) ou à mostra
       { t: 'tirar', id }
     → { lista, mudou, pronta (a barra acabou de encher), a (a aptidão depois) } — não altera o que recebeu. */
  function mudar(lista, op) {
    const l = norm(lista), i = op && idOk(op.id) ? l.findIndex(a => a.id === op.id) : -1, nada = { lista: l, mudou: false, pronta: false, a: i >= 0 ? l[i] : null };
    if (!ehObj(op)) return nada;
    if (op.t === 'nova') {
      if (i >= 0 || !idOk(op.id) || l.length >= LIM.lista) return nada;
      const a = umaDe(Object.assign({ xp: 0 }, op, { t: undefined }));
      if (!a) return nada;
      l.push(a);
      return { lista: l, mudou: true, pronta: false, a };
    }
    if (i < 0) return nada;
    const antes = l[i], a = copia(antes);
    if (op.t === 'tirar') { l.splice(i, 1); return { lista: l, mudou: true, pronta: false, a: null }; }
    if (op.t === 'xp') { const d = Math.round(Number(op.d)); if (!Number.isFinite(d) || !d) return nada; a.xp = Math.max(0, a.xp + d); }
    else if (op.t === 'subir') { if (!pronta(a)) return nada; a.xp -= a.max; a.nv += 1; }
    else if (op.t === 'oc') a.oc = !!op.v;
    else if (op.t === 'editar') { for (const k of ['n', 'd', 'max', 'teto', 'nv', 'oc', 'tx', 'xp']) if (op[k] !== undefined) a[k] = op[k]; }
    else return nada;
    const b = umaDe(a);
    if (JSON.stringify(b) === JSON.stringify(antes)) return nada;
    l[i] = b;
    return { lista: l, mudou: true, pronta: pronta(b) && !pronta(antes), a: b };
  }

  /* ---------- (lote 171) a biblioteca de moldes ---------- */
  const LIM_BIB = 300;
  const chave = n => String(n == null ? '' : n).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  // um molde arrumado (as mesmas regras de uma aptidão, sem nível, barra nem "secreta")
  function moldeDe(x) {
    if (!ehObj(x) || !idOk(x.id)) return null;
    const a = umaDe(Object.assign({}, x, { nv: 1, xp: 0, oc: false }));
    return a && { id: a.id, n: a.n, d: a.d, teto: a.teto, max: a.max, tx: a.tx };
  }
  function normBib(lista) {
    const out = [], vistos = new Set();
    for (const x of Array.isArray(lista) ? lista : []) {
      const mo = moldeDe(x);
      if (!mo || vistos.has(mo.id) || out.length >= LIM_BIB) continue;
      vistos.add(mo.id); out.push(mo);
    }
    return out.sort((a, b) => a.n.localeCompare(b.n, 'pt'));
  }
  // o molde de uma aptidão de ficha (com o id que se der)
  const moldeDaAptidao = (a, id) => moldeDe(Object.assign({}, a, { id }));
  const MOLDE = ['n', 'd', 'teto', 'max', 'tx'];
  const mesmoMolde = (a, mo) => MOLDE.every(k => JSON.stringify(a[k]) === JSON.stringify(mo[k]));
  // põe o molde em todas as aptidões da lista ligadas a ele (o nível fica no novo teto, no máximo) → { lista, mudou }
  function aplicarMolde(lista, molde) {
    const mo = moldeDe(molde), l = norm(lista);
    if (!mo) return { lista: l, mudou: false };
    let mudou = false;
    const out = l.map(a => {
      if (a.m !== mo.id || mesmoMolde(a, mo)) return a;
      mudou = true;
      return umaDe(Object.assign({}, a, { n: mo.n, d: mo.d, teto: mo.teto, max: mo.max, tx: mo.tx }));
    });
    return { lista: out, mudou };
  }
  // uma aptidão nova a partir de um molde: nível 1, barra vazia, ligada ao molde
  function doMolde(molde, id, oc) {
    const mo = moldeDe(molde);
    return mo && idOk(id) ? umaDe({ id, m: mo.id, n: mo.n, d: mo.d, teto: mo.teto, max: mo.max, tx: mo.tx, nv: 1, xp: 0, oc: !!oc }) : null;
  }
  /* Guardar na biblioteca as aptidões das fichas que ainda não têm molde (ou cujo molde sumiu): uma com o mesmo nome de
     um molde já guardado se liga a ele; senão, nasce um molde novo (o primeiro texto que aparecer). novoId() dá os ids.
     listas: { personagem: [aptidões] } → { bib, listas (só as que mudaram), mudou } — não altera o que recebeu. */
  function semear(bib, listas, novoId) {
    const b = normBib(bib), porNome = new Map(b.map(mo => [chave(mo.n), mo])), ids = new Set(b.map(mo => mo.id)), mudaram = {};
    let mudou = false;
    for (const pid of Object.keys(ehObj(listas) ? listas : {})) {
      let trocou = false;
      const l = norm(listas[pid]).map(a => {
        if (a.m && ids.has(a.m)) return a;
        let mo = porNome.get(chave(a.n));
        if (!mo) {
          mo = moldeDaAptidao(a, novoId());
          if (!mo) return a;
          b.push(mo); porNome.set(chave(mo.n), mo); ids.add(mo.id); mudou = true;
        }
        trocou = true;
        return Object.assign({}, a, { m: mo.id });
      });
      if (trocou) { mudaram[pid] = l; mudou = true; }
    }
    return { bib: normBib(b), listas: mudaram, mudou };
  }
  // quantas fichas usam cada molde: { molde: [personagem, ...] }
  function usos(listas) {
    const out = {};
    for (const pid of Object.keys(ehObj(listas) ? listas : {})) for (const a of norm(listas[pid])) if (a.m) (out[a.m] = out[a.m] || []).push(pid);
    return out;
  }

  const API = { LIM, PADRAO, norm, publica, doJogador, pronta, prontas, noTeto, fracao, textoDoNivel, conta, mudar,
    LIM_BIB, chave, moldeDe, normBib, moldeDaAptidao, mesmoMolde, aplicarMolde, doMolde, semear, usos };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { root.TC = root.TC || {}; root.TC.aptidoes = API; }
})(typeof window !== 'undefined' ? window : globalThis);
