// Bateria do lote 39 nas Cenas (a página do site, sem mesa): os objetos novos.
//   · a ferramenta Objetos: as quatro categorias novas (Masmorra e chefe, Clã e sede, Linhagens, Viagem e acampamento),
//     oito objetos em cada; cada um com o seu tamanho; o cristal brilha parado (a luz não tremula), as chamas tremulam;
//   · o painel do objeto com cores (o brasão, o estandarte, a mesa de guerra, o quadro de missões, o atril): a cor
//     principal e a segunda, com Desfazer; "Voltar às cores de sempre"; as cores e o desenho do brasão conferidos ao
//     carregar a cena (o que não vale sai) e indo para os jogadores;
//   · a sede do clã: os estandartes do portão e os objetos de dentro saem com as cores e o desenho do brasão;
//   · os lugares gerados: as masmorras (a jaula, os grilhões, a alavanca, os crânios, o cofre, o caixão, o caldeirão), as
//     arenas (os candelabros e o cálice da cripta, o totem e as ossadas da clareira, os ídolos do fosso, o caldeirão do
//     pântano, os crânios do Rei Rato) e o acampamento abandonado (os sacos de dormir, a mochila, a lenha).
// FOTOS=<pasta> guarda a vitrine dos objetos, a barra, o painel e a sede.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
const j = JSON.stringify;
const S = require('../../../tc/sede.js');
const NOVOS = {
  masmorra: ['jaula', 'grilhoes', 'mesaTortura', 'alavanca', 'tronoOssos', 'cranios', 'cristal', 'caldeirao'],
  cla: ['brasao', 'mesaGuerra', 'quadroMissoes', 'cofre', 'trofeu', 'boneco', 'alvo', 'atril'],
  linhagem: ['caixao', 'calice', 'candelabro', 'ossada', 'garras', 'totemLobo', 'circulo', 'idolo'],
  viagem: ['barraca', 'carroca', 'cerca', 'sacoDormir', 'mochila', 'tripe', 'lenha', 'bote'],
};
const BRASAO = { cores: ['#5b3f8a', '#e8eaf0'], div: 'cortado', f: 'M6 6H94V58C94 92 50 114 50 114C50 114 6 92 6 58Z', s: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z', fl: false };

(async () => {
  const t = await open({ w: 1360, h: 900, root: path.join(__dirname, '..', '..', '..'), file: 'cenas/index.html' });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 160);
  const foto = async nome => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const toasts = () => ev(() => Array.from(document.querySelectorAll('.toast')).map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  await w(500);

  // ---------- 1) o catálogo e a barra da ferramenta ----------
  await passo('o catálogo', async () => {
    const c = await ev(N => { const P = __tc.Props.P; return Object.fromEntries(Object.entries(N).map(([g, ids]) => [g, ids.map(id => P[id] ? (P[id].g === g ? 1 : 'g:' + P[id].g) : 'falta:' + id)])); }, NOVOS);
    ok(Object.values(c).every(l => l.every(x => x === 1)), 'os 32 objetos novos, cada um na categoria dele: ' + j(c));
    const tam = await ev(() => ['mesaTortura', 'tronoOssos', 'mesaGuerra', 'caixao', 'circulo', 'barraca', 'carroca', 'bote'].map(k => __tc.Props.P[k].size));
    ok(tam.every(s => s === 2), 'os grandes ocupam dois quadrados (a mesa de tortura, o trono de ossos, a mesa de guerra, o caixão, o círculo, a barraca, a carroça, o bote)');
    const desenha = await ev(N => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const out = []; for (const id of Object.values(N).flat()) { try { __tc.Props.thumb(cv, id, 1.3); } catch (e) { out.push(id + ': ' + e.message); } } return out; }, NOVOS);
    ok(desenha.length === 0, 'todos se desenham (a miniatura): ' + desenha.join(' ¶ '));
  });
  await passo('a barra', async () => {
    await ev(() => { const { Store, App, setSel } = __tc; Store.tx('preparar', () => Store.scn({ cols: 30, rows: 20, light: 'penumbra' })); setSel([]); App.view.z = 1; __tc.Render.fit(); });
    await page.keyboard.press('j'); await w(250);
    const cats = await page.locator('#o-oc .seg-b').allInnerTexts();
    ok(cats.length === 8 && j(cats.slice(4)) === j(['Masmorra e chefe', 'Clã e sede', 'Linhagens', 'Viagem e acampamento']), 'a barra da ferramenta Objetos tem oito categorias: ' + cats.join(' / '));
    for (const [g, nome] of [['masmorra', 'Masmorra e chefe'], ['cla', 'Clã e sede'], ['linhagem', 'Linhagens'], ['viagem', 'Viagem']]) {
      await page.locator('#o-oc .seg-b', { hasText: nome }).click(); await w(150);
      const ids = await page.locator('.o-obj').evaluateAll(l => l.map(b => b.id.replace('o-obj-', '')));
      ok(j(ids) === j(NOVOS[g]), nome + ': os oito objetos — ' + ids.join(', '));
      if (g === 'linhagem') await foto('l39-barra-linhagens');
    }
    // pôr o cristal e o candelabro: o cristal brilha parado, a chama do candelabro tremula
    await page.locator('#o-oc .seg-b', { hasText: 'Masmorra e chefe' }).click(); await w(120);
    await page.locator('#o-obj-cristal').click(); await w(80);
    const tela = async (x, y) => { const box = await page.locator('#cv').boundingBox(), p = await ev(([x, y]) => __tc.Render.toScreen(x, y), [x, y]); return [box.x + p[0], box.y + p[1]]; };
    const C = await ev(() => __tc.Store.scene().cell);
    { const p = await tela(3.5 * C, 3.5 * C); await page.mouse.click(p[0], p[1]); await w(200); }
    await page.locator('#o-oc .seg-b', { hasText: 'Linhagens' }).click(); await w(120);
    await page.locator('#o-obj-candelabro').click(); await w(80);
    { const p = await tela(6.5 * C, 3.5 * C); await page.mouse.click(p[0], p[1]); await w(200); }
    const l = await ev(() => __tc.Store.scene().tokens.filter(k => k.prop === 'cristal' || k.prop === 'candelabro').map(k => [k.prop, k.light.on, !!k.light.fl, k.light.c]));
    ok(j(l) === j([['cristal', true, false, '#9fd8ff'], ['candelabro', true, true, '#ffb8a0']]), 'o cristal brilha parado; a chama do candelabro tremula: ' + j(l));
    await page.keyboard.press('Escape'); await w(150);
  });

  // ---------- 2) as cores do objeto ----------
  await passo('as cores', async () => {
    const id = await ev(() => { const { Store, Props } = __tc, sc = Store.scene(), t = Props.novo(sc, 'brasao', 10 * sc.cell, 2 * sc.cell, 1, false); Store.tx('brasão', () => Store.add('tokens', t)); return t.id; });
    await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, id); await w(250);
    ok(await page.locator('#s-propcor').count() === 1 && await page.locator('#pr-c1').inputValue() === '#24305e' && await page.locator('#pr-c2').inputValue() === '#d9a441' && await page.locator('#pr-cor-0').count() === 0,
      'o painel do brasão: a seção Cores, com as de sempre (e sem "Voltar")');
    await page.locator('#pr-c1').evaluate(el => { el.value = '#8a2a2a'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }); await w(200);
    ok(j(await ev(id => __tc.Store.get('tokens', id).cores, id)) === j(['#8a2a2a', '#d9a441']), 'trocar a cor principal muda o objeto');
    await ev(() => __tc.Tools.undo()); await w(200);
    ok(!Array.isArray(await ev(id => __tc.Store.get('tokens', id).cores, id)), 'o Desfazer volta às cores de antes');
    await ev(id => __tc.Store.tx('cores', () => __tc.Store.upd('tokens', id, { cores: ['#2f6b45', '#e8eaf0'] })), id);
    await ev(id => { __tc.setSel([]); __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, id); await w(250);
    await page.locator('#pr-cor-0').click(); await w(200);
    ok(!Array.isArray(await ev(id => __tc.Store.get('tokens', id).cores, id)), '"Voltar às cores de sempre"');
    // ao carregar: só as cores e o desenho que valem; no objeto sem cores, nada
    const norm = await ev(() => {
      const { Store, Props, normalizeScene } = __tc, sc = Store.scene(), c = sc.cell;
      const a = Object.assign(Props.novo(sc, 'brasao', 0, 0, 1, false), { cores: ['#ABCDEF', '#000000'], bras: { div: 'Xadrez!', f: 'M0 0L10 10Z', s: 'javascript:alert(1)', fl: 'sim', dp: 'javascript:x', st: [1, 2] } });      // (lote 45: a divisão é um nome; dp e st conferidos)
      const b = Object.assign(Props.novo(sc, 'barril', c, 0, 1, false), { cores: ['#ffffff', '#000000'], bras: { div: 'liso' } });
      const d = Object.assign(Props.novo(sc, 'estandarte', 2 * c, 0, 1, false), { cores: ['red', '#000000'] });
      const x = normalizeScene(Object.assign(JSON.parse(JSON.stringify(sc)), { tokens: JSON.parse(JSON.stringify([a, b, d])) }));
      return x.tokens.map(k => [k.prop, k.cores || null, k.bras || null]);
    });
    ok(j(norm) === j([['brasao', ['#abcdef', '#000000'], { div: 'partido', f: 'M0 0L10 10Z', s: null, fl: false, dp: null, st: null }], ['barril', null, null], ['estandarte', null, null]]), 'ao carregar, o que não vale sai (a divisão, o símbolo que não é desenho, as cores do barril, a cor sem #): ' + j(norm));
  });

  // ---------- 3) a sede do clã ----------
  await passo('a sede', async () => {
    const sede = S.sedeNova();
    sede.W = 36; sede.H = 28; sede.terreno = 'campo';
    const p = S.predioNovo('salao', 2, 10, 3, 11); p.x = 10; p.y = 3; sede.predios.push(p);
    sede.estruturas.push({ id: 'mu1', k: 'muralha', pts: [[1, 27], [35, 27]] }, { id: 'pt1', k: 'portao', x: 16, y: 26 });
    const s = S.normSede(sede);
    const r = await ev(([sd, br]) => __tc.SedeCenas.aplicar({ cla: 'cl_lote39', nome: 'Garret', sede: sd, ir: 'fora', brasao: br }), [s, BRASAO]);
    await w(700);
    ok(r && r.criadas.length >= 2, 'a sede criada (' + (r ? r.criadas.length : 0) + ' cenas)');
    const fora = await ev(() => __tc.Store.scene().tokens.filter(k => k.prop === 'estandarte').map(k => [k.cores, !!(k.bras && k.bras.s)]));
    ok(fora.length === 2 && fora.every(([c, s]) => j(c) === j(['#5b3f8a', '#e8eaf0']) && s), 'os dois estandartes do portão, nas cores do brasão e com o símbolo: ' + j(fora));
    await ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
    await foto('l39-sede-fora');
    const dentro = await ev(() => { const sc = Object.values(__tc.Store.S.scenes).find(x => /^sede-cl_lote39-.*-t$/.test(x.id)); __tc.UI.switchScene(sc.id); return sc.tokens.filter(k => __tc.Props.P[k.prop] && __tc.Props.P[k.prop].cores).map(k => [k.prop, j(k.cores)]); function j(x) { return JSON.stringify(x); } });
    await w(600);
    await ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
    ok(dentro.length >= 1 && dentro.every(([, c]) => c === j(['#5b3f8a', '#e8eaf0'])), 'dentro, os objetos com cores (o estandarte, o brasão…) nas cores do clã: ' + j(dentro));
    await foto('l39-sede-salao');
    // o que vai para os jogadores leva as cores e o desenho
    const pub = await ev(() => { const sc = __tc.Store.scene(), r = __tc.Proj.projetar(sc, __tc.Store.S.assets, new Set()); const toks = (r.v && r.v.tokens) || (r.m && r.m.tokens) || []; return toks.filter(k => k.prop === 'estandarte' || k.prop === 'brasao').map(k => !!k.cores && !!k.bras); });
    ok(pub.length >= 1 && pub.every(Boolean), 'os jogadores recebem as cores e o desenho: ' + j(pub));
    // os móveis da Sede existem todos nas Cenas (os novos também)
    ok(await ev(() => Object.keys(window.TC.sede.MOVEIS).every(k => !!__tc.Props.P[k])), 'todo móvel da Sede existe nas Cenas');
  });

  // ---------- 4) os lugares gerados ----------
  await passo('as masmorras', async () => {
    const r = await ev(() => {
      const { Masmorra } = __tc, conta = {};
      for (const tipo of ['pedra', 'cripta', 'esgoto', 'fortaleza', 'templo']) for (let seed = 1; seed <= 14; seed++) {
        const p = Masmorra.gerar({ tipo, tamanho: 'medio', seed });
        for (const o of p.objetos) conta[o.id] = (conta[o.id] || 0) + 1;
      }
      return conta;
    });
    const quer = ['jaula', 'grilhoes', 'alavanca', 'cranios', 'cofre', 'caixao', 'caldeirao'];
    ok(quer.every(k => r[k] > 0), 'nas masmorras geradas (70), os objetos novos aparecem: ' + quer.map(k => k + ' ' + (r[k] || 0)).join(', '));
  });
  await passo('as arenas', async () => {
    const r = await ev(() => {
      const { Masmorra } = __tc, ids = tipo => Masmorra.gerar({ tipo: 'arena', arena: tipo, tamanho: 'medio', seed: 5 }).objetos.map(o => o.id);
      return { vampiro: ids('vampiro'), clareira: ids('clareira'), fosso: ids('fosso'), pantano: ids('pantano'), ratos: ids('ratos') };
    });
    const conta = (l, id) => l.filter(x => x === id).length;
    ok(conta(r.vampiro, 'candelabro') === 2 && conta(r.vampiro, 'calice') === 1, 'a cripta do vampiro: os dois candelabros e o cálice');
    ok(conta(r.clareira, 'totemLobo') === 1 && conta(r.clareira, 'ossada') >= 1, 'a clareira: o totem do lobo e as ossadas');
    ok(conta(r.fosso, 'idolo') === 2 && conta(r.pantano, 'caldeirao') === 1 && conta(r.ratos, 'cranios') === 1, 'os ídolos do fosso, o caldeirão do pântano, os crânios do Rei Rato');
  });
  await passo('o acampamento', async () => {
    const r = await ev(() => { const out = {}; for (let seed = 1; seed <= 4; seed++) for (const o of __tc.Encontro.gerar({ terreno: 'floresta', situacao: 'acampamento', tamanho: 'medio', seed }).objetos) out[o.id] = (out[o.id] || 0) + 1; return out; });
    ok(r.sacoDormir > 0 && r.mochila > 0 && r.lenha > 0, 'o acampamento abandonado: os sacos de dormir, a mochila e a lenha — ' + j(r));
  });

  // ---------- 5) a vitrine (a foto com os 32) ----------
  if (SHOTS) {
    await ev(N => {
      const { Store, Props, newScene, UI } = __tc, sc = newScene('Vitrine dos objetos novos');
      sc.cols = 20; sc.rows = 11; sc.light = 'claro'; sc.bgColor = '#4c4a44';
      Store.addScene(sc); UI.switchScene(sc.id);
      const agora = Store.scene(), c = agora.cell;
      Store.tx('vitrine', () => {
        Object.values(N).forEach((ids, linha) => {
          let x = 1;
          for (const id of ids) { const s = Props.P[id].size || 1, t = Props.novo(agora, id, x * c, (0.5 + linha * 2.6) * c, s, false); if (Props.P[id].cores) t.cores = ['#5b3f8a', '#e8eaf0']; Store.add('tokens', t); x += s + 1; }
        });
      });
      __tc.setSel([]); __tc.Render.fit();
    }, NOVOS);
    await w(800);
    await ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
    await foto('l39-vitrine');
  }

  const erros = t.errs.filter(e => !/favicon|fonts\.g/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
