// O guia de cada aba (lote 16), na casca, sem conta (cada um é o mestre de tudo):
//   · o "?" da barra abre os assuntos da aba aberta (o do mestre); um aberto de cada vez; Esc e o × fecham; trocar de
//     aba com o guia aberto troca os assuntos;
//   · "Mostrar onde fica" fecha o guia e destaca o lugar no sistema — nas Fichas, abrindo antes a aba da ficha (a
//     caixinha do grupo, em Bolsas e itens); o lugar que não está à vista dá o aviso do assunto;
//   · todos os assuntos de todas as abas têm título e texto, e o lugar de cada um é um seletor que vale.
// (Quem joga vê o guia do jogador: o lote16b.rede.test.js.)
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const pc = Object.assign(R.personagemPadrao('Dain X'), { id: 'pc_dain', level: 5, grupo: 'Heróis', estado: { lapros: 40 } });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: ['Heróis'], abaFicha: 'atributos' });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'guia', w: 1300, h: 860, seed: { urgm_calc_atributos_v1: estado, 'tinycats:aba': 'fichas' } });
  const w = ms => P.waitForTimeout(ms);
  const j = JSON.stringify;
  const foto = async nome => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const toasts = () => P.evaluate(() => [...document.querySelectorAll('#toasts .toast')].map(x => x.textContent).join(' | '));
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await P.goto(t.base, { waitUntil: 'load' }); await w(1800);
  const F = P.frame({ url: /\/fichas\// });

  await passo('o guia das Fichas', async () => {
    ok(await P.locator('#btnGuia').isVisible() && (await P.locator('#btnGuia').getAttribute('aria-expanded')) === 'false', 'o "?" na barra de cima');
    await P.locator('#btnGuia').click(); await w(250);
    const tits = await P.locator('#guia .guia-t').allInnerTexts();
    ok(await P.locator('#guia').isVisible() && /Guia · Fichas/.test(await P.locator('#guia .guia-h').innerText()) && /para quem mestra/.test(await P.locator('#guia .guia-h').innerText()), 'abre o guia das Fichas, o de quem mestra (sem conta, cada um é o mestre)');
    ok(tits.length === 8 && tits[0] === 'O elenco e os grupos' && tits.includes('A caixinha do grupo'), 'os assuntos da aba: ' + j(tits));
    ok(await P.locator('#guia .guia-c').count() === 0, 'todos começam fechados');
    await P.locator('#guia .guia-t', { hasText: 'A caixinha do grupo' }).click(); await w(200);
    ok(await P.locator('#guia .guia-c').count() === 1 && /lapros que o grupo guarda junto/.test(await P.locator('#guia .guia-c').innerText()) && await P.locator('#guia [data-guia-mostrar]').isVisible(), 'um clique abre o assunto: o texto e "Mostrar onde fica"');
    await P.locator('#guia .guia-t', { hasText: 'O aniversário' }).click(); await w(200);
    ok(await P.locator('#guia .guia-c').count() === 1 && /calendário do mundo/.test(await P.locator('#guia .guia-c').innerText()), 'abrir outro fecha o primeiro (um de cada vez)');
    await foto('l16-guia');
    await P.keyboard.press('Escape'); await w(200);
    ok(await P.locator('#guia').isHidden() && (await P.locator('#btnGuia').getAttribute('aria-expanded')) === 'false', 'Esc fecha');
    await P.locator('#btnGuia').click(); await w(200);
    ok(await P.locator('#guia .guia-i.aberto .guia-t').innerText() === 'O aniversário', 'reaberto, volta no mesmo assunto');
  });

  await passo('mostrar onde fica', async () => {
    await P.locator('#guia .guia-t', { hasText: 'A caixinha do grupo' }).click(); await w(150);
    ok(await F.evaluate(() => S.abaFicha) === 'atributos', '(a ficha está na aba Atributos)');
    await P.locator('#guia [data-guia-mostrar]').click(); await w(500);
    ok(await P.locator('#guia').isHidden(), 'o guia fecha');
    ok(await F.evaluate(() => S.abaFicha) === 'bolsas' && await F.locator('#painelCaixa').isVisible(), 'a ficha passa para Bolsas e itens, onde a caixinha fica');
    const anel = await F.evaluate(() => { const a = document.querySelector('.tc-guia-anel'), r = document.querySelector('#painelCaixa').getBoundingClientRect(); if (!a) return null; const b = a.getBoundingClientRect(); return { ok: Math.abs(b.left - (r.left - 6)) < 3 && Math.abs(b.top - (r.top - 6)) < 3 && Math.abs(b.width - (r.width + 12)) < 3, op: getComputedStyle(a).opacity }; });
    ok(anel && anel.ok, 'e ganha um contorno em volta por uns instantes: ' + j(anel));
    await P.screenshot({ path: '/dev/null' }).catch(() => {});
    await foto('l16-guia-mostrar');
    await w(3300);
    ok(await F.evaluate(() => !document.querySelector('.tc-guia-anel')), 'o contorno some sozinho');
    ok(!(await toasts()), 'sem aviso (achou)');
    // um lugar que não está à vista: o aviso do assunto
    await P.locator('#btnGuia').click(); await w(150);
    await P.locator('#guia .guia-t', { hasText: 'Quem vê e quem controla' }).click(); await w(150);
    await P.locator('#guia [data-guia-mostrar]').click(); await w(600);
    ok(/Isso só existe numa mesa, com uma ficha aberta/.test(await toasts()), 'sem mesa, o dono da ficha não existe: o aviso do assunto diz — ' + await toasts());
  });

  await passo('o guia acompanha a aba', async () => {
    await P.locator('#btnGuia').click(); await w(150);
    await P.locator('#tab-arvore').click(); await w(1400);
    ok(/Guia · Árvore/.test(await P.locator('#guia .guia-h').innerText()) && (await P.locator('#guia .guia-t').allInnerTexts()).includes('As skills únicas'), 'com o guia aberto, trocar de aba troca os assuntos (a Árvore)');
    await P.locator('#guiaX').click(); await w(150);
    ok(await P.locator('#guia').isHidden(), 'o × fecha');
    // o lugar que existe mas está escondido (nas Cenas, a faixa dos turnos, sem combate): também dá o aviso
    await P.locator('#tab-cenas').click(); await w(1500);
    await P.locator('#btnGuia').click(); await w(150);
    await P.locator('#guia .guia-t', { hasText: 'Os turnos' }).click(); await w(150);
    await P.locator('#guia [data-guia-mostrar]').click(); await w(600);
    ok(/A faixa dos turnos aparece com o combate ligado/.test(await toasts()), 'o que existe mas está escondido (a faixa dos turnos, sem combate) também dá o aviso: ' + await toasts());
  });

  await passo('os assuntos de todas as abas', async () => {
    const G = await P.evaluate(() => window.TC_GUIA.abas);
    const ruins = [];
    for (const aba of Object.keys(G)) for (const papel of ['mestre', 'jogador']) for (const x of G[aba][papel] || []) {
      if (!x.t || !x.txt || x.txt.length < 20) ruins.push(aba + '/' + papel + ': ' + x.t);
      if (x.onde) { try { await P.evaluate(s => document.createDocumentFragment().querySelector(s), x.onde.sel); } catch (e) { ruins.push(aba + '/' + papel + ': seletor ' + x.onde.sel); } }
      if (x.onde && x.onde.sub && !['atributos', 'bolsas', 'social', 'skills', 'notas'].includes(x.onde.sub)) ruins.push(aba + '/' + papel + ': sub ' + x.onde.sub);
    }
    ok(!ruins.length && j(Object.keys(G).sort()) === j(['acampamento', 'arvore', 'cenas', 'cla', 'fichas', 'jornal', 'meditacao', 'mundo', 'rolador']), 'as nove abas têm guia; cada assunto com título, texto e um lugar que é um seletor válido: ' + j(ruins));
    ok(G.fichas.jogador.length >= 5 && G.cenas.jogador.length >= 2 && G.mundo.jogador.length >= 2, 'quem joga também tem o guia dele');
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
