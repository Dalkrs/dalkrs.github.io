/* Tiny Cats · as tags (lote 27): as condições, os efeitos (as áreas no chão) e os recursos (os contadores de raça e de
   classe) com uma explicação curta — o conceito, sem números. Onde o nome aparece escrito (o texto das árvores, as
   fichas, o acampamento, as notas do mestre…), ele ganha um sublinhado pontilhado; passar o mouse mostra a explicação
   numa telinha. Um elemento com data-tag-nome="Atordoado" (os ícones das condições nos tokens das Cenas) mostra a
   explicação daquela tag ao passar o mouse.
   As tags que vêm prontas ficam em tc/tags.json. O mestre edita, apaga e cria na Oficina (a aba Tags da Árvore): o que
   ele muda fica no documento da mesa "arvore:tags" (vis 'mesa': todos leem, quem mestra a Árvore escreve) — sem mesa,
   neste navegador. A lista de verdade é a pronta com as mudanças por cima: { ed: { id: campos }, novas: [tag], fora: [id] }.
   O sublinhado não mexe no texto da página: usa os destaques do navegador (CSS.highlights), que não mudam o HTML —
   por isso vale também dentro do editor das notas. Navegador sem esse recurso: sem sublinhado, mas a telinha aparece.
     TC.tags.pronto            — promessa: as prontas chegaram
     TC.tags.lista()           — [{ id, nome, tipo, texto, formas, de, cor, nova }] (as apagadas não vêm)
     TC.tags.prontas()         — as que vêm prontas (como vieram)
     TC.tags.mudancas()        — { ed, novas, fora }
     TC.tags.gravar(m)         — grava as mudanças (só quem mestra a Árvore, ou sem mesa)
     TC.tags.porNome(nome)     — a tag com esse nome (ou outra forma dele), ou null
     TC.tags.aoMudar(fn)       — a lista mudou
     TC.tags.TIPOS             — { condicao, efeito, recurso }: { nome, cor } */
(() => {
  'use strict';
  const TC = (window.TC = window.TC || {});
  if (TC.tags) return;
  const DOC = 'arvore:tags', LOCAL = 'tinycats:tags';
  const URL_PRONTAS = (() => { try { return new URL('tags.json?v=3', document.currentScript.src).href; } catch (e) { return 'tc/tags.json?v=3'; } })();
  const TIPOS = { condicao: { nome: 'Condição', cor: '#d08a3c' }, efeito: { nome: 'Efeito', cor: '#3f9bbf' }, recurso: { nome: 'Recurso', cor: '#8c74d6' } };
  let prontas = [], mud = { ed: {}, novas: [], fora: [] }, lista = [], porNomeM = new Map(), re = null;
  const ouvintes = [];
  let tVarrer = 0;                         // (antes de tudo: a ponte avisa já ao ligar)
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const txt = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
  const limparTag = (t, id) => ({
    id, nome: txt(t.nome, 60), tipo: TIPOS[t.tipo] ? t.tipo : 'condicao', texto: txt(t.texto, 400), de: txt(t.de, 80),
    cor: /^#[0-9a-fA-F]{6}$/.test(t.cor || '') ? t.cor : '',
    formas: (Array.isArray(t.formas) ? t.formas : String(t.formas || '').split(',')).map(f => txt(f, 60)).filter(Boolean).slice(0, 8),
  });
  function limparMud(m) {
    m = ehObj(m) ? m : {};
    const ed = {};
    if (ehObj(m.ed)) for (const id in m.ed) if (ehObj(m.ed[id]) && /^[\w:.-]{1,80}$/.test(id)) ed[id] = m.ed[id];
    const novas = (Array.isArray(m.novas) ? m.novas : []).filter(ehObj).filter(t => /^[\w:.-]{1,80}$/.test(t.id || '')).slice(0, 500);
    const fora = (Array.isArray(m.fora) ? m.fora : []).filter(x => typeof x === 'string').slice(0, 1000);
    return { ed, novas, fora };
  }
  // a lista de verdade: as prontas com as mudanças por cima, e as novas
  function montar() {
    const fora = new Set(mud.fora);
    lista = prontas.filter(t => !fora.has(t.id)).map(t => limparTag(Object.assign({}, t, mud.ed[t.id] || {}), t.id))
      .concat(mud.novas.map(t => Object.assign(limparTag(t, t.id), { nova: true })))
      .filter(t => t.nome);
    porNomeM = new Map();
    for (const t of lista) for (const n of [t.nome, ...t.formas]) if (n.length >= 3 && !porNomeM.has(n)) porNomeM.set(n, t);
    const nomes = [...porNomeM.keys()].sort((a, b) => b.length - a.length).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    try { re = nomes.length ? new RegExp('(?<![\\p{L}\\p{N}])(' + nomes.join('|') + ')(?![\\p{L}\\p{N}])', 'gu') : null; } catch (e) { re = null; }
    for (const fn of ouvintes) { try { fn(lista); } catch (e) { console.error(e); } }
    agendar();
  }

  /* ---- de onde vêm as mudanças: a mesa (dentro da casca) ou este navegador ---- */
  const naCasca = () => { try { return window.parent !== window; } catch (e) { return true; } };
  const mesaAberta = () => {
    try {
      if (TC.ponte && TC.ponte.estado && naCasca()) return !!TC.ponte.estado.mesa;
      return !!(TC.mesas && TC.mesas.atual);
    } catch (e) { return false; }
  };
  const col = () => { try { return mesaAberta() && TC.dados && TC.dados.col ? TC.dados.col('documentos') : null; } catch (e) { return null; } };
  function lerMudancas() {
    const D = col();
    if (D) { const l = D.pegar(DOC); mud = limparMud(l && !l.apagado ? l.dados : null); }
    else { try { mud = limparMud(JSON.parse(localStorage.getItem(LOCAL) || 'null')); } catch (e) { mud = limparMud(null); } }
    montar();
  }
  let ligadoA = null;
  function ligarDados() {
    const D = col();
    if (!D || ligadoA === D) return;
    ligadoA = D;
    if (D.pronta && D.pronta.then) D.pronta.then(lerMudancas, () => {});
    if (typeof D.aoMudar === 'function') D.aoMudar(l => { if (l && l.id === DOC) lerMudancas(); });
  }
  if (TC.dados && typeof TC.dados.on === 'function') TC.dados.on('muda', c => { if (c === 'documentos') { ligarDados(); lerMudancas(); } });
  if (TC.ponte && typeof TC.ponte.aoMudar === 'function') TC.ponte.aoMudar(() => { ligarDados(); lerMudancas(); });
  window.addEventListener('storage', e => { if (e.key === LOCAL && !col()) lerMudancas(); });

  const pronto = fetch(URL_PRONTAS).then(r => (r.ok ? r.json() : { tags: [] })).catch(() => ({ tags: [] })).then(j => {
    prontas = (Array.isArray(j && j.tags) ? j.tags : []).filter(ehObj).map(t => limparTag(t, String(t.id)));
    ligarDados(); lerMudancas();
    return lista;
  });

  function gravar(m) {
    mud = limparMud(m);
    const D = col();
    if (D) D.gravar(DOC, { dados: mud, vis: 'mesa' });
    else { try { localStorage.setItem(LOCAL, JSON.stringify(mud)); } catch (e) { /* sem espaço */ } }
    montar();
  }

  /* ---- o sublinhado (sem mexer no texto) ---- */
  const temDestaque = typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight === 'function';
  let achados = new Map();                 // nó de texto → [{ i, f, t }]
  const PULA = 'script,style,textarea,input,select,option,svg,noscript,.tc-tag-dica,[data-sem-tags],[data-tag-nome]';   // (quem tem data-tag-nome já mostra a telinha)
  function varrer() {
    achados = new Map();
    const ranges = [];
    if (re && document.body) {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: n => (!n.nodeValue || n.nodeValue.length < 3 || !n.parentElement || n.parentElement.closest(PULA) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
      });
      for (let n; (n = w.nextNode());) {
        const s = n.nodeValue; re.lastIndex = 0;
        for (let m; (m = re.exec(s));) {
          const t = porNomeM.get(m[1]); if (!t) continue;
          if (!achados.has(n)) achados.set(n, []);
          achados.get(n).push({ i: m.index, f: m.index + m[1].length, t });
          if (temDestaque) { const r = new Range(); r.setStart(n, m.index); r.setEnd(n, m.index + m[1].length); ranges.push(r); }
        }
      }
    }
    if (temDestaque) { try { CSS.highlights.set('tc-tag', new Highlight(...ranges)); } catch (e) { /* sem destaque */ } }
  }
  function agendar() { clearTimeout(tVarrer); tVarrer = setTimeout(varrer, 200); }
  function observar() {
    if (!document.body) return;
    new MutationObserver(ms => { if (ms.some(m => !(m.target.closest ? m.target : m.target.parentElement || document.body).closest('.tc-tag-dica'))) agendar(); })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
    agendar();
  }

  /* ---- a telinha ---- */
  let dica = null, dicaDe = null;
  function estilo() {
    if (document.getElementById('tc-tags-css')) return;
    const st = document.createElement('style');
    st.id = 'tc-tags-css';
    st.textContent = `::highlight(tc-tag){text-decoration:underline dotted;text-decoration-thickness:1.5px;text-underline-offset:3px}
[data-tag-nome]{cursor:help}
.tc-tag-dica{position:fixed;z-index:2147483600;max-width:300px;padding:9px 11px;border-radius:9px;background:#1b1f2a;color:#eceef3;border:1px solid #3a4256;
  box-shadow:0 10px 28px rgba(0,0,0,.4);font:13px/1.45 "Atkinson Hyperlegible Next","Atkinson Hyperlegible","Segoe UI",system-ui,sans-serif;pointer-events:none;opacity:0;transition:opacity .12s}
.tc-tag-dica.on{opacity:1}
.tc-tag-dica b{display:block;font-size:13.5px;margin-bottom:3px}
.tc-tag-dica .tt{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:1px 6px;border-radius:999px;margin-right:6px;color:#14161c}
.tc-tag-dica .de{display:block;margin-top:4px;font-size:11.5px;color:#a8b0c2}`;
    document.head.appendChild(st);
  }
  function mostrar(t, x, y, chave) {
    if (!t || !t.texto) { esconder(); return; }
    if (!dica) { dica = document.createElement('div'); dica.className = 'tc-tag-dica'; dica.setAttribute('role', 'tooltip'); document.body.appendChild(dica); }
    if (dicaDe !== chave) {
      dicaDe = chave;
      const tp = TIPOS[t.tipo] || TIPOS.condicao, b = document.createElement('b'), sp = document.createElement('span'), p = document.createElement('span');
      sp.className = 'tt'; sp.style.background = t.cor || tp.cor; sp.textContent = tp.nome;
      b.append(sp, document.createTextNode(t.nome));
      p.textContent = t.texto;
      dica.replaceChildren(b, p);
      if (t.de) { const d = document.createElement('span'); d.className = 'de'; d.textContent = t.de; dica.append(d); }
    }
    dica.classList.add('on');
    const r = dica.getBoundingClientRect();
    let px = x + 14, py = y + 18;
    if (px + r.width > innerWidth - 8) px = Math.max(8, x - r.width - 14);
    if (py + r.height > innerHeight - 8) py = Math.max(8, y - r.height - 14);
    dica.style.left = px + 'px'; dica.style.top = py + 'px';
  }
  function esconder() { if (dica) dica.classList.remove('on'); dicaDe = null; }
  function naPosicao(x, y) {
    let no = null, off = 0;
    if (document.caretPositionFromPoint) { const c = document.caretPositionFromPoint(x, y); if (c) { no = c.offsetNode; off = c.offset; } }
    else if (document.caretRangeFromPoint) { const c = document.caretRangeFromPoint(x, y); if (c) { no = c.startContainer; off = c.startOffset; } }
    const l = no && achados.get(no); if (!l) return null;
    for (const a of l) {
      if (off < a.i || off > a.f) continue;
      const r = new Range(); r.setStart(no, a.i); r.setEnd(no, a.f);
      for (const q of r.getClientRects()) if (x >= q.left - 1 && x <= q.right + 1 && y >= q.top - 1 && y <= q.bottom + 1) return a;
    }
    return null;
  }
  let quadro = 0, ult = null;
  function aoMover(e) {
    ult = e; if (quadro) return;
    quadro = requestAnimationFrame(() => {
      quadro = 0; const ev = ult;
      const el = ev.target && ev.target.closest ? ev.target.closest('[data-tag-nome]') : null;
      if (el) {
        const t = porNome(el.getAttribute('data-tag-nome'));
        if (t) { if (el.title) { el.dataset.tituloGuardado = el.title; el.removeAttribute('title'); } mostrar(t, ev.clientX, ev.clientY, 'el:' + t.id); return; }
      }
      const a = achados.size ? naPosicao(ev.clientX, ev.clientY) : null;
      if (a) mostrar(a.t, ev.clientX, ev.clientY, 'tx:' + a.t.id); else esconder();
    });
  }
  // o título do elemento volta quando o mouse sai (ele foi guardado para não aparecerem duas telinhas)
  document.addEventListener('mouseout', e => { const el = e.target && e.target.closest ? e.target.closest('[data-titulo-guardado]') : null; if (el && !el.contains(e.relatedTarget)) { el.title = el.dataset.tituloGuardado; delete el.dataset.tituloGuardado; } }, true);
  document.addEventListener('mousemove', aoMover, { passive: true });
  document.addEventListener('scroll', esconder, true);
  document.addEventListener('pointerdown', esconder, true);

  function porNome(n) { return porNomeM.get(String(n || '').trim()) || null; }
  const iniciar = () => { estilo(); observar(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

  TC.tags = {
    pronto, TIPOS,
    lista: () => lista.slice(),
    prontas: () => prontas.slice(),
    mudancas: () => JSON.parse(JSON.stringify(mud)),
    gravar, porNome,
    aoMudar(fn) { ouvintes.push(fn); },
    podeEditar: () => { const D = col(); if (!D) return true; try { return TC.ponte && TC.ponte.mestra ? TC.ponte.mestra('arvore') : false; } catch (e) { return false; } },
    _varrer: varrer,
  };
})();
