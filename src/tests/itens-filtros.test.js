// Lote 113: os filtros da aba Itens (sem mesa, com o catálogo, as lojas e as receitas do mundo novo):
//   · Catálogo: tipo, peça, raridade, faixa, preço e onde está (em loja, sem loja, em receita, numa loja escolhida),
//     com a contagem de cada botão, "X de Y" e "Limpar filtros"; a busca olha o nome e o efeito;
//   · Lojas: aberta/fechada, mercado negro; a busca acha a loja pelo item que ela vende;
//   · Receitas: o tipo do resultado; a busca olha os ingredientes.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const fixture = require('fs').readFileSync(__dirname + '/itens-fixture-113.json', 'utf8');
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'itens113', w: 1280, h: 960, seed: { 'tinycats:itens:local': fixture } });
  P.setDefaultTimeout(8000);
  const w = ms => P.waitForTimeout(ms);
  const erros = []; P.on('pageerror', e => erros.push(String(e.message)));
  const conta = async () => (await P.locator('.fconta').innerText()).replace(/\s+/g, ' ');
  const linhas = () => P.locator('#meio [data-item]').count();
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n').slice(0, 6).join(' / ')); } };
  await P.goto(t.base + 'itens/?debug', { waitUntil: 'load' }); await w(700);

  await passo('o catálogo', async () => {
    ok((await conta()) === '289 de 289', 'sem filtro: 289 de 289');
    await P.locator('[data-f="catalogo:t:equip"]').click(); await w(150);
    ok((await conta()) === '132 de 289' && (await linhas()) === 132, 'Equipamento: 132');
    await P.locator('[data-f="catalogo:peca:arma"]').click(); await w(150);
    ok((await conta()) === '65 de 289', 'Arma: 65');
    const f3 = await P.locator('[data-f="catalogo:faixa:3"] small').innerText();
    await P.locator('[data-f="catalogo:faixa:3"]').click(); await w(150);
    ok((await conta()) === f3 + ' de 289' && +f3 > 5, 'a contagem do botão F3 bate com o resultado (' + f3 + ')');
    await P.locator('[data-f="catalogo:faixa:3"]').click(); await w(150);
    ok((await conta()) === '65 de 289', 'clicar de novo desliga');
    await P.locator('[data-f="catalogo:t:pocao"]').click(); await w(150);
    ok(await P.locator('[data-f^="catalogo:peca:"]').count() === 0, 'Poção: some o grupo Peça (e o filtro dele sai)');
    ok((await conta()) === '24 de 289', 'Poção: 24');
    await P.locator('#f-limpar').click(); await w(150);
    ok((await conta()) === '289 de 289', 'Limpar filtros');
  });

  await passo('a busca e onde está', async () => {
    await P.locator('#busca').fill('vampiro'); await w(200);
    const n = +(await conta()).split(' ')[0];
    ok(n >= 3 && await P.locator('#meio [data-item="ar_espada_amonite"]').count() === 1 && await P.locator('#meio [data-item="fe_alho"]').count() === 1, 'buscar "vampiro" acha pelo efeito (Espada de Amonite, alho): ' + n);
    await P.locator('#f-limpar').click(); await w(150);
    await P.locator('[data-f="catalogo:onde:semloja"]').click(); await w(150);
    const sem = +(await conta()).split(' ')[0];
    await P.locator('[data-f="catalogo:onde:semloja"]').click(); await P.locator('[data-f="catalogo:onde:loja"]').click(); await w(150);
    const com = +(await conta()).split(' ')[0];
    ok(sem + com === 289 && com > 50, 'em loja + sem loja = 289 (' + com + ' + ' + sem + ')');
    await P.locator('[data-f="catalogo:onde:loja"]').click(); await w(100);
    await P.selectOption('#f-loja', 'l:hemvria_negro'); await w(150);
    const n2 = +(await conta()).split(' ')[0];
    ok(n2 > 0 && n2 < 40, 'Vendido em: Porão do Corvo (' + n2 + ')');
    await P.locator('[data-f="catalogo:onde:receita"]').click(); await w(150);
    await P.locator('#f-limpar').click(); await w(150);
    await P.locator('[data-f="catalogo:onde:receita"]').click(); await w(150);
    ok(+(await conta()).split(' ')[0] > 20, 'Em receita: ' + (await conta()));
    await P.locator('#f-limpar').click(); await w(150);
  });

  await passo('lojas e receitas', async () => {
    await P.locator('#aba-lojas').click(); await w(200);
    ok((await conta()) === '22 de 22', 'Lojas: 22');
    await P.locator('[data-f="lojas:tipo:negro"]').click(); await w(150);
    ok((await conta()) === '3 de 22', 'Mercado negro: 3');
    await P.locator('[data-f="lojas:sit:fechada"]').click(); await w(150);
    ok((await conta()) === '3 de 22', 'e fechadas: as 3');
    await P.locator('#f-limpar').click(); await w(150);
    await P.locator('#busca').fill('katana'); await w(200);
    ok(+(await conta()).split(' ')[0] >= 1 && await P.locator('#meio [data-loja="kitsune_laminas"]').count() === 1, 'buscar "katana" acha a loja que vende');
    await P.locator('#aba-receitas').click(); await w(200);
    ok((await conta()) === '28 de 28', 'Receitas: 28 (a busca limpa ao trocar de aba)');
    await P.locator('[data-f="receitas:res:bomba"]').click(); await w(150);
    const nb = +(await conta()).split(' ')[0];
    ok(nb > 0 && nb < 28, 'Resultado bomba: ' + nb);
    if (process.env.FOTOS) { await P.locator('#aba-catalogo').click(); await w(200); await P.locator('[data-f="catalogo:t:equip"]').click(); await w(150); await P.screenshot({ path: process.env.FOTOS + '/l113-filtros.png' }); }
  });

  ok(!erros.length, 'sem erro na página: ' + erros.join(' | '));
  await t.close();
  end();
})();
