// Lote 162: o Arquivo das fichas (sem mesa) — Arquivar no "⋯" (os pets vão junto), a seção Arquivo embaixo do elenco,
// a ficha arquivada só para consulta com Desarquivar e "Usar como base", e Baixar.
const { start, checker } = require('./lib');
const R = require('../../tc/rules.js');
const { ok, end } = checker();
const zero = { FOR: 0, DES: 0, VIT: 0, CAN: 0, AGI: 0 };
const pc = (id, nome, o) => Object.assign({ id, nome, raca: 'Kitsune', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'E', DES: 'C', AGI: 'B', VIT: 'D', CAN: 'A' }, pctProprio: null, poderes: [],
  skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 0, fonte: 'total' }, ultRol: null, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 },
  estaque: { a: '', b: '' }, habilidades: [], itens: [{ id: 'i1', nome: 'Espada', equipado: true, bonus: Object.assign({}, zero) }], recursos: [{ id: 'hp', nome: 'HP', fml: '100' }], notas: '' }, o);
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_a', 'Dain'), pc('pc_b', 'Lia'), pc('pet_a', 'Corvo', { petDe: 'pc_a' })], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_a' });
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'arquivo', w: 1320, h: 960, jogando: true, fechado: true, seed: { urgm_calc_atributos_v1: estado } });
  P.setDefaultTimeout(8000);
  const w = ms => P.waitForTimeout(ms);
  const erros = []; P.on('pageerror', e => erros.push(String(e.message)));
  const st = () => P.evaluate(() => S.personagens.map(p => p.id + (p.arquivo ? '*' : '')).join(','));
  const naLista = () => P.evaluate(() => [...document.querySelectorAll('#lista .bloco.arquivo')].length ? [...document.querySelectorAll('#lista > li:not(.arquivo) [data-abrir], #lista .secitens [data-abrir]')].map(b => b.dataset.abrir).join(',') : [...document.querySelectorAll('#lista [data-abrir]')].map(b => b.dataset.abrir).join(','));
  try {
    await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
    await P.locator('#fmais > summary').click(); await w(150);
    await P.locator('[data-act="arquivar"]').click(); await w(400);
    ok(await st() === 'pc_a*,pc_b,pet_a*', 'Arquivar: a ficha e o pet dela vão para o Arquivo: ' + await st());
    ok(await naLista() === 'pc_b', 'saem do elenco: ' + await naLista());
    ok(await P.locator('#lista .bloco.arquivo .cnt').innerText() === '2' && await P.locator('#lista .arqitens').isHidden(), 'a seção Arquivo, recolhida, com 2');
    ok(/foi para o Arquivo \(com o pet\)/.test(await P.locator('.toast').last().innerText()), 'o aviso: ' + await P.locator('.toast').last().innerText());
    await P.locator('[data-arqtoggle]').click(); await w(250);
    await P.locator('#lista .arqitens [data-abrir="pc_a"]').click(); await w(400);
    ok(await P.locator('#ficha .arq-aviso').isVisible() && /No Arquivo\s+desde/.test(await P.locator('#ficha .arq-aviso').innerText()), 'a ficha arquivada traz o aviso');
    ok(await P.locator('#ficha input:not([disabled])').count() === 0 || await P.evaluate(() => [...document.querySelectorAll('#ficha input')].every(i => i.disabled || i.matches('[data-itbusca]'))), 'só consulta: os campos travados');
    ok(await P.locator('[data-arq="desarquivar"]').isEnabled() && await P.locator('[data-arq="base"]').isEnabled(), 'os botões do Arquivo funcionam');
    // usar como base
    await P.locator('[data-arq="base"]').click(); await w(400);
    const ids = await P.evaluate(() => S.personagens.map(p => [p.id, p.nome, !!p.arquivo]));
    const nova = ids.find(x => !['pc_a', 'pc_b', 'pet_a'].includes(x[0]));
    ok(nova && nova[1] === 'Dain' && !nova[2] && ids.find(x => x[0] === 'pc_a')[2], 'Usar como base: uma ficha nova de Dain, fora do Arquivo; a arquivada fica: ' + JSON.stringify(ids));
    ok(await P.evaluate(id => S.sel === id && !document.querySelector('#ficha .arq-aviso'), nova[0]), 'a nova fica aberta e editável');
    // baixar
    await P.locator('[data-arqtoggle]').count() || await w(1);
    const [dl] = await Promise.all([P.waitForEvent('download'), P.locator('[data-arqbaixar]').click()]);
    const txt = require('fs').readFileSync(await dl.path(), 'utf8'), d = JSON.parse(txt);
    ok(d.tipo === 'arquivo' && d.personagens.length === 2 && d.personagens.every(p => p.arquivo), 'Baixar: o arquivo com as 2 arquivadas (' + dl.suggestedFilename() + ')');
    // desarquivar
    await P.locator('#lista .arqitens [data-abrir="pc_a"]').click(); await w(300);
    await P.locator('[data-arq="desarquivar"]').click(); await w(400);
    ok(/pc_a,pc_b,pet_a,/.test(await st()) && !(await st()).includes('*'), 'Desarquivar: volta com o pet: ' + await st());
    ok(await P.locator('#lista .bloco.arquivo').count() === 0, 'sem arquivadas, a seção some');
    ok(await P.locator('#ficha input[data-defesa]').first().isEnabled(), 'a ficha volta a ser editável');
    if (process.env.FOTOS) {
      await P.locator('#fmais > summary').click(); await P.locator('[data-act="arquivar"]').click(); await w(300);
      await P.locator('#lista .arqitens [data-abrir="pc_a"]').click(); await w(400);
      await P.screenshot({ path: process.env.FOTOS + '/l162-arquivo.png' });
    }
    ok(!erros.length, 'sem erros na página: ' + erros.join(' | '));
  } catch (e) { ok(false, 'falhou: ' + e.message.split('\n').slice(0,3).join(' ')); }
  await t.close(); end();
})();
