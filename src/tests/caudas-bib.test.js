// Lote 176: a biblioteca de poderes de yokai fica com o mestre (fora de uma mesa, neste aparelho): recolhe os poderes
// das fichas e não some quando a ficha é apagada; a janela "Guardar o poder" continua mostrando.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const pc = Object.assign(R.personagemPadrao('Hana'), { id: 'pc_hana', nome: 'Hana' });
pc.skills = Object.assign({}, pc.skills, { arvores: ['a_kitsune'] });
pc.estado = { pb: { kitsune: { c: {}, u: {}, g: 0, s: { caudas: [], bib: [{ y: 'Kappa', n: 'Pele de Água', e: 'Defesa contra fogo.', a: false }] } } } };
const outro = Object.assign(R.personagemPadrao('Dain'), { id: 'pc_dain', nome: 'Dain' });
outro.skills = Object.assign({}, outro.skills, { arvores: ['a_kitsune'] });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc, outro], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'k', w: 1300, h: 900, seed: { urgm_calc_atributos_v1: estado } });
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await P.waitForTimeout(1200);
  ok(await P.evaluate(() => (FichasCaudas.recolher(), FichasCaudas.bibDoMestre()).map(p => p.n).join() === 'Pele de Água'), 'o mestre recolhe o poder da ficha da Hana');
  await P.evaluate(() => { S.personagens = S.personagens.filter(p => p.id !== 'pc_hana'); save(); });
  await P.reload({ waitUntil: 'load' }); await P.waitForTimeout(1200);
  ok(await P.evaluate(() => S.personagens.length === 1 && FichasCaudas.bibDoMestre().map(p => p.n).join() === 'Pele de Água'), 'a ficha da Hana foi apagada: o poder continua na biblioteca');
  await P.evaluate(() => FichasCaudas.guardar(S.personagens[0])); await P.waitForTimeout(300);
  ok(/Pele de Água/.test(await P.locator('.kbibl').innerText()), 'a janela "Guardar o poder" do Dain mostra o poder');
  await t.close(); end();
})();
