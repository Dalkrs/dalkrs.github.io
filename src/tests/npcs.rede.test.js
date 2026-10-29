// O lote 32 numa mesa de verdade (banco local de ensaio ou o projeto real): o mestre (Bruno) e o Dalmo.
//   · as raças das fichas entram na lista do Escudo; o NPC gerado vira ficha nas Fichas (com um clique; a ficha nasce
//     com o nome, a raça, o tier, o level e as notas) e token na cena (ligado à ficha);
//   · o painel do roteiro mostra o cartão do NPC ligado a um passo;
//   · os encontros por bioma: "Sugerir do Bestiário" (os inimigos com a tag Floresta); no Mapa-múndi, o grupo na floresta
//     sorteia pela tabela do bioma: os goblins com − e +, a dificuldade contra a ficha do grupo, "Puxar para a cena" (os
//     tokens nascem nas Cenas) e "Mandar para a mesa" (o título diz o bioma).
const path = require('path');
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, codigoDaMesa, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', w: 1500, h: 950, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const Dp = (await t.device({ name: 'dalmo', w: 1300, h: 900, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 30000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const errosDeFora = () => t.errs.filter(e => !/status of (400|401|409)/.test(e));

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'NPCs E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  let apagada = false;
  try {
    const codigo = await codigoDaMesa(M);
    await Dp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Dp); await loginTela(Dp, c.jog1, c.senha); await entrarMesaTela(Dp, codigo, 'Dalmo');
    ok(await ate(() => M.evaluate(() => TC.mesas.atual && TC.mesas.atual.membros.some(m => m.nome === 'Dalmo'))), '(o Dalmo entrou na mesa)');
    // a ficha do Dalmo (um elfo, level 3), os inimigos do Bestiário e o mapa com o grupo na floresta
    await M.evaluate(() => {
      const dalmo = TC.mesas.atual.membros.find(m => m.nome === 'Dalmo').usuario_id;
      const ficha = Object.assign(TC.rules.personagemPadrao('Lirien', 'pcDalmo'), { raca: 'Elfo', tier: 'C', level: 3, tiers: { FOR: 'C', DES: 'A', AGI: 'B', VIT: 'D', CAN: 'E' } });
      TC.dados.col('personagens').gravar('pcDalmo', { nome: 'Lirien', dono_id: dalmo, vis: 'mesa', ordem: 1, ficha, skills: {}, estado: {}, campanha: null });
      const D = TC.dados.col('documentos');
      D.gravar('best:i:gob', { dados: { v: 1, nome: 'Goblin', tags: ['Floresta', 'Lacaio'], ficha: { tier: 'D', level: 2 } }, vis: 'mestre' });
      D.gravar('best:i:lobo', { dados: { v: 1, nome: 'Lobo cinzento', tags: ['Floresta', 'Fera'], ficha: { tier: 'C', level: 3 } }, vis: 'mestre' });
      D.gravar('best:i:tub', { dados: { v: 1, nome: 'Tubarão', tags: ['Mar'], ficha: { tier: 'C', level: 3 } }, vis: 'mestre' });
      const hexes = {};
      for (let q = -2; q <= 12; q++) for (let r = -2; r <= 8; r++) hexes[q + ',' + r] = 'fl';
      D.gravar('mundo:mapa:mp_npc', { dados: { v: 1, id: 'mp_npc', nome: 'Mundo de teste', grade: { x: 0, y: 0, on: true, tam: 40, orient: 'pe' }, terrenos: [{ id: 'fl', nome: 'Floresta', cor: '#3f7a46', custo: 10, tex: 'arvores' }], hexes,
        objs: [{ id: 'g', k: 'g', x: 120, y: 103.92, nome: 'Os Heróis', sigla: 'HER', pcs: ['pcDalmo'] }, { id: 'vila', k: 'm', x: 300, y: 200, nome: 'Vila Clara', ic: 'vila' }] }, vis: 'mestre' });
    });

    let EF = null, CF = null;
    await M.locator('#tab-cenas').click();
    ok(await ate(async () => { CF = await quadro(M, /\/cenas\//); return CF && await CF.evaluate(() => !!window.__tc && __tc.Nuvem.mestre() && !!__tc.Store.S.current); }, 40000), '(as Cenas do mestre)');
    await M.locator('#tab-escudo').click();
    ok(await ate(async () => { EF = await quadro(M, /\/escudo\//); return EF && await EF.evaluate(() => !!window.__escudo && __escudo.pronto && __escudo.naMesa); }, 40000), '(o Escudo na mesa)');

    let nid = null;
    await passo('as raças das fichas e o NPC', async () => {
      await EF.click('[data-k="aba:npcs"]'); await w(200);
      await EF.click('[data-k="npc:racas"]'); await w(200);
      await EF.click('[data-k="rc:fichas"]');
      ok(await ate(() => EF.evaluate(() => document.querySelector('[data-k="rc:0:nome"]') && document.querySelector('[data-k="rc:0:nome"]').value === 'Elfo')), '“Trazer as raças das fichas”: o Elfo do Dalmo entra');
      ok(await EF.inputValue('[data-k="rc:0:estilo"]') === 'elfico', '(o palpite do estilo: élfico)');
      await EF.click('[data-k="rc:ok"]'); await w(300);
      await EF.click('[data-k="npc:gerar2"]'); await w(300);
      await EF.selectOption('[data-k="g:lugar"]', 'mp_npc/vila'); await EF.selectOption('[data-k="g:papel"]', 'taverneiro');
      await EF.click('[data-k="g:gerar"]'); await w(300);
      await EF.click('[data-k="g:escolher0"]'); await w(400);
      nid = await EF.evaluate(() => __escudo.NP.sel);
      const n = await EF.evaluate(id => __escudo.NP.npc(id), nid);
      ok(n && n.raca && n.raca.nome === 'Elfo' && n.lugar && n.lugar.nome === 'Vila Clara' && n.papel === 'taverneiro', 'o NPC: elfo, taverneiro, vive na Vila Clara: ' + (n && n.nome));
      ok(await ate(() => M.evaluate(id => { const l = TC.dados.col('documentos').pegar('escudo:npc:' + id); return !!l && l.vis === 'mestre'; }, nid)), 'guardado na mesa, só para quem mestra');
      ok(await Dp.evaluate(id => !TC.dados.col('documentos').pegar('escudo:npc:' + id), nid), 'o Dalmo não recebe o NPC');
    });

    await passo('virar ficha', async () => {
      const n = await EF.evaluate(id => __escudo.NP.npc(id), nid);
      await EF.click('[data-k="n:ficha"]');
      const pc = await EF.evaluate(id => __escudo.NP.npc(id).pc, nid);
      ok(!!pc && await ate(() => M.evaluate(([pc, nome]) => { const l = TC.dados.col('personagens').pegar(pc); return !!l && !l.apagado && l.nome === nome && l.ficha.raca === 'Elfo' && /Quer: /.test(l.ficha.notas || '') && l.vis === 'mestre' && !l.dono_id; }, [pc, n.nome]), 40000), 'o NPC virou ficha nas Fichas: o nome, a raça, as notas (quem é, o que quer…), só do mestre');
      const ff = await quadro(M, /\/fichas\//);
      await foto(M, 'npc-rede-ficha');
      ok(ff && await ate(() => ff.evaluate(nome => document.body.innerText.includes(nome), n.nome)), 'a ficha aparece aberta nas Fichas');
      await M.locator('#tab-escudo').click(); await w(500);
      ok(await ate(() => EF.evaluate(() => /Abrir a ficha/.test(document.querySelector('[data-k="n:ficha"]').textContent))), 'no Escudo, o botão vira “Abrir a ficha”');
      ok(await EF.locator('.badge', { hasText: 'Tem ficha' }).count() === 1, '(e o selo “Tem ficha”)');
    });

    await passo('token na cena', async () => {
      const pc = await EF.evaluate(id => __escudo.NP.npc(id).pc, nid);
      await EF.click('[data-k="n:token"]');
      ok(await ate(() => CF.evaluate(pc => __tc.Store.scene().tokens.some(tk => tk.char === pc), pc), 30000), '“Token na cena”: o token nasce na cena aberta, ligado à ficha do NPC');
      await foto(M, 'npc-rede-token');
      await M.locator('#tab-escudo').click(); await w(400);
    });

    await passo('o NPC no painel do roteiro', async () => {
      await EF.click('[data-k="n:roteiro"]'); await w(300);
      const sid = await EF.evaluate(() => __escudo.A.sessoes()[0].id), pid = await EF.evaluate(sid => __escudo.A.sessao(sid).passos[0].id, sid);
      await M.click('#btnRoteiro');
      ok(await ate(() => M.evaluate(pid => !!document.querySelector('[data-k="rt:ir:' + pid + '"]'), pid)), 'o passo do NPC no painel, com “Ver”');
      await M.click('[data-k="rt:ir:' + pid + '"]');
      ok(await ate(() => M.evaluate(() => { const c = document.querySelector('.rt-npc'); return !!c && /Quer:/.test(c.innerText) && /Gancho:/.test(c.innerText); })), '“Ver” abre o cartão do NPC ali mesmo (quem é, o que quer, o gancho)');
      await foto(M, 'npc-rede-painel');
      await M.click('#btnRoteiro'); await w(200);
    });

    await passo('a tabela da floresta', async () => {
      await EF.click('[data-k="aba:encontros"]'); await w(200);
      await EF.click('[data-k="bioma:floresta"]'); await w(200);
      await EF.click('[data-k="b:sugerir-best"]'); await w(400);
      const t0 = await EF.evaluate(() => __escudo.A.dadosDe('escudo:biomas').tabelas.floresta);
      ok(t0.itens.length === 2 && t0.itens.every(x => x.k === 'inimigo') && j(t0.itens.map(x => x.ref).sort()) === j(['gob', 'lobo']) && t0.chance === 30, '“Sugerir do Bestiário”: os dois da Floresta (o tubarão não), com a chance de 30%: ' + j(t0.itens.map(x => x.ref + ' ' + x.dados)));
      const gob = t0.itens.find(x => x.ref === 'gob'), lobo = t0.itens.find(x => x.ref === 'lobo');
      ok(gob.dados === '1d4' && lobo.dados === '1d3', 'os dados pelo tier: goblin (D) 1d4, lobo (C) 1d3');
      await EF.click('[data-k="b:i:' + lobo.id + ':tirar"]'); await w(200);
      await EF.fill('[data-k="b:i:' + gob.id + ':dados"]', '3'); await EF.press('[data-k="b:i:' + gob.id + ':dados"]', 'Tab'); await w(200);
      await EF.fill('[data-k="b:chance"]', '100'); await EF.press('[data-k="b:chance"]', 'Tab'); await w(300);
      await foto(M, 'npc-rede-tabela');
      ok(await ate(() => M.evaluate(() => { const l = TC.dados.col('documentos').pegar('escudo:biomas'); return !!l && l.dados.tabelas.floresta.chance === 100 && l.dados.tabelas.floresta.itens.length === 1; })), '(a tabela: só os goblins, 3, 100%)');
    });

    await passo('o sorteio no Mapa-múndi', async () => {
      await EF.evaluate(() => TC.ponte.ir('mundo', { mapa: 'mp_npc', obj: 'g' }));
      let MF = null;
      ok(await ate(async () => { MF = await quadro(M, /\/mundo\//); return MF && await MF.evaluate(() => !!document.querySelector('#pane [data-k="o:sortear"]')); }, 40000), '(o Mapa-múndi, com o grupo selecionado)');
      await MF.click('#pane [data-k="o:sortear"]'); await w(500);
      const card = () => MF.evaluate(() => { const c = document.querySelector('#pane .cartao'); return c ? c.innerText.replace(/\s+/g, ' ') : ''; });
      const c1 = await card();
      ok(/Encontro!/.test(c1) && /× Goblin/.test(c1) && /Floresta \(a tabela do bioma/.test(c1), 'o grupo na floresta, fora de região: a tabela do bioma — 3 goblins: ' + c1.slice(0, 140));
      ok(/Dificuldade: (Fácil|Médio|Duro|Mortal) \(\d+% da força de 1 personagem\)/.test(c1), 'a dificuldade contra a ficha do grupo: ' + (/Dificuldade[^)]*\)/.exec(c1) || [''])[0]);
      await MF.click('#pane [data-k="enc:l:0:mais"]'); await w(300);
      ok(/4 × Goblin|^.*\b4\b × Goblin/.test(await card()) || await MF.evaluate(() => document.querySelector('#pane .enc-n').textContent) === '4', 'o + muda a quantidade antes de puxar (4)');
      await foto(M, 'npc-rede-mundo');
      await MF.click('#pane [data-k="enc:mesa"]'); await w(500);
      ok(await ate(() => Dp.evaluate(() => [...document.querySelectorAll('#feed li')].some(li => /Encontro: Floresta/.test(li.innerText) && /4 × Goblin/.test(li.innerText))), 40000), '“Mandar para a mesa”: o Dalmo vê “Encontro: Floresta — 4 × Goblin” na Mesa ao vivo');
      await MF.click('#pane [data-k="enc:puxar"]');
      ok(await ate(() => CF.evaluate(() => __tc.Store.scene().tokens.filter(tk => tk.best === 'gob').length === 4), 30000), '“Puxar para a cena”: os 4 goblins nascem nas Cenas');
      await foto(M, 'npc-rede-cena');
    });

    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = errosDeFora();
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})();
