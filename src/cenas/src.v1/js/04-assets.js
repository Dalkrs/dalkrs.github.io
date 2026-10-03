/* ---------------------------------------------------------------
   4. ASSETS + SALVAMENTO
   As imagens ficam em Store.S.assets como data URL (no site final,
   cada uma vira um arquivo no Supabase Storage). Tudo é guardado no
   IndexedDB deste navegador; se ele não estiver disponível, a mesa
   funciona só em memória e avisa.
   --------------------------------------------------------------- */
const DB = (() => {
  let db = null;
  function open() {
    return new Promise(res => {
      try {
        const rq = indexedDB.open('cenas-de-urgm', 1);
        rq.onupgradeneeded = () => { rq.result.createObjectStore('kv'); };
        rq.onsuccess = () => { db = rq.result; res(true); };
        rq.onerror = () => res(false);
        rq.onblocked = () => res(false);
      } catch (e) { res(false); }
    });
  }
  function all() {
    return new Promise(res => {
      try {
        const st = db.transaction('kv', 'readonly').objectStore('kv');
        const out = new Map();
        const rq = st.openCursor();
        rq.onsuccess = () => { const c = rq.result; if (c) { out.set(c.key, c.value); c.continue(); } else res(out); };
        rq.onerror = () => res(new Map());
      } catch (e) { res(new Map()); }
    });
  }
  function write(puts, dels) {
    return new Promise(res => {
      try {
        const t = db.transaction('kv', 'readwrite');
        const st = t.objectStore('kv');
        for (const [k, v] of puts) st.put(v, k);
        for (const k of dels) st.delete(k);
        t.oncomplete = () => res(true);
        t.onerror = () => res(false);
        t.onabort = () => res(false);
      } catch (e) { res(false); }
    });
  }
  return { open, all, write, ready: () => !!db };
})();

const Persist = (() => {
  const S = Store.S;
  let status = 'mem';                 // mem | ok | saving | erro
  const dScenes = new Set(), dAssets = new Set(), removed = new Set();
  let dMeta = false, onStatus = () => {};

  function setStatus(s) { if (status !== s) { status = s; onStatus(s); } }

  async function load() {
    const ok = await DB.open();
    if (!ok) { setStatus('mem'); return false; }
    setStatus('ok');
    const m = await DB.all();
    const meta = m.get('meta');
    if (!meta || !Array.isArray(meta.order)) return false;
    for (const [k, v] of m) {
      if (k.startsWith('asset:')) S.assets[v.id] = v;
      else if (k.startsWith('scene:')) S.scenes[v.id] = normalizeScene(v);
    }
    S.order = meta.order.filter(id => S.scenes[id]);
    for (const id in S.scenes) if (!S.order.includes(id)) S.order.push(id);
    S.players = Array.isArray(meta.players) ? meta.players : [];
    S.prefs = meta.prefs || {};
    S.current = S.scenes[meta.current] ? meta.current : S.order[0] || null;
    // Remove imagens que nenhuma cena usa mais.
    const used = new Set();
    for (const id in S.scenes) {
      const sc = S.scenes[id];
      if (sc.bg && sc.bg.asset) used.add(sc.bg.asset);
      for (const t of sc.tokens) if (t.img) used.add(t.img);
    }
    for (const id in S.assets) if (!used.has(id)) { delete S.assets[id]; removed.add('asset:' + id); }
    if (removed.size) save();
    return S.order.length > 0;
  }

  async function flush() {
    if (!DB.ready()) return;
    if (!dMeta && !dScenes.size && !dAssets.size && !removed.size) return;
    setStatus('saving');
    const puts = [];
    for (const id of dAssets) if (S.assets[id]) puts.push(['asset:' + id, S.assets[id]]);
    for (const id of dScenes) if (S.scenes[id]) puts.push(['scene:' + id, S.scenes[id]]);
    if (dMeta) puts.push(['meta', { v: 1, order: S.order, current: S.current, players: S.players, prefs: S.prefs }]);
    const dels = Array.from(removed);
    dScenes.clear(); dAssets.clear(); removed.clear(); dMeta = false;
    let ok = false;
    try { ok = await DB.write(puts, dels); } catch (e) { ok = false; }
    setStatus(ok ? 'ok' : 'erro');
  }
  const save = debounce(flush, 450);

  return {
    load, flush,
    status: () => status,
    onStatus(fn) { onStatus = fn; },
    scene(id) { if (id) { dScenes.add(id); dMeta = true; save(); } },
    asset(id) { dAssets.add(id); save(); },
    meta() { dMeta = true; save(); },
    removeScene(id) { removed.add('scene:' + id); dMeta = true; save(); },
  };
})();

const Assets = (() => {
  const S = Store.S;
  const imgs = new Map();

  // Devolve a imagem pronta para desenhar, ou null enquanto carrega.
  function img(id) {
    if (!id) return null;
    let im = imgs.get(id);
    if (!im) {
      const a = S.assets[id];
      if (!a) return null;
      im = new Image();
      im.decoding = 'async';
      im.onload = () => { im.ok = true; Render.request(); };
      im.src = a.url;
      imgs.set(id, im);
    }
    return im.ok ? im : null;
  }

  function decode(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('Não consegui abrir essa imagem.'));
      im.src = src;
    });
  }

  function encode(cv, kind) {
    let url = '';
    try { url = cv.toDataURL('image/webp', 0.86); } catch (e) { url = ''; }
    if (!url.startsWith('data:image/webp')) url = kind === 'bg' ? cv.toDataURL('image/jpeg', 0.86) : cv.toDataURL('image/png');
    return url;
  }

  function register(url, w, hh, kind, name) {
    const id = 'img_' + hashStr(url).toString(36) + url.length.toString(36);
    if (!S.assets[id]) { S.assets[id] = { id, url, w, h: hh, kind, name: name || '' }; Persist.asset(id); }
    return S.assets[id];
  }

  // Lê um arquivo de imagem, reduz se for grande demais e guarda.
  async function fromFile(file, kind) {
    if (!file || !/^image\//.test(file.type || '')) throw new Error('Esse arquivo não é uma imagem.');
    const src = URL.createObjectURL(file);
    try {
      const im = await decode(src);
      const max = kind === 'bg' ? 4096 : 512;
      const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
      const w = Math.max(1, Math.round(im.naturalWidth * k)), hh = Math.max(1, Math.round(im.naturalHeight * k));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = hh;
      cv.getContext('2d').drawImage(im, 0, 0, w, hh);
      const name = String(file.name || '').replace(/\.[a-z0-9]+$/i, '');
      return register(encode(cv, kind), w, hh, kind, name);
    } finally { URL.revokeObjectURL(src); }
  }

  // Guarda uma imagem já em data URL (cena importada ou fundo de exemplo).
  function fromData(a) {
    if (!a || !a.id || !/^data:image\//.test(String(a.url || ''))) return null;   // só imagens embutidas
    if (a.id && !S.assets[a.id]) { S.assets[a.id] = a; Persist.asset(a.id); }
    return S.assets[a.id];
  }

  return { img, fromFile, fromData, register, encode };
})();
