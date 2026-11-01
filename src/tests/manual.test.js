// O Manual (lote 51): a wiki do site, aberta pelo menu da conta.
//   · TODA aba da barra de cima tem a sua página no Manual (manual/conteudo.js) — a cada lote, uma aba nova precisa
//     de página, senão este teste falha;
//   · cada “Me leve até lá” aponta para um assunto do guia que existe (com lugar), cada tarefa citada existe e cada
//     imagem citada está em manual/img;
//   · na casca: “Manual do site” abre a janela; a busca acha; “Me leve até lá” fecha o Manual, abre a aba e destaca o
//     lugar (nas Fichas, a caixinha do grupo, passando para Bolsas e itens); um botão da barra de cima ganha o contorno;
//     Esc fecha;
//   · quem joga (p=jogador) não vê as páginas nem as partes de quem mestra.
const fs = require('fs'), path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const ROOT = path.join(__dirname, '..', '..');
global.window = {};
require(path.join(ROOT, 'tc', 'guia.js'));
require(path.join(ROOT, 'manual', 'conteudo.js'));
const G = global.window.TC_GUIA.abas, M = global.window.TC_MANUAL;
const j = JSON.stringify;
const pc = Object.assign(R.personagemPadrao('Dain X'), { id: 'pc_dain', level: 5, grupo: 'Heróis', estado: { lapros: 40 } });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: ['Heróis'], abaFicha: 'atributos' });

// ---- o conteúdo, sem navegador ----
{
  const ids = M.sistemas.map(s => s.id);
  ok(new Set(ids).size === ids.length, 'cada página do Manual tem um id só');
  const abasDoIndex = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/^\s*\{ id: '([a-z]+)', (?:get )?nome/gm)].map(m => m[1]);
  ok(abasDoIndex.length >= 17, '(as abas da casca: ' + abasDoIndex.join(' ') + ')');
  const faltam = abasDoIndex.filter(a => !ids.includes(a));
  ok(!faltam.length, 'toda aba da barra tem página no Manual' + (faltam.length ? ' — faltam: ' + faltam.join(', ') : ''));
  ok(ids.includes('mesa'), 'e a página da mesa e da barra de cima');
  const ruins = [];
  const conf = (ir, onde) => {
    if (!ir) return;
    if (ir.casca) return;
    if (!ir.aba || !abasDoIndex.includes(ir.aba)) { ruins.push(onde + ': aba ' + ir.aba); return; }
    if (ir.g) { const L = G[ir.aba] || G[ir.aba === 'oficina' ? 'arvore' : ir.aba] || {}; if (![...(L.mestre || []), ...(L.jogador || [])].some(x => x.t === ir.g && x.onde)) ruins.push(onde + ': ' + ir.aba + ' / ' + ir.g); }
  };
  for (const s of M.sistemas) {
    ok(s.nome && s.resumo && Array.isArray(s.jogador) && Array.isArray(s.mestre) && (s.jogador.length + s.mestre.length) > 0, s.id + ': nome, resumo e alguma seção');
    for (const x of [...s.jogador, ...s.mestre]) { if (!x.t || !x.txt) ruins.push(s.id + ': seção sem título ou texto'); conf(x.ir, s.id + ' · ' + x.t); }
    if (s.img) {
      if (!fs.existsSync(path.join(ROOT, 'manual', 'img', s.img.arq))) ruins.push(s.id + ': falta a imagem ' + s.img.arq);
      if (!s.img.marcas.length || s.img.marcas.some(m => !(m.sel || m.casca) || !m.t)) ruins.push(s.id + ': marca sem lugar ou texto');
    }
  }
  for (const t of M.tarefas) { if (!t.passos || !t.passos.length || !ids.includes(t.sistema)) ruins.push('tarefa ' + t.id); conf(t.ir, 'tarefa ' + t.id); }
  for (const x of M.sabia) { if (!ids.includes(x.sistema)) ruins.push('sabia ' + x.t); conf(x.ir, 'sabia ' + x.t); }
  for (const p of ['mestre', 'jogador']) for (const k of ['antes', 'durante', 'depois']) for (const x of M.roteiro[p][k]) { conf(x.ir, 'roteiro ' + x.t); if (x.tarefa && !M.tarefas.some(t => t.id === x.tarefa)) ruins.push('roteiro ' + x.t + ': tarefa ' + x.tarefa); }
  ok(!ruins.length, 'os “Me leve até lá”, as tarefas e as imagens valem' + (ruins.length ? ': ' + j(ruins) : ''));
  ok(M.tarefas.length >= 20 && M.sabia.length >= 20, 'tarefas (' + M.tarefas.length + ') e “Você sabia?” (' + M.sabia.length + ')');
}

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'manual', w: 1366, h: 860, seed: { urgm_calc_atributos_v1: estado, 'tinycats:aba': 'cenas', 'tinycats-tour': '1' } });
  const w = ms => P.waitForTimeout(ms);
  const foto = async nome => { if (process.env.TC_SCRATCH) { fs.mkdirSync(path.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await P.goto(t.base, { waitUntil: 'load' }); await w(1800);
  let F = null;

  await passo('abrir o Manual', async () => {
    await P.locator('#btnConta').click(); await w(300);
    ok(await P.locator('#c-manual').isVisible(), 'na janela da conta, “Manual do site” (junto das Novidades)');
    await P.locator('#c-manual').click(); await w(1300);
    ok(await P.locator('#manual').isVisible() && !(await P.locator('#dlg').evaluate(d => d.open)), 'abre a janela do Manual, por cima do site');
    F = P.frame({ url: /\/manual\// });
    ok(/p=mestre/.test(F.url()), 'sem conta, cada um é o mestre de tudo: o Manual de quem mestra');
    ok(/Mestrar no Tiny Cats/.test(await F.locator('h1').innerText()) && await F.locator('.tempo').count() === 3, 'o início: o roteiro da sessão em Antes, Durante e Depois');
    const sum = await F.locator('#sum a').allInnerTexts();
    ok(['Roteiro da sessão', 'Como eu faço…', 'Você sabia?', 'Cenas', 'Escudo do mestre', 'Oficina'].every(x => sum.includes(x)), 'o sumário: o roteiro, as tarefas, “Você sabia?” e as abas — ' + sum.length + ' links');
    ok(!sum.includes('Administração'), 'a Administração só para quem administra');
    await foto('l51-manual-inicio');
  });

  await passo('uma página de aba', async () => {
    await F.locator('#sum a', { hasText: /^Cenas$/ }).click(); await w(400);
    ok(await F.locator('h1').innerText() === 'Cenas' && await F.locator('h2', { hasText: 'Para quem joga' }).count() === 1 && await F.locator('h2', { hasText: 'Para quem mestra' }).count() === 1, 'a parte de quem joga e a de quem mestra');
    const img = await F.locator('figure img').evaluate(i => new Promise(r => { if (i.complete) r(i.naturalWidth); else { i.onload = () => r(i.naturalWidth); i.onerror = () => r(0); } }));
    ok(img > 1000 && await F.locator('.legenda li').count() === 4, 'a captura com os botões marcados e a legenda numerada');
    await F.locator('figure').scrollIntoViewIfNeeded(); await w(200);
    await foto('l51-manual-cenas');
  });

  await passo('a busca', async () => {
    await F.locator('#q').fill('caixinha'); await w(500);
    ok(/#\/busca\/caixinha/.test(await F.evaluate(() => location.hash)) && await F.locator('.res .sec').count() >= 1, 'buscar “caixinha” acha');
    await F.locator('#q').fill('reforcos rodadas'); await w(500);
    const r = await F.locator('.res h3').allInnerTexts();
    ok(r.length >= 1 && r.some(x => /reforços/i.test(x)), 'sem acento e com várias palavras: ' + j(r.slice(0, 3)));
    await foto('l51-manual-busca');
    await F.locator('#q').fill(''); await w(400);
  });

  await passo('me leve até lá', async () => {
    await F.evaluate(() => { location.hash = '#/aba/fichas'; }); await w(400);
    await F.locator('.sec', { hasText: 'A caixinha do grupo' }).locator('.ir').click(); await w(3200);
    ok(await P.locator('#manual').isHidden(), 'o Manual fecha');
    ok(await P.evaluate(() => location.hash) === '#/fichas', 'a aba Fichas abre');
    const Fi = P.frame({ url: /\/fichas\// });
    ok(await Fi.evaluate(() => S.abaFicha) === 'bolsas' && await Fi.evaluate(() => !!document.querySelector('.tc-guia-anel')), 'a ficha passa para Bolsas e itens e a caixinha ganha o contorno');
    await foto('l51-manual-ir');
    // um botão da barra de cima
    await P.evaluate(() => TC_ABRIR_MANUAL('#/aba/mesa')); await w(1200);
    F = P.frame({ url: /\/manual\// });
    await F.locator('.sec', { hasText: 'A busca rápida' }).locator('.ir').click(); await w(500);
    ok(await P.locator('#manual').isHidden() && await P.locator('#btnBusca.manual-alvo').count() === 1, 'um botão da barra de cima (a busca) ganha o contorno aqui mesmo');
    // uma aba que não está à vista
    await P.evaluate(() => TC_ABRIR_MANUAL('#/aba/loja')); await w(1200);
    F = P.frame({ url: /\/manual\// });
    await F.locator('.ir').first().click(); await w(500);
    ok(/não está à vista para você agora/.test(await P.locator('#toasts').innerText()), 'a aba que não está à vista (a Loja, longe de loja) dá o aviso');
  });

  await passo('fechar', async () => {
    await P.evaluate(() => TC_ABRIR_MANUAL()); await w(900);
    F = P.frame({ url: /\/manual\// });
    await F.locator('h1').click(); await P.keyboard.press('Escape'); await w(300);
    ok(await P.locator('#manual').isHidden(), 'Esc fecha (de dentro do Manual)');
    await P.evaluate(() => TC_ABRIR_MANUAL()); await w(500);
    await P.locator('#manualX').click(); await w(200);
    ok(await P.locator('#manual').isHidden(), 'o × fecha');
  });

  await passo('o Manual de quem joga', async () => {
    const { page: J } = await t.device({ name: 'jog', w: 1200, h: 820 });
    await J.goto(t.base + 'manual/?p=jogador', { waitUntil: 'load' }); await J.waitForTimeout(800);
    const sum = await J.locator('#sum a').allInnerTexts();
    ok(/Jogar no Tiny Cats/.test(await J.locator('h1').innerText()) && !sum.includes('Escudo do mestre') && !sum.includes('Bestiário') && !sum.includes('Rolador') && sum.includes('Fichas'), 'quem joga não vê as abas de quem mestra: ' + j(sum));
    ok(await J.locator('#papelBox').isHidden(), 'nem a chave “Como o jogador vê”');
    await J.evaluate(() => { location.hash = '#/aba/cenas'; }); await J.waitForTimeout(300);
    ok(await J.locator('h2', { hasText: 'Para quem mestra' }).count() === 0 && await J.locator('h2', { hasText: 'Para quem joga' }).count() === 1, 'na página das Cenas, só a parte de quem joga');
    await J.evaluate(() => { location.hash = '#/aba/escudo'; }); await J.waitForTimeout(300);
    ok(/não encontrada/.test(await J.locator('h1').innerText()), 'a página do Escudo não abre para quem joga');
    await J.locator('#q').fill('ataque com defesa'); await J.waitForTimeout(500);
    ok(!(await J.locator('.res').innerText()).includes('quem mestra'), 'a busca não acha as partes de quem mestra');
  });

  const fora = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 10).join('\n'));
  ok(fora.length === 0, 'sem erros no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
