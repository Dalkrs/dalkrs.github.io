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
  /* O banco aceita 1,5 MB por documento, contados do jeito dele: em bytes (acento pesa mais de um) e com um espaço
     depois de cada vírgula e de cada dois-pontos. (O aviso em tempo real de uma mudança só leva até 1 MB; acima
     disso a casca lê o documento inteiro por conta própria.) */
  const LIMITE = 1400000;
  function pesoNoBanco(j) {
    let n = 0;
    for (let i = 0; i < j.length; i++) { const c = j.charCodeAt(i); n += c === 44 || c === 58 ? 2 : c < 128 ? 1 : c < 2048 ? 2 : 3; }
    return n;
  }
  const PREFS_AQUI = 'tinycats:cenas:prefs';               // preferências de quem está neste aparelho (animação, véu, tutorial)
  const ATUAL_AQUI = 'tinycats:cenas:atual:';              // + mesa (+ @campanha): a cena que o mestre deixou aberta neste aparelho
  const chaveAtual = () => ATUAL_AQUI + mesa + (camp ? '@' + camp : '');
  const atualDaqui = () => { try { return localStorage.getItem(chaveAtual()) || null; } catch (e) { return null; } };
  /* ---- campanhas ----
     Numa mesa com campanhas, cada cena é de uma campanha — ou de nenhuma: "do mundo", que aparece em todas. A campanha
     fica na linha dos documentos da cena (coluna `campanhas`), não dentro deles. O mestre trabalha na campanha em
     vista: a lista mostra as cenas dela e as do mundo, e a cena nova nasce nela. A projeção (o que os jogadores
     recebem) leva a campanha da cena que está no ar: só quem participa dela a recebe. */
  let camp = null, campsDaMesa = [];                       // a campanha em vista (id) e as campanhas que quem usa vê
  const campDe = new Map();                                // cena → [campanhas] ([] = do mundo)
  const listaDe = l => (l && Array.isArray(l.campanhas) ? l.campanhas.filter(x => typeof x === 'string') : []);
  const iguais = (a, b) => JSON.stringify(a || []) === JSON.stringify(b || []);
  // (a cena que ainda não foi gravada — acabou de ser criada — já é da campanha em vista: é nela que vai nascer)
  const campanhasDaCena = id => (campDe.has(id) ? campDe.get(id) : camp ? [camp] : []).slice();
  const naVista = id => { const cs = campanhasDaCena(id); return !camp || !cs.length || cs.includes(camp); };
  const comCampanhas = () => modo === 'mestre' && campsDaMesa.length > 0;
  /* Dizer de que campanha é uma cena é organizar as campanhas: só o mestre da mesa. O mestre auxiliar mestra as cenas
     da campanha em que está (e as cria nela), mas não as passa de uma para outra. */
  let organiza = false;
  const podeOrganizar = () => comCampanhas() && organiza;
  const idCena = Proj.idCena;
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const dadosDe = l => (l && !l.apagado && ehObj(l.dados) ? l.dados : null);
  /* Os documentos das cenas são do mestre e não têm dono (dono_id vazio). Um documento com dono foi criado por um
     jogador: só vale se for o de pedidos dele. O banco já não deixa um jogador criar outro; isto é a segunda tranca. */
  const doMestre = l => !!l && l.dono_id == null;
  /* (lote 92) O que chegou pelo movimento leve e ainda não está no documento: documento → { tx, n, v, rev }. Vale por cima do
     documento até ele alcançar a mensagem (lv: de quem e até qual mensagem ele vem) ou outro aparelho gravar por cima. */
  const recebidos = new Map();
  const dadosMestre = id => {
    const l = D.pegar(id), d = doMestre(l) ? dadosDe(l) : null, o = recebidos.get(id);
    if (!o) return d;
    if (!d) { recebidos.delete(id); return null; }
    const lv = ehObj(d.lv) ? d.lv : null;
    if ((lv && lv.tx === o.tx && lv.n >= o.n) || ((!lv || lv.tx !== o.tx) && (l.rev || 0) !== o.rev)) { recebidos.delete(id); return d; }
    return o.v;
  };
  const docM = id => 'cena:' + id + ':m', docV = id => 'cena:' + id + ':v';
  /* (lote 78) Os andares: outras cenas que ficam no ar junto com a do noAr (idx.juntas). Cada uma vai em dois
     documentos de projeção, como a principal (cena:pub:<id>:m e :v); a principal diz quais são (v.andares). Cada
     jogador vê o andar em que está o token dele — ou outro, se escolher olhar. Os pedidos vão marcados com a cena
     (c), e quem transmite aplica os de todos os andares, na ordem; a conta (ack) é uma só. */
  const pubA = (id, k) => 'cena:pub:' + id + ':' + k;
  const ehPubA = id => typeof id === 'string' && /^cena:pub:[A-Za-z0-9_-]{1,60}:[mv]$/.test(id);
  const andares = () => (idx.noAr && S.scenes[idx.noAr] ? [idx.noAr].concat((idx.juntas || []).filter(id => id !== idx.noAr && S.scenes[id])) : []);
  const noArJunto = id => !!id && andares().includes(id);
  let pubsAndares = new Set();                             // os andares cuja projeção este aparelho escreveu

  let modo = 'local', D = null, mesa = null, eu = null;
  let idx = Proj.normIndice(null);
  const sombra = new Map();                                // documento → o JSON que foi gravado por último (para não regravar igual)
  const sujas = new Set(), expSujas = new Set();
  let metaSuja = false, pubSuja = false, arSujo = false, tGravar = 0, tExp = 0, tPub = 0;      // arSujo: este aparelho acabou de mudar o que está no ar (ou quem transmite)
  let estado = 'ok', ouvinte = () => {};
  const banco = makeDB('tinycats-cenas-mesa');             // deste aparelho: o que já foi explorado em cada cena de cada mesa
  const expAqui = new Map();                               // cena → { seq, mapa } lido do aparelho
  // mestre
  /* Até que pedido de cada jogador a cópia DESTE aparelho da cena que está no ar já tem aplicado. A conta anda junto
     com a cena: é guardada no documento dela e lida de lá, e de nenhum outro lugar — se viesse de outro lugar, este
     aparelho poderia dar por aplicado um pedido que a cópia dele não tem. */
  const acks = Object.create(null);
  /* O que foi feito aqui em cada cena e ainda não subiu para o banco: [{ op, de }] (de = { quem, n } quando a operação
     veio de um pedido de jogador). Se nesse meio-tempo chega do banco a mesma cena, mudada em outro aparelho do
     mestre, o que foi feito aqui é refeito por cima do que chegou: nenhum dos dois lados some. */
  const feito = new Map();
  let aplicando = null;                                    // o pedido de jogador que está sendo aplicado agora: { quem, n }
  const visto = new Map();                                 // documento → a linha do banco à qual `sombra` corresponde
  let pings = [], tPedidos = 0, tAssumir = 0, tCobrar = 0, grandes = new Set();
  const esperando = new Map();                             // jogador → { n, t }: o pedido mais antigo dele sem resposta, e desde quando
  /* Este aparelho (esta página aberta). O mestre pode ter o site aberto em mais de um lugar ao mesmo tempo — outro
     computador, outra aba esquecida —, mas só UM transmite a cena que está no ar: é ele quem aplica os pedidos dos
     jogadores e escreve a projeção. Transmite o aparelho em que o mestre abriu a mesa ou mexeu por último; os outros
     acompanham (e assumem sozinhos se os pedidos dos jogadores ficarem sem resposta). O código vale enquanto a
     página está aberta: recarregar é abrir de novo. */
  const meu = 'ap' + Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  const transmito = () => modo === 'mestre' && !!idx.noAr && idx.tx === meu;
  /* As páginas que ESTE navegador já abriu nesta mesa (os códigos delas). Com isso, uma página recém-aberta sabe
     quando quem aparece transmitindo era uma página daqui mesmo, que já foi fechada ou recarregada — e assume na
     hora, sem esperar para ver se os pedidos dos jogadores ficam sem resposta. */
  const PAGINAS_AQUI = 'tinycats:cenas:paginas:';          // + mesa
  let minhasDeAntes = [];
  function anotarPagina() {
    try {
      const l = JSON.parse(localStorage.getItem(PAGINAS_AQUI + mesa) || '[]');
      minhasDeAntes = Array.isArray(l) ? l.filter(x => typeof x === 'string').slice(-30) : [];
      localStorage.setItem(PAGINAS_AQUI + mesa, JSON.stringify(minhasDeAntes.concat([meu]).slice(-30)));
    } catch (e) { minhasDeAntes = []; }
  }
  /* A casca do site abre as Cenas do mestre também em segundo plano (ele está em outra aba — Fichas, por exemplo —
     e o que os jogadores fazem na cena precisa de alguém para aplicar). Em segundo plano a página não tem tamanho. */
  const emSegundoPlano = () => window.innerWidth === 0 || window.innerHeight === 0;
  let canal = null, outraViva = false;                     // as abas deste navegador se perguntam quem transmite
  /* Quanto um aparelho que acompanha espera antes de assumir por conta própria. Tem de ser mais do que o aparelho
     que transmite leva, no pior caso, para responder (ele recebe o pedido, aplica, grava, e a resposta ainda viaja
     até aqui: uns 8 segundos quando a mesa está sem o tempo real e lê o banco de tempos em tempos). */
  const ESPERA_ASSUMIR = 12000;
  /* Quanto quem abre a mesa espera antes de limpar o que parece sobra (projeção sem cena no ar; índice apontando para
     uma cena que não está aqui). Cada documento viaja sozinho até o banco: outro aparelho do mestre pode ter acabado
     de pôr a cena no ar, com uma parte já lá e a outra a caminho. */
  const ESPERA_LIMPAR = 5000;
  /* Quanto a casca espera para mandar ao banco o que os outros estão esperando ver (a projeção, os pedidos dos
     jogadores). O resto espera o meio segundo de sempre. */
  const PRESSA = 30;
  const relogio = () => performance.now();
  const esquecer = id => { sombra.delete(id); visto.delete(id); soltarVivo(id); };
  // O documento como está no banco agora passa a ser o ponto de partida deste aparelho.
  const anotar = id => { const l = D.pegar(id), x = doMestre(l) ? dadosDe(l) : null; if (x) { sombra.set(id, JSON.stringify(x)); visto.set(id, l); } else esquecer(id); };
  const contasDe = d => { const o = {}; if (d && ehObj(d.ack)) for (const k in d.ack) { const n = d.ack[k]; if (typeof n === 'number' && isFinite(n) && n > 0) o[k] = n; } return o; };
  function definirAcks(o) { for (const k in acks) delete acks[k]; for (const k in o) acks[k] = o[k]; }
  /* Junta a cada mudança de barras, condições ou auras de um token o "como estava" (b): quem for aplicá-la por cima
     de outra versão da cena junta, em vez de trocar. (A lista do "como estava" vem na ordem contrária à das
     operações: a última desfaz a primeira.) */
  const COM_BASE = ['bars', 'conds', 'cinfo', 'auras'];
  function comBase(ops, inv) {
    const par = Array.isArray(inv) && inv.length === ops.length;
    return ops.map((op, i) => {
      if (op.t !== 'upd' || op.c !== 'tokens' || !op.p) return op;
      const x = par ? inv[ops.length - 1 - i] : null, antes = x && x.t === 'upd' && x.c === 'tokens' && x.id === op.id ? x : null, b = {};
      if (antes && antes.p) for (const k of COM_BASE) if (k in op.p && antes.p[k] !== undefined) b[k] = antes.p[k];
      return Object.keys(b).length ? Object.assign({}, op, { b }) : op;
    });
  }
  // jogador
  let caixa = [], seq = 0, vazia = false, tReceber = 0, tPedido = 0, desde = 0, tEspera = 0;
  /* Os pedidos que o mestre já confirmou, guardados por um tempo. Se a conta dele voltar atrás (a cena passou a ser
     transmitida por outro aparelho dele, que ainda não tinha os últimos pedidos aplicados), eles voltam para a fila. */
  let confirmados = [], ultimaConta = 0;
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
    if (typeof Lapis !== 'undefined') Lapis.ligar(D, eu);              // (lote 65) o lápis: os rabiscos de cada um, que a mesa vê
    // (a campanha em vista é lida uma vez: quando ela muda, a casca abre esta página de novo)
    camp = st.campanha ? st.campanha.id : null;
    campsDaMesa = Array.isArray(st.campanhas) ? st.campanhas.slice() : [];
    organiza = modo === 'mestre' && (!st.cargo || st.cargo === 'mestre');
    await banco.open();
    if (banco.ready()) for (const [k, v] of await banco.all('exp:' + mesa + ':')) if (ehObj(v) && ehObj(v.mapa)) expAqui.set(k.slice(('exp:' + mesa + ':').length), v);
    jogadores(st);
    T.ponte.aoMudar(novo => {
      if (!novo.mesa || novo.mesa.id !== mesa) return;       // a mesa mudou: a casca recarrega esta página
      const antes = S.players.map(p => p.id).join(',');
      jogadores(novo);
      // (lote 82) alguém entrou (ou saiu) da mesa: a projeção é refeita, senão os tokens dele chegam sem dono até a cena mudar
      if (modo === 'mestre' && antes !== S.players.map(p => p.id).join(',')) { pubSuja = true; agendar(); }
      if (App.viewer !== 'gm' && !playerById(App.viewer) && modo === 'mestre') UI.setViewer('gm');
      Vision.invalidate(); Store.meta();
    });
    return modo;
  }
  /* Os jogadores são os participantes da mesa (menos o mestre), com a cor que cada um tem nela. O mestre auxiliar é
     um deles — tem os personagens e os tokens dele —, esteja mestrando ou jogando como jogador: o que é dele continua
     dele quando ele alterna. `gm` marca que agora ele está mestrando (aí não é a ele que se pede a defesa: quem está
     mestrando rola pelo token). Uma casca de antes do mestre auxiliar não diz o cargo: lá vale só o papel. */
  function jogadores(st) {
    S.players = (st.membros || []).filter(m => (m.cargo ? m.cargo !== 'mestre' : m.papel !== 'mestre') && m.id).map((m, i) => {
      const p = { id: m.id, name: m.nome || 'Jogador', color: /^#[0-9a-f]{6}$/i.test(m.cor || '') ? m.cor : PLAYER_COLORS[i % PLAYER_COLORS.length] };
      if (m.cargo === 'auxiliar' && m.papel === 'mestre') p.gm = true;
      return p;
    });
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
  // Uma cena montada a partir dos documentos dela; null se não há, ou se o conteúdo está estragado (aí ela é
  // pulada, com um aviso no console, em vez de impedir as outras de abrir).
  function cenaDosDocs(id) {
    const m = dadosMestre(docM(id));
    if (!m) return null;
    const v = dadosMestre(docV(id));
    try {
      const sc = Proj.juntar(m, v);
      sc.id = id;
      normalizeScene(sc);
      registrarImgs(m.imgs); if (v) registrarImgs(v.imgs);
      return sc;
    } catch (e) { console.warn('Cena ' + id + ': o que está guardado no banco não pôde ser aberto.', e); return null; }
  }
  function carregarMestre() {
    idx = Proj.normIndice(dadosMestre(INDICE));
    anotar(INDICE);
    for (const l of D.todas()) {
      const mm = RE_PARTE.exec(l.id || '');
      if (!mm || mm[2] !== 'm' || !idCena(mm[1]) || !doMestre(l)) continue;
      const sc = cenaDosDocs(mm[1]);
      if (!sc) continue;
      sc.explored = exploradoDe(sc);
      S.scenes[sc.id] = sc;
      campDe.set(sc.id, listaDe(l));
      anotar(docM(sc.id)); anotar(docV(sc.id));
    }
    S.order = idx.ordem.filter(id => S.scenes[id]);
    for (const id in S.scenes) if (!S.order.includes(id)) S.order.push(id);
    // a cena aberta por último: a que este aparelho lembra; se ele não lembra, a que o índice diz
    // (com campanhas, entre as cenas da campanha em vista e as do mundo; se não há nenhuma, fica sem cena aberta)
    const lembrada = atualDaqui(), vale = id => !!S.scenes[id] && naVista(id);
    S.current = vale(lembrada) ? lembrada : vale(idx.atual) ? idx.atual : S.order.find(naVista) || null;
    /* O índice pode apontar para uma cena que (ainda) não chegou a este aparelho: fica como veio. Se ela não chegar,
       a limpeza, mais abaixo, desfaz o apontamento. */
    const semACena = () => !!idx.noAr && !S.scenes[idx.noAr];
    S.prefs = prefsDaqui();
    if (idx.prefs.barDefaults) S.prefs.barDefaults = idx.prefs.barDefaults;
    S.prefs.modelos = idx.prefs.modelos;                   // (lote 7) os modelos do gerador de lugares
    S.prefs.relevo = idx.prefs.relevo || null;             // (lote 18) a tabela do relevo da mesa
    S.prefs.feridos = idx.prefs.feridos || null;           // (lote 20) os cortes dos Feridos
    S.prefs.barrinhas = idx.prefs.barrinhas || null;       // (lote 22) a tela das barrinhas
    S.prefs.painelBarras = idx.prefs.painelBarras === false ? false : true;      // (lote 44) o painel de barras
    S.pastas = idx.pastas;
    /* Até onde os pedidos de cada jogador já valeram: a cena guardada diz (e o que eles pediram enquanto o mestre
       estava fora ainda entra). Sem cena no ar, o que estiver parado na fila é velho. */
    const cv = idx.noAr ? dadosMestre(docV(idx.noAr)) : null, pv = dadosMestre(PUB_V), daProj = !!idx.noAr && !!pv && pv.id === idx.noAr;
    if (cv && ehObj(cv.ack)) definirAcks(contasDe(cv));
    else if (daProj) definirAcks(contasDe(pv));            // (cena guardada antes de a conta ir junto com ela: vale a da projeção)
    else darPorVistos();
    if (daProj && Array.isArray(pv.pings)) pings = pv.pings.filter(ehObj).slice(-6);
    /* Quem abre a mesa passa a transmitir (é onde o mestre está agora) e confere a projeção. */
    const abrirTransmitindo = () => {
      if (!idx.noAr) return;
      if (idx.tx !== meu) { idx.tx = meu; metaSuja = true; arSujo = true; }
      pubSuja = true; agendar();
      /* As barras ligadas a fichas, pela ficha como está agora: o que mudou nelas enquanto as Cenas estavam fechadas
         (uma poção usada pela ficha, um valor que o mestre acertou) aparece nos tokens assim que a mesa abre. */
      setTimeout(() => { if (transmito()) Fichas.syncAll(); }, 0);
    };
    /* …a não ser que quem transmite seja outra aba deste mesmo navegador, aberta e viva (uma aba a mais, aberta sem
       querer, não toma a transmissão da que o mestre está usando). As abas se perguntam por um canal do navegador. */
    anotarPagina();
    canal = null; outraViva = false;
    try { canal = new BroadcastChannel('tinycats:cenas:' + mesa); } catch (e) { canal = null; }
    if (canal) canal.onmessage = ev => {
      const d = ev.data;
      if (ehObj(d) && d.t === 'quem' && transmito()) canal.postMessage({ t: 'eu', id: meu });
      else if (ehObj(d) && d.t === 'eu' && d.id === idx.tx && d.id !== meu) outraViva = true;
    };
    /* Sem cena no ar (ou com o índice apontando para uma cena que não está aqui), este aparelho não transmite nada; e,
       passada a espera, se continuar assim, o que sobrou é sobra mesmo: o apontamento é desfeito e a projeção sai. */
    const limpar = () => {
      if (modo !== 'mestre') return;
      if (semACena()) { idx.noAr = null; idx.tx = null; }
      if (!idx.noAr) despublicar();
    };
    if (!idx.noAr || semACena()) setTimeout(limpar, ESPERA_LIMPAR);
    else if (idx.tx && idx.tx !== meu) {
      /* Outra página aparece transmitindo.
           · É outra aba deste navegador, aberta e viva: ela continua, e esta acompanha.
           · Era uma página deste navegador que já não existe (o mestre recarregou): esta assume.
           · É de outro aparelho: com o mestre olhando para esta página, ela assume (é onde ele está agora); aberta
             em segundo plano, acompanha — e assume sozinha se os pedidos dos jogadores ficarem sem resposta, ou
             quando o mestre vier para cá (ver apareceu). */
      const daqui = minhasDeAntes.includes(idx.tx);
      if (canal) canal.postMessage({ t: 'quem' });
      setTimeout(() => { if (!outraViva && (daqui || !emSegundoPlano())) abrirTransmitindo(); }, canal ? 400 : 0);
    }
    else abrirTransmitindo();
    D.aoMudar(doBanco);
    assinar(topicoM(), ok => { if (ok) pedirCheia(); });
    Store.on('commit', e => {
      if (!e.ops || !e.ops.length || !S.scenes[e.sceneId]) return;
      // fica anotado o que foi feito aqui e ainda não subiu (ver `feito`)
      const lista = feito.get(e.sceneId) || [];
      for (const op of comBase(e.ops, e.inv)) lista.push({ op: clone(op), de: aplicando });
      if (lista.length > 5000) lista.splice(0, lista.length - 5000);
      feito.set(e.sceneId, lista);
      // o mestre mexeu aqui na cena que está no ar: é este aparelho que transmite
      if (!e.remote && e.sceneId === idx.noAr) assumir();
    });
    setTimeout(pedidos, 300);
    return S.order.length > 0;
  }
  // Este aparelho passa a transmitir a cena que está no ar.
  function assumir() {
    if (modo !== 'mestre' || !idx.noAr || idx.tx === meu) return false;
    idx.tx = meu;
    const pv = dadosMestre(PUB_V);
    if (pv && pv.id === idx.noAr && Array.isArray(pv.pings)) pings = pv.pings.filter(ehObj).slice(-6);
    esquecer(PUB_M); esquecer(PUB_V);                      // o que está lá foi escrito por outro aparelho: a projeção daqui vai inteira
    pararVigias();
    metaSuja = true; arSujo = true; pubSuja = true; agendar();
    if (!tPedidos) tPedidos = setTimeout(pedidos, 60);
    setTimeout(() => { if (transmito()) Fichas.syncAll(); }, 0);      // as barras ligadas a fichas, pela ficha como está agora
    return true;
  }
  /* O mestre veio para esta página, que estava aberta em segundo plano. Se outro aparelho transmite a cena que está
     no ar, esta assume: é onde ele está agora. (Outra aba deste navegador, aberta e viva, continua com ela.) */
  function apareceu() {
    if (modo !== 'mestre' || !idx.noAr || idx.tx === meu) return;
    outraViva = false;
    if (canal) canal.postMessage({ t: 'quem' });
    setTimeout(() => { if (!outraViva) assumir(); }, canal ? 400 : 0);
  }
  function pararVigias() { clearTimeout(tAssumir); tAssumir = 0; clearTimeout(tCobrar); tCobrar = 0; esperando.clear(); }
  // Tudo o que está nas filas dos jogadores agora passa a contar como já visto (não será aplicado).
  function darPorVistos() {
    for (const l of D.todas()) {
      if (typeof l.id !== 'string' || !l.id.startsWith(PRE_PED)) continue;
      const d = dadosDe(l), quem = l.id.slice(PRE_PED.length);
      for (const b of (d && Array.isArray(d.lote) ? d.lote : [])) if (ehObj(b) && typeof b.n === 'number' && isFinite(b.n) && b.n > (acks[quem] || 0)) acks[quem] = b.n;
    }
    if (idx.noAr) sujas.add(idx.noAr);                     // (a conta vai guardada junto com a cena)
  }

  /* ---------------- mestre: gravar ---------------- */
  /* Grava um documento só se o conteúdo mudou — em relação ao que está no banco AGORA, não ao que este aparelho
     gravou por último (outro aparelho do mestre pode ter gravado por cima nesse meio-tempo). Devolve false se o
     documento não cabe no banco. */
  /* camps: as campanhas do documento. Para a projeção, sempre as da cena que está no ar (o documento é o mesmo de
     uma cena para a outra). Para os documentos de uma cena, só vão quando ela é criada: depois, quem muda a campanha
     de uma cena é definirCampanhas (e o que outro aparelho mudou chega por doBanco). */
  /* pressa: o documento sobe quase em seguida, sem a espera de meio segundo da casca (a projeção: os jogadores estão
     esperando por ela). */
  function escrever(id, dados, vis, cas, camps, pressa) {
    const j = JSON.stringify(dados), l = D.pegar(id);
    const opt = cas || pressa ? Object.assign(cas ? { cas: true } : {}, pressa ? { pressa: PRESSA } : {}) : undefined;
    const outras = !!camps && (!l || !iguais(listaDe(l), camps));        // a campanha (ainda) não está assim no banco
    if (l && sombra.get(id) === j && visto.get(id) === l && !outras) return true;        // igual ao que foi gravado daqui, e ninguém mexeu lá desde então
    if (j.length > LIMITE / 3 && pesoNoBanco(j) > LIMITE) return false;
    sombra.set(id, j);
    if (l && !l.apagado && doMestre(l) && l.vis === vis && Proj.igual(l.dados, dados) && !outras) { visto.set(id, l); return true; }      // já está assim no banco
    if (outras && camps.length + listaDe(l).length > 0) {      // (numa mesa sem campanhas não há o que dizer: a coluna nem vai)
      visto.set(id, D.gravar(id, { dono_id: null, vis, dados: JSON.parse(j), campanhas: camps.slice() }, undefined, opt) || D.pegar(id));
      return true;
    }
    /* cas: as cenas e o índice são gravados conferindo a versão. Com o mestre e o mestre auxiliar (ou o mestre em dois
       aparelhos) mexendo na mesma cena no mesmo instante, a gravação de um não passa por cima da do outro: a casca
       junta as duas e devolve a cena juntada (que chega por doBanco, como qualquer mudança de fora). */
    visto.set(id, D.gravar(id, { dono_id: null, vis, dados: JSON.parse(j) }, undefined, opt) || D.pegar(id));       // sem dono: é do mestre
    return true;
  }
  /* ---------------- (lote 92) o movimento leve ----------------
     Mexer num token regravava a parte viva inteira (dezenas de KB, duas vezes) e o banco a reenviava a todos. Agora, com os
     canais prontos, vai só a diferença (Proj.difVivo), por mensagem; o documento inteiro é gravado no máximo a cada
     CHEIA_MS, ao sair da página, ou quando alguém pede. O que vai aos jogadores é a diferença da projeção: nada que
     a projeção não leve. Sem canal, sem resposta, ou diferença grande: o documento inteiro, como sempre foi. */
  const CHEIA_MS = (window.TC_LEVE && window.TC_LEVE.cheia) || 60000, MAX_DIF = 20000;
  const vivos = new Map();                       // documento → o que quem transmite mandou por último
  let tudoCheioAte = 0;                          // um jogador sem o canal: por um tempo, o documento inteiro para todos
  const leve = () => { try { return (window.parent !== window && window.parent.TC && window.parent.TC.aoVivo && window.parent.TC.aoVivo.leve) || null; } catch (e) { return null; } };
  const topicoM = () => 'cenam:' + mesa;
  const topicosP = cs => (cs && cs.length ? cs : ['mundo']).map(c => 'cenap:' + mesa + ':' + c);
  const assinados = new Map();
  function assinar(topico, aviso) {
    const L = leve();
    if (!L || assinados.has(topico)) return;
    assinados.set(topico, L.assinar(topico, deOutroAparelho, aviso));
  }
  function soltarVivo(id) { const st = vivos.get(id); if (st) { clearTimeout(st.t); vivos.delete(id); } }
  function gravarCheia(id, st) {
    clearTimeout(st.t); st.t = 0;
    if ((id === PUB_V || ehPubA(id)) && !transmito()) { vivos.delete(id); return true; }     // outro aparelho transmite agora
    return escrever(id, Object.assign({}, st.ultimo, { lv: { tx: meu, n: st.n } }), st.vis, st.cas, st.camps, st.pressa);
  }
  function vivoOuCheio(id, v, vis, cas, camps, pressa, topicos) {
    for (const t of topicos) assinar(t);
    const L = leve(), st = vivos.get(id), j = topicos.join();
    const cheia = () => {
      // (sem novidade, a mesma marca: o documento só é regravado se outro aparelho tiver mexido nele)
      if (st && st.de === v.id && st.mv === v.mv && st.topicos === j && Proj.igual(st.ultimo, v)) return gravarCheia(id, st);
      const n = (st ? st.n : 0) + 1;
      if (st) clearTimeout(st.t);
      const novo = { ultimo: clone(v), n, de: v.id, mv: v.mv, topicos: j, vis, cas, camps, pressa, t: 0 };
      vivos.set(id, novo);
      return gravarCheia(id, novo);
    };
    if (!st || st.de !== v.id || st.mv !== v.mv || st.topicos !== j || !L || Date.now() < tudoCheioAte || !topicos.every(t => L.pronto(t))) return cheia();
    if (Proj.igual(st.ultimo, v)) return st.t ? true : gravarCheia(id, st);
    const d = Proj.difVivo(st.ultimo, v);
    if (JSON.stringify(d).length > MAX_DIF) return cheia();
    const msg = { t: 'v', doc: id, tx: meu, base: st.n, n: st.n + 1, d };
    if (!topicos.every(t => L.enviar(t, msg))) return cheia();
    st.ultimo = clone(v); st.n = msg.n; st.camps = camps; st.vis = vis;
    if (!st.t) st.t = setTimeout(() => { st.t = 0; if (vivos.get(id) === st) gravarCheia(id, st); }, CHEIA_MS);
    return true;
  }
  // grava agora o que estava esperando (ao sair da página, ou quando alguém pede o documento inteiro)
  function vivosAgora(filtro) { for (const [id, st] of vivos) if (st.t && (!filtro || filtro(id))) gravarCheia(id, st); }
  // chegou uma mensagem de quem transmite (ou o pedido de um aparelho do mestre)
  function deOutroAparelho(msg) {
    if (!ehObj(msg)) return;
    if (msg.t === 'pede') { if (modo === 'mestre' && transmito()) vivosAgora(id => RE_PARTE.test(id)); return; }
    if (msg.t !== 'v' || typeof msg.doc !== 'string' || typeof msg.tx !== 'string' || !Number.isFinite(msg.n)) return;
    const ehPub = msg.doc === PUB_V || (ehPubA(msg.doc) && msg.doc.endsWith(':v'));
    const parte = RE_PARTE.exec(msg.doc), ehMinha = !!parte && parte[2] === 'v' && !ehPub;
    if (modo === 'jogador' ? !ehPub : !(ehMinha && !transmito())) return;
    const atual = dadosMestre(msg.doc), o = recebidos.get(msg.doc), lv = o ? { tx: o.tx, n: o.n } : atual && ehObj(atual.lv) ? atual.lv : null;
    if (!atual) { pedirCheia(); return; }
    if (lv && lv.tx === msg.tx && msg.n <= lv.n) return;
    const l = D.pegar(msg.doc);
    recebidos.set(msg.doc, { tx: msg.tx, n: msg.n, v: Proj.aplicarVivo(atual, msg.d), rev: (l && l.rev) || 0 });
    if (!lv || lv.tx !== msg.tx || msg.base !== lv.n) pedirCheia();    // perdeu alguma: o que veio vale, e o resto vem no documento
    if (modo === 'jogador') { if (!tReceber) tReceber = setTimeout(receber, 30); return; }
    aplicarRecebida(parte[1], msg.doc);
  }
  function aplicarRecebida(id, doc) {
    if (Store.inTx() && id === S.current) { setTimeout(() => aplicarRecebida(id, doc), 300); return; }
    if (!S.scenes[id] || !recebidos.has(doc)) return;
    const l = D.pegar(doc);
    if (l) cenaDeFora(id, Object.assign({}, l, { dados: recebidos.get(doc).v }));
  }
  let pediuEm = 0, quer = 0;
  function pedirCheia() {
    if (Date.now() - pediuEm < 10000) return;
    pediuEm = Date.now();
    if (modo === 'jogador') { if (!outraAba) { quer = Date.now(); gravarPedido(); } return; }
    const L = leve();
    if (L) L.enviar(topicoM(), { t: 'pede' });
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
      /* Até onde os pedidos dos jogadores já foram aplicados vai guardado junto com a cena que eles mudaram: quem
         abrir esta cena depois (o mestre de novo, ou outro aparelho dele) não aplica o mesmo pedido duas vezes. */
      if (id === idx.noAr) v.ack = Object.assign({}, acks);
      // a cena que ainda não está no banco nasce na campanha em vista (numa mesa sem campanhas, em nenhuma)
      if (!campDe.has(id)) campDe.set(id, camp ? [camp] : []);
      const nasce = part => (D.pegar(part) ? undefined : campanhasDaCena(id));
      const okM = escrever(docM(id), m, 'mestre', true, nasce(docM(id))), okV = noArJunto(id) && transmito() ? vivoOuCheio(docV(id), v, 'mestre', true, nasce(docV(id)), false, [topicoM()]) : (soltarVivo(docV(id)), escrever(docV(id), v, 'mestre', true, nasce(docV(id))));
      if (okM && okV) { grandes.delete(id); feito.delete(id); }
      else {
        falhou = true; avisarGrande(sc);
        // (do que foi feito aqui, só continua "por subir" o que é da metade que não coube)
        const resto = (feito.get(id) || []).filter(x => (daParteViva(x.op) ? !okV : !okM));
        if (resto.length) feito.set(id, resto); else feito.delete(id);
      }
    }
    if (idx.noAr && (pubSuja || andares().some(id => sujas.has(id)))) publicar();
    sujas.clear(); pubSuja = false;
    if (metaSuja) {
      metaSuja = false;
      /* A cena aberta por último fica lembrada neste aparelho. No índice ela vai junto quando ele é gravado por outro
         motivo — trocar de cena, sozinho, não regrava o índice (com o mestre em dois aparelhos, cada um numa cena,
         um ficaria regravando o que o outro acabou de gravar). */
      try { localStorage.setItem(chaveAtual(), S.current || ''); } catch (e) { /* sem armazenamento: vale a do índice */ }
      const novo = { v: 1, ordem: S.order.filter(id => S.scenes[id]), atual: S.current, noAr: idx.noAr, tx: idx.noAr ? idx.tx : null, juntas: idx.noAr ? (idx.juntas || []).slice() : [], prefs: Object.assign({ barDefaults: S.prefs.barDefaults || null, modelos: Proj.normModelos(S.prefs.modelos) }, S.prefs.relevo && typeof Relevo !== 'undefined' ? { relevo: Relevo.norm(S.prefs.relevo) } : {}, S.prefs.feridos ? { feridos: S.prefs.feridos } : {}, S.prefs.barrinhas ? { barrinhas: S.prefs.barrinhas } : {}, S.prefs.painelBarras === false ? { painelBarras: false } : {}), pastas: Proj.normPastas(S.pastas) };
      const la = dadosMestre(INDICE);
      if (!la || !Proj.igual(Object.assign({}, la, { atual: null }), Object.assign({}, novo, { atual: null }))) escrever(INDICE, novo, 'mestre', true);
      arSujo = false;
      guardarPrefsDaqui();
    }
    marcar(falhou ? 'erro' : 'ok');
  }
  /* A cena que está no ar vai aos jogadores logo (publicarLogo); guardar a cena inteira no banco pode esperar um
     pouco mais (gravar), juntando o que muda em sequência. */
  const agendar = () => {
    marcar('saving');
    if (!tGravar) tGravar = setTimeout(gravar, 450);
    if (!tPub && idx.noAr && (pubSuja || andares().some(id => sujas.has(id))) && transmito()) tPub = setTimeout(publicarLogo, 40);
  };
  function publicarLogo() {
    tPub = 0;
    if (modo !== 'mestre' || !idx.noAr || !transmito()) return;
    if (Store.inTx()) { tPub = setTimeout(publicarLogo, 150); return; }      // (no meio de um gesto do mestre: vai quando ele soltar)
    publicar();
  }
  const daParteViva = op => (op.t === 'scn' ? Object.keys(op.p || {}).every(k => Proj.VIVO.includes(k)) : Proj.VIVO.includes(op.c));

  /* A projeção vai em dois documentos, que chegam aos jogadores um de cada vez. Para ninguém montar o mapa novo com
     os tokens antigos (ou o contrário), o mapa leva uma versão (ver: um resumo do próprio conteúdo) e a parte viva
     diz para qual versão do mapa ela foi feita (mv): o jogador só usa o par que combina. O mapa só é regravado
     quando muda de fato. Só o aparelho que transmite escreve a projeção. */
  function publicar() {
    if (!transmito()) return;
    const sc = S.scenes[idx.noAr];
    if (!sc) { despublicar(); return; }
    const lista = andares(), noArSet = lista.length > 1 ? new Set(lista) : null, jogs = new Set(S.players.map(p => p.id));
    const { m, v } = Proj.projetar(sc, S.assets, jogs, noArSet);
    // (lote 18) a tabela do relevo da mesa vai com a cena (sem ela, os jogadores usam a de começo)
    if (S.prefs.relevo && typeof Relevo !== 'undefined' && !Relevo.igualAoPadrao(S.prefs.relevo)) m.relevoTab = Relevo.norm(S.prefs.relevo);
    if (S.prefs.painelBarras === false) m.pbOff = true;           // (lote 44) o painel de barras desligado pelo mestre
    m.ver = Proj.resumo(JSON.stringify(m));
    // (a projeção é da campanha da cena que está no ar: só quem participa dela a recebe; a de uma cena do mundo, todos)
    const cs = campanhasDaCena(sc.id);
    const coube = escrever(PUB_M, m, 'mesa', false, cs, true), la = dadosMestre(PUB_M);
    // se o mapa novo não coube no banco, os jogadores continuam com o mapa que está lá — e com os tokens ao vivo
    v.mv = coube || !la || la.id !== sc.id ? m.ver : la.ver;
    v.ack = Object.assign({}, acks); v.pings = pings;
    // (lote 78) os andares no ar: o nome e o id de cada um (o primeiro é o desta projeção)
    if (noArSet) v.andares = lista.map(id => ({ id, nome: String(S.scenes[id].name || 'Andar').slice(0, 60), nivel: Andares.nivelDe(id) }));
    if (!(vivoOuCheio(PUB_V, v, 'mesa', false, cs, true, topicosP(cs)) & coube)) avisarGrande(sc);
    // (lote 78) a projeção de cada andar junto
    const agora = new Set();
    for (const id of lista.slice(1)) {
      const a = S.scenes[id], p = Proj.projetar(a, S.assets, jogs, noArSet);
      if (S.prefs.relevo && typeof Relevo !== 'undefined' && !Relevo.igualAoPadrao(S.prefs.relevo)) p.m.relevoTab = Relevo.norm(S.prefs.relevo);
      if (S.prefs.painelBarras === false) p.m.pbOff = true;
      p.m.ver = Proj.resumo(JSON.stringify(p.m));
      const ok1 = escrever(pubA(id, 'm'), p.m, 'mesa', false, cs, true), la1 = dadosMestre(pubA(id, 'm'));
      p.v.mv = ok1 || !la1 || la1.id !== id ? p.m.ver : la1.ver;
      p.v.de = sc.id;            // (lote 92: a conta dos pedidos e os sinais ficam só na principal, que todos recebem)
      if (!(vivoOuCheio(pubA(id, 'v'), p.v, 'mesa', false, cs, true, topicosP(cs)) & ok1)) avisarGrande(a);
      agora.add(id);
    }
    tirarAndares(agora);
  }
  // (lote 78) apaga a projeção dos andares que não estão mais no ar (fica a dos que estão em `ficam`)
  function tirarAndares(ficam) {
    for (const l of D.todas()) if (ehPubA(l.id) && !l.apagado && doMestre(l) && !(ficam && ficam.has(l.id.slice(9, -2)))) { D.apagar(l.id); esquecer(l.id); }
    pubsAndares = ficam ? new Set(ficam) : new Set();
  }
  function despublicar() {
    for (const id of [PUB_M, PUB_V]) { if (D.pegar(id)) D.apagar(id); esquecer(id); }
    tirarAndares(null);
    pings = [];
  }

  /* ---------------- mestre: o que chega do banco ---------------- */
  function doBanco(l) {
    if (!l || typeof l.id !== 'string') return;
    if (l.id.startsWith(PRE_PED)) { if (!tPedidos) tPedidos = setTimeout(pedidos, 60); return; }
    if (!l.apagado && !doMestre(l)) return;                  // documento com dono não é do mestre: não é cena nem índice
    if (l.id === INDICE) { indiceDeFora(l); return; }
    if (l.id === PUB_M || l.id === PUB_V) { projecaoDeFora(l); return; }
    if (ehPubA(l.id)) return;                                // (lote 78) a projeção de um andar: é quem transmite que escreve
    const mm = RE_PARTE.exec(l.id);
    if (!mm || !idCena(mm[1])) return;
    // a campanha da cena mudou em outro aparelho (é a da linha do mapa da cena): a lista daqui acompanha
    if (mm[2] === 'm' && !l.apagado && !iguais(campDe.get(mm[1]), listaDe(l))) {
      const tinha = campDe.has(mm[1]);
      campDe.set(mm[1], listaDe(l));
      if (tinha && S.scenes[mm[1]]) { if (mm[1] === idx.noAr && transmito()) { pubSuja = true; agendar(); } Store.meta(); }
    }
    cenaDeFora(mm[1], l);
  }
  /* O mestre diz de que campanha é uma cena ([] = do mundo: aparece em todas). Vai para a linha dos dois documentos
     dela; se ela está no ar, a projeção acompanha (quem recebe passa a ser quem participa da campanha nova). */
  function definirCampanhas(id, lista) {
    if (modo !== 'mestre' || !organiza || !S.scenes[id]) return false;
    const nova = (Array.isArray(lista) ? lista : []).filter(x => typeof x === 'string' && campsDaMesa.some(c => c.id === x));
    if (iguais(campanhasDaCena(id), nova)) return false;
    campDe.set(id, nova);
    // (a cena que ainda não subiu leva a campanha quando subir; a que já está no banco muda só a linha)
    for (const d of [docM(id), docV(id)]) if (D.pegar(d)) visto.set(d, D.gravar(d, { campanhas: nova.slice() }) || D.pegar(d));
    if (id === idx.noAr) { if (transmito()) { pubSuja = true; agendar(); } else assumir(); }
    Store.meta();
    return true;
  }
  // O mesmo mestre com o site aberto em outro aparelho: o que ele muda lá aparece aqui (se aqui não há nada por salvar).
  function mudouDeFato(l) { const j = sombra.get(l.id); let antes = null; try { antes = j ? JSON.parse(j) : null; } catch (e) { antes = null; } return !Proj.igual(antes, dadosDe(l)); }
  /* A projeção mudou no banco por outra mão (outro aparelho do mestre). Quem acompanha confere se os pedidos dos
     jogadores estão sendo respondidos. Quem transmite escreve a dele de novo — a não ser que o banco diga que quem
     transmite agora é o outro: aí este para. */
  function projecaoDeFora(l) {
    if (l.id === PUB_V && !tPedidos) tPedidos = setTimeout(pedidos, 60);
    if (!transmito() || !mudouDeFato(l)) return;
    const n = Proj.normIndice(dadosMestre(INDICE));
    if (!arSujo && (n.noAr !== idx.noAr || (n.noAr ? n.tx : null) !== meu)) { adotarAr(n); return; }
    esquecer(l.id); pubSuja = true; agendar();
  }
  /* O índice mudou em outro aparelho do mestre. O que está no ar e quem transmite valem na hora (a não ser que este
     aparelho tenha acabado de mudar isso também); a ordem das cenas e as barras padrão esperam se há algo daqui por
     salvar (o daqui vai por cima, já com o que foi adotado). */
  function indiceDeFora(l) {
    if (!mudouDeFato(l)) return;
    const n = Proj.normIndice(dadosDe(l));
    if (!arSujo) adotarAr(n);
    anotar(INDICE);                                          // a próxima gravação daqui é comparada com o que chegou
    if (metaSuja) return;
    const ordem = n.ordem.filter(id => S.scenes[id]);
    for (const id of S.order) if (!ordem.includes(id)) ordem.push(id);
    S.order = ordem;
    if (n.prefs.barDefaults) S.prefs.barDefaults = n.prefs.barDefaults;
    S.prefs.modelos = n.prefs.modelos;
    S.prefs.relevo = n.prefs.relevo || null;
    S.prefs.feridos = n.prefs.feridos || null;
    S.prefs.barrinhas = n.prefs.barrinhas || null;
    S.prefs.painelBarras = n.prefs.painelBarras === false ? false : true;
    S.pastas = n.pastas;
    Store.meta();
  }
  // (a cena apontada pode ainda nem ter chegado a este aparelho: o que vale é o que o índice diz, guardado como veio)
  function adotarAr(n) {
    const tx = n.noAr ? n.tx : null;
    if (n.noAr === idx.noAr && tx === idx.tx && iguais(n.juntas, idx.juntas)) return;
    const transmitia = transmito(), outraCena = n.noAr !== idx.noAr;
    idx.noAr = n.noAr; idx.tx = tx; idx.juntas = n.noAr ? (n.juntas || []).slice() : [];
    // este aparelho transmitia e a cena saiu do ar por outro: ele pode ter reescrito a projeção nesse meio-tempo
    if (transmitia && !idx.noAr) despublicar();
    // outra cena no ar: a conta dos pedidos é a que está guardada com ela
    if (outraCena && idx.noAr) { const cv = dadosMestre(docV(idx.noAr)); if (cv && ehObj(cv.ack)) definirAcks(contasDe(cv)); }
    pararVigias();
    if (!tPedidos) tPedidos = setTimeout(pedidos, 60);
    Store.meta();
  }
  /* Uma cena mudou no banco por outra mão. Sem nada daqui por salvar, a cena daqui passa a ser a que chegou. Com algo
     por salvar, o que foi feito aqui é refeito por cima da que chegou (e vai junto na próxima gravação). */
  function cenaDeFora(id, l) {
    if (!mudouDeFato(l)) return;
    // no meio de um gesto do mestre na cena aberta: espera ele soltar (sem esquecer o que chegou)
    if (Store.inTx() && id === S.current) { setTimeout(() => { const agora = D.pegar(l.id); cenaDeFora(id, agora || l); }, 300); return; }
    if (l.apagado || !dadosMestre(docM(id))) {
      if (!S.scenes[id] || l.id !== docM(id)) return;
      esquecer(docM(id)); esquecer(docV(id)); feito.delete(id); sujas.delete(id);
      const era = S.current === id;
      Store.removeScene(id); campDe.delete(id);
      if (idx.noAr === id) { idx.noAr = null; idx.tx = null; }
      if (!S.order.length) { const n = newScene('Nova cena'); Store.addScene(n); cena(n.id); }
      if (era) UI.switchScene(S.order.find(naVista) || S.order[0]);      // (de preferência, outra cena da campanha em vista)
      return;
    }
    const antes = S.scenes[id];
    let meus = sujas.has(id) ? feito.get(id) || [] : [];
    // mudou aqui por um caminho que não deixou o que refazer (uma cena recém-trazida, por exemplo): vale a daqui
    if (sujas.has(id) && antes && !meus.length) return;
    const sc = cenaDosDocs(id);
    if (!sc) return;
    anotar(docM(id)); anotar(docV(id));
    if (id === idx.noAr) {
      /* A conta dos pedidos vem com a cena que chegou: é ela que diz o que essa cena já tem aplicado. O que este
         aparelho tinha aplicado de pedidos de jogadores e ainda não tinha subido NÃO é refeito por cima: os pedidos
         continuam no documento de cada jogador, e quem transmite aplica de novo, na ordem, os que passam da conta
         (refazer só os daqui poderia deixar a cena com o pedido 2 e sem o pedido 1 — e a conta dizendo 2). */
      const cv = dadosMestre(docV(id));
      if (cv && ehObj(cv.ack)) { meus = meus.filter(x => !x.de); definirAcks(contasDe(cv)); }
      if (!tPedidos) tPedidos = setTimeout(pedidos, 60);
    }
    if (meus.length) {
      try { Proj.aplicarEm(sc, meus.map(x => x.op), true); normalizeScene(sc); }
      catch (e) { console.warn('Cena ' + id + ': não deu para refazer por cima do que chegou o que tinha sido feito aqui.', e); }
      feito.set(id, meus);
    } else feito.delete(id);
    sc.explored = antes ? antes.explored : exploradoDe(sc);
    if (id === idx.noAr && transmito()) { pubSuja = true; agendar(); }      // os jogadores recebem por aqui
    if (!antes) { Store.addScene(sc); return; }
    S.scenes[id] = sc;
    if (id === S.current) { pruneSel(); Vision.invalidate(); Store.emit('scene', id); } else Store.meta();
  }

  /* ---------------- mestre: os pedidos dos jogadores ---------------- */
  const quersVistos = new Map();
  function pedidos() {
    clearTimeout(tPedidos); tPedidos = 0;
    if (modo !== 'mestre' || !idx.noAr) return;
    const principal = S.scenes[idx.noAr];
    if (!principal) return;
    if (!transmito()) { vigiar(principal); return; }         // quem aplica os pedidos é o aparelho que transmite
    if (Store.inTx() && andares().includes(S.current)) { tPedidos = setTimeout(pedidos, 150); return; }   // o mestre está no meio de um gesto
    // (lote 92) um jogador pediu o documento inteiro (acabou de abrir, ou perdeu mensagens), ou está sem o canal
    for (const l of D.todas()) {
      if (typeof l.id !== 'string' || !l.id.startsWith(PRE_PED)) continue;
      const d = dadosDe(l), q = d && Number(d.quer);
      if (d && d.sl === true) tudoCheioAte = Date.now() + 120000;
      if (q && q !== quersVistos.get(l.id)) { const ja = quersVistos.has(l.id); quersVistos.set(l.id, q); if (ja || Date.now() - q < 120000) vivosAgora(id => id === PUB_V || ehPubA(id)); }
    }
    let andou = false;
    const tocadas = new Set();
    for (const { quem, lotes } of filas(principal, acks)) {
      for (const b of lotes) {
        const sc = S.scenes[b.c] || principal;              // (lote 78) o andar em que o jogador estava quando pediu
        tocadas.add(sc.id);
        aplicando = { quem, n: b.n };
        try {
          for (const op of b.ops.slice(0, 300)) {
            /* Um pedido malfeito (de propósito ou não) não pode parar os dos outros: se der erro, é pulado, e a
               conta do jogador anda do mesmo jeito. */
            try {
              if (ehObj(op) && op.t === 'ping') { pingDe(quem, op, sc); continue; }
              if (ehObj(op) && op.t === 'andar') { if (moverDeAndar(Array.isArray(op.ids) ? op.ids : [op.id], sc.id, op.para, quem, typeof op.p === 'string' ? op.p : null)) tocadas.add(op.para); continue; }   // (lote 78/82) a escada
              if (ehObj(op) && op.t === 'item') { Fichas.usoPedido(quem, op, sc); continue; }      // um item da bolsa dele, num token (lote 5)
              const v = Proj.validar(op, quem, sc);         // contra a cena como está agora: as anteriores do lote já valeram
              if (!v || !Store.remoteIn(sc.id, [v])) continue;
              // token ligado a uma ficha, numa cena que o mestre não tem aberta: a ficha acompanha mesmo assim
              if (sc.id !== S.current && v.c === 'tokens' && v.p.bars) Fichas.paraFicha(sc.tokens.find(t => t.id === v.id));
            } catch (e) { console.warn('Um pedido de um jogador não pôde ser lido e foi ignorado.', e); }
          }
        } finally { aplicando = null; }
        acks[quem] = b.n; andou = true;
      }
    }
    if (andou) { sujas.add(principal.id); for (const id of tocadas) sujas.add(id); pubSuja = true; agendar(); }      // (a conta vai guardada com a cena e na projeção)
  }
  /* Os pedidos de cada jogador que passam da conta dada (a deste aparelho, ou a que está publicada na projeção), na
     ordem: cada lote tem um número, que só cresce. */
  /* (lote 78) Com andares no ar, cada lote diz de que cena é (c); sem isso, vale a cena do documento. Entram os lotes de
     todos os andares no ar (com `c` = o andar), na ordem dos números. */
  function filas(sc, contas) {
    const out = [], vale = andares().length > 1 && sc.id === idx.noAr ? new Set(andares()) : new Set([sc.id]);
    for (const l of D.todas()) {
      try {
        if (typeof l.id !== 'string' || !l.id.startsWith(PRE_PED)) continue;
        const quem = l.id.slice(PRE_PED.length), d = dadosDe(l);
        if (!d || !Array.isArray(d.lote) || l.dono_id !== quem || !playerById(quem)) continue;
        const lotes = d.lote.filter(x => ehObj(x) && Array.isArray(x.ops) && typeof x.n === 'number' && x.n > (contas[quem] || 0) && isFinite(x.n))
          .map(x => Object.assign({}, x, { c: idCena(x.c) ? x.c : d.cena })).filter(x => vale.has(x.c)).sort((x, y) => x.n - y.n);
        if (lotes.length) out.push({ quem, lotes });
      } catch (e) { console.warn('A fila de pedidos de um jogador não pôde ser lida e foi ignorada.', e); }
    }
    return out;
  }
  /* Outro aparelho do mestre é quem transmite. Este acompanha pela projeção: enquanto ela vai confirmando os pedidos
     dos jogadores, está tudo bem. Se o MESMO pedido fica sem resposta por um bom tempo, quem transmitia não está
     mais lá (fechou, dormiu, ficou sem rede): este aparelho assume. */
  function vigiar(sc) {
    const pv = dadosMestre(PUB_V), publicadas = contasDe(pv && pv.id === sc.id ? pv : null), agora = relogio(), vistos = new Set();
    for (const { quem, lotes } of filas(sc, publicadas)) {
      vistos.add(quem);
      const e = esperando.get(quem);
      if (!e || e.n !== lotes[0].n) esperando.set(quem, { n: lotes[0].n, t: agora });
    }
    for (const q of Array.from(esperando.keys())) if (!vistos.has(q)) esperando.delete(q);
    clearTimeout(tAssumir); tAssumir = 0;
    if (!esperando.size) return;
    let falta = Infinity;
    for (const e of esperando.values()) falta = Math.min(falta, ESPERA_ASSUMIR - (agora - e.t));
    if (falta <= 0) { assumir(); return; }
    tAssumir = setTimeout(pedidos, falta + 30);              // confere de novo quando a espera do mais antigo vencer
  }
  /* O mesmo vale para o que vem das fichas (o HP anotado na ficha muda a barra do token): quem acerta a cena que
     está no ar é o aparelho que transmite. Este acompanha — e, se depois da espera um token continua exatamente como
     estava, ainda por acertar, assume e acerta. */
  const segue = id => modo === 'mestre' && !!idx.noAr && id === idx.noAr && idx.tx !== meu;
  function porAcertar() {
    const cena = S.scenes[idx.noAr], m = new Map();
    if (cena) for (const t of cena.tokens) if (t.char && Fichas.falta(t)) m.set(t.id, JSON.stringify([t.bars, t.ini, t.img]));
    return m;
  }
  function cobrar() {
    if (tCobrar) return;
    const antes = porAcertar();
    if (!antes.size) return;
    tCobrar = setTimeout(() => {
      tCobrar = 0;
      if (!idx.noAr) return;
      if (!segue(idx.noAr)) { Fichas.syncAll(); return; }    // este aparelho passou a transmitir nesse meio-tempo: acerta ele mesmo
      const agora = porAcertar();
      let parado = false;
      for (const [id, j] of agora) if (antes.get(id) === j) parado = true;
      if (parado) assumir(); else if (agora.size) cobrar();
    }, ESPERA_ASSUMIR);
  }
  function pingDe(quem, op, sc) {
    if (!sc.perms.ping || typeof op.x !== 'number' || typeof op.y !== 'number' || !isFinite(op.x) || !isFinite(op.y)) return;
    const p = playerById(quem);
    porPing({ id: uid('pg'), x: op.x, y: op.y, c: p ? p.color : '#4fb8e0', n: p ? p.name : 'Jogador', by: quem, cena: sc.id }, sc.id === S.current);
  }
  function porPing(p, mostrarAqui) {
    pings.push(p); if (pings.length > 6) pings.shift();
    pingsVistos.add(p.id);
    if (mostrarAqui) { App.pings.push({ x: p.x, y: p.y, t0: performance.now(), c: p.c, n: p.n }); if (App.pings.length > 8) App.pings.shift(); Render.request(); }
    pubSuja = true; agendar();
  }

  /* ---------------- jogador ---------------- */
  // O que está no ar: { st: 'ok', m, v } · 'nada' (o mestre não está mostrando cena) · 'espera' (chegou só metade)
  /* Quem participa de mais de uma campanha escolhe qual está vendo: a cena no ar só aparece para ele quando é da
     campanha em vista (ou do mundo). Sendo de outra campanha dele, a tela fica sem cena — e diz de qual é, para ele
     trocar de campanha se quiser (arDeFora: as campanhas dessa cena). */
  let arDeFora = [];
  function noArAgora() {
    const m = dadosMestre(PUB_M), v = dadosMestre(PUB_V);
    arDeFora = [];
    if (!m && !v) return { st: 'nada' };
    const cs = listaDe(D.pegar(PUB_M) || D.pegar(PUB_V));
    if (camp && cs.length && !cs.includes(camp)) { arDeFora = cs; return { st: 'nada' }; }
    // metade ainda não chegou, ou as duas metades não são do mesmo momento (mapa de uma versão, tokens de outra)
    if (!m || !v || !idCena(m.id) || m.id !== v.id || (m.ver || 0) !== (v.mv || 0)) return { st: 'espera' };
    return { st: 'ok', m, v, andares: andaresDe(v) };
  }
  /* (lote 78) Os andares no ar, como a projeção principal diz: [{ id, nome }] (o primeiro é o dela). Sem andares, []. */
  function andaresDe(v) {
    if (!v || !Array.isArray(v.andares)) return [];
    const out = [], vistos = new Set();
    for (const a of v.andares.slice(0, Proj.MAX_ANDARES + 1)) if (ehObj(a) && idCena(a.id) && !vistos.has(a.id)) { vistos.add(a.id); out.push({ id: a.id, nome: String(a.nome || 'Andar').slice(0, 60), nivel: Number.isFinite(a.nivel) ? a.nivel : out.length }); }
    return out.length > 1 ? out : [];
  }
  // a projeção de um andar (o principal está em PUB_M/PUB_V): { m, v } quando as duas metades combinam, ou null
  function parDoAndar(a, id) {
    if (!a.andares.length || id === a.m.id) return { m: a.m, v: a.v };
    if (!a.andares.some(x => x.id === id)) return null;
    const m = dadosMestre(pubA(id, 'm')), v = dadosMestre(pubA(id, 'v'));
    if (!m || !v || m.id !== id || v.id !== id || (m.ver || 0) !== (v.mv || 0)) return null;
    return { m, v };
  }
  /* O andar que este jogador vê: o que ele escolheu olhar; senão, o do token dele (de preferência o andar em que já
     está, se o token continua lá); senão, o principal. */
  let olhando = null, ondeEstou = null;
  let seguir = null;           // (lote 82) o jogador pediu para levar tokens a outro andar: a tela vai com eles (mesmo tendo outro token aqui)
  const temMeu = v => !!v && Array.isArray(v.tokens) && v.tokens.some(t => ehObj(t) && (t.owner === eu || t.owner === '*') && !t.prop);
  function andarDoJogador(a) {
    if (!a.andares.length) { olhando = null; ondeEstou = null; return a.m.id; }
    const pares = a.andares.map(x => ({ id: x.id, p: parDoAndar(a, x.id) })).filter(x => x.p);
    const comMeu = pares.filter(x => temMeu(x.p.v)).map(x => x.id);
    if (seguir && (Date.now() > seguir.ate || !pares.some(x => x.id === seguir.para))) seguir = null;
    if (seguir && pares.some(x => x.id === seguir.para && x.p.v.tokens.some(t => ehObj(t) && seguir.ids.includes(t.id)))) { ondeEstou = seguir.para; seguir = null; olhando = null; return ondeEstou; }
    ondeEstou = comMeu.includes(S.current) ? S.current : comMeu[0] || null;
    if (olhando && pares.some(x => x.id === olhando)) return olhando;
    olhando = null;
    return ondeEstou || (pares.some(x => x.id === S.current) ? S.current : a.m.id);
  }
  function cenaVazia() {
    const sc = newScene('Sem cena');
    sc.id = 'sem-cena'; sc.grid.on = false; sc.bgColor = '#1b1f2a'; sc.cols = 24; sc.rows = 14;
    for (const k in sc.perms) sc.perms[k] = false;
    S.scenes = { [sc.id]: sc }; S.order = [sc.id]; S.current = sc.id;
    vazia = true; caixa = []; confirmados = [];
  }
  function montar(a, manter) {
    const sc = Proj.juntar(a.m, a.v);
    sc.id = a.m.id;
    normalizeScene(sc);
    registrarImgs(a.m.imgs); registrarImgs(a.v.imgs);
    sc.explored = exploradoDe(sc);
    S.scenes = { [sc.id]: sc }; S.order = [sc.id]; S.current = sc.id;
    vazia = false;
    if (!manter) { caixa = []; confirmados = []; }         // (lote 78) de um andar para outro do mesmo prédio, a fila continua
    const vp = vPrincipal(a.v);                            // (lote 92) a conta e os sinais estão só na projeção principal
    ultimaConta = ackDe(vp);
    seq = Math.max(seq, ultimaConta);                      // os próximos pedidos têm de vir depois do que o mestre já contou
    for (const p of Array.isArray(vp.pings) ? vp.pings : []) if (ehObj(p)) pingsVistos.add(p.id);
  }
  // Até que número o mestre já aplicou os pedidos deste jogador.
  const ackDe = v => Number(ehObj(v.ack) ? v.ack[eu] : 0) || 0;
  const vPrincipal = v => dadosMestre(PUB_V) || v;
  /* (lote 66) Os pedidos de um jogador moram num documento só (cena:pedido:<jogador>), regravado inteiro: com as Cenas
     abertas em duas abas do mesmo navegador, uma apagaria os pedidos da outra. A aba aberta por último é a que
     manda os pedidos; a outra fica só olhando (e avisa), até ser a única de novo ou a pessoa voltar a ela. */
  const ABA = Math.random().toString(36).slice(2, 10);
  let outraAba = false, canalAba = null, avisouAba = 0, avisouSemCanal = false;
  function vigiarAbas() {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      canalAba = new BroadcastChannel('tinycats:cenas:pedidos:' + mesa + ':' + eu);
      canalAba.onmessage = ev => {
        const m = ev.data || {};
        if (m.t === 'abri' && m.aba !== ABA) { outraAba = true; canalAba.postMessage({ t: 'tenho', aba: ABA }); }
        else if (m.t === 'voltei' && m.aba !== ABA) outraAba = true;
        else if (m.t === 'fechei' && m.aba !== ABA) outraAba = false;
      };
      canalAba.postMessage({ t: 'abri', aba: ABA });
      // quem volta a uma aba passa a mandar por ela
      document.addEventListener('visibilitychange', () => { if (!document.hidden) { outraAba = false; canalAba.postMessage({ t: 'voltei', aba: ABA }); } });
      window.addEventListener('pagehide', () => { try { canalAba.postMessage({ t: 'fechei', aba: ABA }); } catch (e) { /* fechando */ } });
    } catch (e) { canalAba = null; }
  }
  function carregarJogador() {
    S.prefs = prefsDaqui();
    App.viewer = eu;
    vigiarAbas();
    // pedidos de uma visita anterior que o mestre nunca aplicou: não valem mais
    const meu = dadosDe(D.pegar(PRE_PED + eu));
    if (meu && Array.isArray(meu.lote) && meu.lote.length) D.gravar(PRE_PED + eu, { dono_id: eu, vis: 'mestre', dados: { cena: null, lote: [] } });
    const a = noArAgora();
    if (a.st === 'ok') { const p = parDoAndar(a, andarDoJogador(a)) || { m: a.m, v: a.v }; montar(p); } else cenaVazia();
    D.aoMudar(l => { if (l && (l.id === PUB_M || l.id === PUB_V || ehPubA(l.id))) { if (!tReceber) tReceber = setTimeout(receber, 30); } });
    /* (lote 92) O movimento leve: quem abre (ou volta) pede o documento inteiro, porque o que está no banco pode estar até um
       minuto atrás. Quem ficou sem o canal avisa no pedido: aí o mestre volta a gravar tudo inteiro por um tempo. */
    for (const t of topicosP(camp ? [camp] : []).concat(camp ? topicosP([]) : [])) assinar(t, ok => { if (ok) { pediuEm = 0; pedirCheia(); } });
    const semCanal = () => { const L = leve(); return !L || !L.pronto(topicosP([])[0]); };
    const dormindo = () => { try { return document.hidden || window.parent.TC.sono.estado === 'dormindo'; } catch (e) { return document.hidden; } };
    const conferirCanal = () => { if (outraAba || dormindo()) return; const sc = semCanal(); if (sc || sc !== avisouSemCanal) { avisouSemCanal = sc; gravarPedido(); } };
    setTimeout(conferirCanal, 8000);
    setInterval(conferirCanal, 60000);
    Store.on('commit', e => {
      if (e.remote || vazia || !e.ops.length || e.sceneId !== S.current) return;
      pedir(e.ops, e.inv || []);
      // (lote 82) parou em cima de uma passagem que "leva ao pisar": o pedido de trocar de andar vai junto
      const sc = Store.scene(), movidos = [...new Set(e.ops.filter(op => op.t === 'upd' && op.c === 'tokens' && op.p && ('x' in op.p || 'y' in op.p)).map(op => op.id))];
      for (const id of movidos) {
        const t = sc.tokens.find(x => x.id === id);
        if (!t || !(t.owner === eu || t.owner === '*')) continue;
        const p = Andares.pisou(sc, t, 'vai');
        if (p && pedirAndar([id], p.vai, p.id)) {
          const de = S.current, nome = ((andaresDoJogador() || { lista: [] }).lista.find(x => x.id === p.vai) || {}).nome || 'outro andar';
          UI.toast(`${tokName(t)} vai para "${nome}" pela passagem.`, { action: 'Desfazer', run: () => { if (Store.S.current !== de) pedirAndar([id], de); else UI.toast('Espere o token chegar ao outro andar para voltar.'); } });
        }
      }
    });
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
    if (camp) assinar(topicosP([camp])[0], ok => { if (ok) { pediuEm = 0; pedirCheia(); } });      // (lote 92: a campanha em vista pode ter mudado)
    if (Store.inTx() || Tools.busy()) { tReceber = setTimeout(receber, 150); return; }     // no meio de um gesto: espera soltar
    const foraAntes = arDeFora.join();
    let a = noArAgora();
    if (a.st === 'espera') return;
    // (sem cena — ou com a cena no ar sendo de outra campanha: aí a faixa diz de qual, e acompanha se isso mudar)
    if (a.st === 'nada') { olhando = null; ondeEstou = null; if (!vazia) { cenaVazia(); trocou(); marcar('ok'); avisarAndares(); } else if (arDeFora.join() !== foraAntes) Store.emit('scene', S.current); return; }
    // (lote 78) o andar que este jogador vê, e a projeção dele
    const antesAndares = andaresVistos.join('|'), alvoId = andarDoJogador(a), par = parDoAndar(a, alvoId) || { m: a.m, v: a.v };
    andaresVistos = a.andares.map(x => x.id + ':' + x.nome);
    if (vazia || par.m.id !== S.current) {
      const mesmoPredio = !vazia && a.andares.some(x => x.id === S.current);
      montar(par, mesmoPredio); trocou(); marcar('ok'); avisarAndares(); return;
    }
    if (andaresVistos.join('|') !== antesAndares) avisarAndares();
    a = par;
    // a mesma cena: o que o mestre já aplicou sai da fila; o que falta continua valendo por cima do que chegou
    const vp = vPrincipal(a.v), ack = ackDe(vp), agora = relogio();
    let mudou = false;
    seq = Math.max(seq, ack);
    if (ack < ultimaConta) {                               // a conta voltou atrás: o que tinha sido confirmado depois dela volta para a fila
      const voltam = confirmados.filter(b => b.n > ack);
      if (voltam.length) { caixa = voltam.map(b => ({ n: b.n, ops: b.ops, c: b.c })).concat(caixa).sort((x, y) => x.n - y.n); mudou = true; }
      confirmados = confirmados.filter(b => b.n <= ack);
    }
    ultimaConta = ack;
    const saem = caixa.filter(b => b.n <= ack);
    if (saem.length) { mudou = true; confirmados = confirmados.concat(saem.map(b => ({ n: b.n, ops: b.ops, c: b.c, t: agora }))); }
    confirmados = confirmados.filter(b => agora - b.t < 120000).slice(-40);
    caixa = caixa.filter(b => b.n > ack);
    if (mudou) desde = caixa.length ? Date.now() : 0;      // o mestre está respondendo: a espera recomeça
    const alvo = Proj.juntar(a.m, a.v);
    alvo.id = a.m.id;
    normalizeScene(alvo);
    for (const b of caixa) if (!b.c || b.c === S.current) Proj.aplicarEm(alvo, b.ops.filter(op => op.t !== 'ping' && op.t !== 'item' && op.t !== 'andar'));
    registrarImgs(a.m.imgs); registrarImgs(a.v.imgs);
    const aqui = Store.scene(), seqAntes = aqui.expSeq || 0;
    const ops = Proj.diferenca(aqui, alvo);
    if (ops.length) Store.remoteIn(S.current, ops);
    if ((Store.scene().expSeq || 0) !== seqAntes) { Vision.resetExplored(Store.scene()); Render.request(); }
    for (const p of Array.isArray(vp.pings) ? vp.pings : []) {
      if (!ehObj(p) || pingsVistos.has(p.id)) continue;
      pingsVistos.add(p.id);
      if (p.cena && p.cena !== S.current) continue;          // (lote 78) o sinal de outro andar
      if (p.by !== eu && isFinite(p.x) && isFinite(p.y)) { App.pings.push({ x: p.x, y: p.y, t0: performance.now(), c: p.c || '#e6ab4f', n: p.n || '' }); if (App.pings.length > 8) App.pings.shift(); Render.request(); }
    }
    if (mudou) gravarPedido();
    situacao();
  }
  /* O que o jogador fez vai para a fila; o mestre aplica e confirma na projeção seguinte. Barras, condições e auras
     vão com o "como estava" (b), para o mestre aplicar só a diferença por cima do que ele tem agora. */
  function pedir(ops, inv) {
    if (outraAba) {
      if (Date.now() - avisouAba > 6000) { avisouAba = Date.now(); UI.toast('As Cenas estão abertas em outra aba sua: o que você faz aqui não vai para a mesa. Use a outra aba, ou feche-a e recarregue esta.', { long: true }); }
      return;
    }
    const lote = comBase(ops, inv);
    seq += 1;                                              // (seq nunca fica atrás do que o mestre já confirmou: ver montar e receber)
    caixa.push({ n: seq, ops: clone(lote), c: S.current });   // (lote 78) c: o andar em que o pedido foi feito
    if (caixa.length > 80) caixa.shift();
    if (!desde) desde = Date.now();
    if (!tPedido) tPedido = setTimeout(gravarPedido, 120);
    situacao();
  }
  function gravarPedido() {
    clearTimeout(tPedido); tPedido = 0;
    if (modo !== 'jogador') return;
    /* Além do que ainda falta o mestre aplicar, ficam no documento os pedidos confirmados há pouco: se a cena passar a
       ser transmitida por um aparelho do mestre que ainda não os tinha, ele os encontra aqui, na ordem — e aplica os
       que passam da conta dele. (O documento é do próprio jogador: o banco só aceita que ele crie o que é dele.) */
    let lote = confirmados.map(b => ({ n: b.n, ops: b.ops, c: b.c })).concat(caixa);
    while (lote.length > caixa.length && JSON.stringify(lote).length > 120000) lote = lote.slice(1);
    const L = leve(), sl = !L || !L.pronto(topicosP([])[0]);
    D.gravar(PRE_PED + eu, { dono_id: eu, vis: 'mestre', dados: JSON.parse(JSON.stringify(Object.assign({ cena: vazia ? null : S.current, lote }, quer ? { quer } : null, sl ? { sl: true } : null))) }, undefined, { pressa: PRESSA });
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

  /* ---- (lote 78) os andares, do lado do jogador ---- */
  let andaresVistos = [];
  function avisarAndares() { try { if (typeof UI !== 'undefined' && UI.pintarAndares) UI.pintarAndares(); } catch (e) { console.error(e); } }
  // { lista: [{ id, nome, meu (o token dele está lá) }], atual, olhando } — ou null, sem andares no ar
  function andaresDoJogador() {
    if (modo !== 'jogador' || vazia) return null;
    const a = noArAgora();
    if (a.st !== 'ok' || !a.andares.length) return null;
    return { lista: a.andares.map(x => { const p = parDoAndar(a, x.id); return { id: x.id, nome: x.nome, nivel: x.nivel, meu: !!p && temMeu(p.v), pronto: !!p }; }).sort((p, q) => p.nivel - q.nivel), atual: S.current, olhando, ondeEstou };
  }
  // olhar outro andar (null: voltar a seguir o token)
  function verAndar(id) {
    if (modo !== 'jogador') return false;
    olhando = id && id !== ondeEstou ? id : null;
    if (!tReceber) tReceber = setTimeout(receber, 0);
    return true;
  }
  // o jogador leva os tokens dele pela passagem (a escada) para outro andar no ar (p: a passagem, se ele escolheu uma)
  function pedirAndar(tokenIds, para, p) {
    const ids = (Array.isArray(tokenIds) ? tokenIds : [tokenIds]).filter(x => typeof x === 'string').slice(0, 40);
    if (modo !== 'jogador' || vazia || !idCena(para) || !ids.length) return false;
    olhando = null; seguir = { para, ids, ate: Date.now() + 20000 };
    pedir([Object.assign({ t: 'andar', id: ids[0], ids, para }, typeof p === 'string' ? { p } : {})]);
    return true;
  }
  // o mestre: as cenas no ar agora (a primeira é a do noAr)
  const andaresNoAr = () => (modo === 'mestre' ? andares() : []);

  /* ---------------- o que o resto do programa chama ---------------- */
  function carregar() { return modo === 'mestre' ? carregarMestre() : carregarJogador(); }
  function cena(id) { if (modo === 'mestre' && id) { sujas.add(id); metaSuja = true; agendar(); } }
  // (o: { pub } — o que mudou também vai na projeção, como a tabela do relevo: lote 18)
  function meta(o) { if (modo === 'mestre') { metaSuja = true; if (o && o.pub && idx.noAr && transmito()) pubSuja = true; agendar(); } else guardarPrefsDaqui(); }
  function tirarCena(id) {
    if (modo !== 'mestre') return;
    sujas.delete(id); feito.delete(id); campDe.delete(id);
    for (const d of [docM(id), docV(id)]) { if (D.pegar(d)) D.apagar(d); esquecer(d); }
    if (idx.noAr === id) { idx.noAr = null; idx.tx = null; arSujo = true; despublicar(); }
    metaSuja = true; agendar();
  }
  function descarregar() {
    if (modo === 'mestre') { if (tGravar) gravar(); vivosAgora(); }
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
  function esquecerExplorado(sc) { if (modo !== 'mestre') return; if (sc.id === idx.noAr) assumir(); Store.remoteIn(sc.id, [{ t: 'scn', p: { expSeq: (sc.expSeq || 0) + 1 } }]); }

  /* ---- no ar ---- */
  function mostrar(id, juntas) {
    if (modo !== 'mestre' || !S.scenes[id]) return false;
    const novas = Array.isArray(juntas) ? [...new Set(juntas.filter(x => x !== id && S.scenes[x]))].slice(0, Proj.MAX_ANDARES) : [];
    if (idx.noAr === id && iguais(novas, idx.juntas)) return false;
    if (idx.noAr === id) { definirAndares(novas); return true; }      // (lote 78) a mesma cena: só os andares mudam
    idx.noAr = id; idx.tx = meu; arSujo = true; idx.juntas = novas;      // quem põe no ar transmite
    darPorVistos();                                        // o que os jogadores tinham pedido em outra cena não vale nesta
    pings = [];
    sombra.delete(PUB_M); sombra.delete(PUB_V);
    metaSuja = true; pubSuja = true; agendar();
    Store.meta();
    // a cena que entra no ar pode ter ficado um tempo fechada: os tokens dela são acertados pelas fichas como estão agora
    setTimeout(() => { if (transmito()) Fichas.syncAll(); }, 0);
    return true;
  }
  function esconder() {
    if (modo !== 'mestre' || (!idx.noAr && !D.pegar(PUB_M) && !D.pegar(PUB_V))) return false;
    idx.noAr = null; idx.tx = null; idx.juntas = []; arSujo = true; despublicar(); metaSuja = true; agendar();
    Store.meta();
    return true;
  }
  /* (lote 78) Os andares que ficam no ar junto com a cena do noAr. Os pedidos que os jogadores já tinham feito
     continuam valendo (a conta é uma só). */
  function definirAndares(lista) {
    if (modo !== 'mestre' || !idx.noAr) return false;
    const novas = [...new Set((lista || []).filter(x => x !== idx.noAr && S.scenes[x]))].slice(0, Proj.MAX_ANDARES);
    if (iguais(novas, idx.juntas)) return false;
    idx.juntas = novas; if (idx.tx !== meu) idx.tx = meu;
    arSujo = true; metaSuja = true; pubSuja = true; agendar(); Store.meta();
    setTimeout(() => { if (transmito()) Fichas.syncAll(); }, 0);
    return true;
  }
  /* As cenas ligadas à cena `id` pelas passagens (escadas, portas, saídas que levam de uma à outra), em qualquer
     sentido e em qualquer distância: o "prédio" da cena. */
  function ligadas(id) {
    const viz = new Map();
    const liga = (a, b) => { if (!viz.has(a)) viz.set(a, new Set()); viz.get(a).add(b); };
    for (const k in S.scenes) for (const t of S.scenes[k].tokens || []) if (t.prop && t.cena && S.scenes[t.cena] && t.cena !== k) { liga(k, t.cena); liga(t.cena, k); }
    const visto = new Set([id]), fila = [id];
    while (fila.length) { const a = fila.shift(); for (const b of viz.get(a) || []) if (!visto.has(b) && naVista(b)) { visto.add(b); fila.push(b); } }
    visto.delete(id);
    return S.order.filter(x => visto.has(x));
  }
  /* (lote 78/82) Leva tokens de um andar para outro (Andares.mover: cada um chega pela escada certa, na formação). Vindo
     de um jogador (quem): só os tokens dele, só entre andares no ar, só se `de` tem uma passagem para `para` — e, com a
     regra "Só pela escada" da cena, só os que estão a até 1 quadrado de uma delas. → o registro (para desfazer) ou null. */
  function moverDeAndar(tokenIds, de, para, quem, usadaId) {
    const A = S.scenes[de], B = S.scenes[para], ids = (Array.isArray(tokenIds) ? tokenIds : [tokenIds]).filter(x => typeof x === 'string').slice(0, 40);
    if (!A || !B || de === para || !ids.length) return null;
    let vao = ids;
    if (quem) {
      if (!noArJunto(de) || !noArJunto(para)) return null;
      const ps = Andares.passagens(A, para);
      if (!ps.length) return null;
      vao = ids.filter(id => { const t = A.tokens.find(x => x.id === id); return t && !t.prop && (t.owner === quem || t.owner === '*') && !t.locked && (!A.soEscada || ps.some(p => Andares.pertoDaPassagem(A, t, p))); });
      if (!vao.length) return null;
    }
    const reg = Andares.mover(de, para, vao, usadaId);
    if (!reg) return null;
    sujas.add(de); sujas.add(para); metaSuja = true; pubSuja = true; agendar();
    return reg;
  }
  // o mestre leva tokens (um ou vários) da cena aberta para outra cena → o registro (para desfazer) ou null
  function levarParaAndar(tokenIds, para, usadaId) {
    const de = S.current;
    if (modo !== 'mestre') return Andares.mover(de, para, Array.isArray(tokenIds) ? tokenIds : [tokenIds], usadaId);     // (sem mesa: só aqui)
    if (noArJunto(de) || noArJunto(para)) assumir();
    return moverDeAndar(tokenIds, de, para, null, usadaId);
  }
  function voltarDeAndar(reg) {
    if (!reg || !Andares.voltar(reg)) return false;
    if (modo === 'mestre') { sujas.add(reg.de); sujas.add(reg.para); metaSuja = true; pubSuja = true; agendar(); }
    return true;
  }
  /* O jogador usa um item da bolsa do personagem dele num token: o mestre (o aparelho que transmite) confere e aplica.
     op = { t: 'item', de: personagem, item, alvo: token, rol: os dados rolados de cada efeito }. */
  function usarItem(op) {
    if (modo !== 'jogador' || vazia || !ehObj(op)) return false;
    pedir([{ t: 'item', de: String(op.de || ''), item: String(op.item || ''), alvo: String(op.alvo || ''), rol: Array.isArray(op.rol) ? op.rol.slice(0, 8).map(v => (typeof v === 'number' && isFinite(v) ? v : null)) : [] }]);
    return true;
  }
  function ping(x, y) {
    if (modo === 'jogador') { if (!vazia) pedir([{ t: 'ping', x, y }]); return; }
    if (modo === 'mestre' && idx.noAr && idx.noAr === S.current && isGM()) { assumir(); porPing({ id: uid('pg'), x, y, c: '#e6ab4f', n: 'Mestre', by: 'gm' }, false); }
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
  // (lote 81) Um arquivo que já serve (WebP ou JPEG dentro do teto): sobe como veio, com os mesmos bytes.
  async function guardarArquivo(file, w, hh, kind, name) { return subir(file, w, hh, kind, name); }
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

  /* As cenas que um marcador do Mapa-múndi abre (lote 6): { idDaCena: ['Urgm', …] } — dos mapas da mesa (o mestre os
     recebe todos). Só para mostrar um ícone na lista de cenas: nada aqui muda os mapas. */
  function noMundo() {
    const out = {};
    if (modo !== 'mestre' || !D) return out;
    for (const l of D.todas()) {
      if (typeof l.id !== 'string' || !l.id.startsWith('mundo:mapa:')) continue;
      const d = dadosDe(l), objs = d && Array.isArray(d.objs) ? d.objs : [];
      for (const o of objs) {
        if (!ehObj(o) || o.k !== 'm' || !ehObj(o.liga) || o.liga.t !== 'cena' || typeof o.liga.id !== 'string') continue;
        const nome = String(o.nome || '').trim().slice(0, 40) || 'um marcador';
        (out[o.liga.id] = out[o.liga.id] || []).includes(nome) || out[o.liga.id].push(nome);
      }
    }
    return out;
  }
  return {
    iniciar, carregar, cena, meta, tirarCena, descarregar, explorado, esquecerExplorado, noMundo,
    modo: () => modo, on: () => modo !== 'local', mestre: () => modo === 'mestre', jogador: () => modo === 'jogador',
    estado: () => estado, aoEstado(fn) { ouvinte = fn; },
    noAr: () => (S.scenes[idx.noAr] ? idx.noAr : null), transmito,
    andaresNoAr, noArJunto, definirAndares, ligadas, levarParaAndar, voltarDeAndar, andaresDoJogador, verAndar, pedirAndar, segue, cobrar, apareceu, mostrar, esconder, ping, usarItem, semCena: () => vazia,
    // campanhas: a que está em vista, as da mesa, as de cada cena, e se a cena aparece na lista da campanha em vista
    comCampanhas, podeOrganizar, campanha: () => camp, campanhas: () => campsDaMesa.slice(), campanhasDaCena, definirCampanhas, naVista,
    arDeFora: () => arDeFora.slice(),
    guardarImagem, guardarArquivo, guardarDeDados, embutir, cenasDoNavegador, trazer, locais: () => nLocais,
    eu: () => eu, pendentes: () => caixa.length,
  };
})();
