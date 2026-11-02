// Clã → Cenas (lote 59), numa mesa de verdade (o banco local de ensaio): o mestre (Bruno) puxa os membros de um clã
// para a cena:
//   · o botão "Puxar o clã…" (no painel, sem nada selecionado) abre a lista do clã, todos marcados;
//   · "Trazer" cria um token por membro, com o nome (o da ficha ligada, para quem tem) e a borda na cor do brasão;
//   · a foto enviada no Clã vira a imagem do token (sobe para o banco e entra quando chega);
//   · um Desfazer tira todos.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
// uma foto pequena (um quadrado vermelho de 8 × 8, PNG)
const FOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGM4Y+yCFTEMLQkAr5lQwWMa+ZsAAAAASUVORK5CYII=';

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', w: 1440, h: 950, seed: { 'tinycats:aba': 'cenas', 'tinycats-tour': '1' } })).page;
  const w = ms => M.waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = () => M.evaluate(() => TC.dados.pendentes === 0);
  const foto = async nome => { if (process.env.TC_SCRATCH) await M.screenshot({ path: require('path').join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };
  const errosDeFora = () => t.errs.filter(e => !/status of (400|401|409)/.test(e));

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Clã tokens 59 ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  let apagada = false;
  try {
    await M.evaluate(foto => {
      const f = TC.rules.personagemPadrao('Selene', 'pc_selene');
      TC.dados.col('personagens').gravar('pc_selene', { nome: 'Selene Vael', ficha: f, skills: { arvores: [], pontos: {}, alocados: {} }, estado: {}, dono_id: null, vis: 'mesa', ordem: 0 });
      TC.dados.col('documentos').gravar('cla:c:cl1', { vis: 'mestre', dados: { v: 1, nome: 'Lâmina do Crepúsculo', jogadores: false, ver: {}, ordem: 0, brasao: { forma: 'escudo', cores: ['#aa3344', '#ffffff'] },
        cargos: { lider: { nome: 'Líder', pai: null, ordem: 0, gente: [{ id: 'p1', pc: 'pc_selene', nome: 'Selene' }] } },
        membros: { avulsos: [{ id: 'p2', nome: 'Oswin' }, { id: 'p3', nome: 'Tomas' }], dados: { p2: { racaN: 'Humano', img: foto } } } } });
    }, FOTO);
    ok(await ate(() => parado()), '(a Selene e o clã sobem para a mesa)');
    await M.locator('#tab-cenas').click();
    let C = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && !!__tc.Store.scene() && __tc.Nuvem.modo() === 'mestre' && !!window.ClaNucleo && __tc.MembrosCla.clas().length === 1); }, 40000), '(o mestre abre as Cenas da mesa, com o clã)');
    // (a janela que abre sozinha nas Cenas, se houver, sai antes)
    for (let k = 0; k < 4 && await C.locator('#layer .scrim').count(); k++) { await C.locator('#layer .modal').first().focus().catch(() => {}); await M.keyboard.press('Escape'); await w(300); }
    const aviso = await C.evaluate(() => (document.querySelector('#layer .modal') || {}).innerText || '');
    if (aviso) console.log('janela aberta: ' + aviso.slice(0, 120));
    await C.evaluate(() => { __tc.setSel([]); __tc.UI.openTab('sel'); }); await w(300);
    await C.locator('#sel-cla').click(); await w(400);
    const itens = await C.locator('#mc-lista .area-row').allInnerTexts();
    ok(itens.length === 3 && /Selene Vael/.test(itens.join(' ')) && /Líder/.test(itens.join(' ')) && /sem cargo/.test(itens.join(' ')) && /3 de 3 marcados/.test(await C.locator('#mc-conta').innerText()),
      '“Puxar o clã…”: a lista do clã (o nome da ficha, o cargo), todos marcados — ' + j(itens));
    ok(await C.locator('#mc-lista .av').nth(1).evaluate(e => /url\(/.test(e.style.backgroundImage)), 'a foto do Oswin na lista');
    await C.locator('#mc-on-2').uncheck(); await w(150);
    await foto('l59-puxar-cla');
    await C.locator('.modal .btn.primary').last().click(); await w(500);
    const toks = () => C.evaluate(() => __tc.Store.scene().tokens.map(x => ({ id: x.id, n: x.name, cor: x.color, img: x.img || null })));
    let ts = await toks();
    ok(ts.length === 2 && ts.some(x => x.n === 'Selene Vael') && ts.some(x => x.n === 'Oswin') && ts.every(x => x.cor === '#aa3344'), 'dois tokens (o Tomas ficou de fora), com o nome e a cor do brasão — ' + j(ts.map(x => [x.n, x.cor])));
    ok(await ate(async () => { ts = await toks(); const o = ts.find(x => x.n === 'Oswin'); return !!(o && o.img); }, 30000), 'a foto do Oswin vira a imagem do token');
    await w(800); await foto('l59-tokens-cla');
    await C.evaluate(() => __tc.Tools.undo()); await w(400);
    ok((await toks()).length === 0 || (await toks()).every(x => x.n !== 'Selene Vael'), 'um Desfazer tira os tokens');
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = errosDeFora();
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})();
