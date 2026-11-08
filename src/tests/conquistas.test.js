// Conquistas (lote 117): o núcleo (liberar, tirar, o que cada um vê, o anúncio) e a página sozinha (no modo de quem
// mestra, tudo neste navegador): as 40 de começo, criar uma com ícone, liberar, editar, tirar e apagar.
const { start, checker } = require('./lib');
const C = require('../../tc/conquistas.js');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
// ---- o núcleo ----
ok(C.PADRAO.length >= 30 && C.PADRAO.length <= 40, 'entre 30 e 40 conquistas de começo: ' + C.PADRAO.length);
ok(new Set(C.PADRAO.map(x => x.id)).size === C.PADRAO.length, 'ids únicos');
ok(C.PADRAO.every(x => C.ICONES[x.ic]), 'todas com ícone que existe');
ok(C.PADRAO.filter(x => !x.oculta).every(x => x.rar === 'comum') && C.PADRAO.filter(x => x.oculta).every(x => x.rar !== 'comum'), 'comuns à mostra; raras, épicas e lendárias ocultas');
ok(Object.keys(C.ICONES).length >= 40, 'ícones para o mestre: ' + Object.keys(C.ICONES).length);
let L = C.lista(null), P = C.projetar(L, null);
const oc = P.itens.find(x => x.id === 'cq_teceloes');
ok(oc && !('nome' in oc) && !('desc' in oc) && !('ic' in oc), 'na parte de todos, a oculta não leva nome, descrição nem ícone');
ok(P.itens.find(x => x.id === 'cq_primeiro_sangue').nome === 'Primeiro Sangue', 'a comum vai inteira');
let r = C.conceder(L, P, null, 'cq_teceloes', 'u1', 1000);
ok(!r.erro && r.jog.itens[0].nome === 'Os Fios do Reino' && r.pub.log.length === 1, 'liberar: a conquista inteira vai para o documento do jogador e o anúncio para o registro');
ok(C.conceder(r.lista, r.pub, r.jog, 'cq_teceloes', 'u1', 2000).erro, 'não libera duas vezes para o mesmo');
const an = C.anuncio(r.pub.log[0], r.pub, 'u2', null, null, () => 'Dain');
ok(an.oculta && an.titulo === 'Dain conquistou uma conquista Épica!' && !an.nome, 'o anúncio da épica, para os outros: só a raridade');
ok(C.anuncio(r.pub.log[0], r.pub, 'u1', r.jog, null, () => 'Dain').nome === 'Os Fios do Reino', 'para quem ganhou: o nome');
const r2 = C.conceder(r.lista, r.pub, null, 'cq_primeiro_sangue', 'u2', 3000);
ok(C.anuncio(r2.pub.log[1], r2.pub, 'u1', null, null, () => 'Lia').titulo === 'Lia conquistou: Primeiro Sangue!', 'a comum: inteira para todos');
const t = C.tirar(r2.lista, r2.pub, r.jog, 'cq_teceloes', 'u1');
ok(t.jog.itens.length === 0 && t.pub.log.length === 1 && t.pub.itens.find(x => x.id === 'cq_teceloes').quem.length === 0, 'tirar');
(async () => {
  const s = await start();
  const dv = await s.device({ name: 'conquistas', w: 1300, h: 900 });
  const pg = dv.page;
  pg.setDefaultTimeout(8000);
  const erros = [];
  pg.on('pageerror', e => erros.push(String(e.message)));
  const doc = id => pg.evaluate(id => (JSON.parse(localStorage.getItem('tinycats:conquistas:local') || '{}') || {})[id] || null, id);
  try {
    await pg.goto(s.base + 'conquistas/', { waitUntil: 'load' });
    await pg.evaluate(() => localStorage.removeItem('tinycats:conquistas:local'));
    await pg.reload({ waitUntil: 'load' }); await pg.waitForSelector('.cq'); await espera(200);
    ok(await pg.locator('.cq').count() === C.PADRAO.length, 'o catálogo de começo na tela');
    ok((await doc('conq:lista')).itens.length === C.PADRAO.length && (await doc('conq:pub')).itens.length === C.PADRAO.length, 'o catálogo e a parte de todos gravados');
    // filtro
    await pg.locator('#filtro').getByRole('button', { name: 'Lendária' }).click(); await espera(100);
    ok(await pg.locator('.cq').count() === C.PADRAO.filter(x => x.rar === 'lendaria').length, 'o filtro de raridade');
    await pg.locator('#filtro').getByRole('button', { name: 'Todas' }).click(); await espera(100);
    // criar
    await pg.getByRole('button', { name: 'Nova conquista' }).click();
    await pg.locator('dialog input.in').first().fill('Matador de Goblins');
    await pg.locator('dialog textarea').fill('Derrotar 20 goblins.');
    await pg.locator('dialog select').selectOption('epica');
    ok(await pg.locator('dialog input[type=checkbox]').isChecked(), 'épica nova: oculta sozinha');
    await pg.locator('dialog .icones').getByRole('button', { name: 'Caveira' }).click();
    await pg.locator('dialog').getByRole('button', { name: 'Criar' }).click(); await espera(200);
    const L2 = await doc('conq:lista'), nova = L2.itens.find(x => x.nome === 'Matador de Goblins');
    ok(nova && nova.ic === 'caveira' && nova.rar === 'epica' && nova.oculta, 'criada com o ícone escolhido');
    ok(!('nome' in (await doc('conq:pub')).itens.find(x => x.id === nova.id)), 'na parte de todos, sem o nome');
    // liberar
    const card = pg.locator('[data-cq="' + nova.id + '"]');
    await card.getByRole('button', { name: 'Liberar…' }).click();
    await pg.locator('dialog').getByRole('button', { name: 'Liberar' }).click(); await espera(200);
    let J = await doc('conq:j:local');
    ok(J && J.itens.length === 1 && J.itens[0].nome === 'Matador de Goblins', 'liberada: entra no documento do jogador');
    ok((await card.innerText()).includes('Você'), 'o cartão mostra quem ganhou');
    // editar: quem ganhou recebe a versão nova
    await card.getByRole('button', { name: 'Editar' }).click();
    await pg.locator('dialog input.in').first().fill('Terror dos Goblins');
    await pg.locator('dialog').getByRole('button', { name: 'Salvar' }).click(); await espera(200);
    J = await doc('conq:j:local');
    ok(J.itens[0].nome === 'Terror dos Goblins' && J.itens[0].em > 0, 'editar: quem já ganhou recebe a versão nova');
    // tirar
    await card.getByRole('button', { name: /Tirar de/ }).click();
    await pg.locator('dialog').getByRole('button', { name: 'Tirar' }).click(); await espera(200);
    ok((await doc('conq:j:local')).itens.length === 0 && (await doc('conq:pub')).log.length === 0, 'tirar: sai do jogador e do registro');
    // apagar
    await card.getByRole('button', { name: 'Apagar' }).click();
    await pg.locator('dialog').getByRole('button', { name: 'Apagar' }).click(); await espera(200);
    ok(!(await doc('conq:lista')).itens.some(x => x.id === nova.id) && await pg.locator('[data-cq="' + nova.id + '"]').count() === 0, 'apagar');
    await pg.screenshot({ path: __dirname + '/_conquistas.png' });
    ok(!erros.length, 'sem erros na página: ' + erros.join(' | '));
  } catch (e) { ok(false, 'falhou: ' + e.message); }
  await s.close();
  end();
})();
