/* Tiny Cats · Mapa-múndi · o painel.
   A barra de cima (seletor de mapas, data, "salvo", ver como jogador, desfazer, mostrar ou esconder o painel), o painel
   com as abas Seleção, Hoje, Facções, Terreno e Mapa, o estado vazio, as janelas (<dialog>) e os avisos (App.toast).
   Nada aqui muda o mapa direto: tudo passa por App.mudar. Campo de texto vira UM passo de desfazer quando a pessoa
   termina de editar (change: Enter ou ao sair do campo), nunca a cada tecla.
   O painel é refeito a cada mudança, mas por cima do que já está na tela (compara e ajusta só o que mudou): quem está
   digitando não perde o foco, o cursor nem o que escreveu, e a rolagem fica onde estava. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const ABAS = [
    { id: 'selecao', nome: 'Seleção' },
    { id: 'hoje', nome: 'Hoje' },
    { id: 'faccoes', nome: 'Facções' },
    { id: 'terreno', nome: 'Terreno', mestre: true },
    { id: 'mapa', nome: 'Mapa', mestre: true },
  ];
  const TIPO = { m: 'Marcador', g: 'Grupo', r: 'Região', e: 'Evento', t: 'Rota', f: 'Frente' };
  const APAGADO = { m: 'Marcador apagado.', g: 'Grupo apagado.', r: 'Região apagada.', e: 'Evento apagado.', t: 'Rota apagada.', f: 'Frente apagada.' };
  const ORDEM = { g: 0, m: 1, e: 2, r: 3, t: 4, f: 5 };
  const PLURAL = { m: ['marcador', 'marcadores'], g: ['grupo', 'grupos'], r: ['região', 'regiões'], e: ['evento', 'eventos'], t: ['rota', 'rotas'], f: ['frente', 'frentes'] };
  const NOMES_CORES = ['Vermelho', 'Azul', 'Verde', 'Ocre', 'Roxo', 'Magenta', 'Turquesa', 'Oliva', 'Ferrugem', 'Anil'];
  const FORCAS = [['1', '1 · leve'], ['2', '2 · séria'], ['3', '3 · grave']];
  const MAX_LISTA = 150;                          // a lista do mapa mostra até tantos; o resto, pela busca
  const CHAVE_UI = 'tinycats:mundo:painel';       // { aba, fechado }: só conveniência deste navegador
  const ESTREITO = '(max-width: 680px)';          // o painel vira gaveta por cima do mapa (CSS de mundo/index.html)
  const CELULAR = '(max-width: 900px)';           // a barra de cima encolhe (CSS do painel em mundo/index.html): tablet e celular
  const ROTA_SVG = '<path d="M4 19c3-1 3-6 8-7s5-5 8-7"/><circle cx="4" cy="19" r="1.6"/><circle cx="20" cy="5" r="1.6"/>';
  const FRENTE_SVG = '<path d="M3 16c3-3 6-3 9 0s6 3 9 0"/><path d="M6 4l5 5M11 4 6 9M13 4l5 5M18 4l-5 5"/>';
  const CHECK_SVG = '<path d="M5 12.5l4.5 4.5L19 7.5"/>';
  const X_SVG = '<path d="M6 6l12 12M18 6 6 18"/>';
  const OLHO_SVG = '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';

  let App = null;
  const N = () => (App && App.N) || window.MundoNucleo;
  const Tela = () => window.MundoTela || null;
  const $ = id => document.getElementById(id);
  const estreito = () => !!(window.matchMedia && matchMedia(ESTREITO).matches);
  const celular = () => !!(window.matchMedia && matchMedia(CELULAR).matches);

  // estado do painel (o do mapa é do App)
  let aba = 'selecao', busca = '', facAberta = null, encontro = null, mapaVisto = null;
  let quadro = 0, chaveRolagem = '', focarDepois = null, menu = null, arqModo = null, nomeNovo = '';
  let jsonArq = null, comoChip = null;
  const abertas = new Set();                      // janelas abertas (fecha a anterior ao abrir outra)

  /* ---------------- apoio ---------------- */
  /* Monta um elemento: h('button', { class: 'btn', onclick }, 'texto', outroElemento). Texto sempre entra como texto.
     Os on* e os _* viram propriedades (não addEventListener): o re-render (morph) troca junto com o resto. */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    let valor;
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on') || k.startsWith('_')) el[k] = v;
      else if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') { if (typeof v === 'string') el.style.cssText = v; else for (const p in v) { if (v[p]) el.style.setProperty(p, v[p]); } }
      else if (k === 'value') valor = v;
      else if (k === 'checked') el.checked = true;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c);
    if (valor !== undefined) el.value = valor;          // depois dos filhos: o <select> precisa das opções antes
    return el;
  }
  // Ícone SVG: só glifos fixos (o catálogo do núcleo e as constantes daqui), nunca texto de alguém.
  function glifo(markup, tam) {
    const s = document.createElementNS(NS, 'svg');
    const a = { viewBox: '0 0 24 24', width: tam || 18, height: tam || 18, fill: 'none', stroke: 'currentColor', 'stroke-width': '1.9',
      'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' };
    for (const k in a) s.setAttribute(k, a[k]);
    s.innerHTML = markup;
    return s;
  }
  const fmt = (n, casas = 1) => (Number.isFinite(n) ? n : 0).toLocaleString('pt-BR', { maximumFractionDigits: casas });
  // número para um campo de texto: vírgula decimal, sem separador de milhar (para ler de volta sem confusão)
  const fmtCampo = (n, casas = 3) => (Number.isFinite(n) ? String(Math.round(n * 10 ** casas) / 10 ** casas).replace('.', ',') : '');
  function lerNum(s) {
    let t = String(s == null ? '' : s).trim().replace(/\s+/g, '');
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    return t === '' ? NaN : Number(t);
  }
  const frase = t => (/[.!?…]$/.test(t) ? t : t + '.');       // "ano 1023 d.R." não ganha outro ponto
  const semAcento = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const plural = (n, um, varios) => (n === 1 ? '1 ' + um : fmt(n, 0) + ' ' + varios);
  const achar = (m, id) => (m && Array.isArray(m.objs) && id ? m.objs.find(o => o.id === id) : null) || null;
  const mesmoMapa = id => !!App.mapa && App.mapa.id === id && App.podeEditar();   // depois de uma janela: ainda é o mesmo mapa?
  const facDe = (m, id) => (m && Array.isArray(m.faccoes) && id ? m.faccoes.find(f => f.id === id) : null) || null;
  // a distância do mundo é em cubos (um hexágono = 5), e é a grade de hexágonos que diz quantas unidades dá um cubo
  const temGrade = m => !!(m && m.grade && m.grade.tam > 0);
  const cubos = (m, un) => N().cubosDe(m, un);
  const plHex = n => (n === 1 ? '1 hexágono' : fmt(n, 0) + ' hexágonos');
  const diasTxt = d => (d <= 0 ? 'menos de um dia' : fmt(d, 1) + (Math.round(d * 10) / 10 <= 1 ? ' dia' : ' dias'));
  // uma rota em hexágonos: quantos, e quanto custa de ponta a ponta pelo terreno (sem grade: null)
  function rotaHex(m, rt) {
    if (!temGrade(m) || !rt || !Array.isArray(rt.pts) || rt.pts.length < 2) return null;
    const v = N().viagem(m, { rota: rt.id });
    return v ? { hexes: v.cam.length - 1, cubos: v.total } : null;
  }
  const dataTxt = (m, dia) => N().textoData(m.cal, dia);
  const ler = () => { try { const v = JSON.parse(localStorage.getItem(CHAVE_UI) || 'null'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } };
  function lembrar(campos) { try { localStorage.setItem(CHAVE_UI, JSON.stringify(Object.assign(ler(), campos))); } catch (e) { /* sem armazenamento: só não lembra */ } }
  // texto escuro ou claro sobre uma cor de fundo (sigla do grupo, bolinhas)
  function tintaSobre(cor) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(cor || ''));
    if (!m) return '#14171f';
    const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#14171f' : '#ffffff';
  }

  /* ---------------- nomes e descrições ---------------- */
  function nomeDe(o, m) {
    const n = (o && o.nome || '').trim();
    if (n) return n;
    const I = N().ICONES, E = N().EVENTOS;
    switch (o && o.k) {
      case 'm': return (I[o.ic] || I.cidade).nome;
      case 'g': return 'Grupo ' + (o.sigla || '');
      case 'e': return (E[o.tipo] || E.guerra).nome;
      case 'r': { const f = facDe(m, o.fac); return f && f.nome ? 'Território de ' + f.nome : 'Região sem nome'; }
      case 't': return 'Rota sem nome';
      case 'f': return 'Frente sem nome';
    }
    return 'Sem nome';
  }
  const nomeFac = f => (f && f.nome.trim()) || 'Facção sem nome';
  function statusEvento(o, dia) {
    const ini = o.ini == null ? dia : o.ini;
    if (dia < ini) { const n = ini - dia; return n === 1 ? 'começa amanhã' : 'começa em ' + fmt(n, 0) + ' dias'; }
    if (N().eventoAtivo(o, dia)) return 'acontecendo hoje';
    if (o.fim != null && dia > o.fim) { const n = dia - o.fim; return n === 1 ? 'terminou ontem' : 'terminou há ' + fmt(n, 0) + ' dias'; }
    return 'encolheu até sumir';
  }
  // A linha curta de cada objeto (lista, subtítulo). mestre = pode mostrar o que é só dele.
  function descricao(o, m, mestre) {
    const N_ = N();
    switch (o.k) {
      case 'm': return (o.rumor ? 'Boato · ' : '') + (N_.ICONES[o.ic] || N_.ICONES.cidade).nome + (mestre && o.rumor && o.falso ? ' (falso)' : '');
      case 'g': { const r = achar(m, o.rota); return 'Grupo' + (r ? ' · viajando' : ''); }
      case 'r': { const f = facDe(m, o.fac); return 'Região' + (f ? ' · ' + nomeFac(f) : ''); }
      case 'e': return (N_.EVENTOS[o.tipo] || N_.EVENTOS.guerra).nome + ' · ' + (mestre ? statusEvento(o, m.cal.dia) : 'força ' + o.forca);
      case 't': return 'Rota · ' + (N_.VIAS[o.via] || N_.VIAS.trilha).nome;
      case 'f': { const a = facDe(m, o.a), b = facDe(m, o.b); return 'Frente' + (a || b ? ' · ' + (a ? nomeFac(a) : '?') + ' × ' + (b ? nomeFac(b) : '?') : ''); }
    }
    return '';
  }
  function icone(o, m) {
    const I = N().ICONES, E = N().EVENTOS;
    switch (o.k) {
      case 'm': {
        const ic = I[o.ic] || I.cidade;
        return h('span', { class: 'ico' + (o.rumor ? ' rumor' : ''), style: o.rumor ? null : { background: o.cor || ic.cor } }, glifo(ic.svg, 15));
      }
      case 'g': return h('span', { class: 'ico sigla', style: { background: o.cor, color: tintaSobre(o.cor) }, text: o.sigla || 'GR' });
      case 'e': { const e = E[o.tipo] || E.guerra; return h('span', { class: 'ico', style: { background: e.cor } }, glifo(e.svg, 15)); }
      case 'r': { const f = facDe(m, o.fac), c = f ? f.cor : o.cor; return h('span', { class: 'ico reg' + (c ? '' : ' semcor'), style: c ? { background: c } : null }); }
      case 't': return h('span', { class: 'ico linha' }, glifo(ROTA_SVG, 18));
      case 'f': return h('span', { class: 'ico linha' }, glifo(FRENTE_SVG, 18));
    }
    return h('span', { class: 'ico' });
  }
  // Onde o grupo está, em palavras: a região e o lugar com nome mais perto.
  function ondeEsta(m, g) {
    const partes = [], r = N().regiaoEm(m, g.x, g.y);
    if (r) { const n = (r.nome || '').trim(), f = facDe(m, r.fac); partes.push(n ? 'Em ' + n : f ? 'Em território de ' + nomeFac(f) : 'Numa região sem nome'); }
    let perto = null, dm = Infinity;
    for (const o of m.objs) if (o.k === 'm' && o.nome.trim()) { const d = N().dist(o, g); if (d < dm) { dm = d; perto = o; } }
    const diag = Math.hypot(m.larg, m.alt);
    if (perto && dm <= diag * 0.12) {
      const n = perto.nome.trim();
      partes.push(dm < diag * 0.008 ? 'em ' + n : temGrade(m) ? 'a ' + fmt(cubos(m, dm), 0) + ' cubos de ' + n : 'perto de ' + n);
    }
    return partes.length ? partes.join(' · ') : 'Em terras sem nome';
  }
  function progressoTxt(m, g) {
    const r = achar(m, g.rota);
    if (!r) return '';
    const v = temGrade(m) ? N().viagem(m, g) : null;
    if (!v) return 'Na rota ' + nomeDe(r, m);
    return fmt(Math.min(g.prog, v.total), 0) + ' de ' + fmt(v.total, 0) + ' cubos · ' + nomeDe(r, m);
  }

  /* ---------------- re-render por cima (morph) ---------------- */
  const PROPS = ['onclick', 'onchange', 'oninput', 'onkeydown', '_gravar', '_commit', '_modelo'];
  // campo onde se digita: enquanto tem o foco, o que está escrito nele não é trocado
  const textual = el => el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset|file|range)$/i.test(el.type || ''));
  const seletor = k => '[data-k="' + (window.CSS && CSS.escape ? CSS.escape(k) : String(k).replace(/["\\]/g, '\\$&')) + '"]';
  function mesmo(a, b) {
    if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) return false;
    if (a.nodeType !== 1) return true;
    if ((a.getAttribute('data-k') || '') !== (b.getAttribute('data-k') || '')) return false;
    return a.tagName !== 'INPUT' || a.type === b.type;
  }
  function morph(v, n, foco) {
    if (!mesmo(v, n)) { v.replaceWith(n); return; }
    if (v.nodeType !== 1) { if (v.nodeValue !== n.nodeValue) v.nodeValue = n.nodeValue; return; }
    if (v.namespaceURI === NS) { if (!v.isEqualNode(n)) v.replaceWith(n); return; }      // ícone: troca inteiro
    for (const a of [...v.attributes]) if (!n.hasAttribute(a.name)) v.removeAttribute(a.name);
    for (const a of n.attributes) if (v.getAttribute(a.name) !== a.value) v.setAttribute(a.name, a.value);
    for (const p of PROPS) if (v[p] !== n[p]) v[p] = n[p];
    if (v.tagName !== 'TEXTAREA') morphFilhos(v, n, foco);                              // textarea: o texto é o value
    if (v.tagName === 'INPUT' || v.tagName === 'TEXTAREA' || v.tagName === 'SELECT') {
      if (!(v === foco && textual(v)) && v.value !== n.value) v.value = n.value;
      if (v.tagName === 'INPUT' && v.checked !== n.checked) v.checked = n.checked;
    }
  }
  /* Os filhos, por posição. Se o foco está aqui dentro, o filho que o contém é a âncora: os outros entram e saem em
     volta dele, e ele nunca sai do lugar (mover um elemento com foco tira o foco). */
  function morphFilhos(v, n, foco) {
    const vc = [...v.childNodes], nc = [...n.childNodes];
    const k = foco && foco.getAttribute && foco.getAttribute('data-k');
    let iv = -1, inn = -1;
    if (k && v.contains(foco)) {
      const sel = seletor(k);
      iv = vc.findIndex(c => c === foco || (c.nodeType === 1 && c.contains(foco)));
      inn = nc.findIndex(c => c.nodeType === 1 && (c.matches(sel) || !!c.querySelector(sel)));
    }
    if (iv < 0 || inn < 0) { parear(v, vc, nc, null, foco); return; }
    parear(v, vc.slice(0, iv), nc.slice(0, inn), vc[iv], foco);
    morph(vc[iv], nc[inn], foco);
    parear(v, vc.slice(iv + 1), nc.slice(inn + 1), null, foco);
  }
  function parear(pai, vc, nc, antes, foco) {
    const n = Math.min(vc.length, nc.length);
    for (let i = 0; i < n; i++) morph(vc[i], nc[i], foco);
    for (let i = n; i < nc.length; i++) pai.insertBefore(nc[i], antes);
    for (let i = n; i < vc.length; i++) vc[i].remove();
  }
  // Troca o conteúdo de um elemento da página pelo de `novo` (um contêiner solto), sem perder o foco de quem digita.
  function morphEm(alvo, montar) {
    const foco = document.activeElement && alvo.contains(document.activeElement) && document.activeElement !== alvo ? document.activeElement : null;
    const k = foco && foco.getAttribute('data-k');
    let novo = montar();
    if (k && !novo.querySelector(seletor(k)) && typeof foco._commit === 'function') {
      foco._commit();                       // o campo vai sumir (trocou a seleção, a aba…): grava antes o que foi escrito
      novo = montar();
    }
    morphFilhos(alvo, novo, foco);
  }

  /* ---------------- campos (gravam ao terminar, um passo de desfazer cada) ---------------- */
  function commitCampo() {
    const v = this.value, antes = this._modelo;
    if (v === antes || typeof this._gravar !== 'function') return;
    this._modelo = v;
    let r;
    try { r = this._gravar(v); } catch (e) { console.error(e); r = false; }
    // não gravou (inválido, ou igual depois de arrumado): volta ao que está no mapa
    if (r === false) { this.value = antes; this._modelo = antes; }
    agendar();
  }
  function teclaCampo(ev) {
    if (ev.key === 'Escape') {
      if (this.value !== this._modelo) { ev.preventDefault(); ev.stopPropagation(); this.value = this._modelo; pintarTopo(); }
      return;
    }
    if (ev.key === 'Enter' && (this.tagName !== 'TEXTAREA' || ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); this._commit(); }
  }
  function mudaCampo() { this._commit(); }
  // um campo do painel com o foco e com texto escrito que ainda não foi gravado
  function campoSujo() {
    const el = document.activeElement;
    return !!el && typeof el._commit === 'function' && el._modelo !== undefined && textual(el) && el.value !== el._modelo && !!$('side') && $('side').contains(el);
  }
  /* A página vai sair (recarregar, fechar a aba, o celular pôr em segundo plano): o que está escrito no campo com o
     foco ainda não virou mudança (só vira no Enter ou ao sair do campo). Grava agora e manda tudo. Este ouvinte vem
     depois do de mundo.js, então manda ele mesmo. */
  function antesDeSair() {
    if (!App || !campoSujo()) return;
    try { document.activeElement._commit(); } catch (e) { console.error(e); }
    try { App.salvarJa(); } catch (e) { console.error(e); }
  }
  function campo(rotulo, el, dica, classe) {
    return h('label', { class: 'field' + (classe ? ' ' + classe : '') }, h('span', { text: rotulo }), el, dica ? h('small', { class: 'ajuda', text: dica }) : null);
  }
  function campoTexto(k, rotulo, valor, gravar, o = {}) {
    const el = h(o.area ? 'textarea' : 'input', { class: 'in', type: o.area ? null : 'text', 'data-k': k, value: valor || '', maxlength: o.max || 4000,
      placeholder: o.ph, rows: o.area ? o.linhas || 3 : null, autocomplete: 'off', spellcheck: o.area ? null : 'false', 'aria-label': rotulo ? null : o.rotulo,
      _modelo: valor || '', _gravar: gravar, _commit: commitCampo, onchange: mudaCampo, onkeydown: teclaCampo });
    return rotulo ? campo(rotulo, el, o.dica, o.classe) : el;
  }
  // Número: inteiro num <input type=number>; decimal num campo de texto (aceita vírgula).
  function campoNumero(k, rotulo, valor, gravar, o = {}) {
    const txt = valor == null || valor === '' ? '' : o.decimal ? fmtCampo(valor) : String(valor);
    const validar = v => {
      if (String(v).trim() === '' && 'vazio' in o) return gravar(o.vazio);
      let n = lerNum(v);
      if (!o.decimal && Number.isFinite(n)) n = Math.round(n);
      if (!Number.isFinite(n) || (o.min != null && n < o.min) || (o.max != null && n > o.max)) {
        App.toast(o.erro || (o.min != null && o.max != null ? 'Use um número de ' + fmt(o.min) + ' a ' + fmt(o.max) + '.' : 'Use um número.'));
        return false;
      }
      return gravar(n);
    };
    const el = h('input', { class: 'in', type: o.decimal ? 'text' : 'number', inputmode: o.decimal ? 'decimal' : 'numeric', 'data-k': k, value: txt,
      min: o.decimal ? null : o.min, max: o.decimal ? null : o.max, step: o.decimal ? null : 1, disabled: o.off, placeholder: o.ph, autocomplete: 'off',
      _modelo: txt, _gravar: validar, _commit: commitCampo, onchange: mudaCampo, onkeydown: teclaCampo });
    return rotulo ? campo(rotulo, el, o.dica) : el;
  }
  function campoCor(k, rotulo, valor, gravar) {
    const v = /^#[0-9a-f]{6}$/i.test(valor || '') ? valor.toLowerCase() : '#9aa3b5';
    return h('input', { class: 'cor', type: 'color', 'data-k': k, value: v, 'aria-label': rotulo, title: rotulo,
      _modelo: v, _gravar: gravar, _commit: commitCampo, onchange: mudaCampo });
  }
  function mudaEscolha() { this._gravar(this.type === 'checkbox' ? this.checked : this.value); agendar(); }
  function campoEscolha(k, rotulo, valor, opcoes, gravar, o = {}) {
    const el = h('select', { class: 'in', 'data-k': k, value: String(valor == null ? '' : valor), disabled: o.off, 'aria-label': rotulo ? null : o.rotulo, _gravar: gravar, onchange: mudaEscolha },
      opcoes.map(([v, t]) => h('option', { value: String(v), text: t })));
    return rotulo ? campo(rotulo, el, o.dica) : el;
  }
  function caixa(k, rotulo, marcado, gravar, o = {}) {
    return h('label', { class: 'chk' },
      h('input', { type: 'checkbox', 'data-k': k, checked: !!marcado, disabled: o.off, _gravar: gravar, onchange: mudaEscolha }),
      h('span', null, rotulo, o.dica ? h('small', { text: o.dica }) : null));
  }
  function botao(texto, fn, o = {}) {
    return h('button', { type: 'button', class: 'btn' + (o.c ? ' ' + o.c : ''), 'data-k': o.k, title: o.title, disabled: o.off, 'aria-pressed': o.pressed,
      'aria-expanded': o.expandido, onclick: fn }, o.ico ? glifo(o.ico, 15) : null, texto);
  }
  const linha = (...kids) => h('div', { class: 'row' }, kids);
  const nota = (texto, c) => h('p', { class: 'note' + (c ? ' ' + c : ''), text: texto });
  const secao = (titulo, ...kids) => h('div', { class: 'sec' }, h('b', { text: titulo }), kids);
  const segredo = (titulo, ...kids) => h('div', { class: 'sec segredo' }, h('b', { text: titulo }), kids);

  /* ---------------- mudanças (sempre por App.mudar) ---------------- */
  function mudarObj(id, rotulo, fn) {
    return App.mudar(rotulo, m => { const o = achar(m, id); if (!o) return false; return fn(o, m); });
  }
  // "Desfazer" do aviso: só desfaz se o passo de cima ainda é o deste aviso (senão desfaria outra coisa). Quem chama
  // acabou de mudar o mapa: o passo de agora é o dele.
  function avisoDesfazer(texto) {
    const passo = typeof App.passoAtual === 'function' ? App.passoAtual() : null;
    App.toast(texto, 'Desfazer', () => {
      if (passo != null && App.passoAtual() !== passo) { App.toast('Já houve outra mudança depois. Use o botão Desfazer, lá em cima.'); return; }
      App.desfazer();
    });
  }
  function passarDias(n) {
    if (!App.podeEditar()) return;
    const rot = n === 1 ? 'passar o dia' : n === -1 ? 'voltar um dia' : n > 0 ? 'passar ' + n + ' dias' : 'voltar ' + -n + ' dias';
    App.mudar(rot, m => { const d = Math.max(0, m.cal.dia + n); if (d === m.cal.dia) return false; m.cal.dia = d; });
  }
  async function irParaData() {
    if (!App.podeEditar()) return;
    const idMapa = App.mapa.id;
    const d = await escolherData('Ir para a data', App.mapa.cal.dia, { ok: 'Ir', texto: frase('Hoje é ' + dataTxt(App.mapa, App.mapa.cal.dia)) + ' Os grupos ficam onde estão.' });
    if (d == null || !mesmoMapa(idMapa)) return;
    App.mudar('ir para a data', m => { if (m.cal.dia === d) return false; m.cal.dia = d; });
  }
  // Escolher um dia do calendário (dia, mês e ano) e devolver o contador de dias do mundo.
  function escolherData(titulo, dia, o = {}) {
    const cal = App.mapa.cal, d = N().dataDe(cal, dia);
    return janela({ titulo, texto: o.texto, ok: o.ok || 'Escolher', campos: [
      { id: 'dia', rotulo: 'Dia', tipo: 'number', valor: d.diaMes, min: 1, max: 1000, linha: 'd' },
      { id: 'mes', rotulo: 'Mês', tipo: 'select', valor: String(d.mes), opcoes: cal.meses.map((x, i) => [String(i), x.nome]), linha: 'd' },
      { id: 'ano', rotulo: 'Ano', tipo: 'number', valor: d.ano, linha: 'd' },
    ], ler: v => {
      const c = App.mapa ? App.mapa.cal : cal, mes = parseInt(v.mes, 10), dm = parseInt(v.dia, 10), ano = parseInt(v.ano, 10);
      const ms = c.meses[mes];
      if (!ms) throw new Error('Escolha um mês.');
      if (!(dm >= 1 && dm <= ms.dias)) throw new Error(ms.nome + ' tem ' + ms.dias + ' dias.');
      if (!Number.isFinite(ano)) throw new Error('Escreva o ano.');
      let antes = 0;
      for (let i = 0; i < mes; i++) antes += c.meses[i].dias;
      const r = (ano - c.ano0) * N().diasNoAno(c) + antes + dm - 1;
      if (r < 0) throw new Error('Essa data vem antes do começo do calendário (' + N().textoData(c, 0) + ').');
      return r;
    } });
  }
  // Seleciona e centraliza. No celular o painel cobre o mapa: sai da frente para mostrar.
  function irPara(id) {
    const v = App.vista(), o = achar(v, id);
    if (!o) return;
    App.selecionar([id]);
    const T = Tela();
    if (T && typeof T.centrar === 'function') { try { T.centrar(o); } catch (e) { console.error(e); } }
    if (estreito()) definirPainel(false);
  }
  function duplicarObj(id) {
    let novoId = null;
    const z = (Tela() && Tela().zoom) || 1, d = Math.max(4, Math.round(28 / z));
    mudarObj(id, 'duplicar', (o, m) => {
      const c = N().copia(o);
      delete c.id;
      if (c.nome.trim()) c.nome = c.nome.trim() + ' (cópia)';
      if ('x' in c) { c.x += d; c.y += d; }
      if (Array.isArray(c.pts)) c.pts = c.pts.map(p => [p[0] + d, p[1] + d]);
      const n = N().objNovo(o.k, c);
      if (!n) return false;
      m.objs.push(n); novoId = n.id;
    });
    if (novoId) { App.selecionar([novoId]); avisoDesfazer('Duplicado.'); }
  }
  function apagarObjs(ids) {
    const set = new Set(ids), v = App.mapa, um = ids.length === 1 ? achar(v, ids[0]) : null;
    const rot = ids.length === 1 ? 'apagar' : 'apagar ' + ids.length + ' objetos';
    const ok = App.mudar(rot, m => { const antes = m.objs.length; m.objs = m.objs.filter(o => !set.has(o.id)); if (m.objs.length === antes) return false; });
    if (ok === false) return;
    if (encontro && set.has(encontro.grupo)) encontro = null;
    avisoDesfazer(um ? APAGADO[um.k] || 'Apagado.' : ids.length + ' objetos apagados.');
  }

  /* ---------------- encontros ---------------- */
  function sortearGrupo(id) {
    const m = App.mapa, g = achar(m, id);
    if (!g) return;
    const r = N().regiaoEm(m, g.x, g.y);
    if (!r) { App.toast('O grupo não está dentro de nenhuma região. Desenhe uma região e preencha os encontros dela.'); return; }
    sortearEm(r, g);
  }
  function sortearEm(reg, g) {
    const m = App.mapa;
    encontro = { grupo: g ? g.id : null, grupoNome: g ? nomeDe(g, m) : '', regiao: reg.id, regiaoNome: nomeDe(reg, m),
      r: N().sortearEncontro(reg), mesa: false, segredo: false, n: encontro ? encontro.n + 1 : 1 };
    agendar();
  }
  function textoEncontro(e, grupoNome) {
    const r = e.r;
    return (grupoNome ? grupoNome + ': ' : '') + (r.houve ? r.item || 'encontro (sem resultado escrito na tabela)' : 'nada acontece') +
      ' (d100 ' + r.d100 + ', chance ' + r.chance + '%)';
  }
  /* Os nomes que podem ir para a mesa às claras: os da projeção pública. Região ou grupo escondido (ou coberto pela
     névoa) vai sem o nome — o que os jogadores não veem no mapa não aparece no registro da mesa. */
  function nomesPublicos(e) {
    const P = N().projetar(App.mapa), reg = achar(P, e.regiao), g = e.grupo ? achar(P, e.grupo) : null;
    return { regiao: reg ? nomeDe(reg, P) : null, grupo: g ? nomeDe(g, P) : e.grupo ? 'Grupo' : '', grupoEscondido: !!e.grupo && !g };
  }
  function enviarEncontro(secreta) {
    const e = encontro;
    if (!e || !App.naMesa) return;
    const pub = secreta ? { regiao: e.regiaoNome, grupo: e.grupoNome } : nomesPublicos(e);
    const ok = App.publicarNaMesa(pub.regiao ? 'Encontro em ' + pub.regiao : 'Encontro', textoEncontro(e, pub.grupo), secreta);
    if (ok === false) { App.toast('Não deu para mandar agora. A mesa está aberta?'); return; }
    if (secreta) e.segredo = true; else e.mesa = true;
    App.toast(secreta ? 'Foi para o seu registro, em segredo.' : 'Foi para a mesa.');
    agendar();
  }
  function cartaoEncontro() {
    const e = encontro, r = e.r;
    if (e.grupo && !achar(App.mapa, e.grupo)) return null;
    let titulo, corpo, det = null;
    if (!r.chance) { titulo = 'Sem chance de encontro'; corpo = 'Esta região está com chance 0%. Ajuste a chance e os resultados na região.'; }
    else if (!r.houve) { titulo = 'Nada acontece'; corpo = 'O d100 deu ' + r.d100 + '; precisava de ' + r.chance + ' ou menos.'; }
    else {
      titulo = 'Encontro!';
      corpo = r.item || 'Houve encontro, mas a tabela da região está sem resultados escritos.';
      det = 'd100: ' + r.d100 + ' (chance ' + r.chance + '%)' + (r.total ? ' · peso ' + r.peso + ' de ' + r.total : '');
    }
    const pub = App.naMesa ? nomesPublicos(e) : null;
    const semNome = !pub ? null : !pub.regiao ? 'A região está escondida dos jogadores: o nome dela não vai para a mesa.'
      : pub.grupoEscondido ? 'O grupo está escondido dos jogadores: o nome dele não vai para a mesa.' : null;
    return h('div', { class: 'cartao' + (r.houve ? ' houve' : ''), role: 'status', 'data-k': 'enc:' + e.n },
      h('b', { text: titulo }),
      h('small', { text: (e.grupoNome ? e.grupoNome + ' · ' : '') + e.regiaoNome }),
      h('p', { class: 'publico', text: corpo }),
      det ? h('small', { text: det }) : null,
      semNome ? h('small', { text: semNome }) : null,
      App.naMesa ? linha(
        botao(e.mesa ? 'Foi para a mesa' : 'Mandar para a mesa', () => enviarEncontro(false), { c: 'sm pri', k: 'enc:mesa', off: e.mesa }),
        botao(e.segredo ? 'Foi só para você' : 'Mandar só para mim (segredo)', () => enviarEncontro(true), { c: 'sm', k: 'enc:seg', off: e.segredo })) : null,
      linha(
        botao('Sortear de novo', () => { const reg = achar(App.mapa, e.regiao), g = achar(App.mapa, e.grupo); if (reg) sortearEm(reg, g); else encontro = null; agendar(); }, { c: 'sm', k: 'enc:de-novo' }),
        botao('Fechar', () => { encontro = null; agendar(); }, { c: 'sm', k: 'enc:fechar' })));
  }

  /* ================= barra de cima ================= */
  function trocarTexto(el, t) { if (el && el.textContent !== t) el.textContent = t; }
  function pintarTopo() {
    const m = App.mapa, v = App.vista(), mestre = App.papel === 'mestre', ed = App.podeEditar();
    const raiz = document.documentElement;
    raiz.classList.toggle('jogador', !mestre);
    raiz.classList.toggle('como-jogador', mestre && !!App.comoJogador);
    trocarTexto($('nomeMapa'), m ? m.nome : mestre ? 'Nenhum mapa' : 'Sem mapa');
    const bt = $('btMapa');
    if (bt) { bt.setAttribute('aria-expanded', String(!!menu)); bt.title = mestre ? 'Trocar de mapa, criar, renomear, exportar' : 'Trocar de mapa'; }
    // data
    const dt = $('dataTxt'), cal = dt && dt.closest('.cal');
    if (cal) cal.hidden = !v;
    if (dt && v) {
      const d = N().dataDe(v.cal, v.cal.dia), longa = N().textoData(v.cal, v.cal.dia), curta = d.diaMes + '/' + (d.mes + 1) + '/' + d.ano;
      if (dt.dataset.t !== longa + '|' + curta) {
        dt.dataset.t = longa + '|' + curta;
        dt.replaceChildren(h('span', { class: 'dt-longa', text: longa }), h('span', { class: 'dt-curta', text: curta }));
      }
      dt.title = ed ? longa + '. Clique para ir a outra data.' : longa;
      if (ed) { dt.setAttribute('role', 'button'); dt.tabIndex = 0; dt.setAttribute('aria-label', 'Data do mundo: ' + longa + '. Ir para outra data'); }
      else { dt.removeAttribute('role'); dt.removeAttribute('tabindex'); dt.removeAttribute('aria-label'); }
      $('diaMenos').disabled = !ed || v.cal.dia <= 0;
      $('diaMais').disabled = !ed;
    }
    // salvo (o que foi escrito num campo e ainda não terminou de editar não está salvo: Enter ou sair do campo grava)
    const s = App.salvo || {}, sv = $('salvo'), sujo = campoSujo();
    if (sv) { trocarTexto(sv, sujo && s.estado !== 'erro' ? 'Editando…' : s.texto || ''); sv.classList.toggle('ruim', s.estado === 'erro'); }
    // ver como jogador
    const cj = $('comoJog');
    if (cj) { cj.checked = !!App.comoJogador; cj.disabled = !m; }
    const cjb = $('comoJogBox');
    if (cjb) cjb.hidden = !mestre;
    if (comoChip) comoChip.hidden = !(mestre && App.comoJogador);
    // desfazer
    const bd = $('btDesfazer');
    if (bd) {
      const pode = !!App.podeDesfazer(), rot = pode && typeof App.rotuloDesfazer === 'function' ? App.rotuloDesfazer() : '';
      bd.disabled = !pode;
      bd.title = rot ? 'Desfazer: ' + rot + ' (Ctrl+Z)' : 'Desfazer (Ctrl+Z)';
    }
    // painel
    const sd = $('side'), bp = $('btPainel');
    if (sd && bp) {
      const aberto = !sd.classList.contains('fechado');
      bp.setAttribute('aria-expanded', String(aberto));
      bp.classList.toggle('tem-sel', !aberto && (App.sel || []).length > 0 && !!m);
      bp.title = aberto ? 'Esconder o painel' : 'Mostrar o painel';
    }
  }
  // O botão Desfazer avisa o que desfez e oferece refazer: no celular e no tablet não há Ctrl+Shift+Z, e um toque a
  // mais no Desfazer não pode perder a mudança de vez.
  function desfazerPeloBotao() {
    const rot = App.rotuloDesfazer();
    if (!App.desfazer()) return;
    const passo = App.passoRefazer();
    toast('Desfeito' + (rot ? ': ' + rot : '') + '.', 'Refazer', () => {
      if (App.passoRefazer() !== passo) { App.toast('Já houve outra mudança depois: não dá mais para refazer isto.'); return; }
      App.refazer();
    });
  }
  function definirPainel(aberto, guardar) {
    const sd = $('side');
    if (!sd) return;
    sd.classList.toggle('fechado', !aberto);
    if (guardar && !estreito()) lembrar({ fechado: !aberto });
    pintarTopo();
    if (aberto) agendar();
  }
  function ligarTopo() {
    const bt = $('btMapa');
    if (bt) {
      bt.addEventListener('click', () => { if (menu) fecharMenu(true); else abrirMenu(); });
      // a seta que abre o menu não segue para a tela (lá ela moveria o que está selecionado no mapa)
      bt.addEventListener('keydown', ev => { if (ev.key === 'ArrowDown' && !menu) { ev.preventDefault(); ev.stopPropagation(); abrirMenu(); } });
    }
    const dt = $('dataTxt');
    if (dt) {
      dt.addEventListener('click', () => { if (App.podeEditar()) irParaData(); });
      dt.addEventListener('keydown', ev => { if ((ev.key === 'Enter' || ev.key === ' ') && App.podeEditar()) { ev.preventDefault(); ev.stopPropagation(); irParaData(); } });
    }
    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
    on('diaMenos', () => passarDias(-1));
    on('diaMais', () => passarDias(1));
    on('btDesfazer', desfazerPeloBotao);
    on('irCenas', () => { antesDeSair(); TC.ponte.ir('cenas'); });
    on('irAcamp', () => { antesDeSair(); TC.ponte.ir('acampamento'); });
    const at = $('atalhos'); if (at) at.hidden = !naCasca();
    on('btPainel', () => definirPainel($('side').classList.contains('fechado'), true));
    const cj = $('comoJog');
    if (cj) cj.addEventListener('change', () => { App.comoJogador = cj.checked; pintar(); });
    // no celular a caixa "Ver como jogador" não cabe: quando ligado, um chip na barra lembra e desliga
    const c = $('dataTxt') && $('dataTxt').closest('.cal');
    comoChip = h('button', { type: 'button', class: 'como-chip', hidden: true, title: 'Vendo como os jogadores veem. Toque para voltar a editar.',
      'aria-label': 'Vendo como jogador. Voltar a editar', onclick: () => { App.comoJogador = false; pintar(); } },
      glifo(OLHO_SVG, 14), 'Jogador', glifo(X_SVG, 11));
    if (c && c.parentNode) c.after(comoChip);
  }

  /* ---------------- menu de mapas ---------------- */
  function abrirMenu() {
    fecharMenu();
    const m = App.mapa, mestre = App.papel === 'mestre', itens = [];
    const item = (texto, fn, o = {}) => h('button', { type: 'button', role: o.role || 'menuitem', class: o.c, 'aria-checked': o.marcado == null ? null : String(!!o.marcado),
      disabled: o.off, onclick: () => { fecharMenu(true); fn(); } },
      o.marcado == null ? null : h('i', { class: 'marca' }, o.marcado ? glifo(CHECK_SVG, 14) : null),
      h('span', { text: texto }), o.tag ? h('small', { text: o.tag }) : null);
    const sep = () => h('hr', { role: 'separator' });
    const titulo = t => h('div', { class: 'menu-tit', role: 'presentation', text: t });
    const cv = campanhaEmVista();
    const linhaMapa = x => {
      const tags = [];
      if (App.naMesa && App.mostrado === x.id) tags.push(mestre ? 'mostrando' : 'o mestre mostra');
      if (mestre && x.oculto) tags.push('escondido');
      if (mestre && (x.camps || []).length > 1) tags.push('em ' + x.camps.length + ' campanhas');
      return item(x.nome, () => { if (!m || m.id !== x.id) App.trocarMapa(x.id); }, { role: 'menuitemradio', marcado: !!m && m.id === x.id, tag: tags.join(' · ') });
    };
    if (App.mapas.length && cv) {
      // com campanhas: primeiro os mapas da campanha em vista, depois os do mundo (que aparecem em todas)
      const dela = App.mapas.filter(x => (x.camps || []).includes(cv.id)), mundo = App.mapas.filter(x => !(x.camps || []).includes(cv.id));
      if (dela.length) itens.push(titulo('Mapas · ' + cv.nome), dela.map(linhaMapa));
      if (mundo.length) itens.push(titulo('Do mundo'), mundo.map(linhaMapa));
    } else if (App.mapas.length) {
      itens.push(titulo(mestre ? 'Mapas' : 'Mapas da mesa'), App.mapas.map(linhaMapa));
    } else itens.push(h('p', { class: 'menu-nada', text: mestre ? (cv ? 'Nenhum mapa nesta campanha ainda.' : 'Nenhum mapa ainda.') : 'O mestre ainda não mostrou nenhum mapa.' }));
    if (mestre) {
      itens.push(sep(), item('Novo mapa…', novoMapa));
      if (m) itens.push(item('Renomear…', renomearMapa), item('Duplicar', duplicarMapa));
      if (m && temCampanhas() && App.organizaCampanhas()) itens.push(item('Campanhas deste mapa…', campanhasDoMapa));
      if (App.naMesa && m) {
        itens.push(sep(),
          App.mostrado === m.id ? item('Parar de mostrar aos jogadores', () => App.mostrarAosJogadores(null)) : item('Mostrar este mapa aos jogadores', () => App.mostrarAosJogadores(m.id)),
          m.oculto ? item('Deixar os jogadores verem este mapa', () => App.esconderMapa(m.id, false)) : item('Esconder dos jogadores', () => App.esconderMapa(m.id, true)));
      }
      if (m && celular()) itens.push(sep(), item('Ver como jogador', () => { App.comoJogador = !App.comoJogador; pintar(); }, { role: 'menuitemcheckbox', marcado: !!App.comoJogador }));
      itens.push(sep());
      if (m) itens.push(item('Exportar (.json)', exportar));
      itens.push(item('Importar…', importar));
      if (m) itens.push(sep(), item('Apagar mapa…', apagarMapa, { c: 'per' }));
    }
    menu = h('div', { class: 'menu', id: 'menuMapas', role: 'menu', 'aria-label': 'Mapas', onkeydown: teclaMenu }, itens);
    document.body.append(menu);
    const r = $('btMapa').getBoundingClientRect(), w = menu.offsetWidth;
    menu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
    menu.style.top = (r.bottom + 6) + 'px';
    menu.style.maxHeight = Math.max(160, window.innerHeight - r.bottom - 18) + 'px';
    $('btMapa').setAttribute('aria-expanded', 'true');
    const bs = botoesMenu();
    (bs.find(b => b.getAttribute('aria-checked') === 'true' && b.getAttribute('role') === 'menuitemradio') || bs[0] || menu).focus();
    document.addEventListener('pointerdown', foraDoMenu, true);
  }
  const botoesMenu = () => (menu ? [...menu.querySelectorAll('button:not(:disabled)')] : []);
  function foraDoMenu(ev) {
    if (!menu || menu.contains(ev.target)) return;
    if ($('btMapa') && $('btMapa').contains(ev.target)) return;          // o clique no botão alterna
    fecharMenu();
  }
  function fecharMenu(devolverFoco) {
    if (!menu) return;
    menu.remove(); menu = null;
    document.removeEventListener('pointerdown', foraDoMenu, true);
    const bt = $('btMapa');
    if (bt) { bt.setAttribute('aria-expanded', 'false'); if (devolverFoco) bt.focus(); }
  }
  function teclaMenu(ev) {
    if (ev.key === 'Tab') { fecharMenu(); return; }
    ev.stopPropagation();                         // as teclas do menu não viram atalhos do mapa
    const bs = botoesMenu(), i = bs.indexOf(document.activeElement);
    if (ev.key === 'Escape') { ev.preventDefault(); fecharMenu(true); }
    else if (ev.key === 'ArrowDown') { ev.preventDefault(); if (bs.length) bs[(i + 1) % bs.length].focus(); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); if (bs.length) bs[(i - 1 + bs.length) % bs.length].focus(); }
    else if (ev.key === 'Home') { ev.preventDefault(); if (bs.length) bs[0].focus(); }
    else if (ev.key === 'End') { ev.preventDefault(); if (bs.length) bs[bs.length - 1].focus(); }
  }

  /* ---------------- campanhas (numa mesa que as tem) ---------------- */
  // a mesa tem campanhas (para quem usa) · a que está em vista: { id, nome, encerrada } ou null
  const temCampanhas = () => !!App.naMesa && typeof App.campanhas === 'function' && App.campanhas().length > 0;
  function campanhaEmVista() {
    if (!temCampanhas()) return null;
    const id = App.campanha();
    return (id && App.campanhas().find(c => c.id === id)) || null;
  }
  // "Este mapa é da campanha X." / "…do mundo: aparece em todas as campanhas."
  function fraseDasCampanhas(cs) {
    return cs.length ? 'Este mapa é ' + App.deQuais(cs) + '.' : 'Este mapa é do mundo: aparece em todas as campanhas.';
  }
  /* De que campanhas é o mapa aberto. Marcar mais de uma serve ao mapa que duas campanhas dividem (e veem igual); para
     cada uma ter o seu — outra geração, por exemplo —, o caminho é duplicar o mapa. */
  async function campanhasDoMapa() {
    const m = App.mapa;
    if (!m || App.papel !== 'mestre' || !temCampanhas()) return;
    const antes = App.campanhasDoMapa(m.id), id = m.id, nome = m.nome;
    const r = await janela({ titulo: 'Campanhas de "' + nome + '"', ok: 'Guardar',
      texto: 'Os jogadores só veem este mapa nas campanhas marcadas. Sem nenhuma marcada, ele é do mundo: aparece em todas. Para cada campanha ter a sua versão (outra geração, por exemplo), duplique o mapa.',
      campos: [{ id: 'camps', rotulo: 'Este mapa é das campanhas', tipo: 'caixas', valor: antes, opcoes: App.campanhas().map(c => [c.id, c.nome + (c.encerrada ? ' (encerrada)' : '')]) }] });
    if (!r) return;
    if (!App.definirCampanhas(id, r.camps)) return;                       // (nada mudou, ou o mapa já não existe)
    const agora = App.campanhasDoMapa(id), saiu = !App.mapas.some(x => x.id === id);
    toast('"' + nome + '" agora é ' + App.deQuais(agora) + (agora.length ? '.' : ': aparece em todas as campanhas.') + (saiu ? ' Saiu desta lista: está na daquela campanha.' : ''),
      'Desfazer', () => { if (App.definirCampanhas(id, antes) && App.mapas.some(x => x.id === id)) App.trocarMapa(id); }, 10000);
  }

  /* ---------------- ações do mapa (menu e aba Mapa) ---------------- */
  async function novoMapa() {
    const cv = campanhaEmVista();
    const r = await janela({ titulo: 'Novo mapa', ok: 'Criar mapa', texto: App.naMesa ? (cv ? 'O mapa novo é da campanha ' + cv.nome + ' e começa' : 'O mapa novo começa') + ' escondido dos jogadores. Quando quiser, use "Mostrar este mapa aos jogadores".' : null, campos: [
      { id: 'nome', rotulo: 'Nome', valor: '', ph: 'Mundo conhecido', max: 120 },
      { id: 'fundo', rotulo: 'Começar com', tipo: 'opcoes', valor: 'imagem', opcoes: [['imagem', 'Uma imagem sua (PNG, JPG ou WebP)'], ['papel', 'Papel em branco, para desenhar por cima']] },
    ] });
    if (!r) return;
    const nome = r.nome.trim() || 'Mundo conhecido';
    if (r.fundo === 'imagem') escolherImagem({ novo: true, nome });
    else { App.criarMapa(nome, { larg: 2000, alt: 1400 }); App.toast('Mapa criado: ' + nome + '.' + (App.naMesa ? ' Está escondido dos jogadores até você mostrar.' : '')); }
  }
  async function renomearMapa() {
    if (!App.mapa) return;
    const idMapa = App.mapa.id;
    const r = await janela({ titulo: 'Renomear o mapa', ok: 'Renomear', campos: [{ id: 'nome', rotulo: 'Nome', valor: App.mapa.nome, max: 120 }],
      ler: v => { if (!v.nome.trim()) throw new Error('Escreva um nome.'); return v.nome.trim(); } });
    if (r && App.mapa && App.mapa.id === idMapa) App.renomearMapa(r);
  }
  function duplicarMapa() {
    if (!App.mapa) return;
    if (typeof App.duplicarMapa === 'function') { App.duplicarMapa(App.mapa.id); return; }
    // sem o atalho do App: cria um mapa novo e copia o conteúdo para ele (um passo de desfazer no mapa novo)
    const orig = N().copia(App.mapa), nome = orig.nome + ' (cópia)';
    App.criarMapa(nome, { larg: orig.larg, alt: orig.alt });
    if (App.mapa && App.mapa.id !== orig.id) App.mudar('duplicar o mapa', m => { const id = m.id; Object.assign(m, orig, { id, nome }); });
  }
  async function apagarMapa() {
    const m = App.mapa;
    if (!m) return;
    const ok = await App.confirmar({ titulo: 'Apagar o mapa "' + m.nome + '"?', perigo: true, ok: 'Apagar mapa',
      texto: 'Some tudo o que está nele: marcadores, grupos, regiões, eventos, rotas, frentes, facções e a névoa. Logo depois, o aviso ainda deixa desfazer.' });
    if (ok && App.mapa && App.mapa.id === m.id) App.apagarMapa(m.id);
  }
  async function exportar() {
    try { await App.exportar(); } catch (e) { console.error(e); App.toast('Não deu para exportar agora.'); }
  }
  function importar() { if (jsonArq) { jsonArq.value = ''; jsonArq.click(); } }
  // Escolher a imagem: { novo: true, nome } cria o mapa só depois que a pessoa escolheu o arquivo.
  function escolherImagem(modo) {
    const arq = $('arq');
    if (!arq) return;
    arqModo = modo || null;
    arq.value = '';
    arq.click();
  }
  async function tirarImagem() {
    if (!App.mapa) return;
    const idMapa = App.mapa.id;
    const ok = await App.confirmar({ titulo: 'Tirar a imagem do mapa?', ok: 'Tirar a imagem', perigo: true,
      texto: 'O mapa volta a ser um papel em branco; o que está desenhado fica onde está. Dá para desfazer enquanto esta página estiver aberta.' });
    if (!ok || !mesmoMapa(idMapa)) return;
    if (App.mudar('tirar a imagem', mm => { mm.img = null; }) !== false) avisoDesfazer('A imagem saiu; ficou o papel em branco.');
  }
  async function trocarImagem() {
    if (!App.mapa) return;
    const idMapa = App.mapa.id;
    const ok = await App.confirmar({ titulo: 'Trocar a imagem do mapa?', ok: 'Escolher outra imagem',
      texto: 'O que está desenhado acompanha a imagem nova, no mesmo lugar relativo. Dá para desfazer.' });
    if (ok && mesmoMapa(idMapa)) escolherImagem(null);
  }
  function ligarArquivos() {
    const arq = $('arq');
    if (arq) arq.addEventListener('change', async () => {
      const f = arq.files && arq.files[0], modo = arqModo;
      arqModo = null;
      if (!f) return;
      arq.value = '';
      if (modo && modo.novo) {
        App.criarMapa(modo.nome || 'Mundo conhecido');
        nomeNovo = '';
      }
      if (!App.mapa) return;
      const ok = await App.definirImagem(f);
      if (ok) App.toast(modo && modo.novo ? 'Mapa criado com a sua imagem.' : 'Imagem pronta.');
    });
    jsonArq = h('input', { type: 'file', accept: '.json,application/json', hidden: true, 'aria-hidden': 'true', tabindex: '-1' });
    jsonArq.addEventListener('change', async () => {
      const f = jsonArq.files && jsonArq.files[0];
      jsonArq.value = '';
      if (!f) return;
      try { await App.importar(f); } catch (e) { console.error(e); App.toast('Não deu para importar este arquivo.'); }
    });
    document.body.append(jsonArq);
  }
  /* A grade pela régua: a pessoa arrasta sobre alguns hexágonos da imagem (ou uma distância que ela conhece) e diz
     quantos hexágonos — ou quantos cubos — a linha tem. */
  async function medirGrade() {
    const T = Tela();
    if (!T || typeof T.medir !== 'function' || !App.podeEditar()) { App.toast('A régua não está disponível agora.'); return; }
    const idMapa = App.mapa.id, sd = $('side'), saiu = estreito() && sd && !sd.classList.contains('fechado');
    if (saiu) definirPainel(false);                     // no celular o painel cobre o mapa
    const toque = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    const dica = toast('Arraste no mapa sobre alguns hexágonos da imagem, de um centro a outro (ou sobre uma distância que você conhece).' + (toque ? '' : ' Esc cancela.'), 'Cancelar', () => App.usarFerramenta('sel'), 20000);
    let un = null;
    try { un = await T.medir(); } catch (e) { console.error(e); }
    dica();
    if (saiu) definirPainel(true);
    if (un == null || !mesmoMapa(idMapa)) return;
    if (!(un >= 4)) { App.toast('A linha ficou curta demais. Tente de novo, de uma ponta à outra.'); return; }
    const r = await janela({ titulo: 'Quanto tem essa linha?', ok: 'Definir a grade', texto: 'A linha mede ' + fmt(un, 0) + ' unidades do mapa. Um hexágono tem 5 cubos.',
      campos: [{ id: 'n', rotulo: 'Quanto', tipo: 'decimal', valor: '', ph: 'Ex.: 4' }, { id: 'u', rotulo: 'Em', tipo: 'select', valor: 'hex', opcoes: [['hex', 'hexágonos'], ['cubos', 'cubos']] }],
      ler: v => { const n = lerNum(v.n); if (!(n > 0)) throw new Error('Escreva quantos, um número maior que zero.'); return { n, u: v.u }; } });
    if (r == null || !mesmoMapa(idMapa)) return;
    const hexes = r.u === 'cubos' ? r.n / N().CUBOS_HEX : r.n, tam = un / hexes;
    if (!(tam >= 4 && tam <= 20000)) { App.toast('Com essa medida, cada hexágono teria ' + fmt(tam, 1) + ' unidades do mapa. Use de 4 a 20.000.'); return; }
    if (App.mudar('definir a grade', m => { m.grade.tam = Math.round(tam * 100) / 100; }) !== false) {
      avisoDesfazer('Grade definida: cada hexágono tem ' + fmt(tam, 1) + ' unidades do mapa (5 cubos).' + (App.mapa.grade.on ? '' : ' Para ver a grade, marque "Mostrar a grade".'));
    }
  }

  /* ================= janelas e avisos ================= */
  /* Uma janela (<dialog>): foco no primeiro campo, Esc fecha, Enter confirma.
     campos: [{ id, rotulo, tipo: 'text'|'number'|'decimal'|'select'|'opcoes', valor, opcoes: [[v, nome]], min, max, linha, ph }]
     ler(valores) devolve o resultado ou lança um Error com a mensagem para a pessoa. Sem campos: resolve true/false;
     com campos: o resultado (ou os valores), ou null se cancelou. Em ação perigosa o foco começa em "Cancelar". */
  function janela(o) {
    return new Promise(resolve => {
      for (const f of [...abertas]) f(null);
      const campos = o.campos || [], ent = {}, blocos = [];
      let grupo = null, nomeGrupo = null;
      for (const c of campos) {
        let el, bloco;
        if (c.tipo === 'opcoes') {
          const radios = c.opcoes.map(([v, t]) => h('label', { class: 'op' }, h('input', { type: 'radio', name: 'dl-' + c.id, value: v, checked: String(v) === String(c.valor) }), h('span', { text: t })));
          el = radios.map(l => l.querySelector('input'));
          bloco = h('fieldset', null, h('legend', { text: c.rotulo }), radios);
        } else if (c.tipo === 'caixas') {                                        // várias de uma vez: o valor é a lista das marcadas
          const marcadas = Array.isArray(c.valor) ? c.valor.map(String) : [];
          const caixas = c.opcoes.map(([v, t]) => h('label', { class: 'op' }, h('input', { type: 'checkbox', name: 'dl-' + c.id, value: v, checked: marcadas.includes(String(v)) }), h('span', { text: t })));
          el = caixas.map(l => l.querySelector('input'));
          el.varias = true;
          bloco = h('fieldset', null, h('legend', { text: c.rotulo }), caixas);
        } else {
          el = c.tipo === 'select'
            ? h('select', { id: 'dl-' + c.id, value: String(c.valor) }, c.opcoes.map(([v, t]) => h('option', { value: String(v), text: t })))
            : h('input', { id: 'dl-' + c.id, type: c.tipo === 'number' ? 'number' : 'text', inputmode: c.tipo === 'decimal' ? 'decimal' : null,
              value: c.valor == null ? '' : String(c.valor), min: c.min, max: c.tipo === 'number' ? c.max : null, maxlength: c.tipo === 'number' ? null : c.max || 200,
              placeholder: c.ph, autocomplete: 'off' });
          bloco = h('label', null, c.rotulo, el);
        }
        ent[c.id] = el;
        if (c.linha) {
          if (nomeGrupo !== c.linha) { grupo = h('div', { class: 'lin' }); blocos.push(grupo); nomeGrupo = c.linha; }
          grupo.append(bloco);
        } else { nomeGrupo = null; blocos.push(bloco); }
      }
      const err = h('p', { class: 'err', role: 'alert' });
      const bNao = h('button', { type: 'button', class: 'btn', text: o.cancelar || 'Cancelar' });
      const bOk = h('button', { type: 'submit', class: 'btn ' + (o.perigo ? 'per' : 'pri'), text: o.ok || 'OK' });
      const titulo = h('h2', { text: o.titulo || '' });
      titulo.id = 'dl-tit-' + Date.now().toString(36);
      const form = h('form', { class: 'dl', novalidate: true }, titulo, o.texto ? h('p', { text: o.texto }) : null, blocos, err, h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl', 'aria-labelledby': titulo.id }, form);
      let feito = false;
      const nada = campos.length ? null : false;
      const fim = v => {
        if (feito) return;
        feito = true; abertas.delete(fim);
        try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ }
        dl.remove();
        resolve(v);
      };
      abertas.add(fim);
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        const vals = {};
        for (const c of campos) vals[c.id] = !Array.isArray(ent[c.id]) ? ent[c.id].value : ent[c.id].varias ? ent[c.id].filter(r => r.checked).map(r => r.value) : ((ent[c.id].find(r => r.checked) || {}).value || '');
        let res = campos.length ? vals : true;
        if (o.ler) { try { res = o.ler(vals); } catch (e) { err.textContent = (e && e.message) || 'Confira o que foi escrito.'; return; } }
        fim(res);
      });
      bNao.addEventListener('click', () => fim(nada));
      dl.addEventListener('close', () => fim(nada));                             // Esc
      let desceu = null;
      dl.addEventListener('pointerdown', ev => { desceu = ev.target; });
      dl.addEventListener('click', ev => { if (ev.target === dl && desceu === dl) fim(nada); });    // clique fora da janela
      dl.addEventListener('keydown', ev => ev.stopPropagation());                  // as teclas daqui não viram atalhos do mapa
      document.body.append(dl);
      dl.showModal();
      const prim = campos.length ? (Array.isArray(ent[campos[0].id]) ? ent[campos[0].id].find(r => r.checked) || ent[campos[0].id][0] : ent[campos[0].id]) : o.perigo ? bNao : bOk;
      if (prim) { prim.focus(); if (prim.select && prim.type !== 'radio' && prim.type !== 'checkbox') prim.select(); }
    });
  }
  function confirmar(o) {
    o = o || {};
    return janela({ titulo: o.titulo || 'Tem certeza?', texto: o.texto, ok: o.ok || 'Confirmar', perigo: !!o.perigo, cancelar: o.cancelar }).then(v => !!v);
  }
  function toast(texto, acao, fn, ms) {
    const box = $('toasts');
    if (!box) { console.info('[Mapa-múndi] ' + texto); return () => {}; }
    texto = String(texto == null ? '' : texto);
    for (const t of [...box.children]) if (t._texto === texto) t.remove();     // o mesmo aviso não se empilha
    const t = h('div', { class: 'toast', _texto: texto }, h('span', { text: texto }));
    if (acao && typeof fn === 'function') t.append(h('button', { type: 'button', text: acao, onclick: () => { t.remove(); fn(); } }));
    box.append(t);
    while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(() => t.remove(), ms || (acao ? 8000 : 4500));
    return () => t.remove();                     // quem abriu pode fechar antes da hora
  }

  /* ================= estado vazio ================= */
  function pintarVazio() {
    const vz = $('vazio');
    if (!vz) return;
    if (App.mapa) { if (!vz.hidden) { vz.hidden = true; vz.replaceChildren(); } return; }
    morphEm(vz, () => h('div', null, montarVazio()));
    vz.hidden = false;
  }
  function montarVazio() {
    if (App.papel !== 'mestre') {
      return h('div', null, h('h2', { text: 'Nenhum mapa por enquanto' }), h('p', { text: 'O mestre ainda não mostrou nenhum mapa.' }));
    }
    const nome = h('input', { class: 'in', 'data-k': 'vz:nome', value: nomeNovo, maxlength: 120, placeholder: 'Mundo conhecido', autocomplete: 'off',
      oninput: function () { nomeNovo = this.value; }, onkeydown: function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); escolherImagem({ novo: true, nome: nomeNovo.trim() || 'Mundo conhecido' }); } } });
    const outros = App.mapas.length ? h('div', { class: 'vz-outros' }, h('p', { text: 'Ou abra um dos seus mapas:' }),
      App.mapas.slice(0, 6).map(x => botao(x.nome, () => App.trocarMapa(x.id), { c: 'sm', k: 'vz:abre:' + x.id }))) : null;
    return h('div', null,
      h('h2', { text: App.mapas.length ? 'Nenhum mapa aberto' : 'Criar o primeiro mapa' }),
      h('p', { text: 'Use uma imagem sua (PNG, JPG ou WebP) ou comece num papel em branco e desenhe por cima.' }),
      campo('Nome do mapa', nome),
      h('div', { class: 'row' },
        botao('Escolher imagem', () => escolherImagem({ novo: true, nome: nomeNovo.trim() || 'Mundo conhecido' }), { c: 'pri', k: 'vz:img' }),
        botao('Papel em branco', () => { App.criarMapa(nomeNovo.trim() || 'Mundo conhecido', { larg: 2000, alt: 1400 }); nomeNovo = ''; }, { k: 'vz:papel' })),
      outros,
      h('p', { class: 'note', text: App.naMesa ? 'Fica guardado na mesa, escondido dos jogadores até você mostrar.' : 'Fica guardado neste navegador. Dá para exportar uma cópia (.json) depois.' }));
  }

  /* ================= abas ================= */
  const abasDisponiveis = () => ABAS.filter(a => !a.mestre || App.podeEditar());
  const abaVisivel = () => (abasDisponiveis().some(a => a.id === aba) ? aba : 'selecao');
  function montarAbas() {
    const tabs = $('tabs');
    if (!tabs) return;
    tabs.setAttribute('aria-label', 'Painel do mapa');
    tabs.replaceChildren(...ABAS.map(a => h('button', { type: 'button', class: 'tab', role: 'tab', id: 'tab-' + a.id, 'aria-controls': 'pane', 'aria-selected': 'false', tabindex: '-1',
      onclick: () => { aba = a.id; lembrar({ aba }); pintar(); } }, h('span', { text: a.nome }), h('span', { class: 'n', hidden: true, 'aria-hidden': 'true' }))));
    tabs.addEventListener('keydown', ev => {
      const vis = [...tabs.querySelectorAll('.tab:not([hidden])')], i = vis.indexOf(document.activeElement);
      if (i < 0) return;
      let j = -1;
      if (ev.key === 'ArrowRight') j = (i + 1) % vis.length;
      else if (ev.key === 'ArrowLeft') j = (i - 1 + vis.length) % vis.length;
      else if (ev.key === 'Home') j = 0;
      else if (ev.key === 'End') j = vis.length - 1;
      if (j < 0) return;
      ev.preventDefault(); ev.stopPropagation();
      vis[j].click(); vis[j].focus();
    });
    const pane = $('pane');
    if (pane) pane.setAttribute('role', 'tabpanel');
  }
  function pintarAbas() {
    const vis = abaVisivel(), disp = abasDisponiveis(), tabs = $('tabs');
    if (!tabs) return;
    tabs.hidden = !App.mapa;
    for (const a of ABAS) {
      const b = $('tab-' + a.id);
      if (!b) continue;
      b.hidden = !disp.includes(a);
      b.setAttribute('aria-selected', String(a.id === vis));
      b.tabIndex = a.id === vis ? 0 : -1;
    }
    const n = (App.sel || []).length, badge = $('tab-selecao') && $('tab-selecao').querySelector('.n');
    if (badge) { badge.hidden = !n || vis === 'selecao'; trocarTexto(badge, String(n)); }
  }

  /* ================= o painel ================= */
  function pintarPainel() {
    const pane = $('pane');
    if (!pane) return;
    const vis = abaVisivel();
    pane.setAttribute('aria-labelledby', 'tab-' + vis);
    morphEm(pane, montar);
    const chave = vis + '|' + (App.mapa ? App.mapa.id : '') + '|' + (vis === 'selecao' ? (App.sel || []).join(',') : vis === 'faccoes' ? facAberta : '');
    if (chave !== chaveRolagem) { chaveRolagem = chave; pane.scrollTop = 0; }
    if (focarDepois) {
      const el = pane.querySelector(seletor(focarDepois));
      focarDepois = null;
      if (el) { el.focus(); if (el.select) el.select(); }
    }
  }
  function montar() {
    const raiz = h('div'), v = App.vista();
    if (!v) {
      raiz.append(nota(App.papel === 'mestre' ? 'Nenhum mapa aberto ainda.' : 'O mestre ainda não mostrou nenhum mapa.'));
      return raiz;
    }
    if (App.papel === 'mestre' && App.comoJogador) {
      raiz.append(h('div', { class: 'aviso-jog' }, h('span', { text: 'Você está vendo o mapa como os jogadores veem. Nada aqui pode ser editado.' }),
        botao('Voltar a editar', () => { App.comoJogador = false; pintar(); }, { c: 'sm', k: 'sair-como' })));
    }
    const a = abaVisivel();
    raiz.append(...[].concat(a === 'selecao' ? abaSelecao(v) : a === 'hoje' ? abaHoje(v) : a === 'faccoes' ? abaFaccoes(v) : a === 'terreno' ? abaTerreno(App.mapa) : abaMapa(App.mapa)).filter(Boolean));
    return raiz;
  }

  /* ---------------- aba Seleção ---------------- */
  function abaSelecao(v) {
    const ids = (App.sel || []).filter(id => achar(v, id));
    if (!ids.length) return listaDoMapa(v);
    if (ids.length > 1) return varios(v, ids);
    const o = achar(v, ids[0]);
    return App.podeEditar() ? formulario(o, App.mapa) : leitura(o, v);
  }
  function itemLista(o, v, mestre, extra) {
    return h('button', { type: 'button', class: 'li clic' + (mestre && o.oculto ? ' oculto' : ''), 'data-k': 'li:' + o.id, onclick: () => irPara(o.id) },
      icone(o, v), h('span', { class: 'tx' }, h('b', { text: nomeDe(o, v) }), h('small', { text: extra || descricao(o, v, mestre) })),
      mestre && o.oculto ? h('span', { class: 'tag', text: 'escondido' }) : null);
  }
  function listaDoMapa(v) {
    const ed = App.podeEditar(), mestre = App.papel === 'mestre' && !App.comoJogador, out = [h('h3', { text: 'O que há no mapa' })];
    if (!v.objs.length) {
      out.push(nota(ed ? 'O mapa ainda está vazio. Escolha uma ferramenta no trilho à esquerda e clique no mapa para pôr marcadores, grupos, regiões, eventos, rotas e frentes.' : 'Nada à vista por enquanto.'));
      return out;
    }
    const conta = {};
    for (const o of v.objs) conta[o.k] = (conta[o.k] || 0) + 1;
    out.push(h('p', { class: 'sub', text: Object.keys(ORDEM).filter(k => conta[k]).map(k => plural(conta[k], PLURAL[k][0], PLURAL[k][1])).join(' · ') }));
    out.push(h('input', { class: 'in', type: 'search', 'data-k': 'busca', value: busca, placeholder: 'Procurar pelo nome', 'aria-label': 'Procurar no mapa', autocomplete: 'off',
      oninput: function () { busca = this.value; pintar(); } }));
    const q = semAcento(busca.trim());
    const achados = v.objs.filter(o => !q || semAcento(nomeDe(o, v)).includes(q) || semAcento(TIPO[o.k]).includes(q))
      .sort((a, b) => (ORDEM[a.k] - ORDEM[b.k]) || nomeDe(a, v).localeCompare(nomeDe(b, v), 'pt-BR'));
    if (!achados.length) out.push(nota('Nada com esse nome.'));
    else {
      out.push(h('div', { class: 'lista' }, achados.slice(0, MAX_LISTA).map(o => itemLista(o, v, mestre))));
      if (achados.length > MAX_LISTA) out.push(nota('Mostrando ' + MAX_LISTA + ' de ' + fmt(achados.length, 0) + '. Use a busca para achar o resto.'));
    }
    const toque = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    out.push(nota(ed ? 'Clique num objeto do mapa (ou da lista) para ver e editar.' : (toque ? 'Toque' : 'Clique') + ' num objeto do mapa (ou da lista) para ler o que se sabe dele.'));
    return out;
  }
  function varios(v, ids) {
    const ed = App.podeEditar(), mestre = App.papel === 'mestre' && !App.comoJogador, objs = ids.map(id => achar(v, id));
    const conta = {};
    for (const o of objs) conta[o.k] = (conta[o.k] || 0) + 1;
    const out = [h('h3', { text: ids.length + ' objetos' }), h('p', { class: 'sub', text: Object.keys(ORDEM).filter(k => conta[k]).map(k => plural(conta[k], PLURAL[k][0], PLURAL[k][1])).join(' · ') })];
    out.push(h('div', { class: 'lista' }, objs.map(o => itemLista(o, v, mestre))));
    if (ed) {
      const todosOcultos = objs.every(o => o.oculto);
      out.push(linha(
        botao(todosOcultos ? 'Mostrar aos jogadores' : 'Esconder dos jogadores', () => {
          const set = new Set(ids), val = !todosOcultos;
          App.mudar(val ? 'esconder ' + ids.length + ' objetos' : 'mostrar ' + ids.length + ' objetos', m => { for (const o of m.objs) if (set.has(o.id)) o.oculto = val; });
        }, { k: 'varios:ocultar' }),
        botao('Apagar', () => apagarObjs(ids), { c: 'per', k: 'varios:apagar' })));
    }
    out.push(nota(ed ? 'Shift + clique no mapa soma ou tira da seleção. Esc limpa.' : 'Escolha um só para ler os detalhes.'));
    return out;
  }

  // Leitura (jogador, ou mestre vendo como jogador): só o que está na projeção, e nada do que é só do mestre.
  function leitura(o, v) {
    const N_ = N(), out = [h('h3', { text: nomeDe(o, v) }), h('p', { class: 'sub', text: descricao(o, v, false) })];
    if (o.k === 'm' && o.rumor) out.push(h('p', null, h('span', { class: 'tag tensao', text: 'boato' }), ' ', h('small', { class: 'note', text: 'Pode ser verdade ou não.' })));
    if (o.k === 'e') {
      out.push(nota('Desde ' + dataTxt(v, o.ini == null ? v.cal.dia : o.ini) + ' · força ' + o.forca + ' de 3'));
      if (temGrade(v)) out.push(nota('Alcance hoje: cerca de ' + fmt(cubos(v, N_.raioNoDia(o, v.cal.dia)), 0) + ' cubos ao redor.'));
    }
    if (o.k === 'g') {
      out.push(nota(ondeEsta(v, o)));
      const p = progressoTxt(v, o);
      if (p) out.push(nota('Viagem: ' + p));
    }
    if (o.k === 'r') { const f = facDe(v, o.fac); if (f) out.push(h('p', { class: 'note' }, h('i', { class: 'bola', style: { background: f.cor } }), ' Território de ' + nomeFac(f))); }
    if (o.k === 't') {
      const rh = rotaHex(v, o);
      out.push(nota((N_.VIAS[o.via] || N_.VIAS.trilha).nome + ' · ' + (rh ? plHex(rh.hexes) + ' · ' + fmt(rh.cubos, 0) + ' cubos pelo terreno' : fmt(N_.compPolilinha(o.pts), 0) + ' unidades do mapa')));
    }
    if (o.k === 'f') {
      const a = facDe(v, o.a), b = facDe(v, o.b);
      out.push(nota((a || b ? 'Entre ' + (a ? nomeFac(a) : 'lado desconhecido') + ' e ' + (b ? nomeFac(b) : 'lado desconhecido') : 'Lados desconhecidos') + (o.ativa ? ' · em combate' : ' · parada')));
    }
    const txt = (o.txt || '').trim();
    out.push(txt ? h('p', { class: 'publico', text: txt }) : nota('Ninguém sabe muito sobre isto ainda.'));
    out.push(linha(o.k === 'm' && o.liga ? botaoLiga(o) : null, o.k === 'g' ? botaoAcampar() : null, botao('Centralizar', () => irPara(o.id), { k: 'ler:centrar' })));
    return out;
  }

  // Formulário do mestre. Cada campo grava um passo de desfazer quando a pessoa termina de editar.
  function formulario(o, m) {
    const id = o.id, N_ = N(), out = [];
    const grava = (rotulo, fn) => v => mudarObj(id, rotulo, x => fn(x, v));
    out.push(h('h3', { text: nomeDe(o, m) }), h('p', { class: 'sub', text: descricao(o, m, true) }));
    out.push(campoTexto('o:' + id + ':nome', 'Nome', o.nome, grava('mudar o nome', (x, v) => { x.nome = v.trim(); }), { max: 120, ph: nomeDe(Object.assign({}, o, { nome: '' }), m) }));
    if (o.k === 'm') out.push(secMarcador(o, grava));
    if (o.k === 'g') out.push(secGrupo(o, m, grava));
    if (o.k === 'r') out.push(secRegiao(o, m, grava));
    if (o.k === 'e') out.push(secEvento(o, m, grava));
    if (o.k === 't') out.push(secRota(o, m, grava));
    if (o.k === 'f') out.push(secFrente(o, m, grava));
    out.push(campoTexto('o:' + id + ':txt', 'O que os jogadores sabem', o.txt, grava('mudar o que os jogadores sabem', (x, v) => { x.txt = v; }), { area: true, linhas: 3, ph: 'O que se conta por aí…' }));
    out.push(segredo('Só o mestre vê',
      campoTexto('o:' + id + ':nota', null, o.nota, grava('mudar a nota do mestre', (x, v) => { x.nota = v; }), { area: true, linhas: 3, rotulo: 'Nota do mestre', ph: 'Segredos, ganchos, o que ainda não foi revelado…' }),
      o.k === 'm' && o.rumor ? caixa('o:' + id + ':falso', 'O boato é falso', o.falso, grava('marcar o boato', (x, v) => { x.falso = !!v; }), { dica: 'Os jogadores nunca veem isto.' }) : null));
    if (o.k === 'r') out.push(secEncontros(o, grava));
    out.push(caixa('o:' + id + ':oculto', 'Esconder dos jogadores', o.oculto, grava('esconder dos jogadores', (x, v) => { x.oculto = !!v; }),
      { dica: 'Some do mapa dos jogadores até você mostrar.' }));
    out.push(h('div', { class: 'row acoes' },
      botao('Centralizar', () => irPara(id), { k: 'o:centrar' }),
      botao('Duplicar', () => duplicarObj(id), { k: 'o:duplicar' }),
      botao('Apagar', () => apagarObjs([id]), { c: 'per', k: 'o:apagar' })));
    return out;
  }
  function secMarcador(o, grava) {
    const I = N().ICONES, id = o.id, ic = I[o.ic] || I.cidade;
    // a grade é uma parada só do Tab (no ícone escolhido); as setas andam entre os ícones
    return secao('Marcador',
      h('div', { class: 'grade', role: 'group', 'aria-label': 'Ícone', onkeydown: setasNaGrade }, Object.keys(I).map(k => h('button', { type: 'button', 'data-k': 'ic:' + id + ':' + k,
        'aria-pressed': String(o.ic === k), tabindex: o.ic === k ? '0' : '-1', title: I[k].nome, 'aria-label': I[k].nome, onclick: () => mudarObj(id, 'trocar o ícone', x => { x.ic = k; }) }, glifo(I[k].svg, 20)))),
      h('div', { class: 'linha-cor' }, campoCor('o:' + id + ':cor', 'Cor do marcador', o.cor || ic.cor, grava('mudar a cor', (x, v) => { x.cor = v; })),
        h('span', { class: 'note', text: o.cor ? 'Cor própria' : 'Cor do ícone' }),
        o.cor ? botao('Usar a cor do ícone', () => mudarObj(id, 'mudar a cor', x => { x.cor = ''; }), { c: 'sm', k: 'o:' + id + ':cor0' }) : null),
      caixa('o:' + id + ':rumor', 'É boato', o.rumor, grava('marcar como boato', (x, v) => { x.rumor = !!v; if (!v) x.falso = false; }),
        { dica: 'Os jogadores veem com um "?": pode ser verdade ou não.' }),
      campoEscolha('o:' + id + ':liga', 'Atalho', valorLiga(o.liga), opcoesLiga(o), grava('mudar o atalho', (x, v) => { x.liga = ligaDe(v); }),
        { dica: 'Para onde este marcador leva: dois cliques nele (ou o botão "Abrir") abrem a cena, o outro mapa ou o acampamento.' }),
      o.liga ? linha(botaoLiga(o)) : null);
  }
  /* ---- atalhos: do Mapa-múndi para as Cenas, para outro mapa e para o Acampamento ---- */
  const naCasca = () => !!(window.TC && TC.ponte && TC.ponte.naCasca);
  // as cenas para onde um atalho pode levar: numa mesa, as da mesa; fora dela, as que este navegador guarda
  // (a aba Cenas deixa a lista para os outros sistemas)
  function cenasConhecidas() {
    const daMesa = App && App.cenasDaMesa ? App.cenasDaMesa() : null;
    if (daMesa) return daMesa;
    try { const v = JSON.parse(localStorage.getItem('tinycats:cenas:lista') || 'null'); return Array.isArray(v) ? v.filter(x => x && typeof x.id === 'string').map(x => ({ id: x.id, nome: String(x.nome || 'Cena') })) : []; }
    catch (e) { return []; }
  }
  const valorLiga = l => (!l ? '' : l.t === 'acampamento' ? 'acampamento' : l.t + ':' + l.id);
  function opcoesLiga(o) {
    const ops = [['', 'Nenhum'], ['acampamento', 'Acampamento']], atual = valorLiga(o.liga);
    for (const c of cenasConhecidas()) ops.push(['cena:' + c.id, 'Cena · ' + c.nome]);
    for (const m of App.mapas) if (!App.mapa || m.id !== App.mapa.id) ops.push(['mapa:' + m.id, 'Mapa · ' + m.nome]);
    if (atual && !ops.some(x => x[0] === atual)) ops.push([atual, (o.liga.t === 'cena' ? 'Cena · ' : 'Mapa · ') + (o.liga.nome || 'sem nome') + ' (não está na lista)']);
    return ops;
  }
  function ligaDe(v) {
    if (!v) return null;
    if (v === 'acampamento') return { t: 'acampamento' };
    const i = v.indexOf(':'), t = v.slice(0, i), id = v.slice(i + 1);
    const nome = t === 'cena' ? (cenasConhecidas().find(c => c.id === id) || {}).nome : (App.mapas.find(m => m.id === id) || {}).nome;
    return { t, id, nome: nome || '' };
  }
  const textoLiga = l => (l.t === 'acampamento' ? 'Ir para o acampamento' : l.t === 'cena' ? 'Abrir a cena' + (l.nome ? ' "' + l.nome + '"' : '') : 'Abrir o mapa' + (l.nome ? ' "' + l.nome + '"' : ''));
  function seguirLiga(o) {
    const l = o && o.liga;
    if (!l) return false;
    if (l.t === 'mapa') { antesDeSair(); return App.trocarMapa(l.id); }
    if (!naCasca()) { App.toast('Este atalho funciona dentro do site Tiny Cats (pela aba Mapa-múndi).'); return false; }
    if (l.t === 'acampamento') return TC.ponte.ir('acampamento');
    return TC.ponte.ir('cenas', { cena: l.id });
  }
  const botaoLiga = o => botao(textoLiga(o.liga), () => seguirLiga(o), { c: 'pri', k: 'o:' + o.id + ':seguir', title: 'Também abre com dois cliques no marcador' });
  const botaoAcampar = () => (naCasca() ? botao('Ir para o acampamento', () => TC.ponte.ir('acampamento'), { k: 'o:acampar', title: 'Abre a aba Acampamento: a fogueira, as provisões e o descanso do grupo' }) : null);
  function setasNaGrade(ev) {
    const bs = [...this.querySelectorAll('button')], i = bs.indexOf(document.activeElement), col = 6;
    if (i < 0) return;
    const j = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + col, ArrowUp: i - col, Home: 0, End: bs.length - 1 }[ev.key];
    if (j == null) return;
    ev.preventDefault(); ev.stopPropagation();
    if (j >= 0 && j < bs.length) bs[j].focus();
  }
  function secGrupo(o, m, grava) {
    const N_ = N(), id = o.id, rotas = m.objs.filter(x => x.k === 't'), rota = achar(m, o.rota), out = [];
    out.push(h('div', { class: 'row' },
      h('label', { class: 'field cor-campo' }, h('span', { text: 'Cor' }), campoCor('o:' + id + ':cor', 'Cor do grupo', o.cor, grava('mudar a cor', (x, v) => { x.cor = v; }))),
      campoTexto('o:' + id + ':sigla', 'Sigla', o.sigla, grava('mudar a sigla', (x, v) => { x.sigla = v.trim().toUpperCase(); }), { max: 3, ph: 'GR', classe: 'curto' }),
      campoNumero('o:' + id + ':cubos', 'Anda por dia (cubos)', o.cubos, grava('mudar quanto o grupo anda', (x, n) => { x.cubos = n; }),
        { decimal: true, min: 1, max: 9999, erro: 'Use um número de cubos por dia, de 1 a 9999.' })));
    out.push(campoEscolha('o:' + id + ':rota', 'Rota', o.rota || '', [['', rotas.length ? 'Sem rota' : 'Sem rota (desenhe uma com a ferramenta Rota)']].concat(rotas.map(t => [t.id, nomeDe(t, m) + ' · ' + (N_.VIAS[t.via] || N_.VIAS.trilha).nome])),
      grava('mudar a rota', (x, v) => { if ((x.rota || '') === v) return false; x.rota = v || null; x.prog = 0; })));
    if (rota) {
      const vg = temGrade(m) ? N_.viagem(m, o) : null;
      if (vg) {
        const total = vg.total, andado = Math.min(o.prog, total), pct = total > 0 ? Math.min(100, (andado / total) * 100) : 0;
        const onde = N_.ondeNoCaminho(m, o, vg), falta = Math.max(0, total - andado), ult = vg.cam.length - 1;
        out.push(h('div', { class: 'progresso' },
          h('div', { class: 'barra', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(Math.round(total)), 'aria-valuenow': String(Math.round(andado)), 'aria-label': 'Progresso na rota' },
            h('i', { style: { width: pct.toFixed(1) + '%' } })),
          h('small', { text: fmt(andado, 0) + ' de ' + fmt(total, 0) + ' cubos · ' + (onde.longe ? 'fora da rota' : 'hexágono ' + onde.i + ' de ' + ult)
            + (falta > 0 ? ' · faltam cerca de ' + diasTxt(falta / Math.max(1, o.cubos)) : ' · chegou') })));
      } else out.push(h('div', { class: 'row' }, nota('Defina a grade de hexágonos do mapa para medir a viagem.'), botao('Abrir a aba Terreno', () => abrirAba('terreno'), { c: 'sm', k: 'o:ir-grade' })));
    }
    out.push(linha(
      botao('Andar 1 dia', () => andar(id), { c: 'pri', k: 'o:andar', off: !rota, title: rota ? 'Move o grupo pela rota, de hexágono em hexágono, e passa o dia' : 'Escolha uma rota primeiro' }),
      botao('Sortear encontro', () => sortearGrupo(id), { k: 'o:sortear', title: 'Usa a tabela de encontros da região onde o grupo está' })));
    if (rota && (o.prog > 0 || N_.dist(o, { x: rota.pts[0][0], y: rota.pts[0][1] }) > 0.5)) {
      out.push(linha(botao('Pôr no começo da rota', () => mudarObj(id, 'pôr no começo da rota', (x, mm) => { const r = achar(mm, x.rota); if (!r) return false; x.x = r.pts[0][0]; x.y = r.pts[0][1]; x.prog = 0; }), { c: 'sm', k: 'o:comeco' })));
    }
    out.push(nota('Andar 1 dia passa o dia: cada hexágono gasta os cubos do terreno dele (Floresta, Montanha… na aba Terreno). O que sobra rumo ao próximo fica para o dia seguinte.'));
    if (naCasca()) out.push(linha(botaoAcampar()));
    if (encontro && encontro.grupo === id) out.push(cartaoEncontro());
    return secao('Grupo', out);
  }
  // Um dia de viagem com todos os grupos que têm rota: cada um anda o dele, e o dia passa uma vez só.
  function andarTodos() {
    if (!App.podeEditar()) return;
    const m0 = App.mapa, feitos = [];
    for (const g of m0.objs) if (g.k === 'g' && g.rota) { const r = N().andarUmDia(m0, g.id); if (r.ok) feitos.push([g.id, r]); }
    if (!feitos.length) { App.toast('Nenhum grupo andou: sem rota, fora dela ou já no fim.'); return; }
    const ok = App.mudar('andar 1 dia com todos', mm => {
      for (const [id, r] of feitos) { const g = achar(mm, id); if (g) { g.x = r.x; g.y = r.y; g.prog = r.prog; } }
      mm.cal.dia += 1;
    });
    if (ok !== false) avisoDesfazer((feitos.length === 1 ? 'Um grupo andou' : feitos.length + ' grupos andaram') + '. Passou o dia: hoje é ' + dataTxt(App.mapa, App.mapa.cal.dia) + '.');
  }
  // Um dia de viagem: o grupo anda pela rota e o dia passa (um passo de desfazer só, para as duas coisas).
  function andar(id) {
    if (!App.podeEditar()) return;
    const r = N().andarUmDia(App.mapa, id);
    if (!r.ok) { App.toast((r.msg || 'O grupo não andou') + '.'); return; }
    const ok = App.mudar('andar 1 dia', mm => { const g = achar(mm, id); if (!g) return false; g.x = r.x; g.y = r.y; g.prog = r.prog; mm.cal.dia += 1; });
    if (ok !== false) avisoDesfazer(r.msg + '. Passou o dia: hoje é ' + dataTxt(App.mapa, App.mapa.cal.dia) + '.');
  }
  function secRegiao(o, m, grava) {
    const id = o.id, f = facDe(m, o.fac), out = [];
    if (m.faccoes.length) {
      out.push(campoEscolha('o:' + id + ':fac', 'Facção', o.fac || '', [['', 'Sem facção']].concat(m.faccoes.map(x => [x.id, nomeFac(x) + (x.oculta ? ' (escondida)' : '')])),
        grava('mudar a facção', (x, v) => { x.fac = v || null; })));
    } else out.push(h('div', { class: 'row' }, nota('Sem facções ainda. Elas dão cor às regiões e lados às frentes.'), botao('Criar facção', () => { abrirAba('faccoes'); novaFaccao(); }, { c: 'sm', k: 'o:criar-fac' })));
    if (f) out.push(nota('A cor vem da facção.'));
    else {
      out.push(h('div', { class: 'linha-cor' }, campoCor('o:' + id + ':cor', 'Cor da região', o.cor, grava('mudar a cor', (x, v) => { x.cor = v; })),
        h('span', { class: 'note', text: o.cor ? 'Cor própria' : 'Sem cor: aparece tracejada' }),
        o.cor ? botao('Tirar a cor', () => mudarObj(id, 'mudar a cor', x => { x.cor = ''; }), { c: 'sm', k: 'o:' + id + ':cor0' }) : null));
    }
    // o custo de viajar por aqui: vale para cada hexágono com o centro dentro dela (menos o que tem custo próprio)
    out.push(campoNumero('o:' + id + ':custo', 'Custo de cada hexágono aqui (cubos)', o.custo, grava('mudar o custo da região', (x, n) => { x.custo = n; }),
      { decimal: true, min: 0.1, max: 9999, vazio: null, ph: 'o do terreno', dica: 'Vazio: cada hexágono custa o do terreno dele. Só o mestre vê.' }));
    return secao('Região', out);
  }
  // Tabela de encontros: uma linha por resultado; "3: Lobos famintos" = peso 3.
  const PESO = /^\s*(\d{1,6})\s*[:=]\s*(.*)$/;
  function itensParaTexto(itens) {
    return itens.map(it => (it.p !== 1 || PESO.test(it.txt) ? it.p + ': ' : '') + it.txt).join('\n');
  }
  function textoParaItens(s) {
    const itens = [];
    for (const l of String(s).split(/\r?\n/)) {
      if (!l.trim()) continue;
      const m = PESO.exec(l);
      if (m && m[2].trim()) itens.push({ p: Math.max(1, parseInt(m[1], 10)), txt: m[2].trim() });
      else itens.push({ p: 1, txt: l.trim() });
    }
    return itens.slice(0, 200);
  }
  function secEncontros(o, grava) {
    const id = o.id, enc = o.enc || { chance: 0, itens: [] };
    const total = enc.itens.reduce((s, it) => s + it.p, 0);
    return h('div', { class: 'sec segredo' }, h('b', { text: 'Encontros · só o mestre vê' }),
      campoNumero('o:' + id + ':chance', 'Chance de encontro por sorteio (%)', enc.chance, grava('mudar a chance de encontro', (x, n) => { x.enc.chance = n; }), { min: 0, max: 100 }),
      campoTexto('o:' + id + ':enc', 'Resultados (um por linha)', itensParaTexto(enc.itens), grava('mudar os encontros', (x, v) => { x.enc.itens = textoParaItens(v); }),
        { area: true, linhas: 4, ph: '3: Lobos famintos\n1: Mercador perdido', dica: 'Peso antes, com dois-pontos: "3: Lobos famintos" sai 3 vezes mais que um resultado sem peso.' }),
      enc.itens.length ? h('small', { class: 'ajuda', text: plural(enc.itens.length, 'resultado', 'resultados') + ' · peso total ' + total }) : null,
      linha(botao('Sortear aqui', () => sortearEm(achar(App.mapa, id) || o, null), { c: 'sm', k: 'o:sortear-reg' })),
      encontro && !encontro.grupo && encontro.regiao === id ? cartaoEncontro() : null);
  }
  function secEvento(o, m, grava) {
    const N_ = N(), E = N_.EVENTOS, id = o.id, dia = m.cal.dia, ini = o.ini == null ? dia : o.ini, ke = temGrade(m), un = ke ? 'cubos' : 'unid.';
    const paraUn = n => (ke ? N_.unidadesDeCubos(m, n) : n), deUn = n => (ke ? cubos(m, n) : n);
    const out = [];
    out.push(h('div', { class: 'row' },
      campoEscolha('o:' + id + ':tipo', 'Tipo', o.tipo, Object.keys(E).map(k => [k, E[k].nome]), grava('mudar o tipo do evento', (x, v) => { x.tipo = v; })),
      campoEscolha('o:' + id + ':forca', 'Força', String(o.forca), FORCAS, grava('mudar a força', (x, v) => { x.forca = parseInt(v, 10) || 1; }))));
    out.push(h('div', { class: 'field' }, h('span', { text: 'Começa em' }),
      h('div', { class: 'data-linha' }, h('b', { text: dataTxt(m, ini) }),
        botao('Hoje', () => mudarObj(id, 'mudar o começo', x => { moverInicio(x, dia); }), { c: 'sm', k: 'o:ini-hoje', off: ini === dia }),
        botao('Escolher…', async () => {
          const idMapa = m.id, d = await escolherData('Quando o evento começa?', ini, { ok: 'Escolher' });
          if (d != null && mesmoMapa(idMapa)) mudarObj(id, 'mudar o começo', x => { moverInicio(x, d); });
        }, { c: 'sm', k: 'o:ini-escolher' }))));
    const semFim = o.fim == null;
    out.push(h('div', { class: 'row' },
      campoNumero('o:' + id + ':dura', 'Dura (dias)', semFim ? '' : o.fim - ini + 1, grava('mudar a duração', (x, n) => { x.fim = (x.ini == null ? dia : x.ini) + n - 1; }),
        { min: 1, max: 1e6, off: semFim, ph: semFim ? 'sem fim' : null }),
      h('div', { class: 'field fim-campo' }, caixa('o:' + id + ':semfim', 'Sem fim', semFim, grava('mudar a duração', (x, v) => { x.fim = v ? null : (x.ini == null ? dia : x.ini) + 6; })))));
    out.push(h('div', { class: 'row' },
      campoNumero('o:' + id + ':r', 'Raio (' + un + ')', deUn(o.r), grava('mudar o raio', (x, n) => { x.r = paraUn(n); }),
        { decimal: true, min: ke ? 0.001 : 1, erro: 'Use um raio maior que zero.' }),
      campoNumero('o:' + id + ':cresce', 'Cresce/dia (' + un + ')', deUn(o.cresce), grava('mudar o crescimento', (x, n) => { x.cresce = paraUn(n); }),
        { decimal: true, vazio: 0 })));
    out.push(nota('O raio é o do primeiro dia. Crescimento negativo encolhe; quando o raio chega a zero, o evento acaba.'));
    const st = statusEvento(o, dia), r = N_.raioNoDia(o, dia);
    out.push(h('p', { class: 'status' }, h('span', { class: 'tag' + (st === 'acontecendo hoje' ? ' alianca' : ''), text: st }),
      st === 'acontecendo hoje' ? ' raio hoje: ' + (ke ? fmt(cubos(m, r), 1) + ' cubos' : fmt(r, 0) + ' unidades') : '',
      o.fim != null ? ' · termina em ' + dataTxt(m, o.fim) : ''));
    return secao('Evento', out);
  }
  // Mudar o começo leva o fim junto (a duração fica a mesma).
  function moverInicio(x, d) {
    const ini = x.ini == null ? d : x.ini;
    if (ini === d && x.ini != null) return false;
    const dur = x.fim == null ? null : x.fim - ini;
    x.ini = d;
    if (dur != null) x.fim = d + dur;
  }
  function secRota(o, m, grava) {
    const N_ = N(), id = o.id, un = N_.compPolilinha(o.pts), out = [];
    out.push(campoEscolha('o:' + id + ':via', 'Desenho', o.via, Object.keys(N_.VIAS).map(k => [k, N_.VIAS[k].nome]), grava('mudar o desenho da rota', (x, v) => { x.via = v; }),
      { dica: 'É só o desenho: quanto se anda por dia é o grupo quem diz, e o terreno de cada hexágono pesa no caminho.' }));
    const rh = rotaHex(m, o), grupos = m.objs.filter(g => g.k === 'g' && g.rota === id);
    if (rh) {
      out.push(h('p', { class: 'status' }, h('b', { text: plHex(rh.hexes) }), ' · ' + fmt(rh.cubos, 0) + ' cubos pelo terreno, de ponta a ponta'));
      const ritmos = grupos.length ? grupos.map(g => [nomeDe(g, m), g.cubos]) : [['A ' + fmt(N_.CUBOS_DIA, 0) + ' cubos por dia', N_.CUBOS_DIA]];
      out.push(h('div', { class: 'tabela' }, ritmos.map(([nome, c]) => h('div', null, h('span', { text: nome }), h('b', { text: diasTxt(rh.cubos / Math.max(1, c)) })))));
    } else out.push(h('div', { class: 'row' }, nota(fmt(un, 0) + ' unidades do mapa. Com a grade de hexágonos, aparecem os cubos e os dias de viagem.'), botao('Definir a grade', () => abrirAba('terreno'), { c: 'sm', k: 'o:ir-grade' })));
    if (grupos.length) out.push(nota('Nesta rota: ' + grupos.map(g => nomeDe(g, m)).join(', ') + '.'));
    return secao('Rota', out);
  }
  function secFrente(o, m, grava) {
    const id = o.id, ops = [['', 'Nenhuma']].concat(m.faccoes.map(f => [f.id, nomeFac(f)])), out = [];
    if (!m.faccoes.length) out.push(h('div', { class: 'row' }, nota('Crie facções para dar lados à frente.'), botao('Criar facção', () => { abrirAba('faccoes'); novaFaccao(); }, { c: 'sm', k: 'o:criar-fac' })));
    out.push(h('div', { class: 'row' },
      campoEscolha('o:' + id + ':a', 'Lado A', o.a || '', ops, grava('mudar o lado A', (x, v) => { x.a = v || null; })),
      campoEscolha('o:' + id + ':b', 'Lado B', o.b || '', ops, grava('mudar o lado B', (x, v) => { x.b = v || null; }))));
    out.push(caixa('o:' + id + ':ativa', 'Em combate', o.ativa, grava('mudar o combate', (x, v) => { x.ativa = !!v; }), { dica: 'A linha anda no mapa enquanto há combate.' }));
    return secao('Frente', out);
  }

  /* ---------------- aba Hoje ---------------- */
  function abaHoje(v) {
    const N_ = N(), ed = App.podeEditar(), mestre = App.papel === 'mestre' && !App.comoJogador, dia = v.cal.dia, out = [];
    out.push(h('h3', { text: N_.textoData(v.cal, dia) }));
    if (ed) {
      out.push(h('div', { class: 'row' },
        botao('Passar o dia', () => passarDias(1), { c: 'pri', k: 'hoje:+1' }),
        botao('+7 dias', () => passarDias(7), { k: 'hoje:+7' }),
        botao('−1 dia', () => passarDias(-1), { k: 'hoje:-1', off: dia <= 0 }),
        botao('Ir para a data…', irParaData, { k: 'hoje:ir' })));
      out.push(nota('Passar o dia não move os grupos nem muda nada sozinho.'));
    }
    // eventos
    const ativos = N_.eventosDoDia(v, dia);
    out.push(secao('Eventos de hoje', ativos.length
      ? h('div', { class: 'lista' }, ativos.map(e => itemLista(e, v, mestre, (N_.EVENTOS[e.tipo] || N_.EVENTOS.guerra).nome + ' · força ' + e.forca + (ed && e.fim != null ? ' · até ' + dataTxt(v, e.fim) : ''))))
      : nota('Nenhum evento acontecendo hoje.')));
    if (ed) {
      const breve = v.objs.filter(e => e.k === 'e' && e.ini != null && e.ini > dia && e.ini - dia <= 30).sort((a, b) => a.ini - b.ini);
      if (breve.length) out.push(secao('Nos próximos 30 dias', h('div', { class: 'lista' }, breve.map(e => itemLista(e, v, true, statusEvento(e, dia) + ' · ' + dataTxt(v, e.ini))))));
    }
    // grupos
    const grupos = v.objs.filter(o => o.k === 'g');
    const gs = [];
    if (encontro && ed && (encontro.grupo ? !!achar(v, encontro.grupo) : true)) gs.push(cartaoEncontro());
    if (!grupos.length) gs.push(nota(ed ? 'Nenhum grupo no mapa. Use a ferramenta Grupo (G) para pôr os personagens.' : 'Nenhum grupo à vista.'));
    for (const g of grupos) {
      const p = progressoTxt(v, g);
      gs.push(h('div', { class: 'gr', 'data-k': 'gr:' + g.id },
        h('button', { type: 'button', class: 'li clic', 'data-k': 'gr-li:' + g.id, onclick: () => irPara(g.id) }, icone(g, v),
          h('span', { class: 'tx' }, h('b', { text: nomeDe(g, v) }), h('small', { text: ondeEsta(v, g) }), p ? h('small', { class: 'linha2', text: p }) : null)),
        ed ? h('div', { class: 'row' },
          botao('Andar 1 dia', () => andar(g.id), { c: 'sm', k: 'gr-andar:' + g.id, off: !g.rota, title: g.rota ? 'Move o grupo pela rota, de hexágono em hexágono, e passa o dia' : 'Este grupo não tem rota' }),
          botao('Sortear encontro', () => sortearGrupo(g.id), { c: 'sm', k: 'gr-sortear:' + g.id })) : null));
    }
    // (cada "Andar 1 dia" passa o dia: com mais de um grupo viajando, todos andam juntos num dia só)
    const viajando = grupos.filter(g => g.rota).length;
    if (ed && viajando > 1) gs.push(linha(botao('Andar 1 dia com todos', andarTodos, { c: 'pri sm', k: 'gr-andar-todos', title: 'Os ' + viajando + ' grupos com rota andam e o dia passa uma vez só' })));
    if (ed && viajando) gs.push(nota(viajando > 1 ? 'Cada "Andar 1 dia" passa o dia. Com mais de um grupo viajando, "Andar 1 dia com todos" leva todos no mesmo dia.' : 'Andar 1 dia passa o dia.'));
    out.push(secao(grupos.length === 1 ? 'Onde está o grupo' : 'Grupos', gs));
    return out;
  }

  /* ---------------- aba Facções ---------------- */
  function novaFaccao() {
    if (!App.podeEditar()) return;
    let nova = null;
    App.mudar('nova facção', m => {
      const usadas = new Set(m.faccoes.map(f => (f.cor || '').toLowerCase()));
      const cor = N().CORES.find(c => !usadas.has(c.toLowerCase())) || N().CORES[m.faccoes.length % N().CORES.length];
      nova = N().faccaoNova('Nova facção', cor);
      m.faccoes.push(nova);
    });
    if (nova) { facAberta = nova.id; focarDepois = 'f:' + nova.id + ':nome'; aba = 'faccoes'; pintar(); }
  }
  async function apagarFaccao(id) {
    const m = App.mapa, f = facDe(m, id);
    if (!f) return;
    const regs = m.objs.filter(o => o.k === 'r' && o.fac === id).length, fres = m.objs.filter(o => o.k === 'f' && (o.a === id || o.b === id)).length;
    if (regs || fres) {
      const usos = [regs ? plural(regs, 'região', 'regiões') : '', fres ? plural(fres, 'frente', 'frentes') : ''].filter(Boolean).join(' e ');
      const ok = await App.confirmar({ titulo: 'Apagar a facção "' + nomeFac(f) + '"?', perigo: true, ok: 'Apagar facção',
        texto: usos + (regs + fres === 1 ? ' usa' : ' usam') + ' esta facção e vão ficar sem ela. Dá para desfazer.' });
      if (!ok || !mesmoMapa(m.id)) return;
    }
    const r = App.mudar('apagar a facção', mm => {
      mm.faccoes = mm.faccoes.filter(x => x.id !== id);
      for (const x of mm.faccoes) delete x.rel[id];
      for (const o of mm.objs) {
        if (o.k === 'r' && o.fac === id) o.fac = null;
        if (o.k === 'f') { if (o.a === id) o.a = null; if (o.b === id) o.b = null; }
      }
    });
    if (r === false) return;
    if (facAberta === id) facAberta = null;
    avisoDesfazer('Facção apagada.');
  }
  function abaFaccoes(v) {
    const ed = App.podeEditar(), mestre = App.papel === 'mestre' && !App.comoJogador, out = [h('h3', { text: 'Facções' })];
    if (ed) out.push(linha(botao('Nova facção', novaFaccao, { c: 'pri', k: 'fac:nova' })));
    if (!v.faccoes.length) {
      out.push(nota(ed ? 'Nenhuma facção ainda. Facções dão cor às regiões e lados às frentes, e guardam as relações entre elas.' : 'Nenhuma facção conhecida.'));
      return out;
    }
    if (facAberta && !facDe(v, facAberta)) facAberta = null;
    const lista = h('div', { class: 'lista' });
    for (const f of v.faccoes) {
      const regs = v.objs.filter(o => o.k === 'r' && o.fac === f.id).length;
      const sub = regs ? plural(regs, 'região', 'regiões') : 'nenhuma região';
      if (ed) {
        const aberta = facAberta === f.id;
        lista.append(h('button', { type: 'button', class: 'li clic' + (aberta ? ' aberta' : '') + (f.oculta ? ' oculto' : ''), 'data-k': 'fac:' + f.id, 'aria-expanded': String(aberta),
          onclick: () => { facAberta = aberta ? null : f.id; pintar(); } },
          h('i', { style: { background: f.cor } }), h('span', { class: 'tx' }, h('b', { text: nomeFac(f) }), h('small', { text: sub })),
          f.oculta ? h('span', { class: 'tag', text: 'escondida' }) : null));
        if (aberta) lista.append(editorFaccao(f, v));
      } else {
        const rels = Object.keys(f.rel || {}).map(k => [facDe(v, k), f.rel[k]]).filter(([g, r]) => g && r !== 'neutra');
        lista.append(h('div', { class: 'fac-pub' },
          h('div', { class: 'li' }, h('i', { style: { background: f.cor } }), h('span', { class: 'tx' }, h('b', { text: nomeFac(f) }), h('small', { text: sub })),
            mestre && f.oculta ? h('span', { class: 'tag', text: 'escondida' }) : null),
          f.txt.trim() ? h('p', { class: 'publico', text: f.txt.trim() }) : null,
          rels.length ? h('div', { class: 'tags' }, rels.map(([g, r]) => h('span', { class: 'tag ' + r, text: N().RELACOES[r] + ' com ' + nomeFac(g) }))) : null));
      }
    }
    out.push(lista);
    return out;
  }
  function editorFaccao(f, m) {
    const id = f.id, N_ = N(), outras = m.faccoes.filter(g => g.id !== id);
    const grava = (rotulo, fn) => v => App.mudar(rotulo, mm => { const x = facDe(mm, id); if (!x) return false; return fn(x, v, mm); });
    const corAtual = (f.cor || '').toLowerCase();
    return h('div', { class: 'fac-ed', 'data-k': 'fac-ed:' + id },
      campoTexto('f:' + id + ':nome', 'Nome', f.nome, grava('mudar o nome da facção', (x, v) => { x.nome = v.trim() || x.nome; }), { max: 120, ph: 'Nome da facção' }),
      h('div', { class: 'field' }, h('span', { text: 'Cor' }),
        h('div', { class: 'cores', role: 'group', 'aria-label': 'Cor da facção' },
          N_.CORES.map((c, i) => h('button', { type: 'button', class: 'cor-bt', 'data-k': 'fc:' + id + ':' + i, style: { background: c }, 'aria-pressed': String(corAtual === c.toLowerCase()),
            'aria-label': NOMES_CORES[i] || 'Cor ' + (i + 1), title: NOMES_CORES[i] || 'Cor ' + (i + 1), onclick: () => grava('mudar a cor da facção', x => { x.cor = c; })() })),
          campoCor('f:' + id + ':cor', 'Outra cor', f.cor, grava('mudar a cor da facção', (x, v) => { x.cor = v; })))),
      campoTexto('f:' + id + ':txt', 'O que os jogadores sabem', f.txt, grava('mudar o texto da facção', (x, v) => { x.txt = v; }), { area: true, linhas: 3 }),
      segredo('Só o mestre vê', campoTexto('f:' + id + ':nota', null, f.nota, grava('mudar a nota da facção', (x, v) => { x.nota = v; }), { area: true, linhas: 3, rotulo: 'Nota do mestre', ph: 'Planos, segredos…' })),
      caixa('f:' + id + ':oculta', 'Esconder dos jogadores', f.oculta, grava('esconder a facção', (x, v) => { x.oculta = !!v; }), { dica: 'Some da lista deles; as regiões ficam sem cor de facção para eles.' }),
      outras.length ? h('div', { class: 'sec' }, h('b', { text: 'Relações' }),
        outras.map(g => h('div', { class: 'rel ' + ((f.rel && f.rel[g.id]) || 'neutra') }, h('i', { style: { background: g.cor } }), h('span', { text: nomeFac(g) }),
          campoEscolha('rel:' + id + ':' + g.id, null, (f.rel && f.rel[g.id]) || 'neutra', Object.keys(N_.RELACOES).map(k => [k, N_.RELACOES[k]]),
            v => App.mudar('mudar a relação', mm => {
              const a = facDe(mm, id), b = facDe(mm, g.id);
              if (!a || !b) return false;
              if (v === 'neutra') { delete a.rel[b.id]; delete b.rel[a.id]; } else { a.rel[b.id] = v; b.rel[a.id] = v; }
            }), { rotulo: 'Relação com ' + nomeFac(g) }))),
        nota('Vale para os dois lados.')) : null,
      h('div', { class: 'row acoes' },
        botao('Apagar facção', () => apagarFaccao(id), { c: 'per sm', k: 'fac:apagar' }),
        botao('Fechar', () => { facAberta = null; pintar(); }, { c: 'sm', k: 'fac:fechar' })));
  }

  /* ---------------- aba Mapa (só o mestre) ---------------- */
  function abaMapa(m) {
    if (!m || !App.podeEditar()) return [];
    const N_ = N(), out = [h('h3', { text: 'Mapa' })];
    out.push(campoTexto('mapa:nome', 'Nome do mapa', m.nome, v => (v.trim() ? App.renomearMapa(v.trim()) : false), { max: 120 }));
    // imagem
    const img = [];
    if (m.img) {
      img.push(nota('Imagem de ' + fmt(m.img.w, 0) + ' × ' + fmt(m.img.h, 0) + ' px.'));
      img.push(linha(botao('Trocar imagem…', trocarImagem, { k: 'mapa:trocar' }),
        botao('Voltar ao papel em branco', tirarImagem, { c: 'sm', k: 'mapa:sem-img' })));
    } else {
      img.push(nota('Papel em branco. Uma imagem sua pode virar o fundo do mapa.'));
      img.push(linha(botao('Escolher imagem…', () => escolherImagem(null), { c: 'pri', k: 'mapa:img' })));
      img.push(h('div', { class: 'row' },
        campoNumero('mapa:larg', 'Largura', m.larg, n => App.mudar('mudar o tamanho do papel', mm => { mm.larg = n; }), { min: 100, max: 30000 }),
        campoNumero('mapa:alt', 'Altura', m.alt, n => App.mudar('mudar o tamanho do papel', mm => { mm.alt = n; }), { min: 100, max: 30000 })));
      img.push(nota('Em unidades do mapa (de 100 a 30.000).'));
    }
    out.push(secao('Imagem', img));
    out.push(nota('A escala do mapa é a grade de hexágonos (um hexágono = 5 cubos): fica na aba Terreno.'));
    // calendário
    const cal = m.cal, d = N_.dataDe(cal, cal.dia);
    out.push(secao('Calendário',
      nota(frase('Hoje: ' + N_.textoData(cal, cal.dia)) + ' O ano tem ' + fmt(N_.diasNoAno(cal), 0) + ' dias.'),
      h('div', { class: 'row' },
        campoNumero('mapa:ano', 'Ano de hoje', d.ano, n => App.mudar('mudar o ano', mm => { mm.cal.ano0 = n - Math.floor(mm.cal.dia / N().diasNoAno(mm.cal)); }), { min: -1e6, max: 1e6 }),
        campoTexto('mapa:era', 'Era', cal.era, v => App.mudar('mudar a era', mm => { mm.cal.era = v.trim(); }), { max: 40, ph: 'Ex.: d.C.' })),
      campoTexto('mapa:meses', 'Meses (um por linha, "Nome: dias")', cal.meses.map(x => x.nome + ': ' + x.dias).join('\n'), v => {
        const meses = lerMeses(v);
        if (!meses) { App.toast('Escreva pelo menos um mês, no formato "Nome: dias".'); return false; }
        return App.mudar('mudar os meses', mm => {
          const ano = N().dataDe(mm.cal, mm.cal.dia).ano;          // o ano de hoje continua o mesmo
          mm.cal.meses = meses;
          mm.cal.ano0 = ano - Math.floor(mm.cal.dia / N().diasNoAno(mm.cal));
        });
      }, { area: true, linhas: 6, dica: 'O mundo conta os dias desde o começo: mudar os meses pode mudar o dia e o mês de hoje, mas não o ano.' })));
    // névoa
    out.push(secao('Névoa',
      caixa('mapa:nevoa', 'Névoa ligada', m.nevoa.on, ligarNevoa,
        { dica: 'Os jogadores só veem o que você revelar com o pincel (N). Os grupos aparecem sempre.' }),
      h('div', { class: 'row' },
        botao('Pincel de névoa', () => App.usarFerramenta('n'), { c: 'sm', k: 'mapa:pincel' }),
        botao('Revelar tudo', revelarTudo, { c: 'sm', k: 'mapa:revelar' }),
        botao('Cobrir tudo', cobrirTudo, { c: 'sm', k: 'mapa:cobrir' }))));
    // jogadores (mesa)
    if (App.naMesa) {
      const mostrando = App.mostrado === m.id, comCamp = temCampanhas(), cs = comCamp ? App.campanhasDoMapa(m.id) : [];
      // (numa mesa com campanhas, "os jogadores" de um mapa de campanha são os dela)
      const quem = cs.length ? 'Os jogadores ' + App.deQuais(cs) : 'Os jogadores';
      const st = m.oculto ? 'Escondido: os jogadores não veem este mapa.' : mostrando ? quem + ' estão vendo este mapa agora.'
        : App.mostrado ? quem + ' podem abrir este mapa, mas você está mostrando outro' + (App.mostradoDeFora() ? ' (de outra campanha).' : '.') : quem + ' podem abrir este mapa. Nenhum está sendo mostrado.';
      out.push(secao('Jogadores', nota(st),
        linha(mostrando ? botao('Parar de mostrar', () => App.mostrarAosJogadores(null), { k: 'mapa:parar' })
          : botao('Mostrar aos jogadores', () => App.mostrarAosJogadores(m.id), { c: 'pri', k: 'mapa:mostrar' })),
        caixa('mapa:oculto', 'Esconder este mapa dos jogadores', m.oculto, v => App.esconderMapa(m.id, !!v)),
        comCamp ? nota(fraseDasCampanhas(cs)) : null,
        comCamp && App.organizaCampanhas() ? linha(botao('Campanhas deste mapa…', campanhasDoMapa, { c: 'sm', k: 'mapa:campanhas' })) : null));
    }
    // arquivo
    out.push(secao('Arquivo',
      h('div', { class: 'row' }, botao('Exportar (.json)', exportar, { k: 'mapa:exportar' }), botao('Importar…', importar, { k: 'mapa:importar' })),
      nota('Exportar baixa o mapa inteiro, com a imagem, para guardar ou abrir em outro lugar. Importar cria um mapa novo.'),
      linha(botao('Apagar este mapa…', apagarMapa, { c: 'per', k: 'mapa:apagar' }))));
    return out;
  }
  /* ---------------- aba Terreno (só o mestre) ---------------- */
  function abaTerreno(m) {
    if (!m || !App.podeEditar()) return [];
    const gr = m.grade, tem = temGrade(m), out = [h('h3', { text: 'Terreno' })];
    // a grade
    const gs = [];
    gs.push(campoNumero('ter:tam', 'Tamanho do hexágono (unidades do mapa)', tem ? gr.tam : '', n => App.mudar(n ? 'mudar o tamanho da grade' : 'tirar a grade', mm => { mm.grade.tam = n; }),
      { decimal: true, min: 4, max: 20000, vazio: 0, ph: 'sem grade', erro: 'Use um tamanho de 4 a 20.000 unidades (vazio: sem grade).', dica: 'De um centro ao centro vizinho. Um hexágono = 5 cubos.' }));
    gs.push(linha(botao('Medir com a régua…', medirGrade, { c: tem ? 'sm' : 'pri', k: 'ter:medir', title: 'Arraste sobre alguns hexágonos e diga quantos são (ou quantos cubos)' })));
    if (tem) {
      const passo = Math.max(0.5, Math.round(gr.tam / 10 * 10) / 10);
      const mover = (dx, dy) => App.mudar('deslocar a grade', mm => { mm.grade.x = Math.round((mm.grade.x + dx) * 100) / 100; mm.grade.y = Math.round((mm.grade.y + dy) * 100) / 100; });
      gs.push(campoEscolha('ter:orient', 'Hexágonos', gr.orient, [['pe', 'Em pé (com a ponta para cima)'], ['deitado', 'Deitados (com um lado para cima)']], v => App.mudar('virar a grade', mm => { mm.grade.orient = v; })));
      gs.push(h('div', { class: 'field' }, h('span', { text: 'Encaixar na imagem' }),
        h('div', { class: 'row setas' },
          botao('←', () => mover(-passo, 0), { c: 'sm', k: 'ter:esq', title: 'Grade para a esquerda' }), botao('→', () => mover(passo, 0), { c: 'sm', k: 'ter:dir', title: 'Grade para a direita' }),
          botao('↑', () => mover(0, -passo), { c: 'sm', k: 'ter:cima', title: 'Grade para cima' }), botao('↓', () => mover(0, passo), { c: 'sm', k: 'ter:baixo', title: 'Grade para baixo' }),
          h('small', { class: 'ajuda', text: 'cada toque: ' + fmt(passo, 1) + ' unidades' }))));
      gs.push(caixa('ter:on', 'Mostrar a grade', gr.on, v => App.mudar(v ? 'mostrar a grade' : 'esconder a grade', mm => { mm.grade.on = !!v; }),
        { dica: 'Os jogadores também a veem. Escondida, ela continua medindo as viagens e a régua.' }));
      const forcas = [['0.15', 'Bem clara'], ['0.35', 'Clara'], ['0.6', 'Forte'], ['0.9', 'Bem forte']];
      const perto = forcas.reduce((a, b) => (Math.abs(Number(b[0]) - gr.alfa) < Math.abs(Number(a[0]) - gr.alfa) ? b : a))[0];
      gs.push(campoEscolha('ter:alfa', 'Linhas da grade', perto, forcas, v => App.mudar('mudar as linhas da grade', mm => { mm.grade.alfa = Number(v); }), { off: !gr.on }));
      gs.push(nota('O mapa tem cerca de ' + fmt(m.larg / gr.tam, 0) + ' × ' + fmt(m.alt / gr.tam, 0) + ' hexágonos (' + fmt(cubos(m, m.larg), 0) + ' × ' + fmt(cubos(m, m.alt), 0) + ' cubos).'));
    } else gs.push(nota('Sem grade, o mapa não tem escala: a viagem e a régua falam em unidades do mapa. Com ela, tudo passa a ser em cubos.'));
    out.push(secao('Grade de hexágonos', gs));
    // os tipos de terreno
    const uso = new Map();
    for (const k of Object.keys(m.hexes || {})) { const v = m.hexes[k], t = typeof v === 'string' ? v : v[0]; if (t) uso.set(t, (uso.get(t) || 0) + 1); }
    const ts = m.terrenos.map(t => {
      const grava = (rot, fn) => v => App.mudar(rot, mm => { const x = mm.terrenos.find(y => y.id === t.id); if (!x) return false; return fn(x, v); });
      const custo = campoNumero('ter:' + t.id + ':custo', null, t.custo, grava('mudar o custo de ' + t.nome, (x, n) => { x.custo = n; }), { decimal: true, min: 0.1, max: 9999, erro: 'Use um custo de 0,1 a 9999 cubos.' });
      custo.setAttribute('aria-label', 'Custo de ' + t.nome + ', em cubos por hexágono');
      return h('div', { class: 'ter-linha', 'data-ter': t.id },
        campoCor('ter:' + t.id + ':cor', 'Cor de ' + t.nome, t.cor, grava('mudar a cor de ' + t.nome, (x, v) => { x.cor = v; })),
        campoTexto('ter:' + t.id + ':nome', null, t.nome, grava('renomear o terreno', (x, v) => { if (!v.trim()) return false; x.nome = v.trim(); }), { max: 40, rotulo: 'Nome do terreno' }),
        custo, h('span', { class: 'un', text: 'cubos' }),
        h('button', { type: 'button', class: 'ib', 'data-k': 'ter:' + t.id + ':x', title: 'Tirar ' + t.nome + (uso.get(t.id) ? ' (' + plHex(uso.get(t.id)) + ')' : ''), 'aria-label': 'Tirar ' + t.nome, onclick: () => tirarTerreno(t.id) }, glifo(X_SVG, 14)));
    });
    out.push(secao('Tipos de terreno',
      nota('Custo: quantos cubos se gastam para atravessar um hexágono desse terreno. Sem terreno, um hexágono custa os 5 cubos dele.'),
      ts.length ? h('div', { class: 'ter-lista' }, ts) : nota('Nenhum tipo de terreno.'),
      linha(botao('+ Tipo de terreno', novoTerreno, { c: 'sm', k: 'ter:novo', off: m.terrenos.length >= N().LIMITES.terrenos }),
        m.terrenos.length ? null : botao('Os tipos de começo', () => App.mudar('voltar aos tipos de terreno de começo', mm => { mm.terrenos = N().copia(N().TERRENOS_PADRAO); }), { c: 'sm', k: 'ter:padrao' }))));
    // pintar
    const pintados = Object.keys(m.hexes || {}).length;
    out.push(secao('Pintar',
      nota(pintados ? plHex(pintados) + ' com terreno ou custo próprio.' + [...uso].map(([id, n]) => { const t = m.terrenos.find(x => x.id === id); return t ? ' ' + t.nome + ': ' + n + '.' : ''; }).join('') : 'Nenhum hexágono pintado ainda.'),
      linha(botao('Pincel de terreno (H)', () => App.usarFerramenta('h'), { c: tem ? 'pri' : 'sm', k: 'ter:pincel', off: !tem, title: tem ? 'Arraste sobre os hexágonos para pintar' : 'Defina a grade primeiro' })),
      nota('Uma região também pode ter um custo por hexágono (Seleção → a região). O custo próprio de um hexágono vale mais que o da região, que vale mais que o do terreno.')));
    return out;
  }
  function novoTerreno() {
    let id = null;
    const feito = App.mudar('novo tipo de terreno', mm => {
      const usados = new Set(mm.terrenos.map(t => t.id));
      let n = 1; while (usados.has('t' + n)) n++;
      id = 't' + n;
      mm.terrenos.push({ id, nome: 'Terreno ' + n, cor: N().CORES[(mm.terrenos.length + 3) % N().CORES.length], custo: 5 });
    });
    if (feito !== false) focarDepois = 'ter:' + id + ':nome';
  }
  function tirarTerreno(id) {
    const t = App.mapa.terrenos.find(x => x.id === id);
    if (!t) return;
    const n = Object.values(App.mapa.hexes || {}).filter(v => (typeof v === 'string' ? v : v[0]) === id).length;
    if (App.mudar('tirar ' + t.nome, mm => { mm.terrenos = mm.terrenos.filter(x => x.id !== id); }) !== false) {
      avisoDesfazer(t.nome + ' saiu da lista.' + (n ? ' ' + (n === 1 ? 'O hexágono pintado com ele ficou' : 'Os ' + n + ' hexágonos pintados com ele ficaram') + ' sem terreno.' : ''));
    }
  }
  function lerMeses(s) {
    const meses = [];
    for (const l of String(s).split(/\r?\n/)) {
      const t = l.trim();
      if (!t) continue;
      const i = t.lastIndexOf(':'), n = i >= 0 ? parseInt(t.slice(i + 1).trim(), 10) : NaN;
      const nome = (i >= 0 && Number.isFinite(n) ? t.slice(0, i) : t).trim();
      if (!nome) continue;
      meses.push({ nome: nome.slice(0, 60), dias: Number.isFinite(n) ? Math.min(1000, Math.max(1, n)) : 30 });
    }
    return meses.length ? meses.slice(0, 100) : null;
  }
  /* Desligar a névoa mostra o mapa inteiro aos jogadores, como "Revelar tudo": pede a mesma confirmação. Ligar não
     mostra nada a ninguém (só cobre), então vai direto, com o aviso e o desfazer. */
  async function ligarNevoa(v) {
    if (!App.mapa) return;
    const idMapa = App.mapa.id;
    if (!v) {
      const ok = await App.confirmar({ titulo: 'Desligar a névoa?', ok: 'Desligar a névoa', perigo: true,
        texto: 'Sem névoa, os jogadores passam a ver o mapa inteiro (menos o que estiver escondido), inclusive o que ainda está coberto. Dá para desfazer, mas o que eles já viram não volta.' });
      if (!ok || !mesmoMapa(idMapa)) { agendar(); return; }
      if (App.mudar('desligar a névoa', mm => { if (!mm.nevoa.on) return false; mm.nevoa.on = false; }) !== false) avisoDesfazer('Névoa desligada: os jogadores veem o mapa inteiro.');
      return;
    }
    if (App.mudar('ligar a névoa', mm => { if (mm.nevoa.on) return false; mm.nevoa.on = true; }) !== false) {
      avisoDesfazer(App.mapa.nevoa.ops.some(o => o.t === '+') ? 'Névoa ligada.' : 'Névoa ligada: os jogadores só veem os grupos até você revelar com o pincel (N).');
    }
  }
  async function revelarTudo() {
    const idMapa = App.mapa && App.mapa.id;
    const ok = await App.confirmar({ titulo: 'Revelar o mapa inteiro?', ok: 'Revelar tudo', perigo: true,
      texto: 'A névoa sai de todo o mapa: os jogadores passam a ver tudo (menos o que estiver escondido). Dá para desfazer.' });
    if (!ok || !mesmoMapa(idMapa)) return;
    if (App.mudar('revelar tudo', m => { m.nevoa.ops = [{ t: '+', x: m.larg / 2, y: m.alt / 2, r: Math.hypot(m.larg, m.alt) / 2 + 2 }]; }) !== false) {
      avisoDesfazer(App.mapa.nevoa.on ? 'Mapa todo revelado.' : 'Mapa todo revelado. A névoa está desligada; ligue para valer.');
    }
  }
  async function cobrirTudo() {
    const idMapa = App.mapa && App.mapa.id;
    const ok = await App.confirmar({ titulo: 'Cobrir o mapa inteiro?', ok: 'Cobrir tudo', perigo: true,
      texto: 'Tudo o que foi revelado volta para debaixo da névoa. Os jogadores só vão ver os grupos. Dá para desfazer.' });
    if (!ok || !mesmoMapa(idMapa)) return;
    if (App.mudar('cobrir tudo', m => { if (!m.nevoa.ops.length) return false; m.nevoa.ops = []; }) !== false) avisoDesfazer('Mapa todo coberto.');
  }

  /* ================= desenho e partida ================= */
  function agendar() { if (!quadro && App) quadro = requestAnimationFrame(pintar); }
  function pintar() {
    if (quadro) { cancelAnimationFrame(quadro); quadro = 0; }
    if (!App) return;
    const id = App.mapa ? App.mapa.id : null;
    if (id !== mapaVisto) { mapaVisto = id; encontro = null; facAberta = null; busca = ''; }
    try { pintarTopo(); pintarVazio(); pintarAbas(); pintarPainel(); }
    catch (e) { console.error('MundoPainel: falhou ao desenhar o painel', e); }
  }
  function abrirAba(id) {
    if (!ABAS.some(a => a.id === id)) return;
    aba = id;
    lembrar({ aba });
    if ($('side') && $('side').classList.contains('fechado')) definirPainel(true);
    pintar();
  }
  function iniciar(app) {
    if (App) return;
    App = app;
    App.toast = toast;
    App.confirmar = confirmar;
    const u = ler();
    if (u.aba && ABAS.some(a => a.id === u.aba)) aba = u.aba;
    montarAbas();
    ligarTopo();
    ligarArquivos();
    const sd = $('side');
    if (sd) {
      sd.classList.toggle('fechado', estreito() ? true : !!u.fechado);          // no celular o painel começa fechado
      // Delete/Backspace num botão do painel não apaga o que está selecionado no mapa (a pessoa está lendo o painel)
      sd.addEventListener('keydown', ev => {
        if ((ev.key === 'Delete' || ev.key === 'Backspace') && !textual(ev.target) && ev.target.tagName !== 'SELECT') ev.stopPropagation();
      });
      // ao sair de um campo, o painel se acerta com o mapa (o que foi arrumado na gravação, como espaços)
      sd.addEventListener('focusout', agendar);
      sd.addEventListener('input', ev => { if (ev.target && ev.target._modelo !== undefined) pintarTopo(); });
    }
    window.addEventListener('beforeunload', antesDeSair);
    window.addEventListener('pagehide', antesDeSair);
    if (window.TC && TC.ponte && TC.ponte.aoFechar) TC.ponte.aoFechar(antesDeSair);     // dentro do site: a casca avisa antes de fechar
    document.addEventListener('visibilitychange', () => { if (document.hidden) antesDeSair(); });
    for (const ev of ['muda', 'sel', 'papel', 'mapas', 'salvo', 'vista']) App.on(ev, agendar);
    App.on('mapas', () => { if (menu) abrirMenu(); });
    window.addEventListener('resize', () => fecharMenu());
    pintar();
  }

  window.MundoPainel = { iniciar, abrirAba, redesenhar: pintar, seguirLiga };
})();
