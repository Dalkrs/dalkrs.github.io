// Bateria do lote 84 nas Cenas — a lista de cenas recolhida (para não se perder com muitas cenas):
//   · pastas, famílias e prédios (andares ligados por escada) começam fechados cada vez que a lista abre;
//   · só abre o caminho até a cena aberta (a pasta dela, a família dela, o prédio dela);
//   · abrir e fechar à mão vale enquanto a lista está aberta; abriu de novo, recolhe;
//   · a busca no alto filtra pelo nome (sem acento) e o Enter abre a primeira;
//   · as recentes (até 4) aparecem no alto quando há muitas cenas.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
const j = JSON.stringify;
(async () => {
  const t = await open();
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 150);
  const foto = async nome => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const lista = () => ev(() => [...document.querySelectorAll('.menu .menu-i, .menu .menu-h')].map(b => (b.classList.contains('menu-h') ? '# ' + b.textContent : b.innerText).replace(/\s+/g, ' ').trim()).filter(x => !/^(Nova cena|Nova cena de exemplo|Gerar um lugar…|Duplicar esta cena|Renomear|Organizar as cenas…|Apagar esta cena…)$/.test(x)));
  const abrir = async () => { await page.keyboard.press('Escape'); await w(80); await page.locator('#sceneBtn').click(); await w(200); };

  const P = await ev(() => {
    const { Store, newScene, Persist, Props, normalizeScene } = __tc;
    const mk = (nome, o) => { const sc = normalizeScene(Object.assign(newScene(nome), o || {})); Store.addScene(sc); Persist.scene(sc.id); return sc.id; };
    const ids = {};
    for (const nome of ['Taverna do Javali', 'Estrada velha', 'Ponte quebrada', 'Acampamento']) ids[nome] = mk(nome);
    // a família: a Cidade com o Bairro dentro, e a Casa dentro do Bairro
    ids.cidade = mk('Cidade de Ulm'); ids.bairro = mk('Bairro do porto'); ids.casa = mk('Casa do ferreiro');
    // o prédio: Térreo, 2º andar e Porão da Fortaleza Cinzenta, ligados por escadas (sem família)
    ids.t = mk('Fortaleza Cinzenta', { nivel: 0 }); ids.a2 = mk('Fortaleza — 2º andar', { nivel: 1 }); ids.po = mk('Fortaleza — Porão', { nivel: -1 });
    const esc = (de, para) => { const sc = Store.S.scenes[de]; sc.tokens.push(Object.assign(Props.novo(sc, 'escada', 64, 64, 1, false), { cena: para })); Persist.scene(de); };
    esc(ids.t, ids.a2); esc(ids.a2, ids.t); esc(ids.t, ids.po); esc(ids.po, ids.t);
    // as pastas: "Viagem" (Estrada, Ponte, Acampamento) e "Lugares" (a Cidade e o prédio)
    Store.S.pastas = { lista: [{ id: 'pa_viagem', nome: 'Viagem' }, { id: 'pa_lugares', nome: 'Lugares' }],
      de: { [ids['Estrada velha']]: 'pa_viagem', [ids['Ponte quebrada']]: 'pa_viagem', [ids.Acampamento]: 'pa_viagem', [ids.cidade]: 'pa_lugares', [ids.t]: 'pa_lugares', [ids.a2]: 'pa_lugares', [ids.po]: 'pa_lugares' },
      mae: { [ids.bairro]: ids.cidade, [ids.casa]: ids.bairro } };
    Persist.meta(); Store.meta();
    __tc.UI.switchScene(ids['Taverna do Javali']);
    return ids;
  });
  await w(300);

  // 1) tudo recolhido: a Taverna aberta (solta); as pastas fechadas
  await abrir();
  let l = await lista();
  ok(l.some(x => /^Viagem.*3$/.test(x)) && l.some(x => /^Lugares/.test(x)), 'as duas pastas aparecem, com quantas cenas têm — ' + j(l));
  ok(!l.some(x => /Estrada velha|Cidade de Ulm|Fortaleza/.test(x)), 'fechadas: nada de dentro delas aparece — ' + j(l));
  ok(await page.locator('#menuBusca').count() === 1, 'a busca está no alto da lista');
  await foto('l84-recolhida');

  // 2) a cena aberta dentro do prédio, dentro da pasta: só esse caminho abre
  await page.keyboard.press('Escape');
  await ev(id => __tc.UI.switchScene(id), P.a2); await w(250);
  await abrir();
  l = await lista();
  const iL = l.findIndex(x => /^Lugares/.test(x));
  ok(iL >= 0 && l.some(x => /^Fortaleza Cinzenta.*3 andares/.test(x)), 'a pasta Lugares abre (a cena aberta está nela) e o prédio aparece numa linha só: "3 andares" — ' + j(l));
  ok(l.some(x => /Fortaleza — 2º andar/.test(x)) && l.some(x => /Fortaleza — Porão/.test(x)), 'o prédio da cena aberta vem aberto, com os andares');
  const ordem = ['Fortaleza — 2º andar', 'Fortaleza Cinzenta', 'Fortaleza — Porão'].map(nm => l.findIndex(x => x.startsWith(nm) && !/andares/.test(x)));
  ok(ordem.every((v, i) => v > 0 && (i === 0 || v > ordem[i - 1])), 'os andares em ordem, de cima para baixo: 2º andar, térreo, porão — ' + j(ordem));
  ok(!l.some(x => /Bairro do porto|Casa do ferreiro/.test(x)), 'a família da Cidade, que não tem a cena aberta, fica fechada');
  ok(!l.some(x => /Estrada velha/.test(x)), 'a pasta Viagem continua fechada');
  await foto('l84-caminho');

  // 3) abrir à mão: vale enquanto a lista está aberta; ao abrir de novo, recolhe
  await page.locator('#mp-pa_viagem').click(); await w(200);
  l = await lista();
  ok(l.some(x => /Estrada velha/.test(x)), 'clicar na pasta Viagem abre a pasta');
  await page.locator('#mf-' + P.cidade).click(); await w(200);
  l = await lista();
  ok(l.some(x => /Bairro do porto/.test(x)) && !l.some(x => /Casa do ferreiro/.test(x)), 'abrir a família da Cidade mostra o Bairro (a Casa, dentro do Bairro, continua recolhida)');
  await abrir();
  l = await lista();
  ok(!l.some(x => /Estrada velha|Bairro do porto/.test(x)), 'fechou e abriu a lista: recolhe de novo (só o caminho da cena aberta)');
  // fechar à mão o prédio da cena aberta
  await page.locator('#mp-pr-' + P.t).click(); await w(200);
  l = await lista();
  ok(!l.some(x => /Fortaleza — Porão/.test(x)) && l.some(x => /^Fortaleza Cinzenta.*3 andares/.test(x)), 'dá para fechar o prédio da cena aberta');

  // 4) a busca
  await page.locator('#menuBusca').fill('ferreiro'); await w(250);
  l = await lista();
  ok(l.some(x => /^# Cenas com "ferreiro"/.test(x)) && l.some(x => /^Casa do ferreiro.*Bairro do porto/.test(x)) && !l.some(x => /Viagem|Taverna/.test(x)), 'a busca acha a Casa do ferreiro (e diz onde ela está) — ' + j(l));
  ok(await ev(() => document.activeElement && document.activeElement.id === 'menuBusca'), 'o cursor continua na busca enquanto digita');
  await page.locator('#menuBusca').fill('ponte'); await w(200);
  await foto('l84-busca');
  await page.keyboard.press('Enter'); await w(300);
  ok(await ev(id => __tc.Store.S.current === id, P['Ponte quebrada']), 'Enter abre a primeira cena achada (a Ponte quebrada)');
  await abrir();
  await page.locator('#menuBusca').fill('fortaleza porao'); await w(200);
  l = await lista();
  ok(l.some(x => /^Fortaleza — Porão/.test(x)), 'a busca junta as palavras em qualquer ordem ("fortaleza porao")');
  await page.locator('#menuBusca').fill('dragão'); await w(200);
  ok((await lista()).some(x => /^# Nenhuma cena com "dragão"/.test(x)), 'uma busca sem resultado diz que não achou');
  await page.locator('#menuBusca').fill('PORÃO'); await w(200);
  l = await lista();
  ok(l.some(x => /^Fortaleza — Porão/.test(x)), 'a busca não liga para acento nem maiúscula — ' + j(l));
  await page.locator('#menuBusca').fill(''); await w(200);

  // 5) as recentes
  l = await lista();
  const iR = l.indexOf('# Recentes');
  ok(iR >= 0 && /Fortaleza — 2º andar/.test(l[iR + 1]) && /Taverna do Javali/.test(l.slice(iR, iR + 5).join(' ')), 'as recentes no alto: a última cena aberta antes desta primeiro — ' + j(l.slice(iR, iR + 5)));
  ok(!l.slice(iR + 1, iR + 5).some(x => /^Ponte quebrada/.test(x)), 'a cena aberta não aparece nas recentes');
  await page.keyboard.press('Escape');

  ok(!t.errs || !t.errs.length, 'sem erros no console: ' + (t.errs || []).slice(0, 3).join(' | '));
  console.log((fails ? fails + ' falharam, ' : '') + (n - fails) + ' verificações passaram');
  await t.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
