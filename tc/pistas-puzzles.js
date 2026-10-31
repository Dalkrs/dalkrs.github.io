/* Tiny Cats · os puzzles do lote 46 na tela (jogáveis), registrados em TC.pistasUI (tc/pistas-ui.js). Como os de
   antes: cada lance vai pelo ctx.jogar (o banco, na mesa; o teste, no Escudo do mestre); a tela é pintada de novo a
   cada mudança (data-k em tudo que se mexe). A conta de cada puzzle mora em tc/escudo-puzzles.js (TC.escudo.mais). */
(() => {
  'use strict';
  const E = window.TC.escudo, X = E.mais, PUI = window.TC.pistasUI, U = window.TC.dom;
  if (!E || !X || !PUI || !PUI.registrarCorpo) return;
  const { h, svg } = U;
  const { lance, tentativa, erroDe, fechado, SIMB, nomeSimb } = PUI.kit;
  const reg = PUI.registrarCorpo;
  const intOk = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  const lista = (v, a, b) => (Array.isArray(v) ? v.filter(x => intOk(x, a, b)) : []);
  const letra = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '').slice(-1);
  const CORES = ['#e6ab4f', '#5b8fd9', '#d4574e', '#5aa469', '#9a6ad8', '#3fb8c4', '#e07bb0'];
  const aviso = (ctx, t) => { if (ctx.aviso) ctx.aviso(t); };
  // o estado como ficaria com as mudanças (para saber se o lance resolve)
  const com = (jg, mudas) => { const e = Object.assign({}, jg.estado, mudas); for (const k of Object.keys(mudas)) if (mudas[k] === null) delete e[k]; return Object.assign({}, jg, { estado: e }); };

  /* ---------------- palavras cruzadas ---------------- */
  reg('cruzadas', (jg, ctx) => {
    const p = jg.pub, f = fechado(jg, ctx), nums = {};
    for (const e of p.ents) nums[e.y * p.w + e.x] = e.n;
    const proxima = (i, el) => {
      const raiz = el.closest('.cz'); if (!raiz) return;
      const x = i % p.w, cand = [x + 1 < p.w ? i + 1 : -1, i + p.w].find(k => k >= 0 && k < p.mask.length && p.mask[k] === '.');
      const alvo = cand != null && raiz.querySelector('[data-k="' + ctx.chave + 'c' + cand + '"]');
      if (alvo && !alvo.disabled) alvo.focus();
    };
    const celulas = [...p.mask].map((c, i) => {
      if (c !== '.') return h('div', { class: 'cz-x' });
      const dada = !!((p.dadas || {})[i] || jg.estado['d' + i]);
      return h('label', { class: 'cz-c' + (dada ? ' dada' : '') }, nums[i] ? h('span', { class: 'cz-n', text: String(nums[i]) }) : null,
        h('input', { class: 'cz-in', 'data-k': ctx.chave + 'c' + i, maxlength: 2, value: X.letraCz(jg, i), disabled: f || dada, autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Casa ' + (i + 1),
          oninput: ev => { const v = letra(ev.target.value); ev.target.value = v; lance(jg, ctx, { ['c' + i]: v || null }, v ? 'pôs ' + v + ' na grade' : 'apagou uma letra'); if (v) proxima(i, ev.target); } }));
    });
    const pistas = d => p.ents.filter(e => e.d === d).map(e => h('li', { value: e.n }, h('b', { text: e.n + '. ' }), e.dica + ' (' + e.len + ')'));
    return [
      h('div', { class: 'cz-wrap' }, h('div', { class: 'cz', style: { gridTemplateColumns: 'repeat(' + p.w + ', var(--czc))' } }, celulas)),
      h('div', { class: 'cz-dicas' }, h('div', null, h('div', { class: 'cd-rot', text: 'Na horizontal' }), h('ul', null, pistas('h'))), h('div', null, h('div', { class: 'cd-rot', text: 'Na vertical' }), h('ul', null, pistas('v')))),
    ];
  });

  /* ---------------- caça-palavras ---------------- */
  reg('caca', (jg, ctx) => {
    const p = jg.pub, f = fechado(jg, ctx), ach = X.achadasCaca(jg), sel = Number.isInteger(ctx.sel) && ctx.sel < p.n * p.n ? ctx.sel : null;
    const marcadas = new Set(), dicas = new Set(lista(jg.estado.p, 0, p.n * p.n));
    for (const [a, b] of ach) for (const i of X.linhaReta(p.n, a, b) || []) marcadas.add(i);
    const achadas = new Set(ach.map(x => x[2]));
    const tocar = i => {
      if (sel == null) { if (ctx.escolher) ctx.escolher(i); return; }
      if (ctx.escolher) ctx.escolher(null);
      if (sel === i) return;
      const w = X.palavraNaLinha(p, sel, i);
      if (w < 0) { aviso(ctx, 'Essa linha não forma nenhuma palavra da lista.'); return; }
      if (achadas.has(w)) { aviso(ctx, '“' + p.lista[w] + '” já foi achada.'); return; }
      lance(jg, ctx, { f: ach.concat([[sel, i, w]]) }, 'achou “' + p.lista[w] + '”');
    };
    return [
      h('div', { class: 'cc', style: { gridTemplateColumns: 'repeat(' + p.n + ', 1fr)' } }, [...p.grade].map((c, i) => h('button', { type: 'button', class: 'cc-l' + (marcadas.has(i) ? ' achada' : '') + (sel === i ? ' sel' : '') + (dicas.has(i) ? ' dica' : ''),
        'data-k': ctx.chave + 'g' + i, disabled: f, 'aria-label': 'Letra ' + c + ', casa ' + (i + 1), onclick: () => tocar(i), text: c }))),
      h('p', { class: 'pz-conta', text: sel == null ? 'Toque a primeira letra de uma palavra, depois a última.' : 'Agora toque a última letra.' }),
      h('ul', { class: 'cc-lista' }, p.lista.map((w, i) => h('li', { class: achadas.has(i) ? 'feita' : '', text: w }))),
    ];
  });

  /* ---------------- anagrama ---------------- */
  reg('anagrama', (jg, ctx) => {
    const p = jg.pub, f = fechado(jg, ctx), tent = Array.isArray(jg.estado.tent) ? jg.estado.tent.slice(-6) : [];
    const responder = (i, el) => {
      const v = String(el.value || '').trim(); if (!v) return;
      el.value = '';
      if (X.confereAnagrama(jg, i, v)) { lance(jg, ctx, { ['r' + i]: X.chaveP(v) }, 'acertou uma palavra'); return; }
      erroDe(ctx, ctx.jogar('errar', { tent: tent.concat({ txt: v.slice(0, 30) }).slice(-6), _txt: 'tentou “' + v.slice(0, 30) + '”' }));
    };
    return [
      h('div', { class: 'an' }, p.itens.map((it, i) => {
        const feita = jg.estado['r' + i], comeco = jg.estado['l' + i];
        return h('div', { class: 'an-it' + (feita ? ' feita' : '') },
          h('div', { class: 'an-emb' }, [...(feita || it.emb)].map(c => h('span', { class: 'an-l', text: c }))),
          it.dica && !feita ? h('small', { class: 'an-dica', text: it.dica }) : null,
          comeco && !feita ? h('small', { class: 'an-com', text: 'Começa com ' + comeco + '…' }) : null,
          feita || f ? null : h('form', { class: 'an-form', onsubmit: ev => { ev.preventDefault(); responder(i, ev.target.querySelector('input')); } },
            h('input', { class: 'in', 'data-k': ctx.chave + 'r' + i, placeholder: it.len + ' letras', maxlength: 24, autocomplete: 'off', 'aria-label': 'A palavra ' + (i + 1) }),
            h('button', { type: 'submit', class: 'btn sm', 'data-k': ctx.chave + 'ok' + i }, 'Conferir')));
      })),
      tent.length && !jg.resolvido ? h('div', { class: 'ch-tent' }, 'Já tentaram: ', tent.map((t, i) => h('span', { class: 'ch-t' }, (i ? ', ' : '') + '“' + t.txt + '”'))) : null,
    ];
  });

  /* ---------------- labirinto ---------------- */
  reg('labirinto', (jg, ctx) => {
    const p = jg.pub, f = fechado(jg, ctx), pos = X.posLab(jg), tot = p.w * p.h;
    const vis = typeof jg.estado.v === 'string' && jg.estado.v.length === tot ? jg.estado.v : '';
    const visitada = i => i === p.ini || i === pos || vis[i] === '1';
    const vista = i => !p.nevoa || visitada(i) || 'NLSO'.split('').some(d => { const n = X.passoLab(p, i, d); return n != null && visitada(n); });
    const trilha = new Set(lista(jg.estado.t, 0, tot - 1));
    const andar = dir => {
      const n = X.passoLab(p, pos, dir);
      if (n == null) { aviso(ctx, 'Uma parede.'); return; }
      const v = (vis || '0'.repeat(tot)).split(''); v[n] = '1'; v[pos] = '1';
      lance(jg, ctx, { p: n, v: v.join('') }, n === p.fim ? 'chegou à saída' : 'andou no labirinto');
    };
    const dirDe = i => 'NLSO'.split('').find(d => X.passoLab(p, pos, d) === i);
    return [
      h('div', { class: 'lb', style: { gridTemplateColumns: 'repeat(' + p.w + ', 1fr)' } }, [...Array(tot).keys()].map(i => {
        const m = X.paredesLab(p, i), ve = vista(i), d = dirDe(i);
        const cls = 'lb-c' + (ve ? '' : ' nevoa') + (m & 1 ? ' pn' : '') + (m & 2 ? ' pl' : '') + (m & 4 ? ' ps' : '') + (m & 8 ? ' po' : '') + (i === pos ? ' aqui' : '') + (i === p.fim ? ' fim' : '') + (trilha.has(i) ? ' trilha' : '');
        return h('button', { type: 'button', class: cls, 'data-k': ctx.chave + 'm' + i, disabled: f || !d, tabindex: d ? null : '-1', 'aria-label': i === pos ? 'Vocês estão aqui' : i === p.fim ? 'A saída' : 'Casa ' + (i + 1), onclick: () => d && andar(d) },
          i === pos ? h('span', { class: 'lb-eu' }) : i === p.fim && ve ? svg(16, '<path d="M5 21V4h11l-2 4 2 4H5"/>', '2') : null);
      })),
      f ? null : h('div', { class: 'lb-setas' },
        [['N', '▲', 'Para cima'], ['O', '◀', 'Para a esquerda'], ['S', '▼', 'Para baixo'], ['L', '▶', 'Para a direita']].map(([d, t, nm]) =>
          h('button', { type: 'button', class: 'ib lb-' + d, 'data-k': ctx.chave + 'ir' + d, 'aria-label': nm, disabled: X.passoLab(p, pos, d) == null, onclick: () => andar(d) }, t))),
      p.nevoa ? h('p', { class: 'pz-conta', text: 'Na névoa, só se vê por onde já passaram.' }) : null,
    ];
  });

  /* ---------------- espelhos de luz ---------------- */
  reg('espelhos', (jg, ctx) => {
    const p = jg.pub, n = p.n, f = fechado(jg, ctx), o = X.oriEsp(jg), fixos = new Set(lista(jg.estado.f, 0, 60));
    const luz = X.tracarLuz(p, o), acesas = new Set(luz.casas), chegou = luz.saida === X.chaveAlvo(p.alvo);
    const W = n + 2, cel = [];
    for (let y = -1; y <= n; y++) for (let x = -1; x <= n; x++) {
      const borda = x < 0 || y < 0 || x >= n || y >= n;
      if (borda) {
        const fonte = x === -1 && y === p.y0;
        const alvo = (p.alvo.l === 'L' && x === n && y === p.alvo.i) || (p.alvo.l === 'O' && x === -1 && y === p.alvo.i) || (p.alvo.l === 'N' && y === -1 && x === p.alvo.i) || (p.alvo.l === 'S' && y === n && x === p.alvo.i);
        cel.push(h('div', { class: 'es-b' + (fonte ? ' fonte' : '') + (alvo ? ' alvo' + (chegou ? ' aceso' : '') : '') }, fonte ? svg(20, '<circle cx="12" cy="12" r="4"/><path d="M17 12h5M12 3v2M12 19v2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>', '1.8')
          : alvo ? svg(20, '<path d="M12 3 18 9 12 21 6 9z"/><path d="M6 9h12"/>', '1.8') : null));
        continue;
      }
      const i = y * n + x, k = p.ms.indexOf(i), parede = (p.par || []).includes(i);
      if (k >= 0) {
        const barra = o[k] === '1', trav = fixos.has(k);
        cel.push(h('button', { type: 'button', class: 'es-c esp' + (acesas.has(i) ? ' luz' : '') + (trav ? ' travado' : ''), 'data-k': ctx.chave + 'e' + k, disabled: f || trav, 'aria-label': 'Espelho ' + (k + 1) + (trav ? ', travado' : ''),
          onclick: () => { const no = o.split(''); no[k] = barra ? '0' : '1'; lance(jg, ctx, { o: no.join('') }, 'girou um espelho'); } },
          svg(30, barra ? '<path d="M5 5 19 19"/>' : '<path d="M19 5 5 19"/>', '3')));
      } else cel.push(h('div', { class: 'es-c' + (parede ? ' parede' : '') + (acesas.has(i) ? ' luz' : '') }));
    }
    return [h('div', { class: 'es', style: { gridTemplateColumns: 'repeat(' + W + ', 1fr)' } }, cel),
      h('p', { class: 'pz-conta', text: chegou ? 'A luz chegou ao cristal.' : luz.saida === null ? 'A luz bate numa parede.' : 'A luz sai sem tocar o cristal.' })];
  });

  /* ---------------- ligar os fios ---------------- */
  reg('fios', (jg, ctx) => {
    const p = jg.pub, n = p.n, f = fechado(jg, ctx), tot = n * n;
    const ativo = Number.isInteger(ctx.sel) && ctx.sel < p.pares.length ? ctx.sel : null;
    const dono = {}, ponta = {};
    p.pares.forEach(([a, b], i) => { ponta[a] = i; ponta[b] = i; X.fioDe(jg, i).forEach(c => { dono[c] = i; }); });
    const mudar = mudas => lance(jg, ctx, mudas, 'puxou um fio');
    const tocar = c => {
      if (c in ponta) {
        const i = ponta[c];
        if (ativo === i && X.fioDe(jg, i).length > 1 && X.fioDe(jg, i).slice(-1)[0] !== c && p.pares[i].includes(c) && X.vizinhas(n, X.fioDe(jg, i).slice(-1)[0], c)) { mudar({ ['f' + i]: X.fioDe(jg, i).concat(c) }); return; }
        if (ctx.escolher) ctx.escolher(i);
        mudar({ ['f' + i]: [c] });
        return;
      }
      if (ativo == null) { aviso(ctx, 'Comece por uma das pontas.'); return; }
      const fio = X.fioDe(jg, ativo), k = fio.indexOf(c);
      if (k >= 0) { mudar({ ['f' + ativo]: fio.slice(0, k + 1) }); return; }
      if (!fio.length || !X.vizinhas(n, fio[fio.length - 1], c)) { aviso(ctx, 'Siga casa a casa, a partir da ponta do fio.'); return; }
      if (X.fioCompleto(jg, ativo)) { aviso(ctx, 'Este fio já está ligado. Toque numa ponta para recomeçar.'); return; }
      const mudas = { ['f' + ativo]: fio.concat(c) };
      if (c in dono && dono[c] !== ativo) { const o = X.fioDe(jg, dono[c]), corte = o.indexOf(c); mudas['f' + dono[c]] = corte > 0 ? o.slice(0, corte) : null; }
      mudar(mudas);
    };
    return [
      h('div', { class: 'fi', style: { gridTemplateColumns: 'repeat(' + n + ', 1fr)' } }, [...Array(tot).keys()].map(c => {
        const i = c in ponta ? ponta[c] : dono[c], cor = i != null ? CORES[i % CORES.length] : null;
        return h('button', { type: 'button', class: 'fi-c' + (c in ponta ? ' ponta' : '') + (c in dono ? ' fio' : '') + (ativo != null && i === ativo ? ' ativo' : ''), 'data-k': ctx.chave + 'c' + c, disabled: f,
          style: cor ? '--fc:' + cor : null, 'aria-label': (c in ponta ? 'Ponta ' : 'Casa ') + (c + 1) + (i != null ? ', fio ' + (i + 1) : ''), onclick: () => tocar(c) }, c in ponta ? h('span', { class: 'fi-p' }) : null);
      })),
      h('p', { class: 'pz-conta', text: p.pares.filter((_, i) => X.fioCompleto(jg, i)).length + ' de ' + p.pares.length + ' fios ligados. Toque numa ponta e siga casa a casa até a outra.' }),
    ];
  });

  /* ---------------- sudoku de runas ---------------- */
  reg('sudoku', (jg, ctx) => {
    const p = jg.pub, n = p.n, f = fechado(jg, ctx), dadas = X.dadasSdk(jg), conf = X.conflitosSdk(jg);
    const sel = Number.isInteger(ctx.sel) && ctx.sel < n * n && !dadas[ctx.sel] && !jg.estado['d' + ctx.sel] ? ctx.sel : null;
    const cheia = [...Array(n * n).keys()].every(i => X.valSdk(jg, i));
    const por = v => { if (sel == null) return; lance(jg, ctx, { ['c' + sel]: v || null }, v ? 'pôs uma runa' : 'apagou uma runa'); };
    return [
      h('div', { class: 'sk', style: 'grid-template-columns:repeat(' + n + ', 1fr);--sk:' + n }, [...Array(n * n).keys()].map(i => {
        const x = i % n, y = Math.floor(i / n), v = X.valSdk(jg, i), fixa = !!dadas[i] || !!jg.estado['d' + i];
        const cls = 'sk-c' + (fixa ? ' dada' : '') + (sel === i ? ' sel' : '') + (conf.has(i) ? ' conflito' : '') + ((x + 1) % p.bw === 0 && x < n - 1 ? ' bd' : '') + ((y + 1) % p.bh === 0 && y < n - 1 ? ' bb' : '');
        return h('button', { type: 'button', class: cls, 'data-k': ctx.chave + 's' + i, disabled: f || fixa, 'aria-label': 'Casa ' + (i + 1) + (v ? ', ' + p.simb[v - 1] : ', vazia'), onclick: () => ctx.escolher && ctx.escolher(sel === i ? null : i) },
          v ? h('span', { class: 'runa', text: p.simb[v - 1] }) : null);
      })),
      f ? null : h('div', { class: 'sk-pal' }, p.simb.map((s, k) => h('button', { type: 'button', class: 'sk-r', 'data-k': ctx.chave + 'r' + (k + 1), disabled: sel == null, onclick: () => por(k + 1) }, h('span', { class: 'runa', text: s }))),
        h('button', { type: 'button', class: 'btn sm', 'data-k': ctx.chave + 'apagar', disabled: sel == null, onclick: () => por(0) }, 'Apagar')),
      !f && cheia ? h('div', { class: 'row', style: { justifyContent: 'center' } }, h('button', { type: 'button', class: 'btn pri', 'data-k': ctx.chave + 'conferir',
        onclick: () => tentativa(jg, ctx, E.provaDoEstado(jg), {}, 'conferiu a grade, e não fecha') }, 'Conferir a grade')) : null,
      h('p', { class: 'pz-conta', text: sel == null ? 'Escolha uma casa vazia, depois a runa.' : 'Agora escolha a runa.' }),
    ];
  });

  /* ---------------- a pedra falsa ---------------- */
  const BAL = (incl, txtE, txtD) => {
    const r = incl > 0 ? 8 : incl < 0 ? -8 : 0;
    return h('div', { class: 'bl' }, svg(220, '<path d="M110 20v100M70 140h80"/><g transform="rotate(' + (-r) + ' 110 30)"><path d="M30 30h160"/><path d="M30 30 15 70h30zM190 30l-15 40h30z"/></g>', '3', '0 0 220 150'),
      h('div', { class: 'bl-pratos' }, h('div', { class: 'bl-p', style: { transform: 'translateY(' + (r * 1.6) + 'px)' } }, txtE), h('div', { class: 'bl-p', style: { transform: 'translateY(' + (-r * 1.6) + 'px)' } }, txtD)));
  };
  const pedraEl = (i, extra) => h('span', { class: 'fa-pd' + (extra || ''), text: String(i + 1) });
  reg('falsa', (jg, ctx) => {
    const p = jg.pub, f = fechado(jg, ctx), e = lista(jg.estado.e, 0, p.n - 1), d = lista(jg.estado.d, 0, p.n - 1), ok = new Set(lista(jg.estado.ok, 0, p.n - 1));
    const pes = Array.isArray(jg.estado.pes) ? jg.estado.pes.slice(0, 6) : [];
    const ult = pes[pes.length - 1];
    // (apontando: ctx.sel −1 = ainda nenhuma; 0… = a pedra escolhida)
    const apontando = Number.isInteger(ctx.sel) && ctx.sel >= -1 && ctx.sel < p.n, apontada = apontando && ctx.sel >= 0 ? ctx.sel : null;
    const girar = i => {
      if (e.includes(i)) lance(jg, ctx, { e: e.filter(x => x !== i), d: d.concat(i) }, 'pôs a pedra ' + (i + 1) + ' na direita');
      else if (d.includes(i)) lance(jg, ctx, { d: d.filter(x => x !== i) }, 'tirou a pedra ' + (i + 1) + ' da balança');
      else lance(jg, ctx, { e: e.concat(i) }, 'pôs a pedra ' + (i + 1) + ' na esquerda');
    };
    const pesarJa = () => {
      const r = X.pesar(jg, e, d);
      lance(jg, ctx, { pes: pes.concat({ e, d, r }), e: null, d: null }, 'pesou: ' + (r > 0 ? 'a esquerda desceu' : r < 0 ? 'a direita desceu' : 'ficou em equilíbrio'));
    };
    const apontar = dd => { if (ctx.escolher) ctx.escolher(null); return tentativa(jg, ctx, E.provaDoEstado(jg, { f: apontada, d: dd }), { pes: null, e: null, d: null }, 'apontou a pedra ' + (apontada + 1) + ', e errou: as pesagens recomeçam', null, 'achou a pedra falsa'); };
    const resta = p.max - pes.length;
    return [
      BAL(e.length || d.length ? 0 : ult ? ult.r : 0, e.length || d.length ? e.map(i => pedraEl(i)) : ult ? ult.e.map(i => pedraEl(i)) : [], e.length || d.length ? d.map(i => pedraEl(i)) : ult ? ult.d.map(i => pedraEl(i)) : []),
      h('div', { class: 'fa-pedras' }, [...Array(p.n).keys()].map(i => h('button', { type: 'button', class: 'fa-b' + (e.includes(i) ? ' esq' : d.includes(i) ? ' dir' : '') + (ok.has(i) ? ' verdadeira' : '') + (apontada === i ? ' apontada' : ''),
        'data-k': ctx.chave + 'p' + i, disabled: f, 'aria-label': 'Pedra ' + (i + 1) + (e.includes(i) ? ', na esquerda' : d.includes(i) ? ', na direita' : '') + (ok.has(i) ? ', verdadeira' : ''),
        onclick: () => (apontando ? ctx.escolher(i) : girar(i)) }, String(i + 1), ok.has(i) ? h('small', { text: '✓' }) : null))),
      f ? null : h('div', { class: 'row', style: { justifyContent: 'center' } },
        h('button', { type: 'button', class: 'btn', 'data-k': ctx.chave + 'pesar', disabled: resta <= 0 || !(e.length && d.length) || apontando, onclick: pesarJa }, resta > 0 ? 'Pesar (' + resta + (resta === 1 ? ' vez' : ' vezes') + ')' : 'As pesagens acabaram'),
        !apontando ? h('button', { type: 'button', class: 'btn', 'data-k': ctx.chave + 'apontar', onclick: () => ctx.escolher(-1) }, 'Apontar a falsa…')
          : [apontada == null ? null : p.qual === 'qualquer' ? [h('button', { type: 'button', class: 'btn pri', 'data-k': ctx.chave + 'pesada', onclick: () => apontar(1) }, 'A ' + (apontada + 1) + ' é mais pesada'),
            h('button', { type: 'button', class: 'btn pri', 'data-k': ctx.chave + 'leve', onclick: () => apontar(-1) }, 'A ' + (apontada + 1) + ' é mais leve')]
            : h('button', { type: 'button', class: 'btn pri', 'data-k': ctx.chave + 'esta', onclick: () => apontar(1) }, 'A falsa é a ' + (apontada + 1)),
          h('button', { type: 'button', class: 'btn sm', 'data-k': ctx.chave + 'cancelar', onclick: () => ctx.escolher(null) }, 'Cancelar')]),
      h('p', { class: 'pz-conta', text: apontando ? 'Toque na pedra que vocês acham que é a falsa.' : (p.qual === 'pesada' ? 'A falsa é mais pesada. ' : 'A falsa pode ser mais pesada ou mais leve. ') + 'Toque numa pedra para pôr na esquerda, de novo para a direita, de novo para tirar.' }),
      pes.length ? h('ol', { class: 'fa-hist' }, pes.map(x => h('li', { text: (x.e || []).map(i => i + 1).join(', ') + ' × ' + (x.d || []).map(i => i + 1).join(', ') + ': ' + (x.r > 0 ? 'a esquerda desceu' : x.r < 0 ? 'a direita desceu' : 'equilíbrio') }))) : null,
    ];
  });

  /* ---------------- equilibrar os pratos ---------------- */
  reg('equilibrar', (jg, ctx) => {
    const p = jg.pub, f = fechado(jg, ctx), trav = new Set(lista(jg.estado.k, 0, 20));
    const lado = i => X.ladoEq(jg, i), ult = jg.estado.ult === 'e' ? 1 : jg.estado.ult === 'd' ? -1 : 0;
    const proximo = l => (l === '' ? 'd' : l === 'd' ? (p.ambos ? 'e' : '') : '');
    const peso = (v, cls) => h('span', { class: 'eq-ps' + (cls || ''), text: String(v) });
    const soltar = () => {
      const pr = X.pratosEq(jg);
      tentativa(jg, ctx, E.provaDoEstado(jg, 'soltar'), { ult: pr.e > pr.d ? 'e' : 'd' }, 'soltou a balança, e ela tombou', null, 'equilibrou os pratos');
    };
    return [
      BAL(ult, [p.obj.map(v => peso(v, ' obj')), p.pesos.map((v, i) => (lado(i) === 'e' ? peso(v) : null))], p.pesos.map((v, i) => (lado(i) === 'd' ? peso(v) : null))),
      h('p', { class: 'pz-conta', text: (p.obj.length > 1 ? 'Os objetos pesam ' + p.obj.join(' e ') : 'O objeto pesa ' + p.obj[0]) + '. ' + (p.ambos ? 'Os pesos podem ir no prato vazio ou junto do objeto.' : 'Os pesos vão no prato vazio.') }),
      h('div', { class: 'eq-pesos' }, p.pesos.map((v, i) => h('button', { type: 'button', class: 'eq-b' + (lado(i) ? ' ' + lado(i) : '') + (trav.has(i) ? ' travado' : ''), 'data-k': ctx.chave + 'w' + i, disabled: f || trav.has(i),
        'aria-label': 'Peso ' + v + (lado(i) === 'd' ? ', no prato vazio' : lado(i) === 'e' ? ', junto do objeto' : ', fora'),
        onclick: () => lance(jg, ctx, { ['w' + i]: proximo(lado(i)) || null, ult: null }, 'mexeu num peso') }, String(v), h('small', { text: lado(i) === 'd' ? 'prato vazio' : lado(i) === 'e' ? 'com o objeto' : 'fora' })))),
      f ? null : h('div', { class: 'row', style: { justifyContent: 'center' } }, h('button', { type: 'button', class: 'btn pri', 'data-k': ctx.chave + 'soltar', onclick: soltar }, 'Soltar a balança')),
    ];
  });

  /* ---------------- tabuleiro deslizante ---------------- */
  reg('deslizante', (jg, ctx) => {
    const p = jg.pub, n = p.n, f = fechado(jg, ctx), pos = X.posDsl(jg), vazio = n * n - 1, ver = !!jg.estado.ver;
    const img = p.modo === 'imagem' && p.img;
    return [
      p.modo === 'runas' ? h('div', { class: 'ds-ordem' }, h('span', { class: 'cd-rot', text: 'A ordem:' }), p.simb.map(s => h('span', { class: 'runa', text: s }))) : null,
      img && ver ? h('img', { class: 'ds-mini', src: p.img, alt: 'O desenho montado' }) : null,
      h('div', { class: 'ds', style: { gridTemplateColumns: 'repeat(' + n + ', 1fr)', aspectRatio: String(img ? p.ar || 1 : 1), width: 'min(100%, ' + (img ? Math.round(420 * Math.min(1, p.ar || 1)) : 300) + 'px)' } }, pos.map((pc, i) => {
        if (pc === vazio) return h('div', { class: 'ds-v' });
        const x = n > 1 ? (pc % n) * 100 / (n - 1) : 0, y = n > 1 ? Math.floor(pc / n) * 100 / (n - 1) : 0;
        return h('button', { type: 'button', class: 'ds-p' + (pc === i ? ' certa' : ''), 'data-k': ctx.chave + 'd' + i, disabled: f, 'aria-label': 'Peça ' + (pc + 1),
          style: img ? { backgroundImage: 'url("' + p.img.replace(/"/g, '%22') + '")', backgroundSize: n * 100 + '% ' + n * 100 + '%', backgroundPosition: x + '% ' + y + '%' } : null,
          onclick: () => { const novo = X.deslizar(jg, i); if (novo) lance(jg, ctx, { p: novo }, 'deslizou uma peça'); } },
          img ? (ver ? h('small', { class: 'ds-n', text: String(pc + 1) }) : null) : [h('span', { class: 'runa', text: p.simb[pc] }), ver ? h('small', { class: 'ds-n', text: String(pc + 1) }) : null]);
      })),
      h('p', { class: 'pz-conta', text: 'Toque numa peça na linha ou na coluna do espaço vazio.' }),
    ];
  });

  /* ---------------- pares ---------------- */
  reg('pares', (jg, ctx) => {
    const p = jg.pub, f = fechado(jg, ctx), cartas = X.cartasPares(jg), m = new Set(lista(jg.estado.m, 0, p.n - 1)), s = new Set(lista(jg.estado.s, 0, p.n - 1));
    const a = intOk(jg.estado.a, 0, p.n - 1) ? jg.estado.a : null, v = lista(jg.estado.v, 0, p.n - 1);
    const virar = c => {
      if (m.has(c) || c === a) return;
      const visto = [...s, c].filter((x, i, l) => l.indexOf(x) === i);
      if (a == null) { lance(jg, ctx, { a: c, v: null, s: visto }, 'virou uma carta'); return; }
      if (cartas[a] === cartas[c]) { lance(jg, ctx, { m: [...m, a, c], a: null, v: null, s: visto }, 'achou um par'); return; }
      // errar um par que já tinham visto conta como erro (no médio e no difícil)
      const lembravam = jg.dif !== 'facil' && s.has(c);
      erroDe(ctx, ctx.jogar(lembravam ? 'errar' : 'jogar', { a: null, v: [a, c], s: visto, _txt: lembravam ? 'errou um par que já tinham visto' : 'virou duas cartas diferentes' }));
    };
    return [
      h('div', { class: 'pa', style: { gridTemplateColumns: 'repeat(' + p.cols + ', 1fr)' } }, [...Array(p.n).keys()].map(c => {
        const aberta = m.has(c) || c === a || v.includes(c);
        return h('button', { type: 'button', class: 'pa-c' + (aberta ? ' aberta' : '') + (m.has(c) ? ' par' : '') + (v.includes(c) ? ' errada' : ''), 'data-k': ctx.chave + 'c' + c, disabled: f || m.has(c),
          'aria-label': aberta ? 'Carta ' + (c + 1) + ': ' + nomeSimb(cartas[c]) : 'Carta ' + (c + 1) + ', virada para baixo', onclick: () => virar(c) }, aberta ? SIMB(cartas[c]) : null);
      })),
      h('p', { class: 'pz-conta', text: m.size / 2 + ' de ' + p.n / 2 + ' pares' }),
    ];
  });

  /* ---------------- repetir a sequência ---------------- */
  const tocando = new WeakSet();
  reg('sequencia', (jg, ctx) => {
    const p = jg.pub, f = fechado(jg, ctx), seq = X.seqDe(jg), r = X.rodadaSeq(jg), i = X.progSeq(jg);
    const mostrar = ev => {
      const raiz = ev.target.closest('.pz'); if (!raiz || tocando.has(raiz)) return;
      tocando.add(raiz);
      let k = 0;
      const passo = () => {
        raiz.querySelectorAll('.sq-r.aceso').forEach(el => el.classList.remove('aceso'));
        if (k >= r) { tocando.delete(raiz); return; }
        const el = raiz.querySelector('[data-k="' + ctx.chave + 'r' + seq[k] + '"]');
        if (el) el.classList.add('aceso');
        k++;
        setTimeout(() => { raiz.querySelectorAll('.sq-r.aceso').forEach(x => x.classList.remove('aceso')); setTimeout(passo, 180); }, 520);
      };
      passo();
    };
    const tocar = v => {
      if (v !== seq[i]) { erroDe(ctx, ctx.jogar('errar', { i: 0, _txt: 'errou a sequência na rodada ' + r })); return; }
      if (i + 1 < r) { lance(jg, ctx, { i: i + 1 }, 'acertou mais uma'); return; }
      if (r >= p.L) { tentativa(jg, ctx, E.provaDoEstado(jg, 'fim'), { i: 0 }, 'errou o fim', { i: r }, 'repetiu a sequência inteira'); return; }
      lance(jg, ctx, { r: r + 1, i: 0 }, 'completou a rodada ' + r);
    };
    return [
      h('div', { class: 'sq' }, p.simb.map((s, k) => h('button', { type: 'button', class: 'sq-r', 'data-k': ctx.chave + 'r' + k, disabled: f, 'aria-label': nomeSimb(s), onclick: () => tocar(k) }, SIMB(s)))),
      h('div', { class: 'row', style: { justifyContent: 'center' } }, h('button', { type: 'button', class: 'btn', 'data-k': ctx.chave + 'ver', disabled: !!jg.resolvido, onclick: mostrar }, 'Ver a sequência')),
      h('p', { class: 'pz-conta', text: jg.resolvido ? 'A sequência inteira, de ' + p.L + '.' : 'Rodada ' + r + ' de ' + p.L + ' · ' + i + ' de ' + r + ' certas' }),
    ];
  });
})();
