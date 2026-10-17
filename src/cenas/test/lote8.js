// Bateria do lote 8, no navegador, sem o site (SO=defeitos,... roda só umas partes):
//   · (parte 1) o painel do token não aplica o que está pela metade: o painel redesenhado no meio da digitação (alguém
//     mexeu em outra coisa) não confirma o "-1" de um "-15"; o que foi digitado continua no campo, com o cursor; só o
//     Enter (ou sair do campo) confirma;
//   · (parte 1) "Encerrar" zera a iniciativa de todos (as da ordem, a rolagem, a reação e as rolagens da mesa ao vivo que
//     ainda não foram anotadas), com Desfazer;
//   · (parte 1) a faixa nova não leva quem já está em outra faixa: vem desmarcado, com o nome da outra faixa; a primeira
//     faixa continua na ordem;
//   · (parte 2, SO=ferida) a Ferida permanente: a janela (qual barra, quanto apodrece, a prévia), a ponta podre, a cura que
//     para no teto (o valor digitado, o +, a cura total, o dano em área, o pedido de um jogador), o dano que continua
//     valendo, o jogador que não tira a ferida, a proporção que vai para os jogadores, tirar e desfazer;
//   · (parte 2, SO=clone) o Clone: a janela (quantas cópias, raio, sortear ou escolher no mapa), as cópias iguais, os
//     lugares (no raio, livres, sem repetir), a coroa do real, o dano numa cópia (só ela some), no real (todas somem), o
//     que muda no real vai para as cópias, "Este é o real", sortear, escolher no mapa (e o Esc), a condição que acaba
//     (tirada, pelas rodadas, o real que sai da cena), o grupo inteiro na vez do real, e o que vai para os jogadores
//     (sem a marca de cópia; todos com a mesma marca de grupo).
const path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;

(async () => {
  const t = await open({ w: 1360, h: 900 });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const j = JSON.stringify;
  const foto = async nome => { if (SHOTS) { require('fs').mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const SO = (process.env.SO || '').split(',').filter(Boolean), parte = k => !SO.length || SO.includes(k);
  const toastTxt = () => ev(() => [...document.querySelectorAll('.toast')].map(x => x.textContent).join(' | '));
  const limparToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  // uma cena nova, com tokens (nome, x em quadrados) — devolve os ids
  const novaCena = nomes => ev(nomes => {
    const u = __tc, sc = u.newScene('Lote 8');
    u.Store.addScene(sc); u.Store.S.current = sc.id; u.UI.renderAll();
    const out = [];
    u.Store.tx('tokens', () => nomes.forEach((nm, i) => { const k = u.newToken(sc, (2 + 2 * i) * sc.cell, 2 * sc.cell, { name: nm }); k.bars = [{ n: 'HP', v: 30, m: 30, c: '#d65a5a', on: true, k: 'bar' }]; u.Store.add('tokens', k); out.push(k.id); }));
    return out;
  }, nomes);
  const hp = id => ev(id => __tc.Store.get('tokens', id).bars[0].v, id);

  // ================= o painel não aplica o que está pela metade =================
  if (parte('defeitos')) {
    const [a, b] = await novaCena(['Ana', 'Ogro']);
    await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.App.tab = 'sel'; __tc.App.sideOpen = true; __tc.UI.renderAll(); }, a);
    await w(300);
    const campo = page.locator('#tk-b0-v');
    ok(await campo.count() === 1 && (await campo.inputValue()) === '30', '(o painel do token mostra o HP 30)');
    await campo.click(); await page.keyboard.press('Control+A'); await page.keyboard.type('-1'); await w(100);
    // alguém mexe em outro token: o painel se redesenha no meio da digitação
    await ev(id => __tc.Store.tx('mexer', () => __tc.Store.upd('tokens', id, { x: __tc.Store.get('tokens', id).x + __tc.Store.scene().cell })), b);
    await w(300);
    const depois = await page.locator('#tk-b0-v');
    ok(await hp(a) === 30, 'o painel redesenhado no meio da digitação não aplica o "-1" de um "-15" (o HP continua 30): ' + await hp(a));
    ok((await depois.inputValue()) === '-1' && await ev(() => document.activeElement && document.activeElement.id === 'tk-b0-v'), 'o que foi digitado continua no campo, com o foco nele: ' + await depois.inputValue());
    await page.keyboard.type('5'); await page.keyboard.press('Enter'); await w(250);
    ok(await hp(a) === 15, 'o Enter confirma: -15 → HP 15: ' + await hp(a));
    // sem digitar nada, o redesenho não muda nada
    await page.locator('#tk-b0-v').click(); await w(100);
    await ev(id => __tc.Store.tx('mexer', () => __tc.Store.upd('tokens', id, { x: __tc.Store.get('tokens', id).x + __tc.Store.scene().cell })), b);
    await w(300);
    ok(await hp(a) === 15 && (await page.locator('#tk-b0-v').inputValue()) === '15', 'com o campo só focado (sem digitar), o redesenho não muda nada');
    // sair do campo também confirma
    await page.locator('#tk-b0-v').fill('+4'); await page.locator('#cv').click({ position: { x: 600, y: 600 } }); await w(250);
    ok(await hp(a) === 19, 'sair do campo confirma (+4 → 19): ' + await hp(a));

    // ================= Encerrar zera a iniciativa de todos =================
    await ev(([a, b]) => {
      const u = __tc;
      u.Act.turnAdd([u.Store.get('tokens', a), u.Store.get('tokens', b)]);
      u.Act.turnPatch(x => { x.list[0].init = 17; x.list[0].roll = { d: 12, b: 5 }; x.list[1].init = 9; x.list[1].reac = true; x.on = true; x.round = 3; x.cur = x.list[0].id; }, 'preparar');
      u.App.iniRolls.set('ficha_x', { v: 14, d: 10, b: 4, nome: 'Ana', at: Date.now() });
      u.App.tab = 'turn'; u.UI.renderAll();
    }, [a, b]);
    await w(300);
    await limparToasts();
    ok((await page.locator('#turnOnOff').innerText()).includes('Encerrar'), '(o combate está em andamento: o botão diz Encerrar)');
    await page.locator('#turnOnOff').click(); await w(300);
    let tn = await ev(() => { const x = __tc.Store.scene().turn; return { on: x.on, inits: x.list.map(e => e.init), rolls: x.list.map(e => e.roll), reac: x.list.some(e => e.reac), pend: __tc.App.iniRolls.size }; });
    ok(!tn.on && j(tn.inits) === j([null, null]) && j(tn.rolls) === j([null, null]) && !tn.reac && tn.pend === 0, 'Encerrar: o combate para e a iniciativa de todos zera (a rolagem, a reação e as rolagens da mesa ao vivo não anotadas): ' + j(tn));
    ok(/iniciativa de todos foi zerada/.test(await toastTxt()), 'o aviso diz que zerou: ' + await toastTxt());
    const desf = page.locator('.toast button', { hasText: 'Desfazer' });
    ok(await desf.count() > 0, 'o aviso traz o Desfazer');
    if (await desf.count()) await desf.first().click();
    await w(300);
    tn = await ev(() => { const x = __tc.Store.scene().turn; return { on: x.on, inits: x.list.map(e => e.init) }; });
    ok(tn.on && j(tn.inits) === j([17, 9]), 'Desfazer volta o combate e as iniciativas: ' + j(tn));
    await foto('l8-encerrar');

    // ================= a faixa nova não leva quem está em outra faixa =================
    const [c1, c2, c3, c4] = await novaCena(['Goblin 1', 'Goblin 2', 'Orc 1', 'Orc 2']);
    await ev(ids => { __tc.setSel(ids.map(id => ({ c: 'tokens', id }))); __tc.App.tab = 'turn'; __tc.UI.renderAll(); }, [c1, c2]);
    await w(250);
    await page.locator('#turnBand').click(); await w(300);
    await page.locator('.modal .btn.primary', { hasText: 'Criar a faixa' }).click(); await w(300);
    // a seleção ainda tem os goblins, e ganhou os orcs
    await ev(ids => { __tc.setSel(ids.map(id => ({ c: 'tokens', id }))); __tc.UI.renderAll(); }, [c1, c2, c3, c4]);
    await w(250);
    await page.locator('#turnBand').click(); await w(300);
    const marcas = await ev(ids => ids.map(id => { const cb = document.getElementById('bd-' + id); return [!!cb && cb.checked, cb ? cb.closest('label').textContent : '']; }), [c1, c2, c3, c4]);
    ok(!marcas[0][0] && !marcas[1][0] && marcas[2][0] && marcas[3][0] && /está na faixa "Goblin": marque para trazer/.test(marcas[0][1]), 'na faixa nova, quem já está em outra vem desmarcado, com o nome dela: ' + j(marcas));
    await page.locator('#dlg-in').fill('Orcs');
    await page.locator('.modal .btn.primary', { hasText: 'Criar a faixa' }).click(); await w(300);
    const faixas = await ev(() => __tc.Store.scene().turn.list.filter(e => e.toks).map(e => [e.name, e.toks.length]));
    ok(j(faixas) === j([['Goblin', 2], ['Orcs', 2]]), 'as duas faixas ficam na ordem (a primeira não some): ' + j(faixas));
    // marcar quem está em outra faixa traz para esta (e a outra, vazia, sai — como antes, mas só quando se marca)
    await ev(ids => { __tc.setSel(ids.map(id => ({ c: 'tokens', id }))); __tc.UI.renderAll(); }, [c1]);
    await w(200);
    await page.locator('#turnBand').click(); await w(300);
    ok(!(await page.locator('#bd-' + c1).isChecked()), '(só o Goblin 1 selecionado: vem desmarcado)');
    await page.locator('#bd-' + c1).check();
    await page.locator('#dlg-in').fill('Líder');
    await page.locator('.modal .btn.primary', { hasText: 'Criar a faixa' }).click(); await w(300);
    const faixas2 = await ev(() => __tc.Store.scene().turn.list.filter(e => e.toks).map(e => [e.name, e.toks.length]));
    ok(j(faixas2) === j([['Goblin', 1], ['Orcs', 2], ['Líder', 1]]), 'marcado, ele sai da outra faixa e vem para esta: ' + j(faixas2));
  }

  const tok = id => ev(id => { const t = __tc.Store.get('tokens', id); return t ? JSON.parse(JSON.stringify(t)) : null; }, id);
  const desfazer = async () => { await ev(() => __tc.Tools.undo()); await w(200); };

  // ================= a Ferida permanente =================
  if (parte('ferida')) {
    const [a] = await novaCena(['Ana']);
    await ev(id => { const u = __tc, sc = u.Store.scene(); sc.perms.barras = true; sc.perms.condicoes = true; u.Store.upd('tokens', id, { barVis: 'bar' }); u.setSel([{ c: 'tokens', id }]); u.App.tab = 'sel'; u.App.sideOpen = true; u.UI.renderAll(); }, a);
    await w(300); await limparToasts();
    await page.fill('#cg-busca', 'ferida'); await w(200);
    const chip = page.locator('#cg-list .chip', { hasText: 'Ferida permanente' });
    ok(await chip.count() === 1, '(o chip da Ferida permanente está na lista de condições)');
    await chip.click(); await w(300);
    ok(await page.locator('.modal #fer-bar').count() === 1 && await page.locator('.modal #fer-qtd').count() === 1, 'a Ferida abre a janela: qual barra e quanto apodrece');
    await page.fill('#fer-qtd', '10'); await w(150);
    const previa = await page.locator('#fer-previa').innerText();
    ok(/HP: 30 → 20 de 30/.test(previa) && /10 apodrecidos/.test(previa) && /não passa de 20/.test(previa), 'a prévia diz o que acontece: ' + previa);
    await foto('l8-ferida-janela');
    await page.locator('.modal .btn.primary', { hasText: 'Apodrecer' }).click(); await w(300);
    let k = await tok(a);
    ok(k.bars[0].pod === 10 && k.bars[0].v === 20 && k.conds.includes('ferida'), 'apodreceu: a ponta da barra (10), o valor acima dela desce (30 → 20) e a condição entra: ' + j([k.bars[0], k.conds]));
    ok(/10 de HP apodreceram/.test(await toastTxt()), 'o aviso diz o que apodreceu: ' + await toastTxt());
    const relida = await ev(id => { const sc = JSON.parse(JSON.stringify(__tc.Store.scene())); __tc.normalizeScene(sc); const t = sc.tokens.find(x => x.id === id); return t ? { pod: t.bars[0].pod, conds: t.conds } : null; }, a);
    ok(relida && relida.pod === 10 && relida.conds.includes('ferida'), 'fica guardada: a cena relida (como ao abrir de novo) mantém a ponta podre e a condição: ' + j(relida));
    ok(/10 apodrecidos: a cura não passa de 20/.test(await page.locator('#tk-b0-pod').innerText()) && /10 HP/.test(await page.locator('#cd-ferida-n').innerText()), 'o painel mostra a ponta podre (na barra e na condição)');
    // a cura para no teto; o dano continua
    const barra = async txt => { await ev(([id, txt]) => __tc.Act.barSet(__tc.Store.get('tokens', id), 0, txt), [a, txt]); await w(120); return (await tok(a)).bars[0].v; };
    ok(await barra('-8') === 12, 'o dano continua valendo (−8 → 12)');
    ok(await barra('+15') === 20, 'a cura (+15) para no teto (20)');
    await barra('-8');
    ok(await barra('30') === 20, 'o valor digitado acima do teto fica no teto (30 → 20)');
    await barra('-8');
    await ev(id => __tc.Act.fullHeal([__tc.Store.get('tokens', id)]), a); await w(150);
    ok((await tok(a)).bars[0].v === 20, 'a cura total vai até o teto (20), não até o máximo');
    await barra('-8');
    await ev(id => __tc.Act.areaApply([{ t: __tc.Store.get('tokens', id), half: false }], 'HP', '+50', null, null), a); await w(150);
    ok((await tok(a)).bars[0].v === 20, 'a cura em área para no teto');
    // o jogador (dono do token) pede uma cura: para no teto; e não tira a ferida
    await barra('-8');
    const pedido = await ev(id => {
      const u = __tc, sc = u.Store.scene(), t = u.Store.get('tokens', id);
      u.Store.tx('dono', () => u.Store.upd('tokens', id, { owner: 'p1' }));
      const t2 = u.Store.get('tokens', id), b = t2.bars.map(x => Object.assign({}, x));
      const cura = u.Proj.validar({ c: 'tokens', t: 'upd', id, p: { bars: b.map((x, i) => i ? x : Object.assign({}, x, { v: 30 })) }, b: { bars: b } }, 'p1', sc);
      const tira = u.Proj.validar({ c: 'tokens', t: 'upd', id, p: { conds: [] }, b: { conds: t2.conds.slice() } }, 'p1', sc);
      return { cura: cura && cura.p.bars && cura.p.bars[0].v, tira: tira && tira.p.conds };
    }, a);
    ok(pedido.cura === 20, 'a cura que o jogador pede também para no teto: ' + j(pedido));
    ok(pedido.tira == null || pedido.tira.includes('ferida'), 'o jogador não tira a Ferida permanente do token dele: ' + j(pedido));
    // o que vai para os jogadores: a ponta podre em proporção
    const pub = await ev(id => { const u = __tc, v = u.Proj.projetar(u.Store.scene(), u.Store.S.assets || {}, new Set()).v; u.Store.tx('dono', () => u.Store.upd('tokens', id, { owner: null })); return v.tokens.find(x => x.id === id).bars[0]; }, a);
    ok(Math.abs(pub.pod - 33.3) < 0.2 && pub.m === 100, 'para os jogadores (só a barra), a ponta podre vai em proporção: ' + j(pub));
    if (SHOTS) { await ev(id => { const u = __tc, t = u.Store.get('tokens', id), sc = u.Store.scene(); u.App.view.z = 3; u.Render.centerOn(t.x + sc.cell / 2, t.y + sc.cell / 2); u.Render.request(); }, a); await w(300); }
    await foto('l8-ferida');
    // mudar o quanto (o "Mudar…" da condição)
    await page.locator('#cd-ferida-mudar').click(); await w(250);
    ok(await page.locator('#fer-qtd').inputValue() === '10', 'o Mudar… abre a janela com o que já apodreceu');
    await page.fill('#fer-qtd', '5'); await page.locator('.modal .btn.primary', { hasText: 'Apodrecer' }).click(); await w(250);
    ok((await tok(a)).bars[0].pod === 5 && await barra('+50') === 25, 'mudou para 5: o teto sobe para 25');
    // tirar: o chip de novo
    await limparToasts();
    await page.fill('#cg-busca', 'ferida'); await w(150);
    await page.locator('#cg-list .chip', { hasText: 'Ferida permanente' }).click(); await w(300);
    k = await tok(a);
    ok(!k.conds.includes('ferida') && !k.bars[0].pod, 'tirada a condição, a ponta podre sai junto: ' + j([k.conds, k.bars[0]]));
    ok(/A ferida permanente saiu de Ana/.test(await toastTxt()), 'com o aviso: ' + await toastTxt());
    ok(await barra('+50') === 30, 'e a cura volta a ir até o máximo');
    await desfazer(); await desfazer();
    k = await tok(a);
    ok(k.conds.includes('ferida') && k.bars[0].pod === 5, 'desfazer traz a ferida de volta: ' + j([k.conds, k.bars[0].pod]));
    // a barra que apodrece por outro caminho (como pela ficha ligada) traz a condição; a última que sara a leva
    const porFora = (id, pod) => ev(([id, pod]) => { const u = __tc, t = u.Store.get('tokens', id), bars = t.bars.map((b, i) => (i ? b : Object.assign({}, b, { pod }))); if (!pod) delete bars[0].pod; u.Store.tx('de fora', () => u.Store.upd('tokens', id, { bars })); }, [id, pod]);
    await ev(id => { const u = __tc; u.Store.tx('tirar', () => u.Store.upd('tokens', id, { conds: u.Store.get('tokens', id).conds.filter(c => c !== 'ferida'), bars: u.Store.get('tokens', id).bars.map(b => { const c = Object.assign({}, b); delete c.pod; return c; }) })); }, a);
    await w(150);
    await porFora(a, 8); await w(200);
    k = await tok(a);
    ok(k.bars[0].pod === 8 && k.conds.includes('ferida'), 'a barra que apodrece por outro caminho (a ficha ligada) traz a condição: ' + j([k.conds, k.bars[0].pod]));
    await porFora(a, 0); await w(200);
    k = await tok(a);
    ok(!k.bars[0].pod && !k.conds.includes('ferida'), 'e a última barra que deixa de estar podre a leva: ' + j([k.conds, k.bars[0].pod]));
  }

  // ================= o Clone =================
  if (parte('clone')) {
    const [a, og] = await novaCena(['Ana', 'Ogro']);
    let k;
    const cel = async id => { const t = await tok(id); return t ? [Math.round(t.x / 64), Math.round(t.y / 64)] : null; };
    const copias = () => ev(id => __tc.Store.scene().tokens.filter(x => x.clone === id).map(x => x.id), a);
    const abrir = async id => { await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.App.tab = 'sel'; __tc.App.sideOpen = true; __tc.UI.renderAll(); }, id); await w(250); };
    await abrir(a); await limparToasts();
    const inicio = await cel(a);
    await page.fill('#cg-busca', 'clone'); await w(200);
    await page.locator('#cg-list .chip', { hasText: 'Clone' }).click(); await w(300);
    ok(await page.locator('.modal #cl-n').inputValue() === '3' && await page.locator('.modal #cl-r').inputValue() === '2' && await page.locator('#cl-quem-sortear').isChecked(), 'o Clone abre a janela: 3 cópias, raio 2 e "Sortear agora" de começo');
    await foto('l8-clone-janela');
    await page.locator('.modal .btn.primary', { hasText: 'Criar os clones' }).click(); await w(350);
    let cs = await copias();
    const todos = [a].concat(cs);
    const info = await ev(ids => ids.map(id => { const t = __tc.Store.get('tokens', id); return { n: t.name, bars: JSON.stringify(t.bars), conds: t.conds.join(','), x: Math.round(t.x / 64), y: Math.round(t.y / 64), clone: t.clone || null }; }), todos);
    ok(cs.length === 3, 'três cópias: ' + cs.length);
    ok(info.every(x => x.n === 'Ana' && x.bars === info[0].bars && x.conds === 'clone'), 'as cópias são iguais ao real (nome, barras, condições — com a Clone): ' + j(info.map(x => [x.n, x.conds])));
    const lugares = info.map(x => x.x + ',' + x.y);
    ok(new Set(lugares).size === 4 && info.every(x => Math.max(Math.abs(x.x - inicio[0]), Math.abs(x.y - inicio[1])) <= 2) && lugares.includes(inicio.join(',')) && !lugares.includes('4,2'),
      'cada um num lugar, no raio de 2 quadrados, sem pisar no Ogro (e um deles no lugar de antes): ' + j(lugares));
    const colados = info.some((x, i) => info.some((y, k) => k > i && Math.max(Math.abs(x.x - y.x), Math.abs(x.y - y.y)) <= 1));
    ok(!colados, 'espalhados: nenhum encostado no outro (havendo lugar no raio): ' + j(lugares));
    ok(await ev(id => __tc.realDeClone(__tc.Store.get('tokens', id), __tc.Store.scene()), a) && /Sorteado: o real é o da coroa/.test(await toastTxt()), 'o real ganhou a coroa (só o mestre vê) e o aviso diz que foi sorteado: ' + await toastTxt());
    ok(j((await ev(ids => ids.map(id => __tc.grupoDoClone(__tc.Store.get('tokens', id), __tc.Store.scene()).length), todos))) === j([4, 4, 4, 4]), 'o grupo do clone (para o anel da vez e o clique na ordem) tem os quatro');
    if (SHOTS) { await ev(id => { const u = __tc, t = u.Store.get('tokens', id), sc = u.Store.scene(); u.App.view.z = 1.7; u.Render.centerOn(t.x + sc.cell / 2, t.y + sc.cell / 2); u.Render.request(); }, a); await w(300); }
    await foto('l8-clone');
    // o que vai para os jogadores
    const pub = await ev(() => { const u = __tc; return u.Proj.projetar(u.Store.scene(), u.Store.S.assets || {}, new Set()).v.tokens.map(x => ({ n: x.name, cg: x.cg || null, clone: x.clone || null })); });
    const anas = pub.filter(x => x.n === 'Ana');
    ok(anas.length === 4 && anas.every(x => !x.clone && x.cg && x.cg === anas[0].cg) && pub.find(x => x.n === 'Ogro').cg == null, 'para os jogadores: nenhuma marca de cópia, e os quatro com a mesma marca de grupo (que não diz qual é o real): ' + j(pub));
    // dano numa cópia: só ela some
    await limparToasts();
    await ev(id => __tc.Act.barSet(__tc.Store.get('tokens', id), 0, '-5'), cs[0]); await w(250);
    ok((await copias()).length === 2 && !(await tok(cs[0])) && (await tok(a)).bars[0].v === 30, 'dano numa cópia: só ela some (o real continua com 30)');
    ok(/Um clone de Ana levou dano e sumiu/.test(await toastTxt()), 'o aviso: ' + await toastTxt());
    await desfazer();
    ok((await copias()).length === 3 && (await tok(cs[0])).bars[0].v === 30, 'desfazer traz a cópia de volta, inteira');
    // o que muda no real vai para as cópias
    await ev(id => __tc.Act.condToggle([__tc.Store.get('tokens', id)], 'caido'), a); await w(200);
    ok((await ev(ids => ids.every(id => __tc.Store.get('tokens', id).conds.includes('caido')), await copias())), 'a condição nova no real vai para as cópias (Caído)');
    await ev(id => __tc.Act.barExtra(__tc.Store.get('tokens', id), 0, 5), a); await w(200);
    ok((await ev(ids => ids.every(id => __tc.barX(__tc.Store.get('tokens', id).bars[0]) === 5), await copias())), 'a sobrevida dada ao real vai para as cópias');
    // dano no real (na sobrevida, também é dano): todas somem
    await limparToasts();
    await ev(id => __tc.Act.barSet(__tc.Store.get('tokens', id), 0, '-2'), a); await w(250);
    ok((await copias()).length === 0, 'dano no real (mesmo só na sobrevida): todas as cópias somem');
    ok(/Ana \(o real\) levou dano: os 3 clones sumiram/.test(await toastTxt()), 'o aviso: ' + await toastTxt());
    await desfazer();
    cs = await copias();
    ok(cs.length === 3, 'desfazer traz as três de volta');
    // "Este é o real" (no painel da cópia)
    const antesReal = await cel(a), antesCopia = await cel(cs[1]);
    await abrir(cs[1]);
    ok(/Cópia de Ana/.test(await page.locator('#s-clone').innerText()), 'no painel da cópia: "Cópia de Ana (só você sabe)"');
    await page.locator('#tk-cl-real').click(); await w(250);
    ok(j(await cel(a)) === j(antesCopia) && j(await cel(cs[1])) === j(antesReal) && await ev(() => __tc.App.sel.map(s => s.id).join()) === a, '"Este é o real": o real troca de lugar com a cópia (e fica selecionado)');
    await desfazer();
    ok(j(await cel(a)) === j(antesReal), 'desfazer destroca');
    // sortear
    const grupoAntes = (await ev(ids => ids.map(id => { const t = __tc.Store.get('tokens', id); return Math.round(t.x / 64) + ',' + Math.round(t.y / 64); }), [a].concat(cs))).sort();
    await ev(id => __tc.Act.cloneSortear(id), a); await w(200);
    const grupoDepois = (await ev(ids => ids.map(id => { const t = __tc.Store.get('tokens', id); return Math.round(t.x / 64) + ',' + Math.round(t.y / 64); }), [a].concat(cs))).sort();
    ok(j(grupoAntes) === j(grupoDepois) && grupoAntes.includes((await cel(a)).join(',')), 'sortear: o real fica num dos lugares do grupo (os lugares são os mesmos)');
    // desfazer os clones (no painel do real)
    await abrir(a); await limparToasts();
    await page.locator('#tk-cl-fim').click(); await w(250);
    k = await tok(a);
    ok((await copias()).length === 0 && !k.conds.includes('clone'), '"Desfazer os clones": as cópias somem e a condição sai do real');
    // escolher no mapa
    await page.fill('#cg-busca', 'clone'); await w(150);
    await page.locator('#cg-list .chip', { hasText: 'Clone' }).click(); await w(250);
    await page.locator('#cl-quem-eu').check();
    await page.locator('.modal .btn.primary', { hasText: 'Criar os clones' }).click(); await w(300);
    cs = await copias();
    ok(cs.length === 3 && /Clique no clone que vai ser o real de Ana/.test(await page.locator('#bannerText').innerText()), 'com "Eu escolho no mapa", a faixa de cima pede o clique');
    const alvo = await cel(cs[2]), real0 = await cel(a);
    const box = await page.locator('#cv').boundingBox(), pt = await ev(([x, y]) => __tc.Render.toScreen(x * 64 + 32, y * 64 + 32), alvo);
    await page.mouse.click(box.x + pt[0], box.y + pt[1]); await w(300);
    ok(j(await cel(a)) === j(alvo) && j(await cel(cs[2])) === j(real0) && await page.locator('#banner').isHidden(), 'o clique numa cópia faz dela o real (o real vai para lá), e a faixa sai');
    await ev(id => { __tc.App.escolhaReal = id; __tc.UI.renderAll(); }, a); await w(150);
    await page.locator('#cv').click({ position: { x: 5, y: 5 } }); await w(150);
    ok(await page.locator('#banner').isVisible() && /Clique num dos clones/.test(await toastTxt()), 'um clique fora do grupo não escolhe nada (pede de novo)');
    await page.keyboard.press('Escape'); await w(200);
    ok(await page.locator('#banner').isHidden() && !(await ev(() => __tc.App.escolhaReal)) && j(await cel(a)) === j(alvo), 'Esc encerra a escolha, sem mudar nada');
    // a cópia que perde a condição some
    await limparToasts();
    await ev(id => __tc.Act.condToggle([__tc.Store.get('tokens', id)], 'clone'), cs[0]); await w(250);
    ok((await copias()).length === 2 && /Uma cópia de Ana sem a condição Clone sumiu/.test(await toastTxt()), 'a cópia sem a condição some: ' + await toastTxt());
    // a condição acaba pelas rodadas: na vez do real, ao passar
    await ev(([a, og]) => {
      const u = __tc;
      u.Act.condSet(u.Store.get('tokens', a), 'clone', { d: 1, d0: 1 });
      u.Act.turnAdd([u.Store.get('tokens', a), u.Store.get('tokens', og)]);
      u.Act.turnPatch(x => { x.on = true; x.round = 1; x.cur = x.list.find(e => e.token === a).id; }, 'preparar');
    }, [a, og]); await w(200);
    ok((await ev(id => __tc.Store.scene().tokens.filter(x => x.clone === id).every(x => (x.cinfo.clone || {}).d === 1), a)), 'as rodadas da condição no real vão para as cópias');
    await limparToasts();
    await ev(() => __tc.UI.passarTurno(1)); await w(300);
    ok((await copias()).length === 0 && !(await tok(a)).conds.includes('clone'), 'acabaram as rodadas da condição no real: as cópias somem juntas');
    ok(/A condição Clone de Ana acabou/.test(await toastTxt()), 'o aviso: ' + await toastTxt());
    // o real que sai da cena leva as cópias
    await desfazer();
    ok((await copias()).length === 2, '(desfazer traz as cópias)');
    await limparToasts();
    await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.Act.deleteSel(); }, a); await w(250);
    ok((await ev(() => __tc.Store.scene().tokens.filter(x => x.name === 'Ana').length)) === 0 && /O real saiu da cena/.test(await toastTxt()), 'o real apagado leva as cópias: ' + await toastTxt());
    await desfazer();
    // com dois tokens escolhidos, o chip do Clone fica desligado
    await ev(ids => { __tc.setSel(ids.map(id => ({ c: 'tokens', id }))); __tc.App.tab = 'sel'; __tc.UI.renderAll(); }, [a, og]); await w(250);
    const multi = await ev(() => { const c = [...document.querySelectorAll('.chip')].find(x => x.textContent.trim() === 'Clone'); return c ? [c.disabled, c.title] : null; });
    ok(multi && multi[0] && /um token de cada vez/.test(multi[1]), 'com vários tokens, a Ferida e o Clone ficam para um de cada vez: ' + j(multi));
    // o dano em área não oferece a Ferida nem o Clone
    const nomes = await ev(() => [...__tc.CONDS].filter(c => c.id === 'ferida' || c.id === 'clone').length);
    ok(nomes === 2, '(as duas condições existem)');
    const limpo = await ev(() => { const c = __tc.newScene('x'); c.effects = [{ id: 'fx1', fx: 'fogo', k: 'circ', x: 0, y: 0, r: 1, apply: { bar: 'HP', amt: '', cond: { id: 'clone', n: 0, d: 0 }, skip: [] } }]; __tc.normalizeScene(c); return c.effects[0].apply; });
    ok(limpo === null, 'uma zona que tentasse aplicar o Clone fica sem a condição: ' + j(limpo));

    // os lugares das cópias: só os livres, sem parede no caminho; e o sorteio troca de verdade
    const cenaEm = (ana, outros, paredes) => ev(([ana, outros, paredes]) => {
      const u = __tc, sc = u.newScene('Lote 8 — lugares');
      u.Store.addScene(sc); u.Store.S.current = sc.id; u.UI.renderAll();
      let id = null;
      u.Store.tx('montar', () => {
        const k = u.newToken(sc, ana[0] * sc.cell, ana[1] * sc.cell, { name: 'Ana' }); k.bars = [{ n: 'HP', v: 30, m: 30, c: '#d65a5a', on: true, k: 'bar' }]; u.Store.add('tokens', k); id = k.id;
        for (const [x, y] of outros) u.Store.add('tokens', u.newToken(sc, x * sc.cell, y * sc.cell, { name: 'Pedra' }));
        paredes.forEach(([x1, y1, x2, y2], i) => u.Store.add('walls', { id: 'wl-teste-' + i, k: 'wall', x1: x1 * sc.cell, y1: y1 * sc.cell, x2: x2 * sc.cell, y2: y2 * sc.cell, open: false, locked: false }));
      });
      return id;
    }, [ana, outros, paredes]);
    const lugaresDasCopias = id => ev(id => { const sc = __tc.Store.scene(); return sc.tokens.filter(x => x.clone === id).map(x => Math.round(x.x / sc.cell) + ',' + Math.round(x.y / sc.cell)).sort(); }, id);
    // gente em volta: só três lugares livres no raio 2
    const livres = ['6,6', '10,6', '8,10'], pedras = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const q = (8 + dx) + ',' + (8 + dy); if ((dx || dy) && !livres.includes(q)) pedras.push([8 + dx, 8 + dy]); }
    let ana = await cenaEm([8, 8], pedras, []);
    await ev(id => __tc.Act.cloneCriar(__tc.Store.get('tokens', id), 3, 2, false), ana); await w(200);
    ok(j(await lugaresDasCopias(ana)) === j(livres.slice().sort()), 'com gente em volta, as cópias vão só para os lugares livres: ' + j(await lugaresDasCopias(ana)));
    // numa sala fechada: as cópias ficam do lado de dentro (nenhuma do outro lado da parede)
    ana = await cenaEm([8, 8], [], [[7, 7, 10, 7], [10, 7, 10, 10], [10, 10, 7, 10], [7, 10, 7, 7]]);
    await ev(id => __tc.Act.cloneCriar(__tc.Store.get('tokens', id), 3, 2, false), ana); await w(200);
    const naSala = await lugaresDasCopias(ana);
    ok(naSala.length === 3 && naSala.every(q => { const [x, y] = q.split(',').map(Number); return x >= 7 && x <= 9 && y >= 7 && y <= 9; }), 'numa sala fechada, as cópias ficam dentro (sem atravessar a parede): ' + j(naSala));
    // o sorteio troca: com o acaso preso no fim, o real fica no lugar da última cópia
    ana = await cenaEm([8, 8], [], []);
    await ev(id => { const r0 = Math.random; Math.random = () => 0.999; try { __tc.Act.cloneCriar(__tc.Store.get('tokens', id), 3, 2, true); } finally { Math.random = r0; } }, ana); await w(200);
    const ondeReal = await ev(id => { const t = __tc.Store.get('tokens', id), sc = __tc.Store.scene(); return Math.round(t.x / sc.cell) + ',' + Math.round(t.y / sc.cell); }, ana);
    ok(ondeReal !== '8,8' && (await lugaresDasCopias(ana)).includes('8,8'), 'o sorteio troca de verdade: o real foi para o lugar de uma cópia (e uma cópia ficou no lugar dele): ' + ondeReal);
  }

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 10).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  console.log(fails ? `${n - fails}/${n} ok — ${fails} falharam` : `${n}/${n} ok`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
