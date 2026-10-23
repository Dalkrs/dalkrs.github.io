/* ---------------------------------------------------------------
   10g4. ARENA — as arenas de boss (lote 18)
   A aba "Arena" de "Gerar um lugar…" (o tipo, o tamanho e as fases prontas: cada mudança liga, desliga ou troca) e as
   fases na cena: a cena da arena guarda as fases (sc.fases, só do mestre); a aba Cena mostra cada uma com o botão de
   acionar, e o menu do mapa (botão direito no vazio) também. Acionar mostra antes o que vai mudar; tudo num passo só
   (o Desfazer volta). O plano e o desenho são os da masmorra (Masmorra.gerar com tipo 'arena').
   --------------------------------------------------------------- */
const Arena = (() => {
  const NOTA = {
    coliseu: 'A arena de areia cercada pela arquibancada: o camarote do campeão, as estátuas e as barricadas como cobertura, os espinhos no chão e a grade da entrada.',
    trono: 'O salão das colunas: o tapete até o estrado do trono, os braseiros, as portas dos lados (por onde chega a guarda) e o óleo no chão.',
    mausoleu: 'Os túmulos em fileiras, os nichos dos mortos, o sarcófago do senhor no estrado, as velas e a névoa venenosa.',
    covil: 'A caverna do dragão: o rochedo alto por cima do tesouro, a lava pelos lados, os ossos e as estalagmites como cobertura.',
    altar: 'O altar no estrado, o círculo das runas no meio (escondidas até a fase delas) e as colunas com os braseiros em volta.',
    ponte: 'A ponte estreita sobre o abismo, com a plataforma do meio: quem cai, cai fundo (o relevo sugere a queda).',
    topo: 'O alto da torre cercado pelo vazio: a mureta com as ameias (aberta na escada), as estátuas e a tempestade.',
    circulo: 'A clareira na mata, o anel das pedras de pé (com as passagens), a pedra do altar no meio e as runas escondidas.',
  };
  // a mudança por extenso (para a janela e para a prévia do acionar)
  function textoDaMudanca(m) {
    if (!m) return '';
    if (m.k === 'reforcos') return (m.pts || []).length + ' ' + ((m.pts || []).length === 1 ? 'reforço' : 'reforços') + ' (' + (m.nome || 'Lacaio') + ') chegam nos pontos marcados';
    if (m.k === 'desaba') return 'o chão desaba (um fosso de 6 m)';
    if (m.k === 'luz') return 'as luzes e o fogo se apagam';
    if (m.k === 'grade') return 'a grade da entrada fecha e tranca';
    if (m.k === 'zona') { const n = Masmorra.nomeMud('zona:' + m.fx); return (n !== 'zona:' + m.fx ? n.charAt(0).toLowerCase() + n.slice(1) : 'a zona ' + ((FX.P[m.fx] || {}).n || m.fx).toLowerCase() + ' aparece') + ' (' + Math.round(m.r || 2) + ' q de raio)'; }
    return m.k;
  }
  const chaveDe = m => (m.k === 'zona' ? 'zona:' + m.fx : m.k);

  /* ================= a aba da janela "Gerar um lugar…" ================= */
  function padrao() {
    const o = App.opt;
    return { tipo: Masmorra.ARENAS.some(x => x[0] === o.arTipo) ? o.arTipo : 'coliseu', tamanho: Masmorra.TAM_ARENA[o.arTam] ? o.arTam : 'medio', fases: null };
  }
  // as fases do tipo (a tabela), com o que o mestre mudou: [[{ k, on }]]
  const fasesDe = st => (Masmorra.FASES_ARENA[st.tipo] || []).map((ks, i) => ks.map((k, j) => { const o = st.fases && st.fases[i] && st.fases[i][j]; return o ? { k: o.k, on: o.on !== false } : { k, on: true }; }));
  function controles(st, K, mudou) {
    const { field, seg, toggle } = K;
    const muda = (campo, v) => { st[campo] = v; if (campo === 'tipo') st.fases = null; App.opt.arTipo = st.tipo; App.opt.arTam = st.tamanho; mudou(true); };
    const fs = fasesDe(st);
    const linhas = fs.map((ms, i) => h('div', { class: 'ar-fase', 'data-fase': i + 2 },
      h('b', { text: 'Fase ' + (i + 2) }),
      ...ms.map((m, j) => h('div', { class: 'ar-mud' },
        toggle('ar-f' + (i + 2) + '-' + j, m.on, v => { const f = fasesDe(st); f[i][j].on = v; st.fases = f; mudou(true); }, ''),
        h('select', { class: 'in', id: 'ar-f' + (i + 2) + '-' + j + '-k', 'aria-label': 'A mudança ' + (j + 1) + ' da fase ' + (i + 2), disabled: !m.on,
          onchange: e => { const f = fasesDe(st); f[i][j].k = e.target.value; st.fases = f; e.target.blur(); mudou(true); } },
          Masmorra.MUDANCAS.filter(([k]) => k !== 'grade' || st.tipo === 'coliseu' || st.tipo === 'trono' || st.tipo === 'mausoleu').map(([k, n]) => h('option', { value: k, text: n, selected: k === m.k })))))));
    return h('div', { class: 'ger-c' },
      field('Tipo', seg('ar-tipo', st.tipo, Masmorra.ARENAS.map(([k, n]) => [k, n, null, NOTA[k]]), v => muda('tipo', v)), 'stack'),
      field('Tamanho', seg('ar-tam', st.tamanho, Object.keys(Masmorra.TAM_ARENA).map(k => [k, Masmorra.TAM_ARENA[k].n, null, Masmorra.TAM_ARENA[k].W + ' × ' + Masmorra.TAM_ARENA[k].H + ' quadrados']), v => muda('tamanho', v)), 'stack'),
      field('As fases (você aciona na cena; cada mudança liga, desliga ou troca)', h('div', { class: 'ar-fases', id: 'ar-fases' }, linhas), 'stack'));
  }
  const opcoesDe = st => ({ tipo: st.tipo, tamanho: st.tamanho, fases: st.fases ? JSON.parse(JSON.stringify(st.fases)) : null });
  function aplicarOpcoes(st, o) {
    if (Masmorra.ARENAS.some(x => x[0] === o.tipo)) { st.tipo = o.tipo; st.fases = null; }
    if (Masmorra.TAM_ARENA[o.tamanho]) st.tamanho = o.tamanho;
    if (Array.isArray(o.fases)) st.fases = o.fases;
    App.opt.arTipo = st.tipo; App.opt.arTam = st.tamanho;
  }
  const gerar = (st, comum) => Masmorra.gerar({ tipo: 'arena', arena: st.tipo, tamanho: st.tamanho, estilo: comum && comum.estilo, seed: comum && comum.seed, fases: fasesDe(st) });
  const nomePadrao = p => Masmorra.NOME_ARENA[p.arena.tipo] || 'A arena';
  const feito = (sc, p) => `"${sc.name}" criada: ${Masmorra.resumo(p).replace(/\.$/, '')}. O chefe já está no lugar dele; os pontos de reforço e a entrada estão ocultos (só você vê). As fases ficam na aba Cena (e no botão direito do mapa).`;
  const LUGAR = { id: 'arena', n: 'Arena', padrao, controles, opcoesDe, aplicarOpcoes, gerar,
    previa: (cv, p, mw, mh, op) => Masmorra.previa(cv, p, mw, mh, op), resumo: p => Masmorra.resumo(p),
    partes: () => [], parteEm: () => null, nomeDaParte: () => '', formaDaParte: () => [], travada: () => false, alternar: (p, parte, trava) => trava,
    quantasTravadas: () => 0, baseDe: () => null, travaDe: () => null, nomePadrao,
    criar: (p, nome, ex) => { ex = ex || {}; return Masmorra.criar(p, nome, null, { relevo: ex.relevo !== false, id: ex.id }); },
    semHora: true,
    relevoTxt: 'Com relevo (o lugar do chefe, o abismo, a lava)',
    dica: '"Gerar outro" sorteia outra arena do mesmo tipo, com as mesmas fases.',
    nota: 'Sai uma cena nova, feita para a luta com o chefe: a entrada embaixo, o chefe no lugar dele (elevado, de frente para a entrada), a cobertura, os perigos no chão (as zonas: você aplica) e os pontos de reforço escondidos. As fases você aciona na cena, com prévia e Desfazer.',
    feito };

  /* ================= as fases na cena ================= */
  // as fases que a cena guarda, arrumadas (só o que vale)
  function fases(sc) {
    const l = sc && Array.isArray(sc.fases) ? sc.fases : [];
    return l.filter(f => f && typeof f === 'object' && Array.isArray(f.m)).map((f, i) => ({ i, n: Number(f.n) || i + 2, nome: String(f.nome || 'Fase ' + (i + 2)).slice(0, 40), feita: !!f.feita, m: f.m.filter(m => m && typeof m === 'object' && typeof m.k === 'string') }));
  }
  const proxima = sc => fases(sc).find(f => !f.feita) || null;
  // aplica uma mudança (dentro de um passo)
  function aplicar(sc, m) {
    const c = sc.cell;
    if (m.k === 'zona' && FX.P[m.fx]) {
      // a zona escondida do mesmo tipo que já estava na cena (as runas do altar) aparece; sem ela, uma zona nova
      const escondidas = sc.effects.filter(e => e.fx === m.fx && e.gm);
      if (escondidas.length) for (const e of escondidas) Store.upd('effects', e.id, { gm: false });
      else Store.add('effects', { id: uid('fx'), fx: m.fx, k: 'circ', x: (Number(m.x) || sc.cols / 2) * c, y: (Number(m.y) || sc.rows / 2) * c, r: clamp(Number(m.r) || 2, 0.5, 30), w: 1, rw: 2, rh: 2, ang: 0, dir: 0, pow: 0.8, token: null, leve: true, gm: false, by: null, seed: 1 + Math.floor(Math.random() * 997), dur: 0, dur0: 0, at: null, apply: null });
    } else if (m.k === 'desaba') {
      const x = (Number(m.x) || 0) * c, y = (Number(m.y) || 0) * c, w = Math.max(1, Number(m.w) || 3) * c, hh = Math.max(1, Number(m.h) || 2) * c;
      Store.add('shapes', Combate.newTerrain({ k: 'rect', x, y, w, h: hh }, 'fosso', -6));
    } else if (m.k === 'luz') {
      for (const l of sc.lights) if (l.on) Store.upd('lights', l.id, { on: false });
      for (const t of sc.tokens) if (t.light && t.light.on) Store.upd('tokens', t.id, { light: Object.assign({}, t.light, { on: false }) });
      if (sc.light === 'claro') Store.scn({ light: 'penumbra' });
    } else if (m.k === 'grade') {
      const gx = (Number(m.x) || 0) * c, gy = (Number(m.y) || 0) * c;
      let melhor = null;
      for (const w of sc.walls) { if (w.k !== 'door') continue; const d = Math.hypot((w.x1 + w.x2) / 2 - gx, (w.y1 + w.y2) / 2 - gy); if (!melhor || d < melhor[0]) melhor = [d, w]; }
      if (melhor && melhor[0] < c * 3) Store.upd('walls', melhor[1].id, { open: false, locked: true });
    } else if (m.k === 'reforcos') {
      (m.pts || []).forEach((pt, i) => {
        const [x, y] = snapTok(sc, (Number(pt[0]) - 0.5) * c, (Number(pt[1]) - 0.5) * c, 1, false);
        Store.add('tokens', newToken(sc, x, y, { name: (m.nome || 'Lacaio') + ' ' + (i + 1), color: '#b87c7c' }));
      });
    }
  }
  function acionar(i) {
    const sc = Store.scene();
    if (!isGM() || !sc) return;
    const f = fases(sc).find(x => x.i === i);
    if (!f) return;
    UI.modal({ title: 'Acionar a ' + f.nome.toLowerCase() + '?', text: 'O que muda na arena (dá para desfazer):',
      body: h('ul', { class: 'ar-previa', id: 'ar-previa' }, f.m.map(m => h('li', { text: textoDaMudanca(m) }))),
      actions: [{ label: 'Cancelar' }, { label: 'Acionar a ' + f.nome.toLowerCase(), kind: 'primary', run: () => {
        Store.tx(f.nome + ' da arena', () => {
          const agora = Store.scene();
          for (const m of f.m) aplicar(agora, m);
          Store.scn({ fases: agora.fases.map((x, k) => (k === i ? Object.assign({}, x, { feita: true }) : x)) });
        });
        UI.toast(f.nome + ': ' + f.m.map(textoDaMudanca).join('; ') + '.', { action: 'Desfazer', run: Tools.undo, long: true, key: 'arena-fase' });
      } }] });
  }
  // a seção da aba Cena (só o mestre; só numa arena)
  function secao(K) {
    const sc = Store.scene(), fs = fases(sc);
    if (!isGM() || !fs.length) return null;
    const { sec, note, btn } = K;
    return sec('c-fases', 'Fases da arena', true,
      ...fs.map(f => h('div', { class: 'ar-cena' + (f.feita ? ' feita' : ''), 'data-fase': f.n },
        h('div', { class: 'ar-cena-t' }, h('b', { text: f.nome }), f.feita ? h('span', { class: 'muted', text: ' · acionada' }) : null),
        h('p', { class: 'note', text: f.m.map(textoDaMudanca).join('; ') + '.' }),
        f.feita ? null : btn('Acionar a ' + f.nome.toLowerCase() + '…', () => acionar(f.i), { id: 'ar-acionar-' + f.n, kind: proxima(sc) && proxima(sc).i === f.i ? 'primary' : null }))),
      note('Os reforços chegam nos pontos marcados (ocultos para os jogadores). Cada fase é um passo: o Desfazer volta.'));
  }
  return { LUGAR, NOTA, fases, proxima, acionar, secao, textoDaMudanca, chaveDe };
})();
