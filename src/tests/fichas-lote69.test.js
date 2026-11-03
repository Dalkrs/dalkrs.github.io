// Lote 69: a ficha em Jogando e Editar (sem mesa, no navegador):
//   · abre em Jogando: o nome em destaque, sem o cadastro (Quem é, a tabela dos tiers); Simples/Completo some;
//   · no resumo, um clique no número rola com o equipamento, e o "base" embaixo rola sem; a rolagem aparece no resumo;
//   · Editar traz o cadastro; + Pet, Duplicar e Excluir ficam no "⋯"; Tabelas base, Importar e Apagar dados, no "⋯" de cima.
const { start, checker } = require('./lib');
const { ok, end } = checker();
(async () => {
  const t = await start();
  const d = await t.device({ name: 'ficha', w: 1300, h: 900, jogando: true, fechado: true });
  const P = d.page;
  const w = ms => P.waitForTimeout(ms || 250);
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1500);
  const vis = sel => P.locator(sel).first().isVisible().catch(() => false);
  ok(await P.locator('#fmodoJogando').getAttribute('aria-checked') === 'true', 'a ficha abre em Jogando');
  ok(await vis('.rsnomej') && !(await vis('#f_nome')) && !(await vis('#quemE')) && !(await vis('#painelTabAtr')), 'no Jogando: o nome em destaque, sem o campo do nome, o Quem é e a tabela dos tiers');
  ok(!(await vis('.modoseg')), 'Simples e Completo somem no Jogando');
  ok(!(await vis('[data-act="dup"]')) && await vis('#fmais > summary'), 'Duplicar e Excluir ficam no "⋯"');
  // um equipamento que soma na Força, para a base e o total serem diferentes
  await P.evaluate(() => { const pc = S.personagens.find(p => p.id === S.sel); pc.itens = (pc.itens || []).concat([{ id: 'it_t69', nome: 'Manopla', equipado: true, bonus: [{ k: 'FOR', v: 5 }], mods: { FOR: 5 } }]); pc.rol = { fixa: 0, fonte: 'total' }; save(); renderFicha(); });
  await w(300);
  const v = await P.evaluate(() => { const pc = S.personagens.find(p => p.id === S.sel), c = calcular(pc); return { t: c.tot.FOR, b: c.base.FOR }; });
  const txt = await P.locator('.rsatr').first().innerText();
  ok(txt.includes(String(v.t)) && txt.includes('base') && txt.includes(String(v.b)), 'a Força mostra o total e a base lado a lado: ' + JSON.stringify(v) + ' ' + JSON.stringify(txt));
  await P.locator('.rsatr .rsbase').first().click(); await w(300);
  let u = await P.evaluate(() => S.personagens.find(p => p.id === S.sel).ultRol);
  ok(u && u.base === true && u.valor === v.b, 'o "base" rola a Força base: ' + JSON.stringify(u && { valor: u.valor, base: u.base }));
  ok(await vis('#rsRolou') && (await P.locator('#rsRolou').innerText()).includes('base'), 'a rolagem aparece no resumo');
  await P.locator('.rsatr .rsrola').first().click(); await w(300);
  u = await P.evaluate(() => S.personagens.find(p => p.id === S.sel).ultRol);
  ok(u && !u.base && u.valor === v.t, 'o número rola com o equipamento: ' + JSON.stringify(u && { valor: u.valor, base: u.base }));
  await P.locator('.rsdef button.rsn').first().click(); await w(300);
  u = await P.evaluate(() => S.personagens.find(p => p.id === S.sel).ultRol);
  ok(u && /Defesa|DFF/.test(u.k), 'as defesas também rolam: ' + (u && u.k));
  // o "⋯" da ficha
  await P.locator('#fmais > summary').click(); await w(200);
  ok(await vis('#fmais [data-act="dup"]') && await vis('#fmais [data-act="del"]'), 'o "⋯" abre com Duplicar e Excluir');
  await P.mouse.click(30, 600); await w(200);
  ok(!(await vis('#fmais [data-act="dup"]')), 'clicar fora fecha');
  // Editar
  await P.locator('#fmodoEditar').click(); await w(300);
  ok(await vis('#quemE') && await vis('#f_nome') && await vis('.modoseg'), 'Editar traz o cadastro (o Quem é, o nome, Simples e Completo)');
  ok(await P.locator('#fmodoEditar').getAttribute('aria-checked') === 'true', '(Editar marcado)');
  // o "⋯" de cima
  ok(!(await vis('#btnCfg')) && await vis('#actsMais > summary'), 'Tabelas base, Importar e Apagar dados ficam no "⋯" de cima');
  await P.locator('#actsMais > summary').click(); await w(200);
  ok(await vis('#btnCfg') && await vis('#btnImport') && await vis('#btnFlush'), 'e aparecem ao abrir');
  ok(t.errs.length === 0, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
