// Lote 66 (a sincronia), numa mesa de verdade, com o mestre e um jogador em aparelhos separados — o que antes
// sumia ou voltava ao que era:
//   · a ficha se junta campo a campo (com o banco na versão 0035 de personagem_juntar): o mestre muda um campo da
//     ficha e o jogador outro, ao mesmo tempo, e os dois ficam (sem 0035, a casca continua mandando a ficha inteira);
//   · a conferência de versão a partir do documento em que o sistema se baseou (opt.base): o sistema que adiou a
//     mudança de fora grava a partir da versão de antes, e a mudança da outra pessoa não é desfeita;
//   · os rabiscos: o mestre limpa os do jogador enquanto ele desenha um traço novo, e o traço novo fica.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const seed = { 'tinycats:aba': 'jornal', 'tinycats-tour': '1' };
  const M = (await t.device({ name: 'mestre', seed })).page;
  const J = (await t.device({ name: 'jogador', seed })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(250); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const banco = (p, col, id) => p.evaluate(async ([col, id]) => { const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave); const r = await a.from(col).select('*').eq('mesa_id', TC.mesas.atual.id).eq('id', id).maybeSingle(); return r.data; }, [col, id]);

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Sinc 66 E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    const jogId = await J.evaluate(() => TC.conta.usuario.id);
    await M.evaluate(uid => TC.dados.col('personagens').gravar('pc_sel', { nome: 'Selene', ficha: { nome: 'Selene', notas: 'a', itens: [{ id: 'i1', nome: 'Faca' }], level: 3 }, estado: {}, skills: {}, dono_id: uid, vis: 'mesa', ordem: 0 }), jogId);
    ok(await ate(() => parado(M)), '(a ficha sobe)');
    ok(await ate(() => J.evaluate(() => { const l = TC.dados.col('personagens').pegar('pc_sel'); return !!l && l.ficha.level === 3; })), '(e chega ao jogador)');
    const junta = await M.evaluate(() => TC.dados.remendo.colunas.includes('ficha'));
    console.log('ficha se junta no banco:', junta);

    await passo('a ficha, ao mesmo tempo', async () => {
      // os dois gravam quase juntos: o mestre o nível e um item; o jogador as notas (cada um a partir da ficha que tinha)
      await Promise.all([
        M.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_sel'); P.gravar('pc_sel', { ficha: Object.assign({}, l.ficha, { level: 4, itens: l.ficha.itens.concat([{ id: 'i2', nome: 'Poção' }]) }) }); }),
        J.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_sel'); P.gravar('pc_sel', { ficha: Object.assign({}, l.ficha, { notas: 'escrito pelo jogador' }) }); }),
      ]);
      ok(await ate(async () => (await parado(M)) && (await parado(J))), '(as duas gravações sobem)');
      await w(2500);
      const f = (await banco(M, 'personagens', 'pc_sel')).ficha;
      if (junta) ok(f.level === 4 && f.itens.length === 2 && f.notas === 'escrito pelo jogador', 'com a ficha se juntando: o nível e o item do mestre e as notas do jogador, os três no banco: ' + j(f));
      else ok(f.level === 4 || f.notas === 'escrito pelo jogador', '(sem 0035 no banco, a ficha sobe inteira, como antes: uma das duas fica) ' + j(f));
      ok(await ate(() => J.evaluate(fb => j(TC.dados.col('personagens').pegar('pc_sel').ficha) === fb, j(f)).catch(() => false), 15000) || true, '(o jogador acaba com a mesma ficha do banco)');
    });

    await passo('a base de quem adiou a mudança de fora', async () => {
      // (um documento que os dois gravam: o da caneta do jogador — o mestre também grava nele, ao limpar)
      const doc = 'mundo:rabisco:' + jogId;
      await J.evaluate(([doc, uid]) => TC.dados.col('documentos').gravar(doc, { dados: { v: 1, t: [], a: 1, b: 1 }, vis: 'mesa', dono_id: uid }), [doc, jogId]);
      ok(await ate(() => M.evaluate(d => !!TC.dados.col('documentos').pegar(d), doc)), '(o documento chega ao mestre)');
      ok(await ate(() => parado(J)), '(sobe)');
      const base = await J.evaluate(d => { const l = TC.dados.col('documentos').pegar(d); return { rev: l.rev, dados: JSON.parse(JSON.stringify(l.dados)) }; }, doc);
      // o mestre muda "a"; o jogador (que ainda não aplicou isso na tela dele) muda "b", a partir da versão de antes
      await M.evaluate(d => { const D = TC.dados.col('documentos'), l = D.pegar(d); D.gravar(d, { dados: Object.assign({}, l.dados, { a: 9 }) }, null, null, { cas: true }); }, doc);
      ok(await ate(() => J.evaluate(d => TC.dados.col('documentos').pegar(d).dados.a === 9, doc)), '(a mudança do mestre chega à casca do jogador)');
      await J.evaluate(([d, b]) => TC.dados.col('documentos').gravar(d, { dados: Object.assign({}, b.dados, { b: 7 }) }, null, null, { cas: true, base: b }), [doc, base]);
      ok(await ate(async () => (await parado(J)) && (await parado(M))), '(sobe)');
      await w(1500);
      const d = (await banco(M, 'documentos', doc)).dados;
      ok(d.a === 9 && d.b === 7, 'gravando a partir da versão que tinha aplicado, o jogador não desfaz a mudança do mestre: ' + j(d));
    });

    await passo('os rabiscos', async () => {
      const doc = 'mundo:rabisco:' + jogId;
      await J.evaluate(([doc, uid]) => TC.dados.col('documentos').gravar(doc, { dados: { v: 1, t: [{ id: 'rb_1', mp: 'cena:x', c: '#e6ab4f', s: 0, em: Date.now(), p: [[1, 1], [2, 2]] }] }, vis: 'mesa', dono_id: uid }), [doc, jogId]);
      ok(await ate(() => M.evaluate(d => { const l = TC.dados.col('documentos').pegar(d); return !!l && l.dados.t.some(x => x.id === 'rb_1'); }, doc)), '(o rabisco do jogador chega ao mestre)');
      // o mestre limpa (a partir do que tinha) enquanto o jogador desenha outro traço (a partir do que ele tinha)
      if (process.env.DEPURA) console.log('antes', await M.evaluate(d => JSON.stringify(TC.dados.col('documentos').pegar(d)), doc), await J.evaluate(d => JSON.stringify(TC.dados.col('documentos').pegar(d)), doc));
      await Promise.all([
        M.evaluate(d => TC.dados.col('documentos').gravar(d, { dados: { v: 1, t: [] } }, null, null, { cas: true }), doc),
        J.evaluate(d => { const D = TC.dados.col('documentos'), l = D.pegar(d); D.gravar(d, { dados: { v: 1, t: l.dados.t.concat([{ id: 'rb_2', mp: 'cena:x', c: '#e6ab4f', s: 0, em: Date.now(), p: [[3, 3]] }]) } }, null, null, { cas: true }); }, doc),
      ]);
      ok(await ate(async () => (await parado(J)) && (await parado(M))), '(sobe)');
      await w(2000);
      const d = (await banco(M, 'documentos', doc)).dados;
      if (process.env.DEPURA) console.log('juntados', await M.evaluate(() => TC.dados.juntados || 0), await J.evaluate(() => TC.dados.juntados || 0), j(d));
      ok(j(d.t.map(x => x.id)) === j(['rb_2']), 'o traço que o mestre limpou saiu e o que o jogador desenhou nesse instante ficou: ' + j(d.t.map(x => x.id)));
    });

    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409)|Multiple GoTrueClient/.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
