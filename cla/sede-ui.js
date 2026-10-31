/* Tiny Cats · Clã · a Sede (lote 30): a planta da sede de um clã, na aba Clã.
   Quem mestra monta: arrasta as plantas prontas (Salão, Quartel, Forja, Templo, Estábulo, Torre, nos níveis 1 a 3) para
   o terreno — elas encaixam nos quadrados e não ficam uma em cima da outra —, liga cada prédio a uma construção do clã,
   troca o nível, gira, sorteia outra planta, e põe em volta a muralha, os portões, as estradas, o poço e os jardins.
   O chão vem do lugar do clã no Mapa-múndi (o bioma do hexágono do marcador). "Ver nas Cenas" manda a sede para as
   Cenas (as cenas da sede e de cada andar de cada prédio: criadas ou atualizadas, com prévia e Desfazer).
   Quem joga vê a planta (sem mexer), na parte Sede do salão — no clã dos jogadores, e nos de NPC que o mestre mostrou.
   Cada mudança é um passo do Desfazer da página. A conta (as plantas, os cômodos, as paredes) é a de tc/sede.js. */
window.ClaSedeUI = function (kit) {
  'use strict';
  const S = window.TC.sede, MN = () => window.MundoNucleo || null;
  const { h, toast } = kit;
  const NS = 'http://www.w3.org/2000/svg';
  const C = 20;                                            // unidades do desenho por quadrado
  const j = JSON.stringify;
  const s_ = (tag, attrs, ...kids) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs || {}) { const v = attrs[k]; if (v == null || v === false) continue; if (k === 'text') el.textContent = v; else if (k.startsWith('on')) el[k] = v; else el.setAttribute(k, v === true ? '' : v); }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c);
    return el;
  };
  const COR_CHAO = { campo: '#4b5b40', floresta: '#3a4a32', areia: '#c9a86a', neve: '#dfe6ec' };
  const COR_GRADE = { campo: 'rgba(0,0,0,.18)', floresta: 'rgba(0,0,0,.2)', areia: 'rgba(60,40,10,.18)', neve: 'rgba(40,60,80,.14)' };
  const COR_RUA = { campo: '#7a6950', floresta: '#6b5c45', areia: '#bfa274', neve: '#a99d8d' };
  const TAMANHOS = [[32, 24, 'Pequeno'], [44, 32, 'Médio'], [60, 44, 'Grande'], [80, 60, 'Enorme']];
  // o bioma do Mapa-múndi → o chão da sede
  const CHAO_DO_BIOMA = { campo: 'campo', montanha: 'campo', cristais: 'campo', corrompida: 'campo', lava: 'campo', agua: 'campo', floresta: 'floresta', selva: 'floresta', pantano: 'floresta', deserto: 'areia', savana: 'areia', neve: 'neve', tundra: 'neve' };

  // o estado da tela (só deste aparelho)
  const ui = { cla: null, sel: null, ferr: null, arrasto: null, nivel: {}, linha: null, zoom: 1 };
  const sedeDe = id => S.normSede(kit.doc(S.PRE + id));
  const existe = id => !!kit.doc(S.PRE + id);
  const mudar = (id, rotulo, fn) => kit.mudarDoc(S.PRE + id, rotulo, S.normSede, fn);
  const claDe = id => kit.clasMestre().find(x => x.id === id) || null;

  /* ================= o desenho (o mesmo para quem mestra e para quem joga) ================= */
  function desenho(s, o) {
    o = o || {};
    const ter = S.terrenoDe(s), W = s.W * C, H = s.H * C;
    const svg = s_('svg', { class: 'sede-svg', viewBox: `0 0 ${W} ${H}`, 'data-k': o.k || 'sede-svg', role: 'img', 'aria-label': 'A planta da sede' + (o.nome ? ' de ' + o.nome : '') });
    svg.append(s_('rect', { x: 0, y: 0, width: W, height: H, fill: COR_CHAO[ter] || COR_CHAO.campo, class: 'chao' }));
    // a grade (mais forte a cada 5 quadrados)
    let d1 = '', d5 = '';
    for (let i = 1; i < s.W; i++) (i % 5 ? (d1 += `M${i * C} 0V${H}`) : (d5 += `M${i * C} 0V${H}`));
    for (let k = 1; k < s.H; k++) (k % 5 ? (d1 += `M0 ${k * C}H${W}`) : (d5 += `M0 ${k * C}H${W}`));
    svg.append(s_('path', { d: d1, stroke: COR_GRADE[ter], 'stroke-width': 0.6, fill: 'none' }), s_('path', { d: d5, stroke: COR_GRADE[ter], 'stroke-width': 1.4, fill: 'none' }));
    const camada = s_('g', { class: 'pecas' });
    svg.append(camada);
    const pts = l => l.map(([x, y]) => x * C + ',' + y * C).join(' ');
    // os jardins e as estradas (por baixo), os prédios, a muralha e os portões e o poço (por cima)
    for (const e of s.estruturas) if (e.k === 'jardim') camada.append(peca(e, s_('rect', { x: e.x * C, y: e.y * C, width: e.w * C, height: e.h * C, rx: 3, fill: ter === 'neve' ? '#b9c9bd' : '#3f6a34', stroke: '#8d8a80', 'stroke-width': 2 }),
      s_('text', { x: (e.x + e.w / 2) * C, y: (e.y + e.h / 2) * C + 4, class: 'rot-peca', text: 'Jardim' })));
    for (const e of s.estruturas) if (e.k === 'estrada') camada.append(peca(e, s_('polyline', { points: pts(e.pts), fill: 'none', stroke: COR_RUA[ter], 'stroke-width': S.ESTRUTURAS.estrada.larg * C, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.9 })));
    for (const p of s.predios) camada.append(predio(p, o));
    for (const e of s.estruturas) if (e.k === 'muralha') camada.append(peca(e, s_('polyline', { points: pts(e.pts), fill: 'none', stroke: '#6f727a', 'stroke-width': C, 'stroke-linecap': 'square', 'stroke-linejoin': 'miter' }),
      s_('polyline', { points: pts(e.pts), fill: 'none', stroke: '#9a9ea6', 'stroke-width': C * 0.5, 'stroke-dasharray': '6 4' })));
    for (const e of s.estruturas) if (e.k === 'portao') { const b = S.caixaDe(e); camada.append(peca(e, s_('rect', { x: b.x * C, y: b.y * C, width: b.w * C, height: b.h * C, fill: '#5a3a1e', stroke: '#2e1a0b', 'stroke-width': 2 }), s_('text', { x: (b.x + b.w / 2) * C, y: (b.y + b.h / 2) * C + 4, class: 'rot-peca', text: 'Portão' }))); }
    for (const e of s.estruturas) if (e.k === 'poco') camada.append(peca(e, s_('circle', { cx: (e.x + 1) * C, cy: (e.y + 1) * C, r: C * 0.85, fill: '#2f4f66', stroke: '#8d8a80', 'stroke-width': 5 })));
    return svg;
  }
  function peca(e, ...kids) {
    const g = s_('g', { class: 'peca est' + (ui.sel === e.id ? ' sel' : ''), 'data-id': e.id, 'data-k': 'est:' + e.id }, kids);
    if (ui.sel === e.id) { const b = S.caixaDe(e); if (b) g.append(s_('rect', { class: 'anel', x: b.x * C - 3, y: b.y * C - 3, width: b.w * C + 6, height: b.h * C + 6, rx: 4 })); }
    return g;
  }
  // um prédio: os cômodos do térreo (no piso de cada um), as paredes, as portas, os móveis (pontinhos) e o nome
  function predio(p, o) {
    const pl = p.planta, t = pl.andares.find(a => a.id === 't') || pl.andares[0];
    const g = s_('g', { class: 'peca predio' + (ui.sel === p.id ? ' sel' : ''), 'data-id': p.id, 'data-k': 'pr:' + p.id, transform: `translate(${p.x * C} ${p.y * C})` });
    g.append(s_('rect', { x: 3, y: 4, width: pl.W * C, height: pl.H * C, fill: 'rgba(0,0,0,.35)', class: 'sombra' }));
    const clip = pl.forma === 'oct' ? 'url(#oct-' + p.id + ')' : null;
    if (clip) {
      const k = pl.corte * C, w = pl.W * C, hh = pl.H * C;
      g.append(s_('clipPath', { id: 'oct-' + p.id }, s_('polygon', { points: `${k},0 ${w - k},0 ${w},${k} ${w},${hh - k} ${w - k},${hh} ${k},${hh} 0,${hh - k} 0,${k}` })));
    }
    const pisos = s_('g', { 'clip-path': clip });
    for (const q of t.salas) pisos.append(s_('rect', { x: q.x * C, y: q.y * C, width: q.w * C, height: q.h * C, fill: (S.PISO[q.piso] || S.PISO.madeira).cor, class: 'piso' }));
    for (const m of t.moveis) if (!S.MOVEIS[m.id] || !S.MOVEIS[m.id].chao) pisos.append(s_('rect', { x: m.x * C + 3, y: m.y * C + 3, width: m.s * C - 6, height: m.s * C - 6, rx: 2, class: 'movel' }));
    for (const e of t.escadas) pisos.append(s_('path', { d: `M${e.x * C + 3} ${e.y * C + 4}h${C - 6}M${e.x * C + 3} ${e.y * C + 9}h${C - 6}M${e.x * C + 3} ${e.y * C + 14}h${C - 6}`, class: 'escada' }));
    g.append(pisos);
    if (pl.forma === 'oct') { const k = pl.corte * C, w = pl.W * C, hh = pl.H * C; g.append(s_('polygon', { points: `${k},0 ${w - k},0 ${w},${k} ${w},${hh - k} ${w - k},${hh} ${k},${hh} 0,${hh - k} 0,${k}`, class: 'parede fora', fill: 'none' })); }
    for (const w of S.paredes(t, pl.W, pl.H)) {
      if (pl.forma === 'oct' && w.fora && w.k === 'wall') continue;
      g.append(s_('line', { x1: w.x1 * C, y1: w.y1 * C, x2: w.x2 * C, y2: w.y2 * C, class: 'parede' + (w.fora ? ' fora' : '') + (w.k === 'door' ? ' porta' : w.k === 'window' ? ' janela' : '') + (w.entrada ? ' entrada' : '') }));
    }
    // o nome (com o nível) embaixo; um selo se a construção ligada está em outro nível
    const sug = o.sugestao ? o.sugestao(p) : null;
    g.append(s_('text', { x: pl.W * C / 2, y: pl.H * C + 15, class: 'rot', text: p.nome + ' · nível ' + p.nivel + (pl.andares.length > 1 ? ' · ' + pl.andares.length + ' andares' : '') }));
    if (sug) g.append(s_('g', { class: 'sobe', transform: `translate(${pl.W * C - 4} 4)` }, s_('title', { text: sug }), s_('circle', { r: 9, cx: 0, cy: 0 }), s_('path', { d: 'M-4 2l4-5 4 5M0 -3v8' })));
    if (ui.sel === p.id) g.append(s_('rect', { class: 'anel', x: -4, y: -4, width: pl.W * C + 8, height: pl.H * C + 8, rx: 4 }));
    return g;
  }

  /* ================= a tela de quem mestra ================= */
  // as construções do clã que combinam com o tipo do prédio (o mesmo ícone)
  const consDoTipo = (c, tipo) => c.construcoes.filter(k => k.ico === tipo);
  function sugestaoDe(c, p) {
    const k = p.cons ? c.construcoes.find(x => x.id === p.cons) : null;
    if (!k || k.nivel < 1) return null;
    const nv = Math.max(1, Math.min(3, k.nivel));
    return nv !== p.nivel ? `No Clã, ${k.nome} está no nível ${k.nivel}: a planta do nível ${nv} está pronta para trocar.` : null;
  }
  function tela(x) {
    const id = x.id, c = x.c, s = sedeDe(id);
    if (ui.cla !== id) { ui.cla = id; ui.sel = null; ui.ferr = null; ui.linha = null; }
    if (ui.sel && !s.predios.some(p => p.id === ui.sel) && !s.estruturas.some(e => e.id === ui.sel)) ui.sel = null;
    const svg = desenho(s, { nome: c.nome, sugestao: p => sugestaoDe(c, p) });
    ligarEditor(svg, id, s, c);
    const casca = !!(window.TC && TC.ponte && TC.ponte.ir && TC.ponte.naCasca);
    return h('section', { class: 'sede-ed', 'data-k': 'sede-ed:' + id, 'aria-label': 'A Sede de ' + c.nome },
      h('div', { class: 'sede-top' },
        h('button', { type: 'button', class: 'btn sm', 'data-k': 'sede:voltar', onclick: () => kit.fecharSede() }, '← ' + c.nome),
        h('h2', { class: 'tit', text: 'Sede de ' + c.nome }),
        h('span', { class: 'ajuda', 'data-k': 'sede:resumo', text: S.resumo(s) + (s.lugar ? ' · em ' + (s.lugar.nome || 'um lugar do mapa') : '') }),
        h('span', { class: 'grow' }),
        h('button', { type: 'button', class: 'btn sm pri', 'data-k': 'sede:cenas', disabled: !casca || !s.predios.length && !s.estruturas.length, title: casca ? 'Cria (ou atualiza) as cenas da sede e de cada andar de cada prédio, nas Cenas' : 'As Cenas abrem dentro do site, numa mesa',
          onclick: () => verNasCenas(id, c, 'fora') }, 'Ver nas Cenas')),
      h('div', { class: 'sede-corpo' },
        h('aside', { class: 'sede-plantas', 'aria-label': 'As plantas' }, paleta(id, c)),
        h('div', { class: 'sede-mapa', 'data-k': 'sede:mapa' }, svg, ui.ferr ? h('div', { class: 'sede-dica', role: 'status', 'data-k': 'sede:dica' }, dicaDaFerramenta(), h('button', { type: 'button', class: 'btn sm', 'data-k': 'sede:cancelar', onclick: () => { ui.ferr = null; ui.linha = null; kit.pintar(); } }, ui.ferr.linha ? 'Cancelar (Esc)' : 'Cancelar')) : null),
        h('aside', { class: 'sede-lado', 'aria-label': 'O que está escolhido' }, painel(id, c, s))));
  }
  function dicaDaFerramenta() {
    const f = ui.ferr;
    if (!f) return '';
    if (f.linha) return h('span', null, (f.k === 'muralha' ? 'Muralha' : 'Estrada') + ': clique para pôr os pontos; dois cliques (ou Enter) termina. ' + (ui.linha && ui.linha.length ? ui.linha.length + (ui.linha.length === 1 ? ' ponto.' : ' pontos.') : ''),
      ui.linha && ui.linha.length >= 2 ? h('button', { type: 'button', class: 'btn sm pri', 'data-k': 'sede:linha-ok', onclick: () => terminarLinha() }, 'Terminar') : null);
    return h('span', { text: 'Clique no terreno para pôr ' + (f.salva ? (salvaDe(f.salva) || { nome: 'a planta' }).nome : f.tipo ? (S.PREDIOS[f.tipo].n + ' (nível ' + f.nivel + ')') : S.ESTRUTURAS[f.k].n.toLowerCase()) + '. Esc cancela.' });
  }
  function paleta(id, c) {
    const out = [h('div', { class: 'rot-sec', text: 'Plantas prontas' })];
    for (const tipo of S.TIPOS_PREDIO) {
      const T = S.PREDIOS[tipo], nv = ui.nivel[tipo] || 1, N0 = T.niveis[nv - 1], n = Object.values(N0.andares).reduce((t, l) => t + l.length, 0);
      const ic = (kit.N.ICONES.find(i => i.id === T.ic) || kit.N.ICONES[0]).d, ativo = ui.ferr && ui.ferr.tipo === tipo;
      out.push(h('div', { class: 'planta-card' + (ativo ? ' ativo' : ''), 'data-k': 'pl:' + tipo },
        h('button', { type: 'button', class: 'pc-pegar', 'data-k': 'pl:' + tipo + ':pegar', title: 'Clique e depois clique no terreno (ou arraste até lá)', onpointerdown: ev => pegar(ev, id, c, { tipo, nivel: nv }) },
          kit.icone(ic, 26, '1.6'), h('span', { class: 'pc-tx' }, h('b', { text: T.n }), h('small', { text: N0.W + '×' + N0.H + ' · ' + n + (n === 1 ? ' cômodo' : ' cômodos') + (Object.keys(N0.andares).length > 1 ? ' · ' + Object.keys(N0.andares).length + ' andares' : '') }))),
        h('div', { class: 'pc-niveis', role: 'group', 'aria-label': 'Nível da planta de ' + T.n }, [1, 2, 3].map(k => h('button', { type: 'button', 'data-k': 'pl:' + tipo + ':n' + k, 'aria-pressed': String(nv === k), onclick: () => { ui.nivel[tipo] = k; if (ui.ferr && ui.ferr.tipo === tipo) ui.ferr.nivel = k; kit.pintar(); } }, String(k))))));
    }
    const salvas = kit.plantasSalvas ? kit.plantasSalvas().lista : [];
    if (salvas.length) {
      out.push(h('div', { class: 'rot-sec', text: 'Minhas plantas' }));
      for (const x of salvas) out.push(h('div', { class: 'planta-card' + (ui.ferr && ui.ferr.salva === x.id ? ' ativo' : ''), 'data-k': 'ps:' + x.id },
        h('button', { type: 'button', class: 'pc-pegar', 'data-k': 'ps:' + x.id + ':pegar', title: 'Clique e depois clique no terreno (ou arraste até lá)', onpointerdown: ev => pegar(ev, id, c, { salva: x.id }) },
          kit.icone((kit.N.ICONES.find(i => i.id === (S.PREDIOS[x.tipo] || {}).ic) || kit.N.ICONES[0]).d, 26, '1.6'),
          h('span', { class: 'pc-tx' }, h('b', { text: x.nome }), h('small', { text: x.planta.W + '×' + x.planta.H + ' · ' + x.planta.andares.length + (x.planta.andares.length === 1 ? ' andar' : ' andares') }))),
        h('div', { class: 'pc-niveis' }, h('button', { type: 'button', 'data-k': 'ps:' + x.id + ':apagar', title: 'Apagar esta planta salva', onclick: () => {
          kit.confirmar('Apagar a planta “' + x.nome + '”?', 'Ela sai de “Minhas plantas” (os prédios que já usaram ficam como estão). Dá para desfazer.', 'Apagar').then(sim => {
            if (sim && kit.mudarDoc(kit.PLANTAS, 'apagar a planta ' + x.nome, kit.normPlantas, d => { d.lista = d.lista.filter(y => y.id !== x.id); })) kit.avisoDesfazer('A planta “' + x.nome + '” saiu.');
          });
        } }, 'Apagar'))));
    }
    out.push(h('div', { class: 'rot-sec', text: 'Em volta' }));
    out.push(h('div', { class: 'pc-chips' }, ['muralha', 'portao', 'estrada', 'poco', 'jardim'].map(k => h('button', { type: 'button', class: 'chip-b' + (ui.ferr && ui.ferr.k === k ? ' ativo' : ''), 'data-k': 'pl:' + k,
      onpointerdown: S.ESTRUTURAS[k].linha ? null : ev => pegar(ev, id, c, { k }), onclick: S.ESTRUTURAS[k].linha ? () => { ui.ferr = { k, linha: true }; ui.linha = []; ui.sel = null; kit.pintar(); } : null }, S.ESTRUTURAS[k].n))));
    out.push(h('p', { class: 'ajuda', text: 'Clique numa planta e depois no terreno (ou arraste até lá). Os prédios encaixam nos quadrados e não ficam um em cima do outro.' }));
    return out;
  }
  // o tamanho (em quadrados) do que a ferramenta põe
  const salvaDe = id => (kit.plantasSalvas ? kit.plantasSalvas().lista.find(x => x.id === id) : null) || null;
  function tamanhoDa(f) {
    if (f.salva) { const x = salvaDe(f.salva); return x ? { w: x.planta.W, h: x.planta.H } : { w: 1, h: 1 }; }
    if (f.tipo) { const N0 = S.PREDIOS[f.tipo].niveis[f.nivel - 1]; return { w: N0.W, h: N0.H }; }
    const E = S.ESTRUTURAS[f.k]; return { w: E.w, h: E.h };
  }

  /* ---- o editor: escolher, arrastar, pôr ---- */
  const svgNaTela = () => document.querySelector('[data-k="sede:mapa"] > svg');
  function pontoDe(ev) {
    const svgAtual = svgNaTela();
    if (!svgAtual) return null;
    const r = svgAtual.getBoundingClientRect(), vb = svgAtual.viewBox.baseVal;
    if (!r.width) return null;
    return { x: (ev.clientX - r.left) / r.width * vb.width / C, y: (ev.clientY - r.top) / r.height * vb.height / C };
  }
  function fantasma(svg, caixa, ok) {
    let f = svg.querySelector('.fantasma');
    if (!caixa) { if (f) f.remove(); return; }
    if (!f) { f = s_('rect', { class: 'fantasma' }); svg.append(f); }
    f.setAttribute('x', caixa.x * C); f.setAttribute('y', caixa.y * C); f.setAttribute('width', caixa.w * C); f.setAttribute('height', caixa.h * C);
    f.classList.toggle('ruim', !ok);
  }
  // pegar uma planta (ou peça) da paleta: clicar e soltar fica esperando o clique no terreno; arrastar até o terreno põe
  function pegar(ev, id, c, f) {
    if (ev.button !== 0) return;
    ev.preventDefault();
    ui.ferr = Object.assign({}, f); ui.sel = null; ui.linha = null;
    kit.pintar();
    const mover = e => { const s = sedeDe(id), p = pontoDe(e), svgAtual = svgNaTela(); if (!p || !svgAtual || !ui.ferr) return; const t = tamanhoDa(ui.ferr); const cx = { x: Math.round(p.x - t.w / 2), y: Math.round(p.y - t.h / 2), w: t.w, h: t.h }; const dentro = p.x >= 0 && p.y >= 0 && p.x <= s.W && p.y <= s.H; fantasma(svgAtual, dentro ? cx : null, S.cabe(s, cx)); };
    const soltar = e => {
      window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar);
      const p = pontoDe(e), s = sedeDe(id);
      if (p && p.x >= 0 && p.y >= 0 && p.x <= s.W && p.y <= s.H) colocar(id, c, p);
    };
    window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar);
  }
  function colocar(id, c, p) {
    const f = ui.ferr;
    if (!f || f.linha) return;
    const s = sedeDe(id), t = tamanhoDa(f), cx = { x: Math.round(p.x - t.w / 2), y: Math.round(p.y - t.h / 2), w: t.w, h: t.h };
    if (!S.cabe(s, cx)) { toast('Não cabe aí: fica fora do terreno ou em cima de outra coisa.'); return; }
    let nova = null;
    const salva = f.salva ? salvaDe(f.salva) : null;
    if (f.salva && !salva) { ui.ferr = null; kit.pintar(); return; }
    if (salva) nova = S.normPredio({ tipo: salva.tipo, nome: salva.nome, nivel: 1, seed: 1, mexido: true, x: cx.x, y: cx.y, planta: JSON.parse(JSON.stringify(salva.planta)) });
    else if (f.tipo) {
      nova = S.predioNovo(f.tipo, f.nivel);
      nova.x = cx.x; nova.y = cx.y;
      // liga sozinho à construção do clã do mesmo tipo que ainda não tem prédio (o mestre troca no painel)
      const livres = consDoTipo(c, f.tipo).filter(k => !s.predios.some(q => q.cons === k.id));
      if (livres.length) { nova.cons = livres[0].id; nova.nome = livres[0].nome; }
    } else nova = S.normEstrutura({ k: f.k, x: cx.x, y: cx.y, w: S.ESTRUTURAS[f.k].w, h: S.ESTRUTURAS[f.k].h });
    ui.ferr = null;
    const ehPredio = !!(f.tipo || salva);
    if (mudar(id, 'pôr ' + (salva ? salva.nome : f.tipo ? S.PREDIOS[f.tipo].n : S.ESTRUTURAS[f.k].n).toLowerCase() + ' na sede', d => { if (ehPredio) d.predios.push(nova); else d.estruturas.push(nova); })) {
      ui.sel = nova.id;
      kit.avisoDesfazer((ehPredio ? nova.nome : S.ESTRUTURAS[f.k].n) + ' entrou na sede.');
    }
    kit.pintar();
  }
  function terminarLinha() {
    const id = ui.cla, l = ui.linha, f = ui.ferr;
    if (!f || !f.linha || !l || l.length < 2) { ui.ferr = null; ui.linha = null; kit.pintar(); return; }
    const nova = S.normEstrutura({ k: f.k, pts: l });
    ui.ferr = null; ui.linha = null;
    if (nova && mudar(id, 'pôr ' + (f.k === 'muralha' ? 'a muralha' : 'a estrada') + ' na sede', d => { d.estruturas.push(nova); })) { ui.sel = nova.id; kit.avisoDesfazer((f.k === 'muralha' ? 'A muralha' : 'A estrada') + ' entrou na sede.'); }
    kit.pintar();
  }
  function ligarEditor(svg, id, s, c) {
    svg.addEventListener('pointermove', ev => {
      if (ui.arrasto) return;
      const f = ui.ferr;
      if (!f) return;
      const p = pontoDe(ev); if (!p) return;
      if (f.linha) {
        let pv = svg.querySelector('.linha-previa');
        if (!pv) { pv = s_('polyline', { class: 'linha-previa' }); svg.append(pv); }
        const ponta = [Math.round(p.x * 2) / 2, Math.round(p.y * 2) / 2];
        pv.setAttribute('points', (ui.linha || []).concat([ponta]).map(([x, y]) => x * C + ',' + y * C).join(' '));
        return;
      }
      const t = tamanhoDa(f), cx = { x: Math.round(p.x - t.w / 2), y: Math.round(p.y - t.h / 2), w: t.w, h: t.h };
      fantasma(svg, cx, S.cabe(s, cx));
    });
    svg.addEventListener('pointerleave', () => { if (!ui.arrasto) fantasma(svg, null); });
    svg.addEventListener('dblclick', ev => { if (ui.ferr && ui.ferr.linha) { ev.preventDefault(); terminarLinha(); } });
    svg.addEventListener('pointerdown', ev => {
      if (ev.button !== 0) return;
      const p = pontoDe(ev); if (!p) return;
      const f = ui.ferr;
      if (f && f.linha) {
        const ponta = [Math.min(s.W, Math.max(0, Math.round(p.x * 2) / 2)), Math.min(s.H, Math.max(0, Math.round(p.y * 2) / 2))];
        const l = ui.linha || (ui.linha = []);
        const ult = l[l.length - 1];
        if (!ult || ult[0] !== ponta[0] || ult[1] !== ponta[1]) l.push(ponta);
        kit.pintar();
        return;
      }
      if (f) return;                                     // (pôr: no pointerup, que vem do pegar ou do clique)
      const alvo = ev.target.closest && ev.target.closest('.peca');
      if (!alvo) { if (ui.sel) { ui.sel = null; kit.pintar(); } return; }
      const pid = alvo.getAttribute('data-id'), o = s.predios.find(q => q.id === pid) || s.estruturas.find(q => q.id === pid);
      if (!o) return;
      ui.sel = pid;
      const caixa = S.caixaDe(o);
      if (!caixa) { kit.pintar(); return; }                  // (linhas: só escolher)
      ev.preventDefault();
      ui.arrasto = { id: pid, dx: p.x - caixa.x, dy: p.y - caixa.y, caixa, el: alvo, x0: caixa.x, y0: caixa.y, moveu: false, sel: true };
      if (!alvo.classList.contains('sel')) { alvo.classList.add('sel'); }
      svg.setPointerCapture(ev.pointerId);
    });
    svg.addEventListener('click', ev => {
      const f = ui.ferr;
      if (!f || f.linha || ui.arrasto) return;
      const p = pontoDe(ev); if (p) colocar(id, c, p);
    });
    svg.addEventListener('pointermove', ev => {
      const a = ui.arrasto; if (!a) return;
      const p = pontoDe(ev); if (!p) return;
      const nx = Math.round(p.x - a.dx), ny = Math.round(p.y - a.dy);
      if (nx === a.caixa.x && ny === a.caixa.y && !a.moveu) return;
      a.moveu = true;
      a.caixa = Object.assign({}, a.caixa, { x: nx, y: ny });
      const ok = S.cabe(s, a.caixa, a.id);
      a.el.setAttribute('transform', a.el.classList.contains('predio') ? `translate(${nx * C} ${ny * C})` : `translate(${(nx - a.x0) * C} ${(ny - a.y0) * C})`);
      a.el.classList.toggle('ruim', !ok);
    });
    const fim = ev => {
      const a = ui.arrasto; if (!a) return;
      ui.arrasto = null;
      try { svg.releasePointerCapture(ev.pointerId); } catch (e) { /* já solto */ }
      if (a.moveu && (a.caixa.x !== a.x0 || a.caixa.y !== a.y0)) {
        if (S.cabe(s, a.caixa, a.id)) mudar(id, 'mover na sede', d => { const o = d.predios.find(q => q.id === a.id) || d.estruturas.find(q => q.id === a.id); if (!o) return false; o.x = a.caixa.x; o.y = a.caixa.y; });
        else toast('Não cabe aí: voltou para onde estava.');
      }
      kit.pintar();
    };
    svg.addEventListener('pointerup', fim);
    svg.addEventListener('pointercancel', fim);
  }
  // Esc cancela a ferramenta; Enter termina a linha; Delete apaga o escolhido
  document.addEventListener('keydown', ev => {
    if (!ui.cla || !kit.sedeAberta()) return;
    const tg = ev.target, digitando = tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT');
    if (ev.key === 'Escape' && ui.ferr) { ev.preventDefault(); ui.ferr = null; ui.linha = null; kit.pintar(); }
    else if (ev.key === 'Enter' && ui.ferr && ui.ferr.linha && !digitando) { ev.preventDefault(); terminarLinha(); }
    else if ((ev.key === 'Delete' || ev.key === 'Backspace') && ui.sel && !digitando) { ev.preventDefault(); apagar(ui.cla, ui.sel); }
  });

  /* ---- o painel da direita ---- */
  function campo(rotulo, el, ajuda) { return h('label', { class: 'field' }, h('span', { text: rotulo }), el, ajuda ? h('small', { class: 'ajuda', text: ajuda }) : null); }
  function escolha(k, valor, opcoes, gravar, o) {
    o = o || {};
    return h('select', { class: 'in', 'data-k': k, value: String(valor == null ? '' : valor), disabled: o.off, onchange: function () { gravar(this.value); } }, opcoes.map(([v, t]) => h('option', { value: String(v), text: t })));
  }
  function painel(id, c, s) {
    const p = ui.sel ? s.predios.find(q => q.id === ui.sel) : null, e = !p && ui.sel ? s.estruturas.find(q => q.id === ui.sel) : null;
    if (p) return painelPredio(id, c, s, p);
    if (e) return painelEstrutura(id, s, e);
    return painelTerreno(id, c, s);
  }
  function mapasDaMesa() {
    const out = [];
    for (const l of kit.docs()) {
      if (typeof l.id !== 'string' || !l.id.startsWith('mundo:mapa:') || l.apagado || !l.dados || typeof l.dados !== 'object') continue;
      const m = l.dados, marcadores = (Array.isArray(m.objs) ? m.objs : []).filter(o => o && o.k === 'm' && typeof o.id === 'string' && String(o.nome || '').trim()).map(o => ({ id: o.id, nome: String(o.nome).trim().slice(0, 60), x: o.x, y: o.y }));
      out.push({ id: l.id.slice('mundo:mapa:'.length), nome: String(m.nome || 'Mapa').slice(0, 60), m, marcadores: marcadores.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')) });
    }
    return out.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  // o bioma do hexágono do marcador (o chão da sede), ou '' (mapa sem grade)
  function biomaDe(m, mk) {
    const N = MN();
    if (!N || !N.hexDe || !N.hexParaCena) return '';
    try { const hx = N.hexDe(m, mk.x, mk.y); if (!hx) return ''; const info = N.hexParaCena(m, hx.q, hx.r); return CHAO_DO_BIOMA[info && info.ter] || ''; } catch (e) { return ''; }
  }
  function painelTerreno(id, c, s) {
    const ms = kit.naMesa() ? mapasDaMesa() : [], mapaSel = s.lugar ? ms.find(m => m.id === s.lugar.mapa) : ms[0];
    const tam = TAMANHOS.find(([w, hh]) => w === s.W && hh === s.H);
    const out = [h('h3', { class: 'tit', text: 'O terreno' }),
      campo('Tamanho', escolha('sede:tam', tam ? s.W + 'x' + s.H : '', (tam ? [] : [['', s.W + ' × ' + s.H + ' quadrados']]).concat(TAMANHOS.map(([w, hh, n]) => [w + 'x' + hh, n + ' · ' + w + ' × ' + hh + ' quadrados'])), v => {
        const [w, hh] = v.split('x').map(Number);
        if (!w || !hh) return;
        const fora = s.predios.concat(s.estruturas).filter(o => { const b = S.caixaDe(o); return b && (b.x + b.w > w || b.y + b.h > hh); });
        if (fora.length) { toast('Não dá para diminuir: ' + fora.length + (fora.length === 1 ? ' peça ficaria' : ' peças ficariam') + ' fora do terreno. Mova antes.'); kit.pintar(); return; }
        mudar(id, 'mudar o tamanho do terreno', d => { d.W = w; d.H = hh; });
      }), 'Cada quadrado vale 1,5 m, como nas Cenas.')];
    if (kit.naMesa()) {
      if (!ms.length) out.push(h('p', { class: 'ajuda', 'data-k': 'sede:sem-mapa', text: 'Esta mesa ainda não tem mapa no Mapa-múndi: o chão fica o que você escolher abaixo.' }));
      else {
        if (ms.length > 1) out.push(campo('Mapa', escolha('sede:mapa', mapaSel ? mapaSel.id : '', ms.map(m => [m.id, m.nome]), v => { const m = ms.find(x => x.id === v); mudar(id, 'trocar o mapa da sede', d => { d.lugar = null; }); ui.mapa = m ? m.id : null; })));
        const m = ms.find(x => x.id === (ui.mapa || (mapaSel && mapaSel.id))) || ms[0];
        out.push(campo('Lugar do clã (um marcador do mapa)', escolha('sede:lugar', s.lugar && s.lugar.mapa === m.id ? s.lugar.marcador : '', [['', m.marcadores.length ? 'Nenhum' : 'O mapa ainda não tem marcador com nome']].concat(m.marcadores.map(x => [x.id, x.nome])), v => {
          const mk = m.marcadores.find(x => x.id === v);
          mudar(id, mk ? 'pôr a sede em ' + mk.nome : 'tirar a sede do mapa', d => { d.lugar = mk ? { mapa: m.id, marcador: mk.id, nome: mk.nome, bioma: biomaDe(m.m, mk) } : null; });
        }), s.lugar ? (s.lugar.bioma ? 'O chão vem do hexágono do lugar: ' + (S.TERRENOS.find(([k]) => k === s.lugar.bioma) || ['', s.lugar.bioma])[1].toLowerCase() + '.' : 'O mapa não tem grade de hexágonos ali: escolha o chão abaixo.') : null));
      }
    }
    out.push(campo('Chão', escolha('sede:chao', s.terreno, [['', s.lugar && s.lugar.bioma ? 'O do lugar (' + (S.TERRENOS.find(([k]) => k === s.lugar.bioma) || ['', ''])[1].toLowerCase() + ')' : 'Campo (o padrão)']].concat(S.TERRENOS.map(([k, n]) => [k, n])), v => mudar(id, 'trocar o chão da sede', d => { d.terreno = v; }))),
      campo('Estilo dos prédios', escolha('sede:estilo', s.estilo, S.ESTILOS, v => mudar(id, 'trocar o estilo da sede', d => { d.estilo = v; })), 'O telhado e as paredes, nas Cenas.'));
    if (c.jogadores) out.push(h('p', { class: 'ajuda', 'data-k': 'sede:jog', text: 'É o clã dos jogadores: eles veem a planta da sede (sem mexer), na parte Sede do salão.' }));
    else out.push(h('label', { class: 'chk', 'data-k': 'sede:mostrar-l' }, h('input', { type: 'checkbox', 'data-k': 'sede:mostrar', checked: s.mostrar, onchange: function () { const v = this.checked; if (mudar(id, v ? 'mostrar a sede aos jogadores' : 'esconder a sede dos jogadores', d => { d.mostrar = v; })) kit.avisoDesfazer(v ? 'Os jogadores agora veem a planta desta sede.' : 'A sede ficou escondida dos jogadores.'); } }),
      h('span', null, 'Os jogadores veem a planta desta sede')));
    out.push(h('div', { class: 'sede-dicas' },
      h('p', { class: 'ajuda', text: 'Clique num prédio para mudar o nome, a construção do clã, o nível ou girar. Arraste para mover.' }),
      h('p', { class: 'ajuda', text: '“Ver nas Cenas” cria a cena da sede e a de cada andar de cada prédio; pedir de novo atualiza (os tokens, a névoa e as luzes ficam).' })));
    return out;
  }
  function painelPredio(id, c, s, p) {
    const T = S.PREDIOS[p.tipo], sug = sugestaoDe(c, p), k = p.cons ? c.construcoes.find(x => x.id === p.cons) : null;
    const opc = [['', 'Nenhuma']].concat(c.construcoes.map(x => [x.id, x.nome + (x.nivel ? ' (nível ' + x.nivel + ')' : ' (ainda não construída)') + (s.predios.some(q => q.cons === x.id && q.id !== p.id) ? ' · já tem prédio' : '')]));
    const trocarNivel = nv => {
      const pl = S.plantaPronta(p.tipo, nv, p.seed), cx = { x: p.x, y: p.y, w: pl.W, h: pl.H };
      let alvo = S.cabe(s, cx, p.id) ? cx : S.lugarLivre(s, pl.W, pl.H, p.x, p.y, p.id);
      if (!alvo) { toast('A planta do nível ' + nv + ' não cabe no terreno: aumente o terreno ou abra espaço.'); return; }
      const fazer = () => { if (mudar(id, 'trocar ' + p.nome + ' para o nível ' + nv, d => { const q = d.predios.find(y => y.id === p.id); if (!q) return false; q.nivel = nv; q.planta = pl; q.x = alvo.x; q.y = alvo.y; q.mexido = false; })) kit.avisoDesfazer(p.nome + ' agora tem a planta do nível ' + nv + (alvo !== cx ? ' (mudou de lugar para caber).' : '.')); };
      if (p.mexido) kit.confirmar('Trocar a planta de ' + p.nome + '?', 'Você mexeu nesta planta no construtor: a do nível ' + nv + ' entra no lugar dela (dá para desfazer).', 'Trocar').then(sim => { if (sim) fazer(); });
      else fazer();
    };
    return [
      h('h3', { class: 'tit', text: p.nome }),
      h('p', { class: 'ajuda', text: (T ? T.n : 'Prédio') + ' · ' + p.planta.W + ' × ' + p.planta.H + ' quadrados · ' + p.planta.andares.map(a => S.nomeDoAndar(a.id)).join(', ') }),
      campo('Nome', h('input', { class: 'in', type: 'text', 'data-k': 'pr:nome', value: p.nome, maxlength: S.LIM.nome, onchange: function () { const v = this.value.replace(/\s+/g, ' ').trim(); if (!v) { this.value = p.nome; return; } mudar(id, 'renomear ' + p.nome, d => { const q = d.predios.find(y => y.id === p.id); if (!q) return false; q.nome = v; }); } })),
      campo('Construção do clã', escolha('pr:cons', p.cons || '', opc, v => mudar(id, v ? 'ligar ' + p.nome + ' a uma construção' : 'desligar ' + p.nome + ' da construção', d => { const q = d.predios.find(y => y.id === p.id); if (!q) return false; q.cons = v || null; const kk = c.construcoes.find(x => x.id === v); if (kk && q.nome === (T ? T.n : q.nome)) q.nome = kk.nome; })),
        k ? 'No Clã: ' + k.nome + (k.nivel ? ', nível ' + k.nivel : ', ainda não construída') + '.' : 'Ligada a uma construção, a sede avisa quando ela sobe de nível.'),
      T ? h('div', { class: 'field' }, h('span', { text: 'Nível da planta' }),
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Nível da planta' }, [1, 2, 3].map(nv => h('button', { type: 'button', 'data-k': 'pr:nivel:' + nv, 'aria-pressed': String(p.nivel === nv), onclick: () => { if (p.nivel !== nv) trocarNivel(nv); } }, 'Nível ' + nv)))) : null,
      sug ? h('div', { class: 'aviso-sobe', 'data-k': 'pr:sugestao' }, h('span', { text: sug }), h('button', { type: 'button', class: 'btn sm pri', 'data-k': 'pr:usar-sug', onclick: () => trocarNivel(Math.max(1, Math.min(3, k.nivel))) }, 'Usar a planta do nível ' + Math.max(1, Math.min(3, k.nivel)))) : null,
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn sm', 'data-k': 'pr:girar', title: 'Gira a planta 90° (a porta muda de lado)', onclick: () => {
          const pl = S.girar(p.planta), cx = { x: p.x, y: p.y, w: pl.W, h: pl.H };
          const alvo = S.cabe(s, cx, p.id) ? cx : S.lugarLivre(s, pl.W, pl.H, p.x, p.y, p.id);
          if (!alvo) { toast('Girado, ' + p.nome + ' não cabe no terreno.'); return; }
          mudar(id, 'girar ' + p.nome, d => { const q = d.predios.find(y => y.id === p.id); if (!q) return false; q.planta = pl; q.x = alvo.x; q.y = alvo.y; });
        } }, 'Girar'),
        T ? h('button', { type: 'button', class: 'btn sm', 'data-k': 'pr:outra', title: 'Sorteia outra divisão dos cômodos e outros móveis, no mesmo nível', onclick: () => {
          const fazer = () => { const seed = S.novaSemente(), pl = S.plantaPronta(p.tipo, p.nivel, seed); mudar(id, 'sortear outra planta para ' + p.nome, d => { const q = d.predios.find(y => y.id === p.id); if (!q) return false; q.seed = seed; q.planta = pl; q.mexido = false; }); };
          if (p.mexido) kit.confirmar('Sortear outra planta?', 'Você mexeu nesta planta no construtor: o que mudou sai (dá para desfazer).', 'Sortear').then(sim => { if (sim) fazer(); }); else fazer();
        } }, 'Outra planta') : null,
        kit.construtor ? h('button', { type: 'button', class: 'btn sm', 'data-k': 'pr:construtor', onclick: () => kit.construtor(id, p.id) }, 'Editar no construtor') : null),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn sm', 'data-k': 'pr:cenas', disabled: !(window.TC && TC.ponte && TC.ponte.ir && TC.ponte.naCasca), onclick: () => verNasCenas(id, c, p.id) }, 'Ver por dentro, nas Cenas'),
        h('button', { type: 'button', class: 'btn sm per', 'data-k': 'pr:apagar', onclick: () => apagar(id, p.id) }, 'Tirar da sede')),
      h('button', { type: 'button', class: 'btn sm tracejado', 'data-k': 'pr:soltar', onclick: () => { ui.sel = null; kit.pintar(); } }, 'O terreno'),
    ];
  }
  function painelEstrutura(id, s, e) {
    const E = S.ESTRUTURAS[e.k];
    return [
      h('h3', { class: 'tit', text: E.n }),
      E.linha ? h('p', { class: 'ajuda', text: e.pts.length + ' pontos. Para mudar o traçado, tire e desenhe de novo.' }) : null,
      E.area ? h('div', { class: 'row' },
        campo('Largura', escolha('es:w', e.w, Array.from({ length: 19 }, (_, i) => [i + 2, (i + 2) + ' quadrados']), v => { const w = Number(v), b = { x: e.x, y: e.y, w, h: e.h }; if (!S.cabe(s, b, e.id)) { toast('Assim não cabe.'); kit.pintar(); return; } mudar(id, 'mudar o jardim', d => { const q = d.estruturas.find(y => y.id === e.id); if (!q) return false; q.w = w; }); })),
        campo('Altura', escolha('es:h', e.h, Array.from({ length: 19 }, (_, i) => [i + 2, (i + 2) + ' quadrados']), v => { const hh = Number(v), b = { x: e.x, y: e.y, w: e.w, h: hh }; if (!S.cabe(s, b, e.id)) { toast('Assim não cabe.'); kit.pintar(); return; } mudar(id, 'mudar o jardim', d => { const q = d.estruturas.find(y => y.id === e.id); if (!q) return false; q.h = hh; }); }))) : null,
      e.k === 'portao' ? h('button', { type: 'button', class: 'btn sm', 'data-k': 'es:girar', onclick: () => { const b = S.caixaDe(Object.assign({}, e, { rot: e.rot === 90 ? 0 : 90 })); if (!S.cabe(s, b, e.id)) { toast('Girado, o portão não cabe aí.'); return; } mudar(id, 'girar o portão', d => { const q = d.estruturas.find(y => y.id === e.id); if (!q) return false; q.rot = q.rot === 90 ? 0 : 90; }); } }, 'Girar') : null,
      h('button', { type: 'button', class: 'btn sm per', 'data-k': 'es:apagar', onclick: () => apagar(id, e.id) }, 'Tirar da sede'),
      h('button', { type: 'button', class: 'btn sm tracejado', 'data-k': 'es:soltar', onclick: () => { ui.sel = null; kit.pintar(); } }, 'O terreno'),
    ];
  }
  function apagar(id, pid) {
    const s = sedeDe(id), p = s.predios.find(q => q.id === pid), e = !p && s.estruturas.find(q => q.id === pid);
    if (!p && !e) return;
    const nome = p ? p.nome : S.ESTRUTURAS[e.k].n;
    if (mudar(id, 'tirar ' + nome + ' da sede', d => { d.predios = d.predios.filter(q => q.id !== pid); d.estruturas = d.estruturas.filter(q => q.id !== pid); })) {
      ui.sel = null;
      kit.avisoDesfazer(nome + ' saiu da sede.' + (p ? ' (As cenas que ele já tinha ficam nas Cenas.)' : ''));
    }
    kit.pintar();
  }
  // (lote 39) o brasão do clã, para os objetos da sede nas Cenas (o estandarte, o brasão na parede, o quadro, o atril): as
  // duas cores, a divisão e os desenhos da forma e do símbolo (os caminhos, que lá não tem a lista dos símbolos)
  function brasaoParaCenas(c) {
    const N = window.ClaNucleo;
    if (!N || !c) return null;
    const b = N.normBrasao(c.brasao), f = (N.FORMAS || []).find(x => x.id === b.forma), sm = b.simb && N.SIMBOLOS ? N.SIMBOLOS.get(b.simb) : null;
    // (lote 45) o pedaço da segunda cor (dp) e onde o símbolo fica na forma (st): as divisões e as formas novas desenham igual lá
    return { cores: b.cores.slice(), div: b.div, f: f ? f.d : null, s: sm ? sm.d : null, fl: b.forma === 'flamula',
      dp: N.DIV_PATH && typeof N.DIV_PATH[b.div] === 'string' ? N.DIV_PATH[b.div] : null, st: f && Array.isArray(f.st) ? f.st.slice(0, 3) : null };
  }
  function verNasCenas(id, c, ir) {
    const s = sedeDe(id);
    if (!(window.TC && TC.ponte && TC.ponte.ir)) { toast('As Cenas abrem dentro do site.'); return; }
    if (!existe(id)) mudar(id, 'criar a sede', () => {});
    TC.ponte.ir('cenas', { sede: { cla: id, nome: c.nome, sede: s, ir, brasao: brasaoParaCenas(c) } });
  }

  /* ================= quem joga: a planta, para ver ================= */
  function parteDoSalao(claId, nome) {
    const s = sedeDe(claId);
    if (!existe(claId) || (!s.predios.length && !s.estruturas.length)) return h('p', { class: 'vazio-p', 'data-k': 'sem-sede', text: 'A sede ainda não tem prédios.' });
    ui.sel = null;
    return h('div', { class: 'sede-ver', 'data-k': 'sede-ver' },
      h('p', { class: 'ajuda', text: S.resumo(s) + (s.lugar ? ' · em ' + (s.lugar.nome || 'um lugar do mapa') : '') }),
      h('div', { class: 'sede-mapa so-ver' }, desenho(s, { nome, k: 'sede-ver-svg' })),
      h('ul', { class: 'sede-lista' }, s.predios.map(p => h('li', { 'data-k': 'sv:' + p.id }, h('b', { text: p.nome }), ' · nível ' + p.nivel + ' · ' + p.planta.andares.map(a => S.nomeDoAndar(a.id)).join(', ')))));
  }
  const temSede = claId => { const s = existe(claId) ? sedeDe(claId) : null; return !!s && (s.predios.length > 0 || s.estruturas.length > 0); };
  // o cartão do clã no painel de quem mestra: o resumo e o botão que abre a Sede
  function cartao(x) {
    const s = sedeDe(x.id), tem = s.predios.length || s.estruturas.length;
    return h('div', { class: 'cartao', 'data-k': 'sec:sede' },
      h('div', { class: 'cab' }, h('h2', { class: 'tit', text: 'Sede' }), h('button', { type: 'button', class: 'btn sm pri', 'data-k': 'sede:abrir', onclick: () => kit.abrirSede(x.id) }, tem ? 'Abrir a Sede' : 'Montar a Sede')),
      tem ? h('div', { class: 'sede-mini', 'data-k': 'sede:mini', onclick: () => kit.abrirSede(x.id) }, desenho(s, { nome: x.c.nome, k: 'sede-mini-svg' })) : null,
      h('p', { class: 'ajuda', text: tem ? S.resumo(s) + (x.c.jogadores ? ' · os jogadores veem a planta.' : s.mostrar ? ' · os jogadores veem a planta.' : ' · só você vê.') : 'A planta da sede do clã: os prédios (ligados às construções), a muralha, as estradas. Vira cena nas Cenas, com o interior de cada prédio.' }));
  }
  return { tela, parteDoSalao, temSede, cartao, desenho, ui, verNasCenas };
};
