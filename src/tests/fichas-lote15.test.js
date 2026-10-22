// Fichas, lote 15 (sem mesa, tudo neste navegador):
//   · a porcentagem no valor atual de um recurso, sempre do máximo: -10% tira 10% dele, +25% põe, 50% deixa na metade
//     (arredonda para baixo; o dano gasta a sobrevida primeiro, como o -8 de sempre).
// (O Estaque escondido do jogador precisa de uma mesa: é o lote15.rede.test.js.)
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');

const pc = (id, nome) => Object.assign(R.personagemPadrao(nome), { id, nome, level: 5,
  recursos: [{ id: 'hp' + id, nome: 'HP', fml: '100' }, { id: 'sp' + id, nome: 'SP', fml: '45' }],
  estado: { rec: { ['hp' + id]: 80, ['sp' + id]: 3 }, sob: { ['hp' + id]: 6 } } });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_dain', 'Dain X')], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas-l15', seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms);
  const S0 = fn => P.evaluate(fn);
  const toast = () => S0(() => [...document.querySelectorAll('.toast, .aviso')].map(x => x.textContent).join(' | '));
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
  ok(await P.locator('#f_nome').inputValue() === 'Dain X', '(a ficha abre)');

  const hp = () => P.locator('[data-resatual="hppc_dain"]'), sp = () => P.locator('[data-resatual="sppc_dain"]');
  const dig = async (loc, v) => { await loc().fill(v); await loc().press('Enter'); await w(300); };
  const est = () => S0(() => JSON.parse(JSON.stringify(S.personagens[0].estado)));
  ok(/-10% tira 10% do máximo/.test(await hp().getAttribute('title')), 'a dica do campo ensina a porcentagem');
  await dig(hp, '-10%');
  let e = await est();
  ok(e.rec.hppc_dain === 76 && !(e.sob || {}).hppc_dain && await hp().inputValue() === '76', 'HP 80/100 com 6 de sobrevida, −10% (10): a sobrevida gasta 6 primeiro, e o HP fica em 76: ' + JSON.stringify(e));
  await dig(hp, '+25%');
  ok((await est()).rec.hppc_dain === 100 && await hp().inputValue() === '100', '+25%: vai até o máximo (100)');
  await dig(hp, '50%');
  ok((await est()).rec.hppc_dain === 50, 'sem sinal, 50% deixa na metade (50)');
  await dig(hp, '- 10 %');
  ok((await est()).rec.hppc_dain === 40, 'com espaços também (− 10 % → 40)');
  await dig(hp, '-500%');
  ok((await est()).rec.hppc_dain === 0, '−500%: para no zero (a barra sem piso)');
  await dig(sp, '+10%');
  ok((await est()).rec.sppc_dain === 7, 'SP 3/45, +10% (4,5 arredonda para baixo: 4) → 7');
  await dig(sp, '10%x');
  ok((await est()).rec.sppc_dain === 7 && await sp().inputValue() === '7' && /-10%/.test(await toast()), 'o que não é número nem porcentagem não vale, e o aviso ensina: ' + await toast());
  if (process.env.TC_SCRATCH) { require('fs').mkdirSync(require('path').join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: require('path').join(process.env.TC_SCRATCH, 'fotos', 'l15-ficha-pct.png') }); }

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
