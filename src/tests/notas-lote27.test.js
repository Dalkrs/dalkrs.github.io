// Bloco de notas do mestre, lote 27: o @ e o #, sem rede (o módulo tc/notas.js com uma mesa de mentira).
//   · @ abre a lista das fichas; # a de lugares e coisas (sem as fichas); Enter põe o link no texto (guarda a aba e o
//     alvo, não o nome); o link vai junto quando o texto é salvo e passa pelo limpar;
//   · ao abrir de novo, o nome é o de agora; o que não existe mais fica cinza (com o nome antigo);
//   · clicar no link leva até lá (a casca recebe a aba e o alvo).
const { start, checker } = require('./lib');
const { ok, end } = checker();
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'notas27', w: 1300, h: 850 });
  const w = ms => P.waitForTimeout(ms);
  const E = (fn, a) => P.evaluate(fn, a);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await P.goto(t.base + 'versao.json'); await w(100);
  await E(() => { document.documentElement.innerHTML = '<head></head><body><button id="bt">Notas</button><aside id="painel" hidden style="width:420px;height:700px;display:flex;flex-direction:column"></aside></body>'; });
  await P.addStyleTag({ content: '.nt-texto{min-height:200px;border:1px solid #888} .nt-ref.morta{color:gray} [hidden]{display:none!important}' });
  await P.addScriptTag({ url: t.base + 'tc/busca.js' });
  await P.addScriptTag({ url: t.base + 'tc/notas.js' });
  await E(() => {
    const ouv = {}, emit = (ev, ...a) => (ouv[ev] || []).forEach(f => f(...a));
    const docs = new Map();
    window.__idas = []; window.__ind = [
      { tipo: 'ficha', nome: 'Dain', sub: 'NPC', aba: 'fichas', alvo: { pc: 'p1' }, k: 'dain', ks: 'npc' },
      { tipo: 'ficha', nome: 'Dora', sub: 'NPC', aba: 'fichas', alvo: { pc: 'p2' }, k: 'dora', ks: 'npc' },
      { tipo: 'cena', nome: 'Dunas de Sal', sub: 'Cena', aba: 'cenas', alvo: { cena: 'c1' }, k: 'dunas de sal', ks: 'cena' },
      { tipo: 'habilidade', nome: 'Dança das Lâminas', sub: 'Habilidade · Samurai', aba: 'arvore', alvo: { arvore: 'a1', no: 'n1' }, k: 'danca das laminas', ks: 'habilidade samurai' }];
    window.__emit = emit;
    const dados = { on: (ev, f) => (ouv[ev] = ouv[ev] || []).push(f), col: () => ({ pronta: Promise.resolve(), todas: () => [...docs.values()], pegar: id => docs.get(id) || null,
      gravar: (id, c) => { docs.set(id, Object.assign({ id }, docs.get(id) || {}, c)); emit('muda', 'documentos', docs.get(id), 'local'); }, apagar: id => docs.delete(id) }) };
    window.__docs = docs;
    const mesas = { atual: { id: 'm1', cargo: 'mestre', campanhas: [] }, on: () => {}, campanha: () => null };
    window.__api = TC.notas.iniciar({ mesas, dados, toast: m => (window.__toast = m), confirmar: () => {}, botao: document.getElementById('bt'), painel: document.getElementById('painel'),
      guarda: { ler: () => null, gravar: () => {} }, ir: (aba, alvo) => window.__idas.push([aba, alvo]),
      indice: () => Promise.resolve(window.__ind.slice()), buscar: (l, q, n) => TC.busca.buscar(l, q, n) });
    window.__api.abrir(true);
  });
  await w(150);
  await P.locator('#nt-novo').click(); await w(200);
  const ed = P.locator('#nt-texto');

  await passo('o @', async () => {
    await ed.click(); await P.keyboard.type('Falar com @Da'); await w(250);
    const l = await E(() => [...document.querySelectorAll('.nt-sug-i b')].map(b => b.textContent));
    ok(JSON.stringify(l) === JSON.stringify(['Dain']), '@ mostra só as fichas que batem: ' + JSON.stringify(l));
    await P.keyboard.press('Enter'); await w(200);
    const a = await E(() => { const x = document.querySelector('#nt-texto a.nt-ref'); return x && { t: x.textContent, aba: x.dataset.aba, alvo: x.dataset.alvo, k: x.dataset.k }; });
    ok(a && a.t === '@Dain' && a.aba === 'fichas' && a.alvo === '{"pc":"p1"}', 'Enter põe o link no texto: ' + JSON.stringify(a));
    ok(!(await E(() => document.querySelector('.nt-sug'))), 'e a lista fecha');
  });

  await passo('o #', async () => {
    await P.keyboard.type('e ver #D'); await w(250);
    const l = await E(() => [...document.querySelectorAll('.nt-sug-i b')].map(b => b.textContent));
    ok(l.length === 2 && !l.includes('Dain') && l.includes('Dunas de Sal') && l.includes('Dança das Lâminas'), '# mostra lugares e coisas, sem as fichas: ' + JSON.stringify(l));
    await P.keyboard.press('ArrowDown'); await P.keyboard.press('Enter'); await w(200);
    await P.keyboard.type('depois.'); await w(900);
    const html = await E(() => [...window.__docs.values()][0].dados.html);
    ok((html.match(/data-aba=/g) || []).length === 2 && /contenteditable="false"/.test(html), 'os dois links vão no texto salvo: ' + html);
    ok(await E(() => { const h = [...window.__docs.values()][0].dados.html; return TC.notas.limpar(h) === h; }), 'e passam pelo limpar como estão');
    ok(await E(() => !/onclick|href/.test(TC.notas.limpar('<a data-aba="fichas" data-alvo=\'{"pc":"x"}\' data-k="@" onclick="alert(1)" href="javascript:1">@x</a><a href="http://x">y</a>'))), 'o limpar não deixa passar outro atributo nem outro link');
  });

  await passo('o nome de agora e o que sumiu', async () => {
    await E(() => { window.__ind[0].nome = 'Dain, o Ferreiro'; window.__ind = window.__ind.filter(x => x.tipo !== 'cena' && x.tipo !== 'habilidade'); window.__emit('muda', 'personagens'); }); await w(400);
    await E(() => { window.__api.abrir(false); window.__api.abrir(true); }); await w(300);
    const r = await E(() => [...document.querySelectorAll('#nt-texto a.nt-ref')].map(a => a.textContent + (a.classList.contains('morta') ? ' (morta)' : '')));
    ok(r[0] === '@Dain, o Ferreiro' && /\(morta\)$/.test(r[1]), 'o nome acompanha; o que não existe mais fica cinza, com o nome antigo: ' + JSON.stringify(r));
  });

  await passo('clicar leva até lá', async () => {
    await P.locator('#nt-texto a.nt-ref').first().click(); await w(150);
    ok(JSON.stringify(await E(() => window.__idas)) === JSON.stringify([['fichas', { pc: 'p1' }]]), 'a casca recebe a aba e o alvo');
    await P.locator('#nt-texto a.nt-ref').nth(1).click(); await w(150);
    ok(await E(() => window.__idas.length) === 1 && /não existe mais/.test(await E(() => window.__toast || '')), 'o cinza não leva a lugar nenhum (avisa)');
    ok(!(await E(() => document.getElementById('painel').hidden)), 'o bloco de notas continua aberto');
  });

  if (t.errs.length) console.log(t.errs.slice(0, 10).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
