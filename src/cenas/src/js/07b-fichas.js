/* ---------------------------------------------------------------
   7b. FICHAS — o token ligado à ficha do personagem
   Só existe dentro do site, com uma mesa aberta (a ponte entrega os personagens da mesa).
   O token aponta para um personagem (t.char). A ficha manda: cada recurso dela (HP, SP…) vira uma
   barra do token, com o máximo calculado pelas fórmulas e o valor atual (e a sobrevida) anotados na ficha;
   o bônus de iniciativa vem da fórmula de iniciativa da ficha, quando ela tem uma; e a imagem do
   personagem vira a imagem do token (a não ser que o mestre escolha outra para este token).
   Na volta, mexer numa dessas barras no mapa (dano, cura, área, reaplicar, desfazer) grava o valor
   atual na ficha. Também dá para rolar um atributo da ficha direto do token, com a regra da fixa.
   A barra leva da ficha, além do máximo, o piso (até quanto abaixo de zero ela pode ir) e o começo
   (onde ela nasce; a cura total a leva para lá). E as bolsas da ficha (poções, bombas, runas, munições,
   materiais) podem ser usadas daqui: pelo mestre, em qualquer token ligado, e pelo jogador, no token do
   personagem dele — quem usa grava direto na ficha, e a ficha acerta o token.
   Os ferimentos abertos do personagem (marcados na ficha, no quadro "Corpo") aparecem no token como um sinal,
   e em lista no painel dele — para quem recebe a ficha: o mestre, todas; o jogador, a dele e as abertas a todos.
   A penalidade de um ferimento conta nas contas da ficha como um bônus temporário.
   --------------------------------------------------------------- */
const Fichas = (() => {
  let P = null, D = null, on = false, applying = false, papel = null, eu = null;
  const R = () => window.TC.rules;
  const ROLAVEIS = ['FOR', 'DES', 'VIT', 'CAN', 'AGI', 'ESQ', 'FUR', 'PER', 'EMB', 'DFF', 'DFM', 'BLQ'];
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const cfg = () => { const d = D && D.pegar('fichas:cfg'); return (d && d.dados && d.dados.v) || R().cfgPadrao(); };
  const get = id => (P && id ? P.pegar(id) : null);
  /* As fichas da mesa, por nome. Numa mesa com campanhas, "campanha em evidência": primeiro as da campanha em vista,
     depois as do mundo (sem campanha) e por fim as das outras campanhas — estas duas com o lugar de onde são no rótulo. */
  const vista = () => { const T = window.TC && window.TC.ponte, c = T && T.estado && T.estado.campanha; return c ? c.id : null; };
  const campDa = l => (l && l.campanha) || null;
  const pesoDa = l => { const v = vista(), c = campDa(l); return !v || c === v ? 0 : !c ? 1 : 2; };
  const chars = () => (P ? P.todas().slice().sort((a, b) => (pesoDa(a) - pesoDa(b)) || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')) : []);
  const nomeDaCampanha = id => { const T = window.TC && window.TC.ponte, c = T && T.estado && (T.estado.campanhas || []).find(x => x.id === id); return c ? c.nome : 'outra campanha'; };
  // o nome da ficha onde se escolhe uma: as de fora da campanha em vista dizem de onde são
  const rotulo = l => (l.nome || 'Sem nome') + (pesoDa(l) === 1 ? ' — do mundo' : pesoDa(l) === 2 ? ' — ' + nomeDaCampanha(campDa(l)) : '');
  const pcDe = l => Object.assign({}, l.ficha || {}, { id: l.id, nome: l.nome });
  // a imagem do personagem, quando está guardada no banco (endereço https)
  const imagemDe = l => (l && l.ficha && typeof l.ficha.img === 'string' && /^https:\/\//.test(l.ficha.img) ? l.ficha.img : null);
  // bônus dos nódulos escolhidos na árvore (a biblioteca da mesa, para quem mestra a aba Árvore; para os outros, o
  // pacote publicado — o mestre auxiliar pode mestrar as Cenas sem a Árvore, e aí a biblioteca não chega a ele)
  const mestraArvore = () => { const T = window.TC && window.TC.ponte; return T && typeof T.mestra === 'function' ? T.mestra('arvore') : papel === 'mestre'; };
  const bib = () => { const d = D && D.pegar(mestraArvore() ? 'arvore:biblioteca' : 'arvore:pacote'); return d && d.dados && Array.isArray(d.dados.arvores) ? d.dados : null; };
  // (os bônus temporários — comida, poção — moram no estado do personagem e contam como um equipamento)
  const extra = l => ({ arvore: R().bonusDaArvore(l.skills, bib()), temp: l.estado && l.estado.tmp, fer: l.estado && l.estado.fer });
  const resumo = l => R().resumo(pcDe(l), cfg(), extra(l), l.estado || {});

  // O piso da barra (quanto ela pode ficar negativa) e o começo dela, como a ficha manda.
  const pisoDe = rec => (rec.min < 0 ? Math.round(-rec.min * 10) / 10 : 0);
  const comecoDe = rec => (rec.inicio != null && isFinite(rec.inicio) && rec.inicio !== rec.max ? rec.inicio : null);
  /* As barras especiais da ficha (os antigos "poderes divinos": cargas, usos…) também vão para o token, em bolinhas.
     Cada uma vira um "recurso" a mais, com id "pd:<id>" — só as que têm limite (sem limite não há barra para desenhar).
     O valor de agora delas mora no estado da ficha (estado.pd), e é para lá que o token devolve. */
  const PD = 'pd:';
  const ehPd = ref => typeof ref === 'string' && ref.startsWith(PD);
  function especiaisDe(l) {
    const R0 = R();
    if (!R0 || typeof R0.especiais !== 'function') return [];
    return R0.especiais(l.ficha || {}, l.estado || {}).filter(x => x.max > 0).map(x => ({ id: PD + x.id, nome: x.nome, max: x.max, min: 0, inicio: null, atual: x.atual, sobre: 0, pts: true }));
  }
  // os recursos da ficha que viram barra no token: os de sempre (com máximo) e, depois deles, as barras especiais
  const recursosDoToken = (l, r) => r.recursos.filter(rec => rec.max != null && isFinite(rec.max)).concat(especiaisDe(l));
  // As barras do token, atualizadas pela ficha. Devolve null se nada muda.
  function barrasDe(t, r, l) {
    const bars = t.bars.map(b => Object.assign({}, b));
    let mudou = false;
    const lista = recursosDoToken(l, r);
    for (const rec of lista) {
      let b = bars.find(x => x.ref === rec.id) || bars.find(x => !x.ref && norm(x.n) === norm(rec.nome));
      if (!b) {
        if (bars.length >= MAX_BARS) continue;
        b = cleanBar({ n: rec.nome, c: BAR_COLORS[bars.length % BAR_COLORS.length], v: rec.atual, m: rec.max, k: rec.pts ? 'pts' : 'bar', on: true, vis: '' });
        bars.push(b); mudou = true;
      }
      const nome = String(rec.nome || 'Barra').slice(0, 24);
      if (b.ref !== rec.id) { b.ref = rec.id; mudou = true; }
      if (b.n !== nome) { b.n = nome; mudou = true; }
      if (b.m !== rec.max) { b.m = rec.max; mudou = true; }
      if (b.v !== rec.atual) { b.v = rec.atual; mudou = true; }
      const sx = Math.max(0, Number(rec.sobre) || 0);
      if (barX(b) !== sx) { if (sx > 0) b.x = sx; else delete b.x; mudou = true; }
      const lo = pisoDe(rec), st = comecoDe(rec);
      if (barLo(b) !== lo) { if (lo > 0) b.lo = lo; else delete b.lo; mudou = true; }
      if ((b.st == null ? null : b.st) !== st) { if (st == null) delete b.st; else b.st = st; mudou = true; }
    }
    for (const b of bars) if (b.ref && !lista.some(x => x.id === b.ref)) { delete b.ref; mudou = true; }   // recurso saiu da ficha: vira barra comum
    return mudou ? bars : null;
  }
  /* As barras de um token que segue uma ficha são as da ficha, na ordem dela: cada recurso com máximo vira uma barra
     ligada, à mostra. Uma barra que o token já tinha do mesmo recurso — ou com o mesmo nome — empresta o jeito dela
     (cor, estilo, quem vê); as outras saem (a "Vida" de fábrica, por exemplo). Devolve null se a ficha não tem
     recurso nenhum: aí o token fica como está. */
  function soDaFicha(t, r, l) {
    const out = [];
    for (const rec of recursosDoToken(l, r)) {
      if (out.length >= MAX_BARS) continue;
      const velha = t.bars.find(x => x.ref === rec.id) || t.bars.find(x => !x.ref && norm(x.n) === norm(rec.nome));
      out.push(cleanBar(Object.assign({ c: BAR_COLORS[out.length % BAR_COLORS.length], k: rec.pts ? 'pts' : 'bar' }, velha,
        { n: String(rec.nome || 'Barra').slice(0, 24), v: rec.atual, m: rec.max, on: true, ref: rec.id, x: Math.max(0, Number(rec.sobre) || 0), lo: pisoDe(rec), st: comecoDe(rec) })));
    }
    return out.length ? out : null;
  }
  // A ficha inteira deste token, se ela está aqui (uma linha que chegou incompleta não serve para acertar nada).
  const fichaDe = t => { const l = get(t.char); return l && l.ficha != null ? l : null; };
  // O token ligado tem barras que não são da ficha, ou falta alguma dela?
  function foraDaFicha(t) {
    const l = fichaDe(t), alvo = l ? soDaFicha(t, resumo(l), l) : null;
    return !!alvo && (alvo.length !== t.bars.length || !t.bars.every(b => b.ref && alvo.some(a => a.ref === b.ref)));
  }
  // Deixa o token só com as barras da ficha (um passo de desfazer).
  function usarBarras(t) {
    const l = fichaDe(t), bars = l ? soDaFicha(t, resumo(l), l) : null;
    if (!bars) return false;
    Store.tx('Barras da ficha', () => Store.upd('tokens', t.id, { bars }));
    return true;
  }
  // O que a ficha muda no token (barras, iniciativa, imagem); null se nada.
  function remendo(t) {
    const l = fichaDe(t);
    if (!l) return null;
    const r = resumo(l), p = {};
    const bars = barrasDe(t, r, l);
    if (bars) p.bars = bars;
    if (String((l.ficha && l.ficha.ini) || '').trim() !== '' && clampIni(r.ini) !== t.ini) p.ini = clampIni(r.ini);
    // a fadiga (a pilha de 5 a 0), quando a ficha usa: vai para o token, e todos a veem (até quem não tem a ficha)
    const fd = fadigaDe(l);
    if ((t.fad == null ? null : t.fad) !== fd) p.fad = fd;
    // a imagem da ficha vai para o token (imgChar marca que a imagem dele é a da ficha; uma escolhida à mão fica)
    const url = imagemDe(l);
    if (url) {
      const a = Assets.register(url, 0, 0, 'token', l.nome || '');
      if (t.img !== a.id && (!t.img || t.imgChar)) { p.img = a.id; p.imgChar = true; }
      else if (t.img === a.id && !t.imgChar) p.imgChar = true;
    } else if (t.imgChar) { p.img = null; p.imgChar = false; }
    return Object.keys(p).length ? p : null;
  }
  const falta = t => !!remendo(t);
  // ficha → token (não entra no desfazer: quem manda é a ficha). `cena`: o id da cena do token (a aberta, se não vier).
  function syncToken(t, cena) {
    const p = remendo(t);
    if (!p) return false;
    /* O mestre com o site aberto em mais de um aparelho: a cena que está no ar é acertada pelo aparelho que
       transmite. Este acompanha (e assume, se depois de alguns segundos ainda faltar: ver Nuvem.cobrar). */
    if (Nuvem.segue(cena || Store.S.current)) { Nuvem.cobrar(); return false; }
    applying = true;
    try { Store.remoteIn(cena || Store.S.current, [{ t: 'upd', c: 'tokens', id: t.id, p }]); } finally { applying = false; }
    return true;
  }
  /* Acerta pela ficha os tokens ligados (de um personagem, ou de todos): os da cena aberta e, numa mesa, também os
     da cena que está no ar — os jogadores veem a barra mudar mesmo com o mestre preparando outra cena. */
  function syncAll(charId) {
    if (!on) return;
    let n = 0;
    const cenas = [Store.scene()], ar = Nuvem.noAr();
    if (ar && ar !== Store.S.current && Store.S.scenes[ar]) cenas.push(Store.S.scenes[ar]);
    for (const sc of cenas) for (const t of sc.tokens.slice()) if (t.char && (!charId || t.char === charId) && syncToken(t, sc.id)) n++;
    return n;
  }
  /* Quem mestra as Cenas recebe todas as fichas da mesa? O mestre, sim. O mestre auxiliar, só com a aba Fichas: sem
     ela, as fichas escondidas dos jogadores não chegam a ele — mas os tokens ligados a elas estão na cena. */
  const vejoTodas = () => { const T = window.TC && window.TC.ponte; return papel === 'mestre' && (!T || typeof T.mestra !== 'function' || T.mestra('fichas')); };
  // a ficha deste token existe mas não chega a quem está olhando (e não "saiu da mesa")
  const escondida = t => !!t && !!t.char && papel === 'mestre' && !vejoTodas() && !get(t.char);
  /* token → ficha "às cegas", para a ficha que não chega a este aparelho: só o valor atual e a sobrevida das barras
     ligadas, por um caminho próprio do banco. Sem isso, o dano dado aqui seria desfeito quando o aparelho do mestre
     acertasse o token pela ficha. Junta o que muda num instante (arrastar uma barra gera muitas mudanças). */
  const cegas = new Map();
  function mandarCegas(id) {
    const e = cegas.get(id); if (!e) return;
    clearTimeout(e.t); cegas.delete(id);
    const T = window.TC && window.TC.ponte;
    if (T && typeof T.barrasDaFicha === 'function') T.barrasDaFicha(id, e.rec, e.sob, Object.keys(e.pd).length ? e.pd : null);
  }
  function paraFichaAsCegas(t) {
    const T = window.TC && window.TC.ponte;
    if (!escondida(t) || !T || typeof T.barrasDaFicha !== 'function') return false;
    const e = cegas.get(t.char) || { rec: {}, sob: {}, pd: {}, t: 0 };
    let n = 0;
    for (const b of t.bars) {
      if (!b.ref) continue;
      if (ehPd(b.ref)) { if (isFinite(b.v)) { e.pd[b.ref.slice(PD.length)] = Math.max(0, Math.round(b.v)); n++; } continue; }    // (barra especial: sem sobrevida)
      if (isFinite(b.v)) { e.rec[b.ref] = b.v; n++; }
      const x = barX(b); e.sob[b.ref] = x > 0 ? x : null;
    }
    if (!n) return false;
    clearTimeout(e.t); e.t = setTimeout(() => mandarCegas(t.char), 400);
    cegas.set(t.char, e);
    return true;
  }
  // token → ficha: o valor atual (e a sobrevida) das barras ligadas. Serve para um token de qualquer cena da mesa.
  function paraFicha(t) {
    if (!on || !t || !t.char) return false;
    const l = get(t.char);
    if (!l) { paraFichaAsCegas(t); return false; }          // (a ficha não está aqui: se é das escondidas, as barras vão às cegas)
    const rec = Object.assign({}, (l.estado && l.estado.rec) || {}), sob = Object.assign({}, (l.estado && l.estado.sob) || {});
    const pdAgora = {}; for (const x of especiaisDe(l)) pdAgora[x.id] = x.atual;
    let mudou = false, pd = null;
    for (const b of t.bars) {
      if (!b.ref) continue;
      if (ehPd(b.ref)) {                     // barra especial: o valor vai para estado.pd (sem sobrevida nem piso)
        const v = Math.max(0, Math.round(Number(b.v) || 0));
        if (isFinite(b.v) && b.ref in pdAgora && pdAgora[b.ref] !== v) { pd = pd || Object.assign({}, (l.estado && l.estado.pd) || {}); pd[b.ref.slice(PD.length)] = v; mudou = true; }
        continue;
      }
      if (isFinite(b.v) && rec[b.ref] !== b.v) { rec[b.ref] = b.v; mudou = true; }
      const x = barX(b);
      if ((Number(sob[b.ref]) || 0) !== x) { if (x > 0) sob[b.ref] = x; else delete sob[b.ref]; mudou = true; }
    }
    if (!mudou) return false;
    P.gravar(t.char, { estado: Object.assign({}, l.estado || {}, { rec, sob }, pd ? { pd } : {}) });
    return true;
  }
  function onLive(op) {
    if (!on || applying || op.t !== 'upd' || op.c !== 'tokens' || !op.p || !op.p.bars) return;
    const t = Store.get('tokens', op.id);
    if (t && paraFicha(t)) syncAll(t.char);            // outro token do mesmo personagem nesta cena acompanha
  }
  /* Liga (ou desliga) o token a uma ficha. Ligado, o token passa a ter o nome do personagem e só as barras da ficha;
     e, se ele não tinha dono e a ficha é de um jogador da mesa, o jogador passa a ser o dono do token. Tudo no mesmo
     passo de desfazer (desfazer traz de volta o nome e as barras de antes). Devolve { dono } com o nome dele, se foi
     o caso. */
  function link(t, charId) {
    if (!charId) {
      // desligado, o token fica com o que tinha: as barras viram barras comuns e a imagem passa a ser dele
      Store.tx('Desligar da ficha', () => Store.upd('tokens', t.id, { char: null, imgChar: false, fad: null, bars: t.bars.map(b => { const o = Object.assign({}, b); delete o.ref; return o; }) }));
      return {};
    }
    const l = get(charId), jog = l && l.dono_id && !t.owner ? playerById(l.dono_id) : null;
    const p = { char: charId };
    if (jog) p.owner = jog.id;
    if (l && l.ficha != null) {
      const nome = String(l.nome || '').trim().slice(0, 60), bars = soDaFicha(t, resumo(l), l);
      if (nome) p.name = nome;
      if (bars) p.bars = bars;
    }
    Store.tx('Ligar à ficha', () => Store.upd('tokens', t.id, p));
    const now = Store.get('tokens', t.id);
    if (now) syncToken(now);
    return { dono: jog ? jog.name : null };
  }
  /* Abre a ficha do personagem deste token, na aba Fichas do site (dois cliques no token). Só quando a ficha está ao
     alcance de quem clicou: o mestre vê todas; o jogador, a dele e as que o mestre deixou à mostra. */
  function abrir(t) {
    const T = window.TC;
    if (!t || !t.char || !get(t.char) || !T || !T.ponte || !T.ponte.ir) return false;
    return !!T.ponte.ir('fichas', { pc: t.char });
  }
  // O que dá para rolar pela ficha deste token: [chave, nome, valor]
  function rolaveis(t) {
    const l = get(t.char);
    if (!l) return [];
    const pc = pcDe(l), c = R().calcular(pc, cfg(), extra(l)), fonte = (pc.rol && pc.rol.fonte) || 'total';
    return ROLAVEIS.map(k => [k, R().NOMES[k] || k, Math.max(0, Math.round(R().valorDoAtributo(c, k, fonte) || 0))]);
  }
  /* Os números que o token mostra ao lado do nome (Força, Canalização Mágica, Defesa Física, Defesa Mágica, Esquiva),
     da ficha, com tudo o que soma — os mesmos valores da janelinha F. O mapa pede isto a cada quadro: a conta fica
     guardada para a linha da ficha (uma ficha que muda chega como linha nova) enquanto as regras da mesa não mudam. */
  const NUMEROS = ['FOR', 'CAN', 'DFF', 'DFM', 'ESQ'];
  const numGuardados = new WeakMap();
  function numeros(t) {
    const l = t && t.char ? get(t.char) : null;
    if (!l || l.ficha == null || !R()) return null;
    const cf = cfg(), bi = bib(), g = numGuardados.get(l);
    if (g && g.cf === cf && g.bi === bi) return g.v;
    let v = null;
    try {
      const pc = pcDe(l), c = R().calcular(pc, cf, extra(l)), fonte = (pc.rol && pc.rol.fonte) || 'total';
      v = {};
      for (const k of NUMEROS) v[k] = Math.round(Number(R().valorDoAtributo(c, k, fonte)) || 0);
    } catch (e) { v = null; }
    numGuardados.set(l, { cf, bi, v });
    return v;
  }
  /* Sanidade e Conforto da ficha deste token (de 0 a 100), quando a ficha usa os dois — como na ficha: a de um
     jogador da mesa, ou a que já tem algum dos dois anotado. No mapa, só o mestre vê. */
  const valorMente = (v, padrao) => (v != null && v !== '' && isFinite(+v) ? clamp(Math.round(+v), 0, 100) : padrao);
  function mente(t) {
    const l = t && t.char ? fichaDe(t) : null;
    if (!l) return null;
    const e = l.estado || {};
    if (e.san == null && e.conf == null && !deJogador(l)) return null;
    return { san: valorMente(e.san, 100), conf: valorMente(e.conf, 50) };
  }
  // O mestre muda a Sanidade ou o Conforto pelo token: grava direto na ficha. Devolve o valor de antes (ou null).
  function mudarMente(t, k, v) {
    const l = t && t.char ? fichaDe(t) : null, antes = mente(t);
    if (!l || !antes || !P || papel !== 'mestre' || (k !== 'san' && k !== 'conf')) return null;
    const novo = valorMente(v, antes[k]);
    if (novo === antes[k]) return null;
    P.gravar(t.char, { estado: Object.assign({}, l.estado || {}, { [k]: novo }) });
    return antes[k];
  }
  /* A fadiga da ficha deste token: { v (de 0 a 5), nome ("Cansado"…) } ou null (a ficha não usa, ou não está aqui).
     Muda pelo token o mestre e o dono do personagem: grava direto na ficha. Devolve o valor de antes (ou null). */
  function fadiga(t) {
    const v = fadigaDe(t && t.char ? fichaDe(t) : null);
    return v == null ? null : { v, nome: (R().FADIGA || [])[v] || '' };
  }
  function mudarFadiga(t, v) {
    const l = t && t.char ? fichaDe(t) : null, antes = fadigaDe(l);
    if (!l || antes == null || !P || !(papel === 'mestre' || (!!eu && l.dono_id === eu))) return null;
    const n = Math.round(Number(v));
    if (!isFinite(n)) return null;
    const novo = clamp(n, 0, 5);
    if (novo === antes) return null;
    P.gravar(t.char, { estado: R().mudarFadiga(l.estado || {}, novo) });
    syncAll(t.char);                    // (a mudança feita daqui não volta como "mudança de fora": o token acompanha já)
    return antes;
  }
  /* ---- os equipamentos da ficha deste token (lote 6: a janelinha E) ----
     Quem mexe: o mestre, em qualquer token ligado; o jogador, no token do personagem dele (a ficha é dele). */
  function podeEquipar(t) {
    const l = t && t.char ? get(t.char) : null;
    return !!l && l.ficha != null && !!R() && typeof R().equiparItem === 'function' && (papel === 'mestre' ? on : !!eu && l.dono_id === eu);
  }
  // → [{ id, nome, on, troca, reliquia, bon: [{ rot, v }] }]: só o que cada item soma (como os cartões da ficha)
  function itens(t) {
    const l = t && t.char ? get(t.char) : null, R0 = R();
    if (!l || !l.ficha || !Array.isArray(l.ficha.itens) || !R0) return [];
    const rotDe = k => { const d = (R0.DEFESAS || []).find(x => x.k === k); return (d && d.rot) || k; };
    const recs = Array.isArray(l.ficha.recursos) ? l.ficha.recursos : [];
    return l.ficha.itens.filter(it => it && it.id != null).map(it => {
      const bon = [], b = it.bonus || {}, rec = it.rec && typeof it.rec === 'object' ? it.rec : {}, def = it.def && typeof it.def === 'object' ? it.def : {};
      for (const k of R0.CHAVES_BONUS || []) { const v = +b[k] || 0; if (v) bon.push({ rot: rotDe(k), v }); }
      for (const r of recs) { const v = +rec[r.id] || 0; if (v) bon.push({ rot: String(r.nome || 'Barra'), v }); }
      for (const d of R0.DEFESAS_ESP || []) { const v = +def[d.k] || 0; if (v) bon.push({ rot: 'Def. ' + d.nome, v }); }
      return { id: String(it.id), nome: String(it.nome || '').trim() || 'Item sem nome', on: it.equipado !== false, troca: R0.grupoDeTroca ? R0.grupoDeTroca(it) : '', reliquia: !!it.reliquia, bon };
    });
  }
  /* Equipar (onOff = true) ou guardar um item da ficha deste token — dos itens do mesmo grupo de troca, um só fica
     equipado (TC.rules.equiparItem). Grava na ficha, e o token acompanha na hora (as barras podem mudar com o item).
     → { ok: true, item, guardados: [nomes], desfazer() } ou { ok: false, error } */
  function equipar(t, id, onOff) {
    if (!podeEquipar(t)) return { ok: false, error: papel === 'mestre' ? 'A ficha deste token não está aqui.' : 'Você mexe nos equipamentos do seu personagem.' };
    const charId = t.char, l = get(charId), antes = l.ficha, lista = Array.isArray(antes.itens) ? antes.itens : [];
    const r = R().equiparItem(lista, id, onOff), it = r.itens.find(x => x && x.id === id);
    if (!it) return { ok: false, error: 'Este item não está mais na ficha.' };
    P.gravar(charId, { ficha: Object.assign({}, antes, { itens: r.itens }) });
    syncAll(charId);
    const eqAntes = new Map(lista.filter(x => x && x.id != null).map(x => [x.id, x.equipado]));
    const nomes = r.guardados.map(g => { const x = lista.find(y => y && y.id === g); return (x && String(x.nome || '').trim()) || 'item sem nome'; });
    return { ok: true, item: String(it.nome || '').trim() || 'Item', guardados: nomes, desfazer: () => {
      const agora = get(charId);
      if (!agora || !agora.ficha || !Array.isArray(agora.ficha.itens)) return false;
      // (só a chave de equipado de cada item volta como estava; o resto da ficha fica como está agora)
      const itens2 = agora.ficha.itens.map(x => {
        if (!x || !eqAntes.has(x.id)) return x;
        const y = Object.assign({}, x), v = eqAntes.get(x.id);
        if (v === undefined) delete y.equipado; else y.equipado = v;
        return y;
      });
      P.gravar(charId, { ficha: Object.assign({}, agora.ficha, { itens: itens2 }) });
      syncAll(charId);
      return true;
    } };
  }
  const fixaPadrao = t => { const l = get(t.char); return l && l.ficha && l.ficha.rol ? Math.max(0, Math.round(+l.ficha.rol.fixa || 0)) : 0; };
  /* Rola um atributo da ficha com a regra da fixa: um dado de (atributo − fixa) lados, mais a fixa. `mais`: os bônus só
     desta rolagem — { atr: soma no atributo antes de rolar (muda o dado), res: soma no resultado }. */
  function rolar(t, chave, fixa, mais) {
    const item = rolaveis(t).find(x => x[0] === chave);
    if (!item) return { ok: false, error: 'Este token não está ligado a uma ficha.' };
    const valor = item[2], ma = Math.round(Number(mais && mais.atr) || 0), com = valor + ma;
    if (com < 1) return { ok: false, error: item[1] + ' está em ' + Math.max(0, com) + (ma ? ' (com o bônus)' : '') + ': não há o que rolar.' };
    const r = window.TC.dice.rollFixaMais(valor, fixa, mais);
    if (!r.ok) return r;
    if (Ext.roll) { try { Ext.roll({ kind: 'atributo', name: t.name, tokenId: t.id, attr: chave, attrNome: item[1], atributo: r.atributo, fixa: r.fixa, d: r.dieValue, total: r.total, base: r.base, ma: r.ma, mr: r.mr }); } catch (e) { console.error(e); } }
    return Object.assign({ nome: item[1] }, r);
  }

  /* Quem pode rolar pela ficha deste token: o mestre, em qualquer token ligado; o jogador, no token do personagem
     que é dele (a ficha chega a ele pela mesa, e a rolagem sai no nome dele). */
  function podeRolar(t) {
    const l = t && t.char ? get(t.char) : null;
    return !!l && l.ficha != null && !!R() && (papel === 'mestre' ? on : !!eu && l.dono_id === eu);
  }
  /* As defesas da ficha deste token, pela chave: as duas gerais (DFF, DFM) e as 13 específicas (FOGO, CORTE…), já com
     equipamentos, árvore, bônus temporários e ferimentos. null se o token não tem ficha aqui. */
  function defesas(t) {
    const l = t && t.char ? fichaDe(t) : null;
    if (!l) return null;
    const r = resumo(l), out = {};
    for (const k in r.def) out[k] = Math.round(Number(r.def[k]) || 0);
    for (const k in r.defEsp) out[k] = Math.round(Number(r.defEsp[k]) || 0);
    return out;
  }
  // O jogador da mesa que é dono desta ficha (ou null: ficha do mestre, de NPC, ou de alguém que saiu da mesa).
  const donoDe = l => (l && l.dono_id ? playerById(l.dono_id) || null : null);
  /* O pet de um personagem (lote 6: ficha.petDe) é uma ficha suplementar: o jogador que controla o dono controla o pet,
     mas ele não liga sozinho o que a ficha de jogador liga (Sanidade e Conforto, fadiga) — como a ficha de um NPC. */
  const ehPet = l => !!(l && l.ficha && l.ficha.petDe);
  const deJogador = l => !!donoDe(l) && !ehPet(l);
  /* A fadiga da ficha (de 0 a 5; 5 é descansado), quando ela usa — como na ficha: a de um jogador da mesa, ou a que já
     tem a fadiga anotada. null se não usa. */
  const fadigaDe = l => (l && R() && typeof R().usaFadiga === 'function' && R().usaFadiga(l.estado, deJogador(l)) ? R().fadiga(l.estado) : null);
  const donoDoToken = t => donoDe(t && t.char ? get(t.char) : null);
  // …e quem joga com ele agora: o dono, a não ser que seja o mestre auxiliar e esteja mestrando (aí quem mestra rola por ele)
  const donoQueJoga = t => { const p = donoDoToken(t); return p && !p.gm ? p : null; };
  /* Um token novo para um personagem da mesa, já ligado à ficha: nome, barras, iniciativa e dono (se a ficha é de
     um jogador). Não entra na cena aqui: quem chama é que o inclui (e depois acerta a imagem, com syncToken). */
  function novoToken(sc, charId, x, y, extra) {
    const l = get(charId);
    if (!l || l.ficha == null) return null;
    const jog = donoDe(l), r = resumo(l);
    const t = newToken(sc, x, y, Object.assign({ name: String(l.nome || 'Sem nome').trim().slice(0, 60) || 'Sem nome', char: charId, owner: jog ? jog.id : null }, extra || {}));
    if (t.owner) t.barVis = 'num';
    const bars = soDaFicha(t, r, l);
    if (bars) t.bars = bars;
    if (String((l.ficha && l.ficha.ini) || '').trim() !== '') t.ini = clampIni(r.ini);
    return t;
  }

  const semTotal = s => String(s || '').replace(/^[-−]?\d+ · /, '');
  // avisa a mesa ao vivo (a casca decide como mostrar); token oculto ou sem nome à mostra: só o mestre vê
  function avisarUso(t, charId, titulo, resumo, total, dd, oculto) {
    try { window.TC.ponte.publicar('cena', { kind: 'uso', titulo, resumo, total: total == null ? null : total, char: charId, oculto: oculto != null ? !!oculto : !!(t && (t.hidden || t.showName === false)), dd: dd || [] }); } catch (e) { /* sem a casca não há mesa */ }
  }
  /* ---- usar um item da bolsa: em quem tem, ou em outro token (lote 5) ----
     Quem recebe pode ser o próprio token (ou outro do mesmo personagem), um token ligado a uma ficha que está aqui (as
     barras são achadas pelo nome, na ficha dele) ou um token sem ficha (aí as barras dele mesmo fazem papel de ficha:
     "b0", "b1"…). As condições da poção vão para o token de quem recebe. */
  function fichaDasBarras(t) {
    const rec = {}, sob = {};
    t.bars.forEach((b, i) => { rec['b' + i] = b.v; if (barX(b) > 0) sob['b' + i] = barX(b); });
    return { pc: { id: 'tok:' + t.id, nome: t.name, recursos: t.bars.map((b, i) => ({ id: 'b' + i, nome: b.n })), poderes: [] },
      calc: { recursos: t.bars.map((b, i) => ({ id: 'b' + i, max: b.m, min: -barLo(b), inicio: b.st != null ? b.st : null })) },
      estado: { rec, sob }, nome: tokName(t), barras: true };
  }
  function quemRecebe(charId, alvo) {
    if (alvo.char && alvo.char === charId) return { mesmo: true, nome: tokName(alvo) };
    const la = alvo.char ? fichaDe(alvo) : null;
    if (la) { const pc = pcDe(la); return { pc, calc: R().calcular(pc, cfg(), extra(la)), estado: la.estado || {}, nome: la.nome || tokName(alvo), l: la }; }
    return fichaDasBarras(alvo);
  }
  // os valores de quem recebe ficam de fora do que a mesa lê quando quem recebe não é personagem de quem usa
  const semValoresPara = (charId, alvo, q) => !q.mesmo && !(q.l && (papel === 'mestre' || q.l.dono_id === eu));
  // os efeitos que rolam dados: um total por efeito, na ordem (null nos que não rolam) e o que cada dado sorteou
  function rolarEfeitos(it) {
    const rolados = [], contas = [], dd = [];
    for (const e of it.fx) {
      const ef = (e.k === 'barra' || e.k === 'sob') && e.rec ? R().lerEfeito(e.val) : null;
      if (!ef || !ef.dados) { rolados.push(null); continue; }
      const r = window.TC.dice.rollExpr(ef.dados);
      if (!r.ok) return { erro: r.error };
      rolados.push(r.total); contas.push(semTotal(window.TC.dice.summary({ mode: 'dados', expr: r.expr, terms: r.terms, total: r.total })) + ' = ' + r.total);
      if (window.TC.dice.diceOf) dd.push(...window.TC.dice.diceOf(r));       // o que cada dado sorteou (para o auditor da mesa)
    }
    return { rolados, contas, dd };
  }
  /* O mesmo uso, no aparelho do mestre: confere o pedido do jogador antes de aplicar — a ficha é dele, o item existe e
     ainda tem, o token de quem recebe está à vista, e cada dado rolado cabe no efeito ("2d6+3" dá de 5 a 15). */
  function conferirRolados(it, rolados) {
    if (!Array.isArray(rolados) || rolados.length !== it.fx.length) return false;
    return it.fx.every((e, i) => {
      const ef = (e.k === 'barra' || e.k === 'sob') && e.rec ? R().lerEfeito(e.val) : null;
      if (!ef || !ef.dados) return rolados[i] == null;
      const f = R().faixaDoEfeito(ef.dados), v = rolados[i];
      return !!f && typeof v === 'number' && Number.isInteger(v) && v >= f[0] && v <= f[1];
    });
  }
  // as condições da poção, no token: entram as que ele não tem; com rodadas, a duração conta (d), como as outras
  function condsNoToken(alvo, conds) {
    const p = {};
    let cs = alvo.conds, info = null;
    for (const c of conds) {
      if (!COND_BY_ID[c.c]) continue;
      if (!cs.includes(c.c)) cs = cs.concat(c.c);
      if (c.r > 0) { info = info || Object.assign({}, alvo.cinfo); info[c.c] = Object.assign({}, info[c.c], { d: c.r, d0: c.r }); }
    }
    if (cs !== alvo.conds) p.conds = cs;
    if (info) p.cinfo = info;
    return p;
  }
  // as barras do token sem ficha, como ficaram depois do uso
  function barrasDepois(alvo, u) {
    const ea = u.estadoAlvo || {};
    let mudou = false;
    const bars = alvo.bars.map((b, i) => {
      const k = 'b' + i, o = Object.assign({}, b);
      if (ea.rec && ea.rec[k] != null && ea.rec[k] !== b.v) { o.v = ea.rec[k]; mudou = true; }
      const x = ea.sob && ea.sob[k] > 0 ? ea.sob[k] : 0;
      if (x !== barX(b)) { if (x > 0) o.x = x; else delete o.x; mudou = true; }
      return o;
    });
    return mudou ? bars : null;
  }
  /* Usa um item da bolsa do personagem `charId` no token `alvo` (o do próprio personagem, ou outro), com os dados já
     rolados. Grava na ficha de quem usa (a bolsa), na de quem recebe (se ela está aqui) e no token (as barras de um
     token sem ficha, as condições). Só no aparelho do mestre. opt.cena: a cena do token (a aberta, se não vier);
     opt.pedido: é o pedido de um jogador (o token muda como mudança de fora, sem entrar no desfazer do mestre).
     → { ok:false, error } | { ok:true, u, q, texto, desfazer } */
  function aplicarUso(charId, itemId, alvo, rolados, opt) {
    opt = opt || {};
    const l = get(charId);
    if (!l || l.ficha == null) return { ok: false, error: 'A ficha de quem usa não está aqui.' };
    const pc = pcDe(l), antes = l.estado || {}, calc = R().calcular(pc, cfg(), extra(l));
    const q = quemRecebe(charId, alvo), antesAlvo = q.l ? (q.l.estado || {}) : null;
    const u = R().usarItem(pc, calc, antes, itemId, rolados, Date.now(), uid('t'), q.mesmo ? null : q);
    if (!u.ok) return { ok: false, error: u.erro };
    // (num token sem ficha não há onde guardar um bônus: ele fica de fora, e o texto diz)
    if (q.barras && u.efeitos.some(e => e.k === 'bonus')) { u.efeitos = u.efeitos.filter(e => e.k !== 'bonus'); u.semBonus = true; }
    // as fichas
    P.gravar(charId, { estado: u.estado });
    if (q.l) P.gravar(alvo.char, { estado: u.estadoAlvo });
    // o token de quem recebe: as barras (sem ficha) e as condições
    const patch = Object.assign({}, condsNoToken(alvo, u.conds)), bars = q.barras ? barrasDepois(alvo, u) : null;
    if (bars) patch.bars = bars;
    const tokAntes = { bars: alvo.bars, conds: alvo.conds, cinfo: alvo.cinfo };
    const cena = opt.cena || Store.S.current, nomeIt = u.item.nome || ((R().BOLSAS.find(b => b.t === u.item.t) || {}).um || 'Item');
    if (Object.keys(patch).length) {
      if (opt.pedido) { applying = true; try { Store.remoteIn(cena, [{ t: 'upd', c: 'tokens', id: alvo.id, p: patch }]); } finally { applying = false; } }
      else Store.tx('Usar ' + nomeIt, () => Store.upd('tokens', alvo.id, patch));
      if (bars && alvo.char) { const tk = (Store.S.scenes[cena] || Store.scene()).tokens.find(x => x.id === alvo.id); if (tk) paraFichaAsCegas(tk); }   // (token de ficha escondida: vai às cegas)
    }
    if (on) { syncAll(charId); if (q.l) syncAll(alvo.char); }
    const desfazer = () => {
      // só o que este uso mexeu volta (o que mudou no personagem nesse meio-tempo, por outro caminho, fica)
      const voltar = (id, a, mesmo) => {
        const agora = get(id); if (!agora) return;
        const e = Object.assign({}, agora.estado || {}), rec = Object.assign({}, e.rec || {}), sob = Object.assign({}, e.sob || {}), tmp = Object.assign({}, e.tmp || {}), qtd = Object.assign({}, e.qtd || {});
        let pd = Object.assign({}, e.pd || {});
        if (id === charId) qtd[u.item.id] = Math.max(0, Math.floor(Number(qtd[u.item.id]) || 0)) + 1;
        if (mesmo) for (const f of u.efeitos) {
          if (f.k === 'barra' && f.tipo === 'rec') { const tinha = a.rec && a.rec[f.id] != null; if (Number(rec[f.id]) === f.para) { if (tinha) rec[f.id] = a.rec[f.id]; else delete rec[f.id]; } else if (rec[f.id] != null) rec[f.id] = Math.round((Number(rec[f.id]) - (f.para - f.de)) * 10) / 10; }
          else if (f.k === 'barra' && f.tipo === 'pd') pd[f.id] = f.de;
          else if (f.k === 'sob') { if (a.sob && a.sob[f.id] != null) sob[f.id] = a.sob[f.id]; else delete sob[f.id]; }
          else if (f.k === 'bonus') delete tmp[f.id];
        }
        P.gravar(id, { estado: Object.assign(e, { qtd, rec, sob, tmp, pd }) });
      };
      voltar(charId, antes, q.mesmo);
      if (q.l) voltar(alvo.char, antesAlvo, true);
      if (Object.keys(patch).length && !opt.pedido) { const tk = Store.get('tokens', alvo.id); if (tk) Store.tx('Desfazer ' + nomeIt, () => Store.upd('tokens', alvo.id, { bars: bars ? tokAntes.bars : tk.bars, conds: tokAntes.conds, cinfo: tokAntes.cinfo })); }
      if (on) { syncAll(charId); if (q.l) syncAll(alvo.char); }
      return true;
    };
    return { ok: true, u, q, nome: nomeIt, desfazer };
  }

  /* ---- as bolsas do personagem, usadas pelo token ----
     Quem pode: o mestre, em qualquer token ligado a uma ficha; o jogador, no token do personagem que é dele. */
  function podeBolsa(t) {
    const l = t && t.char ? get(t.char) : null;
    return !!l && l.ficha != null && !ehPet(l) && !!R() && !!R().bolsa && (papel === 'mestre' ? on : !!eu && l.dono_id === eu);      // (o pet não tem bolsa)
  }
  // → os itens da bolsa (com a quantidade) ou null se este token não dá acesso a uma
  function bolsa(t) {
    if (!podeBolsa(t)) return null;
    const l = get(t.char);
    return R().bolsa(pcDe(l), l.estado || {});
  }
  // o que usar o item vai fazer, em palavras (lista vazia: só gasta uma unidade). `alvo`: o token de quem recebe.
  function previaUso(t, id, alvo) {
    if (!podeBolsa(t)) return [];
    const l = get(t.char), pc = pcDe(l), est = l.estado || {};
    const it = R().bolsa(pc, est).find(x => x.id === id);
    if (!it) return [];
    const q = alvo ? quemRecebe(t.char, alvo) : { mesmo: true };
    // num token sem ficha, os bônus não valem (não há ficha onde guardá-los): ficam fora da prévia, com o aviso
    const semBonus = q.barras && it.fx.some(e => e.k === 'bonus' && e.bk && e.bv), it2 = q.barras ? Object.assign({}, it, { fx: it.fx.filter(e => e.k !== 'bonus') }) : it;
    const p = R().previaDoUso(pc, R().calcular(pc, cfg(), extra(l)), est, it2, q.mesmo ? null : q, { semValores: alvo ? semValoresPara(t.char, alvo, q) : false });
    if (semBonus) p.push('o bônus não vale num token sem ficha');
    return p;
  }
  /* ---- os ferimentos do personagem do token ---- */
  const feridasDaLinha = l => (l && l.estado && l.estado.fer && R() && R().ferimentos ? l.estado.fer : null);
  // a lista (do mais antigo para o mais novo); vazia se o token não tem ficha, ou se quem olha não a recebe
  function feridas(t) { const f = feridasDaLinha(t && t.char ? get(t.char) : null); return f ? R().ferimentos(f).lista : []; }
  // os membros amputados (os marcados; a parte de baixo que foi junto não repete): [{ p, nome, n }]
  function amputados(t) {
    const l = t && t.char ? get(t.char) : null;
    if (!l || !l.estado || !l.estado.amp || !R() || typeof R().amputados !== 'function') return [];
    const a = R().amputados(l.estado);
    return R().PARTES.filter(p => a[p.k] && !a[p.k].de).map(p => ({ p: p.k, nome: p.nome, n: a[p.k].n }));
  }
  // o sinal do token: { n, grave, sangra, inf } ou null. (Guardado por linha: o desenho do mapa pede isto a cada quadro.)
  const sinais = new WeakMap();
  function ferido(t) {
    const l = t && t.char ? get(t.char) : null, f = feridasDaLinha(l);
    if (!f) return null;
    let s = sinais.get(l);
    if (!s) { s = R().sinalDeFerido(f); sinais.set(l, s); }
    return s.n ? s : null;
  }
  /* Usa um item da bolsa do personagem do token `t`: em quem tem (sem `alvo`) ou no token `alvo`. Rola os dados de cada
     efeito, aplica (o mestre, aqui mesmo; o jogador pede ao mestre, que aplica — a não ser que seja nele mesmo, sem
     condição: aí grava direto na ficha dele) e avisa a mesa. → { ok:false, error } | { ok:true, texto, desfazer?, pedido? } */
  function usar(t, id, alvo) {
    if (!podeBolsa(t)) return { ok: false, error: 'Este token não dá acesso a uma bolsa.' };
    const charId = t.char, l = get(charId), pc = pcDe(l), antes = l.estado || {};
    const it = R().bolsa(pc, antes).find(x => x.id === id);
    if (!it) return { ok: false, error: 'Este item não está mais na bolsa.' };
    if (it.qtd < 1) return { ok: false, error: 'Não há mais ' + (it.nome || 'deste item') + ' na bolsa.' };
    const tk = alvo || t, ro = rolarEfeitos(it);
    if (ro.erro) return { ok: false, error: ro.erro };
    const tipo = (R().BOLSAS.find(b => b.t === it.t) || {}).um || 'Item', nome = it.nome || tipo;
    const q = quemRecebe(charId, tk), sv = semValoresPara(charId, tk, q), em = q.mesmo ? '' : ' em ' + tokName(tk);
    const titulo = (l.nome || t.name || '?') + ' · ' + nome + em, oculto = !!(t.hidden || t.showName === false || tk.hidden || tk.showName === false);
    const total = it.fx.find(e => e.k === 'barra' && R().lerEfeito(e.val) && R().lerEfeito(e.val).dados) ? ro.rolados.find(x => x != null) : null;
    // o jogador: no próprio personagem e sem condição, grava direto na ficha dele; senão, o mestre aplica (pedido)
    if (papel !== 'mestre') {
      if (!(q.mesmo && !it.fx.some(e => e.k === 'cond' && e.c))) {
        if (!Nuvem.usarItem || !Nuvem.usarItem({ t: 'item', de: charId, item: it.id, alvo: tk.id, rol: ro.rolados })) return { ok: false, error: 'Para usar a bolsa em outro token, a cena precisa estar no ar.' };
        const p = previaUso(t, it.id, tk);
        // (o texto vai já, com o que foi rolado; o mestre aplica em seguida)
        const conta = ro.contas.length ? ' · ' + ro.contas.join(' · ') : '';
        avisarUso(t, charId, titulo, 'usou ' + nome + em + conta + ' · ' + p.map(x => x.replace(/, rolad[oa] na hora/, '')).join(' · '), total, ro.dd, oculto);
        return { ok: true, texto: nome + em + ': pedido ao mestre (aplica em seguida)', pedido: true };
      }
      const u = R().usarItem(pc, R().calcular(pc, cfg(), extra(l)), antes, id, ro.rolados, Date.now(), uid('t'));
      if (!u.ok) return { ok: false, error: u.erro };
      P.gravar(charId, { estado: u.estado });
      const texto = R().textoDoUso(u);
      avisarUso(t, charId, titulo, 'usou ' + nome + (ro.contas.length ? ' · ' + ro.contas.join(' · ') : '') + ' · ' + texto, total, ro.dd, oculto);
      return { ok: true, texto: nome + ': ' + texto, desfazer: () => {
        const agora = get(charId); if (!agora) return false;
        const e = Object.assign({}, agora.estado || {}), qtd = Object.assign({}, e.qtd || {}), rec = Object.assign({}, e.rec || {}), sob = Object.assign({}, e.sob || {}), tmp = Object.assign({}, e.tmp || {}), pd = Object.assign({}, e.pd || {});
        qtd[it.id] = Math.max(0, Math.floor(Number(qtd[it.id]) || 0)) + 1;
        for (const f of u.efeitos) {
          if (f.k === 'barra' && f.tipo === 'rec') { const tinha = antes.rec && antes.rec[f.id] != null; if (Number(rec[f.id]) === f.para) { if (tinha) rec[f.id] = antes.rec[f.id]; else delete rec[f.id]; } else if (rec[f.id] != null) rec[f.id] = Math.round((Number(rec[f.id]) - (f.para - f.de)) * 10) / 10; }
          else if (f.k === 'barra' && f.tipo === 'pd') pd[f.id] = f.de;
          else if (f.k === 'sob') { if (antes.sob && antes.sob[f.id] != null) sob[f.id] = antes.sob[f.id]; else delete sob[f.id]; }
          else if (f.k === 'bonus') delete tmp[f.id];
        }
        P.gravar(charId, { estado: Object.assign(e, { qtd, rec, sob, tmp, pd }) });
        avisarUso(t, charId, titulo, 'desfeito: ' + nome + ' voltou para a bolsa' + (u.efeitos.length ? ' e o efeito saiu' : ''), null, null, oculto);
        return true;
      } };
    }
    const r = aplicarUso(charId, id, tk, ro.rolados);
    if (!r.ok) return r;
    const texto = R().textoDoUso(r.u, { semValores: sv }) + (r.u.semBonus ? ' · o bônus não vale num token sem ficha' : '');
    avisarUso(t, charId, titulo, 'usou ' + nome + em + (ro.contas.length ? ' · ' + ro.contas.join(' · ') : '') + ' · ' + texto, total, ro.dd, oculto);
    return { ok: true, texto: nome + em + ': ' + R().textoDoUso(r.u), desfazer: () => {
      if (!r.desfazer()) return false;
      avisarUso(t, charId, titulo, 'desfeito: ' + nome + ' voltou para a bolsa' + (r.u.efeitos.length || r.u.conds.length ? ' e o efeito saiu' : ''), null, null, oculto);
      return true;
    } };
  }
  /* O pedido de um jogador (no aparelho do mestre que transmite): usar um item da bolsa do personagem dele num token
     da cena no ar. Confere tudo antes de aplicar; o que não confere é ignorado. */
  function usoPedido(quem, op, sc) {
    if (!on || !R() || !op || typeof op.de !== 'string' || typeof op.item !== 'string' || typeof op.alvo !== 'string') return false;
    const l = get(op.de);
    if (!l || l.ficha == null || l.dono_id !== quem) return false;                      // só a bolsa dos personagens dele
    const it = R().bolsa(pcDe(l), l.estado || {}).find(x => x.id === op.item);
    if (!it || it.qtd < 1 || !conferirRolados(it, op.rol)) return false;
    const alvo = sc.tokens.find(x => x.id === op.alvo);
    if (!alvo || alvo.hidden || alvo.prop) return false;                                // só um token que ele vê
    const r = aplicarUso(op.de, op.item, alvo, op.rol, { pedido: true, cena: sc.id });
    return !!r.ok;
  }

  async function start(refresh) {
    const T = window.TC;
    if (!T || !T.ponte || !T.dados || !T.rules || !T.dice) return false;
    const st = await T.ponte.pronta;
    if (!T.dados.disponivel()) return false;
    papel = st.papel; eu = st.eu || null;
    /* Só o mestre liga token a ficha. O jogador consulta as fichas que pode ver (para abrir a dele pelo token) e usa
       a bolsa do personagem dele: para isso lê também as tabelas da mesa (as contas da ficha precisam delas). */
    if (st.papel !== 'mestre') {
      try { const p = T.dados.col('personagens'); await p.pronta; P = p; } catch (e) { P = null; }
      try { const d = T.dados.col('documentos'); await d.pronta; D = d; } catch (e) { D = null; }
      if (P) P.aoMudar(() => refresh());
      return false;
    }
    try {
      P = T.dados.col('personagens'); D = T.dados.col('documentos');
      await Promise.all([P.pronta, D.pronta]);
    } catch (e) { console.error(e); return false; }
    on = true;
    Store.on('live', onLive);
    Store.on('scene', () => syncAll());
    P.aoMudar(l => { if (!l.apagado) syncAll(l.id); refresh(); });
    D.aoMudar(l => { if (l.id === 'fichas:cfg' || l.id === 'arvore:biblioteca' || l.id === 'arvore:pacote') { syncAll(); refresh(); } });
    syncAll();
    refresh();
    return true;
  }
  return { start, on: () => on, chars, get, link, abrir, syncAll, syncToken, paraFicha, falta, foraDaFicha, usarBarras, rolaveis, fixaPadrao, rolar, imagemDe, podeBolsa, bolsa, previaUso, usar, usoPedido, feridas, ferido, amputados,
    podeRolar, defesas, donoDe, donoDoToken, donoQueJoga, novoToken, numeros, mente, mudarMente, fadiga, mudarFadiga, podeEquipar, itens, equipar, papel: () => papel, eu: () => eu, vejoTodas, escondida,
    rotulo, campDa, vista, nomeDaCampanha,
    // o que ainda esperava para ir "às cegas" vai agora (a página está fechando)
    flush() { for (const id of [...cegas.keys()]) mandarCegas(id); } };
})();
