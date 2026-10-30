/* (lote 23) Os filtros da aba Skills da ficha: a busca (pelo nome e pelo texto) e o botão "Filtros (n)", que abre os
   chips — o tipo de uso (Ativa, Reação, Passiva…), a origem (cada árvore, a skill única, a escrita à mão) e a barra
   (▲ soma, ▼ gasta, com custo de uso). Valem para os cartões de "Aprendidas" e para as "Passivas e habilidades".
   Dentro de um grupo de chips, basta um bater; entre os grupos, todos. Cada ficha lembra o filtro dela, neste
   navegador. Só esconde: nada muda na ficha.
   (lote 43) Em cima, o filtro de um toque do guia de ícones: Todas · Reações · os papéis (Ofensivas, Defensivas…) ·
   Favoritas — um de cada vez, somando com a busca e os chips. A barra: ▲ enche, ▼ gasta, ⇄ balança. */
window.FichasFiltroSk = (() => {
  const KEY = 'tinycats:filtroSk';
  const GRUPOS = [{ k: 'uso', nome: 'Uso' }, { k: 'orig', nome: 'Origem' }, { k: 'barra', nome: 'Barra' }];
  const MAO_USO = { Ativo: 'ativa', Reativo: 'reacao', Passivo: 'passiva', Inativo: 'inativa' };
  const NOME_EXTRA = { inativa: 'Inativa', _: 'Sem tipo', ativa: 'Ativa', reacao: 'Reação', passiva: 'Passiva' };
  let aberto = false;                                   // o painel dos chips (vale para todas as fichas, só nesta tela)
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function todos() { try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } }
  function filtroDe(pc) {
    const f = (pc && todos()[pc.id]) || {};
    const lista = v => Array.isArray(v) ? v.map(String) : [];
    return { q: String(f.q || ''), uso: lista(f.uso), orig: lista(f.orig), barra: lista(f.barra), p: typeof f.p === 'string' ? f.p : '' };
  }
  function guardar(pc, f) {
    const o = todos(), vazio = !f.q.trim() && !f.uso.length && !f.orig.length && !f.barra.length && !f.p;
    if (vazio) delete o[pc.id]; else o[pc.id] = f;
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* sem armazenamento: vale só até recarregar */ }
  }
  const nChips = f => f.uso.length + f.orig.length + f.barra.length;
  const ativo = f => !!(f.q.trim() || nChips(f) || f.p);

  function nomeDoUso(id) {
    const u = (typeof usoArv === 'function') ? usoArv(id) : null;
    return u ? u.nome : (NOME_EXTRA[id] || id);
  }
  function usoDaMao(h) {
    const tp = h.tipo || 'Ativo';
    if (tp === 'Inativo') return 'inativa';
    const u = (typeof usoDoTipoHab === 'function') ? usoDoTipoHab(tp) : null;
    return u ? u.id : (MAO_USO[tp] || 'ativa');
  }
  /* Tudo o que a aba mostra, cada um com o que os filtros olham. */
  function itens(pc) {
    const R = window.TC && TC.rules, out = [];
    // (lote 43) o papel, o tempo, as etiquetas da barra e a estrela vêm da lista das aprendidas (fichas/skills-lista.js)
    const lista = window.FichasSkLista ? FichasSkLista.itens(pc) : [];
    for (const it of lista) {
      let custo = false; try { custo = !!(it.uso && R && R.custoDeUso && R.custoDeUso(it.uso).length); } catch (e) { custo = false; }
      const usos = (it.usos || []).filter(u => (typeof usoArv === 'function') ? usoArv(u) : true), etq = it.etq || [];
      const arv = it.tipo === 'arv';
      out.push({ sel: arv ? '[data-habarv="' + CSS.escape(it.n.id) + '"]' : '[data-habunica="' + CSS.escape(it.u.id) + '"]', uso: usos.length ? usos : ['_'],
        orig: arv ? 'arv:' + (it.arvore && it.arvore.id || '') : 'unica', origNome: arv ? (it.arvore && it.arvore.nome || 'Árvore') : 'Skill única',
        soma: etq.some(e => e.k === 'enche'), gasta: etq.some(e => e.k === 'gasta'), balanca: etq.some(e => e.k === 'balanca'), custo,
        papel: it.papel || '', reacao: it.tempo === 'reacao', fav: !!it.fav,
        texto: norm(arv ? [it.nome, it.desc, it.texto, it.arvore && it.arvore.nome].join(' ') : [it.nome, it.desc, 'skill unica'].join(' ')) });
    }
    for (const h of (pc.habilidades || [])) {
      const u = usoDaMao(h);
      out.push({ sel: '[data-habmao="' + CSS.escape(h.id) + '"]', uso: [u], orig: 'mao', origNome: 'À mão', soma: false, gasta: false, balanca: false, custo: false,
        papel: '', reacao: u === 'reacao' || (h.tipo || '') === 'Reativo', fav: false, texto: norm([h.nome, h.desc].join(' ')) });
    }
    return out;
  }
  // o filtro de um toque: '' (todas), 'reacao', 'fav' ou um papel
  const bateP = (it, p) => (!p ? true : p === 'reacao' ? it.reacao : p === 'fav' ? it.fav : it.papel === p);
  function bate(it, f, sem) {
    if (sem !== 'p' && !bateP(it, f.p)) return false;
    if (sem !== 'q' && f.q.trim()) { const pal = norm(f.q).split(/\s+/).filter(Boolean); if (!pal.every(p => it.texto.includes(p))) return false; }
    if (sem !== 'uso' && f.uso.length && !it.uso.some(u => f.uso.includes(u))) return false;
    if (sem !== 'orig' && f.orig.length && !f.orig.includes(it.orig)) return false;
    if (sem !== 'barra' && f.barra.length && !f.barra.some(b => (b === 'soma' && it.soma) || (b === 'gasta' && it.gasta) || (b === 'balanca' && it.balanca) || (b === 'custo' && it.custo))) return false;
    return true;
  }
  /* Os chips de cada grupo, com quantos aparecem ligando aquele chip (com os outros grupos como estão). */
  function chips(pc, f, its) {
    const g = { uso: new Map(), orig: new Map(), barra: new Map() };
    for (const it of its) {
      for (const u of it.uso) if (!g.uso.has(u)) g.uso.set(u, nomeDoUso(u));
      if (!g.orig.has(it.orig)) g.orig.set(it.orig, it.origNome);
    }
    if (its.some(i => i.soma)) g.barra.set('soma', '▲ enche');
    if (its.some(i => i.gasta)) g.barra.set('gasta', '▼ gasta');
    if (its.some(i => i.balanca)) g.barra.set('balanca', '⇄ balança');
    if (its.some(i => i.custo)) g.barra.set('custo', 'Com custo');
    for (const k of ['uso', 'orig', 'barra']) for (const v of f[k]) if (!g[k].has(v)) g[k].set(v, k === 'uso' ? nomeDoUso(v) : v);   // (um chip ligado que sumiu continua, para dar para desligar)
    const conta = (k, v) => its.filter(it => bate(it, f, k) && (k === 'uso' ? it.uso.includes(v) : k === 'orig' ? it.orig === v : (v === 'soma' ? it.soma : v === 'gasta' ? it.gasta : v === 'balanca' ? it.balanca : it.custo))).length;
    return GRUPOS.map(gr => ({ k: gr.k, nome: gr.nome, lista: [...g[gr.k]].map(([v, nome]) => ({ v, nome, n: conta(gr.k, v), on: f[gr.k].includes(v) })) })).filter(gr => gr.lista.length);
  }

  function html(pc) {
    const its = itens(pc);
    if (!its.length) return '';
    const f = filtroDe(pc), n = nChips(f);
    return `<div class="skfiltro" id="skFiltro">
      <div class="skf-rapido" id="skf-rapido" role="group" aria-label="Mostrar">${htmlRapido(f, its)}</div>
      <div class="skf-linha">
        <input type="search" class="in" id="skf-busca" placeholder="Buscar skill…" aria-label="Buscar skill pelo nome ou pelo texto" value="${escH(f.q)}" autocomplete="off">
        <button type="button" class="mini${n ? ' on' : ''}" id="skf-abrir" aria-expanded="${aberto}" aria-controls="skf-painel">Filtros${n ? ' (' + n + ')' : ''} ${aberto ? '▴' : '▾'}</button>
        <button type="button" class="mini" id="skf-limpar"${ativo(f) ? '' : ' hidden'}>Limpar</button>
        <span class="hint skf-conta" id="skf-conta" aria-live="polite"></span>
      </div>
      <div class="skf-painel" id="skf-painel"${aberto ? '' : ' hidden'}>${htmlChips(pc, f, its)}</div>
    </div>`;
  }
  /* A fileira de um toque: Todas, Reações (se houver), os papéis que aparecem nesta ficha (na ordem do guia) e
     Favoritas (se houver). O que estiver ligado aparece mesmo sem nenhuma, para dar para desligar. */
  function htmlRapido(f, its) {
    const R = window.TC && TC.rules, I = window.TC && TC.icones, svg = (id, cls) => (I ? '<span class="' + cls + '">' + I.svg(id) + '</span>' : '');
    const bt = (v, rot, ic) => `<button type="button" data-skfp="${escH(v)}" aria-pressed="${f.p === v}">${ic || ''}${escH(rot)}</button>`;
    const out = ['<span class="hint">Mostrar</span>', bt('', 'Todas')];
    if (its.some(i => i.reacao) || f.p === 'reacao') out.push(bt('reacao', 'Reações', svg('reacao', 'ic-reacao')));
    for (const p of ((R && R.PAPEIS) || [])) if (its.some(i => i.papel === p.id) || f.p === p.id) out.push(bt(p.id, p.plural, svg(p.id, 'ic-papel')));
    if (its.some(i => i.fav) || f.p === 'fav') out.push(bt('fav', 'Favoritas', svg('estrela', 'ic-fav')));
    return out.join('');
  }
  function htmlChips(pc, f, its) {
    return chips(pc, f, its).map(gr => `<div class="skf-g"><span class="eyebrow">${gr.nome}</span><span class="skf-chips">${gr.lista.map(c =>
      `<button type="button" class="skf-chip${c.on ? ' on' : ''}${c.n || c.on ? '' : ' zero'}" data-skf="${gr.k}" data-skfv="${escH(c.v)}" aria-pressed="${c.on}">${escH(c.nome)} <span class="mono">${c.n}</span></button>`).join('')}</span></div>`).join('');
  }
  /* Esconde o que não bate e escreve quantos aparecem. */
  function aplicar(host, pc) {
    const box = host.querySelector('#skFiltro'); if (!box) return;
    const f = filtroDe(pc), its = itens(pc);
    let vis = 0;
    for (const it of its) { const ok = bate(it, f); if (ok) vis++; host.querySelectorAll(it.sel).forEach(el => { el.hidden = !ok; }); }
    const conta = box.querySelector('#skf-conta');
    if (conta) conta.textContent = !ativo(f) ? '' : vis ? 'Mostrando ' + vis + ' de ' + its.length : 'Nenhuma skill com esses filtros.';
    host.querySelectorAll('.skf-nada').forEach(x => x.remove());
    const grade = host.querySelector('#habsDaArvore');
    if (grade && ativo(f) && grade.children.length && ![...grade.children].some(x => !x.hidden)) grade.insertAdjacentHTML('afterend', '<div class="hint skf-nada">Nenhuma das aprendidas bate com o filtro.</div>');
    const habs = host.querySelector('#painelHabs .bd');
    if (habs && ativo(f) && (pc.habilidades || []).length && ![...habs.querySelectorAll('[data-habmao]')].some(x => !x.hidden)) habs.insertAdjacentHTML('afterbegin', '<div class="hint skf-nada">Nenhuma das escritas à mão bate com o filtro.</div>');
  }
  function redesenharChips(host, pc) {
    const box = host.querySelector('#skFiltro'); if (!box) return;
    const f = filtroDe(pc), n = nChips(f), b = box.querySelector('#skf-abrir'), l = box.querySelector('#skf-limpar'), p = box.querySelector('#skf-painel');
    if (b) { b.textContent = 'Filtros' + (n ? ' (' + n + ')' : '') + ' ' + (aberto ? '▴' : '▾'); b.classList.toggle('on', !!n); b.setAttribute('aria-expanded', String(aberto)); }
    if (l) l.hidden = !ativo(f);
    if (p) { p.hidden = !aberto; p.innerHTML = htmlChips(pc, f, itens(pc)); ligarChips(host, pc); }
    const rp = box.querySelector('#skf-rapido');
    if (rp) { rp.innerHTML = htmlRapido(f, itens(pc)); ligarRapido(host, pc); }
  }
  function ligarChips(host, pc) {
    host.querySelectorAll('#skFiltro [data-skf]').forEach(c => c.onclick = () => {
      const f = filtroDe(pc), k = c.dataset.skf, v = c.dataset.skfv;
      f[k] = f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v];
      guardar(pc, f); redesenharChips(host, pc); aplicar(host, pc);
      const de = host.querySelector('#skFiltro [data-skf="' + k + '"][data-skfv="' + CSS.escape(v) + '"]'); if (de) de.focus();
    });
  }
  function ligarRapido(host, pc) {
    host.querySelectorAll('#skFiltro [data-skfp]').forEach(b => b.onclick = () => {
      const f = filtroDe(pc), v = b.dataset.skfp;
      f.p = f.p === v ? '' : v;                            // (tocar de novo no que está ligado volta para Todas)
      guardar(pc, f); redesenharChips(host, pc); aplicar(host, pc);
      const de = host.querySelector('#skFiltro [data-skfp="' + CSS.escape(f.p) + '"]'); if (de) de.focus();
    });
  }
  function ligar(host, pc) {
    const box = host.querySelector('#skFiltro'); if (!box) return;
    ligarRapido(host, pc);
    const bu = box.querySelector('#skf-busca');
    if (bu) bu.oninput = () => { const f = filtroDe(pc); f.q = bu.value; guardar(pc, f); redesenharChips(host, pc); aplicar(host, pc); };
    const b = box.querySelector('#skf-abrir');
    if (b) b.onclick = () => { aberto = !aberto; redesenharChips(host, pc); };
    const l = box.querySelector('#skf-limpar');
    if (l) l.onclick = () => { guardar(pc, { q: '', uso: [], orig: [], barra: [], p: '' }); if (bu) bu.value = ''; redesenharChips(host, pc); aplicar(host, pc); if (bu) bu.focus(); };
    ligarChips(host, pc);
    aplicar(host, pc);
  }
  return { html, ligar, aplicar, filtroDe, itens, KEY };
})();
