/* ---------------------------------------------------------------
   2. STORE — estado + operações
   Toda alteração de cena passa por uma operação:
     { t:'add', c, v, i? }   inclui um objeto na coleção c
     { t:'del', c, id }      remove
     { t:'upd', c, id, p }   altera campos do objeto (p = patch raso)
     { t:'scn', p }          altera campos da própria cena
     { t:'ord', c, ids }     reordena a coleção
   Cada gesto do usuário é uma transação (begin/commit) e vira um passo
   de desfazer. Store.on('commit') recebe as operações já aplicadas:
   é ali que entra o envio para o Supabase.
   --------------------------------------------------------------- */
const Store = (() => {
  const S = { scenes: {}, order: [], current: null, players: [], assets: {}, prefs: {} };
  const hist = new Map();           // id da cena → { undo: [], redo: [] }
  const subs = {};
  let tx = null;
  const MAX_UNDO = 120;

  const on = (ev, fn) => { (subs[ev] = subs[ev] || []).push(fn); };
  const emit = (ev, a, b) => { for (const fn of subs[ev] || []) fn(a, b); };

  const scene = () => S.scenes[S.current];
  const get = (c, id) => { const sc = scene(); return sc && sc[c] ? sc[c].find(o => o.id === id) : undefined; };
  const H = () => { let x = hist.get(S.current); if (!x) { x = { undo: [], redo: [] }; hist.set(S.current, x); } return x; };

  // Aplica a operação e devolve a operação inversa.
  function raw(op) {
    const sc = scene();
    switch (op.t) {
      case 'add': {
        const arr = sc[op.c];
        const i = op.i == null ? arr.length : clamp(op.i, 0, arr.length);
        arr.splice(i, 0, op.v);
        return { t: 'del', c: op.c, id: op.v.id };
      }
      case 'del': {
        const arr = sc[op.c];
        const i = arr.findIndex(o => o.id === op.id);
        if (i < 0) return null;
        const [v] = arr.splice(i, 1);
        return { t: 'add', c: op.c, v, i };
      }
      case 'upd': {
        const o = sc[op.c].find(x => x.id === op.id);
        if (!o) return null;
        const prev = {};
        for (const k in op.p) { prev[k] = o[k]; o[k] = op.p[k]; }
        return { t: 'upd', c: op.c, id: op.id, p: prev };
      }
      case 'scn': {
        const prev = {};
        for (const k in op.p) { prev[k] = sc[k]; sc[k] = op.p[k]; }
        return { t: 'scn', p: prev };
      }
      case 'ord': {
        const arr = sc[op.c];
        const prev = arr.map(o => o.id);
        const byId = new Map(arr.map(o => [o.id, o]));
        const next = op.ids.map(id => byId.get(id)).filter(Boolean);
        for (const o of arr) if (!op.ids.includes(o.id)) next.push(o);
        arr.length = 0; arr.push(...next);
        return { t: 'ord', c: op.c, ids: prev };
      }
    }
    return null;
  }

  function begin(label) {
    if (!tx) tx = { label: label || '', fwd: [], inv: [], idx: new Map(), scene: S.current };
    return tx;
  }
  const inTx = () => !!tx;

  function push(op) {
    const auto = !tx;
    if (auto) begin(op.label);
    // Junta alterações repetidas do mesmo objeto (arrastar gera centenas delas).
    const key = op.t === 'upd' ? op.c + ':' + op.id : op.t === 'scn' ? 'scn' : null;
    const merged = key && tx.idx.get(key);
    const inv = raw(op);
    if (inv) {
      if (merged) {
        for (const k in op.p) {
          if (!(k in merged.inv.p)) merged.inv.p[k] = inv.p[k];
          merged.fwd.p[k] = op.p[k];
        }
      } else {
        const f = op.t === 'upd' || op.t === 'scn' ? Object.assign({}, op, { p: Object.assign({}, op.p) }) : op;
        tx.fwd.push(f);
        tx.inv.unshift(inv);
        if (key) tx.idx.set(key, { fwd: f, inv });
        else tx.idx.clear();
      }
      emit('live', op, inv);         // quem escuta recebe também o estado anterior (inv)
    }
    if (auto) commit();
    return !!inv;
  }

  function commit() {
    if (!tx) return;
    const t = tx; tx = null;
    if (!t.fwd.length) return;
    const hh = H();
    hh.undo.push({ label: t.label, fwd: t.fwd, inv: t.inv });
    if (hh.undo.length > MAX_UNDO) hh.undo.shift();
    hh.redo.length = 0;
    emit('commit', { sceneId: S.current, label: t.label, ops: t.fwd });
  }

  function cancel() {
    if (!tx) return;
    const t = tx; tx = null;
    for (const op of t.inv) { raw(op); emit('live', op); }
    emit('commit', { sceneId: S.current, label: '', ops: [] });
  }

  function undo() {
    if (tx) commit();
    const hh = H(); const e = hh.undo.pop();
    if (!e) return null;
    for (const op of e.inv) { raw(op); emit('live', op); }
    hh.redo.push(e);
    emit('commit', { sceneId: S.current, label: e.label, ops: e.inv });
    return e;
  }
  function redo() {
    if (tx) commit();
    const hh = H(); const e = hh.redo.pop();
    if (!e) return null;
    for (const op of e.fwd) { raw(op); emit('live', op); }
    hh.undo.push(e);
    emit('commit', { sceneId: S.current, label: e.label, ops: e.fwd });
    return e;
  }

  return {
    S, on, emit, scene, get, begin, commit, cancel, inTx, undo, redo,
    canUndo: () => H().undo.length > 0,
    canRedo: () => H().redo.length > 0,
    add: (c, v, i) => push({ t: 'add', c, v, i }),
    del: (c, id) => push({ t: 'del', c, id }),
    upd: (c, id, p) => push({ t: 'upd', c, id, p }),
    scn: p => push({ t: 'scn', p }),
    ord: (c, ids) => push({ t: 'ord', c, ids }),
    // Agrupa várias operações num único passo de desfazer.
    tx(label, fn) { const own = !tx; begin(label); try { fn(); } finally { if (own) commit(); } },

    /* Operações fora do desfazer: cenas, jogadores e preferências. */
    setCurrent(id) { if (tx) commit(); if (S.scenes[id]) { S.current = id; emit('scene', id); } },
    addScene(sc) { S.scenes[sc.id] = sc; S.order.push(sc.id); emit('meta', { scene: sc.id }); },
    removeScene(id) {
      delete S.scenes[id]; hist.delete(id);
      S.order = S.order.filter(x => x !== id);
      emit('meta', { removed: id });
    },
    meta(info) { emit('meta', info || {}); },
  };
})();
