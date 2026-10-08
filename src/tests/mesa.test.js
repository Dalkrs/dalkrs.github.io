// A mesa ao vivo, de ponta a ponta, no projeto real: o mestre e um jogador, cada um no seu aparelho.
const { start, checker, espiarBanco } = require('./lib');
const { contas, entrar } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  // garante as contas (numa página em branco) e sai, para o teste entrar pela tela
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }

  const dM = await t.device({ name: 'mestre' }), M = dM.page, J = (await t.device({ name: 'jogador', w: 1200, h: 800 })).page;
  await espiarBanco(dM.ctx);                                 // (para conferir o banco por fora do programa)
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const feed = p => p.locator('#feed');
  const espera = async (p, texto, ms = 9000) => { try { await feed(p).getByText(texto, { exact: false }).first().waitFor({ timeout: ms }); return true; } catch (e) { return false; } };
  const some = async (p, texto, ms = 9000) => { try { await feed(p).getByText(texto, { exact: false }).first().waitFor({ state: 'detached', timeout: ms }); return true; } catch (e) { return false; } };

  // ---------- sem conta: tudo como antes, com o botão Entrar ----------
  await M.goto(t.base, { waitUntil: 'load' }); await w(1500);
  ok((await M.locator('#btnConta').innerText()).trim() === 'Entrar', 'sem conta, a barra mostra "Entrar"');
  ok(await M.locator('#btnVivo').isHidden() && await M.locator('#vivo').isHidden(), 'sem mesa não há painel nem botão da mesa ao vivo');

  // ---------- o mestre entra e cria a mesa ----------
  await M.locator('#btnConta').click(); await w(300);
  ok(await M.locator('#f-conta').isVisible(), 'abre a janela de entrar');
  await M.locator('#c-email').fill(c.mestre); await M.locator('#c-senha').fill('senha-errada-1'); await M.locator('#c-ok').click(); await w(2500);
  ok((await M.locator('#c-erro').innerText()).includes('incorretos'), 'senha errada: aviso em português — ' + await M.locator('#c-erro').innerText());
  await M.locator('#c-senha').fill(c.senha); await M.locator('#c-ok').click();
  await M.locator('#m-nome').waitFor({ timeout: 15000 });
  ok(true, 'depois de entrar, abre a janela de mesas');
  const nomeMesa = 'Mesa E2E ' + Date.now().toString(36);
  await M.locator('#m-nome').fill(nomeMesa); await M.locator('#m-criar').click();
  await M.locator('#vivo').waitFor({ state: 'visible', timeout: 15000 });
  ok((await M.locator('#btnConta').innerText()).includes(nomeMesa) && (await M.locator('#btnConta').innerText()).includes('Mestre'), 'a barra mostra a mesa e o papel: ' + (await M.locator('#btnConta').innerText()).replace(/\s+/g, ' '));
  // (e mais nada: cada pedaço do botão é um elemento com texto — nenhum "null" ou "undefined" escrito ao lado)
  ok(await M.evaluate(n => { const b = document.getElementById('btnConta'); return [...b.childNodes].every(x => x.nodeType === 1) && b.textContent === n + 'Mestre'; }, nomeMesa), 'numa mesa sem campanhas, a barra tem só o nome da mesa e o papel: ' + JSON.stringify(await M.locator('#btnConta').evaluate(b => b.textContent)));
  ok(await M.locator('#vivo').isVisible(), 'o painel da mesa ao vivo abre');
  await M.locator('#btnConta').click(); await w(400);
  const codigo = (await M.locator('#codigo').innerText()).trim();
  ok(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/.test(codigo), 'o mestre vê o código de convite: ' + codigo);
  await M.keyboard.press('Escape'); await w(200);
  ok(await M.locator('#menu').isHidden(), 'Esc fecha o menu');

  // ---------- novidades: uma bolinha no botão da conta até a pessoa abrir a lista; nada abre sozinho ----------
  {
    const fs = require('fs'), path = require('path'), { ROOT } = require('./lib');
    const V = /const VERSAO = '([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'))[1];
    const ponto = () => M.locator('#btnConta > .pt').count();
    let acesa = false; for (let i = 0; i < 30 && !acesa; i++) { acesa = (await ponto()) === 1; if (!acesa) await w(300); }
    ok(acesa && !(await M.locator('#dlg').evaluate(d => d.open)), 'novidades: a bolinha acende no canto do botão da conta, e nada abre sozinho');
    ok(await M.evaluate(n => document.getElementById('btnConta').textContent === n + 'Mestre', nomeMesa), 'a bolinha não escreve nada no botão');
    await M.locator('#btnConta').click(); await w(300);
    ok(await M.locator('#mn-novidades .pt').count() === 1, 'o item "Novidades" do menu também tem a bolinha');
    await M.locator('#mn-novidades').click(); await M.locator('#f-novidades').waitFor({ timeout: 8000 });
    ok(await M.locator(`#nov-lista [data-versao="${V}"]`).count() === 1 && await M.locator('#menu').isHidden(), 'o item fecha o menu e abre a lista, com a versão ' + V);
    await M.locator('#f-novidades button', { hasText: 'Fechar' }).click(); await w(300);
    ok(!(await M.locator('#dlg').evaluate(d => d.open)) && (await ponto()) === 0, 'depois de abrir a lista, a bolinha apaga');
    await M.locator('#btnConta').click(); await w(300);
    ok(await M.locator('#mn-novidades .pt').count() === 0 && await M.evaluate(() => localStorage.getItem('tinycats:novidades')) === V, 'o item do menu fica sem ela, e o aparelho lembra o que já foi visto');
    await M.keyboard.press('Escape'); await w(200);
  }

  // ---------- o jogador entra com o código ----------
  await J.goto(t.base, { waitUntil: 'load' }); await w(1200, J);
  await J.locator('#btnConta').click(); await J.locator('#c-email').fill(c.jog1); await J.locator('#c-senha').fill(c.senha); await J.locator('#c-ok').click();
  await J.locator('#m-cod').waitFor({ timeout: 15000 });
  await J.locator('#m-cod').fill('zzz-zzz'); await J.locator('#m-meu').fill('Dalmo'); await J.locator('#m-entrar').click(); await w(2500, J);
  ok((await J.locator('#m-erro').innerText()).includes('não encontrado'), 'código errado: ' + await J.locator('#m-erro').innerText());
  await J.locator('#m-cod').fill(codigo.toLowerCase()); await J.locator('#m-entrar').click();
  await J.locator('#vivo').waitFor({ state: 'visible', timeout: 15000 });
  ok((await J.locator('#btnConta').innerText()).includes('Jogador'), 'o jogador entra na mesa como jogador');
  ok(await J.locator('#segredo').count() === 0, 'o jogador não tem o botão "Em segredo"');
  await J.locator('#btnConta').click(); await w(300, J);
  ok(await J.locator('#codigo').count() === 0, 'o jogador não vê o código de convite');
  ok(await J.locator('#membros .mb').count() === 2, 'o jogador vê os dois participantes');
  await J.keyboard.press('Escape');
  // o Rolador é ferramenta do mestre: numa mesa, o jogador não tem a aba (nem chega nela pelo endereço)
  ok(await J.locator('#tab-rolador').isHidden() && await M.locator('#tab-rolador').isVisible(), 'na mesa, só o mestre vê a aba Rolador');
  ok(await J.locator('.tab:visible').count() === 5, 'o jogador fica com as outras cinco abas');
  await J.evaluate(() => { location.hash = '#/rolador'; }); await w(500, J);
  ok(await J.locator('#tab-rolador').getAttribute('aria-selected') !== 'true' && !J.frame({ url: /\/rolador\// }), 'e o endereço #/rolador não abre o Rolador para ele');

  // ---------- conversa e comandos ----------
  await J.locator('#msg').fill('olá, mesa!'); await J.locator('#msg').press('Enter');
  ok(await espera(J, 'olá, mesa!'), 'a fala aparece para quem escreveu');
  ok(await espera(M, 'olá, mesa!'), 'a fala chega ao mestre');
  await J.locator('#msg').fill('/r 2d6+3 >= 5'); await J.locator('#msg').press('Enter');
  ok(await espera(J, '2d6 + 3'), 'o /r rola e mostra a conta');
  const cartaJ = feed(J).locator('.rol').last();
  ok(/^\d+$/.test((await cartaJ.locator('.tot').innerText()).trim()) && /Passou/.test(await cartaJ.locator('.vd').innerText()), 'a carta tem o total e o veredito: ' + (await cartaJ.innerText()).replace(/\n/g, ' | '));
  ok(await espera(M, '2d6 + 3'), 'a rolagem do jogador chega ao mestre');
  ok((await feed(M).locator('.rol').last().locator('.it-h b').innerText()) === 'Dalmo', 'com o nome de quem rolou');
  await J.locator('#msg').fill('/fixa 60 20'); await J.locator('#msg').press('Enter');
  ok(await espera(J, 'de fixa (atributo 60)'), 'o /fixa rola pela regra da fixa');
  await J.locator('#msg').fill('/me saca a espada'); await J.locator('#msg').press('Enter');
  ok(await espera(M, 'Dalmo saca a espada'), 'o /me vira ação, e chega ao mestre');
  await J.locator('#msg').fill('/voar'); await J.locator('#msg').press('Enter'); await w(500, J);
  ok(await feed(J).locator('.nota.erro').count() === 1 && (await J.locator('#msg').inputValue()) === '/voar', 'comando desconhecido: aviso só para quem digitou, e o texto volta ao campo');
  await J.locator('#msg').fill('/ajuda'); await J.locator('#msg').press('Enter'); await w(400, J);
  ok((await feed(J).locator('.nota').last().innerText()).includes('/fixa'), 'o /ajuda lista os comandos');
  ok(!(await feed(M).innerText()).includes('/voar') && !(await feed(M).innerText()).includes('Comandos da mesa'), 'avisos e ajuda não vão para a mesa');

  // ---------- segredo do mestre ----------
  ok((await M.locator('#dicaTxt').innerText()).includes('A mesa vê'), 'por padrão a mesa vê as rolagens do mestre');
  await M.locator('#segredo').click(); await w(300);
  ok(await M.locator('#segredo').getAttribute('aria-pressed') === 'true' && (await M.locator('#dicaTxt').innerText()).includes('Só você'), 'ligar "Em segredo" muda o aviso');
  await M.locator('#msg').fill('/r 1d20'); await M.locator('#msg').press('Enter');
  ok(await espera(M, 'Só você vê'), 'a rolagem secreta aparece para o mestre, marcada');
  // o Rolador, dentro do site, acompanha
  await M.locator('#tab-rolador').click(); await w(1800);
  const R = M.frame({ url: /\/rolador\// });
  ok((await R.locator('#mesaDest').innerText()).includes('Em segredo'), 'o Rolador avisa que a rolagem sai em segredo: ' + await R.locator('#mesaDest').innerText());
  await R.locator('#fTitle').fill('Furtividade do bandido'); await R.locator('#fAtr').fill('60'); await R.locator('#fFixa').fill('20'); await R.locator('#rollBtn').click();
  ok(await espera(M, 'Furtividade do bandido'), 'a rolagem do Rolador entra na mesa ao vivo do mestre');
  const cartaR = feed(M).locator('.rol', { hasText: 'Furtividade do bandido' });
  ok(await cartaR.locator('.or').innerText() === 'Rolador' && (await cartaR.getAttribute('class')).includes('secreta'), 'com a origem "Rolador" e marcada como secreta');
  await w(7000);
  ok(!(await feed(J).innerText()).includes('Furtividade do bandido') && await feed(J).locator('.rol').count() === 2, 'o jogador NÃO vê as rolagens secretas (continua com as 2 dele)');
  await cartaR.getByRole('button', { name: 'Mostrar à mesa' }).click();
  ok(await espera(J, 'Furtividade do bandido'), 'revelada, ela chega ao jogador');
  ok(!(await feed(M).locator('.rol', { hasText: 'Furtividade do bandido' }).getAttribute('class')).includes('secreta'), 'e deixa de estar marcada como secreta para o mestre');
  await M.locator('#segredo').click(); await w(400);
  ok((await R.locator('#mesaDest').innerText()).includes('vê esta rolagem'), 'desligando o segredo, o Rolador volta a avisar que a mesa vê');
  await M.screenshot({ path: 'shot-mesa-mestre.png' });

  // ---------- Fichas e Cenas também publicam ----------
  await M.locator('#tab-fichas').click(); await w(2000);
  const F = M.frame({ url: /\/fichas\// });
  ok((await F.locator('#ficha').innerText()).includes('Nenhum personagem'), 'numa mesa nova, as Fichas começam vazias (as do navegador ficam fora dela)');
  await F.locator('#btnNew').click(); await w(500);
  await F.locator('[data-rolar]').first().click(); await w(600);
  ok(await espera(J, 'Novo personagem', 9000), 'uma rolagem feita na ficha chega ao jogador');
  ok(await feed(J).locator('.rol', { hasText: 'Novo personagem' }).locator('.or').innerText() === 'Fichas', 'com a origem "Fichas"');
  await M.locator('#tab-cenas').click(); await w(2500);
  const C = M.frame({ url: /\/cenas\// });
  if (await C.locator('#tour-skip').count()) { await C.locator('#tour-skip').click(); await w(400); }
  // (numa mesa, as cenas são as da mesa, e ela começa com uma cena vazia: o mestre pede a de exemplo, que já tem ordem de turnos)
  /* (a oferta "Trazer as suas cenas para esta mesa?" pode abrir um instante depois de as Cenas abrirem, por cima de tudo:
      não é o assunto aqui — se ela estiver na frente, fecha-se com Esc e tenta-se de novo) */
  for (let i = 0; ; i++) { try { await C.locator('#sceneBtn').click({ timeout: i < 4 ? 5000 : 30000 }); break; } catch (e) { if (i >= 4) throw e; await M.keyboard.press('Escape'); await w(400); } }
  await w(250);
  await C.locator('.menu-i', { hasText: 'Nova cena de exemplo' }).click();
  for (let i = 0; i < 80 && (await C.locator('#sceneBtn .scene-n').innerText()) !== 'Cena de exemplo'; i++) await w(300);
  ok((await C.locator('#sceneBtn .scene-n').innerText()) === 'Cena de exemplo' && (await C.locator('#airBtn').innerText()).includes('Fora do ar'), 'a cena de exemplo é criada na mesa, fora do ar até o mestre mostrar');
  await C.locator('#tab-turn').click(); await w(400);
  await C.locator('#turnRoll').click(); await w(600);
  if (await C.getByRole('button', { name: /Rolar de novo|Rolar/ }).count() > 1) { /* já tinham iniciativa: confirma */ const b = C.locator('.modal .btn.primary'); if (await b.count()) await b.click(); }
  ok(await espera(M, 'Iniciativa ·', 9000), 'a iniciativa rolada na cena entra na mesa ao vivo');
  ok(await espera(J, 'Iniciativa ·', 9000), 'e chega ao jogador');

  // ---------- presença, apagar, recarregar ----------
  ok(await M.locator('#quem .pes:not(.fora)').count() >= 1, 'o painel mostra quem está na mesa');
  const antes = await feed(M).locator('.it').count();
  await feed(J).locator('.fala', { hasText: 'olá, mesa!' }).hover(); await feed(J).locator('.fala', { hasText: 'olá, mesa!' }).locator('.mini').click();
  ok(await some(M, 'olá, mesa!'), 'o jogador apaga a própria fala e ela some para o mestre');
  await J.locator('.toast button', { hasText: 'Desfazer' }).click();
  ok(await espera(M, 'olá, mesa!'), 'desfazer devolve a fala');
  await J.screenshot({ path: 'shot-mesa-jogador.png' });

  // ---------- o mestre renomeia a mesa ----------
  const naBarra = (p, nome, ms = 12000) => p.waitForFunction(n => { const e = document.querySelector('#btnConta .nm'); return !!e && e.textContent.trim() === n; }, nome, { timeout: ms }).then(() => true, () => false);
  await J.locator('#btnConta').click(); await w(300, J);
  ok((await J.locator('#menu').isVisible()) && (await J.locator('#mn-renomear').count()) === 0 && (await J.locator('#mn-limpar').count()) === 0, 'o jogador não tem "Renomear a mesa" nem "Limpar a mesa ao vivo" no menu');
  await J.locator('#btnConta').click(); await w(200, J);
  const nomeNovo = nomeMesa + ' II';
  await M.locator('#btnConta').click(); await w(300);
  await M.locator('#mn-renomear').click(); await w(300);
  ok((await M.locator('#r-nome').inputValue()) === nomeMesa, 'renomear a mesa: a janela abre com o nome atual');
  await M.locator('#r-nome').fill(nomeNovo); await M.locator('dialog .btn.pri').click();
  ok(await naBarra(M, nomeNovo), 'o nome novo aparece na barra do mestre');
  // (o aviso com "Desfazer" some sozinho em 8 s — mas não com o ponteiro em cima: quem ia clicar não o perde no caminho)
  const avisoNome = M.locator('#toasts .toast', { hasText: 'A mesa agora se chama' }).last();
  await avisoNome.hover(); const t0 = Date.now();
  await J.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));      // (o jogador confere a mesa ao voltar para a página; parado nela, em até meio minuto)
  ok(await naBarra(J, nomeNovo, 20000), 'e na do jogador, sem recarregar');
  await w(Math.max(0, 9500 - (Date.now() - t0)));
  ok(await avisoNome.isVisible(), 'com o ponteiro em cima, o aviso com "Desfazer" continua lá depois dos 8 s');
  await M.locator('.toast button', { hasText: 'Desfazer' }).last().click();
  ok(await naBarra(M, nomeMesa), '"Desfazer" devolve o nome de antes');
  const avisoVolta = M.locator('#toasts .toast', { hasText: 'A mesa voltou a se chamar' }).last();
  await avisoVolta.hover(); await w(6000);
  ok(await avisoVolta.isVisible(), 'um aviso sem botão também espera enquanto o ponteiro está nele');
  await M.mouse.move(5, 420);
  ok(await avisoVolta.waitFor({ state: 'detached', timeout: 5000 }).then(() => true, () => false), 'e some logo depois que o ponteiro sai');

  // ---------- o mestre limpa a mesa ao vivo inteira, e desfaz ----------
  const vazio = (p, ms = 15000) => p.waitForFunction(() => document.querySelectorAll('#feed .it').length === 0, null, { timeout: ms }).then(() => true, () => false);
  const linhasAntes = await feed(M).locator('.it').count();
  await M.locator('#msg').fill('some antes da limpeza'); await M.locator('#msg').press('Enter');
  ok(await espera(J, 'some antes da limpeza'), '(uma fala do mestre chega ao jogador)');
  await feed(M).locator('.fala', { hasText: 'some antes da limpeza' }).hover(); await feed(M).locator('.fala', { hasText: 'some antes da limpeza' }).locator('.mini').click();
  ok(await some(J, 'some antes da limpeza'), '(…e o mestre a apaga, sozinha, antes de limpar o painel)');
  await M.locator('#btnConta').click(); await w(300);
  await M.locator('#mn-limpar').click(); await w(300);
  ok((await M.locator('dialog h2').innerText()).includes('Limpar a mesa ao vivo'), 'limpar a mesa ao vivo pede confirmação');
  await M.locator('dialog .btn.per').click();
  ok(linhasAntes >= 3 && await vazio(M), 'confirmado, o painel do mestre fica vazio (tinha ' + linhasAntes + ' linhas)');
  await M.locator('#toasts .toast', { hasText: 'Desfazer' }).last().hover();      // (o aviso espera, enquanto o resto é conferido)
  ok(await vazio(J), 'e o do jogador também, sem recarregar');
  const noBanco = await M.evaluate(async () => { const r = await window.__sb.from('registro').select('id', { count: 'exact', head: true }).eq('mesa_id', TC.mesas.atual.id).eq('apagado', false); return r.error ? -1 : r.count; });
  ok(noBanco === 0, 'no banco não sobra linha à mostra (quem recarregar também vê o painel vazio): ' + noBanco);
  await M.locator('.toast button', { hasText: 'Desfazer' }).last().click();
  ok(await espera(M, 'olá, mesa!') && await espera(J, 'olá, mesa!', 15000), '"Desfazer" traz as linhas de volta, para os dois');
  await w(1500);
  ok((await feed(M).locator('.it').count()) === linhasAntes && (await feed(M).getByText('some antes da limpeza').count()) === 0,
    'voltam exatamente as linhas que a limpeza tirou (' + (await feed(M).locator('.it').count()) + ' de ' + linhasAntes + '); a que já tinha sido apagada antes não volta');

  // ---------- fechar a mesa com uma leitura no meio do caminho não quebra nada ----------
  const errosAntes = t.errs.length;
  await J.evaluate(async () => {
    const id = TC.mesas.atual.id;
    await Promise.all([TC.dados.col('personagens').pronta, TC.dados.col('documentos').pronta]);
    document.dispatchEvent(new Event('visibilitychange'));     // pede uma leitura agora, com duas coleções abertas...
    TC.mesas.fechar();                                         // ...e fecha a mesa antes de a primeira responder
    await new Promise(r => setTimeout(r, 1800));
    await TC.mesas.abrir(id);
  });
  await w(1200);
  ok(t.errs.length === errosAntes && (await J.locator('#btnConta').innerText()).includes(nomeMesa), 'fechar e reabrir a mesa com uma leitura no meio do caminho não dá erro: ' + t.errs.slice(errosAntes).join(' | '));
  await M.reload({ waitUntil: 'load' });
  await M.locator('#vivo').waitFor({ state: 'visible', timeout: 15000 });
  ok((await M.locator('#btnConta').innerText()).includes(nomeMesa), 'ao recarregar, a conta e a mesa continuam abertas');
  ok(await espera(M, 'Furtividade do bandido', 6000) && await feed(M).locator('.it').count() >= antes - 1, 'e o registro volta inteiro');

  // ---------- sair, fechar ou trocar de mesa com mudanças ainda por subir: nada fica para trás ----------
  const sai1 = await M.evaluate(async () => {
    const D = TC.dados.col('documentos'); await D.pronta;
    D.gravar('teste:pequeno', { dono_id: null, vis: 'mestre', dados: { n: 1 } });
    const ev = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(ev);      // o que a página faz quando vai fechar
    return { perguntou: ev.defaultPrevented, naFila: TC.dados.pendentes };
  });
  ok(!sai1.perguntou && sai1.naFila === 1, 'fechar a página com uma mudança pequena por subir: ela sai na hora, do jeito que o navegador garante, e ele não pergunta nada');
  ok(await M.waitForFunction(() => TC.dados.pendentes === 0 && TC.dados.col('documentos').pegar('teste:pequeno').rev > 0, null, { timeout: 15000 }).then(() => true, () => false), '(como a página não fechou de verdade, a mudança aparece confirmada)');
  const sai2 = await M.evaluate(() => {
    TC.dados.col('documentos').gravar('teste:grande', { dono_id: null, vis: 'mestre', dados: { s: 'x'.repeat(90000) } });
    const ev = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(ev);
    return ev.defaultPrevented;
  });
  ok(sai2, 'com um documento grande por subir (não cabe na garantia do navegador), o navegador pergunta antes de sair');
  ok(await M.waitForFunction(() => TC.dados.pendentes === 0 && TC.dados.col('documentos').pegar('teste:grande').rev > 0, null, { timeout: 20000 }).then(() => true, () => false), 'ficando na página, o documento grande sobe pelo caminho comum');
  // sem rede: mandar agora não garante nada — o navegador pergunta
  await M.context().setOffline(true);
  const sai3 = await M.evaluate(() => {
    TC.dados.col('documentos').gravar('teste:sem-rede', { dono_id: null, vis: 'mestre', dados: { n: 1 } });
    const ev = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(ev);
    return ev.defaultPrevented;
  });
  await M.context().setOffline(false);
  ok(sai3, 'sem rede, com algo por subir, o navegador pergunta antes de sair (o envio de saída não teria como chegar)');
  ok(await M.waitForFunction(() => TC.dados.pendentes === 0 && (TC.dados.col('documentos').pegar('teste:sem-rede') || {}).rev > 0, null, { timeout: 40000 }).then(() => true, () => false), 'com a rede de volta, a mudança sobe sozinha');
  const fechou = await M.evaluate(async () => {
    const id = TC.mesas.atual.id;
    TC.dados.col('documentos').gravar('teste:fechando', { dono_id: null, vis: 'mestre', dados: { n: 7 } });
    TC.mesas.fechar();                                         // fecha a mesa com a mudança ainda na fila
    await new Promise(r => setTimeout(r, 2500));
    await TC.mesas.abrir(id);
    const D = TC.dados.col('documentos'); await D.pronta;
    const l = D.pegar('teste:fechando');
    return l ? l.dados.n : null;
  });
  ok(fechou === 7, 'fechar a mesa com uma mudança ainda na fila: ela sobe mesmo assim (ao reabrir, está lá)');
  const outra = await M.evaluate(async () => {
    TC.daPonteDireto({ t: 'dados.gravar', col: 'documentos', id: 'teste:de-outra-mesa', campos: { dono_id: null, vis: 'mestre', dados: { n: 1 } }, mesa: '00000000-0000-4000-8000-000000000000' }, window);
    TC.daPonteDireto({ t: 'dados.gravar', col: 'documentos', id: 'teste:desta-mesa', campos: { dono_id: null, vis: 'mestre', dados: { n: 1 } }, mesa: TC.mesas.atual.id }, window);
    const D = TC.dados.col('documentos');
    return [!!D.pegar('teste:de-outra-mesa'), !!D.pegar('teste:desta-mesa')];
  });
  ok(outra[0] === false && outra[1] === true, 'uma gravação que chega de um sistema ainda na mesa anterior não entra na mesa aberta (a desta mesa entra)');
  await M.waitForFunction(() => TC.dados.pendentes === 0, null, { timeout: 15000 }).catch(() => {});
  await M.locator('#vivo').waitFor({ state: 'visible', timeout: 15000 });

  // ---------- o mestre apaga a mesa ----------
  await M.locator('#btnConta').click(); await w(300);
  await M.locator('#menu .lk', { hasText: 'Apagar esta mesa' }).click(); await w(300);
  await M.locator('#a-nome').fill('nome errado'); await M.locator('dialog .btn.per').click(); await w(500);
  ok((await M.locator('dialog .err').innerText()).includes('não confere'), 'apagar a mesa exige o nome certo');
  await M.locator('#a-nome').fill(nomeMesa); await M.locator('dialog .btn.per').click();
  await M.locator('#vivo').waitFor({ state: 'hidden', timeout: 15000 });
  ok((await M.locator('#btnConta').innerText()).trim() === 'Escolher mesa', 'mesa apagada: a barra volta a "Escolher mesa"');
  await M.locator('#btnConta').click(); await w(200); await M.locator('#menu .lk', { hasText: 'Sair da conta' }).click(); await w(1500);
  ok((await M.locator('#btnConta').innerText()).trim() === 'Entrar', 'sair da conta volta ao começo');

  if (t.errs.length) console.log('CONSOLE:\n' + t.errs.join('\n') + '\nRESPOSTAS COM ERRO:\n' + t.ruins.join('\n'));
  ok(t.errs.filter(e => !/status of (400|401|409)/.test(e)).length === 0, 'sem erros inesperados no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
