// Bateria do lote 129 (as Cenas): o marcador de missão. Nasce oculto; o mestre liga a uma missão da aba Missões (ou a um
// objetivo opcional dela); a cópia (título, tipo, situação) acompanha a missão sozinha, sem entrar no Desfazer; a missão
// ainda oculta vai para os jogadores sem o nome; o balão (o nome, o tipo e "Abrir na aba Missões"); o clique de quem joga;
// e o "Gerar um lugar…" com os marcadores (vazios ou das missões escolhidas).
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const j = JSON.stringify;
(async () => {
  const t = await open({ w: 1300, h: 850 });
  const ev = fn => t.page.evaluate(fn);
  // a mesa de mentira: os documentos das missões e a ponte
  await ev(() => {
    const linhas = new Map(), ouv = [];
    window.__irs = [];
    window.__D = { pronta: Promise.resolve(), todas: () => [...linhas.values()], pegar: id => linhas.get(id) || null,
      gravar: (id, campos) => { const l = Object.assign({}, linhas.get(id) || { id }, campos); linhas.set(id, l); ouv.forEach(f => f(l)); return l; }, aoMudar: f => ouv.push(f) };
    window.TC = Object.assign(window.TC || {}, { dados: { disponivel: () => true, col: () => window.__D }, ponte: Object.assign((window.TC && window.TC.ponte) || {}, { naCasca: true, ir: (aba, alvo) => { window.__irs.push([aba, alvo]); return true; }, estado: { campanha: null } }) });
    __D.gravar('fichas:mis:rasc', { vis: 'mestre', dados: { v: 1, ms: { r1: { t: 'O segredo do prefeito', quem: 'um', tp: 'principal', o: { x: { t: 'Achar a carta', op: 1 } } } } } });
    __D.gravar('fichas:mis:quadro', { vis: 'mesa', dados: { v: 1, ms: {
      q1: { t: 'O cálice do barão', quem: 'grupo', tp: 'principal', e: 'ativa', pegas: {}, o: { a: { t: 'Entrar na mansão', n: 0 }, b: { t: 'Roubar o cálice', n: 1, op: 1 } } },
      q2: { t: 'Ratos no porão', quem: 'um', tp: 'secundaria', e: 'oferta' } } } });
  });
  await t.page.waitForTimeout(2300);          // (o módulo procura a coleção a cada 2 s)

  const r1 = await ev(async () => {
    const T = __tc, S = T.Store, MC = T.MissaoCenas, w = ms => new Promise(r => setTimeout(r, ms)), out = {};
    const sc = T.newScene('Vila'); sc.cols = 16; sc.rows = 12; T.normalizeScene(sc); S.addScene(sc); T.UI.switchScene(sc.id);
    const c = sc.cell;
    out.grupo = T.Props.G.some(g => g.id === 'missao') && T.Props.P.missao && T.Props.P.missao.g === 'missao';
    const mk = T.Props.novo(sc, 'missao', 5 * c, 5 * c, 1, false);
    S.tx('pôr', () => S.add('tokens', mk));
    out.oculto = S.get('tokens', mk.id).hidden === true && !S.get('tokens', mk.id).mq;
    out.lista = MC.missoes().map(x => x.id + ':' + x.tp + ':' + x.e + ':' + x.ops.length);
    MC.ligar(S.get('tokens', mk.id), 'q1');
    let tk = S.get('tokens', mk.id);
    out.ligado = tk.mq && tk.mq.id === 'q1' && tk.mq.t === 'O cálice do barão' && tk.mq.tp === 'principal' && tk.mq.e === 'ativa' && !tk.mq.oid && tk.name === 'Missão: O cálice do barão';
    // o painel: a missão e o que marca
    T.setSel([{ c: 'tokens', id: mk.id }]); T.UI.openTab('sel'); await w(150);
    const sel = document.getElementById('pr-mq'), op = document.getElementById('pr-mq-op');
    out.painel = !!sel && sel.value === 'q1' && [...sel.options].length === 4 && !!op && [...op.options].map(o => o.textContent).join('|');
    // o objetivo opcional
    op.value = 'b'; op.dispatchEvent(new Event('change')); await w(100);
    tk = S.get('tokens', mk.id);
    out.opcional = tk.mq.oid === 'b' && tk.mq.ot === 'Roubar o cálice' && tk.mq.op === true && tk.mq.e === 'ativa' && tk.name === 'Opcional: Roubar o cálice';
    // a missão muda na aba Missões: o marcador acompanha, sem entrar no Desfazer
    const undo0 = S.canUndo() ? 1 : 0;
    const q = JSON.parse(JSON.stringify(__D.pegar('fichas:mis:quadro').dados)); q.ms.q1.ok = { b: 1 };
    __D.gravar('fichas:mis:quadro', { dados: q }); await w(500);
    tk = S.get('tokens', mk.id);
    out.acompanha = tk.mq.e === 'feita';
    q.ms.q1.ok = {}; q.ms.q1.e = 'falhou'; q.ms.q1.t = 'O cálice roubado'; __D.gravar('fichas:mis:quadro', { dados: q }); await w(500);
    tk = S.get('tokens', mk.id);
    out.falhou = tk.mq.e === 'falhou' && tk.mq.t === 'O cálice roubado';
    S.undo(); tk = S.get('tokens', mk.id);
    out.semDesfazer = undo0 === 1 && tk.mq && tk.mq.id === 'q1' && !tk.mq.oid;      // (o Desfazer volta só o que o mestre fez: a escolha do opcional)
    await w(500); tk = S.get('tokens', mk.id);
    out.semDesfazer = out.semDesfazer && tk.mq.e === 'falhou' && tk.mq.t === 'O cálice roubado';      // (e a cópia volta a ser a de agora)
    // a missão oculta: o nome não vai para os jogadores
    const mk2 = T.Props.novo(sc, 'missao', 9 * c, 5 * c, 1, false); S.tx('pôr', () => S.add('tokens', mk2)); MC.ligar(S.get('tokens', mk2.id), 'r1');
    S.tx('revelar', () => { S.upd('tokens', mk2.id, { hidden: false }); S.upd('tokens', mk.id, { hidden: false }); });
    const pj = T.Proj.projetar(sc, {}, new Set(), null).v.tokens;
    const p1 = pj.find(x => x.id === mk.id), p2 = pj.find(x => x.id === mk2.id);
    out.proj = p1 && p1.mq.t === 'O cálice roubado' && p2 && p2.mq.e === 'oculta' && !p2.mq.t;
    out.projDbg = JSON.stringify([p1 && p1.mq, p1 && p1.name, p2 && p2.mq, p2 && p2.name]);
    // a missão apagada
    const R = JSON.parse(JSON.stringify(__D.pegar('fichas:mis:rasc').dados)); delete R.ms.r1; __D.gravar('fichas:mis:rasc', { dados: R }); await w(500);
    out.sumiu = S.get('tokens', mk2.id).mq.e === 'sumiu';
    out.ids = [mk.id, mk2.id];
    return out;
  });
  ok(r1.grupo, 'o catálogo tem o grupo "Missões" com o marcador');
  ok(r1.oculto, 'o marcador nasce oculto e sem missão');
  ok(j(r1.lista) === j(['q1:principal:ativa:1', 'r1:principal:oculta:1', 'q2:secundaria:oferta:0']), 'a lista das missões: as principais primeiro, com os objetivos opcionais: ' + j(r1.lista));
  ok(r1.ligado, 'ligado à missão: título, tipo, situação e o nome do token');
  ok(r1.painel === 'A missão inteira|Opcional: Roubar o cálice', 'o painel: a missão e o que marca (a missão inteira ou o opcional): ' + j(r1.painel));
  ok(r1.opcional, 'ligado ao objetivo opcional');
  ok(r1.acompanha, 'o opcional marcado na aba Missões: o marcador fica cumprido');
  ok(r1.falhou, 'a missão falhou e mudou de nome: o marcador acompanha');
  ok(r1.semDesfazer, 'o que veio da aba Missões não entra no Desfazer (e, desfeito o passo do mestre, a cópia volta a ser a de agora)');
  ok(r1.proj, 'a projeção: a missão revelada com o nome; a oculta, sem nome: ' + r1.projDbg);
  ok(r1.sumiu, 'a missão apagada: o marcador avisa');

  // o balão do mestre (dois cliques) e o "Abrir na aba Missões"
  const r2 = await ev(async () => {
    const T = __tc, S = T.Store, w = ms => new Promise(r => setTimeout(r, ms));
    const tk = S.scene().tokens.find(x => x.mq && x.mq.id === 'q1');
    T.MissaoCenas.balao(tk, 300, 300); await w(100);
    const m = document.querySelector('.menu'), txt = m ? m.innerText : '';
    const b = m && [...m.querySelectorAll('.menu-i')].find(x => /Abrir na aba Missões/.test(x.textContent));
    if (b) b.click();
    await w(50);
    return { txt, irs: window.__irs.slice() };
  });
  ok(/O cálice roubado/i.test(r2.txt) && /Missão principal/i.test(r2.txt) && /Falhou/i.test(r2.txt) && /Ocultar dos jogadores/.test(r2.txt), 'o balão do mestre: o nome, o tipo, a situação e ocultar: ' + j(r2.txt));
  ok(j(r2.irs) === j([['missoes', { missao: 'q1' }]]), '"Abrir na aba Missões" pede a aba Missões com a missão');

  // quem joga: um clique no marcador revelado abre o balão
  const pos = await ev(async () => {
    const T = __tc, S = T.Store, w = ms => new Promise(r => setTimeout(r, ms));
    T.UI.closeMenus(); const jg = S.S.players[0] ? S.S.players[0].id : null; T.UI.setViewer(jg); T.Render.fit(); await w(250);
    const tk = S.scene().tokens.find(x => x.mq && x.mq.id === 'q1'), sc = S.scene(), cv = document.getElementById('cv'), rc = cv.getBoundingClientRect(), V = T.App.view;
    const wx = tk.x + sc.cell / 2, wy = tk.y + sc.cell / 2;
    return { x: rc.left + (wx - V.x) * V.z, y: rc.top + (wy - V.y) * V.z, viewer: T.App.viewer };
  });
  await t.page.mouse.click(pos.x, pos.y); await t.page.waitForTimeout(250);
  const r3 = await ev(() => { const m = document.querySelector('.menu'); return { txt: m ? m.innerText : '', ocultar: m ? /Ocultar/.test(m.innerText) : null }; });
  ok(pos.viewer !== 'gm' && /O cálice roubado/i.test(r3.txt) && /Abrir na aba Missões/.test(r3.txt) && r3.ocultar === false, 'quem joga: o clique abre o balão, sem o que é do mestre: ' + j(r3));
  await t.page.screenshot({ path: __dirname + '/_lote129-balao.png' });
  await ev(() => { __tc.UI.closeMenus(); __tc.UI.setViewer('gm'); });

  // o desenho: a prévia de cada jeito (para olhar)
  await ev(async () => {
    const T = __tc, S = T.Store, w = ms => new Promise(r => setTimeout(r, ms));
    TC.dados.disponivel = () => false;          // (fora da mesa: as cópias de mentira ficam como estão)
    const sc = T.newScene('Marcadores'); sc.cols = 10; sc.rows = 3; T.normalizeScene(sc); S.addScene(sc); T.UI.switchScene(sc.id);
    const c = sc.cell, jeitos = [null, { id: 'a', tp: 'principal', e: 'ativa' }, { id: 'a', tp: 'secundaria', e: 'oferta' }, { id: 'a', oid: 'x', tp: 'principal', e: 'ativa' }, { id: 'a', oid: 'x', tp: 'secundaria', e: 'ativa' },
      { id: 'a', tp: 'principal', e: 'feita' }, { id: 'a', tp: 'secundaria', e: 'falhou' }, { id: 'a', tp: 'principal', e: 'oculta' }, { id: 'a', tp: 'principal', e: 'sumiu' }];
    S.tx('pôr', () => jeitos.forEach((mq, i) => { const tk = T.Props.novo(sc, 'missao', (1 + i) * c, 1 * c, 1, false); tk.hidden = false; if (mq) tk.mq = mq; S.add('tokens', tk); }));
    T.Render.fit(); await w(300);
  });
  await t.page.screenshot({ path: __dirname + '/_lote129-marcadores.png' });
  await ev(() => { TC.dados.disponivel = () => true; });

  // o "Gerar um lugar…": os marcadores vazios e os das missões escolhidas
  const r4 = await ev(async () => {
    const T = __tc, S = T.Store, MC = T.MissaoCenas, out = {};
    const sc = T.newScene('Cidade'); sc.cols = 30; sc.rows = 20; T.normalizeScene(sc); S.addScene(sc);
    out.nada = MC.porNaCena(sc, { modo: 'nada' }, [[5, 5]]);
    out.vazios = MC.porNaCena(sc, { modo: 'vazios' }, [[5, 5], [12, 8], [20, 10], [25, 15]]);
    const vs = sc.tokens.filter(x => x.prop === 'missao');
    out.vaziosOk = vs.length === 3 && vs.every(x => x.hidden && !x.mq);
    out.minhas = MC.porNaCena(sc, { modo: 'minhas', ids: ['q1', 'q2'] }, [[5, 5], [12, 8]]);
    const ms = sc.tokens.filter(x => x.prop === 'missao' && x.mq);
    out.minhasOk = ms.length === 2 && ms.every(x => x.hidden) && ms.map(x => x.mq.id).sort().join() === 'q1,q2';
    out.livres = new Set(sc.tokens.map(x => x.x + ',' + x.y)).size === sc.tokens.length;
    return out;
  });
  ok(r4.nada === 0 && r4.vazios === 3 && r4.vaziosOk, 'gerador: "Sem marcadores" não põe nada; "Vazios" põe até 3, ocultos e sem missão: ' + j(r4));
  ok(r4.minhas === 2 && r4.minhasOk && r4.livres, 'gerador: "Das minhas missões" põe um por missão, ocultos, cada um num quadrado: ' + j(r4));

  // o "Gerar um lugar…" de verdade: a cidade com os marcadores vazios (na porta da taverna, do templo…); a masmorra, sem o bloco
  const r5 = await ev(async () => {
    const T = __tc, S = T.Store, w = ms => new Promise(r => setTimeout(r, ms)), out = {};
    T.App.opt.genMq = 'vazios';
    T.Gerador.abrir('masmorra'); await w(400);
    out.semBloco = !document.getElementById('ger-mq');
    document.querySelectorAll('.modal .btn').forEach(b => { if (/Cancelar/.test(b.textContent)) b.click(); }); await w(200);
    T.Gerador.abrir('cidade'); await w(600);
    out.bloco = !!document.getElementById('ger-mq') && /marcadores vazios/.test(document.getElementById('ger-bl-mq').innerText);
    const n0 = S.S.order.length;
    [...document.querySelectorAll('.modal .btn.primary')].find(b => /Criar a cena/.test(b.textContent)).click();
    for (let i = 0; i < 40 && S.S.order.length === n0; i++) await w(200);
    await w(300);
    const sc = S.scene(), c = sc.cell, mks = sc.tokens.filter(x => x.prop === 'missao');
    const portas = sc.tokens.filter(x => x.prop === 'entrada' && x.gera && ['taverna', 'templo', 'quartel', 'guilda', 'estalagem'].includes(x.gera.t));
    out.n = mks.length; out.ocultos = mks.every(x => x.hidden && !x.mq);
    out.perto = mks.length > 0 && portas.some(pt => Math.hypot(mks[0].x / c - pt.x / c, mks[0].y / c - pt.y / c) < 5);
    out.toast = [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' | ');
    T.App.opt.genMq = 'nada';
    return out;
  });
  ok(r5.semBloco && r5.bloco, 'o bloco "Missões" do gerador aparece nos povoados (na masmorra, não)');
  ok(r5.n === 3 && r5.ocultos && r5.perto && /3 marcadores de missão/.test(r5.toast), 'a cidade gerada sai com 3 marcadores vazios e ocultos, o primeiro na porta de um lugar de missão; o aviso conta: ' + j(r5));

  ok(t.errs.filter(e => !/favicon/.test(e)).length === 0, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
