// A busca rápida (lote 7, parte 6) pela casca, sem mesa (o que os sistemas guardaram neste navegador):
//   · a lupa da barra e o Ctrl+K (na casca e de dentro de um sistema) abrem a janela; Esc fecha; a busca de antes volta
//     marcada;
//   · digitar acha sem acento, em grupos (primeiro o grupo do que mais se parece), com ↑↓ e Enter ou o mouse;
//   · escolher vai direto: a ficha, o item (nos equipamentos e na bolsa), o marcador e a facção do Mapa-múndi, a matéria
//     publicada e a do rascunho do Jornal, a receita da Meditação e a cena;
//   · a janela fica presa em cima (o campo não sai do lugar enquanto a lista muda) e cabe na tela estreita.
// (Numa mesa, o que o jogador acha e o que não acha: src/tests/busca.rede.test.js.)
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const N = require('../../mundo/nucleo.js');
const j = JSON.stringify;
const espera = ms => new Promise(r => setTimeout(r, ms));
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }

const pc = (id, nome, extra) => Object.assign({ id, nome, raca: 'Humano', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 5, tiers: { FOR: 'A', DES: 'C', AGI: 'D', VIT: 'B', CAN: 'E' }, pctProprio: null,
  poderes: [], skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 10, DFM: 4 }, rol: { fixa: 20, fonte: 'total' }, ultRol: null,
  disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 }, estaque: { a: '', b: '' }, habilidades: [], itens: [], bolsa: [],
  recursos: [{ id: 'hp' + id, nome: 'HP', fml: 'VIT*8 + LVL*5' }], notas: '', estado: {} }, extra || {});
// muitos itens antes do que a busca vai pedir: o cartão dele fica bem abaixo, e a busca precisa rolar até ele
const enchimento = Array.from({ length: 14 }, (_, i) => ({ id: 'enc' + i, nome: 'Corda ' + (i + 1), equipado: false, bonus: {} }));
const fichas = j({ v: 1, cfg: R.cfgPadrao(), situacoes: [], tabelas: [], log: [], bib: null, sel: 'npc_ogro', selSit: null, aba: 'fichas', grupos: [],
  personagens: [
    pc('npc_ogro', 'Ogro da Ponte', { itens: [{ id: 'i9', nome: 'Clava', equipado: true, bonus: { FOR: 2 } }] }),
    pc('pc_dain', 'Dáin Escudo', { itens: enchimento.concat([{ id: 'i1', nome: 'Escudo de carvalho', equipado: true, bonus: { VIT: 3 } }]),
      bolsa: [{ id: 'b1', t: 'material', nome: 'Pena de grifo', qtd: 1, fx: [], nota: '' }, { id: 'b2', t: 'pocao', nome: 'Poção de cura', qtd: 2, fx: [], nota: '' }] }),
  ] });
const mapa = N.mapaNovo('Urgm');
const vila = Object.assign(N.objNovo('m', { x: 300, y: 200 }), { nome: 'Vila do Dain' });
const covil = Object.assign(N.objNovo('m', { x: 900, y: 600 }), { nome: 'Covil das Sombras', oculto: true });
const fac = N.faccaoNova('Guilda dos Ratos', 0);
mapa.objs.push(vila, covil); mapa.faccoes.push(fac);
const ilhas = N.mapaNovo('Ilhas'), liga = N.faccaoNova('Liga do Mar', 1);
ilhas.faccoes.push(liga);
const mundo = j({ atual: mapa.id, mapas: { [mapa.id]: mapa, [ilhas.id]: ilhas } });
const materia = (id, tit) => ({ id, tit, txt: 'Texto de ' + tit + '.', ass: '', dest: false });
const pub = j({ nome: 'O Arauto', clima: { t: '', frase: '' }, materias: [materia('mt1', 'Dragão visto em Urgm'), materia('mt3', 'Feira de outono')], notas: [], cartas: [], data: '', em: '2026-10-17T12:00:00.000Z', n: 1 });
const ras = j({ nome: 'O Arauto', clima: { t: '', frase: '' }, materias: [materia('mt1', 'Dragão visto em Urgm'), materia('mt3', 'Feira de outono'), materia('mt2', 'O golpe no palácio')], notas: [], cartas: [] });
const medit = j({ 'medit:receitas': { v: 1, lista: [{ id: 'rc_vento', nome: 'Vento leste', seq: [], efeito: '', onde: null, quem: null }, { id: 'rc_chama', nome: 'Chama interior', seq: [], efeito: 'Aquece.', onde: null, quem: null }] } });

(async () => {
  const t = await start();
  const seed = { urgm_calc_atributos_v1: fichas, 'tinycats:mundo:v1': mundo, 'tinycats:jornal:pub': pub, 'tinycats:jornal:rascunho': ras, 'tinycats:jornal:modo': 'ver',
    'tinycats:meditacao:local': medit, 'tinycats:aba': 'jornal', 'tinycats:mundo:painel': j({ aba: 'hoje' }) };
  const dv = await t.device({ name: 'busca', w: 1300, h: 860, seed });
  const P = dv.page;
  P.setDefaultTimeout(8000);
  const foto = async nome => { if (process.env.TC_SCRATCH) await P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };
  const quadro = async re => { for (let i = 0; i < 60; i++) { const f = P.frame({ url: re }); if (f) return f; await espera(250); } return null; };
  const ate = async (fn, ms = 10000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura carregando */ } if (Date.now() - t0 > ms) return false; await espera(200); } };
  const janela = () => P.locator('dialog.busca[open]');
  const aberta = async () => (await janela().count()) === 1;
  const opcoes = () => P.locator('#buscaLista .bu-r');
  const nomes = async () => (await opcoes().locator('b').allInnerTexts());
  const marcada = async () => (await P.locator('#buscaLista .bu-r[aria-selected="true"] b').allInnerTexts()).join('|');
  const abaAtual = () => P.evaluate(() => (document.querySelector('.tab[aria-selected="true"]') || {}).id || '');
  async function buscar(txt) {
    if (!(await aberta())) { await P.click('#btnBusca'); await espera(150); }
    await P.fill('#buscaQ', txt); await espera(150);
  }
  async function escolher(txt, nome) {
    await buscar(txt);
    await opcoes().filter({ has: P.locator('b', { hasText: nome }) }).first().click();
    await espera(300);
  }

  await P.goto(t.base + '?debug', { waitUntil: 'load' });
  ok(await ate(async () => !!(await quadro(/\/jornal\//)) && await P.locator('#btnBusca').isVisible()), 'a casca abre sem mesa, com a lupa na barra');

  await passo('a janela', async () => {
    const tt = await P.getAttribute('#btnBusca', 'title');
    ok(/Buscar \((Ctrl\+K|⌘K)\)/.test(tt), 'a lupa diz o atalho: ' + tt);
    await P.click('#btnBusca'); await espera(200);
    const dica = await P.locator('#buscaLista').innerText();
    ok(await aberta() && await P.evaluate(() => document.activeElement && document.activeElement.id === 'buscaQ') && /as cenas/.test(dica) && /o que tem nome no Mapa-múndi/.test(dica) && /as receitas da Meditação/.test(dica),
      'a lupa abre a janela com o cursor no campo e a dica do que ela acha (sem mesa, tudo): ' + dica);
    await P.keyboard.press('Escape'); await espera(200);
    ok(!(await aberta()), 'Esc fecha');
    await P.keyboard.press('Control+k'); await espera(200);
    ok(await aberta(), 'Ctrl+K na casca abre');
    await P.keyboard.press('Escape'); await espera(200);
  });

  await passo('achar', async () => {
    await buscar('');
    const y0 = (await P.locator('#buscaQ').boundingBox()).y;
    await P.fill('#buscaQ', 'dain'); await espera(200);
    const n = await nomes(), grupos = await P.locator('#buscaLista .bu-g').allTextContents();
    ok(n[0] === 'Dáin Escudo' && n.includes('Vila do Dain') && n.includes('Escudo de carvalho') && !n.includes('Covil das Sombras') && grupos[0] === 'Fichas e NPCs' && grupos.includes('Mapa-múndi'),
      'sem acento, em grupos: a ficha primeiro, o marcador e o item de quem tem "Dain": ' + j(n) + ' ' + j(grupos));
    ok(await marcada() === 'Dáin Escudo', 'o primeiro vem marcado');
    const y1 = (await P.locator('#buscaQ').boundingBox()).y;
    ok(Math.abs(y1 - y0) < 1, 'a janela fica presa em cima: o campo não sai do lugar quando a lista cresce (' + y0 + ' → ' + y1 + ')');
    await foto('busca-1300');
    await P.keyboard.press('ArrowDown'); await espera(100);
    const seg = await marcada();
    await P.keyboard.press('ArrowUp'); await espera(100);
    ok(seg !== 'Dáin Escudo' && seg === n[1] && await marcada() === 'Dáin Escudo', '↓ e ↑ andam pela lista: ' + seg);
    await P.keyboard.press('ArrowUp'); await espera(100);
    ok(await marcada() === 'Dáin Escudo', 'no começo, ↑ não sai da lista');
    await P.fill('#buscaQ', 'escudo'); await espera(150);
    const g2 = await P.locator('#buscaLista .bu-g').allTextContents();
    ok(g2[0] === 'Itens' && (await nomes())[0] === 'Escudo de carvalho' && await marcada() === 'Escudo de carvalho' && g2.includes('Fichas e NPCs'),
      'o grupo do que mais se parece vem primeiro ("Escudo de carvalho" começa com a palavra; "Dáin Escudo" só a tem no meio): ' + j(g2));
    await P.fill('#buscaQ', 'COVIL'); await espera(150);
    ok(/Nada com “COVIL”/.test(await P.locator('#buscaLista').innerText()) || (await nomes()).includes('Covil das Sombras'), '(sem mesa, cada um é o próprio mestre)');
    await P.fill('#buscaQ', 'xyzzy'); await espera(150);
    ok(/Nada com “xyzzy”\./.test(await P.locator('#buscaLista').innerText()) && (await opcoes().count()) === 0, 'sem resultado: "Nada com…"');
  });

  await passo('a ficha e os itens', async () => {
    await buscar('dain'); await P.keyboard.press('Enter'); await espera(500);
    const F = await quadro(/\/fichas\//);
    ok(!(await aberta()) && await abaAtual() === 'tab-fichas' && await ate(async () => (await F.evaluate(() => S.sel)) === 'pc_dain'), 'Enter abre a ficha escolhida na aba Fichas');
    // o item escondido pelo filtro "Guardados", com a seção dele recolhida
    await F.locator('#ficha [data-abaficha="bolsas"]').click(); await espera(200);       // (lote 16: os itens ficam na aba Bolsas e itens)
    await F.locator('[data-itfil="e:off"]').click(); await espera(200);
    await F.evaluate(() => { S.itFechadas = ['-']; render(); }); await espera(200);
    ok(await F.locator('[data-itcard="i1"]').isHidden(), '(o item está escondido: o filtro e a seção recolhida)');
    await F.evaluate(() => window.scrollTo(0, 0)); await espera(150);         // (a ficha volta para o alto: o item fica bem abaixo)
    await F.locator('#ficha [data-abaficha="atributos"]').click(); await espera(200);   // (e noutra aba: a busca abre a de Bolsas e itens)
    await escolher('escudo de carv', 'Escudo de carvalho');
    const card = F.locator('[data-itcard="i1"]');
    ok(await ate(async () => await card.isVisible()) && !(await F.evaluate(() => (S.itFechadas || []).includes('-'))) && (await F.locator('[data-itfil="e:off"]').getAttribute('aria-pressed')) === 'false',
      'o item escondido: o filtro sai e a seção dele abre');
    ok(await ate(async () => (await card.getAttribute('class')).includes('achado')) && await card.isVisible() && await F.evaluate(() => { const r = document.querySelector('[data-itcard="i1"]').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }),
      'o item: o cartão dele aparece na tela, marcado por um instante');
    ok(await ate(async () => !(await card.getAttribute('class')).includes('achado'), 5000), 'a marca sai sozinha');
    await escolher('pena de', 'Pena de grifo');
    ok(await ate(async () => (await F.locator('[data-bolrow="b1"]').getAttribute('class') || '').includes('achado')) && await F.evaluate(() => S.abaBolsa) === 'material',
      'o que está na bolsa: a aba do tipo dele (Materiais) abre e a linha aparece marcada');
    await escolher('pocao', 'Poção de cura');
    ok(await ate(async () => (await F.locator('[data-bolrow="b2"]').getAttribute('class') || '').includes('achado')) && await F.evaluate(() => S.abaBolsa) === 'pocao', 'e a poção, na aba das poções');
    // Ctrl+K de dentro do sistema
    // Esc fecha mesmo com o que foi digitado no campo (o Esc do navegador só o apagaria)
    await buscar('pocao');
    await P.keyboard.press('Escape'); await espera(200);
    ok(!(await aberta()), 'Esc fecha a janela mesmo com algo digitado');
    await F.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {});
    await F.focus('body').catch(() => {});
    await P.keyboard.press('Control+k'); await espera(300);
    ok(await aberta() && await P.evaluate(() => document.activeElement && document.activeElement.id === 'buscaQ'), 'Ctrl+K de dentro de um sistema abre a busca da casca');
    ok((await P.inputValue('#buscaQ')) === 'pocao' && await P.evaluate(() => { const c = document.getElementById('buscaQ'); return c.selectionStart === 0 && c.selectionEnd === c.value.length; }), 'a busca de antes volta, marcada (digitar troca)');
    await P.keyboard.press('Escape'); await espera(150);
  });

  await passo('o Mapa-múndi', async () => {
    await buscar('dain'); await espera(100);
    await P.keyboard.press('ArrowDown'); await espera(100);
    ok(await marcada() === 'Vila do Dain', '(↓: a vila)');
    await P.keyboard.press('Enter'); await espera(400);
    const W = await quadro(/\/mundo\//);
    ok(await ate(async () => await W.evaluate(id => window.__mundo && __mundo.App.pronto && (__mundo.App.sel || []).join() === id, vila.id)) && await abaAtual() === 'tab-mundo',
      'Enter abre o marcado (o segundo): o Mapa-múndi abre com o marcador selecionado');
    ok(await ate(async () => (await W.locator('#tab-selecao').getAttribute('aria-selected')) === 'true'), 'e o painel mostra a Seleção');
    await escolher('guilda', 'Guilda dos Ratos');
    ok(await ate(async () => (await W.locator('#tab-faccoes').getAttribute('aria-selected')) === 'true' && (await W.locator(`[data-fac="${fac.id}"]`).getAttribute('aria-expanded')) === 'true'),
      'a facção: a aba Facções, com ela aberta');
    await escolher('liga do', 'Liga do Mar');
    ok(await ate(async () => await W.evaluate(id => __mundo.App.mapa && __mundo.App.mapa.id === id, ilhas.id) && (await W.locator(`[data-fac="${liga.id}"]`).getAttribute('aria-expanded')) === 'true'),
      'a facção de outro mapa: o mapa troca e ela abre na aba Facções');
  });

  await passo('o Jornal', async () => {
    await escolher('golpe', 'O golpe no palácio');
    const J = await quadro(/\/jornal\//);
    ok(await ate(async () => (await J.locator('#ed [data-mat="mt2"]').getAttribute('class') || '').includes('achado')) && await J.evaluate(() => localStorage.getItem('tinycats:jornal:modo')) === 'escrever',
      'a matéria do rascunho: o Jornal no modo de escrever, com o cartão dela marcado');
    await escolher('feira', 'Feira de outono');
    ok(await ate(async () => (await J.locator('#leitura [data-mat="mt3"]').getAttribute('class') || '').includes('achado')) && await J.evaluate(() => localStorage.getItem('tinycats:jornal:modo')) === 'noar',
      'a publicada: o jornal como os jogadores o leem, com a matéria marcada');
  });

  await passo('a Meditação', async () => {
    await escolher('chama', 'Chama interior');
    const M = await quadro(/\/meditacao\//);
    ok(await ate(async () => (await M.locator('.receita.sel[data-rc="rc_chama"]').count()) === 1 && (await M.locator('[data-vista="receitas"]').getAttribute('aria-pressed')) === 'true') && await abaAtual() === 'tab-meditacao',
      'a receita: "Receitas e símbolos", com ela aberta no editor');
  });

  await passo('as Cenas', async () => {
    await P.click('#tab-cenas'); await espera(300);
    const C = await quadro(/\/cenas\//);
    ok(await ate(async () => await C.evaluate(() => !!window.__tc && !!__tc.Store.S.current), 20000), '(as Cenas abrem)');
    const id = await C.evaluate(() => { const sc = __tc.newScene('Taverna do Javali'); __tc.Store.addScene(sc); __tc.Persist.scene(sc.id); __tc.Persist.meta(); return sc.id; });
    ok(await ate(async () => (await P.evaluate(() => localStorage.getItem('tinycats:cenas:lista') || '')).includes('Taverna do Javali')), '(a cena nova entra na lista deste navegador)');
    await P.click('#tab-jornal'); await espera(300);
    await escolher('javali', 'Taverna do Javali');
    ok(await ate(async () => await C.evaluate(id => __tc.Store.S.current === id, id)) && await abaAtual() === 'tab-cenas', 'a cena: as Cenas abrem nela');
  });

  await passo('tela estreita', async () => {
    await P.setViewportSize({ width: 400, height: 800 }); await espera(300);
    ok(await P.locator('#btnBusca').isVisible() && await P.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no celular, a lupa continua na barra');
    await buscar('a');
    const caixa = await P.locator('dialog.busca').boundingBox();
    ok(caixa.x >= 0 && caixa.x + caixa.width <= 400 && await P.evaluate(() => { const l = document.getElementById('buscaLista'); return l.scrollWidth <= l.clientWidth + 1; }), 'a janela cabe na tela estreita');
    await foto('busca-400');
    await P.keyboard.press('Escape');
  });

  const inesperados = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 8).join('\n'));
  ok(inesperados.length === 0, 'sem erros no console');
  await t.close();
  end();
})();
