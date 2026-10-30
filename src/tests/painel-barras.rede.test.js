// Lote 44 numa mesa (rede): o painel de barras nas Cenas, com o mestre (Bruno) e um jogador (Dalmo).
//   · o Dain (do Dalmo: Samurai e Kitsune Selene, com a Bênção) e o Rastoroni (NPC do mestre, Orc Rastoroni), ligados
//     às fichas; a cena no ar;
//   · o mestre vê os selos nos dois tokens (o Dain: Postura e Geada; o Rastoroni: Frenesi), e não o painel do Dain;
//   · "Iniciar" leva as barras ao início (lote 34: a Postura a 0, a Geada a 4, o Frenesi a 6); no turno do Dain, o
//     painel abre para o Dalmo (as abas Postura e Geada de Selene, a Verdadeira Forma da Bênção); entrar na Postura
//     Alta (a primeira não custa) grava na ficha (estado.pb) e escreve na mesa ao vivo; o Ajuste + e o Desfazer mexem
//     no número da ficha, e o token do mestre acompanha;
//   · passar a vez: no turno do Rastoroni, o painel dele abre para o mestre; o do Dain vira moeda; um toque do mestre
//     ("Golpe sofrido") enche o Frenesi na ficha do NPC; de volta ao Dain, o painel abre de novo e "Somar" põe o +2 da
//     postura;
//   · Encerrar o combate: a Postura zera, a Geada volta ao início, o Frenesi também — com Desfazer;
//   · o jogador esconde o painel neste aparelho (e mostra de novo pelo painel do token);
//   · o mestre desliga o painel para a mesa: some para o jogador (e os selos, para o mestre).
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, codigoDaMesa, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
const SAM = 'azavpm5qd8', SEL = 'atehaqx1sg', BEN = 'aq0onsk37x', RAS = 'awbw94n05o';

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', w: 1440, h: 920, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1300, h: 880, seed: { 'tinycats:aba': 'cenas', 'tinycats-tour': '1' } })).page;
  M.setDefaultTimeout(12000); J.setDefaultTimeout(12000);
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re) => { for (let i = 0; i < 80; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const estado = id => M.evaluate(id => { const l = TC.dados.col('personagens').pegar(id); return l ? JSON.parse(JSON.stringify(l.estado || {})) : null; }, id);
  const foto = async (p, nome) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await p.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  // (se um passo para, as duas telas ficam numa foto, para ver o que tapou o clique)
  let nPasso = 0;
  const passo = async (nome, fn) => { nPasso++; try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); await foto(M, 'l44-parou-' + nPasso + '-mestre').catch(() => {}); await foto(J, 'l44-parou-' + nPasso + '-jogador').catch(() => {}); } };
  const avisos = () => C.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const feed = (p, re) => p.locator('#feed .rol', { hasText: re });

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Painel 44 E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  let apagada = false, C = null, B = null;
  const ids = {};
  try {
    await passo('a mesa, as fichas e a cena no ar', async () => {
      await M.locator('#tab-cenas').click();
      ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && !!__tc.Store.scene() && __tc.Nuvem.modo() === 'mestre' && __tc.Fichas.on()); }, 40000), '(o mestre abre as Cenas da mesa)');
      if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }
      const codigo = await codigoDaMesa(M);
      await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
      await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
      const jogId = await J.evaluate(() => TC.conta.usuario.id);
      await M.evaluate(([uid, SAM, SEL, BEN, RAS]) => {
        const R = TC.rules, P = TC.dados.col('personagens');
        const ficha = (id, nome, recs) => Object.assign(R.personagemPadrao(nome, id), { tier: 'C', level: 5, barrasArv: 1, recursos: [{ id: 'hp', nome: 'HP', fml: '100' }].concat(recs) });
        P.gravar('pc_dain', { nome: 'Dain', ficha: ficha('pc_dain', 'Dain', [{ id: 'ba_' + SAM, nome: 'Postura', fml: '20', comeca: '0', arvs: [SAM], cat: 'classe', comb: 'inicio' }, { id: 'ba_' + SEL, nome: 'Geada de Selene', fml: '20', comeca: '4', arvs: [SEL], cat: 'raca', comb: 'inicio' }]),
          skills: { arvores: [SAM, SEL, BEN], pontos: {}, alocados: {} }, estado: { rec: { ['ba_' + SAM]: 8, ['ba_' + SEL]: 6 } }, dono_id: uid, vis: 'mesa', ordem: 0 });
        P.gravar('pc_rast', { nome: 'Rastoroni', ficha: ficha('pc_rast', 'Rastoroni', [{ id: 'ba_' + RAS, nome: 'Frenesi', fml: '20', comeca: '6', arvs: [RAS], cat: 'raca', comb: 'inicio' }]),
          skills: { arvores: [RAS], pontos: {}, alocados: {} }, estado: { rec: { ['ba_' + RAS]: 14 } }, dono_id: null, vis: 'mesa', ordem: 1 });
      }, [jogId, SAM, SEL, BEN, RAS]);
      ok(await ate(async () => await parado(M) && await C.evaluate(id => __tc.Store.S.players.some(p => p.id === id) && !!__tc.Fichas.get('pc_dain') && !!__tc.Fichas.get('pc_rast'), jogId)), '(as fichas sobem; as Cenas do mestre veem o jogador e as fichas)');
      Object.assign(ids, await C.evaluate(() => {
        const u = __tc, sc = u.Store.scene();
        const a = u.newToken(sc, sc.cell * 4, sc.cell * 4, { name: 'Dain' }), b = u.newToken(sc, sc.cell * 8, sc.cell * 4, { name: 'Rast' });
        u.Store.tx('Criar tokens', () => { u.Store.add('tokens', a); u.Store.add('tokens', b); });
        u.Fichas.link(u.Store.get('tokens', a.id), 'pc_dain'); u.Fichas.link(u.Store.get('tokens', b.id), 'pc_rast');
        u.Act.turnPatch(x => { x.list = []; x.on = false; x.round = 1; x.cur = null; }, 'Limpar');
        u.Act.turnAdd([u.Store.get('tokens', a.id), u.Store.get('tokens', b.id)]);
        return { dain: a.id, rast: b.id };
      }));
      await C.locator('#airBtn').click(); await w(250);
      await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(400);
      ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && !__tc.Nuvem.semCena() && !!__tc.Store.get('tokens', id), ids.dain); }, 40000), '(o jogador vê a cena no ar, com o token do Dain)');
    });

    await passo('os selos do mestre', async () => {
      const s = await C.evaluate(() => { const o = {}; for (const [k, v] of __tc.PainelBarras._selos()) o[k] = [v.npc, v.partes.map(p => p.id + ':' + p.n)]; return o; });
      ok(j(s[ids.dain]) === j([false, ['samurai:8', 'selene:6']]) && j(s[ids.rast]) === j([true, ['rastoroni:14']]), 'o mestre tem o selo dos dois: o Dain (Postura 8, Geada 6) e o Rastoroni (Frenesi 14, NPC) — ' + j(s));
      ok(await C.locator('#pbHost .pb').count() === 0, 'fora do combate, o mestre não tem painel aberto (e nunca o do Dain)');
    });

    await passo('o turno do Dain', async () => {
      await C.evaluate(() => __tc.UI.openTab('turn')); await w(300);
      ok(await C.locator('#pb-ligado').isChecked(), 'na aba Turnos, "Painel de barras: Ligado" (o de começo)');
      await C.locator('#turnOnOff').click(); await w(600);
      if (await C.locator('.modal').count()) { await C.locator('.modal .btn', { hasText: /Agora não|Pular/ }).first().click().catch(() => {}); await w(300); }
      ok(await C.locator('#pbHost .pb:not(.moeda)').count() === 0, 'no turno do Dain, o mestre continua sem painel (o do Dain é do jogador)');
      ok(await ate(async () => (await B.locator('#pbHost .pb:not(.moeda)').count()) === 1 && /Dain/.test(await B.locator('#pbHost .pb-quem').innerText())), 'para o Dalmo, o painel do Dain abre no turno dele');
      const abas = await B.locator('#pbHost .pb-aba').allInnerTexts();
      ok(abas.length === 2 && /Postura\s*0/.test(abas[0]) && /Geada de Selene\s*4/.test(abas[1]), 'duas abas: Postura 0 e Geada de Selene 4 (o combate começou: as barras foram para o início) — ' + j(abas));
      await foto(J, 'l44-rede-jogador-turno');
      // a Postura Alta (a primeira do combate não custa)
      await B.locator('#pbHost [data-k="alta"]').click(); await w(500, J);
      ok(await ate(async () => { const e = await estado('pc_dain'); return e.pb && e.pb.samurai && e.pb.samurai.s.atual === 'alta' && e.rec['ba_' + SAM] === 0 && await parado(J); }), 'entrar na Postura Alta grava na ficha (estado.pb.samurai; a primeira não custa: a Postura continua 0) — ' + j((await estado('pc_dain')).pb));
      ok(await ate(async () => (await feed(M, /Dain entrou na Postura Alta/).count()) > 0, 20000), 'a mesa ao vivo recebe: "Dain entrou na Postura Alta."');
      // a Geada: o Ajuste + e o Desfazer
      await B.locator('#pbHost .pb-aba', { hasText: 'Geada de Selene' }).click(); await w(300, J);
      ok(/Verdadeira Forma/.test(await B.locator('#pbHost .pb-acoes').innerText()), 'na aba da Geada, a "Verdadeira Forma" (o Dain tem a Bênção de Selene)');
      await B.locator('#pbHost [data-a="__mais"]').click(); await w(500, J);
      ok(await ate(async () => (await estado('pc_dain')).rec['ba_' + SEL] === 5 && await C.evaluate(id => __tc.Store.get('tokens', id).bars.find(b => b.n === 'Geada de Selene').v, ids.dain) === 5), 'Ajuste +: a Geada vai a 5, na ficha e no token do mestre');
      await B.locator('#pbHost [data-a="__desfazer"]').click(); await w(500, J);
      ok(await ate(async () => (await estado('pc_dain')).rec['ba_' + SEL] === 4), 'Desfazer: a Geada volta a 4');
      await foto(J, 'l44-rede-jogador-geada');
    });

    await passo('o turno do Rastoroni', async () => {
      await C.locator('#turnNext').click(); await w(700);
      ok(await ate(async () => (await C.locator('#pbHost .pb:not(.moeda)').count()) === 1 && /Rastoroni/.test(await C.locator('#pbHost .pb-quem').innerText())), 'no turno do NPC, o painel do Rastoroni abre para o mestre');
      ok(await ate(async () => (await B.locator('#pbHost .pb.moeda').count()) === 1 && (await B.locator('#pbHost .pb:not(.moeda)').count()) === 0), 'para o Dalmo, o painel do Dain vira moeda');
      await C.locator('#pbHost .pb-chip', { hasText: 'Golpe sofrido' }).click(); await w(500);
      ok(await ate(async () => (await estado('pc_rast')).rec['ba_' + RAS] === 7 && await parado(M)), '"Golpe sofrido": o Frenesi vai de 6 a 7, na ficha do NPC — ' + (await estado('pc_rast')).rec['ba_' + RAS]);
      await foto(M, 'l44-rede-mestre-npc');
      await C.locator('#turnNext').click(); await w(700);
      ok(await ate(async () => (await C.locator('#pbHost .pb').count()) === 0), 'de volta ao Dain: o painel do NPC fecha para o mestre');
      ok(await ate(async () => (await B.locator('#pbHost .pb:not(.moeda)').count()) === 1), 'e o do Dain abre de novo para o Dalmo');
      await B.locator('#pbHost .pb-aba', { hasText: 'Postura' }).click(); await w(300, J);
      const somar = B.locator('#pbHost .pb-somar');
      ok(/Somar \+2 Postura/.test(await somar.innerText()), 'no começo do turno, "Somar +2 Postura" (em postura) — ' + await somar.innerText());
      await somar.click(); await w(500, J);
      ok(await ate(async () => (await estado('pc_dain')).rec['ba_' + SAM] === 2), '"Somar": a Postura vai a 2 — ' + (await estado('pc_dain')).rec['ba_' + SAM]);
    });

    await passo('encerrar o combate', async () => {
      // (antes, a Geada a 9 e o Frenesi a 12, para ver a volta ao início)
      await M.evaluate(([SEL, RAS]) => { const P = TC.dados.col('personagens'), d = P.pegar('pc_dain'), r = P.pegar('pc_rast');
        P.gravar('pc_dain', { estado: Object.assign({}, d.estado, { rec: Object.assign({}, d.estado.rec, { ['ba_' + SEL]: 9 }) }) });
        P.gravar('pc_rast', { estado: Object.assign({}, r.estado, { rec: Object.assign({}, r.estado.rec, { ['ba_' + RAS]: 12 }) }) }); }, [SEL, RAS]);
      ok(await ate(async () => await parado(M) && await C.evaluate(([a, b]) => __tc.Store.get('tokens', a).bars.find(x => x.n === 'Geada de Selene').v === 9 && __tc.Store.get('tokens', b).bars.find(x => x.n === 'Frenesi').v === 12, [ids.dain, ids.rast])), '(a Geada a 9 e o Frenesi a 12)');
      await C.evaluate(() => __tc.UI.openTab('turn')); await w(300);
      await C.locator('#turnOnOff').click(); await w(500);
      const tt = await avisos();
      ok(/Fim do combate no painel de barras: 2 personagens/.test(tt), 'o aviso, com Desfazer — ' + tt.slice(0, 240));
      ok(await ate(async () => { const d = await estado('pc_dain'), r = await estado('pc_rast'); return d.rec['ba_' + SAM] === 0 && d.rec['ba_' + SEL] === 4 && r.rec['ba_' + RAS] === 6 && d.pb.samurai.s.atual == null; }, 10000), 'Encerrar: a Postura zera (e sai da postura), a Geada volta a 4, o Frenesi a 6 — ' + j([(await estado('pc_dain')).rec, (await estado('pc_dain')).pb, (await estado('pc_rast')).rec]));
      await C.locator('.toast', { hasText: 'Fim do combate no painel' }).locator('button', { hasText: 'Desfazer' }).click(); await w(600);
      ok(await ate(async () => { const d = await estado('pc_dain'), r = await estado('pc_rast'); return d.rec['ba_' + SAM] === 2 && d.rec['ba_' + SEL] === 9 && r.rec['ba_' + RAS] === 12 && d.pb.samurai.s.atual === 'alta'; }), 'Desfazer: tudo volta (Postura 2 na Alta, Geada 9, Frenesi 12) — ' + j([(await estado('pc_dain')).rec, (await estado('pc_rast')).rec]));
    });

    await passo('o jogador esconde o dele', async () => {
      await C.evaluate(() => __tc.UI.openTab('turn')); await w(200);
      await C.locator('#turnOnOff').click(); await w(600);      // (começa de novo: o turno do Dain)
      if (await C.locator('.modal').count()) { await C.locator('.modal .btn', { hasText: /Agora não|Pular/ }).first().click().catch(() => {}); await w(300); }
      ok(await ate(async () => (await B.locator('#pbHost .pb:not(.moeda)').count()) === 1), '(o turno do Dain de novo: o painel aberto)');
      await B.locator('#pbHost [data-a="__esconder"]').click(); await w(300, J);
      ok(await B.locator('#pbHost .pb').count() === 0 && await B.evaluate(() => localStorage.getItem('tinycats:painel-barras:esconder')) === '1', 'o olho esconde o painel neste aparelho');
      await B.evaluate(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, ids.dain); await w(400, J);
      ok(!(await B.locator('#pb-mostrar').isChecked()), 'no painel do token dele, "Mostrar o painel neste aparelho" (desligado)');
      await B.locator('.sw', { has: B.locator('#pb-mostrar') }).click(); await w(400, J);
      ok(await B.locator('#pbHost .pb').count() === 1, 'ligar mostra de novo');
    });

    await passo('o mestre desliga para a mesa', async () => {
      await C.evaluate(() => __tc.UI.openTab('turn')); await w(300);
      await C.locator('.sw', { has: C.locator('#pb-ligado') }).click(); await w(500);
      ok(await C.evaluate(() => __tc.Store.S.prefs.painelBarras === false && __tc.PainelBarras._selos().size === 0), 'desligado: o mestre fica sem os selos');
      ok(await ate(async () => (await B.locator('#pbHost .pb').count()) === 0, 30000), 'e o painel some para o Dalmo (a escolha vai com a cena no ar)');
      await foto(J, 'l44-rede-desligado');
      await C.locator('.sw', { has: C.locator('#pb-ligado') }).click(); await w(500);
      ok(await ate(async () => (await B.locator('#pbHost .pb').count()) === 1, 30000), 'ligado de novo: o painel volta');
    });

    await ate(async () => await M.evaluate(() => TC.dados.pendentes === 0));
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409)/.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
