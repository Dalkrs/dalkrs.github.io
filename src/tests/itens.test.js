// Itens, lote 29 (sem mesa): as contas e a aba do mestre.
//   · as contas (tc/itens.js): o item (bolsa e equipamento), entregar e o Desfazer (soma com o de mesmo nome; o
//     equipamento entra guardado), a loja (o estoque, os lapros), a receita (os ingredientes, fazer, a falha, desfazer);
//   · a página: as três partes; criar um item de cada tipo (a poção com os efeitos, o equipamento com os bônus), duplicar,
//     apagar com Desfazer; a loja (os itens do catálogo, o preço, o estoque; abrir e fechar); a receita (os ingredientes,
//     o resultado, o teste, a falha com dano e condição; só você vê); mudar um item muda o retrato dele na loja.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
global.TC = { rules: R, dice: require('../../tc/dice.js') };
const I = require('../../tc/itens.js');
const j = JSON.stringify;
// ---------- as contas ----------
const pot = I.item({ t: 'pocao', nome: 'Poção de cura', preco: 30, fx: [{ k: 'barra', rec: 'HP', val: '30' }] });
const esp = I.item({ t: 'equip', nome: 'Espada curta', preco: 120, equip: { tipo: 'arma', bonus: { FOR: 3, XYZ: 9 }, def: { FOGO: 2 } } });
ok(pot.t === 'pocao' && j(pot.fx) === j([{ k: 'barra', rec: 'HP', val: '30' }]) && esp.equip.tipo === 'arma' && j(esp.equip.bonus) === j({ FOR: 3 }) && j(esp.equip.def) === j({ FOGO: 2 }), 'o item: a poção com os efeitos da bolsa; o equipamento com o tipo, os bônus (só as chaves que existem) e as defesas');
ok(I.item({ t: 'zzz', nome: '' }).t === 'material' && I.item({}).nome === 'Item sem nome' && I.item({ preco: -5 }).preco === 0, 'normalizar: tipo desconhecido vira material, sem nome, preço negativo');
const f0 = { bolsa: [{ id: 'b1', t: 'material', nome: 'Erva' }], itens: [] }, e0 = { qtd: { b1: 2 }, lapros: 50 };
const en = I.entregar(f0, e0, [{ item: pot, qtd: 2 }, { item: esp, qtd: 1 }, { item: { t: 'material', nome: 'erva' }, qtd: 3 }], 5);
const pb = en.ficha.bolsa.find(x => x.nome === 'Poção de cura');
ok(en.estado.qtd.b1 === 5 && en.estado.qtd[pb.id] === 2 && en.ficha.itens.length === 1 && en.ficha.itens[0].equipado === false && en.ficha.itens[0].bonus.FOR === 3 && en.estado.lapros === 55, 'entregar: a erva soma com a da bolsa (2 + 3), a poção entra nova (2), a espada entra guardada, os lapros somam');
const de = I.desentregar(en.ficha, Object.assign({}, en.estado, { qtd: Object.assign({}, en.estado.qtd, { b1: 4 }) }), en.desfazer);
ok(de.estado.qtd.b1 === 1 && de.ficha.bolsa.length === 1 && de.ficha.itens.length === 0 && de.estado.lapros === 50, 'o Desfazer tira só o que entrou (se a erva já foi gasta, tira do que há)');
const lj = { nome: 'Ferreiro', aberta: true, itens: [{ id: 'x', item: esp, preco: 100, estoque: 1 }, { id: 'y', item: pot, preco: 30, estoque: null }] };
ok(!I.podeComprar(lj, 'x', 1, { lapros: 50 }).ok && /Faltam 50 lapros/.test(I.podeComprar(lj, 'x', 1, { lapros: 50 }).erro) && /Só há 1/.test(I.podeComprar(lj, 'x', 2, { lapros: 500 }).erro) && I.podeComprar(lj, 'y', 9, { lapros: 270 }).ok
  && /fechada/.test(I.podeComprar(Object.assign({}, lj, { aberta: false }), 'y', 1, { lapros: 90 }).erro), 'a loja: os lapros, o estoque (sem estoque: sem fim) e a loja fechada');
const rc = I.receita({ nome: 'Poção', ingredientes: [{ nome: 'Erva', t: 'material', qtd: 3 }], resultado: { item: pot, qtd: 1 }, teste: { atr: 'CAN', dif: 8 }, falha: { dano: [{ barra: 'HP', val: '1d6' }], conds: [{ c: 'veneno', r: 3 }] } });
ok(rc.falha.perde === true && rc.teste.dif === 8 && j(rc.falha.conds) === j([{ c: 'veneno', r: 3 }]), 'a receita: a falha perde os ingredientes por padrão; o dano e a condição');
ok(!I.podeFazer(rc, f0, e0).ok && j(I.podeFazer(rc, f0, e0).faltam.map(x => x.nome + ':' + x.tem)) === j(['Erva:2']), 'faltam ingredientes: a bolsa tem 2 ervas, a receita pede 3');
const fz = I.fazer(rc, f0, { qtd: { b1: 4 } }, true);
ok(fz.ok && fz.sucesso && fz.estado.qtd.b1 === 1 && fz.ficha.bolsa.some(x => x.nome === 'Poção de cura'), 'fazer com sucesso: gasta 3 ervas e a poção entra na bolsa');
const fl = I.fazer(rc, f0, { qtd: { b1: 4 } }, false);
ok(fl.ok && !fl.sucesso && fl.estado.qtd.b1 === 1 && j(fl.conds) === j([{ c: 'veneno', r: 3 }]) && fl.dano.length === 1, 'falhar: perde as ervas e devolve o dano e a condição para quem aplica');
ok(I.fazer(Object.assign({}, rc, { falha: { perde: false } }), f0, { qtd: { b1: 4 } }, false).estado.qtd.b1 === 4, 'a receita que não perde na falha: as ervas ficam');
const dz = I.desfazer(fz.ficha, fz.estado, fz.desfazer);
ok(dz.estado.qtd.b1 === 4 && dz.ficha.bolsa.length === 1, 'desfazer: as ervas voltam e a poção sai');
ok(I.testar(rc, 10, 0, () => 0.95).sucesso && !I.testar(rc, 10, 0, () => 0.1).sucesso && I.testar(I.receita({ nome: 'x' }), 0, 0).sucesso, 'o teste: 1d10 contra 8 (10 passa, 2 não); sem teste, dá certo');

// o grupo do Mapa-múndi guarda as fichas dos jogadores (só o grupo comum; sem repetir; só ids que servem)
{ const N = require('../../mundo/nucleo.js'); const m = N.normalizarMapa({ nome: 'M', grade: { tam: 10, x: 0, y: 0, orient: 'pe' }, objs: [{ k: 'm', id: 'mc_a', nome: 'Vashka', x: 100, y: 100, ic: 'cidade' }, { k: 'g', id: 'gr_a', x: 300, y: 300, pcs: ['pc_selene', 'pc_selene', 'x y', 5] }, { k: 'g', id: 'gr_b', x: 3, y: 3, tipo: 'caravana', pcs: ['pc_a'] }] });
  ok(j(m.objs.filter(o => o.k === 'g').map(o => [o.id, o.pcs || null])) === j([['gr_a', ['pc_selene']], ['gr_b', null]]), 'o grupo do mapa guarda os personagens dele (a caravana, não)'); }
ok(I.recDaFicha({ recursos: [{ id: 'r_hp', nome: 'HP' }], poderes: [{ id: 'fu', nome: 'Fúria' }] }, 'hp') === 'r_hp' && I.recDaFicha({ recursos: [], poderes: [{ id: 'fu', nome: 'Fúria' }] }, 'fúria') === 'pd:fu' && I.recDaFicha({ recursos: [] }, 'Mana') === 'Mana',
  'a barra da poção, na ficha de quem recebe: pelo nome (HP → o id do recurso; Fúria → a barra especial); sem barra, fica o nome');
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'itens', w: 1300, h: 900 });
  const w = ms => P.waitForTimeout(ms);
  const E = (fn, a) => P.evaluate(fn, a);
  const foto = async nome => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const toasts = () => E(() => [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ '));
  await P.goto(t.base + 'itens/?debug', { waitUntil: 'load' }); await w(600);
  await passo('vazio', async () => {
    ok(await E(() => __itens.pronto && !__itens.naMesa) && /O catálogo está vazio/.test(await P.locator('#meio').innerText()) && await P.locator('#btNovo').innerText() === '+ Item', 'abre no Catálogo, vazio, com o convite');
  });
  await passo('a poção', async () => {
    await P.locator('#btNovo').click(); await w(200);
    await P.locator('#it-nome').fill('Poção de cura'); await P.locator('#it-nome').press('Tab');
    await P.locator('#it-preco').fill('30'); await P.locator('#it-preco').press('Tab');
    await P.locator('#it-tipo [data-v="pocao"]').click(); await w(150);
    await P.locator('#it-fx-mais').click(); await w(120);
    await P.locator('#it-fx-val-0').fill('2d6+3'); await P.locator('#it-fx-val-0').press('Tab');
    await P.locator('#it-fx-mais').click(); await w(120);
    await P.locator('#it-fx-k-1').selectOption('cond'); await w(120);
    await P.locator('#it-fx-c-1').selectOption('regen'); await P.locator('#it-fx-r-1').fill('2'); await P.locator('#it-fx-r-1').press('Tab');
    await foto('l29-itens-pocao');
    await P.locator('#dl-ok').click(); await w(250);
    const c = await E(() => __itens.catalogo());
    ok(c.itens.length === 1 && c.itens[0].t === 'pocao' && c.itens[0].preco === 30 && j(c.itens[0].fx) === j([{ k: 'barra', rec: 'HP', val: '2d6+3' }, { k: 'cond', c: 'regen', r: 2 }]), 'a poção: o preço e os efeitos (cura de 2d6+3 em HP e Regenerando por 2 rodadas) — ' + j(c.itens[0]));
    ok(/Poção de cura entrou no catálogo/.test(await toasts()) && /30 lapros · HP 2d6\+3/.test(await P.locator('[data-item]').innerText()), 'a linha do catálogo diz o preço e o que faz');
  });
  await passo('o equipamento', async () => {
    await P.locator('#btNovo').click(); await w(200);
    await P.locator('#it-nome').fill('Espada curta'); await P.locator('#it-tipo [data-v="equip"]').click(); await w(150);
    await P.locator('#it-eq-tipo').selectOption('arma');
    await P.locator('#it-b-FOR').fill('3'); await P.locator('#it-b-FOR').press('Tab');
    await P.locator('#it-preco').fill('120'); await P.locator('#it-preco').press('Tab');
    await P.locator('#dl-ok').click(); await w(250);
    const x = (await E(() => __itens.catalogo())).itens.find(y => y.nome === 'Espada curta');
    ok(x && x.t === 'equip' && x.equip.tipo === 'arma' && x.equip.bonus.FOR === 3 && x.preco === 120, 'o equipamento: o tipo (arma) e o bônus (FOR +3)');
    for (const [n, tp] of [['Erva', 'material'], ['Frasco', 'material']]) {
      await P.locator('#btNovo').click(); await w(150); await P.locator('#it-nome').fill(n); await P.locator('#it-tipo [data-v="' + tp + '"]').click(); await w(80); await P.locator('#dl-ok').click(); await w(200);
    }
    ok(j(await P.locator('.grupo-l > .eyebrow').allTextContents()) === j(['Poção · 1', 'Material · 2', 'Equipamento · 1']), 'agrupados pelo tipo');
    await P.locator('[data-dup]').first().click(); await w(200);
    ok((await E(() => __itens.catalogo())).itens.some(y => y.nome === 'Poção de cura (cópia)'), 'duplicar');
    await P.locator('[data-item]', { hasText: 'Poção de cura (cópia)' }).locator('[data-apagar]').click(); await w(200);
    ok(!(await E(() => __itens.catalogo())).itens.some(y => y.nome === 'Poção de cura (cópia)') && /saiu do catálogo/.test(await toasts()), 'apagar, com o aviso');
    await P.locator('#btDesfazer').click(); await w(200);
    ok((await E(() => __itens.catalogo())).itens.some(y => y.nome === 'Poção de cura (cópia)'), 'o Desfazer traz de volta');
    await foto('l29-itens-catalogo');
  });
  await passo('a loja', async () => {
    await P.locator('#aba-lojas').click(); await w(150);
    ok(/Nenhuma loja ainda/.test(await P.locator('#meio').innerText()) && await P.locator('#btNovo').innerText() === '+ Loja', 'Lojas: vazia, e o botão vira "+ Loja"');
    await P.locator('#btNovo').click(); await w(200);
    await P.locator('#lj-nome').fill('Ferreiro de Vashka'); await P.locator('#lj-nome').press('Tab');
    ok(/O lugar no Mapa-múndi se escolhe numa mesa/.test(await P.locator('#dlg').innerText()), 'fora de uma mesa, o lugar no mapa fica para depois');
    const esp = await E(() => __itens.catalogo().itens.find(y => y.nome === 'Espada curta').id), potId = await E(() => __itens.catalogo().itens.find(y => y.nome === 'Poção de cura').id);
    await P.locator('#lj-add').selectOption(esp); await w(150);
    await P.locator('#lj-add').selectOption(potId); await w(150);
    await P.locator('#lj-est-0').fill('2'); await P.locator('#lj-est-0').press('Tab');
    await P.locator('#lj-preco-1').fill('25'); await P.locator('#lj-preco-1').press('Tab');
    await foto('l29-itens-loja');
    await P.locator('#dl-ok').click(); await w(250);
    const l = (await E(() => __itens.lojas()))[0];
    ok(l && l.l.nome === 'Ferreiro de Vashka' && l.l.aberta && j(l.l.itens.map(y => y.item.nome + ':' + y.preco + ':' + y.estoque)) === j(['Espada curta:120:2', 'Poção de cura:25:null']), 'a loja: a espada (120, estoque 2) e a poção (25, sem fim) — ' + j(l && l.l.itens.map(y => y.item.nome + ':' + y.preco + ':' + y.estoque)));
    await P.locator('[data-abrir]').click(); await w(150);
    ok((await E(() => __itens.lojas()))[0].l.aberta === false && /fechada/.test(await P.locator('[data-loja]').innerText()), 'fechar a loja');
    await P.locator('[data-abrir]').click(); await w(150);
    // mudar o item no catálogo muda o retrato na loja
    await P.locator('#aba-catalogo').click(); await w(150);
    await P.locator('[data-item]', { hasText: 'Espada curta' }).locator('[data-editar]').click(); await w(200);
    await P.locator('#it-b-FOR').fill('4'); await P.locator('#it-b-FOR').press('Tab');
    await P.locator('#dl-ok').click(); await w(250);
    ok((await E(() => __itens.lojas()))[0].l.itens[0].item.equip.bonus.FOR === 4 && (await E(() => __itens.lojas()))[0].l.itens[0].preco === 120 && /e na loja que o vende\)/.test(await toasts()), 'mudar a espada no catálogo muda o retrato dela na loja (o preço da loja fica)');
  });
  await passo('a receita', async () => {
    await P.locator('#aba-receitas').click(); await w(150);
    await P.locator('#btNovo').click(); await w(200);
    await P.locator('#rc-nome').fill('Poção de cura'); await P.locator('#rc-nome').press('Tab');
    await P.locator('#rc-ing-mais').click(); await w(100);
    await P.locator('#rc-ing-n-0').fill('Erva'); await P.locator('#rc-ing-n-0').press('Tab');
    await P.locator('#rc-ing-q-0').fill('3'); await P.locator('#rc-ing-q-0').press('Tab');
    await P.locator('#rc-ing-mais').click(); await w(100);
    await P.locator('#rc-ing-n-1').fill('Frasco'); await P.locator('#rc-ing-n-1').press('Tab');
    const potId = await E(() => __itens.catalogo().itens.find(y => y.nome === 'Poção de cura').id);
    await P.locator('#rc-res').selectOption(potId);
    await P.locator('#rc-teste [data-v="sim"]').click(); await w(120);
    await P.locator('#rc-atr').selectOption('CAN'); await P.locator('#rc-dif').fill('9'); await P.locator('#rc-dif').press('Tab');
    await P.locator('#rc-dano-mais').click(); await w(100);
    await P.locator('#rc-cond-mais').click(); await w(100);
    await P.locator('#rc-cond-0').selectOption('veneno');
    await P.locator('#rc-oculta').check();
    await foto('l29-itens-receita');
    await P.locator('#dl-ok').click(); await w(250);
    const r = (await E(() => __itens.receitas()))[0];
    ok(r && j(r.r.ingredientes) === j([{ nome: 'Erva', t: 'material', qtd: 3 }, { nome: 'Frasco', t: 'material', qtd: 1 }]) && r.r.resultado.item.nome === 'Poção de cura' && j(r.r.teste) === j({ atr: 'CAN', dif: 9 })
      && r.r.falha.perde && j(r.r.falha.dano) === j([{ barra: 'HP', val: '1d6' }]) && j(r.r.falha.conds) === j([{ c: 'veneno', r: 3 }]) && r.r.oculta, 'a receita: os ingredientes, o resultado, o teste, a falha (perde, 1d6 em HP, Envenenado 3) e "só você vê" — ' + j(r && r.r));
    ok(/3 × Erva, 1 × Frasco → Poção de cura · teste de Canalização Mágica 9/.test(await P.locator('[data-rec]').innerText()) && /só você vê/.test(await P.locator('[data-rec]').innerText()), 'a linha da receita resume');
  });
  await passo('recarregar', async () => {
    await P.reload({ waitUntil: 'load' }); await w(600);
    ok(await E(() => __itens.aba) === 'receitas' && (await E(() => __itens.catalogo())).itens.length === 5 && (await E(() => __itens.lojas())).length === 1, 'ao recarregar: tudo fica (neste navegador), na mesma parte');
  });
  await t.close();
  end();
})();
