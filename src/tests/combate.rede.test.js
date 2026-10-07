// "Combate", numa mesa de verdade (projeto real), com o mestre e um jogador em aparelhos separados:
//   · puxar o grupo: os tokens de um grupo das Fichas entram de uma vez, ligados às fichas, num passo de desfazer;
//   · terreno: a área que o mestre pinta chega ao jogador, diz o que é e não se deixa selecionar nem forjar;
//   · F: a janelinha de atributos do token (o mestre, em qualquer token ligado; o jogador, no do personagem dele);
//   · a fixa de cada turno de quem joga mais de uma vez por rodada (um chefe);
//   · C: a disputa entre dois tokens, que vai para a mesa ao vivo (em segredo, se um deles está oculto);
//   · ataque com defesa: a defesa escolhida desconta o dano; mínimo e máximo depois do desconto; token sem ficha
//     com o dano digitado; os jogadores rolam a defesa a pedido, pela mesa ao vivo; nada muda antes de "Aplicar".
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const R = require('../../tc/rules.js');
const { ok, end } = checker();
const ficha = (nome, extra) => Object.assign({ nome, raca: 'Elfa da neve', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, defEsp: { FOGO: 4 }, rol: { fixa: 5, fonte: 'total' }, ini: 'AGI/5', disputa: {}, estaque: { a: '', b: '' }, habilidades: [], itens: [], notas: '', recursos: [{ id: 'hp', nome: 'HP', fml: '100' }] }, extra);
const selene = ficha('Selene');
const goblin = ficha('Goblin batedor', { lado: 'Inimigo', grupo: 'Bando', level: 1, ini: '1', defesas: { DFF: 12, DFM: 2 }, defEsp: {}, rol: { fixa: 2, fonte: 'total' } });
const orc = ficha('Orc bruto', { lado: 'Inimigo', grupo: 'Bando', level: 2, ini: '0' });
const lobo = ficha('Lobo', { lado: 'Inimigo', level: 1, ini: '3' });
// igualdade de conteúdo, sem ligar para a ordem das chaves (o banco devolve os objetos com as chaves reordenadas)
const igual = (a, b) => {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => igual(a[k], b[k]));
};
const valor = (f, id, k) => Math.max(0, Math.round(R.valorDoAtributo(R.calcular(Object.assign({}, f, { id }), R.cfgPadrao(), {}), k, 'total') || 0));
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const dM = await t.device({ name: 'mestre', seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } }), M = dM.page;
  const dJ = await t.device({ name: 'jogador', w: 1300, h: 860, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } }), J = dJ.page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 60) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const linhas = p => p.evaluate(() => TC.aoVivo.itens.filter(l => l.tipo === 'rolagem').map(l => ({ id: l.id, autor: l.autor_nome, secreta: l.secreta, d: l.dados })));
  const ultima = async (p, fn) => { const ls = await linhas(p); for (let i = ls.length - 1; i >= 0; i--) if (!fn || fn(ls[i])) return ls[i]; return null; };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  // o centro de um token, em coordenadas da página inteira (o mapa mora numa moldura)
  const noMapa = async (f, id) => { const b = await f.locator('#cv').boundingBox(); const p = await f.evaluate(id => { const u = __tc, sc = u.Store.scene(), k = u.Store.get('tokens', id), s = k.size * sc.cell; return u.Render.toScreen(k.x + s / 2, k.y + s / 2); }, id); return [b.x + p[0], b.y + p[1]]; };
  const ponto = async (f, x, y) => { const b = await f.locator('#cv').boundingBox(); const p = await f.evaluate(([x, y]) => __tc.Render.toScreen(x, y), [x, y]); return [b.x + p[0], b.y + p[1]]; };
  const tecla = (f, k) => f.evaluate(k => { window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }, k);
  const aviso = f => f.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const tok = (f, id) => f.evaluate(id => { const k = __tc.Store.get('tokens', id); return k ? JSON.parse(JSON.stringify(k)) : null; }, id);
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const hp = async (f, id) => { const k = await tok(f, id); const b = k && k.bars.find(x => x.n === 'HP'); return b ? b.v : null; };

  // ---------- a mesa, as fichas, as Cenas ----------
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Combate E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {      // (se algo quebrar no meio, a mesa de teste é apagada do mesmo jeito: ver o "finally")
  await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
  await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
  const jogId = await J.evaluate(() => TC.conta.usuario.id);
  await M.evaluate(([fs, uid]) => {
    const P = TC.dados.col('personagens'), base = { skills: { arvores: [], pontos: {}, alocados: {} }, estado: {} };
    P.gravar('pc_selene', Object.assign({}, base, { nome: 'Selene', ficha: fs[0], dono_id: uid, vis: 'mesa', ordem: 0 }));
    P.gravar('pc_gob', Object.assign({}, base, { nome: 'Goblin batedor', ficha: fs[1], dono_id: null, vis: 'mestre', ordem: 1 }));
    P.gravar('pc_orc', Object.assign({}, base, { nome: 'Orc bruto', ficha: fs[2], dono_id: null, vis: 'mestre', ordem: 2 }));
    P.gravar('pc_lobo', Object.assign({}, base, { nome: 'Lobo', ficha: fs[3], dono_id: null, vis: 'mesa', ordem: 3 }));      // (ficha do mestre que a mesa toda vê)
  }, [[selene, goblin, orc, lobo], jogId]);
  ok(await ate(() => parado(M)), '(as fichas sobem para a mesa)');
  await M.locator('#tab-cenas').click();
  let C = null;
  ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'mestre' && __tc.Fichas.on() && !!__tc.Fichas.get('pc_lobo') && __tc.Store.S.players.some(p => p.id === id), jogId); }, 40000), '(o mestre está nas Cenas, com as fichas e o jogador da mesa)');
  if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }

  // ---------- puxar o grupo ----------
  ok(await C.locator('#sel-grupo').count() === 1, 'com nada selecionado, o painel oferece "Puxar o grupo…"');
  await C.locator('#sel-grupo').click(); await w(300);
  const conjuntos = await C.locator('#gr-cj option').allInnerTexts();
  ok(conjuntos.join(' | ') === 'Personagens dos jogadores (1) | Grupo: Bando (2) | Sem grupo (2) | Todas as fichas da mesa (4)', 'a janela lista de onde trazer: os dos jogadores, cada grupo das Fichas, os sem grupo e todos: ' + conjuntos.join(' | '));
  await C.locator('#gr-cj').selectOption('g:Bando'); await w(250);
  ok(await C.locator('#gr-lista li').count() === 2 && (await C.locator('#gr-conta').innerText()) === '2 de 2 marcados' && (await C.locator('#gr-lista').innerText()).includes('Goblin batedor') && (await C.locator('#gr-lista').innerText()).includes('NPC · Bando'), 'escolhendo o grupo "Bando", aparecem os dois personagens dele, já marcados');
  ok(await C.evaluate(() => __tc.Store.scene().tokens.length) === 0, 'nada entra na cena antes de confirmar');
  await foto(M, 'combate-grupo');
  await C.locator('.modal .btn.primary').click(); await w(500);
  let cena = await C.evaluate(() => { const u = __tc, sc = u.Store.scene(); return { toks: sc.tokens.map(k => ({ id: k.id, name: k.name, char: k.char, owner: k.owner, hidden: k.hidden, x: k.x, y: k.y, bars: k.bars.map(b => [b.n, b.v, b.m, b.ref || null]) })), sel: u.App.sel.length, cols: sc.cols, rows: sc.rows, cell: sc.cell }; });
  ok(cena.toks.length === 2 && cena.toks.map(k => k.name).sort().join() === 'Goblin batedor,Orc bruto' && cena.toks.every(k => (k.char === 'pc_gob' || k.char === 'pc_orc') && !k.owner && !k.hidden && k.bars.length === 1 && k.bars[0].join() === 'HP,100,100,hp') && cena.sel === 2,
    'os dois tokens nascem ligados às fichas (nome e barra HP da ficha), como NPCs, e ficam selecionados: ' + JSON.stringify(cena.toks));
  ok(cena.toks[0].x !== cena.toks[1].x || cena.toks[0].y !== cena.toks[1].y, 'cada um no seu quadrado');
  ok(/2 tokens criados, ligados às fichas/.test(await aviso(C)), 'o aviso diz quantos entraram, com Desfazer: ' + await aviso(C));
  await C.evaluate(() => __tc.Tools.undo()); await w(300);
  ok(await C.evaluate(() => __tc.Store.scene().tokens.length) === 0, 'um Desfazer tira os dois de uma vez');
  await C.evaluate(() => __tc.Tools.redo()); await w(300);
  ok(await C.evaluate(() => __tc.Store.scene().tokens.length) === 2, '(e Refazer os traz de volta)');
  // o personagem da jogadora: o token já nasce dela
  await C.evaluate(() => __tc.setSel([])); await w(250);
  await C.locator('#sel-grupo').click(); await w(300);
  await C.locator('#gr-cj').selectOption('@jog'); await w(250);
  await C.locator('#gr-oculto').check({ force: true }); await w(100); await C.locator('#gr-oculto').uncheck({ force: true });
  await C.locator('.modal .btn.primary').click(); await w(500);
  const ids = await C.evaluate(() => { const o = {}; for (const k of __tc.Store.scene().tokens) o[k.char] = k.id; o.cena = __tc.Store.scene().id; return o; });
  let sel = await tok(C, ids.pc_selene);
  ok(sel && sel.owner === jogId && sel.barVis === 'num' && sel.name === 'Selene' && sel.bars[0].ref === 'hp', 'o token da personagem da jogadora já nasce dela (dono) e com os números à mostra: ' + JSON.stringify(sel && { owner: sel.owner, barVis: sel.barVis }));
  await C.evaluate(() => __tc.setSel([])); await w(250);
  await C.locator('#sel-grupo').click(); await w(300);
  await C.locator('#gr-cj').selectOption('@todos'); await w(250);
  ok(await C.locator('#gr-lista input:disabled').count() === 3 && (await C.locator('#gr-conta').innerText()) === '1 de 1 marcados' && (await C.locator('#gr-lista').innerText()).split('já está na cena').length === 4, 'quem já tem token nesta cena aparece travado ("já está na cena"); só o Lobo pode vir');
  await M.keyboard.press('Escape'); await w(300);
  ok(await C.evaluate(() => __tc.Store.scene().tokens.length) === 3, 'cancelar a janela não cria nada');
  ok(await C.evaluate(() => __tc.Combate.trazer(['pc_selene', 'pc_gob', 'pc_nao_existe'], 0, 0).length) === 0 && await C.evaluate(() => __tc.Store.scene().tokens.length) === 3, 'quem já tem token na cena (ou não existe) não entra de novo, nem por engano');

  // um token sem ficha, com uma barra HP (para o ataque), e a cena vai ao ar
  ids.barril = await C.evaluate(() => { const u = __tc, sc = u.Store.scene(); const b = u.newToken(sc, sc.cell * 12, sc.cell * 2, { name: 'Barril', bars: [u.cleanBar({ n: 'HP', c: '#d6524b', v: 20, m: 20, k: 'bar', on: true, vis: '' })] }); u.Store.tx('Criar', () => u.Store.add('tokens', b)); return b.id; });
  await C.locator('#airBtn').click(); await w(250);
  await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(300);
  await J.locator('#tab-cenas').click();
  let B = null;
  ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && !!__tc.Store.get('tokens', id) && !!__tc.Fichas.get('pc_selene'), ids.pc_selene); }, 40000), '(a jogadora vê a cena no ar, com o token dela)');

  // ---------- terreno ----------
  await tecla(C, 'q'); await w(300);
  ok(await C.evaluate(() => __tc.App.tool) === 'terrain' && await C.locator('#tool-terrain').count() === 1 && await C.locator('#o-tm').count() === 1, 'a tecla Q abre a ferramenta Terreno (ela também está no trilho)');
  await C.locator('#o-ts button', { hasText: 'Retângulo' }).click(); await w(200);
  await C.locator('#o-tt').selectOption('montanha'); await w(200);
  ok(await C.locator('#o-th').inputValue() === '9', 'cada tipo traz uma altura de fábrica (montanha: 6 quadrados de 1,5 m = 9)');
  await C.locator('#o-th').fill('4.5'); await C.locator('#o-th').press('Tab'); await w(200);
  { // a área cobre o quadrado da Selene
    const cell = cena.cell, [x0, y0] = await ponto(C, sel.x - cell, sel.y - cell), [x1, y1] = await ponto(C, sel.x + cell * 2, sel.y + cell * 2);
    await M.mouse.move(x0, y0); await M.mouse.down(); await M.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 3 }); await M.mouse.move(x1, y1, { steps: 3 }); await M.mouse.up(); await w(400);
  }
  let ter = await C.evaluate(() => __tc.Store.scene().shapes.filter(s => s.ter).map(s => ({ id: s.id, k: s.k, ter: s.ter, gm: s.gm, by: s.by, w: s.w, h: s.h })));
  ok(ter.length === 1 && ter[0].k === 'rect' && ter[0].ter.t === 'montanha' && ter[0].ter.h === 4.5 && !ter[0].gm && ter[0].w === cena.cell * 3 && ter[0].h === cena.cell * 3, 'arrastando, nasce uma área de montanha de 3 × 3 quadrados com a altura digitada: ' + JSON.stringify(ter));
  ok(await C.evaluate(id => { const u = __tc, sc = u.Store.scene(), k = u.Store.get('tokens', id); return u.Combate.terBadge(u.Combate.terrainOf(k, sc), sc); }, ids.pc_selene) === '▲4,5 m', 'o token que está em cima passa a mostrar a altura (▲4,5 m)');
  await foto(M, 'combate-terreno-ferramenta');
  await tecla(C, 'v'); await w(300);
  { const [x, y] = await ponto(C, sel.x + cena.cell * 1.7, sel.y + cena.cell * 1.7); await M.mouse.move(x, y); await w(250); }
  await foto(M, 'combate-terreno-mapa');
  ok((await C.locator('#status').innerText()).includes('Montanha · altura 4,5 m') && await C.locator('#cv').getAttribute('title') === 'Montanha · altura 4,5 m', 'passando o mouse, o rodapé e a dica do mapa dizem o que é: ' + await C.locator('#status').innerText());
  { const [x, y] = await ponto(C, sel.x + cena.cell * 1.7, sel.y + cena.cell * 1.7); await M.mouse.click(x, y); await w(250); }
  ok(await C.evaluate(() => __tc.App.sel.length) === 0, 'com a ferramenta Selecionar, um clique no terreno não seleciona nada (ele é parte do mapa)');
  ok(await ate(async () => await B.evaluate(() => __tc.Store.scene().shapes.some(s => s.ter && s.ter.t === 'montanha' && s.ter.h === 4.5)), 20000), 'a área chega ao mapa da jogadora');
  ok(await B.evaluate(id => { const u = __tc, sc = u.Store.scene(), k = u.Store.get('tokens', id); return u.Combate.terBadge(u.Combate.terrainOf(k, sc), sc); }, ids.pc_selene) === '▲4,5 m', 'e o token dela mostra a altura lá também');
  const forja = await B.evaluate(([eu, id]) => {
    const u = __tc, sc = u.Store.scene(), s = sc.shapes.find(x => x.ter);
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    const nova = u.Proj.validar({ t: 'add', c: 'shapes', v: { id: 'sh_falso', k: 'rect', x: 0, y: 0, w: 64, h: 64, s: '#ffffff', sw: 2, f: '#ffffff', a: 1, ter: { t: 'fosso', h: -30 } } }, eu, Object.assign({}, sc, { perms: Object.assign({}, sc.perms, { desenhar: true }) }));
    return { hit: u.Tools.hitTest({ x: cx + 40, y: cy + 40 }), mexer: u.Proj.validar({ t: 'upd', c: 'shapes', id: s.id, p: { ter: { t: 'agua', h: 0 } } }, eu, sc), apagar: u.Proj.validar({ t: 'del', c: 'shapes', id: s.id }, eu, sc), novaTer: nova ? nova.v.ter : 'recusada', podeFerramenta: u.Tools.allowed('terrain') };
  }, [jogId, ids.pc_selene]);
  ok(forja.hit === null && forja.mexer === null && forja.apagar === null && forja.novaTer === undefined && forja.podeFerramenta === false, 'a jogadora não seleciona, não muda nem apaga o terreno, não tem a ferramenta, e um desenho dela nunca vira terreno: ' + JSON.stringify(forja));
  // ajustar: selecionar a área, trocar o tipo, apagar e desfazer
  await tecla(C, 'q'); await w(250);
  await C.locator('#o-tm button', { hasText: 'Ajustar' }).click(); await w(250);
  { const [x, y] = await ponto(C, sel.x + cena.cell * 1.7, sel.y + cena.cell * 1.7); await M.mouse.click(x, y); await w(300); }
  ok(await C.evaluate(() => __tc.App.sel.length === 1 && __tc.App.sel[0].c === 'shapes') && await C.locator('#tr-tipo').inputValue() === 'montanha' && await C.locator('#tr-alt').inputValue() === '4.5', 'no modo Ajustar, um clique seleciona a área e o painel mostra o tipo e a altura');
  await C.locator('#tr-tipo').selectOption('plataforma'); await w(300);
  await C.locator('#tr-alt').fill('3'); await C.locator('#tr-alt').press('Tab'); await w(300);
  ter = await C.evaluate(() => __tc.Store.scene().shapes.filter(s => s.ter).map(s => ({ ter: s.ter, f: s.f })));
  ok(ter[0].ter.t === 'plataforma' && ter[0].ter.h === 3 && ter[0].f === '#b08d5c', 'trocar o tipo e a altura pelo painel muda a área (e a cor acompanha o tipo): ' + JSON.stringify(ter));
  await C.locator('#tr-apagar').click(); await w(300);
  ok(await C.evaluate(() => __tc.Store.scene().shapes.filter(s => s.ter).length) === 0, 'Apagar tira a área');
  await C.evaluate(() => __tc.Tools.undo()); await w(300);
  ok(await C.evaluate(() => __tc.Store.scene().shapes.filter(s => s.ter).length) === 1, 'e Desfazer a devolve');
  await tecla(C, 'v'); await w(300);
  ok(await C.evaluate(() => __tc.App.sel.length) === 0, 'ao sair da ferramenta Terreno, a área deixa de estar selecionada');

  // ---------- F: a janelinha de atributos ----------
  const FOR = valor(selene, 'pc_selene', 'FOR');
  { const [x, y] = await noMapa(C, ids.pc_selene); await M.mouse.move(x, y); await w(200); }
  await tecla(C, 'f'); await w(350);
  ok(await C.locator('#fpop').count() === 1 && await C.locator('#fpop .pop-b').count() === 10 && await C.locator('#fp-fixa').inputValue() === '5' && (await C.locator('#fpop .pop-n').innerText()) === 'Selene' && (await C.locator('#fp-FOR b').innerText()) === String(FOR),
    'o mestre aperta F sobre o token: abre a janelinha com os dez atributos da ficha (FOR ' + FOR + ') e a fixa dela (5)');
  ok(await C.evaluate(() => __tc.App.sel.length) === 0 && await C.locator('.modal').count() === 0, 'a janelinha não muda a seleção nem trava o mapa');
  let antes = (await linhas(M)).length;
  await C.locator('#fp-FOR').click();
  ok(await ate(async () => (await linhas(M)).length === antes + 1), 'um clique no atributo rola e manda para a mesa ao vivo');
  let r = await ultima(M);
  ok(r.autor === 'Bruno' && r.d.titulo === 'Selene · Força' && r.d.total >= 6 && r.d.total <= FOR && JSON.stringify(r.d.dd) === JSON.stringify([[FOR - 5, r.d.total - 5]]) && await C.locator('#fp-total').innerText() === String(r.d.total),
    'a rolagem usa a regra da fixa (1d' + (FOR - 5) + ' + 5), guarda o dado, e o resultado aparece na própria janelinha: ' + JSON.stringify(r.d));
  ok(await C.locator('#fpop').count() === 1, 'a janelinha continua aberta depois de rolar');
  await C.locator('#fp-fixa').fill('0'); await w(200);
  ok((await C.locator('#fp-FOR').getAttribute('title')) === 'Força ' + FOR + ': 1d' + FOR, 'mudando o "Fixando", cada botão diz o que vai rolar agora');
  await M.keyboard.press('Escape'); await w(250);
  ok(await C.locator('#fpop').count() === 0, 'Esc fecha a janelinha');
  await C.evaluate(id => __tc.setSel([{ c: 'tokens', id }]), ids.pc_selene); await w(250);
  { const b = await C.locator('#cv').boundingBox(); await M.mouse.move(b.x + 6, b.y + b.height - 6); await w(150); }
  await tecla(C, 'f'); await w(300);
  ok(await C.locator('#fpop').count() === 1 && await C.locator('#fp-fixa').inputValue() === '0' && await C.locator('#tk-fixa').inputValue() === '0', 'sem token sob o cursor, F abre o do token selecionado; a fixa digitada antes ficou lembrada (e é a mesma do painel)');
  await tecla(C, 'f'); await w(250);
  ok(await C.locator('#fpop').count() === 0, 'F de novo fecha');
  // o token sem ficha: um valor digitado
  { const [x, y] = await noMapa(C, ids.barril); await M.mouse.move(x, y); await w(200); }
  await tecla(C, 'f'); await w(300);
  ok(await C.locator('#fpop .pop-b').count() === 0 && await C.locator('#fp-valor').count() === 1, 'num token sem ficha, a janelinha pede um valor');
  await C.locator('#fp-valor').fill('30'); await C.locator('#fp-fixa').fill('10'); antes = (await linhas(M)).length;
  await C.locator('#fp-rolar').click();
  ok(await ate(async () => (await linhas(M)).length === antes + 1), '(a rolagem do valor chega à mesa)');
  r = await ultima(M);
  ok(r.d.titulo === 'Barril · valor avulso' && r.d.total >= 11 && r.d.total <= 30 && JSON.stringify(r.d.dd) === JSON.stringify([[20, r.d.total - 10]]), 'valor 30 fixando 10 rola 1d20 + 10: ' + JSON.stringify(r.d));
  await M.keyboard.press('Escape'); await w(200);
  // a jogadora: só no token do personagem dela
  { const [x, y] = await noMapa(B, ids.pc_selene); await J.mouse.move(x, y); await w(200, J); }
  await tecla(B, 'f'); await w(350, J);
  ok(await B.locator('#fpop .pop-b').count() === 10 && await B.locator('#fp-fixa').inputValue() === '5', 'a jogadora aperta F sobre o token dela: a mesma janelinha, com a ficha dela');
  antes = (await linhas(M)).length;
  await B.locator('#fp-AGI').click();
  ok(await ate(async () => (await linhas(M)).length === antes + 1), '(a rolagem dela chega ao mestre)');
  r = await ultima(M);
  ok(r.autor === 'Dalmo' && r.d.titulo === 'Selene · Agilidade' && r.d.como === 'Selene', 'a rolagem sai no nome dela, pela personagem: ' + JSON.stringify({ autor: r.autor, t: r.d.titulo }));
  await J.keyboard.press('Escape'); await w(200, J);
  { const [x, y] = await noMapa(B, ids.pc_gob); await J.mouse.move(x, y); await w(200, J); }
  await tecla(B, 'f'); await w(350, J);
  ok(await B.locator('#fpop').count() === 0 && /Você rola pelos tokens do seu personagem/.test(await aviso(B)), 'sobre o token de um NPC, a jogadora não abre nada (a mesa explica)');
  await tecla(B, 'c'); await w(300, J);
  ok(await B.locator('.modal').count() === 0 && /A disputa pelo mapa é do mestre/.test(await aviso(B)), 'e a disputa pelo mapa (C) é só do mestre');

  // ---------- a fixa de cada turno (um chefe com três turnos) ----------
  await C.evaluate(id => { const u = __tc; u.Act.tokenTurns(u.Store.get('tokens', id), 3); u.setSel([{ c: 'tokens', id }]); u.UI.openTab('sel'); }, ids.pc_gob); await w(400);
  ok(await C.locator('#tk-fixa-1').count() === 1 && await C.locator('#tk-fixa-3').count() === 1 && await C.locator('#tk-fixa-4').count() === 0, 'com três turnos por rodada, o painel do token ganha a fixa de cada turno');
  for (const [i, v] of [[1, '8'], [2, '6'], [3, '4']]) { await C.locator('#tk-fixa-' + i).fill(v); await C.locator('#tk-fixa-' + i).press('Tab'); await w(250); }
  ok(JSON.stringify((await tok(C, ids.pc_gob)).fixas) === '[8,6,4]', 'as três ficam guardadas no token: ' + JSON.stringify((await tok(C, ids.pc_gob)).fixas));
  ok(await ate(async () => { const k = await tok(B, ids.pc_gob); return !!k && k.turns === 3 && JSON.stringify(k.fixas) === '[]'; }, 20000), 'para a jogadora, o token do chefe chega sem as fixas (são do mestre)');
  ok(await C.locator('#tk-fixa').inputValue() === '2', 'fora da vez dele, o "Fixando" do painel é a fixa da ficha (2)');
  await C.evaluate(([g, s]) => { const u = __tc; u.Act.turnAdd([u.Store.get('tokens', g), u.Store.get('tokens', s)]); u.Act.turnPatch(x => { x.on = true; x.round = 1; x.cur = x.list.find(e => e.token === g && e.k === 1).id; x.back = 0; }, 'Iniciar combate'); }, [ids.pc_gob, ids.pc_selene]); await w(400);
  ok(await C.locator('#tk-fixa').inputValue() === '8' && /1º turno dele nesta rodada: a fixa anotada para esse turno é 8/.test(await C.locator('#s-ficha').innerText()), 'na vez do 1º turno dele, o painel já vem fixando 8 (e diz por quê)');
  { const [x, y] = await noMapa(C, ids.pc_gob); await M.mouse.move(x, y); await w(200); }
  await tecla(C, 'f'); await w(350);
  ok(await C.locator('#fp-fixa').inputValue() === '8' && await C.locator('#fp-t1.on').count() === 1 && (await C.locator('#fpop .pop-c').innerText()).replace(/\s+/g, ' ') === 'Por turno 1º · 8 2º · 6 3º · 4', 'e a janelinha (F) também: fixando 8, com as três fixas à mão');
  await foto(M, 'combate-f-turno');
  const DFF = valor(goblin, 'pc_gob', 'DFF');
  antes = (await linhas(M)).length;
  await C.locator('#fp-DFF').click();
  ok(await ate(async () => (await linhas(M)).length === antes + 1), '(o chefe rola a defesa física no 1º turno)');
  r = await ultima(M);
  ok(r.d.dd[0][0] === DFF - 8 && r.d.total === r.d.dd[0][1] + 8, 'a rolagem do 1º turno fixa 8: 1d' + (DFF - 8) + ' + 8 → ' + JSON.stringify(r.d.dd) + ' = ' + r.d.total);
  await C.evaluate(g => { const u = __tc; u.Act.turnPatch(x => { x.cur = x.list.find(e => e.token === g && e.k === 2).id; }, 'Vez'); }, ids.pc_gob); await w(400);
  ok(await C.locator('#fp-fixa').inputValue() === '6' && await C.locator('#fp-t2.on').count() === 1 && await C.locator('#tk-fixa').inputValue() === '6', 'a vez passa para o 2º turno dele: a janelinha aberta e o painel passam a fixar 6');
  await C.locator('#fp-t3').click(); await w(200);
  ok(await C.locator('#fp-fixa').inputValue() === '4', 'um toque numa das fixas põe o valor no campo');
  await C.evaluate(([g, s]) => { const u = __tc; u.Act.turnPatch(x => { x.cur = x.list.find(e => e.token === s).id; }, 'Vez'); }, [ids.pc_gob, ids.pc_selene]); await w(400);
  ok(await C.locator('#fp-fixa').inputValue() === '2', 'na vez de outro, ele volta à fixa de sempre (a da ficha, 2)');
  await M.keyboard.press('Escape'); await w(200);
  await C.evaluate(() => { const u = __tc; u.Act.turnPatch(x => { x.list = []; x.on = false; x.round = 1; x.back = 0; }, 'Limpar turnos'); }); await w(300);

  // ---------- C: a disputa ----------
  await C.evaluate(([a, b]) => __tc.setSel([{ c: 'tokens', id: a }, { c: 'tokens', id: b }]), [ids.pc_selene, ids.pc_gob]); await w(250);
  { const b = await C.locator('#cv').boundingBox(); await M.mouse.move(b.x + 6, b.y + b.height - 6); await w(150); }
  await tecla(C, 'c'); await w(350);
  ok(await C.locator('.modal .dis').count() === 1 && await C.locator('#dis-a-tok').inputValue() === ids.pc_selene && await C.locator('#dis-b-tok').inputValue() === ids.pc_gob && await C.locator('#dis-a-atr').count() === 1 && await C.locator('#dis-b-atr').count() === 1 && await C.locator('#dis-a-fixa').inputValue() === '0' && await C.locator('#dis-b-fixa').inputValue() === '2',
    'com dois tokens selecionados, C abre a disputa com um de cada lado, o atributo da ficha e a fixa de cada um (a que o mestre deixou na Selene, 0; a da ficha do Goblin, 2)');
  await C.locator('#dis-a-atr').selectOption('AGI'); await w(200); await C.locator('#dis-b-atr').selectOption('DFF'); await w(200);
  antes = (await linhas(M)).length;
  await C.locator('.modal .btn.primary').click();
  ok(await ate(async () => (await linhas(M)).length === antes + 1), 'Rolar disputa manda o resultado para a mesa ao vivo');
  r = await ultima(M);
  const AGI = valor(selene, 'pc_selene', 'AGI');
  ok(r.d.titulo === 'Disputa · Selene × Goblin batedor' && r.d.total == null && new RegExp('^Selene: AGI ' + AGI + ' \\(1d' + AGI + ' \\+ 0, dado \\d+\\) = \\d+  ·  Goblin batedor: DEF F ' + DFF + ' \\(1d' + (DFF - 2) + ' \\+ 2, dado \\d+\\) = \\d+$').test(r.d.resumo) && r.d.dd.length === 2 && r.d.dd[0][0] === AGI && r.d.dd[1][0] === DFF - 2 && !r.secreta,
    'a linha diz o que cada lado rolou, com os dados guardados: ' + JSON.stringify(r.d));
  { const m = /= (\d+)  ·  .* = (\d+)$/.exec(r.d.resumo), a = +m[1], b = +m[2]; ok(a === b ? r.d.veredito === 'Empate em ' + a && r.d.passou === null : r.d.veredito === (a > b ? 'Selene venceu Goblin batedor' : 'Goblin batedor venceu Selene') + ' por ' + Math.abs(a - b) + ' (' + Math.max(a, b) + ' × ' + Math.min(a, b) + ')' && r.d.passou === (a > b), 'e quem venceu, por extenso: ' + r.d.veredito); }
  await foto(M, 'combate-disputa');
  ok(await C.locator('#dis-veredito').innerText() === r.d.veredito && (await C.locator('.modal .btn.primary').innerText()) === 'Rolar de novo', 'o veredito aparece na janela, que continua aberta para rolar de novo');
  ok(await ate(async () => (await linhas(J)).some(x => x.id === r.id), 15000), 'a jogadora também recebe a disputa');
  await M.keyboard.press('Escape'); await w(250);
  // com um dos lados oculto, a disputa fica só com o mestre
  await C.evaluate(id => __tc.Store.tx('Ocultar', () => __tc.Store.upd('tokens', id, { hidden: true })), ids.pc_orc); await w(300);
  await C.evaluate(([a, b]) => __tc.setSel([{ c: 'tokens', id: a }, { c: 'tokens', id: b }]), [ids.pc_selene, ids.pc_orc]); await w(250);
  await tecla(C, 'c'); await w(350);
  antes = (await linhas(M)).length;
  await C.locator('.modal .btn.primary').click();
  ok(await ate(async () => (await linhas(M)).length === antes + 1), '(disputa contra um token oculto)');
  r = await ultima(M);
  await w(4500);
  ok(r.secreta === true && /Orc bruto/.test(r.d.titulo) && !(await linhas(J)).some(x => x.id === r.id), 'a disputa contra um token oculto sai em segredo: a jogadora não a recebe');
  await M.keyboard.press('Escape'); await w(250);

  // ---------- ataque com defesa: a defesa inteira ----------
  const defSel = valor(selene, 'pc_selene', 'DFM') + valor(selene, 'pc_selene', 'FOGO'), defGob = valor(goblin, 'pc_gob', 'DFM') + valor(goblin, 'pc_gob', 'FOGO');
  await C.evaluate(l => __tc.setSel(l.map(id => ({ c: 'tokens', id }))), [ids.pc_selene, ids.pc_gob, ids.barril]); await w(300);
  ok(await C.locator('#mt-ataque').count() === 1, 'com vários tokens selecionados, o painel oferece "Ataque com defesa…"');
  await C.locator('#mt-ataque').click(); await w(350);
  ok(await C.locator('#at-defs .chip').count() === 15 && await C.locator('#at-barra').inputValue() === 'HP' && await C.locator('#at-lista li').count() === 3 && await C.locator('#at-avisar').isChecked(), 'a janela traz as 15 defesas (as duas gerais e as 13 específicas), a barra HP e os três alvos');
  await C.locator('#at-dano').fill('30'); await w(200);
  ok(/−30 · 100 → 70/.test(await C.locator('#at-res-0').innerText()) && (await C.locator('#at-como-0').innerText()) === 'sem desconto' && (await C.locator('#at-como-2').innerText()) === 'sem ficha' && await C.locator('#at-man-2').inputValue() === '30',
    'sem defesa marcada, o dano entra inteiro; o token sem ficha tem um campo com o dano que ele tomou (30)');
  await C.locator('#at-d-DFM').click(); await w(150); await C.locator('#at-d-FOGO').click(); await w(250);
  ok((await C.locator('#at-como-0').innerText()) === 'defesa ' + defSel && (await C.locator('#at-res-0').innerText()) === `−${30 - defSel} · 100 → ${100 - (30 - defSel)}` && (await C.locator('#at-como-1').innerText()) === 'defesa ' + defGob && (await C.locator('#at-res-1').innerText()) === `−${30 - defGob} · 100 → ${100 - (30 - defGob)}`,
    `marcando Mágica e Fogo, elas se somam: a Selene desconta ${defSel} e o Goblin ${defGob} — e a janela mostra o que vai sobrar em cada barra: ` + await C.locator('#at-res-0').innerText() + ' | ' + await C.locator('#at-res-1').innerText());
  await C.locator('#at-max').fill('15'); await w(250);
  ok((await C.locator('#at-res-0').innerText()) === '−15 · 100 → 85' && (await C.locator('#at-res-1').innerText()) === '−15 · 100 → 85', 'o máximo vale depois do desconto: com teto 15, ninguém toma mais que 15');
  await C.locator('#at-max').fill(''); await C.locator('#at-min').fill('25'); await w(250);
  ok((await C.locator('#at-res-0').innerText()) === `−${Math.max(25, 30 - defSel)} · 100 → ${100 - Math.max(25, 30 - defSel)}`, 'e o mínimo também: com piso 25, passam pelo menos 25');
  await C.locator('#at-min').fill('0'); await w(200);
  await C.locator('#at-man-2').fill('7'); await C.locator('#at-man-2').press('Tab'); await w(250);
  ok((await C.locator('#at-res-2').innerText()) === '−7 · 20 → 13', 'o mestre diz que o Barril tomou 7');
  ok(await hp(C, ids.pc_selene) === 100 && await hp(C, ids.barril) === 20, 'nada mudou na cena até aqui: a janela só mostra');
  await foto(M, 'combate-ataque-inteira');
  antes = (await linhas(M)).length;
  await C.locator('.modal .btn.primary').click(); await w(500);
  ok(await hp(C, ids.pc_selene) === 100 - (30 - defSel) && await hp(C, ids.pc_gob) === 100 - (30 - defGob) && await hp(C, ids.barril) === 13 && /Ataque: aplicado em 3 tokens/.test(await aviso(C)), 'Aplicar tira de cada um o que passou: ' + [await hp(C, ids.pc_selene), await hp(C, ids.pc_gob), await hp(C, ids.barril)].join(' · '));
  ok(await ate(async () => (await linhas(M)).length === antes + 1), 'e avisa a mesa do resultado');
  r = await ultima(M);
  ok(r.d.titulo === 'Ataque' && r.d.resumo === `Dano 30 · defesa: Mágica + Fogo. Selene −${30 - defSel} HP (defesa ${defSel}).` && !r.secreta, 'o aviso lista só quem os jogadores veem com números (a Selene): o Goblin e o Barril, com a barra fechada, ficam de fora: ' + r.d.resumo);
  ok(await ate(async () => await hp(B, ids.pc_selene) === 100 - (30 - defSel), 20000) && await ate(async () => await M.evaluate(() => TC.dados.col('personagens').pegar('pc_selene').estado.rec.hp) === 100 - (30 - defSel), 20000), 'a barra da Selene muda no mapa dela e na ficha');
  antes = (await linhas(M)).length;
  await C.locator('.toast-a', { hasText: 'Desfazer' }).last().click(); await w(500);
  ok(await hp(C, ids.pc_selene) === 100 && await hp(C, ids.pc_gob) === 100 && await hp(C, ids.barril) === 20, 'Desfazer devolve as três barras de uma vez');
  ok(await ate(async () => (await linhas(M)).length === antes + 1) && /Desfeito: as barras voltaram/.test((await ultima(M)).d.resumo), 'e a mesa fica sabendo que o ataque foi desfeito');

  // ---------- ataque com defesa: os jogadores rolam ----------
  await C.evaluate(l => __tc.setSel(l.map(id => ({ c: 'tokens', id }))), [ids.pc_selene, ids.pc_gob]); await w(300);
  await C.locator('#mt-ataque').click(); await w(350);
  ok(await C.locator('#at-d-DFM.on').count() === 1 && await C.locator('#at-d-FOGO.on').count() === 1, 'a janela lembra as defesas do último ataque');
  await C.locator('#at-nome').fill('Baforada'); await C.locator('#at-dano').fill('30'); await w(150);
  await C.locator('#at-modo button', { hasText: 'Rola a defesa' }).click(); await w(300);
  ok((await C.locator('#at-como-0').innerText()) === 'falta rolar · defesa ' + defSel && (await C.locator('#at-res-0').innerText()) === '100/100' && await C.locator('#at-pedir').isEnabled(), 'com "Rola a defesa", cada alvo com ficha fica esperando a rolagem; o dano dele ainda não está decidido');
  await C.locator('.modal .btn.primary').click(); await w(300);
  ok(await C.locator('.modal').count() === 1 && /Faltam 2 defesas/.test(await aviso(C)) && await hp(C, ids.pc_selene) === 100, 'Aplicar não vale enquanto falta defesa: a mesa diz o que falta e nada muda');
  await J.locator('#tab-fichas').click(); await w(500, J);
  await J.evaluate(() => { const v = document.getElementById('vivo'); if (!v.hidden) document.getElementById('vivoX').click(); }); await w(300, J);
  antes = (await linhas(M)).length;
  await C.locator('#at-pedir').click();
  ok(await ate(async () => (await linhas(M)).length === antes + 1), 'o mestre pede: o pedido vira uma linha da mesa ao vivo');
  const ped = await ultima(M);
  ok(ped.d.k === 'pedido' && ped.d.total == null && igual(ped.d.pd, { rot: 'Baforada', defs: ['DFM', 'FOGO'], alvos: [{ c: 'pc_selene', n: 'Selene' }] }) && ped.d.titulo === 'Rolem a defesa · Baforada' && !ped.secreta && !JSON.stringify(ped.d).includes(String(defSel)),
    'o pedido leva o nome do ataque, as defesas e só os personagens de jogador — sem o valor da defesa de ninguém e sem o dano: ' + JSON.stringify(ped.d));
  ok((await C.locator('#at-como-0').innerText()) === 'esperando Dalmo · defesa ' + defSel && await C.locator('#at-d-DFM').isDisabled() && /Pedido enviado: Selene rola a defesa/.test(await aviso(C)), 'a janela do mestre passa a esperar o jogador, e as defesas ficam travadas enquanto o pedido está aberto');
  ok(await ate(async () => await J.locator('#feed .ped').count() === 1, 20000), 'o pedido chega à jogadora');
  ok(await ate(async () => /O mestre pediu que você role a defesa/.test(await J.evaluate(() => document.body.innerText)), 8000), 'com a mesa ao vivo fechada, um aviso leva até ela');
  await J.evaluate(() => { if (document.getElementById('vivo').hidden) document.getElementById('btnVivo').click(); }); await w(400, J);
  const cartao = () => J.locator('#feed .ped').last().innerText();
  ok(/Baforada: rolem a defesa/.test(await cartao()) && /Defesa Mágica \+ Fogo/.test(await cartao()) && new RegExp('Selene\\s+defesa ' + defSel + ' \\(Mágica \\+ Fogo\\)').test(await cartao()) && await J.locator('#feed .ped .ped-fx').inputValue() === '5' && await J.locator('#feed .ped button.pri').count() === 1,
    'o cartão diz o que rolar: a defesa dela, somada da própria ficha (' + defSel + '), o "Fixando" com a fixa da ficha (5) e o botão: ' + (await cartao()).replace(/\s+/g, ' '));
  await foto(J, 'combate-pedido-jogadora'); await foto(M, 'combate-pedido-mestre');
  ok(/Selene\s+aguardando/.test(await M.locator('#feed .ped').last().innerText()) && await M.locator('#feed .ped button.pri').count() === 0 && /Você acompanha e aplica pela janela do ataque/.test(await M.locator('#feed .ped').last().innerText()), 'no cartão do mestre não há botão: ele acompanha quem já rolou');
  // respostas forjadas não entram: de quem não é dono, e um valor que não cabe na defesa
  await J.evaluate(async id => { await TC.aoVivo.rolagem({ k: 'fixa', titulo: 'forjada', total: 1, resumo: 'x', sis: { t: 'rd', p: id, c: 'pc_gob', v: 1 } }, { secreta: false }); }, ped.id);
  await w(5000);
  ok((await C.locator('#at-como-1').innerText()) === 'falta rolar · defesa ' + defGob, 'a jogadora tenta responder pelo Goblin (que não é dela): a janela do mestre ignora');
  await J.locator('#feed .ped .ped-fx').fill('3'); await w(200, J);
  antes = (await linhas(M)).length;
  await J.locator('#feed .ped button.pri').click();
  ok(await ate(async () => (await linhas(M)).length === antes + 1), 'a jogadora rola a defesa pelo cartão');
  r = await ultima(M);
  ok(r.autor === 'Dalmo' && r.d.k === 'fixa' && r.d.titulo === 'Selene · Defesa (Mágica + Fogo)' && r.d.total >= 4 && r.d.total <= defSel && JSON.stringify(r.d.dd) === JSON.stringify([[defSel - 3, r.d.total - 3]]) && igual(r.d.sis, { t: 'rd', p: ped.id, c: 'pc_selene', v: r.d.total, a: defSel, f: 3, d: r.d.total - 3 }),
    'a rolagem dela é uma rolagem comum (1d' + (defSel - 3) + ' + 3), com o recado para a janela do mestre: ' + JSON.stringify(r.d));
  const rolou = r.d.total;
  ok(await ate(async () => (await C.locator('#at-como-0').innerText()).startsWith(`rolou ${rolou} de ${defSel}`), 15000) && (await C.locator('#at-res-0').innerText()) === `−${30 - rolou} · 100 → ${100 - (30 - rolou)}`, 'a janela do mestre recebe: a Selene rolou ' + rolou + ', e o dano dela fica decidido: ' + await C.locator('#at-como-0').innerText());
  ok(await ate(async () => new RegExp('Selene\\s+rolou ' + rolou).test(await cartao()) && await J.locator('#feed .ped button.pri').count() === 0, 10000), 'no cartão dela o botão dá lugar a "rolou ' + rolou + '"');
  ok(await ate(async () => new RegExp('Selene\\s+rolou ' + rolou).test(await M.locator('#feed .ped').last().innerText()), 10000), 'e o cartão do mestre, na mesa ao vivo, acompanha');
  ok(await J.evaluate(async ([id, v]) => { const l = TC.aoVivo.itens.find(x => x.id === id); try { await TC.aoVivo.responderDefesa(l, 'pc_selene', v, 0); return 'rolou de novo'; } catch (e) { return e.message; } }, [ped.id, defSel]) === 'Essa defesa já foi rolada.', 'rolar de novo a mesma defesa não vale: a primeira é a que conta');
  ok(await J.evaluate(async ([id, v]) => { const l = TC.aoVivo.itens.find(x => x.id === id); try { await TC.aoVivo.responderDefesa(l, 'pc_gob', v, 0); return 'rolou'; } catch (e) { return e.message; } }, [ped.id, 5]) === 'Esse personagem não está neste pedido.', 'nem responder por quem não está no pedido');
  await foto(J, 'combate-pedido-rolado'); await foto(M, 'combate-ataque-rolou');
  // o Goblin é do mestre: ele rola aqui mesmo
  antes = (await linhas(M)).length;
  await C.locator('#at-rolar-1').click();
  ok(await ate(async () => (await linhas(M)).length === antes + 1), 'o mestre rola a defesa do Goblin pela janela');
  r = await ultima(M);
  const rolouGob = r.d.total;
  ok(r.autor === 'Bruno' && r.d.titulo === 'Goblin batedor · Defesa (Mágica + Fogo)' && !r.d.sis && rolouGob >= Math.min(defGob, 3) && rolouGob <= defGob && (await C.locator('#at-como-1').innerText()).startsWith(`rolou ${rolouGob} de ${defGob}`), 'a rolagem do Goblin vai para a mesa como as outras (fixando a fixa da ficha dele), e entra na conta: ' + JSON.stringify(r.d));
  antes = (await linhas(M)).length;
  await C.locator('.modal .btn.primary').click(); await w(600);
  ok(await hp(C, ids.pc_selene) === 100 - (30 - rolou) && await hp(C, ids.pc_gob) === 100 - (30 - rolouGob) && await C.locator('.modal').count() === 0, 'com todas as defesas, Aplicar desconta o que cada um rolou: ' + [await hp(C, ids.pc_selene), await hp(C, ids.pc_gob)].join(' · '));
  ok(await ate(async () => { const p = (await linhas(M)).find(x => x.id === ped.id); return !!p && p.d.pd.fim === 'aplicado'; }, 15000), 'o pedido é encerrado como aplicado');
  ok(await ate(async () => /O mestre já aplicou o ataque/.test(await cartao()), 15000), 'e o cartão da jogadora diz que o ataque foi aplicado');
  r = await ultima(M, x => x.d.titulo === 'Ataque · Baforada');
  ok(!!r && r.d.resumo === `Dano 30 · defesa: Mágica + Fogo. Selene −${30 - rolou} HP (defesa ${rolou}, rolada).`, 'o aviso do resultado diz que a defesa foi rolada: ' + (r && r.d.resumo));
  await C.evaluate(() => __tc.Tools.undo()); await w(400);
  ok(await hp(C, ids.pc_selene) === 100 && await hp(C, ids.pc_gob) === 100, '(Desfazer devolve as barras)');

  // ---------- as regras do pedido, direto na casca ----------
  const estados = await J.evaluate(() => {
    const ha = min => new Date(Date.now() - min * 60000).toISOString(), ped = (extra, min) => ({ id: 'x', criado_em: ha(min), dados: { k: 'pedido', pd: Object.assign({ rot: '', defs: ['DFF'], alvos: [{ c: 'a', n: 'A' }] }, extra) } });
    return [TC.aoVivo.estadoDoPedido(ped({}, 9)), TC.aoVivo.estadoDoPedido(ped({}, 11)), TC.aoVivo.estadoDoPedido(ped({ fim: 'aplicado' }, 30)), TC.aoVivo.estadoDoPedido(ped({ fim: 'cancelado' }, 1)), TC.aoVivo.estadoDoPedido(ped({ fim: 'outra coisa' }, 1)),
      TC.aoVivo.estadoDoPedido({ id: 'y', criado_em: ha(1), dados: { k: 'fixa', total: 3 } }), TC.aoVivo.estadoDoPedido({ id: 'z', criado_em: ha(1), dados: { k: 'pedido', pd: 'x' } }), TC.aoVivo.estadoDoPedido(null)];
  });
  ok(JSON.stringify(estados) === JSON.stringify(['aberto', 'expirado', 'aplicado', 'cancelado', 'aberto', null, null, null]), 'um pedido fica aberto por 10 minutos; depois expira sozinho (a não ser que o mestre já o tenha encerrado): ' + JSON.stringify(estados));
  ok(await M.evaluate(async () => { try { await TC.aoVivo.pedirDefesa({ rot: 'x', defs: ['NADA', 7], alvos: [{ c: 'pc_lobo', n: 'Lobo' }] }); return 'pediu'; } catch (e) { return e.message; } }) === 'O pedido veio vazio: escolha a defesa e quem defende.', 'um pedido sem defesa conhecida não é escrito');
  antes = (await linhas(M)).length;
  const ped3id = await M.evaluate(async () => (await TC.aoVivo.pedirDefesa({ rot: '  Teste   de regra  ', defs: ['DFF', 'DFF', 'NADA', 'CORTE'], alvos: [{ c: 'pc_lobo', n: 'Lobo' }, { c: 'pc_lobo', n: 'Lobo de novo' }, { c: '', n: 'vazio' }, null] })).id);
  const ped3 = (await linhas(M)).find(x => x.id === ped3id);
  ok(igual(ped3.d.pd, { rot: 'Teste de regra', defs: ['DFF', 'CORTE'], alvos: [{ c: 'pc_lobo', n: 'Lobo' }] }) && ped3.d.resumo === 'Defesa Física + Corte. Para: Lobo.', 'o pedido é limpo antes de ir para a mesa: só defesas que existem, sem repetir, e cada personagem uma vez: ' + JSON.stringify(ped3.d.pd));
  ok(await ate(async () => (await linhas(J)).some(x => x.id === ped3id), 15000), '(o pedido chega à jogadora)');
  ok(/Lobo\s+aguardando/.test(await cartao()) && await J.locator('#feed .ped').last().locator('button.pri').count() === 0, 'num pedido para um personagem que não é dela, a jogadora só acompanha (sem botão)');
  ok(await J.evaluate(async id => { const l = TC.aoVivo.itens.find(x => x.id === id); try { await TC.aoVivo.responderDefesa(l, 'pc_lobo', 5, 0); return 'rolou'; } catch (e) { return e.message; } }, ped3id) === 'Esse personagem não é seu.', 'e não consegue rolar por ele');
  await J.evaluate(async id => { await TC.aoVivo.rolagem({ k: 'fixa', titulo: 'forjada', total: 2, resumo: 'x', sis: { t: 'rd', p: id, c: 'pc_lobo', v: 2 } }, { secreta: false }); }, ped3id);
  await w(5000);
  ok(/Lobo\s+aguardando/.test(await M.locator('#feed .ped').last().innerText()) && /Lobo\s+aguardando/.test(await cartao()), 'uma resposta escrita por quem não é o dono (nem o mestre) não conta no cartão de ninguém');
  const rLobo = await M.evaluate(async id => { const l = TC.aoVivo.itens.find(x => x.id === id); const r = await TC.aoVivo.responderDefesa(l, 'pc_lobo', 9, 4); return r.total; }, ped3id);
  ok(rLobo >= 5 && rLobo <= 9 && await ate(async () => new RegExp('Lobo\\s+rolou ' + rLobo).test(await cartao()), 15000) && new RegExp('Lobo\\s+rolou ' + rLobo).test(await M.locator('#feed .ped').last().innerText()), 'o mestre pode responder por um personagem dele: os dois cartões passam a dizer "rolou ' + rLobo + '"');
  await M.evaluate(id => TC.aoVivo.encerrarPedido(id, 'cancelado'), ped3id);
  ok(await ate(async () => /O mestre cancelou este pedido/.test(await cartao()), 15000), '(o mestre encerra esse pedido)');
  ok(await J.evaluate(async id => { try { const r = await TC.aoVivo.encerrarPedido(id, 'aplicado'); return r === null ? 'nada' : 'encerrou'; } catch (e) { return e.message; } }, ped.id) === 'nada', 'a jogadora não encerra pedido nenhum');

  // ---------- o mestre rola por quem demora, usa a defesa inteira, ou cancela ----------
  await C.evaluate(l => __tc.setSel(l.map(id => ({ c: 'tokens', id }))), [ids.pc_selene]); await w(300);
  ok(await C.locator('#tk-ataque').count() === 1, 'o painel de um token só também tem "Ataque com defesa…"');
  await C.locator('#tk-ataque').click(); await w(350);
  await C.locator('#at-dano').fill('30'); await w(150);
  ok(await C.locator('#at-modo .seg-b.on').innerText() === 'Rola a defesa', 'a janela lembra que da última vez as defesas foram roladas');
  antes = (await linhas(M)).length;
  await C.locator('#at-pedir').click();
  ok(await ate(async () => (await linhas(M)).length === antes + 1), '(outro pedido)');
  const ped2 = await ultima(M);
  // um valor que não cabe na defesa não entra
  await J.evaluate(async id => { await TC.aoVivo.rolagem({ k: 'fixa', titulo: 'exagero', total: 999, resumo: 'x', sis: { t: 'rd', p: id, c: 'pc_selene', v: 999 } }, { secreta: false }); }, ped2.id);
  ok(await ate(async () => /não cabe na defesa dele agora/.test(await aviso(C)), 12000) && (await C.locator('#at-como-0').innerText()).startsWith('esperando Dalmo'), 'uma resposta maior que a defesa não entra: o mestre é avisado e a linha continua esperando');
  await C.locator('#at-inteira-0').click(); await w(250);
  ok((await C.locator('#at-como-0').innerText()) === 'defesa inteira: ' + defSel && (await C.locator('#at-res-0').innerText()) === `−${30 - defSel} · 100 → ${100 - (30 - defSel)}`, '"Inteira" vale a defesa inteira para quem não rolou');
  await C.locator('#at-de-novo-0').click(); await w(250);
  antes = (await linhas(M)).length;
  await C.locator('#at-rolar-0').click();
  ok(await ate(async () => (await linhas(M)).length === antes + 1), '"Rolar por ele": o mestre rola a defesa da personagem da jogadora');
  r = await ultima(M);
  ok(r.autor === 'Bruno' && r.d.titulo === 'Selene · Defesa (Mágica + Fogo)' && r.d.sis && r.d.sis.p === ped2.id && r.d.sis.c === 'pc_selene' && !r.secreta && /pelo mestre/.test(await C.locator('#at-como-0').innerText()), 'a rolagem vale como a resposta dela (todos veem): ' + JSON.stringify(r.d.sis));
  // "Cancelar o pedido" (para mudar as defesas, por exemplo): o pedido se encerra na mesa, as rolagens deixam de valer, e dá para pedir de novo
  await C.locator('#at-despedir').click(); await w(300);
  ok(await ate(async () => { const p = (await linhas(M)).find(x => x.id === ped2.id); return !!p && p.d.pd.fim === 'cancelado'; }, 15000), '"Cancelar o pedido" encerra o pedido na mesa ao vivo');
  ok((await C.locator('#at-como-0').innerText()) === 'falta rolar · defesa ' + defSel && !(await C.locator('#at-d-DFM').isDisabled()) && await C.locator('#at-pedir').isEnabled() && await C.locator('.modal').count() === 1, 'a janela continua aberta: as defesas voltam a poder mudar, e a rolagem que tinha sido feita deixa de valer');
  antes = (await linhas(M)).length;
  await C.locator('#at-pedir').click();
  ok(await ate(async () => (await linhas(M)).length === antes + 1), '(o mestre pede de novo)');
  const ped4 = await ultima(M);
  ok(ped4.d.k === 'pedido' && ped4.id !== ped2.id && (await C.locator('#at-como-0').innerText()).startsWith('esperando Dalmo'), 'é um pedido novo, e a janela volta a esperar a jogadora');
  await M.keyboard.press('Escape'); await w(500);
  ok(await C.locator('.modal').count() === 0 && await hp(C, ids.pc_selene) === 100, 'o mestre fecha a janela sem aplicar: nada muda');
  ok(await ate(async () => { const p = (await linhas(M)).find(x => x.id === ped4.id); return !!p && p.d.pd.fim === 'cancelado'; }, 15000), 'e o pedido que estava aberto é encerrado como cancelado');
  ok(await ate(async () => /O mestre cancelou este pedido/.test(await cartao()), 15000), 'a jogadora vê que o pedido foi cancelado');
  ok(await J.evaluate(async id => { const l = TC.aoVivo.itens.find(x => x.id === id); try { await TC.aoVivo.responderDefesa(l, 'pc_selene', 5, 0); return 'rolou'; } catch (e) { return e.message; } }, ped4.id) === 'Este pedido já foi encerrado.', 'um pedido encerrado não aceita mais resposta');
  ok(await J.evaluate(async () => { try { await TC.aoVivo.pedirDefesa({ rot: 'x', defs: ['DFF'], alvos: [{ c: 'pc_selene', n: 'Selene' }] }); return 'pediu'; } catch (e) { return e.message; } }) === 'Só o mestre pede a defesa.', 'e só o mestre pode pedir a defesa');

  // ---------- pelo "Dano, cura ou condição": o caminho para o ataque com defesa ----------
  await C.evaluate(l => __tc.setSel(l.map(id => ({ c: 'tokens', id }))), [ids.pc_selene, ids.pc_gob]); await w(300);
  await C.locator('#mt-area').click(); await w(300);
  await C.locator('#ar-amt').fill('12'); await w(150);
  await C.locator('#ar-defesa').click(); await w(350);
  ok(await C.locator('#at-dano').inputValue() === '12' && await C.locator('#at-lista li').count() === 2, 'da janela "Dano, cura ou condição" dá para ir ao ataque com defesa, com os mesmos tokens e o mesmo dano');
  // sem "Avisar a mesa", o ataque não escreve nada na mesa ao vivo
  await C.locator('#at-modo button', { hasText: 'Não' }).click(); await w(250);
  await C.locator('#at-avisar').uncheck({ force: true }); await w(150);
  antes = (await linhas(M)).length;
  await C.locator('.modal .btn.primary').click(); await w(600);
  ok(await hp(C, ids.pc_selene) === 100 - (12 - defSel) && await hp(C, ids.pc_gob) === 100 - (12 - defGob), '(o ataque de 12 é aplicado: ' + [await hp(C, ids.pc_selene), await hp(C, ids.pc_gob)].join(' · ') + ')');
  await w(4000);
  ok((await linhas(M)).length === antes, 'com "Avisar a mesa" desligado, nada vai para a mesa ao vivo');
  await C.evaluate(() => __tc.Tools.undo()); await w(400);
  ok(await hp(C, ids.pc_selene) === 100, '(e Desfazer devolve as barras)');

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
