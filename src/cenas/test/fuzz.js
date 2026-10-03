// Sequências aleatórias de ações (com desfazer e refazer no meio) para caçar exceções e estados incoerentes.
// Uso: node fuzz.js [semente] [passos]      (sem argumentos: a semente e os 1500 passos de sempre)
// Além das ações diretas (Act, Store), parte dos passos mexe pela interface: clica nos botões da aba de turnos e
// dos painéis, do jeito que o mestre faz. Os dados (crypto e Math.random) seguem a semente: a mesma semente
// repete a mesma sequência.
const { open } = require('./lib');
const SEED = parseInt(process.argv[2], 10) || 20261002, STEPS = parseInt(process.argv[3], 10) || 1500;
(async () => {
  const t = await open();
  const { page } = t;
  const out = await page.evaluate(async ([SEED, STEPS]) => {
    const u = __urgm, S = u.Store, A = u.Act;
    let seed = SEED;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const pick = a => a[Math.floor(rnd() * a.length)];
    // os sorteios da própria mesa (dado da iniciativa, ids novos) também saem de uma semente
    let seed2 = SEED ^ 0x5bd1e995;
    const rnd2 = () => { seed2 = (seed2 * 1103515245 + 12345) >>> 0; return seed2 / 4294967296; };
    Math.random = rnd2;
    Object.defineProperty(crypto, 'getRandomValues', { configurable: true, value: a => { for (let i = 0; i < a.length; i++) a[i] = Math.floor(rnd2() * 4294967296); return a; } });
    const CONDS = ['fogo', 'veneno', 'sangue', 'escudo', 'gelo', 'medo'];
    const problems = [], counts = {};
    const sc0 = S.scene();
    let commits = 0;
    S.on('commit', e => { if (e.ops && e.ops.length) commits++; });
    const snap = () => JSON.stringify(S.scene(), (k, v) => (k === 'explored' ? undefined : v));
    const isInt = v => Number.isInteger(v);
    const clampTurns = n => Math.min(4, Math.max(1, Math.round(Number(n)) || 1));

    const check = (label) => {
      const sc = S.scene();
      for (const t of sc.tokens) {
        if (!Array.isArray(t.bars) || t.bars.length > 8) problems.push(`${label}: ${t.name} com ${t.bars && t.bars.length} barras`);
        for (const b of t.bars) if (!(b.v >= 0) || !(b.m >= 0) || !['bar', 'pts'].includes(b.k) || typeof b.n !== 'string') problems.push(`${label}: barra inválida em ${t.name}: ${JSON.stringify(b)}`);
        for (const k in t.cinfo) { if (!t.conds.includes(k)) problems.push(`${label}: ${t.name} tem dados de "${k}" sem a condição`); const ci = t.cinfo[k]; if ((ci.n != null && !(ci.n > 0)) || (ci.d != null && !(ci.d > 0))) problems.push(`${label}: contador/duração inválidos em ${t.name}: ${JSON.stringify(ci)}`); }
        if (new Set(t.conds).size !== t.conds.length) problems.push(`${label}: condição repetida em ${t.name}`);
        if (!isInt(t.ini) || Math.abs(t.ini) > 99) problems.push(`${label}: iniciativa do token ${t.name} = ${t.ini}`);
        if (!isInt(t.turns) || t.turns < 1 || t.turns > 4) problems.push(`${label}: turnos por rodada de ${t.name} = ${t.turns}`);
      }
      for (const g of sc.targets) if (!sc.tokens.some(t => t.id === g.t)) problems.push(`${label}: mira num token que não existe`);
      const tn = sc.turn;
      if (tn.list.length && !tn.list.some(e => e.id === tn.cur)) problems.push(`${label}: a vez aponta para fora da ordem`);
      if (tn.list.some(e => e.token && !sc.tokens.some(t => t.id === e.token))) problems.push(`${label}: ordem de turnos com token apagado`);
      if (!(tn.round >= 1)) problems.push(`${label}: rodada ${tn.round}`);
      // ordem de turnos: ids únicos; cada combatente com os turnos numerados 1…n; token com tantas entradas quantos turnos tem
      if (new Set(tn.list.map(e => e.id)).size !== tn.list.length) problems.push(`${label}: entradas repetidas na ordem de turnos`);
      const groups = new Map();
      for (const e of tn.list) {
        if (!isInt(e.k) || e.k < 1) problems.push(`${label}: entrada "${e.name}" com k = ${e.k}`);
        if (!(e.init === null || (typeof e.init === 'number' && isFinite(e.init)))) problems.push(`${label}: iniciativa inválida em "${e.name}": ${e.init}`);
        if (e.roll !== null && !(e.roll && isInt(e.roll.d) && e.roll.d >= 1 && e.roll.d <= 20 && isInt(e.roll.b) && e.init === e.roll.d + e.roll.b)) problems.push(`${label}: rolagem que não fecha em "${e.name}": ${JSON.stringify(e.roll)} → ${e.init}`);
        if (!e.token && (typeof e.name !== 'string' || !isInt(e.bonus) || Math.abs(e.bonus) > 99 || !(e.grp === null || typeof e.grp === 'string'))) problems.push(`${label}: entrada avulsa inválida: ${JSON.stringify(e)}`);
        const g = e.token ? 't:' + e.token : e.grp ? 'g:' + e.grp : 'e:' + e.id;
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(e.k);
      }
      for (const [g, ks] of groups) {
        if (ks.slice().sort((a, b) => a - b).join() !== ks.map((_, i) => i + 1).join()) problems.push(`${label}: turnos mal numerados em ${g}: ${ks.join()}`);
        if (g[0] === 't') { const tk = sc.tokens.find(x => 't:' + x.id === g); if (tk && ks.length !== clampTurns(tk.turns)) problems.push(`${label}: ${tk.name} tem ${tk.turns} turnos por rodada e ${ks.length} entradas na ordem`); }
      }
      for (const e of sc.effects) {
        if (e.dur != null && !(e.dur >= 0)) problems.push(`${label}: duração de efeito inválida`);
        if (e.k === 'rect' && !(e.rw > 0 && e.rh > 0)) problems.push(`${label}: retângulo sem tamanho: ${e.rw} × ${e.rh}`);
        const a = e.apply;
        if (a != null && !(typeof a.bar === 'string' && typeof a.amt === 'string' && Array.isArray(a.skip) && a.skip.every(x => typeof x === 'string') && (a.cond === null || (a.cond && typeof a.cond.id === 'string' && a.cond.n >= 0 && a.cond.d >= 0)))) problems.push(`${label}: configuração de reaplicar inválida: ${JSON.stringify(a)}`);
        const g = u.FX.geom(e, sc);
        if (!g || !g.path || !(g.R >= 0)) problems.push(`${label}: área de efeito sem forma (${e.k})`);
        else u.tokensIn(g.path, sc);
      }
      for (const w of sc.walls) {
        if (typeof w.open !== 'boolean' || typeof w.locked !== 'boolean' || typeof w.secret !== 'boolean') problems.push(`${label}: parede com campo que não é sim/não: ${JSON.stringify(w)}`);
        if (w.secret && w.k !== 'door') problems.push(`${label}: "${w.k}" marcada como secreta`);
      }
      // as paredes efetivas guardadas têm de ser as mesmas de uma conta feita do zero
      const sig = d => JSON.stringify([d.sight, d.move, d.curtains.map(c => c.id), Array.from(d.pieces.entries())]);
      const cached = sig(u.Walls.of(sc)); u.Walls.invalidate();
      if (cached !== sig(u.Walls.of(sc))) problems.push(`${label}: paredes efetivas desatualizadas`);
      for (const s of u.App.sel) if (!S.get(s.c, s.id)) problems.push(`${label}: seleção apontando para algo apagado`);
    };

    /* ---- pela interface ---- */
    const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
    const press = b => { if (b && !b.disabled) { b.click(); return true; } return false; };
    const type = (inp, v) => { if (!inp || inp.disabled) return false; inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); return true; };
    const panel = tab => { u.UI.openTab(tab); u.UI.renderAll(); };
    // Janela aberta: preenche o que houver, aperta um dos botões e garante que nada fica aberto.
    const modalStep = () => {
      const m = $('.modal');
      if (!m) return;
      const set = (s, vals) => { const i = m.querySelector(s); if (i) { i.value = pick(vals); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); } };
      set('#dlg-in', ['', 'Armadilha', 'Lobos', 'Reforço', '   ', '12', '-5', '+3']);
      set('#le-ini', ['0', '4', '-3', '150', '', '1.5']);
      set('#le-turns', ['1', '2', '4', '9', '0', '']);
      for (const c of m.querySelectorAll('input[type=checkbox]')) if (rnd() < 0.3) c.click();
      const bs = Array.from(m.querySelectorAll('.modal-a .btn')).filter(b => !b.disabled);
      if (bs.length) pick(bs).click();
      if ($('.modal')) u.UI.closeModal();
    };
    const selOne = (c, o) => { if (o) u.setSel([{ c, id: o.id }]); return o; };
    // Só confere "virou um passo só de desfazer" nas ações que prometem isso (as outras também são conferidas, sem a promessa).
    const turnSorted = () => { const l = S.scene().turn.list.map(e => (e.init == null ? -Infinity : e.init)); return l.every((v, i) => i === 0 || l[i - 1] >= v); };

    const ops = {
      barAdd: () => A.barAdd(pick(S.scene().tokens)),
      barDel: () => { const t = pick(S.scene().tokens); if (t.bars.length > 1) A.barDel(t, Math.floor(rnd() * t.bars.length)); },
      barSet: () => { const t = pick(S.scene().tokens); if (t.bars.length) A.barSet(t, Math.floor(rnd() * t.bars.length), pick(['-3', '+5', '0', '12', '-999', '+999', '7,5', 'x'])); },
      barPatch: () => { const t = pick(S.scene().tokens); if (t.bars.length) A.barPatch(t, Math.floor(rnd() * t.bars.length), pick([{ k: 'pts' }, { k: 'bar' }, { on: false }, { on: true }, { m: Math.floor(rnd() * 30) }, { vis: pick(['', 'num', 'bar', 'none']) }])); },
      condToggle: () => A.condToggle([pick(S.scene().tokens), pick(S.scene().tokens)], pick(CONDS)),
      condStep: () => { const t = pick(S.scene().tokens); if (t.conds.length) A.condStep(t, pick(t.conds), pick([1, 1, -1])); },
      condSet: () => { const t = pick(S.scene().tokens); if (t.conds.length) { const d = Math.floor(rnd() * 4); A.condSet(t, pick(t.conds), { d, d0: d }); } },
      area: () => { const toks = S.scene().tokens.filter(() => rnd() < 0.5); if (toks.length) A.areaApply(toks.map(t => ({ t, half: rnd() < 0.3 })), pick(['Vida', 'SP', 'Nada']), pick(['12', '+6', '', '-1', 'zz']), rnd() < 0.5 ? { id: pick(CONDS), n: Math.floor(rnd() * 3), d: Math.floor(rnd() * 3) } : null); },
      target: () => A.targetToggle([pick(S.scene().tokens)]),
      turnNext: () => A.turnStep(1),
      turnPrev: () => A.turnStep(-1),
      turnAdd: () => A.turnAdd([pick(S.scene().tokens)]),
      turnOff: () => A.turnPatch(x => { x.on = !x.on; if (x.on) { x.round = 1; x.cur = x.list.length ? x.list[0].id : null; x.back = 0; } }),
      fxAdd: () => { const sc = S.scene(); const dur = Math.floor(rnd() * 3); S.tx('Soltar efeito', () => S.add('effects', { id: 'fx_' + Math.floor(rnd() * 1e9), fx: pick(['fogo', 'gelo', 'raio']), k: pick(['circ', 'cone', 'line', 'quad']), x: rnd() * 1800, y: rnd() * 1200, r: 2, w: 1, ang: 60, dir: 0, pow: 0.8, token: rnd() < 0.3 ? pick(sc.tokens).id : null, gm: false, by: null, seed: 3, dur, dur0: dur, at: dur && sc.turn.on ? sc.turn.cur : null })); },
      tokDel: () => { const sc = S.scene(); if (sc.tokens.length > 3) { u.setSel([{ c: 'tokens', id: pick(sc.tokens).id }]); A.deleteSel(); } },
      tokDup: () => { u.setSel([{ c: 'tokens', id: pick(S.scene().tokens).id }]); A.duplicateSel(); },
      wall: () => { const sc = S.scene(); if (sc.walls.length) { const w = pick(sc.walls); S.tx('Tipo de parede', () => S.upd('walls', w.id, pick([{ k: 'window', secret: false }, { k: 'veil', secret: false }, { k: 'door', secret: true, open: false }, { k: 'door', secret: false, open: true }, { k: 'wall', secret: false }]))); } },
      door: () => { const d = S.scene().walls.filter(w => w.k === 'door'); if (d.length) A.toggleDoor(pick(d)); },
      scene: () => S.tx('Ambiente', () => S.scn(pick([{ tone: 'noite', light: 'penumbra' }, { tone: 'dia', light: 'claro' }, { tone: 'breu', light: 'escuro' }, { weather: { k: pick(['', 'chuva', 'neve', 'neblina', 'cinzas', 'vagalumes']), pow: 0.2 + rnd() * 0.8 } }]))),
      viewer: () => u.UI.setViewer(pick(['gm', 'gm', 'jg_dalmo'])),
      undo: () => S.undo(), undo2: () => S.undo(), redo: () => S.redo(),

      /* ---- o que entrou na v3 ---- */
      // chefe com mais de um turno; iniciativa; entradas avulsas
      tokTurns: () => A.tokenTurns(pick(S.scene().tokens), pick([1, 2, 2, 3, 4, 0, 7])),
      tokIni: () => { const t = pick(S.scene().tokens); S.tx('Iniciativa do token', () => S.upd('tokens', t.id, { ini: pick([0, 3, -2, 12, 99, -99]) })); },
      turnRemove: () => { const l = S.scene().turn.list; if (l.length > 1) A.turnRemove(pick(l).id); },
      turnLoose: () => A.turnLoose(pick(['Armadilha', 'Reforço', 'Desabamento']), pick([0, 2, -4, 150, NaN]), pick([1, 1, 2, 3, 9])),
      turnRoll: () => {
        const tn = S.scene().turn, cur = tn.cur, ids = tn.list.filter(() => rnd() < 0.6).map(e => e.id);
        const res = A.turnRoll(ids);
        if (res.length !== ids.length) problems.push(`turnRoll: pedi ${ids.length} rolagens, vieram ${res.length}`);
        if (res.some(r => r.total !== r.d + r.bonus || r.d < 1 || r.d > 20)) problems.push('turnRoll: resultado que não fecha: ' + JSON.stringify(res));
        if (ids.length && !turnSorted()) problems.push('turnRoll: a lista não ficou em ordem de iniciativa');
        if (S.scene().turn.cur !== cur) problems.push('turnRoll: rolar mudou de quem é a vez');
      },
      turnType: () => { const l = S.scene().turn.list; if (l.length) { const id = pick(l).id, v = pick([20, 7, 0, -3, 15.5]); A.turnPatch(x => { const y = x.list.find(z => z.id === id); if (y) { y.init = v; y.roll = null; } }, 'Iniciativa'); } },
      turnMove: () => A.turnPatch(x => { const i = Math.floor(rnd() * x.list.length); if (i > 0) { const [m] = x.list.splice(i, 1); x.list.splice(i - 1, 0, m); } }),
      // aberturas: qualquer uma abre e fecha; novas por cima de paredes; mexer e apagar
      opening: () => { const d = S.scene().walls.filter(w => w.k !== 'wall'); if (d.length) A.toggleDoor(pick(d)); },
      icon: () => { const sp = u.doorSpots(S.scene()); if (sp.length) A.toggleDoor(pick(sp).w); },
      wallAdd: () => {
        const sc = S.scene(), base = sc.walls.length && rnd() < 0.7 ? pick(sc.walls) : null;
        let x1, y1, x2, y2;
        if (base) { const a = rnd() * 0.6, b = a + 0.1 + rnd() * 0.3, off = pick([0, 0, 0, 2, 5, -3]); x1 = base.x1 + (base.x2 - base.x1) * a + off; y1 = base.y1 + (base.y2 - base.y1) * a; x2 = base.x1 + (base.x2 - base.x1) * b + off; y2 = base.y1 + (base.y2 - base.y1) * b; }
        else { x1 = Math.round(rnd() * 28) * 64; y1 = Math.round(rnd() * 18) * 64; x2 = x1 + pick([0, 64, 128, -64]); y2 = y1 + pick([0, 64, 128]); }
        const k = pick(['wall', 'door', 'window', 'veil']);
        S.tx('Parede', () => S.add('walls', { id: 'w_' + Math.floor(rnd() * 1e9), k, x1, y1, x2, y2, open: k !== 'wall' && rnd() < 0.4, locked: rnd() < 0.2, secret: k === 'door' && rnd() < 0.2 }));
      },
      wallDel: () => { const sc = S.scene(); if (sc.walls.length > 4) S.tx('Apagar', () => S.del('walls', pick(sc.walls).id)); },
      wallMove: () => { const sc = S.scene(); if (sc.walls.length) { const w = pick(sc.walls), d = pick([1, 3, 6, -2, 64]); S.tx('Mover parede', () => S.upd('walls', w.id, { x1: w.x1 + d, x2: w.x2 + d })); } },
      tokMove: () => { const sc = S.scene(), t = pick(sc.tokens); S.tx('Mover', () => S.upd('tokens', t.id, { x: Math.floor(rnd() * (sc.cols - 1)) * sc.cell, y: Math.floor(rnd() * (sc.rows - 1)) * sc.cell })); },
      tokNear: () => { const sc = S.scene(), c = sc.walls.filter(w => w.k === 'veil'), t = pick(sc.tokens); if (c.length) { const w = pick(c); S.tx('Mover', () => S.upd('tokens', t.id, { x: Math.max(0, (w.x1 + w.x2) / 2 + pick([-96, -64, -32, 0, 32, 64]) - 32), y: Math.max(0, (w.y1 + w.y2) / 2 + pick([-96, -64, -32, 0, 32, 64]) - 32) })); } },
      tokVis: () => { const t = pick(S.scene().tokens); S.tx('Visão', () => S.upd('tokens', t.id, pick([{ vis: { on: true, range: 0, dark: 0 } }, { vis: { on: false, range: 0, dark: 0 } }, { vis: { on: true, range: 4, dark: 2 } }, { owner: 'jg_dalmo' }, { owner: null }, { size: pick([0.5, 1, 2, 3]) }]))); },
      // véu do mestre: liga e desliga, com seleção de nenhum, um ou vários tokens; névoa da cena
      veil: () => { u.App.showVision = !u.App.showVision; u.Vision.invalidate(); u.Render.request(); },
      sel: () => {
        const sc = S.scene(), n = pick([0, 1, 1, 2]), list = sc.tokens.filter(() => rnd() < 0.3).slice(0, n).map(t => ({ c: 'tokens', id: t.id }));
        if (rnd() < 0.35 && sc.effects.length) list.push({ c: 'effects', id: pick(sc.effects).id });      // seleção mista: token + efeito
        if (rnd() < 0.15 && sc.walls.length) list.push({ c: 'walls', id: pick(sc.walls).id });
        u.setSel(list);
      },
      fog: () => S.tx('Névoa', () => S.scn({ fog: pick([{ dynamic: true, manual: false, explored: true, shared: true }, { dynamic: true, manual: true, explored: false, shared: false }, { dynamic: false, manual: false, explored: false, shared: true }, { dynamic: false, manual: true, explored: false, shared: true }]) })),
      // área retangular; aplicar guardando a configuração; reaplicar
      fxRect: () => { const sc = S.scene(), dur = Math.floor(rnd() * 3); S.tx('Soltar efeito', () => S.add('effects', { id: 'fx_' + Math.floor(rnd() * 1e9), fx: pick(['fogo', 'gelo', 'raio', 'veneno']), k: 'rect', x: rnd() * 1800, y: rnd() * 1200, r: 2, w: 1, ang: 60, dir: pick([0, 15, 45, 90, 200, 359]), rw: pick([0.5, 1, 3, 7.5, 20]), rh: pick([0.5, 2, 4, 12]), pow: 0.8, token: rnd() < 0.3 ? pick(sc.tokens).id : null, gm: rnd() < 0.2, by: null, seed: 3, dur, dur0: dur, at: null, apply: null })); },
      fxShape: () => { const sc = S.scene(); if (sc.effects.length) { const e = pick(sc.effects); S.tx('Forma do efeito', () => S.upd('effects', e.id, pick([{ k: 'rect', rw: e.rw > 0 ? e.rw : 3, rh: e.rh > 0 ? e.rh : 2 }, { k: 'circ' }, { k: 'cone' }, { k: 'line' }, { dir: Math.floor(rnd() * 360) }, { x: rnd() * 1800, y: rnd() * 1200 }]))); } },
      areaKeep: () => {
        const sc = S.scene(); if (!sc.effects.length) return;
        const e = pick(sc.effects), inside = u.tokensIn(u.FX.geom(e, sc).path, sc), skip = inside.filter(() => rnd() < 0.25).map(t => t.id);
        const rows = inside.filter(t => !skip.includes(t.id)).map(t => ({ t, half: rnd() < 0.3 }));
        const text = pick(['8', '+6', '', '-1', 'zz', '2,5', '0']), cond = rnd() < 0.4 ? { id: pick(CONDS), n: Math.floor(rnd() * 3), d: Math.floor(rnd() * 3) } : null, had = JSON.stringify(e.apply);
        const n = A.areaApply(rows, pick(['Vida', 'SP', 'Nada']), text, cond, { id: e.id, skip }, 'Aplicar em área');
        const real = !!cond || (/^[+-]?\d+([.,]\d+)?$/.test(text) && Number(text.replace(',', '.')) !== 0), now = S.get('effects', e.id).apply;
        if (n >= 0 && real && !(now && now.amt === (text === '0' ? '' : text) && JSON.stringify(now.skip) === JSON.stringify(skip))) problems.push(`areaApply: não guardou a configuração no efeito ("${text}" → ${JSON.stringify(now)})`);
        if ((n < 0 || !real) && JSON.stringify(now) !== had) problems.push(`areaApply: sem nada a aplicar ("${text}"), mexeu no que estava guardado`);
      },
      fxReapply: () => {
        const sc = S.scene(), withCfg = sc.effects.filter(e => e.apply); if (!sc.effects.length) return;
        const e = withCfg.length && rnd() < 0.8 ? pick(withCfg) : pick(sc.effects), cfg = JSON.stringify(e.apply);
        const r = A.fxReapply(e);
        if (!e.apply && r !== null) problems.push('fxReapply: efeito sem configuração devolveu ' + JSON.stringify(r));
        if (e.apply && (JSON.stringify(e.apply) !== cfg)) problems.push('fxReapply: mexeu na configuração guardada');
        if (r && (r.n > r.inside || r.n < 0)) problems.push('fxReapply: contagem estranha ' + JSON.stringify(r));
      },
      fxDel: () => { const sc = S.scene(); if (sc.effects.length > 2) { u.setSel([{ c: 'effects', id: pick(sc.effects).id }]); A.deleteSel(); } },

      /* ---- pela interface, como o mestre faz ---- */
      uiTurn: () => { panel('turn'); const bs = $$('#side .turn button, #side .tab-body .btn, #side .turn-head button').filter(b => !b.disabled); if (bs.length) pick(bs).click(); modalStep(); },
      uiTurnType: () => { panel('turn'); const ins = $$('#side .turn input'); if (ins.length) type(pick(ins), pick(['18', '3', '-2', '', '7.5', '250'])); },
      uiTok: () => { if (!selOne('tokens', pick(S.scene().tokens))) return; panel('sel'); const what = pick(['plus', 'minus', 'ini', 'add']); if (what === 'ini') type($('#tk-ini'), pick(['5', '-3', '0', '200', '', '2.6'])); else press($(what === 'add' ? '#tk-toturn' : '#tk-turns-' + what)); },
      uiFx: () => {
        const sc = S.scene(); if (!selOne('effects', sc.effects.length ? pick(sc.effects) : null)) return;
        panel('sel');
        const what = pick(['re', 're', 'apply', 'rw', 'rh', 'shape']);
        if (what === 're') press($('#fx-reapply')); else if (what === 'apply') { press($('#fx-apply')); modalStep(); }
        else if (what === 'shape') { const bs = $$('#side .seg-b').filter(b => !b.disabled); if (bs.length) pick(bs).click(); }
        else type($('#fx-' + what), pick(['0.5', '3', '7.5', '0', '99', '', '-2']));
      },
      uiFxTab: () => { panel('fx'); const bs = $$('#side .list button').filter(b => !b.disabled); if (bs.length) pick(bs).click(); modalStep(); },
      uiWall: () => { const sc = S.scene(); if (!selOne('walls', sc.walls.length ? pick(sc.walls) : null)) return; panel('sel'); const bs = $$('#side .seg-b, #side #wl-open, #side #wl-lock').filter(b => !b.disabled); if (bs.length) pick(bs).click(); },
      uiVeil: () => { u.UI.renderAll(); press($('#veilOff')); },
      uiMenu: () => { const sc = S.scene(), e = sc.effects.length ? pick(sc.effects) : null; if (!e) return; const g = u.FX.geom(e, sc); u.UI.contextMenu({ x: g.cx, y: g.cy }, 200, 200); const it = $$('.menu .menu-i').filter(b => !b.disabled && /Reaplicar|Aplicar/.test(b.textContent)); if (it.length) pick(it).click(); u.UI.closeMenus(); modalStep(); },
    };
    const noStepCheck = new Set(['undo', 'undo2', 'redo']);
    const names = Object.keys(ops);
    let thrown = null, frames = 0, visChecks = 0;
    // Uma amostra pequena das camadas de visão (névoa, véu, escuridão), para comparar antes e depois de refazer a conta.
    const tiny = document.createElement('canvas'); tiny.width = 48; tiny.height = 32;
    const tg = tiny.getContext('2d', { willReadFrequently: true });
    const layers = () => ['fog', 'veil', 'dark'].map(k => { const c = u.Vision.out[k]; if (!c) return null; tg.clearRect(0, 0, 48, 32); tg.drawImage(c, 0, 0, 48, 32); return tg.getImageData(0, 0, 48, 32).data; });
    const differ = (a, b) => { if (!a !== !b) return 9999; if (!a) return 0; let n = 0; for (let i = 3; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) > 48) n++; return n; };

    // A visão que está valendo é a mesma que sairia de uma conta feita agora, do zero? (névoa, véu e escuridão)
    const visionFresh = label => {
      const sc = S.scene();
      if (!(sc.fog.dynamic || sc.fog.manual || sc.light !== 'claro')) return;
      if (u.Vision.isDirty()) u.Vision.update(sc, u.App.viewer);             // é o que o próximo quadro faria
      const a = layers(); u.Vision.invalidate(); u.Vision.update(sc, u.App.viewer); const b = layers();
      const d = a.map((x, j) => differ(x, b[j]));
      if (d.some(x => x > 6)) problems.push(`${label}: visão desatualizada (névoa/véu/escuridão: ${d.join('/')} pontos diferentes)`);
      visChecks++;
    };
    for (let i = 0; i < STEPS && !thrown; i++) {
      const name = pick(names);
      counts[name] = (counts[name] || 0) + 1;
      const label = `passo ${i} (${name})`;
      try {
        const before = snap(); commits = 0;
        ops[name]();
        if ($('.modal')) u.UI.closeModal();
        u.UI.renderAll();                 // o que a mesa faz depois de qualquer ação: arruma a seleção e redesenha os painéis
        check(label);
        visionFresh(label);
        if (!noStepCheck.has(name)) {
          // cada ação é um passo só de desfazer, e desfazer devolve a cena exatamente como estava
          const n = commits, after = snap();
          if (n > 1) problems.push(`${label}: virou ${n} passos de desfazer`);
          if (n === 0 && after !== before) problems.push(`${label}: a cena mudou sem passar pelo desfazer`);
          if (n >= 1) {
            for (let j = 0; j < n; j++) u.Tools.undo();
            if (snap() !== before) problems.push(`${label}: desfazer não devolveu a cena como estava`);
            check(label + ', desfeito');
            visionFresh(label + ', desfeito');
            for (let j = 0; j < n; j++) u.Tools.redo();
            if (snap() !== after) problems.push(`${label}: refazer não repetiu a ação`);
            visionFresh(label + ', refeito');
          }
        }
      } catch (e) { thrown = `${label}: ${e.message}\n${(e.stack || '').split('\n').slice(0, 5).join('\n')}`; }
      if (problems.length > 8) break;
      if (i % 20 === 0) { await new Promise(r => requestAnimationFrame(r)); frames++; }
    }
    u.UI.setViewer('gm'); u.UI.renderAll();
    await new Promise(r => setTimeout(r, 300));
    // desfaz tudo o que der: a cena tem de continuar coerente até o começo
    let undone = 0;
    try { while (S.canUndo() && undone < 3000) { S.undo(); undone++; if (undone % 50 === 0) check('desfazendo ' + undone); } check('depois de desfazer tudo'); }
    catch (e) { thrown = thrown || 'desfazendo: ' + e.message; }
    u.UI.renderAll();
    await new Promise(r => setTimeout(r, 300));
    if (u.Render.stats.fail) problems.push(`o desenho do mapa falhou ${u.Render.stats.fail} vez(es)`);
    return { thrown, problems: problems.slice(0, 10), undone, tokens: S.scene().tokens.length, same: S.scene() === sc0, counts, frames, visChecks };
  }, [SEED, STEPS]);
  console.log(JSON.stringify({ thrown: out.thrown, problems: out.problems, undone: out.undone, tokens: out.tokens, frames: out.frames, visChecks: out.visChecks }, null, 1));
  const bad = !!out.thrown || out.problems.length > 0 || t.errs.length > 0;
  if (t.errs.length) console.log('ERROS no console:\n' + t.errs.slice(0, 10).join('\n'));
  if (process.argv.includes('--counts')) console.log(JSON.stringify(out.counts));
  console.log(bad ? `FALHOU (semente ${SEED})` : `ok: ${STEPS} ações aleatórias sem exceção nem estado incoerente`);
  await t.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
