// Lote 15 numa mesa (rede): o mestre e um jogador.
//   · o Estaque escondido do jogador, ficha por ficha: o mestre marca no próprio Estaque; o jogador deixa de ver a aba
//     e o texto nem chega a ele (vai para o documento dos segredos, que só o mestre recebe); o mestre continua vendo e
//     escrevendo (também depois de recarregar); desmarcado, o texto volta para a ficha e o jogador vê de novo.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const pc = (id, nome, estaque) => Object.assign(R.personagemPadrao(nome), { id, nome, level: 12, estaque, recursos: [{ id: 'hp' + id, nome: 'HP', fml: '100' }] });
const local = JSON.stringify({ v: 1, cfg: R.cfgPadrao(),
  personagens: [pc('pc_dain', 'Dain X', { a: 'Maldição do lobo - 3 dias', b: 'Marcado pela Ordem' }), pc('pc_cap', 'Capitão', { a: 'Mente o nome', b: '' }), pc('pc_seg', 'Espião', { a: 'Trabalha para o duque', b: '' })],
  situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { urgm_calc_atributos_v1: local, 'tinycats:aba': 'fichas' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1250, h: 860, seed: { 'tinycats:aba': 'fichas' } })).page;
  M.setDefaultTimeout(10000); J.setDefaultTimeout(10000);
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const fichas = async p => { for (let i = 0; i < 40; i++) { const f = p.frame({ url: /\/fichas\// }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 15000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* a moldura pode estar recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const linha = (p, nome) => p.evaluate(nome => { const l = TC.dados.col('personagens').todas().find(x => x.nome === nome); return l ? JSON.parse(JSON.stringify(l)) : null; }, nome);
  const segredos = p => p.evaluate(() => { const d = TC.dados.col('documentos').pegar('fichas:segredos'); return d ? JSON.parse(JSON.stringify(d.dados.v)) : null; });
  // (SO=estaque ou SO=descanso: só aquela parte — a mesa e as fichas, sempre)
  const SO = process.env.SO || '';
  const passo = async (nome, fn, parte) => { if (parte && SO && parte !== SO) return; try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  // (lote 16: o Estaque é um quadro da aba Notas)
  const temEstaque = async f => (await f.locator('#painelEstaque').count()) === 1;
  const aba = async (f, k, p) => { await f.locator('[data-abaficha="' + k + '"]').click(); await w(200, p); };
  const foto = async (p, nome) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await p.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  let F = null, G = null, nomeMesa = null;

  await passo('a mesa, as fichas e o jogador', async () => {
    await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
    await loginTela(M, c.mestre, c.senha);
    nomeMesa = 'Lote 15 ' + Date.now().toString(36);
    const codigo = await criarMesaTela(M, nomeMesa);
    ok(await ate(async () => { F = await fichas(M); return F && (await F.locator('.mesa-oferta').count()) === 1; }), '(a mesa oferece trazer as fichas do navegador)');
    await F.locator('#ofertaSim').click(); await w(800);
    ok(await ate(async () => (await M.evaluate(() => TC.dados.col('personagens').todas().length)) === 3 && await parado(M)), '(as três fichas sobem)');
    await J.goto(t.base, { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    ok(await ate(async () => (await F.locator('#f_dono option').allInnerTexts()).join('|').includes('Dalmo')), '(o jogador entrou)');
    await F.locator('#lista .pc', { hasText: 'Dain X' }).click(); await w(300);
    await F.locator('#f_dono').selectOption({ label: 'Dalmo' }); await w(300);
    await F.locator('#lista .pc', { hasText: 'Capitão' }).click(); await w(300);
    await F.locator('#f_vis').check(); await w(300);
    await F.locator('#lista .pc', { hasText: 'Dain X' }).click(); await w(300);
    ok(await ate(async () => await parado(M)), '(o Dain X é do Dalmo; o Capitão, aberto a todos; o Espião, só do mestre)');
    ok(await ate(async () => { G = await fichas(J); return G && (await G.locator('#lista .pc').count()) === 2; }), '(o jogador vê o Dain X e o Capitão)');
  });

  await passo('o Estaque, antes', async () => {
    await G.locator('#lista .pc', { hasText: 'Dain X' }).click(); await w(400, J);
    await aba(G, 'notas', J); await aba(F, 'notas');
    ok(await temEstaque(G) && await G.locator('[data-est="a"]').inputValue() === 'Maldição do lobo - 3 dias', 'o jogador vê o Estaque do Dain X (na aba Notas), com o texto');
    ok(await G.locator('#f_estoculto').count() === 0, 'o jogador não tem a marca de esconder');
    ok(await F.locator('#f_estoculto').count() === 1 && /Esconder o Estaque de Dalmo/.test(await F.locator('.estoc').innerText()), 'o mestre tem, no Estaque da ficha do jogador: "Esconder o Estaque de Dalmo"');
    await F.locator('#lista .pc', { hasText: 'Capitão' }).click(); await w(300);
    ok(/Esconder o Estaque dos jogadores/.test(await F.locator('.estoc').innerText()), 'no NPC aberto aos jogadores: "dos jogadores"');
    await F.locator('#lista .pc', { hasText: 'Espião' }).click(); await w(300);
    ok(await F.locator('#f_estoculto').count() === 0 && await F.locator('[data-est="a"]').inputValue() === 'Trabalha para o duque', 'no NPC que só o mestre vê, não há o que esconder (sem a marca)');
    await F.locator('#lista .pc', { hasText: 'Dain X' }).click(); await w(300);
  }, 'estaque');

  await passo('esconder', async () => {
    await F.locator('#f_estoculto').check(); await w(500);
    ok(/O Estaque de Dain X ficou escondido: só você vê\./.test(await F.locator('.toast, .aviso').allInnerTexts().then(x => x.join(' | '))) && /Só você vê o Estaque desta ficha/.test(await F.locator('.estoc').innerText()), 'marcada: o aviso, e a nota "Só você vê o Estaque desta ficha"');
    ok(await F.locator('[data-est="a"]').inputValue() === 'Maldição do lobo - 3 dias', 'o mestre continua vendo o texto');
    ok(await ate(async () => { const l = await linha(M, 'Dain X'), s = await segredos(M); return await parado(M) && l.ficha.estaqueOculto === true && l.ficha.estaque.a === '' && l.ficha.estaque.b === '' && s && s.est && s.est.pc_dain && s.est.pc_dain.a === 'Maldição do lobo - 3 dias' && s.est.pc_dain.b === 'Marcado pela Ordem'; }),
      'no banco: a ficha leva a marca e o Estaque vazio; o texto vai para os segredos do mestre');
    ok(await ate(async () => !(await temEstaque(G))), 'o jogador deixa de ver o Estaque');
    const lj = await linha(J, 'Dain X');
    ok(lj && lj.ficha.estaque.a === '' && lj.ficha.estaque.b === '' && !/Maldição/.test(JSON.stringify(lj)), 'e o texto nem chega a ele (a ficha que ele recebe vem com o Estaque vazio): ' + JSON.stringify(lj && lj.ficha.estaque) + ' ' + (JSON.stringify(lj).match(/.{60}Maldi.{40}/) || [''])[0]);
    ok(await J.evaluate(() => TC.dados.col('documentos').pegar('fichas:segredos')) === null, '(os segredos não chegam ao jogador)');
    ok(await G.locator('#painelMissoes').count() === 1 && await G.locator('[data-est]').count() === 0 && /notas/i.test(await G.locator('[data-abaficha].on').innerText()), 'na aba Notas do jogador ficam as missões e as anotações, sem o Estaque');
    await G.locator('#painelMissoes').scrollIntoViewIfNeeded(); await F.locator('.estoc').scrollIntoViewIfNeeded(); await w(300);
    await foto(J, 'l15-estaque-jogador'); await foto(M, 'l15-estaque-mestre');
  }, 'estaque');

  await passo('o mestre escreve no Estaque escondido', async () => {
    await F.locator('[data-est="b"]').fill('Marcado pela Ordem; deve um favor'); await w(300);
    await F.locator('[data-est="a"]').click(); await w(800);
    ok(await ate(async () => { const s = await segredos(M), l = await linha(M, 'Dain X'); return await parado(M) && s.est.pc_dain.b === 'Marcado pela Ordem; deve um favor' && l.ficha.estaque.b === ''; }), 'o que ele escreve vai para os segredos (a ficha continua com o Estaque vazio)');
    // o jogador mexe na ficha dele (o HP): o Estaque do mestre não se perde
    await G.locator('[data-resatual="hppc_dain"]').fill('-10'); await G.locator('[data-resatual="hppc_dain"]').press('Enter'); await w(500, J);
    ok(await ate(async () => (await linha(M, 'Dain X')).estado.rec.hppc_dain === 90 && await F.locator('[data-resatual="hppc_dain"]').inputValue() === '90'), '(o jogador toma 10 de dano na ficha dele, e o mestre vê)');
    ok(await F.locator('[data-est="b"]').inputValue() === 'Marcado pela Ordem; deve um favor', 'a mudança que chega do jogador não apaga o Estaque na tela do mestre');
    await M.reload({ waitUntil: 'load' }); await w(1500);
    ok(await ate(async () => { F = await fichas(M); return F && (await F.locator('#lista .pc').count()) === 3; }), '(o mestre recarrega o site)');
    await F.locator('#lista .pc', { hasText: 'Dain X' }).click(); await w(400);
    await aba(F, 'notas');
    ok(await F.locator('#f_estoculto').isChecked() && await F.locator('[data-est="a"]').inputValue() === 'Maldição do lobo - 3 dias' && await F.locator('[data-est="b"]').inputValue() === 'Marcado pela Ordem; deve um favor', 'depois de recarregar, o mestre vê o Estaque escondido, com o texto (vem dos segredos)');
  }, 'estaque');

  await passo('mostrar de novo', async () => {
    await F.locator('#f_estoculto').uncheck(); await w(500);
    ok(/voltou a aparecer para Dalmo/.test(await F.locator('.toast, .aviso').allInnerTexts().then(x => x.join(' | '))), 'desmarcada: o aviso diz que o Estaque voltou a aparecer para Dalmo');
    ok(await ate(async () => { const l = await linha(M, 'Dain X'), s = await segredos(M); return await parado(M) && !l.ficha.estaqueOculto && l.ficha.estaque.b === 'Marcado pela Ordem; deve um favor' && !(s && s.est && s.est.pc_dain); }), 'no banco: o texto volta para a ficha e sai dos segredos');
    ok(await ate(async () => await temEstaque(G)), 'o jogador volta a ver o Estaque');
    await aba(G, 'notas', J);
    ok(await G.locator('[data-est="b"]').inputValue() === 'Marcado pela Ordem; deve um favor', 'com o que o mestre escreveu enquanto estava escondido');
  }, 'estaque');

  // ---------- o Descanso curto: a equipe ativa, longe da fogueira, e o botão das Cenas ----------
  const quadro = async (p, re) => { for (let i = 0; i < 60; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  let A = null, C = null;
  const dialogo = () => A.evaluate(() => { const d = document.querySelector('dialog[open]'); return d ? d.innerText.replace(/\s+/g, ' ') : null; });
  const marcadosNoDialogo = () => A.evaluate(() => [...document.querySelectorAll('dialog[open] input[type=checkbox][id^="ds-"]')].filter(i => /^ds-pc_/.test(i.id)).map(i => i.id.slice(3) + (i.checked ? '+' : '-')).join(' '));
  await passo('o descanso curto no acampamento', async () => {
    await F.locator('#lista .pc', { hasText: 'Espião' }).click(); await w(300);
    await aba(F, 'atributos');
    await F.locator('#f_lado').selectOption('Inimigo'); await w(300);
    await F.locator('#lista .pc', { hasText: 'Capitão' }).click(); await w(300);
    await F.locator('[data-resatual="hppc_cap"]').fill('60'); await F.locator('[data-resatual="hppc_cap"]').press('Enter'); await w(400);
    await F.locator('#lista .pc', { hasText: 'Dain X' }).click(); await w(300);
    await F.locator('[data-resatual="hppc_dain"]').fill('90'); await F.locator('[data-resatual="hppc_dain"]').press('Enter'); await w(400);
    ok(await ate(async () => await parado(M) && (await linha(M, 'Capitão')).estado.rec.hppc_cap === 60 && (await linha(M, 'Dain X')).estado.rec.hppc_dain === 90 && (await linha(M, 'Espião')).ficha.lado === 'Inimigo'), '(o Capitão com HP 60, o Dain X com 90; o Espião, inimigo)');
    await M.locator('#tab-acampamento').click();
    ok(await ate(async () => { A = await quadro(M, /\/acampamento\//); return A && await A.evaluate(() => !!window.__acamp && __acamp.pronto && __acamp.papel === 'mestre'); }), '(o mestre abre o Acampamento)');
    ok(await ate(async () => await A.evaluate(() => __acamp.camp.presentes.includes('pc_dain'))), '(o personagem do jogador entra na roda sozinho)');
    // ninguém na fogueira: o grupo saiu; e o descanso curto gasta 1 ração de cada um
    await A.evaluate(() => __acamp.mudar('preparar', c => { c.presentes = []; c.provisoes = [{ id: 'pao', nome: 'Pão de viagem', qtd: 10 }]; c.regras.curto.prov = 1; }));
    await w(400);
    await A.locator('#btCurto').click(); await w(400);
    const d1 = await dialogo();
    ok(!!d1 && /Longe da fogueira: Dain X\. Quem descansa gasta as rações do acampamento do mesmo jeito\./.test(d1) && /longe da fogueira/.test(await A.locator('[data-longe="pc_dain"]').innerText()), 'ninguém em volta da fogueira: o Descanso curto traz a equipe ativa (o Dain X, do jogador), avisando que ele está longe: ' + (d1 || '').slice(0, 200));
    ok(await marcadosNoDialogo() === 'pc_dain+', 'e ele vem marcado (o NPC que não está no acampamento não entra): ' + await marcadosNoDialogo());
    ok(/gasta 1 de 10/.test(d1), 'longe da fogueira, gasta as rações do mesmo jeito (1 de 10): ' + (/Provisões[^.]*\./.exec(d1) || [''])[0]);
    await A.locator('dialog[open] button', { hasText: 'Cancelar' }).click(); await w(300);
    // o descanso longo continua sendo de quem está em volta da fogueira
    await A.locator('#btLongo').click(); await w(400);
    ok(await dialogo() === null && /Não há ninguém com ficha em volta da fogueira\. Chame/.test(await A.locator('.toast, #toast').allInnerTexts().then(x => x.join(' | '))), 'o Descanso longo continua sendo só de quem está em volta da fogueira (ninguém: o aviso de sempre)');
    // o Dain X inativo (fica no acampamento, por exemplo): não entra sozinho
    await M.locator('#tab-fichas').click(); await w(500);
    await F.locator('#lista .pc', { hasText: 'Dain X' }).click(); await w(300);
    await F.locator('#f_ativo').uncheck(); await w(500);
    ok(await ate(async () => await parado(M) && (await linha(M, 'Dain X')).estado.ativo === false), '(o mestre deixa o Dain X inativo)');
    await M.locator('#tab-acampamento').click(); await w(600);
    await A.locator('#btCurto').click(); await w(400);
    ok(await dialogo() === null && /nem na equipe ativa/.test(await A.locator('.toast, #toast').allInnerTexts().then(x => x.join(' | '))), 'inativo e longe da fogueira, ninguém descansa: o aviso explica');
    await M.locator('#tab-fichas').click(); await w(500);
    await F.locator('#f_ativo').check(); await w(500);
    ok(await ate(async () => await parado(M) && (await linha(M, 'Dain X')).estado.ativo !== false), '(ativo de novo)');
  }, 'descanso');

  await passo('o descanso curto pelas Cenas', async () => {
    // (o Espião ficou no acampamento: está em volta da fogueira, mas não na cena)
    await M.locator('#tab-acampamento').click(); await w(500);
    await A.evaluate(() => __acamp.mudar('o espião fica', c => { c.presentes = ['pc_seg']; }));
    await w(300);
    await M.locator('#tab-cenas').click();
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Fichas.on() && __tc.Luta.podeDescanso()); }, 20000), '(as Cenas, com as fichas)');
    await C.evaluate(() => { const u = __tc, sc = u.Store.scene(); u.Combate.trazer(['pc_dain', 'pc_cap', 'pc_seg'], 3 * sc.cell, 3 * sc.cell); u.setSel([]); u.UI.openTab('sel'); });
    ok(await ate(async () => (await C.evaluate(() => __tc.Store.scene().tokens.filter(t => t.char).length)) === 3), '(os três tokens, ligados às fichas, na cena)');
    await w(500);
    ok(await C.locator('#sel-curto').count() === 1, 'na Seleção, o botão "Descanso curto…"');
    await C.locator('#sel-curto').click();
    ok(await ate(async () => (await M.locator('#tab-acampamento').getAttribute('aria-selected')) === 'true' && !!(await dialogo())), 'o site vai para o Acampamento, já com a janela do Descanso curto aberta');
    const d2 = await dialogo();
    ok(/Descanso curto/.test(await A.locator('dialog[open]').innerText()) && /Vindo da cena: marcados os 2 que estão nela\./.test(d2), 'a janela diz que veio da cena: ' + (d2 || '').slice(0, 160));
    ok(await marcadosNoDialogo() === 'pc_seg- pc_dain+ pc_cap+', 'marcados o Dain X (do jogador) e o Capitão (aliado), que estão na cena; o Espião, que ficou na fogueira, aparece desmarcado: ' + await marcadosNoDialogo());
    ok(/gasta 2 de 10/.test(d2) && /HP 90 → 100\/100/.test(d2) && /HP 60 → 85\/100/.test(d2), 'a prévia: 2 rações, o Dain 90 → 100 e o Capitão 60 → 85 (25% do máximo): ' + (d2 || '').slice(0, 400));
    await foto(M, 'l15-descanso-da-cena');
    await A.locator('#ds-ok').click(); await w(600);
    ok(await ate(async () => await parado(M) && (await linha(M, 'Dain X')).estado.rec.hppc_dain === 100 && (await linha(M, 'Capitão')).estado.rec.hppc_cap === 85), 'confirmado: as fichas recebem o descanso (100 e 85)');
    ok(await ate(async () => await A.evaluate(() => __acamp.camp.provisoes[0].qtd === 8 && /Descanso curto: 2 descansaram/.test(__acamp.camp.diario[0].texto))), 'as rações saem do acampamento (8) e o diário registra');
    await M.locator('#tab-cenas').click(); await w(800);
    ok(await ate(async () => await C.evaluate(() => { const t = __tc.Store.scene().tokens.find(k => k.char === 'pc_cap'); return !!t && t.bars.find(b => b.n === 'HP').v === 85; })), 'de volta à cena, o token do Capitão já mostra 85');
  }, 'descanso');

  await passo('limpar', async () => { await apagarMesaTela(M, nomeMesa); ok(true, '(a mesa de teste foi apagada)'); });
  const inesperados = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409)/.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 8).join('\n'));
  ok(inesperados.length === 0, 'sem erros no console');
  await t.close();
  end();
})();
