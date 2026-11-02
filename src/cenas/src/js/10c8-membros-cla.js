/* ---------------------------------------------------------------
   10c8. PUXAR OS MEMBROS DO CLÃ (lote 59)
   O mestre escolhe um clã da mesa e marca, na lista dos membros (com cargo ou sem), quem vem para a cena: cada um vira
   um token com o nome e a foto (a enviada no Clã, ou o retrato da ficha ligada), com a borda na cor do brasão. Os
   tokens entram em quadrados livres a partir do meio da tela (ou do ponto clicado); um Desfazer tira todos.
   --------------------------------------------------------------- */
const MembrosCla = (() => {
  const K = UI.kit;
  const { field, inSelect, btn, note } = K;
  const toast = (t, o) => UI.toast(t, o);
  const ehObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const imagemOk = u => typeof u === 'string' && (/^https:\/\//.test(u) || /^data:image\/(png|jpeg|webp);base64,/.test(u));
  const docs = () => { try { return window.TC && TC.dados && TC.dados.col ? TC.dados.col('documentos').todas() : []; } catch (e) { return []; } };
  // os clãs da mesa (o documento do mestre), em ordem
  function clas() {
    const N = window.ClaNucleo;
    if (!N) return [];
    return docs().filter(l => typeof l.id === 'string' && l.id.startsWith('cla:c:') && !l.apagado && ehObj(l.dados))
      .map(l => Object.assign(N.normCla(l.dados), { id: l.id.slice(6) }))
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  }
  // os membros de um clã: o nome, o cargo, a foto (a do Clã; senão, a da ficha ligada)
  function membros(c) {
    const N = window.ClaNucleo;
    return N.membrosDe(c).map(m => {
      const d = m.dados || {}, pc = m.pessoa.pc || d.pc || null, l = pc && Fichas.on() ? Fichas.get(pc) : null;
      const fichaImg = l ? Fichas.imagemDe(l) : null, nome = (l && String(l.nome || '').trim()) || m.pessoa.nome || 'Alguém';
      return { pid: m.pid, nome: nome.slice(0, 60), cargo: m.cargo ? (c.cargos[m.cargo] || {}).nome || '' : '', img: imagemOk(d.img) ? d.img : imagemOk(fichaImg) ? fichaImg : null };
    });
  }
  const corDe = c => { const cs = c && c.brasao && Array.isArray(c.brasao.cores) ? c.brasao.cores : []; return typeof cs[0] === 'string' && /^#[0-9a-f]{6}$/i.test(cs[0]) ? cs[0] : null; };
  // a foto do membro como imagem da cena (o mesmo endereço: o mesmo id)
  // (na mesa, o endereço do banco vira a imagem da cena na hora; uma embutida sobe para o banco: promessa)
  function assetDe(url, nome) {
    if (!imagemOk(url)) return null;
    try {
      const a = Assets.fromData({ id: 'img_' + hashStr(url).toString(36) + url.length.toString(36), url, w: 512, h: 512, kind: 'token', name: nome });
      if (a && typeof a.then === 'function') return a.then(x => (x && x.id ? x.id : null), () => null);
      if (a && a.id) return a.id;
      return /^https:\/\//.test(url) ? Assets.register(url, 512, 512, 'token', nome).id : null;
    } catch (e) { return null; }
  }

  function abrir(onde) {
    if (!isGM()) { toast('Só o mestre puxa os membros do clã.'); return; }
    if (!Nuvem.on() || !window.ClaNucleo) { toast('Puxar os membros do clã funciona dentro do site, com uma mesa aberta.'); return; }
    const lista = clas();
    if (!lista.length) { toast('Esta mesa ainda não tem clãs. Crie na aba Clã.'); return; }
    const st = { cla: lista.some(c => c.id === App.opt.membrosCla) ? App.opt.membrosCla : lista[0].id, marcados: new Set() };
    const atual = () => lista.find(c => c.id === st.cla);
    const marcarTodos = on => { st.marcados = new Set(on ? membros(atual()).map(m => m.pid) : []); };
    marcarTodos(true);
    const ul = h('ul', { class: 'area-list', id: 'mc-lista' }), conta = h('span', { class: 'area-count', id: 'mc-conta' });
    const paint = () => {
      const ms = membros(atual()), cor = corDe(atual());
      conta.textContent = ms.length ? `${st.marcados.size} de ${ms.length} marcados` : 'Este clã ainda não tem membros';
      ul.replaceChildren(...ms.map((m, k) => {
        const on = st.marcados.has(m.pid);
        return h('li', { class: 'area-row' + (on ? '' : ' off') },
          h('label', { class: 'area-who' },
            h('input', { type: 'checkbox', class: 'ck', id: `mc-on-${k}`, checked: on, 'aria-label': 'Trazer ' + m.nome, onchange: e => { if (e.target.checked) st.marcados.add(m.pid); else st.marcados.delete(m.pid); paint(); } }),
            h('span', { class: 'av', 'aria-hidden': 'true', style: Object.assign({ width: '26px', height: '26px', fontSize: '10px', backgroundColor: 'var(--hover)', color: 'var(--fg-2)', borderColor: cor || 'var(--line-strong)' }, m.img ? { backgroundImage: `url("${m.img}")` } : {}) }, m.img ? null : initials(m.nome)),
            h('span', { class: 'area-n', text: m.nome })),
          h('span', { class: 'area-res', text: m.cargo || 'sem cargo' }));
      }));
    };
    paint();
    const sel = inSelect('mc-cla', st.cla, lista.map(c => [c.id, `${c.nome || 'Clã'} (${window.ClaNucleo.membrosDe(c).length})`]), v => { st.cla = v; App.opt.membrosCla = v; marcarTodos(true); paint(); });
    UI.modal({
      title: 'Puxar os membros do clã', wide: true, focusPrimary: true,
      text: 'Cria um token para cada membro marcado, com o nome e a foto, e a borda na cor do brasão.',
      body: h('div', { class: 'area' },
        field('Clã', sel, 'stack'),
        h('div', { class: 'area-bar' }, conta, h('span', { class: 'spacer' }), btn('Todos', () => { marcarTodos(true); paint(); }, { kind: 'small', id: 'mc-todos' }), btn('Nenhum', () => { marcarTodos(false); paint(); }, { kind: 'small', id: 'mc-nenhum' })),
        ul,
        note('A foto é a enviada no Clã; sem ela, o retrato da ficha ligada. Os tokens entram em quadrados livres, a partir ' + (onde ? 'do ponto clicado' : 'do meio da tela') + '. Um Desfazer tira todos de uma vez.')),
      actions: [{ label: 'Cancelar' }, {
        label: 'Trazer', kind: 'primary', run: () => {
          const c = atual(), ms = membros(c).filter(m => st.marcados.has(m.pid));
          if (!ms.length) { toast('Marque pelo menos um membro.'); return false; }
          const feitos = trazer(c, ms, onde);
          setSel(feitos.map(id => ({ c: 'tokens', id })));
          if (App.tool !== 'select') Tools.set('select');
          toast(feitos.length === 1 ? 'Um token criado.' : `${feitos.length} tokens criados.`, { action: 'Desfazer', run: Tools.undo });
        },
      }],
    });
  }
  // os tokens: em quadrados livres a partir de (onde) ou do meio da tela → os ids
  function trazer(c, ms, onde) {
    const sc = Store.scene(), [cw, ch] = Render.size();
    const cx = onde ? onde.x : App.view.x + cw / (2 * App.view.z), cy = onde ? onde.y : App.view.y + ch / (2 * App.view.z);
    const pos = Combate.vagas(sc, ms.length, cx, cy), cor = corDe(c), feitos = [];
    const imgs = ms.map(m => assetDe(m.img, m.nome));
    Store.tx(ms.length === 1 ? 'Trazer membro do clã' : 'Trazer os membros do clã', () => {
      ms.forEach((m, i) => {
        const t = newToken(sc, pos[i][0], pos[i][1], Object.assign({ name: m.nome, img: typeof imgs[i] === 'string' ? imgs[i] : null }, cor ? { color: cor } : null));
        Store.add('tokens', t);
        feitos.push(t.id);
      });
    });
    // (a foto que ainda estava subindo entra quando chega, fora do desfazer — como a imagem da ficha)
    const cena = Store.S.current;
    imgs.forEach((p, i) => { if (p && typeof p.then === 'function') p.then(id => { const t = id && Store.S.scenes[cena] ? Store.S.scenes[cena].tokens.find(x => x.id === feitos[i]) : null; if (t && !t.img) Store.remoteIn(cena, [{ t: 'upd', c: 'tokens', id: t.id, p: { img: id } }]); }); });
    return feitos;
  }
  return { abrir, clas, membros, trazer };
})();
