// Lote 67 (a sincronia: a volta da internet e os erros), numa mesa de verdade:
//   · sem internet, a mudança espera; quando a internet volta, ela sobe na hora (sem esperar a próxima tentativa);
//   · a aba fecha sem internet: a mudança fica guardada neste navegador e, ao abrir a mesa de novo, volta e sobe (com
//     o aviso), por cima do que o banco tem agora (as mudanças do estado se refazem, sem desfazer as dos outros);
//   · o que o banco recusa de vez (grande demais) não fica tentando para sempre: aviso, nada pendente, e a linha volta a
//     ser a do banco;
//   · gravar o mesmo conteúdo não sobe de novo.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await d.ctx.close(); }
  const dev = await t.device({ name: 'mestre', seed: { 'tinycats:aba': 'jornal', 'tinycats-tour': '1' } });
  let M = dev.page;
  const w = ms => new Promise(r => setTimeout(r, ms));
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await w(250); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const banco = (p, col, id) => p.evaluate(async ([col, id]) => { const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave); const r = await a.from(col).select('*').eq('mesa_id', TC.mesas.atual.id).eq('id', id).maybeSingle(); return r.data; }, [col, id]);

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Sinc 67 E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  let apagada = false;
  try {
    await M.evaluate(() => TC.dados.col('personagens').gravar('pc_a', { nome: 'Kaira', ficha: { nome: 'Kaira' }, estado: { rec: { hp: 50 } }, skills: {}, vis: 'mesa', ordem: 0 }));
    ok(await ate(() => M.evaluate(() => TC.dados.pendentes === 0)), '(o personagem sobe)');

    await passo('a internet volta', async () => {
      await dev.ctx.setOffline(true); await w(300);
      await M.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_a'); P.gravar('pc_a', { estado: Object.assign({}, l.estado, { rec: { hp: 41 } }) }); });
      await w(6000);                                           // (falha algumas vezes: a próxima tentativa fica para mais tarde)
      ok(await M.evaluate(() => TC.dados.pendentes > 0), 'sem internet, a mudança fica esperando');
      const t0 = Date.now();
      await dev.ctx.setOffline(false);
      ok(await ate(() => M.evaluate(() => TC.dados.pendentes === 0), 8000), 'a internet voltou: a mudança sobe na hora (em ' + Math.round((Date.now() - t0) / 1000) + ' s)');
      ok((await banco(M, 'personagens', 'pc_a')).estado.rec.hp === 41, '(e está no banco)');
    });

    await passo('a aba fecha sem internet', async () => {
      await dev.ctx.setOffline(true); await w(300);
      await M.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_a'); P.gravar('pc_a', { estado: Object.assign({}, l.estado, { rec: { hp: 33 }, fad: 2 }) }); });
      await w(1200);
      const guardada = await M.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('tinycats:fila:')).length);
      ok(guardada === 1, 'a mudança que não subiu fica guardada neste navegador');
      await M.close();
      await dev.ctx.setOffline(false);
      // enquanto isso, a vida muda no banco por outro caminho (outra pessoa): o "hp" de lá é outro, mas a fadiga não
      await w(26000);                                          // (a aba fechada para de dar sinal de vida)
      M = await dev.ctx.newPage();
      await M.goto(t.base + '?debug', { waitUntil: 'load' });
      ok(await ate(() => M.evaluate(() => !!(window.TC && TC.mesas && TC.mesas.atual)), 25000), '(a mesa abre de novo)');
      await M.evaluate(() => TC.dados.col('personagens').pronta);
      ok(await ate(() => M.evaluate(() => [...document.querySelectorAll('.toast')].some(x => /voltou e está subindo|voltaram e estão subindo/.test(x.textContent))), 8000), 'ao abrir de novo, o aviso de que a mudança voltou');
      ok(await ate(() => M.evaluate(() => TC.dados.pendentes === 0), 15000), '(e sobe)');
      const e = (await banco(M, 'personagens', 'pc_a')).estado;
      ok(e.rec.hp === 33 && e.fad === 2, 'a mudança que tinha ficado para trás chegou ao banco: ' + j(e));
      ok(await M.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('tinycats:fila:')).length) === 0, 'e a fila guardada foi esvaziada');
    });

    await passo('o que o banco recusa de vez', async () => {
      await M.evaluate(() => { TC.__recusas = []; TC.dados.on('recusado', (col, id, msg) => TC.__recusas.push(msg)); });
      await M.evaluate(() => TC.dados.col('documentos').gravar('t67:grande', { dados: { x: 'a'.repeat(1700000) }, vis: 'mestre' }));
      ok(await ate(() => M.evaluate(() => TC.__recusas.length > 0), 15000), 'o documento grande demais é recusado, com aviso: ' + j(await M.evaluate(() => TC.__recusas)));
      ok(await ate(() => M.evaluate(() => TC.dados.pendentes === 0), 8000), 'e não fica pendente para sempre');
      ok(await ate(() => M.evaluate(() => !TC.dados.col('documentos').pegar('t67:grande')), 8000), 'a linha volta a ser a do banco (que não tem esse documento)');
    });

    await passo('gravar igual', async () => {
      await M.evaluate(() => TC.dados.col('documentos').gravar('t67:igual', { dados: { a: 1 }, vis: 'mestre' }));
      ok(await ate(() => M.evaluate(() => TC.dados.pendentes === 0)), '(sobe)');
      await w(800);
      const r0 = (await banco(M, 'documentos', 't67:igual')).rev;
      await M.evaluate(() => TC.dados.col('documentos').gravar('t67:igual', { dados: { a: 1 } }));
      await w(1500);
      ok((await banco(M, 'documentos', 't67:igual')).rev === r0, 'gravar o mesmo conteúdo não sobe de novo (a revisão continua a mesma)');
    });

    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409|413)|Multiple GoTrueClient|Failed to fetch|ERR_INTERNET_DISCONNECTED|net::|realtime|Não deu para salvar/i.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
