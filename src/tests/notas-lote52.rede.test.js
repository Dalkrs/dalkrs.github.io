// Lote 52, numa mesa (TC_LOCAL=… no banco local, com o SQL 0032): o bloco de notas de quem joga.
// Três contas: o mestre (Bruno) e dois jogadores (Dalmo e Visitante).
//   · o jogador tem o botão e dois cadernos: “Meu caderno” (ele e o mestre leem) e “Do grupo” (todos leem e escrevem);
//   · o caderno dele é “notasj:<uid>:<id>”, vis mestre, com ele como dono — o outro jogador não recebe do banco;
//   · o mestre lê o caderno de cada jogador em “Dos jogadores”, só para ler;
//   · o caderno do grupo: um jogador escreve, o outro lê e muda, e a mudança chega ao primeiro e ao mestre;
//   · o personagem de cada capítulo (e o filtro); apagar e desfazer (o jogador não apaga a linha: marca);
//   · a busca rápida do jogador acha o capítulo dele e o do grupo — e nunca as notas do mestre.
const { start, checker, espiarBanco } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
(async () => {
  const t = await start({ net: true });
  const c = contas();
  let ids = {};
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); const m = await entrar(d.page, c.mestre, c.senha, 'Bruno'), a = await entrar(d.page, c.jog1, c.senha, 'Dalmo'), jj = await entrar(d.page, c.jog2, c.senha, 'Visitante'); ids = { m: m.uid, a: a.uid, j: jj.uid }; await d.ctx.close(); }
  const novo = async (name, o) => { const d = await t.device(Object.assign({ name, seed: { 'tinycats:aba': 'jornal', 'tinycats-tour': '1' } }, o)); await espiarBanco(d.ctx); d.page.setDefaultTimeout(15000); return d.page; };
  const M = await novo('mestre', { w: 1400, h: 900 }), A = await novo('dalmo', { w: 1400, h: 900 }), J = await novo('visitante');
  const w = (ms, p) => (p || A).waitForTimeout(ms);
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await new Promise(r => setTimeout(r, 300)); } };
  const foto = async (p, nome) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await p.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const doBanco = (p, pre) => p.evaluate(async ([mesa, pre]) => ((await window.__sb.from('documentos').select('id,vis,dono_id,apagado,dados').eq('mesa_id', mesa).like('id', pre + '%')).data || []).filter(x => !x.apagado), [mesa, pre]);
  const caps = p => p.locator('.nt-cap b').allInnerTexts();
  const escrever = async (p, tit, txt) => { await p.locator('#nt-novo').click(); await w(300, p); await p.locator('#nt-tit').fill(tit); await p.locator('#nt-texto').click(); await p.keyboard.type(txt); await w(1300, p); };
  let mesa = null;
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await loginTela(M, c.mestre, c.senha);
  const codigo = await criarMesaTela(M, 'Notas 52 ' + Date.now().toString(36));
  mesa = await M.evaluate(() => TC.mesas.atual.id);
  try {
    for (const [p, email, nome] of [[A, c.jog1, 'Dalmo'], [J, c.jog2, 'Visitante']]) { await p.goto(t.base + '?debug', { waitUntil: 'load' }); await loginTela(p, email, c.senha); await entrarMesaTela(p, codigo, nome); }
    // um personagem do Dalmo e uma nota do mestre (que ninguém mais pode ver)
    const pc = await M.evaluate(async ([mesa, dono]) => { const r = await window.__sb.from('personagens').insert({ mesa_id: mesa, id: 'pc_dain52', nome: 'Dain', dono_id: dono, vis: 'mesa', ficha: { nome: 'Dain' } }); return r.error ? r.error.message : 'ok'; }, [mesa, ids.a]);
    ok(pc === 'ok', '(o Dalmo ganha o personagem Dain: ' + pc + ')');
    await M.evaluate(() => TC.dados.col('documentos').gravar('notas:seg52', { dados: { v: 1, t: 'Segredo do mestre', tags: [], html: 'O barão trai.', ord: 1 }, vis: 'mestre' }));
    await w(1500, M);

    await passo('o caderno do jogador', async () => {
      ok(await A.locator('#btnNotas').isVisible(), 'o jogador tem o botão do bloco de notas');
      await A.locator('#btnNotas').click(); await w(400);
      ok(j(await A.locator('.nt-cad').allInnerTexts()) === j(['Meu caderno', 'Do grupo']), 'dois cadernos: o dele e o do grupo (sem “Dos jogadores”)');
      ok(/você e o mestre veem/.test(await A.locator('#nt-so').innerText()) && /O seu caderno está vazio/.test(await A.locator('#notas').innerText()), 'o dele diz quem lê e abre com o convite');
      ok(await ate(async () => (await A.locator('#nt-pc option').count()) === 2), 'o filtro de personagem, com o Dain');
      await escrever(A, 'Suspeitas', 'O ferreiro mente sobre o mapa.');
      ok(await A.locator('#nt-cappc').inputValue() === 'pc_dain52', 'com um personagem só, o capítulo já nasce com ele');
      let l = null;
      ok(await ate(async () => { const ls = await doBanco(A, 'notasj:'); l = ls[0]; return ls.length === 1 && /mente sobre o mapa/.test(l.dados.html); }), 'salva sozinho no banco');
      ok(l && l.id.startsWith('notasj:' + ids.a + ':') && l.vis === 'mestre' && l.dono_id === ids.a && l.dados.pc === 'pc_dain52', 'como “notasj:<uid>:…”, vis mestre, com ele como dono e o personagem: ' + j(l && { id: l.id, vis: l.vis, pc: l.dados.pc }));
      ok((await doBanco(J, 'notasj:')).length === 0, 'o outro jogador não recebe o caderno dele do banco');
      ok((await doBanco(A, 'notas:')).length === 0, 'e o jogador não lê as notas do mestre');
      const intruso = await J.evaluate(async ([mesa, outro]) => { const r = await window.__sb.from('documentos').insert({ mesa_id: mesa, id: 'notasj:' + outro + ':x', vis: 'mestre', dono_id: outro, dados: { t: 'x' } }); return r.error ? 'recusado' : 'aceito'; }, [mesa, ids.a]);
      ok(intruso === 'recusado', 'ninguém cria no caderno de outro: ' + intruso);
      await foto(A, 'l52-caderno-jogador');
    });

    await passo('o mestre lê', async () => {
      await M.locator('#btnNotas').click(); await w(400);
      ok(j(await M.locator('.nt-cad').allInnerTexts()) === j(['Meu caderno', 'Do grupo', 'Dos jogadores']), 'o mestre tem também “Dos jogadores”');
      ok(j(await caps(M)) === j(['Segredo do mestre']), 'no caderno dele, as notas dele');
      await M.locator('.nt-cad[data-cad="jog"]').click(); await w(400);
      await M.locator('#nt-jog').selectOption(ids.a); await w(400);
      ok(await ate(async () => j(await caps(M)) === j(['Suspeitas'])), 'em “Dos jogadores”, o caderno do Dalmo');
      ok(await M.locator('#nt-novo').count() === 0 && await M.locator('#nt-texto').getAttribute('contenteditable') === 'false' && await M.locator('#nt-apagar').count() === 0 && /só para ler/.test(await M.locator('#nt-so').innerText()), 'só para ler: sem “+ Capítulo”, sem editar, sem apagar');
      await foto(M, 'l52-mestre-le');
    });

    await passo('o caderno do grupo', async () => {
      await A.locator('.nt-cad[data-cad="grupo"]').click(); await w(400);
      ok(/o grupo todo vê e escreve/.test(await A.locator('#nt-so').innerText()), 'o do grupo diz que todos veem e escrevem');
      await escrever(A, 'Pistas da cripta', 'A chave está com o coveiro.');
      let g = null;
      ok(await ate(async () => { const ls = await doBanco(A, 'notasg:'); g = ls[0]; return ls.length === 1 && /coveiro/.test(g.dados.html); }), 'salva como “notasg:…”, vis mesa: ' + j(g && { id: g.id, vis: g.vis }));
      await J.locator('#btnNotas').click(); await w(400);
      await J.locator('.nt-cad[data-cad="grupo"]').click(); await w(400);
      ok(await ate(async () => j(await caps(J)) === j(['Pistas da cripta'])), 'o outro jogador vê o capítulo do grupo');
      ok(/por Dalmo/.test(await J.locator('.nt-cap').first().innerText()), 'com quem escreveu');
      await J.locator('#nt-texto').click(); await J.keyboard.press('End'); await J.keyboard.type(' E o coveiro tem medo de fogo.'); await w(1500, J);
      ok(await ate(async () => { const ls = await doBanco(J, 'notasg:'); return ls.length === 1 && /medo de fogo/.test(ls[0].dados.html) && ls[0].dono_id === ids.a; }), 'ele muda o texto do capítulo do outro (o dono continua o mesmo)');
      ok(await ate(async () => /medo de fogo/.test(await A.locator('#nt-texto').innerText()), 25000), 'a mudança chega a quem escreveu primeiro');
      await M.locator('.nt-cad[data-cad="grupo"]').click(); await w(400);
      ok(await ate(async () => j(await caps(M)) === j(['Pistas da cripta']) && /medo de fogo/.test(await M.locator('#nt-texto').innerText())), 'e o mestre lê o caderno do grupo');
      await foto(J, 'l52-caderno-grupo');
    });

    await passo('apagar e desfazer', async () => {
      await A.locator('.nt-cad[data-cad="meu"]').click(); await w(400);
      await A.locator('#nt-apagar').click(); await w(250);
      await A.locator('dialog[open] .btn.per').click(); await w(800);
      ok(await ate(async () => (await A.locator('.nt-cap').count()) === 0), 'apagar: o capítulo sai da lista');
      ok(await ate(async () => { const ls = await doBanco(A, 'notasj:'); return ls.length === 1 && ls[0].dados.apagada === true && !ls[0].dados.html; }), 'no banco, fica marcado (sem o texto) — quem joga não apaga a linha');
      await A.locator('#toasts .toast', { hasText: 'saiu do bloco de notas' }).getByRole('button', { name: 'Desfazer' }).click(); await w(800);
      ok(await ate(async () => j(await caps(A)) === j(['Suspeitas']) && /mente sobre o mapa/.test(await A.locator('#nt-texto').innerText())), 'o Desfazer traz de volta, com o texto');
    });

    await passo('a busca rápida', async () => {
      await A.keyboard.press('Escape');
      await A.locator('#btnBusca').click(); await w(400);
      await A.keyboard.type('pistas da'); await w(800);
      const r = await A.locator('#dlg').innerText();
      ok(/Pistas da cripta/.test(r) && /Caderno do grupo/.test(r), 'acha o capítulo do grupo');
      await A.locator('#dlg input').first().fill('suspeitas'); await w(800);
      ok(/Suspeitas/.test(await A.locator('#dlg').innerText()), 'e o do caderno dele');
      await A.locator('#dlg input').first().fill('segredo do mestre'); await w(800);
      ok(!/Segredo do mestre/.test(await A.locator('#dlg').innerText()), 'nunca as notas do mestre');
      await A.keyboard.press('Escape');
    });
  } finally {
    const x = await M.evaluate(async mesa => { const r = await window.__sb.from('mesas').delete().eq('id', mesa).select('id'); return r.error ? r.error.message : (r.data || []).length; }, mesa).catch(e => String(e.message).split('\n')[0]);
    ok(x === 1, 'a mesa de teste é apagada no fim: ' + x);
  }
  const inesperados = t.errs.filter(e => !/WebSocket|realtime|ERR_|Failed to load resource/i.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 10).join('\n'));
  ok(inesperados.length === 0, 'sem erros inesperados no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
