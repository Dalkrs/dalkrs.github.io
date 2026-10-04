/* ---------------------------------------------------------------
   7c. PROJEÇÃO — a cena como ela vai para o banco e para os jogadores
   Tudo aqui é função pura (sem tela, sem banco), para poder ser testado sozinho.

   Numa mesa, cada cena do mestre fica em dois documentos (só ele lê):
     cena:<id>:m ... o mapa: grade, fundo, luz, névoa, permissões, paredes, luzes, desenhos
     cena:<id>:v ... o que muda a toda hora durante o jogo: tokens, efeitos, turnos, miras
   A cena que está "no ar" tem mais dois, que a mesa inteira lê:
     cena:pub:m, cena:pub:v ... a mesma cena, sem o que é só do mestre (projetar)
   E cada jogador tem um, que só ele e o mestre leem:
     cena:pedido:<jogador> ... o que ele fez no mapa e ainda falta o mestre aplicar

   O programa do mestre é quem manda na cena: recebe os pedidos, confere se o jogador podia (validar),
   aplica, e a projeção nova leva o resultado para todo mundo. O jogador vê o que fez na hora; quando a
   projeção chega, a tela dele acerta as diferenças (diferenca).
   --------------------------------------------------------------- */
const Proj = (() => {
  const COLS = ['tokens', 'shapes', 'walls', 'lights', 'effects', 'fogOps'];
  const VIVO = ['tokens', 'effects', 'turn', 'targets'];
  const FORA = ['explored', 'imgs', 'ack', 'pings'];                 // nunca são campos da cena
  const FORMAS = ['free', 'line', 'rect', 'ell', 'poly', 'text'];
  const FX_FORMAS = ['circ', 'quad', 'rect', 'cone', 'line'];
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const num = (v, a, b, padrao) => { const n = Number(v); return isFinite(n) ? clamp(n, a, b) : padrao; };
  const cor = (v, padrao) => (/^#[0-9a-f]{6}$/i.test(v || '') ? v : padrao);
  // Um id que pode vir de fora (de um jogador, de um arquivo): curto, sem caracteres estranhos e nunca o nome de algo
  // que todo objeto já tem ("__proto__", "constructor", "toString"…), que confundiria quem guarda coisas por id.
  const idOk = v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(v) && !(v in Object.prototype);
  const tem = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

  // Igualdade de conteúdo, sem ligar para a ordem das chaves (o banco devolve os objetos com as chaves reordenadas).
  function igual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return a == null && b == null;        // null e undefined: os dois são "sem valor"
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!igual(a[i], b[i])) return false;
      return true;
    }
    for (const k in a) if (a[k] !== undefined && !igual(a[k], b[k])) return false;
    for (const k in b) if (b[k] !== undefined && a[k] === undefined) return false;
    return true;
  }

  // As imagens que uma parte da cena usa: { id: { url, w, h, kind, name } } — só as que estão guardadas no banco.
  function imgsDe(ids, assets) {
    const o = {};
    for (const id of ids) {
      const a = id && assets ? assets[id] : null;
      if (a && /^https:\/\//.test(a.url || '')) o[id] = { url: a.url, w: a.w || 0, h: a.h || 0, kind: a.kind || '', name: a.name || '' };
    }
    return o;
  }

  /* ---- a cena do mestre, em duas partes ---- */
  function partes(sc, assets) {
    const m = {}, v = { id: sc.id };
    for (const k in sc) {
      if (k === 'explored') continue;                                 // o que cada um já explorou fica no aparelho de cada um
      (VIVO.includes(k) ? v : m)[k] = sc[k];
    }
    m.imgs = imgsDe([sc.bg && sc.bg.asset], assets);
    v.imgs = imgsDe(sc.tokens.map(t => t.img), assets);
    return { m, v };
  }
  // O caminho de volta: uma cena nova (cópia), pronta para normalizeScene.
  function juntar(m, v) {
    const sc = {};
    for (const k in m || {}) if (!FORA.includes(k)) sc[k] = clone(m[k]);
    for (const k of VIVO) if (v && v[k] !== undefined) sc[k] = clone(v[k]);
    for (const c of COLS) if (!Array.isArray(sc[c])) sc[c] = [];
    sc.explored = {};
    return sc;
  }

  /* ---- a cena como os jogadores recebem ---- */
  // Barra de um token do mestre: com números, só a proporção, ou nada — conforme a regra de quem não é dono.
  function barraPublica(b, modo) {
    if (modo === 'num') return b;
    const o = { n: b.n, c: b.c, k: b.k, on: b.on, vis: b.vis, v: 0, m: 0 };
    if (modo === 'none' || !b.on || !(b.m > 0)) { o.on = false; return o; }
    o.v = Math.round(1000 * clamp(b.v / b.m, 0, 1)) / 10; o.m = 100;      // só a proporção: os números ficam com o mestre
    return o;
  }
  function tokenPublico(t) {
    const o = clone(t);
    o.notes = '';                                                     // anotações são só do mestre
    if (!t.owner) {
      if (t.showName === false) o.name = '???';
      o.bars = t.bars.map(b => barraPublica(b, b.vis || t.barVis));
      o.auras = (t.auras || []).filter(a => a.pub).map(a => clone(a));
      o.char = null; o.ini = 0;
    }
    return o;
  }
  // Porta secreta: para os jogadores é uma parede comum.
  const paredePublica = w => (w.secret ? { id: w.id, k: 'wall', x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2, open: false, locked: false, secret: false } : w);
  function turnoPublico(sc, fora, nomes) {
    const tn = sc.turn || {};
    if (!sc.perms || !sc.perms.turnos || !Array.isArray(tn.list)) return { on: false, round: 1, cur: null, list: [] };
    return {
      on: !!tn.on, round: tn.round || 1, cur: tn.cur || null,
      list: tn.list.filter(e => !(e.token && fora.has(e.token))).map(e => ({
        id: e.id, token: e.token || null, name: e.token ? (nomes.get(e.token) || '???') : e.name, init: e.init == null ? null : e.init, roll: null, k: e.k || 1, bonus: 0, grp: e.grp || null,
      })),
    };
  }
  function projetar(sc, assets) {
    const fora = new Set(sc.tokens.filter(t => t.hidden).map(t => t.id));
    const tokens = sc.tokens.filter(t => !t.hidden).map(tokenPublico);
    const nomes = new Map(tokens.map(t => [t.id, t.name]));
    const m = {};
    for (const k in sc) if (k !== 'explored' && !VIVO.includes(k)) m[k] = sc[k];
    m.walls = sc.walls.map(paredePublica);
    m.shapes = sc.shapes.filter(s => !s.gm);
    m.imgs = imgsDe([sc.bg && sc.bg.asset], assets);
    const v = {
      id: sc.id, tokens,
      effects: sc.effects.filter(e => !e.gm && !(e.token && fora.has(e.token))).map(e => Object.assign({}, e, { apply: null })),
      turn: turnoPublico(sc, fora, nomes),
      targets: (sc.targets || []).filter(x => !fora.has(x.t)),
      imgs: imgsDe(tokens.map(t => t.img), assets),
    };
    return { m, v };
  }

  /* ---- o que um jogador pediu: vale? ---- */
  const DO_TOKEN = { x: 'mover', y: 'mover', bars: 'barras', conds: 'condicoes', cinfo: 'condicoes', auras: 'auras' };
  function auraLimpa(a) {
    if (!ehObj(a)) return null;
    return { id: idOk(a.id) ? a.id : uid('au'), k: ['circ', 'quad', 'cone'].includes(a.k) ? a.k : 'circ', r: num(a.r, 0.5, 60, 2), c: cor(a.c, '#e6ab4f'), a: num(a.a, 0.05, 0.8, 0.2), ang: num(a.ang, 10, 340, 60), dir: num(a.dir, 0, 360, 0), pub: a.pub !== false };
  }
  function cinfoLimpo(x) {
    const out = {};
    if (!ehObj(x)) return out;
    for (const id in x) {
      if (!tem(COND_BY_ID, id) || !ehObj(x[id])) continue;
      const o = {};
      for (const k of ['n', 'd', 'd0']) { const n = Math.round(Number(x[id][k]) || 0); if (n > 0) o[k] = Math.min(n, 999); }
      if (Object.keys(o).length) out[id] = o;
    }
    return out;
  }
  const pontos = p => (Array.isArray(p) && p.length >= 2 && p.length <= 6000 && p.length % 2 === 0 && p.every(n => typeof n === 'number' && isFinite(n)) ? p.slice() : null);
  // Uma forma desenhada por um jogador: só os campos de forma, com ele como autor e nunca "só do mestre".
  function formaLimpa(v, quem) {
    if (!ehObj(v) || !idOk(v.id) || !FORMAS.includes(v.k)) return null;
    const o = { id: v.id, k: v.k, s: cor(v.s, '#f2c14e'), sw: num(v.sw, 0, 200, 4), f: v.f ? cor(v.f, null) : null, a: num(v.a, 0.05, 1, 1), top: !!v.top, gm: false, lock: false, by: quem };
    if (v.k === 'text') { o.x = num(v.x, -1e5, 1e5, 0); o.y = num(v.y, -1e5, 1e5, 0); o.txt = String(v.txt == null ? '' : v.txt).slice(0, 600); o.fs = num(v.fs, 6, 400, 28); if (!o.txt.trim()) return null; }
    else if (v.k === 'rect' || v.k === 'ell') { o.x = num(v.x, -1e5, 1e5, 0); o.y = num(v.y, -1e5, 1e5, 0); o.w = num(v.w, 0, 1e5, 0); o.h = num(v.h, 0, 1e5, 0); }
    else { o.pts = pontos(v.pts); if (!o.pts) return null; if (v.k === 'line') o.arrow = !!v.arrow; }
    return o;
  }
  // Um remendo numa forma que já existe: a forma continua do mesmo tipo e com o mesmo autor; só passam os campos dela.
  function remendoForma(s, p) {
    if (!ehObj(p)) return null;
    const novo = formaLimpa(Object.assign({}, s, p, { id: s.id, k: s.k }), s.by), q = {};
    if (!novo) return null;
    for (const k in p) if (tem(novo, k) && k !== 'id' && k !== 'by' && k !== 'gm' && k !== 'k' && k !== 'lock') q[k] = novo[k];
    return Object.keys(q).length ? q : null;
  }
  function efeitoLimpo(v, quem, sc) {
    if (!ehObj(v) || !idOk(v.id) || !FX_FORMAS.includes(v.k) || !tem(FX.P, v.fx)) return null;      // só os efeitos da biblioteca
    const tk = v.token ? sc.tokens.find(t => t.id === v.token && !t.hidden) : null;
    const dur = Math.round(num(v.dur, 0, 99, 0));
    return {
      id: v.id, fx: v.fx, k: v.k, x: num(v.x, -1e5, 1e5, 0), y: num(v.y, -1e5, 1e5, 0), r: num(v.r, 0.5, 60, 2), w: num(v.w, 0.25, 60, 1), rw: num(v.rw, 0.5, 120, 3), rh: num(v.rh, 0.5, 120, 2),
      ang: num(v.ang, 10, 340, 60), dir: num(v.dir, 0, 360, 0), pow: num(v.pow, 0.1, 1, 0.8), token: tk ? tk.id : null, gm: false, by: quem,
      seed: Math.round(num(v.seed, 1, 99999, 1)), dur, dur0: dur ? Math.round(num(v.dur0, dur, 99, dur)) : 0, at: dur && typeof v.at === 'string' && sc.turn.list.some(e => e.id === v.at) ? v.at : null, apply: null,
    };
  }
  function remendoEfeito(e, p, sc) {
    if (!ehObj(p)) return null;
    const novo = efeitoLimpo(Object.assign({}, e, p, { id: e.id }), e.by, sc), q = {};
    if (!novo) return null;
    for (const k in p) if (tem(novo, k) && k !== 'id' && k !== 'by' && k !== 'gm' && k !== 'apply') q[k] = novo[k];
    return Object.keys(q).length ? q : null;
  }
  /* Uma operação pedida pelo jogador `quem`, conferida contra a cena `sc` como ela está agora. Devolve a operação
     que o mestre aplica (uma cópia limpa, só com o que o jogador pode mexer) ou null. */
  function validar(op, quem, sc) {
    if (!ehObj(op) || !sc || !quem) return null;
    const p = sc.perms || {};
    if (op.c === 'tokens') {
      if (op.t !== 'upd' || !ehObj(op.p)) return null;                // criar e apagar tokens é com o mestre
      const t = sc.tokens.find(x => x.id === op.id);
      if (!t || t.hidden || !(t.owner === quem || t.owner === '*')) return null;
      const q = {};
      for (const k in op.p) {
        if (!tem(DO_TOKEN, k) || !p[DO_TOKEN[k]]) continue;
        const val = op.p[k];
        if (k === 'x' || k === 'y') {
          if (t.locked || typeof val !== 'number' || !isFinite(val)) continue;
          q[k] = clamp(val, 0, Math.max(0, (k === 'x' ? sc.cols : sc.rows) * sc.cell - t.size * sc.cell));
        } else if (k === 'bars') { if (Array.isArray(val) && val.length) q.bars = val.slice(0, MAX_BARS).map(cleanBar); }
        else if (k === 'conds') { if (Array.isArray(val)) q.conds = Array.from(new Set(val.filter(c => tem(COND_BY_ID, c)))); }
        else if (k === 'cinfo') q.cinfo = cinfoLimpo(val);
        else if (k === 'auras') { if (Array.isArray(val)) q.auras = val.slice(0, 12).map(auraLimpa).filter(Boolean); }
      }
      return Object.keys(q).length ? { t: 'upd', c: 'tokens', id: t.id, p: q } : null;
    }
    if (op.c === 'shapes') {
      if (!p.desenhar) return null;
      if (op.t === 'add') { const v = formaLimpa(op.v, quem); return v && !sc.shapes.some(s => s.id === v.id) ? { t: 'add', c: 'shapes', v } : null; }
      const s = sc.shapes.find(x => x.id === op.id);
      if (!s || s.by !== quem || s.gm) return null;
      if (op.t === 'del') return { t: 'del', c: 'shapes', id: s.id };
      if (op.t === 'upd') { const q = remendoForma(s, op.p); return q ? { t: 'upd', c: 'shapes', id: s.id, p: q } : null; }
      return null;
    }
    if (op.c === 'effects') {
      if (!p.efeitos) return null;
      if (op.t === 'add') { const v = efeitoLimpo(op.v, quem, sc); return v && !sc.effects.some(e => e.id === v.id) ? { t: 'add', c: 'effects', v } : null; }
      const e = sc.effects.find(x => x.id === op.id);
      if (!e || e.by !== quem || e.gm) return null;
      if (op.t === 'del') return { t: 'del', c: 'effects', id: e.id };
      if (op.t === 'upd') { const q = remendoEfeito(e, op.p, sc); return q ? { t: 'upd', c: 'effects', id: e.id, p: q } : null; }
      return null;
    }
    if (op.c === 'walls') {
      if (op.t !== 'upd' || !p.portas || !ehObj(op.p) || typeof op.p.open !== 'boolean') return null;
      const w = sc.walls.find(x => x.id === op.id);
      if (!w || !isOpening(w) || w.secret || w.locked || w.open === op.p.open) return null;
      return { t: 'upd', c: 'walls', id: w.id, p: { open: op.p.open } };
    }
    if (op.t === 'scn' && ehObj(op.p) && Array.isArray(op.p.targets)) {
      if (!p.mira) return null;
      // a mira de cada um é de cada um: o pedido só troca as dele
      const dele = [], vistos = new Set();
      for (const x of op.p.targets) {
        if (!ehObj(x) || x.by !== quem || vistos.has(x.t) || !sc.tokens.some(t => t.id === x.t && !t.hidden)) continue;
        vistos.add(x.t); dele.push({ by: quem, t: x.t });
      }
      const novo = sc.targets.filter(x => x.by !== quem).concat(dele);
      return igual(novo, sc.targets) ? null : { t: 'scn', p: { targets: novo } };
    }
    return null;
  }

  /* ---- do que está na tela para o que deveria estar ---- */
  // As operações que levam a cena `a` até a cena `b` (as duas inteiras). Tudo o que entra é cópia.
  function diferenca(a, b) {
    const ops = [], p = {};
    for (const k of new Set(Object.keys(a).concat(Object.keys(b)))) {
      if (COLS.includes(k) || k === 'explored' || k === 'id') continue;
      if (!igual(a[k], b[k])) p[k] = clone(b[k]);
    }
    if (Object.keys(p).length) ops.push({ t: 'scn', p });
    for (const c of COLS) {
      const A = a[c] || [], B = b[c] || [];
      const emA = new Map(A.map(o => [o.id, o])), emB = new Set(B.map(o => o.id));
      const seq = [];
      for (const o of A) { if (emB.has(o.id)) seq.push(o.id); else ops.push({ t: 'del', c, id: o.id }); }
      B.forEach((o, i) => {
        const de = emA.get(o.id);
        if (!de) { ops.push({ t: 'add', c, v: clone(o), i }); seq.splice(Math.min(i, seq.length), 0, o.id); return; }
        const q = {};
        for (const k of new Set(Object.keys(de).concat(Object.keys(o)))) if (!igual(de[k], o[k])) q[k] = clone(o[k]);
        if (Object.keys(q).length) ops.push({ t: 'upd', c, id: o.id, p: q });
      });
      if (seq.some((id, i) => id !== B[i].id)) ops.push({ t: 'ord', c, ids: B.map(o => o.id) });
    }
    return ops;
  }
  // Aplica operações numa cena solta (fora do Store): é como o jogador repõe, por cima da projeção que chegou,
  // o que ele fez e o mestre ainda não aplicou.
  function aplicarEm(sc, ops) {
    for (const op of ops || []) {
      if (!ehObj(op)) continue;
      if (op.t === 'scn') { for (const k in op.p || {}) sc[k] = clone(op.p[k]); continue; }
      const arr = sc[op.c];
      if (!COLS.includes(op.c) || !Array.isArray(arr)) continue;
      if (op.t === 'add') { if (ehObj(op.v) && !arr.some(o => o.id === op.v.id)) arr.splice(op.i == null ? arr.length : clamp(op.i, 0, arr.length), 0, clone(op.v)); }
      else if (op.t === 'del') { const i = arr.findIndex(o => o.id === op.id); if (i >= 0) arr.splice(i, 1); }
      else if (op.t === 'upd') { const o = arr.find(x => x.id === op.id); if (o) for (const k in op.p || {}) o[k] = clone(op.p[k]); }
      else if (op.t === 'ord' && Array.isArray(op.ids)) {
        const por = new Map(arr.map(o => [o.id, o])), nova = op.ids.map(id => por.get(id)).filter(Boolean);
        for (const o of arr) if (!op.ids.includes(o.id)) nova.push(o);
        arr.length = 0; arr.push(...nova);
      }
    }
    return sc;
  }

  /* ---- o índice das cenas da mesa ---- */
  function normIndice(d) {
    d = ehObj(d) ? d : {};
    const ordem = Array.from(new Set((Array.isArray(d.ordem) ? d.ordem : []).filter(idOk)));
    const prefs = ehObj(d.prefs) ? d.prefs : {};
    return {
      v: 1, ordem, atual: idOk(d.atual) ? d.atual : null, noAr: idOk(d.noAr) ? d.noAr : null,
      prefs: { barDefaults: Array.isArray(prefs.barDefaults) && prefs.barDefaults.length ? prefs.barDefaults.slice(0, MAX_BARS).map(cleanBar) : null },
    };
  }

  /* ---- cenas que vêm de fora da mesa (do navegador, de um arquivo) ---- */
  const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  // De quem era cada coisa lá → quem é aqui: jogador com o mesmo nome de um participante da mesa continua dono.
  function mapaDeDonos(jogadoresDeLa, membros) {
    const mapa = {};
    for (const p of jogadoresDeLa || []) {
      if (!p || !p.id) continue;
      const par = (membros || []).find(m => m.id === p.id) || (membros || []).find(m => semAcento(m.name) === semAcento(p.name));
      mapa[p.id] = par ? par.id : null;
    }
    return mapa;
  }
  // Troca os donos numa cena (cópia já feita por quem chama). Quem não tem par na mesa passa a ser do mestre.
  function trocarDonos(sc, mapa, membros) {
    const ids = new Set((membros || []).map(m => m.id));
    const novo = id => (id == null || id === '*' ? id : ids.has(id) ? id : (mapa && mapa[id]) || null);
    for (const t of sc.tokens || []) t.owner = novo(t.owner);
    for (const s of sc.shapes || []) s.by = novo(s.by) === '*' ? null : novo(s.by);
    for (const e of sc.effects || []) e.by = novo(e.by) === '*' ? null : novo(e.by);
    sc.targets = (sc.targets || []).map(x => ({ by: x.by === 'gm' ? 'gm' : novo(x.by), t: x.t })).filter(x => x.by);
    sc.explored = {};
    return sc;
  }

  return { COLS, VIVO, igual, imgsDe, partes, juntar, projetar, validar, diferenca, aplicarEm, normIndice, mapaDeDonos, trocarDonos, idOk };
})();
