// Fichas, lote 42 (sem mesa: cada um é o mestre): os soldados com nome de cada unidade.
//   · nas escolhas da unidade, "Soldados com nome": + Soldado (o nome, a raça e a classe das árvores da mesa), × tira;
//   · na carta, os soldados (os oito primeiros e "+N"), com quantos têm nome;
//   · Desfazer devolve os de antes; no celular, a janela cabe.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const j = JSON.stringify;

const bib = { nome: 'b', pools: [{ id: 'p', nome: 'Pontos', padrao: 0 }], usos: [], arvores: [
  { id: 'ar_humano', nome: 'Humano', categoria: 'raca', nodes: [] }, { id: 'ar_elfo', nome: 'Elfo', categoria: 'raca', nodes: [] },
  { id: 'cl_guerreiro', nome: 'Guerreiro', categoria: 'classe', nodes: [] }, { id: 'cl_arqueiro', nome: 'Arqueiro', categoria: 'classe', nodes: [] }] };
const pc = Object.assign(R.personagemPadrao('Selene'), { id: 'pc_s', level: 8, tropas: { v: 1, nome: 'Guarda de Selene', unid: [{ id: 'un_a', nome: 'Lanças', tropas: 250, cheio: 250, hpT: 10, vet: 2 }], diario: [] } });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc], situacoes: [], tabelas: [], log: [], bib, sel: 'pc_s', selSit: null, aba: 'fichas', grupos: [], abaFicha: 'tropas' });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas-l42', w: 1300, h: 940, seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const foto = async nome => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const sold = () => P.evaluate(() => JSON.parse(JSON.stringify((S.personagens[0].tropas.unid[0].sold) || [])));
  const carta = () => P.locator('#tropasAba .tr-carta[data-trunid="un_a"]');
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1400);

  await passo('sem soldados', async () => {
    ok(/Soldados\s*Nenhum com nome ainda/.test(await carta().innerText()), 'a carta: "Soldados — Nenhum com nome ainda"');
  });
  await passo('pôr soldados', async () => {
    await carta().locator('[data-tresc]').click(); await w(300);
    const J = P.locator('.tr-janela');
    ok(await J.locator('[data-trsd]').count() === 0 && await J.locator('[data-trsdnovo]').isEnabled(), 'nas escolhas, "Soldados com nome", vazio, com "+ Soldado"');
    await J.locator('[data-trsdnovo]').click(); await w(100);
    ok(await P.evaluate(() => document.activeElement && document.activeElement.matches('[data-sdnome]')), '+ Soldado: uma linha nova, com o foco no nome');
    await J.locator('[data-trsd]').nth(0).locator('[data-sdnome]').fill('Aron');
    await J.locator('[data-trsd]').nth(0).locator('[data-sdraca]').selectOption('ar_humano');
    await J.locator('[data-trsd]').nth(0).locator('[data-sdclasse]').selectOption('cl_guerreiro');
    await J.locator('[data-trsdnovo]').click(); await w(100);
    await J.locator('[data-trsd]').nth(1).locator('[data-sdnome]').fill('Lia do Bosque');
    await J.locator('[data-trsd]').nth(1).locator('[data-sdraca]').selectOption('ar_elfo');
    await J.locator('[data-trsdnovo]').click(); await w(100);
    await J.locator('[data-trsd]').nth(2).locator('[data-sdnome]').fill('Vai sair');
    await J.locator('[data-trsd]').nth(2).locator('[data-sdx]').click(); await w(100);
    ok(await J.locator('[data-trsd]').count() === 2, '×: a linha sai');
    await foto('tropas-soldados');
    await J.locator('[data-jok]').click(); await w(300);
    const s = await sold();
    ok(s.length === 2 && s[0].nome === 'Aron' && s[0].raca === 'ar_humano' && s[0].racaN === 'Humano' && s[0].classe === 'cl_guerreiro' && s[1].nome === 'Lia do Bosque' && s[1].raca === 'ar_elfo' && s[1].classe === null && /^sd_/.test(s[0].id),
      'Salvar: os dois soldados, com a raça e a classe das árvores: ' + j(s));
    const c = await carta().innerText();
    ok(/Soldados\s*2 com nome de 250/.test(c) && /Aron\s*Humano Guerreiro/.test(c) && /Lia do Bosque\s*Elfo/.test(c), 'a carta: 2 com nome de 250, "Aron — Humano Guerreiro", "Lia do Bosque — Elfo"');
  });
  await passo('editar e Desfazer', async () => {
    await carta().locator('[data-tresc]').click(); await w(300);
    const J = P.locator('.tr-janela');
    ok(await J.locator('[data-trsd]').count() === 2 && (await J.locator('[data-trsd]').nth(0).locator('[data-sdnome]').inputValue()) === 'Aron', 'as escolhas abrem com os soldados de agora');
    await J.locator('[data-trsd]').nth(0).locator('[data-sdnome]').fill('Aron, o Velho');
    await J.locator('[data-jok]').click(); await w(300);
    const ids0 = (await sold()).map(x => x.id);
    ok((await sold())[0].nome === 'Aron, o Velho', 'o nome muda (o soldado é o mesmo: o id fica)');
    await P.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(300);
    const s = await sold();
    ok(s[0].nome === 'Aron' && j(s.map(x => x.id)) === j(ids0), 'Desfazer: o nome de antes volta');
  });
  await passo('muitos', async () => {
    await P.evaluate(() => { const u = S.personagens[0].tropas.unid[0]; u.sold = Array.from({ length: 12 }, (_, i) => ({ id: 'sd_' + i, nome: 'Soldado ' + (i + 1) })); save(); render(); }); await w(300);
    ok(await carta().locator('.tr-chip-sd:visible').count() === 8 && /\+4/.test(await carta().locator('[data-trsdver]').innerText()), 'com 12: os oito primeiros e "+4"');
    await carta().locator('[data-trsdver]').click(); await w(150);
    ok(await carta().locator('.tr-chip-sd:visible').count() === 12, '"+4" mostra os outros');
  });
  await passo('o celular', async () => {
    await P.setViewportSize({ width: 400, height: 860 }); await w(300);
    await carta().locator('[data-tresc]').click(); await w(300);
    const r = await P.evaluate(() => ({ larg: document.documentElement.scrollWidth, j: Math.round(document.querySelector('.tr-janela .sheet').getBoundingClientRect().right) }));
    ok(r.larg <= 400 && r.j <= 400, 'no celular, a janela com os soldados cabe: ' + j(r));
    await P.locator('.tr-janela [data-jcancela]').first().click();
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
