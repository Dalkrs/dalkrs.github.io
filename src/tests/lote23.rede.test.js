// Lote 23 numa mesa (rede): as abas do elenco — Ativos, Inativos e Toldo. O mestre e um jogador.
//   · as três abas (com ícone e quantos), para o mestre e para o jogador; cada aba mostra só os seus (a subseção
//     "Inativos (n)" saiu); o jogador não muda nada (sem "Vários", sem o botão na ficha);
//   · arrastar uma ficha até a aba muda onde ela está (estado.toldo / estado.ativo, no banco), com Desfazer;
//   · o botão Ativo · Inativo · Toldo no alto da ficha; os pets vão junto com o dono;
//   · "Vários": marcar fichas e mandar todas de uma vez;
//   · os pets do dono podem ser escondidos (a tela lembra);
//   · nas Cenas, quem está no Toldo fica de fora do "Puxar o grupo" e da lista de fichas do token;
//   · "Restaurar energias" num token ligado à ficha: as barras especiais voltam ao "começa em" (ou cheias), na ficha.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const pc = (id, nome, extra) => Object.assign(R.personagemPadrao(nome), { id, nome, level: 10, grupo: 'Heróis', recursos: [{ id: 'hp' + id, nome: 'HP', fml: '100' }], estado: {} }, extra);
const local = JSON.stringify({ v: 1, cfg: R.cfgPadrao(),
  personagens: [pc('pc_dain', 'Dain X'), pc('pc_lia', 'Lia', { poderes: [{ id: 'pk', nome: 'Ki', max: 5, atual: 3, inicio: 0 }, { id: 'pf', nome: 'Fé', max: 4, atual: 1 }] }), pc('pc_lobo', 'Lobo', { petDe: 'pc_lia' }), pc('pc_ogro', 'Ogro do pântano')],
  situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: ['Heróis'] });

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', w: 1400, h: 900, seed: { urgm_calc_atributos_v1: local, 'tinycats:aba': 'fichas' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1300, h: 900, seed: { 'tinycats:aba': 'fichas' } })).page;
  M.setDefaultTimeout(10000); J.setDefaultTimeout(10000);
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const j = JSON.stringify;
  const quadro = async (p, re) => { for (let i = 0; i < 60; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 15000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* a moldura pode estar recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const est = (p, id) => p.evaluate(id => { const l = TC.dados.col('personagens').pegar(id); return l ? JSON.parse(JSON.stringify(l.estado || {})) : null; }, id);
  const toasts = f => f.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.textContent).join(' | '));
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const abrir = async (f, nome, p) => { await f.locator('#lista .pc', { has: f.locator('.nm', { hasText: new RegExp('^' + nome + '$') }) }).click(); await w(350, p); };
  const foto = async (p, nome, alvo) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await (alvo || p).screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const abas = async f => (await f.locator('#abasElenco [data-abael]').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim());
  const nomes = async f => (await f.locator('#lista .pcrow .nm').allInnerTexts());
  const arrastar = async (F, id, sobre) => {
    const de = await F.locator(`#lista [data-grab="${id}"]`).boundingBox(), para = await F.locator(sobre).first().boundingBox();
    if (!de || !para) return 'sem onde pegar ou soltar: ' + j({ de, para });
    await M.mouse.move(de.x + de.width / 2, de.y + de.height / 2); await M.mouse.down();
    await M.mouse.move(de.x + de.width / 2, de.y + de.height / 2 + 6, { steps: 2 });
    await M.mouse.move(para.x + para.width / 2, para.y + para.height / 2, { steps: 14 });
    await w(150); await M.mouse.up(); await w(500);
    return null;
  };
  let F = null, G = null, nomeMesa = null;

  await passo('a mesa, as fichas e o jogador', async () => {
    await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
    await loginTela(M, c.mestre, c.senha);
    nomeMesa = 'Lote 23 ' + Date.now().toString(36);
    const codigo = await criarMesaTela(M, nomeMesa);
    ok(await ate(async () => { F = await quadro(M, /\/fichas\//); return F && (await F.locator('.mesa-oferta').count()) === 1; }), '(a mesa oferece trazer as fichas do navegador)');
    await F.locator('#ofertaSim').click(); await w(800);
    ok(await ate(async () => (await M.evaluate(() => TC.dados.col('personagens').todas().length)) === 4 && await parado(M)), '(as quatro fichas sobem: o Lobo é o pet da Lia)');
    await J.goto(t.base, { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    ok(await ate(async () => (await F.locator('#f_dono option').allInnerTexts()).join('|').includes('Dalmo')), '(o jogador entrou)');
    await abrir(F, 'Dain X'); await F.locator('#f_dono').selectOption({ label: 'Dalmo' }); await w(300);
    await abrir(F, 'Lia'); await F.locator('#f_vis').check(); await w(300);
    await abrir(F, 'Lobo'); await F.locator('#f_vis').check(); await w(300);
    ok(await ate(async () => await parado(M)), '(o Dain X é do Dalmo; a Lia e o Lobo, abertos a todos; o Ogro, só do mestre)');
    ok(await ate(async () => { G = await quadro(J, /\/fichas\//); return G && (await G.locator('#lista .pc').count()) === 3; }), '(o jogador vê o Dain X, a Lia e o Lobo)');
  });

  await passo('as abas', async () => {
    ok(j(await abas(F)) === j(['Ativos 3', 'Inativos 0', 'Toldo 0']) && await F.locator('#abasElenco [data-abael="ativo"]').getAttribute('aria-selected') === 'true', 'o mestre vê as três abas, com quantos (os pets não contam): ' + j(await abas(F)));
    ok(await F.locator('#abasElenco svg').count() === 3 && await F.locator('#btnVarios').isVisible(), 'cada aba com o desenho dela; e o botão "Vários"');
    ok(await F.locator('#lista [data-inhd]').count() === 0 && await F.locator('#lista .inativo').count() === 0, 'a subseção "Inativos (n)" embaixo de cada grupo saiu');
    ok(await ate(async () => j(await abas(G)) === j(['Ativos 2', 'Inativos 0', 'Toldo 0'])) && await G.locator('#btnVarios').count() === 0, 'o jogador também vê as abas (com o que ele enxerga), sem o "Vários": ' + j(await abas(G)));
    await abrir(G, 'Dain X', J);
    ok(await G.locator('#lugarFicha').count() === 1, 'e com o botão Ativo · Inativo · Toldo na ficha (lote 27: quem joga muda o lugar das fichas do grupo dele)');
    await foto(M, 'l23-elenco-abas', F.locator('aside'));
  });

  await passo('os pets escondidos', async () => {
    const pm = F.locator('#lista [data-petmin="pc_lia"]');
    ok(await pm.count() === 1 && /1/.test(await pm.innerText()) && await F.locator('#lista .pcrow[data-id="pc_lobo"]').isVisible(), 'a Lia tem o botão da pata (1 pet), e o Lobo aparece embaixo dela');
    await pm.click(); await w(300);
    ok(await F.locator('#lista .pcrow[data-id="pc_lobo"]').count() === 0 && await F.locator('#lista [data-petmin="pc_lia"]').getAttribute('aria-expanded') === 'false', 'um clique esconde o pet');
    ok(await F.evaluate(() => (S.petsMin || []).includes('pc_lia')), 'a tela lembra (S.petsMin)');
    await F.locator('#lista [data-petmin="pc_lia"]').click(); await w(300);
    ok(await F.locator('#lista .pcrow[data-id="pc_lobo"]').isVisible(), 'outro clique mostra de novo');
  });

  await passo('arrastar até a aba', async () => {
    const erro = await arrastar(F, 'pc_ogro', '#abasElenco [data-abael="toldo"]');
    ok(!erro, '(arrastei o Ogro até a aba Toldo) ' + (erro || ''));
    ok(await ate(async () => { const e = await est(M, 'pc_ogro'); return e.toldo === true && e.ativo === false && await parado(M); }), 'solto no Toldo: estado.toldo e estado.ativo=false, no banco');
    ok(/Ogro do pântano foi para o Toldo\. Fica de fora do “Puxar o grupo” e das listas das Cenas\./.test(await toasts(F)) && await F.locator('.toast button', { hasText: 'Desfazer' }).count() >= 1, 'o aviso diz o que muda, com Desfazer: ' + await toasts(F));
    ok(!(await nomes(F)).includes('Ogro do pântano') && j(await abas(F)) === j(['Ativos 2', 'Inativos 0', 'Toldo 1']), 'o Ogro some da aba Ativos; o Toldo conta 1');
    await F.locator('#abasElenco [data-abael="toldo"]').click(); await w(300);
    ok(j(await nomes(F)) === j(['Ogro do pântano']) && await F.locator('#abasElenco [data-abael="toldo"]').getAttribute('aria-selected') === 'true', 'na aba Toldo, só o Ogro');
    await foto(M, 'l23-elenco-toldo', F.locator('aside'));
    await F.locator('#abasElenco [data-abael="inativo"]').click(); await w(300);
    ok(/Ninguém inativo/.test(await F.locator('#lista').innerText()), 'a aba vazia explica: "Ninguém inativo." (e como mandar alguém para lá)');
    await F.locator('#abasElenco [data-abael="ativo"]').click(); await w(300);
    await F.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(500);
    ok(await ate(async () => { const e = await est(M, 'pc_ogro'); return !e.toldo && e.ativo === undefined && await parado(M); }) && (await nomes(F)).includes('Ogro do pântano'), 'o Desfazer traz o Ogro de volta para os Ativos (sem os campos)');
  });

  await passo('o botão na ficha, com o pet junto', async () => {
    await abrir(F, 'Lia');
    ok(await F.locator('#lugarFicha [data-lugar]').count() === 3 && await F.locator('#lugarFicha [data-lugar="ativo"]').getAttribute('aria-pressed') === 'true', 'no alto da ficha da Lia: Ativo · Inativo · Toldo (Ativo marcado)');
    await F.locator('#lugarFicha [data-lugar="inativo"]').click(); await w(500);
    ok(await ate(async () => (await est(M, 'pc_lia')).ativo === false && (await est(M, 'pc_lobo')).ativo === false && await parado(M)), 'Inativo: a Lia e o Lobo (o pet vai junto) ficam inativos, no banco');
    ok(/Lia ficou inativo \(o pet foi junto\)\./.test(await toasts(F)) && await F.locator('#lugarFicha [data-lugar="inativo"]').getAttribute('aria-pressed') === 'true', 'o aviso conta do pet; o botão acompanha: ' + await toasts(F));
    await foto(M, 'l23-ficha-lugar', F.locator('#resumo'));
    ok(await ate(async () => j(await abas(G)) === j(['Ativos 1', 'Inativos 1', 'Toldo 0'])), 'na tela do jogador, a Lia passou para Inativos: ' + j(await abas(G)));
    await G.locator('#abasElenco [data-abael="inativo"]').click(); await w(300, J);
    ok(j(await nomes(G)) === j(['Lia', 'Lobo']), 'na aba Inativos do jogador, a Lia com o Lobo');
    await G.locator('#abasElenco [data-abael="ativo"]').click(); await w(300, J);
  });

  await passo('vários de uma vez', async () => {
    await F.locator('#btnVarios').click(); await w(300);
    ok(await F.locator('#selElenco').isVisible() && await F.locator('#lista .selck').count() === 2 && await F.locator('#selElenco [data-selpara="toldo"]').isDisabled(), '"Vários": cada linha ganha a caixinha; os botões esperam alguém marcado');
    await F.locator('#lista .pc', { hasText: 'Dain X' }).click(); await F.locator('#lista [data-selpc="pc_ogro"]').check(); await w(300);
    ok(/2 marcadas/.test(await F.locator('#selElenco').innerText()) && await F.evaluate(() => S.sel) === 'pc_lia', 'o clique na linha marca (não abre a ficha): "2 marcadas"');
    await foto(M, 'l23-elenco-varios', F.locator('aside'));
    await F.locator('#selElenco [data-selpara="toldo"]').click(); await w(600);
    ok(await ate(async () => (await est(M, 'pc_dain')).toldo === true && (await est(M, 'pc_ogro')).toldo === true && await parado(M)), '"Para o Toldo": o Dain e o Ogro vão juntos');
    ok(/2 fichas foram para o Toldo/.test(await toasts(F)) && await F.locator('#selElenco').isHidden() && j(await abas(F)) === j(['Ativos 0', 'Inativos 1', 'Toldo 2']), 'um aviso só, e o "Vários" fecha: ' + j(await abas(F)));
    ok(await ate(async () => j(await abas(G)) === j(['Ativos 0', 'Inativos 1', 'Toldo 1'])), 'o jogador vê o Dain dele no Toldo: ' + j(await abas(G)));
  });

  await passo('nas Cenas', async () => {
    await M.locator('#tab-cenas').click();
    let C = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Fichas.on() && !!__tc.Fichas.get('pc_lia')); }, 40000), '(o mestre abre as Cenas, com as fichas)');
    if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }
    const r = await C.evaluate(() => { const sc = __tc.Store.scene(); return __tc.Combate.elenco(sc).map(x => x.nome + (x.ativo ? '' : '(inativo)')).sort(); });
    ok(j(r) === j(['Lia(inativo)', 'Lobo(inativo)']), '"Puxar o grupo": o Dain e o Ogro (no Toldo) não aparecem; a Lia e o Lobo, inativos, aparecem (desmarcados): ' + j(r));
    const op = await C.evaluate(() => {
      const u = __tc, sc = u.Store.scene(), tk = u.newToken(sc, sc.cell * 3, sc.cell * 3, { name: 'x' });
      u.Store.tx('Criar', () => u.Store.add('tokens', tk)); u.setSel([{ c: 'tokens', id: tk.id }]); u.UI.openTab('sel'); return tk.id;
    });
    await w(400);
    if (!(await C.locator('#s-ficha').evaluate(d => d.open))) { await C.locator('#s-ficha > summary').click(); await w(200); }
    const opcoes = await C.evaluate(() => [...document.querySelectorAll('#tk-char option')].map(o => o.textContent));
    ok(opcoes.length > 0 && !opcoes.some(x => /Dain X|Ogro/.test(x)) && opcoes.some(x => /Lia/.test(x)), 'na lista de fichas do token, quem está no Toldo também não aparece: ' + j(opcoes));
    await C.evaluate(id => { __tc.Store.tx('Tirar', () => __tc.Store.del('tokens', id)); }, op);
    // o restaurar num token ligado à ficha: o Ki (começa em 0) e a Fé (cheia) voltam, na ficha
    const tl = await C.evaluate(() => { const u = __tc, ids = u.Combate.trazer(['pc_lia'], u.Store.scene().cell * 5, u.Store.scene().cell * 5); u.setSel([{ c: 'tokens', id: ids[0] }]); u.UI.openTab('turn'); return ids[0]; });
    ok(await ate(async () => (await C.evaluate(id => (__tc.Store.get('tokens', id).bars || []).map(b => b.n + ':' + b.v + (b.st != null ? '(começa ' + b.st + ')' : '')).join(' '), tl)).includes('Ki:3(começa 0)')), 'o token da Lia traz o Ki com o "começa em" da ficha: ' + await C.evaluate(id => (__tc.Store.get('tokens', id).bars || []).map(b => b.n + ':' + b.v + (b.st != null ? '(começa ' + b.st + ')' : '')).join(' '), tl));
    await C.locator('#turnRestaurar').click(); await w(300);
    ok(/Ki 3 → 0/.test(await C.locator('#rs-tela').innerText()) && /Fé 1 → 4/.test(await C.locator('#rs-tela').innerText()), 'a prévia: Ki 3 → 0 e Fé 1 → 4');
    await C.locator('.modal .btn.primary', { hasText: 'Restaurar' }).click(); await w(500);
    ok(await ate(async () => { const e = await est(M, 'pc_lia'); return e.pd && e.pd.pk === 0 && e.pd.pf === 4 && await parado(M); }), 'restaurado: a ficha da Lia fica com o Ki em 0 e a Fé em 4 (no banco)');
  });

  if (nomeMesa) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { ok(false, 'apagar a mesa de teste: ' + e.message); } }
  const inesperados = t.errs.filter(e => !/WebSocket|realtime|ERR_|Failed to load resource/i.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 10).join('\n'));
  ok(inesperados.length === 0, 'sem erros inesperados no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
