// Bateria do lote 8, no navegador, sem o site (SO=defeitos,... roda só umas partes):
//   · (parte 1) o painel do token não aplica o que está pela metade: o painel redesenhado no meio da digitação (alguém
//     mexeu em outra coisa) não confirma o "-1" de um "-15"; o que foi digitado continua no campo, com o cursor; só o
//     Enter (ou sair do campo) confirma;
//   · (parte 1) "Encerrar" zera a iniciativa de todos (as da ordem, a rolagem, a reação e as rolagens da mesa ao vivo que
//     ainda não foram anotadas), com Desfazer;
//   · (parte 1) a faixa nova não leva quem já está em outra faixa: vem desmarcado, com o nome da outra faixa; a primeira
//     faixa continua na ordem.
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

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 10).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  console.log(fails ? `${n - fails}/${n} ok — ${fails} falharam` : `${n}/${n} ok`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
