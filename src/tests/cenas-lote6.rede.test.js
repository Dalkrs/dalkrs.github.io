// Lote 6, parte 3 (as Cenas), numa mesa de verdade (banco local de ensaio ou o projeto real), com o mestre e uma
// jogadora em aparelhos separados:
//   · E: a janelinha dos equipamentos grava na ficha — o mestre, em qualquer token ligado; a jogadora, no dela;
//     equipar um item guarda o outro do mesmo grupo de troca; Desfazer volta;
//   · a Postura que a jogadora liga no token dela chega ao mestre (e a etiqueta junto do nome, a todos);
//   · a linha invisível na ordem de turnos: a jogadora não recebe a linha; na vez dela, só fica sabendo que o turno
//     está com o mestre;
//   · N e Shift+N: o mestre passa e volta a vez pelo teclado; a jogadora, não;
//   · Shift+F, a rolagem geral: o mestre pede aos jogadores (o pedido chega como um cartão na mesa ao vivo; cada um
//     rola pela própria ficha, escolhendo a fixa) e rola os NPCs ali; "Cancelar o pedido"; "Rolar por ele" vale como
//     a resposta do jogador; fechar encerra o pedido;
//   · E com os itens complementares (as regras de verdade): guardar a espada guarda a bainha, equipar a bainha traz a
//     espada, Desfazer, e o "sem efeito";
//   · as pastas da lista de cenas vão para a mesa (no índice das cenas, só do mestre); a cena que um marcador do
//     Mapa-múndi abre ganha o ícone do mundo;
//   · o vilarejo gerado numa mesa: o fundo pintado vai para o Storage, e a jogadora recebe as casas.
// (Os bônus "só nesta defesa" do pedido de defesa estão no src/tests/combate.rede.test.js.)
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const R = require('../../tc/rules.js');
const { ok, end } = checker();
// SO=a roda só a primeira parte (E, Postura, a linha invisível, N); SO=b, só a segunda (Shift+F, as pastas, o vilarejo)
const SO = process.env.SO || '', parteA = !SO || SO === 'a', parteB = !SO || SO === 'b';
// igualdade de conteúdo, sem ligar para a ordem das chaves (o banco devolve os objetos com as chaves reordenadas)
const igual = (a, b) => {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => igual(a[k], b[k]));
};
const valor = (f, id, k) => Math.max(0, Math.round(R.valorDoAtributo(R.calcular(Object.assign({}, f, { id }), R.cfgPadrao(), {}), k, 'total') || 0));
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
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await entrar(d.page, c.jog2, c.senha, 'Lia'); await d.ctx.close(); }
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
  const linhas = p => p.evaluate(() => TC.aoVivo.itens.filter(l => l.tipo === 'rolagem').map(l => ({ id: l.id, autor: l.autor_nome, secreta: l.secreta, d: l.dados })));
  const ultima = async (p, fn) => { const ls = await linhas(p); for (let i = ls.length - 1; i >= 0; i--) if (!fn || fn(ls[i])) return ls[i]; return null; };

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Cenas L6 E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    const jogId = await J.evaluate(() => TC.conta.usuario.id);
    // (uma segunda jogadora, a Lia, entra na mesa e sai: a personagem dela, a Brisa, serve para conferir que a Dalmo
    //  não responde por ela na rolagem geral)
    let liaId = null;
    if (parteB) {
      const d3 = await t.device({ name: 'jogadora2', seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } });
      await d3.page.goto(t.base + '?debug', { waitUntil: 'load' }); await d3.page.waitForTimeout(1200);
      await loginTela(d3.page, c.jog2, c.senha); await entrarMesaTela(d3.page, codigo, 'Lia');
      liaId = await d3.page.evaluate(() => TC.conta.usuario.id);
      await d3.ctx.close();
    }
    await M.evaluate(([fs, uid, lia]) => {
      const P = TC.dados.col('personagens'), base = { skills: { arvores: [], pontos: {}, alocados: {} }, estado: {} };
      P.gravar('pc_selene', Object.assign({}, base, { nome: 'Selene', ficha: fs[0], dono_id: uid, vis: 'mesa', ordem: 0 }));
      P.gravar('pc_gob', Object.assign({}, base, { nome: 'Goblin batedor', ficha: fs[1], dono_id: null, vis: 'mestre', ordem: 1 }));
      if (lia) P.gravar('pc_brisa', Object.assign({}, base, { nome: 'Brisa', ficha: fs[2], dono_id: lia, vis: 'mesa', ordem: 2 }));
    }, [[selene, goblin, ficha('Brisa')], jogId, liaId]);
    ok(await ate(() => parado(M)), '(as fichas sobem para a mesa)');
    await M.locator('#tab-cenas').click();
    let C = null, B = null;
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

    if (parteA) {
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
    }

    // ---------- Shift+F: a rolagem geral — pedir aos jogadores ----------
    if (parteB) {
    // (a jogadora acompanha da aba Fichas, com a mesa ao vivo aberta: o pedido chega como um cartão)
    await J.locator('#tab-fichas').click(); await w(500, J);
    await J.evaluate(() => { if (document.getElementById('vivo').hidden) document.getElementById('btnVivo').click(); }); await w(400, J);
    const fichaDe = id => M.evaluate(id => TC.dados.col('personagens').pegar(id).ficha, id);
    const perSel = valor(await fichaDe('pc_selene'), 'pc_selene', 'PER'), perGob = valor(await fichaDe('pc_gob'), 'pc_gob', 'PER');
    await C.evaluate(i => __tc.setSel([i.sel, i.gob, i.lobo].map(id => ({ c: 'tokens', id }))), ids); await w(200);
    await semAvisos(C);
    await tecla(C, 'F', true); await w(450);
    const gerTxt = () => C.evaluate(() => [...document.querySelectorAll('#ger-lista .atq-row')].map(li => li.innerText.replace(/\s+/g, ' ').trim()).join(' | '));
    ok(await C.locator('#ger-lista .atq-row').count() === 3 && await C.locator('#ger-quem').inputValue() === 'sel' && await C.locator('#ger-a-PER.on').count() === 1
      && (await C.locator('#ger-v-0').innerText()) === 'PER ' + perSel && (await C.locator('#ger-v-1').innerText()) === 'PER ' + perGob && await C.locator('#ger-val-2').inputValue() === '40' && await C.locator('#ger-pedir').count() === 1,
      'Shift+F com os três selecionados: a janela da rolagem geral, com a Percepção de cada ficha (e o valor a rolar do Lobo, que não tem ficha) e o "Pedir aos jogadores": ' + await gerTxt());
    await C.locator('#ger-nome').fill('Floresta');
    let antes = (await linhas(M)).length, r = null;
    await C.locator('#ger-pedir').click();
    ok(await ate(async () => (await linhas(M)).length === antes + 1), 'o mestre pede aos jogadores: o pedido vira uma linha da mesa ao vivo');
    const pedG = await ultima(M);
    ok(pedG.d.k === 'pedido' && pedG.d.total == null && igual(pedG.d.pd, { rot: 'Floresta', atr: 'PER', alvos: [{ c: 'pc_selene', n: 'Selene' }] }) && pedG.d.titulo === 'Rolem Percepção · Floresta' && !pedG.secreta && !/\d/.test(JSON.stringify(pedG.d.pd) + pedG.d.titulo + pedG.d.resumo),
      'o pedido leva o nome, o atributo e só a personagem da jogadora (o Goblin e o Lobo são do mestre) — sem o valor de ninguém: ' + JSON.stringify(pedG.d));
    ok(await ate(async () => (await C.locator('#ger-como-0').innerText()) === 'esperando Dalmo', 8000) && (await C.locator('#ger-rolar-0').innerText()).trim() === 'Rolar por ele' && await C.locator('#ger-a-FOR').isDisabled() && await C.locator('#ger-quem').isDisabled()
      && /Pedido enviado: Selene rola Percepção pela mesa ao vivo\./.test(await aviso(C)), 'a linha da Selene espera a jogadora (o mestre pode rolar por ela); o atributo e o "Quem rola" ficam travados enquanto o pedido está aberto');
    ok(await C.locator('#ger-pedir').count() === 0 && await C.locator('#ger-despedir').count() === 1 && (await C.locator('#ger-npcs').innerText()).trim() === 'Rolar pelos NPCs', 'com o pedido aberto: "Cancelar o pedido" e "Rolar pelos NPCs"');
    await foto(M, 'l6-rolagem-geral-mestre');
    ok(await ate(async () => await J.locator('#feed .ped').count() === 1, 20000), 'o pedido chega à jogadora');
    const cartaoG = () => J.locator('#feed .ped').last().innerText();
    ok(/Floresta: rolem Percepção/.test(await cartaoG()) && new RegExp('Selene\\s+Percepção ' + perSel).test(await cartaoG()) && await J.locator('#feed .ped .ped-fx').inputValue() === '5' && (await J.locator('#feed .ped button.pri').innerText()).trim() === 'Rolar',
      'o cartão dela diz o que rolar: a Percepção da própria ficha (' + perSel + '), o "Fixando" com a fixa da ficha e o botão "Rolar": ' + (await cartaoG()).replace(/\s+/g, ' '));
    ok(/Selene\s+aguardando/.test(await M.locator('#feed .ped').last().innerText()) && await M.locator('#feed .ped button.pri').count() === 0 && /Você acompanha pela janela da rolagem geral/.test(await M.locator('#feed .ped').last().innerText()), 'no cartão do mestre não há botão: ele acompanha pela janela');
    await foto(J, 'l6-rolagem-geral-jogadora');
    // uma resposta forjada não entra: pelo Goblin, que não é dela (nem está no pedido)
    await J.evaluate(async id => { await TC.aoVivo.rolagem({ k: 'fixa', titulo: 'forjada', total: 1, resumo: 'x', sis: { t: 'ra', p: id, c: 'pc_gob', v: 1 } }, { secreta: false }); }, pedG.id);
    await w(4000);
    ok((await C.locator('#ger-como-1').innerText()) === 'falta rolar', 'a jogadora tenta responder pelo Goblin (que não é dela): a janela do mestre ignora');
    // (e uma resposta por quem não está no pedido não entra, nem escrita pelo mestre: o Goblin, ele rola na janela)
    await M.evaluate(async id => { await TC.aoVivo.rolagem({ k: 'fixa', titulo: 'forjada', total: 2, resumo: 'x', sis: { t: 'ra', p: id, c: 'pc_gob', v: 2 } }, { secreta: false }); }, pedG.id);
    await w(3000);
    ok((await C.locator('#ger-como-1').innerText()) === 'falta rolar', 'uma resposta pelo Goblin, que não está no pedido, não entra (nem do mestre)');
    // o mestre rola os NPCs enquanto espera a jogadora
    antes = (await linhas(M)).length;
    await C.locator('#ger-npcs').click(); await w(300);
    ok(await ate(async () => (await linhas(M)).length === antes + 2), '"Rolar pelos NPCs": o mestre rola o Goblin (pela ficha) e o Lobo (pelo valor da linha) — duas rolagens na mesa');
    const doGob = await ultima(M, x => x.d.titulo === 'Goblin batedor · Percepção'), doLobo = await ultima(M, x => x.d.titulo === 'Lobo · Percepção (valor avulso)');
    ok(!!doGob && !!doLobo && !doGob.d.sis && !doLobo.d.sis && doGob.autor === 'Bruno' && doGob.d.total >= 1 && doGob.d.total <= perGob && doLobo.d.total >= 1 && doLobo.d.total <= 40,
      'as duas vão para a mesa ao vivo como as outras (sem recado de pedido): ' + JSON.stringify([doGob && doGob.d.titulo, doLobo && doLobo.d.titulo]));
    ok((await C.locator('#ger-como-0').innerText()) === 'esperando Dalmo' && await C.locator('#ger-npcs').count() === 0 && /Pedido feito: os jogadores rolam pela mesa ao vivo\./.test(await C.locator('#ger-acoes').innerText()) && /\(faltam 1\)$/.test(await C.locator('#ger-resumo').innerText()),
      'a Selene continua esperando a jogadora (os NPCs não a incluem), e o resumo diz que falta uma: ' + await C.locator('#ger-resumo').innerText());
    await J.locator('#feed .ped .ped-fx').fill('3'); await w(200, J);
    antes = (await linhas(M)).length;
    await J.locator('#feed .ped button.pri').click();
    ok(await ate(async () => (await linhas(M)).length === antes + 1), 'a jogadora rola pelo cartão');
    r = await ultima(M);
    ok(r.autor === 'Dalmo' && r.d.k === 'fixa' && r.d.titulo === 'Selene · Percepção (Floresta)' && r.d.total >= 4 && r.d.total <= perSel && igual(r.d.sis, { t: 'ra', p: pedG.id, c: 'pc_selene', v: r.d.total, a: perSel, f: 3, d: r.d.total - 3 }),
      'a rolagem dela é uma rolagem comum (1d' + (perSel - 3) + ' + 3), com o recado para a janela do mestre: ' + JSON.stringify(r.d));
    const rolouSel = r.d.total;
    ok(await ate(async () => (await C.locator('#ger-como-0').innerText()) === `rolou ${rolouSel} (${rolouSel - 3} no d${perSel - 3} + 3)` && (await C.locator('#ger-res-0').innerText()) === String(rolouSel), 15000),
      'a janela do mestre recebe a rolagem dela, com a conta: ' + await C.locator('#ger-como-0').innerText());
    ok(await ate(async () => new RegExp('Selene\\s+rolou ' + rolouSel).test(await cartaoG()) && await J.locator('#feed .ped button.pri').count() === 0, 10000), 'no cartão dela, o botão dá lugar a "rolou ' + rolouSel + '"');
    const esperado = 'Do maior para o menor: ' + [['Selene', rolouSel], ['Goblin batedor', doGob.d.total], ['Lobo', doLobo.d.total]].map((x, i) => x.concat(i)).sort((p, q) => q[1] - p[1] || p[2] - q[2]).map(x => x[0] + ' ' + x[1]).join(' · ');
    ok(await ate(async () => (await C.locator('#ger-resumo').innerText()) === esperado, 8000) && /Todos os jogadores já rolaram/.test(await C.locator('#ger-acoes').innerText()),
      'o resumo diz quem tirou mais: ' + await C.locator('#ger-resumo').innerText());
    await C.locator('.modal .btn.primary').click(); await w(400);
    ok(await C.locator('#ger-lista').count() === 0, '(Fechar)');
    ok(await ate(async () => { const p = (await linhas(M)).find(x => x.id === pedG.id); return !!p && p.d.pd.fim === 'aplicado'; }, 15000) && await ate(async () => /O mestre encerrou a rolagem\./.test(await cartaoG()), 15000),
      'fechando a janela com todos rolados, o pedido se encerra — e o cartão da jogadora diz que o mestre encerrou a rolagem');

    // ---------- de novo, sem seleção: "Cancelar o pedido" e "Rolar por ele" ----------
    await C.evaluate(() => __tc.setSel([])); await w(150);
    await tecla(C, 'F', true); await w(450);
    ok(await C.locator('#ger-quem').inputValue() === 'jog' && await C.locator('#ger-lista .atq-row').count() === 1 && await C.locator('#ger-a-PER.on').count() === 1, 'sem seleção, Shift+F começa pelos personagens dos jogadores (só a Selene), com o último atributo');
    await C.locator('#ger-a-AGI').click(); await w(150);
    const agiSel = valor(await fichaDe('pc_selene'), 'pc_selene', 'AGI');
    antes = (await linhas(M)).length;
    await C.locator('#ger-pedir').click();
    ok(await ate(async () => (await linhas(M)).length === antes + 1), '(um pedido de Agilidade)');
    const pedA = await ultima(M);
    ok(await ate(async () => await J.locator('#feed .ped').count() === 2 && /rolem Agilidade/.test(await cartaoG()), 20000), '(chega à jogadora)');
    // uma resposta da dona que não cabe na Agilidade dela não entra (a janela avisa)
    await semAvisos(C);
    await J.evaluate(async ([id, v]) => { await TC.aoVivo.rolagem({ k: 'fixa', titulo: 'forjada', total: v, resumo: 'x', sis: { t: 'ra', p: id, c: 'pc_selene', v } }, { secreta: false }); }, [pedA.id, agiSel + 50]);
    ok(await ate(async () => new RegExp('A rolagem de Selene \\(' + (agiSel + 50) + '\\) não cabe em Agilidade dele agora \\(' + agiSel + '\\)').test(await aviso(C)), 15000) && (await C.locator('#ger-como-0').innerText()) === 'esperando Dalmo',
      'uma resposta que não cabe no atributo não entra: a janela avisa e continua esperando: ' + await aviso(C));
    await C.locator('#ger-despedir').click(); await w(300);
    ok(await ate(async () => { const p = (await linhas(M)).find(x => x.id === pedA.id); return !!p && p.d.pd.fim === 'cancelado'; }, 15000) && await ate(async () => /O mestre cancelou este pedido/.test(await cartaoG()), 15000),
      '"Cancelar o pedido" encerra o pedido na mesa, e a jogadora vê');
    ok(await C.locator('#ger-pedir').count() === 1 && !(await C.locator('#ger-a-FOR').isDisabled()) && (await C.locator('#ger-como-0').innerText()) === 'falta rolar', 'a janela destrava: dá para mudar o atributo e pedir de novo');
    antes = (await linhas(M)).length;
    await C.locator('#ger-pedir').click();
    ok(await ate(async () => (await linhas(M)).length === antes + 1), '(outro pedido)');
    const pedB = await ultima(M);
    ok(await ate(async () => await J.locator('#feed .ped').count() === 3 && await J.locator('#feed .ped').last().locator('button.pri').count() === 1, 20000), '(chega à jogadora, com o botão)');
    antes = (await linhas(M)).length;
    await C.locator('#ger-rolar-0').click();
    ok(await ate(async () => (await linhas(M)).length === antes + 1), 'o mestre rola no lugar dela ("Rolar por ele")');
    r = await ultima(M);
    ok(r.autor === 'Bruno' && r.d.titulo === 'Selene · Agilidade' && !r.secreta && !!r.d.sis && r.d.sis.t === 'ra' && r.d.sis.p === pedB.id && r.d.sis.c === 'pc_selene' && r.d.sis.v === r.d.total && r.d.sis.a === agiSel && / · pelo mestre$/.test(await C.locator('#ger-como-0').innerText()),
      'a rolagem do mestre vale como a resposta dela (o recado vai junto): ' + JSON.stringify(r.d.sis) + ' · ' + await C.locator('#ger-como-0').innerText());
    ok(await ate(async () => new RegExp('Selene\\s+rolou ' + r.d.total + ' \\(pelo mestre\\)').test(await cartaoG()) && await J.locator('#feed .ped').last().locator('button.pri').count() === 0, 15000), 'o cartão da jogadora mostra "rolou ' + r.d.total + ' (pelo mestre)", sem o botão');
    await C.locator('.modal .btn.primary').click(); await w(300);
    ok(await ate(async () => { const p = (await linhas(M)).find(x => x.id === pedB.id); return !!p && p.d.pd.fim === 'aplicado'; }, 15000), '(fechando, o pedido se encerra)');
    // as regras do pedido, direto na casca: só o mestre pede, e só um atributo que existe
    const pedirDireto = (p, atr) => p.evaluate(async atr => { try { await TC.aoVivo.pedirRolagem({ rot: 'x', atr, alvos: [{ c: 'pc_selene', n: 'Selene' }] }); return 'pediu'; } catch (e) { return e.message; } }, atr);
    ok(await pedirDireto(M, 'NADA') === 'O pedido veio vazio: escolha o atributo e quem rola.' && await pedirDireto(J, 'PER') === 'Só o mestre pede a rolagem.', 'um pedido com um atributo que não existe não é escrito, e a jogadora não pede rolagem');
    // ---------- um pedido para a personagem de outra jogadora: a Dalmo não responde por ela ----------
    const brisa = await C.evaluate(() => {
      const u = __tc, sc = u.Store.scene(), cl = sc.cell, k = u.newToken(sc, cl * 15, cl * 3, { name: 'z' });
      u.Store.tx('Criar', () => u.Store.add('tokens', k));
      u.Fichas.link(u.Store.get('tokens', k.id), 'pc_brisa');
      u.setSel([{ c: 'tokens', id: k.id }]);
      return k.id;
    });
    await w(300);
    await tecla(C, 'F', true); await w(450);
    ok(await C.locator('#ger-lista .atq-row').count() === 1 && /Brisa/.test(await gerTxt()) && await C.locator('#ger-pedir').count() === 1, '(a rolagem geral só com a Brisa, da Lia)');
    antes = (await linhas(M)).length;
    await C.locator('#ger-pedir').click();
    ok(await ate(async () => (await linhas(M)).length === antes + 1), '(o pedido para a Brisa)');
    const pedL = await ultima(M);
    ok(await ate(async () => (await C.locator('#ger-como-0').innerText()) === 'esperando Lia', 8000), '(a janela espera a Lia)');
    await J.evaluate(async id => { await TC.aoVivo.rolagem({ k: 'fixa', titulo: 'forjada', total: 1, resumo: 'x', sis: { t: 'ra', p: id, c: 'pc_brisa', v: 1 } }, { secreta: false }); }, pedL.id);
    await w(4000);
    ok((await C.locator('#ger-como-0').innerText()) === 'esperando Lia', 'a Dalmo tenta responder pela Brisa (da Lia): a janela do mestre ignora');
    await C.locator('#ger-despedir').click(); await w(300);
    await C.locator('.modal .btn.primary').click(); await w(300);
    await C.evaluate(id => { const u = __tc; u.Store.tx('Tirar', () => u.Store.del('tokens', id)); u.setSel([]); }, brisa);

    // ---------- E: os itens complementares, com as regras de verdade ----------
    await M.evaluate(() => {
      const P = TC.dados.col('personagens'), l = P.pegar('pc_selene');
      const novos = [{ id: 'i_eg1', nome: 'Espada do Gelo I', troca: 'Espada de gelo', equipado: true, bonus: { FOR: 3 } }, { id: 'i_bai', nome: 'Bainha de Selene', req: 'g:Espada de gelo', equipado: true, bonus: { DFF: 2 } }];
      P.gravar('pc_selene', { ficha: Object.assign({}, l.ficha, { itens: l.ficha.itens.concat(novos) }) });
    });
    ok(await ate(async () => await C.evaluate(id => __tc.Fichas.itens(__tc.Store.get('tokens', id)).some(x => x.id === 'i_bai'), ids.sel), 15000), '(a espada e a bainha chegam às Cenas)');
    { const [x, y] = await noMapa(C, ids.sel); await M.mouse.move(x, y); await w(200); }
    await semAvisos(C);
    await tecla(C, 'e'); await w(350);
    const reqE = () => C.evaluate(() => [...document.querySelectorAll('#epop .eq-req')].map(c => c.innerText.trim() + (c.classList.contains('falta') ? ' [falta]' : '')));
    ok(JSON.stringify(await reqE()) === JSON.stringify(['com Espada de gelo']), 'na janelinha E, a Bainha diz com o que funciona: ' + JSON.stringify(await reqE()));
    await C.locator('#eq-i_eg1').click(); await w(300);
    ok(await ate(async () => !/Espada do Gelo I|Bainha/.test(await equipados(M, 'pc_selene')) && await parado(M)) && /Guardou Espada do Gelo I; guardou junto: Bainha de Selene\./.test(await aviso(C)) && await C.locator('#eq-i_bai.on').count() === 0,
      'guardar a espada guarda a Bainha junto (na ficha e na janelinha): ' + await aviso(C));
    await C.locator('.toast-a', { hasText: 'Desfazer' }).last().click(); await w(300);
    ok(await ate(async () => /Espada do Gelo I, Bainha de Selene/.test(await equipados(M, 'pc_selene')) && await parado(M)) && await M.evaluate(() => TC.dados.col('personagens').pegar('pc_selene').ficha.itens.every(x => !x.volta)),
      'Desfazer devolve as duas (sem a marca de "volta junto")');
    await C.locator('#eq-i_eg1').click(); await w(300);          // (guarda de novo: a Bainha vai junto)
    ok(await ate(async () => !/Espada do Gelo I|Bainha/.test(await equipados(M, 'pc_selene')) && await parado(M)), '(guardadas)');
    await semAvisos(C);
    await C.locator('#eq-i_bai').click(); await w(300);
    ok(await ate(async () => /Espada do Gelo I, Bainha de Selene/.test(await equipados(M, 'pc_selene')) && await parado(M)) && /Equipou Bainha de Selene; junto: Espada do Gelo I\./.test(await aviso(C)), 'equipar a Bainha sem a espada equipa a espada junto: ' + await aviso(C));
    // equipada sem a espada (a ficha mexida por fora): "sem efeito", e a janelinha acompanha
    await M.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_selene'); P.gravar('pc_selene', { ficha: Object.assign({}, l.ficha, { itens: l.ficha.itens.map(x => (x.id === 'i_eg1' ? Object.assign({}, x, { equipado: false }) : x)) }) }); });
    ok(await ate(async () => JSON.stringify(await reqE()) === JSON.stringify(['sem efeito · precisa de Espada de gelo [falta]']), 15000), 'equipada sem a espada, a Bainha fica "sem efeito": ' + JSON.stringify(await reqE()));
    // (lote 7) por tipo, como na ficha, e com o nível de agora do item com níveis
    await M.evaluate(() => {
      const P = TC.dados.col('personagens'), l = P.pegar('pc_selene'), R = TC.rules, tipos = { i_eg1: 'arma', i_esp: 'arma', i_mac: 'arma', i_bai: 'acessorio' };
      const itens = l.ficha.itens.map(x => {
        const y = Object.assign({}, x); if (tipos[x.id]) y.tipo = tipos[x.id];
        return x.id === 'i_eg1' ? R.itemNoNivel(Object.assign(y, { niveis: [{ bonus: { FOR: 3 } }, { bonus: { FOR: 5 } }] }), 2) : y;
      });
      P.gravar('pc_selene', { ficha: Object.assign({}, l.ficha, { itens }) });
    });
    const secoesE = () => C.evaluate(() => { let s = ''; const out = {}; for (const el of document.querySelectorAll('#eq-lista > *')) { if (el.classList.contains('eq-sec')) s = el.textContent; else if (el.id) out[el.id.slice(3)] = s; } return out; });
    ok(await ate(async () => { const m = await secoesE(); return m.i_eg1 === 'Armas' && m.i_esp === 'Armas' && m.i_mac === 'Armas' && m.i_bai === 'Acessórios' && m.i_ane === 'Sem tipo'; }, 15000),
      '(lote 7) na janelinha E, os itens por tipo, como na ficha: ' + JSON.stringify(await secoesE()));
    ok(JSON.stringify((await C.locator('#epop .eq-sec').allInnerTexts()).map(x => x.toUpperCase())) === JSON.stringify(['ARMAS', 'ACESSÓRIOS', 'SEM TIPO']), '(os títulos das seções, na ordem dos tipos)');
    ok(await C.locator('#eq-i_eg1 .eq-nv').innerText() === 'Nv 2' && (await C.locator('#eq-i_eg1 .eq-b').innerText()).includes('FOR +5'), 'e o item com níveis mostra o de agora (Nv 2), com os números dele');
    await M.keyboard.press('Escape'); await w(200);
    }

    if (parteB) {
    // ---------- as pastas da lista de cenas; o ícone do Mapa-múndi ----------
    const cena = await C.evaluate(() => ({ id: __tc.Store.S.current, nome: __tc.Store.scene().name }));
    // um mapa do Mapa-múndi com um marcador que abre esta cena
    await M.evaluate(id => TC.dados.col('documentos').gravar('mundo:mapa:mpl6t', { dados: { v: 1, id: 'mpl6t', nome: 'Urgm', objs: [{ id: 'mkl6t', k: 'm', nome: 'Vila do Rio', x: 400, y: 300, liga: { t: 'cena', id } }] }, vis: 'mestre' }), cena.id);
    ok(await ate(() => parado(M)), '(o mapa sobe para a mesa)');
    await C.locator('#sceneBtn').click(); await w(300);
    const itemCena = C.locator('.menu .menu-i', { hasText: cena.nome });
    ok(await itemCena.locator('.menu-m').count() === 1 && (await itemCena.locator('.menu-m').getAttribute('title')) === 'No Mapa-múndi: Vila do Rio', 'na lista de cenas, a cena que um marcador do Mapa-múndi abre ganha o ícone do mundo (com o nome do marcador)');
    await C.locator('.menu-i', { hasText: 'Organizar as cenas…' }).click(); await w(400);
    ok(await C.locator('#org-p-solta #org-c-' + cena.id).count() === 1 && await C.locator('#org-c-' + cena.id + ' .org-n').getAttribute('title') === 'No Mapa-múndi: Vila do Rio', '"Organizar as cenas…": a cena, ainda sem pasta (o ícone do mundo também aqui)');
    await C.locator('#org-nova').click(); await w(300);
    await C.locator('#dlg-in').fill('  Combates  '); await C.locator('.modal .btn.primary').click(); await w(450);
    const pastaId = await C.evaluate(() => (__tc.Store.S.pastas.lista[0] || {}).id || null);
    ok(!!pastaId && await C.locator('#org-p-' + pastaId).count() === 1 && /Pasta "Combates" criada/.test(await aviso(C)), 'Nova pasta: "Combates" (e a janela volta)');
    await C.locator('#org-s-' + cena.id).selectOption('p:' + pastaId); await w(350);
    ok(await C.locator('#org-p-' + pastaId + ' #org-c-' + cena.id).count() === 1 && new RegExp('"' + cena.nome + '" foi para a pasta Combates').test(await aviso(C)), 'escolhendo a pasta ao lado da cena, ela vai para "Combates"');
    ok(await ate(async () => await M.evaluate(([pid, cid]) => { const l = TC.dados.col('documentos').pegar('cenas:indice'), p = l && l.dados && l.dados.pastas; return !!p && p.lista.length === 1 && p.lista[0].nome === 'Combates' && p.de[cid] === pid; }, [pastaId, cena.id]) && await parado(M), 20000),
      'as pastas vão para a mesa, no índice das cenas');
    ok(await J.evaluate(() => !TC.dados.col('documentos').pegar('cenas:indice')), 'o índice é só do mestre: a jogadora não recebe as pastas');
    await C.locator('.modal .btn.primary').click(); await w(300);
    await C.locator('#sceneBtn').click(); await w(300);
    ok(await C.locator('#mp-' + pastaId).count() === 1 && (await C.locator('#mp-' + pastaId).innerText()).replace(/\s+/g, ' ').trim() === 'Combates 1' && await C.locator('.menu .menu-i.dentro', { hasText: cena.nome }).locator('.menu-m').count() === 1,
      'na lista de cenas: a pasta "Combates", com a cena dentro (e o ícone do mundo)');
    await foto(M, 'l6-pastas-mesa');
    await M.keyboard.press('Escape'); await w(200);
    // com outro aparelho, o mestre encontra as pastas (elas estão na mesa, não no navegador)
    {
      const d2 = await t.device({ name: 'mestre2', seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } }), M2 = d2.page;
      await M2.goto(t.base + '?debug', { waitUntil: 'load' }); await M2.waitForTimeout(1500);
      await loginTela(M2, c.mestre, c.senha);
      await M2.evaluate(async nome => { const m = (await TC.mesas.lista()).find(x => x.nome === nome); await TC.mesas.abrir(m.id); }, nomeMesa);
      await M2.waitForTimeout(800);
      if (await M2.locator('dialog[open]').count()) { await M2.keyboard.press('Escape'); await M2.waitForTimeout(300); }
      await M2.locator('#tab-cenas').click();
      let C2 = null;
      ok(await ate(async () => { C2 = await quadro(M2, /\/cenas\//); return C2 && await C2.evaluate(([pid, cid]) => !!window.__tc && __tc.Nuvem.modo() === 'mestre' && !!__tc.Store.S.pastas && __tc.Store.S.pastas.de[cid] === pid && __tc.Store.S.pastas.lista.length === 1, [pastaId, cena.id]); }, 40000),
        'o mestre, em outro aparelho, encontra a cena na pasta "Combates" (as pastas estão na mesa, não no navegador)');
      await d2.ctx.close();
    }

    // ---------- o vilarejo, numa mesa: o fundo pintado vai para o Storage, e a jogadora recebe as casas ----------
    await C.locator('#sceneBtn').click(); await w(300);
    await C.locator('.menu-i', { hasText: 'Gerar um lugar…' }).click(); await w(600);
    ok(await C.locator('#ger-prev').count() === 1 && /casas/.test(await C.locator('#ger-resumo').innerText()), '"Gerar um lugar…": a janela, com a prévia');
    await C.locator('#ger-arredores button', { hasText: 'Nenhum' }).click(); await w(400);      // (lote 14, parte 14c: o lugar sozinho)
    await C.locator('#ger-nome').fill('Pedravale de teste');
    const nCenas = await C.evaluate(() => __tc.Store.S.order.length);
    await C.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click();
    ok(await ate(async () => await C.evaluate(n => __tc.Store.S.order.length === n + 1 && __tc.Store.scene().name === 'Pedravale de teste' && !document.querySelector('#ger-prev'), nCenas), 40000), 'Criar a cena: a cena nova abre');
    const vila = await C.evaluate(() => { const u = __tc, sc = u.Store.scene(); return { id: sc.id, paredes: sc.walls.length, portas: sc.walls.filter(w => w.k === 'door').length, janelas: sc.walls.filter(w => w.k === 'window').length, nomes: sc.shapes.filter(s => s.k === 'text').map(s => s.txt), moveis: sc.tokens.filter(t => t.prop).length, nev: sc.fog.dynamic, fundo: (u.Store.S.assets[sc.bg.asset] || {}).url || '' }; });
    const pastaMesa = await M.evaluate(() => TC_CONFIG.url + '/storage/v1/object/public/mesas/' + TC.mesas.atual.id + '/');
    ok(vila.paredes > 8 && vila.portas >= 3 && vila.janelas >= 3 && vila.nomes.length === 0 && vila.moveis > 3 && vila.nev && vila.fundo.startsWith(pastaMesa),
      'com as paredes, as portas, as janelas e os móveis de cada casa (nada escrito: os nomes ficam com o mestre) — e o fundo pintado vira um arquivo na pasta da mesa: ' + JSON.stringify(Object.assign({}, vila, { fundo: vila.fundo.slice(-24) })));
    ok(await ate(async () => { const d = await M.evaluate(id => { const l = TC.dados.col('documentos').pegar('cena:' + id + ':m'); return l && l.dados ? { walls: (l.dados.walls || []).length, url: ((l.dados.imgs || {})[(l.dados.bg || {}).asset] || {}).url || '' } : null; }, vila.id); return !!d && d.walls === vila.paredes && d.url === vila.fundo && await parado(M); }, 30000),
      'e é guardada na mesa como as outras (o mapa, com as paredes e o endereço do fundo)');
    const naRede = await M.evaluate(async u => { const r = await fetch(u); const b = await r.blob(); return [r.status, b.type, b.size > 2000]; }, vila.fundo);
    ok(naRede[0] === 200 && /^image\//.test(naRede[1]) && naRede[2], 'o fundo abre pelo endereço do banco: ' + JSON.stringify(naRede));
    await C.locator('#airBtn').click(); await w(250);
    await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(400);
    await J.evaluate(() => { const v = document.getElementById('vivo'); if (!v.hidden) document.getElementById('vivoX').click(); }); await w(300, J);
    await J.locator('#tab-cenas').click();
    ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(id => !!window.__tc && __tc.Store.S.current === id, vila.id); }, 40000), 'a jogadora passa a ver o vilarejo');
    const vj = await B.evaluate(() => { const u = __tc, sc = u.Store.scene(); return { paredes: sc.walls.length, nomes: sc.shapes.filter(s => s.k === 'text').map(s => s.txt).sort(), moveis: sc.tokens.filter(t => t.prop).length, nev: sc.fog.dynamic, fundo: !!sc.bg.asset && /^https:/.test((u.Store.S.assets[sc.bg.asset] || {}).url || '') }; });
    ok(vj.paredes === vila.paredes && JSON.stringify(vj.nomes) === JSON.stringify(vila.nomes.slice().sort()) && vj.moveis === vila.moveis && vj.nev && vj.fundo,
      'com as mesmas paredes (que escondem o lado de dentro das casas), os móveis, nada escrito e o fundo: ' + JSON.stringify(vj));
    ok(await ate(async () => await B.evaluate(() => { const a = __tc.Store.S.assets[__tc.Store.scene().bg.asset]; return !!a && !!__tc.Assets.img(a.id) && __tc.Render.stats.frames > 0 && !(__tc.Render.stats.fail > 0); }), 20000), 'o fundo do vilarejo desenha na tela da jogadora');
    await foto(J, 'l6-vilarejo-jogadora');
    }

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
