/* ---------------------------------------------------------------
   10. UI — barra do topo, trilho de ferramentas, painel, menus e janelas
   A interface é redesenhada por inteiro a cada alteração confirmada
   (Store 'commit'); os campos têm id fixo para o foco voltar ao lugar.
   --------------------------------------------------------------- */
const UI = (() => {
  const el = {
    top: $('#top'), banner: $('#banner'), rail: $('#rail'), opts: $('#opts'), hud: $('#hud'), hint: $('#hint'),
    status: $('#status'), side: $('#side'), layer: $('#layer'), toasts: $('#toasts'), stage: $('#stage'),
    fileImg: $('#fileImg'), fileJson: $('#fileJson'), drop: $('#drop'), toastsTop: $('#toastsTop'),
  };
  const secOpen = {};
  let modalEl = null, modalCfg = null, menuEl = null, menuAnchor = null, skipOpen = false;
  let pressing = false, pending = false, timer = 0;
  let downloads = null, imgTarget = null, zoomLabel = null, statusText = '', saveState = 'ok';
  let thumbRaf = 0;

  /* ================= Peças de formulário ================= */
  const field = (label, control, cls) => h('div', { class: 'field' + (cls ? ' ' + cls : '') }, h('label', { class: 'lb', for: control && control.id ? control.id : null, text: label }), control);
  const inText = (id, value, onChange, attrs) => h('input', Object.assign({ id, type: 'text', class: 'in', value: value == null ? '' : value, autocomplete: 'off', onchange: e => onChange(e.target.value) }, attrs || {}));
  function inNum(id, value, onChange, a) {
    const o = a || {};
    return h('input', {
      id, type: 'number', class: 'in num', value, min: o.min, max: o.max, step: o.step || 1, disabled: o.disabled, 'aria-label': o.label,
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
  const seg = (id, value, options, onChange) => h('div', { class: 'seg', role: 'group', id },
    options.map(([v, l, ic]) => h('button', { type: 'button', class: 'seg-b' + (v === value ? ' on' : ''), 'aria-pressed': String(v === value), title: l, onclick: () => { if (v !== value) onChange(v); } }, ic ? icon(ic, 16) : l)));
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
    const t = h('div', { class: 'toast' }, h('span', { text }),
      o && o.action ? h('button', { type: 'button', class: 'toast-a', text: o.action, onclick: () => { t.remove(); o.run(); } }) : null);
    const host = modalEl ? el.toastsTop : el.toasts;       // com uma janela aberta, o aviso sobe para a frente dela
    host.append(t);
    while (host.children.length > 3) host.firstChild.remove();
    setTimeout(() => t.remove(), o && o.action ? 6500 : 3400);
  }

  function closeMenus() { if (menuEl) { menuEl.remove(); menuEl = null; menuAnchor = null; } }
  function menu(x, y, items, o) {
    closeMenus();
    menuEl = h('div', { class: 'menu', role: 'menu' }, items.filter(Boolean).map(it => {
      if (it === '-') return h('div', { class: 'menu-sep' });
      if (it.head) return h('div', { class: 'menu-h', text: it.head });
      return h('button', { type: 'button', class: 'menu-i' + (it.danger ? ' danger' : ''), role: 'menuitem', disabled: it.disabled, onclick: () => { closeMenus(); it.run(); } },
        it.check != null ? h('span', { class: 'menu-ck' }, it.check ? icon('check', 15) : null) : it.icon ? icon(it.icon, 16) : h('span', { class: 'menu-ck' }),
        h('span', { class: 'menu-l', text: it.label }), it.key ? h('span', { class: 'menu-k', text: it.key }) : null);
    }));
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

  function closeModal() { if (modalEl) { modalEl.remove(); modalEl = null; modalCfg = null; } }
  function modal(o) {
    closeModal(); closeMenus();
    const card = h('div', { class: 'modal' + (o.wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title },
      h('h2', { class: 'modal-t', text: o.title }),
      o.text ? h('p', { class: 'modal-p', text: o.text }) : null,
      o.body || null,
      h('div', { class: 'modal-a' }, (o.actions || []).filter(Boolean).map(a => btn(a.label, () => { if (a.run && a.run() === false) return; if (!a.keep) closeModal(); }, { kind: a.kind || 'ghost' }))));
    modalCfg = o;
    modalEl = h('div', { class: 'scrim', onpointerdown: e => { if (e.target === modalEl) { closeModal(); if (o.onCancel) o.onCancel(); } } }, card);
    el.layer.append(modalEl);
    const f = card.querySelector('[data-focus]') || card.querySelector('input:not([type=hidden]), textarea, select') || card.querySelector('.btn.primary') || card.querySelector('button');
    if (f) { f.focus(); if (f.select && f.type !== 'range' && f.type !== 'checkbox' && f.type !== 'color') f.select(); }
    return card;
  }
  document.addEventListener('keydown', e => {
    if (menuEl && e.key === 'Escape') { closeMenus(); e.stopPropagation(); return; }
    if (!modalEl) return;
    if (e.key === 'Escape') { const c = modalCfg; closeModal(); if (c && c.onCancel) c.onCancel(); e.stopPropagation(); }
    else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
      const p = modalEl.querySelector('.btn.primary');
      if (p) { e.preventDefault(); p.click(); }
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
      Store.tx('Imagem do token', () => Store.upd('tokens', t.id, { img: a.id }));
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
    const hit = at ? Tools.hitTest(at, { tokensOnly: true }) : null;
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
    if (modalEl || focusKind(e.target) === 'text') return;
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
  const framed = (() => { try { return window.top !== window.self; } catch (e) { return true; } })();
  let capsReady = Promise.resolve(null);
  function initCaps() {
    try {
      if (window.claude && typeof window.claude.use === 'function') {
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
  async function saveFile(name, text) {
    // O recurso de salvar pode ainda estar chegando logo depois de a página abrir: espera um instante por ele.
    if (!downloads && framed) await Promise.race([capsReady, new Promise(r => setTimeout(r, 1500))]);
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
    if (!framed) {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = h('a', { href: url, download: name });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('Arquivo enviado para a pasta de downloads.');
      return;
    }
    copyBox(name, text, 'Este visualizador não deixa a página salvar arquivos.');
  }
  function sceneAssets(scenes) {
    const out = {};
    for (const sc of scenes) {
      if (sc.bg && sc.bg.asset && Store.S.assets[sc.bg.asset]) out[sc.bg.asset] = Store.S.assets[sc.bg.asset];
      for (const t of sc.tokens) if (t.img && Store.S.assets[t.img]) out[t.img] = Store.S.assets[t.img];
    }
    return out;
  }
  function exportScene() {
    const sc = Store.scene();
    const copy = clone(sc); copy.explored = {};
    saveFile(`cena-${slug(sc.name)}.json`, JSON.stringify({ format: 'urgm-cena', version: 1, scene: copy, players: Store.S.players, assets: sceneAssets([sc]) }));
  }
  function exportAll() {
    Vision.flushExplored();
    const scenes = Store.S.order.map(id => Store.S.scenes[id]);
    saveFile('cenas-de-urgm.json', JSON.stringify({ format: 'urgm-mesa', version: 1, scenes, players: Store.S.players, assets: sceneAssets(scenes) }));
  }
  function importText(text) {
    let d;
    try { d = JSON.parse(text); } catch (e) { toast('Esse arquivo não é um JSON válido.'); return; }
    const scenes = d && d.format === 'urgm-cena' && d.scene ? [d.scene] : d && d.format === 'urgm-mesa' && Array.isArray(d.scenes) ? d.scenes : null;
    if (!scenes || !scenes.length) { toast('Esse arquivo não parece ter sido exportado por esta mesa.'); return; }
    for (const id in d.assets || {}) Assets.fromData(d.assets[id]);
    for (const p of d.players || []) if (p && p.id && !playerById(p.id)) Store.S.players.push({ id: p.id, name: p.name || 'Jogador', color: p.color || PLAYER_COLORS[Store.S.players.length % PLAYER_COLORS.length] });
    let first = null;
    for (const raw of scenes) {
      if (!raw || !Array.isArray(raw.tokens)) continue;
      const sc = normalizeScene(clone(raw));
      if (!sc.id || Store.S.scenes[sc.id]) sc.id = uid('cena');
      Store.addScene(sc);
      Persist.scene(sc.id);
      first = first || sc.id;
    }
    if (!first) { toast('Não encontrei nenhuma cena dentro do arquivo.'); return; }
    Persist.meta();
    switchScene(first);
    toast(scenes.length === 1 ? 'Cena importada.' : `${scenes.length} cenas importadas.`);
  }
  el.fileJson.addEventListener('change', () => {
    const f = el.fileJson.files && el.fileJson.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => importText(String(rd.result || ''));
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
  function duplicateScene() {
    const src = Store.scene(), sc = clone(src);
    sc.id = uid('cena'); sc.name = src.name + ' (cópia)'; sc.explored = {}; delete sc.sample;
    Store.addScene(sc); Persist.scene(sc.id);
    switchScene(sc.id);
    toast('Cena duplicada.');
  }
  function renameScene() {
    const sc = Store.scene();
    promptBox('Renomear cena', 'Nome da cena', sc.name).then(name => { if (name && name.trim()) Store.tx('Renomear cena', () => Store.scn({ name: name.trim() })); });
  }
  function deleteScene() {
    const sc = Store.scene();
    confirmBox('Apagar esta cena?', `"${sc.name}" e tudo o que está nela serão apagados. Isso não pode ser desfeito.`, 'Apagar cena', true).then(ok => {
      if (!ok) return;
      const id = sc.id;
      Store.removeScene(id); Persist.removeScene(id);
      if (!Store.S.order.length) { const n = newScene('Nova cena'); Store.addScene(n); Persist.scene(n.id); }
      switchScene(Store.S.order[0]);
    });
  }
  function setViewer(v) {
    if (v !== 'gm' && !playerById(v)) v = 'gm';
    Tools.cancel();
    App.viewer = v;
    App.sel = [];
    if (!Tools.allowed(App.tool)) Tools.set('select');
    if (v !== 'gm' && (App.tab === 'scene' || App.tab === 'players')) App.tab = 'sel';
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
    el.top.replaceChildren(
      h('span', { class: 'brand', text: 'Cenas de Urgm' }),
      gm ? sceneBtn : h('span', { class: 'scene-b flat' }, icon('map', 17), h('span', { class: 'scene-n', text: sc.name })),
      h('div', { class: 'grp' },
        iconBtn('undo', 'Desfazer (Ctrl+Z)', Tools.undo, { disabled: !Store.canUndo(), id: 'undoBtn' }),
        iconBtn('redo', 'Refazer (Ctrl+Shift+Z)', Tools.redo, { disabled: !Store.canRedo(), id: 'redoBtn' })),
      h('span', { class: 'spacer' }),
      h('label', { class: 'viewer' }, h('span', { class: 'viewer-l', text: 'Vendo como' }),
        inSelect('viewerSel', App.viewer, [['gm', 'Mestre']].concat(Store.S.players.map(p => [p.id, p.name])), setViewer, { title: 'Testar a cena como o mestre ou como um jogador' })),
      h('div', { class: 'grp zoom' }, iconBtn('minus', 'Afastar (-)', () => zoomBy(1 / 1.25), { size: 16 }), zoomLabel, iconBtn('plus', 'Aproximar (+)', () => zoomBy(1.25), { size: 16 })),
      more,
      iconBtn('panel', App.sideOpen ? 'Esconder o painel' : 'Mostrar o painel', () => { App.sideOpen = !App.sideOpen; refresh(); }, { on: App.sideOpen, id: 'panelBtn' }));
  }
  function sceneMenu() {
    const items = [{ head: 'Cenas' }];
    for (const id of Store.S.order) { const s = Store.S.scenes[id]; items.push({ label: s.name, check: id === Store.S.current, run: () => switchScene(id) }); }
    items.push('-', { label: 'Nova cena', icon: 'plus', run: newSceneFlow }, { label: 'Duplicar esta cena', icon: 'copy', run: duplicateScene },
      { label: 'Renomear', icon: 'edit', run: renameScene }, { label: 'Apagar esta cena…', icon: 'trash', danger: true, run: deleteScene });
    return items;
  }
  function fileMenu() {
    const gm = isGM();
    return [
      gm ? { label: 'Exportar esta cena', icon: 'download', run: exportScene } : null,
      gm ? { label: 'Exportar todas as cenas', icon: 'download', run: exportAll } : null,
      gm ? { label: 'Importar cena…', icon: 'upload', run: importFile } : null,
      gm ? '-' : null,
      { label: 'Animar os efeitos de magia', check: App.anim, run: () => { App.anim = !App.anim; Store.S.prefs.anim = App.anim; Persist.meta(); Render.request(); } },
      { label: 'Atalhos de teclado', icon: 'help', run: helpBox },
    ];
  }
  function helpBox() {
    const rows = [
      ['V', 'Selecionar'], ['H ou espaço + arrastar', 'Mover a câmera'], ['Roda do mouse', 'Aproximar e afastar'], ['0', 'Enquadrar a cena'],
      ['T', 'Novo token'], ['B · L · R · O · P · X', 'Desenho livre, linha, retângulo, elipse, polígono, texto'], ['W · D', 'Parede · porta'],
      ['I', 'Luz'], ['N', 'Névoa manual'], ['E', 'Efeito de magia'], ['M', 'Régua'], ['G', 'Ping no ponto onde o cursor está'],
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
    if (isGM()) { el.banner.hidden = true; return; }
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

  function renderOpts() {
    const t = App.tool, o = App.opt, sc = Store.scene(), gm = isGM(), kids = [];
    if (t === 'token') {
      kids.push(oGroup('Dono', inSelect('o-owner', o.tokOwner, [['', 'Mestre (NPC)'], ['*', 'Todos os jogadores']].concat(Store.S.players.map(p => [p.id, p.name])), v => optSet('tokOwner', v))));
      kids.push(oGroup('Tamanho', seg('o-size', o.tokSize, [[0.5, '½'], [1, '1'], [2, '2'], [3, '3'], [4, '4']], v => optSet('tokSize', v, true))));
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
      kids.push(seg('o-wk', o.wallKind, [['wall', 'Parede'], ['door', 'Porta']], v => optSet('wallKind', v, true)));
      if (!sc.fog.dynamic) kids.push(h('span', { class: 'o-warn' }, 'A visão por paredes está desligada nesta cena.', btn('Ligar', () => Store.tx('Ligar visão por paredes', () => Store.scn({ fog: Object.assign({}, sc.fog, { dynamic: true }) })), { kind: 'small' })));
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
    } else if (t === 'fx') {
      kids.push(oGroup('Efeito', inSelect('o-fx', o.fx, FX.ORDER.map(id => [id, FX.P[id].n]), v => optSet('fx', v, true))));
      kids.push(seg('o-fxk', o.fxShape, [['circ', 'Círculo'], ['quad', 'Quadrado'], ['cone', 'Cone'], ['line', 'Linha']], v => optSet('fxShape', v, true)));
      kids.push(oGroup(o.fxShape === 'line' ? 'Comprimento' : o.fxShape === 'cone' ? 'Alcance' : 'Raio', h('input', { id: 'o-fxr', type: 'number', class: 'in num', min: 0.5, max: 60, step: 0.5, value: o.fxR, 'aria-label': 'Tamanho em quadrados', onchange: e => optSet('fxR', clamp(parseFloat(e.target.value) || 1, 0.5, 60)) }), h('span', { class: 'o-u', text: 'q' })));
      if (o.fxShape === 'cone') kids.push(oGroup('Abertura', h('input', { id: 'o-fxa', type: 'number', class: 'in num', min: 10, max: 340, step: 5, value: o.fxAng, onchange: e => optSet('fxAng', clamp(parseFloat(e.target.value) || 60, 10, 340)) }), h('span', { class: 'o-u', text: '°' })));
      if (o.fxShape === 'line') kids.push(oGroup('Largura', h('input', { id: 'o-fxw', type: 'number', class: 'in num', min: 0.5, max: 20, step: 0.5, value: o.fxW, onchange: e => optSet('fxW', clamp(parseFloat(e.target.value) || 1, 0.5, 20)) }), h('span', { class: 'o-u', text: 'q' })));
      kids.push(oCheck('o-fxat', 'fxAttach', 'Prender ao token clicado'));
    }
    el.opts.hidden = !kids.length;
    el.opts.replaceChildren(...kids);
    el.hint.textContent = Tools.hint();
  }
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
  function renderSide() {
    el.side.hidden = !App.sideOpen;
    if (!App.sideOpen) { el.side.replaceChildren(); return; }
    const a = document.activeElement;
    const fid = a && a.id && el.side.contains(a) ? a.id : null;
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
    el.side.replaceChildren(
      h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([id, n]) => h('button', { type: 'button', class: 'tab' + (id === App.tab ? ' on' : ''), role: 'tab', id: 'tab-' + id, 'aria-selected': String(id === App.tab), onclick: () => { App.tab = id; renderSide(); } }, n))),
      bodyEl);
    if (oldTab === App.tab) bodyEl.scrollTop = scroll;
    if (fid) {
      const n = document.getElementById(fid);
      if (n) { n.focus({ preventScroll: true }); try { if (ss != null) n.setSelectionRange(ss, se); } catch (e) { /* campo sem cursor de texto */ } }
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
      gm ? h('div', { class: 'row' }, btn('Novo token', () => Tools.set('token'), { icon: 'token' }), btn('Trazer imagem…', () => pickImage(f => importImages(f, null)), { icon: 'image' })) : null,
    ];
  }
  function ownerLabel(t) {
    if (!t.owner) return 'Do mestre (NPC)';
    if (t.owner === '*') return 'De todos os jogadores';
    const p = playerById(t.owner);
    return p ? 'De ' + p.name : 'Dono desconhecido';
  }
  function condChip(c, on, onClick) {
    return h('button', { type: 'button', class: 'chip' + (on ? ' on' : ''), 'aria-pressed': onClick ? String(on) : null, disabled: !onClick, title: c.n, onclick: onClick },
      h('span', { class: 'chip-i', style: { background: c.c } }, icon(c.i, 12)), h('span', { text: c.n }));
  }
  const condGrid = toks => h('div', { class: 'chips' }, CONDS.map(c => condChip(c, toks.every(t => t.conds.includes(c.id)), () => Act.condToggle(toks, c.id))));
  function condPicker(toks) {
    if (!toks.length) return;
    const ids = toks.map(t => t.id);
    const body = h('div', { class: 'chips' });
    const paint = () => {
      const live = ids.map(id => Store.get('tokens', id)).filter(Boolean);
      body.replaceChildren(...CONDS.map(c => condChip(c, live.length > 0 && live.every(t => t.conds.includes(c.id)), () => { Act.condToggle(live, c.id); paint(); })));
    };
    paint();
    modal({ title: toks.length > 1 ? `Condições de ${toks.length} tokens` : 'Condições de ' + tokName(toks[0]), body, wide: true, actions: [{ label: 'Pronto', kind: 'primary' }] });
  }

  function barsEditor(t, full) {
    return h('div', { class: 'bars' }, t.bars.map((b, i) => {
      if (!full && !b.on) return null;
      const val = h('input', {
        id: `tk-b${i}-v`, class: 'in bar-v', type: 'text', inputmode: 'decimal', value: b.v, autocomplete: 'off',
        'aria-label': b.n + ' atual', title: 'Digite um valor, ou +5 e -8 para somar e subtrair',
        onchange: e => { if (!Act.barSet(t, i, e.target.value)) e.target.value = b.v; },
      });
      return h('div', { class: 'bar-row' + (b.on ? '' : ' off') },
        full ? h('input', { type: 'checkbox', id: `tk-b${i}-on`, class: 'ck', checked: b.on, title: 'Usar esta barra', 'aria-label': 'Usar a barra ' + b.n, onchange: e => Act.barPatch(t, i, { on: e.target.checked }) }) : null,
        full ? inColor(`tk-b${i}-c`, b.c, v => Store.upd('tokens', t.id, { bars: t.bars.map((x, j) => (j === i ? Object.assign({}, x, { c: v }) : x)) }), 'Cor da barra ' + b.n)
          : h('span', { class: 'bar-dot', style: { background: b.c } }),
        full ? inText(`tk-b${i}-n`, b.n, v => Act.barPatch(t, i, { n: v.trim() || b.n }), { class: 'in bar-n', 'aria-label': 'Nome da barra' }) : h('span', { class: 'bar-n ro', text: b.n }),
        val, h('span', { class: 'bar-sl', text: '/' }),
        full ? inNum(`tk-b${i}-m`, b.m, v => Act.barPatch(t, i, { m: v }), { min: 0, label: b.n + ' máximo' }) : h('span', { class: 'bar-m', text: fmt(b.m) }));
    }));
  }
  function barsReadOnly(t) {
    const mode = barsMode(t), bars = t.bars.filter(b => b.on && b.m > 0);
    if (mode === 'none' || !bars.length) return note('O mestre não mostra as barras deste token.');
    return h('div', { class: 'bars' }, bars.map(b => h('div', { class: 'bar-ro' },
      h('span', { class: 'bar-n ro', text: b.n }),
      h('span', { class: 'meter' }, h('span', { class: 'meter-f', style: { width: clamp(b.v / b.m * 100, 0, 100) + '%', background: b.c } })),
      mode === 'num' ? h('span', { class: 'bar-m', text: `${fmt(b.v)}/${fmt(b.m)}` }) : null)));
  }

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
        isGM() ? toggle(`au${i}-p`, a.pub, v => setA(i, { pub: v }), 'Jogadores veem esta aura') : null)),
      btn('Adicionar aura', () => Store.tx('Adicionar aura', () => Store.upd('tokens', t.id, { auras: t.auras.concat({ id: uid('au'), k: 'circ', r: 2, c: '#e6ab4f', a: 0.2, ang: 60, dir: 0, pub: true }) })), { icon: 'plus' }),
      t.auras.some(a => a.k === 'cone') ? note('Com o token selecionado, arraste a bolinha na ponta do cone para girar e esticar.') : null,
    ];
  }

  function imageField(t) {
    const a = t.img ? Store.S.assets[t.img] : null;
    const others = Object.values(Store.S.assets).filter(x => x.kind === 'token' && x.id !== t.img).slice(0, 12);
    return h('div', { class: 'field stack' }, h('span', { class: 'lb', text: 'Imagem' }),
      h('div', { class: 'row' },
        btn(a ? 'Trocar' : 'Escolher imagem', () => pickImage(f => setTokenImage(t, f[0])), { icon: 'image' }),
        a ? btn('Remover', () => Store.tx('Remover imagem', () => Store.upd('tokens', t.id, { img: null }))) : null),
      others.length ? h('div', { class: 'thumbs' }, others.map(x => h('button', { type: 'button', class: 'thumb', title: 'Usar ' + (x.name || 'esta imagem'), 'aria-label': 'Usar ' + (x.name || 'esta imagem'), style: { backgroundImage: `url("${x.url}")` }, onclick: () => Store.tx('Imagem do token', () => Store.upd('tokens', t.id, { img: x.id })) }))) : null);
  }

  function tokenPanel(t) {
    const gm = isGM(), sc = Store.scene();
    const U = (p, label) => Store.tx(label || 'Editar token', () => Store.upd('tokens', t.id, p));
    const head = h('div', { class: 'p-head' }, tokenAvatar(t, 44),
      h('div', { class: 'p-head-t' }, h('h3', { class: 'p-title', text: tokName(t) }), h('div', { class: 'p-sub', text: ownerLabel(t) + (t.hidden && gm ? ' · oculto dos jogadores' : '') })));
    if (!gm) {
      const mine = ownsTok(t);
      const live = t.conds.map(id => COND_BY_ID[id]).filter(Boolean);
      return [head,
        sec('s-bars', 'Barras', true, mine && can('bars', t) ? barsEditor(t, false) : barsReadOnly(t)),
        sec('s-cond', 'Condições', true, mine && can('conds', t) ? condGrid([t]) : live.length ? h('div', { class: 'chips' }, live.map(c => condChip(c, true, null))) : note('Nenhuma condição.')),
        mine && can('auras', t) ? sec('s-aura', 'Auras', t.auras.length > 0, auraEditor(t)) : null];
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
        field('Quem não é dono vê', seg('tk-barvis', t.barVis, [['num', 'Números'], ['bar', 'Só a barra'], ['none', 'Nada']], v => U({ barVis: v })), 'stack')),
      sec('s-cond', 'Condições', true, condGrid([t])),
      sec('s-aura', 'Auras', t.auras.length > 0, auraEditor(t)),
      sec('s-vis', 'Visão e luz', false,
        toggle('tk-vis', V.on, v => U({ vis: Object.assign({}, V, { on: v }) }), 'Enxerga (quando tem um jogador como dono)'),
        V.on ? h('div', { class: 'grid2' },
          field('Alcance (q)', inNum('tk-vr', V.range, v => U({ vis: Object.assign({}, V, { range: v }) }), { min: 0, max: 200, step: 1 })),
          field('No escuro (q)', inNum('tk-vd', V.dark, v => U({ vis: Object.assign({}, V, { dark: v }) }), { min: 0, max: 200, step: 1 }))) : null,
        V.on ? note('Alcance 0 significa sem limite. "No escuro" é até onde o token enxerga sem luz nenhuma.') : null,
        toggle('tk-light', L.on, v => U({ light: Object.assign({}, L, { on: v }) }), 'Carrega uma luz'),
        L.on ? [
          field('Tipo', inSelect('tk-lp', '', [['', 'Escolher…']].concat(LIGHT_PRESETS.map(p => [p.id, p.n])), v => { const p = LIGHT_PRESETS.find(x => x.id === v); if (p) U({ light: { on: true, bright: p.bright, dim: p.dim, c: p.c } }, 'Tipo de luz'); })),
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
          btn('Aos turnos', () => { const n = Act.turnAdd([t]); toast(n ? `${t.name} entrou na ordem de turnos.` : `${t.name} já está na ordem de turnos.`); }, { icon: 'turns' }),
          btn('Duplicar', Act.duplicateSel, { icon: 'copy' }),
          btn('Apagar', deleteSelToast, { icon: 'trash', kind: 'danger' }))),
    ];
  }
  function deleteSelToast() {
    const n = Act.deleteSel();
    if (n) toast(n === 1 ? 'Item apagado.' : `${n} itens apagados.`, { action: 'Desfazer', run: Tools.undo });
  }

  function multiTokenPanel(toks) {
    const gm = isGM();
    const editable = toks.filter(t => gm || can('bars', t));
    const sel = h('select', { id: 'mt-bar', class: 'in' }, [0, 1, 2].map(i => h('option', { value: i, text: `${i + 1}ª barra (${toks[0].bars[i].n})` })));
    const amt = h('input', { id: 'mt-amt', class: 'in bar-v', type: 'text', inputmode: 'decimal', placeholder: '-5', autocomplete: 'off', 'aria-label': 'Quanto somar ou subtrair' });
    const apply = () => {
      const i = parseInt(sel.value, 10), txt = amt.value.trim();
      if (!/^[+-]?\d/.test(txt)) { toast('Digite um número, como -5 ou +10.'); return; }
      const rel = /^[+-]/.test(txt) ? txt : '-' + txt;
      Store.tx('Alterar barras', () => { for (const t of editable) { const b = t.bars[i]; if (!b.on) continue; const v = parseBar(rel, b.v, b.m); if (v != null) Store.upd('tokens', t.id, { bars: t.bars.map((x, j) => (j === i ? Object.assign({}, x, { v }) : x)) }); } });
      amt.value = '';
    };
    amt.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
    const condToks = toks.filter(t => gm || can('conds', t));
    return [
      h('div', { class: 'p-head' }, h('div', { class: 'stack-av' }, toks.slice(0, 5).map(t => tokenAvatar(t, 34))),
        h('div', { class: 'p-head-t' }, h('h3', { class: 'p-title', text: `${toks.length} tokens` }), h('div', { class: 'p-sub', text: 'O que você mudar aqui vale para todos.' }))),
      editable.length ? sec('s-mbar', 'Somar ou subtrair de todos', true,
        h('div', { class: 'row' }, sel, amt, btn('Aplicar', apply, { kind: 'primary' })),
        note('Sem sinal, o número é subtraído: útil para dano em área.')) : null,
      condToks.length ? sec('s-cond', 'Condições', true, condGrid(condToks)) : null,
      gm ? h('div', { class: 'row' },
        btn('Aos turnos', () => { const n = Act.turnAdd(toks); toast(n ? `${n} ${n === 1 ? 'token entrou' : 'tokens entraram'} na ordem de turnos.` : 'Todos já estavam na ordem de turnos.'); }, { icon: 'turns' }),
        btn(toks.every(t => t.hidden) ? 'Mostrar' : 'Ocultar', () => { const hide = !toks.every(t => t.hidden); Store.tx(hide ? 'Ocultar tokens' : 'Mostrar tokens', () => toks.forEach(t => Store.upd('tokens', t.id, { hidden: hide }))); }, { icon: toks.every(t => t.hidden) ? 'eye' : 'eyeOff' }),
        btn('Apagar', deleteSelToast, { icon: 'trash', kind: 'danger' })) : null,
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
      h('div', { class: 'p-head' }, h('div', { class: 'p-head-t' }, h('h3', { class: 'p-title', text: many ? `${shapes.length} desenhos` : NAMES[s.k] }), h('div', { class: 'p-sub', text: s.lock ? 'Travado' : 'Arraste para mover; puxe as alças para mudar o tamanho.' }))),
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
        toggle('sh-lock', !!s.lock, v => all({ lock: v }, v ? 'Travar desenho' : 'Destravar desenho'), 'Travado (não seleciona com clique)'),
        s.lock ? note('Para destravar depois, use o botão direito sobre o desenho.') : null),
      h('div', { class: 'row' },
        btn('Duplicar', Act.duplicateSel, { icon: 'copy' }),
        btn('Frente', () => Act.toFront('shapes', shapes.map(x => x.id), true), { icon: 'front' }),
        btn('Trás', () => Act.toFront('shapes', shapes.map(x => x.id), false), { icon: 'back' }),
        btn('Apagar', deleteSelToast, { icon: 'trash', kind: 'danger' })),
    ];
  }

  function fxPanel(e) {
    const sc = Store.scene(), gm = isGM();
    const U = (p, label) => Store.tx(label || 'Editar efeito', () => Store.upd('effects', e.id, p));
    const pr = FX.P[e.fx] || FX.P.fogo;
    const tok = e.token ? Store.get('tokens', e.token) : null;
    return [
      h('div', { class: 'p-head' }, h('canvas', { class: 'fx-thumb big', width: 88, height: 88, data: { fx: e.fx } }),
        h('div', { class: 'p-head-t' }, h('h3', { class: 'p-title', text: pr.n }), h('div', { class: 'p-sub', text: tok ? 'Preso a ' + tok.name : 'Solto no mapa' }))),
      sec('s-fx', 'Efeito', true,
        field('Tipo', inSelect('fx-id', e.fx, FX.ORDER.map(id => [id, FX.P[id].n]), v => U({ fx: v }, 'Trocar efeito'))),
        field('Forma', seg('fx-k', e.k, [['circ', 'Círculo'], ['quad', 'Quadrado'], ['cone', 'Cone'], ['line', 'Linha']], v => U({ k: v }, 'Forma do efeito')), 'stack'),
        h('div', { class: 'grid2' },
          field(e.k === 'line' ? 'Comprimento (q)' : e.k === 'cone' ? 'Alcance (q)' : 'Raio (q)', inNum('fx-r', e.r, v => U({ r: v }), { min: 0.5, max: 60, step: 0.5 })),
          e.k === 'cone' ? field('Abertura (°)', inNum('fx-a', e.ang, v => U({ ang: v }), { min: 10, max: 340, step: 5 })) : null,
          e.k === 'line' ? field('Largura (q)', inNum('fx-w', e.w, v => U({ w: v }), { min: 0.5, max: 20, step: 0.5 })) : null,
          e.k !== 'circ' ? field('Direção (°)', inNum('fx-d', Math.round(e.dir || 0), v => U({ dir: ((v % 360) + 360) % 360 }), { min: -360, max: 720, step: 15 })) : null),
        field('Intensidade', inRange('fx-p', e.pow, 0.2, 1, 0.05, v => Store.upd('effects', e.id, { pow: v }), 'Intensidade do efeito')),
        note('Arraste a bolinha na borda do efeito para mudar o tamanho e a direção.')),
      sec('s-fx2', 'Onde fica', true,
        field('Preso a', inSelect('fx-tok', e.token || '', [['', 'Nada (fica no mapa)']].concat(sc.tokens.filter(t => gm || ownsTok(t)).map(t => [t.id, t.name])), v => {
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
        field('Tipo', inSelect('lz-pre', '', [['', 'Escolher…']].concat(LIGHT_PRESETS.map(p => [p.id, p.n])), v => { const p = LIGHT_PRESETS.find(x => x.id === v); if (p) U({ name: p.n, bright: p.bright, dim: p.dim, c: p.c }, 'Tipo de luz'); })),
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
    const doors = walls.every(x => x.k === 'door');
    return [
      h('div', { class: 'p-head' }, h('div', { class: 'p-head-t' }, h('h3', { class: 'p-title', text: many ? `${walls.length} trechos` : w.k === 'door' ? 'Porta' : 'Parede' }), h('div', { class: 'p-sub', text: 'Arraste as pontas para ajustar.' }))),
      sec('s-wall', 'Tipo', true,
        seg('wl-k', many && !walls.every(x => x.k === w.k) ? '' : w.k, [['wall', 'Parede'], ['door', 'Porta']], v => all({ k: v, open: false, locked: false }, 'Tipo de parede')),
        doors ? toggle('wl-open', walls.every(x => x.open), v => all({ open: v }, v ? 'Abrir porta' : 'Fechar porta'), 'Aberta') : null,
        doors ? toggle('wl-lock', walls.every(x => x.locked), v => all({ locked: v }, v ? 'Trancar porta' : 'Destrancar porta'), 'Trancada (jogadores não abrem)') : null,
        note(doors ? 'Fechada, a porta bloqueia visão, luz e passagem. Clique no ícone dela no mapa para abrir e fechar.' : 'Paredes bloqueiam a visão, a luz e a passagem dos jogadores.')),
      h('div', { class: 'row' }, btn('Apagar', deleteSelToast, { icon: 'trash', kind: 'danger' })),
    ];
  }

  function tabSel() {
    const toks = selOf('tokens'), shapes = selOf('shapes'), fxs = selOf('effects'), lights = selOf('lights'), walls = selOf('walls');
    const total = toks.length + shapes.length + fxs.length + lights.length + walls.length;
    if (!total) return emptySel();
    if (toks.length === total) return toks.length === 1 ? tokenPanel(toks[0]) : multiTokenPanel(toks);
    if (shapes.length === total) return shapePanel(shapes);
    if (fxs.length === 1 && total === 1) return fxPanel(fxs[0]);
    if (lights.length === 1 && total === 1) return lightPanel(lights[0]);
    if (walls.length === total) return wallPanel(walls);
    return [
      h('div', { class: 'p-head' }, h('div', { class: 'p-head-t' }, h('h3', { class: 'p-title', text: `${total} itens` }), h('div', { class: 'p-sub', text: 'Seleção de tipos diferentes. Dá para mover, duplicar ou apagar tudo junto.' }))),
      h('div', { class: 'row' }, btn('Duplicar', Act.duplicateSel, { icon: 'copy' }), btn('Apagar', deleteSelToast, { icon: 'trash', kind: 'danger' })),
    ];
  }

  /* ---- Aba Turnos ---- */
  function tabTurn() {
    const sc = Store.scene(), tn = sc.turn, gm = isGM();
    const rows = [];
    tn.list.forEach((e, i) => {
      const t = e.token ? Store.get('tokens', e.token) : null;
      if (!gm && t && t.hidden) return;
      const cur = tn.on && e.id === tn.cur;
      const name = t ? tokName(t) : e.name;
      rows.push(h('li', { class: 'turn' + (cur ? ' cur' : '') },
        h('button', { type: 'button', class: 'turn-m', title: t ? 'Mostrar no mapa' : name, disabled: !t, onclick: () => { if (!t) return; if (tokShown(t, sc)) setSel([{ c: 'tokens', id: t.id }]); const [cx, cy] = tokC(t, sc); if (tokShown(t, sc)) Render.centerOn(cx, cy); } },
          t ? tokenAvatar(t, 28) : h('span', { class: 'av', style: { width: '28px', height: '28px', backgroundColor: 'var(--hover)', color: 'var(--fg-2)', fontSize: '11px', borderColor: 'var(--line-strong)' } }, initials(name)),
          h('span', { class: 'turn-n', text: name }), cur ? h('span', { class: 'turn-now', text: 'vez' }) : null),
        gm ? inNum(`tn-${e.id}`, e.init == null ? '' : e.init, v => Act.turnPatch(x => { x.list.find(y => y.id === e.id).init = v; }, 'Iniciativa'), { step: 1, label: 'Iniciativa de ' + name })
          : h('span', { class: 'turn-i', text: e.init == null ? '–' : fmt(e.init) }),
        gm ? h('span', { class: 'turn-a' },
          iconBtn('up', 'Subir', () => Act.turnPatch(x => { if (i > 0) { const [m] = x.list.splice(i, 1); x.list.splice(i - 1, 0, m); } }), { size: 14, disabled: i === 0 }),
          iconBtn('down', 'Descer', () => Act.turnPatch(x => { if (i < x.list.length - 1) { const [m] = x.list.splice(i, 1); x.list.splice(i + 1, 0, m); } }), { size: 14, disabled: i === tn.list.length - 1 }),
          iconBtn('x', 'Tirar da ordem', () => Act.turnPatch(x => { x.list = x.list.filter(y => y.id !== e.id); }, 'Tirar dos turnos'), { size: 14 })) : null));
    });
    const selToks = selOf('tokens');
    return [
      h('div', { class: 'turn-head' },
        h('div', null, h('div', { class: 'p-sub', text: tn.on ? 'Combate em andamento' : 'Combate parado' }), h('div', { class: 'round', text: 'Rodada ' + tn.round })),
        gm ? h('div', { class: 'row tight' },
          iconBtn('prev', 'Turno anterior', () => Act.turnStep(-1), { disabled: !tn.list.length }),
          btn('Próximo turno', () => Act.turnStep(1), { kind: 'primary', icon: 'next', disabled: !tn.list.length, id: 'turnNext' })) : null),
      rows.length ? h('ol', { class: 'turns' }, rows) : h('p', { class: 'muted', text: gm ? 'Ninguém na ordem ainda. Selecione tokens no mapa e adicione-os aqui.' : 'O mestre ainda não montou a ordem de turnos.' }),
      gm ? h('div', { class: 'row' },
        btn(selToks.length ? `Adicionar ${selToks.length} selecionado${selToks.length > 1 ? 's' : ''}` : 'Adicionar selecionados', () => { Act.turnAdd(selToks); }, { icon: 'plus', disabled: !selToks.length }),
        btn('Entrada avulsa', () => promptBox('Entrada sem token', 'Nome', '', { ok: 'Adicionar' }).then(n => { if (n && n.trim()) Act.turnPatch(x => { x.list.push({ id: uid('tn'), token: null, name: n.trim(), init: null }); }, 'Adicionar aos turnos'); }))) : null,
      gm && tn.list.length ? h('div', { class: 'row' },
        btn('Ordenar por iniciativa', () => Act.turnPatch(x => { x.list.sort((a, b) => (b.init == null ? -Infinity : b.init) - (a.init == null ? -Infinity : a.init)); }, 'Ordenar turnos'), { icon: 'sort' }),
        btn(tn.on ? 'Encerrar' : 'Iniciar', () => Act.turnPatch(x => { x.on = !x.on; if (x.on) { x.round = 1; x.cur = x.list[0].id; } }, tn.on ? 'Encerrar combate' : 'Iniciar combate'), { icon: tn.on ? 'stop' : 'play' }),
        btn('Limpar', () => Act.turnPatch(x => { x.list = []; x.on = false; x.round = 1; }, 'Limpar turnos'), { icon: 'trash' })) : null,
    ];
  }

  /* ---- Aba Efeitos ---- */
  function tabFx() {
    const sc = Store.scene(), gm = isGM();
    const list = sc.effects.filter(e => fxShown(e));
    return [
      h('p', { class: 'muted', text: 'Escolha um efeito e clique no mapa. Ele fica na cena até alguém remover.' }),
      h('div', { class: 'fx-grid' }, FX.ORDER.map(id => h('button', { type: 'button', class: 'fx-card' + (App.tool === 'fx' && App.opt.fx === id ? ' on' : ''), id: 'fxc-' + id, title: 'Soltar ' + FX.P[id].n, onclick: () => { App.opt.fx = id; Tools.set('fx'); } },
        h('canvas', { class: 'fx-thumb', width: 112, height: 112, data: { fx: id } }), h('span', { class: 'fx-n', text: FX.P[id].n })))),
      sec('s-fxlist', `Na cena (${list.length})`, true,
        list.length ? h('ul', { class: 'list' }, list.map(e => {
          const tok = e.token ? Store.get('tokens', e.token) : null, mine = gm || can('editFx', e);
          return h('li', { class: 'li' + (selHas('effects', e.id) ? ' on' : '') },
            h('button', { type: 'button', class: 'li-m', disabled: !mine, onclick: () => { setSel([{ c: 'effects', id: e.id }]); Tools.set('select'); const g = FX.geom(e, sc); Render.centerOn(g.cx, g.cy); } },
              h('span', { class: 'li-dot', style: { background: (FX.P[e.fx] || FX.P.fogo).edge } }),
              h('span', { class: 'li-n', text: (FX.P[e.fx] || FX.P.fogo).n }),
              h('span', { class: 'li-s', text: tok ? 'em ' + tok.name : `${fmt(e.r)} q` + (e.gm ? ' · só mestre' : '') })),
            mine ? iconBtn('trash', 'Remover efeito', () => { Store.tx('Remover efeito', () => Store.del('effects', e.id)); pruneSel(); toast('Efeito removido.', { action: 'Desfazer', run: Tools.undo }); }, { size: 15 }) : null);
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
      sec('c-light', 'Luz, visão e névoa', true,
        field('Luz ambiente', seg('sc-light', sc.light, [['claro', 'Claro'], ['penumbra', 'Penumbra'], ['escuro', 'Escuro']], v => S({ light: v }, 'Luz ambiente')), 'stack'),
        note(sc.light === 'claro' ? 'Tudo iluminado. As fontes de luz não fazem diferença.' : sc.light === 'penumbra' ? 'Dá para enxergar, mas escuro. As fontes de luz clareiam ao redor.' : 'Os jogadores só enxergam o que alguma luz alcança, ou o que a visão no escuro deles permite.'),
        toggle('fg-dyn', f.dynamic, v => fogSet({ dynamic: v }, 'Visão por paredes'), 'Visão por paredes'),
        f.dynamic ? toggle('fg-expl', f.explored, v => fogSet({ explored: v }), 'Manter visível o que já foi explorado') : null,
        f.dynamic ? toggle('fg-shared', f.shared, v => fogSet({ shared: v }), 'Jogadores enxergam em grupo') : null,
        toggle('fg-man', f.manual, v => fogSet({ manual: v }, 'Névoa manual'), 'Névoa manual (pintada por você)'),
        toggle('sc-block', sc.blockMove, v => S({ blockMove: v }), 'Paredes barram o movimento dos jogadores'),
        f.manual ? h('div', { class: 'row' }, btn('Revelar tudo', () => fogAll('r'), { icon: 'eye' }), btn('Esconder tudo', () => fogAll('h'), { icon: 'eyeOff' })) : null,
        f.dynamic && f.explored ? btn('Esquecer áreas exploradas', () => confirmBox('Esquecer o que foi explorado?', 'Os jogadores voltam a ver só o que enxergam agora. Isso não pode ser desfeito.', 'Esquecer', true).then(ok => { if (ok) { Vision.resetExplored(sc); Render.request(); toast('Áreas exploradas esquecidas.'); } }), { icon: 'reset' }) : null,
        note('Para conferir o resultado, troque "Vendo como" no topo para um jogador.')),
      sec('c-perm', 'O que os jogadores podem', true,
        PERMS.map(([k, label]) => toggle('pm-' + k, !!sc.perms[k], v => S({ perms: Object.assign({}, sc.perms, { [k]: v }) }, 'Permissões'), label)),
        note('Paredes, luzes, névoa, cenas e tokens do mestre ficam sempre com o mestre.')),
    ];
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
  function tabPlayers() {
    const sc = Store.scene();
    const save = () => { Persist.meta(); Store.meta(); Render.request(); };
    return [
      h('p', { class: 'muted', text: 'Enquanto não há login, os jogadores são cadastrados aqui. Dê um token a cada um e use "Ver como" para conferir o que ele enxerga.' }),
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
            for (const id of Store.S.order) { const s = Store.S.scenes[id]; let ch = false; for (const t of s.tokens) if (t.owner === p.id) { t.owner = null; ch = true; } if (ch) Persist.scene(id); }
            Vision.invalidate(); save();
          }), { size: 16 }));
      })) : h('p', { class: 'muted', text: 'Nenhum jogador cadastrado.' }),
      h('div', { class: 'row' }, btn('Adicionar jogador', addPlayer, { icon: 'plus', kind: 'primary' })),
    ];
  }

  /* ================= Menu do botão direito ================= */
  function contextMenu(p, cx, cy) {
    const gm = isGM(), sc = Store.scene();
    const hit = Tools.hitTest(p, { locked: true });
    if (hit && !selHas(hit.c, hit.id)) setSel([hit]);
    const items = [];
    if (hit && hit.c === 'tokens') {
      const toks = selOf('tokens'), o = Store.get('tokens', hit.id), ids = toks.map(t => t.id);
      const condToks = toks.filter(t => gm || can('conds', t));
      items.push({ head: toks.length > 1 ? `${toks.length} tokens` : tokName(o) });
      items.push({ label: 'Ver no painel', icon: 'sliders', run: () => openTab('sel') });
      if (condToks.length) items.push({ label: 'Condições…', icon: 'shield', run: () => condPicker(condToks) });
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
      if (gm) items.push({ label: e.gm ? 'Mostrar aos jogadores' : 'Deixar só para o mestre', icon: e.gm ? 'eye' : 'eyeOff', run: () => Store.tx('Visibilidade do efeito', () => Store.upd('effects', e.id, { gm: !e.gm })) });
      items.push({ label: 'Duplicar', icon: 'copy', key: 'Ctrl+D', run: Act.duplicateSel }, '-', { label: 'Apagar', icon: 'trash', key: 'Del', danger: true, run: deleteSelToast });
    } else if (hit && hit.c === 'lights') {
      const l = Store.get('lights', hit.id);
      items.push({ head: l.name || 'Luz' }, { label: l.on ? 'Apagar a luz' : 'Acender a luz', icon: 'light', run: () => Store.tx(l.on ? 'Apagar luz' : 'Acender luz', () => Store.upd('lights', l.id, { on: !l.on })) },
        { label: 'Ver no painel', icon: 'sliders', run: () => openTab('sel') }, '-', { label: 'Remover', icon: 'trash', key: 'Del', danger: true, run: deleteSelToast });
    } else {
      items.push({ head: 'Mapa' });
      if (gm) items.push({ label: 'Novo token aqui', icon: 'token', run: () => {
        const [x, y] = snapTok(sc, p.x - sc.cell / 2, p.y - sc.cell / 2, 1, false);
        const t = newToken(sc, x, y);
        Store.tx('Criar token', () => Store.add('tokens', t));
        setSel([{ c: 'tokens', id: t.id }]); Tools.set('select'); openTab('sel', 'tk-name');
      } });
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
    if (toks.length !== 1 || App.sel.length !== 1 || App.tool !== 'select') { hide(); return; }
    const t = toks[0], gm = isGM(), mode = barsMode(t);
    const edit = gm || can('bars', t), canCond = gm || can('conds', t);
    const bars = t.bars.map((b, i) => ({ b, i })).filter(x => x.b.on && x.b.m > 0);
    const kids = [];
    if (edit) {
      for (const { b, i } of bars) {
        kids.push(h('label', { class: 'hud-b', style: { '--c': b.c }, title: `${b.n}: digite um valor, ou +5 e -8 para somar e subtrair` },
          h('span', { class: 'hud-n', text: b.n }),
          h('input', { id: 'hud-b' + i, class: 'hud-in', type: 'text', inputmode: 'decimal', value: b.v, autocomplete: 'off', 'aria-label': b.n,
            onfocus: e => e.target.select(),
            onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } else if (e.key === 'Escape') { e.target.value = b.v; e.target.blur(); } },
            onchange: e => { if (!Act.barSet(t, i, e.target.value)) e.target.value = b.v; } }),
          h('span', { class: 'hud-m', text: '/' + fmt(b.m) })));
      }
    } else if (mode === 'num') {
      for (const { b } of bars) kids.push(h('span', { class: 'hud-b', style: { '--c': b.c } }, h('span', { class: 'hud-n', text: b.n }), h('span', { class: 'hud-v', text: `${fmt(b.v)}/${fmt(b.m)}` })));
    }
    if (canCond) kids.push(iconBtn('shield', 'Condições', () => condPicker([t]), { size: 16, cls: 'hud-i' }));
    if (gm) kids.push(iconBtn(t.hidden ? 'eyeOff' : 'eye', t.hidden ? 'Oculto dos jogadores (clique para mostrar)' : 'Visível aos jogadores (clique para ocultar)', () => Store.tx(t.hidden ? 'Mostrar token' : 'Ocultar token', () => Store.upd('tokens', t.id, { hidden: !t.hidden })), { size: 16, cls: 'hud-i', on: t.hidden }));
    if (!kids.length) { hide(); return; }
    const a = document.activeElement, fid = a && a.id && el.hud.contains(a) ? a.id : null;
    el.hud.replaceChildren(h('span', { class: 'hud-who' }, tokenAvatar(t, 24), h('span', { class: 'hud-name', text: tokName(t) })), ...kids);
    el.hud.hidden = false;
    if (fid) { const n = document.getElementById(fid); if (n) n.focus({ preventScroll: true }); }
  }

  /* ================= Rodapé do mapa ================= */
  function status() {
    const sc = Store.scene();
    if (!sc) return;
    const m = App.mouse;
    let txt = '';
    if (m.inside && m.x >= 0 && m.y >= 0 && m.x < sceneW(sc) && m.y < sceneH(sc)) txt = `Coluna ${Math.floor(m.x / sc.cell) + 1} · Linha ${Math.floor(m.y / sc.cell) + 1}`;
    const sv = saveState === 'mem' ? 'Sem salvamento neste navegador' : saveState === 'erro' ? 'Não foi possível salvar' : saveState === 'saving' ? 'Salvando…' : 'Salvo neste navegador';
    const full = (txt ? txt + '  ·  ' : '') + sv;
    if (full !== statusText) { statusText = full; el.status.textContent = full; el.status.classList.toggle('warn', saveState === 'mem' || saveState === 'erro'); }
    if (zoomLabel) { const zt = Math.round(App.view.z * 100) + '%'; if (zoomLabel.textContent !== zt) zoomLabel.textContent = zt; }
  }

  /* ================= Atualização geral ================= */
  function renderAll() {
    const sc = Store.scene();
    if (!sc) return;
    pruneSel();
    if (Vision.isDirty()) Vision.update(sc, App.viewer);   // a faixa do jogador depende do que ele enxerga
    renderTop(); renderBanner(); renderRail(); renderOpts(); renderSide(); renderHud(); status();
    document.title = 'Cenas de Urgm';
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
    prompt: promptBox, confirm: confirmBox, importImages, initCaps, setViewer, switchScene,
    modalOpen: () => !!modalEl,
    frame() { if (zoomLabel) { const zt = Math.round(App.view.z * 100) + '%'; if (zoomLabel.textContent !== zt) zoomLabel.textContent = zt; } },
    setSave(s) { saveState = s; status(); },
  };
})();
