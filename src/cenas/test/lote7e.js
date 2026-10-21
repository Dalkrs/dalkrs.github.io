// Bateria do lote 7 (parte 4b-1), no navegador, sem o site:
//   · a aba Encontro da janela "Gerar um lugar": os quinze terrenos (lote 13: e a Savana, a Costa e a Tundra) e as
//     situações de cada um (e a Surpresa), o caminho
//     (a estrada nunca fica sem; na água não há), os três tamanhos, travar o traçado clicando na prévia ("Gerar outro"
//     troca só as árvores, as pedras e os objetos), os marcadores de chegada e de emboscada (ocultos), e a cena (o
//     fundo pintado, as paredes de visão só no que é grande, o relevo leve, as zonas, as luzes);
//   · o navio: o convés com a amurada (uma "mureta": barra a passagem, não a visão, e não tem ícone), a escotilha com
//     o marcador de Entrada e, pelos dois cliques nela, o porão e as cabines (uma cena dentro do convés);
//   · a mureta como parede (a visão passa, a passagem não) e o relevo leve (translúcido) desenhado;
//   · o que o Mapa-múndi manda para a janela (o terreno, o estilo, a hora, o clima, o nome e o id da cena), sem mudar
//     as escolhas guardadas da janela;
//   · as regras dos planos de encontro em muitos sorteios (todos os terrenos, situações, caminhos e tamanhos).
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
  const clearToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const foto = async (nome, clip) => { if (SHOTS) { require('fs').mkdirSync(SHOTS, { recursive: true }); await page.screenshot(Object.assign({ path: path.join(SHOTS, nome + '.png') }, clip ? { clip } : {})); } };
  const SO = (process.env.SO || '').split(',').filter(Boolean), parte = k => !SO.length || SO.includes(k);
  const G = () => ev(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().estado)));
  const ctlTxt = async () => (await page.locator('.ger-op').innerText()).replace(/\n+/g, ' | ');
  const resumo = () => page.locator('#ger-resumo').innerText();
  const naPrevia = (x, y) => ev(([x, y]) => { const c = document.getElementById('ger-prev'), r = c.getBoundingClientRect(), cell = __tc.Gerador.vivo().cell(), k = Math.min(r.width / c.width, r.height / c.height), ox = (r.width - c.width * k) / 2, oy = (r.height - c.height * k) / 2; return [r.left + ox + x * cell * k, r.top + oy + y * cell * k]; }, [x, y]);
  const abrirGerador = async () => { await page.locator('#sceneBtn').click(); await w(200); await page.locator('.menu-i', { hasText: 'Gerar um lugar' }).click(); await w(700); };
  const botao = async (grupo, txt) => { await page.locator(`#${grupo} button`, { hasText: txt }).first().click(); await w(450); };
  const exato = async (grupo, txt) => { await page.locator(`#${grupo} button`).filter({ hasText: new RegExp('^' + txt + '$') }).click(); await w(450); };
  const semente = async v => { const f = page.locator('#ger-semente'); await f.fill(String(v)); await f.press('Enter'); await w(450); };
  const criar = async () => { await page.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click(); await page.waitForFunction(() => !document.querySelector('.modal'), null, { timeout: 40000 }); await w(400); };
  const doisCliques = async id => {
    await ev(id => { const u = __tc, sc = u.Store.scene(), tk = u.Store.get('tokens', id); u.Render.centerOn(tk.x + sc.cell * tk.size / 2, tk.y + sc.cell * tk.size / 2); }, id);
    await w(150);
    const box = await page.locator('#cv').boundingBox();
    const p2 = await ev(id => { const u = __tc, sc = u.Store.scene(), tk = u.Store.get('tokens', id); return u.Render.toScreen(tk.x + sc.cell * tk.size / 2, tk.y + sc.cell * tk.size / 2); }, id);
    await page.mouse.dblclick(box.x + p2[0], box.y + p2[1]); await w(300);
  };

  // ================= a aba Encontro =================
  if (parte('encontro')) {
    await abrirGerador();
    await page.locator('#ger-lugar button', { hasText: 'Encontro' }).click(); await w(700);
    const g0 = await G();
    ok(await ev(() => __tc.Gerador.vivo().lugar) === 'encontro' && g0.plano.lugar === 'encontro' && g0.plano.W === 32 && g0.plano.H === 24, 'a aba Encontro: o tamanho médio, de 32 × 24 quadrados');
    const c0 = await ctlTxt();
    ok(/Terreno \| Estrada \| Floresta \| Deserto \| Montanha \| Pântano \| Neve \| Campo \| Selva \| Terra corrompida \| Lava \| Cristais \| Savana \| Costa \| Tundra \| Água \| Situação \| Curva na mata \| Carroça tombada \| Ponte sobre o rio \| Encruzilhada \| Surpresa \| Caminho \| Trilha \| Estrada \| Tamanho \| Pequeno \| Médio \| Grande \| Mistura \| Pouca \| Média \| Muita \| Marcar a chegada e a emboscada \(só você vê\)/.test(c0), 'as escolhas: os quinze terrenos (lote 13: e a Savana, a Costa e a Tundra), as situações da estrada e a Surpresa, o caminho (a estrada nunca fica sem), o tamanho, a mistura do chão novo e os marcadores — ' + c0.slice(0, 260));
    ok(g0.op.situacao === 'surpresa' && g0.op.caminho === 'trilha' && g0.op.marcas === true, 'de começo: a situação sorteada, a trilha e os marcadores ligados: ' + j(g0.op));
    ok(/^Estrada · (Curva na mata|Carroça tombada|Ponte sobre o rio|Encruzilhada) \(sorteada\) · 32 × 24 quadrados · trilha/.test(await resumo()), 'o resumo diz a situação sorteada, as medidas e o caminho: ' + await resumo());
    ok(await page.locator('#ger-nome').inputValue() === 'Encontro na estrada', 'o nome da cena: "Encontro na estrada"');
    ok(/Clique no traçado da prévia/.test(await page.locator('#ger-dica').innerText()) && /paredes de visão só no que é grande/.test(await page.locator('.modal').innerText()), 'a dica (travar o traçado) e a nota (o que sai) são as do encontro');
    ok(/Com relevo, formas e zonas \(água, penhascos, abismos, lama, gelo, lava\)/.test(await page.locator('.modal').innerText()), 'a chave do relevo fala das zonas do encontro');
    await foto('01-aba-encontro');
    // a floresta: as situações dela; o caminho pode ser nenhum
    await exato('enc-ter', 'Floresta');
    const c1 = await ctlTxt(), g1 = await G();
    ok(/Situação \| Clareira \| Riacho \| Árvore gigante caída \| Acampamento abandonado \| Surpresa \| Caminho \| Sem caminho \| Trilha \| Estrada/.test(c1) && g1.op.situacao === 'surpresa' && g1.op.caminho === 'trilha', 'a floresta: as situações dela, a Surpresa de novo e o caminho que pode ser nenhum — ' + c1.slice(0, 200));
    ok(await page.locator('#ger-nome').inputValue() === 'Encontro na floresta', 'o nome acompanha: "Encontro na floresta"');
    await exato('enc-cam', 'Sem caminho');
    ok((await G()).plano.caminhos.length === 0 && !/trilha|estrada\./.test(await resumo()), 'sem caminho, o encontro sai sem trilha: ' + await resumo());
    // a água: sem o caminho; as situações do barco
    await exato('enc-ter', 'Água');
    const c2 = await ctlTxt();
    ok(/Situação \| Um navio \| Abordagem \| Barco no rio \| Naufrágio \| Surpresa \| Tamanho/.test(c2) && !/Caminho/.test(c2), 'a água: um navio, a abordagem, o barco no rio e o naufrágio; sem a escolha do caminho — ' + c2.slice(0, 200));
    await exato('enc-sit', 'Um navio');
    const g2 = await G();
    ok(g2.plano.navios.length === 1 && /^Água · Um navio · 32 × 24 quadrados · um navio/.test(await resumo()) && await page.locator('#ger-nome').inputValue() === 'Encontro no navio', 'um navio: o resumo e o nome dizem — ' + await resumo());
    await exato('enc-sit', 'Abordagem');
    ok((await G()).plano.navios.length === 2 && await page.locator('#ger-nome').inputValue() === 'Abordagem', 'a abordagem: dois navios lado a lado');
    // trocar de terreno com uma situação escolhida volta à Surpresa (a situação de um terreno não vale no outro)
    await exato('enc-ter', 'Neve');
    const gn = await G();
    ok(gn.op.situacao === 'surpresa' && await page.locator('#enc-sit button[aria-pressed="true"]').innerText() === 'Surpresa' && /\(sorteada\)/.test(await resumo()), 'trocar o terreno depois de escolher a situação volta à Surpresa: ' + j(gn.op));
    await exato('enc-ter', 'Água'); await exato('enc-sit', 'Abordagem');
    // os tamanhos
    await exato('enc-tam', 'Pequeno');
    const gp = await G();
    await exato('enc-tam', 'Grande');
    const gg = await G();
    ok(gp.plano.W === 24 && gp.plano.H === 18 && gg.plano.W === 40 && gg.plano.H === 30, 'pequeno 24 × 18 e grande 40 × 30');
    await exato('enc-tam', 'Médio');
    // travar o traçado: a estrada com a ponte sobre o rio
    await exato('enc-ter', 'Estrada');
    await exato('enc-sit', 'Ponte sobre o rio');
    await semente(4242);
    const a = await G();
    ok(a.plano.sit === 'ponte' && a.plano.aguas.length >= 1 && a.plano.caminhos.length >= 1 && !a.plano.travaTracado, 'a ponte sobre o rio: o rio e a estrada; nada travado');
    ok(await page.locator('#ger-soltar').isDisabled(), '"Soltar tudo" fica apagado sem nada travado');
    const f = a.plano.tracado.find(x => x.k === 'linha') || a.plano.tracado[0];
    const pt = f.k === 'linha' ? f.pts[Math.floor(f.pts.length / 2)] : f.k === 'circ' ? [f.x, f.y] : f.pts[0];
    const [sx, sy] = await naPrevia(pt[0], pt[1]);
    await page.mouse.click(sx, sy); await w(450);
    const b = await G();
    ok(b.plano.travaTracado === true && b.trava && b.trava.sit === 'ponte' && !(await page.locator('#ger-soltar').isDisabled()), 'um clique no traçado da prévia trava o traçado: ' + j(b.trava));
    await page.locator('#ger-outro').click(); await w(500);
    const c = await G();
    ok(c.seed !== b.seed && j(c.plano.caminhos) === j(b.plano.caminhos) && j(c.plano.aguas) === j(b.plano.aguas) && c.plano.travaTracado, '"Gerar outro" com o traçado travado: a estrada e o rio ficam iguais');
    ok(j(c.plano.arvores) !== j(b.plano.arvores) || j(c.plano.objetos) !== j(b.plano.objetos), 'e as árvores, as pedras e os objetos mudam');
    await foto('02-travado');
    await exato('enc-tam', 'Grande');
    ok(!(await G()).plano.travaTracado, 'trocar o tamanho solta a trava (o traçado não cabe igual)');
    await exato('enc-tam', 'Médio');
    // a trava volta e "Soltar tudo" solta
    { const g3 = await G(); const f3 = g3.plano.tracado.find(x => x.k === 'linha') || g3.plano.tracado[0]; const p3 = f3.k === 'linha' ? f3.pts[Math.floor(f3.pts.length / 2)] : f3.k === 'circ' ? [f3.x, f3.y] : f3.pts[0]; const [x3, y3] = await naPrevia(p3[0], p3[1]); await page.mouse.click(x3, y3); await w(400); }
    ok((await G()).plano.travaTracado, '(travado de novo)');
    await page.locator('#ger-soltar').click(); await w(400);
    ok(!(await G()).plano.travaTracado, '"Soltar tudo" solta o traçado');
    // os marcadores: desligar tira os dois
    await page.locator('.sw', { has: page.locator('#enc-marcas') }).click(); await w(450);
    const m0 = await G();
    ok(j(m0.plano.marcas) === '{}' && m0.op.marcas === false, 'sem os marcadores, o plano sai sem a chegada e a emboscada');
    await page.locator('.sw', { has: page.locator('#enc-marcas') }).click(); await w(450);
    const m1 = await G();
    ok(Array.isArray(m1.plano.marcas.chegada) && Array.isArray(m1.plano.marcas.emboscada), 'ligados, voltam a chegada e a emboscada');
    // cancelar não cria nada
    const antes = await ev(() => Object.keys(__tc.Store.S.scenes).length);
    await page.locator('.modal .btn', { hasText: 'Cancelar' }).click(); await w(300);
    ok(await ev(n => Object.keys(__tc.Store.S.scenes).length === n && !document.querySelector('.modal'), antes), 'cancelar não cria cena');
    // as escolhas ficam guardadas para a próxima vez
    await abrirGerador();
    const g4 = await G();
    ok(await ev(() => __tc.Gerador.vivo().lugar) === 'encontro' && g4.op.terreno === 'estrada' && g4.op.situacao === 'ponte', 'a janela reabre no Encontro, com as últimas escolhas: ' + j(g4.op));
    await page.keyboard.press('Escape'); await w(300);
  }

  // ================= a cena do encontro =================
  let cenaEnc = null;
  if (parte('cena')) {
    await abrirGerador();
    await page.locator('#ger-lugar button', { hasText: 'Encontro' }).click(); await w(600);
    await exato('enc-ter', 'Estrada'); await exato('enc-sit', 'Carroça tombada'); await exato('enc-cam', 'Estrada');
    await semente(777);
    const p = (await G()).plano;
    await page.locator('#ger-hora button', { hasText: 'Dia' }).click(); await w(200);
    await criar();
    const s = await ev(() => { const u = __tc, sc = u.Store.scene(); return {
      id: sc.id, nome: sc.name, cols: sc.cols, rows: sc.rows, tom: sc.tone, din: sc.fog.dynamic, fundo: !!(sc.bg.asset && u.Store.S.assets[sc.bg.asset]),
      paredes: sc.walls.map(x => x.k), marcas: sc.tokens.filter(x => x.prop === 'chegada' || x.prop === 'emboscada').map(x => ({ p: x.prop, oculto: !!x.hidden })),
      ter: sc.shapes.filter(x => x.ter).map(x => x.a), formas: sc.shapes.filter(x => !x.ter).length, fx: sc.effects.map(e => e.fx), toast: [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ ') }; });
    cenaEnc = s.id;
    ok(s.nome === 'Encontro na estrada' && s.cols === 32 && s.rows === 24 && s.tom === 'dia' && s.din && s.fundo, 'a cena: o nome do lugar, 32 × 24, de dia, com a névoa dinâmica e o fundo pintado: ' + j([s.nome, s.cols, s.rows, s.tom]));
    ok(s.paredes.length === p.visao.length && s.paredes.every(k => k === 'wall'), 'as paredes são as de visão do plano (só o que é grande): ' + s.paredes.length);
    ok(j(s.marcas.map(x => x.p).sort()) === j(['chegada', 'emboscada']) && s.marcas.every(x => x.oculto), 'a chegada e a emboscada, ocultas: ' + j(s.marcas));
    ok(s.ter.length === p.relevo.length && s.ter.every(a => a > 0 && a < 0.5), 'o relevo é leve (translúcido, por cima do fundo que já desenha): ' + j(s.ter));
    ok(s.formas === p.formas.length && s.fx.length === p.zonas.length, 'as formas e as zonas do plano: ' + j(s.fx));
    ok(/"Encontro na estrada" criada: Estrada · Carroça tombada · 32 × 24 quadrados · estrada/.test(s.toast), 'o aviso diz o que foi criado: ' + s.toast);
    await clearToasts();
    await ev(() => { __tc.Render.fit(); __tc.Render.request(); }); await w(400);
    await foto('03-cena-carroca');
    // quem joga não vê os marcadores
    const vis = await ev(() => { const u = __tc, sc = u.Store.scene(); u.Store.S.players = [{ id: 'p1', name: 'Dalmo', color: '#4fb8e0' }]; u.UI.setViewer('p1'); const r = sc.tokens.filter(x => x.prop === 'chegada' || x.prop === 'emboscada').map(x => u.tokShown(x, sc)); u.UI.setViewer('gm'); return r; });
    ok(vis.length === 2 && vis.every(v => v === false), 'quem joga não vê a chegada nem a emboscada');
    const mao = await ev(() => { const u = __tc, sc = u.Store.scene(); return [u.Props.novo(sc, 'chegada', 0, 0).hidden, u.Props.novo(sc, 'emboscada', 0, 0).hidden, u.Props.novo(sc, 'barril', 0, 0).hidden]; });
    ok(j(mao) === j([true, true, false]), 'posta à mão (pela paleta), a chegada e a emboscada também nascem ocultas: ' + j(mao));
    // de noite, no pântano: a cabana na palafita, com a luz e a névoa
    await abrirGerador();
    await exato('enc-ter', 'Pântano'); await exato('enc-sit', 'Cabana na palafita');
    await semente(31);
    await page.locator('#ger-hora button', { hasText: 'Noite' }).click(); await w(300);
    await page.locator('#ger-clima button', { hasText: 'Neblina' }).click(); await w(300);
    const pp = (await G()).plano;
    await criar();
    const s2 = await ev(() => { const sc = __tc.Store.scene(); return { nome: sc.name, tom: sc.tone, clima: sc.weather.k, portas: sc.walls.filter(x => x.k === 'door').length, paredes: sc.walls.length, fx: [...new Set(sc.effects.map(e => e.fx))].sort(), luzes: sc.lights.length, ter: sc.shapes.filter(x => x.ter).map(x => x.a) }; });
    ok(s2.nome === 'Encontro no pântano' && s2.tom === 'noite' && s2.clima === 'neblina', 'no pântano, de noite, com neblina: ' + j(s2));
    ok(pp.predios.length === 1 && s2.portas >= 1 && s2.paredes > 4, 'a cabana na palafita tem paredes e porta: ' + j([s2.portas, s2.paredes]));
    ok(s2.luzes >= 1, 'de noite, a cabana tem luz: ' + s2.luzes);
    ok(s2.ter.length === pp.relevo.length && s2.ter.length >= 2 && s2.ter.every(a => a > 0 && a < 0.5), 'o relevo da palafita (a margem, o deque) é leve: ' + j(s2.ter));
    const lev = await ev(() => { const sc = __tc.Store.scene(); return sc.effects.map(e => e.leve === true); });
    ok(lev.length >= 1 && lev.every(Boolean), 'as zonas do encontro saem leves (um véu e o contorno tracejado, por cima do desenho): ' + j(lev));
    await ev(() => { const sc = __tc.Store.scene(); __tc.setSel([{ c: 'effects', id: sc.effects[0].id }]); }); await w(300);
    ok(await page.locator('#fx-leve').isChecked(), 'no painel do efeito, a chave "Leve" vem ligada');
    await page.locator('.sw', { has: page.locator('#fx-leve') }).click(); await w(200);
    ok(await ev(() => __tc.Store.scene().effects[0].leve === false), 'desligar a chave deixa a zona como as de sempre');
    await ev(() => __tc.Tools.undo()); await w(200);
    ok(await ev(() => __tc.Store.scene().effects[0].leve === true), '(Desfazer volta a zona leve)');
    await ev(() => __tc.setSel([]));
    await clearToasts();
    await ev(() => { __tc.Render.fit(); __tc.Render.request(); }); await w(400);
    await foto('04-cena-palafita-noite');
    // sem o relevo: nada de áreas, formas nem zonas
    await abrirGerador();
    await exato('enc-ter', 'Lava'); await exato('enc-sit', 'Rio de lava');
    await page.locator('#ger-hora button', { hasText: 'Dia' }).click(); await w(200);
    await page.locator('#ger-clima button', { hasText: 'Nenhum' }).click(); await w(200);
    const lv = (await G()).plano;
    await page.locator('.sw', { has: page.locator('#ger-relevo') }).click(); await w(300);
    await criar();
    const s3 = await ev(() => { const sc = __tc.Store.scene(); return { ter: sc.shapes.filter(x => x.ter).length, fx: sc.effects.length, luzes: sc.lights.length }; });
    ok(lv.zonas.length >= 3 && lv.zonas.every(z => z.fx === 'lava' && z.k === 'rect' && z.rw > 1 && z.rh > 1) && lv.relevo.length > 0 && s3.ter === 0 && s3.fx === 0 && s3.luzes === lv.luzes.length, 'sem o relevo: o rio de lava sai sem as áreas e sem as zonas, mas com as luzes da lava: ' + j([s3, lv.zonas.length, lv.luzes.length]));
    await abrirGerador(); await page.locator('.sw', { has: page.locator('#ger-relevo') }).click(); await w(200);
    ok(await page.locator('#ger-relevo').isChecked(), '(o relevo ligado de novo)');
    await page.keyboard.press('Escape'); await w(200);
  }

  // ================= o navio =================
  if (parte('navio')) {
    await abrirGerador();
    await page.locator('#ger-lugar button', { hasText: 'Encontro' }).click(); await w(600);
    await exato('enc-ter', 'Água'); await exato('enc-sit', 'Um navio');
    await semente(88);
    const p = (await G()).plano;
    await criar();
    const s = await ev(() => { const u = __tc, sc = u.Store.scene(); return { id: sc.id, nome: sc.name, mur: sc.walls.filter(x => x.k === 'mureta').length, wall: sc.walls.filter(x => x.k === 'wall').length, outras: sc.walls.filter(x => x.k !== 'mureta' && x.k !== 'wall').length, icones: u.doorSpots(sc).length, ent: sc.tokens.filter(x => x.prop === 'entrada').map(x => ({ id: x.id, oculto: !!x.hidden, gera: x.gera })) }; });
    const amurada = await ev(p => __tc.Navio.paredes(p.navios[0]).length, p);
    ok(s.nome === 'Encontro no navio' && s.mur === amurada && amurada >= 8 && s.outras === 0, 'o convés: a amurada inteira é de mureta (' + s.mur + ' trechos)');
    ok(s.wall === p.visao.length, 'as outras paredes são só as de visão (os rochedos no mar, quando há): ' + s.wall);
    ok(s.icones === 0, 'a amurada não tem ícone de abertura (nada para clicar, nem para quem joga)');
    ok(s.ent.length === 1 && s.ent[0].oculto && s.ent[0].gera.t === 'navio' && s.ent[0].gera.f === 'navio' && s.ent[0].gera.w === p.navios[0].L && s.ent[0].gera.h === p.navios[0].B, 'a escotilha: o marcador de Entrada oculto, que sabe o tamanho do convés: ' + j(s.ent[0] && s.ent[0].gera));
    const vis = await ev(() => { const u = __tc, sc = u.Store.scene(), d = u.Walls.of(sc); return { sight: d.sight.length, move: d.move.length }; });
    ok(vis.sight === s.wall * 4 && vis.move === (s.mur + s.wall) * 4, 'a amurada barra a passagem, não a visão: ' + j(vis));
    await clearToasts();
    await ev(() => { __tc.Render.fit(); __tc.Render.request(); }); await w(400);
    await foto('05-conves');
    // os dois cliques na escotilha: o porão e as cabines
    await doisCliques(s.ent[0].id);
    const menu = (await page.locator('.menu').innerText()).replace(/\n/g, ' | ');
    ok(/Gerar o interior/.test(menu), 'os dois cliques na escotilha oferecem "Gerar o interior…": ' + menu);
    await page.locator('.menu-i', { hasText: 'Gerar o interior' }).click(); await w(700);
    const tipos = await ev(() => [...document.querySelectorAll('#int-tipo button')].map(b => b.textContent.trim()));
    ok(j(tipos) === j(['Navio']), 'a janela do interior: o tipo é só "Navio": ' + j(tipos));
    ok(/O porão e as cabines, do tamanho do convés/.test(await page.locator('.modal').innerText()), 'a nota fala do porão e das cabines');
    await foto('06-janela-porao');
    await criar();
    const it = await ev(id => { const u = __tc, sc = u.Store.scene(), deck = u.Store.S.scenes[id], ent = deck.tokens.find(x => x.prop === 'entrada'); return {
      id: sc.id, nome: sc.name, mae: u.Store.S.pastas.mae[sc.id], liga: ent.cena, portas: sc.walls.filter(x => x.k === 'door').length, janelas: sc.walls.filter(x => x.k === 'window').length,
      diagonais: sc.walls.filter(x => x.x1 !== x.x2 && x.y1 !== x.y2).length, moveis: [...new Set(sc.tokens.filter(x => x.prop && x.prop !== 'saida').map(x => x.prop))].sort(), saida: (sc.tokens.find(x => x.prop === 'saida') || {}).cena }; }, s.id);
    ok(it.nome === 'Navio — por dentro' && it.mae === s.id && it.liga === it.id && it.saida === s.id, 'o porão é uma cena dentro do convés; a escotilha leva a ele, e a Saída da escada volta: ' + j([it.nome, it.mae === s.id, it.liga === it.id, it.saida === s.id]));
    ok(it.portas >= 5 && it.janelas >= 2 && it.diagonais >= 2, 'as portas de cada divisão, as vigias e o casco em ponta na proa: ' + j([it.portas, it.janelas, it.diagonais]));
    ok(['barril', 'cama', 'caixote', 'mesa'].every(k => it.moveis.includes(k)), 'a cabine do capitão, os beliches e a carga: ' + j(it.moveis));
    await clearToasts();
    await ev(() => { __tc.Render.fit(); __tc.Render.request(); }); await w(400);
    await foto('07-porao');
    // a abordagem: dois navios, dois marcadores
    await abrirGerador();
    await exato('enc-sit', 'Abordagem');
    await criar();
    const pab = (await ev(() => JSON.parse(JSON.stringify(__tc.Store.scene().id)))) && null;
    const ab = await ev(() => { const sc = __tc.Store.scene(); return { mur: sc.walls.filter(x => x.k === 'mureta').length, ent: sc.tokens.filter(x => x.prop === 'entrada').length, nome: sc.name }; });
    ok(ab.nome === 'Abordagem' && ab.mur >= 16 && ab.ent === 2, 'a abordagem: dois navios, cada um com a amurada e a escotilha: ' + j(ab));
    void pab;
  }

  // ================= a mureta e o relevo leve =================
  if (parte('mureta')) {
    const ids = await ev(() => {
      const u = __tc, sc = u.newScene('Mureta'); u.Store.addScene(sc); u.Store.setCurrent(sc.id);
      u.Store.S.players = [{ id: 'p1', name: 'Dalmo', color: '#4fb8e0' }];
      const c = sc.cell, o = {};
      u.Store.tx('prep', () => {
        u.Store.scn({ cols: 16, rows: 10, fog: { dynamic: true, manual: false, explored: false, shared: true } });
        const a = u.newToken(sc, 2 * c, 4 * c, { name: 'Dain', owner: 'p1', vis: { on: true, range: 0, dark: 0 } }), b = u.newToken(sc, 8 * c, 4 * c, { name: 'Ogro', vis: { on: false, range: 0, dark: 0 } });
        u.Store.add('tokens', a); u.Store.add('tokens', b); o.a = a.id; o.b = b.id;
        u.Store.add('walls', { id: 'w_mur', k: 'mureta', x1: 5 * c, y1: 1 * c, x2: 5 * c, y2: 9 * c, open: false, locked: false, secret: false });
      });
      u.Render.fit(); u.setSel([]);
      return o;
    });
    const olha = () => ev(id => { const u = __tc, sc = u.Store.scene(); u.UI.setViewer('p1'); u.Vision.invalidate(); u.Vision.update(sc, u.App.viewer); const r = u.tokShown(u.Store.get('tokens', id), sc); u.UI.setViewer('gm'); return r; }, ids.b);
    const barra = () => ev(() => { const u = __tc, sc = u.Store.scene(), c = sc.cell; return u.Walls.blocksMove(sc, 2.5 * c, 4.5 * c, 8.5 * c, 4.5 * c); });
    ok(await olha() === true && await barra() === true, 'atrás da mureta: quem joga vê o outro lado, mas não passa');
    await ev(() => { const u = __tc; u.Store.tx('x', () => u.Store.upd('walls', 'w_mur', { k: 'wall' })); });
    ok(await olha() === false && await barra() === true, '(trocada por uma parede comum, não vê mais)');
    await ev(() => { const u = __tc; u.Store.tx('x', () => u.Store.upd('walls', 'w_mur', { k: 'mureta' })); });
    // o painel da parede: a mureta é uma das escolhas, com a explicação
    await ev(() => { __tc.setSel([{ c: 'walls', id: 'w_mur' }]); __tc.UI.openTab && __tc.UI.openTab('sel'); }); await w(300);
    const painel = (await page.locator('#side').innerText()).replace(/\n+/g, ' | ');
    ok(/Mureta/.test(painel), 'no painel da parede, a "Mureta" é um tipo: ' + painel.slice(0, 240));
    const norm = await ev(() => { const u = __tc, sc = u.newScene('n'); sc.walls.push({ id: 'x', k: 'mureta', x1: 0, y1: 0, x2: 64, y2: 0 }); u.normalizeScene(sc); return sc.walls[0].k; });
    ok(norm === 'mureta', 'a mureta sobrevive à leitura da cena (salvar e abrir)');
    // o relevo leve: translúcido (um véu da cor do terreno), mais fraco que a área de sempre
    const px = await ev(async () => {
      const u = __tc, sc = u.newScene('Leve'); u.Store.addScene(sc); u.Store.setCurrent(sc.id);
      const c = sc.cell;
      u.Store.tx('prep', () => {
        u.Store.scn({ cols: 24, rows: 8, bgColor: '#808080', grid: Object.assign({}, sc.grid, { show: false }), fog: { dynamic: false, manual: false, explored: false, shared: true } });
        const leve = Object.assign(u.Estilos.terrenoNaCena({ k: 'rect', x: 2, y: 2, w: 4, h: 4, t: 'agua' }, c, 0, 0), { a: 0.2 });
        const cheia = u.Estilos.terrenoNaCena({ k: 'rect', x: 10, y: 2, w: 4, h: 4, t: 'agua' }, c, 0, 0);
        u.Store.add('shapes', leve); u.Store.add('shapes', cheia);
      });
      u.setSel([]); u.Render.fit(); u.Render.request();
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const cv = document.getElementById('cv'), dpr = cv.width / cv.getBoundingClientRect().width;
      const copia = document.createElement('canvas'); copia.width = cv.width; copia.height = cv.height;
      const g = copia.getContext('2d', { willReadFrequently: true }); g.drawImage(cv, 0, 0);
      const at = (x, y) => { const p = u.Render.toScreen(x * c, y * c); return [...g.getImageData(Math.round(p[0] * dpr), Math.round(p[1] * dpr), 1, 1).data]; };
      return { leve: at(4.3, 4.3), cheia: at(12.3, 4.3), fundo: at(20.3, 4.3), a: sc.shapes.map(s => s.a) };
    });
    const dist = (p, q) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]);
    ok(dist(px.leve, px.fundo) > 8 && dist(px.leve, px.fundo) < dist(px.cheia, px.fundo) * 0.7, 'a área leve aparece, mais fraca que a de sempre (o fundo pintado continua à vista): ' + j(px));
    await foto('08-leve');
    // a zona leve (a dos lugares gerados): um véu fraco, bem mais fraco que a zona de sempre
    const zx = await ev(async () => {
      const u = __tc, sc = u.newScene('Zonas'); u.Store.addScene(sc); u.Store.setCurrent(sc.id);
      const c = sc.cell, z = (x, leve) => ({ id: 'fz' + x, fx: 'lava', k: 'circ', x: x * c, y: 4 * c, r: 2.5, w: 1, rw: 5, rh: 5, ang: 0, dir: 0, pow: 0.75, leve, token: null, gm: false, by: null, seed: 3, dur: 0, dur0: 0, at: null, apply: null });
      u.Store.tx('prep', () => { u.Store.scn({ cols: 24, rows: 8, bgColor: '#808080', grid: Object.assign({}, sc.grid, { show: false }), fog: { dynamic: false, manual: false, explored: false, shared: true } }); u.Store.add('effects', z(4, true)); u.Store.add('effects', z(12, false)); });
      u.setSel([]); u.Render.fit(); u.Render.request();
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const cv = document.getElementById('cv'), dpr = cv.width / cv.getBoundingClientRect().width;
      const copia = document.createElement('canvas'); copia.width = cv.width; copia.height = cv.height;
      const g = copia.getContext('2d', { willReadFrequently: true }); g.drawImage(cv, 0, 0);
      const media = (x, y) => { const p = u.Render.toScreen(x * c, y * c), d = g.getImageData(Math.round(p[0] * dpr) - 10, Math.round(p[1] * dpr) - 10, 20, 20).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; } const n = d.length / 4; return [r / n, gg / n, b / n]; };
      return { leve: media(4, 4), cheia: media(12, 4), fundo: media(20, 4) };
    });
    ok(dist(zx.leve, zx.fundo) > 4 && dist(zx.leve, zx.fundo) < dist(zx.cheia, zx.fundo) * 0.6, 'a zona leve é um véu: aparece, bem mais fraca que a zona de sempre: ' + j(zx));
  }

  // ================= do Mapa-múndi para a janela =================
  if (parte('mapa')) {
    const antes = await ev(() => ({ hora: __tc.App.opt.genHora, clima: __tc.App.opt.genClima, estilo: __tc.App.opt.genEstilo }));
    await ev(() => __tc.Gerador.abrir('encontro', { op: { terreno: 'neve', situacao: 'cabana', caminho: 'trilha' }, estilo: 'nordico', hora: 'entardecer', clima: 'neve', nome: 'Cabana de Ulf', id: 'cena_mundo_teste1' })); await w(700);
    const g = await G(), comum = await ev(() => Object.assign({}, __tc.Gerador.vivo().comum));
    ok(g.op.terreno === 'neve' && g.op.situacao === 'cabana' && g.op.caminho === 'trilha' && comum.estilo === 'nordico' && comum.hora === 'entardecer' && comum.clima === 'neve', 'a janela abre como o mapa pediu: a neve, a cabana do caçador, a trilha, o estilo nórdico, o entardecer e a neve caindo');
    ok(await page.locator('#ger-nome').inputValue() === 'Cabana de Ulf', 'com o nome que o mapa mandou');
    await criar();
    const s = await ev(() => { const sc = __tc.Store.scene(); return { id: sc.id, nome: sc.name, tom: sc.tone, clima: sc.weather.k }; });
    ok(s.id === 'cena_mundo_teste1' && s.nome === 'Cabana de Ulf' && s.tom === 'entardecer' && s.clima === 'neve', 'a cena nasce com o id que o marcador do mapa já leva: ' + j(s));
    const depois = await ev(() => ({ hora: __tc.App.opt.genHora, clima: __tc.App.opt.genClima, estilo: __tc.App.opt.genEstilo }));
    ok(j(depois) === j(antes), 'a hora, o clima e o estilo que vieram do mapa não viram as escolhas da janela: ' + j([antes, depois]));
    // o mesmo id de novo (outra mesa, outro aparelho): não apaga a cena que já existe
    await ev(() => __tc.Gerador.abrir('encontro', { op: { terreno: 'neve' }, id: 'cena_mundo_teste1', nome: 'Outra' })); await w(600);
    await criar();
    const s2 = await ev(() => { const u = __tc, sc = u.Store.scene(); return { id: sc.id, velha: !!u.Store.S.scenes.cena_mundo_teste1 && u.Store.S.scenes.cena_mundo_teste1.name }; });
    ok(s2.id !== 'cena_mundo_teste1' && s2.velha === 'Cabana de Ulf', 'um id que já existe não apaga a cena dele: a nova ganha outro: ' + j(s2));
    // a vila: o terreno e o nome
    await ev(() => __tc.Gerador.abrir('vila', { op: { terreno: 'neve' }, nome: 'Vila do Gelo', hora: 'noite' })); await w(700);
    const gv = await G();
    ok(await ev(() => __tc.Gerador.vivo().lugar) === 'vila' && gv.op.terreno === 'neve' && await page.locator('#ger-nome').inputValue() === 'Vila do Gelo' && await ev(() => __tc.Gerador.vivo().comum.hora) === 'noite', 'para uma vila: a aba Vila, na neve, de noite, com o nome do marcador');
    await page.keyboard.press('Escape'); await w(300);
    ok(!(await ev(() => !!document.querySelector('.modal'))), '(Esc fecha sem criar)');
  }

  // ================= (lote 7, parte 5a) os eventos do Mapa-múndi na cena =================
  if (parte('eventos')) {
    const chave = async id => { await page.locator('.sw', { has: page.locator('#' + id) }).click(); await w(450); };
    const vivo = () => ev(() => { const v = __tc.Gerador.vivo(), el = document.getElementById('ger-eventos'), sw = el && el.closest('.sw'); return { tem: !!el, txt: sw ? sw.innerText.replace(/\s+/g, ' ').trim() : '', seco: !!v.estado.plano.seco, pal: v.estado.plano.pal, resumo: document.getElementById('ger-resumo').innerText, tracado: JSON.stringify(v.estado.plano.tracado) }; });
    await ev(() => __tc.Gerador.abrir('encontro', { op: { terreno: 'campo', situacao: 'morro', caminho: 'nenhum' }, hora: 'noite', clima: '', fx: ['luaSangue', 'naoExiste'], seco: true, eventos: ['Lua de sangue', 'Seca'] })); await w(700);
    await semente(11);
    const t0 = await vivo();
    ok(t0.tem && /^Com os eventos do Mapa-múndi \(Lua de sangue, Seca\): o chão seco e a zona Lua de sangue cobrindo a cena$/.test(t0.txt), 'a chave dos eventos do Mapa-múndi (ligada), com os nomes e o que levam: ' + t0.txt);
    ok(t0.seco && t0.pal === 'savana' && /o chão seco/.test(t0.resumo), 'a seca: o campo com o capim seco, e o resumo diz: ' + j([t0.pal, t0.resumo]));
    await chave('ger-eventos');
    const t1 = await vivo();
    ok(!t1.seco && t1.pal === 'campo' && !/o chão seco/.test(t1.resumo) && t1.tracado === t0.tracado, 'sem a chave: o chão verde de volta, e o mesmo lugar (o traçado igual)');
    await chave('ger-eventos');
    await criar();
    const s = await ev(() => { const sc = __tc.Store.scene(); return { tom: sc.tone, zonas: sc.effects.filter(e => e.fx === 'luaSangue').map(e => ({ leve: !!e.leve, gm: !!e.gm, cobre: e.r >= Math.hypot(sc.cols, sc.rows) / 2 && Math.abs(e.x - sc.cols * sc.cell / 2) < 1 && Math.abs(e.y - sc.rows * sc.cell / 2) < 1 })), outras: sc.effects.filter(e => e.fx !== 'luaSangue').length }; });
    ok(s.tom === 'noite' && s.zonas.length === 1 && s.zonas[0].leve && !s.zonas[0].gm && s.zonas[0].cobre && s.outras === 0, 'a cena: de noite, com a zona Lua de sangue cobrindo tudo (leve, à mostra); o efeito que não existe ficou de fora: ' + j(s));
    // sem a chave na hora de criar: nada de zona
    await ev(() => __tc.Gerador.abrir('encontro', { op: { terreno: 'campo' }, fx: ['espiritos'], eventos: ['Assombração'] })); await w(700);
    ok((await vivo()).txt === 'Com os eventos do Mapa-múndi (Assombração): a zona Névoa de espíritos cobrindo a cena', '(a assombração: a Névoa de espíritos)');
    await chave('ger-eventos');
    await criar();
    ok(await ev(() => __tc.Store.scene().effects.length === 0), 'com a chave desligada, a cena sai sem a zona');
    // sem eventos no pedido, nem a chave
    await ev(() => __tc.Gerador.abrir('encontro', { op: { terreno: 'campo' } })); await w(600);
    ok(!(await vivo()).tem, 'sem eventos no pedido, sem a chave');
    await page.keyboard.press('Escape'); await w(300);
    // cada aba com o que vale nela: o chão seco só no Encontro; na masmorra (lá embaixo), nada
    await ev(() => __tc.Gerador.abrir('vila', { seco: true, eventos: ['Seca'] })); await w(700);
    ok(!(await vivo()).tem, 'na vila, a seca sozinha não tem chave (a vila não seca o chão)');
    await page.keyboard.press('Escape'); await w(300);
    await ev(() => __tc.Gerador.abrir('vila', { fx: ['luaSangue'], seco: true, eventos: ['Lua de sangue', 'Seca'] })); await w(700);
    const v1 = await vivo();
    await page.locator('#ger-lugar button', { hasText: 'Masmorra' }).click(); await w(700);
    const v2 = await vivo();
    await page.locator('#ger-lugar button', { hasText: 'Encontro' }).click(); await w(700);
    const v3 = await vivo();
    ok(v1.txt === 'Com os eventos do Mapa-múndi (Lua de sangue, Seca): a zona Lua de sangue cobrindo a cena' && !v2.tem && /o chão seco e a zona Lua de sangue/.test(v3.txt) && (v3.seco || !['campo', 'floresta', 'selva', 'pantano'].includes(v3.pal)),
      'a chave muda com a aba: na vila só a zona, na masmorra nenhuma, no encontro o chão seco também — ' + j([v1.txt, v2.tem, v3.txt, v3.pal, v3.seco]));
    await page.locator('#ger-lugar button', { hasText: 'Masmorra' }).click(); await w(700);
    await criar();
    ok(await ev(() => __tc.Store.scene().effects.filter(e => e.fx === 'luaSangue').length === 0), 'a masmorra sai sem a zona dos eventos');
  }

  // ================= as regras dos planos =================
  if (parte('regras')) {
    const r = await ev(() => {
      const u = __tc, E = u.Encontro, out = { n: 0, erros: [], lentos: 0, maxMs: 0, ruins: [], det: 0, trava: 0, sitsSurpresa: {} };
      const fxOk = k => !!u.FX.P[k];
      const TER_OK = new Set(['morro', 'montanha', 'plataforma', 'fosso', 'agua', 'mata']);
      const tams = ['pequeno', 'medio', 'grande'], ests = ['comum', 'oriental', 'nordico', 'desertico', 'elfico', 'anao'];
      const pe = (p, q) => { const v = p.occ[q[1] * p.W + q[0]]; return v === 0 || v === 1 || v === 4 || v === 5 || v === 6 || v === 8 || v === 10 || (p.aguaRasa && v === 2); };
      const dentro = (p, x, y, m) => x >= -(m || 0) && y >= -(m || 0) && x <= p.W + (m || 0) && y <= p.H + (m || 0);
      let k = 0;
      for (const T of E.TERRENOS) for (const [sit] of T.sit) for (const seed of [3, 11, 2024]) {
        const cams = T.id === 'agua' ? ['nenhum'] : T.id === 'estrada' ? ['trilha', 'estrada'] : ['nenhum', 'trilha', 'estrada'];
        const cam = cams[(seed + k) % cams.length], tamanho = tams[(seed + k) % 3], estilo = ests[(seed + k) % 6]; k++;
        const o = { terreno: T.id, situacao: sit, caminho: cam, tamanho, estilo, seed };
        let p;
        const t0 = performance.now();
        try { p = E.gerar(o); } catch (e) { out.erros.push(T.id + '.' + sit + ' s' + seed + ': ' + e.message); continue; }
        const ms = performance.now() - t0; out.maxMs = Math.max(out.maxMs, ms); if (ms > 600) out.lentos++;
        out.n++;
        const nome = T.id + '.' + sit + ' s' + seed + ' ' + cam + ' ' + tamanho;
        const ruim = m => out.ruins.push(nome + ': ' + m);
        if (p.terreno !== T.id || p.sit !== sit || p.W !== E.TAMANHOS[tamanho].W || p.H !== E.TAMANHOS[tamanho].H) ruim('o plano não é o pedido');
        if (JSON.stringify(p, (kk, v) => (typeof v === 'number' && !Number.isFinite(v) ? 'NAN!' : v)).includes('NAN!')) ruim('número inválido');
        const m = p.marcas || {};
        for (const q of [m.chegada, m.emboscada]) { if (!q) { ruim('sem marcador'); continue; } if (!(q[0] >= 0 && q[1] >= 0 && q[0] < p.W && q[1] < p.H)) ruim('marcador fora: ' + q); else if (!pe(p, q)) ruim('marcador onde não se pisa: ' + p.occ[q[1] * p.W + q[0]]); }
        if (m.chegada && m.emboscada && Math.hypot(m.chegada[0] - m.emboscada[0], m.chegada[1] - m.emboscada[1]) < 4) ruim('a emboscada colada na chegada');
        // em terra, o grupo chega pela borda (na água, ele já está no barco)
        if (T.id !== 'agua' && m.chegada && Math.min(m.chegada[0], m.chegada[1], p.W - 1 - m.chegada[0], p.H - 1 - m.chegada[1]) > 5) ruim('a chegada longe da borda: ' + m.chegada);
        for (const v of p.visao) { if (!(v.length === 4 && dentro(p, v[0], v[1], 1) && dentro(p, v[2], v[3], 1) && Math.hypot(v[2] - v[0], v[3] - v[1]) > 0.05)) ruim('parede de visão estranha: ' + v); }
        // as paredes de visão só no que é grande: junto de um obstáculo (pedra grande, tronco, paredão, cristal), de um relevo baixo ou de um abismo — nunca de uma árvore
        for (const v of p.visao) { const mx = (v[0] + v[2]) / 2, my = (v[1] + v[3]) / 2; let junto = false; for (let b = -1; b <= 1 && !junto; b++) for (let a = -1; a <= 1 && !junto; a++) { const i = Math.floor(mx) + a, jj = Math.floor(my) + b; if (i >= 0 && jj >= 0 && i < p.W && jj < p.H) { const oc = p.occ[jj * p.W + i]; if (oc === 3 || oc === 6 || oc === 7) junto = true; } } if (!junto) { ruim('parede de visão longe do que é grande: ' + v.map(x => Math.round(x))); break; } }
        for (const ob of p.objetos) if (!(dentro(p, ob.x, ob.y) && u.Props.P[ob.id])) ruim('objeto estranho: ' + j(ob));
        for (const z of p.zonas) if (!fxOk(z.fx) || !dentro(p, z.x, z.y, 2)) ruim('zona estranha: ' + j(z));
        for (const rr of p.relevo) if (!TER_OK.has(rr.t) || (rr.a != null && !(rr.a > 0 && rr.a < 0.5))) ruim('relevo estranho: ' + j([rr.t, rr.a]));
        // o relevo em traço livre (o rio, a passarela) tem os pontos juntos: a tela arredonda entre eles, e de longe em longe ele cortaria os cantos
        for (const rr of p.relevo) if (rr.k === 'free') for (let i = 1; i < rr.pts.length; i++) if (Math.hypot(rr.pts[i][0] - rr.pts[i - 1][0], rr.pts[i][1] - rr.pts[i - 1][1]) > 3) { ruim('relevo em traço livre com os pontos longe: ' + rr.t); break; }
        for (const l of p.luzes) if (!(Number.isFinite(l.x) && Number.isFinite(l.y) && l.dim > 0)) ruim('luz estranha');
        for (const pr of p.predios) if (!(pr.aberto ? Array.isArray(pr.moveis) : pr.porta)) ruim('construção sem porta nem móveis');
        for (const nv of p.navios) if (!(nv.L >= 10 && nv.L <= 32 && nv.B >= 4 && nv.B <= 10 && nv.entrada && dentro(p, nv.entrada.x, nv.entrada.y))) ruim('navio estranho: ' + j([nv.L, nv.B]));
        if (!p.tracado.length) ruim('sem traçado para travar');
        // o mesmo pedido dá o mesmo plano
        if (seed === 3) { const p2 = E.gerar(o); if (j(p2) === j(p)) out.det++; else ruim('o mesmo pedido deu outro plano'); }
        // com o traçado travado, outra semente: o mesmo traçado (a água, o caminho, os penhascos, as construções, os navios)
        if (seed === 11) {
          const tr = E.travaDe(Object.assign({}, p, { travaTracado: true }));
          const p3 = E.gerar(Object.assign({}, o, { seed: 99991, trava: tr }));
          const tra = x => j([x.sit, x.caminhos, x.aguas, x.abismos, x.predios.map(q => [q.x, q.y, q.w, q.h]), x.navios.map(q => [q.x, q.y, q.L, q.B])]);
          if (tra(p3) === tra(p) && p3.travaTracado) out.trava++; else ruim('a trava não segurou o traçado');
          // a trava de outro tamanho (ou de outro caminho) não vale
          const outroTam = tamanho === 'grande' ? 'medio' : 'grande';
          if (E.gerar(Object.assign({}, o, { tamanho: outroTam, seed: 99991, trava: tr })).travaTracado) ruim('a trava de outro tamanho valeu');
          if (T.id !== 'agua' && E.gerar(Object.assign({}, o, { caminho: cam === 'trilha' ? 'estrada' : 'trilha', seed: 99991, trava: tr })).travaTracado) ruim('a trava de outro caminho valeu');
        }
      }
      // o porão do navio: a planta com a proa do outro lado é a mesma, espelhada (os móveis grandes também), e nada sai do casco
      out.porao = 0;
      for (const [w, h] of [[12, 5], [18, 6], [24, 8], [32, 10]]) for (const seed of [1, 2, 3]) {
        const a = u.Navio.planta({ w, h, p: 'l', seed }), b = u.Navio.planta({ w, h, p: 'o', seed }), ms = q => q.salas.flatMap(x => x.moveis), ma = ms(a), mb = ms(b);
        let bom = ma.length === mb.length && ma.length > 0;
        for (let i = 0; bom && i < ma.length; i++) if (mb[i].x !== a.W - ma[i].x - ma[i].s || mb[i].y !== ma[i].y || mb[i].id !== ma[i].id) bom = false;
        for (const m of ma.concat(mb)) if (m.x < 0 || m.y < 0 || m.x + m.s > a.W || m.y + m.s > a.H) bom = false;
        if (bom) out.porao++; else out.ruins.push('porão ' + w + '×' + h + ' s' + seed + ': o espelho tira um móvel do lugar');
      }
      // a Surpresa sorteia entre as situações do terreno
      for (const T of E.TERRENOS) { const s = new Set(); for (let seed = 1; seed <= 40; seed++) s.add(E.gerar({ terreno: T.id, situacao: 'surpresa', seed }).sit); out.sitsSurpresa[T.id] = s.size; }
      // sem os marcadores: nenhum
      out.semMarcas = j(E.gerar({ terreno: 'floresta', situacao: 'clareira', seed: 5, marcas: false }).marcas) === '{}';
      // o caminho que vale
      out.cam = [E.camValido('estrada', 'nenhum'), E.camValido('agua', 'estrada'), E.camValido('floresta', 'x'), E.camValido('neve', 'trilha')];
      function j(x) { return JSON.stringify(x); }
      return out;
    });
    ok(r.erros.length === 0, 'nenhum erro em ' + (r.n + r.erros.length) + ' encontros: ' + r.erros.slice(0, 5).join(' | '));
    ok(r.n === 180, 'os quinze terrenos, cada um com as quatro situações, em três sementes (180 planos): ' + r.n);
    ok(r.lentos === 0, 'cada plano sai depressa (o mais lento: ' + Math.round(r.maxMs) + ' ms)');
    ok(r.ruins.length === 0, 'as regras dos planos (marcadores onde se pisa e longe um do outro, paredes, objetos, zonas, relevo leve, luzes, construções, navios, traçado): ' + r.ruins.slice(0, 8).join(' | '));
    ok(r.det === 60, 'o mesmo pedido (com a mesma semente) dá sempre o mesmo plano: ' + r.det + ' de 60');
    ok(r.trava === 60, 'com o traçado travado, outra semente mantém a água, o caminho, os penhascos, as construções e os navios: ' + r.trava + ' de 60');
    ok(r.porao === 12, 'o porão do navio com a proa para o outro lado é o mesmo, espelhado (com os móveis grandes), sem nada fora: ' + r.porao + ' de 12');
    ok(Object.values(r.sitsSurpresa).every(v => v >= 3), 'a Surpresa sorteia entre as situações de cada terreno: ' + j(r.sitsSurpresa));
    ok(r.semMarcas, 'sem os marcadores, o plano sai sem nenhum');
    ok(j(r.cam) === j(['estrada', 'nenhum', 'nenhum', 'trilha']), 'o caminho que vale: a estrada nunca sem, a água sem caminho, um caminho desconhecido vira nenhum: ' + j(r.cam));
  }

  const errs = t.errs.filter(e => !/favicon/i.test(e));
  if (errs.length) console.log(errs.slice(0, 10).join('\n'));
  ok(errs.length === 0, 'sem erros no console');
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
