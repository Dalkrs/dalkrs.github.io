// O estado atual de um personagem (barras, moedas, bolsas…) mexido por duas pessoas ao mesmo tempo, no banco de verdade:
// o mestre e o jogador mudam coisas diferentes no mesmo instante e as duas ficam valendo; quem gravou sem ter visto
// a mudança do outro fica sabendo dela; e o que sai na hora de fechar a página também se junta.
const { start, checker, espiarBanco } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const dM = await t.device({ name: 'mestre', seed: { 'tinycats:aba': 'mundo' } }), M = dM.page;
  const dJ = await t.device({ name: 'jogador', seed: { 'tinycats:aba': 'mundo' } }), J = dJ.page;
  await espiarBanco(dM.ctx); await espiarBanco(dJ.ctx);
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const ate = async (fn, ms = 15000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* a página pode estar trocando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(250); } };
  const j = JSON.stringify;
  const ord = x => (Array.isArray(x) ? x.map(ord) : x && typeof x === 'object' ? Object.keys(x).sort().reduce((o, k) => { o[k] = ord(x[k]); return o; }, {}) : x);
  const igual = (a, b) => j(ord(a)) === j(ord(b));

  await M.goto(t.base, { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Estado E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  await J.goto(t.base, { waitUntil: 'load' }); await w(1200, J);
  await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
  const mesa = await M.evaluate(() => TC.mesas.atual.id), uidJ = await J.evaluate(() => TC.conta.usuario.id);

  // no banco, direto (pela conta do mestre, que vê tudo)
  const noBanco = id => M.evaluate(async ([mesa, id]) => { const r = await __sb.from('personagens').select('estado,rev,rev_ant,ficha,nome').eq('mesa_id', mesa).eq('id', id).maybeSingle(); return r.data; }, [mesa, id]);
  const espelho = (p, id) => p.evaluate(id => { const l = TC.dados.col('personagens').pegar(id); return l ? { estado: l.estado, rev: l.rev, nome: l.nome, ficha: l.ficha } : null; }, id);
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const esvaziar = p => p.evaluate(() => TC.dados.esvaziar(8000));

  // ---------- a ferramenta de "o que mudou" ----------
  const conta = await M.evaluate(() => {
    const R = TC.dados.remendo, a = { rec: { hp: 50, sp: 20 }, lapros: 10, rel: [1, 2], san: 80 }, b = { rec: { hp: 30, sp: 20, fe: 4 }, lapros: 10, rel: [1, 2, 3], conf: 5 };
    const d = R.diferenca(a, b);
    return { d, volta: R.aplicar(a, d), nada: R.diferenca(a, JSON.parse(JSON.stringify(a))), vazio: R.diferenca({}, {}), ordem: R.diferenca({ a: 1, b: 2 }, { b: 2, a: 1 }),
      junto: R.compor({ rec: { hp: 1 } }, { rec: { sp: 2 }, lapros: 3 }), naoDa: R.compor({ rec: null }, { rec: { hp: 1 } }), apaga: R.compor({ rec: { hp: 1 } }, { rec: null }),
      proto: Object.keys(R.aplicar({}, JSON.parse('{"__proto__":{"x":1},"a":1}'))), semTocar: (() => { const x = { rec: { hp: 1 } }; R.aplicar(x, { rec: { hp: 2 } }); return x.rec.hp; })() };
  });
  ok(igual(conta.d, { rec: { hp: 30, fe: 4 }, rel: [1, 2, 3], conf: 5, san: null }), 'a diferença traz só o que mudou (chave por chave; lista inteira; null no que saiu): ' + j(conta.d));
  ok(igual(conta.volta, { rec: { hp: 30, sp: 20, fe: 4 }, lapros: 10, rel: [1, 2, 3], conf: 5 }), 'aplicada sobre o de antes, dá o de depois: ' + j(conta.volta));
  ok(conta.nada === null && conta.vazio === null && conta.ordem === null, 'sem mudança não há diferença (nem a ordem das chaves conta)');
  ok(igual(conta.junto, { rec: { hp: 1, sp: 2 }, lapros: 3 }) && conta.naoDa === null && igual(conta.apaga, { rec: null }), 'duas mudanças seguidas viram uma só quando dá (apagar e depois pôr um objeto no lugar vai em duas)');
  ok(j(conta.proto) === '["a"]' && conta.semTocar === 1, 'aplicar não altera o que recebeu nem aceita "__proto__" como chave');

  // ---------- um personagem do jogador ----------
  const ficha = { nome: 'Tessa', raca: 'Humana', lado: 'Aliado', tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, recursos: [{ id: 'hp', nome: 'HP', fml: '100' }, { id: 'sp', nome: 'SP', fml: '40' }], itens: [], notas: 'x'.repeat(3000) };
  await M.evaluate(([ficha, uid]) => { TC.dados.col('personagens').gravar('pc_tessa', { nome: 'Tessa', ficha, skills: { arvores: [], pontos: {}, alocados: {} }, estado: { rec: { hp: 50, sp: 20 }, lapros: 10 }, dono_id: uid, vis: 'mestre', ordem: 0 }); }, [ficha, uidJ]);
  ok(await esvaziar(M), 'o mestre cria o personagem (nada pendente)');
  ok(await ate(async () => !!(await espelho(J, 'pc_tessa'))), 'o jogador recebe o personagem dele');
  const r0 = await noBanco('pc_tessa');
  ok(r0 && r0.rev_ant === null && igual(r0.estado, { rec: { hp: 50, sp: 20 }, lapros: 10 }), 'no banco: a linha nova não tem "revisão anterior" — ' + j(r0 && { rev: r0.rev, rev_ant: r0.rev_ant }));

  // ---------- os dois mexem no mesmo instante, cada um numa coisa ----------
  const muda = (p, fn) => p.evaluate(fn => { const P = TC.dados.col('personagens'), l = P.pegar('pc_tessa'); const e = JSON.parse(JSON.stringify(l.estado || {})); (new Function('e', fn))(e); P.gravar('pc_tessa', { estado: e }); }, fn);
  await Promise.all([muda(M, 'e.rec.hp = 30'), muda(J, 'e.rec.sp = 5')]);
  ok(await esvaziar(M) && await esvaziar(J), 'as duas gravações sobem');
  const r1 = await noBanco('pc_tessa');
  ok(igual(r1.estado, { rec: { hp: 30, sp: 5 }, lapros: 10 }), 'no banco ficam as DUAS mudanças (HP do mestre e SP do jogador): ' + j(r1.estado));
  ok(r1.rev_ant != null && r1.rev > r1.rev_ant, 'a linha guarda a revisão que tinha antes da última gravação');
  ok(await ate(async () => igual((await espelho(M, 'pc_tessa')).estado, r1.estado) && igual((await espelho(J, 'pc_tessa')).estado, r1.estado), 12000), 'e os dois aparelhos ficam com o mesmo estado do banco');

  // ---------- quem grava sem ter visto a mudança do outro ----------
  // (a leitura periódica do jogador fica presa: ele só fica sabendo da mudança do mestre pela resposta da própria gravação)
  let presas = 0;
  await dJ.ctx.route(/\/rest\/v1\/personagens\?.*rev=gt\./, async route => { presas++; await new Promise(r => setTimeout(r, 20000)); route.abort().catch(() => {}); });
  await w(3500, J);                                               // (uma leitura que já estivesse a caminho termina)
  await muda(M, 'e.rec.hp = 12; e.san = 77'); await esvaziar(M);
  await M.evaluate(async ([mesa, f]) => { const P = TC.dados.col('personagens'); P.gravar('pc_tessa', { ficha: Object.assign({}, f, { notas: 'mudou no mestre' }) }); await TC.dados.esvaziar(8000); }, [mesa, ficha]);
  const antesJ = await espelho(J, 'pc_tessa');
  ok(antesJ.estado.rec.hp === 30 && antesJ.ficha.notas !== 'mudou no mestre', 'o jogador ainda não viu o que o mestre fez (HP ' + antesJ.estado.rec.hp + ')');
  await muda(J, 'e.lapros = 99');
  ok(await esvaziar(J), 'o jogador grava as moedas');
  const r2 = await noBanco('pc_tessa');
  ok(igual(r2.estado, { rec: { hp: 12, sp: 5 }, lapros: 99, san: 77 }), 'no banco, a gravação do jogador não desfez nada do mestre: ' + j(r2.estado));
  ok(r2.ficha.notas === 'mudou no mestre', 'nem a ficha que o mestre tinha acabado de mudar');
  ok(await ate(async () => { const e = await espelho(J, 'pc_tessa'); return igual(e.estado, r2.estado) && e.ficha.notas === 'mudou no mestre' && e.rev === r2.rev; }, 6000), 'e o jogador fica sabendo do que o mestre fez pela resposta da própria gravação (sem esperar a leitura periódica): ' + j((await espelho(J, 'pc_tessa')).estado));
  ok(presas > 0, 'a leitura periódica do jogador estava mesmo presa (' + presas + ')');
  await dJ.ctx.unroute(/\/rest\/v1\/personagens\?.*rev=gt\./);

  // ---------- a mesma chave mexida pelos dois: vale a última ----------
  await muda(M, 'e.rec.hp = 40'); await esvaziar(M);
  await ate(async () => (await espelho(J, 'pc_tessa')).estado.rec.hp === 40, 12000);
  await muda(J, 'e.rec.hp = 41'); await esvaziar(J);
  ok((await noBanco('pc_tessa')).estado.rec.hp === 41, 'a mesma barra mudada pelos dois: fica a última gravação');

  // ---------- apagar uma chave e trocar uma lista ----------
  await muda(J, 'delete e.san; e.rel = [{ id: "r1", v: 5 }]; e.qtd = { p1: 3 }'); await esvaziar(J);
  const r3 = await noBanco('pc_tessa');
  ok(!('san' in r3.estado) && igual(r3.estado.rel, [{ id: 'r1', v: 5 }]) && igual(r3.estado.qtd, { p1: 3 }), 'chave apagada sai do banco; lista e mapa novos entram: ' + j(r3.estado));
  await ate(async () => igual((await espelho(M, 'pc_tessa')).estado, r3.estado), 12000);
  await Promise.all([muda(M, 'e.qtd.p2 = 1'), muda(J, 'e.qtd.p1 = 2')]);
  await esvaziar(M); await esvaziar(J);
  ok(igual((await noBanco('pc_tessa')).estado.qtd, { p1: 2, p2: 1 }), 'dentro de um mapa (as bolsas), cada item é uma chave: os dois valem — ' + j((await noBanco('pc_tessa')).estado.qtd));

  // ---------- muitas mudanças seguidas antes de subir ----------
  await J.evaluate(() => { const P = TC.dados.col('personagens'); for (let i = 1; i <= 30; i++) { const l = P.pegar('pc_tessa'), e = JSON.parse(JSON.stringify(l.estado)); e.lapros = 100 + i; e.rec.sp = i; P.gravar('pc_tessa', { estado: e }); } });
  await esvaziar(J);
  const r4 = await noBanco('pc_tessa');
  ok(r4.estado.lapros === 130 && r4.estado.rec.sp === 30 && r4.estado.rec.hp === 41, 'trinta mudanças seguidas chegam como a última: ' + j(r4.estado));

  // ---------- ao fechar a página, o que estava na fila também se junta ----------
  await ate(async () => igual((await espelho(M, 'pc_tessa')).estado, r4.estado), 12000);
  await muda(M, 'e.rec.hp = 7'); await esvaziar(M);
  await J.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_tessa'), e = JSON.parse(JSON.stringify(l.estado)); e.lapros = 5; P.gravar('pc_tessa', { estado: e, nome: 'Tessa da Saída' }); window.__sem = TC.dados.sair(); });
  ok(await J.evaluate(() => window.__sem) === 0, 'na saída, a linha foi mandada do jeito que sobrevive ao fechamento');
  ok(await ate(async () => { const r = await noBanco('pc_tessa'); return r.estado.lapros === 5 && r.nome === 'Tessa da Saída'; }), 'o que saiu no fechamento chegou (o estado e o nome, em dois pedidos)');
  const r5 = await noBanco('pc_tessa');
  ok(r5.estado.rec.hp === 7 && r5.estado.rec.sp === 30, 'e não desfez a barra que o mestre tinha acabado de mexer: ' + j(r5.estado));
  ok(await ate(() => parado(J)), 'depois da saída, nada fica pendente no aparelho do jogador');

  // ---------- quem não pode mexer na ficha não muda nada ----------
  await M.evaluate(() => { TC.dados.col('personagens').gravar('pc_npc', { nome: 'NPC', ficha: { nome: 'NPC' }, skills: {}, estado: { rec: { hp: 9 } }, dono_id: null, vis: 'mesa', ordem: 1 }); });
  await esvaziar(M);
  ok(await ate(async () => !!(await espelho(J, 'pc_npc'))), 'o jogador vê o NPC que o mestre abriu para a mesa');
  const tentativa = await J.evaluate(async mesa => { const r = await __sb.rpc('estado_juntar', { p_mesa: mesa, p_id: 'pc_npc', p_mudas: [{ rec: { hp: 1 } }] }); return { erro: r.error ? r.error.message : null, linhas: (r.data || []).length }; }, mesa);
  ok(!tentativa.erro && tentativa.linhas === 0 && (await noBanco('pc_npc')).estado.rec.hp === 9, 'o jogador não muda o estado de uma ficha que não é dele (nada volta, nada muda): ' + j(tentativa));
  const ruim = await J.evaluate(async mesa => { const a = await __sb.rpc('estado_juntar', { p_mesa: mesa, p_id: 'pc_tessa', p_mudas: [5] }), b = await __sb.rpc('estado_juntar', { p_mesa: mesa, p_id: 'pc_tessa', p_mudas: { rec: 1 } }); return [a.error && a.error.message, b.error && b.error.message]; }, mesa);
  ok(/inválida/.test(ruim[0] || '') && /inválida/.test(ruim[1] || ''), 'mudança que não é objeto (ou lista que não é lista) é recusada: ' + j(ruim));
  const anon = await M.evaluate(async mesa => { const guarda = window.__sb; const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave, { auth: { persistSession: false, storageKey: 'anon-estado' } }); window.__sb = guarda; const r = await a.rpc('estado_juntar', { p_mesa: mesa, p_id: 'pc_tessa', p_mudas: [{ lapros: 1 }] }); return r.error ? 'recusado' : 'ACEITO'; }, mesa);
  ok(anon === 'recusado' && (await noBanco('pc_tessa')).estado.lapros === 5, 'sem conta, a função nem roda');

  // ---------- a mudança do outro chega enquanto a daqui ainda está subindo ----------
  // (a gravação do jogador fica presa no caminho por alguns segundos; nesse meio-tempo a leitura periódica dele traz a do mestre)
  await ate(async () => igual((await espelho(J, 'pc_tessa')).estado, (await noBanco('pc_tessa')).estado) && igual((await espelho(M, 'pc_tessa')).estado, (await noBanco('pc_tessa')).estado), 12000);
  let seguradas = 0;
  await dJ.ctx.route(/\/rest\/v1\/rpc\/estado_juntar/, async route => { seguradas++; await new Promise(r => setTimeout(r, 7000)); route.continue().catch(() => {}); });
  await muda(J, 'e.lapros = 321');
  await w(1000, J);
  ok(seguradas === 1 && !(await parado(J)), 'a gravação do jogador saiu e ainda não voltou');
  await muda(M, 'e.rec.sp = 17'); await esvaziar(M);
  ok(await ate(async () => { const e = (await espelho(J, 'pc_tessa')).estado; return e.rec.sp === 17 && e.lapros === 321; }, 5500), 'a mudança do mestre chega nesse meio-tempo e a tela do jogador fica com as duas (o SP do mestre e as moedas dele): ' + j((await espelho(J, 'pc_tessa')).estado));
  ok(!(await parado(J)), '(a gravação do jogador continuava a caminho)');
  await dJ.ctx.unroute(/\/rest\/v1\/rpc\/estado_juntar/);
  ok(await ate(() => parado(J), 15000), 'a gravação do jogador chega');
  const r6 = await noBanco('pc_tessa');
  ok(r6.estado.rec.sp === 17 && r6.estado.lapros === 321, 'e no banco ficam as duas: ' + j(r6.estado));
  await w(4000, J);
  ok(igual((await espelho(J, 'pc_tessa')).estado, r6.estado) && (await espelho(J, 'pc_tessa')).rev === r6.rev, 'o jogador continua com o mesmo estado do banco depois que tudo assenta');

  // ---------- a mesma chave, e a resposta da gravação daqui que demora: vale a do banco (a última), também na tela ----------
  // (a gravação do jogador chega ao banco na hora, mas a resposta fica presa; o mestre muda a mesma coisa logo depois)
  let respostas = 0;
  await dJ.ctx.route(/\/rest\/v1\/rpc\/estado_juntar/, async route => { respostas++; const resp = await route.fetch(); await new Promise(r => setTimeout(r, 7000)); route.fulfill({ response: resp }).catch(() => {}); });
  await muda(J, 'e.lapros = 500');
  ok(await ate(async () => (await noBanco('pc_tessa')).estado.lapros === 500, 8000) && respostas === 1 && !(await parado(J)), 'a gravação do jogador chegou ao banco (500 moedas), e a resposta ainda não voltou');
  await ate(async () => (await espelho(M, 'pc_tessa')).estado.lapros === 500, 8000);
  await muda(M, 'e.lapros = 777'); await esvaziar(M);
  ok(await ate(async () => !(await parado(J)) && (await espelho(J, 'pc_tessa')).rev === (await noBanco('pc_tessa')).rev, 5500), 'a mudança do mestre (777) chega ao jogador antes da resposta da gravação dele');
  await dJ.ctx.unroute(/\/rest\/v1\/rpc\/estado_juntar/);
  ok(await ate(() => parado(J), 15000), 'a resposta chega');
  ok(await ate(async () => (await espelho(J, 'pc_tessa')).estado.lapros === 777, 6000) && (await noBanco('pc_tessa')).estado.lapros === 777, 'e a tela do jogador fica com o que está no banco (777, do mestre, que gravou por último) — não com o dele por cima: ' + j((await espelho(J, 'pc_tessa')).estado.lapros));

  // ---------- a ficha e o estado saem juntos (dois pedidos: o estado, depois a ficha); entre um e outro, o mestre mexe no estado ----------
  // (o pedido da ficha do jogador fica preso antes de chegar ao banco; o do estado passa)
  let fichasPresas = 0;
  await dJ.ctx.route(/\/rest\/v1\/personagens\?/, async route => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    fichasPresas++; await new Promise(r => setTimeout(r, 9000)); route.fallback();
  });
  const fichaJ = (await espelho(J, 'pc_tessa')).ficha;
  await J.evaluate(f => { const P = TC.dados.col('personagens'), l = P.pegar('pc_tessa'); const e = JSON.parse(JSON.stringify(l.estado || {})); e.rec.sp = 33; P.gravar('pc_tessa', { ficha: Object.assign({}, f, { notas: 'do jogador' }), estado: e }); }, fichaJ);
  ok(await ate(async () => { const b = await noBanco('pc_tessa'); return b.estado.rec.sp === 33 && b.ficha.notas !== 'do jogador'; }, 8000) && fichasPresas === 1 && !(await parado(J)), 'o estado do jogador chegou ao banco (SP 33); a ficha dele ainda está a caminho');
  await ate(async () => (await espelho(M, 'pc_tessa')).estado.rec.sp === 33, 8000);
  await muda(M, 'e.san = 55'); await esvaziar(M);
  ok((await noBanco('pc_tessa')).estado.san === 55 && !(await parado(J)), 'o mestre muda outra coisa do estado (Sanidade 55) enquanto a ficha do jogador ainda sobe');
  ok(await ate(async () => (await espelho(J, 'pc_tessa')).estado.san === 55, 6000), 'o jogador vê a mudança do mestre já, com a ficha dele ainda a caminho: ' + j((await espelho(J, 'pc_tessa')).estado));
  await ate(() => parado(J), 20000);
  await dJ.ctx.unroute(/\/rest\/v1\/personagens\?/);
  const rF = await noBanco('pc_tessa');
  ok(rF.ficha.notas === 'do jogador' && rF.estado.san === 55 && rF.estado.rec.sp === 33, 'no banco ficam a ficha do jogador, o SP dele e a Sanidade do mestre');
  ok(await ate(async () => { const e = await espelho(J, 'pc_tessa'); return igual(e.estado, rF.estado) && e.ficha.notas === 'do jogador' && e.rev === rF.rev; }, 8000), 'e a tela do jogador fica igual ao banco (a mudança do mestre não some): ' + j((await espelho(J, 'pc_tessa')).estado));

  // ---------- o mestre em dois aparelhos, gravando o mesmo documento: quem gravou por último não recebe de volta o que cobriu ----------
  const dM2 = await t.device({ name: 'mestre-2', seed: { 'tinycats:aba': 'mundo' } }), M2 = dM2.page;
  await M2.goto(t.base, { waitUntil: 'load' }); await w(1200, M2);
  await loginTela(M2, c.mestre, c.senha);
  await M2.locator('#m-lista button', { hasText: nomeMesa }).click();
  await M2.locator('#vivo').waitFor({ state: 'visible', timeout: 20000 });
  const docDe = p => p.evaluate(() => { const l = TC.dados.col('documentos').pegar('teste:doc'); return l ? { v: l.dados.v, rev: l.rev } : null; });
  await M.evaluate(() => { TC.dados.col('documentos').gravar('teste:doc', { dados: { v: 'zero' }, vis: 'mestre' }); });
  await esvaziar(M);
  ok(await ate(async () => { const d = await docDe(M2); return d && d.v === 'zero'; }, 12000), 'o segundo aparelho do mestre recebe o documento');
  await M.evaluate(() => { window.__visto = []; TC.dados.on('muda', (col, l, origem) => { if (l && l.id === 'teste:doc') window.__visto.push(origem + ':' + (l.dados ? l.dados.v : '?')); if (l && l.id === 'pc_tessa') window.__visto.push(origem + ':pc:' + l.nome + ':' + ((l.ficha || {}).notas || '').slice(0, 12)); }); });
  let presasM = 0;
  await dM.ctx.route(/\/rest\/v1\/(documentos|personagens)\?.*rev=gt\./, async route => { presasM++; await new Promise(r => setTimeout(r, 15000)); route.abort().catch(() => {}); });
  await w(3500);
  await M2.evaluate(() => { const D = TC.dados.col('documentos'); D.gravar('teste:outro', { dados: { v: 'novo' }, vis: 'mestre' }); D.gravar('teste:doc', { dados: { v: 'do segundo' } }); });
  await esvaziar(M2);
  ok((await docDe(M)).v === 'zero', 'o primeiro aparelho ainda não viu o que o segundo gravou');
  await M.evaluate(() => { TC.dados.col('documentos').gravar('teste:doc', { dados: { v: 'do primeiro' } }); });
  ok(await esvaziar(M), 'o primeiro grava por cima (um documento vai sempre inteiro)');
  const noBancoDoc = await M.evaluate(async mesa => (await __sb.from('documentos').select('dados,rev,rev_ant').eq('mesa_id', mesa).eq('id', 'teste:doc').single()).data, mesa);
  ok(noBancoDoc.dados.v === 'do primeiro' && noBancoDoc.rev_ant != null, 'no banco fica o do primeiro, que gravou por último');
  ok(await ate(async () => (await docDe(M)).rev === noBancoDoc.rev, 6000), 'o primeiro aparelho fica na revisão do banco');
  // e a ficha: o segundo muda a ficha, o primeiro muda só o nome — o primeiro tem de receber a ficha nova
  await M2.evaluate(() => { const P = TC.dados.col('personagens'), f = JSON.parse(JSON.stringify(P.pegar('pc_tessa').ficha)); f.notas = 'do segundo aparelho'; P.gravar('pc_tessa', { ficha: f }); });
  await esvaziar(M2);
  await M.evaluate(() => { TC.dados.col('personagens').gravar('pc_tessa', { nome: 'Tessa Renomeada' }); });
  await esvaziar(M);
  ok(await ate(async () => { const e = await espelho(M, 'pc_tessa'); return e.nome === 'Tessa Renomeada' && e.ficha.notas === 'do segundo aparelho'; }, 6000), 'na ficha, cada um mudou uma coluna: o primeiro fica com o nome dele e recebe a ficha do segundo (sem esperar a leitura periódica)');
  await dM.ctx.unroute(/\/rest\/v1\/(documentos|personagens)\?.*rev=gt\./);
  await w(7000);                                               // (a leitura periódica volta e traz as revisões antigas: nenhuma pode valer)
  const visto = await M.evaluate(() => window.__visto);
  ok(presasM > 0 && j(visto.filter(x => !x.includes(':pc:'))) === j(['local:do primeiro']) && (await docDe(M)).v === 'do primeiro', 'o documento que o primeiro cobriu nunca aparece para ele como novidade — nem o do outro (que ficou para trás), nem o dele mesmo de volta: ' + j(visto));
  ok(visto.filter(x => x.startsWith('remota:pc:')).length === 1 && visto.includes('remota:pc:Tessa Renomeada:do segundo a'), 'e a ficha chega uma vez só, já com o nome novo e a ficha do outro: ' + j(visto.filter(x => x.includes(':pc:'))));
  ok(await ate(async () => { const e = await espelho(M2, 'pc_tessa'), d = await docDe(M2); return e.nome === 'Tessa Renomeada' && d.v === 'do primeiro'; }, 12000), 'o segundo aparelho acompanha os dois');
  const outroDe = (p, id) => p.evaluate(id => { const l = TC.dados.col('documentos').pegar(id); return l ? l.dados.v : null; }, id);
  // (uma leitura periódica que tinha ficado presa pode levar até 15 s para desistir; a seguinte é que traz)
  ok(await ate(async () => (await outroDe(M, 'teste:outro')) === 'novo', 30000), 'ler de novo uma linha sozinha não faz a leitura periódica pular as outras: o documento que o segundo criou antes também chega ao primeiro');
  // duas gravações que aparecem no banco fora de ordem: a leitura periódica passa pela de revisão maior antes de a menor ficar visível
  await ate(async () => await parado(M) && await parado(M2), 8000); await w(3500);
  // (a linha "lenta" fica invisível para a leitura periódica do primeiro aparelho até a "rápida" ter sido entregue)
  let omitidas = 0, viuRapido = false;
  await dM.ctx.route(/\/rest\/v1\/documentos\?select=\*.*rev=gt\./, async route => {
    const resp = await route.fetch(); let linhas = null;
    try { linhas = await resp.json(); } catch (e) { /* segue como veio */ }
    if (Array.isArray(linhas) && !viuRapido && linhas.some(x => x.id === 'teste:lento')) {
      if (linhas.some(x => x.id === 'teste:rapido')) viuRapido = true;
      omitidas++; linhas = linhas.filter(x => x.id !== 'teste:lento');
    }
    return Array.isArray(linhas) ? route.fulfill({ response: resp, json: linhas }) : route.fulfill({ response: resp });
  });
  await M2.evaluate(() => { const D = TC.dados.col('documentos'); D.gravar('teste:lento', { dados: { v: 'cheguei depois' }, vis: 'mestre' }); });
  await esvaziar(M2);
  await M2.evaluate(() => { const D = TC.dados.col('documentos'); D.gravar('teste:rapido', { dados: { v: 'cheguei antes' }, vis: 'mestre' }); });
  await esvaziar(M2);
  ok(await ate(async () => (await outroDe(M, 'teste:rapido')) === 'cheguei antes', 10000), '(a leitura do primeiro aparelho traz o documento de revisão maior — o de revisão menor ainda "não estava lá")');
  ok(await ate(async () => (await outroDe(M, 'teste:lento')) === 'cheguei depois', 10000) && omitidas >= 1, 'na leitura seguinte, a conferência da faixa anterior acha o que ficou para trás e o traz: ' + j([await outroDe(M, 'teste:lento'), omitidas]));
  await dM.ctx.unroute(/\/rest\/v1\/documentos\?select=\*.*rev=gt\./);

  // ---------- uma linha apagada não volta por uma leitura que saiu do banco antes de ela ser apagada ----------
  await M.evaluate(() => { window.__volta = []; TC.dados.on('muda', (col, l, origem) => { if (l && /^teste:(zumbi|some)$/.test(l.id)) window.__volta.push(origem + ':' + l.id.slice(6) + ':' + (l.apagado ? 'apagada' : 'viva')); }); });
  const temDoc = (p, id) => p.evaluate(id => !!TC.dados.col('documentos').pegar(id), id);
  const voltas = nome => M.evaluate(nome => window.__volta.filter(x => x.includes(':' + nome + ':')), nome);
  // (1) apagada pelo outro aparelho. O primeiro tinha pedido a linha sozinha (ela tinha ficado para trás na leitura
  //     periódica); a resposta saiu do banco com a linha ainda viva e só chega depois de ele saber que foi apagada.
  let viuIsca = false, avulsas = 0, soltas = 0;
  await dM.ctx.route(/\/rest\/v1\/documentos\?select=\*/, async route => {
    const resp = await route.fetch();
    if (/[?&]id=eq\.teste(%3A|:)zumbi/.test(route.request().url())) {
      avulsas++; await new Promise(r => setTimeout(r, 10000)); soltas++;
      return route.fulfill({ response: resp }).catch(() => {});
    }
    let linhas = null;
    try { linhas = await resp.json(); } catch (e) { /* segue como veio */ }
    if (Array.isArray(linhas) && !viuIsca && linhas.some(x => x.id === 'teste:zumbi')) {
      if (linhas.some(x => x.id === 'teste:isca')) viuIsca = true;
      linhas = linhas.filter(x => x.id !== 'teste:zumbi');
    }
    return (Array.isArray(linhas) ? route.fulfill({ response: resp, json: linhas }) : route.fulfill({ response: resp })).catch(() => {});
  });
  await M2.evaluate(() => { TC.dados.col('documentos').gravar('teste:zumbi', { dados: { v: 'vou ser apagada' }, vis: 'mestre' }); });
  await esvaziar(M2);
  await M2.evaluate(() => { TC.dados.col('documentos').gravar('teste:isca', { dados: { v: 'isca' }, vis: 'mestre' }); });
  await esvaziar(M2);
  ok(await ate(() => avulsas === 1, 15000) && !(await temDoc(M, 'teste:zumbi')), '(o primeiro aparelho pede, sozinha, a linha que tinha ficado para trás; a resposta já saiu do banco, mas demora a chegar)');
  await M2.evaluate(() => { TC.dados.col('documentos').apagar('teste:zumbi'); });
  await esvaziar(M2);
  ok(await ate(() => soltas === 1, 15000), '(o outro aparelho apaga a linha; só depois a resposta antiga chega ao primeiro)');
  await w(4000);
  ok(!(await temDoc(M, 'teste:zumbi')) && (await voltas('zumbi')).length === 0, 'a linha apagada pelo outro aparelho não aparece no primeiro por causa de uma leitura feita antes de ela ser apagada: ' + j(await voltas('zumbi')));
  await dM.ctx.unroute(/\/rest\/v1\/documentos\?select=\*/);
  // (2) apagada aqui. A leitura periódica que a trazia, viva, saiu do banco antes e só chega depois de apagada.
  let seguras = 0, largadas = 0;
  await dM.ctx.route(/\/rest\/v1\/documentos\?select=\*.*rev=gt\./, async route => {
    const resp = await route.fetch(); let linhas = null;
    try { linhas = await resp.json(); } catch (e) { /* segue como veio */ }
    if (Array.isArray(linhas) && linhas.some(x => x.id === 'teste:some' && !x.apagado)) { seguras++; await new Promise(r => setTimeout(r, 8000)); largadas++; }
    return route.fulfill({ response: resp }).catch(() => {});
  });
  await M.evaluate(() => { TC.dados.col('documentos').gravar('teste:some', { dados: { v: 'já vou' }, vis: 'mestre' }); });
  await esvaziar(M);
  ok(await ate(() => seguras >= 1, 10000), '(a leitura periódica que traz a linha nova, viva, fica a caminho)');
  await M.evaluate(() => { TC.dados.col('documentos').apagar('teste:some'); });
  const apagou = await esvaziar(M);
  const laApagada = await M.evaluate(async mesa => { const r = await __sb.from('documentos').select('apagado').eq('mesa_id', mesa).eq('id', 'teste:some').maybeSingle(); return r.data ? r.data.apagado : null; }, mesa);
  ok(apagou && laApagada === true && !(await temDoc(M, 'teste:some')), 'o primeiro aparelho apaga a linha (no banco, apagada), com a leitura antiga ainda a caminho');
  ok(await ate(() => largadas >= 1, 15000), '(a leitura antiga chega)');
  await w(4500);
  ok(!(await temDoc(M, 'teste:some')) && j(await voltas('some')) === j(['local:some:viva', 'local:some:apagada']), 'a linha apagada aqui não reaparece — nem por um instante — quando chega a leitura que saiu do banco antes: ' + j(await voltas('some')));
  await dM.ctx.unroute(/\/rest\/v1\/documentos\?select=\*.*rev=gt\./);
  await dM2.ctx.close();

  // ---------- limpeza ----------
  await apagarMesaTela(M, nomeMesa);
  const fora = t.errs.filter(e => !/status of (400|401|403|404|409)/.test(e));
  ok(fora.length === 0, 'sem erros no console: ' + fora.slice(0, 5).join(' · '));
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
