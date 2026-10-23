/* Tiny Cats · o bloco de notas do mestre (lote 22).
   Só O mestre da mesa vê e escreve (nem o mestre auxiliar): cada capítulo (ou assunto) é um documento da mesa
   "notas:<id>", com vis 'mestre' — e o id fora dos prefixos das abas faz o banco entregá-lo só ao mestre (a regra
   privado.mestra(m, null): sem aba, só o mestre). Os capítulos têm título, tags e a campanha (ou "do mundo"); a lista
   filtra pela busca, pela tag e pela campanha, e mostra primeiro os da campanha em vista. O texto tem o básico
   (negrito, itálico, listas e títulos) e salva sozinho. Apagar um capítulo pergunta antes e tem o Desfazer.
   Usa TC.dados (a coleção documentos) e TC.mesas; a casca liga o botão e o painel. */
(() => {
  'use strict';
  const PRE = 'notas:';
  const PERMITIDAS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'H3', 'H4', 'P', 'BR', 'DIV']);
  const MAX_HTML = 60000, MAX_TIT = 80, MAX_TAGS = 8;
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c);
    return el;
  }
  // o HTML do texto só com as marcas permitidas, sem atributo nenhum (o que vem de fora — colar de outro lugar — também)
  function limpar(html) {
    const t = document.createElement('template');
    t.innerHTML = String(html || '').slice(0, MAX_HTML * 2);
    const passar = (de, para) => {
      for (const n of [...de.childNodes]) {
        if (n.nodeType === 3) para.append(document.createTextNode(n.textContent));
        else if (n.nodeType === 1) {
          if (PERMITIDAS.has(n.tagName)) { const e = document.createElement(n.tagName === 'DIV' ? 'p' : n.tagName.toLowerCase()); passar(n, e); para.append(e); }
          else passar(n, para);
        }
      }
    };
    const out = document.createElement('div');
    passar(t.content, out);
    return out.innerHTML.slice(0, MAX_HTML);
  }
  const textoDe = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return (d.textContent || '').replace(/\s+/g, ' ').trim(); };
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const lerTags = t => [...new Set(String(t || '').split(/[,;]+/).map(x => x.trim().replace(/\s+/g, ' ').slice(0, 30)).filter(Boolean))].slice(0, MAX_TAGS);
  const novoId = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function iniciar(o) {
    const { mesas, dados, toast, confirmar, botao, painel, guarda } = o;
    let atual = null, filtro = { q: '', tag: '', camp: '*' }, tSalvar = 0, pendente = null;
    const D = () => { try { return mesas.atual ? dados.col('documentos') : null; } catch (e) { return null; } };
    const eMestre = () => !!(mesas.atual && mesas.atual.cargo === 'mestre');
    const chaveUi = () => 'tinycats:notas:' + (mesas.atual ? mesas.atual.id : '');
    const lerUi = () => { try { return JSON.parse(guarda.ler(chaveUi()) || '{}') || {}; } catch (e) { return {}; } };
    const gravarUi = () => guarda.gravar(chaveUi(), JSON.stringify({ atual, filtro }));
    const dadosDe = l => (l && !l.apagado && l.dados && typeof l.dados === 'object' ? l.dados : null);
    function capitulos() {
      const d = D();
      if (!d) return [];
      return d.todas().filter(l => typeof l.id === 'string' && l.id.startsWith(PRE) && dadosDe(l)).map(l => {
        const x = l.dados;
        return { id: l.id, t: String(x.t || 'Sem título').slice(0, MAX_TIT), tags: Array.isArray(x.tags) ? x.tags.map(String).slice(0, MAX_TAGS) : [], camp: typeof x.camp === 'string' && x.camp ? x.camp : null, html: String(x.html || ''), ord: Number(x.ord) || 0, em: Number(x.em) || 0 };
      });
    }
    const campDaVista = () => { const c = mesas.campanha ? mesas.campanha() : null; return c ? c.id : null; };
    const campanhas = () => (mesas.atual && Array.isArray(mesas.atual.campanhas) ? mesas.atual.campanhas : []);
    const nomeCamp = id => { const c = campanhas().find(x => x.id === id); return c ? c.nome : 'outra campanha'; };
    function visiveis() {
      const q = norm(filtro.q), cv = campDaVista();
      return capitulos().filter(c => {
        if (filtro.tag && !c.tags.includes(filtro.tag)) return false;
        if (filtro.camp === 'mundo' && c.camp) return false;
        if (filtro.camp !== '*' && filtro.camp !== 'mundo' && c.camp !== filtro.camp) return false;
        return !q || norm(c.t + ' ' + c.tags.join(' ') + ' ' + textoDe(c.html)).includes(q);
      }).sort((a, b) => ((b.camp && b.camp === cv) - (a.camp && a.camp === cv)) || (a.ord - b.ord) || a.t.localeCompare(b.t, 'pt-BR'));
    }
    function gravar(id, x) {
      const d = D();
      if (!d || !eMestre()) return;
      d.gravar(id, { dados: { v: 1, t: x.t, tags: x.tags, camp: x.camp || null, html: x.html, ord: x.ord || 0, em: Date.now() }, vis: 'mestre' });
    }
    // o que está escrito no editor e ainda não subiu: sobe já
    function salvarJa() {
      clearTimeout(tSalvar);
      if (!pendente) return;
      const p = pendente; pendente = null;
      const c = capitulos().find(x => x.id === p.id);
      if (c) gravar(p.id, Object.assign(c, p.campos));
    }
    function agendar(id, campos) {
      pendente = { id, campos: Object.assign(pendente && pendente.id === id ? pendente.campos : {}, campos) };
      clearTimeout(tSalvar); tSalvar = setTimeout(salvarJa, 700);
    }
    function novo() {
      salvarJa();
      const cs = capitulos(), id = PRE + novoId();
      const camp = filtro.camp !== '*' && filtro.camp !== 'mundo' ? filtro.camp : campDaVista();
      gravar(id, { t: 'Capítulo ' + (cs.length + 1), tags: filtro.tag ? [filtro.tag] : [], camp, html: '', ord: cs.reduce((m, c) => Math.max(m, c.ord), 0) + 1 });
      atual = id; gravarUi(); pintar();
      const t = painel.querySelector('#nt-tit'); if (t) { t.focus(); t.select(); }
    }
    function apagar(c) {
      salvarJa();
      confirmar('Apagar o capítulo “' + c.t + '”?', 'O texto dele sai do bloco de notas. Dá para desfazer logo depois.', 'Apagar', () => apagarJa(c));
    }
    function apagarJa(c) {
      const copia = Object.assign({}, c), d = D();
      if (!d) return;
      d.apagar(c.id);
      if (atual === c.id) atual = null;
      gravarUi(); pintar();
      toast('O capítulo “' + c.t + '” saiu do bloco de notas.', 'Desfazer', () => { gravar(copia.id, copia); atual = copia.id; gravarUi(); pintar(); });
    }
    function cmd(nome, arg) {
      const ed = painel.querySelector('#nt-texto');
      if (!ed) return;
      ed.focus();
      try { document.execCommand(nome, false, arg || null); } catch (e) { /* o navegador sem o comando */ }
      ed.dispatchEvent(new Event('input'));
    }
    function pintar() {
      if (painel.hidden) return;
      const ed0 = painel.querySelector('#nt-texto'), focoNoTexto = ed0 && document.activeElement === ed0;
      const lista = visiveis(), todas = capitulos();
      if (atual && !todas.some(c => c.id === atual)) atual = null;
      if (!atual && lista.length) atual = lista[0].id;
      const c = todas.find(x => x.id === atual) || null;
      const tags = [...new Set(todas.flatMap(x => x.tags))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
      const camps = campanhas();
      // a lista e os filtros (o editor só é refeito quando o capítulo troca ou quando ninguém está escrevendo nele)
      const topo = h('div', { class: 'nt-topo' },
        h('div', { class: 'nt-l' },
          h('input', { type: 'search', class: 'nt-busca', id: 'nt-busca', placeholder: 'Buscar nas notas…', value: filtro.q, 'aria-label': 'Buscar nas notas', oninput: e => { filtro.q = e.target.value; gravarUi(); pintarLista(); } }),
          camps.length ? h('select', { id: 'nt-camp', 'aria-label': 'Filtrar por campanha', onchange: e => { filtro.camp = e.target.value; gravarUi(); pintar(); } },
            h('option', { value: '*', text: 'Todas' }), h('option', { value: 'mundo', text: 'Do mundo' }), camps.map(x => h('option', { value: x.id, text: x.nome }))) : null,
          h('button', { type: 'button', class: 'btn pri sm', id: 'nt-novo', text: '+ Capítulo', onclick: novo })),
        tags.length ? h('div', { class: 'nt-tags', role: 'group', 'aria-label': 'Filtrar por tag' }, tags.map(t => h('button', { type: 'button', class: 'nt-tag' + (filtro.tag === t ? ' on' : ''), 'aria-pressed': String(filtro.tag === t), text: t, onclick: () => { filtro.tag = filtro.tag === t ? '' : t; gravarUi(); pintar(); } }))) : null,
        h('ul', { class: 'nt-lista', id: 'nt-lista' }));
      const corpo = c ? h('div', { class: 'nt-ed', 'data-cap': c.id },
        h('input', { class: 'nt-tit', id: 'nt-tit', value: c.t, maxlength: String(MAX_TIT), 'aria-label': 'Título do capítulo', oninput: e => { agendar(c.id, { t: e.target.value.trim() || 'Sem título' }); pintarLista(); } }),
        h('div', { class: 'nt-l' },
          h('input', { class: 'nt-tagsin', id: 'nt-tagsin', value: c.tags.join(', '), placeholder: 'tags, separadas por vírgula', 'aria-label': 'Tags do capítulo', onchange: e => { agendar(c.id, { tags: lerTags(e.target.value) }); salvarJa(); pintar(); } }),
          camps.length ? h('select', { id: 'nt-capcamp', 'aria-label': 'Campanha do capítulo', onchange: e => { agendar(c.id, { camp: e.target.value || null }); salvarJa(); pintar(); } },
            h('option', { value: '', text: 'Do mundo' }), camps.map(x => h('option', { value: x.id, text: x.nome }))) : null),
        h('div', { class: 'nt-bar', role: 'toolbar', 'aria-label': 'Formatação' },
          [['bold', null, 'N', 'Negrito'], ['italic', null, 'I', 'Itálico'], ['formatBlock', 'h3', 'T', 'Título'], ['formatBlock', 'p', '¶', 'Texto'], ['insertUnorderedList', null, '•', 'Lista'], ['insertOrderedList', null, '1.', 'Lista numerada']]
            .map(([k, a, txt, nome]) => h('button', { type: 'button', class: 'nt-b nt-b-' + k + (a ? '-' + a : ''), title: nome, 'aria-label': nome, text: txt, onmousedown: e => e.preventDefault(), onclick: () => cmd(k, a) })),
          h('span', { class: 'nt-salvo', id: 'nt-salvo', text: 'salva sozinho' }),
          h('button', { type: 'button', class: 'nt-b nt-x', id: 'nt-apagar', title: 'Apagar este capítulo', 'aria-label': 'Apagar este capítulo', text: 'Apagar', onclick: () => apagar(c) })),
        h('div', { class: 'nt-texto', id: 'nt-texto', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Texto do capítulo',
          oninput: e => agendar(c.id, { html: limpar(e.target.innerHTML) }),
          onpaste: e => { const t = e.clipboardData && e.clipboardData.getData('text/html'); if (t) { e.preventDefault(); document.execCommand('insertHTML', false, limpar(t)); } },
          onblur: salvarJa }))
        : h('div', { class: 'nt-vazio' }, h('p', { text: todas.length ? 'Nenhum capítulo com este filtro.' : 'O bloco de notas está vazio. Crie o primeiro capítulo (ou assunto): os planos da sessão, os segredos, os NPCs…' }));
      const mesmo = ed0 && painel.querySelector('.nt-ed') && painel.querySelector('.nt-ed').dataset.cap === (c && c.id);
      const corpoVelho = painel.querySelector('#nt-corpo');
      painel.querySelector('#nt-filtros').replaceChildren(topo);
      if (!(mesmo && focoNoTexto)) {
        corpoVelho.replaceChildren(corpo);
        const ed = corpoVelho.querySelector('#nt-texto');
        if (ed && c) ed.innerHTML = limpar(c.html);
        const sc = corpoVelho.querySelector('#nt-capcamp'); if (sc && c) sc.value = c.camp || '';
      }
      const fc = painel.querySelector('#nt-camp'); if (fc) fc.value = filtro.camp;
      pintarLista();
    }
    function pintarLista() {
      const ul = painel.querySelector('#nt-lista');
      if (!ul) return;
      const cv = campDaVista(), lista = visiveis();
      ul.replaceChildren(...lista.map(c => {
        const t = pendente && pendente.id === c.id && pendente.campos.t ? pendente.campos.t : c.t;
        return h('li', null, h('button', { type: 'button', class: 'nt-cap' + (c.id === atual ? ' on' : ''), 'data-cap': c.id, 'aria-current': c.id === atual ? 'true' : null, onclick: () => { salvarJa(); atual = c.id; gravarUi(); pintar(); } },
          h('b', { text: t }), h('small', { text: [c.camp ? (c.camp === cv ? nomeCamp(c.camp) + ' (em vista)' : nomeCamp(c.camp)) : 'do mundo', c.tags.join(' · ')].filter(Boolean).join(' · ') })));
      }));
    }
    function abrir(v) {
      if (v && !eMestre()) return;
      if (!v) salvarJa();
      painel.hidden = !v;
      botao.setAttribute('aria-pressed', String(!painel.hidden));
      guarda.gravar('tinycats:notas-aberto', v ? '1' : '0');
      if (v) { const u = lerUi(); atual = u.atual || null; filtro = Object.assign({ q: '', tag: '', camp: '*' }, u.filtro || {}); pintar(); }
    }
    function mesaMudou() {
      salvarJa();
      botao.hidden = !eMestre();
      if (!eMestre()) { painel.hidden = true; botao.setAttribute('aria-pressed', 'false'); return; }
      const d = D();
      if (d) d.pronta.then(() => { if (!painel.hidden) pintar(); }, () => {});
      if (guarda.ler('tinycats:notas-aberto') === '1') abrir(true);
    }
    painel.append(h('div', { class: 'nt-h' }, h('strong', { text: 'Bloco de notas' }), h('span', { class: 'nt-so', text: 'só você vê' }),
      h('button', { type: 'button', class: 'ib nt-fechar', id: 'nt-fechar', title: 'Fechar o bloco de notas', 'aria-label': 'Fechar o bloco de notas', text: '×', onclick: () => { abrir(false); botao.focus(); } })),
      h('div', { id: 'nt-filtros' }), h('div', { class: 'nt-corpo', id: 'nt-corpo' }));
    botao.addEventListener('click', () => abrir(painel.hidden));
    mesas.on('muda', mesaMudou);
    dados.on('muda', (col, l, origem) => {
      if (col !== 'documentos' || !l || typeof l.id !== 'string' || !l.id.startsWith(PRE) || painel.hidden) return;
      if (origem === 'local') { const s = painel.querySelector('#nt-salvo'); if (s) s.textContent = 'salvando…'; return; }
      pintar();                                                // (outro aparelho do mestre mexeu)
    });
    dados.on('pendentes', n => { const s = painel.querySelector('#nt-salvo'); if (s && !n) s.textContent = 'salvo'; });
    window.addEventListener('pagehide', salvarJa);
    document.addEventListener('visibilitychange', () => { if (document.hidden) salvarJa(); });
    mesaMudou();
    return { abrir, salvarJa, limpar };
  }
  (window.TC || (window.TC = {})).notas = { iniciar, limpar };
})();
