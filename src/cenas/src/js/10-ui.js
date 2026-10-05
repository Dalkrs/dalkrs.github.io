/* ---------------------------------------------------------------
   10. UI — barra do topo, trilho de ferramentas, painel, menus e janelas
   A interface é redesenhada por inteiro a cada alteração confirmada
   (Store 'commit'); os campos têm id fixo para o foco voltar ao lugar.
   --------------------------------------------------------------- */
const UI = (() => {
  const el = {
    top: $('#top'), banner: $('#banner'), rail: $('#rail'), opts: $('#opts'), hud: $('#hud'), hint: $('#hint'), hintBox: $('#hintBox'),
    status: $('#status'), side: $('#side'), layer: $('#layer'), toasts: $('#toasts'), stage: $('#stage'),
    fileImg: $('#fileImg'), fileJson: $('#fileJson'), drop: $('#drop'), toastsTop: $('#toastsTop'), turnb: $('#turnb'), veil: $('#veilchip'),
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
    const t = h('div', { class: 'toast' }, h('span', { text }),
      o && o.action ? h('button', { type: 'button', class: 'toast-a', text: o.action, onclick: () => { t.remove(); o.run(); } }) : null);
    const host = modalEl ? el.toastsTop : el.toasts;       // com uma janela aberta, o aviso sobe para a frente dela
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

  function closeModal() {
    if (!modalEl) return;
    modalEl.remove(); modalEl = null; modalCfg = null; modalLive = null;
    while (el.toastsTop.firstChild) el.toasts.append(el.toastsTop.firstChild);     // os avisos descem para o lugar de sempre
  }
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
    const f = card.querySelector('[data-focus]') || (o.focusPrimary ? null : card.querySelector('input:not([type=hidden]), textarea, select')) || card.querySelector('.btn.primary') || card.querySelector('button');
    if (f) { f.focus(); if (f.select && f.type !== 'range' && f.type !== 'checkbox' && f.type !== 'color') f.select(); }
    return card;
  }
  document.addEventListener('keydown', e => {
    if (menuEl && e.key === 'Escape') { closeMenus(); e.stopPropagation(); return; }
    if (!modalEl) return;
    if (e.key === 'Escape') { const c = modalCfg; closeModal(); if (c && c.onCancel) c.onCancel(); e.stopPropagation(); }
    else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
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
    confirmBox('Apagar esta cena?', `"${sc.name}" e tudo o que está nela serão apagados. Isso não pode ser desfeito.` + (Nuvem.noAr() === sc.id ? ' Os jogadores estão vendo esta cena: ela sai do ar.' : ''), 'Apagar cena', true).then(ok => {
      if (!ok) return;
      const id = sc.id;
      Store.removeScene(id); Persist.removeScene(id);
      if (!Store.S.order.length) { const n = newScene('Nova cena'); Store.addScene(n); Persist.scene(n.id); }
      switchScene(Store.S.order[0]);
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
    hideTurn();
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
      const txt = aqui ? 'No ar' : ar ? 'No ar: ' + outra : 'Fora do ar';
      air = h('button', { type: 'button', class: 'air-b' + (aqui ? ' on' : ar ? ' other' : ''), id: 'airBtn', title: aqui ? 'Os jogadores estão vendo esta cena' : ar ? `Os jogadores estão vendo "${outra}", não esta cena` : 'Os jogadores não estão vendo nenhuma cena', onclick: () => anchorMenu(air, airMenu()) },
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
    const items = [{ head: 'Cenas' }], ar = Nuvem.noAr();
    for (const id of Store.S.order) { const s = Store.S.scenes[id]; items.push({ label: s.name, check: id === Store.S.current, key: id === ar ? 'no ar' : null, run: () => switchScene(id) }); }
    items.push('-', { label: 'Nova cena', icon: 'plus', run: newSceneFlow }, { label: 'Nova cena de exemplo', icon: 'map', run: sampleScene }, { label: 'Duplicar esta cena', icon: 'copy', run: duplicateScene },
      { label: 'Renomear', icon: 'edit', run: renameScene }, { label: 'Apagar esta cena…', icon: 'trash', danger: true, run: deleteScene });
    return items;
  }

  /* ---- No ar: a cena que os jogadores da mesa veem. Só muda quando o mestre manda, e dá para desfazer. ---- */
  function showToPlayers(id) {
    const antes = Nuvem.noAr(), sc = Store.S.scenes[id];
    if (!sc || !Nuvem.mostrar(id)) return;
    toast(`Os jogadores agora veem "${sc.name}".`, { action: 'Desfazer', run: () => { if (antes && Store.S.scenes[antes]) Nuvem.mostrar(antes); else Nuvem.esconder(); } });
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
    return [
      { head: ar === cur ? 'Os jogadores veem esta cena' : outra ? `Os jogadores veem "${outra.name}"` : 'Os jogadores não veem nenhuma cena' },
      ar === cur ? null : { label: 'Mostrar esta cena aos jogadores', icon: 'eye', run: () => showToPlayers(cur) },
      outra ? { label: 'Ir para a cena que está no ar', icon: 'map', run: () => switchScene(ar) } : null,
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
      ['T', 'Novo token'], ['B · L · R · O · P · X', 'Desenho livre, linha, retângulo, elipse, polígono, texto'], ['W · D', 'Parede · porta'],
      ['I', 'Luz'], ['N', 'Névoa manual'], ['E', 'Efeito de magia'], ['M', 'Régua'], ['G', 'Ping no ponto onde o cursor está'],
      ['A', 'Mirar no token sob o cursor (ou nos selecionados); de novo, tira a mira'],
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
    if (Nuvem.jogador()) {
      // O jogador de verdade, na mesa: a faixa só aparece quando há algo a dizer.
      const aviso = Nuvem.semCena() ? 'O mestre ainda não está mostrando nenhuma cena. Ela aparece aqui sozinha quando ele mostrar.'
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
  ];
  const WALL_NAMES = { wall: 'Parede', door: 'Porta', secret: 'Porta secreta', window: 'Janela', veil: 'Cortina' };
  const WALL_NOTES = {
    wall: 'Barra a visão, a luz e a passagem dos jogadores.',
    door: 'Fechada, barra visão, luz e passagem. Clique no ícone dela no mapa para abrir e fechar.',
    secret: 'Para os jogadores é uma parede comum: sem ícone e sem como abrir. Quando acharem a porta, revele, e ela vira uma porta normal.',
    window: 'Deixa ver e deixa a luz passar. Fechada, barra a passagem; aberta, deixa atravessar. Clique no ícone dela no mapa para abrir e fechar.',
    veil: 'Fechada, barra a visão e a luz, menos para quem está encostado nela; atravessar, pode sempre. Aberta, não barra nada. Clique no ícone dela no mapa para abrir e fechar.',
  };
  const wallKindOf = w => (w.k === 'door' && w.secret ? 'secret' : w.k);

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
      const isDoor = k => k === 'door' || k === 'secret';
      kids.push(seg('o-wk', o.wallKind, WALL_SEG, v => { if (isDoor(v)) o.wallMode = 'line'; optSet('wallKind', v, true); }));
      kids.push(seg('o-wm', o.wallMode, [['line', 'Trecho', null, 'Um trecho de cada vez, de canto a canto'], ['room', 'Sala', null, 'Arraste um retângulo: as quatro paredes de uma vez']],
        v => { if (v === 'room' && isDoor(o.wallKind)) o.wallKind = 'wall'; Tools.cancel(); optSet('wallMode', v, true); }));
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
      gm && Nuvem.mestre() && Nuvem.locais() > 0 && onlyBlank() ? h('div', { class: 'callout', id: 'localHint' },
        h('strong', { text: 'As suas cenas de antes continuam guardadas neste navegador.' }),
        h('span', { text: ' Esta mesa ainda não tem nenhuma. Você escolhe quais trazer; as do navegador não mudam.' }),
        h('div', { class: 'row' }, btn('Trazer cenas deste navegador…', bringLocal, { icon: 'upload', kind: 'primary small', id: 'localBring' }))) : null,
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
  const condGrid = (toks, after) => h('div', { class: 'chips' }, CONDS.map(c => condChip(c, toks.every(t => t.conds.includes(c.id)), () => { Act.condToggle(toks, c.id); if (after) after(); })));

  /* Condições ativas de um token, com contador e duração.
     O contador só muda na mão (+ e −); a duração, em rodadas, desconta sozinha na ordem de turnos. */
  function condStepToast(t, c, d) {
    const r = Act.condStep(t, c.id, d);
    if (r === 'removed') toast(`${c.n} saiu de ${tokName(t)}.`, { action: 'Desfazer', run: Tools.undo });
    return r;
  }
  function condActive(t, edit, after, idp) {
    const info = t.cinfo || {}, pre = idp || 'cd';
    const list = t.conds.map(id => COND_BY_ID[id]).filter(Boolean);
    if (!list.length) return null;
    if (!edit && !list.some(c => info[c.id] && (info[c.id].n || info[c.id].d))) return h('div', { class: 'chips' }, list.map(c => condChip(c, true, null)));
    const done = () => { if (after) after(); };
    return h('div', { class: 'cact' + (edit ? '' : ' ro') },
      h('div', { class: 'cact-h' }, h('span', { text: 'Ativas' }), h('span', { text: 'Contador' }), h('span', { text: 'Rodadas' }), edit ? h('span') : null),
      list.map(c => {
        const ci = info[c.id] || {}, n = ci.n || 0;
        return h('div', { class: 'cact-r' },
          h('span', { class: 'cact-n' }, h('span', { class: 'chip-i', style: { background: c.c } }, icon(c.i, 12)), h('span', { class: 'cact-t', text: c.n })),
          edit ? h('span', { class: 'stp' },
            h('button', { type: 'button', class: 'stp-b', id: `${pre}-${c.id}-minus`, disabled: !n, title: n === 1 ? 'Tirar 1 (em zero, a condição sai)' : 'Tirar 1', 'aria-label': `Tirar 1 de ${c.n}`, onclick: () => { condStepToast(t, c, -1); done(); } }, icon('minus', 13)),
            h('span', { class: 'stp-v', id: `${pre}-${c.id}-n`, text: n ? String(n) : '–' }),
            h('button', { type: 'button', class: 'stp-b', id: `${pre}-${c.id}-plus`, title: 'Somar 1', 'aria-label': `Somar 1 em ${c.n}`, onclick: () => { condStepToast(t, c, 1); done(); } }, icon('plus', 13)))
            : h('span', { class: 'stp-v ro', text: n ? String(n) : '–' }),
          edit ? inCount(`${pre}-${c.id}-d`, ci.d || 0, v => { Act.condSet(t, c.id, { d: v, d0: v }, 'Duração da condição'); done(); },
            { label: `Rodadas de ${c.n}`, title: 'Quantas rodadas dura. Desconta sozinha quando o token termina a vez; em zero, a condição sai. Vazio: sem prazo.' })
            : h('span', { class: 'stp-v ro', text: ci.d ? String(ci.d) : '–' }),
          edit ? iconBtn('x', 'Tirar ' + c.n, () => { Act.condToggle([t], c.id); done(); }, { size: 14, cls: 'cact-x', id: `${pre}-${c.id}-x` }) : null);
      }));
  }
  function condPicker(toks) {
    if (!toks.length) return;
    const ids = toks.map(t => t.id);
    const body = h('div', { class: 'cpick' });
    const paint = () => {
      const live = ids.map(id => Store.get('tokens', id)).filter(Boolean);
      const a = document.activeElement, fid = a && a.id && body.contains(a) ? a.id : null;
      body.replaceChildren();
      addKids(body, [
        live.length === 1 ? condActive(live[0], true, null, 'cdm') : null,
        h('div', { class: 'chips' }, CONDS.map(c => condChip(c, live.length > 0 && live.every(t => t.conds.includes(c.id)), () => Act.condToggle(live, c.id)))),
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
  function barsEditor(t, full) {
    const rows = [];
    t.bars.forEach((b, i) => {
      if (!full && !b.on) return;
      const key = t.id + ':' + i, open = full && !!barOpen[key], m = Math.round(b.m);
      const xAberta = barX(b) > 0 || !!barXOpen[key];
      const setBars = p => Store.upd('tokens', t.id, { bars: t.bars.map((x, j) => (j === i ? Object.assign({}, x, p) : x)) });
      const val = h('input', {
        id: `tk-b${i}-v`, class: 'in bar-v' + (b.v < 0 ? ' neg' : ''), type: 'text', inputmode: 'decimal', value: b.v, autocomplete: 'off',
        'aria-label': b.n + ' atual', title: 'Digite um valor, ou +5 e -8 para somar e subtrair' + (barLo(b) > 0 ? `. Esta barra pode ficar negativa até −${fmt(barLo(b))}.` : ''),
        onchange: e => { if (!Act.barSet(t, i, e.target.value)) e.target.value = b.v; },
      });
      rows.push(h('div', { class: 'bar-row' + (b.on ? '' : ' off') },
        full ? h('input', { type: 'checkbox', id: `tk-b${i}-on`, class: 'ck', checked: b.on, title: 'Usar esta barra', 'aria-label': 'Usar a barra ' + b.n, onchange: e => Act.barPatch(t, i, { on: e.target.checked }) }) : null,
        h('span', { class: 'bar-dot' + (b.k === 'pts' ? ' pt' : ''), style: { background: b.c } }),
        full ? inText(`tk-b${i}-n`, b.n, v => Act.barPatch(t, i, { n: v.trim().slice(0, 24) || b.n }), { class: 'in bar-n', 'aria-label': 'Nome da barra', maxlength: 24 }) : h('span', { class: 'bar-n ro', text: b.n }),
        val, h('span', { class: 'bar-sl', text: '/' }),
        full ? inNum(`tk-b${i}-m`, b.m, v => Act.barPatch(t, i, { m: v }), { min: 0, label: b.n + ' máximo' }) : h('span', { class: 'bar-m', text: fmt(b.m) }),
        b.on ? iconBtn('shield', (xAberta ? 'Sobrevida de ' : 'Dar sobrevida a ') + b.n, () => { barXOpen[key] = !xAberta; renderSide(); if (!xAberta) { const n = document.getElementById(`tk-b${i}-x`); if (n) n.focus(); } }, { size: 16, cls: 'bar-more bar-xb' + (barX(b) > 0 ? ' tem' : ''), on: xAberta, id: `tk-b${i}-xb` }) : null,
        full ? iconBtn('more', 'Opções da barra ' + b.n, () => { barOpen[key] = !barOpen[key]; renderSide(); }, { size: 16, cls: 'bar-more', on: open, id: `tk-b${i}-more` }) : null));
      if (b.k === 'pts' && b.on && m >= 1 && m <= 20) rows.push(h('div', { class: 'bar-pips' + (full ? ' full' : '') }, pips(t, b, i, true, 'tk-b')));
      if (xAberta && b.on) rows.push(h('div', { class: 'bar-x' + (full ? ' full' : '') },
        h('span', { class: 'bar-x-l', text: 'Sobrevida' }),
        // depois de digitado, quem mantém o campo aberto é a própria sobrevida: quando ela acabar, o campo fecha
        inNum(`tk-b${i}-x`, barX(b), v => { delete barXOpen[key]; if (!Act.barExtra(t, i, v)) renderSide(); }, { min: 0, step: 1, label: 'Sobrevida de ' + b.n, title: 'Pontos por cima da barra: o dano gasta a sobrevida antes de chegar em ' + b.n }),
        h('span', { class: 'bar-x-n', text: 'leva o dano antes' })));
      if (open) rows.push(h('div', { class: 'bar-opt' },
        field('Cor', inColor(`tk-b${i}-c`, b.c, v => setBars({ c: v }), 'Cor da barra ' + b.n)),
        field('Estilo', seg(`tk-b${i}-k`, b.k, [['bar', 'Barra'], ['pts', 'Pontos', null, 'Uma bolinha por ponto: bom para recursos pequenos, como cargas e usos']], v => Act.barPatch(t, i, { k: v }))),
        field('Os outros veem', inSelect(`tk-b${i}-vis`, b.vis || '', [['', 'O mesmo que o token'], ['num', 'Números'], ['bar', 'Só a barra'], ['none', 'Nada']], v => Act.barPatch(t, i, { vis: v }), { title: 'O que vê desta barra quem não é dono do token' })),
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
          : h('span', { class: 'meter-f', style: { width: clamp(b.v / b.m * 100, 0, 100) + '%', background: b.c } })),
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
  function areaBox(title, toks, skipId, fx) {
    if (!toks.length) { toast('Não há nenhum token dentro dessa área.'); return; }
    const last = fx && fx.apply ? fx.apply : null;
    const rows = toks.map(t => ({ t, on: last ? !last.skip.includes(t.id) : t.id !== skipId, half: false }));
    const names = [];
    for (const t of toks) for (const b of t.bars) if (b.on && !names.includes(b.n)) names.push(b.n);
    const selBar = h('select', { id: 'ar-bar', class: 'in' }, names.map(n => h('option', { value: n, text: n })));
    const amt = h('input', { id: 'ar-amt', class: 'in bar-v', type: 'text', inputmode: 'decimal', placeholder: '12', autocomplete: 'off', 'data-focus': '', 'aria-label': 'Quanto tirar ou devolver' });
    const selCond = h('select', { id: 'ar-cond', class: 'in' }, [['', 'Nenhuma']].concat(CONDS.map(c => [c.id, c.n])).map(([v, l]) => h('option', { value: v, text: l })));
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
    paint();
    modal({
      title, wide: true,
      body: h('div', { class: 'area' },
        names.length ? h('div', { class: 'area-top' }, field('Barra', selBar, 'stack'), field('Quanto', amt, 'stack')) : note('Nenhum destes tokens tem barra ligada; dá para aplicar só a condição.'),
        names.length ? note('Sem sinal, o número é tirado (dano). Com +, é devolvido (cura). O botão ½ aplica a metade, para quem resistiu.') : null,
        h('div', { class: 'area-bar' }, count, h('span', { class: 'spacer' }), btn('Todos', () => all(true), { kind: 'small' }), btn('Nenhum', () => all(false), { kind: 'small' })),
        list,
        h('div', { class: 'grid3 area-cond' }, field('Condição', selCond, 'stack'), field('Contador +', cn, 'stack'), field('Rodadas', cd, 'stack')),
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
    const lista = Fichas.chars(), ligado = t.char ? Fichas.get(t.char) : null;
    const out = [field('Personagem', inSelect('tk-char', t.char || '', [['', 'Sem ficha']].concat(lista.map(c => [c.id, c.nome || 'Sem nome'])).concat(t.char && !ligado ? [[t.char, '(ficha que saiu da mesa)']] : []),
      v => {
        const r = Fichas.link(t, v || null), c = v ? Fichas.get(v) : null;
        toast(c ? `O token agora segue a ficha de ${c.nome || 'sem nome'}: o nome e as barras vieram dela.` + (r.dono ? ` O dono do token passou a ser ${r.dono}, que é o dono da ficha.` : '') : `${t.name} não segue mais nenhuma ficha.`, { action: 'Desfazer', run: Tools.undo });
      }))];
    if (!t.char) { out.push(note(lista.length ? 'Ligado a uma ficha, o token passa a ter o nome do personagem, as barras dela (HP, SP…) no lugar das que tinha, e a iniciativa.' : 'Esta mesa ainda não tem fichas. Crie na aba Fichas.')); return out; }
    if (!ligado) { out.push(note('A ficha ligada não está mais na mesa. Escolha outra ou "Sem ficha".')); return out; }
    const itens = Fichas.rolaveis(t);
    if (!itens.some(x => x[0] === App.opt.fichaAtr)) App.opt.fichaAtr = itens[0][0];
    const fixa0 = App.opt.fichaFixa == null || App.opt.fichaTok !== t.id ? Fichas.fixaPadrao(t) : App.opt.fichaFixa;
    App.opt.fichaTok = t.id; App.opt.fichaFixa = fixa0;
    // um token ligado antes (ou que ganhou uma barra à mão) pode ter barras que não são da ficha: um clique acerta
    if (Fichas.foraDaFicha(t)) out.push(
      note('Este token tem barras que não vêm da ficha (ou falta alguma dela).'),
      h('div', { class: 'row' }, btn('Usar só as barras da ficha', () => { if (Fichas.usarBarras(t)) toast('O token ficou só com as barras da ficha.', { action: 'Desfazer', run: Tools.undo }); }, { id: 'tk-so-ficha' })));
    out.push(
      note('As barras ligadas à ficha (HP, SP…) e a iniciativa vêm dela. Dano e cura dados aqui no mapa voltam para a ficha. Dois cliques no token abrem a ficha.'),
      field('Rolar atributo', inSelect('tk-atr', App.opt.fichaAtr, itens.map(x => [x[0], `${x[1]} · ${x[2]}`]), v => { App.opt.fichaAtr = v; })),
      field('Fixando', inNum('tk-fixa', fixa0, v => { App.opt.fichaFixa = Math.max(0, Math.round(v) || 0); }, { min: 0, step: 1, label: 'Quanto fixar', title: 'Regra da fixa: rola um dado de (atributo − fixa) lados e soma a fixa' })),
      h('div', { class: 'row' }, btn('Rolar', () => {
        const r = Fichas.rolar(t, App.opt.fichaAtr, App.opt.fichaFixa);
        toast(r.ok ? `${t.name} · ${r.nome}: ${r.total}` + (r.die ? ` (${r.dieValue} no d${r.die}${r.fixa ? ' + ' + r.fixa : ''})` : ' (fixa total)') : r.error);
      }, { icon: 'die', id: 'tk-rolar' })));
    out.push(...bagResumo(t));
    return out;
  }

  /* A bolsa do personagem deste token: as poções, bombas, runas, munições e materiais da ficha dele.
     A poção que faz alguma coisa mostra antes o que vai acontecer ("Usar agora"); os outros itens só gastam uma
     unidade. Tudo avisa a mesa ao vivo e dá para desfazer. */
  function bagBox(t) {
    const tid = t.id, R = window.TC.rules;
    let pede = null;
    const body = h('div', { class: 'bag' });
    const doUse = (tk, it) => {
      pede = null;
      const r = Fichas.usar(tk, it.id);
      if (!r.ok) { toast(r.error); paint(); return; }
      toast(r.texto + '.', { action: 'Desfazer', run: () => { if (r.desfazer()) toast(`Desfeito: ${it.nome || 'o item'} voltou para a bolsa.`); if (modalEl && modalLive) modalLive(); } });
      paint();
    };
    const use = (tk, it) => {
      if (!Fichas.previaUso(tk, it.id).length) { doUse(tk, it); return; }      // nada é aplicado sozinho: um clique gasta e avisa
      pede = it.id; paint();
      const n = document.getElementById('bag-ok-' + it.id); if (n) n.focus();
    };
    function paint() {
      const tk = Store.get('tokens', tid), itens = tk ? Fichas.bolsa(tk) : null;
      const a = document.activeElement, fid = a && a.id && body.contains(a) ? a.id : null;
      body.replaceChildren();
      if (!itens) { addKids(body, [note('Este token não dá mais acesso a uma bolsa.')]); return; }
      if (!itens.length) { addKids(body, [note('A bolsa está vazia. Os itens são cadastrados na ficha do personagem, em Bolsas.')]); return; }
      addKids(body, R.BOLSAS.map(b => {
        const lista = itens.filter(x => x.t === b.t);
        if (!lista.length) return null;
        return h('div', { class: 'bag-g' }, h('div', { class: 'bag-h', text: b.nome }), lista.map(it => {
          const previa = pede === it.id && it.qtd > 0 ? Fichas.previaUso(tk, it.id) : null, resta = it.qtd - 1;
          return h('div', { class: 'bag-r' + (it.qtd ? '' : ' sem') },
            h('div', { class: 'bag-l' },
              h('span', { class: 'bag-n', text: it.nome || b.um }), h('span', { class: 'bag-q', title: 'Quantas há na bolsa', text: '×' + it.qtd }),
              btn('Usar', () => use(tk, it), { kind: 'small', id: 'bag-u-' + it.id, disabled: it.qtd < 1, title: it.qtd < 1 ? 'Não há nenhuma na bolsa' : it.t === 'pocao' ? 'Gasta uma e aplica o efeito (mostra antes o que vai acontecer)' : 'Gasta uma e avisa a mesa. Nada é aplicado sozinho.' })),
            it.nota ? h('div', { class: 'bag-d', text: it.nota }) : null,
            previa ? h('div', { class: 'bag-c' },
              h('span', { class: 'bag-ct' }, h('strong', { text: `Usar ${it.nome || 'a poção'}? ` }), previa.join(' · ') + ' · ' + (resta === 0 ? 'é a última' : resta === 1 ? 'sobra 1' : 'sobram ' + resta)),
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
    const fs = Fichas.feridas(t);
    if (!fs.length) return null;
    const R = window.TC.rules;
    return [h('ul', { class: 'ferl', id: 'tk-feridas' }, ...fs.map(f => h('li', { class: 'ferl-i g' + f.g }, h('span', { class: 'ferl-d', 'aria-hidden': 'true' }), h('span', { text: R.textoDoFerimento(f) + (f.n ? ' — ' + f.n : '') })))),
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
        sec('s-cond', 'Condições', true, condActive(t, canC), canC ? condGrid([t]) : t.conds.length ? null : note('Nenhuma condição.')),
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
        h('div', { class: 'row' }, btn('Cura total', () => healToast([t]), { icon: 'heart', id: 'tk-heal', title: 'Enche todas as barras em uso deste token (Vida, SP…). Dá para desfazer.' })),
        field('Quem não é dono vê', seg('tk-barvis', t.barVis, [['num', 'Números'], ['bar', 'Só a barra'], ['none', 'Nada']], v => U({ barVis: v })), 'stack')),
      sec('s-cond', 'Condições', true, condActive(t, true), condGrid([t])),
      sec('s-turn', 'Turnos', true,
        field('Iniciativa', inNum('tk-ini', clampIni(t.ini), v => U({ ini: clampIni(v) }, 'Iniciativa do token'), { min: -99, max: 99, step: 1, label: 'Bônus de iniciativa', title: 'Bônus de iniciativa: a rolagem é 1d20 + este valor' })),
        field('Turnos por rodada', stepper('tk-turns', clampTurns(t.turns), 1, MAX_TURNS, v => Act.tokenTurns(t, v), 'Turnos por rodada')),
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
          btn('Duplicar', Act.duplicateSel, { icon: 'copy' }),
          btn('Apagar', deleteSelToast, { icon: 'trash', kind: 'danger' }))),
    ];
  }
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

  function multiTokenPanel(toks) {
    const gm = isGM();
    const editable = toks.filter(t => gm || can('bars', t));
    const names = [];
    for (const t of editable) for (const b of t.bars) if (b.on && !names.includes(b.n)) names.push(b.n);
    const sel = h('select', { id: 'mt-bar', class: 'in', 'aria-label': 'Barra' }, names.map(n => h('option', { value: n, text: n })));
    const amt = h('input', { id: 'mt-amt', class: 'in bar-v', type: 'text', inputmode: 'decimal', placeholder: '-5', autocomplete: 'off', 'aria-label': 'Quanto somar ou subtrair' });
    const apply = () => {
      if (!/^\s*[+-]?\s*\d/.test(amt.value)) { toast('Digite um número, como -5 ou +10.'); return; }
      const n = Act.areaApply(editable.map(t => ({ t, half: false })), sel.value, amt.value, null);
      if (n < 0) { toast('Digite um número, como -5 ou +10.'); return; }
      amt.value = '';
    };
    amt.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
    const condToks = toks.filter(t => gm || can('conds', t));
    return [
      h('div', { class: 'p-head' }, h('div', { class: 'stack-av' }, toks.slice(0, 5).map(t => tokenAvatar(t, 34))),
        h('div', { class: 'p-head-t' }, h('h3', { class: 'p-title', text: `${toks.length} tokens` }), h('div', { class: 'p-sub', text: 'O que você mudar aqui vale para todos.' }))),
      editable.length && names.length ? sec('s-mbar', 'Somar ou subtrair de todos', true,
        h('div', { class: 'row' }, sel, amt, btn('Aplicar', apply, { kind: 'primary' })),
        note('Sem sinal, o número é subtraído: útil para dano em área. Só muda quem tem a barra escolhida.'),
        gm ? h('div', { class: 'row' },
          btn('Com metade e condição…', () => areaBox(`Aplicar a ${toks.length} tokens`, toks, null), { icon: 'area', kind: 'small', id: 'mt-area', title: 'Escolhe quem leva tudo, quem leva metade e quem fica de fora, com condição opcional' }),
          btn('Cura total', () => healToast(editable), { icon: 'heart', kind: 'small', id: 'mt-heal', title: 'Enche todas as barras em uso dos tokens selecionados. Dá para desfazer.' })) : null) : null,
      condToks.length ? sec('s-cond', 'Condições', true, condGrid(condToks)) : null,
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
  function fxPanel(e) {
    const sc = Store.scene(), gm = isGM();
    const U = (p, label) => Store.tx(label || 'Editar efeito', () => Store.upd('effects', e.id, p));
    const pr = FX.P[e.fx] || FX.P.fogo;
    const tok = e.token ? Store.get('tokens', e.token) : null;
    return [
      h('div', { class: 'p-head' }, h('canvas', { class: 'fx-thumb big', width: 88, height: 88, data: { fx: e.fx } }),
        h('div', { class: 'p-head-t' }, h('h3', { class: 'p-title', text: pr.n }), h('div', { class: 'p-sub', text: tok ? 'Preso a ' + tok.name : 'Solto no mapa' }))),
      // aplicar e reaplicar ficam logo no alto do painel: são o que se usa a cada rodada
      gm ? h('div', { class: 'row' },
        e.apply ? btn('Reaplicar ' + applyLabel(e.apply), () => fxReapply(e), { icon: 'reset', kind: 'primary re', id: 'fx-reapply', title: reapplyTitle }) : null,
        btn('Aplicar a quem está dentro…', () => fxApply(e), { icon: 'area', id: 'fx-apply', title: 'Dano, cura ou condição em todos os tokens dentro deste efeito' })) : null,
      sec('s-fx', 'Efeito', true,
        field('Tipo', inSelect('fx-id', e.fx, FX.ORDER.map(id => [id, FX.P[id].n]), v => U({ fx: v }, 'Trocar efeito'))),
        // (um efeito que chegue sem as medidas do retângulo ganha, ao virar um, a caixa do que ele já era)
        field('Forma', seg('fx-k', e.k, FX_SHAPES, v => U(v === 'rect' && !(e.rw > 0 && e.rh > 0) ? { k: v, rw: e.rw > 0 ? e.rw : Math.max(0.5, 2 * e.r || 1), rh: e.rh > 0 ? e.rh : Math.max(0.5, 2 * e.r || 1) } : { k: v }, 'Forma do efeito')), 'stack tight'),
        h('div', { class: 'grid2' },
          e.k === 'rect' ? field('Largura (q)', inNum('fx-rw', e.rw, v => U({ rw: v }), { min: 0.5, max: 60, step: 0.5 }))
            : field(e.k === 'line' ? 'Comprimento (q)' : e.k === 'cone' ? 'Alcance (q)' : 'Raio (q)', inNum('fx-r', e.r, v => U({ r: v }), { min: 0.5, max: 60, step: 0.5 })),
          e.k === 'rect' ? field('Altura (q)', inNum('fx-rh', e.rh, v => U({ rh: v }), { min: 0.5, max: 60, step: 0.5 })) : null,
          e.k === 'cone' ? field('Abertura (°)', inNum('fx-a', e.ang, v => U({ ang: v }), { min: 10, max: 340, step: 5 })) : null,
          e.k === 'line' ? field('Largura (q)', inNum('fx-w', e.w, v => U({ w: v }), { min: 0.5, max: 20, step: 0.5 })) : null,
          e.k !== 'circ' ? field(e.k === 'rect' ? 'Rotação (°)' : 'Direção (°)', inNum('fx-d', Math.round(e.dir || 0), v => U({ dir: ((v % 360) + 360) % 360 }), { min: -360, max: 720, step: 15 })) : null),
        field('Intensidade', inRange('fx-p', e.pow, 0.2, 1, 0.05, v => Store.upd('effects', e.id, { pow: v }), 'Intensidade do efeito')),
        note(e.k === 'rect' ? 'No mapa, a bolinha no meio do lado gira o retângulo e muda a largura; o quadradinho do canto muda largura e altura.' : 'Arraste a bolinha na borda do efeito para mudar o tamanho e a direção.')),
      sec('s-fx3', 'Duração', true,
        field('Rodadas', inCount('fx-dur', e.dur || 0, v => U({ dur: v, dur0: v, at: v && sc.turn.on ? sc.turn.cur : null }, 'Duração do efeito'), { label: 'Rodadas que o efeito ainda dura' })),
        note(e.dur > 0 ? 'Perde uma rodada cada vez que a vez voltar para quem estava jogando quando a duração foi marcada. Em zero, o efeito some sozinho.' : 'Vazio: o efeito fica na cena até alguém remover. Com um número, ele desconta sozinho na ordem de turnos.')),
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
      if (!gm && t && t.hidden) return;
      const cur = tn.on && e.id === tn.cur;
      const name = t ? tokName(t) : e.name, label = turnLabel(e, name), k = e.k || 1;
      const rolled = gm && e.roll && e.init != null ? rollText(e.roll.d, e.roll.b) : '';      // o detalhe da rolagem é só do mestre
      rows.push(h('li', { class: 'turn' + (cur ? ' cur' : '') },
        h('button', { type: 'button', class: 'turn-m', title: t ? 'Mostrar no mapa' : label, disabled: !t, onclick: () => { if (!t) return; if (tokShown(t, sc)) setSel([{ c: 'tokens', id: t.id }]); const [cx, cy] = tokC(t, sc); if (tokShown(t, sc)) Render.centerOn(cx, cy); } },
          t ? tokenAvatar(t, 28) : h('span', { class: 'av', style: { width: '28px', height: '28px', backgroundColor: 'var(--hover)', color: 'var(--fg-2)', fontSize: '11px', borderColor: 'var(--line-strong)' } }, initials(name)),
          // nome, número do turno, detalhe da rolagem e a marca "vez": quebram de linha entre si quando não cabem
          // (na tela, a marca "vez" vem logo depois do nome; no texto, fica no fim, para o rótulo sair inteiro)
          h('span', { class: 'turn-t' }, h('span', { class: 'turn-n', text: name }),
            k > 1 ? h('span', { class: 'turn-k', text: ` · ${k}º turno` }) : null,
            rolled ? h('span', { class: 'turn-r', text: `(${rolled})`, title: `Rolagem: ${e.init} = ${rolled}` }) : null,
            cur ? h('span', { class: 'turn-now', text: 'vez' }) : null)),
        gm ? inNum(`tn-${e.id}`, e.init == null ? '' : e.init, v => Act.turnPatch(x => { const y = x.list.find(z => z.id === e.id); if (y) { y.init = v; y.roll = null; } }, 'Iniciativa'),
          { step: 1, label: 'Iniciativa de ' + label, title: rolled ? `Iniciativa de ${label}: ${e.init} (${rolled})` : 'Iniciativa de ' + label })
          : h('span', { class: 'turn-i', text: e.init == null ? '–' : fmt(e.init) }),
        gm ? iconBtn('die', `Rolar a iniciativa de ${label} (1d20 ${rollText('', turnBonus(e)).trim()})`, () => rollToast(Act.turnRoll([e.id])), { size: 15, cls: 'turn-d', id: `tr-${e.id}` }) : null,
        gm ? h('span', { class: 'turn-a' },
          iconBtn('up', 'Subir', () => Act.turnPatch(x => { if (i > 0) { const [m] = x.list.splice(i, 1); x.list.splice(i - 1, 0, m); } }), { size: 14, disabled: i === 0 }),
          iconBtn('down', 'Descer', () => Act.turnPatch(x => { if (i < x.list.length - 1) { const [m] = x.list.splice(i, 1); x.list.splice(i + 1, 0, m); } }), { size: 14, disabled: i === tn.list.length - 1 }),
          iconBtn('x', 'Tirar da ordem', () => remove(e), { size: 14 })) : null));
    });
    const selToks = selOf('tokens');
    const step = d => {
      const ended = Act.turnStep(d);
      if (ended.length) toast('Acabou: ' + ended.join('; ') + '.', { action: 'Desfazer', run: Tools.undo });
    };
    const missing = tn.list.filter(e => e.init == null).length;
    return [
      h('div', { class: 'turn-head' },
        h('div', null, h('div', { class: 'p-sub', text: tn.on ? 'Combate em andamento' : 'Combate parado' }), h('div', { class: 'round', text: 'Rodada ' + tn.round })),
        gm ? h('div', { class: 'row tight' },
          iconBtn('prev', 'Turno anterior (o que já foi descontado não volta; para isso, use Desfazer)', () => step(-1), { disabled: !tn.list.length, id: 'turnPrev' }),
          btn('Próximo turno', () => step(1), { kind: 'primary', icon: 'next', disabled: !tn.list.length, id: 'turnNext' })) : null),
      rows.length ? h('ol', { class: 'turns' }, rows) : h('p', { class: 'muted', text: gm ? 'Ninguém na ordem ainda. Selecione tokens no mapa e adicione-os aqui.' : 'O mestre ainda não montou a ordem de turnos.' }),
      gm ? h('div', { class: 'row' },
        btn(selToks.length ? `Adicionar ${selToks.length} selecionado${selToks.length > 1 ? 's' : ''}` : 'Adicionar selecionados', () => { Act.turnAdd(selToks); }, { icon: 'plus', disabled: !selToks.length }),
        btn('Entrada avulsa', looseBox, { id: 'turnLoose', title: 'Põe na ordem algo que não tem token no mapa: armadilha, reforço, evento' })) : null,
      gm && tn.list.length ? h('div', { class: 'row' },
        btn('Rolar iniciativa', rollAll, { icon: 'die', id: 'turnRoll', title: missing ? 'Rola 1d20 + Iniciativa para quem ainda não tem iniciativa e ordena a lista' : 'Todos já têm iniciativa: rolar de novo troca os valores (a mesa pergunta antes)' }),
        btn(tn.on ? 'Encerrar' : 'Iniciar', () => Act.turnPatch(x => { x.on = !x.on; if (x.on) { x.round = 1; x.cur = x.list[0].id; x.back = 0; } }, tn.on ? 'Encerrar combate' : 'Iniciar combate'), { icon: tn.on ? 'stop' : 'play' }),
        btn('Ordenar por iniciativa', () => Act.turnPatch(x => { turnSort(x.list); }, 'Ordenar turnos'), { icon: 'sort' }),
        btn('Limpar', () => Act.turnPatch(x => { x.list = []; x.on = false; x.round = 1; x.back = 0; }, 'Limpar turnos'), { icon: 'trash' })) : null,
      gm && tn.list.length ? note('Passar a vez desconta as durações de condições e efeitos e limpa as miras. Contadores só mudam na mão.') : null,
    ];
  }

  /* ---- Aba Efeitos ---- */
  function tabFx() {
    const sc = Store.scene(), gm = isGM();
    const list = sc.effects.filter(e => fxVisible(e));
    return [
      h('p', { class: 'muted', text: 'Escolha um efeito e clique no mapa. Ele fica na cena até alguém remover, ou pelo número de rodadas que você marcar.' }),
      h('div', { class: 'fx-grid' }, FX.ORDER.map(id => h('button', { type: 'button', class: 'fx-card' + (App.tool === 'fx' && App.opt.fx === id ? ' on' : ''), id: 'fxc-' + id, title: 'Soltar ' + FX.P[id].n, onclick: () => { App.opt.fx = id; Tools.set('fx'); } },
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
          btn('Curar os tokens dos jogadores', () => healToast(sc.tokens.filter(t => t.owner), 'dos jogadores'), { icon: 'heart', id: 'pl-heal-pcs', title: 'Todos os tokens desta cena que têm um jogador como dono' }),
          btn('Curar todos da cena', () => healToast(sc.tokens.slice(), 'da cena'), { id: 'pl-heal-all', title: 'Todos os tokens desta cena, inclusive os do mestre' }))),
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
          btn('Curar os tokens dos jogadores', () => healToast(sc.tokens.filter(t => t.owner), 'dos jogadores'), { icon: 'heart', id: 'pl-heal-pcs', title: 'Todos os tokens desta cena que têm um jogador como dono' }),
          btn('Curar todos da cena', () => healToast(sc.tokens.slice(), 'da cena'), { id: 'pl-heal-all', title: 'Todos os tokens desta cena, inclusive os do mestre' }))),
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
      if (toks.length === 1 && Fichas.podeBolsa(o) && (Fichas.bolsa(o) || []).length) items.push({ label: 'Bolsa…', icon: 'bag', run: () => bagBox(o) });
      if (gm) items.push({ label: 'Cura total', icon: 'heart', run: () => healToast(toks) });
      if (can('target')) items.push({ label: isTargeted(toks) ? 'Tirar a mira' : 'Mirar', icon: 'center', key: 'A', run: () => Act.targetToggle(toks) });
      if (gm && toks.length > 1) items.push({ label: 'Dano, cura ou condição…', icon: 'area', run: () => areaBox(`Aplicar a ${toks.length} tokens`, toks, null) });
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
    const t = toks[0], gm = isGM();
    const edit = gm || can('bars', t), canCond = gm || can('conds', t);
    const kids = [];
    for (const { b, i, mode } of barsShown(t)) {
      const dots = b.k === 'pts' && Math.round(b.m) >= 1 && Math.round(b.m) <= PIP_MAX;
      if (edit && dots) {
        kids.push(h('span', { class: 'hud-b', style: { '--c': b.c } }, h('span', { class: 'hud-n', text: b.n }), pips(t, b, i, true, 'hud-b'), h('span', { class: 'hud-m' + (b.v < 0 ? ' neg' : ''), text: `${fmtV(b.v)}/${fmt(b.m)}` })));
      } else if (edit) {
        kids.push(h('label', { class: 'hud-b', style: { '--c': b.c }, title: `${b.n}: digite um valor, ou +5 e -8 para somar e subtrair` },
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
    const conds = t.conds.map(id => COND_BY_ID[id]).filter(Boolean).sort((p, q) => ((info[q.id] && info[q.id].n) ? 1 : 0) - ((info[p.id] && info[p.id].n) ? 1 : 0));
    for (const c of conds.slice(0, 6)) {
      const ci = info[c.id] || {}, n = ci.n || 0, dur = ci.d ? ` · ${ci.d} ${ci.d === 1 ? 'rodada' : 'rodadas'}` : '';
      const badge = h('span', { class: 'chip-i', style: { background: c.c } }, icon(c.i, 12));
      if (canCond && n) {
        kids.push(h('span', { class: 'hud-c', title: c.n + dur },
          h('button', { type: 'button', class: 'stp-b', id: `hud-c-${c.id}-minus`, title: n === 1 ? `${c.n}: tirar 1 (em zero, a condição sai)` : `${c.n}: tirar 1`, 'aria-label': `Tirar 1 de ${c.n}`, onclick: () => condStepToast(t, c, -1) }, icon('minus', 13)),
          badge, h('span', { class: 'stp-v', id: `hud-c-${c.id}-n`, text: String(n) }),
          h('button', { type: 'button', class: 'stp-b', id: `hud-c-${c.id}-plus`, title: `${c.n}: somar 1`, 'aria-label': `Somar 1 em ${c.n}`, onclick: () => condStepToast(t, c, 1) }, icon('plus', 13))));
      } else if (canCond) {
        kids.push(h('button', { type: 'button', class: 'hud-c one', id: `hud-c-${c.id}`, title: `${c.n}${dur}: abrir condições`, 'aria-label': `${c.n}${dur}`, onclick: () => condPicker([t]) }, badge));
      } else {
        kids.push(h('span', { class: 'hud-c ro', title: c.n + dur }, badge, n ? h('span', { class: 'stp-v', text: String(n) }) : null));
      }
    }
    if (conds.length > 6) kids.push(h('span', { class: 'hud-m', text: '+' + (conds.length - 6) }));
    if (canCond) kids.push(iconBtn('shield', 'Condições', () => condPicker([t]), { size: 16, cls: 'hud-i', id: 'hud-cond' }));
    if (Fichas.podeBolsa(t) && (Fichas.bolsa(t) || []).some(x => x.qtd > 0)) kids.push(iconBtn('bag', 'Bolsa: poções e itens do personagem', () => bagBox(t), { size: 16, cls: 'hud-i', id: 'hud-bolsa' }));
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
  function turnBanner() {
    const sc = Store.scene(), tn = sc.turn;
    const key = sc.id + '|' + (tn.on && tn.cur ? tn.cur + ':' + tn.round : '');
    const prev = turnKey;
    turnKey = key;
    if (prev === key) return;
    if (prev === null || prev.split('|')[0] !== sc.id || !tn.on || !tn.cur) { hideTurn(); return; }
    if (!isGM() && !can('turns')) { hideTurn(); return; }
    const e = tn.list.find(x => x.id === tn.cur);
    const t = e && e.token ? Store.get('tokens', e.token) : null;
    if (!e || (t && !tokShown(t, sc))) { hideTurn(); return; }     // o jogador não fica sabendo de quem ele não vê
    const info = t ? t.cinfo || {} : {};
    const conds = t ? t.conds.map(id => COND_BY_ID[id]).filter(Boolean) : [];
    el.turnb.replaceChildren();
    addKids(el.turnb, [
      t ? tokenAvatar(t, 26) : null,
      h('span', { class: 'turnb-t' }, 'Vez de ', h('strong', { text: turnLabel(e, t ? tokName(t) : e.name) })),
      conds.map(c => {
        const ci = info[c.id] || {};
        return h('span', { class: 'turnb-c' }, h('span', { class: 'chip-i', style: { background: c.c } }, icon(c.i, 12)),
          h('span', { text: c.n + (ci.n ? ' ' + ci.n : '') + (ci.d ? ` · ${ci.d} ${ci.d === 1 ? 'rodada' : 'rodadas'}` : '') }));
      }),
      h('button', { type: 'button', class: 'ib turnb-x', title: 'Fechar', 'aria-label': 'Fechar o aviso de vez', onclick: hideTurn }, icon('x', 14)),
    ]);
    el.turnb.hidden = false;
    clearTimeout(turnTimer);
    turnTimer = setTimeout(hideTurn, conds.length ? 7000 : 4000);
  }

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
    closeModal, condPicker, barDefaultsBox, areaBox, bagBox,
    frame() { if (zoomLabel) { const zt = Math.round(App.view.z * 100) + '%'; if (zoomLabel.textContent !== zt) zoomLabel.textContent = zt; } },
    setSave(s) { saveState = s; status(); },
    hint: setHint,                                        // a linha de dica muda sem redesenhar o resto (cursor sobre um item travado)
  };
})();
