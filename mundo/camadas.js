/* Tiny Cats · Mapa-múndi · as camadas (lote 8, parte 4).
   O mapa tem muita coisa: cada um escolhe, no próprio aparelho, o que aparece. Esconder uma camada só limpa a própria
   tela — não muda o mapa nem o que os outros veem ("Esconder dos jogadores", no objeto, continua sendo o jeito de
   esconder dos jogadores). Travar deixa a camada à vista, mas sem se escolher nem se mexer pelo mapa: o clique passa
   por ela (para pegar a região embaixo das cidades, por exemplo). Guardado neste navegador, para todos os mapas.
   Os atalhos (Viagem, Política, Guerra, Tudo) só mudam o que aparece; as travas ficam como estão.
   (lote 10) As sub-regiões (as regiões de dentro de outra: os ducados, as prefeituras…) têm a camada delas. E o modo do
   mapa, também deste aparelho: Político (as cores das facções, o de sempre), Terreno (as regiões só com a borda e o
   nome), Clima (cada região com a cor do clima de agora) e Perigo (pela chance de encontro; só o mestre), com a legenda
   no canto do mapa e um botão para voltar ao Político.
   A tela (tela.js) não desenha o que está escondido e não deixa escolher o que está travado; criar numa camada
   escondida ou travada só avisa, com o botão que resolve (nada muda sozinho). */
(() => {
  'use strict';
  const CHAVE = 'tinycats:mundo:camadas';
  const LISTA = [
    { id: 'lugares', nome: 'Cidades e grupos', dica: 'Os marcadores (cidades, vilas e outros lugares) e os grupos (caravanas, patrulhas e exércitos).' },
    { id: 'linhas', nome: 'Estradas e rios', dica: 'Os rios, as estradas e as trilhas.' },
    { id: 'rotas', nome: 'Rotas', dica: 'As rotas de viagem e o caminho já andado.' },
    { id: 'eventos', nome: 'Eventos', dica: 'Os eventos: a área e o selo.' },
    { id: 'perigos', nome: 'Zonas de perigo', dica: 'As tempestades, as pragas, o frio extremo, as terras amaldiçoadas e os territórios de monstro.' },
    { id: 'regioes', nome: 'Regiões', dica: 'As províncias (as regiões de fora, com as cores das facções) e os nomes delas.' },
    { id: 'subregioes', nome: 'Sub-regiões', dica: 'As divisões dentro das províncias (os ducados, as prefeituras…): a área, a borda e o nome.' },
    { id: 'guerra', nome: 'Guerra', dica: 'As zonas de guerra e as frentes.' },
    { id: 'enfeites', nome: 'Textos e carimbos', dica: 'Os textos escritos no mapa e os carimbos (árvores, montanhas…).' },
    { id: 'terreno', nome: 'Terreno', dica: 'A tinta do terreno: o pincel livre e os hexágonos pintados.' },
    { id: 'grade', nome: 'Grade', dica: 'As linhas da grade de hexágonos.', semTrava: true },
  ];
  const IDS = LISTA.map(c => c.id);
  const ATALHOS = [
    { id: 'viagem', nome: 'Viagem', mostra: ['lugares', 'linhas', 'rotas', 'eventos', 'perigos', 'enfeites', 'terreno', 'grade'] },
    { id: 'politica', nome: 'Política', mostra: ['regioes', 'subregioes', 'lugares', 'guerra', 'linhas', 'enfeites', 'terreno'] },
    { id: 'guerra', nome: 'Guerra', mostra: ['guerra', 'lugares', 'regioes', 'linhas', 'terreno', 'grade'] },
    { id: 'tudo', nome: 'Tudo', mostra: IDS },
  ];
  const defCamada = id => LISTA.find(c => c.id === id) || null;
  const nomes = ids => { const n = ids.map(id => defCamada(id).nome); return n.length > 1 ? n.slice(0, -1).join(', ') + ' e ' + n[n.length - 1] : n.join(''); };

  /* (lote 10) os modos do mapa: como as regiões se pintam (só neste aparelho) */
  const MODOS = [
    { id: 'politico', nome: 'Político', dica: 'As regiões com as cores das facções (o de sempre).' },
    { id: 'terreno', nome: 'Terreno', dica: 'As regiões só com a borda e o nome: o terreno aparece por baixo.' },
    { id: 'clima', nome: 'Clima', dica: 'Cada região com a cor do clima de agora.' },
    { id: 'perigo', nome: 'Perigo', dica: 'Cada região pela chance de encontro: do verde (calma) ao vermelho (perigosa). Só o mestre.', mestre: true },
    { id: 'economia', nome: 'Economia', dica: 'Cada região pela produção de um recurso, por semana (com a economia ligada, na aba Reinos). Só o mestre.', mestre: true, eco: true },
  ];
  const CLIMA_COR = { sol: '#f2c14e', nublado: '#9aa3b5', chuva: '#4f8fd0', tempestade: '#7b5fc7', neve: '#eef4fb', nevoa: '#b9c3cc', vento: '#5cc1a8', calor: '#ef7d3a', frio: '#8fc3ea' };

  /* ---- o estado deste aparelho ---- */
  let esc = new Set(), trava = new Set(), modo = 'politico', modoRec = '';
  function ler() {
    let v = null;
    try { v = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { v = null; }
    const lista = x => new Set((Array.isArray(x) ? x : []).filter(id => IDS.includes(id)));
    esc = lista(v && v.esc);
    trava = lista(v && v.trava);
    modo = v && MODOS.some(x => x.id === v.modo) ? v.modo : 'politico';
    modoRec = v && typeof v.rec === 'string' ? v.rec.slice(0, 60) : '';
    for (const c of LISTA) if (c.semTrava) trava.delete(c.id);
  }
  function guardar() {
    try { localStorage.setItem(CHAVE, JSON.stringify({ v: 1, esc: IDS.filter(id => esc.has(id)), trava: IDS.filter(id => trava.has(id)), modo, rec: modoRec })); } catch (e) { /* o navegador não guarda: vale até fechar a página */ }
  }
  ler();

  // a camada de cada coisa do mapa (null: não é de camada nenhuma)
  function deObj(o) {
    if (!o) return null;
    switch (o.k) {
      case 'm': case 'g': return 'lugares';
      case 'l': return 'linhas';
      case 't': return 'rotas';
      case 'e': return 'eventos';
      case 'r': return o.pai ? 'subregioes' : 'regioes';            // (lote 10) a região de dentro: a camada das sub-regiões
      case 'f': return 'guerra';
      case 'z': return o.tipo && o.tipo !== 'guerra' ? 'perigos' : 'guerra';
      case 'c': case 'x': return 'enfeites';
    }
    return null;
  }
  const visivel = id => !esc.has(id);
  const travada = id => trava.has(id);
  const livre = id => !id || (!esc.has(id) && !trava.has(id));         // à vista e destravada: dá para escolher e criar nela
  const objVisivel = o => visivel(deObj(o));
  const objLivre = o => livre(deObj(o));

  /* ---- (lote 10) o modo do mapa ---- */
  const mestreAgora = () => { const A = App0 || window.Mundo; return !!(A && typeof A.podeEditar === 'function' && A.podeEditar()); };
  const vistaAgora = () => { const A = App0 || window.Mundo; return A && typeof A.vista === 'function' ? A.vista() : null; };
  const ecoLigada = m => !!(m && m.eco && m.eco.on && Array.isArray(m.eco.rec) && m.eco.rec.length);
  const modoPode = (id, mestre, m) => { const x = MODOS.find(y => y.id === id); return !!x && (!x.mestre || mestre) && (!x.eco || ecoLigada(m === undefined ? vistaAgora() : m)); };
  // o modo que vale agora (o do mestre que não serve a quem joga volta ao Político)
  const modoAtual = (mestre, m) => (modoPode(modo, mestre === undefined ? mestreAgora() : mestre, m) ? modo : 'politico');
  function mudarModo(id) {
    if (!MODOS.some(x => x.id === id) || modo === id) return false;
    modo = id;
    mudou();
    return true;
  }
  // (lote 10, parte 2) o recurso do modo Economia: o escolhido (se existe no mapa), senão o primeiro
  const recDoModo = m => (ecoLigada(m) ? m.eco.rec.find(r => r.id === modoRec) || m.eco.rec[0] : null);
  function mudarModoRec(id) {
    if (modoRec === id) return false;
    modoRec = String(id || '').slice(0, 60);
    mudou();
    return true;
  }
  // a maior produção (a parte própria de cada região) de um recurso no mapa: o topo da escala
  const cacheMax = typeof WeakMap === 'function' ? new WeakMap() : null;
  function maxDoRecurso(m, id) {
    const Rn = window.MundoReino;
    let c = cacheMax ? cacheMax.get(m) : null;
    if (cacheMax && !c) { c = new Map(); cacheMax.set(m, c); }
    if (c && c.has(id)) return c.get(id);
    let mx = 0;
    if (Rn) for (const o of m.objs || []) if (o && o.k === 'r') { const p = Rn.producaoPropria(m, o); if (p && p.total[id] > mx) mx = p.total[id]; }
    if (c) c.set(id, mx);
    return mx;
  }
  // a cor entre duas (t de 0 a 1)
  function misturar(a, b, t) {
    const p = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)), A = p(a), B = p(b), u = Math.max(0, Math.min(1, t));
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * u).toString(16).padStart(2, '0')).join('');
  }
  const BASE_ECO = '#f1ecdf';
  // a cor de 0 a 100% de chance de encontro: do verde ao amarelo e ao vermelho
  function corPerigo(ch) {
    const t = Math.max(0, Math.min(100, Number(ch) || 0)) / 100, a = [76, 175, 106], b = [230, 195, 79], c = [224, 90, 79];
    const mix = (p, q, u) => p.map((v, i) => Math.round(v + (q[i] - v) * u));
    return '#' + (t < 0.5 ? mix(a, b, t * 2) : mix(b, c, (t - 0.5) * 2)).map(v => v.toString(16).padStart(2, '0')).join('');
  }
  // o clima de agora numa região (o mestre conta; quem joga recebe o pronto da projeção: o da região, ou o do mundo)
  function climaDaRegiao(m, o, mestre) {
    const N = window.MundoNucleo;
    if (mestre && N && typeof N.climaDoDia === 'function') { try { return N.climaDoDia(m, m.cal.dia, o).k; } catch (e) { return null; } }
    return (o && o.ch) || (m && m.clima && m.clima.hoje) || null;
  }
  // Como uma região se pinta no modo de agora: null (o Político, o de sempre) ou { modo, cor } (cor null: a de sempre)
  function modoDaRegiao(m, o, mestre) {
    const md = modoAtual(mestre, m);
    if (md === 'politico' || !o || o.k !== 'r') return null;
    if (md === 'terreno') return { modo: 'terreno', cor: null };
    if (md === 'clima') { const k = climaDaRegiao(m, o, mestre); return { modo: 'clima', cor: CLIMA_COR[k] || '#9aa3b5', k: k || '' }; }
    if (md === 'perigo') { const ch = o.enc ? Math.max(0, Math.min(100, Number(o.enc.chance) || 0)) : 0; return { modo: 'perigo', cor: corPerigo(ch), ch }; }
    if (md === 'economia') {
      const Rn = window.MundoReino, rec = recDoModo(m), p = Rn && rec ? Rn.producaoPropria(m, o) : null;
      if (!p) return null;
      const v = p.total[rec.id] || 0, mx = maxDoRecurso(m, rec.id);
      // sem produção dele: só a borda (como no Terreno); com: do tom de base à cor do recurso
      if (!(v > 0) || !(mx > 0)) return { modo: 'economia', cor: null, zero: true, rec: rec.id, v: 0 };
      return { modo: 'economia', cor: misturar(BASE_ECO, rec.cor, 0.25 + 0.75 * v / mx), rec: rec.id, v };
    }
    return null;
  }

  function mudou(deFora) {
    if (!deFora) guardar();
    pintarBotao();
    if (pop && !pop.hidden) pintarPop();
    pintarLegenda();
    const App = window.Mundo;
    if (App && typeof App.emit === 'function') App.emit('camadas', estado());
  }
  function estado() { return { esc: IDS.filter(id => esc.has(id)), trava: IDS.filter(id => trava.has(id)), atalho: atalhoAtual(), modo: modoAtual() }; }
  function mostrar(id, sim) {
    if (!defCamada(id)) return false;
    const antes = esc.has(id);
    if (sim) esc.delete(id); else esc.add(id);
    if (antes === esc.has(id)) return false;
    mudou();
    return true;
  }
  function travar(id, sim) {
    const c = defCamada(id);
    if (!c || c.semTrava) return false;
    const antes = trava.has(id);
    if (sim) trava.add(id); else trava.delete(id);
    if (antes === trava.has(id)) return false;
    mudou();
    return true;
  }
  function atalhoAtual() {
    const a = ATALHOS.find(x => IDS.every(id => x.mostra.includes(id) === !esc.has(id)));
    return a ? a.id : null;
  }
  // O atalho troca o que aparece de uma vez; o aviso diz o que ficou escondido e traz o Desfazer (volta ao de antes).
  // Um aviso de atalho por vez: o do atalho anterior sai (o Desfazer dele voltaria a um estado de antes deste).
  let fecharAvisoAtalho = null;
  function atalho(id) {
    const a = ATALHOS.find(x => x.id === id);
    if (!a) return false;
    const antes = new Set(esc), novo = new Set(IDS.filter(c => !a.mostra.includes(c)));
    if (antes.size === novo.size && [...antes].every(c => novo.has(c))) return false;
    esc = novo;
    mudou();
    const App = window.Mundo;
    if (App && typeof App.toast === 'function') {
      const esc0 = IDS.filter(c => novo.has(c));
      if (typeof fecharAvisoAtalho === 'function') fecharAvisoAtalho();
      fecharAvisoAtalho = App.toast('Atalho ' + a.nome + ': ' + (esc0.length ? (esc0.length === 1 ? 'a camada ' + nomes(esc0) + ' ficou escondida.' : nomes(esc0) + ' ficaram escondidas.') : 'todas as camadas à vista.'), 'Desfazer', () => {
        esc = antes;
        mudou();
      });
    }
    return true;
  }
  function destravarTodas() {
    if (!trava.size) return false;
    trava = new Set();
    mudou();
    return true;
  }
  /* O aviso de que a camada está escondida (ou travada), com o botão que resolve. depois(), se veio, roda logo que a
     camada fica livre (escondida e travada: mostrar não basta para escolher — o aviso seguinte oferece destravar). */
  function avisar(id, depois) {
    const c = defCamada(id), App = window.Mundo;
    if (!c || !App || typeof App.toast !== 'function' || livre(id)) return;
    const escondida = esc.has(id);
    App.toast('A camada ' + c.nome + ' está ' + (escondida ? 'escondida' : 'travada') + ' neste aparelho.', escondida ? 'Mostrar a camada' : 'Destravar', () => {
      if (escondida) mostrar(id, true); else travar(id, false);
      if (typeof depois === 'function') { if (livre(id)) depois(); else avisar(id, depois); }
    });
  }

  /* ---- o botão (na caixa do zoom) e a janelinha ---- */
  const ICONE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.2 21 7.8 12 12.4 3 7.8z"/><path d="M3 12.2l9 4.6 9-4.6"/><path d="M3 16.4l9 4.6 9-4.6"/></svg>';
  const OLHO = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const OLHO_NAO = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1Q11.3 5 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a10.5 10.5 0 0 0 5.4-1.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  const CADEADO = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/></svg>';
  const CADEADO_ABERTO = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 7.7-1.6"/></svg>';
  let App0 = null, botao = null, ponto = null, pop = null, leg = null;
  function el(tag, attrs, ...filhos) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'texto') e.textContent = v;
      else if (k === 'class') e.className = v;
      else if (k === 'icone') e.innerHTML = v;                       // (só os desenhos fixos daqui de cima)
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const f of filhos.flat(2)) if (f !== null && f !== undefined && f !== false) e.append(f);
    return e;
  }
  const aberto = () => !!(pop && !pop.hidden);
  function pintarBotao() {
    if (!botao) return;
    const ne = esc.size, nt = trava.size, partes = [];
    if (ne) partes.push(ne === 1 ? '1 escondida' : ne + ' escondidas');
    if (nt) partes.push(nt === 1 ? '1 travada' : nt + ' travadas');
    const md = modoAtual();
    if (md !== 'politico') partes.push('modo ' + MODOS.find(x => x.id === md).nome);
    const t = 'Camadas (C)' + (partes.length ? ' · ' + partes.join(' · ') : '');
    botao.title = t;
    botao.setAttribute('aria-label', partes.length ? 'Camadas: ' + partes.join(', ') : 'Camadas');
    botao.classList.toggle('mexido', !!(ne || nt || md !== 'politico'));
    if (ponto) ponto.hidden = !(ne || nt || md !== 'politico');
  }
  // quanto há de cada camada no mapa aberto (o que esta tela recebe)
  function contas(m) {
    const n = {};
    for (const id of IDS) n[id] = 0;
    for (const o of (m && m.objs) || []) { const c = deObj(o); if (c) n[c]++; }
    return n;
  }
  function textoDe(id, m, n) {
    if (!m) return '';
    if (id === 'terreno') {
      const p = m.pintura && Array.isArray(m.pintura.ops) ? m.pintura.ops.length : 0, hx = m.hexes ? Object.keys(m.hexes).length : 0;
      return p || hx ? '' : 'sem tinta';
    }
    if (id === 'grade') return m.grade && m.grade.tam > 0 ? (m.grade.on ? '' : 'desligada no mapa') : 'sem grade';
    return n[id] ? String(n[id]) : '—';
  }
  function pintarPop() {
    if (!pop) return;
    const foco = document.activeElement && pop.contains(document.activeElement) ? document.activeElement.getAttribute('data-k') : null;
    const m = App0 && typeof App0.vista === 'function' ? App0.vista() : null, n = contas(m), at = atalhoAtual();
    const linha = c => {
      const ve = !esc.has(c.id), tr = trava.has(c.id), txt = textoDe(c.id, m, n);
      return el('li', { class: 'cam-li' + (ve ? '' : ' esc') + (tr ? ' trava' : ''), 'data-cam': c.id },
        el('button', { type: 'button', class: 'ib cam-olho', 'data-k': 'olho:' + c.id, 'aria-pressed': ve ? 'true' : 'false', title: (ve ? 'Esconder ' : 'Mostrar ') + c.nome,
          'aria-label': c.nome + (ve ? ' à vista' : ' escondida'), icone: ve ? OLHO : OLHO_NAO, onclick: () => mostrar(c.id, !ve) }),
        el('span', { class: 'cam-nome', title: c.dica, onclick: () => mostrar(c.id, !ve) }, el('span', { texto: c.nome }), txt ? el('small', { texto: txt }) : null),
        c.semTrava ? el('span') : el('button', { type: 'button', class: 'ib cam-trava', 'data-k': 'trava:' + c.id, 'aria-pressed': tr ? 'true' : 'false',
          title: tr ? 'Destravar ' + c.nome : 'Travar ' + c.nome + ' (à vista, mas sem escolher nem mexer pelo mapa)', 'aria-label': (tr ? 'Destravar ' : 'Travar ') + c.nome, icone: tr ? CADEADO : CADEADO_ABERTO,
          onclick: () => travar(c.id, !tr) }));
    };
    pop.replaceChildren(...[
      el('div', { class: 'cam-topo' }, el('b', { texto: 'Camadas' }), el('span', { texto: 'Só neste aparelho' }),
        el('button', { type: 'button', class: 'ib', 'data-k': 'fechar', title: 'Fechar (Esc)', 'aria-label': 'Fechar as camadas', onclick: () => fechar(true),
          icone: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>' })),
      // (lote 10) o modo do mapa: como as regiões se pintam
      el('small', { class: 'cam-rot', texto: 'Modo do mapa' }),
      el('div', { class: 'cam-modos', role: 'group', 'aria-label': 'Modo do mapa' }, MODOS.filter(x => modoPode(x.id, mestreAgora())).map(x => el('button', { type: 'button', class: 'chip',
        'data-k': 'modo:' + x.id, 'aria-pressed': modoAtual() === x.id ? 'true' : 'false', title: x.dica, texto: x.nome, onclick: () => mudarModo(x.id) }))),
      el('small', { class: 'cam-rot', texto: 'Camadas' }),
      el('div', { class: 'cam-atalhos', role: 'group', 'aria-label': 'Atalhos' }, ATALHOS.map(a => el('button', { type: 'button', class: 'chip', 'data-k': 'at:' + a.id, 'aria-pressed': at === a.id ? 'true' : 'false',
        title: a.id === 'tudo' ? 'Todas as camadas à vista' : 'Mostra ' + nomes(a.mostra), texto: a.nome, onclick: () => atalho(a.id) }))),
      el('ul', { class: 'cam-lista' }, LISTA.map(linha)),
      trava.size ? el('div', { class: 'cam-pe' }, el('button', { type: 'button', class: 'btn sm', 'data-k': 'destravar', texto: 'Destravar todas', onclick: destravarTodas })) : null,
      el('p', { class: 'cam-nota', texto: 'Esconder só limpa a sua tela: os outros continuam vendo tudo o que viam. Travada: aparece, mas não se escolhe nem se mexe pelo mapa.' })].filter(Boolean));
    if (foco) { const f = pop.querySelector('[data-k="' + foco + '"]') || pop.querySelector('[data-k="fechar"]'); if (f) f.focus(); }
  }
  /* (lote 10) A legenda do modo, no canto do mapa: o nome do modo, o que cada cor quer dizer e o botão que volta ao
     Político (o modo nunca fica ligado sem aparecer). */
  function pintarLegenda() {
    if (!leg) return;
    const md = modoAtual(), A = App0 || window.Mundo, m = A && typeof A.vista === 'function' ? A.vista() : null;
    if (md === 'politico' || !m) { leg.hidden = true; leg.replaceChildren(); return; }
    const def = MODOS.find(x => x.id === md), corpo = [];
    if (md === 'terreno') corpo.push(el('p', { texto: 'As regiões só com a borda e o nome: o terreno aparece por baixo.' }));
    else if (md === 'clima') {
      const N = window.MundoNucleo, mestre = mestreAgora(), vistos = new Set();
      for (const o of m.objs || []) if (o && o.k === 'r' && Array.isArray(o.pts) && o.pts.length >= 3 && objVisivel(o)) { const k = climaDaRegiao(m, o, mestre); if (k) vistos.add(k); }
      const ks = Object.keys(CLIMA_COR).filter(k => vistos.has(k));
      corpo.push(ks.length ? el('ul', null, ks.map(k => el('li', { 'data-clima': k }, el('i', { style: 'background:' + CLIMA_COR[k] }), el('span', { texto: (N && N.CLIMAS && N.CLIMAS[k] ? N.CLIMAS[k].nome : k) }))))
        : el('p', { texto: 'Nenhuma região à vista.' }));
    } else if (md === 'economia') {
      const rec = recDoModo(m), mx = rec ? maxDoRecurso(m, rec.id) : 0;
      const sel = el('select', { class: 'in', 'data-k': 'modo-rec', 'aria-label': 'O recurso do modo Economia', onchange: e => mudarModoRec(e.target.value) },
        m.eco.rec.map(r => { const op = el('option', { value: r.id, texto: r.nome }); if (rec && r.id === rec.id) op.selected = true; return op; }));
      const fmtN = n => (Number.isFinite(n) ? n : 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
      corpo.push(el('label', { class: 'modo-leg-rec' }, el('span', { texto: 'Recurso' }), sel),
        el('div', { class: 'grad', 'aria-hidden': 'true', style: 'background:linear-gradient(90deg,' + BASE_ECO + ',' + (rec ? rec.cor : BASE_ECO) + ')' }),
        el('div', { class: 'grad-n' }, el('span', { texto: '0' }), el('span', { texto: fmtN(mx) + ' por semana' })),
        el('p', { texto: 'A produção de cada região (a parte dela: as sub-regiões mostram a delas).' }));
    } else if (md === 'perigo') {
      corpo.push(el('div', { class: 'grad', 'aria-hidden': 'true' }), el('div', { class: 'grad-n' }, el('span', { texto: '0%' }), el('span', { texto: '50%' }), el('span', { texto: '100%' })),
        el('p', { texto: 'A chance de encontro de cada região (a de dentro vale dentro dela).' }));
    }
    leg.replaceChildren(el('div', { class: 'modo-leg-topo' }, el('b', { texto: 'Modo do mapa: ' + def.nome }),
      el('button', { type: 'button', class: 'btn sm', 'data-k': 'modo-voltar', texto: 'Político', title: 'Voltar ao modo Político (as cores das facções)', onclick: () => mudarModo('politico') })), ...corpo);
    leg.hidden = false;
  }

  function abrir(focar) {
    if (!pop) return;
    pop.hidden = false;
    if (botao) botao.setAttribute('aria-expanded', 'true');
    pintarPop();
    if (focar) { const f = pop.querySelector('.cam-atalhos button'); if (f) f.focus(); }
  }
  function fechar(devolverFoco) {
    if (!aberto()) return;
    pop.hidden = true;
    if (botao) { botao.setAttribute('aria-expanded', 'false'); if (devolverFoco) botao.focus(); }
  }
  function alternar(focar) { if (aberto()) fechar(true); else abrir(focar); }

  function iniciar(App, palco) {
    if (botao || !palco) return;
    App0 = App || window.Mundo || null;
    const caixa = palco.querySelector('.zoom');
    if (!caixa) return;
    ponto = el('i', { class: 'cam-ponto', hidden: true });
    botao = el('button', { type: 'button', class: 'ib cam-bt', id: 'zCamadas', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': 'camPop', icone: ICONE,
      onclick: () => alternar(false) });
    botao.append(ponto);
    caixa.prepend(botao, el('span', { class: 'sep', 'aria-hidden': 'true' }));
    pop = el('div', { class: 'cam-pop', id: 'camPop', role: 'dialog', 'aria-label': 'Camadas do mapa', hidden: true });
    // o que se faz na janelinha não vai para o mapa (nem arrasta, nem dá zoom, nem abre o menu)
    for (const ev of ['pointerdown', 'pointerup', 'dblclick', 'contextmenu', 'wheel']) pop.addEventListener(ev, e => e.stopPropagation(), ev === 'wheel' ? { passive: true } : false);
    palco.append(pop);
    leg = el('div', { class: 'modo-leg', id: 'modoLeg', role: 'note', 'aria-label': 'Legenda do modo do mapa', hidden: true });
    for (const ev of ['pointerdown', 'pointerup', 'dblclick', 'contextmenu', 'wheel']) leg.addEventListener(ev, e => e.stopPropagation(), ev === 'wheel' ? { passive: true } : false);
    palco.append(leg);
    // fecha ao tocar fora dela, como os menus (menos nos avisos: o Desfazer do atalho é dela)
    document.addEventListener('pointerdown', e => { if (aberto() && !pop.contains(e.target) && !botao.contains(e.target) && !(e.target.closest && e.target.closest('#toasts'))) fechar(false); }, true);
    // outra aba deste navegador mudou as camadas: acompanha
    window.addEventListener('storage', e => { if (e.key === CHAVE) { ler(); mudou(true); } });
    if (App0 && typeof App0.on === 'function') for (const ev of ['muda', 'mapas', 'vista', 'papel']) App0.on(ev, () => { if (aberto()) pintarPop(); pintarLegenda(); pintarBotao(); });
    pintarBotao();
    pintarLegenda();
  }

  window.MundoCamadas = {
    LISTA: LISTA.map(c => Object.assign({}, c)), ATALHOS: ATALHOS.map(a => Object.assign({}, a, { mostra: a.mostra.slice() })),
    deObj, visivel, travada, livre, objVisivel, objLivre, estado,
    MODOS: MODOS.map(x => Object.assign({}, x)), CLIMA_COR: Object.assign({}, CLIMA_COR), modoAtual, mudarModo, modoDaRegiao, corPerigo,
    mudarModoRec, recDoModo, misturar, BASE_ECO,
    mostrar, travar, atalho, atalhoAtual, destravarTodas, avisar,
    iniciar, abrir, fechar, alternar, aberto,
    nomeDe: id => { const c = defCamada(id); return c ? c.nome : ''; },
  };
})();
