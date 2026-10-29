// Bateria do lote 38 nas Cenas (no navegador, sem o site): as onze arenas novas.
//   · a janela: os 19 tipos agrupados por tema (Mortos e sombras, Feras, Fogo e gelo, Pedra e metal, Magia), o que a
//     arena escolhida tem (embaixo), as mudanças próprias de cada arena só na lista dela, a grade só onde tem grade;
//   · os planos: cada arena nova, nos três tamanhos e com sementes diferentes, sai sem erro, com o chefe no lugar dele
//     (alcançável a pé da entrada), os pontos de reforço em chão bom e as duas fases com as mudanças próprias;
//   · as fases na cena: os caixões se abrem (as crias saem dos caixões), o gelo racha (o buraco de água), as árvores
//     caem (meia cobertura), o portal do fosso se abre (a zona escondida aparece, os diabretes saem dele), as estantes
//     desabam (paredes), o teto da mina desmorona (o monte de entulho); cada uma com prévia e Desfazer;
//   · a amurada do navio (a mureta em volta do convés) e a prancha da entrada.
// FOTOS=<pasta> guarda a janela e as onze arenas.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
const j = JSON.stringify;
const NOVAS = ['vampiro', 'clareira', 'fosso', 'ratos', 'lago', 'forja', 'fantasma', 'biblioteca', 'pantano', 'espelhos', 'mina'];

(async () => {
  const t = await open();
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const toasts = () => ev(() => Array.from(document.querySelectorAll('.toast')).map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const clearToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const foto = async nome => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const opcoes = async id => (await page.locator('#' + id + ' option').allInnerTexts()).join(' | ');

  // ---------- 1) a janela ----------
  await passo('a janela', async () => {
    await ev(() => __tc.Gerador.abrir('arena')); await w(500);
    const grupos = await page.locator('#ar-tipo .ar-gn').allInnerTexts();
    ok(grupos.join('|') === 'Mortos e sombras|Feras|Fogo e gelo|Pedra e metal|Magia' && await page.locator('#ar-tipo .seg-b').count() === 19,
      'os 19 tipos em cinco grupos por tema: ' + grupos.join(' / ') + ' — ' + await page.locator('#ar-tipo .seg-b').count());
    await page.locator('#ar-tipo .seg-b', { hasText: 'Cripta do vampiro' }).click(); await w(400);
    ok(await page.locator('#ar-tipo .seg-b.on').count() === 1 && (await page.locator('#ar-tipo .seg-b.on').innerText()) === 'Cripta do vampiro',
      'só um tipo marcado (o escolhido), em qualquer grupo');
    ok(/^Cripta do vampiro: A cripta do conde/.test(await page.locator('#ar-nota').innerText()), 'embaixo, o que a arena tem: ' + await page.locator('#ar-nota').innerText());
    ok(await page.locator('#ger-nome').inputValue() === 'A cripta do vampiro', 'o nome de começo: ' + await page.locator('#ger-nome').inputValue());
    const pv = await ev(() => { const p = __tc.Gerador.vivo().estado.plano; return p.arena.fases.map(f => f.m.map(m => (m.esp || (m.k === 'zona' ? 'zona:' + m.fx : m.k)) + ':' + m.k)); });
    ok(j(pv) === j([['caixoes:reforcos', 'morcegos:zona'], ['luz:luz', 'zona:luaSangue:zona']]), 'as fases da cripta: os caixões e os morcegos; as luzes e a lua de sangue — ' + j(pv));
    ok((await page.locator('#ar-f2-0-k').inputValue()) === 'caixoes', 'a lista da mudança mostra "Os caixões se abrem"');
    const op = await opcoes('ar-f2-0-k');
    ok(/Os caixões se abrem/.test(op) && /A nuvem de morcegos/.test(op) && !/O uivo da alcateia/.test(op) && !/O gelo racha/.test(op) && /A grade da entrada fecha/.test(op),
      'na lista, as mudanças da cripta (e as de sempre, com a grade); as das outras arenas, não: ' + op);
    await foto('l38-janela');
    await page.locator('#ar-tipo .seg-b', { hasText: 'Covil do dragão' }).click(); await w(400);
    const op2 = await opcoes('ar-f2-0-k');
    ok(!/Os caixões se abrem/.test(op2) && !/A grade da entrada fecha/.test(op2) && /A lava sobe/.test(op2), 'no covil, nenhuma mudança própria das novas, nem a grade (não tem): ' + op2);
    await page.locator('#ar-tipo .seg-b', { hasText: 'Mina abandonada' }).click(); await w(400);
    ok(/golem de cristal/.test(await page.locator('#ar-nota').innerText()) && /O teto desmorona/.test(await opcoes('ar-f2-0-k')), 'a mina abandonada, com o golem de cristal e o teto que desmorona');
    await page.locator('#ar-tipo .seg-b', { hasText: 'Cripta do vampiro' }).click(); await w(400);
    await page.locator('.modal .btn.primary').click(); await w(1500);
  });

  // ---------- 2) os planos: as onze, nos três tamanhos, com sementes diferentes ----------
  await passo('os planos', async () => {
    const r = await ev(NOVAS => {
      const { Masmorra } = __tc, M = Masmorra, prob = [], ref = {};
      const pisavel = (p, i, j) => { const v = i >= 0 && j >= 0 && i < p.W && j < p.H ? +p.grade[j * p.W + i] : M.ROCHA; return v !== M.ROCHA && v !== M.ABISMO && v !== M.LAVA; };
      const alcanca = (p, de, ate) => {
        const vis = new Uint8Array(p.W * p.H), fila = [de]; vis[de[1] * p.W + de[0]] = 1;
        while (fila.length) { const [i, j] = fila.shift(); if (i === ate[0] && j === ate[1]) return true; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (pisavel(p, x, y) && !vis[y * p.W + x]) { vis[y * p.W + x] = 1; fila.push([x, y]); } } }
        return false;
      };
      for (const tipo of NOVAS) for (const tamanho of ['pequeno', 'medio', 'grande']) for (const seed of [3, 17, 101]) {
        const nome = tipo + '/' + tamanho + '/' + seed;
        let p;
        try { p = M.gerar({ tipo: 'arena', arena: tipo, tamanho, seed }); } catch (e) { prob.push(nome + ': ' + e.message); continue; }
        const a = p.arena, T = M.TAM_ARENA[tamanho];
        if (p.W !== T.W || p.H !== T.H) prob.push(nome + ': o tamanho ' + p.W + '×' + p.H);
        const ch = [Math.floor(a.chefe.x + 1), Math.floor(a.chefe.y + 1)], en = [Math.floor(a.entrada.x), Math.floor(a.entrada.y)];
        if (!pisavel(p, ...ch)) prob.push(nome + ': o chefe fora do chão');
        else if (!pisavel(p, ...en)) prob.push(nome + ': a entrada fora do chão');
        else if (!alcanca(p, en, ch)) prob.push(nome + ': da entrada não se chega ao chefe');
        if (a.reforcos.length < 2) prob.push(nome + ': ' + a.reforcos.length + ' pontos de reforço');
        for (const [x, y] of a.reforcos) if (!pisavel(p, Math.floor(x), Math.floor(y))) prob.push(nome + ': um reforço fora do chão');
        const base = M.FASES_ARENA[tipo];
        if (a.fases.length !== 2) prob.push(nome + ': ' + a.fases.length + ' fases');
        a.fases.forEach((f, i) => f.m.forEach((m, k) => {
          const quer = base[i][k];
          if (M.ESPECIAIS[quer]) { if (m.esp !== quer || !m.txt) prob.push(nome + ': a mudança ' + quer + ' saiu ' + JSON.stringify(m).slice(0, 80)); }
          else if ((m.k === 'zona' ? 'zona:' + m.fx : m.k) !== quer) prob.push(nome + ': a mudança ' + quer + ' saiu ' + m.k);
          if (m.k === 'zona' && !(__tc.FX && __tc.FX.P[m.fx])) prob.push(nome + ': a zona ' + m.fx + ' não existe');
          if (m.k === 'zona' && ![m.x, m.y, m.r].every(Number.isFinite)) prob.push(nome + ': a zona ' + m.fx + ' sem lugar');
          if (m.k === 'reforcos' && (!m.pts || m.pts.length < 2)) prob.push(nome + ': ' + (m.esp || 'reforcos') + ' com ' + (m.pts || []).length + ' pontos');
          if (m.k === 'reforcos') for (const [x, y] of m.pts || []) if (!pisavel(p, Math.floor(x), Math.floor(y))) prob.push(nome + ': ' + (m.esp || 'reforcos') + ' num ponto fora do chão');
          if (m.k === 'muro' && (!m.linhas || !m.linhas.length || m.linhas.some(l => l.length !== 4 || !l.every(Number.isFinite)))) prob.push(nome + ': o muro ' + m.esp + ' sem linhas');
          if (m.k === 'desaba' && ![m.x, m.y, m.w, m.h].every(Number.isFinite)) prob.push(nome + ': o chão que muda sem lugar');
        }));
        if (tamanho === 'medio' && seed === 3) ref[tipo] = { chefe: M.CHEFE_ARENA[tipo], lac: M.LACAIO_ARENA[tipo], pts: a.reforcos.length, paredes: p.paredes.length, mureta: p.paredes.filter(w => w.k === 'mureta').length, visao: p.visao.length };
        try { M.pintar(p, 6); } catch (e) { prob.push(nome + ': o desenho: ' + e.message); }
      }
      return { prob, ref };
    }, NOVAS);
    ok(r.prob.length === 0, 'as onze arenas, nos três tamanhos e com três sementes: o chefe alcançável da entrada, os reforços no chão, as fases certas e o desenho — ' + r.prob.slice(0, 8).join(' ¶ '));
    ok(r.ref.fantasma && r.ref.fantasma.mureta >= 8, 'o navio: a amurada em volta do convés (' + (r.ref.fantasma || {}).mureta + ' pedaços de mureta)');
    ok(r.ref.biblioteca && r.ref.biblioteca.visao >= 6 && r.ref.espelhos.visao >= 4, 'as estantes e os espelhos de pé tapam a visão: ' + j([(r.ref.biblioteca || {}).visao, (r.ref.espelhos || {}).visao]));
    ok(j(NOVAS.map(k => r.ref[k] && r.ref[k].chefe)) === j(['O conde vampiro', 'O lobisomem alfa', 'O senhor do fosso', 'O Rei Rato', 'A rainha do inverno', 'O golem da forja', 'O capitão fantasma', 'O bibliotecário lich', 'A bruxa do pântano', 'O reflexo sem dono', 'O golem de cristal']),
      'os chefes: ' + NOVAS.map(k => r.ref[k] && r.ref[k].chefe).join(', '));
  });

  // ---------- 3) as fases na cena ----------
  const criar = tipo => ev(async tipo => {
    const { Masmorra, UI } = __tc;
    const p = Masmorra.gerar({ tipo: 'arena', arena: tipo, tamanho: 'medio', seed: 11 });
    const sc = await Masmorra.criar(p, Masmorra.NOME_ARENA[tipo], null, { relevo: true });
    UI.switchScene(sc.id);
    return JSON.parse(JSON.stringify({ id: sc.id, pt: p.arena.pt, fases: sc.fases.map(f => f.m.map(m => m.esp || m.k)) }));
  }, tipo);
  const acionar = async i => {
    await clearToasts();
    await ev(i => { __tc.Arena.acionar(i); }, i); await w(250);
    const prev = (await page.locator('#ar-previa').innerText()).replace(/\s+/g, ' ');
    await page.locator('.modal .btn.primary').click(); await w(400);
    return prev;
  };
  const cena = () => ev(() => { const sc = __tc.Store.scene(); return JSON.parse(JSON.stringify({ tok: sc.tokens.filter(t => !t.hidden && !t.prop).map(t => t.name), fx: sc.effects.map(e => e.fx + (e.gm ? '(gm)' : '')), ter: sc.shapes.filter(s => s.ter).map(s => s.ter.t + ':' + s.ter.h), paredes: sc.walls.map(w => w.k), feitas: (sc.fases || []).map(f => !!f.feita) })); });

  await passo('a cripta do vampiro', async () => {
    const c0 = await cena();
    ok(c0.tok.includes('O conde vampiro') && (await ev(() => __tc.Store.scene().tokens.filter(t => t.prop === 'reforco' && t.hidden).length)) >= 2, 'a cripta criada pela janela: o conde no lugar dele e os pontos de reforço escondidos');
    const prev = await acionar(0);
    ok(/os caixões se abrem: \d crias vampíricas se levantam/.test(prev) && /a nuvem de morcegos cobre o meio da cripta/.test(prev), 'acionar a fase 2 mostra antes: ' + prev);
    const c1 = await cena(), crias = c1.tok.filter(n => /^Cria vampírica \d$/.test(n)).length;
    ok(crias >= 2 && c1.fx.includes('sombra') && c1.feitas.join() === 'true,false', 'as crias saem dos caixões (' + crias + ') e a nuvem de morcegos cobre o meio — ' + j(c1.fx));
    ok(/Fase 2: os caixões se abrem/.test(await toasts()) && /Desfazer/.test(await toasts()), 'o aviso, com Desfazer: ' + await toasts());
    await foto('l38-cripta-fase2');
    await ev(() => __tc.Tools.undo()); await w(300);
    const c2 = await cena();
    ok(c2.tok.filter(n => /^Cria vampírica/.test(n)).length === 0 && !c2.fx.includes('sombra') && c2.feitas.join() === 'false,false', 'o Desfazer volta tudo');
  });
  await passo('o lago congelado', async () => {
    const c = await criar('lago');
    ok(j(c.fases) === j([['desaba', 'zona'], ['reforcos', 'zona']]) || j(c.fases) === j([['racha', 'nevasca'], ['reforcos', 'zona']]), 'as fases do lago: ' + j(c.fases));
    const prev = await acionar(0);
    const d = await cena();
    ok(/o gelo racha no meio do lago/.test(prev) && d.ter.includes('agua:-1.5') && d.fx.includes('nevasca'), 'o gelo racha (o buraco de água gelada) e a nevasca: ' + j(d.ter) + ' ' + j(d.fx));
  });
  await passo('a clareira', async () => {
    const c = await criar('clareira');
    const antes = (await cena()).paredes.filter(k => k === 'mureta').length;
    await acionar(0);
    const lobos = (await cena()).tok.filter(n => /^Lobo \d$/.test(n)).length;
    ok(lobos >= 2, 'o uivo: os lobos saem da mata (' + lobos + ')');
    const prev = await acionar(1), d = await cena();
    ok(/as árvores velhas caem atravessadas/.test(prev) && d.paredes.filter(k => k === 'mureta').length === antes + c.pt.arvores.length && d.fx.includes('escuridao'), 'as árvores caem (' + c.pt.arvores.length + ' muretas novas) e a escuridão: ' + prev);
    await foto('l38-clareira-arvores');
  });
  await passo('o fosso infernal', async () => {
    await criar('fosso');
    ok((await cena()).fx.includes('portal(gm)'), 'o portal do fosso começa escondido');
    const prev = await acionar(0), d = await cena();
    ok(/o portal do fosso se abre: 3 diabretes/.test(prev) && d.fx.includes('portal') && !d.fx.includes('portal(gm)') && d.tok.filter(n => /^Diabrete \d$/.test(n)).length === 3,
      'o portal se abre (a zona aparece) e saem os 3 diabretes: ' + j(d.fx) + ' ' + d.tok.join(', '));
  });
  await passo('a biblioteca proibida', async () => {
    const c = await criar('biblioteca');
    const antes = (await cena()).paredes.filter(k => k === 'wall').length;
    await acionar(0);
    ok((await cena()).tok.filter(n => /^Livro vivo \d$/.test(n)).length >= 2 && (await cena()).fx.includes('runas'), 'os livros vivos saltam das estantes e as runas aparecem');
    await acionar(1);
    ok((await cena()).paredes.filter(k => k === 'wall').length === antes + c.pt.queda.length && c.pt.queda.length === 2, 'as estantes desabam (' + c.pt.queda.length + ' paredes novas)');
  });
  await passo('a mina abandonada', async () => {
    await criar('mina');
    ok((await cena()).tok.includes('O golem de cristal'), 'o golem de cristal no lugar dele');
    const prev = await acionar(0), d = await cena();
    ok(/o teto desmorona/.test(prev) && d.ter.includes('morro:1.5') && d.fx.includes('toxica'), 'o teto desmorona (o monte de entulho) e o gás: ' + j(d.ter));
  });
  await passo('o navio fantasma', async () => {
    await criar('fantasma');
    const r = await ev(() => { const sc = __tc.Store.scene(); const e = sc.tokens.find(t => t.prop === 'chegada'); return { mureta: sc.walls.filter(w => w.k === 'mureta').length, chegada: !!e }; });
    ok(r.mureta >= 8 && r.chegada, 'a cena do navio: a amurada (' + r.mureta + ' muretas) e a chegada na prancha');
  });

  // ---------- 4) as fotos das onze ----------
  if (SHOTS) for (const tipo of NOVAS) {
    await criar(tipo); await clearToasts(); await w(500);
    await ev(() => { if (__tc.View && __tc.View.fit) __tc.View.fit(); }); await w(300);
    await foto('l38-' + tipo);
  }

  if (t.errs.length) console.log(t.errs.slice(0, 8).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
