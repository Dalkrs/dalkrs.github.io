// Mapa-múndi, lote 26: o menu do mestre em grupos (como ele encontra, sem a marca dos testes de antes).
//   · as abas numa fileira só, em três grupos com nome: Sessão (Seleção, Hoje, Linha), Política (um botão com a lista:
//     Reinos, Corte, Diplomacia, Intrigas, Guerra) e Preparar (Terreno, Mapa); as teclas 1 a 6;
//   · o trilho em grupos com nome: Sessão, Traçar, Preparar;
//   · os blocos: abertos nas abas da sessão, fechados (com o resumo) no Preparar;
//   · a data abre a sanfona da linha do tempo; quem joga continua com as duas fileiras.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'mundo26', w: 1440, h: 900, fechado: true });
  const w = ms => P.waitForTimeout(ms);
  const E = (fn, a) => P.evaluate(fn, a);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const ativa = () => E(() => document.querySelector('.tab[aria-selected="true"]:not(.tab-pol)').id);
  await P.goto(t.base + 'mundo/', { waitUntil: 'load' }); await w(1000);
  await P.locator('button', { hasText: 'Papel em branco' }).click(); await w(900);

  await passo('as abas em grupos', async () => {
    ok(await E(() => document.getElementById('tabs').dataset.modo) === 'grupos', 'quem mestra: as abas em grupos');
    ok(j(await E(() => [...document.querySelectorAll('.tabs-g')].map(x => x.textContent))) === j(['Sessão', 'Política', 'Preparar']), 'os três grupos com nome');
    const ses = await E(() => [...document.querySelectorAll('[data-grupo="sessao"] .tab')].map(b => b.firstChild.textContent.trim())); ok(j(ses) === j(['Seleção', 'Hoje', 'Linha']), 'Sessão: Seleção, Hoje e Linha: ' + j(ses));
    ok(!(await P.locator('#tab-corte').isVisible()), 'as abas da Política ficam guardadas no botão');
    await P.locator('#tab-politica').click(); await w(120);
    ok(j(await E(() => [...document.querySelectorAll('.pol-lista .tab')].filter(b => b.offsetParent).map(b => b.textContent.trim()))) === j(['Reinos', 'Corte', 'Diplomacia', 'Intrigas', 'Guerra']), 'o botão abre a lista das cinco');
    await P.locator('#tab-corte').click(); await w(200);
    ok(await ativa() === 'tab-corte' && !(await P.locator('.pol-lista').isVisible()) && (await P.locator('#tab-politica').innerText()).startsWith('Corte'), 'escolher: a aba abre, a lista fecha e o botão diz "Corte"');
    await P.locator('#tab-politica').click(); await w(80); await P.keyboard.press('Escape'); await w(80);
    ok(!(await P.locator('.pol-lista').isVisible()), 'Esc fecha a lista');
  });

  await passo('as teclas', async () => {
    await P.locator('#mundo').click({ position: { x: 400, y: 400 } }); await w(80);
    await P.keyboard.press('2'); await w(150);
    ok(await ativa() === 'tab-hoje', 'a tecla 2: Hoje');
    await P.keyboard.press('4'); await w(150);
    ok(await ativa() === 'tab-corte', 'a tecla 4: a última da Política (Corte)');
    await P.keyboard.press('6'); await w(150);
    ok(await ativa() === 'tab-mapa', 'a tecla 6: Mapa');
  });

  await passo('os blocos', async () => {
    const blocos = await E(() => [...document.querySelectorAll('#pane details.sec')].map(d => d.querySelector('summary b').textContent + (d.open ? '+' : '-')));
    ok(blocos.length >= 4 && blocos.every(b => b.endsWith('-')), 'na aba Mapa (Preparar), os blocos começam fechados: ' + blocos.join(' '));
    ok((await P.locator('#pane details.sec', { hasText: 'Imagem' }).locator('.sec-res').innerText()) === 'papel em branco', 'com o resumo no título');
    await P.locator('#pane details.sec summary', { hasText: 'Calendário' }).click(); await w(150);
    ok(await E(() => [...document.querySelectorAll('#pane details.sec')].find(d => /Calendário/.test(d.textContent)).open), 'clicar abre');
    await P.locator('#mundo').click({ position: { x: 400, y: 400 } }); await w(80);      // (as teclas valem com o foco no mapa)
    await P.keyboard.press('2'); await w(150); await P.keyboard.press('6'); await w(150);
    ok(await E(() => [...document.querySelectorAll('#pane details.sec')].find(d => /Calendário/.test(d.textContent)).open), 'e fica aberto ao voltar à aba');
    await P.locator('#mundo').click({ position: { x: 400, y: 400 } }); await w(80);
    await P.keyboard.press('2'); await w(150);
    const hoje = await E(() => [...document.querySelectorAll('#pane details.sec')].map(d => d.open));
    ok(hoje.length > 0 && hoje.every(Boolean), 'na aba Hoje (Sessão), abertos: ' + j(hoje));
  });

  await passo('o trilho', async () => {
    ok(j(await E(() => [...document.querySelectorAll('.rail-g')].map(x => x.textContent))) === j(['Sessão', 'Traçar', 'Preparar']), 'o trilho em três grupos com nome');
    ok(await E(() => [...document.querySelectorAll('#rail .tool')].map(b => b.dataset.f).join()) === 'sel,g,e,m,d,w,r,t,f,h,p,n', 'na sessão: selecionar, grupo, evento, marcador, régua e caneta');
  });

  await passo('a data', async () => {
    await P.locator('#dataTxt').click(); await w(150);
    ok(await P.locator('#sanfonaData').isVisible() && /Linha do tempo/i.test(await P.locator('#sanfonaData').innerText()), 'a data abre a sanfona com a linha do tempo');
    await P.locator('#sanfonaData button', { hasText: 'linha do tempo' }).click(); await w(200);
    ok(await ativa() === 'tab-linha' && await P.locator('#sanfonaData').count() === 0, 'o botão da sanfona abre a aba Linha e fecha a sanfona');
  });

  await passo('ver como jogador', async () => {
    await P.locator('#comoJog').check(); await w(250);
    ok(await E(() => document.getElementById('tabs').dataset.modo) === 'filas', 'vendo como jogador: as duas fileiras de sempre');
    await P.locator('#comoJog').uncheck(); await w(250);
    ok(await E(() => document.getElementById('tabs').dataset.modo) === 'grupos', 'de volta: os grupos');
  });

  if (t.errs.length) console.log(t.errs.slice(0, 10).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
