// Clã (lote 62): o painel de quem mestra, pela interface, sem mesa (a página sozinha):
//   · o cabeçalho com os números do clã (os membros, o respeito, os primeiros recursos) e as cinco abas — uma parte por
//     vez, com a contagem nas abas; a aba aberta fica lembrada ao recarregar;
//   · o cofre: a quantidade aceita "+50" (soma), "-20" (tira) e um número (troca); o que não é número volta e avisa;
//   · as construções em linhas: a estrela (favorita), as etiquetas (no ✎), o filtro (dá para subir, favoritas, uma
//     etiqueta), a ordem (de A a Z) e a barra do que o cofre já tem;
//   · o rol em tabela: uma linha por membro, que abre embaixo os campos (um aberto por vez); a busca, a ordem (pelo
//     respeito) e o respeito de cada um na linha (o cartão "Respeito dos membros" saiu);
//   · a sede: "Ligar a uma cena…" fora de uma mesa avisa que as cenas são as da mesa.
// TC_SCRATCH=<pasta> guarda capturas.
const path = require('path');
const { start, checker } = require('./lib');
const N = require('../../cla/nucleo.js');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const CLA = N.normCla({ v: 1, nome: 'Lâmina do Crepúsculo', lema: 'A noite guarda os seus', jogadores: true, ver: { mostrar: true }, brasao: { forma: 'escudo', div: 'cortado', cores: ['#5b3f8a', '#e8eaf0'], simb: 'lobo' },
  cargos: { lider: { nome: 'Líder', gente: [{ id: 'ps_a', nome: 'Bruna Vel', resp: 2 }] }, cg_m: { nome: 'Marechal', pai: 'lider', ordem: 1, gente: [{ id: 'ps_b', nome: 'Oswin', resp: 1 }, { id: 'ps_c', nome: 'Tomas', resp: 0 }] } },
  membros: { avulsos: [{ id: 'ps_e', nome: 'Ilya', resp: -1 }, { id: 'ps_f', nome: 'Kel', resp: 3 }], dados: { ps_a: { racaN: 'Elfa', classeN: 'Arqueira' }, ps_b: { racaN: 'Humano', classeN: 'Guerreiro' } } },
  construcoes: [{ id: 'ct_sal', nome: 'Salão do clã', ico: 'salao', nivel: 2, efeito: 'Reuniões.', prox: { custo: [{ rec: 'rc_ouro', nome: 'Ouro', qtd: 500 }, { rec: 'rc_mad', nome: 'Madeira', qtd: 120 }] } },
    { id: 'ct_for', nome: 'Forja', ico: 'forja', nivel: 1, efeito: 'Armas.', prox: { custo: [{ rec: 'rc_fer', nome: 'Ferro', qtd: 80 }] } },
    { id: 'ct_bib', nome: 'Biblioteca', ico: 'biblioteca', nivel: 0, prox: { custo: [{ rec: 'rc_ouro', nome: 'Ouro', qtd: 300 }] } }],
  recursos: { lista: [{ id: 'rc_ouro', nome: 'Ouro', qtd: 1240 }, { id: 'rc_mad', nome: 'Madeira', qtd: 90 }, { id: 'rc_fer', nome: 'Ferro', qtd: 35 }], hist: [] }, respeito: { v: 2, hist: [] } });

(async () => {
  const t = await start();
  const dv = await t.device({ name: 'cla-painel', w: 1440, h: 950 });
  const P = dv.page;
  P.setDefaultTimeout(8000);
  const A = (fn, arg) => P.evaluate(fn, arg);
  const k = s => P.locator(`[data-k="${s}"]`);
  const clicar = async sel => { await P.click(sel); await espera(180); };
  const cla = () => A(() => __cla.doc('cla:c:' + __cla.sel));
  const toasts = () => A(() => [...document.querySelectorAll('#toasts .toast')].map(x => x.innerText).join(' | '));
  const foto = async nome => { if (process.env.TC_SCRATCH) await P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png'), fullPage: true }); };
  const aba = async a => { await clicar(`[data-aba-m="${a}"]`); };
  const qtd = async (rec, v) => { const el = k('rec:qtd:' + rec); await el.click(); await el.fill(v); await el.press('Enter'); await espera(200); };

  await passo('o cabeçalho e as abas', async () => {
    await P.goto(t.base + 'src/tests/vazio.html');
    await A(c => { localStorage.setItem('tinycats:cla:local', JSON.stringify({ 'cla:c:cl_a': c })); localStorage.removeItem('tinycats:cla:abaM'); }, CLA);
    await P.goto(t.base + 'cla/?debug', { waitUntil: 'load' });
    await P.waitForFunction(() => window.__cla && __cla.pronto, null, { timeout: 15000 }); await espera(300);
    const num = (await k('cab:num').innerText()).replace(/\s+/g, ' ');
    ok(/Membros 5/.test(num) && /Respeito \+2/.test(num) && /Ouro 1\.240/.test(num) && /Ferro 35/.test(num), 'o cabeçalho: os membros, o respeito e os recursos — ' + num);
    const abas = await P.locator('[data-aba-m]').allInnerTexts();
    ok(JSON.stringify(abas.map(x => x.replace(/\s+/g, ' ').trim())) === JSON.stringify(['Geral', 'Membros 5', 'Cofre e obras 1 pronta', 'Sede e tropas', 'Relações e histórico']), 'as cinco abas, com a contagem dos membros e das obras prontas — ' + JSON.stringify(abas));
    ok(await k('sec:hier').count() === 1 && await k('sec:rol').count() === 0 && await k('sec:rec').count() === 0, 'uma parte por vez: a Geral tem a hierarquia, sem o rol e o cofre');
    await aba('obras');
    ok(await k('sec:rec').count() === 1 && await k('sec:cons').count() === 1 && await k('sec:hier').count() === 0 && await P.locator('[data-aba-m="obras"]').getAttribute('aria-selected') === 'true', 'a aba Cofre e obras: o cofre e as construções');
    await P.reload({ waitUntil: 'load' }); await P.waitForFunction(() => window.__cla && __cla.pronto); await espera(300);
    ok(await k('sec:rec').count() === 1, 'recarregada, a página volta na aba que estava aberta');
  });

  await passo('o cofre: +50, -20 e um número', async () => {
    await qtd('rc_ouro', '+50');
    let c = await cla();
    ok(c.recursos.lista[0].qtd === 1290 && c.recursos.hist[0].mud[0].d === 50, '+50 soma: 1.290 (e vai para o histórico)');
    await qtd('rc_ouro', '-20');
    c = await cla();
    ok(c.recursos.lista[0].qtd === 1270 && await k('rec:qtd:rc_ouro').inputValue() === '1.270', '-20 tira: 1.270, escrito com o ponto dos milhares');
    await qtd('rc_fer', '1.000');
    ok((await cla()).recursos.lista[2].qtd === 1000, 'um número troca o valor: 1.000');
    await qtd('rc_mad', '-500');
    ok((await cla()).recursos.lista[1].qtd === 0, 'tirar mais do que tem para em 0');
    await qtd('rc_mad', 'muito');
    ok((await cla()).recursos.lista[1].qtd === 0 && await k('rec:qtd:rc_mad').inputValue() === '0' && /\+50 para somar/.test(await toasts()), 'o que não é número volta como estava e avisa como escrever');
    await A(() => __cla.desfazer()); await espera(200);
    ok((await cla()).recursos.lista[1].qtd === 90, 'Desfazer volta o -500');
  });

  await passo('as construções', async () => {
    const nomes = async () => (await P.locator('[data-cons]').evaluateAll(l => l.map(e => e.getAttribute('data-cons'))));
    ok(JSON.stringify(await nomes()) === JSON.stringify(['ct_sal', 'ct_for', 'ct_bib']), 'na ordem do clã');
    await clicar('[data-k="cons:fav:ct_bib"]');
    ok((await cla()).construcoes[2].fav === true && await k('cons:fav:ct_bib').getAttribute('aria-pressed') === 'true', 'a estrela marca a favorita');
    await P.selectOption('[data-k="obra:ordem"]', 'az'); await espera(200);
    ok(JSON.stringify(await nomes()) === JSON.stringify(['ct_bib', 'ct_for', 'ct_sal']), 'de A a Z, com as favoritas primeiro: ' + JSON.stringify(await nomes()));
    await clicar('[data-k="obra:f:prontas"]');
    ok(JSON.stringify(await nomes()) === JSON.stringify(['ct_bib', 'ct_for']), '"Dá para subir": a Biblioteca (300 de Ouro) e a Forja (o Ferro trocado para 1.000)');
    await clicar('[data-k="obra:f:fav"]');
    ok(JSON.stringify(await nomes()) === JSON.stringify(['ct_bib']), '"Favoritas": só a Biblioteca');
    await clicar('[data-k="obra:f:todas"]');
    await clicar('[data-k="cons:ed:ct_for"]');
    await P.fill('#dlg [data-k="dl:tags"]', 'defesa, Economia, defesa'); await clicar('#dlg [data-k="dl:sim"]');
    ok(JSON.stringify((await cla()).construcoes[1].tags) === JSON.stringify(['defesa', 'Economia']) && /defesa/.test(await P.locator('[data-cons="ct_for"]').innerText()), 'as etiquetas, no ✎ (sem repetir), aparecem na linha');
    await clicar('[data-k="obra:f:#defesa"]');
    ok(JSON.stringify(await nomes()) === JSON.stringify(['ct_for']), 'o filtro por etiqueta');
    await clicar('[data-k="obra:f:#defesa"]');
    const larg = await P.locator('[data-cons="ct_sal"] .barra i').evaluate(e => e.style.width);
    ok(larg === '75%' && /Faltam 30 Madeira/.test(await P.locator('[data-cons="ct_sal"]').innerText()), 'a barra do Salão: o cofre tem 90 das 120 de madeira (75%), e o que falta — ' + larg);
    await foto('l62-obras');
  });

  await passo('o rol em tabela', async () => {
    await aba('membros');
    ok(await P.locator('[data-rol-l]').count() === 5 && await P.locator('.rol-ed').count() === 0 && await k('sec:membros').count() === 0, 'uma linha por membro, fechadas; o cartão "Respeito dos membros" saiu');
    await clicar('[data-rol-l="ps_b"] .rt-rc');
    ok(await P.locator('.rol-ed[data-rol="ps_b"]').count() === 1 && await k('rol:ed:ps_b').getAttribute('aria-expanded') === 'true', 'clicar na linha abre embaixo os campos do Oswin');
    await clicar('[data-k="rol:ed:ps_e"]');
    ok(await P.locator('.rol-ed').count() === 1 && await P.locator('.rol-ed[data-rol="ps_e"]').count() === 1, 'um aberto por vez: abrir a Ilya fecha o Oswin');
    await P.fill('.rol-ed[data-rol="ps_e"] [data-k="rol:classen:ps_e"]', 'Batedora'); await k('rol:classen:ps_e').press('Tab'); await espera(200);
    ok((await cla()).membros.dados.ps_e.classeN === 'Batedora' && /Batedora/.test(await P.locator('[data-rol-l="ps_e"]').innerText()), 'mudar a classe no campo aberto: a linha mostra');
    await foto('l62-rol');
    await clicar('[data-k="mb:mais:ps_e"]');
    ok((await cla()).membros.avulsos.find(p => p.id === 'ps_e').resp === 0 && /0 · /.test(await k('mb:v:ps_e').innerText()), 'o respeito na linha: + sobe a Ilya para 0');
    await P.fill('[data-k="rol:busca"]', 'guerr'); await espera(250);
    ok(await P.locator('[data-rol-l]').count() === 1 && await P.locator('[data-rol-l="ps_b"]').count() === 1, 'a busca (pela classe, sem acento nem maiúscula): só o Oswin');
    await P.fill('[data-k="rol:busca"]', 'ninguem'); await espera(250);
    ok(await k('rol:nada').count() === 1, 'a busca sem ninguém diz isso');
    await P.fill('[data-k="rol:busca"]', ''); await espera(250);
    await P.selectOption('[data-k="rol:ordem"]', 'resp'); await espera(200);
    const ordem = await P.locator('[data-rol-l]').evaluateAll(l => l.map(e => e.getAttribute('data-rol-l')));
    ok(JSON.stringify(ordem) === JSON.stringify(['ps_f', 'ps_a', 'ps_b', 'ps_e', 'ps_c']), 'pelo respeito: Kel (+3), Bruna (+2), Oswin (+1), Ilya e Tomas (0, pelo nome) — ' + JSON.stringify(ordem));
  });

  await passo('a sede', async () => {
    await aba('sede');
    ok(await k('sede:cena:ligar').count() === 1 && /Nenhuma cena ligada/.test(await k('sede:cena').innerText()), 'a sede: "Ligar a uma cena…"');
    await clicar('[data-k="sede:cena:ligar"]');
    ok(/numa mesa/.test(await toasts()), 'fora de uma mesa, avisa que as cenas são as da mesa');
    await aba('mundo');
    ok(await k('sec:resp').count() === 1 && await k('sec:rel').count() === 1 && await k('sec:hist').count() === 1, 'Relações e histórico: o respeito no mundo, as relações e o histórico');
  });

  const erros = dv.errs ? dv.errs.filter(e => !/favicon|fonts\.g/.test(e)) : [];
  ok(!erros.length, 'sem erros no console: ' + erros.slice(0, 3).join(' | '));
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
