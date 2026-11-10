// Missões (lote 129): o tipo da missão (principal ou secundária), o objetivo opcional e o que os marcadores de missão das
// Cenas e do Mapa-múndi leem (achar a missão em qualquer documento, a situação dela e a de um objetivo opcional).
const { start, checker } = require('./lib');
const M = require('../../tc/missoes.js');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));

// ---- o núcleo ----
ok(M.missao({ quem: 'um' }).tp === 'secundaria' && M.missao({ quem: 'pc' }).tp === 'principal', 'sem tipo: a da história é principal, as outras secundárias');
ok(M.missao({ quem: 'um', tp: 'principal' }).tp === 'principal' && M.missao({ tp: 'xx' }).tp === 'secundaria', 'o tipo escolhido fica; um tipo estranho vira secundária');
const m0 = M.missao({ o: { a: { t: 'Entrar', n: 0 }, b: { t: 'Roubar o cálice', n: 1, op: 1 } } });
ok(!m0.o.a.op && m0.o.b.op === 1 && M.objs(m0)[1].op === true && M.objs(m0)[0].op === false, 'o objetivo opcional fica marcado (op)');
const linhas = [
  { id: 'fichas:mis:rasc', dados: { ms: { r1: { t: 'Oculta', quem: 'um', o: { x: { t: 'X', op: 1 } } } } } },
  { id: 'fichas:mis:quadro@c1', dados: { ms: { q1: { t: 'O barão', quem: 'grupo', tp: 'principal', e: 'ativa', ok: { b: 1 }, o: { a: { t: 'Entrar' }, b: { t: 'O cálice', op: 1 } } },
    q2: { t: 'Ratos', quem: 'todos', pegas: { p1: { e: 'feita' }, p2: { e: 'ativa', ok: { c: 1 } } }, o: { c: { t: 'Queijo', op: 1 } } } } } },
  { id: 'fichas:mis:pc:p1', dados: { ms: { h1: { t: 'A carta', quem: 'pc', e: 'falhou', o: { d: { t: 'Ler', op: 1 } } } } } },
  { id: 'fichas:mis:quadro', apagado: true, dados: { ms: { z: { t: 'Apagada' } } } }];
const a1 = M.acharEmDocs(linhas, 'q1');
ok(a1 && a1.onde === 'quadro' && a1.docId === 'fichas:mis:quadro@c1' && a1.m.t === 'O barão', 'acha a missão no quadro da campanha');
ok(M.acharEmDocs(linhas, 'r1').onde === 'rasc' && M.acharEmDocs(linhas, 'h1').onde === 'pc' && !M.acharEmDocs(linhas, 'z') && !M.acharEmDocs(linhas, 'nada'), 'nos rascunhos, no do personagem; a do documento apagado e a que não existe, não');
let k = M.marcador(a1);
ok(k.t === 'O barão' && k.tp === 'principal' && k.tpN === 'Principal' && k.e === 'ativa' && !k.ot, 'o marcador da missão: título, tipo e situação');
k = M.marcador(a1, 'b');
ok(k.ot === 'O cálice' && k.op && k.e === 'feita', 'o marcador do objetivo opcional: feito quando marcado');
ok(M.marcador(a1, 'a').e === 'ativa' && !M.marcador(a1, 'nao'), 'o objetivo por fazer continua ativo; um objetivo que saiu não tem marcador');
ok(M.marcador(M.acharEmDocs(linhas, 'r1')).e === 'oculta' && M.marcador(M.acharEmDocs(linhas, 'r1'), 'x').e === 'oculta', 'nos rascunhos: oculta (a missão e o opcional)');
ok(M.marcador(M.acharEmDocs(linhas, 'q2')).e === 'ativa' && M.marcador(M.acharEmDocs(linhas, 'q2'), 'c').e === 'feita', '“Cada um pega a sua”: ativa enquanto alguém faz; o opcional, feito por alguém');
ok(M.marcador(M.acharEmDocs(linhas, 'h1')).e === 'falhou' && M.marcador(M.acharEmDocs(linhas, 'h1'), 'd').e === 'falhou', 'a missão falhou: o opcional também');
ok(M.situacao(M.missao({ quem: 'todos', pegas: { a: { e: 'feita' }, b: { e: 'falhou' } } }), 'quadro') === 'feita' && M.situacao(M.missao({ quem: 'todos' }), 'quadro') === 'oferta', 'a situação de “Cada um”: feita se alguém cumpriu e ninguém mais faz; sem ninguém, no quadro');

// ---- a página ----
(async () => {
  const s = await start();
  const dv = await s.device({ name: 'missoes129', w: 1300, h: 900 });
  const pg = dv.page;
  pg.setDefaultTimeout(8000);
  const erros = [];
  pg.on('pageerror', e => erros.push(String(e.message)));
  const doc = id => pg.evaluate(id => (JSON.parse(localStorage.getItem('tinycats:missoes:local') || '{}') || {})[id] || null, id);
  try {
    await pg.goto(s.base + 'missoes/?debug', { waitUntil: 'load' });
    await pg.evaluate(() => { localStorage.removeItem('tinycats:missoes:local'); localStorage.setItem('urgm_calc_atributos_v1', JSON.stringify({ v: 1, personagens: [{ id: 'p1', nome: 'Kael', estado: {} }] })); });
    await pg.reload({ waitUntil: 'load' }); await espera(400);
    await pg.click('#btNova'); await espera(100);
    ok(await pg.locator('#fTp').inputValue() === 'secundaria', 'a missão nova nasce secundária');
    await pg.fill('#fTit', 'O cálice do barão');
    await pg.selectOption('#fTp', 'principal');
    await pg.click('#fObjMais'); await pg.locator('#fObjs input.in').nth(0).fill('Entrar na mansão');
    await pg.click('#fObjMais'); await pg.locator('#fObjs input.in').nth(1).fill('Roubar o cálice');
    await pg.locator('#fObjs .fop input').nth(1).check();
    await pg.click('#fSalvar'); await espera(250);
    const R = await doc('fichas:mis:rasc'), id = Object.keys(R.ms).find(k => R.ms[k].t === 'O cálice do barão'), m = R.ms[id];
    const os = Object.values(m.o).sort((a, b) => a.n - b.n);
    ok(m.tp === 'principal' && !os[0].op && os[1].op === 1, 'guardou principal, com o segundo objetivo opcional');
    ok(/Principal/.test(await pg.locator('.mc[data-mis="' + id + '"] .tp').innerText()), 'o cartaz mostra “Principal”');
    await pg.click('.mc[data-mis="' + id + '"]'); await espera(150);
    const fl = await pg.locator('dialog#dlg').innerText();
    ok(/Missão\s*Principal/.test(fl) && (await pg.locator('dialog#dlg .objs .op').count()) === 1, 'a folha: o tipo e a etiqueta “opcional” no objetivo');
    await pg.click('#mEditar'); await espera(100);
    ok(await pg.locator('#fTp').inputValue() === 'principal' && await pg.locator('#fObjs .fop input').nth(1).isChecked() && !(await pg.locator('#fObjs .fop input').nth(0).isChecked()), 'ao editar, o tipo e o opcional voltam como estavam');
    // (o marcador das Cenas pede a missão pelo id: ela abre onde estiver)
    await pg.keyboard.press('Escape'); await espera(100);
    await pg.evaluate(id => __mis.abrirDeFora(id, null), id); await espera(150);
    ok(/O cálice do barão/.test(await pg.locator('dialog#dlg').innerText()) && await pg.evaluate(() => __mis.aba) === 'rascunhos', 'pedida de fora (o marcador das Cenas): abre nos rascunhos, onde ela está');
    await pg.keyboard.press('Escape'); await espera(100);
    await pg.evaluate(() => __mis.abrirDeFora('naoexiste', null)); await espera(150);
    ok(/não está mais/.test(await pg.locator('.toast').last().innerText()), 'a que não existe: avisa');
    ok(!erros.length, 'sem erros na página: ' + erros.join(' | '));
  } catch (e) { ok(false, 'falhou: ' + e.message); }
  await s.close();
  end();
})();
