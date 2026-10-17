// Bateria do lote 7 (parte 4a), no navegador, sem o site:
//   · as famílias de cenas: arrastar uma cena para cima de outra, a lista "Onde fica", sem voltas e até seis níveis;
//     no menu, a mãe abre e fecha a família (lembrado neste aparelho), com a marca de quando a cena aberta está dentro;
//     a família na pasta da mãe; duplicar fica na mesma mãe; apagar a mãe passa as filhas para a mãe dela; recarregar;
//   · as passagens: os marcadores Entrada e Saída (ocultos dos jogadores), "Leva para outra cena" no painel, os dois
//     cliques e o menu, "Ir para esta cena" (e Voltar), "Uma cena nova, dentro desta…" (com a saída de volta), a cena
//     ligada que foi apagada, o Desfazer, e nada disso na prévia "como jogador";
//   · a janela "Gerar um lugar": o estilo muda a prévia, a hora tinge sem sortear de novo, travar clicando (e pelo
//     teclado), "Gerar outro" mantém o travado, "Soltar tudo", a semente (o Enter dela não cria a cena), os modelos
//     (guardar, abrir, Desfazer, apagar) e a cena que sai (de noite, com chuva, oriental: luzes, janelas, lanternas);
//   · as regras do plano em muitos sorteios, nos seis estilos, e com partes travadas.
const path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;

(async () => {
  const t = await open({ w: 1360, h: 900 });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const j = JSON.stringify;
  const toasts = () => ev(() => Array.from(document.querySelectorAll('.toast')).map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const clearToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const foto = async (nome, clip) => { if (SHOTS) { require('fs').mkdirSync(SHOTS, { recursive: true }); await page.screenshot(Object.assign({ path: path.join(SHOTS, nome + '.png') }, clip ? { clip } : {})); } };
  const menuTxt = async () => { await page.locator('#sceneBtn').click(); await w(200); const s = (await page.locator('.menu').innerText()).replace(/\n/g, ' | '); return s; };
  const fecharMenu = async () => { await page.keyboard.press('Escape'); await w(80); };
  const nomeDe = id => ev(id => (__tc.Store.S.scenes[id] || {}).name, id);
  const mae = () => ev(() => { const u = __tc, m = u.Store.S.pastas.mae || {}; return Object.keys(m).filter(k => u.Store.S.scenes[k]).map(k => u.Store.S.scenes[k].name + '→' + ((u.Store.S.scenes[m[k]] || {}).name || '?')).sort(); });

  // (SO=familias, passagens, gerador ou regras roda só aquela parte; as cenas de teste nascem sempre)
  const SO = (process.env.SO || '').split(',').filter(Boolean), parte = k => !SO.length || SO.includes(k);
  let lista = '', px = 0, py = 0;
  const ids = await ev(() => {
    const u = __tc, o = {};
    for (const nm of ['Cidade', 'Bairro', 'Casa', 'Taverna', 'Porto']) { const sc = u.newScene(nm); u.Store.addScene(sc); u.Persist.scene(sc.id); o[nm] = sc.id; }
    u.Persist.meta();
    return o;
  });
  // ================= as famílias de cenas =================
  if (parte('familias')) {
    ok(/CENAS \| .*Cidade \| Bairro \| Casa \| Taverna \| Porto/.test(await menuTxt()) && await page.locator('.menu-fam').count() === 0, 'sem famílias, a lista é como sempre');
    await page.locator('.menu-i', { hasText: 'Organizar as cenas' }).click(); await w(300);
    ok(await page.locator('.modal-t').innerText() === 'Organizar as cenas', 'a janela "Organizar as cenas" (era "Organizar em pastas")');
    await page.locator('#org-c-' + ids.Bairro).dragTo(page.locator('#org-c-' + ids.Cidade)); await w(300);
    ok(j(await mae()) === j(['Bairro→Cidade']) && /"Bairro" agora fica dentro de "Cidade"\./.test(await toasts()), 'arrastar o Bairro para cima da Cidade: ele fica dentro dela (com o aviso): ' + j(await mae()));
    ok(await page.locator('#org-c-' + ids.Bairro + '.filha').count() === 1 && await page.locator('#org-s-' + ids.Bairro).inputValue() === 'm:' + ids.Cidade, 'na janela, o Bairro vem para dentro, embaixo da Cidade, e a lista ao lado diz onde ele fica');
    await page.locator('#org-s-' + ids.Casa).selectOption('m:' + ids.Bairro); await w(300);
    ok(j(await mae()) === j(['Bairro→Cidade', 'Casa→Bairro']), 'pela lista "Onde fica": a Casa dentro do Bairro');
    const opsCidade = await page.locator('#org-s-' + ids.Cidade + ' option').allTextContents();
    ok(!opsCidade.some(x => /Bairro|Casa|Cidade/.test(x)) && opsCidade.includes('Sem pasta') && opsCidade.some(x => /Taverna/.test(x)), 'a lista da Cidade não oferece ela mesma nem as cenas que estão dentro dela (sem voltas): ' + j(opsCidade));
    await page.locator('#org-c-' + ids.Cidade).dragTo(page.locator('#org-c-' + ids.Casa)); await w(300);
    ok(j(await mae()) === j(['Bairro→Cidade', 'Casa→Bairro']), 'arrastar a Cidade para cima da Casa (que está dentro dela) não faz nada');
    // a família inteira numa pasta: arrastar a Cidade para a pasta nova
    await page.locator('#org-nova').click(); await w(200);
    await page.locator('#dlg-in').fill('Mundo'); await page.locator('.modal .btn.primary').click(); await w(300);
    const pa = await ev(() => __tc.Store.S.pastas.lista[0].id);
    await page.locator('#org-s-' + ids.Cidade).selectOption('p:' + pa); await w(300);
    ok(/"Cidade" e as 2 cenas que estão dentro dela foram para a pasta Mundo\./.test(await toasts()) && await page.locator('#org-p-' + pa + ' .org-c').count() === 3, 'a Cidade vai para a pasta Mundo, e a família vai junto (com a mãe no topo): ' + await toasts());
    await foto('01-organizar-familias');
    await page.locator('.modal .btn.primary', { hasText: 'Pronto' }).click(); await w(200);
    lista = await menuTxt();
    ok(/CENAS \| .*Taverna \| Porto \| Mundo \| 3 \| Cidade \| 2 \| Bairro \| 1 \| Casa/.test(lista), 'no menu: a pasta conta a família inteira; a Cidade com o botão que abre e fecha (2 cenas dentro), o Bairro (1) e a Casa: ' + lista);
    ok(await page.locator('#mc-' + ids.Bairro + '.filha').count() === 1 && await page.locator('#mc-' + ids.Casa).evaluate(e => getComputedStyle(e).getPropertyValue('--nv').trim()) === '2', 'as filhas vêm para dentro, um passo por nível');
    await foto('02-menu-familias');
    await page.locator('#mf-' + ids.Cidade).click(); await w(200);
    lista = (await page.locator('.menu').innerText()).replace(/\n/g, ' | ');
    ok(await page.locator('.menu').count() === 1 && !/Bairro/.test(lista) && (await page.locator('#mf-' + ids.Cidade).getAttribute('aria-expanded')) === 'false', 'um clique no botão da Cidade fecha a família (o menu continua aberto): ' + lista);
    await fecharMenu();
    ok(!/Bairro/.test(await menuTxt()) && (await ev(() => localStorage.getItem('tinycats:cenas:familias-fechadas') || '')).includes(ids.Cidade), 'fechada, fica fechada (lembrado neste aparelho)');
    await fecharMenu();
    await ev(id => __tc.UI.switchScene(id), ids.Casa); await w(200);
    await page.locator('#sceneBtn').click(); await w(200);
    ok(/aqui/.test(await page.locator('#mf-' + ids.Cidade).getAttribute('class')) && /a cena aberta está aqui dentro/.test(await page.locator('#mf-' + ids.Cidade).getAttribute('title')), 'com a Casa aberta e a família fechada, o botão da Cidade avisa que a cena aberta está lá dentro');
    await page.locator('#mf-' + ids.Cidade).click(); await w(200);
    ok(await page.locator('#mc-' + ids.Casa + ' .menu-ck svg').count() === 1, 'aberta de novo, a Casa aparece marcada');
    await page.locator('.menu-i', { hasText: 'Taverna' }).click(); await w(300);
    ok(await ev(() => __tc.Store.scene().name) === 'Taverna', 'o clique no nome abre a cena (e fecha o menu)');
    // tirar da família (pela lista, para uma pasta) e o Desfazer
    await page.locator('#sceneBtn').click(); await w(200); await page.locator('.menu-i', { hasText: 'Organizar as cenas' }).click(); await w(300);
    await clearToasts();
    await page.locator('#org-s-' + ids.Casa).selectOption('p:'); await w(300);
    ok(j(await mae()) === j(['Bairro→Cidade']) && /"Casa" saiu de dentro de "Bairro" e ficou sem pasta\./.test(await toasts()), 'a Casa sai de dentro do Bairro e fica sem pasta: ' + await toasts());
    await page.locator('.toast-a', { hasText: 'Desfazer' }).last().click(); await w(300);
    ok(j(await mae()) === j(['Bairro→Cidade', 'Casa→Bairro']), 'Desfazer põe a Casa de volta no Bairro');
    // até seis níveis
    const cadeia = await ev(() => { const u = __tc, out = []; for (let i = 1; i <= 4; i++) { const sc = u.newScene('Nível ' + i); u.Store.addScene(sc); u.Persist.scene(sc.id); out.push(sc.id); } return out; });
    await page.keyboard.press('Escape'); await w(150);
    await ev(([ids, c]) => { let m = ids.Casa; for (const x of c.slice(0, 3)) { __tc.UI.colocarCena(x, 'm:' + m); m = x; } }, [ids, cadeia]); await w(200);
    await clearToasts();
    await ev(([c4, c3]) => __tc.UI.colocarCena(c4, 'm:' + c3), [cadeia[3], cadeia[2]]); await w(200);
    ok(/Uma família vai até 6 níveis: "Nível 4" não cabe dentro de "Nível 3"\./.test(await toasts()) && !(await mae()).includes('Nível 4→Nível 3'), 'uma família vai até seis níveis: a sétima geração não entra (o aviso diz)');
    // duplicar: a cópia fica na mesma mãe; apagar a mãe: as filhas passam para a mãe dela
    await ev(id => __tc.UI.switchScene(id), ids.Casa); await w(200);
    await page.locator('#sceneBtn').click(); await w(200); await page.locator('.menu-i', { hasText: 'Duplicar esta cena' }).click(); await w(300);
    ok((await mae()).includes('Casa (cópia)→Bairro'), 'a cópia da Casa fica dentro do Bairro, como a Casa (as filhas não são copiadas)');
    await ev(id => __tc.UI.switchScene(id), ids.Bairro); await w(200);
    await page.locator('#sceneBtn').click(); await w(200); await page.locator('.menu-i', { hasText: 'Apagar esta cena' }).click(); await w(300);
    ok(/As 2 cenas que estão dentro dela não são apagadas: passam para dentro de "Cidade"\./.test(await page.locator('.modal').innerText()), 'apagar o Bairro: a janela avisa que as duas cenas de dentro passam para a Cidade');
    await page.locator('.modal .btn.danger').click(); await w(400);
    ok(j(await mae()) === j(['Casa (cópia)→Cidade', 'Casa→Cidade', 'Nível 1→Casa', 'Nível 2→Nível 1', 'Nível 3→Nível 2']), 'apagado o Bairro, a Casa e a cópia ficam dentro da Cidade: ' + j(await mae()));
    await ev(id => __tc.UI.switchScene(id), ids.Cidade); await w(200);
    await page.locator('#sceneBtn').click(); await w(200); await page.locator('.menu-i', { hasText: 'Apagar esta cena' }).click(); await w(300);
    await page.locator('.modal .btn.danger').click(); await w(400);
    ok(await ev(([casa, pa]) => !__tc.Store.S.pastas.mae[casa] && __tc.Store.S.pastas.de[casa] === pa, [ids.Casa, pa]), 'apagada a Cidade (a mãe de todas), a Casa fica solta, na pasta da Cidade');
    await ev(() => __tc.Persist.flush()); await w(600);
    await page.reload({ waitUntil: 'load' }); await w(1200);
    ok(j(await mae()) === j(['Nível 1→Casa', 'Nível 2→Nível 1', 'Nível 3→Nível 2']), 'recarregando a página, as famílias continuam (guardadas neste navegador): ' + j(await mae()));

  }
  // ================= as passagens =================
  if (parte('passagens')) {
    ok(await ev(() => { const P = __tc.Props.P; return P.entrada.g === 'perigo' && P.saida.g === 'perigo' && !!P.entrada.passagem && P.lanterna.g === 'luz' && !!P.lanterna.luz && ['almofada', 'tapete', 'jarro', 'bigorna'].every(k => P[k].g === 'movel') && P.flores.g === 'natureza' && P.runa.g === 'perigo' && P.tapete.size === 2; }),
      'os objetos novos: Entrada e Saída (em Perigos e marcos), a lanterna de papel (uma luz), almofada, tapete, jarro, bigorna, flores e pedra rúnica');
    await ev(id => __tc.UI.switchScene(id), ids.Taverna); await w(200);
    await ev(() => { const u = __tc; u.App.opt.objCat = 'perigo'; u.App.opt.obj = 'entrada'; u.App.opt.objHidden = false; u.Tools.set('obj'); }); await w(200);
    const tela = async (cx, cy) => { const box = await page.locator('#cv').boundingBox(), p = await ev(([x, y]) => __tc.Render.toScreen(x * 64, y * 64), [cx, cy]); return [box.x + p[0], box.y + p[1]]; };
    [px, py] = await tela(6.5, 6.5); await page.mouse.click(px, py); await w(250);
    const ent = await ev(() => { const ts = __tc.Store.scene().tokens; return ts[ts.length - 1]; });
    ok(ent.prop === 'entrada' && ent.hidden === true, 'a Entrada solta pela ferramenta de objetos nasce oculta dos jogadores (mesmo com "oculto" desligado nas opções)');
    await ev(() => __tc.Tools.set('select')); await w(100);
    await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, ent.id); await w(300);
    ok(await page.locator('#s-propcena').count() === 1 && await page.locator('#pr-cena').inputValue() === '' && await page.locator('#pr-ir').isDisabled(), 'o painel do objeto tem "Leva para outra cena" (aberto no marcador), sem cena ainda');
    await page.locator('#pr-cena').selectOption(ids.Porto); await w(250);
    ok(await ev(id => __tc.Store.get('tokens', id).cena, ent.id) === ids.Porto && !(await page.locator('#pr-ir').isDisabled()), 'escolher o Porto liga o marcador a ele');
    await foto('03-painel-passagem');
    [px, py] = await tela(ent.x / 64 + 0.5, ent.y / 64 + 0.5);
    await page.mouse.dblclick(px, py); await w(300);
    lista = (await page.locator('.menu').innerText()).replace(/\n/g, ' | ');
    ok(/LEVA PARA PORTO \| Ir para esta cena \| Levar a outra cena…/i.test(lista), 'dois cliques no marcador: o menu da passagem — ' + lista);
    await foto('04-menu-passagem');
    await page.locator('.menu-i', { hasText: 'Ir para esta cena' }).click(); await w(300);
    ok(await ev(() => __tc.Store.scene().name) === 'Porto' && /Você está em "Porto"\./.test(await toasts()), '"Ir para esta cena": o mestre vai para o Porto (o aviso tem Voltar)');
    await page.locator('.toast-a', { hasText: 'Voltar' }).last().click(); await w(300);
    ok(await ev(() => __tc.Store.scene().name) === 'Taverna', 'Voltar: de volta à Taverna');
    await page.keyboard.press('Control+z'); await w(250);
    ok(!(await ev(id => __tc.Store.get('tokens', id).cena, ent.id)), 'Ctrl+Z desfaz a ligação');
    await page.mouse.dblclick(px, py); await w(300);
    lista = (await page.locator('.menu').innerText()).replace(/\n/g, ' | ');
    ok(/AINDA NÃO LEVA A NENHUMA CENA \| Gerar o interior… \| Escolher a cena… \| Uma cena nova, dentro desta…/i.test(lista), 'sem cena, o menu oferece gerar o interior (parte 4a-2), escolher uma cena ou criar uma nova dentro desta: ' + lista);
    await clearToasts();
    await page.locator('.menu-i', { hasText: 'Uma cena nova, dentro desta' }).click(); await w(300);
    ok(await page.locator('#dlg-in').inputValue() === 'Taverna · dentro', 'a janela sugere o nome "Taverna · dentro"');
    await page.locator('#dlg-in').fill('Porão'); await page.locator('.modal .btn.primary').click(); await w(400);
    const porao = await ev(id => __tc.Store.get('tokens', id).cena, ent.id);
    const pv = await ev(([p, tav]) => { const u = __tc, sc = u.Store.S.scenes[p]; return sc && { nome: sc.name, mae: u.Store.S.pastas.mae[p] === tav, saidas: sc.tokens.filter(t => t.prop === 'saida').map(t => [t.cena === tav, t.hidden]) }; }, [porao, ids.Taverna]);
    ok(pv && pv.nome === 'Porão' && pv.mae && j(pv.saidas) === j([[true, true]]) && /Cena "Porão" criada dentro de "Taverna", com a saída de volta\./.test(await toasts()), 'a cena nova nasce dentro da Taverna (na família), com a Saída de volta (oculta) e o marcador já ligado a ela: ' + j(pv));
    await page.locator('.toast-a', { hasText: 'Ir para lá' }).last().click(); await w(300);
    const sai = await ev(() => __tc.Store.scene().tokens.find(t => t.prop === 'saida'));
    [px, py] = await tela(sai.x / 64 + 0.5, sai.y / 64 + 0.5);
    await page.mouse.dblclick(px, py); await w(300);
    ok(/LEVA PARA TAVERNA/i.test(await page.locator('.menu').innerText()), 'no Porão, dois cliques na Saída levam de volta à Taverna');
    await page.locator('.menu-i', { hasText: 'Ir para esta cena' }).click(); await w(300);
    ok(await ev(() => __tc.Store.scene().name) === 'Taverna', '(de volta)');
    // a cena ligada apagada
    await ev(p => { __tc.Store.removeScene(p); }, porao); await w(200);
    [px, py] = await tela(ent.x / 64 + 0.5, ent.y / 64 + 0.5);
    await page.mouse.dblclick(px, py); await w(300);
    ok(/A CENA LIGADA FOI APAGADA/i.test(await page.locator('.menu').innerText()), 'se a cena ligada foi apagada, o menu diz');
    await fecharMenu();
    // na prévia como jogador: o marcador não aparece e os dois cliques não fazem nada
    const jog = await ev(() => { const u = __tc; let p = u.Store.S.players[0]; if (!p) { p = { id: 'jg_t', name: 'Lia', color: '#4caf50' }; u.Store.S.players.push(p); } return p.id; });
    await ev(v => __tc.UI.setViewer(v), jog); await w(300);
    ok(await ev(id => !__tc.tokShown(__tc.Store.get('tokens', id)), ent.id), 'como jogador, o marcador não aparece');
    await page.mouse.dblclick(px, py); await w(300);
    ok(await page.locator('.menu').count() === 0, '… e os dois cliques não abrem menu nenhum');
    await ev(() => __tc.UI.setViewer('gm')); await w(200);

  }
  // ================= a janela "Gerar um lugar" =================
  if (parte('gerador')) {
    await page.locator('#sceneBtn').click(); await w(200);
    await page.locator('.menu-i', { hasText: 'Gerar um lugar' }).click(); await w(700);
    ok(await page.locator('.modal-t').innerText() === 'Gerar um lugar' && await page.locator('#ger-prev').count() === 1 && j(await page.locator('#ger-lugar button').allTextContents()) === j(['Vilarejo', 'Cidade', 'Tribo', 'Encontro', 'Porto']) && await page.locator('#ger-lugar .seg-b.on').innerText() === 'Vilarejo', 'a janela "Gerar um lugar" abre na aba Vilarejo (a Cidade, a Tribo, o Encontro e o Porto são as outras abas)');
    ok(/nada escrito: os nomes ficam com você/.test(await page.locator('.modal').innerText()), 'a nota diz que nada sai escrito');
    const G = () => ev(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().estado)));
    const assinatura = () => ev(() => {
      const c = document.getElementById('ger-prev'), k = document.createElement('canvas'); k.width = c.width; k.height = c.height;
      const g = k.getContext('2d', { willReadFrequently: true }); g.drawImage(c, 0, 0);
      const d = g.getImageData(0, 0, k.width, k.height).data; let s = 0; for (let i = 0; i < d.length; i += 300) s = (s * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) % 1000000007; return s;
    });
    // o estilo
    const porEstilo = {};
    for (const [id, nome] of [['comum', 'Comum'], ['oriental', 'Oriental'], ['nordico', 'Nórdico'], ['desertico', 'Desértico'], ['elfico', 'Élfico'], ['anao', 'Anão']]) {
      await page.locator('#ger-est button', { hasText: nome }).click(); await w(300);
      const e = await G();
      porEstilo[id] = { sig: await assinatura(), est: e.plano.estilo, nome: await page.locator('#ger-nome').inputValue() };
      if (SHOTS) { const b = await page.locator('#ger-prev').boundingBox(); await foto('05-estilo-' + id, { x: b.x, y: b.y, width: b.width, height: b.height }); }
    }
    ok(Object.keys(porEstilo).every(k => porEstilo[k].est === k) && new Set(Object.values(porEstilo).map(x => x.sig)).size === 6, 'cada estilo sorteia o lugar com o desenho dele (seis prévias diferentes)');
    ok(porEstilo.comum.nome === 'Aldeia' && porEstilo.oriental.nome === 'Aldeia oriental' && porEstilo.nordico.nome === 'Aldeia nórdica' && porEstilo.anao.nome === 'Aldeia anã', 'o nome da cena acompanha o estilo ("Aldeia nórdica", "Aldeia anã"), sem nome inventado');
    await page.locator('#ger-est button', { hasText: 'Comum' }).click(); await w(300);
    // a hora tinge a prévia, sem sortear de novo
    const e0 = await G(), s0 = await assinatura();
    await page.locator('#ger-hora button', { hasText: 'Noite' }).click(); await w(200);
    const e1 = await G();
    ok(e1.seed === e0.seed && j(e1.plano) === j(e0.plano) && await assinatura() !== s0, 'a hora do dia tinge a prévia sem sortear outro lugar');
    await page.locator('#ger-hora button', { hasText: 'Dia' }).click(); await w(200);
    await foto('06-janela-gerador');
    // travar clicando numa casa da prévia
    const naPrevia = (x, y) => ev(([x, y]) => { const c = document.getElementById('ger-prev'), r = c.getBoundingClientRect(), cell = __tc.Gerador.vivo().cell(), k = Math.min(r.width / c.width, r.height / c.height), ox = (r.width - c.width * k) / 2, oy = (r.height - c.height * k) / 2; return [r.left + ox + x * cell * k, r.top + oy + y * cell * k]; }, [x, y]);
    let g0 = await G();
    const k0 = g0.plano.casas[0];
    [px, py] = await naPrevia(k0.x + k0.w / 2, k0.y + k0.h / 2);
    await page.mouse.move(px, py); await w(120);
    ok(/^Clique para travar (a taverna|a casa|a capela|a ferraria|o armazém)\.$/.test(await page.locator('#ger-dica').innerText()), 'o mouse sobre uma casa: a dica diz que o clique trava — ' + await page.locator('#ger-dica').innerText());
    await page.mouse.click(px, py); await w(200);
    g0 = await G();
    ok(/^Clique para soltar /.test(await page.locator('#ger-dica').innerText()) && /Uma parte travada\./.test(await page.locator('#ger-resumo').innerText()) && !(await page.locator('#ger-soltar').isDisabled()) && g0.trava.casas.length === 1 && g0.plano.casas[0].trava === true, 'o clique trava a casa (a dica e o resumo dizem; "Soltar tudo" acende)');
    if (SHOTS) { const b = await page.locator('#ger-prev').boundingBox(); await foto('07-casa-travada', { x: b.x, y: b.y, width: b.width, height: b.height }); }
    await page.locator('#ger-outro').click(); await w(300);
    let g1 = await G();
    const mesma = g1.plano.casas.find(k => k.x === k0.x && k.y === k0.y && k.w === k0.w && k.h === k0.h);
    ok(g1.seed !== g0.seed && !!mesma && mesma.trava && j([mesma.porta, mesma.janelas, mesma.moveis, mesma.tipo]) === j([k0.porta, k0.janelas, k0.moveis, k0.tipo]), '"Gerar outro": outra semente, e a casa travada continua igual (porta, janelas e móveis)');
    // as ruas e a praça
    [px, py] = await naPrevia(g1.plano.praca.x, g1.plano.praca.y);
    await page.mouse.move(px, py); await w(100);
    ok(await page.locator('#ger-dica').innerText() === 'Clique para travar as ruas e a praça.', 'o mouse sobre a praça: "as ruas e a praça"');
    await page.mouse.click(px, py); await w(200);
    g1 = await G();
    await page.locator('#ger-outro').click(); await w(300);
    const g2 = await G();
    ok(j(g2.plano.ruaP) === j(g1.plano.ruaP) && j(g2.plano.praca) === j(g1.plano.praca) && /2 partes travadas\./.test(await page.locator('#ger-resumo').innerText()), 'travadas as ruas e a praça, "Gerar outro" sorteia de novo e elas ficam no mesmo lugar');
    // pelo teclado: as setas escolhem a parte, Enter solta
    await ev(() => document.getElementById('ger-prev').focus()); await w(80);
    await page.keyboard.press('ArrowRight'); await w(100);
    ok(await page.locator('#ger-dica').innerText() === 'Clique para soltar as ruas e a praça.', 'pelo teclado: a seta escolhe a primeira parte (as ruas e a praça, travadas)');
    await page.keyboard.press('Enter'); await w(150);
    ok(!(await G()).trava.ruas && await page.locator('.modal').count() === 1, 'Enter solta (e a janela continua aberta)');
    await page.locator('#ger-soltar').click(); await w(200);
    const g3 = await G();
    ok(!g3.trava && j(g3.plano.casas.map(k => [k.x, k.y])) === j(g2.plano.casas.map(k => [k.x, k.y])) && await page.locator('#ger-soltar').isDisabled() && !/travada/.test(await page.locator('#ger-resumo').innerText()), '"Soltar tudo": nada travado, e o lugar na tela não muda');
    // a semente: o mesmo número dá o mesmo lugar; o Enter dela não cria a cena
    const nCenas = await ev(() => __tc.Store.S.order.length);
    await page.locator('#ger-semente').fill('12345'); await page.locator('#ger-semente').press('Enter'); await w(300);
    const g4 = await G();
    const esperado = await ev(o => JSON.parse(JSON.stringify(__tc.Vila.gerar(o))), Object.assign({}, g4.op, { estilo: 'comum', seed: 12345 }));
    ok(g4.seed === 12345 && j(g4.plano) === j(esperado) && await page.locator('.modal').count() === 1 && await ev(() => __tc.Store.S.order.length) === nCenas, 'a semente 12345 dá sempre o mesmo lugar (a mesma conta, fora da janela); o Enter no campo não cria a cena');
    // os modelos
    const k5 = g4.plano.casas[1] || g4.plano.casas[0];
    [px, py] = await naPrevia(k5.x + k5.w / 2, k5.y + k5.h / 2); await page.mouse.click(px, py); await w(200);
    await page.locator('#ger-est button', { hasText: 'Oriental' }).click(); await w(300);
    const antesDoModelo = await G();
    await page.locator('#ger-guardar').click(); await w(200);
    await page.locator('#ger-modelo-nome').fill('Vila de teste'); await page.locator('#ger-modelo-nome').press('Escape'); await w(150);
    ok(await page.locator('.modal').count() === 1 && await page.locator('#ger-modelo-nome').count() === 0 && await page.locator('#ger-guardar').count() === 1, 'Esc no nome do modelo só cancela o modelo (a janela fica)');
    await page.locator('#ger-guardar').click(); await w(200);
    await page.locator('#ger-modelo-nome').fill('Vila de teste'); await page.locator('#ger-modelo-nome').press('Enter'); await w(300);
    const ms = await ev(() => JSON.parse(JSON.stringify(__tc.Store.S.prefs.modelos || [])));
    ok(ms.length === 1 && ms[0].nome === 'Vila de teste' && ms[0].lugar === 'vila' && ms[0].seed === 12345 && ms[0].o.estilo === 'oriental' && ms[0].trava.casas.length === 1 && await page.locator('.modal').count() === 1 && /Modelo "Vila de teste" guardado/.test(await toasts()), 'Guardar como modelo: as escolhas (com o estilo), a semente e a casa travada (e a janela continua aberta): ' + j(ms.map(m => [m.nome, m.seed])));
    await page.locator('#ger-est button', { hasText: 'Comum' }).click(); await w(200);
    await page.locator('#ger-outro').click(); await w(300);
    const antesDeAbrir = await G();
    await page.locator('#ger-modelo').selectOption({ label: 'Vila de teste · Vilarejo' }); await w(400);
    const g5 = await G();
    ok(g5.seed === 12345 && g5.plano.estilo === 'oriental' && j(g5.plano.casas) === j(antesDoModelo.plano.casas) && /Modelo "Vila de teste" aberto/.test(await toasts()), 'abrir o modelo devolve o mesmo lugar (a semente, o estilo e a casa travada)');
    await page.locator('.toast-a', { hasText: 'Desfazer' }).last().click(); await w(400);
    const g6 = await G();
    ok(g6.seed === antesDeAbrir.seed && g6.plano.estilo === 'comum', 'Desfazer volta ao lugar de antes de abrir o modelo');
    await page.locator('#ger-apagar').click(); await w(200);
    ok(/APAGAR QUAL MODELO\?/i.test(await page.locator('.menu').innerText()), 'a lixeira pergunta qual modelo apagar');
    await page.locator('.menu-i', { hasText: 'Vila de teste' }).click(); await w(300);
    ok(await ev(() => (__tc.Store.S.prefs.modelos || []).length) === 0 && /Modelo "Vila de teste" apagado\./.test(await toasts()), 'o modelo é apagado (com Desfazer)');
    await page.locator('.toast-a', { hasText: 'Desfazer' }).last().click(); await w(300);
    ok(await ev(() => (__tc.Store.S.prefs.modelos || []).length) === 1 && await page.locator('#ger-modelo option').count() === 2, 'Desfazer devolve o modelo');
    // a cena que sai: uma vila oriental, de noite, com chuva
    await page.locator('#ger-soltar').click(); await w(150);
    await page.locator('#vila-tam button', { hasText: 'Vila' }).click(); await w(300);
    await page.locator('#ger-est button', { hasText: 'Oriental' }).click(); await w(300);
    await page.locator('#ger-hora button', { hasText: 'Noite' }).click(); await w(100);
    await page.locator('#ger-clima button', { hasText: 'Chuva' }).click(); await w(100);
    const plano = (await G()).plano;
    ok(await page.locator('#ger-nome').inputValue() === 'Vila oriental', 'o nome da cena: "Vila oriental"');
    await page.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click(); await w(2500);
    const cena = await ev(() => { const s = __tc.Store.scene(); return { nome: s.name, tone: s.tone, light: s.light, clima: s.weather.k, luzes: s.lights.filter(l => l.name === 'Luz da casa').length, janelas: s.walls.filter(x => x.k === 'window').length, portas: s.walls.filter(x => x.k === 'door' && !x.open).length, textos: s.shapes.filter(x => x.k === 'text').length, lanternas: s.tokens.filter(x => x.prop === 'lanterna').length, props: s.tokens.filter(x => x.prop).map(x => x.prop),
      agua: s.shapes.filter(x => x.ter && x.ter.t === 'agua' && x.ter.h === -1.5).length, ponte: s.shapes.filter(x => x.ter && x.ter.t === 'plataforma' && x.ter.h === 1.5).length, bandeiras: s.shapes.filter(x => !x.ter && x.k === 'poly' && x.lock).length, cordoes: s.shapes.filter(x => !x.ter && x.k === 'free' && x.lock).length }; });
    const nj = plano.casas.reduce((s, k) => s + k.janelas.length, 0);
    ok(cena.nome === 'Vila oriental' && cena.tone === 'noite' && cena.light === 'penumbra' && cena.clima === 'chuva', 'a cena sai de noite (penumbra) e com chuva: ' + j([cena.tone, cena.light, cena.clima]));
    ok(cena.luzes === plano.casas.length && cena.janelas === nj && nj >= plano.casas.length && cena.portas === plano.casas.length && cena.textos === 0, 'cada casa com a porta, as janelas e uma luz por dentro (que escapa pelas janelas); nada escrito: ' + j({ luzes: cena.luzes, janelas: cena.janelas, casas: plano.casas.length }));
    ok(cena.lanternas >= 4 && cena.props.some(p => p === 'almofada' || p === 'lanterna'), 'no estilo oriental, as luzes da praça são lanternas de papel, e os móveis são do estilo (almofadas, mesas baixas)');
    ok(cena.agua === (plano.rio ? 1 : 0) && cena.ponte === (plano.ponte ? 1 : 0) && cena.cordoes === 2 && cena.bandeiras >= 8, '(lote 7, parte 4a-2) o relevo: o rio vira água com 1,5 m de fundura e a ponte de madeira fica 1,5 m acima dela; as bandeirinhas cruzam a praça (travadas) — ' + j({ agua: cena.agua, ponte: cena.ponte, cordoes: cena.cordoes, bandeiras: cena.bandeiras }));
    ok(/"Vila oriental" criada: \d+ casas, com paredes, portas, janelas e móveis\. Tudo é editável\./.test(await toasts()), 'o aviso diz o que saiu');
    await ev(() => __tc.Render.fit()); await w(400);
    await foto('08-vila-oriental-noite');
    // a casa redonda élfica: as paredes dos cantos cortados
    const elf = await ev(() => {
      const u = __tc, p = u.Vila.gerar({ tamanho: 'vila', terreno: 'floresta', estilo: 'elfico', rio: false, muralha: false, casas: 10, seed: 777 });
      return { oct: p.casas.filter(k => k.forma === 'oct').length, diag: p.casas.filter(k => k.forma === 'oct').every(k => u.Estilos.paredesDaCasa(k).filter(s => s.x1 !== s.x2 && s.y1 !== s.y2).length === 4) };
    });
    ok(elf.oct >= 1 && elf.diag, 'no estilo élfico, as casas redondas (cantos cortados) têm as quatro paredes diagonais: ' + j(elf));

  }
  // ================= as regras do plano, em muitos sorteios, nos seis estilos =================
  if (parte('regras')) {
    const regras = await ev(() => {
      const V = __tc.Vila, E = __tc.Estilos, erros = [], vistos = { casas: 0, moveis: 0, janelas: 0, oct: 0, centro: 0 };
      const distSeg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0; return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
      const dist = (pts, x, y) => { let d = Infinity; for (let i = 1; i < pts.length; i++) d = Math.min(d, distSeg(x, y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])); return d; };
      const conferir = (p, s) => {
        const T = V.TAMANHOS[p.tamanho], reg = p.muro ? [3, 3, p.W - 3, p.H - 3] : [1, 1, p.W - 1, p.H - 1], TP = E.tipos(p.estilo);
        if (/"nome"/.test(JSON.stringify(p))) erros.push(s + ': o plano tem nome');
        if (p.casas.length > T.casas[1] || p.casas.length < 1) erros.push(s + ': casas ' + p.casas.length);
        p.casas.forEach((k, i) => {
          vistos.casas++;
          if (!TP[k.tipo]) erros.push(s + ': tipo ' + k.tipo);
          if (k.x < reg[0] || k.y < reg[1] || k.x + k.w > reg[2] || k.y + k.h > reg[3]) erros.push(s + ': casa fora da área');
          for (const k2 of p.casas.slice(i + 1)) if (k.x < k2.x + k2.w + 1 && k2.x < k.x + k.w + 1 && k.y < k2.y + k2.h + 1 && k2.y < k.y + k.h + 1) erros.push(s + ': duas casas grudadas');
          for (let jj = k.y; jj < k.y + k.h; jj++) for (let ii = k.x; ii < k.x + k.w; ii++) {
            const cx = ii + 0.5, cy = jj + 0.5;
            if (p.ruas.some(r => dist(r.pts, cx, cy) <= r.hw + 0.25) || Math.hypot(cx - p.praca.x, cy - p.praca.y) <= p.praca.r + 0.3) erros.push(s + ': casa em cima da rua');
            if (p.rio && dist(p.rio.pts, cx, cy) <= p.rio.hw + 0.6) erros.push(s + ': casa dentro do rio');
          }
          const o = k.forma === 'oct' ? 1 : 0;
          if (o) { vistos.oct++; if (k.w < 5 || k.h < 5) erros.push(s + ': casa redonda pequena demais'); }
          // a porta e as janelas: um quadrado, num lado reto (fora dos cantos)
          const aberturaOk = (a, lado) => {
            const horiz = lado === 'n' || lado === 's', linha = { n: a.y1 === k.y && a.y2 === k.y, s: a.y1 === k.y + k.h && a.y2 === k.y + k.h, o: a.x1 === k.x && a.x2 === k.x, l: a.x1 === k.x + k.w && a.x2 === k.x + k.w }[lado];
            const larg = Math.abs(a.x2 - a.x1) + Math.abs(a.y2 - a.y1), reto = horiz ? a.x1 >= k.x + 1 && a.x2 <= k.x + k.w - 1 : a.y1 >= k.y + 1 && a.y2 <= k.y + k.h - 1;
            return linha && larg === 1 && reto;
          };
          if (!aberturaOk(k.porta, k.porta.lado)) erros.push(s + ': porta torta ' + JSON.stringify(k.porta));
          const lados = new Set();
          for (const jn of k.janelas) {
            vistos.janelas++;
            if (jn.lado === k.porta.lado || lados.has(jn.lado) || !aberturaOk(jn, jn.lado)) erros.push(s + ': janela torta ' + JSON.stringify(jn));
            lados.add(jn.lado);
          }
          const ocup = new Set(), cantos = o ? new Set([k.x + ',' + k.y, (k.x + k.w - 1) + ',' + k.y, k.x + ',' + (k.y + k.h - 1), (k.x + k.w - 1) + ',' + (k.y + k.h - 1)]) : new Set();
          for (const mv of k.moveis) {
            vistos.moveis++;
            if (!__tc.Props.P[mv.id]) erros.push(s + ': móvel desconhecido ' + mv.id);
            if (mv.x < k.x || mv.y < k.y || mv.x + mv.s > k.x + k.w || mv.y + mv.s > k.y + k.h) erros.push(s + ': móvel fora da casa');
            for (let b = 0; b < mv.s; b++) for (let a = 0; a < mv.s; a++) { const key = (mv.x + a) + ',' + (mv.y + b); if (ocup.has(key)) erros.push(s + ': um móvel em cima do outro'); if (cantos.has(key)) erros.push(s + ': móvel no canto cortado'); ocup.add(key); }
          }
          const pt = k.porta, di = pt.lado === 'l' ? -1 : pt.lado === 'o' ? 1 : 0, dj = pt.lado === 's' ? -1 : pt.lado === 'n' ? 1 : 0;
          const pi = pt.lado === 'l' ? k.x + k.w - 1 : pt.lado === 'o' ? k.x : pt.x1, pj = pt.lado === 's' ? k.y + k.h - 1 : pt.lado === 'n' ? k.y : pt.y1;
          for (let q = 0; q < 2; q++) if (ocup.has((pi + di * q) + ',' + (pj + dj * q))) erros.push(s + ': móvel na passagem da porta');
          const def = TP[k.tipo];
          if (def && def.centro) {
            const c = k.moveis.find(m => m.id === def.centro);
            if (!c) erros.push(s + ': faltou o do meio');
            else { vistos.centro++; const ci = k.x + (k.w - c.s) / 2, cj = k.y + (k.h - c.s) / 2; if (Math.max(Math.abs(c.x - ci), Math.abs(c.y - cj)) > 1) erros.push(s + ': o do meio longe do meio ' + JSON.stringify([c, k.x, k.y, k.w, k.h])); }
          }
        });
        if (p.muro && p.muro.portoes.some(g => g.x1 !== g.x2 && g.y1 !== g.y2)) erros.push(s + ': portão torto');
      };
      for (let s = 1; s <= 72; s++) {
        const o = { tamanho: s % 2 ? 'aldeia' : 'vila', terreno: ['campo', 'floresta', 'areia', 'neve'][s % 4], estilo: E.LISTA[s % 6][0], rio: s % 3 !== 0, muralha: s % 5 < 2, casas: 99, seed: s * 7919 };
        const p = V.gerar(o);
        if (JSON.stringify(p) !== JSON.stringify(V.gerar(o))) erros.push(s + ': o mesmo sorteio deu outro vilarejo');
        if (p.estilo !== o.estilo) erros.push(s + ': estilo');
        conferir(p, s);
      }
      // com partes travadas: a casa travada fica igual; as ruas ou o rio travados ficam no lugar; tudo segue as regras
      let travadas = 0, mantidas = 0, sairam = 0;
      for (let s = 1; s <= 36; s++) {
        const o = { tamanho: s % 2 ? 'vila' : 'aldeia', terreno: 'campo', estilo: E.LISTA[s % 6][0], rio: true, muralha: s % 4 === 0, casas: 99, seed: s * 104729 };
        const p1 = V.gerar(o);
        let t = null;
        t = V.alternar(p1, 'c0', t);
        if (p1.casas.length > 1) t = V.alternar(p1, 'c' + (p1.casas.length - 1), t);
        t = V.alternar(p1, s % 2 ? 'ruas' : 'rio', t);
        const o2 = Object.assign({}, o, { seed: o.seed + 1, trava: JSON.parse(JSON.stringify(t)), base: { ruaP: p1.ruaP, rioP: p1.rioP } });
        const p2 = V.gerar(o2);
        if (JSON.stringify(p2) !== JSON.stringify(V.gerar(o2))) erros.push('t' + s + ': com trava, o mesmo sorteio deu outro');
        conferir(p2, 't' + s);
        for (const k of t.casas) {
          travadas++;
          const m = p2.casas.find(q => q.x === k.x && q.y === k.y && q.w === k.w && q.h === k.h);
          if (m && m.trava && JSON.stringify([m.porta, m.janelas, m.moveis, m.tipo, m.forma]) === JSON.stringify([k.porta, k.janelas, k.moveis, k.tipo, k.forma])) mantidas++;
        }
        if (t.casas.length - p2.casas.filter(k => k.trava).length !== p2.soltas) erros.push('t' + s + ': conta das casas que saíram');
        sairam += p2.soltas;
        if (s % 2 && JSON.stringify(p2.ruaP) !== JSON.stringify(p1.ruaP)) erros.push('t' + s + ': as ruas travadas mudaram');
        if (!(s % 2) && JSON.stringify(p2.rioP) !== JSON.stringify(p1.rioP)) erros.push('t' + s + ': o rio travado mudou');
        // em outro estilo: a casa travada fica no lugar, com a mesma porta (a forma, as janelas e os móveis passam a ser do estilo novo)
        const outro = E.LISTA[(s + 2) % 6][0], p3 = V.gerar(Object.assign({}, o2, { estilo: outro }));
        conferir(p3, 'e' + s);
        for (const k of t.casas) { const m = p3.casas.find(q => q.x === k.x && q.y === k.y && q.w === k.w && q.h === k.h); if (m && (JSON.stringify(m.porta) !== JSON.stringify(k.porta) || m.forma !== E.formaDe(E.tipos(outro)[k.tipo], k.w, k.h))) erros.push('e' + s + ': a casa travada no outro estilo'); }
      }
      // uma trava torta (de um modelo estragado) não estraga o sorteio
      const ruim = V.gerar({ tamanho: 'aldeia', estilo: 'comum', seed: 5, casas: 5, trava: { ruas: { y0: 'a' }, rio: { rw: 99 }, casas: [{ tipo: 'casa', x: -4, y: 2, w: 4, h: 4 }, { tipo: 'xx', x: 2, y: 2, w: 4, h: 4 }, null, 'x', { tipo: 'casa', x: 3, y: 3, w: 4, h: 4, porta: { lado: 7 } }] } });
      if (ruim.casas.some(k => k.trava) || ruim.travaRuas || ruim.travaRio) erros.push('a trava torta valeu');
      conferir(ruim, 'ruim');
      // cada defeito, sozinho, tira a casa da trava (a boa fica)
      const boa = { tipo: 'casa', forma: 'ret', x: 3, y: 3, w: 4, h: 4, porta: { lado: 'n', x1: 4, y1: 3, x2: 5, y2: 3 }, janelas: [{ lado: 's', x1: 4, y1: 7, x2: 5, y2: 7 }], moveis: [{ id: 'cama', x: 3, y: 4, s: 1 }], estilo: 'comum' };
      const com = o => Object.assign(JSON.parse(JSON.stringify(boa)), o);
      const tortas = [com({ tipo: 'xx' }), com({ x: -1 }), com({ x: 26 }), com({ w: 2 }), com({ w: 4.5 }), com({ porta: { lado: 'n', x1: 3, y1: 3, x2: 4, y2: 3 } }), com({ porta: { lado: 'n', x1: 4, y1: 4, x2: 5, y2: 4 } }), com({ porta: { lado: 'q', x1: 4, y1: 3, x2: 5, y2: 3 } }), com({ porta: { lado: 'n', x1: 4, y1: 3, x2: 6, y2: 3 } })];
      const TPc = E.tipos('comum');
      const limpa = V.limparTrava({ casas: [boa].concat(tortas) }, 28, 20, TPc);
      if (limpa.casas.length !== 1 || limpa.casas[0].x !== 3) erros.push('limparTrava: ' + limpa.casas.length + ' casas');
      const lj = V.limparTrava({ casas: [com({ janelas: [{ lado: 'n', x1: 4, y1: 3, x2: 5, y2: 3 }, { lado: 7 }], moveis: [{ id: 'xx', x: 3, y: 3, s: 1 }, { id: 'cama', x: 9, y: 9, s: 1 }] })] }, 28, 20, TPc).casas[0];
      if (!lj || lj.janelas.length || lj.moveis.length) erros.push('limparTrava: janela no lado da porta ou móvel torto ficou');
      if (V.limparTrava({ ruas: { y0: 1, A: 1, L: 0, F: 1 } }, 28, 20, TPc).ruas || V.limparTrava({ rio: { xr0: 1, C: 1, N: 1, Hh: 1, rw: 5 } }, 28, 20, TPc).rio) erros.push('limparTrava: rua ou rio tortos ficaram');
      if (!V.limparTrava({ ruas: { y0: 1, A: 1, L: 9, F: 1 } }, 28, 20, TPc).ruas || !V.limparTrava({ rio: { xr0: 1, C: 1, N: 9, Hh: 1, rw: 1.3 } }, 28, 20, TPc).rio) erros.push('limparTrava: a rua ou o rio bons saíram');
      return { erros: erros.slice(0, 8), n: erros.length, vistos, travadas, mantidas, sairam };
    });
    ok(regras.n === 0 && regras.vistos.oct > 10 && regras.vistos.janelas > 200 && regras.vistos.centro > 5, 'em 72 sorteios, nos seis estilos: o mesmo sorteio dá o mesmo lugar; sem nome; casas dentro da área, sem grudar, fora da rua, da praça e do rio; a porta e as janelas de um quadrado, nos lados retos (cada janela num lado, nenhuma no lado da porta); móveis do catálogo, dentro, sem um em cima do outro, fora dos cantos cortados e da passagem da porta; a fogueira da casa longa no meio — ' + j(regras));
    ok(regras.travadas > 40 && regras.mantidas + regras.sairam === regras.travadas && regras.sairam <= 2, 'com partes travadas (36 sorteios): toda casa travada que coube ficou igual, e as ruas e o rio travados ficaram no lugar; em outro estilo, a casa fica no lugar com a mesma porta; uma trava torta não vale — ' + j({ travadas: regras.travadas, mantidas: regras.mantidas, sairam: regras.sairam }));

  }
  const inesperados = t.errs.filter(e => !/favicon|ERR_|Failed to load resource/i.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 10).join('\n'));
  ok(inesperados.length === 0, 'sem erros no console');
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
