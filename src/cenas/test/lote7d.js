// Bateria do lote 7 (parte 4a-2), no navegador, sem o site:
//   · a aba Cidade da janela "Gerar um lugar": as escolhas, travar um prédio e o traçado clicando na prévia, "Gerar
//     outro" (o travado fica), "Soltar tudo", o tamanho que solta a trava, o modelo de cidade, e a cena completa (as
//     paredes de cada prédio, o marcador de Entrada oculto na porta, os postes; à noite, os lampiões e as tochas);
//   · o mapa de bairros: a cena vista de longe, um marcador por bairro, os dois cliques, "Gerar este bairro…" e a cena
//     do bairro (dentro do mapa, com a Saída de volta e o marcador ligado; o que passa da borda é cortado);
//   · o interior: "Gerar o interior…" pelo marcador de um prédio (o tipo e o estilo já escolhidos), "Gerar outro",
//     trocar o tipo, a cena de dentro (as portas de dentro fechadas, as janelas, os móveis, a Saída, à noite uma luz
//     por sala); e por uma Entrada posta à mão (aí com o tamanho);
//   · as regras dos planos (a cidade e o interior) em muitos sorteios, com partes travadas.
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
  const toasts = () => ev(() => Array.from(document.querySelectorAll('.toast')).map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const clearToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const foto = async (nome, clip) => { if (SHOTS) { require('fs').mkdirSync(SHOTS, { recursive: true }); await page.screenshot(Object.assign({ path: path.join(SHOTS, nome + '.png') }, clip ? { clip } : {})); } };
  const SO = (process.env.SO || '').split(',').filter(Boolean), parte = k => !SO.length || SO.includes(k);
  const G = () => ev(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().estado)));
  const assinatura = id => ev(id => {
    const c = document.getElementById(id), k = document.createElement('canvas'); k.width = c.width; k.height = c.height;
    const g = k.getContext('2d', { willReadFrequently: true }); g.drawImage(c, 0, 0);
    const d = g.getImageData(0, 0, k.width, k.height).data; let s = 0; for (let i = 0; i < d.length; i += 300) s = (s * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) % 1000000007; return s;
  }, id);
  // um ponto do plano (em quadrados) na tela, sobre a prévia
  const naPrevia = (x, y) => ev(([x, y]) => { const c = document.getElementById('ger-prev'), r = c.getBoundingClientRect(), cell = __tc.Gerador.vivo().cell(), k = Math.min(r.width / c.width, r.height / c.height), ox = (r.width - c.width * k) / 2, oy = (r.height - c.height * k) / 2; return [r.left + ox + x * cell * k, r.top + oy + y * cell * k]; }, [x, y]);
  const abrirGerador = async () => { await page.locator('#sceneBtn').click(); await w(200); await page.locator('.menu-i', { hasText: 'Gerar um lugar' }).click(); await w(700); };
  const criar = async () => { await page.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click(); await page.waitForFunction(() => !document.querySelector('.modal'), null, { timeout: 40000 }); await w(400); };
  // dois cliques num token (pelo meio dele)
  const doisCliques = async id => {
    const pt = await ev(id => { const u = __tc, sc = u.Store.scene(), tk = u.Store.get('tokens', id), x = tk.x + sc.cell * tk.size / 2, y = tk.y + sc.cell * tk.size / 2; u.Render.centerOn(x, y); return u.Render.toScreen(x, y); }, id);
    await w(120);
    const box = await page.locator('#cv').boundingBox();
    const p2 = await ev(id => { const u = __tc, sc = u.Store.scene(), tk = u.Store.get('tokens', id); return u.Render.toScreen(tk.x + sc.cell * tk.size / 2, tk.y + sc.cell * tk.size / 2); }, id);
    await page.mouse.dblclick(box.x + p2[0], box.y + p2[1]); await w(250);
    void pt;
  };
  const menuTxt = async () => (await page.locator('.menu').innerText()).replace(/\n/g, ' | ');
  let cidadeId = null, mapaId = null, bairroId = null;

  // ================= a aba Cidade =================
  if (parte('cidade') || parte('bairros') || parte('interior')) {
    await abrirGerador();
    await page.locator('#ger-lugar button', { hasText: 'Cidade' }).click(); await w(700);
    const g0 = await G();
    ok(await ev(() => __tc.Gerador.vivo().lugar) === 'cidade' && g0.plano.lugar === 'cidade' && g0.plano.W === 80 && g0.plano.H === 56 && g0.plano.modo === 'completa', 'a aba Cidade: a cidade média, em cena completa, de 80 × 56 quadrados');
    const ctl = (await page.locator('.ger-op').innerText()).replace(/\n+/g, ' | ');
    // (lote 14, parte 14c: os arredores logo depois do tamanho e do terreno)
    ok(/Como \| Cena completa \| Mapa de bairros \| Tamanho \| Pequena \| Média \| Grande \| Terreno \| Campo \| Floresta \| Deserto \| Neve \| Arredores \| Nenhum \| Pouco \| Médio \| Muito \| Prédios \| 42 \| Com rio \(e pontes\) \| Com muralha \(portões abertos\)/.test(ctl), 'as escolhas da cidade: como, tamanho, terreno, os arredores, quantos prédios, rio e muralha — ' + ctl.slice(0, 240));
    ok(/^\d+ prédios( \(couberam \d+ dos 42\))? · 80 × 56 quadrados · muralha com [34] portões · rio com \d+ pontes?\.$/.test(await page.locator('#ger-resumo').innerText()), 'o resumo: prédios, medidas, a muralha e os portões, o rio e as pontes — ' + await page.locator('#ger-resumo').innerText());
    ok(/um prédio, ou as ruas e a praça — o traçado/.test(await page.locator('#ger-dica').innerText()) && /marcador de Entrada \(só seu\) na porta de cada um/.test(await page.locator('.modal').innerText()), 'a dica e a nota são as da cidade');
    ok(await page.locator('#ger-nome').inputValue() === 'Cidade', 'o nome da cena: "Cidade" (sem nome inventado)');
    await foto('01-aba-cidade');
    if (parte('cidade')) {
      // travar um prédio comum (pelo meio dele) e o traçado (pela praça)
      const k = g0.plano.predios.findIndex(q => !['templo', 'senhor', 'quartel'].includes(q.tipo) && q.w >= 4 && q.h >= 4);
      const kk = g0.plano.predios[k];
      let [px, py] = await naPrevia(kk.x + kk.w / 2, kk.y + kk.h / 2);
      await page.mouse.move(px, py); await w(80);
      ok(new RegExp('^Clique para travar (a casa|a loja|a taverna|a ferraria|o armazém)\\.$').test(await page.locator('#ger-dica').innerText()), 'o mouse sobre um prédio: a dica diz que o clique trava — ' + await page.locator('#ger-dica').innerText());
      await page.mouse.click(px, py); await w(200);
      [px, py] = await naPrevia(g0.plano.praca.x, g0.plano.praca.y);
      await page.mouse.move(px, py); await w(80);
      ok(await page.locator('#ger-dica').innerText() === 'Clique para travar o traçado (as ruas, a praça, o rio e os prédios grandes).', 'o mouse sobre a praça: o traçado');
      await page.mouse.click(px, py); await w(200);
      const g1 = await G();
      ok(g1.trava.ruas === g1.plano.sRuas && g1.trava.predios.length === 1 && /2 partes travadas\./.test(await page.locator('#ger-resumo').innerText()) && !(await page.locator('#ger-soltar').isDisabled()), 'travados: o prédio e o traçado (o resumo conta 2)');
      await foto('02-cidade-travada', await page.locator('#ger-prev').boundingBox());
      await page.locator('#ger-outro').click(); await w(500);
      const g2 = await G(), grandes = p => j(p.predios.filter(q => ['templo', 'senhor', 'quartel'].includes(q.tipo)).map(q => [q.tipo, q.x, q.y, q.w, q.h, q.porta]));
      const igual = g2.plano.predios.find(q => q.trava && q.x === kk.x && q.y === kk.y && q.w === kk.w && q.h === kk.h);
      ok(g2.seed !== g1.seed && j(g2.plano.ruas) === j(g1.plano.ruas) && j(g2.plano.praca) === j(g1.plano.praca) && grandes(g2.plano) === grandes(g1.plano) && j(g2.plano.patios) === j(g1.plano.patios),
        'Gerar outro (outra semente): o traçado travado fica igual — as ruas, a praça, os pátios e os prédios grandes');
      ok(!!igual && igual.tipo === kk.tipo && j(igual.porta) === j(kk.porta) && j(g2.plano.predios.filter(q => !q.trava).map(q => [q.x, q.y])) !== j(g1.plano.predios.filter(q => !q.trava).map(q => [q.x, q.y])), 'o prédio travado fica igual (o tipo, o lugar e a porta); os outros prédios mudam');
      await page.locator('#ger-soltar').click(); await w(200);
      ok((await G()).trava === null && await page.locator('#ger-soltar').isDisabled() && !/travad/.test(await page.locator('#ger-resumo').innerText()), 'Soltar tudo solta o prédio e o traçado');
      // o tamanho solta a trava; o número de prédios sobe e desce
      await page.mouse.click(px, py); await w(150);
      await page.locator('#cid-tam button', { hasText: 'Pequena' }).click(); await w(500);
      const g3 = await G();
      ok(g3.plano.W === 64 && g3.plano.H === 46 && g3.trava === null && g3.op.predios === 26 && await page.locator('#cid-pred-n').innerText() === '26', 'a cidade pequena (64 × 46, 26 prédios pedidos): trocar o tamanho solta o que estava travado');
      await page.locator('#cid-pred-plus').click(); await w(400);
      ok((await G()).plano.pedidos === 27, '+ um prédio pedido');
      await page.locator('.sw', { has: page.locator('#cid-rio') }).click(); await w(400);
      await page.locator('.sw', { has: page.locator('#cid-muro') }).click(); await w(400);
      const g4 = await G();
      ok(!g4.plano.rio && !g4.plano.ring && g4.plano.portoes.length === 0 && /^\d+ prédios( \(couberam \d+ dos 27\))? · 64 × 46 quadrados\.$/.test(await page.locator('#ger-resumo').innerText()), 'sem rio e sem muralha: o resumo não fala deles — ' + await page.locator('#ger-resumo').innerText());
      await page.locator('.sw', { has: page.locator('#cid-rio') }).click(); await w(300); await page.locator('.sw', { has: page.locator('#cid-muro') }).click(); await w(300);
      // o estilo muda o desenho e o nome
      const s0 = await assinatura('ger-prev');
      await page.locator('#ger-est button', { hasText: 'Nórdico' }).click(); await w(500);
      ok(await assinatura('ger-prev') !== s0 && await page.locator('#ger-nome').inputValue() === 'Cidade nórdica' && (await G()).plano.estilo === 'nordico', 'o estilo nórdico: outro desenho e o nome "Cidade nórdica"');
      // o modelo de cidade
      await page.locator('#ger-guardar').click(); await w(150);
      await page.locator('#ger-modelo-nome').fill('Cidade do norte'); await page.keyboard.press('Enter'); await w(250);
      const sem = (await G()).seed;
      ok(await ev(() => __tc.Store.S.prefs.modelos.some(m => m.nome === 'Cidade do norte' && m.lugar === 'cidade' && m.o.tamanho === 'pequena' && m.o.estilo === 'nordico')) && (await page.locator('#ger-modelo option').allTextContents()).includes('Cidade do norte · Cidade'), 'guardar como modelo: o modelo é da Cidade (a lista diz de que lugar ele é)');
      await page.locator('#ger-lugar button', { hasText: 'Vilarejo' }).click(); await w(400);
      await page.locator('#ger-modelo').selectOption({ label: 'Cidade do norte · Cidade' }); await w(600);
      const g5 = await G();
      ok(await ev(() => __tc.Gerador.vivo().lugar) === 'cidade' && g5.seed === sem && g5.op.tamanho === 'pequena' && await page.locator('#ger-est .seg-b.on').innerText() === 'Nórdico', 'abrir o modelo (estando no Vilarejo) volta para a aba Cidade, com a semente, o tamanho e o estilo dele');
      await page.locator('#cid-tam button', { hasText: 'Média' }).click(); await w(400);
      await page.locator('#ger-est button', { hasText: 'Oriental' }).click(); await w(400);
      await page.locator('#ger-hora button', { hasText: 'Noite' }).click(); await w(150);
      await page.locator('#ger-nome').fill('Cidade de teste');
      const plano = (await G()).plano;
      await clearToasts();
      await criar();
      const sc = await ev(() => { const s = __tc.Store.scene(); return JSON.parse(JSON.stringify({ id: s.id, nome: s.name, cols: s.cols, rows: s.rows, tone: s.tone, fog: s.fog.dynamic, luzes: s.lights.length, walls: s.walls, tokens: s.tokens.map(t => ({ prop: t.prop, hidden: t.hidden, gera: t.gera, x: t.x, y: t.y, size: t.size })), gerado: s.gerado, textos: s.shapes.filter(x => x.k === 'text').length, shapes: s.shapes })); });
      cidadeId = sc.id;
      const ent = sc.tokens.filter(x => x.prop === 'entrada');
      ok(sc.nome === 'Cidade de teste' && sc.cols === 80 && sc.rows === 56 && sc.tone === 'noite' && sc.fog && !sc.gerado && sc.textos === 0, 'a cena completa: 80 × 56, de noite, com a visão pelas paredes; nada escrito e sem os dados do mapa de bairros');
      ok(ent.length === plano.predios.length && ent.every(x => x.hidden && x.gera && x.gera.t && x.gera.e === 'oriental' && x.size === 0.75), 'um marcador de Entrada (oculto, só do mestre) na porta de cada prédio, sabendo o tipo, as medidas e o estilo: ' + ent.length);
      const confere = plano.predios.every(k => ent.some(x => x.gera.t === k.tipo && x.gera.w === k.w && x.gera.h === k.h && x.gera.p === k.porta.lado));
      ok(confere, 'cada marcador sabe o tipo, as medidas e o lado da porta do seu prédio');
      const fechadas = sc.walls.filter(x => x.k === 'wall').length, abertas = sc.walls.filter(x => x.k === 'door' && x.open).length;
      ok(fechadas >= plano.predios.length * 4 && abertas === plano.portoes.length + plano.patios.length && sc.walls.filter(x => x.k === 'door' && !x.open).length === 0, 'as paredes: cada prédio fechado (entra-se pelo marcador); abertos só os portões da muralha e dos pátios: ' + j({ fechadas, abertas }));
      ok(sc.luzes === 0 && sc.tokens.filter(x => x.prop === 'tocha').length === plano.portoes.length * 2 && sc.tokens.filter(x => x.prop === 'lanterna').length >= 4 + plano.predios.filter(k => ['taverna', 'templo', 'senhor', 'quartel'].includes(k.tipo)).length - 2,
        'de noite: as tochas dos portões e as lanternas (das ruas, da praça e na porta da taverna, do templo, da casa do senhor e do quartel), sem marcas de luz espalhadas');
      ok(/"Cidade de teste" criada: \d+ prédios, cada um com o marcador de Entrada na porta \(dois cliques geram o interior\)\./.test(await toasts()), 'o aviso diz o que foi feito');
      // o relevo (as áreas de terreno, com a altura) e as formas de enfeite (travadas)
      const ter = sc.shapes.filter(x => x.ter), fm = sc.shapes.filter(x => !x.ter), conta = (t, h) => ter.filter(x => x.ter.t === t && x.ter.h === h).length;
      const torres = plano.ring.length + plano.portoes.length * 2;
      ok(conta('plataforma', 9) === torres && conta('plataforma', 6) >= 8 + (plano.patios.some(q => q.torre) ? 1 : 0) && conta('agua', -2) === (plano.rio ? 1 : 0) + 1 && conta('plataforma', 0.5) >= plano.portoes.length,
        'o relevo da muralha: o adarve a 6 m, as torres a 9 m, o fosso com água (oriental) e as pontes dos portões; o rio com 2 m de fundura — ' + j({ torres: conta('plataforma', 9), adarve: conta('plataforma', 6), agua: conta('agua', -2), pontes: conta('plataforma', 0.5) }));
      ok(conta('agua', -0.5) === 1 && conta('plataforma', 1.5) === (plano.largo ? 1 : 0) && conta('plataforma', 2) === plano.pontes.length && conta('agua', -1) === plano.patios.filter(q => q.lago).length,
        'a fonte da praça, o palco do mercado, as pontes de madeira (2 m acima da água) e o laguinho do jardim');
      ok(fm.length > 20 && fm.every(x => x.lock === true && !x.gm && x.top === false) && fm.filter(x => x.k === 'poly').length >= 20 && fm.filter(x => x.k === 'free').length >= 2 && fm.filter(x => x.k === 'ell').length === plano.patios.reduce((n2, q) => n2 + (q.alvos || []).length * 3, 0),
        'as formas: as bandeirinhas (os cordões e os triângulos) e os alvos de tiro, travadas (arte de fundo: o clique passa direto) — ' + fm.length);
      await foto('03-cidade-noite');
      // reabrir: volta na aba Cidade (lembrado)
      await abrirGerador();
      ok(await ev(() => __tc.Gerador.vivo().lugar) === 'cidade' && await page.locator('#cid-tam .seg-b.on').innerText() === 'Média', 'a janela reabre na aba Cidade, com as escolhas de antes');
      // sem relevo e formas: a prévia muda e a cena sai plana
      await page.locator('#cid-tam button', { hasText: 'Pequena' }).click(); await w(400);
      const comRelevo = await assinatura('ger-prev');
      await page.locator('.sw', { has: page.locator('#ger-relevo') }).click(); await w(500);
      ok(await assinatura('ger-prev') !== comRelevo && !(await page.locator('#ger-relevo').isChecked()), 'desligar "Com relevo e formas": a prévia mostra o lugar sem eles');
      await page.locator('#ger-nome').fill('Cidade plana');
      await criar();
      const plana = await ev(() => { const s = __tc.Store.scene(); return { nome: s.name, shapes: s.shapes.length, ent: s.tokens.filter(t => t.prop === 'entrada').length }; });
      ok(plana.nome === 'Cidade plana' && plana.shapes === 0 && plana.ent > 10, 'a cidade sai sem áreas de terreno e sem formas (o resto igual) — ' + j(plana));
      await abrirGerador();
      ok(!(await page.locator('#ger-relevo').isChecked()), 'a chave fica como foi deixada (lembrada neste aparelho)');
      // o vilarejo, sem relevo: também plano
      await page.locator('#ger-lugar button', { hasText: 'Vilarejo' }).click(); await w(500);
      await page.locator('#ger-nome').fill('Aldeia plana');
      await criar();
      const aldeia = await ev(() => { const s = __tc.Store.scene(); return { nome: s.name, shapes: s.shapes.length, casas: s.walls.filter(x => x.k === 'door').length }; });
      ok(aldeia.nome === 'Aldeia plana' && aldeia.shapes === 0 && aldeia.casas > 2, 'o vilarejo também sai plano com a chave desligada');
      await abrirGerador();
      await page.locator('#ger-lugar button', { hasText: 'Cidade' }).click(); await w(500);
      await page.locator('.sw', { has: page.locator('#ger-relevo') }).click(); await w(400);
      await page.keyboard.press('Escape'); await w(200);
    } else await page.keyboard.press('Escape');
  }

  // ================= o mapa de bairros =================
  if (parte('bairros') || parte('interior')) {
    await abrirGerador();
    await page.locator('#ger-lugar button', { hasText: 'Cidade' }).click(); await w(400);
    await page.locator('#cid-tam button', { hasText: 'Média' }).click(); await w(400);
    await page.locator('#ger-est button', { hasText: 'Comum' }).click(); await w(400);
    await page.locator('#ger-hora button', { hasText: 'Dia' }).click(); await w(150);
    const s0 = await assinatura('ger-prev');
    await page.locator('#cid-modo button', { hasText: 'Mapa de bairros' }).click(); await w(500);
    const gb = await G();
    ok(gb.plano.modo === 'bairros' && await assinatura('ger-prev') !== s0 && await page.locator('#ger-nome').inputValue() === 'Cidade (bairros)' && /\(no mapa, 40 × 28\)/.test(await page.locator('#ger-resumo').innerText()), 'o mapa de bairros: a prévia mostra os bairros; o nome "Cidade (bairros)"; o resumo diz o tamanho no mapa');
    await criar();
    const mp = await ev(() => { const s = __tc.Store.scene(); return JSON.parse(JSON.stringify({ id: s.id, nome: s.name, cols: s.cols, rows: s.rows, unit: s.grid.unit, fog: s.fog.dynamic, gerado: s.gerado, walls: s.walls.length, mk: s.tokens.filter(t => t.gera && t.gera.b).map(t => ({ id: t.id, nome: t.name, b: t.gera.b, hidden: t.hidden, x: Math.round(t.x / s.cell), y: Math.round(t.y / s.cell) })), outros: s.tokens.filter(t => !(t.gera && t.gera.b)).length,
      ter: s.shapes.filter(x => x.ter).length, formas: s.shapes.filter(x => !x.ter).length, torres: s.shapes.filter(x => x.ter && x.ter.h === 9).length, escala: s.shapes.filter(x => x.ter && x.k === 'ell' && x.ter.h === 9).every(x => Math.abs(x.w - 2.4 * s.cell / 2) < 1.5 || Math.abs(x.w - 1.7 * s.cell / 2) < 1.5) })); });
    mapaId = mp.id;
    ok(mp.cols === 40 && mp.rows === 28 && mp.unit === 3 && !mp.fog && mp.walls === 0 && mp.outros === 0, 'a cena do mapa: a cidade vista de longe (cada quadrado vale dois: 3 m), sem paredes, sem visão pelas paredes');
    ok(mp.ter > 10 && mp.formas === 0 && mp.torres === gb.plano.ring.length + gb.plano.portoes.length * 2 && mp.escala, 'no mapa, o relevo vem junto, na escala do mapa (a muralha e as torres, a água; as bandeirinhas não) — ' + j({ ter: mp.ter, torres: mp.torres }));
    ok(j(mp.mk.map(m => m.b).sort()) === j(['centro', 'mercado', 'nobres', 'pobres', 'quartel', 'rio']) && mp.mk.every(m => m.hidden && m.nome === 'Entrada: ' + { centro: 'centro', nobres: 'bairro nobre', mercado: 'mercado', pobres: 'bairro pobre', quartel: 'quartel', rio: 'beira-rio' }[m.b]), 'um marcador (oculto) em cada bairro, com o nome do bairro: ' + j(mp.mk.map(m => m.nome)));
    ok(mp.gerado && mp.gerado.lugar === 'cidade' && mp.gerado.o.modo === 'bairros' && mp.gerado.o.tamanho === 'media' && mp.gerado.o.estilo === 'comum' && mp.gerado.seed === gb.seed && mp.gerado.trava.ruas === gb.plano.sRuas, 'o mapa guarda com que escolhas, semente e traçado a cidade foi feita (para recortar os bairros)');
    // cada marcador cai no bairro dele
    const noBairro = await ev(g => { const C = __tc.Cidade, p = C.gerar(Object.assign({}, g.o, { seed: g.seed, trava: g.trava, modo: 'completa' })), sc = __tc.Store.scene(); return sc.tokens.filter(t => t.gera && t.gera.b).every(t => { const L = { centro: 'c', nobres: 'n', mercado: 'm', pobres: 'p', quartel: 'q', rio: 'r' }[t.gera.b], i = Math.round(t.x / sc.cell), jj = Math.round(t.y / sc.cell); return [0, 1].some(a => [0, 1].some(b => p.bairros.grade[(jj * 2 + b) * p.W + i * 2 + a] === L)); }); }, mp.gerado);
    ok(noBairro, 'cada marcador fica dentro do seu bairro');
    await foto('04-mapa-bairros');
    // dois cliques no marcador do centro
    const mkC = mp.mk.find(m => m.b === 'centro');
    await doisCliques(mkC.id);
    ok(/Ainda não leva a nenhuma cena \| Gerar este bairro… \| Escolher a cena… \| Uma cena nova, dentro desta…/i.test(await menuTxt()) && !/Gerar o interior/.test(await menuTxt()), 'dois cliques no marcador do bairro: "Gerar este bairro…" (e não o interior) — ' + await menuTxt());
    await page.locator('.menu-i', { hasText: 'Gerar este bairro' }).click(); await w(800);
    const recorteEsperado = await ev(g => { const C = __tc.Cidade, p = C.recorte(C.gerar(Object.assign({}, g.o, { seed: g.seed, trava: g.trava, modo: 'completa' })), 'centro'); return { W: p.W, H: p.H, n: p.predios.length, portas: p.predios.filter(k => { const mx = (k.porta.x1 + k.porta.x2) / 2, my = (k.porta.y1 + k.porta.y2) / 2; return mx > 0.2 && my > 0.2 && mx < p.W - 0.2 && my < p.H - 0.2; }).length }; }, mp.gerado);
    ok(await page.locator('.modal-t').innerText() === 'Gerar o centro' && await page.locator('#bai-resumo').innerText() === `${recorteEsperado.n} prédios · ${recorteEsperado.W} × ${recorteEsperado.H} quadrados, na escala de batalha (1,5 m).` && await page.locator('#bai-nome').inputValue() === 'Cidade (bairros) — centro', 'a janela do bairro: a prévia do pedaço da cidade, quantos prédios e o tamanho; o nome "… — centro"');
    await foto('05-janela-bairro');
    await criar();
    const ba = await ev(([mapa, mk]) => { const u = __tc, s = u.Store.scene(), m = u.Store.S.scenes[mapa].tokens.find(t => t.id === mk); return JSON.parse(JSON.stringify({ id: s.id, nome: s.name, cols: s.cols, rows: s.rows, unit: s.grid.unit, fog: s.fog.dynamic, mae: u.Store.S.pastas.mae[s.id], ligado: m && m.cena, saida: s.tokens.filter(t => t.prop === 'saida').map(t => ({ cena: t.cena, hidden: t.hidden })), ent: s.tokens.filter(t => t.prop === 'entrada' && t.gera && t.gera.t).length, fora: s.walls.filter(x => Math.min(x.x1, x.x2) < -0.01 || Math.min(x.y1, x.y2) < -0.01 || Math.max(x.x1, x.x2) > s.cols * s.cell + 0.01 || Math.max(x.y1, x.y2) > s.rows * s.cell + 0.01).length, paredes: s.walls.length,
      ter: s.shapes.filter(x => x.ter).length, formas: s.shapes.filter(x => !x.ter).length, formasFora: s.shapes.filter(x => !x.ter).filter(x => { const xs = x.pts ? x.pts.filter((_, i) => i % 2 === 0) : [x.x, x.x + x.w], ys = x.pts ? x.pts.filter((_, i) => i % 2 === 1) : [x.y, x.y + x.h]; return Math.min(...xs) < -1 || Math.min(...ys) < -1 || Math.max(...xs) > s.cols * s.cell + 1 || Math.max(...ys) > s.rows * s.cell + 1; }).length })); }, [mapaId, mkC.id]);
    bairroId = ba.id;
    ok(ba.nome === 'Cidade (bairros) — centro' && ba.cols === recorteEsperado.W && ba.rows === recorteEsperado.H && ba.unit === 1.5 && ba.fog, 'a cena do bairro: o pedaço da cidade na escala de batalha (1,5 m), com a visão pelas paredes');
    ok(ba.mae === mapaId && ba.ligado === ba.id && j(ba.saida) === j([{ cena: mapaId, hidden: true }]), 'o bairro fica dentro do mapa (na lista de cenas); o marcador do mapa já leva até ele; a Saída (oculta) leva de volta');
    ok(ba.ent === recorteEsperado.portas && ba.paredes > 0 && ba.fora === 0, 'os prédios do bairro com o marcador de Entrada (os que têm a porta dentro da cena); nenhuma parede passa da borda: ' + j({ ent: ba.ent, portas: recorteEsperado.portas, fora: ba.fora }));
    ok(ba.ter > 0 && ba.formasFora === 0 && ba.formas > 0, 'o bairro traz o relevo e as formas do pedaço dele; nenhuma forma passa da borda (as bandeirinhas entram inteiras ou não entram) — ' + j({ ter: ba.ter, formas: ba.formas }));
    ok(/"Cidade \(bairros\) — centro" criada, dentro de "Cidade \(bairros\)"\. A Saída leva de volta ao mapa\./.test(await toasts()), 'o aviso diz onde o bairro ficou');
    await foto('06-bairro');
    // de volta ao mapa: o marcador agora leva ao bairro
    await ev(id => __tc.UI.switchScene(id), mapaId); await w(300);
    await doisCliques(mkC.id);
    ok(/Leva para Cidade \(bairros\) — centro \| Ir para esta cena/i.test(await menuTxt()), 'de volta ao mapa, o marcador do centro leva ao bairro');
    await page.keyboard.press('Escape'); await w(100);
    // um marcador de bairro numa cena sem os dados da cidade não oferece gerar nada
    const semDados = await ev(() => { const u = __tc, sc = u.newScene('Sem dados'); const t = u.Props.novo(sc, 'entrada', 3 * 64, 3 * 64, 1, true); t.gera = { b: 'mercado' }; sc.tokens.push(t); u.normalizeScene(sc); u.Store.addScene(sc); u.Persist.scene(sc.id); u.UI.switchScene(sc.id); return t.id; });
    await w(300);
    await doisCliques(semDados);
    ok(!/Gerar este bairro|Gerar o interior/.test(await menuTxt()) && /Escolher a cena…/.test(await menuTxt()), 'um marcador de bairro numa cena que não sabe de que cidade ele é: nada de gerar (só ligar a uma cena)');
    await page.keyboard.press('Escape'); await w(100);
  }

  // ================= o interior =================
  if (parte('interior')) {
    await ev(id => __tc.UI.switchScene(id), bairroId); await w(300);
    const alvo = await ev(() => { const s = __tc.Store.scene(), l = s.tokens.filter(t => t.prop === 'entrada' && t.gera && t.gera.t), m = l.find(t => t.gera.t === 'taverna') || l.find(t => t.gera.t === 'loja') || l.find(t => t.gera.t !== 'templo') || l[0]; return JSON.parse(JSON.stringify({ id: m.id, gera: m.gera })); });
    await doisCliques(alvo.id);
    ok(/Ainda não leva a nenhuma cena \| Gerar o interior… \| Escolher a cena… \| Uma cena nova, dentro desta…/i.test(await menuTxt()), 'dois cliques na Entrada de um prédio: "Gerar o interior…"');
    await page.locator('.menu-i', { hasText: 'Gerar o interior' }).click(); await w(700);
    const PL = await ev(() => JSON.parse(JSON.stringify(__tc.Interior.PLANTAS)));
    const nomeTipo = PL[alvo.gera.t] ? PL[alvo.gera.t].n : 'Casa';
    ok(await page.locator('.modal-t').innerText() === 'Gerar o interior' && await page.locator('#int-tipo .seg-b.on').innerText() === nomeTipo && await page.locator('#int-est .seg-b.on').innerText() === 'Comum' && await page.locator('#int-tam').count() === 0, 'a janela do interior: o tipo do prédio (' + nomeTipo + ') e o estilo já vêm escolhidos; o tamanho é o do prédio');
    ok(new RegExp(`^\\d+ salas? · \\d+ móveis · ${alvo.gera.w * 2} × ${alvo.gera.h * 2} quadrados\\.$`).test(await page.locator('#int-resumo').innerText()) && await page.locator('#int-nome').inputValue() === nomeTipo + ' — por dentro', 'a planta tem o dobro das medidas do prédio; o nome "' + nomeTipo + ' — por dentro" — ' + await page.locator('#int-resumo').innerText());
    await foto('07-janela-interior');
    const a0 = await assinatura('int-prev');
    await page.locator('#int-outro').click(); await w(300);
    ok(await assinatura('int-prev') !== a0, 'Gerar outro: outra planta');
    await page.locator('#int-tipo button', { hasText: 'Templo' }).click(); await w(300);
    ok(/^2 salas · \d+ móveis/.test(await page.locator('#int-resumo').innerText()) && await page.locator('#int-nome').inputValue() === 'Templo — por dentro', 'trocar para Templo: a nave e a sacristia (2 salas); o nome acompanha');
    await page.locator('#int-tipo button', { hasText: nomeTipo }).click(); await w(300);
    await clearToasts();
    await criar();
    const it = await ev(([fora, mk]) => { const u = __tc, s = u.Store.scene(), m = u.Store.S.scenes[fora].tokens.find(t => t.id === mk); return JSON.parse(JSON.stringify({ id: s.id, nome: s.name, cols: s.cols, rows: s.rows, fog: s.fog.dynamic, mae: u.Store.S.pastas.mae[s.id], ligado: m && m.cena, saida: s.tokens.filter(t => t.prop === 'saida').map(t => ({ cena: t.cena, hidden: t.hidden })), portas: s.walls.filter(x => x.k === 'door').map(x => !!x.open), janelas: s.walls.filter(x => x.k === 'window').length, moveis: s.tokens.filter(t => t.prop && t.prop !== 'saida').map(t => t.prop), giradas: s.tokens.filter(t => t.prop === 'cadeira' && t.rot).length, cadeiras: s.tokens.filter(t => t.prop === 'cadeira').map(t => t.rot || 0), alvo: mk, feixes: s.shapes.filter(x => !x.ter && x.k === 'poly' && x.f === '#fff1c2').length, feixesOk: s.shapes.filter(x => !x.ter && x.k === 'poly' && x.f === '#fff1c2').every(x => x.a > 0.1 && x.a < 0.25 && x.lock), luzes: s.lights.length, tone: s.tone, textos: s.shapes.filter(x => x.k === 'text').length })); }, [bairroId, alvo.id]);
    ok(it.nome === nomeTipo + ' — por dentro' && it.cols === alvo.gera.w * 2 + 4 && it.rows === alvo.gera.h * 2 + 4 && it.fog && it.textos === 0, 'a cena de dentro: a planta com uma margem de dois quadrados em volta, a visão pelas paredes, nada escrito');
    ok(it.mae === bairroId && it.ligado === it.id && j(it.saida) === j([{ cena: bairroId, hidden: true }]), 'a cena de dentro fica dentro do bairro; o marcador já leva até ela; a Saída (oculta, junto da porta) leva de volta');
    ok(it.portas.length >= 2 && it.portas.every(x => !x) && it.janelas >= 1 && it.moveis.length >= 5 && it.moveis.every(Boolean), 'as portas (a de entrada e as de dentro) fechadas, as janelas, os móveis: ' + j({ portas: it.portas.length, janelas: it.janelas, moveis: it.moveis.length }));
    ok(it.luzes === 0 && it.tone === 'dia', 'de dia, sem luzes acesas (a hora é a do bairro)');
    if (alvo.gera.t === 'taverna') ok(it.moveis.includes('mesa') && it.cadeiras.length >= 2, 'a taverna: as mesas e as cadeiras (viradas para as mesas: ' + j(it.cadeiras) + ')');
    ok(it.feixes >= 1 && it.feixesOk, 'a luz entra pelas janelas (de dia, em feixes quentes e suaves, travados como arte de fundo): ' + it.feixes);
    ok(/criada, dentro de "Cidade \(bairros\) — centro": \d+ salas\. A Saída, junto da porta, leva de volta\./.test(await toasts()), 'o aviso diz onde a cena ficou');
    await foto('08-interior');
    // à noite: uma luz em cada sala (sem a parte da cidade, uma cidade oriental pequena, de noite, feita aqui)
    if (!cidadeId) {
      await abrirGerador();
      await page.locator('#ger-lugar button', { hasText: 'Cidade' }).click(); await w(400);
      await page.locator('#cid-modo button', { hasText: 'Cena completa' }).click(); await w(400);
      await page.locator('#cid-tam button', { hasText: 'Pequena' }).click(); await w(400);
      await page.locator('#ger-est button', { hasText: 'Oriental' }).click(); await w(400);
      await page.locator('#ger-hora button', { hasText: 'Noite' }).click(); await w(150);
      await criar();
      cidadeId = await ev(() => __tc.Store.S.current);
    }
    {
      await ev(id => __tc.UI.switchScene(id), cidadeId); await w(300);
      const mk2 = await ev(() => { const s = __tc.Store.scene(), m = s.tokens.find(t => t.prop === 'entrada' && t.gera && t.gera.t === 'templo') || s.tokens.find(t => t.prop === 'entrada' && t.gera); return m.id; });
      await doisCliques(mk2);
      await page.locator('.menu-i', { hasText: 'Gerar o interior' }).click(); await w(600);
      ok(await page.locator('#int-est .seg-b.on').innerText() === 'Oriental', 'na cidade oriental, o interior vem no estilo oriental');
      await criar();
      const noite = await ev(() => { const s = __tc.Store.scene(); return { tone: s.tone, luzes: s.lights.length, salas: s.walls.filter(x => x.k === 'door').length, bancos: s.tokens.filter(t => t.prop === 'banco').length, colunas: s.tokens.filter(t => t.prop === 'coluna').length, altar: s.tokens.filter(t => t.prop === 'altar').length, lanternas: s.tokens.filter(t => t.prop === 'lanterna').length, estrado: s.shapes.filter(x => x.ter && x.ter.t === 'plataforma' && x.ter.h === 0.5).length, pia: s.shapes.filter(x => x.ter && x.ter.t === 'agua' && x.ter.h === -0.5).length, luar: s.shapes.filter(x => !x.ter && x.f === '#b7cdfc').length, sol: s.shapes.filter(x => !x.ter && x.f === '#fff1c2').length }; });
      ok(noite.tone === 'noite' && noite.luzes === noite.salas, 'de noite (a hora da cidade): uma luz acesa em cada sala — ' + j(noite));
      ok(noite.altar === 1 && noite.bancos >= 4 && noite.colunas >= 2 && noite.lanternas >= 1, 'o templo: o altar, os bancos e as colunas da nave, e as lanternas do estilo oriental — ' + j(noite));
      ok(noite.estrado === 1 && noite.pia === 1 && noite.luar >= 1 && noite.sol === 0, 'o estrado do altar (meio metro acima), a pia de água benta e, de noite, o luar pelas janelas (não o sol)');
      await foto('09-templo-oriental');
    }
    // uma Entrada posta à mão
    const mao = await ev(() => { const u = __tc, sc = u.newScene('Mapa à mão'); u.Store.addScene(sc); u.Persist.scene(sc.id); u.UI.switchScene(sc.id); const t = u.Props.novo(u.Store.scene(), 'entrada', 6 * 64, 6 * 64, 1, false); u.Store.tx('x', () => u.Store.add('tokens', t)); return { id: t.id, cena: sc.id }; });
    await w(300);
    await doisCliques(mao.id);
    ok(/Gerar o interior…/.test(await menuTxt()), 'uma Entrada posta à mão também gera o interior');
    await page.locator('.menu-i', { hasText: 'Gerar o interior' }).click(); await w(600);
    ok(j(await page.locator('#int-tam button').allTextContents()) === j(['Pequeno', 'Médio', 'Grande']) && await page.locator('#int-tam .seg-b.on').innerText() === 'Médio' && await page.locator('#int-tipo .seg-b.on').innerText() === 'Casa' && /12 × 10 quadrados\.$/.test(await page.locator('#int-resumo').innerText()), 'à mão: escolhe-se também o tamanho (Médio: 12 × 10); a casa');
    await page.locator('#int-tam button', { hasText: 'Grande' }).click(); await w(250);
    await page.locator('#int-tipo button', { hasText: 'Casa do senhor' }).click(); await w(250);
    const comR = await assinatura('int-prev');
    await page.locator('.sw', { has: page.locator('#int-relevo') }).click(); await w(300);
    const semR = await assinatura('int-prev');
    await page.locator('.sw', { has: page.locator('#int-relevo') }).click(); await w(300);
    ok(semR !== comR && await assinatura('int-prev') === comR && await page.locator('#int-relevo').isChecked(), 'a chave "Com relevo e formas" também na janela do interior: desligada, a prévia sai sem o estrado e a luz; ligada de novo, volta igual');
    ok(/^[45] salas · \d+ móveis · 16 × 14 quadrados\.$/.test(await page.locator('#int-resumo').innerText()), 'a casa do senhor, grande: o salão e as outras salas, 16 × 14 — ' + await page.locator('#int-resumo').innerText());
    await foto('10-janela-mao');
    await criar();
    const m2 = await ev(([cena, mk]) => { const u = __tc, s = u.Store.scene(), m = u.Store.S.scenes[cena].tokens.find(t => t.id === mk); return { nome: s.name, cols: s.cols, rows: s.rows, mae: u.Store.S.pastas.mae[s.id] === cena, ligado: m && m.cena === s.id, colunas: s.tokens.filter(t => t.prop === 'coluna').length }; }, [mao.cena, mao.id]);
    ok(m2.nome === 'Casa do senhor — por dentro' && m2.cols === 20 && m2.rows === 18 && m2.mae && m2.ligado && m2.colunas >= 2, 'a casa do senhor sai dentro do mapa à mão, ligada à Entrada, com as colunas do salão — ' + j(m2));
    // recarregar: a cidade, o mapa (com os dados) e os marcadores continuam
    await page.reload({ waitUntil: 'load' }); await w(1200);
    const depois = await ev(([mapa, cid]) => { const u = __tc, M = u.Store.S.scenes[mapa], C = cid ? u.Store.S.scenes[cid] : null; return { gerado: !!(M && M.gerado && M.gerado.lugar === 'cidade'), mk: M ? M.tokens.filter(t => t.gera && t.gera.b).length : 0, ent: C ? C.tokens.filter(t => t.gera && t.gera.t).length : -1 }; }, [mapaId, cidadeId]);
    ok(depois.gerado && depois.mk === 6 && depois.ent !== 0, 'depois de recarregar: o mapa sabe de que cidade ele é, com os seis marcadores; os marcadores dos prédios continuam — ' + j(depois));
  }

  // ================= as regras dos planos =================
  if (parte('regras')) {
    const regras = await ev(() => {
      const C = __tc.Cidade, I = __tc.Interior, E = __tc.Estilos, erros = [], vistos = { predios: 0, travados: 0, mantidos: 0, quintais: 0, arvores: 0, pontes: 0, bairros: 0 };
      const dist = (pts, x, y) => { let d = Infinity; for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l)) : 0; d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy)); } return d; };
      const dentroPoli = (poli, x, y) => { let d = false; for (let i = 0, k = poli.length - 1; i < poli.length; k = i++) { const [xi, yi] = poli[i], [xk, yk] = poli[k]; if ((yi > y) !== (yk > y) && x < (xk - xi) * (y - yi) / (yk - yi) + xi) d = !d; } return d; };
      const cruza = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      function conferir(p, s) {
        if (/"nome"/.test(JSON.stringify(p))) erros.push(s + ': o plano tem nome');
        const T = C.TAMANHOS[p.tamanho];
        if (p.W !== T.W || p.H !== T.H) erros.push(s + ': medidas');
        if (p.predios.length > p.pedidos + 3 || p.predios.length < 8) erros.push(s + ': prédios ' + p.predios.length);
        const grandes = p.predios.filter(k => C.GRANDES.includes(k.tipo));
        if (!grandes.some(k => k.tipo === 'templo')) erros.push(s + ': sem templo');
        p.predios.forEach((k, i) => {
          vistos.predios++;
          if (!C.NOME_TIPO[k.tipo]) erros.push(s + ': tipo ' + k.tipo);
          if (k.x < 0 || k.y < 0 || k.x + k.w > p.W || k.y + k.h > p.H) erros.push(s + ': prédio fora do mapa');
          for (const k2 of p.predios.slice(i + 1)) if (cruza(k, k2)) erros.push(s + ': dois prédios um em cima do outro');
          // o prédio de um pátio fica dentro do pátio dele; os outros, fora dos pátios e do largo
          const pt = p.patios.find(q => cruza(q, k));
          if (pt && !(pt.tipo === k.tipo && k.x >= pt.x && k.y >= pt.y && k.x + k.w <= pt.x + pt.w && k.y + k.h <= pt.y + pt.h)) erros.push(s + ': prédio num pátio que não é o dele');
          if (p.largo && cruza(p.largo, k)) erros.push(s + ': prédio no largo do mercado');
          for (let jj = k.y; jj < k.y + k.h; jj++) for (let ii = k.x; ii < k.x + k.w; ii++) {
            const cx = ii + 0.5, cy = jj + 0.5;
            if (p.ruas.some(r => dist(r.pts, cx, cy) <= r.hw + 0.25) || Math.hypot(cx - p.praca.x, cy - p.praca.y) <= p.praca.r + 0.3) erros.push(s + ': prédio em cima da rua ou da praça');
            if (p.rio && dist(p.rio.pts, cx, cy) <= p.rio.hw + 0.6) erros.push(s + ': prédio dentro do rio');
            if (p.ring && !dentroPoli(p.ring, cx, cy)) erros.push(s + ': prédio fora da muralha');
          }
          // a porta: um quadrado, no meio de um lado; do lado de fora não há outro prédio
          const pt2 = k.porta, larg = Math.abs(pt2.x2 - pt2.x1) + Math.abs(pt2.y2 - pt2.y1);
          const naLinha = { n: pt2.y1 === k.y && pt2.y2 === k.y, s: pt2.y1 === k.y + k.h && pt2.y2 === k.y + k.h, o: pt2.x1 === k.x && pt2.x2 === k.x, l: pt2.x1 === k.x + k.w && pt2.x2 === k.x + k.w }[pt2.lado];
          if (larg !== 1 || !naLinha) erros.push(s + ': porta torta');
          const fx = (pt2.x1 + pt2.x2) / 2 + (pt2.lado === 'o' ? -0.5 : pt2.lado === 'l' ? 0.5 : 0), fy = (pt2.y1 + pt2.y2) / 2 + (pt2.lado === 'n' ? -0.5 : pt2.lado === 's' ? 0.5 : 0);
          if (p.predios.some(q => q !== k && fx > q.x && fx < q.x + q.w && fy > q.y && fy < q.y + q.h)) erros.push(s + ': a porta dá para outro prédio');
          if (k.forma === 'oct' && (k.w < 5 || k.h < 5)) erros.push(s + ': prédio redondo pequeno demais');
        });
        // as árvores e os quintais não ficam em cima dos prédios (nem os quintais na rua)
        for (const a of p.arvores) { vistos.arvores++; if (p.predios.some(k => a.x > k.x + 0.3 && a.x < k.x + k.w - 0.3 && a.y > k.y + 0.3 && a.y < k.y + k.h - 0.3)) erros.push(s + ': árvore em cima de um prédio'); }
        for (const q of p.quintais) {
          vistos.quintais++;
          if (p.predios.some(k => cruza(k, q))) erros.push(s + ': quintal em cima de um prédio');
          // (nos fundos: nem a volta do quintal encosta numa rua ou na praça)
          for (let jj = q.y - 1; jj <= q.y + q.h; jj++) for (let ii = q.x - 1; ii <= q.x + q.w; ii++) if (p.ruas.some(r => dist(r.pts, ii + 0.5, jj + 0.5) <= r.hw + 0.25) || Math.hypot(ii + 0.5 - p.praca.x, jj + 0.5 - p.praca.y) <= p.praca.r + 0.3) erros.push(s + ': quintal encostado na rua');
          if (!['horta', 'terreiro', 'jardim'].includes(q.k)) erros.push(s + ': quintal ' + q.k);
        }
        // o relevo: tipos do Terreno, alturas, formas que valem; o rio com fundura; a muralha com o adarve e as torres
        const TIPOS_T = __tc.TERRENOS.map(x => x.id);
        for (const r of p.relevo) {
          vistos.relevo = (vistos.relevo || 0) + 1;
          if (!TIPOS_T.includes(r.t) || !Number.isFinite(r.alt)) erros.push(s + ': relevo torto ' + JSON.stringify(r).slice(0, 80));
          if ((r.k === 'rect' || r.k === 'ell') ? !(r.w > 0 && r.h > 0) : !(Array.isArray(r.pts) && r.pts.length >= 2)) erros.push(s + ': relevo sem forma');
          const [a, b, c2, d] = E.caixaDe(r);
          if (a < -4 || b < -4 || c2 > p.W + 4 || d > p.H + 4) erros.push(s + ': relevo fora do mapa');
        }
        if (!!p.rio !== p.relevo.some(r => r.t === 'agua' && r.alt === -2 && r.k === 'free' && r.sw === (p.rio ? p.rio.hw * 2 : -1))) erros.push(s + ': o rio no relevo');
        if (p.ring && p.relevo.filter(r => r.alt === 9).length !== p.ring.length + p.portoes.length * 2) erros.push(s + ': as torres no relevo');
        if (!p.ring && p.relevo.some(r => r.alt === 9 || r.alt === 6 && r.k === 'free')) erros.push(s + ': torre sem muralha');
        // as formas: os cordões de bandeirinhas (um cordão e os triângulos, no mesmo grupo) e os alvos
        const grupos = {};
        for (const f of p.formas) { if (!['free', 'poly', 'ell', 'rect'].includes(f.k)) erros.push(s + ': forma ' + f.k); if (f.g) (grupos[f.g] = grupos[f.g] || []).push(f.k); }
        for (const [g, ks] of Object.entries(grupos)) if (ks.filter(k => k === 'free').length !== 1 || ks.filter(k => k === 'poly').length < 2) erros.push(s + ': bandeirinhas ' + g);
        vistos.pontes += p.pontes.length;
        if (p.rio && p.ring && p.pontes.length < 1) erros.push(s + ': rio sem ponte');
        if (p.ring && (p.portoes.length < 3 || p.portoes.length > 4)) erros.push(s + ': portões ' + p.portoes.length);
        if (p.bairros.grade.length !== p.W * p.H) erros.push(s + ': a grade dos bairros');
        // os bairros recortados: o pedaço cabe no mapa e traz os prédios que tocam nele
        for (const b of Object.keys(C.BAIRROS)) {
          const r = C.recorte(p, b);
          if (!r) continue;
          vistos.bairros++;
          if (r.W > p.W || r.H > p.H || r.W < 8 || r.H < 8 || r.modo !== 'completa') erros.push(s + ': recorte de ' + b);
          if (r.predios.some(k => k.x + k.w <= 0 || k.y + k.h <= 0 || k.x >= r.W || k.y >= r.H)) erros.push(s + ': no recorte, um prédio que não toca nele');
          if (r.formas.some(f => { const [a, b2, c2, d] = E.caixaDe(f); return a < -0.01 || b2 < -0.01 || c2 > r.W + 0.01 || d > r.H + 0.01; })) erros.push(s + ': no recorte, uma forma passa da borda');
          vistos.formasRecorte = (vistos.formasRecorte || 0) + r.formas.length;
        }
      }
      for (let s = 1; s <= 30; s++) {
        const o = { tamanho: ['pequena', 'media', 'grande'][s % 3], terreno: ['campo', 'floresta', 'areia', 'neve'][s % 4], estilo: E.LISTA[s % 6][0], rio: s % 3 !== 1, muralha: s % 5 !== 0, predios: 999, seed: s * 7919, modo: s % 4 ? 'completa' : 'bairros' };
        const p = C.gerar(o);
        if (JSON.stringify(p) !== JSON.stringify(C.gerar(o))) erros.push(s + ': o mesmo sorteio deu outra cidade');
        if (p.estilo !== o.estilo || p.modo !== o.modo || p.comRio !== o.rio || !!p.ring !== o.muralha) erros.push(s + ': as escolhas');
        conferir(p, s);
      }
      // com partes travadas: o traçado travado fica igual; os prédios travados que cabem ficam iguais
      for (let s = 1; s <= 18; s++) {
        const o = { tamanho: s % 2 ? 'media' : 'pequena', terreno: 'campo', estilo: E.LISTA[s % 6][0], rio: true, muralha: true, seed: s * 104729 };
        const p1 = C.gerar(o);
        let t = null;
        const comuns = p1.predios.map((k, i) => [k, i]).filter(([k]) => !C.GRANDES.includes(k.tipo));
        t = C.alternar(p1, 'p' + comuns[0][1], t);
        t = C.alternar(p1, 'p' + comuns[comuns.length - 1][1], t);
        if (s % 2) t = C.alternar(p1, 'ruas', t);
        const o2 = Object.assign({}, o, { seed: o.seed + 1, trava: JSON.parse(JSON.stringify(t)), base: { sRuas: p1.sRuas } });
        const p2 = C.gerar(o2);
        if (JSON.stringify(p2) !== JSON.stringify(C.gerar(o2))) erros.push('t' + s + ': com trava, o mesmo sorteio deu outra');
        conferir(p2, 't' + s);
        if (s % 2 && (p2.sRuas !== p1.sRuas || JSON.stringify(p2.ruas) !== JSON.stringify(p1.ruas) || !p2.travaRuas)) erros.push('t' + s + ': o traçado travado mudou');
        for (const k of t.predios) {
          vistos.travados++;
          const m = p2.predios.find(q => q.trava && q.x === k.x && q.y === k.y && q.w === k.w && q.h === k.h);
          if (m && m.tipo === k.tipo && JSON.stringify(m.porta) === JSON.stringify(k.porta)) vistos.mantidos++;
        }
        if (t.predios.length - p2.predios.filter(k => k.trava).length !== p2.soltas) erros.push('t' + s + ': conta dos prédios que saíram');
      }
      // o contorno da planta de dentro (a casa redonda, no dobro, corta dois quadrados em cada canto)
      if (JSON.stringify(E.contorno({ x: 0, y: 0, w: 10, h: 8, forma: 'oct', corte: 2 }).slice(0, 3)) !== JSON.stringify([[2, 0], [8, 0], [10, 2]]) || JSON.stringify(E.contorno({ x: 0, y: 0, w: 6, h: 6, forma: 'oct' })[0]) !== JSON.stringify([1, 0])) erros.push('o canto cortado (de 1 e de 2)');
      if (E.paredesDaCasa({ x: 0, y: 0, w: 10, h: 10, forma: 'oct', corte: 2, porta: { lado: 's', x1: 4, y1: 10, x2: 5, y2: 10 }, janelas: [] }).filter(x => x.x1 !== x.x2 && x.y1 !== x.y2).every(x => Math.abs(x.x2 - x.x1) === 2) === false) erros.push('as quinas da planta redonda');
      // uma trava torta não vale
      const lt = C.limparTrava({ ruas: -3, predios: [{ tipo: 'templo', x: 2, y: 2, w: 6, h: 6, porta: { lado: 'n' } }, { tipo: 'casa', x: -1, y: 2, w: 4, h: 4, porta: { lado: 'n' } }, { tipo: 'casa', x: 2, y: 2, w: 1, h: 4, porta: { lado: 'n' } }, { tipo: 'casa', x: 2, y: 2, w: 4, h: 4, porta: { lado: 'q' } }, { tipo: 'xx', x: 2, y: 2, w: 4, h: 4, porta: { lado: 'n' } }, { tipo: 'loja', x: 10, y: 10, w: 4, h: 5, porta: { lado: 'l' } }, null, 'x'] }, 80, 56);
      if (lt.ruas !== null || lt.predios.length !== 1 || lt.predios[0].tipo !== 'loja' || lt.predios[0].porta.x1 !== 14) erros.push('limparTrava: ' + JSON.stringify(lt));
      if (C.limparTrava({ ruas: 12 }, 80, 56).ruas !== 12 || C.limparTrava({ ruas: 1.5 }, 80, 56).ruas !== null || C.limparTrava(null, 80, 56).predios.length !== 0) erros.push('limparTrava: o traçado');
      // o interior: as salas cobrem a planta, ligadas pelas portas; os móveis dentro, sem um em cima do outro, longe
      // das portas e dos cantos cortados; as arrumações (a nave, o balcão, as colunas)
      const ri = { plantas: 0, naves: 0, balcoes: 0, cadeiras: 0, viradas: 0 };
      const virada = (c, m) => { const dx = (c.x + c.s / 2) - (m.x + m.s / 2), dy = (c.y + c.s / 2) - (m.y + m.s / 2); return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 270 : 90) : (dy < 0 ? 0 : 180); };
      for (const tipo of Object.keys(I.PLANTAS).filter(k => !I.PLANTAS[k].so)) for (const [w, h] of [[3, 3], [4, 4], [5, 4], [6, 5], [7, 5], [8, 7], [9, 7], [10, 4]]) for (const pl of ['n', 's', 'o', 'l']) for (const f of ['ret', 'oct']) {
        const s = `${tipo} ${w}×${h} ${pl} ${f}`, o = { tipo, w, h, p: pl, f, estilo: E.LISTA[(w + h) % 6][0], seed: w * 131 + h * 17 + pl.charCodeAt(0) };
        const p = I.gerar(o);
        ri.plantas++;
        if (JSON.stringify(p) !== JSON.stringify(I.gerar(o))) erros.push(s + ': o mesmo sorteio deu outra planta');
        if (p.W !== w * 2 || p.H !== h * 2) erros.push(s + ': medidas');
        const dono = new Int16Array(p.W * p.H).fill(-1);
        p.salas.forEach((q, k) => { for (let jj = q.y; jj < q.y + q.h; jj++) for (let ii = q.x; ii < q.x + q.w; ii++) { if (dono[jj * p.W + ii] !== -1) erros.push(s + ': salas sobrepostas'); dono[jj * p.W + ii] = k; } if (q.w < 3 || q.h < 3) erros.push(s + ': sala pequena demais'); });
        if (Array.from(dono).some(v => v < 0)) erros.push(s + ': buraco na planta');
        if (dono[p.entra[1] * p.W + p.entra[0]] !== 0 || p.salas[0].papel !== I.PLANTAS[tipo].salas[0]) erros.push(s + ': a sala da porta');
        const adj = p.salas.map(() => new Set());
        for (const pw of p.paredes) { const d = pw.porta, a = d.x1 === d.x2 ? dono[d.y1 * p.W + d.x1 - 1] : dono[(d.y1 - 1) * p.W + d.x1], b = dono[d.y1 * p.W + d.x1]; if (a < 0 || b < 0 || a === b) erros.push(s + ': porta de dentro torta'); else { adj[a].add(b); adj[b].add(a); } }
        const visto = new Set([0]), fila = [0];
        while (fila.length) { const k = fila.shift(); for (const x of adj[k]) if (!visto.has(x)) { visto.add(x); fila.push(x); } }
        if (visto.size !== p.salas.length) erros.push(s + ': sala sem porta');
        const corte = p.forma === 'oct' ? 2 : 0, oc = new Set(), ot = new Set();
        for (const q of p.salas) for (const m of q.moveis) {
          if (!__tc.Props.P[m.id]) erros.push(s + ': móvel desconhecido ' + m.id);
          for (let b = 0; b < m.s; b++) for (let a = 0; a < m.s; a++) {
            const ii = m.x + a, jj = m.y + b, key = ii + ',' + jj, set = m.id === 'tapete' ? ot : oc;
            if (set.has(key)) erros.push(s + ': um móvel em cima do outro'); set.add(key);
            if (ii < q.x || jj < q.y || ii >= q.x + q.w || jj >= q.y + q.h) erros.push(s + ': móvel fora da sala');
            if (corte && (ii + jj < corte || (p.W - 1 - ii) + jj < corte || ii + (p.H - 1 - jj) < corte || (p.W - 1 - ii) + (p.H - 1 - jj) < corte)) erros.push(s + ': móvel no canto cortado');
          }
        }
        if (oc.has(p.entra.join(',')) || ot.has(p.entra.join(','))) erros.push(s + ': móvel na passagem da porta');
        for (const pw of p.paredes) { const d = pw.porta, lados = d.x1 === d.x2 ? [[d.x1 - 1, d.y1], [d.x1, d.y1]] : [[d.x1, d.y1 - 1], [d.x1, d.y1]]; for (const [ii, jj] of lados) if (oc.has(ii + ',' + jj)) erros.push(s + ': móvel na frente de uma porta de dentro'); }
        // as paredes de fora: uma porta e as janelas inteiras
        const L = E.paredesDaCasa({ x: 0, y: 0, w: p.W, h: p.H, forma: p.forma, corte: 2, porta: p.porta, janelas: p.janelas });
        if (L.filter(x => x.k === 'door').length !== 1 || L.filter(x => x.k === 'window').length !== p.janelas.length) erros.push(s + ': as paredes de fora');
        // a nave: o altar no fundo, na linha da porta; os bancos fora do corredor do meio; as estátuas dos lados do altar
        const q0 = p.salas[0], horiz = pl === 'n' || pl === 's', U = horiz ? q0.h : q0.w;
        const uv = (ii, jj) => (pl === 's' ? [q0.y + q0.h - 1 - jj, ii - q0.x] : pl === 'n' ? [jj - q0.y, ii - q0.x] : pl === 'o' ? [ii - q0.x, jj - q0.y] : [q0.x + q0.w - 1 - ii, jj - q0.y]);
        const vc = (horiz ? p.porta.x1 - q0.x : p.porta.y1 - q0.y);
        if (q0.papel === 'nave') {
          const alt = q0.moveis.find(m => m.id === 'altar');
          if (!alt) erros.push(s + ': nave sem altar');
          else {
            const [ua, va] = uv(alt.x, alt.y);
            if (ua !== U - 1) erros.push(s + ': o altar não está no fundo');
            const ests = q0.moveis.filter(m => m.id === 'estatua');
            if (ests.length && !ests.some(m => uv(m.x, m.y)[0] === ua && Math.abs(uv(m.x, m.y)[1] - va) <= 2)) erros.push(s + ': nenhuma estátua do lado do altar');
          }
          const bancos = q0.moveis.filter(m => m.id === 'banco');
          if (bancos.some(m => Math.abs(uv(m.x, m.y)[1] - vc) <= 1)) erros.push(s + ': banco no corredor do meio');
          if (bancos.some(m => (m.rot || 0) !== (horiz ? 0 : 90))) erros.push(s + ': banco virado errado');
          if (bancos.length) ri.naves++;
        }
        // o relevo da planta (dentro dela) e o que cada tipo tem
        for (const r of p.relevo) { if (r.x < 0 || r.y < 0 || r.x + r.w > p.W || r.y + r.h > p.H) erros.push(s + ': relevo fora da planta'); }
        const tem = (t, alt) => p.relevo.some(r => r.t === t && r.alt === alt);
        const conta2 = k => { ri[k] = (ri[k] || 0) + 1; };
        if (tipo === 'templo') { conta2('templos'); if (tem('plataforma', 0.5)) conta2('estrados'); if (tem('agua', -0.5)) conta2('pias'); }
        if (tipo === 'senhor') { conta2('senhores'); if (tem('plataforma', 0.5)) conta2('mesasAltas'); }
        if (tipo === 'ferraria') { conta2('ferrarias'); if (tem('agua', -0.5)) conta2('tinas'); }
        if (tipo === 'armazem') { conta2('armazens'); if (tem('fosso', -3)) conta2('alcapoes'); }
        if (tipo === 'taverna' && tem('plataforma', 0.5)) conta2('palcos');
        if (p.luzes.length !== p.janelas.length) erros.push(s + ': uma luz por janela');
        if (q0.papel === 'salao' || q0.papel === 'loja') {
          const bal = q0.moveis.filter(m => m.id === 'balcao');
          if (bal.length) { ri.balcoes++; if (bal.some(m => (m.rot || 0) !== { s: 0, n: 180, o: 90, l: 270 }[pl])) erros.push(s + ': balcão virado errado'); }
        }
        for (const q of p.salas) for (const c of q.moveis.filter(m => m.id === 'cadeira' && m.rot != null)) {
          const mesa = q.moveis.find(m => m.id === 'mesa' && c.x < m.x + m.s + 1 && c.x + c.s > m.x - 1 && c.y < m.y + m.s + 1 && c.y + c.s > m.y - 1);
          ri.cadeiras++;
          if (mesa && virada(c, mesa) === c.rot) ri.viradas++;
        }
      }
      return { erros: erros.slice(0, 8), n: erros.length, vistos, ri };
    });
    ok(regras.n === 0 && regras.vistos.predios > 800 && regras.vistos.quintais > 40 && regras.vistos.arvores > 200 && regras.vistos.bairros > 60 && regras.vistos.relevo > 300 && regras.vistos.formasRecorte > 50, 'a cidade, em 30 sorteios (três tamanhos, seis estilos, com e sem rio e muralha): o mesmo sorteio dá a mesma cidade; sem nome; com o templo; os prédios dentro do mapa e da muralha, sem um em cima do outro, fora das ruas, da praça, do rio, do largo e dos pátios dos outros; a porta de um quadrado num lado, sem dar para outro prédio; as árvores e os quintais fora dos prédios; o rio com ponte; os bairros recortados — ' + j({ erros: regras.erros, n: regras.n, vistos: regras.vistos }));
    ok(regras.vistos.travados >= 30 && regras.vistos.mantidos >= regras.vistos.travados - 6, 'com partes travadas (18 sorteios): o traçado travado fica igual e os prédios travados que cabem ficam iguais; a trava torta não vale — ' + j(regras.vistos));
    ok(regras.ri.plantas === 512 && regras.ri.naves > 20 && regras.ri.balcoes > 40 && regras.ri.cadeiras > 50 && regras.ri.viradas === regras.ri.cadeiras, 'o interior, em 512 plantas: as salas cobrem a planta, ligadas pelas portas; os móveis do catálogo, dentro da sala, sem um em cima do outro, longe das portas e dos cantos cortados; a nave com o altar no fundo e os bancos fora do corredor; o balcão de frente para a porta; as cadeiras viradas para a mesa — ' + j(regras.ri));
    const ri = regras.ri;
    ok(ri.estrados === ri.templos && ri.pias >= ri.templos * 0.9 && ri.mesasAltas === ri.senhores && ri.tinas >= ri.ferrarias * 0.9 && ri.alcapoes >= ri.armazens * 0.9 && ri.palcos > 20, 'o relevo de dentro: o estrado do altar e a pia (templo), o estrado da mesa alta (senhor), a tina (ferraria), o alçapão (armazém), o palquinho (taverna), dentro da planta; uma luz por janela — ' + j(ri));
  }
  const inesperados = t.errs.filter(e => !/favicon|ERR_|Failed to load resource/i.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 10).join('\n'));
  ok(inesperados.length === 0, 'sem erros no console');
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
