/* ---------------------------------------------------------------
   10gd. OS MARCADORES DE MISSÃO NA CENA (lote 129) — o objeto "Marcador de missão" (06b8), ligado a uma missão da aba
   Missões ou a um objetivo opcional dela.
   · O mestre põe o marcador (do catálogo, grupo Missões, ou pelo "Gerar um lugar…"), escolhe no painel a missão e o que
     ele marca (a missão inteira ou um objetivo opcional) e revela quando quiser (nasce oculto).
   · O marcador guarda uma cópia do que a missão é (t.mq: o título, o tipo, a situação). O aparelho de quem mestra
     acerta essa cópia sozinho quando a missão muda na aba Missões (cumprida, falhou, mudou de nome ou de tipo), em todas
     as cenas da mesa — sem entrar no Desfazer. É a cópia que os jogadores recebem (a missão ainda oculta vai sem nome).
   · Um clique de quem joga num marcador revelado abre o balão: o nome, o tipo e o botão para abrir a missão na aba
     Missões. Dois cliques do mestre abrem o mesmo balão, com o que ele pode fazer.
   --------------------------------------------------------------- */
const MissaoCenas = (() => {
  const M = () => (window.TC && window.TC.missoes) || null;
  const D = () => { try { return window.TC && TC.dados && TC.dados.disponivel && TC.dados.disponivel() ? TC.dados.col('documentos') : null; } catch (e) { return null; } };
  const linhas = () => { const d = D(); return d ? d.todas() : []; };
  const eh = t => !!(t && t.prop === 'missao');
  const ESTADO = { oculta: 'Ainda oculta (só você vê)', oferta: 'No quadro', ativa: 'Em andamento', feita: 'Cumprida', falhou: 'Falhou', sumiu: 'A missão foi apagada' };

  /* As missões que dá para ligar: todas (rascunhos, quadro de cada campanha, as dos personagens), a principal primeiro. */
  function missoes() {
    const m = M(); if (!m) return [];
    const vistas = new Set(), out = [];
    for (const l of linhas()) {
      if (!l || l.apagado || typeof l.id !== 'string' || !l.id.startsWith('fichas:mis:') || !l.dados || typeof l.dados.ms !== 'object') continue;
      for (const id of Object.keys(l.dados.ms)) {
        if (vistas.has(id)) continue;
        const a = m.acharEmDocs([l], id); if (!a) continue;
        vistas.add(id);
        out.push({ id, t: a.m.t || 'Missão sem título', tp: a.m.tp, e: m.situacao(a.m, a.onde), ops: m.objs(a.m).filter(o => o.op) });
      }
    }
    return out.sort((a, b) => ((a.tp === 'principal' ? 0 : 1) - (b.tp === 'principal' ? 0 : 1)) || a.t.localeCompare(b.t));
  }

  /* A cópia do que o marcador mostra agora, a partir dos documentos (só quem mestra tem todos). → mq novo, ou null */
  function copia(mq) {
    const m = M();
    if (!m || !mq || !mq.id) return null;
    const k = m.marcador(m.acharEmDocs(linhas(), mq.id), mq.oid || null);
    if (!k) return Object.assign({}, mq, { e: 'sumiu' });
    const o = { id: mq.id, t: k.t, tp: k.tp, e: k.e };
    if (mq.oid) { o.oid = mq.oid; o.ot = k.ot; o.op = k.op; }
    return o;
  }
  const nome = mq => (!mq || !mq.id ? 'Marcador de missão' : mq.oid ? 'Opcional: ' + (mq.ot || 'objetivo') : 'Missão: ' + (mq.t || 'sem título'));
  const igual = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);

  /* Liga o marcador t a uma missão (id) e, se vier, a um objetivo opcional dela (oid). id vazio: desliga. */
  function ligar(t, id, oid) {
    t = Store.get('tokens', t.id) || t;
    const mq = id ? copia({ id, oid: oid || null }) : null;
    Store.tx(id ? 'Ligar o marcador à missão' : 'Desligar o marcador', () => Store.upd('tokens', t.id, { mq: mq || undefined, name: nome(mq) }));
  }

  /* O aparelho de quem mestra acerta a cópia de todos os marcadores (em todas as cenas), sem entrar no Desfazer. */
  let tSync = 0;
  function sincronizar() {
    if (!isGM() || !M() || !D() || (typeof Nuvem !== 'undefined' && Nuvem.jogador && Nuvem.jogador())) return 0;
    let n = 0;
    for (const sid of Object.keys(Store.S.scenes)) {
      const sc = Store.S.scenes[sid], ops = [];
      for (const t of (sc && sc.tokens) || []) {
        if (!eh(t) || !t.mq || !t.mq.id) continue;
        const nv = copia(t.mq);
        if (nv && !igual(nv, t.mq)) ops.push({ t: 'upd', c: 'tokens', id: t.id, p: { mq: nv, name: nome(nv) } });
      }
      if (ops.length) n += Store.remoteIn(sid, ops);
    }
    return n;
  }
  const agendar = () => { clearTimeout(tSync); tSync = setTimeout(sincronizar, 250); };
  // ouve as missões (quando a mesa abre, a coleção aparece) e a troca de cena
  let ouvindo = false;
  function ouvir() {
    const d = D();
    if (!d || ouvindo) return;
    ouvindo = true;
    d.aoMudar(l => { if (l && typeof l.id === 'string' && l.id.startsWith('fichas:mis:')) agendar(); });
    agendar();
  }
  setInterval(() => { if (!ouvindo) ouvir(); }, 2000);
  Store.on('scene', () => { ouvir(); agendar(); });
  // (o Desfazer pode trazer de volta uma cópia velha: depois de cada passo do mestre, ela é conferida de novo)
  Store.on('commit', e => { if (!e.remote && e.ops && e.ops.some(op => op.c === 'tokens')) agendar(); });

  /* ---- abrir a missão na aba Missões ---- */
  const naCasca = () => !!(window.TC && TC.ponte && TC.ponte.naCasca && TC.ponte.ir);
  function abrirMissao(mq) {
    if (!mq || !mq.id) return;
    if (naCasca() && TC.ponte.ir('missoes', { missao: mq.id })) return;
    UI.toast('Abra as Missões pelo site para ver esta missão.');
  }

  /* ---- o balão (o clique de quem joga; os dois cliques do mestre) ---- */
  function balao(t, x, y) {
    const mq = t.mq || null, gm = isGM(), items = [];
    if (!mq || !mq.id) {
      if (!gm) return;
      items.push({ head: 'Marcador de missão (sem missão)' }, { label: 'Ligar a uma missão…', icon: 'link', run: () => { setSel([{ c: 'tokens', id: t.id }]); UI.openTab('sel', 'pr-mq'); } });
    } else {
      const oculta = mq.e === 'oculta';
      items.push({ head: oculta && !gm ? 'Uma missão (ainda sem nome)' : mq.oid ? mq.ot || 'Objetivo' : mq.t || 'Missão' });
      items.push({ head: (mq.oid ? 'Opcional de “' + (oculta && !gm ? '…' : mq.t) + '” · ' : '') + (mq.tp === 'principal' ? 'Missão principal' : 'Missão secundária') + (ESTADO[mq.e] && mq.e !== 'ativa' && mq.e !== 'oferta' ? ' · ' + ESTADO[mq.e] : '') });
      if (!oculta || gm) items.push({ label: 'Abrir na aba Missões', icon: 'right', disabled: !naCasca(), run: () => abrirMissao(mq) });
    }
    if (gm) {
      items.push('-', { label: t.hidden ? 'Mostrar aos jogadores' : 'Ocultar dos jogadores', icon: t.hidden ? 'eye' : 'eyeOff', run: () => Store.tx(t.hidden ? 'Mostrar o marcador' : 'Ocultar o marcador', () => Store.upd('tokens', t.id, { hidden: !t.hidden })) });
      if (mq && mq.id) items.push({ label: 'Trocar a missão…', icon: 'link', run: () => { setSel([{ c: 'tokens', id: t.id }]); UI.openTab('sel', 'pr-mq'); } });
    }
    UI.menuEm(x, y, items);
  }

  /* ---- o painel do objeto ---- */
  function secao(t, K) {
    const mq = t.mq || null;
    if (!isGM()) {
      if (!mq || !mq.id) return null;
      const oculta = mq.e === 'oculta';
      return K.sec('s-mq', 'Missão', true,
        K.note(oculta ? 'Uma missão que o mestre ainda não revelou.' : (mq.oid ? 'Opcional: ' + (mq.ot || 'objetivo') + ' (de “' + mq.t + '”)' : mq.t) + ' · ' + (mq.tp === 'principal' ? 'principal' : 'secundária') + (ESTADO[mq.e] && mq.e !== 'ativa' && mq.e !== 'oferta' ? ' · ' + ESTADO[mq.e] : '')),
        oculta ? null : h('div', { class: 'row' }, K.btn('Abrir na aba Missões', () => abrirMissao(mq), { kind: 'small', icon: 'right', id: 'pr-mq-abrir', disabled: !naCasca() })));
    }
    const lista = missoes(), atual = mq && mq.id ? lista.find(x => x.id === mq.id) : null;
    const opcs = [['', lista.length ? 'Nenhuma' : 'Nenhuma missão ainda']].concat(lista.map(x => [x.id, (x.tp === 'principal' ? '★ ' : '') + x.t + (x.e === 'oculta' ? ' (oculta)' : x.e === 'feita' ? ' (cumprida)' : x.e === 'falhou' ? ' (falhou)' : '')]));
    if (mq && mq.id && !atual) opcs.push([mq.id, '(a missão foi apagada)']);
    const parte = atual && atual.ops.length ? [['', 'A missão inteira']].concat(atual.ops.map(o => [o.id, 'Opcional: ' + (o.t || 'objetivo')])) : null;
    const sel = K.inSelect('pr-mq', mq && mq.id ? mq.id : '', opcs, v => ligar(t, v || null, null));
    return K.sec('s-mq', 'Missão', true,
      K.field('Missão', sel, 'stack'),
      parte ? K.field('O que marca', K.inSelect('pr-mq-op', mq.oid || '', parte, v => ligar(t, mq.id, v || null)), 'stack') : null,
      mq && mq.id ? K.note((ESTADO[mq.e] || '') + (mq.e === 'sumiu' ? '.' : '. O marcador muda sozinho quando a missão muda na aba Missões.')) : K.note(D() ? 'Escolha a missão. Só as missões com objetivos marcados como “Opcional” deixam escolher um objetivo.' : 'Os marcadores se ligam às missões da aba Missões, numa mesa.'),
      h('div', { class: 'row' },
        K.btn(t.hidden ? 'Revelar aos jogadores' : 'Ocultar dos jogadores', () => Store.tx(t.hidden ? 'Mostrar o marcador' : 'Ocultar o marcador', () => Store.upd('tokens', t.id, { hidden: !t.hidden })), { kind: 'small' + (t.hidden ? ' primary' : ''), icon: t.hidden ? 'eye' : 'eyeOff', id: 'pr-mq-ver' }),
        mq && mq.id ? K.btn('Abrir na aba Missões', () => abrirMissao(mq), { kind: 'small', icon: 'right', id: 'pr-mq-abrir', disabled: !naCasca() }) : null));
  }

  /* ---- os geradores: pôr marcadores na cena que acabou de nascer ----
     o: { modo: 'nada' | 'vazios' | 'minhas', ids: [missões escolhidas] }; lugares: [[x, y], …] em quadrados, os melhores
     primeiro (a taverna, a guilda, a praça…). → quantos entraram */
  function porNaCena(sc, o, lugares) {
    if (!o || o.modo === 'nada' || !Array.isArray(lugares) || !lugares.length) return 0;
    const c = sc.cell, ocup = new Set(sc.tokens.map(t => Math.floor(t.x / c) + ',' + Math.floor(t.y / c)));
    const livre = (x, y) => { for (let r = 0; r < 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const i = Math.floor(x) + dx, j = Math.floor(y) + dy; if (i < 1 || j < 1 || i >= sc.cols - 1 || j >= sc.rows - 1 || ocup.has(i + ',' + j)) continue; ocup.add(i + ',' + j); return [i, j]; } return null; };
    const alvos = o.modo === 'minhas' ? (o.ids || []).map(id => ({ id })).filter(x => x.id) : Array.from({ length: Math.min(3, lugares.length) }, () => null);
    let n = 0;
    alvos.forEach((a, i) => {
      const [lx, ly] = lugares[i % lugares.length], q = livre(lx, ly);
      if (!q) return;
      const t = Props.novo(sc, 'missao', q[0] * c, q[1] * c, 1, true);
      t.mq = a ? copia({ id: a.id }) : undefined; if (!t.mq) delete t.mq;
      t.name = nome(t.mq);
      sc.tokens.push(t); n++;
    });
    return n;
  }
  /* Os bons lugares de uma cena recém-gerada para os marcadores (em quadrados), os melhores primeiro e afastados uns
     dos outros: a porta da taverna, da estalagem, da guilda, do quartel, do templo e do casarão; o quadro de missões; os
     pontos de interesse da praça, do mercado e do templo; o poço, a fogueira e o totem; as outras portas; o meio. */
  const PESO_PORTA = { taverna: 0, estalagem: 0, guilda: 1, quartel: 2, templo: 3, senhor: 4, prefeitura: 4, loja: 6, ferraria: 7, armazem: 8 };
  function lugaresDaCena(sc) {
    const c = sc.cell, cand = [];
    for (const t of sc.tokens || []) {
      const x = t.x / c + (t.size || 1) / 2, y = t.y / c + (t.size || 1) / 2;
      if (t.prop === 'entrada' && t.gera && t.gera.t) { const pe = PESO_PORTA[t.gera.t]; cand.push([pe == null ? (t.gera.c ? 5 : 9) : pe, x, y + 1]); }
      else if (t.prop === 'quadroMissoes') cand.push([0, x, y + 1]);
      else if (t.prop === 'interesse' && /pra[çc]a|mercado|templo|castelo/i.test(t.name || '')) cand.push([1, x, y]);
      else if (t.prop === 'poco' || t.prop === 'fogueira' || t.prop === 'totem') cand.push([5, x + 1, y]);
    }
    cand.sort((a, b) => a[0] - b[0]);
    const out = [];
    for (const [, x, y] of cand) if (out.every(([a, b]) => Math.hypot(a - x, b - y) >= 4)) out.push([x, y]);
    if (!out.length) out.push([sc.cols / 2, sc.rows / 2]);
    return out;
  }
  const POVOADOS = new Set(['vila', 'cidade', 'cidadeGrande', 'tribo', 'porto']);

  /* A escolha no gerador (fica nas preferências: genMq = 'nada' | 'vazios' | 'minhas'; genMqIds = [ids]). */
  const prefs = () => { const o = App.opt; return { modo: ['nada', 'vazios', 'minhas'].includes(o.genMq) ? o.genMq : 'nada', ids: Array.isArray(o.genMqIds) ? o.genMqIds.filter(x => typeof x === 'string') : [] }; };
  function controles(K, mudou) {
    const pr = prefs(), set = (k, v) => { App.opt[k] = v; if (mudou) mudou(); }, lista = missoes().filter(x => x.e !== 'feita' && x.e !== 'falhou');
    const marcadas = new Set(pr.ids.filter(id => lista.some(x => x.id === id)));
    return h('div', { class: 'ger-mq', id: 'ger-mq' },
      K.field('Marcadores de missão', K.seg('ger-mq-modo', pr.modo, [['nada', 'Sem marcadores'], ['vazios', 'Vazios'], ['minhas', 'Das minhas missões']], v => set('genMq', v)), 'stack'),
      pr.modo === 'vazios' ? K.note('Até 3 marcadores ocultos, em lugares que fazem sentido (a taverna, a guilda, a praça). Depois, clique em cada um e escolha a missão.') : null,
      pr.modo === 'minhas' ? (lista.length ? h('div', { class: 'ger-mq-lista' }, lista.map(x => K.toggle('ger-mq-' + x.id, marcadas.has(x.id), v => { if (v) marcadas.add(x.id); else marcadas.delete(x.id); set('genMqIds', [...marcadas]); }, (x.tp === 'principal' ? '★ ' : '') + x.t + (x.e === 'oculta' ? ' (oculta)' : ''))),
        K.note('Um marcador oculto para cada missão marcada, espalhados pelos lugares da cidade.')) : K.note(D() ? 'Nenhuma missão em aberto. Crie na aba Missões.' : 'As missões vêm da aba Missões, numa mesa.')) : null);
  }

  /* Depois de o gerador criar a cena (só nos povoados): os marcadores escolhidos. → o texto para o aviso, ou '' */
  function aplicar(sc, lugar) {
    if (!POVOADOS.has(lugar)) return '';
    const o = prefs();
    if (o.modo === 'nada') return '';
    const n = porNaCena(sc, o, lugaresDaCena(sc));
    if (!n) return '';
    Persist.scene(sc.id);
    return `${n} ${n === 1 ? 'marcador de missão' : 'marcadores de missão'} (${n === 1 ? 'oculto' : 'ocultos'}${o.modo === 'vazios' ? ': clique em cada um e escolha a missão' : ''}).`;
  }

  return { eh, missoes, copia, ligar, sincronizar, balao, secao, abrirMissao, porNaCena, lugaresDaCena, prefs, controles, aplicar, nome, POVOADOS };
})();
