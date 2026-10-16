// Meditação pela interface, sem mesa (a página sozinha — tudo fica neste navegador, com um personagem de teste):
//   · a cena: o lugar de começo (o templo ao pôr do sol), a hora, o ambiente (a lista e as miniaturas), o clima, a
//     imagem própria (e "Voltar ao desenho"); desfazer (o botão e Ctrl+Z);
//   · quem medita: chamar (a janela), liberar a tentativa (mais uma; o Desfazer do aviso), tirar da meditação;
//   · a prática: objeto, mantra, representação, panteão e a imagem meditando (lote 7: na ficha, para todos; na cena, o
//     personagem inteiro, com a transparência e sem as margens vazias; a imagem de antes, da prática, no retrato redondo);
//   · as receitas: criar (o cursor no nome), os pilares (escolher o pilar e o símbolo, tirar um), o efeito, onde vale;
//     os avisos (menos de 2 símbolos, a mesma sequência de outra, um símbolo escondido); apagar (com a pergunta) e o
//     Desfazer do aviso;
//   · os símbolos: esconder e mostrar um pronto; criar um (com desenho; com imagem), renomear, apagar;
//   · os pilares: errar ("Nada aconteceu", a tentativa usada), a receita de outro ambiente, acertar ("Você
//     descobriu", com o efeito), acertar de novo ("Você já conhecia"); o registro; tirar uma receita da lista;
//   · limpar o registro (lote 7): a pergunta, o que sai e o que fica, o Desfazer;
//   · o treinamento: o rascunho da barra nova não some, criar, somar até completar, tirar e desfazer;
//   · recarregar a página (tudo continua) e a tela estreita.
// (Numa mesa — o mestre, os jogadores e o banco —: src/tests/meditacao.rede.test.js.) TC_SCRATCH=<pasta> guarda capturas.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
// uma imagem PNG de 1×1 (a página a reduz e guarda embutida, porque não há mesa)
const PNG = { name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64') };

(async () => {
  const t = await start();
  const dv = await t.device({ name: 'meditacao', w: 1400, h: 900 });
  const P = dv.page;
  P.setDefaultTimeout(8000);
  const A = (fn, arg) => P.evaluate(fn, arg);
  const campo = k => P.locator(`[data-k="${k}"]`);
  async function escrever(k, v) { const c = campo(k); await c.fill(v); await c.dispatchEvent('change'); await espera(150); }
  async function botao(sel) { await P.click(sel); await espera(200); }
  const doc = id => A(id => __medit.doc(id), id);
  const rotulo = () => A(() => { const p = __medit.pilha; return p.length ? p[p.length - 1] : null; });
  const avisos = () => A(() => [...document.querySelectorAll('#toasts .toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const desfazerDoAviso = async () => { await P.locator('#toasts .toast button', { hasText: 'Desfazer' }).last().click(); await espera(300); };
  // escolher a imagem e esperar a página prepará-la (ela entra como um passo de desfazer)
  const comArquivo = async sel => {
    const antes = await A(() => __medit.pilha.length);
    const [fc] = await Promise.all([P.waitForEvent('filechooser'), P.click(sel)]); await fc.setFiles(PNG);
    await P.waitForFunction(n => __medit.pilha.length > n, antes, { timeout: 8000 }).catch(() => {}); await espera(250);
  };
  const longe = async () => { await P.locator('#palco').click({ position: { x: 40, y: 300 } }); await espera(100); };     // (o foco sai dos campos)
  const foto = async nome => { if (process.env.TC_SCRATCH) await P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };
  const PC = 'pc_teste';
  let r1 = null, r2 = null;

  await passo('a página sozinha', async () => {
    await P.goto(t.base + 'meditacao/?debug', { waitUntil: 'load' });
    await P.waitForFunction(() => window.__medit && __medit.pronto, null, { timeout: 15000 }); await espera(300);
    ok(await A(() => __medit.mestre && !__medit.naMesa) && await P.locator('#vistas').isVisible() && await P.locator('#ambientes').isVisible(),
      'sem mesa, quem abre a Meditação é o próprio mestre: as duas vistas e os ambientes');
    ok(/hora-por/.test(await P.locator('#palco').getAttribute('class')) && await campo('ch:amb').innerText() === 'Templo na montanha' && await campo('ch:hora').innerText() === 'Pôr do sol'
      && await campo('ch:clima').innerText() === 'Céu limpo' && await P.locator('#fundo svg.desenho').count() === 1, 'a cena de começo: o templo na montanha ao pôr do sol, céu limpo (o desenho)');
    ok(await P.locator('.vazio-cena').isVisible() && /Ninguém meditando/.test(await P.locator('#painel').innerText()) && /Neste navegador/.test(await P.locator('#salvo').innerText()) && await P.locator('#btDesfazer').isDisabled(),
      'ninguém meditando (na cena e no painel); tudo neste navegador; nada para desfazer');
    ok(await P.locator('#ambientes .amb').count() === 9 && await P.locator('[data-amb="templo"]').getAttribute('aria-pressed') === 'true', 'os oito ambientes (em miniatura) e a imagem própria; o templo marcado');
    await foto('medit-1-comeco');
  });

  await passo('o lugar: hora, ambiente, clima', async () => {
    await botao('[data-hora="noite"]');
    ok((await doc('medit:cena')).hora === 'noite' && /hora-noite/.test(await P.locator('#palco').getAttribute('class')) && await campo('ch:hora').innerText() === 'Noite' && await rotulo() === 'mudar a hora',
      'a hora: à noite (a cena escurece; um passo de desfazer)');
    await campo('c:amb').selectOption('floresta'); await espera(250);
    ok((await doc('medit:cena')).amb === 'floresta' && await campo('ch:amb').innerText() === 'Floresta' && await P.locator('[data-amb="floresta"]').getAttribute('aria-pressed') === 'true', 'o ambiente pela lista: a floresta');
    await botao('[data-amb="caverna"]');
    ok((await doc('medit:cena')).amb === 'caverna' && await P.locator('[data-amb="caverna"]').getAttribute('aria-pressed') === 'true', 'e pela miniatura: a caverna');
    await campo('c:clima').selectOption('chuva'); await espera(250);
    ok((await doc('medit:cena')).clima === 'chuva' && /clima-chuva/.test(await P.locator('#clima').getAttribute('class')) && await P.locator('#clima i').count() > 20 && await campo('ch:clima').innerText() === 'Chuva',
      'o clima: chuva, caindo por cima da cena');
    await botao('#btDesfazer');
    ok((await doc('medit:cena')).clima === '' && await P.locator('#clima i').count() === 0 && /Desfeito: mudar o clima/.test(await avisos()), 'Desfazer (o botão) tira a chuva');
    await longe();
    await P.keyboard.press('Control+z'); await espera(300);
    ok((await doc('medit:cena')).amb === 'floresta', 'Ctrl+Z volta a floresta');
    await campo('c:amb').selectOption('templo'); await espera(200); await botao('[data-hora="por"]');
  });

  await passo('a imagem própria', async () => {
    await comArquivo('[data-amb="imagem"]');
    const c = await doc('medit:cena');
    ok(/^data:image\/jpeg;base64,/.test(c.img || '') && await P.locator('#fundo img').count() === 1 && await P.locator('#tinta').isVisible() && /imagem do mestre/.test(await campo('ch:amb').innerText()),
      'a imagem do mestre vira o fundo da cena (sem mesa, guardada embutida), com a cor da hora por cima');
    ok(c.amb === 'templo' && /O ambiente escolhido continua valendo para as receitas/.test(await avisos()), 'o ambiente continua o templo (é o que vale para as receitas), e o aviso diz isso');
    await botao('[data-k="c:sem-img"]');
    ok((await doc('medit:cena')).img === null && await P.locator('#fundo svg.desenho').count() === 1, '"Voltar ao desenho"');
    await botao('#btDesfazer');
    ok(/^data:image/.test((await doc('medit:cena')).img || '') && await P.locator('#fundo img').count() === 1, 'desfazer: a imagem volta');
    await botao('[data-amb="templo"]');
    ok((await doc('medit:cena')).img === null && await rotulo() === 'trocar a imagem pelo desenho', 'escolher um ambiente desenhado também tira a imagem');
  });

  await passo('chamar para meditar e liberar a tentativa', async () => {
    await botao('[data-k="chamar"]');
    ok(await P.locator('#dlg[open]').count() === 1 && /Personagem de teste · personagem de teste/.test(await P.locator('#dlg').innerText()), 'a janela "Chamar para meditar", com os personagens de fora');
    await P.locator('#dlg input[data-pc="pc_teste"]').check(); await botao('[data-k="dl:sim"]'); await espera(200);
    ok(JSON.stringify((await doc('medit:quem')).quem) === '["pc_teste"]' && await P.locator(`[data-quem="${PC}"]`).isVisible() && await P.locator(`.quem[data-pc="${PC}"]`).isVisible()
      && /Meditando agora: Personagem de teste/.test(await campo('ch:quem').innerText()) && await P.locator('.vazio-cena').count() === 0, 'o personagem medita: na cena, no painel (o cartão) e na faixa de cima');
    ok(/Personagem de teste está meditando\./.test(await avisos()) && await rotulo() === 'chamar Personagem de teste para meditar', 'com o aviso (e o Desfazer)');
    let a = await doc('medit:achados:' + PC);
    ok(a.reg.length === 1 && a.reg[0].tipo === 'entrou' && a.reg[0].amb === 'templo' && a.reg[0].hora === 'por' && a.lib === 0, 'o registro guarda a entrada: o templo, ao pôr do sol');
    ok(/Sem tentativa agora/.test(await campo('tent').innerText()) && await campo('tentar').isDisabled() && /Esperando o mestre liberar/.test(await campo('tentar').innerText())
      && await P.locator('.simbolos [data-simb]').first().isDisabled(), 'sem tentativa liberada, os pilares esperam (nem os símbolos se escolhem)');
    await botao(`[data-k="lib:${PC}"]`);
    a = await doc('medit:achados:' + PC);
    ok(a.lib === 1 && a.feitas === 0 && /Tentativa liberada/.test(await P.locator(`[data-quem="${PC}"]`).innerText()) && /tentativa liberada/.test(await P.locator(`.quem[data-pc="${PC}"]`).innerText())
      && /O mestre liberou 1 tentativa/.test(await campo('tent').innerText()), 'liberar: o cartão, a cena e os pilares mostram a tentativa');
    await botao(`[data-k="lib:${PC}"]`);
    ok((await doc('medit:achados:' + PC)).lib === 2 && /2 tentativas liberadas/.test(await P.locator(`[data-quem="${PC}"]`).innerText()), '"Mais uma": duas');
    await botao('[data-hora="manha"]');
    await P.locator('#toasts .toast', { hasText: 'Tentativa liberada' }).last().locator('button').click(); await espera(300);
    ok((await doc('medit:achados:' + PC)).lib === 2 && /Já houve outra mudança depois/.test(await avisos()), 'o Desfazer de um aviso antigo não desfaz por cima de uma mudança feita depois dele');
    await botao('#btDesfazer'); await botao('#btDesfazer');
    ok((await doc('medit:achados:' + PC)).lib === 1 && (await doc('medit:cena')).hora === 'por' && /Desfeito: liberar a tentativa/.test(await avisos()), 'o botão Desfazer desfaz na ordem: a hora, depois a tentativa de mais');
    await botao(`[data-k="sair:${PC}"]`);
    ok((await doc('medit:quem')).quem.length === 0 && await P.locator('.vazio-cena').isVisible(), '"Tirar da meditação"');
    await botao('#btDesfazer');
    ok(JSON.stringify((await doc('medit:quem')).quem) === '["pc_teste"]' && (await doc('medit:achados:' + PC)).lib === 1, 'desfazer: volta a meditar (a tentativa continua lá)');
    await foto('medit-2-meditando');
  });

  await passo('a prática', async () => {
    await escrever('p:objeto', 'Um colar de dentes de lobo');
    await escrever('p:mantra', 'A lua não tem pressa, e ainda assim chega.');
    await escrever('p:rep', 'Uma raposa branca\nsob a lua cheia');
    const p = await doc('medit:pratica:' + PC);
    ok(p.objeto === 'Um colar de dentes de lobo' && p.mantra === 'A lua não tem pressa, e ainda assim chega.' && p.rep === 'Uma raposa branca\nsob a lua cheia' && await rotulo() === 'mudar a representação',
      'objeto, mantra e representação (cada um, um passo de desfazer)');
    await escrever('p:panteao', '  Os   Deuses da Lua ');
    ok(await A(() => JSON.parse(localStorage.getItem('tinycats:meditacao:local'))['teste:panteao']) === 'Os Deuses da Lua' && await rotulo() === 'mudar o panteão',
      'o panteão (sem mesa, guardado aqui; numa mesa, é o da ficha)');
    // (lote 7) a imagem de antes — guardada na prática, só o dono e o mestre a viam —: continua no retrato redondo
    await A(img => { const d = JSON.parse(localStorage.getItem('tinycats:meditacao:local')); d['medit:pratica:pc_teste'].img = img; localStorage.setItem('tinycats:meditacao:local', JSON.stringify(d)); },
      'data:image/png;base64,' + PNG.buffer.toString('base64'));
    await P.reload({ waitUntil: 'load' });
    await P.waitForFunction(() => window.__medit && __medit.pronto, null, { timeout: 15000 }); await espera(300);
    ok(await P.locator(`.quem[data-pc="${PC}"] .ret img`).count() === 1 && await P.locator('.quem.fig').count() === 0 && /imagem de antes: só você e o mestre a veem/.test(await campo('p:img-ajuda').innerText())
      && await campo('p:img').innerText() === 'Trocar a imagem', 'a imagem de antes (da prática): o retrato redondo na cena, e o aviso de que só o dono e o mestre a veem');
    // a imagem nova: um PNG com fundo transparente e margens vazias em volta (um quadrado de 10×10 num quadro de 40×30)
    const fig = await A(() => { const c = document.createElement('canvas'); c.width = 40; c.height = 30; const x = c.getContext('2d'); x.fillStyle = '#c33'; x.fillRect(15, 10, 10, 10); return c.toDataURL('image/png').split(',')[1]; });
    const comFigura = async () => {
      const antes = await A(() => __medit.pilha.length);
      const [fc] = await Promise.all([P.waitForEvent('filechooser'), P.click('[data-k="p:img"]')]); await fc.setFiles({ name: 'figura.png', mimeType: 'image/png', buffer: Buffer.from(fig, 'base64') });
      await P.waitForFunction(n => __medit.pilha.length > n, antes, { timeout: 8000 }).catch(() => {}); await espera(300);
    };
    await comFigura();
    const guardada = () => A(() => JSON.parse(localStorage.getItem('tinycats:meditacao:local'))['teste:imgMed'] || null);
    const g = await guardada();
    const medida = await A(src => new Promise(ok => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
      const px = x.getImageData(0, 0, im.width, im.height).data, i = ((im.height >> 1) * im.width + (im.width >> 1)) * 4;
      ok({ w: im.width, h: im.height, canto: px[3], meio: px[i + 3] }); }; im.onerror = () => ok(null); im.src = src; }), g);
    ok(/^data:image\/(webp|png)/.test(g || '') && !!medida && medida.w === 14 && medida.h === 14 && medida.canto === 0 && medida.meio === 255 && await rotulo() === 'pôr a imagem meditando',
      'a imagem meditando nova guarda a transparência (WebP ou PNG, sem o fundo escuro) e perde as margens vazias: ' + JSON.stringify(medida));
    ok(await P.locator(`.quem.fig[data-pc="${PC}"] .fig-img`).count() === 1 && await P.locator(`.quem.fig[data-pc="${PC}"] .brilho`).count() === 1 && await P.locator(`.quem[data-pc="${PC}"] .ret`).count() === 0
      && await P.locator(`[data-quem="${PC}"] .retrato-p.fig img`).count() === 1 && /aparece grande na cena, para todos da mesa/.test(await campo('p:img-ajuda').innerText()) && /aparece na cena para todos/.test(await avisos()),
      'na cena, o personagem inteiro (com a aura em volta do contorno), no lugar do retrato redondo; no cartão, a miniatura; o aviso diz que todos veem');
    const caixa = await A(pc => { const f = document.querySelector('.quem.fig[data-pc="' + pc + '"] .fig-img').getBoundingClientRect(), p = document.getElementById('palco').getBoundingClientRect(); return { alt: f.height / p.height, base: (f.bottom - p.top) / p.height }; }, PC);
    ok(caixa.alt > 0.45 && caixa.alt < 0.55 && caixa.base > 0.8 && caixa.base < 0.92, 'sozinho na cena, a figura tem cerca de metade da altura da cena, com o pé no chão da frente: ' + JSON.stringify(caixa));
    await foto('medit-2b-figura');
    await P.keyboard.press('Control+z'); await espera(300);
    ok(await guardada() === null && await P.locator('.quem.fig').count() === 0 && await P.locator(`.quem[data-pc="${PC}"] .ret img`).count() === 1, 'desfazer: volta a imagem de antes, no retrato redondo');
    await comFigura();
    await botao('[data-k="p:sem-img"]');
    ok(await guardada() === null && await P.locator('.quem.fig').count() === 0 && await rotulo() === 'tirar a imagem meditando' && /A imagem meditando saiu\./.test(await avisos()), '"Tirar" tira a imagem meditando');
    await desfazerDoAviso();
    ok(/^data:image\/(webp|png)/.test(await guardada() || '') && await P.locator(`.quem.fig[data-pc="${PC}"]`).count() === 1, 'o Desfazer do aviso a traz de volta');
  });

  await passo('as receitas', async () => {
    await botao('[data-vista="receitas"]');
    ok(await P.locator('#receitas').isVisible() && await P.locator('#work').isHidden() && /Escolha uma receita para editar/.test(await P.locator('.rec-ed').innerText()), 'a vista "Receitas e símbolos"');
    await botao('[data-k="rc:nova"]');
    let rec = await doc('medit:receitas');
    r1 = rec.lista[0].id;
    ok(rec.lista.length === 1 && rec.lista[0].nome === 'Receita nova' && await A(() => document.activeElement && document.activeElement.dataset.k === 'rc:nome'), 'uma receita nova, com o cursor no nome');
    await escrever('rc:nome', 'Chama do Primeiro Sol');
    ok(/Com menos de 2 símbolos, ninguém a descobre/.test(await P.locator(`[data-rc="${r1}"]`).innerText()), 'o aviso: com menos de 2 símbolos, ninguém a descobre');
    const pilar = async (grupo, s) => { await botao(`[data-k="grupos-rc"] [data-grupo="${grupo}"]`); await botao(`[data-rsimb="${s}"]`); };
    await pilar('as', 'sol'); await pilar('el', 'fogo'); await pilar('an', 'dragao');
    rec = await doc('medit:receitas');
    ok(JSON.stringify(rec.lista[0].seq) === '["sol","fogo","dragao"]' && !/menos de 2/.test(await P.locator(`[data-rc="${r1}"]`).innerText()) && /Sol → Fogo → Dragão/.test(await P.locator(`[data-rc="${r1}"]`).innerText()),
      'os pilares, na ordem: Sol → Fogo → Dragão (o aviso some)');
    await botao('[data-k="rp:1"]'); await pilar('el', 'agua');
    ok(JSON.stringify((await doc('medit:receitas')).lista[0].seq) === '["sol","agua","dragao"]', 'escolher o pilar 2 e outro símbolo: troca só ele');
    await botao('[data-k="rp:1"]'); await botao('[data-k="rp:tirar"]');
    ok(JSON.stringify((await doc('medit:receitas')).lista[0].seq) === '["sol","dragao"]', '"Tirar este pilar"');
    await P.keyboard.press('Control+z'); await espera(250); await P.keyboard.press('Control+z'); await espera(250);
    ok(JSON.stringify((await doc('medit:receitas')).lista[0].seq) === '["sol","fogo","dragao"]', 'Ctrl+Z duas vezes: Sol → Fogo → Dragão de novo');
    await escrever('rc:efeito', 'O calor do primeiro sol percorre o corpo.\nPor um dia, o frio não te alcança.');
    ok((await doc('medit:receitas')).lista[0].efeito === 'O calor do primeiro sol percorre o corpo.\nPor um dia, o frio não te alcança.', 'o efeito (com a quebra de linha)');
    // a segunda: só na floresta
    await botao('[data-k="rc:nova"]');
    r2 = (await doc('medit:receitas')).lista[1].id;
    await escrever('rc:nome', 'Raiz Antiga');
    await pilar('el', 'terra'); await pilar('ru', 'g1');
    await P.locator('[data-k="rc:onde-um"]').check(); await espera(250);
    ok((await doc('medit:receitas')).lista[1].onde === 'templo' && !(await campo('rc:onde').isDisabled()), '"Só em": começa no ambiente da cena (o templo)');
    await campo('rc:onde').selectOption('floresta'); await espera(250);
    rec = await doc('medit:receitas');
    ok(rec.lista[1].onde === 'floresta' && JSON.stringify(rec.lista[1].seq) === '["terra","g1"]' && /só em Floresta/.test(await P.locator(`[data-rc="${r2}"]`).innerText()), 'a Raiz Antiga: Terra → Glifo I, só na floresta');
    // uma terceira, igual à primeira: o aviso; apagar (com a pergunta) e desfazer
    await botao('[data-k="rc:nova"]');
    const r3 = (await doc('medit:receitas')).lista[2].id;
    await escrever('rc:nome', 'Cópia');
    await pilar('as', 'sol'); await pilar('el', 'fogo'); await pilar('an', 'dragao');
    ok(/A mesma sequência de "Chama do Primeiro Sol", que vem antes na lista e também vale/.test(await P.locator(`[data-rc="${r3}"]`).innerText()), 'a mesma sequência de outra receita (que vem antes): o aviso de que esta nunca seria achada');
    await botao('[data-k="rc:apagar"]');
    ok(/Apagar a receita\?/.test(await P.locator('#dlg').innerText()) && /Quem já a descobriu continua com ela/.test(await P.locator('#dlg').innerText()), 'apagar pergunta antes');
    await botao('[data-k="dl:sim"]');
    ok((await doc('medit:receitas')).lista.length === 2 && /Receita apagada\./.test(await avisos()), 'apagada');
    await desfazerDoAviso();
    ok((await doc('medit:receitas')).lista.length === 3, 'o Desfazer do aviso a traz de volta');
    await P.click(`[data-k="rc:${r3}"]`); await espera(200); await botao('[data-k="rc:apagar"]'); await botao('[data-k="dl:sim"]');
    ok((await doc('medit:receitas')).lista.length === 2, '(e apagada de novo)');
    await foto('medit-3-receitas');
  });

  await passo('os símbolos', async () => {
    await botao('[data-k="grupos-simb"] [data-grupo="ru"]');
    await botao('[data-k="oc:g1"]');
    ok(JSON.stringify((await doc('medit:simbolos')).ocultos) === '["g1"]' && /Usa um símbolo escondido dos jogadores/.test(await P.locator(`[data-rc="${r2}"]`).innerText()) && await campo('oc:g1').innerText() === 'Mostrar',
      'esconder um pronto (o Glifo I): a receita que o usa avisa que ninguém a descobre assim');
    await botao('[data-k="oc:g1"]');
    ok((await doc('medit:simbolos')).ocultos.length === 0 && !/escondido/.test(await P.locator(`[data-rc="${r2}"]`).innerText()), 'e mostrar de novo');
    await botao('[data-k="simb:novo"]');
    await P.locator('[data-k="ns:nome"]').fill('Chave de prata'); await botao('[data-des="coroa"]'); await botao('[data-k="ns:criar"]');
    let s = await doc('medit:simbolos');
    ok(s.meus.length === 1 && s.meus[0].nome === 'Chave de prata' && s.meus[0].des === 'coroa' && await P.locator('[data-k="grupos-simb"] [data-grupo="meus"]').getAttribute('aria-pressed') === 'true'
      && /Símbolo criado: Chave de prata/.test(await avisos()), 'criar um símbolo: nome e desenho (vai para "Do mestre")');
    await botao('[data-k="simb:novo"]');
    await P.locator('[data-k="ns:nome"]').fill('Olho de vidro');
    await comArquivo('[data-k="ns:img"]');
    s = await doc('medit:simbolos');
    ok(s.meus.length === 2 && s.meus[1].nome === 'Olho de vidro' && /^data:image/.test(s.meus[1].img || '') && s.meus[1].des === null && await P.locator('#dlg[open]').count() === 0, 'ou com uma imagem');
    const s1 = s.meus[0].id, s2 = s.meus[1].id;
    await botao(`[data-msimb="${s1}"] button[title="Renomear"]`);
    await P.locator('[data-k="rs:nome"]').fill('Chave de ouro'); await botao('[data-k="rs:salvar"]');
    ok((await doc('medit:simbolos')).meus[0].nome === 'Chave de ouro', 'renomear');
    await botao(`[data-msimb="${s2}"] button[title="Apagar"]`);
    ok(/sai da lista/.test(await P.locator('#dlg').innerText()), 'apagar pergunta antes');
    await botao('[data-k="dl:sim"]');
    ok((await doc('medit:simbolos')).meus.length === 1, 'apagado');
    await desfazerDoAviso();
    ok((await doc('medit:simbolos')).meus.length === 2, 'o Desfazer do aviso o traz de volta');
  });

  await passo('os pilares', async () => {
    await botao('[data-vista="cena"]');
    const poe = async (grupo, s) => { await botao(`[data-k="grupos"] [data-grupo="${grupo}"]`); await botao(`[data-simb="${s}"]`); };
    ok(await P.locator('[data-k="grupos"] [data-grupo="meus"]').count() === 1, 'nos pilares, os símbolos do mestre também aparecem ("Do mestre")');
    await poe('as', 'sol'); await poe('el', 'fogo'); await poe('an', 'corvo');
    ok(JSON.stringify(await A(() => __medit.seq)) === '["sol","fogo","corvo"]' && /Meditar sobre os pilares/.test(await campo('tentar').innerText()) && !(await campo('tentar').isDisabled()), 'três símbolos nos pilares');
    await botao('[data-k="pilar:2"]');
    ok(JSON.stringify(await A(() => __medit.seq)) === '["sol","fogo"]', 'clicar num pilar tira o símbolo dele');
    await poe('an', 'corvo');
    await botao('[data-k="tentar"]');
    let a = await doc('medit:achados:' + PC);
    ok(/Nada aconteceu\./.test(await campo('res').innerText()) && a.feitas === 1 && a.lib === 1 && a.reg[0].tipo === 'tentou' && a.reg[0].res === null, 'errar: "Nada aconteceu." (a tentativa foi usada)');
    ok(/Sem tentativa agora/.test(await campo('tent').innerText()) && await campo('tentar').isDisabled() && /Sol → Fogo → Corvo · nada aconteceu/.test(await P.locator('.reg').first().innerText())
      && /Última tentativa: Sol → Fogo → Corvo · nada aconteceu/.test(await P.locator(`[data-quem="${PC}"]`).innerText()), 'no registro e no cartão do mestre');
    await botao(`[data-k="lib:${PC}"]`);
    await poe('el', 'terra'); await poe('ru', 'g1'); await botao('[data-k="tentar"]');
    ok(/Nada aconteceu\./.test(await campo('res').innerText()), 'a Raiz Antiga, no templo: nada (ela vale só na floresta)');
    await botao('#btDesfazer');
    ok(/Personagem de teste já usou a tentativa: ela não volta\./.test(await avisos()) && (await doc('medit:achados:' + PC)).lib === (await doc('medit:achados:' + PC)).feitas, 'desfazer a tentativa liberada que já foi usada: ela não volta (e o aviso diz)');
    await campo('c:amb').selectOption('floresta'); await espera(250);
    await botao(`[data-k="lib:${PC}"]`);
    await poe('el', 'terra'); await poe('ru', 'g1'); await botao('[data-k="tentar"]');
    ok(/Você descobriu: Raiz Antiga/.test(await campo('res').innerText()), 'na floresta: "Você descobriu: Raiz Antiga"');
    await botao(`[data-k="lib:${PC}"]`);
    await poe('as', 'sol'); await poe('el', 'fogo'); await poe('an', 'dragao'); await botao('[data-k="tentar"]');
    const res = await campo('res').innerText();
    ok(/Você descobriu: Chama do Primeiro Sol/.test(res) && /O calor do primeiro sol percorre o corpo\.\nPor um dia, o frio não te alcança\./.test(res), 'acertar: "Você descobriu", com o efeito');
    a = await doc('medit:achados:' + PC);
    ok(a.achadas.length === 2 && a.achadas[1].id === r1 && a.achadas[1].amb === 'floresta' && await P.locator('[data-achada]').count() === 2 && /Descoberta em .*, Floresta/.test(await P.locator(`[data-achada="${r1}"]`).innerText()),
      'a receita entra em "Receitas descobertas" (com onde foi)');
    await botao(`[data-k="lib:${PC}"]`);
    await poe('as', 'sol'); await poe('el', 'fogo'); await poe('an', 'dragao'); await botao('[data-k="tentar"]');
    ok(/Você já conhecia: Chama do Primeiro Sol/.test(await campo('res').innerText()) && (await doc('medit:achados:' + PC)).achadas.length === 2, 'de novo: "Você já conhecia"');
    await botao(`[data-achada="${r2}"] button[aria-label^="Tirar"]`);
    ok((await doc('medit:achados:' + PC)).achadas.length === 1 && /"Raiz Antiga" saiu da lista de Personagem de teste/.test(await avisos()), 'o mestre tira uma receita da lista');
    await desfazerDoAviso();
    ok((await doc('medit:achados:' + PC)).achadas.length === 2, 'e desfaz');
    await botao('[data-vista="receitas"]');
    ok(/Descoberta por Personagem de teste/.test(await P.locator(`[data-rc="${r1}"]`).innerText()), 'na lista de receitas: quem já descobriu');
    await botao('[data-vista="cena"]');
    await foto('medit-4-pilares');
  });

  await passo('o treinamento', async () => {
    await campo('tb:nome').fill('Controle do chi'); await campo('tb:max').fill('3');
    await botao('[data-hora="manha"]');
    ok(await campo('tb:nome').inputValue() === 'Controle do chi' && await campo('tb:max').inputValue() === '3', 'o rascunho da barra nova não some quando a página se pinta de novo');
    await botao('[data-k="tb:nova"]');
    const b = (await doc('medit:treino')).pcs[PC][0];
    ok(b.nome === 'Controle do chi' && b.max === 3 && b.n === 0 && await campo('tb:nome').inputValue() === '' && await campo('tb:max').inputValue() === '10', 'criar a barra (os campos esvaziam)');
    for (let i = 0; i < 3; i++) await botao(`[data-k="tb:${b.id}:mais"]`);
    let x = (await doc('medit:treino')).pcs[PC][0];
    ok(x.n === 3 && !!x.cheia && /Completa/.test(await P.locator(`[data-barra="${b.id}"]`).innerText()) && await campo(`tb:${b.id}:mais`).isDisabled() && /A recompensa é com você/.test(await P.locator(`[data-barra="${b.id}"]`).innerText()),
      'somar até encher: "Completa" (e quando encheu)');
    await botao(`[data-k="tb:${b.id}:menos"]`);
    x = (await doc('medit:treino')).pcs[PC][0];
    ok(x.n === 2 && x.cheia === null, 'tirar um ponto');
    await botao(`[data-k="tb:${b.id}:x"]`);
    ok(!(await doc('medit:treino')).pcs[PC] && /A barra Controle do chi saiu\./.test(await avisos()), 'tirar a barra');
    await desfazerDoAviso();
    ok((await doc('medit:treino')).pcs[PC][0].n === 2, 'o Desfazer do aviso a traz de volta');
  });

  await passo('limpar o registro (lote 7)', async () => {
    const antes = await doc('medit:achados:' + PC), n = antes.reg.length;
    ok(n >= 4 && await P.locator('.reg').count() >= 4 && await campo('reg:limpar').isVisible(), 'o registro tem as meditações e as tentativas, e quem mestra vê "Limpar o registro" (' + n + ' linhas)');
    await botao('[data-k="reg:limpar"]');
    ok(await P.locator('#dlg[open]').isVisible() && /Limpar o registro de Personagem de teste\?/.test(await P.locator('#dlg').innerText()) && new RegExp('As ' + n + ' linhas do registro saem').test(await P.locator('#dlg').innerText()),
      'a pergunta antes, dizendo quantas linhas saem');
    await botao('#dlg [data-k="dl:nao"]');
    ok((await doc('medit:achados:' + PC)).reg.length === n, '"Cancelar" não mexe em nada');
    await botao('[data-k="reg:limpar"]'); await botao('#dlg [data-k="dl:sim"]');
    const depois = await doc('medit:achados:' + PC);
    ok(depois.reg.length === 0 && depois.achadas.length === antes.achadas.length && depois.lib === antes.lib && depois.feitas === antes.feitas && /Nenhuma meditação ainda/.test(await P.locator('#painel').innerText())
      && await campo('reg:limpar').count() === 0 && await rotulo() === 'limpar o registro de Personagem de teste' && /O registro de Personagem de teste foi limpo\./.test(await avisos()),
      'limpo: o registro esvazia; as receitas descobertas e as tentativas (liberadas e feitas) ficam como estavam');
    await desfazerDoAviso();
    ok((await doc('medit:achados:' + PC)).reg.length === n && await P.locator('.reg').count() === Math.min(n, 40), 'o Desfazer do aviso traz o registro de volta');
  });

  await passo('depois de recarregar', async () => {
    await P.reload({ waitUntil: 'load' });
    await P.waitForFunction(() => window.__medit && __medit.pronto, null, { timeout: 15000 }); await espera(300);
    ok((await doc('medit:cena')).amb === 'floresta' && JSON.stringify((await doc('medit:quem')).quem) === '["pc_teste"]' && (await doc('medit:receitas')).lista.length === 2 && (await doc('medit:achados:' + PC)).achadas.length === 2
      && (await doc('medit:treino')).pcs[PC].length === 1 && await campo('p:panteao').inputValue() === 'Os Deuses da Lua' && await P.locator('#btDesfazer').isDisabled(),
      'recarregando, tudo continua (neste navegador); o desfazer começa de novo');
  });

  await passo('tela estreita', async () => {
    await P.setViewportSize({ width: 420, height: 860 }); await espera(400);
    const cabe = await A(() => document.documentElement.scrollWidth <= innerWidth + 1 && getComputedStyle(document.getElementById('work')).flexDirection === 'column');
    const alto = await A(() => document.getElementById('palco').getBoundingClientRect().height);
    ok(cabe && alto >= 290 && await P.locator('#painel').isVisible(), 'na tela estreita: a cena em cima, o painel embaixo, sem rolar para os lados (cena com ' + Math.round(alto) + 'px)');
    await foto('medit-5-420');
  });

  const inesperados = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 8).join('\n'));
  ok(inesperados.length === 0, 'sem erros no console');
  await t.close();
  end();
})();
