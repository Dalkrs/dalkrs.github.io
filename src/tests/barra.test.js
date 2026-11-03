// A barra de cima (lote 68: os modos), na casca, sem conta (cada um mestra tudo):
//   · os quatro modos no alto (Sessão, Mundo, Descanso, Preparar): só as abas do modo ficam à vista; trocar de modo
//     abre a última aba usada nele (lembrada no aparelho); abrir uma aba de outro modo (pelo endereço) troca o modo;
//     as setas do teclado andam entre os modos;
//   · "Mostrar as abas de todos os modos", no menu: a barra antiga, com tudo;
//   · quando as abas não cabem: a barra de rolagem fina e as setas ‹ › (só do lado em que há aba escondida); a roda do
//     mouse rola para os lados; a aba aberta fica sempre à vista.
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;
const espera = ms => new Promise(r => setTimeout(r, ms));
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }

(async () => {
  const t = await start();
  const dv = await t.device({ name: 'barra', w: 1440, h: 860, modos: true, seed: { 'tinycats:aba': 'cenas' } });
  const P = dv.page;
  P.setDefaultTimeout(8000);
  const foto = async nome => { if (process.env.TC_SCRATCH) await P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };
  const abaAtual = () => P.evaluate(() => (document.querySelector('.tab[aria-selected="true"]') || {}).id || '');
  const modoAtual = () => P.evaluate(() => (document.querySelector('.modo[aria-checked="true"]') || {}).id || '');
  const abasVisiveis = () => P.evaluate(() => [...document.querySelectorAll('.tab')].filter(x => x.offsetParent && !x.hidden).map(x => x.id.slice(4)).join(','));
  const setas = () => P.evaluate(() => ({ e: !document.getElementById('tabsEsq').hidden, d: !document.getElementById('tabsDir').hidden }));

  await P.goto(t.base + '?debug', { waitUntil: 'load' }); await espera(1500);

  await passo('os modos', async () => {
    ok(j(await P.locator('.modo').allInnerTexts()) === j(['Sessão', 'Mundo', 'Descanso', 'Preparar']), 'os quatro modos, com o nome');
    ok(await modoAtual() === 'modo-sessao' && await abasVisiveis() === 'cenas,fichas,rolador,escudo', 'em Cenas: o modo Sessão e só as abas dele: ' + await abasVisiveis());
    ok(!(await P.locator('.grupo-t').count()), 'sem os rótulos em caixa alta das categorias');
    ok(j(await setas()) === j({ e: false, d: false }), 'na tela larga, as abas do modo cabem: sem setas');
    await foto('barra-modos');
  });

  await passo('trocar de modo', async () => {
    await P.click('#modo-mundo'); await espera(700);
    ok(await abaAtual() === 'tab-mundo' && await modoAtual() === 'modo-mundo', 'Mundo abre a primeira aba dele (o Mapa-múndi)');
    ok(await abasVisiveis() === 'mundo,jornal,cla,livro', 'e só as abas do Mundo: ' + await abasVisiveis());
    await P.click('#tab-jornal'); await espera(500);
    await P.click('#modo-sessao'); await espera(500);
    ok(await abaAtual() === 'tab-cenas', 'Sessão volta para a aba que estava aberta nela (Cenas)');
    await P.click('#modo-mundo'); await espera(500);
    ok(await abaAtual() === 'tab-jornal', 'e Mundo volta para o Jornal, a última aberta nele');
    // as setas do teclado
    await P.focus('#modo-mundo'); await P.keyboard.press('ArrowRight'); await espera(600);
    ok(await modoAtual() === 'modo-descanso' && await abaAtual() === 'tab-acampamento', '→ vai para o modo seguinte (Descanso, no Acampamento)');
    // pelo endereço: uma aba de outro modo troca o modo junto
    await P.evaluate(() => { location.hash = '#/itens'; }); await espera(800);
    ok(await abaAtual() === 'tab-itens' && await modoAtual() === 'modo-preparar', 'abrir Itens pelo endereço leva ao modo Preparar');
    await P.reload({ waitUntil: 'load' }); await espera(1500);
    ok(await abaAtual() === 'tab-itens' && await modoAtual() === 'modo-preparar', 'recarregado: continua em Itens, no Preparar');
    await P.click('#modo-mundo'); await espera(500);
    ok(await abaAtual() === 'tab-jornal', 'a última aba de cada modo fica lembrada ao recarregar');
  });

  await passo('todas as abas', async () => {
    await P.evaluate(() => { localStorage.setItem('tinycats:abas-todas', '1'); }); await P.reload({ waitUntil: 'load' }); await espera(1500);
    ok(await abasVisiveis() === 'cenas,fichas,rolador,escudo,mundo,jornal,cla,livro,acampamento,meditacao,oficina,bestiario,itens', 'ligado “Mostrar as abas de todos os modos”: a barra antiga, com tudo');
    ok(await modoAtual() === 'modo-mundo', '(o modo da aba aberta continua marcado)');
    await P.evaluate(() => { localStorage.setItem('tinycats:abas-todas', '0'); }); await P.reload({ waitUntil: 'load' }); await espera(1500);
  });

  await passo('a rolagem', async () => {
    await P.evaluate(() => { localStorage.setItem('tinycats:abas-todas', '1'); }); await P.reload({ waitUntil: 'load' }); await espera(1200);
    await P.setViewportSize({ width: 820, height: 760 }); await espera(500);
    const r0 = await P.evaluate(() => { const t = document.getElementById('tabs'); return { sw: t.scrollWidth, cw: t.clientWidth, sl: t.scrollLeft }; });
    ok(r0.sw > r0.cw + 40, '(na tela estreita, com todas as abas, elas não cabem: ' + j(r0) + ')');
    await P.evaluate(() => { document.getElementById('tabs').scrollLeft = 0; }); await espera(200);
    ok(j(await setas()) === j({ e: false, d: true }), 'no começo, só a seta da direita');
    ok(await P.evaluate(() => { const t = document.getElementById('tabs'), cs = getComputedStyle(t); return cs.overflowX === 'auto' && cs.scrollbarWidth === 'thin'; }), 'a barra de rolagem fina (só aparece quando não cabe)');
    await P.click('#tabsDir'); await espera(700);
    const sl1 = await P.evaluate(() => document.getElementById('tabs').scrollLeft);
    ok(sl1 > 100 && (await setas()).e, 'a seta da direita rola, e a da esquerda aparece: ' + sl1);
    await P.click('#tabsEsq'); await espera(700);
    ok(await P.evaluate(() => document.getElementById('tabs').scrollLeft) < sl1, 'a da esquerda volta');
    await P.evaluate(() => { document.getElementById('tabs').scrollLeft = 0; }); await espera(150);
    const box = await P.locator('#tabs').boundingBox();
    await P.mouse.move(box.x + 60, box.y + box.height / 2);
    await P.mouse.wheel(0, 300); await espera(300);
    ok(await P.evaluate(() => document.getElementById('tabs').scrollLeft) > 100, 'a roda do mouse rola as abas para os lados');
    await P.evaluate(() => { document.getElementById('tabs').scrollLeft = 0; }); await espera(150);
    await P.evaluate(() => document.getElementById('tab-itens').click()); await espera(800);
    const vis = await P.evaluate(() => { const a = document.getElementById('tab-itens').getBoundingClientRect(), t = document.getElementById('tabs').getBoundingClientRect(); return a.left >= t.left - 1 && a.right <= t.right + 1; });
    ok(await abaAtual() === 'tab-itens' && vis, 'a aba aberta fica sempre à vista na barra');
    // só os modos, na tela estreita: os ícones (o nome fica na dica)
    await P.evaluate(() => { localStorage.setItem('tinycats:abas-todas', '0'); }); await P.reload({ waitUntil: 'load' }); await espera(1200);
    ok(await P.evaluate(() => [...document.querySelectorAll('.modo span')].every(s => getComputedStyle(s).display === 'none')), 'na tela estreita, os modos ficam só com o ícone');
    await foto('barra-estreita');
  });

  const erros = (dv.errs || t.errs || []).filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
