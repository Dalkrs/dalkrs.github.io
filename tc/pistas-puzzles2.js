/* Tiny Cats · os puzzles do lote 209 na tela, parte 1 (lógica, dedução e palavras), registrados em TC.pistasUI.
   Como os de antes: cada lance vai pelo ctx.jogar; a tela é pintada de novo a cada mudança (data-k em tudo que se
   mexe). A conta mora em tc/escudo-puzzles2.js (TC.escudo.mais2). */
(() => {
  'use strict';
  const E = window.TC.escudo, X = E && E.mais2, PUI = window.TC.pistasUI, U = window.TC.dom;
  if (!E || !X || !PUI || !PUI.registrarCorpo) return;
  const { h, svg } = U;
  const { lance, tentativa, erroDe, fechado, SIMB } = PUI.kit;
  const reg = PUI.registrarCorpo;
  const intOk = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  const lista = (v, a, b) => (Array.isArray(v) ? v.filter(x => intOk(x, a, b)) : []);
  const seq = n => [...Array(n).keys()];
  const aviso = (ctx, t) => { if (ctx.aviso) ctx.aviso(t); };
  const trocaChar = (s, i, c) => s.slice(0, i) + c + s.slice(i + 1);
  const chaveP = s => E.sem(s).toUpperCase().replace(/[^A-Z]/g, '');
  // o modo de marcar (pintar ou ✕) de cada puzzle na tela, guardado aqui (não vai para a mesa)
  const MODO = new Map();
  const modoDe = ctx => MODO.get(ctx.chave) || 'p';
  const modos = (ctx, f, rotulos) => (f ? null : h('div', { class: 'seg pz-modo', role: 'group', 'aria-label': 'Marcar' }, rotulos.map(([v, t]) => h('button', { type: 'button', 'data-k': ctx.chave + 'modo' + v, 'aria-pressed': String(modoDe(ctx) === v), onclick: () => { MODO.set(ctx.chave, v); if (ctx.escolher) ctx.escolher(ctx.sel == null ? null : ctx.sel); else if (ctx.repintar) ctx.repintar(); } }, t))));
  const grade = (n, cels, cls, larg) => h('div', { class: 'gz ' + (cls || ''), style: { gridTemplateColumns: 'repeat(' + n + ', minmax(0, 1fr))', width: 'min(100%, ' + n * (larg || 40) + 'px)' } }, cels);
  const conferir = (ctx, f, fn, txt) => (f ? null : h('div', { class: 'row', style: { justifyContent: 'center' } }, h('button', { type: 'button', class: 'btn pri', 'data-k': ctx.chave + 'ok', onclick: fn }, txt || 'Conferir')));
  // as pistas, que se riscam com um clique (riscar vai para a mesa: todo mundo vê)
  function pistasRiscaveis(jg, ctx, pis, f) {
    const r = new Set(lista(jg.estado.r, 0, 99));
    return h('ol', { class: 'pz-pistas' }, pis.map((t, k) => h('li', null, h('button', { type: 'button', class: 'pz-pis' + (r.has(k) ? ' riscada' : ''), 'data-k': ctx.chave + 'p' + k, disabled: f,
      onclick: () => lance(jg, ctx, { r: r.has(k) ? [...r].filter(x => x !== k) : [...r, k] }, r.has(k) ? 'tirou o risco de uma pista' : 'riscou uma pista') }, t))));
  }

  /* ---------------- quadro de dedução ---------------- */
  reg('deducao', (jg, ctx) => {
    const p = jg.pub, f = fechado(jg, ctx), m = X.dedMarcas(jg), trav = new Set(lista(jg.estado.d, 0, 9999).map(i => Math.floor(i / p.n)));
    const marcar = (c, i, v, dir) => {
      const k = X.dedIdx(p, c, i, v), atual = m[k];
      const prox = dir ? (atual === 'x' ? '.' : 'x') : atual === '.' ? 'x' : atual === 'x' ? 'v' : '.';
      let mm = trocaChar(m, k, prox);
      // ✓: o resto da linha e da coluna vira ✕
      if (prox === 'v') for (let w = 0; w < p.n; w++) { if (w !== v && mm[X.dedIdx(p, c, i, w)] === '.') mm = trocaChar(mm, X.dedIdx(p, c, i, w), 'x'); if (w !== i && mm[X.dedIdx(p, c, w, v)] === '.') mm = trocaChar(mm, X.dedIdx(p, c, w, v), 'x'); }
      lance(jg, ctx, { m: mm }, prox === 'v' ? 'marcou um ✓' : prox === 'x' ? 'marcou um ✕' : 'apagou uma marca');
    };
    const quadros = p.cats.map((cat, c) => h('div', { class: 'dd-q' },
      h('div', { class: 'dd-tab', style: { gridTemplateColumns: 'minmax(64px, auto) repeat(' + p.n + ', minmax(34px, 1fr))' } },
        h('span', { class: 'dd-cat', text: cat.n }), cat.v.map(v => h('span', { class: 'dd-col', text: v })),
        p.pes.map((nm, i) => [h('span', { class: 'dd-nome', text: nm }), seq(p.n).map(v => {
          const k = X.dedIdx(p, c, i, v), ch = m[k], tr = trav.has(c * p.n + i);
          return h('button', { type: 'button', class: 'dd-c ' + (ch === 'v' ? 'sim' : ch === 'x' ? 'nao' : '') + (tr ? ' travada' : ''), 'data-k': ctx.chave + 'm' + k, disabled: f || tr,
            'aria-label': nm + ', ' + cat.v[v] + (ch === 'v' ? ': sim' : ch === 'x' ? ': não' : ''), onclick: () => marcar(c, i, v), oncontextmenu: ev => { ev.preventDefault(); if (!f && !tr) marcar(c, i, v, true); } }, ch === 'v' ? '✓' : ch === 'x' ? '✕' : '');
        })]))));
    return [
      h('div', { class: 'dd' }, quadros),
      h('p', { class: 'pz-conta', text: 'Clique: ✕ (não é). De novo: ✓ (é esse). Botão direito: só o ✕. Um ✓ em cada linha.' }),
      h('div', { class: 'pz-blc' }, h('div', { class: 'cd-rot', text: 'As pistas (clique para riscar)' }), pistasRiscaveis(jg, ctx, p.pis, f)),
      conferir(ctx, f, () => { const pr = E.provaDoEstado(jg, 'conferir'); if (pr == null) { aviso(ctx, 'Ponham um ✓ em cada linha de cada quadro.'); return; } tentativa(jg, ctx, pr, {}, 'conferiu o quadro, e não era', {}, 'resolveu o quadro'); }),
    ];
  });

  /* ---------------- guardas que mentem ---------------- */
  const ELMO = '<path d="M5 13a7 7 0 0 1 14 0v3H5z"/><path d="M12 6V3M9 13v3M15 13v3"/><path d="M4 16h16v2H4z"/>';
  const PORTA = '<path d="M6 21V5a6 6 0 0 1 12 0v16"/><path d="M4 21h16"/><circle cx="14.5" cy="13" r=".9"/>';
  reg('guardas', (jg, ctx) => {
    const p = jg.pub, f = fechado(jg, ctx), dr = new Set(lista(jg.estado.dr, 0, 9));
    return [
      p.umMente ? h('p', { class: 'pz-dica', text: 'Um deles sempre mente; o outro sempre diz a verdade.' }) : h('p', { class: 'pz-dica', text: 'Cada um ou sempre diz a verdade, ou sempre mente. Não se sabe quantos mentem.' + (p.ditos.some(l => l.some(t => /mesmo tipo/.test(t))) ? ' “Do mesmo tipo”: os dois dizem a verdade, ou os dois mentem.' : '') }),
      h('div', { class: 'gd' }, p.gs.map((nm, k) => h('div', { class: 'gd-g', 'data-k': ctx.chave + 'g' + k },
        h('div', { class: 'gd-cab' }, svg(26, ELMO, '1.7'), h('b', { text: nm })),
        p.ditos[k].map(t => h('p', { class: 'gd-fala', text: '“' + t + '”' })),
        p.papeis ? h('div', { class: 'seg', role: 'group', 'aria-label': 'O que ' + nm + ' é' }, [['v', 'Verdade'], ['m', 'Mente']].map(([v, t]) => h('button', { type: 'button', 'data-k': ctx.chave + 'r' + k + (v === 'm' ? 'm' : ''), 'aria-pressed': String(X.papelGrd(jg, k) === v), disabled: f || dr.has(k),
          onclick: () => lance(jg, ctx, { ['r' + k]: X.papelGrd(jg, k) === v ? null : v }, 'marcou ' + nm) }, t))) : null,
        dr.has(k) ? h('small', { class: 'gd-rev', text: 'Revelado pelo mestre' }) : null))),
      h('div', { class: 'gd-portas' }, p.ps.map((nm, d) => h('button', { type: 'button', class: 'gd-porta', 'data-k': ctx.chave + 'porta' + d, disabled: f,
        onclick: () => { const pr = E.provaDoEstado(jg, { porta: d }); if (pr == null) { aviso(ctx, 'Antes de abrir, marquem quem diz a verdade e quem mente.'); return; } tentativa(jg, ctx, pr, {}, 'abriu a porta ' + nm + ', e não era', {}, 'abriu a porta segura'); } },
        svg(30, PORTA, '1.6'), h('span', { text: 'Abrir a porta ' + nm })))),
    ];
  });

  /* ---------------- nonograma ---------------- */
  reg('nonograma', (jg, ctx) => {
    const p = jg.pub, n = p.n, f = fechado(jg, ctx), pp = X.nonoP(jg), trav = new Set(lista(jg.estado.d, 0, n * n));
    const okL = y => X.blocos(seq(n).map(x => X.valNono(jg, y * n + x) === '1')).join(',') === p.lin[y].join(',');
    const okC = x => X.blocos(seq(n).map(y => X.valNono(jg, y * n + x) === '1')).join(',') === p.col[x].join(',');
    const tocar = (i, x) => {
      const a = pp[i], modo = x ? 'x' : modoDe(ctx);
      const nv = modo === 'x' ? (a === 'x' ? '.' : 'x') : a === '1' ? '.' : '1';
      lance(jg, ctx, { p: trocaChar(pp, i, nv) }, nv === '1' ? 'pintou uma casa' : nv === 'x' ? 'marcou um ✕' : 'apagou uma casa');
    };
    const cel = [h('div', { class: 'nn-0' })];
    for (let x = 0; x < n; x++) cel.push(h('div', { class: 'nn-cp' + (okC(x) ? ' ok' : ''), 'data-k': ctx.chave + 'k' + x }, (p.col[x].length ? p.col[x] : [0]).map(v => h('span', { text: String(v) }))));
    for (let y = 0; y < n; y++) {
      cel.push(h('div', { class: 'nn-lp' + (okL(y) ? ' ok' : ''), 'data-k': ctx.chave + 'l' + y }, (p.lin[y].length ? p.lin[y] : [0]).map(v => h('span', { text: String(v) }))));
      for (let x = 0; x < n; x++) {
        const i = y * n + x, dada = p.dadas[i] !== '.', v = dada ? (p.dadas[i] === '1' ? '1' : 'x') : pp[i];
        cel.push(h('button', { type: 'button', class: 'nn-c' + (v === '1' ? ' pint' : v === 'x' ? ' xis' : '') + (dada || trav.has(i) ? ' dada' : '') + (x % 5 === 4 && x < n - 1 ? ' div5' : '') + (y % 5 === 4 && y < n - 1 ? ' div5b' : ''),
          'data-k': ctx.chave + 'c' + i, disabled: f || dada || trav.has(i), 'aria-label': 'Casa ' + (x + 1) + ', ' + (y + 1), onclick: () => tocar(i), oncontextmenu: ev => { ev.preventDefault(); if (!f && !dada && !trav.has(i)) tocar(i, true); } }));
      }
    }
    return [
      modos(ctx, f, [['p', 'Pintar'], ['x', 'Marcar ✕']]),
      h('div', { class: 'nn', style: { gridTemplateColumns: 'auto repeat(' + n + ', minmax(0, 1fr))', width: 'min(100%, ' + (n * 34 + 70) + 'px)' } }, cel),
      h('p', { class: 'pz-conta', text: 'Os números ficam verdes quando a linha ou a coluna bate.' }),
    ];
  });

  /* ---------------- somas de runas ---------------- */
  reg('somas', (jg, ctx) => {
    const p = jg.pub, f = fechado(jg, ctx), trav = new Set(lista(jg.estado.d, 0, 20));
    const soma = cs => { const v = cs.map(i => X.valSoma(jg, p.g[i])); return v.every(Boolean) ? v.reduce((a, b) => a + b, 0) : null; };
    const alvo = (s, cs, k) => { const a = soma(cs); return h('div', { class: 'sm-s' + (s == null ? ' oculta' : a == null ? '' : a === s ? ' ok' : ' ruim'), 'data-k': ctx.chave + k }, h('b', { text: s == null ? '?' : String(s) }), a != null ? h('small', { text: '= ' + a }) : null); };
    const cel = [];
    for (let y = 0; y < p.h; y++) {
      for (let x = 0; x < p.w; x++) { const r = p.g[y * p.w + x], v = X.valSoma(jg, r); cel.push(h('div', { class: 'sm-c' }, h('span', { class: 'runa', text: p.runas[r] }), v ? h('small', { text: String(v) }) : null)); }
      cel.push(alvo(p.lin[y], seq(p.w).map(x => y * p.w + x), 'sl' + y));
    }
    for (let x = 0; x < p.w; x++) cel.push(alvo(p.col[x], seq(p.h).map(y => y * p.w + x), 'sc' + x));
    cel.push(h('div'));
    return [
      h('div', { class: 'sm', style: { gridTemplateColumns: 'repeat(' + (p.w + 1) + ', minmax(0, 1fr))', width: 'min(100%, ' + (p.w + 1) * 52 + 'px)' } }, cel),
      h('div', { class: 'cd-rot', text: 'A chave: quanto vale cada runa (de 1 a ' + p.vmax + ', sem repetir)' }),
      h('div', { class: 'sm-chave' }, p.runas.map((s, i) => { const dada = (p.dadas || {})[i] != null || trav.has(i); return h('label', { class: 'sm-k' + (dada ? ' dada' : '') }, h('span', { class: 'runa', text: s }),
        h('select', { class: 'in', 'data-k': ctx.chave + 'v' + i, disabled: f || dada, value: String(X.valSoma(jg, i) || ''), onchange: ev => { const v = Number(ev.target.value) || null; lance(jg, ctx, { ['v' + i]: v }, v ? 'deu ' + v + ' a uma runa' : 'apagou uma runa'); } },
          h('option', { value: '', text: '—' }), seq(p.vmax).map(v => h('option', { value: String(v + 1), text: String(v + 1) })))); })),
      conferir(ctx, f, () => { const pr = E.provaDoEstado(jg, 'conferir'); if (pr == null) { aviso(ctx, 'Deem um valor a cada runa.'); return; } tentativa(jg, ctx, pr, {}, 'conferiu as runas, e não era', {}, 'acertou o valor das runas'); }),
    ];
  });

  /* ---------------- quadrado mágico ---------------- */
  reg('magico', (jg, ctx) => {
    const p = jg.pub, n = p.n, f = fechado(jg, ctx), trav = new Set(lista(jg.estado.d, 0, 99)), M = n * (n * n + 1) / 2;
    const val = i => X.valMag(jg, i);
    const soma = cs => (cs.every(i => val(i)) ? cs.reduce((a, i) => a + val(i), 0) : null);
    const s = (cs, k) => { const v = soma(cs); return h('div', { class: 'mg-s' + (v == null ? '' : v === M && p.M != null ? ' ok' : ''), 'data-k': ctx.chave + k, text: v == null ? '·' : String(v) }); };
    const usados = new Set(seq(n * n).map(val).filter(Boolean)), cel = [];
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x, dada = !!p.dadas[i];
        cel.push(dada ? h('div', { class: 'mg-c dada', text: String(p.dadas[i]) }) : h('input', { class: 'mg-c', 'data-k': ctx.chave + 'c' + i, inputmode: 'numeric', maxlength: 2, value: val(i) ? String(val(i)) : '', disabled: f || trav.has(i), autocomplete: 'off', 'aria-label': 'Casa ' + (x + 1) + ', ' + (y + 1),
          onchange: ev => { const v = Number(ev.target.value.trim()); if (ev.target.value.trim() && !intOk(v, 1, n * n)) { aviso(ctx, 'De 1 a ' + n * n + '.'); ev.target.value = ''; return; } lance(jg, ctx, { ['c' + i]: v || null }, v ? 'pôs o ' + v : 'apagou um número'); } }));
      }
      cel.push(s(seq(n).map(x => y * n + x), 'sl' + y));
    }
    for (let x = 0; x < n; x++) cel.push(s(seq(n).map(y => y * n + x), 'sc' + x));
    cel.push(s(seq(n).map(k => k * n + k), 'sd'));
    return [
      p.M != null ? h('p', { class: 'pz-dica', text: 'Cada linha, coluna e diagonal tem que dar ' + p.M + '.' }) : h('p', { class: 'pz-dica', text: 'Descubram a soma: é a mesma em todas as linhas, colunas e diagonais.' }),
      h('div', { class: 'mg', style: { gridTemplateColumns: 'repeat(' + (n + 1) + ', minmax(0, 1fr))', width: 'min(100%, ' + (n + 1) * 50 + 'px)' } }, cel),
      h('div', { class: 'mg-faltam' }, h('span', { class: 'cd-rot', text: 'Faltam: ' }), seq(n * n).map(v => v + 1).filter(v => !usados.has(v)).map(v => h('span', { class: 'mg-f', text: String(v) }))),
    ];
  });

  /* ---------------- conta cifrada ---------------- */
  reg('contacifrada', (jg, ctx) => {
    const p = jg.pub, f = fechado(jg, ctx), trav = new Set(lista(jg.estado.dd, 0, 20)), L = Math.max(p.res.length, ...p.ops.map(o => o.length));
    const linha = (l, sinal) => h('div', { class: 'cc-lin' }, h('span', { class: 'cc-sinal', text: sinal || '' }), seq(L - l.length).map(() => h('span', { class: 'cc-r vazio' })),
      l.map(r => { const v = X.valCC(jg, r); return h('span', { class: 'cc-r' }, h('span', { class: 'runa', text: p.runas[r] }), h('small', { text: v >= 0 ? String(v) : '·' })); }));
    return [
      h('div', { class: 'cc-conta', 'data-k': ctx.chave + 'conta' }, p.ops.map((o, k) => linha(o, k === p.ops.length - 1 ? '+' : '')), h('div', { class: 'cc-traco' }), linha(p.res, '=')),
      h('div', { class: 'cd-rot', text: 'Cada runa é um algarismo de 0 a 9 (runas diferentes, algarismos diferentes)' }),
      h('div', { class: 'sm-chave' }, p.runas.map((s, i) => { const dada = (p.dadas || {})[i] != null || trav.has(i); return h('label', { class: 'sm-k' + (dada ? ' dada' : '') }, h('span', { class: 'runa', text: s }),
        h('select', { class: 'in', 'data-k': ctx.chave + 'd' + i, disabled: f || dada, value: X.valCC(jg, i) >= 0 ? String(X.valCC(jg, i)) : '', onchange: ev => { const v = ev.target.value === '' ? null : Number(ev.target.value); lance(jg, ctx, { ['d' + i]: v }, v == null ? 'apagou uma runa' : 'deu ' + v + ' a uma runa'); } },
          h('option', { value: '', text: '—' }), seq(10).map(v => h('option', { value: String(v), text: String(v) })))); })),
      conferir(ctx, f, () => { const pr = E.provaDoEstado(jg, 'conferir'); if (pr == null) { aviso(ctx, 'Deem um algarismo a cada runa.'); return; } tentativa(jg, ctx, pr, {}, 'conferiu a conta, e não era', {}, 'decifrou a conta'); }),
    ];
  });

  /* ---------------- oito guardas ---------------- */
  const PEDRA = '<path d="M4 17l3-8 5-3 6 3 2 8z"/><path d="M9 11l3 2 3-1"/>';
  reg('guardas8', (jg, ctx) => {
    const p = jg.pub, n = p.n, f = fechado(jg, ctx), meus = lista(jg.estado.g, 0, n * n - 1), todos = new Set(X.guardasDe(jg)), conf = X.conflitosG8(jg);
    const cel = seq(n * n).map(i => {
      const x = i % n, y = Math.floor(i / n), pedra = p.pedras.includes(i), fixo = p.fixos.includes(i), g = todos.has(i);
      return h('button', { type: 'button', class: 'g8-c' + ((x + y) % 2 ? ' esc' : '') + (pedra ? ' pedra' : '') + (fixo ? ' fixo' : '') + (conf.has(i) ? ' visto' : ''), 'data-k': ctx.chave + 'g' + i, disabled: f || pedra || fixo,
        'aria-label': 'Casa ' + (x + 1) + ', ' + (y + 1) + (g ? ', com guarda' : pedra ? ', pedra' : ''),
        onclick: () => lance(jg, ctx, { g: g ? meus.filter(k => k !== i) : meus.concat(i) }, g ? 'tirou um guarda' : 'pôs um guarda') }, pedra ? svg(20, PEDRA, '1.6') : g ? svg(22, ELMO, '1.7') : null);
    });
    return [grade(n, cel, 'g8'), h('p', { class: 'pz-conta', text: todos.size + ' de ' + n + ' guardas' + (conf.size ? ' · os vermelhos se veem' : '') })];
  });

  /* ---------------- campo de armadilhas ---------------- */
  const CAV = '<path d="M12 3a7.5 7.5 0 0 0-5 13.1V20h10v-3.9A7.5 7.5 0 0 0 12 3z"/><circle cx="9" cy="11.5" r="1.6"/><circle cx="15" cy="11.5" r="1.6"/>';
  reg('campo', (jg, ctx) => {
    const p = jg.pub, n = p.n, f = fechado(jg, ctx), m = X.campoM(jg), trav = new Set(lista(jg.estado.d, 0, n * n));
    const tocar = (i, dir) => { const a = m[i], nv = dir ? (a === 'b' ? '.' : 'b') : a === '.' ? 'b' : a === 'b' ? 's' : '.'; lance(jg, ctx, { m: trocaChar(m, i, nv) }, nv === 'b' ? 'marcou uma armadilha' : nv === 's' ? 'marcou uma casa segura' : 'apagou uma marca'); };
    const marc = [...m].filter((c, i) => c === 'b' && p.nums[i] == null).length;
    const cel = seq(n * n).map(i => {
      if (p.nums[i] != null) return h('div', { class: 'cp-n n' + p.nums[i], 'data-k': ctx.chave + 'm' + i, text: p.nums[i] ? String(p.nums[i]) : '' });
      const c = m[i];
      return h('button', { type: 'button', class: 'cp-c' + (c === 'b' ? ' arm' : c === 's' ? ' seg' : '') + (trav.has(i) ? ' travada' : ''), 'data-k': ctx.chave + 'm' + i, disabled: f || trav.has(i), 'aria-label': 'Casa ' + (i % n + 1) + ', ' + (Math.floor(i / n) + 1),
        onclick: () => tocar(i), oncontextmenu: ev => { ev.preventDefault(); if (!f && !trav.has(i)) tocar(i, true); } }, c === 'b' ? svg(18, CAV, '1.7') : c === 's' ? '·' : null);
    });
    return [grade(n, cel, 'cp'), h('p', { class: 'pz-conta', text: 'Armadilhas: ' + p.M + ' · marcadas: ' + marc + '. Clique: armadilha; de novo: segura. Botão direito: armadilha.' })];
  });

  /* ---------------- tesouro enterrado ---------------- */
  const BAU = '<path d="M4 10h16v9H4z"/><path d="M4 10a8 5 0 0 1 16 0"/><path d="M11 12h2v3h-2z"/>';
  reg('tesouro', (jg, ctx) => {
    const p = jg.pub, n = p.n, f = fechado(jg, ctx), m = X.tesM(jg), trav = new Set(lista(jg.estado.d, 0, n * n));
    const vale = i => (p.dadas[i] !== '.' ? p.dadas[i] : m[i]);
    const tocar = (i, dir) => { const a = m[i], nv = dir ? (a === 'a' ? '.' : 'a') : a === '.' ? 'b' : a === 'b' ? 'a' : '.'; lance(jg, ctx, { m: trocaChar(m, i, nv) }, nv === 'b' ? 'marcou um tesouro' : nv === 'a' ? 'marcou areia' : 'apagou uma marca'); };
    const conta = cs => cs.filter(i => vale(i) === 'b').length;
    const cel = [h('div')];
    for (let x = 0; x < n; x++) { const q = conta(seq(n).map(y => y * n + x)); cel.push(h('div', { class: 'ts-n' + (q === p.col[x] ? ' ok' : q > p.col[x] ? ' ruim' : ''), 'data-k': ctx.chave + 'cl' + x, text: String(p.col[x]) })); }
    for (let y = 0; y < n; y++) {
      const q = conta(seq(n).map(x => y * n + x));
      cel.push(h('div', { class: 'ts-n' + (q === p.lin[y] ? ' ok' : q > p.lin[y] ? ' ruim' : ''), 'data-k': ctx.chave + 'rl' + y, text: String(p.lin[y]) }));
      for (let x = 0; x < n; x++) {
        const i = y * n + x, dada = p.dadas[i] !== '.', v = vale(i);
        cel.push(h('button', { type: 'button', class: 'ts-c' + (v === 'b' ? ' bau' : v === 'a' ? ' areia' : '') + (dada || trav.has(i) ? ' dada' : ''), 'data-k': ctx.chave + 'm' + i, disabled: f || dada || trav.has(i), 'aria-label': 'Casa ' + (x + 1) + ', ' + (y + 1),
          onclick: () => tocar(i), oncontextmenu: ev => { ev.preventDefault(); if (!f && !dada && !trav.has(i)) tocar(i, true); } }, v === 'b' ? svg(18, BAU, '1.7') : null));
      }
    }
    return [
      h('div', { class: 'ts', style: { gridTemplateColumns: 'repeat(' + (n + 1) + ', minmax(0, 1fr))', width: 'min(100%, ' + (n + 1) * 38 + 'px)' } }, cel),
      h('div', { class: 'ts-frota' }, h('span', { class: 'cd-rot', text: 'Os baús: ' }), p.frota.map(len => h('span', { class: 'ts-b' }, seq(len).map(() => h('i'))))),
      h('p', { class: 'pz-conta', text: 'Clique: tesouro. De novo: areia (vazio). Os baús não se encostam, nem na diagonal.' }),
    ];
  });

  /* ---------------- palavra secreta ---------------- */
  reg('palavra', (jg, ctx) => {
    const p = jg.pub, f = fechado(jg, ctx), pal = X.palDe(jg), g = (Array.isArray(jg.estado.g) ? jg.estado.g : []).filter(x => typeof x === 'string' && x.length === p.L).slice(0, p.max);
    const rod = intOk(jg.estado.rod, 1, 999) ? jg.estado.rod : 1, d = new Set(lista(jg.estado.d, 0, 9));
    const enviar = el => {
      const k = chaveP(el.value || '');
      if (k.length !== p.L) { aviso(ctx, 'A palavra tem ' + p.L + ' letras.'); return; }
      el.value = '';
      if (E.confere(jg, k)) { tentativa(jg, ctx, k, {}, '', { g: g.concat(k) }, 'acertou a palavra'); return; }
      if (g.length + 1 >= p.max) { erroDe(ctx, ctx.jogar('errar', { g: [], rod: rod + 1, _txt: 'gastou as ' + p.max + ' tentativas (última: ' + k + ')' })); return; }
      lance(jg, ctx, { g: g.concat(k) }, 'tentou ' + k);
    };
    const linhas = seq(p.max).map(i => {
      const w = g[i], cor = w && pal ? X.corPalavra(w, pal) : null;
      return h('div', { class: 'pw-l', 'data-k': ctx.chave + 'g' + i }, seq(p.L).map(k => h('span', { class: 'pw-t' + (cor && p.modo === 'cores' ? ' ' + cor[k] : w ? ' cheia' : ''), text: w ? w[k] : '' })),
        w && cor && p.modo === 'conta' ? h('small', { class: 'pw-conta', text: cor.filter(c => c === 'v').length + ' no lugar · ' + cor.filter(c => c === 'a').length + ' fora do lugar' }) : null);
    });
    return [
      d.size ? h('div', { class: 'pw-l reveladas' }, seq(p.L).map(k => h('span', { class: 'pw-t' + (d.has(k) ? ' v' : ''), text: d.has(k) && pal ? pal[k] : '' }))) : null,
      h('div', { class: 'pw' }, linhas),
      rod > 1 ? h('p', { class: 'pz-conta', text: 'Rodada ' + rod + ' (as tentativas recomeçaram)' }) : null,
      f ? null : h('form', { class: 'an-form', onsubmit: ev => { ev.preventDefault(); enviar(ev.target.querySelector('input')); } },
        h('input', { class: 'in', 'data-k': ctx.chave + 'in', placeholder: p.L + ' letras', maxlength: 12, autocomplete: 'off', 'aria-label': 'O palpite' }),
        h('button', { type: 'submit', class: 'btn pri sm', 'data-k': ctx.chave + 'ok' }, 'Tentar')),
      h('p', { class: 'pz-conta', text: 'Tentativa ' + Math.min(g.length + 1, p.max) + ' de ' + p.max + (p.modo === 'cores' ? ' · verde: no lugar · amarelo: em outro lugar · cinza: não tem' : '') }),
    ];
  });

  /* ---------------- mensagem escondida ---------------- */
  reg('espelhada', (jg, ctx) => {
    const p = jg.pub, f = fechado(jg, ctx), tent = Array.isArray(jg.estado.tent) ? jg.estado.tent.slice(-6) : [], w = typeof jg.estado.w === 'string' ? jg.estado.w : '';
    const responder = el => {
      const v = String(el.value || '').trim(); if (!v) return;
      el.value = '';
      tentativa(jg, ctx, E.provaDoEstado(jg, v), { tent: tent.concat({ txt: v.slice(0, 40) }).slice(-6) }, 'tentou “' + v.slice(0, 40) + '”', {}, 'leu a mensagem');
    };
    return [
      h('div', { class: 'es-txt', 'data-k': ctx.chave + 'txt', text: p.txt }),
      h('p', { class: 'pz-dica', text: p.dica }),
      w ? h('p', { class: 'pz-conta', text: 'Começa com: ' + w + ' …' }) : null,
      f ? null : h('form', { class: 'an-form', onsubmit: ev => { ev.preventDefault(); responder(ev.target.querySelector('input')); } },
        h('input', { class: 'in', 'data-k': ctx.chave + 'in', placeholder: 'A mensagem (' + p.nPal + (p.nPal === 1 ? ' palavra)' : ' palavras)'), maxlength: 200, autocomplete: 'off', 'aria-label': 'A mensagem' }),
        h('button', { type: 'submit', class: 'btn pri sm', 'data-k': ctx.chave + 'ok' }, 'Conferir')),
      tent.length && !jg.resolvido ? h('div', { class: 'ch-tent' }, 'Já tentaram: ', tent.map((t, i) => h('span', { class: 'ch-t' }, (i ? ', ' : '') + '“' + t.txt + '”'))) : null,
    ];
  });

  /* ---------------- ordem dos acontecimentos ---------------- */
  reg('ordem', (jg, ctx) => {
    const p = jg.pub, f = fechado(jg, ctx), o = X.ordemDe(jg), trav = new Set(lista(jg.estado.d, 0, 9));
    const mexer = (k, d) => {
      const j = k + d; if (j < 0 || j >= p.n || trav.has(o[j]) || trav.has(o[k])) return;
      const no = o.slice(); [no[k], no[j]] = [no[j], no[k]];
      lance(jg, ctx, { o: no }, 'mudou a ordem');
    };
    return [
      h('div', { class: 'od-tit', text: p.tit }),
      h('ol', { class: 'od' }, o.map((e, k) => h('li', { class: 'od-c' + (trav.has(e) ? ' travada' : ''), 'data-k': ctx.chave + 'e' + e },
        h('span', { class: 'od-n', text: String(k + 1) }), h('span', { class: 'od-t', text: p.evs[e] }),
        h('span', { class: 'od-b' }, h('button', { type: 'button', class: 'ib', 'data-k': ctx.chave + 'up' + e, disabled: f || k === 0 || trav.has(e) || trav.has(o[k - 1]), 'aria-label': 'Subir', onclick: () => mexer(k, -1) }, '▲'),
          h('button', { type: 'button', class: 'ib', 'data-k': ctx.chave + 'dn' + e, disabled: f || k === p.n - 1 || trav.has(e) || trav.has(o[k + 1]), 'aria-label': 'Descer', onclick: () => mexer(k, 1) }, '▼'))))),
      p.falsa ? h('p', { class: 'pz-dica', text: 'Cuidado: uma das pistas é falsa.' }) : null,
      h('div', { class: 'pz-blc' }, h('div', { class: 'cd-rot', text: 'As pistas (clique para riscar)' }), pistasRiscaveis(jg, ctx, p.pis, f)),
      conferir(ctx, f, () => tentativa(jg, ctx, E.provaDoEstado(jg, 'conferir'), {}, 'conferiu a ordem, e não era', {}, 'pôs tudo na ordem')),
    ];
  });

  /* ---------------- achar as diferenças ---------------- */
  reg('diferencas', (jg, ctx) => {
    const p = jg.pub, n = p.n, f = fechado(jg, ctx), ach = new Set(X.difsAchadas(jg));
    const desenho = v => (v < 0 ? null : h('span', { class: 'df-s cor' + ((v >> 2) & 3), style: { transform: 'rotate(' + (v & 3) * 90 + 'deg)' } }, SIMB(E.ORDEM_SIMBOLOS[v >> 4])));
    const tocar = i => {
      if (ach.has(i)) return;
      const esq = p.a[i], dir = p.b[p.esp ? Math.floor(i / n) * n + (n - 1 - (i % n)) : i];
      const dirNormal = p.esp && dir >= 0 ? (dir & ~3) | ((4 - (dir & 3)) % 4) : dir;
      if (esq !== dirNormal) { lance(jg, ctx, { f: [...ach, i].sort((a, b) => a - b) }, 'achou uma diferença'); return; }
      if (E.niveisDe(jg.tipo).indexOf(jg.dif) >= 2) erroDe(ctx, ctx.jogar('errar', { _txt: 'apontou um lugar sem diferença' })); else aviso(ctx, 'Aí não tem diferença.');
    };
    const quadro = (lado, l) => grade(n, seq(n * n).map(j => { const i = lado === 'b' ? X.difPar(p, j) : j; return h('button', { type: 'button', class: 'df-c' + (ach.has(i) ? ' achada' : ''), 'data-k': ctx.chave + lado + j, disabled: f, 'aria-label': 'Casa ' + (j % n + 1) + ', ' + (Math.floor(j / n) + 1), onclick: () => tocar(i) }, desenho(l[j])); }), 'df', 32);
    return [
      h('div', { class: 'df-par', 'data-k': ctx.chave + 'quadros' }, quadro('a', p.a), quadro('b', p.b)),
      h('p', { class: 'pz-conta', text: ach.size + ' de ' + p.k + ' diferenças' + (p.esp ? ' · o quadro da direita está espelhado' : '') }),
    ];
  });
})();
