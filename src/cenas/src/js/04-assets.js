/* ---------------------------------------------------------------
   4. ASSETS + SALVAMENTO
   Fora de uma mesa (página aberta sozinha, ou o site sem mesa aberta), tudo fica no IndexedDB deste navegador:
   as cenas e as imagens (em Store.S.assets, como data URL). Se o IndexedDB não estiver disponível, a mesa
   funciona só em memória e avisa.
   Com uma mesa aberta no site, quem guarda é o banco (ver 7d. NUVEM): as cenas viram documentos da mesa e
   cada imagem vira um arquivo no Storage (em Store.S.assets fica o endereço dela). Persist e Assets são a
   porta única: o resto do programa não precisa saber onde as coisas ficam.
   --------------------------------------------------------------- */
function makeDB(name) {
  let db = null;
  function open() {
    return new Promise(res => {
      try {
        const rq = indexedDB.open(name, 1);
        rq.onupgradeneeded = () => { rq.result.createObjectStore('kv'); };
        rq.onsuccess = () => { db = rq.result; res(true); };
        rq.onerror = () => res(false);
        rq.onblocked = () => res(false);
      } catch (e) { res(false); }
    });
  }
  // Tudo o que está guardado; com um prefixo, só as chaves que começam por ele.
  function all(prefix) {
    return new Promise(res => {
      try {
        const st = db.transaction('kv', 'readonly').objectStore('kv');
        const out = new Map();
        const rq = prefix ? st.openCursor(IDBKeyRange.bound(prefix, prefix + '\uffff')) : st.openCursor();
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
}
const DB = makeDB('cenas-de-urgm');        // nome antigo, mantido de propósito: é onde estão as cenas de quem já usava a mesa

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

  // Com uma mesa aberta, quem guarda é a nuvem; sem mesa, o IndexedDB daqui.
  return {
    load: () => (Nuvem.on() ? Nuvem.carregar() : load()),
    flush: () => (Nuvem.on() ? Nuvem.descarregar() : flush()),
    status: () => (Nuvem.on() ? Nuvem.estado() : status),
    onStatus(fn) { onStatus = fn; Nuvem.aoEstado(fn); },
    scene(id) { if (Nuvem.on()) { Nuvem.cena(id); return; } if (id) { dScenes.add(id); dMeta = true; save(); } },
    // O que cada um já explorou do mapa: na mesa, fica no aparelho de cada um (não vai para o banco).
    explored(id) { if (Nuvem.on()) { Nuvem.explorado(id); return; } if (id) { dScenes.add(id); dMeta = true; save(); } },
    asset(id) { if (Nuvem.on()) return; dAssets.add(id); save(); },
    meta() { if (Nuvem.on()) { Nuvem.meta(); return; } dMeta = true; save(); },
    removeScene(id) { if (Nuvem.on()) { Nuvem.tirarCena(id); return; } removed.add('scene:' + id); dMeta = true; save(); },
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
      if (/^https?:/.test(a.url)) im.crossOrigin = 'anonymous';      // imagem que vem do banco: sem isto o canvas fica "sujo" e não exporta
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

  // Guarda o que está num canvas: neste navegador (data URL) ou, com uma mesa aberta, no banco (arquivo no Storage).
  // É sempre uma promessa; na mesa, pode falhar (sem internet, por exemplo) e quem chamou avisa.
  async function fromCanvas(cv, kind, name) {
    if (Nuvem.on()) return Nuvem.guardarImagem(cv, kind, name);
    return register(encode(cv, kind), cv.width, cv.height, kind, name);
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
      return await fromCanvas(cv, kind, name);
    } finally { URL.revokeObjectURL(src); }
  }

  // Guarda uma imagem que veio num arquivo de cena: embutida (data URL) ou já guardada no banco de uma mesa
  // (endereço do Storage). Na mesa, a embutida sobe para o banco (promessa); fora, fica aqui, na hora.
  const NO_BANCO = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/mesas\/[A-Za-z0-9/_.-]+$/;
  function fromData(a) {
    if (!a || !a.id) return null;
    const url = String(a.url || ''), embutida = /^data:image\//.test(url);
    if (!embutida && !NO_BANCO.test(url)) return null;
    if (embutida && Nuvem.on()) return Nuvem.guardarDeDados(a);
    if (!S.assets[a.id]) { S.assets[a.id] = { id: a.id, url, w: a.w || 0, h: a.h || 0, kind: a.kind || '', name: a.name || '' }; Persist.asset(a.id); }
    return S.assets[a.id];
  }

  return { img, fromFile, fromCanvas, fromData, register, encode };
})();
