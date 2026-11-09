// As bases numa mesa de verdade (lote 125): o Bruno (mestre), o Dalmo e a Lia.
//   · o mestre cria a casa do Kael (o personagem do Dalmo), um esconderijo do Kael em segredo e a casa do grupo;
//   · o banco: o Dalmo (dono) muda as provisões da casa dele, mas não o nível; a Lia, com o acampamento, muda a casa do
//     grupo (não o nível), mas não a casa do Kael; o esconderijo em segredo, a Lia nem vê;
//   · na tela do Dalmo, o seletor tem as bases que ele vê.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  for (const [e, n] of [[c.mestre, 'Bruno'], [c.jog1, 'Dalmo'], [c.jog2, 'Lia']]) { const d = await t.device({ name: 'prep' + n }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, e, c.senha, n); await d.ctx.close(); }
  const seed = { 'tinycats:aba': 'acampamento', 'tinycats-tour': '1', 'tinycats:testes-tudo-aberto': '1' };
  const M = (await t.device({ name: 'mestre', seed })).page, Dp = (await t.device({ name: 'dalmo', seed })).page;
  const w = ms => M.waitForTimeout(ms);
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await w(300); } };
  const quadro = async (p, re) => { for (let i = 0; i < 80; i++) { const f = p.frame({ url: re }); if (f) return f; await w(250); } return null; };
  for (const p of [M, Dp]) await p.goto(t.base + '?debug', { waitUntil: 'load' });
  await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Bases E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let apagada = false;
  try {
    await loginTela(Dp, c.jog1, c.senha); await entrarMesaTela(Dp, codigo, 'Dalmo');
    const sonda = async (e, n) => { const d = await t.device({ name: 'sonda-' + n }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, e, c.senha, n); return d; };
    const SL0 = await sonda(c.jog2, 'Lia');
    // a Lia entra pela tela também (para ser da mesa)
    const Lp = (await t.device({ name: 'lia', seed })).page; await Lp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(800); await loginTela(Lp, c.jog2, c.senha); await entrarMesaTela(Lp, codigo, 'Lia');
    const uid = p => p.evaluate(() => TC.conta.usuario.id);
    const dalmo = await uid(Dp), lia = await uid(Lp);
    const mesa = await M.evaluate(() => TC.mesas.atual.id);
    const SD = await sonda(c.jog1, 'Dalmo'), SM = await sonda(c.mestre, 'Bruno');
    const r0 = await SD.page.evaluate(async ([mesa, dono]) => { const r = await sb.from('personagens').insert({ mesa_id: mesa, id: 'pc_kael', nome: 'Kael', dono_id: dono, vis: 'mesa', ficha: {}, skills: {}, estado: {} }); return r.error ? r.error.message : 'ok'; }, [mesa, dalmo]);
    ok(r0 === 'ok', 'o Kael, personagem do Dalmo');
    // a Lia com o acampamento (permissão do mestre)
    const dar = await SM.page.evaluate(async ([mesa, quem]) => { const r = await sb.rpc('acamp_do_jogador', { p_mesa: mesa, p_usuario: quem, p_pode: true }); return r.error ? r.error.message : 'deu'; }, [mesa, lia]);
    ok(dar === 'deu', 'a Lia mexe no acampamento: ' + dar);
    await w(3000);
    // o mestre cria as bases pela aba Bases
    await M.locator('#modo-descanso').click().catch(() => {}); await w(300);
    await M.locator('#tab-acampamento').click();
    let F = null;
    ok(await ate(async () => { F = await quadro(M, /\/acampamento\//); return F && await F.evaluate(() => !!window.__acamp && __acamp.pronto && __acamp.papel === 'mestre' && !!__acamp.N); }, 40000), 'o mestre abre a aba Bases');
    ok(await ate(async () => (await F.evaluate(() => document.querySelector('#nb-dono') ? 1 : 0)) === 0 && await F.locator('#btNovaBase').isVisible()), 'com o botão “+ Base”');
    await ate(async () => (await F.evaluate(() => TC.dados.col('personagens').todas().length)) > 0);
    const ids = await F.evaluate(() => {
      const a = __acamp.criarBase({ tipo: 'casa', nome: 'Casa do Kael', dono: 'pc_kael' });
      const b = __acamp.criarBase({ tipo: 'esconderijo', esc: 'porao', nome: 'O porão do Kael', dono: 'pc_kael', segredo: true });
      const g = __acamp.criarBase({ tipo: 'casa', nome: 'A casa do grupo' });
      return { a, b, g };
    });
    const linhaBanco = (S, id) => S.page.evaluate(async ([mesa, id]) => { const r = await sb.from('documentos').select('id,dono_id,vis,dados').eq('mesa_id', mesa).eq('id', id).maybeSingle(); return r.error ? { erro: r.error.message } : r.data; }, [mesa, id]);
    const P = id => 'acampamento:base:' + id;
    ok(await ate(async () => { const a = await linhaBanco(SM, P(ids.a)), b = await linhaBanco(SM, P(ids.b)), g = await linhaBanco(SM, P(ids.g)); return a && b && g && a.dono_id === dalmo && a.vis === 'mesa' && b.vis === 'mestre' && b.dono_id === dalmo && g.dono_id === null && a.dados.tipo === 'casa' && b.dados.esc === 'porao'; }),
      'as três bases no banco: a casa do Kael (dono: o Dalmo), o porão em segredo e a casa do grupo');
    const muda = (S, id, mexer) => S.page.evaluate(async ([mesa, id, mexer]) => {
      const r0 = await sb.from('documentos').select('dados').eq('mesa_id', mesa).eq('id', id).maybeSingle();
      if (!r0.data) return 'não vê';
      const r = await sb.from('documentos').update({ dados: Object.assign({}, r0.data.dados, mexer) }).eq('mesa_id', mesa).eq('id', id).select('id');
      return r.error ? 'recusado: ' + r.error.message : (r.data || []).length ? 'ok' : 'nada';
    }, [mesa, id, mexer]);
    const prov = [{ id: 'pv1', nome: 'Pão', qtd: 3, ef: { conf: 0, san: 0, rec: 0 }, fx: [], todos: false }];
    ok(await muda(SD, P(ids.a), { provisoes: prov }) === 'ok', 'o Dalmo muda as provisões da casa dele');
    const nv = await muda(SD, P(ids.a), { nivel: 8 });
    ok(/recusado: Só o mestre/.test(nv), 'mas não o nível: ' + nv);
    ok(await muda(SL0, P(ids.g), { provisoes: prov }) === 'ok', 'a Lia (com o acampamento) muda a casa do grupo');
    ok(/recusado/.test(await muda(SL0, P(ids.g), { nivel: 3 })), 'mas não o nível dela');
    const lk = await muda(SL0, P(ids.a), { provisoes: [] });
    ok(lk !== 'ok', 'e não mexe na casa do Kael: ' + lk);
    ok((await linhaBanco(SL0, P(ids.b))) === null && !!(await linhaBanco(SD, P(ids.b))), 'o porão em segredo: a Lia não vê; o Dalmo vê');
    const vis = await SD.page.evaluate(async ([mesa, id]) => { const r = await sb.from('documentos').update({ vis: 'mesa' }).eq('mesa_id', mesa).eq('id', id).select('id'); return r.error ? 'recusado' : (r.data || []).length ? 'ok' : 'nada'; }, [mesa, P(ids.b)]);
    ok(vis !== 'ok', 'o Dalmo não tira o segredo (a visibilidade é do mestre)');
    // a tela do Dalmo: o seletor com as bases que ele vê, e ele mexe na casa dele
    await Dp.locator('#modo-descanso').click().catch(() => {}); await w(300); await Dp.locator('#tab-acampamento').click();
    let FD = null;
    const viu = await ate(async () => { FD = await quadro(Dp, /\/acampamento\//); return FD && await FD.evaluate(() => !!window.__acamp && __acamp.pronto && __acamp.listaBases().length === 4); }, 40000);
    ok(viu, 'o Dalmo vê o acampamento e as três bases');
    await FD.evaluate(id => __acamp.trocarBase(id), ids.a); await w(300);
    ok(await FD.evaluate(() => __acamp.camp.tipo === 'casa' && __acamp.edita() && __acamp.ajudante()), 'na casa dele, o Dalmo mexe (como dono)');
    for (const d of [SD, SM, SL0]) await d.ctx.close();
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } catch (e) { ok(false, 'falhou: ' + e.message); }
  finally { if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } } }
  await t.close();
  end();
})();
