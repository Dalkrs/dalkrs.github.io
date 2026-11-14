/* ---------------------------------------------------------------
   10gu. OS SEGREDOS COM TRÊS PISTAS (lote 155) — a regra das três pistas: para cada coisa que os jogadores precisam
   descobrir, três pistas, cada uma por um caminho (um objeto, uma pessoa, um lugar); qualquer uma basta.
   O mestre escreve o segredo e as três pistas (ou pede à IA, e revisa), e escolhe a cena de cada pista. Cada pista vira
   uma Marca de pista escondida (só o mestre vê) na cena dela, com o texto na nota.
   Onde fica: o segredo mora na cena em que nasceu (sc.segredos: { id, titulo, texto, pistas: [{ n, txt, cena, tok,
   achou }] }); a marca de cada pista leva t.seg = { id, n }. A lista (na aba Guardas) junta os segredos de todas as cenas.
   --------------------------------------------------------------- */
const Segredos = (() => {
  const novoId = () => 'sg' + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5);
  const txt = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
  // todos os segredos de todas as cenas: [{ s, sc }]
  function todos() {
    const out = [];
    for (const id of Store.S.order) { const sc = Store.S.scenes[id]; for (const s of (sc && Array.isArray(sc.segredos) ? sc.segredos : [])) if (s && s.id) out.push({ s, sc }); }
    return out;
  }
  // uma casa livre na cena: dentro de um cômodo, se ela sabe dos dela; senão, qualquer uma sem nada em cima
  function casaLivre(sc) {
    const c = sc.cell, ocup = new Set();
    for (const t of sc.tokens || []) { const [w, hh] = tokWH(t); for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) ocup.add(Math.round(t.x / c + x) + ',' + Math.round(t.y / c + y)); }
    const salas = sc.comodos && Array.isArray(sc.comodos.salas) && sc.comodos.salas.length ? sc.comodos.salas : null;
    for (let i = 0; i < 300; i++) {
      let x, y;
      if (salas && i < 200) { const q = salas[Math.floor(Math.random() * salas.length)]; x = q.x + Math.floor(Math.random() * q.w); y = q.y + Math.floor(Math.random() * q.h); }
      else { x = 1 + Math.floor(Math.random() * Math.max(1, sc.cols - 2)); y = 1 + Math.floor(Math.random() * Math.max(1, sc.rows - 2)); }
      if (!ocup.has(x + ',' + y)) return [x, y];
    }
    return [1, 1];
  }
  // a marca da pista numa cena (a de agora pelo Store, com Desfazer; as outras direto, e guardadas)
  function porPista(scId, seg, n, titulo, texto) {
    const sc = Store.S.scenes[scId];
    if (!sc || !Props.P.pista) return null;
    const [x, y] = casaLivre(sc), t = Props.novo(sc, 'pista', x * sc.cell, y * sc.cell, 1, true);
    t.name = `Pista ${n}: ${titulo}`.slice(0, 60); t.notes = texto; t.seg = { id: seg, n };
    if (scId === Store.S.current) Store.add('tokens', t);
    else { sc.tokens.push(t); Persist.scene(scId); }
    return t.id;
  }
  function criar(o) {
    const sc = Store.scene(), id = novoId(), titulo = txt(o.titulo, 60) || 'Segredo';
    let s;
    Store.tx('Novo segredo', () => {
      const pistas = o.pistas.map((p, i) => ({ n: i + 1, txt: txt(p.txt, 600), cena: Store.S.scenes[p.cena] ? p.cena : sc.id }));
      for (const p of pistas) p.tok = porPista(p.cena, id, p.n, titulo, p.txt);
      s = { id, titulo, texto: txt(o.texto, 1200), pistas };
      Store.scn({ segredos: (Array.isArray(sc.segredos) ? sc.segredos : []).concat([s]) });
    });
    return s;
  }
  // marca a pista como achada (no registro, na cena do segredo)
  function marcar(sc, sid, n, on) {
    const l = (sc.segredos || []).map(s => (s.id !== sid ? s : Object.assign({}, s, { pistas: s.pistas.map(p => (p.n === n ? Object.assign({}, p, { achou: !!on }) : p)) })));
    if (sc.id === Store.S.current) Store.tx('Pista achada', () => Store.scn({ segredos: l }));
    else { sc.segredos = l; Persist.scene(sc.id); }
  }
  function apagar(sc, sid) {
    const s = (sc.segredos || []).find(x => x.id === sid);
    if (!s) return;
    Store.tx('Apagar o segredo', () => {
      for (const p of s.pistas) {
        const c2 = Store.S.scenes[p.cena];
        if (!c2) continue;
        if (c2.id === Store.S.current) { if (Store.get('tokens', p.tok)) Store.del('tokens', p.tok); }
        else { c2.tokens = c2.tokens.filter(t => t.id !== p.tok); Persist.scene(c2.id); }
      }
      if (sc.id === Store.S.current) Store.scn({ segredos: sc.segredos.filter(x => x.id !== sid) });
      else { sc.segredos = sc.segredos.filter(x => x.id !== sid); Persist.scene(sc.id); }
    });
  }
  const achada = p => { if (p.achou) return true; const c2 = Store.S.scenes[p.cena], t = c2 && (c2.tokens || []).find(x => x.id === p.tok); return !!(t && !t.hidden); };
  function irPara(p) {
    if (!Store.S.scenes[p.cena]) return;
    if (p.cena !== Store.S.current) UI.switchScene(p.cena);
    setTimeout(() => { const t = Store.get('tokens', p.tok), sc = Store.scene(); if (!t) return; setSel([{ c: 'tokens', id: t.id }]); const [cx, cy] = tokC(t, sc); Render.centerOn(cx, cy); }, 60);
  }

  /* ---------------- a IA: as três pistas ---------------- */
  async function pistasDaIA(segredo, titulo, cenas) {
    const T = window.TC;
    if (!T || !T.ia || !T.ia.pedir) throw new Error('A IA funciona com a mesa aberta no site.');
    const nomes = cenas.map(c => c.name).slice(0, 40);
    const sistema = [
      'Você ajuda o mestre de uma mesa de RPG de fantasia (em português do Brasil).',
      'O mestre tem um segredo que os jogadores precisam descobrir. Escreva TRÊS pistas, seguindo a regra das três pistas:',
      '- cada pista, sozinha, já leva ao segredo, por um caminho diferente: uma é um objeto (uma carta, um diário, uma marca), uma é uma pessoa (o que alguém diz ou faz), uma é um lugar (algo que se vê ali);',
      '- curtas (uma ou duas frases), concretas, do jeito que o mestre lê ou mostra; sem contar o segredo de cara: os jogadores ligam os pontos;',
      '- para cada pista, escolha a cena onde ela fica, da lista de cenas do mestre (o nome igual), ou deixe vazio se nenhuma serve.',
      'Cenas do mestre: ' + (nomes.length ? nomes.join(' | ') : '(nenhuma)'),
    ].join('\n');
    const ferramenta = { name: 'tres_pistas', description: 'As três pistas do segredo.', input_schema: { type: 'object', required: ['pistas'], properties: { pistas: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', required: ['texto', 'forma'], properties: { texto: { type: 'string' }, forma: { type: 'string', enum: ['objeto', 'pessoa', 'lugar'] }, cena: { type: 'string' } } } } } } };
    const r = await T.ia.pedir({ acao: 'pistas', texto: (titulo ? 'Título: ' + titulo + '\n' : '') + 'O segredo: ' + segredo, sistema, ferramenta });
    const l = r && r.dados && Array.isArray(r.dados.pistas) ? r.dados.pistas : null;
    if (!l || !l.length) throw new Error('A IA não devolveu as pistas. Tente escrever o segredo de outro jeito.');
    return l.slice(0, 3).map(p => ({ txt: txt(p.texto, 600), forma: p.forma, cena: (cenas.find(c => c.name === p.cena) || {}).id || '' }));
  }

  /* ---------------- a janela "Novo segredo" ---------------- */
  function abrirNovo() {
    if (!isGM()) return;
    const K = UI.kit, sc0 = Store.scene();
    const cenas = Store.S.order.map(id => Store.S.scenes[id]).filter(Boolean);
    const outras = cenas.filter(c => c.id !== sc0.id).sort(() => Math.random() - 0.5);
    const o = { titulo: '', texto: '', pistas: [0, 1, 2].map(i => ({ txt: '', cena: i === 0 || !outras.length ? sc0.id : outras[(i - 1) % outras.length].id })) };
    let msg = '';
    const corpo = h('div', { class: 'seg-novo' });
    const opcs = cenas.map(c => [c.id, c.name]);
    const pintarC = () => corpo.replaceChildren(
      K.field('Título (curto)', h('input', { class: 'in', id: 'seg-titulo', value: o.titulo, maxlength: 60, oninput: e => { o.titulo = e.target.value; } }), 'stack'),
      K.field('O segredo (só você vê)', h('textarea', { class: 'in', id: 'seg-texto', rows: 3, value: o.texto, oninput: e => { o.texto = e.target.value; } }), 'stack'),
      h('div', { class: 'row' }, K.btn('Escrever as pistas com a IA', ia, { kind: 'small', icon: 'fx', id: 'seg-ia' })),
      msg ? h('p', { class: 'note', id: 'seg-msg', text: msg }) : null,
      ...o.pistas.map((p, i) => h('div', { class: 'seg-pista' },
        K.field('Pista ' + (i + 1) + (p.forma ? ' (' + p.forma + ')' : ''), h('textarea', { class: 'in', id: 'seg-p' + i, rows: 2, value: p.txt, oninput: e => { p.txt = e.target.value; } }), 'stack'),
        K.field('Em qual cena', K.inSelect('seg-c' + i, p.cena, opcs, v => { p.cena = v; }), 'stack'))),
      K.note('Cada pista vira uma Marca de pista escondida na cena dela, com o texto na nota. A lista fica na aba Guardas.'));
    async function ia() {
      if (!o.texto.trim()) { msg = 'Escreva o segredo primeiro.'; pintarC(); return; }
      msg = 'Pensando…'; pintarC();
      try {
        const l = await pistasDaIA(o.texto.trim(), o.titulo.trim(), cenas);
        l.forEach((x, i) => { if (!o.pistas[i]) return; o.pistas[i].txt = x.txt; o.pistas[i].forma = x.forma; if (x.cena) o.pistas[i].cena = x.cena; });
        msg = 'Pronto: revise e mude o que quiser.';
      } catch (e) { msg = (e && e.message) || 'A IA não respondeu.'; }
      pintarC();
    }
    pintarC();
    UI.modal({ title: 'Novo segredo', body: corpo, actions: [{ label: 'Cancelar' }, { label: 'Criar o segredo', kind: 'primary', run: () => {
      if (!o.texto.trim() || o.pistas.some(p => !p.txt.trim())) { UI.toast('Escreva o segredo e as três pistas.'); return false; }
      const s = criar(o);
      UI.toast(`Segredo "${s.titulo}" criado: as 3 pistas estão escondidas nas cenas delas.`, { long: true });
      UI.refresh();
      return true;
    } }] });
  }

  /* ---------------- a lista (na aba Guardas) ---------------- */
  function secao(K) {
    const l = todos();
    return K.sec('s-gd-seg', 'Segredos' + (l.length ? ` (${l.length})` : ''), true,
      l.length ? h('ul', { class: 'list seg-lista' }, l.map(({ s, sc }) => {
        const nAch = s.pistas.filter(achada).length;
        return h('li', { class: 'seg-li' + (nAch ? ' achou' : '') },
          h('div', { class: 'seg-cab' }, h('b', { text: s.titulo }), h('small', { text: `${nAch} de 3 achadas · nasceu em ${sc.name}` }),
            K.iconBtn('trash', 'Apagar o segredo', () => UI.confirm('Apagar o segredo?', `"${s.titulo}" e as 3 marcas de pista saem das cenas.`, 'Apagar').then(ok => { if (ok) { apagar(sc, s.id); UI.refresh(); } }), { size: 14, id: 'seg-x-' + s.id })),
          h('p', { class: 'seg-txt', text: s.texto }),
          ...s.pistas.map(p => h('div', { class: 'seg-p' + (achada(p) ? ' achada' : '') },
            K.toggle('seg-a-' + s.id + '-' + p.n, achada(p), on => { marcar(sc, s.id, p.n, on); UI.refresh(); }, `Pista ${p.n}`),
            h('button', { type: 'button', class: 'li-m seg-p-t', title: 'Ir até a pista', onclick: () => irPara(p), text: `${p.txt} — ${(Store.S.scenes[p.cena] || {}).name || 'cena apagada'}` }))));
      })) : K.note('Nenhum segredo ainda. Um segredo tem 3 pistas, cada uma num caminho (um objeto, uma pessoa, um lugar): qualquer uma basta para os jogadores chegarem lá.'),
      h('div', { class: 'row' }, K.btn('Novo segredo…', abrirNovo, { kind: 'small', icon: 'plus', id: 'seg-novo' })));
  }
  return { todos, criar, marcar, apagar, achada, abrirNovo, secao, pistasDaIA };
})();
