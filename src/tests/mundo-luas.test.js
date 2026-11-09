// Lote 126: as luas do Mapa-múndi. A conta (fases, chance de estar no céu, a horda) e a tela: o canto das luas em cima do
// zoom, o cartão, a janela "As luas" e a horda quando a Lua do olho sobe.
// Uso: node src/tests/mundo-luas.test.js   (TC_SCRATCH=pasta guarda as fotos)
const N = require('../../mundo/nucleo.js');
const { checker, start } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;

/* ---------------- a conta ---------------- */
const m = N.normalizarMapa({ id: 'mp_l', larg: 2000, alt: 1500, cal: { dia: 0, luas: N.LUAS_PADRAO }, objs: [] });
ok(j(m.cal.luas.map(l => l.nome)) === j(['Lua Kitsune', 'Lua secundária', 'Lua do olho']), 'as três luas de começo');
ok(m.cal.luas[2].fases === false && m.cal.luas[2].chance === 5 && m.cal.luas[2].horda === true, 'a Lua do olho: sem fases, 5% por noite, traz horda');
ok(!('luas' in N.normalizarMapa({ cal: {}, objs: [] }).cal), 'sem cal.luas, o mapa não tem luas');
const k = m.cal.luas[0];
ok(N.faseDaLua(k, 0).nome === 'Nova' && N.faseDaLua(k, 0).luz === 0 && N.faseDaLua(k, 15).nome === 'Cheia' && N.faseDaLua(k, 15).luz === 100, 'Kitsune (30 dias): nova no dia 0, cheia no 15');
ok(N.faseDaLua(k, 7).nome === 'Crescente' && N.faseDaLua(k, 7).cresce && N.faseDaLua(k, 22).nome === 'Minguante' && !N.faseDaLua(k, 22).cresce, 'crescente e minguante');
ok(N.faseDaLua(k, 30).nome === 'Nova' && N.faseDaLua(k, 45).nome === 'Cheia', 'o ciclo volta');
const ren = N.normLuas([{ nome: 'Branca', ciclo: 20, nomes: ['Escura', '', 'Plena', 'Velha'], cor: 'vermelho', chance: 140 }])[0];
ok(j(ren.nomes) === j(['Escura', 'Crescente', 'Plena', 'Velha']) && ren.cor === '#dcdcdc' && ren.chance === 100 && N.faseDaLua(ren, 10).nome === 'Plena', 'nomes das fases, cor e chance arrumados');
const olho = m.cal.luas[2];
let noites = 0; for (let d = 0; d < 4000; d++) if (N.luaNoCeu(olho, d)) noites++;
ok(noites > 120 && noites < 290, 'a Lua do olho sobe em perto de 5% das noites (' + noites + ' de 4000)');
ok([0, 1, 2, 3].every(d => N.luaNoCeu(olho, d) === N.luaNoCeu(JSON.parse(j(olho)), d)), 'o mesmo dia dá o mesmo céu em qualquer aparelho');
const forc = Object.assign({}, olho, { forca: { d: 3, v: true } });
ok(N.luaNoCeu(forc, 3) && N.normLuas([forc])[0].forca.d === 3, '"Fazer subir esta noite" vale na noite escolhida');
const hs = N.hordasEntre(m.cal, 0, 400);
ok(hs.length > 5 && hs.every(x => x.lua.id === 'olho' && N.luaNoCeu(olho, x.dia)), 'as hordas do ano são as noites da Lua do olho');
ok(N.proximaLua(olho, 0) === hs[0].dia, 'quando ela volta: ' + N.proximaLua(olho, 0));
ok(N.projetar(m).cal.luas.length === 3, 'os jogadores recebem as luas');
const ev = N.normalizarMapa({ larg: 100, alt: 100, objs: [{ id: 'e_1', k: 'e', tipo: 'horda', lua: 'olho', x: 1, y: 1, r: 5, ini: 3, fim: 3 }] }).objs[0];
ok(ev && ev.tipo === 'horda' && ev.lua === 'olho' && N.EVENTOS.horda.nome === 'Horda de monstros', 'o evento Horda guarda de qual lua veio');

/* ---------------- a tela ---------------- */
(async () => {
  const t = await start();
  const mapa = { id: 'mp_luas', nome: 'Ilha', larg: 2000, alt: 1500, cal: { dia: 0, ano0: 620, meses: [{ nome: 'Degelo', dias: 30, est: 'primavera' }, { nome: 'Florada', dias: 30, est: 'primavera' }] }, objs: [] };
  const seed = { 'tinycats:mundo:v1': j({ atual: 'mp_luas', mapas: { mp_luas: mapa } }) };
  const { page: P } = await t.device({ name: 'luas', w: 1440, h: 900, fechado: true, seed });
  const w = ms => P.waitForTimeout(ms), E = (fn, a) => P.evaluate(fn, a);
  const foto = async nome => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' }); await w(1500);
  const mapaAgora = () => E(() => window.__mundo.App.mapa);

  await passo('pôr as luas', async () => {
    ok(await P.locator('#luas .luas-novo').isVisible(), 'sem luas, quem mestra vê o botão "Luas"');
    await P.locator('#luas .luas-novo').click(); await w(300);
    ok((await mapaAgora()).cal.luas.length === 3, 'o botão põe as três luas');
    ok(await P.locator('.luas-cartao').isVisible() && await P.locator('.luas-cartao .lua-lin').count() === 3, 'o cartão abre com as três');
    const txt = await P.locator('.luas-cartao').innerText();
    ok(/Lua Kitsune/.test(txt) && /Nova/.test(txt) && /chance de 5% por noite/.test(txt) && /volta ao céu em/.test(txt), 'o cartão do mestre: a fase, a chance e quando volta');
    await foto('luas-cartao');
  });
  await passo('fazer subir e a horda', async () => {
    const bt = P.locator('.luas-cartao button', { hasText: 'Fazer subir esta noite' });
    ok(await bt.count() === 1, 'só a Lua do olho tem "Fazer subir"');
    await bt.click(); await w(300);
    const hs = (await mapaAgora()).objs.filter(o => o.k === 'e' && o.tipo === 'horda');
    ok(hs.length === 1 && hs[0].oculto === true && hs[0].lua === 'olho' && hs[0].ini === 0, 'a lua subiu: o mapa ganhou uma Horda escondida');
    ok(/Horda/.test(await E(() => document.getElementById('toasts').innerText)), 'o mestre é avisado');
    await E(() => window.__mundo.App.desfazer()); await w(200);
    ok((await mapaAgora()).objs.filter(o => o.tipo === 'horda').length === 0 && !(await mapaAgora()).cal.luas[2].forca, 'desfazer tira a lua e a horda juntas');
  });
  await passo('passar os dias', async () => {
    const alvo = N.hordasEntre(N.normalizarMapa({ cal: { luas: N.LUAS_PADRAO } }).cal, 0, 400)[0].dia;
    await E(n => { window.__mundo.App.mudar('ir', m => { m.cal.dia = n - 1; }); }, alvo); await w(200);
    await P.locator('#diaMais').click(); await w(500);
    const hs = (await mapaAgora()).objs.filter(o => o.tipo === 'horda');
    ok(hs.length === 1 && hs[0].ini === alvo, 'passar para a noite da Lua do olho põe a horda no mapa (dia ' + alvo + ')');
  });
  await passo('a janela', async () => {
    await P.locator('#luas .luas-bt').click(); await w(200);
    if (!(await P.locator('.luas-cartao').isVisible())) { await P.locator('#luas .luas-bt').click(); await w(200); }
    await P.locator('.luas-cartao button', { hasText: 'Editar as luas' }).click(); await w(300);
    ok(await P.locator('dialog.luas-dl').isVisible() && await P.locator('dialog.luas-dl .lua-card').count() === 3, 'a janela: um cartão por lua');
    await foto('luas-janela');
    const c0 = P.locator('dialog.luas-dl .lua-card').nth(0);
    await c0.locator('input[type=text]').first().fill('Yamaluna');
    await c0.locator('.lua-nomes input').nth(2).fill('Plena');
    await c0.locator('select').selectOption('2');
    await P.locator('dialog.luas-dl button[type=submit]').click(); await w(300);
    const l = (await mapaAgora()).cal.luas[0], dia = (await mapaAgora()).cal.dia;
    ok(l.nome === 'Yamaluna' && l.nomes[2] === 'Plena' && N.faseDaLua(l, dia).nome === 'Plena', 'mudar o nome, o nome da fase e a fase de hoje');
  });
  await passo('quem joga', async () => {
    await P.locator('#comoJog').check(); await w(400);
    ok(await P.locator('#luas .luas-bt').isVisible(), 'o jogador vê as luas');
    await P.locator('#luas .luas-bt').click(); await w(200);
    if (!(await P.locator('.luas-cartao').isVisible())) { await P.locator('#luas .luas-bt').click(); await w(200); }
    const txt = await P.locator('.luas-cartao').innerText();
    ok(/Yamaluna/.test(txt) && !/chance/.test(txt) && !/Editar as luas/.test(txt) && !/Fazer subir/.test(txt), 'o jogador vê a fase, sem a chance e sem editar');
    await foto('luas-jogador');
    await P.locator('#comoJog').uncheck(); await w(200);
  });
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
