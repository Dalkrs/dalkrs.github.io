// Bateria do lote 6 (parte 3, as Cenas), no navegador, sem o site:
//   · as teclas novas: U (névoa), Y (efeitos), E (equipamentos), N e Shift+N (passar e voltar o turno);
//   · a janelinha E (os equipamentos do token), com uma ficha de mentira no lugar das Fichas;
//   · a Postura: a chave no painel do token e a etiqueta junto do nome;
//   · o contador de uma condição em vários tokens de uma vez ("Sangrando 3 → 2 em todos");
//   · a linha invisível na ordem de turnos: o olho do mestre e a prévia "como jogador".
// (Com fichas de verdade e dois aparelhos, o teste é o src/tests/cenas-lote6.rede.test.js.)
const path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;                         // (as fotos só saem com FOTOS=pasta)

(async () => {
  const t = await open({});
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const toasts = () => ev(() => Array.from(document.querySelectorAll('.toast')).map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const clearToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const T = name => ev(nm => JSON.parse(JSON.stringify(__tc.Store.scene().tokens.find(x => x.name === nm) || null)), name);
  const tela = async (x, y) => { const box = await page.locator('#cv').boundingBox(), p = await ev(([x, y]) => __tc.Render.toScreen(x, y), [x, y]); return [box.x + p[0], box.y + p[1]]; };
  const sobre = async nome => { const k = await T(nome), C = await ev(() => __tc.Store.scene().cell), p = await tela(k.x + k.size * C / 2, k.y + k.size * C / 2); await page.mouse.move(p[0], p[1]); await w(120); };
  const longe = async () => { const b = await page.locator('#cv').boundingBox(); await page.mouse.move(b.x + 8, b.y + b.height - 8); await w(100); };
  const tecla = async k => { await page.keyboard.press(k); await w(200); };
  const foto = async nome => { if (SHOTS) { require('fs').mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  // um resumo dos pixels do mapa, depois de desenhar (para saber se algo apareceu no desenho)
  const desenho = () => ev(() => new Promise(r => { __tc.Render.request(); requestAnimationFrame(() => requestAnimationFrame(() => {
    const c = __tc.Render.cv, k = document.createElement('canvas'); k.width = c.width; k.height = c.height;
    const g = k.getContext('2d', { willReadFrequently: true }); g.drawImage(c, 0, 0);
    const d = g.getImageData(0, 0, k.width, k.height).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (Math.imul(h, 31) + d[i] + d[i + 1] * 7 + d[i + 2] * 13) | 0; r(h);
  })); }));
  const turno = () => ev(() => { const tn = __tc.Store.scene().turn; return { on: tn.on, round: tn.round, cur: (tn.list.find(e => e.id === tn.cur) || {}).name || null }; });
  const comoMestre = () => ev(() => { __tc.UI.setViewer('gm'); });
  const comoJogador = () => ev(() => { __tc.UI.setViewer('p1'); });

  const C = await ev(() => {
    const u = __tc, sc = u.newScene('Lote 6'); u.Store.addScene(sc); u.Store.setCurrent(sc.id);
    u.Store.S.players = [{ id: 'p1', name: 'Dalmo', color: '#4fb8e0' }];
    const c = sc.cell;
    u.Store.tx('prep', () => {
      u.Store.scn({ cols: 16, rows: 10, fog: { dynamic: false, manual: false, explored: false, shared: true } });
      u.Store.add('tokens', u.newToken(sc, 2 * c, 3 * c, { name: 'Ana', owner: 'p1' }));
      u.Store.add('tokens', u.newToken(sc, 6 * c, 3 * c, { name: 'Ogro', turns: 2 }));
      u.Store.add('tokens', u.newToken(sc, 10 * c, 3 * c, { name: 'Lobo' }));
      u.Store.add('tokens', u.newToken(sc, 10 * c, 7 * c, { name: 'Barril' }));
    });
    u.Render.fit();
    return c;
  });
  void C;
  await w(300);

  // ================= as teclas novas =================
  await longe();
  await tecla('u');
  ok(await ev(() => __tc.App.tool) === 'fog', 'U: a Névoa manual (a tecla N passou a ser do turno)');
  await tecla('y');
  ok(await ev(() => __tc.App.tool) === 'fx', 'Y: os Efeitos de magia (a tecla E passou a ser dos equipamentos)');
  ok(await ev(() => [document.getElementById('tool-fog').title, document.getElementById('tool-fx').title].join(' | ')).then(s => /\(U\)/.test(s) && /\(Y\)/.test(s)), 'as dicas dos botões mostram as teclas novas: ' + await ev(() => [document.getElementById('tool-fog').title, document.getElementById('tool-fx').title].join(' | ')));
  await tecla('v');
  await clearToasts();
  await tecla('n');
  ok(/A ordem de turnos está vazia/.test(await toasts()), 'N com a ordem vazia: a mesa explica (nada muda)');
  // a ordem: Ana 15, Ogro 12 e 8 (dois turnos), Lobo 5
  await ev(() => {
    const u = __tc, ts = u.Store.scene().tokens.filter(k => k.name !== 'Barril');
    u.Act.turnAdd(ts);
    u.Act.turnPatch(x => { const v = { Ana: [15], Ogro: [12, 8], Lobo: [5] }; for (const e of x.list) { const nm = u.Store.get('tokens', e.token).name; e.init = v[nm][(e.k || 1) - 1]; } u.turnSort(x.list); x.cur = x.list[0].id; }, 'prep');
    u.UI.openTab('turn');
  });
  await w(200);
  await tecla('n');
  ok(JSON.stringify(await turno()) === JSON.stringify({ on: true, round: 1, cur: 'Ana' }), 'N com o combate parado: começa o combate, na vez de quem estava marcado (Ana)');
  await tecla('n');
  ok((await turno()).cur === 'Ogro', 'N de novo: passa a vez (Ogro)');
  await tecla('Shift+N');
  ok(JSON.stringify(await turno()) === JSON.stringify({ on: true, round: 1, cur: 'Ana' }), 'Shift+N: volta a vez (Ana)');
  await tecla('Shift+N');
  ok((await turno()).cur === 'Ana', 'Shift+N no começo da primeira rodada: nada a voltar');
  for (let i = 0; i < 4; i++) await tecla('n');
  ok(JSON.stringify(await turno()) === JSON.stringify({ on: true, round: 2, cur: 'Ana' }), 'quatro vezes N: a rodada vira (2) e a vez volta para a Ana');
  await tecla('Shift+N');
  ok(JSON.stringify(await turno()) === JSON.stringify({ on: true, round: 1, cur: 'Lobo' }), 'Shift+N na virada: volta para o último da rodada 1 (Lobo)');
  await tecla('n');
  // o jogador não passa a vez
  await comoJogador(); await w(250); await clearToasts();
  await tecla('n');
  ok(/Quem passa a vez é o mestre/.test(await toasts()) && (await turno()).cur === 'Ana', 'o jogador aperta N: nada muda, e a mesa explica que quem passa a vez é o mestre');
  await comoMestre(); await w(250);
  // as teclas na janela de atalhos
  await page.locator('#moreBtn').click(); await w(200);
  await page.locator('.menu-i', { hasText: 'Atalhos de teclado' }).click(); await w(250);
  const atalhos = await page.locator('.modal dl.keys').innerText().catch(() => '');
  ok(/U\s+Névoa manual/.test(atalhos) && /Y\s+Efeito de magia/.test(atalhos) && /E\s+Equipamentos do token/.test(atalhos) && /N · Shift\+N\s+Passar o turno · voltar o turno/.test(atalhos), 'a janela de atalhos lista U, Y, E e N · Shift+N');
  await page.keyboard.press('Escape'); await w(200);

  // ================= E: os equipamentos (uma ficha de mentira no lugar das Fichas) =================
  const ana = await T('Ana');
  await ev(id => {
    const u = __tc, F = u.Fichas;
    const ficha = { itens: [
      { id: 'i_esp', nome: 'Espada curta', troca: 'Arma', equipado: true, bonus: { FOR: 2 } },
      { id: 'i_mac', nome: 'Machado', troca: 'arma', equipado: false, bonus: { FOR: 4, AGI: -1 } },
      { id: 'i_ane', nome: 'Anel de prata', reliquia: true, equipado: false, bonus: { DFM: 3 } },
      { id: 'i_cor', nome: 'Corda', bonus: {} },
    ] };
    window.__fichaAna = ficha;
    u.Store.tx('ligar', () => u.Store.upd('tokens', id, { char: 'pc_ana' }));
    // (no lugar das Fichas de verdade: a ficha da Ana mora aqui; equipar muda a lista e devolve o desfazer)
    F.podeEquipar = t => !!t && t.char === 'pc_ana' && (u.App.viewer === 'gm' || t.owner === u.App.viewer);
    F.itens = t => (t && t.char === 'pc_ana' ? ficha.itens.map(it => ({ id: it.id, nome: it.nome, on: it.equipado !== false, troca: it.troca || '', reliquia: !!it.reliquia,
      bon: Object.entries(it.bonus || {}).filter(([, v]) => v).map(([k, v]) => ({ rot: k === 'DFM' ? 'DEF M' : k, v })) })) : []);
    F.equipar = (t, idItem, on) => {
      const antes = ficha.itens.map(x => Object.assign({}, x)), it = ficha.itens.find(x => x.id === idItem), g = on && it.troca ? it.troca.toLowerCase() : '', guardados = [];
      for (const x of ficha.itens) { if (x === it) x.equipado = !!on; else if (g && x.equipado !== false && (x.troca || '').toLowerCase() === g) { x.equipado = false; guardados.push(x.nome); } }
      return { ok: true, item: it.nome, guardados, desfazer: () => { ficha.itens = antes; return true; } };
    };
  }, ana.id);
  const equipados = () => ev(() => window.__fichaAna.itens.filter(x => x.equipado !== false).map(x => x.nome).join(', '));
  await sobre('Ana');
  await tecla('e');
  ok(await page.locator('#epop').count() === 1 && await page.locator('#epop .eq-c').count() === 4 && (await page.locator('#epop .pop-n').innerText()) === 'Ana', 'E sobre o token: abre a janelinha com os itens da ficha (4)');
  const cartoes = await page.locator('#epop .eq-c').evaluateAll(cs => cs.map(c => ({ id: c.id, on: c.classList.contains('on'), rel: c.classList.contains('rel'), t: c.innerText.replace(/\s+/g, ' ').trim(), p: c.getAttribute('aria-pressed') })));
  ok(JSON.stringify(cartoes) === JSON.stringify([
    { id: 'eq-i_esp', on: true, rel: false, t: 'Espada curta Arma FOR +2', p: 'true' },
    { id: 'eq-i_mac', on: false, rel: false, t: 'Machado arma FOR +4 · AGI −1', p: 'false' },
    { id: 'eq-i_ane', on: false, rel: true, t: 'Anel de prata DEF M +3', p: 'false' },
    { id: 'eq-i_cor', on: true, rel: false, t: 'Corda sem bônus', p: 'true' }]), 'cada cartão: a chave de equipado, o nome, o grupo de troca, a gema da relíquia e só o que o item soma: ' + JSON.stringify(cartoes));
  ok(await ev(() => __tc.App.sel.length) === 0 && await page.locator('.modal').count() === 0, 'a janelinha não muda a seleção nem trava o mapa');
  await foto('01-equipamentos');
  await clearToasts();
  await page.locator('#eq-i_mac').click(); await w(200);
  ok(await equipados() === 'Machado, Corda' && /Equipou Machado no lugar de Espada curta\./.test(await toasts()), 'um clique no Machado equipa e guarda a Espada (mesmo grupo de troca, sem ligar para maiúsculas): ' + await toasts());
  ok(await page.locator('#eq-i_mac.on').count() === 1 && await page.locator('#eq-i_esp.on').count() === 0 && await page.locator('#epop').count() === 1, 'a janelinha acompanha e continua aberta');
  await page.locator('.toast-a', { hasText: 'Desfazer' }).last().click(); await w(200);
  ok(await equipados() === 'Espada curta, Corda' && await page.locator('#eq-i_esp.on').count() === 1 && await page.locator('#epop').count() === 1, 'Desfazer devolve a Espada (e a janelinha fica aberta, já com ela)');
  await clearToasts();
  await page.locator('#eq-i_esp').click(); await w(200);
  ok(await equipados() === 'Corda' && /Guardou Espada curta\./.test(await toasts()), 'um clique num item equipado guarda: ' + await toasts());
  await page.locator('#eq-i_esp').click(); await w(150);
  await page.keyboard.press('Escape'); await w(150);
  ok(await page.locator('#epop').count() === 0, 'Esc fecha');
  await ev(id => __tc.setSel([{ c: 'tokens', id }]), ana.id); await longe();
  await tecla('e');
  ok(await page.locator('#epop').count() === 1, 'sem token sob o cursor, E abre o do token selecionado');
  await tecla('e');
  ok(await page.locator('#epop').count() === 0, 'E de novo fecha');
  await tecla('e');
  await tecla('f');
  ok(await page.locator('#epop').count() === 0 && await page.locator('#fpop').count() === 1, 'abrir a de atributos (F) fecha a de equipamentos: uma janelinha de cada vez');
  await page.keyboard.press('Escape'); await w(150);
  await ev(() => __tc.setSel([]));
  await sobre('Lobo'); await clearToasts();
  await tecla('e');
  ok(await page.locator('#epop').count() === 0 && /não está ligado a uma ficha/.test(await toasts()), 'sobre um token sem ficha, E não abre nada (a mesa explica)');
  await longe(); await clearToasts();
  await tecla('e');
  ok(await page.locator('#epop').count() === 0 && /passe o mouse sobre um token/.test(await toasts()), 'sem token sob o cursor nem selecionado: a mesa explica como usar');
  // o jogador: só no token dele
  await comoJogador(); await w(250);
  await sobre('Ana');
  await tecla('e');
  ok(await page.locator('#epop .eq-c').count() === 4, 'o jogador abre a janelinha no token dele');
  await page.keyboard.press('Escape'); await w(120);
  await sobre('Ogro'); await clearToasts();
  await tecla('e');
  ok(await page.locator('#epop').count() === 0 && /Você mexe nos equipamentos do seu personagem/.test(await toasts()), 'no token de outro, não abre (a mesa explica)');
  await comoMestre(); await w(250);

  // ================= a Postura =================
  await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, ana.id); await w(250);
  ok(await page.locator('#tk-post').count() === 1 && !(await page.locator('#tk-post').isChecked()), 'no painel do token, na seção Condições: a chave "Em postura", desligada');
  await longe();
  const semPostura = await desenho();
  ok(semPostura === await desenho(), '(o desenho do mapa, parado, é sempre o mesmo)');
  await page.locator('#tk-post').click({ force: true }); await w(200);
  ok((await T('Ana')).post === true && await page.locator('#tk-post').isChecked(), 'ligada: o token fica em postura');
  ok(await desenho() !== semPostura, 'e a etiqueta "Postura" aparece no mapa, junto do nome');
  await foto('02-postura');
  await ev(() => __tc.Tools.undo()); await w(200);
  ok(!(await T('Ana')).post && await desenho() === semPostura, 'Desfazer tira a postura (e a etiqueta)');
  await ev(() => __tc.Tools.redo()); await w(200);
  // o jogador: no token dele, a chave; no de outro, nada
  await comoJogador(); await w(250);
  await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, ana.id); await w(250);
  ok(await page.locator('#tk-post').count() === 1 && await page.locator('#tk-post').isChecked(), 'o jogador tem a chave no token dele');
  await page.locator('#tk-post').click({ force: true }); await w(200);
  ok(!(await T('Ana')).post, 'e desliga a postura dele');
  await ev(() => __tc.Tools.undo()); await w(200);
  await comoMestre(); await w(250);

  // ================= o contador de uma condição em vários tokens =================
  const ids = await ev(() => { const o = {}; for (const k of __tc.Store.scene().tokens) o[k.name] = k.id; return o; });
  await ev(i => {
    const u = __tc;
    u.Store.tx('prep', () => {
      u.Store.upd('tokens', i.Ana, { conds: ['sangue'], cinfo: { sangue: { n: 3 } } });
      u.Store.upd('tokens', i.Ogro, { conds: ['sangue'], cinfo: { sangue: { n: 3, d: 2, d0: 2 } } });
      u.Store.upd('tokens', i.Lobo, { conds: ['sangue'], cinfo: { sangue: { n: 1 } } });
    });
    u.setSel([i.Ana, i.Ogro, i.Lobo, i.Barril].map(id => ({ c: 'tokens', id }))); u.UI.openTab('sel');
  }, ids); await w(300);
  const sangue = () => ev(i => ['Ana', 'Ogro', 'Lobo'].map(nm => { const k = __tc.Store.get('tokens', i[nm]); return nm + ':' + (k.conds.includes('sangue') ? ((k.cinfo.sangue || {}).n || 0) + '/' + ((k.cinfo.sangue || {}).d || 0) : '-'); }).join(' '), ids);
  ok(await page.locator('#cm-sangue-n').count() === 1 && (await page.locator('#cm-sangue-n').innerText()) === '1 a 3' && /Ana: 3 · Ogro: 3 · Lobo: 1/.test(await page.locator('#cm-sangue-n').getAttribute('title')) && /3 de 4/.test(await page.locator('#cm-ativas').innerText()),
    'com vários tokens selecionados, as condições ativas aparecem com o contador (de 1 a 3; o de cada um na dica) e em quantos estão (3 de 4)');
  await foto('03-contador-em-lote');
  await clearToasts();
  await page.locator('#cm-sangue-minus').click(); await w(250);
  ok(await sangue() === 'Ana:2/0 Ogro:2/2 Lobo:-' && /Sangrando: −1 em 3 tokens/.test(await toasts()), '− tira 1 de cada um, e quem estava em 1 perde a condição: ' + await sangue());
  ok((await page.locator('#cm-sangue-n').innerText()) === '2' && /em todos|2 de 4/.test(await page.locator('#cm-ativas').innerText()), 'a linha acompanha: 2 em cada um que ainda tem');
  await page.locator('.toast-a', { hasText: 'Desfazer' }).last().click(); await w(250);
  ok(await sangue() === 'Ana:3/0 Ogro:3/2 Lobo:1/0', 'um Desfazer volta os três de uma vez');
  await page.locator('#cm-sangue-plus').click(); await w(250);
  ok(await sangue() === 'Ana:4/0 Ogro:4/2 Lobo:2/0', '+ soma 1 em cada um');
  await page.locator('#cm-sangue-d').fill('3'); await page.locator('#cm-sangue-d').press('Tab'); await w(250);
  ok(await sangue() === 'Ana:4/3 Ogro:4/3 Lobo:2/3', 'as rodadas: o mesmo número para todos que têm a condição');
  await ev(() => { __tc.Tools.undo(); __tc.Tools.undo(); __tc.setSel([]); }); await w(200);

  // ================= a linha invisível na ordem de turnos =================
  await ev(() => __tc.UI.openTab('turn')); await w(250);
  const linhas = () => ev(() => [...document.querySelectorAll('#side .turns > li')].map(li => li.querySelector('.turn-n').textContent + (li.classList.contains('inv') ? '*' : '') + (li.classList.contains('cur') ? '!' : '')).join(' | '));
  ok(await linhas() === 'Ana! | Ogro | Ogro | Lobo', 'a ordem do mestre: ' + await linhas());
  const ogro1 = await ev(() => __tc.Store.scene().turn.list.find(e => __tc.Store.get('tokens', e.token).name === 'Ogro').id);
  ok(await page.locator('#tv-' + ogro1).count() === 1 && /Esconder Ogro dos jogadores/.test(await page.locator('#tv-' + ogro1).getAttribute('title')), 'cada linha tem o olho, no mesmo lugar');
  await clearToasts();
  await page.locator('#tv-' + ogro1).click(); await w(250);
  ok(await linhas() === 'Ana! | Ogro* | Ogro* | Lobo' && /As 2 linhas de Ogro ficam invisíveis para os jogadores/.test(await toasts()), 'um clique no olho esconde as duas linhas do Ogro (os dois turnos dele): ' + await toasts());
  ok(await page.locator('#tl-' + ogro1 + ' .turn-inv').count() === 1 && (await page.locator('#tv-' + ogro1 + '.on').count()) === 1, 'a linha ganha a marca "invisível" e o olho fica aceso');
  await foto('04-linha-invisivel');
  await tecla('n');
  ok((await turno()).cur === 'Ogro' && /invisível para os jogadores/.test(await page.locator('#cine').innerText().catch(() => '')), 'na vez do Ogro, o aviso do mestre (a faixa de cinema, lote 7) lembra que a linha é invisível');
  // a prévia "como jogador"
  await comoJogador(); await w(350);
  ok(await linhas() === 'Ana | Lobo', 'como jogador: as linhas do Ogro não aparecem, e nenhuma está na vez: ' + await linhas());
  ok(await page.locator('#turnMestre').count() === 1 && /O turno está com o mestre/.test(await page.locator('#turnMestre').innerText()), 'em vez disso: "O turno está com o mestre."');
  await foto('05-turno-com-o-mestre');
  await comoMestre(); await w(250);
  await tecla('n');
  await comoJogador(); await w(350);
  ok(await linhas() === 'Ana | Lobo' && await page.locator('#turnMestre').count() === 1, 'no segundo turno do Ogro, o mesmo: o turno continua com o mestre');
  await comoMestre(); await w(250);
  await tecla('n');
  await comoJogador(); await w(350);
  ok(await linhas() === 'Ana | Lobo!' && await page.locator('#turnMestre').count() === 0, 'na vez do Lobo, como sempre');
  await comoMestre(); await w(250);
  await clearToasts();
  await page.locator('#tv-' + ogro1).click(); await w(250);
  ok(await linhas() === 'Ana | Ogro | Ogro | Lobo!' && /As 2 linhas de Ogro voltam a aparecer para os jogadores/.test(await toasts()), 'o olho de novo: as linhas voltam a aparecer');
  await ev(() => __tc.Tools.undo()); await w(200);
  ok(await linhas() === 'Ana | Ogro* | Ogro* | Lobo!', 'e o Desfazer as esconde de novo');

  const inesperados = t.errs.filter(e => !/favicon/.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 8).join('\n'));
  ok(!inesperados.length, 'sem erros no console');
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
