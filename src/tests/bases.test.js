// As bases (lote 125): a casa e o esconderijo. O núcleo (os 8 níveis, os cômodos e as vagas, os tipos de esconderijo,
// a exposição em 10 faixas, o que a base soma ao descanso, o clima e a caça só no acampamento), os desenhos (cada nível
// e cada tipo) e a página sozinha (criar, trocar de base, subir o nível, um cômodo, a exposição, apagar).
const { start, checker } = require('./lib');
const N = require('../../acampamento/nucleo.js');
global.window = undefined;
const AD = require('../../acampamento/desenhos.js'), BD = require('../../acampamento/bases-desenhos.js');
const { ok, end } = checker();
const j = JSON.stringify;

// ---- o núcleo ----
const a0 = N.normalizar({});
ok(!('tipo' in a0) && !('niveis' in a0) && a0.nome === 'Acampamento', 'o acampamento continua como era (sem os campos da base)');
let c = N.normalizar({ tipo: 'casa', nivel: 5 });
ok(c.tipo === 'casa' && c.nome === 'Casa' && c.niveis.length === 8 && N.nivelDe(c).nome === 'Sobrado' && N.vagas(c) === 5 && c.exp === undefined, 'a casa: 8 níveis, no 5 (sobrado), 5 cômodos livres, sem exposição');
ok(N.normalizar({ tipo: 'casa', nivel: 12 }).nivel === 8 && N.normalizar({ tipo: 'casa', nivel: 0 }).nivel === 1, 'o nível fica entre 1 e 8');
c = N.normalizar({ tipo: 'casa', nivel: 5, melhorias: [N.item('construcao', 'quarto')] });
ok(N.comodos(c).length === 1 && N.vagas(c) === 4 && c.melhorias[0].nome === 'Quarto', 'um cômodo ocupa uma vaga');
ok(j(N.efeitos(c)) === j({ conf: 12, san: 3, rec: 5, prov: 0 }), 'o descanso soma o nível e o cômodo: ' + j(N.efeitos(c)));
ok(N.catalogo(c).every(x => x.base === 'casa') && N.catalogo(N.normalizar({})).length === N.ESTRUTURAS.length, 'o catálogo é o da casa (e o do acampamento continua o de antes)');
let e = N.normalizar({ tipo: 'esconderijo', esc: 'fortaleza', nivel: 1, exp: 57 });
ok(e.nivel === 4 && N.faixaNivel(e).max === 8 && e.faixas.length === 10 && N.faixa(e).nome === 'Vigiados', 'o esconderijo: a fortaleza começa no 4; 57 de exposição é “Vigiados”');
ok(j(N.efBase(e)) === j({ conf: 0, san: 0, rec: 5, prov: 0 }), 'o nível e a faixa somam ao descanso: ' + j(N.efBase(e)));
ok(N.normalizar({ tipo: 'esconderijo', esc: 'porao', nivel: 7 }).nivel === 3 && N.normalizar({ tipo: 'esconderijo', esc: 'xyz' }).esc === 'casavelha', 'o porão não passa do 3; o tipo desconhecido vira casa velha');
ok(N.normalizar({ tipo: 'esconderijo', exp: 250 }).exp === 100 && N.faixaDe(100) === 9 && N.faixaDe(9) === 0, 'a exposição vai de 0 a 100, em 10 faixas');
const nomes = N.normalizar({ tipo: 'casa', niveis: [{ nome: 'Toca', ef: { conf: 1 } }] });
ok(nomes.niveis[0].nome === 'Toca' && nomes.niveis[0].ef.conf === 1 && nomes.niveis[1].nome === 'Casebre', 'o mestre muda o nome e o número de um nível (os outros ficam no padrão)');
// o descanso numa casa: sem o clima de lá fora, sem caça
const gente = [{ id: 'p1', nome: 'Kael', recursos: [{ id: 'hp', nome: 'Vida', max: 100, atual: 50 }], san: 50, conf: 40, poderes: [], fad: null, tmp: [] }];
const pl = N.planejar(N.normalizar({ tipo: 'casa', nivel: 8, area: { p1: 'caca' } }), 'longo', gente, { clima: { k: 'tempestade' }, caca: { atr: 'PER', dif: 10, rolagens: [{ id: 'p1', total: 99 }] } });
ok(pl.clima === null && pl.caca === null && pl.linhas[0].conf.para === 40 + 10 + 20 - 10, 'na casa: o clima e a caça ficam de fora; a mansão soma +20 no Conforto (sem rações, −10): ' + j(pl.linhas[0].conf));
ok(N.SO_MESTRE.includes('nivel') && N.SO_MESTRE.includes('exp') && N.mexeNoMestre(c, Object.assign({}, c, { nivel: 6 })) && !N.mexeNoMestre(c, Object.assign({}, c, { provisoes: [] })), 'o nível e a exposição são do mestre; as provisões, não');
// os desenhos
const tamanhos = [1, 2, 3, 4, 5, 6, 7, 8].map(n => BD.casa(n).length);
ok(tamanhos.every((t, i) => !i || t > tamanhos[0]) && tamanhos[7] > tamanhos[2], 'a casa cresce de nível em nível (o desenho tem mais coisas): ' + tamanhos.join(','));
ok(BD.ESC.length === 6 && BD.ESC.every(k => { const a = BD.cena({ tipo: 'esconderijo', esc: k, nivel: 1 }), b = BD.cena({ tipo: 'esconderijo', esc: k, nivel: 8 }); return a.startsWith('<defs') && b.length > a.length; }), 'cada tipo de esconderijo tem o desenho dele, com mais coisa nos níveis de cima');

(async () => {
  const s = await start();
  const dv = await s.device({ name: 'bases', w: 1400, h: 880 });
  const pg = dv.page;
  pg.setDefaultTimeout(8000);
  const erros = [];
  pg.on('pageerror', x => erros.push(String(x.message)));
  try {
    await pg.goto(s.base + 'acampamento/?debug', { waitUntil: 'load' });
    await pg.evaluate(() => { localStorage.clear(); localStorage.setItem('tinycats:testes-tudo-aberto', '1'); });
    await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(400);
    ok(await pg.locator('#btNovaBase').isVisible() && (await pg.locator('#base option').count()) === 1, 'o botão “+ Base” e o seletor (só o acampamento, por enquanto)');
    // a casa
    await pg.click('#btNovaBase'); await pg.fill('#nb-nome', 'Casa dos Ourives'); await pg.click('#nb-criar'); await pg.waitForTimeout(300);
    let st = await pg.evaluate(() => ({ b: __acamp.baseId, t: __acamp.camp.tipo, n: __acamp.camp.nivel, opts: [...document.querySelectorAll('#base option')].map(o => o.textContent), cena: document.getElementById('cenario').innerHTML.length, areas: document.getElementById('areas').hidden, abas: [...document.querySelectorAll('#tabs .tab')].map(x => x.textContent) }));
    ok(st.b && st.t === 'casa' && st.n === 1 && st.opts.length === 2 && /Casa dos Ourives/.test(st.opts[1]) && st.cena > 1000 && st.areas, 'criou a casa: o seletor tem as duas, a cena é a da casa, sem as áreas do acampamento');
    ok(j(st.abas) === j(['Grupo', 'Casa', 'Provisões', 'Cômodos', 'Bancada', 'Diário']), 'as abas da casa (sem a caravana): ' + j(st.abas));
    await pg.click('#tab-base'); await pg.click('#base-subir'); await pg.click('#base-subir'); await pg.waitForTimeout(150);
    st = await pg.evaluate(() => ({ n: __acamp.camp.nivel, agora: document.querySelector('.niveis-base li.agora').dataset.nivel, resumo: document.getElementById('base-resumo').textContent }));
    ok(st.n === 3 && st.agora === '3' && /Casa simples/.test(st.resumo), 'reformou duas vezes: nível 3, casa simples');
    await pg.click('#base-ir-6'); await pg.waitForTimeout(100);
    ok(await pg.evaluate(() => __acamp.camp.nivel) === 6, 'e foi direto para o 6 (casarão)');
    await pg.click('#tab-estrutura'); await pg.click('#ct-novo'); await pg.click('#ct-banheiro'); await pg.waitForTimeout(150);
    st = await pg.evaluate(() => ({ c: __acamp.N.comodos(__acamp.camp).map(m => m.tipo), txt: document.getElementById('estResumo').textContent }));
    ok(j(st.c) === j(['banheiro']) && /1 de 6 cômodos/.test(st.txt), 'um banheiro: 1 de 6 cômodos');
    // o esconderijo
    await pg.click('#btNovaBase'); await pg.click('#nb-tipo-esconderijo'); await pg.selectOption('#nb-esc', 'armazem'); await pg.fill('#nb-nome', 'O armazém do porto'); await pg.click('#nb-criar'); await pg.waitForTimeout(200);
    await pg.click('#tab-base');
    for (const b of ['#base-exp-mais10', '#base-exp-mais10', '#base-exp-mais5']) await pg.click(b);
    st = await pg.evaluate(() => ({ t: __acamp.camp.tipo, esc: __acamp.camp.esc, n: __acamp.camp.nivel, exp: __acamp.camp.exp, txt: document.getElementById('base-exp-txt').textContent, d: __acamp.camp.diario.length, fora: document.querySelectorAll('.niveis-base li.fora').length }));
    ok(st.t === 'esconderijo' && st.esc === 'armazem' && st.n === 2 && st.exp === 25 && /Sussurros/.test(st.txt) && st.d >= 1 && st.fora === 4, 'o armazém: nível 2 (os de fora do alcance apagados), exposição 25 (sussurros), anotada no diário: ' + j(st));
    ok(await pg.locator('#base-descer').isDisabled() && await pg.evaluate(() => __acamp.camp.nivel) === 2, 'o armazém não desce abaixo do 2');
    // trocar de base e voltar
    const ids = await pg.evaluate(() => __acamp.listaBases().map(b => b.id));
    await pg.selectOption('#base', ids[0]); await pg.waitForTimeout(150);
    st = await pg.evaluate(() => ({ t: __acamp.camp.tipo || 'acampamento', areas: document.getElementById('areas').hidden }));
    ok(st.t === 'acampamento' && !st.areas, 'de volta ao acampamento: as áreas voltam');
    const casaId = (await pg.evaluate(() => __acamp.listaBases())).find(b => b.tipo === 'casa').id;
    await pg.selectOption('#base', casaId); await pg.waitForTimeout(150);
    ok(await pg.evaluate(() => __acamp.camp.nivel) === 6 && await pg.evaluate(() => __acamp.N.comodos(__acamp.camp).length) === 1, 'a casa guardou o nível e o cômodo');
    await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(400);
    ok(await pg.evaluate(() => __acamp.camp.tipo) === 'casa', 'recarregando, continua na casa (lembrado neste aparelho)');
    await pg.screenshot({ path: __dirname + '/_bases.png' });
    // apagar
    await pg.click('#tab-base'); await pg.click('#base-apagar'); await pg.click('#base-apagar-sim'); await pg.waitForTimeout(200);
    ok(await pg.evaluate(() => !__acamp.camp.tipo && __acamp.listaBases().length === 2), 'apagou a casa (com confirmação): volta ao acampamento');
    ok(!erros.length, 'sem erros na página: ' + erros.join(' | '));
  } catch (x) { ok(false, 'falhou: ' + x.message); }
  await s.close();
  end();
})();
