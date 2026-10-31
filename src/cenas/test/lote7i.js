// Bateria do lote 7 (parte 4b-3b), no navegador, sem o site: a aba Ruínas.
//   · a aba: depois do Encontro e antes do Porto; os cinco lugares (o templo caído, a torre tombada, o forte em ruínas,
//     o círculo de pedras, a boca da mina), os tamanhos, os terrenos e as duas chaves (a entrada da masmorra e o mato),
//     que não mexem no traçado; travar o traçado na prévia; as escolhas guardadas; aberta já preenchida (o Mapa-múndi);
//   · as regras dos planos em muitos sorteios: o mesmo sorteio dá o mesmo lugar; as chaves e o terreno não mexem no
//     traçado; a entrada da masmorra só com a chave, no chão, alcançável andando de uma borda, sabendo o nível de baixo
//     (a cripta embaixo do templo, a caverna atrás da boca, a mina…); o que cada lugar tem; sem o mato, nada de hera;
//   · a cena do templo: as paredes em ruína (as de pé e as baixas), as colunas que tapam a visão, o relevo, a Entrada
//     oculta da cripta — e os dois cliques nela geram o nível 1 (a cripta), dentro das ruínas;
//   · o desenho dos cinco lugares.
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
  const traco = p => j([p.tracado, p.paredes, p.visao.length, (p.entradas || []).map(e => [e.x, e.y])]);

  // ================= a aba Ruínas =================
  if (parte('aba')) {
    await abrirGerador();
    const abas = await ev(() => [...document.querySelectorAll('#ger-lugar button')].map(b => b.textContent.trim()));
    ok(j(abas) === j(['Vilarejo', 'Cidade', 'Tribo', 'Encontro', 'Região livre', 'Ruínas', 'Masmorra', 'Arena', 'Porto', 'Catacumbas', 'Castelo', 'Cemitério']), 'as abas: as Ruínas entre a Região livre e a Masmorra: ' + j(abas));
    await page.locator('#ger-lugar button', { hasText: 'Ruínas' }).click(); await w(700);
    await semente(3);
    const g0 = await G();
    ok(await ev(() => __tc.Gerador.vivo().lugar) === 'ruinas' && g0.plano.lugar === 'ruinas' && g0.plano.tipo === 'templo' && g0.plano.W === 44 && g0.plano.H === 34, 'a aba Ruínas: o templo caído médio, de 44 × 34 quadrados');
    const c0 = await ctlTxt();
    ok(/Lugar \| Templo caído \| Torre tombada \| Forte em ruínas \| Círculo de pedras \| Boca da mina \| Tamanho \| Pequeno \| Médio \| Grande \| Terreno \| Campo \| Floresta \| Deserto \| Neve \| Arredores \| Nenhum \| Pouco \| Médio \| Muito \| A entrada da masmorra \(a escada da cripta: dois cliques nela geram o nível 1 lá embaixo\) \| O mato tomando conta \(a hera nas pedras\)/.test(c0), 'as escolhas: o lugar (cinco), o tamanho, o terreno, os arredores (lote 14, parte 14c) e as duas chaves — ' + c0.slice(0, 380));
    ok(j(g0.op) === j({ tipo: 'templo', tamanho: 'medio', terreno: 'campo', masmorra: true, mato: true, arredores: 'nenhum', arrHist: [], arrAchados: true }), 'de começo: o templo, o médio, o campo e as duas chaves ligadas: ' + j(g0.op));
    ok(/^Templo caído · 44 × 34 quadrados · a escada da cripta \(a masmorra embaixo: a cripta\) · com o mato\.$/.test(await resumo()) && await page.locator('#ger-nome').inputValue() === 'Templo caído', 'o resumo (a entrada e a masmorra de baixo) e o nome: ' + await resumo());
    ok(/O estilóbato com a escadaria/.test(await page.locator('#rui-tipo button', { hasText: 'Templo caído' }).getAttribute('title')), 'a dica do botão diz o que é o lugar');
    await foto('01-aba-ruinas');
    // os outros lugares: cada um com a entrada da masmorra dele
    const vistos = {};
    for (const [tp, nome, re] of [['torre', 'Torre tombada', /a escada que desce, na base \(a masmorra embaixo: a masmorra de pedra\)/], ['forte', 'Forte em ruínas', /a escada que desce, na torre de menagem/], ['circulo', 'Círculo de pedras', /a boca da caverna \(a masmorra embaixo: a caverna\)/], ['mina', 'Boca da mina', /a entrada da mina \(a masmorra embaixo: a mina\)/]]) {
      await exato('rui-tipo', nome);
      const g = await G();
      vistos[tp] = g.plano.tipo === tp && re.test(await resumo()) && await page.locator('#ger-nome').inputValue() === nome && g.plano.entradas.length === 1;
    }
    ok(Object.values(vistos).every(Boolean), 'a torre, o forte, o círculo e a boca da mina, cada um com a entrada da masmorra dele: ' + j(vistos));
    // o terreno e as chaves não mexem no traçado (no forte)
    await exato('rui-tipo', 'Forte em ruínas');
    const base = await G();
    await exato('rui-ter', 'Neve');
    const gn = await G();
    ok(gn.plano.pal === 'neve' && traco(gn.plano) === traco(base.plano), 'na neve: o mesmo traçado');
    await exato('rui-ter', 'Campo');
    await chave('rui-mato');
    const sm = await G();
    ok(!sm.plano.pintados.some(o => o.k === 'hera') && base.plano.pintados.some(o => o.k === 'hera') && traco(sm.plano) === traco(base.plano), 'sem o mato: nada de hera — e o mesmo traçado');
    await chave('rui-mato');
    await chave('rui-mas');
    const sn = await G();
    ok(sn.plano.entradas.length === 0 && !/escada que desce/.test(await resumo()) && j(sn.plano.tracado) === j(base.plano.tracado), 'sem a entrada da masmorra: nenhuma Entrada; o traçado igual');
    await chave('rui-mas');
    // travar o traçado: um clique nas ruínas
    const a = await G(), f = a.plano.tracado[0], alvo = f.k === 'circ' ? [f.x, f.y] : f.pts.reduce((s, p) => [s[0] + p[0] / f.pts.length, s[1] + p[1] / f.pts.length], [0, 0]);
    { const [sx, sy] = await naPrevia(alvo[0], alvo[1]); await page.mouse.click(sx, sy); await w(450); }
    const b = await G();
    ok(b.plano.travaTracado === true && b.trava && b.trava.tipo === 'forte' && b.trava.tamanho === 'medio' && b.trava.s === b.plano.sT, 'um clique nas ruínas trava o traçado: ' + j(b.trava));
    await page.locator('#ger-outro').click(); await w(500);
    const c = await G();
    ok(c.seed !== b.seed && traco(c.plano) === traco(b.plano) && j(c.plano.arvores) !== j(b.plano.arvores), '"Gerar outro" com o traçado travado: as ruínas iguais, as árvores outras');
    await exato('rui-ter', 'Floresta');
    ok((await G()).plano.travaTracado, 'trocar o terreno não solta a trava');
    await exato('rui-tipo', 'Templo caído');
    ok(!(await G()).plano.travaTracado, 'trocar o lugar solta a trava');
    await exato('rui-tipo', 'Forte em ruínas');
    ok(!(await G()).plano.travaTracado, 'e voltar ao forte não trava de novo (a trava foi embora)');
    await exato('rui-tipo', 'Templo caído');
    ok(await ev(() => {
      const R = __tc.Ruinas, t2 = { tipo: 'forte', tamanho: 'medio', s: 77 }, mesmo = { tipo: 'forte', tamanho: 'medio' };
      return JSON.stringify(R.limparTrava(t2, mesmo)) === '{"s":77}' && R.limparTrava(t2, { tipo: 'forte', tamanho: 'grande' }) === null && R.limparTrava(t2, { tipo: 'torre', tamanho: 'medio' }) === null && R.limparTrava({ tipo: 'forte', tamanho: 'medio', s: 0 }, mesmo) === null &&
        R.gerar({ tipo: 'forte', tamanho: 'medio', seed: 5, trava: t2 }).sT === 77 && !R.gerar({ tipo: 'forte', tamanho: 'grande', seed: 5, trava: t2 }).travaTracado &&
        R.gerar({ tipo: 'mina', tamanho: 'pequeno', seed: 3, terreno: 'deserto' }).pal === 'areia';
    }), 'a trava só vale no mesmo lugar e no mesmo tamanho (e guarda só a semente do traçado); "deserto" é a areia');
    ok(await ev(() => __tc.App.opt.ruiTipo === 'templo' && __tc.App.opt.ruiTer === 'floresta'), 'as escolhas ficam guardadas');
    await page.keyboard.press('Escape'); await w(300);
    // o que o Mapa-múndi manda: o lugar e o terreno já preenchidos
    await ev(() => __tc.Gerador.abrir('ruinas', { op: { tipo: 'torre', terreno: 'neve' }, nome: 'Torre Negra' })); await w(700);
    const g6 = await G();
    ok(g6.op.tipo === 'torre' && g6.op.terreno === 'neve' && await page.locator('#ger-nome').inputValue() === 'Torre Negra', 'aberta já preenchida (a torre na neve, com o nome do marcador): ' + j(g6.op));
    await page.keyboard.press('Escape'); await w(300);
    await ev(() => { const o = __tc.App.opt; o.ruiTipo = 'templo'; o.ruiTer = 'campo'; o.ruiTam = 'medio'; o.ruiMas = true; o.ruiMato = true; });
  }

  // ================= as regras dos planos =================
  if (parte('regras')) {
    const r = await ev(() => {
      const R = __tc.Ruinas, ruins = [], vistos = {};
      let total = 0;
      for (const tipo of ['templo', 'torre', 'forte', 'circulo', 'mina']) for (const tamanho of ['pequeno', 'medio', 'grande']) for (let s = 1; s <= 10; s++) {
        const seed = s * 7919 + tipo.length, com = { masmorra: s % 4 !== 0, mato: s % 3 !== 0 }, terreno = ['campo', 'floresta', 'areia', 'neve'][s % 4];
        const o = Object.assign({ tipo, tamanho, seed, terreno, estilo: ['comum', 'oriental', 'nordico', 'anao'][s % 4] }, com);
        const p = R.gerar(o), W = p.W, H = p.H, k = tipo + '/' + tamanho + ' s' + seed, ruim = m => ruins.push(k + ': ' + m);
        const at = (i, jj) => (i >= 0 && jj >= 0 && i < W && jj < H ? p.occ[jj * W + i] : 9);
        total++;
        if (JSON.stringify(R.gerar(o)) !== JSON.stringify(p)) ruim('o mesmo sorteio não deu o mesmo lugar');
        // as chaves e o terreno não mexem no traçado (as paredes, a visão, o que tapa, a entrada; sem a escada, o lugar
        // dela fica, e os objetos também)
        if (s % 5 === 1) {
          const tr = q => JSON.stringify([q.tracado, q.paredes, q.visao, q.cobertura]);
          const q1 = R.gerar(Object.assign({}, o, { mato: !com.mato })), q2 = R.gerar(Object.assign({}, o, { masmorra: !com.masmorra })), q3 = R.gerar(Object.assign({}, o, { terreno: ['campo', 'floresta', 'areia', 'neve'][(s + 1) % 4] }));
          if (tr(q1) !== tr(p) || JSON.stringify(q1.entradas) !== JSON.stringify(p.entradas)) ruim('a chave do mato mexeu no traçado');
          if (tr(q2) !== tr(p) || JSON.stringify(q2.objetos) !== JSON.stringify(p.objetos)) ruim('a chave da masmorra mexeu no traçado');
          if (tr(q3) !== tr(p) || JSON.stringify(q3.entradas) !== JSON.stringify(p.entradas)) ruim('o terreno mexeu no traçado');
        }
        if (p.W !== R.TAMANHOS[tamanho].W || p.H !== R.TAMANHOS[tamanho].H) ruim('o tamanho');
        // a entrada da masmorra: só com a chave; no chão; sabe o nível de baixo
        if (com.masmorra !== (p.entradas.length === 1)) ruim('a entrada da masmorra e a chave: ' + p.entradas.length);
        for (const e of p.entradas) {
          const g = e.gera;
          if (g.t !== 'masmorra' || g.m !== R.MASMORRA[tipo] || g.n !== 1 || g.tam !== tamanho || !(g.s >= 1)) ruim('o que a entrada sabe: ' + JSON.stringify(g));
          const v = at(e.x, e.y);
          if (!(v === 0 || v === 1 || v === 5)) ruim('a entrada fora do chão: ' + v);
          // (e dá para chegar nela andando, de uma borda do mapa: nenhuma parede fecha o caminho)
          const anda = (i, jj) => { const x = at(i, jj); return x !== 2 && x !== 3 && x !== 7 && x !== 9; }, vis = new Uint8Array(W * H), fila = [];
          for (let i = 0; i < W; i++) for (const jj of [0, H - 1]) if (anda(i, jj) && !vis[jj * W + i]) { vis[jj * W + i] = 1; fila.push([i, jj]); }
          for (let jj = 0; jj < H; jj++) for (const i of [0, W - 1]) if (anda(i, jj) && !vis[jj * W + i]) { vis[jj * W + i] = 1; fila.push([i, jj]); }
          for (let q = 0; q < fila.length; q++) { const [i, jj] = fila[q]; for (const [a2, b2] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a2, y = jj + b2; if (x >= 0 && y >= 0 && x < W && y < H && !vis[y * W + x] && anda(x, y)) { vis[y * W + x] = 1; fila.push([x, y]); } } }
          if (!vis[e.y * W + e.x]) ruim('a entrada não se alcança andando');
        }
        if (!com.masmorra && (p.pintados.some(q => q.k === 'escadaDesce'))) ruim('a escada que desce sem a chave');
        { const esc = p.pintados.find(q => q.k === 'escadaDesce'), boca = p.pintados.find(q => q.k === 'bocaCaverna' || q.k === 'portalMina');
          for (const e of p.entradas) if (esc ? !(e.x >= esc.x && e.x < esc.x + esc.w && e.y >= esc.y && e.y < esc.y + esc.h) : !(boca && Math.hypot(e.x + 0.5 - boca.x, e.y + 0.5 - boca.y) < 2.2)) ruim('a entrada longe da escada (ou da boca)'); }
        // (as paredes não se cruzam: a menagem não passa por cima do alojamento, nada atravessa nada)
        { const d = (a, b, c2) => (b[0] - a[0]) * (c2[1] - a[1]) - (b[1] - a[1]) * (c2[0] - a[0]), lados = (x, y) => (x > 1e-6 && y < -1e-6) || (x < -1e-6 && y > 1e-6);
          const ws = p.paredes.map(q => [[q.x1, q.y1], [q.x2, q.y2]]);
          let cruz = 0;
          for (let a2 = 0; a2 < ws.length && !cruz; a2++) for (let b2 = a2 + 1; b2 < ws.length; b2++) { const [A, B] = ws[a2], [C2, D] = ws[b2]; if (lados(d(C2, D, A), d(C2, D, B)) && lados(d(A, B, C2), d(A, B, D))) { cruz++; break; } }
          if (cruz) ruim('paredes que se cruzam'); }
        for (const w2 of p.paredes) if ([w2.x1, w2.x2].some(x => x < -0.5 || x > W + 0.5) || [w2.y1, w2.y2].some(y => y < -0.5 || y > H + 0.5) || !['wall', 'mureta', 'door'].includes(w2.k)) { ruim('parede fora do mapa ou de tipo estranho'); break; }
        if (!com.mato && p.pintados.some(q => q.k === 'hera')) ruim('hera sem o mato');
        if (p.pintados.some(q => q.k === 'hera' && p.predios.some(b2 => q.x > b2.x && q.x < b2.x + b2.w && q.y > b2.y && q.y < b2.y + b2.h))) ruim('hera no telhado');
        if (JSON.stringify(p, (kk, v) => (typeof v === 'number' && !Number.isFinite(v) ? 'NAN!' : v)).includes('NAN!')) ruim('número inválido');
        const pint = q => p.pintados.filter(x => x.k === q).length;
        const conta = (chave2, c2) => { vistos[chave2] = (vistos[chave2] || 0) + (c2 ? 1 : 0); };
        if (tipo === 'templo') {
          conta('templo', p.relevo.some(x => x.t === 'plataforma' && x.alt === 1 && x.k === 'rect') && pint('colunaRuina') >= 4 && p.visao.length >= 8 * pint('colunaRuina') && pint('degraus') === 1 && p.paredes.some(x => x.k === 'wall') && p.objetos.some(x => x.id === 'altar'));
          if (com.masmorra && !pint('escadaDesce')) ruim('o templo sem a escada da cripta');
        }
        if (tipo === 'torre') conta('torre', pint('tamborTorre') >= 3 && pint('ameias') === 1 && p.visao.length >= 4 * pint('tamborTorre') && p.paredes.filter(x => x.k === 'wall').length >= 10);
        if (tipo === 'forte') conta('forte', pint('topoTorre') + pint('monteEntulho') >= 4 && pint('portaoQuebrado') === 1 && p.paredes.length >= 20 && p.relevo.some(x => x.alt === 4) && p.objetos.some(x => x.id === 'poco'));
        // (cada menir de pé tapa a visão: os cantos dele estão nas paredes de visão — o paredão também tem as dele)
        const naVisao = ([x, y]) => p.visao.some(v => (Math.abs(v[0] - x) < 0.02 && Math.abs(v[1] - y) < 0.02) || (Math.abs(v[2] - x) < 0.02 && Math.abs(v[3] - y) < 0.02));
        if (tipo === 'circulo') conta('circulo', pint('menir') + pint('menirCaido') >= 8 && pint('pedraAltar') === 1 && pint('bocaCaverna') === 1 && p.massas.length === 1 && p.pintados.filter(q => q.k === 'menir').every(q => q.pts.every(naVisao)));
        if (tipo === 'mina') conta('mina', pint('portalMina') === 1 && pint('escoria') === 1 && pint('trilhoMina') === 1 && p.predios.length === 1 && p.massas.length === 1);
        if (!p.caminhos.length) ruim('sem a trilha');
      }
      return { total, ruins, vistos };
    });
    ok(r.ruins.length === 0, 'as regras dos planos em ' + r.total + ' sorteios: ' + j(r.ruins.slice(0, 8)));
    ok(['templo', 'torre', 'forte', 'circulo', 'mina'].every(k => r.vistos[k] === 30), 'o que cada lugar tem, em todos os sorteios (o estilóbato, as colunas que tapam a visão, a escadaria e o altar; os pedaços da torre e as ameias; as torres do forte, o portão, o adarve e o poço; os menires, a pedra do altar e a boca da caverna; a boca da mina, a escória, os trilhos e o barracão): ' + j(r.vistos));
  }

  // ================= a cena do templo e a cripta embaixo =================
  if (parte('cena')) {
    await abrirGerador();
    await page.locator('#ger-lugar button', { hasText: 'Ruínas' }).click(); await w(600);
    await exato('rui-tipo', 'Templo caído'); await exato('rui-tam', 'Médio');
    await semente(7);
    const p = (await G()).plano;
    await criar();
    const s = await ev(() => { const u = __tc, sc = u.Store.scene(); return { id: sc.id, nome: sc.name, cols: sc.cols, rows: sc.rows, tipos: sc.walls.reduce((a, x) => (a[x.k] = (a[x.k] || 0) + 1, a), {}), ent: sc.tokens.filter(x => x.prop === 'entrada').map(x => ({ id: x.id, oculto: !!x.hidden, gera: x.gera })), ter: sc.shapes.filter(x => x.ter).length, toast: [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ ') }; });
    ok(s.nome === 'Templo caído' && s.cols === 44 && s.rows === 34 && s.ter === p.relevo.length, 'a cena: "Templo caído", 44 × 34, com o relevo: ' + j([s.nome, s.ter]));
    ok((s.tipos.wall || 0) === p.paredes.filter(x => x.k === 'wall').length + p.visao.length && (s.tipos.mureta || 0) === p.paredes.filter(x => x.k === 'mureta').length, 'as paredes em ruína (as de pé tapam a visão, as baixas são mureta) e as de visão das colunas: ' + j(s.tipos));
    ok(s.ent.length === 1 && s.ent[0].oculto && s.ent[0].gera.t === 'masmorra' && s.ent[0].gera.m === 'cripta' && s.ent[0].gera.n === 1, 'a Entrada oculta da cripta: ' + j(s.ent[0] && s.ent[0].gera));
    ok(/"Templo caído" criada: Templo caído · 44 × 34 quadrados · a escada da cripta/.test(s.toast), 'o aviso: ' + s.toast);
    await clearToasts();
    await ev(() => { __tc.Render.fit(); __tc.Render.request(); }); await w(400);
    await foto('02-cena-templo');
    // os dois cliques na Entrada: o nível 1, a cripta, dentro das ruínas
    await doisCliques(s.ent[0].id);
    const menu = (await page.locator('.menu').innerText()).replace(/\n/g, ' | ');
    ok(/Gerar o nível 1…/.test(menu), 'os dois cliques na Entrada da cripta: "Gerar o nível 1…" — ' + menu);
    await page.locator('.menu-i', { hasText: 'Gerar o nível 1' }).click(); await w(800);
    ok(/^Cripta · nível 1 · 46 × 34 quadrados/.test(await page.locator('#mas-resumo').innerText()), 'a janela do nível já vem com a cripta, do tamanho das ruínas: ' + await page.locator('#mas-resumo').innerText());
    await criar();
    const nv = await ev(id => { const u = __tc, sc = u.Store.scene(); return { nome: sc.name, mae: u.Store.S.pastas.mae[sc.id], saida: (sc.tokens.find(x => x.prop === 'saida') || {}).cena }; }, s.id);
    ok(nv.nome === 'Cripta — nível 1' && nv.mae === s.id && nv.saida === s.id, 'a cripta sai dentro das ruínas, com a Saída de volta para elas: ' + j(nv));
    await ev(id => __tc.UI.switchScene(id), s.id); await w(300);
  }

  // ================= o desenho =================
  if (parte('desenho')) {
    const r = await ev(() => {
      const R = __tc.Ruinas, M = __tc.Encontro.motor, out = {};
      for (const tipo of ['templo', 'torre', 'forte', 'circulo', 'mina']) {
        const p = R.gerar({ tipo, tamanho: 'pequeno', seed: 41, terreno: 'campo' }), cv = M.pintar(p, 10), img = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let soma = 0; for (let i = 0; i < img.length; i += 400) soma += img[i] + img[i + 1] + img[i + 2];
        // (o mesmo plano sem os desenhos: o fundo tem de mudar bastante — os desenhos das ruínas estão no motor)
        const q = JSON.parse(JSON.stringify(p)); q.pintados = [];
        const img2 = M.pintar(q, 10).getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let dif = 0; for (let i = 0; i < img.length; i += 40) dif += Math.abs(img[i] - img2[i]);
        out[tipo] = { w: cv.width, h: cv.height, cor: soma > 0, dif: Math.round(dif / 1000) };
      }
      return out;
    });
    ok(Object.values(r).every(x => x.w === 360 && x.h === 280 && x.cor && x.dif >= 8), 'o desenho dos cinco lugares (as ruínas desenhadas por cima do chão): ' + j(r));
  }

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 10).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  console.log(fails ? `${n - fails}/${n} ok — ${fails} falharam` : `${n}/${n} ok`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
