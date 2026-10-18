// Mapa-múndi, lote 8 (parte 6): a Guerra, pela interface (a página sozinha, no navegador).
//   · a aba Guerra (só do mestre; as seis abas cabem no painel): vazia no começo, com os tipos de tropa (a tabela do
//     mestre: o nome, "de longe" e a vantagem contra cada tipo), os exércitos, os hexágonos e o histórico;
//   · a seção Exército do grupo: "Pôr as unidades", cada unidade (tropas, HP, ATQ, DEF, magos, cerco, equipamentos,
//     escondida), duplicar e apagar (com Desfazer), o comandante (o bônus), a moral e os mantimentos;
//   · a Fortificação do marcador (a DEF, o HP, danificada e consertar);
//   · a batalha resumida (d100): os dois lados lado a lado, quem defende a fortificação, o bônus do mestre (e tirar),
//     rolar de novo, parar (trégua) e recomeçar — com os dados dados (App.rng);
//   · a detalhada (d20): o momento-chave (saiu 1), mudar um bônus no próprio momento (o dado fica), rolar de novo,
//     escrever, seguir até o Desfecho; a janela não volta para o topo a cada dado; fechar e voltar à batalha aberta;
//   · o depois: a prévia (nada muda no mapa), a frente e o hexágono, aplicar num passo (Desfazer volta tudo), a frente
//     com a fase de hoje e o hexágono desenhados;
//   · o histórico (ler e escrever mais), tirar a marca de um hexágono, marcar pelo botão direito, as fases da frente;
//   · o exército que encontra outro no caminho ("Próximo dia"): o aviso oferece abrir a batalha (e a aba lista); a
//     proposta dos mantimentos (desmarcar quem não come; "Agora não" não muda nada); a fome entra na batalha;
//   · quem joga não vê a aba nem os números (vê os nomes das unidades que não estão escondidas);
//   · no celular, a aba e a janela da batalha cabem na tela.
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;

async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const A = (a, fn, arg) => a.F.evaluate(fn, arg);
const campo = (a, k) => a.F.locator(`#pane [data-k="${k}"]`);
async function escrever(a, k, v) { const c = campo(a, k); await c.fill(v); await c.press('Enter'); await a.F.waitForTimeout(160); }
async function aba(a, id) { await a.F.click('#tab-' + id); await a.F.waitForTimeout(180); }
async function botao(a, k) { await campo(a, k).click(); await a.F.waitForTimeout(220); }
async function escolher(a, k, v) { await campo(a, k).selectOption(v); await a.F.waitForTimeout(200); }
const obj = (a, id) => A(a, id => __mundo.App.mapa.objs.find(o => o.id === id) || null, id);
const guerra = a => A(a, () => __mundo.App.mapa.guerra || null);
const rotulo = a => A(a, () => __mundo.App.rotuloDesfazer());
const painel = a => A(a, () => document.getElementById('pane').innerText.replace(/\s+/g, ' '));
const semAvisos = a => A(a, () => document.getElementById('toasts').replaceChildren());
const avisos = a => A(a, () => [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' | '));
async function apertarAviso(a, rot) { await a.F.locator('#toasts .toast button', { hasText: rot }).first().click(); await a.F.waitForTimeout(320); }
// a janela da batalha
const gb = (a, k) => a.F.locator(`dialog.gb [data-k="${k}"]`);
async function naBatalha(a, k) { await gb(a, k).click(); await a.F.waitForTimeout(230); }
const textoBatalha = a => A(a, () => { const c = document.querySelector('dialog.gb .gb-corpo'); return c ? c.innerText.replace(/\s+/g, ' ') : null; });
const bat = a => A(a, () => { const b = window.MundoGuerraPainel.batalha; return b ? JSON.parse(JSON.stringify(b)) : null; });
const janelaAberta = a => A(a, () => !!document.querySelector('dialog.gb[open]'));
// os dados: cada número vira o valor do sorteio que dá aquele dado (o meio da faixa dele)
const d100 = k => (k - 0.5) / 100, d20 = k => (k - 0.5) / 20;
const dados = (a, v) => A(a, v => { let i = 0; __mundo.App.rng = () => v[i++ % v.length]; }, v);
// um elemento da janela está à vista, dentro da rolagem dela?
const aVista = (a, k) => A(a, k => { const c = document.querySelector('dialog.gb .gb-corpo'), el = c && c.querySelector(`[data-k="${k}"]`); if (!el) return false; const r = el.getBoundingClientRect(), rc = c.getBoundingClientRect(); return r.top >= rc.top - 1 && r.bottom <= rc.bottom + 1; }, k);
const Y = 346.41;          // a fileira de hexágonos r = 10 (em pé, de 40 unidades): x = 200, 240, … 1000

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'guerra', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame() };
  const foto = async nome => { if (process.env.TC_SCRATCH) await L.P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };
  let T = {};               // os ids dos tipos criados pela aba

  await passo('o mapa da guerra', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    await aba(L, 'terreno');
    await escrever(L, 'ter:tam', '40');
    await A(L, () => {
      const { App, N } = __mundo;
      App.mudar('montar', m => {
        m.faccoes.push({ id: 'fa', nome: 'Aldar', cor: '#3f7fbf' }, { id: 'fb', nome: 'Vale', cor: '#8a2a2a' });
        const poe = (k, campos, extra) => m.objs.push(Object.assign(N.objNovo(k, campos), extra));
        poe('g', { x: 700, y: 600, tipo: 'exercito', sigla: 'ALD' }, { id: 'ga', nome: 'Hoste de Aldar', fac: 'fa', tipo: 'exercito' });
        poe('g', { x: 760, y: 610, tipo: 'exercito', sigla: 'VAL' }, { id: 'gb', nome: 'Legião do Vale', fac: 'fb', tipo: 'exercito' });
        poe('g', { x: 1600, y: 1200, tipo: 'exercito', sigla: 'BAN' }, { id: 'gc', nome: 'Bandoleiros', tipo: 'exercito' });
        poe('m', { x: 765, y: 612, ic: 'castelo' }, { id: 'cast', nome: 'Forte do Vale' });
        poe('f', { pts: [[730, 200], [730, 1000]] }, { id: 'fr', nome: 'Frente do Vale', a: 'fa', b: 'fb' });
        m.grade.on = true;
      });
    });
    await espera(300);
    ok(await L.F.locator('#tab-guerra').isVisible() && (await guerra(L)) === null, 'a aba Guerra está lá, e o mapa ainda não tem guerra nenhuma');
    await A(L, () => __mundo.App.selecionar(['cast'])); await aba(L, 'guerra');
    const abas = await A(L, () => { const t = document.querySelector('.tabs'); return { sw: t.scrollWidth, cw: t.clientWidth, badge: !document.querySelector('#tab-selecao .n').hidden, nomes: [...t.querySelectorAll('.tab')].filter(b => !b.hidden).map(b => b.textContent.replace(/\d+$/, '')) }; });
    ok(abas.sw <= abas.cw && abas.badge && j(abas.nomes) === j(['Seleção', 'Hoje', 'Reinos', 'Guerra', 'Terreno', 'Mapa']), 'as seis abas cabem no painel, mesmo com o número da seleção: ' + j(abas));
  });

  await passo('a aba Guerra, vazia', async () => {
    const txt = await painel(L);
    ok(/Guerra 3 exércitos · 0 batalhas · 0 tipos de tropa/i.test(txt) && await campo(L, 'gu:nova').isDisabled(), 'a aba: quantos exércitos, batalhas e tipos; sem dois exércitos com unidades, nada de batalha');
    ok(/Nenhum tipo ainda/.test(txt) && /Nenhum hexágono destruído ou corrompido/.test(txt) && /Nenhuma batalha ainda/.test(txt), 'os tipos começam vazios (a tabela é do mestre), sem hexágonos e sem histórico');
  });

  await passo('os tipos de tropa', async () => {
    for (const nome of ['Cavalaria', 'Lanceiros', 'Arqueiros']) {
      await botao(L, 'gu:tipo:novo');
      const foco = await A(L, () => document.activeElement && document.activeElement.getAttribute('data-k'));
      ok(/^gu:tipo:.+:nome$/.test(foco || ''), 'o tipo novo já vem com o nome para escrever: ' + foco);
      await L.F.locator(`#pane [data-k="${foco}"]`).fill(nome); await L.F.locator(`#pane [data-k="${foco}"]`).press('Enter'); await espera(200);
    }
    const g = await guerra(L);
    T = Object.fromEntries(g.tipos.map(x => [x.nome, x.id]));
    ok(j(g.tipos.map(x => x.nome)) === j(['Cavalaria', 'Lanceiros', 'Arqueiros']) && await rotulo(L) === 'mudar o nome do tipo', 'três tipos criados e com nome');
    await campo(L, `gu:tipo:${T.Arqueiros}:dist`).check(); await espera(200);
    await escrever(L, `gu:tipo:${T.Cavalaria}:v:${T.Arqueiros}`, '3');
    await escrever(L, `gu:tipo:${T.Cavalaria}:v:${T.Lanceiros}`, '-2');
    await escrever(L, `gu:tipo:${T.Lanceiros}:v:${T.Cavalaria}`, '3');
    const g2 = await guerra(L);
    ok(j(g2.tipos.map(x => [x.nome, x.dist, x.vant])) === j([['Cavalaria', false, { [T.Arqueiros]: 3, [T.Lanceiros]: -2 }], ['Lanceiros', false, { [T.Cavalaria]: 3 }], ['Arqueiros', true, {}]]), 'de longe (Arqueiros) e as vantagens de um contra o outro: ' + j(g2.tipos));
    await A(L, () => __mundo.App.desfazer()); await espera(200);
    ok(!(await guerra(L)).tipos[1].vant[T.Cavalaria], 'Desfazer tira a última vantagem');
    await A(L, () => __mundo.App.refazer()); await espera(200);
    await botao(L, 'gu:tipo:novo');
    const t4 = (await guerra(L)).tipos[3].id;
    await botao(L, `gu:tipo:${t4}:x`);
    ok((await guerra(L)).tipos.length === 3 && /O tipo "Tipo 4" saiu/.test(await avisos(L)) && await rotulo(L) === 'apagar o tipo de tropa', 'apagar um tipo avisa, com Desfazer');
    await foto('l8p6-tipos');
  });

  await passo('o exército: as unidades', async () => {
    await A(L, () => __mundo.App.selecionar(['gc'])); await aba(L, 'selecao');
    ok(/Este exército ainda não tem unidades/.test(await painel(L)), 'o exército sem unidades explica o que vem');
    await botao(L, 'o:gc:exe');
    let e = (await obj(L, 'gc')).exe;
    const u = e.unid[0];
    ok(e.unid.length === 1 && u.tipo === T.Cavalaria && e.moral === 5 && e.mant === 10 && await rotulo(L) === 'pôr as unidades' && await campo(L, `o:gc:u:${u.id}:nome`).isVisible(), 'pôr as unidades: uma unidade, do primeiro tipo, já aberta; moral 5, mantimentos para começar');
    const k = c => `o:gc:u:${u.id}:${c}`;
    await escrever(L, k('nome'), 'Salteadores');
    await escolher(L, k('tipo'), T.Lanceiros);
    for (const [c, v] of [['tropas', '150'], ['atq', '3'], ['def', '2'], ['magos', '1'], ['cerco', '1'], ['hpMax', '80']]) await escrever(L, k(c), v);
    await botao(L, k('eq:novo'));
    await escrever(L, k('eq:0:nome'), 'Bestas');
    await escrever(L, k('eq:0:atq'), '2');
    await campo(L, k('oc')).check(); await espera(200);
    e = (await obj(L, 'gc')).exe;
    ok(j(e.unid[0]) === j({ id: u.id, nome: 'Salteadores', tipo: T.Lanceiros, tropas: 150, hp: 80, hpMax: 80, atq: 3, def: 2, magos: 1, cerco: 1, equip: [{ nome: 'Bestas', atq: 2, def: 0 }], oc: true }), 'a unidade: o nome, o tipo, os números (o HP acompanha o máximo), o equipamento e escondida: ' + j(e.unid[0]));
    await botao(L, k('abre'));
    const resumo = await A(L, k => document.querySelector(`#pane [data-k="${k}"]`).innerText.replace(/\s+/g, ' '), k('abre'));
    ok(/Salteadores 150 tropas · Lanceiros · ATQ 5 · DEF 2 · escondida/.test(resumo), 'fechada, a unidade mostra o resumo (o ATQ com o equipamento): ' + resumo);
    await botao(L, 'o:gc:u:nova');
    await botao(L, k('abre'));
    await botao(L, k('dup'));
    e = (await obj(L, 'gc')).exe;
    ok(e.unid.length === 3 && e.unid[1].nome === 'Salteadores (cópia)' && e.unid[1].tropas === 150 && e.unid[1].oc === true && e.unid[1].id !== u.id, 'nova unidade e duplicar (a cópia logo depois, igual — escondida também)');
    await campo(L, `o:gc:u:${e.unid[1].id}:oc`).uncheck(); await espera(200);
    ok(!('oc' in (await obj(L, 'gc')).exe.unid[1]), 'a cópia deixa de ser escondida');
    await botao(L, `o:gc:u:${e.unid[2].id}:apagar`);
    ok((await obj(L, 'gc')).exe.unid.length === 2 && /A unidade "Unidade 2" saiu/.test(await avisos(L)), 'apagar a unidade avisa, com Desfazer');
    await escrever(L, 'o:gc:cmd', 'Zé Faca'); await escrever(L, 'o:gc:cmdb', '1');
    await escrever(L, 'o:gc:moral', '6'); await escrever(L, 'o:gc:mant', '20');
    e = (await obj(L, 'gc')).exe;
    const txt = await painel(L);
    ok(j([e.cmd.nome, e.cmd.b, e.moral, e.mant, e.cons]) === j(['Zé Faca', 1, 6, 20, null]) && /Moral 6: confiante\. Comem 3 por dia \(um por cem soldados\): dá para 6 dias\./.test(txt), 'o comandante e o bônus dele, a moral, os mantimentos (3 por dia: 300 soldados)');
    await escrever(L, 'o:gc:moral', '12');
    ok((await obj(L, 'gc')).exe.moral === 6 && /A moral vai de 0 \(em fuga\) a 10/.test(await avisos(L)), 'moral fora de 0 a 10 não entra (o aviso explica)');
    await escrever(L, 'o:gc:cons', '5');
    ok((await obj(L, 'gc')).exe.cons === 5 && /Comem 5 por dia: dá para 4 dias\./.test(await painel(L)), 'o consumo por dia que o mestre escolhe');
    await escrever(L, 'o:gc:cons', '');
    ok((await obj(L, 'gc')).exe.cons === null, 'vazio volta ao de começo');
  });

  await passo('a fortificação', async () => {
    await A(L, () => __mundo.App.selecionar(['cast'])); await espera(200);
    await botao(L, 'o:cast:estr');
    ok(j((await obj(L, 'cast')).estr) === j({ nome: '', def: 3, hp: 100, hpMax: 100 }), 'pôr uma fortificação: DEF 3, HP 100');
    await escrever(L, 'o:cast:estr-nome', 'Muralhas'); await escrever(L, 'o:cast:estr-def', '4'); await escrever(L, 'o:cast:estr-hpmax', '60');
    ok(j((await obj(L, 'cast')).estr) === j({ nome: 'Muralhas', def: 4, hp: 60, hpMax: 60 }) && /intacta · protege com \+4 quem defende aqui/.test(await painel(L)), 'o nome, a DEF e o HP máximo (o HP acompanha)');
    await escrever(L, 'o:cast:estr-hp', '30');
    ok(/danificada \(50%\) · protege com \+2/.test(await painel(L)), 'danificada, protege menos');
    await botao(L, 'o:cast:estr-conserta');
    ok((await obj(L, 'cast')).estr.hp === 60 && await rotulo(L) === 'consertar a fortificação', 'consertar');
  });

  await passo('a batalha resumida', async () => {
    await A(L, T => __mundo.App.mudar('os dois exércitos', m => {
      const g = id => m.objs.find(o => o.id === id);
      g('ga').exe = { cmd: { nome: 'Rei Aldar', b: 2 }, moral: 7, mant: 40, unid: [{ id: 'u1', nome: 'Cavalaria pesada', tipo: T.Cavalaria, tropas: 800, atq: 6, def: 4 }, { id: 'u2', nome: 'Arqueiros do rei', tipo: T.Arqueiros, tropas: 400, atq: 4, def: 2, magos: 9 }] };
      g('gb').exe = { cmd: { nome: 'Duquesa', b: 1 }, moral: 5, mant: 12, unid: [{ id: 'u3', nome: 'Lanceiros', tipo: T.Lanceiros, tropas: 900, atq: 5, def: 6, cerco: 2 }] };
    }), T);
    await A(L, () => __mundo.App.selecionar(['ga'])); await espera(200);
    await botao(L, 'o:ga:u:u1:abre');
    await semAvisos(L); await foto('l8p6-exercito');
    await botao(L, 'o:ga:batalha');
    ok(await janelaAberta(L), 'a janela da batalha abre pelo exército');
    const b0 = await bat(L);
    ok(b0.a === 'ga' && b0.b === 'gb' && j(b0.estr) === j({ m: 'cast', lado: 'b' }) && await gb(L, 'gb:estr').inputValue() === 'cast|b', 'os lados (o exército e o outro mais perto) e quem defende as muralhas, sozinho: ' + j([b0.a, b0.b, b0.estr]));
    const txt = await textoBatalha(L);
    ok(/Tropas 1\.200 900/.test(txt) && /Hoste de Aldar: \+10/.test(txt) && /Legião do Vale: \+9/.test(txt) && /Fortificação \+4/.test(txt), 'os dois lados lado a lado e os bônus de cada um (as muralhas para quem defende)');
    await dados(L, [d100(60), d100(50)]);
    await naBatalha(L, 'gb:d100');
    let b = await bat(L);
    ok(b.res.da === 60 && b.res.db === 50 && b.res.ta === 110 && b.res.tb === 95 && /Vitória apertada de Hoste de Aldar/.test(await textoBatalha(L)), 'a resumida: d100 + 5 × os bônus (110 contra 95), vitória apertada');
    await naBatalha(L, 'gb:f-abre');
    ok(await A(L, () => document.activeElement && document.activeElement.getAttribute('data-k')) === 'gb:f-v', '"Pôr um bônus…" abre o formulário, já no número');
    await gb(L, 'gb:f-lado').selectOption('b'); await gb(L, 'gb:f-tipo').selectOption('terreno');
    await gb(L, 'gb:f-v').fill('5'); await gb(L, 'gb:f-txt').fill('lama');
    await dados(L, [d100(99), d100(1)]);                      // (se o bônus rolasse de novo, os dados mudariam)
    await naBatalha(L, 'gb:f-por');
    b = await bat(L);
    ok(b.res.da === 60 && b.res.db === 50 && b.res.tb === 120 && b.fim.vence === 'b' && /Legião do Vale: Terreno \+5 — lama/.test(await textoBatalha(L)) && /Vitória apertada de Legião do Vale/.test(await textoBatalha(L)), 'o bônus do mestre muda o resultado na hora, com os mesmos dados');
    await naBatalha(L, 'gb:mestre-x:0');
    ok((await bat(L)).fim.vence === 'a' && (await bat(L)).mestre.length === 0, 'tirar o bônus volta');
    await dados(L, [d100(10), d100(90)]);
    await naBatalha(L, 'gb:d100-de-novo');
    b = await bat(L);
    ok(b.res.ta === 60 && b.res.tb === 135 && b.fim.tam === 3 && /Vitória clara de Legião do Vale/.test(await textoBatalha(L)), 'rolar de novo: dados novos (60 contra 135), vitória clara');
    await gb(L, 'gb:res-parar').selectOption('tregua|'); await espera(220);
    ok(j((await bat(L)).fim) === j({ vence: null, tam: 0, como: 'tregua', por: null }) && /Trégua: ninguém venceu/.test(await textoBatalha(L)), 'parar: a trégua');
    await naBatalha(L, 'gb:recomecar');
    b = await bat(L);
    ok(!b.modo && !b.res && !b.fim && await gb(L, 'gb:d100').isVisible(), 'recomeçar: volta para escolher a rolagem');
    await naBatalha(L, 'gb:fechar');
    ok(!(await janelaAberta(L)) && !/A batalha ficou aberta/.test(await avisos(L)) && !(await bat(L)), 'fechar sem nada rolado (nem bônus, nem nota): fecha, sem aviso, e não fica nada guardado');
  });

  let hexBat = null;
  await passo('a batalha detalhada', async () => {
    await aba(L, 'guerra');
    await botao(L, 'gu:nova');
    await dados(L, [d20(1), d20(19)]);
    await naBatalha(L, 'gb:d20');
    let b = await bat(L);
    ok(b.modo === 'd20' && j([b.moms[0].k, b.moms[0].da, b.moms[0].db, b.moms[0].ta, b.moms[0].tb, b.moms[0].chave]) === j(['ab', 1, 19, 7, 19, true]), 'a Abertura: d20 + magos e arqueiros (1 + 6 contra 19), e saiu 1 — momento-chave');
    let txt = await textoBatalha(L);
    ok(/momento-chave · saiu 1/.test(txt) && /Seguir para o Choque/.test(txt) && /Momento-chave: antes de seguir/.test(txt), 'o momento-chave aparece, com o que o mestre pode fazer antes de seguir');
    await naBatalha(L, 'gb:mom-bonus:0');
    const noMomento = await A(L, () => { const f = document.querySelector('dialog.gb [data-k="gb:fm-form"]'); return !!f && !!f.closest('.gb-mom') && document.activeElement && document.activeElement.getAttribute('data-k') === 'gb:fm-v'; });
    ok(noMomento, '"Mudar um bônus" abre o formulário dentro do próprio momento, já no número');
    await gb(L, 'gb:fm-v').fill('3'); await gb(L, 'gb:fm-txt').fill('emboscada no vau');
    await dados(L, [d20(7), d20(7)]);                          // (se o bônus rolasse de novo, os dados mudariam)
    await naBatalha(L, 'gb:fm-por');
    b = await bat(L);
    ok(b.moms[0].da === 1 && b.moms[0].ta === 10 && j(b.mestre) === j([{ lado: 'a', tipo: 'tatica', v: 3, mom: 'ab', txt: 'emboscada no vau' }]) && !(await gb(L, 'gb:fm-form').count()), 'o bônus fica só na Abertura: o dado fica, o total muda (10), o formulário fecha');
    ok(/Hoste de Aldar: Tática \+3 \(Abertura\) — emboscada no vau/.test(await textoBatalha(L)), 'e aparece nos bônus do mestre');
    await dados(L, [d20(14), d20(8)]);
    await naBatalha(L, 'gb:mom-de-novo:0');
    b = await bat(L);
    ok(b.moms.length === 1 && b.moms[0].da === 14 && b.moms[0].ta === 23 && b.moms[0].tb === 8 && !b.moms[0].chave, 'rolar de novo o momento (com o bônus: 14 + 9 contra 8)');
    await naBatalha(L, 'gb:mom-nota:0');
    await gb(L, 'gb:nota-in').fill('Os magos abriram a muralha.');
    await naBatalha(L, 'gb:nota-ok');
    ok((await bat(L)).moms[0].nota === 'Os magos abriram a muralha.' && /“Os magos abriram a muralha\.”/.test(await textoBatalha(L)), 'escrever o que aconteceu no momento');
    await dados(L, [d20(10), d20(10), d20(12), d20(12), d20(15), d20(5)]);
    await naBatalha(L, 'gb:proximo');
    const rol = await A(L, () => document.querySelector('dialog.gb .gb-corpo').scrollTop);
    ok(rol > 0 && await aVista(L, 'gb:proximo'), 'a janela não volta para o topo: o botão do próximo momento fica à vista (' + rol + ')');
    await naBatalha(L, 'gb:proximo');
    await naBatalha(L, 'gb:proximo');
    b = await bat(L);
    ok(j(b.moms.map(x => [x.k, x.ta, x.tb])) === j([['ab', 23, 8], ['ch', 10, 18], ['vi', 16, 13], ['de', 19, 5]]) && j(b.fim) === j({ placar: 24, tam: 3, vence: 'a', como: 'dados' }), 'Choque (as muralhas: 10 contra 18), Virada, Desfecho; o placar (24): ' + j(b.fim));
    ok(/Vitória clara de Hoste de Aldar/.test(await textoBatalha(L)) && await aVista(L, 'gb:fim'), 'o fim aparece à vista');
    await naBatalha(L, 'gb:escrever');
    await gb(L, 'gb:nota-in').fill('A Duquesa recuou para o forte.');
    await naBatalha(L, 'gb:nota-ok');
    ok(j((await bat(L)).notas) === j(['A Duquesa recuou para o forte.']), 'escrever o que aconteceu na batalha');
    await foto('l8p6-detalhada');
    await semAvisos(L);
    await naBatalha(L, 'gb:fechar');
    ok(!(await janelaAberta(L)) && /A batalha ficou aberta/.test(await avisos(L)) && await campo(L, 'gu:voltar').isVisible(), 'fechar com dados rolados: a batalha fica guardada ("Voltar à batalha aberta")');
    await botao(L, 'gu:voltar');
    ok(await janelaAberta(L) && (await bat(L)).moms.length === 4, 'e volta igual');
    hexBat = (await bat(L)).hex;
  });

  await passo('a ajuda da batalha', async () => {
    const painel = () => A(L, () => { const a = document.querySelector('dialog.gb .gb-ajuda'); return a && !a.hidden ? a.innerText.replace(/\s+/g, ' ') : null; });
    const parte = sec => A(L, s0 => { const e = document.querySelector('dialog.gb .gb-ajuda [data-sec="' + s0 + '"]'); return e ? { txt: e.innerText.replace(/\s+/g, ' '), alvo: e.classList.contains('aj-alvo'), visto: (() => { const c = e.closest('.aj-corpo'), r = e.getBoundingClientRect(), rc = c.getBoundingClientRect(); return r.top >= rc.top - 2 && r.top < rc.bottom; })() } : null; }, sec);
    ok(await painel() === null && await gb(L, 'gb:ajuda:geral').count() === 1, 'a janela da batalha tem o "?" no alto (a ajuda começa fechada)');
    await naBatalha(L, 'gb:ajuda:geral');
    const p0 = await painel();
    ok(!!p0 && /^Como funciona a batalha Cada lado soma as suas vantagens/.test(p0) && await A(L, () => document.querySelector('dialog.gb').classList.contains('com-ajuda') && document.querySelector('dialog.gb').open),
      'o "?" do alto abre o guia ao lado da batalha (a batalha continua aberta): ' + (p0 || '').slice(0, 90));
    // o "?" do Choque: o guia já naquela parte, com os números desta batalha
    await naBatalha(L, 'gb:ajuda:m:ch');
    const ch = await parte('m:ch');
    ok(!!ch && ch.alvo && ch.visto && /^Choque Choque: as linhas se chocam\. Pesam os números/.test(ch.txt) && /Nesta batalha: Hoste de Aldar ([+−]\d+|0) \(/.test(ch.txt)
      && /Saiu: Hoste de Aldar tirou 10 no d20, ([+−]\d+|0) de bônus = 10; Legião do Vale tirou 10, \+8 = 18 — Legião do Vale leva no Choque por 8\./.test(ch.txt),
      'o "?" do Choque leva até ele (à vista, marcado), com os bônus e os dados desta batalha: ' + ch.txt.slice(0, 320));
    // o "?" de um bônus: os números (1.200 contra 900)
    await L.F.locator('dialog.gb [data-k="gb:ajuda:b:numeros"]').first().click(); await espera(250);
    const nu = await parte('b:numeros');
    ok(!!nu && nu.alvo && nu.visto && /Nesta batalha: Hoste de Aldar tem força 1\.200 contra 900 — 1,33 vez — e ganha \+2\./.test(nu.txt), 'o "?" de Números: a força de cada lado e por que deu +2: ' + nu.txt.slice(0, 220));
    ok(await A(L, () => !document.querySelector('dialog.gb .gb-ajuda [data-sec="b:numeros"] details').open), '"Ver a conta" começa fechado');
    await L.F.click('dialog.gb .gb-ajuda [data-sec="b:numeros"] details summary'); await espera(150);
    ok(/Bônus = 4 × log₂\(força maior ÷ força menor\), arredondado, até 10\./.test((await parte('b:numeros')).txt), '"Ver a conta" mostra a fórmula');
    await L.F.locator('dialog.gb [data-k="gb:ajuda:b:estrutura"]').first().click(); await espera(250);
    const es = await parte('b:estrutura');
    ok(!!es && es.alvo && /Nesta batalha: Legião do Vale defende Muralhas: DEF 4 → \+4\./.test(es.txt), 'o "?" da Fortificação: quem defende, a DEF e por que deu +4: ' + (es ? es.txt.slice(0, 200) : ''));
    await L.F.locator('dialog.gb [data-k="gb:ajuda:b:numeros"]').first().click(); await espera(250);
    await semAvisos(L); await foto('ajuda-batalha');
    // o Esc fecha só a ajuda; o "?" do resultado; o ×
    await L.P.keyboard.press('Escape'); await espera(250);
    ok(await painel() === null && await janelaAberta(L) && !(await A(L, () => document.querySelector('dialog.gb').classList.contains('com-ajuda'))), 'Esc fecha a ajuda, e a batalha fica aberta');
    await naBatalha(L, 'gb:ajuda:resultado');
    ok(/Nesta batalha: Vitória clara de Hoste de Aldar\./.test((await parte('resultado')).txt), 'o "?" do resultado: o que deu nesta batalha');
    await naBatalha(L, 'gb:ajuda-x');
    ok(await painel() === null, 'o × fecha a ajuda');
    // no depois: o "?" das perdas
    await naBatalha(L, 'gb:depois');
    await naBatalha(L, 'gb:ajuda:depois');
    ok(/Nesta batalha: Hoste de Aldar perde 6% e Legião do Vale 35% das tropas \(e do HP de cada unidade\)\. A moral de Hoste de Aldar vai de 7 para 8; a de Legião do Vale, de 5 para 2\. A frente pode andar 3 hexágonos para o lado de Legião do Vale\./.test((await parte('depois')).txt),
      'no depois, o "?" explica as perdas, a moral e a frente desta batalha: ' + (await parte('depois')).txt.slice(0, 200));
    await L.P.keyboard.press('Escape'); await espera(200);
    await naBatalha(L, 'gb:voltar');
    ok(await janelaAberta(L) && await painel() === null, '(de volta à batalha, com a ajuda fechada)');
  });

  await passo('o depois e o aplicar', async () => {
    const antes = await A(L, () => JSON.stringify(__mundo.App.mapa));
    await naBatalha(L, 'gb:depois');
    let txt = await textoBatalha(L);
    ok(/Hoste de Aldar — perde 6%/i.test(txt) && /Cavalaria pesada 800 → 752 100 → 94/.test(txt) && /Legião do Vale — perde 35%/i.test(txt) && /Lanceiros 900 → 585 100 → 65/.test(txt), 'a prévia: as tropas e o HP de cada unidade');
    ok(/Moral 7 → 8 \(animada\)|Moral 7 → 8 \(feroz\)/.test(txt) && /Moral 5 → 2 \(abalada\)/.test(txt) && /mantimentos 40 → 28/.test(txt) && /HP 60 → 53 de 60 \(dano 7\)/.test(txt), 'a moral, os mantimentos (um dia de batalha) e as muralhas (dano 7)');
    const b = await bat(L);
    ok(b.frente && b.frente.f === 'fr' && b.frente.n === 3 && await gb(L, 'gb:frente').inputValue() === 'fr' && /a linha anda 3 hexágonos para o lado de quem perdeu/.test(txt), 'a frente dos dois lados anda 3 hexágonos (vitória clara), a partir de hoje');
    await gb(L, 'gb:frente-n').fill('1'); await gb(L, 'gb:frente-n').press('Tab'); await espera(220);
    ok((await bat(L)).frente.n === 1 && /anda 1 hexágono para/.test(await textoBatalha(L)), 'dá para mudar quanto anda');
    await gb(L, 'gb:frente-n').fill('3'); await gb(L, 'gb:frente-n').press('Tab'); await espera(220);
    await gb(L, 'gb:hex:c').check(); await espera(220);
    ok((await bat(L)).hexEst === 'c', 'o hexágono da batalha: corrompido');
    ok(await A(L, () => JSON.stringify(__mundo.App.mapa)) === antes, 'nada mudou no mapa ainda');
    await semAvisos(L); await foto('l8p6-depois');
    await naBatalha(L, 'gb:voltar');
    ok(/Vitória clara de Hoste de Aldar/.test(await textoBatalha(L)) && (await bat(L)).moms.length === 4, '"Voltar": a batalha continua lá');
    await naBatalha(L, 'gb:depois');
    ok((await bat(L)).hexEst === 'c' && (await bat(L)).frente.n === 3, '(e o depois lembra o que foi escolhido)');
    await semAvisos(L);
    await naBatalha(L, 'gb:aplicar');
    const m = await A(L, () => __mundo.App.mapa), ga = m.objs.find(o => o.id === 'ga'), gB = m.objs.find(o => o.id === 'gb'), fr = m.objs.find(o => o.id === 'fr');
    ok(!(await janelaAberta(L)) && await rotulo(L) === 'a batalha Hoste de Aldar × Legião do Vale' && /Batalha aplicada: Vitória clara de Hoste de Aldar\./.test(await avisos(L)), 'aplicar: a janela fecha, um passo de desfazer, o aviso');
    ok(j(ga.exe.unid.map(u => [u.tropas, u.hp])) === j([[752, 94], [376, 94]]) && ga.exe.moral === 8 && ga.exe.mant === 28 && j(gB.exe.unid.map(u => [u.tropas, u.hp])) === j([[585, 65]]) && gB.exe.moral === 2 && gB.exe.mant === 3, 'as tropas, o HP, a moral e os mantimentos de cada lado');
    ok(m.objs.find(o => o.id === 'cast').estr.hp === 53 && m.guerra.hexes[hexBat] === 'c', 'as muralhas danificadas e o hexágono corrompido');
    const xs = fr.fases && fr.fases[0] ? fr.fases[0].pts.map(p => p[0]) : [];
    ok(fr.fases && fr.fases.length === 1 && fr.fases[0].dia === 0 && Math.max(...xs) > 730 + 40 && j(fr.pts) === j([[730, 200], [730, 1000]]), 'a frente: a fase de hoje anda para o lado de quem perdeu (a Legião, à direita); a linha de antes fica');
    const bt = m.guerra.bats[0];
    ok(m.guerra.bats.length === 1 && bt.modo === 'd20' && bt.mom.length === 4 && bt.mom[0].nota === 'Os magos abriram a muralha.' && j(bt.notas) === j(['A Duquesa recuou para o forte.']) && j(bt.fim) === j({ vence: 'a', tam: 3, como: 'dados' }), 'a batalha no histórico: os momentos, as notas e o fim');
    const des = await A(L, k => ({ hex: document.querySelectorAll(`#mundo .hexg.hexg-c[data-hex="${k}"]`).length, fr: !!document.querySelector('#mundo [data-id="fr"]') }), hexBat);
    ok(des.hex === 1 && des.fr, 'o hexágono corrompido desenhado no mapa (camada Guerra): ' + j(des));
    await foto('l8p6-aplicada');
    await apertarAviso(L, 'Desfazer');
    const m2 = await A(L, () => __mundo.App.mapa);
    ok(j(m2.objs.find(o => o.id === 'ga').exe.unid.map(u => u.tropas)) === j([800, 400]) && !m2.objs.find(o => o.id === 'fr').fases && !m2.guerra.bats.length && !Object.keys(m2.guerra.hexes).length && m2.objs.find(o => o.id === 'cast').estr.hp === 60, 'Desfazer volta tudo de uma vez');
    await A(L, () => __mundo.App.refazer()); await espera(300);
    ok((await guerra(L)).bats.length === 1, '(refazer: a batalha volta)');
  });

  await passo('o histórico, os hexágonos e as fases da frente', async () => {
    await aba(L, 'guerra');
    const bid = (await guerra(L)).bats[0].id;
    ok(/detalhada · Vitória clara de Hoste de Aldar/.test(await A(L, k => document.querySelector(`#pane [data-k="${k}"]`).innerText, 'gu:bat:' + bid)), 'o histórico na aba: a data, o modo e o resultado');
    await botao(L, 'gu:bat:' + bid);
    const dlg = L.F.locator('dialog.mundo-dl:not(.gb)[open]'); await dlg.waitFor();
    const lido = (await dlg.innerText()).replace(/\s+/g, ' ');
    ok(/Abertura: Hoste de Aldar 23 \(dado 14\) × Legião do Vale 8 \(dado 8\) — Os magos abriram a muralha\./.test(lido) && /“A Duquesa recuou para o forte\.”/.test(lido), 'ler a batalha: cada momento com os dados e o que foi escrito');
    await dlg.locator('#dl-nota').fill('O rei foi ferido na Virada.');
    await dlg.locator('button[type="submit"]').click(); await espera(250);
    ok(j((await guerra(L)).bats[0].notas) === j(['A Duquesa recuou para o forte.', 'O rei foi ferido na Virada.']) && await rotulo(L) === 'escrever na batalha', 'e escrever mais depois (fica no histórico)');
    await semAvisos(L);
    await botao(L, 'gu:hex-x:' + hexBat);
    ok(!(await guerra(L)).hexes[hexBat] && /O hexágono voltou ao normal/.test(await avisos(L)), 'tirar a marca do hexágono, com Desfazer');
    await apertarAviso(L, 'Desfazer');
    ok((await guerra(L)).hexes[hexBat] === 'c', '(e Desfazer)');
    // o botão direito num hexágono vazio
    const p = await A(L, () => { const m = __mundo.App.vista(), r = document.querySelector('#mundo svg.camadas').getBoundingClientRect(), x = 1200, y = 300; return { x: r.left + x * r.width / m.larg, y: r.top + y * r.height / m.alt, k: (h => h.q + ',' + h.r)(__mundo.N.hexDe(m, x, y)) }; });
    await L.P.mouse.click(p.x, p.y, { button: 'right' }); await espera(250);
    const itens = await A(L, () => [...document.querySelectorAll('.menu[role="menu"] button')].map(b => b.textContent));
    ok(itens.includes('Hexágono destruído') && itens.includes('Hexágono corrompido'), 'o botão direito no mapa oferece marcar o hexágono: ' + j(itens));
    await L.F.locator('.menu[role="menu"] button', { hasText: 'Hexágono destruído' }).click(); await espera(250);
    ok((await guerra(L)).hexes[p.k] === 'd' && await A(L, k => document.querySelectorAll(`#mundo .hexg-d[data-hex="${k}"]`).length, p.k) === 1, 'marcado e desenhado');
    await A(L, () => __mundo.App.selecionar(['fr'])); await aba(L, 'selecao');
    const txt = await painel(L);
    ok(/Fases da frente A linha de partida A partir de 1 de Alvorada, ano 1 hoje/i.test(txt) && await campo(L, 'o:fr:ffase').isDisabled(), 'as fases da frente: a de hoje (da batalha); não dá para criar outra hoje');
  });

  await passo('os exércitos que se encontram e os mantimentos', async () => {
    await A(L, Y => __mundo.App.mudar('preparar a marcha', m => {
      const { N } = __mundo;
      m.objs.push(Object.assign(N.objNovo('t', { pts: [[200, Y], [1000, Y]] }), { id: 'rt', nome: 'Estrada do Vale' }));
      const g = id => m.objs.find(o => o.id === id);
      Object.assign(g('ga'), { x: 620, y: Y + 34.64 });
      Object.assign(g('gb'), { x: 200, y: Y, rota: 'rt', prog: 0, pt: 20 });     // (4 hexágonos por tempo: no fim de nenhum tempo ela está ao lado da Hoste — só o caminho do dia mostra o encontro)
    }), Y);
    await semAvisos(L);
    await L.F.click('#diaMais');
    const dlg = L.F.locator('dialog.mundo-dl:not(.gb)[open]'); await dlg.waitFor();
    const txt = (await dlg.innerText()).replace(/\s+/g, ' ');
    ok(/Os mantimentos do dia/.test(txt) && /Hoste de Aldar: 28 → 16 \(mais 1 dia\)/.test(txt) && /Legião do Vale: 3 → 0 — acabou: moral 2 → 1, e a fome tira ATQ/.test(txt) && /Bandoleiros: 20 → 17/.test(txt), 'o "Próximo dia" propõe descontar os mantimentos de cada exército (e diz quem ficou sem): ' + txt.slice(0, 260));
    await dlg.locator('input[name="dl-quem"][value="gc"]').uncheck();
    await dlg.locator('button[type="submit"]').click(); await espera(300);
    const ga = await obj(L, 'ga'), gB = await obj(L, 'gb'), gc = await obj(L, 'gc');
    ok(ga.exe.mant === 16 && gB.exe.mant === 0 && gB.exe.fome === 1 && gB.exe.moral === 1 && gc.exe.mant === 20 && await rotulo(L) === 'os mantimentos do dia', 'descontado só de quem ficou marcado; a Legião sem mantimentos perde moral');
    const av = await avisos(L);
    ok(/Exércitos frente a frente: Hoste de Aldar e Legião do Vale\./.test(av) && gB.x === 1000, 'no caminho, a Legião passou pela Hoste: o aviso oferece a batalha: ' + av.slice(0, 300));
    await foto('l8p6-encontro');
    await apertarAviso(L, 'Abrir a batalha');
    const b = await bat(L);
    ok(await janelaAberta(L) && b.a === 'ga' && b.b === 'gb' && !b.moms.length, '"Abrir a batalha" no aviso abre a batalha dos dois');
    ok(/Sem mantimentos −1/.test(await textoBatalha(L)), 'a fome entra na batalha (−1 para a Legião)');
    await naBatalha(L, 'gb:fechar');
    await aba(L, 'guerra');
    ok(!(await campo(L, 'gu:voltar').count()), '(fechada sem nada feito, não há batalha aberta para voltar)');
    ok(/Exércitos que se encontraram Hoste de Aldar × Legião do Vale/i.test(await painel(L)) && await campo(L, 'gu:enc-abrir:0').isVisible() && /sem mantimentos/.test(await A(L, () => document.querySelector('#pane [data-k="gu:ex:gb"]').innerText)), 'a aba lista o encontro (com "Abrir a batalha") e marca quem está sem mantimentos');
    await botao(L, 'gu:enc-x:0');
    ok(!/Exércitos que se encontraram/i.test(await painel(L)), 'tirar o encontro da lista');
    const dia = (await A(L, () => __mundo.App.mapa.cal.dia));
    await L.F.click('#diaMais');
    const dlg2 = L.F.locator('dialog.mundo-dl:not(.gb)[open]'); await dlg2.waitFor();
    await dlg2.locator('button:not([type="submit"])').click(); await espera(250);
    ok((await A(L, () => __mundo.App.mapa.cal.dia)) === dia + 1 && (await obj(L, 'ga')).exe.mant === 16, '"Agora não": o dia passa e os mantimentos ficam');
  });

  await passo('quem joga vê sem os números', async () => {
    await A(L, () => { __mundo.App.comoJogador = true; }); await espera(300);
    ok(!(await L.F.locator('#tab-guerra').isVisible()), 'vendo como jogador, não há a aba Guerra');
    await A(L, () => __mundo.App.selecionar(['ga'])); await espera(250);
    let txt = await painel(L);
    ok(/Exército Comandante: Rei Aldar\. Cavalaria pesada Cavalaria Arqueiros do rei Arqueiros/i.test(txt) && !/\d+ tropas|ATQ \d|DEF \d|moral \d|mantimentos/i.test(txt), 'o exército para quem joga: o comandante e as unidades (nome e tipo), sem números: ' + txt.slice(0, 200));
    await A(L, () => __mundo.App.selecionar(['gc'])); await espera(250);
    txt = await painel(L);
    ok(/Salteadores \(cópia\) Lanceiros/.test(txt) && (txt.match(/Salteadores/g) || []).length === 1, 'a unidade escondida não aparece (a cópia, que não está escondida, sim): ' + txt.slice(0, 200));
    ok(await A(L, k => document.querySelectorAll(`#mundo .hexg-c[data-hex="${k}"]`).length, hexBat) === 1, 'os hexágonos marcados também aparecem para quem joga');
    await semAvisos(L); await foto('l8p6-jogador');
    await A(L, () => { __mundo.App.comoJogador = false; }); await espera(250);
  });

  await passo('no celular', async () => {
    await aba(L, 'guerra');
    await A(L, () => __mundo.App.selecionar(['cast'])); await espera(150);
    await L.P.setViewportSize({ width: 800, height: 800 }); await espera(400);
    const a800 = await A(L, () => { const t = document.querySelector('.tabs'); return { sw: t.scrollWidth, cw: t.clientWidth, badge: !document.querySelector('#tab-selecao .n').hidden }; });
    ok(a800.sw <= a800.cw && a800.badge, 'na tela de 800 px (o painel de 280), as seis abas também cabem: ' + j(a800));
    await A(L, () => __mundo.App.selecionar([])); await espera(150);
    await L.P.setViewportSize({ width: 390, height: 800 }); await espera(400);
    if (await L.F.locator('#side.fechado').count()) { await L.F.click('#btPainel'); await espera(250); }
    await aba(L, 'guerra');
    const pane = await A(L, () => { const p = document.getElementById('pane'); return { sw: p.scrollWidth, cw: p.clientWidth, rola: document.documentElement.scrollWidth > innerWidth }; });
    ok(pane.sw <= pane.cw + 1 && !pane.rola, 'no celular, a aba Guerra cabe: ' + j(pane));
    await A(L, () => __mundo.App.selecionar(['cast'])); await espera(200);
    const abas = await A(L, () => { const t = document.querySelector('.tabs'); return { sw: t.scrollWidth, cw: t.clientWidth, badge: !document.querySelector('#tab-selecao .n').hidden }; });
    ok(abas.sw <= abas.cw && abas.badge, 'e as seis abas cabem no painel do celular, mesmo com o número da seleção: ' + j(abas));
    await A(L, () => __mundo.App.selecionar([])); await espera(150);
    await semAvisos(L); await foto('l8p6-celular-aba');
    await botao(L, 'gu:nova');
    await naBatalha(L, 'gb:f-abre');
    const cx = await A(L, () => { const d = document.querySelector('dialog.gb').getBoundingClientRect(), c = document.querySelector('dialog.gb .gb-corpo'), f = document.querySelector('dialog.gb [data-k="gb:f-form"]').getBoundingClientRect(); return { l: d.left, r: d.right, w: innerWidth, sw: c.scrollWidth, cw: c.clientWidth, fr: f.right }; });
    ok(cx.l >= 0 && cx.r <= cx.w && cx.sw <= cx.cw + 1 && cx.fr <= cx.r, 'a janela da batalha cabe na tela, sem rolar de lado (o formulário do bônus também): ' + j(cx));
    await foto('l8p6-celular-batalha');
    // a ajuda no celular: por cima da batalha, cabendo na tela; o × volta
    await naBatalha(L, 'gb:ajuda:geral');
    const aj = await A(L, () => { const d = document.querySelector('dialog.gb').getBoundingClientRect(), a = document.querySelector('dialog.gb .gb-ajuda'), r = a.getBoundingClientRect(), c = a.querySelector('.aj-corpo'); return { vis: !a.hidden, l: r.left - d.left, r: d.right - r.right, sw: c.scrollWidth, cw: c.clientWidth, w: r.width, dw: d.width }; });
    ok(aj.vis && Math.abs(aj.l) <= 1 && Math.abs(aj.r) <= 1 && aj.sw <= aj.cw + 1, 'no celular, a ajuda abre por cima da batalha, do tamanho da janela, sem rolar de lado: ' + j(aj));
    await semAvisos(L); await foto('ajuda-celular');
    await naBatalha(L, 'gb:ajuda-x');
    ok(await A(L, () => document.querySelector('dialog.gb .gb-ajuda').hidden), 'e o × volta para a batalha');
    await naBatalha(L, 'gb:fechar');
    await L.P.setViewportSize({ width: 1400, height: 900 }); await espera(300);
  });

  const erros = (t.errs || []).filter(e => !/Multiple GoTrueClient instances/.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
