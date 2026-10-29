/* Tiny Cats · o Bestiário do clã (lote 36): a página.
   O livro de caça de um clã, aberto sobre a mesa: à esquerda a ilustração (presa com fita), a legenda a lápis e as
   anotações do clã; à direita o nome, a descrição com a capitular, o que sabemos, as fraquezas e o que deixa cair.
   Quem mestra o Clã monta as páginas aqui (ou envia do Bestiário dele), revela parte por parte o que o clã descobriu e
   libera o livro para o clã; vê o livro como o clã vê com "Como o clã vê". Quem tem personagem nos cargos do clã lê o
   que foi revelado e anota na margem (o banco assina com o nome do personagem). A conta do que o clã vê está em
   nucleo.js (e no banco, em supabase/migrations/0027_livro_do_cla.sql). Fora de uma mesa, tudo fica neste navegador. */
(() => {
  'use strict';
  const N = window.LivroNucleo;
  const DEBUG = /[?&]debug\b/.test(location.search);
  const $ = id => document.getElementById(id);
  const j = JSON.stringify;
  const copia = x => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const SVG = 'http://www.w3.org/2000/svg';
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
  // um desenho em SVG a partir de um texto fixo daqui (nunca de quem usa)
  function svg(w, hgt, vb, corpo, attrs) {
    const s = document.createElementNS(SVG, 'svg');
    s.setAttribute('width', w); s.setAttribute('height', hgt); s.setAttribute('viewBox', vb); s.setAttribute('aria-hidden', 'true');
    for (const k in attrs || {}) s.setAttribute(k, attrs[k]);
    s.innerHTML = corpo;
    return s;
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
    const tempo = ms || (acao ? 8000 : 4200);
    let relogio = setTimeout(() => t.remove(), tempo);
    t.addEventListener('pointerenter', () => clearTimeout(relogio));
    t.addEventListener('pointerleave', () => { clearTimeout(relogio); relogio = setTimeout(() => t.remove(), 2500); });
  }

  /* ---------------- os documentos ---------------- */
  const L_LOCAL = 'tinycats:livro:local', L_UI = 'tinycats:livro:ui', L_CLAS = 'tinycats:cla:local';
  let st = null, D = null, P = null, naMesa = false, mestre = true, eu = null, pronto = false;
  let local = { docs: {} }, pilha = [], tSalvo = 0, busca = '';
  const ui = (() => { try { const u = JSON.parse(guarda.ler(L_UI) || '{}'); return ehObj(u) ? u : {}; } catch (e) { return {}; } })();
  if (!ehObj(ui.pag)) ui.pag = {};
  if (ui.vista !== 'cla') ui.vista = 'mestre';
  const salvarUi = () => guarda.gravar(L_UI, j(ui));
  function lerLocal() { try { const d = JSON.parse(guarda.ler(L_LOCAL) || 'null'); local = ehObj(d) && ehObj(d.docs) ? d : { docs: {} }; } catch (e) { local = { docs: {} }; } }
  function salvarLocal() { if (!guarda.gravar(L_LOCAL, j(local))) toast('Não deu para guardar neste navegador (a imagem pode ser grande demais para ele).'); }
  function doc(id) {
    if (!naMesa) return local.docs[id] == null ? null : local.docs[id];
    const l = D && D.pegar(id);
    return l && !l.apagado ? l.dados : null;
  }
  function gravarDoc(id, dados) {
    if (naMesa) { const campos = { dados: copia(dados) }; if (!D.pegar(id)) campos.vis = 'mestre'; D.gravar(id, campos); }
    else { local.docs[id] = copia(dados); salvarLocal(); }
    marcarSalvo();
  }
  function apagarDoc(id) {
    if (naMesa) D.apagar(id); else { delete local.docs[id]; salvarLocal(); }
    marcarSalvo();
  }
  // os documentos de agora, como [{ id, dados }] (sem os apagados)
  function todos() {
    if (!naMesa) return Object.keys(local.docs).map(id => ({ id, dados: local.docs[id] }));
    return D.todas().filter(l => l && !l.apagado && typeof l.id === 'string').map(l => ({ id: l.id, dados: l.dados }));
  }
  function marcarSalvo() {
    const el = $('salvo');
    el.textContent = naMesa ? 'Salvando…' : 'Neste navegador';
    clearTimeout(tSalvo);
    if (naMesa) tSalvo = setTimeout(() => { el.textContent = 'Salvo na mesa'; }, 700);
  }
  function empilhar(rotulo, desfazer) { pilha.push({ rotulo, desfazer }); if (pilha.length > 40) pilha.shift(); $('btDesfazer').disabled = false; }
  function desfazer() {
    const p = pilha.pop();
    $('btDesfazer').disabled = !pilha.length;
    if (!p) return;
    try { p.desfazer(); pintar(); toast('Desfeito: ' + p.rotulo + '.'); } catch (e) { pintar(); toast((e && e.message) || 'Não deu para desfazer.'); }
  }
  // uma mudança no livro, com Desfazer: o documento volta a ser o que era (ou some, se não existia)
  function mudar(id, rotulo, depois, msg) {
    const antes = copia(doc(id));
    gravarDoc(id, depois);
    empilhar(rotulo, () => { if (antes) gravarDoc(id, antes); else apagarDoc(id); });
    pintar();
    if (msg) toast(msg, 'Desfazer', desfazer);
  }

  /* ---------------- o que há para ler ---------------- */
  // os clãs da mesa (quem mestra): [{ id, nome }]
  function clasMestre() {
    const out = [];
    if (naMesa) { for (const x of todos()) if (x.id.startsWith('cla:c:') && N.idCla(x.id.slice(6)) && ehObj(x.dados)) out.push({ id: x.id.slice(6), nome: String(x.dados.nome || 'Clã').slice(0, 60), ordem: +x.dados.ordem || 0 }); }
    else {
      let l = {}; try { const d = JSON.parse(guarda.ler(L_CLAS) || 'null'); l = ehObj(d) ? d : {}; } catch (e) { l = {}; }
      for (const k in l) if (k.startsWith('cla:c:') && N.idCla(k.slice(6)) && ehObj(l[k])) out.push({ id: k.slice(6), nome: String(l[k].nome || 'Clã').slice(0, 60), ordem: +l[k].ordem || 0 });
    }
    return out.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  // os livros de quem joga: as capas que o banco entregou (só as dos clãs em que a pessoa está)
  function livrosJogador() {
    const out = [];
    for (const x of todos()) { const q = N.qualDoc(x.id); if (q && q.k === 'capaPub' && ehObj(x.dados) && !x.dados.oculto) out.push({ id: q.cla, nome: String(x.dados.titulo || '').slice(0, 60) || 'Bestiário do clã' }); }
    return out.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  const capa = cla => N.normCapa(doc(N.idCapa(cla)));
  const temCapa = cla => !!doc(N.idCapa(cla));
  function nomeDoCla(cla) { const c = clasMestre().find(x => x.id === cla); return c ? c.nome : ''; }
  function tituloDe(cla) {
    if (!mestre) { const l = livrosJogador().find(x => x.id === cla); return l ? l.nome : 'Bestiário do clã'; }
    return capa(cla).titulo || N.tituloPadrao(nomeDoCla(cla));
  }
  function paginasMestre(cla) {
    const pre = N.PRE + cla + ':p:', out = [];
    for (const x of todos()) if (x.id.startsWith(pre) && N.idPag(x.id.slice(pre.length))) out.push({ id: x.id.slice(pre.length), p: N.normPagina(x.dados) });
    return out.sort((a, b) => a.p.nome.localeCompare(b.p.nome, 'pt-BR'));
  }
  function paginasPub(cla) {
    const pre = N.PRE_PUB + cla + ':p:', out = [];
    for (const x of todos()) if (x.id.startsWith(pre) && N.idPag(x.id.slice(pre.length))) { const p = N.normPub(x.dados); if (p) out.push({ id: x.id.slice(pre.length), p }); }
    return out.sort((a, b) => a.p.nome.localeCompare(b.p.nome, 'pt-BR'));
  }
  const notasDe = (cla, pag) => (naMesa ? N.normNotas(doc(N.idNotas(cla, pag))) : []);

  /* O livro aberto agora: { cla, titulo, modo: 'mestre' | 'cla' | 'jogador', pags: [{ id, p (o que a página mostra),
     cheia (a página inteira: só no modo do mestre), notas }] }. */
  function livroAberto() {
    const lista = mestre ? clasMestre() : livrosJogador();
    if (!lista.length) return null;
    if (!lista.some(x => x.id === ui.cla)) ui.cla = (lista.find(x => temCapa(x.id)) || lista[0]).id;
    const cla = ui.cla;
    let pags, modo;
    if (!mestre) { modo = 'jogador'; pags = paginasPub(cla); }
    else if (ui.vista === 'cla') {
      modo = 'cla';
      const c = doc(N.idCapa(cla));
      pags = paginasMestre(cla).map(x => ({ id: x.id, p: N.normPub(N.projetar(x.p, c)) })).filter(x => x.p);
    } else { modo = 'mestre'; pags = paginasMestre(cla).map(x => ({ id: x.id, p: x.p, cheia: x.p })); }
    for (const x of pags) x.notas = notasDe(cla, x.id);
    return { cla, lista, titulo: tituloDe(cla), modo, pags };
  }
  function indiceAtual(L) {
    if (!L.pags.length) return -1;
    const i = L.pags.findIndex(x => x.id === ui.pag[L.cla]);
    return i >= 0 ? i : 0;
  }
  function irPara(L, i) {
    if (!L.pags.length) return;
    i = Math.max(0, Math.min(L.pags.length - 1, i));
    ui.pag[L.cla] = L.pags[i].id; salvarUi();
    pintar();
    const d = $('pagDir'), e = $('pagEsq'); if (d) d.scrollTop = 0; if (e) e.scrollTop = 0;
  }

  /* ---------------- pintar ---------------- */
  const CAPITULAR = '<rect x="3" y="3" width="56" height="55" fill="rgba(176,136,48,.10)" stroke="#a8852f" stroke-width="1.4" stroke-opacity=".75"/><rect x="6.5" y="6.5" width="49" height="48" fill="none" stroke="#3b2a1a" stroke-width=".8" stroke-opacity=".55"/><path d="M8 52 C 14 40, 6 30, 14 22 S 12 9, 22 8" fill="none" stroke="#5b6b2e" stroke-width="1.1" stroke-opacity=".8" stroke-linecap="round"/><path d="M13 23 q -5 -2 -6 -7 q 5 1 6 7 M11 37 q -5 0 -7 -4 q 5 -1 7 4 M21 8.5 q 1 -5 6 -6 q -1 5 -6 6" fill="#6f7f38" fill-opacity=".55" stroke="#3b2a1a" stroke-width=".5" stroke-opacity=".5"/><circle cx="52" cy="10" r="1.6" fill="#8e2a1f" fill-opacity=".7"/><circle cx="49" cy="51" r="1.2" fill="#a8852f" fill-opacity=".8"/>';
  const FLOREIO = '<path d="M10 8 Q 40 15 80 8 T 150 8" stroke="#2b2222" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="80" cy="8" r="2" fill="#2b2222"/>';
  const CLIPE = '<path d="M10,40 V15 C10,5 30,5 30,15 V45 C30,60 5,60 5,45 V10" stroke="#8a8d94" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M10,40 V15 C10,5 30,5 30,15 V45 C30,60 5,60 5,45 V10" stroke="#4a4c54" stroke-width="1" stroke-linecap="round" fill="none"/>';
  const SEM_DESENHO = '<path d="M14 44c4-10 10-16 18-18s14 2 16 8" fill="none" stroke="#4a4d54" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="3 4"/><path d="M28 18c0-5 4-8 8-8s8 3 8 7c0 5-6 6-6 11" fill="none" stroke="#4a4d54" stroke-width="2" stroke-linecap="round"/><circle cx="38" cy="34" r="1.6" fill="#4a4d54"/>';
  // os desenhos das fraquezas e resistências, pelo nome (o que não tem desenho fica com um losango)
  const ICONES = [
    [/fogo|chama|brasa|queima|incend/, '<path d="M12 21c-4 0-6.5-2.6-6.5-6.2 0-3.5 2.6-5.6 3.6-8.8 1.9 1.5 2.4 3.4 2.2 5 1.3-1.1 2-2.8 1.8-4.8 3.1 2.2 5.4 5.3 5.4 8.7 0 3.5-2.6 6.1-6.5 6.1z"/>'],
    [/gelo|frio|neve|congel|geada/, '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>'],
    [/luz|sol|sagrad|divin|santo|ben[cç]/, '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'],
    [/raio|eletr|trov|rel[aâ]mp/, '<path d="M13 2 5 13.5h6L10 22l9-12h-6z"/>'],
    [/veneno|[aá]cido|pe[cç]onh|toxi/, '<path d="M12 3c3.5 4.6 6 7.8 6 11a6 6 0 0 1-12 0c0-3.2 2.5-6.4 6-11z"/><path d="M9.5 14.5h.01M14.5 14.5h.01"/>'],
    [/[aá]gua|mar|chuva|afog/, '<path d="M3 9c2.5-2 4.5-2 7 0s4.5 2 7 0 3-1.6 4-1M3 15c2.5-2 4.5-2 7 0s4.5 2 7 0 3-1.6 4-1"/>'],
    [/sombra|treva|escur|necro|morte/, '<path d="M15.5 3.5A8.5 8.5 0 1 0 20.5 15a7 7 0 0 1-5-11.5z"/>'],
    [/prata|lua|arcan|m[aá]gi/, '<path d="m12 3 2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>'],
    [/terra|pedra|rocha|press/, '<path d="m3 19 6-10 4 6 3-4 5 8z"/>'],
    [/vento|ar\b|tempest|furac/, '<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h7"/>'],
    [/corte|l[aâ]mina|perfur|flecha|ferro|a[cç]o|espada/, '<path d="M4 20 15 9M14 4l6 6-3 1-4-4zM6 14l4 4M4 20l2-2"/>'],
  ];
  function iconeFr(nome, tipo) {
    const s = String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const x = ICONES.find(([re]) => re.test(s));
    const cor = tipo === 'fraco' ? '#6b1414' : '#4a3a32';
    return svg(18, 18, '0 0 24 24', x ? x[1] : '<path d="m12 4 7 8-7 8-7-8z"/>', { fill: 'none', stroke: cor, 'stroke-width': '1.9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  }
  const TIPO_PALAVRA = { fraco: 'fraco', resiste: 'resiste', imune: 'imune' };

  function pintar() {
    if (!pronto) return;
    const L = livroAberto();
    pintarTopo(L);
    const temLivro = !!L;
    $('livro').hidden = !temLivro; $('pe').hidden = !temLivro; $('indice').hidden = !temLivro;
    $('semLivro').hidden = temLivro;
    if (!L) {
      trocar($('semLivro'), mestre
        ? [h('strong', { text: 'Ainda não há clã na mesa.' }), h('span', { text: 'Cada clã tem o livro dele: crie o clã na aba Clã e volte aqui para montar as páginas.' })]
        : [h('strong', { text: 'O livro do seu clã ainda não chegou.' }), h('span', { text: 'Quando o mestre liberar, ele aparece aqui.' })]);
      return;
    }
    const i = indiceAtual(L), x = i >= 0 ? L.pags[i] : null;
    // o índice
    const ind = N.indice(L.pags.map(y => y.p)), letraAqui = x ? N.letraDoIndice(x.p.nome) : null;
    trocar($('indice'), ind.map(k => h('button', { type: 'button', 'data-letra': k.l, 'aria-current': String(k.l === letraAqui), title: 'Ir para a letra ' + k.l, onclick: () => irPara(L, k.i) }, k.l)));
    $('btAnt').disabled = i <= 0; $('btProx').disabled = i < 0 || i >= L.pags.length - 1;
    $('folhas').classList.toggle('mestre', L.modo === 'mestre');
    if (!x) { pintarBranco(L); return; }
    pintarEsq(L, x, i);
    pintarDir(L, x, i);
  }
  function pintarTopo(L) {
    const lista = L ? L.lista : [];
    const q = $('qual');
    q.hidden = !lista.length;
    if (lista.length) {
      const sel = $('escolha');
      trocar(sel, lista.map(c => h('option', { value: c.id, selected: L && c.id === L.cla }, mestre ? tituloDe(c.id) + (capa(c.id).on ? '' : ' (trancado)') : c.nome)));
      sel.disabled = lista.length < 2;
    }
    $('contagem').textContent = L ? (L.pags.length === 1 ? '1 página' : L.pags.length + ' páginas') + (L.modo === 'cla' ? ' que o clã vê' : '') : '';
    $('ctl').hidden = !mestre || !L;
    if (mestre && L) {
      const c = capa(L.cla);
      for (const b of $('vistas').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.vista === ui.vista));
      $('liberar').checked = c.on; $('chLiberar').classList.toggle('on', c.on);
      $('btEditar').disabled = !L.pags.length || L.modo !== 'mestre';
      $('btNova').disabled = L.modo !== 'mestre';
    }
    // o aviso de cima: o livro trancado (quem mestra), ou o banco sem a atualização
    const av = $('aviso');
    let t = '';
    if (mestre && L && !capa(L.cla).on) t = 'O livro de ' + (nomeDoCla(L.cla) || 'este clã') + ' está trancado: só você o vê. Quando quiser que o clã leia, marque “Liberado para o clã” (o clã vê só as páginas e as partes que você revelar).';
    else if (mestre && L && naMesa && semBanco[L.cla]) t = 'O banco desta mesa ainda não monta o livro para o clã: falta rodar a atualização do banco desta versão (o arquivo 0027). Até lá, só você vê o livro.';
    av.hidden = !t; av.textContent = t;
  }
  function pintarBranco(L) {
    const esq = [h('div', { class: 'branco' }, h('strong', { text: L.titulo }), h('span', { text: L.modo === 'mestre' ? 'Um livro em branco, à espera da primeira criatura.' : L.modo === 'cla' ? 'O clã ainda não vê nenhuma página.' : 'O clã ainda não registrou nenhuma criatura.' }))];
    const dir = [h('div', { class: 'branco' }, L.modo === 'mestre'
      ? h('span', { text: 'Comece com “+ Página”, ou envie um inimigo do seu Bestiário: na gaveta dele, “Enviar ao livro do clã”. Tudo chega escondido do clã, e você revela parte por parte.' })
      : L.modo === 'cla' ? h('span', { text: 'Em “Modo do mestre”, abra uma página e use “Mostrar ao clã”.' }) : h('span', { text: 'Quando o clã descobrir algo, a página aparece aqui.' }))];
    trocar($('pagEsq'), esq); trocar($('pagDir'), dir);
    $('numEsq').textContent = '1'; $('numDir').textContent = '2';
  }
  const tem = (x, k) => N.temConteudo(Object.assign({ img: null, legenda: '', desc: '', nums: [], fraq: [], saque: [] }, x.p), k);
  // o estado de uma parte nesta página: 'mostra' (o conteúdo, para quem lê), 'esc' (quem mestra: o conteúdo, escondido
  // do clã), 'oc' (quem lê: existe, mas o clã ainda não sabe) ou null (vazia)
  function estado(L, x, k) {
    if (L.modo === 'mestre') return tem(x, k) ? (x.cheia.ver[k] ? 'mostra' : 'esc') : null;
    if (x.p.oc.includes(k)) return 'oc';
    return k in x.p && tem(x, k) ? 'mostra' : null;
  }
  function botaoRevelar(L, x, k) {
    if (L.modo !== 'mestre') return null;
    const ve = !!x.cheia.ver[k], nome = (N.PARTES.find(p => p[0] === k) || [k, k])[1];
    return h('button', { type: 'button', class: 'tg' + (ve ? ' vendo' : ''), 'data-revelar': k, 'aria-pressed': String(ve), title: ve ? 'O clã vê esta parte: clique para esconder' : 'Escondido do clã: clique para revelar',
      onclick: () => revelar(L.cla, x.id, k, !ve, nome) }, ve ? 'O clã vê' : 'Escondido · revelar');
  }
  function pintarEsq(L, x, i) {
    const kids = [];
    if (L.modo === 'mestre') {
      const ve = x.cheia.ver.pag, esc = N.PARTES.filter(([k]) => tem(x, k) && !x.cheia.ver[k]).length;
      kids.push(h('div', { class: 'faixa-mestre' + (ve ? ' vendo' : ''), 'data-k': 'faixa' },
        h('span', { style: { flex: '1' }, text: ve ? (esc ? 'O clã vê esta página (com ' + esc + (esc === 1 ? ' parte escondida).' : ' partes escondidas).') : 'O clã vê esta página inteira.') : 'Esta página está escondida do clã.' }),
        ve ? (esc ? h('button', { type: 'button', class: 'btn sm', 'data-k': 'revelar-tudo', onclick: () => revelarTudo(L.cla, x.id) }, 'Revelar tudo') : null) : null,
        h('button', { type: 'button', class: 'btn sm', 'data-k': 'ver-pag', onclick: () => revelar(L.cla, x.id, 'pag', !ve, 'A página') }, ve ? 'Esconder do clã' : 'Mostrar ao clã')));
    }
    // a ilustração
    const e = estado(L, x, 'img');
    const foto = h('div', { class: 'foto' + (e === 'esc' ? ' escondida' : ''), 'data-k': 'foto' },
      h('span', { class: 'fita-cola fc1' }), h('span', { class: 'fita-cola fc2' }), svg(30, 46, '0 0 40 60', CLIPE, { class: 'clipe' }),
      e && e !== 'oc' && x.p.img ? h('img', { src: x.p.img, alt: 'Desenho de ' + x.p.nome, loading: 'lazy', decoding: 'async',
        onerror: ev => { ev.target.onerror = null; ev.target.replaceWith(h('div', { class: 'sem' }, svg(64, 52, '0 0 64 52', SEM_DESENHO), 'o desenho não abriu')); } })
        : h('div', { class: 'sem' }, svg(64, 52, '0 0 64 52', SEM_DESENHO), e === 'oc' ? 'ainda não sabemos como é' : 'ainda sem desenho'));
    const legTxt = e === 'oc' ? 'avistado em algum lugar' : (e && x.p.legenda) || '';
    kids.push(h('div', { class: 'ilus' + (e === 'esc' ? ' escondida' : '') }, foto,
      legTxt ? h('div', { class: 'legenda' + (e === 'oc' ? ' borrado' : ''), 'aria-hidden': e === 'oc' ? 'true' : null }, legTxt) : null,
      e === 'oc' ? h('span', { class: 'sr', text: 'O clã ainda não sabe como esta criatura é.' }) : null,
      botaoRevelar(L, x, 'img') ? h('div', { style: { marginTop: '10px' } }, botaoRevelar(L, x, 'img')) : null));
    // a margem: as anotações do clã
    kids.push(margem(L, x));
    trocar($('pagEsq'), kids);
    $('numEsq').textContent = String(2 * i + 1);
  }
  const VISIVEIS = 3;
  function margem(L, x) {
    const ns = x.notas;
    if (!ns.length) return null;
    const mostrar = ns.slice(-VISIVEIS);
    return h('div', { class: 'margem', 'aria-label': 'Anotações do clã' },
      mostrar.map((n, k) => nota(L, x, n, k)),
      ns.length > VISIVEIS ? h('button', { type: 'button', class: 'mais-notas', 'data-k': 'todas-notas', onclick: () => todasAsNotas(L, x) }, 'e mais ' + (ns.length - VISIVEIS) + (ns.length - VISIVEIS === 1 ? ' anotação' : ' anotações')) : null);
  }
  function nota(L, x, n, k) {
    const minha = !mestre && n.autor === eu, podeApagar = minha || mestre;
    return h('figure', { class: 'nota ' + N.letraDe(n.autor) + (k % 3 === 0 ? ' rasgada' : ''), 'data-nota': n.id, style: { margin: '0' } },
      k % 2 === 0 ? h('span', { class: 'fita-cola' }) : h('span', { class: 'alfinete' }),
      h('p', { text: n.texto }),
      h('figcaption', { class: 'quem', text: '— ' + n.nome + (n.ed ? ' (editada)' : '') }),
      podeApagar && naMesa ? h('div', { class: 'acoes-nota' },
        minha ? h('button', { type: 'button', 'data-k': 'nota-editar', onclick: () => anotar(L, x, n) }, 'Editar') : null,
        h('button', { type: 'button', 'data-k': 'nota-apagar', onclick: () => apagarNota(L, x, n) }, 'Apagar')) : null);
  }
  function pintarDir(L, x, i) {
    const kids = [h('div', { class: 'cab' }, h('h1', { id: 'nome', text: x.p.nome }), svg(160, 15, '0 0 160 15', FLOREIO))];
    // a descrição, com a capitular
    const ed = estado(L, x, 'desc');
    if (ed === 'mostra' || ed === 'esc') {
      const pars = String(x.p.desc).split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
      const prim = pars[0] || '', letra = prim.charAt(0);
      kids.push(h('div', { class: 'parte texto' + (ed === 'esc' ? ' escondida' : ''), 'data-parte': 'desc', style: { marginTop: '0' } },
        botaoRevelar(L, x, 'desc') ? h('div', { style: { margin: '0 0 6px', font: '13px var(--ui)' } }, h('span', { class: 'sr', text: 'A descrição: ' }), botaoRevelar(L, x, 'desc')) : null,
        h('p', null, /\p{L}/u.test(letra) ? [h('span', { class: 'capitular', 'aria-hidden': 'true' }, svg('100%', '100%', '0 0 62 61', CAPITULAR), h('b', { text: letra.toUpperCase() })), h('span', { class: 'sr', text: letra }), prim.slice(1)] : prim),
        pars.slice(1).map(s => h('p', { text: s }))));
    } else if (ed === 'oc') kids.push(h('div', { class: 'parte', 'data-parte': 'desc', style: { marginTop: '0' } }, h('p', { class: 'borrado', 'aria-hidden': 'true', style: { margin: '0' } }, 'Uma criatura de que pouco se sabe, vista ao longe pelos caçadores do clã.'), h('span', { class: 'nao-sabemos', text: 'O clã ainda não sabe como ela vive.' })));
    // o que sabemos, as fraquezas e resistências, o que deixa cair
    kids.push(parte(L, x, 'nums', 'O que sabemos', () => h('dl', { class: 'quadro' }, x.p.nums.map(n => [h('dt', { text: n.n ? n.n + ':' : '' }), h('dd', { text: n.v })])), 'Os números ainda são um mistério.'));
    kids.push(parte(L, x, 'fraq', 'Fraquezas e resistências', () => h('div', { class: 'fraqs' }, x.p.fraq.map(f => h('span', { class: 'fr ' + f.tipo }, iconeFr(f.nome, f.tipo), h('span', { text: f.nome }), h('small', { text: TIPO_PALAVRA[f.tipo] })))), 'Ninguém descobriu ainda o que fere ou não fere.'));
    kids.push(parte(L, x, 'saque', 'Deixa cair', () => h('ul', { class: 'saque' }, x.p.saque.map(s => h('li', { text: s }))), 'O que ela deixa cair, ninguém viu.'));
    // anotar na margem: quem é do clã
    if (L.modo === 'jogador') kids.push(h('button', { type: 'button', class: 'anotar', id: 'btAnotar', onclick: () => anotar(L, x, null) }, svg(16, 16, '0 0 24 24', '<path d="M4 20l4-1L19 8l-3-3L5 16z"/><path d="M14 6l3 3"/>', { fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }), 'Anotar na margem…'));
    trocar($('pagDir'), kids);
    $('numDir').textContent = String(2 * i + 2);
  }
  function parte(L, x, k, titulo, corpo, naoSabemos) {
    const e = estado(L, x, k);
    if (!e) return null;
    return h('section', { class: 'parte' + (e === 'esc' ? ' escondida' : ''), 'data-parte': k },
      h('h2', null, titulo, botaoRevelar(L, x, k)),
      e === 'oc' ? [h('p', { class: 'borrado', 'aria-hidden': 'true', style: { margin: '0' } }, k === 'nums' ? 'Vida: ~?? · Perigo: ●●○○○' : k === 'fraq' ? 'tinta borrada, quase ilegível' : 'algo que ninguém viu cair'), h('span', { class: 'nao-sabemos', text: naoSabemos })] : corpo());
  }

  /* ---------------- quem mestra: revelar, liberar, editar ---------------- */
  function revelar(cla, pag, k, sim, nome) {
    const id = N.idPagina(cla, pag), p = N.normPagina(doc(id));
    if (!!p.ver[k] === sim) return;
    p.ver[k] = sim;
    mudar(id, (sim ? 'revelar ' : 'esconder ') + nome.toLowerCase(), p, k === 'pag' ? (sim ? 'A página ' + p.nome + ' agora aparece para o clã.' : 'A página ' + p.nome + ' foi escondida do clã.') : (sim ? 'Revelado ao clã: ' : 'Escondido do clã: ') + nome + '.');
  }
  function revelarTudo(cla, pag) {
    const id = N.idPagina(cla, pag), p = N.normPagina(doc(id));
    p.ver.pag = true; for (const [k] of N.PARTES) p.ver[k] = true;
    mudar(id, 'revelar a página inteira', p, 'O clã agora vê tudo de ' + p.nome + '.');
  }
  const semBanco = {};
  function liberar(sim) {
    const L = livroAberto(); if (!L) return;
    const id = N.idCapa(L.cla), c = capa(L.cla);
    if (!c.titulo) c.titulo = N.tituloPadrao(nomeDoCla(L.cla));
    c.on = sim;
    mudar(id, sim ? 'liberar o livro' : 'trancar o livro', c, sim ? 'O livro está liberado: quem está nos cargos de ' + (nomeDoCla(L.cla) || 'o clã') + ' lê as páginas que você mostrou.' : 'O livro foi trancado: o clã deixa de ler.');
    // (com o livro liberado, o banco monta a capa do clã: se ela não aparece, falta a atualização do banco)
    if (sim && naMesa) {
      const cla = L.cla, falta = () => { const l = D.pegar(N.idCapaPub(cla)); return capa(cla).on && !(l && !l.apagado); };
      // (olha duas vezes: a capa do clã pode demorar a chegar a este aparelho)
      setTimeout(() => {
        if (!falta()) { if (semBanco[cla]) { delete semBanco[cla]; pintar(); } return; }
        setTimeout(() => { if (falta()) semBanco[cla] = true; else delete semBanco[cla]; pintar(); }, 14000);
      }, 6000);
    }
  }
  async function trocarTitulo() {
    const L = livroAberto(); if (!L) return;
    const c = capa(L.cla), atual = c.titulo || N.tituloPadrao(nomeDoCla(L.cla));
    const novo = await pedirTexto('O título do livro', 'Como o clã chama o livro', atual, N.MAX.titulo);
    if (novo == null || novo === atual) return;
    c.titulo = novo || N.tituloPadrao(nomeDoCla(L.cla));
    mudar(N.idCapa(L.cla), 'renomear o livro', c, 'O livro agora se chama “' + c.titulo + '”.');
  }
  function pedirTexto(titulo, rotulo, valor, max) {
    return new Promise(ok => {
      const dl = $('dlg'), inp = h('input', { class: 'in', id: 'pt-txt', value: valor || '', maxlength: String(max || 60), autocomplete: 'off' });
      let feito = false;
      const fim = v => { if (feito) return; feito = true; dl.onclose = null; dl.close(); ok(v); };
      trocar(dl, h('div', { class: 'dl-h' }, h('h2', { id: 'dlg-tit', text: titulo })),
        h('div', { class: 'dl-c' }, h('label', { class: 'field' }, h('span', { text: rotulo }), inp)),
        h('div', { class: 'dl-a' }, h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: () => fim(null) }), h('button', { type: 'button', class: 'btn pri', id: 'pt-ok', text: 'Guardar', onclick: () => fim(inp.value.trim()) })));
      inp.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); fim(inp.value.trim()); } };
      dl.onclose = () => { if (!feito) { feito = true; ok(null); } };
      dl.showModal(); inp.focus(); inp.select();
    });
  }

  /* A janela de editar uma página (ou criar uma nova). */
  let ed = null;            // { cla, pag (null: nova), p (o rascunho), antes }
  function editar(nova) {
    const L = livroAberto(); if (!L || L.modo !== 'mestre') return;
    const i = indiceAtual(L), x = !nova && i >= 0 ? L.pags[i] : null;
    if (!nova && !x) return;
    ed = { cla: L.cla, pag: x ? x.id : null, p: x ? copia(x.cheia) : N.novaPagina(), antes: x ? copia(x.cheia) : null };
    const dl = $('dlg');
    dl.onclose = () => { ed = null; };
    dl.onkeydown = ev => { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); salvarEd(); } };
    pintarEd();
    dl.showModal();
    const n = $('ed-nome'); if (n) { n.focus(); if (nova) n.select(); }
  }
  function salvarEd() {
    if (!ed) return;
    const p = ed.antes ? N.marcarMao(ed.antes, ed.p) : N.normPagina(ed.p);
    if (!String(ed.p.nome || '').trim()) { toast('Dê um nome à criatura.'); return; }
    const pag = ed.pag || N.uid(), id = N.idPagina(ed.cla, pag), nova = !ed.pag;
    ui.pag[ed.cla] = pag; salvarUi();
    const nome = p.nome;
    ed = null; $('dlg').close();
    mudar(id, (nova ? 'criar a página ' : 'mudar a página ') + nome, p, nova ? 'A página ' + nome + ' entrou no livro (escondida do clã).' : nome + ': guardado.');
  }
  function apagarPagina() {
    if (!ed || !ed.pag) return;
    const cla = ed.cla, pag = ed.pag, id = N.idPagina(cla, pag), antes = copia(doc(id)), nome = N.normPagina(antes).nome;
    ed = null; $('dlg').close();
    apagarDoc(id);
    empilhar('apagar a página ' + nome, () => { gravarDoc(id, antes); ui.pag[cla] = pag; });
    pintar();
    toast('A página ' + nome + ' saiu do livro.', 'Desfazer', desfazer);
  }
  const campo = (rotulo, el, dica) => h('label', { class: 'field' }, h('span', { text: rotulo }), el, dica ? h('span', { class: 'ajuda', text: dica }) : null);
  function pintarEd() {
    if (!ed) return;
    const dl = $('dlg'), p = ed.p, a = document.activeElement, foco = a && dl.contains(a) && a.id ? a.id : null;
    const scroll = dl.querySelector('.dl-c') ? dl.querySelector('.dl-c').scrollTop : 0;
    const muda = (fn, repinta) => ev => { fn(ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value); if (repinta) pintarEd(); };
    p.nums = Array.isArray(p.nums) ? p.nums : []; p.fraq = Array.isArray(p.fraq) ? p.fraq : []; p.saque = Array.isArray(p.saque) ? p.saque : [];
    p.ver = ehObj(p.ver) ? p.ver : {};
    const quando = p.enviado ? new Date(p.enviado) : null;
    trocar(dl,
      h('div', { class: 'dl-h' }, h('h2', { id: 'dlg-tit', text: ed.pag ? 'Editar a página' : 'Uma página nova' }), h('button', { type: 'button', class: 'ib leve', 'aria-label': 'Fechar sem guardar', title: 'Fechar sem guardar', onclick: () => dl.close() }, '×')),
      h('div', { class: 'dl-c' },
        p.de ? h('p', { class: 'veio', text: 'Veio do seu Bestiário' + (quando && !isNaN(quando) ? ' (enviada em ' + quando.toLocaleDateString('pt-BR') + ')' : '') + '. Se você enviar de novo, o que você mudar aqui fica como está; o resto se atualiza.' }) : null,
        campo('Nome', h('input', { class: 'in', id: 'ed-nome', value: p.nome, maxlength: String(N.MAX.nome), autocomplete: 'off', oninput: muda(v => { p.nome = v; }) })),
        h('div', { class: 'field' }, h('span', { text: 'Ilustração' }),
          h('div', { class: 'img-ed' }, p.img ? h('img', { src: p.img, alt: '' }) : null,
            h('button', { type: 'button', class: 'btn sm', id: 'ed-img', text: p.img ? 'Trocar a imagem…' : 'Escolher uma imagem…', onclick: () => $('arquivo').click() }),
            p.img ? h('button', { type: 'button', class: 'btn sm per', id: 'ed-img-tirar', text: 'Tirar a imagem', onclick: () => { p.img = null; pintarEd(); } }) : null),
          h('span', { class: 'ajuda', text: 'Um desenho a mão (do Gemini, por exemplo): ele aparece preso na página com fita. A imagem é reduzida antes de subir.' })),
        campo('Legenda a lápis', h('input', { class: 'in', id: 'ed-legenda', value: p.legenda, maxlength: String(N.MAX.legenda), placeholder: 'ex.: Avistado na Floresta de Merunê, na terceira lua.', autocomplete: 'off', oninput: muda(v => { p.legenda = v; }) })),
        campo('Descrição', h('textarea', { class: 'in', id: 'ed-desc', rows: '6', maxlength: String(N.MAX.desc), oninput: muda(v => { p.desc = v; }) }, p.desc), 'Uma linha em branco começa outro parágrafo. A primeira letra vira a capitular.'),
        h('div', { class: 'field' }, h('span', { text: 'O que sabemos' }),
          h('div', { class: 'linhas', id: 'ed-nums' }, p.nums.map((n, i) => h('div', { class: 'lin' },
            h('input', { class: 'in', id: 'ed-num-n-' + i, value: n.n, maxlength: String(N.MAX.numN), placeholder: 'Vida', 'aria-label': 'O que é', style: { maxWidth: '170px' }, oninput: muda(v => { n.n = v; }) }),
            h('input', { class: 'in', id: 'ed-num-v-' + i, value: n.v, maxlength: String(N.MAX.numV), placeholder: '~120', 'aria-label': 'Quanto', oninput: muda(v => { n.v = v; }) }),
            h('button', { type: 'button', class: 'ib leve', 'aria-label': 'Tirar ' + (n.n || 'a linha'), onclick: () => { p.nums.splice(i, 1); pintarEd(); } }, '×')))),
          p.nums.length < N.MAX.nums ? h('div', null, h('button', { type: 'button', class: 'btn sm', id: 'ed-num-mais', text: '+ Linha', onclick: () => { p.nums.push({ n: '', v: '' }); pintarEd(); const el = $('ed-num-n-' + (p.nums.length - 1)); if (el) el.focus(); } })) : null),
        h('div', { class: 'field' }, h('span', { text: 'Fraquezas e resistências' }),
          h('div', { class: 'linhas', id: 'ed-fraq' }, p.fraq.map((f, i) => h('div', { class: 'lin' },
            h('input', { class: 'in', id: 'ed-fr-n-' + i, value: f.nome, maxlength: String(N.MAX.fraqNome), placeholder: 'Fogo', 'aria-label': 'Contra o quê', oninput: muda(v => { f.nome = v; }) }),
            h('select', { class: 'in', id: 'ed-fr-t-' + i, 'aria-label': 'Fraqueza, resistência ou imunidade', onchange: muda(v => { f.tipo = v; }) }, N.TIPOS_FR.map(([k, nm]) => h('option', { value: k, selected: k === f.tipo }, nm))),
            h('button', { type: 'button', class: 'ib leve', 'aria-label': 'Tirar ' + (f.nome || 'a linha'), onclick: () => { p.fraq.splice(i, 1); pintarEd(); } }, '×')))),
          p.fraq.length < N.MAX.fraq ? h('div', null, h('button', { type: 'button', class: 'btn sm', id: 'ed-fr-mais', text: '+ Fraqueza ou resistência', onclick: () => { p.fraq.push({ nome: '', tipo: 'fraco' }); pintarEd(); const el = $('ed-fr-n-' + (p.fraq.length - 1)); if (el) el.focus(); } })) : null),
        h('div', { class: 'field' }, h('span', { text: 'Deixa cair' }),
          h('div', { class: 'linhas', id: 'ed-saque' }, p.saque.map((s, i) => h('div', { class: 'lin' },
            h('input', { class: 'in', id: 'ed-sq-' + i, value: s, maxlength: String(N.MAX.saqueNome), placeholder: 'Pele de névoa', 'aria-label': 'O item', oninput: muda(v => { p.saque[i] = v; }) }),
            h('button', { type: 'button', class: 'ib leve', 'aria-label': 'Tirar ' + (s || 'o item'), onclick: () => { p.saque.splice(i, 1); pintarEd(); } }, '×')))),
          p.saque.length < N.MAX.saque ? h('div', null, h('button', { type: 'button', class: 'btn sm', id: 'ed-sq-mais', text: '+ Item', onclick: () => { p.saque.push(''); pintarEd(); const el = $('ed-sq-' + (p.saque.length - 1)); if (el) el.focus(); } })) : null),
        h('div', { class: 'field' }, h('span', { text: 'O que o clã vê' }),
          h('div', { class: 'revelar', id: 'ed-ver' },
            [['pag', 'A página (o nome)']].concat(N.PARTES).map(([k, nm]) => h('label', null, h('input', { type: 'checkbox', 'data-ver': k, checked: !!p.ver[k], onchange: muda(v => { p.ver[k] = v; }, true) }), nm))),
          h('span', { class: 'ajuda', text: p.ver.pag ? 'O que não estiver marcado aparece para o clã como tinta borrada (sem o conteúdo).' : 'Sem “A página”, o clã nem sabe que ela existe.' }))),
      h('div', { class: 'dl-a' },
        ed.pag ? h('button', { type: 'button', class: 'btn per esq', id: 'ed-apagar', text: 'Apagar a página', onclick: apagarPagina }) : null,
        h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: () => dl.close() }),
        h('button', { type: 'button', class: 'btn pri', id: 'ed-salvar', text: ed.pag ? 'Guardar' : 'Criar a página', title: 'Guardar (Ctrl+Enter)', onclick: salvarEd })));
    const c = dl.querySelector('.dl-c'); if (c) c.scrollTop = scroll;
    if (foco) { const el = document.getElementById(foco); if (el) el.focus({ preventScroll: true }); }
  }
  // a ilustração: reduzida (até 1200 px) e enviada à mesa; fora de uma mesa, embutida (menor)
  async function reduzir(arq, lado) {
    const b = await createImageBitmap(arq);
    try {
      const k = Math.min(1, lado / Math.max(b.width, b.height)), cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(b.width * k)); cv.height = Math.max(1, Math.round(b.height * k));
      cv.getContext('2d').drawImage(b, 0, 0, cv.width, cv.height);
      const blob = await new Promise(r => cv.toBlob(r, 'image/webp', 0.86));
      if (!blob) throw new Error('Não deu para preparar esta imagem.');
      return blob;
    } finally { try { b.close(); } catch (e) { /* já fechada */ } }
  }
  $('arquivo').onchange = async ev => {
    const arq = ev.target.files && ev.target.files[0]; ev.target.value = '';
    if (!arq || !ed) return;
    if (!/^image\/(png|jpeg|webp)$/.test(arq.type || '')) { toast('Escolha uma imagem PNG, JPG ou WebP.'); return; }
    const alvo = ed;
    try {
      $('salvo').textContent = naMesa ? 'Enviando a imagem…' : 'Preparando a imagem…';
      const blob = await reduzir(arq, naMesa ? 1200 : 520);
      const url = naMesa ? await window.TC.arquivos.subir(blob) : await new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => falha(r.error); r.readAsDataURL(blob); });
      $('salvo').textContent = '';
      if (ed === alvo) { ed.p.img = url; pintarEd(); }
    } catch (e) { $('salvo').textContent = ''; toast((e && e.message) || 'Não deu para usar esta imagem.'); }
  };

  /* ---------------- as anotações (passam pelo banco: ele assina e confere quem pode) ---------------- */
  function meusPersonagens(cla) {
    if (!naMesa || !P) return [];
    const pub = doc('cla:pub:' + cla), pcs = new Set();
    const cargos = pub && ehObj(pub.cargos) ? pub.cargos : {};
    for (const k in cargos) for (const g of (ehObj(cargos[k]) && Array.isArray(cargos[k].gente) ? cargos[k].gente : [])) if (g && typeof g.pc === 'string') pcs.add(g.pc);
    return P.todas().filter(l => l && !l.apagado && l.dono_id === eu && pcs.has(l.id)).map(l => ({ id: l.id, nome: l.nome || (l.ficha && l.ficha.nome) || 'Personagem' }));
  }
  function anotar(L, x, n) {
    const dl = $('dlg'), meus = meusPersonagens(L.cla);
    const area = h('textarea', { class: 'in', id: 'nt-texto', rows: '5', maxlength: String(N.MAX_NOTA), placeholder: 'O que você viu, ouviu ou desconfia…' }, n ? n.texto : '');
    const quem = !n && meus.length > 1 ? h('select', { class: 'in', id: 'nt-pc' }, meus.map(m => h('option', { value: m.id }, m.nome))) : null;
    let enviando = false;
    const enviar = async () => {
      if (enviando) return;
      const texto = area.value.trim();
      if (!texto) { toast(n ? 'Escreva alguma coisa (ou apague a anotação).' : 'Escreva alguma coisa antes de anotar.'); return; }
      enviando = true; $('nt-ok').disabled = true;
      try {
        await window.TC.ponte.cla('nota', { cla: L.cla, pag: x.id, op: n ? 'mudar' : 'criar', nota: n ? n.id : null, texto, pc: quem ? quem.value : null });
        dl.close(); pintar();
        toast(n ? 'Anotação mudada.' : 'Anotado na margem de ' + x.p.nome + '.');
      } catch (e) { toast((e && e.message) || 'Não deu para anotar agora.'); enviando = false; const b = $('nt-ok'); if (b) b.disabled = false; }
    };
    trocar(dl, h('div', { class: 'dl-h' }, h('h2', { id: 'dlg-tit', text: n ? 'Mudar a anotação' : 'Anotar na margem de ' + x.p.nome }), h('button', { type: 'button', class: 'ib leve', 'aria-label': 'Fechar', onclick: () => dl.close() }, '×')),
      h('div', { class: 'dl-c' }, h('label', { class: 'field nota-ed' }, h('span', { text: 'A anotação' }), area, h('span', { class: 'ajuda', text: 'Todo o clã lê, com o nome do seu personagem. Você muda ou apaga a sua quando quiser.' })),
        quem ? campo('Assinar como', quem) : null),
      h('div', { class: 'dl-a' }, h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: () => dl.close() }), h('button', { type: 'button', class: 'btn pri', id: 'nt-ok', text: n ? 'Guardar' : 'Anotar', onclick: enviar })));
    dl.onclose = null; dl.onkeydown = ev => { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); enviar(); } };
    dl.showModal(); area.focus();
  }
  function apagarNota(L, x, n) {
    const dl = $('dlg');
    let enviando = false;
    const sim = async () => {
      if (enviando) return; enviando = true;
      try { await window.TC.ponte.cla('nota', { cla: L.cla, pag: x.id, op: 'apagar', nota: n.id }); dl.close(); pintar(); toast('A anotação de ' + n.nome + ' saiu da margem.'); }
      catch (e) { enviando = false; toast((e && e.message) || 'Não deu para apagar agora.'); }
    };
    trocar(dl, h('div', { class: 'dl-h' }, h('h2', { id: 'dlg-tit', text: 'Apagar a anotação?' })),
      h('div', { class: 'dl-c' }, h('p', { style: { margin: '0' }, text: '“' + n.texto.slice(0, 160) + (n.texto.length > 160 ? '…' : '') + '” — ' + n.nome }), h('p', { class: 'ajuda', style: { margin: '0' }, text: 'Ela sai da margem para todo o clã. Não dá para desfazer.' })),
      h('div', { class: 'dl-a' }, h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: () => dl.close() }), h('button', { type: 'button', class: 'btn pri', id: 'nt-apagar', text: 'Apagar', onclick: sim })));
    dl.onclose = null; dl.onkeydown = null;
    dl.showModal();
  }
  function todasAsNotas(L, x) {
    const dl = $('dlg');
    trocar(dl, h('div', { class: 'dl-h' }, h('h2', { id: 'dlg-tit', text: 'As anotações de ' + x.p.nome }), h('button', { type: 'button', class: 'ib leve', 'aria-label': 'Fechar', onclick: () => dl.close() }, '×')),
      h('div', { class: 'dl-c', style: { background: 'var(--paper)', color: 'var(--ink)' } }, h('div', { class: 'margem', style: { padding: '14px 0' } }, x.notas.map((n, k) => nota(L, x, n, k)))),
      h('div', { class: 'dl-a' }, h('button', { type: 'button', class: 'btn pri', text: 'Fechar', onclick: () => dl.close() })));
    dl.onclose = null; dl.onkeydown = null;
    dl.showModal();
  }

  /* ---------------- a busca ---------------- */
  function pintarAchados() {
    const L = livroAberto(), el = $('achados');
    const q = busca.trim();
    if (!L || !q) { el.hidden = true; trocar(el); return; }
    const achados = L.pags.map((x, i) => ({ x, i })).filter(y => N.passa(y.x.p, y.x.notas, q)).slice(0, 12);
    el.hidden = false;
    trocar(el, achados.length ? achados.map(y => h('button', { type: 'button', role: 'option', 'data-achado': y.x.id, onclick: () => { busca = ''; $('busca').value = ''; el.hidden = true; irPara(L, y.i); } },
      h('span', { text: y.x.p.nome }), h('small', { text: 'pág. ' + (2 * y.i + 1) }))) : h('p', { class: 'ajuda', style: { margin: '6px 9px' }, text: 'Nada no livro com “' + q + '”.' }));
  }
  $('busca').oninput = ev => { busca = ev.target.value; pintarAchados(); };
  $('busca').onkeydown = ev => {
    if (ev.key === 'Escape') { busca = ''; ev.target.value = ''; pintarAchados(); }
    if (ev.key === 'Enter') { const b = $('achados').querySelector('button'); if (b) { ev.preventDefault(); b.click(); } }
  };
  document.addEventListener('pointerdown', ev => { if (!ev.target.closest('.busca')) $('achados').hidden = true; });

  /* ---------------- os botões ---------------- */
  $('btAnt').onclick = () => { const L = livroAberto(); if (L) irPara(L, indiceAtual(L) - 1); };
  $('btProx').onclick = () => { const L = livroAberto(); if (L) irPara(L, indiceAtual(L) + 1); };
  $('escolha').onchange = ev => { ui.cla = ev.target.value; salvarUi(); pintar(); };
  for (const b of $('vistas').querySelectorAll('button')) b.onclick = () => { ui.vista = b.dataset.vista === 'cla' ? 'cla' : 'mestre'; salvarUi(); pintar(); };
  $('liberar').onchange = ev => liberar(ev.target.checked);
  $('btTitulo').onclick = () => trocarTitulo();
  $('btNova').onclick = () => editar(true);
  $('btEditar').onclick = () => editar(false);
  $('btDesfazer').onclick = () => desfazer();
  const escrevendo = () => { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable); };
  document.addEventListener('keydown', ev => {
    if ($('dlg').open || escrevendo()) return;
    if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && !ev.altKey && ev.key.toLowerCase() === 'z' && mestre) { ev.preventDefault(); desfazer(); return; }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); $('btAnt').click(); }
    if (ev.key === 'ArrowRight') { ev.preventDefault(); $('btProx').click(); }
  });

  /* ---------------- partida ---------------- */
  async function partida() {
    const TCx = window.TC;
    lerLocal();
    if (TCx && TCx.ponte) {
      st = await TCx.ponte.pronta;
      if (TCx.ponte.naCasca) document.documentElement.classList.add('na-casca');
      if (TCx.dados && TCx.dados.disponivel()) {
        naMesa = true;
        D = TCx.dados.col('documentos'); P = TCx.dados.col('personagens');
        await Promise.all([D.pronta, P.pronta]);
      }
      const papel = e => { st = e; mestre = !naMesa || !e || !e.mesa || e.papel === 'mestre'; eu = e && e.eu ? e.eu : null; };
      papel(st);
      TCx.ponte.aoMudar(e => { papel(e); if (pronto) pintar(); });
      // (outro sistema pediu uma página: { cla, pag } — o Bestiário do mestre, depois de enviar)
      if (TCx.ponte.aoIr) TCx.ponte.aoIr(alvo => {
        if (!alvo || typeof alvo !== 'object') return;
        if (N.idCla(alvo.cla)) ui.cla = alvo.cla;
        if (N.idCla(alvo.cla) && N.idPag(alvo.pag)) { ui.pag[alvo.cla] = alvo.pag; if (mestre) ui.vista = 'mestre'; }
        salvarUi(); pintar();
      });
    }
    if (naMesa) {
      let tP = 0;
      const depois = () => { clearTimeout(tP); tP = setTimeout(() => { if (!$('dlg').open || !ed) pintar(); if (busca) pintarAchados(); }, 120); };
      D.aoMudar(l => { if (l && typeof l.id === 'string' && l.id.startsWith('cla:')) depois(); });
      P.aoMudar(depois);
    } else {
      $('salvo').textContent = 'Neste navegador';
      // (fora de uma mesa: o Bestiário, aberto em outra aba deste navegador, também escreve aqui)
      window.addEventListener('storage', ev => { if (ev.key === L_LOCAL || ev.key === L_CLAS) { lerLocal(); pintar(); } });
    }
    pronto = true;
    pintar();
  }
  if (DEBUG) window.__livro = { N, get naMesa() { return naMesa; }, get pronto() { return pronto; }, get mestre() { return mestre; }, get ui() { return copia(ui); }, get ed() { return ed; },
    livro: () => { const L = livroAberto(); return L ? copia({ cla: L.cla, titulo: L.titulo, modo: L.modo, pags: L.pags.map(x => ({ id: x.id, p: x.p, notas: x.notas })), atual: indiceAtual(L) }) : null; },
    doc: id => copia(doc(id)), gravarDoc, pintar, desfazer, lerLocal: () => { lerLocal(); pintar(); }, pilha: () => pilha.map(p => p.rotulo) };
  partida().catch(e => {
    console.error(e);
    $('semLivro').hidden = false;
    trocar($('semLivro'), h('strong', { text: 'Não deu para abrir o livro.' }), h('span', { text: (e && e.message) || '' }), ' ', h('button', { type: 'button', class: 'btn sm', text: 'Tentar de novo', onclick: () => location.reload() }));
  });
})();
