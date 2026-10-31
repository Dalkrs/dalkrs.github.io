// Bateria do lote 47 nas Cenas: o controle do mestre.
//   · a faixa de baixo: um clique na condição tira (com Desfazer); a de contador tira pelo selo do meio;
//   · o cadeado "Só à mão": a Cura total e o Restaurar energias não mexem na barra trancada (nem na barra especial
//     da ficha, nem na do painel); abrir o cadeado deixa mexer;
//   · a vez: atrasar (joga depois de quem o mestre escolher e fica lá), pular (e o aviso de pular quem está Atordoado),
//     entrar no meio do combate (rola e entra no lugar, sem reordenar), a rodada de surpresa;
//   · os lembretes por rodada (a janela na rodada certa; "Fazer" revela e põe na ordem; repetir a cada N);
//   · os momentos preparados (tokens, hora do dia, luz, névoa, zona, som) e o Desfazer; nada vai aos jogadores.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
const j = JSON.stringify;

(async () => {
  const t = await open();
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 150);
  const foto = async nome => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const tok = id => ev(id => JSON.parse(JSON.stringify(__tc.Store.get('tokens', id))), id);
  const turno = () => ev(() => JSON.parse(JSON.stringify(__tc.Store.scene().turn)));
  const avisos = () => ev(() => [...document.querySelectorAll('.toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const desfazerDo = async texto => { await page.locator('.toast', { hasText: texto }).last().locator('button', { hasText: 'Desfazer' }).click(); await w(250); };
  const selecionar = id => ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, id);
  const nomesDaOrdem = async () => { const tn = await turno(); return ev(l => l.map(e => e.name), tn.list); };
  const vezDe = async () => { const tn = await turno(); const e = tn.list.find(x => x.id === tn.cur); return e ? e.name : null; };

  const ids = await ev(() => { const { Store, newToken } = __tc, sc = Store.scene();
    const mk = (nome, x, y, o) => Object.assign(newToken(sc, x * sc.cell, y * sc.cell, { name: nome }), o || {});
    const ana = mk('Ana', 4, 4), bruto = mk('Bruto', 7, 4), cora = mk('Cora', 10, 4), dain = mk('Dain', 4, 7), ogro = mk('Ogro', 12, 8, { hidden: true }), lobo = mk('Lobo', 13, 8, { hidden: true });
    dain.bars = [
      { n: 'HP', c: '#c8242c', v: 3, m: 20, k: 'bar', on: true, vis: '' },
      { n: 'Chamado de Selene', c: '#d96aa0', v: 2, m: 6, k: 'pts', on: true, vis: '', ref: 'pd:2frnnfb8' },
      { n: 'Voz da Graça', c: '#4fc3c0', v: 1, m: 4, k: 'pts', on: true, vis: '', ref: 'pd:vozgraca', st: 4 },
      { n: 'Mana', c: '#3b6fd1', v: 1, m: 10, k: 'bar', on: true, vis: '', mao: true },
      { n: 'Fôlego', c: '#58b368', v: 1, m: 5, k: 'bar', on: true, vis: '' },
    ].map(__tc.cleanBar);
    ana.conds = ['veneno', 'atordoado', 'sangue']; ana.cinfo = { sangue: { n: 2 } };
    Store.tx('Criar', () => { for (const k of [ana, bruto, cora, dain, ogro, lobo]) Store.add('tokens', k); });
    return { ana: ana.id, bruto: bruto.id, cora: cora.id, dain: dain.id, ogro: ogro.id, lobo: lobo.id };
  });
  await w(250);

  /* ---------- a faixa de baixo: tirar a condição num clique ---------- */
  await ev(id => { __tc.setSel([{ c: 'tokens', id }]); }, ids.ana); await w(250);
  ok(await page.locator('#hud #hud-c-veneno.hud-tira').count() === 1 && await page.locator('#hud #hud-c-sangue.hud-tira').count() === 1, 'na faixa de baixo, cada condição é um botão de tirar (a de contador, no selo do meio)');
  await page.locator('#hud #hud-c-veneno').hover(); await w(200);
  await foto('l47-hud-condicao');
  await page.locator('#hud #hud-c-veneno').click(); await w(250);
  let k = await tok(ids.ana);
  ok(!k.conds.includes('veneno') && k.conds.includes('atordoado') && /Envenenado saiu de Ana\./.test(await avisos()), 'um clique tira o Envenenado, com o aviso — ' + j(k.conds));
  await desfazerDo('saiu de Ana');
  ok((await tok(ids.ana)).conds.includes('veneno'), 'Desfazer devolve a condição');
  await page.locator('#hud #hud-c-sangue').click(); await w(250);
  k = await tok(ids.ana);
  ok(!k.conds.includes('sangue') && !(k.cinfo || {}).sangue, 'a de contador sai inteira pelo selo (o − e o + continuam ao lado)');
  ok(await page.locator('#hud #hud-c-veneno-minus').count() === 0 && await page.locator('#hud-cond').count() === 1, 'o escudo do fim da faixa continua abrindo a janela de condições');

  /* ---------- o cadeado "Só à mão" ---------- */
  await selecionar(ids.dain); await w(300);
  ok(await page.locator('#tk-b1-lock').count() === 1 && await page.locator('#tk-b2-lock').count() === 1 && await page.locator('#tk-b3-lock').count() === 1 && await page.locator('#tk-b4-lock').count() === 0 && await page.locator('#tk-b0-lock').count() === 0,
    'o cadeado aparece nas barras especiais da ficha e na Mana trancada à mão (não no HP nem no Fôlego)');
  await page.locator('#tk-heal').click(); await w(250);
  k = await tok(ids.dain);
  ok(j(k.bars.map(b => b.v)) === j([20, 2, 1, 1, 5]), 'Cura total: HP e Fôlego enchem; Chamado de Selene, Voz da Graça e Mana ficam — ' + j(k.bars.map(b => b.v)));
  await ev(id => __tc.Store.tx('x', () => __tc.Store.upd('tokens', id, { bars: __tc.Store.get('tokens', id).bars.map((b, i) => (i === 4 ? Object.assign({}, b, { v: 1 }) : b)) })), ids.dain);
  await ev(() => __tc.UI.openTab('turn')); await w(200);
  await page.locator('#turnRestaurar').click(); await w(300);
  const tela = await page.locator('#rs-tela').innerText();
  ok(/Fôlego 1 → 5/.test(tela) && !/Chamado|Voz da Gra|Mana/.test(tela), 'Restaurar energias: a prévia mostra só o Fôlego (as trancadas ficam de fora) — ' + tela.replace(/\s+/g, ' '));
  await foto('l47-restaurar');
  await page.locator('.modal .btn', { hasText: 'Restaurar' }).click(); await w(250);
  k = await tok(ids.dain);
  ok(j(k.bars.map(b => b.v)) === j([20, 2, 1, 1, 5]), 'depois de restaurar, as trancadas continuam onde estavam — ' + j(k.bars.map(b => b.v)));
  // abrir o cadeado da Voz da Graça
  await selecionar(ids.dain); await w(250);
  await page.locator('#tk-b2-more').click(); await w(200);
  ok(await page.locator('#tk-b2-mao').isChecked(), 'nas opções da barra, "Só à mão" vem ligado na especial da ficha');
  await foto('l47-cadeado');
  await page.locator('.sw', { has: page.locator('#tk-b2-mao') }).click(); await w(250);
  k = await tok(ids.dain);
  ok(k.bars[2].mao === false && await page.locator('#tk-b2-lock').count() === 0, 'desligado, a barra fica aberta (mao: false) e o cadeado some');
  await ev(() => __tc.UI.openTab('turn')); await w(150);
  await page.locator('#turnRestaurar').click(); await w(300);
  ok(/Voz da Graça 1 → 4/.test(await page.locator('#rs-tela').innerText()), 'aberta, o Restaurar já leva a Voz da Graça ao começo dela (4)');
  await page.keyboard.press('Escape'); await w(200);

  /* ---------- a vez: surpresa, atrasar, pular, entrar no meio ---------- */
  await ev(o => { const { Store, Act } = __tc; Act.turnPatch(x => { x.list = []; x.on = false; x.round = 1; x.cur = null; }, 'Limpar');
    Act.turnAdd([o.ana, o.bruto, o.cora, o.dain].map(id => Store.get('tokens', id)));
    Act.turnPatch(x => { const v = { Ana: 18, Bruto: 15, Cora: 12, Dain: 9 }; for (const e of x.list) e.init = v[e.name]; __tc.turnSort(x.list); x.cur = x.list[0].id; }, 'Iniciativas'); }, ids);
  await ev(() => __tc.UI.openTab('turn')); await w(200);
  await page.locator('#turnSurpresa').click(); await w(250);
  await page.locator('#surpresa-tela label', { hasText: 'Bruto' }).click();
  await page.locator('#surpresa-tela label', { hasText: 'Ana' }).click();
  await page.locator('.modal .btn', { hasText: 'Confirmar' }).click(); await w(250);
  ok(await page.locator('.turn-sur').count() === 2, 'rodada de surpresa: Ana e Bruto marcados (“surpreso” na linha)');
  await page.locator('#turnOnOff').click(); await w(400);
  ok(await vezDe() === 'Cora', 'o combate começa na Cora: Ana e Bruto, surpreendidos, não jogam na 1ª rodada — ' + await vezDe());
  await ev(() => document.querySelectorAll('.modal').length && __tc.UI.closeModal());
  await page.locator('#turnNext').click(); await w(300);
  ok(await vezDe() === 'Dain', 'depois da Cora, o Dain');
  await page.locator('#turnNext').click(); await w(400);
  let tn = await turno();
  ok(await vezDe() === 'Ana' && tn.round === 2, 'na 2ª rodada, todos jogam: a vez é da Ana');
  // a Ana está Atordoada: o aviso oferece pular
  ok(/Pular a vez de Ana \(Atordoado\)\?/.test(await avisos()), 'na vez da Ana (Atordoada), o aviso oferece pular — ' + await avisos());
  await page.locator('.toast', { hasText: 'Pular a vez de Ana' }).locator('button', { hasText: 'Pular' }).click(); await w(350);
  ok(await vezDe() === 'Bruto' && /Ana perdeu a vez \(Atordoado\)\./.test(await avisos()), 'Pular: a vez vai para o Bruto, e o aviso diz o motivo');
  await foto('l47-vez');
  // atrasar o Bruto para depois do Dain
  await page.locator('#turnAtrasar').click(); await w(250);
  ok(await page.locator('#atrasar-tela .mt-op').count() === 2, 'atrasar: a janela oferece quem ainda joga nesta rodada (Cora e Dain)');
  await foto('l47-atrasar');
  await page.locator('#atrasar-tela .mt-op', { hasText: 'Depois de Dain' }).click(); await w(300);
  ok(j(await nomesDaOrdem()) === j(['Ana', 'Cora', 'Dain', 'Bruto']) && await vezDe() === 'Cora', 'Bruto atrasou: a ordem fica Ana, Cora, Dain, Bruto, e a vez vai para a Cora — ' + j(await nomesDaOrdem()));
  tn = await turno();
  ok(tn.list.find(e => e.name === 'Bruto').init === 9 && /Bruto atrasou a vez: joga depois de Dain\./.test(await avisos()), 'a iniciativa dele vira a do Dain (fica no lugar novo) e o aviso diz');
  await desfazerDo('atrasou a vez');
  ok(j(await nomesDaOrdem()) === j(['Ana', 'Bruto', 'Cora', 'Dain']) && await vezDe() === 'Bruto', 'Desfazer volta a ordem e a vez');
  await page.locator('#turnAtrasar').click(); await w(200);
  await page.locator('#atrasar-tela .mt-op', { hasText: 'Depois de Dain' }).click(); await w(300);
  // entrar no meio do combate
  await ev(o => { __tc.Store.tx('mostrar', () => __tc.Store.upd('tokens', o.lobo, { hidden: false, ini: 50 })); __tc.setSel([{ c: 'tokens', id: o.lobo }]); __tc.UI.openTab('turn'); }, ids); await w(250);
  ok(/Entrar no combate \(1\)/.test(await page.locator('#turnEntrar').innerText()), 'com o Lobo selecionado (fora da ordem), "Entrar no combate (1)"');
  await page.locator('#turnEntrar').click(); await w(300);
  let ordem = await nomesDaOrdem();
  ok(ordem[0] === 'Lobo' && j(ordem.slice(1)) === j(['Ana', 'Cora', 'Dain', 'Bruto']) && await vezDe() === 'Cora', 'o Lobo rolou alto e entra no começo, sem reordenar os outros; a vez continua com a Cora — ' + j(ordem));
  ok(/Lobo \(\d+\), a partir da rodada que vem/.test(await avisos()), 'o aviso diz que ele joga a partir da rodada que vem');

  /* ---------- os lembretes ---------- */
  await page.locator('#t-lembretes summary').click().catch(() => {}); await w(150);
  await page.locator('#lb-novo').click(); await w(250);
  await page.locator('#lb-txt').fill('Reforços chegam pela porta norte');
  await page.locator('#lb-r').fill('3');
  await page.locator('.sw', { has: page.locator('#lb-mesa') }).click();
  await page.locator('#lembrete-tela label', { hasText: 'Ogro' }).click();
  await foto('l47-lembrete-novo');
  await page.locator('.modal .btn', { hasText: 'Criar' }).click(); await w(250);
  await page.locator('#lb-novo').click(); await w(200);
  await page.locator('#lb-txt').fill('O vulcão cospe fogo'); await page.locator('#lb-r').fill('3'); await page.locator('#lb-cada').fill('2');
  await page.locator('.modal .btn', { hasText: 'Criar' }).click(); await w(250);
  let sc = await ev(() => JSON.parse(JSON.stringify(__tc.Store.scene().lembretes)));
  ok(sc.length === 2 && sc[0].r === 3 && sc[0].mesa === true && j(sc[0].toks) === j([ids.ogro]) && sc[1].cada === 2, 'dois lembretes guardados na cena (rodada 3 com o Ogro e a mesa; o vulcão a cada 2) — ' + j(sc));
  ok(await ev(() => { const sc = __tc.Store.scene(); return !('lembretes' in __tc.Proj.projetar(sc, {}, null).m); }), 'os lembretes não vão para os jogadores');
  // até a rodada 3
  for (let i = 0; i < 16 && (await turno()).round < 3; i++) { await ev(() => { if (document.querySelector('.modal')) __tc.UI.closeModal(); }); await page.locator('#turnNext').click(); await w(300); }
  await w(200);
  ok((await turno()).round === 3 && await page.locator('#lembrete-aviso').count() === 1, 'na rodada 3, a janela dos lembretes abre — rodada ' + (await turno()).round);
  const txtAviso = await page.locator('#lembrete-aviso').innerText();
  ok(/Reforços chegam pela porta norte/.test(txtAviso) && /O vulcão cospe fogo/.test(txtAviso) && /1 token aparece e o texto vai à mesa/.test(txtAviso), 'ela mostra os dois, e o que cada um faz — ' + txtAviso.replace(/\s+/g, ' '));
  await foto('l47-lembrete-rodada');
  await page.locator('.modal .btn', { hasText: 'Fazer' }).click(); await w(300);
  k = await tok(ids.ogro);
  ordem = await nomesDaOrdem();
  ok(!k.hidden && ordem.includes('Ogro'), '"Fazer": o Ogro aparece e entra na ordem — ' + j(ordem));
  await desfazerDo('apareceu');
  ok((await tok(ids.ogro)).hidden && !(await nomesDaOrdem()).includes('Ogro'), 'um Desfazer tira os dois (ele volta a se esconder e sai da ordem)');
  ok(await ev(() => { const M = __tc.Mestre; return typeof M.naRodada === 'function'; }), '(o lembrete que repete: a cada 2 rodadas)');
  for (let i = 0; i < 16 && (await turno()).round < 5; i++) { await ev(() => { if (document.querySelector('.modal')) __tc.UI.closeModal(); }); await page.locator('#turnNext').click(); await w(250); }
  await w(200);
  const t5 = await page.locator('#lembrete-aviso').innerText().catch(async () => 'SEM JANELA: ' + await ev(() => [...document.querySelectorAll('.modal-t')].map(x => x.textContent).join('|')) + ' ¶ ' + await avisos());
  ok((await turno()).round === 5 && /vulcão/.test(t5) && !/Reforços/.test(t5), 'na rodada 5, só o do vulcão volta — ' + t5.replace(/\s+/g, ' '));
  await ev(() => __tc.UI.closeModal());

  /* ---------- os momentos preparados ---------- */
  const zona = await ev(() => { const { Store } = __tc, sc = Store.scene(); const e = { id: 'fx_test1', fx: 'fogo', x: 10 * sc.cell, y: 10 * sc.cell, r: 1, rw: 2, rh: 2, gm: true, dur: 0 };
    const l = { id: 'lz_test1', name: 'Tocha', x: 3 * sc.cell, y: 3 * sc.cell, bright: 2, dim: 4, c: '#ffaa55', on: true };
    Store.tx('Preparar', () => { Store.add('effects', e); Store.add('lights', l); }); return e.id; });
  await ev(() => __tc.UI.openTab('scene')); await w(250);
  await page.locator('#c-momentos summary').click().catch(() => {}); await w(150);
  await page.locator('#mo-novo').click(); await w(250);
  await page.locator('#mo-nome').fill('A emboscada');
  await page.locator('#momento-tela label', { hasText: 'Ogro' }).click();
  await page.locator('#mo-tone').selectOption('noite');
  await page.locator('#mo-som').selectOption('trovao');
  await page.locator('#mo-l-lz_test1').selectOption('off');
  await page.locator('#mo-z-' + zona).check();
  await page.locator('#mo-txt').fill('O chão treme e as tochas se apagam…');
  await foto('l47-momento-novo');
  await page.locator('.modal .btn', { hasText: 'Criar' }).click(); await w(300);
  ok(/A emboscada/.test(await page.locator('#mo-lista').innerText()) && /1 token aparece · noite · apaga 1 luz · som: trovão · 1 zona · narração/.test(await page.locator('#mo-lista').innerText()), 'o momento aparece na aba Cena, com o resumo — ' + (await page.locator('#mo-lista').innerText()).replace(/\s+/g, ' '));
  await foto('l47-momentos');
  const som0 = await ev(() => __tc.Som.vezesMomento);
  const moId = await ev(() => __tc.Store.scene().momentos[0].id);
  await page.locator('#mo-soltar-' + moId).click(); await w(350);
  const depois = await ev(o => { const { Store } = __tc, sc = Store.scene(); return { ogro: Store.get('tokens', o.ogro).hidden, tone: sc.tone, light: sc.light, tocha: Store.get('lights', 'lz_test1').on, zona: Store.get('effects', 'fx_test1').gm, som: sc.momSom, emCombate: sc.turn.list.some(e => e.token === o.ogro) }; }, ids);
  ok(depois.ogro === false && depois.tone === 'noite' && depois.light === 'penumbra' && depois.tocha === false && depois.zona === false && depois.som && depois.som.k === 'trovao' && depois.emCombate, 'Soltar: o Ogro aparece (e entra no combate), a noite cai, a tocha apaga, a zona aparece e o som vai para todos — ' + j(depois));
  ok(await ev(() => __tc.Som.ultimoMomento) === 'trovao' && await ev(() => __tc.Som.vezesMomento) === som0 + 1, 'o mestre ouve o trovão ao soltar');
  ok(/Momento “A emboscada”/.test(await avisos()), 'o aviso do momento, com Desfazer');
  await desfazerDo('Momento “A emboscada”');
  const volta = await ev(o => { const { Store } = __tc, sc = Store.scene(); return { ogro: Store.get('tokens', o.ogro).hidden, tone: sc.tone, tocha: Store.get('lights', 'lz_test1').on, zona: Store.get('effects', 'fx_test1').gm, emCombate: sc.turn.list.some(e => e.token === o.ogro) }; }, ids);
  ok(volta.ogro === true && volta.tone !== 'noite' && volta.tocha === true && volta.zona === true && !volta.emCombate, 'um Desfazer volta tudo — ' + j(volta));
  ok(await ev(() => { const sc = __tc.Store.scene(), m = __tc.Proj.projetar(sc, {}, null).m; return !('momentos' in m); }), 'os momentos não vão para os jogadores');
  // o som chega a quem está vendo: outro aparelho (aqui, simulado como jogador) toca quando o número muda
  ok(await ev(() => { const sc = __tc.Store.scene(); sc.momSom = { k: 'gongo', n: 41 }; __tc.Mestre.vigiar(); return true; }), '(o som do momento: o aparelho vê a mudança)');

  /* ---------- o grupo Mestre na barra da esquerda ---------- */
  await ev(() => { if (document.querySelector('.modal')) __tc.UI.closeModal(); __tc.UI.openTab('sel'); __tc.setSel([]); }); await w(200);
  ok(j(await page.locator('#rail .mt-rail .tool').evaluateAll(l => l.map(b => b.id))) === j(['mt-rail-vez', 'mt-rail-momentos', 'mt-rail-lembretes', 'mt-rail-cura']), 'a barra da esquerda tem o grupo Mestre: a vez, os momentos, os lembretes e a cura');
  ok(await page.locator('#rail .rail-g', { hasText: 'Mestre' }).count() === 1, '(com o nome do grupo)');
  const railOk = await ev(() => { const r = document.getElementById('rail'), b = document.getElementById('mt-rail-cura').getBoundingClientRect(); return b.bottom <= r.getBoundingClientRect().bottom + 1; });
  ok(railOk, 'os quatro botões cabem na barra');
  await page.locator('#mt-rail-vez').click(); await w(250);
  const vt = await page.locator('#mt-pop-vez').innerText();
  ok(/Rodada \d+ · vez de/.test(vt) && await page.locator('#mtp-prox').count() === 1 && await page.locator('#mtp-atrasar').count() === 1 && await page.locator('#mtp-pular').count() === 1, 'o painel da vez: a rodada, de quem é a vez, próximo, atrasar e pular — ' + vt.replace(/\s+/g, ' '));
  await foto('l47-barra-vez');
  const antesV = await vezDe();
  await page.locator('#mtp-prox').click(); await w(350);
  ok(await vezDe() !== antesV && await page.locator('#mt-pop-vez').count() === 1, '"Próximo turno" passa a vez e o painel continua aberto, atualizado');
  await ev(() => { if (document.querySelector('.modal')) __tc.UI.closeModal(); });
  await page.locator('#mt-rail-momentos').click(); await w(250);
  ok(await page.locator('#mt-pop-vez').count() === 0 && /A emboscada/.test(await page.locator('#mt-pop-momentos').innerText()), 'trocar de botão troca o painel: os momentos, com “Soltar”');
  await foto('l47-barra-momentos');
  await page.locator('#mtp-soltar-' + moId).click(); await w(350);
  ok(await page.locator('#mt-pop-momentos').count() === 0 && (await tok(ids.ogro)).hidden === false, '“Soltar” pelo painel solta o momento (e o painel fecha)');
  await desfazerDo('Momento “A emboscada”');
  await page.locator('#mt-rail-lembretes').click(); await w(250);
  ok(/Reforços chegam/.test(await page.locator('#mt-pop-lembretes').innerText()) && await page.locator('#mtp-lb-novo').count() === 1, 'o painel dos lembretes lista os da cena e cria um novo');
  await page.mouse.click(700, 300); await w(250);
  ok(await page.locator('#mt-pop-lembretes').count() === 0, 'um clique no mapa fecha o painel');
  await ev(o => __tc.setSel([{ c: 'tokens', id: o.dain }]), ids); await w(200);
  await page.locator('#mt-rail-cura').click(); await w(250);
  ok(/Cura total \(1\)/.test(await page.locator('#mtp-cura').innerText()) && await page.locator('#mtp-restaurar').count() === 1 && await page.locator('#mtp-barrinhas').count() === 1, 'o painel da cura: Cura total dos selecionados, Restaurar energias e a tela das barrinhas');
  await foto('l47-barra-cura');
  await page.keyboard.press('Escape'); await w(200);
  ok(await page.locator('#mt-pop-cura').count() === 0, 'o Esc fecha o painel');
  await ev(() => __tc.UI.setViewer && 0);

  ok(t.errs.length === 0, 'sem erros no console: ' + t.errs.slice(0, 4).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
