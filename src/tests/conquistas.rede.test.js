// Conquistas numa mesa de verdade (lote 117): o Bruno (mestre), o Dalmo e a Lia em aparelhos separados.
//   · o mestre abre a aba (grupo Mundo): as 40 de começo entram; libera uma épica para o Dalmo e uma comum para a Lia;
//   · o Dalmo vê o anúncio com o nome da épica; a Lia vê só "Dalmo conquistou uma conquista Épica!";
//   · na aba da Lia, a épica é "???" e, passando o mouse, só "Quem já ganhou: Dalmo";
//   · o banco: a Lia não lê o catálogo nem as conquistas do Dalmo, nem escreve a parte de todos.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  for (const [e, n] of [[c.mestre, 'Bruno'], [c.jog1, 'Dalmo'], [c.jog2, 'Lia']]) { const d = await t.device({ name: 'prep' + n }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, e, c.senha, n); await d.ctx.close(); }
  const seed = { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' };
  const M = (await t.device({ name: 'mestre', seed })).page, Dp = (await t.device({ name: 'dalmo', seed })).page, Lp = (await t.device({ name: 'lia', seed })).page;
  const w = ms => M.waitForTimeout(ms);
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await w(300); } };
  const quadro = async (p, re) => { for (let i = 0; i < 80; i++) { const f = p.frame({ url: re }); if (f) return f; await w(250); } return null; };
  for (const p of [M, Dp, Lp]) { await p.goto(t.base + '?debug', { waitUntil: 'load' }); }
  await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Conquistas E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let apagada = false;
  try {
    await loginTela(Dp, c.jog1, c.senha); await entrarMesaTela(Dp, codigo, 'Dalmo');
    await loginTela(Lp, c.jog2, c.senha); await entrarMesaTela(Lp, codigo, 'Lia');
    const uid = p => p.evaluate(() => TC.conta.usuario.id);
    const dalmo = await uid(Dp), lia = await uid(Lp);
    await M.waitForTimeout(1500);
    await M.locator('#modo-mundo').click(); await w(500); await M.locator('#tab-conquistas').click();
    let F = null, ultimo = '';
    ok(await ate(async () => { F = await quadro(M, /\/conquistas\//); return F && await F.locator('.cq').count() === 40; }, 40000), 'o mestre abre a aba: as 40 de começo');
    // libera a épica para o Dalmo
    const lib = async (id, nome) => {
      await F.locator('[data-cq="' + id + '"]').getByRole('button', { name: 'Liberar…' }).click();
      await F.locator('dialog select').selectOption({ label: nome });
      await F.locator('dialog').getByRole('button', { name: 'Liberar' }).click(); await w(300);
    };
    let o = '';
    for (let i = 0; i < 30 && !(o.includes('Lia') && o.includes('Dalmo')); i++) {
      try {
        await F.locator('[data-cq="cq_teceloes"]').getByRole('button', { name: 'Liberar…' }).click();
        o = (await F.locator('dialog option').allTextContents()).join(',');
        await F.locator('dialog').getByRole('button', { name: 'Cancelar' }).click();
      } catch (e) { o = 'erro: ' + e.message.slice(0, 200); }
      await w(800);
    }
    ok(o.includes('Lia') && o.includes('Dalmo') && !o.includes('Bruno'), 'o mestre escolhe entre os jogadores (sem ele): ' + o);
    await lib('cq_teceloes', 'Dalmo');
    const banner = p => p.locator('.cqan');
    ok(await ate(async () => /Você conquistou: Os Fios do Reino!/.test(await banner(Dp).innerText()), 40000), 'o Dalmo vê o anúncio com o nome');
    ok(await ate(async () => /Dalmo conquistou uma conquista Épica!/.test(await banner(Lp).innerText()), 40000), 'a Lia vê só a raridade');
    ok(!/Fios/.test(await banner(Lp).innerText()), '(sem o nome)');
    if (process.env.FOTOS) { await Lp.screenshot({ path: process.env.FOTOS + '/l117-anuncio-lia.png' }); await Dp.screenshot({ path: process.env.FOTOS + '/l117-anuncio-dalmo.png' }); }
    await lib('cq_primeiro_sangue', 'Lia');
    ok(await ate(async () => /Lia conquistou: Primeiro Sangue!/.test(await banner(Dp).allInnerTexts().then(x => x.join(' '))), 40000), 'a comum: o Dalmo vê inteira');
    // a aba da Lia
    await Lp.locator('#modo-mundo').click(); await w(500); await Lp.locator('#tab-conquistas').click();
    let FL = null;
    ok(await ate(async () => { FL = await quadro(Lp, /\/conquistas\//); return FL && await FL.locator('[data-cq="cq_teceloes"]').count() === 1; }, 40000), 'a Lia abre a aba');
    const cartaoL = FL.locator('[data-cq="cq_teceloes"]');
    ok(/\?\?\?/.test(await cartaoL.innerText()) && !/Fios/.test(await cartaoL.innerText()), 'a épica do Dalmo, para a Lia: ???');
    await cartaoL.hover(); await w(250);
    ok(/Quem já ganhou: Dalmo/.test(await cartaoL.locator('.dica').innerText()), 'passando o mouse: só quem ganhou');
    ok(await FL.locator('.cq.ganha', { hasText: 'Primeiro Sangue' }).count() === 1, 'a comum dela em "Minhas conquistas"');
    // o banco
    const mesa = await M.evaluate(() => TC.mesas.atual.id);
    const sd = await t.device({ name: 'sonda-lia' }); await sd.page.goto(t.base + 'src/tests/vazio.html'); await entrar(sd.page, c.jog2, c.senha, 'Lia');
    const S = sd.page;
    const vL = await S.evaluate(async mesa => { const r = await sb.from('documentos').select('id').eq('mesa_id', mesa).like('id', 'conq:%'); return r.error ? 'erro' : r.data.map(x => x.id).sort().join(','); }, mesa);
    ok(vL === ['conq:j:' + lia, 'conq:pub'].sort().join(','), 'no banco, a Lia lê só a parte de todos e as dela: ' + vL);
    const muda = await S.evaluate(async mesa => { const r = await sb.from('documentos').update({ dados: { v: 1, itens: [], log: [] } }).eq('mesa_id', mesa).eq('id', 'conq:pub').select('id'); return r.error ? 'recusado' : (r.data || []).length ? 'ok' : 'nada'; }, mesa);
    ok(muda !== 'ok', 'a Lia não escreve a parte de todos');
    const cria = await S.evaluate(async ([mesa, d]) => { const r = await sb.from('documentos').insert({ mesa_id: mesa, id: 'conq:j:' + d, dono_id: d, vis: 'mestre', dados: {} }); return r.error ? 'recusado' : 'ok'; }, [mesa, dalmo]);
    ok(cria !== 'ok', 'nem cria as conquistas de outro');
    await sd.ctx.close();
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|403|409)|Multiple GoTrueClient/i.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
