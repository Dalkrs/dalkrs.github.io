/* ---------------------------------------------------------------
   7b. FICHAS — o token ligado à ficha do personagem
   Só existe dentro do site, com uma mesa aberta (a ponte entrega os personagens da mesa).
   O token aponta para um personagem (t.char). A ficha manda: cada recurso dela (HP, SP…) vira uma
   barra do token, com o máximo calculado pelas fórmulas e o valor atual (e a sobrevida) anotados na ficha;
   o bônus de iniciativa vem da fórmula de iniciativa da ficha, quando ela tem uma; e a imagem do
   personagem vira a imagem do token (a não ser que o mestre escolha outra para este token).
   Na volta, mexer numa dessas barras no mapa (dano, cura, área, reaplicar, desfazer) grava o valor
   atual na ficha. Também dá para rolar um atributo da ficha direto do token, com a regra da fixa.
   A barra leva da ficha, além do máximo, o piso (até quanto abaixo de zero ela pode ir) e o começo
   (onde ela nasce; a cura total a leva para lá). E as bolsas da ficha (poções, bombas, runas, munições,
   materiais) podem ser usadas daqui: pelo mestre, em qualquer token ligado, e pelo jogador, no token do
   personagem dele — quem usa grava direto na ficha, e a ficha acerta o token.
   Os ferimentos abertos do personagem (marcados na ficha, no quadro "Corpo") aparecem no token como um sinal,
   e em lista no painel dele — para quem recebe a ficha: o mestre, todas; o jogador, a dele e as abertas a todos.
   A penalidade de um ferimento conta nas contas da ficha como um bônus temporário.
   --------------------------------------------------------------- */
const Fichas = (() => {
  let P = null, D = null, on = false, applying = false, papel = null, eu = null;
  const R = () => window.TC.rules;
  const ROLAVEIS = ['FOR', 'DES', 'VIT', 'CAN', 'AGI', 'ESQ', 'FUR', 'PER', 'EMB', 'DFF', 'DFM', 'BLQ'];
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const cfg = () => { const d = D && D.pegar('fichas:cfg'); return (d && d.dados && d.dados.v) || R().cfgPadrao(); };
  const get = id => (P && id ? P.pegar(id) : null);
  /* As fichas da mesa, por nome. Numa mesa com campanhas, "campanha em evidência": primeiro as da campanha em vista,
     depois as do mundo (sem campanha) e por fim as das outras campanhas — estas duas com o lugar de onde são no rótulo. */
  const vista = () => { const T = window.TC && window.TC.ponte, c = T && T.estado && T.estado.campanha; return c ? c.id : null; };
  const campDa = l => (l && l.campanha) || null;
  const pesoDa = l => { const v = vista(), c = campDa(l); return !v || c === v ? 0 : !c ? 1 : 2; };
  const chars = () => (P ? P.todas().slice().sort((a, b) => (pesoDa(a) - pesoDa(b)) || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')) : []);
  const nomeDaCampanha = id => { const T = window.TC && window.TC.ponte, c = T && T.estado && (T.estado.campanhas || []).find(x => x.id === id); return c ? c.nome : 'outra campanha'; };
  // o nome da ficha onde se escolhe uma: as de fora da campanha em vista dizem de onde são
  const rotulo = l => (l.nome || 'Sem nome') + (pesoDa(l) === 1 ? ' — do mundo' : pesoDa(l) === 2 ? ' — ' + nomeDaCampanha(campDa(l)) : '');
  const pcDe = l => Object.assign({}, l.ficha || {}, { id: l.id, nome: l.nome });
  // a imagem do personagem, quando está guardada no banco (endereço https)
  const imagemDe = l => (l && l.ficha && typeof l.ficha.img === 'string' && /^https:\/\//.test(l.ficha.img) ? l.ficha.img : null);
  // bônus dos nódulos escolhidos na árvore (a biblioteca da mesa, para quem mestra a aba Árvore; para os outros, o
  // pacote publicado — o mestre auxiliar pode mestrar as Cenas sem a Árvore, e aí a biblioteca não chega a ele)
  const mestraArvore = () => { const T = window.TC && window.TC.ponte; return T && typeof T.mestra === 'function' ? T.mestra('arvore') : papel === 'mestre'; };
  const bib = () => { const d = D && D.pegar(mestraArvore() ? 'arvore:biblioteca' : 'arvore:pacote'); return d && d.dados && Array.isArray(d.dados.arvores) ? d.dados : null; };
  // (os bônus temporários — comida, poção — moram no estado do personagem e contam como um equipamento)
  const extra = l => ({ arvore: R().bonusDaArvore(l.skills, bib()), temp: l.estado && l.estado.tmp, fer: l.estado && l.estado.fer });
  const resumo = l => R().resumo(pcDe(l), cfg(), extra(l), l.estado || {});

  // O piso da barra (quanto ela pode ficar negativa) e o começo dela, como a ficha manda.
  const pisoDe = rec => (rec.min < 0 ? Math.round(-rec.min * 10) / 10 : 0);
  const comecoDe = rec => (rec.inicio != null && isFinite(rec.inicio) && rec.inicio !== rec.max ? rec.inicio : null);
  /* As barras especiais da ficha (os antigos "poderes divinos": cargas, usos…) também vão para o token, em bolinhas.
     Cada uma vira um "recurso" a mais, com id "pd:<id>" — só as que têm limite (sem limite não há barra para desenhar).
     O valor de agora delas mora no estado da ficha (estado.pd), e é para lá que o token devolve. */
  const PD = 'pd:';
  const ehPd = ref => typeof ref === 'string' && ref.startsWith(PD);
  function especiaisDe(l) {
    const R0 = R();
    if (!R0 || typeof R0.especiais !== 'function') return [];
    return R0.especiais(l.ficha || {}, l.estado || {}).filter(x => x.max > 0).map(x => ({ id: PD + x.id, nome: x.nome, max: x.max, min: 0, inicio: x.inicio != null ? x.inicio : null, atual: x.atual, sobre: 0, pts: true }));
  }
  // os recursos da ficha que viram barra no token: os de sempre (com máximo) e, depois deles, as barras especiais
  const recursosDoToken = (l, r) => r.recursos.filter(rec => rec.max != null && isFinite(rec.max)).concat(especiaisDe(l));
  /* (lote 34) A barra do token que serve a este recurso: a ligada a ele; ou a da barra especial que virou este recurso
     (a raça e a classe trazem barra comum agora: a especial de antes, com o mesmo id, sai da ficha); ou uma solta com o
     mesmo nome. */
  const barraDoRec = (bars, rec, lista) => bars.find(x => x.ref === rec.id)
    || (!ehPd(rec.id) && bars.find(x => x.ref === PD + rec.id && !lista.some(y => y.id === x.ref)))
    || bars.find(x => !x.ref && norm(x.n) === norm(rec.nome));
  /* (lote 34) A barra de raça, classe ou linhagem que chega ao token (nova, ou a especial que virou comum) entra no
     lugar dela na ficha — logo depois da barra do recurso que vem antes (o HP e o SP) —, não no fim. */
  function porNoLugar(bars, b, lista, rec) {
    const i0 = bars.indexOf(b);
    const k = lista.indexOf(rec);
    let p = -1;
    for (let j = k - 1; j >= 0 && p < 0; j--) p = bars.findIndex(x => x !== b && x.ref === lista[j].id);
    const alvo = p >= 0 ? p + 1 : (k === 0 ? 0 : -1);
    if (alvo < 0) return false;
    if (i0 >= 0) bars.splice(i0, 1);
    const pos = i0 >= 0 && i0 < alvo ? alvo - 1 : alvo;
    if (i0 === pos) { bars.splice(i0, 0, b); return false; }
    bars.splice(pos, 0, b);
    return true;
  }
  const deArvore = (l, id) => !!l && !!l.ficha && Array.isArray(l.ficha.recursos) && l.ficha.recursos.some(x => x && x.id === id && Array.isArray(x.arvs) && x.arvs.length);
  // As barras do token, atualizadas pela ficha. Devolve null se nada muda.
  function barrasDe(t, r, l) {
    const bars = t.bars.map(b => Object.assign({}, b));
    let mudou = false;
    const lista = recursosDoToken(l, r);
    for (const rec of lista) {
      let b = barraDoRec(bars, rec, lista);
      if (b && b.ref === PD + rec.id) { b.k = rec.pts ? 'pts' : 'bar'; mudou = true; if (deArvore(l, rec.id)) porNoLugar(bars, b, lista, rec); }      // (a especial vira barra comum)
      if (!b) {
        if (bars.length >= MAX_BARS) continue;
        b = cleanBar({ n: rec.nome, c: BAR_COLORS[bars.length % BAR_COLORS.length], v: rec.atual, m: rec.max, k: rec.pts ? 'pts' : 'bar', on: true, vis: '' });
        bars.push(b); mudou = true;
        if (deArvore(l, rec.id)) porNoLugar(bars, b, lista, rec);
      }
      const nome = String(rec.nome || 'Barra').slice(0, 24);
      if (b.ref !== rec.id) { b.ref = rec.id; mudou = true; }
      if (b.n !== nome) { b.n = nome; mudou = true; }
      if (b.m !== rec.max) { b.m = rec.max; mudou = true; }
      if (b.v !== rec.atual) { b.v = rec.atual; mudou = true; }
      const sx = Math.max(0, Number(rec.sobre) || 0);
      if (barX(b) !== sx) { if (sx > 0) b.x = sx; else delete b.x; mudou = true; }
      const lo = pisoDe(rec), st = comecoDe(rec);
      if (barLo(b) !== lo) { if (lo > 0) b.lo = lo; else delete b.lo; mudou = true; }
      if ((b.st == null ? null : b.st) !== st) { if (st == null) delete b.st; else b.st = st; mudou = true; }
      // (lote 8) a ferida permanente: o que apodreceu na ponta da barra (estado.podre)
      const pz = Math.max(0, Number(rec.podre) || 0);
      if (barPod(b) !== pz) { if (pz > 0) b.pod = Math.round(Math.min(pz, b.m) * 10) / 10; else delete b.pod; mudou = true; }
    }
    for (const b of bars) if (b.ref && !lista.some(x => x.id === b.ref)) { delete b.ref; mudou = true; }   // recurso saiu da ficha: vira barra comum
    return mudou ? bars : null;
  }
  /* As barras de um token que segue uma ficha são as da ficha, na ordem dela: cada recurso com máximo vira uma barra
     ligada, à mostra. Uma barra que o token já tinha do mesmo recurso — ou com o mesmo nome — empresta o jeito dela
     (cor, estilo, quem vê); as outras saem (a "Vida" de fábrica, por exemplo). Devolve null se a ficha não tem
     recurso nenhum: aí o token fica como está. */
  function soDaFicha(t, r, l) {
    const out = [], lista = recursosDoToken(l, r);
    for (const rec of lista) {
      if (out.length >= MAX_BARS) continue;
      let velha = barraDoRec(t.bars, rec, lista);
      if (velha && velha.ref === PD + rec.id) velha = Object.assign({}, velha, { k: rec.pts ? 'pts' : 'bar' });
      out.push(cleanBar(Object.assign({ c: BAR_COLORS[out.length % BAR_COLORS.length], k: rec.pts ? 'pts' : 'bar' }, velha,
        { n: String(rec.nome || 'Barra').slice(0, 24), v: rec.atual, m: rec.max, on: true, ref: rec.id, x: Math.max(0, Number(rec.sobre) || 0), lo: pisoDe(rec), st: comecoDe(rec), pod: Math.max(0, Number(rec.podre) || 0) })));
    }
    return out.length ? out : null;
  }
  // A ficha inteira deste token, se ela está aqui (uma linha que chegou incompleta não serve para acertar nada).
  const fichaDe = t => { const l = get(t.char); return l && l.ficha != null ? l : null; };
  /* (lote 34) As barras de raça, classe e linhagem do token (de uma ficha): [{ i (a barra no token), ref, nome, v (agora),
     inicio (com o que os nós somam), iniArv, min, max, comb ('inicio' | 'fica' | 'pergunta'), arvs }]. */
  function barrasDeArvore(t) {
    const l = t && t.char ? fichaDe(t) : null;
    if (!l || !R() || !Array.isArray(l.ficha.recursos)) return [];
    let c = null;
    try { c = R().calcular(pcDe(l), cfg(), extra(l)); } catch (e) { return []; }
    const out = [];
    (t.bars || []).forEach((b, i) => {
      if (!b || !b.ref || ehPd(b.ref)) return;
      const rec = l.ficha.recursos.find(x => x && x.id === b.ref);
      if (!rec || !Array.isArray(rec.arvs) || !rec.arvs.length) return;
      const k = (c.recursos || []).find(x => x.id === rec.id) || {};
      if (k.max == null || !isFinite(k.max)) return;
      out.push({ i, ref: rec.id, nome: b.n || rec.nome, v: Number(b.v) || 0, inicio: k.inicio == null ? k.max : k.inicio, iniArv: k.iniArv || 0, min: Math.min(0, Number(k.min) || 0), max: k.max,
        comb: ['inicio', 'fica', 'pergunta'].includes(rec.comb) ? rec.comb : 'inicio', arvs: rec.arvs.slice(), base: k.inicio == null ? k.max : Math.max(Math.min(0, Number(k.min) || 0), Math.min(k.max, Number(rec.comeca) || 0)) });
    });
    return out;
  }
  /* (lote 29) O token ligado ao Bestiário (t.best: o id do inimigo): os números, as defesas e as rolagens vêm do
     Bestiário (uma linha "de mentira", como a de uma ficha, sem estado); as barras moram no token. Numa mesa, o
     documento best:i:<id> (só o mestre o recebe); fora de uma mesa, o Bestiário deste navegador. */
  const BEST_LOCAL = 'tinycats:bestiario:local';
  let bestLocal = null;                  // { docs } — lido uma vez e de novo quando o Bestiário (outra aba) muda
  const bestCache = new Map();           // id → { src, l }
  function bestDados(id) {
    if (D) { const d = D.pegar('best:i:' + id); return d && !d.apagado && d.dados && typeof d.dados === 'object' ? d.dados : null; }
    if (!bestLocal) {
      let docs = {};
      try { const o = JSON.parse(localStorage.getItem(BEST_LOCAL) || 'null'); if (o && o.docs && typeof o.docs === 'object') docs = o.docs; } catch (e) { /* sem armazenamento */ }
      bestLocal = { docs };
    }
    const x = bestLocal.docs['best:i:' + id];
    return x && typeof x === 'object' ? x : null;
  }
  try { window.addEventListener('storage', ev => { if (ev.key === BEST_LOCAL || ev.key === null) { bestLocal = null; bestCache.clear(); } }); } catch (e) { /* sem janela */ }
  // → a linha do inimigo ({ id, nome, ficha, skills, estado: {}, best: true, e: o inimigo arrumado }) ou null
  function linhaBest(id) {
    const B = window.TC && window.TC.bestiario;
    if (!B || !R() || typeof id !== 'string' || !id) return null;
    const src = bestDados(id);
    if (!src) return null;
    const g = bestCache.get(id);
    if (g && g.src === src) return g.l;
    let l = null;
    try { const e = B.normalizar(src); l = Object.assign(B.linhaDe(e, id), { e }); } catch (er) { console.error(er); l = null; }
    bestCache.set(id, { src, l });
    return l;
  }
  /* (lote 33) O inimigo deste token, com o equipamento que ESTE token está usando: o Bestiário diz como ele vem; na cena,
     cada token troca as peças sem mexer nos outros (t.bestEq: { idDaPeça: equipado }). */
  const tokCache = new Map();            // id do token → { base, chave, l }
  function linhaBestTok(t) {
    const base = t && t.best ? linhaBest(t.best) : null;
    const itens = base && Array.isArray(base.ficha.itens) ? base.ficha.itens : [];
    if (!base || !t.bestEq || !itens.length) return base;
    const chave = JSON.stringify(t.bestEq), g = tokCache.get(t.id);
    if (g && g.base === base && g.chave === chave) return g.l;
    const novos = itens.map(it => (Object.prototype.hasOwnProperty.call(t.bestEq, it.id) ? Object.assign({}, it, { equipado: !!t.bestEq[it.id] }) : it));
    const l = Object.assign({}, base, { ficha: Object.assign({}, base.ficha, { itens: novos }), e: Object.assign({}, base.e, { ficha: Object.assign({}, base.e.ficha, { itens: novos }) }) });
    tokCache.set(t.id, { base, chave, l });
    return l;
  }
  // as contas deste token do Bestiário (com o equipamento dele)
  function contasTok(t) {
    const l = linhaBestTok(t), B = window.TC && window.TC.bestiario;
    if (!l || !B) return null;
    try { return B.contas(l.e, cfg(), bib()); } catch (e) { console.error(e); return null; }
  }
  // a linha que responde por este token: a ficha (t.char) ou o inimigo do Bestiário (t.best)
  const linhaDoTok = t => (!t ? null : t.char ? get(t.char) : t.best ? linhaBestTok(t) : null);
  // o token tem de onde tirar os números aqui? (a ficha que chegou, ou o inimigo do Bestiário)
  const ligado = t => { const l = linhaDoTok(t); return !!l && l.ficha != null; };
  // as contas do inimigo (as barras, a iniciativa…) com as regras e a árvore desta mesa
  function contasBest(id) {
    const l = linhaBest(id), B = window.TC && window.TC.bestiario;
    if (!l || !B) return null;
    try { return B.contas(l.e, cfg(), bib()); } catch (e) { console.error(e); return null; }
  }
  /* Um token novo para um inimigo do Bestiário: o nome, o tamanho, a cor, a imagem, as barras (cheias, ou no começo de
     cada uma) e a iniciativa. Não entra na cena aqui (quem chama é que o inclui). */
  function novoTokenBest(sc, id, x, y, extra) {
    const l = linhaBest(id), c = contasBest(id);
    if (!l || !c) return null;
    const e = l.e;
    const t = newToken(sc, x, y, Object.assign({ name: String(e.nome || 'Inimigo').trim().slice(0, 60) || 'Inimigo', best: id, size: [0.5, 1, 2, 3, 4].includes(e.tam) ? e.tam : 1 }, e.cor ? { color: e.cor } : null, extra || {}));
    const bars = c.barras.slice(0, MAX_BARS).map((b, i) => cleanBar({ n: String(b.n || 'Barra').slice(0, 24), c: BAR_COLORS[i % BAR_COLORS.length], v: b.v, m: b.m, on: true, vis: '', lo: b.lo || 0, st: b.st }));
    if (bars.length) t.bars = bars;
    if (String(e.ficha.ini || '').trim() !== '') t.ini = clampIni(c.ini);
    if (typeof e.img === 'string' && /^(https:\/\/|data:image\/)/.test(e.img)) { const a = Assets.register(e.img, 0, 0, 'token', e.nome || ''); t.img = a.id; }
    return t;
  }
  // O token ligado tem barras que não são da ficha, ou falta alguma dela?
  function foraDaFicha(t) {
    const l = fichaDe(t), alvo = l ? soDaFicha(t, resumo(l), l) : null;
    return !!alvo && (alvo.length !== t.bars.length || !t.bars.every(b => b.ref && alvo.some(a => a.ref === b.ref)));
  }
  // Deixa o token só com as barras da ficha (um passo de desfazer).
  function usarBarras(t) {
    const l = fichaDe(t), bars = l ? soDaFicha(t, resumo(l), l) : null;
    if (!bars) return false;
    Store.tx('Barras da ficha', () => Store.upd('tokens', t.id, { bars }));
    return true;
  }
  // O que a ficha muda no token (barras, iniciativa, imagem); null se nada.
  function remendo(t) {
    const l = fichaDe(t);
    if (!l) return null;
    const r = resumo(l), p = {};
    const bars = barrasDe(t, r, l);
    if (bars) p.bars = bars;
    if (String((l.ficha && l.ficha.ini) || '').trim() !== '' && clampIni(r.ini) !== t.ini) p.ini = clampIni(r.ini);
    // a fadiga (a pilha de 5 a 0), quando a ficha usa: vai para o token, e todos a veem (até quem não tem a ficha)
    const fd = fadigaDe(l);
    if ((t.fad == null ? null : t.fad) !== fd) p.fad = fd;
    // a imagem da ficha vai para o token (imgChar marca que a imagem dele é a da ficha; uma escolhida à mão fica)
    const url = imagemDe(l);
    if (url) {
      const a = Assets.register(url, 0, 0, 'token', l.nome || '');
      if (t.img !== a.id && (!t.img || t.imgChar)) { p.img = a.id; p.imgChar = true; }
      else if (t.img === a.id && !t.imgChar) p.imgChar = true;
    } else if (t.imgChar) { p.img = null; p.imgChar = false; }
    return Object.keys(p).length ? p : null;
  }
  const falta = t => !!remendo(t);
  // ficha → token (não entra no desfazer: quem manda é a ficha). `cena`: o id da cena do token (a aberta, se não vier).
  function syncToken(t, cena) {
    const p = remendo(t);
    if (!p) return false;
    /* O mestre com o site aberto em mais de um aparelho: a cena que está no ar é acertada pelo aparelho que
       transmite. Este acompanha (e assume, se depois de alguns segundos ainda faltar: ver Nuvem.cobrar). */
    if (Nuvem.segue(cena || Store.S.current)) { Nuvem.cobrar(); return false; }
    applying = true;
    try { Store.remoteIn(cena || Store.S.current, [{ t: 'upd', c: 'tokens', id: t.id, p }]); } finally { applying = false; }
    return true;
  }
  /* Acerta pela ficha os tokens ligados (de um personagem, ou de todos): os da cena aberta e, numa mesa, também os
     da cena que está no ar — os jogadores veem a barra mudar mesmo com o mestre preparando outra cena. */
  function syncAll(charId) {
    if (!on) return;
    let n = 0;
    const cenas = [Store.scene()], ar = Nuvem.noAr();
    if (ar && ar !== Store.S.current && Store.S.scenes[ar]) cenas.push(Store.S.scenes[ar]);
    // (lote 8: as cópias de um Clone ficam fora — elas seguem o real, não a ficha)
    for (const sc of cenas) for (const t of sc.tokens.slice()) if (t.char && !t.clone && (!charId || t.char === charId) && syncToken(t, sc.id)) n++;
    return n;
  }
  /* Quem mestra as Cenas recebe todas as fichas da mesa? O mestre, sim. O mestre auxiliar, só com a aba Fichas: sem
     ela, as fichas escondidas dos jogadores não chegam a ele — mas os tokens ligados a elas estão na cena. */
  const vejoTodas = () => { const T = window.TC && window.TC.ponte; return papel === 'mestre' && (!T || typeof T.mestra !== 'function' || T.mestra('fichas')); };
  // a ficha deste token existe mas não chega a quem está olhando (e não "saiu da mesa")
  const escondida = t => !!t && !!t.char && papel === 'mestre' && !vejoTodas() && !get(t.char);
  /* token → ficha "às cegas", para a ficha que não chega a este aparelho: só o valor atual e a sobrevida das barras
     ligadas, por um caminho próprio do banco. Sem isso, o dano dado aqui seria desfeito quando o aparelho do mestre
     acertasse o token pela ficha. Junta o que muda num instante (arrastar uma barra gera muitas mudanças). */
  const cegas = new Map();
  function mandarCegas(id) {
    const e = cegas.get(id); if (!e) return;
    clearTimeout(e.t); cegas.delete(id);
    const T = window.TC && window.TC.ponte;
    if (T && typeof T.barrasDaFicha === 'function') T.barrasDaFicha(id, e.rec, e.sob, Object.keys(e.pd).length ? e.pd : null);
  }
  function paraFichaAsCegas(t) {
    const T = window.TC && window.TC.ponte;
    if (!escondida(t) || !T || typeof T.barrasDaFicha !== 'function') return false;
    const e = cegas.get(t.char) || { rec: {}, sob: {}, pd: {}, t: 0 };
    let n = 0;
    for (const b of t.bars) {
      if (!b.ref) continue;
      if (ehPd(b.ref)) { if (isFinite(b.v)) { e.pd[b.ref.slice(PD.length)] = Math.max(0, Math.round(b.v)); n++; } continue; }    // (barra especial: sem sobrevida)
      if (isFinite(b.v)) { e.rec[b.ref] = b.v; n++; }
      const x = barX(b); e.sob[b.ref] = x > 0 ? x : null;
    }
    if (!n) return false;
    clearTimeout(e.t); e.t = setTimeout(() => mandarCegas(t.char), 400);
    cegas.set(t.char, e);
    return true;
  }
  // token → ficha: o valor atual (e a sobrevida) das barras ligadas. Serve para um token de qualquer cena da mesa.
  function paraFicha(t) {
    if (!on || !t || !t.char || t.clone) return false;               // (lote 8: a cópia de um Clone não mexe na ficha)
    const l = get(t.char);
    if (!l) { paraFichaAsCegas(t); return false; }          // (a ficha não está aqui: se é das escondidas, as barras vão às cegas)
    const rec = Object.assign({}, (l.estado && l.estado.rec) || {}), sob = Object.assign({}, (l.estado && l.estado.sob) || {});
    const podre = Object.assign({}, (l.estado && l.estado.podre && typeof l.estado.podre === 'object' ? l.estado.podre : {}));      // (lote 8: a ferida permanente)
    const pdAgora = {}; for (const x of especiaisDe(l)) pdAgora[x.id] = x.atual;
    let mudou = false, pd = null;
    for (const b of t.bars) {
      if (!b.ref) continue;
      if (ehPd(b.ref)) {                     // barra especial: o valor vai para estado.pd (sem sobrevida nem piso)
        const v = Math.max(0, Math.round(Number(b.v) || 0));
        if (isFinite(b.v) && b.ref in pdAgora && pdAgora[b.ref] !== v) { pd = pd || Object.assign({}, (l.estado && l.estado.pd) || {}); pd[b.ref.slice(PD.length)] = v; mudou = true; }
        continue;
      }
      if (isFinite(b.v) && rec[b.ref] !== b.v) { rec[b.ref] = b.v; mudou = true; }
      const x = barX(b);
      if ((Number(sob[b.ref]) || 0) !== x) { if (x > 0) sob[b.ref] = x; else delete sob[b.ref]; mudou = true; }
      const pz = barPod(b);
      if ((Number(podre[b.ref]) || 0) !== pz) { if (pz > 0) podre[b.ref] = pz; else delete podre[b.ref]; mudou = true; }
    }
    if (!mudou) return false;
    P.gravar(t.char, { estado: Object.assign({}, l.estado || {}, { rec, sob, podre }, pd ? { pd } : {}) });
    return true;
  }
  function onLive(op) {
    if (!on || applying || op.t !== 'upd' || op.c !== 'tokens' || !op.p) return;
    if (op.p.conds || op.p.cinfo) { const t = Store.get('tokens', op.id); if (t) membrosParaFicha(t); }      // (lote 19)
    if (!op.p.bars) return;
    const t = Store.get('tokens', op.id);
    if (t && paraFicha(t)) syncAll(t.char);            // outro token do mesmo personagem nesta cena acompanha
  }
  /* (lote 19) Os membros perdidos das condições das raças vão para a ficha: a Mão, o Pé, o Braço e a Perna Perdida
     marcam a parte como amputada (do lado que a janela perguntou); as Costelas Abertas, um ferimento no peito. A marca
     leva a condição de onde veio (cond): quando a condição sai do token (ou o Desfazer a tira), a marca sai junto. O que
     o mestre marcou à mão na ficha fica como está. Grava quem pode gravar a ficha: o mestre, ou o dono do personagem. */
  const MEMBRO_PARTE = { maoPerdida: 'mao', pePerdido: 'pe', bracoPerdido: 'braco', pernaPerdida: 'perna' };
  const ladosDe = v => (v === 'ed' ? ['E', 'D'] : v === 'd' ? ['D'] : ['E']);
  function membrosParaFicha(t) {
    if (!on || !P || !t || !t.char || t.clone) return false;
    const l = get(t.char);
    if (!l || !(papel === 'mestre' || (!!eu && l.dono_id === eu))) return false;
    const e = l.estado || {}, ob = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
    const amp0 = ob(e.amp), fer0 = ob(e.fer), amp = {}, fer = {};
    for (const k of Object.keys(amp0)) if (!(amp0[k] && amp0[k].cond)) amp[k] = amp0[k];
    for (const k of Object.keys(fer0)) if (!(fer0[k] && fer0[k].cond)) fer[k] = fer0[k];
    const info = t.cinfo || {}, agora = Date.now();
    for (const id of t.conds) {
      const lado = (info[id] || {}).lado, c = COND_BY_ID[id];
      if (!lado || !c) continue;
      for (const L of ladosDe(lado)) {
        if (MEMBRO_PARTE[id]) { const k = MEMBRO_PARTE[id] + L; if (!amp[k]) amp[k] = amp0[k] && amp0[k].cond === id ? amp0[k] : { c: agora, n: c.n + ' (condição das Cenas)', cond: id }; }
        else if (id === 'costelasAbertas') { const k = 'cond_costelas' + L; fer[k] = fer0[k] && fer0[k].cond === id ? fer0[k] : { p: 'peito', t: 'corte', g: 2, n: 'Costelas abertas, ' + (L === 'E' ? 'lado esquerdo' : 'lado direito') + ' (condição das Cenas)', c: agora, cond: id }; }
      }
    }
    // (lote 20) o Ferido (Levemente, Extremamente, Mortalmente) também vai para a ficha (estado.ferido), e sai junto
    const fd = t.conds.find(id => COND_BY_ID[id] && COND_BY_ID[id].ferido) || null, fd0 = typeof e.ferido === 'string' ? e.ferido : null;
    if (JSON.stringify(amp) === JSON.stringify(amp0) && JSON.stringify(fer) === JSON.stringify(fer0) && fd === fd0) return false;
    const est = Object.assign({}, e, { amp, fer });
    if (fd) est.ferido = fd; else delete est.ferido;
    P.gravar(t.char, { estado: est });
    return true;
  }
  /* Liga (ou desliga) o token a uma ficha. Ligado, o token passa a ter o nome do personagem e só as barras da ficha;
     e, se ele não tinha dono e a ficha é de um jogador da mesa, o jogador passa a ser o dono do token. Tudo no mesmo
     passo de desfazer (desfazer traz de volta o nome e as barras de antes). Devolve { dono } com o nome dele, se foi
     o caso. */
  function link(t, charId) {
    if (!charId) {
      // desligado, o token fica com o que tinha: as barras viram barras comuns e a imagem passa a ser dele
      Store.tx('Desligar da ficha', () => Store.upd('tokens', t.id, { char: null, imgChar: false, fad: null, bars: t.bars.map(b => { const o = Object.assign({}, b); delete o.ref; return o; }) }));
      return {};
    }
    const l = get(charId), jog = l && l.dono_id && !t.owner ? playerById(l.dono_id) : null;
    const p = { char: charId };
    if (jog) p.owner = jog.id;
    if (l && l.ficha != null) {
      const nome = String(l.nome || '').trim().slice(0, 60), bars = soDaFicha(t, resumo(l), l);
      if (nome) p.name = nome;
      if (bars) p.bars = bars;
    }
    Store.tx('Ligar à ficha', () => Store.upd('tokens', t.id, p));
    const now = Store.get('tokens', t.id);
    if (now) syncToken(now);
    return { dono: jog ? jog.name : null };
  }
  /* (lote 9) O Duplicado: a ficha do gêmeo — uma cópia da ficha do personagem copiado (atributos, defesas, itens,
     habilidades, a árvore, a imagem), só do mestre (vis 'mestre', sem dono, do lado Inimigo), na mesma campanha, com o
     nome "… (gêmeo)" (o token do gêmeo continua com o nome do original). barras 'agora': os valores de agora das barras
     (com a sobrevida, o podre e as barras especiais); 'cheias': todas no máximo. Fica fora do desfazer da cena: é uma
     ficha das Fichas. → o id da ficha nova, ou null (a ficha não chega aqui: o auxiliar sem a aba Fichas, sem mesa). */
  function copiarFicha(charId, o) {
    const l = get(charId);
    if (!on || !P || !l || l.ficha == null || papel !== 'mestre' || !vejoTodas()) return null;
    const copia = x => JSON.parse(JSON.stringify(x == null ? null : x));
    const id = Math.random().toString(36).slice(2, 10);                // (o mesmo jeito de id das Fichas)
    const ficha = copia(l.ficha) || {};
    delete ficha.petDe; ficha.lado = 'Inimigo';
    const e = l.estado || {}, est = {};
    if (o && o.barras === 'agora') { for (const k of ['rec', 'sob', 'podre', 'pd']) if (e[k] !== undefined) est[k] = copia(e[k]); }
    else {
      // (cheias: cada barra no máximo — mesmo a que começa pela metade — e as especiais também)
      const rec = {}, pd = {};
      for (const r of resumo(l).recursos) if (r.max != null && isFinite(r.max)) rec[r.id] = r.max;
      for (const x of especiaisDe(l)) pd[x.id.slice(PD.length)] = x.max;
      if (Object.keys(rec).length) est.rec = rec;
      if (Object.keys(pd).length) est.pd = pd;
    }
    const ordem = P.todas().reduce((mx, x) => Math.max(mx, Number(x.ordem) || 0), 0) + 1;
    P.gravar(id, { nome: (String(l.nome || 'Personagem').trim() + ' (gêmeo)').slice(0, 120), ficha, skills: copia(l.skills || {}) || {}, estado: est, dono_id: null, vis: 'mestre', campanha: l.campanha || null, ordem });
    return id;
  }
  /* Abre a ficha do personagem deste token, na aba Fichas do site (dois cliques no token). Só quando a ficha está ao
     alcance de quem clicou: o mestre vê todas; o jogador, a dele e as que o mestre deixou à mostra. */
  function abrir(t) {
    const T = window.TC;
    if (!t || !t.char || !get(t.char) || !T || !T.ponte || !T.ponte.ir) return false;
    return !!T.ponte.ir('fichas', { pc: t.char });
  }
  // O que dá para rolar pela ficha deste token: [chave, nome, valor]
  function rolaveis(t) {
    const l = linhaDoTok(t);
    if (!l || l.ficha == null) return [];
    const pc = pcDe(l), c = R().calcular(pc, cfg(), extra(l)), fonte = (pc.rol && pc.rol.fonte) || 'total';
    return ROLAVEIS.map(k => [k, R().NOMES[k] || k, Math.max(0, Math.round(R().valorDoAtributo(c, k, fonte) || 0))]);
  }
  /* Os números que o token mostra ao lado do nome (Força, Canalização Mágica, Defesa Física, Defesa Mágica, Esquiva),
     da ficha, com tudo o que soma — os mesmos valores da janelinha F. O mapa pede isto a cada quadro: a conta fica
     guardada para a linha da ficha (uma ficha que muda chega como linha nova) enquanto as regras da mesa não mudam. */
  const NUMEROS = ['FOR', 'CAN', 'DFF', 'DFM', 'ESQ'];
  const numGuardados = new WeakMap();
  function numeros(t) {
    const l = linhaDoTok(t);
    if (!l || l.ficha == null || !R()) return null;
    const cf = cfg(), bi = bib(), g = numGuardados.get(l);
    if (g && g.cf === cf && g.bi === bi) return g.v;
    let v = null;
    try {
      const pc = pcDe(l), c = R().calcular(pc, cf, extra(l)), fonte = (pc.rol && pc.rol.fonte) || 'total';
      v = {};
      for (const k of NUMEROS) v[k] = Math.round(Number(R().valorDoAtributo(c, k, fonte)) || 0);
    } catch (e) { v = null; }
    numGuardados.set(l, { cf, bi, v });
    return v;
  }
  /* Sanidade e Conforto da ficha deste token (de 0 a 100), quando a ficha usa os dois — como na ficha: a de um
     jogador da mesa, ou a que já tem algum dos dois anotado. No mapa, só o mestre vê. */
  const valorMente = (v, padrao) => (v != null && v !== '' && isFinite(+v) ? clamp(Math.round(+v), 0, 100) : padrao);
  function mente(t) {
    const l = t && t.char ? fichaDe(t) : null;
    if (!l) return null;
    const e = l.estado || {};
    if (e.san == null && e.conf == null && !deJogador(l)) return null;
    return { san: valorMente(e.san, 100), conf: valorMente(e.conf, 50) };
  }
  // O mestre muda a Sanidade ou o Conforto pelo token: grava direto na ficha. Devolve o valor de antes (ou null).
  function mudarMente(t, k, v) {
    const l = t && t.char ? fichaDe(t) : null, antes = mente(t);
    if (!l || !antes || !P || papel !== 'mestre' || (k !== 'san' && k !== 'conf')) return null;
    const novo = valorMente(v, antes[k]);
    if (novo === antes[k]) return null;
    P.gravar(t.char, { estado: Object.assign({}, l.estado || {}, { [k]: novo }) });
    return antes[k];
  }
  /* A fadiga da ficha deste token: { v (de 0 a 5), nome ("Cansado"…) } ou null (a ficha não usa, ou não está aqui).
     Muda pelo token o mestre e o dono do personagem: grava direto na ficha. Devolve o valor de antes (ou null). */
  function fadiga(t) {
    const v = fadigaDe(t && t.char ? fichaDe(t) : null);
    return v == null ? null : { v, nome: (R().FADIGA || [])[v] || '' };
  }
  function mudarFadiga(t, v) {
    const l = t && t.char ? fichaDe(t) : null, antes = fadigaDe(l);
    if (!l || antes == null || !P || !(papel === 'mestre' || (!!eu && l.dono_id === eu))) return null;
    const n = Math.round(Number(v));
    if (!isFinite(n)) return null;
    const novo = clamp(n, 0, 5);
    if (novo === antes) return null;
    P.gravar(t.char, { estado: R().mudarFadiga(l.estado || {}, novo) });
    syncAll(t.char);                    // (a mudança feita daqui não volta como "mudança de fora": o token acompanha já)
    return antes;
  }
  /* (lote 7) Mexer em todos (os tokens selecionados): a Fadiga, o Conforto e a Sanidade das fichas ligadas, de uma vez
     (uma ficha conta uma vez só, mesmo com dois tokens dela). Só o mestre. As contas são as de TC.rules.mexerNaMente
     (as mesmas do Acampamento). → [{ id (da ficha), nome, estado (o de antes), so (as chaves que mudaram), antes,
     depois }] — para o aviso e para voltarMente (o desfazer). */
  const usoDaMente = t => ({ mente: !!mente(t), fadiga: !!fadiga(t) });
  const deJogadorT = t => { const l = t && t.char ? fichaDe(t) : null; return !!l && deJogador(l); };
  function previaMente(t, d) {
    const l = t && t.char ? fichaDe(t) : null;
    return l ? R().mexerNaMente(l.estado || {}, d, usoDaMente(t)) : null;
  }
  function mexerEmTodos(toks, d) {
    if (!P || papel !== 'mestre') return [];
    const feitos = [], vistos = new Set();
    for (const t of toks || []) {
      const l = t && t.char ? fichaDe(t) : null;
      if (!l || vistos.has(l.id)) continue;
      vistos.add(l.id);
      const r = R().mexerNaMente(l.estado || {}, d, usoDaMente(t));
      if (!r.so.length) continue;
      feitos.push({ id: l.id, nome: l.nome || t.name, estado: l.estado || {}, so: r.so, antes: r.antes, depois: r.depois });
      P.gravar(l.id, { estado: r.estado });
    }
    for (const f of feitos) syncAll(f.id);
    return feitos;
  }
  // o desfazer do "mexer em todos": volta só as chaves que ele mudou em cada ficha (o resto, como está agora)
  function voltarMente(feitos) {
    if (!P || papel !== 'mestre') return 0;
    let n = 0;
    for (const f of feitos || []) {
      const l = get(f.id);
      if (!l) continue;
      const est = Object.assign({}, l.estado || {});
      for (const k of f.so) { if (f.estado[k] === undefined) delete est[k]; else est[k] = f.estado[k]; }
      P.gravar(f.id, { estado: est });
      syncAll(f.id);
      n++;
    }
    return n;
  }
  /* ---- os equipamentos da ficha deste token (lote 6: a janelinha E) ----
     Quem mexe: o mestre, em qualquer token ligado; o jogador, no token do personagem dele (a ficha é dele). */
  function podeEquipar(t) {
    const l = t && t.char ? get(t.char) : null;
    return !!l && l.ficha != null && !!R() && typeof R().equiparItem === 'function' && (papel === 'mestre' ? on : !!eu && l.dono_id === eu);
  }
  // → [{ id, nome, on, troca, reliquia, req, ativo, bon: [{ rot, v }], tipo, sec, nv, nvs }]: só o que cada item soma
  //   (como os cartões da ficha); req: o nome do que ele precisa ("Só funciona com…"), ativo: se está valendo (equipado
  //   e com o requisito). (lote 7) Na ordem das seções da ficha (por tipo; em cada uma, os equipados primeiro): tipo é o
  //   id do tipo ('' sem tipo), sec o nome da seção; nv, o nível de agora de um item com níveis (de nvs) — 0 nos comuns.
  function itens(t) {
    const l = t && t.char ? get(t.char) : null, R0 = R();
    if (!l || !l.ficha || !Array.isArray(l.ficha.itens) || !R0) return [];
    const rotDe = k => { const d = (R0.DEFESAS || []).find(x => x.k === k); return (d && d.rot) || k; };
    const recs = Array.isArray(l.ficha.recursos) ? l.ficha.recursos : [];
    const comId = l.ficha.itens.filter(it => it && it.id != null);
    const secs = R0.secoesDeItens ? R0.secoesDeItens(comId, cfg()) : [{ tipo: null, itens: comId }];
    return secs.flatMap(s => s.itens.map(it => [it, s.tipo])).map(([it, tp]) => {
      const bon = [], b = it.bonus || {}, rec = it.rec && typeof it.rec === 'object' ? it.rec : {}, def = it.def && typeof it.def === 'object' ? it.def : {};
      for (const k of R0.CHAVES_BONUS || []) { const v = +b[k] || 0; if (v) bon.push({ rot: rotDe(k), v }); }
      for (const r of recs) { const v = +rec[r.id] || 0; if (v) bon.push({ rot: String(r.nome || 'Barra'), v }); }
      for (const d of R0.DEFESAS_ESP || []) { const v = +def[d.k] || 0; if (v) bon.push({ rot: 'Def. ' + d.nome, v }); }
      const lista = l.ficha.itens;
      const niv = !!R0.temNiveis && R0.temNiveis(it);
      return { id: String(it.id), nome: String(it.nome || '').trim() || 'Item sem nome', on: it.equipado !== false, troca: R0.grupoDeTroca ? R0.grupoDeTroca(it) : '', reliquia: !!it.reliquia,
        req: R0.nomeDoReq ? R0.nomeDoReq(it, lista) : '', ativo: R0.itemAtivo ? R0.itemAtivo(it, lista) : it.equipado !== false, bon,
        tipo: tp ? tp.id : '', sec: tp ? tp.sec : 'Sem tipo', nv: niv ? R0.nivelDoItem(it) : 0, nvs: niv ? R0.niveisDoItem(it).length : 0 };
    });
  }
  /* Equipar (onOff = true) ou guardar um item da ficha deste token — dos itens do mesmo grupo de troca, um só fica
     equipado; o complementar traz o que ele precisa, e guardar o requisito guarda os que dependem dele
     (TC.rules.equiparItem). Grava na ficha, e o token acompanha na hora (as barras podem mudar com o item).
     → { ok: true, item, guardados: [nomes], equipados: [nomes], texto, desfazer() } ou { ok: false, error } */
  function equipar(t, id, onOff) {
    if (!podeEquipar(t)) return { ok: false, error: papel === 'mestre' ? 'A ficha deste token não está aqui.' : 'Você mexe nos equipamentos do seu personagem.' };
    const charId = t.char, l = get(charId), antes = l.ficha, lista = Array.isArray(antes.itens) ? antes.itens : [];
    const r = R().equiparItem(lista, id, onOff), it = r.itens.find(x => x && x.id === id);
    if (!it) return { ok: false, error: 'Este item não está mais na ficha.' };
    P.gravar(charId, { ficha: Object.assign({}, antes, { itens: r.itens }) });
    syncAll(charId);
    const eqAntes = new Map(lista.filter(x => x && x.id != null).map(x => [x.id, [x.equipado, x.volta, x.uso]]));
    const nomeDe = g => { const x = lista.find(y => y && y.id === g); return (x && String(x.nome || '').trim()) || 'item sem nome'; };
    const texto = R().textoDoEquipar ? R().textoDoEquipar(r.itens, r, id, onOff) : '';
    return { ok: true, item: String(it.nome || '').trim() || 'Item', guardados: r.guardados.map(nomeDe), equipados: (r.equipados || []).map(nomeDe), texto, desfazer: () => {
      const agora = get(charId);
      if (!agora || !agora.ficha || !Array.isArray(agora.ficha.itens)) return false;
      // (só a chave de equipado, a marca de "volta junto" e a ordem de uso de cada item voltam como estavam; o resto
      //  da ficha fica como está agora)
      const itens2 = agora.ficha.itens.map(x => {
        if (!x || !eqAntes.has(x.id)) return x;
        const y = Object.assign({}, x), [eq, vt, us] = eqAntes.get(x.id);
        const volta = (k, v) => { if (v === undefined) delete y[k]; else y[k] = v; };
        volta('equipado', eq); volta('volta', vt); volta('uso', us);
        return y;
      });
      P.gravar(charId, { ficha: Object.assign({}, agora.ficha, { itens: itens2 }) });
      syncAll(charId);
      return true;
    } };
  }
  /* (lote 15) O máximo de uma barra ligada, mudado aqui no token, vai para a ficha. Antes, o token ficava com o número
     só até a próxima mudança: ao descontar, a ficha devolvia o máximo dela (na ficha de jogador ainda sem pontos, o
     "LVL*5" da fórmula — o HP que não descontava e voltava para 10). Agora o número entra na ficha no lugar da fórmula
     do recurso (o que a árvore e os itens somam continua por cima: o total fica o número digitado); na barra especial,
     ele é o máximo dela. O valor de agora fica como está.
     → { ok: false, error } (error null: não é barra de ficha, e o token muda sozinho, como sempre)
       ou { ok: true, nada } (o máximo já é esse) ou { ok: true, nome, dono, formula, resultado, numero, soma, fazer }:
       formula é a fórmula que sairia de uma ficha preenchida (null quando não há o que perder: a ficha ainda vazia, um
       máximo que já era número, a barra especial); fazer() grava e devolve { max, desfazer() } (null se a ficha sumiu). */
  const SO_NUMERO = /^-?\d+(\.\d+)?$/;
  function maximoParaFicha(t, i, m) {
    const b = t && t.bars ? t.bars[i] : null;
    if (!on || !b || !b.ref || !t.char || t.clone) return { ok: false, error: null };
    const l = get(t.char);
    if (!l) return escondida(t) ? { ok: false, error: `O máximo de ${b.n} vem da ficha, que não está à vista aqui: mude na aba Fichas.` } : { ok: false, error: null };
    if (l.ficha == null) return { ok: false, error: `O máximo de ${b.n} vem da ficha, que ainda não chegou. Tente de novo num instante.` };
    if (papel !== 'mestre' && !(eu && l.dono_id === eu)) return { ok: false, error: `O máximo de ${b.n} vem da ficha.` };
    const charId = t.char, ref = b.ref, dono = String(l.nome || '').trim() || 'Sem nome';
    if (ehPd(ref)) {
      const id = ref.slice(PD.length), lista = Array.isArray(l.ficha.poderes) ? l.ficha.poderes : [];
      const k = lista.findIndex(x => x && String(x.id) === id);
      if (k < 0) return { ok: false, error: null };
      const n = Math.round(Number(m) || 0), antes = lista[k].max;
      if (n < 1) return { ok: false, error: `${b.n} precisa de pelo menos 1 de máximo. Para tirar a barra, apague-a na ficha.` };
      if (Math.round(Number(antes) || 0) === n) return { ok: true, nada: true };
      return { ok: true, nome: b.n, dono, formula: null, resultado: Math.round(Number(antes) || 0), numero: n, soma: 0, fazer: () => {
        const agora = get(charId), ps = agora && agora.ficha && Array.isArray(agora.ficha.poderes) ? agora.ficha.poderes : null;
        const j = ps ? ps.findIndex(x => x && String(x.id) === id) : -1;
        if (j < 0) return null;
        const ps2 = ps.slice(); ps2[j] = Object.assign({}, ps2[j], { max: n });
        P.gravar(charId, { ficha: Object.assign({}, agora.ficha, { poderes: ps2 }) });
        syncAll(charId);
        return { max: n, desfazer: () => {
          const a2 = get(charId), q = a2 && a2.ficha && Array.isArray(a2.ficha.poderes) ? a2.ficha.poderes : null;
          const j2 = q ? q.findIndex(x => x && String(x.id) === id) : -1;
          if (j2 < 0 || Math.round(Number(q[j2].max) || 0) !== n) return false;          // (mudou de novo depois: fica)
          const q2 = q.slice(); q2[j2] = Object.assign({}, q2[j2], { max: antes });
          P.gravar(charId, { ficha: Object.assign({}, a2.ficha, { poderes: q2 }) });
          syncAll(charId);
          return true;
        } };
      } };
    }
    const recs = Array.isArray(l.ficha.recursos) ? l.ficha.recursos : [], k = recs.findIndex(x => x && x.id === ref);
    if (k < 0) return { ok: false, error: null };
    const c = R().calcular(pcDe(l), cfg(), extra(l)), rc = (c.recursos || []).find(x => x.id === ref) || {};
    if (rc.max === m) return { ok: true, nada: true };
    const soma = Math.round(((Number(rc.arv) || 0) + (Number(rc.eq) || 0)) * 10) / 10;
    const numero = Math.max(0, Math.round((m - soma) * 10) / 10);
    const fml = String(recs[k].fml == null ? '' : recs[k].fml).trim();
    const vazia = (R().ATRIBS || []).every(a => !(Number((c.nat || {})[a.k]) > 0));        // (nenhum atributo com ponto ainda)
    return { ok: true, nome: b.n, dono, formula: fml === '' || SO_NUMERO.test(fml) || vazia ? null : fml, resultado: rc.max, numero, soma, fazer: () => {
      const agora = get(charId), rs = agora && agora.ficha && Array.isArray(agora.ficha.recursos) ? agora.ficha.recursos : null;
      const j = rs ? rs.findIndex(x => x && x.id === ref) : -1;
      if (j < 0) return null;
      const velho = rs[j].fml, rs2 = rs.slice();
      rs2[j] = Object.assign({}, rs2[j], { fml: String(numero) });
      const campos = { ficha: Object.assign({}, agora.ficha, { recursos: rs2 }) };
      // o valor de agora fica: sem nada guardado, a ficha encheria a barra no máximo novo
      const est = agora.estado || {}, rec0 = est.rec && typeof est.rec === 'object' ? est.rec : {};
      if (!Object.prototype.hasOwnProperty.call(rec0, ref) && isFinite(b.v)) campos.estado = Object.assign({}, est, { rec: Object.assign({}, rec0, { [ref]: b.v }) });
      P.gravar(charId, campos);
      syncAll(charId);
      const depois = get(charId), r2 = depois ? (resumo(depois).recursos || []).find(x => x.id === ref) : null;
      return { max: r2 ? r2.max : m, desfazer: () => {
        const a2 = get(charId), q = a2 && a2.ficha && Array.isArray(a2.ficha.recursos) ? a2.ficha.recursos : null;
        const j2 = q ? q.findIndex(x => x && x.id === ref) : -1;
        if (j2 < 0 || String(q[j2].fml) !== String(numero)) return false;          // (a fórmula mudou de novo depois: fica)
        const q2 = q.slice(), o = Object.assign({}, q2[j2]);
        if (velho === undefined) delete o.fml; else o.fml = velho;
        q2[j2] = o;
        P.gravar(charId, { ficha: Object.assign({}, a2.ficha, { recursos: q2 }) });
        syncAll(charId);
        return true;
      } };
    } };
  }
  const fixaPadrao = t => { const l = linhaDoTok(t); return l && l.ficha && l.ficha.rol ? Math.max(0, Math.round(+l.ficha.rol.fixa || 0)) : 0; };
  /* Rola um atributo da ficha com a regra da fixa: um dado de (atributo − fixa) lados, mais a fixa. `mais`: os bônus só
     desta rolagem — { atr: soma no atributo antes de rolar (muda o dado), res: soma no resultado }. */
  // (ped: { pedido, alvo } — a rolagem geral, quando o mestre rola no lugar de um jogador com o pedido em aberto:
  // vale como a resposta dele, e o cartão do pedido mostra "rolou … (pelo mestre)")
  function rolar(t, chave, fixa, mais, ped) {
    const item = rolaveis(t).find(x => x[0] === chave);
    if (!item) return { ok: false, error: 'Este token não está ligado a uma ficha.' };
    const valor = item[2], ma = Math.round(Number(mais && mais.atr) || 0), com = valor + ma;
    if (com < 1) return { ok: false, error: item[1] + ' está em ' + Math.max(0, com) + (ma ? ' (com o bônus)' : '') + ': não há o que rolar.' };
    const r = window.TC.dice.rollFixaMais(valor, fixa, mais);
    if (!r.ok) return r;
    const doPedido = ped && typeof ped.pedido === 'string' && ped.pedido && typeof ped.alvo === 'string' && ped.alvo ? { pedido: ped.pedido, alvo: ped.alvo } : null;
    if (Ext.roll) { try { Ext.roll(Object.assign({ kind: 'atributo', name: t.name, tokenId: t.id, attr: chave, attrNome: item[1], atributo: r.atributo, fixa: r.fixa, d: r.dieValue, total: r.total, base: r.base, ma: r.ma, mr: r.mr }, doPedido)); } catch (e) { console.error(e); } }
    return Object.assign({ nome: item[1] }, r);
  }

  /* Quem pode rolar pela ficha deste token: o mestre, em qualquer token ligado; o jogador, no token do personagem
     que é dele (a ficha chega a ele pela mesa, e a rolagem sai no nome dele). */
  function podeRolar(t) {
    // (o inimigo do Bestiário: quem mestra — ou, fora de uma mesa, quem está aqui)
    if (t && !t.char && t.best) return !!linhaBest(t.best) && (papel === 'mestre' ? on : papel == null);
    const l = t && t.char ? get(t.char) : null;
    return !!l && l.ficha != null && !!R() && (papel === 'mestre' ? on : !!eu && l.dono_id === eu);
  }
  /* As defesas da ficha deste token, pela chave: as duas gerais (DFF, DFM) e as 13 específicas (FOGO, CORTE…), já com
     equipamentos, árvore, bônus temporários e ferimentos. null se o token não tem ficha aqui. */
  function defesas(t) {
    const l = t && t.char ? fichaDe(t) : t && t.best ? linhaBestTok(t) : null;
    if (!l) return null;
    const r = resumo(l), out = {};
    for (const k in r.def) out[k] = Math.round(Number(r.def[k]) || 0);
    for (const k in r.defEsp) out[k] = Math.round(Number(r.defEsp[k]) || 0);
    return out;
  }
  // O jogador da mesa que é dono desta ficha (ou null: ficha do mestre, de NPC, ou de alguém que saiu da mesa).
  const donoDe = l => (l && l.dono_id ? playerById(l.dono_id) || null : null);
  /* O pet de um personagem (lote 6: ficha.petDe) é uma ficha suplementar: o jogador que controla o dono controla o pet,
     mas ele não liga sozinho o que a ficha de jogador liga (Sanidade e Conforto, fadiga) — como a ficha de um NPC. */
  const ehPet = l => !!(l && l.ficha && l.ficha.petDe);
  const deJogador = l => !!donoDe(l) && !ehPet(l);
  /* A fadiga da ficha (de 0 a 5; 5 é descansado), quando ela usa — como na ficha: a de um jogador da mesa, ou a que já
     tem a fadiga anotada. null se não usa. */
  const fadigaDe = l => (l && R() && typeof R().usaFadiga === 'function' && R().usaFadiga(l.estado, deJogador(l)) ? R().fadiga(l.estado) : null);
  const donoDoToken = t => donoDe(t && t.char ? get(t.char) : null);
  // …e quem joga com ele agora: o dono, a não ser que seja o mestre auxiliar e esteja mestrando (aí quem mestra rola por ele)
  const donoQueJoga = t => { const p = donoDoToken(t); return p && !p.gm ? p : null; };
  /* Um token novo para um personagem da mesa, já ligado à ficha: nome, barras, iniciativa e dono (se a ficha é de
     um jogador). Não entra na cena aqui: quem chama é que o inclui (e depois acerta a imagem, com syncToken). */
  function novoToken(sc, charId, x, y, extra) {
    const l = get(charId);
    if (!l || l.ficha == null) return null;
    const jog = donoDe(l), r = resumo(l);
    const t = newToken(sc, x, y, Object.assign({ name: String(l.nome || 'Sem nome').trim().slice(0, 60) || 'Sem nome', char: charId, owner: jog ? jog.id : null }, extra || {}));
    if (t.owner) t.barVis = 'num';
    const bars = soDaFicha(t, r, l);
    if (bars) t.bars = bars;
    if (String((l.ficha && l.ficha.ini) || '').trim() !== '') t.ini = clampIni(r.ini);
    return t;
  }

  const semTotal = s => String(s || '').replace(/^[-−]?\d+ · /, '');
  // avisa a mesa ao vivo (a casca decide como mostrar); token oculto ou sem nome à mostra: só o mestre vê
  function avisarUso(t, charId, titulo, resumo, total, dd, oculto) {
    try { window.TC.ponte.publicar('cena', { kind: 'uso', titulo, resumo, total: total == null ? null : total, char: charId, oculto: oculto != null ? !!oculto : !!(t && (t.hidden || t.showName === false)), dd: dd || [] }); } catch (e) { /* sem a casca não há mesa */ }
  }
  /* ---- usar um item da bolsa: em quem tem, ou em outro token (lote 5) ----
     Quem recebe pode ser o próprio token (ou outro do mesmo personagem), um token ligado a uma ficha que está aqui (as
     barras são achadas pelo nome, na ficha dele) ou um token sem ficha (aí as barras dele mesmo fazem papel de ficha:
     "b0", "b1"…). As condições da poção vão para o token de quem recebe. */
  function fichaDasBarras(t) {
    const rec = {}, sob = {};
    t.bars.forEach((b, i) => { rec['b' + i] = b.v; if (barX(b) > 0) sob['b' + i] = barX(b); });
    return { pc: { id: 'tok:' + t.id, nome: t.name, recursos: t.bars.map((b, i) => ({ id: 'b' + i, nome: b.n })), poderes: [] },
      calc: { recursos: t.bars.map((b, i) => ({ id: 'b' + i, max: b.m, min: -barLo(b), inicio: b.st != null ? b.st : null })) },
      estado: { rec, sob }, nome: tokName(t), barras: true };
  }
  function quemRecebe(charId, alvo) {
    if (alvo.char && alvo.char === charId) return { mesmo: true, nome: tokName(alvo) };
    const la = alvo.char ? fichaDe(alvo) : null;
    if (la) { const pc = pcDe(la); return { pc, calc: R().calcular(pc, cfg(), extra(la)), estado: la.estado || {}, nome: la.nome || tokName(alvo), l: la }; }
    return fichaDasBarras(alvo);
  }
  // os valores de quem recebe ficam de fora do que a mesa lê quando quem recebe não é personagem de quem usa
  const semValoresPara = (charId, alvo, q) => !q.mesmo && !(q.l && (papel === 'mestre' || q.l.dono_id === eu));
  // os efeitos que rolam dados: um total por efeito, na ordem (null nos que não rolam) e o que cada dado sorteou
  function rolarEfeitos(it) {
    const rolados = [], contas = [], dd = [];
    for (const e of it.fx) {
      const ef = (e.k === 'barra' || e.k === 'sob') && e.rec ? R().lerEfeito(e.val) : null;
      if (!ef || !ef.dados) { rolados.push(null); continue; }
      const r = window.TC.dice.rollExpr(ef.dados);
      if (!r.ok) return { erro: r.error };
      rolados.push(r.total); contas.push(semTotal(window.TC.dice.summary({ mode: 'dados', expr: r.expr, terms: r.terms, total: r.total })) + ' = ' + r.total);
      if (window.TC.dice.diceOf) dd.push(...window.TC.dice.diceOf(r));       // o que cada dado sorteou (para o auditor da mesa)
    }
    return { rolados, contas, dd };
  }
  /* O mesmo uso, no aparelho do mestre: confere o pedido do jogador antes de aplicar — a ficha é dele, o item existe e
     ainda tem, o token de quem recebe está à vista, e cada dado rolado cabe no efeito ("2d6+3" dá de 5 a 15). */
  function conferirRolados(it, rolados) {
    if (!Array.isArray(rolados) || rolados.length !== it.fx.length) return false;
    return it.fx.every((e, i) => {
      const ef = (e.k === 'barra' || e.k === 'sob') && e.rec ? R().lerEfeito(e.val) : null;
      if (!ef || !ef.dados) return rolados[i] == null;
      const f = R().faixaDoEfeito(ef.dados), v = rolados[i];
      return !!f && typeof v === 'number' && Number.isInteger(v) && v >= f[0] && v <= f[1];
    });
  }
  // as condições da poção, no token: entram as que ele não tem; com rodadas, a duração conta (d), como as outras
  function condsNoToken(alvo, conds) {
    const p = {};
    let cs = alvo.conds, info = null;
    for (const c of conds) {
      if (!COND_BY_ID[c.c]) continue;
      const nova = !cs.includes(c.c);
      if (nova) cs = cs.concat(c.c);
      // (lote 19) a condição nova das raças entra com o de começo (as rodadas que o item diz valem mais)
      const ini = nova && !(alvo.cinfo || {})[c.c] ? condInicio(c.c) : null;
      if (ini) { info = info || Object.assign({}, alvo.cinfo); info[c.c] = Object.assign({}, ini); }
      if (c.r > 0) { info = info || Object.assign({}, alvo.cinfo); info[c.c] = Object.assign({}, info[c.c], { d: c.r, d0: c.r }); }
    }
    if (cs !== alvo.conds) p.conds = cs;
    if (info) p.cinfo = info;
    return p;
  }
  // as barras do token sem ficha, como ficaram depois do uso
  function barrasDepois(alvo, u) {
    const ea = u.estadoAlvo || {};
    let mudou = false;
    const bars = alvo.bars.map((b, i) => {
      const k = 'b' + i, o = Object.assign({}, b);
      if (ea.rec && ea.rec[k] != null && ea.rec[k] !== b.v) { o.v = ea.rec[k]; mudou = true; }
      const x = ea.sob && ea.sob[k] > 0 ? ea.sob[k] : 0;
      if (x !== barX(b)) { if (x > 0) o.x = x; else delete o.x; mudou = true; }
      return o;
    });
    return mudou ? bars : null;
  }
  /* Usa um item da bolsa do personagem `charId` no token `alvo` (o do próprio personagem, ou outro), com os dados já
     rolados. Grava na ficha de quem usa (a bolsa), na de quem recebe (se ela está aqui) e no token (as barras de um
     token sem ficha, as condições). Só no aparelho do mestre. opt.cena: a cena do token (a aberta, se não vier);
     opt.pedido: é o pedido de um jogador (o token muda como mudança de fora, sem entrar no desfazer do mestre).
     → { ok:false, error } | { ok:true, u, q, texto, desfazer } */
  function aplicarUso(charId, itemId, alvo, rolados, opt) {
    opt = opt || {};
    const l = get(charId);
    if (!l || l.ficha == null) return { ok: false, error: 'A ficha de quem usa não está aqui.' };
    const pc = pcDe(l), antes = l.estado || {}, calc = R().calcular(pc, cfg(), extra(l));
    const q = quemRecebe(charId, alvo), antesAlvo = q.l ? (q.l.estado || {}) : null;
    const u = R().usarItem(pc, calc, antes, itemId, rolados, Date.now(), uid('t'), q.mesmo ? null : q);
    if (!u.ok) return { ok: false, error: u.erro };
    // (num token sem ficha não há onde guardar um bônus: ele fica de fora, e o texto diz)
    if (q.barras && u.efeitos.some(e => e.k === 'bonus')) { u.efeitos = u.efeitos.filter(e => e.k !== 'bonus'); u.semBonus = true; }
    // as fichas
    P.gravar(charId, { estado: u.estado });
    if (q.l) P.gravar(alvo.char, { estado: u.estadoAlvo });
    // o token de quem recebe: as barras (sem ficha) e as condições
    const patch = Object.assign({}, condsNoToken(alvo, u.conds)), bars = q.barras ? barrasDepois(alvo, u) : null;
    if (bars) patch.bars = bars;
    const tokAntes = { bars: alvo.bars, conds: alvo.conds, cinfo: alvo.cinfo };
    const cena = opt.cena || Store.S.current, nomeIt = u.item.nome || ((R().BOLSAS.find(b => b.t === u.item.t) || {}).um || 'Item');
    if (Object.keys(patch).length) {
      if (opt.pedido) { applying = true; try { Store.remoteIn(cena, [{ t: 'upd', c: 'tokens', id: alvo.id, p: patch }]); } finally { applying = false; } }
      else Store.tx('Usar ' + nomeIt, () => Store.upd('tokens', alvo.id, patch));
      if (bars && alvo.char) { const tk = (Store.S.scenes[cena] || Store.scene()).tokens.find(x => x.id === alvo.id); if (tk) paraFichaAsCegas(tk); }   // (token de ficha escondida: vai às cegas)
    }
    if (on) { syncAll(charId); if (q.l) syncAll(alvo.char); }
    const desfazer = () => {
      // só o que este uso mexeu volta (o que mudou no personagem nesse meio-tempo, por outro caminho, fica)
      const voltar = (id, a, mesmo) => {
        const agora = get(id); if (!agora) return;
        const e = Object.assign({}, agora.estado || {}), rec = Object.assign({}, e.rec || {}), sob = Object.assign({}, e.sob || {}), tmp = Object.assign({}, e.tmp || {}), qtd = Object.assign({}, e.qtd || {});
        let pd = Object.assign({}, e.pd || {});
        if (id === charId) qtd[u.item.id] = Math.max(0, Math.floor(Number(qtd[u.item.id]) || 0)) + 1;
        if (mesmo) for (const f of u.efeitos) {
          if (f.k === 'barra' && f.tipo === 'rec') { const tinha = a.rec && a.rec[f.id] != null; if (Number(rec[f.id]) === f.para) { if (tinha) rec[f.id] = a.rec[f.id]; else delete rec[f.id]; } else if (rec[f.id] != null) rec[f.id] = Math.round((Number(rec[f.id]) - (f.para - f.de)) * 10) / 10; }
          else if (f.k === 'barra' && f.tipo === 'pd') pd[f.id] = f.de;
          else if (f.k === 'sob') { if (a.sob && a.sob[f.id] != null) sob[f.id] = a.sob[f.id]; else delete sob[f.id]; }
          else if (f.k === 'bonus') delete tmp[f.id];
        }
        P.gravar(id, { estado: Object.assign(e, { qtd, rec, sob, tmp, pd }) });
      };
      voltar(charId, antes, q.mesmo);
      if (q.l) voltar(alvo.char, antesAlvo, true);
      if (Object.keys(patch).length && !opt.pedido) { const tk = Store.get('tokens', alvo.id); if (tk) Store.tx('Desfazer ' + nomeIt, () => Store.upd('tokens', alvo.id, { bars: bars ? tokAntes.bars : tk.bars, conds: tokAntes.conds, cinfo: tokAntes.cinfo })); }
      if (on) { syncAll(charId); if (q.l) syncAll(alvo.char); }
      return true;
    };
    return { ok: true, u, q, nome: nomeIt, desfazer };
  }

  /* (lote 29) O saque de um inimigo do Bestiário vai para a ficha de alguém (só o mestre): os itens de bolsa (poção,
     bomba, runa, munição, material) somam no item de mesmo nome e tipo que a bolsa já tem — ou entram como novos —; o
     equipamento entra nos itens da ficha, guardado; os lapros somam. O Desfazer tira o que entrou (o resto da ficha
     fica como estiver). → { ok: true, nome, desfazer() } ou { ok: false, error } */
  const TIPOS_BOLSA = ['pocao', 'bomba', 'runa', 'municao', 'material'];
  const tipoNaBolsa = x => (TIPOS_BOLSA.includes(x && x.t) ? x.t : 'material');
  function quemRecebeSaque() {
    if (!on || papel !== 'mestre') return [];
    const naCena = new Set(Store.scene().tokens.map(t => t.char).filter(Boolean));
    return chars().filter(l => l.ficha != null && !ehPet(l) && pesoDa(l) < 2 && !(l.estado && l.estado.toldo))
      .map(l => ({ id: l.id, nome: String(l.nome || 'Sem nome'), naCena: naCena.has(l.id), jog: deJogador(l) }))
      .sort((a, b) => (b.naCena - a.naCena) || (b.jog - a.jog));
  }
  /* (lote 33) a peça que caiu de um inimigo, como entra nos itens da ficha: os bônus, as defesas específicas e as barras
     (pelo nome: o HP de quem recebe) */
  function equipDoSaque(eq, ficha) {
    const o = {};
    if (!eq || typeof eq !== 'object') return o;
    const chaves = R() ? R().CHAVES_BONUS : [];
    const b = {}; for (const k of chaves) b[k] = Math.round(Number(eq.bonus && eq.bonus[k]) || 0);
    o.bonus = b;
    if (eq.def && typeof eq.def === 'object') o.def = Object.assign({}, eq.def);
    if (eq.recN && typeof eq.recN === 'object') {
      const recs = Array.isArray(ficha && ficha.recursos) ? ficha.recursos : [], rec = {};
      for (const nome of Object.keys(eq.recN)) { const r = recs.find(x => x && x.id != null && norm(x.nome) === norm(nome)); if (r) rec[String(r.id)] = Math.round(Number(eq.recN[nome]) || 0); }
      if (Object.keys(rec).length) o.rec = rec;
    }
    if (eq.tipo) o.tipo = eq.tipo;
    if (eq.efeito) o.efeito = eq.efeito;
    return o;
  }
  function entregarSaque(charId, saque) {
    const l = get(charId);
    if (!on || papel !== 'mestre' || !l || l.ficha == null) return { ok: false, error: 'A ficha de quem recebe não está aqui.' };
    const itens = Array.isArray(saque && saque.itens) ? saque.itens : [], lapros = Math.max(0, Math.round(Number(saque && saque.lapros) || 0));
    if (!itens.length && !lapros) return { ok: false, error: 'Não há nada para entregar.' };
    const f0 = l.ficha, e0 = l.estado || {};
    const bolsa = Array.isArray(f0.bolsa) ? f0.bolsa.slice() : [], equip = Array.isArray(f0.itens) ? f0.itens.slice() : [], qtd = Object.assign({}, e0.qtd || {});
    const somou = new Map(), novosB = new Set(), novosI = new Set();
    for (const it of itens) {
      const nome = String(it.nome == null ? 'Item' : it.nome).trim().slice(0, 80) || 'Item', q = clamp(Math.round(Number(it.qtd) || 1), 1, 9999);
      if (it.tipo === 'equip') { for (let i = 0; i < Math.min(q, 20); i++) { const x = Object.assign(equipDoSaque(it.eq, f0), { id: uid('it'), nome, equipado: false }); equip.push(x); novosI.add(x.id); } continue; }
      const tp = TIPOS_BOLSA.includes(it.tipo) ? it.tipo : 'material';
      let b = bolsa.find(x => x && x.id != null && tipoNaBolsa(x) === tp && norm(x.nome) === norm(nome));
      if (!b) { b = { id: uid('bo'), t: tp, nome }; bolsa.push(b); novosB.add(b.id); }
      const id = String(b.id);
      qtd[id] = Math.max(0, Math.floor(Number(qtd[id]) || 0)) + q;
      somou.set(id, (somou.get(id) || 0) + q);
    }
    const lap0 = Math.max(0, Math.round(Number(e0.lapros) || 0));
    P.gravar(charId, { ficha: Object.assign({}, f0, { bolsa, itens: equip }), estado: Object.assign({}, e0, { qtd }, lapros ? { lapros: lap0 + lapros } : {}) });
    return { ok: true, nome: String(l.nome || 'Sem nome'), desfazer: () => {
      const a = get(charId);
      if (!a || a.ficha == null) return false;
      const e1 = a.estado || {}, q1 = Object.assign({}, e1.qtd || {});
      for (const [id, n] of somou) { const v = Math.max(0, Math.floor(Number(q1[id]) || 0) - n); if (v > 0 || !novosB.has(id)) q1[id] = v; else delete q1[id]; }
      const b1 = (Array.isArray(a.ficha.bolsa) ? a.ficha.bolsa : []).filter(x => !(x && novosB.has(String(x.id)) && !(q1[String(x.id)] > 0)));
      const i1 = (Array.isArray(a.ficha.itens) ? a.ficha.itens : []).filter(x => !(x && novosI.has(x.id)));
      const est = Object.assign({}, e1, { qtd: q1 });
      if (lapros) est.lapros = Math.max(0, Math.round(Number(e1.lapros) || 0) - lapros);
      P.gravar(charId, { ficha: Object.assign({}, a.ficha, { bolsa: b1, itens: i1 }), estado: est });
      return true;
    } };
  }
  /* ---- as bolsas do personagem, usadas pelo token ----
     Quem pode: o mestre, em qualquer token ligado a uma ficha; o jogador, no token do personagem que é dele. */
  function podeBolsa(t) {
    const l = t && t.char ? get(t.char) : null;
    return !!l && l.ficha != null && !ehPet(l) && !!R() && !!R().bolsa && (papel === 'mestre' ? on : !!eu && l.dono_id === eu);      // (o pet não tem bolsa)
  }
  // → os itens da bolsa (com a quantidade) ou null se este token não dá acesso a uma
  function bolsa(t) {
    if (!podeBolsa(t)) return null;
    const l = get(t.char);
    return R().bolsa(pcDe(l), l.estado || {});
  }
  // o que usar o item vai fazer, em palavras (lista vazia: só gasta uma unidade). `alvo`: o token de quem recebe.
  function previaUso(t, id, alvo) {
    if (!podeBolsa(t)) return [];
    const l = get(t.char), pc = pcDe(l), est = l.estado || {};
    const it = R().bolsa(pc, est).find(x => x.id === id);
    if (!it) return [];
    const q = alvo ? quemRecebe(t.char, alvo) : { mesmo: true };
    // num token sem ficha, os bônus não valem (não há ficha onde guardá-los): ficam fora da prévia, com o aviso
    const semBonus = q.barras && it.fx.some(e => e.k === 'bonus' && e.bk && e.bv), it2 = q.barras ? Object.assign({}, it, { fx: it.fx.filter(e => e.k !== 'bonus') }) : it;
    const p = R().previaDoUso(pc, R().calcular(pc, cfg(), extra(l)), est, it2, q.mesmo ? null : q, { semValores: alvo ? semValoresPara(t.char, alvo, q) : false });
    if (semBonus) p.push('o bônus não vale num token sem ficha');
    return p;
  }
  /* ---- os ferimentos do personagem do token ---- */
  const feridasDaLinha = l => (l && l.estado && l.estado.fer && R() && R().ferimentos ? l.estado.fer : null);
  // a lista (do mais antigo para o mais novo); vazia se o token não tem ficha, ou se quem olha não a recebe
  function feridas(t) { const f = feridasDaLinha(t && t.char ? get(t.char) : null); return f ? R().ferimentos(f).lista : []; }
  // os membros amputados (os marcados; a parte de baixo que foi junto não repete): [{ p, nome, n }]
  function amputados(t) {
    const l = t && t.char ? get(t.char) : null;
    if (!l || !l.estado || !l.estado.amp || !R() || typeof R().amputados !== 'function') return [];
    const a = R().amputados(l.estado);
    return R().PARTES.filter(p => a[p.k] && !a[p.k].de).map(p => ({ p: p.k, nome: p.nome, n: a[p.k].n }));
  }
  // o sinal do token: { n, grave, sangra, inf } ou null. (Guardado por linha: o desenho do mapa pede isto a cada quadro.)
  const sinais = new WeakMap();
  function ferido(t) {
    const l = t && t.char ? get(t.char) : null, f = feridasDaLinha(l);
    if (!f) return null;
    let s = sinais.get(l);
    if (!s) { s = R().sinalDeFerido(f); sinais.set(l, s); }
    return s.n ? s : null;
  }
  /* Usa um item da bolsa do personagem do token `t`: em quem tem (sem `alvo`) ou no token `alvo`. Rola os dados de cada
     efeito, aplica (o mestre, aqui mesmo; o jogador pede ao mestre, que aplica — a não ser que seja nele mesmo, sem
     condição: aí grava direto na ficha dele) e avisa a mesa. → { ok:false, error } | { ok:true, texto, desfazer?, pedido? } */
  function usar(t, id, alvo) {
    if (!podeBolsa(t)) return { ok: false, error: 'Este token não dá acesso a uma bolsa.' };
    const charId = t.char, l = get(charId), pc = pcDe(l), antes = l.estado || {};
    const it = R().bolsa(pc, antes).find(x => x.id === id);
    if (!it) return { ok: false, error: 'Este item não está mais na bolsa.' };
    if (it.qtd < 1) return { ok: false, error: 'Não há mais ' + (it.nome || 'deste item') + ' na bolsa.' };
    const tk = alvo || t, ro = rolarEfeitos(it);
    if (ro.erro) return { ok: false, error: ro.erro };
    const tipo = (R().BOLSAS.find(b => b.t === it.t) || {}).um || 'Item', nome = it.nome || tipo;
    const q = quemRecebe(charId, tk), sv = semValoresPara(charId, tk, q), em = q.mesmo ? '' : ' em ' + tokName(tk);
    const titulo = (l.nome || t.name || '?') + ' · ' + nome + em, oculto = !!(t.hidden || t.showName === false || tk.hidden || tk.showName === false);
    const total = it.fx.find(e => e.k === 'barra' && R().lerEfeito(e.val) && R().lerEfeito(e.val).dados) ? ro.rolados.find(x => x != null) : null;
    // o jogador: no próprio personagem e sem condição, grava direto na ficha dele; senão, o mestre aplica (pedido)
    if (papel !== 'mestre') {
      if (!(q.mesmo && !it.fx.some(e => e.k === 'cond' && e.c))) {
        if (!Nuvem.usarItem || !Nuvem.usarItem({ t: 'item', de: charId, item: it.id, alvo: tk.id, rol: ro.rolados })) return { ok: false, error: 'Para usar a bolsa em outro token, a cena precisa estar no ar.' };
        const p = previaUso(t, it.id, tk);
        // (o texto vai já, com o que foi rolado; o mestre aplica em seguida)
        const conta = ro.contas.length ? ' · ' + ro.contas.join(' · ') : '';
        avisarUso(t, charId, titulo, 'usou ' + nome + em + conta + ' · ' + p.map(x => x.replace(/, rolad[oa] na hora/, '')).join(' · '), total, ro.dd, oculto);
        return { ok: true, texto: nome + em + ': pedido ao mestre (aplica em seguida)', pedido: true };
      }
      const u = R().usarItem(pc, R().calcular(pc, cfg(), extra(l)), antes, id, ro.rolados, Date.now(), uid('t'));
      if (!u.ok) return { ok: false, error: u.erro };
      P.gravar(charId, { estado: u.estado });
      const texto = R().textoDoUso(u);
      avisarUso(t, charId, titulo, 'usou ' + nome + (ro.contas.length ? ' · ' + ro.contas.join(' · ') : '') + ' · ' + texto, total, ro.dd, oculto);
      return { ok: true, texto: nome + ': ' + texto, desfazer: () => {
        const agora = get(charId); if (!agora) return false;
        const e = Object.assign({}, agora.estado || {}), qtd = Object.assign({}, e.qtd || {}), rec = Object.assign({}, e.rec || {}), sob = Object.assign({}, e.sob || {}), tmp = Object.assign({}, e.tmp || {}), pd = Object.assign({}, e.pd || {});
        qtd[it.id] = Math.max(0, Math.floor(Number(qtd[it.id]) || 0)) + 1;
        for (const f of u.efeitos) {
          if (f.k === 'barra' && f.tipo === 'rec') { const tinha = antes.rec && antes.rec[f.id] != null; if (Number(rec[f.id]) === f.para) { if (tinha) rec[f.id] = antes.rec[f.id]; else delete rec[f.id]; } else if (rec[f.id] != null) rec[f.id] = Math.round((Number(rec[f.id]) - (f.para - f.de)) * 10) / 10; }
          else if (f.k === 'barra' && f.tipo === 'pd') pd[f.id] = f.de;
          else if (f.k === 'sob') { if (antes.sob && antes.sob[f.id] != null) sob[f.id] = antes.sob[f.id]; else delete sob[f.id]; }
          else if (f.k === 'bonus') delete tmp[f.id];
        }
        P.gravar(charId, { estado: Object.assign(e, { qtd, rec, sob, tmp, pd }) });
        avisarUso(t, charId, titulo, 'desfeito: ' + nome + ' voltou para a bolsa' + (u.efeitos.length ? ' e o efeito saiu' : ''), null, null, oculto);
        return true;
      } };
    }
    const r = aplicarUso(charId, id, tk, ro.rolados);
    if (!r.ok) return r;
    const texto = R().textoDoUso(r.u, { semValores: sv }) + (r.u.semBonus ? ' · o bônus não vale num token sem ficha' : '');
    avisarUso(t, charId, titulo, 'usou ' + nome + em + (ro.contas.length ? ' · ' + ro.contas.join(' · ') : '') + ' · ' + texto, total, ro.dd, oculto);
    return { ok: true, texto: nome + em + ': ' + R().textoDoUso(r.u), desfazer: () => {
      if (!r.desfazer()) return false;
      avisarUso(t, charId, titulo, 'desfeito: ' + nome + ' voltou para a bolsa' + (r.u.efeitos.length || r.u.conds.length ? ' e o efeito saiu' : ''), null, null, oculto);
      return true;
    } };
  }
  /* O pedido de um jogador (no aparelho do mestre que transmite): usar um item da bolsa do personagem dele num token
     da cena no ar. Confere tudo antes de aplicar; o que não confere é ignorado. */
  function usoPedido(quem, op, sc) {
    if (!on || !R() || !op || typeof op.de !== 'string' || typeof op.item !== 'string' || typeof op.alvo !== 'string') return false;
    const l = get(op.de);
    if (!l || l.ficha == null || l.dono_id !== quem) return false;                      // só a bolsa dos personagens dele
    const it = R().bolsa(pcDe(l), l.estado || {}).find(x => x.id === op.item);
    if (!it || it.qtd < 1 || !conferirRolados(it, op.rol)) return false;
    const alvo = sc.tokens.find(x => x.id === op.alvo);
    if (!alvo || alvo.hidden || alvo.prop) return false;                                // só um token que ele vê
    const r = aplicarUso(op.de, op.item, alvo, op.rol, { pedido: true, cena: sc.id });
    return !!r.ok;
  }

  async function start(refresh) {
    const T = window.TC;
    if (!T || !T.ponte || !T.dados || !T.rules || !T.dice) return false;
    const st = await T.ponte.pronta;
    if (!T.dados.disponivel()) return false;
    papel = st.papel; eu = st.eu || null;
    /* Só o mestre liga token a ficha. O jogador consulta as fichas que pode ver (para abrir a dele pelo token) e usa
       a bolsa do personagem dele: para isso lê também as tabelas da mesa (as contas da ficha precisam delas). */
    if (st.papel !== 'mestre') {
      try { const p = T.dados.col('personagens'); await p.pronta; P = p; } catch (e) { P = null; }
      try { const d = T.dados.col('documentos'); await d.pronta; D = d; } catch (e) { D = null; }
      if (P) P.aoMudar(() => refresh());
      if (D) D.aoMudar(l => { if (l && typeof l.id === 'string' && l.id.startsWith('fichas:corr:')) refresh(); });      // (lote 37) a aura da corrupção
      return false;
    }
    try {
      P = T.dados.col('personagens'); D = T.dados.col('documentos');
      await Promise.all([P.pronta, D.pronta]);
    } catch (e) { console.error(e); return false; }
    on = true;
    Store.on('live', onLive);
    Store.on('scene', () => syncAll());
    P.aoMudar(l => { if (!l.apagado) syncAll(l.id); refresh(); });
    D.aoMudar(l => { if (l.id === 'fichas:cfg' || l.id === 'arvore:biblioteca' || l.id === 'arvore:pacote') { syncAll(); refresh(); } else if (typeof l.id === 'string' && l.id.startsWith('fichas:corr:')) refresh(); });
    syncAll();
    refresh();
    return true;
  }
  /* (lote 37) A corrupção do personagem do token (ver tc/corrupcao.js): { tipo, n, cor } ou null. O documento dela tem o
     dono do personagem como dono: só chega a quem mestra e a esse jogador — para os outros, nada (nem a aura). */
  function corrDoTok(t) {
    const Cx = window.TC && window.TC.corrupcao;
    if (!Cx || !t || !t.char || !D) return null;
    const d = D.pegar(Cx.docId(t.char));
    if (!d || d.apagado || !d.dados) return null;
    const l = get(t.char);
    const e = Cx.estado(d.dados, (l && l.skills) || {}, bib(), cfg());
    return e && e.n ? { tipo: e.tipo, n: e.n, cor: Cx.TIPOS[e.tipo].cor } : null;
  }
  return { corrDoTok, start, on: () => on, chars, get, link, barrasDeArvore, linhaBest, linhaBestTok, contasTok, ligado, contasBest, novoTokenBest, quemRecebeSaque, entregarSaque, membrosParaFicha, copiarFicha, abrir, syncAll, syncToken, paraFicha, falta, foraDaFicha, usarBarras, rolaveis, fixaPadrao, rolar, imagemDe, podeBolsa, bolsa, previaUso, usar, usoPedido, feridas, ferido, amputados,
    podeRolar, defesas, donoDe, donoDoToken, donoQueJoga, novoToken, numeros, mente, mudarMente, fadiga, mudarFadiga, previaMente, mexerEmTodos, voltarMente, deJogadorT, podeEquipar, itens, equipar, maximoParaFicha, papel: () => papel, eu: () => eu, vejoTodas, escondida,
    rotulo, campDa, vista, nomeDaCampanha,
    // o que ainda esperava para ir "às cegas" vai agora (a página está fechando)
    flush() { for (const id of [...cegas.keys()]) mandarCegas(id); } };
})();
