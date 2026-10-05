// Fichas dentro de uma mesa, no projeto real: o mestre traz as fichas, entrega uma a um jogador, e os dois veem as mudanças.
const { start, checker, espiarBanco } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const pc = (id, nome, lvl) => ({ id, nome, raca: 'Humano', lado: 'Aliado', grupo: '', tags: [], tier: 'S', level: lvl, tiers: { FOR: 'A', DES: 'C', AGI: 'D', VIT: 'B', CAN: 'E' }, pctProprio: null, poderes: [],
  skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 10, DFM: 4 }, rol: { fixa: 20, fonte: 'total' }, ultRol: null, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 },
  estaque: { a: '', b: '' }, habilidades: [], itens: [], recursos: [{ id: 'hp' + id, nome: 'HP', fml: 'VIT*8 + LVL*5' }, { id: 'sp' + id, nome: 'SP', fml: 'CAN*6 + LVL*3' }], notas: '' });
const local = JSON.stringify({ v: 1, cfg: { niveis: Array.from({ length: 50 }, (_, i) => ({ lvl: i + 1, pts: i === 49 ? 445 : 45 + i * 8 })), tiersPersonagem: [{ t: 'S', m: 1.12 }, { t: 'A', m: 1.08 }, { t: 'B', m: 1.04 }, { t: 'C', m: 1 }, { t: 'D', m: 0.85 }, { t: 'E', m: 0.75 }], pct: { A: 0.3, B: 0.26, C: 0.22, D: 0.17, E: 0.05 }, arredondar: 'floor' },
  personagens: [pc('pc_dain', 'Dain X', 19), pc('pc_capitao', 'Capitão', 12)], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const dM = await t.device({ name: 'mestre', seed: { urgm_calc_atributos_v1: local, 'tinycats:aba': 'fichas' } }), M = dM.page;
  await espiarBanco(dM.ctx);
  const J = (await t.device({ name: 'jogador', w: 1250, h: 820, seed: { 'tinycats:aba': 'fichas' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const fichas = async p => { for (let i = 0; i < 40; i++) { const f = p.frame({ url: /\/fichas\// }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 12000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* a moldura pode estar recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const nomes = async f => (await f.locator('#lista .pc .nm').allInnerTexts()).join('|');

  // ---------- sem mesa: as fichas deste navegador, como sempre ----------
  await M.goto(t.base, { waitUntil: 'load' }); await w(2000);
  let F = await fichas(M);
  ok(await nomes(F) === 'Dain X|Capitão', 'sem mesa, as fichas são as deste navegador: ' + await nomes(F));
  ok(await F.locator('#f_dono').count() === 0, 'sem mesa não há "jogador que controla"');
  await F.locator('[data-resatual="hppc_dain"]').fill('300'); await w(700);
  ok(await F.evaluate(() => JSON.parse(localStorage.getItem('urgm_calc_atributos_v1')).personagens[0].estado.rec.hppc_dain) === 300, 'o valor atual de um recurso é guardado (sem mesa, no navegador)');

  // ---------- o mestre cria a mesa: ela começa vazia e oferece trazer as fichas ----------
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Fichas E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  ok(await ate(async () => { F = await fichas(M); return F && (await F.locator('.mesa-oferta').count()) === 1; }), 'ao abrir a mesa, as Fichas recarregam e oferecem trazer as fichas do navegador');
  ok(await nomes(F) === '', 'a mesa nova começa sem fichas');
  ok((await F.locator('.mesa-oferta').innerText()).includes('2 fichas'), 'o aviso conta as fichas guardadas: ' + (await F.locator('.mesa-oferta p').innerText()));
  await F.locator('#ofertaSim').click(); await w(600);
  ok(await nomes(F) === 'Dain X|Capitão', 'as duas fichas entram na mesa');
  ok(await ate(async () => (await M.locator('#nuvem').isHidden()) && await M.evaluate(() => TC.dados.col('personagens').todas().every(l => l.rev > 0) && TC.dados.pendentes === 0)), 'e sobem para o banco (nada pendente)');
  ok(await F.locator('#f_dono').count() === 1 && await F.locator('#f_vis').count() === 1, 'na mesa, o mestre vê "jogador que controla" e "todos veem"');

  // ---------- o jogador entra: não vê nada até o mestre entregar ----------
  await J.goto(t.base, { waitUntil: 'load' }); await w(1500, J);
  await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
  let G = null;
  ok(await ate(async () => { G = await fichas(J); return G && (await G.locator('#ficha').innerText()).includes('Nenhum personagem'); }), 'o jogador entra e não vê ficha nenhuma');
  ok(await G.locator('#btnCfg').isHidden() && await G.locator('#btnFlush').isHidden() && await G.locator('nav.tabs button[data-tab="mesa"]').isHidden(), 'para o jogador somem Tabelas base, Apagar dados e a aba Mesa');
  ok(await ate(async () => (await F.locator('#f_dono option').allInnerTexts()).join('|').includes('Dalmo')), 'o mestre passa a ver o jogador na lista de quem pode controlar');
  await F.locator('#f_dono').selectOption({ label: 'Dalmo' }); await w(300);
  ok((await F.locator('#lista .pc').first().innerText()).toLowerCase().includes('de dalmo'), 'o elenco do mestre mostra de quem é a ficha');
  ok(await ate(async () => (await nomes(G)) === 'Dain X'), 'a ficha entregue aparece para o jogador, sem recarregar');
  await G.locator('#lista .pc').first().click(); await w(400, J);
  ok(await G.locator('#f_nome').isEnabled() && await G.locator('[data-act="del"]').isDisabled(), 'o jogador edita a própria ficha, mas não a exclui');
  ok(await G.locator('[data-resatual="hppc_dain"]').inputValue() === '300', 'o valor atual veio junto (300)');

  // ---------- mudanças dos dois lados ----------
  await G.locator('[data-resatual="hppc_dain"]').fill('212'); await G.locator('#f_nome').click(); await w(300, J);
  await F.locator('#lista .pc', { hasText: 'Capitão' }).click(); await w(300);     // o mestre está em outra ficha
  await F.locator('#lista .pc', { hasText: 'Dain X' }).click();
  ok(await ate(async () => (await F.locator('[data-resatual="hppc_dain"]').inputValue()) === '212'), 'o HP atual mudado pelo jogador chega ao mestre');
  await F.locator('#f_raca').fill('Humano paladino'); await w(300);
  ok(await ate(async () => (await G.locator('#lista .pc .mt').first().innerText()).toLowerCase().includes('paladino')), 'o que o mestre muda na ficha chega ao jogador');
  await F.locator('#lista .pc', { hasText: 'Capitão' }).click(); await w(300);
  await F.locator('#f_vis').check(); await w(300);
  ok(await ate(async () => (await nomes(G)).includes('Capitão')), 'ficha marcada "todos veem" aparece para o jogador');
  await G.locator('#lista .pc', { hasText: 'Capitão' }).click(); await w(500, J);
  ok(await G.locator('#f_nome').isDisabled() && (await G.locator('.so-consulta').count()) === 1, 'ficha de outra pessoa: só consulta');

  // ---------- o jogador rola pela ficha e a mesa vê ----------
  await G.locator('#lista .pc', { hasText: 'Dain X' }).click(); await w(400, J);
  await G.locator('[data-rolar]').first().click(); await w(500, J);
  let chegou = false;
  try { await M.locator('#feed .rol', { hasText: 'Dain X' }).first().waitFor({ timeout: 10000 }); chegou = true; } catch (e) { /* não chegou */ }
  ok(chegou, 'a rolagem do jogador pela ficha aparece na mesa ao vivo do mestre');
  ok(chegou && (await M.locator('#feed .rol', { hasText: 'Dain X' }).first().locator('.it-h b').innerText()) === 'Dalmo', 'com o nome do jogador');

  // ---------- o aviso em tempo real de uma ficha chega sem as colunas grandes que não mudaram ----------
  /* É assim que o banco avisa: quem muda só os pontos atuais (a coluna "estado") faz o aviso chegar sem a ficha e sem
     a árvore. Aplicado como vem, a ficha fica em branco na tela de todo mundo até recarregar. */
  await F.locator('#lista .pc', { hasText: 'Dain X' }).click(); await w(400);
  const avisar = (hp, vazias) => M.evaluate(async ([hp, vazias]) => {
    const col = TC.dados.col('personagens'), l = col.todas().find(x => x.nome === 'Dain X');
    const canal = window.__sb ? window.__sb.getChannels().find(c => ((c.bindings || {}).postgres_changes || []).some(b => b.filter && b.filter.table === 'personagens')) : null;
    if (!canal) return { erro: 'não achei o canal da mesa' };
    const estado = Object.assign({}, l.estado, { rec: Object.assign({}, (l.estado || {}).rec, { hppc_dain: hp }) });
    // outro aparelho muda só os pontos atuais, direto no banco…
    const { data, error } = await window.__sb.from('personagens').update({ estado }).eq('mesa_id', l.mesa_id).eq('id', l.id).select('rev').single();
    if (error) return { erro: error.message };
    // …e o aviso chega sem a ficha e sem a árvore (ou com elas vazias)
    const novo = { id: l.id, mesa_id: l.mesa_id, nome: l.nome, dono_id: l.dono_id, vis: l.vis, ordem: l.ordem, estado, rev: data.rev, apagado: false };
    if (vazias) { novo.ficha = null; novo.skills = null; }
    for (const b of canal.bindings.postgres_changes) if (b.filter.table === 'personagens') b.callback({ eventType: 'UPDATE', schema: 'public', table: 'personagens', new: novo, old: { id: l.id }, errors: null });
    const logo = col.pegar(l.id);
    return { tinhaFicha: !!(l.ficha && Object.keys(l.ficha).length > 3), temFicha: !!(logo && logo.ficha && Object.keys(logo.ficha).length > 3) };
  }, [hp, vazias]);
  let av = await avisar(180, false);
  ok(!av.erro && av.tinhaFicha && av.temFicha, 'um aviso em tempo real sem as colunas grandes não tira a ficha da memória: ' + JSON.stringify(av));
  await w(700);
  ok((await F.locator('#f_raca').inputValue()) === 'Humano paladino' && (await F.locator('#f_nome').inputValue()) === 'Dain X', 'a ficha aberta continua preenchida na tela (não fica em branco)');
  await F.locator('#lista .pc', { hasText: 'Capitão' }).click(); await w(300); await F.locator('#lista .pc', { hasText: 'Dain X' }).click();
  ok(await ate(async () => (await F.locator('[data-resatual="hppc_dain"]').inputValue()) === '180' && (await F.locator('#f_raca').inputValue()) === 'Humano paladino'), 'a casca lê a linha inteira do banco: o valor novo aparece, e o resto da ficha continua lá');
  av = await avisar(212, true);
  ok(!av.erro && av.temFicha, 'o mesmo se as colunas chegarem vazias: ' + JSON.stringify(av));
  await w(700);
  ok((await F.locator('#f_raca').inputValue()) === 'Humano paladino', 'a ficha continua preenchida na tela');
  await F.locator('#lista .pc', { hasText: 'Capitão' }).click(); await w(300); await F.locator('#lista .pc', { hasText: 'Dain X' }).click();
  ok(await ate(async () => (await F.locator('[data-resatual="hppc_dain"]').inputValue()) === '212'), 'e o valor novo aparece');
  ok(await ate(async () => (await G.locator('[data-resatual="hppc_dain"]').inputValue()) === '212' && (await G.locator('#f_nome').inputValue()) === 'Dain X'), 'para o jogador também');

  // ---------- recarregar, excluir, sair da mesa ----------
  await M.reload({ waitUntil: 'load' });
  ok(await ate(async () => { F = await fichas(M); return F && (await nomes(F)) === 'Dain X|Capitão'; }), 'recarregando, as fichas da mesa voltam do banco');
  await F.locator('#lista .pc', { hasText: 'Dain X' }).click(); await w(400);
  ok((await F.locator('#f_raca').inputValue()) === 'Humano paladino' && (await F.locator('[data-resatual="hppc_dain"]').inputValue()) === '212', 'com o que cada um mudou');
  M.once('dialog', d => d.accept());
  await F.locator('#lista .pc', { hasText: 'Capitão' }).click(); await w(300); await F.locator('[data-act="del"]').click(); await w(500);
  ok(await ate(async () => (await nomes(G)) === 'Dain X'), 'ficha excluída pelo mestre some para o jogador');
  await M.locator('#btnConta').click(); await w(300); await M.locator('#menu .lk', { hasText: 'Fechar a mesa neste navegador' }).click();
  ok(await ate(async () => { F = await fichas(M); return F && (await nomes(F)) === 'Dain X|Capitão' && (await F.locator('#f_dono').count()) === 0; }), 'fechando a mesa, voltam as fichas do navegador, intactas');
  ok(await F.evaluate(() => { const s = JSON.parse(localStorage.getItem('urgm_calc_atributos_v1')); return s.personagens.length === 2 && s.personagens[0].raca === 'Humano' && s.personagens[0].estado.rec.hppc_dain === 300; }), 'o que foi feito na mesa não mexeu nas fichas locais');

  // limpeza
  await M.locator('#btnConta').click(); await w(300); await M.locator('#menu .lk', { hasText: 'Escolher ou criar mesa' }).click();
  await M.locator('#m-lista button', { hasText: nomeMesa }).click(); await M.locator('#vivo').waitFor({ state: 'visible', timeout: 20000 });
  await apagarMesaTela(M, nomeMesa);
  const fora = t.errs.filter(e => !/status of (400|401|409)/.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
