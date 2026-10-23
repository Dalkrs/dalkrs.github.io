// Lote 16 numa mesa (rede): o mestre e um jogador.
//   (a equipe ativa e a inativa, que eram daqui, viraram as abas do elenco do lote 23: lote23.rede.test.js)
//   · a caixinha do grupo: o jogador põe e pega com os lapros da ficha dele (as duas pontas mudam juntas, pelo banco);
//     o mestre vê ao vivo, põe e tira sem ficha (achado, despesa) e com a ficha do jogador; o banco recusa o que não
//     vale (ficha de outro, lapros que não bastam, a caixinha sem ficha para quem não mestra); o grupo muda de nome e a
//     caixinha vai junto.
// (SO=caixa: só aquela parte — a mesa e as fichas, sempre.)
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const pc = (id, nome, lapros) => Object.assign(R.personagemPadrao(nome), { id, nome, level: 10, grupo: 'Heróis', recursos: [{ id: 'hp' + id, nome: 'HP', fml: '100' }], estado: lapros != null ? { lapros } : {} });
const local = JSON.stringify({ v: 1, cfg: R.cfgPadrao(),
  personagens: [pc('pc_dain', 'Dain X', 50), pc('pc_lia', 'Lia', 10), pc('pc_ogro', 'Ogro do pântano')],
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
  const fichas = async p => { for (let i = 0; i < 40; i++) { const f = p.frame({ url: /\/fichas\// }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 15000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* a moldura pode estar recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const linha = (p, nome) => p.evaluate(nome => { const l = TC.dados.col('personagens').todas().find(x => x.nome === nome); return l ? JSON.parse(JSON.stringify(l)) : null; }, nome);
  const caixa = (p, g, id) => p.evaluate(([g, id]) => { const d = TC.dados.col('documentos').pegar(id || 'fichas:caixa'); const x = d && d.dados && d.dados.v && d.dados.v.g; return x ? (g ? x[g] || null : x) : null; }, [g, id]);
  const toasts = f => f.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.textContent).join(' | '));
  const SO = process.env.SO || '';
  const passo = async (nome, fn, parte) => { if (parte && SO && parte !== SO) return; try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const aba = async (f, k, p) => { await f.locator('#ficha [data-abaficha="' + k + '"]').click(); await w(250, p); };
  const abrir = async (f, nome, p) => { await f.locator('#lista .pc', { has: f.locator('.nm', { hasText: new RegExp('^' + nome + '$') }) }).click(); await w(350, p); };
  const foto = async (p, nome, alvo) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await (alvo || p).screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  // arrastar pela alça (⠿) até cima de outro lugar da lista
  const arrastar = async (F, id, sobre, onde) => {
    const de = await F.locator(`#lista [data-grab="${id}"]`).boundingBox(), para = await F.locator(sobre).first().boundingBox();
    if (!de || !para) return 'sem onde pegar ou soltar: ' + j({ de, para });
    await M.mouse.move(de.x + de.width / 2, de.y + de.height / 2); await M.mouse.down();
    await M.mouse.move(de.x + de.width / 2, de.y + de.height / 2 + 6, { steps: 2 });
    await M.mouse.move(para.x + para.width / 2, para.y + para.height * (onde || 0.5), { steps: 12 });
    await w(150); await M.mouse.up(); await w(500);
    return null;
  };
  let F = null, G = null, nomeMesa = null;

  await passo('a mesa, as fichas e o jogador', async () => {
    await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
    await loginTela(M, c.mestre, c.senha);
    nomeMesa = 'Lote 16 ' + Date.now().toString(36);
    const codigo = await criarMesaTela(M, nomeMesa);
    ok(await ate(async () => { F = await fichas(M); return F && (await F.locator('.mesa-oferta').count()) === 1; }), '(a mesa oferece trazer as fichas do navegador)');
    await F.locator('#ofertaSim').click(); await w(800);
    ok(await ate(async () => (await M.evaluate(() => TC.dados.col('personagens').todas().length)) === 3 && await parado(M)), '(as três fichas sobem)');
    await J.goto(t.base, { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    ok(await ate(async () => (await F.locator('#f_dono option').allInnerTexts()).join('|').includes('Dalmo')), '(o jogador entrou)');
    await abrir(F, 'Dain X'); await F.locator('#f_dono').selectOption({ label: 'Dalmo' }); await w(300);
    await abrir(F, 'Lia'); await F.locator('#f_vis').check(); await w(300);
    await abrir(F, 'Dain X');
    ok(await ate(async () => await parado(M)), '(o Dain X é do Dalmo; a Lia, aberta a todos; o Ogro, só do mestre)');
    ok(await ate(async () => { G = await fichas(J); return G && (await G.locator('#lista .pc').count()) === 2; }), '(o jogador vê o Dain X e a Lia)');
  });


  await passo('a caixinha: o jogador põe e pega', async () => {
    await abrir(G, 'Dain X', J); await aba(G, 'bolsas', J);
    ok(await G.locator('#painelCaixa').count() === 1 && /Heróis/.test(await G.locator('#painelCaixa .cxg').innerText()) && (await G.locator('#cxTotal').innerText()) === '0', 'na aba Bolsas e itens do Dain, a caixinha do grupo Heróis: 0 lapros');
    ok(await G.locator('[data-cx="achado"]').count() === 0 && await G.locator('[data-cx="por"]').isDisabled(), 'o jogador não tem o "Achado" nem a "Despesa" (sem ficha, é com o mestre); sem quantia, os botões ficam apagados');
    await G.locator('#cx_q').fill('30'); await w(200, J);
    ok(/Pôr 30: Dain X fica com 20 \(tem 50\) · a caixinha, com 30\./.test(await G.locator('#cxPrev').innerText()) && /Pegar 30: a caixinha tem só 0\./.test(await G.locator('#cxPrev').innerText()) && await G.locator('[data-cx="pegar"]').isDisabled(), 'a conta aparece antes, botão por botão: ' + (await G.locator('#cxPrev').innerText()).replace(/\n/g, ' | '));
    await G.locator('#cx_nota').fill('para a pousada');
    await foto(J, 'l16-caixa-previa', G.locator('#painelCaixa'));
    await G.locator('[data-cx="por"]').click(); await w(600, J);
    ok(await ate(async () => { const l = await linha(M, 'Dain X'), x = await caixa(M, 'Heróis'); return l.estado.lapros === 20 && x && x.q === 30 && x.ext.length === 1 && x.ext[0].quem === 'Dain X' && x.ext[0].pc === 'pc_dain' && x.ext[0].q === 30 && x.ext[0].nota === 'para a pousada' && !x.ext[0].m; }),
      'pôs 30: na mesa, o Dain fica com 20 e a caixinha com 30, com a linha no extrato (quem, quanto, para quê)');
    ok(await ate(async () => (await G.locator('#cxTotal').innerText()) === '30' && (await G.locator('#f_lapros').inputValue()) === '20' && (await G.locator('#cx_q').inputValue()) === ''), 'na tela dele: a caixinha 30, os lapros 20, o campo limpo');
    ok(/Dain X pôs 30 lapros na caixinha do grupo \(agora 30\)/.test(await toasts(G)), 'o aviso: ' + await toasts(G));
    await G.locator('#cx_q').fill('10'); await w(150, J);
    await G.locator('[data-cx="pegar"]').click(); await w(600, J);
    ok(await ate(async () => { const l = await linha(M, 'Dain X'), x = await caixa(M, 'Heróis'); return l.estado.lapros === 30 && x.q === 20 && x.ext.length === 2 && x.ext[0].q === -10; }), 'pegou 10: o Dain com 30, a caixinha com 20');
    ok(await ate(async () => /Dain X pegou 10/.test(await G.locator('.cxext li').first().innerText())), 'o extrato mostra o mais novo em cima: ' + await G.locator('.cxext li').first().innerText());
    ok(await ate(async () => (await G.locator('.rschip.cxchip b').innerText()) === '20'), 'no resumo de cima, "Caixinha 20"');
    // a ficha da Lia, aberta a todos, mas não dele: só consulta
    await abrir(G, 'Lia', J);
    ok(await G.locator('#painelCaixa').count() === 1 && (await G.locator('#cxTotal').innerText()) === '20' && await G.locator('#cx_q').count() === 0 && /Só para consulta/.test(await G.locator('#painelCaixa').innerText()), 'na ficha da Lia (do grupo, aberta a todos), o jogador vê a caixinha, só para consulta');
    await abrir(G, 'Dain X', J);
  }, 'caixa');

  await passo('a caixinha: o que o banco recusa', async () => {
    const tenta = a => J.evaluate(async a => { try { await TC.dados.caixa('mover', a); return 'passou'; } catch (e) { return e.message; } }, a);
    ok(/Só com um personagem seu/.test(await tenta({ grupo: 'Heróis', pc: 'pc_lia', q: -5 })), 'pegar com a ficha da Lia (não é dele), pelo console: recusado');
    ok(/Só quem mestra as Fichas mexe na caixinha sem uma ficha/.test(await tenta({ grupo: 'Heróis', pc: null, q: 500 })), 'pôr sem ficha nenhuma (lapros do nada): recusado');
    ok(/A caixinha do grupo tem só 20 lapros/.test(await tenta({ grupo: 'Heróis', pc: 'pc_dain', q: -21 })), 'pegar mais do que a caixinha tem: recusado, com o quanto ela tem');
    ok(/Dain X tem só 30 lapros/.test(await tenta({ grupo: 'Heróis', pc: 'pc_dain', q: 31 })), 'pôr mais do que a ficha tem: recusado');
    ok(/não é desse grupo/.test(await tenta({ grupo: 'Vilões', pc: 'pc_dain', q: 1 })), 'pela caixinha de outro grupo: recusado');
    ok(await ate(async () => { const l = await linha(M, 'Dain X'), x = await caixa(M, 'Heróis'); return l.estado.lapros === 30 && x.q === 20 && x.ext.length === 2; }), 'nada mudou (nem a ficha, nem a caixinha, nem o extrato)');
  }, 'caixa');

  await passo('a caixinha: o mestre', async () => {
    await abrir(F, 'Lia'); await aba(F, 'bolsas');
    ok(await ate(async () => (await F.locator('#cxTotal').innerText()) === '20' && /Dain X pegou 10/.test(await F.locator('.cxext').innerText())), 'o mestre vê a caixinha do grupo ao vivo (20), com o extrato');
    await F.locator('#cx_q').fill('100'); await F.locator('#cx_nota').fill('o baú do ogro'); await w(150);
    await F.locator('[data-cx="achado"]').click(); await w(600);
    ok(await ate(async () => { const x = await caixa(M, 'Heróis'), l = await linha(M, 'Lia'); return x.q === 120 && x.ext[0].m === true && x.ext[0].quem === '' && x.ext[0].q === 100 && l.estado.lapros === 10; }), '"+ Achado" 100: só a caixinha recebe (120); a Lia continua com 10');
    ok(await ate(async () => /Achado: \+100 · o baú do ogro/.test(await F.locator('.cxext li').first().innerText())) && await ate(async () => (await G.locator('#cxTotal').innerText()) === '120'), 'no extrato, "Achado: +100 · o baú do ogro"; e o jogador vê 120');
    await F.locator('.toast button', { hasText: 'Desfazer' }).click(); await w(700);
    ok(await ate(async () => (await caixa(M, 'Heróis')).q === 20), 'o Desfazer tira o achado (20)');
    await abrir(F, 'Dain X'); await F.locator('#cx_q').fill('5'); await w(150);
    await F.locator('[data-cx="por"]').click(); await w(600);
    ok(await ate(async () => { const x = await caixa(M, 'Heróis'), l = await linha(M, 'Dain X'); return x.q === 25 && x.ext[0].m === true && x.ext[0].quem === 'Dain X' && l.estado.lapros === 25; }), 'com a ficha do jogador, o mestre também põe (fica marcado: pelo mestre)');
    ok(await ate(async () => /Dain X pôs 5 \(pelo mestre\)/.test(await G.locator('.cxext li').first().innerText())), 'o jogador vê a linha "(pelo mestre)"');
    await foto(M, 'l16-caixa-mestre', F.locator('#painelCaixa'));
    // o grupo muda de nome: a caixinha vai junto
    M.once('dialog', d => d.accept('Companhia'));
    await F.locator('#lista [data-gren="Heróis"]').click({ force: true }); await w(900);
    ok(await ate(async () => { const g = await caixa(M); return g && !g['Heróis'] && g.Companhia && g.Companhia.q === 25 && g.Companhia.ext.length === 5; }), 'renomeado o grupo para "Companhia": a caixinha vai junto (25, com o extrato)');
    ok(await ate(async () => /Companhia/.test(await G.locator('#painelCaixa .cxg').innerText()) && (await G.locator('#cxTotal').innerText()) === '25'), 'e o jogador vê a caixinha da Companhia');
  }, 'caixa');

  await passo('limpar', async () => { await apagarMesaTela(M, nomeMesa); ok(true, '(a mesa de teste foi apagada)'); });
  const inesperados = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409)/.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 8).join('\n'));
  ok(inesperados.length === 0, 'sem erros no console');
  await t.close();
  end();
})();
