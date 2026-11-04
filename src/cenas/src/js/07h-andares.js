/* ---------------------------------------------------------------
   7h. ANDARES — trocar de cena pelas passagens (escadas, portas, saídas)  (lote 82)
   As contas de quem passa de uma cena para outra, sem banco e sem tela (quem grava é a Nuvem, na mesa, ou o Persist,
   fora dela):
     · nivelDe ......... o andar de uma cena: o campo `nivel` (−1 subsolo, 0 térreo, 1 2º andar…); sem ele, a ordem das
                         cenas (a de cima na lista é a de baixo no prédio)
     · passagens ....... as passagens de uma cena que levam a outra
     · usadaPor ........ a passagem que um grupo de tokens usa: a mais perto deles
     · pertoDaPassagem . o token está a até 1 quadrado da passagem (a regra "Só pela escada")
     · chegada ......... onde cada token aparece na outra cena:
         - andares alinhados (mesmas colunas, linhas e quadrado): na mesma casa em que estava; ocupada ou com parede,
           na casa livre mais perto, em volta da passagem de volta mais perto dela;
         - andares de tamanhos diferentes: ao lado da passagem de volta mais perto do lugar da passagem usada (em
           proporção), mantendo a formação do grupo;
         - nunca numa casa com parede, nunca em cima de outro token nem de uma passagem.
     · mover / voltar .. passa os tokens de uma cena para a outra (um passo em cada cena) e desfaz
   --------------------------------------------------------------- */
const Andares = (() => {
  const S = Store.S;
  const ehPassagem = t => !!t && !!t.prop && typeof t.cena === 'string' && !!t.cena;
  const lado = t => Math.max(1, Math.ceil(t.size || 1));
  const celDe = (sc, t) => [Math.round(t.x / sc.cell), Math.round(t.y / sc.cell)];
  const centro = (sc, t) => [t.x + lado(t) * sc.cell / 2, t.y + lado(t) * sc.cell / 2];

  function nivelDe(id) {
    const sc = S.scenes[id];
    if (sc && Number.isFinite(sc.nivel)) return sc.nivel;
    const i = S.order.indexOf(id);
    return i < 0 ? 0 : i;
  }
  const passagens = (sc, para) => (sc ? sc.tokens.filter(t => ehPassagem(t) && t.cena === para) : []);
  function maisPerto(sc, lista, x, y) {
    let melhor = null, d = Infinity;
    for (const p of lista) { const [px, py] = centro(sc, p), e = Math.hypot(px - x, py - y); if (e < d) { d = e; melhor = p; } }
    return melhor;
  }
  function centroDoGrupo(sc, toks) {
    let x = 0, y = 0;
    for (const t of toks) { const c = centro(sc, t); x += c[0]; y += c[1]; }
    return [x / toks.length, y / toks.length];
  }
  // a passagem de `sc` para `para` que o grupo usa: a mais perto do centro dele
  function usadaPor(sc, toks, para) {
    const l = passagens(sc, para);
    if (!l.length || !toks.length) return l[0] || null;
    const [x, y] = centroDoGrupo(sc, toks);
    return maisPerto(sc, l, x, y);
  }
  // as casas de um token e as de uma passagem se tocam ou ficam a até 1 quadrado
  function pertoDaPassagem(sc, t, p) {
    const [a, b] = celDe(sc, t), [c, d] = celDe(sc, p), st = lado(t), sp = lado(p);
    const dx = Math.max(0, c - (a + st - 1), a - (c + sp - 1)), dy = Math.max(0, d - (b + st - 1), b - (d + sp - 1));
    return Math.max(dx, dy) <= 1;
  }

  /* As casas ocupadas de uma cena: os tokens (menos os que estão saindo de lá, `fora`) e as passagens. */
  function ocupadas(sc, fora) {
    const occ = new Set();
    for (const o of sc.tokens) {
      if (fora && fora.has(o.id)) continue;
      if (o.prop && !ehPassagem(o)) continue;              // (um móvel não impede de chegar; uma passagem, sim: senão o token voltaria)
      const [c0, r0] = celDe(sc, o), so = lado(o);
      for (let i = 0; i < so; i++) for (let j = 0; j < so; j++) occ.add((c0 + i) + ',' + (r0 + j));
    }
    return occ;
  }
  // uma parede corta o quadrado (a casa, ou as casas de um token grande)?
  function temParede(sc, cx, cy, s) {
    const c = sc.cell, m = 2, x0 = cx * c + m, y0 = cy * c + m, x1 = (cx + s) * c - m, y1 = (cy + s) * c - m;
    const segs = typeof Walls !== 'undefined' ? Walls.of(sc).move : [];
    const dentro = (x, y) => x > x0 && x < x1 && y > y0 && y < y1;
    for (let i = 0; i < segs.length; i += 4) {
      const ax = segs[i], ay = segs[i + 1], bx = segs[i + 2], by = segs[i + 3];
      if (Math.max(ax, bx) < x0 || Math.min(ax, bx) > x1 || Math.max(ay, by) < y0 || Math.min(ay, by) > y1) continue;
      if (dentro(ax, ay) || dentro(bx, by)) return true;
      if (Geo.segHit(ax, ay, bx, by, x0, y0, x1, y0) || Geo.segHit(ax, ay, bx, by, x1, y0, x1, y1) || Geo.segHit(ax, ay, bx, by, x1, y1, x0, y1) || Geo.segHit(ax, ay, bx, by, x0, y1, x0, y0)) return true;
    }
    return false;
  }
  function livre(sc, cx, cy, s, occ) {
    if (cx < 0 || cy < 0 || cx + s > sc.cols || cy + s > sc.rows) return false;
    for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) if (occ.has((cx + i) + ',' + (cy + j))) return false;
    return !temParede(sc, cx, cy, s);
  }
  // a casa livre mais perto de (cx, cy), em anéis (até 12 quadrados); sem nenhuma, null
  function perto(sc, cx, cy, s, occ) {
    if (livre(sc, cx, cy, s, occ)) return [cx, cy];
    for (let r = 1; r <= 12; r++) {
      const cands = [];
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r) cands.push([cx + dx, cy + dy, Math.hypot(dx, dy)]);
      cands.sort((p, q) => p[2] - q[2]);
      for (const [x, y] of cands) if (livre(sc, x, y, s, occ)) return [x, y];
    }
    return null;
  }
  const marcar = (occ, cx, cy, s) => { for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) occ.add((cx + i) + ',' + (cy + j)); };

  /* Onde os tokens `toks` (de A) aparecem em B. usada: a passagem de A que eles usam (sem ela, a mais perto). →
     [{ id, x, y }] (o canto de cima à esquerda, em unidades da cena), na ordem de `toks`. */
  function chegada(A, B, toks, usada) {
    if (!A || !B || !toks.length) return [];
    const alinhados = A.cols === B.cols && A.rows === B.rows && A.cell === B.cell;
    const p = usada || usadaPor(A, toks, B.id), voltas = passagens(B, A.id);
    const occ = ocupadas(B, new Set(toks.map(t => t.id)));
    const out = [];
    // o ponto de referência em B: o lugar da passagem usada, em proporção (alinhados: o mesmo)
    const [ux, uy] = p ? centro(A, p) : centroDoGrupo(A, toks);
    const rx = ux / (A.cols * A.cell) * B.cols * B.cell, ry = uy / (A.rows * A.cell) * B.rows * B.cell;
    const voltaRef = voltas.length ? maisPerto(B, voltas, rx, ry) : null;
    const cel = ([x, y]) => [Math.floor(x / B.cell), Math.floor(y / B.cell)];
    const [ac, ar] = voltaRef ? celDe(B, voltaRef) : cel([rx, ry]);
    // a formação: cada um na mesma posição em relação ao primeiro (o mais perto da passagem usada)
    const lider = toks.slice().sort((t, q) => Math.hypot(centro(A, t)[0] - ux, centro(A, t)[1] - uy) - Math.hypot(centro(A, q)[0] - ux, centro(A, q)[1] - uy))[0];
    const [lc, lr] = celDe(A, lider);
    const ordem = [lider].concat(toks.filter(t => t !== lider));
    const lugar = new Map();
    // não alinhados: a formação inteira no primeiro lugar livre em volta da escada de volta (anéis a partir dela)
    let base = null;
    if (!alinhados) {
      const cabe = (bx, by) => { const o2 = new Set(occ); for (const t of ordem) { const s = lado(t), [tc, tr] = celDe(A, t), x = bx + tc - lc, y = by + tr - lr; if (!livre(B, x, y, s, o2)) return false; marcar(o2, x, y, s); } return true; };
      for (let r = voltaRef ? 1 : 0; r <= 12 && !base; r++) {
        const cands = [];
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r) cands.push([ac + dx, ar + dy, Math.hypot(dx, dy)]);
        cands.sort((p, q) => p[2] - q[2]);
        for (const [x, y] of cands) if (cabe(x, y)) { base = [x, y]; break; }
      }
    }
    for (const t of ordem) {
      const s = lado(t), [tc, tr] = celDe(A, t);
      let alvo = null;
      if (alinhados) {
        if (livre(B, tc, tr, s, occ)) alvo = [tc, tr];
        else {
          // ocupada ou com parede: em volta da passagem de volta mais perto dela
          const v = voltas.length ? maisPerto(B, voltas, (tc + s / 2) * B.cell, (tr + s / 2) * B.cell) : null;
          alvo = v ? perto(B, ...celDe(B, v), s, occ) : perto(B, tc, tr, s, occ);
        }
      } else {
        const dc = tc - lc, dr = tr - lr;
        alvo = base ? [base[0] + dc, base[1] + dr] : perto(B, ac + dc, ar + dr, s, occ) || perto(B, ac, ar, s, occ);
      }
      if (!alvo) alvo = [clamp(tc, 0, Math.max(0, B.cols - s)), clamp(tr, 0, Math.max(0, B.rows - s))];
      marcar(occ, alvo[0], alvo[1], s);
      lugar.set(t.id, { id: t.id, x: alvo[0] * B.cell, y: alvo[1] * B.cell });
    }
    for (const t of toks) out.push(lugar.get(t.id));
    return out;
  }

  /* Passa os tokens `ids` da cena `de` para `para`, pela passagem `usadaId` (sem ela, a mais perto). Um passo em cada
     cena (Store.remoteIn: na cena aberta, a tela acompanha). → { de, para, itens: [{ t (como era), x, y }] } ou null. */
  function mover(de, para, ids, usadaId) {
    const A = S.scenes[de], B = S.scenes[para];
    if (!A || !B || de === para) return null;
    const toks = ids.map(id => A.tokens.find(t => t.id === id)).filter(t => t && !t.prop && !B.tokens.some(x => x.id === t.id));
    if (!toks.length) return null;
    const usada = usadaId ? A.tokens.find(t => t.id === usadaId && ehPassagem(t) && t.cena === para) : null;
    const lugares = chegada(A, B, toks, usada);
    const vao = new Set(toks.map(t => t.id));
    // o que está preso a eles vai junto (os efeitos que seguem o token); a mira e a vez na iniciativa ficam nesta cena
    const fx = A.effects.filter(e => e.token && vao.has(e.token));
    const reg = { de, para, itens: toks.map(t => ({ t: clone(t) })), fx: fx.map(clone), turn: clone(A.turn), targets: clone(A.targets) };
    const opsA = fx.map(e => ({ t: 'del', c: 'effects', id: e.id })).concat(toks.map(t => ({ t: 'del', c: 'tokens', id: t.id })));
    const scn = {};
    if (A.targets.some(x => vao.has(x.t))) scn.targets = A.targets.filter(x => !vao.has(x.t));
    if (toks.some(t => inTurn(A.turn, t.id))) { const tn = clone(A.turn), antes = tn.list.slice(); turnDrop(tn, [...vao]); turnKeepCur(tn, antes); scn.turn = tn; }
    if (Object.keys(scn).length) opsA.push({ t: 'scn', p: scn });
    if (scn.turn) reg.turnDepois = clone(scn.turn); else delete reg.turn;
    if (!Store.remoteIn(de, opsA)) return null;
    Store.remoteIn(para, toks.map((t, i) => ({ t: 'add', c: 'tokens', v: Object.assign(clone(t), { x: lugares[i].x, y: lugares[i].y }) }))
      .concat(fx.map(e => { const t = toks.find(k => k.id === e.token), i = toks.indexOf(t); return { t: 'add', c: 'effects', v: Object.assign(clone(e), { x: e.x + lugares[i].x - t.x, y: e.y + lugares[i].y - t.y }) }; })));
    Store.esquecer(de, [...vao]); Store.esquecer(para, [...vao]);
    Persist.scene(de); Persist.scene(para);
    return reg;
  }
  // desfaz um `mover`: os tokens voltam para onde estavam (os que ainda estão na outra cena)
  function voltar(reg) {
    if (!reg) return false;
    const A = S.scenes[reg.de], B = S.scenes[reg.para];
    if (!A || !B) return false;
    const aqui = reg.itens.filter(x => B.tokens.some(t => t.id === x.t.id) && !A.tokens.some(t => t.id === x.t.id));
    if (!aqui.length) return false;
    const ids = new Set(aqui.map(x => x.t.id)), fx = (reg.fx || []).filter(e => ids.has(e.token));
    // do lado de lá saem os tokens, os efeitos presos a eles, a mira neles e a vez deles na iniciativa (de lá)
    const opsB = B.effects.filter(e => e.token && ids.has(e.token)).map(e => ({ t: 'del', c: 'effects', id: e.id })).concat(aqui.map(x => ({ t: 'del', c: 'tokens', id: x.t.id })));
    const scnB = {};
    if (B.targets.some(x => ids.has(x.t))) scnB.targets = B.targets.filter(x => !ids.has(x.t));
    if (aqui.some(x => inTurn(B.turn, x.t.id))) { const tn = clone(B.turn), antes = tn.list.slice(); turnDrop(tn, [...ids]); turnKeepCur(tn, antes); scnB.turn = tn; }
    if (Object.keys(scnB).length) opsB.push({ t: 'scn', p: scnB });
    Store.remoteIn(reg.para, opsB);
    const opsA = aqui.map(x => ({ t: 'add', c: 'tokens', v: clone(x.t) })).concat(fx.filter(e => !A.effects.some(f => f.id === e.id)).map(e => ({ t: 'add', c: 'effects', v: clone(e) })));
    // a vez na iniciativa e a mira voltam como estavam, se ninguém mexeu nelas enquanto isso (senão, só os que voltaram)
    const scn = {};
    if (reg.turn && JSON.stringify(reg.turnDepois) === JSON.stringify(A.turn) && reg.turn.list.every(e => !e.token || ids.has(e.token) || A.tokens.some(t => t.id === e.token))) scn.turn = clone(reg.turn);
    if (reg.targets) { const tg = A.targets.concat(reg.targets.filter(x => ids.has(x.t) && !A.targets.some(y => y.t === x.t && y.by === x.by))); if (tg.length !== A.targets.length) scn.targets = tg; }
    if (Object.keys(scn).length) opsA.push({ t: 'scn', p: scn });
    Store.remoteIn(reg.de, opsA);
    Store.esquecer(reg.de, [...ids]); Store.esquecer(reg.para, [...ids]);
    Persist.scene(reg.de); Persist.scene(reg.para);
    return true;
  }

  /* A passagem em que o token parou (as casas dele por cima das dela), se ela "leva ao pisar". */
  function pisou(sc, t, campo) {
    if (!t || t.prop) return null;
    const [a, b] = celDe(sc, t), s = lado(t);
    for (const p of sc.tokens) {
      if (!p.prop || !(campo === 'vai' ? p.vai && p.pisa : ehPassagem(p) && p.pisar)) continue;
      const [c, d] = celDe(sc, p), sp = lado(p);
      if (a < c + sp && c < a + s && b < d + sp && d < b + s) return p;
    }
    return null;
  }

  /* Para cima ou para baixo (PageUp e PageDown): entre os destinos das passagens desta cena, o andar mais perto acima
     (dir = 1) ou abaixo (dir = −1). destinos: [{ para, nivel }]. → o destino, ou null. */
  function vertical(destinos, nivelAqui, dir) {
    const l = destinos.filter(x => (dir > 0 ? x.nivel > nivelAqui : x.nivel < nivelAqui));
    l.sort((p, q) => Math.abs(p.nivel - nivelAqui) - Math.abs(q.nivel - nivelAqui));
    return l[0] || null;
  }

  return { nivelDe, passagens, usadaPor, pertoDaPassagem, chegada, mover, voltar, pisou, vertical, ehPassagem, temParede };
})();
