// Lote 6, parte 3 (as Cenas), numa mesa de verdade (banco local de ensaio ou o projeto real), com o mestre e uma
// jogadora em aparelhos separados:
//   · E: a janelinha dos equipamentos grava na ficha — o mestre, em qualquer token ligado; a jogadora, no dela;
//     equipar um item guarda o outro do mesmo grupo de troca; Desfazer volta;
//   · a Postura que a jogadora liga no token dela chega ao mestre (e a etiqueta junto do nome, a todos);
//   · a linha invisível na ordem de turnos: a jogadora não recebe a linha; na vez dela, só fica sabendo que o turno
//     está com o mestre;
//   · N e Shift+N: o mestre passa e volta a vez pelo teclado; a jogadora, não.
// (Os bônus "só nesta defesa" do pedido de defesa estão no src/tests/combate.rede.test.js.)
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const ficha = (nome, extra) => Object.assign({ nome, raca: 'Elfa da neve', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, defEsp: {}, rol: { fixa: 5, fonte: 'total' }, ini: 'AGI/5', disputa: {}, estaque: { a: '', b: '' }, habilidades: [], notas: '', recursos: [{ id: 'hp', nome: 'HP', fml: '100' }] }, extra);
const selene = ficha('Selene', { itens: [
  { id: 'i_esp', nome: 'Espada curta', troca: 'Arma', equipado: true, bonus: { FOR: 2 } },
  { id: 'i_mac', nome: 'Machado', troca: 'Arma', equipado: false, bonus: { FOR: 4 } },
  { id: 'i_ane', nome: 'Anel de prata', reliquia: true, equipado: false, bonus: { DFM: 3 } },
] });
const goblin = ficha('Goblin batedor', { lado: 'Inimigo', itens: [{ id: 'i_cla', nome: 'Clava', troca: 'Arma', equipado: true, bonus: { FOR: 1 } }, { id: 'i_arc', nome: 'Arco curto', troca: 'Arma', equipado: false, bonus: { DES: 2 } }] });
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1300, h: 860, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 60) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const noMapa = async (f, id) => { const b = await f.locator('#cv').boundingBox(); const p = await f.evaluate(id => { const u = __tc, sc = u.Store.scene(), k = u.Store.get('tokens', id), s = k.size * sc.cell; return u.Render.toScreen(k.x + s / 2, k.y + s / 2); }, id); return [b.x + p[0], b.y + p[1]]; };
  const tecla = (f, k, shift) => f.evaluate(([k, shift]) => { window.dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey: !!shift, bubbles: true, cancelable: true })); }, [k, shift]);
  const aviso = f => f.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const semAvisos = f => f.evaluate(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const equipados = (p, id) => p.evaluate(id => { const l = TC.dados.col('personagens').pegar(id); return l.ficha.itens.filter(x => x.equipado !== false).map(x => x.nome).join(', '); }, id);
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Cenas L6 E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    const jogId = await J.evaluate(() => TC.conta.usuario.id);
    await M.evaluate(([fs, uid]) => {
      const P = TC.dados.col('personagens'), base = { skills: { arvores: [], pontos: {}, alocados: {} }, estado: {} };
      P.gravar('pc_selene', Object.assign({}, base, { nome: 'Selene', ficha: fs[0], dono_id: uid, vis: 'mesa', ordem: 0 }));
      P.gravar('pc_gob', Object.assign({}, base, { nome: 'Goblin batedor', ficha: fs[1], dono_id: null, vis: 'mestre', ordem: 1 }));
    }, [[selene, goblin], jogId]);
    ok(await ate(() => parado(M)), '(as fichas sobem para a mesa)');
    await M.locator('#tab-cenas').click();
    let C = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'mestre' && __tc.Fichas.on() && !!__tc.Fichas.get('pc_gob') && __tc.Store.S.players.some(p => p.id === id), jogId); }, 40000), '(o mestre está nas Cenas, com as fichas e a jogadora da mesa)');
    if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }
    const ids = await C.evaluate(() => {
      const u = __tc, sc = u.Store.scene(), cl = sc.cell;
      const a = u.newToken(sc, cl * 3, cl * 3, { name: 'x' }), g = u.newToken(sc, cl * 7, cl * 3, { name: 'y' }), l = u.newToken(sc, cl * 11, cl * 3, { name: 'Lobo' });
      u.Store.tx('Criar', () => { u.Store.add('tokens', a); u.Store.add('tokens', g); u.Store.add('tokens', l); });
      u.Fichas.link(u.Store.get('tokens', a.id), 'pc_selene'); u.Fichas.link(u.Store.get('tokens', g.id), 'pc_gob');
      return { sel: a.id, gob: g.id, lobo: l.id };
    });
    ok(await C.evaluate(([s, uid]) => { const k = __tc.Store.get('tokens', s); return k.char === 'pc_selene' && k.owner === uid && k.name === 'Selene'; }, [ids.sel, jogId]), '(o token da Selene é da jogadora, ligado à ficha)');
    await C.locator('#airBtn').click(); await w(250);
    await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(400);

    // ---------- E: o mestre ----------
    { const [x, y] = await noMapa(C, ids.gob); await M.mouse.move(x, y); await w(200); }
    await tecla(C, 'e'); await w(350);
    ok(await C.locator('#epop').count() === 1 && await C.locator('#epop .eq-c').count() === 2 && (await C.locator('#epop .pop-n').innerText()) === 'Goblin batedor' && await C.locator('#eq-i_cla.on').count() === 1,
      'o mestre aperta E sobre o Goblin: a janelinha com os itens da ficha dele (a Clava equipada)');
    await semAvisos(C);
    await C.locator('#eq-i_arc').click(); await w(300);
    ok(await ate(async () => await equipados(M, 'pc_gob') === 'Arco curto' && await parado(M)) && /Equipou Arco curto no lugar de Clava\./.test(await aviso(C)), 'equipar o Arco grava na ficha e guarda a Clava (mesmo grupo de troca): ' + await aviso(C));
    ok(await C.locator('#eq-i_arc.on').count() === 1 && await C.locator('#eq-i_cla.on').count() === 0, 'a janelinha acompanha');
    await C.locator('.toast-a', { hasText: 'Desfazer' }).last().click(); await w(300);
    ok(await ate(async () => await equipados(M, 'pc_gob') === 'Clava' && await parado(M)), 'Desfazer devolve a Clava, na ficha');
    await M.keyboard.press('Escape'); await w(200);
    ok(await C.locator('#epop').count() === 0, '(Esc fecha)');
    // o token da jogadora: o mestre também mexe
    { const [x, y] = await noMapa(C, ids.sel); await M.mouse.move(x, y); await w(200); }
    await tecla(C, 'e'); await w(350);
    ok((await C.locator('#eq-i_ane').innerText()).replace(/\s+/g, ' ').trim() === 'Anel de prata DEF M +3' && await C.locator('#eq-i_ane.rel').count() === 1, 'o Anel de prata (relíquia) diz o que soma, com o nome curto da defesa: ' + (await C.locator('#eq-i_ane').innerText()).replace(/\s+/g, ' '));
    await C.locator('#eq-i_mac').click(); await w(300);
    ok(await ate(async () => await equipados(M, 'pc_selene') === 'Machado' && await parado(M)), 'o mestre equipa o Machado da Selene (a Espada é guardada)');
    // (a janelinha do mestre fica aberta: o que a jogadora mudar aparece nela)

    // ---------- E: a jogadora, na cena no ar ----------
    await J.locator('#tab-cenas').click();
    let B = null;
    ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(([a, b]) => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && !!__tc.Store.get('tokens', a) && !!__tc.Store.get('tokens', b), [ids.sel, ids.gob]); }, 40000), 'a jogadora vê a cena no ar, com o token dela e o Goblin');
    await J.waitForTimeout(800);
    { const [x, y] = await noMapa(B, ids.sel); await J.mouse.move(x, y); await w(200, J); }
    await tecla(B, 'e'); await w(400, J);
    ok(await ate(async () => (await B.locator('#epop .eq-c').count()) === 3 && (await B.locator('#eq-i_mac.on').count()) === 1, 10000), 'a jogadora aperta E sobre o token dela: os itens da Selene, com o Machado que o mestre equipou');
    await foto(J, 'l6-equipamentos-jogadora');
    await semAvisos(B);
    await B.locator('#eq-i_ane').click(); await w(400, J);
    ok(await ate(async () => await equipados(M, 'pc_selene') === 'Machado, Anel de prata' && await parado(J)), 'ela equipa o Anel de prata (a relíquia, sem grupo de troca): a ficha dela grava, e o mestre recebe');
    ok(await ate(async () => (await C.locator('#eq-i_ane.on').count()) === 1, 15000), 'a janelinha que o mestre deixou aberta acompanha (o Anel aparece equipado)');
    await B.locator('#eq-i_esp').click(); await w(400, J);
    ok(await ate(async () => await equipados(M, 'pc_selene') === 'Espada curta, Anel de prata' && await parado(J)) && /Equipou Espada curta no lugar de Machado\./.test(await aviso(B)), 'a Espada de volta guarda o Machado: ' + await aviso(B));
    await J.keyboard.press('Escape'); await w(200, J);
    await M.keyboard.press('Escape'); await w(200);
    { const [x, y] = await noMapa(B, ids.gob); await J.mouse.move(x, y); await w(200, J); }
    await semAvisos(B);
    await tecla(B, 'e'); await w(300, J);
    ok(await B.locator('#epop').count() === 0 && /Você mexe nos equipamentos do seu personagem/.test(await aviso(B)), 'sobre o Goblin, a jogadora não abre nada (a mesa explica)');

    // ---------- a Postura ----------
    await B.evaluate(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, ids.sel); await w(400, J);
    ok(await B.locator('#tk-post').count() === 1 && !(await B.locator('#tk-post').isChecked()), 'no painel do token dela: a chave "Em postura"');
    await B.locator('#tk-post').click({ force: true }); await w(300, J);
    ok(await ate(async () => await C.evaluate(id => __tc.Store.get('tokens', id).post === true, ids.sel), 20000), 'ligada pela jogadora, a postura chega ao mestre');
    ok(await ate(async () => await B.evaluate(id => __tc.Store.get('tokens', id).post === true, ids.sel)), 'e fica no token dela');
    await foto(J, 'l6-postura-jogadora');
    await C.evaluate(id => { const u = __tc; u.Store.tx('Sem postura', () => u.Store.upd('tokens', id, { post: false })); }, ids.sel);
    ok(await ate(async () => await B.evaluate(id => !__tc.Store.get('tokens', id).post, ids.sel), 20000) && await ate(async () => !(await B.locator('#tk-post').isChecked())), 'o mestre desliga: a jogadora vê a chave desligada');
    // num token que não é dela, a jogadora não liga (o pedido forjado não passa)
    await B.evaluate(id => { const u = __tc; u.Store.tx('forja', () => u.Store.upd('tokens', id, { post: true })); }, ids.gob);
    await w(3500);
    ok(await C.evaluate(id => !__tc.Store.get('tokens', id).post, ids.gob), 'a postura forjada no Goblin não chega ao mestre');

    // ---------- a linha invisível e o "turno com o mestre"; N e Shift+N ----------
    await C.evaluate(i => {
      const u = __tc, ts = [i.sel, i.gob, i.lobo].map(id => u.Store.get('tokens', id));
      u.Act.turnAdd(ts);
      u.Act.turnPatch(x => { const v = { [i.sel]: 15, [i.gob]: 10, [i.lobo]: 5 }; for (const e of x.list) e.init = v[e.token]; u.turnSort(x.list); x.cur = x.list[0].id; }, 'Iniciativas');
      u.setSel([]); u.UI.openTab('turn');
    }, ids); await w(400);
    const linhaGob = await C.evaluate(id => __tc.Store.scene().turn.list.find(e => e.token === id).id, ids.gob);
    await C.locator('#tv-' + linhaGob).click(); await w(300);
    ok(await C.evaluate(id => __tc.Store.scene().turn.list.find(e => e.token === id).inv === true, ids.gob) && await C.locator('#tl-' + linhaGob + '.inv').count() === 1, 'o mestre esconde a linha do Goblin (o olho)');
    await B.evaluate(() => { __tc.setSel([]); __tc.UI.openTab('turn'); }); await w(300, J);
    const daJogadora = () => B.evaluate(() => { const tn = __tc.Store.scene().turn; return { nomes: tn.list.map(e => e.name).join(', '), cur: (tn.list.find(e => e.id === tn.cur) || {}).name || null, mestre: !!tn.mestre, on: tn.on }; });
    ok(await ate(async () => (await daJogadora()).nomes === 'Selene, Lobo', 20000), 'a jogadora não recebe a linha do Goblin: ' + JSON.stringify(await daJogadora()));
    await semAvisos(C);
    await tecla(C, 'n'); await w(300);
    ok(await C.evaluate(() => { const tn = __tc.Store.scene().turn; return tn.on && __tc.Store.get('tokens', tn.list.find(e => e.id === tn.cur).token).name === 'Selene'; }), 'o mestre aperta N: o combate começa, na vez da Selene');
    ok(await ate(async () => { const v = await daJogadora(); return v.on && v.cur === 'Selene' && !v.mestre; }, 20000), 'a jogadora vê a vez da Selene');
    await tecla(C, 'n'); await w(300);
    ok(await C.evaluate(() => { const tn = __tc.Store.scene().turn; return __tc.Store.get('tokens', tn.list.find(e => e.id === tn.cur).token).name === 'Goblin batedor'; }), 'N de novo: a vez do Goblin (invisível)');
    ok(await ate(async () => { const v = await daJogadora(); return v.cur === null && v.mestre; }, 20000), 'para a jogadora, a vez não aponta para ninguém: o turno está com o mestre');
    ok(await ate(async () => (await B.locator('#turnMestre').count()) === 1 && /O turno está com o mestre/.test(await B.locator('#turnMestre').innerText()), 10000), 'na aba Turnos dela: "O turno está com o mestre."');
    ok(await ate(async () => /O turno está com o mestre/.test(await B.locator('#turnb').innerText().catch(() => '')), 8000), 'e o aviso de vez diz o mesmo');
    await foto(J, 'l6-turno-com-o-mestre');
    await semAvisos(B);
    await tecla(B, 'n'); await w(300, J);
    ok(/Quem passa a vez é o mestre/.test(await aviso(B)), 'a jogadora aperta N: a mesa explica que quem passa a vez é o mestre');
    await w(1500);
    ok(await C.evaluate(() => { const tn = __tc.Store.scene().turn; return __tc.Store.get('tokens', tn.list.find(e => e.id === tn.cur).token).name === 'Goblin batedor'; }), '(e a vez continua com o Goblin)');
    await tecla(C, 'N', true); await w(300);
    ok(await C.evaluate(() => { const tn = __tc.Store.scene().turn; return __tc.Store.get('tokens', tn.list.find(e => e.id === tn.cur).token).name === 'Selene'; }), 'Shift+N: o mestre volta a vez para a Selene');
    ok(await ate(async () => { const v = await daJogadora(); return v.cur === 'Selene' && !v.mestre; }, 20000) && await ate(async () => (await B.locator('#turnMestre').count()) === 0, 8000), 'a jogadora acompanha: a vez da Selene de novo');
    await tecla(C, 'n'); await tecla(C, 'n'); await w(400);
    ok(await ate(async () => { const v = await daJogadora(); return v.cur === 'Lobo' && !v.mestre; }, 20000), 'passando pelo Goblin, a vez chega ao Lobo — e a jogadora vê');

    ok(await ate(async () => await parado(M) && await C.evaluate(() => __tc.Persist.status() === 'ok')), '(tudo salvo)');
    // ---------- limpeza ----------
    await M.locator('#tab-fichas').click(); await w(500);
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await M.keyboard.press('Escape'); await M.evaluate(async () => { if (TC.mesas.atual) await TC.mesas.apagar(); }); } catch (e) { console.log('(a mesa de teste não pôde ser apagada: ' + String(e.message).split('\n')[0] + ')'); } }
  }
  const inesperados = t.errs.filter(e => !/WebSocket|realtime|ERR_|Failed to load resource/i.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 10).join('\n'));
  ok(inesperados.length === 0, 'sem erros inesperados no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
