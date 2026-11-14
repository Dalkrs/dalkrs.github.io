/* ---------------------------------------------------------------
   10h. GERADOR — a janela "Gerar um lugar…" (lote 7)
   Uma janela com uma aba por lugar (o Vilarejo, a Cidade, a Tribo, o Encontro, a Região livre, as Ruínas, a Masmorra e o Porto), as escolhas de cada um e, embaixo, o que vale
   para todos: o estilo (Comum, Oriental, Nórdico, Desértico, Élfico, Anão), a hora do dia, o clima da cena, a estação
   (lote 13, parte 13c: só nos lugares de fora — L.aceitaEstacao) e o relevo (as áreas de terreno com altura e as formas
   de enfeite; desligado, o lugar sai plano). A prévia
   mostra o lugar; um clique numa parte dela (uma casa, o rio, as ruas e a praça) trava a parte, e "Gerar outro"
   sorteia só o resto. A semente fica à mostra (a mesma semente, com as mesmas escolhas, dá o mesmo lugar) e o lugar
   pode ser guardado como modelo, para gerar outros parecidos (os modelos são do mestre: na mesa, vão no índice das
   cenas). Nada muda nas cenas que já existem até "Criar a cena".
   --------------------------------------------------------------- */
const Gerador = (() => {
  // (lote 14, parte 14c: o Vilarejo, a Cidade, a Tribo, as Ruínas e o Porto com os arredores — Arredores.envolver)
  // (lote 49) as catacumbas, o castelo e o cemitério; (lote 53) a cena do crime — e a ordem dos grupos da janela
  const LUGARES = [Arredores.LUGARES.vila, Arredores.LUGARES.cidade, CidadeGrande.LUGAR, Arredores.LUGARES.tribo, Arredores.LUGARES.porto,
    Encontro.LUGAR, Regiao.LUGAR,
    AguaPenhasco.LUGARES.lago, AguaPenhasco.LUGARES.praia, AguaPenhasco.LUGARES.penhasco, AguaPenhasco.LUGARES.desfiladeiro,      // (lote 58)
    LugaresFora.CASTELO, Arredores.LUGARES.ruinas, LugaresFora.CEMITERIO, LugaresMundo.LUGAR,      // (lote 126) os lugares do mundo
    Furtividade.LUGAR_SOB,      // (lote 150) o lugar sob medida (a ficha, que a IA preenche)
    Interior.LUGAR,      // (lote 149) o interior (a janela "Gerar o interior" virou esta aba)
    Masmorra.LUGAR, Masmorra.LUGAR_CAT,
    LugaresFora.CRIME, Arena.LUGAR].concat(Furtividade.IDS.map(id => Furtividade.LUGARES[id]));      // (lote 121) a furtividade
  /* (lote 53) os lugares em grupos, na coluna da esquerda da janela, cada um com o desenho dele */
  const GRUPOS = [['Povoados', ['vila', 'cidade', 'cidadeGrande', 'tribo', 'porto']], ['Sob medida', ['sobmedida']], ['Por dentro', ['interior']], ['Natureza', ['encontro', 'regiao']], ['Água e penhasco', ['lago', 'praia', 'penhasco', 'desfiladeiro']], ['Fortes e ruínas', ['castelo', 'ruinas', 'cemiterio']], ['Lugares do mundo', ['mundo116']],
    ['Subterrâneo', ['masmorra', 'catacumbas']], ['Especiais', ['crime', 'arena']], ['Furtividade', Furtividade.IDS]];
  const GLIFOS = {
    vila: 'M4 11.5 12 5l8 6.5M6.5 10v9h11v-9M10 19v-5h4v5', cidade: 'M3.5 20V9l4-3 4 3v11M11.5 20V5h5v15M16.5 20v-8h4v8M2.5 20h19',
    tribo: 'M12 4 4 20h16L12 4zM12 4v16M9.5 20 12 13l2.5 7', porto: 'M12 4v16M8 7.5h8M12 20c-4 0-7-2.5-7.5-6M12 20c4 0 7-2.5 7.5-6M12 6a1.6 1.6 0 1 0 0-.1',
    encontro: 'M5 5l14 14M19 5 5 19M5 5h3M5 5v3M19 5h-3M19 5v3', regiao: 'M3 19l6-10 4 6 2.5-3.5L21 19H3zM16.5 7a1.8 1.8 0 1 0 0-.1',
    castelo: 'M4 20V8h3v2h2.5V8h5v2H17V8h3v12H4zM10 20v-4h4v4', ruinas: 'M6 20V8h3v12M15 20v-6h3v6M5 8h5M4.5 20h15M14 11l2-3 3 1',
    cemiterio: 'M7 20v-9a5 5 0 0 1 10 0v9M5 20h14M12 9.5v5M10 11.5h4', masmorra: 'M5 20V10a7 7 0 0 1 14 0v10M5 20h14M9 20v-6h6v6M8.5 10h7',
    catacumbas: 'M12 4a6 6 0 0 0-6 6v3l2 2v3h8v-3l2-2v-3a6 6 0 0 0-6-6zM9.5 11v.1M14.5 11v.1M10.5 18v-2M13.5 18v-2', crime: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.3 15.3 20.5 20.5',
    // (lote 58) o lago (a água parada com o junco), a praia (a onda na areia), o penhasco (o degrau) e o desfiladeiro (a fenda)
    lago: 'M4 14c2-3 14-3 16 0-2 3-14 3-16 0zM8 14h1.5M13 13.5h3M6.5 10V7M8 10.5V6M17 10V7.5', praia: 'M3 17c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2 1 3 1M3 12c3-4 7-6 12-6M15 6l2 3',
    penhasco: 'M3 7h8l1 4 1 9h8M3 7v13h18M7 11v.1M9 15v.1', desfiladeiro: 'M3 5l4 2 2 13M21 5l-4 3-2 12M9 20h6M11 9l1 2-1 3 1 3',
    cidadeGrande: 'M2 20h20M3 20V8l3-2 3 2v12M9 20V4h6v16M15 20v-9l3-2 3 2v9M11 7h2M11 10h2M11 13h2',
    interior: 'M3 20V5h18v15H3zM3 12h7M10 5v4M10 12v8M10 15h11M15 15v5M6 8h.1',
    sobmedida: 'M4 20h16M6 20v-7l5-4 5 4v7M9 20v-3h4v3M17 4l3 3-6 6-3 1 1-3 5-5z',      // (lote 150) a casa e o lápis
      // (lote 149) a planta por dentro (as salas)
    mundo116: 'M3 20h18M5 20V10l7-5 7 5v10M9 20v-5h6v5M12 5V2.5M10.5 3h3',          // (lote 126) o templo
    arena: 'M3 9c0-2 4-3.5 9-3.5S21 7 21 9v7c0 2-4 3.5-9 3.5S3 18 3 16V9zM3 9c0 2 4 3.5 9 3.5S21 11 21 9M7 12v6M12 12.5v7M17 12v6',
    // (lote 121) a furtividade: a mansão (a casa grande com o muro), a fortaleza (a torre com as ameias), a guilda (o cofre),
    // o acampamento (a barraca e o fogo), as ruas (as casas e o lampião) e a torre de guarda (a torre e o olho)
    mansao: 'M3 20h18M5 20v-8l7-5 7 5v8M9.5 20v-4h5v4M8 13h.1M16 13h.1M2.5 20v-3h2M21.5 20v-3h-2',
    casarao: 'M2 20h20M4 20v-7l5-4 5 4v7M7 20v-3h4v3M16 20v-5h5v5M16 15l2.5-2 2.5 2M18 8c0-2 2-3 3-3-1 2-1 4-3 4',      // (lote 146) o casarão (a casa e a estufa, com a folha)
    fortaleza: 'M5 20V9h2.5v2H10V9h4v2h2.5V9H19v11H5zM10.5 20v-4.5h3V20M3 20h18',
    guilda: 'M4 5h16v14H4zM12 12m-3.5 0a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0M12 8.5V12l2 1.5M7 8h.1M17 16h.1',
    acampamento: 'M3 19 10 6l7 13H3zM10 6v13M8 19l2-5 2 5M17.5 19c0-1.5 1-2 1-3.2.8.6 2 1.8 2 3.2M16 19h6',
    ruas: 'M3 20V11l4-3 4 3v9M13 20v-7l4-3 4 3v7M2 20h20M7 20v-3M17 20v-3M12 4v3M10.8 4h2.4',
    torre: 'M8 20V9h8v11M7 9h10V6h-2v1.5h-2V6h-2v1.5H9V6H7zM10.5 20v-3h3v3M5 20h14M12 12.5a1.5 1 0 1 0 .1 0',
  };
  const glifo = id => { const NS = 'http://www.w3.org/2000/svg', v = document.createElementNS(NS, 'svg'); v.setAttribute('viewBox', '0 0 24 24'); v.setAttribute('width', '18'); v.setAttribute('height', '18'); v.setAttribute('aria-hidden', 'true'); v.setAttribute('class', 'ger-gl'); const pa = document.createElementNS(NS, 'path'); pa.setAttribute('d', GLIFOS[id] || GLIFOS.vila); pa.setAttribute('fill', 'none'); pa.setAttribute('stroke', 'currentColor'); pa.setAttribute('stroke-width', '1.7'); pa.setAttribute('stroke-linecap', 'round'); pa.setAttribute('stroke-linejoin', 'round'); v.append(pa); return v; };
  // os blocos da coluna da direita: o que está aberto fica lembrado (nos testes, tudo aberto)
  const tudoAberto = (() => { try { return localStorage.getItem('tinycats:testes-tudo-aberto') === '1'; } catch (e) { return false; } })();
  const blocoAberto = k => tudoAberto || (App.opt.genAbertos && typeof App.opt.genAbertos === 'object' && k in App.opt.genAbertos ? !!App.opt.genAbertos[k] : k === 'lugar');
  const novaSemente = () => 1 + Math.floor(Math.random() * 2147483000);
  const lugar = id => LUGARES.find(l => l.id === id) || null;
  const modelos = () => Proj.normModelos(Store.S.prefs.modelos);
  const guardarModelos = lista => { Store.S.prefs.modelos = Proj.normModelos(lista); Persist.meta(); };
  let aberta = null;
  /* (lote 48) sem clima escolhido, o lugar ganha o ambiente da estação (folhas secas no outono, pétalas na primavera) e a
     masmorra, a poeira no ar. Escolher "Nenhum" depois, na aba Cena, tira. */
  const climaDe = l => comumAtual.clima || (l.aceitaEstacao && comumAtual.estacao === 'outono' ? 'folhas' : l.aceitaEstacao && comumAtual.estacao === 'primavera' ? 'petalas' : l.id === 'masmorra' ? 'poeira' : '');
  let comumAtual = { clima: '', estacao: 'verao' };                                       // (a janela aberta, para os testes: a aba, o estado e o plano)

  /* Desenha um cadeado pequeno em (x, y) (o canto de cima, à esquerda, da marca). */
  function cadeado(g, x, y, s) {
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(20,16,10,0.85)'; g.beginPath(); g.arc(s * 0.5, s * 0.55, s * 0.72, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#f3d28a'; g.lineWidth = Math.max(1.5, s * 0.14); g.beginPath(); g.arc(s * 0.5, s * 0.42, s * 0.22, Math.PI, 0); g.stroke();
    g.fillStyle = '#e6ab4f'; g.fillRect(s * 0.18, s * 0.42, s * 0.64, s * 0.5);
    g.fillStyle = '#3a2a12'; g.fillRect(s * 0.46, s * 0.55, s * 0.08, s * 0.2);
    g.restore();
  }
  // o desenho de uma parte (em quadrados) na prévia: o contorno, o círculo ou a linha grossa
  function caminho(g, f, cell) {
    g.beginPath();
    if (f.k === 'circ') g.arc(f.x * cell, f.y * cell, f.r * cell, 0, Math.PI * 2);
    else f.pts.forEach(([x, y], i) => (i ? g.lineTo(x * cell, y * cell) : g.moveTo(x * cell, y * cell)));
    if (f.k === 'poli') g.closePath();
  }
  // onde vai o cadeado da parte: no canto da casa, no meio da praça, no meio do rio
  function ancora(f) {
    if (f.k === 'circ') return [f.x, f.y];
    if (f.k === 'poli') return [Math.min(...f.pts.map(p => p[0])), Math.min(...f.pts.map(p => p[1]))];
    const p = f.pts[Math.floor(f.pts.length / 2)];
    return [p[0], p[1]];
  }

  /* (lote 7, parte 5a) A chave dos eventos do Mapa-múndi: os nomes deles e o que levam para a cena. */
  function textoEventos(ev) {
    const leva = [];
    if (ev.seco) leva.push('o chão seco');
    for (const k of ev.fx) leva.push('a zona ' + FX.P[k].n + ' cobrindo a cena');
    return 'Com os eventos do Mapa-múndi' + (ev.nomes.length ? ' (' + ev.nomes.join(', ') + ')' : '') + ': ' + leva.join(' e ');
  }
  // as zonas dos eventos cobrindo a cena toda (leves: o véu e o contorno), à mostra para todos; um passo de criar
  function cobrirComZonas(sc, fxs) {
    const c = sc.cell, W = sc.cols, H = sc.rows;
    for (const k of fxs) sc.effects.push({ id: uid('fx'), fx: k, k: 'circ', x: W * c / 2, y: H * c / 2, r: Math.ceil(Math.hypot(W, H) / 2) + 1, w: 1, rw: 2, rh: 2, ang: 0, dir: 0, pow: 0.6, token: null, gm: false, leve: true, by: null, seed: 1 + Math.floor(Math.random() * 997), dur: 0, dur0: 0, at: null, apply: null });
    normalizeScene(sc); Persist.scene(sc.id);
  }
  /* Abre a janela. lugarId: a aba que abre ('vila'); pre: escolhas que já vêm feitas ({ op, estilo, hora, clima, relevo }) e,
     quando quem pede é o Mapa-múndi, o nome da cena (nome) e o id que ela vai ter (id: o marcador do mapa já leva a ele). */
  function abrir(lugarId, pre) {
    if (!isGM()) return;
    const K = UI.kit, { field, seg, btn, note, iconBtn } = K;
    let L = lugar(lugarId) || lugar(App.opt.genLugar) || LUGARES[0];
    const comum = { estilo: Estilos.valido(App.opt.genEstilo), hora: TONES.some(t => t.id === App.opt.genHora) ? App.opt.genHora : 'dia', clima: WEATHERS.some(w => w[0] === App.opt.genClima) ? App.opt.genClima : '', relevo: App.opt.genRelevo !== false, estacao: Estacoes.valida(App.opt.genEstacao) };
    comumAtual = comum;
    const lembrarComum = () => { App.opt.genEstilo = comum.estilo; App.opt.genHora = comum.hora; App.opt.genClima = comum.clima; App.opt.genRelevo = comum.relevo; App.opt.genEstacao = comum.estacao; App.opt.genLugar = L.id; };
    // (lote 13, parte 13c) a estação vai só para os lugares de fora (os outros não a conhecem)
    const comEstacao = (l, o) => (l.aceitaEstacao ? Object.assign(o, { estacao: comum.estacao }) : o);
    // o estado de cada aba (as escolhas, a semente, o que está travado e o plano na tela): trocar de aba não perde nada
    const estados = {};
    const estadoDe = l => estados[l.id] || (estados[l.id] = { op: l.padrao(), seed: novaSemente(), trava: null, base: null, plano: null });
    if (pre && typeof pre === 'object') {
      if (pre.op) L.aplicarOpcoes(estadoDe(L).op, pre.op);
      if (Number.isInteger(pre.semente) && pre.semente >= 1) estadoDe(L).seed = pre.semente;      // (lote 149: o prédio da cidade)
      if (pre.estilo) comum.estilo = Estilos.valido(pre.estilo);
      if (TONES.some(t => t.id === pre.hora)) comum.hora = pre.hora;
      if (WEATHERS.some(w => w[0] === pre.clima)) comum.clima = pre.clima;
      if (typeof pre.relevo === 'boolean') comum.relevo = pre.relevo;
      if (Estacoes.LISTA.some(e => e[0] === pre.estacao)) comum.estacao = pre.estacao;
    }
    /* (lote 7, parte 5a) o que os eventos do Mapa-múndi levam para a cena (o clima e a hora já vêm nas escolhas de baixo):
       o chão seco (a seca) e as zonas que cobrem a cena (a Lua de sangue, a Névoa de espíritos). Uma chave tira. */
    const evPedido = pre && typeof pre === 'object' && (pre.seco === true || (Array.isArray(pre.fx) && pre.fx.some(k => FX.P[k])))
      ? { seco: pre.seco === true, fx: (Array.isArray(pre.fx) ? pre.fx : []).filter(k => FX.P[k]).slice(0, 4), nomes: (Array.isArray(pre.eventos) ? pre.eventos : []).filter(x => typeof x === 'string').slice(0, 6) } : null;
    comum.comEventos = !!evPedido;
    // o que vale em cada aba: o chão seco só onde o gerador sabe secar (L.aceitaSeco: o Encontro); lá embaixo
    // (L.semHora: a masmorra), nada
    const evDaAba = l => !evPedido || l.semHora ? null : { seco: evPedido.seco && !!l.aceitaSeco, fx: evPedido.fx, nomes: evPedido.nomes };
    const temEv = l => { const e = evDaAba(l); return !!e && (e.seco || e.fx.length > 0); };
    const usaEv = l => comum.comEventos && temEv(l);
    /* (lote 14, parte 14a) O hexágono do Mapa-múndi ("Gerar a cena aqui"): o chão dele e dos vizinhos nas bordas, o rio e
       os caminhos do mapa pelos pontos certos — nas abas que aceitam (o Encontro, nos terrenos de chão de bioma, e a
       Região livre). Uma chave tira. As outras abas também vêm preenchidas (pre.ops: a Região livre com o bioma, a água e
       o caminho do hexágono), sem mexer no que a janela lembra para a próxima vez. */
    const hexPedido = pre && typeof pre === 'object' ? HexCena.valida(pre.hex) : null;
    // (lote 18) o campo de batalha (da janela da Batalha do Mapa-múndi): os dois exércitos e os soldados por bloco
    const campoPedido = pre && typeof pre === 'object' && pre.campo ? Campo.valida(pre.campo) : null;
    comum.campoPor = campoPedido ? campoPedido.por : 100;
    comum.comHex = !!hexPedido;
    // (lote 14, parte 14b) as marcas da guerra do hexágono: os botões no bloco dele (de começo, todas — menos o exército
    // escondido no mapa)
    comum.guerra = hexPedido && hexPedido.guerra ? MarcasGuerra.padrao(hexPedido.guerra) : null;
    const hexDaAba = l => (hexPedido && l.aceitaHex && l.aceitaHex(estadoDe(l).op, hexPedido) ? hexPedido : null);
    const usaHex = l => (comum.comHex ? hexDaAba(l) : null);
    const comHex = (l, o) => { const hx = usaHex(l); return hx ? Object.assign(o, { hex: hx }, hx.guerra ? { guerra: comum.guerra } : null) : o; };
    if (pre && pre.ops && typeof pre.ops === 'object') {
      const lembrado = Object.assign({}, App.opt);
      for (const id of Object.keys(pre.ops)) { const l = lugar(id); if (l && l !== L && pre.ops[id] && typeof pre.ops[id] === 'object') l.aplicarOpcoes(estadoDe(l).op, pre.ops[id]); }
      for (const k of Object.keys(App.opt)) if (!(k in lembrado)) delete App.opt[k];
      Object.assign(App.opt, lembrado);
    }
    // (lote 14, parte 14c) os lugares com os arredores vêm preenchidos pelo hexágono: o rio (de onde vem e para onde vai) e
    // os portões nas direções dos caminhos do mapa — sem mexer no que a janela lembra
    if (hexPedido && HexCena.aceita(hexPedido)) for (const l of LUGARES) if (l.preencherHex) l.preencherHex(estadoDe(l).op, hexPedido);
    // (lote 53) o caso do Escudo do mestre que pediu esta janela: o bloco "Mistério" já vem ligado nele
    if (pre && typeof pre.misterio === 'string') { App.opt.genMist = true; App.opt.genMistCaso = pre.misterio; }
    let nomeMexido = !!(pre && typeof pre.nome === 'string' && pre.nome.trim()), foco = -1, sobre = null, modeloNovo = false;
    const idPedido = pre && typeof pre.id === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(pre.id) ? pre.id : null;
    const cv = h('canvas', { class: 'ger-cv', id: 'ger-prev', width: 640, height: 460, tabindex: 0, 'data-focus': '', 'data-enter': 'proprio', 'aria-label': 'Prévia do lugar. Clique numa parte para travar; com o teclado, as setas escolhem a parte e Enter trava.' });
    const fundo = document.createElement('canvas');
    let cell = 10;
    const ctl = h('div', { class: 'ger-blocos' }), abas = h('div', { class: 'ger-ab' }), resumo = h('p', { class: 'note', id: 'ger-resumo', role: 'status' }), dica = h('p', { class: 'note ger-dica', id: 'ger-dica' });
    const inNome = h('input', { id: 'ger-nome', class: 'in', type: 'text', maxlength: 60, autocomplete: 'off', 'aria-label': 'Nome da cena', oninput: () => { nomeMexido = true; } });
    if (nomeMexido) inNome.value = pre.nome.trim().slice(0, 60);
    const inSemente = h('input', { id: 'ger-semente', class: 'in num', type: 'number', min: 1, max: 2147483647, step: 1, 'data-enter': 'proprio', 'aria-label': 'A semente do sorteio',
      title: 'A mesma semente, com as mesmas escolhas, dá o mesmo lugar',
      onchange: () => { const v = Math.round(Number(inSemente.value)); if (v >= 1 && v <= 2147483647) { const E = estadoDe(L); E.base = E.plano ? L.baseDe(E.plano) : null; E.seed = v; if (E.op) E.op.variantes = null; refazer(); } else inSemente.value = estadoDe(L).seed; },
      onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); inSemente.dispatchEvent(new Event('change')); } } });
    const btOutro = btn('Gerar outro', () => { const E = estadoDe(L); E.base = E.plano ? L.baseDe(E.plano) : null; E.seed = novaSemente(); if (E.op) E.op.variantes = null; refazer(); }, { icon: 'reset', id: 'ger-outro', title: 'Sorteia de novo, com as mesmas escolhas; o que está travado fica igual' });
    const btSoltar = btn('Soltar tudo', () => soltarTudo(), { icon: 'unlock', id: 'ger-soltar', title: 'Solta todas as partes travadas (o lugar na tela não muda)' });
    const md = h('div', { class: 'ger-md', id: 'ger-md' }), nota = note(L.nota);

    /* ---- a prévia e as partes ---- */
    const partes = () => (estadoDe(L).plano ? L.partes(estadoDe(L).plano) : []);
    function desenhar() {
      const E = estadoDe(L), p = E.plano;
      if (!p) return;
      if (cv.width !== fundo.width || cv.height !== fundo.height) { cv.width = fundo.width; cv.height = fundo.height; }
      const g = cv.getContext('2d');
      g.clearRect(0, 0, cv.width, cv.height); g.drawImage(fundo, 0, 0);
      // a hora do dia escolhida tinge a prévia (como na cena) — menos no lugar sem hora (a masmorra, lá embaixo)
      const tom = L.semHora ? null : TONES.find(t => t.id === comum.hora);
      if (tom && tom.tint) { g.fillStyle = tom.tint; g.fillRect(0, 0, cv.width, cv.height); if (tom.id === 'breu') { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, cv.width, cv.height); } }
      const marcar = (parte, modo) => {
        const fs = L.formaDaParte(p, parte);
        g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
        for (const f of fs) {
          caminho(g, f, cell);
          if (f.k === 'linha') {
            g.strokeStyle = modo === 'trava' ? 'rgba(230,171,79,0.35)' : 'rgba(255,255,255,0.22)'; g.lineWidth = (f.hw * 2 + 0.4) * cell; g.stroke();
          } else { g.fillStyle = modo === 'trava' ? 'rgba(230,171,79,0.22)' : 'rgba(255,255,255,0.16)'; g.fill(); }
          if (f.k !== 'linha') { g.strokeStyle = modo === 'trava' ? '#e6ab4f' : '#ffffff'; g.lineWidth = Math.max(2, cell * 0.2); g.setLineDash(modo === 'trava' ? [] : [Math.max(3, cell * 0.4), Math.max(3, cell * 0.3)]); g.stroke(); g.setLineDash([]); }
        }
        g.restore();
        if (modo === 'trava' && fs.length) { const [ax, ay] = ancora(fs[0]), s = Math.max(10, cell * 0.9); cadeado(g, ax * cell + 2, ay * cell + 2, s); }
      };
      for (const parte of partes()) if (L.travada(p, parte)) marcar(parte, 'trava');
      const alvo = sobre || (foco >= 0 ? partes()[foco] : null);
      if (alvo) marcar(alvo, 'sobre');
    }
    function mostrarDica() {
      const E = estadoDe(L), p = E.plano, alvo = sobre || (foco >= 0 ? partes()[foco] : null);
      dica.textContent = alvo && p ? `Clique para ${L.travada(p, alvo) ? 'soltar' : 'travar'} ${L.nomeDaParte(p, alvo)}.` : L.dica || 'Clique numa parte da prévia (uma casa, o rio, as ruas e a praça) para travar: ela fica igual quando você gera outro.';
      cv.classList.toggle('parte', !!sobre);
    }
    function mostrarResumo() {
      const E = estadoDe(L), p = E.plano, n = L.quantasTravadas(p);
      resumo.textContent = L.resumo(p) + Trama.resumo(p) + (n ? ` ${n === 1 ? 'Uma parte travada' : n + ' partes travadas'}.` : '') + (p.soltas ? ` ${p.soltas === 1 ? 'Uma casa travada não coube e saiu' : p.soltas + ' casas travadas não couberam e saíram'}.` : '');
      btSoltar.disabled = !n;
    }
    function refazer() {
      const E = estadoDe(L);
      if (Zonas.vale(L)) E.op.zonas = Zonas.de(L.id);      // (lote 154) as zonas desenhadas à mão
      E.plano = L.gerar(E.op, comHex(L, comEstacao(L, { estilo: comum.estilo, seed: E.seed, trava: E.trava, base: E.base, seco: usaEv(L) && evDaAba(L).seco })));
      E.trava = L.travaDe(E.plano);                // (o que não coube sai da trava)
      if (Zonas.vale(L) && L.id !== 'masmorra' && E.op.zonas && E.op.zonas.length) { try { Zonas.pos(E.plano, E.op.zonas); } catch (e) { console.error(e); } }
      if (Trama.vale(L, E.op) && Trama.prefs().on) { try { Trama.tecer(E.plano, Trama.prefs()); } catch (e) { console.error(e); } }      // (lote 152) a história da missão
      let rp = null;
      try { rp = L.previa(fundo, E.plano, 640, 460, { relevo: comum.relevo }); cell = rp.cell; } catch (e) { console.error(e); }
      if (Tempo.vale(L)) { try { Tempo.previa(fundo.getContext('2d'), E.plano, cell); } catch (e) { console.error(e); } }      // (lote 153) o tempo, por baixo dos números da história
      if (E.plano.trama && !(rp && rp.trama)) Trama.desenhar(fundo.getContext('2d'), E.plano, cell);
      if (Zonas.vale(L) && E.op.zonas && E.op.zonas.length) Zonas.desenhar(fundo.getContext('2d'), E.op.zonas, cell);      // (lote 154)
      sobre = null; foco = -1;
      desenhar(); mostrarDica(); mostrarResumo();
      inSemente.value = E.seed;
      if (!nomeMexido) inNome.value = L.nomePadrao(E.plano);
      nota.textContent = L.nota;                    // (lote 149: a nota que depende do plano, como a do Interior)
    }
    function alternar(parte) {
      const E = estadoDe(L);
      if (!E.plano || !parte) return;
      E.trava = L.alternar(E.plano, parte, E.trava);
      desenhar(); mostrarDica(); mostrarResumo();
    }
    function soltarTudo() {
      const E = estadoDe(L);
      if (!E.plano) return;
      for (const parte of partes()) if (L.travada(E.plano, parte)) E.trava = L.alternar(E.plano, parte, E.trava);
      E.trava = null;
      desenhar(); mostrarDica(); mostrarResumo();
    }
    // o ponto do mouse em quadrados do plano (a prévia fica centrada na caixa dela, sem esticar)
    const parteNoPonto = e => {
      const E = estadoDe(L), r = cv.getBoundingClientRect();
      if (!E.plano || !r.width || !cv.width) return null;
      const k = Math.min(r.width / cv.width, r.height / cv.height), ox = (r.width - cv.width * k) / 2, oy = (r.height - cv.height * k) / 2;
      return L.parteEm(E.plano, (e.clientX - r.left - ox) / k / cell, (e.clientY - r.top - oy) / k / cell);
    };
    cv.addEventListener('pointermove', e => { const pt = parteNoPonto(e); if (pt !== sobre) { sobre = pt; foco = -1; desenhar(); mostrarDica(); } });
    cv.addEventListener('pointerleave', () => { if (sobre) { sobre = null; desenhar(); mostrarDica(); } });
    // (lote 154) o mouse em quadrados do plano; clicar num cômodo (sem parte) sorteia outra versão dele
    const noPlano = e => { const r = cv.getBoundingClientRect(), k = Math.min(r.width / cv.width, r.height / cv.height), ox = (r.width - cv.width * k) / 2, oy = (r.height - cv.height * k) / 2; return [(e.clientX - r.left - ox) / k / cell, (e.clientY - r.top - oy) / k / cell]; };
    const comodoNoPonto = e => { const E = estadoDe(L), p = E.plano; if (!p || !(L.furtivo || L.id === 'sobmedida') || !Array.isArray(p.salas)) return null; const [x, y] = noPlano(e); return p.salas.find(q => q.papel && q.papel !== 'corredor' && x >= q.x && y >= q.y && x < q.x + q.w && y < q.y + q.h) || null; };
    cv.addEventListener('click', e => {
      const pt = parteNoPonto(e);
      if (pt) { alternar(pt); return; }
      const q = comodoNoPonto(e);
      if (!q) return;
      const E = estadoDe(L), k = Furtividade.chaveSala({ p: { nivel: 0 } }, q);
      E.op.variantes = Object.assign({}, E.op.variantes || {}, { [k]: ((E.op.variantes || {})[k] || 0) + 1 });
      refazer();
      UI.toast(`Outra versão: ${(PlantaAndares.NOMES[q.papel] || q.papel).toLowerCase()}. O resto ficou igual.`, { key: 'ger-var' });
    });
    cv.classList.toggle('desenhando', Zonas.ativo());
    Zonas.prender(cv, noPlano, () => L.id, vivo => { desenhar(); if (vivo) Zonas.desenhar(cv.getContext('2d'), [], cell, vivo); }, () => { pintar(); refazer(); });
    cv.addEventListener('keydown', e => {
      const ps = partes();
      if (!ps.length) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { foco = (foco + 1) % ps.length; sobre = null; }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { foco = (foco - 1 + ps.length) % ps.length; sobre = null; }
      else if ((e.key === 'Enter' || e.key === ' ') && foco >= 0) { e.preventDefault(); e.stopPropagation(); alternar(ps[foco]); return; }
      else return;
      e.preventDefault(); desenhar(); mostrarDica();
    });
    cv.addEventListener('blur', () => { if (foco >= 0) { foco = -1; desenhar(); mostrarDica(); } });

    /* ---- os modelos ---- */
    function pintarModelos(focoId) {
      const lista = modelos();
      if (modeloNovo) {
        const inM = h('input', { id: 'ger-modelo-nome', class: 'in', type: 'text', maxlength: 40, autocomplete: 'off', 'data-enter': 'proprio', 'data-esc': 'proprio', placeholder: 'Nome do modelo', 'aria-label': 'Nome do modelo',
          onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); guardarModelo(inM.value); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); modeloNovo = false; pintarModelos('ger-guardar'); } } });
        md.replaceChildren(inM, btn('Guardar', () => guardarModelo(inM.value), { kind: 'small', id: 'ger-modelo-ok' }), btn('Cancelar', () => { modeloNovo = false; pintarModelos('ger-guardar'); }, { kind: 'small', id: 'ger-modelo-nao' }));
        inM.value = inNome.value.trim().slice(0, 40);
        setTimeout(() => { inM.focus(); inM.select(); }, 0);
        return;
      }
      const sel = h('select', { id: 'ger-modelo', class: 'in', 'aria-label': 'Abrir um modelo guardado', disabled: !lista.length, value: '',
        onchange: e => { const v = e.target.value; e.target.blur(); if (v) abrirModelo(v); } },
        h('option', { value: '', text: lista.length ? 'Abrir um modelo…' : 'Nenhum modelo guardado' }),
        ...lista.map(m => h('option', { value: m.id, text: m.nome + (lugar(m.lugar) && LUGARES.length > 1 ? ' · ' + lugar(m.lugar).n : '') })));
      md.replaceChildren(...[sel,
        btn('Guardar como modelo', () => { if (modelos().length >= 30) { UI.toast('Já são 30 modelos: apague um para guardar outro.'); return; } modeloNovo = true; pintarModelos(); }, { icon: 'plus', kind: 'small', id: 'ger-guardar', title: 'Guarda as escolhas, a semente e as partes travadas, para gerar outros parecidos' }),
        lista.length ? iconBtn('trash', 'Apagar um modelo…', () => apagarModeloMenu(), { size: 15, id: 'ger-apagar' }) : null].filter(Boolean));
      if (focoId) { const n = document.getElementById(focoId); if (n) n.focus(); }
    }
    function guardarModelo(nome) {
      nome = String(nome || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      if (!nome) { UI.toast('Dê um nome ao modelo.'); return; }
      const E = estadoDe(L), lista = modelos();
      const m = { id: uid('md'), nome, lugar: L.id, o: comEstacao(L, Object.assign(L.opcoesDe(E.op), { estilo: comum.estilo, hora: comum.hora, clima: comum.clima, relevo: comum.relevo })), seed: E.seed, trava: L.travaDe(E.plano) };
      guardarModelos(lista.concat([m]));
      modeloNovo = false; pintarModelos('ger-guardar');
      UI.toast(`Modelo "${nome}" guardado: as escolhas, a semente ${E.seed} e as partes travadas.`, { action: 'Desfazer', run: () => { guardarModelos(modelos().filter(x => x.id !== m.id)); if (md.isConnected) pintarModelos(); } });
    }
    function abrirModelo(id) {
      const m = modelos().find(x => x.id === id), l = m && lugar(m.lugar);
      if (!m || !l) { UI.toast('Esse modelo é de um lugar que esta janela não gera.'); pintarModelos(); return; }
      const antes = { L, comum: Object.assign({}, comum), E: JSON.parse(JSON.stringify(Object.assign({}, estadoDe(l), { plano: null }))) };
      L = l;
      const E = estadoDe(L);
      L.aplicarOpcoes(E.op, m.o, { modelo: true });                 // (lote 13, parte 13b: o modelo de antes do chão novo fica no de antes)
      comum.estilo = Estilos.valido(m.o.estilo);
      if (TONES.some(t => t.id === m.o.hora)) comum.hora = m.o.hora;
      if (WEATHERS.some(w => w[0] === m.o.clima)) comum.clima = m.o.clima;
      if (typeof m.o.relevo === 'boolean') comum.relevo = m.o.relevo;
      if (L.aceitaEstacao) comum.estacao = Estacoes.valida(m.o.estacao);       // (o modelo de antes das estações: o verão)
      E.seed = m.seed; E.trava = m.trava; E.base = null;
      lembrarComum(); pintar(); refazer();
      UI.toast(`Modelo "${m.nome}" aberto: a semente ${m.seed} e as partes travadas dele. "Gerar outro" sorteia outros parecidos.`, { action: 'Desfazer', run: () => {
        if (!cv.isConnected) return;
        L = antes.L; Object.assign(comum, antes.comum); estados[l.id] = Object.assign(antes.E, { plano: null }); lembrarComum(); pintar(); refazer();
      } });
    }
    function apagarModeloMenu() {
      const b = document.getElementById('ger-apagar'), r = b ? b.getBoundingClientRect() : { left: 0, bottom: 0 };
      const items = [{ head: 'Apagar qual modelo?' }].concat(modelos().map(m => ({ label: m.nome, icon: 'trash', danger: true, run: () => {
        const lista = modelos();
        guardarModelos(lista.filter(x => x.id !== m.id)); pintarModelos();
        UI.toast(`Modelo "${m.nome}" apagado.`, { action: 'Desfazer', run: () => { guardarModelos(lista); if (md.isConnected) pintarModelos(); } });
      } })));
      UI.menuEm(r.left, r.bottom + 4, items);
    }

    /* ---- (lote 150) descrever com a IA: o texto vira a ficha do lugar ---- */
    const iaMsg = h('div', { class: 'ia-msg', id: 'ger-ia-msg', role: 'status' });
    let iaOcupada = false;
    function aplicarIA(res) {
      const l = lugar(res.lugar) || lugar('sobmedida');
      L = l;
      const E = estadoDe(L);
      if (res.op) L.aplicarOpcoes(E.op, res.op);
      if (res.comum.estilo) comum.estilo = res.comum.estilo;
      if (res.comum.hora) comum.hora = res.comum.hora;
      if (res.comum.clima !== undefined) comum.clima = res.comum.clima;
      E.trava = null; E.base = null; E.seed = novaSemente();
      if (res.nome) { inNome.value = res.nome; nomeMexido = true; } else nomeMexido = false;
      lembrarComum(); pintar(); refazer();
      iaMsg.replaceChildren(...[h('p', { class: 'note', text: `A IA escolheu: ${L.n}. A ficha ficou preenchida: mude o que quiser, ou "Gerar outro".` + (res.restam != null ? ` (Restam ${res.restam} pedidos hoje.)` : '') }),
        res.notas && L.id !== 'sobmedida' ? h('p', { class: 'note ia-notas', text: 'Notas para o mestre: ' + res.notas }) : null,
        res.fora.length && L.id !== 'sobmedida' ? h('p', { class: 'note', text: 'O gerador ainda não faz: ' + res.fora.join('; ') + '.' }) : null].filter(Boolean));
    }
    function blocoIA() {
      const ta = h('textarea', { class: 'in', id: 'ger-ia-texto', rows: 5, maxlength: 4000, 'data-enter': 'proprio', placeholder: 'Ex.: uma casa nobre de um andar, com cozinha, dois quartos, sala de jantar, varanda e um quintal grande com piscina. De noite.',
        value: App.opt.iaTexto || '', oninput: e => { App.opt.iaTexto = e.target.value.slice(0, 4000); } });
      const bt = btn(iaOcupada ? 'Pensando…' : 'Montar com a IA', async () => {
        const txt = ta.value.trim();
        if (!txt) { UI.toast('Descreva o lugar primeiro.'); ta.focus(); return; }
        iaOcupada = true; bt.disabled = true; bt.textContent = 'Pensando…'; iaMsg.replaceChildren(h('p', { class: 'note', text: 'A IA está montando a ficha (leva alguns segundos)…' }));
        try { const res = await IaMapa.pedir(txt); if (cv.isConnected) aplicarIA(res); }
        catch (e) { if (cv.isConnected) iaMsg.replaceChildren(h('p', { class: 'note ia-erro', text: (e && e.message) || 'Não deu para falar com a IA agora.' })); }
        finally { iaOcupada = false; if (cv.isConnected) pintar(); }
      }, { icon: 'fx', id: 'ger-ia', disabled: iaOcupada, title: 'A IA lê o texto e preenche a ficha do lugar (você pode mudar tudo depois)' });
      return [ta, h('div', { class: 'row' }, bt), iaMsg];
    }

    /* ---- as escolhas ---- */
    function pintar() {
      const a = document.activeElement, fid = a && a.id && (ctl.contains(a) || abas.contains(a)) ? a.id : null;
      const E = estadoDe(L);
      // (lote 53) a coluna dos lugares, em grupos (cada botão é um .seg-b dentro de #ger-lugar, como era a fileira de abas)
      const naLista = new Set(GRUPOS.flatMap(g => g[1])), sobra = LUGARES.filter(l => !naLista.has(l.id)).map(l => l.id);
      const grupos = GRUPOS.map(([n, ids]) => [n, ids.concat(n === 'Especiais' ? sobra : [])]);
      abas.replaceChildren(...(LUGARES.length > 1 ? [h('div', { class: 'ger-rail seg', role: 'group', id: 'ger-lugar', 'aria-label': 'O lugar' },
        grupos.map(([n, ids]) => { const ls = ids.map(lugar).filter(Boolean); return ls.length ? [h('div', { class: 'ger-rail-t', text: n }),
          ls.map(l => h('button', { type: 'button', class: 'seg-b' + (l.id === L.id ? ' on' : ''), 'aria-pressed': String(l.id === L.id), title: l.n, 'data-lugar': l.id,
            onclick: () => { if (l.id === L.id) return; L = l; lembrarComum(); nomeMexido = false; pintar(); refazer(); } }, glifo(l.id), h('span', { text: l.n })))] : []; }))] : []));
      // (lote 14, parte 14a) o hexágono do Mapa-múndi, no alto: a chave e o que vem dele (na aba que não aceita, o porquê)
      const blocoHex = hexDaAba(L) ? h('div', { class: 'ger-hex', id: 'ger-hex-bloco' },
        K.toggle('ger-hex', comum.comHex, v => { comum.comHex = v; const E2 = estadoDe(L); E2.trava = null; E2.base = null; pintar(); refazer(); }, 'Com o hexágono do Mapa-múndi: os vizinhos nas bordas, o rio e os caminhos pelos lados certos'),
        (n => { n.id = 'ger-hex-txt'; return n; })(note(HexCena.texto(hexPedido, L.biomaDe ? L.biomaDe(E.op) : null))),
        comum.comHex && hexPedido.guerra ? MarcasGuerra.campo(hexPedido.guerra, comum.guerra, K, v => { comum.guerra = v; const E2 = estadoDe(L); E2.base = E2.plano ? L.baseDe(E2.plano) : null; pintar(); refazer(); }) : null)
        : hexPedido && L.aceitaHex ? h('div', { class: 'ger-hex', id: 'ger-hex-bloco' }, (n => { n.id = 'ger-hex-nao'; return n; })(note(L.hexNaoTxt && L.hexNaoTxt(E.op, hexPedido) ? L.hexNaoTxt(E.op, hexPedido) : !HexCena.aceita(hexPedido)
          ? (hexPedido.ter === 'agua' ? 'O hexágono do Mapa-múndi é de água: os vizinhos, o rio e os caminhos dele não entram aqui.' : 'O hexágono do Mapa-múndi não tem terreno: pinte o terreno dele (na aba Terreno do Mapa-múndi) para os vizinhos, o rio e os caminhos entrarem.')
          : 'O hexágono do Mapa-múndi não entra no pântano nem na água: eles cobrem a cena toda.'))) : null;
      const blocoCampo = campoPedido ? Campo.bloco(campoPedido, comum, K, () => pintar()) : null;
      // (lote 53) os blocos que abrem e fecham, cada um com o resumo do que está escolhido
      const bloco = (k, titulo, resumo, ...kids) => {
        const d = h('details', { class: 'ger-bl', id: 'ger-bl-' + k, open: blocoAberto(k) ? true : null },
          h('summary', {}, h('span', { class: 'ger-bl-t', text: titulo }), h('span', { class: 'ger-bl-r', text: resumo })),
          h('div', { class: 'ger-bl-c' }, ...kids.filter(Boolean)));
        d.addEventListener('toggle', () => { App.opt.genAbertos = Object.assign({}, App.opt.genAbertos || {}, { [k]: d.open }); });
        return d;
      };
      const nomeDe = (lista, v, nada) => { const x = lista.find(y => y[0] === v); return x ? x[1] : nada; };
      const resAmb = [nomeDe(Estilos.LISTA, comum.estilo, 'Comum'), L.semHora ? null : (TONES.find(t => t.id === comum.hora) || {}).n, L.semHora ? null : (comum.clima ? nomeDe(WEATHERS, comum.clima, '') : 'sem clima'), L.aceitaEstacao ? nomeDe(Estacoes.LISTA, comum.estacao, '') : null].filter(Boolean).join(' · ').toLowerCase();
      const pv = Povoar.prefs(), mi = Misterio.prefs();
      const casoMi = mi.on && mi.caso ? Misterio.casos().find(x => x.id === mi.caso) : null;
      ctl.replaceChildren(...[
        bloco('ia', 'Descrever com a IA', 'o texto vira o mapa', ...blocoIA()),      // (lote 150)
        bloco('lugar', L.n, '', blocoCampo, blocoHex,
          L.controles(E.op, K, (regerar, o) => { if (o && o.soltar) { E.trava = null; E.base = null; } else E.base = E.plano ? L.baseDe(E.plano) : null; pintar(); if (regerar) refazer(); }, { hex: usaHex(L) })),
        bloco('amb', 'Ambiente', resAmb,
          field('Estilo', seg('ger-est', comum.estilo, Estilos.LISTA.map(([k, n]) => [k, n]), v => { comum.estilo = v; lembrarComum(); const E2 = estadoDe(L); E2.base = E2.plano ? L.baseDe(E2.plano) : null; pintar(); refazer(); }), 'stack'),
          L.semHora ? null : field('Hora do dia', seg('ger-hora', comum.hora, TONES.map(t => [t.id, t.n]), v => { comum.hora = v; lembrarComum(); pintar(); desenhar(); }), 'stack'),
          L.semHora ? null : field('Clima', seg('ger-clima', comum.clima, WEATHERS.map(([k, n]) => [k, n]), v => { comum.clima = v; lembrarComum(); pintar(); }), 'stack'),
          L.aceitaEstacao ? field('Estação', seg('ger-estacao', comum.estacao, Estacoes.LISTA, v => { comum.estacao = v; lembrarComum(); pintar(); refazer(); }), 'stack') : null,
          K.toggle('ger-relevo', comum.relevo, v => { comum.relevo = v; lembrarComum(); pintar(); refazer(); }, L.relevoTxt || 'Com relevo e formas (água, plataformas, torres, bandeirinhas)'),
          temEv(L) ? K.toggle('ger-eventos', comum.comEventos, v => { comum.comEventos = v; pintar(); refazer(); }, textoEventos(evDaAba(L))) : null),
        bloco('pov', 'Povoar', pv.on ? 'perigo ' + nomeDe(Povoar.PERIGOS, pv.perigo, 'médio').toLowerCase() : 'desligado', Povoar.controles(K, () => pintar())),       // (lote 49) povoar o lugar
        Zonas.vale(L) ? bloco('zonas', 'Zonas à mão', Zonas.resumoBloco(L), Zonas.controles(L, K, regerar => { pintar(); if (regerar) refazer(); else { desenhar(); cv.classList.toggle('desenhando', Zonas.ativo()); } })) : null,      // (lote 154)
        Tempo.vale(L) ? bloco('tempo', 'O tempo', Tempo.resumoBloco(), Tempo.controles(K, () => { pintar(); refazer(); })) : null,      // (lote 153) o lugar envelhecido
        Trama.vale(L, E.op) ? bloco('trama', 'A história', Trama.resumoBloco(), Trama.controles(K, () => { pintar(); refazer(); })) : null,      // (lote 152) a história da missão
        bloco('mist', 'Mistério', mi.on ? (casoMi ? casoMi.c.titulo : 'um caso novo') : 'desligado', Misterio.controles(K, () => pintar())),     // (lote 53) o mistério
        // (lote 129) os marcadores de missão, nos povoados
        MissaoCenas.POVOADOS.has(L.id) ? bloco('mq', 'Missões', ({ nada: 'sem marcadores', vazios: 'marcadores vazios', minhas: (n => n + (n === 1 ? ' missão' : ' missões'))(MissaoCenas.prefs().ids.length) })[MissaoCenas.prefs().modo], MissaoCenas.controles(K, () => pintar())) : null].filter(Boolean));
      nota.textContent = L.nota;
      if (fid) { const n = document.getElementById(fid); if (n) n.focus({ preventScroll: true }); }
    }
    pintar(); refazer(); pintarModelos();
    aberta = { get lugar() { return L.id; }, get estado() { return estadoDe(L); }, comum, cell: () => cell };
    // (lote 53) a janela em três colunas: os lugares, a prévia grande (com o nome, a semente e os modelos) e as escolhas
    const body = h('div', { class: 'ger ger2' },
      abas,
      h('div', { class: 'ger-pv ger-centro' }, cv,
        h('div', { class: 'row ger-acoes' }, btOutro, btSoltar, h('span', { class: 'ger-sem' }, inSemente)),
        dica, resumo,
        field('Nome da cena', inNome, 'stack'),
        h('div', { class: 'ger-mds' }, h('span', { class: 'lb', text: 'Modelos' }), md),
        nota),
      h('div', { class: 'ger-op ger-lado' }, ctl));
    UI.modal({
      title: 'Gerar um lugar', xl: true, cls: 'ger-janela', body,
      actions: [{ label: 'Cancelar' }, {
        label: 'Criar a cena', kind: 'primary', keep: true, run: () => {
          const b = UI.kit.card() && UI.kit.card().querySelector('.modal-a .btn.primary');
          if (b) { b.disabled = true; b.textContent = 'Criando…'; }
          const E = estadoDe(L), p = E.plano, l = L;
          l.criar(p, inNome.value, { hora: comum.hora, clima: climaDe(l), relevo: comum.relevo, id: idPedido, op: E.op, o: comEstacao(l, Object.assign(l.opcoesDe(E.op), { estilo: comum.estilo, relevo: comum.relevo })) }).then(async sc => {
            // (lote 153) o tempo primeiro (as portas da história ficam de fora), depois a história
            const tp = Tempo.prefs();
            const txtTp = Tempo.vale(l) && Tempo.liga(tp) ? await Tempo.aplicar(sc, Object.assign({}, tp, { mascara: Tempo.mascaraDe(p), proteger: p.trama ? p.trama.passos.filter(x => x.porta).map(x => x.porta).concat(p.trama.atalho ? [p.trama.atalho.porta] : []) : [] }), p.seed).catch(e => { console.error(e); return ''; }) : '';
            if (usaEv(l) && evDaAba(l).fx.length) cobrirComZonas(sc, evDaAba(l).fx);
            const pv = Povoar.prefs(), txtPov = pv.on ? Povoar.aplicar(sc, l.id, p, pv) : '';      // (lote 49) o lugar povoado
            const mi = Misterio.prefs(), txtMi = mi.on ? Misterio.aplicar(sc, l.id, p, mi) : '';    // (lote 53) o mistério
            const txtTr = p.trama ? Trama.aplicar(sc, p) : '';                                        // (lote 152) a história da missão
            if (txtTr) Persist.scene(sc.id);
            if (txtTp) Persist.scene(sc.id);
            const txtMq = MissaoCenas.aplicar(sc, l.id);                                              // (lote 129) os marcadores de missão
            const conta = campoPedido ? Campo.montar(sc, campoPedido, comum.campoPor) : null;
            UI.closeModal();
            UI.switchScene(sc.id);
            UI.toast(l.feito(sc, p) + (conta ? ' ' + Campo.feitoTxt(campoPedido, conta) : '') + (txtPov ? ' ' + txtPov : '') + (txtMi ? ' ' + txtMi : '') + (txtTp ? ' ' + txtTp : '') + (txtTr ? ' ' + txtTr : '') + (txtMq ? ' ' + txtMq : ''), { long: true });
          }, err => { console.error(err); if (b) { b.disabled = false; b.textContent = 'Criar a cena'; } UI.toast('Não deu para criar a cena: ' + ((err && err.message) || 'falha ao guardar o fundo') + '.'); });
          return false;
        },
      }],
    });
  }
  return { LUGARES, abrir, vivo: () => (aberta && document.getElementById('ger-prev') ? aberta : null) };
})();
