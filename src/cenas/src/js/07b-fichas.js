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
  const ROLAVEIS = ['FOR', 'DES', 'VIT', 'CAN', 'AGI', 'ESQ', 'FUR', 'PER', 'DFF', 'DFM'];
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
  // As barras do token, atualizadas pela ficha. Devolve null se nada muda.
  function barrasDe(t, r) {
    const bars = t.bars.map(b => Object.assign({}, b));
    let mudou = false;
    for (const rec of r.recursos) {
      if (rec.max == null || !isFinite(rec.max)) continue;
      let b = bars.find(x => x.ref === rec.id) || bars.find(x => !x.ref && norm(x.n) === norm(rec.nome));
      if (!b) {
        if (bars.length >= MAX_BARS) continue;
        b = cleanBar({ n: rec.nome, c: BAR_COLORS[bars.length % BAR_COLORS.length], v: rec.atual, m: rec.max, k: 'bar', on: true, vis: '' });
        bars.push(b); mudou = true;
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
    }
    for (const b of bars) if (b.ref && !r.recursos.some(x => x.id === b.ref)) { delete b.ref; mudou = true; }   // recurso saiu da ficha: vira barra comum
    return mudou ? bars : null;
  }
  /* As barras de um token que segue uma ficha são as da ficha, na ordem dela: cada recurso com máximo vira uma barra
     ligada, à mostra. Uma barra que o token já tinha do mesmo recurso — ou com o mesmo nome — empresta o jeito dela
     (cor, estilo, quem vê); as outras saem (a "Vida" de fábrica, por exemplo). Devolve null se a ficha não tem
     recurso nenhum: aí o token fica como está. */
  function soDaFicha(t, r) {
    const out = [];
    for (const rec of r.recursos) {
      if (rec.max == null || !isFinite(rec.max) || out.length >= MAX_BARS) continue;
      const velha = t.bars.find(x => x.ref === rec.id) || t.bars.find(x => !x.ref && norm(x.n) === norm(rec.nome));
      out.push(cleanBar(Object.assign({ c: BAR_COLORS[out.length % BAR_COLORS.length] }, velha,
        { n: String(rec.nome || 'Barra').slice(0, 24), v: rec.atual, m: rec.max, on: true, ref: rec.id, x: Math.max(0, Number(rec.sobre) || 0), lo: pisoDe(rec), st: comecoDe(rec) })));
    }
    return out.length ? out : null;
  }
  // A ficha inteira deste token, se ela está aqui (uma linha que chegou incompleta não serve para acertar nada).
  const fichaDe = t => { const l = get(t.char); return l && l.ficha != null ? l : null; };
  // O token ligado tem barras que não são da ficha, ou falta alguma dela?
  function foraDaFicha(t) {
    const l = fichaDe(t), alvo = l ? soDaFicha(t, resumo(l)) : null;
    return !!alvo && (alvo.length !== t.bars.length || !t.bars.every(b => b.ref && alvo.some(a => a.ref === b.ref)));
  }
  // Deixa o token só com as barras da ficha (um passo de desfazer).
  function usarBarras(t) {
    const l = fichaDe(t), bars = l ? soDaFicha(t, resumo(l)) : null;
    if (!bars) return false;
    Store.tx('Barras da ficha', () => Store.upd('tokens', t.id, { bars }));
    return true;
  }
  // O que a ficha muda no token (barras, iniciativa, imagem); null se nada.
  function remendo(t) {
    const l = fichaDe(t);
    if (!l) return null;
    const r = resumo(l), p = {};
    const bars = barrasDe(t, r);
    if (bars) p.bars = bars;
    if (String((l.ficha && l.ficha.ini) || '').trim() !== '' && clampIni(r.ini) !== t.ini) p.ini = clampIni(r.ini);
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
    for (const sc of cenas) for (const t of sc.tokens.slice()) if (t.char && (!charId || t.char === charId) && syncToken(t, sc.id)) n++;
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
    if (T && typeof T.barrasDaFicha === 'function') T.barrasDaFicha(id, e.rec, e.sob);
  }
  function paraFichaAsCegas(t) {
    const T = window.TC && window.TC.ponte;
    if (!escondida(t) || !T || typeof T.barrasDaFicha !== 'function') return false;
    const e = cegas.get(t.char) || { rec: {}, sob: {}, t: 0 };
    let n = 0;
    for (const b of t.bars) {
      if (!b.ref) continue;
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
    if (!on || !t || !t.char) return false;
    const l = get(t.char);
    if (!l) { paraFichaAsCegas(t); return false; }          // (a ficha não está aqui: se é das escondidas, as barras vão às cegas)
    const rec = Object.assign({}, (l.estado && l.estado.rec) || {}), sob = Object.assign({}, (l.estado && l.estado.sob) || {});
    let mudou = false;
    for (const b of t.bars) {
      if (!b.ref) continue;
      if (isFinite(b.v) && rec[b.ref] !== b.v) { rec[b.ref] = b.v; mudou = true; }
      const x = barX(b);
      if ((Number(sob[b.ref]) || 0) !== x) { if (x > 0) sob[b.ref] = x; else delete sob[b.ref]; mudou = true; }
    }
    if (!mudou) return false;
    P.gravar(t.char, { estado: Object.assign({}, l.estado || {}, { rec, sob }) });
    return true;
  }
  function onLive(op) {
    if (!on || applying || op.t !== 'upd' || op.c !== 'tokens' || !op.p || !op.p.bars) return;
    const t = Store.get('tokens', op.id);
    if (t && paraFicha(t)) syncAll(t.char);            // outro token do mesmo personagem nesta cena acompanha
  }
  /* Liga (ou desliga) o token a uma ficha. Ligado, o token passa a ter o nome do personagem e só as barras da ficha;
     e, se ele não tinha dono e a ficha é de um jogador da mesa, o jogador passa a ser o dono do token. Tudo no mesmo
     passo de desfazer (desfazer traz de volta o nome e as barras de antes). Devolve { dono } com o nome dele, se foi
     o caso. */
  function link(t, charId) {
    if (!charId) {
      // desligado, o token fica com o que tinha: as barras viram barras comuns e a imagem passa a ser dele
      Store.tx('Desligar da ficha', () => Store.upd('tokens', t.id, { char: null, imgChar: false, bars: t.bars.map(b => { const o = Object.assign({}, b); delete o.ref; return o; }) }));
      return {};
    }
    const l = get(charId), jog = l && l.dono_id && !t.owner ? playerById(l.dono_id) : null;
    const p = { char: charId };
    if (jog) p.owner = jog.id;
    if (l && l.ficha != null) {
      const nome = String(l.nome || '').trim().slice(0, 60), bars = soDaFicha(t, resumo(l));
      if (nome) p.name = nome;
      if (bars) p.bars = bars;
    }
    Store.tx('Ligar à ficha', () => Store.upd('tokens', t.id, p));
    const now = Store.get('tokens', t.id);
    if (now) syncToken(now);
    return { dono: jog ? jog.name : null };
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
    const l = get(t.char);
    if (!l) return [];
    const pc = pcDe(l), c = R().calcular(pc, cfg(), extra(l)), fonte = (pc.rol && pc.rol.fonte) || 'total';
    return ROLAVEIS.map(k => [k, R().NOMES[k] || k, Math.max(0, Math.round(R().valorDoAtributo(c, k, fonte) || 0))]);
  }
  const fixaPadrao = t => { const l = get(t.char); return l && l.ficha && l.ficha.rol ? Math.max(0, Math.round(+l.ficha.rol.fixa || 0)) : 0; };
  // Rola um atributo da ficha com a regra da fixa: um dado de (atributo − fixa) lados, mais a fixa.
  function rolar(t, chave, fixa) {
    const item = rolaveis(t).find(x => x[0] === chave);
    if (!item) return { ok: false, error: 'Este token não está ligado a uma ficha.' };
    const valor = item[2];
    if (valor < 1) return { ok: false, error: item[1] + ' está em 0: não há o que rolar.' };
    const r = window.TC.dice.rollFixa(valor, Math.min(Math.max(0, Math.round(+fixa || 0)), valor));
    if (!r.ok) return r;
    if (Ext.roll) { try { Ext.roll({ kind: 'atributo', name: t.name, tokenId: t.id, attr: chave, attrNome: item[1], atributo: r.atributo, fixa: r.fixa, d: r.dieValue, total: r.total }); } catch (e) { console.error(e); } }
    return Object.assign({ nome: item[1] }, r);
  }

  /* Quem pode rolar pela ficha deste token: o mestre, em qualquer token ligado; o jogador, no token do personagem
     que é dele (a ficha chega a ele pela mesa, e a rolagem sai no nome dele). */
  function podeRolar(t) {
    const l = t && t.char ? get(t.char) : null;
    return !!l && l.ficha != null && !!R() && (papel === 'mestre' ? on : !!eu && l.dono_id === eu);
  }
  /* As defesas da ficha deste token, pela chave: as duas gerais (DFF, DFM) e as 13 específicas (FOGO, CORTE…), já com
     equipamentos, árvore, bônus temporários e ferimentos. null se o token não tem ficha aqui. */
  function defesas(t) {
    const l = t && t.char ? fichaDe(t) : null;
    if (!l) return null;
    const r = resumo(l), out = {};
    for (const k in r.def) out[k] = Math.round(Number(r.def[k]) || 0);
    for (const k in r.defEsp) out[k] = Math.round(Number(r.defEsp[k]) || 0);
    return out;
  }
  // O jogador da mesa que é dono desta ficha (ou null: ficha do mestre, de NPC, ou de alguém que saiu da mesa).
  const donoDe = l => (l && l.dono_id ? playerById(l.dono_id) || null : null);
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
    const bars = soDaFicha(t, r);
    if (bars) t.bars = bars;
    if (String((l.ficha && l.ficha.ini) || '').trim() !== '') t.ini = clampIni(r.ini);
    return t;
  }

  /* ---- as bolsas do personagem, usadas pelo token ----
     Quem pode: o mestre, em qualquer token ligado a uma ficha; o jogador, no token do personagem que é dele. */
  function podeBolsa(t) {
    const l = t && t.char ? get(t.char) : null;
    return !!l && l.ficha != null && !!R() && !!R().bolsa && (papel === 'mestre' ? on : !!eu && l.dono_id === eu);
  }
  // → os itens da bolsa (com a quantidade) ou null se este token não dá acesso a uma
  function bolsa(t) {
    if (!podeBolsa(t)) return null;
    const l = get(t.char);
    return R().bolsa(pcDe(l), l.estado || {});
  }
  // o que usar o item vai fazer, em palavras (lista vazia: só gasta uma unidade)
  function previaUso(t, id) {
    if (!podeBolsa(t)) return [];
    const l = get(t.char), pc = pcDe(l), est = l.estado || {};
    const it = R().bolsa(pc, est).find(x => x.id === id);
    return it ? R().previaDoUso(pc, R().calcular(pc, cfg(), extra(l)), est, it) : [];
  }
  /* ---- os ferimentos do personagem do token ---- */
  const feridasDaLinha = l => (l && l.estado && l.estado.fer && R() && R().ferimentos ? l.estado.fer : null);
  // a lista (do mais antigo para o mais novo); vazia se o token não tem ficha, ou se quem olha não a recebe
  function feridas(t) { const f = feridasDaLinha(t && t.char ? get(t.char) : null); return f ? R().ferimentos(f).lista : []; }
  // o sinal do token: { n, grave, sangra, inf } ou null. (Guardado por linha: o desenho do mapa pede isto a cada quadro.)
  const sinais = new WeakMap();
  function ferido(t) {
    const l = t && t.char ? get(t.char) : null, f = feridasDaLinha(l);
    if (!f) return null;
    let s = sinais.get(l);
    if (!s) { s = R().sinalDeFerido(f); sinais.set(l, s); }
    return s.n ? s : null;
  }
  const semTotal = s => String(s || '').replace(/^[-−]?\d+ · /, '');
  // avisa a mesa ao vivo (a casca decide como mostrar); token oculto ou sem nome à mostra: só o mestre vê
  function avisarUso(t, charId, titulo, resumo, total, dd) {
    try { window.TC.ponte.publicar('cena', { kind: 'uso', titulo, resumo, total: total == null ? null : total, char: charId, oculto: !!(t && (t.hidden || t.showName === false)), dd: dd || [] }); } catch (e) { /* sem a casca não há mesa */ }
  }
  /* Usa um item da bolsa: gasta uma unidade, aplica o que a poção faz (rolando os dados, se for o caso), grava na
     ficha e avisa a mesa. Devolve { ok:false, error } ou { ok:true, texto, desfazer }. */
  function usar(t, id) {
    if (!podeBolsa(t)) return { ok: false, error: 'Este token não dá acesso a uma bolsa.' };
    const charId = t.char, l = get(charId), pc = pcDe(l), antes = l.estado || {};
    const it = R().bolsa(pc, antes).find(x => x.id === id);
    if (!it) return { ok: false, error: 'Este item não está mais na bolsa.' };
    const ef = it.t === 'pocao' && it.rec ? R().lerEfeito(it.val) : null;
    let rolado = null, conta = '', dd = [];
    if (ef && ef.dados) {
      const r = window.TC.dice.rollExpr(ef.dados);
      if (!r.ok) return { ok: false, error: r.error };
      rolado = r.total; conta = semTotal(window.TC.dice.summary({ mode: 'dados', expr: r.expr, terms: r.terms, total: r.total })) + ' = ' + r.total;
      dd = window.TC.dice.diceOf ? window.TC.dice.diceOf(r) : [];       // o que cada dado sorteou (para o auditor da mesa)
    }
    const u = R().usarItem(pc, R().calcular(pc, cfg(), extra(l)), antes, id, rolado, Date.now(), uid('t'));
    if (!u.ok) return { ok: false, error: u.erro };
    P.gravar(charId, { estado: u.estado });
    if (on) syncAll(charId);                               // (no aparelho do mestre, a barra do token acompanha já)
    const tipo = (R().BOLSAS.find(b => b.t === it.t) || {}).um || 'Item', nome = it.nome || tipo;
    const titulo = (l.nome || t.name || '?') + ' · ' + nome, texto = R().textoDoUso(u);
    avisarUso(t, charId, titulo, 'usou ' + nome + (conta ? ' · ' + conta : '') + ' · ' + texto, u.barra && rolado != null ? rolado : null, dd);
    const desfazer = () => {
      // só o que este uso mexeu volta (o que mudou no personagem nesse meio-tempo, por outro caminho, fica)
      const agora = get(charId); if (!agora) return false;
      const e = agora.estado || {}, qtd = Object.assign({}, e.qtd || {}), rec = Object.assign({}, e.rec || {}), tmp = Object.assign({}, e.tmp || {});
      qtd[it.id] = Math.max(0, Math.floor(Number(qtd[it.id]) || 0)) + 1;
      if (u.barra) {
        const tinha = antes.rec && antes.rec[u.barra.id] != null;
        if (Number(rec[u.barra.id]) === u.barra.para) { if (tinha) rec[u.barra.id] = antes.rec[u.barra.id]; else delete rec[u.barra.id]; }
        else if (rec[u.barra.id] != null) rec[u.barra.id] = Math.round((Number(rec[u.barra.id]) - (u.barra.para - u.barra.de)) * 10) / 10;
      }
      if (u.bonus) delete tmp[u.bonus.id];
      P.gravar(charId, { estado: Object.assign({}, e, { qtd, rec, tmp }) });
      if (on) syncAll(charId);
      avisarUso(t, charId, titulo, 'desfeito: ' + nome + ' voltou para a bolsa' + (u.barra ? ' e ' + u.barra.nome + ' voltou ao que era' : '') + (u.bonus ? '; o bônus saiu' : ''), null);
      return true;
    };
    return { ok: true, texto: nome + ': ' + texto, desfazer };
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
    D.aoMudar(l => { if (l.id === 'fichas:cfg' || l.id === 'arvore:biblioteca' || l.id === 'arvore:pacote') { syncAll(); refresh(); } });
    syncAll();
    refresh();
    return true;
  }
  return { start, on: () => on, chars, get, link, abrir, syncAll, syncToken, paraFicha, falta, foraDaFicha, usarBarras, rolaveis, fixaPadrao, rolar, imagemDe, podeBolsa, bolsa, previaUso, usar, feridas, ferido,
    podeRolar, defesas, donoDe, donoDoToken, donoQueJoga, novoToken, papel: () => papel, eu: () => eu, vejoTodas, escondida,
    rotulo, campDa, vista, nomeDaCampanha,
    // o que ainda esperava para ir "às cegas" vai agora (a página está fechando)
    flush() { for (const id of [...cegas.keys()]) mandarCegas(id); } };
})();
