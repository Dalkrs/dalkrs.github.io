/* Tiny Cats · o quadro de pistas (lote 143, pedido do Dalmo).
   Os quadros de cada jogador: um mural de cortiça onde ele prega cartões (notas, as pistas que recebeu, as missões dos
   personagens dele, pessoas, lugares do Mapa-múndi, imagens), pinta cada um de uma cor (certeza, dúvida, perigo,
   ideia, descartado) e liga com fios de cor e textura, com um texto no fio. Zoom e arrastar o fundo.
   Cada quadro é o documento quadroj:<jogador>:<id> (ver tc/quadro.js); o mestre vê os de todos, só olhando.
   Fora de uma mesa, tudo fica neste navegador. */
(() => {
  'use strict';
  const Q = window.TC.quadro, E = window.TC.escudo, MS = window.TC.missoes;
  const DEBUG = /[?&]debug\b/.test(location.search);
  const $ = id => document.getElementById(id);
  const SVGNS = 'http://www.w3.org/2000/svg';
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el[k] = v;
      else if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = true;
      else if (k === 'style') el.setAttribute('style', v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c);
    return el;
  }
  const sv = (tag, at) => { const el = document.createElementNS(SVGNS, tag); for (const k in at || {}) el.setAttribute(k, at[k]); return el; };
  function toast(msg, acao, fn, ms) {
    const t = h('div', { class: 'toast', role: 'status' }, h('span', { text: msg }), acao ? h('button', { type: 'button', text: acao, onclick: () => { t.remove(); fn(); } }) : null);
    $('toasts').append(t);
    setTimeout(() => t.remove(), ms || (acao ? 7000 : 4000));
  }
  const dlg = $('dlg');
  const fechar = () => { if (dlg.open) dlg.close(); };

  /* ---------------- os dados ---------------- */
  let st = null, D = null, PC = null, naMesa = false, mestre = false, eu = 'local', pronto = false;
  let sel = null;                                     // o id do documento do quadro aberto
  const LOCAL = 'tinycats:quadros:local';
  const local = (() => { try { return JSON.parse(localStorage.getItem(LOCAL) || '{}') || {}; } catch (e) { return {}; } })();
  function linhas() {
    if (naMesa) return D.todas();
    return Object.keys(local).map(id => ({ id, dados: local[id] }));
  }
  const quadros = () => Q.quadrosEm(linhas());
  const meus = () => quadros().filter(x => x.dono === eu);
  const visiveis = () => (mestre ? quadros() : meus());
  const atual = () => visiveis().find(x => x.id === sel) || null;
  const podeMexer = () => { const x = atual(); return !!x && x.dono === eu; };
  const nomeDe = u => { const m = st && (st.membros || []).find(y => (y.id || y.usuario_id) === u); return m ? (m.nome || 'Sem nome') : (u === 'local' ? 'Você' : 'Alguém'); };
  function gravar(id, dados) {
    const q = Q.norm(dados); q.em = new Date().toISOString();
    if (naMesa) { const ja = D.pegar(id); D.gravar(id, ja && !ja.apagado ? { dados: q } : { dados: q, vis: 'mestre', dono_id: eu }, null, { cas: true }); }
    else { local[id] = q; try { localStorage.setItem(LOCAL, JSON.stringify(local)); } catch (e) { toast('Não deu para guardar neste navegador.'); } }
  }
  function mudar(op, txtDesfazer) {
    const x = atual();
    if (!x || x.dono !== eu) return;
    const antes = x.q, depois = Q.mudar(antes, op);
    gravar(x.id, depois);
    pintar();
    if (txtDesfazer) toast(txtDesfazer, 'Desfazer', () => { gravar(x.id, antes); pintar(); });
  }

  /* ---------------- o que dá para pregar ---------------- */
  function pistasMinhas() {
    if (!naMesa || !E) return [];
    return D.todas().filter(l => !l.apagado && E.hidDaPista(l.id)).map(l => {
      const p = E.normPista(l.dados);
      const texto = p.partes.filter(x => typeof x === 'string').join('').replace(/\s+/g, ' ').trim();
      return { id: l.id, n: p.nome, d: (p.legenda || texto).slice(0, 600), img: p.img, tipo: p.tipo, em: p.em };
    }).sort((a, b) => String(b.em || '').localeCompare(String(a.em || '')));
  }
  function missoesMinhas() {
    if (!naMesa || !MS || !PC) return [];
    const camp = st && st.campanha ? st.campanha.id : '';
    const dd = id => { const l = D.pegar(id); return l && !l.apagado ? l.dados : null; };
    const quadroM = dd(MS.comCamp(MS.QUADRO, camp)), out = [], vistos = new Set();
    for (const pc of PC.todas().filter(l => !l.apagado && l.dono_id === eu)) {
      for (const m of MS.doPersonagem(quadroM, dd(MS.PRE_PC + pc.id), pc.id)) {
        if (vistos.has(m.id)) continue;
        vistos.add(m.id);
        out.push({ id: m.id, n: m.t || 'Missão', d: m.d || '', e: m.e, pc: pc.nome || '' });
      }
    }
    return out;
  }
  function lugaresDoMapa() {
    if (!naMesa) return [];
    const out = [];
    for (const l of D.todas()) {
      if (l.apagado || typeof l.id !== 'string' || !l.id.startsWith(mestre ? 'mundo:mapa:' : 'mundo:pub:')) continue;
      const objs = l.dados && Array.isArray(l.dados.objs) ? l.dados.objs : [];
      for (const o of objs) if (o && o.k === 'm' && o.nome && !o.oculto) out.push({ id: l.id + '#' + o.id, n: String(o.nome), d: String(o.txt || '') });
    }
    return out.sort((a, b) => a.n.localeCompare(b.n));
  }

  /* ---------------- a vista: zoom e arrasto do fundo ---------------- */
  const vista = { z: 0.6, x: 20, y: 20 };
  const palco = $('palco'), board = $('board');
  board.style.width = Q.TAM.w + 'px'; board.style.height = Q.TAM.h + 'px';
  function aplicarVista() { board.style.transform = `translate(${vista.x}px, ${vista.y}px) scale(${vista.z})`; }
  function zoomEm(f, cx, cy) {
    const r = palco.getBoundingClientRect(), px = cx == null ? r.width / 2 : cx - r.left, py = cy == null ? r.height / 2 : cy - r.top;
    const z = Math.max(0.2, Math.min(2.5, vista.z * f));
    vista.x = px - (px - vista.x) * (z / vista.z); vista.y = py - (py - vista.y) * (z / vista.z); vista.z = z;
    aplicarVista();
  }
  function ajustar() {
    const x = atual(), r = palco.getBoundingClientRect();
    const cs = x ? Object.values(x.q.cartas) : [];
    if (!cs.length) { vista.z = Math.min(1, r.width / Q.TAM.w * 1.6); vista.x = 20; vista.y = 20; aplicarVista(); return; }
    const x0 = Math.min(...cs.map(c => c.x)) - 60, y0 = Math.min(...cs.map(c => c.y)) - 60, x1 = Math.max(...cs.map(c => c.x + (c.w || 200))) + 60, y1 = Math.max(...cs.map(c => c.y + 200)) + 60;
    vista.z = Math.max(0.2, Math.min(1.2, Math.min(r.width / (x1 - x0), r.height / (y1 - y0))));
    vista.x = (r.width - (x1 - x0) * vista.z) / 2 - x0 * vista.z; vista.y = (r.height - (y1 - y0) * vista.z) / 2 - y0 * vista.z;
    aplicarVista();
  }
  palco.addEventListener('wheel', ev => { ev.preventDefault(); zoomEm(ev.deltaY < 0 ? 1.12 : 1 / 1.12, ev.clientX, ev.clientY); }, { passive: false });
  let pan = null;
  palco.addEventListener('pointerdown', ev => {
    if (ev.target.closest('.carta, .zoom, .vazio, .fio-h, button')) return;
    pan = { x: ev.clientX, y: ev.clientY, vx: vista.x, vy: vista.y }; palco.classList.add('pan'); palco.setPointerCapture(ev.pointerId);
  });
  palco.addEventListener('pointermove', ev => { if (!pan) return; vista.x = pan.vx + ev.clientX - pan.x; vista.y = pan.vy + ev.clientY - pan.y; aplicarVista(); });
  const soltarPan = () => { pan = null; palco.classList.remove('pan'); };
  palco.addEventListener('pointerup', soltarPan); palco.addEventListener('pointercancel', soltarPan);
  $('zMais').onclick = () => zoomEm(1.2); $('zMenos').onclick = () => zoomEm(1 / 1.2); $('zAjustar').onclick = ajustar;

  /* ---------------- os fios ---------------- */
  // o desenho de um fio com textura: o barbante cai um pouco no meio (a curva), e a textura muda o traço
  function desenharFio(g, f, a, b) {
    const cor = Q.corFio(f.cor), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + Math.min(80, Math.hypot(b.x - a.x, b.y - a.y) * 0.12);
    const d = `M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`;
    const p = (at) => g.append(sv('path', Object.assign({ d, fill: 'none', 'stroke-linecap': 'round' }, at)));
    const sombra = { stroke: 'rgba(0,0,0,.35)', 'stroke-width': 5, transform: 'translate(2 3)' };
    switch (f.tex) {
      case 'torcido': p(sombra); p({ stroke: cor, 'stroke-width': 4 }); p({ stroke: 'rgba(255,255,255,.45)', 'stroke-width': 2, 'stroke-dasharray': '3 5' }); p({ stroke: 'rgba(0,0,0,.35)', 'stroke-width': 2, 'stroke-dasharray': '3 5', 'stroke-dashoffset': 4 }); break;
      case 'la': p(Object.assign({}, sombra, { 'stroke-width': 9 })); p({ stroke: cor, 'stroke-width': 8, opacity: 0.55 }); p({ stroke: cor, 'stroke-width': 5 }); p({ stroke: 'rgba(255,255,255,.25)', 'stroke-width': 7, 'stroke-dasharray': '1 4' }); break;
      case 'corrente': p(sombra); p({ stroke: '#2b2b2b', 'stroke-width': 7, 'stroke-dasharray': '9 3' }); p({ stroke: cor, 'stroke-width': 4.5, 'stroke-dasharray': '9 3' }); p({ stroke: 'rgba(255,255,255,.5)', 'stroke-width': 1.2, 'stroke-dasharray': '6 6' }); break;
      case 'tracejado': p(sombra); p({ stroke: cor, 'stroke-width': 3.5, 'stroke-dasharray': '14 9' }); break;
      case 'pontilhado': p(sombra); p({ stroke: cor, 'stroke-width': 5, 'stroke-dasharray': '0.1 10' }); break;
      default: p(sombra); p({ stroke: cor, 'stroke-width': 3.2 });
    }
    const hit = sv('path', { d, class: 'fio-h', 'data-fio': f.id });
    g.append(hit);
    if (f.txt) { const t = sv('text', { x: mx, y: (a.y + b.y) / 2 + (my - (a.y + b.y) / 2) / 2 - 8, 'text-anchor': 'middle', class: 'fio-txt' }); t.textContent = f.txt; g.append(t); }
    return hit;
  }

  /* ---------------- a legenda (lote 144) ---------------- */
  let legAberta = false;
  function amostra(cor, tex) {
    const s = sv('svg', { viewBox: '0 0 70 16', 'aria-hidden': 'true' }), g = sv('g');
    s.append(g); desenharFio(g, { id: 'x', cor, tex, txt: '' }, { x: 6, y: 7 }, { x: 64, y: 7 });
    g.querySelectorAll('path').forEach(p => p.setAttribute('d', 'M6 7 L64 7'));
    return s;
  }
  function pintarLegenda() {
    const el = $('legenda'), x = atual();
    el.hidden = !legAberta || !x;
    $('btLegenda').classList.toggle('on', legAberta); $('btLegenda').setAttribute('aria-pressed', String(legAberta));
    if (el.hidden) return;
    const q = x.q;
    el.replaceChildren(
      h('h3', { text: 'A cor do fio: o tipo de ligação' }), h('p', { text: 'Escreva no fio o que liga os dois (ex.: “mentiu para”, “esteve em”).' }),
      h('ul', null, Q.CORES_FIO.map(([k, n]) => h('li', null, amostra(k, 'barbante'), h('span', null, h('b', { text: n }), Q.sentido(q, 'c', k))))),
      h('h3', { text: 'A textura: o quanto você tem certeza' }),
      h('ul', null, Q.TEXTURAS.map(([k, n]) => h('li', null, amostra('vermelho', k), h('span', null, h('b', { text: n }), Q.sentido(q, 't', k))))),
      h('h3', { text: 'A cor do cartão: o que você acha dele' }),
      h('ul', null, Q.CORES.map(([k, n, cor]) => h('li', null, h('i', { style: `display:block;width:70px;height:16px;border-radius:3px;background:${cor}` }), h('span', null, h('b', { text: n }), ({ '': 'Ainda sem opinião', certo: 'Tenho certeza', duvida: 'Não sei se é verdade', perigo: 'Perigo, cuidado', ideia: 'Uma ideia, uma teoria', descartado: 'Já descartei' })[k])))),
      h('div', { class: 'pe' }, podeMexer() ? h('button', { type: 'button', class: 'btn', id: 'legEd', text: 'Mudar os significados', onclick: editarLegenda }) : null,
        h('button', { type: 'button', class: 'btn', text: 'Fechar', onclick: () => { legAberta = false; pintarLegenda(); } })));
  }
  function editarLegenda() {
    const x = atual(); if (!x) return;
    const ins = [];
    const linha = (g, k, n) => { const i = h('input', { class: 'in', value: Q.sentido(x.q, g, k), maxlength: 60, 'data-g': g, 'data-k': k }); ins.push(i); return h('label', null, h('span', { text: n }), i); };
    abrirJanela(h('h2', { text: 'Os significados deste quadro' }),
      h('div', { class: 'leg-ed' }, h('b', { text: 'Cores do fio' }), Q.CORES_FIO.map(([k, n]) => linha('c', k, n)), h('b', { text: 'Texturas' }), Q.TEXTURAS.map(([k, n]) => linha('t', k, n))),
      h('div', { class: 'pe' }, h('button', { type: 'button', class: 'btn esq', text: 'Voltar aos de costume', onclick: () => { fechar(); mudar({ t: 'legenda', leg: null }, 'A legenda voltou à de costume.'); } }),
        h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: fechar }),
        h('button', { type: 'button', class: 'btn pri', id: 'legOk', text: 'Salvar', onclick: () => {
          const leg = { c: {}, t: {} };
          for (const i of ins) leg[i.dataset.g][i.dataset.k] = i.value;
          fechar(); mudar({ t: 'legenda', leg });
        } })));
  }
  // as escolhas do próximo fio dizem o que querem dizer
  function pintarEscolhasDoFio() {
    const x = atual(), q = x ? x.q : null, cut = s => (s.length > 34 ? s.slice(0, 33) + '…' : s);
    for (const [id, lista, g] of [['fioCor', Q.CORES_FIO, 'c'], ['fioTex', Q.TEXTURAS, 't']]) {
      const s = $(id), v = s.value;
      s.replaceChildren(...lista.map(([k, n]) => h('option', { value: k, title: Q.sentido(q, g, k), text: n + ' · ' + cut(Q.sentido(q, g, k)) })));
      if (v) s.value = v;
    }
  }

  /* ---------------- o desenho ---------------- */
  const inclin = id => { let s = 0; for (const c of id) s = (s * 31 + c.charCodeAt(0)) | 0; return ((Math.abs(s) % 7) - 3) * 0.6; };
  const ROT = Object.fromEntries(Q.TIPOS);
  let ligando = false, primeiro = null;
  function pintarTopo() {
    const lst = visiveis(), s = $('selQ');
    if (!lst.some(x => x.id === sel)) sel = (lst.find(x => x.dono === eu) || lst[0] || {}).id || null;
    s.replaceChildren(...lst.map(x => h('option', { value: x.id, selected: x.id === sel || null, text: (mestre && x.dono !== eu ? nomeDe(x.dono) + ' · ' : '') + x.q.n })));
    s.hidden = !lst.length;
    const mexe = podeMexer();
    $('btRenomear').hidden = !mexe; $('ferr').hidden = !mexe;
    for (const id of ['btPregar', 'btLigar']) $(id).hidden = !mexe;
    document.querySelector('.fiodef').hidden = !mexe;
    $('soVer').hidden = mexe || !atual();
    $('btLegenda').hidden = !atual();
    pintarEscolhasDoFio();
    pintarLegenda();
    $('soVer').textContent = atual() && !mexe ? 'Só olhando: o quadro de ' + nomeDe(atual().dono) : 'Só olhando';
  }
  function pintar() {
    if (!pronto) return;
    pintarTopo();
    const x = atual(), vazio = $('vazio');
    board.replaceChildren();
    if (!x) {
      vazio.hidden = false;
      vazio.replaceChildren(h('div', null, h('h2', { text: mestre && naMesa ? 'Nenhum quadro ainda' : 'O seu quadro de pistas' }),
        h('p', { text: mestre && naMesa ? 'Quando um jogador montar um quadro de pistas, ele aparece aqui para você olhar.' : 'Um mural para juntar as pistas, as missões, as pessoas e os lugares, e ligar tudo com fios: a sua linha de pensamento da quest e da saga.' }),
        mestre && naMesa ? null : h('button', { type: 'button', class: 'btn pri', text: 'Criar o primeiro quadro', onclick: novoQuadro })));
      return;
    }
    vazio.hidden = true;
    const mexe = podeMexer(), q = x.q;
    // (os fios vão por cima dos cartões, de alfinete a alfinete, como num quadro de verdade)
    const fios = sv('svg', { class: 'fios', width: Q.TAM.w, height: Q.TAM.h });
    const els = {};
    for (const id of Object.keys(q.cartas)) {
      const c = q.cartas[id];
      const el = h('div', { class: 'carta ' + c.k + (c.cor ? ' ' + c.cor : '') + (primeiro === id ? ' escolhida' : ''), 'data-carta': id, tabindex: 0, role: 'group', 'aria-label': ROT[c.k] + ': ' + (c.t || ''),
        style: `left:${c.x}px;top:${c.y}px;width:${c.w || (c.k === 'nota' ? 180 : 200)}px;background:${Q.corDe(c.cor)};transform:rotate(${inclin(id)}deg)` },
        h('span', { class: 'alfinete', 'aria-hidden': 'true' }),
        h('span', { class: 'tipo', text: ROT[c.k] + (c.cor ? ' · ' + (Q.CORES.find(k => k[0] === c.cor) || ['', ''])[1] : '') }),
        c.t ? h('b', { text: c.t }) : null,
        c.url ? h('img', { src: c.url, alt: c.t || 'Imagem', loading: 'lazy', draggable: 'false' }) : null,
        c.d ? h('p', { text: c.d }) : null,
        mexe ? h('span', { class: 'acoes' }, h('button', { type: 'button', title: 'Editar', 'aria-label': 'Editar', 'data-ed': id, text: '✎' })) : null);
      els[id] = el;
      board.append(el);
      if (mexe) {
        el.addEventListener('pointerdown', ev => arrastar(ev, id, el));
        el.addEventListener('click', ev => { if (ligando && !ev.target.closest('button')) escolher(id); });
        el.addEventListener('dblclick', () => { if (!ligando) editarCarta(id); });
        el.querySelector('[data-ed]').onclick = ev => { ev.stopPropagation(); editarCarta(id); };
      } else el.addEventListener('dblclick', () => abrirOriginal(c));
    }
    board.append(fios);
    // os fios, depois que os cartões têm tamanho (o fio sai do alfinete)
    requestAnimationFrame(() => {
      const ponto = id => { const c = q.cartas[id], el = els[id]; return { x: c.x + (el ? el.offsetWidth : 200) / 2, y: c.y + 11 }; };
      for (const f of q.fios) {
        const g = sv('g', { 'data-fiog': f.id }); fios.append(g);
        const hit = desenharFio(g, f, ponto(f.a), ponto(f.b));
        if (mexe) hit.addEventListener('click', () => editarFio(f.id));
      }
    });
    $('avisoLigar').hidden = !ligando;
    $('avisoLigar').textContent = primeiro ? 'Agora clique no outro cartão (Esc cancela).' : 'Clique no primeiro cartão para o fio (Esc cancela).';
  }

  /* ---------------- arrastar, ligar ---------------- */
  function arrastar(ev, id, el) {
    if (ligando || ev.button !== 0 || ev.target.closest('button')) return;
    ev.stopPropagation();
    const x = atual(), c = x.q.cartas[id], x0 = ev.clientX, y0 = ev.clientY;
    let moveu = false, nx = c.x, ny = c.y;
    el.setPointerCapture(ev.pointerId);
    const mv = e => {
      const dx = (e.clientX - x0) / vista.z, dy = (e.clientY - y0) / vista.z;
      if (!moveu && Math.hypot(dx, dy) < 3) return;
      moveu = true; el.classList.add('arrastando');
      nx = Math.round(Math.max(0, Math.min(Q.TAM.w - 60, c.x + dx))); ny = Math.round(Math.max(0, Math.min(Q.TAM.h - 60, c.y + dy)));
      el.style.left = nx + 'px'; el.style.top = ny + 'px';
    };
    const up = () => {
      el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      el.classList.remove('arrastando');
      if (moveu) mudar({ t: 'mover', id, x: nx, y: ny });
    };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }
  function modoLigar(on) {
    ligando = on; primeiro = null;
    $('btLigar').classList.toggle('on', on); $('btLigar').setAttribute('aria-pressed', String(on));
    pintar();
  }
  function escolher(id) {
    if (!primeiro) { primeiro = id; pintar(); return; }
    if (primeiro === id) { primeiro = null; pintar(); return; }
    const a = primeiro;
    primeiro = null;
    mudar({ t: 'fio', f: { id: Q.novoId('f'), a, b: id, cor: $('fioCor').value, tex: $('fioTex').value } });
    toast('Fio preso. Clique nele para escrever o que ele quer dizer.');
  }
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && ligando && !dlg.open) modoLigar(false); });

  /* ---------------- as janelas ---------------- */
  function abrirJanela(...kids) { dlg.replaceChildren(...kids); if (!dlg.open) dlg.showModal(); }
  const campoCor = (atualCor) => h('div', { class: 'cores', role: 'radiogroup', 'aria-label': 'A cor do cartão' },
    Q.CORES.map(([k, n, cor]) => h('label', null, h('input', { type: 'radio', name: 'cor', value: k, checked: k === (atualCor || '') || null }), h('i', { style: 'background:' + cor }), n)));
  // um lugar livre perto do meio da tela
  function lugarNovo() {
    const r = palco.getBoundingClientRect(), n = Object.keys((atual() || { q: { cartas: {} } }).q.cartas).length;
    return { x: Math.round(Math.max(20, Math.min(Q.TAM.w - 240, (r.width / 2 - vista.x) / vista.z - 100 + (n % 5) * 24))), y: Math.round(Math.max(20, Math.min(Q.TAM.h - 240, (r.height / 2 - vista.y) / vista.z - 80 + (n % 5) * 24))) };
  }
  function pregar(c) {
    const id = Q.novoId('c');
    mudar({ t: 'carta', id, c: Object.assign(lugarNovo(), c) });
    fechar();
  }
  function janelaPregar(aba) {
    aba = aba || 'nota';
    const abas = [['nota', 'Nota'], ['pista', 'Pista'], ['missao', 'Missão'], ['pessoa', 'Pessoa'], ['lugar', 'Lugar'], ['img', 'Imagem']];
    const corpo = h('div');
    const formLivre = (k, rotT, rotD, phT, phD) => {
      const t = h('input', { class: 'in', id: 'pT', maxlength: Q.LIM.titulo, placeholder: phT, style: 'width:100%' }), d = h('textarea', { class: 'in', id: 'pD', rows: 4, maxlength: Q.LIM.texto, placeholder: phD });
      corpo.append(h('label', { class: 'f' }, h('span', { text: rotT }), t), h('label', { class: 'f' }, h('span', { text: rotD }), d), h('div', { class: 'f' }, h('span', { text: 'Cor' }), campoCor('')));
      setTimeout(() => t.focus(), 0);
      return () => { if (!t.value.trim() && !d.value.trim()) { t.focus(); return; } pregar({ k, t: t.value, d: d.value, cor: (corpo.querySelector('input[name=cor]:checked') || {}).value || '' }); };
    };
    const lista = (itens, vazio, fn) => {
      corpo.append(itens.length ? h('div', { class: 'lista' }, itens.map(it => h('button', { type: 'button', onclick: () => fn(it) }, h('b', { text: it.n }), it.sub ? h('small', { text: it.sub }) : null))) : h('p', { class: 'dica', text: vazio }));
      return null;
    };
    let ok = null;
    if (aba === 'nota') ok = formLivre('nota', 'Título (opcional)', 'O que você pensa', 'ex.: Quem mentiu?', 'ex.: O ferreiro disse que estava na taverna, mas…');
    else if (aba === 'pessoa') ok = formLivre('pessoa', 'Nome', 'Quem é, o que sabe', 'ex.: Irmão Tobias', 'ex.: Noviço do templo. Viu alguém na cripta.');
    else if (aba === 'pista') lista(pistasMinhas().map(p => Object.assign({ sub: ({ imagem: 'Imagem', carta: 'Carta', puzzle: 'Puzzle' }[p.tipo] || 'Pista') + (p.d ? ' · ' + p.d.slice(0, 70) : '') }, p)), 'Você ainda não recebeu nenhuma pista do mestre.', p => pregar({ k: 'pista', t: p.n, d: p.d, url: p.img || undefined, ref: p.id }));
    else if (aba === 'missao') lista(missoesMinhas().map(m => Object.assign({ sub: (m.pc ? m.pc + ' · ' : '') + ({ ativa: 'em andamento', feita: 'cumprida', falhou: 'falhou', oferta: 'no quadro' }[m.e] || m.e) }, m)), 'Os seus personagens ainda não têm missões.', m => pregar({ k: 'missao', t: m.n, d: m.d.slice(0, 600), ref: m.id }));
    else if (aba === 'lugar') {
      const ls = lugaresDoMapa();
      lista(ls.map(l => Object.assign({ sub: l.d.slice(0, 80) }, l)), 'Nenhum lugar do Mapa-múndi à vista ainda.', l => pregar({ k: 'lugar', t: l.n, d: l.d.slice(0, 600), ref: l.id.replace(/[^A-Za-z0-9_:@#-]/g, '').replace('#', '@@').slice(0, 120) }));
      corpo.append(h('p', { class: 'dica', text: 'Não achou? Use "Nota" e escreva o lugar.' }));
    } else if (aba === 'img') {
      const arq = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', class: 'in', style: 'height:auto;padding:6px' }), t = h('input', { class: 'in', maxlength: Q.LIM.titulo, placeholder: 'Legenda (opcional)', style: 'width:100%' });
      corpo.append(h('label', { class: 'f' }, h('span', { text: 'A imagem' }), arq), h('label', { class: 'f' }, h('span', { text: 'Legenda' }), t),
        h('p', { class: 'dica', text: naMesa ? 'A imagem vai para a pasta da mesa.' : 'Fora de uma mesa não dá para guardar imagens.' }));
      ok = async () => {
        const f = arq.files && arq.files[0];
        if (!f) { arq.focus(); return; }
        if (!naMesa || !window.TC.arquivos) { toast('Imagens só numa mesa.'); return; }
        try { const url = await window.TC.arquivos.subir(f); pregar({ k: 'img', t: t.value, url }); } catch (e) { toast((e && e.message) || 'Não deu para enviar a imagem.'); }
      };
    }
    abrirJanela(h('h2', { text: 'Pregar no quadro' }),
      h('div', { class: 'abas-d', role: 'group' }, abas.map(([k, n]) => h('button', { type: 'button', 'aria-pressed': String(k === aba), 'data-aba': k, onclick: () => janelaPregar(k), text: n }))),
      corpo,
      h('div', { class: 'pe' }, h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: fechar }), ok ? h('button', { type: 'button', class: 'btn pri', id: 'pOk', text: 'Pregar', onclick: ok }) : null));
  }
  function editarCarta(id) {
    const x = atual(), c = x && x.q.cartas[id];
    if (!c) return;
    const t = h('input', { class: 'in', id: 'eT', value: c.t, maxlength: Q.LIM.titulo, style: 'width:100%' }), d = h('textarea', { class: 'in', id: 'eD', rows: 5, maxlength: Q.LIM.texto }); d.value = c.d;
    let certeza = false;
    const tirar = h('button', { type: 'button', class: 'btn perigo esq', id: 'eTira', text: 'Tirar do quadro', onclick: () => {
      if (!certeza) { certeza = true; tirar.textContent = 'Clique de novo para tirar'; return; }
      fechar(); mudar({ t: 'tirar', id }, 'O cartão saiu do quadro.');
    } });
    abrirJanela(h('h2', { text: ROT[c.k] }),
      h('label', { class: 'f' }, h('span', { text: c.k === 'pessoa' ? 'Nome' : 'Título' }), t),
      h('label', { class: 'f' }, h('span', { text: 'Texto' }), d),
      h('div', { class: 'f' }, h('span', { text: 'Cor' }), campoCor(c.cor)),
      h('div', { class: 'pe' }, tirar, c.ref && (c.k === 'pista' || c.k === 'missao') ? h('button', { type: 'button', class: 'btn', text: 'Abrir o original', onclick: () => { fechar(); abrirOriginal(c); } }) : null,
        h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: fechar }),
        h('button', { type: 'button', class: 'btn pri', id: 'eOk', text: 'Salvar', onclick: () => { fechar(); mudar({ t: 'carta', id, c: { t: t.value, d: d.value, cor: (dlg.querySelector('input[name=cor]:checked') || {}).value || '' } }); } })));
  }
  function abrirOriginal(c) {
    const P = window.TC && window.TC.ponte;
    if (!c.ref || !P || !P.ir) return;
    if (c.k === 'pista') P.ir('pistas', { pista: c.ref });
    else if (c.k === 'missao') P.ir('missoes', { missao: c.ref });
  }
  function editarFio(fid) {
    const x = atual(), f = x && x.q.fios.find(y => y.id === fid);
    if (!f) return;
    const t = h('input', { class: 'in', id: 'fT', value: f.txt, maxlength: Q.LIM.fioTxt, placeholder: 'ex.: suspeito de, esteve em, mentiu sobre', style: 'width:100%' });
    const cor = h('select', { class: 'in', id: 'fCor' }, Q.CORES_FIO.map(([k, n]) => h('option', { value: k, selected: k === f.cor || null, text: n + ' · ' + Q.sentido(x.q, 'c', k) })));
    const tex = h('select', { class: 'in', id: 'fTex' }, Q.TEXTURAS.map(([k, n]) => h('option', { value: k, selected: k === f.tex || null, text: n + ' · ' + Q.sentido(x.q, 't', k) })));
    const a = x.q.cartas[f.a], b = x.q.cartas[f.b];
    abrirJanela(h('h2', { text: 'O fio' }), h('p', { class: 'dica', text: 'Entre “' + (a.t || ROT[a.k]) + '” e “' + (b.t || ROT[b.k]) + '”.' }),
      h('label', { class: 'f' }, h('span', { text: 'O que ele quer dizer' }), t),
      h('div', { style: 'display:grid;gap:0' }, h('label', { class: 'f' }, h('span', { text: 'Cor' }), cor), h('label', { class: 'f' }, h('span', { text: 'Textura' }), tex)),
      h('div', { class: 'pe' }, h('button', { type: 'button', class: 'btn perigo esq', id: 'fTira', text: 'Cortar o fio', onclick: () => { fechar(); mudar({ t: 'semFio', id: fid }, 'O fio foi cortado.'); } }),
        h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: fechar }),
        h('button', { type: 'button', class: 'btn pri', id: 'fOk', text: 'Salvar', onclick: () => { fechar(); mudar({ t: 'fio', f: Object.assign({}, f, { txt: t.value, cor: cor.value, tex: tex.value }) }); } })));
    setTimeout(() => t.focus(), 0);
  }
  function novoQuadro() {
    if (meus().length >= Q.LIM.quadros) { toast('Você já tem ' + Q.LIM.quadros + ' quadros.'); return; }
    const n = h('input', { class: 'in', id: 'nQ', maxlength: Q.LIM.nome, placeholder: 'ex.: Minha saga, O mistério da Academia', style: 'width:100%' });
    const ok = () => {
      const nome = n.value.trim();
      if (!nome) { n.focus(); return; }
      const id = Q.idDoc(eu, Q.novoId('q'));
      gravar(id, { n: nome, cartas: {}, fios: [] });
      sel = id; fechar(); pintar(); ajustar();
    };
    n.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); ok(); } });
    abrirJanela(h('h2', { text: 'Quadro novo' }), h('label', { class: 'f' }, h('span', { text: 'Nome' }), n),
      h('div', { class: 'pe' }, h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: fechar }), h('button', { type: 'button', class: 'btn pri', id: 'nOk', text: 'Criar', onclick: ok })));
    setTimeout(() => n.focus(), 0);
  }
  function renomear() {
    const x = atual();
    if (!x || x.dono !== eu) return;
    const n = h('input', { class: 'in', id: 'rQ', value: x.q.n, maxlength: Q.LIM.nome, style: 'width:100%' });
    let certeza = false;
    const apagar = h('button', { type: 'button', class: 'btn perigo esq', id: 'rApaga', text: 'Apagar este quadro', onclick: () => {
      if (!certeza) { certeza = true; apagar.textContent = 'Clique de novo: apaga o quadro e tudo nele'; return; }
      fechar();
      if (naMesa) D.apagar(x.id); else { delete local[x.id]; try { localStorage.setItem(LOCAL, JSON.stringify(local)); } catch (e) { /* idem */ } }
      sel = null; pintar(); toast('O quadro “' + x.q.n + '” foi apagado.');
    } });
    abrirJanela(h('h2', { text: 'O quadro' }), h('label', { class: 'f' }, h('span', { text: 'Nome' }), n),
      h('div', { class: 'pe' }, apagar, h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: fechar }), h('button', { type: 'button', class: 'btn pri', id: 'rOk', text: 'Salvar', onclick: () => { fechar(); mudar({ t: 'nome', n: n.value }); } })));
  }

  $('btNovoQ').onclick = novoQuadro;
  $('btRenomear').onclick = renomear;
  $('btPregar').onclick = () => janelaPregar('nota');
  $('btLigar').onclick = () => modoLigar(!ligando);
  $('selQ').onchange = ev => { sel = ev.target.value; modoLigar(false); ajustar(); };
  $('btLegenda').onclick = () => { legAberta = !legAberta; pintarLegenda(); };

  /* ---------------- partida ---------------- */
  async function partida() {
    const TCx = window.TC;
    if (TCx && TCx.ponte) {
      st = await TCx.ponte.pronta;
      if (TCx.ponte.naCasca) document.documentElement.classList.add('na-casca');
      if (TCx.dados && TCx.dados.disponivel()) {
        naMesa = true;
        eu = st.eu || null;
        mestre = st.papel === 'mestre';
        D = TCx.dados.col('documentos'); PC = TCx.dados.col('personagens');
        await Promise.all([D.pronta, PC.pronta]);
        let t = null;
        D.aoMudar(l => { if (!l || typeof l.id !== 'string' || !l.id.startsWith(Q.PRE)) return; clearTimeout(t); t = setTimeout(() => { if (!dlg.open && !document.querySelector('.carta.arrastando')) pintar(); }, 120); });
      }
      TCx.ponte.aoMudar(e => { st = e; if (naMesa) mestre = st.papel === 'mestre'; if (pronto && !dlg.open) pintar(); });
    }
    if (!naMesa && /[?&]mestre\b/.test(location.search)) mestre = true;
    pronto = true;
    pintar();
    ajustar();
  }
  if (DEBUG) window.__quadro = { Q, quadros, meus, atual, pintar, ajustar, vista, get sel() { return sel; }, set sel(v) { sel = v; }, mudar, pistasMinhas, missoesMinhas, lugaresDoMapa };
  partida().catch(e => { console.error(e); toast('O quadro não abriu direito. Recarregue a página.'); });
})();
