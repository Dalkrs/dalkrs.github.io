/* ---------------------------------------------------------------
   7b. FICHAS — o token ligado à ficha do personagem
   Só existe dentro do site, com uma mesa aberta (a ponte entrega os personagens da mesa).
   O token aponta para um personagem (t.char). A ficha manda: cada recurso dela (HP, SP…) vira uma
   barra do token, com o máximo calculado pelas fórmulas e o valor atual anotado na ficha; e o bônus
   de iniciativa vem da fórmula de iniciativa da ficha, quando ela tem uma.
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
  const resumo = l => R().resumo(pcDe(l), cfg(), null, l.estado || {});

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
    }
    for (const b of bars) if (b.ref && !r.recursos.some(x => x.id === b.ref)) { delete b.ref; mudou = true; }   // recurso saiu da ficha: vira barra comum
    return mudou ? bars : null;
  }
  // ficha → token (não entra no desfazer: quem manda é a ficha)
  function syncToken(t) {
    const l = get(t.char);
    if (!l) return false;
    const r = resumo(l), p = {};
    const bars = barrasDe(t, r);
    if (bars) p.bars = bars;
    if (String((l.ficha && l.ficha.ini) || '').trim() !== '' && clampIni(r.ini) !== t.ini) p.ini = clampIni(r.ini);
    if (!Object.keys(p).length) return false;
    applying = true;
    try { Store.remote({ t: 'upd', c: 'tokens', id: t.id, p }); } finally { applying = false; }
    return true;
  }
  function syncAll(charId) {
    if (!on) return;
    let n = 0;
    for (const t of Store.scene().tokens.slice()) if (t.char && (!charId || t.char === charId) && syncToken(t)) n++;
    return n;
  }
  // token → ficha: o valor atual das barras ligadas
  function onLive(op) {
    if (!on || applying || op.t !== 'upd' || op.c !== 'tokens' || !op.p || !op.p.bars) return;
    const t = Store.get('tokens', op.id);
    if (!t || !t.char) return;
    const l = get(t.char);
    if (!l) return;
    const rec = Object.assign({}, (l.estado && l.estado.rec) || {});
    let mudou = false;
    for (const b of t.bars) if (b.ref && isFinite(b.v) && rec[b.ref] !== b.v) { rec[b.ref] = b.v; mudou = true; }
    if (!mudou) return;
    P.gravar(t.char, { estado: Object.assign({}, l.estado || {}, { rec }) });
    syncAll(t.char);            // outro token do mesmo personagem nesta cena acompanha
  }
  function link(t, charId) {
    if (!charId) {
      Store.tx('Desligar da ficha', () => Store.upd('tokens', t.id, { char: null, bars: t.bars.map(b => { const o = Object.assign({}, b); delete o.ref; return o; }) }));
      return;
    }
    Store.tx('Ligar à ficha', () => Store.upd('tokens', t.id, { char: charId }));
    const now = Store.get('tokens', t.id);
    if (now) syncToken(now);
  }
  // O que dá para rolar pela ficha deste token: [chave, nome, valor]
  function rolaveis(t) {
    const l = get(t.char);
    if (!l) return [];
    const pc = pcDe(l), c = R().calcular(pc, cfg(), null), fonte = (pc.rol && pc.rol.fonte) || 'total';
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
    D.aoMudar(l => { if (l.id === 'fichas:cfg') { syncAll(); refresh(); } });
    syncAll();
    refresh();
    return true;
  }
  return { start, on: () => on, chars, get, link, syncAll, rolaveis, fixaPadrao, rolar };
})();
