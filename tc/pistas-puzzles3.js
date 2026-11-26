/* Tiny Cats · os puzzles do lote 209 na tela, parte 2 (mecanismos, caminhos e desenho), registrados em TC.pistasUI.
   A conta mora em tc/escudo-puzzles3.js (TC.escudo.mais3). */
(() => {
  'use strict';
  const E = window.TC.escudo, X = E && E.mais3, PUI = window.TC.pistasUI, U = window.TC.dom;
  if (!E || !X || !PUI || !PUI.registrarCorpo) return;
  const { h, svg } = U;
  const { lance, erroDe, fechado, tentativa } = PUI.kit;
  const reg = PUI.registrarCorpo;
  const intOk = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  const lista = (v, a, b) => (Array.isArray(v) ? v.filter(x => intOk(x, a, b)) : []);
  const seq = n => [...Array(n).keys()];
  const aviso = (ctx, t) => { if (ctx.aviso) ctx.aviso(t); };
  const trocaChar = (s, i, c) => s.slice(0, i) + c + s.slice(i + 1);
  const selDe = (ctx, max) => (Number.isInteger(ctx.sel) && ctx.sel >= 0 && ctx.sel < max ? ctx.sel : null);
  const escolher = (ctx, v) => { if (ctx.escolher) ctx.escolher(v); };
  const grade = (n, cels, cls, larg) => h('div', { class: 'gz ' + (cls || ''), style: { gridTemplateColumns: 'repeat(' + n + ', minmax(0, 1fr))', width: 'min(100%, ' + n * (larg || 40) + 'px)' } }, cels);
  const botoes = (...b) => h('div', { class: 'row', style: { justifyContent: 'center' } }, b.filter(Boolean));
  const setas = (ctx, f, pode, ir) => (f ? null : h('div', { class: 'lb-setas' }, [['N', '▲', 'Para cima'], ['O', '◀', 'Para a esquerda'], ['S', '▼', 'Para baixo'], ['L', '▶', 'Para a direita']].map(([d, t, nm]) =>
    h('button', { type: 'button', class: 'ib lb-' + d, 'data-k': ctx.chave + 'ir' + d, 'aria-label': nm, disabled: !pode(d), onclick: () => ir(d) }, t))));
  const BANDEIRA = '<path d="M5 21V4h11l-2 4 2 4H5"/>';
  const PESSOA = '<circle cx="12" cy="7" r="3.2"/><path d="M6 20c0-4 2.7-6.5 6-6.5s6 2.5 6 6.5"/>';
  const ESTATUA = '<circle cx="12" cy="6" r="2.6"/><path d="M8.5 20v-6.5l3.5-3 3.5 3V20"/><path d="M6.5 20h11"/>';
  const PEDRA = '<path d="M4 17l3-8 5-3 6 3 2 8z"/><path d="M9 11l3 2 3-1"/>';

  /* ---------------- torre dos discos ---------------- */
  reg('torre', (jg, ctx) => {
    const p = jg.pub, f = fechado(jg, ctx), q = X.pinosDe(jg), sel = selDe(ctx, 3), n = p.n;
    const tocar = k => {
      if (sel == null) { if (q[k].length) escolher(ctx, k); return; }
      escolher(ctx, null);
      if (sel === k) return;
      const d = q[sel][q[sel].length - 1], t = q[k][q[k].length - 1];
      if (t != null && t < d) { aviso(ctx, 'Disco grande não vai em cima de disco pequeno.'); return; }
      lance(jg, ctx, { p: X.mover(q, sel, k), n: (jg.estado.n || 0) + 1 }, 'moveu um disco');
    };
    return [
      h('div', { class: 'tr' }, q.map((l, k) => h('button', { type: 'button', class: 'tr-p' + (sel === k ? ' sel' : '') + (k === p.alvo ? ' alvo' : ''), 'data-k': ctx.chave + 'pino' + k, disabled: f, 'aria-label': 'Pino ' + (k + 1) + (k === p.alvo ? ', o de destino' : '') + ', ' + l.length + ' discos', onclick: () => tocar(k) },
        k === p.alvo ? h('span', { class: 'tr-band' }, svg(16, BANDEIRA, '2')) : null, h('span', { class: 'tr-haste' }),
        h('span', { class: 'tr-pilha' }, l.slice().reverse().map((d, j) => h('span', { class: 'tr-d d' + (d % 6) + (sel === k && j === 0 ? ' erguido' : ''), style: { width: 28 + (d / n) * 62 + '%' } })))))),
      h('p', { class: 'pz-conta', text: (sel == null ? 'Clique num pino para pegar o disco de cima.' : 'Agora o pino de destino.') + ' Lances: ' + (jg.estado.n || 0) }),
      f ? null : botoes(h('button', { type: 'button', class: 'btn sm', 'data-k': ctx.chave + 'recomeca', onclick: () => lance(jg, ctx, { p: p.p0, n: 0 }, 'recomeçou a torre') }, 'Recomeçar')),
    ];
  });

  /* ---------------- jarros d'água ---------------- */
  reg('jarros', (jg, ctx) => {
    const p = jg.pub, f = fechado(jg, ctx), v = X.jarrosDe(jg), sel = selDe(ctx, v.length), nomes = ['A', 'B', 'C'], max = Math.max(...p.caps);
    const mudar = (nv, txt) => { escolher(ctx, null); lance(jg, ctx, { v: nv, n: (jg.estado.n || 0) + 1 }, txt); };
    const tocar = i => {
      if (sel == null) { if (v[i]) escolher(ctx, i); else aviso(ctx, 'Este jarro está vazio.'); return; }
      if (sel === i) { escolher(ctx, null); return; }
      if (v[i] >= p.caps[i]) { aviso(ctx, 'O jarro ' + nomes[i] + ' já está cheio.'); escolher(ctx, null); return; }
      const q = Math.min(v[sel], p.caps[i] - v[i]), nv = v.slice(); nv[sel] -= q; nv[i] += q;
      mudar(nv, 'passou água do jarro ' + nomes[sel] + ' para o ' + nomes[i]);
    };
    return [
      h('p', { class: 'pz-dica', text: X.textoAlvoJarros(p, nomes) }),
      h('div', { class: 'jr' }, v.map((x, i) => h('div', { class: 'jr-j' },
        h('button', { type: 'button', class: 'jr-v' + (sel === i ? ' sel' : ''), 'data-k': ctx.chave + 'j' + i, disabled: f, style: { height: 60 + (p.caps[i] / max) * 110 + 'px' }, 'aria-label': 'Jarro ' + nomes[i] + ': ' + x + ' de ' + p.caps[i] + ' litros', onclick: () => tocar(i) },
          h('span', { class: 'jr-agua', style: { height: (x / p.caps[i]) * 100 + '%' } }), h('b', { text: x + ' / ' + p.caps[i] })),
        h('span', { class: 'jr-n', text: 'Jarro ' + nomes[i] }),
        p.fonte && !f ? h('div', { class: 'jr-b' }, h('button', { type: 'button', class: 'btn xs', 'data-k': ctx.chave + 'enc' + i, disabled: x >= p.caps[i], onclick: () => { const nv = v.slice(); nv[i] = p.caps[i]; mudar(nv, 'encheu o jarro ' + nomes[i]); } }, 'Encher'),
          h('button', { type: 'button', class: 'btn xs', 'data-k': ctx.chave + 'esv' + i, disabled: !x, onclick: () => { const nv = v.slice(); nv[i] = 0; mudar(nv, 'esvaziou o jarro ' + nomes[i]); } }, 'Esvaziar')) : null))),
      h('p', { class: 'pz-conta', text: (sel == null ? 'Para passar água: clique num jarro, depois no outro.' : 'Agora o jarro que recebe.') + ' Lances: ' + (jg.estado.n || 0) }),
      f ? null : botoes(h('button', { type: 'button', class: 'btn sm', 'data-k': ctx.chave + 'recomeca', onclick: () => { escolher(ctx, null); lance(jg, ctx, { v: p.ini, n: 0 }, 'recomeçou os jarros'); } }, 'Recomeçar')),
    ];
  });

  /* ---------------- travessia do rio ---------------- */
  const BARCO = '<path d="M3 14h18l-3 5H6z"/><path d="M12 14V4l6 7h-6"/>';
  const ICO_TRAV = { guarda: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>', 'ladrão': '<path d="M4 10c3-2 13-2 16 0"/><circle cx="9" cy="13" r="1.4"/><circle cx="15" cy="13" r="1.4"/><path d="M6 8l2-4h8l2 4"/>' };
  reg('travessia', (jg, ctx) => {
    const V = jg.pub, f = fechado(jg, ctx), s = X.travEstado(jg), N = V.itens.length;
    const mask = Number.isInteger(ctx.sel) && ctx.sel > 0 && ctx.sel < 1 << N ? ctx.sel : 0;
    const grupo = seq(N).filter(i => (mask >> i) & 1 && s.s[i] === s.b);
    const nome = i => V.itens[i] + (V.tipo === 'ponte' ? ' (' + V.tempos[i] + ' min)' : '');
    const tocar = i => { if (s.s[i] !== s.b) { aviso(ctx, (V.tipo === 'ponte' ? 'A tocha' : 'O barco') + ' está do outro lado.'); return; } escolher(ctx, mask ^ (1 << i)); };
    const cruzar = () => {
      if (!grupo.length) { aviso(ctx, 'Escolham quem vai.'); return; }
      if (grupo.length > V.cap) { aviso(ctx, (V.tipo === 'ponte' ? 'A ponte aguenta ' : 'O barco leva ') + V.cap + ' de cada vez.'); return; }
      if (!grupo.some(i => V.remam.includes(i))) { aviso(ctx, 'Alguém precisa remar: só o barqueiro rema.'); return; }
      const t = X.travCruzar(V, s, grupo), prob = X.travProblema(V, t);
      escolher(ctx, null);
      if (prob) { erroDe(ctx, ctx.jogar('errar', { _txt: prob })); aviso(ctx, prob + ' (conta um erro; ninguém atravessou)'); return; }
      if (V.tipo === 'ponte' && t.t > V.limite) { erroDe(ctx, ctx.jogar('errar', { s: V.itens.map(() => 0), b: 0, t: 0, _txt: 'passou do tempo (' + t.t + ' min)' })); aviso(ctx, 'Passaram de ' + V.limite + ' minutos: a tocha apagou. Conta um erro, e todos voltam ao começo.'); return; }
      lance(jg, ctx, { s: t.s, b: t.b, t: t.t }, 'atravessou: ' + grupo.map(i => V.itens[i]).join(' e '));
    };
    const item = i => h('button', { type: 'button', class: 'tv-i' + (grupo.includes(i) ? ' sel' : ''), 'data-k': ctx.chave + 'it' + i, disabled: f, onclick: () => tocar(i) },
      ICO_TRAV[V.itens[i]] ? svg(18, ICO_TRAV[V.itens[i]], '1.7') : svg(18, PESSOA, '1.7'), h('span', { text: nome(i) }));
    const margem = lado => h('div', { class: 'tv-m' }, h('span', { class: 'cd-rot', text: lado ? 'Margem de lá' : 'Margem de cá' }), seq(N).filter(i => s.s[i] === lado).map(item));
    const regra = V.tipo === 'barqueiro' ? 'Só o barqueiro rema; o barco leva ele e mais um. Sozinhos, sem o barqueiro, um come o outro.' : V.tipo === 'guardas' ? 'O barco leva até ' + V.cap + ', e qualquer um rema. Numa margem com guarda, os ladrões nunca podem ser mais que os guardas.' : 'À noite, com uma tocha só. A ponte aguenta 2; os dois andam no passo do mais lento. Limite: ' + V.limite + ' minutos.';
    return [
      h('p', { class: 'pz-dica', text: regra }),
      h('div', { class: 'tv' }, margem(0), h('div', { class: 'tv-rio' }, h('span', { class: 'tv-barco' + (s.b ? ' la' : ''), title: V.tipo === 'ponte' ? 'A tocha' : 'O barco' }, svg(26, V.tipo === 'ponte' ? '<path d="M10 21l2-9 2 9z"/><path d="M12 12c-3-2-2-5 0-8 2 3 3 6 0 8z"/>' : BARCO, '1.7'))), margem(1)),
      V.tipo === 'ponte' ? h('p', { class: 'pz-conta', text: 'Tempo: ' + s.t + ' de ' + V.limite + ' minutos' }) : null,
      f ? null : botoes(h('button', { type: 'button', class: 'btn pri', 'data-k': ctx.chave + 'ir', onclick: cruzar }, 'Atravessar' + (grupo.length ? ' (' + grupo.length + ')' : '')),
        h('button', { type: 'button', class: 'btn sm', 'data-k': ctx.chave + 'recomeca', onclick: () => { escolher(ctx, null); lance(jg, ctx, { s: V.itens.map(() => 0), b: 0, t: 0 }, 'recomeçou a travessia'); } }, 'Recomeçar')),
    ];
  });

  /* ---------------- canos de água ---------------- */
  const desenhoCano = (m, agua, fonte) => {
    const l = [];
    if (m & 1) l.push('<path d="M12 12V0"/>'); if (m & 2) l.push('<path d="M12 12h12"/>'); if (m & 4) l.push('<path d="M12 12v12"/>'); if (m & 8) l.push('<path d="M12 12H0"/>');
    if ([1, 2, 4, 8].includes(m)) l.push('<circle cx="12" cy="12" r="3.2"/>');
    if (fonte) l.push('<circle cx="12" cy="12" r="5" fill="currentColor"/>');
    const s = svg(36, l.join(''), agua ? '5' : '4.2'); s.setAttribute('preserveAspectRatio', 'none'); s.style.width = '100%'; s.style.height = '100%';
    return s;
  };
  reg('canos', (jg, ctx) => {
    const p = jg.pub, n = p.n, f = fechado(jg, ctx), o = X.rotCanos(jg), ag = X.aguaCanos(jg), trav = new Set(lista(jg.estado.d, 0, n * n));
    const cel = seq(n * n).map(i => {
      if (p.bur.includes(i)) return h('div', { class: 'cn-c buraco' });
      return h('button', { type: 'button', class: 'cn-c' + (ag.agua.has(i) ? ' agua' : '') + (i === p.fonte ? ' fonte' : '') + (trav.has(i) ? ' travada' : ''), 'data-k': ctx.chave + 'c' + i, disabled: f || trav.has(i), 'aria-label': 'Cano ' + (i % n + 1) + ', ' + (Math.floor(i / n) + 1),
        onclick: () => lance(jg, ctx, { o: trocaChar(o, i, String(((Number(o[i]) || 0) + 1) % 4)) }, 'girou um cano') }, desenhoCano(X.canoDe(jg, i), ag.agua.has(i), i === p.fonte));
    });
    return [grade(n, cel, 'cn', 46), h('p', { class: 'pz-conta', text: ag.agua.size + ' de ' + (n * n - p.bur.length) + ' canos com água. Clique gira.' })];
  });

  /* ---------------- empurrar estátuas ---------------- */
  reg('sokoban', (jg, ctx) => {
    const p = jg.pub, n = p.n, f = fechado(jg, ctx), s = X.sokEstado(jg), hist = Array.isArray(jg.estado.h) ? jg.estado.h.slice(-30) : [];
    const andar = d => {
      const t = X.sokPasso(jg, d);
      if (!t) { aviso(ctx, 'Não dá para ir por aí.'); return; }
      lance(jg, ctx, { p: t.p, b: t.b, h: hist.concat([[s.p, s.b]]).slice(-30), n: (jg.estado.n || 0) + 1 }, t.empurrou ? 'empurrou uma estátua' : 'andou');
    };
    const dirDe = i => Object.keys(X.D4).find(d => X.passo(n, n, s.p, d) === i);
    const cel = seq(n * n).map(i => {
      if (p.par[i] === '#') return h('div', { class: 'sb-c parede' });
      const caixa = s.b.includes(i), alvo = p.alvos.includes(i), fixa = s.f.includes(i), d = dirDe(i);
      return h('button', { type: 'button', class: 'sb-c' + (alvo ? ' alvo' : '') + (caixa && alvo ? ' certa' : ''), 'data-k': ctx.chave + 'm' + i, disabled: f || !d, tabindex: d ? null : '-1', onclick: () => d && andar(d), 'aria-label': i === s.p ? 'Vocês' : caixa ? 'Estátua' : alvo ? 'Placa' : 'Chão' },
        i === s.p ? h('span', { class: 'sk-eu' }, svg(20, PESSOA, '2')) : caixa || fixa ? h('span', { class: 'sk-est' }, svg(22, ESTATUA, '1.7')) : null);
    });
    return [
      h('div', { class: 'sk-wrap', tabindex: '0', onkeydown: ev => { const m = { ArrowUp: 'N', ArrowDown: 'S', ArrowLeft: 'O', ArrowRight: 'L' }[ev.key]; if (m && !f) { ev.preventDefault(); andar(m); } } }, grade(n, cel, 'sb', 40)),
      setas(ctx, f, d => !!X.sokPasso(jg, d), andar),
      f ? null : botoes(h('button', { type: 'button', class: 'btn sm', 'data-k': ctx.chave + 'volta', disabled: !hist.length, onclick: () => { const u = hist[hist.length - 1]; lance(jg, ctx, { p: u[0], b: u[1], h: hist.slice(0, -1) }, 'voltou um lance'); } }, 'Voltar um lance'),
        h('button', { type: 'button', class: 'btn sm', 'data-k': ctx.chave + 'recomeca', onclick: () => lance(jg, ctx, { p: p.p0, b: p.b0, h: null, n: 0, f: null }, 'recomeçou as estátuas') }, 'Recomeçar')),
      h('p', { class: 'pz-conta', text: s.b.filter(c => p.alvos.includes(c)).length + s.f.length + ' de ' + p.alvos.length + ' estátuas nas placas. Setas do teclado também andam.' }),
    ];
  });

  /* ---------------- chão de gelo ---------------- */
  const BURACO = '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/>';
  reg('gelo', (jg, ctx) => {
    const p = jg.pub, n = p.n, f = fechado(jg, ctx), pos = X.posGelo(jg);
    const andar = d => {
      const t = X.deslizarGelo(p, pos, d);
      if (!t) { aviso(ctx, 'Uma pedra (ou a borda) logo ali.'); return; }
      if (t.cai) { erroDe(ctx, ctx.jogar('errar', { p: p.ini, n: 0, _txt: 'caiu num buraco' })); aviso(ctx, 'Caíram num buraco! Conta um erro, e voltam ao começo.'); return; }
      lance(jg, ctx, { p: t.p, n: (jg.estado.n || 0) + 1 }, t.p === p.fim ? 'parou na saída' : 'deslizou');
    };
    const cel = seq(n * n).map(i => h('div', { class: 'gl-c' + (p.pedras.includes(i) ? ' pedra' : p.buracos.includes(i) ? ' buraco' : p.neve.includes(i) ? ' neve' : '') + (i === p.fim ? ' fim' : ''), 'data-k': ctx.chave + 'm' + i },
      i === pos ? h('span', { class: 'gl-eu' }, svg(18, PESSOA, '2')) : p.pedras.includes(i) ? svg(18, PEDRA, '1.6') : p.buracos.includes(i) ? svg(18, BURACO, '1.6') : i === p.fim ? svg(16, BANDEIRA, '2') : null));
    return [
      h('div', { class: 'sk-wrap', tabindex: '0', onkeydown: ev => { const m = { ArrowUp: 'N', ArrowDown: 'S', ArrowLeft: 'O', ArrowRight: 'L' }[ev.key]; if (m && !f) { ev.preventDefault(); andar(m); } } }, grade(n, cel, 'gl', 36)),
      setas(ctx, f, d => { const t = X.deslizarGelo(p, pos, d); return !!t; }, andar),
      f ? null : botoes(h('button', { type: 'button', class: 'btn sm', 'data-k': ctx.chave + 'recomeca', onclick: () => lance(jg, ctx, { p: p.ini, n: 0 }, 'voltou ao começo') }, 'Recomeçar')),
      h('p', { class: 'pz-conta', text: 'Deslizes: ' + (jg.estado.n || 0) + '. Parem em cima da bandeira.' + (p.neve.length ? ' Na neve (branco), para.' : '') }),
    ];
  });

  /* ---------------- resta um ---------------- */
  reg('restaum', (jg, ctx) => {
    const p = jg.pub, f = fechado(jg, ctx), pin = X.pinosRU(jg), sel = selDe(ctx, pin.length), pulos = X.pulosRU(p, pin), resta = [...pin].filter(c => c === '1').length;
    const tocar = i => {
      if (pin[i] === '1') { escolher(ctx, sel === i ? null : i); return; }
      if (sel == null) { aviso(ctx, 'Escolham primeiro um pino.'); return; }
      const j = pulos.find(x => x.de === sel && x.para === i);
      escolher(ctx, null);
      if (!j) { aviso(ctx, 'Esse pulo não vale: tem que pular um vizinho, em linha reta, e cair num buraco vazio.'); return; }
      lance(jg, ctx, { p: X.pular(pin, j) }, 'pulou um pino');
    };
    const cel = seq(p.q.length).map(i => (p.q[i] !== '1' ? h('div', { class: 'ru-x' }) : h('button', { type: 'button', class: 'ru-c' + (pin[i] === '1' ? ' pino' : '') + (sel === i ? ' sel' : '') + (sel != null && pulos.some(x => x.de === sel && x.para === i) ? ' destino' : '') + (i === p.centro ? ' centro' : ''),
      'data-k': ctx.chave + 'h' + i, disabled: f, 'aria-label': pin[i] === '1' ? 'Pino' : 'Buraco', onclick: () => tocar(i) })));
    return [
      grade(p.w, cel, 'ru', 40),
      !f && resta > 1 && !pulos.length ? h('p', { class: 'pz-dica', text: 'Sem pulos: recomecem.' }) : null,
      f ? null : botoes(h('button', { type: 'button', class: 'btn sm', 'data-k': ctx.chave + 'recomeca', onclick: () => { escolher(ctx, null); lance(jg, ctx, { p: p.p0 }, 'recomeçou os pinos'); } }, 'Recomeçar')),
      h('p', { class: 'pz-conta', text: 'Restam ' + resta + (resta === 1 ? ' pino' : ' pinos') + (p.centro != null ? ' · o último fica no centro (o anel)' : '') }),
    ];
  });

  /* ---------------- pontes entre ilhas ---------------- */
  reg('pontes', (jg, ctx) => {
    const p = jg.pub, n = p.n, f = fechado(jg, ctx), il = p.ilhas, b = X.pontesDe(jg), st = X.estadoPontes(jg), sel = selDe(ctx, il.length);
    const pos = v => ((v + 0.5) / n) * 100 + '%';
    const tocar = k => {
      if (sel == null || sel === k) { escolher(ctx, sel === k ? null : k); return; }
      escolher(ctx, null);
      if (!X.parValido(il, sel, k)) { aviso(ctx, 'Pontes só em linha reta, sem passar por outra ilha.'); return; }
      const ch = X.chavePonte(sel, k), nv = ((b[ch] || 0) + 1) % 3, nb = Object.assign({}, b);
      if (nv) nb[ch] = nv; else delete nb[ch];
      if (nv && Object.keys(b).some(c => c !== ch && X.cruzam(il, [sel, k], c.split('-').map(Number)))) { aviso(ctx, 'Essa ponte cruzaria outra.'); return; }
      lance(jg, ctx, { b: nb }, nv ? (nv === 2 ? 'dobrou uma ponte' : 'fez uma ponte') : 'tirou uma ponte');
    };
    const pontes = Object.keys(b).map(c => {
      const [a, d] = c.split('-').map(Number), [ax, ay] = il[a], [dx, dy] = il[d], hor = ay === dy;
      const st2 = hor ? { left: pos(Math.min(ax, dx)), width: (Math.abs(ax - dx) / n) * 100 + '%', top: pos(ay) } : { top: pos(Math.min(ay, dy)), height: (Math.abs(ay - dy) / n) * 100 + '%', left: pos(ax) };
      return h('div', { class: 'pt-p ' + (hor ? 'h' : 'v') + (b[c] === 2 ? ' dupla' : '') + (st.cruz.has(c) ? ' ruim' : ''), style: st2 });
    });
    return [
      h('div', { class: 'pt', style: { width: 'min(100%, ' + n * 44 + 'px)' } }, pontes, il.map(([x, y, q], k) => h('button', { type: 'button', class: 'pt-i' + (sel === k ? ' sel' : '') + (st.grau[k] === q ? ' ok' : st.grau[k] > q ? ' ruim' : ''), 'data-k': ctx.chave + 'i' + k, disabled: f,
        style: { left: pos(x), top: pos(y) }, 'aria-label': 'Ilha ' + q + ', com ' + st.grau[k] + ' pontes', onclick: () => tocar(k) }, String(q)))),
      h('p', { class: 'pz-conta', text: sel == null ? 'Clique numa ilha, depois noutra na mesma linha: 1 ponte, 2 pontes, nenhuma.' : 'Agora a outra ilha.' }),
    ];
  });

  /* ---------------- trilhos ---------------- */
  const MODO_T = new Map();
  reg('trilhos', (jg, ctx) => {
    const p = jg.pub, n = p.n, f = fechado(jg, ctx), t = X.triT(jg), trav = new Set(lista(jg.estado.d, 0, n * n)), modo = MODO_T.get(ctx.chave) || 'p';
    const tem = i => X.temTrilho(jg, i);
    const fixa = i => i === p.ini || i === p.fim || p.dadas.includes(i) || trav.has(i);
    const tocar = (i, x) => { const a = t[i], m = x ? 'x' : modo, nv = m === 'x' ? (a === 'x' ? '.' : 'x') : a === '1' ? '.' : '1'; lance(jg, ctx, { t: trocaChar(t, i, nv) }, nv === '1' ? 'pôs um trilho' : nv === 'x' ? 'marcou um ✕' : 'tirou um trilho'); };
    const desenho = i => {
      const l = [];
      for (const [d, ca] of [['N', 'M12 12V0'], ['L', 'M12 12h12'], ['S', 'M12 12v12'], ['O', 'M12 12H0']]) { const v = X.passo(n, n, i, d); if ((v != null && tem(v)) || (i === p.ini && d === 'O') || (i === p.fim && d === p.saida)) l.push('<path d="' + ca + '"/>'); }
      l.push('<circle cx="12" cy="12" r="2.6" fill="currentColor"/>');
      const s = svg(30, l.join(''), '4'); s.setAttribute('preserveAspectRatio', 'none'); s.style.width = '100%'; s.style.height = '100%';
      return s;
    };
    const conta = cs => cs.filter(tem).length;
    const cel = [];
    for (let x = 0; x < n; x++) { const q = conta(seq(n).map(y => y * n + x)); cel.push(h('div', { class: 'ts-n' + (p.col[x] == null ? ' oculta' : q === p.col[x] ? ' ok' : q > p.col[x] ? ' ruim' : ''), 'data-k': ctx.chave + 'cl' + x, text: p.col[x] == null ? '?' : String(p.col[x]) })); }
    cel.push(h('div'));
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        cel.push(h('button', { type: 'button', class: 'tl-c' + (tem(i) ? ' tem-tr' : t[i] === 'x' ? ' xis' : '') + (fixa(i) ? ' dada' : '') + (i === p.ini ? ' ini' : i === p.fim ? ' fim' : ''), 'data-k': ctx.chave + 'c' + i, disabled: f || fixa(i), 'aria-label': 'Casa ' + (x + 1) + ', ' + (y + 1),
          onclick: () => tocar(i), oncontextmenu: ev => { ev.preventDefault(); if (!f && !fixa(i)) tocar(i, true); } }, tem(i) ? desenho(i) : t[i] === 'x' ? '✕' : null));
      }
      const q = conta(seq(n).map(x => y * n + x));
      cel.push(h('div', { class: 'ts-n' + (p.lin[y] == null ? ' oculta' : q === p.lin[y] ? ' ok' : q > p.lin[y] ? ' ruim' : ''), 'data-k': ctx.chave + 'rl' + y, text: p.lin[y] == null ? '?' : String(p.lin[y]) }));
    }
    return [
      f ? null : h('div', { class: 'seg pz-modo', role: 'group', 'aria-label': 'Marcar' }, [['p', 'Trilho'], ['x', 'Marcar ✕']].map(([v, tx]) => h('button', { type: 'button', 'data-k': ctx.chave + 'modo' + v, 'aria-pressed': String(modo === v), onclick: () => { MODO_T.set(ctx.chave, v); escolher(ctx, ctx.sel == null ? null : ctx.sel); } }, tx))),
      h('div', { class: 'tl', style: { gridTemplateColumns: 'repeat(' + (n + 1) + ', minmax(0, 1fr))', width: 'min(100%, ' + (n + 1) * 38 + 'px)' } }, cel),
      h('p', { class: 'pz-conta', text: 'O trem entra pela esquerda (casa verde) e sai pela casa vermelha. Uma linha só, sem encostar nela mesma.' }),
    ];
  });

  /* ---------------- constelação ---------------- */
  reg('constelacao', (jg, ctx) => {
    const p = jg.pub, f = fechado(jg, ctx), t = X.trilhaCon(jg), us = X.usadasCon(p, t) || [], ult = t[t.length - 1];
    const tocar = k => {
      if (!t.length) { if (p.ini != null && k !== p.ini) { aviso(ctx, 'Comecem na estrela que brilha.'); return; } lance(jg, ctx, { t: [k] }, 'começou o traço'); return; }
      const e = p.ar.findIndex((a, j) => !us.includes(j) && X.serveAresta(a, ult, k));
      if (e < 0) { aviso(ctx, p.ar.some(a => X.serveAresta(a, ult, k)) ? 'Essa linha já foi traçada.' : p.ar.some(a => a[2] && a[0] === k && a[1] === ult) ? 'Essa linha só vai no outro sentido.' : 'Não há linha daqui até lá.'); return; }
      lance(jg, ctx, { t: t.concat(k) }, 'traçou uma linha');
    };
    const linhas = p.ar.map((a, j) => { const [x1, y1] = p.st[a[0]], [x2, y2] = p.st[a[1]], usada = us.includes(j); let s = '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="' + (usada ? 'usada' : 'livre') + '"/>';
      if (a[2]) { const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, ang = Math.atan2(y2 - y1, x2 - x1), k = 3.2; s += '<path class="seta' + (usada ? ' usada' : '') + '" d="M' + (mx + Math.cos(ang) * k) + ' ' + (my + Math.sin(ang) * k) + 'L' + (mx + Math.cos(ang + 2.5) * k) + ' ' + (my + Math.sin(ang + 2.5) * k) + 'L' + (mx + Math.cos(ang - 2.5) * k) + ' ' + (my + Math.sin(ang - 2.5) * k) + 'z"/>'; }
      return s; }).join('');
    const fundo = svg(100, linhas, '1.3', '0 0 100 100'); fundo.setAttribute('class', 'cs-l'); fundo.setAttribute('preserveAspectRatio', 'none');
    return [
      h('div', { class: 'cs' }, fundo, p.st.map(([x, y], k) => h('button', { type: 'button', class: 'cs-s' + (k === ult ? ' aqui' : '') + (!t.length && k === p.ini ? ' ini' : '') + (t.includes(k) ? ' tocada' : ''), 'data-k': ctx.chave + 's' + k, disabled: f, style: { left: x + '%', top: y + '%' }, 'aria-label': 'Estrela ' + (k + 1), onclick: () => tocar(k) }))),
      f ? null : botoes(h('button', { type: 'button', class: 'btn sm', 'data-k': ctx.chave + 'desfaz', disabled: !t.length, onclick: () => lance(jg, ctx, { t: t.length > 1 ? t.slice(0, -1) : null }, 'desfez uma linha') }, 'Desfazer a última'),
        h('button', { type: 'button', class: 'btn sm', 'data-k': ctx.chave + 'recomeca', disabled: !t.length, onclick: () => lance(jg, ctx, { t: null }, 'recomeçou o traço') }, 'Recomeçar o traço')),
      h('p', { class: 'pz-conta', text: us.length + ' de ' + p.ar.length + ' linhas traçadas' }),
    ];
  });

  /* ---------------- encaixar peças ---------------- */
  const CORES_P = ['#e6ab4f', '#5b8fd9', '#d4574e', '#5aa469', '#9a6ad8', '#3fb8c4', '#e07bb0', '#c9a36b', '#8fa3bf', '#b5c95a'];
  reg('encaixar', (jg, ctx) => {
    const p = jg.pub, n = p.n, f = fechado(jg, ctx), sel = selDe(ctx, p.pecas.length), occ = X.ocupacao(jg, -1);
    const girar = (k, o) => lance(jg, ctx, { ['q' + k]: { a: null, o } }, 'virou uma peça');
    const tocar = i => {
      if (occ[i] != null) { const k = occ[i], e = X.pecaEst(jg, k); lance(jg, ctx, { ['q' + k]: { a: null, o: e.o } }, 'tirou uma peça'); escolher(ctx, k); return; }
      if (sel == null) { aviso(ctx, 'Escolham uma peça embaixo.'); return; }
      const e = X.pecaEst(jg, sel), cs = X.casasPeca(p, sel, i, e.o), oc = X.ocupacao(jg, sel);
      if (!cs || cs.some(c => p.bur.includes(c) || oc[c] != null)) { aviso(ctx, 'A peça não cabe aí.'); return; }
      escolher(ctx, null);
      lance(jg, ctx, { ['q' + sel]: { a: i, o: e.o } }, 'encaixou uma peça');
    };
    const mini = k => { const e = X.pecaEst(jg, k), fo = X.orientar(p.pecas[k], e.o), w = Math.max(...fo.map(c => c[0])) + 1, hh = Math.max(...fo.map(c => c[1])) + 1;
      return h('span', { class: 'ec-mini', style: { gridTemplateColumns: 'repeat(' + w + ', 12px)', gridTemplateRows: 'repeat(' + hh + ', 12px)' } }, fo.map(([x, y], j) => h('i', { class: j === 0 ? 'ancora' : '', style: { gridColumn: x + 1, gridRow: y + 1, background: CORES_P[k % CORES_P.length] } }))); };
    const fora = seq(p.pecas.length).filter(k => X.pecaEst(jg, k).a == null);
    return [
      grade(n, seq(n * n).map(i => h('button', { type: 'button', class: 'ec-c' + (p.bur.includes(i) ? ' buraco' : ''), 'data-k': ctx.chave + 'b' + i, disabled: f || p.bur.includes(i), style: occ[i] != null ? { background: CORES_P[occ[i] % CORES_P.length] } : null, 'aria-label': 'Casa ' + (i % n + 1) + ', ' + (Math.floor(i / n) + 1), onclick: () => tocar(i) })), 'ec', 40),
      h('div', { class: 'ec-band' }, fora.map(k => h('button', { type: 'button', class: 'ec-p' + (sel === k ? ' sel' : ''), 'data-k': ctx.chave + 'pc' + k, disabled: f, onclick: () => escolher(ctx, sel === k ? null : k), 'aria-label': 'Peça ' + (k + 1) }, mini(k)))),
      f || sel == null ? null : botoes(p.gira ? h('button', { type: 'button', class: 'btn sm', 'data-k': ctx.chave + 'girar', onclick: () => { const e = X.pecaEst(jg, sel); girar(sel, (e.o & 4) | (((e.o & 3) + 1) % 4)); } }, 'Girar ↻') : null,
        p.espelha ? h('button', { type: 'button', class: 'btn sm', 'data-k': ctx.chave + 'espelhar', onclick: () => { const e = X.pecaEst(jg, sel); girar(sel, e.o ^ 4); } }, 'Espelhar ⇋') : null),
      h('p', { class: 'pz-conta', text: sel == null ? 'Escolham uma peça; depois cliquem onde vai o quadradinho marcado dela.' : 'Agora cliquem no quadro: o quadradinho marcado vai ali.' }),
    ];
  });

  /* ---------------- mapa e bússola ---------------- */
  const ICO_MARCO = [
    '<path d="M5 10h14M7 10v9h10v-9M9 10V6h6v4"/>', '<path d="M12 21v-7M7 14a5 5 0 1 1 10 0z"/>', '<path d="M4 18l3-8 5-3 6 3 2 8z"/>', '<path d="M5 20V9l3-2v13M11 20V5l3 2v13M17 20v-8"/>',
    '<circle cx="12" cy="5" r="2.2"/><path d="M9 20v-8l3-3 3 3v8M7 20h10"/>', '<path d="M12 4c3 4 5 6 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 0-5 1-8z"/>', '<path d="M12 3v18M7 8h10"/>',
    '<path d="M7 20v-8h10v8M6 12h12M9 12V9M15 12V10"/>', '<path d="M12 9v12M12 9 6 4M12 9l6-5M12 9l5 6M12 9l-5 6"/>', '<path d="M3 15c3-3 6 3 9 0s6 3 9 0M5 11c2-2 4 2 7 0"/>',
  ];
  reg('bussola', (jg, ctx) => {
    const p = jg.pub, n = p.n, f = fechado(jg, ctx), err = new Set(lista(jg.estado.e, 0, n * n)), dc = lista(jg.estado.dc, 0, n * n);
    const marco = i => p.marcos.find(m => m[0] === i);
    const cel = seq(n * n).map(i => { const m = marco(i), k = dc.lastIndexOf(i);
      return h('button', { type: 'button', class: 'bs-c' + (err.has(i) ? ' errada' : '') + (k >= 0 ? ' trilha' : ''), 'data-k': ctx.chave + 'm' + i, disabled: f || err.has(i), title: m ? X.MARCOS[m[1]] : null, 'aria-label': (m ? X.MARCOS[m[1]] + ', ' : '') + 'casa ' + (i % n + 1) + ', ' + (Math.floor(i / n) + 1),
        onclick: () => tentativa(jg, ctx, E.provaDoEstado(jg, { c: i }), { e: [...err, i] }, 'cavou no lugar errado', {}, 'achou o tesouro') },
        m ? svg(20, ICO_MARCO[m[1]], '1.6') : err.has(i) ? '✕' : k >= 0 ? h('small', { text: String(k) }) : null); });
    return [
      h('ol', { class: 'bs-in' }, p.ins.map((t, k) => h('li', { 'data-k': ctx.chave + 'in' + k, class: k > 0 && k <= (jg.estado.d || 0) ? 'feita' : '' }, t))),
      p.legua ? h('p', { class: 'pz-dica', text: 'Uma légua são 2 casas.' }) : null,
      h('div', { class: 'bs-map' }, h('span', { class: 'bs-rosa', 'aria-hidden': 'true' }, 'N ↑'), grade(n, cel, 'bs', 38)),
      h('p', { class: 'pz-conta', text: 'Passem o mouse num desenho para ver o nome. No fim, cliquem onde está o tesouro (errar conta um erro).' }),
      h('div', { class: 'bs-leg' }, [...new Set(p.marcos.map(m => m[1]))].map(t => h('span', null, svg(16, ICO_MARCO[t], '1.6'), X.MARCOS[t]))),
    ];
  });

  /* ---------------- cavalo do rei ---------------- */
  const CAVALO = '<path d="M7 20h11M8 20c0-4 2-6 4-8-2 0-4 1-5 0 0-3 3-7 7-8l1 2c2 2 3 5 2 8-1 2-2 4-2 6"/>';
  reg('cavalo', (jg, ctx) => {
    const p = jg.pub, n = p.n, f = fechado(jg, ctx), t = X.trilhaCav(jg), ult = t[t.length - 1], prox = new Set(ult == null ? [] : X.saltos(n, ult).filter(j => !t.includes(j) && !p.pedras.includes(j)));
    const tocar = i => {
      if (!t.length) { if (p.ini != null && i !== p.ini) { aviso(ctx, 'Comecem na casa marcada.'); return; } lance(jg, ctx, { t: [i] }, 'pôs o cavalo'); return; }
      if (!prox.has(i)) { aviso(ctx, t.includes(i) ? 'O cavalo já passou por ali.' : 'O cavalo anda em “L”: duas casas e uma de lado.'); return; }
      lance(jg, ctx, { t: t.concat(i) }, 'pulou com o cavalo');
    };
    const cel = seq(n * n).map(i => { const x = i % n, y = Math.floor(i / n), k = t.indexOf(i), pedra = p.pedras.includes(i);
      return h('button', { type: 'button', class: 'cv-c' + ((x + y) % 2 ? ' esc' : '') + (pedra ? ' pedra' : '') + (k >= 0 ? ' feita' : '') + (prox.has(i) ? ' pode' : '') + (!t.length && i === p.ini ? ' ini' : '') + (i === p.fim ? ' fim' : ''), 'data-k': ctx.chave + 'm' + i, disabled: f || pedra, 'aria-label': 'Casa ' + (x + 1) + ', ' + (y + 1), onclick: () => tocar(i) },
        pedra ? svg(18, PEDRA, '1.6') : i === ult ? svg(22, CAVALO, '1.8') : k >= 0 ? h('small', { text: String(k + 1) }) : i === p.fim ? svg(14, BANDEIRA, '2') : null); });
    return [
      grade(n, cel, 'cv', 40),
      f ? null : botoes(h('button', { type: 'button', class: 'btn sm', 'data-k': ctx.chave + 'desfaz', disabled: !t.length, onclick: () => lance(jg, ctx, { t: t.length > 1 ? t.slice(0, -1) : null }, 'voltou um pulo') }, 'Voltar um pulo'),
        h('button', { type: 'button', class: 'btn sm', 'data-k': ctx.chave + 'recomeca', disabled: !t.length, onclick: () => lance(jg, ctx, { t: null }, 'recomeçou o cavalo') }, 'Recomeçar')),
      h('p', { class: 'pz-conta', text: t.length + ' de ' + (n * n - p.pedras.length) + ' casas' + (p.fim != null ? ' · terminem na bandeira' : '') }),
    ];
  });
})();
