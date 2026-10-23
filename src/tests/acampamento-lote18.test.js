// Lote 18, o Acampamento (sem mesa, tudo neste navegador):
//   · os abrigos em volta do fogo (a barraca com lona, cordas e estacas, a porta aberta e a luz do fogo; a tenda grande,
//     o toldo e a rede pelo que o grupo tem no Equipamento; mais barracas com mais gente);
//   · os veículos pelo tipo (as rodas com raios) e o estado no desenho (a roda quebrada, a carga demais);
//   · a área Caça (o canto dos caçadores e o Defumadouro);
//   · o quadro de distribuir pelas áreas (arrastar, as setas do teclado, o Desfazer da janela);
//   · a caça no descanso longo (cada caçador rola; a sugestão de rações; o mestre confirma; o Desfazer) e as regras dela.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const N = require('../../acampamento/nucleo.js');

const pc = (id, nome, lvl, estado) => ({ id, nome, raca: 'Humano', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: lvl, tiers: { FOR: 'A', DES: 'C', AGI: 'D', VIT: 'B', CAN: 'E' }, pctProprio: null,
  poderes: [], skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 10, DFM: 4 }, rol: { fixa: 5, fonte: 'total' }, ultRol: null,
  disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 }, estaque: { a: '', b: '' }, habilidades: [], itens: [],
  recursos: [{ id: 'hp' + id, nome: 'HP', fml: 'VIT*8 + LVL*5' }], notas: '', estado });
const fichas = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_dain', 'Dain X', 5, {}), pc('pc_lia', 'Lia', 3, {}), pc('pc_ogro', 'Ogro', 6, {})], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });
const acamp = JSON.stringify({ v: 1, nome: 'Vau', presentes: ['pc_dain', 'pc_lia', 'pc_ogro'],
  equipamentos: [{ id: 'eq1', nome: 'Tenda grande', on: true }, { id: 'eq2', nome: 'Toldo de lona', on: true }, { id: 'eq3', nome: 'Rede', on: false }],
  caravana: { veiculos: [{ id: 'vc1', nome: 'Carroça', tipo: 'carroca', cap: 100, estado: 'roda quebrada' }, { id: 'vc2', nome: 'Mula', tipo: 'animal', cap: 0 }, { id: 'vc3', nome: 'Coche', tipo: 'carruagem', cap: 50 }],
    carga: [{ id: 'cg1', nome: 'Barris', qtd: 3, peso: 40, veiculo: 'vc1' }, { id: 'cg2', nome: 'Baú', qtd: 1, peso: 10, veiculo: 'vc3' }] } });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'acamp18', seed: { urgm_calc_atributos_v1: fichas, 'tinycats:acampamento:v1': acamp } });
  const w = ms => P.waitForTimeout(ms || 160);
  const A = (fn, a) => P.evaluate(fn, a);
  const foto = async nome => { if (process.env.TC_SCRATCH) await P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };
  if (process.env.TC_SCRATCH) require('fs').mkdirSync(path.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true });
  let passou = 0;
  const passo = async (nome, fn) => { try { await fn(); passou++; } catch (e) { ok(false, nome + ' — parou: ' + e.message.split('\n')[0]); } };

  await P.goto(t.base + 'acampamento/?debug', { waitUntil: 'load' }); await w(900);

  await passo('os abrigos e os veículos', async () => {
    ok(await A(() => __acamp.pronto && __acamp.presentes().length === 3), 'o acampamento abre com os três em volta do fogo');
    const ab = await A(() => [...document.querySelectorAll('#cenario [data-abrigo]')].map(e => e.dataset.abrigo));
    ok(ab.includes('tenda') && ab.includes('toldo') && ab.filter(x => x === 'barraca').length === 1 && !ab.includes('rede'), 'a tenda grande e o toldo vêm do Equipamento em uso (a rede guardada, não): ' + ab.join(', '));
    ok(await P.locator('#cenario [data-abrigo="barraca"] .luz-lona').count() === 1 && await P.locator('#cenario [data-abrigo="barraca"] path[stroke="#9a8a68"]').count() >= 2, 'a barraca: a luz da fogueira na lona e as cordas até as estacas');
    const vs = await A(() => [...document.querySelectorAll('#cenario .veiculo')].map(e => e.dataset.tipo + (e.hasAttribute('data-quebrado') ? ':quebrado' : '') + (e.hasAttribute('data-cheio') ? ':cheio' : '')));
    ok(vs.join(',') === 'carroca:quebrado:cheio,animal,carruagem', 'os veículos: a carroça com a roda quebrada e a carga demais (120 kg de 100); a mula sem capacidade anotada e o coche dentro do peso: ' + vs.join(','));
    ok(await P.locator('#cenario .veiculo[data-tipo="carroca"] .roda-quebrada').count() === 1 && await P.locator('#cenario .veiculo[data-tipo="carroca"] .carga-demais').count() === 1, 'no desenho: a roda quebrada e a pilha da carga demais');
    ok(await P.locator('#cenario .veiculo[data-tipo="carruagem"] path[stroke-width="3"]').count() >= 16, 'as rodas com raios (o coche, com as duas)');
    await foto('l18-acamp-fogueira');
    // mais gente, mais barracas; a rede em uso entra atrás
    await A(() => __acamp.mudar('rede', c => { c.equipamentos.find(e => e.id === 'eq3').on = true; }));
    await w(250);
    const ab2 = await A(() => [...document.querySelectorAll('#cenario [data-abrigo]')].map(e => e.dataset.abrigo));
    ok(ab2.includes('rede') && ab2.includes('toldo'), 'com a rede em uso, ela também aparece (atrás): ' + ab2.join(', '));
    await A(() => __acamp.desfazer()); await w(200);
    // o estado arrumado: sem roda quebrada nem carga demais
    await A(() => __acamp.mudar('arrumar', c => { c.caravana.veiculos[0].estado = 'nova'; c.caravana.carga[0].qtd = 1; })); await w(250);
    ok(await P.locator('#cenario .veiculo[data-quebrado], #cenario .veiculo[data-cheio]').count() === 0, 'a roda consertada e a carga no peso: o desenho volta ao normal');
    await A(() => __acamp.desfazer()); await w(200);
  });

  await passo('o quadro de distribuir', async () => {
    ok(await P.locator('#areas button').allInnerTexts().then(x => x.map(s => s.replace(/\s+/g, ' ').trim()).join('|')) === 'Fogueira 3|Oficinas 0|Convívio 0|Guarda e Cuidado 0|Caça 0|Distribuir…', 'as abas das áreas: a Caça, e o botão Distribuir…');
    await P.locator('#btDistribuir').click(); await w(250);
    ok(await P.locator('#dlg[open] .qd-col').count() === 5 && await P.locator('#dlg[open] .qd-col[data-area="fogueira"] .qd-p').count() === 3, 'uma coluna por área, os três na Fogueira');
    await P.dragAndDrop('#qd-p-pc_lia', '.qd-col[data-area="caca"]'); await w(250);
    ok(await A(() => __acamp.camp.area.pc_lia === 'caca') && await P.locator('#dlg[open] .qd-col[data-area="caca"] #qd-p-pc_lia').count() === 1, 'arrastar Lia para a Caça muda a área dela');
    await P.locator('#qd-p-pc_ogro').focus(); await P.keyboard.press('ArrowRight'); await w(250);
    ok(await A(() => __acamp.camp.area.pc_ogro === 'oficinas') && await A(() => document.activeElement && document.activeElement.id === 'qd-p-pc_ogro'), 'com o retrato em foco, → leva para a próxima área (e o foco fica nele)');
    await foto('l18-acamp-distribuir');
    ok(!(await P.locator('#qd-desfazer').isDisabled()), 'o Desfazer da janela fica pronto');
    await P.locator('#qd-desfazer').click(); await w(250);
    ok(await A(() => !__acamp.camp.area.pc_ogro && __acamp.camp.area.pc_lia === 'caca'), 'Desfazer volta só a última (o Ogro para a Fogueira; Lia fica na Caça)');
    await P.locator('#qd-ok').click(); await w(200);
    ok(await P.locator('#dlg[open]').count() === 0 && (await P.locator('#area-tab-caca').innerText()).replace(/\s+/g, ' ').trim() === 'Caça 1', 'Pronto fecha; a aba da Caça conta 1');
  });

  await passo('a área Caça e o Defumadouro', async () => {
    await P.locator('#area-tab-caca').click(); await w(300);
    ok(await A(() => __acamp.areaVista === 'caca') && await P.locator('#roda .pers').count() === 1, 'na Caça, só Lia');
    await A(() => __acamp.mudar('construir', c => { c.melhorias.push(__acamp.N.item('construcao', 'defumadouro')); })); await w(300);
    ok(await P.locator('#cenario .construcao[data-tipo="defumadouro"]').count() === 1, 'o Defumadouro aparece na área Caça');
    const ef = await A(() => __acamp.N.efeitos(__acamp.camp));
    ok(ef.prov === -1, 'o Defumadouro (simples): 1 ração a menos por descanso');
    await A(() => __acamp.mudar('nivel', c => { const m = c.melhorias.find(x => x.tipo === 'defumadouro'); m.nivel = 3; m.ef = m.nv[2].ef; })); await w(300);
    ok(await P.locator('#cenario .construcao[data-tipo="defumadouro"][data-nivel="3"] .fumaca').count() === 2, 'no nível excelente: a cabana de defumar, com a fumaça');
    await foto('l18-acamp-caca');
    await A(() => { __acamp.desfazer(); __acamp.desfazer(); }); await w(200);
    await P.locator('#area-tab-fogueira').click(); await w(200);
  });

  await passo('a caça no descanso longo', async () => {
    await A(() => __acamp.abrirDescanso('longo')); await w(300);
    ok(await P.locator('#ds-caca').count() === 1 && await P.locator('#ds-caca [data-cacador]').count() === 1, 'no descanso longo, a caça com o caçador (Lia)');
    ok(/Percepção/.test(await P.locator('#ds-caca-atr option:checked').innerText()) && await P.locator('#ds-caca-dif').inputValue() === '30', 'rola a Percepção contra a dificuldade do lugar (floresta: 30)');
    const per = await A(() => __acamp.pessoa('pc_lia').atr.PER);
    ok(per > 0 && /Percepção \d+, fixa 5/.test(await P.locator('#ds-caca [data-cacador="pc_lia"]').innerText()), 'o valor da ficha e a fixa: Percepção ' + per);
    // (a dificuldade em 0: passa sempre — as rações pelo total)
    await P.locator('#ds-caca-dif').fill('0'); await P.locator('#ds-caca-dif').dispatchEvent('change'); await w(200);
    await P.locator('#ds-caca-rolar-pc_lia').click(); await w(300);
    const pl = await A(() => { const t0 = document.querySelector('#ds-caca-r-pc_lia b'); return t0 ? +t0.textContent : null; });
    const esperadas = Math.min(5, 1 + Math.floor(pl / 10));
    ok(pl >= 5 && pl <= per && await P.locator('#ds-caca-on-pc_lia').isChecked(), 'Lia rolou ' + pl + ' (entre a fixa e o valor): passou, e a sugestão vem marcada');
    ok((await P.locator('#ds-caca-nota').innerText()).includes(esperadas + (esperadas === 1 ? ' ração marcada' : ' rações marcadas')), 'a nota diz quantas rações entram: ' + esperadas);
    ok(await P.locator('#ds-caca-atr').isDisabled(), 'depois da primeira rolagem, o atributo fica o mesmo para todos');
    await foto('l18-acamp-caca-descanso');
    // desmarcar e marcar de novo
    await P.locator('#ds-caca-on-pc_lia').uncheck(); await w(150);
    ok(/Quem está na área Caça/.test(await P.locator('#ds-caca-nota').innerText()), 'desmarcada, nada entra');
    await P.locator('#ds-caca-on-pc_lia').check(); await w(150);
    const antes = await A(() => __acamp.N.racoes(__acamp.camp));
    await P.locator('#ds-ok').click(); await w(400);
    const pv = await A(() => __acamp.camp.provisoes.find(p => p.id === 'caca'));
    ok(!!pv && pv.nome === 'Carne de caça' && pv.qtd === esperadas, 'depois do descanso: a Carne de caça com as ' + esperadas + ' rações');
    ok(await A(() => /a caça trouxe \d+ raç/.test(__acamp.camp.diario[0].texto)), 'o diário conta a caça');
    ok(antes === 0 && await A(() => __acamp.N.racoes(__acamp.camp)) === esperadas, '(sem rações antes, o descanso não gastou nada; sobram as da caça)');
    await P.keyboard.press('Control+z'); await w(300);
    ok(await A(() => !__acamp.camp.provisoes.some(p => p.id === 'caca')), 'Ctrl+Z desfaz o descanso e a caça');
  });

  await passo('as regras da caça', async () => {
    await P.locator('#tab-diario').click(); await w(200);
    if (!(await P.locator('#regras').getAttribute('open') !== null)) await P.locator('#regras summary').click();
    await w(150);
    ok(await P.locator('#rg-caca').isVisible() && await P.locator('#rg-caca-dif-floresta').inputValue() === '30', 'nas Regras do descanso: a caça, com a dificuldade de cada lugar');
    await P.locator('#rg-caca-dif-floresta').fill('25'); await P.locator('#rg-caca-dif-floresta').dispatchEvent('change'); await w(200);
    await P.locator('#rg-caca-atr').selectOption('FUR'); await w(200);
    ok(await A(() => __acamp.camp.regras.caca.dif.floresta === 25 && __acamp.camp.regras.caca.atr === 'FUR'), 'mudar a dificuldade e o atributo da caça');
    await A(() => __acamp.abrirDescanso('longo')); await w(300);
    ok(/Furtividade/.test(await P.locator('#ds-caca-atr option:checked').innerText()) && await P.locator('#ds-caca-dif').inputValue() === '25', 'o descanso vem com a regra nova');
    await P.keyboard.press('Escape'); await w(150);
  });

  // a conta pura
  {
    const c = N.normalizar({ lugar: 'montanha', regras: { caca: { passo: 5, max: 3, dif: { montanha: 20 } } } });
    ok(JSON.stringify(N.racoesDaCaca(c, 19, 20)) === JSON.stringify({ passou: false, margem: -1, racoes: 0 }) && N.racoesDaCaca(c, 20, 20).racoes === 1 && N.racoesDaCaca(c, 29, 20).racoes === 2 && N.racoesDaCaca(c, 99, 20).racoes === 3,
      'as rações da caça: passou, 1; mais 1 a cada 5 acima; no máximo 3');
    ok(N.difDaCaca(c) === 20 && N.difDaCaca(c, 'deserto') === 55, 'a dificuldade do lugar (a da regra; sem ela, a de começo)');
  }

  ok(passou === 5, 'os passos terminaram');
  if (t.errs.length) console.log(t.errs.slice(0, 10).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
