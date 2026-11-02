// Bateria do lote 28 nas Cenas (no navegador, sem o site):
//   · Imbuído de Mana: a janela (o custo, a barra que paga, o atributo de quando falta mana e, sem ficha, os dois
//     valores), o botão "Atacar com mana" no painel e na janelinha F — rola com a Canalização Mágica e gasta o custo
//     (com Desfazer); sem mana, rola com o atributo normal e avisa, sem gastar;
//   · os sons dos avisos, só no mestre: o sino no alto (um clique liga e desliga; segurar abre o volume, com "Ouvir"),
//     o aviso da zona (a combinação de zonas) tocando, o mesmo tipo não repetindo em menos de um segundo, e nada na
//     visão do jogador;
//   · as masmorras: os doze tipos (os oito novos) e a largura dos corredores (1, 2 ou 3 quadrados) — no plano, na
//     janela da Entrada (o padrão de cada tipo, a escolha guardada) e na Entrada do nível de baixo, que lembra a largura.
const { open } = require('./lib');
const path = require('path');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
(async () => {
  const t = await open({ w: 1360, h: 900 });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 160);
  const j = JSON.stringify;
  const foto = async (nome, clip) => { if (SHOTS) { require('fs').mkdirSync(SHOTS, { recursive: true }); await page.screenshot(Object.assign({ path: path.join(SHOTS, nome + '.png') }, clip ? { clip } : {})); } };
  const toasts = () => ev(() => [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ '));
  const limpaToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  await w(500);

  // ================= Imbuído de Mana =================
  const id = await ev(() => { const u = __tc, sc = u.Store.scene(), bar = (n, v, m) => u.cleanBar({ n, c: '#3f7fe0', v, m, k: 'bar', on: true, vis: '' });
    const k = u.newToken(sc, sc.cell * 6, sc.cell * 6, { name: 'Maga', bars: [bar('Vida', 20, 20), bar('Mana', 7, 10)] }); u.Store.tx('m', () => u.Store.add('tokens', k));
    u.setSel([{ c: 'tokens', id: k.id }]); u.UI.openTab('sel'); return k.id; });
  await w(300);
  const tok = () => ev(id => { const k = __tc.Store.get('tokens', id); return { conds: k.conds, ci: k.cinfo.imbuidoMana || null, mana: k.bars[1].v }; }, id);
  ok(await ev(() => !!__tc.COND_BY_ID.imbuidoMana && __tc.COND_BY_ID.imbuidoMana.g === 'mente' && !!__tc.ICONS.c_imbuidoMana), 'a condição Imbuído de Mana existe (no grupo Mente, com o ícone)');
  await page.fill('#cg-busca', 'imbu'); await w(200);
  await page.locator('#cg-list .chip', { hasText: 'Imbuído de Mana' }).click(); await w(300);
  const jan = await ev(() => ({ t: document.querySelector('.modal').innerText, barra: document.getElementById('mana-bar').value, custo: document.getElementById('mana-custo').value, can: !!document.getElementById('mana-can'), val: !!document.getElementById('mana-val'), atr: [...document.querySelectorAll('#mana-atr option')].map(o => o.value).join(',') }));
  ok(/Imbuído de Mana em Maga/.test(jan.t) && jan.barra === '1' && jan.custo === '1' && jan.can && jan.val && jan.atr === 'FOR,DES,AGI,VIT', 'a janela: a barra Mana já escolhida, o custo 1, o atributo de quando falta mana e (sem ficha) os dois valores — ' + j(jan));
  await page.fill('#mana-custo', '3'); await page.selectOption('#mana-atr', 'DES'); await page.fill('#mana-can', '30'); await page.fill('#mana-val', '18'); await w(150);
  const prev = await page.locator('#mana-previa').innerText();
  ok(/gasta 3 de Mana — agora 7 de 10: dá para 2 ataques/.test(prev) && /Sem mana, rola Destreza \(18\)/.test(prev), 'a prévia: 3 de Mana por ataque, dá para 2; sem mana, Destreza (18) — ' + prev);
  await foto('l28-mana-janela');
  await page.locator('.modal .btn.primary', { hasText: 'Pôr Imbuído de Mana' }).click(); await w(300);
  let s = await tok();
  ok(s.conds.includes('imbuidoMana') && j(s.ci) === j({ custo: 3, barra: 'Mana', atr: 'DES', can: 30, val: 18 }), 'a condição fica no token com o custo, a barra, o atributo e os valores: ' + j(s.ci));
  ok(/3 de Mana/.test(await page.locator('#cd-imbuidoMana-n').innerText()), 'a linha da condição mostra "3 de Mana" (com Mudar…)');
  ok(await page.locator('#tk-mana').isVisible() && /Atacar com mana/.test(await page.locator('#tk-mana').innerText()), 'o botão "Atacar com mana" aparece no painel do token');
  await foto('l28-mana-painel');
  await limpaToasts();
  await page.locator('#tk-mana').click(); await w(250);
  s = await tok(); let tt = await toasts();
  const tot = Number((/atacou com mana: (\d+)/.exec(tt) || [])[1]);
  ok(s.mana === 4 && tot >= 1 && tot <= 30 && /Canalização Mágica/.test(tt) && /Gastou 3 de Mana: fica 4/.test(tt), 'atacar com mana: rola a Canalização Mágica (1 a 30) e a Mana vai de 7 a 4 — ' + tt);
  await page.locator('#tk-mana').click(); await w(250);
  s = await tok();
  ok(s.mana === 1, 'de novo: a Mana vai a 1');
  await limpaToasts();
  await page.locator('#tk-mana').click(); await w(250);
  s = await tok(); tt = await toasts();
  ok(s.mana === 1 && /Sem mana: Mana está em 1 e o ataque custa 3\. Maga rolou com Destreza: \d+/.test(tt), 'sem mana: não gasta nada, rola com Destreza e avisa — ' + tt);
  ok(/sem mana/.test(await page.locator('#tk-mana').innerText()), 'o botão mostra "sem mana"');
  await ev(() => __tc.Tools.undo()); await w(200);
  ok((await tok()).mana === 4, 'o Desfazer devolve a mana do último ataque que gastou (1 → 4)');
  // a janelinha F
  await ev(id => __tc.Luta.atributos(__tc.Store.get('tokens', id)), id); await w(250);
  ok(await page.locator('#fp-mana').isVisible(), 'a janelinha F tem o "Atacar com mana"');
  await page.locator('#fp-mana').click(); await w(250);
  ok((await tok()).mana === 1 && /Ataque com mana/.test(await page.locator('#fp-res').innerText()), 'pela janelinha F: gasta a mana e mostra o resultado ali mesmo');
  await foto('l28-mana-f');
  await ev(() => __tc.Luta.fechar()); await w(100);
  // tirar a condição: o botão some
  await page.fill('#cg-busca', 'imbu'); await w(200);
  await page.locator('#cg-list .chip', { hasText: 'Imbuído de Mana' }).click(); await w(300);
  ok(!(await tok()).conds.includes('imbuidoMana') && await page.locator('#tk-mana').count() === 0, 'tirar a condição: o botão some');
  await page.fill('#cg-busca', ''); await w(100);

  // ================= os sons dos avisos =================
  await limpaToasts();
  ok(await page.locator('#somAvBtn').isVisible() && await ev(() => __tc.Som.avisosLigados() && __tc.Som.volumeAvisos() === 70), 'o sino no alto das Cenas, ligado, no volume 70');
  await page.locator('#somAvBtn').click(); await w(200);
  ok(await ev(() => localStorage.getItem('tinycats:som-avisos') === '0' && !__tc.Som.avisosLigados()) && /Sons dos avisos desligados/.test(await toasts()), 'um clique desliga (só neste aparelho)');
  const v0 = await ev(() => __tc.Som.vezesAviso);
  await ev(() => __tc.UI.somAviso('urgente'));
  ok(await ev(() => __tc.Som.vezesAviso) === v0, 'desligado, o aviso não toca');
  await page.locator('#somAvBtn').click(); await w(200);
  ok(await ev(() => __tc.Som.avisosLigados()), 'outro clique liga de novo');
  // segurar: o volume
  { const b = await page.locator('#somAvBtn').boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await w(650); await page.mouse.up(); await w(200); }
  ok(await page.locator('#somv').isVisible() && await ev(() => __tc.Som.avisosLigados()), 'segurar abre o volume (e não desliga)');
  await ev(() => { const r = document.getElementById('somv-vol'); r.value = '30'; r.dispatchEvent(new Event('input', { bubbles: true })); }); await w(100);
  ok(await ev(() => __tc.Som.volumeAvisos() === 30 && document.getElementById('somv-n').textContent === '30%'), 'o volume muda (30%) e fica guardado');
  await foto('l28-som-volume');
  await page.locator('#somv-urgente').click(); await w(100);
  ok(await ev(() => __tc.Som.ultimoAviso === 'urgente'), '"Ouvir" toca o som do tipo');
  await page.mouse.click(700, 500); await w(200);
  ok(await page.locator('#somv').count() === 0, 'um clique fora fecha o volume');
  // a combinação de zonas toca o som de zona (no mestre)
  const add = o => ev(o => { const u = __tc; u.Store.tx('prep', () => u.Store.add('effects', Object.assign({ k: 'circ', r: 1.5, w: 1, rw: 3, rh: 2, ang: 60, dir: 0, pow: 0.8, token: null, gm: false, by: null, seed: 5, dur: 0, dur0: 0, at: null, apply: null }, o))); }, o);
  await w(1100);
  const z0 = await ev(() => __tc.Som.vezesAviso);
  await add({ id: 'z_oleo', fx: 'oleo', x: 5.5 * 64, y: 12.5 * 64, r: 1.5 });
  await add({ id: 'z_fogo', fx: 'fogo', x: 7.5 * 64, y: 12.5 * 64, r: 1 }); await w(200);
  ok(await page.locator('#combos').isVisible() && await ev(() => __tc.Som.ultimoAviso) === 'zona' && await ev(() => __tc.Som.vezesAviso) === z0 + 1, 'o cartão "Fogo no óleo" toca o som de zona no mestre');
  await ev(() => __tc.UI.somAviso('zona'));
  ok(await ev(() => __tc.Som.vezesAviso) === z0 + 1, 'o mesmo tipo, em menos de um segundo, não toca de novo');
  await ev(() => { const u = __tc; u.Store.tx('x', () => { u.Store.del('effects', 'z_oleo'); u.Store.del('effects', 'z_fogo'); }); }); await w(1100);
  await ev(() => __tc.UI.setViewer(__tc.Store.S.players[0].id)); await w(200);
  const z1 = await ev(() => __tc.Som.vezesAviso);
  await ev(() => __tc.UI.somAviso('condicao'));
  ok(await ev(() => __tc.Som.vezesAviso) === z1 && await page.locator('#somAvBtn').count() === 0, 'na visão do jogador: nem o sino, nem o som');
  await ev(() => __tc.UI.setViewer('gm')); await w(200);

  // ================= as masmorras =================
  const pl = await ev(() => {
    const M = __tc.Masmorra, out = { tipos: M.TIPOS.map(x => x[0]), ruins: [] };
    const corr = p => [...p.grade].filter(x => x === '2').length;
    for (const tipo of ['templo', 'esgoto', 'torre', 'laboratorio', 'fortaleza', 'ruinas', 'covil', 'navio']) for (const tamanho of ['pequeno', 'medio', 'grande']) for (let s = 1; s <= 4; s++) {
      const p = M.gerar({ tipo, tamanho, seed: s * 7717, larg: 1 + (s % 3) });
      if (!p.sobe || !p.desce || p.salas.length < 3) out.ruins.push(tipo + '/' + tamanho + '/' + s + ': ' + (!p.sobe ? 'sem subida' : !p.desce ? 'sem descida' : 'poucas salas'));
      if (JSON.stringify(M.gerar({ tipo, tamanho, seed: s * 7717, larg: 1 + (s % 3) })) !== JSON.stringify(p)) out.ruins.push(tipo + '/' + tamanho + '/' + s + ': o mesmo sorteio deu outro nível');
    }
    const a = M.gerar({ tipo: 'pedra', tamanho: 'medio', seed: 99, larg: 1 }), b = M.gerar({ tipo: 'pedra', tamanho: 'medio', seed: 99, larg: 3 });
    out.c1 = corr(a); out.c3 = corr(b);
    // (uma casa de corredor com três de largura: a linha ou a coluna de três casas de corredor)
    const W = b.W, g = b.grade, at = (i, jj) => g[jj * W + i];
    out.tres = false;
    for (let jj = 1; jj < b.H - 3 && !out.tres; jj++) for (let i = 1; i < W - 3 && !out.tres; i++) if (at(i, jj) === '2' && at(i + 1, jj) === '2' && at(i + 2, jj) === '2' && at(i, jj + 1) === '2' && at(i, jj + 2) === '2') out.tres = true;
    out.resumo = M.resumo(b);
    out.navio = M.resumo(M.gerar({ tipo: 'navio', tamanho: 'medio', seed: 5, larg: 2 }));
    out.semLarg = M.gerar({ tipo: 'caverna', tamanho: 'medio', seed: 7 }).larg;
    const sc = __tc.newScene('x'); sc.tokens.push(Object.assign(__tc.Props.novo(sc, 'entrada', 0, 0, 1, true), { gera: { t: 'masmorra', m: 'navio', n: 2, tam: 'grande', e: 'comum', s: 9, lc: 3 } }));
    __tc.normalizeScene(sc); out.norm = sc.tokens[0].gera;
    return out;
  });
  ok(j(pl.tipos) === j(['pedra', 'caverna', 'cripta', 'mina', 'templo', 'esgoto', 'torre', 'laboratorio', 'fortaleza', 'ruinas', 'covil', 'navio', 'gelo', 'vulcanica', 'colmeia', 'tumba']), 'os doze tipos de masmorra (e os quatro do lote 61)');
  ok(!pl.ruins.length, 'os oito novos, nos três tamanhos e nas três larguras: sempre com a subida, a descida e as salas; o mesmo sorteio dá o mesmo nível — ' + pl.ruins.slice(0, 4).join('; '));
  ok(pl.c3 > pl.c1 * 1.8 && pl.tres && /corredores de 3 quadrados/.test(pl.resumo), 'a largura 3: os corredores com três casas de largura (' + pl.c1 + ' → ' + pl.c3 + ' casas), e o resumo diz — ' + pl.resumo);
  ok(/^Navio naufragado · nível 1 · 46 × 34 quadrados · \d+ compartimentos/.test(pl.navio), 'o navio: os compartimentos no resumo — ' + pl.navio);
  ok(pl.semLarg === null, 'sem escolher a largura, o plano fica como antes (a caverna com os túneis de sempre)');
  ok(pl.norm.m === 'navio' && pl.norm.lc === 3, 'a Entrada guarda o tipo novo e a largura: ' + j(pl.norm));
  // a janela da Entrada
  const ent = await ev(() => { const u = __tc, sc = u.Store.scene(), tk = u.Props.novo(sc, 'entrada', 4 * sc.cell, 4 * sc.cell, 1, true); u.Store.tx('Pôr a entrada', () => u.Store.add('tokens', tk)); delete u.App.opt.masLarg; u.App.opt.masTipo = 'pedra'; u.Masmorra.abrir(u.Store.get('tokens', tk.id)); return tk.id; });
  await w(700);
  const larg = () => ev(() => ({ bt: [...document.querySelectorAll('#mas-larg button')].map(b => b.textContent.trim()), on: (document.querySelector('#mas-larg .seg-b.on') || {}).textContent, plano: __tc.Masmorra.vivo().plano.larg, tipo: __tc.Masmorra.vivo().plano.tipo, resumo: document.getElementById('mas-resumo').innerText }));
  let L = await larg();
  ok(j(L.bt) === j(['1 quadrado', '2 quadrados', '3 quadrados']) && L.on === '1 quadrado' && L.plano === 1, 'a janela: "Largura dos corredores", 1, 2 ou 3 quadrados; a masmorra de pedra começa em 1 — ' + j(L));
  const exato = async (grupo, txt) => { await page.locator(`#${grupo} button`).filter({ hasText: new RegExp('^' + txt + '$') }).click(); await w(450); };
  await exato('mas-tipo', 'Caverna');
  L = await larg();
  ok(L.on === '2 quadrados' && L.plano === 2, 'a caverna começa em 2 (os túneis de sempre): ' + j(L));
  await exato('mas-tipo', 'Navio naufragado'); await exato('mas-larg', '3 quadrados');
  L = await larg();
  ok(L.on === '3 quadrados' && L.plano === 3 && L.tipo === 'navio' && /compartimentos/.test(L.resumo) && /corredores de 3 quadrados/.test(L.resumo) && await ev(() => __tc.App.opt.masLarg === 3 && __tc.App.opt.masTipo === 'navio'), 'o navio com 3: a prévia e o resumo acompanham, e a escolha fica guardada — ' + L.resumo);
  await foto('l28-janela-navio');
  // as prévias dos oito novos
  if (SHOTS) for (const [k, nome] of [['templo', 'Templo'], ['esgoto', 'Esgoto'], ['torre', 'Torre de mago'], ['laboratorio', 'Laboratório'], ['fortaleza', 'Fortaleza anã'], ['ruinas', 'Ruínas élficas'], ['covil', 'Covil'], ['navio', 'Navio naufragado']]) {
    await exato('mas-tipo', nome);
    const box = await page.locator('#mas-prev').boundingBox();
    await foto('l28-prev-' + k, box);
  }
  await exato('mas-tipo', 'Navio naufragado');
  await page.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click();
  await page.waitForFunction(() => !document.querySelector('.modal'), null, { timeout: 40000 }); await w(500);
  const cena = await ev(() => { const sc = __tc.Store.scene(); return { nome: sc.name, desce: sc.tokens.filter(x => x.prop === 'entrada').map(x => x.gera) }; });
  ok(cena.nome === 'Navio naufragado — nível 1' && cena.desce.length === 1 && cena.desce[0].m === 'navio' && cena.desce[0].lc === 3, 'a cena do navio, e a Entrada do nível de baixo lembra o tipo e a largura: ' + j(cena));
  await foto('l28-cena-navio');
  void ent;

  if (t.errs.length) console.log(t.errs.slice(0, 5).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
