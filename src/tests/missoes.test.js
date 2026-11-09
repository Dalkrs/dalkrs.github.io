// Missões (lote 123): o núcleo (pegar, desistir, o andamento de cada um, entregar, recolher, as de antes) e a página
// sozinha (tudo neste navegador): as de antes vêm da ficha; quem mestra cria, publica e entrega; quem joga (?jogador) pega,
// desiste e vê as dele; os quatro estilos do quadro.
const { start, checker } = require('./lib');
const M = require('../../tc/missoes.js');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;

// ---- o núcleo ----
let Q = M.doc({ estilo: 'dossie', ms: {
  a: { t: 'Ratos', quem: 'um', o: { o1: { t: 'Limpar', n: 0 } } },
  b: { t: 'O barão', quem: 'todos', o: { o1: { t: 'Entrar', n: 0 }, o2: { t: 'Sair', n: 1 } } },
  c: { t: 'A ponte', quem: 'grupo' } } });
ok(Q.estilo === 'dossie' && Q.ms.a.e === 'oferta' && M.noQuadro(Q).length === 3, 'o quadro: três para pegar, no estilo dossiê');
let r = M.pegar(Q, 'a', 'p1', 'u1', 5);
ok(!r.erro && r.quadro.ms.a.e === 'ativa' && r.quadro.ms.a.pegas.p1.u === 'u1' && M.noQuadro(r.quadro).length === 2, '“Só um pega”: pegou, sai do quadro');
ok(M.pegar(r.quadro, 'a', 'p2', 'u2').erro === 'Alguém pegou esta missão antes.', 'e ninguém mais pega');
Q = r.quadro;
Q = M.pegar(Q, 'b', 'p1', 'u1').quadro; Q = M.pegar(Q, 'b', 'p2', 'u2').quadro;
ok(Object.keys(Q.ms.b.pegas).length === 2 && M.noQuadro(Q).some(m => m.id === 'b'), '“Cada um pega a sua”: dois pegaram, e ela continua no quadro');
ok(M.pegar(Q, 'b', 'p1', 'u1').erro, 'o mesmo personagem não pega duas vezes');
Q = M.marcarObjetivo(Q, 'b', 'o1', true, 'p1');
ok(M.andamento(Q.ms.b, 'p1').feitos === 1 && M.andamento(Q.ms.b, 'p2').feitos === 0, 'cada um com o próprio andamento');
Q = M.pegar(Q, 'c', 'p2', 'u2').quadro;
ok(M.doGrupo(Q).length === 1 && M.doPersonagem(Q, null, 'p1').some(m => m.id === 'c'), '“Do grupo”: um pegou, vale para todos');
let P1 = M.doc({ ms: { h: { t: 'A carta', quem: 'pc' } } });
ok(j(M.doPersonagem(Q, P1, 'p1').map(m => m.id).sort()) === j(['a', 'b', 'c', 'h']), 'as do personagem: a da história, as que ele pegou e as do grupo');
r = M.desistir(Q, P1, 'a', 'p1');
ok(r.voltou && r.quadro.ms.a.e === 'oferta' && !Object.keys(r.quadro.ms.a.pegas).length, 'desistir da do quadro: volta para o quadro');
r = M.desistir(Q, P1, 'b', 'p1');
ok(r.voltou && !r.quadro.ms.b.pegas.p1 && r.quadro.ms.b.pegas.p2, 'em “Cada um pega a sua”, só sai quem desistiu');
r = M.desistir(Q, P1, 'h', 'p1');
ok(r.falhou && r.pc.ms.h.e === 'falhou', 'desistir da da história: falhou');
ok(M.desistir(Q, r.pc, 'h', 'p1').erro, 'e não desiste duas vezes');
let R = M.doc({ ms: { d: { t: 'Rascunho', quem: 'um' }, e: { t: 'Segredo', quem: 'pc', alvo: 'p2' } } });
let x = M.publicar(R, Q, 'd');
ok(x && x.quadro.ms.d.e === 'oferta' && !x.rasc.ms.d, 'publicar: do rascunho para o quadro');
ok(M.publicar(R, Q, 'e') === null, 'a da história não vai para o quadro');
x = M.entregar(R, null, 'e');
ok(x && x.pc.ms.e.e === 'ativa' && x.pc.ms.e.quem === 'pc' && !x.pc.ms.e.alvo, 'entregar: vai para o personagem, ativa');
x = M.recolher(Q, R, 'c', null);
ok(x && !x.de.ms.c && x.rasc.ms.c.e === 'oferta', 'recolher: volta para os rascunhos, sem quem pegou');
// as de antes
const v = M.migrar({ grupo: { g: { t: 'Velha do grupo', e: 'feita', o: { o1: { t: 'A', ok: 1 } } } }, grupoOcultas: { s: { t: 'Escondida' } },
  pcs: [{ id: 'p1', mis: { m1: { t: 'Pessoal', de: 'j' } }, ocultas: { m2: { t: 'Ainda não' } } }] }, null, null, {});
ok(v.n === 4 && v.quadro.mig && v.quadro.ms.g.quem === 'grupo' && v.quadro.ms.g.e === 'feita' && v.quadro.ms.g.ok.o1 === 1 && v.rasc.ms.s && v.rasc.ms.m2.alvo === 'p1' && v.pcs.p1.ms.m1.quem === 'pc',
  'as de antes: a do grupo vai para o quadro (com o estado e os objetivos), as escondidas para os rascunhos, a do personagem para o documento dele');
ok(j(M.resumo(v.quadro, v.pcs.p1, 'p1').map(m => m.t)) === j(['Pessoal']), 'o resumo da ficha: só as em andamento');
ok(M.missao({ pe: 9, quem: 'x', t: 'a'.repeat(300) }).pe === 5 && M.missao({ quem: 'x' }).quem === 'grupo' && M.missao({ t: 'a'.repeat(300) }).t.length === 120, 'a missão limpa: perigo até 5, tipo conhecido, título curto');

(async () => {
  const s = await start();
  const dv = await s.device({ name: 'missoes', w: 1300, h: 900 });
  const pg = dv.page;
  pg.setDefaultTimeout(8000);
  const erros = [];
  pg.on('pageerror', e => erros.push(String(e.message)));
  const doc = id => pg.evaluate(id => (JSON.parse(localStorage.getItem('tinycats:missoes:local') || '{}') || {})[id] || null, id);
  const dlg = pg.locator('dialog#dlg');
  try {
    await pg.goto(s.base + 'missoes/?debug', { waitUntil: 'load' });
    // as fichas deste navegador, com as missões de antes
    await pg.evaluate(() => {
      localStorage.removeItem('tinycats:missoes:local');
      localStorage.setItem('urgm_calc_atributos_v1', JSON.stringify({ v: 1, personagens: [
        { id: 'p1', nome: 'Kael', estado: { mis: { a1: { t: 'Vingar o mestre', e: 'ativa', c: 5, o: { o1: { t: 'Achar a máscara', n: 0, ok: 1 }, o2: { t: 'Ir ao porto', n: 1 } } } } } },
        { id: 'p2', nome: 'Lia', estado: {} }],
        missoes: { g1: { t: 'Escoltar a caravana', e: 'ativa', c: 3 } },
        segredos: { mis: { g: { g2: { t: 'O traidor', c: 9 } } } } }));
    });
    await pg.reload({ waitUntil: 'load' }); await espera(500);
    let Qd = await doc('fichas:mis:quadro');
    ok(Qd && Qd.mig && Qd.estilo === 'mural' && Qd.ms.g1 && Qd.ms.g1.quem === 'grupo' && (await doc('fichas:mis:rasc')).ms.g2 && (await doc('fichas:mis:pc:p1')).ms.a1, 'as de antes vieram da ficha: a do grupo para o quadro, a escondida para os rascunhos, a do Kael para o documento dele');
    ok(/3 missões/.test(await pg.locator('.toast').first().innerText()), 'e avisa');
    await pg.click('[data-aba="andamento"]'); await espera(150);
    ok(await pg.locator('.mc[data-mis="g1"]').count() === 1 && await pg.locator('.mc[data-mis="a1"]').count() === 1 && /1\/2/.test(await pg.locator('.mc[data-mis="a1"] .prog').innerText()), 'Em andamento: a do grupo e a do Kael (1/2 objetivos)');
    // criar uma missão e publicar
    await pg.click('#btNova');
    await pg.fill('#fTit', 'Ratos no porão'); await pg.fill('#fCt', 'Dona Berta'); await pg.fill('#fDesc', 'Algo rói os barris.'); await pg.fill('#fRec', '50 lapros');
    await pg.click('#fObjMais'); await pg.locator('#fObjs input').first().fill('Limpar o porão');
    await pg.locator('#fPe button').nth(2).click();
    await pg.selectOption('#fQuem', 'um');
    await pg.click('#fPublicar'); await espera(200);
    Qd = await doc('fichas:mis:quadro');
    const rid = Object.keys(Qd.ms).find(k => Qd.ms[k].t === 'Ratos no porão');
    ok(rid && Qd.ms[rid].ct === 'Dona Berta' && Qd.ms[rid].pe === 2 && Qd.ms[rid].e === 'oferta' && Object.values(Qd.ms[rid].o)[0].t === 'Limpar o porão' && !(await doc('fichas:mis:rasc')).ms[rid], 'nova missão publicada no quadro: quem pede, perigo, objetivo');
    // uma da história, entregue à Lia
    await pg.click('#btNova');
    await pg.fill('#fTit', 'A carta da irmã'); await pg.selectOption('#fQuem', 'pc'); await pg.selectOption('#fAlvo', 'p2');
    ok((await pg.locator('#fPublicar').innerText()) === 'Entregar ao personagem', 'na da história, o botão é “Entregar ao personagem”');
    await pg.click('#fPublicar'); await espera(200);
    const P2 = await doc('fichas:mis:pc:p2'), hid = P2 && Object.keys(P2.ms)[0];
    ok(hid && P2.ms[hid].t === 'A carta da irmã' && P2.ms[hid].e === 'ativa', 'entregue direto à Lia');
    // várias ocultas de uma vez
    for (const t of ['Lobo na trilha', 'O poço seco']) { await pg.click('#btNova'); await pg.fill('#fTit', t); await pg.selectOption('#fQuem', 'todos'); await pg.click('#fSalvar'); await espera(150); }
    ok(await pg.locator('[data-aba="rascunhos"]').innerText() === 'Ocultas (3)' && await pg.evaluate(() => __mis.aba) === 'rascunhos', 'guardadas ocultas: a aba “Ocultas” (com a do traidor, que já estava)');
    const ocs = await pg.evaluate(() => Object.keys(__mis.rasc().ms).filter(k => /Lobo|poço/.test(__mis.rasc().ms[k].t)));
    for (const k of ocs) await pg.check('[data-marca="' + k + '"]');
    ok((await pg.locator('#mRevelarMarcadas').innerText()) === 'Revelar as marcadas (2)' && !(await dlg.isVisible()), 'marcou duas (sem abrir a missão)');
    await pg.click('#mRevelarMarcadas'); await espera(200);
    Qd = await doc('fichas:mis:quadro');
    ok(ocs.every(k => Qd.ms[k] && Qd.ms[k].e === 'oferta') && Object.keys((await doc('fichas:mis:rasc')).ms).length === 1 && /2 missões reveladas/.test(await pg.locator('.toast').last().innerText()), 'reveladas as duas de uma vez: estão no quadro');
    // e voltar a ocultar
    await pg.click('[data-aba="quadro"]'); await pg.click('.mc[data-mis="' + ocs[0] + '"]'); await pg.click('#mRecolher'); await espera(150);
    ok(!(await doc('fichas:mis:quadro')).ms[ocs[0]] && (await doc('fichas:mis:rasc')).ms[ocs[0]], '“Ocultar de novo”: some do quadro e volta para as ocultas');
    // o estilo
    for (const e of ['dossie', 'ordem', 'diario', 'mural']) {
      await pg.selectOption('#estilo', e); await espera(120);
      ok((await doc('fichas:mis:quadro')).estilo === e && await pg.evaluate(() => document.body.dataset.estilo) === e, 'estilo do quadro: ' + e);
    }
    await pg.click('[data-aba="quadro"]'); await espera(150);
    ok(await pg.locator('.mc[data-mis="' + rid + '"] .pino').count() === 1, 'no mural, o cartaz tem o pino');

    // ---- quem joga ----
    await pg.goto(s.base + 'missoes/?debug&jogador', { waitUntil: 'load' }); await espera(400);
    ok(!(await pg.locator('#btNova').isVisible()) && !(await pg.locator('#estilo').isVisible()), 'quem joga não cria nem troca o estilo');
    ok(await pg.locator('#pcs button').count() === 2, 'com dois personagens, escolhe de quem é a vez');
    await pg.click('[data-aba="quadro"]'); await espera(150);
    await pg.click('.mc[data-mis="' + rid + '"]'); await espera(150);
    await pg.selectOption('#mPegarCom', 'p2'); await pg.click('#mPegar'); await espera(200);
    Qd = await doc('fichas:mis:quadro');
    ok(Qd.ms[rid].e === 'ativa' && Qd.ms[rid].pegas.p2 && await pg.locator('.mc[data-mis="' + rid + '"]').count() === 0, 'pegou com a Lia: saiu do quadro');
    await pg.click('#pcs [data-pc="p2"]'); await pg.click('[data-aba="minhas"]'); await espera(150);
    ok(await pg.locator('.mc[data-mis="' + rid + '"]').count() === 1 && await pg.locator('.mc[data-mis="' + hid + '"]').count() === 1, 'Minhas missões (Lia): a que pegou e a da história');
    await pg.click('.mc[data-mis="' + rid + '"]'); await pg.click('#mDesistir'); await pg.click('#mDesistirSim'); await espera(200);
    ok((await doc('fichas:mis:quadro')).ms[rid].e === 'oferta', 'desistiu: voltou para o quadro');
    await pg.click('.mc[data-mis="' + hid + '"]'); await pg.click('#mDesistir');
    ok(/conta como falha/.test(await dlg.innerText()), 'a da história avisa que conta como falha');
    await pg.click('#mDesistirSim'); await espera(200);
    ok((await doc('fichas:mis:pc:p2')).ms[hid].e === 'falhou' && /Falhou/i.test(await pg.locator('.mc[data-mis="' + hid + '"]').innerText()), 'e fica como falha, nas encerradas');
    await pg.click('[data-aba="grupo"]'); await espera(150);
    ok(await pg.locator('.mc[data-mis="g1"]').count() === 1, 'Do grupo: a caravana');
    await pg.click('.mc[data-mis="g1"]'); await espera(100);
    ok(await pg.locator('#mEstado, #mEditar, #mApagar').count() === 0, 'quem joga não muda o estado, não edita, não apaga');
    await pg.keyboard.press('Escape');

    // ---- quem mestra de novo: marcar e encerrar ----
    await pg.goto(s.base + 'missoes/?debug', { waitUntil: 'load' }); await espera(400);
    await pg.click('[data-aba="andamento"]'); await pg.click('.mc[data-mis="a1"]'); await espera(100);
    await pg.locator('dialog input[data-obj]').nth(1).check(); await espera(150);
    await pg.selectOption('#mEstado', 'feita'); await espera(200);
    const A1 = (await doc('fichas:mis:pc:p1')).ms.a1;
    ok(A1.ok.o2 === 1 && A1.e === 'feita', 'quem mestra marca o objetivo e encerra: cumprida');
    await pg.keyboard.press('Escape'); await pg.click('[data-aba="encerradas"]'); await espera(150);
    ok(await pg.locator('.mc[data-mis="a1"] .carimbo.ok').count() === 1, 'nas encerradas, com o carimbo');
    await pg.screenshot({ path: __dirname + '/_missoes.png' });
    ok(!erros.length, 'sem erros na página: ' + erros.join(' | '));
  } catch (e) { ok(false, 'falhou: ' + e.message); }
  await s.close();
  end();
})();
