// Bateria do lote 150 (as Cenas): o texto para o mapa. (1) O lugar Sob medida: a ficha (o terreno, a casa, as salas do
// térreo, os anexos do quintal, os guardas) vira o lugar — a casa na frente, os anexos no quintal, os andares e o porão.
// (2) "Descrever com a IA": o pedido (as instruções e o esquema da ficha) e a ficha que volta (aqui, a casca de mentira
// responde) preenchem a janela — o lugar, as escolhas, a hora, o nome, as notas para o mestre e o que não deu.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1500, h: 950 });
  const p = t.page, w = ms => p.waitForTimeout(ms);
  const r = await p.evaluate(() => {
    const F = __tc.Furtividade, spec = { terreno: 'medio', muro: true, porte: 'nobre', terreo: ['sala', 'cozinha', 'escritorio', 'banheiro', 'quarto', 'quarto'], anexos: [{ t: 'piscina', n: 1 }, { t: 'estufa', n: 2 }, { t: 'ferramentas', n: 1 }, { t: 'altar', n: 1 }], guardas: 'nenhum' };
    const pl = F.gerar('sobmedida', { spec, seed: 5, estilo: 'comum', and: { cima: 1, porao: 1, base: true, salas: { base: ['secreta'] } } });
    const papeis = pl.salas.map(q => q.papel), todos = [pl].concat(pl.andares);
    const { sistema, ferramenta } = __tc.IaMapa.pedido();
    return { papeis, piscina: pl.pintados.some(f => f.k === 'piscina'), estufas: papeis.filter(x => x === 'estufa').length, ferr: papeis.includes('ferramentas'), altar: pl.objetos.some(o => o.id === 'altar'),
      guardas: todos.reduce((s, q) => s + q.guardas.length, 0), niveis: pl.andares.map(a => a.nivel).sort(), secreta: pl.andares.some(a => a.salas.some(q => q.papel === 'secreta')),
      sis: sistema.length, temSob: ferramenta.input_schema.properties.lugar.enum.includes('sobmedida') && ferramenta.input_schema.properties.lugar.enum.includes('casarao'),
      traduz: __tc.IaMapa.traduzir({ lugar: 'interior', nome: 'X', interior: { tipo: 'taverna' }, andares: { cima: [['sala', 'quarto']] } }) };
  });
  ok(['sala', 'cozinha', 'escritorio', 'banheiro'].every(x => r.papeis.includes(x)) && r.papeis.filter(x => x === 'quarto').length >= 2, 'o sob medida: as salas da ficha no térreo — ' + r.papeis.join(','));
  ok(r.piscina && r.estufas === 2 && r.ferr && r.altar, 'os anexos no quintal: a piscina, as 2 estufas, a casa de ferramentas e o altar');
  ok(r.guardas === 0 && JSON.stringify(r.niveis) === '[-1,1]' && r.secreta, 'sem guardas; o 1º andar e o porão com a sala secreta');
  ok(r.sis > 1000 && r.temSob, 'o pedido: as instruções e o esquema (com o sob medida e a furtividade)');
  ok(r.traduz.lugar === 'interior' && r.traduz.op.tipo === 'taverna' && r.traduz.op.and.cima === 1 && r.traduz.op.and.salas[1].join() === 'sala,quarto', 'a ficha da IA vira as escolhas do lugar (o interior, com o andar)');
  // a janela, com a casca de mentira
  await p.evaluate(() => { window.TC = window.TC || {}; window.TC.ia = { pedir: async c => { window.__pedido = c; return { ok: true, restam: 39, dados: { lugar: 'sobmedida', nome: 'Casa nobre com piscina', estilo: 'comum', hora: 'noite', clima: '', sobmedida: { terreno: 'medio', muro: true, porte: 'nobre', terreo: ['sala', 'cozinha', 'banheiro', 'quarto', 'quarto', 'salao'], anexos: [{ t: 'piscina', n: 1 }, { t: 'mesaJardim', n: 1 }], guardas: 'nenhum' }, andares: { porao: [['adega', 'deposito']], base: ['secreta'] }, notas_mestre: 'A sala secreta guarda o diário do dono.', nao_deu: ['varanda coberta'] } }; } }; __tc.Gerador.abrir('vila'); });
  await w(800);
  await p.fill('#ger-ia-texto', 'uma casa nobre de um andar com piscina'); await p.click('#ger-ia'); await w(1500);
  ok(await p.evaluate(() => window.__pedido && window.__pedido.acao === 'mapa' && window.__pedido.texto === 'uma casa nobre de um andar com piscina' && !!window.__pedido.ferramenta), 'o pedido vai com o texto, as instruções e o esquema');
  ok(await p.locator('#ger-lugar .seg-b.on').innerText() === 'Sob medida' && await p.inputValue('#ger-nome') === 'Casa nobre com piscina' && await p.locator('#ger-hora .seg-b.on').innerText() === 'Noite', 'a janela vai para o Sob medida, com o nome e a hora');
  ok(await p.locator('#sob-terreo .and-chip').count() === 6 && /diário do dono/.test(await p.locator('#sob-ia').innerText()) && /varanda coberta/.test(await p.locator('#sob-ia').innerText()), 'a ficha preenchida, as notas para o mestre e o que não deu');
  ok(/Restam 39/.test(await p.locator('#ger-ia-msg').innerText()) && /Montar com a IA/.test(await p.locator('#ger-ia').innerText()), 'o aviso (os pedidos que restam) e o botão de volta');
  await p.locator('#sob-a-varal').check({ force: true }); await w(300);
  ok(await p.evaluate(() => __tc.Gerador.vivo().estado.op.spec.anexos.some(a => a.t === 'varal')), 'a ficha é editável (pôr o varal)');
  await p.locator('.modal-a .btn.primary').click(); await w(3000);
  ok(await p.evaluate(() => { const sc = __tc.Store.scene(); return sc.name === 'Casa nobre com piscina' && sc.tone === 'noite' && !sc.tokens.some(x => !x.prop); }), 'a cena sai com o nome, de noite, sem guardas');
  // o erro da IA aparece na janela
  await p.evaluate(() => { window.TC.ia.pedir = async () => { throw new Error('A IA ainda não está ligada: falta a chave da API nos segredos do site.'); }; __tc.Gerador.abrir('vila'); });
  await w(700); await p.fill('#ger-ia-texto', 'um lago'); await p.click('#ger-ia'); await w(800);
  ok(/falta a chave/.test(await p.locator('#ger-ia-msg').innerText()), 'sem a chave, o aviso na janela');
  ok(!t.errs.filter(e => !/favicon/.test(e)).length, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
