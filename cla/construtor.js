/* Tiny Cats · Clã · o construtor (lote 30): a planta de um prédio da Sede, andar por andar.
   Ferramentas: Escolher, Cômodo (arraste no chão: as paredes saem sozinhas; encostado num cômodo vizinho, a parede do meio
   ganha uma porta), Porta e Janela (clique numa parede: põe ou tira; no térreo, a primeira porta da parede de fora é a de
   entrada), Piso (clique num cômodo), Móvel (escolha na lista e clique no chão), Escada (clique: liga a outro andar, que
   ganha a escada no mesmo lugar) e Apagar. Os andares em abas (+ Andar: um de cima ou o porão, com os mesmos cômodos de
   baixo e uma escada ligando). "Salvar como planta" guarda a planta na mesa (fica em "Minhas plantas", na Sede).
   Cada mudança é um passo do Desfazer da página; a planta fica marcada como mexida (a Sede pergunta antes de trocar). */
window.ClaConstrutor = function (kit) {
  'use strict';
  const S = window.TC.sede, { h, toast } = kit;
  const NS = 'http://www.w3.org/2000/svg';
  const C = 34;                                            // unidades do desenho por quadrado
  const s_ = (tag, attrs, ...kids) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs || {}) { const v = attrs[k]; if (v == null || v === false) continue; if (k === 'text') el.textContent = v; else el.setAttribute(k, v === true ? '' : v); }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c);
    return el;
  };
  const PLANTAS = 'cla:plantas';                           // as plantas salvas da mesa
  const FERR = [['sel', 'Escolher', 'Escolher e mover o que está na planta'], ['comodo', 'Cômodo', 'Arraste no chão para fazer um cômodo'], ['porta', 'Porta', 'Clique numa parede para pôr ou tirar uma porta'],
    ['janela', 'Janela', 'Clique numa parede de fora para pôr ou tirar uma janela'], ['piso', 'Piso', 'Escolha o piso e clique nos cômodos'], ['movel', 'Móvel', 'Escolha o móvel e clique no chão'],
    ['escada', 'Escada', 'Clique no chão para pôr uma escada até outro andar'], ['apagar', 'Apagar', 'Clique no que quer tirar']];
  const COR_MOVEL = { fogo: '#b4572a', pedra: '#6f727a', madeira: '#7a4b26', planta: '#3f6a34' };
  const TIPO_COR = { lareira: 'fogo', fornalha: 'fogo', braseiro: 'fogo', tocha: 'fogo', vela: 'fogo', lampiao: 'fogo', altar: 'pedra', estatua: 'pedra', coluna: 'pedra', poco: 'pedra', bigorna: 'pedra', flores: 'planta', arbusto: 'planta', arvore: 'planta', feno: 'planta' };
  const st = { aberto: false, cla: null, pr: null, andar: 't', ferr: 'sel', sel: null, piso: 'madeira', movel: 'mesa', busca: '', arrasto: null };
  let raiz = null;

  /* ---------------- os dados ---------------- */
  const sedeDe = () => S.normSede(kit.doc(S.PRE + st.cla));
  const predio = () => { const s = sedeDe(); return s.predios.find(p => p.id === st.pr) || null; };
  const andarDe = (p, id) => p.planta.andares.find(a => a.id === id) || p.planta.andares.find(a => a.id === 't') || p.planta.andares[0];
  // mudar a planta (um passo de desfazer): fn(planta, andar) — devolver false = nada a fazer
  function mudar(rotulo, fn) {
    let ok = false;
    kit.mudarDoc(S.PRE + st.cla, rotulo, S.normSede, d => {
      const q = d.predios.find(p => p.id === st.pr);
      if (!q) return false;
      const pl = JSON.parse(JSON.stringify(q.planta)), a = pl.andares.find(x => x.id === st.andar) || pl.andares[0];
      if (fn(pl, a) === false) return false;
      const nova = S.normPlanta(pl);
      if (!nova) return false;
      // o prédio maior precisa caber no terreno
      const s0 = S.normSede(d);
      if (!S.cabe(s0, { x: q.x, y: q.y, w: nova.W, h: nova.H }, q.id)) { toast('Assim o prédio não cabe no terreno da sede.'); return false; }
      q.planta = nova; q.mexido = true; ok = true;
    });
    pintar();
    return ok;
  }
  const dentro = (q, i, j) => i >= q.x && i < q.x + q.w && j >= q.y && j < q.y + q.h;
  const salaEm = (a, i, j) => a.salas.find(q => dentro(q, i, j)) || null;
  const movelEm = (a, i, j) => a.moveis.find(m => i >= m.x && i < m.x + m.s && j >= m.y && j < m.y + m.s) || null;
  const escadaEm = (a, i, j) => a.escadas.find(e => e.x === i && e.y === j) || null;

  /* ---------------- abrir e fechar ---------------- */
  function abrir(cla, pr) {
    const s = S.normSede(kit.doc(S.PRE + cla)), p = s.predios.find(x => x.id === pr);
    if (!p) return;
    Object.assign(st, { aberto: true, cla, pr, andar: p.planta.andares.some(a => a.id === 't') ? 't' : p.planta.andares[0].id, ferr: 'sel', sel: null, busca: '' });
    if (!raiz) { raiz = h('div', { class: 'construtor', id: 'construtor', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'O construtor' }); document.body.append(raiz); }
    raiz.hidden = false;
    document.documentElement.classList.add('com-construtor');
    pintar();
    const f = raiz.querySelector('[data-k="cs:fechar"]'); if (f) f.focus();
  }
  function fechar() {
    st.aberto = false;
    if (raiz) { raiz.hidden = true; raiz.replaceChildren(); }
    document.documentElement.classList.remove('com-construtor');
    kit.pintar();
  }
  document.addEventListener('keydown', ev => {
    if (!st.aberto) return;
    const tg = ev.target, digitando = tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT');
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); if (st.ferr !== 'sel' || st.sel) { st.ferr = 'sel'; st.sel = null; pintar(); } else fechar(); return; }
    if (digitando) return;
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && st.sel) { ev.preventDefault(); apagarSel(); }
    else if ((ev.key === 'r' || ev.key === 'R') && st.sel && st.sel.k === 'movel') { ev.preventDefault(); girarMovel(); }
  }, true);

  /* ---------------- o desenho ---------------- */
  function desenho(p, a) {
    const pl = p.planta, W = pl.W * C, H = pl.H * C;
    const svg = s_('svg', { class: 'cs-svg', viewBox: `${-C} ${-C} ${W + 2 * C} ${H + 2 * C}`, 'data-k': 'cs:svg', role: 'img', 'aria-label': 'A planta de ' + p.nome + ', ' + S.nomeDoAndar(a.id) });
    svg.append(s_('rect', { x: -C, y: -C, width: W + 2 * C, height: H + 2 * C, fill: '#11141b' }));
    // a grade do prédio
    let d = '';
    for (let i = 0; i <= pl.W; i++) d += `M${i * C} 0V${H}`;
    for (let j = 0; j <= pl.H; j++) d += `M0 ${j * C}H${W}`;
    svg.append(s_('path', { d, stroke: 'rgba(255,255,255,.08)', 'stroke-width': 1, fill: 'none' }));
    svg.append(s_('rect', { x: 0, y: 0, width: W, height: H, fill: 'none', stroke: 'rgba(230,171,79,.35)', 'stroke-width': 1.5, 'stroke-dasharray': '6 5' }));
    // os cômodos (o piso, o nome)
    for (const q of a.salas) {
      const sel = st.sel && st.sel.k === 'sala' && st.sel.id === q.id;
      svg.append(s_('g', { class: 'cs-sala' + (sel ? ' sel' : ''), 'data-sala': q.id },
        s_('rect', { x: q.x * C, y: q.y * C, width: q.w * C, height: q.h * C, fill: (S.PISO[q.piso] || S.PISO.madeira).cor, opacity: 0.9 }),
        s_('text', { x: (q.x + q.w / 2) * C, y: (q.y + 0.6) * C, class: 'cs-nome', text: q.nome || (S.PAPEIS[q.papel] || S.PAPEIS.vazio).n })));
    }
    // os móveis e as escadas
    for (const m of a.moveis) {
      const M = S.MOVEIS[m.id] || { n: m.id, s: 1 }, sel = st.sel && st.sel.k === 'movel' && st.sel.x === m.x && st.sel.y === m.y && st.sel.id === m.id;
      const cor = COR_MOVEL[TIPO_COR[m.id] || 'madeira'], cx = (m.x + m.s / 2) * C, cy = (m.y + m.s / 2) * C;
      svg.append(s_('g', { class: 'cs-movel' + (M.chao ? ' chao' : '') + (sel ? ' sel' : ''), 'data-movel': m.id + '@' + m.x + ',' + m.y },
        s_('title', { text: M.n }),
        s_('rect', { x: m.x * C + 3, y: m.y * C + 3, width: m.s * C - 6, height: m.s * C - 6, rx: 5, fill: cor, opacity: M.chao ? 0.4 : 0.95 }),
        // a frente (para onde o móvel está virado): um traço na beira
        M.chao ? null : s_('line', { x1: cx, y1: cy, x2: cx - Math.sin((m.rot || 0) * Math.PI / 180) * (m.s * C / 2 - 6), y2: cy + Math.cos((m.rot || 0) * Math.PI / 180) * (m.s * C / 2 - 6), class: 'cs-frente' }),
        s_('text', { x: cx, y: cy + 4, class: 'cs-mtx', text: M.n.length > 9 && m.s < 2 ? M.n.slice(0, 5) + '.' : M.n })));
    }
    for (const e of a.escadas) {
      const sel = st.sel && st.sel.k === 'escada' && st.sel.x === e.x && st.sel.y === e.y;
      svg.append(s_('g', { class: 'cs-escada' + (sel ? ' sel' : ''), 'data-escada': e.x + ',' + e.y },
        s_('title', { text: 'Escada: ' + S.nomeDoAndar(e.para) }),
        s_('rect', { x: e.x * C + 2, y: e.y * C + 2, width: C - 4, height: C - 4, rx: 3, fill: '#4a3420' }),
        s_('path', { d: `M${e.x * C + 6} ${e.y * C + 9}h${C - 12}M${e.x * C + 6} ${e.y * C + 16}h${C - 12}M${e.x * C + 6} ${e.y * C + 23}h${C - 12}`, stroke: '#e8d2a8', 'stroke-width': 2.4 }),
        s_('text', { x: (e.x + 0.5) * C, y: (e.y + 1) * C + 11, class: 'cs-esc', text: '→ ' + S.nomeDoAndar(e.para) })));
    }
    // as paredes, as portas e as janelas (por cima)
    for (const w of S.paredes(a, pl.W, pl.H)) {
      svg.append(s_('line', { x1: w.x1 * C, y1: w.y1 * C, x2: w.x2 * C, y2: w.y2 * C, class: 'cs-parede' + (w.fora ? ' fora' : '') + (w.k === 'door' ? ' porta' : w.k === 'window' ? ' janela' : '') + (w.entrada ? ' entrada' : '') }));
    }
    if (a.id === 't' && pl.porta) svg.append(s_('text', { x: ((pl.porta.x1 + pl.porta.x2) / 2) * C, y: pl.porta.lado === 's' ? pl.porta.y1 * C + 20 : pl.porta.lado === 'n' ? -8 : ((pl.porta.y1 + pl.porta.y2) / 2) * C, class: 'cs-entrada', text: 'Entrada' }));
    svg.append(s_('g', { class: 'cs-previa' }));
    ligar(svg, p);
    return svg;
  }

  /* ---------------- o mouse na planta ---------------- */
  const svgNaTela = () => raiz && raiz.querySelector('[data-k="cs:svg"]');
  function ponto(ev) {
    const svg = svgNaTela(); if (!svg) return null;
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    if (!r.width) return null;
    return { x: vb.x / C + (ev.clientX - r.left) / r.width * vb.width / C, y: vb.y / C + (ev.clientY - r.top) / r.height * vb.height / C };
  }
  // a parede (um trecho de uma casa na linha da grade) mais perto do ponto: { x1, y1, x2, y2 } ou null
  function paredePerto(p, pl, a) {
    const i = Math.floor(p.x), j = Math.floor(p.y), fx = p.x - i, fy = p.y - j;
    const dist = [[fy, 'h', i, j], [1 - fy, 'h', i, j + 1], [fx, 'v', i, j], [1 - fx, 'v', i + 1, j]].sort((x, y) => x[0] - y[0])[0];
    if (dist[0] > 0.3) return null;
    const seg = dist[1] === 'h' ? { x1: dist[2], y1: dist[3], x2: dist[2] + 1, y2: dist[3] } : { x1: dist[2], y1: dist[3], x2: dist[2], y2: dist[3] + 1 };
    // é parede? (de um lado um cômodo, do outro outro cômodo ou o lado de fora)
    const lado = (x, y) => { const q = salaEm(a, x, y); return q ? q.id : null; };
    const [aa, bb] = dist[1] === 'h' ? [lado(seg.x1, seg.y1 - 1), lado(seg.x1, seg.y1)] : [lado(seg.x1 - 1, seg.y1), lado(seg.x1, seg.y1)];
    if (aa === bb || (!aa && !bb)) return null;
    return Object.assign(seg, { fora: !aa || !bb });
  }
  function previa(desenhos) {
    const g = svgNaTela() && svgNaTela().querySelector('.cs-previa');
    if (g) g.replaceChildren(...(desenhos || []));
  }
  function ligar(svg, p) {
    const pl = p.planta, a = andarDe(p, st.andar);
    svg.addEventListener('pointermove', ev => {
      const q = ponto(ev); if (!q) return;
      if (st.arrasto) { moverArrasto(q); return; }
      const i = Math.floor(q.x), j = Math.floor(q.y);
      if (st.ferr === 'porta' || st.ferr === 'janela') {
        const w = paredePerto(q, pl, a);
        previa(w && (st.ferr === 'porta' || w.fora) ? [s_('line', { x1: w.x1 * C, y1: w.y1 * C, x2: w.x2 * C, y2: w.y2 * C, class: 'cs-mira ' + st.ferr })] : []);
      } else if (st.ferr === 'movel') {
        const s = (S.MOVEIS[st.movel] || { s: 1 }).s;
        previa([s_('rect', { x: i * C + 3, y: j * C + 3, width: s * C - 6, height: s * C - 6, rx: 5, class: 'cs-fantasma' + (podeMovel(a, st.movel, i, j, null) ? '' : ' ruim') })]);
      } else if (st.ferr === 'escada' || st.ferr === 'piso' || st.ferr === 'apagar' || st.ferr === 'comodo') {
        previa(i >= 0 && j >= 0 && i < pl.W && j < pl.H ? [s_('rect', { x: i * C, y: j * C, width: C, height: C, class: 'cs-mira-cel' })] : []);
      } else previa([]);
    });
    svg.addEventListener('pointerleave', () => { if (!st.arrasto) previa([]); });
    svg.addEventListener('pointerdown', ev => {
      if (ev.button !== 0) return;
      const q = ponto(ev); if (!q) return;
      const i = Math.floor(q.x), j = Math.floor(q.y);
      ev.preventDefault();
      if (st.ferr === 'comodo') { st.arrasto = { k: 'comodo', i0: clampI(i, pl.W), j0: clampI(j, pl.H), i1: clampI(i, pl.W), j1: clampI(j, pl.H) }; svg.setPointerCapture(ev.pointerId); moverArrasto(q); return; }
      if (st.ferr === 'porta' || st.ferr === 'janela') { const w = paredePerto(q, pl, a); if (w) abertura(st.ferr === 'porta' ? 'door' : 'window', w); else toast('Clique bem em cima de uma parede.'); return; }
      if (st.ferr === 'piso') { const s0 = salaEm(a, i, j); if (s0) pisoEm(s0); return; }
      if (st.ferr === 'movel') { porMovel(a, i, j); return; }
      if (st.ferr === 'escada') { porEscada(p, a, i, j); return; }
      if (st.ferr === 'apagar') { apagarEm(a, i, j, q); return; }
      // escolher (e arrastar um móvel ou uma escada)
      const m = movelEm(a, i, j), e = !m && escadaEm(a, i, j), s0 = !m && !e && salaEm(a, i, j);
      if (m) { st.sel = { k: 'movel', id: m.id, x: m.x, y: m.y }; st.arrasto = { k: 'movel', m, di: i - m.x, dj: j - m.y, i: m.x, j: m.y }; svg.setPointerCapture(ev.pointerId); }
      else if (e) { st.sel = { k: 'escada', x: e.x, y: e.y }; st.arrasto = { k: 'escada', e, i: e.x, j: e.y }; svg.setPointerCapture(ev.pointerId); }
      else if (s0) st.sel = { k: 'sala', id: s0.id };
      else st.sel = null;
      pintarLado(p);
      marcarSel();
    });
    const fim = ev => {
      const r = st.arrasto; if (!r) return;
      st.arrasto = null;
      try { svg.releasePointerCapture(ev.pointerId); } catch (e) { /* já solto */ }
      previa([]);
      if (r.k === 'comodo') comodo(r);
      else if (r.k === 'movel' && (r.i !== r.m.x || r.j !== r.m.y)) moverMovel(r);
      else if (r.k === 'escada' && (r.i !== r.e.x || r.j !== r.e.y)) moverEscada(r);
      else pintar();
    };
    svg.addEventListener('pointerup', fim);
    svg.addEventListener('pointercancel', fim);
  }
  const clampI = (v, max) => Math.max(0, Math.min(max - 1, v));
  function moverArrasto(q) {
    const r = st.arrasto, p = predio(); if (!p) return;
    const pl = p.planta, a = andarDe(p, st.andar);
    if (r.k === 'comodo') {
      r.i1 = clampI(Math.floor(q.x), pl.W); r.j1 = clampI(Math.floor(q.y), pl.H);
      const x = Math.min(r.i0, r.i1), y = Math.min(r.j0, r.j1), w = Math.abs(r.i1 - r.i0) + 1, hh = Math.abs(r.j1 - r.j0) + 1;
      const bate = a.salas.some(s0 => x < s0.x + s0.w && x + w > s0.x && y < s0.y + s0.h && y + hh > s0.y);
      previa([s_('rect', { x: x * C, y: y * C, width: w * C, height: hh * C, class: 'cs-fantasma' + (bate || w < 2 || hh < 2 ? ' ruim' : '') }), s_('text', { x: (x + w / 2) * C, y: (y + hh / 2) * C + 5, class: 'cs-medida', text: w + ' × ' + hh })]);
      return;
    }
    const i = r.k === 'movel' ? Math.floor(q.x) - r.di : Math.floor(q.x), j = r.k === 'movel' ? Math.floor(q.y) - r.dj : Math.floor(q.y);
    r.i = i; r.j = j;
    const s = r.k === 'movel' ? r.m.s : 1, ok = r.k === 'movel' ? podeMovel(a, r.m.id, i, j, r.m) : !!salaEm(a, i, j) && !movelEm(a, i, j) && !(escadaEm(a, i, j) && escadaEm(a, i, j) !== r.e);
    previa([s_('rect', { x: i * C + 3, y: j * C + 3, width: s * C - 6, height: s * C - 6, rx: 5, class: 'cs-fantasma' + (ok ? '' : ' ruim') })]);
  }

  /* ---------------- as ações ---------------- */
  function comodo(r) {
    const x = Math.min(r.i0, r.i1), y = Math.min(r.j0, r.j1), w = Math.abs(r.i1 - r.i0) + 1, hh = Math.abs(r.j1 - r.j0) + 1;
    if (w < 2 || hh < 2) { toast('Um cômodo tem pelo menos 2 × 2 quadrados.'); pintar(); return; }
    const p = predio(), a = andarDe(p, st.andar);
    if (a.salas.some(s0 => x < s0.x + s0.w && x + w > s0.x && y < s0.y + s0.h && y + hh > s0.y)) { toast('Em cima de outro cômodo não dá: apague ou diminua o outro antes.'); pintar(); return; }
    if (a.salas.length >= S.LIM.salas) { toast('Este andar já tem o máximo de cômodos.'); pintar(); return; }
    let novoId = null;
    mudar('fazer um cômodo', (pl, an) => {
      let n = an.salas.length + 1; while (an.salas.some(q => q.id === 's' + n)) n++;
      novoId = 's' + n;
      an.salas.push({ id: novoId, x, y, w, h: hh, papel: 'vazio', piso: st.piso || 'madeira' });
      // a parede do meio com cada vizinho ganha uma porta (no meio do trecho em comum), se ainda não tem
      for (const v of an.salas) {
        if (v.id === novoId) continue;
        let seg = null;
        if (v.x + v.w === x || x + w === v.x) { const lx = v.x + v.w === x ? x : v.x, a0 = Math.max(y, v.y), a1 = Math.min(y + hh, v.y + v.h); if (a1 - a0 >= 1) seg = { x1: lx, y1: Math.floor((a0 + a1 - 1) / 2), x2: lx, y2: Math.floor((a0 + a1 - 1) / 2) + 1 }; }
        else if (v.y + v.h === y || y + hh === v.y) { const ly = v.y + v.h === y ? y : v.y, a0 = Math.max(x, v.x), a1 = Math.min(x + w, v.x + v.w); if (a1 - a0 >= 1) seg = { x1: Math.floor((a0 + a1 - 1) / 2), y1: ly, x2: Math.floor((a0 + a1 - 1) / 2) + 1, y2: ly }; }
        if (!seg) continue;
        const naLinha = an.aberturas.some(o => (seg.x1 === seg.x2 ? o.x1 === o.x2 && o.x1 === seg.x1 && o.y1 < v.y + v.h && o.y2 > v.y && o.y1 < y + hh && o.y2 > y : o.y1 === o.y2 && o.y1 === seg.y1 && o.x1 < v.x + v.w && o.x2 > v.x && o.x1 < x + w && o.x2 > x));
        if (!naLinha) an.aberturas.push(Object.assign({ k: 'door' }, seg));
      }
    });
    st.sel = novoId ? { k: 'sala', id: novoId } : null;
    pintar();
  }
  function abertura(k, w) {
    const p = predio(), pl = p.planta;
    if (k === 'window' && !w.fora) { toast('Janela só na parede de fora.'); return; }
    const mesma = o => o.x1 === w.x1 && o.y1 === w.y1 && o.x2 === w.x2 && o.y2 === w.y2;
    const a = andarDe(p, st.andar), ja = a.aberturas.find(mesma);
    if (ja && (ja.k === k || (k === 'door' && ja.k === 'door'))) {
      mudar(k === 'door' ? 'tirar uma porta' : 'tirar uma janela', (pl2, an) => {
        const era = an.aberturas.find(mesma);
        an.aberturas = an.aberturas.filter(o => !mesma(o));
        if (era && era.entrada) pl2.porta = null;
      });
      return;
    }
    mudar(k === 'door' ? 'pôr uma porta' : 'pôr uma janela', (pl2, an) => {
      an.aberturas = an.aberturas.filter(o => !mesma(o));
      const o = Object.assign({ k }, { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 });
      // no térreo, a primeira porta da parede de fora é a de entrada (o lado é o da parede)
      if (k === 'door' && w.fora && an.id === 't' && !pl2.porta) {
        const lado = w.y1 === w.y2 ? (salaEm(an, w.x1, w.y1) ? 'n' : 's') : (salaEm(an, w.x1, w.y1) ? 'o' : 'l');
        o.entrada = true; pl2.porta = { lado, x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 };
      }
      an.aberturas.push(o);
    });
    if (k === 'door' && w.fora && st.andar === 't' && !pl.porta) toast('Esta é a porta de entrada do prédio (a Entrada da cena da sede leva até ela).');
  }
  function pisoEm(sala) {
    if (sala.piso === st.piso) return;
    mudar('trocar o piso', (pl, an) => { const q = an.salas.find(x => x.id === sala.id); if (!q) return false; q.piso = st.piso; });
  }
  function podeMovel(a, id, i, j, ignorar) {
    const s = (S.MOVEIS[id] || { s: 1 }).s, chao = !!(S.MOVEIS[id] || {}).chao;
    for (let b = 0; b < s; b++) for (let c = 0; c < s; c++) {
      if (!salaEm(a, i + c, j + b)) return false;
      if (!chao) { const m = movelEm(a, i + c, j + b); if (m && m !== ignorar && !(S.MOVEIS[m.id] || {}).chao) return false; if (escadaEm(a, i + c, j + b)) return false; }
    }
    return true;
  }
  function porMovel(a, i, j) {
    if (!S.MOVEIS[st.movel]) return;
    if (!podeMovel(a, st.movel, i, j, null)) { toast('Não cabe aí (fora de um cômodo ou em cima de outro móvel).'); return; }
    mudar('pôr ' + S.MOVEIS[st.movel].n.toLowerCase(), (pl, an) => { an.moveis.push({ id: st.movel, x: i, y: j, s: S.MOVEIS[st.movel].s, rot: 0 }); });
  }
  function moverMovel(r) {
    const p = predio(), a = andarDe(p, st.andar);
    if (!podeMovel(a, r.m.id, r.i, r.j, r.m)) { toast('Não cabe aí: voltou para onde estava.'); pintar(); return; }
    mudar('mover ' + (S.MOVEIS[r.m.id] || { n: 'o móvel' }).n.toLowerCase(), (pl, an) => { const m = an.moveis.find(x => x.id === r.m.id && x.x === r.m.x && x.y === r.m.y); if (!m) return false; m.x = r.i; m.y = r.j; });
    st.sel = { k: 'movel', id: r.m.id, x: r.i, y: r.j };
    pintar();
  }
  function girarMovel() {
    const sl = st.sel; if (!sl || sl.k !== 'movel') return;
    mudar('girar o móvel', (pl, an) => { const m = an.moveis.find(x => x.id === sl.id && x.x === sl.x && x.y === sl.y); if (!m) return false; m.rot = ((m.rot || 0) + 90) % 360; });
  }
  function porEscada(p, a, i, j) {
    if (!salaEm(a, i, j) || movelEm(a, i, j) || escadaEm(a, i, j)) { toast('A escada vai num quadrado livre de um cômodo.'); return; }
    const outros = p.planta.andares.filter(x => x.id !== a.id);
    if (!outros.length) { toast('Este prédio tem um andar só: ponha outro andar antes (+ Andar).'); return; }
    const fazer = para => mudar('pôr uma escada para ' + S.nomeDoAndar(para), (pl, an) => {
      an.escadas.push({ x: i, y: j, para });
      const outro = pl.andares.find(x => x.id === para);
      if (outro && !outro.escadas.some(e => e.x === i && e.y === j)) {
        // no outro andar, a escada de volta no mesmo lugar (o móvel que estiver ali sai)
        outro.moveis = outro.moveis.filter(m => !(i >= m.x && i < m.x + m.s && j >= m.y && j < m.y + m.s));
        if (!outro.salas.some(q => dentro(q, i, j))) outro.salas.push({ id: 'e' + i + '_' + j, x: i, y: j, w: 1, h: 1, papel: 'vazio', piso: 'madeira' });
        outro.escadas.push({ x: i, y: j, para: an.id });
      }
    });
    if (outros.length === 1) { fazer(outros[0].id); return; }
    kit.escolherAndar(outros.map(x => [x.id, S.nomeDoAndar(x.id)])).then(v => { if (v) fazer(v); });
  }
  function moverEscada(r) {
    const p = predio(), a = andarDe(p, st.andar);
    if (!salaEm(a, r.i, r.j) || movelEm(a, r.i, r.j) || (escadaEm(a, r.i, r.j) && escadaEm(a, r.i, r.j) !== r.e)) { toast('Não cabe aí: voltou para onde estava.'); pintar(); return; }
    mudar('mover a escada', (pl, an) => {
      const e = an.escadas.find(x => x.x === r.e.x && x.y === r.e.y); if (!e) return false;
      const outro = pl.andares.find(x => x.id === e.para), volta = outro && outro.escadas.find(x => x.x === e.x && x.y === e.y && x.para === an.id);
      e.x = r.i; e.y = r.j;
      if (volta) { volta.x = r.i; volta.y = r.j; outro.moveis = outro.moveis.filter(m => !(r.i >= m.x && r.i < m.x + m.s && r.j >= m.y && r.j < m.y + m.s)); }
    });
    st.sel = { k: 'escada', x: r.i, y: r.j };
    pintar();
  }
  function apagarEm(a, i, j, q) {
    const m = movelEm(a, i, j);
    if (m) { st.sel = { k: 'movel', id: m.id, x: m.x, y: m.y }; apagarSel(); return; }
    const e = escadaEm(a, i, j);
    if (e) { st.sel = { k: 'escada', x: e.x, y: e.y }; apagarSel(); return; }
    const w = paredePerto(q, predio().planta, a);
    if (w) { const ab = a.aberturas.find(o => o.x1 === w.x1 && o.y1 === w.y1 && o.x2 === w.x2 && o.y2 === w.y2); if (ab) { abertura(ab.k, w); return; } }
    const s0 = salaEm(a, i, j);
    if (s0) { st.sel = { k: 'sala', id: s0.id }; apagarSel(); }
  }
  function apagarSel() {
    const sl = st.sel; if (!sl) return;
    if (sl.k === 'movel') mudar('tirar ' + (S.MOVEIS[sl.id] || { n: 'o móvel' }).n.toLowerCase(), (pl, an) => { const n = an.moveis.length; an.moveis = an.moveis.filter(m => !(m.id === sl.id && m.x === sl.x && m.y === sl.y)); return an.moveis.length !== n; });
    else if (sl.k === 'escada') mudar('tirar a escada', (pl, an) => {
      const e = an.escadas.find(x => x.x === sl.x && x.y === sl.y); if (!e) return false;
      an.escadas = an.escadas.filter(x => x !== e);
      const outro = pl.andares.find(x => x.id === e.para);
      if (outro) outro.escadas = outro.escadas.filter(x => !(x.x === e.x && x.y === e.y && x.para === an.id));
    });
    else if (sl.k === 'sala') mudar('apagar um cômodo', (pl, an) => {
      const q = an.salas.find(x => x.id === sl.id); if (!q) return false;
      if (an.salas.length === 1) { toast('O andar precisa de pelo menos um cômodo.'); return false; }
      an.salas = an.salas.filter(x => x !== q);
      an.moveis = an.moveis.filter(m => !dentro(q, m.x, m.y));
      an.escadas = an.escadas.filter(e => !dentro(q, e.x, e.y));
      const viva = (x, y) => an.salas.some(o => dentro(o, x, y));
      // as aberturas que deixaram de estar numa parede saem; a porta de entrada sai com o cômodo dela
      an.aberturas = an.aberturas.filter(o => { const hz = o.y1 === o.y2, a1 = hz ? viva(o.x1, o.y1 - 1) : viva(o.x1 - 1, o.y1), b1 = hz ? viva(o.x1, o.y1) : viva(o.x1, o.y1); return a1 || b1; });
      if (an.id === 't' && pl.porta && !an.aberturas.some(o => o.entrada)) pl.porta = null;
    });
    st.sel = null;
    pintar();
  }
  // um andar novo: o de cima (ou o porão), com os cômodos do andar vizinho e uma escada ligando os dois
  function novoAndar(qual) {
    const p = predio(), ids = p.planta.andares.map(a => a.id);
    const ordem = S.ANDARES.map(([k]) => k), alto = ids.filter(k => k !== 'p').sort((a, b) => ordem.indexOf(b) - ordem.indexOf(a))[0];
    const id = qual === 'p' ? 'p' : ordem[ordem.indexOf(alto) + 1];
    if (!id || ids.includes(id)) { toast(qual === 'p' ? 'O prédio já tem porão.' : 'O prédio já tem o máximo de andares.'); return; }
    const vizinho = qual === 'p' ? (ids.includes('t') ? 't' : ids[0]) : alto;
    mudar('pôr ' + (qual === 'p' ? 'o porão' : 'o ' + S.nomeDoAndar(id)), pl => {
      const v = pl.andares.find(a => a.id === vizinho);
      const salas = v.salas.map(q => ({ id: q.id, x: q.x, y: q.y, w: q.w, h: q.h, papel: 'vazio', piso: qual === 'p' ? 'pedra' : q.piso }));
      const aberturas = v.aberturas.filter(o => !o.entrada && o.k === 'door').filter(o => { const hz = o.y1 === o.y2; const a1 = hz ? v.salas.some(q => dentro(q, o.x1, o.y1 - 1)) : v.salas.some(q => dentro(q, o.x1 - 1, o.y1)); const b1 = v.salas.some(q => dentro(q, o.x1, o.y1)); return a1 && b1; }).map(o => ({ k: 'door', x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2 }));
      // a escada: num quadrado livre dos dois andares (o primeiro, de cima para baixo)
      let lugar = null;
      for (const q of v.salas) { for (let j = q.y; j < q.y + q.h && !lugar; j++) for (let i = q.x; i < q.x + q.w && !lugar; i++) if (!v.moveis.some(m => i >= m.x && i < m.x + m.s && j >= m.y && j < m.y + m.s) && !v.escadas.some(e => e.x === i && e.y === j) && !v.aberturas.some(o => (o.x1 === i || o.x2 === i + 1 || o.x1 === i + 1) && (o.y1 === j || o.y1 === j + 1))) lugar = [i, j]; if (lugar) break; }
      const novo = { id, salas, aberturas, moveis: [], escadas: lugar ? [{ x: lugar[0], y: lugar[1], para: vizinho }] : [] };
      if (lugar) v.escadas.push({ x: lugar[0], y: lugar[1], para: id });
      pl.andares.push(novo);
    });
    st.andar = id; st.sel = null;
    pintar();
  }
  function apagarAndar() {
    const p = predio(), id = st.andar;
    if (id === 't') { toast('O térreo não sai.'); return; }
    kit.confirmar('Apagar o ' + S.nomeDoAndar(id).toLowerCase() + '?', 'Os cômodos, os móveis e as escadas dele saem (dá para desfazer). A cena dele, se já existe, fica nas Cenas.', 'Apagar').then(sim => {
      if (!sim) return;
      mudar('apagar o ' + S.nomeDoAndar(id).toLowerCase(), pl => { pl.andares = pl.andares.filter(a => a.id !== id); for (const a of pl.andares) a.escadas = a.escadas.filter(e => e.para !== id); });
      st.andar = 't'; st.sel = null; pintar();
    });
  }
  function mobiliar(sala) {
    const p = predio(), a = andarDe(p, st.andar);
    mudar('mobiliar ' + (sala.nome || (S.PAPEIS[sala.papel] || S.PAPEIS.vazio).n).toLowerCase(), (pl, an) => {
      const q = an.salas.find(x => x.id === sala.id); if (!q) return false;
      an.moveis = an.moveis.filter(m => !dentro(q, m.x, m.y));
      const so = { id: an.id, salas: [q], aberturas: an.aberturas, moveis: [], escadas: an.escadas };
      const novos = S.mobiliar(so, pl.W, pl.H, S.novaSemente(), pl.forma === 'oct' ? pl.corte : 0);
      // (os móveis novos não ficam em cima dos que estão em outros cômodos: só caem dentro deste)
      an.moveis = an.moveis.concat(novos.filter(m => dentro(q, m.x, m.y)));
    });
  }
  function tamanho(w, hh) {
    const p = predio(), pl = p.planta;
    if (w === pl.W && hh === pl.H) return;
    const corta = pl.andares.some(a => a.salas.some(q => q.x + q.w > w || q.y + q.h > hh));
    const fazer = () => mudar('mudar o tamanho do prédio', pl2 => {
      pl2.W = w; pl2.H = hh;
      for (const a of pl2.andares) {
        a.salas = a.salas.filter(q => q.x < w && q.y < hh).map(q => Object.assign(q, { w: Math.min(q.w, w - q.x), h: Math.min(q.h, hh - q.y) })).filter(q => q.w >= 1 && q.h >= 1);
        a.moveis = a.moveis.filter(m => m.x + m.s <= w && m.y + m.s <= hh);
        a.escadas = a.escadas.filter(e => e.x < w && e.y < hh);
        a.aberturas = a.aberturas.filter(o => o.x2 <= w && o.y2 <= hh);
      }
      if (pl2.porta && (pl2.porta.x2 > w || pl2.porta.y2 > hh)) pl2.porta = null;
    });
    if (corta) kit.confirmar('Diminuir o prédio?', 'Os cômodos que passam do tamanho novo são cortados (e o que estiver neles sai). Dá para desfazer.', 'Diminuir').then(sim => { if (sim) fazer(); else pintar(); });
    else fazer();
  }
  // salvar como planta da mesa (a Sede mostra em "Minhas plantas")
  function salvarPlanta() {
    const p = predio();
    kit.pedirTexto('Salvar como planta', 'O nome da planta', p.nome).then(nome => {
      nome = String(nome || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      if (!nome) return;
      kit.mudarDoc(PLANTAS, 'salvar a planta ' + nome, normPlantas, d => {
        if (d.lista.length >= 40) { toast('Já são 40 plantas salvas: apague uma na Sede antes.'); return false; }
        d.lista.push({ id: S.novoId('pl'), nome, tipo: p.tipo, planta: JSON.parse(JSON.stringify(p.planta)) });
      });
      kit.avisoDesfazer('A planta “' + nome + '” foi salva: ela aparece em “Minhas plantas”, na Sede.');
      pintar();
    });
  }
  function normPlantas(d) {
    const l = d && Array.isArray(d.lista) ? d.lista : [];
    const out = { v: 1, lista: [] };
    for (const x of l) {
      if (!x || typeof x !== 'object' || out.lista.length >= 40) continue;
      const planta = S.normPlanta(x.planta);
      if (!planta) continue;
      out.lista.push({ id: typeof x.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(x.id) ? x.id : S.novoId('pl'), nome: String(x.nome || 'Planta').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Planta', tipo: S.PREDIOS[x.tipo] ? x.tipo : 'livre', planta });
    }
    return out;
  }

  /* ---------------- a tela ---------------- */
  function marcarSel() {
    const svg = svgNaTela(); if (!svg) return;
    svg.querySelectorAll('.sel').forEach(x => x.classList.remove('sel'));
    const sl = st.sel; if (!sl) return;
    const sel = sl.k === 'sala' ? `[data-sala="${sl.id}"]` : sl.k === 'movel' ? `[data-movel="${sl.id}@${sl.x},${sl.y}"]` : `[data-escada="${sl.x},${sl.y}"]`;
    const el = svg.querySelector(sel); if (el) el.classList.add('sel');
  }
  function pintar() {
    if (!st.aberto || !raiz) return;
    if (st.arrasto) return;
    const p = predio();
    if (!p) { fechar(); return; }
    if (!p.planta.andares.some(a => a.id === st.andar)) st.andar = andarDe(p, 't').id;
    const a = andarDe(p, st.andar);
    const ordem = S.ANDARES.map(([k]) => k), temAlto = ordem.indexOf(p.planta.andares.filter(x => x.id !== 'p').map(x => x.id).sort((x, y) => ordem.indexOf(y) - ordem.indexOf(x))[0]) < ordem.length - 1;
    raiz.replaceChildren(
      h('div', { class: 'cs-top' },
        h('b', { class: 'cs-tit', text: p.nome }),
        h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Os andares' }, p.planta.andares.map(x => h('button', { type: 'button', role: 'tab', 'data-k': 'cs:andar:' + x.id, 'aria-pressed': String(x.id === st.andar), onclick: () => { st.andar = x.id; st.sel = null; pintar(); } }, S.nomeDoAndar(x.id)))),
        h('button', { type: 'button', class: 'btn sm', 'data-k': 'cs:mais-andar', disabled: !temAlto, onclick: () => novoAndar('cima') }, '+ Andar'),
        p.planta.andares.some(x => x.id === 'p') ? null : h('button', { type: 'button', class: 'btn sm', 'data-k': 'cs:porao', onclick: () => novoAndar('p') }, '+ Porão'),
        st.andar !== 't' ? h('button', { type: 'button', class: 'btn sm per', 'data-k': 'cs:apagar-andar', onclick: apagarAndar }, 'Apagar este andar') : null,
        h('span', { class: 'grow' }),
        h('button', { type: 'button', class: 'btn sm', 'data-k': 'cs:desfazer', disabled: !kit.podeDesfazer(), onclick: () => kit.desfazer() }, 'Desfazer'),
        h('button', { type: 'button', class: 'btn sm', 'data-k': 'cs:salvar', onclick: salvarPlanta }, 'Salvar como planta'),
        kit.verNasCenas ? h('button', { type: 'button', class: 'btn sm pri', 'data-k': 'cs:cenas', disabled: !kit.naCasca(), onclick: () => { fechar(); kit.verNasCenas(st.cla, st.pr); } }, 'Ver nas Cenas') : null,
        h('button', { type: 'button', class: 'btn sm', 'data-k': 'cs:fechar', onclick: fechar }, 'Fechar')),
      h('div', { class: 'cs-corpo' },
        h('nav', { class: 'cs-rail', 'aria-label': 'Ferramentas' }, FERR.map(([k, n, dica]) => h('button', { type: 'button', 'data-k': 'cs:f:' + k, 'aria-pressed': String(st.ferr === k), title: dica, onclick: () => { st.ferr = k; if (k !== 'sel') st.sel = null; pintar(); } }, n))),
        h('div', { class: 'cs-mapa' }, desenho(p, a)),
        h('aside', { class: 'cs-lado', 'data-k': 'cs:lado' })));
    pintarLado(p);
  }
  function pintarLado(p) {
    const lado = raiz && raiz.querySelector('[data-k="cs:lado"]'); if (!lado) return;
    const a = andarDe(p, st.andar), sl = st.sel, out = [];
    const ajuda = t => h('p', { class: 'ajuda', text: t });
    if (st.ferr === 'piso' || (sl && sl.k === 'sala')) {
      out.push(h('div', { class: 'rot-sec', text: 'Piso' }), h('div', { class: 'cs-pisos', role: 'group', 'aria-label': 'O piso' }, S.PISOS.map(([k, n, cor]) => h('button', { type: 'button', 'data-k': 'cs:piso:' + k, title: n, 'aria-label': n, 'aria-pressed': String(st.piso === k), style: 'background:' + cor, onclick: () => {
        st.piso = k;
        if (sl && sl.k === 'sala' && st.ferr === 'sel') { const q = a.salas.find(x => x.id === sl.id); if (q) pisoEm(q); else pintar(); } else pintar();
      } }))));
    }
    if (sl && sl.k === 'sala') {
      const q = a.salas.find(x => x.id === sl.id);
      if (q) out.unshift(h('h3', { class: 'tit', text: q.nome || (S.PAPEIS[q.papel] || S.PAPEIS.vazio).n }), ajuda(q.w + ' × ' + q.h + ' quadrados'),
        h('label', { class: 'field' }, h('span', { text: 'Nome (opcional)' }), h('input', { class: 'in', type: 'text', 'data-k': 'cs:sala-nome', value: q.nome || '', maxlength: 40, placeholder: (S.PAPEIS[q.papel] || S.PAPEIS.vazio).n, onchange: function () { const v = this.value; mudar('renomear o cômodo', (pl, an) => { const x = an.salas.find(y => y.id === q.id); if (!x) return false; x.nome = v; }); } })),
        h('label', { class: 'field' }, h('span', { text: 'Para que serve' }), h('select', { class: 'in', 'data-k': 'cs:sala-papel', value: q.papel, onchange: function () { const v = this.value; mudar('trocar o cômodo', (pl, an) => { const x = an.salas.find(y => y.id === q.id); if (!x) return false; x.papel = v; }); } }, Object.keys(S.PAPEIS).map(k => h('option', { value: k, text: S.PAPEIS[k].n })))),
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm', 'data-k': 'cs:mobiliar', title: 'Põe os móveis do tipo do cômodo (os que estão nele saem)', onclick: () => mobiliar(q) }, 'Mobiliar sozinho'),
          h('button', { type: 'button', class: 'btn sm per', 'data-k': 'cs:apagar-sala', onclick: apagarSel }, 'Apagar o cômodo')));
    } else if (sl && sl.k === 'movel') {
      const M = S.MOVEIS[sl.id] || { n: sl.id };
      out.push(h('h3', { class: 'tit', text: M.n }), ajuda('Arraste para mover. R gira; Delete tira.'),
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm', 'data-k': 'cs:girar', onclick: girarMovel }, 'Girar'), h('button', { type: 'button', class: 'btn sm per', 'data-k': 'cs:tirar', onclick: apagarSel }, 'Tirar')));
    } else if (sl && sl.k === 'escada') {
      const e = a.escadas.find(x => x.x === sl.x && x.y === sl.y);
      out.push(h('h3', { class: 'tit', text: 'Escada' }), ajuda(e ? 'Leva ao ' + S.nomeDoAndar(e.para).toLowerCase() + ' (lá, a escada de volta fica no mesmo lugar). Arraste para mover as duas.' : ''),
        h('button', { type: 'button', class: 'btn sm per', 'data-k': 'cs:tirar', onclick: apagarSel }, 'Tirar a escada'));
    } else if (st.ferr === 'movel') {
      const busca = st.busca.toLowerCase();
      const lista = Object.keys(S.MOVEIS).filter(k => !busca || S.MOVEIS[k].n.toLowerCase().includes(busca));
      out.push(h('div', { class: 'rot-sec', text: 'Móveis e objetos' }),
        h('input', { class: 'in', type: 'search', 'data-k': 'cs:busca', value: st.busca, placeholder: 'Buscar: cama, baú, bigorna…', oninput: function () { st.busca = this.value; pintarLado(predio()); const b = raiz.querySelector('[data-k="cs:busca"]'); if (b) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); } } }),
        h('div', { class: 'cs-moveis' }, lista.map(k => h('button', { type: 'button', 'data-k': 'cs:m:' + k, 'aria-pressed': String(st.movel === k), onclick: () => { st.movel = k; pintarLado(predio()); } },
          h('span', { class: 'cs-mcor', style: 'background:' + COR_MOVEL[TIPO_COR[k] || 'madeira'] + (S.MOVEIS[k].s > 1 ? ';width:18px;height:18px' : '') }), S.MOVEIS[k].n))),
        ajuda('Clique no chão para pôr. Depois, com Escolher, arraste para mover; R gira.'));
    } else {
      const ferr = FERR.find(x => x[0] === st.ferr);
      out.push(h('h3', { class: 'tit', text: ferr ? ferr[1] : 'Escolher' }), ajuda(ferr ? ferr[2] + '.' : ''));
      if (st.ferr === 'sel') {
        out.push(h('div', { class: 'rot-sec', text: 'O prédio' }),
          h('div', { class: 'row' },
            h('label', { class: 'field' }, h('span', { text: 'Largura' }), h('select', { class: 'in', 'data-k': 'cs:w', value: String(p.planta.W), onchange: function () { tamanho(Number(this.value), p.planta.H); } }, Array.from({ length: 38 }, (_, i) => h('option', { value: String(i + 3), text: (i + 3) + ' quadrados' })))),
            h('label', { class: 'field' }, h('span', { text: 'Fundo' }), h('select', { class: 'in', 'data-k': 'cs:h', value: String(p.planta.H), onchange: function () { tamanho(p.planta.W, Number(this.value)); } }, Array.from({ length: 38 }, (_, i) => h('option', { value: String(i + 3), text: (i + 3) + ' quadrados' }))))),
          ajuda(a.salas.length + (a.salas.length === 1 ? ' cômodo' : ' cômodos') + ', ' + a.moveis.length + ' móveis e ' + a.escadas.length + (a.escadas.length === 1 ? ' escada' : ' escadas') + ' neste andar.'),
          a.id === 't' ? ajuda(p.planta.porta ? 'A porta de entrada está marcada em amarelo.' : 'Sem porta de entrada: use Porta numa parede de fora do térreo.') : null);
      }
    }
    lado.replaceChildren(...out.filter(Boolean));
  }
  return { abrir, fechar, pintar, aberto: () => st.aberto, normPlantas, PLANTAS, st };
};
