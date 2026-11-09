// Bateria do lote 122 (as Cenas): os andares dos lugares de furtividade, a fechadura com gazuas no segundo clique e os
// objetos novos.
//   · andares: com "Andares de cima" e "Porão", o lugar sai em várias cenas do mesmo tamanho (alinhadas), cada uma com o
//     andar dela (sc.nivel), ligadas pelas escadas — cada escada leva a outra cena e lá há a de volta na mesma casa;
//     guardas nos andares; o acampamento não tem andares; sem as escolhas, uma cena só, como antes;
//   · a fechadura: o segundo clique do mestre numa porta trancada (ou num objeto que tranca, já selecionado) cria o puzzle
//     "Fechadura" no Escudo (o documento escudo:handout:…, do nível da porta), liga a porta (pz) e oferece entregar —
//     "Entregar…" abre o Escudo no puzzle, com a janela de entregar; já ligado, o clique só oferece entregar; resolvido
//     o puzzle, o objeto abre (o estado Aberto); os jogadores não recebem o nível nem o puzzle do objeto;
//   · os objetos novos existem, com as medidas, e os que trancam dizem.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };

(async () => {
  const t = await open({ w: 1400, h: 900 });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const j = JSON.stringify;

  /* ---------- os andares ---------- */
  const r1 = await ev(async () => {
    const T = __tc, F = T.Furtividade, S = T.Store.S, out = {};
    for (const id of F.IDS) {
      const L = F.LUGARES[id], antes = new Set(S.order);
      const p = L.gerar({ tamanho: 'medio', guardas: 'normal', alvo: 'sorteio', cima: 2, porao: true }, { seed: 55, estilo: 'comum' });
      const sc = await L.criar(p, '', { hora: 'dia' });
      const novas = S.order.filter(x => !antes.has(x)).map(x => S.scenes[x]);
      const niveis = novas.map(x => x.nivel).sort((a, b) => a - b);
      const alinhadas = novas.every(x => x.cols === sc.cols && x.rows === sc.rows && x.cell === sc.cell);
      // cada escada leva a uma das cenas novas, e lá há uma escada de volta na mesma casa
      let esc = 0, volta = true;
      for (const c of novas) for (const e of c.tokens.filter(k => k.cena)) {
        if (e.prop !== 'escada') continue;
        esc++;
        const outra = S.scenes[e.cena];
        if (!outra || !outra.tokens.some(k => k.cena === c.id && k.x === e.x && k.y === e.y)) volta = false;
      }
      const guardasAndar = novas.filter(c => c.nivel !== 0).reduce((m, c) => m + c.tokens.filter(k => k.ronda).length, 0);
      out[id] = { cenas: novas.length, niveis, alinhadas, esc, volta, guardasAndar, principal: sc.nivel === 0 };
    }
    // sem as escolhas: uma cena só
    const antes = new Set(S.order), L = F.LUGARES.mansao;
    await L.criar(L.gerar({ tamanho: 'pequeno', guardas: 'poucos', alvo: 'sorteio', cima: 0, porao: false }, { seed: 9 }), '', {});
    out.so = S.order.filter(x => !antes.has(x)).map(x => S.scenes[x].nivel);
    return out;
  });
  for (const id of ['mansao', 'fortaleza', 'guilda', 'ruas', 'torre']) {
    const v = r1[id];
    ok(v.cenas === 4 && j(v.niveis) === j([-1, 0, 1, 2]) && v.alinhadas && v.principal, `${id}: porão, térreo, 1º e 2º andar, quatro cenas alinhadas: ` + j(v));
    ok(v.esc === 6 && v.volta, `${id}: seis escadas, cada uma com a de volta na mesma casa do outro andar: ` + j(v));
    ok(v.guardasAndar >= 1, `${id}: guardas também nos andares: ` + j(v));
  }
  ok(r1.acampamento.cenas === 1, 'o acampamento não tem andares: ' + j(r1.acampamento));
  ok(j(r1.so) === j([undefined].map(() => null)) || (r1.so.length === 1 && r1.so[0] == null), 'sem andares, uma cena só (sem nível): ' + j(r1.so));

  // a janela: os controles dos andares (e o acampamento sem eles)
  const r2 = await ev(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    __tc.Gerador.abrir('mansao'); await w(400);
    const tem = !!document.querySelector('#fur-cima') && !!document.querySelector('#fur-porao');
    const txt = document.querySelector('.modal').innerText;
    __tc.UI.closeModal && __tc.UI.closeModal();
    document.querySelectorAll('.modal .btn').forEach(b => { if (/Cancelar/.test(b.textContent)) b.click(); });
    await w(200);
    __tc.Gerador.abrir('acampamento'); await w(400);
    const semAcamp = !document.querySelector('#fur-cima');
    document.querySelectorAll('.modal .btn').forEach(b => { if (/Cancelar/.test(b.textContent)) b.click(); });
    await w(200);
    return { tem, semAcamp, resumo: /cenas ligadas pelas escadas/.test(txt) };
  });
  ok(r2.tem && r2.semAcamp && r2.resumo, 'a janela tem "Andares de cima" e "Porão" (o acampamento, não), e o resumo conta as cenas: ' + j(r2));

  /* ---------- a fechadura com gazuas ---------- */
  await ev(() => {
    // a mesa de mentira: os documentos (o Escudo grava aqui) e a ponte (o pedido de abrir o Escudo)
    const linhas = new Map(), ouv = [];
    window.__irs = [];
    window.__D = { pronta: Promise.resolve(), todas: () => [...linhas.values()], pegar: id => linhas.get(id) || null,
      gravar: (id, campos) => { const l = Object.assign({}, linhas.get(id) || { id }, campos); linhas.set(id, l); ouv.forEach(f => f(l)); return l; }, aoMudar: f => ouv.push(f) };
    window.TC = Object.assign(window.TC || {}, { dados: { disponivel: () => true, col: () => window.__D }, ponte: Object.assign((window.TC && window.TC.ponte) || {}, { ir: (aba, alvo) => { window.__irs.push([aba, alvo]); return true; }, estado: { campanha: null } }) });
    __tc.Nuvem.mestre = () => true;
    __tc.EscudoCenas.iniciar();
  });
  await page.waitForTimeout(200);
  const r3 = await ev(async () => {
    const T = __tc, S = T.Store, w = ms => new Promise(r => setTimeout(r, ms)), out = {};
    const sc = T.newScene('Fechaduras'); sc.cols = 12; sc.rows = 8; T.normalizeScene(sc); S.addScene(sc); T.UI.switchScene(sc.id);
    const c = sc.cell;
    S.tx('p', () => { S.add('walls', { id: 'wp', k: 'door', x1: 4 * c, y1: 2 * c, x2: 5 * c, y2: 2 * c, open: false, locked: true, secret: false, fech: 'dificil' }); });
    const bau = T.Props.novo(sc, 'bau', 7 * c, 4 * c, 1, false); bau.hidden = false; S.tx('b', () => S.add('tokens', bau));
    T.Render.fit(); await w(200);
    const cv = document.getElementById('cv'), rc = cv.getBoundingClientRect();
    const clique = async (x, y) => { const v = T.App.view, cx = rc.left + (x - v.x) * v.z, cy = rc.top + (y - v.y) * v.z, o = { bubbles: true, button: 0, pointerId: 1, clientX: cx, clientY: cy }; cv.dispatchEvent(new PointerEvent('pointerdown', o)); cv.dispatchEvent(new PointerEvent('pointerup', o)); await w(80); };
    const dialogo = () => { const m = document.querySelector('.modal'); return m ? m.innerText : ''; };
    const botao = rx => { const b = [...document.querySelectorAll('.modal .btn')].find(x => rx.test(x.textContent)); if (b) b.click(); return !!b; };
    // a porta trancada: o 1º clique seleciona (não abre); o 2º, devagar, cria a fechadura
    await clique(4.5 * c, 2 * c);
    out.sel = T.App.sel.length === 1 && T.App.sel[0].c === 'walls' && !S.get('walls', 'wp').open;
    await w(400);
    await clique(4.5 * c, 2 * c); await w(500);
    const wp = S.get('walls', 'wp'), doc = wp.pz ? __D.pegar('escudo:handout:' + wp.pz) : null;
    out.porta = { pz: !!wp.pz, locked: wp.locked, doc: doc && doc.dados && [doc.dados.tipo, doc.dados.puzzle.tipo, doc.dados.puzzle.nivel, doc.vis], dlg: /Fechadura criada/.test(dialogo()) };
    botao(/Entregar/); await w(200);
    out.ir = __irs.slice(-1)[0];
    // de novo: já ligada, só oferece entregar (não cria outra)
    const n0 = __D.todas().length;
    await w(400); await clique(4.5 * c, 2 * c); await w(500);
    out.deNovo = { dlg: /já abre com/.test(dialogo()), mesmos: __D.todas().length === n0 };
    botao(/Cancelar/); await w(150);
    // o baú: selecionado, o segundo clique (sem arrastar) cria a dele; o nível escolhido no painel vale
    S.tx('n', () => S.upd('tokens', bau.id, { tranca: 'extremo' }));
    await clique(7.5 * c, 4.5 * c); await w(450);
    await clique(7.5 * c, 4.5 * c); await w(500);
    const b2 = S.get('tokens', bau.id), d2 = b2.pz ? __D.pegar('escudo:handout:' + b2.pz) : null;
    out.bau = { pz: !!b2.pz, nivel: d2 && d2.dados.puzzle.nivel, dlg: /Fechadura criada/.test(dialogo()) };
    botao(/Cancelar/); await w(150);
    // dois cliques rápidos no baú: só troca o estado (não é a fechadura)
    const nd = __D.todas().length;
    const v = T.App.view, cx = rc.left + (7.5 * c - v.x) * v.z, cy = rc.top + (4.5 * c - v.y) * v.z, o2 = { bubbles: true, button: 0, pointerId: 1, clientX: cx, clientY: cy };
    cv.dispatchEvent(new PointerEvent('pointerdown', o2)); cv.dispatchEvent(new PointerEvent('pointerup', o2));
    cv.dispatchEvent(new PointerEvent('pointerdown', o2)); cv.dispatchEvent(new PointerEvent('pointerup', o2)); cv.dispatchEvent(new MouseEvent('dblclick', o2));
    await w(600);
    out.dois = { semDlg: !document.querySelector('.modal'), mesmos: __D.todas().length === nd };
    // resolvido o puzzle do baú: ele abre sozinho (e a porta também)
    S.tx('fecha', () => S.upd('tokens', bau.id, { est: 'fechado' }));
    __D.gravar('pista:jogo:' + b2.pz, { dados: { resolvido: { por: 'x', em: '2026-11-09T10:00:00Z' } } });
    __D.gravar('pista:jogo:' + wp.pz, { dados: { resolvido: { por: 'x', em: '2026-11-09T10:00:00Z' } } });
    await w(500);
    out.abriu = { bau: S.get('tokens', bau.id).est, porta: S.get('walls', 'wp').open && !S.get('walls', 'wp').locked };
    // os jogadores não recebem o nível nem o puzzle do objeto
    const pub = T.Proj.projetar(S.scene(), {}, [], null), tb = pub.v.tokens.find(x => x.id === bau.id);
    out.pub = tb && tb.tranca === undefined && tb.pz === undefined;
    return out;
  });
  ok(r3.sel, 'o 1º clique na porta trancada seleciona e não abre');
  ok(r3.porta.pz && r3.porta.locked && j(r3.porta.doc) === j(['puzzle', 'fechadura', 'dificil', 'mestre']) && r3.porta.dlg, 'o 2º clique cria a Fechadura (do nível da porta, só do mestre) e liga a porta: ' + j(r3.porta));
  ok(r3.ir && r3.ir[0] === 'escudo' && r3.ir[1].entregar === true && typeof r3.ir[1].handout === 'string', '"Entregar…" abre o Escudo no puzzle, com a janela de entregar: ' + j(r3.ir));
  ok(r3.deNovo.dlg && r3.deNovo.mesmos, 'já ligada, o clique só oferece entregar (não cria outra): ' + j(r3.deNovo));
  ok(r3.bau.pz && r3.bau.nivel === 'extremo' && r3.bau.dlg, 'o baú selecionado: o segundo clique cria a fechadura dele, do nível escolhido: ' + j(r3.bau));
  ok(r3.dois.semDlg && r3.dois.mesmos, 'dois cliques rápidos no baú só trocam o estado: ' + j(r3.dois));
  ok(r3.abriu.bau === 'aberto' && r3.abriu.porta, 'resolvido o puzzle, o baú abre e a porta abre e destranca: ' + j(r3.abriu));
  ok(r3.pub, 'os jogadores não recebem o nível nem o puzzle do objeto');

  /* ---------- os objetos novos ---------- */
  const r4 = await ev(() => {
    const P = __tc.Props.P, ids = ['comoda', 'penteadeira', 'escrivaninha', 'relogioPe', 'quadro', 'lustre', 'cofreParede', 'sinoAlarme', 'casinhaCao', 'guizos', 'gradeJanela', 'alcapao', 'escadaMao', 'cordaGancho', 'claraboia', 'chamine', 'canoEsgoto', 'cestoRoupa', 'carrinhoMao', 'pilhaLenha', 'tonel', 'prateleiraVinho'];
    return { faltam: ids.filter(id => !P[id]), trancam: ids.filter(id => P[id] && P[id].tranca), antes: ['bau', 'cofre', 'armario', 'jaula'].every(id => P[id].tranca), guizos: !!P.guizos.armadilha, lustre: !!P.lustre.luz };
  });
  ok(!r4.faltam.length && j(r4.trancam) === j(['comoda', 'escrivaninha', 'quadro', 'cofreParede', 'alcapao', 'claraboia']) && r4.antes && r4.guizos && r4.lustre, 'os 22 objetos novos; os que trancam (e os de antes: baú, cofre, armário, jaula); o fio com guizos é armadilha; o lustre ilumina: ' + j(r4));

  const inesperados = t.errs.filter(e => !/favicon/.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 8).join('\n'));
  ok(!inesperados.length, 'sem erros no console');
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
