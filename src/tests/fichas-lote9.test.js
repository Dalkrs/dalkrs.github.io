// Fichas, lote 9 (sem mesa, tudo neste navegador):
//   · (parte 1) o Limite de dano também na ficha de jogador — a da distribuição livre (os pontos postos à mão): a mesma
//     linha "Limite de dano · manual", depois das defesas; escrever guarda (e aparece no total), o que não é número
//     não vale (com aviso), vazio tira; e continua fora das contas da ficha;
//   · (parte 1) a poção não oferece o Duplicado (é da cena, com a janela dele).
// TC_SCRATCH=<pasta> guarda a captura em <pasta>/fotos.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');

const pc = Object.assign(R.personagemPadrao('Lia'), { id: 'pc_lia', nome: 'Lia', level: 5, modoAtr: 'livre', atrLivre: { FOR: 10, DES: 12, VIT: 8, CAN: 6, AGI: 9 },
  recursos: [{ id: 'hplia', nome: 'HP', fml: '100' }] });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_lia', selSit: null, aba: 'fichas', grupos: [] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas-l9', seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms);
  const S0 = fn => P.evaluate(fn);
  const toast = () => S0(() => [...document.querySelectorAll('.toast, .aviso')].map(x => x.textContent).join(' | '));
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
  ok(await P.locator('#f_nome').inputValue() === 'Lia' && await P.locator('table.attr.livre').count() === 1, '(a ficha abre, na distribuição livre: a ficha de jogador)');

  // ---------- o Limite de dano na distribuição livre ----------
  const lim = P.locator('table.attr.livre #f_limdano');
  ok(await lim.count() === 1 && await lim.inputValue() === '' && (await P.locator('#f_limdano_tot').innerText()).trim() === '—', 'o Limite de dano aparece na ficha da distribuição livre, vazio (sem limite)');
  const linha = (await P.locator('table.attr.livre tr.especial').innerText()).replace(/\s+/g, ' ');
  ok(/Limite de dano/.test(linha) && /manual/.test(linha), 'na linha dele: "Limite de dano", manual: ' + linha);
  const ordem = await S0(() => [...document.querySelectorAll('table.attr.livre tbody tr')].map(tr => tr.className || 'atributo'));
  ok(ordem[ordem.length - 1] === 'especial' && ordem[ordem.length - 2] === 'defesa', 'depois das defesas (a última linha da tabela): ' + JSON.stringify(ordem.slice(-3)));
  const antes = await S0(() => JSON.stringify(TC.rules.calcular(S.personagens[0])));
  await lim.fill('40'); await lim.press('Enter'); await w(300);
  ok(await S0(() => S.personagens[0].limDano) === 40 && (await P.locator('#f_limdano_tot').innerText()).trim() === '40', 'escrito 40: fica guardado e aparece no total');
  ok(await S0(() => JSON.stringify(TC.rules.calcular(S.personagens[0]))) === antes, 'e não muda conta nenhuma da ficha');
  if (process.env.TC_SCRATCH) { await P.locator('table.attr.livre').scrollIntoViewIfNeeded(); await w(200); await P.screenshot({ path: require('path').join(process.env.TC_SCRATCH, 'fotos', 'l9-limite-livre.png') }); }
  await P.locator('table.attr.livre #f_limdano').fill('muito'); await P.locator('table.attr.livre #f_limdano').press('Enter'); await w(300);
  ok(await S0(() => S.personagens[0].limDano) === 40 && await P.locator('table.attr.livre #f_limdano').inputValue() === '40' && /O limite de dano é um número/.test(await toast()), 'o que não é número não vale (o campo volta, com aviso)');
  await P.locator('table.attr.livre #f_limdano').fill('12,5'); await P.locator('table.attr.livre #f_limdano').press('Enter'); await w(300);
  ok(await S0(() => S.personagens[0].limDano) === 12.5, 'aceita decimal com vírgula (12,5)');
  await P.locator('table.attr.livre #f_limdano').fill(''); await P.locator('table.attr.livre #f_limdano').press('Enter'); await w(300);
  ok(await S0(() => S.personagens[0].limDano) === undefined && (await P.locator('#f_limdano_tot').innerText()).trim() === '—', 'vazio: sem limite (sai da ficha)');
  // os pontos continuam funcionando ao lado
  await P.locator('[data-pts="FOR"]').fill('11'); await P.locator('[data-pts="FOR"]').press('Enter'); await w(300);
  ok(await S0(() => S.personagens[0].atrLivre.FOR) === 11 && await P.locator('table.attr.livre #f_limdano').count() === 1, '(os pontos da distribuição livre continuam valendo, e a linha continua lá)');

  // (o Duplicado é uma condição da cena com janela, como a Ferida e o Clone: a poção não oferece)
  const ops = await S0(() => FichasExtras.opcoesDeCondicao(''));
  ok(!/value="duplicado"/.test(ops) && !/value="clone"/.test(ops) && !/value="ferida"/.test(ops) && /value="veneno"/.test(ops), 'as condições que uma poção pode pôr não têm o Duplicado (nem o Clone e a Ferida)');
  if (t.errs.length) console.log(t.errs.join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
