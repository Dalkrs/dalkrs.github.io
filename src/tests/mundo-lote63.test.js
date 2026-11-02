// Mapa-múndi, lote 63: os modos de trabalho, a apresentação, o exército novo, os modelos de unidade e os hexágonos em aquarela.
//   · tc/modelos.js (a conta): os modelos de começo, a escala dos exércitos, a divisão pela composição, a frota e o cerco;
//   · os modos (como o mestre encontra): Sessão, Guerra, Política e Preparar no alto; o trilho com o nome e a tecla de
//     cada ferramenta do modo; as abas do modo; a tecla de outra ferramenta troca o modo; Alt+número; lembrado;
//   · a apresentação na primeira vez (seis passos, Voltar, Pular, rever pelo "?");
//   · "Novo exército aqui" (botão direito e a ferramenta X): facção, tipo, tamanho; o token do tipo; a aba Exércitos;
//   · os modelos (aba Regras): mudar um número, criar, apagar, voltar aos de começo; o exército novo usa o modelo mudado;
//   · os hexágonos: a grade some de longe e, num mapa pintado, vai no desenho dos hexágonos (só na terra); a fronteira de atlas.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;
const TM = require('../../tc/modelos.js');

// ---------- a conta ----------
{
  ok(j(TM.lista(null).map(m => m.nome)) === j(['Aegis', 'Infantaria', 'Cavalaria', 'Arqueiros', 'Shajis', 'Sacerdotes', 'Magos']), 'os modelos de começo: Aegis, Infantaria, Cavalaria, Arqueiros, Shajis, Sacerdotes e Magos');
  const sh = TM.lista(null).find(m => m.nome === 'Shajis'); ok(sh.atq > sh.def && /furtiv/i.test(sh.desc), 'os Shajis: furtivos e rápidos (ataque maior que a defesa)');
  ok(TM.lista({ lista: [] }).length === 7 && TM.lista({ lista: [{ id: 'md_x', nome: '  Lanceiros  ', atq: 99, def: -99, hpT: 0 }] })[0].atq === 20, 'lista vazia volta à de começo; os números ficam nos limites');
  ok(j(TM.ORDEM_ARMAS) === j(['batedores', 'patrulha', 'guarnicao', 'hoste', 'horda', 'cerco', 'frota', 'caravanaArmada', 'mercenarios', 'caravanaComercial']), 'os dez tipos de exército (com Caravana armada, Mercenários e Caravana comercial)');
  ok(TM.totalDe('hoste', 'g') === 60 && TM.totalDe('hoste', 'p') === 22 && TM.totalDe('batedores', 'p') === 3 && TM.totalDe('horda', 'g') === 90 && TM.totalDe('caravanaComercial', 'g') === 12, 'a escala do mundo (a maior cidade tem uns 80): Hoste grande 60, Horda grande 90, Caravana comercial até 12');
  const d = TM.dividir('hoste', 60, TM.lista(null));
  ok(d.reduce((s, p) => s + p.n, 0) === 60 && d.map(p => p.m.nome).join(',') === 'Aegis,Infantaria,Arqueiros,Cavalaria,Sacerdotes,Magos', 'a Hoste de 60 dividida pela composição (a soma dá 60): ' + d.map(p => p.n + ' ' + p.m.nome).join(', '));
  const semAegis = TM.lista(null).filter(m => m.nome !== 'Aegis'), d2 = TM.dividir('guarnicao', 20, semAegis);
  ok(d2.reduce((s, p) => s + p.n, 0) === 20 && !d2.some(p => p.m.nome === 'Aegis'), 'sem o modelo Aegis na mesa, a parte dele vai para os outros (a soma continua 20)');
  ok(TM.barcosDe(TM.totalDe('frota', 'p')) === 1 && TM.barcosDe(TM.totalDe('frota', 'm')) === 2 && TM.barcosDe(TM.totalDe('frota', 'g')) === 3 && /3 barcos/.test(TM.nomeDoExercito('frota', 'g', 'Napha')), 'a frota: de 1 a 3 barcos, no nome');
  const ce = TM.unidadesDoMapa('cerco', 'm', TM.lista(null), [{ id: 'tp_inf', nome: 'Infantaria' }]);
  ok(j(ce[0].maq) === j({ ariete: 1, catapulta: 1 }) && ce[0].tipo === 'tp_inf' && TM.unidadesDoMapa('cerco', 'p', TM.lista(null))[0].maq.ariete === 1, 'o cerco leva as máquinas; o tipo de tropa do mapa vem pelo nome do modelo');
  const mg = TM.unidadesDoMapa('hoste', 'g', TM.lista(null)).find(u => u.nome === 'Magos'), sc = TM.unidadesDoMapa('hoste', 'g', TM.lista(null)).find(u => u.nome === 'Sacerdotes');
  ok(mg.magos === mg.tropas && sc.cura === 20, 'os magos contam como magos; os sacerdotes curam 20%');
  const ut = TM.unidadeDaTropa(TM.lista(null)[0], 12, 3);
  ok(ut.nome === 'Aegis' && ut.tropas === 12 && ut.cheio === 12 && ut.vet === 3 && ut.def === 5, 'a primeira unidade de uma tropa do clã pelo modelo');
}

const N = 24, TAM = 40;
function mapaPintado() {
  const hexes = {};
  for (let r = 0; r < 14; r++) for (let q = -Math.floor(r / 2); q < N - Math.floor(r / 2); q++) hexes[q + ',' + r] = q < 4 ? 'ag' : (q + r) % 5 === 0 ? 'mo' : r < 6 ? 'fl' : 'pl';
  return { v: 1, id: 'mp_t63', nome: 'Ensaio', larg: 1000, alt: 700, grade: { x: 0, y: 0, on: true, des: true, tam: TAM, alfa: 0.8, orient: 'pe' }, hexes,
    terrenos: [{ id: 'pl', nome: 'Planície', cor: '#a3bf6a', tex: 'mato', custo: 5 }, { id: 'fl', nome: 'Floresta', cor: '#3f7a46', tex: 'arvores', custo: 10 }, { id: 'mo', nome: 'Montanha', cor: '#8b8178', tex: 'montes', custo: 15 }, { id: 'ag', nome: 'Água', cor: '#4f86c0', tex: 'ondas', custo: 10 }],
    faccoes: [{ id: 'fn', nome: 'Narcitios', cor: '#8a5cc0' }, { id: 'fc', nome: 'Caliels', cor: '#2f9a9a' }],
    objs: [{ k: 'r', id: 'rg_a', fac: 'fn', nome: 'Marca', cor: '', pts: [[400, 200], [700, 200], [700, 500], [400, 500]] }] };
}

(async () => {
  const t = await start();
  const seed = { 'tinycats:mundo:v1': j({ atual: 'mp_t63', mapas: { mp_t63: mapaPintado() } }) };
  const { page: P } = await t.device({ name: 'l63', w: 1440, h: 900, fechado: true, seed });
  const w = ms => P.waitForTimeout(ms), E = (fn, a) => P.evaluate(fn, a);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const foto = async nome => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const App = () => E(() => ({ modo: window.__mundo.App.modo().id, fer: window.__mundo.App.ferramenta }));
  const visiveis = sel => E(s => [...document.querySelectorAll(s)].filter(b => !b.hidden && b.offsetParent).map(b => (b.querySelector('span') || b).textContent.trim()), sel);
  await P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' }); await w(1500);

  await passo('os modos', async () => {
    ok(j(await visiveis('#modos .modo:not(.modo-tour)')) === j(['Sessão', 'Guerra', 'Política', 'Preparar']), 'no alto, os quatro modos');
    ok((await App()).modo === 'sessao' && j(await E(() => [...document.querySelectorAll('#rail .tool')].map(b => b.querySelector('.tool-nome').textContent + ':' + b.querySelector('.tool-tecla').textContent))) === j(['Selecionar:V', 'Grupo:G', 'Evento:E', 'Marcador:M', 'Régua:D', 'Caneta:W']), 'Sessão: o trilho com o nome e a tecla de cada ferramenta');
    ok(j(await visiveis('#tabs .tab')) === j(['Seleção', 'Hoje', 'Linha']), 'Sessão: as abas Seleção, Hoje e Linha');
    await P.locator('.modo[data-modo="guerra"]').click(); await w(300);
    ok(j(await E(() => [...document.querySelectorAll('#rail .tool')].map(b => b.dataset.f))) === j(['sel', 'x', 'f', 'd']) && j(await visiveis('#tabs .tab')) === j(['Seleção', 'Regras', 'Exércitos']), 'Guerra: Novo exército, Frente e Régua; as abas Seleção, Regras e Exércitos');
    ok(await E(() => document.getElementById('pane').dataset.grupo) === 'guerra' && await E(() => document.querySelector('#tab-exercitos').getAttribute('aria-selected')) === 'true', 'trocar de modo abre a aba principal dele (a cor do painel é a do modo)');
    await foto('l63-guerra');
    await P.locator('.modo[data-modo="politica"]').click(); await w(250);
    ok(j(await visiveis('#tabs .tab')) === j(['Seleção', 'Reinos', 'Corte', 'Diplomacia', 'Intrigas']), 'Política: Reinos, Corte, Diplomacia e Intrigas');
    await P.mouse.click(700, 450); await P.keyboard.press('h'); await w(300);
    ok(j(await App()) === j({ modo: 'preparar', fer: 'h' }) && await E(() => document.querySelector('#tab-terreno').getAttribute('aria-selected')) === 'true', 'a tecla H (Terreno) leva ao modo Preparar, já com a ferramenta');
    await P.keyboard.press('Escape'); await P.keyboard.press('Alt+1'); await w(250);
    ok((await App()).modo === 'sessao', 'Alt+1 volta à Sessão');
    await E(() => window.__mundo.Painel.abrirAba('intrigas')); await w(250);
    ok((await App()).modo === 'politica', 'abrir uma aba de outro modo (pelo código ou pela busca) troca o modo');
    await P.reload({ waitUntil: 'load' }); await w(1300);
    ok((await App()).modo === 'politica', 'o modo fica lembrado neste aparelho');
    await P.locator('#comoJog').check(); await w(300);
    ok(await E(() => document.getElementById('modos').hidden) && await E(() => document.getElementById('tabs').dataset.modo) === 'grupos', '"Ver como jogador": sem os modos (as abas de quem joga)');
    await P.locator('#comoJog').uncheck(); await w(300);
  });

  await passo('a apresentação', async () => {
    const { page: Q } = await t.device({ name: 'l63-tour', w: 1440, h: 900, fechado: true, tourMundo: true, seed });
    await Q.goto(t.base + 'mundo/?debug', { waitUntil: 'load' }); await Q.waitForTimeout(2200);
    ok(await Q.locator('.tour').count() === 1 && /Passo 1 de 6/.test(await Q.locator('.tour-n').innerText()) && /modos de trabalho/i.test(await Q.locator('.tour-card h2').innerText()), 'na primeira vez, a apresentação abre: passo 1 de 6, os modos');
    if (process.env.TC_SCRATCH) await Q.screenshot({ path: require('path').join(process.env.TC_SCRATCH, 'fotos', 'l63-tour.png') });
    await Q.locator('[data-k="tour:prox"]').click(); await Q.waitForTimeout(300);
    ok(/Passo 2/.test(await Q.locator('.tour-n').innerText()) && !(await Q.locator('[data-k="tour:volta"]').isDisabled()), 'Próximo: o passo 2 (o trilho); Voltar fica ativo');
    for (let i = 0; i < 5; i++) { await Q.locator('[data-k="tour:prox"]').click(); await Q.waitForTimeout(200); }
    ok(await Q.locator('.tour').count() === 0 && await Q.evaluate(() => localStorage.getItem('tinycats:mundo:tour63')) === 'visto', '"Começar" no último passo fecha e fica lembrado');
    await Q.reload({ waitUntil: 'load' }); await Q.waitForTimeout(1800);
    ok(await Q.locator('.tour').count() === 0, 'na segunda vez, não abre');
    await Q.locator('[data-k="tour:rever"]').click(); await Q.waitForTimeout(300);
    ok(await Q.locator('.tour').count() === 1, 'o "?" do alto mostra de novo');
    await Q.keyboard.press('Escape'); await Q.waitForTimeout(200);
    ok(await Q.locator('.tour').count() === 0, 'Esc pula');
  });

  await passo('o exército novo', async () => {
    await P.locator('.modo[data-modo="guerra"]').click(); await w(300);
    await E(() => window.MundoTela.caber()); await w(300);
    const pal = await P.locator('#palco').boundingBox();
    await P.mouse.click(pal.x + pal.width * 0.12, pal.y + pal.height * 0.5, { button: 'right' }); await w(300);
    ok(await P.locator('.menu button', { hasText: 'Novo exército aqui' }).count() === 1, 'no botão direito do mapa: "Novo exército aqui"');
    await P.locator('.menu button', { hasText: 'Novo exército aqui' }).click(); await w(300);
    ok(await P.locator('.ne-janela').count() === 1 && await P.locator('.ne-tipo').count() === 10, 'a janela: facção, os dez tipos e o tamanho');
    await P.locator('[data-k="ne:fac:fc"]').click(); await P.locator('[data-k="ne:tipo:guarnicao"]').click(); await P.locator('[data-k="ne:tam:g"]').click(); await w(150);
    ok(/^25 soldados: 10 aegis, 8 infantaria, 7 arqueiros/.test(await P.locator('.ne-conta').innerText()), 'a conta antes de criar: ' + await P.locator('.ne-conta').innerText());
    await foto('l63-janela');
    await P.locator('[data-k="ne:ok"]').click(); await w(500);
    const g = await E(() => { const m = window.__mundo.App.mapa, o = m.objs.find(x => x.k === 'g'); return o && { nome: o.nome, arma: o.arma, fac: o.fac, oculto: o.oculto, tipo: o.tipo, tr: o.exe.unid.reduce((s, u) => s + u.tropas, 0), n: o.exe.unid.length }; });
    ok(g && g.tipo === 'exercito' && g.arma === 'guarnicao' && g.fac === 'fc' && g.oculto && g.tr === 25 && g.n === 3 && g.nome === 'Guarnição — Caliels', 'o exército: a Guarnição dos Caliels, com 25 soldados em 3 unidades, escondida: ' + j(g));
    ok(await E(() => { const el = document.querySelector('.gru-arma[data-arma="guarnicao"]'); return !!el && el.querySelector('.arma-anel').getAttribute('stroke') === '#2f9a9a'; }), 'no mapa, o token com o desenho do tipo e o anel na cor da facção');
    ok(await E(() => window.__mundo.App.sel.length === 1 && document.querySelector('#tab-selecao').getAttribute('aria-selected') === 'true'), 'fica escolhido, com a Seleção aberta');
    await P.locator('.toast button', { hasText: 'Desfazer' }).first().click(); await w(300);
    ok(await E(() => !window.__mundo.App.mapa.objs.some(x => x.k === 'g')), 'Desfazer tira o exército');
    // a ferramenta X
    await P.mouse.move(pal.x + pal.width * 0.4, pal.y + pal.height * 0.4); await P.keyboard.press('x'); await w(150);
    ok((await App()).fer === 'x', 'a tecla X: a ferramenta Novo exército');
    await P.mouse.click(pal.x + pal.width * 0.4, pal.y + pal.height * 0.4); await w(300);
    await P.locator('[data-k="ne:tipo:frota"]').click(); await P.locator('[data-k="ne:tam:m"]').click(); await P.locator('[data-k="ne:ok"]').click(); await w(400);
    ok(await E(() => { const o = window.__mundo.App.mapa.objs.find(x => x.k === 'g'); return o && o.arma === 'frota' && /barco/.test(o.nome) && o.fac === 'fc'; }), 'um clique com a ferramenta: a janela lembra a última facção; a Frota leva os barcos no nome');
    await P.locator('#tab-exercitos').click(); await w(300);
    const lista = await E(() => [document.querySelectorAll('.ex-linha').length, [...document.querySelectorAll('#pane details.sec > summary b')].map(b => b.textContent)]);
    ok(lista[0] === 1 && lista[1].includes('Caliels (1)'), 'a aba Exércitos: os exércitos por facção: ' + j(lista));
    await foto('l63-exercitos');
  });

  await passo('os modelos', async () => {
    await P.locator('#tab-guerra').click(); await w(300);
    await E(() => { const d = document.querySelector('[data-k="sec:Modelos de unidade"]'); if (d) d.open = true; }); await w(200);
    ok(await P.locator('.md-carta').count() === 7, 'na aba Regras, os sete modelos');
    const atq = P.locator('[data-k="md:md_infantaria:atq"]');
    await atq.fill('6'); await atq.press('Enter'); await w(300);
    ok(await E(() => window.__mundo.App.modelos().find(m => m.id === 'md_infantaria').atq) === 6, 'mudar o ATQ da Infantaria grava o modelo');
    await P.locator('[data-k="md:novo"]').click(); await w(300);
    ok(await E(() => window.__mundo.App.modelos().length) === 8, '"+ Modelo" cria um');
    await P.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(300);
    ok(await E(() => window.__mundo.App.modelos().length) === 7, 'Desfazer tira o modelo novo');
    const id = await E(() => window.__mundo.criarTeste = window.MundoExercitosPainel.criarExercito({ x: 300, y: 300 }, { fac: 'fn', arma: 'patrulha', tam: 'g', oculto: false }));
    ok(await E(id => window.__mundo.App.mapa.objs.find(o => o.id === id).exe.unid.find(u => u.nome === 'Infantaria').atq, id) === 6, 'o exército novo usa o modelo mudado (ATQ 6)');
    await P.locator('#tab-guerra').click(); await w(300);
    await E(() => { const d = document.querySelector('[data-k="sec:Modelos de unidade"]'); if (d) d.open = true; }); await w(200);
    await P.locator('[data-k="md:comeco"]').click(); await w(300);
    ok(await E(() => window.__mundo.App.modelos().find(m => m.id === 'md_infantaria').atq) === 3, '"Voltar aos de começo"');
  });

  await passo('os hexágonos', async () => {
    await P.locator('.modo[data-modo="sessao"]').click(); await w(200);
    await E(() => window.MundoTela.caber()); await w(900);
    const longe = await E(() => ({ op: Number(document.querySelector('rect.grade').dataset.op), hex: document.querySelector('canvas.hex-desenho') ? document.querySelector('canvas.hex-desenho').dataset.gradeHex || '' : '' }));
    ok(longe.op === 0, 'num mapa pintado, a grade de cima não aparece (as linhas vão no desenho dos hexágonos)');
    for (let i = 0; i < 6; i++) { await P.mouse.move(700, 450); await P.mouse.wheel(0, -240); await w(150); }
    await w(1200);
    const perto = await E(() => Number(document.querySelector('canvas.hex-desenho').dataset.gradeHex || 0));
    const terra = await E(() => Object.values(window.__mundo.App.mapa.hexes).filter(v => v !== 'ag').length);
    ok(perto > 0 && perto <= terra, 'de perto, a grade no desenho dos hexágonos, só nos de terra (' + perto + ' de ' + terra + ' de terra à vista)');
    ok(await E(() => !!document.querySelector('path.reg.atlas') && !!document.querySelector('path.reg-faixa[clip-path]')), 'a região com dono: a fronteira de atlas (o tracejado e a faixa por dentro)');
    await foto('l63-hex');
  });

  const fora = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 10).join('\n'));
  ok(fora.length === 0, 'sem erros no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
