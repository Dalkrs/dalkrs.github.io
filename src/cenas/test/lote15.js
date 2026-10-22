// Bateria do lote 15 (consertos e ajustes rápidos), no navegador, sem o site — as Fichas falam com um site de mentira
// (window.TC: a ponte, os personagens e as regras de verdade, tc/rules.js):
//   · o máximo de uma barra ligada, mudado no token, vai para a ficha (o HP que não descontava e voltava para 10);
// (Com fichas de verdade e o site inteiro, os testes são os src/tests/*.test.js do lote 15.)
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;                         // (as fotos só saem com FOTOS=pasta)

/* ---- o site de mentira: a ponte de um mestre e a coleção dos personagens, na memória ---- */
function siteDeMentira() {
  const linhas = new Map(), ouv = [], grav = [];
  const copia = x => JSON.parse(JSON.stringify(x));
  const P = {
    pronta: Promise.resolve(),
    todas: () => [...linhas.values()],
    pegar: id => linhas.get(id) || null,
    gravar(id, campos) { const l = Object.assign({}, linhas.get(id) || { id }, copia(campos)); linhas.set(id, l); grav.push({ id, campos: copia(campos) }); return l; },
    apagar(id) { linhas.delete(id); },
    aoMudar(fn) { ouv.push(fn); },
  };
  const D = { pronta: Promise.resolve(), todas: () => [], pegar: () => null, gravar() {}, apagar() {}, aoMudar() {} };
  window.__site = { linhas, grav, chegar(l) { linhas.set(l.id, copia(l)); ouv.forEach(f => f(linhas.get(l.id))); }, mestra: () => true };
  window.TC.ponte = { pronta: Promise.resolve({ papel: 'mestre', eu: 'u-m' }), estado: {}, mestra: k => window.__site.mestra(k) };
  window.TC.dados = { disponivel: () => true, col: nome => (nome === 'personagens' ? P : D) };
  window.TC.dice = window.TC.dice || {};
}
const INIT = fs.readFileSync(path.join(__dirname, '../../../tc/rules.js'), 'utf8') + '\n;(' + siteDeMentira.toString() + ')();';

(async () => {
  const t = await open({ init: INIT });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const toasts = () => ev(() => Array.from(document.querySelectorAll('.toast')).map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const clearToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const foto = async nome => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const tok = id => ev(id => JSON.parse(JSON.stringify(__tc.Store.get('tokens', id))), id);
  const barra = async (id, nome) => { const k = await tok(id), b = k.bars.find(x => x.n === nome); return b ? `${b.v}/${b.m}` : null; };
  const ficha = id => ev(id => JSON.parse(JSON.stringify(__site.linhas.get(id))), id);
  const recDe = (l, nome) => (l.ficha.recursos || []).find(r => r.nome === nome);
  const selecionar = async id => { await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, id); await w(250); };
  const digitar = async (sel, v) => { await page.locator(sel).fill(String(v)); await page.locator(sel).press('Enter'); await w(250); };
  const modal = () => ev(() => { const m = document.querySelector('.modal'); return m ? m.innerText.replace(/\s+/g, ' ') : null; });

  ok(await ev(() => __tc.Fichas.on()), 'as Fichas ligam com o site de mentira (o mestre)');

  // ---------- as fichas ----------
  const ids = await ev(() => {
    const R = window.TC.rules;
    // a ficha "vazia" de um jogador: distribuição livre sem nenhum ponto, level 2 — HP = VIT*8 + LVL*5 = 10
    const vazia = R.personagemPadrao('Ana', 'pc_ana'); vazia.modoAtr = 'livre'; vazia.atrLivre = { FOR: 0, DES: 0, VIT: 0, CAN: 0, AGI: 0 }; vazia.level = 2;
    // uma ficha preenchida (a tabela de tiers), com um item que soma 5 no HP
    const cheia = R.personagemPadrao('Bruna', 'pc_bru');
    const hpB = cheia.recursos.find(r => r.nome === 'HP').id;
    cheia.itens = [{ id: 'i_amu', nome: 'Amuleto', equipado: true, bonus: {}, rec: { [hpB]: 5 } }];
    // com uma barra especial (3 cargas)
    const esp = R.personagemPadrao('Caio', 'pc_cai'); esp.poderes = [{ id: 'p1', nome: 'Cargas', max: 3, atual: 3 }];
    const pcs = [vazia, cheia, esp];
    for (const pc of pcs) { const f = Object.assign({}, pc); delete f.id; delete f.nome; __site.chegar({ id: pc.id, nome: pc.nome, ficha: f, estado: {}, skills: {}, dono_id: pc.id === 'pc_ana' ? 'u-j' : null, vis: 'mestre' }); }
    const u = __tc, sc = u.newScene('Lote 15'); u.Store.addScene(sc); u.Store.setCurrent(sc.id);
    const c = sc.cell, toks = {};
    u.Store.tx('prep', () => {
      for (const [k, x] of [['ana', 2], ['bru', 5], ['cai', 8], ['gob', 11]]) { const tk = u.newToken(sc, x * c, 3 * c, { name: k }); toks[k] = tk.id; u.Store.add('tokens', tk); }
    });
    u.Render.fit();
    for (const [k, pc] of [['ana', 'pc_ana'], ['bru', 'pc_bru'], ['cai', 'pc_cai']]) u.Fichas.link(u.Store.get('tokens', toks[k]), pc);
    return Object.assign(toks, { hpB });
  });
  await w(300);

  // ================= o máximo de uma barra ligada vai para a ficha =================
  ok(await barra(ids.ana, 'HP') === '10/10', 'a ficha vazia de jogador (level 2, sem pontos) dá HP 10/10 no token: ' + await barra(ids.ana, 'HP'));
  // (o defeito: o máximo mudado só no token voltava para o da ficha ao descontar — o HP "não desconta e volta para 10")
  await selecionar(ids.ana);
  ok(/vem da ficha/.test(await page.locator('#tk-b0-m').getAttribute('title') || ''), 'o campo do máximo de uma barra ligada avisa que ele vem da ficha');
  // (a ficha sem o valor de agora anotado — como depois de "Encher", na aba Fichas: a barra vale o máximo dela)
  await ev(() => { const l = __site.linhas.get('pc_ana'); __site.chegar(Object.assign({}, l, { estado: {} })); });
  await w(150);
  await clearToasts();
  await digitar('#tk-b0-m', 45);
  ok(await modal() === null, 'na ficha vazia, o número entra direto (sem pergunta)');
  let l = await ficha('pc_ana');
  ok(recDe(l, 'HP').fml === '45', 'o número vai para a ficha no lugar da fórmula: ' + recDe(l, 'HP').fml);
  ok(await barra(ids.ana, 'HP') === '10/45', 'o token fica com o máximo novo e o valor de agora: ' + await barra(ids.ana, 'HP'));
  ok(l.estado.rec && l.estado.rec[recDe(l, 'HP').id] === 10, 'o valor de agora fica anotado na ficha (sem isso, a ficha encheria a barra): ' + JSON.stringify(l.estado.rec));
  ok(/HP de Ana: o máximo agora é 45, também na ficha\./.test(await toasts()), 'o aviso diz o que mudou: ' + await toasts());
  // Desfazer, pelo aviso: a fórmula volta
  await page.locator('.toast .toast-a', { hasText: 'Desfazer' }).click(); await w(250);
  l = await ficha('pc_ana');
  ok(recDe(l, 'HP').fml === 'VIT*8 + LVL*5' && await barra(ids.ana, 'HP') === '10/10', 'Desfazer devolve a fórmula da ficha e o máximo dela: ' + recDe(l, 'HP').fml + ' · ' + await barra(ids.ana, 'HP'));
  ok(/Desfeito: o máximo de HP voltou para 10\./.test(await toasts()), 'e avisa: ' + await toasts());
  // de novo, e agora o valor e o dano
  await selecionar(ids.ana);
  await digitar('#tk-b0-m', 45);
  await digitar('#tk-b0-v', 45);
  ok(await barra(ids.ana, 'HP') === '45/45', 'o valor digitado depois fica (45/45): ' + await barra(ids.ana, 'HP'));
  await digitar('#tk-b0-v', '-5');
  ok(await barra(ids.ana, 'HP') === '40/45', 'descontar 5 desconta, e o máximo fica (o defeito era voltar para 10/10): ' + await barra(ids.ana, 'HP'));
  l = await ficha('pc_ana');
  ok(l.estado.rec[recDe(l, 'HP').id] === 40, 'e a ficha guarda os 40');
  await foto('l15-01-hp-ficha-vazia');

  // ---------- a ficha preenchida: pergunta antes de trocar a fórmula ----------
  ok(await barra(ids.bru, 'HP') === '66/66', 'a ficha preenchida: 61 da fórmula mais 5 do amuleto: ' + await barra(ids.bru, 'HP'));
  await selecionar(ids.bru); await clearToasts();
  await digitar('#tk-b0-m', 80);
  const txt = await modal();
  ok(!!txt && /Trocar a fórmula de HP\?/.test(txt) && /o máximo de HP é 66: a fórmula “VIT\*8 \+ LVL\*5” mais 5 dos itens e da árvore/.test(txt) && /fica o número 75 \(os itens e a árvore continuam somando 5 por cima\)/.test(txt) && /Dá para desfazer/.test(txt),
    'na ficha preenchida, a pergunta mostra a fórmula, o que ela dá e o número que fica: ' + txt);
  await foto('l15-02-pergunta-formula');
  await page.locator('.modal button', { hasText: 'Cancelar' }).click(); await w(250);
  l = await ficha('pc_bru');
  ok(recDe(l, 'HP').fml === 'VIT*8 + LVL*5' && await barra(ids.bru, 'HP') === '66/66' && await page.locator('#tk-b0-m').inputValue() === '66', 'Cancelar: nada muda, e o campo volta para 66');
  await digitar('#tk-b0-m', 80);
  await page.locator('.modal button', { hasText: 'Trocar pelo número' }).click(); await w(250);
  l = await ficha('pc_bru');
  ok(recDe(l, 'HP').fml === '75' && await barra(ids.bru, 'HP') === '66/80', 'Trocar: a ficha fica com 75 (mais os 5 do amuleto, 80) e o token 66/80: ' + recDe(l, 'HP').fml + ' · ' + await barra(ids.bru, 'HP'));
  await clearToasts();
  await selecionar(ids.bru);
  await digitar('#tk-b0-m', 90);
  ok(await modal() === null && recDe(await ficha('pc_bru'), 'HP').fml === '85', 'com o máximo já em número, não há fórmula a perder: troca sem perguntar (85 + 5)');
  await page.locator('.toast .toast-a', { hasText: 'Desfazer' }).click(); await w(250);
  ok(recDe(await ficha('pc_bru'), 'HP').fml === '75' && await barra(ids.bru, 'HP') === '66/80', 'Desfazer volta um passo (para o 75)');
  // o Desfazer não passa por cima de uma mudança feita depois na ficha
  await digitar('#tk-b0-m', 100);
  const desf = page.locator('.toast .toast-a', { hasText: 'Desfazer' });
  await ev(() => { const l = __site.linhas.get('pc_bru'), rs = l.ficha.recursos.map(r => (r.nome === 'HP' ? Object.assign({}, r, { fml: '70' }) : r)); __site.chegar(Object.assign({}, l, { ficha: Object.assign({}, l.ficha, { recursos: rs }) })); });
  await w(200);
  await desf.click(); await w(250);
  ok(recDe(await ficha('pc_bru'), 'HP').fml === '70' && /mudou de novo depois: ficou como está/.test(await toasts()), 'Desfazer depois de outra mudança na ficha: fica a da ficha, e o aviso explica: ' + await toasts());

  // ---------- a barra especial: o máximo dela ----------
  ok(await barra(ids.cai, 'Cargas') === '3/3', 'a barra especial vem da ficha (3 cargas)');
  await selecionar(ids.cai); await clearToasts();
  const iC = (await tok(ids.cai)).bars.findIndex(b => b.n === 'Cargas');
  await digitar(`#tk-b${iC}-m`, 5);
  l = await ficha('pc_cai');
  ok(await modal() === null && l.ficha.poderes[0].max === 5 && await barra(ids.cai, 'Cargas') === '3/5', 'o máximo da barra especial vai para a ficha: ' + l.ficha.poderes[0].max + ' · ' + await barra(ids.cai, 'Cargas'));
  await page.locator('.toast .toast-a', { hasText: 'Desfazer' }).click(); await w(250);
  ok((await ficha('pc_cai')).ficha.poderes[0].max === 3 && await barra(ids.cai, 'Cargas') === '3/3', 'Desfazer: 3 de novo');
  await selecionar(ids.cai); await clearToasts();
  await digitar(`#tk-b${iC}-m`, 0);
  ok((await ficha('pc_cai')).ficha.poderes[0].max === 3 && await barra(ids.cai, 'Cargas') === '3/3' && /precisa de pelo menos 1 de máximo/.test(await toasts()), 'zero na barra especial: não muda, e o aviso explica: ' + await toasts());
  // a ficha preenchida sem itens: a pergunta mostra só a fórmula e o que ela dá
  await selecionar(ids.cai);
  await digitar('#tk-b0-m', 70);
  const txt2 = await modal();
  ok(!!txt2 && /o máximo de HP vem da fórmula “VIT\*8 \+ LVL\*5”, que dá 61\. Com 70, a fórmula sai da ficha e fica o número 70\. Dá para desfazer\./.test(txt2), 'sem itens nem árvore na barra, a pergunta mostra a fórmula e o que ela dá: ' + txt2);
  await page.locator('.modal button', { hasText: 'Cancelar' }).click(); await w(250);
  ok(recDe(await ficha('pc_cai'), 'HP').fml === 'VIT*8 + LVL*5' && await barra(ids.cai, 'HP') === '61/61', '(Cancelar: nada muda)');

  // ---------- o token sem ficha: como sempre ----------
  await selecionar(ids.gob);
  const g0 = (await tok(ids.gob)).bars[0];
  ok(!/vem da ficha/.test(await page.locator('#tk-b0-m').getAttribute('title') || ''), 'o token sem ficha não tem o aviso no campo');
  await digitar('#tk-b0-m', 30);
  ok((await tok(ids.gob)).bars[0].m === 30, 'o token sem ficha muda o máximo só nele');
  await ev(() => __tc.Store.undo()); await w(150);
  ok((await tok(ids.gob)).bars[0].m === g0.m, 'e o Ctrl+Z desfaz, como sempre');

  // ---------- a ficha que não está à vista (o mestre auxiliar sem a aba Fichas) ----------
  await ev(id => { __site.mestra = k => k !== 'fichas'; __tc.Store.tx('ligar', () => __tc.Store.upd('tokens', id, { char: 'pc_sumida', bars: __tc.Store.get('tokens', id).bars.map(b => Object.assign({}, b, { ref: 'hp_x' })) })); }, ids.gob);
  await selecionar(ids.gob); await clearToasts();
  const m0 = (await tok(ids.gob)).bars[0].m;
  await digitar('#tk-b0-m', 77);
  ok((await tok(ids.gob)).bars[0].m === m0 && /vem da ficha, que não está à vista aqui/.test(await toasts()), 'a ficha escondida: o máximo não muda só no token, e o aviso diz onde mudar: ' + await toasts());
  await ev(() => { __site.mestra = () => true; });

  // ================= as barras especiais só ao passar o mouse ou selecionar =================
  // (a cor das Cargas fica magenta, e a do HP, ciano, para achar cada uma no desenho, acima do token do Caio)
  await ev(id => {
    const u = __tc, tk = u.Store.get('tokens', id);
    u.Store.tx('cores', () => u.Store.upd('tokens', id, { bars: tk.bars.map(b => Object.assign({}, b, { c: b.n === 'Cargas' ? '#ff00ff' : b.n === 'HP' ? '#00ffff' : '#808080' })) }));
    u.setSel([]); u.App.hoverTok = null; u.Render.request();
  }, ids.cai);
  await w(250);
  // quantos pixels de cada cor há na faixa acima do token (as barras ficam ali)
  const cores = idT => ev(id => new Promise(res => { __tc.Render.request(); requestAnimationFrame(() => requestAnimationFrame(() => {
    const u = __tc, tk = u.Store.get('tokens', id), sc = u.Store.scene(), C = sc.cell, cv = u.Render.cv, dpr = cv.width / cv.getBoundingClientRect().width;
    const [x0, y0] = u.Render.toScreen(tk.x - C * 0.1, tk.y - C * 1.2), [x1, y1] = u.Render.toScreen(tk.x + C * 1.1, tk.y);
    const g = document.createElement('canvas').getContext('2d', { willReadFrequently: true }), W = Math.round((x1 - x0) * dpr), H = Math.round((y1 - y0) * dpr);
    g.canvas.width = W; g.canvas.height = H; g.drawImage(cv, -x0 * dpr, -y0 * dpr);
    const d = g.getImageData(0, 0, W, H).data; let mag = 0, cia = 0, topoC = H, topoM = H;
    for (let i = 0; i < d.length; i += 4) {
      const y = Math.floor(i / 4 / W);
      if (d[i] > 230 && d[i + 1] < 30 && d[i + 2] > 230) { mag++; topoM = Math.min(topoM, y); }
      if (d[i] < 30 && d[i + 1] > 230 && d[i + 2] > 230) { cia++; topoC = Math.min(topoC, y); }
    }
    res({ mag, cia, topoC });
  })); }), idT);
  const parado = await cores(ids.cai);
  ok(parado.cia > 20 && parado.mag === 0, 'a barra especial não aparece no token parado (o HP, sim): ' + JSON.stringify(parado));
  await foto('l15-03-especial-escondida');
  await ev(id => { __tc.App.hoverTok = id; }, ids.cai);
  const sobre = await cores(ids.cai);
  ok(sobre.mag > 6 && sobre.cia > 20, 'com o mouse por cima, ela aparece: ' + JSON.stringify(sobre));
  ok(sobre.topoC === parado.topoC, 'e o HP não sai do lugar (ela entra no alto da pilha): ' + sobre.topoC + ' = ' + parado.topoC);
  await ev(id => { __tc.App.hoverTok = null; __tc.setSel([{ c: 'tokens', id }]); }, ids.cai);
  ok((await cores(ids.cai)).mag > 6, 'com o token selecionado, também');
  await foto('l15-04-especial-selecionado');
  await ev(() => { __tc.setSel([]); });
  // a escolha nas opções da barra
  await selecionar(ids.cai);
  await page.locator(`#tk-b${iC}-more`).click(); await w(200);
  ok(await page.locator(`#tk-b${iC}-mapa`).inputValue() === 'passar' && await page.locator('#tk-b0-more').count() === 1, 'nas opções da barra especial, "No mapa" começa em "Só ao passar o mouse ou selecionar"');
  await page.locator(`#tk-b${iC}-mapa`).selectOption('sempre'); await w(200);
  await ev(() => { __tc.setSel([]); __tc.App.hoverTok = null; });
  ok((await tok(ids.cai)).bars[iC].mapa === 'sempre' && (await cores(ids.cai)).mag > 6, 'em "Sempre no token", ela fica à mostra o tempo todo');
  await ev(() => __tc.Store.undo()); await w(150);
  ok(!(await tok(ids.cai)).bars[iC].mapa && (await cores(ids.cai)).mag === 0, 'Ctrl+Z volta para o de começo');
  // uma barra comum também pode ficar só ao passar o mouse; e o HP da ficha sincroniza sem perder a escolha
  await ev(id => { const u = __tc, tk = u.Store.get('tokens', id); u.Act.barPatch(tk, 0, { mapa: 'passar' }); }, ids.cai);
  ok((await cores(ids.cai)).cia === 0, 'o HP em "Só ao passar o mouse": some do token parado');
  await ev(id => { const u = __tc, tk = u.Store.get('tokens', id); u.Act.barSet(tk, 0, '-3'); }, ids.cai); await w(150);
  const kc = await tok(ids.cai);
  ok(kc.bars[0].mapa === 'passar' && kc.bars[0].v === kc.bars[0].m - 3, 'o dano vai para a ficha e volta, e a escolha fica: ' + JSON.stringify(kc.bars[0]));
  await ev(id => { const u = __tc, tk = u.Store.get('tokens', id); u.Act.barPatch(tk, 0, { mapa: 'sempre' }); }, ids.cai);
  // os jogadores recebem a marca (na barra "só a proporção", que vai sem o id da ficha)
  const pub = await ev(id => { const u = __tc, sc = JSON.parse(JSON.stringify(u.Store.scene())); const tk = sc.tokens.find(x => x.id === id); tk.barVis = 'bar'; tk.owner = null; const p = u.Proj.projetar(sc, {}, new Set()); return p.v.tokens.find(x => x.id === id).bars.map(b => ({ n: b.n, mapa: b.mapa || null, ref: b.ref || null })); }, ids.cai);
  ok(pub.find(b => b.n === 'Cargas').mapa === 'passar' && !pub.find(b => b.n === 'Cargas').ref && pub.find(b => b.n === 'HP').mapa === null, 'na cena dos jogadores, a barra especial vai marcada "só ao passar o mouse" (sem a ficha): ' + JSON.stringify(pub));
  ok(await ev(() => { const c = __tc.cleanBar({ n: 'X', v: 1, m: 2, mapa: 'passar' }), d = __tc.cleanBar({ n: 'X', v: 1, m: 2, mapa: 'talvez' }); return c.mapa === 'passar' && !('mapa' in d); }), 'a barra guarda a escolha (e só as que existem)');

  // ================= a porcentagem nas barras (do máximo) =================
  await ev(id => { const u = __tc, tk = u.Store.get('tokens', id); u.Store.tx('vida', () => u.Store.upd('tokens', id, { char: null, bars: [u.cleanBar({ n: 'Vida', c: '#d6524b', v: 80, m: 100, on: true }), u.cleanBar({ n: 'Fúria', c: '#e0a43a', v: 3, m: 45, on: true }), u.cleanBar({ n: 'Escudo', c: '#4fb8e0', v: 50, m: 50, on: true, x: 8 })] })); void tk; }, ids.gob);
  await selecionar(ids.gob);
  const vida = async () => { const k = await tok(ids.gob); return k.bars.map(b => `${b.v}/${b.m}` + (b.x ? `+${b.x}` : '')).join(' '); };
  ok(/-10% tira 10% do máximo/.test(await page.locator('#tk-b0-v').getAttribute('title')), 'a dica do campo ensina a porcentagem');
  await digitar('#tk-b0-v', '-10%');
  ok((await vida()).startsWith('70/100 '), 'Vida 80/100, −10%: 70/100 (10% do máximo): ' + await vida());
  await digitar('#tk-b0-v', '+25%');
  ok((await vida()).startsWith('95/100 '), '+25%: 95/100: ' + await vida());
  await digitar('#tk-b0-v', '+25%');
  ok((await vida()).startsWith('100/100 '), '+25% de novo: para no máximo: ' + await vida());
  await digitar('#tk-b0-v', '50%');
  ok((await vida()).startsWith('50/100 '), 'sem sinal, "50%" deixa a barra na metade: ' + await vida());
  await digitar('#tk-b0-v', '- 10 %');
  ok((await vida()).startsWith('40/100 '), 'com espaços ("- 10 %") também: ' + await vida());
  await digitar('#tk-b0-v', '-150%');
  ok((await vida()).startsWith('0/100 '), '−150%: para no zero (a barra sem piso): ' + await vida());
  await digitar('#tk-b1-v', '+10%');
  ok((await vida()).split(' ')[1] === '7/45', 'Fúria 3/45, +10%: 4,5 arredonda para baixo, +4 → 7/45: ' + await vida());
  await digitar('#tk-b1-v', '-1%');
  ok((await vida()).split(' ')[1] === '7/45' && await page.locator('#tk-b1-v').inputValue() === '7', '−1% de 45 não chega a 1 ponto: nada muda, e o campo volta: ' + await vida());
  await digitar('#tk-b2-v', '-20%');
  ok((await vida()).split(' ')[2] === '48/50', 'Escudo 50/50 com 8 de sobrevida, −20% (10): a sobrevida gasta primeiro, e sobram 48/50: ' + await vida());
  await digitar('#tk-b0-v', '10%x');
  ok((await vida()).startsWith('0/100 ') && await page.locator('#tk-b0-v').inputValue() === '0', 'o que não é número nem porcentagem não vale');
  await ev(() => __tc.Store.undo()); await w(150);
  ok((await vida()).split(' ')[2] === '50/50+8', 'Ctrl+Z desfaz a porcentagem, como qualquer mudança: ' + await vida());
  // a faixa de baixo (o token selecionado) aceita também
  await ev(id => { __tc.setSel([{ c: 'tokens', id }]); }, ids.gob); await w(250);
  await digitar('#hud-b0', '+10%');
  ok((await vida()).startsWith('10/100 '), 'na faixa de baixo, "+10%" também: ' + await vida());
  // a barra ligada à ficha: a porcentagem do máximo da ficha, e o valor vai para a ficha
  await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, ids.ana); await w(250);
  await digitar('#tk-b0-v', '-20%');
  l = await ficha('pc_ana');
  ok(await barra(ids.ana, 'HP') === '31/45' && l.estado.rec[recDe(l, 'HP').id] === 31, 'no HP 40/45 da Ana, −20% (9): 31/45, também na ficha: ' + await barra(ids.ana, 'HP'));

  // ---------- a porcentagem para vários tokens ("Somar ou subtrair de todos") ----------
  await ev(([a, b]) => { const u = __tc; u.Store.tx('vidas', () => { u.Store.upd('tokens', a, { bars: [u.cleanBar({ n: 'Vida', c: '#d6524b', v: 100, m: 100, on: true })] }); u.Store.upd('tokens', b, { char: null, bars: [u.cleanBar({ n: 'Vida', c: '#d6524b', v: 40, m: 40, on: true })] }); }); u.setSel([{ c: 'tokens', id: a }, { c: 'tokens', id: b }]); u.UI.openTab('sel'); }, [ids.gob, ids.bru]);
  await w(300);
  ok(/Com %, é do máximo de cada um/.test(await page.locator('#s-mbar').innerText()), 'a caixa de vários tokens ensina a porcentagem');
  await page.locator('#mt-amt').fill('-10%'); await page.locator('#mt-amt').press('Enter'); await w(250);
  const vs = async () => (await Promise.all([ids.gob, ids.bru].map(tok))).map(k => `${k.bars[0].v}/${k.bars[0].m}`).join(' ');
  ok(await vs() === '90/100 36/40', '−10% em dois: cada um perde 10% do máximo dele (10 e 4): ' + await vs());
  await page.locator('#mt-amt').fill('25%'); await page.locator('#mt-amt').press('Enter'); await w(250);
  ok(await vs() === '65/100 26/40', 'sem sinal, tira (como o número da caixa): 25% → 65/100 e 26/40: ' + await vs());
  await ev(() => __tc.Store.undo()); await w(150);
  ok(await vs() === '90/100 36/40', 'um passo de desfazer para todos');

  // ================= o Descanso curto do grupo, pelo Acampamento =================
  ok(await ev(() => !__tc.Luta.podeDescanso()), 'fora da casca do site, não há o botão (o descanso é do Acampamento)');
  await ev(() => { window.__idas = []; window.TC.ponte.naCasca = true; window.TC.ponte.ir = (aba, alvo) => { window.__idas.push({ aba, alvo }); return true; }; });
  await ev(([ana, bru, cai, gob]) => {
    const u = __tc;
    // a Ana é de um jogador; a Bruna, aliada; o Caio, inimigo; o goblin, sem ficha
    const lb = __site.linhas.get('pc_cai'); __site.chegar(Object.assign({}, lb, { ficha: Object.assign({}, lb.ficha, { lado: 'Inimigo' }) }));
    const la = __site.linhas.get('pc_ana'); __site.chegar(Object.assign({}, la, { dono_id: 'p1' }));
    u.Store.S.players = [{ id: 'p1', name: 'Dalmo', color: '#4fb8e0' }];
    u.Store.tx('prep', () => { u.Store.upd('tokens', bru, { char: 'pc_bru' }); u.Store.upd('tokens', gob, { char: null }); });
    u.setSel([]); u.UI.openTab('sel');
  }, [ids.ana, ids.bru, ids.cai, ids.gob]);
  await w(300);
  ok(await page.locator('#sel-curto').count() === 1, 'na cena com tokens ligados, a Seleção oferece "Descanso curto…"');
  ok(JSON.stringify(await ev(() => __tc.Luta.quemDescansa())) === JSON.stringify(['pc_ana', 'pc_bru']), 'sem escolha, vão os personagens dos jogadores e os aliados (o inimigo e o token sem ficha, não): ' + JSON.stringify(await ev(() => __tc.Luta.quemDescansa())));
  await page.locator('#sel-curto').click(); await w(200);
  let ida = await ev(() => window.__idas.slice(-1)[0]);
  ok(ida && ida.aba === 'acampamento' && ida.alvo.descanso === 'curto' && JSON.stringify(ida.alvo.marcar) === JSON.stringify(['pc_ana', 'pc_bru']), 'o botão abre o Acampamento no Descanso curto, com eles marcados: ' + JSON.stringify(ida));
  await ev(([cai, gob]) => { __tc.setSel([{ c: 'tokens', id: cai }, { c: 'tokens', id: gob }]); __tc.UI.openTab('sel'); }, [ids.cai, ids.gob]); await w(300);
  await page.locator('#mt-curto').click(); await w(200);
  ida = await ev(() => window.__idas.slice(-1)[0]);
  ok(JSON.stringify(ida.alvo.marcar) === JSON.stringify(['pc_cai']), 'com tokens escolhidos, vão os escolhidos que têm ficha (até o inimigo: foi escolhido): ' + JSON.stringify(ida.alvo.marcar));
  await ev(gob => { __tc.setSel([{ c: 'tokens', id: gob }]); }, ids.gob); await clearToasts();
  ok(await ev(gob => __tc.Luta.descansoCurto([__tc.Store.get('tokens', gob)]), ids.gob) === false && /Nenhum dos tokens escolhidos está ligado a uma ficha/.test(await toasts()), 'só o token sem ficha: não vai, e o aviso explica');
  // o menu do mapa (botão direito no vazio)
  await ev(() => __tc.setSel([]));
  const box = await page.locator('#cv').boundingBox();
  await page.mouse.click(box.x + box.width - 40, box.y + box.height - 40, { button: 'right' }); await w(250);
  ok(await page.locator('.menu-i', { hasText: 'Descanso curto do grupo…' }).count() === 1, 'o menu do mapa (botão direito) também tem "Descanso curto do grupo…"');
  await page.keyboard.press('Escape');
  await ev(() => { window.TC.ponte.naCasca = false; });

  const errs = t.errs.filter(e => !/fonts\.g/.test(e));
  ok(!errs.length, 'sem erros na página: ' + errs.join(' | '));
  console.log(`lote15: ${n - fails}/${n} ok`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
