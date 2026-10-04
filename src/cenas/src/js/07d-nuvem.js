/* ---------------------------------------------------------------
   7d. NUVEM — as cenas de uma mesa, guardadas no banco e vistas ao vivo
   Só age dentro do site, com uma mesa aberta. Três modos:
     local ..... sem mesa: nada daqui age; vale o IndexedDB do navegador (4. ASSETS)
     mestre .... as cenas são as da mesa (documentos que só ele lê); cada mudança é guardada sozinha, as imagens
                 vão para o Storage, e a cena que ele pôs "no ar" é projetada para os jogadores
     jogador ... vê a cena que está no ar, do jeito que pode vê-la, e o que ele faz vai como pedido ao mestre
   O formato dos documentos e as regras do que vai e do que vale estão em 7c. PROJEÇÃO.
   O que cada um já explorou do mapa (névoa) não vai para o banco: fica no aparelho de cada um.
   --------------------------------------------------------------- */
const Nuvem = (() => {
  const S = Store.S;
  const INDICE = 'cenas:indice', PUB_M = 'cena:pub:m', PUB_V = 'cena:pub:v', PRE_PED = 'cena:pedido:';
  const RE_PARTE = /^cena:([A-Za-z0-9_-]{1,60}):([mv])$/;
  const LIMITE = 1100000;                                  // o banco aceita 1,5 MB por documento, contados do jeito dele (com espaços e acentos em bytes)
  const PREFS_AQUI = 'tinycats:cenas:prefs';               // preferências de quem está neste aparelho (animação, véu, tutorial)
  const idCena = id => Proj.idOk(id) && id !== 'pub' && id !== 'pedido';
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const dadosDe = l => (l && !l.apagado && ehObj(l.dados) ? l.dados : null);
  const docM = id => 'cena:' + id + ':m', docV = id => 'cena:' + id + ':v';

  let modo = 'local', D = null, mesa = null, eu = null;
  let idx = Proj.normIndice(null);
  const sombra = new Map();                                // documento → o JSON que foi gravado por último (para não regravar igual)
  const sujas = new Set(), expSujas = new Set();
  let metaSuja = false, pubSuja = false, tGravar = 0, tExp = 0;
  let estado = 'ok', ouvinte = () => {};
  const banco = makeDB('tinycats-cenas-mesa');             // deste aparelho: o que já foi explorado em cada cena de cada mesa
  const expAqui = new Map();                               // cena → { seq, mapa } lido do aparelho
  // mestre
  const acks = {};                                         // jogador → número do último pedido dele que já valeu
  let pings = [], tPedidos = 0, grandes = new Set();
  // jogador
  let caixa = [], seq = 0, vazia = false, tReceber = 0, tPedido = 0, desde = 0, tEspera = 0;
  const pingsVistos = new Set();

  function marcar(e) { if (estado !== e) { estado = e; try { ouvinte(e); } catch (err) { console.error(err); } } }

  /* ---------------- começo ---------------- */
  async function iniciar() {
    const T = window.TC;
    // Só dentro do site (a casca abre esta página com ?casca=1). Numa moldura de outra página qualquer, a ponte
    // ficaria esperando uma resposta que não vem.
    if (!T || !T.ponte || !T.dados || !T.ponte.naCasca || !/[?&]casca\b/.test(location.search)) return modo;
    const st = await T.ponte.pronta;
    if (!st.mesa || !T.dados.disponivel()) return modo;
    D = T.dados.col('documentos');
    try { await D.pronta; } catch (e) { throw new Error('não deu para ler as cenas da mesa (' + ((e && e.message) || 'sem resposta') + ')'); }
    mesa = st.mesa.id; eu = st.eu;
    modo = st.papel === 'mestre' ? 'mestre' : 'jogador';
    await banco.open();
    if (banco.ready()) for (const [k, v] of await banco.all('exp:' + mesa + ':')) if (ehObj(v) && ehObj(v.mapa)) expAqui.set(k.slice(('exp:' + mesa + ':').length), v);
    jogadores(st);
    T.ponte.aoMudar(novo => {
      if (!novo.mesa || novo.mesa.id !== mesa) return;       // a mesa mudou: a casca recarrega esta página
      jogadores(novo);
      if (App.viewer !== 'gm' && !playerById(App.viewer) && modo === 'mestre') UI.setViewer('gm');
      Vision.invalidate(); Store.meta();
    });
    return modo;
  }
  // Os jogadores são os participantes da mesa (menos o mestre), com a cor que cada um tem nela.
  function jogadores(st) {
    S.players = (st.membros || []).filter(m => m.papel !== 'mestre' && m.id).map((m, i) => ({ id: m.id, name: m.nome || 'Jogador', color: /^#[0-9a-f]{6}$/i.test(m.cor || '') ? m.cor : PLAYER_COLORS[i % PLAYER_COLORS.length] }));
  }
  function prefsDaqui() { try { const o = JSON.parse(localStorage.getItem(PREFS_AQUI) || '{}'); return ehObj(o) ? o : {}; } catch (e) { return {}; } }
  function guardarPrefsDaqui() {
    const o = {};
    for (const k of ['anim', 'showVision', 'tour']) if (S.prefs[k] !== undefined) o[k] = S.prefs[k];
    try { localStorage.setItem(PREFS_AQUI, JSON.stringify(o)); } catch (e) { /* sem armazenamento: vale só nesta visita */ }
  }
  function registrarImgs(imgs) {
    if (!ehObj(imgs)) return;
    for (const id in imgs) {
      const a = imgs[id];
      if (!ehObj(a) || !/^https:\/\//.test(a.url || '')) continue;
      if (!S.assets[id] || S.assets[id].url !== a.url) S.assets[id] = { id, url: a.url, w: a.w || 0, h: a.h || 0, kind: a.kind || '', name: a.name || '' };
    }
  }
  // O que este aparelho lembra de explorado para a cena, se ainda vale (o mestre pode ter mandado esquecer).
  function exploradoDe(sc) { const e = expAqui.get(sc.id); return e && (e.seq || 0) === (sc.expSeq || 0) ? Object.assign({}, e.mapa) : {}; }

  /* ---------------- mestre: ler ---------------- */
  function cenaDosDocs(id) {
    const m = dadosDe(D.pegar(docM(id)));
    if (!m) return null;
    const v = dadosDe(D.pegar(docV(id)));
    const sc = Proj.juntar(m, v);
    sc.id = id;
    normalizeScene(sc);
    registrarImgs(m.imgs); if (v) registrarImgs(v.imgs);
    return sc;
  }
  function carregarMestre() {
    idx = Proj.normIndice(dadosDe(D.pegar(INDICE)));
    for (const l of D.todas()) {
      const mm = RE_PARTE.exec(l.id || '');
      if (!mm || mm[2] !== 'm' || !idCena(mm[1])) continue;
      const sc = cenaDosDocs(mm[1]);
      if (!sc) continue;
      sc.explored = exploradoDe(sc);
      S.scenes[sc.id] = sc;
    }
    S.order = idx.ordem.filter(id => S.scenes[id]);
    for (const id in S.scenes) if (!S.order.includes(id)) S.order.push(id);
    S.current = S.scenes[idx.atual] ? idx.atual : S.order[0] || null;
    if (idx.noAr && !S.scenes[idx.noAr]) idx.noAr = null;
    S.prefs = prefsDaqui();
    if (idx.prefs.barDefaults) S.prefs.barDefaults = idx.prefs.barDefaults;
    /* Até onde os pedidos de cada jogador já valeram. Com uma cena no ar, a própria projeção diz (e o que eles
       pediram enquanto o mestre estava fora ainda entra). Sem cena no ar, o que estiver parado na fila é velho. */
    const pv = dadosDe(D.pegar(PUB_V));
    if (idx.noAr && pv && pv.id === idx.noAr) {
      if (ehObj(pv.ack)) for (const k in pv.ack) if (Number(pv.ack[k]) > 0) acks[k] = Number(pv.ack[k]);
      if (Array.isArray(pv.pings)) pings = pv.pings.filter(ehObj).slice(-6);
    } else darPorVistos();
    if (idx.noAr) { pubSuja = true; agendar(); }             // a projeção é conferida a cada vez que o mestre abre a mesa
    D.aoMudar(doBanco);
    setTimeout(pedidos, 300);
    return S.order.length > 0;
  }
  // Tudo o que está nas filas dos jogadores agora passa a contar como já visto (não será aplicado).
  function darPorVistos() {
    for (const l of D.todas()) {
      if (typeof l.id !== 'string' || !l.id.startsWith(PRE_PED)) continue;
      const d = dadosDe(l), quem = l.id.slice(PRE_PED.length);
      for (const b of (d && Array.isArray(d.lote) ? d.lote : [])) if (ehObj(b) && typeof b.n === 'number' && b.n < Date.now() + 86400000 && b.n > (acks[quem] || 0)) acks[quem] = b.n;
    }
  }

  /* ---------------- mestre: gravar ---------------- */
  // Grava um documento só se o conteúdo mudou. Devolve false se ele não cabe no banco.
  function escrever(id, dados, vis) {
    const j = JSON.stringify(dados);
    if (sombra.get(id) === j) return true;
    if (j.length > LIMITE) return false;
    sombra.set(id, j);
    D.gravar(id, { vis, dados: JSON.parse(j) });
    return true;
  }
  function avisarGrande(sc) {
    if (grandes.has(sc.id)) return;
    grandes.add(sc.id);
    UI.toast(`A cena "${sc.name}" ficou grande demais para o banco (muitos desenhos ou névoa pintada). As últimas mudanças dela não foram salvas: apague desenhos antigos ou use "Revelar tudo" para recomeçar a névoa.`, { long: true });
  }
  function gravar() {
    clearTimeout(tGravar); tGravar = 0;
    if (modo !== 'mestre') return;
    let falhou = false;
    for (const id of sujas) {
      const sc = S.scenes[id];
      if (!sc) continue;
      const { m, v } = Proj.partes(sc, S.assets);
      const ok = escrever(docM(id), m, 'mestre') & escrever(docV(id), v, 'mestre');
      if (ok) grandes.delete(id); else { falhou = true; avisarGrande(sc); }
    }
    if (idx.noAr && (pubSuja || sujas.has(idx.noAr))) publicar();
    sujas.clear(); pubSuja = false;
    if (metaSuja) {
      metaSuja = false;
      escrever(INDICE, { v: 1, ordem: S.order.filter(id => S.scenes[id]), atual: S.current, noAr: idx.noAr, prefs: { barDefaults: S.prefs.barDefaults || null } }, 'mestre');
      guardarPrefsDaqui();
    }
    marcar(falhou ? 'erro' : 'ok');
  }
  const agendar = () => { marcar('saving'); if (!tGravar) tGravar = setTimeout(gravar, 450); };

  function publicar() {
    const sc = S.scenes[idx.noAr];
    if (!sc) { despublicar(); return; }
    const { m, v } = Proj.projetar(sc, S.assets);
    v.ack = Object.assign({}, acks); v.pings = pings;
    if (!(escrever(PUB_M, m, 'mesa') & escrever(PUB_V, v, 'mesa'))) avisarGrande(sc);
  }
  function despublicar() {
    for (const id of [PUB_M, PUB_V]) { if (D.pegar(id)) D.apagar(id); sombra.delete(id); }
    pings = [];
  }

  /* ---------------- mestre: o que chega do banco ---------------- */
  function doBanco(l) {
    if (!l || typeof l.id !== 'string') return;
    if (l.id.startsWith(PRE_PED)) { if (!tPedidos) tPedidos = setTimeout(pedidos, 60); return; }
    if (l.id === INDICE) { indiceDeFora(l); return; }
    const mm = RE_PARTE.exec(l.id);
    if (mm && idCena(mm[1])) cenaDeFora(mm[1], l);
  }
  // O mesmo mestre com o site aberto em outro aparelho: o que ele muda lá aparece aqui (se aqui não há nada por salvar).
  function mudouDeFato(l) { const j = sombra.get(l.id); let antes = null; try { antes = j ? JSON.parse(j) : null; } catch (e) { antes = null; } return !Proj.igual(antes, dadosDe(l)); }
  function indiceDeFora(l) {
    if (metaSuja || !mudouDeFato(l)) return;
    const n = Proj.normIndice(dadosDe(l));
    sombra.set(INDICE, JSON.stringify(dadosDe(l) || null));
    idx.noAr = S.scenes[n.noAr] ? n.noAr : null;
    const ordem = n.ordem.filter(id => S.scenes[id]);
    for (const id of S.order) if (!ordem.includes(id)) ordem.push(id);
    S.order = ordem;
    if (n.prefs.barDefaults) S.prefs.barDefaults = n.prefs.barDefaults;
    Store.meta();
  }
  function cenaDeFora(id, l) {
    if (sujas.has(id) || !mudouDeFato(l)) return;
    if (l.apagado || !dadosDe(D.pegar(docM(id)))) {
      if (!S.scenes[id] || l.id !== docM(id)) return;
      sombra.delete(docM(id)); sombra.delete(docV(id));
      const era = S.current === id;
      Store.removeScene(id);
      if (idx.noAr === id) idx.noAr = null;
      if (!S.order.length) { const n = newScene('Nova cena'); Store.addScene(n); cena(n.id); }
      if (era) UI.switchScene(S.order[0]);
      return;
    }
    const sc = cenaDosDocs(id);
    if (!sc) return;
    for (const d of [docM(id), docV(id)]) { const x = dadosDe(D.pegar(d)); if (x) sombra.set(d, JSON.stringify(x)); }
    const antes = S.scenes[id];
    sc.explored = antes ? antes.explored : exploradoDe(sc);
    if (!antes) { Store.addScene(sc); return; }
    if (Store.inTx() && id === S.current) return;            // no meio de um gesto: fica para a próxima mudança
    S.scenes[id] = sc;
    if (id === S.current) { pruneSel(); Vision.invalidate(); Store.emit('scene', id); } else Store.meta();
  }

  /* ---------------- mestre: os pedidos dos jogadores ---------------- */
  function pedidos() {
    clearTimeout(tPedidos); tPedidos = 0;
    if (modo !== 'mestre' || !idx.noAr) return;
    const sc = S.scenes[idx.noAr];
    if (!sc) return;
    if (Store.inTx() && sc.id === S.current) { tPedidos = setTimeout(pedidos, 150); return; }   // o mestre está no meio de um gesto
    let andou = false;
    for (const l of D.todas()) {
      if (typeof l.id !== 'string' || !l.id.startsWith(PRE_PED)) continue;
      const quem = l.id.slice(PRE_PED.length), d = dadosDe(l);
      if (!d || d.cena !== sc.id || !Array.isArray(d.lote) || l.dono_id !== quem || !playerById(quem)) continue;
      // (o número de cada lote é a hora em que foi feito: um número do futuro distante travaria os pedidos seguintes do jogador)
      const teto = Date.now() + 86400000;
      for (const b of d.lote.filter(x => ehObj(x) && Array.isArray(x.ops) && typeof x.n === 'number' && x.n > 0 && x.n < teto).sort((x, y) => x.n - y.n)) {
        if (!(b.n > (acks[quem] || 0))) continue;
        for (const op of b.ops.slice(0, 300)) {
          if (ehObj(op) && op.t === 'ping') { pingDe(quem, op, sc); continue; }
          const v = Proj.validar(op, quem, sc);             // contra a cena como está agora: as anteriores do lote já valeram
          if (!v || !Store.remoteIn(sc.id, [v])) continue;
          // token ligado a uma ficha, numa cena que o mestre não tem aberta: a ficha acompanha mesmo assim
          if (sc.id !== S.current && v.c === 'tokens' && v.p.bars) Fichas.paraFicha(sc.tokens.find(t => t.id === v.id));
        }
        acks[quem] = b.n; andou = true;
      }
    }
    if (andou) { pubSuja = true; agendar(); }
  }
  function pingDe(quem, op, sc) {
    if (!sc.perms.ping || typeof op.x !== 'number' || typeof op.y !== 'number' || !isFinite(op.x) || !isFinite(op.y)) return;
    const p = playerById(quem);
    porPing({ id: uid('pg'), x: op.x, y: op.y, c: p ? p.color : '#4fb8e0', n: p ? p.name : 'Jogador', by: quem }, sc.id === S.current);
  }
  function porPing(p, mostrarAqui) {
    pings.push(p); if (pings.length > 6) pings.shift();
    pingsVistos.add(p.id);
    if (mostrarAqui) { App.pings.push({ x: p.x, y: p.y, t0: performance.now(), c: p.c, n: p.n }); if (App.pings.length > 8) App.pings.shift(); Render.request(); }
    pubSuja = true; agendar();
  }

  /* ---------------- jogador ---------------- */
  // O que está no ar: { st: 'ok', m, v } · 'nada' (o mestre não está mostrando cena) · 'espera' (chegou só metade)
  function noArAgora() {
    const m = dadosDe(D.pegar(PUB_M)), v = dadosDe(D.pegar(PUB_V));
    if (!m && !v) return { st: 'nada' };
    if (!m || !v || !idCena(m.id) || m.id !== v.id) return { st: 'espera' };
    return { st: 'ok', m, v };
  }
  function cenaVazia() {
    const sc = newScene('Sem cena');
    sc.id = 'sem-cena'; sc.grid.on = false; sc.bgColor = '#1b1f2a'; sc.cols = 24; sc.rows = 14;
    for (const k in sc.perms) sc.perms[k] = false;
    S.scenes = { [sc.id]: sc }; S.order = [sc.id]; S.current = sc.id;
    vazia = true; caixa = [];
  }
  function montar(a) {
    const sc = Proj.juntar(a.m, a.v);
    sc.id = a.m.id;
    normalizeScene(sc);
    registrarImgs(a.m.imgs); registrarImgs(a.v.imgs);
    sc.explored = exploradoDe(sc);
    S.scenes = { [sc.id]: sc }; S.order = [sc.id]; S.current = sc.id;
    vazia = false; caixa = [];
    seq = Math.max(seq, ackDe(a.v));                       // os próximos pedidos têm de vir depois do que o mestre já contou
    for (const p of Array.isArray(a.v.pings) ? a.v.pings : []) if (ehObj(p)) pingsVistos.add(p.id);
  }
  // Até que número o mestre já aplicou os pedidos deste jogador.
  const ackDe = v => Number(ehObj(v.ack) ? v.ack[eu] : 0) || 0;
  function carregarJogador() {
    S.prefs = prefsDaqui();
    App.viewer = eu;
    // pedidos de uma visita anterior que o mestre nunca aplicou: não valem mais
    const meu = dadosDe(D.pegar(PRE_PED + eu));
    if (meu && Array.isArray(meu.lote) && meu.lote.length) D.gravar(PRE_PED + eu, { dono_id: eu, vis: 'mestre', dados: { cena: null, lote: [] } });
    const a = noArAgora();
    if (a.st === 'ok') montar(a); else cenaVazia();
    D.aoMudar(l => { if (l && (l.id === PUB_M || l.id === PUB_V)) { if (!tReceber) tReceber = setTimeout(receber, 30); } });
    Store.on('commit', e => { if (!e.remote && !vazia && e.ops.length && e.sceneId === S.current) pedir(e.ops); });
    return true;
  }
  function trocou() {
    Tools.cancel(); App.sel = []; App.floats.length = 0;
    Vision.invalidate();
    Store.emit('scene', S.current);
    setTimeout(Render.fit, 0);
  }
  function receber() {
    clearTimeout(tReceber); tReceber = 0;
    if (modo !== 'jogador') return;
    if (Store.inTx() || Tools.busy()) { tReceber = setTimeout(receber, 150); return; }     // no meio de um gesto: espera soltar
    const a = noArAgora();
    if (a.st === 'espera') return;
    if (a.st === 'nada') { if (!vazia) { cenaVazia(); trocou(); marcar('ok'); } return; }
    if (vazia || a.m.id !== S.current) { montar(a); trocou(); marcar('ok'); return; }
    // a mesma cena: o que o mestre já aplicou sai da fila; o que falta continua valendo por cima do que chegou
    const ack = ackDe(a.v), antes = caixa.length;
    seq = Math.max(seq, ack);
    caixa = caixa.filter(b => b.n > ack);
    if (caixa.length !== antes) desde = caixa.length ? Date.now() : 0;      // o mestre está respondendo: a espera recomeça
    const alvo = Proj.juntar(a.m, a.v);
    alvo.id = a.m.id;
    normalizeScene(alvo);
    for (const b of caixa) Proj.aplicarEm(alvo, b.ops.filter(op => op.t !== 'ping'));
    registrarImgs(a.m.imgs); registrarImgs(a.v.imgs);
    const aqui = Store.scene(), seqAntes = aqui.expSeq || 0;
    const ops = Proj.diferenca(aqui, alvo);
    if (ops.length) Store.remoteIn(S.current, ops);
    if ((Store.scene().expSeq || 0) !== seqAntes) { Vision.resetExplored(Store.scene()); Render.request(); }
    for (const p of Array.isArray(a.v.pings) ? a.v.pings : []) {
      if (!ehObj(p) || pingsVistos.has(p.id)) continue;
      pingsVistos.add(p.id);
      if (p.by !== eu && isFinite(p.x) && isFinite(p.y)) { App.pings.push({ x: p.x, y: p.y, t0: performance.now(), c: p.c || '#e6ab4f', n: p.n || '' }); if (App.pings.length > 8) App.pings.shift(); Render.request(); }
    }
    if (caixa.length !== antes) gravarPedido();
    situacao();
  }
  // O que o jogador fez vai para a fila; o mestre aplica e confirma na projeção seguinte.
  function pedir(ops) {
    seq = Math.max(seq + 1, Date.now());
    caixa.push({ n: seq, ops: clone(ops) });
    if (caixa.length > 80) caixa.shift();
    if (!desde) desde = Date.now();
    if (!tPedido) tPedido = setTimeout(gravarPedido, 120);
    situacao();
  }
  function gravarPedido() {
    clearTimeout(tPedido); tPedido = 0;
    if (modo !== 'jogador') return;
    // (o documento é do próprio jogador: o banco só aceita que ele crie o que é dele)
    D.gravar(PRE_PED + eu, { dono_id: eu, vis: 'mestre', dados: JSON.parse(JSON.stringify({ cena: vazia ? null : S.current, lote: caixa })) });
  }
  // "Ao vivo" quando não há nada na fila; "enviando" enquanto o mestre não confirma; depois de um tempo, "esperando o mestre".
  function situacao() {
    clearTimeout(tEspera); tEspera = 0;
    if (!caixa.length) { desde = 0; marcar('ok'); return; }
    const faz = Date.now() - desde;
    if (faz > 12000) { marcar('espera'); return; }
    marcar('saving');
    tEspera = setTimeout(situacao, 12050 - faz);
  }

  /* ---------------- o que o resto do programa chama ---------------- */
  function carregar() { return modo === 'mestre' ? carregarMestre() : carregarJogador(); }
  function cena(id) { if (modo === 'mestre' && id) { sujas.add(id); metaSuja = true; agendar(); } }
  function meta() { if (modo === 'mestre') { metaSuja = true; agendar(); } else guardarPrefsDaqui(); }
  function tirarCena(id) {
    if (modo !== 'mestre') return;
    sujas.delete(id);
    for (const d of [docM(id), docV(id)]) { if (D.pegar(d)) D.apagar(d); sombra.delete(d); }
    if (idx.noAr === id) { idx.noAr = null; despublicar(); }
    metaSuja = true; agendar();
  }
  function descarregar() {
    if (modo === 'mestre') { if (tGravar) gravar(); }
    else if (tPedido) gravarPedido();
    gravarExplorado();
  }
  // O que já foi explorado: neste aparelho, por mesa e por cena.
  function explorado(id) { if (id && id !== 'sem-cena') { expSujas.add(id); if (!tExp) tExp = setTimeout(gravarExplorado, 600); } }
  function gravarExplorado() {
    clearTimeout(tExp); tExp = 0;
    if (!expSujas.size || !banco.ready()) { expSujas.clear(); return; }
    const puts = [];
    for (const id of expSujas) { const sc = S.scenes[id]; if (!sc) continue; const v = { seq: sc.expSeq || 0, mapa: sc.explored || {} }; expAqui.set(id, v); puts.push(['exp:' + mesa + ':' + id, v]); }
    expSujas.clear();
    banco.write(puts, []);
  }
  // O mestre manda esquecer o que foi explorado: os jogadores esquecem junto (cada um no seu aparelho).
  function esquecerExplorado(sc) { if (modo === 'mestre') Store.remoteIn(sc.id, [{ t: 'scn', p: { expSeq: (sc.expSeq || 0) + 1 } }]); }

  /* ---- no ar ---- */
  function mostrar(id) {
    if (modo !== 'mestre' || !S.scenes[id] || idx.noAr === id) return false;
    darPorVistos();                                        // o que os jogadores tinham pedido em outra cena não vale nesta
    pings = [];
    idx.noAr = id; metaSuja = true; pubSuja = true; agendar();
    Store.meta();
    return true;
  }
  function esconder() {
    if (modo !== 'mestre' || !idx.noAr) return false;
    idx.noAr = null; despublicar(); metaSuja = true; agendar();
    Store.meta();
    return true;
  }
  function ping(x, y) {
    if (modo === 'jogador') { if (!vazia) pedir([{ t: 'ping', x, y }]); return; }
    if (modo === 'mestre' && idx.noAr && idx.noAr === S.current && isGM()) porPing({ id: uid('pg'), x, y, c: '#e6ab4f', n: 'Mestre', by: 'gm' }, false);
  }

  /* ---------------- imagens ---------------- */
  function blobDe(cv, tipo, q) { return new Promise(res => { try { cv.toBlob(b => res(b), tipo, q); } catch (e) { res(null); } }); }
  async function idDoBlob(blob) {
    const b = new Uint8Array(await blob.arrayBuffer());
    let hsh = 2166136261;
    for (let i = 0; i < b.length; i++) { hsh ^= b[i]; hsh = Math.imul(hsh, 16777619); }
    return 'img_' + (hsh >>> 0).toString(36) + b.length.toString(36);
  }
  async function subir(blob, w, hh, kind, name, id) {
    id = id || await idDoBlob(blob);
    const ja = S.assets[id];
    if (ja && /^https:\/\//.test(ja.url || '')) return ja;                 // a mesma imagem já está no banco
    const url = await window.TC.arquivos.subir(blob);
    S.assets[id] = { id, url, w, h: hh, kind, name: name || '' };
    return S.assets[id];
  }
  // Uma imagem que está num canvas: vira arquivo no Storage da mesa.
  async function guardarImagem(cv, kind, name) {
    let blob = await blobDe(cv, 'image/webp', 0.86);
    if (!blob || blob.type !== 'image/webp') blob = kind === 'bg' ? await blobDe(cv, 'image/jpeg', 0.86) : await blobDe(cv, 'image/png');
    if (!blob) throw new Error('Não consegui preparar essa imagem.');
    return subir(blob, cv.width, cv.height, kind, name);
  }
  // Uma imagem embutida (data URL em base64) → arquivo. Feito à mão: não depende de a página poder "buscar" um data URL grande.
  function blobDeDados(url) {
    const i = url.indexOf(','), tipo = /^data:([^;,]+);base64$/.exec(url.slice(0, i));
    if (i < 0 || !tipo) throw new Error('Não consegui ler uma das imagens embutidas.');
    const bin = atob(url.slice(i + 1)), b = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) b[k] = bin.charCodeAt(k);
    return new Blob([b], { type: tipo[1] });
  }
  // Uma imagem embutida (cena importada de um arquivo ou trazida do navegador): sobe e fica com o mesmo id.
  async function guardarDeDados(a) {
    if (!a || !a.id || !/^data:image\/(png|jpeg|webp|gif);base64,/.test(String(a.url || ''))) return null;
    const ja = S.assets[a.id];
    if (ja && /^https:\/\//.test(ja.url || '')) return ja;
    let blob = blobDeDados(a.url);
    let w = a.w || 0, hh = a.h || 0;
    if (!/^image\/(png|jpeg|webp)$/.test(blob.type)) {                        // o Storage da mesa só aceita PNG, JPG e WebP
      const im = await new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error('Não consegui abrir uma das imagens.')); i.src = a.url; });
      const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight;
      cv.getContext('2d').drawImage(im, 0, 0);
      blob = await blobDe(cv, 'image/png'); w = cv.width; hh = cv.height;
      if (!blob) throw new Error('Não consegui preparar uma das imagens.');
    }
    return subir(blob, w, hh, a.kind || '', a.name || '', a.id);
  }
  // Para exportar: as imagens que estão no banco voltam a ser embutidas no arquivo (ele não depende da mesa para abrir).
  async function embutir(assets) {
    const out = {};
    for (const id in assets) {
      const a = assets[id];
      if (!/^https:\/\//.test(a.url || '')) { out[id] = a; continue; }
      try {
        const blob = await (await fetch(a.url)).blob();
        const url = await new Promise((ok, falha) => { const rd = new FileReader(); rd.onload = () => ok(String(rd.result)); rd.onerror = () => falha(rd.error); rd.readAsDataURL(blob); });
        out[id] = Object.assign({}, a, { url });
      } catch (e) { out[id] = a; }                                         // sem internet: vai só o endereço
    }
    return out;
  }

  /* ---------------- trazer as cenas deste navegador para a mesa ---------------- */
  /* As cenas de antes da mesa continuam no IndexedDB do navegador (o mesmo de quando não há mesa aberta).
     A lista lê só as cenas e a ordem; as imagens (que são o que pesa) só são lidas na hora de trazer. */
  let nLocais = 0;
  const bancoDaqui = () => makeDB('cenas-de-urgm');
  async function cenasDoNavegador() {
    const db = bancoDaqui();
    if (!(await db.open())) { nLocais = 0; return []; }
    const meta = (await db.all('meta')).get('meta') || {}, ordem = Array.isArray(meta.order) ? meta.order : [], cenas = [];
    for (const v of (await db.all('scene:')).values()) if (ehObj(v) && Array.isArray(v.tokens)) cenas.push({ id: v.id, nome: v.name || 'Cena', tokens: v.tokens.length, fundo: !!(v.bg && v.bg.asset), exemplo: !!v.sample });
    cenas.sort((a, b) => (ordem.indexOf(a.id) + 1 || 1e9) - (ordem.indexOf(b.id) + 1 || 1e9));
    nLocais = cenas.length;
    return cenas;
  }
  /* Traz as cenas escolhidas. As imagens sobem para o banco; os tokens de jogadores com o mesmo nome de um
     participante da mesa continuam com ele (os outros passam a ser do mestre). aoAndar(feitas, total) acompanha.
     Devolve os ids das cenas criadas. As do navegador não são tocadas. */
  async function trazer(ids, aoAndar) {
    if (modo !== 'mestre') return [];
    const db = bancoDaqui();
    if (!(await db.open())) return [];
    const meta = (await db.all('meta')).get('meta') || {}, cenasDeLa = await db.all('scene:'), imgsDeLa = await db.all('asset:');
    const mapa = Proj.mapaDeDonos(Array.isArray(meta.players) ? meta.players : [], S.players), feitas = [];
    let n = 0;
    for (const id of ids) {
      const cru = cenasDeLa.get('scene:' + id);
      if (cru && Array.isArray(cru.tokens)) {
        const sc = normalizeScene(clone(cru));
        Proj.trocarDonos(sc, mapa, S.players);
        if (!idCena(sc.id) || S.scenes[sc.id]) sc.id = uid('cena');
        const usar = async aid => {
          if (!aid) return null;
          const a = imgsDeLa.get('asset:' + aid);
          if (!a) return S.assets[aid] ? aid : null;
          if (/^https:\/\//.test(a.url || '')) { if (!S.assets[aid]) S.assets[aid] = Object.assign({}, a); return aid; }
          return (await guardarDeDados(a)) ? aid : null;
        };
        if (sc.bg) sc.bg.asset = await usar(sc.bg.asset);
        for (const t of sc.tokens) if (t.img) t.img = await usar(t.img);
        Store.addScene(sc); cena(sc.id);
        feitas.push(sc.id);
      }
      n++;
      if (aoAndar) aoAndar(n, ids.length);
    }
    metaSuja = true; agendar();
    return feitas;
  }

  return {
    iniciar, carregar, cena, meta, tirarCena, descarregar, explorado, esquecerExplorado,
    modo: () => modo, on: () => modo !== 'local', mestre: () => modo === 'mestre', jogador: () => modo === 'jogador',
    estado: () => estado, aoEstado(fn) { ouvinte = fn; },
    noAr: () => idx.noAr, mostrar, esconder, ping, semCena: () => vazia,
    guardarImagem, guardarDeDados, embutir, cenasDoNavegador, trazer, locais: () => nLocais,
    eu: () => eu, pendentes: () => caixa.length,
  };
})();
