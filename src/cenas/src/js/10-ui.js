/* ---------------------------------------------------------------
   10. UI — barra do topo, trilho de ferramentas, painel, menus e janelas
   A interface é redesenhada por inteiro a cada alteração confirmada
   (Store 'commit'); os campos têm id fixo para o foco voltar ao lugar.
   --------------------------------------------------------------- */
const UI = (() => {
  const el = {
    top: $('#top'), banner: $('#banner'), rail: $('#rail'), opts: $('#opts'), hud: $('#hud'), hint: $('#hint'), hintBox: $('#hintBox'),
    status: $('#status'), side: $('#side'), layer: $('#layer'), toasts: $('#toasts'), stage: $('#stage'),
    fileImg: $('#fileImg'), fileJson: $('#fileJson'), drop: $('#drop'), toastsTop: $('#toastsTop'), turnb: $('#turnb'), cine: $('#cine'), veil: $('#veilchip'), zonas: $('#zonas'), combos: $('#combos'),
  };
  const secOpen = {};
  const barOpen = {};               // opções abertas de uma barra: "idDoToken:índice"
  const barXOpen = {};              // campo de sobrevida aberto numa barra que ainda não tem sobrevida
  let modalEl = null, modalCfg = null, menuEl = null, menuAnchor = null, skipOpen = false;
  let pressing = false, pending = false, timer = 0;
  let downloads = null, imgTarget = null, zoomLabel = null, statusText = '', saveState = 'ok';
  let thumbRaf = 0, turnKey = null, turnTimer = 0;
  let modalLive = null;             // janela que acompanha a cena: é redesenhada a cada alteração (inclusive desfazer)

  /* ================= Peças de formulário ================= */
  const field = (label, control, cls) => h('div', { class: 'field' + (cls ? ' ' + cls : '') }, h('label', { class: 'lb', for: control && control.id ? control.id : null, text: label }), control);
  const inText = (id, value, onChange, attrs) => h('input', Object.assign({ id, type: 'text', class: 'in', value: value == null ? '' : value, autocomplete: 'off', onchange: e => onChange(e.target.value) }, attrs || {}));
  function inNum(id, value, onChange, a) {
    const o = a || {};
    return h('input', {
      id, type: 'number', class: 'in num', value, min: o.min, max: o.max, step: o.step || 1, disabled: o.disabled, 'aria-label': o.label, title: o.title,
      onchange: e => {
        let v = parseFloat(String(e.target.value).replace(',', '.'));
        if (!isFinite(v)) { e.target.value = value; return; }
        if (o.min != null) v = Math.max(o.min, v);
        if (o.max != null) v = Math.min(o.max, v);
        onChange(v);
      },
    });
  }
  // Campos "ao vivo" (cor e controle deslizante): a cena muda enquanto se arrasta e vira um passo só de desfazer.
  let liveTimer = 0;
  const liveGuard = done => {
    clearTimeout(liveTimer);
    if (done) Store.commit();
    else liveTimer = setTimeout(() => { if (Store.inTx() && !Tools.busy()) Store.commit(); }, 1800);   // se o "soltar" não vier, fecha sozinho
  };
  function inColor(id, value, apply, label) {
    const run = (e, done) => { if (!Store.inTx()) Store.begin(label || 'Cor'); apply(e.target.value); liveGuard(done); };
    return h('input', { id, type: 'color', class: 'in color', value: /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#888888', 'aria-label': label, title: label, oninput: e => run(e, false), onchange: e => run(e, true) });
  }
  function inRange(id, value, min, max, step, apply, label) {
    const run = (e, done) => { if (!Store.inTx()) Store.begin(label || 'Ajuste'); apply(parseFloat(e.target.value)); liveGuard(done); };
    return h('input', { id, type: 'range', class: 'rg', value, min, max, step, 'aria-label': label, title: label, oninput: e => run(e, false), onchange: e => run(e, true) });
  }
  // Depois da escolha, a lista solta o foco para os atalhos do teclado voltarem a valer.
  const inSelect = (id, value, options, onChange, attrs) => h('select', Object.assign({ id, class: 'in', value, onchange: e => { const v = e.target.value; e.target.blur(); onChange(v); } }, attrs || {}), options.map(([v, l]) => h('option', { value: v, text: l })));
  const toggle = (id, checked, onChange, label, o) => h('label', { class: 'sw' + (o && o.disabled ? ' off' : '') },
    h('input', { id, type: 'checkbox', checked, disabled: o && o.disabled, onchange: e => onChange(e.target.checked) }),
    h('span', { class: 'sw-track' }), h('span', { class: 'sw-label', text: label }));
  // Opções: [valor, rótulo, ícone?, dica?]
  const seg = (id, value, options, onChange) => h('div', { class: 'seg', role: 'group', id },
    options.map(([v, l, ic, tip]) => h('button', { type: 'button', class: 'seg-b' + (v === value ? ' on' : ''), 'aria-pressed': String(v === value), title: tip || l, onclick: () => { if (v !== value) onChange(v); } }, ic ? icon(ic, 16) : l)));
  // Número inteiro opcional (contador, duração): vazio ou zero quer dizer "sem".
  const inCount = (id, value, onChange, o) => h('input', {
    id, type: 'number', class: 'in num cnt', min: 0, max: (o && o.max) || 99, step: 1, value: value > 0 ? value : '', placeholder: '–',
    'aria-label': o && o.label, title: o && o.title,
    onchange: e => { const v = clamp(Math.round(parseFloat(e.target.value) || 0), 0, (o && o.max) || 99); e.target.value = v > 0 ? v : ''; onChange(v); },
  });
  // Contador pequeno, de − a +, para um número de poucos valores (turnos por rodada).
  function stepper(id, value, min, max, onChange, what) {
    return h('span', { class: 'stp', id, role: 'group', 'aria-label': what },
      h('button', { type: 'button', class: 'stp-b', id: id + '-minus', disabled: value <= min, title: 'Um a menos', 'aria-label': what + ': um a menos', onclick: () => onChange(value - 1) }, icon('minus', 13)),
      h('span', { class: 'stp-v', id: id + '-n', text: String(value) }),
      h('button', { type: 'button', class: 'stp-b', id: id + '-plus', disabled: value >= max, title: 'Um a mais', 'aria-label': what + ': um a mais', onclick: () => onChange(value + 1) }, icon('plus', 13)));
  }
  function btn(label, onClick, o) {
    const p = o || {};
    return h('button', { type: 'button', id: p.id, class: 'btn' + (p.kind ? ' ' + p.kind : ''), title: p.title, disabled: p.disabled, onclick: onClick }, p.icon ? icon(p.icon, 16) : null, label ? h('span', { text: label }) : null);
  }
  const iconBtn = (ic, title, onClick, o) => h('button', Object.assign({ type: 'button', class: 'ib' + (o && o.on ? ' on' : '') + (o && o.cls ? ' ' + o.cls : ''), title, 'aria-label': title, disabled: o && o.disabled, onclick: onClick }, o && o.id ? { id: o.id } : {}), icon(ic, o && o.size ? o.size : 18));
  function sec(id, title, open, ...kids) {
    return h('details', { class: 'sec', id, open: secOpen[id] == null ? open : secOpen[id], ontoggle: e => { secOpen[id] = e.target.open; } },
      h('summary', null, h('span', { text: title }), icon('down', 14)), h('div', { class: 'sec-body' }, kids));
  }
  const note = text => h('p', { class: 'note', text });

  /* ================= Toasts, menus e janelas ================= */
  function toast(text, o) {
    const t = h('div', { class: 'toast', data: o && o.key ? { k: o.key } : null }, h('span', { text }),
      o && o.action ? h('button', { type: 'button', class: 'toast-a', text: o.action, onclick: () => { t.remove(); o.run(); } }) : null);
    const host = modalEl ? el.toastsTop : el.toasts;       // com uma janela aberta, o aviso sobe para a frente dela
    if (o && o.key) for (const x of [...el.toasts.children, ...el.toastsTop.children]) if (x.dataset.k === o.key) x.remove();   // o aviso novo do mesmo assunto troca o velho
    host.append(t);
    while (host.children.length > 3) host.firstChild.remove();
    setTimeout(() => t.remove(), o && o.long ? 12000 : o && o.action ? 6500 : 3400);
  }

  function closeMenus() { if (menuEl) { menuEl.remove(); menuEl = null; menuAnchor = null; } }
  function menu(x, y, items, o) {
    closeMenus();
    menuEl = h('div', { class: 'menu', role: 'menu' }, items.filter(Boolean).map(it => {
      if (it === '-') return h('div', { class: 'menu-sep' });
      if (it.head) return h('div', { class: 'menu-h', text: it.head });
      // (a pasta da lista de cenas: um clique abre ou fecha — quem chama desenha a lista de novo)
      if (it.pasta) return h('button', { type: 'button', class: 'menu-i menu-pasta', role: 'menuitem', id: 'mp-' + it.pasta, 'aria-expanded': String(!!it.aberta), title: it.aberta ? 'Fechar a pasta' : 'Abrir a pasta', onclick: () => it.run() },
        h('span', { class: 'menu-ck' }, icon(it.aberta ? 'down' : 'right', 14)), icon('folder', 15), h('span', { class: 'menu-l', text: it.label }), h('span', { class: 'menu-k', text: String(it.n) }));
      // (lote 7) a cena de uma família: as filhas vêm um pouco para dentro; a mãe tem, à direita, o botão que abre e
      // fecha a família (com quantas cenas há dentro dela) — o clique no nome continua abrindo a cena
      if (it.fam) return h('div', { class: 'menu-fam' },
        h('button', { type: 'button', class: 'menu-i' + (it.dentro ? ' dentro' : '') + (it.nivel ? ' filha' : ''), role: 'menuitem', id: 'mc-' + it.fam, style: it.nivel ? { '--nv': it.nivel } : null, onclick: () => { closeMenus(); it.run(); } },
          h('span', { class: 'menu-ck' }, it.check ? icon('check', 15) : null), h('span', { class: 'menu-l', text: it.label }),
          it.mark ? h('span', { class: 'menu-m', title: it.markTitle || '' }, icon(it.mark, 13)) : null, it.key ? h('span', { class: 'menu-k', text: it.key }) : null),
        it.filhas ? h('button', { type: 'button', class: 'menu-tg' + (it.aqui ? ' aqui' : ''), id: 'mf-' + it.fam, 'aria-expanded': String(!!it.aberta),
          title: (it.aberta ? 'Esconder' : 'Mostrar') + ` as cenas que estão dentro de "${it.label}"` + (it.aqui ? ' (a cena aberta está aqui dentro)' : ''), onclick: () => it.tg() },
        h('span', { class: 'menu-k', text: String(it.filhas) }), icon(it.aberta ? 'down' : 'right', 13)) : null);
      return h('button', { type: 'button', class: 'menu-i' + (it.danger ? ' danger' : '') + (it.dentro ? ' dentro' : ''), role: 'menuitem', disabled: it.disabled, onclick: () => { closeMenus(); it.run(); } },
        it.check != null ? h('span', { class: 'menu-ck' }, it.check ? icon('check', 15) : null) : it.icon ? icon(it.icon, 16) : h('span', { class: 'menu-ck' }),
        h('span', { class: 'menu-l', text: it.label }), it.mark ? h('span', { class: 'menu-m', title: it.markTitle || '' }, icon(it.mark, 13)) : null, it.key ? h('span', { class: 'menu-k', text: it.key }) : null);
    }));
    if (modalEl) menuEl.classList.add('sobre');             // (um menu aberto de dentro de uma janela fica por cima dela)
    el.layer.append(menuEl);
    const r = menuEl.getBoundingClientRect();
    const left = clamp(o && o.right ? x - r.width : x, 8, Math.max(8, window.innerWidth - r.width - 8));
    const top = clamp(y, 8, Math.max(8, window.innerHeight - r.height - 8));
    menuEl.style.left = left + 'px'; menuEl.style.top = top + 'px';
    menuAnchor = o && o.anchor ? o.anchor : null;
  }
  function anchorMenu(b, items, right) {
    if (skipOpen) { skipOpen = false; return; }
    const r = b.getBoundingClientRect();
    menu(right ? r.right : r.left, r.bottom + 6, items, { right, anchor: b });
  }
  /* (lote 23) O botão direito nas Cenas nunca abre o menu do navegador: no Windows, o navegador pede o menu dele depois
     de soltar o botão — e aí o menu das Cenas já está aberto embaixo do cursor (ou um aviso, a faixa de turno…), e o
     pedido não chega ao mapa. Só os campos de texto ficam com o menu do navegador (copiar, colar). */
  document.addEventListener('contextmenu', e => {
    const t = e.target, campo = t && t.closest && t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
    if (campo) return;
    if (t && t.closest && t.closest('#stage, #layer, #toastsTop')) e.preventDefault();
  });
  document.addEventListener('pointerdown', e => {
    pressing = true;
    skipOpen = false;
    if (menuEl && !menuEl.contains(e.target)) {
      if (menuAnchor && menuAnchor.contains(e.target)) skipOpen = true;
      closeMenus();
    }
  }, true);
  const release = () => { pressing = false; if (pending) { pending = false; setTimeout(refresh, 0); } };
  document.addEventListener('pointerup', release, true);
  document.addEventListener('pointercancel', release, true);
  // Listas nativas (select) abrem por cima da página e nem sempre devolvem o "soltar" do mouse:
  // qualquer movimento sem botão apertado, ou a própria escolha na lista, encerra o aperto.
  document.addEventListener('pointermove', e => { if (pressing && e.buttons === 0) release(); }, true);
  document.addEventListener('change', e => { if (pressing && e.target && e.target.tagName === 'SELECT') release(); }, true);
  window.addEventListener('blur', () => { if (pressing) release(); });

  function closeModal() {
    if (!modalEl) return;
    modalEl.remove(); modalEl = null; modalCfg = null; modalLive = null;
    while (el.toastsTop.firstChild) el.toasts.append(el.toastsTop.firstChild);     // os avisos descem para o lugar de sempre
  }
  function modal(o) {
    closeModal(); closeMenus();
    const card = h('div', { class: 'modal' + (o.wide ? ' wide' : '') + (o.xl ? ' xl' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title },
      h('h2', { class: 'modal-t', text: o.title }),
      o.text ? h('p', { class: 'modal-p', text: o.text }) : null,
      o.body || null,
      h('div', { class: 'modal-a' }, (o.actions || []).filter(Boolean).map(a => btn(a.label, () => { if (a.run && a.run() === false) return; if (!a.keep) closeModal(); }, { kind: a.kind || 'ghost' }))));
    modalCfg = o;
    modalEl = h('div', { class: 'scrim', onpointerdown: e => { if (e.target === modalEl) { closeModal(); if (o.onCancel) o.onCancel(); } } }, card);
    el.layer.append(modalEl);
    const f = card.querySelector('[data-focus]') || (o.focusPrimary ? null : card.querySelector('input:not([type=hidden]), textarea, select')) || card.querySelector('.btn.primary') || card.querySelector('button');
    if (f && !cascaOcupada()) { f.focus(); if (f.select && f.type !== 'range' && f.type !== 'checkbox' && f.type !== 'color') f.select(); }
    return card;
  }
  document.addEventListener('keydown', e => {
    if (menuEl && e.key === 'Escape') { closeMenus(); e.stopPropagation(); return; }
    if (!modalEl) return;
    if (e.key === 'Escape') { if (e.target.dataset && e.target.dataset.esc) return; const c = modalCfg; closeModal(); if (c && c.onCancel) c.onCancel(); e.stopPropagation(); }
    // (o campo com data-enter="proprio" cuida do Enter dele: a semente do gerador, o nome de um modelo)
    else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON' && !(e.target.dataset && e.target.dataset.enter)) {
      const p = modalEl.querySelector('.btn.primary');
      if (!p) return;
      e.preventDefault();
      if (e.target.tagName === 'INPUT' && modalEl.contains(e.target)) e.target.blur();   // o que foi digitado vale antes de a janela fechar
      p.click();
    }
  }, true);

  function confirmBox(title, text, okLabel, danger) {
    return new Promise(res => modal({
      title, text, onCancel: () => res(false),
      actions: [{ label: 'Cancelar', run: () => res(false) }, { label: okLabel || 'Confirmar', kind: danger ? 'danger' : 'primary', run: () => res(true) }],
    }));
  }
  function promptBox(title, label, value, o) {
    const p = o || {};
    return new Promise(res => {
      const input = p.multiline
        ? h('textarea', { id: 'dlg-in', class: 'in area', rows: 4, 'data-focus': '', value: value || '' })
        : h('input', { id: 'dlg-in', class: 'in', type: p.type || 'text', 'data-focus': '', value: value == null ? '' : value, min: p.min, max: p.max, autocomplete: 'off' });
      modal({
        title, text: p.text, body: field(label, input, 'stack'), onCancel: () => res(null),
        actions: [{ label: 'Cancelar', run: () => res(null) }, { label: p.ok || 'Confirmar', kind: 'primary', run: () => res(input.value) }],
      });
    });
  }

  /* ================= Imagens ================= */
  function tokenAvatar(t, size) {
    const a = t.img ? Store.S.assets[t.img] : null;
    const owner = t.owner && t.owner !== '*' ? playerById(t.owner) : null;
    const st = { width: size + 'px', height: size + 'px', backgroundColor: t.color, color: inkOn(t.color), fontSize: Math.round(size * 0.38) + 'px', borderColor: owner ? owner.color : 'var(--line-strong)' };
    if (a) st.backgroundImage = `url("${a.url}")`;
    return h('span', { class: 'av' + (t.shape === 'quad' ? ' sq' : ''), style: st, 'aria-hidden': 'true' }, a ? null : initials(tokName(t)));
  }

  function pickImage(cb) { imgTarget = cb; el.fileImg.value = ''; el.fileImg.click(); }
  el.fileImg.addEventListener('change', () => {
    const files = Array.from(el.fileImg.files || []);
    const cb = imgTarget; imgTarget = null;
    if (files.length && cb) cb(files);
  });

  async function setTokenImage(t, file) {
    try {
      const a = await Assets.fromFile(file, 'token');
      Store.tx('Imagem do token', () => Store.upd('tokens', t.id, { img: a.id, imgChar: false }));
    } catch (err) { toast(err.message || 'Não consegui abrir essa imagem.'); }
  }
  async function tokensFromFiles(files, at) {
    const sc = Store.scene();
    const [w, hh] = Render.size();
    const base = at || { x: App.view.x + w / (2 * App.view.z), y: App.view.y + hh / (2 * App.view.z) };
    const made = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const a = await Assets.fromFile(files[i], 'token');
        const [x, y] = snapTok(sc, base.x - sc.cell / 2 + (i % 8) * sc.cell, base.y - sc.cell / 2 + Math.floor(i / 8) * sc.cell, 1, false);
        made.push(newToken(sc, x, y, { name: a.name || 'Token ' + (sc.tokens.length + made.length + 1), img: a.id }));
      } catch (err) { toast(err.message || 'Não consegui abrir uma das imagens.'); }
    }
    if (!made.length) return;
    Store.tx(made.length > 1 ? 'Criar tokens' : 'Criar token', () => made.forEach(t => Store.add('tokens', t)));
    setSel(made.map(t => ({ c: 'tokens', id: t.id })));
    Tools.set('select');
    if (made.length === 1) openTab('sel');
  }
  async function bgFromFile(file) {
    let a;
    try { a = await Assets.fromFile(file, 'bg'); } catch (err) { toast(err.message || 'Não consegui abrir essa imagem.'); return; }
    const sc = Store.scene();
    const input = h('input', { id: 'dlg-cols', class: 'in num', type: 'number', min: 2, max: 300, value: sc.cols, 'data-focus': '' });
    const setBg = fitCols => Store.tx('Imagem de fundo', () => {
      const p = { bg: { asset: a.id, stretch: false, dx: 0, dy: 0, scale: 1 } };
      if (fitCols) { p.cols = fitCols; p.rows = Math.max(2, Math.round(fitCols * a.h / a.w)); }
      Store.scn(p);
    });
    modal({
      title: 'Ajustar a cena ao mapa',
      text: `A imagem tem ${a.w} × ${a.h} px. Se você souber quantos quadrados ela tem de largura, a cena assume o tamanho certo e a grade cai em cima do desenho.`,
      body: field('Quadrados na largura da imagem', input, 'stack'),
      actions: [
        { label: 'Manter o tamanho da cena', run: () => { setBg(0); } },
        { label: 'Ajustar a cena', kind: 'primary', run: () => { const n = clamp(Math.round(parseFloat(input.value) || sc.cols), 2, 300); setBg(n); setTimeout(Render.fit, 30); } },
      ],
    });
  }
  function importImages(files, at) {
    const list = Array.from(files || []).filter(f => /^image\//.test(f.type || ''));
    if (!list.length) { toast('Só consigo usar arquivos de imagem aqui.'); return; }
    if (!isGM()) { toast('Só o mestre pode trazer imagens para a cena.'); return; }
    if (list.length > 1) { tokensFromFiles(list, at); return; }
    const f = list[0];
    const hit = at ? Tools.hitTest(at, { tokensOnly: true, noProps: true }) : null;
    const tok = hit ? Store.get('tokens', hit.id) : null;
    modal({
      title: 'O que fazer com esta imagem?', text: f.name || 'Imagem colada',
      actions: [
        { label: 'Cancelar' },
        { label: 'Fundo da cena', run: () => { setTimeout(() => bgFromFile(f), 0); } },
        { label: 'Novo token', kind: tok ? 'ghost' : 'primary', run: () => { tokensFromFiles([f], at); } },
        tok ? { label: `Imagem de ${tok.name}`, kind: 'primary', run: () => { setTokenImage(tok, f); } } : null,
      ],
    });
  }
  el.stage.addEventListener('dragover', e => {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
    el.drop.hidden = false;
  });
  el.stage.addEventListener('dragleave', e => { if (!el.stage.contains(e.relatedTarget)) el.drop.hidden = true; });
  el.stage.addEventListener('drop', e => {
    e.preventDefault(); el.drop.hidden = true;
    const r = Render.cv.getBoundingClientRect(), v = App.view;
    importImages(e.dataTransfer.files, { x: v.x + (e.clientX - r.left) / v.z, y: v.y + (e.clientY - r.top) / v.z });
  });
  document.addEventListener('paste', e => {
    if (modalEl || Tour.active() || focusKind(e.target) === 'text') return;
    const files = Array.from((e.clipboardData && e.clipboardData.files) || []).filter(f => /^image\//.test(f.type));
    if (files.length) { e.preventDefault(); importImages(files, App.mouse.inside ? { x: App.mouse.x, y: App.mouse.y } : null); return; }
    if (App.clip.length) {
      const [w, hh] = Render.size();
      const at = App.mouse.inside ? App.mouse : { x: App.view.x + w / (2 * App.view.z), y: App.view.y + hh / (2 * App.view.z) };
      const n = Act.pasteAt(at.x, at.y);
      if (n) toast(n === 1 ? 'Colado.' : `${n} itens colados.`);
    }
  });

  /* ================= Exportar e importar ================= */
  /* A mesa roda em dois lugares. Na página do site ela é uma página comum e salva arquivos pelo caminho normal do
     navegador (Blob + <a download>). Dentro do visualizador de artefatos, quem salva é o recurso dele
     (window.claude): hosted diz se esse visualizador está presente. Nada mais depende dele. */
  const framed = (() => { try { return window.top !== window.self; } catch (e) { return true; } })();
  let capsReady = Promise.resolve(null), hosted = false;
  function initCaps() {
    try {
      if (window.claude && typeof window.claude.use === 'function') {
        hosted = true;
        capsReady = window.claude.use('downloads').then(d => { downloads = d || null; return downloads; }, () => null);
      }
    } catch (e) { downloads = null; }
  }
  const slug = s => String(s || 'cena').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'cena';

  function copyBox(name, text, why) {
    const big = text.length > 600000;
    const ta = h('textarea', { id: 'dlg-json', class: 'in area mono', rows: 7, readOnly: true, value: big ? '' : text, placeholder: big ? 'O conteúdo é grande demais para mostrar aqui, mas o botão Copiar leva tudo.' : '' });
    modal({
      title: 'Copiar em vez de salvar', wide: true,
      text: `${why} Copie o conteúdo e cole num arquivo de texto chamado ${name}.`,
      body: ta,
      actions: [
        { label: 'Fechar' },
        {
          label: 'Copiar', kind: 'primary', keep: true, run: () => {
            const fail = () => { if (!big) { ta.focus(); ta.select(); toast('Não consegui copiar sozinho. O texto está selecionado: use Ctrl+C.'); } else toast('Este navegador não deixou copiar.'); };
            try { navigator.clipboard.writeText(text).then(() => toast('Copiado.'), fail); } catch (e) { fail(); }
          },
        },
      ],
    });
  }
  // O caminho normal de qualquer página: entrega o conteúdo ao navegador como um arquivo para baixar.
  function browserDownload(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = h('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  async function saveFile(name, text) {
    if (hosted) {
      // O recurso de salvar pode ainda estar chegando logo depois de a página abrir: espera um instante por ele.
      if (!downloads) await Promise.race([capsReady, new Promise(r => setTimeout(r, 1500))]);
      if (downloads) {
        try { await downloads.save({ filename: name, data: new Blob([text], { type: 'application/json' }) }); toast('Arquivo salvo.'); }
        catch (err) {
          const code = err && err.code;
          if (code === 'declined') return;
          if (code === 'rate_limited') { toast('Já há um pedido de salvamento aberto. Responda a ele e tente de novo.'); return; }
          copyBox(name, text, 'Não consegui salvar o arquivo por aqui.');
        }
        return;
      }
      // Visualizador presente, mas sem o recurso de salvar: lá dentro o download comum é barrado em silêncio.
      if (framed) { copyBox(name, text, 'Este visualizador não deixa a página salvar arquivos.'); return; }
    }
    try { browserDownload(name, text); } catch (e) { copyBox(name, text, 'Não consegui salvar o arquivo por aqui.'); return; }
    // Dentro de uma moldura de outra página não dá para saber se o navegador aceitou o pedido: fica uma saída à mão.
    if (framed) toast('Download pedido ao navegador.', { action: 'Não baixou? Copiar', run: () => copyBox(name, text, 'Se o arquivo não chegou à pasta de downloads, a página de fora não deixou esta salvar arquivos.') });
    else toast('Arquivo enviado para a pasta de downloads.');
  }
  function sceneAssets(scenes) {
    const out = {};
    for (const sc of scenes) {
      if (sc.bg && sc.bg.asset && Store.S.assets[sc.bg.asset]) out[sc.bg.asset] = Store.S.assets[sc.bg.asset];
      for (const t of sc.tokens) if (t.img && Store.S.assets[t.img]) out[t.img] = Store.S.assets[t.img];
    }
    return out;
  }
  /* Arquivos exportados. Os de agora se identificam como Tiny Cats (versão 3 dos dados). A importação continua
     aceitando tudo o que as versões anteriores gravaram: os formatos "urgm-cena" e "urgm-mesa", versões 1 e 2
     (normalizeScene completa o que faltar). */
  const FILE_SCENE = 'tinycats-cena', FILE_TABLE = 'tinycats-mesa', FILE_VERSION = 3;
  const FILE_SCENE_IDS = [FILE_SCENE, 'urgm-cena'], FILE_TABLE_IDS = [FILE_TABLE, 'urgm-mesa'];
  // Numa mesa, as imagens estão no banco: para o arquivo abrir em qualquer lugar, elas voltam embutidas nele.
  async function assetsForFile(scenes) {
    const a = sceneAssets(scenes);
    if (!Nuvem.on()) return a;
    toast('Preparando o arquivo com as imagens…');
    return Nuvem.embutir(a);
  }
  async function exportScene() {
    const sc = Store.scene();
    const copy = clone(sc); copy.explored = {};
    saveFile(`tinycats-cena-${slug(sc.name)}.json`, JSON.stringify({ format: FILE_SCENE, version: FILE_VERSION, scene: copy, players: Store.S.players, assets: await assetsForFile([sc]) }));
  }
  async function exportAll() {
    Vision.flushExplored();
    const scenes = Store.S.order.map(id => Store.S.scenes[id]);
    saveFile('tinycats-cenas.json', JSON.stringify({ format: FILE_TABLE, version: FILE_VERSION, scenes: scenes.map(x => (Nuvem.on() ? Object.assign({}, x, { explored: {} }) : x)), players: Store.S.players, barDefaults: Store.S.prefs.barDefaults || null, assets: await assetsForFile(scenes) }));
  }
  async function importText(text) {
    let d;
    try { d = JSON.parse(text); } catch (e) { toast('Esse arquivo não é um JSON válido.'); return; }
    const scenes = d && FILE_SCENE_IDS.includes(d.format) && d.scene ? [d.scene] : d && FILE_TABLE_IDS.includes(d.format) && Array.isArray(d.scenes) ? d.scenes : null;
    if (!scenes || !scenes.length) { toast('Esse arquivo não parece ter sido exportado por esta mesa.'); return; }
    const nuvem = Nuvem.on();
    if (nuvem && Object.keys(d.assets || {}).length) toast('Enviando as imagens do arquivo para a mesa…');
    // (numa mesa, cada imagem do arquivo sobe para o banco; se uma falhar, a cena entra sem ela)
    let semImagem = 0;
    for (const id in d.assets || {}) { try { await Assets.fromData(d.assets[id]); } catch (e) { semImagem++; } }
    // Fora de uma mesa, os jogadores do arquivo entram na lista daqui. Numa mesa, os jogadores são os participantes:
    // quem tem o mesmo nome continua dono do que era dele; o resto passa a ser do mestre.
    const donos = nuvem ? Proj.mapaDeDonos(d.players, Store.S.players) : null;
    if (!nuvem) for (const p of d.players || []) if (p && p.id && !playerById(p.id)) Store.S.players.push({ id: p.id, name: p.name || 'Jogador', color: p.color || PLAYER_COLORS[Store.S.players.length % PLAYER_COLORS.length] });
    // As barras padrão do arquivo só entram se esta mesa ainda não tiver as dela.
    if (Array.isArray(d.barDefaults) && d.barDefaults.length && !Store.S.prefs.barDefaults) Store.S.prefs.barDefaults = d.barDefaults.slice(0, MAX_BARS).map(cleanBar);
    let first = null;
    for (const raw of scenes) {
      if (!raw || !Array.isArray(raw.tokens)) continue;
      const sc = normalizeScene(clone(raw));
      if (!sc.id || Store.S.scenes[sc.id] || (nuvem && !Proj.idCena(sc.id))) sc.id = uid('cena');
      if (nuvem) {
        Proj.trocarDonos(sc, donos, Store.S.players);
        if (sc.bg.asset && !Store.S.assets[sc.bg.asset]) sc.bg.asset = null;
        for (const t of sc.tokens) if (t.img && !Store.S.assets[t.img]) t.img = null;
      }
      Store.addScene(sc);
      Persist.scene(sc.id);
      first = first || sc.id;
    }
    if (!first) { toast('Não encontrei nenhuma cena dentro do arquivo.'); return; }
    Persist.meta();
    switchScene(first);
    toast((scenes.length === 1 ? 'Cena importada.' : `${scenes.length} cenas importadas.`) + (semImagem ? ` ${semImagem === 1 ? 'Uma imagem não pôde' : semImagem + ' imagens não puderam'} ser enviada${semImagem === 1 ? '' : 's'} para a mesa.` : ''));
  }
  el.fileJson.addEventListener('change', () => {
    const f = el.fileJson.files && el.fileJson.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { importText(String(rd.result || '')).catch(err => { console.error(err); toast('Não consegui importar esse arquivo.'); }); };
    rd.onerror = () => toast('Não consegui ler o arquivo.');
    rd.readAsText(f);
  });
  const importFile = () => { el.fileJson.value = ''; el.fileJson.click(); };

  /* ================= Cenas e jogadores ================= */
  function switchScene(id) {
    if (!Store.S.scenes[id]) return;
    Tools.cancel();
    App.sel = [];
    Store.setCurrent(id);
    Persist.meta();
    Vision.invalidate();
    setTimeout(Render.fit, 0);
  }
  function newSceneFlow() {
    promptBox('Nova cena', 'Nome da cena', 'Cena ' + (Store.S.order.length + 1), { ok: 'Criar' }).then(name => {
      if (name == null) return;
      const sc = newScene(name.trim() || 'Nova cena');
      Store.addScene(sc); Persist.scene(sc.id);
      switchScene(sc.id);
      openTab('scene');
    });
  }
  // Uma cena de exemplo novinha, sem tocar nas cenas que já existem: boa para experimentar os recursos.
  async function sampleScene() {
    Tools.cancel();
    const prev = Store.S.current;
    const sc = await buildSample();        // já deixa a cena nova como a atual e o token principal selecionado
    const keep = App.sel;
    Store.S.current = prev;
    switchScene(sc.id);
    App.sel = keep;
    Tools.set('select'); openTab('sel');
    toast('Cena de exemplo criada. As suas cenas continuam como estavam.');
  }
  function duplicateScene() {
    const src = Store.scene(), sc = clone(src);
    sc.id = uid('cena'); sc.name = src.name + ' (cópia)'; sc.explored = {}; delete sc.sample;
    // (a cópia fica no mesmo lugar: dentro da mesma cena-mãe ou, sem mãe, na mesma pasta; as filhas não são copiadas)
    const m = maeDaCena(src.id), pa = pastaDaCena(src.id);
    if (m || pa) { const p = clone(pastasP()); if (m) p.mae[sc.id] = m; else p.de[sc.id] = pa; Store.S.pastas = Proj.normPastas(p); }
    Store.addScene(sc); Persist.scene(sc.id);
    if (m || pa) Persist.meta();
    switchScene(sc.id);
    toast('Cena duplicada.');
  }
  function renameScene() {
    const sc = Store.scene();
    promptBox('Renomear cena', 'Nome da cena', sc.name).then(name => { if (name && name.trim()) Store.tx('Renomear cena', () => Store.scn({ name: name.trim() })); });
  }
  function deleteScene() {
    const sc = Store.scene(), filhas = filhasDe(sc.id), m = maeDaCena(sc.id);
    // (lote 7) as cenas que estão dentro dela não são apagadas: passam para a mãe dela (ou ficam soltas, na pasta dela)
    const sobre = !filhas.length ? '' : ' ' + (filhas.length === 1 ? 'A cena que está dentro dela não é apagada' : `As ${filhas.length} cenas que estão dentro dela não são apagadas`) +
      (m ? `: ${filhas.length === 1 ? 'passa' : 'passam'} para dentro de "${Store.S.scenes[m].name}".` : `: ${filhas.length === 1 ? 'fica' : 'ficam'} no lugar dela.`);
    confirmBox('Apagar esta cena?', `"${sc.name}" e tudo o que está nela serão apagados. Isso não pode ser desfeito.` + sobre + (Nuvem.noAr() === sc.id ? ' Os jogadores estão vendo esta cena: ela sai do ar.' : ''), 'Apagar cena', true).then(ok => {
      if (!ok) return;
      const id = sc.id, p = clone(pastasP()), pa = p.de[id];
      Store.removeScene(id); Persist.removeScene(id);
      if (pa || filhas.length || p.mae[id]) {
        for (const f of filhas) { if (m) p.mae[f] = m; else { delete p.mae[f]; if (pa) p.de[f] = pa; } }
        delete p.mae[id]; delete p.de[id];
        Store.S.pastas = Proj.normPastas(p); Persist.meta();
      }
      irParaUmaDaVista();
    });
  }
  /* Abre outra cena da lista que o mestre está vendo (numa mesa com campanhas: as da campanha em vista e as do
     mundo). Se não sobrou nenhuma, nasce uma cena vazia — a tela sempre tem uma cena aberta. */
  function irParaUmaDaVista() {
    let alvo = Store.S.order.find(id => Nuvem.naVista(id));
    if (!alvo) { const n = newScene('Nova cena'); Store.addScene(n); Persist.scene(n.id); alvo = n.id; }
    switchScene(alvo);
  }
  /* ---- Campanhas: de que campanha é a cena (só numa mesa com campanhas) ---- */
  const nomeDaCampanha = id => { const c = Nuvem.campanhas().find(x => x.id === id); return c ? c.nome : 'outra campanha'; };
  function sceneCampaignBox() {
    const sc = Store.scene(), atual = Nuvem.campanhasDaCena(sc.id)[0] || '';
    let escolha = atual;
    const opcoes = [['', 'Do mundo — aparece em todas as campanhas']].concat(Nuvem.campanhas().map(c => [c.id, c.nome + (c.encerrada ? ' (encerrada)' : '')]));
    modal({
      title: 'Campanha desta cena',
      text: `"${sc.name}" fica na lista de cenas da campanha escolhida, e no ar só os jogadores dessa campanha a veem. Uma cena do mundo fica na lista de todas as campanhas, e no ar todos a veem.`,
      body: h('div', { class: 'picks', role: 'radiogroup', 'aria-label': 'Campanha da cena' }, opcoes.map(([id, nome]) => h('label', { class: 'pick' },
        h('input', { type: 'radio', name: 'sc-camp', id: 'sc-camp-' + (id || 'mundo'), checked: id === escolha, onchange: () => { escolha = id; } }), h('span', { class: 'pick-n', text: nome })))),
      actions: [{ label: 'Cancelar' }, {
        label: 'Salvar', kind: 'primary', run: () => {
          if (escolha === atual) return;
          const antes = Nuvem.campanhasDaCena(sc.id), id = sc.id;
          if (!Nuvem.definirCampanhas(id, escolha ? [escolha] : [])) return;
          const saiu = !Nuvem.naVista(id);
          toast(escolha ? `"${sc.name}" agora é da campanha ${nomeDaCampanha(escolha)}.` + (saiu ? ' Ela saiu desta lista: está na daquela campanha.' : '') : `"${sc.name}" agora é do mundo: aparece em todas as campanhas.`,
            { action: 'Desfazer', run: () => { Nuvem.definirCampanhas(id, antes); if (Store.S.scenes[id] && Nuvem.naVista(id)) switchScene(id); } });
          if (saiu) irParaUmaDaVista(); else refresh();
        },
      }],
    });
  }
  function setViewer(v) {
    if (Nuvem.jogador()) return;                 // na mesa, o jogador é ele mesmo: não há outra visão para escolher
    if (v !== 'gm' && !playerById(v)) v = 'gm';
    Tools.cancel();
    App.viewer = v;
    App.sel = [];
    if (!Tools.allowed(App.tool)) Tools.set('select');
    if (v !== 'gm' && (App.tab === 'scene' || App.tab === 'players')) App.tab = 'sel';
    hideTurn(); hideCine();
    // (lote 7) os cartões das zonas e das combinações são do mestre: na prévia "como jogador", ficam escondidos
    el.combos.hidden = v !== 'gm' || !el.combos.children.length;
    el.zonas.hidden = v !== 'gm' || !el.zonas.children.length;
    App.floats.length = 0;          // números de dano em trânsito não passam de uma visão para a outra
    Vision.invalidate();
    Store.emit('viewer');
    Render.request();
  }
  function addPlayer() {
    promptBox('Novo jogador', 'Nome do jogador', '', { ok: 'Adicionar' }).then(name => {
      if (!name || !name.trim()) return;
      const used = Store.S.players.map(p => p.color);
      const color = PLAYER_COLORS.find(c => !used.includes(c)) || PLAYER_COLORS[Store.S.players.length % PLAYER_COLORS.length];
      Store.S.players.push({ id: uid('jg'), name: name.trim(), color });
      Persist.meta(); Store.meta();
    });
  }

  /* ================= Barra do topo ================= */
  function renderTop() {
    const sc = Store.scene(), gm = isGM();
    const sceneBtn = h('button', { type: 'button', class: 'scene-b', id: 'sceneBtn', title: 'Trocar de cena', onclick: () => anchorMenu(sceneBtn, sceneMenu()) },
      icon('map', 17), h('span', { class: 'scene-n', text: sc.name }), icon('down', 14));
    const more = iconBtn('more', 'Arquivo e ajuda', () => anchorMenu(more, fileMenu(), true), { id: 'moreBtn' });
    zoomLabel = h('button', { type: 'button', class: 'zoom-l', id: 'zoomBtn', title: 'Enquadrar a cena (0)', text: Math.round(App.view.z * 100) + '%', onclick: () => { Render.fit(); status(); } });
    const zoomBy = k => { const [w, hh] = Render.size(); Render.zoomAt(w / 2, hh / 2, App.view.z * k); status(); };
    // Numa mesa, o mestre vê (e escolhe) qual cena está no ar para os jogadores.
    let air = null;
    if (gm && Nuvem.mestre()) {
      const ar = Nuvem.noAr(), aqui = ar === sc.id, outra = ar && Store.S.scenes[ar] ? Store.S.scenes[ar].name : '';
      // (com campanhas, a cena que está no ar pode ser de outra campanha — uma que não aparece na lista daqui)
      const deFora = !!ar && !aqui && !Nuvem.naVista(ar);
      const txt = aqui ? 'No ar' : ar ? 'No ar: ' + outra : 'Fora do ar';
      air = h('button', { type: 'button', class: 'air-b' + (aqui ? ' on' : ar ? ' other' : ''), id: 'airBtn', title: aqui ? 'Os jogadores estão vendo esta cena' : deFora ? `Está no ar "${outra}", uma cena de outra campanha: quem a vê são os jogadores daquela campanha` : ar ? `Os jogadores estão vendo "${outra}", não esta cena` : 'Os jogadores não estão vendo nenhuma cena', onclick: () => anchorMenu(air, airMenu()) },
        icon(ar ? 'eye' : 'eyeOff', 16), h('span', { class: 'air-t', text: txt }), icon('down', 13));
    }
    el.top.replaceChildren(...[
      h('span', { class: 'brand', text: 'Tiny Cats' }),
      gm ? sceneBtn : h('span', { class: 'scene-b flat' }, icon('map', 17), h('span', { class: 'scene-n', text: Nuvem.semCena() ? 'Sem cena' : sc.name })),
      air,
      h('div', { class: 'grp' },
        iconBtn('undo', 'Desfazer (Ctrl+Z)', Tools.undo, { disabled: !Store.canUndo(), id: 'undoBtn' }),
        iconBtn('redo', 'Refazer (Ctrl+Shift+Z)', Tools.redo, { disabled: !Store.canRedo(), id: 'redoBtn' })),
      h('span', { class: 'spacer' }),
      Nuvem.jogador() ? null : h('label', { class: 'viewer' }, h('span', { class: 'viewer-l', text: 'Vendo como' }),
        inSelect('viewerSel', App.viewer, [['gm', 'Mestre']].concat(Store.S.players.map(p => [p.id, p.name])), setViewer, { title: 'Testar a cena como o mestre ou como um jogador' })),
      h('div', { class: 'grp zoom' }, iconBtn('minus', 'Afastar (-)', () => zoomBy(1 / 1.25), { size: 16 }), zoomLabel, iconBtn('plus', 'Aproximar (+)', () => zoomBy(1.25), { size: 16 })),
      more,
      iconBtn('panel', App.sideOpen ? 'Esconder o painel' : 'Mostrar o painel', () => { App.sideOpen = !App.sideOpen; refresh(); }, { on: App.sideOpen, id: 'panelBtn' }),
    ].filter(Boolean));          // (o que não se aplica a quem está olhando fica de fora)
  }
  function sceneMenu() {
    const items = [], ar = Nuvem.noAr(), comCamp = Nuvem.comCampanhas(), mundo = Nuvem.noMundo(), pastas = pastasP().lista;
    const visiveis = Store.S.order.filter(id => Store.S.scenes[id] && (!comCamp || Nuvem.naVista(id)));
    const F = familiasVistas(visiveis), atual = Store.S.current;
    const linha = (id, nivel, dentro) => {
      const s = Store.S.scenes[id], nm = mundo[id];
      const it = { label: s.name, check: id === atual, key: id === ar ? 'no ar' : null, mark: nm ? 'globe' : null, markTitle: nm ? 'No Mapa-múndi: ' + nm.join(', ') : '', run: () => switchScene(id), dentro };
      // (lote 7) a cena de uma família: a filha vem para dentro; a mãe abre e fecha as que estão dentro dela
      const nf = F.filhas(id).length;
      if (nivel || nf) {
        const aberta = !famFechadas.has(id);
        Object.assign(it, { fam: id, nivel, filhas: nf ? F.dentro(id).length : 0, aberta, aqui: !aberta && F.dentro(id).includes(atual),
          tg: () => { if (aberta) famFechadas.add(id); else famFechadas.delete(id); guardarFamFechadas(); reabrirMenuCenas('mf-' + id); } });
      }
      return it;
    };
    // a família de cada cena da lista: ela e, se estiver aberta, as que estão dentro dela (cada uma com a família dela)
    const familia = (id, nivel, dentro) => { items.push(linha(id, nivel, dentro)); if (!famFechadas.has(id)) for (const f of F.filhas(id)) familia(f, nivel + 1, dentro); };
    const soltas = F.raizes.filter(id => !pastaDaCena(id));
    if (!comCamp) { if (soltas.length || !pastas.length) { items.push({ head: 'Cenas' }); for (const id of soltas) familia(id, 0, false); } }
    else {
      // numa mesa com campanhas: as cenas da campanha em vista e, depois, as do mundo (as das outras campanhas ficam na lista delas)
      const c = Nuvem.campanha(), dela = soltas.filter(id => Nuvem.campanhasDaCena(id).includes(c)), doMundo = soltas.filter(id => !Nuvem.campanhasDaCena(id).length);
      if (dela.length || !doMundo.length) { items.push({ head: 'Cenas · ' + nomeDaCampanha(c) }); for (const id of dela) familia(id, 0, false); }
      if (doMundo.length) { items.push({ head: 'Do mundo' }); for (const id of doMundo) familia(id, 0, false); }
    }
    // as pastas (lote 6): cada uma abre e fecha; fechada, fica só o nome e quantas cenas tem (contando as famílias)
    for (const pa of pastas) {
      const dela = F.raizes.filter(id => pastaDaCena(id) === pa.id);
      if (!dela.length) continue;
      const aberta = !fechadas.has(pa.id), n = dela.reduce((s, id) => s + 1 + F.dentro(id).length, 0);
      items.push({ pasta: pa.id, label: pa.nome, n, aberta, run: () => { if (aberta) fechadas.add(pa.id); else fechadas.delete(pa.id); guardarFechadas(); reabrirMenuCenas('mp-' + pa.id); } });
      if (aberta) for (const id of dela) familia(id, 0, true);
    }
    items.push('-', { label: 'Nova cena', icon: 'plus', run: newSceneFlow }, { label: 'Nova cena de exemplo', icon: 'map', run: sampleScene }, { label: 'Gerar um lugar…', icon: 'house', run: () => Gerador.abrir() }, { label: 'Duplicar esta cena', icon: 'copy', run: duplicateScene },
      { label: 'Renomear', icon: 'edit', run: renameScene }, { label: 'Organizar as cenas…', icon: 'folder', run: () => organizarCenas() },
      Nuvem.podeOrganizar() ? { label: 'Campanha desta cena…', icon: 'map', run: sceneCampaignBox } : null, { label: 'Apagar esta cena…', icon: 'trash', danger: true, run: deleteScene });
    return items;
  }
  // abre o menu das cenas de novo (depois de abrir ou fechar uma pasta ou uma família), com o foco no mesmo botão
  function reabrirMenuCenas(focoId) {
    const b = document.getElementById('sceneBtn');
    if (!b) return;
    anchorMenu(b, sceneMenu());
    const f = document.getElementById(focoId);
    if (f) f.focus();
  }

  /* ---- As pastas da lista de cenas (lote 6) ----
     O mestre cria pastas ("Lugares do mundo", "Combates"…) e põe as cenas nelas, na janela "Organizar as cenas…"
     (arrastando, ou escolhendo onde cada cena fica). Na lista do botão de cenas, cada pasta abre e fecha (lembrado
     neste aparelho), e a cena que um marcador do Mapa-múndi abre ganha o ícone do mundo. As pastas são do mestre (na
     mesa, vão no índice das cenas); mudar de pasta não mexe na cena. Cada mudança tem Desfazer.
     (lote 7) As famílias: uma cena pode ficar dentro de outra (cidade → bairro → casa). A família inteira fica na pasta
     da mãe de todas; na lista, as filhas vêm logo abaixo da mãe, um pouco para dentro, e cada mãe abre e fecha. */
  const pastasP = () => { const p = Store.S.pastas || (Store.S.pastas = { lista: [], de: {}, mae: {} }); if (!p.mae) p.mae = {}; return p; };
  const pastaDaCena = id => { const p = pastasP(), pid = p.de[id]; return pid && p.lista.some(x => x.id === pid) ? pid : null; };
  const FECHADAS = 'tinycats:cenas:pastas-fechadas';
  const fechadas = (() => { try { return new Set(JSON.parse(localStorage.getItem(FECHADAS) || '[]')); } catch (e) { return new Set(); } })();
  const guardarFechadas = () => { try { localStorage.setItem(FECHADAS, JSON.stringify([...fechadas])); } catch (e) { /* sem armazenamento: vale só agora */ } };
  // a mãe da cena (só se a mãe ainda existe); a mãe de todas; em que nível ela está (a mãe de todas é o 0)
  const maeDaCena = id => { const m = pastasP().mae[id]; return m && m !== id && Store.S.scenes[m] ? m : null; };
  const raizDaCena = id => { let x = id; for (let n = 0; n < 16 && maeDaCena(x); n++) x = maeDaCena(x); return x; };
  const nivelDaCena = id => { let x = id, n = 0; while (n < 16 && maeDaCena(x)) { x = maeDaCena(x); n++; } return n; };
  const filhasDe = id => Store.S.order.filter(k => Store.S.scenes[k] && maeDaCena(k) === id);
  function descendentesDe(id) {
    const out = [];
    for (const fila = [id]; fila.length;) for (const f of filhasDe(fila.shift())) if (f !== id && !out.includes(f)) { out.push(f); fila.push(f); }
    return out;
  }
  // quantos níveis há abaixo da cena (0: nenhuma cena dentro dela)
  const alturaDe = (id, n = 0) => (n > 16 ? 0 : filhasDe(id).reduce((a, f) => Math.max(a, 1 + alturaDe(f, n + 1)), 0));
  /* As famílias como a lista as mostra: só com as cenas que aparecem nela (numa mesa com campanhas, a cena cuja mãe é
     de outra campanha aparece como se não tivesse mãe). raizes: as que não estão dentro de nenhuma da lista. */
  function familiasVistas(visiveis) {
    const vis = new Set(visiveis), cache = new Map();
    const maeVis = id => { const m = maeDaCena(id); return m && vis.has(m) ? m : null; };
    const filhas = id => { if (!cache.has(id)) cache.set(id, visiveis.filter(k => k !== id && maeVis(k) === id)); return cache.get(id); };
    const dentro = id => { const out = []; for (const fila = [id]; fila.length;) for (const f of filhas(fila.shift())) if (!out.includes(f)) { out.push(f); fila.push(f); } return out; };
    return { raizes: visiveis.filter(id => !maeVis(id)), maeVis, filhas, dentro };
  }
  const FAM_FECHADAS = 'tinycats:cenas:familias-fechadas';
  const famFechadas = (() => { try { return new Set(JSON.parse(localStorage.getItem(FAM_FECHADAS) || '[]')); } catch (e) { return new Set(); } })();
  const guardarFamFechadas = () => { try { localStorage.setItem(FAM_FECHADAS, JSON.stringify([...famFechadas])); } catch (e) { /* sem armazenamento: vale só agora */ } };
  // muda as pastas num passo só: fn recebe uma cópia para alterar; o aviso diz o que mudou, com Desfazer
  function mudarPastas(fn, texto) {
    const antes = clone(pastasP()), novo = clone(antes);
    if (fn(novo) === false) return false;
    const limpo = Proj.normPastas(novo);
    if (JSON.stringify(limpo) === JSON.stringify(antes)) return false;
    Store.S.pastas = limpo;
    Persist.meta(); Store.meta();
    if (texto) toast(texto, { action: 'Desfazer', run: () => { Store.S.pastas = antes; Persist.meta(); Store.meta(); } });
    return true;
  }
  const nomeDaPasta = id => { const pa = pastasP().lista.find(x => x.id === id); return pa ? pa.nome : 'Sem pasta'; };
  const nomeDaCena = id => (Store.S.scenes[id] || {}).name || 'a cena';
  /* Põe a cena num lugar: 'p:<pasta>' (ou 'p:' sem pasta) a deixa solta, sem mãe, naquela pasta; 'm:<cena>' a põe
     dentro daquela cena. As cenas que estão dentro dela vão junto. Uma cena não entra nela mesma nem numa das que
     estão dentro dela. */
  function colocarCena(id, destino) {
    const sc = Store.S.scenes[id], d = String(destino || '');
    if (!sc) return false;
    const n = descendentesDe(id).length, mae0 = maeDaCena(id);
    if (d.startsWith('m:')) {
      const m = d.slice(2);
      if (!Store.S.scenes[m] || m === id || mae0 === m || descendentesDe(id).includes(m)) return false;
      if (nivelDaCena(m) + 1 + alturaDe(id) >= Proj.MAX_NIVEIS) { toast(`Uma família vai até ${Proj.MAX_NIVEIS} níveis: "${sc.name}" não cabe dentro de "${nomeDaCena(m)}".`); return false; }
      return mudarPastas(p => { p.mae[id] = m; delete p.de[id]; },
        `"${sc.name}"` + (n ? (n === 1 ? ' (e a cena que está dentro dela)' : ` (e as ${n} cenas que estão dentro dela)`) : '') + ` agora ${n ? 'ficam' : 'fica'} dentro de "${nomeDaCena(m)}".`);
    }
    const pa = d.startsWith('p:') ? d.slice(2) : '';
    if (pa && !pastasP().lista.some(x => x.id === pa)) return false;
    if (!mae0 && (pastaDaCena(id) || '') === pa) return false;
    const vai = n ? (n === 1 ? ` e a cena que está dentro dela ${pa ? 'foram para a pasta ' + nomeDaPasta(pa) : 'ficaram sem pasta'}` : ` e as ${n} cenas que estão dentro dela ${pa ? 'foram para a pasta ' + nomeDaPasta(pa) : 'ficaram sem pasta'}`) : '';
    const texto = mae0 ? `"${sc.name}" saiu de dentro de "${nomeDaCena(mae0)}"` + (n ? `,${vai}` : pa ? ` e foi para a pasta ${nomeDaPasta(pa)}` : ' e ficou sem pasta') + '.'
      : n ? `"${sc.name}"${vai}.` : pa ? `"${sc.name}" foi para a pasta ${nomeDaPasta(pa)}.` : `"${sc.name}" saiu da pasta.`;
    return mudarPastas(p => { delete p.mae[id]; if (pa) p.de[id] = pa; else delete p.de[id]; }, texto);
  }
  const moverCena = (id, pastaId) => colocarCena(id, 'p:' + (pastaId || ''));
  // (lote 7) o gerador de lugares põe a cena nova dentro da de fora (o bairro na cidade, o interior na casa)
  function porNaFamilia(filha, mae) {
    if (!Store.S.scenes[filha] || !Store.S.scenes[mae] || filha === mae) return false;
    const p = clone(pastasP());
    p.mae[filha] = mae; delete p.de[filha];
    Store.S.pastas = Proj.normPastas(p);
    Persist.meta(); Store.meta();
    return Store.S.pastas.mae[filha] === mae;
  }
  function novaPasta(depois) {
    if (pastasP().lista.length >= 40) { toast('Já são 40 pastas: apague uma para criar outra.'); return; }
    promptBox('Nova pasta', 'Nome da pasta', '', { ok: 'Criar' }).then(nome => {
      nome = String(nome || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      if (nome) { const id = uid('pa'); mudarPastas(p => { p.lista.push({ id, nome }); if (depois) depois(p, id); }, `Pasta "${nome}" criada.`); }
      organizarCenas();                                      // (de volta à janela das cenas)
    });
  }
  function renomearPasta(pa) {
    promptBox('Renomear a pasta', 'Nome da pasta', pa.nome, { ok: 'Renomear' }).then(nome => {
      nome = String(nome || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      if (nome && nome !== pa.nome) mudarPastas(p => { const x = p.lista.find(y => y.id === pa.id); if (x) x.nome = nome; }, `A pasta agora se chama "${nome}".`);
      organizarCenas();
    });
  }
  function apagarPasta(pa) {
    const n = Object.keys(pastasP().de).filter(id => pastasP().de[id] === pa.id && Store.S.scenes[id]).length;
    mudarPastas(p => { p.lista = p.lista.filter(x => x.id !== pa.id); for (const id of Object.keys(p.de)) if (p.de[id] === pa.id) delete p.de[id]; },
      n ? `Pasta "${pa.nome}" apagada; ${n === 1 ? 'a cena dela voltou' : `as ${n} cenas dela voltaram`} para "Sem pasta".` : `Pasta "${pa.nome}" apagada.`);
  }
  /* A janela "Organizar as cenas": uma seção por pasta (e "Sem pasta"), com as cenas que estão nela — cada família com
     as filhas logo abaixo da mãe, um pouco para dentro. Arrastar uma cena para cima de outra a põe dentro dela;
     arrastar para o título de uma pasta (ou para um canto vazio dela) a deixa solta nessa pasta. A lista "Onde fica",
     ao lado de cada cena, faz o mesmo sem arrastar. */
  function organizarCenas() {
    const body = h('div', { class: 'org' });
    let arrastando = null;
    const limparAlvos = () => body.querySelectorAll('.alvo').forEach(x => x.classList.remove('alvo'));
    const paint = () => {
      const p = pastasP(), ar = Nuvem.noAr(), mundo = Nuvem.noMundo(), comCamp = Nuvem.comCampanhas();
      const visiveis = Store.S.order.filter(id => Store.S.scenes[id] && (!comCamp || Nuvem.naVista(id)));
      const F = familiasVistas(visiveis);
      const a = document.activeElement, fid = a && a.id && body.contains(a) ? a.id : null;
      // todas as cenas da lista na ordem da árvore (para a lista "Onde fica")
      const arvore = [];
      const desce = (k, n) => { arvore.push([k, n]); for (const f of F.filhas(k)) desce(f, n + 1); };
      F.raizes.forEach(k => desce(k, 0));
      const podeDentro = (de, alvo) => !!de && de !== alvo && !descendentesDe(de).includes(alvo);
      const ondeFica = id => {
        const sc = Store.S.scenes[id], m = F.maeVis(id), fora = new Set([id, ...descendentesDe(id)]);
        return h('select', { id: 'org-s-' + id, class: 'in', value: m ? 'm:' + m : 'p:' + (pastaDaCena(id) || ''), title: 'Onde esta cena fica: numa pasta, ou dentro de outra cena', 'aria-label': 'Onde fica ' + sc.name,
          onchange: e => { const v = e.target.value; e.target.blur(); colocarCena(id, v); } },
          h('optgroup', { label: 'Numa pasta' }, h('option', { value: 'p:', text: 'Sem pasta' }), ...p.lista.map(x => h('option', { value: 'p:' + x.id, text: x.nome }))),
          arvore.some(([k]) => !fora.has(k)) ? h('optgroup', { label: 'Dentro da cena' }, ...arvore.filter(([k]) => !fora.has(k)).map(([k, n]) => h('option', { value: 'm:' + k, text: '\u00a0\u00a0\u00a0'.repeat(n) + Store.S.scenes[k].name }))) : null);
      };
      const linha = (id, nivel) => {
        const sc = Store.S.scenes[id], nm = mundo[id], nd = F.dentro(id).length;
        return h('li', { class: 'org-c' + (id === Store.S.current ? ' atual' : '') + (nivel ? ' filha' : ''), style: nivel ? { '--nv': nivel } : null, draggable: 'true', id: 'org-c-' + id,
          ondragstart: e => { e.stopPropagation(); arrastando = id; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', id); } catch (err) { /* (alguns navegadores) */ } },
          ondragend: () => { arrastando = null; limparAlvos(); },
          // em cima de outra cena: entra nela (na própria cena, ou numa que está dentro dela, não dá para soltar)
          ondragover: e => { if (!arrastando) return; e.stopPropagation(); if (!podeDentro(arrastando, id)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (!e.currentTarget.classList.contains('alvo')) { limparAlvos(); e.currentTarget.classList.add('alvo'); } },
          ondragleave: e => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('alvo'); },
          ondrop: e => { if (!arrastando) return; e.preventDefault(); e.stopPropagation(); const de = arrastando; arrastando = null; limparAlvos(); if (podeDentro(de, id)) colocarCena(de, 'm:' + id); } },
          h('span', { class: 'org-g', 'aria-hidden': 'true', title: 'Arraste para cima de outra cena (fica dentro dela) ou para outra pasta' }, '⠿'),
          icon(nm ? 'globe' : 'map', 15),
          h('span', { class: 'org-n', text: sc.name, title: nm ? 'No Mapa-múndi: ' + nm.join(', ') : sc.name }),
          nd ? h('span', { class: 'org-q', text: String(nd), title: nd === 1 ? 'Uma cena dentro desta' : nd + ' cenas dentro desta' }) : null,
          id === ar ? h('span', { class: 'org-ar', text: 'no ar' }) : null,
          ondeFica(id));
      };
      const secao = (pa, raizes) => {
        const alvo = pa ? pa.id : '', itens = [];
        const fam = (k, n) => { itens.push(linha(k, n)); for (const f of F.filhas(k)) fam(f, n + 1); };
        raizes.forEach(k => fam(k, 0));
        return h('section', { class: 'org-p', id: 'org-p-' + (pa ? pa.id : 'solta'),
          ondragover: e => { if (!arrastando) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (!e.currentTarget.classList.contains('alvo')) { limparAlvos(); e.currentTarget.classList.add('alvo'); } },
          ondragleave: e => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('alvo'); },
          ondrop: e => { e.preventDefault(); limparAlvos(); const id = arrastando; arrastando = null; if (id) colocarCena(id, 'p:' + alvo); } },
          h('div', { class: 'org-h' }, icon('folder', 15), h('strong', { text: pa ? pa.nome : 'Sem pasta' }), h('span', { class: 'org-q', text: String(itens.length) }),
            pa ? iconBtn('edit', 'Renomear a pasta', () => renomearPasta(pa), { size: 14, id: 'org-ren-' + pa.id }) : null,
            pa ? iconBtn('trash', 'Apagar a pasta (as cenas dela voltam para "Sem pasta")', () => apagarPasta(pa), { size: 14, id: 'org-del-' + pa.id }) : null),
          itens.length ? h('ul', { class: 'org-l' }, itens) : h('p', { class: 'org-vazia', text: pa ? 'Arraste uma cena para cá.' : 'Todas as cenas estão em pastas.' }));
      };
      body.replaceChildren(
        secao(null, F.raizes.filter(id => !pastaDaCena(id))),
        ...p.lista.map(pa => secao(pa, F.raizes.filter(id => pastaDaCena(id) === pa.id))),
        h('div', { class: 'row' }, btn('Nova pasta', () => novaPasta(), { icon: 'plus', id: 'org-nova' })),
        note('Arraste uma cena para outra pasta, ou para cima de outra cena (ela fica dentro, como o bairro dentro da cidade); a lista ao lado de cada cena faz o mesmo. A família fica na pasta da cena de fora. Apagar uma pasta não apaga as cenas. O ícone do mundo marca as cenas que um marcador do Mapa-múndi abre.'));
      if (fid) { const n = document.getElementById(fid); if (n) n.focus({ preventScroll: true }); }
    };
    paint();
    modal({ title: 'Organizar as cenas', wide: true, body, focusPrimary: true, actions: [{ label: 'Pronto', kind: 'primary' }] });
    modalLive = paint;
  }

  /* ---- No ar: a cena que os jogadores da mesa veem. Só muda quando o mestre manda, e dá para desfazer. ---- */
  function showToPlayers(id) {
    const antes = Nuvem.noAr(), sc = Store.S.scenes[id];
    if (!sc || !Nuvem.mostrar(id)) return;
    const cs = Nuvem.campanhasDaCena(id);          // (numa mesa com campanhas, quem vê a cena são os jogadores da campanha dela)
    toast(cs.length ? `Os jogadores da campanha ${nomeDaCampanha(cs[0])} agora veem "${sc.name}".` : `Os jogadores agora veem "${sc.name}".`, { action: 'Desfazer', run: () => { if (antes && Store.S.scenes[antes]) Nuvem.mostrar(antes); else Nuvem.esconder(); } });
    // a mesa ao vivo avisa: quem está em outra aba fica sabendo que há cena nova para ver
    try { window.TC.ponte.publicar('cena', { kind: 'aviso', titulo: 'Cena: ' + sc.name, resumo: 'O mestre mostrou esta cena aos jogadores. Ela está na aba Cenas.' }); } catch (e) { /* sem a casca, não há mesa ao vivo */ }
  }
  function hideFromPlayers() {
    const antes = Nuvem.noAr();
    if (!Nuvem.esconder()) return;
    toast('Os jogadores não veem mais nenhuma cena.', { action: 'Desfazer', run: () => { if (antes && Store.S.scenes[antes]) Nuvem.mostrar(antes); } });
  }
  function airMenu() {
    const cur = Store.S.current, ar = Nuvem.noAr(), outra = ar && ar !== cur && Store.S.scenes[ar];
    const deFora = !!outra && !Nuvem.naVista(ar);      // (a cena no ar é de outra campanha: não está na lista daqui)
    return [
      { head: ar === cur ? 'Os jogadores veem esta cena' : deFora ? `No ar: "${outra.name}", de outra campanha` : outra ? `Os jogadores veem "${outra.name}"` : 'Os jogadores não veem nenhuma cena' },
      ar === cur ? null : { label: 'Mostrar esta cena aos jogadores', icon: 'eye', run: () => showToPlayers(cur) },
      outra && !deFora ? { label: 'Ir para a cena que está no ar', icon: 'map', run: () => switchScene(ar) } : null,
      ar ? { label: 'Tirar a cena do ar', icon: 'eyeOff', run: hideFromPlayers } : null,
    ];
  }

  /* ---- As cenas guardadas neste navegador (de antes da mesa): o mestre escolhe quais levar para a mesa. ---- */
  const offeredKey = () => 'tinycats:cenas:oferta:' + ((window.TC && window.TC.ponte && window.TC.ponte.estado.mesa) || {}).id;
  async function offerLocal() {
    if (!Nuvem.mestre()) return;
    const lista = await Nuvem.cenasDoNavegador();
    refresh();                                    // o painel passa a lembrar que há cenas neste navegador (ver emptySel)
    if (!lista.length || modalEl || Tour.active()) return;
    if (cascaOcupada()) { setTimeout(offerLocal, 1200); return; }      // (espera o menu ou a janela da casca fechar)
    try { if (localStorage.getItem(offeredKey())) return; localStorage.setItem(offeredKey(), '1'); } catch (e) { /* sem armazenamento: oferece de novo na próxima vez */ }
    localScenesBox(lista, true);
  }
  // A mesa só tem a cena vazia do começo? (é quando vale lembrar o mestre das cenas que ele deixou no navegador)
  const onlyBlank = () => { const sc = Store.scene(); return Store.S.order.length === 1 && !sc.tokens.length && !sc.walls.length && !sc.shapes.length && !sc.bg.asset; };
  async function bringLocal() {
    const lista = await Nuvem.cenasDoNavegador();
    if (!lista.length) { toast('Este navegador não tem cenas guardadas fora da mesa.'); return; }
    localScenesBox(lista, false);
  }
  function localScenesBox(lista, primeira) {
    const marcadas = new Set(lista.filter(c => !c.exemplo).map(c => c.id));
    const linhas = lista.map(c => h('label', { class: 'pick' },
      h('input', { type: 'checkbox', id: 'lc-' + c.id, checked: marcadas.has(c.id), onchange: e => { if (e.target.checked) marcadas.add(c.id); else marcadas.delete(c.id); } }),
      h('span', { class: 'pick-n', text: c.nome }),
      h('span', { class: 'pick-s', text: (c.tokens === 1 ? '1 token' : c.tokens + ' tokens') + (c.fundo ? ' · com mapa' : '') + (c.exemplo ? ' · exemplo' : '') })));
    const andamento = h('p', { class: 'note', id: 'lc-status', role: 'status' });
    modal({
      title: primeira ? 'Trazer as suas cenas para esta mesa?' : 'Trazer cenas deste navegador', wide: true,
      text: (primeira ? 'Esta mesa ainda não tem cenas, e este navegador guarda as que você fez antes. ' : '') + 'Na mesa, as cenas e as imagens ficam salvas no banco: abrem em qualquer aparelho e os jogadores podem vê-las ao vivo. As cenas do navegador continuam onde estão.',
      body: [h('div', { class: 'picks' }, linhas), note('Os tokens de um jogador com o mesmo nome de um participante desta mesa continuam com ele; os outros passam a ser do mestre.'), andamento],
      actions: [
        { label: primeira ? 'Agora não' : 'Cancelar' },
        {
          label: 'Trazer as marcadas', kind: 'primary', keep: true, run: async () => {
            const ids = lista.map(c => c.id).filter(id => marcadas.has(id));
            if (!ids.length) { andamento.textContent = 'Marque pelo menos uma cena.'; return; }
            for (const b of modalEl.querySelectorAll('button, input')) b.disabled = true;
            andamento.textContent = 'Enviando as imagens e as cenas…';
            const vazia = primeira && Store.S.order.length === 1 ? Store.scene() : null;     // a "Nova cena" criada só para a mesa não abrir vazia
            let feitas = [];
            try { feitas = await Nuvem.trazer(ids, (n, total) => { andamento.textContent = `Enviando… ${n} de ${total}`; }); }
            catch (err) { closeModal(); toast('Não deu para trazer tudo: ' + ((err && err.message) || 'falha no envio') + ' O que já tinha subido ficou na mesa.', { long: true }); if (Store.S.order.length) refresh(); return; }
            closeModal();
            if (!feitas.length) { toast('Nenhuma cena foi trazida.'); return; }
            if (vazia && Store.S.scenes[vazia.id] && !vazia.tokens.length && !vazia.walls.length && !vazia.shapes.length && !vazia.bg.asset) { Store.removeScene(vazia.id); Persist.removeScene(vazia.id); }
            switchScene(feitas[0]);
            toast(feitas.length === 1 ? 'Cena trazida para a mesa. Os jogadores só a veem quando você a puser no ar.' : `${feitas.length} cenas trazidas para a mesa. Os jogadores só veem a que você puser no ar.`, { long: true });
          },
        },
      ],
    });
  }

  function fileMenu() {
    const gm = isGM();
    return [
      gm ? { label: 'Exportar esta cena', icon: 'download', run: exportScene } : null,
      gm ? { label: 'Exportar todas as cenas', icon: 'download', run: exportAll } : null,
      gm ? { label: 'Importar cena…', icon: 'upload', run: importFile } : null,
      gm && Nuvem.mestre() ? { label: 'Trazer cenas deste navegador…', icon: 'upload', run: bringLocal } : null,
      gm ? { label: 'Barras padrão dos tokens…', icon: 'sliders', run: () => barDefaultsBox(null) } : null,
      gm ? '-' : null,
      { label: 'Animar efeitos e clima', check: App.anim, run: () => { App.anim = !App.anim; Store.S.prefs.anim = App.anim; Persist.meta(); Render.request(); } },
      { label: 'Atalhos de teclado', icon: 'help', run: helpBox },
      gm ? { label: 'Rever o tutorial', icon: 'play', run: () => Tour.start() } : null,
    ];
  }
  function helpBox() {
    const rows = [
      ['V', 'Selecionar'], ['H ou espaço + arrastar', 'Mover a câmera'], ['Roda do mouse', 'Aproximar e afastar'], ['0', 'Enquadrar a cena'],
      ['T', 'Novo token'], ['J', 'Objetos de cenário: tochas, fogueiras, móveis, árvores, armadilhas'], ['B · L · R · O · P · X', 'Desenho livre, linha, retângulo, elipse, polígono, texto'], ['W · D', 'Parede · porta'],
      ['I', 'Luz'], ['U', 'Névoa manual'], ['Q', 'Terreno'], ['Y', 'Efeito de magia'], ['M', 'Régua'], ['G', 'Ping no ponto onde o cursor está'],
      ['A', 'Mirar no token sob o cursor (ou nos selecionados); de novo, tira a mira'],
      ['F', 'Atributos do token sob o cursor (ou do selecionado), para rolar com a fixa'], ['Shift+F', 'Rolagem geral: o mesmo atributo para os selecionados (ou um grupo) — só o mestre'], ['C', 'Disputa entre dois tokens (só o mestre)'],
      ['E', 'Equipamentos do token sob o cursor (ou do selecionado): um clique equipa ou guarda'],
      ['K', 'Ataque com defesa no token sob o cursor (ou nos selecionados) — só o mestre'],
      ['N · Shift+N', 'Passar o turno · voltar o turno (só o mestre)'],
      ['Setas', 'Mover o token selecionado um quadrado'], ['Alt ao arrastar', 'Solta da grade'], ['Shift ao desenhar', 'Trava em quadrado, círculo ou 45°'],
      ['Ctrl+Z · Ctrl+Shift+Z', 'Desfazer · refazer'], ['Ctrl+C · Ctrl+V · Ctrl+D', 'Copiar, colar, duplicar'], ['Delete', 'Apagar a seleção'], ['Esc', 'Cancelar, soltar a seleção, voltar a Selecionar'],
    ];
    modal({
      title: 'Atalhos de teclado', wide: true,
      body: h('dl', { class: 'keys' }, rows.map(([k, d]) => [h('dt', null, h('kbd', { text: k })), h('dd', { text: d })])),
      actions: [{ label: 'Fechar', kind: 'primary' }],
    });
  }

  function renderBanner() {
    if (isGM()) {
      // (lote 8) escolhendo o real de um Clone no mapa
      const real = App.escolhaReal ? Store.get('tokens', App.escolhaReal) : null;
      if (App.escolhaReal && !real) App.escolhaReal = null;
      el.banner.hidden = !real;
      if (real) el.banner.replaceChildren(h('span', { class: 'dot', style: { background: '#d9a821' } }),
        h('span', { class: 'banner-t', id: 'bannerText', text: `Clique no clone que vai ser o real de ${tokName(real)}.` }),
        btn('Sortear', () => { const rid = App.escolhaReal; fimEscolhaReal(); sortearReal(rid); }, { kind: 'small', id: 'clEscSortear' }),
        btn('Fica onde está', () => { fimEscolhaReal(); toast('O real fica onde está (a coroa).'); }, { kind: 'primary small', id: 'clEscFica' }));
      return;
    }
    if (Nuvem.jogador()) {
      // O jogador de verdade, na mesa: a faixa só aparece quando há algo a dizer.
      // (quem joga em mais de uma campanha: a cena no ar pode ser de outra campanha dele — não da que ele tem em vista)
      const fora = Nuvem.semCena() ? Nuvem.arDeFora() : [];
      const aviso = fora.length ? `A cena que está no ar é da campanha ${nomeDaCampanha(fora[0])}. Para vê-la, troque de campanha no menu da mesa.`
        : Nuvem.semCena() ? 'O mestre ainda não está mostrando nenhuma cena. Ela aparece aqui sozinha quando ele mostrar.'
        : Vision.out.noSource ? 'Você não tem um token com visão nesta cena; por isso a névoa cobre tudo.' : '';
      el.banner.hidden = !aviso;
      if (aviso) el.banner.replaceChildren(h('span', { class: 'dot', style: { background: viewerColor() } }), h('span', { class: 'banner-t', id: 'bannerText', text: aviso }));
      return;
    }
    const p = playerById(App.viewer);
    el.banner.hidden = false;
    el.banner.replaceChildren(
      h('span', { class: 'dot', style: { background: p ? p.color : 'var(--lamp)' } }),
      h('span', { class: 'banner-t' }, 'Vendo como ', h('strong', { text: p ? p.name : 'jogador' }), '. É isto que esse jogador enxerga e pode fazer.',
        Vision.out.noSource ? h('span', { class: 'banner-w', text: ' Ele não tem token com visão nesta cena, por isso a névoa cobre tudo.' }) : null),
      btn('Voltar ao mestre', () => setViewer('gm'), { kind: 'primary small', id: 'backGm' }));
  }

  /* ================= Trilho de ferramentas ================= */
  function renderRail() {
    const kids = [];
    let grp = -1;
    for (const t of Tools.LIST) {
      if (!Tools.allowed(t.id)) continue;
      if (grp !== -1 && t.grp !== grp) kids.push(h('span', { class: 'rail-sep' }));
      grp = t.grp;
      kids.push(h('button', { type: 'button', class: 'tool' + (App.tool === t.id ? ' on' : ''), id: 'tool-' + t.id, title: `${t.n} (${t.k})`, 'aria-label': t.n, 'aria-pressed': String(App.tool === t.id), onclick: () => Tools.set(t.id) }, icon(t.i, 20)));
    }
    el.rail.replaceChildren(...kids);
  }

  /* ================= Opções da ferramenta ================= */
  const optSet = (k, v, redraw) => { App.opt[k] = v; if (redraw) refresh(); Render.request(); };
  const oColor = (id, key, label) => h('input', { id, type: 'color', class: 'in color', value: App.opt[key], title: label, 'aria-label': label, oninput: e => optSet(key, e.target.value) });
  const oRange = (id, key, min, max, step, label, fmtV) => {
    const out = h('span', { class: 'o-val', text: fmtV(App.opt[key]) });
    return h('label', { class: 'o-rg' }, h('span', { class: 'o-l', text: label }),
      h('input', { id, type: 'range', class: 'rg', min, max, step, value: App.opt[key], 'aria-label': label, oninput: e => { optSet(key, parseFloat(e.target.value)); out.textContent = fmtV(App.opt[key]); } }), out);
  };
  const oCheck = (id, key, label, redraw) => h('label', { class: 'o-ck' }, h('input', { id, type: 'checkbox', checked: !!App.opt[key], onchange: e => optSet(key, e.target.checked, redraw) }), h('span', { text: label }));
  const oGroup = (label, ...kids) => h('div', { class: 'o-g' }, label ? h('span', { class: 'o-l', text: label }) : null, kids);

  const FX_SHAPES = [['circ', 'Círculo'], ['quad', 'Quadrado'], ['rect', 'Retângulo'], ['cone', 'Cone'], ['line', 'Linha']];
  const fxSize = e => (e.k === 'rect' ? `${fmt(e.rw)} × ${fmt(e.rh)} q` : `${fmt(e.r)} q`);      // tamanho de um efeito, por extenso
  const WALL_SEG = [
    ['wall', 'Parede', null, 'Parede: barra a visão, a luz e a passagem'],
    ['door', 'Porta', null, 'Porta: abre e fecha com um clique no ícone dela'],
    ['secret', 'Secreta', null, 'Porta secreta: para os jogadores é uma parede, até você revelar'],
    ['window', 'Janela', null, 'Janela: deixa ver e deixa a luz passar; fechada, não deixa atravessar'],
    ['veil', 'Cortina', null, 'Cortina: fechada, barra a visão e a luz (menos de quem está encostado nela), mas deixa atravessar'],
    ['mureta', 'Mureta', null, 'Mureta: uma parede baixa (a amurada do navio, um parapeito): deixa ver e a luz passa, mas não deixa atravessar; não abre'],
  ];
  const WALL_NAMES = { wall: 'Parede', door: 'Porta', secret: 'Porta secreta', window: 'Janela', veil: 'Cortina', mureta: 'Mureta' };
  const WALL_NOTES = {
    wall: 'Barra a visão, a luz e a passagem dos jogadores.',
    door: 'Fechada, barra visão, luz e passagem. Clique no ícone dela no mapa para abrir e fechar.',
    secret: 'Para os jogadores é uma parede comum: sem ícone e sem como abrir. Quando acharem a porta, revele, e ela vira uma porta normal.',
    window: 'Deixa ver e deixa a luz passar. Fechada, barra a passagem; aberta, deixa atravessar. Clique no ícone dela no mapa para abrir e fechar.',
    veil: 'Fechada, barra a visão e a luz, menos para quem está encostado nela; atravessar, pode sempre. Aberta, não barra nada. Clique no ícone dela no mapa para abrir e fechar.',
    mureta: 'Uma parede baixa: deixa ver e deixa a luz passar, mas não deixa atravessar. Não abre (para passar, apague um trecho ou ponha uma porta em cima).',
  };
  const wallKindOf = w => (w.k === 'door' && w.secret ? 'secret' : w.k);

  function renderOpts() {
    const t = App.tool, o = App.opt, sc = Store.scene(), gm = isGM(), kids = [];
    if (t === 'token') {
      kids.push(oGroup('Dono', inSelect('o-owner', o.tokOwner, [['', 'Mestre (NPC)'], ['*', 'Todos os jogadores']].concat(Store.S.players.map(p => [p.id, p.name])), v => optSet('tokOwner', v))));
      kids.push(oGroup('Tamanho', seg('o-size', o.tokSize, [[0.5, '½'], [1, '1'], [2, '2'], [3, '3'], [4, '4']], v => optSet('tokSize', v, true))));
      if (Fichas.on()) kids.push(btn('Puxar o grupo…', () => Luta.grupo(), { icon: 'users', kind: 'small', id: 'o-grupo', title: 'Cria de uma vez os tokens de um grupo de personagens das Fichas, já ligados a elas' }));
    } else if (['free', 'line', 'rect', 'ell', 'poly', 'text'].includes(t)) {
      kids.push(oGroup(t === 'text' ? 'Cor' : 'Traço', oColor('o-stroke', 'stroke', 'Cor do traço')));
      if (t === 'rect' || t === 'ell' || t === 'poly') kids.push(oGroup(null, oCheck('o-fillon', 'fillOn', 'Preencher', true), o.fillOn ? oColor('o-fill', 'fill', 'Cor do preenchimento') : null));
      if (t === 'text') kids.push(oRange('o-fs', 'fs', 12, 120, 2, 'Tamanho', v => v + ' px'));
      else kids.push(oRange('o-sw', 'sw', 1, 24, 1, 'Espessura', v => v + ' px'));
      kids.push(oRange('o-alpha', 'alpha', 0.1, 1, 0.05, 'Opacidade', v => Math.round(v * 100) + '%'));
      if (t === 'line') kids.push(oCheck('o-arrow', 'arrow', 'Seta'));
      if (t !== 'free' && t !== 'text') kids.push(oCheck('o-snap', 'snap', 'Encaixar na grade'));
      kids.push(oCheck('o-top', 'top', 'Acima dos tokens'));
      if (gm) kids.push(oCheck('o-gm', 'gmOnly', 'Só o mestre vê'));
    } else if (t === 'wall') {
      const isDoor = k => k === 'door' || k === 'secret';
      kids.push(seg('o-wk', o.wallKind, WALL_SEG, v => { if (isDoor(v)) o.wallMode = 'line'; optSet('wallKind', v, true); }));
      kids.push(seg('o-wm', o.wallMode, [['line', 'Trecho', null, 'Um trecho de cada vez, de canto a canto'], ['room', 'Sala', null, 'Arraste um retângulo: as quatro paredes de uma vez']],
        v => { if (v === 'room' && isDoor(o.wallKind)) o.wallKind = 'wall'; Tools.cancel(); optSet('wallMode', v, true); }));
      if (!sc.fog.dynamic) kids.push(h('span', { class: 'o-warn' }, 'A visão por paredes está desligada nesta cena.', btn('Ligar', () => Store.tx('Ligar visão por paredes', () => Store.scn({ fog: Object.assign({}, sc.fog, { dynamic: true }) })), { kind: 'small' })));
    } else if (t === 'obj') {
      // os objetos da categoria escolhida, em miniaturas; um clique escolhe, e o clique no mapa põe
      const cat = Props.G.some(g => g.id === o.objCat) ? o.objCat : 'luz';
      kids.push(seg('o-oc', cat, Props.G.map(g => [g.id, g.n]), v => { o.objCat = v; const ids = Props.ORDER.filter(id => Props.P[id].g === v); if (!ids.includes(o.obj)) o.obj = ids[0]; optSet('objCat', v, true); }));
      kids.push(h('div', { class: 'o-objs', role: 'group', 'aria-label': 'Objetos' }, Props.ORDER.filter(id => Props.P[id].g === cat).map(id => {
        const cv = h('canvas', { width: 64, height: 64 });
        Props.thumb(cv, id, 1.3);
        return h('button', { type: 'button', class: 'o-obj' + (o.obj === id ? ' on' : ''), id: 'o-obj-' + id, title: Props.P[id].n + (Props.P[id].luz ? ' (com luz que tremula)' : ''), 'aria-pressed': String(o.obj === id), onclick: () => optSet('obj', id, true) }, cv);
      })));
      kids.push(oGroup('Tamanho', seg('o-osz', o.objSize || 0, [[0, 'Normal'], [0.5, '½'], [1, '1'], [2, '2'], [3, '3']], v => optSet('objSize', v, true))));
      kids.push(oCheck('o-ohid', 'objHidden', 'Oculto dos jogadores'));
      if (sc.light === 'claro' && Props.P[o.obj] && Props.P[o.obj].luz) kids.push(h('span', { class: 'o-warn' }, 'A cena está clara: a luz só aparece em penumbra ou no escuro.', btn('Pôr em penumbra', () => Store.tx('Luz ambiente', () => Store.scn({ light: 'penumbra' })), { kind: 'small' })));
    } else if (t === 'light') {
      kids.push(oGroup('Tipo', inSelect('o-lp', o.lightPreset, LIGHT_PRESETS.map(p => [p.id, `${p.n} (${p.bright}/${p.dim} q)`]), v => optSet('lightPreset', v))));
      if (sc.light === 'claro') kids.push(h('span', { class: 'o-warn' }, 'A cena está clara: as luzes só fazem efeito em penumbra ou no escuro.', btn('Pôr em penumbra', () => Store.tx('Luz ambiente', () => Store.scn({ light: 'penumbra' })), { kind: 'small' })));
    } else if (t === 'fog') {
      if (!sc.fog.manual) kids.push(h('span', { class: 'o-warn' }, 'A névoa manual está desligada nesta cena.', btn('Ligar', () => Store.tx('Ligar névoa manual', () => Store.scn({ fog: Object.assign({}, sc.fog, { manual: true }) })), { kind: 'small' })));
      else {
        kids.push(seg('o-fm', o.fogMode, [['r', 'Revelar'], ['h', 'Esconder']], v => optSet('fogMode', v, true)));
        kids.push(seg('o-fs2', o.fogShape, [['brush', 'Pincel'], ['rect', 'Retângulo']], v => optSet('fogShape', v, true)));
        if (o.fogShape === 'brush') kids.push(oRange('o-fsize', 'fogSize', 0.5, 8, 0.5, 'Pincel', v => fmt(v) + ' q'));
        kids.push(btn('Revelar tudo', () => fogAll('r'), { kind: 'small' }), btn('Esconder tudo', () => fogAll('h'), { kind: 'small' }));
      }
    } else if (t === 'terrain') {
      const u = String(sc.grid.unitName || '').trim(), passo = sc.grid.unit || 1, def = TERRENO_POR_ID[o.terType] || TERRENOS[0];
      kids.push(seg('o-tm', o.terMode, [['paint', 'Pintar', null, 'Criar áreas de terreno'], ['edit', 'Ajustar', null, 'Selecionar uma área para mover, esticar, trocar ou apagar']], v => { Tools.cancel(); optSet('terMode', v, true); }));
      if (o.terMode !== 'edit') {
        kids.push(seg('o-ts', o.terShape, [['brush', 'Pincel'], ['rect', 'Retângulo'], ['ell', 'Elipse'], ['poly', 'Polígono']], v => { Tools.cancel(); optSet('terShape', v, true); }));
        kids.push(oGroup('Tipo', inSelect('o-tt', o.terType, TERRENOS.map(x => [x.id, x.n]), v => { o.terH = null; optSet('terType', v, true); })));
        const alt = o.terH == null || !isFinite(o.terH) ? Math.round(def.hq * passo * 100) / 100 : o.terH;
        kids.push(oGroup('Altura', h('input', { id: 'o-th', type: 'number', class: 'in num', step: passo, min: -9999, max: 9999, value: alt, 'aria-label': 'Altura da área' + (u ? ', em ' + u : ''), title: 'Altura da área, na unidade da cena. Negativa é um buraco (fosso). Zero não mostra altura.',
          onchange: e => { const v = parseFloat(String(e.target.value).replace(',', '.')); optSet('terH', isFinite(v) ? clamp(Math.round(v * 100) / 100, -9999, 9999) : null, true); } }), u ? h('span', { class: 'o-u', text: u }) : null));
        if (o.terShape === 'brush') kids.push(oRange('o-tz', 'terSize', 0.5, 6, 0.5, 'Pincel', v => fmt(v) + ' q'));
      } else kids.push(h('span', { class: 'o-l', text: selOf('shapes').some(isTer) ? 'Os dados da área estão no painel ao lado.' : 'Clique numa área do mapa.' }));
    } else if (t === 'fx') {
      kids.push(oGroup('Efeito', fxSelect('o-fx', o.fx, v => optSet('fx', v, true))));
      kids.push(seg('o-fxk', o.fxShape, FX_SHAPES, v => optSet('fxShape', v, true)));
      const oNum = (id, key, min, max, step, dflt, label) => h('input', { id, type: 'number', class: 'in num', min, max, step, value: o[key], 'aria-label': label, onchange: e => { const v = parseFloat(String(e.target.value).replace(',', '.')); optSet(key, clamp(isFinite(v) ? v : dflt, min, max), true); } });
      if (o.fxShape === 'rect') {
        kids.push(oGroup('Largura', oNum('o-fxrw', 'fxRW', 0.5, 60, 0.5, 3, 'Largura em quadrados'), h('span', { class: 'o-u', text: 'q' })));
        kids.push(oGroup('Altura', oNum('o-fxrh', 'fxRH', 0.5, 60, 0.5, 2, 'Altura em quadrados'), h('span', { class: 'o-u', text: 'q' })));
        kids.push(oGroup('Rotação', oNum('o-fxdir', 'fxDir', 0, 345, 15, 0, 'Rotação em graus'), h('span', { class: 'o-u', text: '°' })));
      } else kids.push(oGroup(o.fxShape === 'line' ? 'Comprimento' : o.fxShape === 'cone' ? 'Alcance' : 'Raio', h('input', { id: 'o-fxr', type: 'number', class: 'in num', min: 0.5, max: 60, step: 0.5, value: o.fxR, 'aria-label': 'Tamanho em quadrados', onchange: e => optSet('fxR', clamp(parseFloat(e.target.value) || 1, 0.5, 60)) }), h('span', { class: 'o-u', text: 'q' })));
      if (o.fxShape === 'cone') kids.push(oGroup('Abertura', h('input', { id: 'o-fxa', type: 'number', class: 'in num', min: 10, max: 340, step: 5, value: o.fxAng, onchange: e => optSet('fxAng', clamp(parseFloat(e.target.value) || 60, 10, 340)) }), h('span', { class: 'o-u', text: '°' })));
      if (o.fxShape === 'line') kids.push(oGroup('Largura', h('input', { id: 'o-fxw', type: 'number', class: 'in num', min: 0.5, max: 20, step: 0.5, value: o.fxW, onchange: e => optSet('fxW', clamp(parseFloat(e.target.value) || 1, 0.5, 20)) }), h('span', { class: 'o-u', text: 'q' })));
      kids.push(oGroup('Dura', inCount('o-fxdur', o.fxDur, v => optSet('fxDur', v), { label: 'Duração em rodadas', title: 'Duração em rodadas, descontada pela ordem de turnos. Vazio: fica até alguém remover.' }), h('span', { class: 'o-u', text: 'rodadas' })));
      kids.push(oCheck('o-fxat', 'fxAttach', 'Prender ao token clicado'));
    }
    el.opts.hidden = !kids.length;
    el.opts.replaceChildren(...kids);
    setHint();
  }
  // A linha de dica (a caixa some quando não há o que dizer).
  function setHint() { const t = Tools.hint(); el.hint.textContent = t; el.hintBox.hidden = !t; }
  function fogAll(m) {
    const sc = Store.scene();
    Store.tx(m === 'r' ? 'Revelar tudo' : 'Esconder tudo', () => {
      for (const op of sc.fogOps.slice()) Store.del('fogOps', op.id);
      Store.add('fogOps', { id: uid('fg'), m, k: 'all' });
    });
  }

  /* ================= Painel lateral ================= */
  const TABS = [['sel', 'Seleção'], ['turn', 'Turnos'], ['fx', 'Efeitos'], ['scene', 'Cena'], ['players', 'Jogadores']];
  function tabsFor() {
    if (isGM()) return TABS;
    return TABS.filter(([id]) => id === 'sel' || (id === 'turn' && can('turns')) || (id === 'fx' && can('fx')));
  }
  function openTab(id, focusId) {
    App.tab = id; App.sideOpen = true;
    renderSide();
    if (focusId) { const n = document.getElementById(focusId); if (n) { n.focus({ preventScroll: true }); if (n.select) n.select(); } }
  }
  /* (lote 8) Redesenhar o painel troca o campo em que a pessoa está digitando, e o navegador dispara o "change" (e o
     "blur") do campo que sai, com o que estava pela metade: o "-1" de um "-15" seria aplicado antes do Enter. Durante a
     troca esses eventos não valem; o que já foi digitado (e ainda não confirmado) passa para o campo novo, com o cursor
     no mesmo lugar. Só o Enter, ou sair do campo, confirma. */
  let trocandoPainel = false;
  for (const tipo of ['change', 'blur', 'focusout']) document.addEventListener(tipo, e => { if (trocandoPainel) e.stopImmediatePropagation(); }, true);
  const campoDeTexto = n => !!n && (n.tagName === 'TEXTAREA' || (n.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset|range|color|file)$/i.test(n.type || '')));
  document.addEventListener('input', e => { if (campoDeTexto(e.target)) e.target.__digitado = true; }, true);
  document.addEventListener('change', e => { if (!trocandoPainel && e.target) e.target.__digitado = false; }, true);
  function renderSide() {
    el.side.hidden = !App.sideOpen;
    if (!App.sideOpen) { trocandoPainel = true; try { el.side.replaceChildren(); } finally { trocandoPainel = false; } return; }
    const a = document.activeElement;
    const fid = a && a.id && el.side.contains(a) ? a.id : null;
    const pendente = fid && campoDeTexto(a) && a.__digitado ? a.value : null;     // digitado e ainda não confirmado
    let ss = null, se = null;
    try { if (fid && a.type !== 'number' && a.setSelectionRange) { ss = a.selectionStart; se = a.selectionEnd; } } catch (e) { ss = null; }
    const old = el.side.querySelector('.tab-body'), scroll = old ? old.scrollTop : 0, oldTab = old ? old.dataset.tab : null;
    const tabs = tabsFor();
    if (!tabs.some(([id]) => id === App.tab)) App.tab = 'sel';
    let body;
    switch (App.tab) {
      case 'turn': body = tabTurn(); break;
      case 'fx': body = tabFx(); break;
      case 'scene': body = tabScene(); break;
      case 'players': body = tabPlayers(); break;
      default: body = tabSel();
    }
    const bodyEl = h('div', { class: 'tab-body', data: { tab: App.tab } }, body);
    trocandoPainel = true;
    try { el.side.replaceChildren(
      h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([id, n]) => h('button', { type: 'button', class: 'tab' + (id === App.tab ? ' on' : ''), role: 'tab', id: 'tab-' + id, 'aria-selected': String(id === App.tab), onclick: () => { App.tab = id; renderSide(); } }, n))),
      bodyEl); } finally { trocandoPainel = false; }
    if (oldTab === App.tab) bodyEl.scrollTop = scroll;
    if (fid) {
      const n = document.getElementById(fid);
      if (n) {
        if (pendente != null && campoDeTexto(n)) { n.value = pendente; n.__digitado = true; }
        n.focus({ preventScroll: true }); try { if (ss != null) n.setSelectionRange(ss, se); } catch (e) { /* campo sem cursor de texto */ }
      }
    }
    startThumbs();
  }

  /* ---- Aba Seleção ---- */
  function emptySel() {
    const sc = Store.scene(), gm = isGM();
    return [
      h('div', { class: 'empty' },
        h('h3', { class: 'p-title', text: 'Nada selecionado' }),
        h('p', { class: 'muted', text: gm ? 'Clique num token, desenho, efeito ou luz para ver e editar os dados aqui.' : 'Clique num token para ver os dados dele.' })),
      sc.sample && gm ? h('div', { class: 'callout' },
        h('strong', { text: 'Esta é uma cena de exemplo.' }),
        h('span', { text: ' Os tokens, as barras e a ordem de turnos são inventados para mostrar o que a mesa faz. Mexa à vontade, ou crie a sua pelo menu de cenas.' })) : null,
      gm && Nuvem.mestre() && Nuvem.locais() > 0 && onlyBlank() ? h('div', { class: 'callout', id: 'localHint' },
        h('strong', { text: 'As suas cenas de antes continuam guardadas neste navegador.' }),
        h('span', { text: ' Esta mesa ainda não tem nenhuma. Você escolhe quais trazer; as do navegador não mudam.' }),
        h('div', { class: 'row' }, btn('Trazer cenas deste navegador…', bringLocal, { icon: 'upload', kind: 'primary small', id: 'localBring' }))) : null,
      gm ? h('div', { class: 'row' }, btn('Novo token', () => Tools.set('token'), { icon: 'token' }), btn('Trazer imagem…', () => pickImage(f => importImages(f, null)), { icon: 'image' }),
        Fichas.on() ? btn('Puxar o grupo…', () => Luta.grupo(), { icon: 'users', id: 'sel-grupo', title: 'Cria de uma vez os tokens de um grupo de personagens das Fichas, já ligados a elas' }) : null,
        sc.tokens.some(t => !t.prop) ? btn('Rolagem geral…', () => Luta.rolagemGeral(), { icon: 'die', id: 'sel-geral', title: 'O mesmo atributo para vários tokens: os jogadores rolam pela mesa ao vivo, ou você rola por todos (Shift+F)' }) : null,
        Luta.podeDescanso() && sc.tokens.some(t => t.char && !t.clone) ? btn('Descanso curto…', () => Luta.descansoCurto(), { icon: 'rest', id: 'sel-curto', title: 'Abre o Descanso curto do Acampamento com quem está nesta cena já marcado (os personagens dos jogadores e os aliados). Lá você confere e confirma.' }) : null) : null,
    ];
  }
  function ownerLabel(t) {
    if (!t.owner) return 'Do mestre (NPC)';
    if (t.owner === '*') return 'De todos os jogadores';
    const p = playerById(t.owner);
    return p ? 'De ' + p.name : 'Dono desconhecido';
  }
  // (lote 19) a condição das raças diz de onde vem: "Orc Natuphas"; e a duração e o contador de começo
  const condDe = c => (c && c.r ? c.r : '');
  const condComeco = c => [c.dur > 0 ? c.dur + (c.dur === 1 ? ' rodada' : ' rodadas') : '', c.max > 0 ? 'até ' + c.max + (c.desce ? ', descendo' : '') : ''].filter(Boolean).join(' · ');
  function condChip(c, on, onClick, dica) {
    const de = condDe(c), com = condComeco(c);
    return h('button', { type: 'button', class: 'chip' + (on ? ' on' : '') + (de ? ' chip-r' : ''), 'aria-pressed': onClick ? String(on) : null, disabled: !onClick, title: (dica || c.n) + (de ? ' — ' + de : '') + (com ? ' (' + com + ')' : ''), onclick: onClick },
      h('span', { class: 'chip-i', style: { background: c.c } }, icon(c.i, 12)),
      de ? h('span', { class: 'chip-tt' }, h('span', { text: c.n }), h('small', { class: 'chip-de', text: de })) : h('span', { text: c.n }));
  }
  /* As condições para escolher, separadas por categoria: abas (Todas, Dano, Controle…) e uma busca pelo nome, que
     procura em todas. A aba e a busca ficam lembradas enquanto a página está aberta. A aba que tem alguma condição
     ativa nos tokens ganha um ponto. */
  let condTag = 'dano', condBusca = '';
  const semAcento = v => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function condGrid(toks, after, idp) {
    const pre = idp || 'cg', ids = toks.map(t => t.id);
    const live = () => ids.map(id => Store.get('tokens', id)).filter(Boolean);
    const tabs = h('div', { class: 'ctabs', role: 'group', 'aria-label': 'Categorias de condição' });
    const chips = h('div', { class: 'chips', id: pre + '-list' });
    const busca = h('input', { id: pre + '-busca', class: 'in ctab-q', type: 'search', placeholder: 'Buscar condição…', autocomplete: 'off', value: condBusca, 'aria-label': 'Buscar condição pelo nome',
      oninput: e => { condBusca = e.target.value; paint(); } });
    const paint = () => {
      const ts = live(), q = semAcento(condBusca.trim());
      const lista = q ? CONDS.filter(c => semAcento(c.n).includes(q)) : condTag === 'todas' ? CONDS : CONDS.filter(c => c.g === condTag);
      const tem = g => ts.some(t => t.conds.some(id => COND_BY_ID[id] && COND_BY_ID[id].g === g));
      tabs.replaceChildren(...[{ id: 'todas', n: 'Todas', t: 'Todas as condições' }].concat(COND_TAGS).map(g => h('button', {
        type: 'button', class: 'ctab' + (!q && condTag === g.id ? ' on' : '') + (g.id !== 'todas' && tem(g.id) ? ' tem' : ''), id: `${pre}-tab-${g.id}`,
        title: g.t + (g.id !== 'todas' && tem(g.id) ? ' (há condição ativa aqui)' : ''), 'aria-pressed': String(!q && condTag === g.id),
        onclick: () => { condTag = g.id; condBusca = ''; busca.value = ''; paint(); },
      }, g.n)));
      chips.replaceChildren(...(lista.length ? lista.map(c => {
        const on = ts.length > 0 && ts.every(t => t.conds.includes(c.id));
        if (COND_JANELA.has(c.id)) {                 // (lote 8) a Ferida permanente e o Clone: a janela deles, num token só
          const nao = condJanelaNao(c.id, ts, on);
          return condChip(c, on, nao ? null : () => { condJanela(c.id, ts[0], on, () => { paint(); if (after) after(); }); }, nao ? c.n + ': ' + nao : c.n + (on ? ' (tirar)' : '…'));
        }
        return condChip(c, on, () => { Act.condToggle(live(), c.id); paint(); if (after) after(); });
      })
        : [h('p', { class: 'muted', text: 'Nenhuma condição com esse nome.' })]));
    };
    paint();
    return h('div', { class: 'cgrid' }, tabs, busca, chips);
  }

  /* Condições ativas de um token, com contador e duração.
     O contador só muda na mão (+ e −); a duração, em rodadas, desconta sozinha na ordem de turnos. */
  function condStepToast(t, c, d) {
    const r = Act.condStep(t, c.id, d);
    if (r === 'max') { toast(`${c.n} já está no máximo (${c.max}) em ${tokName(t)}.`); return r; }
    // (lote 19) no limite (o máximo, ou zero na que desce), a sugestão do que vem, com Aplicar
    const lim = c.lim, agora = Store.get('tokens', t.id), n = agora ? condNum(agora, c.id) : 0;
    if (lim && ((lim.em === 'max' && r === 'ok' && d > 0 && n === c.max) || (lim.em === 0 && r === 'removed'))) { sugerirLimite(t.id, c); return r; }
    if (r === 'removed') toast(`${c.n} saiu de ${tokName(t)}.`, { action: 'Desfazer', run: Tools.undo });
    return r;
  }
  function sugerirLimite(tid, c) {
    const t = Store.get('tokens', tid), s = COND_BY_ID[c.lim.sug];
    if (!t || !s) return;
    const quando = c.lim.em === 'max' ? `${c.n} chegou a ${c.max} em ${tokName(t)}` : `${c.n} de ${tokName(t)} chegou a zero`;
    toast(`${quando}: ${c.lim.txt}.`, { action: `Aplicar: ${s.n}`, long: true, key: 'lim-' + tid + '-' + c.id, run: () => {
      const tk = Store.get('tokens', tid);
      if (!tk) return;
      Store.tx(`${s.n} (${c.n})`, () => {
        const info = Object.assign({}, tk.cinfo), conds = tk.conds.includes(s.id) ? tk.conds.slice() : tk.conds.concat(s.id);
        info[s.id] = Object.assign({}, info[s.id], c.lim.d > 0 ? { d: c.lim.d, d0: c.lim.d } : {});
        let cs = conds;
        if (c.lim.zera) { cs = conds.filter(x => x !== c.id); delete info[c.id]; }
        Store.upd('tokens', tk.id, { conds: cs, cinfo: info });
      });
      toast(`${tokName(tk)}: ${s.n}${c.lim.d > 0 ? ' por ' + c.lim.d + (c.lim.d === 1 ? ' rodada' : ' rodadas') : ''}${c.lim.zera ? ` (${c.n} zerou)` : ''}.`, { action: 'Desfazer', run: Tools.undo });
    } });
  }
  /* (lote 8) A Ferida permanente e o Clone: só o mestre, num token de cada vez. → por que não dá (texto), ou '' */
  function condJanelaNao(id, ts, on) {
    if (!isGM()) return 'só o mestre põe e tira';
    if (ts.length !== 1) return 'um token de cada vez (escolha só um)';
    const t = ts[0];
    if (on) return '';
    if (id === 'clone' && t.clone) return 'este já é uma cópia';
    if (id === 'clone' && t.prop) return 'só tokens';
    if (id === 'duplicado' && t.prop) return 'só tokens';
    if (COND_LADO.has(id) && t.prop) return 'só tokens';
    if (id === 'ferida' && !t.bars.some(b => b.on && b.m > 0)) return 'o token não tem barra para apodrecer';
    if (id === 'ferida' && Fichas.escondida(t)) return 'a ferida de um token ligado fica na ficha, que não chega a você (precisa da aba Fichas)';
    return '';
  }
  // pôr (abre a janela) ou tirar (a condição sai: a ferida leva o podre das barras; o Clone, as cópias)
  function condJanela(id, t, on, depois) {
    if (!t) return;
    if (COND_LADO.has(id)) { if (on) { Act.condToggle([t], id); toast(`${COND_BY_ID[id].n} saiu de ${tokName(t)}${t.char ? ' (a ficha desmarca a parte)' : ''}.`, { action: 'Desfazer', run: Tools.undo }); } else membroBox(t, id); if (depois) depois(); return; }
    if (!on) { if (id === 'ferida') feridaBox(t, null, depois); else if (id === 'duplicado') duplicadoBox(t, depois); else cloneBox(t, depois); return; }
    if (id === 'duplicado') { tirarMarcaDuplicado(t); if (depois) depois(); return; }
    if (id === 'clone' && !t.clone) { const n = Act.cloneDesfazer(t.id); toast(n ? `A condição Clone saiu de ${tokName(t)}: ${n === 1 ? 'a cópia sumiu' : `as ${n} cópias sumiram`}.` : `A condição Clone saiu de ${tokName(t)}.`, { action: 'Desfazer', run: Tools.undo }); }
    else { Act.condToggle([t], id); if (id === 'ferida') toast(`A ferida permanente saiu de ${tokName(t)}: a cura volta a ir até o máximo.`, { action: 'Desfazer', run: Tools.undo }); }     // (a cópia que perde o Clone some, e o aviso vem das regras dele)
    if (depois) depois();
  }
  /* (lote 19) Os membros perdidos (Mão, Pé, Braço e Perna Perdida, Costelas Abertas): de que lado? Os dois lados, também.
     Num token com ficha, a parte fica marcada lá (amputada; as costelas, como ferimento no peito) e desmarca quando a
     condição sai. */
  const LADOS = [['e', 'Esquerdo'], ['d', 'Direito'], ['ed', 'Os dois']];
  const textoLado = v => (v === 'ed' ? 'os dois lados' : v === 'd' ? 'lado direito' : 'lado esquerdo');
  function membroBox(t, id) {
    const c = COND_BY_ID[id];
    let lado = 'e';
    const op = (v, txt) => h('label', { class: 'cl-op' }, h('input', { type: 'radio', name: 'mb-lado', value: v, id: 'mb-lado-' + v, checked: v === lado, onchange: () => { lado = v; } }), h('span', { text: txt }));
    const naFicha = !!t.char && Fichas.on() && !!Fichas.get(t.char);
    modal({
      title: c.n + ' em ' + tokName(t),
      body: h('div', { class: 'cl-box' },
        field('De que lado', h('div', { class: 'cl-quem', role: 'radiogroup', 'aria-label': 'De que lado' }, LADOS.map(([v, n]) => op(v, n))), 'stack'),
        note(naFicha ? (id === 'costelasAbertas' ? 'A ficha marca as costelas abertas no peito (como um ferimento); quando a condição sair, a marca sai junto.' : 'A ficha marca a parte como amputada; quando a condição sair (o membro voltou), a ficha desmarca.')
          : t.char ? 'A ficha deste token não chega até você aqui: a condição fica só no token.' : 'Este token não tem ficha: a condição fica só no token.')),
      actions: [{ label: 'Cancelar' }, { label: 'Pôr ' + c.n, kind: 'primary', run: () => {
        const tt = Store.get('tokens', t.id); if (!tt) return;
        Store.tx(c.n, () => Store.upd('tokens', tt.id, { conds: tt.conds.includes(id) ? tt.conds : tt.conds.concat(id), cinfo: Object.assign({}, tt.cinfo, { [id]: { lado } }) }));
        toast(`${tokName(tt)}: ${c.n} (${textoLado(lado)})${naFicha ? ', marcada na ficha' : ''}.`, { action: 'Desfazer', run: Tools.undo });
      } }],
    });
  }
  // "20 HP · 5 SP": o que apodreceu em cada barra
  const podresTexto = t => t.bars.filter(b => b.on && barPod(b) > 0).map(b => fmt(barPod(b)) + ' ' + b.n).join(' · ');
  function cloneTexto(t) {
    if (!isGM()) return '–';
    const sc = Store.scene();
    if (t.clone) return 'cópia';
    const n = sc.tokens.filter(x => x.clone === t.id).length;
    return n ? `o real · ${n} ${n === 1 ? 'cópia' : 'cópias'}` : 'sem cópias';
  }
  /* A janela da Ferida permanente: qual barra e quanto apodrece, com a prévia ("HP 100 → 80; a cura não passa de 80").
     Num token que já tem a ferida, muda o quanto (0 tira daquela barra). */
  function feridaBox(t, i0, depois) {
    const barras = t.bars.map((b, i) => [b, i]).filter(([b]) => b.on && b.m > 0);
    if (!barras.length) { toast('Este token não tem barra para apodrecer.'); return; }
    const vida = barraDaVida(t.bars);
    let i = i0 != null ? i0 : (barras.find(([b]) => barPod(b) > 0) || [null, vida ? t.bars.indexOf(vida) : barras[0][1]])[1];
    const qtd = h('input', { id: 'fer-qtd', class: 'in num', type: 'number', min: 0, step: 1, autocomplete: 'off', 'data-focus': '', 'aria-label': 'Quanto apodrece' });
    const previa = h('p', { class: 'note fer-previa', id: 'fer-previa' });
    const pinta = () => {
      const b = t.bars[i], q = clamp(Math.round((parseFloat(String(qtd.value).replace(',', '.')) || 0) * 10) / 10, 0, b.m);
      const teto = Math.max(-barLo(b), b.m - q), v2 = Math.min(b.v, teto);
      previa.textContent = q > 0 ? `${b.n}: ${fmtV(b.v)} → ${fmtV(v2)} de ${fmt(b.m)}. ${fmt(q)} apodrecidos: a cura, até a total, não passa de ${fmtV(teto)} até a ferida sair.`
        : barPod(b) > 0 ? `Zero tira a ferida de ${b.n}: a cura volta a ir até ${fmt(b.m)}.` : 'Digite quanto da ponta da barra apodrece.';
    };
    const sel = inSelect('fer-bar', String(i), barras.map(([b, k]) => [String(k), `${b.n} (${fmtV(b.v)} de ${fmt(b.m)}${barPod(b) ? `, ${fmt(barPod(b))} podres` : ''})`]), v => { i = Number(v); qtd.value = barPod(t.bars[i]) || ''; pinta(); });
    qtd.value = barPod(t.bars[i]) || '';
    qtd.addEventListener('input', pinta);
    pinta();
    modal({
      title: 'Ferida permanente em ' + tokName(t),
      body: h('div', { class: 'fer-box' },
        note('A ponta da barra apodrece: o valor acima dela desce, e nenhuma cura (nem a total, nem o descanso) passa dali até você tirar a ferida. Num token ligado, a ficha mostra a barra podre.'),
        h('div', { class: 'grid2' }, field('Barra', sel), field('Quanto apodrece', qtd)), previa),
      actions: [{ label: 'Cancelar' }, { label: 'Apodrecer', kind: 'primary', run: () => {
        const tt = Store.get('tokens', t.id); if (!tt) return;
        const b = tt.bars[i]; if (!b) return;
        const q = clamp(Math.round((parseFloat(String(qtd.value).replace(',', '.')) || 0) * 10) / 10, 0, b.m);
        if (!q && !barPod(b)) { toast('Digite quanto apodrece (mais que zero).'); return false; }
        if (Act.podSet(tt, i, q)) toast(q ? `${tokName(tt)}: ${fmt(q)} de ${b.n} apodreceram (ferida permanente).` : `A ferida saiu de ${b.n} de ${tokName(tt)}.`, { action: 'Desfazer', run: Tools.undo });
        if (depois) depois();
      } }],
    });
  }
  /* A janela do Clone: quantas cópias, em que raio e quem é o real (sortear agora, ou o mestre escolhe no mapa). */
  function cloneBox(t, depois) {
    const nIn = h('input', { id: 'cl-n', class: 'in num', type: 'number', min: 1, max: MAX_CLONES, step: 1, value: 3, 'data-focus': '', 'aria-label': 'Quantas cópias' });
    const rIn = h('input', { id: 'cl-r', class: 'in num', type: 'number', min: 1, max: 10, step: 1, value: 2, 'aria-label': 'Raio em quadrados' });
    const op = (v, txt, dica, on) => h('label', { class: 'cl-op', title: dica }, h('input', { type: 'radio', name: 'cl-quem', value: v, id: 'cl-quem-' + v, checked: on }), h('span', { text: txt }));
    const quem = h('div', { class: 'cl-quem', role: 'radiogroup', 'aria-label': 'Quem é o real' },
      op('sortear', 'Sortear agora', 'O site sorteia quem é o real entre ele e as cópias (você vê a coroa)', true),
      op('eu', 'Eu escolho no mapa', 'Depois de criar, clique no clone que vai ser o real', false));
    modal({
      title: 'Clone de ' + tokName(t),
      body: h('div', { class: 'cl-box' },
        note(`As cópias são iguais a ${tokName(t)}: nome, imagem, barras e condições. Os jogadores veem todos iguais; só você vê qual é o real (a coroa).`),
        h('div', { class: 'grid2' }, field('Quantas cópias (1 a ' + MAX_CLONES + ')', nIn), field('Raio, em quadrados (1 a 10)', rIn)),
        field('Quem é o real', quem),
        note('Dano numa cópia: só ela some. Dano no real: todas somem. Quando a condição Clone acaba (ou sai do real), as cópias somem juntas.')),
      actions: [{ label: 'Cancelar' }, { label: 'Criar os clones', kind: 'primary', run: () => {
        const tt = Store.get('tokens', t.id); if (!tt) return;
        const n = clamp(Math.round(parseFloat(nIn.value)) || 3, 1, MAX_CLONES), r = clamp(Math.round(parseFloat(rIn.value)) || 2, 1, 10);
        const sortear = !document.getElementById('cl-quem-eu').checked;
        const res = Act.cloneCriar(tt, n, r, sortear);
        if (!res.n) { toast(`Não há lugar livre a até ${r} ${r === 1 ? 'quadrado' : 'quadrados'} de ${tokName(tt)} para as cópias.`); return false; }
        const falta = n - res.n ? ` (Só couberam ${res.n} no raio.)` : '';
        setSel([{ c: 'tokens', id: tt.id }]);
        if (sortear) toast(`${res.n} ${res.n === 1 ? 'cópia' : 'cópias'} de ${tokName(tt)}. Sorteado: o real é o da coroa (só você vê).${falta}`, { action: 'Desfazer', run: Tools.undo, long: !!falta });
        else { escolhaReal(tt.id); if (falta) toast(falta.trim()); }
        if (depois) depois();
      } }],
    });
  }
  /* (lote 9) A janela do Duplicado: o gêmeo maligno de quem está escolhido (o boss que copia um personagem). As barras
     do gêmeo (cheias, ou como estão agora), entrar na ordem de turnos logo depois dele (quando ele está nela), e o que
     acontece com a ficha (uma cópia só do mestre, ou só o token). */
  function duplicadoBox(t, depois) {
    const nome = tokName(t), sc = Store.scene(), naOrdem = inTurn(sc.turn, t.id);
    const comFicha = !!t.char && Fichas.on() && Fichas.vejoTodas() && !!Fichas.get(t.char);
    const vida = barraDaVida(t.bars), agoraTxt = vida ? `${vida.n} ${fmt(vida.v)} de ${fmt(vida.m)}` : 'como estão';
    const op = (v, txt, dica, on) => h('label', { class: 'cl-op', title: dica }, h('input', { type: 'radio', name: 'dp-barras', value: v, id: 'dp-barras-' + v, checked: on }), h('span', { text: txt }));
    const barras = h('div', { class: 'cl-quem col', role: 'radiogroup', 'aria-label': 'As barras do gêmeo' },
      op('cheias', 'Cheias', 'Todas as barras no máximo, sem sobrevida, sem ferida e sem condições', true),
      op('agora', 'Como estão agora (' + agoraTxt + ')', 'As barras e as condições de agora de ' + nome, false));
    const turno = naOrdem ? h('label', { class: 'cl-op dp-turno' }, h('input', { type: 'checkbox', id: 'dp-turnos', checked: true }), h('span', { text: 'Entrar na ordem de turnos logo depois de ' + nome })) : null;
    modal({
      title: 'Duplicado de ' + nome,
      body: h('div', { class: 'cl-box' },
        note(`O gêmeo nasce ao lado de ${nome}, igual para os jogadores: nome, imagem, tamanho e cor. Só você vê a condição Duplicado.`),
        field('As barras do gêmeo', barras, 'stack'),
        turno,
        note(comFicha ? `A ficha do gêmeo: uma cópia da de ${nome}, só sua, nas Fichas ("${(Fichas.get(t.char).nome || nome)} (gêmeo)"). Mexer nela não mexe na original.`
          : t.char ? 'A ficha não chega até você aqui (precisa da aba Fichas): o gêmeo vai só como token.' : 'Este token não tem ficha: o gêmeo vai só como token.'),
        note('Quando o gêmeo cair (HP 0), um aviso oferece tirá-lo da cena.')),
      actions: [{ label: 'Cancelar' }, { label: 'Criar o gêmeo', kind: 'primary', run: () => {
        const tt = Store.get('tokens', t.id); if (!tt) return;
        const agora = !!(document.getElementById('dp-barras-agora') || {}).checked, tCk = document.getElementById('dp-turnos');
        const r = Act.duplicadoCriar(tt, { barras: agora ? 'agora' : 'cheias', turnos: !!(tCk && tCk.checked) });
        if (r.erro) { toast(r.erro === 'sem lugar' ? `Não há lugar livre perto de ${tokName(tt)} para o gêmeo.` : 'O Duplicado é só para tokens.'); return false; }
        setSel([{ c: 'tokens', id: r.id }]);
        toast(`O gêmeo de ${tokName(tt)} nasceu ao lado dele${r.ficha ? ', com uma ficha só sua nas Fichas' : ''}. Para os jogadores, os dois são iguais.`, { action: 'Desfazer', run: Tools.undo, long: true });
        if (depois) depois();
      } }],
    });
  }
  function dupTexto(t) {
    if (!t.dup) return 'só a marca';
    const o = Store.get('tokens', t.dup);
    return 'gêmeo de ' + (o ? tokName(o) : 'um token que saiu da cena');
  }
  // tirar a condição do gêmeo: ele vira um token comum (continua na cena)
  function tirarMarcaDuplicado(t) {
    const info = Object.assign({}, t.cinfo); delete info.duplicado;
    Store.tx('Tirar a condição Duplicado', () => Store.upd('tokens', t.id, { conds: t.conds.filter(c => c !== 'duplicado'), cinfo: info, dup: null }));
    toast(`A condição Duplicado saiu de ${tokName(t)}: agora é um token comum (continua na cena).`, { action: 'Desfazer', run: Tools.undo });
  }
  // no painel do gêmeo (mestre): de quem ele é cópia, ir até o original e tirar da cena
  function dupSec(t) {
    if (!t.dup || !isGM()) return null;
    const o = Store.get('tokens', t.dup), l = t.char && Fichas.on() ? Fichas.get(t.char) : null;
    return sec('s-dup', 'Duplicado', true,
      note(`Gêmeo de ${o ? tokName(o) : 'um token que saiu da cena'} (só você sabe).${l ? ` Ficha: "${l.nome || 'gêmeo'}" (só sua).` : ' Sem ficha: só o token.'}`),
      h('div', { class: 'row' },
        o ? btn('Ir até o original', () => { const oo = Store.get('tokens', o.id); if (!oo) return; setSel([{ c: 'tokens', id: oo.id }]); const [cx, cy] = centroTok(oo, Store.scene()); Render.centerOn(cx, cy); }, { icon: 'center', id: 'tk-dp-orig' }) : null,
        btn('Tirar da cena', () => { if (Act.duplicadoTirar(t.id)) toast('O gêmeo saiu da cena. A ficha dele continua nas Fichas.', { action: 'Desfazer', run: Tools.undo }); }, { icon: 'trash', id: 'tk-dp-tirar' })));
  }
  // (lote 8) escolher o real no mapa: a faixa de cima pede o clique; Esc (ou "Fica onde está") encerra sem mudar nada
  function escolhaReal(id) { App.escolhaReal = id; renderBanner(); }
  function fimEscolhaReal() { if (!App.escolhaReal) return; App.escolhaReal = null; renderBanner(); }
  function escolherReal(id) {
    const rid = App.escolhaReal; if (!rid) return;
    const t = id ? Store.get('tokens', id) : null;
    if (!t || !(t.id === rid || t.clone === rid)) { toast('Clique num dos clones (ou Esc: o real fica onde está).', { key: 'escolha-real' }); return; }
    fimEscolhaReal();
    if (t.clone) { Act.cloneReal(t); setSel([{ c: 'tokens', id: rid }]); toast('Pronto: o real agora é o da coroa (só você vê).', { action: 'Desfazer', run: Tools.undo }); }
    else { setSel([{ c: 'tokens', id: rid }]); toast('O real fica onde está (a coroa).'); }
  }
  function sortearReal(rid) {
    const r = Act.cloneSortear(rid);
    if (!r) return;
    setSel([{ c: 'tokens', id: r }]);
    toast('Sorteado: o real é o da coroa (só você vê).', { action: 'Desfazer', run: Tools.undo });
  }
  // no painel do token (mestre): o grupo do Clone, com Este é o real, Sortear e Desfazer os clones
  function cloneSec(t) {
    const sc = Store.scene(), rid = t.clone || (realDeClone(t, sc) ? t.id : null);
    if (!rid) return null;
    const real = Store.get('tokens', rid), n = sc.tokens.filter(x => x.clone === rid).length;
    return sec('s-clone', 'Clone', true,
      note(t.clone ? `Cópia de ${real ? tokName(real) : 'um token que saiu da cena'} (só você sabe).` : `Este é o real (a coroa: só você vê). ${n} ${n === 1 ? 'cópia' : 'cópias'}.`),
      h('div', { class: 'row' },
        t.clone ? btn('Este é o real', () => { Act.cloneReal(t); setSel([{ c: 'tokens', id: rid }]); toast('Pronto: o real agora é este (a coroa).', { action: 'Desfazer', run: Tools.undo }); }, { icon: 'real', id: 'tk-cl-real', title: 'O real troca de lugar com esta cópia (os jogadores não notam)' }) : null,
        btn('Sortear o real', () => sortearReal(rid), { icon: 'die', id: 'tk-cl-sortear', title: 'O site sorteia quem é o real entre ele e as cópias' }),
        btn('Desfazer os clones', () => { const k = Act.cloneDesfazer(rid); toast(`Os clones sumiram${k ? ` (${k})` : ''} e a condição saiu de ${real ? tokName(real) : 'quem era o real'}.`, { action: 'Desfazer', run: Tools.undo }); }, { icon: 'trash', id: 'tk-cl-fim' })),
      note('Dano numa cópia: só ela some. Dano no real: todas somem.'));
  }
  function condActive(t, edit, after, idp) {
    const info = t.cinfo || {}, pre = idp || 'cd';
    const list = t.conds.map(id => COND_BY_ID[id]).filter(Boolean);
    if (!list.length) return null;
    if (!edit && !list.some(c => condNum(t, c.id) || (info[c.id] && info[c.id].d))) return h('div', { class: 'chips' }, list.map(c => condChip(c, true, null)));
    const done = () => { if (after) after(); };
    return h('div', { class: 'cact' + (edit ? '' : ' ro') },
      h('div', { class: 'cact-h' }, h('span', { text: 'Ativas' }), h('span', { text: 'Contador' }), h('span', { text: 'Rodadas' }), edit ? h('span') : null),
      list.map(c => {
        const ci = info[c.id] || {}, n = condNum(t, c.id);
        return h('div', { class: 'cact-r' },
          h('span', { class: 'cact-n' }, h('span', { class: 'chip-i', style: { background: c.c } }, icon(c.i, 12)),
            c.r ? h('span', { class: 'cact-tt' }, h('span', { class: 'cact-t', text: c.n + (COND_LADO.has(c.id) && ci.lado ? ' (' + textoLado(ci.lado) + ')' : '') }), h('small', { class: 'chip-de', text: c.r })) : h('span', { class: 'cact-t', text: c.n })),
          // (lote 7) o Escudado: os pontos são a sobrevida do token — mudam na barra, não aqui
          c.id === 'escudado' ? h('span', { class: 'stp-v ro', id: `${pre}-${c.id}-n`, title: 'Os pontos do escudo são a sobrevida do token (mude na barra). Quando ela acaba, o Escudado sai.', text: n ? String(n) : 'sem sobrevida' })
          // (lote 8) a Ferida permanente: o que apodreceu em cada barra (o mestre muda na janela); o Clone: as cópias
          : c.id === 'ferida' ? h('span', { class: 'stp-v ro cact-pod', id: `${pre}-${c.id}-n`, title: 'O que apodreceu na ponta de cada barra: a cura não passa dali até a ferida sair' },
            h('span', { text: podresTexto(t) || 'nenhuma barra' }), edit && isGM() ? h('button', { type: 'button', class: 'lnk', id: `${pre}-${c.id}-mudar`, text: 'Mudar…', onclick: () => feridaBox(t, null, done) }) : null)
          : c.id === 'clone' ? h('span', { class: 'stp-v ro', id: `${pre}-${c.id}-n`, title: isGM() ? 'Só você sabe quem é o real (a coroa)' : 'Os clones são iguais', text: cloneTexto(t) })
          // (lote 9) o Duplicado: de quem o gêmeo é cópia (só o mestre vê a condição)
          : c.id === 'duplicado' ? h('span', { class: 'stp-v ro', id: `${pre}-${c.id}-n`, title: 'Para os jogadores, o gêmeo é igual ao original', text: dupTexto(t) })
          : edit ? h('span', { class: 'stp' },
            h('button', { type: 'button', class: 'stp-b', id: `${pre}-${c.id}-minus`, disabled: !n, title: n === 1 ? 'Tirar 1 (em zero, a condição sai)' : 'Tirar 1', 'aria-label': `Tirar 1 de ${c.n}`, onclick: () => { condStepToast(t, c, -1); done(); } }, icon('minus', 13)),
            h('span', { class: 'stp-v', id: `${pre}-${c.id}-n`, text: n ? String(n) : '–' }),
            h('button', { type: 'button', class: 'stp-b', id: `${pre}-${c.id}-plus`, disabled: !!(c.max && n >= c.max), title: c.max && n >= c.max ? `No máximo (${c.max})` : 'Somar 1' + (c.max ? ` (até ${c.max})` : ''), 'aria-label': `Somar 1 em ${c.n}`, onclick: () => { condStepToast(t, c, 1); done(); } }, icon('plus', 13)))
            : h('span', { class: 'stp-v ro', text: n ? String(n) : '–' }),
          edit ? inCount(`${pre}-${c.id}-d`, ci.d || 0, v => { Act.condSet(t, c.id, { d: v, d0: v }, 'Duração da condição'); done(); },
            { label: `Rodadas de ${c.n}`, title: 'Quantas rodadas dura. Desconta sozinha quando o token termina a vez; em zero, a condição sai. Vazio: sem prazo.' })
            : h('span', { class: 'stp-v ro', text: ci.d ? String(ci.d) : '–' }),
          edit ? iconBtn('x', 'Tirar ' + c.n, () => { if (c.id === 'duplicado') tirarMarcaDuplicado(t); else Act.condToggle([t], c.id); done(); }, { size: 14, cls: 'cact-x', id: `${pre}-${c.id}-x` }) : null);
      }));
  }
  /* Com vários tokens escolhidos (lote 6): as condições ativas em algum deles, com o contador de cada um ("3 · 2") e as
     rodadas, e os botões que mudam em todos de uma vez — −1 e +1 no contador (de quem tem a condição; quem chega a
     zero perde a condição, como num token só) e as mesmas rodadas para todos. Cada clique é um passo de desfazer. */
  function condActiveMulti(toks, after, idp) {
    const pre = idp || 'cm', ids = toks.map(t => t.id);
    const live = () => ids.map(id => Store.get('tokens', id)).filter(Boolean);
    const ts = live(), ativas = CONDS.filter(c => ts.some(t => t.conds.includes(c.id)));
    if (!ativas.length) return null;
    const done = () => { if (after) after(); };
    const quantos = n => n + (n === 1 ? ' token' : ' tokens');
    const lote = (c, op, texto) => { const n = Act.condLote(live(), c.id, op); if (n) toast(texto(n), { action: 'Desfazer', run: Tools.undo }); done(); };
    return h('div', { class: 'cact cmulti', id: pre + '-ativas' },
      h('div', { class: 'cact-h' }, h('span', { text: 'Ativas' }), h('span', { text: 'Contador' }), h('span', { text: 'Rodadas' }), h('span')),
      ativas.map(c => {
        const com = ts.filter(t => t.conds.includes(c.id)), de = (t, k) => ((t.cinfo || {})[c.id] || {})[k] || 0;
        const ns = com.map(t => condNum(t, c.id)), ds = com.map(t => de(t, 'd')), igual = a => a.every(x => x === a[0]), escudo = c.id === 'escudado';
        const qual = com.length === ts.length ? 'em todos' : com.length + ' de ' + ts.length;
        // (valores diferentes: de quanto a quanto; o de cada um fica na dica)
        const faixa = a => { const lo = Math.min(...a), hi = Math.max(...a); return lo === hi ? (lo ? String(lo) : '–') : (lo || '–') + ' a ' + hi; };
        const cada = a => com.map((t, i) => tokName(t) + ': ' + (a[i] || '–')).join(' · ');
        return h('div', { class: 'cact-r' },
          h('span', { class: 'cact-n' }, h('span', { class: 'chip-i', style: { background: c.c } }, icon(c.i, 12)),
            h('span', { class: 'cm-tt' }, h('span', { class: 'cact-t', text: c.n }), h('span', { class: 'cm-q', text: qual }))),
          h('span', { class: 'stp' },
            h('button', { type: 'button', class: 'stp-b', id: `${pre}-${c.id}-minus`, disabled: escudo || !ns.some(n => n > 0), title: escudo ? 'Os pontos do escudo são a sobrevida de cada token' : 'Tirar 1 de cada um (quem chega a zero perde a condição)', 'aria-label': `Tirar 1 de ${c.n} em todos`,
              onclick: () => lote(c, { delta: -1 }, n => `${c.n}: −1 em ${quantos(n)}.`) }, icon('minus', 13)),
            h('span', { class: 'stp-v', id: `${pre}-${c.id}-n`, title: 'O contador de cada um: ' + cada(ns), text: faixa(ns) }),
            h('button', { type: 'button', class: 'stp-b', id: `${pre}-${c.id}-plus`, disabled: escudo, title: escudo ? 'Os pontos do escudo são a sobrevida de cada token' : 'Somar 1 em cada um', 'aria-label': `Somar 1 em ${c.n} em todos`,
              onclick: () => lote(c, { delta: 1 }, n => `${c.n}: +1 em ${quantos(n)}.`) }, icon('plus', 13))),
          inCount(`${pre}-${c.id}-d`, igual(ds) ? ds[0] : 0, v => lote(c, { d: v }, n => `${c.n}: ${v ? v + (v === 1 ? ' rodada' : ' rodadas') : 'sem prazo'} em ${quantos(n)}.`),
            { label: `Rodadas de ${c.n} em todos`, title: (igual(ds) ? '' : 'Agora: ' + cada(ds) + '. ') + 'As mesmas rodadas para todos os que têm a condição. Vazio: sem prazo.' }),
          h('span'));
      }));
  }
  // a chave da postura (lote 6): a etiqueta "Postura" junto do nome, que todos veem
  const postToggle = t => toggle('tk-post', !!t.post, v => Store.tx(v ? 'Postura' : 'Sem postura', () => Store.upd('tokens', t.id, { post: v })), 'Em postura (a etiqueta "Postura" junto do nome)');
  function condPicker(toks) {
    if (!toks.length) return;
    const ids = toks.map(t => t.id);
    const body = h('div', { class: 'cpick' });
    const paint = () => {
      const live = ids.map(id => Store.get('tokens', id)).filter(Boolean);
      const a = document.activeElement, fid = a && a.id && body.contains(a) ? a.id : null;
      body.replaceChildren();
      addKids(body, [
        live.length === 1 ? condActive(live[0], true, null, 'cdm') : condActiveMulti(live, paint, 'cmm'),
        condGrid(live, null, 'cgm'),
        live.length === 1 ? note('O contador só muda nos botões + e −. As rodadas descontam sozinhas quando o token termina a vez.') : null,
      ]);
      if (fid) { const n = document.getElementById(fid); if (n && !n.disabled) n.focus({ preventScroll: true }); }
    };
    paint();
    modal({ title: toks.length > 1 ? `Condições de ${toks.length} tokens` : 'Condições de ' + tokName(toks[0]), body, wide: true, focusPrimary: true, actions: [{ label: 'Pronto', kind: 'primary' }] });
    modalLive = paint;
  }

  /* ---- Barras ---- */
  const PIP_MAX = 12;               // acima disso, os pontos viram barra no mapa e na faixa
  // Bolinhas de uma barra em estilo "pontos". Clicar define o valor; clicar na última cheia tira um.
  function pips(t, b, i, edit, idp) {
    const m = Math.round(b.m), v = Math.round(b.v);
    return h('span', { class: 'pips', role: 'group', 'aria-label': `${b.n}: ${v} de ${m}`, style: { '--c': b.c } }, Array.from({ length: m }, (_, k) => {
      const to = k + 1 === v ? k : k + 1;
      // o valor é lido de novo na hora do clique: a tela pode estar um instante atrasada em relação à cena
      const set = () => { const cur = t.bars[i]; if (cur) Act.barSet(t, i, String(k + 1 === Math.round(cur.v) ? k : k + 1)); };
      return edit
        ? h('button', { type: 'button', class: 'pip' + (k < v ? ' on' : ''), id: idp ? `${idp}${i}-p${k + 1}` : null, title: `${b.n}: deixar em ${to}`, 'aria-label': `${b.n}: deixar em ${to} de ${m}`, onclick: set })
        : h('span', { class: 'pip' + (k < v ? ' on' : '') });
    }));
  }
  function removeBar(t, i) {
    const n = t.bars[i].n;
    for (const k in barOpen) if (k.startsWith(t.id + ':')) delete barOpen[k];
    Act.barDel(t, i);
    toast(`Barra "${n}" removida de ${t.name}.`, { action: 'Desfazer', run: Tools.undo });
  }
  // full: o mestre edita tudo (nome, máximo, estilo, quem vê, criar e remover); o jogador só muda os valores.
  /* (lote 15) O máximo digitado numa barra. Na barra ligada à ficha, o número vai para a ficha (Fichas.maximoParaFicha):
     numa ficha preenchida, pergunta antes de trocar a fórmula pelo número; depois, o aviso com Desfazer. */
  function maxDaBarra(t, i, v) {
    const r = Fichas.on() ? Fichas.maximoParaFicha(t, i, v) : { ok: false, error: null };
    if (!r.ok) { if (r.error) { toast(r.error); renderSide(); } else Act.barPatch(t, i, { m: v }); return; }
    if (r.nada) { renderSide(); return; }
    const vai = () => {
      const f = r.fazer();
      if (!f) { toast('A ficha mudou nesse meio-tempo: o máximo ficou como estava.'); renderSide(); return; }
      toast(`${r.nome} de ${r.dono}: o máximo agora é ${fmt(f.max)}, também na ficha.`, { action: 'Desfazer', run: () => {
        toast(f.desfazer() ? (r.formula ? `Desfeito: o máximo de ${r.nome} voltou para a fórmula da ficha.` : `Desfeito: o máximo de ${r.nome} voltou para ${fmt(r.resultado)}.`)
          : `O máximo de ${r.nome} mudou de novo depois: ficou como está.`);
      } });
    };
    if (!r.formula) { vai(); return; }
    confirmBox(`Trocar a fórmula de ${r.nome}?`,
      (r.soma ? `Na ficha de ${r.dono}, o máximo de ${r.nome} é ${fmt(r.resultado)}: a fórmula “${r.formula}” mais ${fmt(r.soma)} dos itens e da árvore. Com ${fmt(v)}, a fórmula sai da ficha e fica o número ${fmt(r.numero)} (os itens e a árvore continuam somando ${fmt(r.soma)} por cima).`
        : `Na ficha de ${r.dono}, o máximo de ${r.nome} vem da fórmula “${r.formula}”, que dá ${fmt(r.resultado)}. Com ${fmt(v)}, a fórmula sai da ficha e fica o número ${fmt(r.numero)}.`) + ' Dá para desfazer.', 'Trocar pelo número')
      .then(ok => { if (ok) vai(); else renderSide(); });
  }
  function barsEditor(t, full) {
    const rows = [];
    t.bars.forEach((b, i) => {
      if (!full && !b.on) return;
      const key = t.id + ':' + i, open = full && !!barOpen[key], m = Math.round(b.m);
      const xAberta = barX(b) > 0 || !!barXOpen[key];
      const setBars = p => Store.upd('tokens', t.id, { bars: t.bars.map((x, j) => (j === i ? Object.assign({}, x, p) : x)) });
      const val = h('input', {
        id: `tk-b${i}-v`, class: 'in bar-v' + (b.v < 0 ? ' neg' : ''), type: 'text', inputmode: 'decimal', value: b.v, autocomplete: 'off',
        'aria-label': b.n + ' atual', title: 'Digite um valor, ou +5 e -8 para somar e subtrair (-10% tira 10% do máximo)' + (barLo(b) > 0 ? `. Esta barra pode ficar negativa até −${fmt(barLo(b))}.` : ''),
        onchange: e => { if (!Act.barSet(t, i, e.target.value)) e.target.value = b.v; },
      });
      rows.push(h('div', { class: 'bar-row' + (b.on ? '' : ' off') },
        full ? h('input', { type: 'checkbox', id: `tk-b${i}-on`, class: 'ck', checked: b.on, title: 'Usar esta barra', 'aria-label': 'Usar a barra ' + b.n, onchange: e => Act.barPatch(t, i, { on: e.target.checked }) }) : null,
        h('span', { class: 'bar-dot' + (b.k === 'pts' ? ' pt' : ''), style: { background: b.c } }),
        full ? inText(`tk-b${i}-n`, b.n, v => Act.barPatch(t, i, { n: v.trim().slice(0, 24) || b.n }), { class: 'in bar-n', 'aria-label': 'Nome da barra', maxlength: 24 }) : h('span', { class: 'bar-n ro', text: b.n }),
        val, h('span', { class: 'bar-sl', text: '/' }),
        full ? inNum(`tk-b${i}-m`, b.m, v => maxDaBarra(t, i, v), { min: 0, label: b.n + ' máximo', title: b.ref && t.char && !t.clone && Fichas.on() ? 'O máximo vem da ficha: mudar aqui muda também a ficha' : undefined }) : h('span', { class: 'bar-m', text: fmt(b.m) }),
        b.on ? iconBtn('shield', (xAberta ? 'Sobrevida de ' : 'Dar sobrevida a ') + b.n, () => { barXOpen[key] = !xAberta; renderSide(); if (!xAberta) { const n = document.getElementById(`tk-b${i}-x`); if (n) n.focus(); } }, { size: 16, cls: 'bar-more bar-xb' + (barX(b) > 0 ? ' tem' : ''), on: xAberta, id: `tk-b${i}-xb` }) : null,
        full ? iconBtn('more', 'Opções da barra ' + b.n, () => { barOpen[key] = !barOpen[key]; renderSide(); }, { size: 16, cls: 'bar-more', on: open, id: `tk-b${i}-more` }) : null));
      if (b.k === 'pts' && b.on && m >= 1 && m <= 20) rows.push(h('div', { class: 'bar-pips' + (full ? ' full' : '') }, pips(t, b, i, true, 'tk-b')));
      if (xAberta && b.on) rows.push(h('div', { class: 'bar-x' + (full ? ' full' : '') },
        h('span', { class: 'bar-x-l', text: 'Sobrevida' }),
        // depois de digitado, quem mantém o campo aberto é a própria sobrevida: quando ela acabar, o campo fecha
        inNum(`tk-b${i}-x`, barX(b), v => { delete barXOpen[key]; if (!Act.barExtra(t, i, v)) renderSide(); }, { min: 0, step: 1, label: 'Sobrevida de ' + b.n, title: 'Pontos por cima da barra: o dano gasta a sobrevida antes de chegar em ' + b.n }),
        h('span', { class: 'bar-x-n', text: 'leva o dano antes' })));
      // (lote 8) a ferida permanente: a ponta podre e o teto da cura
      if (barPod(b) > 0 && b.on) rows.push(h('div', { class: 'bar-x bar-pod' + (full ? ' full' : ''), id: `tk-b${i}-pod` },
        h('span', { class: 'bar-x-l', text: 'Ferida' }),
        h('span', { class: 'bar-pod-t', text: `${fmt(barPod(b))} apodrecidos: a cura não passa de ${fmtV(barTeto(b))}` }),
        full && isGM() ? h('button', { type: 'button', class: 'lnk', id: `tk-b${i}-podm`, text: 'Mudar…', onclick: () => feridaBox(t, i) }) : null));
      if (open) rows.push(h('div', { class: 'bar-opt' },
        field('Cor', inColor(`tk-b${i}-c`, b.c, v => setBars({ c: v }), 'Cor da barra ' + b.n)),
        field('Estilo', seg(`tk-b${i}-k`, b.k, [['bar', 'Barra'], ['pts', 'Pontos', null, 'Uma bolinha por ponto: bom para recursos pequenos, como cargas e usos']], v => Act.barPatch(t, i, { k: v }))),
        field('Os outros veem', inSelect(`tk-b${i}-vis`, b.vis || '', [['', 'O mesmo que o token'], ['num', 'Números'], ['bar', 'Só a barra'], ['none', 'Nada']], v => Act.barPatch(t, i, { vis: v }), { title: 'O que vê desta barra quem não é dono do token' })),
        // (lote 15) a barra que só aparece no token com o mouse por cima (as especiais da ficha começam assim)
        field('No mapa', inSelect(`tk-b${i}-mapa`, barMapa(b), [['sempre', 'Sempre no token'], ['passar', 'Só ao passar o mouse ou selecionar']], v => Act.barPatch(t, i, { mapa: v }), { title: 'Quando esta barra aparece em cima do token, no mapa (o painel e a faixa de baixo mostram sempre)' })),
        b.ref ? (barLo(b) > 0 || b.st != null ? note((barLo(b) > 0 ? `Pode ficar negativa até −${fmt(barLo(b))}. ` : '') + (b.st != null ? `Começa em ${fmtV(b.st)}: a cura total leva para lá. ` : '') + 'Isso vem da ficha (Opções da barra).') : null)
          : field('Negativa até −', inNum(`tk-b${i}-lo`, barLo(b), v => Act.barPatch(t, i, { lo: Math.max(0, Math.round((Number(v) || 0) * 10) / 10), v: Math.max(-Math.max(0, Number(v) || 0), b.v) }), { min: 0, step: 1, label: `Até quanto abaixo de zero ${b.n} pode ir`, title: 'Zero: a barra para em zero. Com um valor, ela pode ficar negativa até esse tanto (a parte negativa aparece riscada).' })),
        b.k === 'pts' && m > PIP_MAX ? note(`No mapa, os pontos aparecem como barra quando o máximo passa de ${PIP_MAX}.`) : null,
        h('div', { class: 'row' }, btn('Remover barra', () => removeBar(t, i), { icon: 'trash', kind: 'danger small', id: `tk-b${i}-del` }))));
    });
    return [
      rows.length ? h('div', { class: 'bars' }, rows) : note(full ? 'Este token não tem barras.' : 'Este token não tem barras ligadas.'),
      full ? h('div', { class: 'row' },
        btn('Adicionar barra', () => { if (Act.barAdd(t)) barOpen[t.id + ':' + (t.bars.length - 1)] = true; }, { icon: 'plus', id: 'tk-baradd', disabled: t.bars.length >= MAX_BARS, title: t.bars.length >= MAX_BARS ? `Cada token tem até ${MAX_BARS} barras` : 'Cria uma barra só neste token' }),
        btn('Barras padrão…', () => barDefaultsBox(t), { id: 'tk-bardef', title: 'As barras com que todo token novo nasce' })) : null,
    ];
  }
  function barsReadOnly(t) {
    const rows = barsShown(t);
    if (!rows.length) return note('O mestre não mostra as barras deste token.');
    return h('div', { class: 'bars' }, rows.map(({ b, i, mode }) => h('div', { class: 'bar-ro' },
      h('span', { class: 'bar-n ro', text: b.n }),
      b.k === 'pts' && mode === 'num' && Math.round(b.m) <= 20 ? pips(t, b, i, false)
        : h('span', { class: 'meter' }, barNeg(b) > 0 ? h('span', { class: 'meter-f neg', style: { width: clamp(barNeg(b) * 100, 4, 100) + '%' } })
          : h('span', { class: 'meter-f', style: { width: clamp(b.v / b.m * 100, 0, 100) + '%', background: b.c } }),
          barPod(b) > 0 ? h('span', { class: 'meter-p', title: 'Ferida permanente: a ponta apodrecida', style: { width: clamp(barPod(b) / b.m * 100, 3, 100) + '%' } }) : null),       // (lote 8)
      mode === 'num' ? h('span', { class: 'bar-m' + (b.v < 0 ? ' neg' : ''), text: `${fmtV(b.v)}/${fmt(b.m)}` + (barX(b) > 0 ? ` +${fmt(barX(b))}` : '') }) : null)));
  }

  /* Barras padrão: a lista com que todo token novo nasce (vale para a mesa inteira). */
  function barDefaultsBox(fromTok) {
    let list = barDefaults();
    const body = h('div', { class: 'bd' });
    const addMissing = h('input', { type: 'checkbox', id: 'bd-add', class: 'ck' });
    const nextColor = () => BAR_COLORS.find(c => !list.some(b => b.c === c)) || BAR_COLORS[list.length % BAR_COLORS.length];
    const paint = () => {
      body.replaceChildren();
      addKids(body, [
        h('div', { class: 'bd-list' },
          h('div', { class: 'bd-row bd-h' }, h('span', { title: 'Já nasce ligada no token novo', text: 'Ligada' }), h('span', { text: 'Cor' }), h('span', { text: 'Nome' }), h('span', { text: 'Máximo' }), h('span', { text: 'Estilo' }), h('span')),
          list.map((b, i) => h('div', { class: 'bd-row' },
          h('input', { type: 'checkbox', class: 'ck', id: `bd-${i}-on`, checked: b.on, title: 'Já nasce ligada', 'aria-label': `${b.n} já nasce ligada`, onchange: e => { b.on = e.target.checked; } }),
          h('input', { type: 'color', class: 'in color', id: `bd-${i}-c`, value: b.c, 'aria-label': 'Cor de ' + b.n, title: 'Cor', oninput: e => { b.c = e.target.value; } }),
          h('input', { type: 'text', class: 'in bar-n', id: `bd-${i}-n`, value: b.n, maxlength: 24, autocomplete: 'off', 'aria-label': 'Nome da barra', oninput: e => { b.n = e.target.value; } }),
          h('input', { type: 'number', class: 'in num', id: `bd-${i}-m`, value: b.m, min: 0, step: 1, 'aria-label': 'Máximo de ' + b.n, title: 'Máximo (o token novo já começa cheio)', oninput: e => { const v = parseFloat(e.target.value); if (isFinite(v) && v >= 0) { b.m = v; b.v = v; } } }),
          seg(`bd-${i}-k`, b.k, [['bar', 'Barra'], ['pts', 'Pontos']], v => { b.k = v; paint(); }),
          iconBtn('trash', 'Tirar da lista', () => { list.splice(i, 1); paint(); }, { size: 15, disabled: list.length <= 1, id: `bd-${i}-del` })))),
        h('div', { class: 'row' },
          btn('Adicionar barra', () => { list.push(cleanBar({ n: 'Barra ' + (list.length + 1), c: nextColor(), v: 10, m: 10, on: true })); paint(); const n = document.getElementById(`bd-${list.length - 1}-n`); if (n) { n.focus(); n.select(); } }, { icon: 'plus', id: 'bd-new', disabled: list.length >= MAX_BARS }),
          fromTok && fromTok.bars.length ? btn('Copiar de ' + fromTok.name, () => { list = fromTok.bars.map(b => cleanBar(Object.assign({}, b, { v: b.m }))); paint(); }, { id: 'bd-copy' }) : null,
          btn('Voltar ao original', () => { list = BAR_DEFAULTS.map(cleanBar); paint(); }, { id: 'bd-reset' })),
        h('label', { class: 'o-ck bd-ck' }, addMissing, h('span', { text: 'Acrescentar as que faltam aos tokens desta cena' })),
        note('"Ligada" diz se a barra já nasce em uso no token novo. A lista vale para os tokens criados daqui em diante; os que já existem só mudam se você marcar a opção acima, e nada é apagado deles.'),
      ]);
    };
    paint();
    modal({
      title: 'Barras padrão', text: 'Todo token novo nasce com estas barras. Em cada token, você ainda pode criar, mudar e remover as dele.', wide: true, focusPrimary: true, body,
      actions: [{ label: 'Cancelar' }, {
        label: 'Salvar', kind: 'primary', run: () => {
          const clean = list.slice(0, MAX_BARS).map(b => cleanBar(Object.assign({}, b, { n: String(b.n || '').trim() || 'Barra' })));
          Store.S.prefs.barDefaults = clean;
          Persist.meta();
          let n = 0;
          if (addMissing.checked) {
            Store.tx('Acrescentar barras padrão', () => {
              for (const t of Store.scene().tokens) {
                const miss = clean.filter(d => !t.bars.some(b => b.n === d.n)).slice(0, Math.max(0, MAX_BARS - t.bars.length));
                if (miss.length) { Store.upd('tokens', t.id, { bars: t.bars.concat(miss.map(cleanBar)) }); n++; }
              }
            });
          }
          toast('Barras padrão salvas.' + (n ? ` ${n} ${n === 1 ? 'token recebeu' : 'tokens receberam'} as que faltavam.` : ''), n ? { action: 'Desfazer', run: Tools.undo } : null);
        },
      }],
    });
  }

  /* Dano, cura e condição em vários tokens de uma vez: quem está dentro de um efeito, de uma aura ou na seleção. */
  // fx: o efeito de onde a janela foi aberta. Ao aplicar, a configuração fica guardada nele (para o Reaplicar),
  // e na próxima vez a janela já abre com ela.
  function areaBox(title, toks, skipId, fx, opt) {
    if (!toks.length) { toast('Não há nenhum token dentro dessa área.'); return; }
    const last = fx && fx.apply ? fx.apply : null;
    const rows = toks.map(t => ({ t, on: last ? !last.skip.includes(t.id) : t.id !== skipId, half: false }));
    const names = [];
    for (const t of toks) for (const b of t.bars) if (b.on && !names.includes(b.n)) names.push(b.n);
    const selBar = h('select', { id: 'ar-bar', class: 'in' }, names.map(n => h('option', { value: n, text: n })));
    const amt = h('input', { id: 'ar-amt', class: 'in bar-v', type: 'text', inputmode: 'decimal', placeholder: '12', autocomplete: 'off', 'data-focus': '', 'aria-label': 'Quanto tirar ou devolver' });
    const selCond = h('select', { id: 'ar-cond', class: 'in' }, h('option', { value: '', text: 'Nenhuma' }),
      COND_TAGS.map(g => h('optgroup', { label: g.t }, CONDS.filter(c => c.g === g.id && !COND_JANELA.has(c.id)).map(c => h('option', { value: c.id, text: c.n })))));
    const mk = (id, label) => h('input', { id, type: 'number', class: 'in num', min: 0, max: 99, step: 1, placeholder: '–', 'aria-label': label, disabled: true });
    const cn = mk('ar-cn', 'Somar ao contador'), cd = mk('ar-cd', 'Duração em rodadas');
    const int = el => clamp(Math.round(parseFloat(el.value) || 0), 0, 99);
    const list = h('ul', { class: 'area-list' }), count = h('span', { class: 'area-count' });
    const paint = () => {
      const a = areaAmount(amt.value), name = selBar.value;
      count.textContent = `${rows.filter(r => r.on).length} de ${rows.length} marcados`;
      list.replaceChildren(...rows.map((r, k) => {
        const b = r.t.bars.find(x => x.on && x.n === name);
        let res = '';
        if (!r.on) res = 'fica de fora';
        else if (!names.length) res = '';
        else if (!b) res = 'sem ' + name;
        else if (a) { const q = barAfter(b, areaDelta(a, r.half)); res = `${fmt(b.v)} → ${fmt(q.v)}` + (q.x !== undefined ? ` · sobrevida ${fmt(barX(b))} → ${fmt(q.x)}` : ''); }
        else res = `${fmt(b.v)}/${fmt(b.m)}`;
        return h('li', { class: 'area-row' + (r.on ? '' : ' off') },
          h('label', { class: 'area-who' },
            h('input', { type: 'checkbox', class: 'ck', id: `ar-on-${k}`, checked: r.on, 'aria-label': 'Incluir ' + r.t.name, onchange: e => { r.on = e.target.checked; paint(); document.getElementById(`ar-on-${k}`).focus(); } }),
            tokenAvatar(r.t, 26), h('span', { class: 'area-n', text: r.t.name + (r.t.hidden ? ' (oculto)' : '') })),
          h('span', { class: 'area-res', text: res }),
          h('button', { type: 'button', class: 'area-half' + (r.half ? ' on' : ''), id: `ar-half-${k}`, disabled: !r.on, 'aria-pressed': String(r.half), title: 'Metade (arredonda para baixo)', 'aria-label': `Metade para ${r.t.name}`, text: '½', onclick: () => { r.half = !r.half; paint(); document.getElementById(`ar-half-${k}`).focus(); } }));
      }));
    };
    amt.addEventListener('input', paint);
    selBar.addEventListener('change', paint);
    selCond.addEventListener('change', () => { cn.disabled = cd.disabled = !selCond.value; });
    const all = on => { rows.forEach(r => { r.on = on; }); paint(); };
    if (last) {
      if (names.includes(last.bar)) selBar.value = last.bar;
      amt.value = last.amt;
      if (last.cond) { selCond.value = last.cond.id; cn.disabled = cd.disabled = !selCond.value; cn.value = last.cond.n || ''; cd.value = last.cond.d || ''; }
    }
    // a primeira vez numa zona: a condição que combina com ela fica sugerida, num botão (nada vem escolhido sozinho)
    const sugId = (opt && opt.sug) || (fx && (FX.P[fx.fx] || {}).sug), sug = !last && sugId && COND_BY_ID[sugId] ? COND_BY_ID[sugId] : null;     // (a combinação diz a dela)
    const sugBtn = sug ? btn('Sugestão: ' + sug.n, () => { selCond.value = sug.id; cn.disabled = cd.disabled = false; selCond.focus(); }, { kind: 'small', icon: 'plus', id: 'ar-sug', title: 'A condição que combina com ' + (FX.P[fx.fx] || {}).n + '. Um clique escolhe; dá para trocar ou tirar.' }) : null;
    paint();
    modal({
      title, wide: true,
      body: h('div', { class: 'area' },
        names.length ? h('div', { class: 'area-top' }, field('Barra', selBar, 'stack'), field('Quanto', amt, 'stack')) : note('Nenhum destes tokens tem barra ligada; dá para aplicar só a condição.'),
        names.length && Luta.podeAtaque() ? h('div', { class: 'row' }, btn('Descontar a defesa de cada um…', () => Luta.ataque(toks, { titulo: title, dano: amt.value, barra: selBar.value, fora: rows.filter(r => !r.on).map(r => r.t.id) }), { icon: 'shield', kind: 'small', id: 'ar-defesa', title: 'Abre o ataque com defesa para estes mesmos tokens: cada um desconta a defesa que você escolher' })) : null,
        names.length ? note('Sem sinal, o número é tirado (dano). Com +, é devolvido (cura). O botão ½ aplica a metade, para quem resistiu.') : null,
        h('div', { class: 'area-bar' }, count, h('span', { class: 'spacer' }), btn('Todos', () => all(true), { kind: 'small' }), btn('Nenhum', () => all(false), { kind: 'small' })),
        list,
        h('div', { class: 'grid3 area-cond' }, field('Condição', selCond, 'stack'), field('Contador +', cn, 'stack'), field('Rodadas', cd, 'stack')),
        sugBtn ? h('div', { class: 'row' }, sugBtn) : null,
        note('A condição é opcional. O contador soma ao que o token já tem; as rodadas dão um prazo, descontado na ordem de turnos.')),
      actions: [{ label: 'Cancelar' }, {
        label: 'Aplicar', kind: 'primary', run: () => {
          const picked = rows.filter(r => r.on);
          if (!picked.length) { toast('Marque pelo menos um token.'); return false; }
          const a = names.length ? areaAmount(amt.value) : 0;
          if (a == null) { toast('Em "Quanto", digite um número, como 12 ou +8.'); amt.focus(); return false; }
          const cond = selCond.value ? { id: selCond.value, n: int(cn), d: int(cd) } : null;
          if (!a && !cond) { toast('Digite quanto tirar ou devolver, ou escolha uma condição.'); amt.focus(); return false; }
          const keep = fx ? { id: fx.id, skip: rows.filter(r => !r.on).map(r => r.t.id) } : null;
          const n = Act.areaApply(picked, names.length ? selBar.value : '', names.length ? amt.value : '', cond, keep);
          if (n > 0) toast(`Aplicado em ${n} ${n === 1 ? 'token' : 'tokens'}.`, { action: 'Desfazer', run: Tools.undo });
          else toast('Nada mudou: os tokens marcados já estavam assim.');
        },
      }],
    });
  }
  /* Sobrevida em grupo: a barra e quanto; cada um fica com a maior (a sobrevida que já tinha ou esta — não soma).
     A lista mostra o que vai acontecer com cada um antes de aplicar. */
  function sobreBox(toks, title) {
    const names = [];
    for (const t of toks) for (const b of t.bars) if (b.on && b.m > 0 && !names.includes(b.n)) names.push(b.n);
    if (!names.length) { toast('Nenhum destes tokens tem barra ligada.'); return; }
    const rows = toks.map(t => ({ t, on: true }));
    const selBar = h('select', { id: 'sb-bar', class: 'in' }, names.map(n => h('option', { value: n, text: n })));
    const amt = h('input', { id: 'sb-amt', class: 'in num', type: 'number', min: 1, max: 99999, step: 1, placeholder: '10', autocomplete: 'off', 'data-focus': '', 'aria-label': 'Quanto de sobrevida' });
    const list = h('ul', { class: 'area-list', id: 'sb-list' }), count = h('span', { class: 'area-count' });
    const quanto = () => Math.max(0, Math.round((Number(amt.value) || 0) * 10) / 10);
    const paint = () => {
      const x = quanto(), name = selBar.value;
      count.textContent = `${rows.filter(r => r.on).length} de ${rows.length} marcados`;
      list.replaceChildren(...rows.map((r, k) => {
        const b = r.t.bars.find(y => y.on && y.m > 0 && y.n === name), tem = b ? barX(b) : 0;
        const res = !r.on ? 'fica de fora' : !b ? 'sem ' + name : !(x > 0) ? (tem ? `tem ${fmt(tem)}` : 'sem sobrevida') : tem >= x ? `fica com ${fmt(tem)} (já tem mais)` : `${fmt(tem)} → ${fmt(x)}`;
        return h('li', { class: 'area-row' + (r.on ? '' : ' off') },
          h('label', { class: 'area-who' },
            h('input', { type: 'checkbox', class: 'ck', id: `sb-on-${k}`, checked: r.on, 'aria-label': 'Incluir ' + r.t.name, onchange: e => { r.on = e.target.checked; paint(); document.getElementById(`sb-on-${k}`).focus(); } }),
            tokenAvatar(r.t, 26), h('span', { class: 'area-n', text: r.t.name + (r.t.hidden ? ' (oculto)' : '') })),
          h('span', { class: 'area-res', text: res }));
      }));
    };
    amt.addEventListener('input', paint);
    selBar.addEventListener('change', paint);
    const all = on => { rows.forEach(r => { r.on = on; }); paint(); };
    paint();
    modal({
      title, wide: true,
      body: h('div', { class: 'area' },
        h('div', { class: 'area-top' }, field('Barra', selBar, 'stack'), field('Sobrevida', amt, 'stack')),
        note('Pontos por cima da barra: o dano gasta a sobrevida antes. Cada um fica com a maior — a que já tinha ou esta; não soma.'),
        h('div', { class: 'area-bar' }, count, h('span', { class: 'spacer' }), btn('Todos', () => all(true), { kind: 'small' }), btn('Nenhum', () => all(false), { kind: 'small' })),
        list),
      actions: [{ label: 'Cancelar' }, {
        label: 'Dar sobrevida', kind: 'primary', run: () => {
          const picked = rows.filter(r => r.on).map(r => Store.get('tokens', r.t.id)).filter(Boolean);
          if (!picked.length) { toast('Marque pelo menos um token.'); return false; }
          if (!(quanto() > 0)) { toast('Em "Sobrevida", digite quanto dar, como 10.'); amt.focus(); return false; }
          const n = Act.groupExtra(picked, selBar.value, quanto());
          if (n > 0) toast(`Sobrevida ${fmt(quanto())} em ${n} ${n === 1 ? 'token' : 'tokens'}.`, { action: 'Desfazer', run: Tools.undo });
          else toast('Nada mudou: os marcados já tinham essa sobrevida ou mais.');
        },
      }],
    });
  }
  const isTargeted = toks => { const sc = Store.scene(), me = App.viewer; return toks.length > 0 && toks.every(t => sc.targets.some(x => x.by === me && x.t === t.id)); };

  function auraEditor(t) {
    const setA = (i, p, label) => Store.tx(label || 'Editar aura', () => Store.upd('tokens', t.id, { auras: t.auras.map((a, j) => (j === i ? Object.assign({}, a, p) : a)) }));
    const liveA = (i, p) => Store.upd('tokens', t.id, { auras: t.auras.map((a, j) => (j === i ? Object.assign({}, a, p) : a)) });
    return [
      t.auras.map((a, i) => h('div', { class: 'card' },
        h('div', { class: 'card-h' },
          seg(`au${i}-k`, a.k, [['circ', 'Círculo'], ['quad', 'Quadrado'], ['cone', 'Cone']], v => setA(i, { k: v })),
          iconBtn('trash', 'Remover aura', () => Store.tx('Remover aura', () => Store.upd('tokens', t.id, { auras: t.auras.filter((_, j) => j !== i) })), { size: 16 })),
        h('div', { class: 'grid2' },
          field('Raio (q)', inNum(`au${i}-r`, a.r, v => setA(i, { r: v }), { min: 0.5, max: 60, step: 0.5 })),
          field('Cor', inColor(`au${i}-c`, a.c, v => liveA(i, { c: v }), 'Cor da aura')),
          a.k === 'cone' ? field('Abertura (°)', inNum(`au${i}-a`, a.ang, v => setA(i, { ang: v }), { min: 10, max: 340, step: 5 })) : null,
          a.k === 'cone' ? field('Direção (°)', inNum(`au${i}-d`, Math.round(a.dir), v => setA(i, { dir: ((v % 360) + 360) % 360 }), { min: -360, max: 720, step: 15 })) : null),
        field('Opacidade', inRange(`au${i}-o`, a.a, 0.05, 0.8, 0.05, v => liveA(i, { a: v }), 'Opacidade da aura')),
        isGM() ? toggle(`au${i}-p`, a.pub, v => setA(i, { pub: v }), 'Jogadores veem esta aura') : null,
        isGM() ? h('div', { class: 'row' }, btn('Aplicar a quem está dentro…', () => { const sc = Store.scene(), cur = t.auras.find(x => x.id === a.id) || t.auras[i]; if (cur) areaBox('Aura de ' + t.name, tokensIn(auraShape(t, cur, sc), sc), t.id); }, { icon: 'area', kind: 'small', id: `au${i}-apply`, title: 'Dano, cura ou condição em todos os tokens dentro desta aura' })) : null)),
      btn('Adicionar aura', () => Store.tx('Adicionar aura', () => Store.upd('tokens', t.id, { auras: t.auras.concat({ id: uid('au'), k: 'circ', r: 2, c: '#e6ab4f', a: 0.2, ang: 60, dir: 0, pub: true }) })), { icon: 'plus' }),
      t.auras.some(a => a.k === 'cone') ? note('Com o token selecionado, arraste a bolinha na ponta do cone para girar e esticar.') : null,
    ];
  }

  function imageField(t) {
    const a = t.img ? Store.S.assets[t.img] : null;
    const daFicha = !!(a && t.imgChar && t.char);         // a imagem veio da ficha do personagem (e acompanha a de lá)
    const others = Object.values(Store.S.assets).filter(x => x.kind === 'token' && x.id !== t.img).slice(0, 12);
    return h('div', { class: 'field stack' }, h('span', { class: 'lb', text: 'Imagem' }),
      h('div', { class: 'row' },
        btn(a ? 'Trocar' : 'Escolher imagem', () => pickImage(f => setTokenImage(t, f[0])), { icon: 'image' }),
        a && !daFicha ? btn('Remover', () => Store.tx('Remover imagem', () => Store.upd('tokens', t.id, { img: null, imgChar: false }))) : null),
      daFicha ? note('É a imagem da ficha do personagem. Trocar aqui vale só para este token.') : null,
      others.length ? h('div', { class: 'thumbs' }, others.map(x => h('button', { type: 'button', class: 'thumb', title: 'Usar ' + (x.name || 'esta imagem'), 'aria-label': 'Usar ' + (x.name || 'esta imagem'), style: { backgroundImage: `url("${x.url}")` }, onclick: () => Store.tx('Imagem do token', () => Store.upd('tokens', t.id, { img: x.id, imgChar: false })) }))) : null);
  }

  /* Token ligado à ficha de um personagem da mesa (só dentro do site, com mesa aberta; ver 07b-fichas.js). */
  function fichaBox(t) {
    // (lote 23) quem está no Toldo não aparece na lista (só o que já está ligado a este token)
    const lista = Fichas.chars().filter(c => !(c.estado && c.estado.toldo) || c.id === t.char), ligado = t.char ? Fichas.get(t.char) : null;
    // (a ficha ligada pode não chegar a quem olha: o mestre auxiliar sem a aba Fichas não recebe as escondidas)
    const escondida = Fichas.escondida(t);
    const out = [field('Personagem', inSelect('tk-char', t.char || '', [['', 'Sem ficha']].concat(lista.map(c => [c.id, Fichas.rotulo(c)])).concat(t.char && !ligado ? [[t.char, escondida ? '(ficha escondida)' : '(ficha que saiu da mesa)']] : []),
      v => {
        const r = Fichas.link(t, v || null), c = v ? Fichas.get(v) : null;
        toast(c ? `O token agora segue a ficha de ${c.nome || 'sem nome'}: o nome e as barras vieram dela.` + (r.dono ? ` O dono do token passou a ser ${r.dono}, que é o dono da ficha.` : '') : `${t.name} não segue mais nenhuma ficha.`, { action: 'Desfazer', run: Tools.undo });
      }))];
    if (!t.char) { out.push(note(lista.length ? 'Ligado a uma ficha, o token passa a ter o nome do personagem, as barras dela (HP, SP…) no lugar das que tinha, e a iniciativa.' : 'Esta mesa ainda não tem fichas. Crie na aba Fichas.')); return out; }
    if (!ligado) {
      out.push(note(escondida ? 'Este token segue uma ficha que o mestre esconde dos jogadores, e ela só chega a quem mestra a aba Fichas. Deixe-o ligado: o dano e a cura que você der nas barras dele vão para a ficha mesmo assim.'
        : 'A ficha ligada não está mais na mesa. Escolha outra ou "Sem ficha".'));
      return out;
    }
    const itens = Fichas.rolaveis(t);
    if (!itens.some(x => x[0] === App.opt.fichaAtr)) App.opt.fichaAtr = itens[0][0];
    const fixa0 = Luta.fixaAtual(t);
    // um token ligado antes (ou que ganhou uma barra à mão) pode ter barras que não são da ficha: um clique acerta
    if (Fichas.foraDaFicha(t)) out.push(
      note('Este token tem barras que não vêm da ficha (ou falta alguma dela).'),
      h('div', { class: 'row' }, btn('Usar só as barras da ficha', () => { if (Fichas.usarBarras(t)) toast('O token ficou só com as barras da ficha.', { action: 'Desfazer', run: Tools.undo }); }, { id: 'tk-so-ficha' })));
    out.push(
      note('As barras ligadas à ficha (HP, SP…) e a iniciativa vêm dela. Dano e cura dados aqui no mapa voltam para a ficha. Dois cliques no token abrem a ficha.'),
      field('Rolar atributo', inSelect('tk-atr', App.opt.fichaAtr, itens.map(x => [x[0], `${x[1]} · ${x[2]}`]), v => { App.opt.fichaAtr = v; })),
      field('Fixando', inNum('tk-fixa', fixa0, v => { Luta.guardarFixa(t, v); }, { min: 0, step: 1, label: 'Quanto fixar', title: 'Regra da fixa: rola um dado de (atributo − fixa) lados e soma a fixa' })),
      h('div', { class: 'row' }, btn('Rolar', () => {
        const r = Fichas.rolar(t, App.opt.fichaAtr, Luta.fixaAtual(t));
        toast(r.ok ? `${t.name} · ${r.nome}: ${r.total}` + (r.die ? ` (${r.dieValue} no d${r.die}${r.fixa ? ' + ' + r.fixa : ''})` : ' (fixa total)') : r.error);
      }, { icon: 'die', id: 'tk-rolar' })));
    out.push(...bagResumo(t));
    return out;
  }

  /* A bolsa do personagem deste token: as poções, bombas, runas, munições e materiais da ficha dele.
     A poção que faz alguma coisa mostra antes o que vai acontecer ("Usar agora"); os outros itens só gastam uma
     unidade. A poção pode ir para outro token da cena ("Em quem"): um aliado, um NPC, um token sem ficha. Tudo avisa a
     mesa ao vivo e dá para desfazer (o jogador, no token de outro, pede ao mestre — que aplica em seguida). */
  function bagBox(t) {
    const tid = t.id, R = window.TC.rules;
    let pede = null, emId = tid;
    const body = h('div', { class: 'bag' });
    const alvoAgora = () => { const a = Store.get('tokens', emId); return a && !a.prop ? a : Store.get('tokens', tid); };
    const doUse = (tk, it) => {
      pede = null;
      const alvo = alvoAgora(), r = Fichas.usar(tk, it.id, alvo && alvo.id !== tk.id ? alvo : null);
      if (!r.ok) { toast(r.error); paint(); return; }
      if (r.pedido) toast(r.texto + '.');
      else toast(r.texto + '.', { action: 'Desfazer', run: () => { if (r.desfazer()) toast(`Desfeito: ${it.nome || 'o item'} voltou para a bolsa.`); if (modalEl && modalLive) modalLive(); } });
      paint();
    };
    const use = (tk, it) => {
      const alvo = alvoAgora();
      if (!Fichas.previaUso(tk, it.id, alvo && alvo.id !== tk.id ? alvo : null).length && (!alvo || alvo.id === tk.id)) { doUse(tk, it); return; }      // nada é aplicado sozinho: um clique gasta e avisa
      pede = it.id; paint();
      const n = document.getElementById('bag-ok-' + it.id); if (n) n.focus();
    };
    // em quem: este token (o de quem tem a bolsa) ou outro da cena — os que quem usa vê, os marcados na mira primeiro
    const quemPode = () => {
      const sc = Store.scene(), mira = new Set(sc.targets.filter(x => x.by === App.viewer).map(x => x.t));
      return sc.tokens.filter(x => !x.prop && x.id !== tid && tokShown(x, sc)).sort((a, b) => (mira.has(b.id) - mira.has(a.id)) || tokName(a).localeCompare(tokName(b), 'pt-BR'));
    };
    function paint() {
      const tk = Store.get('tokens', tid), itens = tk ? Fichas.bolsa(tk) : null;
      const a = document.activeElement, fid = a && a.id && body.contains(a) ? a.id : null;
      body.replaceChildren();
      if (!itens) { addKids(body, [note('Este token não dá mais acesso a uma bolsa.')]); return; }
      if (!itens.length) { addKids(body, [note('A bolsa está vazia. Os itens são cadastrados na ficha do personagem, em Bolsas.')]); return; }
      const outros = quemPode();
      if (!outros.some(x => x.id === emId)) emId = tid;
      const alvo = alvoAgora(), emOutro = !!alvo && alvo.id !== tid;
      if (outros.length) addKids(body, [h('div', { class: 'bag-em' },
        field('Em quem', inSelect('bag-em', emId, [[tid, tokName(tk) + ' (quem tem a bolsa)']].concat(outros.map(x => [x.id, tokName(x)])), v => { emId = v; pede = null; paint(); }), 'row'),
        emOutro && !isGM() ? note('No token de outro, o mestre aplica (em seguida, com a cena no ar).') : null)]);
      addKids(body, R.BOLSAS.map(b => {
        const lista = itens.filter(x => x.t === b.t);
        if (!lista.length) return null;
        return h('div', { class: 'bag-g' }, h('div', { class: 'bag-h', text: b.nome }), lista.map(it => {
          const previa = pede === it.id && it.qtd > 0 ? Fichas.previaUso(tk, it.id, emOutro ? alvo : null) : null, resta = it.qtd - 1;
          return h('div', { class: 'bag-r' + (it.qtd ? '' : ' sem') },
            h('div', { class: 'bag-l' },
              h('span', { class: 'bag-n', text: it.nome || b.um }), h('span', { class: 'bag-q', title: 'Quantas há na bolsa', text: '×' + it.qtd }),
              btn('Usar', () => use(tk, it), { kind: 'small', id: 'bag-u-' + it.id, disabled: it.qtd < 1, title: it.qtd < 1 ? 'Não há nenhuma na bolsa' : it.t === 'pocao' ? 'Gasta uma e aplica o efeito (mostra antes o que vai acontecer)' : 'Gasta uma e avisa a mesa. Nada é aplicado sozinho.' })),
            it.nota ? h('div', { class: 'bag-d', text: it.nota }) : null,
            previa ? h('div', { class: 'bag-c' },
              h('span', { class: 'bag-ct' }, h('strong', { text: `Usar ${it.nome || 'a poção'}${emOutro ? ' em ' + tokName(alvo) : ''}? ` }), (previa.join(' · ') || 'Gasta uma unidade.') + ' · ' + (resta === 0 ? 'é a última' : resta === 1 ? 'sobra 1' : 'sobram ' + resta)),
              btn('Usar agora', () => doUse(tk, it), { kind: 'primary small', id: 'bag-ok-' + it.id }),
              btn('Cancelar', () => { pede = null; paint(); const n = document.getElementById('bag-u-' + it.id); if (n) n.focus(); }, { kind: 'small', id: 'bag-no' })) : null);
        }));
      }));
      if (fid) { const n = document.getElementById(fid); if (n && !n.disabled) n.focus({ preventScroll: true }); }
    }
    paint();
    modal({ title: 'Bolsa de ' + tokName(t), body, wide: true, focusPrimary: true, actions: [{ label: 'Fechar', kind: 'primary' }] });
    modalLive = paint;
  }
  // No painel do token: o que há na bolsa, em uma linha, e o botão que a abre.
  function bagResumo(t) {
    const itens = Fichas.bolsa(t);
    if (!itens) return [];
    const partes = window.TC.rules.BOLSAS.map(b => { const n = itens.filter(x => x.t === b.t).reduce((s, x) => s + x.qtd, 0); return n ? `${n} ${(n === 1 ? b.um : b.nome).toLowerCase()}` : ''; }).filter(Boolean);
    return [
      note(partes.length ? 'Na bolsa: ' + partes.join(' · ') + '.' : itens.length ? 'A bolsa está sem unidades.' : 'A bolsa está vazia: os itens são cadastrados na ficha, em Bolsas.'),
      h('div', { class: 'row' }, btn('Abrir a bolsa…', () => bagBox(t), { icon: 'bag', id: 'tk-bolsa', disabled: !itens.length, title: 'Poções, bombas, runas, munições e materiais da ficha' })),
    ];
  }

  // No painel do token: os ferimentos abertos do personagem (marcados na ficha), para quem recebe a ficha.
  function feridasLista(t) {
    const fs = Fichas.feridas(t), amp = Fichas.amputados(t);
    if (!fs.length && !amp.length) return null;
    const R = window.TC.rules;
    return [fs.length ? h('ul', { class: 'ferl', id: 'tk-feridas' }, ...fs.map(f => h('li', { class: 'ferl-i g' + f.g }, h('span', { class: 'ferl-d', 'aria-hidden': 'true' }), h('span', { text: R.textoDoFerimento(f) + (f.n ? ' — ' + f.n : '') })))) : null,
      // (os membros amputados: um estado permanente, que não é ferimento — o token não ganha o sinal de ferido por eles)
      amp.length ? h('p', { class: 'note', id: 'tk-amp' }, 'Amputado: ' + amp.map(a => a.nome.toLowerCase() + (a.n ? ' (' + a.n + ')' : '')).join(', ') + '.') : null,
      note('Os ferimentos são marcados e tratados na ficha, no quadro “Corpo” (dois cliques no token abrem a ficha).')];
  }

  function tokenPanel(t) {
    const gm = isGM(), sc = Store.scene(), feridas = feridasLista(t);
    const U = (p, label) => Store.tx(label || 'Editar token', () => Store.upd('tokens', t.id, p));
    const head = h('div', { class: 'p-head' }, tokenAvatar(t, 44),
      h('div', { class: 'p-head-t' }, h('h3', { class: 'p-title', text: tokName(t) }), h('div', { class: 'p-sub', text: ownerLabel(t) + (t.hidden && gm ? ' · oculto dos jogadores' : '') })));
    if (!gm) {
      const mine = ownsTok(t), canC = mine && can('conds', t);
      return [head,
        sec('s-bars', 'Barras', true, mine && can('bars', t) ? barsEditor(t, false) : barsReadOnly(t)),
        sec('s-cond', 'Condições', true, canC ? postToggle(t) : t.post ? note('Em postura.') : null, condActive(t, canC), canC ? condGrid([t]) : t.conds.length || t.post ? null : note('Nenhuma condição.')),
        mine ? numsBox(t, false) : null,
        mine ? fadigaBox(t) : null,
        feridas ? sec('s-fer', 'Ferimentos', true, feridas) : null,
        Fichas.podeBolsa(t) ? sec('s-bag', 'Bolsa', true, bagResumo(t)) : null,
        mine && can('auras', t) ? sec('s-aura', 'Auras', t.auras.length > 0, auraEditor(t)) : null,
        can('target') ? h('div', { class: 'row' }, btn(isTargeted([t]) ? 'Tirar a mira' : 'Mirar', () => Act.targetToggle([t]), { icon: 'center', id: 'tk-mira', title: 'Marca este token como seu alvo, para a mesa toda ver (tecla A)' })) : null];
    }
    const L = t.light, V = t.vis;
    return [head,
      sec('s-id', 'Identidade', true,
        field('Nome', inText('tk-name', t.name, v => U({ name: v.trim() || t.name }, 'Renomear token'))),
        field('Dono', inSelect('tk-owner', t.owner || '', [['', 'Mestre (NPC)'], ['*', 'Todos os jogadores']].concat(Store.S.players.map(p => [p.id, p.name])), v => U({ owner: v || null }, 'Trocar dono'))),
        field('Tamanho', seg('tk-size', t.size, [[0.5, '½'], [1, '1'], [2, '2'], [3, '3'], [4, '4']], v => { const [x, y] = snapTok(sc, t.x, t.y, v, false); U({ size: v, x, y }, 'Tamanho do token'); })),
        field('Forma', seg('tk-shape', t.shape, [['circ', 'Redondo'], ['quad', 'Quadrado']], v => U({ shape: v }, 'Forma do token'))),
        field('Cor', inColor('tk-color', t.color, v => Store.upd('tokens', t.id, { color: v }), 'Cor do token')),
        imageField(t),
        toggle('tk-showname', t.showName, v => U({ showName: v }), 'Jogadores veem o nome')),
      sec('s-bars', 'Barras', true, barsEditor(t, true),
        h('div', { class: 'row' }, btn('Cura total', () => healToast([t]), { icon: 'heart', id: 'tk-heal', title: 'Enche todas as barras em uso deste token (Vida, SP…). Dá para desfazer.' }),
          Luta.podeAtaque() ? btn('Ataque com defesa…', () => Luta.ataque([t]), { icon: 'shield', id: 'tk-ataque', title: 'Um ataque contra este token: você diz o dano e qual defesa desconta; quem defende pode rolar (tecla K)' }) : null),
        field('Quem não é dono vê', seg('tk-barvis', t.barVis, [['num', 'Números'], ['bar', 'Só a barra'], ['none', 'Nada']], v => U({ barVis: v })), 'stack')),
      menteBox(t),
      fadigaBox(t),
      numsBox(t, true),
      sec('s-cond', 'Condições', true, postToggle(t), condActive(t, true), condGrid([t])),
      cloneSec(t),
      dupSec(t),
      sec('s-turn', 'Turnos', true,
        field('Iniciativa', inNum('tk-ini', clampIni(t.ini), v => U({ ini: clampIni(v) }, 'Iniciativa do token'), { min: -99, max: 99, step: 1, label: 'Bônus de iniciativa', title: 'Bônus de iniciativa: a rolagem é 1d20 + este valor' })),
        field('Turnos por rodada', stepper('tk-turns', clampTurns(t.turns), 1, MAX_TURNS, v => Act.tokenTurns(t, v), 'Turnos por rodada')),
        Luta.inisBox(t),
        note('Na aba Turnos, a iniciativa é rolada com 1d20 + Iniciativa. Quem tem mais de um turno por rodada entra mais de uma vez na ordem.'),
        h('div', { class: 'row' }, btn('Aos turnos', () => { const n = Act.turnAdd([t]); toast(n ? `${t.name} entrou na ordem de turnos.` : `${t.name} já está na ordem de turnos.`); }, { icon: 'turns', id: 'tk-toturn' }))),
      Fichas.on() ? sec('s-ficha', 'Ficha do personagem', !!t.char, fichaBox(t)) : null,
      feridas ? sec('s-fer', 'Ferimentos', true, feridas) : null,
      sec('s-aura', 'Auras', t.auras.length > 0, auraEditor(t)),
      sec('s-vis', 'Visão e luz', false,
        toggle('tk-vis', V.on, v => U({ vis: Object.assign({}, V, { on: v }) }), 'Enxerga (quando tem um jogador como dono)'),
        V.on ? h('div', { class: 'grid2' },
          field('Alcance (q)', inNum('tk-vr', V.range, v => U({ vis: Object.assign({}, V, { range: v }) }), { min: 0, max: 200, step: 1 })),
          field('No escuro (q)', inNum('tk-vd', V.dark, v => U({ vis: Object.assign({}, V, { dark: v }) }), { min: 0, max: 200, step: 1 }))) : null,
        V.on ? note('Alcance 0 significa sem limite. "No escuro" é até onde o token enxerga sem luz nenhuma.') : null,
        toggle('tk-light', L.on, v => U({ light: Object.assign({}, L, { on: v }) }), 'Carrega uma luz'),
        L.on ? [
          field('Tipo', inSelect('tk-lp', '', [['', 'Escolher…']].concat(LIGHT_PRESETS.map(p => [p.id, p.n])), v => { const p = LIGHT_PRESETS.find(x => x.id === v); if (p) U({ light: Object.assign({ on: true, bright: p.bright, dim: p.dim, c: p.c }, p.fl ? { fl: true } : {}) }, 'Tipo de luz'); })),
          toggle('tk-lfl', !!L.fl, v => U({ light: Object.assign({}, L, { fl: v ? true : undefined }) }, 'Luz que tremula'), 'Tremula, como chama (uma tocha na mão)'),
          h('div', { class: 'grid2' },
            field('Luz forte (q)', inNum('tk-lb', L.bright, v => U({ light: Object.assign({}, L, { bright: Math.min(v, L.dim) }) }), { min: 0, max: 60, step: 0.5 })),
            field('Até (q)', inNum('tk-ld', L.dim, v => U({ light: Object.assign({}, L, { dim: v, bright: Math.min(L.bright, v) }) }), { min: 0.5, max: 60, step: 0.5 }))),
          field('Cor da luz', inColor('tk-lc', L.c, v => Store.upd('tokens', t.id, { light: Object.assign({}, t.light, { c: v }) }), 'Cor da luz')),
        ] : null),
      sec('s-gm', 'Só do mestre', true,
        toggle('tk-hidden', t.hidden, v => U({ hidden: v }, v ? 'Ocultar token' : 'Mostrar token'), 'Oculto dos jogadores'),
        toggle('tk-locked', t.locked, v => U({ locked: v }, v ? 'Travar token' : 'Destravar token'), 'Posição travada'),
        field('Anotações', h('textarea', { id: 'tk-notes', class: 'in area', rows: 3, value: t.notes || '', placeholder: 'Só você vê isto.', onchange: e => U({ notes: e.target.value }, 'Anotações') }), 'stack'),
        h('div', { class: 'row' },
          btn('Duplicar', Act.duplicateSel, { icon: 'copy' }),
          btn('Apagar', deleteSelToast, { icon: 'trash', kind: 'danger' }))),
    ];
  }
  /* Os números que aparecem ao lado do nome do token (Força, Canalização Mágica, Defesa Física, Defesa Mágica e
     Esquiva). Com ficha, vêm dela (só para ler); sem ficha, o mestre preenche os que quiser. */
  function numsBox(t, gm) {
    const daFicha = t.char ? Fichas.numeros(t) : null, v = tokNums(t), st = cleanSt(t.st) || {};
    if (!gm && !v) return null;
    const rot = (K, nome) => h('span', { class: 'num-l', title: nome }, h('span', { class: 'num-i', style: { color: NUM_CORES[K] } }, icon('st_' + K.toLowerCase(), 15)), h('span', { text: K }));
    const corpo = daFicha || !gm
      ? h('div', { class: 'nums', id: 'tk-nums' }, ST_CAMPOS.map(([, K, nome]) => h('div', { class: 'num-f' }, rot(K, nome), h('span', { class: 'num-v', id: 'tk-num-' + K, text: v && v[K] != null ? fmt(v[K], 0) : '–' }))))
      : h('div', { class: 'nums', id: 'tk-nums' }, ST_CAMPOS.map(([k, K, nome]) => h('label', { class: 'num-f' }, rot(K, nome),
        h('input', { id: 'tk-st-' + k, class: 'in num', type: 'number', step: 1, min: -9999, max: 99999, value: st[k] == null ? '' : st[k], placeholder: '–', 'aria-label': nome,
          onchange: e => { const raw = String(e.target.value).trim(), o = Object.assign({}, st); if (raw === '') delete o[k]; else o[k] = Number(raw); const novo = cleanSt(o); Store.tx('Números do token', () => Store.upd('tokens', t.id, { st: novo || undefined })); } }))));
    return sec('s-nums', 'Força e defesas', !!v || gm,
      corpo,
      note(daFicha ? 'Vêm da ficha, com equipamentos, árvore e bônus. Aparecem ao lado do nome quando você aponta para o token ou o escolhe — só para o mestre e o dono.'
        : gm ? 'Preencha só os que quiser. Aparecem ao lado do nome quando você aponta para o token ou o escolhe — só para o mestre e o dono.'
        : 'Aparecem ao lado do nome quando você aponta para o token ou o escolhe. Só você e o mestre veem.'));
  }
  /* Sanidade e Conforto da ficha ligada (só o mestre): o valor e os passos, como na ficha. Grava direto nela; o
     Desfazer do aviso volta ao valor de antes da sequência de cliques. */
  const menteSerie = new Map();          // `${token}:${k}` → { antes, at }
  function mudarMente(t, k, v) {
    const chave = t.id + ':' + k, s0 = menteSerie.get(chave), agora = Date.now();
    const antes = Fichas.mudarMente(t, k, v);
    if (antes == null) return;
    const base = s0 && agora - s0.at < 6000 ? s0.antes : antes;
    menteSerie.set(chave, { antes: base, at: agora });
    const nome = k === 'san' ? 'Sanidade' : 'Conforto', depois = (Fichas.mente(t) || {})[k];
    toast(`${nome} de ${t.name}: ${base} → ${depois}.`, { key: 'mente:' + chave, action: 'Desfazer', run: () => { menteSerie.delete(chave); Fichas.mudarMente(t, k, base); } });
  }
  function menteBox(t) {
    const m = Fichas.mente(t);
    if (!m) return null;
    const linha = (k, nome) => h('div', { class: 'mente-r' },
      h('span', { class: 'mente-n' }, h('span', { class: 'mente-dot', style: { background: MENTE_COR[k] } }), h('span', { text: nome })),
      h('input', { id: `tk-${k}`, class: 'in num', type: 'number', min: 0, max: 100, step: 1, value: m[k], 'aria-label': nome + ', de 0 a 100', onchange: e => mudarMente(t, k, e.target.value) }),
      h('span', { class: 'mente-m', text: '/ 100' }),
      h('span', { class: 'mente-b' }, [-5, -1, 1, 5].map(d => h('button', { type: 'button', class: 'mini-b', id: `tk-${k}-${d > 0 ? 'p' : 'm'}${Math.abs(d)}`, text: d > 0 ? '+' + d : '−' + Math.abs(d), title: `${nome} ${d > 0 ? '+' : '−'}${Math.abs(d)}`,
        onclick: () => { const cur = Fichas.mente(t); if (cur) mudarMente(t, k, cur[k] + d); } }))));
    return sec('s-mente', 'Sanidade e Conforto', true, linha('san', 'Sanidade'), linha('conf', 'Conforto'),
      note('Da ficha, de 0 a 100. Só você vê: no token aparecem tracejadas, e os jogadores não as recebem (nem o dono). Mudar aqui grava na ficha.'));
  }
  /* A fadiga da ficha (a pilha de 5 a 0): o mestre e o dono do personagem mudam aqui, de um em um; grava na ficha.
     No token, a pilha aparece para todos. */
  function fadigaBox(t) {
    const f = Fichas.fadiga(t);
    if (!f) return null;
    const passo = d => h('button', { type: 'button', class: 'mini-b', id: 'tk-fad-' + (d > 0 ? 'p' : 'm'), text: d > 0 ? '+1' : '−1', disabled: d > 0 ? f.v >= 5 : f.v <= 0,
      title: d > 0 ? 'Um a mais na pilha (mais descansado)' : 'Um a menos na pilha (mais cansado)', onclick: () => { const cur = Fichas.fadiga(t); if (cur) mudarFadiga(t, cur.v + d); } });
    return sec('s-fad', 'Fadiga', true,
      h('div', { class: 'mente-r' }, h('span', { class: 'mente-n' }, h('span', { id: 'tk-fad', text: f.v + ' de 5 · ' + f.nome })), h('span', { class: 'mente-b' }, passo(-1), passo(1))),
      note('Da ficha: a pilha vai de 5 (descansado) a 0 (esgotado), e todos a veem no token. O descanso longo do Acampamento enche; o curto devolve um.'));
  }
  const fadSerie = new Map();
  function mudarFadiga(t, v) {
    const s0 = fadSerie.get(t.id), agora = Date.now();
    const antes = Fichas.mudarFadiga(t, v);
    if (antes == null) return;
    const base = s0 && agora - s0.at < 6000 ? s0.antes : antes;
    fadSerie.set(t.id, { antes: base, at: agora });
    const depois = (Fichas.fadiga(t) || {}).v;
    toast(`Fadiga de ${t.name}: ${base} → ${depois} de 5.`, { key: 'fad:' + t.id, action: 'Desfazer', run: () => { fadSerie.delete(t.id); Fichas.mudarFadiga(t, base); } });
  }
  /* Objetos de cenário: o que é, girar, tamanho, a luz (se tem), esconder, travar. Para o jogador, só o nome. */
  function propPanel(props) {
    const gm = isGM(), t = props[0], many = props.length > 1, def = Props.P[t.prop] || {};
    const all = (p, label) => Store.tx(label || 'Editar objeto', () => props.forEach(x => Store.upd('tokens', x.id, typeof p === 'function' ? p(x) : p)));
    const prev = h('canvas', { class: 'prop-prev', width: 88, height: 88 });
    Props.thumb(prev, t.prop, 1.3);
    const head = h('div', { class: 'p-head' }, prev,
      h('div', { class: 'p-head-t' }, h('h3', { class: 'p-title', text: many ? `${props.length} objetos` : (gm ? t.name : def.n) || def.n }), h('div', { class: 'p-sub', text: many ? 'Objetos de cenário' : 'Objeto de cenário' + (t.hidden && gm ? ' · oculto dos jogadores' : '') })));
    if (!gm) return [head];
    const girar = d => all(x => ({ rot: (((x.rot || 0) + d) % 360 + 360) % 360 }), 'Girar objeto');
    const luz = !many && t.light && def.luz ? t.light : null;
    // (lote 7) aonde o objeto leva: a lista das cenas (na ordem das famílias) e o botão de ir
    const alvo = !many && t.cena && Store.S.scenes[t.cena] ? t.cena : null;
    const cenaSel = many ? null : (() => {
      const comCamp = Nuvem.comCampanhas(), vis = Store.S.order.filter(id => Store.S.scenes[id] && id !== Store.S.current && (!comCamp || Nuvem.naVista(id))), F = familiasVistas(vis), arv = [];
      const desce = (k, n) => { arv.push([k, n]); for (const f of F.filhas(k)) desce(f, n + 1); };
      F.raizes.forEach(k => desce(k, 0));
      if (t.cena && !alvo) arv.unshift([t.cena, -1]);
      return h('select', { id: 'pr-cena', class: 'in', value: t.cena || '', 'aria-label': 'A cena aonde este objeto leva', onchange: e => { const v = e.target.value; e.target.blur(); ligarObjeto(t, v || null); } },
        h('option', { value: '', text: 'Nenhuma' }), ...arv.map(([k, n]) => h('option', { value: k, text: n < 0 ? '(a cena ligada foi apagada)' : '   '.repeat(n) + Store.S.scenes[k].name })));
    })();
    return [head,
      sec('s-prop', 'Objeto', true,
        !many ? field('Nome', inText('pr-name', t.name, v => all({ name: v.trim() || t.name }, 'Renomear objeto'))) : null,
        field('Girar', h('div', { class: 'row tight' },
          btn('', () => girar(-90), { icon: 'undo', kind: 'small', id: 'pr-rot-l', title: 'Girar 90° para a esquerda' }),
          btn('', () => girar(90), { icon: 'redo', kind: 'small', id: 'pr-rot-r', title: 'Girar 90° para a direita' }),
          !many ? inNum('pr-rot', t.rot || 0, v => all({ rot: ((Math.round(v) % 360) + 360) % 360 }, 'Girar objeto'), { min: 0, max: 359, step: 15, label: 'Rotação em graus' }) : null)),
        field('Tamanho', seg('pr-size', many ? null : t.size, [[0.5, '½'], [1, '1'], [2, '2'], [3, '3'], [4, '4']], v => all(x => { const sc = Store.scene(), [nx, ny] = snapTok(sc, x.x, x.y, v, false); return { size: v, x: nx, y: ny }; }, 'Tamanho do objeto')))),
      luz ? sec('s-propluz', 'Luz', true,
        toggle('pr-luz', luz.on, v => all({ light: Object.assign({}, luz, { on: v }) }, v ? 'Acender' : 'Apagar'), 'Acesa'),
        toggle('pr-fl', !!luz.fl, v => all({ light: Object.assign({}, luz, v ? { fl: true } : { fl: undefined }) }, 'Luz que tremula'), 'Tremula, como chama'),
        h('div', { class: 'grid2' },
          field('Luz forte (q)', inNum('pr-lb', luz.bright, v => all({ light: Object.assign({}, luz, { bright: Math.min(v, luz.dim) }) }), { min: 0, max: 60, step: 0.5 })),
          field('Até (q)', inNum('pr-ld', luz.dim, v => all({ light: Object.assign({}, luz, { dim: v, bright: Math.min(luz.bright, v) }) }), { min: 0.5, max: 60, step: 0.5 }))),
        Store.scene().light === 'claro' ? note('A cena está clara: a luz só aparece em penumbra ou no escuro (aba Cena).') : null) : null,
      !many ? sec('s-propcena', 'Leva para outra cena', !!t.cena || !!def.passagem,
        field('Cena', cenaSel),
        h('div', { class: 'row' },
          btn('Ir para lá', () => passagemIr(alvo, false), { icon: 'map', id: 'pr-ir', disabled: !alvo || !Nuvem.naVista(alvo) }),
          !alvo ? btn('Uma cena nova, dentro desta…', () => novaCenaLigada(t), { icon: 'plus', id: 'pr-nova' }) : null),
        note(alvo ? `Dois cliques no objeto levam você (só você) até "${Store.S.scenes[alvo].name}". O que os jogadores veem só muda com "Mostrar aos jogadores".` : 'Com uma cena escolhida, dois cliques no objeto levam você até ela. "Uma cena nova" cria a cena dentro desta (na lista de cenas), já com a saída de volta.')) : null,
      !many && t.prop === 'reforco' && typeof Reforco !== 'undefined' ? Reforco.secao(t, { sec, note, btn, field, inNum, modal }) : null,      // (lote 22)
      sec('s-gm', 'Só do mestre', true,
        toggle('pr-hidden', props.every(x => x.hidden), v => all({ hidden: v }, v ? 'Ocultar objeto' : 'Mostrar objeto'), 'Oculto dos jogadores'),
        toggle('pr-locked', props.every(x => x.locked), v => all({ locked: v }, v ? 'Travar objeto' : 'Destravar objeto'), 'Posição travada'),
        h('div', { class: 'row' },
          btn('Duplicar', Act.duplicateSel, { icon: 'copy' }),
          btn('Frente', () => Act.toFront('tokens', props.map(x => x.id), true), { icon: 'front' }),
          btn('Trás', () => Act.toFront('tokens', props.map(x => x.id), false), { icon: 'back' }),
          btn('Apagar', deleteSelToast, { icon: 'trash', kind: 'danger' }))),
    ];
  }
  /* (lote 7) As passagens: um objeto pode levar a outra cena (a entrada de uma casa leva à cena de dentro; a saída, de
     volta). Só o mestre usa: dois cliques no objeto abrem o menu da passagem. Ir para outra cena não muda o que os
     jogadores veem (isso é com "Mostrar aos jogadores"). Ligar e desligar têm Desfazer (Ctrl+Z). */
  function ligarObjeto(t, cena) {
    if (!Store.get('tokens', t.id)) return;
    Store.tx(cena ? 'Ligar a uma cena' : 'Desligar da cena', () => Store.upd('tokens', t.id, { cena: cena || null }));
  }
  function passagemIr(id, mostrar) {
    if (!id || !Store.S.scenes[id]) return;
    if (!Nuvem.naVista(id)) { toast('Essa cena é de outra campanha. Para abri-la, escolha a campanha dela no menu da mesa.'); return; }
    const de = Store.S.current, nome = Store.S.scenes[id].name;
    switchScene(id);
    if (mostrar) showToPlayers(id);
    else toast(`Você está em "${nome}".` + (Nuvem.mestre() ? ' Os jogadores continuam vendo a cena que está no ar.' : ''), { action: 'Voltar', run: () => { if (Store.S.scenes[de] && Nuvem.naVista(de)) switchScene(de); } });
  }
  function passagem(t, x, y) {
    if (!isGM() || !t) return;
    const alvo = t.cena && Store.S.scenes[t.cena] ? t.cena : null, items = [];
    if (alvo) {
      const fora = !Nuvem.naVista(alvo);
      items.push({ head: 'Leva para ' + Store.S.scenes[alvo].name });
      items.push({ label: 'Ir para esta cena', icon: 'map', disabled: fora, run: () => passagemIr(alvo, false) });
      if (Nuvem.mestre()) items.push({ label: 'Ir e mostrar aos jogadores', icon: 'eye', disabled: fora, run: () => passagemIr(alvo, true) });
      items.push('-', { label: 'Levar a outra cena…', icon: 'link', run: () => openTab('sel', 'pr-cena') });
    } else {
      items.push({ head: t.cena ? 'A cena ligada foi apagada' : 'Ainda não leva a nenhuma cena' });
      // (lote 7) o marcador de um bairro (no mapa de bairros) gera o bairro; a entrada de um prédio gera o interior
      const aqui = Store.scene(), def = Props.P[t.prop];
      if (t.gera && t.gera.b) { if (aqui && aqui.gerado) items.push({ label: 'Gerar este bairro…', icon: 'map', run: () => Cidade.abrirBairro(t) }); }
      // (parte 4b-3) a escada que desce gera o nível de baixo
      else if (t.gera && t.gera.t === 'masmorra') items.push({ label: 'Gerar o nível ' + t.gera.n + '…', icon: 'down', run: () => Masmorra.abrir(t) });
      // (lote 18) a entrada de gruta: a caverna embaixo da cena, alinhada com ela
      else if (t.gera && t.gera.t === 'subsolo') items.push({ label: 'Gerar a caverna embaixo…', icon: 'down', run: () => Masmorra.abrirSubsolo(t) });
      else if (def && def.passagem === 'entra') {
        items.push({ label: 'Gerar o interior…', icon: 'house', run: () => Interior.abrir(t) });
        if (!t.gera) items.push({ label: 'Gerar uma masmorra embaixo…', icon: 'down', run: () => Masmorra.abrir(t) }, { label: 'Gerar a caverna embaixo (alinhada com esta cena)…', icon: 'down', run: () => Masmorra.abrirSubsolo(t) });
      }
      items.push({ label: 'Escolher a cena…', icon: 'link', run: () => openTab('sel', 'pr-cena') }, { label: 'Uma cena nova, dentro desta…', icon: 'plus', run: () => novaCenaLigada(t) });
    }
    if (x == null || y == null) { const r = el.stage.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    menu(x, y, items);
  }
  // a cena nova fica na mesma campanha da cena de fora (numa mesa com campanhas)
  function herdarCampanha(filha, mae) { if (Nuvem.comCampanhas() && Nuvem.podeOrganizar()) Nuvem.definirCampanhas(filha, Nuvem.campanhasDaCena(mae)); }
  function novaCenaLigada(t) {
    const fora = Store.scene();
    if (!Store.get('tokens', t.id)) return;
    promptBox('Uma cena nova, dentro desta', 'Nome da cena nova', `${fora.name} · dentro`.slice(0, 60), { ok: 'Criar' }).then(nome => {
      nome = String(nome || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      if (!nome || Store.S.current !== fora.id || !Store.get('tokens', t.id)) return;
      const sc = newScene(nome);
      const s = Props.novo(sc, 'saida', Math.floor(sc.cols / 2) * sc.cell, Math.floor(sc.rows / 2) * sc.cell, 1, true);
      s.cena = fora.id; sc.tokens.push(s);                  // a saída de volta, no meio da cena nova
      normalizeScene(sc);
      Store.addScene(sc); Persist.scene(sc.id);
      porNaFamilia(sc.id, fora.id);
      herdarCampanha(sc.id, fora.id);
      ligarObjeto(t, sc.id);
      toast(`Cena "${sc.name}" criada dentro de "${fora.name}", com a saída de volta. Dois cliques no objeto levam até ela.`, { long: true, action: 'Ir para lá', run: () => passagemIr(sc.id, false) });
    });
  }
  /* (lote 7) Mexer em todos: a Fadiga, o Conforto e a Sanidade das fichas dos tokens selecionados. Vêm marcados os
     personagens dos jogadores; a lista mostra o antes e o depois; o motivo vai para a mesa ao vivo. O Desfazer do
     aviso volta só o que mudou em cada ficha. */
  function menteTodosBox(toks) {
    const rows = [], vistos = new Set();
    for (const t of toks) {
      if (!t.char || vistos.has(t.char) || !(Fichas.mente(t) || Fichas.fadiga(t))) continue;
      vistos.add(t.char);
      rows.push({ t, on: Fichas.deJogadorT(t) });
    }
    if (!rows.length) { toast('Nenhum destes tokens tem ficha que use Sanidade, Conforto ou Fadiga.'); return; }
    const d = { fad: 0, conf: 0, san: 0 };
    const FAD = (window.TC && window.TC.rules && window.TC.rules.FADIGA) || [];
    const campo = (k, rot, lim) => h('input', { id: 'mm-' + k, class: 'in num', type: 'number', min: -lim, max: lim, step: 1, value: 0, 'aria-label': rot + ' (para menos, com sinal de menos)',
      oninput: e => { d[k] = clamp(Math.trunc(Number(e.target.value) || 0), -lim, lim); paint(); } });
    const motivo = h('input', { id: 'mm-motivo', class: 'in', type: 'text', maxlength: 200, placeholder: 'Por quê? (vai para a mesa ao vivo)', 'aria-label': 'O motivo' });
    const list = h('ul', { class: 'area-list', id: 'mm-list' }), count = h('span', { class: 'area-count' });
    const seta = (de, para) => (de === para ? String(de) : de + ' → ' + para);
    const paint = () => {
      count.textContent = `${rows.filter(r => r.on).length} de ${rows.length} marcados`;
      list.replaceChildren(...rows.map((r, k) => {
        const p = Fichas.previaMente(r.t, d), partes = [];
        if (p && p.antes.fad != null) partes.push('Fadiga ' + seta(FAD[p.antes.fad] || p.antes.fad, FAD[p.depois.fad] || p.depois.fad));
        if (p && p.antes.conf != null) partes.push('Conforto ' + seta(p.antes.conf, p.depois.conf));
        if (p && p.antes.san != null) partes.push('Sanidade ' + seta(p.antes.san, p.depois.san));
        return h('li', { class: 'area-row' + (r.on ? '' : ' off') },
          h('label', { class: 'area-who' },
            h('input', { type: 'checkbox', class: 'ck', id: `mm-on-${k}`, checked: r.on, 'aria-label': 'Incluir ' + r.t.name, onchange: e => { r.on = e.target.checked; paint(); document.getElementById(`mm-on-${k}`).focus(); } }),
            tokenAvatar(r.t, 26), h('span', { class: 'area-n', text: r.t.name + (r.t.hidden ? ' (oculto)' : '') })),
          h('span', { class: 'area-res', text: !r.on ? 'fica de fora' : partes.join(' · ') }));
      }));
    };
    const all = on => { rows.forEach(r => { r.on = on; }); paint(); };
    paint();
    modal({
      title: 'Fadiga, Conforto e Sanidade', wide: true,
      body: h('div', { class: 'area' },
        h('div', { class: 'area-top' }, field('Fadiga', campo('fad', 'Fadiga', 5), 'stack'), field('Conforto', campo('conf', 'Conforto', 100), 'stack'), field('Sanidade', campo('san', 'Sanidade', 100), 'stack')),
        note('Para menos, com sinal de menos. A Fadiga é em passos da pilha (−1: um passo mais cansado); o Conforto e a Sanidade vão de 0 a 100. O que a ficha de alguém não usa fica como está.'),
        field('Motivo', motivo, 'stack'),
        h('div', { class: 'area-bar' }, count, h('span', { class: 'spacer' }), btn('Todos', () => all(true), { kind: 'small' }), btn('Nenhum', () => all(false), { kind: 'small' })),
        list),
      actions: [{ label: 'Cancelar' }, {
        label: 'Aplicar', kind: 'primary', run: () => {
          if (!(d.fad || d.conf || d.san)) { toast('Diga quanto mudar: a Fadiga, o Conforto ou a Sanidade.'); document.getElementById('mm-conf').focus(); return false; }
          const picked = rows.filter(r => r.on).map(r => Store.get('tokens', r.t.id)).filter(Boolean);
          if (!picked.length) { toast('Marque pelo menos um token.'); return false; }
          const feitos = Fichas.mexerEmTodos(picked, d);
          if (!feitos.length) { toast('Nada mudou: os valores já estavam no limite.'); return; }
          const oQue = [d.fad ? 'Fadiga ' + sinal(d.fad) : '', d.conf ? 'Conforto ' + sinal(d.conf) : '', d.san ? 'Sanidade ' + sinal(d.san) : ''].filter(Boolean).join(', ');
          const nomes = feitos.map(f => f.nome), mot = motivo.value.trim();
          const resumo = oQue + ' para ' + (nomes.length < 2 ? nomes.join('') : nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1]) + (mot ? ' — ' + mot : '') + '.';
          try { window.TC.ponte.publicar('cena', { kind: 'aviso', titulo: 'Cena: ' + Store.scene().name, resumo }); } catch (e) { /* sem a casca, não há mesa ao vivo */ }
          toast('Feito: ' + resumo, { action: 'Desfazer', run: () => {
            Fichas.voltarMente(feitos);
            try { window.TC.ponte.publicar('cena', { kind: 'aviso', titulo: 'Cena: ' + Store.scene().name, resumo: 'Desfeito: ' + oQue + '.' }); } catch (e) { /* idem */ }
          } });
        },
      }],
    });
  }
  const sinal = n => (n > 0 ? '+' + n : '−' + Math.abs(n));
  // Cura total com aviso e Desfazer.
  function healToast(toks, quem) {
    const n = Act.fullHeal(toks);
    if (!n) { toast(toks.length ? (toks.length === 1 ? `${toks[0].name} já está com as barras cheias.` : 'Todos já estavam com as barras cheias.') : 'Não há tokens para curar.'); return 0; }
    toast(n === 1 && toks.length === 1 ? `Cura total em ${toks[0].name}.` : `Cura total em ${n} ${n === 1 ? 'token' : 'tokens'}${quem ? ' ' + quem : ''}.`, { action: 'Desfazer', run: Tools.undo });
    return n;
  }
  function deleteSelToast() {
    const n = Act.deleteSel();
    if (n) toast(n === 1 ? 'Item apagado.' : `${n} itens apagados.`, { action: 'Desfazer', run: Tools.undo });
  }

  function multiTokenPanel(toks, props) {
    const gm = isGM(), extra = props && props.length ? props.length : 0;
    const editable = toks.filter(t => gm || can('bars', t));
    const names = [];
    for (const t of editable) for (const b of t.bars) if (b.on && !names.includes(b.n)) names.push(b.n);
    const sel = h('select', { id: 'mt-bar', class: 'in', 'aria-label': 'Barra' }, names.map(n => h('option', { value: n, text: n })));
    const amt = h('input', { id: 'mt-amt', class: 'in bar-v', type: 'text', inputmode: 'decimal', placeholder: '-5', autocomplete: 'off', 'aria-label': 'Quanto somar ou subtrair' });
    const apply = () => {
      if (!/^\s*[+-]?\s*\d/.test(amt.value)) { toast('Digite um número, como -5 ou +10.'); return; }
      // (lote 15) "-10%": cada um perde 10% do máximo dele
      const n = /%\s*$/.test(amt.value) ? Act.groupPct(editable, sel.value, amt.value) : Act.areaApply(editable.map(t => ({ t, half: false })), sel.value, amt.value, null);
      if (n < 0) { toast('Digite um número, como -5 ou +10.'); return; }
      amt.value = '';
    };
    amt.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
    const condToks = toks.filter(t => gm || can('conds', t));
    return [
      h('div', { class: 'p-head' }, h('div', { class: 'stack-av' }, toks.slice(0, 5).map(t => tokenAvatar(t, 34))),
        h('div', { class: 'p-head-t' }, h('h3', { class: 'p-title', text: `${toks.length} ${toks.length === 1 ? 'token' : 'tokens'}` + (extra ? ` e ${extra} ${extra === 1 ? 'objeto' : 'objetos'}` : '') }), h('div', { class: 'p-sub', text: extra ? 'Barras e condições valem para os tokens; os objetos de cenário ficam de fora.' : 'O que você mudar aqui vale para todos.' }))),
      editable.length && names.length ? sec('s-mbar', 'Somar ou subtrair de todos', true,
        h('div', { class: 'row' }, sel, amt, btn('Aplicar', apply, { kind: 'primary' })),
        note('Sem sinal, o número é subtraído: útil para dano em área. Com %, é do máximo de cada um (-10% tira 10%). Só muda quem tem a barra escolhida.'),
        gm ? h('div', { class: 'row' },
          btn('Com metade e condição…', () => areaBox(`Aplicar a ${toks.length} tokens`, toks, null), { icon: 'area', kind: 'small', id: 'mt-area', title: 'Escolhe quem leva tudo, quem leva metade e quem fica de fora, com condição opcional' }),
          btn('Cura total', () => healToast(editable), { icon: 'heart', kind: 'small', id: 'mt-heal', title: 'Enche todas as barras em uso dos tokens selecionados. Dá para desfazer.' }),
          btn('Sobrevida…', () => sobreBox(editable, `Sobrevida a ${editable.length} tokens`), { icon: 'shield', kind: 'small', id: 'mt-sobre', title: 'Pontos por cima da barra para todos os selecionados; cada um fica com a maior (não soma)' }),
          Luta.podeAtaque() ? btn('Ataque com defesa…', () => Luta.ataque(toks), { icon: 'shield', kind: 'small', id: 'mt-ataque', title: 'Um ataque contra estes tokens: você diz o dano e qual defesa desconta; quem defende pode rolar (tecla K)' }) : null,
          btn('Rolagem geral…', () => Luta.rolagemGeral(), { icon: 'die', kind: 'small', id: 'mt-geral', title: 'O mesmo atributo para todos os selecionados: os jogadores rolam pela mesa ao vivo, ou você rola por todos (Shift+F)' }),
          Luta.podeDescanso() && toks.some(t => t.char && !t.clone) ? btn('Descanso curto…', () => Luta.descansoCurto(toks), { icon: 'rest', kind: 'small', id: 'mt-curto', title: 'Abre o Descanso curto do Acampamento com estes tokens já marcados (os ligados a uma ficha). Lá você confere e confirma.' }) : null,
          toks.some(t => t.char && (Fichas.mente(t) || Fichas.fadiga(t))) ? btn('Fadiga, Conforto e Sanidade…', () => menteTodosBox(toks), { icon: 'heart', kind: 'small', id: 'mt-mente', title: 'Para menos ou para mais, nas fichas dos tokens selecionados, de uma vez (com o antes e o depois de cada um)' }) : null) : null) : null,
      condToks.length ? sec('s-cond', 'Condições', true, condActiveMulti(condToks), condGrid(condToks)) : null,
      !gm && !can('target') ? null : h('div', { class: 'row' },
        can('target') ? btn(isTargeted(toks) ? 'Tirar a mira' : 'Mirar', () => Act.targetToggle(toks), { icon: 'center', id: 'mt-mira', title: 'Marca estes tokens como alvo, para a mesa toda ver (tecla A)' }) : null,
        gm ? btn('Aos turnos', () => { const n = Act.turnAdd(toks); toast(n ? `${n} ${n === 1 ? 'token entrou' : 'tokens entraram'} na ordem de turnos.` : 'Todos já estavam na ordem de turnos.'); }, { icon: 'turns' }) : null,
        gm ? btn(toks.every(t => t.hidden) ? 'Mostrar' : 'Ocultar', () => { const hide = !toks.every(t => t.hidden); Store.tx(hide ? 'Ocultar tokens' : 'Mostrar tokens', () => toks.forEach(t => Store.upd('tokens', t.id, { hidden: hide }))); }, { icon: toks.every(t => t.hidden) ? 'eye' : 'eyeOff' }) : null,
        gm ? btn('Apagar', deleteSelToast, { icon: 'trash', kind: 'danger' }) : null),
    ];
  }

  function shapePanel(shapes) {
    const gm = isGM(), s = shapes[0], many = shapes.length > 1;
    const NAMES = { free: 'Desenho livre', line: 'Linha', rect: 'Retângulo', ell: 'Elipse', poly: 'Polígono', text: 'Texto' };
    const all = (p, label) => Store.tx(label || 'Editar desenho', () => shapes.forEach(x => Store.upd('shapes', x.id, p)));
    const liveAll = p => shapes.forEach(x => Store.upd('shapes', x.id, p));
    const canFill = shapes.every(x => x.k === 'rect' || x.k === 'ell' || x.k === 'poly');
    const noText = shapes.every(x => x.k !== 'text');
    return [
      h('div', { class: 'p-head' }, h('div', { class: 'p-head-t' }, h('h3', { class: 'p-title', text: many ? `${shapes.length} desenhos` : NAMES[s.k] }), h('div', { class: 'p-sub', text: shapes.some(x => x.lock) ? 'Travado: destrave para mover.' : 'Arraste para mover; puxe as alças para mudar o tamanho.' }))),
      sec('s-shape', 'Aparência', true,
        !many && s.k === 'text' ? field('Texto', h('textarea', { id: 'sh-txt', class: 'in area', rows: 3, value: s.txt, onchange: e => { if (e.target.value.trim()) all({ txt: e.target.value.trim() }, 'Editar texto'); } }), 'stack') : null,
        !many && s.k === 'text' ? field('Tamanho (px)', inNum('sh-fs', s.fs, v => all({ fs: v }), { min: 8, max: 300, step: 2 })) : null,
        field(s.k === 'text' ? 'Cor' : 'Traço', inColor('sh-s', s.s, v => liveAll({ s: v }), 'Cor do traço')),
        canFill ? toggle('sh-fon', !!s.f, v => all({ f: v ? (s.f || s.s) : null }, 'Preenchimento'), 'Preencher') : null,
        canFill && s.f ? field('Preenchimento', inColor('sh-f', s.f, v => liveAll({ f: v }), 'Cor do preenchimento')) : null,
        noText ? field('Espessura', inRange('sh-sw', s.sw, canFill ? 0 : 1, 24, 1, v => liveAll({ sw: v }), 'Espessura do traço')) : null,
        field('Opacidade', inRange('sh-a', s.a == null ? 1 : s.a, 0.1, 1, 0.05, v => liveAll({ a: v }), 'Opacidade')),
        !many && s.k === 'line' ? toggle('sh-arrow', !!s.arrow, v => all({ arrow: v }), 'Seta na ponta') : null),
      sec('s-shape2', 'Posição na cena', true,
        toggle('sh-top', !!s.top, v => all({ top: v }), 'Acima dos tokens'),
        gm ? toggle('sh-gm', !!s.gm, v => all({ gm: v }), 'Só o mestre vê') : null,
        toggle('sh-lock', !!s.lock, v => all({ lock: v }, v ? 'Travar desenho' : 'Destravar desenho'), 'Travado'),
        note(s.lock ? 'Travado: um clique passa direto por ele e arrastar não move. Dois cliques selecionam, para destravar ou apagar.' : 'Travar serve para a arte de fundo: um clique passa direto por ela. Dois cliques ainda selecionam.')),
      h('div', { class: 'row' },
        btn('Duplicar', Act.duplicateSel, { icon: 'copy' }),
        btn('Frente', () => Act.toFront('shapes', shapes.map(x => x.id), true), { icon: 'front' }),
        btn('Trás', () => Act.toFront('shapes', shapes.map(x => x.id), false), { icon: 'back' }),
        btn('Apagar', deleteSelToast, { icon: 'trash', kind: 'danger' })),
    ];
  }

  function fxApply(e) {
    const sc = Store.scene();
    areaBox('Dentro de ' + (FX.P[e.fx] || FX.P.fogo).n, tokensIn(FX.geom(e, sc).path, sc), e.token, e);
  }
  // Reaplicar: um clique, sem janela. Vale para quem está dentro da área agora; o aviso diz o que foi feito.
  function fxReapply(e) {
    const r = Act.fxReapply(e);
    if (!r) { fxApply(e); return; }                        // nada guardado: cai na janela de sempre
    const name = (FX.P[e.fx] || FX.P.fogo).n;
    if (!r.inside) { toast('Nenhum token dentro da área.'); return; }
    if (r.n > 0) toast(`${name}: ${applyLabel(e.apply)} em ${r.n} ${r.n === 1 ? 'token' : 'tokens'}`, { action: 'Desfazer', run: Tools.undo });
    else toast(`${name}: nada mudou em quem está dentro da área.`);
  }
  const reapplyTitle = 'Aplica de novo, num clique, em quem está dentro da área agora';
  /* (lote 7) Os pontos de vida da Muralha de cristais: o campo aceita o dano com sinal ("-8" tira, "+5" devolve) ou o
     valor novo; em zero, ela quebra. "Quebrar" tira a muralha num clique. Tudo com Desfazer. */
  const pvMax = e => (e.pvm > 0 ? e.pvm : (FX.P[e.fx] || {}).pv || 30);
  const pvAgora = e => (Number.isFinite(e.pv) ? e.pv : pvMax(e));
  function quebrarMuralha(e, porDano) {
    if (!Store.get('effects', e.id)) return;
    const pr0 = FX.P[e.fx] || {}, fim = pr0.fimPv || (!(pr0.pv > 0) ? (pr0.n || 'A zona') + ' saiu da cena' : null);      // (lote 19: o Totem, a Parte Solta; lote 22: a zona que ganhou HP do mestre)
    Store.tx(fim ? 'Tirar ' + (FX.P[e.fx] || {}).n : 'Quebrar a muralha', () => Store.del('effects', e.id));
    toast(fim ? (porDano ? 'Os pontos acabaram: ' + fim[0].toLowerCase() + fim.slice(1) + '.' : fim + '.') : porDano ? 'Os pontos acabaram: a muralha quebrou.' : 'A muralha quebrou.', { action: 'Desfazer', run: Tools.undo });
  }
  function mudarPv(e, txt) {
    const s = String(txt).trim().replace(/\s+/g, '').replace('−', '-').replace(',', '.'), m = pvMax(e), p0 = pvAgora(e);
    let pv = /^[+-]\d+(\.\d+)?$/.test(s) ? p0 + Number(s) : /^\d+(\.\d+)?$/.test(s) ? Number(s) : null;
    if (pv == null) { renderSide(); return; }
    pv = clamp(Math.round(pv), 0, m);
    if (pv <= 0) { quebrarMuralha(e, true); return; }
    if (pv !== p0) Store.tx('Pontos de vida da zona', () => Store.upd('effects', e.id, { pv }));
  }
  /* (lote 22) qualquer zona pode ganhar pontos de vida do mestre (a barreira, o altar, a fogueira…): os jogadores veem a
     barrinha, sem os números. A que já nasce com pontos (a muralha, o Totem) não perde os dela. */
  const temPv = e => !!e && (((FX.P[e.fx] || {}).pv > 0) || e.pvm > 0);
  function darPv(e) {
    return sec('s-fx-pv', 'Pontos de vida', true,
      note('Esta zona não tem pontos de vida. Dê a ela, e o dano com sinal (−8) passa a tirar; em zero, ela sai da cena.'),
      h('div', { class: 'row' }, inNum('fx-pv-novo', 20, () => {}, { min: 1, max: 9999, step: 1, label: 'Pontos de vida da zona' }),
        btn('Dar pontos de vida', () => { const el = document.getElementById('fx-pv-novo'), n = clamp(Math.round(Number(el && el.value) || 20), 1, 9999); Store.tx('Dar pontos de vida à zona', () => Store.upd('effects', e.id, { pvm: n, pv: n })); toast(`${(FX.P[e.fx] || {}).n || 'A zona'} tem ${n} pontos de vida.`, { action: 'Desfazer', run: Tools.undo }); }, { icon: 'heart', id: 'fx-pv-dar' })));
  }
  function pvDaMuralha(e) {
    const m = pvMax(e), pv = pvAgora(e), proprio = !((FX.P[e.fx] || {}).pv > 0);
    return sec('s-fx-pv', 'Pontos de vida', true,
      h('div', { class: 'grid2' },
        field('Agora', inText('fx-pv', String(pv), v => mudarPv(e, v), { inputmode: 'decimal', 'aria-label': 'Pontos de vida da muralha agora (−8 tira, +5 devolve)', title: 'Digite o dano com sinal (−8) ou o valor novo' })),
        field('Máximo', inNum('fx-pvm', m, v => { const n = Math.max(1, Math.round(v)); Store.tx('Pontos de vida da muralha', () => Store.upd('effects', e.id, { pvm: n, pv: Math.min(pv, n) })); }, { min: 1, max: 9999, step: 1, label: 'Pontos de vida máximos da muralha' }))),
      note('O dano com sinal (−8) tira; o número sozinho vira o valor novo. Em zero, ' + ((FX.P[e.fx] || {}).fimPv || proprio ? 'some da cena.' : 'a muralha quebra.') + ' Os jogadores veem só a barrinha.'),
      h('div', { class: 'row' }, btn((FX.P[e.fx] || {}).fimPv || proprio ? 'Tirar' : 'Quebrar', () => quebrarMuralha(e), { icon: 'trash', kind: 'danger', id: 'fx-quebrar', title: 'Tira da cena (com Desfazer)' }),
        proprio ? btn('Sem pontos de vida', () => Store.tx('Tirar os pontos de vida da zona', () => Store.upd('effects', e.id, { pvm: null, pv: null })), { icon: 'reset', id: 'fx-pv-tirar', title: 'A zona volta a não ter pontos de vida (com Desfazer)' }) : null));
  }
  function fxPanel(e) {
    const sc = Store.scene(), gm = isGM();
    const U = (p, label) => Store.tx(label || 'Editar efeito', () => Store.upd('effects', e.id, p));
    const pr = FX.P[e.fx] || FX.P.fogo;
    const tok = e.token ? Store.get('tokens', e.token) : null;
    return [
      h('div', { class: 'p-head' }, h('canvas', { class: 'fx-thumb big', width: 88, height: 88, data: { fx: e.fx } }),
        h('div', { class: 'p-head-t' }, h('h3', { class: 'p-title', text: pr.n }), h('div', { class: 'p-sub', text: (tok ? 'Preso a ' + tok.name : 'Solto no mapa') + (pr.r ? ' · ' + pr.r : '') }))),
      // aplicar e reaplicar ficam logo no alto do painel: são o que se usa a cada rodada
      gm ? h('div', { class: 'row' },
        e.apply ? btn('Reaplicar ' + applyLabel(e.apply), () => fxReapply(e), { icon: 'reset', kind: 'primary re', id: 'fx-reapply', title: reapplyTitle }) : null,
        btn('Aplicar a quem está dentro…', () => fxApply(e), { icon: 'area', id: 'fx-apply', title: 'Dano, cura ou condição em todos os tokens dentro deste efeito' })) : null,
      // (lote 7) a regra da zona, e o que ela pede: revelar as runas, a condição da Distorção do tempo, os pontos da muralha
      pr.regra ? h('p', { class: 'fx-regra', id: 'fx-regra', text: pr.regra[0].toUpperCase() + pr.regra.slice(1) + '.' }) : null,
      pr.rc ? h('p', { class: 'fx-regra', id: 'fx-regra-classe', text: pr.rc + '.' }) : null,
      pr.oculta && gm ? h('div', { class: 'row' }, e.gm ? btn('Revelar aos jogadores', () => U({ gm: false }, 'Revelar as runas'), { icon: 'eye', kind: 'primary', id: 'fx-revelar' })
        : btn('Esconder de novo', () => U({ gm: true }, 'Esconder as runas'), { icon: 'eyeOff', id: 'fx-esconder' })) : null,
      pr.conds && gm ? field('Dentro dela', seg('fx-cond', (e.apply && e.apply.cond && e.apply.cond.id) || pr.cond, pr.conds.map(id => [id, (COND_BY_ID[id] || {}).n || id]),
        v => U({ apply: Object.assign({ bar: '', amt: '', skip: [] }, e.apply, { cond: Object.assign({ n: 0, d: 0 }, e.apply && e.apply.cond, { id: v }) }) }, 'Condição da zona')), 'stack tight') : null,
      gm ? (temPv(e) ? pvDaMuralha(e) : darPv(e)) : null,                    // (lote 22: qualquer zona)
      sec('s-fx', 'Efeito', true,
        field('Tipo', fxSelect('fx-id', e.fx, v => U(trocaDeZona(e, v, sc), 'Trocar efeito'))),
        // (um efeito que chegue sem as medidas do retângulo ganha, ao virar um, a caixa do que ele já era; o portal é sempre de círculos)
        pr.portal ? note('A entrada é o círculo roxo e a saída, o azul: arraste cada um para onde quiser.') : field('Forma', seg('fx-k', e.k, FX_SHAPES, v => U(v === 'rect' && !(e.rw > 0 && e.rh > 0) ? { k: v, rw: e.rw > 0 ? e.rw : Math.max(0.5, 2 * e.r || 1), rh: e.rh > 0 ? e.rh : Math.max(0.5, 2 * e.r || 1) } : { k: v }, 'Forma do efeito')), 'stack tight'),
        h('div', { class: 'grid2' },
          e.k === 'rect' ? field('Largura (q)', inNum('fx-rw', e.rw, v => U({ rw: v }), { min: 0.5, max: 60, step: 0.5 }))
            : field(e.k === 'line' ? 'Comprimento (q)' : e.k === 'cone' ? 'Alcance (q)' : 'Raio (q)', inNum('fx-r', e.r, v => U({ r: v }), { min: 0.5, max: 60, step: 0.5 })),
          e.k === 'rect' ? field('Altura (q)', inNum('fx-rh', e.rh, v => U({ rh: v }), { min: 0.5, max: 60, step: 0.5 })) : null,
          e.k === 'cone' ? field('Abertura (°)', inNum('fx-a', e.ang, v => U({ ang: v }), { min: 10, max: 340, step: 5 })) : null,
          e.k === 'line' ? field('Largura (q)', inNum('fx-w', e.w, v => U({ w: v }), { min: 0.5, max: 20, step: 0.5 })) : null,
          e.k !== 'circ' ? field(e.k === 'rect' ? 'Rotação (°)' : 'Direção (°)', inNum('fx-d', Math.round(e.dir || 0), v => U({ dir: ((v % 360) + 360) % 360 }), { min: -360, max: 720, step: 15 })) : null),
        field('Intensidade', inRange('fx-p', e.pow, 0.2, 1, 0.05, v => Store.upd('effects', e.id, { pow: v }), 'Intensidade do efeito')),
        // (lote 7, parte 4b) leve: um véu fraco e o contorno tracejado (as zonas dos lugares gerados, por cima do desenho do fundo)
        gm ? toggle('fx-leve', !!e.leve, v => U({ leve: v }, v ? 'Efeito leve' : 'Efeito cheio'), 'Leve: só um véu e o contorno tracejado (o desenho do fundo já mostra)') : null,
        note(e.k === 'rect' ? 'No mapa, a bolinha no meio do lado gira o retângulo e muda a largura; o quadradinho do canto muda largura e altura.' : 'Arraste a bolinha na borda do efeito para mudar o tamanho e a direção.')),
      sec('s-fx3', 'Duração', true,
        field('Rodadas', inCount('fx-dur', e.dur || 0, v => U({ dur: v, dur0: v, at: v && sc.turn.on ? sc.turn.cur : null }, 'Duração do efeito'), { label: 'Rodadas que o efeito ainda dura' })),
        note(e.dur > 0 ? 'Perde uma rodada cada vez que a vez voltar para quem estava jogando quando a duração foi marcada. Em zero, o efeito some sozinho.' : 'Vazio: o efeito fica na cena até alguém remover. Com um número, ele desconta sozinho na ordem de turnos.')),
      sec('s-fx2', 'Onde fica', true,
        pr.portal ? null : field('Preso a', inSelect('fx-tok', e.token || '', [['', 'Nada (fica no mapa)']].concat(sc.tokens.filter(t => gm || ownsTok(t)).map(t => [t.id, t.name])), v => {
          if (v) U({ token: v }, 'Prender efeito');
          else { const g = FX.geom(e, sc); U({ token: null, x: g.x, y: g.y }, 'Soltar efeito do token'); }
        })),
        gm ? toggle('fx-gm', !!e.gm, v => U({ gm: v }), 'Só o mestre vê') : null),
      h('div', { class: 'row' }, btn('Duplicar', Act.duplicateSel, { icon: 'copy' }), btn('Apagar', deleteSelToast, { icon: 'trash', kind: 'danger' })),
    ];
  }

  function lightPanel(l) {
    const U = (p, label) => Store.tx(label || 'Editar luz', () => Store.upd('lights', l.id, p));
    const sc = Store.scene();
    return [
      h('div', { class: 'p-head' }, h('span', { class: 'av', style: { width: '44px', height: '44px', backgroundColor: l.c, color: '#1b1608', borderColor: 'var(--line-strong)' } }, icon('light', 22)),
        h('div', { class: 'p-head-t' }, h('h3', { class: 'p-title', text: l.name || 'Luz' }), h('div', { class: 'p-sub', text: l.on ? 'Acesa' : 'Apagada' }))),
      sc.light === 'claro' ? h('div', { class: 'callout' }, h('span', { text: 'A cena está clara, então esta luz ainda não muda nada. ' }), btn('Pôr em penumbra', () => Store.tx('Luz ambiente', () => Store.scn({ light: 'penumbra' })), { kind: 'small' })) : null,
      sec('s-light', 'Luz', true,
        toggle('lz-on', l.on, v => U({ on: v }, v ? 'Acender luz' : 'Apagar luz'), 'Acesa'),
        field('Nome', inText('lz-name', l.name, v => U({ name: v.trim() || l.name }))),
        field('Tipo', inSelect('lz-pre', '', [['', 'Escolher…']].concat(LIGHT_PRESETS.map(p => [p.id, p.n])), v => { const p = LIGHT_PRESETS.find(x => x.id === v); if (p) U({ name: p.n, bright: p.bright, dim: p.dim, c: p.c, fl: p.fl || undefined }, 'Tipo de luz'); })),
        toggle('lz-fl', !!l.fl, v => U({ fl: v ? true : undefined }, 'Luz que tremula'), 'Tremula, como chama'),
        h('div', { class: 'grid2' },
          field('Luz forte (q)', inNum('lz-b', l.bright, v => U({ bright: Math.min(v, l.dim) }), { min: 0, max: 60, step: 0.5 })),
          field('Até (q)', inNum('lz-d', l.dim, v => U({ dim: v, bright: Math.min(l.bright, v) }), { min: 0.5, max: 60, step: 0.5 }))),
        field('Cor', inColor('lz-c', l.c, v => Store.upd('lights', l.id, { c: v }), 'Cor da luz')),
        note('As paredes bloqueiam a luz. Portas abertas deixam passar.')),
      h('div', { class: 'row' }, btn('Duplicar', Act.duplicateSel, { icon: 'copy' }), btn('Apagar', deleteSelToast, { icon: 'trash', kind: 'danger' })),
    ];
  }

  function wallPanel(walls) {
    const w = walls[0], many = walls.length > 1;
    const all = (p, label) => Store.tx(label || 'Editar parede', () => walls.forEach(x => Store.upd('walls', x.id, p)));
    const kind = walls.every(x => wallKindOf(x) === wallKindOf(w)) ? wallKindOf(w) : '';
    const setKind = v => all(v === 'door' || v === 'secret' ? { k: 'door', secret: v === 'secret', open: false, locked: false } : { k: v, secret: false, open: false, locked: false }, 'Tipo de parede');
    // Porta, janela e cortina abrem e fecham (a secreta, não: abrir é revelar). O rótulo do interruptor diz o estado.
    const opens = kind === 'door' || kind === 'window' || kind === 'veil', nOpen = walls.filter(x => x.open).length;
    const openLabel = many ? (nOpen === walls.length ? 'Abertas' : nOpen ? 'Algumas abertas' : 'Fechadas') : nOpen ? 'Aberta' : 'Fechada';
    return [
      h('div', { class: 'p-head' }, h('div', { class: 'p-head-t' }, h('h3', { class: 'p-title', text: many ? `${walls.length} trechos` : WALL_NAMES[kind] || 'Parede' }), h('div', { class: 'p-sub', text: 'Arraste as pontas para ajustar.' }))),
      sec('s-wall', 'Tipo', true,
        seg('wl-k', kind, WALL_SEG, setKind),
        opens ? toggle('wl-open', nOpen === walls.length, v => all({ open: v }, (v ? 'Abrir ' : 'Fechar ') + OPENING_NAMES[kind][0]), openLabel) : null,
        opens ? toggle('wl-lock', walls.every(x => x.locked), v => all({ locked: v }, (v ? 'Trancar ' : 'Destrancar ') + OPENING_NAMES[kind][0]), 'Trancada (jogadores não abrem)') : null,
        kind === 'secret' ? h('div', { class: 'row' }, btn('Revelar aos jogadores', () => all({ secret: false }, 'Revelar porta secreta'), { icon: 'eye', id: 'wl-reveal' })) : null,
        note(kind ? WALL_NOTES[kind] : 'Trechos de tipos diferentes. Escolher um tipo acima vale para todos.')),
      h('div', { class: 'row' }, btn('Apagar', deleteSelToast, { icon: 'trash', kind: 'danger' })),
    ];
  }

  function tabSel() {
    const toks = selOf('tokens'), shapes = selOf('shapes'), fxs = selOf('effects'), lights = selOf('lights'), walls = selOf('walls');
    const total = toks.length + shapes.length + fxs.length + lights.length + walls.length;
    if (!total) return emptySel();
    if (toks.length === total) {
      const props = toks.filter(t => t.prop), gente = toks.filter(t => !t.prop);
      if (!gente.length) return propPanel(props);
      return gente.length === 1 && !props.length ? tokenPanel(gente[0]) : multiTokenPanel(gente, props);
    }
    if (shapes.length === total) return shapes.every(isTer) ? Luta.terrainPanel(shapes) : shapePanel(shapes);
    if (fxs.length === 1 && total === 1) return fxPanel(fxs[0]);
    if (lights.length === 1 && total === 1) return lightPanel(lights[0]);
    if (walls.length === total) return wallPanel(walls);
    return [
      h('div', { class: 'p-head' }, h('div', { class: 'p-head-t' }, h('h3', { class: 'p-title', text: `${total} itens` }), h('div', { class: 'p-sub', text: 'Seleção de tipos diferentes. Dá para mover, duplicar ou apagar tudo junto.' }))),
      h('div', { class: 'row' }, btn('Duplicar', Act.duplicateSel, { icon: 'copy' }), btn('Apagar', deleteSelToast, { icon: 'trash', kind: 'danger' })),
    ];
  }

  /* ---- Aba Turnos ---- */
  /* A iniciativa que alguém rolou pela telinha de dados da mesa ao vivo (App.iniRolls, por ficha) fica oferecida ao
     mestre por 15 minutos: num aviso, na hora, e num botão ao lado da entrada do token na ordem de turnos. Nada é
     anotado sozinho. Vale para a entrada que receberia o valor: a primeira sem iniciativa (ou a primeira). */
  const INI_OFFER_MS = 15 * 60 * 1000;
  function iniPending(t) {
    const r = t && t.char ? App.iniRolls.get(t.char) : null;
    if (!r) return null;
    if (Date.now() - r.at > INI_OFFER_MS) { App.iniRolls.delete(t.char); return null; }
    return r;
  }
  function iniOffer(t, e) {
    const r = iniPending(t);
    if (!r) return null;
    const es = Store.scene().turn.list.filter(x => x.token === t.id).sort((p, q) => (p.k || 1) - (q.k || 1));
    const alvo = es.find(x => x.init == null) || es[0];
    return alvo && alvo.id === e.id && e.init !== r.v ? r : null;
  }
  function noteIni(t) {
    const r = iniPending(t);
    if (!r) return;
    App.iniRolls.delete(t.char);
    Act.turnNote(t, r.v, r.d, r.b);
    toast(`Iniciativa de ${t.name} anotada: ${r.v}.`, { action: 'Desfazer', run: Tools.undo });
  }
  /* Chegou da mesa ao vivo uma iniciativa rolada pela telinha de dados. Só o mestre trata, e só quando a cena aberta
     tem um token ligado àquela ficha. Quem rolou tem de ser o dono da ficha, ou o próprio mestre. */
  function iniFromTable(l) {
    const s = l && l.dados && l.dados.sis;
    if (!isGM() || !Fichas.on() || !s || s.t !== 'ini' || !l.nova || typeof s.c !== 'string') return;
    const v = Math.round(Number(s.v)), d = Math.round(Number(s.d)), b = Math.round(Number(s.b));
    if (!isFinite(v) || Math.abs(v) > 999 || !(d >= 1 && d <= 20) || !isFinite(b) || d + b !== v) return;
    const ficha = Fichas.get(s.c), eu = window.TC && window.TC.ponte ? window.TC.ponte.estado.eu : null;
    if (!ficha || !(l.autor_id === eu || (ficha.dono_id && ficha.dono_id === l.autor_id))) return;
    const sc = Store.scene(), t = sc.tokens.find(x => x.char === s.c);
    if (!t) return;
    App.iniRolls.set(s.c, { v, d, b, nome: String(l.autor_nome || '').slice(0, 40) || 'Alguém', at: Date.now() });
    const naOrdem = sc.turn.list.some(e => e.token === t.id);
    if (window.innerWidth > 0) toast(`${ficha.nome || t.name} rolou iniciativa: ${v}.`, { action: naOrdem ? 'Anotar na ordem' : 'Pôr na ordem', run: () => noteIni(t), long: true });
    refresh();
  }
  // Aviso do que saiu numa rolagem de iniciativa: uma só, por extenso; várias, um resumo curto (as 4 maiores e "+N").
  function rollToast(res) {
    if (!res.length) return;
    const undo = { action: 'Desfazer', run: Tools.undo };
    if (res.length === 1) { const r = res[0]; toast(`${r.name}: iniciativa ${r.total} (${rollText(r.d, r.bonus)})`, undo); return; }
    const top = res.slice().sort((p, q) => q.total - p.total || q.bonus - p.bonus);
    toast('Iniciativa: ' + top.slice(0, 4).map(r => `${r.name} ${r.total}`).join(' · ') + (top.length > 4 ? ` +${top.length - 4}` : ''), undo);
  }
  // "Rolar iniciativa": rola para quem ainda não tem. Se todos já têm, pergunta antes de trocar os valores.
  function rollAll() {
    const tn = Store.scene().turn, missing = tn.list.filter(e => e.init == null);
    if (!tn.list.length) return;
    if (missing.length) { rollToast(Act.turnRoll(missing.map(e => e.id))); return; }
    confirmBox('Rolar de novo a iniciativa de todos?', 'Todos já têm iniciativa. Os valores de agora serão trocados pelos da rolagem nova.', 'Rolar de novo')
      .then(yes => { if (yes) rollToast(Act.turnRoll(Store.scene().turn.list.map(e => e.id))); });
  }
  // Entrada avulsa: quem joga sem ter token no mapa (armadilha, reforço, evento).
  function looseBox() {
    const name = h('input', { id: 'dlg-in', class: 'in', type: 'text', 'data-focus': '', autocomplete: 'off', maxlength: 40 });
    const ini = h('input', { id: 'le-ini', class: 'in num', type: 'number', min: -99, max: 99, step: 1, value: 0, title: 'Bônus de iniciativa: a rolagem é 1d20 + este valor' });
    const turns = h('input', { id: 'le-turns', class: 'in num', type: 'number', min: 1, max: MAX_TURNS, step: 1, value: 1 });
    modal({
      title: 'Entrada avulsa', text: 'Para o que joga sem ter token no mapa: uma armadilha, um reforço, um evento.',
      body: h('div', { class: 'loose' }, field('Nome', name, 'stack'), h('div', { class: 'grid2' }, field('Iniciativa', ini), field('Turnos por rodada', turns))),
      actions: [{ label: 'Cancelar' }, {
        label: 'Adicionar', kind: 'primary', run: () => {
          const nm = name.value.trim();
          if (!nm) { toast('Dê um nome à entrada.'); name.focus(); return false; }
          Act.turnLoose(nm, parseFloat(ini.value), parseFloat(turns.value));
        },
      }],
    });
  }
  /* Faixa de iniciativa de um grupo: criar (com os tokens selecionados) ou mudar uma que já existe. Mostra quem fica
     nela (dá para tirar alguém) e, ao mudar, os selecionados que ainda não estão nela (dá para pôr). */
  function bandBox(e) {
    const sc = Store.scene(), novo = !e, sel = selOf('tokens').filter(k => !k.prop);
    const atuais = novo ? sel : turnToks(e), fora = novo ? [] : sel.filter(k => !e.toks.includes(k.id));
    if (novo && !atuais.length) { toast('Selecione no mapa os tokens do grupo.'); return; }
    // nome de partida: o nome que todos têm em comum, sem o número do fim ("Goblin 1", "Goblin 2" → "Goblin")
    const raiz = k => tokName(k).replace(/[\s#]*\d+$/, '').trim();
    const comum = atuais.length && atuais.every(k => raiz(k) === raiz(atuais[0])) ? raiz(atuais[0]) : '';
    const name = h('input', { id: 'dlg-in', class: 'in', type: 'text', 'data-focus': '', autocomplete: 'off', maxlength: 40, value: novo ? comum || 'Grupo' : e.name });
    const ini = h('input', { id: 'bd-ini', class: 'in num', type: 'number', min: -99, max: 99, step: 1, value: novo ? Math.max(...atuais.map(k => clampIni(k.ini))) : clampIni(e.bonus), title: 'A iniciativa da faixa: 1d20 + este valor, rolada uma vez no combate' });
    const marcas = [];
    /* (lote 8) Quem já está em outra faixa vem desmarcado (com o nome dela): marcar traz para esta. Antes vinha marcado, e
       uma seleção que ainda tinha os tokens da primeira faixa esvaziava a primeira — que sumia. */
    const linha = (k, on) => {
      const cb = h('input', { type: 'checkbox', checked: on, id: 'bd-' + k.id });
      marcas.push([k.id, cb]);
      const outra = bandOf(sc.turn, k.id), dela = !novo && outra && outra.id === e.id;
      const onde = dela ? '' : outra ? (on ? `sai da faixa "${outra.name}"` : `está na faixa "${outra.name}": marque para trazer`)
        : (novo || !on) && sc.turn.list.some(x => x.token === k.id) ? 'sai da linha dele' : '';
      return h('label', { class: 'band-m' }, cb, tokenAvatar(k, 22), h('span', { class: 'band-mn', text: tokName(k) }), onde ? h('span', { class: 'band-mx', text: onde }) : null);
    };
    const lista = h('div', { class: 'band-list', id: 'bd-list' }, atuais.map(k => linha(k, !novo || !bandOf(sc.turn, k.id))), fora.length ? h('div', { class: 'band-sub', text: 'Selecionados que não estão nela' }) : null, fora.map(k => linha(k, false)));
    const quem = () => marcas.filter(([, cb]) => cb.checked).map(([id]) => id);
    modal({
      title: novo ? 'Faixa de iniciativa do grupo' : 'Faixa: ' + e.name,
      text: 'Uma linha só na ordem para todos estes tokens, com uma iniciativa rolada uma vez no combate (1d20 + o valor da faixa). Quem tirar mais que a faixa joga antes do grupo; quem tirar menos, depois. Empate: o jogador vai antes.',
      body: h('div', { class: 'bandbox' }, h('div', { class: 'grid2' }, field('Nome', name, 'stack'), field('Iniciativa (1d20 + …)', ini, 'stack')), lista),
      actions: [
        novo ? null : { label: 'Separar em linhas', run: () => { const n = Act.bandSplit(e.id); toast(n ? `A faixa virou ${n} ${n === 1 ? 'linha' : 'linhas'}, uma para cada turno de cada token.` : 'A faixa saiu da ordem.', { action: 'Desfazer', run: Tools.undo }); } },
        { label: 'Cancelar' },
        {
          label: novo ? 'Criar a faixa' : 'Salvar', kind: 'primary', run: () => {
            const ids = quem();
            if (!ids.length) { toast(novo ? 'Marque pelo menos um token.' : 'Para tirar a faixa da ordem, use o × na linha dela.'); return false; }
            const nm = name.value.trim() || 'Grupo', b = parseFloat(ini.value);
            if (novo) { Act.turnBand(nm, b, ids); toast(`Faixa "${nm}" na ordem: ${ids.length} ${ids.length === 1 ? 'token' : 'tokens'}, 1d20 ${rollText('', clampIni(b)).trim()}.`, { action: 'Desfazer', run: Tools.undo }); }
            else Act.bandSet(e.id, { name: nm, bonus: b, toks: ids });
          },
        },
      ],
    });
  }
  /* (lote 8) Encerrar o combate zera a iniciativa de todos — as da ordem (com a rolagem e a marca de reação) e as
     rolagens da mesa ao vivo que ainda não foram anotadas —: o próximo combate começa do zero. Um passo de desfazer. */
  function encerrarCombate() {
    const tinha = Store.scene().turn.list.some(e => e.init != null) || App.iniRolls.size > 0;
    Act.turnPatch(x => { x.on = false; for (const e of x.list) { e.init = null; e.roll = null; delete e.reac; } }, 'Encerrar combate');
    App.iniRolls.clear();
    toast(tinha ? 'Combate encerrado: a iniciativa de todos foi zerada para o próximo.' : 'Combate encerrado.', { action: 'Desfazer', run: Tools.undo });
    // (lote 23) o aviso que oferece restaurar as energias de quem lutou (nada acontece sozinho)
    const lutaram = tokensDoCombate(Store.scene()).map(t => t.id);
    if (restauroDe(lutaram.map(id => Store.get('tokens', id)).filter(Boolean)).length)
      toast('Restaurar as energias de quem lutou? (o que não é HP nem SP volta ao natural)', { key: 'restaurar', long: true, action: 'Restaurar', run: () => aplicarRestauro(restauroDe(lutaram.map(id => Store.get('tokens', id)).filter(Boolean))) });
    if (barrinhasPrefs().combate) telaBarrinhas('O combate acabou: as barrinhas', tokensDoCombate(Store.scene()));      // (lote 22)
  }
  function tabTurn() {
    const sc = Store.scene(), tn = sc.turn, gm = isGM();
    const rows = [];
    // Tirar uma entrada: se era um dos vários turnos de um token, o número dele desce junto, e a mesa diz.
    const remove = e => {
      const t = Act.turnRemove(e.id);
      if (t) toast(`${t.name} agora tem ${t.turns} ${t.turns === 1 ? 'turno' : 'turnos'} por rodada.`, { action: 'Desfazer', run: Tools.undo });
    };
    tn.list.forEach((e, i) => {
      const t = e.token ? Store.get('tokens', e.token) : null;
      if (!gm && ((t && t.hidden) || e.inv)) return;           // (a linha invisível: só o mestre a vê)
      const band = isBand(e), membros = band ? turnToks(e).filter(k => gm || !k.hidden) : [];
      const cur = tn.on && e.id === tn.cur;
      const name = t ? tokName(t) : e.name, label = turnLabel(e, name), k = e.k || 1;
      const rolled = gm && e.roll && e.init != null ? rollText(e.roll.d, e.roll.b) : '';      // o detalhe da rolagem é só do mestre
      // um clique na linha mostra no mapa: o token, ou os da faixa (os que quem olha enxerga)
      const mostrar = () => {
        const vis = (band ? membros : t ? grupoDoClone(t, sc) : []).filter(x => tokShown(x, sc));      // (lote 8: o real de um Clone vem com as cópias)
        if (!vis.length) return;
        setSel(vis.map(x => ({ c: 'tokens', id: x.id })));
        const cs = vis.map(x => tokC(x, sc));
        Render.centerOn(cs.reduce((a, c) => a + c[0], 0) / cs.length, cs.reduce((a, c) => a + c[1], 0) / cs.length);
      };
      const reac = e.reac ? h('span', { class: 'turn-reac', text: 'reação', title: 'Esperando para reagir: segurou a vez para agir fora de ordem' }) : null;
      const inv = gm && e.inv ? h('span', { class: 'turn-inv', text: 'invisível', title: 'Os jogadores não veem esta linha; na vez dela, só ficam sabendo que o turno está com o mestre' }) : null;
      rows.push(h('li', { class: 'turn' + (cur ? ' cur' : '') + (band ? ' band' : '') + (e.reac ? ' reac' : '') + (gm && e.inv ? ' inv' : ''), id: `tl-${e.id}` },
        h('button', { type: 'button', class: 'turn-m', title: t || membros.length ? 'Mostrar no mapa' : label, disabled: !t && !membros.length, onclick: mostrar },
          t ? tokenAvatar(t, 28)
            : band && membros.length ? h('span', { class: 'band-av' }, membros.slice(0, 3).map(x => tokenAvatar(x, 22)))
            : h('span', { class: 'av', style: { width: '28px', height: '28px', backgroundColor: 'var(--hover)', color: 'var(--fg-2)', fontSize: '11px', borderColor: 'var(--line-strong)' } }, initials(name)),
          // nome, número do turno, detalhe da rolagem e a marca "vez": quebram de linha entre si quando não cabem
          // (na tela, a marca "vez" vem logo depois do nome; no texto, fica no fim, para o rótulo sair inteiro)
          h('span', { class: 'turn-t' }, h('span', { class: 'turn-n', text: name }),
            k > 1 ? h('span', { class: 'turn-k', text: ` · ${k}º turno` }) : null,
            band ? h('span', { class: 'turn-g', text: `grupo · ${membros.length}`, title: membros.map(x => tokName(x)).join(', ') || 'Ninguém nesta faixa agora' }) : null,
            rolled ? h('span', { class: 'turn-r', text: `(${rolled})`, title: `Rolagem: ${e.init} = ${rolled}` }) : null,
            cur ? h('span', { class: 'turn-now', text: 'vez' }) : null,
            reac, inv)),
        gm ? inNum(`tn-${e.id}`, e.init == null ? '' : e.init, v => Act.turnPatch(x => { const y = x.list.find(z => z.id === e.id); if (y) { y.init = v; y.roll = null; } }, 'Iniciativa'),
          { step: 1, label: 'Iniciativa de ' + label, title: rolled ? `Iniciativa de ${label}: ${e.init} (${rolled})` : 'Iniciativa de ' + label })
          : h('span', { class: 'turn-i', text: e.init == null ? '–' : fmt(e.init) }),
        gm ? iconBtn('die', `Rolar a iniciativa de ${label} (1d20 ${rollText('', turnBonus(e)).trim()})`, () => rollToast(Act.turnRoll([e.id])), { size: 15, cls: 'turn-d', id: `tr-${e.id}` }) : null,
        gm && t && iniOffer(t, e) ? h('button', { type: 'button', class: 'turn-mesa', id: `tm-${e.id}`, title: `${iniOffer(t, e).nome} rolou ${iniOffer(t, e).v} de iniciativa pela mesa ao vivo. Clique para anotar aqui.`, onclick: () => noteIni(t) },
          icon('down', 12), h('span', { text: String(iniOffer(t, e).v) })) : null,
        // a faixa (mudar) e a reação ficam num grupo à parte, antes de subir/descer/tirar
        gm && (band || cur || e.reac) ? h('span', { class: 'turn-x' },
          band ? iconBtn('edit', 'Mudar a faixa: nome, iniciativa e quem está nela', () => bandBox(e), { size: 14, id: `tb-${e.id}` }) : null,
          // (segurar a vez para reagir se decide na própria vez: o botão fica na linha de quem está jogando, e na de quem
          // está esperando, para dizer que ele reagiu)
          cur || e.reac ? iconBtn('reac', e.reac ? `${label} reagiu: tirar a marca "esperando para reagir" (ela também sai sozinha quando a vez dele voltar)` : 'Esperando para reagir: marca quem segura a vez para agir fora de ordem', () => {
            Act.turnReac(e.id, !e.reac);
            if (e.reac) toast(`${label} reagiu.`, { action: 'Desfazer', run: Tools.undo });
          }, { size: 14, on: !!e.reac, id: `tx-${e.id}` }) : null) : null,
        // a linha invisível (lote 6): o olho fica no mesmo lugar em todas as linhas; aceso, a linha está escondida
        gm ? h('span', { class: 'turn-o' },
          iconBtn(e.inv ? 'eyeOff' : 'eye', e.inv ? `${label}: invisível para os jogadores (clique para mostrar)` : `Esconder ${label} dos jogadores: a linha some da ordem deles e, na vez dela, eles só veem que o turno está com o mestre`, () => {
            const n = Act.turnInv(e.id, !e.inv), quem = name;
            if (n) toast(e.inv ? (n > 1 ? `As ${n} linhas de ${quem} voltam a aparecer para os jogadores.` : `${label} volta a aparecer para os jogadores.`)
              : (n > 1 ? `As ${n} linhas de ${quem} ficam invisíveis para os jogadores.` : `${label} fica invisível para os jogadores.`), { action: 'Desfazer', run: Tools.undo });
          }, { size: 14, on: !!e.inv, cls: 'turn-v', id: `tv-${e.id}` })) : null,
        gm ? h('span', { class: 'turn-a' },
          iconBtn('up', 'Subir', () => Act.turnPatch(x => { if (i > 0) { const [m] = x.list.splice(i, 1); x.list.splice(i - 1, 0, m); } }), { size: 14, disabled: i === 0 }),
          iconBtn('down', 'Descer', () => Act.turnPatch(x => { if (i < x.list.length - 1) { const [m] = x.list.splice(i, 1); x.list.splice(i + 1, 0, m); } }), { size: 14, disabled: i === tn.list.length - 1 }),
          iconBtn('x', 'Tirar da ordem', () => remove(e), { size: 14 })) : null));
    });
    const selToks = selOf('tokens').filter(k => !k.prop);
    const step = d => passarTurno(d);
    const missing = tn.list.filter(e => e.init == null).length;
    return [
      h('div', { class: 'turn-head' },
        h('div', null, h('div', { class: 'p-sub', text: tn.on ? 'Combate em andamento' : 'Combate parado' }), h('div', { class: 'round', text: 'Rodada ' + tn.round })),
        gm ? h('div', { class: 'row tight' },
          iconBtn('prev', 'Turno anterior (o que já foi descontado não volta; para isso, use Desfazer)', () => step(-1), { disabled: !tn.list.length, id: 'turnPrev' }),
          btn('Próximo turno', () => step(1), { kind: 'primary', icon: 'next', disabled: !tn.list.length, id: 'turnNext' })) : null),
      // na vez de uma linha invisível, o jogador só fica sabendo que o turno está com o mestre
      !gm && vezDoMestre(tn) ? h('p', { class: 'turn-mestre', id: 'turnMestre' }, icon('eyeOff', 14), h('span', { text: 'O turno está com o mestre.' })) : null,
      rows.length ? h('ol', { class: 'turns' }, rows) : h('p', { class: 'muted', text: gm ? 'Ninguém na ordem ainda. Selecione tokens no mapa e adicione-os aqui.' : 'O mestre ainda não montou a ordem de turnos.' }),
      gm ? h('div', { class: 'row' },
        btn(selToks.length ? `Adicionar ${selToks.length} selecionado${selToks.length > 1 ? 's' : ''}` : 'Adicionar selecionados', () => { if (!Act.turnAdd(selToks)) toast(selToks.length === 1 ? 'Ele já está na ordem.' : 'Já estão todos na ordem.'); }, { icon: 'plus', disabled: !selToks.length }),
        btn('Faixa de grupo', () => bandBox(null), { icon: 'users', id: 'turnBand', disabled: !selToks.length, title: 'Junta os tokens selecionados numa linha só da ordem, com uma iniciativa (1d20 + o valor da faixa) rolada uma vez no combate' }),
        btn('Entrada avulsa', looseBox, { id: 'turnLoose', title: 'Põe na ordem algo que não tem token no mapa: armadilha, reforço, evento' })) : null,
      gm && tn.list.length ? h('div', { class: 'row' },
        btn('Rolar iniciativa', rollAll, { icon: 'die', id: 'turnRoll', title: missing ? 'Rola 1d20 + Iniciativa para quem ainda não tem iniciativa e ordena a lista' : 'Todos já têm iniciativa: rolar de novo troca os valores (a mesa pergunta antes)' }),
        btn(tn.on ? 'Encerrar' : 'Iniciar', () => { if (tn.on) { encerrarCombate(); return; } const antes = vezAgora(); Act.turnPatch(x => { x.on = true; x.round = 1; x.cur = x.list[0].id; x.back = 0; }, 'Iniciar combate'); depoisDaVez(antes, 1); },
          { icon: tn.on ? 'stop' : 'play', id: 'turnOnOff', title: tn.on ? 'Encerra o combate e zera a iniciativa de todos, para o próximo começar do zero (dá para desfazer)' : null }),
        btn('Ordenar por iniciativa', () => Act.turnPatch(x => { turnSort(x.list); }, 'Ordenar turnos'), { icon: 'sort' }),
        btn('Limpar', () => Act.turnPatch(x => { x.list = []; x.on = false; x.round = 1; x.back = 0; }, 'Limpar turnos'), { icon: 'trash' })) : null,
      gm && tn.list.length ? note('Passar a vez desconta as durações de condições e efeitos e limpa as miras. Contadores só mudam na mão.') : null,
      // (lote 23) restaurar as energias: tudo que não é HP nem SP volta ao estado natural (o "começa em" da barra, ou cheia)
      gm ? h('div', { class: 'row' }, btn('Restaurar energias…', janelaRestaurar, { icon: 'rest', id: 'turnRestaurar', title: 'As barras que não são HP nem SP voltam ao estado natural (o “começa em” delas; sem ele, cheias). Com tokens selecionados, só eles; sem seleção, todos da cena. Mostra antes o que muda.' })) : null,
      // (lote 22) a tela das barrinhas: quando ela abre sozinha (da mesa: vale em todas as cenas)
      gm ? sec('t-barrinhas', 'Tela das barrinhas', false,
        ...[['combate', 'Ao começar e ao encerrar o combate (todos)'], ['rodada', 'No começo de cada rodada (todos)'], ['vez', 'Na vez de cada um (só ele)']].map(([k, rot]) =>
          toggle('bb-' + k, barrinhasPrefs()[k], v => { Store.S.prefs.barrinhas = Object.assign(barrinhasPrefs(), { [k]: v }); Persist.meta({ pub: false }); refresh(); }, rot)),
        h('div', { class: 'row' }, btn('Abrir agora (todos)', () => telaBarrinhas('Barrinhas', tokensDoCombate(Store.scene())), { icon: 'sliders', id: 'bb-abrir' })),
        note('A tela mostra as barras de cada um com um campo: −5 tira, +3 soma, 12 vira o valor. “Aplicar” faz tudo num passo, com Desfazer.')) : null,
    ];
  }
  /* (lote 22) A tela das barrinhas: o mestre dá e desconta as barras de quem está no combate, num passo só. Abre sozinha
     nos momentos ligados na aba Turnos (de começo, só na vez de cada um), e pelo botão "Abrir agora". */
  const BARRINHAS_PADRAO = { combate: false, rodada: false, vez: true };
  function barrinhasPrefs() { let semTela = false; try { semTela = localStorage.getItem('tinycats:testes-sem-barrinhas') === '1'; } catch (e) { /* sem armazenamento */ } if (semTela) return { combate: false, rodada: false, vez: false }; const p = Store.S.prefs.barrinhas; return Object.assign({}, BARRINHAS_PADRAO, p && typeof p === 'object' ? p : {}); }
  function tokensDe(sc, entradas) {
    const ids = [];
    for (const e of entradas) { if (e.token) ids.push(e.token); if (isBand(e)) ids.push(...e.toks); }
    return [...new Set(ids)].map(id => Store.get('tokens', id)).filter(t => t && !t.prop && (t.bars || []).some(b => b && b.on !== false));
  }
  const tokensDoCombate = sc => tokensDe(sc, sc.turn.list);
  function lerBarrinha(b, txt) {
    const s = String(txt || '').trim().replace(/\s+/g, '').replace('−', '-').replace(',', '.');
    if (!s) return null;
    if (/^[+-]\d+(\.\d+)?%?$/.test(s)) { const d = s.endsWith('%') ? Math.round(b.m * Number(s.slice(0, -1)) / 100) : Number(s); return d ? barAfter(b, d) : null; }
    if (/^\d+(\.\d+)?$/.test(s)) { const v = clamp(Math.round(Number(s) * 10) / 10, -barLo(b), barTeto(b)); return v === b.v ? null : { v }; }
    return false;
  }
  function telaBarrinhas(titulo, toks) {
    if (!isGM() || !toks.length) return;
    const campos = [];
    const linhas = toks.map(t => h('li', { class: 'bb-t', 'data-tok': t.id },
      h('b', { class: 'bb-nome', text: tokName(t) }),
      h('div', { class: 'bb-barras' }, (t.bars || []).map((b, i) => {
        if (!b || b.on === false) return null;
        const inp = h('input', { class: 'in bb-in', id: `bb-${t.id}-${i}`, inputmode: 'decimal', placeholder: '±', 'aria-label': `${b.n} de ${tokName(t)} (−5 tira, +3 soma, 12 vira o valor)`, autocomplete: 'off' });
        campos.push({ t, i, inp });
        return h('label', { class: 'bb-b' }, h('span', { class: 'bb-dot', style: { background: b.c } }), h('span', { class: 'bb-n', text: b.n }), h('span', { class: 'bb-v', text: `${fmtV(b.v)}/${fmt(b.m)}` }), inp);
      }))));
    modal({ title: titulo, wide: true, body: h('div', { class: 'bb-tela', id: 'bb-tela' }, h('ul', { class: 'bb-lista' }, linhas),
      note('−5 tira, +3 soma, 12 vira o valor (−10% tira 10% do máximo). Em branco, nada muda.')),
      actions: [{ label: 'Pular' }, { label: 'Aplicar', kind: 'primary', run: () => {
        const mud = new Map(); let ruim = null;
        for (const c of campos) {
          const t = Store.get('tokens', c.t.id), b = t && t.bars[c.i];
          if (!b) continue;
          const p = lerBarrinha(b, c.inp.value);
          if (p === false) { ruim = c.inp; break; }
          if (!p) continue;
          if (!mud.has(t.id)) mud.set(t.id, t.bars.slice());
          mud.get(t.id)[c.i] = barWith(b, p);
        }
        if (ruim) { ruim.focus(); toast('Use −5, +3 ou um número.'); return false; }
        if (!mud.size) return;
        Store.tx('Barrinhas', () => { for (const [id, bars] of mud) Store.upd('tokens', id, { bars }); });
        toast(`Barrinhas: ${mud.size === 1 ? tokName(Store.get('tokens', [...mud.keys()][0])) : mud.size + ' personagens'} ${mud.size === 1 ? 'mudou' : 'mudaram'}.`, { action: 'Desfazer', run: Tools.undo });
      } }] });
    const prim = campos[0] && document.getElementById(campos[0].inp.id); if (prim) setTimeout(() => prim.focus(), 30);
  }
  /* (lote 23) Restaurar as energias: as barras que não são HP nem SP voltam ao estado natural — o "começa em" da barra
     (na ficha, o das barras especiais também), ou cheia. As de HP e SP (pelo nome: HP, Vida, PV, SP) ficam como estão.
     Pela aba Turnos (com a prévia) e pelo aviso do fim do combate. Num passo só, com Desfazer. */
  const NOMES_VIDA_SP = new Set(['hp', 'vida', 'pv', 'sp', 'pontos de vida']);
  const normNome = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const ehVidaOuSp = b => NOMES_VIDA_SP.has(normNome(b.n));
  function restauroDe(toks) {
    return toks.map(t => ({ t, m: (t.bars || []).map((b, i) => ({ b, i })).filter(({ b }) => b && b.on !== false && !ehVidaOuSp(b) && Math.abs((Number(b.v) || 0) - barFull(b)) > 1e-9)
      .map(({ b, i }) => ({ i, n: b.n, c: b.c, de: Number(b.v) || 0, para: barFull(b) })) })).filter(x => x.m.length);
  }
  function aplicarRestauro(lista) {
    if (!lista.length) { toast('Nada a restaurar: as energias já estão no natural.'); return; }
    Store.tx('Restaurar energias', () => {
      for (const x of lista) {
        const t = Store.get('tokens', x.t.id); if (!t) continue;
        const bars = t.bars.slice();
        for (const m of x.m) if (bars[m.i]) bars[m.i] = barWith(bars[m.i], { v: m.para });
        Store.upd('tokens', t.id, { bars });
      }
    });
    const n = lista.length;
    toast(`Energias restauradas: ${n === 1 ? tokName(Store.get('tokens', lista[0].t.id) || lista[0].t) : n + ' tokens'}.`, { action: 'Desfazer', run: Tools.undo });
  }
  function janelaRestaurar() {
    if (!isGM()) return;
    const sel = selOf('tokens').filter(t => !t.prop), toks = sel.length ? sel : Store.scene().tokens.filter(t => !t.prop && (t.bars || []).length);
    const lista = restauroDe(toks);
    if (!lista.length) { toast(sel.length ? 'Nada a restaurar nos selecionados: as energias já estão no natural.' : 'Nada a restaurar: as energias de todos já estão no natural.'); return; }
    modal({ title: 'Restaurar energias', wide: true, body: h('div', { class: 'rs-tela', id: 'rs-tela' },
      note(sel.length ? `Só os ${sel.length === 1 ? 'selecionado' : sel.length + ' selecionados'}. O que não é HP nem SP volta ao estado natural (o “começa em” da barra; sem ele, cheia).` : 'Todos os tokens da cena. O que não é HP nem SP volta ao estado natural (o “começa em” da barra; sem ele, cheia).'),
      h('ul', { class: 'rs-lista' }, lista.map(x => h('li', { class: 'rs-t', 'data-tok': x.t.id }, h('b', { text: tokName(x.t) }),
        h('span', { class: 'rs-bs' }, x.m.map(m => h('span', { class: 'rs-b' }, h('span', { class: 'bb-dot', style: { background: m.c } }), `${m.n} ${fmtV(m.de)} → ${fmtV(m.para)}`))))))),
      actions: [{ label: 'Cancelar' }, { label: 'Restaurar', kind: 'primary', run: () => aplicarRestauro(restauroDe(lista.map(x => Store.get('tokens', x.t.id)).filter(Boolean))) }] });
  }
  // o estado da ordem antes de passar a vez (para saber o que mudou depois)
  const vezAgora = () => { const tn = Store.scene().turn; return { on: !!tn.on, round: tn.round || 1, cur: tn.cur }; };
  /* (lote 22) Depois de passar a vez (ou de começar o combate): os reforços da rodada nascem, e a tela das barrinhas
     abre no momento ligado (o mais largo: o começo do combate, a rodada, a vez). Só no aparelho de quem passou a vez. */
  function depoisDaVez(antes, d) {
    if (!isGM() || !(d > 0)) return;
    const sc = Store.scene(), tn = sc.turn, P = barrinhasPrefs();
    const comecou = !antes.on && tn.on, novaRodada = antes.on && tn.on && (tn.round || 1) > antes.round;
    if (typeof Reforco !== 'undefined' && (comecou || novaRodada)) Reforco.naRodada(tn.round || 1);
    if (comecou && P.combate) { telaBarrinhas('O combate começou: as barrinhas', tokensDoCombate(sc)); return; }
    if (novaRodada && P.rodada) { telaBarrinhas(`${tn.round}ª rodada: as barrinhas`, tokensDoCombate(sc)); return; }
    if (tn.on && P.vez && (tn.cur !== antes.cur || comecou)) {
      const e = tn.list.find(x => x.id === tn.cur), toks = e ? tokensDe(sc, [e]) : [];
      if (toks.length) telaBarrinhas(`A vez de ${toks.length === 1 ? tokName(toks[0]) : (e.name || 'grupo')}: as barrinhas`, toks);
    }
  }

  /* ---- Aba Efeitos ---- */
  // A lista de efeitos para escolher, em grupos (Elementos, Magia, Natureza, Sagrado e sombrio)
  const fxSelect = (id, value, onChange) => h('select', { id, class: 'in', onchange: e => { const v = e.target.value; e.target.blur(); onChange(v); }, value },
    FX.TAGS.map(g => h('optgroup', { label: g.n }, FX.ORDER.filter(k => FX.P[k].g === g.id).map(k => h('option', { value: k, text: FX.P[k].n, selected: k === value })))));
  /* (lote 19) a zona das raças já vem com a duração, a forma e o tamanho de começo (na barra de opções da ferramenta: o
     mestre muda antes de soltar). (lote 20) as das classes também; e as que andam com o personagem (presa: a Luz da
     Lanterna, o Círculo de Proteção, a Fermata, a Retaguarda) ligam o "Prender ao token clicado" — que volta a ser o de
     antes quando o mestre escolhe outra zona. */
  let presaAntes = null;
  function comecoDaZona(id) {
    const pr = FX.P[id];
    if (!pr) return;
    if (pr.presa) {
      if (presaAntes === null) presaAntes = !!App.opt.fxAttach;
      App.opt.fxAttach = true;
      toast(`${pr.n}: clique no token de quem cria a zona — ela anda junto com ele.`, { key: 'fx-presa' });
    } else if (presaAntes !== null) { App.opt.fxAttach = presaAntes; presaAntes = null; }
    if (pr.g !== 'racas' && pr.g !== 'classes') return;
    App.opt.fxDur = pr.dur > 0 ? pr.dur : 0;
    if (pr.k) App.opt.fxShape = pr.k;
    if (pr.rr > 0) App.opt.fxR = pr.rr;
    if (pr.w > 0) App.opt.fxW = pr.w;
  }
  // a aba da biblioteca de efeitos que está aberta (null: a do efeito escolhido)
  let fxTag = null;
  function tabFx() {
    const sc = Store.scene(), gm = isGM();
    const list = sc.effects.filter(e => fxVisible(e));
    const tag = fxTag || (FX.P[App.opt.fx] || FX.P.fogo).g || 'elem';
    const ids = tag === 'todos' ? FX.ORDER : FX.ORDER.filter(id => FX.P[id].g === tag || FX.P[id].g2 === tag);     // (lote 20) g2: a zona de hoje que a classe também usa
    return [
      h('p', { class: 'muted', text: 'Escolha um efeito e clique no mapa. Ele fica na cena até alguém remover, ou pelo número de rodadas que você marcar.' }),
      h('div', { class: 'ctabs', role: 'group', 'aria-label': 'Tipos de efeito' }, [{ id: 'todos', n: 'Todos' }].concat(FX.TAGS).map(g => h('button', { type: 'button', class: 'ctab' + (tag === g.id ? ' on' : ''), id: 'fxt-' + g.id, 'aria-pressed': String(tag === g.id), onclick: () => { fxTag = g.id; refresh(); } }, g.n))),
      h('div', { class: 'fx-grid' }, ids.map(id => h('button', { type: 'button', class: 'fx-card' + (App.tool === 'fx' && App.opt.fx === id ? ' on' : ''), id: 'fxc-' + id, title: 'Soltar ' + FX.P[id].n, onclick: () => { App.opt.fx = id; comecoDaZona(id); Tools.set('fx'); } },
        h('canvas', { class: 'fx-thumb', width: 112, height: 112, data: { fx: id } }), h('span', { class: 'fx-n', text: FX.P[id].n })))),
      sec('s-fxlist', `Na cena (${list.length})`, true,
        list.length ? h('ul', { class: 'list' }, list.map(e => {
          const tok = e.token ? Store.get('tokens', e.token) : null, mine = gm || can('editFx', e);
          const row = [
            h('button', { type: 'button', class: 'li-m', disabled: !mine, onclick: () => { setSel([{ c: 'effects', id: e.id }]); Tools.set('select'); const g = FX.geom(e, sc); Render.centerOn(g.cx, g.cy); } },
              h('span', { class: 'li-dot', style: { background: (FX.P[e.fx] || FX.P.fogo).edge } }),
              h('span', { class: 'li-n', text: (FX.P[e.fx] || FX.P.fogo).n }),
              h('span', { class: 'li-s', text: (tok ? 'em ' + tokName(tok) : fxSize(e)) + (e.dur > 0 ? ` · ${e.dur} ${e.dur === 1 ? 'rodada' : 'rodadas'}` : '') + (e.gm ? ' · só mestre' : '') })),
            // sem nada guardado, o mestre tem aqui a entrada de sempre (abre a janela); com algo guardado, o Reaplicar vem na linha de baixo
            gm && !e.apply ? iconBtn('area', 'Aplicar a quem está dentro…', () => fxApply(e), { size: 15, id: `fxa-${e.id}` }) : null,
            mine ? iconBtn('trash', 'Remover efeito', () => { Store.tx('Remover efeito', () => Store.del('effects', e.id)); pruneSel(); toast('Efeito removido.', { action: 'Desfazer', run: Tools.undo }); }, { size: 15 }) : null,
          ];
          const on = selHas('effects', e.id) ? ' on' : '';
          if (!(gm && e.apply)) return h('li', { class: 'li' + on }, row);
          return h('li', { class: 'li li2' + on }, h('div', { class: 'li-row' }, row),
            h('div', { class: 'li-x' }, btn('Reaplicar ' + applyLabel(e.apply), () => fxReapply(e), { icon: 'reset', kind: 'small re', id: `fxr-${e.id}`, title: reapplyTitle })));
        })) : h('p', { class: 'muted', text: 'Nenhum efeito na cena.' })),
    ];
  }
  function startThumbs() {
    cancelAnimationFrame(thumbRaf);
    const all = Array.from(el.side.querySelectorAll('canvas.fx-thumb'));
    if (!all.length) return;
    for (const c of all) FX.thumb(c, c.dataset.fx, 1.7);
    // Só a miniatura sob o cursor se mexe; as outras ficam paradas.
    const loop = ts => {
      if (!all[0].isConnected) return;
      const hot = all.filter(c => c.matches(':hover') || (c.parentElement && c.parentElement.matches('.fx-card:hover')));
      if (App.anim && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) for (const c of hot) FX.thumb(c, c.dataset.fx, ts / 1000);
      thumbRaf = requestAnimationFrame(loop);
    };
    thumbRaf = requestAnimationFrame(loop);
  }

  /* ---- Aba Cena ---- */
  function tabScene() {
    const sc = Store.scene(), g = sc.grid, f = sc.fog, bg = sc.bg;
    const S = (p, label) => Store.tx(label || 'Ajustar cena', () => Store.scn(p));
    const a = bg.asset ? Store.S.assets[bg.asset] : null;
    const fogSet = (p, label) => S({ fog: Object.assign({}, f, p) }, label);
    return [
      sec('c-scene', 'Cena', true,
        field('Nome', inText('sc-name', sc.name, v => { if (v.trim()) S({ name: v.trim() }, 'Renomear cena'); })),
        Nuvem.mestre() ? note('Os jogadores veem este nome quando a cena está no ar.') : null,
        h('div', { class: 'grid2' },
          field('Largura (q)', inNum('sc-cols', sc.cols, v => S({ cols: Math.round(v) }, 'Tamanho da cena'), { min: 2, max: 300 })),
          field('Altura (q)', inNum('sc-rows', sc.rows, v => S({ rows: Math.round(v) }, 'Tamanho da cena'), { min: 2, max: 300 }))),
        field('Quadrado (px)', inNum('sc-cell', sc.cell, v => resizeCell(Math.round(v)), { min: 16, max: 256, step: 2 })),
        note('O tamanho do quadrado em pixels só importa para a nitidez de desenhos e imagens; os tokens e as medidas acompanham.')),
      sec('c-bg', 'Fundo', true,
        h('div', { class: 'row' },
          a ? h('span', { class: 'bg-prev', style: { backgroundImage: `url("${a.url}")` } }) : null,
          btn(a ? 'Trocar imagem' : 'Escolher imagem', () => pickImage(fl => bgFromFile(fl[0])), { icon: 'image' }),
          a ? btn('Remover', () => S({ bg: Object.assign({}, bg, { asset: null }) }, 'Remover fundo')) : null),
        a ? [
          toggle('bg-stretch', bg.stretch, v => S({ bg: Object.assign({}, bg, { stretch: v }) }), 'Esticar para preencher a cena'),
          !bg.stretch ? h('div', { class: 'grid3' },
            field('Mover X', inNum('bg-dx', bg.dx, v => S({ bg: Object.assign({}, bg, { dx: v }) }, 'Mover fundo'), { step: 1 })),
            field('Mover Y', inNum('bg-dy', bg.dy, v => S({ bg: Object.assign({}, bg, { dy: v }) }, 'Mover fundo'), { step: 1 })),
            field('Escala %', inNum('bg-sc', Math.round(bg.scale * 1000) / 10, v => S({ bg: Object.assign({}, bg, { scale: v / 100 }) }, 'Escala do fundo'), { min: 5, max: 1000, step: 0.5 }))) : null,
          btn('Ajustar a cena à imagem…', () => {
            promptBox('Ajustar a cena ao mapa', 'Quadrados na largura da imagem', sc.cols, { type: 'number', min: 2, max: 300, ok: 'Ajustar' }).then(v => {
              const n = clamp(Math.round(parseFloat(v)), 2, 300);
              if (!isFinite(n)) return;
              S({ cols: n, rows: Math.max(2, Math.round(n * a.h / a.w)), bg: { asset: a.id, stretch: false, dx: 0, dy: 0, scale: 1 } }, 'Ajustar cena ao mapa');
              setTimeout(Render.fit, 30);
            });
          }, { icon: 'fit' }),
        ] : note('Também dá para arrastar um arquivo de imagem para o mapa ou colar com Ctrl+V.'),
        field('Cor de fundo', inColor('sc-bgc', sc.bgColor, v => Store.scn({ bgColor: v }), 'Cor de fundo'))),
      sec('c-grid', 'Grade e medidas', false,
        toggle('gr-on', g.on, v => S({ grid: Object.assign({}, g, { on: v }) }), 'Mostrar a grade'),
        field('Cor', inColor('gr-c', g.color, v => Store.scn({ grid: Object.assign({}, sc.grid, { color: v }) }), 'Cor da grade')),
        field('Opacidade', inRange('gr-a', g.alpha, 0.05, 1, 0.05, v => Store.scn({ grid: Object.assign({}, sc.grid, { alpha: v }) }), 'Opacidade da grade')),
        h('div', { class: 'grid2' },
          field('Cada quadrado vale', inNum('gr-u', g.unit, v => S({ grid: Object.assign({}, g, { unit: v }) }), { min: 0, step: 0.5 })),
          field('Unidade', inText('gr-un', g.unitName, v => S({ grid: Object.assign({}, g, { unitName: v.trim() || 'm' }) }), { maxlength: 8 }))),
        field('Na diagonal', seg('gr-d', g.diag, [['cheb', 'Conta 1 quadrado'], ['eucl', 'Distância real']], v => S({ grid: Object.assign({}, g, { diag: v }) })), 'stack')),
      sec('c-amb', 'Ambiente', true,
        field('Hora do dia', seg('sc-tone', sc.tone, TONES.map(x => [x.id, x.n]), v => S({ tone: v, light: TONES.find(x => x.id === v).light }, 'Hora do dia')), 'stack'),
        field('Luz ambiente', seg('sc-light', sc.light, [['claro', 'Claro'], ['penumbra', 'Penumbra'], ['escuro', 'Escuro']], v => S({ light: v }, 'Luz ambiente')), 'stack'),
        note((sc.light === 'claro' ? 'Tudo iluminado. As fontes de luz não fazem diferença.' : sc.light === 'penumbra' ? 'Dá para enxergar, mas escuro. As fontes de luz clareiam ao redor.' : 'Os jogadores só enxergam o que alguma luz alcança, ou o que a visão no escuro deles permite.') + ' A hora do dia colore o mapa e já escolhe a luz; dá para trocar a luz depois.'),
        field('Clima', inSelect('sc-wk', sc.weather.k || '', WEATHERS, v => S({ weather: Object.assign({}, sc.weather, { k: v }) }, 'Clima'))),
        sc.weather.k ? field('Intensidade', inRange('sc-wp', sc.weather.pow, 0.2, 1, 0.05, v => Store.scn({ weather: Object.assign({}, Store.scene().weather, { pow: v }) }), 'Intensidade do clima')) : null,
        sc.weather.k && !App.anim ? note('As animações estão desligadas no menu ⋯, então o clima aparece parado.') : null),
      sec('c-light', 'Visão e névoa', true,
        toggle('fg-dyn', f.dynamic, v => fogSet({ dynamic: v }, 'Visão por paredes'), 'Visão por paredes'),
        f.dynamic ? toggle('sc-showvis', App.showVision, setVeil, 'Escurecer o que os jogadores não veem') : null,
        f.dynamic && App.showVision ? note('Só você vê esse véu. Com um token selecionado, ele mostra o que esse token enxerga.') : null,
        f.dynamic ? toggle('fg-expl', f.explored, v => fogSet({ explored: v }), 'Manter visível o que já foi explorado') : null,
        f.dynamic ? toggle('fg-shared', f.shared, v => fogSet({ shared: v }), 'Jogadores enxergam em grupo') : null,
        toggle('fg-man', f.manual, v => fogSet({ manual: v }, 'Névoa manual'), 'Névoa manual (pintada por você)'),
        toggle('sc-block', sc.blockMove, v => S({ blockMove: v }), 'Paredes barram o movimento dos jogadores'),
        f.manual ? h('div', { class: 'row' }, btn('Revelar tudo', () => fogAll('r'), { icon: 'eye' }), btn('Esconder tudo', () => fogAll('h'), { icon: 'eyeOff' })) : null,
        f.dynamic && f.explored ? btn('Esquecer áreas exploradas', () => confirmBox('Esquecer o que foi explorado?', 'Os jogadores voltam a ver só o que enxergam agora. Isso não pode ser desfeito.', 'Esquecer', true).then(ok => { if (ok) { Vision.resetExplored(sc); Nuvem.esquecerExplorado(sc); Render.request(); toast('Áreas exploradas esquecidas.'); } }), { icon: 'reset' }) : null,
        note('Para conferir o resultado, troque "Vendo como" no topo para um jogador.')),
      // (lote 18) as fases da arena (só numa arena; só o mestre)
      Arena.secao({ sec, note, btn }),
      // (lote 18) o campo de batalha: a leitura do campo e levar para a batalha
      Campo.secao({ sec, note, btn }),
      // (lote 18) o relevo com regra: a visão pelo relevo (desta cena) e a tabela do mestre (da mesa)
      sec('c-relevo', 'Relevo', false,
        toggle('rl-visao', !!sc.relevoVisao, v => S({ relevoVisao: v || undefined }, 'Visão pelo relevo'), 'A altura esconde (visão pelo relevo)', { disabled: !f.dynamic }),
        note(f.dynamic ? 'Ligada, a visão dos jogadores segue o relevo: morros e penhascos escondem o que está atrás, de dentro de um fosso só se vê o fosso, e de cima se vê mais longe.'
          : 'A visão pelo relevo precisa da "Visão por paredes" (em Visão e névoa).'),
        h('p', { class: 'note', id: 'rl-resumo', text: resumoDoRelevo(Relevo.tabela(sc)) }),
        btn('Regras do relevo…', abrirRegrasDoRelevo, { icon: 'sliders', id: 'rl-regras' })),
      // (lote 20) os Feridos: a tabela do mestre (da mesa)
      sec('c-feridos', 'Feridos', false,
        h('p', { class: 'note', id: 'fd-resumo', text: resumoDosFeridos(feridosCortes()) }),
        btn('Cortes dos Feridos…', abrirFeridos, { icon: 'sliders', id: 'fd-regras' })),
      sec('c-perm', 'O que os jogadores podem', true,
        PERMS.map(([k, label]) => toggle('pm-' + k, !!sc.perms[k], v => S({ perms: Object.assign({}, sc.perms, { [k]: v }) }, 'Permissões'), label)),
        note('Paredes, luzes, névoa, cenas e tokens do mestre ficam sempre com o mestre.')),
    ];
  }
  /* (lote 18) A tabela do relevo (a da mesa: vale em todas as cenas). Só sugestões: a régua mostra a subida e o
     penhasco, a queda sugere o dano ao mestre e a janelinha de atributos oferece o bônus de cima. */
  const sinalR = n => (n < 0 ? '−' : '+') + fmt(Math.abs(n));
  function resumoDoRelevo(t) {
    if (!t.on) return 'As regras do relevo estão desligadas: a altura é só visual.';
    return `Subir 1 de altura custa +${fmt(t.sobe)} q · penhasco a partir de ${fmt(t.penhasco)} q · de cima ${sinalR(t.cima)}, de baixo ${sinalR(t.baixo)} no ataque · queda: ${fmt(t.queda)}% da Vida a cada ${fmt(t.quedaCada)} q.`;
  }
  function abrirRegrasDoRelevo() {
    if (!isGM()) return;
    const antes = Store.S.prefs.relevo ? Relevo.norm(Store.S.prefs.relevo) : null, r = Relevo.norm(antes);
    const num = (id, k, a, b, passo, rotulo) => inNum(id, r[k], v => { r[k] = v; }, { min: a, max: b, step: passo || 0.5, label: rotulo });
    const linha = (rot, campo, depois) => h('div', { class: 'rl-l' }, h('span', { text: rot }), campo, depois ? h('span', { class: 'muted', text: depois }) : null);
    const body = h('div', { class: 'rl-tab', id: 'rl-tab' },
      toggle('rl-on', r.on, v => { r.on = v; }, 'Usar as regras do relevo (sugestões; nada se aplica sozinho)'),
      linha('Subir 1 quadrado de altura custa', num('rl-sobe', 'sobe', 0, 20, 0.5, 'Quadrados de movimento a mais por quadrado de altura subido'), 'quadrado(s) a mais'),
      linha('Penhasco: a partir de', num('rl-pen', 'penhasco', 1, 100, 0.5, 'Altura de uma vez que é penhasco'), 'quadrados de altura de uma vez (subir só escalando; descer é queda)'),
      linha('Atacar de cima', num('rl-cima', 'cima', -999, 999, 1, 'Bônus no ataque de quem está mais alto'), 'no atributo'),
      linha('Atacar de baixo', num('rl-baixo', 'baixo', -999, 999, 1, 'Bônus no ataque de quem está mais baixo'), 'no atributo'),
      linha('A queda tira', num('rl-queda', 'queda', 0, 100, 1, 'Porcentagem da Vida máxima'), '% da Vida máxima'),
      linha('a cada', num('rl-qcada', 'quedaCada', 0.5, 100, 0.5, 'Quadrados de queda'), 'quadrados de queda'),
      note('Vale em todas as cenas desta mesa. A régua e o arrastar mostram a subida; a queda de um penhasco avisa você com o dano sugerido; mirando alguém, a janelinha de atributos (F) oferece o bônus de cima ou de baixo.'));
    modal({ title: 'Regras do relevo', body, wide: true, actions: [
      { label: 'Valores de começo', run: () => { Object.assign(r, Relevo.norm(null)); for (const [id, k] of [['rl-sobe', 'sobe'], ['rl-pen', 'penhasco'], ['rl-cima', 'cima'], ['rl-baixo', 'baixo'], ['rl-queda', 'queda'], ['rl-qcada', 'quedaCada']]) { const c = document.getElementById(id); if (c) c.value = r[k]; } const o = document.getElementById('rl-on'); if (o) o.checked = true; return false; }, keep: true },
      { label: 'Cancelar' },
      { label: 'Salvar', kind: 'primary', run: () => {
        const novo = Relevo.igualAoPadrao(r) ? null : Relevo.norm(r);
        if (JSON.stringify(novo) === JSON.stringify(antes)) return;
        Store.S.prefs.relevo = novo; Persist.meta({ pub: true }); Render.request(); refresh();
        toast('As regras do relevo estão salvas.', { action: 'Desfazer', key: 'relevo', run: () => { Store.S.prefs.relevo = antes; Persist.meta({ pub: true }); Render.request(); refresh(); toast('As regras do relevo voltaram.'); } });
      } },
    ] });
  }
  /* (lote 20) Os cortes dos Feridos (a tabela da mesa): em % do quanto a barra da vida pode ficar negativa. A cena só
     sugere (com o Aplicar); a tag que o mestre aplica fica no token e na ficha até ele tirar. */
  function resumoDosFeridos(c) {
    return `Com a Vida abaixo de zero, a cena sugere: até ${c.t1}% do limite negativo, Levemente Ferido; até ${c.t2}%, Extremamente Ferido; além, Mortalmente Ferido.`;
  }
  function abrirFeridos() {
    if (!isGM()) return;
    const antes = Store.S.prefs.feridos ? Object.assign({}, Store.S.prefs.feridos) : null, r = feridosCortes();
    const linha = (rot, campo, depois) => h('div', { class: 'rl-l' }, h('span', { text: rot }), campo, depois ? h('span', { class: 'muted', text: depois }) : null);
    const body = h('div', { class: 'rl-tab', id: 'fd-tab' },
      linha('Levemente Ferido: até', inNum('fd-t1', r.t1, v => { r.t1 = v; }, { min: 1, max: 98, step: 1, label: 'Até quantos % do limite negativo é Levemente Ferido' }), '% do limite negativo'),
      linha('Extremamente Ferido: até', inNum('fd-t2', r.t2, v => { r.t2 = v; }, { min: 2, max: 99, step: 1, label: 'Até quantos % do limite negativo é Extremamente Ferido' }), '% (além disso, Mortalmente Ferido)'),
      note('O limite negativo é o quanto a barra da Vida pode ficar abaixo de zero (vem da ficha, ou das opções da barra). Vale em todas as cenas desta mesa. Nada se aplica sozinho: quando o dano leva alguém a uma faixa pior, aparece a sugestão com o Aplicar.'));
    modal({ title: 'Cortes dos Feridos', body, actions: [
      { label: 'Valores de começo', run: () => { Object.assign(r, FERIDOS_PADRAO); for (const k of ['t1', 't2']) { const c = document.getElementById('fd-' + k); if (c) c.value = r[k]; } return false; }, keep: true },
      { label: 'Cancelar' },
      { label: 'Salvar', kind: 'primary', run: () => {
        const t1 = Math.round(Number(r.t1)), t2 = Math.round(Number(r.t2));
        if (!(t1 >= 1 && t2 <= 99 && t1 < t2)) { toast('O corte do Levemente precisa ser menor que o do Extremamente.'); return false; }
        const novo = t1 === FERIDOS_PADRAO.t1 && t2 === FERIDOS_PADRAO.t2 ? null : { t1, t2 };
        if (JSON.stringify(novo) === JSON.stringify(antes)) return;
        Store.S.prefs.feridos = novo; Persist.meta({ pub: true }); refresh();
        toast('Os cortes dos Feridos estão salvos.', { action: 'Desfazer', key: 'feridos', run: () => { Store.S.prefs.feridos = antes; Persist.meta({ pub: true }); refresh(); toast('Os cortes dos Feridos voltaram.'); } });
      } },
    ] });
  }
  // Mudar o tamanho do quadrado reescala tudo o que está na cena.
  function resizeCell(n) {
    const sc = Store.scene(), k = n / sc.cell;
    if (!isFinite(k) || k === 1) return;
    Store.tx('Tamanho do quadrado', () => {
      for (const t of sc.tokens) Store.upd('tokens', t.id, { x: t.x * k, y: t.y * k });
      for (const s of sc.shapes) Store.upd('shapes', s.id, s.pts ? { pts: s.pts.map(v => v * k), sw: s.sw * k } : s.k === 'text' ? { x: s.x * k, y: s.y * k, fs: s.fs * k } : { x: s.x * k, y: s.y * k, w: s.w * k, h: s.h * k, sw: s.sw * k });
      for (const w of sc.walls) Store.upd('walls', w.id, { x1: w.x1 * k, y1: w.y1 * k, x2: w.x2 * k, y2: w.y2 * k });
      for (const l of sc.lights) Store.upd('lights', l.id, { x: l.x * k, y: l.y * k });
      for (const e of sc.effects) Store.upd('effects', e.id, { x: e.x * k, y: e.y * k });
      for (const op of sc.fogOps) { if (op.k === 'rect') Store.upd('fogOps', op.id, { x: op.x * k, y: op.y * k, w: op.w * k, h: op.h * k }); else if (op.pts) Store.upd('fogOps', op.id, { pts: op.pts.map(v => v * k), s: op.s * k }); }
      Store.scn({ cell: n, bg: Object.assign({}, sc.bg, { dx: sc.bg.dx * k, dy: sc.bg.dy * k }) });
    });
    setTimeout(Render.fit, 30);
  }

  /* ---- Aba Jogadores ---- */
  // Numa mesa, os jogadores são os participantes dela: entram com o código de convite, não por aqui.
  function tabPlayersMesa() {
    const sc = Store.scene();
    return [
      h('p', { class: 'muted', text: 'Os jogadores são os participantes desta mesa. Dê um token a cada um (campo "Dono" do token) e use "Ver como" para conferir o que ele enxerga.' }),
      Store.S.players.length ? h('ul', { class: 'list' }, Store.S.players.map(p => {
        const n = sc.tokens.filter(t => t.owner === p.id).length;
        return h('li', { class: 'li player' },
          h('span', { class: 'li-dot', style: { background: p.color } }),
          h('span', { class: 'li-n', text: p.name }),
          h('span', { class: 'li-s', text: n === 1 ? '1 token' : n + ' tokens' }),
          iconBtn('eye', 'Ver como ' + p.name, () => setViewer(p.id), { size: 16 }));
      })) : h('p', { class: 'muted', text: 'Ainda não há jogadores nesta mesa. Convide pelo menu da mesa, no alto da página (o código de convite).' }),
      sec('pl-heal', 'Descanso rápido', true,
        note('Enche todas as barras em uso (Vida, SP…) de uma vez; a barra que começa pela metade volta ao começo dela. Dá para desfazer.'),
        h('div', { class: 'row' },
          btn('Curar os tokens dos jogadores', () => healToast(sc.tokens.filter(t => t.owner && !t.prop), 'dos jogadores'), { icon: 'heart', id: 'pl-heal-pcs', title: 'Todos os tokens desta cena que têm um jogador como dono' }),
          btn('Curar todos da cena', () => healToast(sc.tokens.filter(t => !t.prop), 'da cena'), { id: 'pl-heal-all', title: 'Todos os tokens desta cena, inclusive os do mestre' }))),
      sec('pl-sobre', 'Sobrevida em grupo', false,
        note('Pontos por cima da barra, para muitos de uma vez; cada um fica com a maior (não soma). A janela mostra o que muda antes de aplicar.'),
        h('div', { class: 'row' },
          btn('Aos tokens dos jogadores…', () => sobreBox(sc.tokens.filter(t => t.owner && !t.prop), 'Sobrevida aos tokens dos jogadores'), { icon: 'shield', id: 'pl-sobre-pcs', title: 'Todos os tokens desta cena que têm um jogador como dono' }),
          btn('A todos da cena…', () => sobreBox(sc.tokens.filter(t => !t.prop), 'Sobrevida a todos da cena'), { id: 'pl-sobre-all', title: 'Todos os tokens desta cena, inclusive os do mestre' }))),
    ];
  }
  function tabPlayers() {
    if (Nuvem.on()) return tabPlayersMesa();
    const sc = Store.scene();
    const save = () => { Persist.meta(); Store.meta(); Render.request(); };
    return [
      h('p', { class: 'muted', text: 'Fora de uma mesa, os jogadores são cadastrados aqui (numa mesa do site, são os participantes dela). Dê um token a cada um e use "Ver como" para conferir o que ele enxerga.' }),
      Store.S.players.length ? h('ul', { class: 'list' }, Store.S.players.map(p => {
        const n = sc.tokens.filter(t => t.owner === p.id).length;
        return h('li', { class: 'li player' },
          h('input', { type: 'color', class: 'in color', id: 'pl-c-' + p.id, value: p.color, 'aria-label': 'Cor de ' + p.name, title: 'Cor do jogador', onchange: e => { p.color = e.target.value; save(); } }),
          h('input', { type: 'text', class: 'in', id: 'pl-n-' + p.id, value: p.name, 'aria-label': 'Nome do jogador', autocomplete: 'off', onchange: e => { p.name = e.target.value.trim() || p.name; save(); } }),
          h('span', { class: 'li-s', text: n === 1 ? '1 token' : n + ' tokens' }),
          iconBtn('eye', 'Ver como ' + p.name, () => setViewer(p.id), { size: 16 }),
          iconBtn('trash', 'Remover ' + p.name, () => confirmBox('Remover ' + p.name + '?', 'Os tokens dele continuam na cena e passam a ser do mestre.', 'Remover', true).then(ok => {
            if (!ok) return;
            Store.S.players = Store.S.players.filter(x => x.id !== p.id);
            for (const id of Store.S.order) {
              const s = Store.S.scenes[id]; let ch = false;
              for (const t of s.tokens) if (t.owner === p.id) { t.owner = null; ch = true; }
              if (s.targets.some(x => x.by === p.id)) { s.targets = s.targets.filter(x => x.by !== p.id); ch = true; }     // as miras dele saem junto
              if (ch) Persist.scene(id);
            }
            Vision.invalidate(); save();
          }), { size: 16 }));
      })) : h('p', { class: 'muted', text: 'Nenhum jogador cadastrado.' }),
      h('div', { class: 'row' }, btn('Adicionar jogador', addPlayer, { icon: 'plus', kind: 'primary' })),
      sec('pl-heal', 'Descanso rápido', true,
        note('Enche todas as barras em uso (Vida, SP…) de uma vez; a barra que começa pela metade volta ao começo dela. Dá para desfazer.'),
        h('div', { class: 'row' },
          btn('Curar os tokens dos jogadores', () => healToast(sc.tokens.filter(t => t.owner && !t.prop), 'dos jogadores'), { icon: 'heart', id: 'pl-heal-pcs', title: 'Todos os tokens desta cena que têm um jogador como dono' }),
          btn('Curar todos da cena', () => healToast(sc.tokens.filter(t => !t.prop), 'da cena'), { id: 'pl-heal-all', title: 'Todos os tokens desta cena, inclusive os do mestre' }))),
      sec('pl-sobre', 'Sobrevida em grupo', false,
        note('Pontos por cima da barra, para muitos de uma vez; cada um fica com a maior (não soma). A janela mostra o que muda antes de aplicar.'),
        h('div', { class: 'row' },
          btn('Aos tokens dos jogadores…', () => sobreBox(sc.tokens.filter(t => t.owner && !t.prop), 'Sobrevida aos tokens dos jogadores'), { icon: 'shield', id: 'pl-sobre-pcs', title: 'Todos os tokens desta cena que têm um jogador como dono' }),
          btn('A todos da cena…', () => sobreBox(sc.tokens.filter(t => !t.prop), 'Sobrevida a todos da cena'), { id: 'pl-sobre-all', title: 'Todos os tokens desta cena, inclusive os do mestre' }))),
    ];
  }

  /* ================= Menu do botão direito ================= */
  function contextMenu(p, cx, cy) {
    const gm = isGM(), sc = Store.scene();
    const hit = Tools.hitTest(p, { locked: true });
    if (hit && !selHas(hit.c, hit.id)) setSel([hit]);
    const items = [];
    if (hit && hit.c === 'tokens' && selOf('tokens').every(t => t.prop)) {
      // só objetos de cenário: girar, esconder, travar, duplicar, ordem e apagar
      const props = selOf('tokens'), ids = props.map(t => t.id), all = (p, label) => Store.tx(label, () => props.forEach(x => Store.upd('tokens', x.id, typeof p === 'function' ? p(x) : p)));
      items.push({ head: props.length > 1 ? `${props.length} objetos` : props[0].name });
      items.push({ label: 'Ver no painel', icon: 'sliders', run: () => openTab('sel') });
      if (gm) {
        const allHidden = props.every(t => t.hidden), allLocked = props.every(t => t.locked);
        items.push({ label: 'Girar para a direita', icon: 'redo', run: () => all(x => ({ rot: ((x.rot || 0) + 90) % 360 }), 'Girar objeto') },
          { label: 'Girar para a esquerda', icon: 'undo', run: () => all(x => ({ rot: ((x.rot || 0) + 270) % 360 }), 'Girar objeto') });
        items.push({ label: allHidden ? 'Mostrar aos jogadores' : 'Ocultar dos jogadores', icon: allHidden ? 'eye' : 'eyeOff', run: () => all({ hidden: !allHidden }, allHidden ? 'Mostrar objeto' : 'Ocultar objeto') });
        items.push({ label: allLocked ? 'Destravar posição' : 'Travar posição', icon: allLocked ? 'unlock' : 'lock', run: () => all({ locked: !allLocked }, allLocked ? 'Destravar objeto' : 'Travar objeto') });
        items.push('-', { label: 'Duplicar', icon: 'copy', key: 'Ctrl+D', run: Act.duplicateSel },
          { label: 'Trazer para frente', icon: 'front', run: () => Act.toFront('tokens', ids, true) }, { label: 'Enviar para trás', icon: 'back', run: () => Act.toFront('tokens', ids, false) },
          '-', { label: 'Apagar', icon: 'trash', key: 'Del', danger: true, run: deleteSelToast });
      }
    } else if (hit && hit.c === 'tokens') {
      const todos = selOf('tokens'), toks = todos.filter(t => !t.prop), o = Store.get('tokens', hit.id).prop ? toks[0] : Store.get('tokens', hit.id), ids = todos.map(t => t.id);
      const condToks = toks.filter(t => gm || can('conds', t));
      items.push({ head: toks.length > 1 ? `${toks.length} tokens` : tokName(o) });
      items.push({ label: 'Ver no painel', icon: 'sliders', run: () => openTab('sel') });
      if (condToks.length) items.push({ label: 'Condições…', icon: 'shield', run: () => condPicker(condToks) });
      if (toks.length === 1 && Fichas.podeBolsa(o) && (Fichas.bolsa(o) || []).length) items.push({ label: 'Bolsa…', icon: 'bag', run: () => bagBox(o) });
      if (gm) items.push({ label: 'Cura total', icon: 'heart', run: () => healToast(toks) });
      // (lote 8) o Clone: escolher ou sortear o real
      if (gm && toks.length === 1 && o.clone && Store.get('tokens', o.clone)) items.push({ label: 'Este é o real', icon: 'real', run: () => { const rid = o.clone; Act.cloneReal(o); setSel([{ c: 'tokens', id: rid }]); toast('Pronto: o real agora é este (a coroa).', { action: 'Desfazer', run: Tools.undo }); } });
      if (gm && toks.length === 1 && (o.clone || realDeClone(o, Store.scene()))) items.push({ label: 'Sortear o real', icon: 'die', run: () => sortearReal(o.clone || o.id) });
      if (can('target')) items.push({ label: isTargeted(toks) ? 'Tirar a mira' : 'Mirar', icon: 'center', key: 'A', run: () => Act.targetToggle(toks) });
      if (toks.length === 1 && Luta.podeAtributos(o)) items.push({ label: 'Rolar atributo…', icon: 'die', key: 'F', run: () => Luta.atributos(o) });
      if (gm) items.push({ label: 'Disputa…', icon: 'die', key: 'C', run: () => Luta.disputa(toks) });
      if (gm && toks.length > 1) items.push({ label: 'Dano, cura ou condição…', icon: 'area', run: () => areaBox(`Aplicar a ${toks.length} tokens`, toks, null) });
      if (gm && toks.length > 1) items.push({ label: 'Sobrevida…', icon: 'shield', run: () => sobreBox(toks, `Sobrevida a ${toks.length} tokens`) });
      if (gm && Luta.podeAtaque()) items.push({ label: 'Ataque com defesa…', icon: 'shield', key: 'K', run: () => Luta.ataque(toks) });
      if (gm) {
        const allHidden = toks.every(t => t.hidden), allLocked = toks.every(t => t.locked);
        items.push({ label: 'Adicionar aos turnos', icon: 'turns', run: () => { Act.turnAdd(toks); openTab('turn'); } });
        items.push({ label: allHidden ? 'Mostrar aos jogadores' : 'Ocultar dos jogadores', icon: allHidden ? 'eye' : 'eyeOff', run: () => Store.tx(allHidden ? 'Mostrar token' : 'Ocultar token', () => toks.forEach(t => Store.upd('tokens', t.id, { hidden: !allHidden }))) });
        items.push({ label: allLocked ? 'Destravar posição' : 'Travar posição', icon: allLocked ? 'unlock' : 'lock', run: () => Store.tx(allLocked ? 'Destravar token' : 'Travar token', () => toks.forEach(t => Store.upd('tokens', t.id, { locked: !allLocked }))) });
        items.push('-', { label: 'Duplicar', icon: 'copy', key: 'Ctrl+D', run: Act.duplicateSel },
          { label: 'Trazer para frente', icon: 'front', run: () => Act.toFront('tokens', ids, true) }, { label: 'Enviar para trás', icon: 'back', run: () => Act.toFront('tokens', ids, false) },
          '-', { label: 'Apagar', icon: 'trash', key: 'Del', danger: true, run: deleteSelToast });
      }
    } else if (hit && hit.c === 'shapes') {
      const shapes = selOf('shapes'), s = Store.get('shapes', hit.id), ids = shapes.map(x => x.id);
      items.push({ head: shapes.length > 1 ? `${shapes.length} desenhos` : 'Desenho' });
      if (s.k === 'text') items.push({ label: 'Editar texto', icon: 'edit', run: () => editText(s) });
      items.push({ label: s.lock ? 'Destravar' : 'Travar', icon: s.lock ? 'unlock' : 'lock', run: () => Store.tx(s.lock ? 'Destravar desenho' : 'Travar desenho', () => shapes.forEach(x => Store.upd('shapes', x.id, { lock: !s.lock }))) });
      items.push({ label: s.top ? 'Pôr abaixo dos tokens' : 'Pôr acima dos tokens', icon: s.top ? 'back' : 'front', run: () => Store.tx('Camada do desenho', () => shapes.forEach(x => Store.upd('shapes', x.id, { top: !s.top }))) });
      if (gm) items.push({ label: s.gm ? 'Mostrar aos jogadores' : 'Deixar só para o mestre', icon: s.gm ? 'eye' : 'eyeOff', run: () => Store.tx('Visibilidade do desenho', () => shapes.forEach(x => Store.upd('shapes', x.id, { gm: !s.gm }))) });
      items.push('-', { label: 'Duplicar', icon: 'copy', key: 'Ctrl+D', run: Act.duplicateSel },
        { label: 'Trazer para frente', icon: 'front', run: () => Act.toFront('shapes', ids, true) }, { label: 'Enviar para trás', icon: 'back', run: () => Act.toFront('shapes', ids, false) },
        '-', { label: 'Apagar', icon: 'trash', key: 'Del', danger: true, run: deleteSelToast });
    } else if (hit && hit.c === 'effects') {
      const e = Store.get('effects', hit.id);
      items.push({ head: (FX.P[e.fx] || FX.P.fogo).n }, { label: 'Ver no painel', icon: 'sliders', run: () => openTab('sel') });
      if (gm && e.apply) items.push({ label: 'Reaplicar ' + applyLabel(e.apply), icon: 'reset', run: () => fxReapply(e) });
      if (gm) items.push({ label: 'Aplicar a quem está dentro…', icon: 'area', run: () => fxApply(e) });
      if (gm) items.push({ label: e.gm ? 'Mostrar aos jogadores' : 'Deixar só para o mestre', icon: e.gm ? 'eye' : 'eyeOff', run: () => Store.tx('Visibilidade do efeito', () => Store.upd('effects', e.id, { gm: !e.gm })) });
      items.push({ label: 'Duplicar', icon: 'copy', key: 'Ctrl+D', run: Act.duplicateSel }, '-', { label: 'Apagar', icon: 'trash', key: 'Del', danger: true, run: deleteSelToast });
    } else if (hit && hit.c === 'lights') {
      const l = Store.get('lights', hit.id);
      items.push({ head: l.name || 'Luz' }, { label: l.on ? 'Apagar a luz' : 'Acender a luz', icon: 'light', run: () => Store.tx(l.on ? 'Apagar luz' : 'Acender luz', () => Store.upd('lights', l.id, { on: !l.on })) },
        { label: 'Ver no painel', icon: 'sliders', run: () => openTab('sel') }, '-', { label: 'Remover', icon: 'trash', key: 'Del', danger: true, run: deleteSelToast });
    } else if (gm && App.tool === 'terrain' && Tools.hitTerrain(p)) {
      const th = Tools.hitTerrain(p), s = Store.get('shapes', th.id);
      if (!selHas(th.c, th.id)) setSel([th]);
      items.push({ head: Combate.terText(s, sc) }, { label: 'Ver no painel', icon: 'sliders', run: () => { if (App.opt.terMode !== 'edit') { App.opt.terMode = 'edit'; Tools.cancel(); } openTab('sel'); refresh(); } },
        { label: 'Trazer para frente', icon: 'front', run: () => Act.toFront('shapes', [s.id], true) }, { label: 'Enviar para trás', icon: 'back', run: () => Act.toFront('shapes', [s.id], false) },
        '-', { label: 'Apagar a área', icon: 'trash', key: 'Del', danger: true, run: deleteSelToast });
    } else {
      items.push({ head: 'Mapa' });
      if (gm) items.push({ label: 'Novo token aqui', icon: 'token', run: () => {
        const [x, y] = snapTok(sc, p.x - sc.cell / 2, p.y - sc.cell / 2, 1, false);
        const t = newToken(sc, x, y);
        Store.tx('Criar token', () => Store.add('tokens', t));
        setSel([{ c: 'tokens', id: t.id }]); Tools.set('select'); openTab('sel', 'tk-name');
      } });
      { const f = gm ? Arena.proxima(sc) : null; if (f) items.push({ label: 'Acionar a ' + f.nome.toLowerCase() + ' da arena…', icon: 'next', run: () => Arena.acionar(f.i) }); }
      if (gm && Fichas.on()) items.push({ label: 'Puxar o grupo para cá…', icon: 'users', run: () => Luta.grupo({ x: p.x, y: p.y }) });
      if (Luta.podeDescanso() && Store.scene().tokens.some(t => t.char && !t.clone)) items.push({ label: 'Descanso curto do grupo…', icon: 'rest', run: () => Luta.descansoCurto() });
      if (App.clip.length && (gm || can('draw') || can('fx'))) items.push({ label: 'Colar aqui', icon: 'copy', key: 'Ctrl+V', run: () => Act.pasteAt(p.x, p.y) });
      if (can('ping')) items.push({ label: 'Ping aqui', icon: 'ping', key: 'G', run: () => Act.ping(p.x, p.y) });
      items.push({ label: 'Enquadrar a cena', icon: 'fit', key: '0', run: () => { Render.fit(); status(); } });
    }
    menu(cx, cy, items);
  }
  function editText(s) {
    promptBox('Editar texto', 'Texto', s.txt, { multiline: true, ok: 'Salvar' }).then(v => { if (v && v.trim()) Store.tx('Editar texto', () => Store.upd('shapes', s.id, { txt: v.trim() })); });
  }

  /* ================= HUD do token =================
     Faixa fixa na base do mapa com as barras do token selecionado: fica sempre
     no mesmo lugar e não cobre os vizinhos do token. */
  function renderHud() {
    const toks = selOf('tokens');
    const hide = () => { el.hud.hidden = true; el.hud.replaceChildren(); };
    if (toks.length !== 1 || App.sel.length !== 1 || App.tool !== 'select' || toks[0].prop) { hide(); return; }
    const t = toks[0], gm = isGM();
    const edit = gm || can('bars', t), canCond = gm || can('conds', t);
    const kids = [];
    for (const { b, i, mode } of barsShown(t)) {
      const dots = b.k === 'pts' && Math.round(b.m) >= 1 && Math.round(b.m) <= PIP_MAX;
      if (edit && dots) {
        kids.push(h('span', { class: 'hud-b', style: { '--c': b.c } }, h('span', { class: 'hud-n', text: b.n }), pips(t, b, i, true, 'hud-b'), h('span', { class: 'hud-m' + (b.v < 0 ? ' neg' : ''), text: `${fmtV(b.v)}/${fmt(b.m)}` })));
      } else if (edit) {
        kids.push(h('label', { class: 'hud-b', style: { '--c': b.c }, title: `${b.n}: digite um valor, ou +5 e -8 para somar e subtrair (-10% tira 10% do máximo)` },
          h('span', { class: 'hud-n', text: b.n }),
          h('input', { id: 'hud-b' + i, class: 'hud-in' + (b.v < 0 ? ' neg' : ''), type: 'text', inputmode: 'decimal', value: b.v, autocomplete: 'off', 'aria-label': b.n,
            onfocus: e => e.target.select(),
            onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } else if (e.key === 'Escape') { e.target.value = b.v; e.target.blur(); } },
            onchange: e => { if (!Act.barSet(t, i, e.target.value)) e.target.value = b.v; } }),
          h('span', { class: 'hud-m', text: '/' + fmt(b.m) })));
      } else if (mode === 'num') {
        kids.push(h('span', { class: 'hud-b', style: { '--c': b.c } }, h('span', { class: 'hud-n', text: b.n }), dots ? pips(t, b, i, false) : null, h('span', { class: 'hud-v' + (b.v < 0 ? ' neg' : ''), text: `${fmtV(b.v)}/${fmt(b.m)}` })));
      }
    }
    // Condições ativas: as que têm contador ganham + e − aqui mesmo; as outras abrem a janela de condições.
    const info = t.cinfo || {};
    const conds = t.conds.map(id => COND_BY_ID[id]).filter(Boolean).sort((p, q) => (condNum(t, q.id) ? 1 : 0) - (condNum(t, p.id) ? 1 : 0));
    for (const c of conds.slice(0, 6)) {
      const ci = info[c.id] || {}, n = condNum(t, c.id), dur = ci.d ? ` · ${ci.d} ${ci.d === 1 ? 'rodada' : 'rodadas'}` : '';
      const badge = h('span', { class: 'chip-i', style: { background: c.c } }, icon(c.i, 12));
      // (lote 7) o Escudado mostra os pontos (a sobrevida), sem o − e o +: eles mudam na barra
      if (canCond && n && c.id !== 'escudado') {
        kids.push(h('span', { class: 'hud-c', title: c.n + (c.r ? ' — ' + c.r : '') + dur },
          h('button', { type: 'button', class: 'stp-b', id: `hud-c-${c.id}-minus`, title: n === 1 ? `${c.n}: tirar 1 (em zero, a condição sai)` : `${c.n}: tirar 1`, 'aria-label': `Tirar 1 de ${c.n}`, onclick: () => condStepToast(t, c, -1) }, icon('minus', 13)),
          badge, h('span', { class: 'stp-v', id: `hud-c-${c.id}-n`, text: String(n) }),
          h('button', { type: 'button', class: 'stp-b', id: `hud-c-${c.id}-plus`, disabled: !!(c.max && n >= c.max), title: c.max && n >= c.max ? `${c.n}: no máximo (${c.max})` : `${c.n}: somar 1`, 'aria-label': `Somar 1 em ${c.n}`, onclick: () => condStepToast(t, c, 1) }, icon('plus', 13))));
      } else if (canCond) {
        kids.push(h('button', { type: 'button', class: 'hud-c one', id: `hud-c-${c.id}`, title: `${c.n}${n ? ' ' + n : ''}${dur}: abrir condições`, 'aria-label': `${c.n}${n ? ' ' + n : ''}${dur}`, onclick: () => condPicker([t]) }, badge, n ? h('span', { class: 'stp-v', text: String(n) }) : null));
      } else {
        kids.push(h('span', { class: 'hud-c ro', title: c.n + (c.r ? ' — ' + c.r : '') + dur }, badge, n ? h('span', { class: 'stp-v', text: String(n) }) : null));
      }
    }
    if (conds.length > 6) kids.push(h('span', { class: 'hud-m', text: '+' + (conds.length - 6) }));
    if (canCond) kids.push(iconBtn('shield', 'Condições', () => condPicker([t]), { size: 16, cls: 'hud-i', id: 'hud-cond' }));
    if (Fichas.podeBolsa(t) && (Fichas.bolsa(t) || []).some(x => x.qtd > 0)) kids.push(iconBtn('bag', 'Bolsa: poções e itens do personagem', () => bagBox(t), { size: 16, cls: 'hud-i', id: 'hud-bolsa' }));
    if (Luta.podeAtributos(t)) kids.push(iconBtn('die', 'Rolar atributo (F)', () => Luta.alternar(t), { size: 16, cls: 'hud-i', id: 'hud-rolar' }));
    if (can('target')) { const on = isTargeted([t]); kids.push(iconBtn('center', on ? 'Tirar a mira (A)' : 'Mirar: marca este token como alvo (A)', () => Act.targetToggle([t]), { size: 16, cls: 'hud-i', on, id: 'hud-mira' })); }
    if (gm) kids.push(iconBtn(t.hidden ? 'eyeOff' : 'eye', t.hidden ? 'Oculto dos jogadores (clique para mostrar)' : 'Visível aos jogadores (clique para ocultar)', () => Store.tx(t.hidden ? 'Mostrar token' : 'Ocultar token', () => Store.upd('tokens', t.id, { hidden: !t.hidden })), { size: 16, cls: 'hud-i', on: t.hidden, id: 'hud-hide' }));
    if (!kids.length) { hide(); return; }
    const a = document.activeElement, fid = a && a.id && el.hud.contains(a) ? a.id : null;
    el.hud.replaceChildren(h('span', { class: 'hud-who' }, tokenAvatar(t, 24), h('span', { class: 'hud-name', text: tokName(t) })), ...kids);
    el.hud.hidden = false;
    if (fid) { const n = document.getElementById(fid); if (n && !n.disabled) n.focus({ preventScroll: true }); }
  }

  /* ================= Faixa "vez de…" =================
     Aparece por alguns segundos quando a vez muda e lembra as condições de quem vai jogar.
     É só um lembrete: não altera nada. */
  function hideTurn() { clearTimeout(turnTimer); el.turnb.hidden = true; el.turnb.replaceChildren(); }
  /* Passar (d = 1) ou voltar (d = −1) o turno: o botão da aba Turnos e as teclas N e Shift+N. O que acabou (condições
     com rodadas, efeitos) vem num aviso com Desfazer; a zona em que o token entrou pergunta antes de agir. */
  function passarTurno(d) {
    const tn = Store.scene().turn;
    if (!tn.list.length) { toast('A ordem de turnos está vazia: adicione os tokens na aba Turnos.'); return; }
    const antes = vezAgora(), voltou = (tn.back || 0) > 0;
    const ended = Act.turnStep(d);
    if (ended.length) toast('Acabou: ' + ended.join('; ') + '.', { action: 'Desfazer', run: Tools.undo });
    zonePrompt(d > 0);
    if (!voltou) depoisDaVez(antes, d);                   // (lote 22: os reforços da rodada, a tela das barrinhas; refazer a vez que já passou não repete)
  }
  function turnBanner() {
    const sc = Store.scene(), tn = sc.turn;
    const key = turnKeyOf(sc);
    if (zonasKey && zonasKey !== key) { el.zonas.replaceChildren(); el.zonas.hidden = true; zonasKey = null; }     // a vez mudou: os avisos de zona saem
    const prev = turnKey;
    turnKey = key;
    if (prev === key) return;
    const nada = () => { hideTurn(); hideCine(); };
    if (prev === null || prev.split('|')[0] !== sc.id || !tn.on || !(tn.cur || tn.mestre)) { nada(); return; }
    if (!isGM() && !can('turns')) { nada(); return; }
    // (a rodada virou — ou o combate acabou de começar: antes não havia vez nenhuma)
    const r0 = /:(\d+)$/.exec(prev), rodadaNova = !r0 || (tn.round || 1) > Number(r0[1]);
    if (!isGM() && vezDoMestre(tn)) {                      // (o jogador, na vez de uma linha invisível)
      hideCine();
      el.turnb.replaceChildren(h('span', { class: 'turnb-t' }, 'O turno está com o ', h('strong', { text: 'mestre' })),
        h('button', { type: 'button', class: 'ib turnb-x', title: 'Fechar', 'aria-label': 'Fechar o aviso de vez', onclick: hideTurn }, icon('x', 14)));
      el.turnb.hidden = false;
      clearTimeout(turnTimer);
      turnTimer = setTimeout(hideTurn, 4000);
      return;
    }
    const e = tn.list.find(x => x.id === tn.cur);
    const t = e && e.token ? Store.get('tokens', e.token) : null;
    if (!e || (t && !tokShown(t, sc))) { nada(); return; }     // o jogador não fica sabendo de quem ele não vê
    const membros = isBand(e) ? turnToks(e).filter(k => tokShown(k, sc)) : [];
    if (isBand(e) && e.toks.length && !membros.length) { nada(); return; }
    const info = t ? t.cinfo || {} : {};
    const conds = t ? t.conds.map(id => COND_BY_ID[id]).filter(Boolean) : [];
    // a faixa de cinema: o mestre, sempre; o jogador, na vez de um token dele. Os outros jogadores: a faixa pequena.
    const meu = !isGM() && (t ? ownsTok(t) : membros.some(ownsTok));
    if (isGM() || meu) { hideTurn(); cinema(sc, e, t, membros, conds, meu, rodadaNova); return; }
    hideCine();
    el.turnb.replaceChildren();
    addKids(el.turnb, [
      t ? tokenAvatar(t, 26) : membros.length ? h('span', { class: 'band-av' }, membros.slice(0, 3).map(k => tokenAvatar(k, 22))) : null,
      h('span', { class: 'turnb-t' }, 'Vez de ', h('strong', { text: turnLabel(e, t ? tokName(t) : e.name) })),
      isGM() && e.inv ? h('span', { class: 'turnb-inv', text: 'invisível para os jogadores' }) : null,
      conds.map(c => {
        const ci = info[c.id] || {};
        return h('span', { class: 'turnb-c' }, h('span', { class: 'chip-i', style: { background: c.c } }, icon(c.i, 12)),
          h('span', { text: c.n + (condNum(t, c.id) ? ' ' + condNum(t, c.id) : '') + (ci.d ? ` · ${ci.d} ${ci.d === 1 ? 'rodada' : 'rodadas'}` : '') }));
      }),
      h('button', { type: 'button', class: 'ib turnb-x', title: 'Fechar', 'aria-label': 'Fechar o aviso de vez', onclick: hideTurn }, icon('x', 14)),
    ]);
    el.turnb.hidden = false;
    clearTimeout(turnTimer);
    turnTimer = setTimeout(hideTurn, conds.length ? 7000 : 4000);
  }

  /* ================= (lote 7) A faixa de cinema =================
     Quando a vez muda, uma faixa larga atravessa o meio da cena por uns dois segundos: o retrato grande, "Vez de Dain",
     a rodada e as condições de quem vai jogar. O mestre vê sempre; o jogador vê a dele, "Sua vez!", quando a vez é de um
     token seu. Na primeira vez de uma rodada nova (e quando o combate começa) vem antes uma faixa curta: "Rodada 4". Não
     pega clique nenhum e sai sozinha; se a vez muda de novo no meio, a faixa troca na hora. O som — o gongo na vez de
     um aliado, o tambor na de um inimigo — segue a chave de som da mesa ao vivo, em cada aparelho. */
  // (um relógio só: o da faixa da rodada, que chama a da vez, ou o que tira a faixa; esconder cancela o que faltava)
  let cineTimer = 0;
  const CINE_MS = 2400, CINE_COND_MS = 3200, RODADA_MS = 1500;
  function hideCine() { clearTimeout(cineTimer); cineTimer = 0; el.cine.hidden = true; el.cine.replaceChildren(); el.cine.className = 'cine'; }
  // de que lado está o token: a ficha diz (Aliado, Inimigo, Neutro); sem ficha e sem dono, é do mestre — conta como inimigo
  function tokInimigo(t) {
    if (!t) return false;
    const l = t.char ? Fichas.get(t.char) : null, lado = l && l.ficha ? String(l.ficha.lado || '') : '';
    if (lado) return lado === 'Inimigo';
    return !t.owner && !t.char;
  }
  function mostrarCine(cls, ms, kids) {
    el.cine.className = 'cine ' + cls;
    el.cine.style.setProperty('--cine-ms', ms + 'ms');
    el.cine.replaceChildren(h('div', { class: 'cine-f' }, ...kids));
    el.cine.hidden = false;
  }
  function cinema(sc, e, t, membros, conds, meu, rodadaNova) {
    hideCine();
    const rodada = sc.turn.round || 1;
    // num grupo, é inimigo se todos os tokens dele são; a linha sem token nenhum fica com o gongo
    const lado = meu ? 'sua' : (t ? tokInimigo(t) : membros.length && membros.every(tokInimigo)) ? 'inimigo' : 'aliado';
    const nome = turnLabel(e, t ? tokName(t) : e.name);
    const vez = () => {
      const info = t ? t.cinfo || {} : {};
      const chips = conds.slice(0, 6).map(c => {
        const ci = info[c.id] || {}, n = condNum(t, c.id);
        return h('span', { class: 'cine-c' }, h('span', { class: 'chip-i', style: { background: c.c } }, icon(c.i, 12)),
          h('span', { text: c.n + (n ? ' ' + Math.round(n) : '') + (ci.d ? ` · ${ci.d} ${ci.d === 1 ? 'rodada' : 'rodadas'}` : '') }));
      });
      if (conds.length > 6) chips.push(h('span', { class: 'cine-c', text: '+' + (conds.length - 6) }));
      const ms = conds.length ? CINE_COND_MS : CINE_MS;
      mostrarCine(lado, ms, [
        h('span', { class: 'cine-av' }, t ? tokenAvatar(t, 76) : membros.length ? membros.slice(0, 3).map(k => tokenAvatar(k, 60)) : h('span', { class: 'cine-av-v' }, icon('users', 30))),
        h('span', { class: 'cine-tx' },
          h('span', { class: 'cine-k', id: 'cineK', text: meu ? `Rodada ${rodada} · ${nome}` : `Rodada ${rodada}` }),
          h('span', { class: 'cine-n', id: 'cineN' }, meu ? 'Sua vez!' : [h('small', { text: 'Vez de ' }), nome]),
          isGM() && e.inv ? h('span', { class: 'cine-inv', text: 'invisível para os jogadores' }) : null,
          chips.length ? h('span', { class: 'cine-s' }, chips) : null),
      ]);
      Som.tocar(lado);
      cineTimer = setTimeout(hideCine, ms);
    };
    if (!rodadaNova) { vez(); return; }
    mostrarCine('rodada', RODADA_MS, [h('span', { class: 'cine-r', id: 'cineR' }, h('small', { text: 'Rodada' }), h('b', { text: String(rodada) }))]);
    Som.tocar('rodada');
    cineTimer = setTimeout(vez, RODADA_MS);
  }

  /* ================= Começo da vez dentro de uma zona =================
     Quando a vez passa para alguém que está dentro de um efeito com algo guardado para aplicar (o dano e a condição
     do "Aplicar a quem está dentro…"), o mestre vê um aviso por zona: "Aplicar" ou "Pular". Nada acontece sozinho; o
     aviso some quando a vez passa de novo. Numa faixa de grupo, vale para os tokens dela que estão dentro. */
  let zonasKey = null;                                      // de que vez são os avisos que estão à mostra
  // (a vez de uma linha invisível chega ao jogador sem a entrada: só "o turno está com o mestre"; na prévia do mestre
  // "como jogador", sem a projeção, a entrada está lá, com a marca)
  const vezDoMestre = tn => !!tn.on && (!!tn.mestre || tn.list.some(e => e.id === tn.cur && e.inv));
  const turnKeyOf = sc => sc.id + '|' + (sc.turn.on && (sc.turn.cur || sc.turn.mestre) ? (sc.turn.cur || 'mestre') + ':' + sc.turn.round : '');
  function zonePrompt(avancou) {
    const box = el.zonas;
    box.replaceChildren(); box.hidden = true; zonasKey = null;
    if (!avancou || !isGM()) return;
    const sc = Store.scene(), tn = sc.turn, e = tn.on ? tn.list.find(x => x.id === tn.cur) : null;
    zonasKey = turnKeyOf(sc);
    const toks = e ? turnToks(e) : [];
    if (!toks.length) return;
    const cards = [];
    for (const fx of sc.effects) {
      const a = fx.apply;
      if (!a || areaAmount(a.amt) == null) { const c = lembreteDaZona(fx, sc, e, toks, box); if (c) cards.push(c); continue; }
      const skip = new Set(a.skip || []);
      const dentro = tokensIn(FX.geom(fx, sc).path, sc).filter(t => !skip.has(t.id) && toks.some(k => k.id === t.id));
      if (!dentro.length) continue;
      const nomeFx = (FX.P[fx.fx] || FX.P.fogo).n, quem = dentro.length === 1 ? tokName(dentro[0]) : `${dentro.length} de ${turnName(e)}`;
      const card = h('div', { class: 'zona', id: 'zona-' + fx.id },
        h('span', { class: 'zona-i', style: { background: (FX.P[fx.fx] || FX.P.fogo).edge } }),
        h('span', { class: 'zona-t' }, h('strong', { text: quem }), ` começa a vez dentro de ${nomeFx}: `, h('strong', { text: applyLabel(a) }), '.'),
        btn('Aplicar', () => {
          const vivos = dentro.map(t => Store.get('tokens', t.id)).filter(Boolean);
          const n = Act.areaApply(vivos.map(t => ({ t, half: false })), a.bar, a.amt, a.cond, null, nomeFx + ' no começo da vez');
          card.remove(); if (!box.children.length) box.hidden = true;
          if (n > 0) toast(`${nomeFx}: ${applyLabel(a)} em ${quem}.`, { action: 'Desfazer', run: Tools.undo });
          else toast(`${nomeFx}: nada mudou em ${quem}.`);
        }, { kind: 'primary small', id: 'zona-ok-' + fx.id }),
        btn('Pular', () => { card.remove(); if (!box.children.length) box.hidden = true; }, { kind: 'small', id: 'zona-no-' + fx.id }));
      cards.push(card);
    }
    if (!cards.length) return;
    box.append(...cards);
    box.hidden = false;
  }
  /* (lote 7) A zona que é só lembrete (Lama, Vórtice, Santuário…): quem começa a vez dentro dela gera um cartão para o
     mestre, com a regra — "Dain começa a vez dentro de Lama: só se anda a metade." Ok fecha; nada muda sozinho. */
  function lembreteDaZona(fx, sc, e, toks, box) {
    const pr = FX.P[fx.fx];
    if (!pr || !pr.lembra || !pr.regra) return null;
    const dentro = tokensIn(FX.geom(fx, sc).path, sc).filter(t => toks.some(k => k.id === t.id));
    if (!dentro.length) return null;
    const quem = dentro.length === 1 ? tokName(dentro[0]) : `${dentro.length} de ${turnName(e)}`;
    const card = h('div', { class: 'zona lembra', id: 'zona-' + fx.id },
      h('span', { class: 'zona-i', style: { background: pr.edge } }),
      h('span', { class: 'zona-t' }, h('strong', { text: quem }), ` começa a vez dentro de ${pr.n}: ${pr.regra}.`),
      btn('Ok', () => { card.remove(); if (!box.children.length) box.hidden = true; }, { kind: 'small', id: 'zona-ok-' + fx.id }));
    return card;
  }

  /* ================= (lote 7) Combinações de zonas =================
     Quando uma zona que dispara encosta numa que muda (fogo no óleo, raio na água, gelo na água), o mestre vê um
     cartão: "Fogo no óleo: explosão?" — Aplicar ou Pular. Aplicar troca as zonas pelo resultado (um Desfazer) e abre o
     dano para quem estava dentro. Pular não pergunta mais por aquele par enquanto a página está aberta. O cartão sai
     sozinho se as zonas deixam de se encostar ou somem. */
  const combosPulados = new Set();
  const parDe = (a, b) => a + '|' + b;
  function combosAtualiza(ids) {
    const box = el.combos;
    if (!isGM()) { box.replaceChildren(); box.hidden = true; return; }
    const sc = Store.scene();
    for (const card of [...box.children]) {
      const a = Store.get('effects', card.dataset.gat), b = Store.get('effects', card.dataset.base), r = FX.COMBOS[+card.dataset.r];
      if (!a || !b || !r || !r.gat.includes(a.fx) || !r.base.includes(b.fx) || !FX.seTocam(a, b, sc)) card.remove();
    }
    if (ids && ids.length) {
      for (const c of FX.combinacoes(sc, ids)) {
        const k = parDe(c.gat.id, c.base.id);
        if (combosPulados.has(k) || [...box.children].some(x => x.dataset.par === k)) continue;
        box.append(cartaoCombo(c, k));
      }
    }
    box.hidden = !box.children.length;
  }
  function cartaoCombo(c, k) {
    const r = c.regra, fecha = () => { card.remove(); el.combos.hidden = !el.combos.children.length; };
    const card = h('div', { class: 'zona combo', id: 'combo-' + c.base.id, data: { par: k, gat: c.gat.id, base: c.base.id, r: String(FX.COMBOS.indexOf(r)) } },
      h('span', { class: 'zona-i', style: { background: (FX.P[r.res] || FX.P.fogo).edge } }),
      h('span', { class: 'zona-t' }, h('strong', { text: r.titulo }), ` ${(FX.P[c.gat.fx] || {}).n} encosta em ${(FX.P[c.base.fx] || {}).n}.`),
      btn('Aplicar', () => { fecha(); aplicarCombo(c); }, { kind: 'primary small', id: 'combo-ok-' + c.base.id }),
      btn('Pular', () => { combosPulados.add(k); fecha(); }, { kind: 'small', id: 'combo-no-' + c.base.id }));
    return card;
  }
  function aplicarCombo(c) {
    const r = c.regra, sc = Store.scene(), a = Store.get('effects', c.gat.id), b = Store.get('effects', c.base.id);
    if (!a || !b) return;
    Store.tx(r.feito, () => {
      Store.upd('effects', b.id, { fx: r.res, apply: null, seed: 1 + Math.floor(Math.random() * 999) });
      Store.del('effects', a.id);
    });
    toast(r.feito + '.', { action: 'Desfazer', run: Tools.undo });
    const e = Store.get('effects', b.id), dentro = e ? tokensIn(FX.geom(e, sc).path, sc) : [];
    if (dentro.length) areaBox(r.feito + ': quem está dentro', dentro, e.token, e, { sug: r.sug });
  }
  // Cada passo que mexe em zonas (do mestre, de um jogador): confere as combinações. O Desfazer só tira cartões que não
  // valem mais (não pergunta de novo pelo que acabou de ser desfeito).
  Store.on('commit', ev => {
    if (ev.sceneId !== Store.S.current) return;
    const ids = ev.undo || ev.redo ? [] : [...new Set((ev.ops || []).filter(op => op.c === 'effects' && (op.t === 'add' || op.t === 'upd')).map(op => op.t === 'add' ? op.v.id : op.id))];
    if (ids.length || el.combos.children.length) combosAtualiza(ids);
  });
  Store.on('scene', () => { el.combos.replaceChildren(); el.combos.hidden = true; });
  // O token que atravessou um portal, e o que pisou nas runas escondidas (só o mestre fica sabendo)
  Store.on('portal', d => {
    const t = Store.get('tokens', d.tok);
    if (t) toast(`${tokName(t)} atravessou o portal.`, { action: 'Desfazer', run: Tools.undo, key: 'portal' });
  });
  // (lote 8) o Clone: quem sumiu, e por quê
  Store.on('clone', d => {
    if (!isGM()) return;
    const q = (n, um, uns) => (n === 1 ? um : n + ' ' + uns);
    const txt = d.k === 'real' ? `${d.nome} (o real) levou dano: ${d.n === 1 ? 'o clone sumiu' : `os ${d.n} clones sumiram`}.`
      : d.k === 'copia' ? `${q(d.n, 'Um clone', 'clones')} de ${d.nome} ${d.n === 1 ? 'levou dano e sumiu' : 'levaram dano e sumiram'}.`
      : d.semReal ? `O real saiu da cena: ${d.n === 1 ? 'a cópia' : `as ${d.n} cópias`} de ${d.nome} ${d.n === 1 ? 'sumiu' : 'sumiram'}.`
      : d.parte ? `${q(d.n, 'Uma cópia', 'cópias')} de ${d.nome} sem a condição Clone ${d.n === 1 ? 'sumiu' : 'sumiram'}.`
      : `A condição Clone de ${d.nome} acabou: ${d.n === 1 ? 'a cópia sumiu' : `as ${d.n} cópias sumiram`}.`;
    toast(txt, { action: 'Desfazer', run: Tools.undo, key: 'clone' });
  });
  // (lote 9) o gêmeo de um Duplicado caiu: o aviso oferece tirá-lo da cena (nada muda sozinho)
  Store.on('duplicado', d => {
    if (!isGM() || d.k !== 'caiu') return;
    toast(`O gêmeo (Duplicado) de ${d.nome} caiu. Tirar da cena?`, { action: 'Tirar da cena', key: 'dup-' + d.id, long: true,
      run: () => { if (Act.duplicadoTirar(d.id)) toast('O gêmeo saiu da cena. A ficha dele continua nas Fichas.', { action: 'Desfazer', run: Tools.undo }); } });
  });
  // (lote 18) a queda de um penhasco: a regra sugere o dano; o mestre aplica (ou não)
  Store.on('queda', d => {
    const t = Store.get('tokens', d.tok), sc = Store.scene();
    if (!t || !isGM()) return;
    const un = (sc.grid && sc.grid.unitName) || '', alt = fmt(d.m) + (un ? ' ' + un : '');
    if (!d.dano || !d.barra) { toast(`${tokName(t)} caiu ${alt}: a regra sugere ${d.pct}% da Vida máxima.`, { key: 'queda-' + d.tok, long: true }); return; }
    toast(`${tokName(t)} caiu ${alt}: a regra sugere ${d.pct}% da Vida máxima (${fmt(d.dano)} de ${d.barra}).`, { action: 'Aplicar o dano', key: 'queda-' + d.tok, long: true,
      run: () => { const tk = Store.get('tokens', d.tok); if (tk && Combate.aplicarAtaque([{ t: tk, final: d.dano }], d.barra, 'Dano da queda').length) toast(`${tokName(tk)}: −${fmt(d.dano)} de ${d.barra} (queda).`, { action: 'Desfazer', run: Tools.undo }); } });
  });
  // (lote 20) o HP abaixo de zero: a regra sugere o Ferido; o mestre aplica (ou não)
  Store.on('ferido', d => {
    const t = Store.get('tokens', d.tok);
    if (!t || !isGM()) return;
    const nome = (COND_BY_ID[d.id] || {}).n || d.id;
    toast(`${tokName(t)} está com ${fmtV(d.v)} de ${d.barra} (o limite é −${fmt(d.lo)}): a regra sugere ${nome}.`, { action: 'Aplicar', key: 'ferido-' + d.tok, long: true,
      run: () => { const tk = Store.get('tokens', d.tok); if (tk && Act.feridoAplicar(tk, d.id)) toast(`${tokName(tk)}: ${nome}.`, { action: 'Desfazer', run: Tools.undo }); } });
  });
  Store.on('runas', d => {
    const t = Store.get('tokens', d.tok);
    if (!t || !isGM()) return;
    const fx = Store.get('effects', d.fx), nome = fx && FX.P[fx.fx] ? FX.P[fx.fx].n : 'Runas-armadilha';        // (lote 19: e as arapucas)
    toast(`${tokName(t)} ${fx && fx.fx !== 'runas' ? 'entrou na' : 'pisou nas'} ${nome}.`, { action: 'Revelar', run: () => { if (Store.get('effects', d.fx)) Store.tx(fx && fx.fx !== 'runas' ? 'Revelar a ' + nome : 'Revelar as runas', () => Store.upd('effects', d.fx, { gm: false })); }, key: 'runas-' + d.fx, long: true });
  });

  /* ================= Véu do mestre =================
     A opção fica guardada como preferência de quem está olhando (não entra no desfazer da cena).
     Enquanto o véu está ligado, uma legenda pequena no canto do mapa diz de quem é a visão mostrada. */
  function setVeil(on) {
    App.showVision = !!on; Store.S.prefs.showVision = App.showVision;
    Persist.meta(); Vision.invalidate(); Render.request(); refresh();
  }
  function renderVeil() {
    const v = veilState(Store.scene());
    el.veil.hidden = !v;
    if (!v) { el.veil.replaceChildren(); return; }
    const text = v.tok ? 'Véu: visão de ' + tokName(v.tok) : 'Véu: visão dos jogadores';
    const a = document.activeElement, had = a && a.id === 'veilOff';
    el.veil.replaceChildren(icon('eye', 15), h('span', { class: 'veilchip-t', id: 'veilText', text }),
      h('button', { type: 'button', class: 'ib veilchip-x', id: 'veilOff', title: 'Desligar o véu', 'aria-label': 'Desligar o véu', onclick: () => { setVeil(false); toast('Véu desligado.', { action: 'Desfazer', run: () => setVeil(true) }); } }, icon('x', 14)));
    el.veil.title = v.tok ? 'O que está escurecido, ' + tokName(v.tok) + ' não enxerga agora' : 'O que está escurecido, nenhum jogador enxerga agora';
    if (had) document.getElementById('veilOff').focus({ preventScroll: true });
  }

  /* ================= Rodapé do mapa ================= */
  function status() {
    const sc = Store.scene();
    if (!sc) return;
    const m = App.mouse;
    let txt = '';
    if (m.inside && m.x >= 0 && m.y >= 0 && m.x < sceneW(sc) && m.y < sceneH(sc)) txt = `Coluna ${Math.floor(m.x / sc.cell) + 1} · Linha ${Math.floor(m.y / sc.cell) + 1}`;
    // Terreno sob o cursor: o rodapé diz o que é, e o mapa também (a dica que aparece ao parar o mouse)
    let chao = '';
    if (txt && sc.shapes.length) { const ter = Combate.terrainAt(sc, m.x, m.y); if (ter && !Vision.covered(m.x, m.y)) chao = Combate.terText(ter, sc); }
    if (chao) txt += '  ·  ' + chao;
    if (Render.cv.title !== chao) Render.cv.title = chao;
    const sv = Nuvem.jogador() ? (saveState === 'saving' ? 'Enviando…' : saveState === 'espera' ? 'Esperando o mestre: o que você fez entra quando ele estiver na mesa' : 'Ao vivo com a mesa')
      : saveState === 'mem' ? 'Sem salvamento neste navegador' : saveState === 'erro' ? 'Não foi possível salvar' : saveState === 'saving' ? 'Salvando…' : Nuvem.mestre() ? 'Salvo na mesa' : 'Salvo neste navegador';
    const full = (txt ? txt + '  ·  ' : '') + sv;
    if (full !== statusText) { statusText = full; el.status.textContent = full; el.status.classList.toggle('warn', saveState === 'mem' || saveState === 'erro' || saveState === 'espera'); }
    if (zoomLabel) { const zt = Math.round(App.view.z * 100) + '%'; if (zoomLabel.textContent !== zt) zoomLabel.textContent = zt; }
  }

  /* ================= Atualização geral ================= */
  function renderAll() {
    const sc = Store.scene();
    if (!sc) return;
    pruneSel();
    try { if (Vision.isDirty()) Vision.update(sc, App.viewer); }   // a faixa do jogador depende do que ele enxerga
    catch (err) { /* a visão fica pendente; quem avisa do problema é o desenho do mapa */ }
    renderTop(); renderBanner(); renderRail(); renderOpts(); renderSide(); renderHud(); renderVeil(); turnBanner(); status();
    if (modalEl && modalLive) modalLive();
    Luta.refresh();
    document.title = 'Cenas · Tiny Cats';
  }
  function refresh() {
    if (timer) return;
    timer = setTimeout(() => {
      timer = 0;
      if (pressing) { pending = true; return; }
      renderAll();
    }, 0);
  }

  return {
    refresh, renderAll, toast, modal, closeMenus, contextMenu, openTab, editText, status,
    prompt: promptBox, confirm: confirmBox, importImages, initCaps, setViewer, switchScene, offerLocal,
    modalOpen: () => !!modalEl || Tour.active(),
    closeModal, condPicker, barDefaultsBox, areaBox, bagBox, iniFromTable, passarTurno,
    // (lote 8) a Ferida permanente e o Clone (as janelas; escolher o real no mapa)
    feridaBox, cloneBox, escolherReal, fimEscolhaReal, escolhendoReal: () => !!App.escolhaReal,
    // (lote 7) as famílias de cenas e as passagens, para o gerador de lugares
    passagem, porNaFamilia, herdarCampanha, maeDaCena, colocarCena, organizarCenas, ligarObjeto, showToPlayers, menuEm: menu, familiasVistas,
    frame() { if (zoomLabel) { const zt = Math.round(App.view.z * 100) + '%'; if (zoomLabel.textContent !== zt) zoomLabel.textContent = zt; } },
    setSave(s) { saveState = s; status(); },
    hint: setHint,                                        // a linha de dica muda sem redesenhar o resto (cursor sobre um item travado)
    // as peças de formulário e as janelas, para as telas de combate (10c-combate.js)
    kit: { field, inText, inNum, inSelect, toggle, seg, btn, iconBtn, sec, note, tokenAvatar, stepper, deleteSelToast, layer: el.layer, live(fn) { modalLive = fn; }, card: () => modalEl },
  };
})();
