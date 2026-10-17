// Bateria do lote 7 (parte 3a, as Cenas), no navegador, sem o site:
//   · as 20 condições novas na janela de condições (cada uma com o seu ícone e a sua cor; a Ventania com o contador
//     de acúmulos, que só muda na mão);
//   · o Escudado: o número dele é a sobrevida do token, e ele sai quando ela acaba — no mesmo Desfazer;
//   · o Agigantado e o Encolhido: o dobro e a metade do tamanho (de ¼ a 8 quadrados), e o tamanho de antes volta
//     quando a condição sai; os dois juntos não ficam;
//   · a faixa de cinema: "Vez de…" para o mestre, "Sua vez!" para o jogador da vez, a faixa pequena de sempre para os
//     outros jogadores, "Rodada N" na rodada nova (e no começo do combate), sem pegar clique, saindo sozinha; e os sons
//     (o gongo dos aliados, o tambor dos inimigos), que só tocam com a chave de som da mesa ligada.
const path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;                         // (as fotos só saem com FOTOS=pasta)
const NOVAS = ['petrificado', 'adormecido', 'eletrizado', 'corroido', 'enregelado', 'possuido', 'enraizado', 'sufocando', 'ofuscado', 'vulneravel',
  'escudado', 'refletindo', 'etereo', 'enlouquecido', 'determinado', 'qibloq', 'qidesvio', 'agigantado', 'encolhido', 'ventania'];

(async () => {
  const t = await open({});
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const j = JSON.stringify;
  const ate = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 3000)) { if (await fn()) return true; await w(50); } return !!(await fn()); };
  const toasts = () => ev(() => Array.from(document.querySelectorAll('.toast')).map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const clearToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const T = name => ev(nm => JSON.parse(JSON.stringify(__tc.Store.scene().tokens.find(x => x.name === nm) || null)), name);
  const longe = async () => { const b = await page.locator('#cv').boundingBox(); await page.mouse.move(b.x + 8, b.y + b.height - 8); await w(100); };
  const foto = async nome => { if (SHOTS) { require('fs').mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const cine = () => ev(() => {
    const c = document.getElementById('cine'), tx = id => (document.getElementById(id) || {}).textContent || '';
    return { on: !c.hidden, cls: c.className, k: tx('cineK'), n: tx('cineN'), r: tx('cineR'), chips: [...c.querySelectorAll('.cine-c')].map(x => x.textContent),
      avs: c.querySelectorAll('.cine-av .av').length, inv: (c.querySelector('.cine-inv') || {}).textContent || '' };
  });
  const pequena = () => ev(() => { const b = document.getElementById('turnb'); return b.hidden ? '' : b.textContent; });
  const som = () => ev(() => ({ ultimo: __tc.Som.ultimo, vezes: __tc.Som.vezes }));
  const passo = d => ev(x => __tc.Act.turnStep(x), d);
  const desfazer = () => ev(() => __tc.Tools.undo());
  const refazer = () => ev(() => __tc.Tools.redo());

  const ids = await ev(() => {
    const u = __tc, sc = u.newScene('Lote 7'); u.Store.addScene(sc); u.Store.setCurrent(sc.id);
    u.Store.S.players = [{ id: 'p1', name: 'Dalmo', color: '#4fb8e0' }, { id: 'p2', name: 'Bruno', color: '#e07a4f' }];
    const c = sc.cell, o = {};
    u.Store.tx('prep', () => {
      u.Store.scn({ cols: 16, rows: 10, fog: { dynamic: false, manual: false, explored: false, shared: true } });
      for (const [nm, x, y, extra] of [['Dain', 2, 3, { owner: 'p1' }], ['Ogro', 6, 3, {}], ['Lia', 10, 3, { owner: 'p2' }], ['Goblin 1', 3, 7, {}], ['Goblin 2', 4, 7, {}],
        ['Gigante', 12, 3, { size: 4 }], ['Rato', 8, 7, { size: 0.5 }], ['Borda', 15, 8, {}]]) {
        const k = u.newToken(sc, x * c, y * c, Object.assign({ name: nm }, extra)); u.Store.add('tokens', k); o[nm] = k.id;
      }
    });
    u.Render.fit(); u.setSel([]);
    return o;
  });
  await w(300); await longe();

  // ================= as 20 condições novas =================
  const dados = await ev(novas => {
    const u = __tc, help = u.ICONS.help.d || u.ICONS.help;
    return novas.map(id => { const c = u.COND_BY_ID[id]; if (!c) return { id, falta: true }; const d = u.ICONS[c.i] && (u.ICONS[c.i].d || u.ICONS[c.i]); return { id, n: c.n, c: c.c, g: c.g, d: d && d !== help ? d : null }; });
  }, NOVAS);
  ok(dados.every(x => !x.falta && x.d && /^#[0-9a-f]{6}$/.test(x.c)), 'as 20 condições novas existem, cada uma com ícone próprio e cor: ' + j(dados.filter(x => x.falta || !x.d).map(x => x.id)));
  ok(new Set(dados.map(x => x.d)).size === 20 && new Set(dados.map(x => x.c)).size === 20, 'os ícones e as cores não se repetem entre elas');
  ok(j(dados.filter(x => ['agigantado', 'encolhido', 'qibloq', 'qidesvio', 'ventania'].includes(x.id)).map(x => x.n)) === j(['Qi bloqueado', 'Desvio de Qi', 'Agigantado', 'Encolhido', 'Ventania']), 'os nomes: "Qi bloqueado", "Desvio de Qi", Agigantado e Encolhido separados, Ventania');
  ok(await ev(() => __tc.CONDS.length) === 69, 'a lista das Cenas tem 69 condições (47 + 20 do lote 7 + 2 do lote 8)');
  await ev(i => __tc.UI.condPicker([__tc.Store.get('tokens', i)]), ids.Dain); await w(200);
  await page.locator('#cgm-tab-todas').click(); await w();
  ok(await page.locator('#cgm-list .chip').count() === 69, 'na janela, a aba "Todas" mostra as 69');
  await page.locator('#cgm-busca').fill('qi'); await w();
  ok(j(await page.locator('#cgm-list .chip').allInnerTexts()) === j(['Qi bloqueado', 'Desvio de Qi']), 'a busca "qi" acha as duas de Qi: ' + j(await page.locator('#cgm-list .chip').allInnerTexts()));
  await page.locator('#cgm-busca').fill(''); await w();
  await page.locator('#cgm-tab-corpo').click(); await w();
  const corpo = await page.locator('#cgm-list .chip').allInnerTexts();
  ok(['Sufocando', 'Ofuscado', 'Agigantado', 'Encolhido'].every(x => corpo.includes(x)), 'na aba Corpo estão Sufocando, Ofuscado, Agigantado e Encolhido: ' + j(corpo));
  await foto('01-condicoes-novas');
  // a Ventania: o contador de acúmulos, na mão
  await page.locator('#cgm-busca').fill('venta'); await w();
  await page.locator('#cgm-list .chip', { hasText: 'Ventania' }).click(); await w();
  await page.locator('#cdm-ventania-plus').click(); await w();
  await page.locator('#cdm-ventania-plus').click(); await w();
  await page.locator('#cdm-ventania-plus').click(); await w();
  ok((await T('Dain')).cinfo.ventania.n === 3 && (await page.locator('#cdm-ventania-n').innerText()) === '3', 'a Ventania conta os acúmulos no + e −: 3');
  await page.locator('#cdm-ventania-minus').click(); await w();
  ok((await T('Dain')).cinfo.ventania.n === 2, '− tira um acúmulo: 2');
  await page.locator('#cgm-busca').fill(''); await w();
  await page.keyboard.press('Escape'); await w();

  // ================= o Escudado: a sobrevida =================
  await ev(i => { const u = __tc, k = u.Store.get('tokens', i); u.Act.condToggle([k], 'escudado'); }, ids.Dain); await w();
  ok((await T('Dain')).conds.includes('escudado') && await ev(i => __tc.condNum(__tc.Store.get('tokens', i), 'escudado'), ids.Dain) === 0, 'o Escudado entra mesmo sem sobrevida (o número fica vazio)');
  await ev(i => __tc.UI.condPicker([__tc.Store.get('tokens', i)]), ids.Dain); await w(200);
  ok((await page.locator('#cdm-escudado-n').innerText()) === 'sem sobrevida' && await page.locator('#cdm-escudado-plus').count() === 0, 'na janela, a linha do Escudado diz "sem sobrevida" e não tem + e −');
  await page.keyboard.press('Escape'); await w();
  await ev(i => { const u = __tc; u.Act.barSet(u.Store.get('tokens', i), 0, '-1'); }, ids.Dain); await w();
  ok((await T('Dain')).conds.includes('escudado') && (await T('Dain')).bars[0].v === 9, 'sem ter tido sobrevida, um dano não tira o Escudado (ele sai quando a sobrevida acaba, não antes de ela chegar)');
  await desfazer(); await w();
  await ev(i => { const u = __tc; u.Act.barExtra(u.Store.get('tokens', i), 0, 8); }, ids.Dain); await w();
  ok(await ev(i => __tc.condNum(__tc.Store.get('tokens', i), 'escudado'), ids.Dain) === 8, 'com 8 de sobrevida na Vida, o Escudado mostra 8');
  await ev(i => { const u = __tc, k = u.Store.get('tokens', i); u.Act.barPatch(k, 1, { on: true }); }, ids.Dain);
  await ev(i => { const u = __tc; u.Act.barExtra(u.Store.get('tokens', i), 1, 4); }, ids.Dain); await w();
  ok(await ev(i => __tc.condNum(__tc.Store.get('tokens', i), 'escudado'), ids.Dain) === 12, 'a sobrevida de duas barras soma: 8 + 4 = 12');
  // no mapa: o marcador do Escudado leva o número (conta quantas vezes "12" é escrito no desenho, com e sem ele)
  const escritos = txt => ev(x => new Promise(r => {
    const P = CanvasRenderingContext2D.prototype, f = P.fillText; let k = 0;
    P.fillText = function (s, ...a) { if (String(s) === x) k++; return f.call(this, s, ...a); };
    __tc.Render.request(); requestAnimationFrame(() => requestAnimationFrame(() => { P.fillText = f; r(k); }));
  }), txt);
  const comEscudo = await escritos('12');
  await ev(i => __tc.Act.condToggle([__tc.Store.get('tokens', i)], 'escudado'), ids.Dain); await w();
  const semEscudo = await escritos('12');
  await desfazer(); await w();
  ok(comEscudo === semEscudo + 1, 'no mapa, o marcador do Escudado mostra 12 no canto (a sobrevida que resta): ' + comEscudo + ' contra ' + semEscudo);
  await ev(i => __tc.setSel([{ c: 'tokens', id: i }]), ids.Dain); await w(200);
  ok(/Escudado 12/.test(await page.locator('#hud-c-escudado').getAttribute('aria-label') || '') && (await page.locator('#hud-c-escudado .stp-v').innerText()) === '12' && await page.locator('#hud-c-escudado-plus').count() === 0, 'na barrinha do token, o Escudado mostra 12, sem + e −: ' + await page.locator('#hud-c-escudado').getAttribute('aria-label'));
  await foto('02-escudado');
  await ev(i => { const u = __tc; u.Act.barSet(u.Store.get('tokens', i), 0, '-5'); }, ids.Dain); await w();
  let k = await T('Dain');
  ok(k.conds.includes('escudado') && k.bars[0].x === 3 && k.bars[0].v === 10 && await ev(i => __tc.condNum(__tc.Store.get('tokens', i), 'escudado'), ids.Dain) === 7, '5 de dano na Vida gastam a sobrevida dela (8 → 3); o Escudado fica, com 7');
  await ev(i => { const u = __tc; u.Act.barSet(u.Store.get('tokens', i), 1, '-6'); }, ids.Dain); await w();
  k = await T('Dain');
  ok(k.conds.includes('escudado') && !(k.bars[1].x > 0) && k.bars[1].v === 8, 'a sobrevida do SP acaba (4 → 0, e 2 de dano passam para a barra), mas ainda há 3 na Vida: o Escudado fica');
  const passos = await ev(() => __tc.Store.S.scenes[__tc.Store.S.current] && 0);
  void passos;
  await ev(i => { const u = __tc; u.Act.barSet(u.Store.get('tokens', i), 0, '-10'); }, ids.Dain); await w();
  k = await T('Dain');
  ok(!k.conds.includes('escudado') && !('escudado' in (k.cinfo || {})) && !(k.bars[0].x > 0) && k.bars[0].v === 3, 'a sobrevida acaba de vez (3 → 0, e 7 de dano na Vida): o Escudado sai');
  await desfazer(); await w();
  k = await T('Dain');
  ok(k.conds.includes('escudado') && k.bars[0].x === 3 && k.bars[0].v === 10, 'um Desfazer só devolve o dano e o Escudado juntos (era o mesmo passo)');
  await refazer(); await w();
  ok(!(await T('Dain')).conds.includes('escudado'), 'Refazer tira de novo');
  await desfazer(); await w();
  // num passo com duas mudanças nas barras do mesmo token (e outra coisa no meio), vale como ele estava no começo
  await ev(i => {
    const u = __tc, sc = u.Store.scene(), zera = b => { const o = Object.assign({}, b); delete o.x; return o; };
    u.Store.tx('Duas vezes', () => {
      u.Store.upd('tokens', i, { bars: u.Store.get('tokens', i).bars.map(zera) });
      u.Store.add('tokens', u.newToken(sc, 0, 0, { name: 'Marca' }));
      u.Store.upd('tokens', i, { bars: u.Store.get('tokens', i).bars.map((b, j) => (j === 0 ? Object.assign({}, b, { v: b.v - 1 }) : b)) });
    });
  }, ids.Dain); await w();
  ok(!(await T('Dain')).conds.includes('escudado'), 'num passo que zera a sobrevida e depois mexe de novo na barra (com outra coisa no meio), o Escudado sai: vale como o token estava no começo do passo');
  await desfazer(); await w();
  ok((await T('Dain')).conds.includes('escudado') && !(await T('Marca')), '(desfeito, com a marca)');
  // zerar a sobrevida na mão também conta
  await ev(i => { const u = __tc; u.Act.barExtra(u.Store.get('tokens', i), 0, 0); }, ids.Dain); await w();
  ok(!(await T('Dain')).conds.includes('escudado'), 'zerar a sobrevida no campo dela também tira o Escudado');
  await desfazer(); await w();
  ok((await T('Dain')).conds.includes('escudado'), '(desfeito)');
  // o que chega de fora (outro aparelho, a ficha): o acerto vem num passo logo depois
  await ev(i => { const u = __tc, k = u.Store.get('tokens', i); u.Store.remote({ t: 'upd', c: 'tokens', id: i, p: { bars: k.bars.map(b => { const o = Object.assign({}, b); delete o.x; return o; }) } }); }, ids.Dain); await w(200);
  k = await T('Dain');
  ok(!k.conds.includes('escudado') && await ev(() => __tc.Store.canUndo()), 'a sobrevida zerada que chega de fora tira o Escudado num passo próprio (com Desfazer)');
  await desfazer(); await w();
  ok((await T('Dain')).conds.includes('escudado') && !((await T('Dain')).bars[0].x > 0), 'desfazer esse passo devolve só o Escudado (a mudança de fora fica)');
  // no aparelho do jogador, quem acerta é o mestre: nada muda por lá
  await ev(i => { const u = __tc; u.Store.tx('prep', () => u.Store.upd('tokens', i, { bars: u.Store.get('tokens', i).bars.map((b, j) => j === 0 ? Object.assign({}, b, { x: 2 }) : b) })); }, ids.Dain);
  const noJogador = await ev(i => {
    const u = __tc, antes = u.Nuvem.jogador; u.Nuvem.jogador = () => true;
    try { u.Act.barSet(u.Store.get('tokens', i), 0, '-5'); return u.Store.get('tokens', i).conds.includes('escudado'); } finally { u.Nuvem.jogador = antes; }
  }, ids.Dain);
  ok(noJogador, 'no aparelho de um jogador, o Escudado não sai sozinho (o mestre acerta, e a mesa traz)');
  // vários tokens escolhidos: o Escudado mostra a sobrevida de cada um, sem + e −
  await ev(([a, b]) => { const u = __tc; u.Store.tx('prep', () => { u.Store.upd('tokens', a, { conds: ['escudado'], bars: u.Store.get('tokens', a).bars.map((x, j) => j === 0 ? Object.assign({}, x, { x: 5 }) : x) }); u.Store.upd('tokens', b, { conds: ['escudado'] }); }); }, [ids.Dain, ids.Ogro]);
  await ev(([a, b]) => __tc.UI.condPicker([__tc.Store.get('tokens', a), __tc.Store.get('tokens', b)]), [ids.Dain, ids.Ogro]); await w(200);
  ok((await page.locator('#cmm-escudado-n').innerText()) === '– a 5' && await page.locator('#cmm-escudado-plus').isDisabled() && await page.locator('#cmm-escudado-minus').isDisabled(), 'com dois tokens: "– a 5" (a sobrevida de cada um), e o + e − apagados: ' + await page.locator('#cmm-escudado-n').innerText());
  await page.keyboard.press('Escape'); await w();
  await ev(([a, b]) => { const u = __tc; u.Store.tx('limpa', () => { for (const i of [a, b]) u.Store.upd('tokens', i, { conds: [], cinfo: {} }); }); u.setSel([]); }, [ids.Dain, ids.Ogro]); await w();

  // ================= o Agigantado e o Encolhido =================
  const tam = nome => T(nome).then(x => ({ size: x.size, tam0: x.tam0 == null ? null : x.tam0, conds: x.conds }));
  await ev(i => __tc.Act.condToggle([__tc.Store.get('tokens', i)], 'agigantado'), ids.Ogro); await w();
  ok(j(await tam('Ogro')) === j({ size: 2, tam0: 1, conds: ['agigantado'] }), 'o Agigantado dobra o Ogro: 1 → 2 (o tamanho de antes fica guardado): ' + j(await tam('Ogro')));
  await desfazer(); await w();
  ok(j(await tam('Ogro')) === j({ size: 1, tam0: null, conds: [] }), 'um Desfazer tira a condição e devolve o tamanho (o mesmo passo)');
  await refazer(); await w();
  ok((await tam('Ogro')).size === 2, 'Refazer: 2 de novo');
  await ev(i => __tc.Act.condToggle([__tc.Store.get('tokens', i)], 'encolhido'), ids.Ogro); await w();
  ok(j(await tam('Ogro')) === j({ size: 0.5, tam0: 1, conds: ['encolhido'] }), 'o Encolhido por cima do Agigantado: o Agigantado sai, e o Ogro fica com a metade do tamanho de antes (½): ' + j(await tam('Ogro')));
  await ev(i => __tc.Act.condToggle([__tc.Store.get('tokens', i)], 'encolhido'), ids.Ogro); await w();
  ok(j(await tam('Ogro')) === j({ size: 1, tam0: null, conds: [] }), 'tirar o Encolhido devolve o tamanho de antes (1)');
  await ev(i => __tc.Act.condToggle([__tc.Store.get('tokens', i)], 'agigantado'), ids.Gigante); await w();
  ok((await tam('Gigante')).size === 8, 'de 4 quadrados, o Agigantado vai a 8 (o novo máximo)');
  await ev(i => __tc.Act.condToggle([__tc.Store.get('tokens', i)], 'agigantado'), ids.Gigante); await w();
  ok(j(await tam('Gigante')) === j({ size: 4, tam0: null, conds: [] }), '…e volta a 4');
  await ev(i => __tc.Act.condToggle([__tc.Store.get('tokens', i)], 'encolhido'), ids.Rato); await w();
  ok((await tam('Rato')).size === 0.25, 'de ½ quadrado, o Encolhido vai a ¼ (o novo mínimo)');
  await ev(i => __tc.Act.condToggle([__tc.Store.get('tokens', i)], 'encolhido'), ids.Rato); await w();
  ok((await tam('Rato')).size === 0.5, '…e volta a ½');
  const borda = await ev(i => { const u = __tc, sc = u.Store.scene(); u.Act.condToggle([u.Store.get('tokens', i)], 'agigantado'); const k = u.Store.get('tokens', i); return { size: k.size, dentro: k.x + k.size * sc.cell <= sc.cols * sc.cell && k.y + k.size * sc.cell <= sc.rows * sc.cell }; }, ids.Borda);
  ok(borda.size === 2 && borda.dentro, 'no canto do mapa, o token que dobra continua dentro da cena: ' + j(borda));
  await ev(i => __tc.Act.condToggle([__tc.Store.get('tokens', i)], 'agigantado'), ids.Borda); await w();
  // com rodadas: quando a condição acaba na ordem de turnos, o tamanho volta no mesmo passo
  await ev(i => { const u = __tc, k = u.Store.get('tokens', i); u.Act.condToggle([k], 'agigantado'); u.Act.condSet(u.Store.get('tokens', i), 'agigantado', { d: 1, d0: 1 }); }, ids.Ogro);
  await ev(i => { const u = __tc; u.Act.turnAdd([u.Store.get('tokens', i)]); u.Act.turnPatch(x => { x.on = true; x.round = 1; x.cur = x.list[0].id; }, 'prep'); }, ids.Ogro); await w();
  await passo(1); await w(200);
  ok(j(await tam('Ogro')) === j({ size: 1, tam0: null, conds: [] }), 'o Agigantado de 1 rodada acaba quando o Ogro termina a vez: o tamanho volta junto');
  await desfazer(); await w();
  ok(j(await tam('Ogro')) === j({ size: 2, tam0: 1, conds: ['agigantado'] }), 'desfazer o turno devolve a condição e o tamanho');
  await ev(() => { const u = __tc; u.Act.turnPatch(x => { x.list = []; x.on = false; x.cur = null; x.round = 1; }, 'limpa'); }); await w();
  await ev(i => __tc.Act.condToggle([__tc.Store.get('tokens', i)], 'agigantado'), ids.Ogro); await w();
  // de fora (o pedido de um jogador): o tamanho muda num passo logo depois
  await ev(i => __tc.Store.remote({ t: 'upd', c: 'tokens', id: i, p: { conds: ['agigantado'] } }), ids.Lia); await w(200);
  ok(j(await tam('Lia')) === j({ size: 2, tam0: 1, conds: ['agigantado'] }), 'o Agigantado que chega de fora também dobra o token (num passo do mestre)');
  await ev(i => __tc.Store.remote({ t: 'upd', c: 'tokens', id: i, p: { conds: [] } }), ids.Lia); await w(200);
  ok(j(await tam('Lia')) === j({ size: 1, tam0: null, conds: [] }), '…e, quando sai, o tamanho volta');
  await clearToasts();

  // ================= a faixa de cinema =================
  ok(await ev(() => document.getElementById('cine').hidden && document.getElementById('turnb').hidden), 'nada à mostra antes do combate');
  await ev(() => { try { localStorage.setItem('tinycats:som', '1'); } catch (e) { /* sem armazenamento */ } });
  const som0 = await som();
  // a ordem: Dain (p1), Ogro, Lia (p2), os Goblins numa faixa
  await ev(o => {
    const u = __tc, g = id => u.Store.get('tokens', id);
    u.Act.turnAdd([g(o.Dain), g(o.Ogro), g(o.Lia)]);
    u.Act.turnBand('Goblin', 2, [o['Goblin 1'], o['Goblin 2']]);
    u.Act.turnPatch(x => { const v = { [o.Dain]: 20, [o.Ogro]: 15, [o.Lia]: 10 }; for (const e of x.list) e.init = e.token ? v[e.token] : 5; u.turnSort(x.list); x.cur = x.list[0].id; x.round = 1; }, 'prep');
    u.Store.tx('cond', () => u.Store.upd('tokens', o.Ogro, { conds: ['veneno', 'agigantado'], cinfo: { veneno: { n: 2, d: 3, d0: 3 } } }));
  }, ids); await w(200);
  ok(j((await T('Ogro')).size) === '2', '(o Ogro está agigantado)');
  await passo(1); await w(150);
  let c = await cine();
  ok(c.on && c.cls === 'cine rodada' && c.r === 'Rodada1', 'o combate começa: primeiro a faixa "Rodada 1" — ' + j(c));
  ok((await som()).ultimo === 'rodada', 'com o som ligado, a rodada nova toca o sino grave');
  await foto('03-rodada');
  ok(await ate(async () => (await cine()).n === 'Vez de Dain', 2500), 'depois, a vez: "Vez de Dain"');
  c = await cine();
  ok(c.cls === 'cine aliado' && c.k === 'Rodada 1' && c.avs === 1 && !(await pequena()), 'a faixa do mestre: aliado (âmbar), "Rodada 1", o retrato grande — e a faixa pequena não aparece junto: ' + j(c));
  ok((await som()).ultimo === 'aliado', 'o gongo na vez de um aliado');
  // não pega clique: o que está embaixo da faixa recebe
  const embaixo = await ev(() => { const b = document.querySelector('#cine .cine-f').getBoundingClientRect(), e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return e && e.id; });
  ok(embaixo === 'cv', 'a faixa não pega clique: no meio dela, o clique vai para o mapa (' + embaixo + ')');
  await foto('04-vez-de-dain');
  ok(await ate(async () => !(await cine()).on, 3000), 'a faixa sai sozinha, em uns dois segundos');
  // a vez do Ogro: inimigo (sem ficha e sem dono), com as condições
  await passo(1); await w(200);
  c = await cine();
  ok(c.on && c.cls === 'cine inimigo' && c.n === 'Vez de Ogro', 'a vez do Ogro (sem ficha e sem dono, é do mestre): a faixa vermelha dos inimigos — ' + j(c));
  ok(j(c.chips) === j(['Envenenado 2 · 3 rodadas', 'Agigantado']), 'as condições dele na faixa, com o contador e as rodadas: ' + j(c.chips));
  ok((await som()).ultimo === 'inimigo', 'o tambor na vez de um inimigo');
  await foto('05-vez-do-ogro');
  // passar de novo no meio da faixa: troca na hora
  await passo(1); await w(150);
  c = await cine();
  ok(c.on && c.n === 'Vez de Lia' && c.cls === 'cine aliado', 'a vez muda no meio da faixa: ela troca na hora para "Vez de Lia"');
  // a faixa do grupo
  await passo(1); await w(150);
  c = await cine();
  ok(c.on && c.n === 'Vez de Goblin' && c.avs === 2 && c.cls === 'cine inimigo', 'a vez da faixa de grupo: "Vez de Goblin", os dois rostos, inimiga (todos os tokens dela são): ' + j(c));
  // a rodada vira: "Rodada 2", depois a vez
  await passo(1); await w(150);
  c = await cine();
  ok(c.on && c.cls === 'cine rodada' && c.r === 'Rodada2', 'a rodada vira: "Rodada 2" — ' + j(c));
  await passo(-1); await w(150);
  c = await cine();
  ok(c.on && c.n === 'Vez de Goblin' && c.cls !== 'cine rodada', 'voltar o turno (para a rodada 1) não mostra faixa de rodada, e a que estava pendente não aparece depois: ' + j(c));
  { // (por quase dois segundos — o tempo em que a vez de Dain teria vindo —, a faixa não volta para ela)
    let voltou = null; const t0 = Date.now();
    while (Date.now() - t0 < 1900) { const v = await cine(); if (v.n === 'Vez de Dain' || v.cls === 'cine rodada') { voltou = v; break; } await w(80); }
    ok(!voltou, '(a faixa da rodada que foi cancelada não volta): ' + j(voltou));
  }
  await passo(1); await w(150);
  ok((await cine()).r === 'Rodada2' && await ate(async () => { const v = await cine(); return v.n === 'Vez de Dain' && v.k === 'Rodada 2'; }, 3000), 'avançando de novo: "Rodada 2", e então a vez de Dain');
  // a ficha diz o lado: um token sem dono com ficha de aliado toca o gongo; o com ficha de inimigo, o tambor
  await ev(o => {
    const u = __tc, F = u.Fichas; F.__get = F.get;
    F.get = id => (id === 'pc_ogro' ? { id, ficha: { lado: 'Aliado' } } : id === 'pc_lia' ? { id, ficha: { lado: 'Inimigo' } } : F.__get(id));
    u.Store.tx('fichas', () => { u.Store.upd('tokens', o.Ogro, { char: 'pc_ogro' }); u.Store.upd('tokens', o.Lia, { char: 'pc_lia' }); });
  }, ids);
  await passo(1); await w(150);
  ok((await cine()).cls === 'cine aliado' && (await som()).ultimo === 'aliado', 'o Ogro com ficha de Aliado: a faixa âmbar e o gongo');
  await passo(1); await w(150);
  ok((await cine()).cls === 'cine inimigo' && (await som()).ultimo === 'inimigo', 'a Lia com ficha de Inimigo (mesmo tendo dono): a faixa vermelha e o tambor');
  await ev(o => { const u = __tc, F = u.Fichas; F.get = F.__get; delete F.__get; u.Store.tx('fichas', () => { u.Store.upd('tokens', o.Ogro, { char: null }); u.Store.upd('tokens', o.Lia, { char: null }); }); }, ids);
  // o som desligado: nada toca
  await ev(() => { try { localStorage.setItem('tinycats:som', '0'); } catch (e) { /* sem armazenamento */ } });
  const s1 = await som();
  await passo(1); await w(150);
  ok((await cine()).on && (await som()).vezes === s1.vezes, 'com a chave de som desligada, a faixa aparece e nada toca');
  ok(s1.vezes > som0.vezes, '(com ela ligada, tocou: ' + (s1.vezes - som0.vezes) + ' vezes)');
  // a linha invisível: o mestre vê a marca
  await ev(() => { const u = __tc; u.Act.turnPatch(x => { const e = x.list.find(z => z.token && u.Store.get('tokens', z.token).name === 'Ogro'); e.inv = true; }, 'inv'); });
  await ev(o => __tc.Act.turnPatch(x => { x.cur = x.list.find(e => e.token === o.Dain).id; }, 'vez'), ids); await w(100);
  await passo(1); await w(150);
  c = await cine();
  ok(c.n === 'Vez de Ogro' && c.inv === 'invisível para os jogadores', 'na vez de uma linha invisível, a faixa do mestre lembra: ' + j(c));
  await ev(() => { __tc.UI.setViewer('p1'); }); await w(150);
  ok(!(await cine()).on, 'trocar para a visão do jogador no meio da faixa do mestre: ela some na hora');
  await ev(() => { __tc.UI.setViewer('gm'); }); await w(150);

  // ---- o jogador ----
  await ev(o => __tc.Act.turnPatch(x => { x.cur = x.list.find(e => e.token === o.Lia).id; }, 'vez'), ids); await w(100);
  await ev(() => { __tc.UI.setViewer('p1'); }); await w(250);
  await ev(() => { try { localStorage.setItem('tinycats:som', '1'); } catch (e) { /* sem armazenamento */ } });
  await passo(1); await w(150);              // Lia → Goblin
  c = await cine();
  ok(!c.on && /Vez de Goblin/.test(await pequena()), 'o jogador, na vez de outro: a faixa pequena de sempre, no alto (sem a de cinema)');
  const s2 = await som();
  await passo(1); await w(150);              // Goblin → (rodada nova) Dain
  ok((await cine()).cls === 'cine rodada', 'na rodada nova, o jogador da vez vê antes a faixa "Rodada N"');
  await ate(async () => (await cine()).n === 'Sua vez!', 3000);
  c = await cine();
  ok(c.on && c.cls === 'cine sua' && c.n === 'Sua vez!' && /^Rodada \d+ · Dain$/.test(c.k) && !(await pequena()), 'na vez de um token dele: "Sua vez!", com a rodada e o nome — ' + j(c));
  ok((await som()).ultimo === 'sua' && (await som()).vezes > s2.vezes, 'e os dois toques claros do "Sua vez!"');
  await foto('06-sua-vez');
  await passo(1); await w(200);              // Dain → Ogro (linha invisível)
  ok(!(await cine()).on && /O turno está com o mestre/.test(await pequena()), 'na vez de uma linha invisível, o jogador vê só "O turno está com o mestre" (a faixa pequena)');
  await ev(() => { __tc.UI.setViewer('gm'); }); await w(250);
  ok(!(await cine()).on && !(await pequena()), 'trocar a visão esconde as faixas');

  // ================= telas estreitas e movimento reduzido =================
  const t2 = await open({ w: 400, h: 760, reduce: true });
  const p2 = t2.page, ev2 = (fn, arg) => p2.evaluate(fn, arg);
  await ev2(() => {
    const u = __tc, sc = u.newScene('Estreita'); u.Store.addScene(sc); u.Store.setCurrent(sc.id);
    const c = sc.cell;
    u.Store.tx('prep', () => { for (const [nm, x] of [['Cavaleira de Nome Muito Comprido da Casa Alta', 1], ['Ogro', 3]]) u.Store.add('tokens', u.newToken(sc, x * c, 2 * c, { name: nm, conds: ['veneno', 'sangue', 'eletrizado', 'ventania', 'escudado', 'vulneravel', 'ofuscado'] })); });
    u.Act.turnAdd(u.Store.scene().tokens); u.Act.turnPatch(x => { x.cur = x.list[0].id; }, 'prep'); u.Render.fit();
  });
  await p2.waitForTimeout(200);
  await ev2(() => __tc.Act.turnStep(1)); await p2.waitForFunction(() => document.getElementById('cineN'), null, { timeout: 4000 }).catch(() => {});
  const estreita = await ev2(() => {
    const c = document.getElementById('cine'), f = c.querySelector('.cine-f'), b = f.getBoundingClientRect();
    return { on: !c.hidden, cabe: b.left >= 0 && b.right <= innerWidth + 0.5 && f.scrollWidth <= f.clientWidth + 1, pagina: document.documentElement.scrollWidth <= innerWidth, anim: getComputedStyle(f).animationName, chips: c.querySelectorAll('.cine-c').length };
  });
  ok(estreita.on && estreita.cabe && estreita.pagina, 'em 400 px, a faixa cabe (o nome comprido corta com reticências) e a página não ganha rolagem: ' + j(estreita));
  ok(estreita.chips === 7 && estreita.anim === 'cineSo', 'com movimento reduzido, a faixa só aparece e some (sem deslizar); as 7 condições vão nela (6 e "+1")');
  if (SHOTS) await p2.screenshot({ path: path.join(SHOTS, '07-estreita.png') });
  const e2 = t2.errs.filter(e => !/favicon/.test(e));
  ok(!e2.length, 'sem erros no console (tela estreita): ' + e2.slice(0, 3).join(' | '));
  await t2.close();

  const inesperados = t.errs.filter(e => !/favicon/.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 8).join('\n'));
  ok(!inesperados.length, 'sem erros no console');
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
