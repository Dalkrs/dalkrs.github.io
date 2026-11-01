// Os mistérios numa mesa de verdade (banco local de ensaio, com os SQL 0032 e 0033): o mestre (Bruno), o Dalmo e a Ana.
//   · o Escudo, aba Mistérios: gerar um caso (assassinato) e guardar; abrir à mesa (o público e o mural); entregar uma
//     pista — que vai para as Pistas de quem joga, na vista Casos;
//   · o mural: o Dalmo arrasta um cartão e liga um fio; a Ana vê o fio; o mestre mostra um suspeito e anota uma resposta do
//     interrogatório, que o grupo vê;
//   · a Ana acusa; o mestre recebe o aviso e vê a acusação no caso; "Acertaram" — o grupo vê o veredito;
//   · a cena do crime: as Cenas do mestre geram a mansão com este caso, as marcas de pista ligadas a ele; revelar uma marca
//     entrega a pista à mesa;
//   · o banco: quem joga não mexe no caso nem no público, mas mexe no mural.
const { start, checker, espiarBanco } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;

(async () => {
  const t = await start({ net: true });
  const c = contas();
  let ids = {};
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); const m = await entrar(d.page, c.mestre, c.senha, 'Bruno'), a = await entrar(d.page, c.jog1, c.senha, 'Dalmo'), b = await entrar(d.page, c.jog2, c.senha, 'Ana'); ids = { m: m.uid, a: a.uid, b: b.uid }; await d.ctx.close(); }
  const novo = async (name, w, hh) => { const d = await t.device({ name, w, h: hh, seed: { 'tinycats:aba': 'jornal', 'tinycats-tour': '1' } }); await espiarBanco(d.ctx); return d.page; };
  const M = await novo('mestre', 1500, 950), Dp = await novo('dalmo', 1440, 950), Ap = await novo('ana', 1300, 900);
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 40000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const foto = async (p, nome) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await p.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const doc = (p, id) => p.evaluate(async ([mesa, id]) => { const r = await window.__sb.from('documentos').select('id,vis,dono_id,apagado,dados').eq('mesa_id', mesa).eq('id', id).maybeSingle(); return r.data && !r.data.apagado ? r.data : null; }, [mesa, id]);
  const docs = (p, pre) => p.evaluate(async ([mesa, pre]) => ((await window.__sb.from('documentos').select('id,vis,apagado,dados').eq('mesa_id', mesa).like('id', pre + '%')).data || []).filter(x => !x.apagado), [mesa, pre]);
  let mesa = null, cid = null, E = null, culpado = null;

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Mistério E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  mesa = await M.evaluate(() => TC.mesas.atual.id);
  let apagada = false;
  try {
    for (const [p, email, nome] of [[Dp, c.jog1, 'Dalmo'], [Ap, c.jog2, 'Ana']]) { await p.goto(t.base + '?debug', { waitUntil: 'load' }); await loginTela(p, email, c.senha); await entrarMesaTela(p, codigo, nome); }

    await passo('o caso no Escudo', async () => {
      await M.locator('#tab-escudo').click();
      E = await quadro(M, /\/escudo\//);
      ok(await ate(() => E.evaluate(() => !!window.__escudo && window.__escudo.pronto)), '(o Escudo abre)');
      await E.locator('[data-k="aba:misterios"]').click(); await w(400);
      await E.locator('[data-k="mi:novo2"]').click(); await w(500);
      await E.locator('[data-k="mg:tipo:assassinato"]').click(); await w(300);
      ok(await E.locator('[data-k="mg:previa"]').isVisible() && /A morte /.test(await E.locator('[data-k="mg:previa"]').innerText()), 'o gerador mostra a prévia do caso');
      await E.locator('[data-k="mg:guardar"]').click(); await w(800);
      let cs = [];
      ok(await ate(async () => { cs = await docs(M, 'escudo:caso:'); return cs.length === 1; }), 'o caso é guardado no Escudo (escudo:caso:…)');
      cid = cs[0].id.slice('escudo:caso:'.length);
      culpado = cs[0].dados.suspeitos.find(s => s.culpado);
      ok(cs[0].vis === 'mestre' && cs[0].dados.pistas.length >= 9 && !!culpado, 'só o mestre o lê; as pistas e o culpado (' + (culpado && culpado.nome) + ')');
      ok((await doc(Dp, 'escudo:caso:' + cid)) === null, 'quem joga não recebe o caso do banco');
      await foto(M, 'l53-escudo-caso');
      await E.locator('[data-k="mc:abrir"]').click(); await w(800);
      ok(await ate(async () => { const p = await doc(M, 'escudo:mpub:' + cid), m = await doc(M, 'mural:' + cid); return p && p.vis === 'mesa' && m && m.vis === 'mesa'; }), 'abrir à mesa: o público e o mural (vis mesa)');
      const p1 = cs[0].dados.pistas.find(p => p.jeito === 'fisica' && !p.falsa);
      await E.locator('[data-k="mp:' + p1.id + ':entregar"]').click(); await w(800);
      ok(await ate(async () => { const p = await doc(M, 'escudo:mpub:' + cid); return p && p.dados.pistas.length === 1 && p.dados.pistas[0].txt === p1.txt; }), 'entregar: a pista vai para o público');
      const pub = await doc(Dp, 'escudo:mpub:' + cid);
      ok(pub && !JSON.stringify(pub.dados).includes(culpado.segredo.slice(0, 20)) && !('verdade' in pub.dados), 'quem joga lê o público — sem a verdade nem os segredos');
    });

    let P = null;
    await passo('o mural do grupo', async () => {
      ok(await ate(async () => Dp.locator('#tab-pistas').isVisible()), 'a aba Pistas aparece para quem joga (há um caso aberto)');
      await Dp.locator('#tab-pistas').click();
      P = await quadro(Dp, /\/pistas\//);
      ok(await ate(() => P.evaluate(() => window.__pistas && window.__pistas.vista === 'casos')), 'sem pistas soltas, a página abre nos casos');
      ok(await ate(async () => (await P.locator('.carta.pista').count()) === 1), 'o mural: o cartão da pista entregue');
      const card = P.locator('.carta.pista').first(), bb = await card.boundingBox();
      await Dp.mouse.move(bb.x + 60, bb.y + 40); await Dp.mouse.down(); await Dp.mouse.move(bb.x + 220, bb.y + 140, { steps: 8 }); await Dp.mouse.up(); await w(900, Dp);
      ok(await ate(async () => { const m = await doc(Dp, 'mural:' + cid); const k = m && Object.keys(m.dados.cartas)[0]; return k && m.dados.cartas[k].x > 150; }), 'arrastar o cartão grava no mural do grupo');
      // o mestre mostra um suspeito e anota uma resposta
      await E.locator('[data-k="ms:' + culpado.id + ':mostrar"]').click(); await w(500);
      await E.locator('[data-k="ms:' + culpado.id + ':resp"]').fill('Diz que estava em casa, mas tem barro nas botas.'); await E.locator('[data-k="ms:' + culpado.id + ':resp-ok"]').click(); await w(800);
      ok(await ate(async () => (await P.locator('.carta.suspeito').count()) === 1 && /barro nas botas/.test(await P.locator('[data-k="susp:' + culpado.id + '"]').innerText())), 'o suspeito mostrado e a resposta do interrogatório chegam ao grupo');
      // ligar com fio
      await P.locator('[data-k="caso:ligar"]').click(); await w(200);
      await P.locator('.carta.pista').first().click(); await w(200);
      await P.locator('.carta.suspeito').first().click(); await w(900);
      ok(await ate(async () => { const m = await doc(Dp, 'mural:' + cid); return m && Object.keys(m.dados.fios).length === 1; }), 'o fio entre a pista e o suspeito vai para o mural');
      await foto(Dp, 'l53-mural');
      await Ap.locator('#tab-pistas').click();
      const P2 = await quadro(Ap, /\/pistas\//);
      ok(await ate(async () => (await P2.locator('.mural .fio').count()) === 1, 60000), 'a Ana vê o fio que o Dalmo ligou');
      // a Ana acusa
      await P2.locator('[data-k="caso:acusar"]').click(); await w(300);
      await P2.locator('[data-k="acusar:' + culpado.id + '"]').check(); await P2.locator('[data-k="acusar:txt"]').fill('O barro nas botas é da cena do crime.');
      await P2.locator('[data-k="acusar:ok"]').click(); await w(900);
      ok(await ate(async () => { const m = await doc(Ap, 'mural:' + cid); return m && m.dados.acusacao && m.dados.acusacao.sid === culpado.id && m.dados.acusacao.por === 'Ana'; }), 'a acusação vai para o mural, assinada pela Ana');
      ok(/Esperando o mestre/.test(await P2.locator('[data-k="caso:pendente"]').innerText()), 'o grupo vê que espera o mestre');
    });

    await passo('o mestre confirma', async () => {
      ok(await ate(async () => /Ana acusou/.test(await M.locator('#toasts').innerText()), 60000), 'o mestre recebe o aviso da acusação');
      ok(await ate(async () => E.locator('[data-k="mc:acusacao"]').isVisible()), 'no caso, a acusação com “Acertaram” e “Não foi”');
      await E.locator('[data-k="mc:acertou"]').click(); await w(800);
      ok(await ate(async () => { const p = await doc(M, 'escudo:mpub:' + cid); return p && p.dados.veredito && p.dados.veredito.ok === true; }), 'o veredito vai para o público');
      const P = await quadro(Dp, /\/pistas\//);
      ok(await ate(async () => /Caso resolvido/.test(await P.locator('[data-k="caso:veredito"]').innerText()), 60000), 'o grupo vê que acertou');
      await foto(Dp, 'l53-veredito');
    });

    await passo('a cena do crime', async () => {
      await M.locator('#tab-cenas').click();
      const C = await quadro(M, /\/cenas\//);
      ok(await ate(() => C.evaluate(() => !!window.__tc && !!__tc.Store.scene() && __tc.Misterio.casos().length === 1)), '(as Cenas do mestre veem o caso do Escudo)');
      if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }
      await C.evaluate(id => { __tc.App.opt.genMist = true; __tc.App.opt.genMistCaso = id; __tc.Gerador.abrir('crime'); }, cid); await w(1200);
      ok(/A morte /.test(await C.locator('#ger-bl-mist .ger-bl-r').innerText()), 'o bloco Mistério com o caso do Escudo');
      await C.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click();
      ok(await ate(() => C.evaluate(() => !document.querySelector('.modal') && __tc.Store.scene().tokens.some(k => k.prop === 'pista'))), 'a mansão nasce com as marcas de pista');
      const marcas = await C.evaluate(() => __tc.Store.scene().tokens.filter(k => k.prop === 'pista').map(k => ({ id: k.id, m: k.mist, h: k.hidden })));
      ok(marcas.length >= 6 && marcas.every(x => x.m.c === cid && x.h), 'as marcas ligadas ao caso, ocultas — ' + marcas.length);
      ok(await ate(async () => { const cs = await doc(M, 'escudo:caso:' + cid); return cs && cs.dados.pistas.filter(p => p.cena).length === marcas.length; }), 'o caso sabe onde está cada marca');
      const cs = await doc(M, 'escudo:caso:' + cid), livre = marcas.find(x => !cs.dados.pistas.find(p => p.id === x.m.p).entregue);
      await C.evaluate(id => __tc.Misterio.revelar(__tc.Store.get('tokens', id)), livre.id); await w(800);
      ok(await ate(async () => { const p = await doc(M, 'escudo:mpub:' + cid); return p && p.dados.pistas.length === 2; }), 'revelar a marca entrega a pista à mesa');
      ok(await C.evaluate(id => __tc.Store.get('tokens', id).hidden === false, livre.id), 'e a marca aparece na cena');
      await foto(M, 'l53-cena-crime-mesa');
    });

    await passo('o banco', async () => {
      const r1 = await Dp.evaluate(async ([mesa, id]) => { const r = await window.__sb.from('documentos').update({ dados: { titulo: 'x' } }).eq('mesa_id', mesa).eq('id', id).select('id'); return r.error ? 'erro' : (r.data || []).length; }, [mesa, 'escudo:mpub:' + cid]);
      ok(r1 === 'erro' || r1 === 0, 'quem joga não muda o público do caso: ' + r1);
      const r2 = await Dp.evaluate(async ([mesa, id]) => { const r = await window.__sb.from('documentos').insert({ mesa_id: mesa, id, vis: 'mesa', dados: {} }); return r.error ? 'recusado' : 'aceito'; }, [mesa, 'mural:intruso']);
      ok(r2 === 'recusado', 'quem joga não cria murais: ' + r2);
    });
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|realtime|status of (400|401|403|409)|Failed to load resource/.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
