// Fichas numa mesa (rede), lote 7 (parte 2): os tipos de equipamento e os itens com níveis entre o mestre e o jogador.
//   · o mestre cria um tipo em "Tipos…": ele vai para a configuração da mesa (fichas:cfg), e o jogador vê a seção nova;
//   · o jogador (dono da ficha) sobe o nível da katana: grava na ficha, o mestre vê o nível e as contas mudarem (e a
//     bainha que pede o Nv 2 passa a valer), e a mesa ao vivo fica sabendo;
//   · numa ficha só para consulta, os filtros e as seções continuam valendo; a alça e o ◂ ▸, não.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const zero = { FOR: 0, DES: 0, VIT: 0, CAN: 0, AGI: 0 };
const it = (id, nome, o) => Object.assign({ id, nome, equipado: true, bonus: Object.assign({}, zero) }, o);
const pc = (id, nome, itens) => ({ id, nome, raca: 'Kitsune', lado: 'Aliado', grupo: '', tags: [], tier: 'S', level: 12, tiers: { FOR: 'A', DES: 'C', AGI: 'D', VIT: 'B', CAN: 'E' }, pctProprio: null, poderes: [],
  skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 10, DFM: 4 }, rol: { fixa: 0, fonte: 'total' }, ultRol: null, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 },
  estaque: { a: '', b: '' }, habilidades: [], itens, recursos: [{ id: 'hp' + id, nome: 'HP', fml: 'VIT*8 + LVL*5' }], notas: '' });
const katana = it('kat', 'Katana de gelo', { tipo: 'arma', nv: 1, bonus: Object.assign({}, zero, { FOR: 2 }), niveis: [{ bonus: { FOR: 2 } }, { bonus: { FOR: 4, DFF: 1 }, efeito: 'Corte gélido' }, { bonus: { FOR: 6, DFF: 2 } }] });
const DAIN = [katana, it('bai', 'Bainha de jade', { tipo: 'acessorio', req: 'i:kat@2', bonus: Object.assign({}, zero, { DES: 1 }) }), it('cou', 'Couraça de couro', { bonus: Object.assign({}, zero, { DFF: 3 }) })];
const CAP = [it('esp', 'Espada longa', { tipo: 'arma', bonus: Object.assign({}, zero, { FOR: 3 }) }), it('esc', 'Escudo de carvalho', { tipo: 'escudo', bonus: Object.assign({}, zero, { DFF: 2 }) }),
  it('lan', 'Lança', { tipo: 'arma', equipado: false, nv: 1, niveis: [{ bonus: { FOR: 1 } }, { bonus: { FOR: 2 } }], bonus: Object.assign({}, zero, { FOR: 1 }) })];
const local = JSON.stringify({ v: 1, cfg: { niveis: Array.from({ length: 50 }, (_, i) => ({ lvl: i + 1, pts: i === 49 ? 445 : 45 + i * 8 })), tiersPersonagem: [{ t: 'S', m: 1.12 }, { t: 'A', m: 1.08 }, { t: 'B', m: 1.04 }, { t: 'C', m: 1 }, { t: 'D', m: 0.85 }, { t: 'E', m: 0.75 }], pct: { A: 0.3, B: 0.26, C: 0.22, D: 0.17, E: 0.05 }, arredondar: 'floor' },
  personagens: [pc('pc_dain', 'Dain X', DAIN), pc('pc_cap', 'Capitão', CAP)], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });

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
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  let F = null, G = null, nomeMesa = null, tipoId = null;

  await passo('a mesa, as fichas e o jogador', async () => {
    await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
    await loginTela(M, c.mestre, c.senha);
    nomeMesa = 'Fichas L7 ' + Date.now().toString(36);
    const codigo = await criarMesaTela(M, nomeMesa);
    ok(await ate(async () => { F = await fichas(M); return F && (await F.locator('.mesa-oferta').count()) === 1; }), '(a mesa oferece trazer as fichas do navegador)');
    await F.locator('#ofertaSim').click(); await w(800);
    ok(await ate(async () => (await M.evaluate(() => TC.dados.col('personagens').todas().length)) === 2 && await parado(M)), '(as duas fichas sobem, com os itens — tipos e níveis inclusive)');
    const d = await linha(M, 'Dain X');
    ok(d && d.ficha.itens[0].tipo === 'arma' && d.ficha.itens[0].niveis.length === 3 && d.ficha.itens[0].nv === 1 && d.ficha.itens[1].req === 'i:kat@2', 'no banco, a katana com o tipo e os três níveis, e a bainha que pede o Nv 2');
    await J.goto(t.base, { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    ok(await ate(async () => (await F.locator('#f_dono option').allInnerTexts()).join('|').includes('Dalmo')), '(o jogador entrou)');
    await F.locator('#lista .pc', { hasText: 'Dain X' }).click(); await w(300);
    await F.locator('#f_dono').selectOption({ label: 'Dalmo' }); await w(300);
    await F.locator('#lista .pc', { hasText: 'Capitão' }).click(); await w(300);
    await F.locator('#f_vis').check(); await w(300);
    await F.locator('#lista .pc', { hasText: 'Dain X' }).click(); await w(300);
    ok(await ate(async () => await parado(M)), '(o Dain X é do Dalmo; o Capitão, aberto a todos)');
  });

  await passo('o tipo novo, na mesa', async () => {
    await F.locator('#ficha [data-abaficha="bolsas"]').click(); await w(300);
    await F.locator('[data-ittipos]').click(); await w(300);
    await F.locator('.itjanela [data-jnovo]').fill('Lâminas espirituais'); await F.locator('.itjanela [data-jnovo]').press('Enter'); await w(300);
    await F.locator('.itjanela [data-jcancela]').first().click(); await w(200);
    ok(await ate(async () => { const v = await M.evaluate(() => { const d = TC.dados.col('documentos').pegar('fichas:cfg'); return d && d.dados && d.dados.v && d.dados.v.tiposItem; }); tipoId = v && v[0] && v[0].id; return !!v && v.length === 1 && v[0].nome === 'Lâminas espirituais' && await parado(M); }),
      'o tipo criado pelo mestre vai para a configuração da mesa (fichas:cfg)');
    await F.locator('[data-itemed="kat"]').click(); await w(300);
    await F.locator('[data-ittipo="kat"]').selectOption(tipoId); await w(300);
    await F.locator('[data-itemed="kat"]').click(); await w(200);
    ok(await ate(async () => (await linha(M, 'Dain X')).ficha.itens[0].tipo === tipoId && await parado(M)), 'a katana passa para o tipo novo (gravado na ficha)');
  });

  await passo('o jogador vê e sobe o nível', async () => {
    ok(await ate(async () => { G = await fichas(J); return G && (await G.locator('#lista .pc .nm').allInnerTexts()).join('|').includes('Dain X'); }), '(o jogador vê o Dain X)');
    await G.locator('#lista .pc', { hasText: 'Dain X' }).click(); await w(500, J);
    await G.locator('#ficha [data-abaficha="bolsas"]').click(); await w(300, J);
    ok(await ate(async () => (await G.locator('[data-itsec="' + tipoId + '"] [data-itcard="kat"]').count()) === 1 && /LÂMINAS ESPIRITUAIS/.test(await G.locator('[data-itsecbt="' + tipoId + '"]').innerText()), 15000),
      'para o jogador, a katana aparece na seção do tipo que o mestre criou ("Lâminas espirituais")');
    ok(await G.locator('[data-itarr="kat"]').count() === 1 && await G.locator('[data-ittipos]').count() === 0 && await G.locator('[data-itnv="kat"][data-d="1"]').isEnabled(), 'na ficha dele, o jogador arrasta e muda o nível (mas os tipos da mesa são com o mestre)');
    await G.locator('[data-itnv="kat"][data-d="1"]').click(); await w(500, J);
    ok(await ate(async () => { const k = (await linha(M, 'Dain X')).ficha.itens[0]; return k.nv === 2 && k.bonus.FOR === 4 && k.efeito === 'Corte gélido'; }), 'o Nv 2 grava na ficha (o espelho junto: FOR +4 e a passiva)');
    ok(await ate(async () => (await F.locator('[data-itcard="kat"] .itnv b').innerText()) === 'Nv 2' && !(await F.locator('[data-itcard="bai"].semfx').count())), 'o mestre vê o Nv 2 — e a bainha, que pede o Nv 2, passa a valer');
    let veio = false;
    try { await M.locator('#feed .rol', { hasText: 'Katana de gelo: Nv 1 → Nv 2' }).first().waitFor({ timeout: 12000 }); veio = true; } catch (e) { /* não chegou */ }
    ok(veio && /Dain X/.test(await M.locator('#feed .rol', { hasText: 'Katana de gelo: Nv 1 → Nv 2' }).first().innerText()), 'a mesa ao vivo fica sabendo: "Dain X · Katana de gelo: Nv 1 → Nv 2"');
  });

  await passo('só para consulta', async () => {
    await G.locator('#lista .pc', { hasText: 'Capitão' }).click(); await w(500, J);
    ok(await ate(async () => (await G.locator('.so-consulta').count()) === 1), '(a ficha do Capitão, para o jogador, é só para consulta)');
    ok(await G.locator('[data-itfil="t:escudo"]').isEnabled() && await G.locator('[data-itbusca]').isEnabled() && await G.locator('[data-itsecbt="arma"]').isEnabled(), 'os filtros, a busca e as seções continuam valendo');
    await G.locator('[data-itfil="t:escudo"]').click(); await w(200, J);
    ok(await G.locator('[data-itcard="esc"]').isVisible() && await G.locator('[data-itcard="esp"]').isHidden(), 'e filtram ("Escudos": só o escudo)');
    ok(await G.locator('[data-itarr]').count() === 0 && await G.locator('[data-itnv="lan"][data-d="1"]').isDisabled() && await G.locator('[data-itemed="esc"]').isDisabled(), 'sem a alça de arrastar; o ◂ ▸ e o "Editar", apagados');
  });

  await passo('limpar', async () => { await apagarMesaTela(M, nomeMesa); ok(true, '(a mesa de teste foi apagada)'); });
  const inesperados = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409)/.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 8).join('\n'));
  ok(inesperados.length === 0, 'sem erros no console');
  await t.close();
  end();
})();
