/* ---------------------------------------------------------------
   7b. FICHAS — o token ligado à ficha do personagem
   Só existe dentro do site, com uma mesa aberta (a ponte entrega os personagens da mesa).
   O token aponta para um personagem (t.char). A ficha manda: cada recurso dela (HP, SP…) vira uma
   barra do token, com o máximo calculado pelas fórmulas e o valor atual (e a sobrevida) anotados na ficha;
   o bônus de iniciativa vem da fórmula de iniciativa da ficha, quando ela tem uma; e a imagem do
   personagem vira a imagem do token (a não ser que o mestre escolha outra para este token).
   Na volta, mexer numa dessas barras no mapa (dano, cura, área, reaplicar, desfazer) grava o valor
   atual na ficha. Também dá para rolar um atributo da ficha direto do token, com a regra da fixa.
   --------------------------------------------------------------- */
const Fichas = (() => {
  let P = null, D = null, on = false, applying = false;
  const R = () => window.TC.rules;
  const ROLAVEIS = ['FOR', 'DES', 'VIT', 'CAN', 'AGI', 'ESQ', 'FUR', 'PER', 'DFF', 'DFM'];
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const cfg = () => { const d = D && D.pegar('fichas:cfg'); return (d && d.dados && d.dados.v) || R().cfgPadrao(); };
  const get = id => (P && id ? P.pegar(id) : null);
  const chars = () => (P ? P.todas().slice().sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')) : []);
  const pcDe = l => Object.assign({}, l.ficha || {}, { id: l.id, nome: l.nome });
  // a imagem do personagem, quando está guardada no banco (endereço https)
  const imagemDe = l => (l && l.ficha && typeof l.ficha.img === 'string' && /^https:\/\//.test(l.ficha.img) ? l.ficha.img : null);
  // bônus dos nódulos escolhidos na árvore (a biblioteca da mesa, quando existe)
  const bib = () => { const d = D && D.pegar('arvore:biblioteca'); return d && d.dados && Array.isArray(d.dados.arvores) ? d.dados : null; };
  const extra = l => ({ arvore: R().bonusDaArvore(l.skills, bib()) });
  const resumo = l => R().resumo(pcDe(l), cfg(), extra(l), l.estado || {});

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
    }
    for (const b of bars) if (b.ref && !r.recursos.some(x => x.id === b.ref)) { delete b.ref; mudou = true; }   // recurso saiu da ficha: vira barra comum
    return mudou ? bars : null;
  }
  // ficha → token (não entra no desfazer: quem manda é a ficha). `cena`: o id da cena do token (a aberta, se não vier).
  function syncToken(t, cena) {
    const l = get(t.char);
    if (!l) return false;
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
    if (!Object.keys(p).length) return false;
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
  // token → ficha: o valor atual (e a sobrevida) das barras ligadas. Serve para um token de qualquer cena da mesa.
  function paraFicha(t) {
    if (!on || !t || !t.char) return false;
    const l = get(t.char);
    if (!l) return false;
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
  /* Liga (ou desliga) o token a uma ficha. Ao ligar um token sem dono a uma ficha que é de um jogador da mesa, o
     jogador passa a ser o dono do token, no mesmo passo de desfazer. Devolve { dono } com o nome dele, se foi o caso. */
  function link(t, charId) {
    if (!charId) {
      // desligado, o token fica com o que tinha: as barras viram barras comuns e a imagem passa a ser dele
      Store.tx('Desligar da ficha', () => Store.upd('tokens', t.id, { char: null, imgChar: false, bars: t.bars.map(b => { const o = Object.assign({}, b); delete o.ref; return o; }) }));
      return {};
    }
    const l = get(charId), jog = l && l.dono_id && !t.owner ? playerById(l.dono_id) : null;
    Store.tx('Ligar à ficha', () => Store.upd('tokens', t.id, jog ? { char: charId, owner: jog.id } : { char: charId }));
    const now = Store.get('tokens', t.id);
    if (now) syncToken(now);
    return { dono: jog ? jog.name : null };
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

  async function start(refresh) {
    const T = window.TC;
    if (!T || !T.ponte || !T.dados || !T.rules || !T.dice) return false;
    const st = await T.ponte.pronta;
    if (!T.dados.disponivel() || st.papel !== 'mestre') return false;      // por enquanto, só o mestre liga token a ficha
    try {
      P = T.dados.col('personagens'); D = T.dados.col('documentos');
      await Promise.all([P.pronta, D.pronta]);
    } catch (e) { console.error(e); return false; }
    on = true;
    Store.on('live', onLive);
    Store.on('scene', () => syncAll());
    P.aoMudar(l => { if (!l.apagado) syncAll(l.id); refresh(); });
    D.aoMudar(l => { if (l.id === 'fichas:cfg' || l.id === 'arvore:biblioteca') { syncAll(); refresh(); } });
    syncAll();
    refresh();
    return true;
  }
  return { start, on: () => on, chars, get, link, syncAll, paraFicha, rolaveis, fixaPadrao, rolar, imagemDe };
})();
