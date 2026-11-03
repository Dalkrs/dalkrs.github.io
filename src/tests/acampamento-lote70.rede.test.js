// Lote 70, o Acampamento numa mesa de verdade (o mestre):
//   · Fogueira e Arrumar: na Fogueira, o painel fecha e a cena fica com a tela; em Arrumar, abre; lembrado;
//   · depois do descanso longo, "Como foi a noite entre eles?": um par por linha (Pior, Igual, Melhor), num cartão sobre
//     a cena; Registrar muda o Relacionamento dos dois lados, com um passo só de desfazer; Pular fecha.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
const ficha = (nome, extra) => Object.assign({ nome, raca: 'Humana', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 5, fonte: 'total' }, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 }, estaque: { a: '', b: '' }, habilidades: [], itens: [], notas: '',
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }] }, extra);
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', fechado: true, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = ms => M.waitForTimeout(ms);
  const quadro = async re => { for (let i = 0; i < 80; i++) { const f = M.frame({ url: re }); if (f) return f; await w(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await w(300); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const parado = () => M.evaluate(() => TC.dados.pendentes === 0);
  const rel = (de, para) => M.evaluate(([de, para]) => { const l = TC.dados.col('personagens').pegar(de), r = l && l.estado && l.estado.rels ? Object.values(l.estado.rels).find(x => x.alvo === para) : null; return r ? r.v : null; }, [de, para]);
  const foto = async nome => { if (process.env.FOTOS) await M.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Acamp 70 E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  let apagada = false;
  try {
    const eu = await M.evaluate(() => TC.conta.usuario.id);
    await M.evaluate(([f, eu]) => {
      const P = TC.dados.col('personagens'), sk = { arvores: [], pontos: {}, alocados: {} };
      P.gravar('pc_dain', { nome: 'Dain', ficha: Object.assign(JSON.parse(f), { nome: 'Dain' }), skills: sk, estado: { san: 60, conf: 40, rels: { r1: { alvo: 'pc_lia', nome: 'Lia', v: 20, o: 0 } } }, dono_id: eu, vis: 'mesa', ordem: 0 });
      P.gravar('pc_lia', { nome: 'Lia', ficha: Object.assign(JSON.parse(f), { nome: 'Lia' }), skills: sk, estado: { san: 90, conf: 70 }, dono_id: eu, vis: 'mesa', ordem: 1 });
    }, [j(ficha('x')), eu]);
    ok(await ate(parado), '(as fichas sobem)');
    await M.locator('#tab-acampamento').click();
    let A = null;
    ok(await ate(async () => { A = await quadro(/\/acampamento\//); return A && await A.evaluate(() => !!window.__acamp && __acamp.pronto && __acamp.papel === 'mestre' && __acamp.presentes().length === 2); }, 40000), 'o mestre abre o Acampamento, com os dois na roda');

    await passo('Fogueira e Arrumar', async () => {
      ok(await A.locator('#modoAcamp [data-mac="fogueira"]').getAttribute('aria-pressed') === 'true' && !(await A.locator('#side').isVisible()), 'começa na Fogueira: o painel fechado, a cena com a tela');
      await foto('l70-fogueira');
      await A.locator('#modoAcamp [data-mac="arrumar"]').click(); await w(300);
      ok(await A.locator('#side').isVisible(), 'Arrumar abre o painel');
      await A.locator('#modoAcamp [data-mac="fogueira"]').click(); await w(300);
      ok(!(await A.locator('#side').isVisible()) && await A.evaluate(() => localStorage.getItem('tinycats:acamp:modo')) === 'fogueira', 'e a Fogueira fecha (lembrado)');
    });

    await passo('a noite entre eles', async () => {
      await A.locator('#btLongo').click(); await w(500);
      await A.locator('#ds-ok').click(); await w(900);
      ok(await ate(() => A.locator('#noite').isVisible(), 6000), 'depois do descanso longo, o cartão “Como foi a noite entre eles?”');
      ok(j(await A.locator('#noite .noite-n').allInnerTexts()) === j(['Dain e Lia']), 'um par por linha: Dain e Lia');
      ok(await A.locator('#noite [data-v="0"]').getAttribute('aria-pressed') === 'true' && /Nada mudou/.test(await A.locator('#noite-ok').innerText()), 'de começo, Igual (nada muda)');
      await A.locator('#noite [data-v="1"]').click(); await w(150);
      ok(/1 par/.test(await A.locator('#noite-ok').innerText()), 'Melhor: “Registrar a noite (1 par)”');
      await foto('l70-noite');
      await A.locator('#noite-ok').click(); await w(400);
      ok(await ate(async () => (await rel('pc_dain', 'pc_lia')) === 21 && (await rel('pc_lia', 'pc_dain')) === 1 && await parado()), 'o Relacionamento dos dois lados sobe 1 (Dain → Lia 21; Lia → Dain 1)');
      const toast = A.locator('.toast', { hasText: 'A noite ficou registrada' });
      ok(await toast.count() === 1, 'com o aviso e o Desfazer');
      await toast.locator('button').click(); await w(400);
      ok(await ate(async () => (await rel('pc_dain', 'pc_lia')) === 20 && await parado()), 'Desfazer volta o Relacionamento do Dain (20)');
      // outra noite: Pular
      await A.locator('#btLongo').click(); await w(500);
      await A.locator('#ds-ok').click(); await w(900);
      ok(await ate(() => A.locator('#noite').isVisible(), 6000), '(a pergunta volta a cada descanso longo)');
      await A.locator('#noite-pular').click(); await w(200);
      ok(!(await A.locator('#noite').count()) && (await rel('pc_dain', 'pc_lia')) === 20, 'Pular fecha sem mudar nada');
    });

    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409)|Multiple GoTrueClient/i.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
