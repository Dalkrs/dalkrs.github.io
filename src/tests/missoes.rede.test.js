// Missões numa mesa de verdade (lote 123): o Bruno (mestre), o Dalmo e a Lia em aparelhos separados.
//   · os personagens do Dalmo (Kael) e da Lia (Mira) já tinham missões na ficha: quando o mestre abre a aba Missões,
//     elas vêm para cá (o quadro da mesa, o documento de cada personagem, com o jogador como dono);
//   · o mestre publica uma missão no quadro; o Dalmo pega com o Kael (pela tela); a Lia vê que saiu do quadro;
//   · o Dalmo desiste (volta ao quadro) e o mestre fica sabendo;
//   · o banco: a Lia muda o quadro (pegar), mas não lê nem escreve os rascunhos, não lê as missões do Kael e não cria
//     um quadro; o Dalmo muda as missões do Kael (desistir).
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
  const nomeMesa = 'Missões E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let apagada = false;
  try {
    await loginTela(Dp, c.jog1, c.senha); await entrarMesaTela(Dp, codigo, 'Dalmo');
    await loginTela(Lp, c.jog2, c.senha); await entrarMesaTela(Lp, codigo, 'Lia');
    const uid = p => p.evaluate(() => TC.conta.usuario.id);
    const dalmo = await uid(Dp), lia = await uid(Lp);
    const mesa = await M.evaluate(() => TC.mesas.atual.id);
    // as sondas (o banco direto, com a conta de cada um)
    const sonda = async (e, n) => { const d = await t.device({ name: 'sonda-' + n }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, e, c.senha, n); return d; };
    const SD = await sonda(c.jog1, 'Dalmo'), SL = await sonda(c.jog2, 'Lia');
    const criarPc = (S, id, nome, dono, mis) => S.page.evaluate(async ([mesa, id, nome, dono, mis]) => { const r = await sb.from('personagens').insert({ mesa_id: mesa, id, nome, dono_id: dono, vis: 'mesa', ficha: {}, skills: {}, estado: { mis } }); return r.error ? r.error.message : 'ok'; }, [mesa, id, nome, dono, mis]);
    ok(await criarPc(SD, 'pc_kael', 'Kael', dalmo, { a1: { t: 'Vingar o mestre', e: 'ativa', c: 5, o: { o1: { t: 'Achar a máscara', n: 0, ok: 1 } } } }) === 'ok'
      && await criarPc(SL, 'pc_mira', 'Mira', lia, { b1: { t: 'Achar a irmã', e: 'ativa', c: 6 } }) === 'ok', 'os personagens, com as missões de antes na ficha');
    await w(3500);
    // o mestre abre a aba Missões (modo Sessão)
    await M.locator('#modo-sessao').click(); await w(400);
    ok(await M.locator('#tab-missoes').count() === 1, 'a aba Missões, no modo Sessão');
    await M.locator('#tab-missoes').click();
    let F = null;
    ok(await ate(async () => { F = await quadro(M, /\/missoes\//); return F && await F.evaluate(() => !!window.__mis && window.__mis.mestre && !!window.__mis.quadro().mig); }, 40000), 'o mestre abre: o quadro nasce (e as de antes vêm)');
    const docBanco = (S, id) => S.page.evaluate(async ([mesa, id]) => { const r = await sb.from('documentos').select('id,dono_id,vis,dados').eq('mesa_id', mesa).eq('id', id).maybeSingle(); return r.error ? { erro: r.error.message } : r.data; }, [mesa, id]);
    const SM = await sonda(c.mestre, 'Bruno');
    ok(await ate(async () => { const d = await docBanco(SM, 'fichas:mis:pc:pc_kael'); return d && d.dono_id === dalmo && d.vis === 'mestre' && d.dados.ms.a1 && d.dados.ms.a1.t === 'Vingar o mestre'; }), 'a missão do Kael foi para o documento dele, com o Dalmo como dono');
    // publicar uma missão
    await F.locator('#btNova').click();
    await F.locator('#fTit').fill('Ratos no porão'); await F.locator('#fQuem').selectOption('um');
    await F.locator('#fPublicar').click(); await w(400);
    const rid = await F.evaluate(() => Object.keys(__mis.quadro().ms).find(k => __mis.quadro().ms[k].t === 'Ratos no porão'));
    ok(!!rid && await ate(async () => { const d = await docBanco(SM, 'fichas:mis:quadro'); return d && d.vis === 'mesa' && d.dados.ms[rid] && d.dados.ms[rid].e === 'oferta'; }), 'publicada no quadro (no banco)');
    // o Dalmo pega pela tela
    await Dp.locator('#modo-sessao').click(); await w(400); await Dp.locator('#tab-missoes').click();
    let FD = null;
    ok(await ate(async () => { FD = await quadro(Dp, /\/missoes\//); if (!FD) return false; const b = FD.locator('[data-aba="quadro"]'); if (await b.count()) await b.click(); return await FD.locator('.mc[data-mis="' + rid + '"]').count() === 1; }, 40000), 'o Dalmo vê a missão no quadro');
    ok(await FD.locator('#btNova').isHidden(), '(e não cria)');
    await FD.locator('.mc[data-mis="' + rid + '"]').click(); await w(200);
    await FD.locator('#mPegar').click(); await w(300);
    ok(await ate(async () => { const d = await docBanco(SM, 'fichas:mis:quadro'); return d && d.dados.ms[rid].e === 'ativa' && d.dados.ms[rid].pegas.pc_kael && d.dados.ms[rid].pegas.pc_kael.u === dalmo; }), 'pegou com o Kael: o banco aceitou');
    ok(await ate(async () => /Kael pegou “Ratos no porão”/.test((await F.locator('.toast').allInnerTexts()).join(' '))), 'o mestre fica sabendo');
    // o Dalmo vê as dele: a antiga e a nova
    await FD.locator('[data-aba="minhas"]').click(); await w(200);
    ok(await FD.locator('.mc[data-mis="a1"]').count() === 1 && await FD.locator('.mc[data-mis="' + rid + '"]').count() === 1, 'Minhas missões do Dalmo: a de antes e a que pegou');
    // desiste
    await FD.locator('.mc[data-mis="' + rid + '"]').click(); await FD.locator('#mDesistir').click(); await FD.locator('#mDesistirSim').click();
    ok(await ate(async () => { const d = await docBanco(SM, 'fichas:mis:quadro'); return d && d.dados.ms[rid].e === 'oferta'; }), 'desistiu: voltou para o quadro');
    ok(await ate(async () => /Kael desistiu de “Ratos no porão”/.test((await F.locator('.toast').allInnerTexts()).join(' '))), 'e o mestre fica sabendo');
    // a da história: o Dalmo desiste (é dono do documento do Kael)
    await FD.locator('.mc[data-mis="a1"]').click(); await FD.locator('#mDesistir').click(); await FD.locator('#mDesistirSim').click();
    ok(await ate(async () => { const d = await docBanco(SM, 'fichas:mis:pc:pc_kael'); return d && d.dados.ms.a1.e === 'falhou'; }), 'a da história: falhou (o banco aceitou)');
    // o banco, com a conta da Lia
    const quadroLia = await docBanco(SL, 'fichas:mis:quadro');
    ok(quadroLia && quadroLia.dados && quadroLia.dados.ms[rid], 'a Lia lê o quadro');
    const muda = await SL.page.evaluate(async ([mesa, rid]) => { const l = await sb.from('documentos').select('dados').eq('mesa_id', mesa).eq('id', 'fichas:mis:quadro').single(); const d = l.data.dados; d.ms[rid].e = 'ativa'; d.ms[rid].pegas = { pc_mira: { u: 'x', em: 1, e: 'ativa', ok: {} } }; const r = await sb.from('documentos').update({ dados: d }).eq('mesa_id', mesa).eq('id', 'fichas:mis:quadro').select('id'); return r.error ? 'recusado: ' + r.error.message : (r.data || []).length ? 'ok' : 'nada'; }, [mesa, rid]);
    ok(muda === 'ok', 'a Lia muda o quadro (pegar): ' + muda);
    const visao = await SL.page.evaluate(async mesa => { const r = await sb.from('documentos').select('id').eq('mesa_id', mesa).like('id', 'fichas:mis:%'); return r.error ? 'erro' : r.data.map(x => x.id).sort().join(','); }, mesa);
    ok(!/rasc/.test(visao) && !/pc_kael/.test(visao), 'a Lia não lê os rascunhos nem as missões do Kael: ' + visao);
    const vis = await SL.page.evaluate(async mesa => { const r = await sb.from('documentos').update({ vis: 'mestre' }).eq('mesa_id', mesa).eq('id', 'fichas:mis:quadro').select('id'); return r.error ? 'recusado' : (r.data || []).length ? 'ok' : 'nada'; }, mesa);
    ok(vis !== 'ok', 'nem esconde o quadro (a visibilidade é do mestre)');
    const cria = await SL.page.evaluate(async mesa => { const r = await sb.from('documentos').insert({ mesa_id: mesa, id: 'fichas:mis:quadro@outra', vis: 'mesa', dono_id: null, dados: {} }); return r.error ? 'recusado' : 'ok'; }, mesa);
    ok(cria !== 'ok', 'nem cria um quadro');
    const rasc = await SL.page.evaluate(async mesa => { const r = await sb.from('documentos').update({ dados: { v: 1, ms: {} } }).eq('mesa_id', mesa).eq('id', 'fichas:mis:rasc').select('id'); return r.error ? 'recusado' : (r.data || []).length ? 'ok' : 'nada'; }, mesa);
    ok(rasc !== 'ok', 'nem escreve os rascunhos');
    const kael = await SL.page.evaluate(async mesa => { const r = await sb.from('documentos').update({ dados: { v: 1, ms: {} } }).eq('mesa_id', mesa).eq('id', 'fichas:mis:pc:pc_kael').select('id'); return r.error ? 'recusado' : (r.data || []).length ? 'ok' : 'nada'; }, mesa);
    ok(kael !== 'ok', 'nem as missões do Kael');
    for (const d of [SD, SL, SM]) await d.ctx.close();
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } catch (e) { ok(false, 'falhou: ' + e.message); }
  finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  await t.close();
  end();
})();
