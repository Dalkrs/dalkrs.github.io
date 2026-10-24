// Tags, lote 27, sem mesa: as condições, os efeitos e os recursos com a explicação ao passar o mouse.
//   · tc/tags.json chega com as três espécies; o nome escrito no texto (e as outras formas: Atordoada) ganha o
//     sublinhado (CSS.highlights) e a telinha com a explicação;
//   · a Oficina: o botão Tags abre a tela (abas por tipo, a lista, o editor); mudar uma pronta, voltar ao original,
//     criar uma nova (que passa a valer no texto) e apagar (e trazer de volta).
const { start, checker } = require('./lib');
const { ok, end } = checker();
const mk = (id, pais, nome, desc, o) => Object.assign({ id, pais, regra: 'e', nome, tipo: 'pequeno', forma: 'circulo', glifo: '', cor: '', natureza: '', usos: [], desc: desc || '', exclusivo: '', escola: null, graus: [{ custos: { p1: 1 }, texto: '' }] }, o || {});
const doc = JSON.stringify({ formato: 'urgm-skilltree-doc', versao: 4,
  biblioteca: { nome: 'Urgm', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 20 }], naturezas: [], usos: [],
    tipos: { pequeno: { nome: 'Pequeno', raio: 10, custo: 1, forma: 'circulo' }, notavel: { nome: 'Notável', raio: 18, custo: 2, forma: 'circulo' }, keystone: { nome: 'Keystone', raio: 27, custo: 4, forma: 'hexagono' } },
    arvores: [{ id: 'aA', nome: 'Aégis', categoria: 'classe', secreta: false, senha: '', nodes: [
      mk('r', [], 'Juramento', '', { tipo: 'keystone', graus: [{ custos: {}, texto: '' }] }),
      mk('b', ['r'], 'Golpe de Escudo', 'O alvo fica Atordoado; a inimiga fica Atordoada. Gasta Égide. Deixa o chão como Terra Morta. O Zumbido também.') ] }], cofres: [] },
  personagens: [{ id: 'c_dain', nome: 'Dain', arvores: ['aA'], arvoreAtual: 'aA', pontos: { p1: 20 }, alocados: {}, ordemLivre: true }] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'tags27', w: 1400, h: 900, seed: { 'urgm.arvore.v4': doc, 'urgm.arvore.ui.v4': JSON.stringify({ modo: 'jogador', tema: 'pedra', arvoreMestre: 'aA', personagem: 'c_dain' }) } });
  const w = ms => P.waitForTimeout(ms);
  const E = (fn, a) => P.evaluate(fn, a);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const sublinhados = () => E(() => { const hl = CSS.highlights.get('tc-tag'); return hl ? [...hl].map(r => r.toString()) : []; });
  await P.goto(t.base + 'arvore/', { waitUntil: 'load' }); await w(900);

  await passo('as prontas', async () => {
    const r = await E(async () => { await TC.tags.pronto; const l = TC.tags.lista(); return { n: l.length, tipos: [...new Set(l.map(x => x.tipo))].sort(), semNum: l.every(x => !/\d/.test(x.texto)), todos: l.every(x => x.texto) }; });
    ok(r.n > 250 && r.tipos.join() === 'condicao,efeito,recurso', 'as três espécies prontas: ' + JSON.stringify(r));
    ok(r.semNum && r.todos, 'todas com explicação, e nenhuma com número');
  });

  await passo('o sublinhado e a telinha', async () => {
    await E(() => { selecionado = 'b'; desenhar(); pintarPainel(); }); await w(500);
    const s = await sublinhados();
    ok(['Atordoado', 'Atordoada', 'Égide', 'Terra Morta'].every(x => s.includes(x)), 'no texto: a condição (e a outra forma), o recurso e o efeito ganham o sublinhado: ' + JSON.stringify(s));
    const pos = await E(() => { const p = document.getElementById('descJog'), tn = [...p.childNodes].find(n => n.nodeType === 3 && n.nodeValue.includes('Atordoado')), i = tn.nodeValue.indexOf('Atordoado'), r = new Range(); r.setStart(tn, i); r.setEnd(tn, i + 9); const q = r.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
    await P.mouse.move(pos.x, pos.y); await w(250);
    const d = await E(() => { const x = document.querySelector('.tc-tag-dica'); return x && x.classList.contains('on') ? x.textContent : ''; });
    ok(/Atordoado/.test(d) && /Condição/.test(d) && d.length > 30, 'passar o mouse mostra a telinha: ' + d);
    await P.mouse.move(5, 5); await w(150);
    ok(!(await E(() => document.querySelector('.tc-tag-dica.on'))), 'e some ao sair');
  });

  await passo('a tela Tags na Oficina', async () => {
    await E(() => trocarModo('mestre')); await w(300);
    ok(await P.locator('#btTags').isVisible(), 'no modo Mestre, o botão Tags');
    await P.locator('#btTags').click(); await w(300);
    ok(await P.locator('#veuTags.on').count() === 1 && (await P.locator('#tagsTela .sel-aba').allInnerTexts()).map(x => x.split(/\s/)[0]).join() === 'Condições,Efeitos,Recursos', 'abre com as abas Condições, Efeitos e Recursos');
    await P.locator('#tgBusca').fill('atordo'); await w(150);
    await P.locator('#tgLista .tg-item', { hasText: 'Atordoado' }).click(); await w(100);
    await P.locator('#tgTexto').fill('Explicação nova do mestre.'); await P.locator('#tgSalvar').click(); await w(200);
    ok(await E(() => TC.tags.porNome('Atordoado').texto) === 'Explicação nova do mestre.' && await E(() => !!TC.tags.mudancas().ed['c:atordoado']), 'mudar uma pronta: vale na hora, e só o que mudou fica guardado');
    ok(await E(() => !!localStorage.getItem('tinycats:tags')), 'sem mesa, fica neste navegador');
    await P.locator('#tgOriginal').click(); await w(150);
    ok(await E(() => TC.tags.porNome('Atordoado').texto !== 'Explicação nova do mestre.' && !TC.tags.mudancas().ed['c:atordoado']), '"Voltar ao original" desfaz');
    await P.locator('#tgNova').click(); await w(150);
    await P.locator('#tgNome').fill('Zumbido'); await P.locator('#tgTexto').fill('Um zumbido no ouvido que tira a atenção.'); await P.locator('#tgSalvar').click(); await w(200);
    ok(await E(() => { const x = TC.tags.porNome('Zumbido'); return !!(x && x.nova && x.tipo === 'condicao'); }), 'criar uma nova');
    await P.locator('#tgFechar').click(); await w(200);
    await E(() => { trocarModo('jogador'); selecionado = 'b'; desenhar(); pintarPainel(); }); await w(500);
    ok((await sublinhados()).includes('Zumbido'), 'e ela passa a valer no texto (o do painel do jogador)');
    await E(() => trocarModo('mestre')); await w(300);
    await P.locator('#btTags').click(); await w(200);
    await P.locator('#tgBusca').fill('Égide'); await w(100);
    await P.locator('.sel-aba[data-tipo="recurso"]').click(); await w(100);
    await P.locator('#tgLista .tg-item', { hasText: 'Égide' }).click(); await w(100);
    await P.locator('#tgApagar').click(); await w(150);
    await P.locator('#veuDlg .btn.perigo').click(); await w(200);
    ok(await E(() => !TC.tags.porNome('Égide')), 'apagar uma pronta');
    await P.locator('#tgVoltarApagadas').click(); await w(150);
    ok(await E(() => !!TC.tags.porNome('Égide')), 'e trazer de volta');
    await P.keyboard.press('Escape'); await w(100);
    ok(await P.locator('#veuTags.on').count() === 0, 'Esc fecha');
  });

  await passo('o jogador não edita', async () => {
    await E(() => trocarModo('jogador')); await w(200);
    ok(!(await P.locator('#btTags').isVisible()), 'no modo Jogador, sem o botão Tags');
  });

  if (t.errs.length) console.log(t.errs.slice(0, 10).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
