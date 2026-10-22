/* Tiny Cats · Mapa-múndi · o painel.
   A barra de cima (seletor de mapas, data, "salvo", ver como jogador, desfazer, mostrar ou esconder o painel), o painel
   com as abas Seleção, Hoje, Reinos (até o lote 10, Facções), Guerra, Terreno e Mapa, o estado vazio, as janelas
   (<dialog>) e os avisos (App.toast).
   Nada aqui muda o mapa direto: tudo passa por App.mudar. Campo de texto vira UM passo de desfazer quando a pessoa
   termina de editar (change: Enter ou ao sair do campo), nunca a cada tecla.
   O painel é refeito a cada mudança, mas por cima do que já está na tela (compara e ajusta só o que mudou): quem está
   digitando não perde o foco, o cursor nem o que escreveu, e a rolagem fica onde estava. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  /* (lote 11, parte 3a) as abas em duas fileiras, por assunto: na de cima, o mapa; na de baixo, a política */
  const ABAS = [
    { id: 'selecao', nome: 'Seleção', fila: 1 },
    { id: 'hoje', nome: 'Hoje', fila: 1 },
    { id: 'terreno', nome: 'Terreno', fila: 1, mestre: true },
    { id: 'mapa', nome: 'Mapa', fila: 1, mestre: true },
    { id: 'faccoes', nome: 'Reinos', fila: 2 },                    // (lote 10: era "Facções"; o id fica)
    { id: 'corte', nome: 'Corte', fila: 2 },                      // (lote 11) os personagens do mundo e as casas
    { id: 'diplomacia', nome: 'Diplomacia', fila: 2 },            // (lote 11, parte 3a) as relações, a opinião, os tratados
    { id: 'intrigas', nome: 'Intrigas', fila: 2 },                // (lote 11, parte 4a) os segredos (4b: as intrigas)
    { id: 'guerra', nome: 'Guerra', fila: 2, mestre: true },      // (lote 8, parte 6) as batalhas, os exércitos, os tipos de tropa
  ];
  const TIPO = { m: 'Marcador', g: 'Grupo', r: 'Região', e: 'Evento', t: 'Rota', f: 'Frente', z: 'Zona de guerra', l: 'Linha', c: 'Carimbo', x: 'Texto' };
  const APAGADO = { m: 'Marcador apagado.', g: 'Grupo apagado.', r: 'Região apagada.', e: 'Evento apagado.', t: 'Rota apagada.', f: 'Frente apagada.',
    z: 'Zona de guerra apagada.', l: 'Linha apagada.', c: 'Carimbo apagado.', x: 'Texto apagado.' };
  const ORDEM = { g: 0, m: 1, e: 2, z: 3, r: 4, t: 5, f: 6, l: 7, x: 8, c: 9 };
  const PLURAL = { m: ['marcador', 'marcadores'], g: ['grupo', 'grupos'], r: ['região', 'regiões'], e: ['evento', 'eventos'], t: ['rota', 'rotas'], f: ['frente', 'frentes'],
    z: ['zona de guerra', 'zonas de guerra'], l: ['linha', 'linhas'], c: ['carimbo', 'carimbos'], x: ['texto', 'textos'] };
  const ESPACOS = [['0', 'Normal'], ['0.15', 'Aberto'], ['0.35', 'Bem aberto']];
  const TEXTO_SVG = '<path d="M5 6V4.5h14V6M12 4.5v15M9 19.5h6"/>';
  const LINHA_SVG = '<path d="M3 18c4 0 4-6 9-6s5-6 9-6"/>';
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
  const GP = () => window.MundoGuerraPainel || null;           // (lote 8, parte 6) a guerra no painel
  const RP = () => window.MundoReinoPainel || null;            // (lote 10) os reinos no painel: a província, o Livro do reino
  const CP = () => window.MundoCortePainel || null;            // (lote 11) a corte no painel: a aba Corte, quem está aqui
  const DP = () => window.MundoDiplomaciaPainel || null;       // (lote 11, parte 3a) a diplomacia no painel: a aba Diplomacia
  const IP = () => window.MundoIntrigasPainel || null;          // (lote 11, parte 4a) as intrigas e os segredos: a aba Intrigas
  const $ = id => document.getElementById(id);
  const estreito = () => !!(window.matchMedia && matchMedia(ESTREITO).matches);
  const celular = () => !!(window.matchMedia && matchMedia(CELULAR).matches);

  // estado do painel (o do mapa é do App)
  let aba = 'selecao', busca = '', facAberta = null, encontro = null, mapaVisto = null;
  let quadro = 0, chaveRolagem = '', focarDepois = null, menu = null, arqModo = null, nomeNovo = '';
  let jsonArq = null, comoChip = null;
  const abertas = new Set();                      // janelas abertas (fecha a anterior ao abrir outra)
  let propostas = null;                           // (lote 12) as propostas do tempo que passou (a fila), enquanto correm
  // (lote 12) depois das propostas do tempo que passou (o dia da campanha antes da semana), ou já, sem nenhuma
  const depoisDasPropostas = fn => { if (propostas) propostas.then(() => setTimeout(fn, 0)); else fn(); };

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
  // o desenho de um carimbo (markup fixo do núcleo), com as cores do CSS do mapa (.carimbo)
  function glifoCarimbo(markup, tam) {
    const s0 = document.createElementNS(NS, 'svg');
    for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', width: tam || 18, height: tam || 18, 'aria-hidden': 'true', focusable: 'false' })) s0.setAttribute(k, v);
    const g0 = document.createElementNS(NS, 'g');
    g0.setAttribute('class', 'carimbo');
    g0.innerHTML = markup || '';
    s0.append(g0);
    return s0;
  }
  const curto = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t);
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
  /* (lote 6) A marcha é em tempos: o dia tem tpd tempos de marcha (no calendário do mapa); o grupo anda pt cubos por
     tempo. O calendário continua contando dias: o tempo de marcha de hoje aparece só junto dos grupos. */
  const tpdDe = m => (m && m.cal && m.cal.tpd) || (N().TEMPOS_DIA || 10);
  const passoDoGrupo = (m, g) => (N().passoDe ? N().passoDe(g, tpdDe(m)) : (g.cubos || 30) / 10);
  const temposTxt = t => (t <= 0 ? 'menos de um tempo' : plural(Math.ceil(t - 1e-9), 'tempo', 'tempos'));
  // "faltam cerca de 12 tempos (1,2 dia)"
  const duracaoTxt = (m, tempos) => temposTxt(tempos) + (tempos > tpdDe(m) ? ' (' + diasTxt(tempos / tpdDe(m)) + ')' : '');
  function tempoDeHojeTxt(m) {
    const t = (m.cal && m.cal.tempo) || 0, n = tpdDe(m);
    return t > 0 ? 'Hoje o grupo já marchou ' + plural(t, 'tempo', 'tempos') + ' de ' + n + '.' : 'O dia tem ' + n + ' tempos de marcha; hoje ainda nenhum.';
  }
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
    if (n) return o.k === 'x' ? curto(n.split('\n')[0].trim() || 'Texto', 60) : n;
    const I = N().ICONES, E = N().EVENTOS;
    switch (o && o.k) {
      case 'm': return (I[o.ic] || I.cidade).nome;
      case 'g': { const TG = N().TIPOS_GRUPO || {}; return TG[o.tipo] ? TG[o.tipo].nome : 'Grupo ' + (o.sigla || ''); }
      case 'e': return (E[o.tipo] || E.guerra).nome;
      case 'r': { const f = facDaReg(m, o), p = paiDe(m, o); return p ? 'Parte de ' + nomeDe(p, m) : f && f.nome ? 'Território de ' + f.nome : 'Região sem nome'; }
      case 't': return 'Rota sem nome';
      case 'f': return 'Frente sem nome';
      case 'z': {
        const Z = (N().ZONAS || {})[o.tipo];                                 // (lote 7, parte 5c) a zona de perigo
        if (Z && o.tipo !== 'guerra') return Z.nome;
        const a = facDe(m, o.a), b = facDe(m, o.b); return a && b ? 'Guerra: ' + nomeFac(a) + ' × ' + nomeFac(b) : 'Zona de guerra';
      }
      case 'l': return ((N().LINHAS || {})[o.estilo] || { nome: 'Linha' }).nome + ' sem nome';
      case 'c': return ((N().CARIMBOS || {})[o.ic] || { nome: 'Carimbo' }).nome;
      case 'x': return 'Texto';
    }
    return 'Sem nome';
  }
  const nomeFac = f => (f && f.nome.trim()) || 'Facção sem nome';
  /* (lote 6) A facção de uma região: a dela, ou a da região de fora (o Condado sem facção é do Reino). A cor: a da região
     de dentro, se ela tem cor própria; senão a da facção; senão a dela. */
  const facDaReg = (m, o) => facDe(m, N().facDaRegiao ? N().facDaRegiao(m, o) : o.fac);
  function corDaReg(m, o) { const f = facDaReg(m, o); return o.pai && o.cor ? o.cor : f ? f.cor : o.cor || ''; }
  const paiDe = (m, o) => (o && o.pai ? achar(m, o.pai) : null);
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
      case 'g': { const r = achar(m, o.rota), TG = N_.TIPOS_GRUPO || {}; return (TG[o.tipo] ? TG[o.tipo].nome : 'Grupo') + (r ? ' · viajando' : ''); }
      case 'r': { const f = facDaReg(m, o), p = paiDe(m, o); return (p ? 'Sub-região de ' + nomeDe(p, m) : 'Província') + (f ? ' · ' + nomeFac(f) + (p && !o.fac ? ' (de ' + nomeDe(p, m) + ')' : '') : ''); }
      case 'e': return (N_.EVENTOS[o.tipo] || N_.EVENTOS.guerra).nome + ' · ' + (mestre ? statusEvento(o, m.cal.dia) : 'força ' + o.forca);
      case 't': return 'Rota · ' + (N_.VIAS[o.via] || N_.VIAS.trilha).nome;
      case 'f': { const a = facDe(m, o.a), b = facDe(m, o.b); return 'Frente' + (a || b ? ' · ' + (a ? nomeFac(a) : '?') + ' × ' + (b ? nomeFac(b) : '?') : ''); }
      case 'z': {
        if (zonaDePerigo(o)) return 'Zona de perigo · ' + N_.ZONAS[o.tipo].nome + (mestre ? ' · ' + statusZona(o, m.cal.dia) : '');
        const a = facDe(m, o.a), b = facDe(m, o.b); return 'Zona de guerra' + (a || b ? ' · ' + (a ? nomeFac(a) : '?') + ' × ' + (b ? nomeFac(b) : '?') : '') + (mestre ? ' · ' + statusZona(o, m.cal.dia) : '');
      }
      case 'l': return ((N_.LINHAS || {})[o.estilo] || { nome: 'Linha' }).nome;
      case 'c': return 'Carimbo';
      case 'x': return 'Texto' + ((N_.FONTES || {})[o.fonte] ? ' · ' + N_.FONTES[o.fonte].nome.toLocaleLowerCase('pt-BR') : '');
    }
    return '';
  }
  function statusZona(o, dia) {
    const ini = o.ini == null ? dia : o.ini;
    if (dia < ini) { const n = ini - dia; return n === 1 ? 'começa amanhã' : 'começa em ' + fmt(n, 0) + ' dias'; }
    if (o.fim != null && dia > o.fim) { const n = dia - o.fim; return n === 1 ? 'terminou ontem' : 'terminou há ' + fmt(n, 0) + ' dias'; }
    return 'acontecendo hoje';
  }
  function icone(o, m) {
    const I = N().ICONES, E = N().EVENTOS;
    switch (o.k) {
      case 'm': {
        const ic = I[o.ic] || I.cidade;
        return h('span', { class: 'ico' + (o.rumor ? ' rumor' : ''), style: o.rumor ? null : { background: o.cor || ic.cor } }, glifo(ic.svg, 15));
      }
      case 'g': {
        const TG = (N().TIPOS_GRUPO || {})[o.tipo];                // (lote 7, parte 5b) o desenho do tipo
        if (TG) return h('span', { class: 'ico', style: { background: o.cor, color: tintaSobre(o.cor) } }, glifo(TG.svg, 15));
        return h('span', { class: 'ico sigla', style: { background: o.cor, color: tintaSobre(o.cor) }, text: o.sigla || 'GR' });
      }
      case 'e': { const e = E[o.tipo] || E.guerra; return h('span', { class: 'ico', style: { background: e.cor } }, glifo(e.svg, 15)); }
      case 'r': { const c = corDaReg(m, o); return h('span', { class: 'ico reg' + (c ? '' : ' semcor') + (o.pai ? ' sub' : ''), style: c ? { background: c } : null }); }
      case 't': return h('span', { class: 'ico linha' }, glifo(ROTA_SVG, 18));
      case 'f': return h('span', { class: 'ico linha' }, glifo(FRENTE_SVG, 18));
      case 'z': {
        if (zonaDePerigo(o)) { const c = N().ZONAS[o.tipo].cor; return h('span', { class: 'ico reg', style: { background: 'repeating-linear-gradient(135deg, ' + c + ' 0 3px, rgba(0,0,0,.35) 3px 6px)' } }); }
        const a = facDe(m, o.a), b = facDe(m, o.b), ca = a ? a.cor : '#9aa3b5', cb = b ? b.cor : '#5f6675';
        return h('span', { class: 'ico reg', style: { background: 'repeating-linear-gradient(45deg, ' + ca + ' 0 4px, ' + cb + ' 4px 8px)' } });
      }
      case 'l': { const L0 = (N().LINHAS || {})[o.estilo]; return h('span', { class: 'ico linha', style: { color: o.cor || (L0 && L0.cor) || '#4f86c0' } }, glifo(LINHA_SVG, 18)); }
      case 'c': { const C0 = (N().CARIMBOS || {})[o.ic]; return h('span', { class: 'ico carimbo-ico', style: { color: o.cor || (C0 && C0.cor) || '#5d9a4e' } }, glifoCarimbo(C0 ? C0.svg : '', 18)); }
      case 'x': return h('span', { class: 'ico linha' }, glifo(TEXTO_SVG, 18));
    }
    return h('span', { class: 'ico' });
  }
  // Onde o grupo está, em palavras: a região e o lugar com nome mais perto.
  function ondeEsta(m, g) {
    const partes = [], r = N().regiaoEm(m, g.x, g.y);
    if (r) {
      const n = (r.nome || '').trim(), f = facDaReg(m, r), p = paiDe(m, r);
      partes.push((n ? 'Em ' + n : f ? 'Em território de ' + nomeFac(f) : 'Numa região sem nome') + (p ? ' (' + nomeDe(p, m) + ')' : ''));
    }
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
    // (lote 7) o campo com o foco guarda o que está escrito só enquanto isso ainda não foi gravado; já gravado, ele
    // mostra o valor do mapa — senão, ao sair dele, o texto velho seria gravado de novo por cima de um desfazer (ou de
    // uma mudança que chegou de outro aparelho)
    const segura = v === foco && textual(v) && (v._modelo === undefined || v.value !== v._modelo);
    for (const a of [...v.attributes]) if (!n.hasAttribute(a.name)) v.removeAttribute(a.name);
    for (const a of n.attributes) if (v.getAttribute(a.name) !== a.value) v.setAttribute(a.name, a.value);
    for (const p of PROPS) if (v[p] !== n[p]) v[p] = n[p];
    if (v.tagName !== 'TEXTAREA') morphFilhos(v, n, foco);                              // textarea: o texto é o value
    if (v.tagName === 'INPUT' || v.tagName === 'TEXTAREA' || v.tagName === 'SELECT') {
      if (!segura && v.value !== n.value) v.value = n.value;
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
    App.mudar(rot, m => { const d = Math.max(0, m.cal.dia + n); if (d === m.cal.dia) return false; m.cal.dia = d; m.cal.tempo = 0; });
  }
  async function irParaData() {
    if (!App.podeEditar()) return;
    const idMapa = App.mapa.id;
    const d = await escolherData('Ir para a data', App.mapa.cal.dia, { ok: 'Ir', texto: frase('Hoje é ' + dataTxt(App.mapa, App.mapa.cal.dia)) + ' Os grupos ficam onde estão.' });
    if (d == null || !mesmoMapa(idMapa)) return;
    App.mudar('ir para a data', m => { if (m.cal.dia === d) return false; m.cal.dia = d; m.cal.tempo = 0; });
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
    // (lote 8) numa camada escondida (ou travada) neste aparelho: o aviso oferece mostrar (ou destravar) e então vai
    const Cm = window.MundoCamadas;
    if (Cm && !Cm.objLivre(o)) { Cm.avisar(Cm.deObj(o), () => irPara(id)); return; }
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
      delete c.mis;                                   // (lote 9) a missão fica no original
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
    const m = App.mapa, pe = g ? N().pesoNoPonto(m, g.x, g.y) : null;          // (lote 7, parte 5a) os eventos onde o grupo está
    encontro = { grupo: g ? g.id : null, grupoNome: g ? nomeDe(g, m) : '', regiao: reg.id, regiaoNome: nomeDe(reg, m),
      r: N().sortearEncontro(reg, undefined, pe ? pe.enc : 0), causas: pe ? pe.eventos.filter(e => e.peso.enc).map(e => [N().nomeEvento(e), e.peso.enc]) : [],
      mesa: false, segredo: false, n: encontro ? encontro.n + 1 : 1 };
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
    // (lote 7, parte 5a) os eventos que mudaram a chance
    const causas = e.causas && e.causas.length ? 'Com os eventos: ' + r.base + '% da região, ' + e.causas.map(([nm, v]) => '"' + nm + '" ' + (v > 0 ? '+' : '−') + Math.abs(v) + '%').join(', ') + ' = ' + r.chance + '%.' : null;
    const pub = App.naMesa ? nomesPublicos(e) : null;
    const semNome = !pub ? null : !pub.regiao ? 'A região está escondida dos jogadores: o nome dela não vai para a mesa.'
      : pub.grupoEscondido ? 'O grupo está escondido dos jogadores: o nome dele não vai para a mesa.' : null;
    return h('div', { class: 'cartao' + (r.houve ? ' houve' : ''), role: 'status', 'data-k': 'enc:' + e.n },
      h('b', { text: titulo }),
      h('small', { text: (e.grupoNome ? e.grupoNome + ' · ' : '') + e.regiaoNome }),
      h('p', { class: 'publico', text: corpo }),
      det ? h('small', { text: det }) : null,
      causas ? h('small', { text: causas }) : null,
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
      // (lote 7) com o dia da semana (quando o mapa conta a semana) e, ao lado, o tempo de marcha de agora
      const d = N().dataDe(v.cal, v.cal.dia), longa = N().textoDataSemana(v.cal, v.cal.dia), sem = N().diaDaSemana(v.cal, v.cal.dia);
      const curta = (sem ? sem.slice(0, 3) + ' ' : '') + d.diaMes + '/' + (d.mes + 1) + '/' + d.ano;
      if (dt.dataset.t !== longa + '|' + curta) {
        dt.dataset.t = longa + '|' + curta;
        dt.replaceChildren(h('span', { class: 'dt-longa', text: longa }), h('span', { class: 'dt-curta', text: curta }));
      }
      dt.title = ed ? longa + '. Clique para ir a outra data.' : longa;
      if (ed) { dt.setAttribute('role', 'button'); dt.tabIndex = 0; dt.setAttribute('aria-label', 'Data do mundo: ' + longa + '. Ir para outra data'); }
      else { dt.removeAttribute('role'); dt.removeAttribute('tabindex'); dt.removeAttribute('aria-label'); }
      const tt = $('tempoTxt');
      if (tt) {
        // (na tela estreita, a forma curta: "· 4/10")
        const longo = '· ' + tempoTxt(v), curto = '· ' + (Math.min(tpdDe(v) - 1, Math.max(0, v.cal.tempo || 0)) + 1) + '/' + tpdDe(v);
        tt.hidden = false;
        if (tt.dataset.t !== longo) { tt.dataset.t = longo; tt.replaceChildren(h('span', { class: 't-longo', text: longo }), h('span', { class: 't-curto', text: curto })); }
        tt.title = 'O tempo de marcha de agora: o dia tem ' + tpdDe(v) + ' tempos.';
      }
      // (lote 7, parte 5c) o clima de hoje no mundo, para todos (clicar abre a aba Hoje)
      const ct = $('climaTxt');
      if (ct) {
        const c = N().climaDoDia ? N().climaDoDia(v, v.cal.dia, null) : null, def = c ? climaDef(c.k) : null;
        ct.hidden = !def;
        if (def) {
          if (ct.dataset.t !== c.k) { ct.dataset.t = c.k; ct.replaceChildren(glifo(def.svg, 14), h('span', { class: 'c-nome', text: def.nome })); }
          const cada = N().cadaDe ? N().cadaDe(v) : 0;          // (lote 9) o clima muda ao longo do dia
          ct.title = (cada > 0 ? 'O clima de agora no mundo: ' : 'O clima de hoje no mundo: ') + def.nome + (c.mao ? ' (escolhido por você)' : '') + (cada > 0 ? ' — muda aos poucos a cada ' + (cada === 1 ? 'tempo' : cada + ' tempos') : '') + '. Na aba Hoje, ' + (ed ? 'você troca o de agora e muda a tabela.' : 'o das regiões.');
          ct.setAttribute('aria-label', 'Clima de hoje: ' + def.nome + '. Abrir a aba Hoje');
        }
      }
      $('diaMenos').disabled = !ed || v.cal.dia <= 0;
      $('diaMais').disabled = !ed;
      const tm = $('tempoMais');
      if (tm) tm.disabled = !ed;
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
    on('diaMais', () => passarTempoMundo('dia'));
    on('tempoMais', () => passarTempoMundo('tempo'));
    on('climaTxt', () => abrirAba('hoje'));                // (lote 7, parte 5c) o clima de hoje: a aba Hoje
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
    const bt = a => h('button', { type: 'button', class: 'tab', role: 'tab', id: 'tab-' + a.id, 'aria-controls': 'pane', 'aria-selected': 'false', tabindex: '-1',
      onclick: () => { aba = a.id; lembrar({ aba }); pintar(); } }, h('span', { text: a.nome }), h('span', { class: 'n', hidden: true, 'aria-hidden': 'true' }));
    tabs.replaceChildren(...[1, 2].map(n => h('div', { class: 'tabs-fila', role: 'none', 'data-fila': String(n) }, ABAS.filter(a => a.fila === n).map(bt))));
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
    for (const f of tabs.querySelectorAll('.tabs-fila')) f.hidden = ![...f.children].some(b => !b.hidden);    // (parte 3a) a fileira sem aba some
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
    raiz.append(...[].concat(a === 'selecao' ? abaSelecao(v) : a === 'hoje' ? abaHoje(v) : a === 'faccoes' ? abaFaccoes(v) : a === 'corte' ? (CP() ? CP().abaCorte(v) : nota('A corte não carregou. Recarregue a página.')) : a === 'diplomacia' ? (DP() ? DP().abaDiplomacia(v) : nota('A diplomacia não carregou. Recarregue a página.')) : a === 'intrigas' ? (IP() ? IP().abaIntrigas(v) : nota('As intrigas não carregaram. Recarregue a página.')) : a === 'guerra' ? (GP() ? GP().abaGuerra(v) : nota('A guerra não carregou. Recarregue a página.')) : a === 'terreno' ? abaTerreno(App.mapa) : abaMapa(App.mapa)).filter(Boolean));
    return raiz;
  }

  /* ---------------- aba Seleção ---------------- */
  function abaSelecao(v) {
    const ids = (App.sel || []).filter(id => achar(v, id));
    // (lote 7, parte 5b) o "Traçar entre dois marcadores" aberto é do que estava escolhido: escolheu outro, ele fecha
    if (tracado && !(ids.length === 1 && ids[0] === tracado.id)) { tracado = null; previaRota(null); }
    if (!ids.length) return listaDoMapa(v);
    if (ids.length > 1) return varios(v, ids);
    const o = achar(v, ids[0]);
    return App.podeEditar() ? formulario(o, App.mapa) : leitura(o, v);
  }
  function itemLista(o, v, mestre, extra, nivel) {
    // (lote 8) o que está numa camada escondida (ou travada) neste aparelho: a etiqueta diz, e o clique avisa
    const Cm = window.MundoCamadas, cam = Cm ? Cm.deObj(o) : null, camTag = cam && !Cm.visivel(cam) ? 'camada escondida' : cam && Cm.travada(cam) ? 'camada travada' : '';
    return h('button', { type: 'button', class: 'li clic' + (mestre && o.oculto ? ' oculto' : '') + (nivel ? ' dentro' : '') + (camTag ? ' fora-cam' : ''), 'data-k': 'li:' + o.id, onclick: () => irPara(o.id),
      style: nivel ? { paddingLeft: (8 + Math.min(nivel, 6) * 16) + 'px' } : null },
      icone(o, v), h('span', { class: 'tx' }, h('b', { text: nomeDe(o, v) }), h('small', { text: extra || descricao(o, v, mestre) })),
      mestre && o.oculto ? h('span', { class: 'tag', text: 'escondido' }) : null,
      camTag ? h('span', { class: 'tag cam', title: 'A camada ' + Cm.nomeDe(cam) + (camTag === 'camada escondida' ? ' está escondida' : ' está travada') + ' neste aparelho (botão Camadas, no canto do mapa).', text: camTag }) : null);
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
    // (lote 6) sem busca, as regiões vêm em árvore: cada uma seguida das que ficam dentro dela (Reino → Condados)
    const nivelDe = new Map();
    if (!q) {
      const regs = achados.filter(o => o.k === 'r'), ids = new Set(regs.map(o => o.id)), filhas = new Map(), arv = [];
      for (const o of regs) { const pai = o.pai && ids.has(o.pai) ? o.pai : ''; if (!filhas.has(pai)) filhas.set(pai, []); filhas.get(pai).push(o); }
      const poe = (o, n) => { if (nivelDe.has(o.id)) return; nivelDe.set(o.id, n); arv.push(o); for (const c of filhas.get(o.id) || []) poe(c, n + 1); };
      for (const o of filhas.get('') || []) poe(o, 0);
      for (const o of regs) poe(o, 0);
      const i0 = achados.findIndex(o => o.k === 'r');
      if (i0 >= 0) achados.splice(i0, regs.length, ...arv);
    }
    if (!achados.length) out.push(nota('Nada com esse nome.'));
    else {
      out.push(h('div', { class: 'lista' }, achados.slice(0, MAX_LISTA).map(o => itemLista(o, v, mestre, null, nivelDe.get(o.id) || 0))));
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
    // (lote 9) a missão que o mestre mostrou
    if (o.mis) { const st = missaoDe(o); if (st) out.push(h('p', { class: 'mis-linha', 'data-k': 'ler:mis' }, glifoMissao(st.e), h('b', { text: 'Missão: ' + (st.t || 'sem nome') }), st.e !== 'ativa' ? h('span', { class: 'tag' + (st.e === 'feita' ? ' ok' : ''), text: SIT_MIS[st.e] }) : null)); }
    if (o.k === 'm' && o.rumor) out.push(h('p', null, h('span', { class: 'tag tensao', text: 'boato' }), ' ', h('small', { class: 'note', text: 'Pode ser verdade ou não.' })));
    // (lote 12, parte 12e) o lugar cercado: por quem (se eles conhecem a facção) e desde quando; a reserva e a muralha, quando a
    // facção deles cerca ou é cercada ali
    if (o.k === 'm' && o.cerco) {
      const fc = o.cerco.fac ? facDe(v, o.cerco.fac) : null, c = o.cerco;
      out.push(h('p', { class: 'note', 'data-k': 'ler:cerco' }, fc ? h('i', { class: 'bola', style: { background: fc.cor } }) : null, (fc ? ' Cercado por ' + nomeFac(fc) : ' Cercado') + ' desde ' + dataTxt(v, c.d) + '.'
        + (c.res != null ? ' Reserva de comida: ' + plural(c.res, 'dia', 'dias') + (c.hpMax ? ' · a muralha: ' + c.hp + ' de ' + c.hpMax : '') + '.' : '')));
    }
    if (o.k === 'e') {
      out.push(nota('Desde ' + dataTxt(v, o.ini == null ? v.cal.dia : o.ini) + ' · força ' + o.forca + ' de 3'));
      if (temGrade(v)) out.push(nota('Alcance hoje: cerca de ' + fmt(cubos(v, N_.raioNoDia(o, v.cal.dia)), 0) + ' cubos ao redor.'));
    }
    if (o.k === 'g') {
      out.push(nota(ondeEsta(v, o)));
      const p = progressoTxt(v, o);
      if (p) out.push(nota('Viagem: ' + p));
      const b = Array.isArray(o.bol) ? { feitas: o.bol[0], total: o.bol[1], terreno: '' } : null;
      if (b) out.push(fileiraDeBolinhas(o, b, false));
      // (lote 8, parte 6) o exército: os nomes (o comandante, as unidades e o tipo), sem os números
      if (o.tipo === 'exercito' && GP()) { const ex = GP().leituraExercito(o, v); if (ex) out.push(ex); }
      // (lote 6) a honra, com o histórico (todos veem)
      if (o.estilo) out.push(h('div', { class: 'sec' }, h('b', { text: 'Honra' }),
        h('p', { class: 'honra-pub' }, h('b', { class: 'honra-valor' + (o.honra > 0 ? ' pos' : o.honra < 0 ? ' neg' : ''), text: honraTxt(o.honra || 0) }), ' ', h('span', { class: 'note', text: (N_.HONRA || {})[o.estilo] || '' })),
        historicoHonra(o, v, false)));
    }
    if (o.k === 'r') {
      if (o.ch && climaDef(o.ch)) out.push(linhaDoClima({ k: o.ch }, 'ler:clima', 'o clima de hoje aqui'));     // (lote 7, parte 5c)
      const f = facDaReg(v, o), p = paiDe(v, o), dentro = v.objs.filter(x => x.k === 'r' && x.pai === o.id);
      if (p) out.push(nota('Parte de ' + nomeDe(p, v) + '.'));
      if (f) out.push(h('p', { class: 'note' }, h('i', { class: 'bola', style: { background: f.cor } }), ' Território de ' + nomeFac(f)));
      // (lote 12, parte 12b) a ocupada: por quem (se eles conhecem a facção) e desde quando
      if (o.ocup) { const fo = o.ocup.fac ? facDe(v, o.ocup.fac) : null; out.push(h('p', { class: 'note', 'data-k': 'ler:ocup' }, fo ? h('i', { class: 'bola', style: { background: fo.cor } }) : null, (fo ? ' Ocupada por ' + nomeFac(fo) : 'Ocupada') + ' desde ' + dataTxt(v, o.ocup.d) + '.')); }
      if (dentro.length) out.push(nota('Dentro dela: ' + dentro.map(x => nomeDe(x, v)).join(', ') + '.'));
    }
    if (o.k === 't') {
      const rh = rotaHex(v, o);
      out.push(nota((N_.VIAS[o.via] || N_.VIAS.trilha).nome + ' · ' + (rh ? plHex(rh.hexes) + ' · ' + fmt(rh.cubos, 0) + ' cubos pelo terreno' : fmt(N_.compPolilinha(o.pts), 0) + ' unidades do mapa')));
    }
    if (o.k === 'f') {
      const a = facDe(v, o.a), b = facDe(v, o.b);
      out.push(nota((a || b ? 'Entre ' + (a ? nomeFac(a) : 'lado desconhecido') + ' e ' + (b ? nomeFac(b) : 'lado desconhecido') : 'Lados desconhecidos') + (o.ativa ? ' · em combate' : ' · parada')));
    }
    if (o.k === 'z') {
      const a = facDe(v, o.a), b = facDe(v, o.b);
      out.push(nota((a || b ? 'Guerra entre ' + (a ? nomeFac(a) : 'lado desconhecido') + ' e ' + (b ? nomeFac(b) : 'lado desconhecido') : 'Guerra de lados desconhecidos') + ' · desde ' + dataTxt(v, o.ini == null ? v.cal.dia : o.ini)));
    }
    if (o.k === 'l' && temGrade(v)) out.push(nota('Cerca de ' + fmt(cubos(v, N_.compPolilinha(o.pts)), 0) + ' cubos de ponta a ponta.'));
    // (lote 10, parte 6) a cidade que o mestre abriu: o nível, a população, as construções prontas e as guildas
    if (o.k === 'm' && o.dentro && RP() && RP().leituraDentro) { const d = RP().leituraDentro(o); if (d) out.push(d); }
    if ((o.k === 'r' || o.k === 'm') && CP() && CP().secTitulos) { const s = CP().secTitulos(o, v); if (s) out.push(s); }   // (lote 11, parte 2a) os títulos de lá
    if ((o.k === 'm' || o.k === 'g') && CP()) { const q = CP().secQuemEsta(o, v); if (q) out.push(q); }    // (lote 11) quem está aqui (os conhecidos)
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
    if (o.k === 'x') out.push(campoTexto('o:' + id + ':nome', 'Texto', o.nome, grava('mudar o texto', (x, v) => { if (!v.trim()) return false; x.nome = v.replace(/\s+$/, ''); }), { area: true, linhas: 2, max: 400, ph: 'O que está escrito no mapa' }));
    else out.push(campoTexto('o:' + id + ':nome', 'Nome', o.nome, grava('mudar o nome', (x, v) => { x.nome = v.trim(); }), { max: 120, ph: nomeDe(Object.assign({}, o, { nome: '' }), m) }));
    if (o.k === 'm') out.push(secMarcador(o, grava), secMissao(o, m));      // (lote 9) a missão: o "!" no ícone
    if (o.k === 'm' && GP()) out.push(GP().secFortificacao(o, m));         // (lote 8, parte 6) a fortificação
    if (o.k === 'm' && RP()) out.push(RP().secAssentamento(o, m));          // (lote 10) o assentamento: o nível e a população
    if (o.k === 'z') out.push(...secZona(o, m, grava));
    if (o.k === 'l') out.push(secLinha(o, m, grava));
    if (o.k === 'c') out.push(secCarimbo(o, grava));
    if (o.k === 'x') out.push(secTexto(o, grava));
    if (o.k === 'g') out.push(secGrupo(o, m, grava), secDescanso(o, m), secHonra(o, m), secMissao(o, m));
    if (o.k === 'g' && o.tipo === 'exercito' && GP()) out.push(...GP().secExercito(o, m));   // (lote 8, parte 6) as unidades
    if (o.k === 'r') out.push(secRegiao(o, m, grava), GP() && GP().secOcupacao ? GP().secOcupacao(o, m) : null, RP() ? RP().secProvincia(o, m) : null, secClimaRegiao(o, m), secMissao(o, m));   // (lote 10) a província; (lote 12) a ocupação
    if (o.k === 'e') out.push(...secEvento(o, m, grava), secMissao(o, m));
    if (o.k === 't') out.push(secRota(o, m, grava));
    if (o.k === 'f') out.push(secFrente(o, m, grava));
    if (o.k === 'f' && GP()) out.push(GP().secFasesFrente(o, m));          // (lote 8, parte 6) a frente que anda
    if ((o.k === 'r' || o.k === 'm') && CP() && CP().secTitulos) { const s = CP().secTitulos(o, m); if (s) out.push(s); }   // (lote 11, parte 2a) os títulos de lá
    if ((o.k === 'm' || o.k === 'g') && CP()) { const q = CP().secQuemEsta(o, m); if (q) out.push(q); }    // (lote 11) quem está aqui
    out.push(campoTexto('o:' + id + ':txt', 'O que os jogadores sabem', o.txt, grava('mudar o que os jogadores sabem', (x, v) => { x.txt = v; }), { area: true, linhas: 3, ph: 'O que se conta por aí…' }));
    out.push(segredo('Só o mestre vê',
      campoTexto('o:' + id + ':nota', null, o.nota, grava('mudar a nota do mestre', (x, v) => { x.nota = v; }), { area: true, linhas: 3, rotulo: 'Nota do mestre', ph: 'Segredos, ganchos, o que ainda não foi revelado…' }),
      o.k === 'm' && o.rumor ? caixa('o:' + id + ':falso', 'O boato é falso', o.falso, grava('marcar o boato', (x, v) => { x.falso = !!v; }), { dica: 'Os jogadores nunca veem isto.' }) : null));
    if (o.k === 'r') out.push(secEncontros(o, grava));
    // (o grupo do mundo tem o "Os jogadores veem" lá em cima, no painel dele)
    if (!(o.k === 'g' && grupoDoMundo(o))) out.push(caixa('o:' + id + ':oculto', 'Esconder dos jogadores', o.oculto, grava('esconder dos jogadores', (x, v) => { x.oculto = !!v; }),
      { dica: 'Some do mapa dos jogadores até você mostrar.' }));
    out.push(h('div', { class: 'row acoes' },
      botao('Centralizar', () => irPara(id), { k: 'o:centrar' }),
      botao('Duplicar', () => duplicarObj(id), { k: 'o:duplicar' }),
      botao('Apagar', () => apagarObjs([id]), { c: 'per', k: 'o:apagar' })));
    return out;
  }
  /* ---------------- (lote 9) a missão no mapa ----------------
     Um marcador, um grupo, uma região ou um evento podem ter uma missão: o ícone ganha um "!" (✓ concluída, ✕ falhou).
     A missão é um texto curto ou uma missão do grupo das Fichas (o nome e a situação vêm de lá). Nasce só do mestre: ele
     mostra aos jogadores quando quiser (a ligada a uma missão ainda escondida nas Fichas só aparece depois de revelada lá). */
  const COM_MISSAO = { m: 1, g: 1, r: 1, e: 1 };
  const SIT_MIS = { ativa: 'Ativa', feita: 'Concluída', falhou: 'Falhou' };
  // a missão como ela está: { t, e, ligada, oculta (ainda escondida nas Fichas), perdida (saiu das Fichas) }
  function missaoDe(o) {
    const mi = o && o.mis;
    if (!mi) return null;
    if (mi.ref) {
      const f = App.missaoDaFicha ? App.missaoDaFicha(mi.ref) : null;
      if (!f) return { t: mi.t || '', e: 'ativa', ligada: true, perdida: true };
      return { t: f.t || mi.t || 'Missão sem título', e: f.e, ligada: true, oculta: !!f.oculta };
    }
    return { t: mi.t, e: mi.e === 'feita' || mi.e === 'falhou' ? mi.e : mi.ok ? 'feita' : 'ativa', ligada: false };
  }
  function glifoMissao(e) {
    const d = e === 'feita' ? '<path d="M7.4 12.3l3.1 3.1 6.1-6.3" stroke-width="2.6"/>' : e === 'falhou' ? '<path d="M8.4 8.4l7.2 7.2M15.6 8.4l-7.2 7.2" stroke-width="2.6"/>'
      : '<path d="M12 6.4v6.4" stroke-width="2.8"/><circle cx="12" cy="17.2" r="1.5" fill="currentColor" stroke="none"/>';
    return h('span', { class: 'mis-ico m-' + (SIT_MIS[e] ? e : 'ativa'), 'aria-hidden': 'true' }, glifo(d, 15));
  }
  function secMissao(o, m) {
    const id = o.id, mi = o.mis, out = [];
    if (!mi) {
      out.push(nota('Marque uma missão aqui: o ícone ganha um “!” no mapa.'));
      out.push(linha(botao('Marcar missão…', () => janelaMissao(id), { c: 'sm', k: 'o:' + id + ':mis' })));
      return secao('Missão', out);
    }
    const st = missaoDe(o);
    out.push(h('p', { class: 'mis-linha', 'data-k': 'o:' + id + ':mis-txt' }, glifoMissao(st.e), h('b', { text: st.t || (st.perdida ? 'A missão saiu das Fichas' : 'Missão') }),
      h('span', { class: 'tag' + (st.e === 'feita' ? ' ok' : st.e === 'falhou' ? ' tensao' : ''), text: SIT_MIS[st.e] })));
    if (st.perdida) out.push(nota('A missão ligada não está mais nas Fichas (foi excluída, ou é de outra campanha). Troque ou tire a missão.'));
    else if (st.ligada) out.push(nota('Das missões do grupo, nas Fichas: o nome e a situação vêm de lá. Concluída lá, o “!” vira ✓.'));
    out.push(caixa('o:' + id + ':mis-ver', 'Os jogadores veem a missão', !!mi.ver, v => mudarObj(id, v ? 'mostrar a missão aos jogadores' : 'esconder a missão dos jogadores', x => { if (!x.mis || !!x.mis.ver === !!v) return false; if (v) x.mis.ver = true; else delete x.mis.ver; }),
      { dica: st.perdida ? 'Sem a missão nas Fichas, nada aparece para os jogadores.' : st.oculta ? 'A missão ainda está escondida nas Fichas: o “!” só aparece para os jogadores depois que você a revelar lá.' : mi.ver ? 'O “!” aparece no mapa deles, com o nome da missão.' : 'Por enquanto, só você vê o “!” (tracejado).' }));
    out.push(h('div', { class: 'row' },
      st.ligada ? null : botao(mi.ok ? 'Reabrir' : 'Concluir (✓)', () => mudarObj(id, mi.ok ? 'reabrir a missão' : 'concluir a missão', x => { if (!x.mis) return false; if (x.mis.ok) delete x.mis.ok; else x.mis.ok = true; }), { c: 'sm', k: 'o:' + id + ':mis-ok' }),
      botao('Trocar…', () => janelaMissao(id), { c: 'sm', k: 'o:' + id + ':mis-trocar' }),
      botao('Tirar a missão', () => tirarMissao(id), { c: 'sm', k: 'o:' + id + ':mis-tirar' })));
    return secao('Missão', out);
  }
  function tirarMissao(id) {
    if (mudarObj(id, 'tirar a missão', x => { if (!x.mis) return false; delete x.mis; }) !== false) avisoDesfazer('A missão saiu daqui.');
  }
  async function janelaMissao(id) {
    const m0 = App.mapa, o0 = m0 && achar(m0, id);
    if (!o0 || !App.podeEditar()) return;
    const fichas = App.missoesDasFichas ? App.missoesDasFichas() : null, mi = o0.mis || {};
    const ops = (fichas || []).map(f => [f.id, (f.t || 'Missão sem título') + ' · ' + SIT_MIS[f.e] + (f.oculta ? ' (escondida)' : '')]);
    const campos = [];
    if (ops.length) campos.push({ id: 'modo', tipo: 'opcoes', rotulo: 'A missão', valor: mi.ref ? 'f' : 't', opcoes: [['t', 'Um texto curto'], ['f', 'Uma missão do grupo, das Fichas']] });
    campos.push({ id: 't', rotulo: 'Texto curto', tipo: 'text', valor: mi.ref ? '' : (mi.t || ''), ph: 'Ex.: Resgatar o ferreiro', max: 120 });
    if (ops.length) campos.push({ id: 'f', rotulo: 'Missão das Fichas', tipo: 'select', valor: mi.ref && ops.some(x => x[0] === mi.ref) ? mi.ref : ops[0][0], opcoes: ops });
    const dicaFichas = fichas == null ? ' (Para ligar a uma missão das Fichas, abra o mapa dentro do site, numa mesa.)' : !ops.length ? ' (As Fichas ainda não têm missão do grupo para ligar.)' : '';
    const r = await janela({ titulo: o0.mis ? 'Trocar a missão' : 'Marcar missão', ok: o0.mis ? 'Trocar' : 'Marcar',
      texto: 'O ícone de ' + nomeDe(o0, m0) + ' ganha um “!”.' + (o0.mis ? '' : ' Nasce só sua: os jogadores veem quando você mostrar.') + dicaFichas,
      campos,
      ler: v => {
        if (v.modo === 'f') { if (!v.f) throw new Error('Escolha a missão.'); return { ref: v.f }; }
        const t = String(v.t || '').trim();
        if (!t) throw new Error('Escreva a missão (um texto curto).');
        return { t };
      } });
    if (r == null || !mesmoMapa(m0.id)) return;
    mudarObj(id, o0.mis ? 'trocar a missão' : 'marcar a missão', x => {
      const ver = !!(x.mis && x.mis.ver);
      x.mis = r.ref ? { t: '', ref: r.ref } : { t: r.t, ref: null };
      if (ver) x.mis.ver = true;
    });
  }
  // (lote 9) as missões marcadas no mapa, na aba Hoje (o mestre vê todas; quem joga, as que o mestre mostrou)
  function secMissoesNoMapa(v, mestre) {
    const com = v.objs.filter(o => o.mis && COM_MISSAO[o.k]).map(o => [o, missaoDe(o)]).filter(x => x[1]);
    if (!com.length) return null;
    const peso = { ativa: 0, feita: 1, falhou: 2 };
    com.sort((a, b) => (peso[a[1].e] - peso[b[1].e]) || String(a[1].t).localeCompare(String(b[1].t), 'pt-BR'));
    return secao('Missões no mapa', h('div', { class: 'lista' }, com.map(([o, st]) => h('button', { type: 'button', class: 'li clic', 'data-k': 'mis:' + o.id, onclick: () => irPara(o.id) },
      glifoMissao(st.e), h('span', { class: 'tx' }, h('b', { text: st.t || (st.perdida ? 'A missão saiu das Fichas' : 'Missão') }),
        h('small', { text: nomeDe(o, v) + (st.e !== 'ativa' ? ' · ' + SIT_MIS[st.e].toLocaleLowerCase('pt-BR') : '') + (mestre && (!o.mis.ver || st.oculta || st.perdida) ? ' · só você vê' : '') }))))));
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
      // (lote 9) o ponto de descanso: os grupos do mundo dormem aqui
      caixa('o:' + id + ':desc', 'Ponto de descanso', !!o.desc, grava(o.desc ? 'tirar o ponto de descanso' : 'marcar como ponto de descanso', (x, v) => { if (v) x.desc = true; else delete x.desc; }),
        { dica: 'As caravanas, patrulhas e exércitos que passam por aqui dormem aqui, na hora do descanso deles. Os jogadores não veem.' }),
      campoEscolha('o:' + id + ':liga', 'Atalho', valorLiga(o.liga), opcoesLiga(o), grava('mudar o atalho', (x, v) => { x.liga = ligaDe(v); }),
        { dica: 'Para onde este marcador leva: dois cliques nele (ou o botão "Abrir") abrem a cena, o outro mapa ou o acampamento.' }),
      o.liga ? linha(botaoLiga(o)) : null,
      // (lote 7, parte 4b) sem atalho, o lugar que o ícone é (cidade, vila, ponte, floresta, montanha) pode ser gerado
      !o.liga && naCasca() && LUGAR_DO_ICONE[o.ic] ? h('div', { class: 'row' }, botao('Gerar este lugar…', () => gerarLugar(o), { c: 'sm', k: 'o:' + id + ':gerar', title: 'Abre a janela "Gerar um lugar" das Cenas, já preenchida (o terreno, a hora, o clima e o estilo daqui); ao criar, este marcador fica ligado à cena' })) : null);
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
  // (lote 7, parte 4b) o marcador ligado a uma cena que ainda não existe (o mestre fechou o gerador sem criar): gera de novo
  const aGerar = o => !!(o && o.liga && o.liga.t === 'cena' && LUGAR_DO_ICONE[o.ic] && App.podeEditar() && !cenasConhecidas().some(c => c.id === o.liga.id));
  function seguirLiga(o) {
    const l = o && o.liga;
    if (!l) return false;
    if (l.t === 'mapa') { antesDeSair(); return App.trocarMapa(l.id); }
    if (!naCasca()) { App.toast('Este atalho funciona dentro do site Tiny Cats (pela aba Mapa-múndi).'); return false; }
    if (l.t === 'acampamento') return TC.ponte.ir('acampamento');
    if (aGerar(o)) return gerarLugar(o);
    return TC.ponte.ir('cenas', { cena: l.id });
  }
  const botaoLiga = o => botao(aGerar(o) ? 'Gerar este lugar…' : textoLiga(o.liga), () => seguirLiga(o), { c: 'pri', k: 'o:' + o.id + ':seguir', title: aGerar(o) ? 'A cena deste marcador ainda não foi criada: abre a janela "Gerar um lugar" das Cenas, já preenchida' : 'Também abre com dois cliques no marcador' });
  const botaoAcampar = () => (naCasca() ? botao('Ir para o acampamento', () => TC.ponte.ir('acampamento'), { k: 'o:acampar', title: 'Abre a aba Acampamento: a fogueira, as provisões e o descanso do grupo' }) : null);
  /* ---- (lote 7, parte 4b) do Mapa-múndi para a cena: a janela "Gerar um lugar" das Cenas, já preenchida ----
     O terreno vem do hexágono (pelo desenho dele, para valer também nos terrenos que o mestre criou), o caminho da rota
     do grupo, a hora do tempo de agora (o calendário diz quando escurece), o clima dos eventos que cobrem o lugar e o
     estilo da região. Nada muda nas cenas até o mestre criar. */
  const LUGAR_DO_ICONE = { cidade: { lugar: 'cidade' }, vila: { lugar: 'vila' }, ponte: { lugar: 'encontro', op: { terreno: 'estrada', situacao: 'ponte' } }, floresta: { lugar: 'encontro', op: { terreno: 'floresta' } }, montanha: { lugar: 'encontro', op: { terreno: 'montanha' } }, porto: { lugar: 'porto' },
    // (lote 7, parte 4b-3) as ruínas: a aba Ruínas, já no lugar do ícone (a masmorra: a aba Masmorra, 4b-3c)
    ruina: { lugar: 'ruinas' }, templo: { lugar: 'ruinas', op: { tipo: 'templo' } }, torre: { lugar: 'ruinas', op: { tipo: 'torre' } }, castelo: { lugar: 'ruinas', op: { tipo: 'forte' } },
    masmorra: { lugar: 'masmorra' }, caverna: { lugar: 'ruinas', op: { tipo: 'circulo' } }, mina: { lugar: 'ruinas', op: { tipo: 'mina' } } };
  // (o desenho do hexágono → o terreno do encontro e, às vezes, a situação; lote 13: a savana e a tundra nos terrenos delas)
  const ENC_DA_TEX = { mato: ['campo'], liso: ['campo'], arvores: ['floresta'], colinas: ['campo', 'morro'], montes: ['montanha'], juncos: ['pantano'], areia: ['deserto'], neve: ['neve'], ondas: ['agua', 'navio'], pedras: ['montanha'],
    lavoura: ['campo', 'plantacao'], ruinas: ['campo'], lava: ['lava'], cristais: ['cristais'], selva: ['selva'], savana: ['savana'], tundra: ['tundra'], corrompida: ['corrompida'] };
  const VILA_DA_TEX = { arvores: 'floresta', selva: 'floresta', areia: 'areia', savana: 'areia', neve: 'neve', tundra: 'neve' };
  function terrenoNoPonto(m, x, y) { const hx = N().hexDe(m, x, y); return hx ? N().hexInfo(m, hx.q, hx.r).terreno : null; }
  /* (lote 7, parte 5a) o que os eventos de hoje levam para a cena: o clima (a tempestade e a inundação, chuva; o incêndio,
     a erupção e os meteoros, cinzas; o inverno, neve; a assombração, neblina; a magia e o reino secreto, vaga-lumes), a
     hora (o eclipse escurece; a lua de sangue faz noite, se for de dia), as zonas que cobrem a cena (a Lua de sangue, a
     Névoa de espíritos) e o chão seco (a seca) — N().cenaNoPonto */
  function horaComEventos(h0, c) { return c.hora === 'breu' ? 'breu' : c.hora === 'noite' && (h0 === 'dia' || h0 === 'entardecer') ? 'noite' : h0; }
  // o estilo da região mais de dentro que tiver um (subindo pelas de fora dela)
  function estiloNoPonto(m, x, y) {
    for (const r of N().regioesEm(m, x, y)) { let o = r, n = 0; while (o && n < 12) { if (o.estilo) return o.estilo; o = o.pai ? achar(m, o.pai) : null; n++; } }
    return '';
  }
  // (lote 13, parte 13c) a estação do mês de hoje no calendário (no Inverno rigoroso, inverno)
  const estacaoNoPonto = (m, c) => (c.eventos.some(e => e && e.tipo === 'inverno') ? 'inverno' : N().estacaoDoMes(N().dataDe(m.cal, m.cal && m.cal.dia).mes, N().mesesDe(m.cal).length));
  const comum = (m, x, y) => {
    const e = estiloNoPonto(m, x, y), c = N().cenaNoPonto(m, x, y), out = { hora: horaComEventos(N().horaDoTempo(m.cal), c), clima: c.clima, estacao: estacaoNoPonto(m, c) };
    // (lote 7, parte 5c) sem clima de evento, o clima do dia (o da região, ou o do mundo)
    if (!out.clima && N().climaNoPonto) { const cl = N().CLIMAS[N().climaNoPonto(m, x, y).k]; if (cl && cl.cena) out.clima = cl.cena; }
    if (e) out.estilo = e;
    if (c.fx.length) out.fx = c.fx;
    if (c.seco) out.seco = true;
    if (c.eventos.length) out.eventos = c.eventos.map(x => N().nomeEvento(x)).slice(0, 6);
    return out;
  };
  /* (lote 14, parte 14a) o hexágono do ponto (N().hexParaCena: o terreno dele e dos seis vizinhos, os rios e os
     caminhos que passam por ele) e a Região livre já preenchida com ele: o bioma, o rio (se o mapa tem) e o caminho
     (o tipo do mapa; sem caminho no mapa, nenhum) — a janela abre no Encontro e a aba Região livre também vem pronta */
  function doHexagono(m, x, y) {
    const hx = N().hexDe(m, x, y), hex = hx && N().hexParaCena ? N().hexParaCena(m, hx.q, hx.r) : null;
    if (!hex) return null;
    const out = { hex };
    if (hex.ter && hex.ter !== 'agua') out.ops = { regiao: { bioma: hex.ter, agua: hex.rios.length ? 'rio' : 'nenhuma', caminho: hex.caminhos.some(c => c.t === 'estrada') ? 'estrada' : hex.caminhos.length ? 'trilha' : 'nenhum' } };
    return out;
  }
  // "Gerar a cena aqui": um encontro onde o grupo está
  function gerarAqui(g) {
    const m = App.mapa;
    if (!m || !naCasca() || !App.podeEditar()) return false;
    const ter = terrenoNoPonto(m, g.x, g.y), rt = g.rota ? achar(m, g.rota) : null, via = rt ? rt.via : '', hx = doHexagono(m, g.x, g.y);
    let op;
    // (lote 7, parte 4b-3) no terreno Ruínas, fora do mar e do rio: a aba Ruínas
    if (ter && ter.tex === 'ruinas' && via !== 'mar' && via !== 'rio') return TC.ponte.ir('cenas', { gerar: Object.assign({ lugar: 'ruinas', op: { terreno: 'campo' } }, comum(m, g.x, g.y), hx) });
    if (via === 'mar') op = { terreno: 'agua', situacao: 'navio' };
    else if (via === 'rio') op = { terreno: 'agua', situacao: 'barco' };
    else {
      const e = ENC_DA_TEX[(ter && ter.tex) || ''] || null, cam = via === 'estrada' ? 'estrada' : via === 'trilha' ? 'trilha' : 'nenhum';
      let terreno = e ? e[0] : (cam !== 'nenhum' ? 'estrada' : 'campo');
      if (terreno === 'campo' && cam !== 'nenhum' && !(e && e[1])) terreno = 'estrada';
      op = { terreno, situacao: e && e[1] && terreno === e[0] ? e[1] : 'surpresa', caminho: terreno === 'estrada' && cam === 'nenhum' ? 'trilha' : cam };
    }
    return TC.ponte.ir('cenas', { gerar: Object.assign({ lugar: 'encontro', op }, comum(m, g.x, g.y), hx) });
  }
  // "Gerar este lugar…": o lugar do ícone do marcador; o marcador fica ligado à cena que vai nascer (um passo de desfazer)
  function gerarLugar(o) {
    const m = App.mapa, def = LUGAR_DO_ICONE[o.ic];
    if (!m || !def || !naCasca() || !App.podeEditar()) return false;
    let id = o.liga && o.liga.t === 'cena' ? o.liga.id : null;
    if (!id) {
      id = 'cena_mundo_' + Math.random().toString(36).slice(2, 10);
      if (mudarObj(o.id, 'ligar o marcador à cena gerada', x => { x.liga = { t: 'cena', id, nome: (x.nome || '').trim() }; }) === false) return false;
    }
    const op = Object.assign({}, def.op || null);
    if (def.lugar === 'encontro') op.caminho = 'nenhum';
    else { const ter = terrenoNoPonto(m, o.x, o.y); op.terreno = VILA_DA_TEX[(ter && ter.tex) || ''] || 'campo'; }
    const nome = (o.nome || '').trim();
    return TC.ponte.ir('cenas', { cena: id, gerar: Object.assign({ lugar: def.lugar, op }, nome ? { nome } : null, comum(m, o.x, o.y)) });
  }
  function setasNaGrade(ev) {
    const bs = [...this.querySelectorAll('button')], i = bs.indexOf(document.activeElement), col = 6;
    if (i < 0) return;
    const j = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + col, ArrowUp: i - col, Home: 0, End: bs.length - 1 }[ev.key];
    if (j == null) return;
    ev.preventDefault(); ev.stopPropagation();
    if (j >= 0 && j < bs.length) bs[j].focus();
  }
  // (lote 6) as bolinhas da travessia, no painel: botões para o mestre (marcar até ali), só a fileira para quem joga
  function fileiraDeBolinhas(o, b, mestre) {
    const n = Math.min(b.total, 24), cor = o.cor || '#e6ab4f';
    const bols = Array.from({ length: n }, (_, i) => {
      const feita = i < b.feitas, attrs = { class: 'bol-bt' + (feita ? ' feita' : ''), style: { borderColor: cor, background: feita ? cor : null } };
      if (!mestre) return h('span', attrs);
      // clicar na última cheia a esvazia; em qualquer outra, marca até ela
      const alvo = i + 1 === b.feitas ? i : i + 1;
      return h('button', Object.assign(attrs, { type: 'button', 'data-k': 'o:' + o.id + ':bol:' + (i + 1), 'aria-pressed': String(feita),
        title: alvo < i + 1 ? 'Desmarcar este tempo' : 'Marcar ' + plural(alvo, 'tempo andado', 'tempos andados') + ' nesta travessia', 'aria-label': 'Tempo ' + (i + 1) + ' de ' + b.total,
        onclick: () => ajustarMarcha(o.id, { bolinha: alvo }, 'marcar a travessia') }));
    });
    return h('div', { class: 'bolinhas-linha' },
      h('span', { class: 'note', text: 'Atravessando' + (b.terreno ? ' (' + b.terreno + ')' : '') + ': ' + b.feitas + ' de ' + b.total + ' tempos' }),
      h('span', { class: 'bols', role: 'group', 'aria-label': 'Tempos de marcha desta travessia: ' + b.feitas + ' de ' + b.total }, bols),
      b.total > n ? h('small', { class: 'note', text: '(mostrando ' + n + ' de ' + b.total + ')' }) : null);
  }
  /* ---------------- a honra do grupo (lote 6) ----------------
     O estilo (sem estilo, o grupo não mostra honra), − e + (lote 8: de −10 a +10) e o motivo, que vai para o histórico junto da
     data do mundo. Todos veem a honra e o histórico. O motivo escrito fica guardado aqui até a próxima mudança. */
  const honraTxt = v => (v > 0 ? '+' + v : v < 0 ? '−' + -v : '0');
  const maxHonra = () => (N().LIMITES && N().LIMITES.honra) || 10;
  function campoMotivo(k, ref, dica) {
    return h('label', { class: 'field motivo' }, h('span', { text: 'Motivo (opcional)' }),
      h('input', { class: 'in', type: 'text', 'data-k': k, value: ref.txt, maxlength: (N().LIMITES && N().LIMITES.motivo) || 200, placeholder: dica, autocomplete: 'off',
        oninput: function () { ref.txt = this.value; } }));
  }
  const motivoHonra = { id: null, txt: '' };
  function secHonra(o, m) {
    const N_ = N(), id = o.id, v = o.honra || 0, max = (N_.LIMITES && N_.LIMITES.honra) || 5, out = [];
    if (motivoHonra.id !== id) { motivoHonra.id = id; motivoHonra.txt = ''; }
    out.push(campoEscolha('o:' + id + ':estilo', 'Estilo', o.estilo || '', [['', 'Sem honra no mapa']].concat(Object.keys(N_.HONRA || {}).map(k => [k, N_.HONRA[k]])),
      e => mudarObj(id, e ? 'mudar o estilo da honra' : 'tirar a honra do mapa', x => { if ((x.estilo || '') === e) return false; x.estilo = e; }),
      { dica: 'O ícone junto do grupo, no mapa: mais enfeitado quanto maior a honra; rachado e escuro quando negativa.' }));
    if (!o.estilo) {
      out.push(nota('Escolha um estilo para o grupo mostrar a honra no mapa (de −' + max + ' a +' + max + ').'));
      return secao('Honra', out);
    }
    out.push(h('div', { class: 'row honra-linha' },
      botao('−', () => mudarHonraDo(id, v - 1), { c: 'sm', k: 'o:honra-menos', off: v <= -max, title: 'Baixa a honra em 1' }),
      h('b', { class: 'honra-valor' + (v > 0 ? ' pos' : v < 0 ? ' neg' : ''), 'data-k': 'o:honra', text: honraTxt(v), title: 'Honra de −' + max + ' a +' + max }),
      botao('+', () => mudarHonraDo(id, v + 1), { c: 'sm', k: 'o:honra-mais', off: v >= max, title: 'Sobe a honra em 1' })),
      campoMotivo('o:honra-motivo', motivoHonra, 'Ex.: salvaram a vila'));
    out.push(historicoHonra(o, m, true));
    return secao('Honra', out);
  }
  function mudarHonraDo(id, para) {
    if (!App.podeEditar()) return;
    const mot = motivoHonra.id === id ? motivoHonra.txt.trim() : '';
    let de = 0;
    const ok = App.mudar(para > ((achar(App.mapa, id) || {}).honra || 0) ? 'subir a honra' : 'baixar a honra', mm => {
      const g = achar(mm, id);
      if (!g) return false;
      de = g.honra || 0;
      return N().mudarHonra(g, para, mm.cal.dia, mot) ? undefined : false;
    });
    if (ok !== false) { motivoHonra.txt = ''; avisoDesfazer('Honra ' + honraTxt(de) + ' → ' + honraTxt(Math.max(-maxHonra(), Math.min(maxHonra(), para))) + (mot ? ' (' + mot + ')' : '') + '.'); }
  }
  // O histórico da honra, do mais novo para o mais antigo. O mestre corrige o motivo de uma linha ou a tira.
  let honraTudo = null;
  function historicoHonra(o, m, mestre) {
    const hs = Array.isArray(o.hhist) ? o.hhist : [], n = hs.length;
    if (!n) return nota(mestre ? 'Cada mudança fica no histórico, com a data do mundo e o motivo. Os jogadores também veem.' : 'A honra ainda não mudou.');
    const tudo = honraTudo === o.id, mostrar = tudo ? n : Math.min(n, 6), lista = h('ol', { class: 'hist honra-hist', reversed: true });
    for (let i = n - 1; i >= n - mostrar; i--) {
      const e = hs[i];
      lista.append(h('li', { 'data-k': 'hh:' + i },
        h('span', { class: 'quando', text: dataTxt(m, e.d) }),
        h('span', { class: 'mud ' + (e.para > e.de ? 'pos' : 'neg'), text: honraTxt(e.de) + ' → ' + honraTxt(e.para) }),
        e.mot ? h('span', { class: 'mot', text: e.mot }) : null,
        mestre ? h('span', { class: 'acoes' },
          botao('Motivo…', () => motivoDaHonra(o.id, i), { c: 'sm lnk', k: 'hh:' + i + ':mot', title: 'Escrever ou corrigir o motivo desta mudança' }),
          h('button', { type: 'button', class: 'ib', 'data-k': 'hh:' + i + ':x', title: 'Tirar esta linha do histórico (a honra não muda)', 'aria-label': 'Tirar esta linha do histórico', onclick: () => tirarDaHonra(o.id, i) }, glifo(X_SVG, 12))) : null));
    }
    return h('div', { class: 'sec-hist' }, h('small', { class: 'note', text: 'Histórico' + (mestre ? ' (os jogadores também veem)' : '') }), lista,
      n > 6 ? botao(tudo ? 'Mostrar só as últimas' : 'Mostrar todas (' + n + ')', () => { honraTudo = tudo ? null : o.id; pintar(); }, { c: 'sm lnk', k: 'hh:tudo' }) : null);
  }
  async function motivoDaHonra(id, i) {
    const g0 = achar(App.mapa, id), e = g0 && g0.hhist && g0.hhist[i];
    if (!e) return;
    const idMapa = App.mapa.id;
    const mot = await janela({ titulo: 'O motivo', texto: dataTxt(App.mapa, e.d) + ': honra ' + honraTxt(e.de) + ' → ' + honraTxt(e.para) + '.', ok: 'Gravar',
      campos: [{ id: 'mot', rotulo: 'Motivo', valor: e.mot, max: (N().LIMITES && N().LIMITES.motivo) || 200, ph: 'Ex.: salvaram a vila' }], ler: v => v.mot.trim() });
    if (mot == null || !mesmoMapa(idMapa)) return;
    mudarObj(id, 'mudar o motivo da honra', x => { const y = x.hhist && x.hhist[i]; if (!y || y.mot === mot) return false; y.mot = mot; });
  }
  function tirarDaHonra(id, i) {
    const ok = mudarObj(id, 'tirar uma linha do histórico da honra', x => { if (!x.hhist || !x.hhist[i]) return false; x.hhist.splice(i, 1); });
    if (ok !== false) avisoDesfazer('Linha tirada do histórico (a honra continua ' + honraTxt((achar(App.mapa, id) || {}).honra || 0) + ').');
  }
  /* ---------------- o painel da facção (lote 6) ----------------
     Recursos (uma lista livre: nome e número), população e apoio geral (%). Cada mudança nos números entra sozinha no
     histórico, com a data do mundo e o motivo escrito (no mesmo dia e com o mesmo motivo, numa linha só). Tudo começa
     só com o mestre: a caixa "Jogadores veem" de cada linha mostra aquilo a eles. */
  const motivoFac = { id: null, txt: '' };
  const numTxt = v => (v == null ? '—' : fmt(v, Number.isInteger(v) ? 0 : 2));
  function nomeDoCampo(f, x) { return x[0] === 'pop' ? 'População' : x[0] === 'apoio' ? 'Apoio' : (x[1] || 'Recurso'); }
  function mudancaTxt(f, x) {
    const de = x[2], para = x[3], pc = x[0] === 'apoio' ? '%' : '';
    if (de == null) return nomeDoCampo(f, x) + ': ' + numTxt(para) + pc + (x[0].slice(0, 2) === 'r:' ? ' (novo)' : '');
    if (para == null) return nomeDoCampo(f, x) + (x[0].slice(0, 2) === 'r:' ? ': saiu (' + numTxt(de) + ')' : ': ' + numTxt(de) + pc + ' → —');
    return nomeDoCampo(f, x) + ': ' + numTxt(de) + pc + ' → ' + numTxt(para) + pc;
  }
  function secNumerosFac(f, m) {
    const id = f.id, out = [], lim = (N().LIMITES && N().LIMITES.recursos) || 40;
    if (motivoFac.id !== id) { motivoFac.id = id; motivoFac.txt = ''; }
    const mot = () => (motivoFac.id === id ? motivoFac.txt.trim() : '');
    const mudar = (rot, fn) => App.mudar(rot, mm => { const x = facDe(mm, id); if (!x) return false; return fn(x, mm) === false ? false : undefined; });
    const numero = (campo, rot) => n => mudar(rot, (x, mm) => N().facMudar(x, campo, n, mm.cal.dia, mot()));
    // a caixa "os jogadores veem" (nas linhas da tabela, sem o texto: ele está no alto da coluna)
    const verCaixa = (k, marcado, rot, fn, comTexto) => h('label', { class: 'chk ver', title: 'Os jogadores veem ' + rot },
      h('input', { type: 'checkbox', 'data-k': k, checked: !!marcado, 'aria-label': 'Os jogadores veem ' + rot, _gravar: v => mudar((v ? 'mostrar ' : 'esconder ') + rot + ' aos jogadores', x => fn(x, !!v)), onchange: mudaEscolha }),
      comTexto ? h('span', { text: 'Jogadores veem' }) : null);
    // (lote 10, parte 6) com a economia ligada, o estoque não segue a caixa: a facção dos jogadores mostra tudo; as outras, nada
    const verFixo = (k, rot) => h('label', { class: 'chk ver fixo', title: f.jog ? 'Os jogadores veem todo o estoque da facção deles' : 'Os jogadores não veem a economia das outras facções' },
      h('input', { type: 'checkbox', 'data-k': k, checked: !!f.jog, disabled: true, 'aria-label': (f.jog ? 'Os jogadores veem ' : 'Os jogadores não veem ') + rot }));
    out.push(campoMotivo('f:' + id + ':motivo', motivoFac, 'Ex.: a batalha de Brenn'),
      h('small', { class: 'ajuda', text: 'Cada número que você mudar entra no histórico com a data de hoje e este motivo.' }));
    // os recursos
    const doMundo = new Set(m.eco ? m.eco.rec.map(r => r.id) : []);          // (lote 10) os recursos do mundo: o nome e a lista são da economia
    const eco = m.eco && m.eco.on ? m.eco : null, Rn = window.MundoReino;
    // (pente fino) o número só desta facção com o mesmo nome de um recurso do mundo: dá para juntar ao estoque dele
    const nomeMundo = nome => (eco ? eco.rec.find(w => semAcento(w.nome).trim() === semAcento(nome).trim()) || null : null);
    const juntar = async rid => {
      const r = f.rec.find(x => x.id === rid), w = r && nomeMundo(r.nome), fw = w && f.rec.find(x => x.id === w.id), n0 = fw ? Number(fw.n) || 0 : 0;
      if (!r || !w || !Rn) return;
      const ok = await confirmar({ titulo: 'Juntar “' + r.nome + '” ao estoque de ' + w.nome + '?', ok: 'Juntar',
        texto: '“' + r.nome + '” (' + fmt(r.n, 2) + ') soma no estoque de ' + w.nome + ' (' + fmt(n0, 2) + '): fica ' + fmt(n0 + (Number(r.n) || 0), 2) + '. O histórico de “' + r.nome + '” vai junto. Dá para desfazer.' });
      if (!ok || !mesmoMapa(m.id)) return;
      let res = null;
      if (App.mudar('juntar ' + r.nome + ' ao estoque de ' + w.nome, mm => { res = Rn.juntarAoMundo(mm, id, rid, mot()); if (!res) return false; }) !== false && res) avisoDesfazer('“' + r.nome + '” entrou no estoque de ' + w.nome + ': ' + fmt(res.para, 2) + '.');
    };
    const linhaDe = r => {
      if (doMundo.has(r.id)) {
        const n0 = campoNumero('f:' + id + ':r:' + r.id + ':n', null, r.n, numero('r:' + r.id, 'mudar ' + (r.nome || 'o recurso')), { decimal: true, min: -1e12, max: 1e12, erro: 'Use um número.' });
        n0.setAttribute('aria-label', 'Quanto ' + (r.nome || 'o recurso'));
        return h('div', { class: 'rec-linha rec-mundo', 'data-rec': r.id }, h('span', { class: 'rot', title: 'Um recurso do mundo (o nome e a lista ficam na economia, na aba Reinos)', text: r.nome }), n0,
          eco ? verFixo('f:' + id + ':r:' + r.id + ':ver', r.nome || 'o recurso')
            : verCaixa('f:' + id + ':r:' + r.id + ':ver', r.ver, r.nome || 'o recurso', (x, v) => { const y = x.rec.find(z => z.id === r.id); if (!y || y.ver === v) return false; y.ver = v; }), h('span'));
      }
      const nome = campoTexto('f:' + id + ':r:' + r.id + ':nome', null, r.nome, v => mudar('renomear o recurso', x => { const y = x.rec.find(z => z.id === r.id); if (!y || !v.trim() || y.nome === v.trim()) return false; y.nome = v.trim(); }), { max: 60, rotulo: 'Nome do recurso' });
      const n = campoNumero('f:' + id + ':r:' + r.id + ':n', null, r.n, numero('r:' + r.id, 'mudar ' + (r.nome || 'o recurso')), { decimal: true, min: -1e12, max: 1e12, erro: 'Use um número.' });
      n.setAttribute('aria-label', 'Quanto ' + (r.nome || 'o recurso'));
      const linhaR = h('div', { class: 'rec-linha', 'data-rec': r.id }, nome, n,
        verCaixa('f:' + id + ':r:' + r.id + ':ver', r.ver, r.nome || 'o recurso', (x, v) => { const y = x.rec.find(z => z.id === r.id); if (!y || y.ver === v) return false; y.ver = v; }),
        h('button', { type: 'button', class: 'ib', 'data-k': 'f:' + id + ':r:' + r.id + ':x', title: 'Tirar ' + (r.nome || 'o recurso'), 'aria-label': 'Tirar ' + (r.nome || 'o recurso'),
          onclick: () => mudar('tirar ' + (r.nome || 'o recurso'), (x, mm) => N().facTirarRecurso(x, r.id, mm.cal.dia, mot())) }, glifo(X_SVG, 14)));
      const w = nomeMundo(r.nome);
      return w ? [linhaR, h('div', { class: 'rec-junta', 'data-k': 'f:' + id + ':r:' + r.id + ':junta' }, h('small', { text: 'Mesmo nome de ' + w.nome + ', um recurso do mundo.' }),
        botao('Juntar ao estoque…', () => juntar(r.id), { c: 'sm', k: 'f:' + id + ':r:' + r.id + ':juntar' }))] : linhaR;
    };
    if (eco) {
      // (pente fino) com a economia ligada: o estoque (os recursos do mundo) em cima; os números só desta facção embaixo
      const mundo = eco.rec.map(w => f.rec.find(r => r.id === w.id)).filter(Boolean), proprios = f.rec.filter(r => !doMundo.has(r.id));
      out.push(h('div', { class: 'sec-sub' },
        h('div', { class: 'rec-linha rec-cab', 'aria-hidden': 'true' }, h('span', { text: 'Estoque (recursos do mundo)' }), h('span', { text: 'Quanto' }), h('span', { class: 'ver-cab', text: 'Jogadores veem' }), h('span')),
        mundo.length ? h('div', { class: 'rec-lista', 'data-k': 'f:' + id + ':estoque' }, mundo.map(linhaDe)) : nota('Nenhum recurso do mundo nesta facção ainda.'),
        // (parte 6) quem vê o estoque
        h('p', { class: 'note', 'data-k': 'f:' + id + ':estoque-ver', text: f.jog ? 'Os jogadores veem todo o estoque e a produção desta facção (a deles), com de onde vem, no Livro do reino deles.'
          : 'Os jogadores não veem o estoque nem a produção desta facção: da economia, só os da facção deles.' }),
        h('small', { class: 'note rec-outros-rot', 'data-k': 'f:' + id + ':outros-rot', text: 'Outros números desta facção' }),
        proprios.length ? h('div', { class: 'rec-lista', 'data-k': 'f:' + id + ':outros' }, proprios.map(linhaDe)) : nota('Nenhum: soldados, favores, segredos… o que só esta facção conta.'),
        linha(botao('+ Outro número', () => novoRecurso(id), { c: 'sm', k: 'f:' + id + ':rec-novo', off: f.rec.length >= lim })),
        nota('Um recurso que todas as facções têm (como ' + (eco.rec[0] ? eco.rec[0].nome : 'a moeda') + ') se cria na Economia do mundo, aqui na aba Reinos.')));
    } else {
      const linhas = f.rec.map(linhaDe);
      out.push(h('div', { class: 'sec-sub' },
        h('div', { class: 'rec-linha rec-cab', 'aria-hidden': 'true' }, h('span', { text: 'Recursos' }), h('span', { text: 'Quanto' }), h('span', { class: 'ver-cab', text: 'Jogadores veem' }), h('span')),
        linhas.length ? h('div', { class: 'rec-lista' }, linhas) : nota('Nenhum ainda: ouro, comida, soldados, magia…'),
        linha(botao('+ Recurso', () => novoRecurso(id), { c: 'sm', k: 'f:' + id + ':rec-novo', off: f.rec.length >= lim }))));
    }
    // população e apoio ((pente fino) com a economia ligada, a população é a soma dos assentamentos da facção: só para ler)
    const pop = eco && Rn ? h('span', { class: 'num-calc', 'data-k': 'f:' + id + ':pop', title: 'A soma das pessoas dos assentamentos das regiões desta facção', text: fmt(Rn.populacaoDaFaccao(m, id), 0) })
      : campoNumero('f:' + id + ':pop', null, f.pop, numero('pop', 'mudar a população'), { min: 0, max: 1e12, vazio: null, ph: '—', erro: 'Use um número de pessoas (vazio: sem número).' });
    pop.setAttribute('aria-label', 'População');
    const apoio = campoNumero('f:' + id + ':apoio', null, f.apoio, numero('apoio', 'mudar o apoio'), { min: 0, max: 100, vazio: null, ph: '—', erro: 'Use um apoio de 0 a 100% (vazio: sem número).' });
    apoio.setAttribute('aria-label', 'Apoio geral, em %');
    out.push(h('div', { class: 'rec-lista' },
      h('div', { class: 'rec-linha' }, h('span', { class: 'rot', text: 'População' }), pop, verCaixa('f:' + id + ':ver-pop', f.ver.pop, 'a população', (x, v) => { if (x.ver.pop === v) return false; x.ver.pop = v; }), h('span')),
      h('div', { class: 'rec-linha' }, h('span', { class: 'rot', text: 'Apoio geral (%)' }), apoio, verCaixa('f:' + id + ':ver-apoio', f.ver.apoio, 'o apoio', (x, v) => { if (x.ver.apoio === v) return false; x.ver.apoio = v; }), h('span'))));
    if (eco && Rn) out.push(nota('Com a economia ligada, a população da facção é a soma das pessoas dos assentamentos das regiões dela (mude em cada assentamento, em "População…").'));
    // o histórico
    out.push(h('div', { class: 'row hist-cab' }, h('small', { class: 'note', text: 'Histórico' }),
      verCaixa('f:' + id + ':ver-hist', f.ver.hist, 'o histórico', (x, v) => { if (x.ver.hist === v) return false; x.ver.hist = v; }, true)));
    out.push(historicoFac(f, m, true));
    return secao('Recursos e números', out);
  }
  let facTudo = null;
  const histAberto = new Set();               // os históricos de facção que quem joga deixou abertos
  function historicoFac(f, m, mestre) {
    const hs = Array.isArray(f.hist) ? f.hist : [], n = hs.length;
    if (!n) return nota(mestre ? 'Nada ainda. As mudanças nos números entram aqui sozinhas.' : 'Nada ainda.');
    const tudo = facTudo === f.id, mostrar = tudo ? n : Math.min(n, 8), lista = h('ol', { class: 'hist fac-hist', reversed: true });
    for (let i = n - 1; i >= n - mostrar; i--) {
      const e = hs[i];
      lista.append(h('li', { 'data-k': 'fh:' + i },
        h('span', { class: 'quando', text: dataTxt(m, e.d) }),
        e.mot ? h('span', { class: 'mot', text: e.mot }) : null,
        h('span', { class: 'mud', text: e.mud.map(x => mudancaTxt(f, x)).join(' · ') }),
        mestre ? h('span', { class: 'acoes' },
          botao('Motivo…', () => motivoDaFac(f.id, i), { c: 'sm lnk', k: 'fh:' + i + ':mot', title: 'Escrever ou corrigir o motivo' }),
          h('button', { type: 'button', class: 'ib', 'data-k': 'fh:' + i + ':x', title: 'Tirar esta linha do histórico (os números não mudam)', 'aria-label': 'Tirar esta linha do histórico', onclick: () => tirarDaFac(f.id, i) }, glifo(X_SVG, 12))) : null));
    }
    return h('div', { class: 'sec-hist' }, lista,
      n > 8 ? botao(tudo ? 'Mostrar só as últimas' : 'Mostrar todas (' + n + ')', () => { facTudo = tudo ? null : f.id; pintar(); }, { c: 'sm lnk', k: 'fh:tudo' }) : null);
  }
  async function novoRecurso(id) {
    if (!App.podeEditar()) return;
    const idMapa = App.mapa.id, mot = motivoFac.id === id ? motivoFac.txt.trim() : '';
    const eco = App.mapa.eco && App.mapa.eco.on ? App.mapa.eco : null;
    const r = await janela({ titulo: eco ? 'Outro número desta facção' : 'Recurso novo', ok: 'Pôr', texto: eco ? 'Um número que só esta facção conta (soldados, favores…). Um recurso que todas as facções têm se cria na Economia do mundo.' : null, campos: [
      { id: 'nome', rotulo: 'Nome', valor: '', max: 60, ph: eco ? 'Soldados, favores, segredos…' : 'Ouro, comida, soldados, magia…' },
      { id: 'n', rotulo: 'Quanto', tipo: 'decimal', valor: '0' },
    ], ler: v => {
      if (!v.nome.trim()) throw new Error('Dê um nome ao recurso.');
      const w = eco && eco.rec.find(x => semAcento(x.nome).trim() === semAcento(v.nome).trim());
      if (w) throw new Error(w.nome + ' é um recurso do mundo: o estoque dele já está na lista de cima.');
      const n = lerNum(v.n);
      if (!Number.isFinite(n)) throw new Error('Use um número.');
      return { nome: v.nome.trim(), n };
    } });
    if (!r || !mesmoMapa(idMapa)) return;
    App.mudar('pôr o recurso ' + r.nome, mm => { const f = facDe(mm, id); if (!f) return false; return N().facNovoRecurso(f, r.nome, r.n, mm.cal.dia, mot) ? undefined : false; });
  }
  async function motivoDaFac(id, i) {
    const f0 = facDe(App.mapa, id), e = f0 && f0.hist && f0.hist[i];
    if (!e) return;
    const idMapa = App.mapa.id;
    const mot = await janela({ titulo: 'O motivo', texto: dataTxt(App.mapa, e.d) + ': ' + e.mud.map(x => mudancaTxt(f0, x)).join(' · ') + '.', ok: 'Gravar',
      campos: [{ id: 'mot', rotulo: 'Motivo', valor: e.mot, max: (N().LIMITES && N().LIMITES.motivo) || 200, ph: 'Ex.: a batalha de Brenn' }], ler: v => v.mot.trim() });
    if (mot == null || !mesmoMapa(idMapa)) return;
    App.mudar('mudar o motivo no histórico da facção', mm => { const f = facDe(mm, id), y = f && f.hist && f.hist[i]; if (!y || y.mot === mot) return false; y.mot = mot; });
  }
  function tirarDaFac(id, i) {
    const ok = App.mudar('tirar uma linha do histórico da facção', mm => { const f = facDe(mm, id); if (!f || !f.hist || !f.hist[i]) return false; f.hist.splice(i, 1); });
    if (ok !== false) avisoDesfazer('Linha tirada do histórico (os números continuam como estão).');
  }
  // o que os jogadores veem da facção: os números marcados e o histórico (se marcado)
  function numerosPublicos(f, v) {
    // (lote 10, parte 6) o estoque da facção dos jogadores (os recursos do mundo) fica no Livro do reino deles
    const doMundo = v && v.ecoJ && v.ecoJ.fac === f.id ? new Set(v.ecoJ.rec.map(r => r.id)) : null;
    const partes = f.rec.filter(r => !doMundo || !doMundo.has(r.id)).map(r => (r.nome || 'Recurso') + ': ' + numTxt(r.n));
    if (f.pop != null) partes.push('População: ' + numTxt(f.pop));
    if (f.apoio != null) partes.push('Apoio: ' + numTxt(f.apoio) + '%');
    const out = [];
    if (partes.length) out.push(h('p', { class: 'fac-num', text: partes.join(' · ') }));
    // (aberto ou fechado fica guardado aqui: o painel se refaz a cada mudança do mapa)
    if (f.hist && f.hist.length) out.push(h('details', { class: 'fac-hist-pub', 'data-k': 'fhp:' + f.id, open: histAberto.has(f.id) || null },
      h('summary', { text: 'Histórico (' + f.hist.length + ')', onclick: function (ev) { ev.preventDefault(); const d = this.parentNode, abrir = !d.open; if (abrir) histAberto.add(f.id); else histAberto.delete(f.id); d.open = abrir; } }),
      historicoFac(f, v, false)));
    return out;
  }
  function secGrupo(o, m, grava) {
    const N_ = N(), id = o.id, rotas = m.objs.filter(x => x.k === 't'), rota = achar(m, o.rota), out = [], pt = passoDoGrupo(m, o), tpd = tpdDe(m);
    // (lote 7, parte 5b) o tipo: o grupo de sempre, ou um do mundo (a caravana, a patrulha, o exército), que anda sozinho
    const TG = N_.TIPOS_GRUPO || {}, mundo = grupoDoMundo(o);
    if (Object.keys(TG).length) {
      out.push(campoEscolha('o:' + id + ':tipo', 'Tipo', o.tipo || '', [['', 'Grupo (os jogadores, ou quem você quiser)']].concat(Object.keys(TG).map(k => [k, TG[k].nome])),
        grava('mudar o tipo do grupo', (x, v) => { if ((x.tipo || '') === v) return false; if (v) x.tipo = v; else delete x.tipo; })));
      if (mundo) out.push(caixa('o:' + id + ':ver', 'Os jogadores veem', !o.oculto, grava(o.oculto ? 'mostrar aos jogadores' : 'esconder dos jogadores', (x, v) => { x.oculto = !v; }),
        { dica: o.oculto ? 'Por enquanto, só você vê no mapa.' : 'Aparece no mapa dos jogadores (a rota e as paradas, não).' }));
    }
    // (lote 8) a facção do grupo: a bandeira do clã dela vai junto do token
    if (m.faccoes.length) out.push(campoEscolha('o:' + id + ':gfac', 'Facção', o.fac || '', [['', 'Sem facção']].concat(m.faccoes.map(x => [x.id, nomeFac(x) + (x.oculta ? ' (escondida)' : '')])),
      grava('mudar a facção do grupo', (x, v) => { if ((x.fac || '') === v) return false; x.fac = v || null; }),
      { dica: 'Com um clã ligado à facção (na aba Clã), a bandeira dele aparece junto do grupo.' }));
    out.push(h('div', { class: 'row' },
      h('label', { class: 'field cor-campo' }, h('span', { text: 'Cor' }), campoCor('o:' + id + ':cor', 'Cor do grupo', o.cor, grava('mudar a cor', (x, v) => { x.cor = v; }))),
      campoTexto('o:' + id + ':sigla', 'Sigla', o.sigla, grava('mudar a sigla', (x, v) => { x.sigla = v.trim().toUpperCase(); }), { max: 3, ph: 'GR', classe: 'curto' }),
      campoNumero('o:' + id + ':pt', 'Anda por tempo (cubos)', pt, grava('mudar quanto o grupo anda', (x, n) => { x.pt = n; }),
        { decimal: true, min: 0.1, max: 9999, erro: 'Use um número de cubos por tempo de marcha, de 0,1 a 9999.', dica: 'Por dia (' + tpd + ' tempos): ' + fmt(pt * tpd, 1) + ' cubos.' })));
    out.push(campoEscolha('o:' + id + ':rota', 'Rota', o.rota || '', [['', rotas.length ? 'Sem rota' : 'Sem rota (desenhe uma com a ferramenta Rota)']].concat(rotas.map(t => [t.id, nomeDe(t, m) + ' · ' + (N_.VIAS[t.via] || N_.VIAS.trilha).nome])),
      grava('mudar a rota', (x, v) => { if ((x.rota || '') === v) return false; x.rota = v || null; x.prog = 0; delete x.sentido; delete x.espera; })));
    // (lote 7, parte 5b) os dois jeitos de fazer a rota: desenhar (clicando os pontos) ou traçar de um marcador a outro
    out.push(linha(
      mundo ? botao('Desenhar a rota', () => desenharRotaPara(o), { c: 'sm', k: 'o:' + id + ':desenhar', title: 'Clique os pontos no mapa: a rota nasce escondida, já é ' + (o.tipo === 'exercito' ? 'deste exército' : 'desta ' + TG[o.tipo].nome.toLocaleLowerCase('pt-BR')) + ' e ' + (o.tipo === 'exercito' ? 'ele vai' : 'ela vai') + ' para o começo dela' }) : null,
      botao('Traçar entre dois marcadores…', () => abrirTracado(id), { c: 'sm', k: 'o:' + id + ':tracar', expandido: String(!!(tracado && tracado.id === id)), title: 'O site acha o caminho mais barato de um marcador a outro, pelas estradas e trilhas desenhadas' })));
    if (tracado && tracado.id === id) out.push(formTracado(o, m));
    // (lote 9: para todo grupo — o dos jogadores também)
    if (rota) out.push(campoEscolha('o:' + id + ':modo', 'Ao chegar ao fim da rota', o.modo || 'ida', Object.keys(N_.MODOS_ROTA).map(k => [k, N_.MODOS_ROTA[k]]), v => mudarModo(id, v)));
    if (rota) {
      const vg = temGrade(m) ? N_.viagem(m, o) : null;
      if (vg) {
        const total = vg.total, andado = Math.min(o.prog, total), pct = total > 0 ? Math.min(100, (andado / total) * 100) : 0;
        const onde = N_.ondeNoCaminho(m, o, vg), falta = Math.max(0, total - andado), ult = vg.cam.length - 1;
        out.push(h('div', { class: 'progresso' },
          h('div', { class: 'barra', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(Math.round(total)), 'aria-valuenow': String(Math.round(andado)), 'aria-label': 'Progresso na rota' },
            h('i', { style: { width: pct.toFixed(1) + '%' } })),
          h('small', { text: fmt(andado, 0) + ' de ' + fmt(total, 0) + ' cubos · ' + (onde.longe ? 'fora da rota' : 'hexágono ' + onde.i + ' de ' + ult)
            + (falta > 0 ? ' · faltam cerca de ' + duracaoTxt(m, falta / Math.max(0.1, pt)) : ' · chegou') })));
        // (lote 9) chegou ao fim (só ida): voltar pela mesma rota
        if (!onde.longe && onde.i >= ult && (o.modo || 'ida') === 'ida') out.push(linha(botao('Voltar pela mesma rota', () => voltarPelaRota(id), { c: 'pri sm', k: 'o:' + id + ':voltar', title: 'O grupo vira e anda a mesma rota de volta, até o começo dela' })));
        // (lote 7, parte 5b) parado numa parada, voltando
        const estado = estadoDaMarcha(m, o);
        if (estado) out.push(h('p', { class: 'note', 'data-k': 'o:' + id + ':estado', text: estado }));
        // a travessia de um hexágono que leva mais de um tempo: as bolinhas, e o ajuste à mão (sem passar o tempo)
        const b = N_.bolinhas ? N_.bolinhas(m, o) : null;
        if (b) out.push(fileiraDeBolinhas(o, b, true));
        if (!onde.longe) out.push(h('div', { class: 'row ajuste' },
          botao('− tempo', () => ajustarMarcha(id, -1, 'voltar um tempo de marcha'), { c: 'sm', k: 'o:menos', off: !(o.prog > 0), title: 'Volta o grupo um tempo de marcha na rota, sem mexer no tempo do mundo' }),
          botao('+ tempo', () => ajustarMarcha(id, 1, 'avançar um tempo de marcha'), { c: 'sm', k: 'o:mais', off: falta <= 0, title: 'Avança o grupo um tempo de marcha na rota, sem mexer no tempo do mundo' }),
          h('small', { class: 'note', text: 'Ajuste à mão: o tempo do mundo não muda.' })));
      } else out.push(h('div', { class: 'row' }, nota('Defina a grade de hexágonos do mapa para medir a viagem.'), botao('Abrir a aba Terreno', () => abrirAba('terreno'), { c: 'sm', k: 'o:ir-grade' })));
    }
    out.push(linha(
      botao('Andar 1 tempo', () => andar(id, 'tempo'), { c: 'pri', k: 'o:andar', off: !rota, title: rota ? 'O grupo anda pela rota os cubos de um tempo de marcha, de hexágono em hexágono' : 'Escolha uma rota primeiro' }),
      botao('Andar 1 dia', () => andar(id, 'dia'), { k: 'o:andar-dia', off: !rota, title: rota ? 'Anda os tempos que faltam para acabar o dia, e o dia passa' : 'Escolha uma rota primeiro' }),
      botao('Sortear encontro', () => sortearGrupo(id), { k: 'o:sortear', title: 'Usa a tabela de encontros da região onde o grupo está' })));
    // (lote 7, parte 4b) um encontro onde o grupo está, na aba Cenas
    if (naCasca()) out.push(linha(botao('Gerar a cena aqui', () => gerarAqui(o), { c: 'sm', k: 'o:gerar-cena', title: 'Abre a janela "Gerar um lugar" das Cenas na aba Encontro, já com o terreno, o caminho, a hora, o clima e o estilo daqui' })));
    if (rota && (o.prog > 0 || o.sentido === -1 || o.espera > 0 || N_.dist(o, { x: rota.pts[0][0], y: rota.pts[0][1] }) > 0.5)) {
      out.push(linha(botao('Pôr no começo da rota', () => porNoComeco(id), { c: 'sm', k: 'o:comeco' })));
    }
    if (rota) out.push(secParadas(o, m));
    out.push(nota(tempoDeHojeTxt(m) + ' A cada ' + tpd + ' tempos de marcha, passa um dia. Cada hexágono gasta os cubos do terreno dele (Floresta, Montanha… na aba Terreno); o que sobra rumo ao próximo fica para o tempo seguinte.'));
    if (naCasca()) out.push(linha(botaoAcampar()));
    if (encontro && encontro.grupo === id) out.push(cartaoEncontro());
    return secao('Grupo', out);
  }
  // as bolinhas de um grupo numa lista (só a fileira): quem joga recebe prontas; o mestre conta
  function bolinhasNaLista(v, g) {
    const b = Array.isArray(g.bol) ? { feitas: g.bol[0], total: g.bol[1], terreno: '' } : App.podeEditar() && N().bolinhas ? N().bolinhas(v, g) : null;
    return b ? fileiraDeBolinhas(g, b, false) : null;
  }
  // O que dizer depois de andar: quantos tempos, e se o dia passou.
  function depoisDaMarcha(m, t, n) {
    if (t.dias > 0) return 'Passou o dia: hoje é ' + dataTxt(m, m.cal.dia) + '.';
    return plural(n, 'tempo de marcha', 'tempos de marcha') + ' (hoje: ' + t.tempo + ' de ' + tpdDe(m) + ').';
  }
  // quantos tempos "Andar 1 dia" anda: os que faltam para acabar o dia
  const temposAteOFim = m => tpdDe(m) - ((m.cal && m.cal.tempo) || 0);
  /* (lote 7, parte 5a) Os grupos e os eventos que pesam na viagem deles: [grupo, texto] — parado antes de uma passagem
     fechada (o próximo tempo de marcha não sairia do lugar) e dentro de eventos que pesam. */
  function naViagem(m) {
    const N_ = N(), out = [];
    for (const g of m.objs) {
      if (g.k !== 'g') continue;
      const partes = [];
      if (g.rota) { const r = N_.andarTempos(m, g.id, 1); if (r.ok && r.parou && !r.cubos) partes.push('parado: "' + r.parou.nome + '" fecha a passagem'); }
      const dentro = N_.pesoNoPonto(m, g.x, g.y).eventos;
      if (dentro.length) partes.push('dentro de ' + dentro.map(e => '"' + N_.nomeEvento(e) + '" (' + textoPeso(e.peso) + ')').join(', '));
      if (partes.length) out.push([g, partes.join(' · ')]);
    }
    return out;
  }
  /* (lote 7) O tempo do mundo, para todos: "+1 tempo" (qual = 'tempo') e "Próximo dia" (qual = 'dia', os tempos que
     faltam para acabar o dia — e o relógio vai para o 1º tempo de amanhã). Os grupos com rota andam junto, cada um no
     seu passo; sem nenhum grupo andando, só o relógio passa. Um passo de desfazer só. */
  function passarTempoMundo(qual) {
    if (!App.podeEditar() || !App.mapa) return;
    const m0 = App.mapa, n = qual === 'dia' ? temposAteOFim(m0) : 1, N_ = N(), dia0 = m0.cal.dia, t0 = (m0.cal && m0.cal.tempo) || 0, tpd = tpdDe(m0);
    /* (lote 7, parte 5b) tempo a tempo, numa cópia: quem anda (os grupos com rota e os eventos que andam, acontecendo hoje)
       anda um tempo — os eventos primeiro, porque mudam o caminho dos grupos —, e depois de cada tempo, os encontros no
       caminho (a caravana, a patrulha ou o exército a até 1 hexágono de um grupo comum, que antes não estavam assim) */
    const mm = JSON.parse(JSON.stringify(m0));
    const andam = mm.objs.filter(o => o.rota && (o.k === 'g' || (o.k === 'e' && N_.eventoAtivo(o, dia0)))).sort((a, b) => (a.k === 'e' ? 0 : 1) - (b.k === 'e' ? 0 : 1));
    const feitos = new Map(), encontros = [], G_ = window.MundoGuerra, confrontos = [];
    const perto = new Set((N_.encontrosNoCaminho ? N_.encontrosNoCaminho(mm) : []).map(([a, b]) => a + '|' + b));
    // (lote 8, parte 6) os exércitos que já estavam perto um do outro não contam como encontro novo
    const pertoEx = new Set((G_ ? G_.confrontos(mm) : []).map(([a, b]) => a + '|' + b));
    for (let k = 0; k < n; k++) {
      const pass = {};
      for (const o of andam) {
        const r = N_.andarTempos(mm, o.id, 1);
        if (!r.ok) continue;
        o.x = r.x; o.y = r.y; o.prog = r.prog;
        if ('sentido' in r) { if (r.sentido === -1) o.sentido = -1; else delete o.sentido; }
        if (r.espera > 0) o.espera = r.espera; else delete o.espera;
        if (r.pass) pass[o.id] = r.pass;
        const f = feitos.get(o.id) || { cubos: 0, hexes: 0, parou: null, parada: null };
        f.cubos += r.cubos || 0; f.hexes += r.hexes || 0;
        if (r.chegou && o.k === 'g' && (o.modo || 'ida') === 'ida') f.chegou = true;           // (lote 9) chegou ao fim da rota
        if (r.parou && !r.cubos) f.parou = r.parou; else if (r.hexes) f.parou = r.parou || null;
        if (r.parada) f.parada = r.parada;
        feitos.set(o.id, f);
      }
      // (lote 9) o relógio da cópia anda junto: o descanso de cada grupo depende do tempo do dia
      { const t2 = N_.passarTempos(mm.cal, 1); mm.cal.dia = t2.dia; mm.cal.tempo = t2.tempo; }
      if (G_) {
        const agoraEx = new Set();
        for (const [a, b] of G_.confrontos(mm, pass)) { const key = a + '|' + b; agoraEx.add(key); if (!pertoEx.has(key) && !confrontos.some(c => c[0] === a && c[1] === b)) confrontos.push([a, b]); }
        pertoEx.clear();
        for (const key of agoraEx) pertoEx.add(key);
      }
      if (!N_.encontrosNoCaminho) continue;
      const agora = new Set();
      for (const [a, b] of N_.encontrosNoCaminho(mm, pass)) {
        const key = a + '|' + b;
        agora.add(key);
        if (!perto.has(key)) encontros.push([a, b, (t0 + k) % tpd + 1]);
      }
      perto.clear();
      for (const key of agora) perto.add(key);
    }
    let t = null;
    const ok = App.mudar(qual === 'dia' ? 'passar o dia' : 'passar 1 tempo', d => {
      for (const id of feitos.keys()) {
        const o = achar(d, id), r = achar(mm, id);
        if (!o || !r) continue;
        o.x = r.x; o.y = r.y; o.prog = r.prog;
        if (r.sentido === -1) o.sentido = -1; else delete o.sentido;
        if (r.espera > 0) o.espera = r.espera; else delete o.espera;
      }
      t = N_.passarTempos(d.cal, n); d.cal.dia = t.dia; d.cal.tempo = t.tempo;
    });
    if (ok === false) return;
    // (lote 7, parte 5a) quem andou de verdade (o parado antes de uma passagem fechada não conta) e os avisos da viagem:
    // quem parou e quem entrou num evento que pesa; (5b) os encontros no caminho vêm primeiro
    const m = App.mapa, avisos = [];
    for (const [a, b, tm] of encontros) avisos.push(nomeDe(achar(m, a) || {}, m) + ' encontrou ' + nomeDe(achar(m, b) || {}, m) + (n > 1 ? ' (no ' + tm + 'º tempo)' : '') + '.');
    const gruposQueAndaram = [];
    for (const [gid, f] of feitos) {
      const g0 = achar(m0, gid), g = achar(m, gid);
      if (!g0 || !g || g0.k !== 'g') continue;
      if (f.hexes > 0 || f.cubos > 0) gruposQueAndaram.push(gid);
      const nome = nomeDe(g0, m0);
      if (f.parou) { avisos.push(nome + ' — parado: "' + f.parou.nome + '" fecha a passagem.'); continue; }
      const antes = new Set(N_.pesoNoPonto(m0, g0.x, g0.y).eventos.map(e => e.id));
      for (const e of N_.pesoNoPonto(m, g.x, g.y).eventos) if (!antes.has(e.id)) avisos.push(nome + ' — agora dentro de "' + N_.nomeEvento(e) + '" (' + textoPeso(e.peso) + ').');
    }
    const andou = gruposQueAndaram.length ? ' ' + (gruposQueAndaram.length === 1 ? '1 grupo andou: ' + nomeDe(achar(m, gruposQueAndaram[0]) || {}, m) + '.' : gruposQueAndaram.length + ' grupos andaram.') : '';
    const av = avisos.length ? ' ' + avisos.slice(0, 3).join(' ') + (avisos.length > 3 ? ' (E mais ' + (avisos.length - 3) + ' na aba Hoje.)' : '') : '';
    avisoDesfazer((t.dias > 0 ? 'Novo dia: ' + N_.textoDataSemana(m.cal, m.cal.dia) + ', ' + tempoTxt(m) + '.' : 'Passou 1 tempo: agora é o ' + tempoTxt(m) + '.') + andou + av);
    // (lote 9) quem chegou ao fim da rota (só ida): o aviso oferece voltar pela mesma rota
    avisarChegada([...feitos].filter(([, f]) => f.chegou).map(([gid]) => gid));
    // (lote 7, parte 5c) quem terminou o dia dentro de uma zona de perigo: a proposta de mexer na ficha (pelo dia que acabou)
    // as propostas, uma depois da outra (uma janela fecharia a outra): as zonas de perigo e (lote 8, parte 6) os mantimentos
    const fila = [];
    if (t.dias > 0 && N_.zonasNoPonto) {
      const props = [];
      for (const g of mm.objs) {
        if (g.k !== 'g' || grupoDoMundo(g)) continue;
        const zs = N_.zonasNoPonto(mm, g.x, g.y, dia0);
        if (zs.length) props.push({ g: g.id, nome: nomeDe(g, mm), zonas: zs.map(z => '"' + nomeDe(z, mm) + '"'), ef: N_.efeitoDasZonas(zs) });
      }
      if (props.length) fila.push(() => proporZonas(props));
    }
    // (lote 8, parte 6) os exércitos que se encontraram: o aviso oferece abrir a batalha
    if (GP()) {
      if (confrontos.length) GP().ofertarBatalhas(confrontos, m.cal.dia);
      if (t.dias > 0) fila.push(() => GP().proporMantimentos(t.dias));
    }
    if (fila.length) propostas = (async () => { for (const f of fila) { try { await f(); } catch (e) { console.error(e); } } })().finally(() => { propostas = null; });
  }
  // "4º tempo de 10": o tempo de marcha de agora (o tempo guardado conta os que já passaram hoje)
  function tempoTxt(m) { const n = tpdDe(m), t = Math.min(n - 1, Math.max(0, (m.cal && m.cal.tempo) || 0)); return (t + 1) + 'º tempo de ' + n; }
  // O grupo anda pela rota (um tempo, ou até o fim do dia) e o tempo passa — um passo de desfazer só, para as duas coisas.
  function andar(id, qual) {
    if (!App.podeEditar()) return;
    const m0 = App.mapa, n = qual === 'dia' ? temposAteOFim(m0) : 1, r = N().andarTempos(m0, id, n);
    if (!r.ok) { App.toast((r.msg || 'O grupo não andou') + '.'); return; }
    let t = null;
    const ok = App.mudar(qual === 'dia' ? 'andar 1 dia' : 'andar 1 tempo', mm => {
      const g = achar(mm, id);
      if (!g) return false;
      g.x = r.x; g.y = r.y; g.prog = r.prog;
      if (r.sentido === -1) g.sentido = -1; else delete g.sentido;           // (lote 7, parte 5b) voltando; parado numa parada
      if (r.espera > 0) g.espera = r.espera; else delete g.espera;
      t = N().passarTempos(mm.cal, n); mm.cal.dia = t.dia; mm.cal.tempo = t.tempo;
    });
    if (ok !== false) {
      avisoDesfazer(r.msg + '. ' + depoisDaMarcha(App.mapa, t, n));
      const g = achar(App.mapa, id);
      if (r.chegou && g && (g.modo || 'ida') === 'ida') avisarChegada([id]);           // (lote 9)
    }
  }
  // (lote 9) quem chegou ao fim da rota (só ida): um só, o aviso oferece voltar pela mesma rota; vários, o aviso diz quem
  function avisarChegada(ids) {
    const m = App.mapa, gs = ids.map(id => achar(m, id)).filter(Boolean);
    if (!gs.length) return;
    if (gs.length === 1) { const g = gs[0]; App.toast(nomeDe(g, m) + ' — chegou ao fim da rota.', 'Voltar pela mesma rota', () => voltarPelaRota(g.id)); return; }
    App.toast('Chegaram ao fim da rota: ' + gs.map(g => nomeDe(g, m)).join(', ') + '. Para voltar pela mesma rota: Seleção → o grupo.');
  }
  // O ajuste à mão da marcha (− tempo, + tempo, as bolinhas): o grupo muda de lugar na rota, e o tempo do mundo fica.
  function ajustarMarcha(id, o, rotulo) {
    if (!App.podeEditar()) return;
    const r = N().ajustarMarcha(App.mapa, id, o);
    if (!r.ok) { if (r.msg && r.msg !== 'Nada mudou') App.toast(r.msg + '.'); return; }
    mudarObj(id, rotulo, x => { x.x = r.x; x.y = r.y; x.prog = r.prog; });
  }
  // a área de um polígono (para achar, entre as regiões que contêm outra, a mais de dentro)
  function areaDe(pts) { let a = 0; for (let i = 0, k = pts.length - 1; i < pts.length; k = i++) a += pts[k][0] * pts[i][1] - pts[i][0] * pts[k][1]; return Math.abs(a) / 2; }
  // as regiões que ficam dentro de o (filhas, netas…) — e ela mesma
  function deDentro(m, o) {
    const ids = new Set([o.id]);
    for (let mudou = true; mudou;) { mudou = false; for (const x of m.objs) if (x.k === 'r' && x.pai && ids.has(x.pai) && !ids.has(x.id)) { ids.add(x.id); mudou = true; } }
    return ids;
  }
  function secRegiao(o, m, grava) {
    const id = o.id, f = facDe(m, o.fac), p = paiDe(m, o), fh = !o.fac && p ? facDaReg(m, p) : null, abaixo = deDentro(m, o), out = [];
    /* (lote 6) dentro de qual região ela fica (o Condado no Reino): as outras, menos as que estão dentro dela. Desenhada
       dentro de outra sem dizer, a região ganha a sugestão — nada muda sozinho. */
    const fora = m.objs.filter(x => x.k === 'r' && !abaixo.has(x.id));
    out.push(campoEscolha('o:' + id + ':pai', 'Dentro de', o.pai || '', [['', 'Nenhuma (região de fora)']].concat(fora.map(x => [x.id, nomeDe(x, m)])),
      grava('mudar onde a região fica', (x, v) => { if ((x.pai || '') === v) return false; x.pai = v || null; }),
      { dica: 'Uma região dentro de outra — o Condado no Reino. Sem facção própria, ela é da facção da de fora.' }));
    if (!o.pai && o.pts.length >= 3) {
      const cand = fora.filter(x => x.pts.length >= 3 && o.pts.every(q => N().dentroPoligono(q, x.pts))).sort((a, b) => areaDe(a.pts) - areaDe(b.pts))[0];
      if (cand) out.push(linha(botao('Pôr dentro de ' + nomeDe(cand, m), () => mudarObj(id, 'pôr a região dentro de ' + nomeDe(cand, m), x => { x.pai = cand.id; }),
        { c: 'sm', k: 'o:' + id + ':pai-sugere', title: 'Esta região está desenhada dentro de ' + nomeDe(cand, m) + ': ela passa a fazer parte dela' })));
    }
    if (m.faccoes.length) {
      out.push(campoEscolha('o:' + id + ':fac', 'Facção', o.fac || '', [['', p ? 'A de ' + nomeDe(p, m) + (fh ? ' (' + nomeFac(fh) + ')' : ', sem facção') : 'Sem facção']].concat(m.faccoes.map(x => [x.id, nomeFac(x) + (x.oculta ? ' (escondida)' : '')])),
        grava('mudar a facção', (x, v) => { x.fac = v || null; })));
    } else out.push(h('div', { class: 'row' }, nota('Sem facções ainda. Elas dão cor às regiões e lados às frentes.'), botao('Criar facção', () => { abrirAba('faccoes'); novaFaccao(); }, { c: 'sm', k: 'o:criar-fac' })));
    // a cor: a da facção; a região de dentro pode ter a sua (para cada Condado se distinguir no Reino)
    if ((f || fh) && !o.pai) out.push(nota('A cor vem da facção.'));
    else {
      out.push(h('div', { class: 'linha-cor' }, campoCor('o:' + id + ':cor', 'Cor da região', o.cor, grava('mudar a cor', (x, v) => { x.cor = v; })),
        h('span', { class: 'note', text: o.cor ? 'Cor própria' : f || fh ? 'Sem cor própria: a da facção' : 'Sem cor: aparece tracejada' }),
        o.cor ? botao('Tirar a cor', () => mudarObj(id, 'mudar a cor', x => { x.cor = ''; }), { c: 'sm', k: 'o:' + id + ':cor0' }) : null));
    }
    // (lote 7, parte 4b) o estilo das cenas geradas aqui dentro (sem um: o da região de fora)
    out.push(campoEscolha('o:' + id + ':estilo', 'Estilo das cenas', o.estilo || '', [['', p ? 'O de ' + nomeDe(p, m) : 'Nenhum (o da janela)']].concat(Object.entries(N().ESTILOS_CENA || {})),
      grava('mudar o estilo das cenas', (x, v) => { if ((x.estilo || '') === v) return false; if (v) x.estilo = v; else delete x.estilo; }),
      { dica: 'O estilo (Comum, Oriental, Nórdico…) com que a aba Cenas gera os lugares e os encontros daqui. Só o mestre vê.' }));
    // o custo de viajar por aqui: vale para cada hexágono com o centro dentro dela (menos o que tem custo próprio)
    out.push(campoNumero('o:' + id + ':custo', 'Custo de cada hexágono aqui (cubos)', o.custo, grava('mudar o custo da região', (x, n) => { x.custo = n; }),
      { decimal: true, min: 0.1, max: 9999, vazio: null, ph: 'o do terreno', dica: 'Vazio: cada hexágono custa o do terreno dele' + (p ? ' (o custo de ' + nomeDe(p, m) + ' não vale aqui dentro)' : '') + '. Só o mestre vê.' }));
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
      // (lote 7, parte 5a) trocar o tipo leva o peso de começo do tipo novo (se o evento pesa na viagem)
      campoEscolha('o:' + id + ':tipo', 'Tipo', o.tipo, Object.keys(E).map(k => [k, E[k].nome]), grava('mudar o tipo do evento', (x, v) => { x.tipo = v; if (x.peso) x.peso = N_.pesoPadrao(v); })),
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
    return [secao('Evento', out), secPeso(o, m, grava), secAndaEvento(o, m)];
  }
  /* (lote 7, parte 5a) O que o evento pesa na viagem: os cubos a mais por hexágono dentro dele, a chance de encontro a
     mais (ou a menos) e se ele fecha a passagem. Os eventos novos já nascem com os números do tipo; os de antes, desligados. */
  function textoPeso(p) {
    const partes = [];
    if (p.custo) partes.push('+' + fmt(p.custo, 1) + ' cubos por hexágono');
    if (p.enc) partes.push((p.enc > 0 ? '+' : '−') + Math.abs(p.enc) + '% de encontro');
    if (p.fecha) partes.push('fecha a passagem');
    return partes.join(', ') || 'nada';
  }
  function secPeso(o, m, grava) {
    const N_ = N(), id = o.id, p = o.peso || null, pd = N_.pesoPadrao(o.tipo), out = [];
    out.push(caixa('o:' + id + ':pesa', 'Pesa na viagem', !!p, grava(p ? 'o evento não pesa na viagem' : 'o evento pesa na viagem', (x, v) => { if (v) x.peso = N_.pesoPadrao(x.tipo); else delete x.peso; }),
      { dica: p ? null : 'Ligado, vale o de começo do tipo: ' + textoPeso(pd) + '.' }));
    if (p) {
      out.push(h('div', { class: 'row' },
        campoNumero('o:' + id + ':pcusto', 'Cubos a mais por hexágono', p.custo, grava('mudar o custo do evento', (x, n) => { x.peso = Object.assign({}, x.peso || {}, { custo: n }); }), { decimal: true, min: 0, max: 999, vazio: 0 }),
        campoNumero('o:' + id + ':penc', 'Encontro (± %)', p.enc, grava('mudar a chance de encontro do evento', (x, n) => { x.peso = Object.assign({}, x.peso || {}, { enc: n }); }), { min: -100, max: 100, vazio: 0 })));
      out.push(caixa('o:' + id + ':pfecha', 'Fecha a passagem (o grupo para antes)', !!p.fecha, grava(p.fecha ? 'abrir a passagem' : 'fechar a passagem', (x, v) => { x.peso = Object.assign({}, x.peso || {}, { fecha: !!v }); })));
      const igual = p.custo === pd.custo && p.enc === pd.enc && !!p.fecha === !!pd.fecha;
      if (!igual) out.push(linha(botao('Voltar ao de começo do tipo', () => mudarObj(id, 'voltar o peso ao do tipo', x => { x.peso = N_.pesoPadrao(x.tipo); }), { c: 'sm', k: 'o:' + id + ':ppadrao', title: 'O de começo: ' + textoPeso(pd) })));
      out.push(nota('Vale para os hexágonos com o centro dentro do evento, enquanto ele acontece: os grupos gastam mais para entrar, o "Sortear encontro" de quem está dentro muda e, fechado, ninguém entra (o grupo para no hexágono de antes, com o aviso). Para mudar o custo só de alguns hexágonos, use o pincel "Custo próprio…" da ferramenta Terreno.'));
    }
    return secao('Na viagem', out);
  }
  // Mudar o começo leva o fim junto (a duração fica a mesma).
  function moverInicio(x, d) {
    const ini = x.ini == null ? d : x.ini;
    if (ini === d && x.ini != null) return false;
    const dur = x.fim == null ? null : x.fim - ini;
    x.ini = d;
    if (dur != null) x.fim = d + dur;
  }
  /* ---------------- (lote 7, parte 5b) quem anda sozinho pelo mapa ----------------
     Os grupos do mundo (a caravana, a patrulha, o exército) e os eventos que andam: a rota (desenhada ou traçada de um
     marcador a outro), o que fazem no fim dela (param, voltam ou recomeçam) e as paradas. */
  const grupoDoMundo = o => !!(o && o.k === 'g' && o.tipo && (N().TIPOS_GRUPO || {})[o.tipo]);
  // (lote 7, parte 5c) a zona de perigo (a de guerra não tem tipo)
  const zonaDePerigo = o => !!(o && o.k === 'z' && o.tipo && o.tipo !== 'guerra' && (N().ZONAS || {})[o.tipo]);
  let tracado = null;                             // { id, de, para, r }: o "Traçar entre dois marcadores" aberto
  function previaRota(pts) {
    const antes = !!App.previaRota;
    App.previaRota = pts ? { pts } : null;
    if (antes || pts) { const T = Tela(); if (T) T.redesenhar(); }
  }
  // "Desenhar a rota": a ferramenta Rota; a rota desenhada vai para ele (a tela cuida, no fim do desenho)
  function desenharRotaPara(o) {
    if (!App.podeEditar()) return;
    tracado = null; previaRota(null);
    App.rotaPara = { id: o.id, nome: nomeDe(o, App.mapa), k: o.k };
    App.usarFerramenta('t');
    if (estreito()) definirPainel(false);
  }
  function abrirTracado(id) {
    tracado = tracado && tracado.id === id ? null : { id, de: '', para: '', r: null };
    previaRota(null);
    agendar();
  }
  // quanto leva o caminho traçado, no passo de quem vai andar
  function quantoLeva(m, o, r) {
    const pt = o.k === 'e' ? (o.pt || 2) : passoDoGrupo(m, o);
    return 'cerca de ' + duracaoTxt(m, r.custo / Math.max(0.1, pt));
  }
  function formTracado(o, m) {
    const marcs = m.objs.filter(x => x.k === 'm').map(x => [x.id, nomeDe(x, m)]);
    if (marcs.length < 2) return nota('Ponha pelo menos dois marcadores no mapa (de onde sai e para onde vai) para traçar o caminho entre eles.');
    if (!temGrade(m)) return nota('Defina a grade de hexágonos do mapa (aba Terreno) para traçar o caminho.');
    const t = tracado, ops = [['', 'Escolha…']].concat(marcs);
    const mudar = (campo, v) => { if (t[campo] === v) return false; t[campo] = v; t.r = null; previaRota(null); agendar(); };
    return h('div', { class: 'sub-form', 'data-k': 'tracar:' + o.id },
      h('div', { class: 'row' },
        campoEscolha('tr:de', 'De', t.de, ops, v => mudar('de', v)),
        campoEscolha('tr:para', 'Para', t.para, ops, v => mudar('para', v))),
      t.r ? (t.r.ok ? nota('O caminho: ' + t.r.msg + ', ' + quantoLeva(m, o, t.r) + '. Ele aparece no mapa, fino e verde.') : nota(t.r.msg + '.', 'erro')) : null,
      linha(
        botao('Ver o caminho', () => verTracado(o.id), { c: 'sm', k: 'tr:ver', off: !t.de || !t.para || t.de === t.para }),
        t.r && t.r.ok ? botao('Usar esta rota', () => usarTracado(o.id), { c: 'sm pri', k: 'tr:usar' }) : null,
        botao('Cancelar', () => { tracado = null; previaRota(null); agendar(); }, { c: 'sm', k: 'tr:cancelar' })),
      nota('Nada muda até "Usar esta rota". O caminho vai pelos hexágonos mais baratos, preferindo as estradas e as trilhas desenhadas, e não entra onde um evento fecha a passagem.'));
  }
  function verTracado(id) {
    const t = tracado, m = App.mapa;
    if (!t || t.id !== id || !m) return;
    const de = achar(m, t.de), para = achar(m, t.para);
    if (!de || !para) return;
    t.r = N().tracarRota(m, de, para);
    previaRota(t.r.ok ? t.r.pts : null);
    agendar();
  }
  function usarTracado(id) {
    const t = tracado, m = App.mapa, r = t && t.r, o = achar(m, id);
    if (!r || !r.ok || !o || !App.podeEditar()) return;
    const de = achar(m, t.de), para = achar(m, t.para), nome = 'De ' + nomeDe(de, m) + ' a ' + nomeDe(para, m), esconde = o.k === 'e' || grupoDoMundo(o);
    const ok = App.mudar('traçar a rota de "' + nomeDe(o, m) + '"', mm => {
      const x = achar(mm, id);
      if (!x) return false;
      const rt = N().objNovo('t', Object.assign({ pts: r.pts.map(p => p.slice()), via: r.via, nome }, esconde ? { esc: true, oculto: true } : {}));
      if (!rt) return false;
      mm.objs.push(rt);
      x.rota = rt.id; x.prog = 0; x.x = rt.pts[0][0]; x.y = rt.pts[0][1]; delete x.sentido; delete x.espera;
      if (x.k === 'e' && !x.pt) x.pt = 2;
    });
    tracado = null; previaRota(null);
    if (ok !== false) avisoDesfazer('A rota "' + nome + '" (' + r.msg + ') é de ' + nomeDe(o, m) + (esconde ? '. Ela fica escondida no mapa: aparece fina quando ' + (o.k === 'e' ? 'o evento' : 'o grupo') + ' está selecionado.' : '.'));
  }
  // o que faz no fim da rota: muda o modo e acha o andado do hexágono de agora no caminho novo (sem sair do lugar)
  function mudarModo(id, v) {
    mudarObj(id, 'mudar o que faz no fim da rota', (x, mm) => {
      if ((x.modo || 'ida') === v) return false;
      if (v === 'ida') delete x.modo; else x.modo = v;
      delete x.sentido;
      const vg = N().viagem(mm, x);
      if (vg) { const on = N().ondeNoCaminho(mm, Object.assign({}, x, { prog: 0 }), vg); x.prog = on.longe ? 0 : vg.acum[on.i]; }
    });
  }
  function porNoComeco(id) {
    mudarObj(id, 'pôr no começo da rota', (x, mm) => { const r = achar(mm, x.rota); if (!r) return false; x.x = r.pts[0][0]; x.y = r.pts[0][1]; x.prog = 0; delete x.sentido; delete x.espera; });
  }
  // a linha do estado de quem anda: parado numa parada (e quanto falta), voltando
  function estadoDaMarcha(m, o) {
    const partes = [];
    if (o.espera > 0) {
      const hx = N().hexDe(m, o.x, o.y), ps = o.paradas || [];
      let nome = 'a parada';
      ps.forEach((p, i) => { const ph = N().hexDe(m, p.x, p.y); if (hx && ph && ph.q === hx.q && ph.r === hx.r && nome === 'a parada') nome = N().nomeDaParada(m, p, i); });
      partes.push('Parado em "' + nome + '": ' + (o.espera === 1 ? 'falta 1 tempo' : 'faltam ' + fmt(o.espera, 0) + ' tempos') + (o.espera > tpdDe(m) ? ' (' + diasTxt(o.espera / tpdDe(m)) + ')' : '') + '.');
    }
    if (o.sentido === -1) partes.push(o.modo === 'volta' ? 'Voltando pelo mesmo caminho.' : 'Voltando pela mesma rota.');
    // (lote 9) o descanso: o próximo tempo cai na janela do grupo
    if (N().descansandoAgora && N().descansandoAgora(m, o)) { const jn = N().janelaDeDescanso(o, tpdDe(m)); partes.push('Descansando (do ' + jn.de + 'º ao ' + jn.ate + 'º tempo).'); }
    // arrastado para longe da rota, não anda (o "+1 tempo" passa sem ele)
    const vg = o.rota && temGrade(m) ? N().viagem(m, o) : null;
    if (vg && N().ondeNoCaminho(m, o, vg).longe > 1) partes.push('Fora da rota: não anda até voltar para ela ("Pôr no começo da rota").');
    return partes.join(' ');
  }
  /* ---------------- (lote 9) o descanso e a volta pela mesma rota ----------------
     O descanso: os tempos do dia em que o grupo não anda (pode virar a noite). O grupo do mundo dorme num ponto de
     descanso (um marcador marcado, para todos, ou um ponto na rota dele) se ainda chega até a metade do descanso; senão
     acampa onde está. O grupo dos jogadores só para. */
  function secDescanso(o, m) {
    const id = o.id, N_ = N(), tpd = tpdDe(m), jan = N_.janelaDeDescanso ? N_.janelaDeDescanso(o, tpd) : null, mundo = grupoDoMundo(o), out = [];
    if (!jan) {
      out.push(nota('Sem hora de descanso: anda em todos os tempos do dia.'));
      out.push(linha(botao('Marcar o descanso…', () => janelaDescanso(id), { c: 'sm', k: 'o:' + id + ':desc' })));
    } else {
      out.push(h('p', { class: 'note', 'data-k': 'o:' + id + ':desc-txt' }, h('b', { text: 'Descansa do ' + jan.de + 'º ao ' + jan.ate + 'º tempo' }),
        (jan.de > jan.ate ? ' (vira a noite)' : '') + (N_.descansandoAgora(m, o) ? ' · descansando agora' : '') + '.'));
      out.push(h('div', { class: 'row' }, botao('Mudar…', () => janelaDescanso(id), { c: 'sm', k: 'o:' + id + ':desc-mudar' }), botao('Tirar o descanso', () => tirarDescanso(id), { c: 'sm', k: 'o:' + id + ':desc-tirar' })));
      out.push(nota(mundo ? 'Na hora de descansar, ' + (o.tipo === 'exercito' ? 'o exército segue' : 'a ' + nomeDoTipo(o).toLocaleLowerCase('pt-BR') + ' segue') + ' até um ponto de descanso se ainda chegar a ele até a metade do descanso (para dormir pelo menos a outra metade); senão, acampa onde está.'
        : 'Na hora de descansar, o grupo para onde estiver.'));
    }
    if (mundo) {
      const ps = Array.isArray(o.pdesc) ? o.pdesc : [], marcados = m.objs.filter(x => x.k === 'm' && x.desc), rota = achar(m, o.rota);
      ps.forEach((p, i) => out.push(h('div', { class: 'row parada-li', 'data-k': 'o:' + id + ':pd' + i },
        h('span', { class: 'note', text: 'Ponto de descanso ' + (i + 1) + (N_.nomeDoDescanso(m, p.x, p.y) !== 'o ponto de descanso' ? ' (' + N_.nomeDoDescanso(m, p.x, p.y) + ')' : '') }),
        botao('Centralizar', () => { const T = Tela(); if (T && T.centrar) T.centrar({ x: p.x, y: p.y }); }, { c: 'sm', k: 'o:' + id + ':pd' + i + ':ir' }),
        botao('Tirar', () => tirarPontoDescanso(id, i), { c: 'sm', k: 'o:' + id + ':pd' + i + ':tirar' }))));
      if (rota) out.push(linha(botao(ps.length ? 'Marcar outro ponto de descanso na rota' : 'Marcar um ponto de descanso na rota', () => marcarPontoDescanso(id), { c: 'sm', k: 'o:' + id + ':pdesc', off: ps.length >= N_.MAX_PARADAS })));
      out.push(nota('Pontos de descanso: os deste grupo (na rota dele) e os marcadores marcados como “Ponto de descanso”, que valem para todos os grupos do mundo (' + (marcados.length === 1 ? '1 no mapa' : marcados.length + ' no mapa') + '). Os jogadores não veem.'));
    }
    return secao('Descanso', out);
  }
  const nomeDoTipo = o => { const T = (N().TIPOS_GRUPO || {})[o.tipo]; return T ? T.nome : 'Grupo'; };
  async function janelaDescanso(id) {
    const m0 = App.mapa, o0 = m0 && achar(m0, id);
    if (!o0 || !App.podeEditar()) return;
    const tpd = tpdDe(m0), d = o0.desc || { de: Math.max(1, tpd - 4), ate: tpd };
    const r = await janela({ titulo: 'O descanso de ' + nomeDe(o0, m0), ok: o0.desc ? 'Mudar' : 'Marcar',
      texto: 'Nos tempos do descanso o grupo não anda. Pode virar a noite (do ' + Math.max(1, tpd - 1) + 'º ao 2º, por exemplo). O dia tem ' + tpd + ' tempos.',
      campos: [{ id: 'de', rotulo: 'Do tempo', tipo: 'number', valor: Math.min(d.de, tpd), min: 1, max: tpd, linha: 'a' }, { id: 'ate', rotulo: 'Até o tempo', tipo: 'number', valor: Math.min(d.ate, tpd), min: 1, max: tpd, linha: 'a' }],
      ler: v => {
        const de = Number(v.de), ate = Number(v.ate), bom = x => Number.isInteger(x) && x >= 1 && x <= tpd;
        if (!bom(de) || !bom(ate)) throw new Error('Use tempos de 1 a ' + tpd + '.');
        return { de, ate };
      } });
    if (r == null || !mesmoMapa(m0.id)) return;
    mudarObj(id, o0.desc ? 'mudar o descanso' : 'marcar o descanso', x => { if (x.desc && x.desc.de === r.de && x.desc.ate === r.ate) return false; x.desc = r; });
  }
  function tirarDescanso(id) {
    if (mudarObj(id, 'tirar o descanso', x => { if (!x.desc) return false; delete x.desc; }) !== false) avisoDesfazer('O grupo não tem mais hora de descanso: anda em todos os tempos.');
  }
  function tirarPontoDescanso(id, i) {
    mudarObj(id, 'tirar o ponto de descanso', x => { const ps = x.pdesc || []; if (!ps[i]) return false; ps.splice(i, 1); if (!ps.length) delete x.pdesc; });
  }
  async function marcarPontoDescanso(id) {
    const T = Tela();
    if (!T || !T.escolherPonto || !App.podeEditar()) return;
    const idMapa = App.mapa.id;
    if (estreito()) definirPainel(false);
    const p = await T.escolherPonto('Clique na rota, onde fica o ponto de descanso.');
    if (!p || !mesmoMapa(idMapa)) return;
    const m = App.mapa, o = achar(m, id), rt = o && achar(m, o.rota);
    if (!o || !rt) return;
    const N_ = N(), h0 = N_.hexDe(m, p.x, p.y);
    let melhor = null, d0 = Infinity;
    for (const hx of N_.caminhoHex(m, ptsDoCaminho(o, rt))) { const d = N_.distHex(hx, h0); if (d < d0) { d0 = d; melhor = hx; } }
    if (!melhor || d0 > 1) { App.toast('Clique em cima da rota (ou no hexágono do lado dela). Nada mudou.'); return; }
    if ((o.pdesc || []).some(q => { const ph = N_.hexDe(m, q.x, q.y); return ph && ph.q === melhor.q && ph.r === melhor.r; })) { App.toast('Já há um ponto de descanso nesse hexágono. Nada mudou.'); return; }
    const c = N_.centroHex(m, melhor.q, melhor.r);
    mudarObj(id, 'marcar um ponto de descanso', x => {
      const ps = Array.isArray(x.pdesc) ? x.pdesc : (x.pdesc = []);
      if (ps.length >= N_.MAX_PARADAS) return false;
      ps.push({ x: Math.round(c.x * 100) / 100, y: Math.round(c.y * 100) / 100 });
    });
    App.selecionar([id]);
    if (estreito()) definirPainel(true);
    abrirAba('selecao');
  }
  // chegou ao fim da rota (só ida): vira e anda a mesma rota de volta (no começo dela, de novo para a frente)
  function voltarPelaRota(id) {
    const m0 = App.mapa, o0 = m0 && achar(m0, id);
    if (!o0) return;
    const ok = mudarObj(id, 'voltar pela mesma rota', x => { if (!x.rota || x.modo === 'circuito') return false; if (x.sentido === -1) delete x.sentido; else x.sentido = -1; x.prog = 0; delete x.espera; });
    if (ok !== false) avisoDesfazer(nomeDe(o0, m0) + ' agora ' + (o0.sentido === -1 ? 'vai de novo pela rota.' : 'volta pela mesma rota.'));
  }
  // os pontos da rota de alguém, no caminho inteiro (no circuito, fechada)
  function ptsDoCaminho(o, rt) { return o.modo === 'circuito' ? rt.pts.concat([rt.pts[0]]) : rt.pts; }
  function secParadas(o, m) {
    const id = o.id, N_ = N(), ps = Array.isArray(o.paradas) ? o.paradas : [], out = [];
    const naParada = (i, rot, fn) => mudarObj(id, rot, x => { const q = (x.paradas || [])[i]; if (!q) return false; return fn(q, x); });
    ps.forEach((p, i) => {
      out.push(h('div', { class: 'parada-li', 'data-k': 'o:' + id + ':par' + i },
        campoTexto('o:' + id + ':par' + i + ':nome', 'Parada ' + (i + 1), p.nome || '', v => naParada(i, 'mudar o nome da parada', q => { const t = v.trim(); if ((q.nome || '') === t) return false; if (t) q.nome = t; else delete q.nome; }),
          { max: 80, ph: N_.nomeDaParada(m, Object.assign({}, p, { nome: '' }), i) }),
        h('div', { class: 'row' },
          campoNumero('o:' + id + ':par' + i + ':n', 'Fica', p.n, n => naParada(i, 'mudar quanto tempo fica na parada', q => { if (q.n === n) return false; q.n = n; }), { min: 1, max: 9999 }),
          campoEscolha('o:' + id + ':par' + i + ':u', null, p.u, [['t', 'tempos de marcha'], ['d', 'dias']], v => naParada(i, 'mudar quanto tempo fica na parada', q => { if (q.u === v) return false; q.u = v; }), { rotulo: 'Em tempos de marcha ou em dias' }),
          botao('Centralizar', () => { const T = Tela(); if (T && T.centrar) T.centrar({ x: p.x, y: p.y }); }, { c: 'sm', k: 'o:' + id + ':par' + i + ':ir' }),
          botao('Tirar', () => tirarParada(id, i), { c: 'sm', k: 'o:' + id + ':par' + i + ':tirar' }))));
    });
    out.push(linha(botao(ps.length ? 'Marcar outra parada no mapa' : 'Marcar uma parada no mapa', () => marcarParada(id), { c: 'sm', k: 'o:' + id + ':parada', off: ps.length >= N_.MAX_PARADAS })));
    out.push(nota(ps.length ? 'Ao entrar no hexágono de uma parada, fica ali o tempo marcado e depois segue. As paradas aparecem como bandeirinhas na rota, com ' + (!o.tipo ? 'o grupo selecionado' : o.tipo === 'exercito' ? 'o exército selecionado' : 'ela selecionada') + '.' : 'Sem paradas, anda direto pela rota.'));
    return secao('Paradas', out);
  }
  function tirarParada(id, i) {
    mudarObj(id, 'tirar a parada', (x, mm) => {
      const ps = x.paradas || [], q = ps[i];
      if (!q) return false;
      // parado nesta parada: segue no próximo tempo
      const hx = N().hexDe(mm, x.x, x.y), ph = N().hexDe(mm, q.x, q.y);
      if (x.espera && hx && ph && hx.q === ph.q && hx.r === ph.r) delete x.espera;
      ps.splice(i, 1);
      if (!ps.length) delete x.paradas;
    });
  }
  async function marcarParada(id) {
    const T = Tela();
    if (!T || !T.escolherPonto || !App.podeEditar()) return;
    const idMapa = App.mapa.id;
    if (estreito()) definirPainel(false);
    const p = await T.escolherPonto('Clique na rota, onde fica a parada.');
    if (!p || !mesmoMapa(idMapa)) return;
    const m = App.mapa, o = achar(m, id), rt = o && achar(m, o.rota);
    if (!o || !rt) return;
    const N_ = N(), h0 = N_.hexDe(m, p.x, p.y);
    let melhor = null, d0 = Infinity;
    for (const hx of N_.caminhoHex(m, ptsDoCaminho(o, rt))) { const d = N_.distHex(hx, h0); if (d < d0) { d0 = d; melhor = hx; } }
    if (!melhor || d0 > 1) { App.toast('Clique em cima da rota (ou no hexágono do lado dela). Nada mudou.'); return; }
    if ((o.paradas || []).some(q => { const ph = N_.hexDe(m, q.x, q.y); return ph && ph.q === melhor.q && ph.r === melhor.r; })) { App.toast('Já há uma parada nesse hexágono. Nada mudou.'); return; }
    const c = N_.centroHex(m, melhor.q, melhor.r);
    mudarObj(id, 'marcar uma parada', x => {
      const ps = Array.isArray(x.paradas) ? x.paradas : (x.paradas = []);
      if (ps.length >= N_.MAX_PARADAS) return false;
      ps.push({ x: Math.round(c.x * 100) / 100, y: Math.round(c.y * 100) / 100, n: 1, u: 'd' });
    });
    App.selecionar([id]);
    if (estreito()) definirPainel(true);
    abrirAba('selecao');
  }
  // o evento que anda: a rota (escolher, desenhar ou traçar), quanto anda por tempo e o que faz no fim dela
  function secAndaEvento(o, m) {
    const id = o.id, N_ = N(), rotas = m.objs.filter(x => x.k === 't'), rota = achar(m, o.rota), out = [];
    out.push(campoEscolha('o:' + id + ':erota', 'Rota', o.rota || '', [['', rotas.length ? 'Não anda (fica onde está)' : 'Não anda (sem rotas no mapa)']].concat(rotas.map(t => [t.id, nomeDe(t, m)])),
      v => mudarObj(id, v ? 'pôr o evento numa rota' : 'tirar o evento da rota', x => {
        if ((x.rota || '') === v) return false;
        if (v) { x.rota = v; x.prog = 0; if (!x.pt) x.pt = 2; delete x.sentido; } else { delete x.rota; delete x.prog; delete x.pt; delete x.modo; delete x.sentido; }
      })));
    out.push(linha(
      botao('Desenhar a rota', () => desenharRotaPara(o), { c: 'sm', k: 'o:' + id + ':edesenhar', title: 'Clique os pontos no mapa: a rota nasce escondida, já é deste evento e ele vai para o começo dela' }),
      botao('Traçar entre dois marcadores…', () => abrirTracado(id), { c: 'sm', k: 'o:' + id + ':etracar', expandido: String(!!(tracado && tracado.id === id)) })));
    if (tracado && tracado.id === id) out.push(formTracado(o, m));
    if (rota) {
      out.push(h('div', { class: 'row' },
        campoNumero('o:' + id + ':ept', 'Anda por tempo (cubos)', o.pt || 2, n => mudarObj(id, 'mudar quanto o evento anda', x => { if (x.pt === n) return false; x.pt = n; }),
          { decimal: true, min: 0.1, max: 9999, erro: 'Use um número de cubos por tempo de marcha, de 0,1 a 9999.' }),
        campoEscolha('o:' + id + ':emodo', 'Ao chegar ao fim', o.modo || 'ida', Object.keys(N_.MODOS_ROTA).map(k => [k, N_.MODOS_ROTA[k]]), v => mudarModo(id, v))));
      if (o.prog > 0 || o.sentido === -1 || N_.dist(o, { x: rota.pts[0][0], y: rota.pts[0][1] }) > 0.5) out.push(linha(botao('Pôr no começo da rota', () => porNoComeco(id), { c: 'sm', k: 'o:' + id + ':ecomeco' })));
      out.push(nota('Enquanto acontece, o evento anda pela rota com o tempo do mapa ("+1 tempo" e "Próximo dia"), e a área vai junto.'));
    } else out.push(nota('Uma migração, uma peregrinação, uma caravana mercante… podem andar por uma rota com o tempo do mapa.'));
    return secao('Anda pelo mapa', out);
  }
  /* ---------------- (lote 7, parte 5c) o clima do dia e as zonas de perigo ---------------- */
  const climaDef = k => (N().CLIMAS || {})[k] || null;
  const sinal = n => (n > 0 ? '+' : '−') + fmt(Math.abs(n), 0);
  function textoEfZona(ef) {
    const p = [];
    if (ef.fad) p.push('Fadiga ' + sinal(ef.fad) + (Math.abs(ef.fad) === 1 ? ' passo' : ' passos'));
    if (ef.conf) p.push('Conforto ' + sinal(ef.conf));
    if (ef.san) p.push('Sanidade ' + sinal(ef.san));
    return p.join(', ');
  }
  const mesTxt = (m, dia) => N().dataDe(m.cal, dia).nomeMes;
  // o clima de hoje de uma região: o dela (com ajuste, ou escolhido à mão), senão o da de fora, senão o do mundo
  function climaDaRegiao(m, r, dia) {
    let p = r, n = 0;
    const manda = x => !!(x.clima || (x.chj && x.chj.d === dia) || climaDef(x.ch));
    while (p && n <= 12) { if (manda(p)) return Object.assign(N().climaDoDia(m, dia, p), { de: p }); p = p.pai ? achar(m, p.pai) : null; n++; }
    return Object.assign(N().climaDoDia(m, dia, null), { de: null });
  }
  function linhaDoClima(c, k, txt) {
    const def = climaDef(c.k);
    return def ? h('div', { class: 'clima-linha', 'data-k': k }, glifo(def.svg, 20), h('b', { text: def.nome }), txt ? h('small', { text: txt }) : null) : null;
  }
  // (lote 9) "Hoje: Ensolarado (do 1º ao 4º) → Nublado (desde o 5º)" — os trechos iguais seguidos viram um só
  function textoDosTrechos(v, seq) {
    const C = N().CLIMAS, partes = [];
    for (let i = 0; i < seq.length; i++) {
      const a = seq[i];
      let j2 = i;
      while (j2 + 1 < seq.length && seq[j2 + 1].k === a.k) j2++;
      const ult = j2 === seq.length - 1, ate = ult ? null : seq[j2 + 1].de - 1;
      partes.push(C[a.k].nome + (ult ? ' (desde o ' + a.de + 'º, agora)' : ate === a.de ? ' (no ' + a.de + 'º)' : ' (do ' + a.de + 'º ao ' + ate + 'º)'));
      i = j2;
    }
    return 'Hoje: ' + partes.join(' → ') + '.';
  }
  function secClimaHoje(v, ed) {
    const N_ = N();
    if (!N_.climaDoDia) return null;
    const dia = v.cal.dia, c = N_.climaDoDia(v, dia, null), out = [];
    const cada = N_.cadaDe ? N_.cadaDe(v) : 0, tr = N_.trechoAgora ? N_.trechoAgora(v) : 0;
    out.push(linhaDoClima(c, 'hoje:clima', c.mao ? 'escolhido por você' : ed ? 'sorteado pela tabela de ' + mesTxt(v, dia) : ''));
    // (lote 9) o clima ao longo do dia: o que já passou e quando muda de novo (o mestre; quem joga vê o de agora)
    if (ed && cada > 0 && N_.climasDoDia) {
      const prox = tr + 1 < N_.trechosDoDia(v) ? N_.comecoDoTrecho(v, tr + 1) : null;
      out.push(h('p', { class: 'note', 'data-k': 'hoje:trechos', text: textoDosTrechos(v, N_.climasDoDia(v, dia, null, tr)) + ' Muda aos poucos a cada ' + (cada === 1 ? 'tempo' : cada + ' tempos') + (prox ? ': a próxima mudança no ' + prox + 'º tempo.' : ': a próxima, amanhã.') }));
    }
    const regs = v.objs.filter(r => r.k === 'r' && (r.clima || (r.chj && r.chj.d === dia) || climaDef(r.ch)));
    if (regs.length) out.push(nota('Nas regiões: ' + regs.map(r => nomeDe(r, v) + ', ' + climaDef(N_.climaDoDia(v, dia, r).k).nome.toLocaleLowerCase('pt-BR')).join('; ') + '.'));
    if (ed) {
      const Cs = N_.CLIMAS, sorteado = N_.climaSorteadoDoTrecho ? N_.climaSorteadoDoTrecho(v, dia, tr, null) : N_.climaSorteado(v, dia, null);
      out.push(campoEscolha('hoje:clima-mao', cada > 0 ? 'Trocar o de agora' : 'Trocar o de hoje', c.mao ? c.k : '', [['', 'O sorteado (' + Cs[sorteado].nome + ')']].concat(Object.keys(Cs).map(k => [k, Cs[k].nome])),
        k => App.mudar(k ? 'trocar o clima de hoje' : 'voltar ao clima sorteado', m => {
          const cl = m.clima || (m.clima = {}), t = N().trechoAgora ? N().trechoAgora(m) : 0;
          if (k) { if (cl.mao && cl.mao.d === m.cal.dia && (cl.mao.t || 0) === t && cl.mao.k === k) return false; cl.mao = t > 0 ? { d: m.cal.dia, t, k } : { d: m.cal.dia, k }; } else { if (!cl.mao) return false; delete cl.mao; }
        }), { dica: cada > 0 ? 'Vale até a próxima mudança; depois o clima segue aos poucos a partir dele.' : 'Vale até o fim do dia.' }));
      out.push(linha(botao('A tabela do clima…', () => { focarDepois = 'clima:mes'; abrirAba('mapa'); }, { c: 'sm', k: 'hoje:tabela' })));
      out.push(nota('O clima sai da tabela do mês (as regiões ajustam)' + (cada > 0 ? ' e muda aos poucos ao longo do dia (de quantos em quantos tempos: no calendário, na aba Mapa)' : '') + '. Vale nas cenas geradas daqui e, com o mapa mostrado aos jogadores, no Acampamento (a proposta do Conforto da noite) e na Meditação (o enfeite do fundo).'));
    }
    return secao('O clima de hoje', out);
  }
  // a região: o clima de hoje dela, trocar o de hoje e o ajuste (clima por clima)
  let ajusteAberto = null;
  function secClimaRegiao(o, m) {
    const N_ = N();
    if (!N_.climaDoDia) return null;
    const Cs = N_.CLIMAS, A = N_.AJUSTES_CLIMA, id = o.id, dia = m.cal.dia, c = climaDaRegiao(m, o, dia), out = [];
    const aj = o.clima || {}, nAj = Object.keys(aj).length;
    out.push(linhaDoClima(c, 'o:' + id + ':clima-hoje', c.mao ? 'escolhido por você' : c.de === o ? 'com o ajuste desta região' : c.de ? 'o de ' + nomeDe(c.de, m) : 'o do mundo'));
    const tr = N_.trechoAgora ? N_.trechoAgora(m) : 0, cada = N_.cadaDe ? N_.cadaDe(m) : 0;          // (lote 9) o trecho do dia
    const proprio = o.clima ? (N_.climaSorteadoDoTrecho ? N_.climaSorteadoDoTrecho(m, dia, tr, o) : N_.climaSorteado(m, dia, o)) : null;
    out.push(campoEscolha('o:' + id + ':chj', cada > 0 ? 'Trocar o de agora aqui' : 'Trocar o de hoje aqui', o.chj && o.chj.d === dia && (o.chj.t || 0) === tr ? o.chj.k : '', [['', proprio ? 'O sorteado (' + Cs[proprio].nome + ')' : 'O de fora (' + climaDef(climaDaRegiao(m, Object.assign({}, o, { chj: null, clima: null }), dia).k).nome + ')']].concat(Object.keys(Cs).map(k => [k, Cs[k].nome])),
      k => mudarObj(id, k ? 'trocar o clima de hoje na região' : 'voltar ao clima sorteado na região', (x, mm) => {
        const t = N().trechoAgora ? N().trechoAgora(mm) : 0;
        if (k) { if (x.chj && x.chj.d === mm.cal.dia && (x.chj.t || 0) === t && x.chj.k === k) return false; x.chj = t > 0 ? { d: mm.cal.dia, t, k } : { d: mm.cal.dia, k }; } else { if (!x.chj) return false; delete x.chj; }
      }), { dica: cada > 0 ? 'Vale até a próxima mudança; depois o clima daqui segue aos poucos a partir dele.' : 'Vale até o fim do dia.' }));
    const resumoAj = nAj ? Object.keys(aj).map(k => A[aj[k]].nome.toLocaleLowerCase('pt-BR') + ' ' + Cs[k].nome.toLocaleLowerCase('pt-BR')).join(', ') : 'como o do mundo';
    out.push(h('p', { class: 'note', 'data-k': 'o:' + id + ':aj-resumo', text: 'O clima desta região: ' + resumoAj + '.' }));
    out.push(linha(botao(ajusteAberto === id ? 'Fechar o ajuste' : 'Ajustar o clima da região…', () => { ajusteAberto = ajusteAberto === id ? null : id; agendar(); }, { c: 'sm', k: 'o:' + id + ':ajustar', expandido: String(ajusteAberto === id) })));
    if (ajusteAberto === id) {
      out.push(h('div', { class: 'tabela-clima' }, Object.keys(Cs).map(k => h('label', { class: 'tc-linha' }, glifo(Cs[k].svg, 16), h('span', { text: Cs[k].nome }),
        campoEscolha('o:' + id + ':aj:' + k, null, aj[k] || '', [['', 'Como o mundo']].concat(Object.keys(A).map(a => [a, A[a].nome])), v => mudarObj(id, 'ajustar o clima da região', x => {
          const a2 = Object.assign({}, x.clima || {});
          if ((a2[k] || '') === v) return false;
          if (v) a2[k] = v; else delete a2[k];
          if (Object.keys(a2).length) x.clima = a2; else delete x.clima;
        }), { rotulo: Cs[k].nome + ' nesta região' })))));
      if (nAj) out.push(linha(botao('Como o do mundo', () => mudarObj(id, 'tirar o ajuste do clima da região', x => { if (!x.clima) return false; delete x.clima; }), { c: 'sm', k: 'o:' + id + ':aj-tirar' })));
      out.push(nota('"Nunca" tira o clima daqui; "Menos" corta a chance pela metade; "Mais" dobra e "Muito mais" multiplica por quatro (os dois dão um pouco de chance mesmo no mês em que o mundo não tem aquele clima). O dia é o mesmo do mundo: um dia de tempestade no mundo tende a ser de tempestade aqui — se a região não tiver tempestade, vira outro clima.'));
    }
    return secao('Clima', out);
  }
  // a tabela do clima (aba Mapa): a chance de cada clima, mês a mês
  let mesClima = null;
  function secTabelaClima(m) {
    const N_ = N();
    if (!N_.tabelaPadraoDoMes) return null;
    const Cs = N_.CLIMAS, meses = m.cal.meses, hojeMes = N_.dataDe(m.cal, m.cal.dia).mes, nM = meses.length;
    const i = mesClima != null && mesClima < nM ? mesClima : hojeMes;
    const tab = m.clima && Array.isArray(m.clima.tab) ? m.clima.tab : null, pesos = tab && tab[i] ? tab[i] : N_.tabelaPadraoDoMes(i, nM), padrao = N_.tabelaPadraoDoMes(i, nM);
    const soma = Object.keys(Cs).reduce((t, k) => t + (pesos[k] || 0), 0), out = [];
    out.push(campoEscolha('clima:mes', 'Mês', String(i), meses.map((x, k) => [String(k), x.nome + (k === hojeMes ? ' (hoje)' : '')]), v => { mesClima = Number(v); agendar(); return true; }));
    out.push(h('div', { class: 'tabela-clima' }, Object.keys(Cs).map(k => h('label', { class: 'tc-linha' }, glifo(Cs[k].svg, 16), h('span', { text: Cs[k].nome }),
      campoNumero('clima:' + i + ':' + k, null, pesos[k] || 0, n => mudarTabelaClima(i, k, n), { min: 0, max: 100, erro: 'Use de 0 a 100 (%).' }), h('small', { text: '%' })))));
    out.push(nota(soma === 100 ? 'Somam 100%.' : 'Somam ' + fmt(soma, 0) + '%: as chances valem na proporção (é como se fossem ' + Object.keys(Cs).filter(k => pesos[k] > 0).map(k => Cs[k].nome.toLocaleLowerCase('pt-BR') + ' ' + fmt(pesos[k] * 100 / soma, 0) + '%').join(', ') + ').'));
    const igual = Object.keys(Cs).every(k => (pesos[k] || 0) === (padrao[k] || 0));
    out.push(linha(
      igual ? null : botao('Voltar à de começo neste mês', () => mudarTabelaClima(i, null), { c: 'sm', k: 'clima:padrao' }),
      tab ? botao('Voltar à de começo em todos os meses', () => App.mudar('voltar à tabela do clima de começo', mm => { if (!mm.clima || !mm.clima.tab) return false; delete mm.clima.tab; if (!Object.keys(mm.clima).length) delete mm.clima; }), { c: 'sm', k: 'clima:padrao-todos' }) : null));
    out.push(nota('A cada dia, o clima de hoje é sorteado com as chances do mês (a de começo vem da estação: inverno, primavera, verão, outono). As regiões ajustam no painel de cada uma; o de hoje você troca na aba Hoje.'));
    return secao('A tabela do clima', out);
  }
  function mudarTabelaClima(i, k, n) {
    return App.mudar(k ? 'mudar a tabela do clima' : 'voltar o mês à tabela de começo', mm => {
      const nM = mm.cal.meses.length, cl = mm.clima || (mm.clima = {});
      if (!Array.isArray(cl.tab)) cl.tab = Array.from({ length: nM }, (_, j) => N().tabelaPadraoDoMes(j, nM));
      const atual = Object.assign({}, cl.tab[i] || N().tabelaPadraoDoMes(i, nM));
      if (k) { if ((atual[k] || 0) === n) return false; atual[k] = n; } else Object.assign(atual, N().tabelaPadraoDoMes(i, nM));
      if (!Object.values(atual).some(x => x > 0)) { App.toast('Pelo menos um clima precisa ter chance neste mês. Nada mudou.'); return false; }
      cl.tab[i] = atual;
    });
  }
  /* A proposta das zonas de perigo: o grupo que terminou o dia dentro de uma (no "Próximo dia", ou num "+1 tempo" que
     virou o dia) — a Fadiga, o Conforto e a Sanidade da equipe (os personagens dos jogadores da campanha), com a prévia
     de cada um; você escolhe quem e aplica, ou deixa para lá. Um Desfazer volta as fichas. Sem mesa, só o aviso. */
  async function equipeDaMesa() {
    const TC_ = window.TC;
    if (!App.naMesa || !TC_ || !TC_.dados || !TC_.dados.disponivel() || !TC_.rules || !TC_.rules.mexerNaMente) return null;
    const P = TC_.dados.col('personagens');
    await P.pronta;
    const st = (TC_.ponte && TC_.ponte.estado) || {}, camp = st.campanha ? st.campanha.id : null;
    const ehJog = id => !!id && (st.membros || []).some(x => x.id === id && (x.cargo ? x.cargo !== 'mestre' : x.papel === 'jogador'));
    const lista = P.todas().filter(l => l && !l.apagado && ehJog(l.dono_id) && !(l.ficha && l.ficha.petDe) && (!camp || l.campanha === camp))
      .map(l => ({ id: l.id, nome: l.nome || 'Sem nome', uso: { mente: true, fadiga: !!TC_.rules.usaFadiga(l.estado || {}, true) } }));
    return { P, R: TC_.rules, lista };
  }
  async function proporZonas(props) {
    for (const p of props) { if (await propostaDaZona(p) === 'fim') break; }
  }
  async function propostaDaZona(p) {
    const efTxt = textoEfZona(p.ef);
    if (!efTxt) return;
    const onde = p.zonas.join(' e ');
    const eq = await equipeDaMesa();
    if (!eq || !eq.lista.length) { App.toast('Um dia em ' + onde + ' (' + p.nome + '): ' + efTxt + '.' + (eq ? ' Não há personagem de jogador na campanha.' : ' Sem mesa, as fichas não mudam: aplique à mão, se quiser.')); return; }
    const nomeFad = n => (eq.R.FADIGA || [])[n] || String(n);
    const linhas = eq.lista.map(x => {
      const l = eq.P.pegar(x.id), r = eq.R.mexerNaMente((l && l.estado) || {}, p.ef, x.uso), partes = [];
      if (r.so.includes('fad')) partes.push('Fadiga ' + nomeFad(r.antes.fad) + ' → ' + nomeFad(r.depois.fad));
      if (r.so.includes('conf')) partes.push('Conforto ' + r.antes.conf + ' → ' + r.depois.conf);
      if (r.so.includes('san')) partes.push('Sanidade ' + r.antes.san + ' → ' + r.depois.san);
      return [x.id, x.nome + ': ' + (partes.join(' · ') || 'nada muda (já no limite)')];
    });
    const v = await janela({ titulo: 'Um dia em ' + onde + ' — ' + p.nome, texto: 'Por um dia ali: ' + efTxt + '. Aplicar na equipe? Desmarque quem não estava junto.', ok: 'Aplicar', cancelar: 'Agora não',
      campos: [{ id: 'quem', rotulo: 'Quem recebe', tipo: 'caixas', opcoes: linhas, valor: linhas.map(x => x[0]) }] });
    if (!v) return;
    const quem = Array.isArray(v.quem) ? v.quem : [], antes = [], nomes = [];
    for (const x of eq.lista) {
      if (!quem.includes(x.id)) continue;
      const l = eq.P.pegar(x.id); if (!l) continue;
      const r = eq.R.mexerNaMente(l.estado || {}, p.ef, x.uso);
      if (!r.so.length) continue;
      antes.push({ id: l.id, estado: l.estado || {} });
      eq.P.gravar(l.id, { estado: r.estado });
      nomes.push(x.nome);
    }
    if (!nomes.length) { App.toast('Nada mudou: os valores já estavam no limite.'); return; }
    const resumo = efTxt + ' para ' + nomes.join(', ') + ' — um dia em ' + onde + '.';
    if (App.publicarNaMesa) App.publicarNaMesa('Um dia em ' + onde, resumo, false);
    App.toast('Feito: ' + resumo, 'Desfazer', () => { for (const a of antes) eq.P.gravar(a.id, { estado: a.estado }); App.toast('As fichas voltaram ao que eram.'); });
  }
  function secRota(o, m, grava) {
    const N_ = N(), id = o.id, un = N_.compPolilinha(o.pts), out = [];
    out.push(campoEscolha('o:' + id + ':via', 'Desenho', o.via, Object.keys(N_.VIAS).map(k => [k, N_.VIAS[k].nome]), grava('mudar o desenho da rota', (x, v) => { x.via = v; }),
      { dica: 'É só o desenho: quanto se anda por tempo é o grupo quem diz, e o terreno de cada hexágono pesa no caminho.' }));
    const rh = rotaHex(m, o), grupos = m.objs.filter(g => g.k === 'g' && g.rota === id);
    if (rh) {
      out.push(h('p', { class: 'status' }, h('b', { text: plHex(rh.hexes) }), ' · ' + fmt(rh.cubos, 0) + ' cubos pelo terreno, de ponta a ponta'));
      // (quanto leva, em tempos de marcha — e em dias, quando passa de um)
      const p0 = N_.CUBOS_DIA / tpdDe(m), ritmos = grupos.length ? grupos.map(g => [nomeDe(g, m), passoDoGrupo(m, g)]) : [['A ' + fmt(p0, 1) + ' cubos por tempo', p0]];
      out.push(h('div', { class: 'tabela' }, ritmos.map(([nome, c]) => h('div', null, h('span', { text: nome }), h('b', { text: duracaoTxt(m, rh.cubos / Math.max(0.1, c)) })))));
    } else out.push(h('div', { class: 'row' }, nota(fmt(un, 0) + ' unidades do mapa. Com a grade de hexágonos, aparecem os cubos e o tempo de viagem.'), botao('Definir a grade', () => abrirAba('terreno'), { c: 'sm', k: 'o:ir-grade' })));
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

  /* A zona de guerra: os lados (as cores das listras), quando começa e quanto dura (como o evento), e as fases: a
     forma da zona a partir de cada dia (a de hoje é a que se arrasta no mapa). */
  function secZona(o, m, grava) {
    const N_ = N(), id = o.id, dia = m.cal.dia, ini = o.ini == null ? dia : o.ini, ops = [['', 'Nenhuma']].concat(m.faccoes.map(f => [f.id, nomeFac(f)])), out = [];
    const perigo = zonaDePerigo(o);
    if (perigo) {
      // (lote 7, parte 5c) a zona de perigo: o tipo e o que um dia dentro dela mexe na ficha (os de começo do tipo, ou os seus)
      const Z = N_.ZONAS, pad = Z[o.tipo].ef, ef = o.ef || pad;
      const numero = (k, rot, lim) => campoNumero('o:' + id + ':z' + k, rot, ef[k], grava('mudar o que a zona mexe', (x, n) => { const e = Object.assign({}, x.ef || Z[x.tipo].ef); if (e[k] === n) return false; e[k] = n; x.ef = e; }), { min: -lim, max: lim });
      out.push(campoEscolha('o:' + id + ':ztipo', 'Tipo', o.tipo, Object.keys(Z).filter(k => k !== 'guerra').map(k => [k, Z[k].nome]), grava('mudar o tipo da zona', (x, v) => { if (x.tipo === v) return false; x.tipo = v; delete x.ef; })));
      out.push(h('div', { class: 'row' }, numero('fad', 'Fadiga (passos)', 5), numero('conf', 'Conforto', 100), numero('san', 'Sanidade', 100)));
      if (o.ef && (o.ef.fad !== pad.fad || o.ef.conf !== pad.conf || o.ef.san !== pad.san)) out.push(linha(botao('Voltar aos números do tipo', () => mudarObj(id, 'voltar a zona aos números do tipo', x => { delete x.ef; }), { c: 'sm', k: 'o:' + id + ':zpadrao', title: 'Os de começo: ' + textoEfZona(pad) })));
      out.push(nota('Por dia: o grupo que termina o dia dentro dela recebe, no "Próximo dia", a proposta de mexer na Fadiga, no Conforto e na Sanidade da equipe — com a prévia de cada um, e você escolhe quem. Para menos, use o sinal de menos.'));
    } else {
      if (!m.faccoes.length) out.push(h('div', { class: 'row' }, nota('Crie facções para dar os lados (e as cores) da guerra.'), botao('Criar facção', () => { abrirAba('faccoes'); novaFaccao(); }, { c: 'sm', k: 'o:criar-fac' })));
      out.push(h('div', { class: 'row' },
        campoEscolha('o:' + id + ':a', 'Lado A', o.a || '', ops, grava('mudar o lado A', (x, v) => { x.a = v || null; })),
        campoEscolha('o:' + id + ':b', 'Lado B', o.b || '', ops, grava('mudar o lado B', (x, v) => { x.b = v || null; }))));
    }
    out.push(h('div', { class: 'field' }, h('span', { text: 'Começa em' }),
      h('div', { class: 'data-linha' }, h('b', { text: dataTxt(m, ini) }),
        botao('Hoje', () => mudarObj(id, 'mudar o começo', x => { moverInicio(x, dia); }), { c: 'sm', k: 'o:ini-hoje', off: ini === dia }),
        botao('Escolher…', async () => {
          const idMapa = m.id, d = await escolherData(perigo ? 'Quando a zona começa?' : 'Quando a guerra começa?', ini, { ok: 'Escolher' });
          if (d != null && mesmoMapa(idMapa)) mudarObj(id, 'mudar o começo', x => { moverInicio(x, d); });
        }, { c: 'sm', k: 'o:ini-escolher' }))));
    const semFim = o.fim == null;
    out.push(h('div', { class: 'row' },
      campoNumero('o:' + id + ':dura', 'Dura (dias)', semFim ? '' : o.fim - ini + 1, grava('mudar a duração', (x, n) => { x.fim = (x.ini == null ? dia : x.ini) + n - 1; }),
        { min: 1, max: 1e6, off: semFim, ph: semFim ? 'sem fim' : null }),
      h('div', { class: 'field fim-campo' }, caixa('o:' + id + ':semfim', 'Sem fim', semFim, grava('mudar a duração', (x, v) => { x.fim = v ? null : (x.ini == null ? dia : x.ini) + 29; })))));
    const st = statusZona(o, dia);
    out.push(h('p', { class: 'status' }, h('span', { class: 'tag' + (st === 'acontecendo hoje' ? ' guerra' : ''), text: st }), o.fim != null ? ' · termina em ' + dataTxt(m, o.fim) : ''));
    out.push(nota('Enquanto acontece, a zona pulsa no mapa; fora das datas, os jogadores não a veem.'));
    // as fases
    const fases = o.fases || [], iHoje = N_.faseNoDia(o, dia), temHoje = fases.some(f => f.dia === dia), fs = [];
    fs.push(h('div', { class: 'tabela fases' },
      h('div', null, h('span', { text: 'Desde ' + dataTxt(m, ini) }), h('b', { text: iHoje < 0 && dia >= ini ? 'hoje' : '' })),
      fases.map((f, i) => h('div', null, h('span', { text: 'A partir de ' + dataTxt(m, f.dia) }), h('b', { text: i === iHoje ? 'hoje' : '' }),
        h('button', { type: 'button', class: 'ib', 'data-k': 'o:' + id + ':fase-x:' + f.dia, title: 'Tirar esta fase', 'aria-label': 'Tirar a fase de ' + dataTxt(m, f.dia),
          onclick: () => { if (mudarObj(id, 'tirar a fase', x => { x.fases = x.fases.filter(y => y.dia !== f.dia); }) !== false) avisoDesfazer('A fase saiu: nesses dias vale a forma de antes.'); } }, glifo(X_SVG, 14))))));
    fs.push(linha(botao('Mudar a forma a partir de hoje', () => {
      const r = mudarObj(id, 'nova fase da zona', x => {
        if (x.fases.some(y => y.dia === dia)) return false;
        x.fases.push({ dia, pts: N_.copia(N_.formaNoDia(x, dia)) });
        x.fases.sort((a, b) => a.dia - b.dia);
      });
      if (r !== false) { App.usarFerramenta('sel'); avisoDesfazer('Nova fase a partir de hoje: arraste os pontos da zona para mudar a forma dela. Nos dias de antes, vale a forma antiga.'); }
    }, { c: 'sm', k: 'o:' + id + ':fase', off: temHoje || dia < ini || fases.length >= ((N_.LIMITES && N_.LIMITES.fases) || 60) })));
    fs.push(nota(temHoje ? 'Uma fase começa hoje: arraste os pontos da zona no mapa para mudar a forma dela.'
      : 'A zona pode crescer, encolher ou mudar de lugar com o tempo: cada fase guarda a forma dela a partir de um dia. Crie uma hoje e arraste os pontos.'));
    return [secao(perigo ? 'Zona de perigo' : 'Zona de guerra', out), secao('Fases', fs)];
  }
  function secLinha(o, m, grava) {
    const N_ = N(), L0 = N_.LINHAS || {}, id = o.id, def = L0[o.estilo] || { nome: 'Linha', cor: '#4f86c0' }, out = [];
    out.push(campoEscolha('o:' + id + ':estilo', 'Desenho', o.estilo, Object.keys(L0).map(k => [k, L0[k].nome]), grava('mudar o desenho da linha', (x, v) => { x.estilo = v; })));
    out.push(campoNumero('o:' + id + ':larg', 'Largura (unidades do mapa)', o.larg, grava('mudar a largura', (x, n) => { x.larg = n; }),
      { decimal: true, min: 0.5, max: 100000, erro: 'Use uma largura maior que zero.', dica: o.estilo === 'rio' ? 'A largura na foz (o último ponto); na nascente, um quinto dela.' : null }));
    out.push(h('div', { class: 'linha-cor' }, campoCor('o:' + id + ':cor', 'Cor', o.cor || def.cor, grava('mudar a cor', (x, v) => { x.cor = v; })),
      h('span', { class: 'note', text: o.cor ? 'Cor própria' : 'Cor do desenho' }),
      o.cor ? botao('Usar a cor do desenho', () => mudarObj(id, 'mudar a cor', x => { x.cor = ''; }), { c: 'sm', k: 'o:' + id + ':cor0' }) : null));
    const un = N_.compPolilinha(o.pts);
    out.push(nota((temGrade(m) ? 'Cerca de ' + fmt(cubos(m, un), 0) + ' cubos' : fmt(un, 0) + ' unidades do mapa') + ' de ponta a ponta. O nome aparece ao longo da linha.'));
    if (o.estilo === 'rio') out.push(linha(botao('Inverter o sentido', () => mudarObj(id, 'inverter o rio', x => { x.pts.reverse(); }), { c: 'sm', k: 'o:' + id + ':inverter', title: 'O rio corre do primeiro ponto (a nascente) ao último (a foz)' })));
    return secao(def.nome, out);
  }
  function secCarimbo(o, grava) {
    const C0 = N().CARIMBOS || {}, id = o.id, def = C0[o.ic] || { cor: '#5d9a4e' };
    return secao('Carimbo',
      h('div', { class: 'grade carimbos', role: 'group', 'aria-label': 'Desenho do carimbo', onkeydown: setasNaGrade }, Object.keys(C0).map(k => h('button', { type: 'button', 'data-k': 'cb:' + id + ':' + k,
        'aria-pressed': String(o.ic === k), tabindex: o.ic === k ? '0' : '-1', title: C0[k].nome, 'aria-label': C0[k].nome, style: { color: C0[k].cor },
        onclick: () => mudarObj(id, 'trocar o carimbo', x => { x.ic = k; }) }, glifoCarimbo(C0[k].svg, 24)))),
      campoNumero('o:' + id + ':tam', 'Tamanho (unidades do mapa)', o.tam, grava('mudar o tamanho', (x, n) => { x.tam = n; }), { decimal: true, min: 1, max: 100000, erro: 'Use um tamanho maior que zero.' }),
      h('div', { class: 'linha-cor' }, campoCor('o:' + id + ':cor', 'Cor do carimbo', o.cor || def.cor, grava('mudar a cor', (x, v) => { x.cor = v; })),
        h('span', { class: 'note', text: o.cor ? 'Cor própria' : 'Cor do desenho' }),
        o.cor ? botao('Usar a cor do desenho', () => mudarObj(id, 'mudar a cor', x => { x.cor = ''; }), { c: 'sm', k: 'o:' + id + ':cor0' }) : null),
      caixa('o:' + id + ':vira', 'Espelhado', o.vira, grava('espelhar o carimbo', (x, v) => { x.vira = !!v; })));
  }
  function secTexto(o, grava) {
    const F = N().FONTES || {}, id = o.id;
    const esp = ESPACOS.reduce((a, b) => (Math.abs(Number(b[0]) - (o.esp || 0)) < Math.abs(Number(a[0]) - (o.esp || 0)) ? b : a))[0];
    return secao('Texto',
      h('div', { class: 'row' },
        campoEscolha('o:' + id + ':fonte', 'Letra', o.fonte, Object.keys(F).map(k => [k, F[k].nome]), grava('mudar a letra', (x, v) => { x.fonte = v; })),
        campoEscolha('o:' + id + ':esp', 'Espaço entre as letras', esp, ESPACOS, grava('mudar o espaço entre as letras', (x, v) => { x.esp = Number(v); }))),
      h('div', { class: 'row' },
        campoNumero('o:' + id + ':tam', 'Tamanho', o.tam, grava('mudar o tamanho do texto', (x, n) => { x.tam = n; }), { decimal: true, min: 1, max: 100000, erro: 'Use um tamanho maior que zero (em unidades do mapa).' }),
        campoNumero('o:' + id + ':rot', 'Girar (graus)', o.rot, grava('girar o texto', (x, n) => { x.rot = n; }), { min: -180, max: 180, vazio: 0, erro: 'Use de -180 a 180 graus.' })),
      h('div', { class: 'linha-cor' }, campoCor('o:' + id + ':cor', 'Cor do texto', o.cor || '#2a2118', grava('mudar a cor', (x, v) => { x.cor = v; })),
        h('span', { class: 'note', text: o.cor ? 'Cor própria' : 'Tinta de mapa' }),
        o.cor ? botao('Usar a tinta de mapa', () => mudarObj(id, 'mudar a cor', x => { x.cor = ''; }), { c: 'sm', k: 'o:' + id + ':cor0' }) : null));
  }
  // O texto novo (ferramenta Desenho → Texto, ou o menu do mapa): pergunta o que escrever e põe no ponto.
  async function novoTexto(campos) {
    if (!App.podeEditar() || !App.mapa) return;
    { const Cm = window.MundoCamadas; if (Cm && !Cm.livre('enfeites')) { Cm.avisar('enfeites'); return; } }     // (lote 8)
    const idMapa = App.mapa.id;
    const r = await janela({ titulo: 'Novo texto', ok: 'Pôr no mapa', texto: 'O que vai escrito no mapa (o nome de um mar, de uma cordilheira, um aviso…).',
      campos: [{ id: 't', rotulo: 'Texto', tipo: 'text', valor: '', ph: 'Ex.: Mar das Brumas', max: 400 }],
      ler: v => { const t = String(v.t || '').trim(); if (!t) throw new Error('Escreva o texto.'); return t; } });
    if (r == null || !mesmoMapa(idMapa)) return;
    let id = null;
    App.mudar('novo texto', mm => {
      const o = N().objNovo('x', Object.assign({}, campos, { nome: r, oculto: !!(App.opt && App.opt.oculto) }));
      if (!o) return false;
      mm.objs.push(o); id = o.id;
    });
    if (!id) return;
    if (App.ferramenta !== 'sel') App.usarFerramenta('sel');
    App.selecionar([id]);
    if (!estreito()) abrirAba('selecao');
  }

  /* ---------------- aba Hoje ---------------- */
  function abaHoje(v) {
    const N_ = N(), ed = App.podeEditar(), mestre = App.papel === 'mestre' && !App.comoJogador, dia = v.cal.dia, out = [];
    out.push(h('h3', { text: N_.textoDataSemana(v.cal, dia) }), h('p', { class: 'sub', 'data-k': 'hoje:tempo-txt', text: tempoTxt(v).replace(/^./, c => c.toUpperCase()) + '.' }));
    if (ed) {
      out.push(h('div', { class: 'row' },
        botao('+1 tempo', () => passarTempoMundo('tempo'), { c: 'pri', k: 'hoje:tempo', title: 'Os grupos com rota andam um tempo de marcha, e o relógio avança' }),
        botao('Próximo dia', () => passarTempoMundo('dia'), { k: 'hoje:+1', title: 'Os grupos com rota andam o que falta do dia (cada um no seu passo), e o relógio vai para o 1º tempo de amanhã' }),
        botao('+7 dias', () => passarDias(7), { k: 'hoje:+7' }),
        botao('−1 dia', () => passarDias(-1), { k: 'hoje:-1', off: dia <= 0 }),
        botao('Ir para a data…', irParaData, { k: 'hoje:ir' })));
      out.push(nota('"+1 tempo" e "Próximo dia" levam junto todos os grupos que têm rota, cada um no seu passo. "+7 dias", "−1 dia" e "Ir para a data" só mudam o calendário: os grupos ficam onde estão.'));
    }
    // (lote 7, parte 5c) o clima de hoje
    out.push(secClimaHoje(v, ed));
    // eventos
    const ativos = N_.eventosDoDia(v, dia);
    out.push(secao('Eventos de hoje', ativos.length
      ? h('div', { class: 'lista' }, ativos.map(e => itemLista(e, v, mestre, (N_.EVENTOS[e.tipo] || N_.EVENTOS.guerra).nome + ' · força ' + e.forca + (ed && e.fim != null ? ' · até ' + dataTxt(v, e.fim) : ''))))
      : nota('Nenhum evento acontecendo hoje.'),
      // (lote 7, parte 5a) os desenhos dos eventos se mexem devagar; quem preferir, desliga (só neste aparelho)
      caixa('hoje:animar', 'Animar os eventos (neste aparelho)', ler().animar !== false, v => { lembrar({ animar: !!v }); const T = Tela(); if (T) T.redesenhar(); })));
    // (lote 7, parte 5a) os eventos na viagem dos grupos: quem está dentro de um evento que pesa e quem está parado
    // antes de uma passagem fechada (só o mestre: o peso é dele)
    if (ed) { const nv = naViagem(v); if (nv.length) out.push(secao('Os eventos na viagem', h('div', { class: 'lista' }, nv.map(([g, txt]) => h('button', { type: 'button', class: 'li clic', 'data-k': 'nv:' + g.id, onclick: () => irPara(g.id) }, icone(g, v), h('span', { class: 'tx' }, h('b', { text: nomeDe(g, v) }), h('small', { text: txt }))))))); }
    { const ms = secMissoesNoMapa(v, mestre); if (ms) out.push(ms); }        // (lote 9) as missões no mapa
    const guerras = v.objs.filter(o => o.k === 'z' && N_.zonaAtiva(o, dia));
    if (guerras.length) out.push(secao('Guerras de hoje', h('div', { class: 'lista' }, guerras.map(z => itemLista(z, v, mestre, 'Desde ' + dataTxt(v, z.ini == null ? dia : z.ini) + (ed && z.fim != null ? ' · até ' + dataTxt(v, z.fim) : ''))))));
    if (ed) {
      const breve = v.objs.filter(e => e.k === 'e' && e.ini != null && e.ini > dia && e.ini - dia <= 30).sort((a, b) => a.ini - b.ini);
      if (breve.length) out.push(secao('Nos próximos 30 dias', h('div', { class: 'lista' }, breve.map(e => itemLista(e, v, true, statusEvento(e, dia) + ' · ' + dataTxt(v, e.ini))))));
    }
    // grupos (lote 7, parte 5b: os do mundo — a caravana, a patrulha, o exército — ficam em "Pelo mapa", mais abaixo)
    const grupos = v.objs.filter(o => o.k === 'g' && !grupoDoMundo(o)), doMundo = v.objs.filter(o => grupoDoMundo(o));
    const gs = [];
    if (encontro && ed && (encontro.grupo ? !!achar(v, encontro.grupo) : true)) gs.push(cartaoEncontro());
    if (!grupos.length) gs.push(nota(ed ? 'Nenhum grupo no mapa. Use a ferramenta Grupo (G) para pôr os personagens.' : 'Nenhum grupo à vista.'));
    for (const g of grupos) {
      const p = progressoTxt(v, g);
      gs.push(h('div', { class: 'gr', 'data-k': 'gr:' + g.id },
        h('button', { type: 'button', class: 'li clic', 'data-k': 'gr-li:' + g.id, onclick: () => irPara(g.id) }, icone(g, v),
          h('span', { class: 'tx' }, h('b', { text: nomeDe(g, v) }), h('small', { text: ondeEsta(v, g) }), p ? h('small', { class: 'linha2', text: p }) : null)),
        bolinhasNaLista(v, g),
        ed ? h('div', { class: 'row' },
          botao('Andar 1 tempo', () => andar(g.id, 'tempo'), { c: 'sm', k: 'gr-andar:' + g.id, off: !g.rota, title: g.rota ? 'O grupo anda pela rota os cubos de um tempo de marcha' : 'Este grupo não tem rota' }),
          botao('Andar 1 dia', () => andar(g.id, 'dia'), { c: 'sm', k: 'gr-andar-dia:' + g.id, off: !g.rota, title: g.rota ? 'Anda os tempos que faltam para acabar o dia, e o dia passa' : 'Este grupo não tem rota' }),
          botao('Sortear encontro', () => sortearGrupo(g.id), { c: 'sm', k: 'gr-sortear:' + g.id })) : null));
    }
    // (cada "Andar" passa o tempo do mundo; "+1 tempo" e "Próximo dia", lá em cima, levam todos os grupos juntos)
    const viajando = grupos.filter(g => g.rota).length;
    if (ed && viajando) gs.push(nota(tempoDeHojeTxt(v) + (viajando > 1 ? ' O "Andar" de um grupo passa o tempo só com ele andando; "+1 tempo" e "Próximo dia" levam todos juntos.' : '')));
    out.push(secao(grupos.length === 1 ? 'Onde está o grupo' : 'Grupos', gs));
    // (lote 7, parte 5b) quem anda sozinho pelo mapa: onde está, parado numa parada, voltando; e quem está junto de um grupo
    if (doMundo.length) {
      const juntos = ed && N_.encontrosNoCaminho ? N_.encontrosNoCaminho(v) : [];
      out.push(secao('Pelo mapa', h('div', { class: 'lista' }, doMundo.map(g => {
        const com = juntos.filter(([a]) => a === g.id).map(([, b]) => nomeDe(achar(v, b) || {}, v));
        const est = ed ? estadoDaMarcha(v, g) : '', rota = achar(v, g.rota);
        const txt = [ed && g.oculto ? 'escondid' + (g.tipo === 'exercito' ? 'o' : 'a') + ' dos jogadores' : '', ondeEsta(v, g), est.replace(/\.$/, ''), ed && !rota ? 'sem rota' : '', com.length ? 'junto de ' + com.join(', ') : ''].filter(Boolean).join(' · ');
        return h('button', { type: 'button', class: 'li clic' + (g.oculto ? ' oculto' : ''), 'data-k': 'pm:' + g.id, onclick: () => irPara(g.id) }, icone(g, v),
          h('span', { class: 'tx' }, h('b', { text: nomeDe(g, v) }), h('small', { text: txt })));
      })), ed ? nota('Andam sozinhos com o tempo do mapa ("+1 tempo" e "Próximo dia"). Quando um passa a até 1 hexágono de um grupo, o aviso diz quem encontrou quem.') : null));
    }
    return out;
  }

  /* ---------------- aba Reinos (até o lote 10, Facções) ---------------- */
  function novaFaccao() {
    if (!App.podeEditar()) return;
    let nova = null;
    App.mudar('nova facção', m => {
      const usadas = new Set(m.faccoes.map(f => (f.cor || '').toLowerCase()));
      const cor = N().CORES.find(c => !usadas.has(c.toLowerCase())) || N().CORES[m.faccoes.length % N().CORES.length];
      nova = N().faccaoNova('Nova facção', cor);
      m.faccoes.push(nova);
      if (m.eco && window.MundoReino) window.MundoReino.recursosNaFaccao(m, nova);       // (lote 10) os recursos do mundo
    });
    if (nova) { facAberta = nova.id; focarDepois = 'f:' + nova.id + ':nome'; aba = 'faccoes'; pintar(); }
  }
  async function apagarFaccao(id) {
    const m = App.mapa, f = facDe(m, id);
    if (!f) return;
    const regs = m.objs.filter(o => o.k === 'r' && o.fac === id).length, fres = m.objs.filter(o => o.k === 'f' && (o.a === id || o.b === id)).length;
    const zons = m.objs.filter(o => o.k === 'z' && (o.a === id || o.b === id)).length;
    if (regs || fres || zons) {
      const usos = [regs ? plural(regs, 'região', 'regiões') : '', fres ? plural(fres, 'frente', 'frentes') : '', zons ? plural(zons, 'zona de guerra', 'zonas de guerra') : ''].filter(Boolean).join(' e ');
      const ok = await App.confirmar({ titulo: 'Apagar a facção "' + nomeFac(f) + '"?', perigo: true, ok: 'Apagar facção',
        texto: usos + (regs + fres + zons === 1 ? ' usa' : ' usam') + ' esta facção e vão ficar sem ela. Dá para desfazer.' });
      if (!ok || !mesmoMapa(m.id)) return;
    }
    const r = App.mudar('apagar a facção', mm => {
      mm.faccoes = mm.faccoes.filter(x => x.id !== id);
      for (const x of mm.faccoes) delete x.rel[id];
      for (const o of mm.objs) {
        if (o.k === 'r' && o.fac === id) o.fac = null;
        if (o.k === 'f' || o.k === 'z') { if (o.a === id) o.a = null; if (o.b === id) o.b = null; }
      }
    });
    if (r === false) return;
    if (facAberta === id) facAberta = null;
    avisoDesfazer('Facção apagada.');
  }
  /* (lote 8) A bandeira de uma facção, pequena (na aba Reinos): a do clã ligado a ela ou, sem clã, a própria — o brasão
     desenhado pelo núcleo do Clã ou a imagem (do banco). null: sem bandeira. */
  let seqBandeiraPainel = 0;
  function bandeiraFac(fid, w) {
    const br = App.brasaoDe ? App.brasaoDe(fid) : null;
    if (!br) return null;
    const f0 = App.mapa ? facDe(App.vista() || App.mapa, fid) : null;
    const el = h('span', { class: 'fac-band', 'data-k': 'fac-band:' + fid, title: 'Bandeira' + (f0 ? ' de ' + nomeFac(f0) : ''), style: { width: w + 'px', height: Math.round(w * 1.2) + 'px' } });
    if (br.img && /^https:\/\//.test(br.img)) { el.append(h('img', { src: br.img, alt: '' })); return el; }
    const C = window.ClaNucleo;
    if (!C || typeof C.brasaoSvg !== 'function') return null;
    try { el.innerHTML = C.brasaoSvg(br, 'pb' + (++seqBandeiraPainel)); } catch (e) { return null; }     // o desenho do núcleo do Clã: só números e cores conferidos
    return el;
  }
  function abaFaccoes(v) {
    const ed = App.podeEditar(), mestre = App.papel === 'mestre' && !App.comoJogador, out = [h('h3', { text: 'Reinos' })];
    if (ed) out.push(linha(botao('Nova facção', novaFaccao, { c: 'pri', k: 'fac:nova' })));
    if (!v.faccoes.length) {
      out.push(nota(ed ? 'Nenhuma facção ainda. Facções dão cor às regiões e lados às frentes, e guardam as relações entre elas.' : 'Nenhuma facção conhecida.'));
      return out;
    }
    if (facAberta && !facDe(v, facAberta)) facAberta = null;
    // (pente fino) o clã dos jogadores ligado a uma facção que não é a marcada como a dos jogadores: avisa e oferece marcar
    const claJ = ed && mestre && App.clas instanceof Map ? [...App.clas.values()].find(c => c.jog && c.fac && facDe(v, c.fac)) : null, fj = claJ ? facDe(v, claJ.fac) : null;
    if (fj && !fj.jog) {
      const outra = v.faccoes.find(g => g.jog);
      out.push(h('div', { class: 'sug-ic sug-jog', 'data-k': 'fac:jog-sug' },
        h('small', { text: 'O clã dos jogadores (' + claJ.nome + ') é de ' + nomeFac(fj) + (outra ? ', mas a facção marcada como a dos jogadores é ' + nomeFac(outra) : ', que ainda não está marcada como a facção dos jogadores') + '.' }),
        botao('Marcar ' + nomeFac(fj) + ' como a dos jogadores…', () => marcarJog(fj.id), { c: 'sm', k: 'fac:jog-marcar' })));
    }
    const lista = h('div', { class: 'lista' });
    for (const f of v.faccoes) {
      // (lote 10) as províncias (as regiões de fora) e as sub-regiões da facção (a de dentro sem facção própria herda)
      const rs = v.objs.filter(o => o.k === 'r' && N().facDaRegiao(v, o) === f.id), np = rs.filter(o => !o.pai).length, ns = rs.length - np;
      const sub = rs.length ? [np ? plural(np, 'província', 'províncias') : '', ns ? plural(ns, 'sub-região', 'sub-regiões') : ''].filter(Boolean).join(' · ') : 'nenhuma região';
      const gov = CP() && CP().governanteTxt ? CP().governanteTxt(v, f.id) : '';       // (lote 11, parte 2a) quem tem o maior título preso à facção
      const vas = DP() && DP().vassalaTxt ? DP().vassalaTxt(v, f.id) : '';            // (lote 11, parte 3b) a suserana dela
      const vasEl = vas ? h('small', { class: 'linha2', 'data-k': 'fac:vas:' + f.id, text: vas }) : null;
      if (ed) {
        const aberta = facAberta === f.id;
        lista.append(h('button', { type: 'button', class: 'li clic' + (aberta ? ' aberta' : '') + (f.oculta ? ' oculto' : ''), 'data-k': 'fac:' + f.id, 'data-fac': f.id, 'aria-expanded': String(aberta),
          onclick: () => { facAberta = aberta ? null : f.id; pintar(); } },
          bandeiraFac(f.id, 18) || h('i', { style: { background: f.cor } }), h('span', { class: 'tx' }, h('b', { text: nomeFac(f) }), h('small', { text: sub }), gov ? h('small', { class: 'linha2', text: gov }) : null, vasEl),
          f.jog ? h('span', { class: 'tag jog', text: 'dos jogadores' }) : null,
          f.oculta ? h('span', { class: 'tag', text: 'escondida' }) : null));
        if (aberta) lista.append(editorFaccao(f, v));
      } else {
        const rels = Object.keys(f.rel || {}).map(k => [facDe(v, k), f.rel[k]]).filter(([g, r]) => g && r !== 'neutra');
        lista.append(h('div', { class: 'fac-pub', 'data-fac': f.id },
          h('div', { class: 'li' }, bandeiraFac(f.id, 18) || h('i', { style: { background: f.cor } }), h('span', { class: 'tx' }, h('b', { text: nomeFac(f) }), h('small', { text: sub }), gov ? h('small', { class: 'linha2', text: gov }) : null, vasEl),
            f.jog ? h('span', { class: 'tag jog', text: mestre ? 'dos jogadores' : 'vocês' }) : null,
            mestre && f.oculta ? h('span', { class: 'tag', text: 'escondida' }) : null),
          f.txt.trim() ? h('p', { class: 'publico', text: f.txt.trim() }) : null,
          rels.length ? h('div', { class: 'tags' }, rels.map(([g, r]) => h('span', { class: 'tag ' + r, text: N().RELACOES[r] + ' com ' + nomeFac(g) }))) : null,
          ...numerosPublicos(f, v)));
      }
    }
    out.push(lista);
    // (lote 10) a economia do mundo (ligar, os recursos, as tabelas, os níveis) e o Livro do reino (o do mestre)
    if (ed && RP()) out.push(RP().secEconomia(v), RP().secLivro(v));
    // (parte 6) quem joga: a linha da facção deles no Livro do reino, com a produção, o estoque e de onde vem
    else if (!ed && v.ecoJ && RP() && RP().secLivroJog) out.push(RP().secLivroJog(v));
    // (lote 9) o tamanho das bandeiras no mapa, só neste aparelho (para quem enxerga melhor maiores)
    out.push(secao('Neste aparelho', campoEscolha('fac:band', 'Tamanho das bandeiras no mapa', ler().band || 'm', [['p', 'Pequenas'], ['m', 'Médias'], ['g', 'Grandes']],
      v => { lembrar({ band: v }); const T = Tela(); if (T) T.redesenhar(); }, { dica: 'As bandeiras das facções (as próprias ou as dos clãs ligados a elas) nas regiões, nos grupos, nas frentes e nas zonas de guerra. Vale só neste aparelho.' })));
    return out;
  }
  // (pente fino) marcar a facção dos jogadores pelo aviso do clã (só uma pode ser; com Desfazer)
  async function marcarJog(fid) {
    const m = App.mapa, f = facDe(m, fid), outra = m && m.faccoes.find(g => g.jog && g.id !== fid);
    if (!f) return;
    const ok = await confirmar({ titulo: 'Marcar ' + nomeFac(f) + ' como a facção dos jogadores?', ok: 'Marcar',
      texto: (outra ? nomeFac(outra) + ' deixa de ser (só uma facção pode ser dos jogadores). ' : '') + 'As terras dos jogadores passam a ser as desta facção. Dá para desfazer.' });
    if (!ok || !mesmoMapa(m.id)) return;
    if (App.mudar('marcar a facção dos jogadores', mm => { const x = facDe(mm, fid); if (!x || x.jog) return false; for (const g of mm.faccoes) delete g.jog; x.jog = true; }) !== false) avisoDesfazer(nomeFac(f) + ' agora é a facção dos jogadores.');
  }
  function campoBandeira(f) {
    const id = f.id, doCla = App.brasoes instanceof Map ? App.brasoes.get(id) : null, bt = (t, k, fn, c) => botao(t, fn, { c: 'sm' + (c ? ' ' + c : ''), k: 'f:' + id + ':' + k });
    const editar = () => { if (RP() && RP().janelaBandeira) RP().janelaBandeira(id); };
    const tirar = () => { if (App.mudar('tirar a bandeira da facção', mm => { const x = facDe(mm, id); if (!x || !x.band) return false; delete x.band; }) !== false) avisoDesfazer('A bandeira de ' + nomeFac(f) + ' saiu.'); };
    if (doCla) return [h('div', { class: 'row' }, bandeiraFac(id, 34), nota('A do clã ligado a esta facção: aparece no meio das regiões dela, junto dos grupos e nas zonas e frentes de guerra. Muda quando o brasão do clã muda (na aba Clã).' +
      (f.band ? ' A bandeira própria da facção fica guardada: volta a valer se o clã deixar de ser dela.' : ''))), f.band ? linha(bt('Editar a bandeira própria…', 'band', editar)) : null];
    if (f.band) return [h('div', { class: 'row' }, bandeiraFac(id, 34), nota('A bandeira desta facção: aparece no meio das regiões dela, junto dos grupos e nas zonas e frentes de guerra (os jogadores também a veem).')),
      linha(bt('Editar a bandeira…', 'band', editar), bt('Tirar a bandeira', 'band-tirar', tirar, 'per'))];
    return [nota('Sem bandeira. Crie uma aqui (forma, cores e símbolo, como o brasão de um clã) — ou, na aba Clã, ligue um clã a esta facção: o brasão dele vira a bandeira dela.'),
      linha(bt('Criar a bandeira…', 'band', editar))];
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
      // (lote 8) a bandeira: a do clã ligado a esta facção (na aba Clã), que vale antes; sem clã, a própria (f.band)
      h('div', { class: 'field fac-band-campo', 'data-k': 'f:' + id + ':band-campo' }, h('span', { text: 'Bandeira' }), ...campoBandeira(f)),
      segredo('Só o mestre vê', campoTexto('f:' + id + ':nota', null, f.nota, grava('mudar a nota da facção', (x, v) => { x.nota = v; }), { area: true, linhas: 3, rotulo: 'Nota do mestre', ph: 'Planos, segredos…' })),
      caixa('f:' + id + ':oculta', 'Esconder dos jogadores', f.oculta, grava('esconder a facção', (x, v) => { x.oculta = !!v; }), { dica: 'Some da lista deles; as regiões ficam sem cor de facção para eles.' }),
      // (lote 10) a facção dos jogadores: as terras deles (uma só)
      caixa('f:' + id + ':jog', 'Facção dos jogadores', !!f.jog, v => {
        const outra = m.faccoes.find(g => g.jog && g.id !== id);
        const r = App.mudar(v ? 'marcar a facção dos jogadores' : 'desmarcar a facção dos jogadores', mm => {
          const x = facDe(mm, id);
          if (!x || !!x.jog === !!v) return false;
          for (const g of mm.faccoes) delete g.jog;
          if (v) x.jog = true;
        });
        if (r !== false && v && outra) App.toast(nomeFac(outra) + ' deixou de ser a facção dos jogadores (só uma pode ser).');
        return r;
      }, { dica: 'As terras dos jogadores: quando eles ganharem uma província ou um assentamento, ponha nesta facção. Só uma facção pode ser dos jogadores.' }),
      secNumerosFac(f, m),
      CP() && CP().secTitulosFac ? CP().secTitulosFac(f, m) : null,                    // (lote 11, parte 2a) os títulos do reino
      CP() && CP().secSucessaoFac ? CP().secSucessaoFac(f, m) : null,                  // (lote 11, parte 2b) a regra de sucessão do reino
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
      }, { area: true, linhas: 6, dica: 'O mundo conta os dias desde o começo: mudar os meses pode mudar o dia e o mês de hoje, mas não o ano.' }),
      // (lote 7) os dias da semana: o mestre diz que dia da semana é hoje, e o resto segue
      campoEscolha('mapa:semana', 'Dia da semana de hoje', String(N_.semanaDe(cal, cal.dia)), [['-1', 'Sem dia da semana']].concat(N_.SEMANA.map((nome, i) => [String(i), nome])),
        v => App.mudar(Number(v) < 0 ? 'tirar o dia da semana' : 'escolher o dia da semana', mm => { const s0 = N().sem0Para(mm.cal.dia, Number(v)); if (s0 === mm.cal.sem0) return false; mm.cal.sem0 = s0; }),
        { dica: 'Escolha que dia da semana é hoje: os outros dias seguem sozinhos (de Segunda-Feira a Domingo). Aparece junto da data, para todos.' }),
      // (lote 6) a marcha dos grupos é contada em tempos: quantos tempos de marcha tem um dia
      campoNumero('mapa:tpd', 'Tempos de marcha por dia', cal.tpd || N_.TEMPOS_DIA || 10, n => App.mudar('mudar os tempos de marcha do dia', mm => { if (mm.cal.tpd === n) return false; mm.cal.tpd = n; mm.cal.tempo = Math.min(mm.cal.tempo || 0, n - 1); }),
        { min: 1, max: (N_.LIMITES && N_.LIMITES.tempos) || 100, erro: 'Use de 1 a 100 tempos.', dica: 'Os grupos andam os cubos deles a cada tempo; a cada tantos tempos de marcha, passa um dia.' }),
      // (lote 9) de quantos em quantos tempos o clima muda (aos poucos, ao longo do dia)
      ...(() => {
        if (!N_.cadaDe) return [];
        const cada = N_.cadaDe(m), ops = [['0', 'Uma vez por dia'], ['1', 'A cada tempo'], ['2', 'A cada 2 tempos'], ['3', 'A cada 3 tempos'], ['4', 'A cada 4 tempos'], ['5', 'A cada 5 tempos']];
        if (!ops.some(x => x[0] === String(cada))) ops.push([String(cada), 'A cada ' + cada + ' tempos']);
        return [campoEscolha('mapa:clima-cada', 'O clima muda', String(cada), ops, v => App.mudar('mudar quando o clima muda', mm => {
          const n = Number(v); if (N().cadaDe(mm) === n) return false;
          const cl = mm.clima || (mm.clima = {});
          if (n === N().CADA_CLIMA) delete cl.cada; else cl.cada = n;
        }), { dica: 'Ao longo do dia o clima muda aos poucos (do sol ao nublado, do nublado à chuva…), pela tabela do mês. O que você trocar à mão vale até a próxima mudança.' })];
      })(),
      // (lote 7, parte 4b) quando escurece: a hora das cenas geradas daqui (vazio: o de fábrica)
      ...(() => { const q = N_.quandoEscurece ? N_.quandoEscurece(cal) : null; if (!q) return []; const max = ((N_.LIMITES && N_.LIMITES.tempos) || 100) + 1; return [h('div', { class: 'row' },
        campoNumero('mapa:ent', 'Entardecer a partir do tempo', cal.ent == null ? null : cal.ent, n => App.mudar('mudar quando entardece', mm => { if ((mm.cal.ent == null ? null : mm.cal.ent) === n) return false; if (n == null) delete mm.cal.ent; else mm.cal.ent = n; }),
          { min: 1, max, vazio: null, ph: String(q.padraoEnt), dica: 'As cenas geradas do mapa saem com a luz do entardecer a partir deste tempo do dia.' }),
        campoNumero('mapa:noi', 'Noite a partir do tempo', cal.noi == null ? null : cal.noi, n => App.mudar('mudar quando anoitece', mm => { if ((mm.cal.noi == null ? null : mm.cal.noi) === n) return false; if (n == null) delete mm.cal.noi; else mm.cal.noi = n; }),
          { min: 1, max, vazio: null, ph: String(q.padraoNoi), dica: 'E de noite a partir deste. Um tempo maior que o último do dia quer dizer "nunca".' }))]; })()));
    // (lote 7, parte 5c) a tabela do clima
    out.push(secTabelaClima(m));
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
  // (lote 6) A largura do mapa em cubos: os hexágonos ficam do tamanho que dá essa largura (cada um com 5 cubos); o terreno
  // pintado hexágono por hexágono é refeito na grade nova, e os grupos ficam onde estão.
  function mudarLarguraEmCubos(n) {
    const m0 = App.mapa;
    if (!temGrade(m0) || !(n > 0)) return false;
    const tam = m0.larg * N().CUBOS_HEX / n;
    if (!(tam >= 4 && tam <= 20000)) { App.toast('Com essa largura, cada hexágono teria ' + fmt(tam, 1) + ' unidades do mapa. Use uma largura que dê hexágonos de 4 a 20.000 unidades.'); return false; }
    const teste = N().regradear(N().copia(m0), tam);
    if (!teste.ok) { if (teste.msg !== 'O tamanho é o mesmo') App.toast(teste.msg + '.'); return false; }
    const ok = App.mudar('mudar o tamanho do mapa em cubos', mm => { const r = N().regradear(mm, tam); if (!r.ok) return false; });
    if (ok !== false) avisoDesfazer('O mapa agora tem cerca de ' + fmt(cubos(App.mapa, App.mapa.larg), 0) + ' × ' + fmt(cubos(App.mapa, App.mapa.alt), 0) + ' cubos (cada hexágono com ' + fmt(App.mapa.grade.tam, 1) + ' unidades do mapa)'
      + (teste.hexes ? '; o terreno pintado foi refeito em ' + plHex(teste.hexes) : '') + '.');
    return ok;
  }
  function abaTerreno(m) {
    if (!m || !App.podeEditar()) return [];
    const gr = m.grade, tem = temGrade(m), out = [h('h3', { text: 'Terreno' })];
    // a grade
    const gs = [];
    gs.push(campoNumero('ter:tam', 'Tamanho do hexágono (unidades do mapa)', tem ? gr.tam : '', n => App.mudar(n ? 'mudar o tamanho da grade' : 'tirar a grade', mm => { mm.grade.tam = n; }),
      { decimal: true, min: 4, max: 20000, vazio: 0, ph: 'sem grade', erro: 'Use um tamanho de 4 a 20.000 unidades (vazio: sem grade).', dica: 'De um centro ao centro vizinho. Um hexágono = 5 cubos.' }));
    gs.push(linha(botao('Medir com a régua…', medirGrade, { c: tem ? 'sm' : 'pri', k: 'ter:medir', title: 'Arraste sobre alguns hexágonos e diga quantos são (ou quantos cubos)' })));
    // (lote 6) o tamanho do mapa em cubos: hexágonos menores (cada um com os 5 cubos dele) dão mais cubos à mesma imagem
    if (tem) gs.push(campoNumero('ter:largcubos', 'Largura do mapa (cubos)', Math.round(cubos(m, m.larg)), mudarLarguraEmCubos,
      { min: 5, max: 1000000, erro: 'Use um número de cubos, de 5 em diante.', dica: 'A altura acompanha a imagem: ' + fmt(cubos(m, m.alt), 0) + ' cubos. Mudar a largura muda o tamanho dos hexágonos; o terreno pintado por hexágono é refeito na grade nova.' }));
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
        { dica: 'Os jogadores também a veem. Escondida, ela continua medindo as viagens e a régua, e o terreno pintado continua no mapa.' }));
      const forcas = [['0.15', 'Bem clara'], ['0.35', 'Clara'], ['0.6', 'Forte'], ['0.9', 'Bem forte']];
      const perto = forcas.reduce((a, b) => (Math.abs(Number(b[0]) - gr.alfa) < Math.abs(Number(a[0]) - gr.alfa) ? b : a))[0];
      gs.push(campoEscolha('ter:alfa', 'Linhas da grade', perto, forcas, v => App.mudar('mudar as linhas da grade', mm => { mm.grade.alfa = Number(v); }), { off: !gr.on }));
      gs.push(nota('O mapa tem cerca de ' + fmt(m.larg / gr.tam, 0) + ' × ' + fmt(m.alt / gr.tam, 0) + ' hexágonos (' + fmt(cubos(m, m.larg), 0) + ' × ' + fmt(cubos(m, m.alt), 0) + ' cubos).'));
    } else gs.push(nota('Sem grade, o mapa não tem escala: a viagem e a régua falam em unidades do mapa. Com ela, tudo passa a ser em cubos.'));
    out.push(secao('Grade de hexágonos', gs));
    // os tipos de terreno
    const uso = new Map(), TX = N().TEXTURAS || { liso: { nome: 'Lisa' } };
    for (const k of Object.keys(m.hexes || {})) { const v = m.hexes[k], t = typeof v === 'string' ? v : v[0]; if (t) uso.set(t, (uso.get(t) || 0) + 1); }
    const ts = m.terrenos.map(t => {
      const grava = (rot, fn) => v => App.mudar(rot, mm => { const x = mm.terrenos.find(y => y.id === t.id); if (!x) return false; return fn(x, v); });
      const custo = campoNumero('ter:' + t.id + ':custo', null, t.custo, grava('mudar o custo de ' + t.nome, (x, n) => { x.custo = n; }), { decimal: true, min: 0.1, max: 9999, erro: 'Use um custo de 0,1 a 9999 cubos.' });
      custo.setAttribute('aria-label', 'Custo de ' + t.nome + ', em cubos por hexágono');
      return h('div', { class: 'ter-linha', 'data-ter': t.id },
        campoCor('ter:' + t.id + ':cor', 'Cor de ' + t.nome, t.cor, grava('mudar a cor de ' + t.nome, (x, v) => { x.cor = v; })),
        campoTexto('ter:' + t.id + ':nome', null, t.nome, grava('renomear o terreno', (x, v) => { if (!v.trim()) return false; x.nome = v.trim(); }), { max: 40, rotulo: 'Nome do terreno' }),
        custo, h('span', { class: 'un', text: 'cubos' }),
        h('button', { type: 'button', class: 'ib', 'data-k': 'ter:' + t.id + ':x', title: 'Tirar ' + t.nome + (uso.get(t.id) ? ' (' + plHex(uso.get(t.id)) + ')' : ''), 'aria-label': 'Tirar ' + t.nome, onclick: () => tirarTerreno(t.id) }, glifo(X_SVG, 14)),
        campoEscolha('ter:' + t.id + ':tex', null, t.tex || 'liso', Object.keys(TX).map(k => [k, 'Textura: ' + TX[k].nome]), grava('mudar a textura de ' + t.nome, (x, v) => { x.tex = v; }), { rotulo: 'Textura de ' + t.nome + ' (no desenho à mão e nos hexágonos)' }));
    });
    out.push(secao('Tipos de terreno',
      nota('Custo: quantos cubos se gastam para atravessar um hexágono desse terreno. Sem terreno, um hexágono custa os 5 cubos dele.'),
      ts.length ? h('div', { class: 'ter-lista' }, ts) : nota('Nenhum tipo de terreno.'),
      novosTerrenos(m),
      linha(botao('+ Tipo de terreno', novoTerreno, { c: 'sm', k: 'ter:novo', off: m.terrenos.length >= N().LIMITES.terrenos }),
        m.terrenos.length ? null : botao('Os tipos de começo', () => App.mudar('voltar aos tipos de terreno de começo', mm => { mm.terrenos = N().copia(N().TERRENOS_PADRAO); }), { c: 'sm', k: 'ter:padrao' }))));
    // o desenho à mão
    const pint = m.pintura || { alfa: 1, ops: [] }, nOps = pint.ops.length;
    const fortes = [['0.35', 'Bem clara'], ['0.6', 'Meio a meio'], ['0.85', 'Forte'], ['1', 'Inteira']];
    const forca = fortes.reduce((a, b) => (Math.abs(Number(b[0]) - pint.alfa) < Math.abs(Number(a[0]) - pint.alfa) ? b : a))[0];
    out.push(secao('Desenho à mão',
      nota(nOps ? plural(nOps, 'pincelada', 'pinceladas') + '.' + (tem ? ' Cada hexágono fica com o terreno que o desenho tem no centro dele (o que se pinta por hexágono vale mais).' : ' Com a grade de hexágonos, cada hexágono ganha o terreno do desenho.')
        : 'Pinte o terreno à mão livre, com a textura de cada tipo: dá para desenhar o mapa do zero ou por cima da imagem.'),
      linha(botao('Pincel livre (H)', () => ferramentaTerreno('livre'), { c: 'pri', k: 'ter:livre', title: 'Arraste no mapa para pintar (ou apagar, com a borracha)' }),
        nOps ? botao('Apagar o desenho…', apagarDesenho, { c: 'sm per', k: 'ter:apagar-desenho' }) : null)));
    // pintar por hexágono
    const pintados = Object.keys(m.hexes || {}).length, nada = uso.get('-') || 0;
    out.push(secao('Pintar por hexágono',
      nota(pintados ? plHex(pintados) + ' com terreno ou custo próprio.' + [...uso].map(([id, n]) => { const t = m.terrenos.find(x => x.id === id); return t ? ' ' + t.nome + ': ' + n + '.' : ''; }).join('') + (nada ? ' Sem terreno (por cima do desenho): ' + nada + '.' : '') : 'Nenhum hexágono pintado ainda.'),
      linha(botao('Por hexágono (H)', () => ferramentaTerreno('hex'), { c: 'sm', k: 'ter:pincel', off: !tem, title: tem ? 'Arraste sobre os hexágonos para pintar (ou corrigir o desenho)' : 'Defina a grade primeiro' })),
      tem ? caixa('ter:des', 'Desenho em cada hexágono', gr.des !== false, v => App.mudar(v ? 'pôr o desenho nos hexágonos' : 'tirar o desenho dos hexágonos', mm => { if ((mm.grade.des !== false) === !!v) return false; mm.grade.des = !!v; }),
        { dica: 'De perto (com zoom), cada hexágono pintado ganha o desenho do terreno (árvores, montes, fileiras…), diferente de um para o outro. Desligado: só a tinta.' }) : null,
      nota('Uma região também pode ter um custo por hexágono (Seleção → a região). O custo próprio de um hexágono vale mais que o da região, que vale mais que o do terreno.')));
    // (lote 7) a tinta do terreno: a mesma força para o desenho à mão e para os hexágonos pintados
    const comTinta = [...uso].some(([id]) => id !== '-' && m.terrenos.some(t => t.id === id));
    if (nOps || comTinta) out.push(secao('Tinta do terreno',
      campoEscolha('ter:forca', 'Força da tinta', forca, fortes, v => App.mudar('mudar a força da tinta', mm => { mm.pintura.alfa = Number(v); }),
        { dica: 'Vale para o desenho à mão e para os hexágonos pintados. Mais clara deixa a imagem do mapa aparecer por baixo.' })));
    return out;
  }
  // (lote 6) num mapa de antes, os terrenos novos (com o desenho deles) que ele ainda não tem: um clique acrescenta
  function novosTerrenos(m) {
    const falta = N().terrenosQueFaltam ? N().terrenosQueFaltam(m) : [];
    if (!falta.length || !m.terrenos.length) return null;
    return h('div', { class: 'row novos-ter' }, nota('Terrenos novos: ' + falta.map(t => t.nome).join(', ') + '.'),
      botao('Acrescentar ' + (falta.length === 1 ? 'este' : 'os ' + falta.length), () => App.mudar('acrescentar os terrenos novos', mm => { const f = N().terrenosQueFaltam(mm); if (!f.length) return false; mm.terrenos.push(...f); }),
        { c: 'sm', k: 'ter:novos', title: 'Cada um com a cor, o custo e o desenho dele; dá para mudar depois' }));
  }
  // abre a ferramenta Terreno num dos dois pincéis (o livre ou o de hexágono)
  function ferramentaTerreno(modo) {
    if (!App.opt) App.opt = {};
    App.opt.terPincel = modo;
    App.usarFerramenta('h');
    const T = Tela();
    if (T && T.redesenhar) T.redesenhar();
  }
  async function apagarDesenho() {
    const m = App.mapa, n = m && m.pintura ? m.pintura.ops.length : 0;
    if (!n) return;
    const ok = await App.confirmar({ titulo: 'Apagar todo o desenho à mão?', perigo: true, ok: 'Apagar o desenho',
      texto: plural(n, 'pincelada sai', 'pinceladas saem') + ' do mapa (o que foi pintado por hexágono fica). Dá para desfazer.' });
    if (!ok || !mesmoMapa(m.id)) return;
    if (App.mudar('apagar o desenho à mão', mm => { mm.pintura.ops = []; }) !== false) avisoDesfazer('O desenho à mão saiu do mapa.');
  }
  function novoTerreno() {
    let id = null;
    const feito = App.mudar('novo tipo de terreno', mm => {
      const usados = new Set(mm.terrenos.map(t => t.id));
      let n = 1; while (usados.has('t' + n)) n++;
      id = 't' + n;
      mm.terrenos.push({ id, nome: 'Terreno ' + n, cor: N().CORES[(mm.terrenos.length + 3) % N().CORES.length], custo: 5, tex: 'liso' });
    });
    if (feito !== false) focarDepois = 'ter:' + id + ':nome';
  }
  function tirarTerreno(id) {
    const t = App.mapa.terrenos.find(x => x.id === id);
    if (!t) return;
    const n = Object.values(App.mapa.hexes || {}).filter(v => (typeof v === 'string' ? v : v[0]) === id).length;
    const np = ((App.mapa.pintura && App.mapa.pintura.ops) || []).filter(o => o.t === id).length;
    if (App.mudar('tirar ' + t.nome, mm => { mm.terrenos = mm.terrenos.filter(x => x.id !== id); }) !== false) {
      avisoDesfazer(t.nome + ' saiu da lista.' + (n ? ' ' + (n === 1 ? 'O hexágono pintado com ele ficou' : 'Os ' + n + ' hexágonos pintados com ele ficaram') + ' sem terreno.' : '')
        + (np ? ' ' + (np === 1 ? 'A pincelada do desenho com ele saiu.' : 'As ' + np + ' pinceladas do desenho com ele saíram.') : ''));
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
    for (const ev of ['muda', 'sel', 'papel', 'mapas', 'salvo', 'vista', 'camadas']) App.on(ev, agendar);
    App.on('mapas', () => { if (menu) abrirMenu(); });
    window.addEventListener('resize', () => fecharMenu());
    if (RP() && typeof RP().iniciar === 'function') RP().iniciar(App);       // (lote 10, parte 4) a prévia da semana abre sozinha
    pintar();
  }

  /* (lote 7, parte 6) A busca rápida do site pediu uma coisa do mapa aberto: seleciona e centraliza (na tela larga, o
     painel mostra a Seleção); uma facção abre na aba Facções. Devolvem se acharam. */
  function marcarUmInstante(el) { if (!el) return; el.scrollIntoView({ block: 'nearest' }); el.classList.add('achado'); setTimeout(() => el.classList.remove('achado'), 2400); }
  function mostrar(id) {
    if (!achar(App.vista(), id)) {
      toast(App.comoJogador && achar(App.mapa, id) ? 'Isto está escondido dos jogadores. Para vê-lo, desligue “Ver como jogador”.' : 'Isto não está mais neste mapa.');
      return false;
    }
    if (!estreito()) { aba = 'selecao'; lembrar({ aba }); if ($('side') && $('side').classList.contains('fechado')) definirPainel(true); }
    irPara(id);
    pintar();
    return true;
  }
  function mostrarFaccao(id) {
    if (!facDe(App.vista(), id)) {
      toast(App.comoJogador && facDe(App.mapa, id) ? 'Esta facção está escondida dos jogadores. Para vê-la, desligue “Ver como jogador”.' : 'Esta facção não está mais neste mapa.');
      return false;
    }
    mapaVisto = App.mapa ? App.mapa.id : null;          // (a pintura não fecha a facção por achar que o mapa mudou)
    aba = 'faccoes'; lembrar({ aba });
    facAberta = App.podeEditar() ? id : null;
    if ($('side') && $('side').classList.contains('fechado')) definirPainel(true);
    pintar();
    marcarUmInstante(document.querySelector('[data-fac="' + CSS.escape(id) + '"]'));
    return true;
  }

  /* (lote 8, parte 6) as ferramentas do painel, para a guerra (mundo/guerra-painel.js) */
  const kit = { app: () => App, h, glifo, botao, nota, secao, segredo, linha, campoTexto, campoNumero, campoEscolha, caixa, mudarObj, avisoDesfazer, achar, nomeDe, nomeFac, facDe,
    irPara, fmt, plural, dataTxt, janela, confirmar, icone, abrirAba, pintar, X_SVG, focar: k => { focarDepois = k; },
    campoCor, lerNum, fmtCampo, mesmoMapa, bandeiraFac,           // (lote 10) a economia e a bandeira (mundo/reino-painel.js)
    depoisDasPropostas };                                          // (lote 12) a semana espera o dia da campanha
  window.MundoPainel = { iniciar, abrirAba, redesenhar: pintar, seguirLiga, novoTexto, mostrar, mostrarFaccao, kit };
})();
