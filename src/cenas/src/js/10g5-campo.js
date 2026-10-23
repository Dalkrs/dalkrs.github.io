/* ---------------------------------------------------------------
   10g5. CAMPO — o campo de batalha (lote 18)
   Nasce da janela da Batalha do Mapa-múndi ("Abrir no campo de batalha…"): a janela "Gerar um lugar" abre com a cena do
   hexágono da batalha (o terreno dele) e um bloco a mais, o do campo: os dois exércitos e quantos soldados vão em cada
   bloco (de começo, 100). Ao criar, os dois exércitos ficam frente a frente, em blocos (os de soldados na frente; os
   magos e as máquinas de cerco atrás), cada bloco um token com a barra dos soldados.
   Quem move: o mestre move todos; o jogador cuja ficha é o comandante do exército (ou, sem ele, o governante da
   facção) é o dono dos blocos daquele lado.
   A leitura do campo (a aba Cena): o flanco, o terreno alto, a cobertura e a reserva viram bônus sugeridos — "Levar
   para a batalha…" abre a batalha no Mapa-múndi com eles, e lá o mestre soma o que quiser. No "Depois" da batalha, as
   perdas voltam para cá: a prévia mostra quanto cada bloco perde (os que estão na luta perdem mais); confirmar é um
   passo só (o Desfazer volta).
   --------------------------------------------------------------- */
const Campo = (() => {
  const MAX_BLOCOS = 40;                 // por lado (os de soldados, os magos e as máquinas, juntos)
  const POR_MIN = 10, POR_MAX = 100000;
  const txt = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
  const idOk = v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(v);
  const corOk = v => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : null);
  const inteiro = (v, a, b) => clamp(Math.round(Number(v) || 0), a, b);
  // o pedido do Mapa-múndi, arrumado (ou null)
  function valida(c) {
    if (!c || typeof c !== 'object') return null;
    const lado = (o, cor0) => (o && typeof o === 'object' && idOk(o.g) ? {
      g: o.g, nome: txt(o.nome, 60) || 'Exército', fac: idOk(o.fac) ? o.fac : null, cor: corOk(o.cor) || cor0,
      cmd: idOk(o.cmd) ? o.cmd : null, gov: idOk(o.gov) ? o.gov : null,
      unid: (Array.isArray(o.unid) ? o.unid : []).filter(u => u && typeof u === 'object').slice(0, 30).map(u => ({ nome: txt(u.nome, 40) || 'Unidade', tipo: txt(u.tipo, 30), tropas: inteiro(u.tropas, 0, 1e7), magos: inteiro(u.magos, 0, 1e6), maq: inteiro(u.maq, 0, 1e4) })).filter(u => u.tropas > 0 || u.magos > 0 || u.maq > 0),
    } : null);
    const a = lado(c.a, '#b03a2e'), b = lado(c.b, '#2e6db0');
    if (!a || !b || a.g === b.g) return null;
    return { mapa: idOk(c.mapa) ? c.mapa : null, a, b, ladoA: ['o', 'l', 'n', 's'].includes(c.ladoA) ? c.ladoA : 'o', por: inteiro(c.por || 100, POR_MIN, POR_MAX) };
  }
  const OPOSTO = { o: 'l', l: 'o', n: 's', s: 'n' };
  // os blocos de um lado: [{ k: 'sold' | 'mago' | 'cerco', nome, n, u (a unidade) }]
  function blocos(L, por) {
    const out = [];
    for (const [ui, u] of L.unid.entries()) {
      const nb = Math.ceil(u.tropas / por);
      for (let i = 0; i < nb; i++) out.push({ k: 'sold', nome: u.nome + (nb > 1 ? ' ' + (i + 1) : ''), n: Math.min(por, u.tropas - i * por), u: ui });
    }
    for (const [ui, u] of L.unid.entries()) {
      if (u.magos) out.push({ k: 'mago', nome: 'Magos de ' + u.nome, n: u.magos, u: ui });
      if (u.maq) out.push({ k: 'cerco', nome: 'Cerco de ' + u.nome, n: u.maq, u: ui });
    }
    return out;
  }
  const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
  function textoDoLado(L, por) {
    const bs = blocos(L, por), s = bs.filter(b => b.k === 'sold').length, mg = bs.filter(b => b.k === 'mago').length, mq = bs.filter(b => b.k === 'cerco').length;
    return L.nome + ': ' + plural(s, 'bloco de soldados', 'blocos de soldados') + (mg ? ', ' + plural(mg, 'de magos', 'de magos') : '') + (mq ? ', ' + plural(mq, 'de cerco', 'de cerco') : '') + (bs.length > MAX_BLOCOS ? ' — passa de ' + MAX_BLOCOS + ': só os ' + MAX_BLOCOS + ' primeiros entram (ponha mais soldados por bloco)' : '');
  }
  // quem move um lado: o dono da ficha do comandante (ou, sem ela, a do governante da facção) → { id, nome, por } | null
  function quemMove(L) {
    if (typeof Fichas === 'undefined' || !Fichas.on()) return null;
    for (const [f, por] of [[L.cmd, 'o comandante'], [L.gov, 'o governante da facção']]) {
      const l = f ? Fichas.get(f) : null, j = l && l.dono_id ? playerById(l.dono_id) : null;
      if (j) return { id: j.id, nome: j.name, por, ficha: l.nome || '' };
    }
    return null;
  }
  // o bloco da janela "Gerar um lugar" (só com o pedido do Mapa-múndi): os dois lados e os soldados por bloco
  function bloco(c, comum, K, mudou) {
    const { field, inNum, note } = K;
    const quem = L => { const q = quemMove(L); return q ? ' Move: ' + q.nome + ' (' + q.por + ').' : ''; };
    return h('div', { class: 'ger-hex cp-bloco', id: 'cp-bloco' },
      h('b', { text: 'O campo de batalha' }),
      field('Soldados por bloco', inNum('cp-por', comum.campoPor, v => { comum.campoPor = inteiro(v, POR_MIN, POR_MAX); mudou(); }, { min: POR_MIN, max: POR_MAX, step: 10, label: 'Quantos soldados vão em cada bloco (cada bloco é um token)' }), 'stack'),
      h('p', { class: 'note', id: 'cp-a', text: textoDoLado(c.a, comum.campoPor) + '.' + quem(c.a) }),
      h('p', { class: 'note', id: 'cp-b', text: textoDoLado(c.b, comum.campoPor) + '.' + quem(c.b) }),
      note('Os dois exércitos ficam frente a frente, com os soldados na frente e os magos e as máquinas atrás. Você move todos; o comandante (ou o governante da facção) move os blocos dele.'));
  }

  /* ---- montar: os blocos na cena nova ---- */
  // os lugares de um lado, linha por linha (da frente para trás; em cada linha, do meio para fora), em quadrados:
  // [[[x, y] do canto do bloco de 2, …], …]
  function vagas(sc, lado) {
    const W = sc.cols, H = sc.rows, hor = lado === 'o' || lado === 'l', U = hor ? H : W, V = hor ? W : H;
    const frente = Math.round(V * 0.3), out = [];
    const porLinha = Math.max(1, Math.floor((U - 2) / 3)), meio = (U - 2) / 2;
    for (let li = 0; frente - li * 3 >= 1; li++) {
      const v = frente - li * 3, linha = [];
      out.push(linha);
      for (let k = 0; k < porLinha; k++) {
        const off = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2), u = Math.round(meio + off * 3);
        if (u < 1 || u > U - 3) continue;
        const vv = lado === 'o' || lado === 'n' ? v - 1 : V - v - 1;
        linha.push(hor ? [vv, u] : [u, vv]);
      }
    }
    return out;
  }
  // o chão do bloco: não na água, nem na parede
  function livre(sc, x, y, s) {
    const c = sc.cell;
    for (const [dx, dy] of [[0.5, 0.5], [s - 0.5, 0.5], [0.5, s - 0.5], [s - 0.5, s - 0.5], [s / 2, s / 2]]) {
      const ter = Combate.terrainAt(sc, (x + dx) * c, (y + dy) * c);
      if (ter && ter.ter.t === 'agua') return false;
    }
    return true;
  }
  function montar(sc, c, por) {
    if (!sc || !c) return { a: 0, b: 0 };
    por = inteiro(por || c.por, POR_MIN, POR_MAX);
    const cel = sc.cell, conta = {};
    for (const q of ['a', 'b']) {
      const L = c[q], lado = q === 'a' ? c.ladoA : OPOSTO[c.ladoA], dono = quemMove(L);
      const bs = blocos(L, por).slice(0, MAX_BLOCOS), linhas = vagas(sc, lado).map(l => l.filter(([x, y]) => livre(sc, x, y, 2))).filter(l => l.length);
      // os soldados enchem as linhas da frente; os magos e as máquinas começam na linha de trás da última dos soldados
      let li = 0, k = 0, i = 0, atras = false;
      const proxima = () => { while (li < linhas.length && k >= linhas[li].length) { li++; k = 0; } return li < linhas.length ? linhas[li][k++] : null; };
      for (const b of bs) {
        if (b.k !== 'sold' && !atras) { atras = true; if (k > 0) { li++; k = 0; } }
        const v = proxima();
        if (!v) break;
        i++;
        const s = b.k === 'mago' ? 1 : 2, x = v[0] + (s === 1 ? 0.5 : 0), y = v[1] + (s === 1 ? 0.5 : 0);
        const t = newToken(sc, x * cel, y * cel, { name: b.nome, color: L.cor, size: s });
        t.bars = [cleanBar({ n: b.k === 'sold' ? 'Soldados' : b.k === 'mago' ? 'Magos' : 'Máquinas', c: '#c9a227', v: b.n, m: b.n, k: 'bar', on: true })];
        t.bloco = { l: q, k: b.k, n0: b.n };
        if (dono) t.owner = dono.id;
        sc.tokens.push(t);
      }
      conta[q] = Math.min(i, bs.length);
    }
    sc.campo = { mapa: c.mapa, por, ladoA: c.ladoA, a: { g: c.a.g, nome: c.a.nome, cor: c.a.cor }, b: { g: c.b.g, nome: c.b.nome, cor: c.b.cor } };
    sc.perms = Object.assign({}, sc.perms, { mover: true });
    normalizeScene(sc); Persist.scene(sc.id);
    return conta;
  }
  const feitoTxt = (c, conta) => `Os exércitos estão frente a frente: ${c.a.nome} (${plural(conta.a || 0, 'bloco', 'blocos')}) e ${c.b.nome} (${plural(conta.b || 0, 'bloco', 'blocos')}). A leitura do campo e "Levar para a batalha…" ficam na aba Cena.`;

  /* ---- a leitura do campo: os bônus sugeridos ---- */
  function blocosNaCena(sc) {
    const c = sc.cell, out = { a: [], b: [] };
    for (const t of sc.tokens) if (t.bloco && (t.bloco.l === 'a' || t.bloco.l === 'b') && !t.hidden) out[t.bloco.l].push({ t, x: (t.x + t.size * c / 2) / c, y: (t.y + t.size * c / 2) / c, n: (t.bars[0] && t.bars[0].v) || 0 });
    return out;
  }
  const PERTO = 3.5;                    // a luta: os centros a até três quadrados e meio
  function leitura(sc) {
    const C = sc && sc.campo, out = { a: [], b: [] };
    if (!C) return out;
    const B = blocosNaCena(sc), dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
    for (const q of ['a', 'b']) {
      const o = q === 'a' ? 'b' : 'a', meus = B[q], deles = B[o];
      if (!meus.length || !deles.length) continue;
      const naLuta = meus.filter(p => deles.some(e => dist(p, e) <= PERTO));
      // o flanco: o bloco deles pego por dois dos meus de lados diferentes (90° ou mais entre eles) ou atacado por trás
      // (do lado oposto ao do meu exército, para quem ele olha)
      const cx = meus.reduce((s0, p) => s0 + p.x, 0) / meus.length, cy = meus.reduce((s0, p) => s0 + p.y, 0) / meus.length;
      const flanq = deles.filter(e => {
        const vs = meus.map(p => [p.x - e.x, p.y - e.y]).map(([dx, dy]) => [dx, dy, Math.hypot(dx, dy)]).filter(v => v[2] <= PERTO && v[2] > 1e-6).map(([dx, dy, d]) => [dx / d, dy / d]);
        if (!vs.length) return false;
        for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) if (vs[i][0] * vs[j][0] + vs[i][1] * vs[j][1] <= 1e-6) return true;
        const fx = cx - e.x, fy = cy - e.y, fd = Math.hypot(fx, fy);
        return fd > 1e-6 && vs.some(v => (v[0] * fx + v[1] * fy) / fd < -0.5);
      }).length;
      if (flanq) out[q].push({ k: 'flanco', v: Math.min(3, flanq), txt: plural(flanq, 'bloco inimigo atacado pelo lado ou por trás', 'blocos inimigos atacados pelo lado ou por trás') });
      // o terreno alto: os meus, na luta, mais altos que o inimigo mais perto
      if (Relevo.temRelevo(sc) && naLuta.length) {
        const alto = naLuta.filter(p => { const e = deles.reduce((m0, x) => (!m0 || dist(p, x) < dist(p, m0) ? x : m0), null); return Relevo.alturaDoToken(p.t, sc) - Relevo.alturaDoToken(e.t, sc) >= 1 - 1e-6; }).length;
        if (alto) out[q].push({ k: 'alto', v: alto * 2 >= naLuta.length ? 2 : 1, txt: plural(alto, 'bloco no alto', 'blocos no alto') + ' (de ' + naLuta.length + ' na luta)' });
      }
      // a cobertura: os meus na mata
      const mata = meus.filter(p => { const s = Combate.terrainOf(p.t, sc); return !!s && s.ter.t === 'mata'; }).length;
      if (mata && mata * 3 >= meus.length) out[q].push({ k: 'cobertura', v: mata * 3 >= meus.length * 2 ? 2 : 1, txt: plural(mata, 'bloco na mata', 'blocos na mata') });
      // a reserva: os de soldados longe da luta, quando há luta
      const res = meus.filter(p => p.t.bloco.k === 'sold' && !deles.some(e => dist(p, e) <= PERTO * 2)).length;
      if (naLuta.length && res) out[q].push({ k: 'reserva', v: 1, txt: plural(res, 'bloco de soldados na reserva', 'blocos de soldados na reserva') });
    }
    return out;
  }
  const NOME_SUG = { flanco: 'Flanco', alto: 'Terreno alto', cobertura: 'Cobertura', reserva: 'Reserva' };
  const sinal = n => (n < 0 ? '−' : '+') + Math.abs(n);
  function levarParaABatalha() {
    const sc = Store.scene();
    if (!isGM() || !sc || !sc.campo) return;
    const C = sc.campo, sug = leitura(sc), B = blocosNaCena(sc);
    const linhas = q => (sug[q].length ? sug[q].map(x => h('li', { text: NOME_SUG[x.k] + ' ' + sinal(x.v) + ' — ' + x.txt })) : [h('li', { class: 'muted', text: 'nada a sugerir' })]);
    const soma = q => B[q].filter(p => p.t.bloco.k === 'sold').reduce((s0, p) => s0 + p.n, 0);
    const pode = !!(window.TC && window.TC.ponte && window.TC.ponte.ir && window.TC.ponte.naCasca && C.mapa);
    UI.modal({ title: 'Levar o campo para a batalha?', text: 'O que o campo sugere (no Mapa-múndi, você soma o que quiser):',
      body: h('div', { class: 'cp-leitura', id: 'cp-leitura' },
        ...['a', 'b'].map(q => h('div', { class: 'cp-lado', 'data-lado': q }, h('b', { text: C[q].nome + ' · ' + soma(q) + ' soldados em campo' }), h('ul', null, linhas(q))))),
      actions: [{ label: 'Cancelar' }, { label: pode ? 'Abrir a batalha no Mapa-múndi' : 'Fechar', kind: 'primary', run: () => {
        if (!pode) return;
        window.TC.ponte.ir('mundo', { mapa: C.mapa, campo: { cena: sc.id, a: C.a.g, b: C.b.g, sug } });
      } }] });
    if (!pode) UI.toast('A batalha abre no Mapa-múndi dentro do site, com a mesa aberta.');
  }

  /* ---- as perdas da batalha: { a: { g, t0, t1 }, b: … } ---- */
  function repartir(blocos0, perda) {
    // quem está na luta pesa o dobro; o arredondamento vai para os maiores
    const w = blocos0.map(p => p.n * (p.luta ? 2 : 1)), W = w.reduce((s0, x) => s0 + x, 0) || 1, total = blocos0.reduce((s0, p) => s0 + p.n, 0);
    let falta = Math.min(perda, total);
    const tira = blocos0.map((p, i) => Math.min(p.n, Math.floor(falta * w[i] / W)));
    falta -= tira.reduce((s0, x) => s0 + x, 0);
    const ordem = blocos0.map((p, i) => i).sort((i, j) => w[j] - w[i]);
    for (let k = 0; falta > 0 && k < ordem.length * 4; k++) { const i = ordem[k % ordem.length]; if (tira[i] < blocos0[i].n) { tira[i]++; falta--; } }
    return tira;
  }
  function previaDasPerdas(sc, P) {
    const B = blocosNaCena(sc), out = [];
    for (const q of ['a', 'b']) {
      const r = P && P[q];
      if (!r || !(r.t0 > 0) || sc.campo[q].g !== r.g) continue;
      const frac = clamp(1 - (Number(r.t1) || 0) / r.t0, 0, 1), sold = B[q].filter(p => p.t.bloco.k === 'sold');
      const deles = B[q === 'a' ? 'b' : 'a'];
      for (const p of sold) p.luta = deles.some(e => Math.hypot(p.x - e.x, p.y - e.y) <= PERTO);
      const total = sold.reduce((s0, p) => s0 + p.n, 0), perda = Math.round(total * frac), tira = repartir(sold, perda);
      out.push({ q, nome: sc.campo[q].nome, total, perda, frac, linhas: sold.map((p, i) => ({ id: p.t.id, nome: tokName(p.t), de: p.n, para: p.n - tira[i] })).filter(x => x.para !== x.de) });
    }
    return out;
  }
  function perdas(P) {
    const sc = Store.scene();
    if (!isGM() || !sc || !sc.campo) return;
    const pv = previaDasPerdas(sc, P);
    if (!pv.length) { UI.toast('As perdas dessa batalha não são dos exércitos deste campo.'); return; }
    UI.modal({ title: 'As perdas da batalha', text: 'Quanto cada bloco perde (os que estão na luta perdem mais). O bloco que chega a zero sai do campo. Dá para desfazer.',
      body: h('div', { class: 'cp-perdas', id: 'cp-perdas' }, ...pv.map(L => h('div', { class: 'cp-lado', 'data-lado': L.q },
        h('b', { text: L.nome + ': ' + L.total + ' → ' + (L.total - L.perda) + ' soldados' + (Math.round(L.frac * 100) ? ' (−' + Math.round(L.frac * 100) + '%)' : ' (sem perdas)') }),
        h('ul', null, L.linhas.length ? L.linhas.map(x => h('li', { text: x.nome + ': ' + x.de + ' → ' + x.para + (x.para <= 0 ? ' (sai do campo)' : '') })) : [h('li', { class: 'muted', text: 'nenhuma perda' })])))),
      actions: [{ label: 'Cancelar' }, { label: 'Aplicar as perdas', kind: 'primary', run: () => {
        const fora = [];
        Store.tx('As perdas da batalha', () => {
          for (const L of pv) for (const x of L.linhas) {
            const t = Store.get('tokens', x.id);
            if (!t) continue;
            if (x.para <= 0) fora.push(t.id); else Store.upd('tokens', t.id, { bars: t.bars.map((b, i) => (i === 0 ? Object.assign({}, b, { v: x.para }) : b)) });
          }
          tirarTokens(Store.scene(), fora);
        });
        const saem = fora.length;
        UI.toast('As perdas foram para os blocos: ' + pv.map(L => L.nome + ' −' + L.perda).join(', ') + (saem ? ' (' + plural(saem, 'bloco saiu', 'blocos saíram') + ' do campo)' : '') + '.', { action: 'Desfazer', run: Tools.undo, long: true });
      } }] });
  }

  // a seção da aba Cena (só o mestre; só num campo de batalha)
  function secao(K) {
    const sc = Store.scene();
    if (!isGM() || !sc || !sc.campo) return null;
    const { sec, note, btn } = K, B = blocosNaCena(sc), C = sc.campo;
    const linha = q => { const s = B[q].filter(p => p.t.bloco.k === 'sold'); return C[q].nome + ': ' + plural(B[q].length, 'bloco', 'blocos') + ', ' + s.reduce((s0, p) => s0 + p.n, 0) + ' soldados'; };
    const sug = leitura(sc), n = sug.a.length + sug.b.length;
    return sec('c-campo', 'Campo de batalha', true,
      h('p', { class: 'note', id: 'cp-resumo', text: linha('a') + ' · ' + linha('b') + '.' }),
      h('p', { class: 'note', id: 'cp-sug', text: n ? 'O campo sugere: ' + ['a', 'b'].flatMap(q => sug[q].map(x => C[q].nome + ' ' + NOME_SUG[x.k].toLowerCase() + ' ' + sinal(x.v))).join(' · ') + '.' : 'Nenhum bônus sugerido agora (ninguém flanqueado, no alto, na mata ou na reserva).' }),
      btn('Levar para a batalha…', levarParaABatalha, { icon: 'next', id: 'cp-levar' }),
      note('A posição dos blocos sugere bônus na batalha do Mapa-múndi (lá você confirma). Depois da batalha, as perdas voltam aos blocos.'));
  }
  return { MAX_BLOCOS, valida, blocos, textoDoLado, quemMove, bloco, vagas, montar, feitoTxt, leitura, levarParaABatalha, repartir, previaDasPerdas, perdas, secao };
})();
