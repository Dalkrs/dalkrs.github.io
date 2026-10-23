// Bateria do lote 18 nas Cenas (no navegador, sem o site):
//   · o relevo com regra (o sistema sugere, o mestre confirma): a tabela do mestre (a da mesa, com valores de começo),
//     o custo da subida e o penhasco na régua e no arrastar, a queda que sugere o dano (o aviso com "Aplicar o dano" e o
//     Desfazer), o bônus de cima / de baixo na janelinha de atributos (mirando alguém), a visão pelo relevo (a chave da
//     cena: o que é mais alto esconde, o fosso fecha, de cima se vê mais longe);
//   · a caverna embaixo da cena (SO=subsolo);
//   · as arenas (SO=arena): a aba Arena (os tipos, o tamanho, as fases prontas e editáveis), a cena (o chefe, os reforços
//     escondidos, as fases só do mestre), acionar a fase (a prévia, um passo só, o Desfazer; a aba Cena e o menu do mapa)
//     e a sala do chefe do último nível da masmorra;
//   · o campo de batalha (SO=campo): o bloco na janela de gerar (os soldados por bloco, quem move), os blocos frente a
//     frente (a cor da facção, o dono), a leitura do campo (o flanco, o terreno alto, a cobertura, a reserva) e as perdas
//     que voltam aos blocos (a prévia, um passo, o Desfazer).
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
const SO = process.env.SO || '';

(async () => {
  const t = await open();
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const toasts = () => ev(() => Array.from(document.querySelectorAll('.toast')).map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const clearToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const foto = async nome => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const parte = nome => !SO || SO.split(',').includes(nome);

  if (parte('relevo')) {
    // ---------- uma cena com relevo: o chão, um morro (3 m = 2 q), uma montanha (9 m = 6 q) e um fosso (−3 m) ----------
    const ids = await ev(() => {
      const { Store, Combate, newToken, App } = __tc;
      const sc = Store.scene();
      Store.tx('preparar', () => {
        Store.scn({ cols: 30, rows: 20 });
        Store.add('shapes', Combate.newTerrain({ k: 'rect', x: 10 * 64, y: 0, w: 4 * 64, h: 20 * 64 }, 'morro', 3));
        Store.add('shapes', Combate.newTerrain({ k: 'rect', x: 20 * 64, y: 0, w: 5 * 64, h: 20 * 64 }, 'montanha', 9));
        Store.add('shapes', Combate.newTerrain({ k: 'ell', x: 2 * 64, y: 14 * 64, w: 4 * 64, h: 4 * 64 }, 'fosso', -3));
        const a = newToken(sc, 2 * 64, 4 * 64, { name: 'Ana' }), b = newToken(sc, 21 * 64, 4 * 64, { name: 'Bruto' }), c = newToken(sc, 27 * 64, 4 * 64, { name: 'Cão' });
        a.bars = [{ n: 'Vida', c: '#d6524b', v: 80, m: 80, k: 'bar', on: true, vis: '' }]; b.bars = [{ n: 'Vida', c: '#d6524b', v: 200, m: 200, k: 'bar', on: true, vis: '' }];
        Store.add('tokens', a); Store.add('tokens', b); Store.add('tokens', c);
      });
      App.view.z = 0.5;
      return { a: Store.scene().tokens.find(x => x.name === 'Ana').id, b: Store.scene().tokens.find(x => x.name === 'Bruto').id, c: Store.scene().tokens.find(x => x.name === 'Cão').id };
    });
    await w(200);
    const R = (fn, arg) => ev(fn, arg);

    // a tabela
    ok(await R(() => JSON.stringify(__tc.Relevo.tabela(__tc.Store.scene()))) === JSON.stringify({ on: true, sobe: 1, penhasco: 3, cima: 2, baixo: -2, queda: 10, quedaCada: 2 }), 'a tabela de começo: subir 1 custa +1 q; penhasco a partir de 3; de cima +2, de baixo −2; queda 10% a cada 2 q');
    ok(await R(() => JSON.stringify(__tc.Relevo.norm({ on: 0, sobe: '2,5', penhasco: 0, cima: 'x', queda: 500, quedaCada: 0 }))) === JSON.stringify({ on: true, sobe: 2.5, penhasco: 1, cima: 2, baixo: -2, queda: 100, quedaCada: 0.5 }), 'a tabela arrumada: os limites e os números escritos com vírgula (on só desliga com false)');

    // a régua: subida, penhasco e queda
    const c1 = await R(() => { const sc = __tc.Store.scene(); return __tc.Relevo.custo(sc, [5 * 64, 300, 12 * 64, 300]); });
    ok(c1 && c1.extra === 2 && !c1.escalar && !c1.queda, 'do chão para o morro (2 q): subida de +2 q, sem penhasco — ' + JSON.stringify(c1));
    const c2 = await R(() => { const sc = __tc.Store.scene(); return __tc.Relevo.custo(sc, [5 * 64, 300, 22 * 64, 300]); });
    ok(c2 && c2.extra === 8 && c2.escalar && c2.queda === 0, 'até a montanha: +2 no morro, desce 2, sobe 6 de uma vez — penhasco, só escalando (as subidas somam +8 q; a descida não custa): ' + JSON.stringify(c2));
    const c3 = await R(() => { const sc = __tc.Store.scene(); return __tc.Relevo.custo(sc, [22 * 64, 300, 27 * 64 + 40, 300]); });
    ok(c3 && c3.queda === 6 && c3.extra === 0, 'da montanha para fora: queda de 6 q: ' + JSON.stringify(c3));
    const rot = await R(() => { const sc = __tc.Store.scene(); return __tc.Relevo.rotulo(sc, 17, [5 * 64, 300, 22 * 64, 300]); });
    ok(rot === ' · subida +8 q = 25 q · penhasco: só escalando', 'o texto da régua: ' + rot);
    ok(await R(() => __tc.Relevo.rotulo(__tc.Store.scene(), 3, [64, 64, 300, 64])) === '', 'no chão plano, nada a mais');

    // a régua de verdade, na tela
    await ev(() => __tc.Tools.set('ruler'));
    const caixa = await page.locator('#cv').boundingBox();
    const tela = (x, y) => ev(([x, y]) => __tc.Render.toScreen(x, y), [x, y]);
    const [sx0, sy0] = await tela(5 * 64, 300), [sx1, sy1] = await tela(22 * 64, 300);
    await page.mouse.move(caixa.x + sx0, caixa.y + sy0); await page.mouse.down(); await page.mouse.move(caixa.x + sx1, caixa.y + sy1, { steps: 8 }); await page.mouse.up(); await w(250);
    await foto('l18-cenas-regua');
    await page.keyboard.press('Escape'); await ev(() => __tc.Tools.set('select')); await w(100);

    // a queda: o mestre leva o Bruto da montanha para fora
    await clearToasts();
    await ev(id => __tc.Store.tx('Mover', () => __tc.Store.upd('tokens', id, { x: 27 * 64 + 40 })), ids.b); await w(250);
    const tq = await toasts();
    ok(/Bruto caiu 9 m: a regra sugere 30% da Vida máxima \(60 de Vida\)/.test(tq) && /Aplicar o dano/.test(tq), 'a queda de 9 m (6 q): o aviso sugere 30% da Vida (60) — ' + tq);
    ok(await R(id => __tc.Store.get('tokens', id).bars[0].v, ids.b) === 200, 'nada muda sozinho');
    await page.locator('.toast', { hasText: 'Bruto caiu' }).locator('.toast-a').click(); await w(250);
    ok(await R(id => __tc.Store.get('tokens', id).bars[0].v, ids.b) === 140, '"Aplicar o dano" tira os 60 da Vida (200 → 140)');
    ok(/−60 de Vida \(queda\)/.test(await toasts()), 'e avisa, com Desfazer');
    await page.locator('.toast', { hasText: '(queda)' }).locator('.toast-a').click(); await w(250);
    ok(await R(id => __tc.Store.get('tokens', id).bars[0].v, ids.b) === 200, 'Desfazer devolve a Vida');
    // descer do morro (2 q) não é queda
    await clearToasts();
    await ev(id => __tc.Store.tx('Mover', () => __tc.Store.upd('tokens', id, { x: 11 * 64 })), ids.a); await w(150);
    await ev(id => __tc.Store.tx('Mover', () => __tc.Store.upd('tokens', id, { x: 6 * 64 })), ids.a); await w(200);
    ok(!/caiu/.test(await toasts()), 'descer do morro (2 q) não é queda');
    // com a regra desligada, nada
    await ev(() => { __tc.Store.S.prefs.relevo = { on: false }; });
    await ev(id => __tc.Store.tx('Mover', () => __tc.Store.upd('tokens', id, { x: 21 * 64 })), ids.b); await w(100);
    await clearToasts();
    await ev(id => __tc.Store.tx('Mover', () => __tc.Store.upd('tokens', id, { x: 27 * 64 + 40 })), ids.b); await w(200);
    ok(!/caiu/.test(await toasts()) && await R(() => __tc.Relevo.rotulo(__tc.Store.scene(), 17, [5 * 64, 300, 22 * 64, 300])) === '', 'com as regras desligadas: nem aviso, nem a régua');
    await ev(() => { __tc.Store.S.prefs.relevo = null; });
    await ev(id => __tc.Store.tx('Mover', () => __tc.Store.upd('tokens', id, { x: 21 * 64 })), ids.b); await w(150);
    await clearToasts();

    // de cima: o Bruto (na montanha) mira a Ana (no chão) e abre a janelinha de atributos
    await ev(([b, a]) => { __tc.Store.tx('Mira', () => __tc.Store.scn({ targets: [{ by: 'gm', t: a }] })); }, [ids.b, ids.a]); await w(100);
    ok(JSON.stringify(await R(([b, a]) => { const sc = __tc.Store.scene(); return __tc.Relevo.vantagem(sc, __tc.Store.get('tokens', b), __tc.Store.get('tokens', a)); }, [ids.b, ids.a])) === JSON.stringify({ lado: 'cima', v: 2, dif: 6 }), 'de cima (6 q acima): +2');
    ok(JSON.stringify(await R(([b, a]) => { const sc = __tc.Store.scene(); return __tc.Relevo.vantagem(sc, __tc.Store.get('tokens', a), __tc.Store.get('tokens', b)); }, [ids.b, ids.a])) === JSON.stringify({ lado: 'baixo', v: -2, dif: -6 }), 'de baixo: −2');
    // meio quadrado de diferença (uma plataforma de 0,75 m) não conta
    ok(await R(([a]) => { const { Store, Combate, newToken } = __tc, sc = Store.scene(); const p = Combate.newTerrain({ k: 'rect', x: 26 * 64, y: 14 * 64, w: 2 * 64, h: 2 * 64 }, 'plataforma', 0.75); const t = newToken(sc, 26 * 64, 14 * 64, { name: 'Plat' }), u = newToken(sc, 28 * 64, 14 * 64, { name: 'Chão' }); Store.tx('meio', () => { Store.add('shapes', p); Store.add('tokens', t); Store.add('tokens', u); }); const s2 = Store.scene(), r = __tc.Relevo.vantagem(s2, Store.get('tokens', t.id), Store.get('tokens', u.id)); Store.tx('tirar', () => { Store.del('tokens', t.id); Store.del('tokens', u.id); Store.del('shapes', p.id); }); return r; }, [ids.a]) === null, 'meio quadrado de diferença não dá bônus (só a partir de 1)');
    await ev(id => __tc.Luta.atributos(__tc.Store.get('tokens', id)), ids.b); await w(250);
    ok(await page.locator('#fp-rel').isVisible() && /Mirando Ana, de cima: \+2 no atributo/.test(await page.locator('#fp-rel').innerText()), 'a janelinha de atributos: "Mirando Ana, de cima: +2 no atributo"');
    ok(await page.locator('#fp-ma').inputValue() === '', 'nada entra sozinho');
    await page.locator('#fp-rel-somar').click(); await w(150);
    ok(await page.locator('#fp-ma').inputValue() === '2' && await page.locator('#fp-rel-somar').isDisabled(), '"Somar" põe +2 no "+ atrib." (só uma vez)');
    await foto('l18-cenas-de-cima');
    await page.keyboard.press('Escape'); await w(100);

    // a visão pelo relevo
    const segs = () => R(id => __tc.Walls.sightFor(__tc.Store.scene(), __tc.Store.get('tokens', id)).length, ids.a);
    const s0 = await segs();
    await ev(() => __tc.Store.tx('Visão', () => __tc.Store.scn({ fog: Object.assign({}, __tc.Store.scene().fog, { dynamic: true }), relevoVisao: true }))); await w(150);
    const s1 = await segs();
    ok(s1 - s0 === 32, 'com a chave ligada, o morro e a montanha (mais altos que a Ana) barram a visão dela: ' + s0 + ' → ' + s1);
    ok(await R(id => __tc.Relevo.barreiras(__tc.Store.scene(), __tc.Store.get('tokens', id)).length, ids.b) === 0, 'do alto da montanha, nada é mais alto: nada barra o Bruto');
    ok(await R(id => __tc.Relevo.alcanceExtra(__tc.Store.scene(), __tc.Store.get('tokens', id)), ids.b) === 6 && await R(id => __tc.Relevo.alcanceExtra(__tc.Store.scene(), __tc.Store.get('tokens', id)), ids.a) === 0, 'de cima se vê mais longe: +6 q no alcance do Bruto; a Ana, nada');
    await ev(id => __tc.Store.tx('Mover', () => __tc.Store.upd('tokens', id, { x: 3 * 64 + 32, y: 15 * 64 + 32 })), ids.a); await w(150);
    ok(await R(id => __tc.Relevo.barreiras(__tc.Store.scene(), __tc.Store.get('tokens', id)).length, ids.a) === (2 * 4 + 24) * 4, 'dentro do fosso: o próprio fosso fecha a visão (e o morro e a montanha continuam barrando)');
    await ev(() => __tc.Store.tx('Visão', () => __tc.Store.scn({ relevoVisao: undefined }))); await w(100);
    ok(await R(id => __tc.Relevo.barreiras(__tc.Store.scene(), __tc.Store.get('tokens', id)).length, ids.a) === 0, 'com a chave desligada, o relevo não barra nada');

    // a aba Cena: a chave e as regras do relevo
    await ev(() => __tc.UI.openTab('scene')); await w(200);
    await ev(() => { const d = document.getElementById('c-relevo'); if (d) d.open = true; }); await w(100);
    ok(await page.locator('#rl-visao').count() === 1 && !(await page.locator('#rl-visao').isDisabled()), 'na aba Cena, a seção Relevo com a chave (a visão por paredes está ligada)');
    ok(/Subir 1 de altura custa \+1 q/.test(await page.locator('#rl-resumo').innerText()), 'o resumo da tabela');
    await page.locator('#rl-regras').click(); await w(200);
    ok(await page.locator('#rl-tab').isVisible(), 'a janela das regras do relevo');
    await foto('l18-cenas-regras-relevo');
    await page.locator('#rl-cima').fill('3'); await page.locator('#rl-cima').dispatchEvent('change');
    await page.locator('#rl-qcada').fill('3'); await page.locator('#rl-qcada').dispatchEvent('change');
    await page.locator('.modal .btn.primary').click(); await w(250);
    ok(await R(() => JSON.stringify(__tc.Store.S.prefs.relevo)) === JSON.stringify({ on: true, sobe: 1, penhasco: 3, cima: 3, baixo: -2, queda: 10, quedaCada: 3 }), 'Salvar grava a tabela da mesa');
    ok(/de cima \+3/.test(await page.locator('#rl-resumo').innerText()), 'o resumo acompanha');
    await page.locator('.toast', { hasText: 'regras do relevo estão salvas' }).locator('.toast-a').click(); await w(250);
    ok(await R(() => __tc.Store.S.prefs.relevo) === null, 'Desfazer volta a tabela de antes (a de começo)');
    // a tabela vai para os jogadores com a cena (o índice da mesa e a projeção)
    ok(await R(() => JSON.stringify(__tc.Proj.normIndice({ prefs: { relevo: { cima: 4 } } }).prefs.relevo)) === JSON.stringify({ on: true, sobe: 1, penhasco: 3, cima: 4, baixo: -2, queda: 10, quedaCada: 2 }) && await R(() => !('relevo' in __tc.Proj.normIndice({}).prefs)), 'o índice da mesa guarda a tabela (só quando o mestre mudou)');
    ok(await R(() => { const sc = { relevoTab: { cima: 5 } }; const p = __tc.Store.S.prefs.relevo; __tc.Store.S.prefs.relevo = null; const v = __tc.Relevo.tabela(sc).cima; __tc.Store.S.prefs.relevo = p; return v; }) === 5, 'o jogador usa a cópia que veio com a cena');
  }

  if (parte('subsolo')) {
    // ---------- a caverna embaixo da cena ----------
    // uma Região livre com rio e com a entrada de gruta (a semente que sortear a gruta)
    const r0 = await ev(async () => {
      const { Regiao } = __tc;
      for (let s = 1; s < 80; s++) {
        const p = Regiao.gerar({ bioma: 'floresta', tamanho: 'grande', agua: 'rio', seed: s });
        if ((p.pontos || []).some(q => q.k === 'gruta') && (p.aguas || []).some(a => a.k === 'rio')) {
          const sc = await Regiao.criar(p, 'Floresta da gruta', {});
          __tc.UI.switchScene(sc.id);
          return { seed: s, id: sc.id, cols: sc.cols, rows: sc.rows };
        }
      }
      return null;
    });
    ok(!!r0, 'uma Região livre com rio e entrada de gruta: ' + JSON.stringify(r0));
    await w(400);
    const ent = await ev(() => { const t = __tc.Store.scene().tokens.find(x => x.gera && x.gera.t === 'subsolo'); return t ? JSON.parse(JSON.stringify(t)) : null; });
    ok(!!ent && ent.hidden && ent.prop === 'entrada' && ent.name === 'Entrada de gruta' && ent.gera.bio === 'raizes' && Array.isArray(ent.gera.rio) && ent.gera.rio.length >= 2 && ent.gera.rio.length <= 41,
      'na boca da gruta, a Entrada oculta (já sabe o rio de cima e o bioma de baixo: raízes, embaixo da floresta) — ' + (ent ? JSON.stringify({ bio: ent.gera.bio, rio: (ent.gera.rio || []).length }) : 'nada'));
    // o menu da passagem
    await ev(id => __tc.UI.passagem(__tc.Store.get('tokens', id), 400, 300), ent.id); await w(200);
    ok(await page.locator('.menu button', { hasText: 'Gerar a caverna embaixo…' }).count() === 1, 'dois cliques na Entrada: "Gerar a caverna embaixo…"');
    await page.locator('.menu button', { hasText: 'Gerar a caverna embaixo…' }).click(); await w(500);
    const v = await ev(() => { const a = __tc.Masmorra.vivo(); const p = a && a.plano; return p ? { W: p.W, H: p.H, bio: p.bioma, rio: !!p.rioPts, sobe: p.sobe, desce: !!p.desce, mk: (p.marcadores || []).map(m => m.id + ':' + m.n), agua: (p.grade.match(/3/g) || []).length, lago: p.lago && p.lago.k, ent: p.entradaEm } : null; });
    ok(v && v.W === r0.cols && v.H === r0.rows, 'a caverna tem o tamanho da cena de cima: ' + (v && v.W + '×' + v.H));
    ok(v && v.sobe && Math.hypot(v.sobe.mi + 0.5 - v.ent.x, v.sobe.mj + 0.5 - v.ent.y) <= 5, 'a subida (a Saída) fica embaixo da entrada da gruta: ' + (v && JSON.stringify([v.sobe && [v.sobe.mi, v.sobe.mj], v.ent])));
    ok(v && v.bio === 'raizes' && /Raízes \(de cima\)/.test(await page.locator('#sub-bio').innerText()), 'o bioma de baixo sugerido pelo de cima (raízes, marcado "de cima")');
    ok(v && v.rio && v.agua > 10, 'o rio de cima vira o rio de baixo (a água pelo traçado): ' + (v && v.agua) + ' casas de água');
    ok(v && v.mk.length === 2 && v.mk.some(x => x.startsWith('achado:Achado: ')) && v.mk.some(x => /^interesse:Ninho/.test(x)), 'um achado e um ninho: ' + (v && v.mk.join(' | ')));
    ok(v && v.desce, 'a passagem escondida para o nível de baixo');
    await foto('l18-cenas-subsolo-janela');
    // os outros biomas
    for (const [bio, k] of [['lava', 'lava'], ['gelo', 'gelo'], ['cristais', null], ['fungos', null]]) {
      await page.locator('#sub-bio .seg-b', { hasText: { lava: 'Lava', gelo: 'Gelo', cristais: 'Cristais', fungos: 'Fungos' }[bio] }).click(); await w(300);
      const q = await ev(() => { const p = __tc.Masmorra.vivo().plano; return { bio: p.bioma, lago: p.lago && p.lago.k, zonas: p.zonas.map(z => z.fx), luzes: p.luzes.length, cristal: p.pintados.filter(o => o.k === 'cristal').length, cog: p.pintados.filter(o => o.k === 'cogumelos').length, gelo: p.pintados.some(o => o.k === 'estalagmite' && o.gelo) }; });
      if (bio === 'lava') ok(q.bio === 'lava' && (!q.lago || (q.lago === 'lava' && q.zonas.includes('lava'))), 'a lava: o lago de lava, com a zona de fogo — ' + JSON.stringify(q));
      if (bio === 'gelo') ok(q.bio === 'gelo' && q.gelo && (!q.lago || (q.lago === 'gelo' && q.zonas.includes('gelado'))), 'o gelo: o lago congelado (a zona escorregadia) e as estalagmites de gelo — ' + JSON.stringify(q));
      if (bio === 'cristais') ok(q.cristal >= 4 && q.luzes >= 4, 'os cristais que brilham: ' + JSON.stringify(q));
      if (bio === 'fungos') ok(q.cog >= 4, 'os fungos que brilham: ' + JSON.stringify(q));
    }
    await page.locator('#sub-bio .seg-b', { hasText: 'Raízes' }).click(); await w(300);
    // o rio desligado
    await page.locator('label:has(#sub-rio)').click(); await w(300);
    ok(await ev(() => !__tc.Masmorra.vivo().plano.rioPts), 'sem o rio, a caverna não tem o rio de baixo');
    await page.locator('label:has(#sub-rio)').click(); await w(300);
    await page.locator('.modal .btn.primary').click(); await w(1500);
    const nova = await ev(() => { const sc = __tc.Store.scene(); return { nome: sc.name, cols: sc.cols, rows: sc.rows, saida: sc.tokens.filter(t => t.prop === 'saida').map(t => t.cena), ent: sc.tokens.filter(t => t.prop === 'entrada' && t.gera).map(t => t.gera.t + ':' + t.gera.n), marcas: sc.tokens.filter(t => (t.prop === 'achado' || t.prop === 'interesse') && t.hidden).length, tone: sc.tone }; });
    ok(nova.nome === 'Subsolo de Floresta da gruta' && nova.cols === r0.cols && nova.rows === r0.rows && nova.tone === 'breu', 'a cena nova, do tamanho da de cima, no breu: ' + JSON.stringify(nova));
    ok(nova.saida.length === 1 && nova.saida[0] === r0.id && nova.ent.join() === 'masmorra:2' && nova.marcas === 2, 'a Saída leva de volta; a passagem escondida gera o nível 2 (a masmorra); os dois marcadores ocultos');
    ok(await ev(([id, eid]) => __tc.Store.S.scenes[id].tokens.find(t => t.id === eid).cena === __tc.Store.S.current, [r0.id, ent.id]), 'a Entrada de cima fica ligada à caverna');
    await foto('l18-cenas-subsolo');
  }

  if (parte('arena')) {
    // ---------- as arenas: a aba Arena do "Gerar um lugar…" ----------
    await clearToasts();
    await ev(() => __tc.Gerador.abrir('arena')); await w(500);
    ok(await page.locator('#ger-lugar .seg-b', { hasText: 'Arena' }).count() === 1, 'a aba Arena em "Gerar um lugar…"');
    ok(await page.locator('#ar-tipo .seg-b').count() === 8, 'os oito tipos de arena: ' + (await page.locator('#ar-tipo').innerText()).replace(/\s+/g, ' / '));
    ok(await page.locator('#ar-fases .ar-fase').count() === 2 && await page.locator('#ar-fases .ar-mud').count() === 4, 'as fases prontas: a 2 e a 3, cada uma com duas mudanças');
    await page.locator('#ar-tipo .seg-b', { hasText: 'Covil do dragão' }).click(); await w(400);
    const pv = () => ev(() => { const p = __tc.Gerador.vivo().estado.plano; return p ? JSON.parse(JSON.stringify({ tipo: p.arena.tipo, W: p.W, H: p.H, chefe: p.arena.chefe, ref: p.arena.reforcos.length, fases: p.arena.fases.map(f => f.m.map(m => (m.k === 'zona' ? 'zona:' + m.fx : m.k) + (m.on ? '' : '(off)'))) })) : null; });
    let q = await pv();
    ok(q && q.tipo === 'covil' && q.W === 30 && q.H === 22 && q.ref >= 2 && q.fases.join('|') === 'reforcos,zona:lava|desaba,zona:fumaca', 'o covil do dragão (médio, 30 × 22): o chefe, os pontos de reforço e as fases da tabela — ' + JSON.stringify(q));
    ok(/O covil do dragão/.test(await page.locator('#ger-nome').inputValue()), 'o nome de começo: ' + await page.locator('#ger-nome').inputValue());
    // desliga os reforços da fase 2 e troca a fumaça da fase 3 pelo chão que congela
    await page.locator('label:has(#ar-f2-0)').click(); await w(300);
    ok(await page.locator('#ar-f2-0-k').isDisabled(), 'a mudança desligada: a lista dela fica apagada');
    await page.locator('#ar-f3-1-k').selectOption('zona:gelado'); await w(300);
    q = await pv();
    ok(q.fases.join('|') === 'reforcos(off),zona:lava|desaba,zona:gelado', 'cada mudança liga, desliga ou troca: ' + JSON.stringify(q.fases));
    // "Gerar outro" mantém as fases escolhidas
    await page.locator('#ger-outro').click(); await w(300);
    ok((await pv()).fases.join('|') === 'reforcos(off),zona:lava|desaba,zona:gelado', '"Gerar outro" sorteia outra arena, com as mesmas fases');
    await foto('l18-cenas-arena-janela');
    await page.locator('.modal .btn.primary').click(); await w(1500);
    const cena = await ev(() => { const sc = __tc.Store.scene(); return JSON.parse(JSON.stringify({ id: sc.id, nome: sc.name, chefe: sc.tokens.filter(t => !t.prop && t.size === 2).map(t => t.name + ':' + t.turns), ref: sc.tokens.filter(t => t.prop === 'reforco' && t.hidden).map(t => t.name), cheg: sc.tokens.filter(t => t.prop === 'chegada' && t.hidden).length, fases: sc.fases, rel: sc.shapes.filter(s => s.ter && s.ter.h).length })); });
    ok(cena.chefe.join() === 'O dragão:2', 'o chefe no lugar dele (dois quadrados, dois turnos por rodada): ' + cena.chefe.join());
    ok(cena.ref.length >= 2 && cena.ref.every(n => /^Reforços \(fase 2\) \d$/.test(n)) && cena.cheg === 1, 'os pontos de reforço e a entrada, ocultos: ' + cena.ref.join(' | '));
    ok(Array.isArray(cena.fases) && cena.fases.length === 2 && cena.fases[0].m.length === 1 && cena.fases[0].m[0].fx === 'lava' && cena.fases[1].m.map(m => m.k + (m.fx || '')).join() === 'desaba,zonagelado', 'a cena guarda as fases (sem a mudança desligada): ' + JSON.stringify((cena.fases || []).map(f => f.m.map(m => m.k + (m.fx || '')))));
    ok(cena.rel >= 1, 'com o relevo (o lugar do chefe, elevado): ' + cena.rel + ' áreas com altura');
    ok(await ev(() => { const sc = __tc.Store.scene(); const r = __tc.Proj.projetar(sc, __tc.Store.S.assets, new Set()); return !('fases' in r.m); }), 'as fases são só do mestre: a cena que vai para os jogadores não as leva');
    // as fases na aba Cena
    await ev(() => __tc.UI.openTab('scene')); await w(300);
    await ev(() => { const d = document.getElementById('c-fases'); if (d) d.open = true; });
    ok(await page.locator('#c-fases .ar-cena').count() === 2 && await page.locator('#ar-acionar-2').count() === 1, 'na aba Cena, as fases da arena, cada uma com o botão de acionar');
    const antes = await ev(() => ({ fx: __tc.Store.scene().effects.filter(e => e.fx === 'lava' && !e.gm).length }));
    await page.locator('#ar-acionar-2').click(); await w(300);
    ok(await page.locator('#ar-previa li').count() === 1 && /lava/i.test(await page.locator('#ar-previa').innerText()), 'acionar mostra antes o que vai mudar: ' + (await page.locator('#ar-previa').innerText()).replace(/\s+/g, ' '));
    await foto('l18-cenas-arena-acionar');
    await page.locator('.modal .btn.primary').click(); await w(400);
    let d = await ev(() => { const sc = __tc.Store.scene(); return { fx: sc.effects.filter(e => e.fx === 'lava' && !e.gm).length, feita: sc.fases.map(f => !!f.feita) }; });
    ok(d.fx === antes.fx + 1 && d.feita.join() === 'true,false', 'a fase 2 acionada: a lava sobe e a fase fica marcada — ' + JSON.stringify(d));
    ok(/Fase 2: a lava sobe \(\d+ q de raio\)/.test(await toasts()) && /Desfazer/.test(await toasts()), 'o aviso diz o que mudou, com o Desfazer: ' + await toasts());
    ok(await page.locator('#ar-acionar-2').count() === 0 && /acionada/.test(await page.locator('#c-fases').innerText()), 'na aba Cena, a fase 2 aparece como acionada');
    await foto('l18-cenas-arena-fase');
    await ev(() => __tc.Tools.undo()); await w(300);
    d = await ev(() => { const sc = __tc.Store.scene(); return { fx: sc.effects.filter(e => e.fx === 'lava' && !e.gm).length, feita: sc.fases.map(f => !!f.feita) }; });
    ok(d.fx === antes.fx && d.feita.join() === 'false,false', 'o Desfazer volta tudo num passo só: ' + JSON.stringify(d));
    // o menu do mapa (botão direito no vazio)
    await ev(() => __tc.UI.contextMenu({ x: 3, y: 3 }, 300, 300)); await w(200);
    ok(await page.locator('.menu button', { hasText: 'Acionar a fase 2 da arena…' }).count() === 1, 'o botão direito no mapa: "Acionar a fase 2 da arena…"');
    await ev(() => __tc.UI.closeMenus());

    // ---------- o coliseu, com as fases de começo: os reforços, os espinhos, o chão que desaba e a grade ----------
    const col = await ev(async () => {
      const { Masmorra, UI } = __tc;
      const p = Masmorra.gerar({ tipo: 'arena', arena: 'coliseu', tamanho: 'medio', seed: 7 });
      const sc = await Masmorra.criar(p, 'Arena de teste', null, { relevo: true });
      UI.switchScene(sc.id);
      return { pts: p.arena.reforcos.length, lacaio: Masmorra.LACAIO_ARENA.coliseu, portas: sc.walls.filter(w => w.k === 'door').length };
    });
    await w(400);
    await ev(() => { __tc.Arena.acionar(0); }); await w(200);
    await page.locator('.modal .btn.primary').click(); await w(300);
    let c2 = await ev(() => { const sc = __tc.Store.scene(); return { lac: sc.tokens.filter(t => /^Gladiador \d$/.test(t.name) && !t.hidden).length, esp: sc.effects.filter(e => e.fx === 'espinhos' && !e.gm).length }; });
    ok(c2.lac === col.pts && c2.esp >= 1, 'a fase 2 do coliseu: os gladiadores chegam nos pontos marcados (' + c2.lac + ' de ' + col.pts + ') e os espinhos saem do chão');
    await ev(() => { __tc.Arena.acionar(1); }); await w(200);
    await page.locator('.modal .btn.primary').click(); await w(300);
    c2 = await ev(() => { const sc = __tc.Store.scene(); return { fosso: sc.shapes.filter(s => s.ter && s.ter.t === 'fosso' && s.ter.h === -6).length, tranc: sc.walls.filter(w => w.k === 'door' && w.locked && !w.open).length, feitas: sc.fases.every(f => f.feita) }; });
    ok(c2.fosso === 1 && (col.portas === 0 || c2.tranc >= 1) && c2.feitas, 'a fase 3: o chão desaba (o fosso de 6 m) e a grade da entrada fecha e tranca — ' + JSON.stringify(c2));
    ok(await ev(() => __tc.Arena.proxima(__tc.Store.scene()) === null), 'com as duas fases acionadas, o menu do mapa não oferece mais nada');

    // ---------- o último nível da masmorra: a sala do chefe ----------
    const fora = await ev(() => {
      const { Store, Props } = __tc;
      const sc = Store.scene();
      const t = Props.novo(sc, 'entrada', 4 * sc.cell, 4 * sc.cell, 1, true);
      Store.tx('entrada', () => Store.add('tokens', t));
      return { cena: sc.id, t: t.id };
    });
    await ev(id => __tc.Masmorra.abrir(__tc.Store.get('tokens', id)), fora.t); await w(500);
    ok(await page.locator('#mas-chefe').count() === 1, 'a janela da masmorra oferece "O último nível: a sala do chefe"');
    await page.locator('label:has(#mas-chefe)').click(); await w(400);
    const mc = await ev(() => { const p = __tc.Masmorra.vivo().plano; return p && p.arena ? p.arena.tipo : null; });
    ok(mc === 'trono' && await page.locator('#mas-seg').count() === 0 && await page.locator('#mas-desce').count() === 0, 'a sala do chefe da masmorra de pedra é a sala do trono (sem segredos nem escada de descida): ' + mc);
    ok(await page.locator('#mas-nome').inputValue() === 'A sala do trono', 'o nome: ' + await page.locator('#mas-nome').inputValue());
    await page.locator('.modal .btn.primary').click(); await w(1500);
    const sala = await ev(() => { const sc = __tc.Store.scene(); return { nome: sc.name, saida: sc.tokens.filter(t => t.prop === 'saida').map(t => t.cena), fases: (sc.fases || []).length, rei: sc.tokens.some(t => t.name === 'O rei') }; });
    ok(sala.nome === 'A sala do trono' && sala.saida.join() === fora.cena && sala.fases === 2 && sala.rei, 'a sala do chefe criada: a Saída, na entrada, leva de volta; o rei e as fases — ' + JSON.stringify(sala));
    ok(/a sala do chefe/.test(await toasts()), 'o aviso: ' + await toasts());
  }

  if (parte('campo')) {
    // ---------- o campo de batalha: o pedido do Mapa-múndi abre a janela de gerar com o bloco do campo ----------
    await clearToasts();
    const pedido = { v: 1, mapa: 'mp_teste', ladoA: 'o', por: 100,
      a: { g: 'g_a', nome: 'Legião de Ferro', fac: 'fc_a', cor: '#b03a2e', cmd: 'ch_ana', gov: null, unid: [{ nome: 'Lanceiros', tipo: 'Infantaria', tropas: 250, magos: 5, maq: 0 }, { nome: 'Arqueiros', tipo: 'Arqueiros', tropas: 100, magos: 0, maq: 2 }] },
      b: { g: 'g_b', nome: 'Hoste Azul', fac: 'fc_b', cor: '#2e6db0', cmd: null, gov: null, unid: [{ nome: 'Espadas', tipo: 'Infantaria', tropas: 300, magos: 0, maq: 0 }] } };
    ok(await ev(p => !__tc.Campo.valida({ a: p.a, b: p.a }) && !__tc.Campo.valida({ a: p.a }) && __tc.Campo.valida(p).por === 100, pedido), 'o pedido arrumado: sem dois exércitos diferentes, nada');
    // (a ficha do comandante é de um jogador da mesa: ele move os blocos daquele lado)
    await ev(() => { const { Fichas, Store } = __tc; window.__fichasAntes = { on: Fichas.on, get: Fichas.get }; Fichas.on = () => true; Fichas.get = id => (id === 'ch_ana' ? { id, nome: 'Ana', dono_id: 'pl_ana' } : null); if (!Store.S.players.some(p => p.id === 'pl_ana')) Store.S.players.push({ id: 'pl_ana', name: 'Jogadora Ana', color: '#4fb8e0' }); });
    await ev(p => __tc.Gerador.abrir('encontro', { op: { terreno: 'campo', situacao: 'surpresa', caminho: 'nenhum' }, nome: 'Campo de batalha: Legião × Hoste', id: 'cena_campo_t1', campo: p }), pedido); await w(500);
    ok(await page.locator('#cp-bloco').count() === 1, 'a janela de gerar abre com o bloco do campo de batalha');
    let ta = await page.locator('#cp-a').innerText(), tb = await page.locator('#cp-b').innerText();
    ok(/Legião de Ferro: 4 blocos de soldados, 1 de magos, 1 de cerco\. Move: Jogadora Ana \(o comandante\)\./.test(ta) && /Hoste Azul: 3 blocos de soldados\.$/.test(tb), 'os blocos de cada lado (100 por bloco) e quem move: ' + ta + ' | ' + tb);
    await page.locator('#cp-por').fill('50'); await page.locator('#cp-por').press('Tab'); await w(300);
    ta = await page.locator('#cp-a').innerText();
    ok(/7 blocos de soldados/.test(ta) && /6 blocos de soldados/.test(await page.locator('#cp-b').innerText()), 'com 50 por bloco, mais blocos: ' + ta);
    await page.locator('#cp-por').fill('100'); await page.locator('#cp-por').press('Tab'); await w(300);
    ok(await page.locator('#ger-nome').inputValue() === 'Campo de batalha: Legião × Hoste', 'o nome que veio do Mapa-múndi');
    await foto('l18-cenas-campo-janela');
    await page.locator('.modal .btn.primary').click(); await w(1500);
    const cp = await ev(() => { const sc = __tc.Store.scene(); const bs = sc.tokens.filter(t => t.bloco); return JSON.parse(JSON.stringify({ id: sc.id, cols: sc.cols, campo: sc.campo, mover: sc.perms.mover,
      a: bs.filter(t => t.bloco.l === 'a').map(t => ({ n: t.name, k: t.bloco.k, v: t.bars[0].v, b: t.bars[0].n, x: t.x / sc.cell, s: t.size, o: t.owner, c: t.color })), b: bs.filter(t => t.bloco.l === 'b').map(t => ({ n: t.name, v: t.bars[0].v, x: t.x / sc.cell, o: t.owner, c: t.color })) })); });
    ok(cp.id === 'cena_campo_t1' && cp.campo && cp.campo.a.g === 'g_a' && cp.campo.b.g === 'g_b' && cp.campo.por === 100 && cp.mover, 'a cena do campo (com o id do pedido), com o campo guardado e os jogadores podendo mover: ' + JSON.stringify(cp.campo));
    ok(cp.a.map(x => x.n + ':' + x.v).join() === 'Lanceiros 1:100,Lanceiros 2:100,Lanceiros 3:50,Arqueiros:100,Magos de Lanceiros:5,Cerco de Arqueiros:2', 'os blocos da Legião (o último de Lanceiros com o resto; os magos e as máquinas à parte): ' + cp.a.map(x => x.n + ':' + x.v).join());
    ok(cp.a.every(x => x.o === 'pl_ana' && x.c === '#b03a2e') && cp.b.every(x => !x.o && x.c === '#2e6db0'), 'os blocos da Legião são da jogadora do comandante; os da Hoste, só do mestre; cada lado com a cor da facção');
    ok(Math.max(...cp.a.map(x => x.x)) < cp.cols / 2 && Math.min(...cp.b.map(x => x.x)) > cp.cols / 2, 'frente a frente: a Legião a oeste, a Hoste a leste');
    const fr = Math.max(...cp.a.filter(x => x.k === 'sold').map(x => x.x)), tras = Math.max(...cp.a.filter(x => x.k !== 'sold').map(x => x.x));
    ok(tras < fr, 'os soldados na frente; os magos e as máquinas atrás');
    ok(await ev(() => { const sc = __tc.Store.scene(); const r = __tc.Proj.projetar(sc, __tc.Store.S.assets, new Set()); return !('campo' in r.m); }), 'o campo guardado é só do mestre');
    ok(/frente a frente: Legião de Ferro \(6 blocos\) e Hoste Azul \(3 blocos\)/.test(await toasts()), 'o aviso: ' + await toasts());
    await ev(() => { const { Fichas } = __tc; Fichas.on = window.__fichasAntes.on; Fichas.get = window.__fichasAntes.get; });
    await foto('l18-cenas-campo');
    // a aba Cena
    await ev(() => __tc.UI.openTab('scene')); await w(300);
    ok(await page.locator('#c-campo').count() === 1 && /Legião de Ferro: 6 blocos, 350 soldados · Hoste Azul: 3 blocos, 300 soldados/.test(await page.locator('#cp-resumo').innerText()), 'na aba Cena, o campo: ' + await page.locator('#cp-resumo').innerText());

    // ---------- a leitura do campo (numa arrumação feita aqui) ----------
    const L = await ev(() => {
      const { Store, Campo } = __tc, sc = Store.scene(), c = sc.cell;
      const mv = (nome, x, y) => { const t = sc.tokens.find(t => t.name === nome); Store.upd('tokens', t.id, { x: x * c, y: y * c }); };
      Store.tx('arrumar', () => {
        // (sem o relevo que o gerador sorteou: a leitura fica só com o que se põe aqui)
        for (const s of sc.shapes.filter(s => s.ter)) Store.del('shapes', s.id);
        // tira todos do caminho, longe uns dos outros
        sc.tokens.filter(t => t.bloco).forEach((t, i) => Store.upd('tokens', t.id, { x: (t.bloco.l === 'a' ? 1 : sc.cols - 3) * c, y: (1 + (i % 6) * 3) * c }));
        // a pinça: Lanceiros 1 entre dois blocos da Hoste (Espadas 1 em cima, Espadas 2 embaixo)
        mv('Lanceiros 1', 14, 8); mv('Espadas 1', 14, 5.5); mv('Espadas 2', 14, 10.5);
      });
      return Campo.leitura(Store.scene());
    });
    ok(L.b.some(x => x.k === 'flanco' && x.v === 1) && !L.a.some(x => x.k === 'flanco'), 'o flanco: a Hoste pega um bloco da Legião por dois lados (+1); a Legião não flanqueia ninguém — ' + JSON.stringify(L));
    ok(L.a.some(x => x.k === 'reserva') && L.b.some(x => x.k === 'reserva'), 'a reserva: os blocos de soldados longe da luta, de quem está lutando');
    // o terreno alto: um morro embaixo de Lanceiros 1
    const L2 = await ev(() => {
      const { Store, Combate, Campo } = __tc, sc = Store.scene(), c = sc.cell;
      Store.tx('morro', () => Store.add('shapes', Combate.newTerrain({ k: 'rect', x: 13 * c, y: 7.5 * c, w: 3 * c, h: 3 * c }, 'morro', 3)));
      return Campo.leitura(Store.scene());
    });
    ok(L2.a.some(x => x.k === 'alto' && x.v === 2), 'o terreno alto: o bloco da Legião no morro, mais alto que quem o ataca (+2: todos os dela na luta) — ' + JSON.stringify(L2.a));
    // a cobertura: a Hoste toda na mata
    const L3 = await ev(() => {
      const { Store, Combate, Campo } = __tc, sc = Store.scene(), c = sc.cell;
      Store.tx('mata', () => Store.add('shapes', Combate.newTerrain({ k: 'rect', x: 0, y: 0, w: sc.cols * c, h: 6.9 * c }, 'mata', 0)));
      return Campo.leitura(Store.scene());
    });
    ok(L3.b.some(x => x.k === 'cobertura'), 'a cobertura: blocos da Hoste na mata — ' + JSON.stringify(L3.b));
    await ev(() => __tc.UI.openTab('scene')); await w(300);
    ok(/O campo sugere: .*Hoste Azul flanco \+1/.test(await page.locator('#cp-sug').innerText()), 'a aba Cena mostra o que o campo sugere: ' + await page.locator('#cp-sug').innerText());
    await page.locator('#cp-levar').click(); await w(300);
    ok(await page.locator('#cp-leitura .cp-lado').count() === 2 && /Flanco \+1/.test(await page.locator('#cp-leitura').innerText()), '"Levar para a batalha…" mostra antes a leitura dos dois lados');
    await foto('l18-cenas-campo-leitura');
    await page.locator('.modal .btn', { hasText: 'Cancelar' }).click(); await w(200);

    // ---------- as perdas voltam aos blocos ----------
    ok(await ev(() => JSON.stringify(__tc.Campo.repartir([{ n: 100, luta: true }, { n: 100, luta: false }, { n: 50, luta: false }], 100))) === JSON.stringify([58, 28, 14]), 'repartir: quem está na luta perde o dobro (o arredondamento fecha a conta)');
    await clearToasts();
    const antesP = await ev(() => __tc.Store.scene().tokens.filter(t => t.bloco && t.bloco.k === 'sold').map(t => t.name + ':' + t.bars[0].v).join());
    await ev(() => __tc.Campo.perdas({ a: { g: 'g_a', t0: 350, t1: 175 }, b: { g: 'g_b', t0: 300, t1: 300 } })); await w(300);
    ok(/Legião de Ferro: 350 → 175 soldados \(−50%\)/.test(await page.locator('#cp-perdas').innerText()), 'a prévia das perdas: ' + (await page.locator('#cp-perdas').innerText()).replace(/\s+/g, ' '));
    await foto('l18-cenas-campo-perdas');
    await page.locator('.modal .btn.primary').click(); await w(300);
    const depoisP = await ev(() => { const bs = __tc.Store.scene().tokens.filter(t => t.bloco && t.bloco.l === 'a' && t.bloco.k === 'sold'); return { soma: bs.reduce((s, t) => s + t.bars[0].v, 0), l1: (bs.find(t => t.name === 'Lanceiros 1') || { bars: [{ v: 0 }] }).bars[0].v, n: bs.length }; });
    ok(depoisP.soma === 175, 'as perdas foram para os blocos da Legião (350 → 175): ' + JSON.stringify(depoisP));
    ok(depoisP.l1 < 50, 'o bloco na luta perdeu mais (Lanceiros 1: 100 → ' + depoisP.l1 + ')');
    ok(/As perdas foram para os blocos: Legião de Ferro −175/.test(await toasts()) && /Desfazer/.test(await toasts()), 'o aviso, com o Desfazer: ' + await toasts());
    await ev(() => __tc.Tools.undo()); await w(200);
    ok(await ev(() => __tc.Store.scene().tokens.filter(t => t.bloco && t.bloco.k === 'sold').map(t => t.name + ':' + t.bars[0].v).join()) === antesP, 'o Desfazer volta todos os blocos');
  }

  if (t.errs.length) console.log(t.errs.slice(0, 8).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
