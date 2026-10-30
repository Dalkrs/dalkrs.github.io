/* =======================================================================
   TC.painelBarras — o painel de barras das Cenas (lote 44; o guia "Painel de barras nas Cenas", versão 2, de 30/10).

   Cada barra especial de classe, raça ou linhagem (49: 12 classes, 35 raças contando as 3 Oradoras como uma, 2
   linhagens) tem um desenho (a face), uma marca (o ícone do selo) e as regras dela: o que enche (as pílulas "na
   hora", "no começo do turno" e "no fim do turno"), o teto por rodada, as ações próprias e o que acontece no fim do
   combate. As definições vêm do protótipo do guia, quase como estão; as Cenas (src/cenas/src/js/10i-painel-barras.js)
   ligam isso aos tokens, às fichas, à ordem de turnos e à mesa ao vivo.

     navegador   <script src="tc/barras-painel.js"> (na página) → window.TC.painelBarras
     Node        const PB = require('./tc/barras-painel.js')

   Uma barra num personagem (o "b"): { def, v, min, max, s (o estado extra: a postura, o juramento, as flechas…),
   cont (as pílulas marcadas que ainda não foram somadas), usos (os toques "na hora" desta rodada), ganhoRodada (quanto
   já entrou no teto desta rodada), aviso }. O "ator" (quem tem as barras): { nome, dono ('mestre' | 'jogador'),
   barras: [b], aba, aberto, logar(texto, cor), rodada() }.
   O que se guarda de cada barra (guardar / restaurar): { s, c (cont), u (usos), g (ganhoRodada) } — o número fica
   onde a ficha já guarda (o recurso dela), ou no token.
   ======================================================================= */
(function (root) {
'use strict';

// ---------- geometria (as faces usam viewBox 0 0 220 220) ----------
const P = (cx, cy, r, a) => { const t = (a - 90) * Math.PI / 180; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; };
const f1 = n => (+n).toFixed(1);
const lim = (n, a, b) => Math.max(a, Math.min(b, n));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function setor(cx, cy, r1, r2, a0, a1){
  const [x1,y1]=P(cx,cy,r2,a0),[x2,y2]=P(cx,cy,r2,a1),[x3,y3]=P(cx,cy,r1,a1),[x4,y4]=P(cx,cy,r1,a0);
  const g = (a1 - a0) > 180 ? 1 : 0;
  return `M${f1(x1)} ${f1(y1)}A${r2} ${r2} 0 ${g} 1 ${f1(x2)} ${f1(y2)}L${f1(x3)} ${f1(y3)}A${r1} ${r1} 0 ${g} 0 ${f1(x4)} ${f1(y4)}Z`;
}
// (as letras do site: Grenze nos títulos e números, Atkinson Hyperlegible no texto)
const FONTE_SERIF = 'Grenze,Georgia,serif', FONTE_SANS = 'Atkinson Hyperlegible Next,Atkinson Hyperlegible,Segoe UI,sans-serif';

// ---------- kit de desenho ----------
const APAGADO = '#ffffff14';
const KIT = {
  // n segmentos em arco; os 'acesos' primeiros na cor
  anel(acesos, r1, r2, cor, o = {}){
    const n = o.n ?? 20, gap = o.gap ?? 2.2, a0 = o.inicio ?? 0, span = o.span ?? 360, cx = o.cx ?? 110, cy = o.cy ?? 110;
    let s = '';
    for (let i = 0; i < n; i++){ const a = a0 + i * span / n;
      s += `<path d="${setor(cx,cy,r1,r2,a+gap/2,a+span/n-gap/2)}" fill="${i < acesos ? cor : (o.apagado ?? APAGADO)}"/>`; }
    return s;
  },
  // enche uma forma (path) de baixo para cima; frac de 0 a 1; riscas a cada 1/n (mais grossa a cada 5)
  encher(id, forma, frac, cor, o = {}){
    const base = o.base ?? 212, topo = o.topo ?? 8, h = (base - topo) * lim(frac, 0, 1), n = o.n ?? 20;
    let s = `<defs><clipPath id="cl-${id}"><path d="${forma}"/></clipPath></defs><path d="${forma}" fill="${o.fundo ?? '#1E2128'}"/>`;
    s += `<rect x="0" y="${f1(base - h)}" width="220" height="${f1(h)}" fill="${cor}" opacity="${o.opacidade ?? 1}" clip-path="url(#cl-${id})"/>`;
    if (o.riscas !== false) for (let i = 1; i < n; i++){ const y = base - (base - topo) * i / n;
      s += `<line x1="0" x2="220" y1="${f1(y)}" y2="${f1(y)}" stroke="#0E1014" stroke-opacity=".32" stroke-width="${i % 5 ? .6 : 1.5}" clip-path="url(#cl-${id})"/>`; }
    s += `<path d="${forma}" fill="none" stroke="${o.contorno ?? '#C9C3B5'}" stroke-width="${o.traco ?? 2.5}" stroke-linejoin="round"/>`;
    return s;
  },
  // um ícone de 24x24 dentro da face
  icone(nome, cx, cy, tam, cor, o = {}){
    const k = tam / 24;
    return `<g transform="translate(${f1(cx - tam/2)} ${f1(cy - tam/2)}) scale(${k.toFixed(3)})" fill="none" stroke="${cor}" stroke-width="${o.traco ?? 1.8}" stroke-linecap="round" stroke-linejoin="round" style="color:${cor}" opacity="${o.opacidade ?? 1}">${ICONES[nome] || ''}</g>`;
  },
  texto(x, y, t, o = {}){
    return `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${o.ancora ?? 'middle'}" font-family="${o.serif ? FONTE_SERIF : FONTE_SANS}" font-size="${o.tam ?? 12}" font-weight="${o.peso ?? 700}" fill="${o.cor ?? '#C9C3B5'}"${o.extra ? ' ' + o.extra : ''}>${t}</text>`;
  },
  // marca clicável (botão dentro da face). k = chave enviada a def.clique(s, k, ctx)
  botao(k, rotulo, desenho){
    return `<g class="clic" tabindex="0" role="button" data-k="${esc(k)}" aria-label="${esc(rotulo)}">${desenho}</g>`;
  }
};

// ---------- ícones (24x24, traço currentColor) ----------
const ICONES = {};
function svgIcone(nome, px = 16, cor = 'currentColor', extra = ''){
  return `<svg class="pb-ic" viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color:${cor}" aria-hidden="true" focusable="false" ${extra}>${ICONES[nome] || ''}</svg>`;
}
// o ícone como um SVG inteiro (para virar imagem, no selo do token desenhado no mapa)
function iconeSolto(nome, cor, px = 24){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="${cor}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="color:${cor}" color="${cor}">${(ICONES[nome] || '').replace(/currentColor/g, cor)}</svg>`;
}

// ---------- registro das barras ----------
const BARRAS = [], BARRA = {};
function barra(d){
  const def = Object.assign({
    cat: 'raca', min: 0, max: 20, inicio: 0, teto: 5, porAcao: null, fim: 'inicio',
    ganhos: [], persiste: [], estado: () => ({}), linha: () => '', acoes: () => ''
  }, d);
  if (def.icone) ICONES[def.id] = def.icone;
  def.ganhos.forEach(g => { g.quando = g.quando || (def.cat === 'classe' ? 'inicio' : 'agora'); g.tipo = g.tipo || 'n'; });
  BARRAS.push(def); BARRA[def.id] = def; return def;
}
const tetoDe = b => typeof b.def.teto === 'function' ? b.def.teto(b.s, b) : b.def.teto;
const mostra = b => b.def.mostra ? b.def.mostra(b.v, b.s) : String(b.v);
const minDe = b => (b.min != null ? b.min : b.def.min), maxDe = b => (b.max != null ? b.max : b.def.max);

// uma barra num personagem; guardado: o que se guardou dela ({ s, c, u, g }); lim: { min, max } da ficha
function instancia(id, v, guardado, limites){
  const def = BARRA[id]; if (!def) throw new Error('barra desconhecida: ' + id);
  const g = guardado && typeof guardado === 'object' ? guardado : {};
  const s = Object.assign(def.estado(), g.s && typeof g.s === 'object' ? JSON.parse(JSON.stringify(g.s)) : {});
  const b = { def, v: v ?? def.inicio, s, cont: g.c && typeof g.c === 'object' ? Object.assign({}, g.c) : {}, usos: g.u && typeof g.u === 'object' ? Object.assign({}, g.u) : {}, ganhoRodada: Math.max(0, Number(g.g) || 0), aviso: '' };
  if (limites && isFinite(limites.min)) b.min = limites.min;
  if (limites && isFinite(limites.max)) b.max = limites.max;
  return b;
}
// o que se guarda (o número não: ele mora no recurso da ficha, ou no token)
const guardar = b => ({ s: JSON.parse(JSON.stringify(b.s || {})), c: Object.assign({}, b.cont), u: Object.assign({}, b.usos), g: b.ganhoRodada || 0 });

// o "ctx" que as barras recebem para mexer no número e escrever no chat
function ctxDe(ator, b){
  const def = b.def;
  const ctx = {
    ator, def, b, nome: ator.nome,
    get v(){ return b.v; }, set v(n){ b.v = lim(Math.round(n), minDe(b), maxDe(b)); },
    get rodada(){ return ator.rodada ? ator.rodada() : 1; },
    log(m){ if (ator.logar) ator.logar(m, def.cor); },
    aviso(m){ b.aviso = m; },
    marcar(gid, n = 1){ b.cont[gid] = n; },
    ganhar(n, motivo, o = {}){
      if (n <= 0) return 0;
      const t = tetoDe(b), livre = (o.foraTeto || t == null) ? Infinity : Math.max(0, t - b.ganhoRodada);
      const antes = b.v; ctx.v = b.v + Math.min(n, livre); const d = b.v - antes;
      if (!o.foraTeto && t != null) b.ganhoRodada += d;
      if (!d){ ctx.aviso(livre === 0 ? `Teto da rodada (${t}) já atingido.` : `${def.barra} já está no máximo.`); return 0; }
      if (!o.mudo) ctx.log(`${ctx.nome}: +${d} ${def.barra}${motivo ? ' (' + motivo + ')' : ''}${d < n ? ', teto' : ''}.`);
      return d;
    },
    perder(n, motivo, o = {}){
      const antes = b.v; ctx.v = b.v - n; const d = antes - b.v;
      if (d && !o.mudo) ctx.log(`${ctx.nome}: −${d} ${def.barra}${motivo ? ' (' + motivo + ')' : ''}.`);
      return d;
    },
    definir(n, motivo, o = {}){
      const antes = b.v; ctx.v = n;
      if (antes !== b.v && !o.mudo) ctx.log(`${ctx.nome}: ${def.barra} ${antes} → ${mostra(b)}${motivo ? ' (' + motivo + ')' : ''}.`);
    }
  };
  return ctx;
}

// roda uma mudança e avisa a barra se o número mexeu
function mexer(ator, b, fn){
  const ctx = ctxDe(ator, b), antes = b.v;
  fn(ctx);
  if (b.v !== antes && b.def.aoMudar) b.def.aoMudar(b.s, ctx, antes);
}

// ---------- ganhos ----------
function valorGanho(b, g){
  const k = b.cont[g.id] || 0, s = b.s;
  if (g.bloq && g.bloq(s, b)) return 0;
  if (g.tipo === 'auto') return g.f(s, b) ? g.v : 0;
  if (g.tipo === 'auto-n') return g.v * g.f(s, b);
  if (g.tipo === 'tg') return k ? g.v : 0;
  return g.v * k;
}
function pendente(b, quando){
  if (b.def.travaGanho && b.def.travaGanho(b.s, b)) return { mais: 0, menos: b.def.ganhos.filter(g => g.quando === quando && g.v < 0).reduce((t, g) => t + valorGanho(b, g), 0) };
  let mais = 0, menos = 0;
  b.def.ganhos.filter(g => g.quando === quando).forEach(g => { const x = valorGanho(b, g); if (x > 0) mais += x; else menos += x; });
  return { mais, menos };
}
function aplicar(ator, b, quando){
  mexer(ator, b, ctx => {
    const { mais, menos } = pendente(b, quando);
    const rot = quando === 'inicio' ? 'começo do turno' : 'fim do turno';
    const ganho = mais ? ctx.ganhar(mais, null, { mudo: true }) : 0;
    const perda = menos ? ctx.perder(-menos, null, { mudo: true }) : 0;
    const partes = []; if (ganho) partes.push('+' + ganho); if (perda) partes.push('−' + perda);
    ctx.log(`${ctx.nome}, ${rot}: ${partes.length ? partes.join(' e ') : '+0'} ${b.def.barra}${mais > ganho ? ' (teto)' : ''}.`);
    b.def.ganhos.filter(g => g.quando === quando).forEach(g => { delete b.cont[g.id]; });
    if (b.def.aposAplicar) b.def.aposAplicar(b.s, ctx, quando);
  });
}
function tocarAgora(ator, b, g){
  mexer(ator, b, ctx => {
    const usados = b.usos[g.id] || 0;
    const motivoBloq = g.bloq && g.bloq(b.s, b);
    if (motivoBloq) return ctx.aviso(typeof motivoBloq === 'string' ? motivoBloq : `${g.c}: não vale agora.`);
    if (b.def.travaGanho && g.v > 0){ const r = b.def.travaGanho(b.s, b); if (r) return ctx.aviso(typeof r === 'string' ? r : `${b.def.barra} não enche agora.`); }
    if (g.max && usados >= g.max) return ctx.aviso(`${g.c}: só ${g.max === 1 ? 'uma vez' : g.max + ' vezes'} por rodada.`);
    if (g.v > 0) ctx.ganhar(g.v, g.c.toLowerCase(), { foraTeto: g.foraTeto });
    else ctx.perder(-g.v, g.c.toLowerCase());
    b.usos[g.id] = usados + 1;
    if (g.ao) g.ao(b.s, ctx);
  });
}

// ---------- turno, rodada e combate ----------
function comecarTurno(ator){
  ator.barras.forEach(b => {
    b.ganhoRodada = 0; b.usos = {};
    if (b.def.aoComecarTurno) mexer(ator, b, ctx => b.def.aoComecarTurno(b.s, ctx));
  });
}
function terminarTurno(ator){
  ator.barras.forEach(b => { if (b.def.aoTerminarTurno) mexer(ator, b, ctx => b.def.aoTerminarTurno(b.s, ctx)); });
}
// inicio: onde a barra começa (a da ficha, com o que os nós somam); sem ele, o do guia
function fimDoCombate(ator, b, inicio){
  mexer(ator, b, ctx => {
    const d = b.def, antes = b.v;
    if (d.aoFimCombate) d.aoFimCombate(b.s, ctx);
    else if (d.fim === 'zera') ctx.v = 0;
    else if (d.fim === 'inicio') ctx.v = inicio != null && isFinite(inicio) ? inicio : d.inicio;
    const novo = d.estado(); d.persiste.forEach(k => { novo[k] = b.s[k]; });
    b.s = novo; b.cont = {}; b.usos = {}; b.ganhoRodada = 0;
    ctx.log(`Fim do combate: ${d.barra} de ${ctx.nome} ${d.fim === 'fica' ? 'fica em ' + mostra(b) : (antes === b.v ? 'fica em ' : 'volta a ') + mostra(b)}.`);
  });
}

// ---------- o painel ----------
function chipHTML(b, g){
  const k = b.cont[g.id] || 0, s = b.s, val = valorGanho(b, g), bloq = g.bloq && g.bloq(s, b);
  const sinal = g.v > 0 ? '+' + g.v : '−' + (-g.v), perda = g.v < 0 ? ' perda' : '';
  const titulo = esc(g.t || g.c);
  if (g.quando === 'agora'){
    const u = b.usos[g.id] || 0, esgotado = g.max && u >= g.max;
    return `<button type="button" class="pb-chip${perda}${u ? ' on' : ''}${(bloq || esgotado) ? ' off' : ''}" data-ga="${g.id}" title="${titulo}${g.max ? ' (até ' + g.max + 'x por rodada)' : ''}">${g.v < 0 ? '▼ ' : ''}${g.c} <b>${sinal}</b>${u ? `<i>×${u}</i>` : ''}</button>`;
  }
  if (g.tipo === 'auto' || g.tipo === 'auto-n'){
    const lig = val !== 0;
    return `<span class="pb-chip auto${perda} ${lig ? 'on' : 'off'}" title="${titulo} (o painel marca sozinho)">${lig ? '✓ ' : ''}${g.c}${g.tipo === 'auto-n' && lig ? ' ×' + g.f(s, b) : ''} <b>${lig ? (val > 0 ? '+' + val : '−' + (-val)) : sinal}</b></span>`;
  }
  if (g.tipo === 'tg') return `<button type="button" class="pb-chip${perda}${k ? ' on' : ''}${bloq ? ' off' : ''}" data-g="${g.id}" aria-pressed="${!!k}" title="${titulo}" ${bloq ? 'disabled' : ''}>${k ? '✓ ' : ''}${g.c} <b>${sinal}</b></button>`;
  return `<span class="pb-par"><button type="button" class="pb-chip${perda}${k ? ' on' : ''}${bloq ? ' off' : ''}" data-gp="${g.id}" title="${titulo}: toque a cada vez" ${bloq ? 'disabled' : ''}>${g.c} <b>${k ? '×' + k + ' = ' + (g.v * k > 0 ? '+' : '−') + Math.abs(g.v * k) : sinal}</b></button>${k ? `<button type="button" class="pb-menos${perda}" data-gm="${g.id}" aria-label="Tirar um de ${esc(g.c)}">−</button>` : ''}</span>`;
}

function ganhosHTML(b){
  const d = b.def, t = tetoDe(b), trava = d.travaGanho && d.travaGanho(b.s, b);
  if (!d.ganhos.length) return '';
  const grupos = [['agora', 'Na hora'], ['inicio', 'No começo do turno'], ['fim', 'No fim do turno']];
  let h = '';
  if (t != null){
    const pips = Array.from({ length: t }, (_, i) => `<i class="${i < b.ganhoRodada ? 'on' : ''}"></i>`).join('');
    h += `<div class="pb-medidor" title="Quanto já entrou nesta rodada">${trava ? `<span class="pb-trava">${esc(typeof trava === 'string' ? trava : 'A barra não enche agora.')}</span>` : `<span>Nesta rodada: +${b.ganhoRodada} de ${t}${d.porAcao ? ` · até ${d.porAcao} por ação` : ''}</span>`}<span class="pb-pips">${pips}</span></div>`;
  }
  for (const [q, nome] of grupos){
    const gs = d.ganhos.filter(g => g.quando === q); if (!gs.length) continue;
    h += `<div class="pb-grupo"><h3>${nome}</h3><div class="pb-chips">${gs.map(g => chipHTML(b, g)).join('')}</div>`;
    if (q !== 'agora'){
      const { mais, menos } = pendente(b, q), livre = t == null ? Infinity : Math.max(0, t - b.ganhoRodada), m = Math.min(mais, livre);
      const partes = []; if (m || (!menos)) partes.push('+' + m); if (menos) partes.push('−' + (-menos));
      h += `<button type="button" class="pb-somar" data-a="__aplicar" data-q="${q}" ${(mais || menos) ? '' : 'disabled'}>${q === 'inicio' ? 'Somar' : 'Aplicar'} ${partes.join(' e ')} ${d.barra}${mais > livre ? ' (teto)' : ''}</button>`;
    }
    h += `</div>`;
  }
  return `<div class="pb-caixa pb-ganhos" data-sem-tags>${h}</div>`;
}

function faceSVG(b, papel){
  return `<svg viewBox="0 0 220 220" ${papel ? `role="img" aria-label="${esc(b.def.barra)}: ${esc(mostra(b))}"` : 'aria-hidden="true"'}>${b.def.face.call(b.def, b.s, b.v, b)}</svg>`;
}
const deTexto = b => (b.def.de || (minDe(b) < 0 ? `${minDe(b)} a +${maxDe(b)}` : 'de ' + maxDe(b)));

/* o: { papel ('mestre' | 'jogador'), desfazer (há o que desfazer), esconder (o jogador pode esconder o painel) }
   ("Fim do combate", uma barra só, é do mestre: o fim de todas vem com o "Encerrar" da aba Turnos. As abas, os botões
   e os ganhos não ganham o sublinhado do glossário; a linha de estado, sim.) */
function painelHTML(ator, o){
  o = o || {};
  const b = ator.barras[ator.aba] || ator.barras[0], d = b.def;
  if (!ator.aberto){
    return { cls: 'pb moeda', html: `<div class="pb-face">${faceSVG(b)}</div><div class="pb-mv">${ator.barras.map(x => `<span style="color:${x.def.cor}">${svgIcone(x.def.id, 14)}<b>${esc(mostra(x))}</b></span>`).join('')}<small>${esc(ator.nome)}</small></div>` };
  }
  const so = ator.barras.length === 1;
  const abas = ator.barras.map((x, i) => `<button type="button" class="pb-aba" role="tab" aria-selected="${i === ator.aba}" data-a="__aba" data-i="${i}" style="--ac:${x.def.cor}" title="${esc(x.def.arvore)}">${svgIcone(x.def.id, 15)}<span>${esc(x.def.barra)}</span>${so ? `<small>${esc(x.def.arvore)}</small>` : `<b>${esc(mostra(x))}</b>`}</button>`).join('');
  const linha = b.aviso ? `<span class="aviso">${esc(b.aviso)}</span>` : d.linha.call(d, b.s, ctxDe(ator, b));
  const acoes = d.acoes.call(d, b.s, ctxDe(ator, b));
  b.aviso = '';
  const mestre = o.papel === 'mestre';
  return { cls: 'pb', html: `
    <div class="pb-cab" data-sem-tags><span class="pb-quem">${esc(ator.nome)}${ator.dono === 'mestre' ? ' <em>NPC</em>' : ''}</span>
      ${!mestre && o.esconder ? `<button type="button" class="pb-x" data-a="__esconder" aria-label="Esconder o painel neste aparelho" title="Esconder o painel neste aparelho (a aba Turnos mostra de novo)"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4.6 9.5 7-.4 1-1.3 2.4-2.6 3.7M6.2 6.6C4.3 8 3 10 2.5 12c1 2.4 4.5 7 9.5 7 1.7 0 3.2-.5 4.5-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg></button>` : ''}
      <button type="button" class="pb-x" data-a="__recolher" aria-label="${mestre ? 'Fechar o painel' : 'Recolher o painel'}" title="${mestre ? 'Fechar' : 'Recolher (vira a moeda)'}">${mestre ? '✕' : '▾'}</button></div>
    <div class="pb-abas" role="tablist" data-sem-tags>${abas}</div>
    <div class="pb-face">${faceSVG(b, true)}<div class="pb-valor">${esc(mostra(b))}<small>${esc(deTexto(b))}</small></div></div>
    <div class="pb-estado" aria-live="polite">${linha}</div>
    ${acoes ? `<div class="pb-caixa" data-sem-tags><div class="pb-acoes">${acoes}</div></div>` : ''}
    ${ganhosHTML(b)}
    <div class="pb-rodape" data-sem-tags><span class="pb-mao">Ajuste <button type="button" data-a="__menos" aria-label="Tirar 1 de ${esc(d.barra)}">−</button><button type="button" data-a="__mais" aria-label="Pôr 1 de ${esc(d.barra)}">+</button></span>
      ${o.desfazer ? `<button type="button" class="pb-fim" data-a="__desfazer" title="Volta o último toque neste painel">Desfazer</button>` : ''}
      ${mestre ? `<button type="button" class="pb-fim" data-a="__fim" title="Só esta barra; “Encerrar”, na aba Turnos, faz o fim de todas">Fim do combate</button>` : ''}</div>` };
}

// liga um elemento de painel a um personagem; quem chama guarda el._ator e el._opts
function desenharPainel(el){
  const ator = el._ator, o = el._opts || {};
  if (!ator){ el.hidden = true; return; }
  el.hidden = false;
  const b = ator.barras[ator.aba] || ator.barras[0];
  el.style.setProperty('--c', b.def.cor);
  const { cls, html } = painelHTML(ator, o);
  el.className = cls + (o.extraCls ? ' ' + o.extraCls : '');
  if (!ator.aberto){ el.setAttribute('role', 'button'); el.tabIndex = 0; el.setAttribute('aria-label', `${ator.nome}: abrir o painel de barras`); el.title = `${ator.nome}: ${ator.barras.map(x => x.def.barra + ' ' + mostra(x)).join(', ')}`; }
  else { el.removeAttribute('role'); el.removeAttribute('tabindex'); el.setAttribute('aria-label', `Painel de barras de ${ator.nome}`); el.removeAttribute('title'); }
  // (o foco fica onde estava, quando o elemento continua lá depois de redesenhar)
  const a = el.ownerDocument && el.ownerDocument.activeElement, foco = a && el.contains(a) ? (a.dataset.k ? `[data-k="${a.dataset.k}"]` : a.dataset.a ? `[data-a="${a.dataset.a}"]${a.dataset.i ? `[data-i="${a.dataset.i}"]` : ''}${a.dataset.q ? `[data-q="${a.dataset.q}"]` : ''}` : a.dataset.ga ? `[data-ga="${a.dataset.ga}"]` : a.dataset.g ? `[data-g="${a.dataset.g}"]` : a.dataset.gp ? `[data-gp="${a.dataset.gp}"]` : a.dataset.gm ? `[data-gm="${a.dataset.gm}"]` : null) : null;
  el.innerHTML = html;
  if (foco) { try { const n = el.querySelector(foco); if (n) n.focus({ preventScroll: true }); } catch (e) { /* seletor estranho: deixa o foco */ } }
  if (o.aoDesenhar) o.aoDesenhar();
}

/* Os toques no painel. opts (el._opts): aoAntes(ator, b) — logo antes de mexer (para o Desfazer); aoMexer(ator) —
   depois de qualquer mudança (para gravar); aoFechar(); aoEsconder(); aoDesfazer(); aoAbrir(ator). */
function ligarPainel(el){
  const opts = () => el._opts || {};
  const redesenha = () => { desenharPainel(el); };
  const mudou = ator => { if (opts().aoMexer) opts().aoMexer(ator); redesenha(); };
  const antes = (ator, b) => { if (opts().aoAntes) opts().aoAntes(ator, b); };
  el.addEventListener('click', e => {
    const ator = el._ator; if (!ator) return;
    if (!ator.aberto){ ator.aberto = true; if (opts().aoAbrir) opts().aoAbrir(ator); return redesenha(); }
    const b = ator.barras[ator.aba] || ator.barras[0], d = b.def;
    const k = e.target.closest('[data-k]');
    if (k && d.clique){ antes(ator, b); mexer(ator, b, ctx => d.clique.call(d, b.s, k.dataset.k, ctx)); return mudou(ator); }
    const bt = e.target.closest('button'); if (!bt || bt.disabled) return;
    if (bt.dataset.ga){ antes(ator, b); tocarAgora(ator, b, d.ganhos.find(g => g.id === bt.dataset.ga)); return mudou(ator); }
    if (bt.dataset.g){ antes(ator, b); b.cont[bt.dataset.g] = b.cont[bt.dataset.g] ? 0 : 1; return mudou(ator); }
    if (bt.dataset.gp){ const g = d.ganhos.find(x => x.id === bt.dataset.gp), n = (b.cont[g.id] || 0) + 1; if (g.max && n > g.max) { b.aviso = `${g.c}: no máximo ${g.max}.`; return redesenha(); } antes(ator, b); b.cont[g.id] = n; return mudou(ator); }
    if (bt.dataset.gm){ antes(ator, b); b.cont[bt.dataset.gm] = Math.max(0, (b.cont[bt.dataset.gm] || 0) - 1); return mudou(ator); }
    const a = bt.dataset.a; if (!a) return;
    if (a === '__aba'){ ator.aba = +bt.dataset.i; return redesenha(); }
    if (a === '__recolher'){ if (opts().aoFechar) opts().aoFechar(ator); else ator.aberto = false; return redesenha(); }
    if (a === '__esconder'){ if (opts().aoEsconder) opts().aoEsconder(ator); return; }
    if (a === '__desfazer'){ if (opts().aoDesfazer) opts().aoDesfazer(ator); return redesenha(); }
    if (a === '__mais'){ antes(ator, b); mexer(ator, b, ctx => { ctx.v = b.v + 1; }); return mudou(ator); }
    if (a === '__menos'){ antes(ator, b); mexer(ator, b, ctx => { ctx.v = b.v - 1; }); return mudou(ator); }
    if (a === '__fim'){ antes(ator, b); fimDoCombate(ator, b, b.inicioFicha); return mudou(ator); }
    if (a === '__aplicar'){ antes(ator, b); aplicar(ator, b, bt.dataset.q); return mudou(ator); }
    if (d.acao){ antes(ator, b); mexer(ator, b, ctx => d.acao.call(d, b.s, a, ctx, bt.value, bt)); mudou(ator); }
  });
  el.addEventListener('change', e => {
    const ator = el._ator, sel = e.target.closest('select'); if (!ator || !sel) return;
    const b = ator.barras[ator.aba] || ator.barras[0], d = b.def;
    if (d.acao){ antes(ator, b); mexer(ator, b, ctx => d.acao.call(d, b.s, sel.dataset.a, ctx, sel.value, sel)); }
    mudou(ator);
  });
  // dica antes de tocar numa marca da face (custo da troca etc.)
  const dica = (e, sai) => {
    const ator = el._ator; if (!ator || !ator.aberto) return;
    const b = ator.barras[ator.aba] || ator.barras[0], d = b.def, k = e.target.closest('[data-k]');
    if (!k || !d.dica) return;
    const alvo = el.querySelector('.pb-estado'); if (!alvo) return;
    alvo.innerHTML = sai ? d.linha.call(d, b.s, ctxDe(ator, b)) : d.dica.call(d, b.s, k.dataset.k, ctxDe(ator, b));
  };
  el.addEventListener('mouseover', e => dica(e, false));
  el.addEventListener('mouseout', e => dica(e, true));
  el.addEventListener('focusin', e => dica(e, false));
  el.addEventListener('focusout', e => dica(e, true));
  el.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const ator = el._ator; if (!ator) return;
    if (!ator.aberto){ if (e.target !== el) return; e.preventDefault(); ator.aberto = true; if (opts().aoAbrir) opts().aoAbrir(ator); return redesenha(); }
    const g = e.target.closest('.clic'); if (!g) return;
    e.preventDefault(); const sel = `[data-k="${CSS.escape(g.dataset.k)}"]`;
    g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const novo = el.querySelector(sel); if (novo) novo.focus();
  });
}

// ---------- selo do token (o que o mestre vê) ----------
// as partes do selo: [{ id, cor, marca (o texto no lugar do ícone: o kanji da postura, ✕), n (o número) }]
const seloDe = ator => ator.barras.map(b => ({ id: b.def.id, cor: b.def.cor, marca: b.def.selo ? b.def.selo(b.s, b) : null, n: mostra(b), barra: b.def.barra }));
function seloHTML(ator){
  return seloDe(ator).map(p => `<span class="pb-sl" style="--sc:${p.cor}">${p.marca ? `<span class="pb-gl">${esc(p.marca)}</span>` : svgIcone(p.id, 14)}<b>${esc(p.n)}</b></span>`).join('');
}

/* ===================================================================== */

/* ===== classes.js ===== */
/* =====================================================================
   AS 12 CLASSES. Barra 0–20, começa em 0 e zera no fim do combate.
   Ganhos somados no começo do turno do dono (teto 5; Mago 6).
   Samurai e Monge usam os kanjis das posturas; o resto usa ícones.
   ===================================================================== */

// ícones extras usados dentro das faces (juramentos do Aégis)
Object.assign(ICONES, {
  'jur-tutelado': '<path d="M5 11.5C6.4 7 8.9 4.6 12 4.6S17.6 7 19 11.5"/><circle cx="12" cy="12.6" r="2.3"/><path d="M8.3 20.2C8.3 17.3 9.9 15.8 12 15.8S15.7 17.3 15.7 20.2"/>',
  'jur-erguido': '<path d="M12 19V5"/><path d="M7 10L12 5L17 10"/><path d="M5.5 20H18.5"/>',
  'jur-linha': '<path d="M3.5 13H20.5"/><path d="M6.5 8V18M12 8V18M17.5 8V18"/>',
  'jur-troco': '<path d="M18.5 7.5H9.5A4.5 4.5 0 0 0 9.5 16.5H16"/><path d="M12.8 13.2L16.2 16.5L12.8 19.8"/>',
  'jur-verdade': '<path d="M3 12C5.5 7.6 8.5 5.6 12 5.6S18.5 7.6 21 12C18.5 16.4 15.5 18.4 12 18.4S5.5 16.4 3 12Z"/><circle cx="12" cy="12" r="2.6"/>'
});

// ---------------- Samurai: a Roda ----------------
const SAM = {
  fam: {ceu:{n:'Céu',a:0}, vento:{n:'Vento',a:90}, terra:{n:'Terra',a:180}, sombra:{n:'Sombra',a:270}},
  oposta: {ceu:'terra', terra:'ceu', vento:'sombra', sombra:'vento'},
  posturas: { // id do nó: [nome, família, glifo da árvore]
    alta:['Postura Alta','ceu','上'], tempestade:['Postura da Tempestade Contida','ceu','雷'], ceupartido:['Postura do Céu Partido','ceu','天'],
    cruzadas:['Postura das Lâminas Cruzadas','vento','二'], vento:['Postura do Vento Parado','vento','風'], vendaval:['Postura do Vendaval','vento','旋'],
    baixa:['Postura Baixa','terra','下'], ombro:['Postura do Ombro','terra','八'], rasteiro:['Postura do Vento Rasteiro','terra','塵'],
    oculta:['Postura Oculta','sombra','脇'], bainha:['Postura da Bainha','sombra','抜'], adormecido:['Postura do Trovão Adormecido','sombra','鞘'],
    media:['Postura Média',null,'中']
  }
};
function custoSamurai(st, alvo){
  if (!st.usouPrimeira) return [0,'a primeira do combate não custa Postura'];
  if (alvo === st.ultima) return [0,'voltar para a última não custa Postura'];
  if (alvo === 'media') return [0,'voltar para a Média não custa Postura'];
  if (!st.atual || st.atual === 'media') return [2,'sair da Média'];
  const fa = SAM.posturas[st.atual][1], fb = SAM.posturas[alvo][1];
  if (fa === fb) return [2,'mesma família'];
  if (SAM.oposta[fa] === fb) return [6,'família oposta'];
  return [4,'família vizinha'];
}

barra({id:'samurai', cat:'classe', arvore:'Samurai', barra:'Postura', cor:'#D9A441', fim:'zera', demo:8,
  icone:'<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4C13.7 9.2 13.7 14.8 12 16.6C10.3 14.8 10.3 9.2 12 7.4Z"/><circle cx="7.6" cy="12" r=".9" fill="currentColor"/><circle cx="16.4" cy="12" r=".9" fill="currentColor"/>',
  estado:()=>({atual:null, ultima:null, usouPrimeira:false}),
  ganhos:[{id:'g1',c:'Em postura',t:'Está numa postura de samurai',v:2,tipo:'auto',f:s=>!!s.atual},
          {id:'g2',c:'Família pediu',t:'Fez o que a família pede',v:1,tipo:'tg'},
          {id:'g3',c:'Postura pediu',t:'Fez o que a postura pede',v:1,tipo:'tg'}],
  selo:s=> s.atual ? SAM.posturas[s.atual][2] : null,
  face(s, v){
    let o = `<defs><radialGradient id="samurai-ferro" cx="40%" cy="35%"><stop offset="0" stop-color="#4A4D55"/><stop offset="1" stop-color="#1E2026"/></radialGradient></defs>`;
    o += `<circle cx="110" cy="110" r="108" fill="#0E1014"/>` + KIT.anel(v, 97, 107, this.cor, {gap:2.6});
    o += `<circle cx="110" cy="110" r="93" fill="url(#samurai-ferro)" stroke="#5A5D66" stroke-width="1"/>`;
    [45,135,225,315].forEach(a=>{const [x1,y1]=P(110,110,24,a),[x2,y2]=P(110,110,91,a);o+=`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="#ffffff1f" stroke-width="1.2"/>`;});
    for (const [fid,f] of Object.entries(SAM.fam)){
      const ativa = s.atual && SAM.posturas[s.atual][1]===fid;
      const [kx,ky] = P(110,110,82,f.a), rot = f.a===90 ? 90 : f.a===270 ? -90 : 0;
      o += `<text x="${f1(kx)}" y="${f1(ky)}" dy="4" transform="rotate(${rot} ${f1(kx)} ${f1(ky)})" text-anchor="middle" font-family="${FONTE_SANS}" font-size="11.5" font-weight="800" fill="${ativa ? this.cor : '#A9A397'}">${f.n}</text>`;
      Object.entries(SAM.posturas).filter(([,p])=>p[1]===fid).forEach(([pid,p],i)=>{
        const [x,y] = P(110,110,60,f.a + (i-1)*25), at = s.atual===pid, ult = s.ultima===pid && !at;
        o += KIT.botao(pid, p[0], `<circle cx="${f1(x)}" cy="${f1(y)}" r="11.5" fill="${at?this.cor:'#2A2D35'}" stroke="${at?'#fff':ult?this.cor:'#7E7A72'}" stroke-width="${at?2:1.4}" ${ult?'stroke-dasharray="3 2"':''}/>
          <text x="${f1(x)}" y="${f1(y+4.3)}" text-anchor="middle" font-family="${FONTE_SERIF}" font-size="12.5" font-weight="700" fill="${at?'#16191F':'#E2DCCF'}" pointer-events="none">${p[2]}</text>`);
      });
    }
    const at = s.atual==='media', ult = s.ultima==='media' && !at;
    o += KIT.botao('media', 'Postura Média', `<path d="M110 88 C121 99 121 121 110 132 C99 121 99 99 110 88Z" fill="${at?this.cor:'#0B0C10'}" stroke="${at?'#fff':ult?this.cor:'#7E7A72'}" stroke-width="1.6" ${ult?'stroke-dasharray="3 2"':''}/>`);
    o += `<ellipse cx="84" cy="110" rx="3.5" ry="8" fill="#0B0C10"/><ellipse cx="136" cy="110" rx="3.5" ry="8" fill="#0B0C10"/>`;
    return o;
  },
  dica(s, k){
    const [c,why] = custoSamurai(s, k), p = SAM.posturas[k];
    if (k === s.atual) return `<b>${p[0]}</b> <em>· é a postura atual</em>`;
    return `<b>${p[0]}</b> <em>· ${c ? 'custa '+c+' de Postura' : why} (${c ? why+', ' : ''}gasta a ação)</em>`;
  },
  linha(s){
    if (!s.atual) return `<em>Fora de postura. Toque numa marca da tsuba para entrar; o centro é a Postura Média.</em>`;
    const p = SAM.posturas[s.atual]; return `<b>${p[0]}</b> <em>· ${p[1] ? 'família '+SAM.fam[p[1]].n : 'centro da Roda (2 reações por rodada)'}</em>`;
  },
  acoes:s=> s.atual ? `<button type="button" data-a="cai" title="Caído, Atordoado, Agarrado ou empurrado">A postura caiu</button>` : '',
  clique(s, k, ctx){
    if (k === s.atual) return;
    const [c] = custoSamurai(s, k);
    if (c > ctx.v) return ctx.aviso(`Falta Postura: ${SAM.posturas[k][0]} custa ${c}.`);
    if (s.atual) s.ultima = s.atual; s.atual = k; s.usouPrimeira = true;
    ctx.v -= c;
    ctx.log(`${ctx.nome} entrou na ${SAM.posturas[k][0]}${c ? ' (−'+c+' Postura)' : ''}.`);
  },
  acao(s, a, ctx){ if (a==='cai' && s.atual){ s.ultima = s.atual; s.atual = null; ctx.log(`A postura de ${ctx.nome} caiu.`); } },
  aoMudar(s, ctx){ if (ctx.v <= 0 && s.atual){ s.ultima = s.atual; s.atual = null; ctx.log(`Postura de ${ctx.nome} chegou a 0: a postura caiu.`); } }
});

// ---------------- Monge ----------------
barra({id:'monge', cat:'classe', arvore:'Monge', barra:'Qi', cor:'#7FB7A8', fim:'zera', demo:8,
  icone:'<path d="M17.8 6.4A8 8 0 1 0 19.7 14.2" stroke-width="2.6"/><circle cx="19.6" cy="11" r="1" fill="currentColor" stroke="none"/>',
  posturas:{tigre:['Postura do Tigre','虎'],serpente:['Postura da Serpente','蛇'],grou:['Postura do Grou','鶴'],almaaberta:['Postura da Alma Aberta','開'],
            roda:['Postura da Roda','輪'],varalonga:['Postura da Vara Longa','長'],macaco:['Postura do Macaco','猴']},
  estado:()=>({atual:null, usouPrimeira:false, pend:null}),
  ganhos:[{id:'g1',c:'Em postura',t:'Está numa postura de monge',v:2,tipo:'auto',f:s=>!!s.atual},
          {id:'g2',c:'Golpe desarmado',t:'Golpe desarmado que acertou',v:1},
          {id:'g3',c:'Esquiva ou aparada',t:'Esquiva ou aparada com sucesso',v:1}],
  selo(s){ return s.atual ? this.posturas[s.atual][1] : '気'; },
  face(s, v){
    let o = `<circle cx="110" cy="110" r="104" fill="#0E1014"/>` + KIT.anel(v, 82, 100, this.cor, {inicio:14, span:332, gap:3.4});
    Object.entries(this.posturas).forEach(([pid,[n,k]],i,arr)=>{ const [x,y]=P(110,110,52,i*360/arr.length); const at=s.atual===pid, pe=s.pend===pid;
      o += KIT.botao(pid, n, `<circle cx="${f1(x)}" cy="${f1(y)}" r="16" fill="${at?this.cor:'#22262E'}" stroke="${at?'#fff':pe?this.cor:'#6F7684'}" stroke-width="${pe?2:1.4}" ${pe?'stroke-dasharray="3 2"':''}/>
        <text x="${f1(x)}" y="${f1(y+5.5)}" text-anchor="middle" font-family="${FONTE_SERIF}" font-size="16" fill="${at?'#0E1014':'#D8D2C4'}" pointer-events="none">${k}</text>`); });
    o += `<text x="110" y="119" text-anchor="middle" font-family="${FONTE_SERIF}" font-size="24" font-weight="800" fill="${this.cor}">気</text>`;
    return o;
  },
  dica(s, k){ return k === s.atual ? `<b>${this.posturas[k][0]}</b> <em>· é a postura atual</em>` : `<b>${this.posturas[k][0]}</b> <em>· ${s.usouPrimeira ? 'trocar gasta a ação ou 2 de Qi' : 'a primeira do combate não custa nada'}</em>`; },
  linha(s){
    if (s.pend) return `<b>${this.posturas[s.pend][0]}</b> <em>· trocar gasta a ação ou 2 de Qi. Escolha abaixo.</em>`;
    return s.atual ? `<b>${this.posturas[s.atual][0]}</b> <em>· uma postura de classe por vez</em>` : `<em>Fora de postura. A primeira do combate não custa nada.</em>`;
  },
  acoes(s){ return s.pend ? `<button type="button" data-a="acao">Gastar a ação</button><button type="button" class="gasta" data-a="qi">▼ Gastar 2 Qi</button><button type="button" data-a="nao">Cancelar</button>`
    : s.atual ? `<button type="button" data-a="cai" title="Atordoado, Paralisado ou Qi bloqueado">A postura caiu</button>` : ''; },
  clique(s, k, ctx){
    if (k === s.atual) return;
    if (!s.usouPrimeira){ s.atual = k; s.usouPrimeira = true; return ctx.log(`${ctx.nome} entrou na ${this.posturas[k][0]}.`); }
    s.pend = k;
  },
  acao(s, a, ctx){
    if (a==='cai' && s.atual){ ctx.log(`A ${this.posturas[s.atual][0]} de ${ctx.nome} caiu.`); s.atual = null; return; }
    if (!s.pend) return;
    if (a==='qi'){ if (ctx.v < 2) return ctx.aviso('Falta Qi: trocar custa 2.'); ctx.v -= 2; s.atual = s.pend; ctx.log(`${ctx.nome} trocou para a ${this.posturas[s.atual][0]} (−2 Qi).`); }
    if (a==='acao'){ s.atual = s.pend; ctx.log(`${ctx.nome} gastou a ação e trocou para a ${this.posturas[s.atual][0]}.`); }
    s.pend = null;
  }
});

// ---------------- Aégis ----------------
barra({id:'aegis', cat:'classe', arvore:'Aégis', barra:'Égide', cor:'#D9B44A', fim:'zera', demo:9, persiste:['jur','perjuro'],
  icone:'<path d="M6 3.5H18V14.5C18 17.8 15.4 20 12 21.2C8.6 20 6 17.8 6 14.5Z"/><path d="M12 3.5V21"/><circle cx="8.8" cy="6.6" r=".8" fill="currentColor" stroke="none"/><circle cx="15.2" cy="6.6" r=".8" fill="currentColor" stroke="none"/><circle cx="8.8" cy="13.6" r=".8" fill="currentColor" stroke="none"/><circle cx="15.2" cy="13.6" r=".8" fill="currentColor" stroke="none"/>',
  jur:{tutelado:'Juramento do Tutelado', erguido:'Juramento do Escudo Erguido', linha:'Juramento da Linha', troco:'Juramento do Troco', verdade:'Juramento da Verdade'},
  estado:()=>({jur:'tutelado', perjuro:false, plantado:false}),
  ganhos:[{id:'g1',c:'Juramento e aliado perto',t:'Juramento de pé e um aliado a até 2 cédulas',v:2,tipo:'tg',bloq:s=>s.perjuro},
          {id:'g2',c:'Protegi',t:'Protegeu um aliado (recebeu, bloqueou ou desviou um golpe dirigido a ele)',v:1},
          {id:'g3',c:'Pedido do juramento',t:'Cumpriu o pedido do juramento',v:1,tipo:'tg',bloq:s=>s.perjuro}],
  selo:s=> s.perjuro ? '✕' : null,
  face(s, v){
    const forma = 'M110 14 L190 38 V106 C190 158 154 192 110 206 C66 192 30 158 30 106 V38 Z';
    let o = KIT.encher('aegis', forma, v/20, s.perjuro ? '#6B6457' : this.cor, {base:206, topo:14, opacidade:.92});
    o += KIT.icone('jur-'+s.jur, 110, 112, 76, '#0E1014', {traco:2.2, opacidade:.72});
    if (s.perjuro) o += `<path d="M118 20 L102 68 L124 94 L98 138 L116 174 L106 204" fill="none" stroke="#F08A55" stroke-width="3" stroke-linejoin="round"/>`;
    if (s.plantado) o += `<path d="M14 214 H206" stroke="#9FA6B4" stroke-width="3"/><path d="M66 206 l-7 9 M154 206 l7 9" stroke="#9FA6B4" stroke-width="3"/>`;
    return o;
  },
  linha(s){ return s.perjuro ? `<b>Perjuro</b> <em>· a Égide não enche pelo juramento até cumprir a penitência.</em>` : `<b>${this.jur[s.jur]}</b>${s.plantado?' <em>· Escudo Plantado (+2 de DEF F e DEF M pela frente)</em>':''}`; },
  acoes(s){ return `<button type="button" data-a="plantar" aria-pressed="${s.plantado}">Escudo Plantado</button>
    ${s.perjuro ? `<button type="button" data-a="penitencia">Penitência cumprida</button>` : `<button type="button" class="gasta" data-a="quebrar">Quebrei o juramento</button>`}`; },
  acao(s, a, ctx){
    if (a==='plantar'){ s.plantado = !s.plantado; ctx.log(s.plantado ? `${ctx.nome} cravou o escudo no chão.` : `${ctx.nome} arrancou o escudo do chão.`); }
    if (a==='quebrar'){ s.perjuro = true; ctx.v = 0; ctx.log(`${ctx.nome} quebrou o juramento: Égide zerada, Perjuro.`); }
    if (a==='penitencia'){ s.perjuro = false; ctx.log(`${ctx.nome} cumpriu a penitência.`); }
  }
});

// ---------------- Arqueiro ----------------
barra({id:'arqueiro', cat:'classe', arvore:'Arqueiro', barra:'Mira', cor:'#8FBF5A', fim:'zera', demo:11, persiste:['flechas'],
  icone:'<path d="M7 3.5C13.5 6.5 13.5 17.5 7 20.5"/><path d="M7 3.5V20.5" stroke-width="1.2"/><path d="M3.5 12H20.5"/><path d="M17.6 9.1L20.5 12L17.6 14.9"/><path d="M5.5 10.2L3.5 12L5.5 13.8"/>',
  estado:()=>({flechas:6}),
  ganhos:[{id:'g1',c:'Fiquei parado',t:'Não andou no turno anterior (ser empurrado não conta)',v:2,tipo:'tg'},
          {id:'g2',c:'Crítico',t:'Crítico',v:1},
          {id:'g3',c:'Tiro a 6+ cédulas',t:'Tiro que acertou alvo a 6 cédulas ou mais',v:1}],
  face(s, v){
    let o = `<circle cx="110" cy="110" r="102" fill="#0E1014"/>`; let i = 0;
    [100,82,64,46,28].forEach(r=>{ for(let q=0;q<4;q++){ o += `<path d="${setor(110,110,r-16,r,q*90+2,q*90+88)}" fill="${i<v?this.cor:APAGADO}"/>`; i++; } });
    o += `<circle cx="110" cy="110" r="10" fill="${v>=20?this.cor:'#C9C3B5'}"/>`;
    for (let k=0;k<Math.min(s.flechas,5);k++){ const x = 8 + k*6; o += `<path d="M${x} 216 V194 M${x-2.5} 198 L${x} 193 L${x+2.5} 198" stroke="#C9C3B5" stroke-width="1.5" fill="none"/>`; }
    o += KIT.texto(14 + Math.min(s.flechas,5)*6, 214, s.flechas, {ancora:'start', tam:14, peso:800});
    return o;
  },
  linha(s){ return `<em>Flechas especiais na aljava:</em> <b>${s.flechas}</b> <em>· a flecha comum não acaba. Com inimigo adjacente, os tiros fixam −4.</em>`; },
  acoes:()=>`<button type="button" class="gasta" data-a="flecha">▼ Usei uma flecha especial</button><button type="button" data-a="repor">+1 flecha</button>`,
  acao(s, a, ctx){ if (a==='flecha'){ if (!s.flechas) return ctx.aviso('A aljava de flechas especiais está vazia.'); s.flechas--; ctx.log(`${ctx.nome} usou uma flecha especial (${s.flechas} ${s.flechas === 1 ? "resta" : "restam"}).`); } if (a==='repor') s.flechas++; }
});

// ---------------- Bárbaro ----------------
barra({id:'barbaro', cat:'classe', arvore:'Bárbaro', barra:'Ira', cor:'#D9503F', fim:'zera', demo:11,
  icone:'<path d="M12 3.2V21"/><path d="M12 5.2C8.4 4.2 5.4 5.8 4.2 9.8C6.6 8.8 9.4 9.2 12 10.8"/><path d="M12 5.2C15.6 4.2 18.6 5.8 19.8 9.8C17.4 8.8 14.6 9.2 12 10.8"/>',
  ganhos:[{id:'g1',c:'Acertei ou apanhei',t:'Acertou um golpe com arma ou sofreu dano',v:2,tipo:'tg'},
          {id:'g2',c:'Risco acertou',t:'Golpe de Risco que acertou',v:1},
          {id:'g3',c:'Inimigo caiu perto',t:'Inimigo caiu (0 HP) a até 2 cédulas',v:1},
          {id:'g4',c:'Abri ferida',t:'Ferida que ele abriu (Sangrando, Hemorragia, Fraquejado, Lento ou Desarmado)',v:1}],
  face(s, v){
    // a fera: rosto rugindo que esquenta de baixo para cima
    const forma = 'M110 12 L136 40 L180 30 L168 78 C196 110 190 168 150 196 L110 210 L70 196 C30 168 24 110 52 78 L40 30 L84 40 Z';
    let o = KIT.encher('barbaro', forma, v/20, this.cor, {base:210, topo:12});
    o += `<path d="M72 104 L98 116 M148 104 L122 116" stroke="#0E1014" stroke-width="7" stroke-linecap="round" opacity=".7"/>`;
    o += `<path d="M82 156 Q110 136 138 156 Q110 182 82 156Z" fill="#0E1014" opacity=".7"/><path d="M92 152 l5 9 l5 -10 l6 10 l6 -10 l5 9 l5 -8" fill="none" stroke="#E8E4DA" stroke-width="2" opacity=".75"/>`;
    return o;
  },
  linha:()=>`<em>Técnica que começa com “Risco.” cobra o preço escrito nela; se acertar, o efeito vem sem teste do alvo.</em>`
});

// ---------------- Bardo ----------------
barra({id:'bardo', cat:'classe', arvore:'Bardo', barra:'Palco', cor:'#F2B544', fim:'zera', demo:12,
  icone:'<ellipse cx="9" cy="15" rx="4.8" ry="5.4" transform="rotate(-45 9 15)"/><circle cx="9" cy="15" r="1.5"/><path d="M12.4 11.6L18.6 5.4"/><path d="M17.2 3.6L20.4 6.8"/>',
  musicas:['Toada de Marcha','Hino de Coragem','Hino da Firmeza','Balada do Escudo','Canção de Alento','Melodia Inquietante','Balada de Napha'],
  estado:()=>({musica:'', floreios:0}),
  ganhos:[{id:'g1',c:'Me apresentei',t:'Usou uma habilidade desta árvore ou manteve uma música',v:2,tipo:'auto',f:s=>!!s.musica||s.floreios>0},
          {id:'g2',c:'Floreios',t:'Floreios usados (+1 cada)',v:1,tipo:'auto-n',f:s=>s.floreios},
          {id:'g3',c:'Outro',t:'Outro acontecimento que a árvore dá',v:1}],
  face(s, v){
    let o = `<rect x="6" y="10" width="208" height="200" rx="10" fill="#0E1014"/>`;
    o += `<path d="M14 20 Q110 -6 206 20 L206 44 Q110 22 14 44Z" fill="#7A2430"/>`;
    o += `<path d="M14 20 C40 70 34 140 22 196 L14 196Z" fill="#8E2C38"/><path d="M206 20 C180 70 186 140 198 196 L206 196Z" fill="#8E2C38"/>`;
    o += `<path d="M30 194 Q110 176 190 194" fill="none" stroke="#3A3F4A" stroke-width="10" stroke-linecap="round"/>`;
    for (let i=0;i<20;i++){ const t=i/19, x=30+160*t, y=194-18*Math.sin(Math.PI*t), on=i<v;
      o += (on?`<circle cx="${f1(x)}" cy="${f1(y-7)}" r="9" fill="${this.cor}" opacity=".16"/>`:'') + `<circle cx="${f1(x)}" cy="${f1(y)}" r="4.2" fill="${on?this.cor:'#ffffff1c'}"/>`; }
    o += KIT.texto(110, 128, '♪', {serif:true, tam:s.musica?52:34, cor:s.musica?this.cor:'#4A505C', peso:400});
    return o;
  },
  linha(s){ return s.musica ? `<b>${s.musica}</b> <em>· mantida: 1 de Palco no começo de cada turno, depois de encher</em>` : `<em>Floreio custa só SP e rende +1 de Palco no próximo turno. Uma ação rende no máximo 2.</em>`; },
  acoes(s){ return `<select data-a="musica" aria-label="Música mantida"><option value="">Sem música</option>${this.musicas.map(m=>`<option ${s.musica===m?'selected':''}>${m}</option>`).join('')}</select><button type="button" data-a="floreio">Usei um Floreio</button>`; },
  acao(s, a, ctx, val){
    if (a==='musica'){ if (val) ctx.log(`${ctx.nome} começou a tocar: ${val}${s.musica?' (a anterior parou)':''}.`); else if (s.musica) ctx.log(`${ctx.nome} parou de tocar.`); s.musica = val; }
    if (a==='floreio') s.floreios++;
  },
  aposAplicar(s, ctx, q){ if (q !== 'inicio') return; s.floreios = 0;
    if (s.musica){ if (ctx.v>=1) ctx.perder(1, 'música mantida: ' + s.musica); else { ctx.log(`Sem Palco: ${s.musica} parou.`); s.musica=''; } } }
});

// ---------------- Bruxo ----------------
barra({id:'bruxo', cat:'classe', arvore:'Bruxo', barra:'Dreno', cor:'#9BC25A', fim:'zera', demo:10, persiste:['comp','sanidade'],
  icone:'<path d="M4.5 11.5H19.5C19.5 16.1 16.4 19.6 12 19.6S4.5 16.1 4.5 11.5Z"/><path d="M8 21.2H16"/><path d="M13 12L18.6 4"/>',
  estado:()=>({comp:{Natureza:3,Carne:1,Reativos:2,Restos:2,Almas:0}, drenou:false, sanidade:72}),
  ganhos:[{id:'g1',c:'Drenei',t:'Drenou um componente desde o turno anterior',v:2,tipo:'auto',f:s=>s.drenou},
          {id:'g2',c:'Nulificação pegou',t:'Magia de nulificação dele que pegou (o alvo falhou)',v:1}],
  face(s, v){
    const tig = 'M48 104 H172 C172 158 146 192 110 192 C74 192 48 158 48 104Z';
    let o = `<path d="M124 150 L176 86" stroke="#8E8A80" stroke-width="10" stroke-linecap="round"/>`;
    o += KIT.encher('bruxo', tig, v/20, this.cor, {base:192, topo:104, riscas:false});
    o += `<path d="M66 204 H154" stroke="#C9C3B5" stroke-width="3" stroke-linecap="round"/>`;
    Object.entries(s.comp).forEach(([n,q],i)=>{ const x = 26 + i*42, y = 30;
      o += KIT.botao(n, `Drenar ${n} (${q} na ficha)`, `<circle cx="${x}" cy="${y}" r="16" fill="#22262E" stroke="${q?this.cor:'#4A505C'}" stroke-width="1.6"/>` + KIT.texto(x, y+5, q, {tam:14, peso:800, cor:q?'#E8E4DA':'#5A6070', extra:'pointer-events="none"'}))
        + KIT.texto(x, y+30, n, {tam:10.5, peso:500, cor:'#9FA6B4'}); });
    return o;
  },
  linha(s){ return `${s.drenou ? '<b>Já drenou neste turno.</b>' : '<em>Toque num componente para drenar (1 por turno, com o movimento).</em>'} <span style="display:block">Sanidade <b>${s.sanidade}</b>/100 <em>· quem mexe é o mestre</em></span>`; },
  clique(s, c, ctx){ if (s.drenou) return ctx.aviso('Já drenou neste turno.'); if (!s.comp[c]) return ctx.aviso(`Não há ${c} na ficha.`); s.comp[c]--; s.drenou = true; ctx.log(`${ctx.nome} drenou ${c} (${s.comp[c]} na ficha).`); },
  aposAplicar(s, ctx, q){ if (q === 'inicio') s.drenou = false; }
});

// ---------------- Espadachim ----------------
barra({id:'espadachim', cat:'classe', arvore:'Espadachim', barra:'Guarda', cor:'#7FA7D9', fim:'zera', demo:10, persiste:['arma'],
  icone:'<circle cx="8" cy="16" r="4.6"/><circle cx="8" cy="16" r="1" fill="currentColor" stroke="none"/><path d="M20.5 3.5L10.8 13.2"/><path d="M12 9.6L14.4 12"/><path d="M20.5 3.5L17.4 4.3"/>',
  estado:()=>({arma:'Espada e escudo'}),
  ganhos:[{id:'g1',c:'Fiquei em guarda',t:'Terminou o turno em guarda (arma em punho, sem estar Caído, Atordoado ou Agarrado)',v:2,tipo:'tg'},
          {id:'g2',c:'Bloqueio ou aparada',t:'Bloqueio ou aparada com sucesso',v:1},
          {id:'g3',c:'Quebrei guarda',t:'Deixou alguém com Guarda Quebrada ou Desarmado',v:1}],
  face(s, v){
    let o = `<path d="M110 6 L124 24 V164 H96 V24 Z" fill="#1E2128" stroke="#C9C3B5" stroke-width="2"/>`;
    for (let i=0;i<20;i++){ const y1 = 160 - i*6.8; o += `<rect x="100" y="${f1(y1-5.4)}" width="20" height="5.4" fill="${i<v?this.cor:APAGADO}"/>`; }
    o += `<rect x="60" y="164" width="100" height="10" rx="3" fill="#8E8A80"/><rect x="103" y="174" width="14" height="30" fill="#5A4E40"/><circle cx="110" cy="208" r="7" fill="#8E8A80"/>`;
    return o;
  },
  linha(s){ return `<b>${s.arma}</b> <em>· cada golpe que passa (dano sem bloqueio nem aparada) tira 1 de Guarda na hora</em>`; },
  acoes(s){ return `<button type="button" class="gasta" data-a="passou">▼ Um golpe passou</button><select data-a="arma" aria-label="Arma em punho">${['Espada e escudo','Lança','Machado'].map(a=>`<option ${s.arma===a?'selected':''}>${a}</option>`).join('')}</select>`; },
  acao(s, a, ctx, val){ if (a==='passou') ctx.perder(1, 'um golpe passou'); if (a==='arma') s.arma = val; }
});

// ---------------- Feiticeiro ----------------
barra({id:'feiticeiro', cat:'classe', arvore:'Feiticeiro', barra:'Dívida', cor:'#C37BDB', fim:'zera', demo:9,
  icone:'<path d="M5.5 3.5H15.5L18.5 6.5V20.5H5.5Z"/><path d="M8.5 8.5H15M8.5 11.5H15M8.5 14.5H11.5"/><circle cx="15.2" cy="17.2" r="2.4" fill="currentColor" stroke="none"/>',
  // [nome, letra do lacre, tipo, maior]: trocar por um pacto maior do mesmo tipo não zera a Dívida
  pactos:{pactoimp:['Pacto com Imp','I','imp',0],atochvas:['Pacto de Atochvas','A','imp',1],kramuvech:['Pacto de Kramuvech','K','imp',1],
          pactobosque:['Pacto com o Bosque','B','bosque',0],luria:['Pacto de Luria','L','bosque',1],
          pactosombra:['Pacto com a Sombra','S','sombra',0]},
  estado:()=>({pacto:null}),
  ganhos:[{id:'g1',c:'Pacto ativo',t:'Pacto ativo',v:2,tipo:'auto',f:s=>!!s.pacto},
          {id:'g2',c:'Preço pago',t:'Preço pago (HP ou condição cobrados por técnica desta árvore)',v:1},
          {id:'g3',c:'Exigência',t:'Cumpriu a Exigência do patrono',v:1,tipo:'tg'}],
  face(s, v){
    let o = `<rect x="22" y="20" width="176" height="166" rx="6" fill="#D9CDB2"/><path d="M22 30 H198" stroke="#B7A784" stroke-width="2"/>`;
    for (let g=0; g<4; g++) for (let k=0;k<5;k++){ const i=g*5+k, x0=44+g*40, on=i<v;
      if (k<4) o += `<line x1="${x0+k*7}" y1="56" x2="${x0+k*7}" y2="98" stroke="${on?'#3B1F45':'#C4B798'}" stroke-width="3" stroke-linecap="round"/>`;
      else o += `<line x1="${x0-4}" y1="94" x2="${x0+26}" y2="60" stroke="${on?'#7A2C8E':'#C4B798'}" stroke-width="3" stroke-linecap="round"/>`; }
    o += `<line x1="44" y1="126" x2="176" y2="126" stroke="#B7A784"/><line x1="44" y1="144" x2="134" y2="144" stroke="#B7A784"/>`;
    o += `<circle cx="164" cy="172" r="27" fill="${s.pacto?'#9A3FB5':'#6B6457'}"/><circle cx="164" cy="172" r="20" fill="none" stroke="#00000044" stroke-width="2"/>`;
    o += KIT.texto(164, 180, s.pacto?this.pactos[s.pacto][1]:'?', {serif:true, tam:22, peso:800, cor:'#F4E9F7'});
    return o;
  },
  linha(s){ return s.pacto ? `<b>${this.pactos[s.pacto][0]}</b> <em>· fechar outro rompe este e zera a Dívida (trocar por um maior do mesmo tipo, não)</em>` : `<em>Sem pacto. Fechar um gasta o movimento e pede o foco do patrono.</em>`; },
  acoes(s){ return `<select data-a="pacto" aria-label="Pacto"><option value="">Fechar pacto…</option>${Object.entries(this.pactos).map(([k,[n]])=>`<option value="${k}" ${s.pacto===k?'selected':''}>${n}</option>`).join('')}</select><button type="button" class="gasta" data-a="rompe">Fiquei Inconsciente</button>`; },
  acao(s, a, ctx, val){
    if (a==='pacto' && val && val!==s.pacto){
      const velho = s.pacto && this.pactos[s.pacto], novo = this.pactos[val];
      const sobe = velho && velho[2]===novo[2] && novo[3] > velho[3];
      if (velho && !sobe){ ctx.log(`${velho[0]} rompido: Dívida zerada (era ${ctx.v}).`); ctx.v = 0; }
      s.pacto = val; ctx.log(`${ctx.nome} fechou o ${novo[0]}${sobe?' (maior, do mesmo tipo: a Dívida fica)':''}.`); }
    if (a==='rompe' && s.pacto){ s.pacto = null; ctx.v = 0; ctx.log(`${ctx.nome} ficou Inconsciente: o pacto se rompe e a Dívida zera.`); }
  }
});

// ---------------- Mago ----------------
barra({id:'mago', cat:'classe', arvore:'Mago', barra:'Preparo', cor:'#7FA4F5', fim:'zera', teto:6, demo:9,
  icone:'<path d="M12 6.5C10 5 7 4.6 3.5 5V18.5C7 18.1 10 18.6 12 20C14 18.6 17 18.1 20.5 18.5V5C17 4.6 14 5 12 6.5Z"/><path d="M12 6.5V20"/><path d="M6.5 9H9.5M14.5 9H17.5M6.5 12H9.5"/>',
  estado:()=>({conc:false}),
  ganhos:[{id:'g1',c:'Começo do turno',t:'Todo começo de turno',v:3,tipo:'auto',f:()=>true},
          {id:'g2',c:'Acontecimento de nó',t:'Acontecimento que um nó dá (+1 cada)',v:1}],
  face(s, v){
    let o = `<circle cx="110" cy="110" r="106" fill="#0E1014"/>` + KIT.anel(v, 94, 104, this.cor, {gap:1.6});
    const niv = [[1,'I',80],[4,'II',64],[8,'III',48],[16,'IV',32]];
    niv.forEach(([min,r,raio])=>{ const ok = v>=min;
      o += `<circle cx="110" cy="110" r="${raio}" fill="none" stroke="${ok?this.cor:'#3A3F4A'}" stroke-width="${ok?2.4:1.2}" ${s.conc?'stroke-dasharray="4 4"':''}/>`;
      o += KIT.texto(110, 110-raio+13, r, {serif:true, tam:11, cor:ok?this.cor:'#5A6070'}); });
    const max = niv.filter(n=>v>=n[0]).pop();
    o += KIT.texto(110, 121, max?max[1]:'—', {serif:true, tam:24, peso:800, cor:max?'#ECE7DC':'#5A6070'});
    return o;
  },
  linha(s){ return s.conc ? `<b>Concentrando</b> <em>· se sofrer dano, testa CAN; se falhar, perde metade do Preparo</em>` : `<em>Dá para lançar magia de classe I a partir de 1, II de 4, III de 8, IV de 16.</em>`; },
  acoes(s){ return `<button type="button" data-a="mov">Preparar com o movimento</button><button type="button" data-a="ac" aria-pressed="${s.conc}">Preparar com a ação</button>${s.conc?'<button type="button" class="gasta" data-a="falhou">Falhei no CAN</button>':''}`; },
  acao(s, a, ctx){
    if (a==='mov') ctx.ganhar(1, 'preparou com o movimento');
    if (a==='ac'){ ctx.ganhar(3, 'preparou com a ação'); s.conc = true; }
    if (a==='falhou'){ const p = Math.ceil(ctx.v/2); ctx.perder(p, 'perdeu a concentração'); s.conc = false; }
  },
  aoComecarTurno(s){ s.conc = false; }
});

// ---------------- Sacerdote ----------------
barra({id:'sacerdote', cat:'classe', arvore:'Sacerdote', barra:'Graça', cor:'#F0D27A', fim:'zera', demo:12,
  icone:'<circle cx="12" cy="12" r="3.8"/><path d="M12 2.8V5.6M12 18.4V21.2M2.8 12H5.6M18.4 12H21.2M5.5 5.5L7.5 7.5M16.5 16.5L18.5 18.5M18.5 5.5L16.5 7.5M7.5 16.5L5.5 18.5"/>',
  aliados:['Dain','Karênie','Oriê'],
  estado:()=>({curados:[]}),
  ganhos:[{id:'g1',c:'Curei, protegi ou rezei',t:'Curou, protegeu ou rezou (usou uma prece desta árvore)',v:2,tipo:'tg'},
          {id:'g2',c:'Tirei condição',t:'Condição que tirou de um aliado',v:1},
          {id:'g3',c:'Feri Ayto',t:'Feriu uma força Ayto',v:1,tipo:'tg'}],
  face(s, v){
    let o = `<circle cx="110" cy="110" r="106" fill="#0E1014"/>`;
    for (let i=0;i<20;i++){ const a=i*18; const [x1,y1]=P(110,110,52,a-5),[x2,y2]=P(110,110,100,a),[x3,y3]=P(110,110,52,a+5);
      o += `<path d="M${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}L${f1(x3)} ${f1(y3)}Z" fill="${i<v?this.cor:APAGADO}"/>`; }
    o += `<circle cx="110" cy="110" r="44" fill="#22262E" stroke="${this.cor}" stroke-width="2"/><circle cx="110" cy="110" r="22" fill="${v?this.cor:'#3A3F4A'}"/><circle cx="110" cy="110" r="31" fill="none" stroke="${this.cor}" stroke-width="1.5" stroke-dasharray="2 4"/>`;
    return o;
  },
  linha(){ return `<em>Uma cura desta árvore por aliado por rodada, no máximo 25% do HP dele. Marque quem já recebeu:</em>`; },
  acoes(s){ return this.aliados.map(n=>`<button type="button" data-a="cura" data-n="${n}" aria-pressed="${s.curados.includes(n)}">${s.curados.includes(n)?'✓ ':''}${n}</button>`).join(''); },
  acao(s, a, ctx, val, el){ if (a==='cura'){ const n = el.dataset.n; if (s.curados.includes(n)) s.curados = s.curados.filter(x=>x!==n); else { s.curados.push(n); ctx.marcar('g1'); ctx.log(`${ctx.nome} curou ${n} nesta rodada.`); } } },
  aoComecarTurno(s){ s.curados = []; }
});

// ---------------- Shaji ----------------
barra({id:'shaji', cat:'classe', arvore:'Shaji', barra:'Malícia', cor:'#D99A5B', fim:'zera', demo:12,
  icone:'<path d="M8.4 8.2C5.6 10.2 4.5 13 4.5 15.4C4.5 19 7.6 20.6 12 20.6S19.5 19 19.5 15.4C19.5 13 18.4 10.2 15.6 8.2"/><path d="M8.4 8.2L7 4.2H17L15.6 8.2Z"/><circle cx="12" cy="14.8" r="2.2"/>',
  estado:()=>({pesada:false}),
  ganhos:[{id:'g1',c:'Oculto ou ileso',t:'Terminou o turno Oculto ou ninguém o atacou',v:2,tipo:'tg'},
          {id:'g2',c:'Furto',t:'Furto',v:1},
          {id:'g3',c:'Sigiloso',t:'Ataque sigiloso que acertou',v:1},
          {id:'g4',c:'Truque',t:'Truque que pegou (um inimigo falhou no teste)',v:1}],
  face(s, v){
    let o = `<ellipse cx="110" cy="196" rx="98" ry="14" fill="#0E1014"/>`;
    for (let p=0;p<4;p++) for (let k=0;k<5;k++){ const i=p*5+k, x=38+p*48, y=186-k*15, on=i<v;
      o += `<ellipse cx="${x}" cy="${y+5}" rx="20" ry="7" fill="${on?'#8A5428':'#ffffff0a'}"/><ellipse cx="${x}" cy="${y}" rx="20" ry="7" fill="${on?this.cor:'none'}" stroke="${on?'#F2C08A':'#ffffff26'}" stroke-width="1.3"/>`; }
    if (s.pesada) o += `<path d="M20 40 L200 200" stroke="#F08A55" stroke-width="3"/>`;
    return o;
  },
  linha(s){ return s.pesada ? `<b>Armadura pesada ou escudo grande:</b> <em>a Malícia não enche.</em>` : `<em>Sigiloso: contra quem não o vê, ou alvo Cego, Caído, Atordoado, Agarrado ou Enraizado.</em>`; },
  acoes(s){ return `<button type="button" data-a="pesada" aria-pressed="${s.pesada}">Armadura pesada</button>`; },
  acao(s, a){ if (a==='pesada') s.pesada = !s.pesada; },
  travaGanho:s=> s.pesada ? 'Armadura pesada: a Malícia não enche.' : false
});

/* ===== racas-exemplo.js ===== */
/* =====================================================================
   EXEMPLOS DE RAÇA E LINHAGEM (molde para os outros lotes)
   - selene: ganho na hora + ganho no fim do turno + estado com contador
   - danca: barra que balança (−10 a +10), posturas que mexem no número
   - rastoroni: teto 6, gatilho no 20 (Descontrole) e queda para 10
   - vampiro: linhagem que não volta no fim do combate, estágios, item
   ===================================================================== */

// ---------------- Kitsune Selene: Geada de Selene ----------------
barra({id:'selene', cat:'raca', arvore:'Kitsune Selene', barra:'Geada de Selene', cor:'#A9D2F0',
  inicio:4, teto:5, porAcao:2, fim:'inicio', demo:12, persiste:['bencao'],
  icone:'<path d="M12 3V21M4.2 7.5L19.8 16.5M19.8 7.5L4.2 16.5"/><path d="M9.6 4.4L12 6.4L14.4 4.4M9.6 19.6L12 17.6L14.4 19.6M4.4 10.4L6.8 9.6L6.2 7M19.6 13.6L17.2 14.4L17.8 17M19.6 10.4L17.2 9.6L17.8 7M4.4 13.6L6.8 14.4L6.2 17"/>',
  estado:()=>({semCalma:0, forma:0, formaUsada:false, bencao:true}),
  ganhos:[
    {id:'cong', c:'Deixei Congelado', t:'Deixou um inimigo Congelado', v:1, quando:'agora'},
    {id:'calma', c:'Lutei com calma', t:'Fim do turno em que lutou com calma: não fugiu, não atacou quem não via e não agiu Provocada', v:1, quando:'fim', tipo:'tg',
     bloq:s=> s.semCalma > 0 ? 'Perdeu a calma: sem a Geada da calma até o fim do próximo turno.' : false}],
  face(s, v){
    const lua = 'M110 16 A94 94 0 1 1 109.9 16 Z';
    let o = '';
    if (s.forma) o += `<circle cx="110" cy="110" r="106" fill="none" stroke="${this.cor}" stroke-width="3" stroke-dasharray="2 6" opacity=".9"/>`;
    o += KIT.encher('selene', lua, v/20, this.cor, {base:204, topo:16, fundo:'#1B2230', contorno:'#D8E4EE'});
    // crateras e cristais
    [[78,70,14],[142,92,10],[96,150,18],[150,150,8]].forEach(([x,y,r])=>{ o += `<circle cx="${x}" cy="${y}" r="${r}" fill="#0E1014" opacity=".18"/>`; });
    o += KIT.icone('selene', 110, 110, 54, '#0E1014', {opacidade:.35, traco:1.6});
    if (s.semCalma) o += `<path d="M58 58 L162 162" stroke="#F08A55" stroke-width="3" stroke-linecap="round"/>`;
    return o;
  },
  linha(s){
    if (s.forma) return `<b>Verdadeira Forma</b> <em>· Transformada por mais ${s.forma} ${s.forma > 1 ? 'rodadas' : 'rodada'}: +4 de DEF F e DEF M</em>`;
    if (s.semCalma) return `<b>Perdeu a calma</b> <em>· sem a Geada da calma até o fim do próximo turno.</em>`;
    return `<em>Frio: cada acúmulo tira 1 de AGI. Com 5, o alvo testa VIT; se falhar, fica Congelado.</em>`;
  },
  acoes(s, ctx){
    let h = `<button type="button" class="gasta" data-a="calma">Perdi a calma</button>`;
    if (s.bencao && !s.formaUsada) h += `<button type="button" class="gasta" data-a="forma" ${ctx.v < 10 ? 'disabled' : ''} title="Bênção de Selene: gasta 10 e o movimento, uma vez por combate">▼ Verdadeira Forma (10)</button>`;
    return h;
  },
  acao(s, a, ctx){
    if (a === 'calma'){ s.semCalma = 2; ctx.log(`${ctx.nome} perdeu a calma.`); }
    if (a === 'forma'){
      if (ctx.v < 10) return ctx.aviso('Verdadeira Forma pede 10 de Geada.');
      ctx.perder(10, 'Verdadeira Forma'); s.forma = 3; s.formaUsada = true;
      ctx.log(`${ctx.nome} assumiu a Verdadeira Forma por 3 rodadas.`);
    }
  },
  aoComecarTurno(s, ctx){ if (s.forma){ s.forma--; if (!s.forma) ctx.log(`A Verdadeira Forma de ${ctx.nome} acabou.`); } },
  aoTerminarTurno(s){ if (s.semCalma) s.semCalma--; }
});

// ---------------- Karê Dançarina: Compasso (balança de −10 a +10) ----------------
const DANCA = {
  passos:{nome:'Passos', lado:-1, posturas:{junco:['Passo do Junco',2], garca:['Passo da Garça',3], folha:['Passo da Folha Caída',3], contrapasso:['Passo do Recuo',2], seda:['Passo de Seda',2], ausente:['Passo do Vento Ausente',4], espiral:['Passo em Espiral',4,'giro']}},
  giro:{nome:'Giro', lado:1, posturas:{leque:['Giro do Leque',3], ventania:['Giro da Ventania',3], correnteza:['Giro da Correnteza',3], cortante:['Giro Cortante',4], guardado:['Giro do Vento Guardado',2], ciclone:['Giro do Ciclone',4,'passos']}},
  folego:{nome:'Fôlego', lado:0, posturas:{respiro:['Fôlego da Brisa',3], bambu:['Fôlego do Bambu',2], partilhado:['Fôlego Partilhado',2], vale:['Fôlego do Vale',2], fundo:['Fôlego Fundo',99]}}
};
const dancaInfo = k => { for (const [tipo, g] of Object.entries(DANCA)) if (g.posturas[k]) return {tipo, nome:g.posturas[k][0], n:g.posturas[k][1], pede:g.posturas[k][2]}; return null; };
const sinal = v => v > 0 ? '+' + v : v < 0 ? '−' + (-v) : '0';
function moverCompasso(ctx, tipo, n){
  if (tipo === 'folego'){ const alvo = Math.abs(ctx.v) <= n ? 0 : ctx.v - Math.sign(ctx.v) * n; ctx.v = alvo; }
  else ctx.v = ctx.v + DANCA[tipo].lado * n;
}

barra({id:'danca', cat:'raca', arvore:'Karê Dançarina', barra:'Compasso', cor:'#7FD3C8',
  min:-10, max:10, inicio:0, teto:null, fim:'inicio', demo:4, de:'−10 a +10',
  icone:'<path d="M12 20L4 9A11 11 0 0 1 20 9Z"/><path d="M12 20L8.2 6.8M12 20V6M12 20L15.8 6.8"/>',
  mostra:v=>sinal(v),
  estado:()=>({postura:null, ultimoTipo:null, trocaDaDanca:false}),
  selo:()=>null,
  face(s, v){
    const ang = v * 1.6, x = u => 110 + u * 8.6;
    let o = `<rect x="4" y="8" width="212" height="204" rx="12" fill="#0E1014"/>`;
    o += KIT.texto(30, 34, 'Passos', {ancora:'start', tam:12, cor: s.postura && dancaInfo(s.postura).tipo === 'passos' ? this.cor : '#9FA6B4'});
    o += KIT.texto(190, 34, 'Giro', {ancora:'end', tam:12, cor: s.postura && dancaInfo(s.postura).tipo === 'giro' ? this.cor : '#9FA6B4'});
    o += KIT.texto(110, 34, 'Fôlego', {tam:12, cor: s.postura && dancaInfo(s.postura).tipo === 'folego' ? this.cor : '#9FA6B4'});
    o += `<g transform="rotate(${f1(ang)} 110 124)">`;
    // zonas: Queda, Beira, Eixo
    o += `<rect x="${f1(x(-10)-4)}" y="114" width="8" height="20" fill="#C8473B"/><rect x="${f1(x(10)-4)}" y="114" width="8" height="20" fill="#C8473B"/>`;
    o += `<rect x="${f1(x(-9.5))}" y="116" width="${f1(8.6*2)}" height="16" fill="#F08A55" opacity=".85"/><rect x="${f1(x(7.5))}" y="116" width="${f1(8.6*2)}" height="16" fill="#F08A55" opacity=".85"/>`;
    o += `<rect x="${f1(x(-7.5))}" y="118" width="${f1(8.6*15)}" height="12" rx="2" fill="#2A2F38"/>`;
    o += `<rect x="${f1(x(-3.5))}" y="118" width="${f1(8.6*7)}" height="12" rx="2" fill="${this.cor}" opacity=".35"/>`;
    for (let u = -10; u <= 10; u++) o += `<line x1="${f1(x(u))}" x2="${f1(x(u))}" y1="${u % 5 ? 120 : 114}" y2="${u % 5 ? 128 : 134}" stroke="#E8E4DA" stroke-opacity="${u % 5 ? .35 : .8}" stroke-width="${u % 5 ? 1 : 2}"/>`;
    // o leque marca onde o Compasso está
    o += KIT.icone('danca', x(v), 92, 34, this.cor, {traco:2.2});
    o += `<path d="M${f1(x(v))} 110 L${f1(x(v)-6)} 102 H${f1(x(v)+6)} Z" fill="${this.cor}"/>`;
    o += `</g>`;
    o += `<path d="M110 132 L96 160 H124 Z" fill="#5A606C"/><rect x="80" y="160" width="60" height="8" rx="3" fill="#5A606C"/>`;
    ['−10','−5','0','+5','+10'].forEach((t,i)=>{ o += KIT.texto(x(-10 + i*5), 192, t, {tam:11, peso:600, cor:'#7E8594'}); });
    const z = Math.abs(v) >= 8 ? ['Beira: −4 de fixa', '#F08A55'] : Math.abs(v) <= 3 ? ['Eixo', this.cor] : null;
    if (z) o += KIT.texto(110, 208, z[0], {tam:12, peso:800, cor:z[1]});
    return o;
  },
  linha(s, ctx){
    const v = ctx.v, p = s.postura && dancaInfo(s.postura);
    const zona = Math.abs(v) >= 8 ? '<b style="color:#F08A55">Beira:</b> <em>−4 de fixa em ataque e esquiva.</em>' : Math.abs(v) <= 3 ? '<b>Eixo:</b> <em>ao entrar em Passos ou Giro, +2 de fixa em ataque e esquiva até o próximo turno.</em>' : '';
    return `${p ? `<b>${p.nome}</b> <em>· ${DANCA[p.tipo].nome}</em><br>` : '<em>Sem postura de raça.</em><br>'}${zona}`;
  },
  acoes(s){
    const ops = Object.entries(DANCA).map(([tipo, g]) => `<optgroup label="${g.nome} (${tipo === 'passos' ? 'para −' : tipo === 'giro' ? 'para +' : 'de volta ao 0'})">${Object.entries(g.posturas).map(([k, [n, q]]) => `<option value="${k}" ${s.postura === k ? 'selected' : ''}>${n} (${tipo === 'folego' ? (q === 99 ? 'volta ao 0' : q + ' para o 0') : (g.lado > 0 ? '+' : '−') + q})</option>`).join('')}</optgroup>`).join('');
    return `<select data-a="postura" aria-label="Postura de raça"><option value="">Entrar em postura…</option>${ops}</select>
      <button type="button" data-a="reacao2" title="As reações dela afastam o Compasso do 0">Reação: 2 do 0</button><button type="button" data-a="reacao3">Reação: 3 do 0</button>
      <button type="button" class="gasta" data-a="interrompida" title="Caída, Agarrada, Atordoada ou Paralisada">Fui interrompida</button>`;
  },
  acao(s, a, ctx, val){
    if (a === 'postura' && val && val !== s.postura){
      const p = dancaInfo(val), atual = s.postura && dancaInfo(s.postura);
      if (p.tipo === 'folego' && s.ultimoTipo === 'folego') return ctx.aviso('Fôlego não se repete em seguida.');
      if (p.pede && (!atual || atual.tipo !== p.pede)) return ctx.aviso(`${p.nome} só saindo de uma postura de ${DANCA[p.pede].nome}.`);
      const antes = ctx.v; moverCompasso(ctx, p.tipo, p.n); s.postura = val;
      const custo = p.tipo === 'folego' ? 'gasta o movimento' : (!s.trocaDaDanca ? 'a troca da Dança, sem gastar a ação' : 'gasta a ação');
      if (p.tipo !== 'folego' && !s.trocaDaDanca) s.trocaDaDanca = true;
      ctx.log(`${ctx.nome} entrou no ${p.nome} (${custo}): Compasso ${sinal(antes)} → ${sinal(ctx.v)}.`);
    }
    if (a === 'reacao2' || a === 'reacao3'){
      const n = a === 'reacao2' ? 2 : 3, antes = ctx.v, p = s.postura && dancaInfo(s.postura);
      const lado = ctx.v ? Math.sign(ctx.v) : (p && DANCA[p.tipo].lado) || 1;
      ctx.v = ctx.v + lado * n; ctx.log(`${ctx.nome} reagiu: Compasso ${sinal(antes)} → ${sinal(ctx.v)}.`);
    }
    if (a === 'interrompida'){
      const antes = ctx.v, lado = ctx.v ? Math.sign(ctx.v) : 1;
      s.postura = null; ctx.v = ctx.v + lado * 3;
      ctx.log(`${ctx.nome} foi interrompida: perde a postura de raça, Compasso ${sinal(antes)} → ${sinal(ctx.v)}.`);
    }
  },
  aoMudar(s, ctx){
    if (Math.abs(ctx.v) >= 10){
      const lado = Math.sign(ctx.v); s.postura = null; ctx.v = 5 * lado;
      ctx.log(`Queda: ${ctx.nome} cai, perde a postura de raça e o Compasso volta a ${sinal(ctx.v)}.`);
    }
  },
  aoComecarTurno(s, ctx){
    s.trocaDaDanca = false;
    const p = s.postura && dancaInfo(s.postura); if (!p) { s.ultimoTipo = null; return; }
    if (p.tipo === 'folego'){ s.ultimoTipo = 'folego'; s.postura = null; ctx.log(`O ${p.nome} de ${ctx.nome} acabou (dura um turno).`); return; }
    s.ultimoTipo = p.tipo;
    const antes = ctx.v; moverCompasso(ctx, p.tipo, p.n);
    ctx.log(`${ctx.nome} começou o turno no ${p.nome}: Compasso ${sinal(antes)} → ${sinal(ctx.v)}.`);
  }
});

// ---------------- Orc Rastoroni (NPC): Frenesi ----------------
barra({id:'rastoroni', cat:'raca', arvore:'Orc Rastoroni', barra:'Frenesi', cor:'#F0874F',
  inicio:6, teto:6, porAcao:null, fim:'inicio', demo:14, npc:true,
  icone:'<path d="M3.8 17A8.6 8.6 0 1 1 20.2 17"/><path d="M12 14.5L16.6 8.6"/><circle cx="12" cy="14.5" r="1.5" fill="currentColor" stroke="none"/><path d="M6.2 11.2L7.4 11.8M12 5.6V7M17.8 11.2L16.6 11.8"/>',
  estado:()=>({descontrole:0}),
  ganhos:[{id:'dado', c:'Golpe dado', t:'Cada golpe que ele dá, acertando ou não', v:1, quando:'agora'},
          {id:'sofrido', c:'Golpe sofrido', t:'Cada golpe que o acerta', v:1, quando:'agora'}],
  face(s, v){
    const a0 = -120, span = 240;
    let o = `<circle cx="110" cy="114" r="104" fill="#2A2420"/><circle cx="110" cy="114" r="94" fill="#16130F" stroke="#5A4A3C" stroke-width="3"/>`;
    for (let i = 0; i < 8; i++){ const [x, y] = P(110, 114, 99, i * 45 + 22.5); o += `<circle cx="${f1(x)}" cy="${f1(y)}" r="3.2" fill="#8E7A66"/>`; }
    o += KIT.anel(v, 70, 86, this.cor, {inicio:a0, span, gap:2, cy:114});
    o += `<path d="${setor(110,114,70,86,a0+span*19/20,a0+span)}" fill="none" stroke="#C8473B" stroke-width="2"/>`;
    const [nx, ny] = P(110, 114, 64, a0 + span * v / 20);
    o += `<line x1="110" y1="114" x2="${f1(nx)}" y2="${f1(ny)}" stroke="#E8E4DA" stroke-width="4" stroke-linecap="round"/><circle cx="110" cy="114" r="10" fill="#8E7A66"/>`;
    ['0','10','20'].forEach((t, i) => { const [x, y] = P(110, 114, 54, a0 + span * i / 2); o += KIT.texto(x, y + 4, t, {tam:11, peso:700, cor:'#8E8A80'}); });
    if (s.descontrole) o += `<path d="M150 46 L132 84 L150 96 L124 140" fill="none" stroke="#C8473B" stroke-width="3"/>` + KIT.texto(110, 186, 'Descontrole', {tam:15, peso:800, cor:'#F08A55'});
    return o;
  },
  linha(s){ return s.descontrole ? `<b style="color:#F08A55">Descontrole</b> <em>· ataca o alvo mais próximo, aliado ou inimigo, e ignora ordens. Faltam ${s.descontrole} ${s.descontrole > 1 ? 'turnos' : 'turno'}; depois o Frenesi cai para 10.</em>` : `<em>Árvore de NPC. Até +6 por rodada, sem teto por ação. Em 20, Descontrole por 2 rodadas.</em>`; },
  aoMudar(s, ctx){ if (ctx.v >= 20 && !s.descontrole){ s.descontrole = 2; ctx.log(`${ctx.nome} entrou em Descontrole por 2 rodadas.`); } },
  aoTerminarTurno(s, ctx){ if (s.descontrole){ s.descontrole--; if (!s.descontrole){ ctx.definir(10, 'fim do Descontrole'); } } }
});

// ---------------- Vampiro (linhagem): Fome ----------------
const ESTAGIOS = [[15,'Saciado','sem efeito extra'],[10,'Alimentado','sem efeito extra'],[5,'Faminto','sem pontas e sem notáveis de 6 de Fome ou mais; −2 em testes sociais'],[0,'Sedento','com alguém Sangrando a até 4 cédulas, testa CAN ou VIT no começo do turno; se falhar, ataca o alvo de sangue mais próximo e o mestre conduz o turno']];
const estagio = v => ESTAGIOS.find(e => v >= e[0]);

barra({id:'vampiro', cat:'linhagem', arvore:'Vampiro', barra:'Fome', cor:'#E5677B',
  inicio:10, teto:5, porAcao:null, fim:'fica', demo:8, persiste:['frascos'],
  icone:'<path d="M10.4 10.4C8.2 8.6 5 7.8 2 8.8C3.6 9.8 4.4 11.4 4.6 13.2C5.8 12.4 7.4 12.4 8.4 13.4C9 12.8 9.8 12.8 10.4 13.6"/><path d="M13.6 10.4C15.8 8.6 19 7.8 22 8.8C20.4 9.8 19.6 11.4 19.4 13.2C18.2 12.4 16.6 12.4 15.6 13.4C15 12.8 14.2 12.8 13.6 13.6"/><path d="M12 8.8C13.2 8.8 13.8 10 13.8 11.8C13.8 14.2 13 16.2 12 17.2C11 16.2 10.2 14.2 10.2 11.8C10.2 10 10.8 8.8 12 8.8Z"/><path d="M10.9 9.2L10.6 6.8L11.8 8.6M13.1 9.2L13.4 6.8L12.2 8.6"/>',
  estado:()=>({frascos:2}),
  ganhos:[
    {id:'mordida', c:'Mordida', t:'Morder um alvo Agarrado, indefeso (Caído, Atordoado, Adormecido, Paralisado) ou dominado por ele: golpe com dano; acaba o frenesi', v:3, quando:'agora'},
    {id:'frasco', c:'Frasco de sangue', t:'Beber um frasco de sangue, gastando a ação (carrega 2)', v:3, quando:'agora', bloq:s=> s.frascos ? false : 'Sem frascos de sangue.', ao:(s, ctx)=>{ s.frascos--; ctx.log(`${ctx.nome} bebeu um frasco (${s.frascos} ${s.frascos === 1 ? "resta" : "restam"}).`); }},
    {id:'servo', c:'Servo', t:'Alimentar-se de um servo dele', v:3, quando:'agora'},
    {id:'aliado', c:'Aliado aceitou', t:'Um aliado que aceita: ele perde 10% do HP máximo e fica Fraquejado até o descanso', v:5, quando:'agora'}],
  face(s, v){
    const vidro = 'M100 12 H120 V34 C120 44 150 66 150 120 C150 174 134 208 110 208 C86 208 70 174 70 120 C70 66 100 44 100 34 Z';
    let o = KIT.encher('vampiro', vidro, v/20, '#B8243A', {base:208, topo:12, fundo:'#1B1418', contorno:'#C9B8BC'});
    [[5,'Faminto'],[10,'Alimentado'],[15,'Saciado']].forEach(([n])=>{ const y = 208 - 196 * n / 20; o += `<line x1="70" x2="150" y1="${f1(y)}" y2="${f1(y)}" stroke="#E8E4DA" stroke-width="1.6" stroke-dasharray="5 4" clip-path="url(#cl-vampiro)"/>`; });
    [[2.5,'Sedento'],[7.5,'Faminto'],[12.5,'Alimentado'],[17.5,'Saciado']].forEach(([n, t])=>{ const y = 208 - 196 * n / 20, at = estagio(v)[1] === t;
      o += KIT.texto(156, y + 4, t, {ancora:'start', tam:11.5, peso:at ? 800 : 600, cor:at ? this.cor : '#8A90A0'}); });
    for (let i = 0; i < 2; i++) o += `<rect x="${14 + i*16}" y="182" width="10" height="24" rx="3" fill="${i < s.frascos ? '#B8243A' : 'none'}" stroke="#C9B8BC" stroke-width="1.4"/><rect x="${16 + i*16}" y="178" width="6" height="5" fill="#C9B8BC"/>`;
    return o;
  },
  linha(s, ctx){ const e = estagio(ctx.v); return `<b>${e[1]}</b> <em>· ${e[2]}.</em>`; },
  acoes(s){ return `<button type="button" data-a="frasco">+1 frasco (${s.frascos}/2)</button><button type="button" class="gasta" data-a="dia" title="Fora de combate">▼ Um dia sem comer (−3)</button>`; },
  acao(s, a, ctx){
    if (a === 'frasco'){ if (s.frascos >= 2) return ctx.aviso('Carrega no máximo 2 frascos.'); s.frascos++; }
    if (a === 'dia') ctx.perder(3, 'um dia sem comer');
  },
  aoComecarTurno(s, ctx){ if (ctx.v < 5) ctx.aviso('Sedento: se alguém estiver Sangrando a até 4 cédulas, teste CAN ou VIT agora.'); },
  aoFimCombate(){ /* a Fome fica: é o estado do vampiro */ }
});

/* ===== racas-a.js ===== */
/* =====================================================================
   LOTE A — Kitsunes (Ayto, Hayune, Lótus, Merunê, Nirus), Karê Oradora,
   Konaitos e Licantropo (linhagem).
   Ajudantes globais com prefixo LA_.
   ===================================================================== */

const LA_LARANJA = '#F08A55';
const LA_pl = (n, um, varios) => n === 1 ? um : varios;

// medidor do teto (mesmo visual do painel) para barras cujas pílulas ficam nas ações
function LA_medidor(ctx, trava){
  const b = ctx.b, t = tetoDe(b);
  const pips = Array.from({ length: t }, (_, i) => `<i class="${i < b.ganhoRodada ? 'on' : ''}"></i>`).join('');
  return `<div class="pb-medidor" style="width:100%;margin:0">${trava ? `<span class="pb-trava">${esc(trava)}</span>` : `<span>Nesta rodada: +${b.ganhoRodada} de ${t}${b.def.porAcao ? ` · até ${b.def.porAcao} por ação` : ''}</span>`}<span class="pb-pips">${pips}</span></div>`;
}
// pílula de ganho dentro das ações (as que mudam com a postura ou o lugar)
function LA_pilula(a, val, rot, ganho, o = {}){
  return `<button type="button" class="pb-chip${o.on ? ' on' : ''}${o.off ? ' off' : ''}" style="border-radius:999px;padding:4px 10px" data-a="${a}" value="${esc(val)}" title="${esc(o.t || rot)}">${o.on ? '✓ ' : ''}${rot} <b>${ganho}</b>${o.vezes ? `<i>×${o.vezes}</i>` : ''}</button>`;
}
// pontinho de 4 pontas (estrela, brilho)
const LA_brilho = (x, y, r) => `M${f1(x)} ${f1(y - r)}Q${f1(x)} ${f1(y)} ${f1(x + r)} ${f1(y)}Q${f1(x)} ${f1(y)} ${f1(x)} ${f1(y + r)}Q${f1(x)} ${f1(y)} ${f1(x - r)} ${f1(y)}Q${f1(x)} ${f1(y)} ${f1(x)} ${f1(y - r)}Z`;

/* =====================================================================
   1. KITSUNE AYTO — Sombras de Razier (a máscara ninja)
   ===================================================================== */
barra({id:'kitsune-ayto', cat:'raca', arvore:'Kitsune Ayto', barra:'Sombras de Razier', cor:'#9FB0D8',
  inicio:5, teto:5, porAcao:null, fim:'inicio', demo:12,
  icone:'<path d="M6 8L5.4 3L9.4 5.6M18 8L18.6 3L14.6 5.6"/><path d="M6 8.6C7.4 6.4 9.6 5.4 12 5.4S16.6 6.4 18 8.6V15C18 18.6 15.4 21 12 21S6 18.6 6 15Z"/><path d="M4.4 10.4H19.6V14.2H4.4Z"/><circle cx="9.4" cy="12.3" r="1.25" fill="currentColor" stroke="none"/><circle cx="14.6" cy="12.3" r="1.25" fill="currentColor" stroke="none"/>',
  estado:()=>({oculta:false, notada:false, somou:false}),
  ganhos:[
    {id:'oculta', c:'Comecei Oculta', t:'+1 ao começar o turno Oculta (o painel marca sozinho quando “Oculta” está ligada)', v:1, quando:'inicio', tipo:'auto', f:s=> s.oculta && !s.somou},
    {id:'brecha', c:'Brecha', t:'Acertou um alvo em brecha: ele não a vê (Oculta ou Invisível para ele) ou está Caído, Atordoado, Agarrado ou Cego', v:2, max:1},
    {id:'derrubei', c:'Derrubei sem ser vista', t:'Derrubou um inimigo sem ser vista (o golpe que a revela ainda conta)', v:3}],
  travaGanho: s => (s.notada && !s.oculta) ? 'Vista: as Sombras não enchem.' : false,
  face(s, v){
    const capuz = 'M40 112C40 72 58 46 80 38L72 8L104 31Q110 30 116 31L148 8L140 38C162 46 180 72 180 112V150C180 186 150 208 110 208C70 208 40 186 40 150Z';
    const vista = s.notada && !s.oculta;
    let o = '';
    if (s.oculta) o += `<path d="${capuz}" fill="none" stroke="${this.cor}" stroke-width="2.5" stroke-dasharray="3 7" stroke-linecap="round" transform="translate(110 112) scale(1.06) translate(-110 -112)"/>`;
    o += `<path d="${capuz}" fill="${s.oculta ? '#191C23' : '#22262E'}" stroke="#C9C3B5" stroke-width="2.5" stroke-linejoin="round"/>`;
    o += `<path d="M81 40L77 17L97 33ZM139 40L143 17L123 33Z" fill="#0E1014"/>`;
    // a faixa com os olhos e as pontas do nó
    o += `<path d="M182 88C194 80 206 84 217 74C212 88 200 94 184 98Z" fill="#C9C3B5"/><path d="M182 100C194 104 202 114 212 126C198 126 190 116 180 108Z" fill="#A9A397"/>`;
    o += `<rect x="34" y="80" width="152" height="30" rx="4" fill="#0E1014" stroke="#C9C3B5" stroke-width="2"/>`;
    const olho = vista ? '#E8E4DA' : this.cor;
    o += `<path d="M66 99Q84 82 102 93Q86 104 66 99ZM154 99Q136 82 118 93Q134 104 154 99Z" fill="${olho}"/>`;
    if (vista) o += `<circle cx="86" cy="95" r="3.4" fill="#0E1014"/><circle cx="134" cy="95" r="3.4" fill="#0E1014"/>`;
    // o pano da máscara: 4 voltas de 5 tiras, de baixo para cima
    for (let lin = 0; lin < 4; lin++) for (let i = 0; i < 5; i++){
      const n = (3 - lin) * 5 + i, x = 63 + i * 19.5, y = 118 + lin * 19 + 3 * (1 - ((i - 2) / 2) ** 2);
      o += `<rect x="${f1(x)}" y="${f1(y)}" width="16" height="15" rx="3" fill="${n < v ? this.cor : '#ffffff17'}"/>`;
    }
    if (vista){
      o += `<path d="M44 72L176 120" stroke="${LA_LARANJA}" stroke-width="4" stroke-linecap="round"/>`;
      o += KIT.texto(10, 24, 'Vista', {ancora:'start', tam:14, peso:800, cor:LA_LARANJA});
    } else if (s.oculta) o += KIT.texto(10, 24, 'Oculta', {ancora:'start', tam:14, peso:800, cor:this.cor});
    return o;
  },
  linha(s){
    if (s.notada && !s.oculta) return `<b style="color:${LA_LARANJA}">Vista</b> <em>· um inimigo a até 3 cédulas a notou: −4 na esquiva e as Sombras não enchem. Oculta, volta a encher.</em>`;
    if (s.oculta) return `<b>Oculta</b> <em>· começa o turno assim: +1. Golpe em quem não a vê é brecha.</em>`;
    return `<em>Brecha: o alvo não a vê, ou está Caído, Atordoado, Agarrado ou Cego.</em>`;
  },
  acoes(s){
    return `<button type="button" data-a="oculta" aria-pressed="${s.oculta}" title="Ela está Oculta">Oculta</button>`
      + `<button type="button" data-a="notada" aria-pressed="${s.notada}" title="Um inimigo que a notou está a até 3 cédulas">Notada perto (até 3)</button>`;
  },
  acao(s, a, ctx){
    if (a === 'oculta'){ s.oculta = !s.oculta; ctx.log(s.oculta ? `${ctx.nome} sumiu nas sombras (Oculta).` : `${ctx.nome} saiu de Oculta.`); }
    if (a === 'notada'){ s.notada = !s.notada; ctx.log(s.notada ? `Um inimigo notou ${ctx.nome} a até 3 cédulas.` : `Nenhum inimigo que notou ${ctx.nome} está perto.`); }
  },
  aposAplicar(s, ctx, q){ if (q === 'inicio') s.somou = true; },
  aoComecarTurno(s){ s.somou = false; }
});

/* =====================================================================
   2. KITSUNE HAYUNE — Noite Escura (lua nova entre constelações)
   ===================================================================== */
const LA_ENGANOS = ['Enfeitiçado', 'Confuso', 'Provocado', 'Paranoico', 'Amedrontado'];
// 4 constelações de 5 estrelas, em sentido horário a partir do alto à esquerda
const LA_CEU = [
  [[16,58],[30,34],[52,44],[66,20],[88,30]],
  [[132,26],[152,14],[170,34],[192,22],[204,50]],
  [[206,150],[188,166],[200,190],[176,200],[160,178]],
  [[60,176],[42,196],[24,182],[14,156],[36,142]]
];

barra({id:'hayune', cat:'raca', arvore:'Kitsune Hayune', barra:'Noite Escura', cor:'#9D8CF0',
  inicio:4, teto:5, porAcao:null, fim:'inicio', demo:12,
  icone:'<circle cx="11" cy="13" r="8"/><path d="M6.4 8.8A6.4 6.4 0 0 0 6.4 17.2" stroke-width="2.8"/><path d="M19.2 1.8L20.2 4.6L23 5.6L20.2 6.6L19.2 9.4L18.2 6.6L15.4 5.6L18.2 4.6Z" fill="currentColor" stroke="none"/>',
  estado:()=>({enganos:[]}),
  ganhos:[
    {id:'engano', c:'Caiu no engano', t:'Um inimigo caiu num engano dela: acreditou na mentira, atacou um alvo falso ou perdeu a ação por um truque. O mesmo fato conta uma vez só.', v:2},
    {id:'ilusao', c:'Agiu contra ilusão', t:'Um inimigo atacou ou agiu contra uma ilusão dela. O mesmo fato conta uma vez só.', v:1},
    {id:'falhou', c:'Falhou contra mim', t:'Um inimigo falhou num teste contra ela. O mesmo fato conta uma vez só.', v:1}],
  face(s, v){
    let o = `<rect x="2" y="2" width="216" height="216" rx="16" fill="#0E1014"/>`;
    LA_CEU.forEach((g, gi) => {
      const acesas = lim(v - gi * 5, 0, 5);
      for (let k = 0; k < 4; k++){ const on = k + 1 < acesas, [x1, y1] = g[k], [x2, y2] = g[k + 1];
        o += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${on ? this.cor : '#3A3F4A'}" stroke-width="${on ? 1.6 : 1}" stroke-opacity="${on ? .7 : 1}"/>`; }
      g.forEach(([x, y], k) => {
        o += k < acesas ? `<circle cx="${x}" cy="${y}" r="10" fill="${this.cor}" opacity=".16"/><path d="${LA_brilho(x, y, 8.5)}" fill="${this.cor}"/>`
                        : `<circle cx="${x}" cy="${y}" r="2.8" fill="#4E5463"/>`;
      });
    });
    // a lua nova: disco escuro, aro fino e um brilho
    o += `<circle cx="110" cy="96" r="40" fill="#050608" stroke="${this.cor}" stroke-width="1.4" stroke-opacity=".6"/>`;
    o += `<path d="M74.6 112.6A40 40 0 0 0 95 133.1" fill="none" stroke="${this.cor}" stroke-width="3.4" stroke-linecap="round"/>`;
    o += `<path d="${LA_brilho(138.3, 67.7, 9)}" fill="#E8E4DA"/>`;
    // enganos ativos, com as rodadas que faltam
    const en = s.enganos.slice(0, 3);
    en.forEach((e, i) => { o += KIT.texto(110, 158 + i * 16, `${e.n} ${'•'.repeat(e.r)}`, {tam:12, peso:700, cor:this.cor}); });
    if (s.enganos.length > 3) o += KIT.texto(110, 206, `+${s.enganos.length - 3}`, {tam:12, cor:'#9FA6B4'});
    return o;
  },
  linha(s){
    if (s.enganos.length) return `<b>${s.enganos.length} ${LA_pl(s.enganos.length, 'engano', 'enganos')}</b> <em>· ${s.enganos.map(e => `${e.n} (${e.r})`).join(', ')}. Testa no fim de cada turno; no máximo 3 rodadas.</em>`;
    return `<em>Engano: o alvo resiste com CAN ou DES. Um fato rende um ganho só.</em>`;
  },
  acoes(s){
    return `<select data-a="engano" aria-label="Pôr um engano"><option value="">Pôr engano…</option>${LA_ENGANOS.map(n => `<option value="${n}">${n}</option>`).join('')}</select>`
      + s.enganos.map((e, i) => `<button type="button" data-a="tira" value="${i}" title="O engano acabou (o alvo passou no teste, ou outro motivo)">✕ ${e.n} · ${e.r}</button>`).join('');
  },
  acao(s, a, ctx, val){
    if (a === 'engano' && val){ s.enganos.push({n:val, r:3}); ctx.log(`${ctx.nome} pôs ${val} (no máximo 3 rodadas).`); }
    if (a === 'tira'){ const e = s.enganos[+val]; if (e){ s.enganos.splice(+val, 1); ctx.log(`${e.n} de ${ctx.nome} acabou.`); } }
  },
  aoComecarTurno(s, ctx){
    s.enganos.forEach(e => { e.r--; });
    s.enganos.filter(e => e.r <= 0).forEach(e => ctx.log(`${e.n} de ${ctx.nome} acabou (3 rodadas).`));
    s.enganos = s.enganos.filter(e => e.r > 0);
  }
});

/* =====================================================================
   3. KITSUNE LÓTUS — Foco Espiritual (a flor que abre)
   ===================================================================== */
function LA_petala(cx, cy, a, r0, L, w){
  const t = (a - 90) * Math.PI / 180, ux = Math.cos(t), uy = Math.sin(t), px = -uy, py = ux;
  const pt = (r, k) => `${f1(cx + ux * r + px * k)} ${f1(cy + uy * r + py * k)}`;
  const m1 = r0 + (L - r0) * .3, m2 = r0 + (L - r0) * .78;
  return `M${pt(r0, 0)}C${pt(m1, w)} ${pt(m2, w * .9)} ${pt(L, 0)}C${pt(m2, -w * .9)} ${pt(m1, -w)} ${pt(r0, 0)}Z`;
}
const LA_ESPIRITO = (x, y) => `M${x} ${y - 16}C${x + 10} ${y - 4} ${x + 11} ${y + 7} ${x} ${y + 11}C${x - 11} ${y + 7} ${x - 10} ${y - 4} ${x} ${y - 16}Z`;

barra({id:'lotus', cat:'raca', arvore:'Kitsune Lótus', barra:'Foco Espiritual', cor:'#F7A8BE',
  inicio:3, teto:5, porAcao:2, fim:'inicio', demo:12,
  icone:'<path d="M12 3.6C14.6 6.8 14.6 12 12 16C9.4 12 9.4 6.8 12 3.6Z"/><path d="M12 16C8.4 15.6 5 13 3.8 8.8C7.6 8.8 10.6 11.4 12 16Z"/><path d="M12 16C15.6 15.6 19 13 20.2 8.8C16.4 8.8 13.4 11.4 12 16Z"/><path d="M5 19.8H19"/>',
  estado:()=>({esp:0}),
  ganhos:[
    {id:'provoquei', c:'Sensação provocada', t:'Ela ou um espírito dela provocou uma sensação: Amedrontado, Confuso, Enfeitiçado, Provocado ou Lento', v:1},
    {id:'tirei', c:'Tirei de aliado', t:'Tirou uma sensação de um aliado', v:1},
    {id:'chefe', c:'Em chefe', t:'Sensação provocada ou tirada com um chefe como alvo (no lugar do +1)', v:2}],
  face(s, v){
    const cx = 110, cy = 114;
    let o = '';
    const aneis = [[100, 30, 0], [80, 24, 36], [60, 18, 0], [40, 12, 36]];
    aneis.forEach(([L, w, a0], ai) => {
      for (let k = 0; k < 5; k++){ const n = ai * 5 + k, on = n < v;
        o += `<path d="${LA_petala(cx, cy, a0 + k * 72, 8, L, w)}" fill="${on ? this.cor : '#262A33'}" stroke="${on ? '#5A2E40' : '#3A3F4A'}" stroke-width="1.6" stroke-linejoin="round"/>`;
        if (on) { const [x1, y1] = P(cx, cy, L * .35, a0 + k * 72), [x2, y2] = P(cx, cy, L * .8, a0 + k * 72);
          o += `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="#5A2E40" stroke-opacity=".35" stroke-width="1.4"/>`; }
      }
    });
    o += `<circle cx="${cx}" cy="${cy}" r="13" fill="#E0C46A" stroke="#7A6A2E" stroke-width="1.5"/>`;
    [[0, 0], [-5, -4], [5, -4], [-5, 4], [5, 4]].forEach(([dx, dy]) => { o += `<circle cx="${cx + dx}" cy="${cy + dy}" r="1.8" fill="#7A6A2E"/>`; });
    // os dois espíritos (toque para chamar ou dispensar)
    [[24, 30], [196, 30]].forEach(([x, y], i) => {
      const on = i < s.esp;
      o += KIT.botao('e' + i, on ? 'Dispensar espírito' : 'Chamar espírito',
        `<circle cx="${x}" cy="${y}" r="20" fill="#16191F" opacity="0"/>`
        + (on ? `<circle cx="${x}" cy="${y}" r="17" fill="${this.cor}" opacity=".18"/><path d="${LA_ESPIRITO(x, y)}" fill="${this.cor}"/><circle cx="${x - 3.5}" cy="${y + 1}" r="1.8" fill="#16191F"/><circle cx="${x + 3.5}" cy="${y + 1}" r="1.8" fill="#16191F"/>`
              : `<path d="${LA_ESPIRITO(x, y)}" fill="none" stroke="#7E8594" stroke-width="1.6" stroke-dasharray="3 3"/>`));
    });
    return o;
  },
  dica(s, k){ const i = +k.slice(1); return i < s.esp ? `<b>Espírito</b> <em>· toque para dispensar.</em>` : `<b>Espírito</b> <em>· toque para chamar (no máximo 2). Surge a até 3 cédulas.</em>`; },
  linha(s){
    return `<b>${s.esp} de 2 ${LA_pl(s.esp, 'espírito', 'espíritos')}</b> <em>· somados, até 2 ações por rodada. Toque na chama para chamar ou dispensar.</em>`;
  },
  acoes(s){ return `<button type="button" class="gasta" data-a="conc" ${s.esp ? '' : 'disabled'} title="Perdeu 30% ou mais do HP máximo num golpe, ou ficou Atordoada ou Inconsciente: todos os espíritos somem">Perdi a concentração</button>`; },
  clique(s, k, ctx){
    const i = +k.slice(1);
    if (i < s.esp){ s.esp--; ctx.log(`Um espírito de ${ctx.nome} sumiu (${s.esp} de 2).`); return; }
    if (s.esp >= 2) return ctx.aviso('No máximo 2 espíritos ao mesmo tempo.');
    s.esp++; ctx.log(`${ctx.nome} chamou um espírito (${s.esp} de 2).`);
  },
  acao(s, a, ctx){ if (a === 'conc' && s.esp){ ctx.log(`${ctx.nome} perdeu a concentração: ${s.esp} ${LA_pl(s.esp, 'espírito sumiu', 'espíritos sumiram')}.`); s.esp = 0; } }
});

/* =====================================================================
   4. KITSUNE MERUNÊ — Dança Crescente (a lua que cresce em 20 fatias)
   ===================================================================== */
// [nome curto, [[rótulo, ganho, texto]...]]
const LA_POSTURAS = {
  nascente:['Lua Nascente', [['Mesmo alvo', 1, 'Acertou o mesmo inimigo que acertou no turno anterior'], ['Junto ao laço', 1, 'Terminou o turno ao lado do inimigo do laço']]],
  foice:['Foice Erguida', [['Abaixo da ½', 2, 'Deixou um inimigo abaixo da metade do HP'], ['Abati', 2, 'Abateu um inimigo']]],
  velada:['Lua Velada', [['Sem dano', 1, 'Foi atacada e não sofreu dano'], ['Guardei aliado', 1, 'Recebeu um golpe no lugar de um aliado, ou terminou o turno entre ele e o inimigo que o ameaça']]],
  mare:['Maré Crescente', [['Andei 3 e golpeei', 1, 'Andou 3 cédulas ou mais e golpeou no mesmo turno'], ['Cerquei', 1, 'Terminou o turno ao lado de um inimigo que também está ao lado de um aliado']]],
  eclipsep:['Eclipse Paciente', [['Sem atacar', 1, 'Passou o turno sem atacar (só andou, defendeu ou ajudou)'], ['Reação acertou', 2, 'Acertou um golpe de reação']]],
  halo:['Halo', [['Laço acertou', 1, 'O aliado do laço acertou um golpe'], ['Curei ou protegi', 1, 'Curou, protegeu ou deu bônus a um aliado']]],
  arco:['Arco Retesado', [['Acertei a 4+', 1, 'Acertou um golpe a 4 cédulas ou mais'], ['Sem andar', 1, 'Terminou o turno sem ter andado']]]
};
// a lua crescente: círculo de fora menos o de dentro, cortada em 20 fatias de ponta a ponta
const LA_LUA = (() => {
  const c1 = [100, 114], R = 98, c2 = [152, 88], r = 80;
  const dx = c2[0] - c1[0], dy = c2[1] - c1[1], d = Math.hypot(dx, dy);
  const a = (R * R - r * r + d * d) / (2 * d), h = Math.sqrt(R * R - a * a);
  const xm = c1[0] + a * dx / d, ym = c1[1] + a * dy / d;
  let pA = [xm + h * dy / d, ym - h * dx / d], pB = [xm - h * dy / d, ym + h * dx / d];
  if (pA[1] < pB[1]) [pA, pB] = [pB, pA];             // A = ponta de baixo (começa a encher), B = ponta de cima
  const ang = (c, p) => Math.atan2(p[1] - c[1], p[0] - c[0]);
  const meio = Math.atan2(c1[1] - c2[1], c1[0] - c2[0]); // lado de fora, longe do círculo de dentro
  const varre = (c, rr) => { const s0 = ang(c, pA), s1 = ang(c, pB); let sw = s1 - s0;
    const passa = sw2 => { const m = s0 + sw2 / 2; return Math.cos(m - meio) > 0; };
    if (!passa(sw)) sw = sw > 0 ? sw - 2 * Math.PI : sw + 2 * Math.PI;
    return { c, rr, s0, sw }; };
  const fora = varre(c1, R), dentro = varre(c2, r);
  const pto = (q, t) => [q.c[0] + q.rr * Math.cos(q.s0 + q.sw * t), q.c[1] + q.rr * Math.sin(q.s0 + q.sw * t)];
  const fatias = [];
  const folga = j => j <= 0 || j >= 20 ? 0 : (j % 5 ? .003 : .014); // meia folga na divisa j (mais larga a cada 5)
  for (let i = 0; i < 20; i++){
    const t0 = i / 20 + folga(i), t1 = (i + 1) / 20 - folga(i + 1);
    const o0 = pto(fora, t0), o1 = pto(fora, t1), d1 = pto(dentro, t1), d0 = pto(dentro, t0);
    const fo = fora.sw > 0 ? 1 : 0, fd = dentro.sw > 0 ? 0 : 1;
    fatias.push(`M${f1(o0[0])} ${f1(o0[1])}A${R} ${R} 0 0 ${fo} ${f1(o1[0])} ${f1(o1[1])}L${f1(d1[0])} ${f1(d1[1])}A${r} ${r} 0 0 ${fd} ${f1(d0[0])} ${f1(d0[1])}Z`);
  }
  return { fatias, pA, pB };
})();

barra({id:'merune', cat:'raca', arvore:'Kitsune Merunê', barra:'Dança Crescente', cor:'#F0C452',
  inicio:2, teto:5, porAcao:null, fim:'inicio', demo:9,
  icone:'<path d="M15.2 3.4A9 9 0 1 0 20.6 15.8A7.2 7.2 0 0 1 15.2 3.4Z"/><circle cx="18.6" cy="6.4" r="1.1" fill="currentColor" stroke="none"/>',
  estado:()=>({postura:null, feitas:[], gastou:false, laco:null, lacoCaiu:false}),
  face(s, v){
    let o = '';
    LA_LUA.fatias.forEach((d, i) => { o += `<path d="${d}" fill="${i < v ? this.cor : '#2A2D35'}"/>`; });
    if (s.gastou) LA_LUA.fatias.forEach(d => { o += `<path d="${d}" fill="none" stroke="${LA_LARANJA}" stroke-width="1" stroke-opacity=".55"/>`; });
    // o fio de luar: sai da ponta de cima
    const [bx, by] = LA_LUA.pB;
    if (s.laco || s.lacoCaiu){
      const cor = s.lacoCaiu ? LA_LARANJA : '#E8A0B4';
      o += `<path d="M${f1(bx)} ${f1(by)}C${f1(bx + 30)} ${f1(by + 40)} 210 120 186 168" fill="none" stroke="${cor}" stroke-width="2.2" ${s.lacoCaiu ? 'stroke-dasharray="7 5"' : ''}/>`;
      if (s.lacoCaiu) o += `<path d="M178 132L196 144" stroke="${LA_LARANJA}" stroke-width="3" stroke-linecap="round"/>`;
      else o += `<circle cx="186" cy="170" r="6" fill="#E8A0B4"/>` + KIT.texto(186, 194, s.laco, {tam:11.5, peso:700, cor:'#E8A0B4'});
    }
    const p = s.postura && LA_POSTURAS[s.postura];
    if (p){ const [a, b2] = p[0].split(' ');
      o += KIT.texto(146, b2 ? 104 : 114, a, {tam:15, peso:800, cor:this.cor}) + (b2 ? KIT.texto(146, 122, b2, {tam:15, peso:800, cor:this.cor}) : ''); }
    else o += KIT.texto(146, 114, 'sem postura', {tam:12, peso:600, cor:'#7E8594'});
    if (s.gastou) o += KIT.texto(8, 20, 'Gastou', {ancora:'start', tam:13, peso:800, cor:LA_LARANJA});
    return o;
  },
  linha(s){
    const p = s.postura && LA_POSTURAS[s.postura];
    if (!p) return `<em>Fora de postura: nada enche. Entrar ou trocar gasta a ação; trocar perde metade.</em>`;
    if (s.gastou) return `<b>${p[0]}</b> <em>· gastou Dança neste turno: as condições não enchem.</em>`;
    return `<b>Postura da ${p[0]}</b> <em>· cada condição, 1x por rodada. Quebrar perde metade; laço quebrado, 3.</em>`;
  },
  acoes(s, ctx){
    const p = s.postura && LA_POSTURAS[s.postura];
    const trava = !p ? 'Fora de postura: nada enche.' : s.gastou ? 'Gastou Dança: as condições não enchem.' : '';
    let h = LA_medidor(ctx, trava);
    h += `<select data-a="postura" aria-label="Postura de Merunê" title="Entrar ou trocar gasta a ação; trocar perde metade"><option value="">${p ? 'Trocar (perde ½)…' : 'Entrar em postura…'}</option>${Object.entries(LA_POSTURAS).map(([k, [n]]) => `<option value="${k}" ${s.postura === k ? 'disabled' : ''}>${n}</option>`).join('')}</select>`;
    h += `<select data-a="gasto" aria-label="Gastar Dança"><option value="">▼ Gastar…</option>${[1,2,3,4,5,6].map(n => `<option value="${n}">${n}</option>`).join('')}</select>`;
    const linha = `<span style="flex-basis:100%;height:0;margin-top:-6px"></span>`;
    if (p) h += linha + p[1].map(([rot, g, t], i) => LA_pilula('cond', i, rot, '+' + g, {t, on:s.feitas.includes(i), off:!!trava})).join('') + linha;
    if (p) h += `<button type="button" class="gasta" data-a="quebra" title="Caída, Agarrada, Atordoada, Paralisada ou Inconsciente: perde metade">▼ Postura quebrou</button>`;
    h += `<select data-a="laco" aria-label="Fio de Luar" title="Só um laço por vez. Soltar por vontade não perde nada">${s.laco ? '' : '<option value="">Fio de Luar…</option>'}${['aliado', 'inimigo', 'objeto'].map(k => `<option value="${k}" ${s.laco === k ? 'selected' : ''}>Laço: ${k}</option>`).join('')}${s.laco ? '<option value="solto">Soltei o laço</option>' : ''}</select>`;
    if (s.laco) h += `<button type="button" class="gasta" data-a="lacoquebra" title="O alvo caiu, o objeto foi destruído ou passou da distância. Se o inimigo do laço cai, solta sem perda.">▼ Laço quebrou (3)</button>`;
    return h;
  },
  acao(s, a, ctx, val){
    if (a === 'postura' && val && val !== s.postura){
      const antes = s.postura;
      if (antes){ const m = Math.ceil(ctx.v / 2); ctx.perder(m, 'trocou de postura'); }
      s.postura = val; s.feitas = [];
      ctx.log(`${ctx.nome} entrou na Postura da ${LA_POSTURAS[val][0]} (gasta a ação).`);
    }
    if (a === 'quebra' && s.postura){ const m = Math.ceil(ctx.v / 2); ctx.perder(m, 'a postura quebrou'); ctx.log(`A Postura da ${LA_POSTURAS[s.postura][0]} de ${ctx.nome} quebrou.`); s.postura = null; s.feitas = []; }
    if (a === 'cond'){
      const p = s.postura && LA_POSTURAS[s.postura], i = +val; if (!p) return;
      if (s.gastou) return ctx.aviso('Gastou Dança neste turno: as condições não enchem.');
      if (s.feitas.includes(i)) return ctx.aviso(`${p[1][i][0]}: já contou nesta rodada.`);
      if (ctx.ganhar(p[1][i][1], p[1][i][0].toLowerCase())) s.feitas.push(i);
    }
    if (a === 'laco' && val === 'solto' && s.laco){ ctx.log(`${ctx.nome} soltou o Fio de Luar (sem perda).`); s.laco = null; }
    else if (a === 'laco' && val && val !== s.laco){ s.laco = val; s.lacoCaiu = false; ctx.log(`${ctx.nome} estendeu o Fio de Luar até um ${val}.`); }
    if (a === 'lacoquebra' && s.laco){ ctx.perder(3, 'o laço quebrou'); s.laco = null; s.lacoCaiu = true; }
    if (a === 'gasto' && val){ ctx.perder(+val, 'gastou'); s.gastou = true; }
  },
  aoComecarTurno(s){ s.feitas = []; s.gastou = false; s.lacoCaiu = false; },
  aoTerminarTurno(s){ s.gastou = false; }
});

/* =====================================================================
   5. KITSUNE NIRUS — Mãe Natureza (o galho com 4 ramos de 5 folhas)
   ===================================================================== */
const LA_GALHOS = [[[108,178],[30,150]], [[111,144],[192,116]], [[109,110],[30,82]], [[110,76],[190,48]]];
function LA_folha(bx, by, ang, L, w, metade){
  const ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux, tx = bx + ux * L, ty = by + uy * L, mx = bx + ux * L * .5, my = by + uy * L * .5;
  const c = k => `${f1(mx + px * w * k)} ${f1(my + py * w * k)}`;
  if (metade) return `M${f1(bx)} ${f1(by)}Q${c(2)} ${f1(tx)} ${f1(ty)}Z`;
  return `M${f1(bx)} ${f1(by)}Q${c(2)} ${f1(tx)} ${f1(ty)}Q${c(-2)} ${f1(bx)} ${f1(by)}Z`;
}
const LA_FOLHAS = (() => {
  const fs = [];
  LA_GALHOS.forEach(([[sx, sy], [tx, ty]]) => {
    const ang = Math.atan2(ty - sy, tx - sx), lado = tx < sx ? -1 : 1;
    [.24, .44, .64, .84, 1].forEach((f, k) => {
      const bx = sx + (tx - sx) * f, by = sy + (ty - sy) * f;
      const a = k === 4 ? ang : ang + (k % 2 ? 1 : -1) * 0.95 * lado;
      fs.push([bx, by, a, k === 4 ? 26 : 24]);
    });
  });
  return fs;
})();
const LA_LUGAR = {natural:'Natural', neutro:'Neutro', corrompido:'Corrompido'};

barra({id:'nirus', cat:'raca', arvore:'Kitsune Nirus', barra:'Mãe Natureza', cor:'#9AD46A',
  inicio:4, teto:5, porAcao:2, fim:'inicio', demo:12, persiste:['lugar'],
  icone:'<path d="M5 19C5 10.4 10.2 4.6 19.4 4.6C19.4 13.6 13.8 19 5 19Z"/><path d="M5 19L14.6 9.4"/><path d="M9.6 14.4H13.2M11.8 12.2V8.8"/>',
  estado:()=>({lugar:'natural', resto:0, somou:false, vezes:{}}),
  ganhos:[{id:'mata', c:'Lugar natural', t:'+1 no começo de cada rodada em ambiente natural', v:1, quando:'inicio', tipo:'auto', f:s=> s.lugar === 'natural' && !s.somou}],
  face(s, v){
    let o = '';
    // chão
    if (s.lugar === 'corrompido'){
      o += `<path d="M6 206H214" stroke="#5A4660" stroke-width="5" stroke-linecap="round"/><path d="M40 206L48 196L44 190M150 206L142 198L150 192M96 206L102 199" fill="none" stroke="#7A5E80" stroke-width="2"/>`;
    } else {
      o += `<path d="M6 206H214" stroke="${s.lugar === 'natural' ? '#5E8C3A' : '#4A505C'}" stroke-width="5" stroke-linecap="round"/>`;
      if (s.lugar === 'natural') [[30],[62],[150],[184]].forEach(([x]) => { o += `<path d="M${x - 6} 204L${x - 9} 194M${x} 204V191M${x + 6} 204L${x + 9} 194" stroke="#5E8C3A" stroke-width="2" stroke-linecap="round"/>`; });
    }
    // caule e galhos
    o += `<path d="M110 206C104 160 116 112 110 26" fill="none" stroke="#8A7050" stroke-width="6" stroke-linecap="round"/>`;
    LA_GALHOS.forEach(([[sx, sy], [tx, ty]]) => { o += `<path d="M${sx} ${sy}L${tx} ${ty}" stroke="#8A7050" stroke-width="3.2" stroke-linecap="round"/>`; });
    o += `<path d="M110 30C102 22 104 12 110 6C116 12 118 22 110 30Z" fill="${v >= 20 ? this.cor : '#3A4A30'}" stroke="#8A7050" stroke-width="1.5"/>`;
    LA_FOLHAS.forEach(([bx, by, a, L], i) => {
      const on = i < v;
      o += `<path d="${LA_folha(bx, by, a, L, 8)}" fill="${on ? this.cor : '#262B30'}" stroke="${on ? '#3E6B22' : '#3A4048'}" stroke-width="1.3"/>`;
      if (!on && i === v && s.resto) o += `<path d="${LA_folha(bx, by, a, L, 8, true)}" fill="${this.cor}"/>`;
      if (on) o += `<path d="M${f1(bx)} ${f1(by)}L${f1(bx + Math.cos(a) * L * .85)} ${f1(by + Math.sin(a) * L * .85)}" stroke="#3E6B22" stroke-width="1.2"/>`;
    });
    if (s.lugar === 'corrompido') o += KIT.texto(212, 192, s.resto ? 'metade · ½ guardado' : 'metade', {ancora:'end', tam:12, peso:800, cor:LA_LARANJA});
    return o;
  },
  linha(s){
    if (s.lugar === 'corrompido') return `<b style="color:${LA_LARANJA}">Cidade ou corrompido</b> <em>· ganha metade: cada +1 vale ½, e duas metades viram 1.${s.resto ? ' Tem ½ guardado.' : ''}</em>`;
    if (s.lugar === 'natural') return `<b>Ambiente natural</b> <em>· +1 no começo de cada rodada. A cura que se repete conta uma vez.</em>`;
    return `<em>Cura ou proteção de aliado enche. A cura que se repete conta uma vez.</em>`;
  },
  acoes(s, ctx){
    const meio = s.lugar === 'corrompido', vz = s.vezes;
    let h = Object.entries(LA_LUGAR).map(([k, n]) => `<button type="button" data-a="lugar" value="${k}" aria-pressed="${s.lugar === k}" title="${k === 'corrompido' ? 'Cidade ou lugar corrompido: ganha metade' : k === 'natural' ? 'Mata, campo, rio: +1 no começo da rodada' : 'Nem natural nem corrompido'}">${n}</button>`).join('');
    h += LA_pilula('ganho', 'curei', 'Curei aliado', meio ? '+½' : '+1', {t:'Curou um aliado', vezes:vz.curei});
    h += LA_pilula('ganho', 'protegi', 'Protegi aliado', meio ? '+½' : '+1', {t:'Protegeu um aliado: deu escudo ou defesa, ou levou o golpe no lugar dele', vezes:vz.protegi});
    h += LA_pilula('ganho', 'metade', 'Curei abaixo de ½', meio ? '+1' : '+2', {t:'Curou um aliado que estava abaixo da metade do HP (no lugar do +1)', vezes:vz.metade});
    return h;
  },
  acao(s, a, ctx, val){
    if (a === 'lugar' && val !== s.lugar){ s.lugar = val; ctx.log(`${ctx.nome} luta num lugar ${LA_LUGAR[val].toLowerCase()}${val === 'corrompido' ? ': ganha metade' : ''}.`); }
    if (a === 'ganho'){
      const n = val === 'metade' ? 2 : 1, motivo = {curei:'curou aliado', protegi:'protegeu aliado', metade:'curou aliado abaixo da metade'}[val];
      if (s.lugar !== 'corrompido'){ if (ctx.ganhar(n, motivo)) s.vezes[val] = (s.vezes[val] || 0) + 1; return; }
      const meios = n + s.resto, pts = Math.floor(meios / 2);
      s.resto = meios % 2; s.vezes[val] = (s.vezes[val] || 0) + 1;
      if (pts) ctx.ganhar(pts, motivo + ', metade');
      else ctx.log(`${ctx.nome}: +½ Mãe Natureza guardado (${motivo}, lugar corrompido).`);
    }
  },
  aposAplicar(s, ctx, q){ if (q === 'inicio') s.somou = true; },
  aoComecarTurno(s){ s.somou = false; s.vezes = {}; }
});

/* =====================================================================
   6. KARÊ ORADORA — Palavras (o balão de 20 palavras e o trilho da reza)
   ===================================================================== */
const LA_REZAS = {
  'Paciência': {correntes:'Reza das Correntes', silencio:'Reza do Silêncio', sono:'Reza do Sono'},
  'Rast': {ferida:'Reza da Ferida', osso:'Reza do Osso', agonia:'Reza da Agonia'},
  'Ventania': {tempestade:'Reza da Tempestade', areia:'Reza da Areia', doente:'Reza do Sopro Doente'}
};
const LA_reza = k => { for (const g of Object.values(LA_REZAS)) if (g[k]) return g[k]; return ''; };
const LA_PALAVRAS = [[36,22,40,26,24], [24,38,28,22,36], [30,26,22,40,30], [40,24,34,28,22]];
const LA_TRILHO = [26, 68, 110, 152, 194];

barra({id:'oradora', cat:'raca', arvore:'Karê Oradora', barra:'Palavras', cor:'#5ED4BE',
  inicio:5, teto:5, porAcao:null, fim:'inicio', demo:11,
  icone:'<path d="M4 6.6C4 5.2 5.2 4 6.6 4H17.4C18.8 4 20 5.2 20 6.6V13.4C20 14.8 18.8 16 17.4 16H10.4L6.4 19.8V16H6.6C5.2 16 4 14.8 4 13.4Z"/><circle cx="8.4" cy="10" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="10" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.6" cy="10" r="1.2" fill="currentColor" stroke="none"/>',
  estado:()=>({ramo:'', passo:0, ate:0, fim:'', falou:0, dupla:false, armada:false, pausa:false, ultAb:'', ultAbTurno:-9, turno:0}),
  ganhos:[{id:'extra', c:'Ganho extra', t:'Ganhos que os nós dão (Colheita da Espera, Faro de Dor, Lábios Partidos…): no máximo +1 por rodada', v:1, max:1}],
  face(s, v){
    let o = `<path d="M26 8H194Q210 8 210 24V108Q210 124 194 124H66L34 148L44 124H26Q10 124 10 108V24Q10 8 26 8Z" fill="#1E2128" stroke="#C9C3B5" stroke-width="2.5" stroke-linejoin="round"/>`;
    LA_PALAVRAS.forEach((ws, lin) => { let x = 22;
      ws.forEach((w, k) => { const n = lin * 5 + k;
        o += `<rect x="${x}" y="${21 + lin * 24}" width="${w}" height="13" rx="6.5" fill="${n < v ? this.cor : '#ffffff17'}"/>`; x += w + 7; }); });
    // trilho da reza
    const quebrou = s.fim === 'quebrou', cheio = s.fim === 'cheia', agil = s.fim === 'agil';
    const feitos = cheio ? 5 : agil ? s.ate : s.passo, y = 166;
    for (let i = 0; i < 4; i++){ const on = cheio || i + 1 < feitos;
      o += `<line x1="${LA_TRILHO[i]}" y1="${y}" x2="${LA_TRILHO[i + 1]}" y2="${y}" stroke="${on ? this.cor : '#3A3F4A'}" stroke-width="${on ? 3 : 2}"/>`; }
    if (agil && s.ate){ const xa = LA_TRILHO[s.ate - 1];
      o += `<path d="M${xa} ${y - 12}Q${(xa + 194) / 2} ${y - 34} 194 ${y - 13}" fill="none" stroke="${this.cor}" stroke-width="2.2" stroke-dasharray="4 4"/>`; }
    LA_TRILHO.forEach((x, i) => {
      const r = i === 0 ? 9 : i === 4 ? 12 : 11;
      const on = cheio || i < feitos || (agil && i === 4);
      const prox = !s.fim && s.ramo && i === s.passo && s.passo < 4 || (!s.fim && s.passo >= 2 && i === 4);
      o += `<circle cx="${x}" cy="${y}" r="${r}" fill="${on ? this.cor : '#1E2128'}" stroke="${on ? this.cor : prox ? this.cor : '#5A606C'}" stroke-width="${prox ? 2 : 1.5}" ${prox && !on ? 'stroke-dasharray="3 3"' : ''}/>`;
      if (i > 0 && i < 4) o += KIT.texto(x, y + 4.5, i + 1, {tam:12.5, peso:800, cor:on ? '#0E1014' : '#9FA6B4'});
    });
    o += KIT.texto(12, 194, 'Abertura', {ancora:'start', tam:11.5, peso:600, cor:'#9FA6B4'}) + KIT.texto(208, 194, 'Amém', {ancora:'end', tam:11.5, peso:600, cor:'#9FA6B4'});
    if (quebrou) o += `<path d="M18 150L202 182" stroke="${LA_LARANJA}" stroke-width="3.5" stroke-linecap="round"/>`;
    const nome = s.ramo ? LA_reza(s.ramo) : 'escolha a reza';
    o += KIT.texto(110, 212, quebrou ? 'quebrou' : nome, {tam:13, peso:800, cor:quebrou ? LA_LARANJA : s.ramo ? this.cor : '#7E8594'});
    if (s.pausa) o += KIT.texto(110, 194, 'pausa', {tam:11.5, peso:700, cor:'#9FA6B4'});
    return o;
  },
  linha(s){
    const r = s.ramo && LA_reza(s.ramo);
    if (s.fim === 'quebrou') return `<b style="color:${LA_LARANJA}">A reza quebrou</b> <em>· comece de novo pela Abertura.</em>`;
    if (s.fim === 'agil') return `<b>Amém agilizado</b> <em>· dano do Amém e dos ecos pela metade; condições −1 rodada (mín. 1).</em>`;
    if (s.fim === 'cheia') return `<b>Amém</b> <em>· a reza saiu com toda a força.</em>`;
    if (!r) return `<em>Escolha a reza. Abertura → 2 → 3 → 4 → Amém: uma palavra por turno, no mesmo ramo.</em>`;
    if (!s.passo) return `<b>${r}</b> <em>· diga a Abertura (alvo a até 6 cédulas).</em>`;
    if (s.passo === 4) return `<b>${r} · passo 4</b> <em>· agora é o Amém (+2).</em>`;
    return `<b>${r} · passo ${s.passo === 1 ? 'Abertura' : s.passo}</b> <em>· ${s.falou ? 'já falou neste turno' : s.pausa ? 'pausa neste turno' : 'falta a palavra deste turno'}.${s.passo >= 2 ? ' Amém antes do 4 sai mais fraco.' : ''}</em>`;
  },
  acoes(s){
    const ops = Object.entries(LA_REZAS).map(([arv, g]) => `<optgroup label="${arv}">${Object.entries(g).map(([k, n]) => `<option value="${k}" ${s.ramo === k ? 'selected' : ''}>${n}</option>`).join('')}</optgroup>`).join('');
    let h = `<select data-a="ramo" aria-label="Reza"><option value="">Reza…</option>${ops}</select>`;
    const rot = !s.passo ? 'Abertura' : `Passo ${s.passo + 1} (+1)`;
    const calada = s.falou >= 1 && !s.armada;   // já disse a palavra do turno
    h += `<button type="button" data-a="palavra" ${!s.ramo || s.passo >= 4 || calada ? 'disabled' : ''} title="${calada ? 'Uma palavra por turno' : 'Dizer a palavra é a ação do turno'}">${rot}</button>`;
    h += `<button type="button" data-a="amem" ${s.passo >= 2 && !calada ? '' : 'disabled'} title="${s.passo === 4 ? 'A reza completa sai com toda a força' : 'Agilizar: dano do Amém e dos ecos pela metade, condições −1 rodada'}">${s.passo === 4 || s.passo < 2 ? 'Amém (+2)' : 'Agilizar: Amém (+2)'}</button>`;
    h += `<button type="button" class="gasta" data-a="simples" ${s.passo >= 2 && !calada ? '' : 'disabled'} title="Quem não aprendeu o Amém do ramo: custa 2 e só dispara os ecos">▼ Amém simples (2)</button>`;
    if (s.passo){
      h += `<button type="button" data-a="pausa" aria-pressed="${s.pausa}" title="Pausa Sagrada, Gemido Contido ou Pausa da Brisa (1x por reza); Amém Guardado (até 2 turnos depois do passo 4): passa o turno sem palavra e a reza não quebra">Pausa</button>`;
      h += `<button type="button" class="gasta" data-a="quebra" title="Silenciada, Atordoada ou Inconsciente">Reza quebrou</button>`;
    }
    if (calada && s.passo && !s.dupla) h += `<button type="button" data-a="dupla" title="Conta Dobrada, Dor Dobrada ou Sopro Duplo: mais uma palavra neste turno, 1x por combate (somando as três árvores)">Palavra dupla</button>`;
    return h;
  },
  acao(s, a, ctx, val){
    const quebra = motivo => { s.passo = 0; s.fim = 'quebrou'; s.pausa = false; ctx.log(`A ${LA_reza(s.ramo)} de ${ctx.nome} quebrou (${motivo}).`); };
    if (a === 'ramo' && val !== s.ramo){
      if (s.passo) quebra('trocou de ramo');
      s.ramo = val; if (s.fim !== 'quebrou') s.fim = '';
      if (val) ctx.log(`${ctx.nome} vai rezar a ${LA_reza(val)}.`);
    }
    if (a === 'palavra'){
      if (!s.ramo) return ctx.aviso('Escolha a reza primeiro.');
      if (s.falou >= 1 && !s.armada) return ctx.aviso('Uma palavra por turno.');
      if (!s.passo){
        if (s.ultAb === s.ramo && s.ultAbTurno === s.turno - 1) return ctx.aviso('A mesma Abertura não vale em dois turnos seguidos.');
        s.passo = 1; s.fim = ''; s.falou++; s.ultAb = s.ramo; s.ultAbTurno = s.turno;
        ctx.log(`${ctx.nome} disse a Abertura da ${LA_reza(s.ramo)}.`);
      } else if (s.passo < 4){ s.passo++; s.falou++; ctx.ganhar(1, `${LA_reza(s.ramo)}, passo ${s.passo}`); }
      if (s.falou > 1 && s.armada){ s.armada = false; s.dupla = true; ctx.log(`${ctx.nome} usou a palavra dupla (1x por combate).`); }
    }
    if (a === 'dupla' && !s.dupla && s.passo) s.armada = true;
    if ((a === 'amem' || a === 'simples') && s.passo >= 2){
      const agil = s.passo < 4, nome = LA_reza(s.ramo);
      if (s.falou >= 1 && !s.armada) return ctx.aviso('Uma palavra por turno.');
      if (a === 'simples' && ctx.v < 2) return ctx.aviso('O Amém simples custa 2 Palavras.');
      if (s.falou >= 1){ s.armada = false; s.dupla = true; ctx.log(`${ctx.nome} usou a palavra dupla (1x por combate).`); }
      if (a === 'simples') ctx.perder(2, 'Amém simples');
      s.falou++; s.ate = s.passo; s.passo = 0; s.pausa = false; s.fim = agil ? 'agil' : 'cheia';
      ctx.ganhar(2, `Amém${agil ? ' agilizado' : ''}`);
      ctx.log(`${ctx.nome} fechou a ${nome} com ${a === 'simples' ? 'o Amém simples (só os ecos)' : 'Amém'}${agil ? ': agilizado, sai mais fraco' : ''}.`);
    }
    if (a === 'pausa' && s.passo){ s.pausa = !s.pausa; if (s.pausa) ctx.log(`${ctx.nome} fez a pausa: passa o turno sem palavra, a reza segue.`); }
    if (a === 'quebra' && s.passo) quebra('Silenciada, Atordoada ou Inconsciente');
  },
  aoComecarTurno(s){ s.turno++; s.falou = 0; s.armada = false; s.pausa = false; if (s.fim && s.fim !== 'quebrou') s.fim = ''; },
  aoTerminarTurno(s, ctx){
    if (s.passo && !s.falou && !s.pausa){ ctx.log(`A ${LA_reza(s.ramo)} de ${ctx.nome} quebrou (um turno sem palavra).`); s.passo = 0; s.fim = 'quebrou'; }
  }
});

/* =====================================================================
   7. KONAITOS — Voz Manipuladora (o olho do deus sobre o altar de velas)
   ===================================================================== */
const LA_COMANDOS = [['Ajoelha!', 3], ['Ajoelha! 2 alvos', 4], ['Treme!', 3], ['Treme! em volta', 5], ['Esquece!', 2], ['Esquece! 2 alvos', 3],
  ['Para!', 3], ['Cala!', 3], ['Revela!', 2], ['Obedece!', 8], ['Obedece! (grau 2)', 6]];
const LA_ALTAR = [[206, 20, 200], [172, 30, 190], [138, 40, 180], [104, 50, 170]];

barra({id:'konaitos', cat:'raca', arvore:'Konaitos', barra:'Voz Manipuladora', cor:'#E07FD0',
  inicio:5, teto:5, porAcao:2, fim:'inicio', demo:11, persiste:['mandado'],
  icone:'<path d="M2.5 12C5.2 7.4 8.4 5.4 12 5.4S18.8 7.4 21.5 12C18.8 16.6 15.6 18.6 12 18.6S5.2 16.6 2.5 12Z"/><path d="M12 7.8C13.6 9.6 13.6 14.4 12 16.2C10.4 14.4 10.4 9.6 12 7.8Z"/>',
  estado:()=>({deus:0, falando:false, abriu:false, vezes:0, mandado:false}),
  ganhos:[
    {id:'oracao', c:'Oração dita', t:'Disse uma oração: Salmo, Litania ou Réquiem', v:1},
    {id:'sentenca', c:'Sentença', t:'Uma oração dele chegou à sentença', v:1},
    {id:'no', c:'Nó deu +1', t:'Um nó deu 1 de Voz: Heresia Anotada, Tributo dos Caídos, Martírio…', v:1}],
  face(s, v){
    let o = '';
    // o altar de velas: 4 prateleiras de 5, de baixo para cima
    o += `<path d="M14 210L44 88H176L206 210Z" fill="#1A1C22" stroke="#3A3F4A" stroke-width="1.5" stroke-linejoin="round"/>`;
    LA_ALTAR.forEach(([y, x0, x1], fi) => {
      o += `<rect x="${x0 - 4}" y="${y}" width="${x1 - x0 + 8}" height="5" rx="2" fill="#5A4E40"/>`;
      for (let k = 0; k < 5; k++){ const n = fi * 5 + k, on = n < v, cx = x0 + 10 + k * (x1 - x0 - 20) / 4;
        o += `<rect x="${f1(cx - 6)}" y="${y - 18}" width="12" height="18" rx="2" fill="${on ? '#E8E4DA' : '#2E323B'}"/>`;
        o += `<line x1="${f1(cx)}" y1="${y - 18}" x2="${f1(cx)}" y2="${y - 22}" stroke="${on ? '#2A2A2A' : '#5A606C'}" stroke-width="1.4"/>`;
        if (on) o += `<circle cx="${f1(cx)}" cy="${y - 29}" r="11" fill="${this.cor}" opacity=".2"/><path d="M${f1(cx)} ${y - 41}C${f1(cx + 6.5)} ${y - 32} ${f1(cx + 6)} ${y - 23} ${f1(cx)} ${y - 21}C${f1(cx - 6)} ${y - 23} ${f1(cx - 6.5)} ${y - 32} ${f1(cx)} ${y - 41}Z" fill="${this.cor}"/>`;
      }
    });
    // o olho de Volkhum'Pansar
    if (s.falando){
      for (let i = 1; i < 8; i++){ const a = -80 + i * 20, [x1, y1] = P(110, 38, 44, a), [x2, y2] = P(110, 38, 56, a); if (y2 < 40) o += `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${this.cor}" stroke-width="2.4" stroke-linecap="round"/>`; }
      o += `<path d="M46 38Q110 -4 174 38Q110 78 46 38Z" fill="#0E1014" stroke="${this.cor}" stroke-width="2.5"/><circle cx="110" cy="38" r="17" fill="${this.cor}"/><path d="M110 23C116 31 116 45 110 53C104 45 104 31 110 23Z" fill="#0E1014"/>`;
    } else if (v >= 10){
      o += `<path d="M54 38Q110 10 166 38Q110 62 54 38Z" fill="#0E1014" stroke="#C9C3B5" stroke-width="2"/><circle cx="110" cy="37" r="12" fill="#3A2440"/><path d="M110 27C114 32 114 43 110 48C106 43 106 32 110 27Z" fill="${this.cor}"/>`;
    } else {
      o += `<path d="M54 34Q110 60 166 34" fill="none" stroke="#8E8A80" stroke-width="2.5" stroke-linecap="round"/>`;
      [70, 90, 110, 130, 150].forEach(x => { const yy = 34 + 26 * (1 - ((x - 110) / 56) ** 2) * .98; o += `<line x1="${x}" y1="${f1(yy)}" x2="${x + (x - 110) * .08}" y2="${f1(yy + 8)}" stroke="#8E8A80" stroke-width="2" stroke-linecap="round"/>`; });
    }
    if (s.mandado) o += `<rect x="2" y="2" width="56" height="19" rx="4" fill="#2A1A14" stroke="${LA_LARANJA}" stroke-width="1.5"/>` + KIT.texto(30, 16, 'Mandado', {tam:11.5, peso:800, cor:LA_LARANJA});
    return o;
  },
  linha(s, ctx){
    if (s.falando) return `<b>O deus fala</b> <em>· Vozes de Comando liberadas (gastam Voz). ${s.abriu ? 'Fala nos 2 próximos turnos.' : `Falta ${s.deus} ${LA_pl(s.deus, 'turno', 'turnos')}.`}</em>`;
    if (s.mandado) return `<b style="color:${LA_LARANJA}">Mandado</b> <em>· Dívida de Perdição: cumpra a ordem do mestre. Desobedecer zera a Voz.</em>`;
    if (ctx.v >= 10 && s.vezes < 1) return `<b>10 de Voz</b> <em>· o deus pode falar por ele (gasta a ação, 1x por combate).</em>`;
    return `<em>A Voz precisa ser ouvida: alvo Surdo ou a mais de 6 cédulas escapa. Silenciado, não reza.</em>`;
  },
  acoes(s, ctx){
    let h = '';
    if (!s.falando) h += `<button type="button" data-a="deus" ${ctx.v >= 10 && s.vezes < 2 ? '' : 'disabled'} title="Voz de Volkhum'Pansar: com 10 de Voz, gasta a ação; as contagens descem 1 e o deus fala nos 2 turnos seguintes. 1x por combate (Cobrador de Almas: 2x)">${s.vezes ? 'O deus fala de novo (Cobrador)' : 'O deus fala (10+)'}</button>`;
    h += `<select data-a="gasto" aria-label="Gastar Voz"><option value="">▼ Gastar Voz…</option><optgroup label="${s.falando ? 'Vozes de Comando' : 'Vozes de Comando (com o deus)'}">${LA_COMANDOS.map(([n, c], i) => `<option value="c${i}" ${s.falando ? '' : 'disabled'}>${n} (${c})</option>`).join('')}</optgroup><optgroup label="Outro gasto">${[1,2,3,4].map(n => `<option value="${n}">${n}</option>`).join('')}</optgroup></select>`;
    if (s.mandado) h += `<button type="button" data-a="cumpri">Mandado cumprido</button>`;
    h += `<button type="button" class="gasta" data-a="desobedeci" title="Desobedeceu o deus ou um Mandado">▼ Desobedeci (zera)</button>`;
    return h;
  },
  acao(s, a, ctx, val){
    if (a === 'deus'){
      if (ctx.v < 10) return ctx.aviso('O deus só fala com 10 de Voz.');
      if (s.vezes >= 2) return ctx.aviso('O deus já falou neste combate.');
      s.vezes++; s.falando = true; s.deus = 2; s.abriu = true;
      ctx.log(`${ctx.nome} abriu a boca para Volkhum'Pansar: as contagens das orações descem 1. O deus fala nos 2 próximos turnos${s.vezes > 1 ? ' (Cobrador de Almas)' : ''}.`);
    }
    if (a === 'gasto' && val){
      if (val[0] === 'c'){ const [n, c] = LA_COMANDOS[+val.slice(1)];
        if (!s.falando) return ctx.aviso('Vozes de Comando só com o deus falando.');
        if (ctx.v < c) return ctx.aviso(`${n} custa ${c} de Voz.`);
        ctx.perder(c, n);
      } else { if (ctx.v < +val) return ctx.aviso(`Falta Voz: custa ${val}.`); ctx.perder(+val, 'gastou'); }
    }
    if (a === 'cumpri' && s.mandado){ s.mandado = false; ctx.log(`${ctx.nome} cumpriu o Mandado.`); }
    if (a === 'desobedeci'){ const antes = ctx.v; ctx.v = 0; ctx.log(`${ctx.nome} desobedeceu: a Voz zera (era ${antes}). O mestre passa as consequências.`); }
  },
  aoTerminarTurno(s, ctx){
    if (!s.falando) return;
    if (s.abriu){ s.abriu = false; return; }
    s.deus--;
    if (s.deus <= 0){ s.falando = false; s.mandado = true; ctx.log(`O deus se calou. Dívida de Perdição: o mestre dá um Mandado a ${ctx.nome}.`); }
  },
  aoFimCombate(s, ctx){
    if (s.falando){ s.mandado = true; ctx.log(`O deus se calou. Dívida de Perdição: o mestre dá um Mandado a ${ctx.nome}.`); }
    ctx.v = ctx.def.inicio;
  }
});

/* =====================================================================
   8. LICANTROPO (linhagem) — Barra Bestial (lua com 4 riscos de garra)
   ===================================================================== */
const LA_PATAMARES = [[20, 'Fera Solta'], [15, 'Fera'], [10, 'Garras'], [5, 'Desperto'], [0, '']];
const LA_patamar = v => LA_PATAMARES.find(p => v >= p[0]);
const LA_CEUS = {cheia:['Lua cheia', 15], o0:['Outra fase', 0], o5:['Outra fase', 5], o10:['Outra fase', 10]};
const LA_GARRAS = (() => {
  const M = [110, 100], u = [.573, -.819], n = [.819, .573], esp = 31;
  const riscos = [];
  [-1.5, -.5, .5, 1.5].forEach(k => {
    const meia = Math.abs(k) > 1 ? 56 : 70, W = Math.abs(k) > 1 ? 8 : 10;
    const c = [M[0] + n[0] * esp * k, M[1] + n[1] * esp * k];
    const A = [c[0] - u[0] * meia, c[1] - u[1] * meia], B = [c[0] + u[0] * meia, c[1] + u[1] * meia], C = [c[0] - n[0] * 9, c[1] - n[1] * 9];
    const ponto = t => [(1 - t) ** 2 * A[0] + 2 * (1 - t) * t * C[0] + t * t * B[0], (1 - t) ** 2 * A[1] + 2 * (1 - t) * t * C[1] + t * t * B[1]];
    const dir = t => { const a = ponto(t - .01), b = ponto(t + .01), l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l]; };
    const larg = t => W * (.18 + .82 * Math.sin(Math.PI * t) ** .7);
    for (let i = 0; i < 5; i++){
      const t0 = i / 5 + (i ? .014 : 0), t1 = (i + 1) / 5 - (i < 4 ? .014 : 0), ts = [0, .25, .5, .75, 1].map(f => t0 + (t1 - t0) * f);
      const esq = ts.map(t => { const p = ponto(t), d = dir(t), w = larg(t); return `${f1(p[0] + d[0] * w)} ${f1(p[1] + d[1] * w)}`; });
      const dir2 = ts.slice().reverse().map(t => { const p = ponto(t), d = dir(t), w = larg(t); return `${f1(p[0] - d[0] * w)} ${f1(p[1] - d[1] * w)}`; });
      riscos.push('M' + esq.join('L') + 'L' + dir2.join('L') + 'Z');
    }
  });
  return riscos;
})();

barra({id:'licantropo', cat:'linhagem', arvore:'Licantropo', barra:'Barra Bestial', cor:'#E8D9B8',
  inicio:0, teto:(s)=> s.vampiro ? 6 : 5, porAcao:null, fim:'zera', demo:12, persiste:['ceu', 'dia'],
  icone:'<circle cx="12" cy="12" r="8.8"/><path d="M10.4 6.6L7.2 15.4M13.8 7.2L10.6 16.6M17.2 8.4L14 17.4"/>',
  estado:()=>({ceu:'', dia:false, vampiro:false, solta:false, soltaFim:0, noTurno:false}),
  ganhos:[
    {id:'brutal', c:'Golpe brutal dado', t:'Garra, mordida ou golpe de corte que acertou', v:1, quando:'inicio'},
    {id:'sofrido', c:'Golpe sofrido', t:'Cada golpe que o acertou', v:1, quando:'inicio'},
    {id:'presa', c:'Presa fugiu ou sangue', t:'Presa que fugiu ou sangue que jorrou perto (o mestre diz)', v:1, quando:'inicio'}],
  travaGanho: s => s.dia ? 'Dia: a barra dorme.' : false,
  face(s, v){
    const cheia = s.ceu === 'cheia', solta = s.solta && !s.dia;
    let o = `<g opacity="${s.dia ? .38 : 1}">`;
    o += `<circle cx="110" cy="100" r="94" fill="${cheia ? '#3C3E48' : '#2A2C34'}" stroke="${solta ? LA_LARANJA : cheia ? '#E8E4DA' : '#5A606C'}" stroke-width="${solta ? 3 : 1.5}"/>`;
    if (!cheia) o += `<path d="M110 6A94 94 0 0 1 110 194A60 94 0 0 0 110 6Z" fill="#191B21"/>`;
    [[70, 58, 14], [150, 150, 11], [66, 140, 9], [140, 46, 7]].forEach(([x, y, r]) => { o += `<circle cx="${x}" cy="${y}" r="${r}" fill="#00000030"/>`; });
    LA_GARRAS.forEach((d, i) => { o += `<path d="${d}" fill="${i < v ? (solta ? '#F2B48E' : this.cor) : '#ffffff1a'}" stroke="#0E1014" stroke-width="1"/>`; });
    o += `</g>`;
    const p = LA_patamar(v);
    if (s.dia) o += KIT.texto(110, 214, 'Dia: dorme', {tam:14, peso:800, cor:'#9FA6B4'});
    else if (p[1]) o += KIT.texto(110, 214, p[1], {tam:15, peso:800, cor:solta || p[0] === 20 ? LA_LARANJA : this.cor});
    if (s.vampiro) o += KIT.icone('vampiro', 18, 16, 26, '#E5677B') + KIT.texto(34, 21, 'teto 6', {ancora:'start', tam:11.5, peso:700, cor:'#E5677B'});
    return o;
  },
  linha(s, ctx){
    if (s.dia) return `<b>Dia</b> <em>· a barra dorme: só valem as habilidades “De dia também”.</em>`;
    const v = ctx.v, p = LA_patamar(v)[0];
    if (s.solta) return `<b style="color:${LA_LARANJA}">Fera Solta</b> <em>· o mestre conduz até o fim do combate ou até ele comer${s.soltaFim ? ' (lua cheia: até o fim do próximo turno dele)' : ''}.</em>`;
    if (p === 15 || p === 20) return `<b>Fera</b> <em>· Transformado: FOR e AGI +2, DEF F +2; −4 para itens, conjurar, falar e fechaduras.</em>`;
    if (p === 10) return `<b>Garras</b> <em>· garras e mordida são armas de corte, com FOR ou AGI.</em>`;
    if (p === 5) return `<b>Desperto</b> <em>· faro e vê no escuro. Garras em 10.</em>`;
    return `<em>Só à noite. ${s.ceu ? LA_CEUS[s.ceu][0] + '.' : 'Escolha a lua no começo da luta.'} Desperto em 5.</em>`;
  },
  acoes(s){
    let h = `<select data-a="ceu" aria-label="Começo da luta"><option value="">Começo da luta…</option>${Object.entries(LA_CEUS).map(([k, [n, x]]) => `<option value="${k}">${n}: ${x}</option>`).join('')}<option value="dia">Dia: a barra dorme</option></select>`;
    h += `<select data-a="hab" aria-label="Habilidade com ±N"><option value="">Habilidade ±N…</option><optgroup label="Enche na hora (fora do teto)">${[1,2,3,4].map(n => `<option value="${n}">+${n}</option>`).join('')}</optgroup><optgroup label="Baixa">${[2,3,5,7].map(n => `<option value="-${n}">−${n}</option>`).join('')}</optgroup></select>`;
    h += `<button type="button" class="gasta" data-a="comer" title="Gasta a ação, num inimigo derrotado ou corpo adjacente (nunca existência absoluta nem jogador, salvo se o mestre disser que não há escolha). Recupera 10% do HP máximo.">▼ Comer (−5)</button>`;
    h += `<button type="button" data-a="vamp" aria-pressed="${s.vampiro}" title="Um vampiro a até 6 cédulas: o teto da rodada vira 6">Vampiro</button>`;
    if (s.solta) h += `<button type="button" data-a="segurar" title="Segurar a Fera: passou no teste de CAN ou VIT, a barra fica em 17">Segurei (17)</button>`;
    return h;
  },
  acao(s, a, ctx, val){
    if (a === 'ceu' && val){
      if (val === 'dia'){ s.dia = true; s.ceu = ''; ctx.log(`É dia: a Barra Bestial de ${ctx.nome} dorme.`); return; }
      s.dia = false; s.ceu = val; ctx.definir(LA_CEUS[val][1], val === 'cheia' ? 'lua cheia' : 'outra fase, o mestre diz');
    }
    if (a === 'hab' && val){ const n = +val;
      if (s.dia) return ctx.aviso('De dia a barra dorme.');
      if (n > 0) ctx.ganhar(n, 'habilidade', {foraTeto:true}); else ctx.perder(-n, 'habilidade'); }
    if (a === 'comer'){ if (s.dia) return ctx.aviso('De dia a barra dorme.'); ctx.perder(5, 'comeu'); ctx.log(`${ctx.nome} comeu e recupera 10% do HP máximo.`); }
    if (a === 'vamp'){ s.vampiro = !s.vampiro; ctx.log(s.vampiro ? `${ctx.nome} sente um vampiro a até 6 cédulas: teto 6.` : `Nenhum vampiro perto de ${ctx.nome}.`); }
    if (a === 'segurar' && s.solta){ s.solta = false; ctx.definir(17, 'segurou a Fera'); }
  },
  aoMudar(s, ctx, antes){
    const p0 = LA_patamar(antes)[0], p1 = LA_patamar(ctx.v)[0];
    if (ctx.v < 20 && s.solta){ s.solta = false; s.soltaFim = 0; ctx.log(`${ctx.nome} volta ao controle.`); }
    if (p1 === p0) return;
    if (p1 === 20){ s.solta = true; s.soltaFim = s.ceu === 'cheia' ? (s.noTurno ? 2 : 1) : 0;
      return ctx.log(`${ctx.nome} é Fera Solta: o mestre conduz ${s.soltaFim ? 'até o fim do próximo turno dele (lua cheia)' : 'até o fim do combate ou até ele comer'}.`); }
    if (p1 > p0) ctx.log(`${ctx.nome}: ${LA_patamar(ctx.v)[1]}${p1 === 15 ? ' (Transformado)' : ''}.`);
    else if (ctx.v > 0) ctx.log(`${ctx.nome} baixa para ${LA_patamar(ctx.v)[1] || 'menos de 5'}.`);
  },
  aoComecarTurno(s){ s.noTurno = true; },
  aoTerminarTurno(s, ctx){
    s.noTurno = false;
    if (s.solta && s.soltaFim){ s.soltaFim--; if (!s.soltaFim){ s.solta = false; ctx.log(`A Fera Solta de ${ctx.nome} passou (lua cheia): ele volta ao controle.`); } }
  }
});

/* ===== racas-b.js ===== */
/* =====================================================================
   LOTE B: humanos (Ayto, Espenas, Natuphas, Sarep, Vas), Silk
   e os três anões (Forja, Rocha, Mercador).
   Todas: começam no valor da Origem, teto 5 por rodada (2 por ação)
   e voltam ao início no fim do combate.
   ===================================================================== */

const LB_RISCO = '#F08A55';
const LB_LINHA = '#C9C3B5';

// "Nesta rodada: +2 de 5" para as barras que enchem por botão ou pela face (sem pílulas)
function LB_rodada(ctx){
  const b = ctx.b, t = tetoDe(b);
  return `<em>Nesta rodada: +${b.ganhoRodada} de ${t} · até 2 por ação</em>`;
}
const LB_pts = ps => ps.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L');

// engrenagem do ícone do Espenas (8 dentes), calculada uma vez
function LB_iconeEngrenagem(){
  const c = 12, pts = [];
  for (let i = 0; i < 8; i++){
    const a = i * 45;
    [[a - 13, 7.4], [a - 8, 10.4], [a + 8, 10.4], [a + 13, 7.4]].forEach(([g, r]) => pts.push(P(c, c, r, g)));
  }
  return `<path d="M${LB_pts(pts)}Z"/><circle cx="12" cy="12" r="2.8"/>`;
}

// ---------------- Humano Ayto: Força das Sombras ----------------
const LB_CAPUZ = 'M110 6 C136 20 170 46 173 96 C175 128 168 150 186 172 C196 184 206 196 208 212 H12 C14 196 24 184 34 172 C52 150 45 128 47 96 C50 46 84 20 110 6 Z';
const LB_ROSTO = 'M110 52 C131 64 145 84 145 108 C145 134 131 152 110 158 C89 152 75 134 75 108 C75 84 89 64 110 52 Z';

barra({id:'humano-ayto', cat:'raca', arvore:'Humano Ayto', barra:'Força das Sombras', cor:'#C9B6E4',
  inicio:5, teto:5, porAcao:2, fim:'inicio', demo:11,
  icone:'<path d="M12 2.2C14.8 3.8 18.2 6.6 18.4 11.4C18.6 14.4 19.2 16.8 21 18.8V21H3V18.8C4.8 16.8 5.4 14.4 5.6 11.4C5.8 6.6 9.2 3.8 12 2.2Z"/><path d="M12 7C13.9 8.2 15.2 10 15.2 12.4C15.2 14.8 13.8 16.4 12 17C10.2 16.4 8.8 14.8 8.8 12.4C8.8 10 10.1 8.2 12 7Z"/>',
  estado:()=>({luz:false}),
  ganhos:[
    {id:'furtivo', c:'Furtivo acertou', t:'Acertou um ataque furtivo: contra quem não o vê (Oculto ou Invisível para o alvo, ou o alvo Cego)', v:2, quando:'agora'},
    {id:'cond', c:'Deixei condição', t:'Deixou um inimigo com uma condição negativa', v:1, quando:'agora'},
    {id:'oculto', c:'Comecei Oculto', t:'Começou o turno Oculto', v:1, quando:'inicio', tipo:'tg'},
    {id:'luz', c:'Luz forte', t:'Luz forte (sol direto, magia de luz, fogo grande a até 2 cédulas) tira 2 no começo do turno. Com o nó Olhos Fundos, desmarque ou ajuste.', v:-2, quando:'inicio', tipo:'tg'}],
  face(s, v){
    let o = KIT.encher('humano-ayto', LB_CAPUZ, v/20, this.cor, {base:212, topo:6, fundo:'#1E1B24', contorno:'#D9D0E6'});
    // dobra da borda do capuz e a abertura do manto
    o += `<path d="M110 158 V212" stroke="#0E1014" stroke-opacity=".45" stroke-width="3"/>`;
    o += `<path d="${LB_ROSTO}" fill="none" stroke="#0E1014" stroke-opacity=".55" stroke-width="12"/>`;
    o += `<path d="${LB_ROSTO}" fill="#08090C" stroke="#4A4458" stroke-width="1.5"/>`;
    if (s.luz){
      // sol no canto, raios batendo no capuz, e o aviso no lugar do rosto
      for (let a = 0; a < 360; a += 45){ const [x1,y1] = P(22,22,14,a), [x2,y2] = P(22,22,20,a);
        o += `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="#F2D27A" stroke-width="2.4" stroke-linecap="round"/>`; }
      o += `<circle cx="22" cy="22" r="10" fill="#F2D27A"/>`;
      [[40,40,62,62],[44,32,74,46],[32,44,46,74]].forEach(([x1,y1,x2,y2]) => { o += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#F2D27A" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="6 5"/>`; });
      o += KIT.texto(110, 112, 'Luz forte', {tam:13, peso:800, cor:LB_RISCO});
    }
    return o;
  },
  linha(s){
    if (s.luz) return `<b style="color:${LB_RISCO}">Luz forte</b> <em>· tira 2 no começo do turno e desliga as passivas desta árvore (a ficha fica).</em>`;
    return `<em>Furtivo: contra quem não o vê (Oculto ou Invisível para o alvo, ou alvo Cego). Pele cinza: −4 no social.</em>`;
  },
  acoes(s){ return `<button type="button" data-a="luz" aria-pressed="${s.luz}" title="Sol direto, magia de luz ou fogo grande a até 2 cédulas">Estou sob luz forte</button>`; },
  acao(s, a, ctx){
    if (a !== 'luz') return;
    s.luz = !s.luz; ctx.marcar('luz', s.luz ? 1 : 0);
    ctx.log(s.luz ? `${ctx.nome} está sob luz forte: −2 no começo do turno e passivas desligadas.` : `${ctx.nome} saiu da luz forte.`);
  },
  aoComecarTurno(s, ctx){ if (s.luz) ctx.marcar('luz', 1); }
});

// ---------------- Humano Espenas: Engenho ----------------
const LB_TIPOS = [['golpe','Golpe','golpe'], ['classe','Classe','habilidade de classe'], ['manobra','Manobra','manobra'], ['item','Item','item'],
                  ['raca','Raça','habilidade de raça'], ['reacao','Reação','reação'], ['ajudar','Ajudar','ajudar um aliado']];
const LB_tipo = k => LB_TIPOS.find(t => t[0] === k);

barra({id:'espenas', cat:'raca', arvore:'Humano Espenas', barra:'Engenho', cor:'#D2C6A5',
  inicio:6, teto:5, porAcao:2, fim:'inicio', demo:9,
  icone: LB_iconeEngrenagem(),
  estado:()=>({ultimo:null}),
  face(s, v){
    const cx = 110, cy = 112;
    let o = `<circle cx="${cx}" cy="${cy}" r="107" fill="#0E1014"/>`;
    // 20 dentes: cada dente aceso é 1 de Engenho, a partir do alto
    for (let i = 0; i < 20; i++){
      const a = i * 18 + 9, on = i < v;
      o += `<path d="M${LB_pts([P(cx,cy,80,a-6.6), P(cx,cy,104,a-4.2), P(cx,cy,104,a+4.2), P(cx,cy,80,a+6.6)])}Z" fill="${on ? this.cor : '#ffffff17'}"/>`;
    }
    o += `<circle cx="${cx}" cy="${cy}" r="84" fill="#2A2E37" stroke="${LB_LINHA}" stroke-width="1.6"/>`;
    // marca a cada 5 dentes
    [0, 90, 180, 270].forEach(a => { const [x1,y1] = P(cx,cy,70,a), [x2,y2] = P(cx,cy,84,a);
      o += `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="#E8E4DA" stroke-width="2.4"/>`; });
    // miolo: 7 vãos entre os raios, um por tipo de ação
    o += `<circle cx="${cx}" cy="${cy}" r="68" fill="#4A505C"/>`;
    LB_TIPOS.forEach(([k, rot], i) => {
      const c = i * 360 / 7, at = s.ultimo === k, [x, y] = P(cx, cy, 45, c);
      o += KIT.botao(k, `Agi com: ${LB_tipo(k)[2]}`,
        `<path d="${setor(cx, cy, 21, 66, c - 21.4, c + 21.4)}" fill="${at ? this.cor : '#191C22'}" stroke="${at ? '#FFFFFF' : 'none'}" stroke-width="1.5"/>` +
        KIT.texto(x, y + 4, rot, {tam:11.5, peso:at ? 800 : 700, cor:at ? '#16191F' : '#DCD6C8', extra:'pointer-events="none"'}));
    });
    o += `<circle cx="${cx}" cy="${cy}" r="19" fill="#5A606C" stroke="${LB_LINHA}" stroke-width="1.6"/><circle cx="${cx}" cy="${cy}" r="5" fill="#0E1014"/>`;
    return o;
  },
  dica(s, k){
    const t = LB_tipo(k);
    if (s.ultimo === k) return `<b>${t[1]}</b> <em>· foi a última ação: repetir não rende</em>`;
    return `<b>${t[1]}</b> <em>· tipo novo: rende +1 de Engenho${k === 'raca' ? ' (as habilidades desta árvore contam aqui)' : ''}</em>`;
  },
  linha(s, ctx){
    const topo = s.ultimo ? `<b>Última: ${LB_tipo(s.ultimo)[1]}</b> <em>· toque no tipo de cada ação; tipo novo rende +1.</em>`
                          : `<em>Toque no tipo de cada ação. A primeira do combate rende +1.</em>`;
    return `${topo}<br>${LB_rodada(ctx)}`;
  },
  clique(s, k, ctx){
    const t = LB_tipo(k); if (!t) return;
    if (s.ultimo === k){ ctx.log(`${ctx.nome}: ${t[2]} de novo, sem Engenho.`); return ctx.aviso(`${t[1]} de novo: repetir o tipo não rende.`); }
    const antes = s.ultimo && LB_tipo(s.ultimo); s.ultimo = k;
    ctx.ganhar(1, antes ? `${t[2]} depois de ${antes[2]}` : `${t[2]}, primeira ação do combate`);
  }
});

// ---------------- Humano Natuphas: Gelo Firme ----------------
barra({id:'humano-natuphas', cat:'raca', arvore:'Humano Natuphas', barra:'Gelo Firme', cor:'#9DD0F0',
  inicio:6, teto:5, porAcao:2, fim:'inicio', demo:13,
  icone:'<path d="M3.5 8.5L8 4H20.5V15.5L16 20H3.5Z"/><path d="M3.5 8.5H16V20M16 8.5L20.5 4"/><path d="M6.6 8.5L8.6 11.4L7.6 13.4L10.4 16.4"/>',
  ganhos:[
    {id:'proteger', c:'Protegi aliado', t:'Protegeu um aliado: recebeu o golpe no lugar dele, deu defesa ou Escudado', v:1, quando:'agora'},
    {id:'defesa', c:'Defesa deu certo', t:'Defendeu-se com sucesso: aparou, bloqueou ou acertou uma reação de defesa', v:1, quando:'agora'},
    {id:'pesado', c:'Golpe de 20%+', t:'Sofreu um golpe que tirou 20% ou mais do HP máximo dele', v:1, quando:'agora'}],
  face(s, v){
    const X = 22, Y = 82, L = 126, DX = 48, DY = -44, k = v / 20;
    let o = `<ellipse cx="116" cy="212" rx="98" ry="6" fill="#0E1014"/>`;
    const topo = `M${X} ${Y} L${X+L} ${Y} L${X+L+DX} ${Y+DY} L${X+DX} ${Y+DY} Z`;
    const lado = `M${X+L} ${Y} L${X+L+DX} ${Y+DY} L${X+L+DX} ${Y+DY+L} L${X+L} ${Y+L} Z`;
    o += `<path d="${topo}" fill="#2B4252"/><path d="${topo}" fill="${this.cor}" opacity="${(k * .45).toFixed(2)}"/>`;
    o += `<path d="${lado}" fill="#17232D"/><path d="${lado}" fill="${this.cor}" opacity="${(k * .3).toFixed(2)}"/>`;
    o += `<path d="${topo}" fill="none" stroke="#D8E4EE" stroke-width="2" stroke-linejoin="round"/><path d="${lado}" fill="none" stroke="#D8E4EE" stroke-width="2" stroke-linejoin="round"/>`;
    // rachadura no lado e brilho no topo
    o += `<path d="M${X+L+26} ${Y+DY+26} L${X+L+17} ${Y+DY+58} L${X+L+31} ${Y+DY+82} L${X+L+21} ${Y+DY+116}" fill="none" stroke="#E8F4FB" stroke-opacity=".6" stroke-width="1.8" stroke-linejoin="round"/>`;
    o += `<path d="M${X+30} ${Y-8} L${X+70} ${Y-8} M${X+52} ${Y-22} L${X+104} ${Y-22}" stroke="#E8F4FB" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>`;
    // frente: 20 blocos de gelo, de baixo para cima, 5 por fileira
    o += `<rect x="${X}" y="${Y}" width="${L}" height="${L}" fill="#111820" stroke="#D8E4EE" stroke-width="2.5"/>`;
    const pad = 6, gap = 4, cw = (L - 2*pad - 4*gap) / 5, ch = (L - 2*pad - 3*gap) / 4;
    for (let i = 0; i < 20; i++){
      const col = i % 5, row = Math.floor(i / 5), x = X + pad + col * (cw + gap), y = Y + L - pad - (row + 1) * ch - row * gap, on = i < v;
      o += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(cw)}" height="${f1(ch)}" rx="2" fill="${on ? this.cor : '#ffffff10'}" stroke="${on ? '#E8F4FB' : '#ffffff1f'}" stroke-width="1"/>`;
      if (on) o += `<path d="M${f1(x+3.5)} ${f1(y+ch-6)} V${f1(y+3.5)} H${f1(x+cw-6)}" fill="none" stroke="#FFFFFF" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/>`;
    }
    return o;
  },
  linha(){ return `<em>Proteger: receber o golpe no lugar, dar defesa ou Escudado. Reduções de dano desta árvore: vale a maior.</em>`; }
});

// ---------------- Humano Sarep: Ressonância ----------------
const LB_DIAPASAO = 'M64 20 H84 V128 A26 26 0 0 0 136 128 V20 H156 V128 A46 46 0 0 1 118 173.3 V198 L126 212 H94 L102 198 V173.3 A46 46 0 0 1 64 128 Z';
const LB_SAREP_AC = {ga:['golpe', true], ge:['golpe', false], ma:['magia', true], me:['magia', false]};

barra({id:'sarep', cat:'raca', arvore:'Humano Sarep', barra:'Ressonância', cor:'#EE8E84',
  inicio:5, teto:5, porAcao:2, fim:'inicio', demo:12,
  icone:'<path d="M8 2.8V10A4 4 0 0 0 16 10V2.8"/><path d="M12 14V21.2"/><path d="M4.8 4.4Q3.4 7 4.8 9.6M19.2 4.4Q20.6 7 19.2 9.6"/>',
  estado:()=>({ult:null, mudo:false}),
  face(s, v){
    let o = KIT.encher('sarep', LB_DIAPASAO, v/20, s.mudo ? '#8A6A66' : this.cor, {base:212, topo:20, fundo:'#1E2128'});
    // o lado da última ação vibra (sólido se acertou, tracejado se errou)
    if (s.ult && !s.mudo){
      const esq = s.ult.tipo === 'golpe', sx = esq ? -1 : 1, x0 = esq ? 56 : 164;
      [0, 12, 24].forEach((d, i) => { const x = x0 + sx * d;
        o += `<path d="M${x} ${34 + i*4} Q${x + sx*10} 74 ${x} ${114 - i*4}" fill="none" stroke="${this.cor}" stroke-width="3" stroke-linecap="round" ${s.ult.ac ? '' : 'stroke-dasharray="4 5"'} opacity="${1 - i*.25}"/>`; });
    }
    const rot = (x, t, tipo) => { const at = s.ult && s.ult.tipo === tipo;
      return KIT.texto(x, 172, t, {tam:13, peso:800, cor:at ? this.cor : '#9FA6B4'}) + (at ? KIT.texto(x, 189, s.ult.ac ? 'acertou' : 'errou', {tam:11, peso:600, cor:'#C9C3B5'}) : ''); };
    o += rot(32, 'Golpe', 'golpe') + rot(188, 'Magia', 'magia');
    if (s.mudo) o += `<path d="M30 30 L190 200" stroke="${LB_RISCO}" stroke-width="4" stroke-linecap="round"/>`;
    return o;
  },
  linha(s, ctx){
    if (s.mudo) return `<b style="color:${LB_RISCO}">Desarmado ou Silenciado</b> <em>· não ganha Ressonância e as habilidades da árvore custam 2 a mais.</em>`;
    if (!s.ult) return `<em>Alterne golpe e magia desta árvore: +1, ou +2 se as duas acertarem.</em><br>${LB_rodada(ctx)}`;
    const outro = s.ult.tipo === 'golpe' ? 'magia' : 'golpe';
    return `<b>Último: ${s.ult.tipo} (${s.ult.ac ? 'acertou' : 'errou'})</b> <em>· agora ${outro} rende +1${s.ult.ac ? ', +2 se acertar' : ''}.</em><br>${LB_rodada(ctx)}`;
  },
  acoes(s){
    return `<button type="button" data-a="ga">Golpe acertou</button><button type="button" data-a="ge">Golpe errou</button>
      <button type="button" data-a="ma" title="Magia acerta quando o alvo falha no teste; sem teste, sempre acerta">Magia acertou</button><button type="button" data-a="me">Magia errou</button>
      <button type="button" data-a="outra" title="Outra ação no meio quebra a alternância">Outra ação</button><button type="button" data-a="mudo" aria-pressed="${s.mudo}">Desarmado ou Silenciado</button>`;
  },
  acao(s, a, ctx){
    if (a === 'mudo'){ s.mudo = !s.mudo; return ctx.log(s.mudo ? `${ctx.nome} está Desarmado ou Silenciado: sem Ressonância, habilidades custam 2 a mais.` : `${ctx.nome} voltou a ter arma e voz.`); }
    if (a === 'outra'){ if (s.ult) ctx.log(`${ctx.nome} fez outra ação: a alternância quebrou.`); s.ult = null; return; }
    const par = LB_SAREP_AC[a]; if (!par) return;
    const [tipo, ac] = par, ant = s.ult, txt = `${tipo} ${ac ? 'que acertou' : 'que errou'}`;
    s.ult = {tipo, ac};
    if (s.mudo){ ctx.log(`${ctx.nome}: ${txt}, sem Ressonância (Desarmado ou Silenciado).`); return ctx.aviso('Desarmado ou Silenciado: não ganha Ressonância.'); }
    if (!ant) return ctx.log(`${ctx.nome}: ${txt}. A próxima ação pode alternar.`);
    if (ant.tipo === tipo){ ctx.log(`${ctx.nome}: ${tipo} de novo, sem Ressonância.`); return ctx.aviso('Repetir o tipo não rende.'); }
    const n = ant.ac && ac ? 2 : 1;
    ctx.ganhar(n, `${tipo} depois de ${ant.tipo}${n === 2 ? ', as duas acertaram' : ''}`);
  }
});

// ---------------- Humano Vas: Brasa ----------------
// pilha de 20 brasas: fileiras de 6, 5, 4, 3 e 2, de baixo para cima
const LB_BRASAS = (() => {
  const out = []; let i = 0;
  [6, 5, 4, 3, 2].forEach((n, r) => { for (let k = 0; k < n; k++){ out.push([110 + (k - (n - 1) / 2) * 34, 190 - r * 28, i++]); } });
  return out;
})();
function LB_pedra(cx, cy, i){
  const pts = [];
  for (let k = 0; k < 9; k++){ const a = k * 40 + (i * 13) % 20, j = 1 + .13 * Math.sin(i * 1.9 + k * 2.4);
    const [x, y] = P(cx, cy, 15.5 * j, a); pts.push([x, cy + (y - cy) * .86]); }
  return 'M' + LB_pts(pts) + 'Z';
}

barra({id:'humano-vas', cat:'raca', arvore:'Humano Vas', barra:'Brasa', cor:'#FF6E42',
  inicio:5, teto:5, porAcao:2, fim:'inicio', demo:9,
  icone:'<path d="M2.8 19.5L4.2 12.6L8.4 8.6L14.6 8L19.6 11.4L21.2 19.5Z"/><path d="M8.4 8.6L10.6 13.2L8.2 19.4M10.6 13.2L15.6 14.4L17 19.4"/><circle cx="13" cy="4.2" r="1.2" fill="currentColor" stroke="none"/><circle cx="17.6" cy="5.2" r="1" fill="currentColor" stroke="none"/>',
  estado:()=>({recuo:0}),
  ganhos:[
    {id:'dano', c:'Golpe com dano', t:'Causou dano com um golpe', v:1, quando:'agora'},
    {id:'sofri', c:'Sofri dano', t:'Sofreu dano', v:1, quando:'agora'},
    {id:'parado', c:'Turno sem luta', t:'A Brasa esfria: terminou o turno sem atacar e sem ser atacado (perde 3)', v:-3, quando:'fim', tipo:'tg'}],
  face(s, v){
    let o = `<ellipse cx="110" cy="207" rx="104" ry="8" fill="#0E1014"/>`;
    LB_BRASAS.forEach(([x, y, i]) => { if (i < v) o += `<circle cx="${f1(x)}" cy="${f1(y)}" r="22" fill="${this.cor}" opacity=".13"/>`; });
    LB_BRASAS.forEach(([x, y, i]) => {
      const on = i < v, d = LB_pedra(x, y, i);
      o += `<path d="${d}" fill="${on ? '#7A2612' : '#2E3138'}" stroke="${on ? this.cor : '#4A4F5A'}" stroke-width="2" stroke-linejoin="round"/>`;
      const a = 60 + (i * 37) % 70, q = [P(x, y, 12, a), P(x, y, 5, a + 62), P(x, y, 4, a + 205), P(x, y, 12, a + 180)], r = P(x, y, 11, a + 112);
      const rach = `M${LB_pts(q)}M${f1(q[1][0])} ${f1(q[1][1])}L${f1(r[0])} ${f1(r[1])}`;
      if (on) o += `<path d="${rach}" fill="none" stroke="${this.cor}" stroke-width="5" stroke-opacity=".55" stroke-linecap="round" stroke-linejoin="round"/>`;
      o += `<path d="${rach}" fill="none" stroke="${on ? '#FFE08A' : '#1A1C21'}" stroke-width="${on ? 2.2 : 1.6}" stroke-linecap="round" stroke-linejoin="round"/>`;
    });
    if (s.recuo){
      o += `<path d="M24 60 L196 206" stroke="${LB_RISCO}" stroke-width="4" stroke-linecap="round"/>`;
      o += KIT.texto(110, 40, '−4 em tudo', {tam:16, peso:800, cor:LB_RISCO});
    }
    return o;
  },
  linha(s){
    if (s.recuo) return `<b style="color:${LB_RISCO}">Recuou</b> <em>· −4 em tudo até o fim do ${s.recuo > 1 ? 'próximo turno' : 'turno'}. A Brasa enche de novo normalmente.</em>`;
    return `<em>A Brasa esfria: turno sem atacar e sem ser atacado tira 3. Recuar ou fugir zera tudo.</em>`;
  },
  acoes(){ return `<button type="button" class="gasta" data-a="recuo" title="Se afastar de um inimigo adjacente por vontade própria, ou fugir">▼ Recuei ou fugi (zera)</button>`; },
  acao(s, a, ctx){
    if (a !== 'recuo') return;
    const antes = ctx.v; ctx.v = 0; s.recuo = 2;
    ctx.log(`${ctx.nome} recuou: Brasa ${antes} → 0 e −4 em tudo até o fim do próximo turno.`);
  },
  aoTerminarTurno(s, ctx){ if (s.recuo){ s.recuo--; if (!s.recuo) ctx.log(`Acabou o −4 do recuo de ${ctx.nome}.`); } }
});

// ---------------- Silk: Trama ----------------
barra({id:'silk', cat:'raca', arvore:'Silk', barra:'Trama', cor:'#8F8CFA',
  inicio:6, teto:5, porAcao:2, fim:'inicio', demo:13,
  icone:'<path d="M12 2.5L21.5 12L12 21.5L2.5 12Z"/><path d="M8.8 5.7L18.3 15.2M5.7 8.8L15.2 18.3"/><path d="M5.7 15.2L15.2 5.7M8.8 18.3L18.3 8.8"/>',
  ganhos:[
    {id:'conjurar', c:'Conjurei magia', t:'Conjurou uma magia (habilidade de canalização, de classe ou de raça)', v:1, quando:'agora'},
    {id:'resisti', c:'Resisti ou anulei', t:'Resistiu a uma magia inimiga ou a anulou', v:1, quando:'agora'},
    {id:'rebote', c:'Sofri rebote', t:'Sofreu um rebote (o preço que volta depois do efeito)', v:1, quando:'agora'}],
  face(s, v){
    // losango tramado: 10 fios num sentido (1 a 10) e 10 no outro (11 a 20)
    const Lx = 12, Ly = 112, A = 98, n = 10, g = .017;
    const pt = (u, w) => [Lx + A*u + A*w, Ly - A*u + A*w];
    const quad = (u0, u1, w0, w1) => 'M' + LB_pts([pt(u0,w0), pt(u1,w0), pt(u1,w1), pt(u0,w1)]) + 'Z';
    const seg = (u0, w0, u1, w1) => { const [a, b] = pt(u0, w0), [c, d] = pt(u1, w1); return `M${f1(a)} ${f1(b)}L${f1(c)} ${f1(d)}`; };
    const cA = i => i < v ? this.cor : '#2D3140', cB = j => 10 + j < v ? this.cor : '#2D3140';
    let o = `<path d="M${Lx} ${Ly} L${Lx+A} ${Ly-A} L${Lx+2*A} ${Ly} L${Lx+A} ${Ly+A} Z" fill="#0E1014" stroke="#5A5F6E" stroke-width="2" stroke-linejoin="round"/>`;
    for (let i = 0; i < n; i++) o += `<path d="${quad(i/n+g, (i+1)/n-g, .006, .994)}" fill="${cA(i)}"/>`;
    for (let j = 0; j < n; j++) o += `<path d="${quad(.006, .994, j/n+g, (j+1)/n-g)}" fill="${cB(j)}"/>`;
    let sombra = '';
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++){
      const u0 = i/n+g, u1 = (i+1)/n-g, w0 = j/n+g, w1 = (j+1)/n-g;
      if ((i + j) % 2 === 0){ o += `<path d="${quad(u0, u1, w0 - .004, w1 + .004)}" fill="${cA(i)}"/>`; sombra += seg(u0, w0, u0, w1) + seg(u1, w0, u1, w1); }
      else sombra += seg(u0, w0, u1, w0) + seg(u0, w1, u1, w1);
    }
    o += `<path d="${sombra}" stroke="#0E1014" stroke-opacity=".7" stroke-width="1.4" fill="none"/>`;
    // marcas de 5 na borda: onde começam os fios 6 e 16
    [pt(.5, -.035), pt(-.035, .5)].forEach(([x, y]) => { o += `<circle cx="${f1(x)}" cy="${f1(y)}" r="3" fill="#E8E4DA"/>`; });
    return o;
  },
  linha(){ return `<em>Rebote: o preço que volta depois do efeito. O dano vai direto no HP; sem SP, 5 de SP vira 10% do HP.</em>`; }
});

// ---------------- Anão da Forja: Calor da Forja ----------------
const LB_BIGORNA = 'M10 64 C28 52 44 50 62 50 H204 V88 H174 C158 94 150 106 150 124 V160 C160 172 176 178 190 182 V208 H30 V182 C44 178 60 172 70 160 V124 C70 106 62 94 46 88 C30 82 18 74 10 64 Z';
const LB_FAISCAS = [[104,40,96,24],[118,38,122,18],[132,40,146,26],[90,44,74,34],[146,44,164,38]];
const LB_alheio = s => s.alheio ? 'Equipamento que não fez: golpes e defesas não rendem.' : false;

barra({id:'forja', cat:'raca', arvore:'Anão da Forja', barra:'Calor da Forja', cor:'#FFA94D',
  inicio:5, teto:5, porAcao:2, fim:'inicio', demo:12, persiste:['alheio'],
  icone:'<path d="M2.5 8.5H18.5L21.5 10V12H17.4C16 12.4 15.3 13.4 15.3 14.8V16.4L18 19.2H6L8.7 16.4V14.8C8.7 13.4 7.9 12.4 6.4 12C4.4 11.4 3 10.2 2.5 8.5Z"/><path d="M11 5.4L10.2 3.4M14 5.4L15 3.2"/>',
  estado:()=>({alheio:false}),
  ganhos:[
    {id:'golpe', c:'Golpe com arma minha', t:'Acertou um golpe com arma própria (que ele forjou)', v:1, quando:'agora', bloq:LB_alheio},
    {id:'bloqueio', c:'Bloqueio ou aparada', t:'Bloqueou ou aparou com escudo ou armadura próprios', v:1, quando:'agora', bloq:LB_alheio},
    {id:'conserto', c:'Consertei ou aprimorei', t:'Consertou ou aprimorou um equipamento no meio da luta com uma habilidade desta árvore (gasta a ação)', v:2, quando:'agora'}],
  face(s, v){
    let o = '';
    LB_FAISCAS.slice(0, v ? 1 + Math.floor(v / 5) : 0).forEach(([x1,y1,x2,y2]) => { o += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${this.cor}" stroke-width="3" stroke-linecap="round"/>`; });
    o += KIT.encher('forja', LB_BIGORNA, v/20, this.cor, {base:208, topo:50, fundo:'#1E2128'});
    o += `<path d="M62 50 H204" stroke="#E8E4DA" stroke-width="3" stroke-linecap="round"/>`;
    if (s.alheio) o += `<path d="M28 44 L192 204" stroke="${LB_RISCO}" stroke-width="4" stroke-linecap="round"/>`;
    return o;
  },
  linha(s){
    if (s.alheio) return `<b style="color:${LB_RISCO}">Equipamento que não fez</b> <em>· golpes e defesas não rendem Calor, e a Assinatura não vale.</em>`;
    return `<em>Próprio é o que ele forjou (marque na ficha). Consertar ou aprimorar gasta a ação.</em>`;
  },
  acoes(s){ return `<button type="button" data-a="alheio" aria-pressed="${s.alheio}" title="Arma ou armadura que não fez, ou improvisada">Equipamento que não fiz</button>`; },
  acao(s, a, ctx){
    if (a !== 'alheio') return;
    s.alheio = !s.alheio;
    ctx.log(s.alheio ? `${ctx.nome} luta com equipamento que não fez: sem Calor de golpes e defesas.` : `${ctx.nome} voltou ao equipamento que forjou.`);
  }
});

// ---------------- Anão da Rocha: Veio ----------------
const LB_MONTANHA = 'M4 210 L70 74 L92 104 L122 26 L216 210 Z';
const LB_VEIO = 'M100 210 L86 172 L110 134 L94 98 L113 58 L117 46 L128 46 L134 58 L117 98 L132 134 L108 172 L122 210 Z';
const LB_TERRENO = {comum:'Terreno comum', pedra:'Chão de pedra', aberto:'Campo aberto'};
function LB_veioBonus(s, ctx){
  const primeiro = !s.primeiro; s.primeiro = true;
  if (primeiro && s.terreno === 'pedra') ctx.ganhar(1, 'chão de pedra, primeiro ganho da rodada');
}

barra({id:'rocha', cat:'raca', arvore:'Anão da Rocha', barra:'Veio', cor:'#C7A68A',
  inicio:5, teto:5, porAcao:2, fim:'inicio', demo:11,
  icone:'<path d="M2.5 20L9 8L12 12.5L15 4.5L21.5 20Z"/><path d="M13.8 20L12.4 16.4L14.8 13.4L13.8 9.8"/>',
  estado:()=>({terreno:'comum', primeiro:false}),
  ganhos:[
    {id:'resisti', c:'Resisti (empurrão…)', t:'Resistiu a um empurrão, derrubada ou prisão (empurrão se resiste com Vigor)', v:1, quando:'agora', ao:LB_veioBonus},
    {id:'parado', c:'Golpe sem sair', t:'Acertou um golpe sem ter saído da cédula no turno', v:1, quando:'agora', ao:LB_veioBonus},
    {id:'pedra', c:'Habilidade de Pedra', t:'Usou uma habilidade do ramo Pedra', v:1, quando:'agora', ao:LB_veioBonus},
    {id:'empurrado', c:'Fui empurrado', t:'Foi empurrado, puxado ou arrastado', v:-2, quando:'agora'}],
  face(s, v){
    let o = `<path d="${LB_MONTANHA}" fill="#2A2D35" stroke="#8E8A80" stroke-width="2.5" stroke-linejoin="round"/>`;
    // camadas da rocha
    o += `<path d="M40 150 L76 142 M150 160 L196 170 M30 182 L64 176 M150 120 L176 128 M60 112 L80 108" stroke="#0E1014" stroke-opacity=".55" stroke-width="2.5" stroke-linecap="round"/>`;
    o += KIT.encher('rocha', LB_VEIO, v/20, this.cor, {base:210, topo:46, fundo:'#14161B', contorno:'#E8E4DA', traco:1.8});
    if (s.terreno === 'pedra'){
      o += KIT.texto(6, 24, 'Chão de pedra', {ancora:'start', tam:12, peso:800, cor:this.cor});
      o += KIT.texto(6, 40, s.primeiro ? '1º ganho: usado' : '1º ganho +1', {ancora:'start', tam:11, peso:600, cor:s.primeiro ? '#7E8594' : '#E8E4DA'});
      o += `<path d="M4 210 H216" stroke="${this.cor}" stroke-width="4" stroke-linecap="round" stroke-dasharray="14 4"/>`;
    }
    if (s.terreno === 'aberto'){
      o += KIT.texto(6, 24, 'Campo aberto', {ancora:'start', tam:12, peso:800, cor:LB_RISCO});
      o += KIT.texto(6, 40, 'Pedra custa +2', {ancora:'start', tam:11, peso:600, cor:'#E8E4DA'});
      o += `<path d="M10 214 l4 -8 l3 8 M40 214 l3 -7 l4 7 M176 214 l3 -8 l4 8 M204 214 l3 -7 l3 7" fill="none" stroke="#7FB069" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    return o;
  },
  linha(s){
    if (s.terreno === 'pedra') return `<b>Chão de pedra</b> <em>· o primeiro ganho de cada rodada rende 1 a mais${s.primeiro ? ' (já usado nesta rodada)' : ''}.</em>`;
    if (s.terreno === 'aberto') return `<b style="color:${LB_RISCO}">Campo aberto</b> <em>· sem pedra nem parede a até 3 cédulas: habilidades do ramo Pedra custam 2 a mais.</em>`;
    return `<em>Ser empurrado, puxado ou arrastado tira 2. Escolha o terreno quando for de pedra ou campo aberto.</em>`;
  },
  acoes(s){ return `<select data-a="terreno" aria-label="Terreno">${Object.entries(LB_TERRENO).map(([k, n]) => `<option value="${k}" ${s.terreno === k ? 'selected' : ''}>${n}</option>`).join('')}</select>`; },
  acao(s, a, ctx, val){
    if (a !== 'terreno' || !LB_TERRENO[val] || val === s.terreno) return;
    s.terreno = val; ctx.log(`${ctx.nome}: ${LB_TERRENO[val].toLowerCase()}.`);
  },
  aoComecarTurno(s){ s.primeiro = false; }
});

// ---------------- Anão Mercador: Barganha ----------------
barra({id:'mercador', cat:'raca', arvore:'Anão Mercador', barra:'Barganha', cor:'#EACB52',
  inicio:6, teto:5, porAcao:2, fim:'inicio', demo:13,
  icone:'<path d="M12 4.6V20M8 20H16"/><path d="M4.5 7H19.5"/><path d="M4.5 7L2.4 13M4.5 7L6.6 13M19.5 7L17.4 13M19.5 7L21.6 13"/><path d="M2 13H7A2.5 2.5 0 0 1 2 13ZM17 13H22A2.5 2.5 0 0 1 17 13Z"/><circle cx="12" cy="4" r="1.3" fill="currentColor" stroke="none"/>',
  ganhos:[
    {id:'truque', c:'Usei um Truque', t:'Usou um Truque (brilho, moeda, trégua, suborno ou oferta)', v:1, quando:'agora', max:1},
    {id:'troca', c:'Troquei item', t:'Trocou ou emprestou um item com um aliado (cada item, uma vez por rodada)', v:1, quando:'agora'},
    {id:'tirou', c:'Truque tirou ação', t:'Um Truque dele fez um inimigo perder uma ação ou uma reação', v:1, quando:'agora'}],
  face(s, v, b){
    // balança: o prato da esquerda guarda 1 a 10, o da direita 11 a 20
    const esq = Math.min(v, 10), dir = Math.max(0, v - 10), ang = (esq - dir) * 1.15 * Math.PI / 180;
    const px = 110, py = 58, braco = 72, corrente = 74;
    const pontas = [[px - braco * Math.cos(ang), py + braco * Math.sin(ang)], [px + braco * Math.cos(ang), py - braco * Math.sin(ang)]];
    const usou = !!(b && b.usos && b.usos.truque);
    let o = `<path d="M84 200 H136 L148 212 H72 Z" fill="#5A4A34" stroke="#C9B48A" stroke-width="2" stroke-linejoin="round"/>`;
    o += `<path d="M110 58 V200" stroke="#8E7A5A" stroke-width="7" stroke-linecap="round"/>`;
    // etiqueta do Truque da rodada, pendurada no poste
    o += `<rect x="80" y="150" width="60" height="24" rx="6" fill="${usou ? this.cor : '#22262E'}" stroke="${usou ? '#FFFFFF' : '#6B6457'}" stroke-width="1.4"/>`;
    o += KIT.texto(110, 166.5, 'Truque', {tam:12, peso:800, cor:usou ? '#16191F' : '#9FA6B4'});
    o += `<path d="M${f1(pontas[0][0])} ${f1(pontas[0][1])} L${f1(pontas[1][0])} ${f1(pontas[1][1])}" stroke="#C9B48A" stroke-width="6" stroke-linecap="round"/>`;
    o += `<path d="M110 40 L103 52 H117 Z" fill="#C9B48A"/><circle cx="110" cy="58" r="6.5" fill="#E8E4DA"/>`;
    pontas.forEach(([x, y], lado) => {
      const fy = y + corrente, cheio = lado ? dir : esq;
      o += `<path d="M${f1(x)} ${f1(y)} L${f1(x - 34)} ${f1(fy)} M${f1(x)} ${f1(y)} L${f1(x + 34)} ${f1(fy)}" stroke="#8E8A80" stroke-width="1.6"/>`;
      for (let k = 0; k < 10; k++){
        const col = k % 5, fila = Math.floor(k / 5), cx = x + (col - 2) * 13.4, cy = fy - 7.5 - fila * 13, on = k < cheio;
        o += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="6.3" fill="${on ? this.cor : 'none'}" stroke="${on ? '#8A6A1E' : '#ffffff30'}" stroke-width="1.3"/>`;
        if (on) o += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="3.2" fill="none" stroke="#8A6A1E" stroke-width="1"/>`;
      }
      o += `<path d="M${f1(x - 40)} ${f1(fy)} H${f1(x + 40)} Q${f1(x)} ${f1(fy + 26)} ${f1(x - 40)} ${f1(fy)} Z" fill="#3A3328" stroke="#C9B48A" stroke-width="2" stroke-linejoin="round"/>`;
    });
    return o;
  },
  linha(){ return `<em>Truque: brilho, moeda, trégua, suborno ou oferta. Rola VIT. Conversa não pega fera nem morto-vivo sem mente.</em>`; }
});

/* ===== racas-c.js ===== */
/* =====================================================================
   LOTE C — Antros (Aviário, Bovino, Canino, Equino, Felino, Roedor)
   e Orcs (Magi'Ritu, Natuphas, Vas). Ajudantes com prefixo LC_.
   Todas: teto 5 por rodada, até 2 por ação, voltam ao início no fim do combate.
   ===================================================================== */

const LC_LAR = '#F08A55';      // laranja de trava/alerta
const LC_APAG = '#262B34';     // apagado opaco (mantém a forma visível)
const LC_ESC = '#0E1014';
const LC_n = n => (+n).toFixed(1);

// ponto de uma curva cúbica
function LC_bez(p, t){ const u = 1 - t; return [0, 1].map(k => u*u*u*p[0][k] + 3*u*u*t*p[1][k] + 3*u*t*t*p[2][k] + t*t*t*p[3][k]); }
const LC_usou = (b, id) => !!(b && b.usos && b.usos[id]);

/* ================= Antro Aviário: Corrente ================= */
const LC_VANE = 'M110 186 C136 180 152 150 152 110 C152 70 136 36 112 12 C94 34 80 64 80 100 C80 140 90 172 110 186 Z';
barra({id:'aviario', cat:'raca', arvore:'Antro Aviário', barra:'Corrente', cor:'#9CC6F0',
  inicio:5, teto:5, porAcao:2, fim:'inicio', demo:13,
  icone:'<path d="M20 3.5C12.5 4 6.5 9.5 6.4 17.6C14.5 17.5 20 11.5 20 3.5Z"/><path d="M3.5 20.5L16 8"/><path d="M10.6 13.6L14.8 14.4M13.4 10.4L18 10.6"/>',
  estado:()=>({presas:false, critico:0}),
  ganhos:[
    {id:'alto', c:'Terminei no alto', t:'Terminou o movimento num lugar alto (2 cédulas ou mais acima do chão em volta) ou no ar. Ficar parado não conta', v:1},
    {id:'mergulho', c:'Mergulho', t:'Caiu sobre um alvo (mergulho)', v:1,
     bloq:s=> s.presas ? 'Asas presas: sem o ramo Planar, sem Mergulho.' : s.critico ? 'Asa ferida: sem o ramo Planar, sem Mergulho.' : false},
    {id:'rajada', c:'Usei uma Rajada', t:'Usou uma Rajada (habilidade do ramo Rajada)', v:1}],
  face(s, v){
    const c = this.cor, semPlanar = s.presas || s.critico;
    let o = '';
    // vento
    [['M10 62 C36 46 60 72 92 54', .5], ['M16 92 C38 80 56 100 80 88', .32], ['M150 168 C170 156 188 176 212 160', .32]].forEach(([d, op]) => {
      o += `<path d="${d}" fill="none" stroke="${c}" stroke-opacity="${op}" stroke-width="3" stroke-linecap="round"/>`; });
    // a pena: 10 barbas de cada lado, acendem do cálamo para a ponta, alternando os lados
    o += `<defs><clipPath id="aviario-vane"><path d="${LC_VANE}"/></clipPath></defs><g transform="rotate(28 110 110)">`;
    o += `<path d="${LC_VANE}" fill="#1E2128"/><g clip-path="url(#aviario-vane)">`;
    for (let k = 0; k < 20; k++){
      const i = Math.floor(k / 2), lado = k % 2 ? -1 : 1, y0 = 190 - i * 17.4 - 1.1, y1 = 190 - (i + 1) * 17.4 + 1.1, xe = 110 + lado * 92, xm = 110 + lado * 46;
      o += `<path d="M110 ${LC_n(y0)} Q${LC_n(xm)} ${LC_n(y0 - 5)} ${LC_n(xe)} ${LC_n(y0 - 36)} L${LC_n(xe)} ${LC_n(y1 - 36)} Q${LC_n(xm)} ${LC_n(y1 - 5)} 110 ${LC_n(y1)} Z" fill="${k < v ? c : '#2C323C'}"/>`;
    }
    // duas fendas na pena
    [[1, 190 - 4 * 17.4], [-1, 190 - 7 * 17.4]].forEach(([l, y]) => { o += `<path d="M${110 + l * 16} ${LC_n(y - 4)} L${110 + l * 92} ${LC_n(y - 44)} L${110 + l * 92} ${LC_n(y - 30)} Z" fill="#16191F"/>`; });
    o += `</g><path d="${LC_VANE}" fill="none" stroke="#5A6270" stroke-width="1.4"/>`;
    // penugem na base e o cálamo
    o += `<path d="M110 190 Q98 190 92 200 M110 190 Q122 190 128 199 M110 196 Q100 198 97 207 M110 196 Q121 198 123 206" fill="none" stroke="#7E8594" stroke-width="2" stroke-linecap="round"/>`;
    o += `<path d="M110 214 L110 16" stroke="#E8E4DA" stroke-width="3.2" stroke-linecap="round"/>`;
    if (s.critico) o += `<path d="M60 70 L98 86 L62 104 Z" fill="#16191F" stroke="${LC_LAR}" stroke-width="2.4" stroke-linejoin="round"/>`;
    if (s.presas) o += `<path d="M44 112 Q110 134 176 110 M44 126 Q110 148 176 124" fill="none" stroke="${LC_LAR}" stroke-width="5" stroke-linecap="round"/><circle cx="110" cy="130" r="7" fill="${LC_LAR}"/>`;
    o += `</g>`;
    if (semPlanar) o += KIT.texto(212, 204, s.presas ? 'Asas presas' : 'Asa ferida', {ancora:'end', tam:13, peso:800, cor:LC_LAR});
    return o;
  },
  linha(s){
    if (s.presas) return `<b style="color:${LC_LAR}">Asas presas</b> <em>· sem o ramo Planar (nem Mergulho) até se soltar.</em>`;
    if (s.critico) return `<b style="color:${LC_LAR}">Asa ferida</b> <em>· sem o ramo Planar até o fim ${s.critico === 2 ? 'deste turno' : 'do próximo turno'}.</em>`;
    return `<em>Lugar alto: 2 cédulas ou mais acima do chão em volta. Só plana; no fim do turno, pousa.</em>`;
  },
  acoes(s){
    return `<button type="button" data-a="presas" aria-pressed="${s.presas}" title="Agarrado, Enraizado ou Emaranhado">${s.presas ? '✓ ' : ''}Asas presas</button>`
      + `<button type="button" data-a="critico" aria-pressed="${!!s.critico}" title="Crítico nas asas: sem Planar até o fim do próximo turno dele">${s.critico ? '✓ ' : ''}Crítico nas asas</button>`;
  },
  acao(s, a, ctx){
    if (a === 'presas'){ s.presas = !s.presas; ctx.log(s.presas ? `${ctx.nome} ficou com as asas presas: sem o ramo Planar.` : `${ctx.nome} soltou as asas.`); }
    if (a === 'critico'){ s.critico = s.critico ? 0 : 1; if (s.critico) ctx.log(`${ctx.nome} levou um crítico nas asas: sem o ramo Planar até o fim do próximo turno.`); }
  },
  aoComecarTurno(s){ if (s.critico === 1) s.critico = 2; },
  aoTerminarTurno(s, ctx){ if (s.critico === 2){ s.critico = 0; ctx.log(`As asas de ${ctx.nome} se recuperaram do crítico.`); } }
});

/* ================= Antro Bovino: Carga ================= */
barra({id:'bovino', cat:'raca', arvore:'Antro Bovino', barra:'Carga', cor:'#D9A57E',
  inicio:5, teto:5, porAcao:2, fim:'inicio', demo:12,
  icone:'<path d="M3 5.5C3.4 9.6 6 11.2 9 10.6"/><path d="M21 5.5C20.6 9.6 18 11.2 15 10.6"/><path d="M8.5 9.8H15.5L14.8 17.4C14.6 19.3 13.5 20.4 12 20.4S9.4 19.3 9.2 17.4Z"/><circle cx="10.6" cy="17.6" r=".9" fill="currentColor" stroke="none"/><circle cx="13.4" cy="17.6" r=".9" fill="currentColor" stroke="none"/>',
  ganhos:[
    {id:'grande', c:'Golpe de arma grande', t:'Acertou um golpe com arma grande (de duas mãos ou pesada). Armas leves não contam', v:1},
    {id:'carregar', c:'Levantei ou carreguei', t:'Levantou ou carregou alguém ou um objeto grande (uma vez por turno)', v:1, max:1},
    {id:'arremesso', c:'Arremessei inimigo', t:'Arremessou um inimigo', v:2},
    {id:'aguentei', c:'Aguentei 20%+', t:'Sofreu um golpe que tirou 20% ou mais do HP máximo e seguiu de pé', v:1}],
  face(s, v){
    const c = this.cor;
    // a cabeça do touro no alto
    const ct = v >= 20 ? c : '#8E8478';
    let o = `<path d="M94 34 C72 36 50 28 40 6 C56 20 76 22 96 22 Z M126 34 C148 36 170 28 180 6 C164 20 144 22 124 22 Z" fill="${ct}"/>`;
    o += `<path d="M90 24 H130 L123 54 Q120 62 113 62 H107 Q100 62 97 54 Z" fill="${ct}"/><path d="M90 30 L76 38 L92 40 M130 30 L144 38 L128 40" fill="${ct}"/>`;
    o += `<ellipse cx="104" cy="54" rx="2.6" ry="3.4" fill="${LC_ESC}" opacity=".7"/><ellipse cx="116" cy="54" rx="2.6" ry="3.4" fill="${LC_ESC}" opacity=".7"/><circle cx="101" cy="36" r="2.4" fill="${LC_ESC}" opacity=".7"/><circle cx="119" cy="36" r="2.4" fill="${LC_ESC}" opacity=".7"/>`;
    // a carga: pilha de 20 toras (6, 5, 4, 3, 2), de baixo para cima
    o += `<path d="M8 214 H212" stroke="#5A4E40" stroke-width="4" stroke-linecap="round"/>`;
    let k = 0;
    [6, 5, 4, 3, 2].forEach((n, lin) => { for (let i = 0; i < n; i++, k++){
      const x = 110 + (i - (n - 1) / 2) * 33, y = 197 - lin * 28.6, on = k < v;
      o += `<circle cx="${LC_n(x)}" cy="${LC_n(y)}" r="16" fill="${on ? c : LC_APAG}" stroke="${on ? '#F2D9C2' : '#3A3F4A'}" stroke-width="1.6"/>`;
      o += `<circle cx="${LC_n(x)}" cy="${LC_n(y)}" r="9.5" fill="none" stroke="${on ? '#7A5232' : '#33383F'}" stroke-width="1.4" opacity="${on ? .55 : 1}"/>`;
      o += `<circle cx="${LC_n(x)}" cy="${LC_n(y)}" r="3.4" fill="${on ? '#7A5232' : '#33383F'}" opacity="${on ? .6 : 1}"/>`;
    } });
    return o;
  },
  linha(){ return `<em>Lento para virar: cada mudança de direção custa 1 cédula a mais. Armas leves não ganham bônus da árvore.</em>`; }
});

/* ================= Antro Canino: Faro ================= */
// trilha em zigue-zague (Catmull-Rom pelos pontos), 20 pegadas igualmente espaçadas
const LC_TRILHA = (() => {
  const q = [[196, 210], [184, 204], [120, 194], [46, 172], [52, 136], [138, 122], [182, 96], [150, 64], [92, 46], [70, 40]], dens = [];
  for (let i = 1; i < q.length - 2; i++) for (let j = 0; j < 40; j++){
    const t = j / 40, [p0, p1, p2, p3] = [q[i - 1], q[i], q[i + 1], q[i + 2]];
    dens.push([0, 1].map(k => .5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t)));
  }
  const acum = [0]; for (let i = 1; i < dens.length; i++) acum.push(acum[i - 1] + Math.hypot(dens[i][0] - dens[i - 1][0], dens[i][1] - dens[i - 1][1]));
  const L = acum[acum.length - 1];
  return Array.from({ length: 20 }, (_, k) => { let i = acum.findIndex(a => a >= L * k / 19); if (i < 1) i = 1;
    const a = dens[i - 1], b = dens[i]; return { x: a[0], y: a[1], ang: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI }; });
})();
const LC_PATA = '<path d="M0 0.6C-3.2 0.6 -5.4 3.6 -5.4 5.6C-5.4 7.4 -3.9 8.1 -2.4 7.7C-1.5 7.5 -0.8 7.2 0 7.2S1.5 7.5 2.4 7.7C3.9 8.1 5.4 7.4 5.4 5.6C5.4 3.6 3.2 0.6 0 0.6Z"/><circle cx="-5.6" cy="-2.6" r="2"/><circle cx="-2.1" cy="-6.4" r="2.1"/><circle cx="2.1" cy="-6.4" r="2.1"/><circle cx="5.6" cy="-2.6" r="2"/>';
barra({id:'canino', cat:'raca', arvore:'Antro Canino', barra:'Faro', cor:'#E6C27A',
  inicio:5, teto:5, porAcao:2, fim:'inicio', demo:11,
  icone:'<path d="M12 12.4C9 12.4 6.6 15.4 6.6 17.5C6.6 19.3 8.1 20.1 9.7 19.7C10.6 19.5 11.2 19.2 12 19.2S13.4 19.5 14.3 19.7C15.9 20.1 17.4 19.3 17.4 17.5C17.4 15.4 15 12.4 12 12.4Z"/><circle cx="4.9" cy="10.6" r="2.1" fill="currentColor" stroke="none"/><circle cx="9" cy="6.3" r="2.2" fill="currentColor" stroke="none"/><circle cx="15" cy="6.3" r="2.2" fill="currentColor" stroke="none"/><circle cx="19.1" cy="10.6" r="2.1" fill="currentColor" stroke="none"/>',
  estado:()=>({marcado:0, marcou:false, cheiro:false}),
  ganhos:[
    {id:'marcar', c:'Marquei inimigo', t:'Como parte do movimento, farejou um inimigo que vê a até 6 cédulas: ele fica Marcado por 3 rodadas (um por vez). Uma vez por rodada. Marcar de novo o mesmo não rende: use Renovar', v:1,
     bloq:s=> s.marcou ? 'Já marcou nesta rodada.' : false,
     ao:(s, ctx)=>{ s.marcado = 3; s.marcou = true; ctx.log(`${ctx.nome} farejou e marcou um inimigo: Marcado por 3 rodadas.`); }},
    {id:'achar', c:'Achei o escondido', t:'Venceu um teste contra Oculto, armadilha ou item escondido', v:1},
    {id:'duelo', c:'Duelo: acertei ou errou', t:'Em duelo (o Marcado é o único inimigo adjacente), acertou o Marcado ou um golpe dele errou', v:1,
     bloq:s=> s.marcado ? false : 'Sem Marcado: não há duelo.'}],
  face(s, v){
    const c = this.cor;
    let o = '';
    LC_TRILHA.forEach((p, k) => {
      const lado = k % 2 ? 1 : -1, t = (p.ang + 90) * Math.PI / 180;
      const x = p.x + lado * 7 * Math.cos(t), y = p.y + lado * 7 * Math.sin(t);
      o += `<g transform="translate(${LC_n(x)} ${LC_n(y)}) rotate(${LC_n(p.ang + 90)}) scale(1.4)" fill="${k < v ? c : '#ffffff2e'}">${LC_PATA}</g>`;
    });
    // o alvo no fim da trilha: o Marcado, com as rodadas que faltam
    const mx = 34, my = 34;
    if (s.marcado){
      o += `<circle cx="${mx}" cy="${my}" r="24" fill="#2A2420" stroke="${c}" stroke-width="3"/>`;
      o += `<path d="M${mx - 13} ${my} H${mx + 13} M${mx} ${my - 13} V${my + 13}" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><circle cx="${mx}" cy="${my}" r="6" fill="none" stroke="${c}" stroke-width="2"/>`;
      for (let i = 0; i < 3; i++) o += `<circle cx="${mx - 13 + i * 13}" cy="${my + 35}" r="4.6" fill="${i < s.marcado ? c : 'none'}" stroke="${c}" stroke-width="1.6"/>`;
    } else o += `<circle cx="${mx}" cy="${my}" r="24" fill="none" stroke="#4A505C" stroke-width="2" stroke-dasharray="5 5"/>`;
    if (s.cheiro){
      o += `<path d="M10 116 C40 98 64 132 98 112 S156 96 210 116 M18 150 C48 132 76 166 110 146 S168 130 212 150" fill="none" stroke="#9FA6B4" stroke-width="6" stroke-linecap="round" opacity=".7"/>`;
      o += KIT.texto(8, 212, 'Cheiro forte', {ancora:'start', tam:13, peso:800, cor:LC_LAR});
    }
    return o;
  },
  linha(s){
    const r = `${s.marcado} ${s.marcado > 1 ? 'rodadas' : 'rodada'}`;
    if (s.cheiro) return `<b style="color:${LC_LAR}">Cheiro forte</b> <em>· sem o ramo Faro e sem o +4 em PER contra Oculto.</em>` + (s.marcado ? `<br><b>Marcado</b> <em>· mais ${r}.</em>` : '');
    return s.marcado ? `<b>Marcado</b> <em>· mais ${r}. Duelo: ele é o único inimigo adjacente.</em>` : `<em>Sem Marcado. Marcar: fareje um inimigo a até 6 cédulas (com o movimento).</em>`;
  },
  acoes(s){
    let h = '';
    if (s.marcado) h += `<button type="button" data-a="renovar" title="Volta a 3 rodadas; renovar não rende Faro">Renovar a marca</button><button type="button" data-a="solta" title="O Marcado caiu ou a marca acabou">Marca acabou</button>`;
    h += `<button type="button" data-a="cheiro" aria-pressed="${s.cheiro}" title="Fumaça, perfume, esgoto, chuva forte">${s.cheiro ? '✓ ' : ''}Cheiro forte</button>`;
    return h;
  },
  acao(s, a, ctx){
    if (a === 'renovar'){ if (s.marcou) return ctx.aviso('Já marcou nesta rodada.'); s.marcado = 3; s.marcou = true; ctx.log(`${ctx.nome} renovou a marca: mais 3 rodadas (sem Faro).`); }
    if (a === 'solta'){ s.marcado = 0; ctx.log(`A marca de ${ctx.nome} acabou.`); }
    if (a === 'cheiro'){ s.cheiro = !s.cheiro; ctx.log(s.cheiro ? `${ctx.nome} está em cheiro forte: sem o ramo Faro.` : `${ctx.nome} saiu do cheiro forte.`); }
  },
  aoComecarTurno(s, ctx){
    s.marcou = false;
    if (s.marcado){ s.marcado--; if (!s.marcado) ctx.log(`A marca de ${ctx.nome} acabou (3 rodadas).`); }
  }
});

/* ================= Antro Equino: Ímpeto ================= */
const LC_FERRADURA = 'M30 36 Q30 24 42 24 H58 Q66 24 66 34 L64 118 A46 46 0 0 0 156 118 L154 34 Q154 24 162 24 H178 Q190 24 190 36 L192 118 A82 82 0 0 1 28 118 Z';
barra({id:'equino', cat:'raca', arvore:'Antro Equino', barra:'Ímpeto', cor:'#F0A06A',
  inicio:4, teto:5, porAcao:2, fim:'inicio', demo:13,
  icone:'<path d="M8.4 3.6C5.6 5.8 4 8.8 4 12.4C4 16.9 7.6 20.5 12 20.5S20 16.9 20 12.4C20 8.8 18.4 5.8 15.6 3.6L13.6 5.8C15.2 7.4 16.2 9.6 16.2 12.2C16.2 14.8 14.4 16.8 12 16.8S7.8 14.8 7.8 12.2C7.8 9.6 8.8 7.4 10.4 5.8Z"/><circle cx="6" cy="11.8" r=".95" fill="currentColor" stroke="none"/><circle cx="18" cy="11.8" r=".95" fill="currentColor" stroke="none"/><circle cx="8.6" cy="17.6" r=".95" fill="currentColor" stroke="none"/><circle cx="15.4" cy="17.6" r=".95" fill="currentColor" stroke="none"/>',
  estado:()=>({exposto:false}),
  ganhos:[
    {id:'inv3', c:'Investida (3 a 5)', t:'Atacou ou empurrou depois de andar 3 a 5 cédulas em linha reta no turno. Depois fica Exposto', v:1,
     ao:(s, ctx)=>{ if (!s.exposto) ctx.log(`${ctx.nome} fica Exposto (DEF F e DEF M −2) até o começo do próximo turno.`); s.exposto = true; }},
    {id:'inv6', c:'Investida (6+)', t:'Atacou ou empurrou depois de andar 6 cédulas ou mais em linha reta no turno. Depois fica Exposto', v:2,
     ao:(s, ctx)=>{ if (!s.exposto) ctx.log(`${ctx.nome} fica Exposto (DEF F e DEF M −2) até o começo do próximo turno.`); s.exposto = true; }},
    {id:'caido', c:'Deixei Caído', t:'Deixou alguém Caído numa investida', v:1,
     bloq:s=> s.exposto ? false : 'Primeiro marque a investida.'},
    {id:'parado', c:'Andei menos de 2', t:'Terminou o turno tendo andado menos de 2 cédulas', v:-3, quando:'fim', tipo:'tg'}],
  face(s, v){
    const c = this.cor;
    let o = '';
    o += KIT.encher('equino', LC_FERRADURA, v / 20, c, {base:200, topo:24, fundo:'#1E2128', contorno: s.exposto ? LC_LAR : '#C9C3B5', traco: s.exposto ? 3 : 2.5});
    // furos dos cravos
    [-62, -38, 38, 62].concat([-84, 84]).forEach(a => { const [x, y] = P(110, 118, 64, 180 + a); o += `<rect x="${LC_n(x - 3)}" y="${LC_n(y - 5)}" width="6" height="10" rx="2" fill="${LC_ESC}" opacity=".55" transform="rotate(${a} ${LC_n(x)} ${LC_n(y)})"/>`; });
    if (s.exposto){
      o += KIT.texto(110, 82, 'Exposto', {tam:16, peso:800, cor:LC_LAR});
      o += KIT.texto(110, 101, 'DEF −2', {tam:13, peso:700, cor:LC_LAR});
    }
    return o;
  },
  linha(s){
    if (s.exposto) return `<b style="color:${LC_LAR}">Exposto</b> <em>· DEF F e DEF M −2 até o começo do próximo turno.</em>`;
    return `<em>Investida: atacar ou empurrar depois de 3+ cédulas em linha reta. Andar menos de 2 no turno tira 3.</em>`;
  },
  aoComecarTurno(s, ctx){ if (s.exposto){ s.exposto = false; ctx.log(`${ctx.nome} não está mais Exposto.`); } }
});

/* ================= Antro Felino: Astúcia ================= */
const LC_OLHO = 'M10 110 Q110 2 210 110 Q110 218 10 110 Z';
barra({id:'felino', cat:'raca', arvore:'Antro Felino', barra:'Astúcia', cor:'#EDD36A',
  inicio:5, teto:5, porAcao:2, fim:'inicio', demo:11,
  icone:'<path d="M4.6 3.6L9.4 7.8C10.2 7.6 11.1 7.5 12 7.5S13.8 7.6 14.6 7.8L19.4 3.6L19.8 12.6C19.8 17 16.4 20.4 12 20.4S4.2 17 4.2 12.6Z"/><circle cx="9.2" cy="13" r="1.1" fill="currentColor" stroke="none"/><circle cx="14.8" cy="13" r="1.1" fill="currentColor" stroke="none"/><path d="M11 16.6L12 17.4L13 16.6"/>',
  estado:()=>({pesada:false}),
  ganhos:[
    {id:'esquiva', c:'Esquivei', t:'Esquivou de um ataque', v:1},
    {id:'maos', c:'Roubei ou desarmei', t:'Roubou ou desarmou alguém, ou trocou um item sem ser visto', v:1},
    {id:'acro', c:'Acrobacia', t:'Manobra acrobática que muda a luta (saltar sobre um inimigo, escalar, rolar para longe)', v:1}],
  face(s, v){
    const c = this.cor;
    // orelhas de gato atrás do olho
    let o = `<path d="M30 74 L40 8 L92 50 M190 74 L180 8 L128 50" fill="none" stroke="#4A505C" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`;
    o += KIT.encher('felino', LC_OLHO, v / 20, c, {base:164, topo:56, fundo:'#1E2128', contorno:'#E8E4DA', traco:3});
    // pupila em fenda e brilho
    o += `<path d="M110 60 C124 84 124 136 110 160 C96 136 96 84 110 60 Z" fill="${LC_ESC}"/>`;
    o += `<circle cx="140" cy="84" r="6" fill="#ffffff" opacity=".7"/>`;
    if (s.pesada){
      o += `<path d="M22 196 L198 30" stroke="${LC_LAR}" stroke-width="3.2" stroke-linecap="round"/>`;
      o += KIT.texto(110, 194, 'Armadura pesada', {tam:13, peso:800, cor:LC_LAR});
      o += KIT.texto(110, 211, 'sem Esquiva e Acrobacia', {tam:11.5, peso:700, cor:LC_LAR});
    }
    return o;
  },
  linha(s){
    if (s.pesada) return `<b style="color:${LC_LAR}">Armadura pesada</b> <em>· as habilidades de Esquiva e de Acrobacia ficam desligadas.</em>`;
    return `<em>Frágil: sofre +10% de dano de todo golpe que o acerta.</em>`;
  },
  acoes(s){ return `<button type="button" data-a="pesada" aria-pressed="${s.pesada}">${s.pesada ? '✓ ' : ''}Armadura pesada</button>`; },
  acao(s, a, ctx){ if (a === 'pesada'){ s.pesada = !s.pesada; ctx.log(s.pesada ? `${ctx.nome} está de armadura pesada: sem Esquiva e Acrobacia.` : `${ctx.nome} tirou a armadura pesada.`); } }
});

/* ================= Antro Roedor: Esperteza ================= */
function LC_frasco(x, y, g, on, cor){
  return `<g transform="translate(${LC_n(x)} ${LC_n(y)}) rotate(${g})">`
    + `<path d="M-2.6 -9 V-4.6 A7.6 7.6 0 1 0 2.6 -4.6 V-9 Z" fill="${on ? cor : '#1E2128'}" stroke="${on ? '#F2EBDD' : '#4A505C'}" stroke-width="1.4" stroke-linejoin="round"/>`
    + (on ? `<circle cx="-2.6" cy="2" r="2" fill="#ffffff" opacity=".5"/>` : '')
    + `<rect x="-3.6" y="-14" width="7.2" height="5.6" rx="1.5" fill="#8A6A48"/></g>`;
}
barra({id:'roedor', cat:'raca', arvore:'Antro Roedor', barra:'Esperteza', cor:'#CFC0A6',
  inicio:5, teto:5, porAcao:2, fim:'inicio', demo:12,
  icone:'<circle cx="6" cy="7.2" r="3.4"/><circle cx="18" cy="7.2" r="3.4"/><path d="M8 10.6C8 8.4 9.8 7.4 12 7.4S16 8.4 16 10.6C16 14.4 13.6 18.8 12 20.4C10.4 18.8 8 14.4 8 10.6Z"/><circle cx="10.4" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="13.6" cy="12" r=".9" fill="currentColor" stroke="none"/>',
  estado:()=>({bolsos:false}),
  ganhos:[
    {id:'item', c:'Usei um item', t:'Usou um item (+1 por item)', v:1},
    {id:'frasco', c:'Falhou no meu frasco', t:'Um inimigo falhou contra um frasco dele (+1 por inimigo)', v:1},
    {id:'esquiva', c:'Esquivei', t:'Esquivou de um golpe', v:1}],
  face(s, v){
    const c = this.cor;
    // duas bandoleiras em X; cada braço tem 5 frascos, do centro para fora, no sentido horário
    let o = `<path d="M16 24 L204 196 M204 24 L16 196" stroke="#5A4A3A" stroke-width="22" stroke-linecap="round"/>`;
    o += `<path d="M16 24 L204 196 M204 24 L16 196" stroke="#8A7458" stroke-width="1.4" stroke-dasharray="4 4" opacity=".7"/>`;
    const bracos = [[-1, -1, 45], [1, -1, -45], [1, 1, 45], [-1, 1, -45]];
    let k = 0;
    bracos.forEach(([dx, dy, g]) => { for (let i = 0; i < 5; i++){ const d = 36 + i * 17.5, x = 110 + dx * d * .7071 * 1.04, y = 110 + dy * d * .7071 * .94; o += LC_frasco(x, y, g, k < v, c); k++; } });
    // os Bolsos Fundos no cruzamento (toque para marcar o uso da rodada)
    const usou = s.bolsos;
    o += KIT.botao('bolsos', usou ? 'Bolsos Fundos: já usou nesta rodada (toque para desmarcar)' : 'Bolsos Fundos: marcar o uso desta rodada',
      `<path d="M84 96 H136 V124 C136 136 128 142 110 142 C92 142 84 136 84 124 Z" fill="${usou ? '#3A3F4A' : '#6B5640'}" stroke="${usou ? '#7E8594' : c}" stroke-width="2"/>`
      + `<path d="M82 92 H138 L134 108 Q110 116 86 108 Z" fill="${usou ? '#4A505C' : '#8A6E52'}" stroke="${usou ? '#7E8594' : c}" stroke-width="2"/>`
      + `<circle cx="110" cy="110" r="4" fill="${usou ? '#7E8594' : c}"/>`
      + (usou ? `<path d="M100 126 L107 133 L121 118" fill="none" stroke="#E8E4DA" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : ''));
    return o;
  },
  dica(s){ return s.bolsos ? `<b>Bolsos Fundos</b> <em>· já usou nesta rodada. Toque para desmarcar.</em>` : `<b>Bolsos Fundos</b> <em>· 1 item pequeno por rodada sem gastar ação. Toque para marcar.</em>`; },
  linha(s){
    return s.bolsos ? `<b>Bolsos Fundos usados</b> <em>· nesta rodada, o próximo item gasta ação.</em>`
      : `<b>Bolsos Fundos livres</b> <em>· 1 item pequeno sem gastar ação (beber, aplicar, arremessar, passar).</em>`;
  },
  acoes(s){ return `<button type="button" data-a="bolsos" aria-pressed="${s.bolsos}">${s.bolsos ? '✓ Usei os Bolsos Fundos' : 'Usei os Bolsos Fundos'}</button>`; },
  clique(s, k, ctx){ if (k === 'bolsos') this.acao(s, 'bolsos', ctx); },
  acao(s, a, ctx){
    if (a === 'bolsos'){ s.bolsos = !s.bolsos; if (s.bolsos) ctx.log(`${ctx.nome} usou os Bolsos Fundos: 1 item pequeno sem gastar ação.`); }
  },
  aoComecarTurno(s){ s.bolsos = false; }
});

/* ================= Orc Magi'Ritu: Favor Espiritual ================= */
const LC_TOTEM = 'M80 206 L80 100 L36 98 L10 64 L52 72 L80 76 L84 42 Q110 10 136 42 L140 76 L168 72 L210 64 L184 98 L140 100 L140 206 Z';
const LC_OFERENDAS = [['item', 'Item'], ['vida', 'Vida'], ['morto', 'Inimigo']];
barra({id:'magiritu', cat:'raca', arvore:"Orc Magi'Ritu", barra:'Favor Espiritual', cor:'#E58A72',
  inicio:5, teto:5, porAcao:2, fim:'inicio', demo:9,
  icone:'<path d="M9 8H15V20.5H9Z"/><path d="M9 8L3.5 6.5L5.5 10.5H9M15 8L20.5 6.5L18.5 10.5H15"/><path d="M9.6 8L12 3.5L14.4 8"/><path d="M9 14.2H15"/><circle cx="12" cy="11.4" r=".95" fill="currentColor" stroke="none"/><circle cx="12" cy="17.4" r=".95" fill="currentColor" stroke="none"/>',
  estado:()=>({ultimo:null}),
  ganhos:[
    {id:'item', c:'Oferenda: item', t:'Ofereceu um item (moeda de prata, consumível ou troféu), gastando a ação. Uma por rodada', v:2, max:1},
    {id:'vida', c:'Oferenda: vida', t:'Ofereceu vida: perde 10% do HP máximo, como parte do movimento. Uma por rodada', v:2, max:1,
     ao:(s, ctx)=>{ ctx.log(`${ctx.nome} ofereceu vida aos espíritos: perde 10% do HP máximo.`); }},
    {id:'morto', c:'Oferenda: inimigo caído', t:'Um inimigo foi derrotado a até 4 cédulas: oferece como reação. Uma por rodada', v:2, max:1}],
  face(s, v, b){
    const c = this.cor, base = 206, topo = 24, y5 = base - (base - topo) * 5 / 20;
    let o = KIT.encher('magiritu', LC_TOTEM, v / 20, c, {base, topo, fundo:'#22201E', contorno:'#C9B8A8'});
    // entalhes: cabeça de pássaro, dois rostos
    o += `<g fill="${LC_ESC}" opacity=".6"><ellipse cx="99" cy="52" rx="5" ry="4"/><ellipse cx="121" cy="52" rx="5" ry="4"/><path d="M103 60 H117 L110 74 Z"/>`
      + `<rect x="80" y="104" width="60" height="3"/><ellipse cx="97" cy="122" rx="8" ry="5.5"/><ellipse cx="123" cy="122" rx="8" ry="5.5"/><rect x="94" y="134" width="32" height="7" rx="2"/>`
      + `<rect x="80" y="152" width="60" height="3"/><ellipse cx="97" cy="170" rx="8" ry="5.5"/><ellipse cx="123" cy="170" rx="8" ry="5.5"/><path d="M92 184 H128 L124 194 H96 Z"/></g>`;
    // linha do 5: abaixo dela o pedido arrisca
    const baixo = v < 5;
    o += `<path d="M72 ${LC_n(y5)} H148" stroke="${baixo ? LC_LAR : '#9FA6B4'}" stroke-width="2.2" stroke-dasharray="5 4"/>`;
    o += KIT.texto(66, y5 + 4, '5', {ancora:'end', tam:12, peso:800, cor: baixo ? LC_LAR : '#9FA6B4'});
    // oferendas da rodada (acesas quando já feitas)
    LC_OFERENDAS.forEach(([id, rot], i) => {
      const y = 122 + i * 30, on = LC_usou(b, id);
      o += `<circle cx="164" cy="${y}" r="6" fill="${on ? c : 'none'}" stroke="${on ? c : '#5A6070'}" stroke-width="2"/>`;
      o += KIT.texto(175, y + 4, rot, {ancora:'start', tam:11.5, peso: on ? 800 : 600, cor: on ? c : '#7E8594'});
    });
    // último pedido feito com Favor baixo: o dado
    if (s.ultimo){
      const r = s.ultimo.recusou, cr = r ? LC_LAR : c;
      o += `<rect x="14" y="8" width="34" height="34" rx="7" fill="#22262E" stroke="${cr}" stroke-width="2.4"/>`;
      o += KIT.texto(31, 32, s.ultimo.d, {tam:20, peso:800, cor:cr});
      o += KIT.texto(31, 57, r ? 'recusou' : 'atendeu', {tam:11.5, peso:800, cor:cr});
    }
    return o;
  },
  linha(s, ctx){
    const u = s.ultimo ? ` <em>Último dado: ${s.ultimo.d} (${s.ultimo.recusou ? 'recusou' : 'atendeu'}).</em>` : '';
    if (ctx.v < 5) return `<b style="color:${LC_LAR}">Favor abaixo de 5</b> <em>· cada pedido rola 1d6; com 1 ou 2, o espírito recusa.</em>${u}`;
    return `<em>Oferendas: uma de cada tipo por rodada. Com 5 ou mais de Favor, o pedido não rola dado.</em>${u}`;
  },
  acoes(s, ctx){
    const ops = [1, 2, 3, 4, 5, 6, 8, 10].map(n => `<option value="${n}" ${n > ctx.v ? 'disabled' : ''}>Custa ${n}</option>`).join('');
    return `<select data-a="pedido" class="gasta" aria-label="Fazer um pedido aos espíritos"><option value="">▼ Fazer pedido…</option>${ops}</select>`;
  },
  acao(s, a, ctx, val){
    if (a !== 'pedido' || !val) return;
    const n = +val, antes = ctx.v;
    if (n > antes) return ctx.aviso(`Falta Favor: o pedido custa ${n}.`);
    if (antes < 5){
      const d = 1 + Math.floor(Math.random() * 6), recusou = d <= 2;
      ctx.perder(n, 'pedido');
      s.ultimo = { d, recusou };
      ctx.log(recusou ? `O espírito recusou o pedido de ${ctx.nome} (1d6: ${d}). O Favor foi gasto e nada acontece.` : `O espírito atendeu ${ctx.nome} (1d6: ${d}).`);
    } else { ctx.perder(n, 'pedido'); s.ultimo = null; }
  },
  aoComecarTurno(s){ s.ultimo = null; }
});

/* ================= Orc Natuphas: Permafrost ================= */
const LC_GELO_L = [70, 98, 80, 120, 90, 74, 108, 128, 92, 122, 132, 96, 118, 82, 112, 88, 126, 76, 100, 68];
barra({id:'orc-natuphas', cat:'raca', arvore:'Orc Natuphas', barra:'Permafrost', cor:'#94DDEB',
  inicio:6, teto:5, porAcao:2, fim:'inicio', demo:13,
  icone:'<path d="M3.5 4H20.5"/><path d="M5.5 4L7.5 13L9.5 4"/><path d="M10 4L12 20.5L14 4"/><path d="M14.5 4L16.5 11L18.5 4"/>',
  ganhos:[
    {id:'fiquei', c:'Apanhei e fiquei', t:'Sofreu dano de um golpe e ficou no lugar (se o golpe o moveu ou deixou Caído, não rende; golpe que só tira Escudado conta)', v:1},
    {id:'resisti', c:'Resisti', t:'Resistiu a um empurrão, derrubada ou prisão', v:1},
    {id:'retal', c:'Retaliação acertou', t:'Uma retaliação dele (efeito desta árvore contra quem acabou de atacá-lo) acertou quem o atacou', v:1}],
  face(s, v){
    const c = this.cor;
    // laje de terra congelada com camadas
    let o = `<path d="M4 14 H216 V58 H4 Z" fill="#2A3640"/><path d="M4 26 H216 M4 40 H216" stroke="#3E5262" stroke-width="3"/>`;
    o += `<path d="M4 14 Q30 6 58 13 T112 12 T166 13 T216 10 V18 H4 Z" fill="#E8F4F8"/>`;
    // 20 estalactites em 4 grupos de 5
    for (let k = 0; k < 20; k++){
      const g = Math.floor(k / 5), x = 14 + k * 9.6 + g * 6.4, L = LC_GELO_L[k], on = k < v, w = 4.3;
      o += `<path d="M${LC_n(x - w)} 57 L${LC_n(x + w)} 57 L${LC_n(x + .6)} ${57 + L} L${LC_n(x - .6)} ${57 + L} Z" fill="${on ? c : '#ffffff10'}" stroke="${on ? '#E8F8FC' : '#ffffff26'}" stroke-width="1" stroke-linejoin="round"/>`;
      if (on) o += `<path d="M${LC_n(x - 1.6)} 62 L${LC_n(x - .4)} ${LC_n(57 + L * .7)}" stroke="#ffffff" stroke-opacity=".6" stroke-width="1.4" stroke-linecap="round"/>`;
    }
    // chão gelado
    o += `<path d="M4 212 L18 204 L30 210 L46 200 L62 209 L80 202 L98 211 L116 201 L134 210 L150 203 L168 211 L184 202 L200 209 L216 203 V216 H4 Z" fill="#2A3640"/>`;
    return o;
  },
  linha(){ return `<em>Lento: anda 1 cédula a menos e esquiva fixa −4. As reduções de dano da árvore somam até 40% num golpe.</em>`; }
});

/* ================= Orc Vas: Fúria ================= */
const LC_CHIFRE = (() => {
  const p = [[62, 206], [30, 140], [70, 66], [138, 40]], n = 32, esq = [], dir = [], meio = [];
  for (let i = 0; i <= n; i++){
    const t = i / n, a = LC_bez(p, Math.max(0, t - .01)), b = LC_bez(p, Math.min(1, t + .01)), q = LC_bez(p, t);
    const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy), nx = -dy / m, ny = dx / m, w = 5 + 31 * Math.pow(t, 1.7);
    esq.push([q[0] + nx * w, q[1] + ny * w]); dir.push([q[0] - nx * w, q[1] - ny * w]); meio.push({ x: q[0], y: q[1], nx, ny, w });
  }
  const d = 'M' + esq.map(q => LC_n(q[0]) + ' ' + LC_n(q[1])).join(' L') + ' L' + dir.reverse().map(q => LC_n(q[0]) + ' ' + LC_n(q[1])).join(' L') + ' Z';
  return { d, meio };
})();
barra({id:'orc-vas', cat:'raca', arvore:'Orc Vas', barra:'Fúria', cor:'#C7D46A',
  inicio:5, teto:5, porAcao:2, fim:'inicio', demo:12,
  icone:'<path d="M15.2 3.4C9.4 5.2 5 10.6 4.4 19.6L6.6 20.2C8.4 14.8 14 11.2 20.6 10.4"/><ellipse cx="17.9" cy="6.9" rx="2" ry="4.4" transform="rotate(-38 17.9 6.9)"/><path d="M8.6 10.6L11.6 13.4"/>',
  estado:()=>({sozinho:false}),
  ganhos:[
    {id:'derrubei', c:'Derrubei (0 HP)', t:'Levou um inimigo a 0 HP', v:2,
     bloq:s=> s.sozinho ? 'Sozinho: os golpes não rendem Fúria (nem ao derrubar).' : false},
    {id:'grito', c:'Usei um grito', t:'Usou um grito (habilidade que começa com "Grito."). Uma vez por rodada', v:1, max:1},
    {id:'junto', c:'Golpe com aliado junto', t:'Acertou um golpe com um aliado adjacente a ele ou ao alvo', v:1,
     bloq:s=> s.sozinho ? 'Sozinho: os golpes não rendem Fúria.' : false}],
  face(s, v){
    const c = this.cor, M = LC_CHIFRE.meio;
    let o = '';
    // o berro saindo da boca do berrante
    [[34, .8], [52, .55], [70, .35]].forEach(([r, op]) => { o += `<path d="M${LC_n(138 + r * .45)} ${LC_n(40 - r * .89)} A${r} ${r} 0 0 1 ${LC_n(138 + r * .89)} ${LC_n(40 + r * .45)}" fill="none" stroke="${v >= 10 ? c : '#5A6070'}" stroke-opacity="${op}" stroke-width="4" stroke-linecap="round"/>`; });
    o += KIT.encher('orc-vas', LC_CHIFRE.d, v / 20, c, {base:210, topo:10, fundo:'#22231C', contorno:'#D8D0BC'});
    // aros de metal e a boca do berrante
    [.3, .58, .84].forEach(t => { const q = M[Math.round(t * 32)]; o += `<path d="M${LC_n(q.x + q.nx * (q.w + 2))} ${LC_n(q.y + q.ny * (q.w + 2))} L${LC_n(q.x - q.nx * (q.w + 2))} ${LC_n(q.y - q.ny * (q.w + 2))}" stroke="#9A8F78" stroke-width="5" stroke-linecap="round"/>`; });
    const f = M[32];
    o += `<ellipse cx="${LC_n(f.x)}" cy="${LC_n(f.y)}" rx="${LC_n(f.w)}" ry="9" transform="rotate(${LC_n(Math.atan2(f.ny, f.nx) * 180 / Math.PI)} ${LC_n(f.x)} ${LC_n(f.y)})" fill="${LC_ESC}" stroke="#D8D0BC" stroke-width="2.5"/>`;
    o += `<circle cx="${LC_n(M[0].x)}" cy="${LC_n(M[0].y)}" r="6" fill="#9A8F78"/>`;
    // a horda: aliados a até 3 cédulas (toque para ligar ou desligar)
    const so = s.sozinho;
    let h = `<rect x="128" y="148" width="86" height="64" rx="10" fill="#1E2128" stroke="${so ? LC_LAR : '#4A505C'}" stroke-width="1.6"/>`;
    [[150, 0], [171, -6], [192, 0]].forEach(([x, dy]) => {
      const cr = so ? '#4A505C' : c;
      h += `<circle cx="${x}" cy="${174 + dy}" r="8" fill="${cr}"/><path d="M${x - 13} ${206 + dy * .3} C${x - 13} ${188 + dy} ${x + 13} ${188 + dy} ${x + 13} ${206 + dy * .3} Z" fill="${cr}"/>`;
    });
    if (so) h += `<path d="M134 206 L208 154" stroke="${LC_LAR}" stroke-width="3" stroke-linecap="round"/>`;
    o += KIT.botao('horda', so ? 'Sozinho, sem aliado a até 3 cédulas: toque quando houver aliado perto' : 'Aliado a até 3 cédulas: toque se ficar sozinho', h);
    o += KIT.texto(171, 142, so ? 'Sozinho' : 'Horda', {tam:12, peso:800, cor: so ? LC_LAR : '#C9C3B5'});
    return o;
  },
  dica(s){ return s.sozinho ? `<b>Sozinho</b> <em>· toque quando houver aliado a até 3 cédulas.</em>` : `<b>Horda perto</b> <em>· toque se não houver aliado a até 3 cédulas.</em>`; },
  linha(s){
    if (s.sozinho) return `<b style="color:${LC_LAR}">Sozinho</b> <em>· sem aliado a até 3 cédulas: golpes não rendem Fúria e os bônus da Horda se desligam.</em>`;
    return `<em>Grito precisa de voz e de ser ouvido: Silenciado, não grita; alvo Surdo não é afetado.</em>`;
  },
  acoes(s){ return `<button type="button" data-a="sozinho" aria-pressed="${s.sozinho}" title="Nenhum aliado a até 3 cédulas">${s.sozinho ? '✓ ' : ''}Sem aliado a 3 cédulas</button>`; },
  clique(s, k, ctx){ if (k === 'horda') this.acao(s, 'sozinho', ctx); },
  acao(s, a, ctx){ if (a === 'sozinho'){ s.sozinho = !s.sozinho; ctx.log(s.sozinho ? `${ctx.nome} está sozinho: os golpes não rendem Fúria.` : `${ctx.nome} tem a horda por perto.`); } }
});

/* ===== racas-d.js ===== */
/* =====================================================================
   LOTE D: os Ghouls de Mãzivor (Mãzier'na, Necrosado, Panso'na) e os
   Taekeirs de Pansuna'Raskier (Magi'atach, Marítimo, Nistus'atach,
   Zier'Asurper). Ajudantes com prefixo LD_.
   ===================================================================== */

// ---------- ajudantes do lote D ----------
const LD_HALO = 'stroke="#0E1014" stroke-width="4" stroke-linejoin="round" paint-order="stroke"';
// caminho a partir de segmentos [['M',x,y],['L',x,y],['C',x1,y1,x2,y2,x,y],['Z']]; esp = espelho em x = 110
function LD_caminho(segs, esp){
  return segs.map(([c, ...n]) => c + n.map((q, i) => f1(esp && i % 2 === 0 ? 220 - q : q)).join(' ')).join('');
}
// caminho fechado e liso que passa perto dos pontos
function LD_liso(pts){
  const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], n = pts.length, ini = m(pts[n - 1], pts[0]);
  let d = `M${f1(ini[0])} ${f1(ini[1])}`;
  for (let i = 0; i < n; i++){ const p = pts[i], q = m(p, pts[(i + 1) % n]); d += `Q${f1(p[0])} ${f1(p[1])} ${f1(q[0])} ${f1(q[1])}`; }
  return d + 'Z';
}
const LD_plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const LD_ponto = t => /[.!?]$/.test(t) ? t : t + '.';

// ---------------- Ghoul Mãzier'na: Membros (começa cheia e desce) ----------------
const LD_MZ = {
  // id: [nome, tamanho, custo usual, habilidades, nome curto]
  partes: {
    bracoE: ['Braço esquerdo', 'grande', 8, 'Braço-Bomba ou Braço Errante', 'braço esq.'],
    bracoD: ['Braço direito', 'grande', 8, 'Braço-Bomba ou Braço Errante', 'braço dir.'],
    maoE: ['Mão esquerda', 'media', 4, 'Mão-Bomba ou Mão Rastejante', 'mão esq.'],
    maoD: ['Mão direita', 'media', 4, 'Mão-Bomba ou Mão Rastejante', 'mão dir.'],
    costE: ['Costelas da esquerda', 'media', 5, 'Abraço ou Paliçada de Costelas', 'costelas esq.'],
    costD: ['Costelas da direita', 'media', 5, 'Abraço ou Paliçada de Costelas', 'costelas dir.'],
    pernaE: ['Perna esquerda', 'grande', 8, 'Lança de Fêmur', 'perna esq.'],
    pernaD: ['Perna direita', 'grande', 8, 'Lança de Fêmur', 'perna dir.'],
    peE: ['Pé esquerdo', 'media', 4, 'Pé-Mina', 'pé esq.'],
    peD: ['Pé direito', 'media', 4, 'Pé-Mina', 'pé dir.']
  },
  dono: { maoE: 'bracoE', maoD: 'bracoD', peE: 'pernaE', peD: 'pernaD' },
  junto: { bracoE: 'o braço esquerdo', bracoD: 'o braço direito', pernaE: 'a perna esquerda', pernaD: 'a perna direita' },
  // desenho do lado esquerdo da figura; o direito é o espelho
  forma: {
    braco: [['M', 77, 62], ['L', 55, 99], ['L', 45, 132]],
    perna: [['M', 100, 166], ['L', 94, 188], ['L', 92, 201]],
    pe: [['M', 91, 205], ['L', 75, 210]]
  }
};
const LD_mzFoi = (s, k) => !!(s.perdidas[k] || (LD_MZ.dono[k] && s.perdidas[LD_MZ.dono[k]]));
function LD_mzFalta(s){
  let m = 0, g = 0; const nomes = [];
  for (const k of Object.keys(LD_MZ.partes)){
    if (!s.perdidas[k]) continue;
    const dono = LD_MZ.dono[k]; if (dono && s.perdidas[dono]) continue; // foi junto com o braço ou a perna
    if (LD_MZ.partes[k][1] === 'grande') g++; else m++;
    nomes.push(LD_MZ.partes[k][4]);
  }
  return { m, g, nomes, volta: Math.max(0, 20 - 4 * m - 8 * g) };
}
function LD_mzParte(def, s, k){
  const p = LD_MZ.partes[k], tipo = k.slice(0, -1), esp = k.slice(-1) === 'D', foi = LD_mzFoi(s, k);
  const osso = '#A89A7E', escuro = '#2A2620', cf = s.repor ? def.cor : '#F08A55';
  const falta = (d, w) => `<path d="${d}" fill="none" stroke="${cf}" stroke-opacity=".16" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${cf}" stroke-width="2.2" stroke-dasharray="4 3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  const membro = (d, w) => `<path d="${d}" fill="none" stroke="${osso}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${escuro}" stroke-width="${w - 5}" stroke-linecap="round" stroke-linejoin="round"/>`;
  let alvo = '', vis = '';
  if (tipo === 'braco' || tipo === 'perna' || tipo === 'pe'){
    const segs = LD_MZ.forma[tipo], d = LD_caminho(segs, esp), w = tipo === 'pe' ? 9 : 11;
    alvo = `<path d="${d}" fill="none" stroke="transparent" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>`;
    vis = foi ? falta(d, w) : membro(d, w);
    if (!foi && tipo !== 'pe'){ const x = esp ? 220 - segs[1][1] : segs[1][1]; vis += `<circle cx="${f1(x)}" cy="${segs[1][2]}" r="5.6" fill="${osso}"/>`; }
  } else if (tipo === 'mao'){
    const x = v => f1(esp ? 220 - v : v);
    const dedos = `M${x(41)} 144L${x(36)} 156M${x(45)} 146L${x(44.5)} 159M${x(49)} 144L${x(52)} 155`;
    alvo = `<circle cx="${x(44)}" cy="147" r="14" fill="transparent"/>`;
    vis = foi ? `<circle cx="${x(45)}" cy="139" r="6" fill="${cf}" fill-opacity=".14" stroke="${cf}" stroke-width="2" stroke-dasharray="3 3"/><path d="${dedos}" fill="none" stroke="${cf}" stroke-width="2" stroke-dasharray="3 3" stroke-linecap="round"/>`
      : `<path d="${dedos}" fill="none" stroke="${osso}" stroke-width="3" stroke-linecap="round"/><circle cx="${x(45)}" cy="139" r="6.5" fill="${escuro}" stroke="${osso}" stroke-width="2.6"/>`;
  } else {
    const costelas = [66, 76, 86, 96].map(y => LD_caminho([['M', 104, y], ['C', 94, y - 4, 83, y - 1, 82, y + 9]], esp)).join('');
    alvo = `<path d="${LD_caminho([['M', 79, 60], ['L', 105, 60], ['L', 105, 109], ['L', 79, 109], ['Z']], esp)}" fill="transparent"/>`;
    vis = foi ? `<path d="${costelas}" fill="none" stroke="${cf}" stroke-width="2" stroke-dasharray="3 3" stroke-linecap="round"/>`
      : `<path d="${costelas}" fill="none" stroke="${osso}" stroke-width="3.4" stroke-linecap="round"/>`;
  }
  return KIT.botao(k, `${p[0]} (${foi ? 'falta' : 'parte ' + (p[1] === 'grande' ? 'grande' : 'média')})`, alvo + vis);
}
function LD_mzRepor(s, ctx, como){
  const faltam = Object.keys(LD_MZ.partes).filter(k => s.perdidas[k]);
  if (!faltam.length) return;
  const medias = faltam.filter(k => LD_MZ.partes[k][1] === 'media' && !LD_mzFoi(s, LD_MZ.dono[k] || '-'));
  if (como === 'devorar' && faltam.length === 1 && medias.length === 1){
    delete s.perdidas[medias[0]]; ctx.log(LD_ponto(`${ctx.nome} devorou e repôs: ${LD_MZ.partes[medias[0]][4]}`)); return;
  }
  s.repor = como;
  ctx.aviso(como === 'devorar' ? 'Toque na parte média que volta (tracejada).' : 'Toque na parte que voltou ao lugar.');
}

barra({id:'mazierna', cat:'raca', arvore:"Ghoul Mãzier'na", barra:'Membros', cor:'#EBDDB5',
  inicio:20, teto:5, porAcao:2, demo:13, persiste:['perdidas'],
  icone:'<path d="M8.37 10.6H15.63A2.5 2.5 0 1 1 19.19 12A2.5 2.5 0 1 1 15.63 13.4H8.37A2.5 2.5 0 1 1 4.81 12A2.5 2.5 0 1 1 8.37 10.6Z" transform="rotate(-45 12 12) scale(1.12) translate(-1.3 -1.3)"/>',
  estado:()=>({perdidas:{}, repor:false, custo:''}),
  ganhos:[
    {id:'devorar', c:'Devorei de verdade', t:'Devorar de verdade: devolve 4 e repõe uma parte média. Conta no teto de 5 da rodada, mas passa do limite de 2 por ação', v:4,
     ao:(s, ctx)=>LD_mzRepor(s, ctx, 'devorar')},
    {id:'naco', c:'Peguei 1 de volta', t:'Habilidade da árvore que devolve 1 (Boca de Mãzivor, Juntar os Cacos, Nada se Perde)', v:1},
    {id:'encaixe', c:'Reencaixe', t:'Reencaixe: encaixou de volta uma parte solta adjacente (uma vez por rodada); a marca dela sai', v:2, max:1,
     ao:(s, ctx)=>LD_mzRepor(s, ctx, 'encaixe')}],
  face(s, v){
    const osso = '#A89A7E', escuro = '#2A2620';
    let o = `<rect x="4" y="4" width="212" height="212" rx="16" fill="#0E1014"/>`;
    // ombros e bacia
    o += `<path d="M77 62Q110 53 143 62" fill="none" stroke="${osso}" stroke-width="3.6" stroke-linecap="round"/>`;
    o += `<path d="M89 157Q110 151 131 157L127 167Q110 173 93 167Z" fill="${escuro}" stroke="${osso}" stroke-width="2.4" stroke-linejoin="round"/>`;
    // a coluna é a barra: 20 vértebras, acesas de baixo para cima
    for (let i = 0; i < 20; i++){
      const y = 151 - i * 5.05, w = i % 5 === 4 ? 21 : 13;
      o += `<rect x="${f1(110 - w / 2)}" y="${f1(y - 1.8)}" width="${w}" height="3.6" rx="1.6" fill="${i < v ? this.cor : '#ffffff1a'}"/>`;
    }
    // crânio
    o += `<path d="M93 31C93 12 127 12 127 31C127 37 124 40 122 42V48H98V42C96 40 93 37 93 31Z" fill="${escuro}" stroke="#C9C3B5" stroke-width="2.2" stroke-linejoin="round"/>`;
    o += `<ellipse cx="102.5" cy="30" rx="4.6" ry="5.2" fill="#0E1014"/><ellipse cx="117.5" cy="30" rx="4.6" ry="5.2" fill="#0E1014"/>`;
    o += `<circle cx="102.5" cy="31" r="1.6" fill="${this.cor}"/><circle cx="117.5" cy="31" r="1.6" fill="${this.cor}"/>`;
    o += `<path d="M103 42V48M108 42V48M113 42V48M118 42V48" stroke="#0E1014" stroke-width="1.4"/>`;
    // as partes que se gastam (clicáveis)
    ['costE', 'costD', 'bracoE', 'bracoD', 'maoE', 'maoD', 'pernaE', 'pernaD', 'peE', 'peD'].forEach(k => { o += LD_mzParte(this, s, k); });
    return o;
  },
  dica(s, k, ctx){
    const p = LD_MZ.partes[k], dono = LD_MZ.dono[k];
    if (s.repor) return s.perdidas[k] ? `<b>Repor: ${p[0].toLowerCase()}</b> <em>· toque para ela voltar</em>` : `<em>Escolha uma parte tracejada.</em>`;
    if (dono && s.perdidas[dono]) return `<b>${p[0]}</b> <em>· foi junto com ${LD_MZ.junto[dono]}.</em>`;
    if (s.perdidas[k]) return `<b>${p[0]}: falta</b> <em>· volta ao devorar, no Reencaixe ou no descanso longo.</em>`;
    const c = s.custo ? +s.custo : p[2];
    if (ctx.v < c) return `<b>${p[0]}</b> <em>· custa ${c}:</em> <b style="color:#F08A55">falta Membros.</b>`;
    return `<b>${p[0]}</b> <em>· parte ${p[1] === 'grande' ? 'grande' : 'média'}: −${c} Membros (${p[3]}). Fica marcada.</em>`;
  },
  linha(s){
    if (s.repor) return `<b>Repor uma parte</b> <em>· toque na parte tracejada que volta (devorar repõe uma média).</em>`;
    const f = LD_mzFalta(s);
    if (!f.nomes.length) return `<b>Corpo inteiro</b> <em>· começa em 20 e desce. Toque numa parte para gastá-la; a dica mostra o custo.</em>`;
    const ef = [];
    if (['maoE', 'maoD'].some(k => LD_mzFoi(s, k))) ef.push('sem mão: nada de duas mãos nem escudo');
    if (s.perdidas.bracoE || s.perdidas.bracoD) ef.push('sem braço: só armas de uma mão');
    if (s.perdidas.pernaE || s.perdidas.pernaD) ef.push('sem perna: Lento');
    return `<b>Falta: ${f.nomes.join(', ')}</b> <em>· ${ef.length ? ef.join('; ') + '. ' : ''}No fim do combate volta a ${f.volta}.</em>`;
  },
  acoes(s){
    const cs = [2, 3, 4, 5, 6, 7, 8].map(n => `<option value="${n}" ${s.custo == n ? 'selected' : ''}>Próxima custa ${n}</option>`).join('');
    return `<button type="button" class="gasta" data-a="peq1" title="Dedo, dente, unha ou osso">▼ Parte pequena (1)</button><button type="button" class="gasta" data-a="peq2" title="Dedo, dente, unha ou osso">▼ Parte pequena (2)</button>`
      + `<select data-a="custo" aria-label="Custo da próxima parte média ou grande" title="Para quando a árvore muda o custo (Primeiro Pedaço, Jaula de Costelas)"><option value="">Custo usual</option>${cs}</select>`
      + (s.repor ? `<button type="button" data-a="naorepor">Não repor</button>` : `<button type="button" data-a="descanso" title="Fora do combate: as partes voltam e os Membros vão a 20">Descanso longo</button>`);
  },
  acao(s, a, ctx, val){
    if (a === 'peq1' || a === 'peq2'){
      const n = a === 'peq1' ? 1 : 2;
      if (ctx.v < n) return ctx.aviso(`Falta Membros: a parte pequena custa ${n}.`);
      ctx.perder(n, 'parte pequena');
    }
    if (a === 'custo') s.custo = val;
    if (a === 'naorepor') s.repor = false;
    if (a === 'descanso'){ s.perdidas = {}; s.repor = false; ctx.definir(20, 'descanso longo: o corpo volta inteiro'); }
  },
  clique(s, k, ctx){
    const p = LD_MZ.partes[k], dono = LD_MZ.dono[k];
    if (s.repor){
      if (!s.perdidas[k]) return ctx.aviso('Toque numa parte tracejada.');
      if (dono && s.perdidas[dono]) return ctx.aviso(`Primeiro ${LD_MZ.junto[dono]}.`);
      delete s.perdidas[k]; s.repor = false;
      return ctx.log(LD_ponto(`${ctx.nome} repôs: ${p[4]}`));
    }
    if (dono && s.perdidas[dono]) return ctx.aviso(`${p[0]}: foi junto com ${LD_MZ.junto[dono]}.`);
    if (s.perdidas[k]) return ctx.aviso(`${p[0]}: falta. Sem a parte, não usa a habilidade.`);
    const c = s.custo ? +s.custo : p[2];
    if (ctx.v < c) return ctx.aviso(`Falta Membros: ${p[4]} custa ${c}.`);
    ctx.v -= c; s.perdidas[k] = true; s.custo = '';
    ctx.log(`${ctx.nome} gastou: ${p[4]} (−${c} Membros).`);
  },
  aoComecarTurno(s){ s.repor = false; },
  aoFimCombate(s, ctx){ ctx.v = LD_mzFalta(s).volta; }
});

// ---------------- Ghoul Necrosado: Contágio ----------------
const LD_PRAGAS = ['Doente', 'Envenenado', 'Fraquejado', 'Exausto'];
const LD_NC_MANCHA = LD_liso(Array.from({ length: 18 }, (_, i) => {
  const a = i * 20, r = 92 + 5 * Math.sin(a * Math.PI / 60) + 4 * Math.cos(a * Math.PI / 36);
  return P(110, 96, r, a);
}));

barra({id:'necrosado', cat:'raca', arvore:'Ghoul Necrosado', barra:'Contágio', cor:'#B8D25E',
  inicio:4, teto:5, porAcao:2, demo:11,
  icone:'<circle cx="9" cy="14.5" r="5.6"/><circle cx="17.2" cy="7.4" r="3.4"/><circle cx="18.2" cy="17.6" r="2.2"/><circle cx="7.3" cy="12.7" r="1.2" fill="currentColor" stroke="none"/>',
  estado:()=>({cond:0}),
  ganhos:[
    {id:'cond', c:'Condições em mim', t:'No começo do turno: +1 por condição negativa ativa nele (no máximo +3)', v:1, quando:'inicio', tipo:'auto-n', f:s=>Math.min(3, s.cond)},
    ...LD_PRAGAS.map(n => ({id:'p' + n.toLowerCase(), c:'Praga: ' + n, t:`Uma habilidade desta árvore deixou ${n} um inimigo que ainda não estava`, v:1})),
    {id:'cura', c:'Cura tirou condição', t:'Cura ou purificação tirou uma condição dele: −2 por condição', v:-2, ao:s=>{ if (s.cond) s.cond--; }}],
  face(s, v){
    let o = `<path d="${LD_NC_MANCHA}" fill="#1A2014" stroke="#3F4A2A" stroke-width="2"/>`;
    // a colônia cresce do centro para fora: 20 esporos
    for (let i = 0; i < 20; i++){
      const [x, y] = P(110, 96, 16.4 * Math.sqrt(i + 0.7), i * 137.508), r = 11 - i * 0.14, on = i < v;
      if (i % 5 === 4) o += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r + 3)}" fill="none" stroke="${on ? this.cor : '#ffffff30'}" stroke-width="1.4" stroke-dasharray="2 2.4"/>`;
      o += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${on ? this.cor : '#ffffff0c'}" stroke="${on ? '#2C3518' : '#ffffff26'}" stroke-width="1.3"/>`;
      if (on) o += `<circle cx="${f1(x - r * .34)}" cy="${f1(y - r * .34)}" r="${f1(r * .26)}" fill="#ffffff" opacity=".5"/>`;
    }
    // chagas: condições negativas nele (as 3 primeiras rendem)
    o += KIT.texto(62, 208, 'em mim', {ancora:'end', tam:11, peso:700, cor:'#9FA6B4'});
    for (let j = 0; j < 5; j++){
      const x = 80 + j * 27, cheio = j < s.cond, rende = j < 3;
      o += KIT.botao('c' + j, cheio ? `Condição ${j + 1} nele: tirar` : 'Marcar uma condição nele',
        `<ellipse cx="${x}" cy="204" rx="11" ry="8" fill="${cheio ? '#8E3B4A' : '#1E2128'}" stroke="${cheio ? '#E8E4DA' : rende ? '#7E8594' : '#4A505C'}" stroke-width="1.5" ${rende || cheio ? '' : 'stroke-dasharray="3 2"'}/>`
        + (cheio ? `<circle cx="${x}" cy="204" r="3" fill="${this.cor}"/>` : ''));
    }
    return o;
  },
  dica(s, k){
    const j = +k.slice(1);
    return j < s.cond ? `<b>Condição ${j + 1}</b> <em>· toque quando ela acabar (sem cura).</em>` : `<b>Marcar condição nele</b> <em>· ${j < 3 ? 'rende +1 no começo do turno' : 'passa de 3: não rende mais'}.</em>`;
  },
  linha(s){
    if (!s.cond) return `<em>Toque nas chagas para marcar condições nele: +1 cada no começo do turno (até 3). Temido: −4 em testes sociais.</em>`;
    return `<b>${LD_plural(s.cond, 'condição', 'condições')} em mim</b> <em>· +${Math.min(3, s.cond)} no começo do turno. Cura ou purificação que tira condição dele: −2 cada.</em>`;
  },
  clique(s, k){
    const j = +k.slice(1);
    s.cond = j < s.cond ? s.cond - 1 : Math.min(5, s.cond + 1);
  }
});

// ---------------- Ghoul Panso'na: Fome (patamares 12, 16 e 20) ----------------
const LD_GOSTOS = ['fogo', 'gelo', 'raio', 'trovão', 'veneno', 'ácido', 'corte', 'perfuração', 'contusão', 'luz', 'sombra', 'vento', 'terra', 'doença'];
const LD_PS = [ // [mínimo, nome, efeito]
  [20, 'Cheio', 'Lento, anda 1 cédula a menos, sem reação e −2 em tudo'],
  [16, 'Lento', 'fica Lento e anda 1 cédula a menos'],
  [12, 'Pesado', 'anda 1 cédula a menos'],
  [0, '', '']];
const LD_psPat = v => LD_PS.find(p => v >= p[0]);
function LD_dente(cx, cy, rb, rt, a, w){
  const [x1, y1] = P(cx, cy, rb, a - w), [x2, y2] = P(cx, cy, rb, a + w), [tx, ty] = P(cx, cy, rt, a);
  const [c1x, c1y] = P(cx, cy, (rb + rt) / 2, a - w * .7), [c2x, c2y] = P(cx, cy, (rb + rt) / 2, a + w * .7);
  return `M${f1(x1)} ${f1(y1)}A${rb} ${rb} 0 0 1 ${f1(x2)} ${f1(y2)}Q${f1(c2x)} ${f1(c2y)} ${f1(tx)} ${f1(ty)}Q${f1(c1x)} ${f1(c1y)} ${f1(x1)} ${f1(y1)}Z`;
}

barra({id:'pansona', cat:'raca', arvore:"Ghoul Panso'na", barra:'Fome', cor:'#EE9A80',
  inicio:4, teto:5, porAcao:2, demo:14,
  icone:'<circle cx="12" cy="12" r="9.4"/><path d="M15 3.3L14.1 9.1L19.3 6.5M21.2 12.2L15.4 13.1L19.5 17.3M14.7 20.8L12 15.6L9.3 20.8M4.5 17.3L8.6 13.1L2.8 12.2M4.7 6.5L9.9 9.1L9 3.3"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  estado:()=>({gosto:'', gostoR:0}),
  ganhos:[
    {id:'mordida', c:'Mordida acertou', t:'Acertou uma mordida (golpe corpo a corpo, FOR ou DES). Deixa um Gosto', v:1, ao:(s, ctx)=>ctx.aviso('Novo Gosto? Escolha o tipo abaixo (o mestre diz).')},
    {id:'engolir', c:'Engoli habilidade', t:'Engoliu uma habilidade lançada contra ele. Deixa o Gosto dela', v:2, ao:(s, ctx)=>ctx.aviso('Novo Gosto? Escolha o tipo abaixo (o mestre diz).')},
    {id:'devorar', c:'Devorei de verdade', t:'Devorou de verdade um inimigo derrotado ou um corpo. Deixa o Gosto da criatura', v:2, ao:(s, ctx)=>ctx.aviso('Novo Gosto? Escolha o tipo abaixo (o mestre diz).')}],
  face(s, v){
    const cx = 110, cy = 104, z = LD_psPat(v);
    let o = `<circle cx="${cx}" cy="${cy}" r="96" fill="#3A2420" stroke="#7A5C3E" stroke-width="4"/>`;
    o += `<circle cx="${cx}" cy="${cy}" r="61" fill="#2B1714" stroke="#0E1014" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="33" fill="#1F0F0D" stroke="#0E1014" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="11" fill="#0A0505"/>`;
    // três anéis de dentes: 12 (até Pesado), 4 (até Lento), 4 (até Cheio)
    const aneis = [[12, 93, 66, 13, 15, '#ffffff2e'], [4, 59, 35, 15, 0, '#F08A55AA'], [4, 32, 13, 19, 45, '#E0503CCC']];
    let i = 0;
    for (const [n, rb, rt, w, ini, borda] of aneis) for (let k = 0; k < n; k++, i++){
      const on = i < v;
      o += `<path d="${LD_dente(cx, cy, rb, rt, ini + k * 360 / n, w)}" fill="${on ? this.cor : '#ffffff10'}" stroke="${on ? '#0E1014' : borda}" stroke-width="${on ? 1 : 1.5}" stroke-linejoin="round"/>`;
    }
    // patamar atual no canto (a linha explica)
    if (z[1]) o += KIT.texto(6, 20, z[1], {ancora:'start', tam:14, peso:800, cor: z[0] >= 16 ? '#F08A55' : '#E8E4DA'}) + KIT.texto(6, 34, z[0] === 20 ? '20' : z[0] + '+', {ancora:'start', tam:11, peso:600, cor:'#9FA6B4'});
    // o Gosto embaixo, com as rodadas que faltam
    if (s.gosto){
      o += KIT.texto(104, 215, 'Gosto: ' + s.gosto, {tam:12, peso:700, cor:'#E8E4DA', extra:LD_HALO});
      const xr = 110 + (('Gosto: ' + s.gosto).length * 3.2) + 2;
      for (let r = 0; r < 3; r++) o += `<circle cx="${f1(xr + r * 8)}" cy="211" r="2.8" fill="${r < s.gostoR ? this.cor : '#ffffff22'}"/>`;
    }
    return o;
  },
  linha(s, ctx){
    const z = LD_psPat(ctx.v);
    const g = s.gosto ? `<span style="display:block"><b>Gosto: ${s.gosto}</b> <em>· mais ${LD_plural(s.gostoR, 'rodada', 'rodadas')}</em></span>` : '';
    if (!z[1]) return `<em>Pesado com 12 (anda 1 a menos), Lento com 16, Cheio com 20. Gastar Fome alivia.</em>${g}`;
    return `<b${z[0] >= 16 ? ' style="color:#F08A55"' : ''}>${z[1]}</b> <em>· ${z[2]}. Gastar Fome alivia.</em>${g}`;
  },
  acoes(s){
    return `<select data-a="gosto" aria-label="Gosto (o mestre diz o tipo)" title="O que ele morde, engole ou devora deixa um Gosto por 3 rodadas; um novo troca o antigo"><option value="">${s.gosto ? 'Trocar o Gosto…' : 'Pegou um Gosto…'}</option>${LD_GOSTOS.map(t => `<option value="${t}">Gosto de ${t}</option>`).join('')}${s.gosto ? '<option value="-">Tirar o Gosto</option>' : ''}</select>`;
  },
  acao(s, a, ctx, val){
    if (a !== 'gosto' || !val) return;
    if (val === '-'){ s.gosto = ''; s.gostoR = 0; return; }
    const velho = s.gosto; s.gosto = val; s.gostoR = 3;
    ctx.log(`${ctx.nome} pegou o Gosto de ${val} por 3 rodadas${velho && velho !== val ? ' (o de ' + velho + ' saiu)' : ''}.`);
  },
  aoMudar(s, ctx, antes){
    const a = LD_psPat(antes), n = LD_psPat(ctx.v);
    if (a === n) return;
    ctx.log(n[1] ? `Fome de ${ctx.nome} em ${ctx.v} (${n[1]}): ${n[2]}.` : `${ctx.nome} aliviou a Fome (${ctx.v}): anda normal de novo.`);
  },
  aoComecarTurno(s, ctx){
    if (!s.gostoR) return;
    s.gostoR--;
    if (!s.gostoR){ ctx.log(`O Gosto de ${s.gosto} de ${ctx.nome} passou.`); s.gosto = ''; }
  }
});

// ---------------- Taekeir Magi'atach: Desgaste ----------------
const LD_ARVORE = 'M58 188L80 178L87 150L89 120L76 103L56 85L41 63L31 41L27 28L37 33L46 51L62 72L80 88L92 95L93 70L98 46L104 22L111 31L109 53L108 74L113 92L127 85L146 69L163 49L175 30L184 38L175 57L158 80L141 98L131 112L133 150L140 178L162 188Z';

barra({id:'magiatach', cat:'raca', arvore:"Taekeir Magi'atach", barra:'Desgaste', cor:'#C9B28C',
  inicio:5, teto:5, porAcao:2, demo:12,
  icone:'<path d="M4.5 20.5C8 16.5 12 12.5 19.5 4.5"/><path d="M8.6 16.2L4.4 13.2"/><path d="M12.6 12L18.4 13.4"/><path d="M15.6 8.7L14.2 3.8"/>',
  estado:()=>({terra:0}),
  ganhos:[
    {id:'terra', c:'Terra Morta nova', t:'Uma habilidade dele fez Terra Morta numa cédula que ainda não era (uma vez por habilidade). Soma 1 cédula na conta', v:1, ao:s=>{ s.terra++; }},
    {id:'sugar', c:'Suguei terreno vivo', t:'Sugou vida de terreno vivo: planta, terra fértil, água limpa. Não suga do chão de Terra Morta', v:1}],
  face(s, v){
    let o = `<rect x="4" y="4" width="212" height="212" rx="14" fill="#0E1014"/>`;
    // a seiva roubada sobe pelas raízes até os galhos
    o += KIT.encher('magiatach', LD_ARVORE, v / 20, this.cor, {base:188, topo:24, fundo:'#1E2128', contorno:'#8E8676', traco:2.4});
    o += `<path d="M48 70L36 72M58 82L54 94M152 76L166 80M166 46L178 50M100 40L92 34M33 42L24 44" stroke="#8E8676" stroke-width="2.2" stroke-linecap="round"/>`;
    o += `<path d="M58 188L40 194M162 188L182 193M96 188L92 196M124 188L130 196" stroke="#8E8676" stroke-width="2.4" stroke-linecap="round"/>`;
    // Terra Morta: uma cédula por quadrado
    const mostra = Math.min(s.terra, 7);
    o += KIT.texto(10, 210, 'Terra Morta', {ancora:'start', tam:11, peso:700, cor: s.terra ? '#C9C3B5' : '#7E8594'});
    for (let j = 0; j < 7; j++){
      const x = 80 + j * 18.6, on = j < mostra;
      o += `<rect x="${f1(x)}" y="199" width="16" height="14" rx="2" fill="${on ? '#5B5348' : '#1A1D23'}" stroke="${on ? '#9A9182' : '#2E323B'}" stroke-width="1.2"/>`;
      if (on) o += `<path d="M${f1(x + 3)} 202L${f1(x + 8)} 207L${f1(x + 6)} 211M${f1(x + 8)} 207L${f1(x + 13)} 204" fill="none" stroke="#0E1014" stroke-width="1.2"/>`;
    }
    if (s.terra > 7) o += KIT.texto(211, 193, '+' + (s.terra - 7), {ancora:'end', tam:12, peso:800, cor:'#E8E4DA'});
    return o;
  },
  linha(s){
    if (!s.terra) return `<em>Terra Morta fica até o fim do combate. Nela, inimigos fixam −2 em tudo e as curas de todos valem 20% menos.</em>`;
    return `<b>Terra Morta: ${LD_plural(s.terra, 'cédula', 'cédulas')}</b> <em>· inimigos nela fixam −2 em tudo; curas ali −20%; ele não suga dali.</em>`;
  },
  acoes(s){ return `<button type="button" data-a="tmais" title="Mais uma cédula de Terra Morta (sem ganhar Desgaste)">+1 cédula morta</button><button type="button" data-a="tmenos" ${s.terra ? '' : 'disabled'} title="Tirar uma cédula da conta">−1 cédula</button>`; },
  acao(s, a){
    if (a === 'tmais') s.terra++;
    if (a === 'tmenos' && s.terra) s.terra--;
  }
});

// ---------------- Taekeir Marítimo: Maré (Enchente e Vazante) ----------------
barra({id:'maritimo', cat:'raca', arvore:'Taekeir Marítimo', barra:'Maré', cor:'#6FC6EC',
  inicio:6, teto:5, porAcao:2, demo:11,
  icone:'<path d="M2.5 15.5C5.5 15.5 6.6 8.2 12 7.4C16.4 6.8 19.2 9.6 18 12.6C17.1 14.8 14 14.6 13.8 12.2"/><path d="M2.5 19.5C5.5 17.7 8.5 21.3 12 19.5S18.5 17.7 21.5 19.5"/>',
  estado:()=>({fase:'enchente', agua:true}),
  ganhos:[
    {id:'canto', c:'Canto', t:'Usou um canto (habilidade do ramo Canto). Silenciado, não canta; alvo Surdo não é afetado', v:1},
    {id:'agua', c:'Água perto', t:'Começou o turno na água ou a até 2 cédulas dela (rio, lago, mar, chuva forte, campo aquático)', v:1, quando:'inicio', tipo:'auto', f:s=>s.agua}],
  face(s, v){
    const base = 200, topo = 22, uh = (base - topo) / 20, nivel = base - uh * v, ench = s.fase === 'enchente', seca = ench && !s.agua;
    let o = `<defs><clipPath id="maritimo-q"><rect x="4" y="6" width="212" height="208" rx="14"/></clipPath></defs>`;
    o += `<rect x="4" y="6" width="212" height="208" rx="14" fill="#0E1014"/>`;
    // o mar sobe e desce com a Maré
    let d = `M4 ${f1(nivel)}`;
    for (let x = 4; x <= 220; x += 6) d += `L${x} ${f1(nivel + 3.2 * Math.sin((x - 4) / 36 * Math.PI * 2))}`;
    o += `<path d="${d}L220 216L4 216Z" fill="#1F4E66" opacity=".85" clip-path="url(#maritimo-q)"/>`;
    // a régua de maré: 20 marcas
    o += `<rect x="50" y="${topo - 6}" width="28" height="${base - topo + 12}" rx="3" fill="#1E2128" stroke="#C9C3B5" stroke-width="1.5"/>`;
    for (let i = 0; i < 20; i++){
      const y = base - (i + 1) * uh + 1, w = i % 5 === 4 ? 22 : 13;
      o += `<rect x="53" y="${f1(y)}" width="${w}" height="${f1(uh - 2)}" rx="1" fill="${i < v ? this.cor : APAGADO}"/>`;
    }
    [5, 10, 15, 20].forEach(n => { o += KIT.texto(44, base - n * uh + 4, n, {ancora:'end', tam:11, peso:700, cor:'#9FA6B4'}); });
    o += `<path d="${d}" fill="none" stroke="${this.cor}" stroke-width="2.4" clip-path="url(#maritimo-q)"/>`;
    // a onda da rodada: Enchente sobe, Vazante desce
    const cor = seca ? '#5A6070' : ench ? this.cor : '#A9BCCB', xc = 150;
    const chevron = y => ench ? `M${xc - 24} ${y + 13}L${xc} ${y - 9}L${xc + 24} ${y + 13}` : `M${xc - 24} ${y - 9}L${xc} ${y + 13}L${xc + 24} ${y - 9}`;
    o += `<path d="${chevron(54)}${chevron(80)}" fill="none" stroke="#0E1014" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`;
    o += `<path d="${chevron(54)}${chevron(80)}" fill="none" stroke="${cor}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (seca) o += `<path d="M120 100L180 40" stroke="#F08A55" stroke-width="4" stroke-linecap="round"/>`;
    o += KIT.texto(xc, 124, ench ? 'Enchente' : 'Vazante', {tam:17, peso:800, cor, extra:LD_HALO});
    o += KIT.texto(xc, 146, seca ? 'sem água' : ench ? '+2' : '−2', {tam:seca ? 13 : 18, peso:800, cor: seca ? '#F08A55' : cor, extra:LD_HALO});
    return o;
  },
  linha(s){
    if (s.fase === 'vazante') return `<b>Vazante</b> <em>· rodada par: −2 de Maré no começo do turno. Vale o “Na Vazante:”.</em>`;
    if (!s.agua) return `<b style="color:#F08A55">Enchente sem água</b> <em>· longe da água (mais de 2 cédulas), a Enchente não dá Maré.</em>`;
    return `<b>Enchente</b> <em>· rodada ímpar: +2 de Maré no começo do turno (conta no teto). Vale o “Na Enchente:”.</em>`;
  },
  acoes(s){ return `<button type="button" data-a="agua" aria-pressed="${s.agua}" title="Na água ou a até 2 cédulas dela: rio, lago, mar, chuva forte, campo aquático">${s.agua ? '✓ ' : ''}Água a até 2 cédulas</button>`; },
  acao(s, a, ctx){
    if (a === 'agua'){ s.agua = !s.agua; ctx.log(s.agua ? `${ctx.nome} está perto da água.` : `${ctx.nome} se afastou da água.`); }
  },
  aoComecarTurno(s, ctx){
    s.fase = ctx.rodada % 2 ? 'enchente' : 'vazante';
    if (s.fase === 'vazante') return ctx.perder(2, 'Vazante');
    if (s.agua) ctx.ganhar(2, 'Enchente');
    else ctx.log(`Enchente: ${ctx.nome} está longe da água e não ganha Maré.`);
  }
});

// ---------------- Taekeir Nistus'atach: Essência (+ Ingredientes) ----------------
barra({id:'nistusatach', cat:'raca', arvore:"Taekeir Nistus'atach", barra:'Essência', cor:'#E8AE52',
  inicio:5, teto:5, porAcao:2, demo:9, persiste:['ingr', 'cap'],
  icone:'<path d="M10.2 3.5V9.3A5.8 5.8 0 1 0 13.8 9.3V3.5"/><path d="M8.8 3.5H15.2"/><circle cx="10.4" cy="15.8" r="1.5" fill="currentColor" stroke="none"/><circle cx="13.9" cy="13.2" r="1.1" fill="currentColor" stroke="none"/>',
  estado:()=>({ingr:0, cap:6}),
  ganhos:[
    {id:'presa', c:'Acertei a Marcada', t:'Acertou a presa Marcada', v:1},
    {id:'armadilha', c:'Armadilha disparou', t:'Uma armadilha dele disparou num inimigo', v:1}],
  face(s, v){
    let o = `<rect x="6" y="6" width="208" height="142" rx="10" fill="#221A12" stroke="#8A6E45" stroke-width="2"/>`;
    // a estante: 4 prateleiras de 5 frascos, enche de baixo para cima
    const linhas = [28, 62, 96, 130], cols = [36, 73, 110, 147, 184];
    linhas.forEach(y => { o += `<rect x="12" y="${y + 12}" width="196" height="4" rx="1" fill="#5A4A36"/>`; });
    for (let i = 0; i < 20; i++){
      const y = linhas[3 - Math.floor(i / 5)], x = cols[i % 5], on = i < v;
      o += `<rect x="${x - 4.5}" y="${y - 18}" width="9" height="4" rx="1" fill="#8A6E45"/>`;
      o += `<path d="M${x - 3.6} ${y - 14}V${y - 6.8}A9.6 9.6 0 1 0 ${x + 3.6} ${y - 6.8}V${y - 14}Z" fill="${on ? this.cor : '#ffffff08'}" stroke="${on ? '#F6E2B8' : '#8A7F6E'}" stroke-width="1.3" stroke-linejoin="round"/>`;
      if (on) o += `<circle cx="${x - 3.4}" cy="${y + 0.5}" r="2.2" fill="#fff" opacity=".55"/><circle cx="${x + 3}" cy="${y + 5}" r="1.4" fill="#fff" opacity=".4"/>`;
    }
    // o bornal de Ingredientes
    o += `<rect x="6" y="156" width="208" height="58" rx="10" fill="#2A2118" stroke="#6B5636" stroke-width="1.5"/>`;
    o += KIT.texto(16, 175, 'Ingredientes', {ancora:'start', tam:11.5, peso:700, cor:'#C9B89A'});
    o += KIT.texto(204, 175, `${s.ingr}/${s.cap}`, {ancora:'end', tam:13, peso:800, cor: s.ingr ? '#7FD0BF' : '#F08A55'});
    for (let j = 0; j < 8; j++){
      const x = 24 + j * 24.6, y = 197, cheio = j < s.ingr, livre = j < s.cap;
      const bola = `<circle cx="${f1(x)}" cy="${y}" r="9.5" fill="${cheio ? '#5FB3A3' : livre ? '#1A1410' : 'transparent'}" stroke="${cheio ? '#BFE6DD' : '#6B5636'}" stroke-width="1.4" ${livre ? '' : 'stroke-dasharray="3 2.4"'}/>`
        + (cheio ? `<path d="M${f1(x - 3.4)} ${y + 4}Q${f1(x - 1)} ${y - 6} ${f1(x + 3.4)} ${y - 4.5}Q${f1(x + 0.6)} ${y - 1} ${f1(x - 0.6)} ${y + 4}Z" fill="#0E1014" opacity=".55"/>` : '');
      o += j >= 6 ? KIT.botao('cap' + (j + 1), `Bornal de Couro: até ${j + 1} Ingredientes`, bola + (livre ? '' : KIT.texto(x, y + 4, '+', {tam:12, peso:700, cor:'#6B5636', extra:'pointer-events="none"'}))) : bola;
    }
    return o;
  },
  dica(s, k){
    const n = +k.slice(3);
    return `<b>Bornal de Couro</b> <em>· carrega até ${n} Ingredientes. Toque para ${s.cap >= n ? 'desligar' : 'ligar'}.</em>`;
  },
  linha(s){
    if (!s.ingr) return `<b>Sem Ingredientes</b> <em>· o ramo Alquimia fica vazio. Colher gasta a ação (criatura adjacente que ele abateu).</em>`;
    return `<b>Ingredientes: ${s.ingr}/${s.cap}</b> <em>· a Alquimia gasta Ingredientes além da Essência.</em>`;
  },
  acoes(s){
    return `<select data-a="colher" aria-label="Colher de uma criatura que ele abateu (gasta a ação)"><option value="">Colher (+2, gasta a ação)…</option><option value="1">Criatura pequena: +1 Ingrediente</option><option value="2">Criatura média: +2 Ingredientes</option><option value="3">Criatura grande: +3 Ingredientes</option></select>`
      + `<button type="button" class="gasta" data-a="usa" ${s.ingr ? '' : 'disabled'}>▼ Usei 1 Ingrediente</button><button type="button" data-a="mais" ${s.ingr < s.cap ? '' : 'disabled'}>+1 Ingrediente</button>`;
  },
  acao(s, a, ctx, val){
    if (a === 'colher' && val){
      ctx.ganhar(2, 'colheu da criatura que abateu');
      const antes = s.ingr; s.ingr = Math.min(s.cap, s.ingr + +val);
      ctx.log(`${ctx.nome} colheu: +${s.ingr - antes} ${s.ingr - antes === 1 ? 'Ingrediente' : 'Ingredientes'} (${s.ingr}/${s.cap})${s.ingr - antes < +val ? ', o bornal encheu' : ''}.`);
    }
    if (a === 'usa'){ if (!s.ingr) return ctx.aviso('Sem Ingredientes.'); s.ingr--; ctx.log(`${ctx.nome} usou 1 Ingrediente (${s.ingr} ${s.ingr === 1 ? 'resta' : 'restam'}).`); }
    if (a === 'mais'){ if (s.ingr >= s.cap) return ctx.aviso(`O bornal carrega até ${s.cap}.`); s.ingr++; }
  },
  clique(s, k, ctx){
    const n = +k.slice(3);
    s.cap = s.cap >= n ? n - 1 : n;
    if (s.ingr > s.cap) s.ingr = s.cap;
    ctx.log(`${ctx.nome}: bornal carrega até ${s.cap} Ingredientes.`);
  }
});

// ---------------- Taekeir Zier'Asurper: Sangue ----------------
barra({id:'zierasurper', cat:'raca', arvore:"Taekeir Zier'Asurper", barra:'Sangue', cor:'#F2646E',
  inicio:5, teto:5, porAcao:2, demo:12,
  icone:'<path d="M12 2.8C12 2.8 5.4 10.4 5.4 14.6A6.6 6.6 0 0 0 18.6 14.6C18.6 10.4 12 2.8 12 2.8Z"/><path d="M8.8 15A3.3 3.3 0 0 0 12 18.2"/>',
  estado:()=>({corte:false}),
  ganhos:[
    {id:'sangra', c:'Fiz Sangrar', t:'Uma ação dele deixou um inimigo Sangrando ou o feriu com uma habilidade de sangue (as desta árvore que causam dano)', v:1},
    {id:'corte', c:'Me cortei', t:'Se feriu de propósito: parte do movimento, uma vez por rodada, perde 10% do HP máximo. Se isso o deixaria com 0 HP, não pode', v:2, max:1,
     ao:(s, ctx)=>{ s.corte = true; ctx.log(`${ctx.nome} se cortou: perde 10% do HP máximo.`); }},
    {id:'marca', c:'Marca sangrou', t:'Um inimigo com a Marca de Sangue dele sofreu dano de um aliado', v:1}],
  face(s, v){
    const pele = '#3B2226', borda = '#C9B0B4';
    const dedo = (x, y1, y2, w) => `<rect x="${x - w / 2}" y="${y1}" width="${w}" height="${y2 - y1}" rx="${w / 2}"/>`;
    const corpo = dedo(91, 14, 54, 12) + dedo(104, 7, 50, 12.5) + dedo(117.5, 9, 50, 12.5) + dedo(130.5, 18, 54, 11)
      + `<rect x="84" y="36" width="54" height="44" rx="15"/><rect x="70" y="40" width="12" height="34" rx="6" transform="rotate(-38 76 57)"/><path d="M88 72L77 220H147L134 72Z"/>`;
    let o = `<g fill="${borda}" stroke="${borda}" stroke-width="5" stroke-linejoin="round">${corpo}</g><g fill="${pele}">${corpo}</g>`;
    // 20 cortes do rito no antebraço, de 5 em 5
    for (let i = 0; i < 20; i++){
      const y = 205 - i * 5.1 - Math.floor(i / 5) * 4.6, e = 88 - (y - 72) * 11 / 148 + 9, d = 134 + (y - 72) * 13 / 148 - 9, on = i < v;
      o += `<path d="M${f1(e)} ${f1(y)}Q${f1((e + d) / 2)} ${f1(y + 2.6)} ${f1(d)} ${f1(y - 1.2)}" fill="none" stroke="${on ? this.cor : '#6E4E53'}" stroke-width="${on ? 3 : 1.6}" stroke-linecap="round"/>`;
      if (on && i % 5 === 4) o += `<path d="M${f1(d - 3)} ${f1(y)}q-2.2 4.6 0 6.4q2.2 -1.8 0 -6.4Z" fill="${this.cor}"/>`;
    }
    // a lâmina do rito: suja de sangue se ele já se cortou nesta rodada
    o += `<path d="M186 46L193 66V136H179V66Z" fill="#9FA6B4" stroke="#E8E4DA" stroke-width="1.2" stroke-linejoin="round"/>`;
    if (s.corte) o += `<path d="M186 46L193 66V100Q186 108 179 96V66Z" fill="${this.cor}"/><path d="M186 146q-3 6 0 8.5q3 -2.5 0 -8.5Z" fill="${this.cor}" transform="translate(0 12)"/>`;
    o += `<rect x="170" y="136" width="32" height="7" rx="2" fill="#7A4B3A"/><rect x="181" y="143" width="10" height="34" rx="2" fill="#5C0F14" stroke="#7A4B3A" stroke-width="1.2"/><circle cx="186" cy="182" r="5.5" fill="#7A4B3A"/>`;
    return o;
  },
  linha(s){
    if (s.corte) return `<b>Já se cortou nesta rodada</b> <em>· as habilidades fortes custam também 10–20% do HP; sem HP para pagar, não usa.</em>`;
    return `<em>Cortar-se: +2, uma vez por rodada, −10% do HP máximo. As fortes custam também 10–20% do HP.</em>`;
  },
  acoes(){ return `<select data-a="rito" aria-label="O rito cobrou HP" title="Escreve no chat quanto HP o rito cobrou"><option value="">O rito cobrou HP…</option><option value="10%">10% do HP máximo</option><option value="15%">15% do HP máximo</option><option value="20%">20% do HP máximo</option></select>`; },
  acao(s, a, ctx, val){ if (a === 'rito' && val) ctx.log(`${ctx.nome} pagou ${val} do HP máximo no rito.`); },
  aoComecarTurno(s){ s.corte = false; }
});


/* =====================================================================
   A ligação com as árvores do site: o id da árvore na biblioteca da mesa (o guia de barras, 28/10) e, para as de
   outra mesa, o nome (sem acento, sem maiúscula). As 3 Oradoras dividem a barra das Palavras. A Bênção de Selene não
   cria barra: ela liga a "Verdadeira Forma" na Geada de Selene.
   ===================================================================== */
const ARVORES = {
  samurai: ['azavpm5qd8'], monge: ['aepre92qit'], aegis: ['atohfasuni'], arqueiro: ['adoo8p4p2n'], barbaro: ['aasemzgk9a'],
  bardo: ['ax7d6o6jfd'], bruxo: ['aej0y5ctxn'], espadachim: ['aaev0tstw0'], feiticeiro: ['azmmfke45i'], mago: ['ae54tu1fze'],
  sacerdote: ['a9mhyqvyl5'], shaji: ['abuxa4zrpg'],
  vampiro: ['ayfvz27k70'], licantropo: ['a7va7rq14q'],
  forja: ['aaj23w9sif'], rocha: ['angbo2nlfl'], mercador: ['a8rlqfeak2'], aviario: ['av03t4oglm'], bovino: ['an3234zua9'],
  canino: ['ay0wracl0f'], equino: ['aqimzbe980'], felino: ['a438cnd1ok'], roedor: ['a2tw2rzi61'], mazierna: ['a8vs3ucivi'],
  necrosado: ['a6u9yzd4xi'], pansona: ['agw5w9xxpr'], 'humano-ayto': ['a4zodzwwhi'], espenas: ['aohh40xs89'],
  'humano-natuphas': ['ai8t15wy5m'], sarep: ['a09cgc4afv'], 'humano-vas': ['avubcjih3z'], 'kitsune-ayto': ['axxkqof2k8'],
  hayune: ['a3wu21kjf6'], danca: ['atrwp3vplm'], oradora: ['aijv2xkz3l', 'a24nmazt4x', 'a0j41dk16b'], lotus: ['abn117rgrd'],
  merune: ['anc7t74pn8'], nirus: ['abivun83nh'], selene: ['atehaqx1sg'], konaitos: ['at5llfbjwm'], magiritu: ['a6uy0qcbys'],
  'orc-natuphas': ['aes6lsap36'], rastoroni: ['awbw94n05o'], 'orc-vas': ['a2vms52foj'], silk: ['a847813eqe'],
  magiatach: ['aiwzp5pvi4'], maritimo: ['avi6wkp0m9'], nistusatach: ['a2fjc1iqaf'], zierasurper: ['abtaqznjap']
};
const BENCAO_SELENE = 'aq0onsk37x';
const POR_ID = {};
for (const k of Object.keys(ARVORES)) for (const a of ARVORES[k]) POR_ID[a] = k;
const normNome = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// (os nomes como estão no site, quando diferem do guia)
const APELIDOS = { 'kitsune kare danca': 'danca', 'kitsune kare dancarina': 'danca', 'kare dancarina': 'danca' };
function barraDaArvore(arv){
  if (!arv) return null;
  const id = typeof arv === 'string' ? arv : arv.id;
  if (id && POR_ID[id]) return POR_ID[id];
  const nome = normNome(typeof arv === 'string' ? '' : arv.nome);
  if (!nome) return null;
  if (APELIDOS[nome]) return APELIDOS[nome];
  if (/^(kitsune )?kare oradora\b/.test(nome)) return 'oradora';
  if (/^(kitsune )?kare dancarina\b/.test(nome)) return 'danca';
  const d = BARRAS.find(x => normNome(x.arvore) === nome);
  return d ? d.id : null;
}
// a lista para o mestre escolher (NPC sem ficha): por categoria e nome
const lista = () => BARRAS.slice().sort((a, b) => (['classe', 'raca', 'linhagem'].indexOf(a.cat) - ['classe', 'raca', 'linhagem'].indexOf(b.cat)) || a.arvore.localeCompare(b.arvore, 'pt-BR'))
  .map(d => ({ id: d.id, cat: d.cat, arvore: d.arvore, barra: d.barra, cor: d.cor, npc: !!d.npc }));

const api = {
  BARRAS, BARRA, ICONES, KIT, ARVORES, BENCAO_SELENE,
  barraDaArvore, lista, instancia, guardar, ctxDe, mexer, valorGanho, pendente, aplicar, tocarAgora,
  comecarTurno, terminarTurno, fimDoCombate, painelHTML, desenharPainel, ligarPainel, faceSVG, seloDe, seloHTML,
  svgIcone, iconeSolto, mostra, tetoDe, esc
};
(root.TC || (root.TC = {})).painelBarras = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
