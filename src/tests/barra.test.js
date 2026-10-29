// A barra de cima (28/10), na casca, sem conta (cada um mestra tudo: Jogar, Mundo, Descanso e Mestre à vista):
//   · o nome de cada categoria recolhe e abre as abas dela; recolhida, fica um botão que abre o menu com as abas (a
//     aberta, marcada) e "Mostrar … na barra"; o botão mostra a aba aberta quando ela é da categoria; lembrado no aparelho;
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
  const dv = await t.device({ name: 'barra', w: 1440, h: 860, seed: { 'tinycats:aba': 'cenas' } });
  const P = dv.page;
  P.setDefaultTimeout(8000);
  const foto = async nome => { if (process.env.TC_SCRATCH) await P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };
  const abaAtual = () => P.evaluate(() => (document.querySelector('.tab[aria-selected="true"]') || {}).id || '');
  const visivel = sel => P.evaluate(s => { const e = document.querySelector(s); return !!e && !!e.offsetParent && e.getBoundingClientRect().width > 0; }, sel);
  const guardadas = () => P.evaluate(() => localStorage.getItem('tinycats:abas-recolhidas'));
  const setas = () => P.evaluate(() => ({ e: !document.getElementById('tabsEsq').hidden, d: !document.getElementById('tabsDir').hidden }));

  await P.goto(t.base + '?debug', { waitUntil: 'load' }); await espera(1500);

  await passo('as categorias abertas', async () => {
    const g = await P.evaluate(() => [...document.querySelectorAll('.grupo')].filter(x => !x.hidden).map(x => x.dataset.g + ':' + document.getElementById('gt-' + x.dataset.g).getAttribute('aria-expanded')));
    ok(j(g) === j(['jogar:true', 'mundo:true', 'descanso:true', 'mestre:true']), 'as quatro categorias, abertas, com o nome em botão: ' + j(g));
    ok(await P.evaluate(() => document.querySelectorAll('.grupo-menu').length === 5 && [...document.querySelectorAll('.grupo-menu')].every(b => !b.offsetParent)), 'o botão da categoria recolhida não aparece com ela aberta');
    ok(j(await setas()) === j({ e: false, d: true }), 'com as treze abas abertas, nem a tela larga cabe tudo: a seta da direita aparece');
    ok(await P.evaluate(() => [...document.querySelectorAll('.tab')].filter(x => !x.hidden).map(x => x.id.slice(4)).join(',')) === 'cenas,fichas,rolador,mundo,jornal,cla,livro,acampamento,meditacao,oficina,bestiario,itens,escudo', 'as abas de sempre (o botão da categoria não é uma aba; lote 31: o Escudo do mestre)');
  });

  await passo('recolher uma categoria', async () => {
    await P.click('#gt-mundo'); await espera(250);
    ok(await P.evaluate(() => document.getElementById('grupo-mundo').classList.contains('recolhido') && document.getElementById('gt-mundo').getAttribute('aria-expanded') === 'false'), 'o nome “Mundo” recolhe as abas dela');
    ok(!(await visivel('#tab-mundo')) && !(await visivel('#tab-jornal')) && await visivel('#gm-mundo'), 'no lugar das abas, o botão da categoria');
    ok((await P.locator('#gm-mundo').innerText()).trim() === 'Mundo', 'o botão diz o nome da categoria (a aba aberta é de outra)');
    ok(await guardadas() === '["mundo"]', 'lembrado neste aparelho: ' + await guardadas());
    // (lote 31: com o Escudo do mestre, a barra cresceu — as setas acompanham se ainda sobra aba ou não)
    const sobra = await P.evaluate(() => { const t = document.getElementById('tabs'); return t.scrollWidth > t.clientWidth + 1; });
    ok(j(await setas()) === j({ e: false, d: sobra }), 'com Mundo recolhida, a barra encolhe: as setas só aparecem se ainda sobra aba (' + (sobra ? 'sobra' : 'tudo cabe') + ')');
    await foto('barra-recolhida');
  });

  await passo('o menu da categoria recolhida', async () => {
    await P.click('#gm-mundo'); await espera(200);
    ok(await P.evaluate(() => { const m = document.getElementById('menuGrupo'); return !!m && m.getBoundingClientRect().height > 40; }) && (await P.locator('#gm-mundo').getAttribute('aria-expanded')) === 'true', 'o botão abre o menu');
    const itens = await P.locator('#menuGrupo .mg-it[data-aba]').allInnerTexts();
    ok(j(itens) === j(['Mapa-múndi', 'Jornal', 'Clã', 'Bestiário do clã']) && /Mostrar as abas de Mundo na barra/.test(await P.locator('#mg-mostrar').innerText()), 'as abas dela e “Mostrar na barra”: ' + j(itens));
    await foto('barra-menu');
    await P.keyboard.press('Escape'); await espera(150);
    ok(!(await P.locator('#menuGrupo').count()) && await P.evaluate(() => document.activeElement && document.activeElement.id === 'gm-mundo'), 'Esc fecha e volta ao botão');
    await P.click('#gm-mundo'); await espera(150);
    await P.click('#menuGrupo .mg-it[data-aba="jornal"]'); await espera(600);
    ok(await abaAtual() === 'tab-jornal' && !(await P.locator('#menuGrupo').count()), 'escolher no menu abre a aba (e fecha o menu)');
    ok((await P.locator('#gm-mundo').innerText()).trim() === 'Jornal' && await P.evaluate(() => document.getElementById('gm-mundo').classList.contains('ativo')), 'o botão mostra a aba aberta, marcado');
    await P.click('#gm-mundo'); await espera(150);
    ok((await P.locator('#menuGrupo [aria-current="page"]').innerText()).trim() === 'Jornal', 'no menu, a aba aberta vem marcada');
    await P.mouse.click(700, 500); await espera(150);
    ok(!(await P.locator('#menuGrupo').count()), 'clicar fora fecha o menu');
  });

  await passo('lembrado ao recarregar', async () => {
    await P.reload({ waitUntil: 'load' }); await espera(1500);
    ok(await P.evaluate(() => document.getElementById('grupo-mundo').classList.contains('recolhido')) && (await P.locator('#gm-mundo').innerText()).trim() === 'Jornal', 'recarregado: Mundo continua recolhida, com o Jornal aberto');
    await P.click('#gm-mundo'); await espera(150);
    await P.click('#mg-mostrar'); await espera(250);
    ok(await visivel('#tab-mundo') && await visivel('#tab-jornal') && !(await visivel('#gm-mundo')) && await guardadas() === '[]', '“Mostrar as abas de Mundo na barra” abre de novo');
    await P.click('#gt-descanso'); await P.click('#gt-mestre'); await P.click('#gt-jogar'); await espera(250);
    ok(await guardadas() === '["descanso","mestre","jogar"]' && await visivel('#gm-jogar') && await visivel('#gm-descanso') && await visivel('#gm-mestre'), 'várias recolhidas de uma vez');
    await foto('barra-quase-tudo-recolhido');
    for (const g of ['jogar', 'descanso', 'mestre']) await P.click('#gt-' + g);
    await espera(200);
  });

  await passo('a rolagem', async () => {
    await P.setViewportSize({ width: 820, height: 760 }); await espera(500);
    const r0 = await P.evaluate(() => { const t = document.getElementById('tabs'); return { sw: t.scrollWidth, cw: t.clientWidth, sl: t.scrollLeft }; });
    ok(r0.sw > r0.cw + 40, '(na tela estreita, as abas não cabem: ' + j(r0) + ')');
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
    await foto('barra-rolagem');
    // abrir uma aba fora da vista (Itens, na ponta da direita) a traz para a vista
    await P.evaluate(() => { document.getElementById('tabs').scrollLeft = 0; }); await espera(150);
    await P.evaluate(() => document.getElementById('tab-itens').click()); await espera(800);
    const vis = await P.evaluate(() => { const a = document.getElementById('tab-itens').getBoundingClientRect(), t = document.getElementById('tabs').getBoundingClientRect(); return a.left >= t.left - 1 && a.right <= t.right + 1; });
    ok(await abaAtual() === 'tab-itens' && vis, 'a aba aberta fica sempre à vista na barra');
  });

  const erros = (dv.errs || t.errs || []).filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
