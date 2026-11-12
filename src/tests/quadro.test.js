// Lote 143: o quadro de pistas (TC.quadro e a página quadro/, fora de uma mesa: tudo neste navegador).
// Uso: node src/tests/quadro.test.js   (FOTOS=pasta guarda as fotos)
const { start, checker } = require('./lib');
const { ok, end } = checker();
const Q = require('../../tc/quadro.js');
const j = JSON.stringify;

/* ---------------- a lógica ---------------- */
let q = Q.norm({ n: '  Minha saga ' });
ok(q.n === 'Minha saga' && j(q.cartas) === '{}' && q.fios.length === 0, 'um quadro novo');
q = Q.mudar(q, { t: 'carta', id: 'c1', c: { k: 'nota', x: 100, y: 100, t: 'Quem mentiu?', cor: 'duvida' } });
q = Q.mudar(q, { t: 'carta', id: 'c2', c: { k: 'pessoa', x: 400, y: 100, t: 'Irmão Tobias', d: 'Noviço' } });
q = Q.mudar(q, { t: 'carta', id: 'c3', c: { k: 'img', x: 700, y: 100, url: 'javascript:alert(1)' } });
ok(Object.keys(q.cartas).length === 3 && q.cartas.c1.cor === 'duvida' && !q.cartas.c3.url && q.cartas.c3.t === 'Sem título', 'cartões (o endereço da imagem só https)');
q = Q.mudar(q, { t: 'fio', f: { id: 'f1', a: 'c1', b: 'c2', cor: 'azul', tex: 'corrente', txt: 'suspeito de' } });
q = Q.mudar(q, { t: 'fio', f: { id: 'f2', a: 'c2', b: 'c1', cor: 'roxo' } });
ok(q.fios.length === 1 && q.fios[0].id === 'f2' && q.fios[0].tex === 'barbante', 'um fio só entre dois cartões (o novo troca o velho)');
q = Q.mudar(q, { t: 'fio', f: { id: 'f3', a: 'c1', b: 'zz' } });
ok(q.fios.length === 1, 'fio para cartão que não existe: não');
q = Q.mudar(q, { t: 'mover', id: 'c1', x: 99999, y: -5 });
ok(q.cartas.c1.x === Q.TAM.w - 40 && q.cartas.c1.y === 0, 'mover fica dentro da cortiça');
q = Q.mudar(q, { t: 'tirar', id: 'c2' });
ok(!q.cartas.c2 && q.fios.length === 0, 'tirar o cartão leva os fios dele');
ok(j(Q.partes('quadroj:u1:q123')) === j({ dono: 'u1', qid: 'q123' }) && Q.partes('quadroj:u1') === null && Q.partes('notasj:u1:q') === null, 'o id do documento');
const lq = Q.quadrosEm([{ id: 'quadroj:a:q1', dados: { n: 'A' } }, { id: 'quadroj:b:q2', dados: { n: 'B' }, apagado: true }, { id: 'outro', dados: {} }]);
ok(lq.length === 1 && lq[0].dono === 'a', 'os quadros numa lista de linhas');

/* ---------------- a página ---------------- */
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'quadro', w: 1300, h: 860 });
  const w = ms => P.waitForTimeout(ms);
  const ev = (fn, a) => P.evaluate(fn, a);
  const erros = []; P.on('pageerror', e => erros.push(String(e.message)));
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await P.goto(t.base + 'quadro/?debug', { waitUntil: 'load' }); await w(600);
  await passo('criar', async () => {
    ok(await P.locator('.vazio').isVisible() && /O seu quadro de pistas/.test(await P.locator('.vazio').innerText()), 'sem quadro: o convite');
    await P.locator('.vazio button').click(); await w(150);
    await P.locator('#nQ').fill('Minha saga'); await P.locator('#nOk').click(); await w(250);
    ok(await ev(() => __quadro.quadros().length) === 1 && await P.locator('#selQ option').innerText() === 'Minha saga', 'o quadro "Minha saga"');
  });
  await passo('pregar', async () => {
    await P.locator('#btPregar').click(); await w(150);
    await P.locator('#pT').fill('Quem mentiu?'); await P.locator('#pD').fill('O ferreiro disse que estava na taverna.');
    await P.locator('.cores label', { hasText: 'Dúvida' }).click();
    await P.locator('#pOk').click(); await w(200);
    await P.locator('#btPregar').click(); await w(150);
    await P.locator('[data-aba="pessoa"]').click(); await w(100);
    await P.locator('#pT').fill('Irmão Tobias'); await P.locator('#pD').fill('Noviço. Viu alguém na cripta.');
    await P.locator('#pOk').click(); await w(250);
    const cs = await ev(() => Object.values(__quadro.atual().q.cartas).map(c => c.k + ':' + c.t + ':' + c.cor));
    ok(j(cs.sort()) === j(['nota:Quem mentiu?:duvida', 'pessoa:Irmão Tobias:']), 'uma nota (Dúvida) e uma pessoa: ' + j(cs));
    ok(await P.locator('.carta').count() === 2, 'os dois cartões na cortiça');
  });
  await passo('arrastar', async () => {
    const c = P.locator('.carta.pessoa'), b = await c.boundingBox();
    const antes = await ev(() => Object.values(__quadro.atual().q.cartas).find(c => c.k === 'pessoa').x);
    await P.mouse.move(b.x + 60, b.y + 40); await P.mouse.down(); await P.mouse.move(b.x + 160, b.y + 140, { steps: 6 }); await P.mouse.up(); await w(250);
    const depois = await ev(() => Object.values(__quadro.atual().q.cartas).find(c => c.k === 'pessoa').x);
    ok(depois > antes + 50, 'arrastar o cartão (' + antes + ' → ' + depois + ')');
  });
  await passo('ligar', async () => {
    await P.locator('#fioCor').selectOption('azul'); await P.locator('#fioTex').selectOption('torcido');
    await P.locator('#btLigar').click(); await w(100);
    await P.locator('.carta.nota').click({ position: { x: 30, y: 60 } }); await w(100);
    await P.locator('.carta.pessoa').click({ position: { x: 30, y: 60 } }); await w(300);
    let f = await ev(() => __quadro.atual().q.fios);
    ok(f.length === 1 && f[0].cor === 'azul' && f[0].tex === 'torcido', 'ligar com fio azul torcido');
    await P.keyboard.press('Escape'); await w(100);
    await ev(() => document.querySelector('.fio-h').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await w(200);
    await P.locator('#fT').fill('mentiu para'); await P.locator('#fTex').selectOption('corrente'); await P.locator('#fOk').click(); await w(300);
    f = await ev(() => __quadro.atual().q.fios);
    ok(f[0].txt === 'mentiu para' && f[0].tex === 'corrente' && /mentiu para/.test(await ev(() => document.querySelector('.fio-txt').textContent)), 'o fio com texto e corrente');
  });
  await passo('editar e zoom', async () => {
    await P.locator('.carta.nota [data-ed]').click(); await w(150);
    await P.locator('.cores label', { hasText: 'Certeza' }).click(); await P.locator('#eOk').click(); await w(200);
    ok(await ev(() => Object.values(__quadro.atual().q.cartas).find(c => c.k === 'nota').cor) === 'certo', 'trocar a cor: Certeza');
    const z0 = await ev(() => __quadro.vista.z);
    await P.locator('#zMais').click(); await w(100);
    ok(await ev(() => __quadro.vista.z) > z0, 'zoom');
    await ev(() => __quadro.ajustar()); await w(200);
    if (process.env.FOTOS) await P.screenshot({ path: process.env.FOTOS + '/quadro.png' });
  });
  await passo('a legenda', async () => {
    await P.locator('#btLegenda').click(); await w(200);
    const tx = await P.locator('#legenda').innerText();
    ok(/A cor do fio: o tipo de ligação/.test(tx) && /O crime, o mistério ou o suspeito principal/.test(tx) && /Suspeita: faz sentido, mas falta prova/.test(tx) && await P.locator('#legenda svg').count() === 13, 'o botão Legenda mostra as cores, as texturas (com o desenho) e as cores dos cartões');
    ok(/Vermelho · O crime/.test(await P.locator('#fioCor option').first().innerText()), 'a escolha do fio diz o que quer dizer');
    if (process.env.FOTOS) await P.screenshot({ path: process.env.FOTOS + '/quadro-legenda.png' });
    await P.locator('#legEd').click(); await w(150);
    await P.locator('.leg-ed input[data-g="c"][data-k="azul"]').fill('Família de sangue'); await P.locator('#legOk').click(); await w(250);
    ok(await ev(() => __quadro.atual().q.leg.c.azul) === 'Família de sangue' && /Família de sangue/.test(await P.locator('#legenda').innerText()), 'mudar um significado: vale para este quadro');
    await P.locator('#btLegenda').click(); await w(100);
    ok(await P.locator('#legenda').isHidden(), 'o botão fecha a legenda');
  });
  await passo('vários quadros', async () => {
    await P.locator('#btNovoQ').click(); await w(150);
    await P.locator('#nQ').fill('O mistério da Academia'); await P.locator('#nOk').click(); await w(250);
    ok(await P.locator('#selQ option').count() === 2 && await P.locator('.carta').count() === 0, 'o segundo quadro começa vazio');
    await P.locator('#selQ').selectOption({ label: 'Minha saga' }); await w(250);
    ok(await P.locator('.carta').count() === 2, 'e o primeiro continua lá');
  });
  ok(!erros.length, 'sem erros na página: ' + erros.slice(0, 2).join(' | '));
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
