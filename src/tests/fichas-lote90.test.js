// Lote 90 (sem mesa):
//   · o dano de elemento da arma ao lado do atributo principal dela (o cartão do número, o cartão do item, o "Agora")
//     e na rolagem (a ficha manda o elemento junto: el = [['FOGO', 3]]);
//   · o Embate saiu: o Bloqueio é VIT/2 + o valor próprio + os itens; o EMB de antes soma no Bloqueio;
//   · o cartão do item com os selos numa linha própria (o nome não some, os botões não vazam);
//   · o Acampamento: as abas do painel quebram em duas linhas em vez de sumir para o lado.
const { start, checker } = require('./lib');
const R = require('../../tc/rules.js');
const { ok, end } = checker();
const j = JSON.stringify;
const zero = { FOR: 0, DES: 0, VIT: 0, CAN: 0, AGI: 0 };
const it = (id, nome, o) => Object.assign({ id, nome, equipado: true, bonus: Object.assign({}, zero) }, o);
const pc = (id, nome, level, itens, o) => Object.assign({ id, nome, raca: 'Kitsune', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level, tiers: { FOR: 'B', DES: 'C', AGI: 'D', VIT: 'A', CAN: 'E' }, pctProprio: null, poderes: [],
  skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 3, DFM: 6, BLQ: 2 }, rol: { fixa: 0, fonte: 'total' }, ultRol: null, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 },
  estaque: { a: '', b: '' }, habilidades: [], itens, recursos: [{ id: 'hp', nome: 'HP', fml: '100' }], notas: '' }, o);

// 1) as regras
const K = [it('k', 'Katana de gelo da Lua', { reliquia: true, troca: 'Arma Principal', bonus: { FOR: 14, DES: 6 }, dano: { FOGO: 3 } }),
  it('a', 'Arco curto', { equipado: false, bonus: { DES: 12 }, dano: { GELO: 2 } }),
  it('e', 'Broquel', { tipo: 'escudo', bonus: { BLQ: 10 } })];
ok(j(R.elemDaFicha({ itens: K })) === j({ FOR: [['FOGO', 3]] }), 'o elemento da arma equipada, pelo atributo principal dela (o arco guardado não conta)');
ok(/<svg[^>]*stroke="#f08a3c"/.test(R.svgElem('FOGO', 14)) && R.svgElem('X') === '' && Object.keys(R.ELEM_INFO).length === 10, 'um desenho e uma cor por elemento (os nove e o psicológico)');
ok(j(R.limparElem([['FOGO', 3], ['CORTE', 2], ['GELO', 'x'], ['LUZ', 0], ['PSI', 2.4]])) === j([['FOGO', 3], ['PSI', 2]]), 'a lista que vai na rolagem, arrumada');
const c0 = R.calcular(pc('p', 'P', 9, [], {}));
ok(c0.def.BLQ === Math.floor(c0.base.VIT / 2) + 2 && !('EMB' in c0.der), 'o Bloqueio = VIT/2 + o próprio (2); o Embate não existe mais — ' + c0.def.BLQ);

const ESTADO = j({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_d', 'Dain', 9, K)], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_d', selSit: null, aba: 'fichas', grupos: [] });

(async () => {
  const t = await start();
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const foto = async (P, nome, sel) => { if (process.env.FOTOS) { if (sel) await P.locator(sel).first().screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); else await P.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); } };
  const { page: P } = await t.device({ name: 'f90', w: 934, h: 900, seed: { urgm_calc_atributos_v1: ESTADO } });
  P.setDefaultTimeout(8000);
  const w = ms => P.waitForTimeout(ms);
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);

  await passo('o número da ficha', async () => {
    const forca = P.locator('.rsatr [data-rolar-r="FOR"]');
    ok(await forca.locator('.rselem svg').count() === 1 && /\+3/.test(await forca.locator('.rselem').innerText()), 'a Força mostra o fogo da katana ao lado do número ("🔥+3")');
    ok(await P.locator('.rsatr [data-rolar-r="DES"] .rselem').count() === 0, 'a Destreza, não (a katana é de FOR)');
    const b = await P.evaluate(() => { const c = calcular(S.personagens[0]); return [c.def.BLQ, c.base.VIT]; });
    ok(b[0] === Math.floor(b[1] / 2) + 2 + 10, 'o Bloqueio da ficha = VIT/2 + o próprio (2) + o broquel (10): ' + b[0]);
    ok(await P.locator('[data-rolar-r="EMB"]').count() === 0, 'o Embate saiu dos números da ficha');
    ok(/\+3/.test(await P.locator('.rsagora .agora-item').first().innerText()) && await P.locator('.rsagora .agora-item .itelem svg').count() >= 1, 'o "Agora" mostra o fogo colado no FOR');
    await foto(P, 'l90-numeros', '.rsnums');
  });

  await passo('a rolagem leva o elemento', async () => {
    await P.locator('.rsatr [data-rolar-r="FOR"]').click(); await w(300);
    const l = await P.evaluate(() => S.log[0]);
    ok(l && j2(l.el) === j2([['FOGO', 3]]), 'a rolagem da Força vai com o elemento (o chat mostra o selo ao lado do total): ' + JSON.stringify(l && l.el));
    await P.locator('.rsatr [data-rolar-r="DES"]').click(); await w(300);
    ok(!(await P.evaluate(() => S.log[0].el)), 'a da Destreza vai sem');
  });
  function j2(x) { return JSON.stringify(x); }

  await passo('o cartão do item', async () => {
    await P.locator('[data-abaficha="bolsas"]').click(); await w(300);
    const card = P.locator('[data-itcard="k"]');
    ok(await card.locator('.itselos .itrel').count() === 1 && await card.locator('.itselos .ittroca').count() === 1, 'a relíquia e o grupo de troca ficam na linha de baixo do nome');
    const vaz = await P.evaluate(() => [...document.querySelectorAll('.itcard')].flatMap(c => { const q = c.getBoundingClientRect(); return [...c.querySelectorAll('button, .itrel, .ittroca, .itetq')].filter(b => b.offsetParent).filter(b => { const r = b.getBoundingClientRect(); return r.right > q.right + 1; }).map(b => b.textContent.trim()); }));
    ok(vaz.length === 0, 'nada vaza do cartão em 934 px: ' + j(vaz));
    const larg = await card.locator('.itnome').evaluate(e => e.getBoundingClientRect().width);
    ok(larg > 120, 'o nome tem espaço (' + Math.round(larg) + ' px)');
    const bon = await card.locator('.itbon').innerText();
    ok(/FOR \+14\s*\+3/.test(bon.replace(/Fogo\s*/, '')) && await card.locator('.itbon .itelem svg').count() === 1, 'no cartão, o fogo vem colado no FOR — ' + bon.replace(/\s+/g, ' '));
    await foto(P, 'l90-cartao', '#painelItens');
  });

  await passo('o Acampamento', async () => {
    for (const w0 of [1366, 390]) {
      await P.setViewportSize({ width: w0, height: 900 });
      await P.goto(t.base + 'acampamento/?debug', { waitUntil: 'load' }); await w(1200);
      const fora = await P.evaluate(() => [...document.querySelectorAll('#tabs .tab, .areas button')].filter(b => { const r = b.getBoundingClientRect(), p = b.parentElement.getBoundingClientRect(); return r.right > p.right + 1 || r.right > innerWidth + 1; }).map(b => b.textContent.trim()));
      ok(fora.length === 0, 'Acampamento em ' + w0 + ' px: nenhuma aba nem área sai da caixa — ' + j(fora));
      if (w0 === 1366) await foto(P, 'l90-acampamento', '.side');
    }
  });

  ok(t.errs.length === 0, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
