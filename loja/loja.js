/* Tiny Cats · Loja (lote 29): a aba de quem joga.
   Aparece quando o grupo de um personagem seu para no hexágono de uma loja do Mapa-múndi (o mestre liga o grupo às fichas
   e monta a loja na aba Itens). Cada loja por perto, com os itens em cartões: o preço, o estoque e o que o item faz.
   Comprar passa pelo banco (TC.ponte.itens): ele confere que o personagem é seu, que está perto, o estoque e os lapros, e
   muda a ficha e a loja juntas. Cada compra tem Desfazer (por 15 minutos); o mestre vê as compras no Jornal. */
(() => {
  'use strict';
  const I = window.TC.itens, R = window.TC.rules;
  const DEBUG = /[?&]debug\b/.test(location.search);
  const $ = id => document.getElementById(id);
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el[k] = v;
      else if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c);
    return el;
  }
  const trocar = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(c => c != null && c !== false));
  function toast(texto, acao, fn, ms) {
    const t = h('div', { class: 'toast' }, h('span', { text: texto }));
    if (acao) t.append(h('button', { type: 'button', text: acao, onclick: () => { t.remove(); fn(); } }));
    $('toasts').append(t);
    while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
    let relogio = setTimeout(() => t.remove(), ms || (acao ? 10000 : 4200));
    t.addEventListener('pointerenter', () => clearTimeout(relogio));
    t.addEventListener('pointerleave', () => { clearTimeout(relogio); relogio = setTimeout(() => t.remove(), 2500); });
  }
  const COR_TIPO = { pocao: '#c25b6e', bomba: '#c9743e', runa: '#7d6bd1', municao: '#8a8f9c', material: '#5fa37a', equip: '#d9a441' };
  const SIGLA = { pocao: 'PO', bomba: 'BO', runa: 'RU', municao: 'MU', material: 'MA', equip: 'EQ' };

  let st = null, D = null, P = null, naMesa = false, pronto = false, ocupado = false;
  const qtds = new Map(), escolhido = new Map();          // (a quantidade de cada cartão; o personagem escolhido em cada loja)
  const eu = () => (st && st.eu) || null;
  // as lojas abertas com um personagem meu por perto: [{ id, l, meus: [linha] }]
  function lojas() {
    if (!naMesa) return [];
    const meus = P.todas().filter(l => l && !l.apagado && ehObj(l.ficha) && eu() && l.dono_id === eu());
    const out = [];
    for (const d of D.todas()) {
      if (typeof d.id !== 'string' || !d.id.startsWith(I.PRE_LOJA) || d.apagado || !ehObj(d.dados)) continue;
      const l = I.loja(d.dados);
      if (!l.aberta) continue;
      const aqui = meus.filter(m => l.aqui.includes(m.id));
      if (aqui.length) out.push({ id: d.id.slice(I.PRE_LOJA.length), l, meus: aqui });
    }
    return out.sort((a, b) => a.l.nome.localeCompare(b.l.nome, 'pt-BR'));
  }
  // o que o item faz, em poucas palavras
  function oQueFaz(it) {
    if (it.t === 'equip') {
      const b = Object.entries(it.equip.bonus || {}).map(([k, v]) => k + ' ' + (v > 0 ? '+' : '') + v);
      const d = Object.entries(it.equip.def || {}).map(([k, v]) => ((R.DEFESAS_ESP.find(e => e.k === k) || {}).nome || k) + ' ' + (v > 0 ? '+' : '') + v);
      return [b.concat(d).join(', '), it.nota].filter(Boolean).join(' · ');
    }
    if (it.t === 'pocao' && it.fx && it.fx.length) return [it.fx.map(e => e.k === 'barra' ? e.rec + ' ' + e.val : e.k === 'sob' ? 'sobrevida ' + e.val : e.k === 'bonus' ? e.bk + ' ' + (e.bv > 0 ? '+' : '') + e.bv + (e.bd ? ' (' + e.bd + ')' : '') : (R.nomeDaCondicao ? R.nomeDaCondicao(e.c) : e.c)).join(', '), it.nota].filter(Boolean).join(' · ');
    return it.nota || '';
  }

  function pintar() {
    if (!pronto) return;
    if (!naMesa) { trocar($('meio'), h('div', { class: 'vazio' }, h('strong', { text: 'A loja funciona numa mesa.' }), h('p', { class: 'ajuda', text: 'Quando o grupo do seu personagem para no lugar de uma loja do Mapa-múndi, esta aba aparece com o que ela vende.' }))); return; }
    const ls = lojas();
    if (!ls.length) { trocar($('meio'), h('div', { class: 'vazio' }, h('strong', { text: 'Nenhuma loja por perto.' }), h('p', { class: 'ajuda', text: 'Quando o grupo do seu personagem parar no lugar de uma loja, ela aparece aqui.' }))); return; }
    trocar($('meio'), ls.map(pintarLoja));
  }
  function pintarLoja(x) {
    const l = x.l;
    let pcId = escolhido.get(x.id);
    if (!x.meus.some(m => m.id === pcId)) { pcId = x.meus[0].id; escolhido.set(x.id, pcId); }
    const pc = x.meus.find(m => m.id === pcId), lap = I.lapros(pc.estado);
    return h('section', { class: 'loja', 'data-loja': x.id },
      h('div', { class: 'loja-h' }, h('h2', { text: l.nome }), l.lugar ? h('span', { class: 'lugar', text: 'em ' + (l.lugar.nome || 'um lugar') }) : null),
      h('div', { class: 'quem' }, h('span', { class: 'ajuda', text: 'Comprando para' }),
        x.meus.length > 1 ? h('select', { class: 'in', id: 'pc-' + x.id, 'aria-label': 'Para qual personagem', onchange: e => { escolhido.set(x.id, e.target.value); pintar(); } }, x.meus.map(m => h('option', { value: m.id, text: m.nome || 'Sem nome', selected: m.id === pcId })))
          : h('b', { text: pc.nome || 'Sem nome' }),
        h('span', { class: 'grow' }), h('span', { class: 'lapros', id: 'lap-' + x.id, text: lap + ' lapros' })),
      l.itens.length ? h('div', { class: 'cartas' }, l.itens.map(y => carta(x, y, pc, lap))) : h('p', { class: 'ajuda', text: 'A loja está sem itens agora.' }));
  }
  function carta(x, y, pc, lap) {
    const k = x.id + ':' + y.id, max = Math.max(1, Math.min(99, y.estoque == null ? 99 : y.estoque));
    let q = Math.min(qtds.get(k) || 1, max);
    const total = y.preco * q, semEst = y.estoque != null && y.estoque < 1, falta = total > lap;
    const porque = semEst ? 'Acabou o estoque.' : falta ? 'Faltam ' + (total - lap) + ' lapros.' : y.estoque != null ? (y.estoque === 1 ? 'Só 1 na loja.' : y.estoque + ' na loja.') : '';
    return h('div', { class: 'carta' + (semEst ? ' sem' : ''), 'data-item': y.id },
      h('div', { class: 'topo' }, h('span', { class: 'ico', style: { background: COR_TIPO[y.item.t] || '#888' }, text: SIGLA[y.item.t] || '?' }),
        h('div', null, h('b', { text: y.item.nome }), h('div', { class: 'tipo', text: I.nomeDoTipo(y.item.t) }))),
      h('div', { class: 'det', text: oQueFaz(y.item) }),
      h('div', { class: 'preco' }, h('span', { text: 'cada' }), h('b', { text: y.preco + ' lapros' })),
      h('div', { class: 'compra' },
        h('div', { class: 'qtd' }, h('button', { type: 'button', 'aria-label': 'Um a menos', disabled: q <= 1 || semEst, onclick: () => { qtds.set(k, q - 1); pintar(); } }, '−'),
          h('span', { 'data-q': y.id, text: String(q) }),
          h('button', { type: 'button', 'aria-label': 'Um a mais', disabled: q >= max || semEst, onclick: () => { qtds.set(k, q + 1); pintar(); } }, '+')),
        h('button', { type: 'button', class: 'btn pri', 'data-comprar': y.id, disabled: semEst || falta || ocupado, onclick: () => comprar(x, y, pc, q) }, 'Comprar · ' + total)),
      h('div', { class: 'porque', text: porque }));
  }
  async function comprar(x, y, pc, q) {
    if (ocupado) return;
    ocupado = true; pintar();
    try {
      const r = await window.TC.ponte.itens('comprar', { loja: x.id, item: y.id, qtd: q, pc: pc.id });
      qtds.delete(x.id + ':' + y.id);
      const quem = pc.nome || 'O personagem', oque = (q > 1 ? q + ' × ' : '') + y.item.nome;
      toast(quem + ' comprou ' + oque + ' por ' + (r && r.total != null ? r.total : y.preco * q) + ' lapros' + (r && r.lapros != null ? ' (ficam ' + r.lapros + ')' : '') + '.', 'Desfazer', async () => {
        try { await window.TC.ponte.itens('desfazer', { compra: r.compra, pc: pc.id, loja: x.id }); toast('Compra desfeita: ' + oque + ' voltou para a loja.'); }
        catch (e) { toast((e && e.message) || 'Não deu para desfazer.'); }
      });
    } catch (e) { toast((e && e.message) || 'Não deu para comprar agora.'); }
    finally { ocupado = false; pintar(); }
  }

  async function partida() {
    const TCx = window.TC;
    if (TCx && TCx.ponte) {
      st = await TCx.ponte.pronta;
      if (TCx.ponte.naCasca) document.documentElement.classList.add('na-casca');
      if (TCx.dados && TCx.dados.disponivel()) {
        naMesa = true;
        D = TCx.dados.col('documentos'); P = TCx.dados.col('personagens');
        await Promise.all([D.pronta, P.pronta]);
        let t = 0;
        const depois = () => { clearTimeout(t); t = setTimeout(pintar, 120); };
        D.aoMudar(l => { if (l && typeof l.id === 'string' && l.id.startsWith(I.PRE_LOJA)) depois(); });
        P.aoMudar(depois);
      }
      TCx.ponte.aoMudar(e => { st = e; if (pronto) pintar(); });
    }
    pronto = true;
    pintar();
  }
  if (DEBUG) window.__loja = { get naMesa() { return naMesa; }, get pronto() { return pronto; }, lojas: () => JSON.parse(JSON.stringify(lojas().map(x => ({ id: x.id, nome: x.l.nome, meus: x.meus.map(m => m.id) })))), pintar };
  partida().catch(e => { console.error(e); trocar($('meio'), h('div', { class: 'vazio' }, h('strong', { text: 'Não deu para abrir a Loja.' }), (e && e.message) || '')); });
})();
