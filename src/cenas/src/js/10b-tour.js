/* ---------------------------------------------------------------
   10b. TOUR — tutorial de primeiro uso
   Um destaque por vez, com um texto curto. O mestre só lê e avança:
   nada precisa ser feito durante o passeio e a cena não muda. Abre
   sozinho na primeira vez que o mestre entra e fica no menu ⋯ para rever.
   --------------------------------------------------------------- */
const Tour = (() => {
  let root = null, hole = null, card = null, steps = [], at = 0, saved = null, tick = 0;
  const SEEN_KEY = 'tinycats-tour', SEEN_KEY_OLD = 'urgm-tour';       // marca de "já viu o tutorial" neste navegador

  const rectOf = sel => {
    const n = document.querySelector(sel);
    if (!n || n.hidden) return null;
    const r = n.getBoundingClientRect();
    return r.width > 4 && r.height > 4 ? r : null;
  };
  // O token na tela, com folga para as barras em cima e o nome embaixo.
  function tokenRect(id) {
    const t = Store.get('tokens', id), sc = Store.scene();
    if (!t) return null;
    const r = Render.cv.getBoundingClientRect(), z = App.view.z, s = t.size * sc.cell * z;
    const [sx, sy] = Render.toScreen(t.x, t.y);
    return { left: r.left + sx - s * 0.25, top: r.top + sy - s * 0.55, width: s * 1.5, height: s * 2.05 };
  }
  function pickToken() {
    const sc = Store.scene(), sel = selOf('tokens');
    return (sel.length === 1 && App.sel.length === 1 ? sel[0] : null) || sc.tokens.find(t => t.owner && !t.hidden) || sc.tokens.find(t => !t.hidden) || sc.tokens[0] || null;
  }

  function build() {
    const tok = pickToken(), id0 = tok ? tok.id : null, sc = Store.scene();
    // No passo das condições, de preferência um token que já tenha alguma ativa (melhor ainda com contador).
    const withCond = sc.tokens.find(t => !t.hidden && t.conds.some(c => t.cinfo && t.cinfo[c] && (t.cinfo[c].n || t.cinfo[c].d))) || sc.tokens.find(t => !t.hidden && t.conds.length);
    const idC = withCond ? withCond.id : id0;
    const selectTok = id => {
      Tools.set('select');
      if (id && Store.get('tokens', id)) {
        setSel([{ c: 'tokens', id }]);
        // traz o token para a tela se a câmera estiver longe dele
        const r = tokenRect(id), cv = Render.cv.getBoundingClientRect();
        if (r && (r.left < cv.left || r.top < cv.top || r.left + r.width > cv.right || r.top + r.height > cv.bottom - 90)) { const [cx, cy] = tokC(Store.get('tokens', id), Store.scene()); Render.centerOn(cx, cy); }
      }
    };
    const select = () => selectTok(id0), id = id0;
    const openSec = sid => { const d = document.getElementById(sid); if (d) { d.open = true; d.scrollIntoView({ block: 'nearest' }); } };
    return [
      {
        title: 'Bem-vindo à mesa de cenas',
        text: 'Em um minuto, o essencial para conduzir uma cena: mover, barras, condições, turnos e ver como jogador. Você só lê e avança; nada muda na cena.',
        next: 'Começar',
      },
      {
        title: 'Mover os tokens',
        text: 'Arraste um token para movê-lo; ele encaixa na grade. Para andar pelo mapa, segure espaço e arraste. A roda do mouse aproxima e afasta.',
        enter: select, target: () => (id ? tokenRect(id) : null) || rectOf('#stage'),
      },
      {
        title: 'Barras',
        text: 'Com um token selecionado, as barras dele aparecem nesta faixa. Digite o valor novo, ou -8 e +5 para tirar e devolver. Para criar outras barras, use "Adicionar barra" no painel.',
        enter: select, target: () => rectOf('#hud'), side: 'above',
      },
      {
        title: 'Condições',
        text: 'Aqui você marca o que está afetando o token. Cada condição ativa pode ter um contador, que só muda nos botões + e −, e uma duração em rodadas, que desconta sozinha.',
        enter: () => { selectTok(idC); UI.openTab('sel'); }, after: () => openSec('s-cond'), target: () => rectOf('#s-cond') || rectOf('#side'), side: 'left',
      },
      {
        title: 'Turnos',
        text: 'A ordem do combate fica nesta aba. "Próximo turno" passa a vez, avisa de quem é a vez e desconta as durações.',
        enter: () => { UI.openTab('turn'); }, target: () => rectOf('#side'), side: 'left',
      },
      {
        title: 'Ver como jogador',
        text: 'Troque para um jogador e confira o que ele enxerga e pode fazer. Para voltar, escolha Mestre. Este passeio fica guardado no menu ⋯, em "Rever o tutorial".',
        target: () => rectOf('.viewer'), side: 'below', next: 'Concluir',
      },
    ];
  }

  function layout() {
    if (!root) return;
    const st = steps[at], W = window.innerWidth, H = window.innerHeight, gap = 14, m = 12;
    const r0 = st.target ? st.target() : null;
    const cw = card.offsetWidth, chh = card.offsetHeight;
    if (!r0) {
      hole.className = 'tour-hole none';
      hole.style.cssText = '';
      card.style.left = Math.max(m, (W - cw) / 2) + 'px';
      card.style.top = Math.max(m, (H - chh) / 2) + 'px';
      return;
    }
    const pad = 6;
    const x0 = clamp(r0.left - pad, 4, W - 4), y0 = clamp(r0.top - pad, 4, H - 4);
    const x1 = clamp(r0.left + r0.width + pad, 4, W - 4), y1 = clamp(r0.top + r0.height + pad, 4, H - 4);
    hole.className = 'tour-hole';
    hole.style.left = x0 + 'px'; hole.style.top = y0 + 'px';
    hole.style.width = Math.max(0, x1 - x0) + 'px'; hole.style.height = Math.max(0, y1 - y0) + 'px';
    const fits = { below: H - y1 >= chh + gap + m, above: y0 >= chh + gap + m, left: x0 >= cw + gap + m, right: W - x1 >= cw + gap + m };
    const order = [st.side, 'below', 'above', 'right', 'left'].filter(Boolean);
    const side = order.find(s => fits[s]) || 'center';
    let x, y;
    if (side === 'below') { x = (x0 + x1) / 2 - cw / 2; y = y1 + gap; }
    else if (side === 'above') { x = (x0 + x1) / 2 - cw / 2; y = y0 - gap - chh; }
    else if (side === 'left') { x = x0 - gap - cw; y = y0; }
    else if (side === 'right') { x = x1 + gap; y = y0; }
    else { x = (W - cw) / 2; y = (H - chh) / 2; }
    card.style.left = clamp(x, m, Math.max(m, W - cw - m)) + 'px';
    card.style.top = clamp(y, m, Math.max(m, H - chh - m)) + 'px';
  }

  function show(k) {
    at = clamp(k, 0, steps.length - 1);
    const st = steps[at], last = at === steps.length - 1;
    if (st.enter) st.enter();
    UI.renderAll();
    if (st.after) st.after();
    // ev.detail é 0 quando o "clique" veio do teclado (Enter ou espaço)
    const go = h('button', { type: 'button', class: 'btn primary', id: 'tour-next', onclick: ev => (last ? finish(ev.detail === 0) : show(at + 1)) }, h('span', { text: st.next || 'Próximo' }));
    card.replaceChildren();
    addKids(card, [
      at > 0 ? h('div', { class: 'tour-n', text: `${at} de ${steps.length - 1}` }) : null,
      h('h2', { class: 'tour-t', id: 'tour-title', text: st.title }),
      h('p', { class: 'tour-p', text: st.text }),
      h('div', { class: 'tour-a' },
        last ? null : h('button', { type: 'button', class: 'tour-skip', id: 'tour-skip', text: 'Pular o tutorial', onclick: ev => finish(ev.detail === 0) }),
        h('span', { class: 'spacer' }),
        at > 0 ? h('button', { type: 'button', class: 'btn', id: 'tour-back', onclick: () => show(at - 1) }, h('span', { text: 'Voltar' })) : null,
        go),
    ]);
    layout();
    go.focus({ preventScroll: true });
    // o painel e o mapa podem acabar de se ajeitar um instante depois: mede de novo
    clearTimeout(tick);
    tick = setTimeout(layout, 260);
  }

  function onKey(e) {
    if (!root) return;
    e.stopPropagation();                         // nenhuma tecla chega aos atalhos do mapa enquanto o passeio está aberto
    if (e.key === 'Escape') { e.preventDefault(); finish(true); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); if (at < steps.length - 1 && !e.repeat) show(at + 1); return; }   // o último passo só fecha no botão
    if (e.key === 'ArrowLeft') { e.preventDefault(); if (at > 0 && !e.repeat) show(at - 1); return; }
    if (e.key === 'Tab') {                       // o foco fica dentro do cartão
      const f = Array.from(card.querySelectorAll('button'));
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  }

  function start() {
    if (root) return;
    UI.closeMenus(); UI.closeModal();
    if (!isGM()) UI.setViewer('gm');
    Tools.cancel();
    saved = { sel: App.sel.slice(), tab: App.tab, sideOpen: App.sideOpen, tool: App.tool, view: Object.assign({}, App.view) };
    steps = build();
    hole = h('div', { class: 'tour-hole none' });
    card = h('div', { class: 'tour-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tour-title' });
    root = h('div', { class: 'tour', id: 'tour' }, hole, card);
    document.body.append(root);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', layout);
    show(0);
  }

  function finish(byKey) {
    if (!root) return;
    clearTimeout(tick);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', layout);
    root.remove(); root = hole = card = null;
    if (byKey === true) {
      // fechou pelo teclado com a tecla ainda apertada: as repetições dela não podem cair nos atalhos do mapa
      const eat = e => { if (e.repeat) { e.stopPropagation(); e.preventDefault(); } };
      const off = () => { document.removeEventListener('keydown', eat, true); document.removeEventListener('keyup', off, true); };
      document.addEventListener('keydown', eat, true);
      document.addEventListener('keyup', off, true);
    }
    // devolve a tela como estava
    App.tab = saved.tab; App.sideOpen = saved.sideOpen;
    Object.assign(App.view, saved.view);
    Tools.set(saved.tool);
    setSel(saved.sel.filter(s => Store.get(s.c, s.id)));
    saved = null;
    Store.S.prefs.tour = 1;
    Persist.meta();
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* sem armazenamento: o tutorial volta na próxima visita */ }
    UI.renderAll();
  }

  // Quem já viu o tutorial com o nome antigo da mesa não precisa ver de novo: a chave antiga continua valendo na leitura.
  const seen = () => { if (Store.S.prefs.tour) return true; try { return localStorage.getItem(SEEN_KEY) === '1' || localStorage.getItem(SEEN_KEY_OLD) === '1'; } catch (e) { return false; } };

  return { start, finish, seen, active: () => !!root, step: () => at };
})();
