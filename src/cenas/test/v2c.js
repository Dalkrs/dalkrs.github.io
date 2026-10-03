// Bateria da v2, parte C: casos de borda achados na revisão independente.
const { open } = require('./lib');
(async () => {
  let fails = 0, n = 0;
  const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };

  {
    const t = await open();
    const { page } = t;
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const w = ms => page.waitForTimeout(ms || 130);
    const key = async k => { await page.keyboard.press(k); await w(90); };
    const T = name => ev(n => { const sc = __urgm.Store.scene(); return JSON.parse(JSON.stringify(sc.tokens.find(t => t.name === n) || null)); }, name);
    const sel = async name => { await ev(n => { const u = __urgm, tk = u.Store.scene().tokens.find(t => t.name === n); u.setSel(tk ? [{ c: 'tokens', id: tk.id }] : []); }, name); await w(); };
    const viewer = async v => { await ev(v => __urgm.UI.setViewer(v), v); await w(250); };
    const toastTexts = () => ev(() => Array.from(document.querySelectorAll('.toast')).map(x => x.firstChild.textContent));
    const clearToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
    const errs = (label, expected) => { const e = t.errs.filter(x => !(expected && expected.test(x))); if (e.length) { console.log(`ERROS em "${label}":\n` + e.join('\n')); fails += e.length; } t.errs.length = 0; };

    /* 1. Bolinhas em token pequeno na tela: nada de raio negativo, em nenhum zoom */
    const sweep = await ev(async () => {
      const u = __urgm, S = u.Store, sc = S.scene(), d = sc.tokens.find(t => t.name === 'Dain X');
      const bad = [];
      for (const size of [0.5, 1, 2]) {
        for (const m of [1, 2, 5, 11, 12]) {
          S.tx('x', () => S.upd('tokens', d.id, { size, bars: d.bars.map((b, i) => (i === 3 ? Object.assign({}, b, { m, v: Math.min(m, 3), k: 'pts' }) : b)) }));
          for (let z = 0.1; z <= 4.0001; z *= 1.07) {
            u.Render.zoomAt(0, 0, z); u.Render.centerOn(d.x, d.y);
            await new Promise(r => requestAnimationFrame(r));
            if (u.Render.stats.fail) { bad.push(`tamanho ${size}, máximo ${m}, zoom ${z.toFixed(3)}`); u.Render.stats.fail = 0; }
          }
        }
      }
      S.tx('x', () => S.upd('tokens', d.id, { size: 1 }));
      u.Render.fit();
      return bad;
    });
    ok(sweep.length === 0, 'pontos no mapa em todos os zooms, tamanhos e máximos: ' + JSON.stringify(sweep.slice(0, 5)));
    ok((await toastTexts()).every(x => !/desenhar o mapa/.test(x)), 'nenhum aviso de falha de desenho');
    errs('varredura de zoom');

    /* 2. Rede de segurança: se o desenho falhar, o jogador vê a mesa coberta, nunca o mapa sem névoa */
    await viewer('jg_dalmo');
    const safe = await ev(async () => {
      const u = __urgm, real = u.FX.draw;
      const px = () => { const c = u.Render.cv, g = c.getContext('2d'), sc = u.Store.scene(); const [sx, sy] = u.Render.toScreen(23 * sc.cell, 5 * sc.cell); return Array.from(g.getImageData(Math.round(sx), Math.round(sy), 1, 1).data); };
      await new Promise(r => setTimeout(r, 200));
      const fogged = px();
      u.FX.draw = () => { throw new Error('falha de teste'); };
      u.Render.request(); await new Promise(r => setTimeout(r, 250));
      const during = px(), fail = u.Render.stats.fail || 0;
      const table = getComputedStyle(document.documentElement).getPropertyValue('--table').trim();
      u.FX.draw = real; u.Render.stats.fail = 0;
      u.Render.request(); await new Promise(r => setTimeout(r, 250));
      return { fogged, during, after: px(), fail, table, failAfter: u.Render.stats.fail || 0 };
    });
    const hex = a => '#' + a.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('');
    ok(safe.fail > 0 && hex(safe.during) === safe.table, `falha no desenho: o canvas fica coberto pela cor da mesa (${hex(safe.during)} = ${safe.table})`);
    ok(safe.failAfter === 0 && hex(safe.after) === hex(safe.fogged), 'passado o erro, o desenho volta ao normal');
    ok((await toastTexts()).some(x => /Não consegui desenhar o mapa/.test(x)), 'avisa quando o desenho falha');
    await clearToasts();
    errs('rede de segurança', /falha de teste|willReadFrequently/);      // o segundo é aviso da leitura de pixels feita por este teste
    await viewer('gm');

    /* 3. Efeito preso a token oculto: o jogador não vê o efeito, o rótulo de duração nem a linha na lista */
    const leak = await ev(() => {
      const u = __urgm, S = u.Store, sc = S.scene(), arq = sc.tokens.find(t => t.name === 'Arqueira');
      S.tx('x', () => { S.add('effects', { id: 'fx_oculto', fx: 'veneno', k: 'circ', x: 0, y: 0, r: 2, w: 1, ang: 60, dir: 0, pow: 0.8, token: arq.id, gm: false, by: null, seed: 4, dur: 3, dur0: 3, at: null }); S.scn({ perms: Object.assign({}, sc.perms, { efeitos: true }) }); });
      const e = S.get('effects', 'fx_oculto');
      const gm = u.fxVisible(e);
      u.UI.setViewer('jg_dalmo');
      const pl = u.fxVisible(e);
      u.UI.openTab('fx');
      const list = Array.from(document.querySelectorAll('#s-fxlist .li')).map(x => x.textContent).join(' | ');
      u.UI.setViewer('gm'); u.UI.openTab('fx');
      const listGm = Array.from(document.querySelectorAll('#s-fxlist .li')).map(x => x.textContent).join(' | ');
      u.UI.openTab('sel');
      S.undo();
      return { gm, pl, list, listGm };
    });
    ok(leak.gm === true && leak.pl === false, 'efeito em token oculto: o mestre vê, o jogador não');
    ok(!/Arqueira|Veneno/.test(leak.list) && /Arqueira/.test(leak.listGm) && /3 rodadas/.test(leak.listGm), 'a lista de efeitos do jogador não entrega o token oculto: ' + leak.list);
    errs('efeito em token oculto');

    /* 4. Aura: a área vale pelo que está na tela na hora do clique, mesmo logo depois de editar o raio */
    await sel('Dain X');
    await page.locator('#au0-r').fill('0.5');
    await page.locator('#au0-apply').click(); await w(200);
    let rows = await ev(() => Array.from(document.querySelectorAll('.area-row .area-n')).map(x => x.textContent));
    ok((await T('Dain X')).auras[0].r === 0.5 && rows.join() === 'Dain X', 'aura encolhida e aplicada em seguida: só quem está dentro do raio novo — ' + rows.join());
    await key('Escape');
    await ev(() => __urgm.Tools.undo()); await w();
    errs('aura recém-editada');

    /* 5. Janela de condições: Enter guarda o que foi digitado; desfazer atualiza a janela; clique logo depois de digitar não se perde */
    await sel('Bandido');
    await page.locator('#hud-cond').click(); await w();
    await page.locator('#cdm-fogo-d').fill('3'); await page.locator('#cdm-fogo-d').press('Enter'); await w(200);
    ok(!(await ev(() => !!document.querySelector('.modal'))) && (await T('Bandido')).cinfo.fogo.d === 3, 'Enter no campo de rodadas: guarda o valor e fecha a janela');
    await page.locator('#hud-cond').click(); await w();
    await page.locator('#cdm-fogo-minus').click(); await w();
    await page.locator('#cdm-fogo-minus').click(); await w(200);
    ok(!(await T('Bandido')).conds.includes('fogo') && !(await ev(() => !!document.getElementById('cdm-fogo-plus'))), 'janela: a condição sai quando o contador chega a zero');
    await page.locator('#toastsTop .toast-a', { hasText: 'Desfazer' }).click(); await w(250);
    ok((await T('Bandido')).cinfo.fogo.n === 1 && await ev(() => (document.getElementById('cdm-fogo-n') || {}).textContent) === '1', 'janela: desfazer pelo aviso devolve a condição e a janela acompanha');
    await page.locator('#cdm-fogo-d').fill('2');
    await page.locator('.modal .chip', { hasText: 'Congelado' }).click(); await w(250);
    let b = await T('Bandido');
    ok(b.cinfo.fogo.d === 2 && b.conds.includes('gelo'), 'janela: digitar rodadas e clicar direto numa condição faz as duas coisas — ' + JSON.stringify([b.cinfo.fogo, b.conds]));
    ok(await ev(() => !!document.getElementById('cdm-gelo-plus')), 'janela: a lista de ativas mostra a condição nova');
    await key('Escape'); await clearToasts();
    errs('janela de condições');

    /* 6. Remover um jogador leva as miras dele; trocar de visão não carrega números de dano */
    await ev(() => { const u = __urgm; u.Store.S.players.push({ id: 'jg_x', name: 'Xis', color: '#8fd05a' }); u.Store.meta(); });
    await viewer('jg_x'); await sel('Bandido');
    await page.locator('#tk-mira').click(); await w();
    await viewer('gm');
    ok((await ev(() => __urgm.Store.scene().targets.length)) === 1, 'jogador novo marcou um alvo');
    await page.locator('#tab-players').click(); await w();
    await page.locator('.li.player:has(#pl-n-jg_x) .ib[title^="Remover"]').click(); await w();
    await page.locator('.modal .btn.danger').click(); await w(250);
    ok((await ev(() => __urgm.Store.S.players.some(p => p.id === 'jg_x'))) === false && (await ev(() => __urgm.Store.scene().targets.length)) === 0, 'remover o jogador tira as miras dele');
    await page.locator('#tab-sel').click(); await w();
    ok(await ev(() => { const u = __urgm, tk = u.Store.scene().tokens.find(t => t.name === 'Bandido'); u.Act.barSet(tk, 0, '-1'); const had = u.App.floats.length; u.UI.setViewer('jg_dalmo'); const left = u.App.floats.length; u.UI.setViewer('gm'); return had === 1 && left === 0; }), 'trocar de visão descarta os números de dano em trânsito');
    errs('jogador removido e troca de visão');

    /* 7. Tecla D no modo sala volta para trecho; turno anterior no começo não cria passo vazio */
    await key('w');
    await page.locator('#o-wm .seg-b', { hasText: 'Sala' }).click(); await w();
    await key('d');
    ok(await ev(() => __urgm.App.opt.wallKind + '/' + __urgm.App.opt.wallMode) === 'door/line', 'tecla D com o modo sala ligado: porta, em trecho');
    await key('v');
    const steps = await ev(() => {
      const u = __urgm; let commits = 0;
      u.Store.on('commit', () => commits++);
      u.Act.turnPatch(x => { x.on = true; x.round = 1; x.cur = x.list[0].id; x.back = 0; });
      const base = commits;
      u.Act.turnStep(-1);
      return { extra: commits - base, round: u.Store.scene().turn.round, back: u.Store.scene().turn.back };
    });
    ok(steps.extra === 0 && steps.round === 1 && steps.back === 0, '"turno anterior" na primeira vez da rodada 1 não faz nada (nem passo de desfazer): ' + JSON.stringify(steps));
    errs('tecla D e turno anterior');
    await t.close();
  }

  /* 8. Tutorial: nenhuma tecla vaza para o mapa */
  {
    const t = await open({ query: '&tour', wait: 1500 });
    const { page } = t;
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const w = ms => page.waitForTimeout(ms || 350);
    const pos = () => ev(() => { const u = __urgm, d = u.Store.scene().tokens.find(t => t.name === 'Dain X'); return { x: d.x, y: d.y, active: u.Tour.active(), step: u.Tour.step(), sel: u.App.sel.length, undo: u.Store.canUndo(), view: JSON.stringify(u.App.view) }; });
    const p0 = await pos();
    for (let i = 0; i < 8; i++) { await page.keyboard.press('ArrowRight'); await w(200); }
    let p = await pos();
    ok(p.active && p.step === 5 && p.x === p0.x && !p.undo, 'seta → até o fim: para no último passo, sem fechar e sem mover nenhum token');
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Delete'); await page.keyboard.press('g'); await w(150);
    p = await pos();
    ok(p.active && p.x === p0.x && p.y === p0.y && !p.undo, 'outras teclas não chegam ao mapa com o passeio aberto');
    // Esc segurado: fecha e as repetições não desmarcam a seleção devolvida
    await page.keyboard.down('Escape'); await page.keyboard.down('Escape'); await page.keyboard.down('Escape'); await page.keyboard.up('Escape'); await w(250);
    p = await pos();
    ok(!p.active && p.sel === 1 && p.x === p0.x && !p.undo, 'Esc segurado fecha o passeio e não mexe na seleção nem no mapa');
    ok(p.view === p0.view, 'a câmera volta para onde estava');
    // depois de fechar, as setas voltam a mover o token selecionado (inclusive segurando a tecla)
    await page.keyboard.down('ArrowRight'); await page.keyboard.down('ArrowRight'); await page.keyboard.up('ArrowRight'); await w(200);
    p = await pos();
    ok(p.x === p0.x + 128, 'fora do passeio, a seta (com repetição) move o token normalmente');
    if (t.errs.length) { console.log('ERROS no tutorial:\n' + t.errs.join('\n')); fails += t.errs.length; }
    await t.close();
  }

  console.log(fails ? `\n${fails} falha(s) em ${n} verificações` : `\n${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
