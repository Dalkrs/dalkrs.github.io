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

/* (lote 107) As habilidades da ficha que gastam esta barra (b.habs, que as Cenas montam: [{ id, nome, custo, inverso,
   patamar, desc, usos }]). Usar gasta a barra (ou, na barra que sobe, como a Toxicidade, soma), respeita o patamar que o
   topo exige, conta na mesa ao vivo e, se a habilidade põe algo no mapa (def.mapa[nome]), pede às Cenas. */
function habsHTML(b){
  const L = Array.isArray(b.habs) ? b.habs : [];
  if (!L.length) return '';
  const d = b.def;
  const linhas = L.map((h, i) => {
    const falta = h.inverso ? false : h.custo > b.v, trava = h.patamar && b.v < h.patamar;
    const mapa = d.mapa && d.mapa[h.nome] ? ' <i class="pb-hab-mapa" title="Põe algo no mapa">◈</i>' : '';
    const custo = h.custo ? (h.inverso ? '▲' : '▼') + h.custo : '·';
    return `<button type="button" class="pb-chip pb-hab${(falta || trava) ? ' off' : ''}" data-hab="${i}" title="${esc(h.desc || h.nome)}${trava ? ' (exige ' + h.patamar + ' de ' + d.barra + ')' : falta ? ' (falta ' + d.barra + ')' : ''}">${esc(h.nome)}${mapa} <b>${custo}</b></button>`;
  }).join('');
  return `<div class="pb-caixa pb-habs" data-sem-tags><div class="pb-grupo"><h3>Habilidades</h3><div class="pb-chips">${linhas}</div></div></div>`;
}
function usarHab(ator, b, i){
  const h = (b.habs || [])[i]; if (!h) return;
  mexer(ator, b, ctx => {
    const d = b.def;
    if (h.patamar && b.v < h.patamar) return ctx.aviso(`${h.nome} exige ${h.patamar} de ${d.barra}.`);
    if (!h.inverso && h.custo > b.v) return ctx.aviso(`Falta ${d.barra}: ${h.nome} custa ${h.custo}.`);
    let custo = h.custo;
    if (d.antesDeUsar){ const r = d.antesDeUsar(b.s, h, ctx); if (typeof r === 'number') custo = r; }
    const antes = b.v;
    if (h.inverso) ctx.v = b.v + custo; else ctx.v = b.v - custo;
    const delta = h.inverso ? '+' + (b.v - antes) : '−' + (antes - b.v);
    ctx.log(`${ctx.nome} usou ${h.nome}${custo ? ' (' + delta + ' ' + d.barra + ')' : ''}.`);
    if (d.aoUsar) d.aoUsar(b.s, h, ctx);
    const sp = d.mapa && d.mapa[h.nome];
    if (sp && ator.pedirMapa) ator.pedirMapa(sp, h, b);
  });
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
    ${habsHTML(b)}
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
    if (bt.dataset.hab != null && bt.dataset.hab !== ''){ antes(ator, b); usarHab(ator, b, +bt.dataset.hab); return mudou(ator); }
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

/* =====================================================================
   (lote 107) AS 18 CLASSES E AS 2 LINHAGENS DO MUNDO NOVO (lote 106). Os painéis do mundo antigo saíram.
   Barra de 0 a 20 (a Mão da Cartomante, de 0 a 7), teto de 6 por rodada, patamares em 5, 10 e 15, e o risco em 20.
   Cada classe tem o disco dela (a face), as marcas que se tocam (a postura, o Voto, a forma…), os ganhos "na hora" e o
   que as habilidades põem no mapa (def.mapa: { nome da habilidade: o que pedir às Cenas }).
   O que se pede às Cenas: { k: 'token', nome, cor, tam, vida, turnos, n } ou { k: 'area', fx, forma ('circ' | 'line'),
   r, turnos, n }. As Cenas põem perto do token de quem usou; o jogador arrasta para o lugar certo.
   ===================================================================== */
const TOK = (nome, cor, o = {}) => Object.assign({ k: 'token', nome, cor, tam: 1, vida: 0, turnos: 3, n: 1 }, o);
const AREA = (fx, r, turnos, o = {}) => Object.assign({ k: 'area', fx, forma: 'circ', r, turnos, n: 1 }, o);
const LINHA = (fx, r, turnos, o = {}) => AREA(fx, r, turnos, Object.assign({ forma: 'line' }, o));

// as marcas que se tocam, em volta do centro: [{ k, glifo, rotulo }]; ativo(k) acende a marca
function marcasEmVolta(def, lista, ativo, o = {}){
  const raio = o.raio ?? 58, r = o.r ?? 15, a0 = o.inicio ?? 0;
  return lista.map((m, i) => {
    const [x, y] = P(110, 110, raio, a0 + i * 360 / lista.length), on = ativo(m.k), off = m.trava;
    return KIT.botao(m.k, m.rotulo + (off ? ' (trancada)' : ''), `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${on ? def.cor : '#22262E'}" stroke="${on ? '#fff' : off ? '#4A4E58' : '#6F7684'}" stroke-width="${on ? 2 : 1.3}" ${off ? 'stroke-dasharray="2 2"' : ''}/>
      <text x="${f1(x)}" y="${f1(y + r * .36)}" text-anchor="middle" font-family="${FONTE_SERIF}" font-size="${f1(r * 1.02)}" font-weight="700" fill="${on ? '#0E1014' : off ? '#5A5E68' : '#D8D2C4'}" pointer-events="none">${m.glifo}</text>`);
  }).join('');
}
// o anel da barra com os patamares marcados
function anelComPatamares(def, v, max){
  const pats = def.patamares || [];
  let o = `<circle cx="110" cy="110" r="108" fill="#0E1014"/>` + KIT.anel(v, 94, 106, def.cor, { n: max, gap: max > 10 ? 2.4 : 5 });
  for (const [n] of pats){
    const a = n * 360 / max, [x1, y1] = P(110, 110, 89, a), [x2, y2] = P(110, 110, 108, a);
    o += `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${v >= n ? '#fff' : '#ffffff55'}" stroke-width="2.4" stroke-linecap="round"/>`;
    const [tx, ty] = P(110, 110, 82, a);
    o += KIT.texto(tx, ty + 3.5, n, { tam: 9.5, peso: 800, cor: v >= n ? def.cor : '#8A8578' });
  }
  return o + `<circle cx="110" cy="110" r="78" fill="${def.fundo || '#181B22'}" stroke="#ffffff1a"/>`;
}
const glifoCentro = (def, g, o = {}) => KIT.texto(110, 110 + (o.dy ?? 14), g, { serif: true, tam: o.tam ?? 40, peso: 700, cor: o.cor ?? def.cor, extra: `opacity="${o.op ?? 0.9}"` });
const patAtivos = (def, v) => (def.patamares || []).filter(([n]) => v >= n);

/* Uma classe do mundo novo. d: { id, arvore, barra, cor, icone, inicio, max, teto, cat, patamares: [[n, nome, efeito]],
   risco: [nome, efeito] (no máximo), est(), marcas(s) → [{k, glifo, rotulo, trava}], ativo(s, k), tocar(s, k, ctx),
   arte(s, v) (o que vai no centro), linhaEstado(s, ctx), ganhos, acoes(s), acao(s, a, ctx, val), mapa, aoUsar,
   aoComecarTurno, aoMudar, selo } */
function classe(d){
  const max = d.max ?? 20;
  const def = barra(Object.assign({
    cat: d.cat || 'classe', min: 0, max, inicio: d.inicio ?? 4, teto: d.teto === undefined ? 6 : d.teto, fim: 'inicio', persiste: d.persiste || [],
    estado: () => Object.assign({}, d.est ? d.est() : {}),
    ganhos: (d.ganhos || []).map((g, i) => Object.assign({ id: 'g' + i, quando: 'agora' }, g)),
    face(s, v){
      let o = anelComPatamares(this, v, max);
      o += d.arte ? d.arte.call(this, s, v) : glifoCentro(this, this.glifo || '');
      if (d.marcas) o += marcasEmVolta(this, d.marcas.call(this, s), k => d.ativo ? d.ativo.call(this, s, k) : false, d.marcasOpc || {});
      return o;
    },
    dica(s, k){
      const m = d.marcas ? d.marcas.call(this, s).find(x => x.k === k) : null;
      return m ? `<b>${esc(m.rotulo)}</b> <em>· ${esc(m.dica || (m.trava ? 'trancada: o mestre abre na história' : 'toque para escolher'))}</em>` : '';
    },
    linha(s, ctx){
      const pats = patAtivos(this, ctx.v);
      const est = d.linhaEstado ? d.linhaEstado.call(this, s, ctx) : '';
      const p = pats.length ? `<em>Aceso: ${pats.map(([n, nome, ef]) => `<b>${esc(nome)}</b> (${esc(ef)})`).join('; ')}.</em>` : `<em>Patamares em ${(this.patamares || []).map(x => x[0]).join(', ')}.</em>`;
      const risco = d.risco && ctx.v >= max ? `<br><span class="aviso">${esc(d.risco[0])}: ${esc(d.risco[1])}</span>` : '';
      return (est ? est + '<br>' : '') + p + risco;
    },
    clique(s, k, ctx){ if (d.tocar) d.tocar.call(this, s, k, ctx); },
    acoes(s, ctx){ return d.acoes ? d.acoes.call(this, s, ctx) : ''; },
    acao(s, a, ctx, val){ if (d.acao) d.acao.call(this, s, a, ctx, val); },
    aoMudar(s, ctx, antes){
      for (const [n, nome, ef] of this.patamares || []) if (antes < n && ctx.v >= n) ctx.log(`${ctx.nome} chegou a ${n} de ${this.barra}: ${nome} (${ef}).`);
      if (d.risco && antes < max && ctx.v >= max) ctx.log(`${ctx.nome}, ${this.barra} cheia: ${d.risco[0]} (${d.risco[1]}).`);
      if (d.aoMudar) d.aoMudar.call(this, s, ctx, antes);
    },
    aoComecarTurno(s, ctx){ if (d.aoComecarTurno) d.aoComecarTurno.call(this, s, ctx); },
    aoTerminarTurno(s, ctx){ if (d.aoTerminarTurno) d.aoTerminarTurno.call(this, s, ctx); },
    aoUsar(s, h, ctx){ if (d.aoUsar) d.aoUsar.call(this, s, h, ctx); },
    antesDeUsar: d.antesDeUsar,
    selo: d.selo || null
  }, { id: d.id, arvore: d.arvore, barra: d.barra, cor: d.cor, icone: d.icone, glifo: d.glifo, patamares: d.patamares, mapa: d.mapa || {}, fundo: d.fundo, inverso: !!d.inverso, demo: d.demo ?? 9 }));
  return def;
}
// trocar uma escolha que custa uma vez por turno (a postura do Samurai, a do Monge)
function trocarUmaVez(s, chave, k, ctx, nomes, ganho){
  if (s[chave] === k) return;
  const antes = s[chave];
  if (antes && s.trocou) return ctx.aviso('Só uma troca por turno.');
  s[chave] = k;
  ctx.log(`${ctx.nome} ${antes ? 'trocou para' : 'entrou na'} ${nomes[k]}.`);
  if (antes){ s.trocou = true; if (ganho) ctx.ganhar(ganho, 'troca de postura'); }
}
const escolheAlvo = (rot, a, atual, alvos) => `<label class="pb-sel">${esc(rot)} <select data-a="${a}"><option value="">—</option>${(alvos || []).map(x => `<option value="${esc(x.nome)}" ${x.nome === atual ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select></label>`;
const contarTurnos = (lista, ctx, rotulo) => {
  const fim = [];
  for (const x of lista) { x.t--; if (x.t <= 0) fim.push(x.n || rotulo); }
  if (fim.length) ctx.log(`${ctx.nome}: ${fim.join(', ')} ${fim.length > 1 ? 'acabaram' : 'acabou'}.`);
  return lista.filter(x => x.t > 0);
};

Object.assign(ICONES, {
  // (os desenhos 24x24 de cada barra nova)
  ninja: '<path d="M12 3L14 10L21 12L14 14L12 21L10 14L3 12L10 10Z"/><circle cx="12" cy="12" r="1.6"/>',
  barbaro: '<path d="M12 3.2V21M12 5.2C8.4 4.2 5.4 5.8 4.2 9.8C6.6 8.8 9.4 9.2 12 10.8M12 5.2C15.6 4.2 18.6 5.8 19.8 9.8C17.4 8.8 14.6 9.2 12 10.8"/>',
  espadachim: '<path d="M20.5 3.5L9 15M12 9.6L14.4 12M6 13L11 18M7.5 16.5L4 20"/>',
  monge: '<path d="M17.8 6.4A8 8 0 1 0 19.7 14.2" stroke-width="2.4"/><circle cx="19.6" cy="11" r="1" fill="currentColor" stroke="none"/>',
  aegis: '<path d="M6 3.5H18V14.5C18 17.8 15.4 20 12 21.2C8.6 20 6 17.8 6 14.5Z"/><path d="M12 3.5V21"/>',
  arqueiro: '<path d="M7 3.5C13.5 6.5 13.5 17.5 7 20.5M7 3.5V20.5M3.5 12H20.5M17.6 9.1L20.5 12L17.6 14.9"/>',
  mago: '<path d="M12 6.5C10 5 7 4.6 3.5 5V18.5C7 18.1 10 18.6 12 20C14 18.6 17 18.1 20.5 18.5V5C17 4.6 14 5 12 6.5ZM12 6.5V20"/>',
  feiticeiro: '<path d="M12 3L20 18H4Z"/><circle cx="12" cy="13" r="2.4"/>',
  necromante: '<path d="M6 10A6 6 0 0 1 18 10V15H15V19H9V15H6Z"/><circle cx="9.6" cy="11" r="1.4"/><circle cx="14.4" cy="11" r="1.4"/>',
  druida: '<path d="M12 21V11M12 11C7 11 4.5 7.5 5 3.5C9 3.5 12 6.5 12 11ZM12 14C16 14 19.5 11 19 6.5C15 6.5 12 9.5 12 14Z"/>',
  sacerdote: '<circle cx="12" cy="12" r="3.8"/><path d="M12 2.8V5.6M12 18.4V21.2M2.8 12H5.6M18.4 12H21.2M5.5 5.5L7.5 7.5M16.5 16.5L18.5 18.5M18.5 5.5L16.5 7.5M7.5 16.5L5.5 18.5"/>',
  artifice: '<circle cx="12" cy="12" r="3"/><path d="M12 3V6M12 18V21M3 12H6M18 12H21M5.6 5.6L7.8 7.8M16.2 16.2L18.4 18.4M18.4 5.6L16.2 7.8M7.8 16.2L5.6 18.4"/>',
  alquimista: '<path d="M9.5 3H14.5M10.5 3V9L5 19.5A1.2 1.2 0 0 0 6 21H18A1.2 1.2 0 0 0 19 19.5L13.5 9V3"/><path d="M7.5 15H16.5"/>',
  bardo: '<path d="M9 18V6L19 4V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  shaji: '<path d="M8.4 8.2C5.6 10.2 4.5 13 4.5 15.4C4.5 19 7.6 20.6 12 20.6S19.5 19 19.5 15.4C19.5 13 18.4 10.2 15.6 8.2M8.4 8.2L7 4.2H17L15.6 8.2Z"/>',
  karema: '<path d="M3 9H14A3 3 0 1 0 11 6M3 13H18A3 3 0 1 1 15 16M3 17H10"/>',
  cartomante: '<rect x="6" y="3.5" width="10" height="15" rx="1.5"/><path d="M9 21L19 19L17 6"/><path d="M11 8L12.5 11L11 14L9.5 11Z"/>',
  vampiro: '<path d="M4 6L9 9L12 5L15 9L20 6L17 14L12 20L7 14Z"/>',
  lobisomem: '<path d="M18 5A7.5 7.5 0 1 0 20 15A6 6 0 1 1 18 5Z"/>'
});

/* ---------------- Samurai: as três Posturas ---------------- */
const POST_SAM = { vento: 'Postura do Vento', trovao: 'Postura do Trovão', petalas: 'Postura das Pétalas' };
classe({ id: 'samurai', arvore: 'Samurai', barra: 'Postura', cor: '#D9A441', glifo: '侍', inicio: 4,
  icone: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4C13.7 9.2 13.7 14.8 12 16.6C10.3 14.8 10.3 9.2 12 7.4Z"/>',
  patamares: [[5, 'Lâmina Desperta', 'a postura dá o seu dom'], [10, 'Respiração Certa', 'trocar de postura não gasta movimento'], [15, 'Kiai', 'o próximo golpe tem +1 no número do efeito e não pode ser aparado']],
  risco: ['Lâmina Transbordante', 'inimigos com escolha atacam você'],
  est: () => ({ postura: null, trocou: false }),
  marcas: () => [{ k: 'vento', glifo: '風', rotulo: 'Postura do Vento', dica: '+1 célula; enche andando e atacando' },
                 { k: 'trovao', glifo: '雷', rotulo: 'Postura do Trovão', dica: 'Dano +1 com duas mãos; enche atacando parado' },
                 { k: 'petalas', glifo: '花', rotulo: 'Postura das Pétalas', dica: 'Defesa +1 a você e a um aliado colado; enche protegendo' },
                 { k: 'sombras', glifo: '影', rotulo: 'Postura das Sombras', trava: true }],
  marcasOpc: { raio: 54, r: 16, inicio: -45 },
  ativo: (s, k) => s.postura === k,
  arte(s){ return `<path d="M110 62 L148 84 L148 136 L110 158 L72 136 L72 84 Z" fill="none" stroke="#ffffff22" stroke-width="2"/>` + glifoCentro(this, s.postura ? { vento: '風', trovao: '雷', petalas: '花' }[s.postura] : '侍', { tam: 34 }); },
  tocar(s, k, ctx){ if (k === 'sombras') return ctx.aviso('A Postura das Sombras só um mestre escondido ensina.'); trocarUmaVez(s, 'postura', k, ctx, POST_SAM, 1); },
  linhaEstado: s => s.postura ? `<b>${POST_SAM[s.postura]}</b>${s.trocou ? ' <em>· já trocou neste turno</em>' : ''}` : '<em>Fora de postura: toque numa marca para entrar.</em>',
  ganhos: [{ c: 'Andou e atacou', t: 'Vento: andou 2 ou mais células e atacou', v: 2, bloq: s => s.postura !== 'vento' && 'Só na Postura do Vento.' },
           { c: 'Atacou parado', t: 'Trovão: atacou sem ter se movido', v: 3, bloq: s => s.postura !== 'trovao' && 'Só na Postura do Trovão.' },
           { c: 'Desviou ou protegeu', t: 'Pétalas: desviou, aparou ou recebeu um golpe por alguém', v: 3, bloq: s => s.postura !== 'petalas' && 'Só na Postura das Pétalas.' }],
  aoComecarTurno(s){ s.trocou = false; },
  aoUsar(s, h, ctx){ const k = /Vento/.test(h.nome) && /Postura/.test(h.nome) ? 'vento' : /Postura do Trovão/.test(h.nome) ? 'trovao' : /Postura das Pétalas/.test(h.nome) ? 'petalas' : null; if (k && s.postura !== k){ s.postura = k; ctx.log(`${ctx.nome} entrou na ${POST_SAM[k]}.`); } },
  selo: s => s.postura ? { vento: '風', trovao: '雷', petalas: '花' }[s.postura] : null,
  mapa: { 'Jardim de Lâminas': AREA('espinhos', 2, 1), 'Tempestade de Pétalas': AREA('vento', 3, 1), 'Muralha Florida': AREA('circuloProtecao', 3, 1), 'Tufão de Aço': AREA('vento', 2, 1), 'Fincar a Espada': AREA('terra', 2, 1) }
});

/* ---------------- Ninja: Selos e sombra ---------------- */
classe({ id: 'ninja', arvore: 'Ninja', barra: 'Jutsu', cor: '#8C9BE0', glifo: '忍', inicio: 4,
  patamares: [[5, 'Passo Mudo', 'andar não te revela'], [10, 'Olhos de Noite', 'você vê no escuro e na fumaça'], [15, 'Selo Completo', 'o próximo jutsu sai sem gastar a ação']],
  risco: ['Sombra Cheia', 'você aparece como silhueta e não se esconde até gastar'],
  est: () => ({ escondido: false, selos: 0 }),
  marcas: s => [{ k: 'esc', glifo: '隠', rotulo: s.escondido ? 'Escondido (toque para aparecer)' : 'Ficar Escondido', dica: 'golpes com Dano +1 enquanto ninguém te vê' },
                { k: 'selo', glifo: '印', rotulo: 'Selos de mão', dica: 'no lugar de andar: +3 e o próximo jutsu ganha o bônus do ramo' }],
  marcasOpc: { raio: 56, r: 17, inicio: -90 },
  ativo: (s, k) => (k === 'esc' && s.escondido) || (k === 'selo' && s.selos > 0),
  arte(s){ return `<path d="M110 70 L118 102 L150 110 L118 118 L110 150 L102 118 L70 110 L102 102 Z" fill="${s.escondido ? '#ffffff10' : '#ffffff20'}" stroke="${this.cor}" stroke-width="1.6"/>` + glifoCentro(this, '忍', { tam: 26, dy: 9 }); },
  tocar(s, k, ctx){
    if (k === 'esc'){ s.escondido = !s.escondido; ctx.log(`${ctx.nome} ${s.escondido ? 'some nas sombras' : 'aparece'}.`); }
    if (k === 'selo'){ if (s.selos) return ctx.aviso('Os selos já estão feitos neste turno.'); s.selos = 1; ctx.ganhar(3, 'selos de mão'); }
  },
  linhaEstado: s => `${s.escondido ? '<b>Escondido</b> <em>· Dano +1</em>' : '<em>À vista.</em>'}${s.selos ? ' · <b>Selos feitos</b>' : ''}`,
  ganhos: [{ c: 'Atacou sem ser visto', t: 'Escondido, pelas costas ou de um flanco', v: 3 }, { c: 'Pôs Sangramento ou Veneno', t: 'Cada camada ou dose', v: 1, max: 3 }],
  aoComecarTurno(s){ s.selos = 0; },
  selo: s => (s.escondido ? '隠' : null),
  mapa: { 'Bomba de Fumaça': AREA('fumaca', 2, 2), 'Clone de Sombra': TOK('Clone de Sombra', '#3A3F55', { turnos: 2 }), 'Exército de Sombras': TOK('Sombra', '#3A3F55', { turnos: 2, n: 4 }),
    'Nuvem Verde': AREA('toxica', 2, 2), 'Fumaça Amarela': AREA('toxica', 3, 2), 'Cegueira da Noite': AREA('escuridao', 3, 2), 'Ayto-Abso — A Noite Sem Lua': AREA('escuridao', 4, 2) }
});

/* ---------------- Bárbaro: a Guarda Aberta ---------------- */
classe({ id: 'barbaro', arvore: 'Bárbaro', barra: 'Sangue Quente', cor: '#D9503F', glifo: '怒', inicio: 4,
  patamares: [[5, 'Pele Vermelha', 'Dano +1 corpo a corpo'], [10, 'Coração de Tambor', 'medo e encanto contra você têm -2'], [15, 'Cabeça Quente', 'pode abrir a guarda duas vezes no turno']],
  risco: ['Fervura', 'no fim do turno, Dano 1 em você se não gastar'],
  est: () => ({ guarda: false, abriu: 0 }),
  marcas: s => [{ k: 'guarda', glifo: s.guarda ? '開' : '閉', rotulo: s.guarda ? 'Fechar a guarda' : 'Abrir a guarda', dica: 'aberta: Defesa -2, golpes com Dano +1, +3 de barra ao abrir' }],
  marcasOpc: { raio: 0, r: 30 },
  ativo: (s, k) => k === 'guarda' && s.guarda,
  arte(){ return `<path d="M110 40 L132 80 L120 80 L140 120 L122 120 L110 170 L98 120 L80 120 L100 80 L88 80 Z" fill="#ffffff12" stroke="#ffffff22"/>`; },
  tocar(s, k, ctx){
    if (k !== 'guarda') return;
    if (s.guarda){ s.guarda = false; return ctx.log(`${ctx.nome} fecha a guarda.`); }
    const lim = ctx.v >= 15 ? 2 : 1;
    if (s.abriu >= lim) return ctx.aviso('A guarda só abre no começo do turno (duas vezes com 15 ou mais).');
    s.guarda = true; s.abriu++; ctx.ganhar(3, 'abriu a guarda');
  },
  linhaEstado: s => s.guarda ? '<b>Guarda aberta</b> <em>· Defesa -2, Dano +1</em>' : '<em>Guarda fechada.</em>',
  ganhos: [{ c: 'Levou golpe aberto', t: 'Levou um golpe com a guarda aberta', v: 2, bloq: s => !s.guarda && 'Só com a guarda aberta.' }, { c: 'Derrubou ou empurrou', t: 'Um golpe seu derrubou ou empurrou alguém', v: 1 }],
  aoComecarTurno(s){ s.abriu = 0; },
  aoTerminarTurno(s, ctx){ if (ctx.v >= 20) ctx.log(`${ctx.nome} ferve: Dano 1 (Fervura).`); },
  selo: s => (s.guarda ? '開' : null),
  mapa: { 'Golpe no Chão': AREA('terra', 2, 1) }
});

/* ---------------- Espadachim: o Escolhido ---------------- */
classe({ id: 'espadachim', arvore: 'Espadachim', barra: 'Ímpeto', cor: '#7FA7D9', glifo: '剣', inicio: 5,
  patamares: [[5, 'Ritmo', '+1 no acerto contra o Escolhido'], [10, 'Domínio', 'trocar de Escolhido é de graça'], [15, 'Momento', 'o próximo golpe no Escolhido é crítico']],
  risco: ['Arrogância', 'o Escolhido ganha +1 no acerto contra você'],
  est: () => ({ escolhido: '' }),
  arte(s){ return `<path d="M64 156 L156 64" stroke="#C9C3B5" stroke-width="5" stroke-linecap="round"/><path d="M76 132 L88 144" stroke="${this.cor}" stroke-width="7" stroke-linecap="round"/>`
    + (s.escolhido ? KIT.texto(110, 176, esc(s.escolhido.slice(0, 16)), { tam: 11, cor: this.cor }) : ''); },
  linhaEstado: s => s.escolhido ? `<b>Escolhido: ${esc(s.escolhido)}</b> <em>· Defesa +1 contra ele</em>` : '<em>Sem Escolhido: aponte a lâmina para um inimigo.</em>',
  acoes(s, ctx){ return escolheAlvo('Escolhido', 'esc', s.escolhido, ctx.ator.alvos); },
  acao(s, a, ctx, val){ if (a === 'esc' && val !== s.escolhido){ s.escolhido = val || ''; if (val) ctx.log(`${ctx.nome} aponta a lâmina para ${val}: o Escolhido.`); } },
  ganhos: [{ c: 'Acertou o Escolhido', v: 3 }, { c: 'Errou você por pouco', t: 'O atacante errou por 2 ou menos', v: 2 }, { c: 'Finta, desarme ou proteção', v: 1 },
           { c: 'Turno sem atacar', t: 'Terminou o turno sem atacar nem aparar', v: -3, quando: 'fim', tipo: 'tg' }],
  selo: s => (s.escolhido ? '剣' : null)
});

/* ---------------- Monge: Montanha, Rio e Chama ---------------- */
const POST_MON = { montanha: 'Postura da Montanha', rio: 'Postura do Rio', chama: 'Postura da Chama' };
classe({ id: 'monge', arvore: 'Monge', barra: 'Chi', cor: '#7FB7A8', glifo: '気', inicio: 5,
  patamares: [[5, 'Corpo Leve', '+1 célula, anda por paredes curtas'], [10, 'Mente Calma', 'quem tenta controlar a sua mente tem -2 no teste'], [15, 'Centro', 'a próxima troca de postura cura 2']],
  risco: ['Transbordar', 'o chi brilha e você não se esconde'],
  est: () => ({ postura: null, trocou: false }),
  marcas: () => [{ k: 'montanha', glifo: '山', rotulo: POST_MON.montanha, dica: 'aguenta: Defesa +1, Vigor +2' }, { k: 'rio', glifo: '川', rotulo: POST_MON.rio, dica: 'desvia e devolve: Esquiva +1' }, { k: 'chama', glifo: '火', rotulo: POST_MON.chama, dica: 'o chi sai do corpo: golpes de luz' }],
  marcasOpc: { raio: 54, r: 17, inicio: 0 },
  ativo: (s, k) => s.postura === k,
  arte(s){ return glifoCentro(this, '気', { tam: 30, dy: 10 }); },
  tocar(s, k, ctx){ const cura = ctx.v >= 15 && s.postura && s.postura !== k && !s.trocou; trocarUmaVez(s, 'postura', k, ctx, POST_MON, 0); if (cura) ctx.log(`${ctx.nome}: Centro, Cura 2 na troca.`); },
  linhaEstado: s => s.postura ? `<b>${POST_MON[s.postura]}</b>${s.trocou ? ' <em>· já trocou nesta rodada</em>' : ' <em>· trocar é uma reação de graça</em>'}` : '<em>Fora de postura.</em>',
  ganhos: [{ c: 'Golpe errou você', t: 'Um golpe errou você ou você desviou', v: 3 }, { c: 'Devolveu o golpe', t: 'Acertou quem te atacou desde o seu último turno', v: 2 }, { c: 'Meditou o turno', t: 'Passou o turno só se defendendo (Defesa +2)', v: 4, max: 1 }],
  aoComecarTurno(s){ s.trocou = false; },
  aoUsar(s, h, ctx){ const k = /Postura da Montanha/.test(h.nome) ? 'montanha' : /Postura do Rio/.test(h.nome) ? 'rio' : /Postura da Chama/.test(h.nome) ? 'chama' : null; if (k){ s.postura = k; ctx.log(`${ctx.nome} entrou na ${POST_MON[k]}.`); } },
  selo: s => (s.postura ? { montanha: '山', rio: '川', chama: '火' }[s.postura] : null),
  mapa: { 'Lótus de Luz': AREA('cura', 3, 2), 'Sino de Bronze': AREA('circuloProtecao', 2, 2), 'Terremoto de Palma': AREA('terra', 2, 1) }
});

/* ---------------- Aégis: o Voto ---------------- */
const VOTOS = { proteger: 'Proteger', recuar: 'Não Recuar', passa: 'Ninguém Passa' };
classe({ id: 'aegis', arvore: 'Aégis', barra: 'Juramento', cor: '#D9B44A', glifo: '盾', inicio: 5,
  patamares: [[5, 'Selo de Calastiel', 'o Protegido tem Defesa +1'], [10, 'Palavra Firme', 'quem tenta controlar a mente de você ou do Protegido tem -2 no teste'], [15, 'Juramento Vivo', 'o próximo golpe recebido por alguém cai pela metade']],
  risco: ['Peso do Voto', 'quebrar o Voto agora tira a barra inteira'],
  est: () => ({ voto: null, protegido: '', quebrou: false }),
  marcas: () => [{ k: 'proteger', glifo: '護', rotulo: 'Voto: Proteger', dica: 'um aliado vira o Protegido' }, { k: 'recuar', glifo: '不', rotulo: 'Voto: Não Recuar', dica: 'você não sai do lugar por vontade própria' }, { k: 'passa', glifo: '止', rotulo: 'Voto: Ninguém Passa', dica: 'nenhum inimigo cruza a sua linha' }],
  marcasOpc: { raio: 54, r: 17, inicio: 0 },
  ativo: (s, k) => s.voto === k,
  arte(){ return `<path d="M84 72H136V112C136 130 124 142 110 148C96 142 84 130 84 112Z" fill="#ffffff10" stroke="${this.cor}" stroke-width="2"/>`; },
  tocar(s, k, ctx){ if (s.voto && s.voto !== k) return ctx.aviso('O Voto é um só por luta. Quebrar o Voto é com o botão abaixo.'); if (!s.voto){ s.voto = k; ctx.log(`${ctx.nome} faz o Voto: ${VOTOS[k]}.`); } },
  linhaEstado: s => (s.voto ? `<b>Voto: ${VOTOS[s.voto]}</b>${s.voto === 'proteger' && s.protegido ? ` <em>· Protegido: ${esc(s.protegido)}</em>` : ''}` : '<em>Sem Voto: escolha um no disco.</em>') + (s.quebrou ? '<br><span class="aviso">Voto quebrado: Defesa -1 até a penitência.</span>' : ''),
  acoes(s, ctx){ return (s.voto === 'proteger' ? escolheAlvo('Protegido', 'prot', s.protegido, ctx.ator.aliados) : '') + (s.voto ? `<button type="button" data-a="quebrar" title="A barra cai a 0 e Defesa -1 até a penitência">Quebrei o Voto</button>` : '') + (s.quebrou ? `<button type="button" data-a="penitencia">Cumpri a penitência</button>` : ''); },
  acao(s, a, ctx, val){
    if (a === 'prot'){ s.protegido = val || ''; if (val) ctx.log(`${ctx.nome} jura proteger ${val}.`); }
    if (a === 'quebrar'){ s.quebrou = true; ctx.definir(0, 'quebrou o Voto'); ctx.log(`${ctx.nome} quebrou o Voto: Defesa -1 até cumprir a penitência.`); }
    if (a === 'penitencia'){ s.quebrou = false; ctx.log(`${ctx.nome} cumpriu a penitência.`); }
  },
  ganhos: [{ c: 'Recebeu golpe por aliado', v: 3 }, { c: 'Cumpriu o Voto', t: 'Cumpriu o Voto neste turno', v: 2, quando: 'fim', tipo: 'tg', bloq: s => !s.voto && 'Faça um Voto primeiro.' }, { c: 'Bloqueou com escudo', v: 1 }],
  persiste: ['quebrou'],
  selo: s => (s.voto ? { proteger: '護', recuar: '不', passa: '止' }[s.voto] : null),
  mapa: { 'Linha que Não Se Cruza': LINHA('barreira', 3, 2), 'Escudo de Calastiel': AREA('circuloProtecao', 2, 2), 'Bandeira': TOK('Bandeira', '#D9B44A', { tam: 0.5, turnos: 2 }), 'Fortaleza': AREA('circuloProtecao', 1, 1), 'Muralha Jurada': AREA('circuloProtecao', 2, 1) }
});

/* ---------------- Arqueiro: a Flecha na Corda ---------------- */
const FLECHAS = { vas: ['火', 'Flecha de Vas (fogo)'], nirus: ['根', 'Flecha de Nirus (raiz)'], yana: ['光', 'Flecha de Yana (luz que cura)'], napha: ['氷', 'Flecha de Napha (gelo)'], kare: ['風', 'Flecha de Karê (vento)'], snir: ['雷', 'Flecha de Snir (trovão)'], rede: ['網', 'Flecha de Rede'] };
classe({ id: 'arqueiro', arvore: 'Arqueiro', barra: 'Foco', cor: '#8FBF5A', glifo: '弓', inicio: 4,
  patamares: [[5, 'Olho Fino', '+1 no acerto a 6 células ou mais'], [10, 'Vento Lido', 'cobertura leve não protege o alvo'], [15, 'Respiração Presa', 'o próximo tiro é crítico se você não andou']],
  risco: ['Corda Tensa', 'andar mais de 2 células tira 5 de barra'],
  est: () => ({ corda: null }),
  marcas: () => Object.entries(FLECHAS).map(([k, [g, n]]) => ({ k, glifo: g, rotulo: n, dica: 'deixar na corda: sai no próximo turno sem gastar a ação de preparar' })),
  marcasOpc: { raio: 58, r: 14, inicio: 0 },
  ativo: (s, k) => s.corda === k,
  arte(){ return `<path d="M92 66 C126 84 126 136 92 154" fill="none" stroke="#C9C3B5" stroke-width="3"/><path d="M92 66 V154" stroke="#C9C3B5" stroke-width="1"/><path d="M84 110 H142 M134 104 L142 110 L134 116" fill="none" stroke="${this.cor}" stroke-width="2.4"/>`; },
  tocar(s, k, ctx){ if (s.corda === k){ s.corda = null; return ctx.log(`${ctx.nome} tira a flecha da corda.`); } s.corda = k; ctx.log(`${ctx.nome} deixa ${FLECHAS[k][1]} na corda.`); },
  linhaEstado: s => (s.corda ? `<b>Na corda: ${FLECHAS[s.corda][1]}</b>` : '<em>Nenhuma flecha especial na corda.</em>'),
  ganhos: [{ c: 'Mirou (não andou)', t: 'Não andou no turno anterior', v: 3, quando: 'inicio', tipo: 'tg' }, { c: 'Acertou a 6+', t: 'Acertou um alvo a 6 células ou mais', v: 2 }, { c: 'Armadilha disparou', v: 2 }, { c: 'Tiro que protegeu', t: 'Tiro de Cobertura ou de Aviso', v: 1 }],
  selo: s => (s.corda ? FLECHAS[s.corda][0] : null),
  mapa: { 'Armadilha': AREA('chaoEspinhos', 0.5, 10), 'Campo Minado': AREA('chaoEspinhos', 0.5, 10, { n: 3 }), 'Mina de Fogo': AREA('oleo', 0.5, 10), 'Companheiro': TOK('Fera', '#8B6B4A', { vida: 10, turnos: 20 }),
    'Chuva de Flechas': AREA('tempestade', 3, 1), 'Chuva Elemental': AREA('fogo', 2, 1), 'Rede': AREA('teia', 1, 1), 'Flecha que Cura Todos': AREA('cura', 2, 1), 'Armadilha Elemental': AREA('gelado', 0.5, 10) }
});

/* ---------------- Mago: as Palavras ---------------- */
const PALAVRAS = { vas: ['火', 'Vas (fogo)'], napha: ['氷', 'Napha (gelo)'], snir: ['雷', 'Snir (trovão)'], natu: ['土', 'Natu (terra)'], simphus: ['水', 'Simphus (água)'], kare: ['風', 'Karê (vento)'], nirus: ['木', 'Nirus (planta)'], yana: ['光', 'Yana (luz)'], ayto: ['影', 'Ayto (sombra)'] };
classe({ id: 'mago', arvore: 'Mago', barra: 'Preparo', cor: '#7FA4F5', glifo: '魔', inicio: 6,
  patamares: [[5, 'Língua Solta', 'magias de 1 Palavra custam 1 a menos'], [10, 'Gramática', 'pode juntar 2 Palavras numa magia'], [15, 'Sufixo -ni', 'a próxima magia tem +1 no número do efeito e o dobro da área']],
  risco: ['Excesso', 'a próxima magia tem 1 chance em 6 de sair descontrolada'],
  est: () => ({ palavra: null, ultima: null, trocouPalavra: false }),
  marcas: () => Object.entries(PALAVRAS).map(([k, [g, n]]) => ({ k, glifo: g, rotulo: n, dica: 'a Palavra da magia deste turno' })),
  marcasOpc: { raio: 60, r: 13.5, inicio: 0 },
  ativo: (s, k) => s.palavra === k,
  arte(s){ return `<circle cx="110" cy="110" r="34" fill="none" stroke="#ffffff22" stroke-dasharray="3 4"/>` + glifoCentro(this, s.palavra ? PALAVRAS[s.palavra][0] : '魔', { tam: 30, dy: 10 }); },
  tocar(s, k, ctx){
    if (s.palavra === k) return;
    s.palavra = k; ctx.log(`${ctx.nome} diz ${PALAVRAS[k][1]}.`);
    if (s.ultima && s.ultima !== k && !s.trocouPalavra){ s.trocouPalavra = true; ctx.ganhar(1, 'Palavra diferente da última'); }
  },
  aoTerminarTurno(s){ if (s.palavra) s.ultima = s.palavra; s.palavra = null; },
  aoComecarTurno(s){ s.trocouPalavra = false; },
  linhaEstado: s => (s.palavra ? `<b>Palavra: ${PALAVRAS[s.palavra][1]}</b>` : '<em>Toque na Palavra da magia deste turno.</em>') + (s.ultima ? ` <em>· a última foi ${PALAVRAS[s.ultima][1]}</em>` : ''),
  ganhos: [{ c: 'Estudou o campo', t: 'Passou o turno estudando, sem atacar', v: 3, max: 1 }, { c: 'Ponto fraco', t: 'A magia acertou o elemento contrário', v: 2 }],
  selo: s => (s.palavra ? PALAVRAS[s.palavra][0] : null),
  mapa: { 'Chão em Chamas': AREA('fogo', 1, 2), 'Chão de Gelo': AREA('gelado', 1.5, 2), 'Natu — Muro de Pedra': LINHA('muralhaNatu', 3, 2), 'Fortaleza de Natu': AREA('muralhaNatu', 2, 2), 'Fonte': AREA('cura', 1, 3),
    'Escuridão': AREA('escuridao', 3, 2), 'Portal': AREA('portal', 1, 2), 'Silêncio': AREA('silencio', 2, 1), 'Inferno': AREA('fogo', 3, 2), 'Napha-ni — Tempestade de Gelo': AREA('nevasca', 3, 1),
    'Vas-ni — Coluna de Fogo': AREA('fogo', 0.5, 1), 'Abso\'-Vas — O Sol Caído': AREA('fogo', 4, 6), 'Natu-ni — A Montanha Desperta': TOK('Gigante de Pedra', '#8B8178', { tam: 2, vida: 20, turnos: 2 }), 'Fogo e Pedra': LINHA('muralhaNatu', 3, 2) }
});

/* ---------------- Feiticeiro: o Preço ---------------- */
classe({ id: 'feiticeiro', arvore: 'Feiticeiro', barra: 'Pacto', cor: '#C37BDB', glifo: '契', inicio: 5,
  patamares: [[5, 'Sussurro', 'Defesa +1 contra o primeiro golpe de cada turno'], [10, 'Marca Visível', 'maldições têm +1 no teste'], [15, 'Voz do Patrono', 'a próxima magia tem +1 no número do efeito e alcance dobrado']],
  risco: ['Dívida', 'o patrono quer algo agora: se não gastar, perde 2 de Vida no fim do turno'],
  est: () => ({ promessas: 0 }),
  marcas: s => [{ k: 'vida', glifo: '血', rotulo: 'Preço: 2 de Vida (+3)', dica: 'tire 2 de Vida na ficha' }, { k: 'memoria', glifo: '憶', rotulo: 'Preço: uma lembrança (+5)', dica: 'o mestre escolhe qual' }, { k: 'promessa', glifo: '約', rotulo: `Preço: uma promessa (+4)${s.promessas ? ' · ' + s.promessas + ' em aberto' : ''}`, dica: 'cumprir até o fim da sessão' }],
  marcasOpc: { raio: 54, r: 17, inicio: -60 },
  ativo: (s, k) => k === 'promessa' && s.promessas > 0,
  arte(){ return `<path d="M110 68 L148 140 H72 Z" fill="#ffffff0e" stroke="${this.cor}" stroke-width="2"/><circle cx="110" cy="118" r="10" fill="none" stroke="${this.cor}" stroke-width="2"/>`; },
  tocar(s, k, ctx){
    if (k === 'vida'){ ctx.ganhar(3, 'pagou 2 de Vida', { foraTeto: false }); ctx.log(`${ctx.nome} paga 2 de Vida ao patrono.`); }
    if (k === 'memoria'){ ctx.ganhar(5, 'pagou uma lembrança'); ctx.log(`O patrono leva uma lembrança de ${ctx.nome} (o mestre diz qual).`); }
    if (k === 'promessa'){ s.promessas++; ctx.ganhar(4, 'fez uma promessa'); }
  },
  linhaEstado: s => (s.promessas ? `<b>${s.promessas} ${s.promessas > 1 ? 'promessas' : 'promessa'} em aberto</b>` : '<em>Toque num Preço para pagar.</em>'),
  acoes(s){ return s.promessas ? `<button type="button" data-a="cumpriu">Cumpri uma promessa</button><button type="button" data-a="quebrou" title="A barra zera e o patrono fica em silêncio">Quebrei uma promessa</button>` : ''; },
  acao(s, a, ctx){ if (a === 'cumpriu' && s.promessas){ s.promessas--; ctx.log(`${ctx.nome} cumpriu uma promessa ao patrono.`); } if (a === 'quebrou' && s.promessas){ s.promessas--; ctx.definir(0, 'quebrou uma promessa'); ctx.log(`O patrono de ${ctx.nome} fica em silêncio.`); } },
  persiste: ['promessas'],
  ganhos: [{ c: 'Maldição pegou', v: 2 }, { c: 'Disse o nome do patrono', t: 'Antes de uma magia', v: 1, max: 1 }],
  aoTerminarTurno(s, ctx){ if (ctx.v >= 20) ctx.log(`Dívida: o patrono cobra 2 de Vida de ${ctx.nome}.`); },
  mapa: { 'Imp': TOK('Imp', '#8E3B3B', { tam: 0.5, vida: 3, turnos: 3 }), 'Portão Menor': TOK('Demônio', '#6E2A2A', { vida: 8, turnos: 2 }), 'Portão Maior': TOK('Demônio Grande', '#5A1E1E', { tam: 2, vida: 20, turnos: 2 }),
    'Altar de Bolso': TOK('Altar', '#C37BDB', { tam: 0.5, turnos: 2 }), 'Círculo Sagrado': AREA('consagrado', 2, 2), 'Chuva de Brasas': AREA('brasas', 3, 1), 'Legião de Lamentos': AREA('espiritos', 3, 1), 'Deus que Desce': TOK('Avatar do Patrono', '#E8D9F0', { tam: 2, turnos: 1 }) }
});

/* ---------------- Necromante: os Frascos de Alma ---------------- */
classe({ id: 'necromante', arvore: 'Necromante', barra: 'Almas', cor: '#9FB8B0', glifo: '死', inicio: 3,
  patamares: [[5, 'Frio na Sala', 'espíritos ficam visíveis para você'], [10, 'Mão Firme', 'mortos-vivos seus têm Dano +1'], [15, 'Porta Entreaberta', 'a próxima magia de alma tem +1 no número do efeito']],
  risco: ['Fome do Vazio', 'fanáticos do Vazio sentem você'],
  est: () => ({ frascos: 0, maxF: 3 }),
  marcas: s => Array.from({ length: s.maxF }, (_, i) => ({ k: 'f' + i, glifo: i < s.frascos ? '魂' : '·', rotulo: i < s.frascos ? 'Frasco cheio: gastar (+4 de Almas)' : 'Frasco vazio', dica: i < s.frascos ? 'vale 4 de barra, ou uma pergunta ao morto' : 'guarde uma alma quando alguém cair perto' })),
  marcasOpc: { raio: 56, r: 14, inicio: -90 },
  ativo: (s, k) => +k.slice(1) < s.frascos,
  arte(){ return glifoCentro(this, '死', { tam: 28, dy: 10 }); },
  tocar(s, k, ctx){ const i = +k.slice(1); if (i >= s.frascos) return ctx.aviso('Frasco vazio.'); s.frascos--; ctx.ganhar(4, 'gastou um frasco de alma', { foraTeto: true }); },
  linhaEstado: s => `<b>${s.frascos} de ${s.maxF} frascos</b>`,
  acoes(s){ return `<button type="button" data-a="guardar" ${s.frascos >= s.maxF ? 'disabled' : ''}>Guardar uma alma</button><button type="button" data-a="maisf" title="Frasco a Mais">+1 frasco</button>`; },
  acao(s, a, ctx){ if (a === 'guardar' && s.frascos < s.maxF){ s.frascos++; ctx.log(`${ctx.nome} guarda uma alma num frasco.`); } if (a === 'maisf' && s.maxF < 5){ s.maxF++; } },
  persiste: ['frascos', 'maxF'],
  ganhos: [{ c: 'Alguém caiu perto', t: 'Alguém caiu ou morreu a até 6 células', v: 3 }, { c: 'Alma afrouxou', t: 'Um inimigo passou de metade da Vida para baixo perto de você', v: 2 }, { c: 'Morto-vivo derrubou', v: 2 }],
  selo: s => (s.frascos ? '魂' + s.frascos : null),
  mapa: { 'Levantar Ossos': TOK('Esqueleto', '#D8D2C4', { vida: 4, turnos: 3 }), 'Zumbi Pesado': TOK('Zumbi', '#6F7F5A', { vida: 8, turnos: 3 }), 'Horda': TOK('Esqueleto', '#D8D2C4', { vida: 4, turnos: 3, n: 3 }),
    'Cavaleiro de Ossos': TOK('Cavaleiro de Ossos', '#B8B0A0', { vida: 10, turnos: 3 }), 'Abominação': TOK('Abominação', '#7A5A5A', { tam: 2, vida: 16, turnos: 2 }), 'O Rei-sem-coroa': TOK('Rei-sem-coroa', '#C9B36A', { vida: 16, turnos: 2 }),
    'Mãos da Terra': AREA('maldicao', 2, 1), 'Chuva de Ossos': AREA('terra', 2, 1) }
});

/* ---------------- Druida: as Formas ---------------- */
const FORMAS_DR = { urso: ['熊', 'Urso de Casca', 3], lobo: ['狼', 'Lobo de Musgo', 3], serpente: ['蛇', 'Serpente de Raiz', 3], grifo: ['鷲', 'Grifo Verde', 3], behemoth: ['巨', 'Behemoth', 2], espirito: ['霊', 'Grande Espírito', 2] };
classe({ id: 'druida', arvore: 'Druida', barra: 'Seiva', cor: '#7FC66A', glifo: '森', inicio: 5,
  patamares: [[5, 'Raiz Funda', 'em terra viva, não pode ser empurrado'], [10, 'Pele Verde', 'Cura 1 no começo do turno'], [15, 'Coração da Mata', 'a próxima Forma dura o dobro e sai de graça']],
  risco: ['Floresta Viva', 'plantas prendem quem estiver colado (Vigor) até você gastar'],
  est: () => ({ forma: null, turnos: 0 }),
  marcas: () => Object.entries(FORMAS_DR).map(([k, [g, n]]) => ({ k, glifo: g, rotulo: 'Forma: ' + n, dica: 'entra pela habilidade da Forma; toque na forma atual para sair' })),
  marcasOpc: { raio: 58, r: 14, inicio: 0 },
  ativo: (s, k) => s.forma === k,
  arte(s){ return glifoCentro(this, s.forma ? FORMAS_DR[s.forma][0] : '森', { tam: 30, dy: 10 }) + (s.forma ? KIT.texto(110, 136, s.turnos + (s.turnos === 1 ? ' turno' : ' turnos'), { tam: 10, cor: '#C9C3B5' }) : ''); },
  tocar(s, k, ctx){ if (s.forma === k){ s.forma = null; s.turnos = 0; return ctx.log(`${ctx.nome} sai da forma.`); } ctx.aviso('Para entrar numa Forma, use a habilidade dela abaixo.'); },
  aoUsar(s, h, ctx){
    const k = Object.keys(FORMAS_DR).find(x => h.nome.includes(FORMAS_DR[x][1]));
    if (k){ s.forma = k; s.turnos = FORMAS_DR[k][2] * (ctx.v >= 15 ? 2 : 1); ctx.log(`${ctx.nome} vira ${FORMAS_DR[k][1]} por ${s.turnos} turnos.`); }
  },
  aoComecarTurno(s, ctx){ if (s.forma){ s.turnos--; if (s.turnos <= 0){ ctx.log(`A forma de ${FORMAS_DR[s.forma][1]} de ${ctx.nome} acaba.`); s.forma = null; } } },
  linhaEstado: s => (s.forma ? `<b>Em Forma: ${FORMAS_DR[s.forma][1]}</b> <em>· não fala nem usa Raiz ou Seiva</em>` : '<em>Na forma de gente.</em>'),
  ganhos: [{ c: 'Curou ou fez crescer', v: 3 }, { c: 'Em Forma', t: 'No fim de cada turno em Forma', v: 2, quando: 'fim', tipo: 'auto', f: s => !!s.forma }, { c: 'Terra viva', t: 'Começou o turno em mato, campo, pântano ou floresta', v: 1, quando: 'inicio', tipo: 'tg' }],
  selo: s => (s.forma ? FORMAS_DR[s.forma][0] : null),
  mapa: { 'Muro de Espinhos': LINHA('chaoEspinhos', 3, 2), 'Raízes que Prendem': AREA('raizesNirus', 1, 1), 'Chão Mole': AREA('lama', 2, 2), 'Árvore Escudo': TOK('Árvore', '#3F7A46', { vida: 10, turnos: 2 }),
    'Floresta Instantânea': AREA('bosqueNirus', 4, 3), 'Espinheiro': AREA('chaoEspinhos', 2, 1), 'Mata que Anda': TOK('Árvore Viva', '#3F7A46', { tam: 2, vida: 14, turnos: 2 }), 'Bando': TOK('Lobo de Musgo', '#5E7F4A', { vida: 5, turnos: 2, n: 3 }),
    'Chuva de Vida': AREA('cura', 3, 1), 'Árvore da Vida': TOK('Árvore da Vida', '#C9B36A', { turnos: 3 }), 'Flor da Calma': AREA('esporos', 2, 1), 'Rachar a Terra': LINHA('terra', 4, 1), 'Ab\'Nirus — A Mata Desperta': AREA('raizesNirus', 6, 2) }
});

/* ---------------- Sacerdote: a Prece ---------------- */
classe({ id: 'sacerdote', arvore: 'Sacerdote', barra: 'Graça', cor: '#F0D27A', glifo: '聖', inicio: 6,
  patamares: [[5, 'Auréola', 'aliados colados têm +1 nos testes contra medo'], [10, 'Mãos Quentes', 'toda cura sua cura 1 a mais'], [15, 'Céu Aberto', 'a próxima Prece completa cura 2 o grupo a 3 células']],
  risco: ['Brilho Demais', 'inimigos com escolha te atacam primeiro'],
  est: () => ({ prece: false, pronta: false }),
  marcas: s => [{ k: 'prece', glifo: '祈', rotulo: s.prece ? 'Prece em andamento (toque se foi interrompida)' : 'Começar uma Prece', dica: 'sai no começo do próximo turno com +1 no número do efeito' }],
  marcasOpc: { raio: 0, r: 30 },
  ativo: (s, k) => s.prece || s.pronta,
  arte(){ let o = ''; for (let i = 0; i < 12; i++){ const [x1, y1] = P(110, 110, 40, i * 30), [x2, y2] = P(110, 110, 70, i * 30); o += `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="#ffffff1c" stroke-width="2"/>`; } return o; },
  tocar(s, k, ctx){
    if (s.prece){ s.prece = false; return ctx.log(`A Prece de ${ctx.nome} foi interrompida.`); }
    s.prece = true; ctx.log(`${ctx.nome} começa uma Prece (sai no próximo turno).`);
  },
  aoComecarTurno(s, ctx){ if (s.prece){ s.prece = false; s.pronta = true; ctx.ganhar(3, 'Prece completa', { foraTeto: true }); ctx.log(`A Prece de ${ctx.nome} sai agora com +1 no número do efeito${ctx.v >= 15 ? ' e Cura 2 no grupo a 3 células' : ''}.`); } else s.pronta = false; },
  antesDeUsar(s, h, ctx){ if (s.pronta){ s.pronta = false; ctx.log(`(${h.nome} sai como Prece: +1 no número do efeito.)`); } },
  linhaEstado: s => (s.prece ? '<b>Rezando</b> <em>· levar Dano 3 ou mais pede teste de CAN</em>' : s.pronta ? '<b>Prece pronta</b> <em>· a próxima habilidade sai com +1 no número do efeito</em>' : '<em>Toque no centro para começar uma Prece.</em>'),
  ganhos: [{ c: 'Curou quem estava mal', t: 'Curou alguém abaixo de metade da Vida', v: 3 }, { c: 'Tirou uma condição', v: 2 }],
  selo: s => (s.prece ? '祈' : null),
  mapa: { 'Círculo de Cura': AREA('cura', 3, 1), 'Fonte de Luz': AREA('sagrado', 1, 3), 'Selo de Luz': AREA('seloYana', 2, 3), 'Amanhecer': AREA('sagrado', 4, 2), 'Farol': AREA('luzLanterna', 4, 2),
    'Muralha Sagrada': AREA('circuloProtecao', 3, 1), 'Santuário': AREA('consagrado', 1, 1), 'Sol na Mão': AREA('sagrado', 3, 1), 'Lança de Yanira': LINHA('sagrado', 4, 1), 'Yana-ni — A Luz Primeira': AREA('sagrado', 8, 1) }
});

/* ---------------- Artífice: as Engenhocas ---------------- */
classe({ id: 'artifice', arvore: 'Artífice', barra: 'Engrenagem', cor: '#C9A13B', glifo: '機', inicio: 5,
  patamares: [[5, 'Engrenado', 'engenhocas têm Defesa +1'], [10, 'Sobrecarga', 'a próxima engenhoca dispara duas vezes no primeiro turno'], [15, 'Máquina Perfeita', 'a próxima engenhoca sai sem custo e dura o dobro']],
  risco: ['Superaquecimento', 'se não gastar, a engenhoca mais perto explode (Dano 2 em quem estiver colado)'],
  est: () => ({ eng: [] }),
  arte(s){
    let o = `<circle cx="110" cy="110" r="22" fill="none" stroke="${this.cor}" stroke-width="3"/>`;
    for (let i = 0; i < 8; i++){ const [x1, y1] = P(110, 110, 22, i * 45), [x2, y2] = P(110, 110, 32, i * 45); o += `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${this.cor}" stroke-width="6"/>`; }
    s.eng.forEach((e, i) => { const [x, y] = P(110, 110, 56, i * 90 - 45); o += `<rect x="${f1(x - 11)}" y="${f1(y - 11)}" width="22" height="22" rx="4" fill="#22262E" stroke="${this.cor}"/>` + KIT.texto(x, y + 4, e.t, { tam: 11, cor: '#E8E4DA' }); });
    return o;
  },
  linhaEstado: s => (s.eng.length ? `<b>${s.eng.length} ${s.eng.length > 1 ? 'engenhocas' : 'engenhoca'} no mapa</b> <em>· ${s.eng.map(e => e.n + ' (' + e.t + ')').join(', ')}</em>` : '<em>Nenhuma engenhoca no mapa (até 3; Mestre da Engenhoca, 4).</em>'),
  aoUsar(s, h, ctx){ const sp = this.mapa[h.nome]; if (sp && sp.k === 'token' && /Torreta|Engenhoca|Escudo de Campo|Aranha|Golem|Fábrica/.test(h.nome)){ s.eng.push({ n: sp.nome, t: sp.turnos }); if (s.eng.length > 4) s.eng.shift(); } },
  aoComecarTurno(s, ctx){ s.eng = contarTurnos(s.eng, ctx, 'engenhoca'); },
  acoes(s){ return s.eng.length ? `<button type="button" data-a="ajustar" title="Passar o turno ajustando: +3 e todas ganham +1 turno">Ajustar as máquinas</button>` : ''; },
  acao(s, a, ctx){ if (a === 'ajustar'){ s.eng.forEach(e => { e.t++; }); ctx.ganhar(3, 'ajustou as máquinas'); } },
  ganhos: [{ c: 'Engenhoca agiu', v: 2 }, { c: 'Consertou ou ativou relíquia', v: 1 }],
  selo: s => (s.eng.length ? '機' + s.eng.length : null),
  mapa: { 'Torreta': TOK('Torreta', '#8A7A4A', { tam: 0.5, vida: 5, turnos: 3 }), 'Escudo de Campo': TOK('Escudo de Campo', '#5A7AA0', { tam: 0.5, vida: 5, turnos: 3 }), 'Aranha Espiã': TOK('Aranha Espiã', '#6A6A6A', { tam: 0.5, vida: 1, turnos: 10 }),
    'Engenhoca de Cura': TOK('Engenhoca de Cura', '#6FA07A', { tam: 0.5, vida: 5, turnos: 3 }), 'Mina Saltadora': AREA('runas', 0.5, 10), 'Golem Pequeno': TOK('Golem', '#8A7050', { vida: 10, turnos: 3 }), 'Rede Elétrica': LINHA('aguaEletrica', 3, 2),
    'Fábrica': TOK('Fábrica', '#7A6A4A', { vida: 8, turnos: 2 }), 'Cúpula': AREA('barreira', 2, 2), 'O Grande Golem': TOK('Grande Golem', '#B08A40', { tam: 2, vida: 24, turnos: 2 }), 'Torreta de Relíquia': TOK('Torreta de Relíquia', '#A04A4A', { tam: 0.5, vida: 5, turnos: 3 }),
    'Barreira Antiga': LINHA('barreira', 4, 2), 'Campo de Força': AREA('circuloProtecao', 2, 2), 'Bomba de Engrenagem': AREA('fogo', 1, 1) }
});

/* ---------------- Alquimista: a Toxicidade (sobe ao usar) ---------------- */
classe({ id: 'alquimista', arvore: 'Alquimista', barra: 'Toxicidade', cor: '#B7D86A', glifo: '錬', inicio: 0, teto: null, inverso: true,
  patamares: [[5, 'Olhos Brilhantes', 'bombas com Dano +1'], [10, 'Suor Químico', 'poções curam 1 a mais; Defesa -1'], [15, 'À Beira', 'a próxima criação tem +1 no número do efeito; no fim do turno, teste VIT ou perde 2 de Vida']],
  risco: ['Passar Mal', 'você perde o próximo turno e a barra cai a 10'],
  est: () => ({ cinto: 4, mal: false, usou: false }),
  marcas: s => Array.from({ length: 4 }, (_, i) => ({ k: 'c' + i, glifo: i < s.cinto ? '瓶' : '·', rotulo: i < s.cinto ? 'Frasco preparado' : 'Laço vazio', dica: 'um frasco preparado sobe 1 a menos de Toxicidade (o painel usa sozinho)' })),
  marcasOpc: { raio: 56, r: 14, inicio: -45 },
  ativo: (s, k) => +k.slice(1) < s.cinto,
  arte(s, v){ return KIT.encher('alq', 'M96 70 H124 V96 L146 140 Q148 148 140 148 H80 Q72 148 74 140 L96 96 Z', v / 20, this.cor, { base: 148, topo: 70, n: 4, fundo: '#1E2128', traco: 2 }); },
  antesDeUsar(s, h, ctx){ s.usou = true; if (s.cinto > 0 && h.custo > 0){ s.cinto--; ctx.log(`(${ctx.nome} usa um frasco preparado: sobe 1 a menos.)`); return Math.max(0, h.custo - 1); } },
  aoMudar(s, ctx, antes){ if (ctx.v >= 20 && antes < 20) s.mal = true; },
  aoComecarTurno(s, ctx){ if (s.mal){ s.mal = false; ctx.definir(10, 'passou mal'); ctx.aviso('Passou mal: perde este turno.'); } },
  aoTerminarTurno(s, ctx){ if (!s.usou && ctx.v > 0) ctx.perder(3, 'turno sem usar nada'); s.usou = false; },
  acoes(s){ return `<button type="button" data-a="cinto" title="Fora da luta: prepara os 4 frascos">Preparar o cinto</button>`; },
  acao(s, a, ctx){ if (a === 'cinto'){ s.cinto = 4; ctx.log(`${ctx.nome} prepara o cinto: 4 frascos.`); } },
  persiste: ['cinto'],
  linhaEstado: s => (s.mal ? '<span class="aviso">Passou mal.</span>' : `<b>${s.cinto} de 4 frascos preparados</b> <em>· a barra desce 3 no fim do turno em que você não usa nada</em>`),
  ganhos: [],
  mostra: null,
  mapa: { 'Névoa de Cura': AREA('cura', 2, 2), 'Bomba de Fumaça': AREA('fumaca', 2, 2), 'Bomba Grudenta': AREA('teia', 2, 1), 'Mina Química': AREA('oleo', 0.5, 10), 'Bomba de Gelo': AREA('gelado', 1, 1),
    'Bomba de Fogo': AREA('fogo', 1, 1), 'Chão de Pedra': AREA('terra', 1.5, 10), 'Água em Ácido': AREA('acida', 2, 2), 'Golem de Barro': TOK('Golem de Barro', '#8A6A4A', { vida: 10, turnos: 2 }),
    'Chuva de Poções': AREA('cura', 3, 1), 'Bomba de Napha': AREA('nevasca', 2, 1), 'Barragem': AREA('fogo', 1, 1, { n: 4 }), 'A Grande Explosão': AREA('fogo', 3, 1), 'Grande Ferrugem': AREA('acida', 3, 1) }
});

/* ---------------- Bardo: a Música e o ritmo ---------------- */
const ACOES_BARDO = { cancao: ['歌', 'Canção'], danca: ['舞', 'Dança'], palavra: ['言', 'Palavra'], golpe: ['撃', 'Golpe'] };
classe({ id: 'bardo', arvore: 'Bardo', barra: 'Ritmo', cor: '#F2B544', glifo: '歌', inicio: 5,
  patamares: [[5, 'Compasso', 'a Música alcança +2 células'], [10, 'Refrão', 'pode manter duas Músicas'], [15, 'Crescendo', 'a próxima Música entra com +1 no número do efeito']],
  risco: ['Plateia Inteira', 'você não se esconde e todo inimigo sabe onde está'],
  est: () => ({ musica: [], acao: null, ultima: null }),
  marcas: () => Object.entries(ACOES_BARDO).map(([k, [g, n]]) => ({ k, glifo: g, rotulo: 'Ação do turno: ' + n, dica: 'variar a ação enche +2' })),
  marcasOpc: { raio: 56, r: 16, inicio: -45 },
  ativo: (s, k) => s.acao === k,
  arte(s){ return `<path d="M100 132V84L130 78V124" fill="none" stroke="${this.cor}" stroke-width="3"/><circle cx="94" cy="132" r="7" fill="${this.cor}"/><circle cx="124" cy="126" r="7" fill="${this.cor}"/>`; },
  tocar(s, k, ctx){
    if (s.acao) return ctx.aviso('A ação deste turno já foi marcada.');
    s.acao = k;
    if (s.ultima && s.ultima !== k) ctx.ganhar(2, 'variou a ação'); else ctx.log(`${ctx.nome}: ${ACOES_BARDO[k][1]}${s.ultima === k ? ' de novo (não enche)' : ''}.`);
  },
  aoComecarTurno(s){ if (s.acao) s.ultima = s.acao; s.acao = null; },
  aoUsar(s, h, ctx){ if ((h.usos || []).includes('postura')){ const lim = ctx.v >= 10 ? 2 : 1; s.musica = s.musica.filter(m => m !== h.nome).concat(h.nome).slice(-lim); ctx.log(`Toca agora: ${s.musica.join(' e ')}.`); } },
  acoes(s){ return s.musica.length ? `<button type="button" data-a="parar">A Música parou</button><button type="button" class="gasta" data-a="interrompido" title="Atordoado, silenciado ou derrubado: −4">Fui interrompido (−4)</button>` : ''; },
  acao(s, a, ctx){ if (a === 'parar'){ s.musica = []; ctx.log(`A Música de ${ctx.nome} para.`); } if (a === 'interrompido'){ s.musica = []; ctx.perder(4, 'interrompido'); } },
  linhaEstado: s => (s.musica.length ? `<b>Tocando: ${esc(s.musica.join(' e '))}</b> <em>· manter custa o movimento</em>` : '<em>Nenhuma Música tocando.</em>') + (s.ultima ? `<br><em>A última ação foi ${ACOES_BARDO[s.ultima][1]}.</em>` : ''),
  ganhos: [{ c: 'Aliado acertou com a Música', v: 2, bloq: s => !s.musica.length && 'Só com uma Música tocando.' }, { c: 'Inimigo falhou contra você', v: 1 }],
  selo: s => (s.musica.length ? '♪' : null),
  mapa: { 'Dança da Tempestade': AREA('vento', 2, 1), 'Canção de Ninar': AREA('esporos', 3, 1) }
});

/* ---------------- Shaji: Distraído ---------------- */
classe({ id: 'shaji', arvore: 'Shaji', barra: 'Malandragem', cor: '#D99A5B', glifo: '遊', inicio: 5,
  patamares: [[5, 'Mão Leve', 'furtar e trocar itens com aliados é ação de movimento'], [10, 'Rosto Comum', 'ninguém te ataca primeiro se houver outro alvo à mesma distância'], [15, 'Golpe de Mestre', 'o próximo golpe em alvo Distraído é crítico']],
  risco: ['Fama de Rua', 'alguém te reconhece: o mestre traz um credor, rival ou guarda depois da luta'],
  est: () => ({ distraidos: [], escondido: false }),
  marcas: s => [{ k: 'esc', glifo: '隠', rotulo: s.escondido ? 'Escondido (toque para aparecer)' : 'Sumir da vista', dica: '+2 ao sumir da vista de todos' }],
  marcasOpc: { raio: 56, r: 16, inicio: 135 },
  ativo: (s, k) => k === 'esc' && s.escondido,
  arte(s){ let o = glifoCentro(this, '遊', { tam: 26, dy: 4 }); s.distraidos.slice(0, 4).forEach((d, i) => { o += KIT.texto(110, 128 + i * 12, esc(d.n.slice(0, 14)), { tam: 9.5, cor: this.cor }); }); return o; },
  tocar(s, k, ctx){ if (k === 'esc'){ s.escondido = !s.escondido; if (s.escondido) ctx.ganhar(2, 'sumiu da vista'); else ctx.log(`${ctx.nome} aparece.`); } },
  acoes(s, ctx){ return escolheAlvo('Deixar Distraído', 'dist', '', ctx.ator.alvos) + (s.distraidos.length ? `<button type="button" data-a="limpar">Ninguém mais Distraído</button>` : ''); },
  acao(s, a, ctx, val){ if (a === 'dist' && val && !s.distraidos.some(d => d.n === val)){ s.distraidos.push({ n: val, t: 2 }); ctx.log(`${val} está Distraído (Defesa -1).`); } if (a === 'limpar') s.distraidos = []; },
  aoComecarTurno(s, ctx){ s.distraidos = contarTurnos(s.distraidos, ctx, 'Distraído'); },
  linhaEstado: s => (s.distraidos.length ? `<b>Distraídos:</b> ${esc(s.distraidos.map(d => d.n).join(', '))} <em>· Defesa -1</em>` : '<em>Ninguém Distraído.</em>') + (s.escondido ? ' · <b>Escondido</b>' : ''),
  ganhos: [{ c: 'Enganou alguém', t: 'Finta, mentira ou truque que pegou', v: 3 }, { c: 'Acertou um Distraído', v: 2 }],
  selo: s => (s.escondido ? '隠' : s.distraidos.length ? '遊' : null),
  mapa: { 'Chuva de Moedas': AREA('cristais', 3, 1), 'Saída Secreta': TOK('Saída Secreta', '#6A5A4A', { tam: 0.5, turnos: 5 }) }
});

/* ---------------- Karê'mã: as Correntes ---------------- */
classe({ id: 'karema', arvore: "Karê'mã", barra: 'Fluxo', cor: '#7FD3C8', glifo: '舞', inicio: 5,
  patamares: [[5, 'Pés no Ar', 'armadilhas de chão e terreno difícil não te pegam'], [10, 'Corrente Larga', 'suas Correntes têm 2 células de largura'], [15, 'Olho do Tufão', 'a próxima dança move quem você escolher a 3 células']],
  risco: ['Vento Solto', 'se não se mover no turno, o vento te empurra 3 células (o mestre escolhe a direção)'],
  est: () => ({ correntes: [] }),
  arte(s){ let o = ''; for (let i = 0; i < 3; i++) o += `<path d="M66 ${96 + i * 14} Q88 ${84 + i * 14} 110 ${96 + i * 14} T154 ${96 + i * 14}" fill="none" stroke="${i === 1 ? this.cor : '#ffffff2a'}" stroke-width="${i === 1 ? 3 : 2}" stroke-linecap="round"/>`;
    return o + (s.correntes.length ? KIT.texto(110, 150, s.correntes.length + (s.correntes.length > 1 ? ' correntes' : ' corrente'), { tam: 10.5, cor: this.cor }) : ''); },
  aoUsar(s, h, ctx){ if (/Passo de Brisa|Corrente do Grupo|Dança do Aço|Dança Cortante/.test(h.nome)) s.correntes.push({ n: 'Corrente', t: 2 }); },
  aoComecarTurno(s, ctx){ s.correntes = contarTurnos(s.correntes, ctx, 'Corrente'); },
  linhaEstado: s => (s.correntes.length ? `<b>${s.correntes.length} ${s.correntes.length > 1 ? 'Correntes' : 'Corrente'} no campo</b> <em>· aliados andam de graça nelas; inimigos testam Vigor</em>` : '<em>Nenhuma Corrente no campo.</em>'),
  ganhos: [{ c: 'Terminou longe', t: 'Terminou o turno a 3 ou mais células de onde começou', v: 2, quando: 'fim', tipo: 'tg' }, { c: 'O vento moveu alguém', v: 3 }, { c: 'Aliado usou a Corrente', v: 1 }],
  selo: s => (s.correntes.length ? '風' + s.correntes.length : null),
  mapa: { 'Passo de Brisa': LINHA('vento', 3, 2), 'Corrente do Grupo': LINHA('vento', 4, 1), 'Ciclone Pequeno': AREA('vento', 1, 1), 'Tornado': AREA('vortice', 1, 2), 'Tempestade dos Pilares': AREA('tempestade', 3, 1),
    'Muro de Vento': LINHA('vento', 2, 2), 'Cúpula dos Pilares': AREA('circuloProtecao', 2, 2), 'Furacão de Facas': AREA('vento', 2, 1), 'A Dança do Aço e do Vento': LINHA('vento', 3, 1) }
});

/* ---------------- Cartomante: a Mão ---------------- */
classe({ id: 'cartomante', arvore: 'Cartomante', barra: 'Mão', cor: '#B48CE0', glifo: '札', inicio: 3, max: 7, teto: null,
  patamares: [[3, 'Leque', 'você vê a carta de cima do baralho'], [5, 'Mão Cheia', 'o primeiro Arcano do turno não sai da mão'], [7, 'Destino na Mão', 'a próxima carta sai normal E invertida']],
  est: () => ({ armadas: [] }),
  arte(s, v){ let o = ''; const n = Math.max(1, v); for (let i = 0; i < n; i++){ const a = (i - (n - 1) / 2) * 12; o += `<g transform="rotate(${a} 110 150)"><rect x="96" y="76" width="28" height="44" rx="3" fill="${i < v ? '#2A2340' : '#1A1D24'}" stroke="${i < v ? this.cor : '#3A3E48'}"/></g>`; } return o + (s.armadas.length ? KIT.texto(110, 168, s.armadas.length + (s.armadas.length > 1 ? ' armadas' : ' armada'), { tam: 10, cor: this.cor }) : ''); },
  aoUsar(s, h){ if (/Carta Armada|Campo de Cartas|Armadilha do Destino|Invocação Armada/.test(h.nome)) s.armadas.push({ n: 'Carta armada', t: 10 }); },
  aoComecarTurno(s, ctx){ ctx.ganhar(1, 'puxou uma carta', { foraTeto: true }); },
  acoes(s){ return s.armadas.length ? `<button type="button" data-a="disparou">Uma carta armada disparou</button>` : ''; },
  acao(s, a, ctx){ if (a === 'disparou' && s.armadas.length){ s.armadas.shift(); ctx.log(`Uma carta armada de ${ctx.nome} dispara.`); } },
  linhaEstado: (s, ctx) => `<b>${ctx.v} ${ctx.v === 1 ? 'carta' : 'cartas'} na mão</b> <em>· puxa 1 no começo do turno; o que cada carta faz está na aba Baralho</em>`,
  ganhos: [{ c: 'Puxou carta', t: 'Uma habilidade que puxa carta', v: 1, foraTeto: true }],
  mapa: { 'Carta Armada': AREA('runas', 0.5, 10), 'Campo de Cartas': AREA('runas', 0.5, 10, { n: 3 }), 'A Força': TOK('Leoa', '#E0B060', { vida: 8, turnos: 2 }), 'O Louco': TOK('Bobo', '#E07FD0', { vida: 3, turnos: 2 }),
    'O Eremita': TOK('Eremita', '#C9C3B5', { vida: 4, turnos: 3 }), 'O Imperador': TOK('Trono', '#8B8178', { turnos: 10 }), 'A Lua': TOK('Cão da Lua', '#A0B0E0', { vida: 4, turnos: 2, n: 2 }),
    'O Diabo': TOK('Diabo', '#8E2A2A', { vida: 8, turnos: 2 }), 'O Sol': TOK('Sol', '#F0D27A', { tam: 0.5, turnos: 2 }), 'Cavaleiros de Copas': TOK('Cavaleiro de Copas', '#7FA4F5', { vida: 5, turnos: 2, n: 3 }),
    'A Corte Inteira': TOK('Corte', '#B48CE0', { vida: 6, turnos: 2, n: 3 }), 'A Torre': AREA('terra', 2, 10) }
});

/* ---------------- Vampiro (linhagem): Sangue, formas e estágios ---------------- */
const FORMAS_VAMP = { nevoa: ['霧', 'Névoa'], morcego: ['蝠', 'Morcego'], lobo: ['狼', 'Lobo Negro'], besta: ['獣', 'Besta de Rastmã'] };
classe({ id: 'vampiro', cat: 'linhagem', arvore: 'Vampiro', barra: 'Sangue', cor: '#E5677B', glifo: '血', inicio: 4,
  patamares: [[5, 'Pele Fria', 'Defesa +1 contra golpes comuns'], [10, 'Olhos Vermelhos', 'vê no escuro e sente o coração a 10 células'], [15, 'Fome Cheia', 'o alvo da próxima Dominação tem -1 no teste']],
  risco: ['Sede', 'morda alguém no próximo turno ou teste CAN; falhou, ataca o mais perto'],
  est: () => ({ forma: null, estagio: 1 }),
  marcas: s => Object.entries(FORMAS_VAMP).map(([k, [g, n]]) => ({ k, glifo: g, rotulo: 'Forma: ' + n, dica: 'entra pela habilidade; toque na forma atual para voltar' })),
  marcasOpc: { raio: 56, r: 15, inicio: -45 },
  ativo: (s, k) => s.forma === k,
  arte(s){ let o = glifoCentro(this, '血', { tam: 26, dy: 2 }); for (let i = 1; i <= 5; i++){ o += KIT.botao('e' + i, 'Estágio ' + i, `<circle cx="${82 + i * 9.3}" cy="128" r="3.6" fill="${i <= s.estagio ? this.cor : '#2A2D35'}" stroke="#ffffff55"/>`); } return o; },
  tocar(s, k, ctx){
    if (k[0] === 'e'){ s.estagio = +k.slice(1); return ctx.log(`${ctx.nome}: corrupção no estágio ${s.estagio}.`); }
    if (s.forma === k){ s.forma = null; return ctx.log(`${ctx.nome} volta à forma de gente.`); }
    ctx.aviso('Para mudar de forma, use a habilidade abaixo.');
  },
  aoUsar(s, h, ctx){ const k = /Névoa/.test(h.nome) && !/Sangue|Sufoca/.test(h.nome) ? 'nevoa' : /Morcego|Revoada|Asas/.test(h.nome) ? 'morcego' : /Lobo Negro/.test(h.nome) ? 'lobo' : /Besta/.test(h.nome) ? 'besta' : null; if (k){ s.forma = k; ctx.log(`${ctx.nome} vira ${FORMAS_VAMP[k][1]}.`); } },
  acoes(){ return `<button type="button" data-a="bebeu" title="Bebeu de alguém antes da luta: a barra vai a 10">Bebi antes da luta</button>`; },
  acao(s, a, ctx){ if (a === 'bebeu') ctx.definir(Math.max(ctx.v, 10), 'bebeu antes da luta'); },
  persiste: ['estagio'],
  linhaEstado: s => `<b>Estágio ${s.estagio} de 5</b>${s.forma ? ` · <b>${FORMAS_VAMP[s.forma][1]}</b>` : ''}`,
  ganhos: [{ c: 'Mordida acertou', v: 3 }, { c: 'Inimigo perto sangrou', t: 'Um inimigo a 3 células começou a sangrar', v: 2 }],
  selo: s => (s.forma ? FORMAS_VAMP[s.forma][0] : '血' + s.estagio),
  mapa: { 'Revoada': AREA('sombra', 2, 1), 'A Revoada Grande': AREA('sombra', 3, 1), 'Corte de Servos': TOK('Servo', '#7A6A70', { vida: 5, turnos: 5, n: 2 }), 'Rio Vermelho': LINHA('luaSangue', 3, 1),
    'Chuva Vermelha': AREA('luaSangue', 4, 1), 'Tempestade de Sangue': AREA('luaSangue', 3, 1), 'Névoa de Sangue': AREA('luaSangue', 2, 1) }
});

/* ---------------- Lobisomem (linhagem): a Lua, a forma e a Fome ---------------- */
const FORMAS_LOBO = { homem: ['人', 'Gente'], meia: ['半', 'Meia Fera'], lobo: ['狼', 'Lobo'] };
const LUAS = { dia: 'Dia', noite: 'Noite', cheia: 'Lua cheia' };
classe({ id: 'lobisomem', cat: 'linhagem', arvore: 'Lobisomem', barra: 'Lua', cor: '#E8D9B8', glifo: '狼', inicio: 4,
  teto: undefined,
  patamares: [[5, 'Faro', 'sente medo e sangue a 20 células'], [10, 'Meia Fera', 'garras e presas sem se transformar'], [15, 'Fera Pronta', 'a próxima transformação é de graça']],
  risco: ['Fome', 'teste CAN no fim do turno; falhou, você vira lobo e ataca o ser vivo mais perto'],
  est: () => ({ forma: 'homem', lua: 'noite', estagio: 1 }),
  marcas: () => Object.entries(FORMAS_LOBO).map(([k, [g, n]]) => ({ k, glifo: g, rotulo: 'Forma: ' + n, dica: 'entrar na forma pela habilidade; toque para registrar' })),
  marcasOpc: { raio: 58, r: 15, inicio: 0 },
  ativo: (s, k) => s.forma === k,
  arte(s){ let o = `<path d="M118 72A22 22 0 1 0 128 108A17 17 0 1 1 118 72Z" fill="${s.lua === 'dia' ? '#3A3D44' : '#E8D9B8'}" opacity="${s.lua === 'cheia' ? 1 : .55}"/>`;
    Object.keys(LUAS).forEach((k, i) => { o += KIT.botao('l_' + k, LUAS[k], `<rect x="${78 + i * 22}" y="118" width="20" height="13" rx="6" fill="${s.lua === k ? this.cor : '#22262E'}" stroke="#ffffff44"/>${KIT.texto(88 + i * 22, 128, k === 'cheia' ? '●' : k === 'noite' ? '☾' : '☀', { tam: 9, cor: s.lua === k ? '#0E1014' : '#C9C3B5' })}`); });
    for (let i = 1; i <= 5; i++) o += KIT.botao('e' + i, 'Estágio ' + i, `<circle cx="${82 + i * 9.3}" cy="148" r="3.4" fill="${i <= s.estagio ? '#C9603F' : '#2A2D35'}" stroke="#ffffff55"/>`);
    return o; },
  tocar(s, k, ctx){
    if (k.startsWith('l_')){ s.lua = k.slice(2); return ctx.log(`Céu: ${LUAS[s.lua]}.`); }
    if (k[0] === 'e' && /^e\d$/.test(k)){ s.estagio = +k.slice(1); return ctx.log(`${ctx.nome}: corrupção no estágio ${s.estagio}.`); }
    if (FORMAS_LOBO[k] && s.forma !== k){ s.forma = k; ctx.log(`${ctx.nome}: forma de ${FORMAS_LOBO[k][1]}.`); }
  },
  aoUsar(s, h, ctx){ if (/^Transformar|Fera Lunar|O Lobo Antigo/.test(h.nome)){ s.forma = 'lobo'; ctx.log(`${ctx.nome} vira lobo.`); } else if (/Meia Fera/.test(h.nome)){ s.forma = 'meia'; } },
  persiste: ['estagio', 'lua'],
  linhaEstado: s => `<b>${FORMAS_LOBO[s.forma][1]}</b> · <b>${LUAS[s.lua]}</b> · <em>estágio ${s.estagio} de 5${s.lua === 'cheia' ? '; teto 8 por rodada' : ''}</em>`,
  ganhos: [{ c: 'Garra derrubou ou fez sangrar', v: 3 }, { c: 'Sob o céu da noite', v: 2, quando: 'inicio', tipo: 'auto', f: s => s.lua !== 'dia' }, { c: 'Uivo respondido', v: 2, max: 1 }],
  selo: s => FORMAS_LOBO[s.forma][0],
  mapa: { 'Chamar Lobos': TOK('Lobo', '#8A8070', { vida: 5, turnos: 3, n: 2 }), 'A Matilha Inteira': TOK('Lobo', '#8A8070', { vida: 5, turnos: 2, n: 6 }), 'Matilha Fantasma': AREA('espiritos', 3, 1),
    'Eclipse': AREA('escuridao', 4, 2), 'Matilha da Lua': TOK('Lobo de Luar', '#C8D8F0', { vida: 4, turnos: 2, n: 2 }) }
});
// (o teto do Lobisomem: 8 na lua cheia, 6 nas outras)
BARRA.lobisomem.teto = s => (s && s.lua === 'cheia' ? 8 : 6);

// (lote 107: a escola Yanato e as poções do mundo antigo saíram; ficam os nomes, para quem ainda os lê)
const YANATO = 'a5ufrdl1er';
const POCOES = [];
const lacosDe = () => [];

/* =====================================================================
   A ligação com as árvores do site: o id da árvore na biblioteca da mesa (o guia de barras, 28/10) e, para as de
   outra mesa, o nome (sem acento, sem maiúscula). As 3 Oradoras dividem a barra das Palavras. A Bênção de Selene não
   cria barra: ela liga a "Verdadeira Forma" na Geada de Selene.
   ===================================================================== */
const ARVORES = {
  samurai: ['a_samurai'], ninja: ['a_ninja'], barbaro: ['a_barbaro'], espadachim: ['a_espadachim'], monge: ['a_monge'], aegis: ['a_aegis'],
  arqueiro: ['a_arqueiro'], mago: ['a_mago'], feiticeiro: ['a_feiticeiro'], necromante: ['a_necromante'], druida: ['a_druida'],
  sacerdote: ['a_sacerdote'], artifice: ['a_artifice'], alquimista: ['a_alquimista'], bardo: ['a_bardo'], shaji: ['a_shaji'],
  karema: ['a_kare_ma'], cartomante: ['a_cartomante'], vampiro: ['a_vampiro'], lobisomem: ['a_lobisomem']
};
const BENCAO_SELENE = 'aq0onsk37x';                          // (do mundo antigo; nenhuma árvore liga mais nela)
const POR_ID = {};
for (const k of Object.keys(ARVORES)) for (const a of ARVORES[k]) POR_ID[a] = k;
const normNome = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// pelo id da árvore; numa mesa com outro id, pelo nome (só as 20 do mundo novo)
function barraDaArvore(arv){
  if (!arv) return null;
  const id = typeof arv === 'string' ? arv : arv.id;
  if (id && POR_ID[id]) return POR_ID[id];
  const nome = normNome(typeof arv === 'string' ? '' : arv.nome);
  if (!nome) return null;
  const d = BARRAS.find(x => normNome(x.arvore) === nome);
  return d ? d.id : null;
}
// a lista para o mestre escolher (NPC sem ficha): por categoria e nome
const ORDEM_CAT = ['classe', 'raca', 'linhagem', 'escola'];
const lista = () => BARRAS.slice().sort((a, b) => (ORDEM_CAT.indexOf(a.cat) - ORDEM_CAT.indexOf(b.cat)) || a.arvore.localeCompare(b.arvore, 'pt-BR'))
  .map(d => ({ id: d.id, cat: d.cat, arvore: d.arvore, barra: d.barra, cor: d.cor, npc: !!d.npc }));

const api = {
  BARRAS, BARRA, ICONES, KIT, ARVORES, BENCAO_SELENE, YANATO, POCOES, lacosDe,
  barraDaArvore, lista, instancia, guardar, ctxDe, mexer, valorGanho, pendente, aplicar, tocarAgora, usarHab, habsHTML,
  comecarTurno, terminarTurno, fimDoCombate, painelHTML, desenharPainel, ligarPainel, faceSVG, seloDe, seloHTML,
  svgIcone, iconeSolto, mostra, tetoDe, esc
};
(root.TC || (root.TC = {})).painelBarras = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
