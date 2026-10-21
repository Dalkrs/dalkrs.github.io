// Mapa-múndi, Lote 12 (a campanha), na página (sem mesa):
//   · (parte 12a, SO=dia) as regras da campanha na aba Guerra (o resumo; "Mudar as regras…": os erros, os números, os
//     terrenos duros e os meses de inverno; salvar e Desfazer; "Voltar às de começo"); no exército, onde ele está e o que
//     vale ali (em casa, na terra inimiga com a montanha e o inverno, na aliada); o "Próximo dia" com o dia da campanha
//     (o reabastecimento, a forragem, o desgaste, a fome; desmarcar refaz as contas — o estoque vai para quem vem depois;
//     o exército desmarcado fica como está); aplicar e Desfazer; de domingo para segunda, o dia antes da semana (que
//     espera); a forragem na prévia da semana; no celular.
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;

async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const A = (a, fn, arg) => a.F.evaluate(fn, arg);
const campo = (a, k) => a.F.locator(`#pane [data-k="${k}"]`);
async function aba(a, id) { await a.F.click('#tab-' + id); await a.F.waitForTimeout(180); }
async function semAvisos(a) { await A(a, () => document.getElementById('toasts').replaceChildren()); }
async function botao(a, k) { await semAvisos(a); await a.F.click(`#pane [data-k="${k}"]`); await a.F.waitForTimeout(220); }
const avisos = a => A(a, () => document.getElementById('toasts').innerText);
const SO = (process.env.SO || '').split(',').filter(Boolean), parte = k => !SO.length || SO.includes(k);
const textoDe = (a, s) => A(a, x => { const e = document.querySelector(x); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; }, s);
const dlg = s => 'dialog.mundo-dl[open] ' + s;

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'lote12', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame() };
  const foto = async nome => { if (process.env.TC_SCRATCH) await L.P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };

  await passo('o mapa', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    // o mundo: Aldar em guerra com o Vale e aliada das Ilhas; três regiões; a grade, com a montanha debaixo da Vanguarda;
    // a economia ligada (com 20 de Suprimentos para Aldar e 5 por semana no Vale); três exércitos de Aldar
    await A(L, () => {
      const { App, N } = __mundo, R = window.MundoReino;
      App.mudar('montar', m => {
        m.cal.dia = 0;
        m.grade = { tam: 40, x: 0, y: 0 };
        m.faccoes.push({ id: 'fa', nome: 'Aldar', cor: '#3f7fbf', rel: { fb: 'guerra', fc: 'alianca' } }, { id: 'fb', nome: 'Vale', cor: '#8a2a2a', rel: { fa: 'guerra' } }, { id: 'fc', nome: 'Ilhas', cor: '#2f8f8f', rel: { fa: 'alianca' } });
        const ret = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
        m.objs.push(Object.assign(N.objNovo('r', { pts: ret(40, 40, 360, 360) }), { id: 'r1', nome: 'Terra Alta', fac: 'fa' }),
          Object.assign(N.objNovo('r', { pts: ret(460, 40, 360, 360) }), { id: 'r2', nome: 'Vale Fundo', fac: 'fb' }),
          Object.assign(N.objNovo('r', { pts: ret(880, 40, 360, 360) }), { id: 'r3', nome: 'Ilha Grande', fac: 'fc' }),
          Object.assign(N.objNovo('g', { x: 200, y: 200, sigla: 'HO' }), { id: 'g1', nome: 'Hoste', tipo: 'exercito', fac: 'fa', exe: { moral: 6, mant: 0, unid: [{ id: 'u1', nome: 'Lanceiros', tropas: 300 }] } }),
          Object.assign(N.objNovo('g', { x: 640, y: 200, sigla: 'VG' }), { id: 'g2', nome: 'Vanguarda', tipo: 'exercito', fac: 'fa', exe: { moral: 6, mant: 2, unid: [{ id: 'u2', nome: 'Batedores', tropas: 150 }] } }),
          Object.assign(N.objNovo('g', { x: 1060, y: 200, sigla: 'FR' }), { id: 'g3', nome: 'Frota', tipo: 'exercito', fac: 'fa', exe: { moral: 6, mant: 0, unid: [{ id: 'u3', nome: 'Marujos', tropas: 100 }] } }));
        const h = N.hexDe(m, 640, 200);
        m.hexes = Object.assign({}, m.hexes, { [h.q + ',' + h.r]: 'mo' });
        R.ligarEconomia(m);
      });
      App.mudar('o estoque e a produção', m => {
        m.faccoes.find(f => f.id === 'fa').rec.find(r => r.id === 'suprimentos').n = 20;
        m.objs.find(o => o.id === 'r2').prod = { suprimentos: 5 };
      });
    });
    ok(await A(L, () => { const m = __mundo.App.mapa; return !!(m && m.eco && m.eco.on && m.objs.filter(o => o.k === 'g').length === 3 && m.faccoes.find(f => f.id === 'fa').rec.find(r => r.id === 'suprimentos').n === 20); }),
      '(o mapa: três facções, três regiões, a economia e três exércitos)');
  });

  if (parte('dia')) await passo('o dia da campanha', async () => {
    const rg = () => A(L, () => JSON.parse(JSON.stringify((__mundo.App.mapa.guerra && __mundo.App.mapa.guerra.regras) || null)));
    // as regras na aba Guerra
    await aba(L, 'guerra');
    ok(await textoDe(L, '#pane [data-k="gu:regras"]') === 'Reabastece até 10 dias de comida (cada mantimento custa 1 do estoque) · forragem: 50% do que come · desgaste por dia: sem comida 2%, em terreno duro 1%, no inverno +1% (o terreno e o inverno, só fora de casa).'
      && await textoDe(L, '#pane [data-k="gu:regras-onde"]') === 'Terrenos duros: Montanha, Pântano, Deserto, Neve, Lava, Selva, Tundra, Terra corrompida. Inverno: Alvorada, Degelo, Noite Longa e a zona do evento Inverno rigoroso.',
      'as regras da campanha, de começo, na aba Guerra: ' + await textoDe(L, '#pane [data-k="gu:regras"]'));
    await botao(L, 'gu:regras-mudar'); await L.F.waitForSelector('dialog.cr-dl[open]');
    ok(await L.F.locator(dlg('[data-k="cr:comeco"]')).count() === 0 && await L.F.locator(dlg('[data-k="cr:duros:mo"]')).isChecked() && await L.F.locator(dlg('[data-k="cr:meses:0"]')).isChecked() && !(await L.F.locator(dlg('[data-k="cr:meses:2"]')).isChecked()),
      'a janela das regras: as de começo (sem "Voltar às de começo"), a Montanha dura, Alvorada de inverno');
    await L.F.fill(dlg('[data-k="cr:teto"]'), '0'); await L.F.click(dlg('[data-k="cr:ok"]')); await espera(120);
    ok(await textoDe(L, 'dialog.cr-dl[open] .err') === 'Teto (dias de comida): um número inteiro de 1 a 365.', 'o teto 0: não passa');
    await L.F.fill(dlg('[data-k="cr:teto"]'), '12'); await L.F.fill(dlg('[data-k="cr:forr"]'), '25,5'); await L.F.uncheck(dlg('[data-k="cr:duros:mo"]')); await L.F.check(dlg('[data-k="cr:meses:2"]'));
    await semAvisos(L); await A(L, () => { document.querySelector('dialog.cr-dl[open] .err').textContent = ''; }); await foto('l12-regras');
    await L.F.click(dlg('[data-k="cr:ok"]')); await espera(350);
    const r1 = await rg();
    ok(r1 && r1.teto === 12 && r1.forr === 25.5 && !r1.duros.includes('mo') && j(r1.meses) === j([0, 1, 2, 11]) && /As regras da campanha estão salvas\./.test(await avisos(L))
      && /^Reabastece até 12 dias/.test(await textoDe(L, '#pane [data-k="gu:regras"]')) && /Inverno: Alvorada, Degelo, Semeadura, Noite Longa/.test(await textoDe(L, '#pane [data-k="gu:regras-onde"]')),
      'salvar: o teto, a forragem (com vírgula), sem a Montanha, Semeadura de inverno: ' + j(r1));
    await botao(L, 'gu:regras-mudar'); await L.F.waitForSelector('dialog.cr-dl[open]');
    await L.F.click(dlg('[data-k="cr:comeco"]')); await espera(350);
    ok(await rg() === null && /As regras da campanha voltaram às de começo\./.test(await avisos(L)), '"Voltar às de começo": as regras do mestre saem');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    ok((await rg()).teto === 12, 'Desfazer: as do mestre de volta');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    ok(await rg() === null, 'Desfazer de novo: as de começo');
    // no exército: onde ele está e o que vale ali
    const onde = async id => { await A(L, x => __mundo.App.selecionar([x]), id); await espera(250); await aba(L, 'selecao'); return textoDe(L, '#pane [data-k="o:' + id + ':campanha"]'); };
    ok(await onde('g1') === 'Em Terra Alta, terra de Aldar: no "Próximo dia", reabastece do estoque de Aldar até 10 dias.', 'a Hoste, em casa: reabastece');
    ok(await onde('g2') === 'Em Vale Fundo, terra inimiga (Vale): colhe 50% do que come (forragem) · terreno duro (Montanha): −1% das tropas por dia · inverno: −1% por dia.', 'a Vanguarda, na terra inimiga: a forragem, a montanha e o inverno: ' + await onde('g2'));
    await campo(L, 'o:g2:campanha').scrollIntoViewIfNeeded(); await semAvisos(L); await foto('l12-exercito');
    ok(await onde('g3') === 'Em Ilha Grande, terra aliada (Ilhas): no "Próximo dia", reabastece do estoque de Aldar até 10 dias.', 'a Frota, na aliada: reabastece do estoque de Aldar');
    // o "Próximo dia": o dia da campanha
    await A(L, () => __mundo.App.selecionar([])); await espera(200);
    await semAvisos(L);
    await L.F.click('#diaMais');
    await L.F.waitForSelector('dialog.dia-dl[open]');
    const ex = id => textoDe(L, 'dialog.dia-dl[open] [data-k="dia:ex:' + id + '"]');
    ok(await textoDe(L, 'dialog.dia-dl[open] h2') === 'O dia da campanha', 'o "Próximo dia" abre o dia da campanha');
    ok(await ex('g1') === 'Hoste em Terra Alta, terra de Aldar Come 3 por dia: 0 → 17 (dá para mais 5 dias). Reabastece 20 mantimentos (20 Suprimentos do estoque de Aldar, que fica em 0). Desgaste: nenhum, com o que está marcado.',
      'a Hoste: reabastece o que dá (20 de Suprimentos) e come; a linha do desgaste fica no lugar (sem reabastecer, ela passaria fome): ' + await ex('g1'));
    ok(await ex('g2') === 'Vanguarda em Vale Fundo, terra inimiga: Vale Come 2 por dia: 2 → 1 (não dá para mais um dia). Forragem: colhe 1 mantimento em Vale Fundo (a produção de Suprimentos de lá cai nesta semana). Desgaste: −3 tropas (terreno duro: Montanha, inverno): 150 → 147.',
      'a Vanguarda: a forragem e o desgaste da montanha e do inverno: ' + await ex('g2'));
    ok(await ex('g3') === 'Frota em Ilha Grande, terra aliada: Ilhas Come 1 por dia: 0 → 0 (acabou); 1 dia sem comida: moral 6 → 5, e a fome tira ATQ. Reabastece: nada (o estoque de Suprimentos de Aldar acabou). Desgaste: −2 tropas (sem comida): 100 → 98.',
      'a Frota: o estoque acabou antes dela; a fome e o desgaste da fome: ' + await ex('g3'));
    await semAvisos(L); await foto('l12-dia');
    // desmarcar o reabastecimento da Hoste: ela passa fome, e o estoque vai para a Frota
    await L.F.uncheck(dlg('[data-k="dia:reab:g1"]')); await espera(120);
    ok(/Come 3 por dia: 0 → 0 \(acabou\); 1 dia sem comida: moral 6 → 5, e a fome tira ATQ\. Reabastece 20 mantimentos \(20 Suprimentos do estoque de Aldar\)\. Desgaste: −6 tropas \(sem comida\): 300 → 294\.$/.test(await ex('g1'))
      && /Reabastece 11 mantimentos \(11 Suprimentos do estoque de Aldar, que fica em 9\)\./.test(await ex('g3')) && /Come 1 por dia: 0 → 10 \(dá para mais 10 dias\)\. /.test(await ex('g3')) && /Desgaste: nenhum, com o que está marcado\./.test(await ex('g3')),
      'sem o reabastecimento da Hoste: ela passa fome (o desgaste dela, na linha que já estava lá), e o estoque vai para a Frota (que não passa fome): ' + await ex('g1') + ' | ' + await ex('g3'));
    await L.F.uncheck(dlg('[data-k="dia:desg:g2"]')); await L.F.uncheck(dlg('[data-k="dia:g:g3"]')); await espera(120);
    ok(/^Frota .* Fica como está: nada muda para ele hoje\./.test(await ex('g3')) && await L.F.locator(dlg('[data-k="dia:reab:g3"]')).isDisabled() && await A(L, () => document.querySelector('dialog.dia-dl[open] [data-k="dia:ex:g3"]').classList.contains('fora')),
      'o exército desmarcado fica como está (as caixas dele, travadas)');
    await L.F.check(dlg('[data-k="dia:g:g3"]')); await espera(120);
    await semAvisos(L); await foto('l12-dia-recusas');
    await L.F.click(dlg('[data-k="dia:ok"]')); await espera(400);
    const est = () => A(L, () => { const m = __mundo.App.mapa, G = id => m.objs.find(o => o.id === id).exe; return { g1: G('g1').mant, t1: G('g1').unid[0].tropas, m1: G('g1').moral, g2: [G('g2').mant, G('g2').unid[0].tropas], g3: [G('g3').mant, G('g3').moral, G('g3').unid[0].tropas], sup: m.faccoes.find(f => f.id === 'fa').rec.find(r => r.id === 'suprimentos').n, forr: (m.guerra && m.guerra.forr) || [] }; });
    const e1 = await est();
    ok(e1.g1 === 0 && j(e1.g2) === j([1, 150]) && j(e1.g3) === j([10, 6, 100]) && e1.sup === 9 && e1.forr.length === 1 && e1.forr[0].r === 'r2' && e1.forr[0].n === 1 && e1.t1 === 294 && e1.m1 === 5
      && /^O dia da campanha: Hoste, Vanguarda, Frota\. Saíram 11 Suprimentos do estoque\. Forragem: 1 mantimento\. Desgaste: −6 tropas\./.test(await avisos(L)) && await A(L, () => __mundo.App.rotuloDesfazer()) === 'o dia da campanha',
      'aplicar: a Hoste com fome (e o desgaste), a Vanguarda sem o desgaste, a Frota reabastecida; o estoque e a forragem guardada; o aviso: ' + j(e1) + ' ' + await avisos(L));
    await A(L, () => __mundo.App.desfazer()); await espera(350);
    const e2 = await est();
    ok(e2.g1 === 0 && e2.t1 === 300 && e2.m1 === 6 && j(e2.g2) === j([2, 150]) && j(e2.g3) === j([0, 6, 100]) && e2.sup === 20 && e2.forr.length === 0, 'Desfazer: tudo volta num passo (o dia continua passado)');
    // a virada da semana pelo "Próximo dia" (de domingo para segunda): o dia da campanha (o domingo) vem antes da semana, que espera
    await A(L, () => __mundo.App.mudar('para o domingo', m => { m.cal.dia = 6; m.cal.tempo = 0; })); await espera(300);
    await semAvisos(L);
    await L.F.click('#diaMais');
    await L.F.waitForSelector('dialog.dia-dl[open]');
    await espera(400);
    ok(await textoDe(L, 'dialog.dia-dl[open] h2') === 'O dia da campanha' && await L.F.locator('dialog.sem-dl[open]').count() === 0, 'de domingo para segunda: o dia da campanha primeiro, e a semana espera');
    await L.F.click(dlg('[data-k="dia:ok"]'));
    await L.F.waitForSelector('dialog.sem-dl[open]', { timeout: 4000 });
    const fr = await textoDe(L, 'dialog.sem-dl[open] [data-k="sem:fac:fb"] [data-k="sem:forr"]');
    ok(fr === 'Forragem de exércitos de fora em Vale Fundo: −1 Suprimentos na produção.', 'depois do dia, a prévia da semana: a forragem da Vanguarda no domingo tira da produção do Vale: ' + fr);
    await L.F.locator('dialog.sem-dl[open] [data-k="sem:forr"]').scrollIntoViewIfNeeded(); await semAvisos(L); await foto('l12-semana-forragem');
    await L.F.click('dialog.sem-dl[open] .pe button.btn:not(.pri)'); await espera(250);
    // no celular: o dia cabe
    await L.P.setViewportSize({ width: 400, height: 820 }); await espera(400);
    await A(L, () => { window.MundoGuerraPainel.proporMantimentos(1); }); await L.F.waitForSelector('dialog.dia-dl[open]');
    ok(await A(L, () => { const d = document.querySelector('dialog.dia-dl[open]'); return d.scrollWidth <= d.clientWidth + 1 && d.getBoundingClientRect().width <= window.innerWidth; }), 'no celular, o dia da campanha cabe');
    await semAvisos(L); await foto('l12-dia-celular');
    const antesN = j(await est());
    await L.F.click(dlg('[data-k="dia:nao"]')); await espera(200);
    ok(!(await L.F.locator('dialog.dia-dl[open]').count()) && j(await est()) === antesN, '"Agora não" fecha sem mudar nada');
    await L.P.setViewportSize({ width: 1400, height: 900 }); await espera(300);
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
