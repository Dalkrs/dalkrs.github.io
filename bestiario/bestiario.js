/* Tiny Cats · Bestiário (lote 29): a página.
   Os inimigos do mestre, prontos para usar: as cartas (com o tier, os números de bater o olho e quantos estão no encontro),
   a lista de nomes à esquerda — abre e fecha; com centenas de inimigos é o caminho rápido —, as tags para separar
   (bioma, tipo de criatura, papel no combate, facção e região, e as que o mestre criar), a gaveta com tudo de um inimigo
   (os números das fichas, as skills da árvore, o comportamento, o saque) e a bandeja do encontro: quantos de cada um, a
   dificuldade contra o grupo, guardar o encontro e puxar para a cena (cópias ligadas ao Bestiário: as Cenas leem daqui os
   atributos e as defesas). As contas ficam em tc/bestiario.js. Na mesa, cada inimigo é o documento "best:i:<id>" (só
   quem mestra); fora de uma mesa, tudo fica neste navegador. Nada muda sozinho: cada mudança tem Desfazer. */
(() => {
  'use strict';
  const B = window.TC.bestiario, R = window.TC.rules;
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
  // replaceChildren com null escreve "null" na tela: o mesmo, sem os vazios
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
    const tempo = ms || (acao ? 8000 : 3800);
    let relogio = setTimeout(() => t.remove(), tempo);
    t.addEventListener('pointerenter', () => clearTimeout(relogio));
    t.addEventListener('pointerleave', () => { clearTimeout(relogio); relogio = setTimeout(() => t.remove(), 2500); });
  }

  /* ---------------- os documentos ---------------- */
  let st = null, D = null, P = null, naMesa = false, pronto = false, local = { docs: {} };
  const L_UI = 'tinycats:bestiario:ui';
  const ui = (() => { try { const u = JSON.parse(guarda.ler(L_UI) || '{}'); return ehObj(u) ? u : {}; } catch (e) { return {}; } })();
  const salvarUi = () => guarda.gravar(L_UI, j(ui));
  if (typeof ui.lista !== 'boolean') ui.lista = true;
  let busca = '', filtro = {}, sel = null, mostrar = 120, pilha = [], tSalvo = 0;
  function lerLocal() { try { const d = JSON.parse(guarda.ler(B.L_LOCAL) || 'null'); local = ehObj(d) && ehObj(d.docs) ? d : { docs: {} }; } catch (e) { local = { docs: {} }; } }
  function salvarLocal() { if (!guarda.gravar(B.L_LOCAL, j(local))) toast('Não deu para guardar neste navegador (a imagem pode ser grande demais).'); }
  const idDe = (k, pre) => (typeof k === 'string' && k.startsWith(pre) && B.idOk(k.slice(pre.length)) ? k.slice(pre.length) : null);
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
  // os inimigos: [{ id, e }], por nome
  let cacheLista = null, cacheChave = '';
  function inimigos() {
    const ids = naMesa ? D.todas().filter(l => !l.apagado && idDe(l.id, B.PRE)).map(l => l.id + ':' + (l.rev || 0)).join('|') : Object.keys(local.docs).filter(k => idDe(k, B.PRE)).join('|') + '#' + j(local.docs).length;
    if (cacheLista && ids === cacheChave) return cacheLista;
    const out = [];
    if (naMesa) { for (const l of D.todas()) { const id = idDe(l.id, B.PRE); if (id && !l.apagado && ehObj(l.dados)) out.push({ id, e: B.normalizar(l.dados) }); } }
    else for (const k of Object.keys(local.docs)) { const id = idDe(k, B.PRE); if (id && ehObj(local.docs[k])) out.push({ id, e: B.normalizar(local.docs[k]) }); }
    out.sort((a, b) => a.e.nome.localeCompare(b.e.nome, 'pt-BR'));
    cacheLista = out; cacheChave = ids;
    return out;
  }
  const porId = id => inimigos().find(x => x.id === id) || null;
  // as regras das fichas da mesa (ou as deste navegador) e a biblioteca das árvores
  function fichasLocais() { try { const s = JSON.parse(guarda.ler('urgm_calc_atributos_v1') || 'null'); return ehObj(s) ? s : null; } catch (e) { return null; } }
  function cfg() {
    if (naMesa) { const d = D.pegar('fichas:cfg'); return (d && d.dados && d.dados.v) || R.cfgPadrao(); }
    const s = fichasLocais(); return (s && ehObj(s.cfg) && s.cfg) || R.cfgPadrao();
  }
  function bib() {
    if (naMesa) { const d = D.pegar('arvore:biblioteca'); return d && d.dados && Array.isArray(d.dados.arvores) ? d.dados : null; }
    const s = fichasLocais(); if (s && ehObj(s.bib) && Array.isArray(s.bib.arvores)) return s.bib;
    try { const a = JSON.parse(guarda.ler('urgm-skilltree-doc') || 'null'); return a && ehObj(a.biblioteca) ? a.biblioteca : null; } catch (e) { return null; }
  }
  const cacheContas = new Map();
  function contasDe(x) {
    const k = j(x.e) + '|' + (bibRev()) + '|' + j(cfg().niveis ? cfg().niveis.length : 0);
    const c = cacheContas.get(x.id);
    if (c && c.k === k) return c.v;
    let v = null;
    try { v = B.contas(x.e, cfg(), bib()); } catch (e) { console.error(e); v = null; }
    cacheContas.set(x.id, { k, v });
    return v;
  }
  function bibRev() { if (!naMesa) return 'l'; const d = D.pegar('arvore:biblioteca'); return d ? d.rev || 0 : 0; }
  // as facções e as regiões do Mapa-múndi (as tags de Facção / região)
  function lugaresDoMundo() {
    if (!naMesa) return [];
    const out = [];
    for (const l of D.todas()) {
      if (l.apagado || typeof l.id !== 'string' || !l.id.startsWith('mundo:mapa:') || !ehObj(l.dados)) continue;
      for (const f of Array.isArray(l.dados.faccoes) ? l.dados.faccoes : []) if (ehObj(f) && f.nome) out.push(String(f.nome));
      for (const o of Array.isArray(l.dados.objs) ? l.dados.objs : []) if (ehObj(o) && o.k === 'r' && o.nome && !o.pai) out.push(String(o.nome));
    }
    return out;
  }
  function tagsCriadas() { const d = doc(B.TAGS); return ehObj(d) ? d : { grupos: {} }; }
  const grupos = () => B.gruposDeTags(tagsCriadas(), lugaresDoMundo(), inimigos().map(x => x.e));
  // o grupo dos jogadores (os personagens ativos da campanha em vista), para a dificuldade
  function grupoDosJogadores() {
    if (!naMesa || !P) return [];
    const vista = st && st.campanha ? st.campanha.id : null;
    return P.todas().filter(l => !l.apagado && l.dono_id && ehObj(l.ficha) && !(l.ficha && l.ficha.petDe) && !(l.estado && (l.estado.ativo === false || l.estado.toldo)) && (!vista || !l.campanha || l.campanha === vista))
      .map(l => ({ nome: l.nome || (l.ficha && l.ficha.nome) || 'Personagem', ficha: l.ficha, skills: l.skills || null }));      // (lote 33: a ficha inteira, para os números de verdade)
  }

  /* ---------------- o encontro (a bandeja) ---------------- */
  const chaveEnc = () => 'tinycats:bestiario:encontro:' + (naMesa && st && st.mesa ? st.mesa.id : 'local');
  let encontro = [];
  function lerEncontro() { try { const a = JSON.parse(guarda.ler(chaveEnc()) || '[]'); encontro = Array.isArray(a) ? a.filter(x => ehObj(x) && B.idOk(x.id) && x.n > 0).map(x => ({ id: x.id, n: Math.min(30, Math.round(x.n)) })) : []; } catch (e) { encontro = []; } }
  const salvarEncontro = () => guarda.gravar(chaveEnc(), j(encontro));
  const noEncontro = id => (encontro.find(x => x.id === id) || { n: 0 }).n;
  function mudarEncontro(id, d) {
    const x = encontro.find(y => y.id === id);
    if (x) x.n = Math.max(0, Math.min(30, x.n + d)); else if (d > 0) encontro.push({ id, n: Math.min(30, d) });
    encontro = encontro.filter(y => y.n > 0);
    salvarEncontro(); pintar();
  }
  function encontrosGuardados() {
    const out = [];
    if (naMesa) { for (const l of D.todas()) { const id = idDe(l.id, B.PRE_ENC); if (id && !l.apagado && ehObj(l.dados)) out.push({ id, d: l.dados }); } }
    else for (const k of Object.keys(local.docs)) { const id = idDe(k, B.PRE_ENC); if (id && ehObj(local.docs[k])) out.push({ id, d: local.docs[k] }); }
    return out.map(x => ({ id: x.id, nome: String(x.d.nome || 'Encontro').slice(0, 60), itens: (Array.isArray(x.d.itens) ? x.d.itens : []).filter(y => ehObj(y) && B.idOk(y.id) && y.n > 0) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  async function guardarEncontro() {
    if (!encontro.length) return;
    const nome = await pedirTexto('Guardar o encontro', 'O nome do encontro (ex.: “Emboscada goblin”)', '');
    if (!nome) return;
    const id = B.uid();
    gravarDoc(B.PRE_ENC + id, { v: 1, nome: nome.slice(0, 60), itens: copia(encontro) });
    empilhar('guardar o encontro ' + nome, () => apagarDoc(B.PRE_ENC + id));
    toast('Encontro guardado: ' + nome + '.', 'Desfazer', desfazer);
    pintar();
  }
  function puxar() {
    if (!encontro.length) return;
    const itens = encontro.filter(x => porId(x.id));
    if (!itens.length) { toast('Os inimigos do encontro não estão mais no Bestiário.'); return; }
    const T = window.TC && window.TC.ponte;
    if (!T || !T.naCasca || !T.ir('cenas', { bestiario: { itens: copia(itens), ocultos: !!ui.ocultos } })) { toast('Para puxar para a cena, abra o Bestiário pelo site (a aba Bestiário, ao lado das Cenas).'); return; }
  }

  /* ---------------- pintar ---------------- */
  const corDe = e => e.cor || B.CORES[0];
  const fundoDe = e => (e.img ? { backgroundImage: 'url("' + e.img.replace(/"/g, '%22') + '")' } : { background: 'radial-gradient(circle at 50% 60%, ' + corDe(e) + ', #151b26)' });
  function filtrados() {
    const l = inimigos();
    return l.filter(x => B.passa(x.e, busca, filtro));
  }
  function pintar() {
    if (!pronto) return;
    const lista = filtrados(), todos = inimigos();
    if (sel && !porId(sel)) sel = null;
    pintarTagsel();
    // a lista de nomes, por letra
    $('lista').hidden = !ui.lista;
    $('btLista').setAttribute('aria-pressed', String(!!ui.lista));
    if (ui.lista) {
      const kids = [];
      let letra = '';
      for (const x of lista) {
        const l0 = sem(x.e.nome).charAt(0).toUpperCase() || '#';
        if (l0 !== letra) { letra = l0; kids.push(h('div', { class: 'letra', text: letra })); }
        kids.push(h('button', { type: 'button', class: 'li' + (x.id === sel ? ' on' : ''), 'data-best': x.id, onclick: () => escolher(x.id, true) },
          h('span', { class: 'pt', style: { background: corDe(x.e) } }), h('span', { class: 'nm', text: x.e.nome }), h('span', { class: 'tl', text: x.e.ficha.tier + '·' + x.e.ficha.level })));
      }
      if (!lista.length) kids.push(h('p', { class: 'ajuda', style: { padding: '12px' }, text: todos.length ? 'Nenhum inimigo com este filtro.' : 'Nenhum inimigo ainda.' }));
      trocar($('lista'), ...kids);
    }
    // as cartas
    if (!todos.length) {
      trocar($('meio'), h('div', { class: 'vazio' }, h('strong', { text: 'O Bestiário está vazio.' }),
        h('p', { class: 'ajuda', text: 'Crie o primeiro inimigo: os números saem pela regra das fichas (tier, level e onde os pontos caem), a árvore é distribuída sozinha, e você puxa as cópias para a cena pela bandeja do encontro.' }),
        h('button', { type: 'button', class: 'btn pri', text: '+ Inimigo', onclick: () => editar(null) })));
    } else {
      const cartas = lista.slice(0, mostrar).map(x => carta(x));
      trocar($('meio'), h('div', { class: 'grade', id: 'grade' }, cartas),
        lista.length > mostrar ? h('div', { class: 'mais-cartas' }, h('button', { type: 'button', class: 'btn', text: 'Mostrar mais (' + (lista.length - mostrar) + ')', onclick: () => { mostrar += 120; pintar(); } })) : null,
        !lista.length ? h('div', { class: 'vazio' }, h('span', { text: 'Nenhum inimigo com este filtro.' }), h('button', { type: 'button', class: 'btn sm', text: 'Limpar o filtro', onclick: () => { busca = ''; $('busca').value = ''; filtro = {}; pintar(); } })) : null);
    }
    pintarGaveta();
    pintarBandeja();
  }
  function carta(x) {
    const e = x.e, c = contasDe(x), n = noEncontro(x.id);
    const bar = k => (c && c.barras[k]) || null, atrTop = c ? ['FOR', 'DES', 'CAN', 'AGI'].map(k => [k, c.rolaveis.find(r => r[0] === k)[2]]).sort((a, b) => b[1] - a[1])[0] : ['FOR', 0];
    return h('div', { class: 'carta' + (x.id === sel ? ' on' : ''), role: 'button', tabindex: '0', 'data-best': x.id, 'aria-label': e.nome, onclick: () => escolher(x.id),
      onkeydown: ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); escolher(x.id); } } },
      h('div', { class: 'arte', style: fundoDe(e) }, e.img ? null : B.iniciais(e.nome)),
      h('span', { class: 'tier', text: 'Tier ' + e.ficha.tier + ' · Lvl ' + e.ficha.level }),
      n ? h('span', { class: 'qtd' }, h('span', { class: 'chip', text: '×' + n })) : null,
      h('button', { type: 'button', class: 'mais', title: 'Mais um no encontro', 'aria-label': 'Mais um ' + e.nome + ' no encontro', 'data-mais': x.id, onclick: ev => { ev.stopPropagation(); mudarEncontro(x.id, 1); } }, '+'),
      h('div', { class: 'cb' }, h('h3', { text: e.nome }), h('span', { class: 'sub', text: e.comp.lembrete || e.tags.join(' · ') || '—' }),
        h('div', { class: 'mini' },
          h('div', null, h('span', { text: bar(0) ? bar(0).n.toUpperCase() : 'HP' }), bar(0) ? String(bar(0).m) : '–'),
          h('div', null, h('span', { text: bar(1) ? bar(1).n.toUpperCase() : 'SP' }), bar(1) ? String(bar(1).m) : '–'),
          h('div', null, h('span', { text: atrTop[0] }), String(atrTop[1])),
          h('div', null, h('span', { text: 'DEF' }), c ? c.numeros.DFF + '/' + c.numeros.DFM : '–'))));
  }
  function escolher(id, rolar) {
    sel = sel === id && !rolar ? null : id;
    pintar();
    if (sel && rolar) { const c = document.querySelector('.carta[data-best="' + CSS.escape(sel) + '"]'); if (c) c.scrollIntoView({ block: 'nearest' }); }
  }
  function pintarTagsel() {
    const kids = [];
    for (const g in filtro) for (const t of filtro[g] || []) kids.push(h('span', { class: 'chip on' }, t, h('button', { type: 'button', class: 'x', 'aria-label': 'Tirar a tag ' + t, onclick: () => { filtro[g] = filtro[g].filter(y => y !== t); if (!filtro[g].length) delete filtro[g]; pintar(); } }, '×')));
    if (kids.length) kids.push(h('button', { type: 'button', class: 'btn sm', text: 'Limpar', onclick: () => { filtro = {}; pintar(); } }));
    trocar($('tagsel'), ...kids);
    const n = Object.values(filtro).reduce((s, a) => s + a.length, 0);
    $('btTags').textContent = 'Tags' + (n ? ' (' + n + ')' : '') + ' ▾';
    $('btTags').classList.toggle('on', n > 0);
  }
  function pintarGaveta() {
    const g = $('gaveta'), x = sel ? porId(sel) : null;
    g.hidden = !x;
    if (!x) { trocar(g); return; }
    const e = x.e, c = contasDe(x), sks = B.skills(e, bib());
    const val = k => (c ? (c.rolaveis.find(r => r[0] === k) || [0, 0, 0])[2] : '–');
    // os botões logo abaixo do nome (a bandeja do encontro cobre o fim da gaveta)
    const acoes = h('div', { class: 'acoes' },
      h('button', { type: 'button', class: 'btn sm', id: 'g-editar', text: 'Editar', onclick: () => editar(x.id) }),
      h('button', { type: 'button', class: 'btn sm', id: 'g-duplicar', text: 'Duplicar', onclick: () => duplicar(x.id) }),
      h('button', { type: 'button', class: 'btn sm per', id: 'g-apagar', text: 'Apagar', onclick: () => apagar(x.id) }),
      h('button', { type: 'button', class: 'btn sm pri', id: 'g-mais', style: { marginLeft: 'auto' }, text: '+1 no encontro', onclick: () => mudarEncontro(x.id, 1) }));
    trocar(g,
      h('div', { class: 'acoes' }, h('span', { class: 'eyebrow', style: { flex: '1' }, text: 'Tier ' + e.ficha.tier + ' · Lvl ' + e.ficha.level + (e.tam !== 1 ? ' · tamanho ' + e.tam : '') }),
        h('button', { type: 'button', class: 'ib leve', title: 'Fechar', 'aria-label': 'Fechar a gaveta', onclick: () => { sel = null; pintar(); } }, '×')),
      h('div', { class: 'arte', style: fundoDe(e) }, e.img ? null : B.iniciais(e.nome)),
      h('h2', { id: 'g-nome', text: e.nome }),
      e.tags.length ? h('div', { class: 'acoes' }, e.tags.map(t => h('span', { class: 'chip', text: t }))) : null,
      acoes,
      h('div', { class: 'atrs', id: 'g-atrs' }, ['FOR', 'DES', 'VIT', 'CAN', 'AGI'].map(k => h('div', { title: e.ficha.atrMan && e.ficha.atrMan[k] != null ? 'Digitado à mão: ' + e.ficha.atrMan[k] + ' (mais o equipamento)' : 'Pela letra ' + e.ficha.tiers[k] }, h('span', { text: k + (e.ficha.atrMan && e.ficha.atrMan[k] != null ? ' ✎' : '') }), String(val(k))))),
      h('div', { class: 'sec' },
        c ? c.barras.map(b => h('div', { class: 'lin' }, h('span', { text: b.n }), h('span', { class: 'mono', text: (b.st != null ? b.st + ' de ' : '') + b.m }))) : null,
        h('div', { class: 'lin' }, h('span', { text: 'Defesas (física / mágica / bloqueio)' }), h('span', { class: 'mono', text: c ? c.defesas.DFF + ' / ' + c.defesas.DFM + ' / ' + c.defesas.BLQ : '–' })),
        h('div', { class: 'lin' }, h('span', { text: 'Esquiva · Percepção' }), h('span', { class: 'mono', text: val('ESQ') + ' · ' + val('PER') })),
        h('div', { class: 'lin' }, h('span', { text: 'Iniciativa' }), h('span', { class: 'mono', text: c ? '1d20 ' + (c.ini >= 0 ? '+ ' : '− ') + Math.abs(c.ini) : '–' }))),
      sks.length || e.skills.texto ? h('div', { class: 'sec', id: 'g-skills' }, h('span', { class: 'eyebrow', text: 'Skills' }),
        sks.map(s => h('div', { class: 'sk' }, h('b', null, s.nome + (s.graus > 1 ? ' (grau ' + s.grau + ')' : ''), s.usos.map(u => h('span', { class: 'u', text: u }))), s.texto ? h('p', { text: s.texto }) : null, h('p', { class: 'ajuda', text: s.arvore }))),
        e.skills.texto ? h('p', { class: 'texto', text: e.skills.texto }) : null) : null,
      e.comp.texto || e.comp.lembrete ? h('div', { class: 'sec' }, h('span', { class: 'eyebrow', text: 'Comportamento' }),
        e.comp.lembrete ? h('div', { class: 'lembrete', title: 'Aparece para você na vez dele, nas Cenas', text: e.comp.lembrete }) : null,
        e.comp.texto ? h('p', { class: 'texto', text: e.comp.texto }) : null) : null,
      e.saque.itens.length || e.saque.lapros ? h('div', { class: 'sec', id: 'g-saque' }, h('span', { class: 'eyebrow', text: 'Saque' }),
        e.saque.itens.map(s => h('div', { class: 'lin' }, h('span', { text: s.nome }), h('span', { class: 'mono', text: s.chance + '%' + (s.qtd !== '1' ? ' · ' + s.qtd : '') }))),
        e.saque.lapros ? h('div', { class: 'lin' }, h('span', { text: 'Lapros' }), h('span', { class: 'mono', text: e.saque.lapros })) : null) : null,
      // (lote 33) o equipamento
      e.ficha.itens && e.ficha.itens.length ? h('div', { class: 'sec', id: 'g-equip' }, h('span', { class: 'eyebrow', text: 'Equipamento' }),
        e.ficha.itens.map(it => h('div', { class: 'lin' + (it.equipado === false ? ' guardada' : '') }, h('span', { text: it.nome + (it.equipado === false ? ' (guardado)' : '') }), h('span', { class: 'mono', text: resumoPeca(it, e.ficha.recursos) + (it.chance ? ' · saque ' + it.chance + '%' : '') })))) : null,
      e.notas ? h('div', { class: 'sec' }, h('span', { class: 'eyebrow', text: 'Notas' }), h('p', { class: 'texto', text: e.notas })) : null);
  }
  function pintarBandeja() {
    const b = $('bandeja');
    const itens = encontro.map(x => ({ x, i: porId(x.id) })).filter(y => y.i);
    b.hidden = !itens.length;
    if (!itens.length) { trocar(b); return; }
    const total = itens.reduce((s, y) => s + y.x.n, 0), grupo = grupoDosJogadores();
    const dif = B.dificuldade(itens.map(y => ({ e: y.i.e, n: y.x.n })), grupo, cfg(), bib());
    trocar(b,
      h('span', { class: 'eyebrow', text: 'Encontro · ' + total }),
      h('div', { class: 'itens', id: 'enc-itens' }, itens.map(y => h('span', { class: 'bt', 'data-enc': y.x.id }, h('b', { text: y.i.e.nome }),
        h('button', { type: 'button', 'aria-label': 'Um a menos de ' + y.i.e.nome, onclick: () => mudarEncontro(y.x.id, -1) }, '−'),
        h('span', { class: 'mono', text: '×' + y.x.n }),
        h('button', { type: 'button', 'aria-label': 'Um a mais de ' + y.i.e.nome, onclick: () => mudarEncontro(y.x.id, 1) }, '+')))),
      h('span', { class: 'dif', id: 'enc-dif', title: dif ? 'O poder dos inimigos (' + dif.inimigos + ') contra o do grupo (' + dif.grupo + ', ' + grupo.length + ' personagens ativos): só uma sugestão' : 'A dificuldade aparece numa mesa, contra os personagens ativos do grupo' },
        'Dificuldade: ', dif ? h('b', { class: dif.k, text: dif.nome }) : h('b', { text: '—' }), dif ? ' (' + dif.razao + '% do grupo)' : '',
        h('button', { type: 'button', class: 'ajuda-dif', id: 'enc-dif-ajuda', title: 'Como a dificuldade é calculada', 'aria-label': 'Como a dificuldade é calculada', onclick: () => contaDaDificuldade(itens, grupo, dif) }, '?')),
      h('label', { class: 'chk', title: 'Os tokens entram escondidos dos jogadores (você revela na cena)' }, h('input', { type: 'checkbox', id: 'enc-ocultos', checked: !!ui.ocultos, onchange: ev => { ui.ocultos = ev.target.checked; salvarUi(); } }), 'Entram ocultos'),
      h('button', { type: 'button', class: 'btn sm', id: 'enc-limpar', text: 'Limpar', onclick: () => { const antes = copia(encontro); encontro = []; salvarEncontro(); pintar(); toast('O encontro foi limpo.', 'Desfazer', () => { encontro = antes; salvarEncontro(); pintar(); }); } }),
      h('button', { type: 'button', class: 'btn sm', id: 'enc-guardar', text: 'Guardar encontro', onclick: guardarEncontro }),
      h('button', { type: 'button', class: 'btn sm pri', id: 'enc-puxar', text: 'Puxar para a cena', onclick: puxar }));
  }

  /* (lote 33) O "?" da dificuldade: a conta, com os números do encontro de agora — o poder de cada inimigo (vezes
     quantos), o de cada personagem, a soma de cada lado, a porcentagem e as faixas. */
  function contaDaDificuldade(itens, grupo, dif) {
    const dl = $('dlgDif'), FX = B.DIFICULDADES;
    const fx = (B.FAIXAS || []).slice(0, 3);
    const linhaI = dif ? dif.detalhe.inimigos : itens.map(y => { let p = 0; try { p = B.contas(y.i.e, cfg(), bib()).poder; } catch (e) { p = 0; } return { nome: y.i.e.nome, n: y.x.n, poder: p }; });
    const linhaG = dif ? dif.detalhe.grupo : [];
    const somaI = linhaI.reduce((s, x) => s + x.poder * x.n, 0), somaG = linhaG.reduce((s, x) => s + x.poder, 0);
    const faixaTxt = (k, i) => { const ate = fx[i] ? fx[i][1] : null, de = i > 0 && fx[i - 1] ? fx[i - 1][1] : null; return (FX.find(d => d[0] === k) || [k, k])[1] + (ate != null ? (de != null ? ': de ' + (de + 1) + '% a ' + ate + '%' : ': até ' + ate + '%') : ': acima de ' + fx[fx.length - 1][1] + '%'); };
    trocar(dl,
      h('div', { class: 'dl-h' }, h('h2', { id: 'dif-tit', text: 'Como a dificuldade é calculada' }), h('button', { type: 'button', class: 'ib leve', 'aria-label': 'Fechar', onclick: () => dl.close() }, '×')),
      h('div', { class: 'dl-c conta-dif' },
        h('p', { text: 'O poder de cada um é a soma dos cinco atributos finais — Força, Destreza, Vitalidade, Canalização e Agilidade —, já com o equipamento equipado e o que a árvore soma. Os números digitados à mão contam como estão. A dificuldade compara o poder dos inimigos (cada cópia conta) com o dos personagens ativos do grupo. É só uma sugestão: o terreno, as skills e a sorte não entram.' }),
        h('table', null, h('thead', null, h('tr', null, h('th', { text: 'Inimigos' }), h('th', { class: 'n', text: 'Poder' }), h('th', { class: 'n', text: 'Quantos' }), h('th', { class: 'n', text: 'Total' }))),
          h('tbody', null, linhaI.map(x => h('tr', null, h('td', { text: x.nome }), h('td', { class: 'n', text: String(x.poder) }), h('td', { class: 'n', text: '× ' + x.n }), h('td', { class: 'n', text: String(x.poder * x.n) })))),
          h('tfoot', null, h('tr', null, h('td', { text: 'Os inimigos' }), h('td'), h('td'), h('td', { class: 'n', text: String(somaI) })))),
        linhaG.length ? h('table', null, h('thead', null, h('tr', null, h('th', { text: 'Personagens' }), h('th', { class: 'n', text: 'Poder' }))),
          h('tbody', null, linhaG.map(x => h('tr', null, h('td', { text: x.nome }), h('td', { class: 'n', text: String(x.poder) })))),
          h('tfoot', null, h('tr', null, h('td', { text: 'O grupo' }), h('td', { class: 'n', text: String(somaG) })))) : h('p', { class: 'aviso', text: naMesa ? 'Nenhum personagem ativo de jogador na campanha em vista: sem o grupo, não há com o que comparar.' : 'Fora de uma mesa não há grupo: numa mesa, os personagens ativos da campanha em vista entram aqui.' }),
        dif ? h('p', { id: 'dif-conta', text: somaI + ' ÷ ' + somaG + ' = ' + dif.razao + '% do grupo → ' + dif.nome + '.' }) : null,
        h('div', { class: 'faixas' }, ['facil', 'medio', 'duro', 'mortal'].map((k, i) => h('span', { class: dif && dif.k === k ? 'on' : '', text: faixaTxt(k, i) })))),
      h('div', { class: 'dl-a' }, h('button', { type: 'button', class: 'btn pri', text: 'Ok', onclick: () => dl.close() })));
    dl.showModal();
  }

  /* ---------------- os menus: as tags e os encontros ---------------- */
  let popEl = null;
  function fecharPop() { if (popEl) { popEl.remove(); popEl = null; } }
  function abrirPop(el, ancora) {
    // (dentro de uma janela aberta, o menu vai junto dela: fora, a janela não deixa clicar)
    fecharPop(); popEl = el; (ancora.closest('dialog[open]') || document.body).append(el);
    const r = ancora.getBoundingClientRect(), w = el.offsetWidth;
    el.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + 'px';
    el.style.top = (r.bottom + 6) + 'px';
  }
  document.addEventListener('pointerdown', ev => { if (popEl && !popEl.contains(ev.target) && !ev.target.closest('#btTags, #btEncontros')) fecharPop(); }, true);
  function painelTags() {
    const todos = inimigos(), cont = t => todos.filter(x => x.e.tags.some(y => y.toLowerCase() === t.toLowerCase())).length;
    const gs = grupos();
    const el = h('div', { class: 'pop', id: 'popTags', role: 'dialog', 'aria-label': 'Filtrar pelas tags' },
      gs.map(g => h('div', { class: 'grupo' }, h('span', { class: 'eyebrow', text: g.nome }),
        h('div', { class: 'chips' }, g.tags.length ? g.tags.map(t => {
          const on = (filtro[g.id] || []).includes(t);
          return h('button', { type: 'button', class: 'chip' + (on ? ' on' : ''), 'data-tag': t, 'aria-pressed': String(on), onclick: () => {
            const l = filtro[g.id] || []; filtro[g.id] = on ? l.filter(y => y !== t) : l.concat(t); if (!filtro[g.id].length) delete filtro[g.id];
            pintar(); abrirPop(painelTags(), $('btTags')); } }, t, h('small', { text: String(cont(t)) }));
        }) : h('span', { class: 'ajuda', text: g.id === 'faccao' ? 'As facções e as regiões do Mapa-múndi aparecem aqui (e as que você criar).' : 'Nenhuma.' })))),
      h('p', { class: 'ajuda', text: 'Dentro de um grupo, basta uma tag; entre os grupos, todas. As tags novas nascem na janela de editar um inimigo.' }));
    return el;
  }
  function menuEncontros() {
    const lista = encontrosGuardados();
    const el = h('div', { class: 'menu', id: 'menuEnc', role: 'menu' }, h('div', { class: 'mh', text: 'Encontros guardados' }),
      lista.length ? lista.map(x => h('div', { style: { display: 'flex', gap: '4px' } },
        h('button', { type: 'button', role: 'menuitem', 'data-encg': x.id, onclick: () => { fecharPop(); const antes = copia(encontro); encontro = copia(x.itens.filter(y => porId(y.id))); salvarEncontro(); pintar(); toast('O encontro “' + x.nome + '” está na bandeja.', 'Desfazer', () => { encontro = antes; salvarEncontro(); pintar(); }); } },
          h('span', { text: x.nome }), h('small', { text: x.itens.reduce((s, y) => s + y.n, 0) + ' inimigos' })),
        h('button', { type: 'button', class: 'ib leve', title: 'Apagar este encontro', 'aria-label': 'Apagar o encontro ' + x.nome, style: { width: '30px' }, onclick: () => { fecharPop(); const antes = doc(B.PRE_ENC + x.id); apagarDoc(B.PRE_ENC + x.id); empilhar('apagar o encontro ' + x.nome, () => gravarDoc(B.PRE_ENC + x.id, antes)); toast('Encontro apagado: ' + x.nome + '.', 'Desfazer', desfazer); pintar(); } }, '×')))
        : h('p', { class: 'ajuda', style: { padding: '6px 9px' }, text: 'Nenhum ainda: monte um na bandeja (o “+” das cartas) e use “Guardar encontro”.' }));
    return el;
  }
  $('btTags').onclick = () => { if (popEl && popEl.id === 'popTags') { fecharPop(); return; } abrirPop(painelTags(), $('btTags')); };
  $('btEncontros').onclick = () => { if (popEl && popEl.id === 'menuEnc') { fecharPop(); return; } abrirPop(menuEncontros(), $('btEncontros')); };
  $('btLista').onclick = () => { ui.lista = !ui.lista; salvarUi(); pintar(); };
  $('busca').oninput = ev => { busca = ev.target.value; mostrar = 120; pintar(); };
  $('btNovo').onclick = () => editar(null);
  $('btDesfazer').onclick = () => desfazer();

  /* ---------------- criar, duplicar, apagar ---------------- */
  function duplicar(id) {
    const x = porId(id); if (!x) return;
    const nid = B.uid(), e = copia(x.e); e.nome = (x.e.nome + ' (cópia)').slice(0, 80);
    gravarDoc(B.PRE + nid, e);
    empilhar('duplicar ' + x.e.nome, () => apagarDoc(B.PRE + nid));
    sel = nid; pintar();
    toast(e.nome + ' criado.', 'Desfazer', desfazer);
  }
  function apagar(id) {
    const x = porId(id); if (!x) return;
    const antes = copia(doc(B.PRE + id));
    apagarDoc(B.PRE + id);
    empilhar('apagar ' + x.e.nome, () => gravarDoc(B.PRE + id, antes));
    if (sel === id) sel = null;
    pintar();
    toast(x.e.nome + ' saiu do Bestiário.', 'Desfazer', desfazer);
  }

  /* ---------------- a janela de editar ---------------- */
  function pedirTexto(titulo, rotulo, valor) {
    return new Promise(ok => {
      const dl = $('dlg'), inp = h('input', { class: 'in', id: 'pt-txt', value: valor || '', maxlength: '60', autocomplete: 'off' });
      const fim = v => { dl.close(); dl.onclose = null; ok(v); };
      trocar(dl, h('div', { class: 'dl-h' }, h('h2', { text: titulo })),
        h('div', { class: 'dl-c' }, h('label', { class: 'field' }, h('span', { text: rotulo }), inp)),
        h('div', { class: 'dl-a' }, h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: () => fim(null) }), h('button', { type: 'button', class: 'btn pri', id: 'pt-ok', text: 'Guardar', onclick: () => fim(inp.value.trim() || null) })));
      inp.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); fim(inp.value.trim() || null); } };
      dl.onclose = () => ok(null);
      dl.showModal(); inp.focus();
    });
  }
  const ABAS_ED = [['basico', 'Básico'], ['numeros', 'Números'], ['equip', 'Equipamento'], ['arvore', 'Árvore'], ['comp', 'Comportamento'], ['saque', 'Saque e notas']];
  let ed = null;            // { id (null: novo), e (o rascunho), aba }
  function editar(id) {
    const x = id ? porId(id) : null;
    ed = { id: x ? x.id : null, e: x ? copia(x.e) : B.novo('Novo inimigo'), aba: 'basico' };
    const dl = $('dlg');
    dl.onclose = () => { ed = null; };
    dl.onkeydown = ev => { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); salvarEd(); } };
    pintarEd();
    dl.showModal();
    const n = $('ed-nome'); if (n) { n.focus(); if (!x) n.select(); }
  }
  function salvarEd() {
    if (!ed) return;
    const e = B.normalizar(ed.e);
    if (!e.nome.trim()) { toast('Dê um nome ao inimigo.'); return; }
    const novo = !ed.id, id = ed.id || B.uid(), antes = novo ? null : copia(doc(B.PRE + id));
    gravarDoc(B.PRE + id, e);
    empilhar((novo ? 'criar ' : 'mudar ') + e.nome, () => { if (antes) gravarDoc(B.PRE + id, antes); else apagarDoc(B.PRE + id); });
    ed = null; $('dlg').close();
    sel = id; pintar();
    toast(novo ? e.nome + ' entrou no Bestiário.' : e.nome + ': guardado.', 'Desfazer', desfazer);
  }
  // o campo que muda o rascunho e repinta a janela (sem perder o foco de quem digita)
  function pintarEd() {
    if (!ed) return;
    const dl = $('dlg'), a = document.activeElement, foco = a && dl.contains(a) && a.id ? a.id : null, pos = foco && a.selectionStart != null ? [a.selectionStart, a.selectionEnd] : null;
    const corpo = ed.aba === 'basico' ? edBasico() : ed.aba === 'numeros' ? edNumeros() : ed.aba === 'equip' ? edEquip() : ed.aba === 'arvore' ? edArvore() : ed.aba === 'comp' ? edComp() : edSaque();
    const scroll = dl.querySelector('.dl-c') ? dl.querySelector('.dl-c').scrollTop : 0;
    trocar(dl,
      h('div', { class: 'dl-h' }, h('h2', { text: ed.id ? 'Editar ' + (ed.e.nome || 'inimigo') : 'Novo inimigo' }), h('button', { type: 'button', class: 'ib leve', 'aria-label': 'Fechar sem guardar', title: 'Fechar sem guardar', onclick: () => dl.close() }, '×')),
      h('nav', { class: 'dl-abas', role: 'tablist' }, ABAS_ED.map(([k, n]) => h('button', { type: 'button', role: 'tab', id: 'ed-aba-' + k, 'aria-selected': String(ed.aba === k), onclick: () => { ed.aba = k; pintarEd(); } }, n))),
      h('div', { class: 'dl-c' }, corpo),
      h('div', { class: 'dl-a' }, h('span', { class: 'ajuda', id: 'ed-previa', text: previaEd() }),
        h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: () => dl.close() }),
        h('button', { type: 'button', class: 'btn pri', id: 'ed-salvar', text: ed.id ? 'Guardar' : 'Criar', title: 'Guardar (Ctrl+Enter)', onclick: salvarEd })));
    const c = dl.querySelector('.dl-c'); if (c) c.scrollTop = scroll;
    if (foco) { const el = document.getElementById(foco); if (el) { el.focus({ preventScroll: true }); if (pos && el.setSelectionRange) try { el.setSelectionRange(pos[0], pos[1]); } catch (er) { /* campo sem cursor */ } } }
  }
  function previaEd() {
    try {
      const e = B.normalizar(ed.e), c = B.contas(e, cfg(), bib());
      return c.rolaveis.slice(0, 5).map(r => r[0] + ' ' + r[2]).join(' · ') + ' · ' + c.barras.map(b => b.n + ' ' + b.m).join(' · ') + ' · DEF ' + c.defesas.DFF + '/' + c.defesas.DFM;
    } catch (er) { return ''; }
  }
  const muda = (fn, repinta) => ev => { fn(ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value); if (repinta !== false) pintarEd(); else { const p = $('ed-previa'); if (p) p.textContent = previaEd(); } };
  const campo = (rotulo, el, dica) => h('label', { class: 'field' }, h('span', { text: rotulo }), el, dica ? h('span', { class: 'ajuda', text: dica }) : null);
  function edBasico() {
    const e = ed.e, todas = grupos();
    const novaTag = h('input', { class: 'in', id: 'ed-tag', placeholder: 'Nova tag (Enter)', list: 'ed-tags-l', autocomplete: 'off',
      onkeydown: ev => { if (ev.key === 'Enter') { ev.preventDefault(); const t = ev.target.value.trim().slice(0, 40); if (t && !e.tags.some(y => y.toLowerCase() === t.toLowerCase())) e.tags.push(t); ev.target.value = ''; pintarEd(); } } });
    return [
      campo('Nome', h('input', { class: 'in', id: 'ed-nome', value: e.nome, maxlength: '80', autocomplete: 'off', oninput: muda(v => { e.nome = v; }, false) })),
      h('div', { class: 'field' }, h('span', { text: 'Tags' }),
        h('div', { class: 'acoes', id: 'ed-tags' }, e.tags.map(t => h('span', { class: 'chip on' }, t, h('button', { type: 'button', class: 'x', 'aria-label': 'Tirar a tag ' + t, onclick: () => { e.tags = e.tags.filter(y => y !== t); pintarEd(); } }, '×'))), novaTag),
        h('datalist', { id: 'ed-tags-l' }, todas.flatMap(g => g.tags).map(t => h('option', { value: t }))),
        todas.filter(g => g.tags.length).map(g => h('div', { class: 'acoes' }, h('span', { class: 'ajuda', style: { minWidth: '120px' }, text: g.nome }),
          g.tags.filter(t => !e.tags.some(y => y.toLowerCase() === t.toLowerCase())).slice(0, 24).map(t => h('button', { type: 'button', class: 'chip', 'data-edtag': t, onclick: () => { e.tags.push(t); pintarEd(); } }, '+ ' + t))))),
      h('div', { class: 'g2' },
        h('div', { class: 'field' }, h('span', { text: 'Cor (sem imagem)' }), h('div', { class: 'cores' }, B.CORES.map(c => h('button', { type: 'button', class: c === e.cor ? 'on' : '', style: { background: c }, 'aria-label': 'Cor ' + c, onclick: () => { e.cor = c; pintarEd(); } })))),
        campo('Tamanho do token', h('select', { class: 'in', id: 'ed-tam', onchange: muda(v => { e.tam = +v; }) }, B.TAMANHOS.map(t => h('option', { value: String(t), selected: t === e.tam }, t === 0.5 ? '½ quadrado' : t + (t === 1 ? ' quadrado' : ' quadrados')))))),
      h('div', { class: 'field' }, h('span', { text: 'Imagem' }), h('div', { class: 'acoes' },
        h('button', { type: 'button', class: 'btn sm', id: 'ed-img', text: e.img ? 'Trocar a imagem…' : 'Escolher uma imagem…', onclick: () => $('arquivo').click() }),
        e.img ? h('button', { type: 'button', class: 'btn sm per', text: 'Tirar a imagem', onclick: () => { e.img = null; pintarEd(); } }) : null),
        h('span', { class: 'ajuda', text: 'A imagem aparece na carta e vira a do token na cena.' })),
    ];
  }
  /* (lote 33) Os números: o tier e o level; cada atributo com a letra (A recebe mais, E menos — como nas fichas) ou um
     número digitado (a base: o equipamento e a árvore somam por cima); os derivados (vazio: a conta de sempre); a
     iniciativa e as barras com fórmula ou número fixo (o equipamento ainda soma). */
  const ATR5 = ['FOR', 'DES', 'VIT', 'CAN', 'AGI'], DER4 = [['ESQ', 'Esquiva'], ['FUR', 'Furtividade'], ['PER', 'Percepção'], ['EMB', 'Embate']];
  function edNumeros() {
    const f = ed.e.ficha;
    f.atrMan = ehObj(f.atrMan) ? f.atrMan : {};
    f.derMan = ehObj(f.derMan) ? f.derMan : {};
    let c = null; try { c = B.contas(B.normalizar(ed.e), cfg(), bib()); } catch (er) { c = null; }
    const v = k => (c ? (c.rolaveis.find(r => r[0] === k) || [0, 0, 0])[2] : '–');
    // o derivado pela conta (sem o digitado), para mostrar no campo vazio
    let semMao = null; try { const e2 = copia(ed.e); e2.ficha.derMan = {}; semMao = B.contas(B.normalizar(e2), cfg(), bib()); } catch (er) { semMao = null; }
    const vConta = k => (semMao ? (semMao.rolaveis.find(r => r[0] === k) || [0, 0, 0])[2] : '');
    const manual = k => f.atrMan[k] != null && String(f.atrMan[k]).trim() !== '';
    const fixaIni = f.iniFixa === true;
    return [
      h('div', { class: 'g3' },
        campo('Tier', h('select', { class: 'in', id: 'ed-tier', onchange: muda(x => { f.tier = x; }) }, B.TIERS.map(t => h('option', { value: t, selected: t === f.tier }, t)))),
        campo('Level', h('input', { class: 'in num', id: 'ed-level', type: 'number', min: '1', max: '99', value: String(f.level), onchange: muda(x => { f.level = Math.max(1, Math.min(99, Math.round(+x) || 1)); }) })),
        h('div', { class: 'field' }, h('span', { text: 'Iniciativa' }),
          h('div', { class: 'acoes' },
            h('select', { class: 'in', id: 'ed-ini-modo', style: { width: 'auto' }, 'aria-label': 'Iniciativa: fórmula ou número fixo', onchange: muda(x => { if (x === 'fixa') { f.iniFixa = true; f.ini = String(Math.round(c ? c.ini : 0)); } else { delete f.iniFixa; f.ini = ''; } }) },
              h('option', { value: 'fml', selected: !fixaIni }, 'Fórmula'), h('option', { value: 'fixa', selected: fixaIni }, 'Número fixo')),
            fixaIni ? h('input', { class: 'in num', id: 'ed-ini', type: 'number', value: f.ini, style: { flex: '1' }, 'aria-label': 'A iniciativa fixa', onchange: muda(x => { f.ini = String(Math.round(+x) || 0); }) })
              : h('input', { class: 'in', id: 'ed-ini', value: f.ini, style: { flex: '1' }, placeholder: 'ex.: AGI/5 (vazio: 0)', 'aria-label': 'A fórmula da iniciativa', onchange: muda(x => { f.ini = x; }) })))),
      h('div', { class: 'field' }, h('span', { text: 'Os atributos: a letra (onde os pontos do level caem — A recebe mais, E menos) ou um número seu' }),
        h('div', { class: 'g5' }, ATR5.map(k => h('label', { class: 'field atr-m' + (manual(k) ? ' mao' : '') }, h('span', { text: k + ' · ' + v(k) }),
          h('select', { class: 'in', id: 'ed-t-' + k, onchange: muda(x => { if (x === 'mao') { f.atrMan[k] = c ? Math.max(0, (c.c.nat || {})[k] || 0) : 0; } else { delete f.atrMan[k]; f.tiers[k] = x; } }) },
            B.LETRAS.map(t => h('option', { value: t, selected: !manual(k) && t === f.tiers[k] }, t)), h('option', { value: 'mao', selected: manual(k) }, 'Número')),
          manual(k) ? h('input', { class: 'in num', id: 'ed-m-' + k, type: 'number', min: '0', max: '99999', value: String(f.atrMan[k]), 'aria-label': k + ' digitado', onchange: muda(x => { f.atrMan[k] = Math.max(0, Math.round(+x) || 0); }) }) : null)))),
      h('div', { class: 'field' }, h('span', { text: 'Os derivados: vazio é a conta de sempre; um número vale no lugar dela (o equipamento ainda soma)' }),
        h('div', { class: 'g4' }, DER4.map(([k, n]) => campo(n + ' · ' + v(k), h('input', { class: 'in num', id: 'ed-dm-' + k, type: 'number', min: '0', max: '99999', value: f.derMan[k] != null ? String(f.derMan[k]) : '', placeholder: String(vConta(k)), title: 'Vazio: a conta de sempre (' + vConta(k) + ')',
          onchange: muda(x => { if (String(x).trim() === '') delete f.derMan[k]; else f.derMan[k] = Math.max(0, Math.round(+x) || 0); }) }))))),
      h('div', { class: 'g3' }, [['DFF', 'Defesa física'], ['DFM', 'Defesa mágica'], ['BLQ', 'Bloqueio']].map(([k, n]) => campo(n, h('input', { class: 'in num', id: 'ed-d-' + k, type: 'number', value: String(f.defesas[k] || 0), onchange: muda(x => { f.defesas[k] = Math.round(+x) || 0; }) })))),
      h('div', { class: 'field' }, h('span', { text: 'Barras: a fórmula (VIT, CAN, LVL…) ou um número fixo (o equipamento ainda soma)' }),
        h('div', { class: 'linhas', id: 'ed-rec' }, f.recursos.map((r, i) => h('div', { class: 'linha rec' },
          h('input', { class: 'in', id: 'ed-r-n-' + i, value: r.nome, maxlength: '30', 'aria-label': 'Nome da barra', onchange: muda(x => { r.nome = x; }) }),
          h('div', { class: 'acoes', style: { flexWrap: 'nowrap' } },
            h('select', { class: 'in', id: 'ed-r-m-' + i, style: { width: 'auto' }, 'aria-label': 'Fórmula ou número fixo em ' + r.nome, onchange: muda(x => { const rr = c && c.c && Array.isArray(c.c.recursos) ? c.c.recursos.find(y => y.id === r.id) : null; if (x === 'fixo') { r.fixo = true; r.fml = String(Math.max(0, Math.round(rr && rr.max != null ? rr.max - (rr.eq || 0) - (rr.arv || 0) : 0))); } else { delete r.fixo; r.fml = 'VIT*8 + LVL*5'; } }) },
              h('option', { value: 'fml', selected: !r.fixo }, 'Fórmula'), h('option', { value: 'fixo', selected: !!r.fixo }, 'Número')),
            r.fixo ? h('input', { class: 'in num', id: 'ed-r-f-' + i, type: 'number', min: '0', value: r.fml, style: { flex: '1' }, 'aria-label': 'O número de ' + r.nome, onchange: muda(x => { r.fml = String(Math.max(0, Math.round(+x) || 0)); }) })
              : h('input', { class: 'in', id: 'ed-r-f-' + i, value: r.fml, style: { flex: '1' }, 'aria-label': 'Fórmula de ' + r.nome, onchange: muda(x => { r.fml = x; }) })),
          h('span', { class: 'mono', style: { textAlign: 'right' }, text: c && c.barras.find(b => b.id === r.id) ? '= ' + c.barras.find(b => b.id === r.id).m : 'fórmula com erro' }),
          h('button', { type: 'button', class: 'ib leve', 'aria-label': 'Tirar a barra ' + r.nome, onclick: () => { f.recursos.splice(i, 1); pintarEd(); } }, '×')))),
        h('div', { class: 'acoes' }, h('button', { type: 'button', class: 'btn sm', text: '+ Barra', onclick: () => { f.recursos.push({ id: B.uid(), nome: 'Mana', fml: 'CAN*4' }); pintarEd(); } }))),
      h('p', { class: 'previa', id: 'ed-num', text: c ? c.rolaveis.map(r => r[0] + ' ' + r[2]).join(' · ') + (f.itens && f.itens.some(x => x.equipado !== false) ? ' (com o equipamento)' : '') : 'As contas aparecem aqui.' }),
    ];
  }

  /* ---------------- (lote 33) o equipamento ----------------
     As peças do inimigo, no formato dos itens das fichas: do catálogo da aba Itens (uma cópia: mudar o catálogo depois
     não mexe aqui) ou escritas à mão. Cada uma: se vem equipada (nas Cenas, cada token troca a dele), os bônus (os
     atributos, os derivados, as defesas, as defesas específicas e as barras) e a chance de cair no saque. */
  let pecaAberta = null;
  function catalogoEquip() {
    let d = null;
    if (naMesa) { const l = D.pegar('itens:catalogo'); d = l && !l.apagado ? l.dados : null; }
    else { try { const o = JSON.parse(guarda.ler('tinycats:itens:local') || 'null'); d = o && ehObj(o.docs) ? o.docs['itens:catalogo'] : o && o['itens:catalogo'] ? o['itens:catalogo'] : null; if (d && d.dados) d = d.dados; } catch (e) { d = null; } }
    return (ehObj(d) && Array.isArray(d.itens) ? d.itens : []).filter(x => ehObj(x) && x.t === 'equip' && x.nome).map(x => ({ id: String(x.id || ''), nome: String(x.nome), nota: String(x.nota || ''), equip: ehObj(x.equip) ? x.equip : {} }));
  }
  const NOMES_B = () => (R && R.NOMES_BONUS) || {};
  function resumoPeca(it, recs) {
    const p = [];
    for (const k in it.bonus || {}) { const v = Math.round(+it.bonus[k] || 0); if (v) p.push(k + ' ' + (v > 0 ? '+' : '−') + Math.abs(v)); }
    for (const k in it.def || {}) { const v = Math.round(+it.def[k] || 0); if (v) p.push((NOMES_B()[k] || k) + ' ' + (v > 0 ? '+' : '−') + Math.abs(v)); }
    for (const k in it.rec || {}) { const v = Math.round(+it.rec[k] || 0), r = (recs || []).find(x => x.id === k); if (v) p.push((r ? r.nome : 'barra') + ' ' + (v > 0 ? '+' : '−') + Math.abs(v)); }
    return p.join(', ') || 'sem bônus';
  }
  function novaPeca(base) {
    const f = ed.e.ficha;
    f.itens = Array.isArray(f.itens) ? f.itens : [];
    if (f.itens.length >= 24) { toast('Até 24 peças por inimigo.'); return; }
    const it = Object.assign({ id: B.uid(), nome: 'Equipamento', equipado: true, bonus: {}, chance: 50 }, base || {});
    f.itens.push(it); pecaAberta = it.id; pintarEd();
    const n = $('ed-eq-n-' + it.id); if (n) { n.focus(); n.select(); }
  }
  function doCatalogo(btn) {
    const lista = catalogoEquip();
    fecharPop();
    const m = h('div', { class: 'menu', id: 'menu-cat' }, h('div', { class: 'mh', text: 'Equipamentos do catálogo' }),
      lista.length ? lista.map(x => h('button', { type: 'button', 'data-cat': x.id, onclick: () => {
        fecharPop();
        const e = x.equip, base = { nome: x.nome.slice(0, 80), bonus: Object.assign({}, e.bonus || {}), cat: /^[A-Za-z0-9_-]{1,60}$/.test(x.id) ? x.id : undefined };
        if (e.def && Object.keys(e.def).length) base.def = Object.assign({}, e.def);
        if (typeof e.tipo === 'string' && e.tipo) base.tipo = e.tipo;
        if (x.nota) base.efeito = x.nota.slice(0, 300);
        novaPeca(base);
      } }, x.nome, h('small', { text: resumoPeca({ bonus: x.equip.bonus, def: x.equip.def }) }))) : h('p', { class: 'ajuda', style: { padding: '6px 9px', margin: '0' }, text: naMesa ? 'O catálogo da aba Itens não tem equipamentos (ou você não mestra os Itens).' : 'O catálogo da aba Itens deste navegador não tem equipamentos.' }));
    abrirPop(m, btn);
  }
  function edEquip() {
    const f = ed.e.ficha, recs = f.recursos;
    f.itens = Array.isArray(f.itens) ? f.itens : [];
    const chaves = (R && R.CHAVES_BONUS) || ATR5, esp = (R && R.CHAVES_ESP) || [];
    const peca = (it, i) => {
      const aberta = pecaAberta === it.id;
      return h('div', { class: 'peca' + (it.equipado === false ? ' guardada' : ''), id: 'ed-eq-' + it.id },
        h('div', { class: 'peca-l' },
          h('input', { class: 'in', id: 'ed-eq-n-' + it.id, value: it.nome, maxlength: '80', 'aria-label': 'O nome da peça', onchange: muda(x => { it.nome = x.trim() || 'Equipamento'; }) }),
          h('label', { class: 'chk', title: 'Como ele vem: nas Cenas, cada token liga e desliga a dele' }, h('input', { type: 'checkbox', id: 'ed-eq-on-' + it.id, checked: it.equipado !== false, onchange: muda(x => { it.equipado = x; }) }), 'Vem equipado'),
          h('label', { class: 'field sq-ch', title: 'A chance de cair no saque (0: não cai)' }, h('span', { text: 'Saque %' }), h('input', { class: 'in num', type: 'number', min: '0', max: '100', id: 'ed-eq-c-' + it.id, value: String(it.chance == null ? 50 : it.chance), onchange: muda(x => { it.chance = Math.max(0, Math.min(100, Math.round(+x) || 0)); }) })),
          h('button', { type: 'button', class: 'btn sm', id: 'ed-eq-ed-' + it.id, 'aria-expanded': String(aberta), onclick: () => { pecaAberta = aberta ? null : it.id; pintarEd(); } }, aberta ? 'Fechar' : 'Bônus…'),
          h('button', { type: 'button', class: 'ib leve', 'aria-label': 'Tirar ' + it.nome, onclick: () => { f.itens.splice(i, 1); pintarEd(); } }, '×')),
        h('p', { class: 'ajuda', id: 'ed-eq-r-' + it.id, text: resumoPeca(it, recs) + (it.cat ? ' · do catálogo' : '') }),
        aberta ? h('div', { class: 'peca-b' },
          h('div', { class: 'g6' }, chaves.map(k => campo(k, h('input', { class: 'in num', type: 'number', id: 'ed-eq-b-' + it.id + '-' + k, value: it.bonus && it.bonus[k] ? String(it.bonus[k]) : '', placeholder: '0', title: NOMES_B()[k] || k,
            onchange: muda(x => { it.bonus = it.bonus || {}; const n = Math.round(+x) || 0; if (n) it.bonus[k] = n; else delete it.bonus[k]; }) })))),
          recs.length ? h('div', { class: 'field' }, h('span', { text: 'As barras (somam no máximo)' }), h('div', { class: 'g6' }, recs.map(r => campo(r.nome, h('input', { class: 'in num', type: 'number', id: 'ed-eq-r-' + it.id + '-' + r.id, value: it.rec && it.rec[r.id] ? String(it.rec[r.id]) : '', placeholder: '0',
            onchange: muda(x => { it.rec = it.rec || {}; const n = Math.round(+x) || 0; if (n) it.rec[r.id] = n; else delete it.rec[r.id]; }) }))))) : null,
          esp.length ? h('details', { class: 'esp', open: it.def && Object.keys(it.def).length ? true : null }, h('summary', { text: 'Defesas específicas (fogo, corte…)' }),
            h('div', { class: 'g6' }, esp.map(k => campo((NOMES_B()[k] || k).replace(/^Defesa: /, ''), h('input', { class: 'in num', type: 'number', id: 'ed-eq-d-' + it.id + '-' + k, value: it.def && it.def[k] ? String(it.def[k]) : '', placeholder: '0',
              onchange: muda(x => { it.def = it.def || {}; const n = Math.round(+x) || 0; if (n) it.def[k] = n; else delete it.def[k]; }) }))))) : null,
          campo('Efeito (anotação)', h('input', { class: 'in', id: 'ed-eq-e-' + it.id, value: it.efeito || '', maxlength: '300', placeholder: 'ex.: envenena no acerto crítico', onchange: muda(x => { if (x.trim()) it.efeito = x.trim(); else delete it.efeito; }) }))) : null);
    };
    return [
      h('p', { class: 'ajuda', text: 'O equipamento soma nos números do inimigo, como nas fichas. Nas Cenas, cada token liga e desliga as peças dele; no saque, cada peça cai pela chance dela, inteira (com os bônus).' }),
      f.itens.length ? h('div', { class: 'linhas', id: 'ed-eq' }, f.itens.map(peca)) : h('p', { class: 'aviso', text: 'Sem equipamento.' }),
      h('div', { class: 'acoes' },
        h('button', { type: 'button', class: 'btn sm', id: 'ed-eq-cat', text: '+ Do catálogo…', onclick: ev => doCatalogo(ev.currentTarget) }),
        h('button', { type: 'button', class: 'btn sm', id: 'ed-eq-mao', text: '+ Escrever uma peça', onclick: () => novaPeca() })),
      h('p', { class: 'previa', id: 'ed-eq-previa', text: previaEd() }),
    ];
  }
  function edArvore() {
    const e = ed.e, b = bib();
    if (!b || !b.arvores.length) return [h('p', { class: 'aviso', text: 'A biblioteca das árvores ainda está vazia (ou não chegou aqui): crie as árvores na Oficina. Enquanto isso, escreva as skills à mão, aqui embaixo.' }), skillsAMao()];
    const d = B.distribuir(B.normalizar(e), b);
    e.skills.alocados = d.alocados;
    const equipadas = b.arvores.filter(a => e.skills.arvores.includes(a.id));
    const pools = (b.pools || []).filter(p => p && p.id);
    return [
      h('div', { class: 'field' }, h('span', { text: 'Árvores do inimigo (classe, raça…)' }),
        h('div', { class: 'acoes', id: 'ed-arvs' }, b.arvores.map(a => h('label', { class: 'chk' }, h('input', { type: 'checkbox', 'data-arv': a.id, checked: e.skills.arvores.includes(a.id), onchange: ev => {
          if (ev.target.checked) e.skills.arvores.push(a.id); else { e.skills.arvores = e.skills.arvores.filter(x => x !== a.id); const ids = new Set((a.nodes || []).map(n => n.id)); e.skills.prioridade = e.skills.prioridade.filter(x => !ids.has(x)); }
          pintarEd(); } }), a.nome || 'Árvore')))),
      pools.length ? h('div', { class: 'acoes' }, pools.map(p => h('label', { class: 'field' }, h('span', { text: (p.nome || 'Pontos') + ' (gasto ' + (d.gastos[p.id] || 0) + ' de ' + (d.total[p.id] || 0) + ')' }),
        h('input', { class: 'in num', type: 'number', min: '0', id: 'ed-pool-' + p.id, value: e.skills.pontos[p.id] != null ? String(e.skills.pontos[p.id]) : '', placeholder: String(p.padrao || 0),
          onchange: muda(x => { if (String(x).trim() === '') delete e.skills.pontos[p.id]; else e.skills.pontos[p.id] = Math.max(0, Math.round(+x) || 0); }) })))) : null,
      h('label', { class: 'chk' }, h('input', { type: 'checkbox', id: 'ed-sobra', checked: e.skills.sobra, onchange: muda(x => { e.skills.sobra = x; }) }), 'Gastar o que sobrar nos nódulos mais baratos'),
      equipadas.length ? h('div', { class: 'nos', id: 'ed-nos' }, h('span', { class: 'ajuda', text: 'Clique para marcar a prioridade (★, na ordem dos cliques): o site pega o caminho até cada uma e sobe os graus dela enquanto der. Os que ficaram pegos aparecem em verde.' }),
        equipadas.map(a => h('div', { class: 'arvb' }, h('b', { text: a.nome }), h('div', { class: 'nosl' }, (a.nodes || []).filter(n => n && n.id).map(n => {
          const k = e.skills.prioridade.indexOf(n.id), al = d.alocados[n.id] || 0;
          return h('button', { type: 'button', class: 'no' + (k >= 0 ? ' pri' : al ? ' al' : ''), 'data-no': n.id, title: k >= 0 ? 'Prioridade ' + (k + 1) + ' (clique tira)' : 'Marcar como prioridade',
            onclick: () => { if (k >= 0) e.skills.prioridade.splice(k, 1); else e.skills.prioridade.push(n.id); pintarEd(); } },
            k >= 0 ? h('b', { text: '★' + (k + 1) }) : null, n.nome || 'Nódulo', al ? h('b', { text: al > 1 ? ' ' + al : ' ✓' }) : null);
        }))))) : h('p', { class: 'ajuda', text: 'Marque uma árvore acima para escolher as prioridades.' }),
      d.faltou.length ? h('p', { class: 'aviso ruim', id: 'ed-faltou', text: 'Não couberam (pontos ou um exclusivo do mesmo grupo): ' + d.faltou.join(', ') + '.' }) : null,
      skillsAMao(),
    ];
  }
  const skillsAMao = () => campo('Skills escritas à mão (aparecem na gaveta)', h('textarea', { class: 'in', id: 'ed-sktxt', rows: '4', oninput: muda(x => { ed.e.skills.texto = x; }, false) }, ed.e.skills.texto));
  function edComp() {
    const c = ed.e.comp;
    return [
      campo('Lembrete na vez dele (curto: aparece para você nas Cenas, quando a vez chega)', h('input', { class: 'in', id: 'ed-lembrete', value: c.lembrete, maxlength: '160', placeholder: 'ex.: Fica atrás do capitão; foge com 25% de HP', oninput: muda(x => { c.lembrete = x; }, false) })),
      campo('Comportamento (como ele luta, o que quer, quando foge)', h('textarea', { class: 'in', id: 'ed-comp', rows: '8', oninput: muda(x => { c.texto = x; }, false) }, c.texto)),
    ];
  }
  function edSaque() {
    const s = ed.e.saque;
    return [
      h('div', { class: 'field' }, h('span', { text: 'O que pode cair (a chance, em %, e a quantidade: 1, 2, 1d3…)' }),
        h('div', { class: 'linhas', id: 'ed-sq' }, s.itens.map((it, i) => h('div', { class: 'linha sq' },
          h('input', { class: 'in', id: 'ed-sq-n-' + i, value: it.nome, maxlength: '80', 'aria-label': 'Item', onchange: muda(x => { it.nome = x; }) }),
          h('input', { class: 'in num', id: 'ed-sq-c-' + i, type: 'number', min: '1', max: '100', value: String(it.chance), 'aria-label': 'Chance de ' + it.nome, onchange: muda(x => { it.chance = Math.max(1, Math.min(100, Math.round(+x) || 100)); }) }),
          h('input', { class: 'in', id: 'ed-sq-q-' + i, value: it.qtd, maxlength: '20', 'aria-label': 'Quantidade de ' + it.nome, onchange: muda(x => { it.qtd = x.trim() || '1'; }) }),
          h('select', { class: 'in', id: 'ed-sq-t-' + i, 'aria-label': 'Tipo de ' + it.nome, onchange: muda(x => { it.tipo = x; }) }, B.TIPOS_SAQUE.map(([k, n]) => h('option', { value: k, selected: k === it.tipo }, n))),
          h('button', { type: 'button', class: 'ib leve', 'aria-label': 'Tirar ' + it.nome, onclick: () => { s.itens.splice(i, 1); pintarEd(); } }, '×')))),
        h('div', { class: 'acoes' }, h('button', { type: 'button', class: 'btn sm', id: 'ed-sq-mais', text: '+ Item', onclick: () => { s.itens.push({ id: B.uid(), nome: 'Item', chance: 50, qtd: '1', tipo: 'material' }); pintarEd(); } }))),
      campo('Lapros (dados: 2d6, 10…)', h('input', { class: 'in', id: 'ed-lapros', value: s.lapros, maxlength: '30', placeholder: 'vazio: nenhum', onchange: muda(x => { s.lapros = x.trim(); }) })),
      campo('Notas (só para você)', h('textarea', { class: 'in', id: 'ed-notas', rows: '5', oninput: muda(x => { ed.e.notas = x; }, false) }, ed.e.notas)),
    ];
  }
  // a imagem: reduzida (até 512 px) e enviada à mesa; fora de uma mesa, embutida
  async function reduzir(arq, lado) {
    const b = await createImageBitmap(arq);
    try {
      const k = Math.min(1, lado / Math.max(b.width, b.height)), cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(b.width * k)); cv.height = Math.max(1, Math.round(b.height * k));
      cv.getContext('2d').drawImage(b, 0, 0, cv.width, cv.height);
      const blob = await new Promise(r => cv.toBlob(r, 'image/webp', 0.88));
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
      const blob = await reduzir(arq, naMesa ? 512 : 256);
      const url = naMesa ? await window.TC.arquivos.subir(blob) : await new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => falha(r.error); r.readAsDataURL(blob); });
      $('salvo').textContent = '';
      if (ed === alvo) { ed.e.img = url; pintarEd(); }
    } catch (e) { $('salvo').textContent = ''; toast((e && e.message) || 'Não deu para usar esta imagem.'); }
  };

  /* ---------------- as teclas ---------------- */
  const escrevendo = () => { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable); };
  document.addEventListener('keydown', ev => {
    if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && !ev.altKey && ev.key.toLowerCase() === 'z' && !escrevendo() && !$('dlg').open) { ev.preventDefault(); desfazer(); }
    if (ev.key === 'Escape' && !$('dlg').open) { if (popEl) fecharPop(); else if (sel) { sel = null; pintar(); } }
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
      TCx.ponte.aoMudar(e => { st = e; if (pronto) pintar(); });
      // (outro sistema pediu um inimigo: { inimigo: id } abre a gaveta dele)
      if (TCx.ponte.aoIr) TCx.ponte.aoIr(alvo => { if (alvo && typeof alvo.inimigo === 'string' && porId(alvo.inimigo)) { sel = alvo.inimigo; busca = ''; $('busca').value = ''; filtro = {}; pintar(); escolher(sel, true); } });
    }
    lerEncontro();
    if (naMesa) {
      let tP = 0;
      const depois = () => { clearTimeout(tP); tP = setTimeout(() => { if (!$('dlg').open) pintar(); }, 120); };
      D.aoMudar(l => { if (l && typeof l.id === 'string' && (l.id.startsWith('best:') || l.id === 'fichas:cfg' || l.id === 'arvore:biblioteca' || l.id.startsWith('mundo:mapa:'))) depois(); });
      P.aoMudar(depois);
    } else $('salvo').textContent = 'Neste navegador';
    pronto = true;
    pintar();
  }
  if (DEBUG) window.__best = { B, get naMesa() { return naMesa; }, get pronto() { return pronto; }, get sel() { return sel; }, get encontro() { return copia(encontro); }, get ed() { return ed; },
    inimigos: () => copia(inimigos()), contas: id => { const x = porId(id); return x ? copia(contasDe(x)) : null; }, doc: id => copia(doc(id)), gravarDoc, pintar, desfazer, editar, escolher,
    pilha: () => pilha.map(p => p.rotulo) };
  partida().catch(e => {
    console.error(e);
    trocar($('meio'), h('div', { class: 'vazio' }, h('strong', { text: 'Não deu para abrir o Bestiário. ' }), (e && e.message) || '', ' ',
      h('button', { type: 'button', class: 'btn sm', text: 'Tentar de novo', onclick: () => location.reload() })));
  });
})();
