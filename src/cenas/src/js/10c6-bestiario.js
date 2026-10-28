/* ---------------------------------------------------------------
   10c6. (lote 29) O BESTIÁRIO NAS CENAS
   O mestre monta o encontro na bandeja do Bestiário e puxa: os tokens nascem em quadrados livres a partir do meio da
   tela, ligados ao inimigo (t.best) — os números, as defesas e as rolagens vêm do Bestiário; as barras moram em cada
   token. Os do mesmo inimigo ganham número ("Goblin 1", "Goblin 2"). Um Desfazer tira todos.
   No painel do token (só o mestre): o resumo, o lembrete de comportamento, "Rolar o saque" e "Abrir no Bestiário".
   O saque rolado vai para a bolsa de alguém (as Fichas) ou fica no chão: um baú ao lado do token, com o saque dentro,
   que o mestre entrega depois pelo painel do baú. Na vez do inimigo, o lembrete aparece para o mestre (nada sozinho).
   --------------------------------------------------------------- */
const Best = (() => {
  const toast = (t, o) => UI.toast(t, o);
  const okId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(id);
  const ponte = () => (window.TC && window.TC.ponte) || null;
  const TIPO_NOME = { material: 'Material', pocao: 'Poção', bomba: 'Bomba', runa: 'Runa', municao: 'Munição', equip: 'Equipamento' };

  /* ---------- puxar o encontro ---------- */
  // ped: { itens: [{ id, n }], ocultos } → os ids dos tokens criados
  function trazer(ped) {
    if (!isGM()) return [];
    if (UI.modalOpen()) { toast('Há uma janela aberta aqui nas Cenas: feche-a e puxe o encontro de novo.'); return []; }
    const pedidos = (Array.isArray(ped && ped.itens) ? ped.itens : []).filter(x => x && okId(x.id) && Number(x.n) > 0).slice(0, 30);
    const quer = [];
    let faltou = 0;
    for (const x of pedidos) {
      if (!Fichas.linhaBest(x.id)) { faltou++; continue; }
      for (let i = 0; i < Math.min(30, Math.round(Number(x.n))); i++) quer.push(x.id);
    }
    if (!quer.length) { toast(faltou ? 'Os inimigos do encontro não chegaram aqui ainda. Tente de novo em um instante.' : 'O encontro está vazio.', { long: !!faltou }); return []; }
    const sc = Store.scene(), [cw, ch] = Render.size();
    const visivel = cw > 0 && ch > 0;      // (a tela ainda sem tamanho: o meio do mapa)
    const cx = visivel ? App.view.x + cw / (2 * App.view.z) : sc.cols * sc.cell / 2, cy = visivel ? App.view.y + ch / (2 * App.view.z) : sc.rows * sc.cell / 2;
    const feitos = [], vaga = vagas(sc, cx, cy);
    // o número no nome: quando o mesmo inimigo vem mais de uma vez (contando os que já estão na cena)
    const vem = new Map(), ja = new Map(), num = new Map();
    for (const id of quer) vem.set(id, (vem.get(id) || 0) + 1);
    for (const t of sc.tokens) if (t.best) ja.set(t.best, (ja.get(t.best) || 0) + 1);
    Store.tx(quer.length === 1 ? 'Trazer inimigo' : 'Trazer o encontro', () => {
      quer.forEach((id, i) => {
        const t = Fichas.novoTokenBest(sc, id, 0, 0, ped && ped.ocultos ? { hidden: true } : null);
        if (!t) return;
        [t.x, t.y] = vaga(t.size);
        if (vem.get(id) + (ja.get(id) || 0) > 1) { const k = (num.get(id) || ja.get(id) || 0) + 1; num.set(id, k); t.name = (t.name.slice(0, 56) + ' ' + k); }
        Store.add('tokens', t);
        feitos.push(t.id);
      });
    });
    if (!feitos.length) return [];
    setSel(feitos.map(id => ({ c: 'tokens', id })));
    if (App.tool !== 'select') Tools.set('select');
    toast((feitos.length === 1 ? 'Um inimigo na cena' : feitos.length + ' inimigos na cena') + (ped && ped.ocultos ? ', ocultos dos jogadores' : '') + (faltou ? ` (${faltou === 1 ? 'um dos inimigos saiu' : faltou + ' dos inimigos saíram'} do Bestiário)` : '') + '.', { action: 'Desfazer', run: Tools.undo });
    return feitos;
  }

  /* Os quadrados livres a partir de (cx, cy), para tokens de qualquer tamanho: o de tamanho 2 precisa de 2×2 livres.
     Devolve uma função: (tamanho) → [x, y] (e marca o lugar como ocupado). Sem lugar no mapa: o meio. */
  function vagas(sc, cx, cy) {
    const cell = sc.cell, occ = new Set();
    const marca = (c, r, s) => { for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) occ.add((c + i) + ',' + (r + j)); };
    for (const t of sc.tokens) marca(Math.floor((t.x + 1) / cell), Math.floor((t.y + 1) / cell), Math.max(1, Math.ceil(t.size)));
    const c0 = clamp(Math.floor(cx / cell), 0, Math.max(0, sc.cols - 1)), r0 = clamp(Math.floor(cy / cell), 0, Math.max(0, sc.rows - 1)), maxRing = Math.max(sc.cols, sc.rows);
    const livre = (c, r, s) => { if (c < 0 || r < 0 || c + s > sc.cols || r + s > sc.rows) return false; for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) if (occ.has((c + i) + ',' + (r + j))) return false; return true; };
    return size => {
      const s = Math.max(1, Math.ceil(size));
      for (let ring = 0; ring <= maxRing; ring++) for (let dy = -ring; dy <= ring; dy++) for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring || !livre(c0 + dx, r0 + dy, s)) continue;
        marca(c0 + dx, r0 + dy, s);
        return [(c0 + dx) * cell, (r0 + dy) * cell];
      }
      return [c0 * cell, r0 * cell];
    };
  }

  /* ---------- o painel do token ---------- */
  const textoSaque = sq => {
    const p = sq.itens.map(x => (x.qtd > 1 ? x.qtd + ' × ' : '') + x.nome);
    if (sq.lapros) p.push(sq.lapros + ' lapros');
    return p.length > 1 ? p.slice(0, -1).join(', ') + ' e ' + p[p.length - 1] : p[0] || 'nada';
  };
  const caido = t => t.bars.length > 0 && t.bars[0].on !== false && t.bars[0].m > 0 && t.bars[0].v <= 0;
  function secao(t, K) {
    if (!isGM() || !t || !t.best) return null;
    const l = Fichas.linhaBest(t.best);
    if (!l) return K.secR('s-best', 'Bestiário', true, 'o inimigo não está aqui',
      K.note('Este token veio do Bestiário, mas o inimigo não está mais lá (ou ainda não chegou aqui). O token fica com o nome e as barras; os números e as rolagens voltam quando o inimigo voltar.'));
    const e = l.e, temSaque = e.saque.itens.length > 0 || !!e.saque.lapros;
    return K.secR('s-best', 'Bestiário', true, 'Tier ' + e.ficha.tier + ' · Lvl ' + e.ficha.level,
      e.comp.lembrete ? h('div', { class: 'best-lembra', id: 'tk-best-lembrete' }, h('b', { text: 'Na vez dele: ' }), e.comp.lembrete) : null,
      h('div', { class: 'row' },
        temSaque ? K.btn('Rolar o saque', () => rolarSaque(t), { icon: 'die', id: 'tk-saque', kind: caido(t) ? 'primary' : '', title: 'Rola o que cai deste inimigo (cada item pela chance dele) e mostra antes: você entrega a alguém ou deixa no chão' }) : null,
        K.btn('Abrir no Bestiário', () => abrir(t), { id: 'tk-best-abrir', title: 'Abre a ficha deste inimigo no Bestiário' })),
      K.note('Os números, as defesas e as rolagens (a tecla F, o ataque com defesa) vêm do Bestiário; as barras são só deste token.' + (temSaque ? '' : ' Este inimigo não tem saque.')));
  }
  function abrir(t) {
    const P = ponte();
    if (!P || !P.ir || !P.ir('bestiario', { inimigo: t.best })) toast('O Bestiário abre pelo site (a aba Bestiário, do mestre).');
  }

  /* ---------- o saque ---------- */
  function rolarSaque(t) {
    const l = Fichas.linhaBest(t.best), B = window.TC && window.TC.bestiario;
    if (!l || !B) { toast('O inimigo deste token não está mais no Bestiário.'); return; }
    const r = B.rolarSaque(l.e);
    janela({ itens: r.itens.map(x => ({ nome: x.nome, qtd: x.qtd, tipo: x.tipo })), lapros: r.lapros, de: tokName(t) }, r.rolagens, t, null);
  }
  /* A janela do saque: o que caiu (cada item marcado; os lapros, editáveis) e para quem vai. Do token: "Deixar no chão"
     vem escolhido; do baú no chão: o primeiro personagem. */
  function janela(sq, rolagens, t, bau) {
    const K = UI.kit, quem = Fichas.quemRecebeSaque();
    const nada = !sq.itens.length && !sq.lapros;
    if (nada) {
      UI.modal({ title: 'Saque de ' + sq.de, text: 'Nada caiu.', body: rolagens && rolagens.length ? h('p', { class: 'note', id: 'sq-rol', text: 'Os dados: ' + rolagens.join(' · ') + '.' }) : null, actions: [{ label: 'Ok', kind: 'primary' }] });
      return;
    }
    const marcado = sq.itens.map(() => true);
    let para = bau ? (quem[0] ? quem[0].id : '') : '';
    const lap = h('input', { id: 'sq-lapros', class: 'in num', type: 'number', min: 0, max: 9999999, step: 1, value: sq.lapros || 0, 'aria-label': 'Lapros' });
    const lista = h('div', { class: 'sq-l', id: 'sq-lista' }, sq.itens.map((x, i) => h('label', { class: 'sq-i' },
      h('input', { type: 'checkbox', id: 'sq-i-' + i, checked: true, onchange: e => { marcado[i] = e.target.checked; } }),
      h('span', { class: 'sq-n', text: (x.qtd > 1 ? x.qtd + ' × ' : '') + x.nome }), h('span', { class: 'sq-t', text: TIPO_NOME[x.tipo] || 'Material' }))));
    const opts = (bau ? [] : [['', 'Deixar no chão (num baú, ao lado de ' + sq.de + ')']]).concat(quem.map(q => [q.id, q.nome + (q.naCena ? ' · na cena' : '')]));
    const card = UI.modal({
      title: (bau ? 'O saque no chão' : 'Saque de ' + sq.de), wide: true,
      text: bau ? 'Para quem vai? Os itens de bolsa somam com os de mesmo nome; o equipamento entra guardado; os lapros somam.' : 'O que caiu. Desmarque o que não vale, e escolha para quem vai — ou deixe no chão.',
      body: h('div', { class: 'area' }, lista,
        K.field('Lapros', lap, 'stack'),
        opts.length ? K.field('Para quem', K.inSelect('sq-para', para, opts, v => { para = v; rotulo(); }), 'stack') : K.note('As fichas da mesa não estão aqui: o saque só pode ficar no chão.'),
        rolagens && rolagens.length ? h('p', { class: 'note', id: 'sq-rol', text: 'Os dados: ' + rolagens.join(' · ') + '.' }) : null),
      actions: [{ label: 'Cancelar' }, { label: 'Confirmar', kind: 'primary', run: () => {
        const fica = { itens: sq.itens.filter((x, i) => marcado[i]), lapros: clamp(Math.round(Number(lap.value) || 0), 0, 9999999), de: sq.de };
        if (!fica.itens.length && !fica.lapros) { toast('Nada marcado: nada foi entregue.'); return; }
        if (para) entregar(para, fica, bau);
        else if (t) noChao(t, fica);
      } }],
    });
    const rotulo = () => { const b = card && card.querySelector('.modal-a .btn.primary span'); if (b) { const q = quem.find(x => x.id === para); b.textContent = q ? 'Entregar a ' + q.nome : 'Deixar no chão'; } };
    rotulo();
  }
  function entregar(charId, fica, bau) {
    const r = Fichas.entregarSaque(charId, fica);
    if (!r.ok) { toast(r.error); return; }
    // o baú do chão sai (o Desfazer põe de volta)
    const copiaBau = bau ? JSON.parse(JSON.stringify(Store.get('tokens', bau.id) || bau)) : null;
    if (bau && Store.get('tokens', bau.id)) Store.tx('Pegar o saque', () => Store.del('tokens', bau.id));
    toast(`${r.nome} recebeu ${textoSaque(fica)}.`, { action: 'Desfazer', long: true, run: () => {
      r.desfazer();
      if (copiaBau && !Store.get('tokens', copiaBau.id)) Store.tx('Devolver o saque ao chão', () => Store.add('tokens', copiaBau));
    } });
  }
  function noChao(t, fica) {
    const sc = Store.scene(), tok = Store.get('tokens', t.id) || t, c = sc.cell, s = Math.max(1, Math.ceil(tok.size));
    const [p] = Combate.vagas(sc, 1, tok.x + s * c + c / 2, tok.y + c / 2);
    const bau = Props.novo(sc, 'bau', p[0], p[1], 1, false);
    bau.name = ('Saque de ' + fica.de).slice(0, 60);
    bau.saque = cleanSaque(fica);
    Store.tx('Deixar o saque no chão', () => Store.add('tokens', bau));
    toast(`O saque ficou no chão, num baú ao lado de ${fica.de}: ${textoSaque(fica)}. Clique no baú para entregar.`, { action: 'Desfazer', run: Tools.undo, long: true });
  }
  // o painel do baú com o saque (só o mestre): o que tem e "Entregar…"
  function secaoBau(t, K) {
    if (!isGM() || !t || !t.saque) return null;
    const sq = cleanSaque(t.saque);
    if (!sq) return null;
    return K.sec('s-saque', 'Saque no chão', true,
      h('p', { class: 'best-sq', id: 'pr-saque', text: textoSaque(sq) + (sq.de ? ' (de ' + sq.de + ')' : '') + '.' }),
      Fichas.on() ? h('div', { class: 'row' }, K.btn('Entregar…', () => janela(Object.assign({ de: sq.de || 'um inimigo' }, sq), null, null, t), { kind: 'primary', id: 'pr-entregar', icon: 'bag', title: 'Escolhe quem pega o saque: ele vai para a ficha, e o baú sai do mapa' }))
        : K.note('Numa mesa, “Entregar…” manda o saque para a ficha de alguém. Aqui, fora de uma mesa, o baú só guarda o que caiu.'));
  }

  /* ---------- na vez do inimigo ---------- */
  // o cartão do lembrete (para o aviso do começo da vez, só do mestre): um por inimigo, com os tokens dele na vez
  function lembretes(toks, box) {
    if (!isGM()) return [];
    const por = new Map();
    for (const t of toks) {
      if (!t || !t.best) continue;
      const l = Fichas.linhaBest(t.best), txt = l && l.e.comp.lembrete;
      if (!txt) continue;
      if (!por.has(t.best)) por.set(t.best, { txt, nomes: [] });
      por.get(t.best).nomes.push(tokName(t));
    }
    return [...por.entries()].map(([id, x]) => {
      const card = h('div', { class: 'zona lembra best', id: 'best-lembra-' + id },
        h('span', { class: 'zona-i', style: { background: '#c9a24a' } }),
        h('span', { class: 'zona-t' }, h('strong', { text: x.nomes.length > 2 ? x.nomes.length + ' ' + x.nomes[0].replace(/\s+\d+$/, '') : x.nomes.join(' e ') }), ': ' + x.txt),
        UI.kit.btn('Ok', () => { card.remove(); if (!box.children.length) box.hidden = true; }, { kind: 'small', id: 'best-lembra-ok-' + id }));
      return card;
    });
  }

  /* ---------- (lote 29) a receita que falhou na bancada do Acampamento ----------
     A linha da mesa ao vivo traz as condições (sis: { t: 'bc', c: a ficha, cs: [{ c, r }] }). Quem mestra põe no token do
     personagem: o da cena aberta (com Desfazer) ou o da cena que está no ar; sem token, fica o aviso. Só vale a linha
     escrita pelo dono da ficha (ou por quem mestra). */
  const bancadasVistas = new Set();
  function daMesa(l) {
    const s = l && l.dados && l.dados.sis;
    if (!s || typeof s !== 'object' || s.t !== 'bc' || !isGM()) return;
    if (l.id && bancadasVistas.has(l.id)) return;
    if (l.id) bancadasVistas.add(l.id);
    const pc = typeof s.c === 'string' ? s.c : null, cs = (Array.isArray(s.cs) ? s.cs : []).filter(x => x && typeof x.c === 'string' && COND_BY_ID[x.c]).slice(0, 6);
    if (!pc || !cs.length) return;
    const ficha = Fichas.get(pc);
    if (!ficha || !(l.autor_id === Fichas.eu() || (ficha.dono_id && ficha.dono_id === l.autor_id))) return;
    const nome = String(ficha.nome || 'O personagem'), nomes = cs.map(x => COND_BY_ID[x.c].n + (x.r > 0 ? ' (' + x.r + (x.r === 1 ? ' rodada' : ' rodadas') + ')' : '')).join(', ');
    const patch = t => {
      const conds = t.conds.slice(), cinfo = Object.assign({}, t.cinfo);
      for (const x of cs) { if (!conds.includes(x.c)) conds.push(x.c); const r = Math.max(0, Math.round(+x.r || 0)); if (r) cinfo[x.c] = Object.assign({}, cinfo[x.c], { d: r, d0: r }); }
      return { conds, cinfo };
    };
    const sc = Store.scene(), aqui = sc.tokens.find(k => k.char === pc && !k.clone && !k.prop);
    if (aqui) {
      Store.tx('Condição da bancada', () => Store.upd('tokens', aqui.id, patch(aqui)));
      UI.toast(`${nome} falhou na bancada: ${nomes} no token.`, { action: 'Desfazer', run: Tools.undo, long: true, key: 'bc-' + pc });
      return;
    }
    const ar = Nuvem.noAr && Nuvem.noAr(), sa = ar && ar !== Store.S.current ? Store.S.scenes[ar] : null, la = sa ? sa.tokens.find(k => k.char === pc && !k.clone && !k.prop) : null;
    if (la) { Store.remoteIn(ar, [{ t: 'upd', c: 'tokens', id: la.id, p: patch(la) }]); UI.toast(`${nome} falhou na bancada: ${nomes} no token, na cena que está no ar.`, { long: true, key: 'bc-' + pc }); return; }
    UI.toast(`${nome} falhou na bancada: ${nomes}. Sem token na cena — ponha quando ${nome} entrar.`, { long: true, key: 'bc-' + pc });
  }

  return { trazer, secao, secaoBau, rolarSaque, janela, lembretes, textoSaque, daMesa };
})();
