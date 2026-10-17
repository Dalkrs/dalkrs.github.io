// Bateria do lote 7 (parte 4b-2b), no navegador, sem o site:
//   · a aba Porto da janela "Gerar um lugar": a vila de pescadores e o porto grande, os três tamanhos, os quatro
//     terrenos e as três chaves (os navios, o farol, o mercado) — que não mexem no traçado —, travar o traçado clicando
//     na prévia ("Gerar outro" troca só os barcos, o mercado e as árvores) e as escolhas guardadas;
//   · a cena do porto: os prédios fechados com a Entrada (oculta) na porta, o navio (a amurada de mureta, a carga do
//     convés, a Entrada na escotilha, a prancha até a terra), o mar com 2 m de fundura, os molhes, o convés por cima da
//     água, o farol (a torre que tapa a visão, a luz, a galeria a 10 m), os lampiões do cais;
//   · a vila de pescadores: os píeres de tábuas, o barco de pesca atracado (na cabeça em T ou ao lado do píer comprido),
//     a ponta de pedras, a praia e o mercado do peixe;
//   · o porão do navio (dois cliques na Entrada da escotilha);
//   · as regras dos planos em muitos sorteios (os dois lugares, os tamanhos, os terrenos, os estilos e as chaves);
//   · a Cidade com mar: sem o mar, nada muda (os planos de antes, conferidos pelo resumo deles); com o mar, a muralha
//     aberta para a água, sem portão para o mar, o cais, os molhes, os navios atracados com a prancha, o bairro do porto,
//     a rua do porto, o rio que deságua no mar, as ruas de bairro que param no cais, o mapa de bairros com o porto e o
//     recorte do porto com a água inteira; a cena (a amurada, a Entrada da escotilha, sem muro na beira).
const path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
// os resumos (FNV-1a do JSON do plano) de quatro cidades sem mar, tirados do código de antes do "Com mar" (lote 7, parte
// 4b-2b): a cidade sem mar tem de sair exatamente igual
const ANTES = { 'media/42/true/true/completa': '4556ec73', 'pequena/7/false/true/completa': '17bf875a', 'grande/999/true/false/bairros': '534ff0f0', 'media/31337/false/false/completa': '57e0d216' };

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
  const exato = async (grupo, txt) => { await page.locator(`#${grupo} button`).filter({ hasText: new RegExp('^' + txt + '$') }).click(); await w(450); };
  const chave = async id => { await page.locator('.sw', { has: page.locator('#' + id) }).click(); await w(450); };
  const semente = async v => { const f = page.locator('#ger-semente'); await f.fill(String(v)); await f.press('Enter'); await w(450); };
  const criar = async () => { await page.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click(); await page.waitForFunction(() => !document.querySelector('.modal'), null, { timeout: 40000 }); await w(400); };
  const doisCliques = async id => {
    await ev(id => { const u = __tc, sc = u.Store.scene(), tk = u.Store.get('tokens', id); u.Render.centerOn(tk.x + sc.cell * tk.size / 2, tk.y + sc.cell * tk.size / 2); }, id);
    await w(150);
    const box = await page.locator('#cv').boundingBox();
    const p2 = await ev(id => { const u = __tc, sc = u.Store.scene(), tk = u.Store.get('tokens', id); return u.Render.toScreen(tk.x + sc.cell * tk.size / 2, tk.y + sc.cell * tk.size / 2); }, id);
    await page.mouse.dblclick(box.x + p2[0], box.y + p2[1]); await w(300);
  };
  const traco = p => j([p.ladoMar, p.predios.map(k => [k.tipo, k.x, k.y, k.w, k.h, k.porta.lado]), p.pieres, p.vagas]);

  // ================= a aba Porto =================
  if (parte('aba')) {
    await abrirGerador();
    const abas = await ev(() => [...document.querySelectorAll('#ger-lugar button')].map(b => b.textContent.trim()));
    ok(j(abas) === j(['Vilarejo', 'Cidade', 'Tribo', 'Encontro', 'Ruínas', 'Masmorra', 'Porto']), 'as abas: Vilarejo, Cidade, Tribo, Encontro, Ruínas, Masmorra e Porto: ' + j(abas));
    await page.locator('#ger-lugar button', { hasText: 'Porto' }).click(); await w(700);
    await semente(5);                       // (a janela abre com uma semente sorteada: aqui, uma fixa)
    const g0 = await G();
    ok(await ev(() => __tc.Gerador.vivo().lugar) === 'porto' && g0.plano.lugar === 'porto' && g0.plano.tipo === 'vila' && g0.plano.W === 46 && g0.plano.H === 36, 'a aba Porto: a vila de pescadores média, de 46 × 36 quadrados');
    const c0 = await ctlTxt();
    ok(/Lugar \| Vila de pescadores \| Porto grande \| Tamanho \| Pequeno \| Médio \| Grande \| Terreno \| Campo \| Floresta \| Deserto \| Neve \| O barco de pesca atracado \(um lugar: dois cliques na escotilha geram o porão\) \| O farol, na ponta de pedras \| O mercado do peixe \(as barracas na areia, as redes e os secadores\)/.test(c0), 'as escolhas: o lugar, o tamanho, o terreno e as três chaves — ' + c0.slice(0, 320));
    ok(j(g0.op) === j({ tipo: 'vila', tamanho: 'medio', terreno: 'campo', navios: true, farol: true, mercado: true }), 'de começo: a vila, a média, o campo e tudo ligado: ' + j(g0.op));
    ok(/^Vila de pescadores · \d+ prédios · 46 × 36 quadrados · o barco de pesca atracado · o farol na ponta de pedras\.$/.test(await resumo()), 'o resumo: os prédios, as medidas, o barco e o farol: ' + await resumo());
    ok(await page.locator('#ger-nome').inputValue() === 'Vila de pescadores', 'o nome da cena: "Vila de pescadores"');
    ok(/Clique no traçado da prévia \(o mar, a beira, as ruas, os píeres, os prédios\)/.test(await page.locator('#ger-dica').innerText()) && /cada um é um lugar: o convés com a amurada/.test(await page.locator('.modal').innerText()), 'a dica (travar o traçado) e a nota (o que sai) são as do porto');
    ok(/Com relevo e formas \(o mar, os píeres e os molhes, o quebra-mar, os conveses e o farol\)/.test(await page.locator('.modal').innerText()), 'a chave do relevo fala do mar, dos píeres e do farol');
    ok(g0.plano.predios.length >= 6 && g0.plano.predios.every(k => !k.aberto && k.porta.lado === g0.plano.ladoMar) && g0.plano.predios.some(k => k.tipo === 'taverna'), 'os prédios: fechados, de frente para o mar, com a taverna: ' + g0.plano.predios.length);
    ok(g0.plano.navios.length === 1 && g0.plano.pranchas.length === 1 && g0.plano.farol && g0.plano.pieres.length >= 3, 'o barco de pesca atracado, com a prancha; o farol; os píeres');
    await foto('01-aba-porto');
    // o porto grande
    await exato('por-tipo', 'Porto grande');
    const gp = await G();
    ok(gp.op.tipo === 'porto' && gp.plano.tipo === 'porto' && gp.plano.W === 62 && gp.plano.H === 48 && gp.plano.navios.length === 2 && await page.locator('#ger-nome').inputValue() === 'Porto', 'o porto grande médio: 62 × 48, dois navios, o nome "Porto"');
    ok(/O cais de pedra, os molhes, os armazéns e os navios grandes atracados/.test(await page.locator('#por-tipo button', { hasText: 'Porto grande' }).getAttribute('title')), 'a dica do botão diz o que é o porto grande');
    const c1 = await ctlTxt();
    ok(/Os navios atracados \(cada um é um lugar: dois cliques na escotilha geram o porão e as cabines\) \| O farol, na ponta do quebra-mar \| O movimento do cais \(os guindastes, a carga, os barris e os caixotes\)/.test(c1), 'as chaves do porto grande falam dos navios, do quebra-mar e do cais: ' + c1.slice(-220));
    ok(/^Porto grande · \d+ prédios · 62 × 48 quadrados · 2 navios atracados · o farol no quebra-mar\.$/.test(await resumo()), 'o resumo do porto: ' + await resumo());
    ok(gp.plano.predios.some(k => k.tipo === 'armazem') && gp.plano.predios.some(k => k.tipo === 'taverna') && gp.plano.pintados.some(o => o.k === 'quebraMar') && gp.plano.pintados.some(o => o.k === 'caisPorto') && gp.plano.pintados.filter(o => o.k === 'molhe').length >= 1, 'os armazéns, a taverna, o cais, os molhes e o quebra-mar');
    // os tamanhos
    await exato('por-tam', 'Pequeno');
    const gq = await G();
    await exato('por-tam', 'Grande');
    const gg = await G();
    ok(gq.plano.W === 54 && gq.plano.H === 42 && gq.plano.navios.length === 1 && gg.plano.W === 70 && gg.plano.H === 54 && gg.plano.navios.length === 3 && gg.plano.predios.length > gq.plano.predios.length, 'o pequeno 54 × 42 com um navio; o grande 70 × 54 com três e mais prédios: ' + j([gq.plano.predios.length, gg.plano.predios.length]));
    ok((await page.locator('#por-tam button', { hasText: 'Grande' }).getAttribute('title')) === 'Até 18 prédios e 3 navios · 70 × 54 quadrados', 'a dica do tamanho diz quantos prédios e navios');
    await exato('por-tam', 'Médio');
    // o terreno e as chaves: não mexem no traçado
    const base = await G();
    await exato('por-ter', 'Neve');
    const gn = await G();
    ok(gn.plano.terreno === 'neve' && gn.plano.pal === 'neve' && traco(gn.plano) === traco(base.plano) && gn.plano.pintados.some(o => o.k === 'gelo'), 'na neve: o chão de neve, os blocos de gelo no mar — e o mesmo traçado');
    await exato('por-ter', 'Deserto');
    const gd = await G();
    ok(gd.plano.pal === 'areia' && gd.op.terreno === 'areia' && traco(gd.plano) === traco(base.plano) && gd.plano.arvores.every(a => a.esp === 'palmeira'), 'no deserto: o chão de areia e as palmeiras, o mesmo traçado');
    await exato('por-ter', 'Campo');
    await chave('por-nav');
    const sn = await G();
    ok(!sn.op.navios && sn.plano.navios.length === 0 && sn.plano.pranchas.length === 0 && traco(sn.plano) === traco(base.plano) && !/navios atracados/.test(await resumo()), 'sem os navios: nem navio nem prancha — os prédios, os molhes e os lugares ficam iguais');
    ok(j(sn.plano.pintados.filter(o => o.k === 'barco')) === j(base.plano.pintados.filter(o => o.k === 'barco')), 'e os barcos pequenos ficam onde estavam (eles não usam os lugares dos navios)');
    await chave('por-nav');
    await chave('por-farol');
    const sf = await G();
    ok(!sf.plano.farol && !sf.plano.pintados.some(o => o.k === 'farol') && sf.plano.pintados.some(o => o.k === 'quebraMar') && !sf.plano.luzes.length && traco(sf.plano) === traco(base.plano), 'sem o farol: o quebra-mar fica, sem a torre e sem a luz');
    await chave('por-farol');
    await chave('por-merc');
    const sm = await G();
    ok(!sm.plano.pintados.some(o => o.k === 'guindaste' || o.k === 'carga') && !sm.plano.objetos.some(o => o.id === 'barril' || o.id === 'caixote') && traco(sm.plano) === traco(base.plano) && j(sm.plano.arvores) === j(base.plano.arvores), 'sem o mercado: nem guindastes, nem carga, nem barris — e as árvores ficam iguais');
    await chave('por-merc');
    // travar o traçado: um clique no mar
    await semente(4242);
    const a = await G();
    ok(!a.plano.travaTracado && await page.locator('#ger-soltar').isDisabled(), 'nada travado de começo');
    { const v = a.plano.vagas[0]; const [sx, sy] = await naPrevia(v.x + v.w / 2, v.y + v.h / 2); await page.mouse.click(sx, sy); await w(450); }
    const b = await G();
    ok(b.plano.travaTracado === true && b.trava && b.trava.tipo === 'porto' && b.trava.tamanho === 'medio' && b.trava.s === b.plano.sT && !(await page.locator('#ger-soltar').isDisabled()), 'um clique no navio trava o traçado: ' + j(b.trava));
    await page.locator('#ger-outro').click(); await w(500);
    const c = await G();
    ok(c.seed !== b.seed && traco(c.plano) === traco(b.plano) && c.plano.travaTracado, '"Gerar outro" com o traçado travado: o mar, os prédios, os molhes e os navios ficam iguais');
    ok(j(c.plano.arvores) !== j(b.plano.arvores) && j(c.plano.pintados.filter(o => o.k === 'barco')) !== j(b.plano.pintados.filter(o => o.k === 'barco')), 'e os barcos pequenos e as árvores mudam (cada um no seu sorteio)');
    await chave('por-merc');
    ok((await G()).plano.travaTracado, 'desligar o mercado não solta a trava');
    await chave('por-merc');
    await exato('por-ter', 'Neve');
    { const n2 = await G(); ok(n2.plano.travaTracado && n2.plano.pal === 'neve' && traco(n2.plano) === traco(c.plano), 'trocar o terreno não solta a trava (o mesmo traçado, na neve)'); }
    await exato('por-ter', 'Campo');
    await exato('por-tipo', 'Vila de pescadores');
    ok(!(await G()).plano.travaTracado, 'trocar o lugar solta a trava');
    ok(await ev(() => {
      const P = __tc.Porto, t = { tipo: 'porto', tamanho: 'medio', s: 77 }, mesmo = { tipo: 'porto', tamanho: 'medio' };
      return JSON.stringify(P.limparTrava(t, mesmo)) === '{"s":77}' && P.limparTrava(t, { tipo: 'porto', tamanho: 'grande' }) === null && P.limparTrava(t, { tipo: 'vila', tamanho: 'medio' }) === null &&
        P.limparTrava({ tipo: 'porto', tamanho: 'medio', s: 0 }, mesmo) === null && P.limparTrava(null, mesmo) === null &&
        P.gerar({ tipo: 'porto', tamanho: 'medio', seed: 5, trava: t }).sT === 77 && !P.gerar({ tipo: 'porto', tamanho: 'grande', seed: 5, trava: t }).travaTracado;
    }), 'a trava só vale no mesmo lugar e no mesmo tamanho (e guarda só a semente do traçado)');
    // cancelar não cria nada; as escolhas ficam guardadas
    await exato('por-ter', 'Floresta');
    const antes = await ev(() => Object.keys(__tc.Store.S.scenes).length);
    await page.locator('.modal .btn', { hasText: 'Cancelar' }).click(); await w(300);
    ok(await ev(k => Object.keys(__tc.Store.S.scenes).length === k && !document.querySelector('.modal'), antes), 'cancelar não cria cena');
    await abrirGerador();
    const g4 = await G();
    ok(await ev(() => __tc.Gerador.vivo().lugar) === 'porto' && g4.op.terreno === 'floresta' && g4.op.tipo === 'vila', 'a janela reabre no Porto, com as últimas escolhas: ' + j(g4.op));
    await page.keyboard.press('Escape'); await w(300);
    // o que o Mapa-múndi manda (o marcador de porto): o terreno já preenchido
    await ev(() => __tc.Gerador.abrir('porto', { op: { terreno: 'areia' }, nome: 'Porto Velho' })); await w(700);
    const g6 = await G();
    ok(g6.op.terreno === 'areia' && g6.plano.pal === 'areia' && await page.locator('#ger-nome').inputValue() === 'Porto Velho', 'aberta já preenchida (no deserto, com o nome do marcador): ' + j(g6.op));
    await page.keyboard.press('Escape'); await w(300);
    await ev(() => { const o = __tc.App.opt; o.porTipo = 'vila'; o.porTer = 'campo'; o.porTam = 'medio'; });
  }

  // ================= a cena do porto =================
  let cenaPor = null;
  if (parte('cena') || parte('porao')) {
    await abrirGerador();
    await page.locator('#ger-lugar button', { hasText: 'Porto' }).click(); await w(600);
    await exato('por-tipo', 'Porto grande'); await exato('por-tam', 'Médio'); await exato('por-ter', 'Campo');
    await semente(11);
    await page.locator('#ger-hora button', { hasText: 'Noite' }).click(); await w(300);
    const p = (await G()).plano;
    await criar();
    const s = await ev(() => { const u = __tc, sc = u.Store.scene(); return {
      id: sc.id, nome: sc.name, cols: sc.cols, rows: sc.rows, tom: sc.tone, din: sc.fog.dynamic, fundo: !!(sc.bg.asset && u.Store.S.assets[sc.bg.asset]),
      tipos: sc.walls.reduce((a, x) => (a[x.k] = (a[x.k] || 0) + 1, a), {}), ent: sc.tokens.filter(x => x.prop === 'entrada').map(x => ({ id: x.id, oculto: !!x.hidden, gera: x.gera })),
      obj: sc.tokens.filter(x => x.prop && x.prop !== 'entrada').map(x => x.prop).sort(), ter: sc.shapes.filter(x => x.ter).map(x => [x.ter.t, x.ter.h, x.a]),
      luzes: sc.lights.map(l => [l.dim, l.c]), icones: u.doorSpots(sc).length, toast: [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ ') }; });
    cenaPor = Object.assign(s, { plano: p });
    const casaParedes = await ev(p => p.predios.reduce((k, q) => k + __tc.Estilos.paredesDaCasa(Object.assign({}, q, { porta: null, janelas: [] })).length, 0), p);
    const amurada = await ev(p => p.navios.reduce((k, nv) => k + __tc.Navio.paredes(nv).length, 0), p);
    ok(s.nome === 'Porto' && s.cols === 62 && s.rows === 48 && s.tom === 'noite' && s.din && s.fundo, 'a cena: "Porto", 62 × 48, de noite, com a névoa dinâmica e o fundo pintado: ' + j([s.nome, s.cols, s.rows, s.tom]));
    ok(s.tipos.mureta === amurada && s.tipos.wall === p.visao.length + casaParedes && Object.keys(s.tipos).length === 2 && s.icones === 0, 'as paredes: os prédios (fechados), o farol (de visão) e a amurada dos navios (mureta): ' + j(s.tipos));
    ok(s.ent.length === p.predios.length + p.navios.length && s.ent.every(e => e.oculto) && s.ent.filter(e => e.gera.t === 'navio').length === p.navios.length, 'uma Entrada oculta em cada prédio e na escotilha de cada navio: ' + j(s.ent.map(e => e.gera.t)));
    ok(j([...new Set(s.ent.filter(e => e.gera.t !== 'navio').map(e => e.gera.t))].sort()) === j([...new Set(p.predios.map(k => k.tipo))].sort()), 'as Entradas dos prédios sabem o tipo (o armazém, a taverna, a casa…)');
    ok(s.obj.filter(x => x === 'lampiao').length >= p.navios.length * 2 + 3, 'os lampiões do cais (e os da popa dos navios): ' + s.obj.filter(x => x === 'lampiao').length);
    const mar = s.ter.filter(x => x[0] === 'agua' && x[1] === -2).length, conves = s.ter.filter(x => x[0] === 'plataforma' && x[1] === 0).length, farol = s.ter.filter(x => x[0] === 'plataforma' && x[1] === 10).length, molhes = s.ter.filter(x => x[0] === 'plataforma' && x[1] === 0.5).length;
    ok(mar === 1 && conves === p.navios.length * 2 && farol === 1 && molhes === p.pieres.length && s.ter.every(x => x[2] > 0 && x[2] < 0.5), 'o relevo leve: o mar (2 m), os molhes, o convés e a prancha por cima da água, a galeria do farol (10 m): ' + j([mar, conves, farol, molhes]));
    ok(s.luzes.some(l => l[0] === 14 && l[1] === '#ffe6a0'), 'a luz do farol');
    const fa = await ev(p => { const sc = __tc.Store.scene(), c = sc.cell, f = p.farol; return sc.walls.filter(x => x.k === 'wall' && Math.hypot(x.x1 / c - f.x, x.y1 / c - f.y) < f.r && Math.hypot(x.x2 / c - f.x, x.y2 / c - f.y) < f.r).length; }, p);
    ok(fa >= 8, 'o farol tapa a visão (as paredes de visão em volta da torre): ' + fa);
    const ordem = p.navios.map(nv => {
      const dentro = x => { const pts = x.k === 'rect' || x.k === 'ell' ? [[x.x, x.y], [x.x + x.w, x.y + x.h]] : x.pts || []; return pts.length > 0 && pts.every(([X, Y]) => X >= nv.x - 0.01 && X <= nv.x + nv.L + 0.01 && Y >= nv.y - 0.01 && Y <= nv.y + nv.B + 0.01); };
      const iC = p.relevo.findIndex(x => x.t === 'plataforma' && x.alt === 0 && x.k === 'poly' && dentro(x)), iA = p.relevo.map((x, i) => (x.t === 'plataforma' && x.alt > 0 && dentro(x) ? i : -1)).filter(i => i >= 0);
      return iC >= 0 && iA.length > 0 && iA.every(i => i > iC);
    });
    ok(ordem.length === 2 && ordem.every(Boolean), 'o convés vem antes dos castelos no relevo (a área sem altura fica debaixo deles): ' + j(ordem));
    ok(/"Porto" criada: Porto grande · \d+ prédios · 62 × 48 quadrados · 2 navios atracados · o farol no quebra-mar\. Tudo é editável\./.test(s.toast), 'o aviso diz o que foi criado: ' + s.toast);
    await clearToasts();
    await ev(() => { __tc.Render.fit(); __tc.Render.request(); }); await w(400);
    await foto('02-cena-porto');
    // quem joga não vê as Entradas; a amurada deixa ver e não deixa passar; a prancha leva do convés à terra
    const vis = await ev(() => { const u = __tc, sc = u.Store.scene(); u.Store.S.players = [{ id: 'p1', name: 'Dalmo', color: '#4fb8e0' }]; u.UI.setViewer('p1'); const r = sc.tokens.filter(x => x.prop === 'entrada').map(x => u.tokShown(x, sc)); u.UI.setViewer('gm'); return r; });
    ok(vis.every(v => v === false), 'quem joga não vê as Entradas');
    const pr = await ev(p => { const u = __tc, sc = u.Store.scene(), c = sc.cell, q = p.pranchas[0]; return [u.Walls.blocksMove(sc, q.x * c, (q.y1 + Math.sign(q.y1 - q.y2) * 0.8) * c, q.x * c, q.y2 * c), u.Walls.blocksMove(sc, (q.x + 1.5) * c, (q.y1 + Math.sign(q.y1 - q.y2) * 0.8) * c, (q.x + 1.5) * c, (q.y2 - Math.sign(q.y1 - q.y2) * 0.5) * c)]; }, p);
    ok(j(pr) === j([false, true]), 'pela abertura da amurada se passa para a prancha; ao lado dela, a amurada barra: ' + j(pr));
  }

  // ================= o porão do navio =================
  if (parte('porao')) {
    const ent = cenaPor.ent.find(e => e.gera.t === 'navio');
    await doisCliques(ent.id);
    const menu = (await page.locator('.menu').innerText()).replace(/\n/g, ' | ');
    ok(/Gerar o interior/.test(menu), 'os dois cliques na Entrada da escotilha oferecem "Gerar o interior…": ' + menu);
    await page.locator('.menu-i', { hasText: 'Gerar o interior' }).click(); await w(700);
    const tipos = await ev(() => [...document.querySelectorAll('#int-tipo button')].map(b => b.textContent.trim()));
    ok(j(tipos) === j(['Navio']), 'a janela do interior: o tipo é só "Navio": ' + j(tipos));
    await criar();
    const it = await ev(id => { const u = __tc, sc = u.Store.scene(); return { nome: sc.name, mae: u.Store.S.pastas.mae[sc.id], portas: sc.walls.filter(x => x.k === 'door').length, saida: (sc.tokens.find(x => x.prop === 'saida') || {}).cena }; }, cenaPor.id);
    ok(it.mae === cenaPor.id && it.saida === cenaPor.id && it.portas >= 3, 'o navio por dentro é uma cena dentro do porto, com as portas das divisões e a Saída de volta: ' + j(it));
    await foto('03-porao');
    await ev(id => __tc.UI.switchScene(id), cenaPor.id); await w(400);
  }

  // ================= a vila de pescadores =================
  if (parte('vila')) {
    const vila = await ev(() => {
      const P = __tc.Porto, out = {};
      for (const lado of ['deitado', 'empe']) {
        for (let s = 1; s < 80; s++) {
          const p = P.gerar({ tipo: 'vila', tamanho: 'medio', seed: s });
          const deitado = p.ladoMar === 'n' || p.ladoMar === 's';
          if ((lado === 'deitado') !== deitado) continue;
          out[lado] = { s, lado: p.ladoMar, pieres: p.pieres, navios: p.navios.map(n => ({ x: n.x, y: n.y, L: n.L, B: n.B, proa: n.proa })), pranchas: p.pranchas, passarelas: p.pintados.filter(o => o.k === 'passarela').length, praia: p.pintados.some(o => o.k === 'praia'), barracas: p.pintados.filter(o => o.k === 'barracaPeixe').length, redes: p.pintados.filter(o => o.k === 'redes').length, peixes: p.pintados.filter(o => o.k === 'peixes').length, barcos: p.pintados.filter(o => o.k === 'barco').length, rochas: p.rochas.filter(r => r.grande).length, farol: p.farol, W: p.W, H: p.H };
          break;
        }
      }
      return out;
    });
    const d = vila.deitado, e = vila.empe;
    ok(d && d.navios.length === 1 && d.passarelas === d.pieres.length + 1 && d.navios[0].L === 12 && d.navios[0].B === 5, 'com a beira deitada: o barco de pesca (12 × 5) atracado na cabeça em T do píer do meio: ' + j(d && [d.lado, d.passarelas, d.navios]));
    ok(e && e.navios.length === 1 && e.passarelas === e.pieres.length && e.navios[0].proa === e.lado && e.navios[0].L >= 10, 'com a beira em pé: o barco de pesca ao lado do píer comprido, de proa para o mar: ' + j(e && [e.lado, e.navios]));
    ok([d, e].every(v => v.praia && v.barracas >= 2 && v.redes >= 2 && v.peixes >= 1 && v.barcos >= 4 && v.rochas === 7 && v.farol), 'a praia, o mercado do peixe (as barracas, as redes, o secador), os barcos e a ponta de pedras com o farol: ' + j([d, e].map(v => [v.barracas, v.redes, v.peixes, v.barcos, v.rochas])));
    // a cena da vila (a beira deitada)
    await abrirGerador();
    await page.locator('#ger-lugar button', { hasText: 'Porto' }).click(); await w(600);
    await exato('por-tipo', 'Vila de pescadores'); await exato('por-tam', 'Médio');
    await semente(d.s);
    await criar();
    const sv = await ev(() => { const sc = __tc.Store.scene(); return { nome: sc.name, mureta: sc.walls.filter(x => x.k === 'mureta').length, ent: sc.tokens.filter(x => x.prop === 'entrada').map(x => x.gera.t), ter: sc.shapes.filter(x => x.ter).map(x => [x.ter.t, x.ter.h]) }; });
    ok(sv.nome === 'Vila de pescadores' && sv.mureta > 0 && sv.ent.includes('navio') && sv.ent.includes('taverna') && sv.ter.filter(x => x[0] === 'plataforma' && x[1] === 0.5).length >= 4, 'a cena da vila: a amurada do barco, a Entrada da escotilha e a da taverna, os píeres (0,5 m): ' + j([sv.mureta, sv.ent.length]));
    await ev(() => { __tc.Render.fit(); __tc.Render.request(); }); await clearToasts(); await w(400);
    await foto('04-cena-vila');
  }

  // ================= as regras dos planos =================
  if (parte('regras')) {
    const r = await ev(() => {
      const P = __tc.Porto, ruins = [], EST = ['comum', 'oriental', 'nordico', 'desertico', 'elfico', 'anao'], TER = ['campo', 'floresta', 'areia', 'neve'];
      let total = 0, comNavio = 0, navios = 0, vagas = 0;
      for (const tipo of ['vila', 'porto']) for (const tamanho of ['pequeno', 'medio', 'grande']) for (let s = 1; s <= 20; s++) {
        const seed = s * 7919 + (tipo === 'porto' ? 3 : 1), com = { navios: s % 5 !== 0, farol: s % 4 !== 0, mercado: s % 3 !== 0 };
        const p = P.gerar(Object.assign({ tipo, tamanho, seed, terreno: TER[s % 4], estilo: EST[s % 6] }, com)), W = p.W, H = p.H, k = tipo + '/' + tamanho + ' s' + seed + ' ' + p.ladoMar, ruim = m => ruins.push(k + ': ' + m);
        const at = (i, j) => (i >= 0 && j >= 0 && i < W && j < H ? p.occ[j * W + i] : 9);
        total++;
        p.predios.forEach((a, i) => {
          if (a.x < 1 || a.y < 1 || a.x + a.w > W - 1 || a.y + a.h > H - 1) ruim('prédio na borda');
          for (let j = i + 1; j < p.predios.length; j++) { const b = p.predios[j]; if (a.x < b.x + b.w + 1 && b.x < a.x + a.w + 1 && a.y < b.y + b.h + 1 && b.y < a.y + a.h + 1) ruim('prédios colados'); }
          if (a.porta.lado !== p.ladoMar) ruim('porta para o lado errado');
          const fx = a.porta.lado === 'o' ? a.porta.x1 - 1 : a.porta.x1, fy = a.porta.lado === 'n' ? a.porta.y1 - 1 : a.porta.y1;
          if (at(fx, fy) !== 1) ruim('a frente da porta não é caminho');
        });
        if (!p.predios.some(q => q.tipo === 'taverna')) ruim('sem taverna');
        // (as fileiras de prédios, uma atrás da outra; só a vila pequena pode ter uma só)
        if (!(tipo === 'vila' && tamanho === 'pequeno')) {
          const u = { s: [0, 1], n: [0, -1], o: [-1, 0], l: [1, 0] }[p.ladoMar], sa = (x, y) => x * u[0] + y * u[1];
          const fr = [...new Set(p.predios.map(q => Math.round(Math.max(sa(q.x, q.y), sa(q.x + q.w, q.y + q.h)))))].sort((a, b) => a - b);
          let filas = 0, ult = -1e9;
          for (const f of fr) { if (f - ult > 3) filas++; ult = f; }
          if (filas < 2) ruim('uma fileira só');
          if (p.predios.length < Math.ceil(P.TAMANHOS[tamanho][tipo].casas * 0.8)) ruim('poucos prédios: ' + p.predios.length);
        }
        if (tipo === 'porto' && !p.predios.some(q => q.tipo === 'armazem')) ruim('sem armazém');
        if (com.navios) { comNavio++; navios += p.navios.length; vagas += p.vagas.length; }
        else if (p.navios.length) ruim('navio sem a chave');
        for (const nv of p.navios) {
          if (nv.x < 0 || nv.y < 0 || nv.x + nv.L > W || nv.y + nv.B > H) ruim('navio fora do mapa');
          if (!p.pranchas.some(q => Math.abs(q.x - nv.abertura.x) < 0.01 && (Math.abs(q.y1 - nv.y) < 0.01 || Math.abs(q.y1 - nv.y - nv.B) < 0.01))) ruim('navio sem prancha na abertura');
        }
        for (const q of p.pranchas) { const v = at(Math.floor(q.x), Math.floor(q.y2 - Math.sign(q.y2 - q.y1) * 0.3)); if (v !== 1 && v !== 5) ruim('a prancha não chega à terra: ' + v); }
        for (const q of p.pranchas) if (at(Math.floor(q.x), Math.floor((q.y1 + q.y2) / 2)) !== 1 || at(Math.floor(q.x) - 1, Math.floor((q.y1 + q.y2) / 2)) !== 1) ruim('a prancha não é caminho');
        if (p.pintados.filter(o => o.k === 'prancha').length !== p.pranchas.length) ruim('prancha sem o desenho');
        for (const o of p.pintados) if (o.k === 'barco') for (const v of p.vagas) if (o.x > v.x - 0.5 && o.x < v.x + v.w + 0.5 && o.y > v.y - 0.5 && o.y < v.y + v.h + 0.5) ruim('barco no lugar de um navio');
        if (!!p.farol !== com.farol) ruim('farol');
        const borda = { s: 'n', n: 's', o: 'l', l: 'o' }[p.ladoMar];
        if (!p.caminhos.some(c => c.pts.some(([x, y]) => (borda === 'n' ? y < 1.2 : borda === 's' ? y > H - 1.2 : borda === 'o' ? x < 1.2 : x > W - 1.2)))) ruim('nenhuma rua sai pela borda de terra');
        if (p.arvores.some(a => at(Math.floor(a.x), Math.floor(a.y)) === 2)) ruim('árvore no mar');
        if (p.relevo.filter(x => x.t === 'agua').length !== 1) ruim('o mar no relevo');
        if (JSON.stringify(p, (kk, v) => (typeof v === 'number' && !Number.isFinite(v) ? 'NAN!' : v)).includes('NAN!')) ruim('número inválido');
      }
      return { total, ruins, comNavio, navios, vagas };
    });
    ok(r.ruins.length === 0, 'as regras dos planos em ' + r.total + ' sorteios: ' + j(r.ruins.slice(0, 8)));
    ok(r.navios === r.vagas, 'com a chave dos navios, todo lugar de navio tem o seu navio: ' + j([r.navios, r.vagas]));
    // as árvores: poucas entre as casas (do fundo da última fileira até a beira), a mata cheia para dentro da terra
    const arv = await ev(() => {
      const P = __tc.Porto, s = { cid: 0, aC: 0, fora: 0, aF: 0 };
      for (const tipo of ['vila', 'porto']) for (const seed of [3, 11, 27, 41, 59]) {
        const p = P.gerar({ tipo, tamanho: 'pequeno', terreno: 'floresta', seed }), u = { s: [0, 1], n: [0, -1], o: [-1, 0], l: [1, 0] }[p.ladoMar], sa = (x, y) => x * u[0] + y * u[1];
        const lim = Math.min(...p.predios.map(q => Math.min(sa(q.x, q.y), sa(q.x + q.w, q.y + q.h)))), costa = Math.max(...p.predios.map(q => Math.max(sa(q.x, q.y), sa(q.x + q.w, q.y + q.h))));
        const borda = Math.min(sa(0, 0), sa(p.W, p.H)), larg = u[0] ? p.H : p.W;
        s.cid += p.arvores.filter(a => sa(a.x, a.y) > lim + 0.5 && sa(a.x, a.y) < costa).length; s.aC += (costa - lim - 0.5) * larg;
        s.fora += p.arvores.filter(a => sa(a.x, a.y) < lim - 2).length; s.aF += Math.max(0, lim - 2 - borda) * larg;
      }
      return { cidade: s.cid / s.aC, mata: s.fora / s.aF };
    });
    ok(arv.mata > 0.1 && arv.cidade < arv.mata * 0.09, 'as árvores: poucas entre as casas, a mata cheia para dentro da terra (por quadrado): ' + j([+arv.cidade.toFixed(3), +arv.mata.toFixed(3)]));
  }

  // ================= o desenho do mar =================
  if (parte('desenho')) {
    // o mar é fundo e escuro longe da beira (o lago da neve seria claro); junto da beira, o raso é mais claro
    const r = await ev(() => {
      const P = __tc.Porto, p = P.gerar({ tipo: 'porto', tamanho: 'medio', terreno: 'neve', seed: 21 }), cv = document.createElement('canvas');
      const { cell } = __tc.Encontro.motor.previa(cv, p, 900, 700, { relevo: false }), img = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      // (uma leitura só da imagem toda; a média de 7 × 7 pixels em volta do ponto)
      const media = (x, y) => { const s = [0, 0, 0], X = Math.round(x * cell), Y = Math.round(y * cell); let n = 0; for (let j = Y - 3; j <= Y + 3; j++) for (let i = X - 3; i <= X + 3; i++) { const k = (j * cv.width + i) * 4; s[0] += img[k]; s[1] += img[k + 1]; s[2] += img[k + 2]; n++; } return s.map(v => Math.round(v / n)); };
      const u = { s: [0, 1], n: [0, -1], o: [-1, 0], l: [1, 0] }[p.ladoMar], meio = [p.W / 2, p.H / 2], borda = [meio[0] + u[0] * (p.W / 2 - 1.5), meio[1] + u[1] * (p.H / 2 - 1.5)];
      // (pontos do fundo ao longo da borda do lado do mar; vale o mais escuro, longe dos blocos de gelo e dos barcos)
      const pts = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3].map(f => media(borda[0] + (u[1] ? f * p.W : 0), borda[1] + (u[0] ? f * p.H : 0)));
      return { lado: p.ladoMar, fundo: pts.reduce((a, b) => (b[0] < a[0] ? b : a)) };
    });
    ok(r.fundo[0] < 80 && r.fundo[2] > r.fundo[0] + 25, 'o mar longe da beira é fundo e escuro (azul-marinho), mesmo na neve: ' + j(r));
  }

  // ================= a Cidade com mar =================
  if (parte('cidade')) {
    const r = await ev(() => {
      const C = __tc.Cidade, h = s => { let x = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x.toString(16); };
      const antes = {};
      for (const [tam, seed, rio, mur, modo] of [['media', 42, true, true, 'completa'], ['pequena', 7, false, true, 'completa'], ['grande', 999, true, false, 'bairros'], ['media', 31337, false, false, 'completa']]) antes[[tam, seed, rio, mur, modo].join('/')] = h(JSON.stringify(C.gerar({ tamanho: tam, seed, rio, muralha: mur, modo, terreno: 'campo', estilo: 'comum', predios: 0 })));
      const p = C.gerar({ tamanho: 'media', seed: 3, rio: true, muralha: true, mar: true, modo: 'completa', terreno: 'campo', estilo: 'comum', predios: 0 });
      const m = p.mar, d = (x, y) => (m.lado === 's' ? m.b - y : m.lado === 'n' ? y - m.b : m.lado === 'l' ? m.b - x : x - m.b);
      const q = C.recorte(p, 'porto');
      return { antes, lado: m.lado, aberto: m.aberto, portoes: p.portoes.map(g => g.lado), navios: m.navios.length, pranchas: m.pranchas.length, molhes: m.molhes.length,
        porto: p.bairros.grade.split('').filter(x => x === 'o').length, mar: p.bairros.grade.split('').filter(x => x === '~').length,
        rua: p.ruas.some(ru => ru.k === 'principal' && (() => { const f = ru.pts[ru.pts.length - 1]; return d(f[0], f[1]) > 0 && d(f[0], f[1]) < 4.5; })()),
        rio: p.rio ? p.rio.pts.every(([x, y]) => d(x, y) >= -1.01) : null, cais: p.ruas.filter(ru => ru.k === 'rua').every(ru => ru.pts.every(([x, y]) => d(x, y) >= 3.5)),
        resumo: C.LUGAR.resumo(p), recorte: !!q && q.mar.navios.length === m.navios.length && q.mar.navios.every(n => n.x >= 0 && n.y >= 0 && n.x + n.L <= q.W && n.y + n.B <= q.H) &&
          (m.lado === 's' ? q.recorte.y0 + q.H === p.H : m.lado === 'n' ? q.recorte.y0 === 0 : m.lado === 'l' ? q.recorte.x0 + q.W === p.W : q.recorte.x0 === 0),
        relevo: p.relevo.filter(x => x.t === 'agua' && x.k === 'poly').length };
    });
    // (os resumos dos planos sem mar, como eram antes do "Com mar": a cidade sem mar sai exatamente igual)
    ok(j(r.antes) === j(ANTES), 'sem o mar, a cidade sai exatamente como antes: ' + j(r.antes));
    ok(!r.portoes.includes(r.lado) && r.aberto >= 0, 'com o mar: nenhum portão para o mar, e o lado da água da muralha fica aberto: ' + j([r.lado, r.portoes]));
    ok(r.navios === 2 && r.pranchas === 2 && r.molhes >= 1, 'na cidade média: dois navios atracados, com as pranchas, e os molhes: ' + j([r.navios, r.molhes]));
    ok(r.porto > 100 && r.mar > 100, 'o bairro do porto e a água na grade dos bairros: ' + j([r.porto, r.mar]));
    ok(r.rua && r.cais, 'a rua do porto desce da praça até o cais; as ruas de bairro param antes dele');
    ok(r.rio !== false, 'o rio não entra no mar (deságua na beira)');
    ok(/ · mar com o cais e 2 navios\.$/.test(r.resumo), 'o resumo diz o mar: ' + r.resumo);
    ok(r.recorte === true && r.relevo === 1, 'o recorte do porto vai até a borda do mapa do lado do mar, com os navios inteiros; o mar entra no relevo');
    // a chave na janela, e a cena
    await abrirGerador();
    await page.locator('#ger-lugar button', { hasText: 'Cidade' }).click(); await w(700);
    ok(/Com mar \(um lado vira mar: o cais, os molhes e os navios atracados\)/.test(await ctlTxt()), 'a chave "Com mar" na aba Cidade');
    await chave('cid-mar');
    const gc = await G();
    ok(gc.op.mar === true && gc.plano.mar && / · mar com o cais/.test(await resumo()), 'ligada, a cidade sai com o mar: ' + await resumo());
    await semente(3); await exato('cid-tam', 'Pequena');
    const pc = (await G()).plano;
    await criar();
    const sc = await ev(p => { const u = __tc, s = u.Store.scene(), c = s.cell, m = p.mar, linha = m.lado === 'n' || m.lado === 's'; return { ent: s.tokens.filter(x => x.prop === 'entrada' && x.gera && x.gera.t === 'navio').length, mureta: s.walls.filter(x => x.k === 'mureta').length,
      muroNaBeira: s.walls.filter(x => x.k === 'wall' && (linha ? Math.abs(x.y1 - m.b * c) < 2 && Math.abs(x.y2 - m.b * c) < 2 : Math.abs(x.x1 - m.b * c) < 2 && Math.abs(x.x2 - m.b * c) < 2)).length }; }, pc);
    ok(sc.ent === pc.mar.navios.length && sc.mureta > 0 && sc.muroNaBeira === 0, 'a cena: a amurada e a Entrada da escotilha de cada navio, e nenhum muro ao longo da beira: ' + j(sc));
    await ev(() => { __tc.Render.fit(); __tc.Render.request(); }); await clearToasts(); await w(400);
    await foto('05-cidade-com-mar');
    await ev(() => { __tc.App.opt.cidMar = false; });
  }

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 10).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  console.log(fails ? `${n - fails}/${n} ok — ${fails} falharam` : `${n}/${n} ok`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
