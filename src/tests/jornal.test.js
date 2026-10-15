// Jornal pela interface, sem mesa (a página sozinha, no navegador — o jornal fica neste navegador):
//   · o editor de quem mestra: o nome, o clima, as matérias (a primeira é a manchete; negrito e itálico pelos botões;
//     destaque; a ordem), os boatos e anúncios e as cartas — e a folha ao lado, acompanhando enquanto se escreve;
//   · desfazer (o botão e Ctrl+Z), publicar (com a pergunta antes, e o Desfazer do aviso), o publicado e o rascunho
//     depois de recarregar a página, e os três modos (escrever, como os jogadores verão, publicado);
//   · a tela estreita.
// (Numa mesa, com o mestre e os jogadores, as cartas e a aba da casca: src/tests/jornal.rede.test.js.)
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const A = (a, fn, arg) => a.F.evaluate(fn, arg);
const campo = (a, k) => a.F.locator(`[data-k="${k}"]`);
async function escrever(a, k, v) { const c = campo(a, k); await c.fill(v); await c.dispatchEvent('change'); await espera(150); }
async function botao(a, k) { await a.F.click(`[data-k="${k}"]`); await espera(180); }
const ras = a => A(a, () => JSON.parse(JSON.stringify(__jornal.ras)));
const pub = a => A(a, () => JSON.parse(JSON.stringify(__jornal.pub)));
const rotulo = a => A(a, () => { const p = __jornal.pilha; return p.length ? p[p.length - 1].rotulo : null; });
const folha = a => a.F.locator('#leitura .folha');
const textoDoAviso = a => A(a, () => [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' | '));

(async () => {
  const t = await start();
  const dv = await t.device({ name: 'jornal', w: 1400, h: 900 });
  dv.page.setDefaultTimeout(8000);
  const L = { P: dv.page, F: dv.page.mainFrame() };
  const foto = async nome => { if (process.env.TC_SCRATCH) await L.P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };

  await passo('a página sozinha', async () => {
    await L.P.goto(t.base + 'jornal/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__jornal && __jornal.pronto, null, { timeout: 15000 }); await espera(200);
    ok(await A(L, () => __jornal.mestre && !__jornal.naMesa) && await L.F.locator('#ed').isVisible() && await L.F.locator('#btPublicar').isVisible() && !(await L.F.locator('#modos').isHidden()),
      'sem mesa, quem abre o Jornal é o próprio mestre: o editor, os modos e o botão Publicar');
    ok((await folha(L).locator('h1.nome').innerText()) === 'O Arauto' && /Nada para contar ainda/.test(await folha(L).innerText()) && /Rascunho neste navegador/.test(await L.F.locator('#salvo').innerText()),
      'a folha ao lado começa com o nome de começo, vazia; o rascunho fica neste navegador');
  });

  await passo('o alto do jornal', async () => {
    await escrever(L, 'j:nome', 'O Arauto de Urgm');
    ok((await ras(L)).nome === 'O Arauto de Urgm' && (await folha(L).locator('h1.nome').innerText()) === 'O Arauto de Urgm' && await rotulo(L) === 'mudar o nome do jornal' && !(await L.F.locator('#btDesfazer').isDisabled()),
      'o nome: no rascunho e na folha (um passo de desfazer)');
    await campo(L, 'j:clima').selectOption('neve'); await espera(150);
    await escrever(L, 'j:frase', 'Neve nas montanhas do norte');
    const faixa = await folha(L).locator('.faixa .clima').innerText();
    ok((await ras(L)).clima.t === 'neve' && /Neve · Neve nas montanhas do norte/.test(faixa) && await folha(L).locator('.faixa .clima svg').count() === 1, 'o clima, com o ícone e a frase: ' + faixa);
    ok(/Numa mesa, a data vem do calendário/.test(await L.F.locator('#ed').innerText()) && (await folha(L).locator('.faixa .data').innerText()) === 'Notícias do mundo', 'sem mesa não há mapa: a folha fica sem data');
  });

  await passo('as matérias', async () => {
    await botao(L, 'm:nova');
    let r = await ras(L);
    const m1 = r.materias[0].id;
    ok(r.materias.length === 1 && await A(L, k => document.activeElement && document.activeElement.dataset.k === k, 'm:' + m1 + ':tit') && /Manchete/i.test(await L.F.locator('.cartao.manchete .cab b').innerText()),
      'a primeira matéria é a manchete, com o cursor no título');
    await escrever(L, 'm:' + m1 + ':tit', 'A ponte de Brenn desaba');
    await escrever(L, 'm:' + m1 + ':txt', 'A velha ponte **desabou** de madrugada.\n\nTestemunhas ouviram um _estrondo_.');
    await escrever(L, 'm:' + m1 + ':ass', 'Por Aldo, o escriba');
    const man = folha(L).locator('.manchete');
    ok((await man.locator('h2').innerText()) === 'A ponte de Brenn desaba' && (await man.locator('.texto p').count()) === 2 && (await man.locator('b').innerText()) === 'desabou' && (await man.locator('i').innerText()) === 'estrondo'
      && (await man.locator('.ass').innerText()) === 'Por Aldo, o escriba', 'a manchete na folha: título, dois parágrafos, negrito, itálico e a assinatura');
    // duas colunas só com texto comprido (com pouco, a letra grande do começo pularia para a outra coluna)
    const classe = () => man.locator('.texto').getAttribute('class');
    const curta = await classe();
    await A(L, () => __jornal.mudar('teste', r => { r.materias[0].txt = 'Palavra comprida de teste. '.repeat(30); }));
    const longa = await classe();
    await A(L, () => __jornal.desfazer());
    ok(curta === 'texto' && longa === 'texto colunas' && (await ras(L)).materias[0].txt.startsWith('A velha ponte'), 'a manchete curta numa coluna só; a comprida, em duas');
    // os botões N e I envolvem o trecho escolhido
    await A(L, k => { const ta = document.querySelector(`[data-k="${k}"]`); ta.focus(); const i = ta.value.indexOf('madrugada'); ta.setSelectionRange(i, i + 9); }, 'm:' + m1 + ':txt');
    await botao(L, 'm:' + m1 + ':txt:i');
    r = await ras(L);
    ok(/de _madrugada_\./.test(r.materias[0].txt) && await rotulo(L) === 'mudar o texto da matéria' && (await man.locator('i').allInnerTexts()).includes('madrugada'), 'o botão I põe o trecho escolhido em itálico (e grava)');
    // a folha acompanha enquanto se escreve, sem gravar ainda
    await campo(L, 'm:' + m1 + ':tit').fill('A ponte de Brenn desaba e isola o vale'); await espera(450);
    ok((await man.locator('h2').innerText()) === 'A ponte de Brenn desaba e isola o vale' && (await ras(L)).materias[0].tit === 'A ponte de Brenn desaba', 'enquanto se escreve, a folha acompanha (o rascunho grava ao terminar)');
    await campo(L, 'm:' + m1 + ':tit').dispatchEvent('change'); await espera(150);
    // a segunda, em destaque; e a ordem
    await botao(L, 'm:nova');
    r = await ras(L);
    const m2 = r.materias[1].id;
    await escrever(L, 'm:' + m2 + ':tit', 'Recompensa pelo Lobo Cinzento');
    await escrever(L, 'm:' + m2 + ':txt', 'O barão oferece 200 peças de ouro.');
    await campo(L, 'm:' + m2 + ':dest').check(); await espera(150);
    ok((await ras(L)).materias[1].dest === true && await folha(L).locator('.materias .materia.dest h3').innerText() === 'Recompensa pelo Lobo Cinzento' && await rotulo(L) === 'pôr a matéria em destaque', 'a segunda matéria, em destaque (com moldura), nas colunas de baixo');
    await botao(L, 'm:' + m2 + ':cima');
    ok((await folha(L).locator('.manchete h2').innerText()) === 'Recompensa pelo Lobo Cinzento' && await rotulo(L) === 'mudar a ordem das matérias' && await campo(L, 'm:' + m2 + ':cima').isDisabled(), 'subir a matéria: ela vira a manchete');
    await botao(L, 'm:' + m2 + ':baixo');
    ok((await folha(L).locator('.manchete h2').innerText()) === 'A ponte de Brenn desaba e isola o vale', '(e descer de volta)');
  });

  await passo('escrever de verdade: o teclado, o mouse e uma mudança de fora', async () => {
    const m = (await ras(L)).materias[1].id, focoEm = k => A(L, k => !!document.activeElement && document.activeElement.dataset.k === k, k);
    const ass = campo(L, 'm:' + m + ':ass'), tit = campo(L, 'm:' + m + ':tit');
    await ass.click(); await ass.pressSequentially('Mirela', { delay: 15 }); await espera(350);
    ok(/Mirela/.test(await folha(L).locator('.materia.dest .ass').innerText()) && (await ras(L)).materias[1].ass === '', 'digitando a assinatura: a folha acompanha (o rascunho grava ao sair do campo)');
    // algo muda o rascunho enquanto ela escreve (como uma carta que chega): o campo continua com o cursor e o texto
    await A(L, () => __jornal.mudar('pôr uma nota', r => { r.notas.push({ id: 'nt_fora', txt: 'Nota de fora' }); }));
    await espera(300);
    ok(await focoEm('m:' + m + ':ass') && await ass.inputValue() === 'Mirela' && (await ras(L)).notas.length === 1 && /Mirela/.test(await folha(L).locator('.materia.dest .ass').innerText()),
      'uma mudança de fora no meio da digitação: o campo não perde o cursor nem o que foi escrito (e a folha continua com ele)');
    await tit.click(); await espera(250);
    ok((await ras(L)).materias[1].ass === 'Mirela' && await focoEm('m:' + m + ':tit') && await rotulo(L) === 'mudar a assinatura', 'clicar no título: a assinatura grava (um passo de desfazer) e o cursor vai para onde ela clicou');
    await L.P.keyboard.press('End'); await L.P.keyboard.type(' (urgente)'); await L.P.keyboard.press('Tab'); await espera(250);
    ok((await ras(L)).materias[1].tit === 'Recompensa pelo Lobo Cinzento (urgente)' && await focoEm('m:' + m + ':txt:b'), 'Tab: o título grava e o cursor segue para o próximo (o botão N)');
    await A(L, () => document.activeElement && document.activeElement.blur());
    for (let i = 0; i < 3; i++) { await L.P.keyboard.press('Control+z'); await espera(150); }
    const r = await ras(L);
    ok(r.materias[1].tit === 'Recompensa pelo Lobo Cinzento' && r.materias[1].ass === '' && !r.notas.length, 'e três Ctrl+Z desfazem o título, a assinatura e a nota');
  });

  await passo('boatos, anúncios e cartas', async () => {
    await botao(L, 'n:nova');
    const n1 = (await ras(L)).notas[0].id;
    await escrever(L, 'n:' + n1 + ':txt', 'Vende-se cavalo manso. Tratar com Joaquim.');
    await botao(L, 'c:nova');
    const c1 = (await ras(L)).cartas[0].id;
    await escrever(L, 'c:' + c1 + ':txt', 'Alguém viu meu gato preto?');
    ok((await folha(L).locator('.notas .nota').innerText()) === 'Vende-se cavalo manso. Tratar com Joaquim.' && (await folha(L).locator('.cartas .carta .ass').innerText()) === 'Anônima'
      && (await folha(L).locator('h2.secao').allInnerTexts()).join('|') === 'Boatos e anúncios|Cartas dos leitores', 'boatos e anúncios e uma carta sem assinatura (sai "Anônima"), cada um com o seu título na folha');
    await botao(L, 'n:' + n1 + ':x');
    ok(!(await ras(L)).notas.length && /Nota tirada/.test(await textoDoAviso(L)), 'tirar a nota avisa, com Desfazer');
    await L.F.locator('#toasts .toast button', { hasText: 'Desfazer' }).last().click(); await espera(200);
    ok((await ras(L)).notas.length === 1, 'e o Desfazer do aviso devolve');
    // Ctrl+Z, fora de um campo
    await A(L, () => document.activeElement && document.activeElement.blur());
    const antes = (await ras(L)).cartas[0].txt;
    await escrever(L, 'c:' + c1 + ':txt', 'Alguém viu meu gato preto? Atende por Fuligem.');
    await A(L, () => document.activeElement && document.activeElement.blur());
    await L.P.keyboard.press('Control+z'); await espera(200);
    ok((await ras(L)).cartas[0].txt === antes && /Desfeito: corrigir a carta/.test(await textoDoAviso(L)), 'Ctrl+Z desfaz a última mudança');
    await foto('jornal-mestre');
  });

  await passo('publicar', async () => {
    await L.F.click('#btPublicar'); await espera(200);
    ok(await L.F.locator('#dlg[open]').count() === 1 && /Publicar o jornal\?/.test(await L.F.locator('#dlg').innerText()), 'Publicar pergunta antes');
    await botao(L, 'dl:nao');
    ok((await pub(L)).n === 0, 'Cancelar: nada sai');
    await L.F.click('#btPublicar'); await espera(200);
    await botao(L, 'dl:sim');
    let p = await pub(L);
    ok(p.n === 1 && !!p.em && p.nome === 'O Arauto de Urgm' && p.materias.length === 2 && /Publicado \(neste navegador\)/.test(await textoDoAviso(L)) && /Igual ao publicado/.test(await L.F.locator('#salvo').innerText()),
      'publicado: o rascunho saiu (número 1); o rascunho fica igual ao publicado');
    await L.F.click('#modos [data-modo="noar"]'); await espera(250);
    ok(await L.F.locator('#ed').isHidden() && (await folha(L).locator('.manchete h2').innerText()) === 'A ponte de Brenn desaba e isola o vale' && /O que os jogadores estão lendo agora/.test(await L.F.locator('#leitura').innerText()),
      'o modo Publicado mostra o que saiu (sem o editor)');
    await L.F.click('#modos [data-modo="escrever"]'); await espera(200);
    await escrever(L, 'j:nome', 'A Gazeta de Urgm'); await espera(550);
    ok(/mudanças que ainda não saíram/.test(await L.F.locator('#salvo').innerText()) && (await pub(L)).nome === 'O Arauto de Urgm', 'mudar o rascunho depois: o publicado continua o de antes (e o aviso diz que há mudanças por sair)');
    await L.F.click('#modos [data-modo="ver"]'); await espera(200);
    ok(await L.F.locator('#ed').isHidden() && (await folha(L).locator('h1.nome').innerText()) === 'A Gazeta de Urgm' && /Como os jogadores vão ver quando você publicar/.test(await L.F.locator('#leitura').innerText()),
      '"Como os jogadores verão": o rascunho na folha inteira');
    await L.F.click('#modos [data-modo="escrever"]'); await espera(200);
    // publicar de novo e desfazer pelo aviso
    await L.F.click('#btPublicar'); await espera(200); await botao(L, 'dl:sim');
    ok((await pub(L)).n === 2 && (await pub(L)).nome === 'A Gazeta de Urgm', 'publicar de novo: número 2');
    await L.F.locator('#toasts .toast button', { hasText: 'Desfazer' }).last().click(); await espera(250);
    p = await pub(L);
    ok(p.n === 1 && p.nome === 'O Arauto de Urgm' && (await ras(L)).nome === 'A Gazeta de Urgm', 'Desfazer a publicação volta o publicado de antes (o rascunho fica)');
  });

  await passo('depois de recarregar', async () => {
    await A(L, () => __jornal.salvarJa());
    await L.P.reload({ waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__jornal && __jornal.pronto, null, { timeout: 15000 }); await espera(250);
    ok((await ras(L)).nome === 'A Gazeta de Urgm' && (await pub(L)).n === 1 && (await ras(L)).materias.length === 2 && await L.F.locator('#btDesfazer').isDisabled(),
      'recarregando, o rascunho e o publicado continuam (neste navegador); o desfazer começa de novo');
  });

  await passo('tela estreita', async () => {
    await L.P.setViewportSize({ width: 400, height: 820 }); await espera(300);
    const cabe = await A(L, () => document.documentElement.scrollWidth <= innerWidth && document.getElementById('ed').scrollWidth <= document.getElementById('ed').clientWidth + 1);
    ok(cabe && await L.F.locator('#ed').isVisible() && await L.F.locator('#leitura').isHidden(), 'na tela estreita, escrevendo: só o editor, sem rolar para os lados');
    await L.F.click('#modos [data-modo="ver"]'); await espera(250);
    ok(await L.F.locator('#leitura').isVisible() && await A(L, () => document.documentElement.scrollWidth <= innerWidth && document.getElementById('leitura').scrollWidth <= document.getElementById('leitura').clientWidth + 1),
      'e a folha, em "Como os jogadores verão", cabe na tela');
    await foto('jornal-400');
  });

  const inesperados = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 8).join('\n'));
  ok(inesperados.length === 0, 'sem erros no console');
  await t.close();
  end();
})();
