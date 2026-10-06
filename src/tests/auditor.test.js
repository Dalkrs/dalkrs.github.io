// A janela do auditor dos dados (rolador/auditor.js), sem mesa: as rolagens vêm de mentira, pela mesma porta por onde
// a casca as entrega. Confere o que a janela mostra em três situações: dados honestos, uma pessoa que tira números
// altos demais, e poucas rolagens. (As contas têm o teste delas: auditoria.test.js.)
const { start, checker } = require('./lib');
const { ok, end } = checker();
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'auditor', w: 1280, h: 900 });
  const w = ms => P.waitForTimeout(ms);
  await P.goto(t.base + 'rolador/', { waitUntil: 'load' }); await w(800);
  ok(await P.evaluate(() => !!window.RoladorAuditor && !!TC.auditoria && !!TC.ponte.registro), 'o Rolador carrega o auditor e as contas dele');
  await P.locator('#menuBtn').click(); await w(200);
  ok(!/Auditor dos dados/.test(await P.locator('#mainMenu').innerText()), 'fora de uma mesa, o Menu não oferece o auditor (não há registro da mesa para ler)');
  await P.keyboard.press('Escape'); await w(150);
  ok(await P.evaluate(() => TC.ponte.registro.ler().then(() => 'leu', e => e.message)) === 'O auditor só funciona dentro do site, com uma mesa aberta.', 'e a porta diz por quê');

  const abrir = async modo => {
    await P.evaluate(modo => {
      let a = 12345; const rng = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const d = n => 1 + Math.floor(rng() * n), linhas = [], quem = [['u1', 'Bruno'], ['u2', 'Dalmo'], ['u3', 'Kaito']];
      for (let i = 0; i < (modo === 'pouco' ? 18 : 900); i++) {
        const [id, nome] = quem[i % 3], r = rng();
        let dd;
        if (r < 0.4) { let v = d(20); if (modo === 'viciado' && id === 'u3' && v <= 6 && rng() < 0.5) v = 15 + d(6) - 1; dd = [[20, v]]; }
        else if (r < 0.85) { const L = 8 + Math.floor(rng() * 50); dd = [[L, d(L)]]; }
        else dd = [[6, d(6)], [6, d(6)]];
        linhas.push({ id: 'r' + i, autor_id: id, autor_nome: nome, origem: i % 4 === 0 ? 'ficha' : i % 4 === 1 ? 'cena' : 'mesa', criado_em: '2026-10-05T12:00:00Z', dd });
      }
      if (modo === 'viciado') linhas.push({ id: 'z', autor_id: 'u2', autor_nome: 'Dalmo', origem: 'ficha', criado_em: '2026-10-04T23:22:00Z', resumo: 'Iniciativa · 1d20 (0) + 2' });
      for (let i = 0; i < 14; i++) linhas.push({ id: 'a' + i, autor_id: 'u1', autor_nome: 'Bruno', origem: 'cena', criado_em: '2026-10-05T12:00:00Z', k: 'tabela', resumo: 'A cena está no ar' });
      window.__lidas = (window.__lidas || 0);
      TC.ponte.registro.ler = async () => { window.__lidas++; if (modo === 'erro') throw new Error('Só o mestre abre o auditor dos dados.'); return linhas; };
      window.RoladorAuditor.abrir();
    }, modo);
    await w(400);
  };
  const texto = async sel => (await P.locator(sel).innerText()).replace(/\s+/g, ' ').trim();

  // ---------- dados honestos ----------
  await abrir('honesto');
  ok(await P.locator('#audDlg').evaluate(d => d.open) && /914 rolagens, 1\.050 dados conferidos/.test(await texto('#audIntro')), 'a janela abre e diz o que leu: ' + (await texto('#audIntro')).slice(-110));
  ok(await P.locator('#audVeredito').getAttribute('data-nivel') === 'ok' && /Dentro do esperado/.test(await texto('#audVeredito')) && /Em média, os resultados caíram em \d+,\d% da altura do dado/.test(await texto('#audVeredito')), 'com dados honestos: "Dentro do esperado", e a altura média — ' + await texto('#audVeredito'));
  ok(await P.locator('#audGrafico rect.aud-barra').count() === 10 && await P.locator('#audGrafico line.aud-esp').count() === 10 && await P.locator('#audGrafico rect.aud-faixa').count() === 10 && await P.locator('#audDesigual').count() === 1,
    'todos os dados juntos: dez faixas, cada uma com a barra, o traço do esperado e o intervalo — e a explicação de por que o esperado não é igual em todas');
  ok(await P.locator('#audImpossiveis').count() === 0 && !/null|undefined|NaN/.test(await texto('#audBody')), 'sem alerta de dado impossível, e nada de "null" ou "NaN" perdido na janela');
  ok((await P.locator('#audPessoas tbody tr').count()) === 3 && (await P.locator('#audPessoas .aud-chip').allInnerTexts()).every(x => x === 'dentro do esperado'), 'a tabela por pessoa tem os três, todos "dentro do esperado"');
  ok(/14 linhas não trazem dado para conferir/.test(await texto('.aud-ler')) && /gerador de números do próprio navegador/.test(await texto('.aud-ler')), '"Como ler" explica os limites e diz quantas linhas ficaram de fora');
  await P.locator('.aud-nums summary').click(); await w(150);
  const linhasTab = await P.locator('.aud-nums tbody tr').count(), soma = await P.locator('.aud-nums tbody tr td:nth-child(2)').evaluateAll(tds => tds.reduce((a, td) => a + Number(td.textContent.replace(/\./g, '')), 0));
  ok(linhasTab === 10 && soma === 1050, '"Ver os números" traz a tabela das dez faixas, e elas somam os 1.050 dados');
  await P.locator('#audDado').selectOption('20'); await w(250);
  ok(await P.locator('#audGrafico rect.aud-barra').count() === 20 && await P.locator('#audDesigual').count() === 0 && /face do d20/.test(await texto('#audGrafico')) && await P.evaluate(() => document.activeElement && document.activeElement.id === 'audDado'),
    'escolhendo o d20: uma barra por face, sem a nota das faixas, e o cursor continua na lista (dá para trocar pelo teclado)');
  await P.locator('#audDado').selectOption({ index: 2 }); await w(250);
  ok(await P.locator('#audGrafico rect.aud-barra').count() >= 6, 'outro dado da lista também abre');
  await P.locator('#audDlg [data-close]').click(); await w(150);
  ok(!(await P.locator('#audDlg').evaluate(d => d.open)), 'Fechar fecha');

  // ---------- uma pessoa que tira números altos demais; e um dado com valor impossível ----------
  await abrir('viciado');
  ok(/1 dado trouxe um valor que ele não tem/.test(await texto('#audImpossiveis')) && /0 num d20 \(Dalmo, Fichas, 04\/10/.test(await texto('#audImpossiveis')), 'o zero num d20 aparece num alerta, com quem rolou, de onde e quando: ' + await texto('#audImpossiveis'));
  const chips = await P.locator('#audPessoas tbody tr').evaluateAll(trs => trs.map(tr => tr.cells[0].textContent + ': ' + tr.cells[3].textContent));
  ok(chips.some(x => /^Kaito: (fora do esperado|um pouco fora do comum)$/.test(x)) && chips.filter(x => /dentro do esperado/.test(x)).length === 2, 'na tabela por pessoa, quem destoa é o Kaito: ' + chips.join(' · '));
  await P.locator('#audPessoas .aud-link', { hasText: 'Kaito' }).click(); await w(250);
  await P.locator('#audDado').selectOption('20'); await w(250);
  ok(await P.locator('#audVeredito').getAttribute('data-nivel') === 'fora' && /caíram mais alto do que deviam: em \d+,\d%/.test(await texto('#audVeredito')) && /1 a cada [\d.]+ conferências/.test(await texto('#audVeredito')) && await P.locator('#audVeredito .aud-altura').count() === 0,
    'o d20 do Kaito: "Fora do esperado", dizendo para que lado e com que raridade (sem repetir a altura média embaixo) — ' + await texto('#audVeredito'));
  ok(await P.locator('#audGrafico rect.aud-barra.fora').count() >= 1 && await P.locator('#audGrafico text.aud-marca').count() >= 1 && await P.locator('#audPessoas tr.atual').count() === 1, 'as faces que saíram do intervalo ficam marcadas no gráfico (cor e seta), e a linha do Kaito fica destacada');
  await P.locator('#audPessoas .aud-link', { hasText: 'Kaito' }).click(); await w(250);
  ok(await P.locator('#audPessoa').inputValue() === '', 'clicando de novo no nome, volta a mostrar todos');
  await P.locator('#audDlg [data-close]').click(); await w(150);

  // ---------- poucas rolagens ----------
  await abrir('pouco');
  ok(await P.locator('#audVeredito').getAttribute('data-nivel') === 'pouco' && /Ainda são poucas rolagens para julgar/.test(await texto('#audVeredito')) && /Com cerca de \d+ já dá para dizer algo/.test(await texto('#audVeredito')) && await P.locator('#audGrafico rect.aud-barra').count() === 10 && await P.locator('#audGrafico rect.aud-barra.fora').count() === 0,
    'com 18 rolagens: "ainda são poucas", quantas faltam, e o gráfico do que saiu — sem marcar nada como fora — ' + await texto('#audVeredito'));
  const lidas = await P.evaluate(() => window.__lidas);
  await P.locator('#audDeNovo').click(); await w(300);
  ok(await P.evaluate(() => window.__lidas) === lidas + 1 && await P.locator('#audVeredito').count() === 1, '"Ler de novo" lê o registro outra vez');
  await P.locator('#audDlg [data-close]').click(); await w(150);

  // ---------- quando não dá para ler ----------
  await abrir('erro');
  ok(/Só o mestre abre o auditor dos dados/.test(await texto('#audErro')) && await P.locator('#audBody button', { hasText: 'Tentar de novo' }).count() === 1, 'se a leitura falha, a janela diz o motivo e oferece tentar de novo');

  // ---------- tela estreita ----------
  await P.locator('#audDlg [data-close]').click(); await w(150);
  await P.setViewportSize({ width: 390, height: 780 }); await w(200);
  await abrir('honesto');
  ok(await P.evaluate(() => { const d = document.getElementById('audDlg').getBoundingClientRect(), g = document.getElementById('audGrafico'); return d.width <= 390 && d.left >= 0 && g.scrollWidth > g.clientWidth && document.documentElement.scrollWidth <= 390; }), 'no celular a janela cabe na tela; o gráfico, que é largo, rola de lado dentro dela');

  if (t.errs.length) console.log(t.errs.slice(0, 10).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
