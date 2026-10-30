// Lote 16 numa mesa (rede), parte b: o mestre e um jogador.
//   · o aniversário no calendário do mundo (o do mapa da mesa): o dono escreve na ficha dele (o mestre também); a ficha
//     diz quanto falta e a idade; no dia, o selo no resumo; quem só consulta a ficha não mexe;
//   · o Jornal: no rascunho do mestre, a sugestão com a nota pronta dos aniversários ("Pôr como nota", com Desfazer;
//     "Agora não" esconde aquele dia); o jogador não vê sugestão;
//   · a Corte: no cartão do título, o titular escolhido entre as fichas da mesa — o personagem entra na corte, com a
//     ficha ligada e o nascimento do aniversário; na Diplomacia, quem fala pela facção (o governante, pelo título) com
//     "Abrir a ficha", que leva às Fichas;
//   · as skills únicas: o mestre cria na Árvore (modo Jogador, no personagem); o jogador vê na Árvore dele (sem poder
//     criar) e na ficha, nos cartões da aba Skills, com o bônus contando; "Abrir na Árvore" leva ao personagem;
//   · o guia: quem joga vê o guia do jogador.
// (SO=aniv, SO=corte, SO=unicas ou SO=guia: só aquela parte — a mesa, as fichas e o mapa, sempre.)
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const pc = (id, nome, extra) => Object.assign(R.personagemPadrao(nome), { id, nome, level: 10, grupo: 'Heróis', recursos: [{ id: 'hp' + id, nome: 'HP', fml: '100' }] }, extra);
const local = JSON.stringify({ v: 1, cfg: R.cfgPadrao(),
  personagens: [pc('pc_dain', 'Dain X', { aniv: { d: 3, m: 0, a: 280 } }), pc('pc_lia', 'Lia', { aniv: { d: 8, m: 0 } })],
  situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: ['Heróis'] });
// o mapa da mesa: dia 1 = 2 de Alvorada, ano 300 (o Dain faz 20 amanhã; a Lia, daqui a 6 dias)
const mapa = { id: 'mp_vale', nome: 'Vale de Brenn', cal: { dia: 1, ano0: 300 }, faccoes: [{ id: 'fa', nome: 'Aldar', cor: '#3f7fbf' }, { id: 'fb', nome: 'Vale', cor: '#8a2a2a' }] };

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', w: 1400, h: 900, seed: { urgm_calc_atributos_v1: local, 'tinycats:aba': 'fichas' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1300, h: 900, seed: { 'tinycats:aba': 'fichas' } })).page;
  M.setDefaultTimeout(10000); J.setDefaultTimeout(10000);
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const j = JSON.stringify;
  const quadro = async (p, re) => { for (let i = 0; i < 80; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 15000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* a moldura pode estar recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const linha = (p, id) => p.evaluate(id => { const l = TC.dados.col('personagens').pegar(id); return l ? JSON.parse(JSON.stringify(l)) : null; }, id);
  const docM = (p, id) => p.evaluate(id => { const d = TC.dados.col('documentos').pegar(id); return d ? JSON.parse(JSON.stringify(d.dados)) : null; }, id);
  const SO = process.env.SO || '';
  const passo = async (nome, fn, parte) => { if (parte && SO && parte !== SO) return; try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const aba = async (f, k, p) => { await f.locator('#ficha [data-abaficha="' + k + '"]').click(); await w(250, p); };
  const abrir = async (f, nome, p) => { await f.locator('#lista .pc', { has: f.locator('.nm', { hasText: new RegExp('^' + nome + '$') }) }).click(); await w(350, p); };
  const foto = async (p, nome, alvo) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await (alvo || p).screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  let F = null, G = null, nomeMesa = null;

  await passo('a mesa, as fichas, o mapa e o jogador', async () => {
    await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
    await loginTela(M, c.mestre, c.senha);
    nomeMesa = 'Lote 16b ' + Date.now().toString(36);
    const codigo = await criarMesaTela(M, nomeMesa);
    ok(await ate(async () => { F = await quadro(M, /\/fichas\//); return F && (await F.locator('.mesa-oferta').count()) === 1; }), '(a mesa oferece trazer as fichas do navegador)');
    await F.locator('#ofertaSim').click(); await w(800);
    ok(await ate(async () => (await M.evaluate(() => TC.dados.col('personagens').todas().length)) === 2 && await parado(M)), '(as duas fichas sobem)');
    await M.evaluate(m => TC.dados.col('documentos').gravar('mundo:mapa:' + m.id, { dados: m, vis: 'mestre' }), mapa);
    // (o mestre abre o Mapa-múndi uma vez: é dele que sai o que os jogadores veem do mapa — com o calendário)
    await M.locator('#tab-mundo').click();
    ok(await ate(async () => { const MM = await quadro(M, /\/mundo\//); return MM && await MM.evaluate(() => !!window.__mundo && __mundo.App.pronto && !!__mundo.App.mapa && __mundo.App.mapa.id === 'mp_vale') && !!(await docM(M, 'mundo:pub:mp_vale')); }, 40000), '(o mestre abre o Mapa-múndi: a projeção do mapa vai para a mesa)');
    await M.locator('#tab-fichas').click(); await w(400);
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    ok(await ate(async () => (await F.locator('#f_dono option').allInnerTexts()).join('|').includes('Dalmo')), '(o jogador entrou)');
    await abrir(F, 'Dain X'); await F.locator('#f_dono').selectOption({ label: 'Dalmo' }); await w(300);
    await abrir(F, 'Lia'); await F.locator('#f_vis').check(); await w(300);
    await abrir(F, 'Dain X');
    ok(await ate(async () => await parado(M)), '(o Dain X é do Dalmo; a Lia, aberta a todos; o mapa da mesa, com o calendário)');
    ok(await ate(async () => { G = await quadro(J, /\/fichas\//); return G && (await G.locator('#lista .pc').count()) === 2; }), '(o jogador vê o Dain X e a Lia)');
  });

  await passo('o aniversário na ficha', async () => {
    await abrir(G, 'Dain X', J); await aba(G, 'atributos', J);
    ok(await ate(async () => /É amanhã · 19 anos/.test(await G.locator('#anivInfo').innerText())) && /Vale de Brenn/.test(await G.locator('#anivBox').innerText()), 'no calendário do mapa da mesa (2 de Alvorada, ano 300): o Dain faz aniversário amanhã, e tem 19 — ' + await G.locator('#anivInfo').innerText());
    await G.locator('#f_aniv_d').fill('2'); await G.locator('#f_aniv_d').dispatchEvent('change'); await w(500, J);
    ok(await ate(async () => { const x = (await linha(M, 'pc_dain')).ficha.aniv; return x.d === 2 && x.m === 0 && x.a === 280 && await parado(J); }), 'o dono muda para o dia 2: grava na ficha, na mesa');
    ok(await ate(async () => /É hoje! · faz 20 anos/.test(await G.locator('#anivInfo').innerText()) && /Aniversário hoje · faz 20/.test(await G.locator('#resumo .rschip.festa').innerText())), 'é hoje: "faz 20 anos", e o selo no resumo');
    ok(await ate(async () => (await F.locator('#resumo .rschip.festa').count()) === 1), 'o mestre também vê o selo');
    await foto(J, 'l16-aniv-jogador', G.locator('#resumo'));
    await abrir(G, 'Lia', J);
    ok(await G.locator('#f_aniv_d').isDisabled() && await G.locator('#f_aniv_m').isDisabled(), 'na ficha da Lia (só consulta), o jogador não mexe no aniversário');
    await abrir(G, 'Dain X', J);
  }, 'aniv');

  await passo('o Jornal sugere a nota', async () => {
    await M.locator('#tab-jornal').click();
    let JM = null;
    ok(await ate(async () => { JM = await quadro(M, /\/jornal\//); return JM && await JM.evaluate(() => !!window.__jornal && __jornal.pronto && __jornal.naMesa && __jornal.mestre); }, 40000), '(o mestre abre o Jornal)');
    await JM.locator('[data-k="j:mapa"]').selectOption('mp_vale'); await w(400);
    const card = JM.locator('[data-k="aniv"]');
    ok(await ate(async () => (await card.count()) === 1) && (await JM.locator('[data-k="aniv:txt"]').innerText()) === 'Hoje é aniversário de Dain X (faz 20 anos). Nos próximos dias: Lia (8 de Alvorada).', 'no rascunho, a sugestão com a nota pronta: ' + await JM.locator('[data-k="aniv:txt"]').innerText().catch(() => '?'));
    await foto(M, 'l16-jornal-sugestao', card);
    await JM.locator('[data-k="aniv:por"]').click(); await w(400);
    ok(await JM.evaluate(() => __jornal.ras.notas.length === 1 && /Hoje é aniversário de Dain X/.test(__jornal.ras.notas[0].txt)) && (await card.count()) === 0, '"Pôr como nota": a nota entra no rascunho, e a sugestão sai');
    await JM.locator('#toasts .toast button', { hasText: 'Desfazer' }).click(); await w(400);
    ok(await JM.evaluate(() => __jornal.ras.notas.length === 0) && (await card.count()) === 1, 'o Desfazer tira a nota, e a sugestão volta');
    await JM.locator('[data-k="aniv:nao"]').click(); await w(300);
    ok((await card.count()) === 0 && await JM.evaluate(() => __jornal.ras.notas.length === 0), '"Agora não": a sugestão some, sem nota nenhuma');
    await JM.locator('[data-k="j:clima"]').selectOption('chuva'); await w(300);
    ok((await card.count()) === 0, 'e não volta no mesmo dia do mundo');
    await J.locator('#tab-jornal').click();
    const JJ = await quadro(J, /\/jornal\//);
    ok(await ate(async () => await JJ.evaluate(() => !!window.__jornal && __jornal.pronto && __jornal.naMesa)) && (await JJ.locator('[data-k="aniv"]').count()) === 0, 'o jogador não vê sugestão (o rascunho é do mestre)');
    await J.locator('#tab-fichas').click(); await w(300, J);
  }, 'aniv');

  await passo('a Corte: o titular é uma ficha', async () => {
    await M.locator('#tab-mundo').click();
    let MM = null;
    ok(await ate(async () => { MM = await quadro(M, /\/mundo\//); return MM && await MM.evaluate(() => !!window.__mundo && __mundo.App.pronto && !!__mundo.App.mapa && __mundo.App.mapa.id === 'mp_vale'); }, 40000), '(o mestre abre o Mapa-múndi, no Vale de Brenn)');
    await MM.click('#tab-faccoes'); await w(250);
    await MM.click('#pane [data-k="fac:fa"]'); await w(300);
    await MM.click('#pane [data-k="f:fa:titulo-novo"]'); await MM.waitForSelector('dialog.tt-dl[open]');
    const ops = await MM.locator('dialog.tt-dl[open] [data-k="tt:tit"] optgroup').evaluateAll(l => l.map(g => g.label + ': ' + [...g.querySelectorAll('option')].map(o => o.textContent).join(', ')));
    ok(j(ops) === j(['Gente da corte: ', 'Fichas da mesa (entram na corte): Dain X · ficha, Lia · ficha']), 'no titular, as fichas da mesa (que ainda não estão na corte): ' + j(ops));
    await MM.selectOption('dialog.tt-dl[open] [data-k="tt:tit"]', 'ficha:pc_dain'); await w(200);
    ok(/Dain X ainda não está na corte: ao salvar, entra nela \(com a ficha ligada e o nascimento do aniversário da ficha\) e fica com o título\./.test(await MM.locator('dialog.tt-dl[open] [data-k="tt:ficha-nota"]').innerText()) && /Reino de Aldar · Dain X/.test(await MM.locator('dialog.tt-dl[open] [data-k="tt:previa"]').innerText()), 'a nota diz o que vai acontecer; a prévia, o título com o Dain');
    await foto(M, 'l16-corte-titular', MM.locator('dialog.tt-dl[open]'));
    await MM.click('dialog.tt-dl[open] [data-k="tt:ok"]'); await w(500);
    const ct = await MM.evaluate(() => JSON.parse(JSON.stringify(__mundo.App.mapa.corte)));
    const dain = ct.pessoas.find(p => p.ficha === 'pc_dain'), an = (await linha(M, 'pc_dain')).ficha.aniv;      // (o dia 2, se a parte do aniversário rodou; senão, o 3 de começo)
    ok(dain && dain.nome === 'Dain X' && j(dain.nasc) === j({ a: 280, m: 0, d: an.d }) && an.a === 280 && an.m === 0 && dain.fac === 'fa' && ct.titulos.length === 1 && ct.titulos[0].tit === dain.id && ct.titulos[0].preso.id === 'fa', 'o Dain entra na corte, com a ficha ligada e o nascimento do aniversário (o dia dele de Alvorada de 280), e fica com o título: ' + j(dain));
    ok(/Dain X entrou na corte \(com a ficha\)/.test(await MM.locator('#toasts').innerText()), 'o aviso diz: ' + await MM.locator('#toasts').innerText());
    ok(await ate(async () => { const d = await docM(M, 'mundo:mapa:mp_vale'); return d && d.corte && d.corte.pessoas.some(p => p.ficha === 'pc_dain') && await parado(M); }), '(o mapa, com a corte, na mesa)');
    // de novo: a ficha que já está na corte aparece como gente da corte
    await MM.click('#pane [data-k="f:fa:titulo-novo"]'); await MM.waitForSelector('dialog.tt-dl[open]');
    const ops2 = await MM.locator('dialog.tt-dl[open] [data-k="tt:tit"] optgroup').evaluateAll(l => l.map(g => g.label + ': ' + [...g.querySelectorAll('option')].map(o => o.textContent).join(', ')));
    ok(j(ops2) === j(['Gente da corte: Dain X · ficha', 'Fichas da mesa (entram na corte): Lia · ficha']), 'num título novo, o Dain já é gente da corte (com a ficha); a Lia continua entre as fichas: ' + j(ops2));
    await MM.click('dialog.tt-dl[open] [data-k="tt:nao"]'); await w(200);
    // a Diplomacia: quem fala pela facção
    await MM.click('#tab-diplomacia'); await w(300);
    const gov = MM.locator('#pane [data-k="gov:fa"]');
    ok(/Aldar/.test(await gov.innerText()) && /Dain X, Rei de Aldar/.test(await gov.innerText()) && /ficha/i.test(await gov.locator('.tag').innerText()), 'na Diplomacia, quem fala por Aldar: Dain X, Rei de Aldar (com a ficha) — ' + (await gov.innerText()).replace(/\s+/g, ' '));
    ok(/sem governante/.test(await MM.locator('#pane [data-k="gov:fb"]').innerText()), 'o Vale, sem governante (o mestre vê)');
    await foto(M, 'l16-diplomacia-voz', MM.locator('#pane [data-k="dp:govs"]'));
    await MM.click('#pane [data-k="gov:fa:ficha"]'); await w(800);
    ok(await ate(async () => (await M.locator('#tab-fichas').getAttribute('aria-selected')) === 'true' && await F.evaluate(() => S.sel) === 'pc_dain'), '"Abrir a ficha": vai às Fichas, na do Dain');
  }, 'corte');

  await passo('as skills únicas', async () => {
    await M.locator('#tab-arvore').click();
    let AM = null;
    ok(await ate(async () => { AM = await quadro(M, /\/arvore\//); return AM && await AM.evaluate(() => typeof personagemAtual === 'function' && doc.personagens.some(p => p.id === 'pc_dain')); }, 40000), '(o mestre abre a Árvore, com o Dain)');
    await AM.evaluate(() => { trocarModo('jogador'); trocarPersonagem('pc_dain'); }); await w(400);
    await AM.click('#btUnica'); await AM.waitForSelector('#dlg [data-campo="0"]');
    await AM.fill('#dlg [data-campo="0"]', 'Sangue do dragão'); await AM.fill('#dlg [data-campo="1"]', 'Cura {VIT*2} de HP.');
    await AM.fill('#dlg [data-campo="2"]', 'VIT +3'); await AM.fill('#dlg [data-campo="3"]', '10 SP');
    await AM.click('#dlg .rodape .btn.ouro'); await w(600);
    ok(await ate(async () => { const l = await linha(M, 'pc_dain'); return l.skills.unicas && l.skills.unicas.length === 1 && l.skills.unicas[0].nome === 'Sangue do dragão' && j(l.skills.unicas[0].bonus) === j({ VIT: 3 }) && await parado(M); }), 'o mestre cria a skill única do Dain: vai para as skills dele, na mesa');
    // o jogador: na Árvore dele, vê (sem criar)
    await J.locator('#tab-arvore').click();
    let AJ = null;
    ok(await ate(async () => { AJ = await quadro(J, /\/arvore\//); return AJ && (await AJ.locator('#blocoUnicas .unica').count()) === 1; }, 40000), 'o jogador vê a skill única do Dain na Árvore dele');
    ok(/Cura \d+ de HP/.test(await AJ.locator('#blocoUnicas .unica').innerText()) && await AJ.locator('#btUnica').count() === 0 && await AJ.locator('[data-unied]').count() === 0, 'com a conta no número do Dain; sem "+ Skill única" e sem Editar (é com o mestre)');
    await foto(J, 'l16-arvore-unica-jogador', AJ.locator('#blocoUnicas'));
    // e na ficha, nos cartões da aba Skills
    await J.locator('#tab-fichas').click(); await w(400, J);
    await aba(G, 'skills', J);
    ok(await ate(async () => (await G.locator('#habsDaArvore .skl.unica').count()) === 1), '(na ficha do jogador, a linha da skill única)');
    await G.locator('#habsDaArvore .skl.unica .skl-linha').click(); await w(200, J);
    ok(/Sangue do dragão Skill única (Ativa )?Cura \d+ de HP\. Na ficha: VIT \+3 Custo de uso: 10 SP/i.test((await G.locator('#habsDaArvore .skl.unica').innerText()).replace(/\s+/g, ' ')), 'na ficha do jogador, a skill única (aberta: o texto, o bônus, o custo)');
    ok(await G.evaluate(() => { const p = S.personagens.find(x => x.id === 'pc_dain'); return calcular(p).tot.VIT - calcular(Object.assign({}, p, { skills: Object.assign({}, p.skills, { unicas: [] }) })).tot.VIT; }) === 3, 'e o +3 de VIT conta');
    ok(await G.locator('[data-skabrir="pc_dain"]').isVisible(), '"Abrir na Árvore", na ficha dele');
    await G.locator('[data-skabrir="pc_dain"]').click(); await w(800, J);
    ok(await ate(async () => (await J.locator('#tab-arvore').getAttribute('aria-selected')) === 'true' && await AJ.evaluate(() => personagemAtual().id) === 'pc_dain'), 'leva à Árvore, no Dain');
    await J.locator('#tab-fichas').click(); await w(300, J);
  }, 'unicas');

  await passo('o guia de quem joga', async () => {
    await J.locator('#btnGuia').click(); await w(300, J);
    ok(/Guia · Fichas/.test(await J.locator('#guia .guia-h').innerText()) && /para quem joga/.test(await J.locator('#guia .guia-h').innerText()) && (await J.locator('#guia .guia-t').allInnerTexts())[0] === 'A sua ficha', 'o jogador vê o guia do jogador ("A sua ficha"…)');
    await M.locator('#tab-fichas').click(); await w(300);
    await M.locator('#btnGuia').click(); await w(300);
    ok(/para quem mestra/.test(await M.locator('#guia .guia-h').innerText()) && (await M.locator('#guia .guia-t').allInnerTexts()).includes('Quem vê e quem controla'), 'o mestre, o do mestre');
    await M.locator('#guia .guia-t', { hasText: 'Quem vê e quem controla' }).click(); await w(150);
    await M.locator('#guia [data-guia-mostrar]').click(); await w(700);
    ok(await F.evaluate(() => S.abaFicha) === 'atributos' && await F.evaluate(() => !!document.querySelector('.tc-guia-anel')), 'na mesa, "Mostrar onde fica" acha o dono da ficha (em Atributos)');
  }, 'guia');

  await passo('limpar', async () => { await apagarMesaTela(M, nomeMesa); ok(true, '(a mesa de teste foi apagada)'); });
  const inesperados = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409)/.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 8).join('\n'));
  ok(inesperados.length === 0, 'sem erros no console');
  await t.close();
  end();
})();
