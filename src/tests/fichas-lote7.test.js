// Fichas sem mesa (tudo neste navegador), lote 7 (parte 2): os equipamentos
//   · por tipo: as seções (Armas, Armaduras…, com quantos itens e quantos equipados; os equipados primeiro), recolher
//     (o aparelho lembra), "Separar por tipo…" (o palpite pelo nome, conferido antes; Desfazer), o tipo no "Editar",
//     "+ Novo tipo…" e a janela "Tipos…" (criar, renomear, tirar);
//   · os filtros no alto (tipo, equipados ou guardados, relíquias, a busca pelo nome) — sem gravar nada na ficha;
//   · arrastar o cartão (na seção; noutra seção troca o tipo) e as setas do teclado na alça, com Desfazer;
//   · itens com níveis: "+ nível", uma aba por nível no "Editar" (os números e a passiva de cada um), o ◂ Nv ▸ do cartão
//     (as contas seguem o nível de agora; a mesa ao vivo fica sabendo; Desfazer), "Usar", "Copiar do Nv…", "Tirar o Nv…";
//   · o "Só funciona com…" com vários itens (vale com qualquer um) e com o nível mínimo.
// FOTOS=<pasta> guarda capturas.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const zero = { FOR: 0, DES: 0, VIT: 0, CAN: 0, AGI: 0 };
const it = (id, nome, o) => Object.assign({ id, nome, equipado: true, bonus: Object.assign({}, zero) }, o);
const pc = (id, nome, itens) => ({ id, nome, raca: 'Kitsune', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'E', DES: 'C', AGI: 'B', VIT: 'D', CAN: 'A' }, pctProprio: null, poderes: [],
  skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 0, fonte: 'total' }, ultRol: null, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 },
  estaque: { a: '', b: '' }, habilidades: [], itens, recursos: [{ id: 'hp', nome: 'HP', fml: '100' }], notas: '' });
const ITENS = [
  it('k1', 'Katana de gelo', { bonus: Object.assign({}, zero, { FOR: 2 }) }),
  it('k2', 'Katana de gelo Nv2', { bonus: Object.assign({}, zero, { FOR: 4, DFF: 1 }), equipado: false }),
  it('ar', 'Arco curto', { bonus: Object.assign({}, zero, { DES: 2 }), equipado: false }),
  it('co', 'Couraça de couro', { bonus: Object.assign({}, zero, { DFF: 3 }) }),
  it('an', 'Anel do fogo', { bonus: Object.assign({}, zero, { CAN: 1 }), reliquia: true }),
  it('ba', 'Bainha de jade', { bonus: Object.assign({}, zero, { DES: 1 }) }),
  it('xx', 'Coisa estranha', { equipado: false })];
// (a Outra tem um item com níveis cujo espelho não confere — mexido só no item, por uma versão de antes do site)
const torto = it('lv', 'Lança', { nv: 2, niveis: [{ bonus: { FOR: 1 } }, { bonus: { FOR: 5 } }], bonus: Object.assign({}, zero, { FOR: 9 }) });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_d', 'Dain', ITENS), pc('pc_o', 'Outra', [torto])], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_d', selSit: null, aba: 'fichas', grupos: [] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas7', w: 1320, h: 960, seed: { urgm_calc_atributos_v1: estado } });
  P.setDefaultTimeout(8000);
  const w = ms => P.waitForTimeout(ms);
  const j = JSON.stringify;
  const S0 = (fn, a) => P.evaluate(fn, a);
  const dain = () => S0(() => JSON.parse(JSON.stringify(S.personagens.find(x => x.id === 'pc_d'))));
  const item = async id => (await dain()).itens.find(x => x.id === id);
  const calc = () => S0(() => { const c = calcular(S.personagens.find(x => x.id === 'pc_d')); return { FOR: c.eq.FOR, DES: c.eq.DES, DFF: c.eq.DFF, CAN: c.eq.CAN }; });
  const toast = () => P.locator('.toast').last().innerText().then(s => s.replace(/\s+/g, ' ').trim()).catch(() => '');
  const desfazerAviso = async () => { await P.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(350); };
  const semAvisos = () => S0(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  // as seções, como aparecem: "Armas: k1/k2 · …" (só as visíveis, com os cartões visíveis)
  const secoes = () => S0(() => [...document.querySelectorAll('#painelItens [data-itsec]')].filter(s => !s.hidden)
    .map(s => s.dataset.itsec + ':' + [...s.querySelectorAll('[data-itcard]')].filter(c => !c.hidden).map(c => c.dataset.itcard).join('/')).join(' '));
  const cabecalhos = () => P.locator('#painelItens .itsech').allInnerTexts().then(l => l.map(x => x.replace(/\s+/g, ' ').trim()));
  const foto = async nome => { if (process.env.FOTOS) await P.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };

  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
  await passo('abrir', async () => {
    ok(await P.locator('#f_nome').inputValue() === 'Dain', 'a ficha abre');
    ok(await S0(() => new Promise(r => setTimeout(() => r(localStorage.getItem('urgm_calc_atributos_v1')), 700))).then(v => JSON.parse(v).personagens[0].itens.every(x => !('tipo' in x) && !('niveis' in x))),
      'abrir não acrescenta nada aos itens (nenhum tipo gravado à toa)');
    ok(await secoes() === '-:k1/co/an/ba/k2/ar/xx', 'sem tipo nenhum, uma seção só ("Sem tipo"), com os equipados primeiro: ' + await secoes());
    ok(await S0(() => S.personagens[1].itens[0].bonus.FOR) === 5, 'um item com níveis cujo espelho não conferia é acertado ao abrir (FOR +5, o do Nv 2)');
    ok(j(await cabecalhos()) === j(['▾ SEM TIPO 7 itens, 4 equipados']), 'o título da seção diz quantos itens e quantos equipados: ' + j(await cabecalhos()));
    ok(await P.locator('[data-itseparar]').isVisible() && await P.locator('[data-ittipos]').isVisible(), '"Separar por tipo…" (há itens sem tipo) e "Tipos…" (fora de uma mesa, quem usa é quem mestra)');
  });

  await passo('separar por tipo', async () => {
    await P.locator('[data-itseparar]').click(); await w(300);
    const linhas = await P.locator('.itjanela .itsepl').evaluateAll(ls => ls.map(l => l.querySelector('.itsepn').textContent + '=' + l.querySelector('select').value + (l.querySelector('.hint') ? '?' : '')));
    ok(j(linhas) === j(['Katana de gelo=arma', 'Katana de gelo Nv2=arma', 'Arco curto=arma', 'Couraça de couro=armadura', 'Anel do fogo=acessorio', 'Bainha de jade=acessorio', 'Coisa estranha=outro?']),
      'a janela traz o palpite de cada item pelo nome (o que não tem palpite vem como Outro, marcado): ' + j(linhas));
    ok(await P.locator('.itjanela [data-jok]').innerText() === 'Aplicar a 7 itens' && j((await dain()).itens.map(x => x.tipo || '')) === j(['', '', '', '', '', '', '']), 'nada muda antes de aplicar');
    await P.locator('.itjanela [data-jsep="6"]').selectOption(''); await w(150);
    ok(await P.locator('.itjanela [data-jok]').innerText() === 'Aplicar a 6 itens', 'deixar um "Sem tipo" tira ele da conta');
    await P.locator('.itjanela [data-jok]').click(); await w(400);
    ok(j((await dain()).itens.map(x => x.tipo || '')) === j(['arma', 'arma', 'arma', 'armadura', 'acessorio', 'acessorio', '']) && /6 itens separados por tipo\./.test(await toast()), 'aplicar põe os tipos (e avisa, com Desfazer): ' + await toast());
    ok(await secoes() === 'arma:k1/k2/ar armadura:co acessorio:an/ba -:xx', 'as seções na ordem dos tipos, os equipados primeiro: ' + await secoes());
    ok(j(await cabecalhos()) === j(['▾ ARMAS 3 itens, 1 equipado', '▾ ARMADURAS 1 item, 1 equipado', '▾ ACESSÓRIOS 2 itens, 2 equipados', '▾ SEM TIPO 1 item, nenhum equipado']), 'os títulos: ' + j(await cabecalhos()));
    await desfazerAviso();
    ok((await dain()).itens.every(x => !x.tipo) && await secoes() === '-:k1/co/an/ba/k2/ar/xx', 'Desfazer: todos sem tipo de novo');
    await P.locator('[data-itseparar]').click(); await w(300);
    await P.locator('.itjanela [data-jok]').click(); await w(400);
    ok(await secoes() === 'arma:k1/k2/ar armadura:co acessorio:an/ba outro:xx' && await P.locator('[data-itseparar]').count() === 0, '(separados de novo — e, sem item sem tipo, o botão sai)');
    await foto('fichas7-secoes');
  });

  await passo('filtros', async () => {
    const antes = j(await dain());
    const chips = await P.locator('#painelItens .itf').allInnerTexts();
    ok(j(chips.map(x => x.replace(/\s+/g, ' ').trim())) === j(['Todos 7', 'Armas 3', 'Armaduras 1', 'Acessórios 2', 'Outros 1', 'Equipados 4', 'Guardados 3', 'Relíquias 1']), 'os filtros: os tipos que têm itens, equipados, guardados e relíquias, com quantos há: ' + j(chips));
    await P.locator('[data-itfil="t:arma"]').click(); await w(150);
    ok(await secoes() === 'arma:k1/k2/ar' && await P.locator('[data-itfil="limpar"]').isVisible(), '"Armas": só a seção das armas (e aparece "Limpar filtros")');
    await P.locator('[data-itfil="e:off"]').click(); await w(150);
    ok(await secoes() === 'arma:k2/ar', '"Armas" e "Guardados": só as armas guardadas');
    await P.locator('[data-itfil="t:"]').click(); await w(150);
    ok(await secoes() === 'arma:k2/ar outro:xx', '"Todos" com "Guardados": os guardados de todos os tipos');
    await P.locator('[data-itfil="e:off"]').click(); await P.locator('[data-itfil="r:1"]').click(); await w(150);
    ok(await secoes() === 'acessorio:an', 'clicar de novo em "Guardados" desliga; "Relíquias": só o Anel');
    await P.locator('[data-itfil="r:1"]').click(); await w(100);
    await P.locator('[data-itbusca]').fill('katana'); await w(150);
    ok(await secoes() === 'arma:k1/k2' && await P.evaluate(() => document.activeElement && document.activeElement.matches('[data-itbusca]')), 'a busca pelo nome ("katana", sem diferença de maiúsculas), sem perder o cursor');
    await P.locator('[data-itbusca]').fill('COURACA'); await w(150);
    ok(await secoes() === 'armadura:co', 'e sem diferença de acentos ("COURACA" acha a Couraça)');
    await P.locator('[data-itbusca]').fill('nada disso'); await w(150);
    ok(await secoes() === '' && await P.locator('#itNada').isVisible(), 'sem nada: "Nenhum item com esse filtro."');
    await P.locator('[data-itbusca]').press('Escape'); await w(150);
    ok(await secoes() === 'arma:k1/k2/ar armadura:co acessorio:an/ba outro:xx' && await P.locator('[data-itbusca]').inputValue() === '', 'Esc na busca a esvazia');
    await P.locator('[data-itfil="t:armadura"]').click(); await P.locator('[data-itfil="limpar"]').click(); await w(150);
    ok(await secoes() === 'arma:k1/k2/ar armadura:co acessorio:an/ba outro:xx' && !(await P.locator('[data-itfil="limpar"]').isVisible()), '"Limpar filtros" mostra tudo de novo');
    ok(j(await dain()) === antes, 'os filtros não mudam nada na ficha');
  });

  await passo('recolher', async () => {
    await P.locator('[data-itsecbt="armadura"]').click(); await w(200);
    ok(await P.locator('[data-itsec="armadura"] .itcards').isHidden() && await P.locator('[data-itsecbt="armadura"]').getAttribute('aria-expanded') === 'false', 'o título recolhe a seção');
    await w(500);
    await P.reload({ waitUntil: 'load' }); await w(1200);
    ok(await P.locator('[data-itsec="armadura"] .itcards').isHidden() && (await P.locator('[data-itsecbt="armadura"]').innerText()).startsWith('▸'), 'o aparelho lembra (depois de recarregar, continua recolhida)');
    await P.locator('[data-itbusca]').fill('cou'); await w(150);
    ok(await P.locator('[data-itcard="co"]').isVisible(), 'filtrando, a seção recolhida mostra o que achou');
    await P.locator('[data-itbusca]').fill(''); await w(150);
    await P.locator('[data-itsecbt="armadura"]').click(); await w(200);
    ok(await P.locator('[data-itcard="co"]').isVisible(), '(aberta de novo)');
  });

  await passo('o tipo no Editar e os tipos novos', async () => {
    await P.locator('[data-itemed="ba"]').click(); await w(250);
    ok(await P.locator('[data-ittipo="ba"]').inputValue() === 'acessorio', 'no "Editar", o tipo do item');
    await semAvisos();
    await P.locator('[data-ittipo="ba"]').selectOption('arma'); await w(300);
    ok((await item('ba')).tipo === 'arma' && /Bainha de jade agora é Arma\./.test(await toast()) && await P.evaluate(() => document.activeElement && document.activeElement.dataset.ittipo === 'ba'), 'trocar o tipo leva o item para a outra seção (o cursor vai junto): ' + await toast());
    await desfazerAviso();
    ok((await item('ba')).tipo === 'acessorio', 'Desfazer volta o tipo');
    await P.locator('[data-ittipo="ba"]').selectOption('+'); await w(250);
    ok(await P.locator('.itjanela [data-jnome]').isVisible() && await P.locator('[data-ittipo="ba"]').inputValue() === 'acessorio', '"+ Novo tipo…" abre a janela (e o item fica como estava até criar)');
    await P.locator('.itjanela [data-jok]').click(); await w(150);
    ok(/Escreva o nome/.test(await P.locator('.itjanela [data-jerro]').innerText()), 'sem nome, avisa');
    await P.locator('.itjanela [data-jnome]').fill(' ARMAS '); await P.locator('.itjanela [data-jok]').click(); await w(150);
    ok(/Já existe/.test(await P.locator('.itjanela [data-jerro]').innerText()), 'o nome de um tipo pronto (nem no plural) não serve');
    await P.locator('.itjanela [data-jnome]').fill('Talismã'); await P.locator('.itjanela [data-jnome]').press('Enter'); await w(400);
    const tps = await S0(() => S.cfg.tiposItem);
    ok(tps && tps.length === 1 && /^tp_[a-z0-9]+$/.test(tps[0].id) && tps[0].nome === 'Talismã' && (await item('ba')).tipo === tps[0].id, 'o tipo novo fica na configuração (S.cfg.tiposItem) e o item já é dele: ' + j(tps));
    ok((await secoes()).startsWith('arma:k1/k2/ar armadura:co acessorio:an ' + tps[0].id + ':ba outro:xx') && (await cabecalhos()).includes('▾ TALISMÃ 1 item, 1 equipado'), 'a seção nova vem depois das prontas e antes de Outros: ' + await secoes());
    await desfazerAviso();
    ok(!(await S0(() => S.cfg.tiposItem)) && (await item('ba')).tipo === 'acessorio', 'Desfazer tira o tipo novo e devolve o item');
    // a janela "Tipos…"
    await P.locator('[data-itemed="ba"]').click(); await w(200);
    await P.locator('[data-ittipos]').click(); await w(250);
    await P.locator('.itjanela [data-jnovo]').fill('Talismã'); await P.locator('.itjanela [data-jnovo]').press('Enter'); await w(250);
    await P.locator('.itjanela [data-jnovo]').fill('Relíquia do clã'); await P.locator('.itjanela [data-jcria]').click(); await w(250);
    const tps2 = await S0(() => S.cfg.tiposItem.map(x => x.nome));
    ok(j(tps2) === j(['Talismã', 'Relíquia do clã']) && await P.locator('.itjanela .ittipol').count() === 2, '"Tipos…": cria tipos (Enter ou "Criar")');
    await S0(() => { const t = S.cfg.tiposItem[0]; S.personagens[0].itens.find(x => x.id === 'an').tipo = t.id; save(); render(); });
    await w(200);
    const ren = P.locator('.itjanela [data-jren]').first();
    await ren.fill('Talismãs'); await ren.press('Enter'); await w(300);
    ok((await S0(() => S.cfg.tiposItem[0].nome)) === 'Talismãs' && (await cabecalhos()).some(x => x.startsWith('▾ TALISMÃS')), 'renomeia (a seção acompanha)');
    await P.locator('.itjanela [data-jtira]').first().click(); await w(200);
    ok(/1 item deste tipo vai para “Sem tipo”/.test(await P.locator('.itjanela [data-jerro]').innerText()) && (await S0(() => S.cfg.tiposItem.length)) === 2, 'tirar um tipo com item pede a confirmação (e diz quantos itens)');
    await P.locator('.itjanela [data-jtira]').first().click(); await w(300);
    ok(j(await S0(() => S.cfg.tiposItem.map(x => x.nome))) === j(['Relíquia do clã']) && (await secoes()).includes('-:an'), 'tirado: o item dele fica em "Sem tipo"');
    await P.locator('.itjanela [data-jcancela]').first().click(); await w(200);
    await desfazerAviso();
    ok(j(await S0(() => S.cfg.tiposItem.map(x => x.nome))) === j(['Talismãs', 'Relíquia do clã']) && !(await secoes()).includes('-:an'), 'Desfazer devolve o tipo (no mesmo lugar) e o Anel volta para ele');
    await S0(() => { S.personagens[0].itens.find(x => x.id === 'an').tipo = 'acessorio'; delete S.cfg.tiposItem; save(); render(); });
    await w(200);
  });

  await passo('arrastar', async () => {
    const alca = async id => { const b = await P.locator('[data-itarr="' + id + '"]').boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
    const centro = async sel => { const b = await P.locator(sel).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
    const arrastar = async (id, para) => {
      const [x0, y0] = await alca(id), [x1, y1] = para;
      await P.mouse.move(x0, y0); await P.mouse.down(); await P.mouse.move(x0 + 8, y0 + 8, { steps: 3 });
      await P.mouse.move(x1, y1, { steps: 8 }); await w(120);
      const linha = await P.locator('.itlinha').isVisible().catch(() => false), alvo = await P.locator('#painelItens .itsec.alvo').count();
      await P.mouse.up(); await w(400);
      return { linha, alvo };
    };
    await semAvisos();
    // o Arco (guardado) para a seção das Armaduras: vira Armadura
    const a1 = await arrastar('ar', await centro('[data-itcard="co"]'));
    ok(!a1.linha && a1.alvo === 1 && (await item('ar')).tipo === 'armadura' && await secoes() === 'arma:k1/k2 armadura:co/ar acessorio:an/ba outro:xx' && /Arco curto agora é Armadura\./.test(await toast()),
      'arrastar o Arco para a seção das Armaduras (sem guardado nela, a seção toda se acende) troca o tipo — e, guardado, ele fica depois dos equipados: ' + await secoes() + ' · ' + await toast());
    await desfazerAviso();
    ok((await item('ar')).tipo === 'arma' && await secoes() === 'arma:k1/k2/ar armadura:co acessorio:an/ba outro:xx' && j((await dain()).itens.map(x => x.id)) === j(ITENS.map(x => x.id)), 'Desfazer volta o tipo e a ordem');
    // dentro da seção: o Arco antes da Katana Nv2 (os dois guardados)
    const b = await P.locator('[data-itcard="k2"]').boundingBox();
    const a2 = await arrastar('ar', [b.x + 12, b.y + b.height / 2]);
    ok(a2.linha && await secoes() === 'arma:k1/ar/k2 armadura:co acessorio:an/ba outro:xx' && /Arco curto mudou de lugar\./.test(await toast()), 'dentro da seção, muda a ordem (a linha mostra onde cai): ' + await secoes());
    // um guardado não passa à frente dos equipados (fica no começo dos guardados)
    const k1 = await P.locator('[data-itcard="k1"]').boundingBox();
    await arrastar('k2', [k1.x + 12, k1.y + k1.height / 2]);
    ok(await secoes() === 'arma:k1/k2/ar armadura:co acessorio:an/ba outro:xx', 'um guardado solto sobre um equipado vai para o começo dos guardados: ' + await secoes());
    // o teclado: as setas na alça
    await P.locator('[data-itarr="ar"]').focus();
    await P.keyboard.press('ArrowUp'); await w(350);
    ok(await secoes() === 'arma:k1/ar/k2 armadura:co acessorio:an/ba outro:xx' && await P.evaluate(() => document.activeElement && document.activeElement.dataset.itarr === 'ar'), 'na alça, a seta para cima sobe um lugar (o cursor fica na alça)');
    const ordem = j((await dain()).itens.map(x => x.id));
    await semAvisos();
    await P.keyboard.press('ArrowUp'); await w(300);
    ok(await secoes() === 'arma:k1/ar/k2 armadura:co acessorio:an/ba outro:xx' && j((await dain()).itens.map(x => x.id)) === ordem && await P.locator('.toast').count() === 0, 'no começo dos guardados, não passa à frente dos equipados (nada muda)');
    await P.keyboard.press('ArrowDown'); await w(350);
    ok(await secoes() === 'arma:k1/k2/ar armadura:co acessorio:an/ba outro:xx', 'e a seta para baixo desce');
    // Esc no meio do arrasto: nada muda
    const [x0, y0] = await alca('xx'), [x1, y1] = await centro('[data-itcard="co"]');
    await P.mouse.move(x0, y0); await P.mouse.down(); await P.mouse.move(x1, y1, { steps: 6 }); await P.keyboard.press('Escape'); await P.mouse.up(); await w(300);
    ok((await item('xx')).tipo === 'outro' && await P.locator('.itlinha').count() === 0, 'Esc no meio do arrasto: nada muda');
  });

  await passo('níveis', async () => {
    await P.locator('[data-itemed="k1"]').click(); await w(250);
    ok(await P.locator('[data-itnvnovo="k1"]').isVisible() && await P.locator('[data-itnv="k1"]').count() === 0, 'um item comum tem "+ nível" no "Editar" (e nada de nível no cartão)');
    await semAvisos();
    await P.locator('[data-itnvnovo="k1"]').click(); await w(300);
    let k = await item('k1');
    ok(k.niveis.length === 2 && k.nv === 1 && k.niveis[1].bonus.FOR === 2 && k.bonus.FOR === 2 && /Nv 2 criado, igual ao Nv 1/.test(await toast()), '"+ nível": o item ganha o Nv 2, igual ao 1; o de agora continua o 1');
    ok(await P.locator('[data-itnvaba="k1"][data-nv="2"]').getAttribute('aria-pressed') === 'true' && /Nv 2 não está em uso/.test(await P.locator('[data-itcard="k1"] .itnvacoes').innerText()) && (await P.locator('[data-itcard="k1"] .itnv').innerText()).replace(/\s+/g, ' ').includes('Nv 1'),
      'o "Editar" abre na aba do Nv 2 (que não está em uso); o cartão mostra ◂ Nv 1 ▸');
    await P.locator('[data-itembon="k1|FOR"]').fill('4'); await P.locator('[data-itembon="k1|FOR"]').press('Tab'); await w(250);
    await P.locator('[data-itembon="k1|DFF"]').fill('1'); await P.locator('[data-itembon="k1|DFF"]').press('Tab'); await w(250);
    await P.locator('[data-itemfx="k1"]').fill('Corte gélido'); await w(250);
    k = await item('k1');
    ok(k.niveis[1].bonus.FOR === 4 && k.niveis[1].bonus.DFF === 1 && k.niveis[1].efeito === 'Corte gélido' && k.bonus.FOR === 2 && !k.efeito && (await calc()).FOR === 2,
      'na aba do Nv 2, os números e a passiva são do Nv 2 — a ficha continua somando o Nv 1 (FOR +2)');
    await semAvisos();
    await P.locator('[data-itnv="k1"][data-d="1"]').click(); await w(350);
    k = await item('k1');
    const log1 = await S0(() => S.log[0]);
    ok(k.nv === 2 && k.bonus.FOR === 4 && k.bonus.DFF === 1 && k.efeito === 'Corte gélido' && j(await calc()) === j({ FOR: 4, DES: 1, DFF: 4, CAN: 1 }) && /Katana de gelo: Nv 1 → Nv 2\./.test(await toast()),
      '▸ sobe para o Nv 2: as contas seguem o nível de agora (FOR +4, DEF F +1) — ' + j(await calc()) + ' · ' + await toast());
    ok(log1 && log1.tipo === 'uso' && log1.quem === 'Dain' && log1.det === 'Katana de gelo: Nv 1 → Nv 2', 'e a mudança vai para o registro (a mesa ao vivo, numa mesa): ' + j(log1));
    ok(await P.locator('[data-itnv="k1"][data-d="1"]').isDisabled() && await P.evaluate(() => document.activeElement && document.activeElement.matches('[data-itnv="k1"][data-d="-1"]')), 'no último nível o ▸ apaga, e o cursor vai para o ◂');
    await desfazerAviso();
    ok((await item('k1')).nv === 1 && (await calc()).FOR === 2 && (await S0(() => S.log[0].det)) === 'Katana de gelo: Nv 2 → Nv 1 (desfeito)', 'Desfazer volta o Nv 1 (e o registro diz)');
    // o Nv 3, "Usar", "Copiar do Nv 2" e "Tirar"
    await P.locator('[data-itnvnovo="k1"]').click(); await w(300);
    await P.locator('[data-itembon="k1|FOR"]').fill('6'); await P.locator('[data-itembon="k1|FOR"]').press('Tab'); await w(250);
    k = await item('k1');
    ok(k.niveis.length === 3 && k.niveis[2].bonus.FOR === 6 && k.niveis[2].bonus.DFF === 1 && k.niveis[2].efeito === 'Corte gélido', 'o Nv 3 começa igual ao 2 (e muda só o que se mexe)');
    await P.locator('[data-itnvusar="k1"]').click(); await w(300);
    ok((await item('k1')).nv === 3 && (await calc()).FOR === 6 && (await S0(() => S.log[0].det)) === 'Katana de gelo: Nv 1 → Nv 3', '"Usar o Nv 3" troca o de agora');
    await P.locator('[data-itnvcopia="k1"]').click(); await w(300);
    ok((await item('k1')).niveis[2].bonus.FOR === 4 && (await calc()).FOR === 4, '"Copiar do Nv 2" põe no Nv 3 os números do 2 (e, sendo o de agora, as contas acompanham)');
    await desfazerAviso();
    ok((await item('k1')).niveis[2].bonus.FOR === 6 && (await calc()).FOR === 6, '(Desfazer)');
    await P.locator('[data-itnvtira="k1"]').click(); await w(300);
    k = await item('k1');
    ok(k.niveis.length === 2 && k.nv === 2 && (await calc()).FOR === 4 && /Nv 3 tirado\./.test(await toast()), '"Tirar o Nv 3" (o de agora): fica o Nv 2');
    await desfazerAviso();
    ok((await item('k1')).niveis.length === 3 && (await item('k1')).nv === 3, '(Desfazer devolve o Nv 3)');
    await foto('fichas7-niveis');
    await P.locator('[data-itemed="k1"]').click(); await w(200);
  });

  await passo('só funciona com vários', async () => {
    await P.locator('[data-itemed="ba"]').click(); await w(250);
    await P.locator('[data-itemreq="ba"]').selectOption('i:k1'); await w(300);
    ok((await item('ba')).req === 'i:k1' && await P.evaluate(() => document.activeElement && document.activeElement.dataset.itemreq === 'ba'), 'um item só: o requisito como antes (um texto); o cursor fica no "+ mais um…"');
    ok((await P.locator('[data-itemreq="ba"] option').first().innerText()) === '+ mais um…' && await P.locator('[data-itemreq="ba"] option[value="i:k1"]').count() === 0, 'a lista oferece "+ mais um…", sem o que já está');
    await P.locator('[data-itemreq="ba"]').selectOption('i:k2'); await w(300);
    ok(j((await item('ba')).req) === j(['i:k1', 'i:k2']) && /Vale com qualquer um deles/.test(await P.locator('[data-itcard="ba"] .itreqf').innerText()), 'dois: vira uma lista, "vale com qualquer um deles"');
    ok((await P.locator('[data-itcard="ba"] .itreq').innerText()).replace(/\s+/g, ' ').trim() === 'com Katana de gelo ou Katana de gelo Nv2', 'o cartão diz: "com Katana de gelo ou Katana de gelo Nv2"');
    await P.locator('[data-itemed="ba"]').click(); await w(200);
    // guardar a katana (a Nv2 também está guardada): a Bainha vai junto; equipar a Nv2 traz a Bainha de volta
    await semAvisos();
    await P.locator('[data-itemon="k1"]').uncheck(); await w(350);
    ok((await item('ba')).equipado === false && /Guardou Katana de gelo; guardou junto: Bainha de jade\./.test(await toast()), 'sem nenhuma katana, a Bainha é guardada junto: ' + await toast());
    await P.locator('[data-itemon="k2"]').check(); await w(350);
    ok((await item('ba')).equipado === true && /Equipou Katana de gelo Nv2; junto: Bainha de jade\./.test(await toast()), 'com a outra katana (qualquer uma serve), a Bainha volta: ' + await toast());
    await P.locator('[data-itemon="k2"]').uncheck(); await w(300);
    await P.locator('[data-itemon="k1"]').check(); await w(350);
    // o nível mínimo: só com a Katana de gelo Nv 3 ou mais
    await P.locator('[data-itemed="ba"]').click(); await w(250);
    const opsNv = await P.locator('[data-itreqnv="ba"][data-i="0"] option').allInnerTexts();
    ok(j(opsNv) === j(['qualquer nível', 'Nv 2 ou mais', 'Nv 3 ou mais']) && await P.locator('[data-itreqnv="ba"][data-i="1"]').count() === 0, 'a katana com níveis ganha a escolha do nível mínimo (a outra, comum, não): ' + j(opsNv));
    await P.locator('[data-itreqdel="ba"][data-i="1"]').click(); await w(300);
    ok((await item('ba')).req === 'i:k1' && await P.evaluate(() => document.activeElement && document.activeElement.dataset.itemreq === 'ba'), 'o × tira um (sobrando um, volta a ser um texto)');
    await P.locator('[data-itreqnv="ba"][data-i="0"]').selectOption('3'); await w(300);
    ok((await item('ba')).req === 'i:k1@3' && (await calc()).DES === 1, '"Nv 3 ou mais" (a katana está no Nv 3: a Bainha vale, DES +1)');
    await P.locator('[data-itemed="ba"]').click(); await w(200);
    await P.locator('[data-itnv="k1"][data-d="-1"]').click(); await w(350);
    ok((await calc()).DES === 0 && (await P.locator('[data-itcard="ba"] .itreq').innerText()).replace(/\s+/g, ' ').trim() === 'sem efeito · Katana de gelo (Nv 3 ou mais)' && await P.locator('[data-itcard="ba"].semfx').count() === 1,
      'a katana no Nv 2: a Bainha fica "sem efeito" (e o cartão diz o nível que falta)');
    await P.locator('[data-itnv="k1"][data-d="1"]').click(); await w(350);
    ok((await calc()).DES === 1 && await P.locator('[data-itcard="ba"].semfx').count() === 0, 'de volta ao Nv 3, ela vale de novo');
    await foto('fichas7-requisitos');
  });

  await passo('o item novo com o filtro de um tipo', async () => {
    await P.locator('[data-itfil="t:acessorio"]').click(); await w(150);
    await P.locator('#painelItens [data-act="additem"]').click(); await w(300);
    await P.keyboard.type('Amuleto de jade'); await w(250);
    const novo = (await dain()).itens.slice(-1)[0];
    ok(novo.nome === 'Amuleto de jade' && novo.tipo === 'acessorio' && await P.locator('[data-itcard="' + novo.id + '"]').isVisible(), 'com "Acessórios" no filtro, o item novo já vem acessório (e aparece)');
    await P.locator('[data-itemdel="' + novo.id + '"]').click(); await w(250);
    await P.locator('[data-itfil="limpar"]').click(); await w(150);
  });

  await passo('tela estreita', async () => {
    await P.setViewportSize({ width: 390, height: 860 }); await w(400);
    await P.locator('#painelItens').scrollIntoViewIfNeeded();
    // (a página das fichas já é mais larga que 390 px; aqui, o painel dos equipamentos não passa da largura dele)
    const fora = await P.evaluate(() => { const pn = document.getElementById('painelItens'), r = pn.getBoundingClientRect(); return [...pn.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && b.right > r.right + 1 && !e.closest('[hidden]'); }).map(e => e.className).slice(0, 5); });
    ok(fora.length === 0, 'no celular, nada passa da largura do painel dos equipamentos: ' + j(fora));
    await foto('fichas7-celular');
    await P.setViewportSize({ width: 1320, height: 960 }); await w(300);
  });

  const inesperados = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 8).join('\n'));
  ok(inesperados.length === 0, 'sem erros no console');
  await t.close();
  end();
})();
