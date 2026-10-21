// Mapa-múndi, Lote 12 (a campanha), na página (sem mesa):
//   · (parte 12a, SO=dia) as regras da campanha na aba Guerra (o resumo; "Mudar as regras…": os erros, os números, os
//     terrenos duros e os meses de inverno; salvar e Desfazer; "Voltar às de começo"); no exército, onde ele está e o que
//     vale ali (em casa, na terra inimiga com a montanha e o inverno, na aliada); o "Próximo dia" com o dia da campanha
//     (o reabastecimento, a forragem, o desgaste, a fome; desmarcar refaz as contas — o estoque vai para quem vem depois;
//     o exército desmarcado fica como está); aplicar e Desfazer; de domingo para segunda, o dia antes da semana (que
//     espera); a forragem na prévia da semana; no celular.
//   · (parte 12b, SO=ocupacao) no "Próximo dia", a ocupação: a proposta de ocupar (3 dias sem defensor), a de libertar e
//     a fortificação de pé que impede; desmarcar (a linha esmaece, nada muda de lugar; a contagem recomeça); a notícia
//     para o rascunho do Jornal (desmarcada; a prévia só com as marcadas); aplicar, Desfazer e Refazer (com a notícia);
//     as listras no mapa (na cor de quem ocupa); a região: quem ocupa e desde quando, "Tirar a ocupação…", "Anexar…"
//     (com a notícia) e "Marcar como ocupada…"; a aba Guerra (as terras ocupadas; a regra dos dias, no resumo e na janela);
//     quem joga (a leitura e as listras, sem a facção escondida); a paz com as terras (devolver e anexar, na notícia);
//     no celular.
//   · (parte 12c, SO=vida) a vida das tropas e a cura: a Enfermaria no catálogo ("Pôr as novas do catálogo pronto" no
//     mapa de antes; a cura de cada nível no editor), na cidade (a nota da cura); a unidade (o HP de cada tropa, a ferida
//     e "Curar a ferida"; a cura dos médicos); no exército, a cura dali; no "Próximo dia", a linha da cura (desmarcar,
//     aplicar e Desfazer); no celular.
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

  if (parte('ocupacao')) await passo('a ocupação', async () => {
    const ras = () => A(L, () => { try { return JSON.parse(localStorage.getItem('tinycats:jornal:rascunho') || 'null'); } catch (e) { return null; } });
    const materia = async re => { const r = await ras(); return r && r.materias ? r.materias.find(x => re.test(x.tit)) || null : null; };
    const comoJogador = async sim => { await A(L, x => { __mundo.App.comoJogador = x; __mundo.App.emit('muda', { origem: 'fora' }); }, sim); await espera(400); };
    const selecionar = async id => { await A(L, x => __mundo.App.selecionar(x ? [x] : []), id); await espera(250); };
    // o mundo: a Vanguarda há 2 dias no Vale sem defensor; Terra Alta ocupada pelo Vale, com a Hoste lá há 2 dias; o Forte do
    // Vale com a fortificação de pé e o Cerco de Aldar; a Frota nas Ilhas (aliadas)
    await A(L, () => __mundo.App.mudar('a ocupação: o começo', m => {
      const N = __mundo.N, ret = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
      m.objs = m.objs.filter(o => !['r4', 'k4', 'g4'].includes(o.id));
      for (const o of m.objs) if (o.k === 'r') delete o.ocup;
      m.objs.find(o => o.id === 'r1').ocup = { fac: 'fb', d: m.cal.dia - 5 };
      m.objs.push(Object.assign(N.objNovo('r', { pts: ret(460, 460, 360, 300) }), { id: 'r4', nome: 'Forte do Vale', fac: 'fb' }),
        Object.assign(N.objNovo('m', { x: 640, y: 560 }), { id: 'k4', nome: 'Castelo Negro', estr: { nome: 'Muralhas', def: 3, hp: 60, hpMax: 100 } }),
        Object.assign(N.objNovo('g', { x: 600, y: 680, sigla: 'CE' }), { id: 'g4', nome: 'Cerco', tipo: 'exercito', fac: 'fa', exe: { moral: 6, mant: 9, unid: [{ id: 'u4', nome: 'Sapadores', tropas: 120 }] } }));
      if (!m.guerra) m.guerra = { tipos: [], bats: [], hexes: {} };
      delete m.guerra.regras;
      m.guerra.pres = { r2: { fac: 'fa', n: 2 }, r1: { fac: 'fa', n: 2, lib: true } };
    })); await espera(300);
    const hoje0 = await A(L, () => __mundo.App.mapa.cal.dia);
    const dtTxt = dia => A(L, x => window.MundoPainel.kit.dataTxt(__mundo.App.mapa, x), dia);
    const dtNot = dia => A(L, x => { const m = __mundo.App.mapa, d = __mundo.N.dataDe(m.cal, x); return window.MundoCorte.dataTxt(m, { a: d.ano, m: d.mes, d: d.diaMes }); }, dia);
    ok(await A(L, () => !!__mundo.App.mapa.guerra.pres.r2 && __mundo.App.mapa.objs.find(o => o.id === 'r1').ocup.fac === 'fb'), '(o começo: as contagens e Terra Alta ocupada)');
    // o "Próximo dia": a ocupação
    await A(L, () => __mundo.App.selecionar([])); await espera(200);
    await semAvisos(L);
    await L.F.click('#diaMais');
    await L.F.waitForSelector('dialog.dia-dl[open]');
    const hoje = hoje0 + 1, hojeNot = await dtNot(hoje);
    const lr = k => textoDe(L, 'dialog.dia-dl[open] [data-k="' + k + '"]');
    ok(await lr('dia:ocup:r2-linha') === 'Ocupar Vale Fundo: fica ocupada por Aldar (3 dias sem defensor); a produção de lá vai para Aldar.'
      && await lr('dia:lib:r1-linha') === 'Libertar Terra Alta: volta para Aldar (3 dias sem as tropas de Vale).'
      && await lr('dia:reg:r4') === 'Forte do Vale: Aldar está lá, mas a fortificação de Castelo Negro está de pé — para ocupar, primeiro o cerco.',
      'no dia, a ocupação: a proposta de ocupar o Vale, a de libertar Terra Alta e o forte que impede: ' + await lr('dia:regs'));
    ok(await L.F.locator(dlg('[data-k="dia:ocup:r2"]')).isChecked() && await L.F.locator(dlg('[data-k="dia:lib:r1"]')).isChecked() && !(await L.F.locator(dlg('[data-k="dia:jornal"]')).isChecked())
      && /^A ocupação /.test(await lr('dia:regs')) && /Desmarcada, a proposta não vale agora e a contagem recomeça do zero\./.test(await lr('dia:regs')),
      'as propostas, marcadas; a caixa das notícias, desmarcada');
    const alt0 = await A(L, () => document.querySelector('dialog.dia-dl[open] [data-k="dia:regs"]').getBoundingClientRect().height);
    await L.F.uncheck(dlg('[data-k="dia:lib:r1"]')); await espera(120);
    ok(await A(L, () => document.querySelector('dialog.dia-dl[open] [data-k="dia:lib:r1-linha"]').classList.contains('nao')) && await lr('dia:lib:r1-linha') === 'Libertar Terra Alta: volta para Aldar (3 dias sem as tropas de Vale).'
      && Math.abs(await A(L, () => document.querySelector('dialog.dia-dl[open] [data-k="dia:regs"]').getBoundingClientRect().height) - alt0) < 0.5,
      'desmarcar: a linha esmaece com o mesmo texto (nada muda de lugar)');
    await L.F.check(dlg('[data-k="dia:jornal"]')); await L.F.click(dlg('[data-k="dia:jornal:ver"] > summary')); await espera(120);
    const nj = await lr('dia:jornal:txt');
    ok(nj === 'Vale Fundo ocupada por Aldar As tropas de Aldar ocupam Vale Fundo, terra de Vale (' + hojeNot + ').', 'a prévia das notícias: só a da proposta marcada: ' + nj);
    await L.F.locator(dlg('[data-k="dia:regs"]')).scrollIntoViewIfNeeded(); await semAvisos(L); await foto('l12b-dia-ocupacao');
    await L.F.click(dlg('[data-k="dia:ok"]')); await espera(450);
    const est = () => A(L, () => { const m = __mundo.App.mapa, R = id => m.objs.find(o => o.id === id); return { r1: R('r1').ocup || null, r2: R('r2').ocup || null, f2: R('r2').fac, pres: (m.guerra && m.guerra.pres) || null }; });
    let e = await est();
    ok(j(e.r2) === j({ fac: 'fa', d: hoje }) && e.r1 && e.r1.fac === 'fb' && !(e.pres && (e.pres.r1 || e.pres.r2)) && /Vale Fundo ocupada por Aldar\. A notícia foi para o rascunho do Jornal\./.test(await avisos(L))
      && await A(L, () => __mundo.App.rotuloDesfazer()) === 'o dia da campanha' && !!(await materia(/^Vale Fundo ocupada por Aldar$/)),
      'aplicar: o Vale ocupado por Aldar desde hoje; Terra Alta continua ocupada (a contagem recomeça); a notícia no rascunho: ' + j(e) + ' ' + await avisos(L));
    await A(L, () => __mundo.App.desfazer()); await espera(400);
    e = await est();
    ok(!e.r2 && e.pres && e.pres.r2 && e.pres.r2.n === 2 && e.pres.r1 && e.pres.r1.lib && !(await materia(/^Vale Fundo ocupada/)), 'Desfazer: sem a ocupação, as contagens de antes e sem a notícia');
    await A(L, () => __mundo.App.refazer()); await espera(400);
    ok(j((await est()).r2) === j({ fac: 'fa', d: hoje }) && !!(await materia(/^Vale Fundo ocupada por Aldar$/)), 'Refazer: a ocupação e a notícia de novo');
    // no exército, a ocupada: de quem ocupa (a Vanguarda reabastece lá)
    await aba(L, 'selecao'); await selecionar('g2');
    ok(await textoDe(L, '#pane [data-k="o:g2:campanha"]') === 'Em Vale Fundo, ocupada por Aldar: no "Próximo dia", reabastece do estoque de Aldar até 10 dias.', 'no exército: a terra ocupada por Aldar é casa: ' + await textoDe(L, '#pane [data-k="o:g2:campanha"]'));
    await selecionar(null);
    // as listras no mapa, na cor de quem ocupa
    const listras = id => A(L, x => { const p = document.querySelector('#mundo svg.camadas g.obj[data-id="' + x + '"] path.reg-ocup'); if (!p) return null; const pid = (p.getAttribute('fill') || '').replace(/^url\(#|\)$/g, ''), r = document.getElementById(pid); return { fac: p.getAttribute('data-ocup'), cor: r ? r.querySelector('rect').getAttribute('fill') : null }; }, id);
    ok(j(await listras('r2')) === j({ fac: 'fa', cor: '#3f7fbf' }) && j(await listras('r1')) === j({ fac: 'fb', cor: '#8a2a2a' }) && await listras('r3') === null, 'no mapa, as listras na cor de quem ocupa (a região livre, sem)');
    await semAvisos(L); await foto('l12b-mapa');
    // a região: quem ocupa e desde quando
    await aba(L, 'selecao'); await selecionar('r2');
    ok(await textoDe(L, '#pane [data-k="o:r2:ocup"]') === 'Ocupada por Aldar desde ' + await dtTxt(hoje) + '.' && await campo(L, 'o:r2:ocup-anexar').count() === 1 && await campo(L, 'o:r2:ocup-tirar').count() === 1,
      'na região: ocupada por Aldar desde hoje, com "Anexar…" e "Tirar a ocupação…": ' + await textoDe(L, '#pane [data-k="o:r2:ocup"]'));
    await campo(L, 'o:r2:ocup').scrollIntoViewIfNeeded(); await semAvisos(L); await foto('l12b-regiao');
    await botao(L, 'o:r2:ocup-tirar'); await L.F.waitForSelector('dialog.oc-dl[open]');
    ok(await textoDe(L, 'dialog.oc-dl[open] h2') === 'Tirar a ocupação de Vale Fundo?' && !(await L.F.locator(dlg('[data-k="oc:jornal"]')).isChecked()), 'tirar: a confirmação (a caixa do Jornal desmarcada)');
    await L.F.click(dlg('[data-k="oc:ok"]')); await espera(400);
    const et = await est();
    ok(!et.r2 && et.f2 === 'fb' && /Vale Fundo não está mais ocupada: volta a ser só de Vale\./.test(await avisos(L)) && !(await materia(/^Vale Fundo livre de novo$/)), 'tirar a ocupação: o Vale volta a ser só do Vale (a dona, a mesma; sem a notícia): ' + j(et));
    await A(L, () => __mundo.App.desfazer()); await espera(400);
    ok(j((await est()).r2) === j({ fac: 'fa', d: hoje }), 'Desfazer: ocupado de novo');
    await botao(L, 'o:r2:ocup-anexar'); await L.F.waitForSelector('dialog.oc-dl[open]');
    await L.F.check(dlg('[data-k="oc:jornal"]')); await L.F.click(dlg('[data-k="oc:jornal:ver"] > summary')); await espera(120);
    const na = await textoDe(L, 'dialog.oc-dl[open] [data-k="oc:jornal:txt"]');
    ok(await textoDe(L, 'dialog.oc-dl[open] h2') === 'Anexar Vale Fundo?' && na === 'Aldar anexa Vale Fundo Vale Fundo, que era de Vale, passa a ser de Aldar (' + hojeNot + ').', 'anexar: a confirmação e a prévia da notícia: ' + na);
    await semAvisos(L); await foto('l12b-anexar');
    await L.F.click(dlg('[data-k="oc:ok"]')); await espera(400);
    e = await est();
    ok(!e.r2 && e.f2 === 'fa' && /Vale Fundo passa a ser de Aldar\. A notícia foi para o rascunho do Jornal\./.test(await avisos(L)) && !!(await materia(/^Aldar anexa Vale Fundo$/)), 'anexar: o Vale passa a ser de Aldar (sem a ocupação); a notícia');
    await A(L, () => __mundo.App.desfazer()); await espera(400);
    e = await est();
    ok(e.f2 === 'fb' && j(e.r2) === j({ fac: 'fa', d: hoje }) && !(await materia(/^Aldar anexa/)), 'Desfazer: do Vale, ocupado; sem a notícia');
    // marcar à mão
    await selecionar('r3');
    ok(await textoDe(L, '#pane [data-k="o:r3:ocup-nota"]') === 'Um exército de uma facção em guerra com Ilhas que fica aqui 3 dias sem defensor (e sem fortificação de pé) traz a proposta no “Próximo dia”.',
      'a região livre: como a ocupação chega');
    await selecionar('r1');
    ok(await textoDe(L, '#pane [data-k="o:r1:ocup-nota"]') === '' && await textoDe(L, '#pane [data-k="o:r1:ocup"]') === 'Ocupada por Vale desde ' + await dtTxt(hoje0 - 5) + '.', 'Terra Alta: ocupada pelo Vale (a contagem recomeçou: sem a nota)');
    await selecionar('r3');
    await botao(L, 'o:r3:ocup-marcar'); await L.F.waitForSelector('dialog.oc-dl[open]');
    ok(await A(L, () => document.querySelector('dialog.oc-dl[open] [data-k="oc:fac"]').value) === 'fa' && await A(L, () => [...document.querySelectorAll('dialog.oc-dl[open] [data-k="oc:fac"] option')].map(o => o.value).join()) === 'fa,fb',
      'marcar como ocupada: quem ocupa (sem a dona)');
    await L.F.selectOption(dlg('[data-k="oc:fac"]'), 'fb'); await L.F.click(dlg('[data-k="oc:ok"]')); await espera(400);
    ok(await A(L, x => JSON.stringify(__mundo.App.mapa.objs.find(o => o.id === 'r3').ocup) === JSON.stringify({ fac: 'fb', d: x }), hoje) && /Ilha Grande fica ocupada por Vale\./.test(await avisos(L)), 'marcar: as Ilhas ocupadas pelo Vale desde hoje');
    await A(L, () => __mundo.App.desfazer()); await espera(400);
    ok(await A(L, () => !__mundo.App.mapa.objs.find(o => o.id === 'r3').ocup), 'Desfazer: livre de novo');
    // a aba Guerra: as terras ocupadas e a regra dos dias
    await A(L, () => __mundo.App.selecionar([])); await espera(200);
    await aba(L, 'guerra');
    ok(await textoDe(L, '#pane [data-k="gu:ocup:r1"]') === 'Terra Alta de Aldar, ocupada por Vale desde ' + await dtTxt(hoje0 - 5) && await textoDe(L, '#pane [data-k="gu:ocup:r2"]') === 'Vale Fundo de Vale, ocupada por Aldar desde ' + await dtTxt(hoje)
      && await textoDe(L, '#pane [data-k="gu:regras-ocup"]') === 'Ocupação: 3 dias sem defensor (e sem fortificação de pé) para a proposta; o mesmo para libertar.',
      'na aba Guerra: as terras ocupadas e a regra: ' + await textoDe(L, '#pane [data-k="gu:ocup:r1"]'));
    await campo(L, 'gu:ocup:r1').scrollIntoViewIfNeeded(); await semAvisos(L); await foto('l12b-aba-guerra');
    await botao(L, 'gu:regras-mudar'); await L.F.waitForSelector('dialog.cr-dl[open]');
    ok(await A(L, () => document.querySelector('dialog.cr-dl[open] [data-k="cr:ocupar"]').value) === '3', 'a janela das regras: os dias para ocupar');
    await L.F.fill(dlg('[data-k="cr:ocupar"]'), '2,5'); await L.F.click(dlg('[data-k="cr:ok"]')); await espera(120);
    ok(await textoDe(L, 'dialog.cr-dl[open] .err') === 'Dias sem defensor para ocupar: um número inteiro de 1 a 365.', 'os dias: inteiros');
    await L.F.fill(dlg('[data-k="cr:ocupar"]'), '5'); await L.F.click(dlg('[data-k="cr:ok"]')); await espera(350);
    ok(await A(L, () => __mundo.App.mapa.guerra.regras.ocupar) === 5 && /^Ocupação: 5 dias/.test(await textoDe(L, '#pane [data-k="gu:regras-ocup"]')), 'salvar: 5 dias');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    // quem joga: a leitura e as listras (a facção escondida não vai)
    await comoJogador(true);
    await aba(L, 'selecao'); await selecionar('r2');
    ok(await textoDe(L, '#pane [data-k="ler:ocup"]') === 'Ocupada por Aldar desde ' + await dtTxt(hoje) + '.' && await campo(L, 'o:r2:ocup-tirar').count() === 0, 'quem joga: "Ocupada por Aldar desde…", sem os botões');
    await semAvisos(L); await foto('l12b-jogador');
    await comoJogador(false);
    await A(L, () => __mundo.App.mudar('o Vale escondido', m => { m.faccoes.find(f => f.id === 'fb').oculta = true; })); await espera(300);
    await comoJogador(true);
    await selecionar('r1');
    ok(await textoDe(L, '#pane [data-k="ler:ocup"]') === 'Ocupada desde ' + await dtTxt(hoje0 - 5) + '.' && j(await listras('r1')) === j({ fac: '', cor: '#6b7385' }), 'ocupada por quem eles não conhecem: "Ocupada desde…", as listras cinza');
    await comoJogador(false);
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    // a paz: as terras ocupadas entre as duas
    await A(L, () => { window.MundoDiplomaciaPainel.janelaPaz('fa', 'fb'); }); await L.F.waitForSelector('dialog.paz-dl[open]');
    const pz = s0 => 'dialog.paz-dl[open] ' + s0;
    ok(await textoDe(L, pz('[data-k="paz:terra:r1"] .tx')) === 'Terra Alta de Aldar, ocupada por Vale' && await textoDe(L, pz('[data-k="paz:terra:r2"] .tx')) === 'Vale Fundo de Vale, ocupada por Aldar'
      && await L.F.locator(pz('[data-k="paz:terra:r1:dev"]')).isChecked() && await L.F.locator(pz('[data-k="paz:terra:r2:dev"]')).isChecked(), 'a paz: as terras ocupadas, cada uma voltando para a dona (de começo)');
    await L.F.check(pz('[data-k="paz:terra:r2:anx"]')); await L.F.check(pz('[data-k="paz:jornal"]')); await L.F.click(pz('[data-k="paz:jornal:ver"] > summary')); await espera(120);
    const np = await textoDe(L, pz('[data-k="paz:jornal:txt"]'));
    ok(/ As terras ocupadas: Terra Alta volta para Aldar; Vale Fundo passa a ser de Aldar\.$/.test(np), 'a prévia da notícia da paz, com as terras: ' + np);
    await L.F.locator(pz('[data-k="paz:terras"]')).scrollIntoViewIfNeeded(); await semAvisos(L); await foto('l12b-paz');
    await L.F.click(pz('[data-k="paz:ok"]')); await espera(450);
    e = await est();
    const mp = await materia(/^Aldar e Vale fazem a paz$/);
    ok(!e.r1 && !e.r2 && e.f2 === 'fa' && /Aldar e Vale fizeram a paz\. Terras ocupadas: 1 devolvida, 1 anexada\. A notícia foi para o rascunho do Jornal\./.test(await avisos(L)) && mp && /\n\n\*\*As terras ocupadas:\*\* Terra Alta volta para Aldar; Vale Fundo passa a ser de Aldar\.$/.test(mp.txt),
      'a paz: Terra Alta devolvida, o Vale anexado; o aviso e a notícia: ' + j(e) + ' ' + await avisos(L));
    await A(L, () => __mundo.App.desfazer()); await espera(400);
    e = await est();
    ok(e.r1 && e.r1.fac === 'fb' && j(e.r2) === j({ fac: 'fa', d: hoje }) && e.f2 === 'fb' && await A(L, () => __mundo.App.mapa.faccoes.find(f => f.id === 'fa').rel.fb) === 'guerra', 'Desfazer: a guerra e as terras ocupadas de volta');
    // duas propostas (libertar Terra Alta; ocupar o Forte, com a fortificação em ruínas): sem a caixa, nenhuma notícia;
    // com ela, as duas — e no celular, o dia cabe
    await A(L, () => __mundo.App.mudar('a contagem de novo', m => { m.guerra.pres = { r1: { fac: 'fa', n: 2, lib: true }, r4: { fac: 'fa', n: 2 } }; m.objs.find(o => o.id === 'k4').estr.hp = 0; })); await espera(250);
    await L.P.setViewportSize({ width: 400, height: 820 }); await espera(400);
    await A(L, () => { window.MundoGuerraPainel.proporMantimentos(1); }); await L.F.waitForSelector('dialog.dia-dl[open]');
    await L.F.locator(dlg('[data-k="dia:regs"]')).scrollIntoViewIfNeeded();
    ok(await A(L, () => { const d = document.querySelector('dialog.dia-dl[open]'); return d.scrollWidth <= d.clientWidth + 1 && d.getBoundingClientRect().width <= window.innerWidth; }) && await L.F.locator(dlg('[data-k="dia:lib:r1"]')).count() === 1 && await L.F.locator(dlg('[data-k="dia:ocup:r4"]')).count() === 1,
      'no celular, o dia com a ocupação cabe (as duas propostas)');
    await semAvisos(L); await foto('l12b-dia-celular');
    await L.F.click(dlg('[data-k="dia:ok"]')); await espera(450);
    const sem2 = await A(L, () => { const m = __mundo.App.mapa; return [!!m.objs.find(o => o.id === 'r1').ocup, (m.objs.find(o => o.id === 'r4').ocup || {}).fac]; });
    ok(j(sem2) === j([false, 'fa']) && !(await materia(/^Terra Alta livre de novo$/)) && !(await materia(/^Forte do Vale ocupada/)) && !/rascunho do Jornal/.test(await avisos(L)), 'aplicar sem a caixa: Terra Alta livre, o Forte ocupado, nenhuma notícia: ' + j(sem2));
    await A(L, () => __mundo.App.desfazer()); await espera(400);
    await L.P.setViewportSize({ width: 1400, height: 900 }); await espera(300);
    await A(L, () => { window.MundoGuerraPainel.proporMantimentos(1); }); await L.F.waitForSelector('dialog.dia-dl[open]');
    await L.F.check(dlg('[data-k="dia:jornal"]')); await L.F.click(dlg('[data-k="dia:jornal:ver"] > summary')); await espera(120);
    ok(await lr('dia:jornal:txt') === 'Terra Alta livre de novo Aldar retoma Terra Alta, que estava ocupada por Vale (' + hojeNot + '). Forte do Vale ocupada por Aldar As tropas de Aldar ocupam Forte do Vale, terra de Vale (' + hojeNot + ').',
      'a prévia das duas notícias: ' + await lr('dia:jornal:txt'));
    await L.F.click(dlg('[data-k="dia:ok"]')); await espera(450);
    ok(!!(await materia(/^Terra Alta livre de novo$/)) && !!(await materia(/^Forte do Vale ocupada por Aldar$/)) && /Terra Alta livre de novo\. Forte do Vale ocupada por Aldar\. As 2 notícias foram para o rascunho do Jornal\./.test(await avisos(L)),
      'com a caixa: as duas notícias no rascunho (num aviso só): ' + await avisos(L));
    await A(L, () => __mundo.App.desfazer()); await espera(400);
    ok(!(await materia(/^Terra Alta livre de novo$/)) && !(await materia(/^Forte do Vale ocupada/)) && await A(L, () => !!__mundo.App.mapa.objs.find(o => o.id === 'r1').ocup), 'Desfazer: as duas notícias saem juntas');
  });

  if (parte('vida')) await passo('a vida das tropas e a cura', async () => {
    const selecionar = async id => { await A(L, x => __mundo.App.selecionar(x ? [x] : []), id); await espera(250); };
    const tx = k => textoDe(L, '#pane [data-k="' + k + '"]');
    // o começo: sem ocupação; a Hoste em Terra Alta com Lanceiros de 10 de HP (uma ferida: falta 6) e Médicos (20%); a
    // Vila Alta no mesmo lugar, com a Enfermaria (nível 2: 10%); o catálogo sem a Enfermaria (um mapa de antes)
    await A(L, () => __mundo.App.mudar('a vida: o começo', m => {
      const N = __mundo.N;
      for (const o of m.objs) if (o.k === 'r') delete o.ocup;
      if (m.guerra) delete m.guerra.pres;
      m.objs = m.objs.filter(o => o.id !== 'cv');
      const g1 = m.objs.find(o => o.id === 'g1');
      g1.exe.mant = 200;
      g1.exe.unid = [{ id: 'u1', nome: 'Lanceiros', tropas: 300, hpT: 10, fer: 6 }, { id: 'um', nome: 'Médicos', tropas: 10, cura: 20 }];
      m.objs.push(Object.assign(N.objNovo('m', { x: g1.x, y: g1.y }), { id: 'cv', nome: 'Vila Alta', ass: { niv: 'vila', pop: 0 } }));
      m.eco.cons = m.eco.cons.filter(c => c.id !== 'enfermaria');
    })); await espera(300);
    // o catálogo: "Pôr as novas do catálogo pronto"
    await A(L, () => __mundo.App.selecionar([])); await espera(150);
    await aba(L, 'faccoes');
    ok(await tx('eco:cons-faltam') === 'Pôr as novas do catálogo pronto (Enfermaria)', 'no mapa de antes, o catálogo oferece pôr a Enfermaria: ' + await tx('eco:cons-faltam'));
    await botao(L, 'eco:cons-faltam');
    const temEnf = () => A(L, () => __mundo.App.mapa.eco.cons.some(c => c.id === 'enfermaria'));
    ok(await temEnf() && /Entrou no catálogo: Enfermaria\./.test(await avisos(L)) && await campo(L, 'eco:cons-faltam').count() === 0 && await A(L, () => __mundo.App.rotuloDesfazer()) === 'pôr as novas do catálogo pronto',
      'pôr: a Enfermaria entra no catálogo (o botão sai)');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    ok(!(await temEnf()) && await campo(L, 'eco:cons-faltam').count() === 1, 'Desfazer: sem ela de novo');
    await A(L, () => __mundo.App.refazer()); await espera(300);
    // o editor: a cura de cada nível
    await campo(L, 'eco:c:enfermaria:editar').scrollIntoViewIfNeeded().catch(() => {});
    if (!(await campo(L, 'eco:c:enfermaria').count())) await botao(L, 'eco:cons-ver');
    ok(/^Enfermaria 1 espaço · 3 níveis Nível 1: cura \+5% · custa /.test(await tx('eco:c:enfermaria')), 'no catálogo, a Enfermaria: o nível 1 cura +5%: ' + await tx('eco:c:enfermaria'));
    await botao(L, 'eco:c:enfermaria:editar'); await L.F.waitForSelector('dialog.ct-dl[open]');
    const ct = k => L.F.locator('dialog.ct-dl[open] [data-k="' + k + '"]');
    ok(await ct('ct:1:cura').inputValue() === '5' && await ct('ct:2:cura').inputValue() === '10' && await ct('ct:3:cura').inputValue() === '15', 'o editor: a cura de cada nível');
    await ct('ct:1:cura').fill('150'); await L.F.click('dialog.ct-dl[open] [data-k="ct:ok"]'); await espera(120);
    ok(await textoDe(L, 'dialog.ct-dl[open] .err') === 'Nível 1: a cura, um número inteiro de 0 a 100.', 'a cura: até 100');
    await ct('ct:1:cura').fill('8'); await ct('ct:1:cura').scrollIntoViewIfNeeded(); await semAvisos(L); await A(L, () => { document.querySelector('dialog.ct-dl[open] .err').textContent = ''; }); await foto('l12c-catalogo');
    await L.F.click('dialog.ct-dl[open] [data-k="ct:ok"]'); await espera(350);
    ok(await A(L, () => __mundo.App.mapa.eco.cons.find(c => c.id === 'enfermaria').niveis.map(n => n.cura).join()) === '8,10,15', 'salvar: o nível 1 cura 8%');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    await A(L, () => __mundo.App.mudar('a Enfermaria na Vila Alta', m => { m.objs.find(o => o.id === 'cv').ass.cons = [{ id: 'ce1', t: 'enfermaria', n: 2 }]; })); await espera(300);
    // a cidade: a nota da cura
    await aba(L, 'selecao'); await selecionar('cv');
    ok(await tx('o:cv:cura') === 'Os exércitos da facção (ou de uma aliada) nesta cidade, ou colados nela, curam 10% por dia do HP que falta na tropa ferida.', 'na cidade, a nota da Enfermaria: ' + await tx('o:cv:cura'));
    await campo(L, 'o:cv:cura').scrollIntoViewIfNeeded(); await semAvisos(L); await foto('l12c-cidade');
    // a unidade: o HP de cada tropa e a ferida; no exército, a cura dali
    await selecionar('g1');
    ok(/cura 30% do HP que falta por dia \(médicos 20%, Enfermaria de Vila Alta 10%\)\.$/.test(await tx('o:g1:campanha')), 'no exército: a cura dos médicos e da Enfermaria: ' + await tx('o:g1:campanha'));
    if (!(await campo(L, 'o:g1:u:u1:hpT').count())) await botao(L, 'o:g1:u:u1:abre');
    ok(await A(L, () => document.querySelector('#pane [data-k="o:g1:u:u1:hpT"]').value) === '10' && await tx('o:g1:u:u1:hp') === 'HP da unidade: 2.994 de 3.000 · uma tropa ferida (4 de 10) — a soma das tropas: o dano mata uma a uma. Curar a ferida',
      'a unidade: o HP de cada tropa e o da unidade, com a ferida: ' + await tx('o:g1:u:u1:hp'));
    await campo(L, 'o:g1:u:u1:hp').scrollIntoViewIfNeeded(); await semAvisos(L); await foto('l12c-unidade');
    // o "Próximo dia": a cura
    await A(L, () => __mundo.App.selecionar([])); await espera(200);
    await semAvisos(L);
    await L.F.click('#diaMais');
    await L.F.waitForSelector('dialog.dia-dl[open]');
    const lc = () => textoDe(L, 'dialog.dia-dl[open] [data-k="dia:cura-linha:g1"]');
    ok(await lc() === 'Cura 30% (médicos 20%, Enfermaria de Vila Alta 10%): +2 HP na tropa ferida de Lanceiros.' && await L.F.locator(dlg('[data-k="dia:cura:g1"]')).isChecked() && await L.F.locator(dlg('[data-k="dia:cura-linha:g2"]')).count() === 0,
      'no dia: a cura da Hoste (6 → 4 do que falta), marcada; quem não cura, sem a linha: ' + await lc());
    await L.F.locator(dlg('[data-k="dia:cura-linha:g1"]')).scrollIntoViewIfNeeded(); await semAvisos(L); await foto('l12c-dia-cura');
    await L.F.uncheck(dlg('[data-k="dia:cura:g1"]')); await espera(120);
    ok(await lc() === 'Cura 30% (médicos 20%, Enfermaria de Vila Alta 10%): +2 HP na tropa ferida de Lanceiros.', 'desmarcada, a linha fica como estava');
    await L.F.check(dlg('[data-k="dia:cura:g1"]')); await espera(120);
    await L.F.click(dlg('[data-k="dia:ok"]')); await espera(450);
    const fer = () => A(L, () => __mundo.App.mapa.objs.find(o => o.id === 'g1').exe.unid.find(u => u.id === 'u1').fer);
    ok(await fer() === 4 && /Cura: \+2 HP\./.test(await avisos(L)), 'aplicar: a ferida cura 2 (o aviso diz): ' + await avisos(L));
    await A(L, () => __mundo.App.desfazer()); await espera(400);
    ok(await fer() === 6, 'Desfazer: a ferida como estava');
    // mudar o HP de cada tropa: a unidade volta inteira
    await aba(L, 'selecao'); await selecionar('g1');
    if (!(await campo(L, 'o:g1:u:u1:hpT').count())) await botao(L, 'o:g1:u:u1:abre');
    const esc = async (k, v) => { const c = campo(L, k); await c.fill(v); await c.press('Enter'); await espera(200); };
    await esc('o:g1:u:u1:hpT', '20');
    ok(await A(L, () => (u => [u.hpT, u.fer])(__mundo.App.mapa.objs.find(o => o.id === 'g1').exe.unid.find(u => u.id === 'u1')).join()) === '20,0', 'mudar o HP de cada tropa: 20, inteira');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    // "Curar a ferida" na unidade
    await aba(L, 'selecao'); await selecionar('g1');
    if (!(await campo(L, 'o:g1:u:u1:curar').count())) await botao(L, 'o:g1:u:u1:abre');
    await botao(L, 'o:g1:u:u1:curar');
    ok(await fer() === 0 && await tx('o:g1:u:u1:hp') === 'HP da unidade: 3.000 — a soma das tropas: o dano mata uma a uma.', '"Curar a ferida": a tropa inteira de novo');
    // no celular: a unidade cabe
    await L.P.setViewportSize({ width: 400, height: 820 }); await espera(400);
    ok(await A(L, () => { const p = document.getElementById('pane'); return p.scrollWidth <= p.clientWidth + 1; }), 'no celular, a unidade cabe no painel');
    await L.P.setViewportSize({ width: 1400, height: 900 }); await espera(300);
    await A(L, () => __mundo.App.desfazer()); await espera(300);
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
