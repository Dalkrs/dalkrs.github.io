/* ---------------------------------------------------------------
   10g5. O PONTO DE REFORÇO (lote 22)
   Um marcador do mestre (oculto dos jogadores) que guarda tokens: os arrastados até ele (saem do mapa e ficam lá
   dentro) e as cópias de um modelo ("3 × Lacaio"). Cada grupo guardado diz quando chega: na hora que o mestre quiser
   ("Chegar agora"), numa rodada do combate (em ondas: um grupo na 2ª, outro na 4ª…) ou numa fase da arena. Na hora,
   nascem sozinhos em volta do ponto, entram na ordem de turnos rolando a iniciativa, e o aviso traz o Desfazer — tudo
   num passo só. t.ref = [{ id, tok, n, quando: { k: 'mao' | 'rodada' | 'fase', v } }] (tok: o token, sem id e lugar).
   --------------------------------------------------------------- */
const Reforco = (() => {
  const MAX_N = 20, MAX_GRUPOS = 12;
  const eReforco = t => !!t && t.prop === 'reforco';
  const grupos = t => (eReforco(t) && Array.isArray(t.ref) ? t.ref.filter(g => g && typeof g === 'object' && g.tok && typeof g.tok === 'object') : []);
  const nomeDe = g => String((g.tok && g.tok.name) || 'Reforço');
  function quandoTxt(g, sc) {
    const q = g.quando || {};
    if (q.k === 'rodada') return 'na ' + (Number(q.v) || 1) + 'ª rodada';
    if (q.k === 'fase') { const f = (Arena.fases ? Arena.fases(sc) : []).find(x => x.i === Number(q.v)); return 'na ' + (f ? f.nome.toLowerCase() : 'fase ' + (Number(q.v) + 2)); }
    return 'quando você mandar';
  }
  // o token guardado: tudo menos o id e o lugar (nasce oculto? não: aparece; o que era do mapa continua igual)
  function foto(t) { const o = clone(t); delete o.id; delete o.x; delete o.y; delete o.ref; o.hidden = false; return o; }
  // as cédulas livres em volta do ponto, da mais perto para a mais longe
  function lugares(sc, ponto, n, size) {
    const c = sc.cell, cx = Math.round(ponto.x / c), cy = Math.round(ponto.y / c), out = [];
    const ocupado = (x, y) => sc.tokens.some(t => !t.prop && x * c < t.x + t.size * c && t.x < (x + size) * c && y * c < t.y + t.size * c && t.y < (y + size) * c)
      || out.some(([ox, oy]) => x < ox + size && ox < x + size && y < oy + size && oy < y + size);
    for (let r = 1; r <= 12 && out.length < n; r++) {
      for (let dy = -r; dy <= r && out.length < n; dy++) for (let dx = -r; dx <= r && out.length < n; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x + size > sc.cols || y + size > sc.rows || ocupado(x, y)) continue;
        out.push([x, y]);
      }
    }
    while (out.length < n) out.push([cx + 1, cy]);
    return out.map(([x, y]) => [x * c, y * c]);
  }
  /* Solta os grupos (ids) do ponto: nascem, saem de dentro dele, entram na ordem e rolam a iniciativa. Num passo só
     (dentro de um Store.tx de quem chama, ou num próprio). → [nomes] */
  function soltar(pontoId, ids, rotulo) {
    const sc = Store.scene(), p = Store.get('tokens', pontoId);
    if (!p || !eReforco(p)) return [];
    const quais = grupos(p).filter(g => !ids || ids.includes(g.id));
    if (!quais.length) return [];
    const nascidos = [], nomes = [];
    Store.tx(rotulo || 'Reforços chegam', () => {
      for (const g of quais) {
        const n = clamp(Math.round(Number(g.n) || 1), 1, MAX_N), size = clamp(Number(g.tok.size) || 1, 0.5, 4);
        const pos = lugares(Store.scene(), p, n, Math.max(1, Math.round(size)));
        for (let k = 0; k < n; k++) {
          const base = clone(g.tok), nome = n > 1 ? nomeDe(g) + ' ' + (k + 1) : nomeDe(g);
          if (n > 1) delete base.char;                                    // (as cópias não ficam ligadas à mesma ficha)
          const [x, y] = snapTok(Store.scene(), pos[k][0], pos[k][1], size, false);
          const t = newToken(Store.scene(), x, y, Object.assign(base, { id: uid('tk'), name: nome, hidden: false }));
          Store.add('tokens', t);
          nascidos.push(t);
        }
        nomes.push((n > 1 ? n + ' × ' : '') + nomeDe(g));
      }
      Store.upd('tokens', p.id, { ref: grupos(p).filter(g => !quais.includes(g)) });
      // na ordem de turnos: entram e rolam a iniciativa (com combate, ou com a ordem já montada)
      const tn = Store.scene().turn;
      if (tn.on || tn.list.length) {
        const antes = new Set(tn.list.map(e => e.id));
        Act.turnAdd(nascidos.map(t => Store.get('tokens', t.id)).filter(Boolean));
        const novas = Store.scene().turn.list.filter(e => !antes.has(e.id)).map(e => e.id);
        if (novas.length) Act.turnRoll(novas);
      }
    });
    return nomes;
  }
  function avisar(nomes, onde) {
    if (!nomes.length) return;
    UI.toast('Reforços chegaram' + (onde ? ' ' + onde : '') + ': ' + nomes.join(', ') + '.', { action: 'Desfazer', run: Tools.undo, long: true, key: 'reforco' });
  }
  /* A rodada virou (ou o combate começou, na 1ª): os grupos marcados para ela, de todos os pontos. Um passo só. */
  function naRodada(round) {
    if (!isGM()) return [];
    const sc = Store.scene(), out = [];
    const pontos = sc.tokens.filter(t => eReforco(t) && grupos(t).some(g => g.quando && g.quando.k === 'rodada' && Number(g.quando.v) === round));
    if (!pontos.length) return [];
    Store.tx('Reforços da ' + round + 'ª rodada', () => {
      for (const p of pontos) out.push(...soltar(p.id, grupos(p).filter(g => g.quando && g.quando.k === 'rodada' && Number(g.quando.v) === round).map(g => g.id)));
    });
    avisar(out, 'na ' + round + 'ª rodada');
    return out;
  }
  // A fase i da arena: os grupos marcados para ela (dentro do passo da fase). → [nomes] (vazio: a fase usa os pontos dela)
  function naFase(i) {
    const sc = Store.scene(), out = [];
    for (const p of sc.tokens.filter(eReforco)) {
      const ids = grupos(p).filter(g => g.quando && g.quando.k === 'fase' && Number(g.quando.v) === i).map(g => g.id);
      if (ids.length) out.push(...soltar(p.id, ids));
    }
    return out;
  }
  // Guarda o token t no ponto (o token sai do mapa). Um passo.
  function guardar(pontoId, t) {
    const p = Store.get('tokens', pontoId);
    if (!p || !t || t.prop || grupos(p).length >= MAX_GRUPOS) return false;
    Store.tx('Guardar no ponto de reforço', () => {
      Store.upd('tokens', p.id, { ref: grupos(p).concat({ id: uid('rg'), tok: foto(t), n: 1, quando: { k: 'mao' } }) });
      Store.del('tokens', t.id);
      const tn = Store.scene().turn, fora = tn.list.filter(e => e.token === t.id).map(e => e.id);
      if (fora.length) Act.turnPatch(x => { x.list = x.list.filter(e => !fora.includes(e.id)); if (fora.includes(x.cur)) x.cur = x.list.length ? x.list[0].id : null; }, 'Guardar no ponto de reforço');
    });
    return true;
  }
  // depois de arrastar: o token (não objeto) que terminou em cima de um ponto de reforço é guardado nele
  function soltouEm(ids) {
    if (!isGM() || !ids || ids.length !== 1) return;
    const sc = Store.scene(), t = Store.get('tokens', ids[0]);
    if (!t || t.prop) return;
    const c = sc.cell, mx = t.x + t.size * c / 2, my = t.y + t.size * c / 2;
    const p = sc.tokens.find(o => eReforco(o) && mx >= o.x && mx < o.x + o.size * c && my >= o.y && my < o.y + o.size * c);
    if (!p) return;
    if (guardar(p.id, t)) UI.toast(t.name + ' está guardado em ' + p.name + ': nasce de lá quando você mandar (ou na rodada que você marcar, no painel do ponto).', { action: 'Desfazer', run: Tools.undo, long: true, key: 'reforco-g' });
  }
  function mudarGrupo(p, gid, patch, rotulo) {
    Store.tx(rotulo || 'Reforço', () => Store.upd('tokens', p.id, { ref: grupos(p).map(g => (g.id === gid ? Object.assign({}, g, patch) : g)) }));
  }
  /* A seção do painel do ponto (só o mestre). K: as peças da interface (sec, note, btn, field, inNum, modal, h). */
  function secao(t, K) {
    const { sec, note, btn } = K, sc = Store.scene(), gs = grupos(t), fases = Arena.fases ? Arena.fases(sc) : [];
    const linha = g => {
      const q = g.quando || { k: 'mao' };
      const sel = h('select', { class: 'in', id: 'rf-q-' + g.id, 'aria-label': 'Quando ' + nomeDe(g) + ' chega', onchange: e => { const k = e.target.value; e.target.blur(); mudarGrupo(t, g.id, { quando: k === 'rodada' ? { k, v: Math.max(2, (Store.scene().turn.round || 1) + 1) } : k === 'fase' ? { k, v: fases.length ? fases[0].i : 0 } : { k: 'mao' } }, 'Quando o reforço chega'); } },
        h('option', { value: 'mao', text: 'Quando eu mandar', selected: q.k === 'mao' }), h('option', { value: 'rodada', text: 'Numa rodada', selected: q.k === 'rodada' }),
        fases.length ? h('option', { value: 'fase', text: 'Numa fase da arena', selected: q.k === 'fase' }) : null);
      const extra = q.k === 'rodada' ? K.inNum('rf-r-' + g.id, Number(q.v) || 2, v => mudarGrupo(t, g.id, { quando: { k: 'rodada', v: clamp(Math.round(v), 1, 99) } }, 'Rodada do reforço'), { min: 1, max: 99, step: 1, label: 'Em que rodada ' + nomeDe(g) + ' chega' })
        : q.k === 'fase' ? h('select', { class: 'in', id: 'rf-f-' + g.id, 'aria-label': 'Em que fase', onchange: e => { mudarGrupo(t, g.id, { quando: { k: 'fase', v: Number(e.target.value) } }, 'Fase do reforço'); e.target.blur(); } }, fases.map(f => h('option', { value: String(f.i), text: f.nome, selected: Number(q.v) === f.i }))) : null;
      return h('li', { class: 'rf-g', 'data-g': g.id },
        h('div', { class: 'rf-n' }, h('b', { text: (g.n > 1 ? g.n + ' × ' : '') + nomeDe(g) }), h('small', { text: quandoTxt(g, sc) })),
        h('div', { class: 'row tight' }, sel, extra,
          btn('Chegar agora', () => avisar(soltar(t.id, [g.id], 'Reforço chega')), { kind: 'small', id: 'rf-agora-' + g.id }),
          btn('', () => { Store.tx('Tirar do ponto de reforço', () => Store.upd('tokens', t.id, { ref: grupos(t).filter(x => x.id !== g.id) })); UI.toast(nomeDe(g) + ' saiu do ponto de reforço.', { action: 'Desfazer', run: Tools.undo }); }, { icon: 'trash', kind: 'small', id: 'rf-x-' + g.id, title: 'Tirar este grupo do ponto' })));
    };
    return sec('s-reforco', 'Reforços guardados', true,
      gs.length ? h('ul', { class: 'rf-lista', id: 'rf-lista' }, gs.map(linha)) : note('Nada guardado ainda. Arraste um token até este ponto (ele sai do mapa e fica guardado aqui), ou use “Cópias de um token…”.'),
      h('div', { class: 'row' },
        btn('Cópias de um token…', () => janelaCopias(t, K), { icon: 'copy', id: 'rf-copias' }),
        gs.length > 1 ? btn('Chegar todos agora', () => avisar(soltar(t.id, null, 'Reforços chegam')), { id: 'rf-todos' }) : null),
      note('Na rodada marcada (ou na fase), nascem sozinhos em volta do ponto e entram na ordem de turnos com a iniciativa rolada; o aviso traz o Desfazer.'));
  }
  // "3 × Lacaio": cópias de um token do mapa (o token fica onde está)
  function janelaCopias(t, K) {
    const sc = Store.scene(), modelos = sc.tokens.filter(o => !o.prop && !o.clone);
    if (!modelos.length) { UI.toast('Não há token na cena para copiar.'); return; }
    const sel = h('select', { class: 'in', id: 'rf-modelo' }, modelos.map(o => h('option', { value: o.id, text: o.name })));
    const qtd = h('input', { class: 'in', id: 'rf-qtd', type: 'number', min: '1', max: String(MAX_N), step: '1', value: '3' });
    const quando = h('select', { class: 'in', id: 'rf-quando' }, h('option', { value: 'mao', text: 'Quando eu mandar' }), h('option', { value: 'rodada', text: 'Numa rodada' }));
    const rod = h('input', { class: 'in', id: 'rf-rod', type: 'number', min: '1', max: '99', step: '1', value: String(Math.max(2, (sc.turn.round || 1) + 1)) });
    K.modal({ title: 'Cópias de um token', body: h('div', { class: 'grid2' }, K.field('Modelo', sel, 'stack'), K.field('Quantas', qtd, 'stack'), K.field('Chegam', quando, 'stack'), K.field('Na rodada', rod, 'stack')),
      actions: [{ label: 'Cancelar' }, { label: 'Guardar', kind: 'primary', run: () => {
        const m = Store.get('tokens', sel.value), n = clamp(Math.round(Number(qtd.value) || 1), 1, MAX_N);
        if (!m) return false;
        const g = { id: uid('rg'), tok: foto(m), n, quando: quando.value === 'rodada' ? { k: 'rodada', v: clamp(Math.round(Number(rod.value) || 2), 1, 99) } : { k: 'mao' } };
        delete g.tok.char;
        Store.tx('Guardar cópias no ponto de reforço', () => Store.upd('tokens', t.id, { ref: grupos(Store.get('tokens', t.id)).concat(g) }));
        UI.toast(n + ' × ' + m.name + ' guardados em ' + t.name + '.', { action: 'Desfazer', run: Tools.undo });
      } }] });
  }
  return { eReforco, grupos, soltar, naRodada, naFase, guardar, soltouEm, secao, foto };
})();
