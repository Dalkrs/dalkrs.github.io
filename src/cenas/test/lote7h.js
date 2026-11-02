// Bateria do lote 7 (parte 4b-3a), no navegador, sem o site: as masmorras, nível por nível.
//   · as regras dos planos em muitos sorteios (os quatro tipos, os três tamanhos, com e sem segredos, com e sem a
//     escada de descida): o mesmo sorteio dá o mesmo nível; as escadas no chão, ligadas uma à outra; as portas entre
//     duas casas de chão; os objetos no chão, sem um em cima do outro; as runas escondidas e só com os segredos;
//   · o que cada tipo tem: a masmorra de pedra (o trono ou o salão das colunas, as celas com as grades, o tesouro atrás
//     da porta secreta), a caverna (o lago, o abismo com a ponte, as estalagmites que tapam a visão, os cogumelos que
//     brilham), a cripta (os nichos, os sarcófagos com relevo, o jazigo), a mina (os trilhos, os vagonetes, as escoras,
//     o poço de descida);
//   · a janela "Gerar o nível" (pelos dois cliques numa Entrada posta à mão: "Gerar uma masmorra embaixo…"), o tipo, o
//     tamanho, as chaves, "Gerar outro" e as escolhas guardadas;
//   · a cena: no breu, as paredes, as portas (trancadas e secretas), as runas escondidas, a Saída na escada de subida e
//     a Entrada na de descida (que gera o nível 2, dentro do nível 1); quem joga não vê as Entradas nem as runas, e a
//     porta secreta é parede para ele;
//   · o desenho dos quatro tipos (a rocha escura, o chão mais claro);
//   · (4b-3c) a aba Masmorra do "Gerar um lugar…", sem precisar de uma Entrada: entre as Ruínas e o Porto, sem a hora e
//     o clima; o nível escolhido (o nome acompanha); "Embaixo de" com as cenas na ordem das famílias; com "Nenhuma", a
//     cena solta com a Saída sem destino; com a cena de cima, dentro dela, com a Saída de volta; o id pedido pelo
//     Mapa-múndi e o nome do marcador.
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
  const exato = async (grupo, txt) => { await page.locator(`#${grupo} button`).filter({ hasText: new RegExp('^' + txt + '$') }).click(); await w(450); };
  const chave = async id => { await page.locator('.sw', { has: page.locator('#' + id) }).click(); await w(450); };
  const criar = async () => { await page.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click(); await page.waitForFunction(() => !document.querySelector('.modal'), null, { timeout: 40000 }); await w(400); };
  const doisCliques = async id => {
    await ev(id => { const u = __tc, sc = u.Store.scene(), tk = u.Store.get('tokens', id); u.Render.centerOn(tk.x + sc.cell * tk.size / 2, tk.y + sc.cell * tk.size / 2); }, id);
    await w(150);
    const box = await page.locator('#cv').boundingBox();
    const p2 = await ev(id => { const u = __tc, sc = u.Store.scene(), tk = u.Store.get('tokens', id); return u.Render.toScreen(tk.x + sc.cell * tk.size / 2, tk.y + sc.cell * tk.size / 2); }, id);
    await page.mouse.dblclick(box.x + p2[0], box.y + p2[1]); await w(300);
  };
  const menuTxt = async () => (await page.locator('.menu').innerText()).replace(/\n+/g, ' | ');

  // ================= as regras dos planos =================
  if (parte('regras')) {
    const r = await ev(() => {
      const M = __tc.Masmorra, ruins = [], vistos = { lago: 0, abismo: 0, ponte: 0, celas: 0, trono: 0, salao: 0, tesouroSecreto: 0, nichos: 0, sarcofagos: 0, jazigo: 0, trilho: 0, vagonete: 0, escora: 0, poco: 0, estalagmiteVisao: 0, cogumelos: 0, trancadas: 0, gruta: 0, escondida: 0, colunas: 0 };
      let total = 0;
      for (const tipo of ['pedra', 'caverna', 'cripta', 'mina']) for (const tamanho of ['pequeno', 'medio', 'grande']) for (let s = 1; s <= 12; s++) {
        const seed = s * 104729 + (tipo.length * 7), segredos = s % 4 !== 0, descida = s % 5 !== 0;
        const p = M.gerar({ tipo, tamanho, seed, nivel: 1 + (s % 3), segredos, descida }), W = p.W, H = p.H, k = tipo + '/' + tamanho + ' s' + seed, ruim = m => ruins.push(k + ': ' + m);
        total++;
        const at = (i, jj) => (i >= 0 && jj >= 0 && i < W && jj < H ? +p.grade[jj * W + i] : 0), chao = v => v === 1 || v === 2 || v === 5 || v === 6, anda = (i, jj) => { const v = at(i, jj); return v !== 0 && v !== 4; };
        if (JSON.stringify(M.gerar({ tipo, tamanho, seed, nivel: 1 + (s % 3), segredos, descida })) !== JSON.stringify(p)) ruim('o mesmo sorteio não deu o mesmo nível');
        if (p.W !== M.TAMANHOS[tamanho].W || p.H !== M.TAMANHOS[tamanho].H || p.grade.length !== W * H) ruim('o tamanho');
        // as escadas: no chão, e ligadas uma à outra (andando pelo chão, sem pular o abismo)
        if (!p.sobe) ruim('sem a escada de subida');
        if (descida && !p.desce) ruim('sem a escada de descida');
        if (!descida && p.desce) ruim('a escada de descida sem a chave');
        for (const e of [p.sobe, p.desce]) if (e && !anda(e.mi, e.mj)) ruim('o marcador da escada fora do chão');
        if (p.sobe && p.desce) {
          const vis = new Uint8Array(W * H), fila = [[p.sobe.mi, p.sobe.mj]]; vis[p.sobe.mj * W + p.sobe.mi] = 1;
          for (let q = 0; q < fila.length; q++) { const [i, jj] = fila[q]; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = jj + b; if (anda(x, y) && !vis[y * W + x]) { vis[y * W + x] = 1; fila.push([x, y]); } } }
          if (!vis[p.desce.mj * W + p.desce.mi]) ruim('a descida não se alcança a partir da subida');
          // (e todo o chão se alcança: nada de sala solta)
          for (let q = 0; q < W * H; q++) if (anda(q % W, Math.floor(q / W)) && !vis[q]) { ruim('chão que não se alcança'); break; }
        }
        // as paredes dentro do mapa; as portas entre duas casas abertas
        for (const pw of p.paredes) {
          if ([pw.x1, pw.x2].some(x => x < -0.5 || x > W + 0.5) || [pw.y1, pw.y2].some(y => y < -0.5 || y > H + 0.5)) { ruim('parede fora do mapa'); break; }
          if (Math.hypot(pw.x2 - pw.x1, pw.y2 - pw.y1) < 0.05) { ruim('parede sem comprimento'); break; }
        }
        for (const pw of p.paredes.filter(x => x.k === 'door' && !x.secret && tipo !== 'caverna')) {
          const horiz = Math.abs(pw.y1 - pw.y2) < 1e-6, mx = Math.floor((pw.x1 + pw.x2) / 2), my = Math.floor((pw.y1 + pw.y2) / 2);
          const ab = horiz ? [at(mx, Math.round(pw.y1) - 1), at(mx, Math.round(pw.y1))] : [at(Math.round(pw.x1) - 1, my), at(Math.round(pw.x1), my)];
          if (!ab.every(v => v !== 0)) { ruim('porta encostada na rocha'); break; }
        }
        // os objetos no chão, sem um em cima do outro
        const oc = new Set();
        for (const o of p.objetos) for (let b = 0; b < o.s; b++) for (let a = 0; a < o.s; a++) {
          const key = (o.x + a) + ',' + (o.y + b);
          if (oc.has(key)) ruim('um objeto em cima do outro: ' + o.id);
          oc.add(key);
          if (!chao(at(o.x + a, o.y + b))) ruim('objeto fora do chão: ' + o.id);
        }
        // as runas: escondidas, no chão, e só com os segredos; as portas secretas também
        const runas = p.zonas.filter(z => z.fx === 'runas'), secretas = p.paredes.filter(x => x.secret);
        if (!segredos && (runas.length || secretas.length)) ruim('segredos sem a chave');
        if (runas.some(z => !z.gm || !anda(Math.floor(z.x), Math.floor(z.y)))) ruim('runa à mostra ou fora do chão');
        if (runas.length > 3) ruim('runas demais');
        if (!/^(Masmorra de pedra|Caverna|Cripta|Mina abandonada) · nível \d+ · \d+ × \d+ quadrados/.test(M.resumo(p))) ruim('o resumo: ' + M.resumo(p));
        if (M.nomePadrao(p) !== { pedra: 'Masmorra', caverna: 'Caverna', cripta: 'Cripta', mina: 'Mina' }[tipo] + ' — nível ' + p.nivel) ruim('o nome');
        if (JSON.stringify(p, (kk, v) => (typeof v === 'number' && !Number.isFinite(v) ? 'NAN!' : v)).includes('NAN!')) ruim('número inválido');
        // o que cada tipo tem
        const pint = q => p.pintados.filter(o => o.k === q).length;
        if (tipo === 'pedra') {
          if (p.paredes.some(x => x.k === 'mureta') && p.paredes.some(x => x.k === 'window')) vistos.celas++;
          const tr = p.salas.find(q => q.papel === 'trono');
          if (tr && p.relevo.some(x => x.t === 'plataforma' && x.alt === 0.5 && x.x >= tr.x && x.y >= tr.y && x.x + x.w <= tr.x + tr.w && x.y + x.h <= tr.y + tr.h)) vistos.trono++;
          if (p.salas.some(q => q.papel === 'salao')) vistos.salao++;
          // (o tesouro: a porta dele, na beira da sala, é a secreta)
          const tes = p.salas.find(q => q.papel === 'tesouro'), naBeira = (w, q) => (Math.abs(w.y1 - w.y2) < 1e-6 ? (Math.abs(w.y1 - q.y) < 1e-6 || Math.abs(w.y1 - q.y - q.h) < 1e-6) && Math.min(w.x1, w.x2) >= q.x - 1e-6 && Math.max(w.x1, w.x2) <= q.x + q.w + 1e-6 : (Math.abs(w.x1 - q.x) < 1e-6 || Math.abs(w.x1 - q.x - q.w) < 1e-6) && Math.min(w.y1, w.y2) >= q.y - 1e-6 && Math.max(w.y1, w.y2) <= q.y + q.h + 1e-6);
          if (tes && segredos) { if (secretas.some(w => naBeira(w, tes))) vistos.tesouroSecreto++; else ruim('o tesouro sem a porta secreta'); }
          if (p.paredes.some(x => x.locked)) vistos.trancadas++;
          // (as colunas tapam a visão: oito paredes de visão em volta de cada uma)
          if (pint('coluna')) { vistos.colunas++; if (p.visao.length !== 8 * pint('coluna')) ruim('as colunas não tapam a visão'); }
        }
        if (tipo === 'caverna') {
          if (p.grade.includes('3')) vistos.lago++;
          if (p.grade.includes('4')) vistos.abismo++;
          if (p.grade.includes('6')) vistos.ponte++;
          if (p.visao.length) vistos.estalagmiteVisao++;
          if (p.luzes.length && p.objetos.some(o => o.id === 'cogumelos')) vistos.cogumelos++;
          if (p.gruta) { vistos.gruta++; if (!secretas.length) ruim('a gruta escondida sem a porta secreta'); }
          if (p.grade.includes('4') && !p.grade.includes('6')) ruim('o abismo sem a ponte');
        }
        if (tipo === 'cripta') {
          if (p.grade.includes('5')) vistos.nichos++;
          const sar = p.pintados.filter(o => o.k === 'sarcofago' && !o.grande).length;
          if (sar && p.relevo.filter(x => x.t === 'plataforma' && x.alt === 1).length === sar) vistos.sarcofagos++;
          if (p.salas.some(q => q.papel === 'jazigo')) vistos.jazigo++;
        }
        if (tipo === 'mina') {
          if (pint('trilho')) vistos.trilho++;
          if (pint('vagonete')) vistos.vagonete++;
          if (pint('escora')) vistos.escora++;
          if (p.desce && p.poco && p.grade.includes('4') && p.relevo.some(x => x.t === 'fosso')) vistos.poco++;
          if (p.escondida) { vistos.escondida++; if (!secretas.length) ruim('a galeria escondida sem a porta secreta'); }
        }
      }
      return { total, ruins, vistos };
    });
    ok(r.ruins.length === 0, 'as regras dos planos em ' + r.total + ' sorteios: ' + j(r.ruins.slice(0, 8)));
    const v = r.vistos;
    ok(v.celas >= 4 && v.trono >= 4 && v.salao >= 2 && v.tesouroSecreto >= 6 && v.trancadas >= 6 && v.colunas >= 10, 'a masmorra de pedra: as celas com as grades, o trono ou o salão das colunas (que tapam a visão), o tesouro atrás da porta secreta, as portas trancadas: ' + j([v.celas, v.trono, v.salao, v.tesouroSecreto, v.trancadas, v.colunas]));
    ok(v.lago >= 20 && v.abismo >= 10 && v.ponte === v.abismo && v.estalagmiteVisao >= 30 && v.cogumelos >= 30 && v.gruta >= 10, 'a caverna: o lago, o abismo (sempre com a ponte), as estalagmites que tapam a visão, os cogumelos que brilham, a gruta escondida: ' + j([v.lago, v.abismo, v.estalagmiteVisao, v.cogumelos, v.gruta]));
    ok(v.nichos === 36 && v.sarcofagos >= 20 && v.jazigo >= 25, 'a cripta: os nichos, os sarcófagos (com altura), o jazigo: ' + j([v.nichos, v.sarcofagos, v.jazigo]));
    ok(v.trilho === 36 && v.vagonete >= 30 && v.escora === 36 && v.poco >= 25 && v.escondida >= 10, 'a mina: os trilhos, os vagonetes, as escoras, o poço de descida, a galeria escondida: ' + j([v.trilho, v.vagonete, v.escora, v.poco, v.escondida]));
  }

  // ================= a janela =================
  let cenaMae = null, ent = null;
  if (parte('janela') || parte('cena') || parte('descer')) {
    // uma cena qualquer, com uma Entrada posta à mão
    const prep = await ev(() => {
      const u = __tc, sc = u.Store.scene();
      const tk = u.Props.novo(sc, 'entrada', 5 * sc.cell, 5 * sc.cell, 1, true);
      u.Store.tx('Pôr a entrada', () => u.Store.add('tokens', tk));
      return { id: sc.id, nome: sc.name, ent: tk.id };
    });
    cenaMae = prep.id; ent = prep.ent;
    await doisCliques(ent);
    const m = await menuTxt();
    ok(/AINDA NÃO LEVA A NENHUMA CENA \| Gerar o interior… \| Gerar uma masmorra embaixo… \| Gerar a caverna embaixo \(alinhada com esta cena\)… \| Escolher a cena…/i.test(m), 'os dois cliques na Entrada posta à mão: "Gerar uma masmorra embaixo…" — ' + m);
    await page.locator('.menu-i', { hasText: 'Gerar uma masmorra embaixo' }).click(); await w(800);
    const jan = await ev(() => ({ titulo: document.querySelector('.modal h2, .modal .modal-t, .modal header') ? document.querySelector('.modal h2, .modal .modal-t, .modal header').innerText : '', tipos: [...document.querySelectorAll('#mas-tipo button')].map(b => b.textContent.trim()), tams: [...document.querySelectorAll('#mas-tam button')].map(b => b.textContent.trim() + '=' + (b.title || '')), resumo: document.getElementById('mas-resumo').innerText, nome: document.getElementById('mas-nome').value, txt: document.querySelector('.modal').innerText }));
    ok(j(jan.tipos) === j(['Masmorra de pedra', 'Caverna', 'Cripta', 'Mina abandonada', 'Templo', 'Esgoto', 'Torre de mago', 'Laboratório', 'Fortaleza anã', 'Ruínas élficas', 'Covil', 'Navio naufragado', 'Caverna de gelo', 'Vulcânica', 'Colmeia de fungos', 'Tumba do deserto', 'Ossuário antigo', 'Catacumba de culto', 'Catacumba inundada', 'Cripta nobre', 'Porão', 'Cisterna', 'Calabouço']) && j(jan.tams) === j(['Pequeno=34 × 26 quadrados', 'Médio=46 × 34 quadrados', 'Grande=58 × 42 quadrados']), 'a janela: os doze tipos (lote 28: mais oito) e os três tamanhos (com as medidas): ' + j([jan.tipos, jan.tams]));
    ok(/Gerar o nível 1/.test(jan.txt) && /^Masmorra de pedra · nível 1 · 46 × 34 quadrados/.test(jan.resumo) && jan.nome === 'Masmorra — nível 1', 'o nível 1, a masmorra de pedra média, o nome "Masmorra — nível 1": ' + jan.resumo);
    ok(/Com segredos \(as portas secretas e as runas-armadilha, escondidas dos jogadores\)/.test(jan.txt) && /Com a escada para o nível de baixo/.test(jan.txt) && /no breu/.test(jan.txt), 'as chaves (os segredos, a escada de descida, o relevo) e a nota (no breu)');
    await exato('mas-tipo', 'Caverna');
    ok(/^Caverna · nível 1/.test(await page.locator('#mas-resumo').innerText()) && await page.locator('#mas-nome').inputValue() === 'Caverna — nível 1', 'trocar o tipo refaz o nível (a caverna)');
    const r1 = await page.locator('#mas-resumo').innerText();
    await page.locator('#mas-outro').click(); await w(500);
    const r2 = await page.locator('#mas-resumo').innerText();
    await chave('mas-seg');
    const r3 = await page.locator('#mas-resumo').innerText();
    ok(!/secreta|runa/.test(r3), 'sem os segredos: nem porta secreta nem runa no resumo — ' + r3);
    await chave('mas-seg');
    await chave('mas-desce');
    ok(!/a escada para o nível 2/.test(await page.locator('#mas-resumo').innerText()), 'sem a escada de descida');
    await chave('mas-desce');
    void r1; void r2;
    await exato('mas-tipo', 'Masmorra de pedra');
    await exato('mas-tam', 'Pequeno');
    ok(await ev(() => __tc.App.opt.masTipo === 'pedra' && __tc.App.opt.masTam === 'pequeno'), 'as escolhas ficam guardadas');
    await foto('01-janela-masmorra');
  }

  // ================= a cena =================
  let nivel1 = null;
  if (parte('cena') || parte('descer')) {
    // (uma semente com a porta secreta do tesouro e as runas, na masmorra pequena)
    await ev(() => { const M = __tc.Masmorra, v = M.vivo(); for (let s = 1; s < 300; s++) { const p = M.gerar({ tipo: 'pedra', tamanho: 'pequeno', seed: s }); if (p.paredes.some(x => x.secret) && p.zonas.length && p.paredes.some(x => x.k === 'door' && !x.secret)) { v.st.seed = s; v.refazer(); return; } } });
    await w(300);
    await criar();
    const s = await ev(([mae, ent]) => { const u = __tc, sc = u.Store.scene(); return {
      id: sc.id, nome: sc.name, cols: sc.cols, rows: sc.rows, tom: sc.tone, luz: sc.light, din: sc.fog.dynamic, fundo: !!(sc.bg.asset && u.Store.S.assets[sc.bg.asset]), mae: u.Store.S.pastas.mae[sc.id],
      tipos: sc.walls.reduce((a, x) => (a[x.k + (x.secret ? '-secreta' : '') + (x.locked ? '-trancada' : '')] = (a[x.k + (x.secret ? '-secreta' : '') + (x.locked ? '-trancada' : '')] || 0) + 1, a), {}),
      saida: sc.tokens.filter(x => x.prop === 'saida').map(x => ({ cena: x.cena, oculto: !!x.hidden })), entradas: sc.tokens.filter(x => x.prop === 'entrada').map(x => ({ id: x.id, gera: x.gera, oculto: !!x.hidden })),
      runas: sc.effects.filter(e => e.fx === 'runas').map(e => e.gm), objetos: sc.tokens.filter(x => x.prop && x.prop !== 'saida' && x.prop !== 'entrada').length,
      ligada: (u.Store.get('tokens', ent) || {}).cena, toast: [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ ') }; }, [cenaMae, ent]);
    // (a Entrada ficou na cena de cima: a ligação se confere lá)
    const lig = await ev(([mae, ent]) => { const sc = __tc.Store.S.scenes[mae]; const tk = sc.tokens.find(x => x.id === ent); return tk && tk.cena; }, [cenaMae, ent]);
    nivel1 = s;
    ok(s.nome === 'Masmorra — nível 1' && s.cols === 34 && s.rows === 26 && s.tom === 'breu' && s.luz === 'escuro' && s.din && s.fundo, 'a cena: "Masmorra — nível 1", 34 × 26, no breu (luz escura), com a névoa e o fundo pintado: ' + j([s.nome, s.cols, s.rows, s.tom, s.luz]));
    ok(s.mae === cenaMae && lig === s.id, 'dentro da cena de cima (na família), e a Entrada de cima fica ligada a ela');
    ok(s.tipos.wall > 20 && (s.tipos.door || 0) + (s.tipos['door-trancada'] || 0) >= 3 && (s.tipos['door-secreta'] || 0) >= 1, 'as paredes, as portas e a porta secreta: ' + j(s.tipos));
    ok(s.runas.length >= 1 && s.runas.every(g => g === true), 'as runas-armadilha, escondidas dos jogadores: ' + s.runas.length);
    ok(s.saida.length === 1 && s.saida[0].cena === cenaMae && s.saida[0].oculto, 'a Saída (oculta) na escada de subida leva de volta');
    ok(s.entradas.length === 1 && s.entradas[0].oculto && j(Object.keys(s.entradas[0].gera)) === j(['t', 'm', 'n', 'tam', 'e', 's', 'lc']) && s.entradas[0].gera.t === 'masmorra' && s.entradas[0].gera.m === 'pedra' && s.entradas[0].gera.n === 2 && s.entradas[0].gera.tam === 'pequeno', 'a Entrada (oculta) na escada de descida sabe o nível 2 (e a largura, lote 28): ' + j(s.entradas[0] && s.entradas[0].gera));
    ok(s.objetos >= 8, 'os móveis, as tochas, os braseiros: ' + s.objetos);
    ok(/"Masmorra — nível 1" criada, dentro de ".*"\. A Saída, na escada de subida, leva de volta; a Entrada da escada de descida gera o nível 2\./.test(s.toast), 'o aviso: ' + s.toast);
    await clearToasts();
    await ev(() => { __tc.Render.fit(); __tc.Render.request(); }); await w(400);
    await foto('02-cena-masmorra');
    // quem joga: não vê as Entradas nem as runas; a porta secreta não é porta para ele (nem ícone)
    const vis = await ev(() => {
      const u = __tc, sc = u.Store.scene();
      u.Store.S.players = [{ id: 'p1', name: 'Dalmo', color: '#4fb8e0' }]; u.UI.setViewer('p1');
      const r = { entradas: sc.tokens.filter(x => x.prop === 'entrada' || x.prop === 'saida').map(x => u.tokShown(x, sc)), runas: sc.effects.filter(e => e.fx === 'runas').map(e => u.fxVisible(e, sc)), portas: u.doorSpots(sc).map(d => d.w ? !!d.w.secret : null) };
      u.UI.setViewer('gm');
      return r;
    });
    ok(vis.entradas.every(x => x === false) && vis.runas.every(x => !x) && vis.portas.every(x => x === false), 'quem joga não vê as Entradas, a Saída nem as runas; a porta secreta não tem ícone para ele: ' + j(vis));
  }

  // ================= descer: o nível 2 =================
  if (parte('descer')) {
    const e2 = nivel1.entradas[0].id;
    // (as últimas escolhas da janela são outras: o que vale é o que a escada de descida sabe)
    await ev(() => { __tc.App.opt.masTipo = 'mina'; __tc.App.opt.masTam = 'grande'; });
    await doisCliques(e2);
    const m = await menuTxt();
    ok(/Gerar o nível 2…/.test(m), 'os dois cliques na Entrada da escada de descida: "Gerar o nível 2…" — ' + m);
    await page.locator('.menu-i', { hasText: 'Gerar o nível 2' }).click(); await w(800);
    const jan = await ev(() => ({ txt: document.querySelector('.modal').innerText, resumo: document.getElementById('mas-resumo').innerText, sel: [...document.querySelectorAll('#mas-tipo button')].filter(b => b.classList.contains('on') || b.getAttribute('aria-pressed') === 'true').map(b => b.textContent.trim()) }));
    ok(/Gerar o nível 2/.test(jan.txt) && /^Masmorra de pedra · nível 2 · 34 × 26 quadrados/.test(jan.resumo), 'a janela já vem com o nível 2, o tipo e o tamanho do de cima: ' + jan.resumo);
    await exato('mas-tipo', 'Cripta');
    await criar();
    const s2 = await ev(() => { const u = __tc, sc = u.Store.scene(); return { id: sc.id, nome: sc.name, mae: u.Store.S.pastas.mae[sc.id], saida: (sc.tokens.find(x => x.prop === 'saida') || {}).cena, desce: (sc.tokens.find(x => x.prop === 'entrada') || {}).gera }; });
    ok(s2.nome === 'Cripta — nível 2' && s2.mae === nivel1.id && s2.saida === nivel1.id && s2.desce && s2.desce.n === 3 && s2.desce.m === 'cripta', 'o nível 2 (a cripta) sai dentro do nível 1, com a Saída de volta para ele e a Entrada do nível 3: ' + j(s2));
    await ev(() => { __tc.Render.fit(); __tc.Render.request(); }); await clearToasts(); await w(400);
    await foto('03-cena-cripta');
  }

  // ================= (4b-3c) a aba Masmorra do "Gerar um lugar…" =================
  if (parte('aba')) {
    // duas cenas, uma dentro da outra (a lista "Embaixo de" mostra a de dentro recuada)
    const prep = await ev(() => {
      const u = __tc, a = u.newScene('Superfície'), b = u.newScene('Porão velho');
      u.normalizeScene(a); u.normalizeScene(b); u.Store.addScene(a); u.Store.addScene(b); u.UI.porNaFamilia(b.id, a.id);
      u.App.opt.masTipo = 'pedra'; u.App.opt.masTam = 'medio'; u.App.opt.masSeg = true; u.App.opt.masDesce = true;
      return { a: a.id, b: b.id };
    });
    await page.locator('#sceneBtn').click(); await w(200);
    await page.locator('.menu-i', { hasText: 'Gerar um lugar' }).click(); await w(700);
    const abas = await ev(() => [...document.querySelectorAll('#ger-lugar button')].map(b => b.textContent.trim()));
    ok(j(abas) === j(['Vilarejo', 'Cidade', 'Tribo', 'Porto', 'Encontro', 'Região livre', 'Lago', 'Praia', 'Penhasco', 'Desfiladeiro', 'Castelo', 'Ruínas', 'Cemitério', 'Masmorra', 'Catacumbas', 'Cena do crime', 'Arena']), 'a aba Masmorra, entre as Ruínas e o Porto: ' + j(abas));
    ok(await ev(() => !!document.getElementById('ger-hora') && !!document.getElementById('ger-clima')), '(nas outras abas, a hora e o clima)');
    await page.locator('#ger-lugar button', { hasText: 'Masmorra' }).click(); await w(700);
    const a0 = await ev(() => ({ lugar: __tc.Gerador.vivo().lugar, plano: __tc.Gerador.vivo().estado.plano.lugar, hora: !!document.getElementById('ger-hora'), clima: !!document.getElementById('ger-clima'), est: !!document.getElementById('ger-est'),
      txt: document.querySelector('.ger-op').innerText.replace(/\n+/g, ' | '), resumo: document.getElementById('ger-resumo').innerText, nome: document.getElementById('ger-nome').value,
      sob: [...document.querySelectorAll('#mas-sob option')].map(o => [o.value, o.textContent]), dica: document.getElementById('ger-dica').innerText }));
    ok(a0.lugar === 'masmorra' && a0.plano === 'masmorra' && !a0.hora && !a0.clima && a0.est, 'a aba Masmorra: sem a hora e o clima (lá embaixo é breu), com o estilo: ' + j([a0.lugar, a0.hora, a0.clima]));
    ok(/Tipo \| Masmorra de pedra \| Caverna \| Cripta \| Mina abandonada \| Templo \| Esgoto \| Torre de mago \| Laboratório \| Fortaleza anã \| Ruínas élficas \| Covil \| Navio naufragado \| Caverna de gelo \| Vulcânica \| Colmeia de fungos \| Tumba do deserto \| Largura dos corredores \| 1 quadrado \| 2 quadrados \| 3 quadrados \| Tamanho \| Pequeno \| Médio \| Grande \| Nível \| Embaixo de \| .*Com segredos .* \| Com a escada para o nível de baixo/.test(a0.txt) && /Com relevo \(os estrados, os sarcófagos, a água, o abismo\)/.test(a0.txt), 'as escolhas: o tipo (doze, lote 28), a largura dos corredores (lote 28), o tamanho, o nível, "Embaixo de", os segredos e a escada — ' + a0.txt.slice(0, 300));
    ok(/^Masmorra de pedra · nível 1 · 46 × 34 quadrados/.test(a0.resumo) && a0.nome === 'Masmorra — nível 1' && /não tem partes para travar/.test(a0.dica), 'o nível 1, o nome e a dica (sem partes para travar): ' + a0.resumo);
    const iA = a0.sob.findIndex(o => o[0] === prep.a), iB = a0.sob.findIndex(o => o[0] === prep.b);
    ok(a0.sob[0][0] === '' && /Nenhuma/.test(a0.sob[0][1]) && iA > 0 && iB === iA + 1 && /^\u00a0+Porão velho$/.test(a0.sob[iB][1]) && a0.sob[iA][1] === 'Superfície', '"Embaixo de": "Nenhuma" e as cenas na ordem das famílias (a de dentro recuada): ' + j(a0.sob.slice(0, 6)));
    // o nível 3, a cripta: o nome acompanha
    { const f = page.locator('#mas-nivel'); await f.fill('3'); await f.press('Tab'); await w(450); }
    await exato('mas-tipo', 'Cripta');
    const a1 = await ev(() => ({ resumo: document.getElementById('ger-resumo').innerText, nome: document.getElementById('ger-nome').value, n: __tc.Gerador.vivo().estado.plano.nivel }));
    ok(a1.n === 3 && /^Cripta · nível 3 · 46 × 34 quadrados/.test(a1.resumo) && a1.nome === 'Cripta — nível 3', 'o nível 3 e a cripta: "Cripta — nível 3": ' + a1.resumo);
    // as chaves: sem os segredos, nem porta secreta nem runa; sem a escada de descida, nada do nível de baixo
    await chave('mas-seg');
    const r3 = await page.locator('#ger-resumo').innerText();
    await chave('mas-seg');
    await chave('mas-desce');
    const r4 = await page.locator('#ger-resumo').innerText();
    await chave('mas-desce');
    ok(!/secreta|runa/.test(r3) && !/a escada para o nível 4/.test(r4) && /a escada para o nível 4/.test(await page.locator('#ger-resumo').innerText()), 'as chaves: sem os segredos, nem porta secreta nem runa; sem a escada, nada do nível 4 — ' + j([r3, r4]));
    // com "Nenhuma": a cena solta, a Saída sem destino
    await criar();
    const c1 = await ev(() => { const u = __tc, sc = u.Store.scene(); return { id: sc.id, nome: sc.name, tom: sc.tone, mae: u.Store.S.pastas.mae[sc.id] || null, saida: sc.tokens.filter(x => x.prop === 'saida').map(x => ({ cena: x.cena || null, oculto: !!x.hidden })), desce: (sc.tokens.find(x => x.prop === 'entrada') || {}).gera, toast: [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ ') }; });
    ok(c1.nome === 'Cripta — nível 3' && c1.tom === 'breu' && c1.mae === null, 'com "Nenhuma": "Cripta — nível 3", no breu, solta (fora de qualquer família): ' + j([c1.nome, c1.tom, c1.mae]));
    ok(c1.saida.length === 1 && c1.saida[0].cena === null && c1.saida[0].oculto && c1.desce && c1.desce.m === 'cripta' && c1.desce.n === 4, 'a Saída (oculta) sem destino e a Entrada da escada de descida no nível 4: ' + j([c1.saida, c1.desce]));
    ok(/"Cripta — nível 3" criada: uma cena solta — a Saída, na escada de subida, ainda não leva a lugar nenhum/.test(c1.toast), 'o aviso diz que a Saída ainda não leva a lugar nenhum: ' + c1.toast);
    await clearToasts();
    ok(await ev(() => __tc.App.opt.masTipo === 'cripta' && __tc.App.opt.genLugar === 'masmorra'), 'as escolhas ficam guardadas (o tipo, a aba)');
    // de novo, já na aba Masmorra: embaixo da Superfície (dentro dela, a Saída de volta)
    await page.locator('#sceneBtn').click(); await w(200);
    await page.locator('.menu-i', { hasText: 'Gerar um lugar' }).click(); await w(700);
    ok(await ev(() => __tc.Gerador.vivo().lugar === 'masmorra' && __tc.Gerador.vivo().estado.op.nivel === 1 && __tc.Gerador.vivo().estado.op.sob === ''), 'abre de novo na aba Masmorra, no nível 1 e sem cena de cima');
    await page.locator('#mas-sob').selectOption(prep.a); await w(450);
    ok(await ev(id => __tc.Gerador.vivo().estado.op.sob === id && document.getElementById('mas-sob').value === id, prep.a), 'escolher a cena de cima');
    await foto('04-aba-masmorra');
    await criar();
    const c2 = await ev(() => { const u = __tc, sc = u.Store.scene(); return { nome: sc.name, mae: u.Store.S.pastas.mae[sc.id] || null, saida: (sc.tokens.find(x => x.prop === 'saida') || {}).cena || null, toast: [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ ') }; });
    ok(c2.nome === 'Cripta — nível 1' && c2.mae === prep.a && c2.saida === prep.a && /criada, dentro de "Superfície": a Saída, na escada de subida, leva de volta/.test(c2.toast), 'embaixo da Superfície: dentro dela (na família), com a Saída de volta: ' + j([c2.nome, c2.mae === prep.a, c2.saida === prep.a, c2.toast]));
    await clearToasts();
    // o que o Mapa-múndi manda: o nome do marcador e o id da cena (o marcador já leva a ela)
    await ev(() => __tc.Gerador.abrir('masmorra', { nome: 'Covil do Lich', id: 'cena_mundo_tst4b3c' })); await w(700);
    ok(await ev(() => __tc.Gerador.vivo().lugar === 'masmorra' && document.getElementById('ger-nome').value === 'Covil do Lich'), 'aberta pelo Mapa-múndi: a aba Masmorra com o nome do marcador');
    await criar();
    const c3 = await ev(() => { const sc = __tc.Store.scene(); return { id: sc.id, nome: sc.name }; });
    ok(c3.id === 'cena_mundo_tst4b3c' && c3.nome === 'Covil do Lich', 'a cena com o id que o marcador espera: ' + j(c3));
    await clearToasts();
  }

  // ================= o desenho =================
  if (parte('desenho')) {
    const r = await ev(() => {
      const M = __tc.Masmorra, out = {};
      for (const tipo of ['pedra', 'caverna', 'cripta', 'mina']) {
        const p = M.gerar({ tipo, tamanho: 'pequeno', seed: 31 }), c = 12, cv = M.pintar(p, c), img = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let sr = 0, nr = 0, sc = 0, nc = 0;
        for (let jj = 0; jj < p.H; jj++) for (let i = 0; i < p.W; i++) {
          const v = +p.grade[jj * p.W + i], k = ((jj * c + c / 2) * cv.width + i * c + c / 2) * 4, lum = img[k] * 0.3 + img[k + 1] * 0.59 + img[k + 2] * 0.11;
          if (v === 0) { sr += lum; nr++; } else if (v === 1 || v === 2) { sc += lum; nc++; }
        }
        out[tipo] = { rocha: Math.round(sr / nr), chao: Math.round(sc / nc), w: cv.width, h: cv.height };
      }
      return out;
    });
    ok(Object.values(r).every(x => x.chao > x.rocha + 25), 'o desenho dos quatro tipos: a rocha escura, o chão mais claro: ' + j(r));
  }

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 10).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  console.log(fails ? `${n - fails}/${n} ok — ${fails} falharam` : `${n}/${n} ok`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
