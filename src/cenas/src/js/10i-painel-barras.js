/* ---------------------------------------------------------------
   10i. PAINEL DE BARRAS — a barra especial de classe, raça e linhagem, no canto da cena (lote 44; o guia "Painel de
   barras nas Cenas", versão 2). As barras, os desenhos e as regras estão em tc/barras-painel.js (TC.painelBarras);
   aqui elas encontram os tokens, as fichas, a ordem de turnos e a mesa ao vivo.

   Quem vê:
     · o jogador, o painel do personagem dele (token dele, ligado à ficha dele): aberto no turno dele e moeda fora do
       turno (uma moeda para cada personagem dele que tem barra; tocar abre). Ele pode esconder o painel neste
       aparelho (o olho no cabeçalho; o painel do token dele mostra de novo);
     · o mestre, o painel do NPC (token sem jogador, com ficha ou com a barra que o mestre escolheu): abre sozinho no
       turno do NPC; fora dele, tocar no selo do token (ou "Abrir o painel", no painel do token) abre; o ✕ fecha.
       O mestre não vê o painel dos jogadores: só o selo, em todo token com barra.
   O número de cada barra é o da ficha (o recurso da raça, da classe ou da linhagem: estado.rec) — ou, no NPC sem ficha,
   o de uma barra do token. O resto (a postura, o juramento, as flechas, as pílulas marcadas, o teto da rodada) fica em
   estado.pb da ficha, ou em t.pb no token. O que muda vai para a mesa ao vivo numa linha curta, na voz do personagem.
   Os ganchos de turno (o começo e o fim do turno de cada um) rodam no aparelho de quem passa a vez; o "Encerrar"
   do combate faz o fim de cada barra (com Desfazer). O mestre liga e desliga tudo na aba Turnos (vale para a mesa).
   --------------------------------------------------------------- */
const PainelBarras = (() => {
  const PB = () => (window.TC && window.TC.painelBarras) || null;
  const K = UI.kit;
  const toast = (t, o) => UI.toast(t, o);
  const CHAVE_ESC = 'tinycats:painel-barras:esconder';
  const PRE = 'pb:';                                         // a barra do token que guarda o número de um NPC sem ficha
  const mem = new Map();                                     // chave do ator → { aberto, aba } (só nesta tela)
  const hist = new Map();                                    // chave do ator → os últimos passos, para o Desfazer
  const els = new Map();                                     // chave do ator → o elemento do painel (ou da moeda)
  let host = null, focoNpc = null, ultCur = undefined, selos = new Map(), hits = [];

  /* ---------------- ligado, escondido ---------------- */
  // (o mestre decide pela mesa; o jogador recebe a escolha com a cena que está no ar)
  const ligado = () => {
    if (!PB()) return false;
    if (typeof Nuvem !== 'undefined' && Nuvem.jogador()) { const sc = Store.scene(); return !(sc && sc.pbOff); }
    return Store.S.prefs.painelBarras !== false;
  };
  const escondido = () => { try { return localStorage.getItem(CHAVE_ESC) === '1'; } catch (e) { return false; } };
  const esconder = sim => { try { if (sim) localStorage.setItem(CHAVE_ESC, '1'); else localStorage.removeItem(CHAVE_ESC); } catch (e) { /* sem armazenamento: vale até recarregar */ } };
  let escondidoMem = null;
  const estaEscondido = () => (escondidoMem != null ? escondidoMem : escondido());

  /* ---------------- as barras de um token ---------------- */
  // de jogador: o token de um jogador, ou ligado à ficha de um jogador
  function deJogador(t) {
    if (!t) return false;
    if (t.owner && (t.owner === '*' || playerById(t.owner))) return true;
    const l = t.char && typeof Fichas !== 'undefined' ? Fichas.get(t.char) : null;
    return !!(l && l.dono_id);
  }
  /* As barras do painel de um token: [{ id (da barra no guia), ref (a barra do token: o recurso da ficha, ou
     "pb:<id>"), v, min, max, inicio, guard (o que se guardou: { s, c, u, g }), bencao }]. */
  function barrasDoToken(t) {
    const P0 = PB();
    if (!P0 || !t || t.prop || t.clone) return [];
    if (t.char) {
      if (typeof Fichas === 'undefined' || !Fichas.barrasDeArvore) return [];
      const l = Fichas.get(t.char);
      if (!l || l.ficha == null) return [];
      const est = l.estado || {}, guard = est.pb && typeof est.pb === 'object' ? est.pb : {}, rec = est.rec && typeof est.rec === 'object' ? est.rec : {};
      const arvs = (l.skills && Array.isArray(l.skills.arvores)) ? l.skills.arvores : [];
      const out = [], vistos = new Set();
      let lista = [];
      try { lista = Fichas.barrasDeArvore(t); } catch (e) { lista = []; }
      for (const x of lista) {
        let id = null;
        for (const aid of x.arvs) { id = P0.barraDaArvore(Fichas.arvore(aid) || aid); if (id) break; }
        if (!id || vistos.has(id)) continue;
        vistos.add(id);
        const v = isFinite(Number(rec[x.ref])) && rec[x.ref] !== null ? Number(rec[x.ref]) : x.v;
        out.push({ id, ref: x.ref, v, min: x.min, max: x.max, inicio: x.inicio, guard: guard[id] || null, bencao: arvs.includes(P0.BENCAO_SELENE) });
      }
      return out;
    }
    // o NPC sem ficha: a barra que o mestre escolheu (só nos tokens sem jogador)
    if (!t.pb || typeof t.pb !== 'object' || deJogador(t)) return [];
    const out = [];
    for (const id of Object.keys(t.pb)) {
      const def = P0.BARRA[id], b = (t.bars || []).find(x => x && x.ref === PRE + id);
      if (!def || !b) continue;
      out.push({ id, ref: PRE + id, v: Number(b.v) || 0, min: -barLo(b), max: b.m, inicio: def.inicio, guard: t.pb[id] || null, bencao: false });
    }
    return out;
  }
  /* (lote 55) Os graus do Bornal de Cinza (o nó da Yanato) na ficha do token: cada grau é um laço a mais no cinto de
     poções. O nó é achado pelo nome, na árvore da Yanato da biblioteca da mesa. Sem ficha (o NPC sem ficha), 0. Com a
     ficha ou a árvore ainda chegando, null: fica o que estava guardado (para o cinto não perder laços no caminho). */
  function bornalDe(t) {
    if (!t || !t.char) return 0;
    if (typeof Fichas === 'undefined' || !Fichas.arvore) return null;
    const l = Fichas.get(t.char), a = Fichas.arvore(PB().YANATO);
    const no = a && Array.isArray(a.nodes) ? a.nodes.find(n => n && /^bornal de cinza$/i.test(String(n.nome || '').trim())) : null;
    if (!l || !no) return null;
    const al = l.skills && l.skills.alocados && typeof l.skills.alocados === 'object' ? l.skills.alocados : {};
    return Math.max(0, Math.min(5, Math.floor(Number(al[no.id]) || 0)));
  }
  const chaveDe = t => (t.char ? 'c:' + t.char : 't:' + t.id);
  function atorDe(t) {
    const bs = barrasDoToken(t);
    if (!bs.length) return null;
    const P0 = PB(), chave = chaveDe(t), m = mem.get(chave) || { aberto: false, aba: 0 };
    const barras = bs.map(x => {
      const b = P0.instancia(x.id, x.v, x.guard, { min: x.min, max: x.max });
      b.ref = x.ref; b.inicioFicha = x.inicio;
      if (x.id === 'selene') b.s.bencao = !!x.bencao;        // (a Verdadeira Forma é da Bênção de Selene)
      if (x.id === 'yanato') { const bn = bornalDe(t); if (bn != null) b.s.bornal = bn; }   // (lote 55: cada grau do Bornal de Cinza é um laço a mais no cinto)
      return b;
    });
    const ator = { chave, tok: t.id, char: t.char || null, nome: tokName(t), dono: deJogador(t) ? 'jogador' : 'mestre', barras,
      aba: Math.max(0, Math.min(m.aba || 0, barras.length - 1)), aberto: !!m.aberto, linhas: [],
      rodada: () => (Store.scene() && Store.scene().turn.round) || 1 };
    ator.logar = texto => { ator.linhas.push(texto); };
    return ator;
  }

  /* ---------------- gravar ---------------- */
  const P0g = () => PB().guardar;
  function gravar(ator, rotulo) {
    const t = Store.get('tokens', ator.tok);
    if (!t) return;
    if (ator.char) {
      const rec = {}, pb = {};
      for (const b of ator.barras) { rec[b.ref] = b.v; pb[b.def.id] = P0g()(b); }
      if (!Fichas.gravarPainel(ator.char, rec, pb)) toast('Não deu para gravar: esta ficha não é sua.');
    } else {
      const bars = t.bars.slice(), pb = Object.assign({}, t.pb || {});
      for (const b of ator.barras) {
        const i = bars.findIndex(x => x && x.ref === b.ref);
        if (i >= 0 && bars[i].v !== b.v) bars[i] = barWith(bars[i], { v: b.v });
        pb[b.def.id] = P0g()(b);
      }
      Store.tx(rotulo || 'Painel de barras', () => Store.upd('tokens', t.id, { bars, pb }));
    }
    publicarLinhas(ator, t);
  }
  // as linhas vão para a mesa ao vivo (token escondido, ou sem o nome à mostra: só o mestre vê); fora da mesa, um aviso
  function publicarLinhas(ator, t) {
    const l = ator.linhas.splice(0);
    if (!l.length) return;
    const T = window.TC && window.TC.ponte, naMesa = T && T.estado && T.estado.mesa && typeof T.publicar === 'function';
    for (const texto of l) {
      if (naMesa) { try { T.publicar('cena', { kind: 'uso', titulo: String(texto).slice(0, 120), resumo: '', total: null, char: t.char || null, oculto: !!(t.hidden || t.showName === false), dd: [] }); } catch (e) { /* sem a casca */ } }
    }
    if (!naMesa) toast(l[l.length - 1], { key: 'painel-barras' });
  }

  /* ---------------- desfazer (os últimos toques neste aparelho) ---------------- */
  const foto = ator => ator.barras.map(b => ({ id: b.def.id, v: b.v, g: P0g()(b) }));
  function antesDeMexer(ator) {
    const l = hist.get(ator.chave) || [];
    l.push(foto(ator));
    if (l.length > 12) l.shift();
    hist.set(ator.chave, l);
  }
  function desfazer(ator) {
    const l = hist.get(ator.chave) || [], f = l.pop();
    if (!f) return;
    const P0 = PB();
    for (const x of f) {
      const i = ator.barras.findIndex(b => b.def.id === x.id);
      if (i < 0) continue;
      const b = ator.barras[i], antes = b.v, nb = P0.instancia(x.id, x.v, x.g, { min: b.min, max: b.max });
      nb.ref = b.ref; nb.inicioFicha = b.inicioFicha;
      ator.barras[i] = nb;
      if (antes !== nb.v) ator.logar(`${ator.nome}: ${b.def.barra} volta a ${P0.mostra(nb)} (desfeito).`);
    }
    gravar(ator, 'Painel de barras: desfazer');
  }

  /* ---------------- quem aparece ---------------- */
  // os tokens da cena com barra, e os da vez
  const tokensComBarra = sc => sc.tokens.filter(t => !t.prop && barrasDoToken(t).length);
  const daVez = sc => { const tn = sc.turn; if (!tn || !tn.on) return []; const e = tn.list.find(x => x.id === tn.cur); return e ? turnToks(e) : []; };
  function meus(sc) {
    if (isGM()) return [];
    return sc.tokens.filter(t => ownsTok(t) && t.char && !t.prop && (() => { const l = Fichas.get(t.char); return !!(l && (l.dono_id === App.viewer || (typeof Fichas.eu === 'function' && Fichas.eu() && l.dono_id === Fichas.eu()))); })());
  }
  // a vez mudou: o painel de quem joga agora abre (o do jogador, no aparelho dele; o do NPC, no do mestre)
  function acompanharVez(sc) {
    const tn = sc.turn, cur = tn && tn.on ? tn.cur : null;
    if (cur === ultCur) return;
    const primeira = ultCur === undefined;
    ultCur = cur;
    const vez = daVez(sc);
    if (isGM()) {
      const npc = vez.find(t => !deJogador(t) && barrasDoToken(t).length);
      if (npc) { focoNpc = npc.id; const k = chaveDe(npc); mem.set(k, Object.assign({}, mem.get(k), { aberto: true })); }
      else if (!primeira) focoNpc = null;
      return;
    }
    for (const t of meus(sc)) {
      const k = chaveDe(t), naVez = vez.some(x => x.id === t.id);
      mem.set(k, Object.assign({ aba: 0 }, mem.get(k), { aberto: naVez }));
    }
  }

  /* ---------------- desenhar ---------------- */
  function garantirHost() {
    if (host && host.isConnected) return host;
    const stage = document.getElementById('stage');
    if (!stage) return null;
    host = h('div', { class: 'pb-host', id: 'pbHost' });
    stage.appendChild(host);
    return host;
  }
  function elDe(chave) {
    let el = els.get(chave);
    if (el && el.isConnected) return el;
    el = h('section', { class: 'pb', 'data-ator': chave });
    PB().ligarPainel(el);
    els.set(chave, el);
    return el;
  }
  const assinatura = (ator, o) => JSON.stringify([ator.nome, ator.aberto, ator.aba, ator.barras.map(b => [b.def.id, b.v, b.min, b.max, P0g()(b)]), o.papel, o.desfazer, o.esconder]);
  function opcoes(ator) {
    const gm = isGM();
    return {
      papel: gm ? 'mestre' : 'jogador', desfazer: (hist.get(ator.chave) || []).length > 0, esconder: !gm,
      aoAntes: a => antesDeMexer(a),
      aoMexer: a => { gravar(a); mem.set(a.chave, { aberto: a.aberto, aba: a.aba }); },
      aoDesfazer: a => desfazer(a),
      aoAbrir: a => { mem.set(a.chave, { aberto: true, aba: a.aba }); if (gm) focoNpc = a.tok; },
      aoFechar: a => { a.aberto = false; mem.set(a.chave, { aberto: false, aba: a.aba }); if (gm) { focoNpc = null; render(); } },
      aoEsconder: () => { esconder(true); escondidoMem = true; render(); toast('Painel de barras escondido neste aparelho. Para mostrar de novo: selecione o seu token → Painel de barras.', { long: true, action: 'Mostrar', run: () => { esconder(false); escondidoMem = false; render(); } }); },
      aoDesenhar: () => {}
    };
  }
  function render() {
    const sc = Store.scene();
    calcularSelos(sc);
    const hst = garantirHost();
    if (!hst) return;
    const ativos = [];
    if (sc && ligado()) {
      acompanharVez(sc);
      if (isGM()) {
        const t = focoNpc ? Store.get('tokens', focoNpc) : null;
        const a = t && !deJogador(t) ? atorDe(t) : null;
        if (a) { a.aberto = true; ativos.push(a); } else if (focoNpc && !t) focoNpc = null;
      } else if (!estaEscondido()) {
        for (const t of meus(sc)) { const a = atorDe(t); if (a) ativos.push(a); }
      }
    }
    // o aberto primeiro (embaixo, no canto); as moedas em cima dele
    ativos.sort((a, b) => (a.aberto === b.aberto ? 0 : a.aberto ? 1 : -1));
    const ficam = new Set(), ordem = [];
    for (const a of ativos) {
      const el = elDe(a.chave), o = opcoes(a), ass = assinatura(a, o);
      // (os toques do painel mexem no ator do elemento: um ator novo só entra quando os dados mudaram)
      if (el._ass !== ass || !el.isConnected) { el._ator = a; el._opts = o; el._ass = ass; PB().desenharPainel(el); }
      else el._opts = o;
      ordem.push(el); ficam.add(a.chave);
    }
    for (const [k, el] of els) if (!ficam.has(k)) { el.remove(); els.delete(k); }
    // (só reordena quando a ordem mudou: mexer no elemento tira o foco de quem está nele)
    if (ordem.some((el, i) => hst.children[i] !== el)) for (const el of ordem) hst.appendChild(el);
    hst.hidden = !ativos.length;
    hst.classList.toggle('com-aberto', ativos.some(a => a.aberto));
    // (a base do mapa — os avisos, a faixa do token — encolhe para não ficar embaixo do painel)
    const st = document.getElementById('stage');
    if (st) { st.classList.toggle('pb-on', ativos.length > 0); st.classList.toggle('pb-aberto', ativos.some(a => a.aberto)); if (ativos.length) st.style.setProperty('--pb-w', (hst.offsetWidth + 20) + 'px'); }
  }

  /* ---------------- o selo do mestre (no mapa) ---------------- */
  function calcularSelos(sc) {
    selos = new Map();
    if (!sc || !isGM() || !ligado()) return;
    for (const t of sc.tokens) {
      if (t.prop) continue;
      const a = atorDe(t);
      if (a) selos.set(t.id, { partes: PB().seloDe(a), npc: !deJogador(t), titulo: `${a.nome}: ${a.barras.map(b => b.def.barra + ' ' + PB().mostra(b)).join(', ')}` });
    }
    Render.request();
  }
  const imgs = new Map();
  function imgIcone(id, cor) {
    const k = id + cor;
    let im = imgs.get(k);
    if (im) return im.complete && im.naturalWidth ? im : null;
    im = new Image();
    im.onload = () => Render.request();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(PB().iconeSolto(id, cor, 48));
    imgs.set(k, im);
    return null;
  }
  // desenha o selo do token no canto de cima, à direita (chamado pelo desenho do mapa, só para o mestre)
  function desenharSelo(c, t, sc, px) {
    if (!selos.size) return;
    const sl = selos.get(t.id);
    if (!sl) return;
    const s = t.size * sc.cell;
    if (s / px < 18) return;          // (o token pequeno demais na tela: sem selo)
    // (o tamanho acompanha o do token, entre 13 e 18 pontos na tela, como os outros selos: de longe, ele encolhe e não
    // cobre o vizinho)
    const hh = clamp(s * 0.3, 13 * px, 18 * px), u = hh / 18, ic = 12.5 * u, pad = 5 * u, gap = 3 * u;
    c.save();
    c.font = `800 ${11.5 * u}px ${FONT_UI}`; c.textBaseline = 'middle';
    const larg = sl.partes.map(p => pad + (p.marca ? c.measureText(p.marca).width : ic) + gap + c.measureText(p.n).width + pad);
    const total = larg.reduce((a, b) => a + b, 0);
    const x0 = t.x + s * 0.68, y0 = t.y - hh * 0.55;
    let x = x0;
    sl.partes.forEach((p, i) => {
      const w = larg[i], r = hh / 2, esq = i === 0, dir = i === sl.partes.length - 1;
      c.beginPath();
      c.moveTo(x + (esq ? r : 0), y0); c.lineTo(x + w - (dir ? r : 0), y0);
      if (dir) c.arc(x + w - r, y0 + r, r, -Math.PI / 2, Math.PI / 2); else c.lineTo(x + w, y0 + hh);
      c.lineTo(x + (esq ? r : 0), y0 + hh);
      if (esq) c.arc(x + r, y0 + r, r, Math.PI / 2, Math.PI * 1.5); else c.lineTo(x, y0);
      c.closePath();
      c.fillStyle = '#16191F'; c.fill();
      c.strokeStyle = p.cor; c.lineWidth = 1.5 * u; c.stroke();
      let cx = x + pad;
      if (p.marca) { c.fillStyle = p.cor; c.textAlign = 'left'; c.font = `700 ${12 * u}px ${FONT_UI}`; c.fillText(p.marca, cx, y0 + hh / 2 + 0.5 * u); cx += c.measureText(p.marca).width; c.font = `800 ${11.5 * u}px ${FONT_UI}`; }
      else { const im = imgIcone(p.id, p.cor); if (im) c.drawImage(im, cx, y0 + (hh - ic) / 2, ic, ic); cx += ic; }
      c.fillStyle = '#ECE7DC'; c.textAlign = 'left'; c.fillText(p.n, cx + gap, y0 + hh / 2 + 0.5 * u);
      x += w;
    });
    c.restore();
    hits.push({ tok: t.id, x: x0, y: y0, w: total, h: hh });
  }
  // (o desenho do mapa recomeça os alvos a cada quadro)
  const novoQuadro = () => { hits = []; };
  // o clique no mapa caiu num selo? (do NPC: abre o painel dele; do jogador: diz o que tem)
  function cliqueNoSelo(p) {
    if (!hits.length || !isGM() || !ligado()) return false;
    const hit = hits.slice().reverse().find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    if (!hit) return false;
    const sl = selos.get(hit.tok);
    if (!sl) return false;
    if (sl.npc) abrirNpc(hit.tok);
    else toast(sl.titulo, { key: 'painel-selo' });
    return true;
  }
  function abrirNpc(id) {
    const t = Store.get('tokens', id);
    if (!t || deJogador(t)) return;
    focoNpc = id;
    const k = chaveDe(t);
    mem.set(k, Object.assign({ aba: 0 }, mem.get(k), { aberto: true }));
    render();
    const el = els.get(k); if (el) { const b = el.querySelector('.pb-x[data-a="__recolher"]'); if (b) b.focus({ preventScroll: true }); }
  }

  /* ---------------- turno e fim do combate (no aparelho de quem passa a vez) ---------------- */
  function rodarEm(toks, fn, rotulo) {
    const P0 = PB();
    for (const t of toks) {
      const a = atorDe(t);
      if (!a) continue;
      const antes = JSON.stringify(foto(a));
      fn(P0, a);
      if (JSON.stringify(foto(a)) !== antes || a.linhas.length) gravar(a, rotulo);
    }
  }
  /* antes: { on, round, cur } da ordem antes de passar a vez. O fim do turno de quem jogava e o começo do turno de
     quem joga agora (o teto da rodada zera; cada barra faz o que faz no começo do turno). */
  function depoisDaVez(antes) {
    if (!isGM() || !ligado()) return;
    const sc = Store.scene(), tn = sc.turn;
    if (!tn.on || tn.cur === antes.cur) return;
    if (antes.on && antes.cur) {
      const e = tn.list.find(x => x.id === antes.cur);
      if (e) rodarEm(turnToks(e), (P0, a) => P0.terminarTurno(a), 'Fim do turno: painel de barras');
    }
    rodarEm(daVez(sc), (P0, a) => P0.comecarTurno(a), 'Começo do turno: painel de barras');
  }
  // a tela das barrinhas não abre na vez de quem tem painel (o painel já está lá)
  const temPainel = t => ligado() && barrasDoToken(t).length > 0;
  /* O combate acabou: cada barra faz o fim dela (as classes zeram, as raças voltam ao início, a Fome do Vampiro fica…),
     num aviso com Desfazer. */
  function fimDoCombate(toks) {
    if (!isGM() || !ligado()) return;
    const P0 = PB(), feitos = [];
    for (const t of toks) {
      const a = atorDe(t);
      if (!a) continue;
      feitos.push({ a, f: foto(a) });
      a.barras.forEach(b => P0.fimDoCombate(a, b, b.inicioFicha));
      gravar(a, 'Fim do combate: painel de barras');
    }
    if (!feitos.length) return;
    toast(`Fim do combate no painel de barras: ${feitos.length === 1 ? feitos[0].a.nome : feitos.length + ' personagens'}.`, { key: 'painel-fim', long: true, action: 'Desfazer', run: () => {
      for (const { a, f } of feitos) {
        const t = Store.get('tokens', a.tok); if (!t) continue;
        const b2 = atorDe(t); if (!b2) continue;
        for (const x of f) { const i = b2.barras.findIndex(b => b.def.id === x.id); if (i >= 0) { const nb = P0.instancia(x.id, x.v, x.g, { min: b2.barras[i].min, max: b2.barras[i].max }); nb.ref = b2.barras[i].ref; nb.inicioFicha = b2.barras[i].inicioFicha; b2.barras[i] = nb; } }
        gravar(b2, 'Desfazer o fim do combate');
      }
      render();
    } });
  }
  // as barras que o painel cuida (o "Restaurar energias" não mexe nelas)
  const cuida = (t, b) => ligado() && !!b && barrasDoToken(t).some(x => x.ref === b.ref);
  // (lote 47) é uma barra do painel, ligado ou não (o cadeado "Só à mão" vem trancado nelas)
  const doPainel = (t, b) => !!b && !!b.ref && barrasDoToken(t).some(x => x.ref === b.ref);

  /* ---------------- no painel do token e na aba Turnos ---------------- */
  // o mestre: o que o token tem (e, no NPC sem ficha, a barra escolhida); o jogador: mostrar/esconder o dele
  function secaoToken(t) {
    if (!PB() || !t || t.prop) return null;
    const { sec, field, inSelect, btn, note, toggle } = K;
    const bs = barrasDoToken(t), nomes = bs.map(x => PB().BARRA[x.id].barra).join(', ');
    if (!isGM()) {
      if (!bs.length || !ownsTok(t) || !ligado()) return null;
      return sec('s-pbar', 'Painel de barras', true,
        toggle('pb-mostrar', !estaEscondido(), v => { esconder(!v); escondidoMem = !v; render(); UI.refresh(); }, 'Mostrar o painel neste aparelho'),
        note(`${nomes}: o painel abre no seu turno e vira uma moeda fora dele (toque para abrir).`));
    }
    if (!ligado()) return null;
    const npc = !deJogador(t);
    const filhos = [];
    if (t.char) {
      filhos.push(note(bs.length ? `Da ficha: ${nomes}. ${npc ? 'É um NPC: o painel abre no turno dele, ou pelo botão.' : 'É de um jogador: só ele vê o painel; você vê o selo no token.'}` : 'A ficha não tem árvore de classe, raça ou linhagem com barra no painel.'));
    } else if (npc) {
      const atual = t.pb && typeof t.pb === 'object' ? Object.keys(t.pb)[0] || '' : '';
      const ops = [['', 'Nenhuma']].concat(PB().lista().map(d => [d.id, `${d.arvore} · ${d.barra}${d.npc ? ' (NPC)' : ''}`]));
      filhos.push(field('Barra especial', inSelect('pb-escolher', atual, ops, v => escolherBarra(t, v)), 'stack'),
        note('Um NPC sem ficha: a barra escolhida ganha uma barra no token (o número) e o painel com as regras dela.'));
    } else return null;
    if (bs.length && npc) filhos.push(h('div', { class: 'row' }, btn('Abrir o painel', () => abrirNpc(t.id), { icon: 'sliders', id: 'pb-abrir' })));
    return sec('s-pbar', 'Painel de barras', bs.length > 0 || !t.char, ...filhos);
  }
  // o mestre escolhe a barra do NPC sem ficha: uma barra no token (o número) e o estado do painel
  function escolherBarra(t, id) {
    const P0 = PB(), t0 = Store.get('tokens', t.id); if (!t0) return;
    const antes = t0.pb && typeof t0.pb === 'object' ? Object.keys(t0.pb) : [];
    let bars = (t0.bars || []).filter(b => !(b && typeof b.ref === 'string' && b.ref.startsWith(PRE) && b.ref !== PRE + id));
    const pb = {};
    if (id && P0.BARRA[id]) {
      const d = P0.BARRA[id];
      if (!bars.some(b => b && b.ref === PRE + id)) bars = bars.concat([cleanBar({ n: d.barra, c: d.cor, v: d.inicio, m: d.max, k: 'bar', on: true, vis: '', ref: PRE + id, lo: d.min < 0 ? -d.min : 0, st: d.inicio })]);
      pb[id] = (t0.pb && t0.pb[id]) || P0.guardar(P0.instancia(id, d.inicio));
    }
    Store.tx(id ? 'Barra especial do NPC' : 'Tirar a barra especial', () => Store.upd('tokens', t0.id, { bars, pb: id ? pb : null }));
    toast(id ? `${tokName(t0)}: ${P0.BARRA[id].barra} (${P0.BARRA[id].arvore}). O painel abre no turno dele.` : (antes.length ? `${tokName(t0)} ficou sem barra especial.` : 'Nada mudou.'), { action: 'Desfazer', run: Tools.undo });
  }
  // a aba Turnos (do mestre): o interruptor da mesa
  function secaoTurnos() {
    if (!PB() || !isGM()) return null;
    const { sec, toggle, note } = K, on = Store.S.prefs.painelBarras !== false;
    return sec('t-painel', 'Painel de barras', true,
      toggle('pb-ligado', on, v => {
        Store.S.prefs.painelBarras = v ? true : false; Persist.meta({ pub: true });
        if (!v) focoNpc = null;
        render(); UI.refresh();
        toast(v ? 'Painel de barras ligado para a mesa: os jogadores veem o deles; você, os NPCs e os selos.' : 'Painel de barras desligado para a mesa.', { key: 'painel-ligado' });
      }, 'Ligado (vale para a mesa toda)'),
      note(on ? 'Cada personagem com barra de classe, raça ou linhagem tem um painel: o jogador vê o dele no turno dele; você vê o dos NPCs e um selo em cada token com barra. Desligado, nada disso aparece.' : 'Desligado: sem painéis, sem selos, e a passagem de turno não mexe nas barras.'));
  }

  // as Cenas avisam quando mudam (o desenho geral e o mapa)
  return { render, ligado, desenharSelo, novoQuadro, cliqueNoSelo, depoisDaVez, fimDoCombate, temPainel, cuida, doPainel, secaoToken, secaoTurnos, abrirNpc,
    // para os testes
    _atorDe: atorDe, _barrasDoToken: barrasDoToken, _selos: () => selos, _hits: () => hits };
})();
