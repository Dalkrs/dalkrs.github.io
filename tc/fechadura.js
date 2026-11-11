/* Tiny Cats · a fechadura (lote 120): o puzzle de abrir com gazuas, no Escudo do mestre (tela de puzzles).
   O mestre cria um handout do tipo puzzle, escolhe "Fechadura" e entrega a um jogador. Cinco níveis (Fácil, Médio,
   Difícil, Extremo, Absoluto) e dois jeitos, à escolha ou por sorteio:
     · Girar  — gira a gazua procurando o ponto certo e força o cilindro; fora do ponto ele trava, a gazua treme e quebra.
     · Pinos  — cada pino sobe e desce num ritmo; empurra e trava no alto. Travar fora da hora faz barulho e pode quebrar
                a gazua; nos níveis altos, derruba os pinos já travados.
   O mestre escolhe o atributo que ajuda (o valor vem da ficha de quem joga: alarga o ponto certo e a janela dos pinos),
   quantas gazuas a pessoa tem e as consequências: a gazua quebra, o tempo limite, o barulho (passando do limite, o
   mestre é avisado) e a fechadura emperra (erros demais e ela trava de vez).
   O jogo corre na tela de quem abre; o banco só recebe o que conta (o começo, cada gazua quebrada e cada barulho, o
   fim). Abrir: a prova é o segredo da fechadura (vai embaralhado com o sal, como nos outros puzzles).
   Os outros jogadores só veem o resultado (a Mesa ao vivo). */
(() => {
  'use strict';
  const W = typeof window !== 'undefined' ? window : globalThis;
  const E = (W.TC && W.TC.escudo) || (typeof require === 'function' ? require('./escudo.js') : null);
  if (!E) return;
  const X = E.mais || (typeof require === 'function' ? require('./escudo-puzzles.js') : null);
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const NIVEIS = Object.freeze([['facil', 'Fácil'], ['medio', 'Médio'], ['dificil', 'Difícil'], ['extremo', 'Extremo'], ['absoluto', 'Absoluto']]);
  const nivDe = k => Math.max(0, NIVEIS.findIndex(n => n[0] === k));
  const ESTILOS = Object.freeze([['sorteio', 'Sorteio'], ['girar', 'Girar a gazua'], ['pinos', 'Pinos']]);
  const ATRS = Object.freeze([['', 'Nenhum'], ['DES', 'Destreza'], ['AGI', 'Agilidade'], ['FUR', 'Furtividade'], ['PER', 'Percepção'], ['FOR', 'Força'], ['VIT', 'Vitalidade'], ['CAN', 'Canalização'], ['ESQ', 'Esquiva']]);
  const CONS = Object.freeze([['quebra', 'A gazua quebra'], ['tempo', 'Tempo limite'], ['barulho', 'Barulho e alarme'], ['emperra', 'A fechadura emperra']]);
  // por nível: Fácil … Absoluto
  const T = Object.freeze({
    zona: [16, 11, 7, 4, 2.2],                 // girar: meia largura do ponto certo (graus)
    perto: [40, 34, 28, 22, 18],               // girar: além do ponto, até onde o cilindro ainda gira um pouco
    forca: [1500, 1150, 900, 650, 450],        // girar: quanto tempo a gazua aguenta forçada (ms)
    pinos: [3, 4, 5, 6, 7],
    janela: [0.3, 0.22, 0.16, 0.11, 0.07],     // pinos: a fração do ciclo, no alto, em que dá para travar
    ritmo: [[1400, 1900], [1100, 1700], [900, 1500], [700, 1300], [550, 1100]],
    chanceQuebra: [0.25, 0.3, 0.4, 0.5, 0.6],  // pinos: errar quebra a gazua
    derruba: [0, 0, 0.35, 0.6, 1],             // pinos: errar derruba os pinos já travados
    gazuas: [6, 5, 4, 3, 3],
    tempo: [120, 100, 80, 60, 45],             // segundos
    barulho: [6, 5, 4, 3, 2],                  // o alarme toca ao chegar a este barulho
    emperra: [12, 10, 8, 6, 4],                // erros até emperrar
  });
  const PADRAO_CONS = Object.freeze({ quebra: true, tempo: false, barulho: true, emperra: false });
  // o atributo alarga o ponto certo e a janela: 1 + valor/100 (até o dobro)
  const ajuda = v => 1 + clamp(Number(v) || 0, 0, 100) / 100;

  function normDef(p, o) {
    o.nivel = NIVEIS.some(n => n[0] === p.nivel) ? p.nivel : 'medio';
    o.dif = ['facil', 'medio'].includes(o.nivel) ? o.nivel : 'dificil';       // (a dificuldade de sempre acompanha o nível)
    o.estilo = ESTILOS.some(n => n[0] === p.estilo) ? p.estilo : 'sorteio';
    o.atr = ATRS.some(n => n[0] === p.atr) ? p.atr : 'DES';
    const n = nivDe(o.nivel);
    o.gazuas = Number.isInteger(p.gazuas) && p.gazuas >= 1 && p.gazuas <= 30 ? p.gazuas : T.gazuas[n];
    const c = ehObj(p.cons) ? p.cons : PADRAO_CONS;
    o.cons = {}; for (const [k] of CONS) o.cons[k] = c[k] === true;
    delete o.tempo;                                                            // (o tempo da fechadura é o dela)
  }
  function montar(def, r, ctx) {
    const n = nivDe(def.nivel), estilo = def.estilo === 'girar' || def.estilo === 'pinos' ? def.estilo : (r() < 0.5 ? 'girar' : 'pinos');
    const segredo = Math.floor(r() * 1e9).toString(36) + Math.floor(r() * 1e9).toString(36);
    const cons = Object.assign({}, def.cons);
    const sec = { s: segredo };
    if (estilo === 'girar') sec.c = Math.round((r() * 150 - 75) * 10) / 10;
    else { const [a, b] = T.ritmo[n]; sec.v = Array.from({ length: T.pinos[n] }, () => Math.round(a + r() * (b - a))); }
    const pub = { estilo, nivel: def.nivel, n, atr: def.atr, gazuas: def.gazuas, cons,
      tempo: cons.tempo ? T.tempo[n] : 0, barulho: cons.barulho ? T.barulho[n] : 0, emperra: cons.emperra ? T.emperra[n] : 0,
      x: X.cobrir(sec, ctx.sal) };
    if (estilo === 'pinos') pub.pinos = T.pinos[n];
    return { pub, estado: {}, provaCerta: segredo, seg: sec };
  }
  const segredoDe = jg => (X.descobrir(jg.pub.x, jg.sal) || {});
  const prova = (jg, t) => (t === 'fim' ? segredoDe(jg).s || null : null);
  const intE = (v, a) => (Number.isInteger(v) && v >= 0 ? v : a || 0);
  // o resumo da tentativa: { quebradas, barulho, erros, falhou, alarme, aberta, restam }
  function situacao(jg) {
    const e = jg.estado || {}, p = jg.pub;
    const q = intE(e.q), b = intE(e.b), er = intE(e.e);
    return { quebradas: q, barulho: b, erros: er, falhou: typeof e.falhou === 'string' ? e.falhou : null, alarme: e.alarme === 1, aberta: !!jg.resolvido,
      restam: p.cons && p.cons.quebra ? Math.max(0, p.gazuas - q) : null, t0: Date.parse(e.t0) || null };
  }
  const MOTIVO = { gazuas: 'As gazuas acabaram.', tempo: 'O tempo acabou.', emperrou: 'A fechadura emperrou de vez.' };
  // as mudanças de um erro (gazua quebrada ou não, barulho) e se ele encerra a tentativa
  function erro(jg, quebrou, barulho) {
    const p = jg.pub, s = situacao(jg), m = { e: s.erros + 1 };
    if (quebrou && p.cons.quebra) m.q = s.quebradas + 1;
    if (p.cons.barulho) { m.b = s.barulho + (barulho || 1); if (!s.alarme && m.b >= p.barulho) m.alarme = 1; }
    if (p.cons.quebra && m.q >= p.gazuas) m.falhou = 'gazuas';
    else if (p.cons.emperra && m.e >= p.emperra) m.falhou = 'emperrou';
    return m;
  }

  E.registrar('fechadura', { nome: 'Fechadura', grupo: 'Fechaduras', erra: true,
    desc: 'Abrir uma fechadura com gazuas: girar no ponto certo, ou travar os pinos no alto. Cinco níveis, do Fácil ao Absoluto.',
    normDef, montar, prova, dica: null,
    resposta: (m) => {
      const s = m.seg || {}, p = m.pub;
      return (p.estilo === 'girar' ? 'girar a ' + Math.round(s.c) + '° (do centro; para a direita é positivo)' : 'travar os ' + p.pinos + ' pinos no alto') + ' · ' + NIVEIS[p.n][1];
    } });
  const api = { NIVEIS, ESTILOS, ATRS, CONS, T, PADRAO_CONS, ajuda, nivDe, situacao, erro, segredoDe, MOTIVO };
  E.fechadura = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  /* ============================== a tela ============================== */
  const PUI = W.TC && W.TC.pistasUI, U = W.TC && W.TC.dom;
  if (!PUI || !PUI.registrarCorpo || !U || typeof document === 'undefined') return;
  const { h } = U;
  const NS = 'http://www.w3.org/2000/svg';
  const sv = (tag, a) => { const el = document.createElementNS(NS, tag); for (const k in a || {}) el.setAttribute(k, a[k]); return el; };
  const vivos = new Map();          // a tentativa em andamento, por chave: sobrevive às repinturas da página

  /* O valor do atributo de quem joga: a ficha dele (a primeira que é dele). No teste do mestre, o número do teste. */
  function valorDoAtributo(atr, ctx, st) {
    if (!atr) return { v: 0, de: null };
    if (ctx.mestre || ctx.soVer) return { v: st.teste || 0, de: 'teste' };
    try {
      const R = W.TC.rules, P = W.TC.dados && W.TC.dados.disponivel && W.TC.dados.disponivel() ? W.TC.dados.col('personagens') : null;
      const eu = ctx.eu || (W.TC.conta && W.TC.conta.usuario && W.TC.conta.usuario.id);
      if (!R || !P || !eu) return { v: 0, de: null };
      const meus = P.todas().filter(l => l && !l.apagado && l.dono_id === eu && ehObj(l.ficha));
      if (!meus.length) return { v: 0, de: null };
      const l = meus.find(x => x.id === st.pc) || meus[0];
      return { v: Math.round(R.valorDoAtributo(R.calcular(l.ficha), atr) || 0), de: l.nome || l.ficha.nome || 'sua ficha' };
    } catch (e) { return { v: 0, de: null }; }
  }

  // o som (o clique da gazua, o estalo ao quebrar, o destrancar): curtinho, gerado na hora
  let audio = null;
  function som(tipo) {
    try {
      audio = audio || new (W.AudioContext || W.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const t = audio.currentTime + 0.01, g = audio.createGain(); g.connect(audio.destination);
      const nota = (fq, q, d, tp, vol) => { const o = audio.createOscillator(), e = audio.createGain(); o.type = tp; o.frequency.value = fq; e.gain.setValueAtTime(0.0001, q); e.gain.exponentialRampToValueAtTime(vol, q + 0.005); e.gain.exponentialRampToValueAtTime(0.0001, q + d); o.connect(e); e.connect(g); o.start(q); o.stop(q + d + 0.03); };
      g.gain.value = 0.25;
      if (tipo === 'clique') nota(2400, t, 0.04, 'square', 0.2);
      else if (tipo === 'trava') { nota(1800, t, 0.05, 'square', 0.3); nota(900, t + 0.03, 0.06, 'triangle', 0.3); }
      else if (tipo === 'quebra') { nota(3200, t, 0.05, 'sawtooth', 0.4); nota(400, t + 0.02, 0.18, 'square', 0.25); }
      else if (tipo === 'erro') nota(220, t, 0.16, 'square', 0.25);
      else if (tipo === 'abre') { nota(700, t, 0.08, 'square', 0.25); nota(1050, t + 0.09, 0.12, 'triangle', 0.35); nota(1400, t + 0.2, 0.3, 'triangle', 0.3); }
    } catch (e) { /* sem som */ }
  }

  function corpo(jg, ctx) {
    const chave = ctx.chave + 'fech:' + (jg.hid || '') + ':' + jg.sal;
    let c = vivos.get(chave);
    // o jogo voltou ao começo (o mestre reiniciou; o teste recomeçou): a tentativa local também
    if (c && (c.jg.resolvido || c.jg.ultimo) && !jg.resolvido && !jg.ultimo) c.morto = true;
    if (!c || c.morto) { c = criar(jg, ctx, chave); vivos.set(chave, c); }
    c.jg = jg; c.ctx = ctx;
    c.atualizar();
    return [c.raiz];
  }

  /* (lote 137, pedido do Bruno) Ao vivo: enquanto o jogador mexe, a fechadura dele manda o movimento (a gazua, o
     desgaste, os pinos) por um canal leve do Realtime, sem gravar nada no banco: fechv:<mesa>. No Escudo, em "Ver como
     está", o mestre vê a mesma fechadura mexendo. O canal é da casca (TC.aoVivo.leve); a moldura usa o da página-mãe. */
  function vivoApi() {
    try {
      const t = (W.parent && W.parent !== W && W.parent.TC) || W.TC;
      const mesa = t && t.mesas && t.mesas.atual && t.mesas.atual.id;
      return t && t.aoVivo && t.aoVivo.leve && mesa ? { leve: t.aoVivo.leve, topico: 'fechv:' + mesa, eu: t.conta && t.conta.usuario ? t.conta.usuario.id : null } : null;
    } catch (e) { return null; }
  }
  const ouvintes = new Map();                     // chave do jogo → [fn] (as fechaduras do mestre que estão assistindo)
  let soltarCanal = null;
  function ligarCanal() {
    const v = vivoApi();
    if (!v) return null;
    if (!soltarCanal || soltarCanal.topico !== v.topico) {
      if (soltarCanal) soltarCanal.fn();
      const fn = v.leve.assinar(v.topico, msg => {
        if (!msg || msg.k !== 'fch') return;
        for (const f of ouvintes.get(msg.h + ':' + msg.sal) || []) { try { f(msg); } catch (e) { /* a tela saiu */ } }
      });
      soltarCanal = { topico: v.topico, fn };
    }
    return v;
  }

  function criar(jg0, ctx0, chave) {
    const c = { jg: jg0, ctx: ctx0, morto: false };
    const st = { teste: 15, pc: null, a: 0, rot: 0, forca: 0, segurando: false, quebrou: 0, pino: 0, travados: [], sobe: null, msg: '', pendente: false, abrindo: false };
    const p = () => c.jg.pub;
    const fechadoAgora = () => { const s = situacao(c.jg); return s.aberta || !!s.falhou || c.ctx.soVer || st.abrindo; };
    const raiz = h('div', { class: 'fch', 'data-k': chave + ':raiz:' + Math.random().toString(36).slice(2, 8) });      // (cada tentativa, um nó: a repintura troca, não mistura)
    c.raiz = raiz;
    const info = h('div', { class: 'fch-info' });
    const palco = h('div', { class: 'fch-palco', tabindex: '0', 'aria-label': 'A fechadura. Use as setas e a barra de espaço.' });
    const ajudaTxt = h('p', { class: 'fch-ajuda' });
    const aviso = h('p', { class: 'fch-msg', role: 'status', 'aria-live': 'polite' });
    const botoes = h('div', { class: 'fch-bts' });
    const teste = h('label', { class: 'fch-teste' });
    raiz.append(info, palco, aviso, botoes, ajudaTxt, teste);
    // (lote 137) ao vivo: quem só vê (o mestre) escuta; quem joga manda
    const aoVivo = h('p', { class: 'fch-vivo', role: 'status' });
    const jogoId = () => (c.jg.hid || '') + ':' + c.jg.sal;
    let ouvindo = null;
    function escutar() {
      if (!c.ctx.soVer || ouvindo === jogoId()) return;
      if (ouvindo) ouvintes.set(ouvindo, (ouvintes.get(ouvindo) || []).filter(f => f !== receber));
      ouvindo = jogoId();
      ouvintes.set(ouvindo, (ouvintes.get(ouvindo) || []).concat([receber]));
      if (!ligarCanal()) aoVivo.textContent = 'Ao vivo: só numa mesa.';
      raiz.insertBefore(aoVivo, palco);
    }
    function receber(msg) { st.rem = msg; st.remEm = Date.now(); }
    let mandadoEm = 0, vivoV = null;
    function transmitir() {
      if (c.ctx.soVer || c.ctx.mestre) return;
      const agora = Date.now();
      if (agora - mandadoEm < 90) return;
      mandadoEm = agora;
      vivoV = vivoV || ligarCanal();
      if (!vivoV) return;
      const P = p(), m = mult();
      const msg = { k: 'fch', h: c.jg.hid || '', sal: c.jg.sal, u: vivoV.eu, e: P.estilo };
      if (P.estilo === 'girar') Object.assign(msg, { a: Math.round(st.a * 10) / 10, r: Math.round(st.rot * 10) / 10, f: Math.round(clamp(st.forca / (T.forca[P.n] * (0.75 + 0.25 * m)), 0, 1) * 100) / 100, fo: st.forcando ? 1 : 0 });
      else Object.assign(msg, { p: st.pino, tv: (st.travados || []).map(x => (x ? 1 : 0)), al: (st.alts || []).map(x => Math.round(x * 100) / 100) });
      if (st.msg) msg.m = st.msg;
      // (manda só quando mudou, e uma vez por segundo de todo jeito, para quem acabou de abrir a tela)
      const chaveMsg = JSON.stringify(msg);
      if (chaveMsg === st.ultimaMsg && agora - (st.ultimaMsgEm || 0) < 1000) return;
      st.ultimaMsg = chaveMsg; st.ultimaMsgEm = agora;
      vivoV.leve.enviar(vivoV.topico, msg);
    }

    // ---- o banco: um lance de cada vez ----
    const mandar = (op, m, txt, pr) => {
      const mm = Object.assign({}, m, { _txt: txt }), an = mm._anuncio;
      delete mm._anuncio;
      if (an && c.ctx.anunciar) { try { c.ctx.anunciar(an, MOTIVO[mm.falhou] || ''); } catch (e) { /* (só o aviso) */ } }
      return Promise.resolve(c.ctx.jogar ? c.ctx.jogar(op, mm, pr) : null).catch(e => { if (c.ctx.aviso) c.ctx.aviso((e && e.message) || 'Não deu certo agora.'); });
    };
    function comecar() {
      if (situacao(c.jg).t0 || st.comecou) return;
      st.comecou = Date.now();
      mandar('jogar', { t0: new Date().toISOString() }, 'começou a abrir a fechadura');
    }
    function falhar(motivo, txt) { if (st.falhando) return; st.falhando = true; mandar('jogar', { falhou: motivo, _anuncio: 'falhou' }, txt); }
    function errar(quebrou, barulho, txt) {
      const m = erro(c.jg, quebrou, barulho);
      if (m.falhou) m._anuncio = 'falhou';
      som(quebrou ? 'quebra' : 'erro');
      // (o erro conta no puzzle — o relógio que o mestre ligou anda — só quando quebra a gazua)
      mandar(quebrou ? 'errar' : 'jogar', m, (quebrou ? 'quebrou uma gazua' : 'fez barulho') + (m.alarme ? ' — e o barulho chamou atenção!' : '') + (m.falhou ? ' · ' + MOTIVO[m.falhou] : ''));
      // (o estado chega de volta pelo banco; até lá, a conta local)
      c.jg = Object.assign({}, c.jg, { estado: Object.assign({}, c.jg.estado, m) });
    }
    function abrir() {
      if (st.abrindo) return;
      st.abrindo = true; som('abre');
      const pr = E.provaDoEstado(c.jg, 'fim');
      mandar('acertar', { aberta: 1, _anuncio: 'abriu' }, 'abriu a fechadura', pr);
    }

    // ---- o valor do atributo ----
    const valor = () => valorDoAtributo(p().atr, c.ctx, st);
    const mult = () => ajuda(valor().v);
    // (lote 134) o desgaste da gazua da vez fica guardado neste aparelho (recarregar a página não conserta a gazua)
    const chaveGasto = () => 'tinycats:fech-gasto:' + chave.replace(/:raiz.*$/, '') + ':' + situacao(c.jg).quebradas;
    let gastoSalvo = 0;
    function guardarDesgaste() {
      const agora = Date.now();
      if (agora - gastoSalvo < 400 && st.forca) return;
      gastoSalvo = agora;
      try { if (st.forca) localStorage.setItem(chaveGasto(), String(Math.round(st.forca))); else localStorage.removeItem(chaveGasto()); } catch (e) { /* sem armazenamento */ }
    }
    try { st.forca = Math.max(0, Number(localStorage.getItem(chaveGasto())) || 0); } catch (e) { /* idem */ }

    // ================= girar =================
    let svg = null, cil = null, gaz = null, chaveEl = null, barra = null;
    function montarGirar() {
      svg = sv('svg', { viewBox: '-130 -130 260 210', class: 'fch-svg', 'aria-hidden': 'true' });
      svg.append(sv('path', { d: 'M-120 0 A120 120 0 0 1 120 0', class: 'fch-arco' }));
      for (let g = -90; g <= 90; g += 15) { const r1 = 112, r2 = g % 45 ? 118 : 122, a = (g - 90) * Math.PI / 180; svg.append(sv('line', { x1: r1 * Math.cos(a), y1: r1 * Math.sin(a), x2: r2 * Math.cos(a), y2: r2 * Math.sin(a), class: 'fch-marca' })); }
      cil = sv('g', { class: 'fch-cil' });
      cil.append(sv('circle', { r: 58, class: 'fch-cil-c' }), sv('circle', { r: 46, class: 'fch-cil-d' }));
      chaveEl = sv('path', { d: 'M-5 -30 h10 v18 h7 v12 h-24 v-12 h7z', class: 'fch-buraco' });
      cil.append(chaveEl);
      gaz = sv('g', { class: 'fch-gaz' });
      gaz.append(sv('path', { d: 'M0 -4 L0 -112 L6 -116 L4 -106 L2 -104', class: 'fch-gaz-l' }), sv('rect', { x: -5, y: -4, width: 10, height: 26, rx: 3, class: 'fch-gaz-c' }));
      barra = sv('rect', { x: -60, y: 70, width: 0, height: 6, rx: 3, class: 'fch-forca' });
      svg.append(cil, gaz, sv('rect', { x: -60, y: 70, width: 120, height: 6, rx: 3, class: 'fch-forca-f' }), barra);
      palco.append(svg);
      const angDoMouse = ev => { const r = svg.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height * (130 / 210); return clamp(Math.atan2(ev.clientX - cx, cy - ev.clientY) * 180 / Math.PI, -90, 90); };
      palco.addEventListener('pointermove', ev => { if (!fechadoAgora() && !st.segurando && ev.pointerType === 'mouse') st.a = angDoMouse(ev); });
      palco.addEventListener('pointerdown', ev => { if (fechadoAgora()) return; if (ev.pointerType !== 'mouse') st.a = angDoMouse(ev); palco.focus(); });
    }
    let ultimo = 0;
    function passoGirar(dt) {
      const P = p(), s = segredoDe(c.jg), m = mult();
      // (lote 137) o mestre assistindo: a fechadura do jogador, como chegou
      if (c.ctx.soVer) {
        const R = st.rem && st.rem.e === 'girar' && Date.now() - st.remEm < 4000 ? st.rem : null;
        const rot = R ? R.r : 0, a = R ? R.a : 0, tremor = R && R.fo ? (Math.random() - 0.5) * (2 + 6 * R.f) : 0;
        cil.setAttribute('transform', 'rotate(' + rot + ')');
        gaz.setAttribute('transform', 'rotate(' + (a + rot * 0.15 + tremor) + ')');
        barra.setAttribute('width', String(120 * (R ? R.f : 0)));
        return;
      }
      const zona = T.zona[P.n] * m, perto = T.perto[P.n], dist = Math.abs(st.a - (s.c || 0));
      const max = dist <= zona ? 90 : 90 * clamp(1 - (dist - zona) / perto, 0.04, 0.85);
      if (st.segurando && !fechadoAgora()) {
        st.rot = Math.min(max, st.rot + dt * 0.12);
        if (st.rot >= 90 - 0.01) { st.segurando = false; abrir(); }
        else if (st.rot >= max - 0.01) {
          st.forca += dt; st.forcando = true;
          if (st.forca >= T.forca[P.n] * (0.75 + 0.25 * m)) { st.forca = 0; st.segurando = false; st.rot = 0; st.tremer = 0; errar(true, 1, 'quebrou'); st.msg = 'A gazua quebrou!'; }
          guardarDesgaste();
        } else st.forcando = false;
      } else { st.rot = Math.max(0, st.rot - dt * 0.25); st.forcando = false; }
      /* (lote 134, pedido do Bruno) o desgaste da gazua não volta: soltar e tentar de novo continua de onde parou —
         só a gazua nova (depois de quebrar) começa inteira. A barra mostra quanto falta para quebrar. */
      const tremor = st.forcando ? (Math.random() - 0.5) * (2 + 6 * st.forca / T.forca[P.n]) : 0;
      cil.setAttribute('transform', 'rotate(' + st.rot + ')');
      gaz.setAttribute('transform', 'rotate(' + (st.a + st.rot * 0.15 + tremor) + ')');
      barra.setAttribute('width', String(120 * clamp(st.forca / (T.forca[P.n] * (0.75 + 0.25 * m)), 0, 1)));
    }

    // ================= pinos =================
    let pinosEl = [];
    const PINO_TOPO = 170 - 26 - 60 - 62;            // onde fica o topo do pino lá no alto (a altura da coluna, no CSS)
    function montarPinos() {
      const n = p().pinos || 3;
      const caixa = h('div', { class: 'fch-pinos', style: { gridTemplateColumns: 'repeat(' + n + ', 1fr)' } });
      pinosEl = Array.from({ length: n }, (_, i) => {
        const pino = h('div', { class: 'fch-pino' }), mola = h('div', { class: 'fch-mola' }), alvo = h('div', { class: 'fch-alvo' });
        const col = h('button', { type: 'button', class: 'fch-col', 'aria-label': 'Pino ' + (i + 1), onclick: () => { if (!fechadoAgora()) { st.pino = i; empurrarOuTravar(); } } }, alvo, mola, pino);
        caixa.append(col);
        return { col, pino, mola, alvo };
      });
      palco.append(caixa);
      st.faixa = null;
    }
    function empurrarOuTravar() {
      if (fechadoAgora()) return;
      comecar();
      const i = st.pino;
      if (st.travados[i]) { st.msg = 'Este pino já está travado.'; return; }
      if (!st.sobe || st.sobe.i !== i || performance.now() - st.sobe.t0 >= ((segredoDe(c.jg).v || [])[i] || 1200)) { st.sobe = { i, t0: performance.now() }; som('clique'); return; }
      // travar: só no alto
      const s = segredoDe(c.jg), per = (s.v || [])[i] || 1200, f = (performance.now() - st.sobe.t0) / per, jan = Math.min(0.6, T.janela[p().n] * mult());
      st.sobe = null;
      // (lote 134) uma folga de um quadro de tela (o que se vê é o desenho de um instante atrás)
      if (Math.abs(f - 0.5) <= jan / 2 + 0.012) {
        st.travados[i] = true; som('trava'); st.msg = 'Travou!';
        const n = p().pinos || 3, livres = [...Array(n).keys()].filter(k => !st.travados[k]);
        if (!livres.length) abrir();
        else st.pino = livres.find(k => k > i) != null ? livres.find(k => k > i) : livres[0];
      } else {
        const P = p(), quebra = Math.random() < T.chanceQuebra[P.n] / Math.sqrt(mult());
        const derrubou = st.travados.some(Boolean) && Math.random() < T.derruba[P.n];
        if (derrubou) st.travados = [];
        st.msg = (quebra ? 'A gazua quebrou!' : 'Errou o tempo.') + (derrubou ? ' Os pinos caíram.' : '');
        errar(quebra, 1, quebra ? 'quebrou' : 'barulho');
      }
    }
    function passoPinos() {
      const s = segredoDe(c.jg), n = p().pinos || 3;
      // (lote 137) o mestre assistindo: os pinos do jogador, como chegaram
      const R = c.ctx.soVer && st.rem && st.rem.e === 'pinos' && Date.now() - st.remEm < 4000 ? st.rem : null;
      if (c.ctx.soVer) {
        const fim = situacao(c.jg).aberta;
        pinosEl.forEach((el, i) => {
          const tv = fim || !!(R && R.tv && R.tv[i]), alt = tv ? 1 : (R && R.al ? +R.al[i] || 0 : 0);
          el.pino.style.transform = 'translateY(' + (-alt * 62) + 'px)';
          el.mola.style.height = (20 + alt * 62) + 'px';
          el.col.classList.toggle('travado', tv);
          el.col.classList.toggle('vez', !!R && R.p === i && !fim);
          el.col.disabled = true;
        });
        if (n !== pinosEl.length) { palco.replaceChildren(); montarPinos(); }
        const jan = Math.min(0.6, T.janela[p().n] * mult()), alto = Math.round((jan + 0.024) * 62 * 10) / 10;
        if (st.faixa !== alto) { st.faixa = alto; pinosEl.forEach(el => { el.alvo.style.top = (PINO_TOPO - 2) + 'px'; el.alvo.style.height = (alto + 2) + 'px'; }); }
        return;
      }
      if (st.sobe) { const per = (s.v || [])[st.sobe.i] || 1200; if (performance.now() - st.sobe.t0 >= per) st.sobe = null; }
      pinosEl.forEach((el, i) => {
        let alt = 0;
        if (st.travados[i]) alt = 1;
        // (lote 134) sobe e desce em linha reta: a altura diz o tempo, e a faixa verde é exatamente a janela de travar
        else if (st.sobe && st.sobe.i === i) { const per = (s.v || [])[i] || 1200; alt = 1 - Math.abs(2 * clamp((performance.now() - st.sobe.t0) / per, 0, 1) - 1); }
        st.alts = st.alts || []; st.alts[i] = alt;
        el.pino.style.transform = 'translateY(' + (-alt * 62) + 'px)';
        el.mola.style.height = (20 + (1 - alt) * 0 + alt * 62) + 'px';
        el.col.classList.toggle('travado', !!st.travados[i]);
        el.col.classList.toggle('vez', st.pino === i && !fechadoAgora());
        el.col.disabled = fechadoAgora();
      });
      if (n !== pinosEl.length) { palco.replaceChildren(); montarPinos(); }
      /* (lote 134) a faixa verde: do alto do curso até a altura em que travar ainda vale (1 − janela). Antes, a faixa era
         fixa e bem mais funda que a janela: no Extremo, o pino "encostava no verde" muito antes de valer. */
      const jan = Math.min(0.6, T.janela[p().n] * mult()), alto = Math.round((jan + 0.024) * 62 * 10) / 10;
      if (st.faixa !== alto) { st.faixa = alto; pinosEl.forEach(el => { el.alvo.style.top = (PINO_TOPO - 2) + 'px'; el.alvo.style.height = (alto + 2) + 'px'; }); }
    }

    // ================= o laço =================
    function quadro(agora) {
      if (!raiz.isConnected) { if (c.saiu == null) c.saiu = agora; if (agora - c.saiu > 4000) { c.morto = true; if (ouvindo) ouvintes.set(ouvindo, (ouvintes.get(ouvindo) || []).filter(f => f !== receber)); return; } requestAnimationFrame(quadro); return; }
      c.saiu = null;
      if (st.querFoco && document.activeElement !== palco && (!document.activeElement || document.activeElement === document.body)) palco.focus({ preventScroll: true });
      const dt = Math.min(50, ultimo ? agora - ultimo : 16); ultimo = agora;
      const P = p();
      if (P.estilo === 'girar') passoGirar(dt); else passoPinos();
      transmitir();                                    // (lote 137) ao vivo, para o mestre
      if (c.ctx.soVer) {
        const vivo = st.rem && Date.now() - st.remEm < 4000, s0 = situacao(c.jg);
        const t = s0.aberta || s0.falhou ? '' : vivo ? '● Ao vivo: ' + (st.rem.m ? st.rem.m : 'mexendo agora.') : (ouvindo && vivoApi() ? 'Ao vivo: esperando o jogador mexer.' : aoVivo.textContent);
        if (aoVivo.textContent !== t) aoVivo.textContent = t;
        aoVivo.classList.toggle('on', !!vivo);
      }
      // o tempo limite
      const s = situacao(c.jg);
      if (P.tempo && s.t0 && !s.aberta && !s.falhou && !c.ctx.soVer) {
        const resta = Math.max(0, s.t0 + P.tempo * 1000 - Date.now());
        st.resta = resta;
        if (!resta) falhar('tempo', 'deixou o tempo acabar · ' + MOTIVO.tempo);
      }
      pintarInfo();
      requestAnimationFrame(quadro);
    }

    // a página se repinta a cada lance (o banco): o palco sai e volta — o foco do teclado volta com ele
    palco.addEventListener('focus', () => { st.querFoco = true; });
    palco.addEventListener('blur', ev => { if (raiz.isConnected && ev.relatedTarget) st.querFoco = false; });
    // ---- as teclas ----
    palco.addEventListener('keydown', ev => {
      if (fechadoAgora()) return;
      const P = p();
      if (P.estilo === 'girar') {
        if (ev.key === 'ArrowLeft' || ev.key === 'a') { st.a = clamp(st.a - (ev.shiftKey ? 0.5 : 2), -90, 90); ev.preventDefault(); }
        else if (ev.key === 'ArrowRight' || ev.key === 'd') { st.a = clamp(st.a + (ev.shiftKey ? 0.5 : 2), -90, 90); ev.preventDefault(); }
        else if (ev.key === ' ' || ev.key === 'ArrowUp' || ev.key === 'w') { if (!st.segurando) { comecar(); st.segurando = true; } ev.preventDefault(); }
      } else {
        if (ev.key === 'ArrowLeft' || ev.key === 'a') { st.pino = Math.max(0, st.pino - 1); st.sobe = null; ev.preventDefault(); }
        else if (ev.key === 'ArrowRight' || ev.key === 'd') { st.pino = Math.min((P.pinos || 3) - 1, st.pino + 1); st.sobe = null; ev.preventDefault(); }
        else if (ev.key === ' ' || ev.key === 'Enter') { if (!ev.repeat) empurrarOuTravar(); ev.preventDefault(); }
      }
    });
    palco.addEventListener('keyup', ev => { if (ev.key === ' ' || ev.key === 'ArrowUp' || ev.key === 'w') st.segurando = false; });

    // ---- o que se escreve em volta ----
    let infoChave = '';
    function pintarInfo() {
      const P = p(), s = situacao(c.jg), val = valor(), nAtr = (ATRS.find(a => a[0] === P.atr) || ['', ''])[1];
      const partes = [NIVEIS[P.n][1], P.estilo === 'girar' ? 'girar a gazua' : P.pinos + ' pinos'];
      if (P.cons.quebra) partes.push('gazuas: ' + s.restam + ' de ' + P.gazuas);
      if (P.cons.barulho) partes.push('barulho: ' + s.barulho + ' de ' + P.barulho + (s.alarme ? ' (alarme!)' : ''));
      if (P.cons.emperra) partes.push('erros: ' + s.erros + ' de ' + P.emperra);
      if (P.tempo) partes.push('tempo: ' + (s.t0 && !s.aberta && !s.falhou && !c.ctx.soVer ? Math.ceil((st.resta || 0) / 1000) + 's' : P.tempo + 's'));
      if (P.atr) partes.push(nAtr + ': ' + val.v + (val.de && val.de !== 'teste' ? ' (' + val.de + ')' : ''));
      const txt = partes.join(' · ');
      const fim = s.aberta ? 'Aberta!' : s.falhou ? 'Não abriu. ' + MOTIVO[s.falhou] : '';
      const msg = fim || st.msg || '';
      const k2 = txt + '|' + msg;
      if (k2 === infoChave) return;
      infoChave = k2;
      info.textContent = txt;
      aviso.textContent = msg;
      aviso.className = 'fch-msg' + (s.aberta ? ' ok' : s.falhou ? ' falhou' : '');
      raiz.classList.toggle('aberta', s.aberta); raiz.classList.toggle('falhou', !!s.falhou); raiz.classList.toggle('alarme', s.alarme);
    }
    c.atualizar = () => {
      const P = p();
      escutar();
      if (!c.estilo || c.estilo !== P.estilo) { palco.replaceChildren(); c.estilo = P.estilo; if (P.estilo === 'girar') montarGirar(); else montarPinos(); }
      const s = situacao(c.jg);
      if (s.aberta || s.falhou) { st.segurando = false; st.sobe = null; }
      if (s.aberta && P.estilo === 'pinos') st.travados = Array.from({ length: P.pinos }, () => true);
      if (s.aberta && P.estilo === 'girar') st.rot = 90;
      ajudaTxt.textContent = c.ctx.soVer ? '' : P.estilo === 'girar'
        ? 'Mova o mouse (ou ← →) para posicionar a gazua e segure Girar (ou a barra de espaço). No ponto certo, o cilindro gira até o fim. Fora dele, trava: a gazua treme e se gasta. O desgaste não volta quando você solta: com a barra cheia, ela quebra (a próxima gazua começa inteira).'
        : 'Escolha o pino (clique, ou ← →). Espaço (ou clique) empurra o pino; quando ele estiver lá no alto, espaço de novo trava. Travar fora da hora faz barulho e pode quebrar a gazua.';
      botoes.replaceChildren(...(c.ctx.soVer || s.aberta || s.falhou ? [] : P.estilo === 'girar'
        ? [h('button', { type: 'button', class: 'btn pri fch-girar', 'data-k': chave + ':girar',
            onpointerdown: ev => { ev.preventDefault(); comecar(); st.segurando = true; }, onpointerup: () => { st.segurando = false; }, onpointerleave: () => { st.segurando = false; }, onpointercancel: () => { st.segurando = false; } }, 'Segure para girar')]
        : [h('button', { type: 'button', class: 'btn pri', 'data-k': chave + ':empurrar', onclick: () => empurrarOuTravar() }, 'Empurrar / travar')]));
      teste.replaceChildren();
      if (c.ctx.mestre && !c.ctx.soVer && P.atr) {
        const inp = h('input', { type: 'number', class: 'in', min: 0, max: 100, value: st.teste, 'data-k': chave + ':teste', oninput: ev => { st.teste = clamp(Number(ev.target.value) || 0, 0, 100); infoChave = ''; } });
        teste.append('No teste, o valor do atributo: ', inp);
      }
      if (!c.ctx.mestre && !c.ctx.soVer && P.atr) {
        // quem tem mais de uma ficha escolhe com qual abre
        try {
          const P2 = W.TC.dados && W.TC.dados.disponivel && W.TC.dados.disponivel() ? W.TC.dados.col('personagens') : null;
          const eu = c.ctx.eu || (W.TC.conta && W.TC.conta.usuario && W.TC.conta.usuario.id);
          const meus = P2 && eu ? P2.todas().filter(l => l && !l.apagado && l.dono_id === eu && ehObj(l.ficha)) : [];
          if (meus.length > 1 && !s.t0) teste.append('Quem abre: ', h('select', { class: 'in', 'data-k': chave + ':pc', value: st.pc || meus[0].id, onchange: ev => { st.pc = ev.target.value; infoChave = ''; } },
            meus.map(l => h('option', { value: l.id, text: l.nome || 'Sem nome' }))));
        } catch (e) { /* sem fichas aqui */ }
      }
      infoChave = '';
      pintarInfo();
    };
    requestAnimationFrame(quadro);
    return c;
  }
  PUI.registrarCorpo('fechadura', corpo);
})();
