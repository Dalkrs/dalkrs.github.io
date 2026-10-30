// Árvore de Habilidades, lote 43, sem mesa: os ícones das habilidades (o guia de 30/10).
//   · no nó: o ícone do papel no centro (a Ponta com glifo fica com o glifo), a marca de tempo no canto de cima (o raio
//     dourado da reação, as pegadas da postura, o anel da passiva; Ativa sem), as siglas do uso embaixo do nome e a
//     etiqueta da barra embaixo do nó (▼2, ▲2, ▲, ⇄3) — pelo custo de uso do 1º grau ("+" enche) ou pelo barraEfeito;
//   · a marca antiga do lote 21 (n.barra) vira o barraEfeito; papel e barraEfeito que não valem saem;
//   · o editor: "Papel" (os 8 ícones e Nenhum) e "Efeito na barra" (Automático, Gasta, Enche, Os dois, Balança, Nenhum),
//     com Desfazer; o Automático acompanha o custo de uso;
//   · o cartão (passar o mouse): o ícone, as etiquetas e "Suporte · Reação · …"; o painel do jogador também;
//   · a skill única ganha papel e efeito; sem mesa, não há estrela de favorita.
// + as contas (tc/rules.js): as etiquetas, a marca de tempo, o texto por extenso, as favoritas.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const j = JSON.stringify;

// ---------- as contas ----------
const no0 = (uso, extra) => Object.assign({ graus: [{ uso }] }, extra || {});
const T = (n, o) => R.etiquetasDaBarra(n, o).map(R.textoDaEtiqueta).join(' | ');
ok(T(no0([{ b: 'Geada de Selene', v: '2' }, { b: 'SP', v: '3' }])) === '▼ 2 Geada de Selene', 'gasta pelo custo; o SP não conta');
ok(T(no0([{ b: 'Barra Bestial', v: '+2' }])) === '▲ 2 Barra Bestial', '"+2" na Barra Bestial: enche (antes saía ▼)');
ok(T(no0(null, { barraEfeito: 'enche' }), { barra: 'Malícia' }) === '▲ Malícia', 'a passiva que enche, sem custo: "▲ Malícia" (o nome da barra da árvore)');
ok(T(no0(null, { barraEfeito: 'enche' })) === '', 'sem número e sem nome de barra, nada (a seta nunca vem sozinha)');
ok(T(no0([{ b: 'Dreno', v: '4' }], { barraEfeito: 'ambos' })) === '▼ 4 Dreno | ▲ Dreno', 'os dois: "▼ 4 Dreno" e "▲ Dreno"');
ok(T(no0([{ b: 'Compasso', v: '3' }], { barraEfeito: 'balanca' })) === '⇄ 3 Compasso', 'balança: "⇄ 3 Compasso"');
ok(T(no0([{ b: 'Postura', v: '2 casas' }])) === '▼ 2 Postura' && T(no0([{ b: 'Ira', v: '-3' }])) === '▼ 3 Ira' && T(no0([{ b: 'Fome', v: 'todo' }])) === '▼ Fome', 'o número que houver ("2 casas", "-3"); "todo": só o nome');
ok(T(no0([{ b: 'Geada', v: 'CAN/2' }])) === '▼ CAN/2 Geada' && T(no0([{ b: 'Geada', v: 'CAN/2' }]), { vars: { CAN: 8 } }) === '▼ 4 Geada', 'uma conta: escrita na árvore; com o personagem, o número');
ok(T(no0([{ b: 'Frasco', v: '1' }, { b: 'Energia', v: '2' }, { b: 'HP', v: '5' }])) === '', 'Frasco, Energia e HP não são a barra especial');
ok(T(no0([{ b: 'Geada', v: '2' }], { barraEfeito: 'nenhum' })) === '' && T(no0([{ b: 'Geada', v: '2' }], { barra: 'soma' })) === '▲ 2 Geada', 'Nenhum tira; a marca antiga ("soma") vale como Enche');
ok(T({ graus: [{ uso: [{ b: 'Geada', v: '2' }] }, { uso: [{ b: 'Geada', v: '5' }] }] }, { grau: 1 }) === '▼ 5 Geada', 'o número do grau pedido (na ficha, o comprado)');
ok(R.textoDosIcones('suporte', 'reacao', R.etiquetasDaBarra(no0([{ b: 'Geada', v: '2' }]))) === 'Suporte, reação, gasta 2 Geada', 'por extenso: "Suporte, reação, gasta 2 Geada"');
ok(R.tempoDe(['ativa', 'passiva', 'reacao']) === 'reacao' && R.tempoDe(['postura', 'passiva']) === 'postura' && R.tempoDe(['ativa']) === null && R.tempoDe(['u9'], [{ id: 'u9', nome: 'Reação' }]) === 'reacao',
  'a marca de tempo: reação > postura > passiva; Ativa sem; outro id, pelo nome');
ok(R.barraDasEtiquetas({ nodes: [no0([{ b: 'SP', v: '2' }]), no0([{ b: 'Malícia', v: '2' }]), no0([{ b: 'Malícia', v: '1' }]), no0([{ b: 'Ouro', v: '1' }])] }) === 'Malícia' && R.barraDasEtiquetas({ barra: 'Dívida', nodes: [] }) === 'Dívida',
  'a barra da árvore: a especial que mais aparece nos custos (ou a que o mestre escreveu)');
ok(j(R.favDe({ fav: ['n1', 'u:u1', 'n1', 'x y', 3] })) === j(['n1', 'u:u1']), 'as favoritas: ids de nós e "u:" das únicas, sem repetir');
ok(j(R.unicasDe({ unicas: [{ id: 'u1', nome: 'Cura', papel: 'suporte', barraEfeito: 'enche' }, { id: 'u2', nome: 'X', papel: 'nada', barraEfeito: 'muito' }] }).map(u => [u.papel, u.barraEfeito])) === j([['suporte', 'enche'], [undefined, undefined]]),
  'a skill única guarda papel e efeito (os que valem)');

// ---------- a tela ----------
const no = (id, nome, pais, extra) => Object.assign({ id, pais, regra: 'e', nome, tipo: 'notavel', forma: 'circulo', glifo: '', cor: '', natureza: '', usos: [], desc: '', exclusivo: '', escola: null, graus: [{ custos: { p1: 1 }, texto: '' }] }, extra);
const uso = (b, v) => ({ graus: [{ custos: { p1: 1 }, texto: '', uso: [{ b, v }] }] });
const doc = JSON.stringify({ formato: 'urgm-skilltree-doc', versao: 4,
  biblioteca: { nome: 'Urgm', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 20 }], naturezas: [{ id: 'canalizacao', nome: 'Canalização', cor: '#3F7FD6' }],
    usos: [{ id: 'passiva', nome: 'Passiva', sigla: 'Pa' }, { id: 'ativa', nome: 'Ativa', sigla: 'At' }, { id: 'reacao', nome: 'Reação', sigla: 'Re' }, { id: 'postura', nome: 'Postura', sigla: 'Po' }],
    tipos: { pequeno: { nome: 'Pequeno', raio: 10, custo: 1, forma: 'circulo' }, notavel: { nome: 'Notável', raio: 18, custo: 2, forma: 'circulo' }, keystone: { nome: 'Keystone', raio: 27, custo: 4, forma: 'hexagono' } },
    arvores: [{ id: 'a_sel', nome: 'Kitsune Selene', categoria: 'raca', secreta: false, senha: '', nodes: [
      no('n_raiz', 'Origem', [], { tipo: 'keystone', forma: 'hexagono', glifo: '道', papel: 'utilidade', graus: [{ custos: {}, texto: '' }] }),
      no('n_lamina', 'Lâmina Gélida', ['n_raiz'], Object.assign({ papel: 'ofensiva', usos: ['ativa'], natureza: 'canalizacao', desc: 'Lâmina de gelo sobre a arma.' }, { graus: [{ custos: { p1: 1 }, texto: '', uso: [{ b: 'Geada de Selene', v: '2' }, { b: 'SP', v: '3' }] }] })),
      no('n_veu', 'Véu de Neve', ['n_raiz'], Object.assign({ papel: 'suporte', usos: ['reacao'], natureza: 'canalizacao', desc: 'Quando um aliado vai sofrer um golpe, ele ganha Escudado.' }, uso('Geada de Selene', '2'))),
      no('n_garra', 'Garra Dupla', ['n_raiz'], Object.assign({ tipo: 'pequeno', papel: 'ofensiva', usos: ['ativa'] }, uso('Barra Bestial', '+2'))),
      no('n_lucro', 'Lucro Rápido', ['n_raiz'], { tipo: 'pequeno', papel: 'utilidade', usos: ['passiva'], barraEfeito: 'enche' }),
      no('n_dreno', 'Dreno Frio', ['n_raiz'], Object.assign({ papel: 'controle', usos: ['ativa'], barraEfeito: 'ambos' }, uso('Geada de Selene', '4'))),
      no('n_comp', 'Passo do Compasso', ['n_raiz'], Object.assign({ papel: 'movimento', usos: ['postura'], barraEfeito: 'balanca' }, uso('Compasso', '3'))),
      no('n_nada', 'Olhar Atento', ['n_raiz'], { usos: ['ativa'], desc: 'Nada na barra.' }),
      no('n_velho', 'Fôlego', ['n_raiz'], { barra: 'soma', papel: 'nao-existe', barraEfeito: 'nao-existe' })] }], cofres: [] },
  personagens: [{ id: 'c_dain', nome: 'Dain', arvores: ['a_sel'], arvoreAtual: 'a_sel', pontos: { p1: 20 }, alocados: { n_raiz: 1, n_veu: 1 }, ordemLivre: true }] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'arvore43', w: 1400, h: 900, seed: { 'urgm.arvore.v4': doc, 'urgm.arvore.ui.v4': JSON.stringify({ modo: 'mestre', tema: 'pedra', arvoreMestre: 'a_sel' }) } });
  const w = ms => P.waitForTimeout(ms);
  const E = (fn, a) => P.evaluate(fn, a);
  const foto = async nome => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  // o que cada nó mostra: o ícone do centro, a marca de tempo, a etiqueta, o glifo, as siglas
  const nos = () => E(() => { const o = {}; for (const g of document.querySelectorAll('#nos .no')) {
    const etq = [...g.querySelectorAll('.etq-barra .etq-txt')].map(x => x.textContent).join(' ');
    const mt = g.querySelector('.marca-tempo'), ic = g.querySelector('.icone-papel:not(.marca-tempo .icone-papel)');
    o[g.dataset.id] = { papel: ic ? ic.getAttribute('data-papel') : '', tempo: mt ? [...mt.classList].find(c => c !== 'marca-tempo') : '', etq, glifo: (g.querySelector('.glifo') || {}).textContent || '', siglas: (g.querySelector('.siglas-txt') || {}).textContent || '', fala: g.getAttribute('aria-label') };
  } return o; });
  await P.goto(t.base + 'arvore/', { waitUntil: 'load' }); await w(900);
  await E(() => { cam.k = 1.3; aplicarCam(); desenhar(); }); await w(200);

  await passo('a normalização', async () => {
    const v = await E(() => { const n = porId.get('n_velho'); return { barra: 'barra' in n, ef: n.barraEfeito, papel: 'papel' in n }; });
    ok(!v.barra && v.ef === 'enche' && !v.papel, 'a marca antiga (barra: soma) vira barraEfeito: enche; papel e efeito que não valem saem: ' + j(v));
    const k = await E(() => Object.keys(porId.get('n_lamina')).filter(x => x === 'papel' || x === 'barraEfeito'));
    ok(j(k) === j(['papel']), 'o papel fica no nó ao salvar a biblioteca');
  });

  await passo('os nós', async () => {
    const s = await nos();
    ok(s.n_lamina.papel === 'ofensiva' && s.n_lamina.tempo === '' && s.n_lamina.etq === '▼2', 'Lâmina Gélida: a espada no centro, sem marca (Ativa), ▼2 embaixo — ' + j(s.n_lamina));
    ok(s.n_veu.papel === 'suporte' && s.n_veu.tempo === 'reacao' && s.n_veu.etq === '▼2' && s.n_veu.fala === 'Véu de Neve: Suporte, reação, gasta 2 Geada de Selene', 'Véu de Neve: a cruz, o raio da reação e ▼2; o nome por extenso — ' + j(s.n_veu));
    ok(s.n_garra.etq === '▲2' && s.n_lucro.etq === '▲' && s.n_lucro.tempo === 'passiva', 'Garra Dupla ▲2 ("+2"); Lucro Rápido ▲ (sem número) com o anel da passiva');
    ok(s.n_dreno.etq === '▼4 ▲' && s.n_comp.etq === '⇄3' && s.n_comp.tempo === 'postura', 'os dois: ▼4 ▲; balança: ⇄3, com as pegadas da postura');
    ok(s.n_raiz.papel === '' && s.n_raiz.glifo === '道', 'a Origem (grande, com glifo) fica com o glifo');
    ok(s.n_nada.papel === '' && s.n_nada.etq === '' && s.n_nada.tempo === '', 'sem papel e sem custo: sem ícone e sem etiqueta (o site não chuta)');
    ok(/Re/.test(s.n_veu.siglas) && /At/.test(s.n_lamina.siglas), 'as siglas do uso vão embaixo do nome');
    await foto('l43-arvore-pedra');
    await E(() => trocarTema('tinta'));
    await w(300);
    await foto('l43-arvore-tinta');
    await E(() => trocarTema('pedra'));
    await w(200);
  });

  await passo('o cartão', async () => {
    await E(() => mostrarDica(porId.get('n_veu'))); await w(200);
    const d = await E(() => { const x = document.querySelector('#dica2'); const q = x.querySelector('.tci-quadro'); return { quadro: q ? q.getAttribute('aria-label') : '', chips: [...x.querySelectorAll('.tci-chip')].map(c => c.textContent), meta: (x.querySelector('.meta') || {}).textContent }; });
    ok(d.quadro === 'Suporte, reação, gasta 2 Geada de Selene' && j(d.chips) === j(['▼2 Geada de Selene']) && /^Suporte · Reação · Canalização/.test(d.meta), 'o cartão: o ícone com o nome por extenso, "▼ 2 Geada de Selene" e "Suporte · Reação · Canalização…" — ' + j(d));
    await foto('l43-arvore-cartao');
    await E(() => esconderDica());
  });

  await passo('o editor', async () => {
    await E(() => { selecionado = 'n_nada'; pintarPainel(); desenhar(); }); await w(300);
    ok(await P.locator('#grupoPapel [data-papel]').count() === 9 && await P.locator('#grupoPapel [data-papel=""][aria-pressed="true"]').count() === 1, '"Papel": os 8 ícones e Nenhum (marcado)');
    ok(/Automático \(nada\)/.test(await P.locator('#grupoBarra').innerText()), '"Efeito na barra": Automático (nada)');
    await P.locator('#grupoPapel [data-papel="defensiva"]').click(); await w(300);
    ok((await nos()).n_nada.papel === 'defensiva' && await E(() => porId.get('n_nada').papel) === 'defensiva', 'escolher Defensiva: o escudo aparece no nó');
    await foto('l43-arvore-editor');
    await E(() => desfazer()); await w(300);
    ok((await nos()).n_nada.papel === '' && await E(() => !('papel' in porId.get('n_nada'))), 'Desfazer: sem papel de novo');
    await P.locator('#grupoBarra [data-barra="enche"]').click(); await w(300);
    ok((await nos()).n_nada.etq === '▲' && await E(() => porId.get('n_nada').barraEfeito) === 'enche', '▲ Enche: a etiqueta aparece, com o nome da barra da árvore');
    await P.locator('#grupoBarra [data-barra=""]').click(); await w(300);
    ok((await nos()).n_nada.etq === '' && await E(() => !('barraEfeito' in porId.get('n_nada'))), 'Automático: volta ao custo (nada)');
    // o Automático acompanha o custo de uso
    await E(() => { selecionado = 'n_lamina'; pintarPainel(); desenhar(); }); await w(300);
    ok(/Automático \(▼2\)/.test(await P.locator('#grupoBarra').innerText()), 'na Lâmina: Automático (▼2)');
    const v = P.locator('.guso-v[data-g="0"][data-k="0"]');
    await v.fill('+1'); await v.dispatchEvent('change'); await w(300);
    ok((await nos()).n_lamina.etq === '▲1' && /Automático \(▲1\)/.test(await P.locator('#grupoBarra').innerText()), 'o custo vira "+1": o nó e o Automático passam a ▲1');
    await E(() => desfazer()); await w(300);
  });

  await passo('o painel do jogador', async () => {
    await E(() => { ui.modo = 'jogador'; selecionado = 'n_veu'; pintarPainel(); desenhar(); }); await w(400);
    const q = await P.locator('#painel .no-topo .tci-quadro').getAttribute('aria-label').catch(() => '');
    const mb = (await P.locator('#painel #marcaBarra').innerText().catch(() => '')).replace(/\s+/g, ' ').replace('▼ 2', '▼2');
    ok(q === 'Suporte, reação, gasta 2 Geada de Selene' && /▼2 ?Geada de Selene/.test(mb), 'no painel do jogador: o ícone e a etiqueta — ' + j([q, mb]));
    ok(await P.locator('#btFav').count() === 0, 'sem mesa, não há estrela (os personagens daqui não são os das Fichas)');
    await foto('l43-arvore-jogador');
  });

  await passo('a skill única', async () => {
    await E(() => { ui.modo = 'jogador'; pintarPainel(); }); await w(200);
    await P.locator('#btUnica').click(); await w(300);
    const M = P.locator('.modal').last();
    await M.locator('input').first().fill('Sopro Protetor');
    await M.locator('.chips[data-campo] [data-v="suporte"]').click();
    await M.locator('.chips[data-campo] [data-v="enche"]').click();
    await M.locator('button', { hasText: 'Criar' }).click(); await w(300);
    const u = await E(() => (personagemAtual().unicas || [])[0]);
    ok(u && u.nome === 'Sopro Protetor' && u.papel === 'suporte' && u.barraEfeito === 'enche', 'a skill única guarda o papel e o efeito: ' + j(u));
  });

  const errs = t.errs.filter(e => !/favicon/i.test(e));
  if (errs.length) console.log(errs.slice(0, 10).join('\n'));
  ok(errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
