/* Tiny Cats · Itens (lote 29): a aba do mestre.
   Três partes: o Catálogo (os itens da mesa — os da bolsa e os equipamentos, com o preço de sempre; "Dar a…" põe um na
   ficha de alguém), as Lojas (cada uma num lugar do Mapa-múndi, com os itens, o preço e o estoque: quando o grupo de um
   personagem para no hexágono do lugar, a aba Loja aparece para o dono dele) e as Receitas (o que a bancada do
   Acampamento faz: os ingredientes, o resultado, o teste e o que a falha faz). As contas ficam em tc/itens.js. Na mesa,
   cada coisa é um documento (itens:catalogo, itens:loja:<id>, itens:rec:<id>); fora de uma mesa, tudo fica neste
   navegador. Nada muda sozinho: cada mudança tem Desfazer. */
(() => {
  'use strict';
  const I = window.TC.itens, R = window.TC.rules;
  const DEBUG = /[?&]debug\b/.test(location.search);
  const $ = id => document.getElementById(id);
  const j = JSON.stringify;
  const copia = x => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const sem = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    let valor;
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el[k] = v;
      else if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') valor = v;
      else if (k === 'checked') el.checked = true;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c);
    if (valor !== undefined) el.value = valor;
    return el;
  }
  const trocar = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(c => c != null && c !== false));
  const guarda = {
    ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    gravar(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  };
  function toast(texto, acao, fn, ms) {
    const t = h('div', { class: 'toast' }, h('span', { text: texto }));
    if (acao) t.append(h('button', { type: 'button', text: acao, onclick: () => { t.remove(); fn(); } }));
    $('toasts').append(t);
    while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
    let relogio = setTimeout(() => t.remove(), ms || (acao ? 8000 : 3800));
    t.addEventListener('pointerenter', () => clearTimeout(relogio));
    t.addEventListener('pointerleave', () => { clearTimeout(relogio); relogio = setTimeout(() => t.remove(), 2500); });
  }
  const COR_TIPO = { pocao: '#c25b6e', bomba: '#c9743e', runa: '#7d6bd1', municao: '#8a8f9c', material: '#5fa37a', equip: '#d9a441' };
  const SIGLA = { pocao: 'PO', bomba: 'BO', runa: 'RU', municao: 'MU', material: 'MA', equip: 'EQ' };

  /* ---------------- os documentos ---------------- */
  let st = null, D = null, P = null, naMesa = false, pronto = false, local = { docs: {} };
  let aba = 'catalogo', busca = '', pilha = [], tSalvo = 0;
  function lerLocal() { try { const d = JSON.parse(guarda.ler(I.L_LOCAL) || 'null'); local = ehObj(d) && ehObj(d.docs) ? d : { docs: {} }; } catch (e) { local = { docs: {} }; } }
  const salvarLocal = () => { if (!guarda.gravar(I.L_LOCAL, j(local))) toast('Não deu para guardar neste navegador.'); };
  function doc(id) {
    if (!naMesa) return local.docs[id] == null ? null : local.docs[id];
    const l = D && D.pegar(id);
    return l && !l.apagado ? l.dados : null;
  }
  const visDe = id => { if (!naMesa) return null; const l = D.pegar(id); return l && !l.apagado ? l.vis : null; };
  function gravarDoc(id, dados, vis) {
    if (naMesa) { const campos = { dados: copia(dados) }; const l = D.pegar(id); if (!l || l.apagado || (vis && l.vis !== vis)) campos.vis = vis || 'mestre'; D.gravar(id, campos); }
    else { local.docs[id] = copia(dados); salvarLocal(); }
    marcarSalvo();
  }
  function apagarDoc(id) {
    if (naMesa) D.apagar(id); else { delete local.docs[id]; salvarLocal(); }
    marcarSalvo();
  }
  function marcarSalvo() {
    const el = $('salvo');
    el.textContent = naMesa ? 'Salvando…' : 'Neste navegador';
    clearTimeout(tSalvo);
    tSalvo = setTimeout(() => { el.textContent = naMesa ? (TC.dados.pendentes ? 'Salvando…' : 'Salvo na mesa') : 'Neste navegador'; }, 900);
  }
  // os documentos com um prefixo: [{ id, dados, vis }]
  function comPrefixo(pre) {
    const out = [];
    if (naMesa) { for (const l of D.todas()) if (typeof l.id === 'string' && l.id.startsWith(pre) && !l.apagado && ehObj(l.dados) && I.idOk(l.id.slice(pre.length))) out.push({ id: l.id.slice(pre.length), dados: l.dados, vis: l.vis }); }
    else for (const k of Object.keys(local.docs)) if (k.startsWith(pre) && ehObj(local.docs[k])) out.push({ id: k.slice(pre.length), dados: local.docs[k], vis: null });
    return out;
  }
  const catalogo = () => I.catalogo(doc(I.CATALOGO));
  const lojas = () => comPrefixo(I.PRE_LOJA).map(x => ({ id: x.id, l: I.loja(x.dados), vis: x.vis })).sort((a, b) => a.l.nome.localeCompare(b.l.nome, 'pt-BR'));
  const receitas = () => comPrefixo(I.PRE_REC).map(x => ({ id: x.id, r: I.receita(x.dados), vis: x.vis })).sort((a, b) => a.r.nome.localeCompare(b.r.nome, 'pt-BR'));
  const cfgFichas = () => { if (naMesa) { const d = D.pegar('fichas:cfg'); return (d && d.dados && d.dados.v) || R.cfgPadrao(); } try { const s = JSON.parse(guarda.ler('urgm_calc_atributos_v1') || 'null'); return (s && s.cfg) || R.cfgPadrao(); } catch (e) { return R.cfgPadrao(); } };
  // os lugares do Mapa-múndi (os marcadores com nome), por mapa
  function mapas() {
    if (!naMesa) return [];
    const out = [];
    for (const l of D.todas()) {
      if (typeof l.id !== 'string' || !l.id.startsWith('mundo:mapa:') || l.apagado || !ehObj(l.dados)) continue;
      const m = l.dados, objs = Array.isArray(m.objs) ? m.objs : [];
      out.push({ id: l.id.slice(11), nome: String(m.nome || 'Mapa'), grade: !!(ehObj(m.grade) && +m.grade.tam > 0),
        marcadores: objs.filter(o => ehObj(o) && o.k === 'm' && String(o.nome || '').trim()).map(o => ({ id: o.id, nome: String(o.nome).trim() })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')) });
    }
    return out.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  // as fichas da mesa (para "Dar a…" e para dizer quem está perto de cada loja)
  const fichas = () => (naMesa && P ? P.todas().filter(l => l && !l.apagado && ehObj(l.ficha) && !l.ficha.petDe).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')) : []);
  const nomeDaFicha = id => { const l = naMesa && P ? P.pegar(id) : null; return l ? String(l.nome || 'Sem nome') : null; };

  /* ---------------- o Desfazer ---------------- */
  function empilhar(rotulo, fn) { pilha.push({ rotulo, fn }); if (pilha.length > 40) pilha.shift(); $('btDesfazer').disabled = false; }
  function desfazer() {
    const p = pilha.pop();
    $('btDesfazer').disabled = !pilha.length;
    if (!p) return;
    try { p.fn(); pintar(); toast('Desfeito: ' + p.rotulo + '.'); } catch (e) { pintar(); toast((e && e.message) || 'Não deu para desfazer.'); }
  }
  // grava vários documentos de uma vez, com um Desfazer só que volta todos como estavam
  function gravarVarios(rotulo, mudancas) {
    const antes = mudancas.map(m => ({ id: m.id, dados: copia(doc(m.id)), vis: visDe(m.id) }));
    for (const m of mudancas) { if (m.dados === null) apagarDoc(m.id); else gravarDoc(m.id, m.dados, m.vis); }
    empilhar(rotulo, () => { for (const a of antes) { if (a.dados == null) apagarDoc(a.id); else gravarDoc(a.id, a.dados, a.vis || undefined); } });
  }

  /* ---------------- pintar ---------------- */
  const passa = nome => !busca || sem(nome).includes(sem(busca));
  const icone = t => h('span', { class: 'ico', style: { background: COR_TIPO[t] || '#888' }, text: SIGLA[t] || '?' });
  function pintar() {
    if (!pronto) return;
    const cat = catalogo(), ls = lojas(), rs = receitas();
    $('n-catalogo').textContent = cat.itens.length || ''; $('n-lojas').textContent = ls.length || ''; $('n-receitas').textContent = rs.length || '';
    for (const b of document.querySelectorAll('.abas [data-aba]')) b.setAttribute('aria-selected', String(b.dataset.aba === aba));
    $('btNovo').textContent = aba === 'catalogo' ? '+ Item' : aba === 'lojas' ? '+ Loja' : '+ Receita';
    trocar($('meio'), aba === 'catalogo' ? pintarCatalogo(cat) : aba === 'lojas' ? pintarLojas(ls, cat) : pintarReceitas(rs, cat));
  }
  function vazio(titulo, texto, rotulo, fn) {
    return h('div', { class: 'vazio' }, h('strong', { text: titulo }), h('p', { class: 'ajuda', text: texto }), h('button', { type: 'button', class: 'btn pri', text: rotulo, onclick: fn }));
  }
  function pintarCatalogo(cat) {
    if (!cat.itens.length) return vazio('O catálogo está vazio.', 'Os itens da mesa: os da bolsa (poções, bombas, runas, munições, materiais) e os equipamentos, com o preço de sempre. Daqui eles vão para as lojas, para as receitas e para a ficha de alguém (“Dar a…”).', '+ Item', () => editarItem(null));
    const lista = cat.itens.filter(x => passa(x.nome));
    if (!lista.length) return h('p', { class: 'ajuda', text: 'Nenhum item com este nome.' });
    const ls = lojas();
    return I.TIPOS.map(([t, nome]) => {
      const its = lista.filter(x => x.t === t).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      if (!its.length) return null;
      return h('section', { class: 'grupo-l' }, h('span', { class: 'eyebrow', text: nome + ' · ' + its.length }),
        its.map(x => {
          const nLojas = ls.filter(y => y.l.itens.some(z => z.cat === x.id)).length;
          const det = [x.preco ? x.preco + ' lapros' : 'sem preço', fxTexto(x), nLojas ? (nLojas === 1 ? 'numa loja' : 'em ' + nLojas + ' lojas') : null].filter(Boolean).join(' · ');
          return h('div', { class: 'lin', 'data-item': x.id }, icone(x.t),
            h('div', { class: 't' }, h('b', { text: x.nome }), h('small', { text: det })),
            h('div', { class: 'acoes' },
              naMesa ? h('button', { type: 'button', class: 'btn sm', 'data-dar': x.id, text: 'Dar a…', onclick: () => darA(x) }) : null,
              h('button', { type: 'button', class: 'btn sm', 'data-editar': x.id, text: 'Editar', onclick: () => editarItem(x.id) }),
              h('button', { type: 'button', class: 'btn sm', 'data-dup': x.id, text: 'Duplicar', onclick: () => duplicarItem(x.id) }),
              h('button', { type: 'button', class: 'btn sm per', 'data-apagar': x.id, text: 'Apagar', onclick: () => apagarItem(x.id) })));
        }));
    });
  }
  // o que o item faz, em poucas palavras
  function fxTexto(x) {
    if (x.t === 'equip') {
      const b = Object.entries(x.equip.bonus).map(([k, v]) => k + ' ' + (v > 0 ? '+' : '') + v), d = Object.entries(x.equip.def).map(([k, v]) => ((R.DEFESAS_ESP.find(e => e.k === k) || {}).nome || k) + ' ' + (v > 0 ? '+' : '') + v);
      const tipo = (R.tiposDeItem(cfgFichas()).find(t => t.id === x.equip.tipo) || {}).nome;
      return [tipo, ...b, ...d].filter(Boolean).join(', ');
    }
    if (x.t === 'pocao' && x.fx && x.fx.length) return x.fx.map(e => e.k === 'barra' ? e.rec + ' ' + e.val : e.k === 'sob' ? 'sobrevida ' + e.val : e.k === 'bonus' ? e.bk + ' ' + (e.bv > 0 ? '+' : '') + e.bv : (R.nomeDaCondicao ? R.nomeDaCondicao(e.c) : e.c)).join(', ');
    return '';
  }
  function pintarLojas(ls, cat) {
    if (!ls.length) return vazio('Nenhuma loja ainda.', 'Cada loja fica num lugar do Mapa-múndi (uma cidade, uma vila). Quando o grupo de um personagem para no hexágono do lugar, a aba Loja aparece para o dono dele: ele compra sozinho, com os lapros da ficha.', '+ Loja', () => editarLoja(null));
    const lista = ls.filter(x => passa(x.l.nome));
    if (!lista.length) return h('p', { class: 'ajuda', text: 'Nenhuma loja com este nome.' });
    return h('section', { class: 'grupo-l' }, lista.map(x => {
      const l = x.l, aqui = l.aqui.map(nomeDaFicha).filter(Boolean);
      const det = [l.lugar ? (l.lugar.nome || 'um lugar') : 'sem lugar no mapa', l.itens.length + (l.itens.length === 1 ? ' item' : ' itens'), aqui.length ? 'perto: ' + aqui.join(', ') : 'ninguém por perto'].join(' · ');
      return h('div', { class: 'lin' + (l.aberta ? '' : ' fechada'), 'data-loja': x.id }, h('span', { class: 'ico', style: { background: l.aberta ? 'var(--lamp)' : 'var(--line-strong)' }, text: 'LJ' }),
        h('div', { class: 't' }, h('b', null, l.nome, ' ', h('span', { class: 'pill' + (l.aberta ? ' ok' : ''), text: l.aberta ? 'aberta' : 'fechada' })), h('small', { text: det })),
        h('div', { class: 'acoes' },
          h('button', { type: 'button', class: 'btn sm', 'data-abrir': x.id, text: l.aberta ? 'Fechar' : 'Abrir', onclick: () => abrirFechar(x.id) }),
          h('button', { type: 'button', class: 'btn sm', 'data-editar': x.id, text: 'Editar', onclick: () => editarLoja(x.id) }),
          h('button', { type: 'button', class: 'btn sm per', 'data-apagar': x.id, text: 'Apagar', onclick: () => apagarLoja(x.id) })));
    }));
  }
  function pintarReceitas(rs, cat) {
    if (!rs.length) return vazio('Nenhuma receita ainda.', 'O que a bancada do Acampamento faz: os ingredientes (que saem da bolsa), o resultado, o teste (se há) e o que acontece se ele falhar.', '+ Receita', () => editarReceita(null));
    const lista = rs.filter(x => passa(x.r.nome));
    if (!lista.length) return h('p', { class: 'ajuda', text: 'Nenhuma receita com este nome.' });
    return h('section', { class: 'grupo-l' }, lista.map(x => {
      const r = x.r, ing = r.ingredientes.map(g => g.qtd + ' × ' + g.nome).join(', ') || 'sem ingredientes';
      const det = ing + ' → ' + (r.resultado.qtd > 1 ? r.resultado.qtd + ' × ' : '') + r.resultado.item.nome + ' · ' + (r.teste ? 'teste de ' + (I.ATR_TESTE.find(a => a[0] === r.teste.atr) || [])[1] + ' ' + r.teste.dif : 'sem teste');
      return h('div', { class: 'lin', 'data-rec': x.id }, icone(r.resultado.item.t),
        h('div', { class: 't' }, h('b', null, r.nome, ' ', r.oculta ? h('span', { class: 'pill lamp', text: 'só você vê' }) : null), h('small', { text: det })),
        h('div', { class: 'acoes' },
          h('button', { type: 'button', class: 'btn sm', 'data-editar': x.id, text: 'Editar', onclick: () => editarReceita(x.id) }),
          h('button', { type: 'button', class: 'btn sm', 'data-dup': x.id, text: 'Duplicar', onclick: () => duplicarReceita(x.id) }),
          h('button', { type: 'button', class: 'btn sm per', 'data-apagar': x.id, text: 'Apagar', onclick: () => apagarReceita(x.id) })));
    }));
  }

  /* ---------------- o catálogo ---------------- */
  // gravar o catálogo (e o retrato do item nas lojas que o vendem e nas receitas que o fazem), num Desfazer só
  function gravarCatalogo(rotulo, novo, mudouItem) {
    const muda = [{ id: I.CATALOGO, dados: novo, vis: 'mestre' }];
    let nLojas = 0;
    if (mudouItem) {
      for (const x of lojas()) {
        if (!x.l.itens.some(y => y.cat === mudouItem.id)) continue;
        const l = copia(x.l); delete l.aqui;
        for (const y of l.itens) if (y.cat === mudouItem.id) y.item = copia(mudouItem);
        muda.push({ id: I.PRE_LOJA + x.id, dados: l, vis: x.vis || 'mesa' }); nLojas++;
      }
      for (const x of receitas()) {
        if (x.r.resultado.item.id !== mudouItem.id) continue;
        const r = copia(x.r); r.resultado.item = copia(mudouItem);
        muda.push({ id: I.PRE_REC + x.id, dados: r, vis: x.vis || (r.oculta ? 'mestre' : 'mesa') });
      }
    }
    gravarVarios(rotulo, muda);
    return nLojas;
  }
  function duplicarItem(id) {
    const c = catalogo(), x = c.itens.find(y => y.id === id); if (!x) return;
    const n = copia(x); n.id = I.uid(); n.nome = (x.nome + ' (cópia)').slice(0, 80);
    c.itens.push(n); gravarCatalogo('duplicar ' + x.nome, c);
    pintar(); toast(n.nome + ' entrou no catálogo.', 'Desfazer', desfazer);
  }
  function apagarItem(id) {
    const c = catalogo(), x = c.itens.find(y => y.id === id); if (!x) return;
    c.itens = c.itens.filter(y => y.id !== id); gravarCatalogo('apagar ' + x.nome, c);
    pintar(); toast(x.nome + ' saiu do catálogo (as lojas que o vendem continuam com ele).', 'Desfazer', desfazer);
  }
  /* "Dar a…": o item vai para a ficha de alguém, com a quantidade (os da bolsa somam com os de mesmo nome; o equipamento
     entra guardado). Desfazer tira só o que entrou. */
  function darA(x) {
    const fs = fichas();
    if (!fs.length) { toast('A mesa ainda não tem fichas.'); return; }
    const sel = h('select', { class: 'in', id: 'dar-pc', style: { width: '100%' } }, fs.map(l => h('option', { value: l.id, text: l.nome || 'Sem nome' })));
    const qtd = h('input', { class: 'in num', id: 'dar-qtd', type: 'number', min: '1', max: '999', value: '1' });
    abrirDialogo('Dar ' + x.nome, [h('div', { class: 'g2' }, campo('Para quem', sel), campo('Quantos', qtd)),
      h('p', { class: 'ajuda', text: x.t === 'equip' ? 'O equipamento entra nos itens da ficha, guardado (o jogador equipa quando quiser).' : 'Na bolsa: soma com o item de mesmo nome, se a bolsa já tem.' })],
    'Dar', () => {
      const l = P.pegar(sel.value); if (!l || !l.ficha) { toast('Esta ficha não está mais na mesa.'); return false; }
      const q = Math.max(1, Math.min(999, Math.round(+qtd.value) || 1));
      const r = I.entregar(l.ficha, l.estado || {}, [{ item: x, qtd: q }], 0);
      P.gravar(l.id, { ficha: r.ficha, estado: r.estado });
      const quem = l.nome || 'a ficha', dz = r.desfazer;
      empilhar('dar ' + x.nome + ' a ' + quem, () => { const a = P.pegar(l.id); if (!a || !a.ficha) throw new Error('A ficha não está mais na mesa.'); const v = I.desentregar(a.ficha, a.estado || {}, dz); P.gravar(l.id, { ficha: v.ficha, estado: v.estado }); });
      toast(quem + ' recebeu ' + (q > 1 ? q + ' × ' : '') + x.nome + '.', 'Desfazer', desfazer);
    });
  }

  /* ---------------- as lojas ---------------- */
  function abrirFechar(id) {
    const x = lojas().find(y => y.id === id); if (!x) return;
    const l = copia(x.l); delete l.aqui; l.aberta = !l.aberta;
    gravarVarios((l.aberta ? 'abrir ' : 'fechar ') + l.nome, [{ id: I.PRE_LOJA + id, dados: l, vis: x.vis || 'mesa' }]);
    pintar(); toast(l.nome + (l.aberta ? ' está aberta.' : ' está fechada: os jogadores não compram até você abrir.'), 'Desfazer', desfazer);
  }
  function apagarLoja(id) {
    const x = lojas().find(y => y.id === id); if (!x) return;
    gravarVarios('apagar ' + x.l.nome, [{ id: I.PRE_LOJA + id, dados: null }]);
    pintar(); toast(x.l.nome + ' foi apagada.', 'Desfazer', desfazer);
  }

  /* ---------------- as receitas ---------------- */
  function duplicarReceita(id) {
    const x = receitas().find(y => y.id === id); if (!x) return;
    const r = copia(x.r); r.nome = (r.nome + ' (cópia)').slice(0, 80);
    gravarVarios('duplicar ' + x.r.nome, [{ id: I.PRE_REC + I.uid(), dados: r, vis: r.oculta ? 'mestre' : 'mesa' }]);
    pintar(); toast(r.nome + ' criada.', 'Desfazer', desfazer);
  }
  function apagarReceita(id) {
    const x = receitas().find(y => y.id === id); if (!x) return;
    gravarVarios('apagar ' + x.r.nome, [{ id: I.PRE_REC + id, dados: null }]);
    pintar(); toast(x.r.nome + ' foi apagada.', 'Desfazer', desfazer);
  }

  /* ---------------- as janelas ---------------- */
  const campo = (rotulo, el, dica) => h('label', { class: 'field' }, h('span', { text: rotulo }), el, dica ? h('span', { class: 'ajuda', text: dica }) : null);
  let aoFechar = null;
  function abrirDialogo(titulo, corpo, rotuloOk, ok) {
    const dl = $('dlg');
    trocar(dl, h('div', { class: 'dl-h' }, h('h2', { text: titulo }), h('button', { type: 'button', class: 'ib leve', 'aria-label': 'Fechar sem guardar', title: 'Fechar sem guardar', onclick: () => dl.close() }, '×')),
      h('div', { class: 'dl-c' }, corpo),
      h('div', { class: 'dl-a' }, h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: () => dl.close() }),
        h('button', { type: 'button', class: 'btn pri', id: 'dl-ok', text: rotuloOk, onclick: () => { if (ok() !== false) { dl.close(); pintar(); } } })));
    dl.onclose = () => { if (aoFechar) { const f = aoFechar; aoFechar = null; f(); } };
    if (!dl.open) dl.showModal();
    const f = dl.querySelector('.dl-c input, .dl-c select, .dl-c textarea'); if (f) f.focus();
  }
  // o editor que repinta por dentro (o item, a loja, a receita): rascunho em `ed`, `corpo()` monta o miolo
  let ed = null;
  function abrirEditor(titulo, rotuloOk, corpo, salvar) {
    ed.corpo = corpo; ed.salvar = salvar; ed.titulo = titulo; ed.rotuloOk = rotuloOk;
    abrirDialogo(titulo, corpo(), rotuloOk, salvar);
    aoFechar = () => { ed = null; };
  }
  function repintarEd() {
    if (!ed) return;
    const dl = $('dlg'), c = dl.querySelector('.dl-c'), a = document.activeElement, foco = a && dl.contains(a) && a.id ? a.id : null, top = c ? c.scrollTop : 0;
    if (c) trocar(c, ed.corpo());
    if (c) c.scrollTop = top;
    if (foco) { const el = document.getElementById(foco); if (el) el.focus({ preventScroll: true }); }
  }
  const num = (id, v, fn, o = {}) => h('input', { class: 'in num', id, type: 'number', value: v == null ? '' : String(v), min: o.min, max: o.max, placeholder: o.ph, 'aria-label': o.rotulo, onchange: e => fn(e.target.value) });
  const texto = (id, v, fn, o = {}) => h('input', { class: 'in', id, value: v || '', maxlength: o.max || '80', placeholder: o.ph, 'aria-label': o.rotulo, list: o.list, onchange: e => fn(e.target.value) });
  const escolha = (id, v, opcoes, fn, o = {}) => h('select', { class: 'in', id, 'aria-label': o.rotulo, style: o.largo ? { width: '100%' } : null, onchange: e => fn(e.target.value) }, opcoes.map(([k, n]) => h('option', { value: k, text: n, selected: k === v })));
  const seg = (id, v, opcoes, fn) => h('div', { class: 'seg', id, role: 'group' }, opcoes.map(([k, n]) => h('button', { type: 'button', 'data-v': k, 'aria-pressed': String(k === v), text: n, onclick: () => fn(k) })));
  const tirar = (rotulo, fn) => h('button', { type: 'button', class: 'ib leve', 'aria-label': rotulo, title: rotulo, onclick: fn }, '×');

  /* o item */
  function editarItem(id) {
    const c = catalogo(), x = id ? c.itens.find(y => y.id === id) : null;
    ed = { id: x ? x.id : null, it: x ? copia(x) : I.item({ t: 'material', nome: '' }) };
    if (!x) ed.it.nome = '';
    abrirEditor(x ? 'Editar ' + x.nome : 'Novo item', x ? 'Guardar' : 'Criar', corpoItem, salvarItem);
  }
  const FX_TIPOS = [['barra', 'Muda uma barra'], ['sob', 'Sobrevida'], ['bonus', 'Bônus'], ['cond', 'Condição']];
  function corpoItem() {
    const it = ed.it, out = [];
    out.push(h('div', { class: 'g2' }, campo('Nome', texto('it-nome', it.nome, v => { it.nome = v; }, { ph: 'ex.: Poção de cura' })), campo('Preço (lapros)', num('it-preco', it.preco, v => { it.preco = Math.max(0, Math.round(+v) || 0); }, { min: '0' }))));
    out.push(h('div', { class: 'field' }, h('span', { text: 'Tipo' }), seg('it-tipo', it.t, I.TIPOS, v => { it.t = v; if (v === 'pocao' && !it.fx) it.fx = []; if (v === 'equip' && !it.equip) it.equip = { tipo: '', bonus: {}, def: {} }; repintarEd(); })));
    if (it.t === 'pocao') {
      it.fx = it.fx || [];
      out.push(h('div', { class: 'field' }, h('span', { text: 'O que a poção faz (como na bolsa da ficha)' }),
        h('div', { class: 'linhas', id: 'it-fx' }, it.fx.map((e, i) => h('div', { class: 'linha fx' }, escolha('it-fx-k-' + i, e.k, FX_TIPOS, v => { it.fx[i] = { k: v, rec: 'HP', val: '', bk: 'FOR', bv: 1, c: 'veneno', r: 0 }; repintarEd(); }, { rotulo: 'Tipo do efeito' }),
          h('div', { class: 'cmp' }, ...corpoEfeito(e, i)), tirar('Tirar este efeito', () => { it.fx.splice(i, 1); repintarEd(); })))),
        h('div', { class: 'acoes' }, h('button', { type: 'button', class: 'btn sm', id: 'it-fx-mais', text: '+ Efeito', onclick: () => { it.fx.push({ k: 'barra', rec: 'HP', val: '30' }); repintarEd(); } }))));
    }
    if (it.t === 'equip') {
      const e = it.equip = it.equip || { tipo: '', bonus: {}, def: {} };
      out.push(campo('Tipo de equipamento', escolha('it-eq-tipo', e.tipo, [['', 'Sem tipo']].concat(R.tiposDeItem(cfgFichas()).map(t => [t.id, t.nome])), v => { e.tipo = v; }, { largo: true })));
      out.push(h('div', { class: 'field' }, h('span', { text: 'O que soma, equipado' }),
        h('div', { class: 'g6', id: 'it-bonus' }, R.CHAVES_BONUS.map(k => h('label', null, k, num('it-b-' + k, e.bonus[k] || '', v => { const n = Math.round(+v) || 0; if (n) e.bonus[k] = n; else delete e.bonus[k]; }, { ph: '0' }))))));
      out.push(h('details', { class: 'sec' }, h('summary', { text: 'Defesas específicas (fogo, corte…)' }),
        h('div', { class: 'g6' }, R.DEFESAS_ESP.map(d => h('label', null, d.nome, num('it-d-' + d.k, e.def[d.k] || '', v => { const n = Math.round(+v) || 0; if (n) e.def[d.k] = n; else delete e.def[d.k]; }, { ph: '0' }))))));
    }
    out.push(campo(it.t === 'equip' ? 'Efeito (o texto que vai na ficha)' : 'Nota (o que aparece na bolsa)', h('textarea', { class: 'in', id: 'it-nota', rows: '3', onchange: e => { it.nota = e.target.value; } }, it.nota || '')));
    return out;
  }
  function corpoEfeito(e, i) {
    const it = ed.it, set = (k, v) => { it.fx[i][k] = v; };
    if (e.k === 'barra' || e.k === 'sob') return [texto('it-fx-rec-' + i, e.rec, v => set('rec', v.trim() || 'HP'), { ph: 'HP', rotulo: 'A barra', max: '30' }), texto('it-fx-val-' + i, e.val, v => set('val', v.trim()), { ph: e.k === 'sob' ? '20' : '30 ou 2d6+3 (−10: dano)', rotulo: 'Quanto' })];
    if (e.k === 'bonus') return [escolha('it-fx-bk-' + i, e.bk || 'FOR', R.CHAVES_BONUS.map(k => [k, k]), v => set('bk', v), { rotulo: 'Em quê' }), num('it-fx-bv-' + i, e.bv, v => set('bv', Math.round(+v) || 0), { rotulo: 'Quanto' }),
      texto('it-fx-bd-' + i, e.bd, v => set('bd', v), { ph: 'duração (ex.: 3 turnos)', rotulo: 'Duração', max: '40' })];
    return [escolha('it-fx-c-' + i, e.c || 'veneno', (R.CONDICOES || []).map(c => [c.id, c.n]), v => set('c', v), { rotulo: 'A condição' }), num('it-fx-r-' + i, e.r || '', v => set('r', Math.max(0, Math.round(+v) || 0)), { ph: 'rodadas', rotulo: 'Rodadas', min: '0' })];
  }
  function salvarItem() {
    const it = I.item(ed.it);
    if (!String(ed.it.nome || '').trim()) { toast('Dê um nome ao item.'); return false; }
    const c = catalogo(), i = c.itens.findIndex(y => y.id === it.id), novo = i < 0;
    if (novo) c.itens.push(it); else c.itens[i] = it;
    const n = gravarCatalogo((novo ? 'criar ' : 'mudar ') + it.nome, c, novo ? null : it);
    toast(novo ? it.nome + ' entrou no catálogo.' : it.nome + ': guardado' + (n ? (n === 1 ? ' (e na loja que o vende)' : ' (e nas ' + n + ' lojas que o vendem)') : '') + '.', 'Desfazer', desfazer);
  }

  /* a loja */
  function editarLoja(id) {
    const x = id ? lojas().find(y => y.id === id) : null;
    ed = { id: x ? x.id : I.uid(), novo: !x, l: x ? copia(x.l) : I.loja({ nome: '' }), vis: x ? x.vis : 'mesa' };
    if (!x) ed.l.nome = '';
    delete ed.l.aqui;
    abrirEditor(x ? 'Editar ' + x.l.nome : 'Nova loja', x ? 'Guardar' : 'Criar', corpoLoja, salvarLoja);
  }
  function corpoLoja() {
    const l = ed.l, out = [], ms = mapas(), cat = catalogo();
    out.push(h('div', { class: 'g2' }, campo('Nome', texto('lj-nome', l.nome, v => { l.nome = v; }, { ph: 'ex.: Ferreiro de Vashka' })),
      h('div', { class: 'field' }, h('span', { text: 'Aberta' }), h('label', { class: 'chk' }, h('input', { type: 'checkbox', id: 'lj-aberta', checked: l.aberta, onchange: e => { l.aberta = e.target.checked; } }), 'Os jogadores compram (quando estão perto)'))));
    if (!naMesa) out.push(h('p', { class: 'aviso', text: 'O lugar no Mapa-múndi se escolhe numa mesa (fora dela, a loja fica só guardada aqui).' }));
    else if (!ms.length) out.push(h('p', { class: 'aviso', text: 'Esta mesa ainda não tem mapa no Mapa-múndi: crie um e ponha um marcador com nome (uma cidade) para a loja ficar lá.' }));
    else {
      const m = (l.lugar && ms.find(y => y.id === l.lugar.mapa)) || (ed.mapa && ms.find(y => y.id === ed.mapa)) || ms[0];
      out.push(h('div', { class: 'g2' },
        ms.length > 1 ? campo('Mapa', escolha('lj-mapa', m.id, ms.map(y => [y.id, y.nome]), v => { l.lugar = null; ed.mapa = v; repintarEd(); }, { largo: true })) : null,
        campo('Lugar (um marcador do mapa)', escolha('lj-lugar', l.lugar && l.lugar.mapa === m.id ? l.lugar.marcador : '', [['', 'Escolha o lugar…']].concat(m.marcadores.map(y => [y.id, y.nome])), v => { const mk = m.marcadores.find(y => y.id === v); l.lugar = mk ? { mapa: m.id, marcador: mk.id, nome: mk.nome } : null; }, { largo: true }),
          m.grade ? 'A aba Loja aparece para quem tem um personagem num grupo parado no hexágono deste lugar.' : 'Este mapa ainda não tem a grade de hexágonos: ligue a grade (aba Terreno do Mapa-múndi) para a loja aparecer.')));
    }
    out.push(h('div', { class: 'field' }, h('span', { text: 'Os itens (o preço; o estoque em branco: sem fim)' }),
      l.itens.length ? h('div', { class: 'linhas', id: 'lj-itens' }, l.itens.map((y, i) => h('div', { class: 'linha li', 'data-li': i },
        h('span', null, h('b', { text: y.item.nome }), h('small', { class: 'ajuda', text: ' · ' + I.nomeDoTipo(y.item.t) })),
        num('lj-preco-' + i, y.preco, v => { y.preco = Math.max(0, Math.round(+v) || 0); }, { min: '0', rotulo: 'Preço de ' + y.item.nome }),
        num('lj-est-' + i, y.estoque, v => { y.estoque = String(v).trim() === '' ? null : Math.max(0, Math.round(+v) || 0); }, { min: '0', ph: 'sem fim', rotulo: 'Estoque de ' + y.item.nome }),
        tirar('Tirar ' + y.item.nome + ' da loja', () => { l.itens.splice(i, 1); repintarEd(); })))) : h('p', { class: 'ajuda', text: 'Nenhum item ainda: escolha do catálogo aqui embaixo.' }),
      cat.itens.length ? h('div', { class: 'acoes' }, escolha('lj-add', '', [['', '+ Do catálogo…']].concat(cat.itens.filter(y => !l.itens.some(z => z.cat === y.id)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(y => [y.id, y.nome + ' · ' + (y.preco || 0) + ' lapros'])),
        v => { const it = cat.itens.find(y => y.id === v); if (it) { l.itens.push({ id: I.uid(), cat: it.id, item: copia(it), preco: it.preco, estoque: null }); repintarEd(); } }, { rotulo: 'Pôr um item do catálogo na loja' }))
        : h('p', { class: 'ajuda', text: 'O catálogo está vazio: crie os itens na parte Catálogo.' })));
    out.push(campo('Nota (só para você)', h('textarea', { class: 'in', id: 'lj-nota', rows: '2', onchange: e => { l.nota = e.target.value; } }, l.nota || '')));
    return out;
  }
  function salvarLoja() {
    const l = I.loja(ed.l); delete l.aqui;
    if (!String(ed.l.nome || '').trim()) { toast('Dê um nome à loja.'); return false; }
    gravarVarios((ed.novo ? 'criar ' : 'mudar ') + l.nome, [{ id: I.PRE_LOJA + ed.id, dados: l, vis: ed.vis || 'mesa' }]);
    toast(ed.novo ? l.nome + ' foi criada' + (l.lugar ? ' em ' + l.lugar.nome : '') + '.' : l.nome + ': guardada.', 'Desfazer', desfazer);
  }

  /* a receita */
  function editarReceita(id) {
    const x = id ? receitas().find(y => y.id === id) : null;
    ed = { id: x ? x.id : I.uid(), novo: !x, r: x ? copia(x.r) : I.receita({ nome: '', ingredientes: [] }) };
    if (!x) { ed.r.nome = ''; const c = catalogo(); if (c.itens[0]) ed.r.resultado.item = copia(c.itens[0]); }
    abrirEditor(x ? 'Editar ' + x.r.nome : 'Nova receita', x ? 'Guardar' : 'Criar', corpoReceita, salvarReceita);
  }
  function corpoReceita() {
    const r = ed.r, cat = catalogo(), out = [];
    out.push(h('datalist', { id: 'rc-nomes' }, cat.itens.map(y => h('option', { value: y.nome }))));
    out.push(h('div', { class: 'g2' }, campo('Nome', texto('rc-nome', r.nome, v => { r.nome = v; }, { ph: 'ex.: Poção de cura' })),
      h('div', { class: 'field' }, h('span', { text: 'Quem vê' }), h('label', { class: 'chk' }, h('input', { type: 'checkbox', id: 'rc-oculta', checked: r.oculta, onchange: e => { r.oculta = e.target.checked; } }), 'Só você (a bancada não mostra)'))));
    out.push(h('div', { class: 'field' }, h('span', { text: 'Ingredientes (saem da bolsa de quem faz)' }),
      h('div', { class: 'linhas', id: 'rc-ing' }, r.ingredientes.map((g, i) => h('div', { class: 'linha ing' },
        texto('rc-ing-n-' + i, g.nome, v => { g.nome = v.trim() || 'Ingrediente'; const it = cat.itens.find(y => sem(y.nome) === sem(v)); if (it) { g.t = it.t; repintarEd(); } }, { list: 'rc-nomes', rotulo: 'Ingrediente' }),
        escolha('rc-ing-t-' + i, g.t, I.TIPOS.filter(t => t[0] !== 'equip'), v => { g.t = v; }, { rotulo: 'Tipo' }),
        num('rc-ing-q-' + i, g.qtd, v => { g.qtd = Math.max(1, Math.round(+v) || 1); }, { min: '1', rotulo: 'Quantos' }),
        tirar('Tirar ' + g.nome, () => { r.ingredientes.splice(i, 1); repintarEd(); })))),
      h('div', { class: 'acoes' }, h('button', { type: 'button', class: 'btn sm', id: 'rc-ing-mais', text: '+ Ingrediente', onclick: () => { r.ingredientes.push({ nome: 'Erva', t: 'material', qtd: 1 }); repintarEd(); } }))));
    out.push(h('div', { class: 'g2' },
      campo('Faz', cat.itens.length ? escolha('rc-res', r.resultado.item.id, (cat.itens.some(y => y.id === r.resultado.item.id) ? [] : [[r.resultado.item.id, r.resultado.item.nome]]).concat(cat.itens.map(y => [y.id, y.nome + ' · ' + I.nomeDoTipo(y.t)])), v => { const it = cat.itens.find(y => y.id === v); if (it) r.resultado.item = copia(it); }, { largo: true })
        : h('p', { class: 'ajuda', text: 'Crie o item que a receita faz no Catálogo.' })),
      campo('Quantos', num('rc-res-q', r.resultado.qtd, v => { r.resultado.qtd = Math.max(1, Math.round(+v) || 1); }, { min: '1' }))));
    out.push(h('div', { class: 'field' }, h('span', { text: 'Teste' }), seg('rc-teste', r.teste ? 'sim' : 'nao', [['nao', 'Sem teste'], ['sim', 'Com teste']], v => { r.teste = v === 'sim' ? (r.teste || { atr: 'DES', dif: 10 }) : null; repintarEd(); }),
      r.teste ? h('div', { class: 'acoes' }, escolha('rc-atr', r.teste.atr, I.ATR_TESTE, v => { r.teste.atr = v; }, { rotulo: 'Atributo do teste' }), h('span', { class: 'ajuda', text: 'contra' }), num('rc-dif', r.teste.dif, v => { r.teste.dif = Math.max(1, Math.round(+v) || 10); }, { min: '1', rotulo: 'Dificuldade' })) : null));
    const f = r.falha;
    out.push(h('div', { class: 'sec', id: 'rc-falha' }, h('span', { class: 'eyebrow', text: 'Se o teste falhar' }),
      h('label', { class: 'chk' }, h('input', { type: 'checkbox', id: 'rc-perde', checked: f.perde, onchange: e => { f.perde = e.target.checked; } }), 'Os ingredientes se perdem'),
      h('div', { class: 'linhas' }, f.dano.map((d, i) => h('div', { class: 'linha dano' }, texto('rc-dano-b-' + i, d.barra, v => { d.barra = v.trim() || 'HP'; }, { ph: 'HP', rotulo: 'A barra', max: '30' }), texto('rc-dano-v-' + i, d.val, v => { d.val = v.trim(); }, { ph: '2d6 ou 10', rotulo: 'O dano' }), tirar('Tirar este dano', () => { f.dano.splice(i, 1); repintarEd(); })))),
      h('div', { class: 'linhas' }, f.conds.map((c, i) => h('div', { class: 'linha cond' }, escolha('rc-cond-' + i, c.c, (R.CONDICOES || []).map(x => [x.id, x.n]), v => { c.c = v; }, { rotulo: 'A condição', largo: true }), num('rc-cond-r-' + i, c.r || '', v => { c.r = Math.max(0, Math.round(+v) || 0); }, { ph: 'rodadas', min: '0', rotulo: 'Rodadas' }), tirar('Tirar esta condição', () => { f.conds.splice(i, 1); repintarEd(); })))),
      h('div', { class: 'acoes' }, h('button', { type: 'button', class: 'btn sm', id: 'rc-dano-mais', text: '+ Dano', onclick: () => { f.dano.push({ barra: 'HP', val: '1d6' }); repintarEd(); } }),
        h('button', { type: 'button', class: 'btn sm', id: 'rc-cond-mais', text: '+ Condição', onclick: () => { f.conds.push({ c: 'veneno', r: 3 }); repintarEd(); } })),
      h('p', { class: 'ajuda', text: 'O dano sai da barra da ficha de quem fez. A condição vai para o token dele na cena que está no ar; sem token, você recebe o aviso na mesa ao vivo para pôr depois.' })));
    out.push(campo('Nota (aparece na bancada)', h('textarea', { class: 'in', id: 'rc-nota', rows: '2', onchange: e => { r.nota = e.target.value; } }, r.nota || '')));
    return out;
  }
  function salvarReceita() {
    const r = I.receita(ed.r);
    if (!String(ed.r.nome || '').trim()) { toast('Dê um nome à receita.'); return false; }
    if (!r.ingredientes.length) { toast('Ponha pelo menos um ingrediente.'); return false; }
    gravarVarios((ed.novo ? 'criar ' : 'mudar ') + r.nome, [{ id: I.PRE_REC + ed.id, dados: r, vis: r.oculta ? 'mestre' : 'mesa' }]);
    toast(ed.novo ? r.nome + ' entrou nas receitas.' : r.nome + ': guardada.', 'Desfazer', desfazer);
  }

  /* ---------------- a barra de cima e as teclas ---------------- */
  for (const b of document.querySelectorAll('.abas [data-aba]')) b.onclick = () => { aba = b.dataset.aba; busca = ''; $('busca').value = ''; guarda.gravar('tinycats:itens:aba', aba); pintar(); };
  $('busca').oninput = e => { busca = e.target.value; pintar(); };
  $('btDesfazer').onclick = desfazer;
  $('btNovo').onclick = () => (aba === 'catalogo' ? editarItem(null) : aba === 'lojas' ? editarLoja(null) : editarReceita(null));
  const escrevendo = () => { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable); };
  document.addEventListener('keydown', ev => { if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && ev.key.toLowerCase() === 'z' && !escrevendo() && !$('dlg').open) { ev.preventDefault(); desfazer(); } });

  /* ---------------- partida ---------------- */
  async function partida() {
    const TCx = window.TC;
    lerLocal();
    const a0 = guarda.ler('tinycats:itens:aba'); if (['catalogo', 'lojas', 'receitas'].includes(a0)) aba = a0;
    if (TCx && TCx.ponte) {
      st = await TCx.ponte.pronta;
      if (TCx.ponte.naCasca) document.documentElement.classList.add('na-casca');
      if (TCx.dados && TCx.dados.disponivel()) {
        naMesa = true;
        D = TCx.dados.col('documentos'); P = TCx.dados.col('personagens');
        await Promise.all([D.pronta, P.pronta]);
      }
      TCx.ponte.aoMudar(e => { st = e; if (pronto) pintar(); });
    }
    if (naMesa) {
      let t = 0;
      const depois = () => { clearTimeout(t); t = setTimeout(() => { if (!$('dlg').open) pintar(); }, 150); };
      D.aoMudar(l => { if (l && typeof l.id === 'string' && (l.id.startsWith('itens:') || l.id.startsWith('mundo:mapa:') || l.id === 'fichas:cfg')) depois(); });
      P.aoMudar(depois);
    } else $('salvo').textContent = 'Neste navegador';
    pronto = true;
    pintar();
  }
  if (DEBUG) window.__itens = { I, get naMesa() { return naMesa; }, get pronto() { return pronto; }, get aba() { return aba; }, get ed() { return ed; },
    catalogo: () => copia(catalogo()), lojas: () => copia(lojas()), receitas: () => copia(receitas()), doc: id => copia(doc(id)), gravarDoc, pintar, desfazer, pilha: () => pilha.map(p => p.rotulo) };
  partida().catch(e => { console.error(e); trocar($('meio'), h('div', { class: 'vazio' }, h('strong', { text: 'Não deu para abrir os Itens.' }), (e && e.message) || '', h('button', { type: 'button', class: 'btn sm', text: 'Tentar de novo', onclick: () => location.reload() }))); });
})();
