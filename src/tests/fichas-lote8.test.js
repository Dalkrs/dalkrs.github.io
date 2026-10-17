// Fichas, lote 8 (sem mesa, tudo neste navegador):
//   · (parte 2) o Limite de dano: um número de consulta junto dos atributos secundários (vazio: sem); só número;
//   · (parte 2) a ferida permanente (marcada na cena) aparece na ficha: a ponta podre nas barrinhas, "20 apodrecidos" no
//     quadro da barra, o valor atual preso no teto (o "+50" para nele, com aviso; o "Encher" vai até ele), e "Tirar a
//     ferida" (quem mestra; sem mesa, quem usa) com Desfazer.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');

const pc = (id, nome) => Object.assign(R.personagemPadrao(nome), { id, nome, level: 5,
  recursos: [{ id: 'hp' + id, nome: 'HP', fml: '100' }, { id: 'sp' + id, nome: 'SP', fml: '40' }],
  estado: { rec: { ['hp' + id]: 95 }, podre: { ['hp' + id]: 20 } } });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_dain', 'Dain X')], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas-l8', seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms);
  const S0 = fn => P.evaluate(fn);
  const toast = () => S0(() => [...document.querySelectorAll('.toast, .aviso')].map(x => x.textContent).join(' | '));
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
  ok(await P.locator('#f_nome').inputValue() === 'Dain X', '(a ficha abre)');

  // ---------- o Limite de dano ----------
  const lim = P.locator('#f_limdano');
  ok(await lim.count() === 1 && await lim.inputValue() === '' && (await P.locator('#f_limdano_tot').innerText()).trim() === '—', 'o Limite de dano fica junto dos atributos secundários, vazio (sem limite)');
  ok(/Limite de dano/.test(await P.locator('table.attr tr.especial').innerText()) && /manual/.test(await P.locator('table.attr tr.especial').innerText()), 'na linha dele: "Limite de dano", manual');
  const antes = await S0(() => JSON.stringify(TC.rules.calcular(S.personagens[0])));
  await lim.fill('35'); await lim.press('Enter'); await w(300);
  ok(await S0(() => S.personagens[0].limDano) === 35 && (await P.locator('#f_limdano_tot').innerText()).trim() === '35', 'escrito 35: fica guardado e aparece no total');
  ok(await S0(() => JSON.stringify(TC.rules.calcular(S.personagens[0]))) === antes, 'e não muda conta nenhuma da ficha');
  await P.locator('#f_limdano').fill('muito'); await P.locator('#f_limdano').press('Enter'); await w(300);
  ok(await S0(() => S.personagens[0].limDano) === 35 && await P.locator('#f_limdano').inputValue() === '35' && /O limite de dano é um número/.test(await toast()), 'o que não é número não vale (o campo volta, com aviso)');
  await P.locator('#f_limdano').fill('12,5'); await P.locator('#f_limdano').press('Enter'); await w(300);
  ok(await S0(() => S.personagens[0].limDano) === 12.5, 'aceita a vírgula (12,5)');
  await P.locator('#f_limdano').fill(''); await P.locator('#f_limdano').press('Enter'); await w(300);
  ok(await S0(() => S.personagens[0].limDano) === undefined && (await P.locator('#f_limdano_tot').innerText()).trim() === '—', 'vazio: sem limite (sai da ficha)');

  // ---------- a ferida permanente ----------
  const bz = await S0(() => { const b = document.querySelector('[data-bz="hppc_dain"]'), p = b && b.querySelector('b.podre'); return b ? { pod: b.classList.contains('pod'), w: p ? p.style.width : null, title: b.title, v: b.querySelector('.bzv').textContent } : null; });
  ok(bz && bz.pod && parseFloat(bz.w) === 20 && /20 apodrecidos/.test(bz.title) && bz.v === '80/100', 'a barrinha mostra a ponta podre (20%) e o valor no teto (95 anotado → 80): ' + JSON.stringify(bz));
  const atual = P.locator('[data-resatual="hppc_dain"]');
  ok(await atual.inputValue() === '80', 'o valor atual fica no teto (80)');
  ok((await P.locator('[data-respodre="hppc_dain"]').innerText()).trim() === '20 apodrecidos' && await P.locator('[data-restirapodre="hppc_dain"]').count() === 1, 'o quadro da barra diz "20 apodrecidos", com "Tirar a ferida"');
  await atual.fill('-30'); await atual.press('Enter'); await w(300);
  ok(await atual.inputValue() === '50', 'o dano continua valendo (−30 → 50)');
  await atual.fill('+50'); await atual.press('Enter'); await w(300);
  ok(await atual.inputValue() === '80' && /HP não passa de 80: 20 estão apodrecidos/.test(await toast()), 'a cura (+50) para no teto, com aviso: ' + await toast());
  await atual.fill('40'); await atual.press('Enter'); await w(300);
  await P.locator('[data-rescheio="hppc_dain"]').click(); await w(400);
  ok(await P.locator('[data-resatual="hppc_dain"]').inputValue() === '80', '"Encher" vai até o teto');
  await P.locator('[data-restirapodre="hppc_dain"]').click(); await w(400);
  ok(await S0(() => (S.personagens[0].estado.podre || {}).hppc_dain) === undefined && await P.locator('[data-respodre="hppc_dain"]').count() === 0 && /A ferida permanente saiu de HP/.test(await toast()), 'Tirar a ferida: a ponta podre sai, com aviso');
  await P.locator('[data-resatual="hppc_dain"]').fill('+50'); await P.locator('[data-resatual="hppc_dain"]').press('Enter'); await w(300);
  ok(await P.locator('[data-resatual="hppc_dain"]').inputValue() === '100', 'e a cura volta a ir até o máximo');
  await P.locator('.aviso button, .toast button', { hasText: 'Desfazer' }).first().click().catch(() => {}); await w(400);
  ok(await S0(() => (S.personagens[0].estado.podre || {}).hppc_dain) === 20 && await P.locator('[data-resatual="hppc_dain"]').inputValue() === '80', 'Desfazer traz a ferida de volta (e o valor volta ao teto)');
  if (process.env.TC_SCRATCH) await P.screenshot({ path: require('path').join(process.env.TC_SCRATCH, 'fotos', 'l8-ficha-ferida.png') });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
