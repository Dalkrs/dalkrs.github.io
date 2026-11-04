// Clã (lote 86): os recursos da lista fixa, sem mesa (a página sozinha — quem abre é o mestre):
//   · os recursos de antes viram os da lista pelo nome (Madeira T1 → Madeira Q1, Ouro, Compendiânio, Suprimentos); os de
//     nome próprio ("Aço resistente") ficam como estão;
//   · no alto do clã (o salão e o cabeçalho), só os da lista que o clã tem, pelo desenho (com os pontinhos da qualidade);
//   · no cofre, o desenho no lugar do nome (o nome na dica);
//   · "+ Recurso": a lista fixa para escolher (sem os que o clã já tem); outro nome vira recurso próprio;
//   · o núcleo: porNome, svgRecurso e a lista (os metais especiais do mundo do Bruno).
// TC_SCRATCH=<pasta> guarda capturas.
const path = require('path');
const { start, checker } = require('./lib');
const N = require('../../cla/nucleo.js');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const j = JSON.stringify;
// como o Clã Garret estava (os nomes de antes)
const CLA = { v: 1, nome: 'Clã Garret', jogadores: true, ver: { mostrar: true }, brasao: { forma: 'escudo', div: 'cortado', cores: ['#5b3f8a', '#e8eaf0'], simb: 'lobo' },
  cargos: { lider: { nome: 'Líder', gente: [{ id: 'ps_a', nome: 'Garret', resp: 0 }] } },
  construcoes: [{ id: 'ct_f', nome: 'Forja', ico: 'forja', nivel: 1, prox: { custo: [{ rec: 'rc_m1', nome: 'Madeira T1', qtd: 100 }, { rec: 'rc_aco', nome: 'Aço resistente (temperado)', qtd: 5 }] } }],
  recursos: { lista: [{ id: 'rc_aco', nome: 'Aço resistente (temperado)', qtd: 14 }, { id: 'rc_col', nome: 'Minério do Colosso da Chama Sombria', qtd: 22 }, { id: 'rc_m1', nome: 'Madeira T1', qtd: 69 },
    { id: 'rc_ou', nome: 'Ouro', qtd: 5 }, { id: 'rc_co', nome: 'Compendiânio', qtd: 28 }, { id: 'rc_m2', nome: 'Madeira T2', qtd: 45 }, { id: 'rc_m3', nome: 'Madeira T3', qtd: 0 }, { id: 'rc_su', nome: 'Suprimentos', qtd: 82 }], hist: [] },
  respeito: { v: 0, hist: [] } };

(async () => {
  // o núcleo, sem tela
  ok(j(N.RECURSOS.map(r => r.nome)) === j(['Madeira Q1', 'Madeira Q2', 'Madeira Q3', 'Orith Q1', 'Orith Q2', 'Orith Q3', 'Pedra Q1', 'Pedra Q2', 'Pedra Q3', 'Suprimentos', 'Compendiânio', 'Ouro', 'Demônite', 'Amonite', 'Saverite', 'Mãziernite', "Mana'Nucleo", 'Runas']),
    'a lista fixa: madeira, orith e pedra em Q1 a Q3, suprimentos, compendiânio, ouro e os minerais do mundo do Bruno');
  ok(j(['Madeira T1', 'madeira t3', 'Mãzier nite', "Mana'nucleo", 'Orith', 'Metal Q2', 'Lapros', 'Aço'].map(N.porNome)) === j(['madeira_q1', 'madeira_q3', 'maziernite', 'mana_nucleo', 'orith_q1', 'orith_q2', null, null]), 'porNome: os nomes de antes, sem acento nem espaço; o Lapros (a moeda) não é recurso do clã');
  ok(/<svg[^>]*>.*<circle.*<circle.*<\/svg>/.test(N.svgRecurso('pedra_q2', 20)) && !/<circle/.test(N.svgRecurso('ouro', 20)) && N.svgRecurso('nada') === '', 'o desenho: com 2 pontinhos na Q2, sem pontinhos no Ouro');
  const c0 = N.normCla(CLA);
  ok(j(c0.recursos.lista.map(r => [r.id, r.nome, r.fixo || null])) === j([['rc_aco', 'Aço resistente (temperado)', null], ['rc_col', 'Minério do Colosso da Chama Sombria', null], ['rc_m1', 'Madeira Q1', 'madeira_q1'], ['rc_ou', 'Ouro', 'ouro'], ['rc_co', 'Compendiânio', 'compendianio'], ['rc_m2', 'Madeira Q2', 'madeira_q2'], ['rc_m3', 'Madeira Q3', 'madeira_q3'], ['rc_su', 'Suprimentos', 'suprimentos']]),
    'converter pelo nome: as quantidades e os ids ficam (o custo das construções continua apontando certo); os de nome próprio ficam');
  ok(N.custoTxt(c0.construcoes[0].prox.custo, c0.recursos) === '100 Madeira Q1 · 5 Aço resistente (temperado)', 'o custo da Forja já diz Madeira Q1: ' + N.custoTxt(c0.construcoes[0].prox.custo, c0.recursos));

  const t = await start();
  const dv = await t.device({ name: 'cla-lote86', w: 1440, h: 950 });
  const P = dv.page;
  P.setDefaultTimeout(8000);
  const A = (fn, arg) => P.evaluate(fn, arg);
  const k = s => P.locator(`[data-k="${s}"]`);
  const clicar = async sel => { await P.click(sel); await espera(200); };
  const cla = () => A(() => __cla.doc('cla:c:' + __cla.sel));
  const foto = async (nome, sel) => { if (process.env.TC_SCRATCH) { const f = path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png'); if (sel) await P.locator(sel).first().screenshot({ path: f }); else await P.screenshot({ path: f }); } };

  await passo('o alto do clã', async () => {
    await P.goto(t.base + 'src/tests/vazio.html');
    await A(c => { localStorage.setItem('tinycats:cla:local', JSON.stringify({ 'cla:c:cl_g': c })); localStorage.removeItem('tinycats:cla:abaM'); }, CLA);
    await P.goto(t.base + 'cla/?debug', { waitUntil: 'load' });
    await P.waitForFunction(() => window.__cla && __cla.pronto, null, { timeout: 15000 }); await espera(300);
    const tits = await P.locator('[data-k="cab:num"] .cab-rec').evaluateAll(l => l.map(e => e.title + ' ' + e.innerText.trim()));
    ok(j(tits) === j(['Madeira Q1 69', 'Madeira Q2 45', 'Suprimentos 82', 'Compendiânio 28', 'Ouro 5']), 'o cabeçalho: só os da lista que o clã tem (a Madeira Q3 está zerada), na ordem da lista, pelo desenho — ' + j(tits));
    ok(!/Aço|Colosso/.test(await k('cab:num').innerText()), 'os de nome próprio não vão para o alto');
    await foto('l86-cabecalho', '[data-k="cab:num"]');
  });

  await passo('o salão', async () => {
    await A(() => { __cla.irVista ? __cla.irVista('jogador') : null; });
    const salao = await A(() => [...document.querySelectorAll('[data-k="num:recs"] .num-rec')].map(e => e.title));
    if (salao.length) ok(j(salao) === j(['Madeira Q1: 69', 'Madeira Q2: 45', 'Suprimentos: 82', 'Compendiânio: 28', 'Ouro: 5']), 'os números do salão: os da lista, pelo desenho — ' + j(salao));
  });

  await passo('o cofre', async () => {
    await clicar('[data-aba-m="obras"]');
    ok(await P.locator('[data-k="rec:ren:rc_m1"] .ico-rec svg').count() === 1 && !(await k('rec:ren:rc_m1').innerText()).trim(), 'no cofre, a Madeira Q1 aparece só pelo desenho');
    ok((await k('rec:ren:rc_m1').getAttribute('title')).startsWith('Madeira Q1') && (await k('rec:ren:rc_aco').innerText()).trim() === 'Aço resistente (temperado)', 'o nome fica na dica; o recurso próprio continua com o nome');
    await foto('l86-cofre', '[data-k="sec:rec"]');
  });

  await passo('+ Recurso pela lista', async () => {
    await clicar('[data-k="rec:novo"]');
    const ops = await P.locator('#dlg [data-k="dl:fixos"] button').evaluateAll(l => l.map(e => e.dataset.fixo));
    ok(ops.length === N.RECURSOS.length - 6 && !ops.includes('madeira_q1') && !ops.includes('ouro') && ops.includes('madeira_q3') === false && ops.includes('pedra_q1'), 'a lista para escolher: os 18 da lista menos os 6 que o clã já tem — ' + ops.length);
    await foto('l86-novo', '#dlg');
    await clicar('#dlg [data-k="dl:fixo:pedra_q2"]');
    ok(await P.inputValue('#dlg [data-k="dl:nome"]') === 'Pedra Q2' && await P.locator('#dlg [data-k="dl:fixo:pedra_q2"].on').count() === 1, 'um clique escolhe (o nome entra e o botão fica marcado)');
    await P.fill('#dlg [data-k="dl:qtd"]', '12');
    await clicar('#dlg [data-k="dl:sim"]');
    const r = (await cla()).recursos.lista.find(x => x.nome === 'Pedra Q2');
    ok(r && r.fixo === 'pedra_q2' && r.qtd === 12, 'Pedra Q2 entra no cofre, da lista, com 12');
    ok(await P.locator('[data-k="cab:num"] .cab-rec[title="Pedra Q2"]').count() === 1, 'e vai para o alto do clã');
    // escrito à mão, com o nome de antes: entra como o da lista
    await clicar('[data-k="rec:novo"]');
    await P.fill('#dlg [data-k="dl:nome"]', 'orith t3'); await espera(100);
    ok(await P.locator('#dlg [data-k="dl:fixo:orith_q3"].on').count() === 1, 'escrever "orith t3" marca o Orith Q3 da lista');
    await clicar('#dlg [data-k="dl:sim"]');
    ok((await cla()).recursos.lista.some(x => x.fixo === 'orith_q3' && x.nome === 'Orith Q3'), 'e ele entra com o nome da lista');
    // outro nome: recurso próprio
    await clicar('[data-k="rec:novo"]');
    await P.fill('#dlg [data-k="dl:nome"]', 'Escamas de dragão'); await clicar('#dlg [data-k="dl:sim"]');
    const e = (await cla()).recursos.lista.find(x => x.nome === 'Escamas de dragão');
    ok(e && !e.fixo, 'outro nome vira um recurso próprio (sem ir para o alto)');
  });

  const fora = t.errs.filter(e => !/favicon|fonts\.g/i.test(e));
  ok(fora.length === 0, 'sem erros no console: ' + fora.slice(0, 3).join(' | '));
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
