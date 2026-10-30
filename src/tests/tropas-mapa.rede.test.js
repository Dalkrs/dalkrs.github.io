// As tropas no Mapa-múndi (lote 41) numa mesa de verdade (o banco local de ensaio), com o mestre (Bruno) e o Dalmo
// (dono da Selene):
//   · o mestre liga o exército à tropa da Selene ("Tropa da ficha", ficando com as unidades da ficha): o exército
//     recebe as unidades, a ficha guarda a ligação; a plaquinha da veterania média aparece em cima do token, também
//     na projeção dos jogadores;
//   · as escolhas do Dalmo nas Fichas (o nome, o equipamento) chegam ao exército e à projeção; a veterania que o
//     mestre muda nas Fichas também; a moral que ele muda no mapa chega à ficha;
//   · o comandante pela ficha: o bônus pelo Embate da Selene (÷ 3, as tabelas base);
//   · a batalha no mapa: as baixas e a linha no diário da tropa; o Desfazer leva junto;
//   · com o mestre só nas Fichas (página nova), o Mapa-múndi abre escondido e as escolhas do Dalmo chegam ao mapa;
//   · desligar: o exército e a ficha seguem cada um com os seus números.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
const ficha = nome => ({ nome, raca: 'Humana', lado: 'Aliado', grupo: '', tags: [], tier: 'B', level: 12, tiers: { FOR: 'A', DES: 'C', AGI: 'C', VIT: 'B', CAN: 'B' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, defEsp: {}, rol: { fixa: 5, fonte: 'total' }, ini: 'AGI/5', disputa: {}, estaque: { a: '', b: '' }, habilidades: [], notas: '', itens: [],
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }, { id: 'sp', nome: 'SP', fml: '60' }] });

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const errosDeFora = () => t.errs.filter(e => !/^\[prep\]/.test(e) && !/Multiple GoTrueClient instances/.test(e) && !/status of (400|401|403|409)/.test(e));
  const Mdev = await t.device({ name: 'mestre', w: 1440, h: 950, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } });
  const M = Mdev.page;
  const Dp = (await t.device({ name: 'dalmo', w: 1440, h: 1000, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const foto = async (p, nome) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await p.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const tropa = () => M.evaluate(() => { const l = TC.dados.col('documentos').pegar('fichas:tropas:pc_selene'); return l && !l.apagado ? JSON.parse(JSON.stringify(l.dados)) : null; });
  let mapaId = null;
  const exeDoc = () => M.evaluate(id => { const l = TC.dados.col('documentos').pegar('mundo:mapa:' + id); const g = l && l.dados && l.dados.objs.find(o => o.id === 'ga'); return g ? JSON.parse(JSON.stringify({ nome: g.nome, exe: g.exe })) : null; }, mapaId);
  const pubDe = () => M.evaluate(id => { const l = TC.dados.col('documentos').pegar('mundo:pub:' + id); const g = l && l.dados && l.dados.objs.find(o => o.id === 'ga'); return g ? JSON.parse(JSON.stringify(g.exe)) : null; }, mapaId);

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Tropas Mapa E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let apagada = false;
  try {
    await Dp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Dp);
    await loginTela(Dp, c.jog1, c.senha); await entrarMesaTela(Dp, codigo, 'Dalmo');
    const dalmo = await Dp.evaluate(() => TC.conta.usuario.id);
    await M.evaluate(([d, fs]) => { TC.dados.col('personagens').gravar('pc_selene', { nome: 'Selene', ficha: fs, skills: {}, estado: {}, dono_id: d, vis: 'mesa', ordem: 0 }); }, [dalmo, ficha('Selene')]);
    ok(await ate(() => parado(M)), '(a Selene, do Dalmo)');

    // ---------------- a tropa, nas Fichas ----------------
    let FM = null;
    ok(await ate(async () => { FM = await quadro(M, /\/fichas\//); return FM && await FM.evaluate(() => typeof FichasTropas !== 'undefined' && FichasMesa.ativo() && S.personagens.some(p => p.id === 'pc_selene')); }, 40000), '(o mestre abre as Fichas)');
    await FM.evaluate(() => {
      S.sel = 'pc_selene'; render();
      const pc = S.personagens.find(p => p.id === 'pc_selene');
      FichasMesa.gravarTropas(pc, TC.tropas.norm({ nome: 'Guarda de Selene', moral: 6, mant: 40, unid: [
        { id: 'un_a', nome: 'Lanças', tropas: 250, cheio: 300, hpT: 10, atq: 3, def: 2, vet: 3, equip: ['eq_lanca'], raca: null, racaN: 'Humano' },
        { id: 'un_b', nome: 'Arqueiros', tropas: 100, cheio: 100, hpT: 5, atq: 2, def: 1, vet: 1, equip: ['eq_arco'] }] }));
      render();
    });
    ok(await ate(async () => !!(await tropa()) && await parado(M)), '(a tropa da Selene: Lanças, Elite, e Arqueiros, Recruta)');
    const emb = await FM.evaluate(() => { const pc = S.personagens.find(p => p.id === 'pc_selene'); return Math.max(0, Math.round(valorDoAtributo(pc, 'EMB', 'total') || 0)); });

    // ---------------- o mapa: o exército e o inimigo ----------------
    let W = null;
    await M.locator('#tab-mundo').click();
    ok(await ate(async () => { W = await quadro(M, /\/mundo\//); return W && await W.evaluate(() => !!window.__mundo && __mundo.App.pronto && __mundo.App.naMesa && __mundo.App.papel === 'mestre'); }, 30000), 'o mestre abre o Mapa-múndi');
    await W.evaluate(() => {
      const { App, N } = __mundo, Y = 346.41;
      App.criarMapa('Vale de Merunê');
      App.mudar('montar', m => {
        m.grade.tam = 40;
        m.faccoes.push({ id: 'fa', nome: 'Selene', cor: '#3f7fbf' }, { id: 'fb', nome: 'Garret', cor: '#8a2a2a' });
        m.objs.push(Object.assign(N.objNovo('g', { x: 400, y: Y, sigla: 'EXE' }), { id: 'ga', nome: 'Exército de Selene', tipo: 'exercito', fac: 'fa', exe: { cmd: { nome: '', b: 0 }, moral: 5, mant: 50, unid: [{ id: 'u1', nome: 'Milícia', tropas: 80, atq: 1, def: 1 }] } }),
          Object.assign(N.objNovo('g', { x: 640, y: Y, sigla: 'EXE' }), { id: 'gb', nome: 'Hoste de Garret', tipo: 'exercito', fac: 'fb', exe: { cmd: { nome: 'Duque', b: 0 }, moral: 5, mant: 50, unid: [{ id: 'u2', nome: 'Espadas', tropas: 400, atq: 3, def: 3 }] } }));
      });
    });
    mapaId = await W.evaluate(() => __mundo.App.mapa.id);
    await W.evaluate(id => __mundo.App.esconderMapa(id, false), mapaId);            // (os jogadores veem este mapa: a projeção existe)
    await W.click('#tab-selecao'); await w(200);
    await W.evaluate(() => __mundo.App.selecionar(['ga'])); await w(400);
    const sel = W.locator('#pane [data-k="o:ga:tropa"]');
    ok(await ate(async () => (await sel.count()) === 1 && (await sel.locator('option').allInnerTexts()).some(x => /^Selene \(tem tropa: 2 unidades\)$/.test(x))), 'no exército, "Tropa da ficha": a Selene (tem tropa: 2 unidades)');

    // ---------------- ligar ----------------
    await sel.selectOption('pc_selene'); await w(400);
    const dlg = W.locator('dialog.mundo-dl');
    ok(await ate(async () => (await dlg.count()) === 1 && /qual fica/.test(await dlg.innerText())), 'a ficha tem tropa e o exército tem unidades: a pergunta (qual fica)');
    await dlg.locator('input[value="ficha"]').check(); await dlg.locator('button[type="submit"]').click(); await w(800);
    let ex = null;
    ok(await ate(async () => { ex = await exeDoc(); return !!ex && ex.exe.tropa === 'pc_selene' && ex.exe.unid.length === 2 && ex.exe.unid[0].id === 'un_a' && ex.exe.unid[0].vet === 3 && j(ex.exe.unid[0].equip) === j([{ nome: 'Lança longa', atq: 2, def: 0 }]) && ex.nome === 'Guarda de Selene' && ex.exe.cmd.ficha === 'pc_selene' && ex.exe.cmd.auto === true; }),
      'ligado, com as unidades da ficha: o exército fica com as Lanças (Elite, com a Lança longa) e os Arqueiros, o nome da tropa, a Selene no comando (bônus pela ficha): ' + j(ex && { nome: ex.nome, n: ex.exe.unid.length, cmd: ex.exe.cmd }));
    ok(await ate(async () => { const d = await tropa(); return !!d.lig && d.lig.mapa === mapaId && d.lig.g === 'ga' && d.lig.auto === true && d.lig.mn === 'Vale de Merunê' && d.unid.find(u => u.id === 'un_a').racaN === 'Humano'; }), 'a ficha guarda a ligação (o mapa, o exército), e as escolhas dela continuam');
    ok(await ate(async () => (await W.evaluate(() => ((document.querySelector('[data-id="ga"] .veter') || {}).textContent || ''))).includes('2,0')), 'a plaquinha da veterania média em cima do token: 2,0 (Elite e Recruta)');
    ok(await ate(async () => { const p = await pubDe(); return !!p && p.vet === 2 && !('tropa' in p) && !j(p).includes('"tropas"'); }), 'e na projeção dos jogadores (a média, sem os números nem a ligação)');
    // o comandante pela ficha
    const nota = await W.evaluate(() => ((document.querySelector('#pane [data-k="o:ga:cmdauto-v"]') || {}).textContent || ''));
    ok(nota === 'Comando ' + (Math.floor(emb / 3) > 0 ? '+' : '') + Math.floor(emb / 3) + ', pelo Embate de Selene (' + emb + ' ÷ 3).', 'o comandante pela ficha: o Embate da Selene ÷ 3 — ' + nota);
    await W.evaluate(() => { MundoTela.zoom = 2.6; MundoTela.centrar('ga'); const e = document.querySelector('#pane [data-k="o:ga:tropa"]'); if (e) e.scrollIntoView({ block: 'center' }); }); await w(600);
    await foto(M, 'tropas-mapa-mestre');

    // ---------------- as escolhas do Dalmo chegam ao mapa ----------------
    let FD = null;
    ok(await ate(async () => { FD = await quadro(Dp, /\/fichas\//); return FD && await FD.evaluate(() => typeof FichasTropas !== 'undefined' && FichasMesa.ativo() && S.personagens.some(p => p.id === 'pc_selene') && FichasTropas.tem(S.personagens.find(p => p.id === 'pc_selene'))); }, 40000), '(o Dalmo abre as Fichas)');
    await FD.evaluate(() => { S.sel = 'pc_selene'; S.abaFicha = 'tropas'; render(); }); await w(400, Dp);
    let faixa = '';
    await ate(async () => { faixa = await FD.locator('.tr-faixa').innerText(); return /No Mapa-múndi/.test(faixa); });
    ok(/No Mapa-múndi, em Vale de Merunê/.test(faixa) && new RegExp('Comando\\s*[+−]?' + Math.floor(emb / 3)).test(faixa), 'o Dalmo vê, na faixa da tropa, o exército no Mapa-múndi e o comando — ' + faixa.replace(/\s+/g, ' ').slice(0, 200));
    await FD.locator('#tropasAba .tr-carta[data-trunid="un_a"] [data-tresc]').click(); await w(300, Dp);
    await FD.locator('.tr-janela [data-trnome]').fill('Lanças de Merunê'); await FD.locator('.tr-janela [data-treq="eq_torre"]').check();
    await FD.locator('.tr-janela [data-jok]').click();
    ok(await ate(async () => { const e = await exeDoc(); const u = e && e.exe.unid.find(x => x.id === 'un_a'); return !!u && u.nome === 'Lanças de Merunê' && j(u.equip) === j([{ nome: 'Lança longa', atq: 2, def: 0 }, { nome: 'Escudo de torre', atq: 0, def: 3 }]); }, 30000),
      'o Dalmo dá nome às Lanças e põe o Escudo de torre: o exército do mapa recebe');
    ok(await ate(async () => { const p = await pubDe(); return !!p && p.unid.some(u => u.id === 'un_a' && u.nome === 'Lanças de Merunê'); }), 'e a projeção dos jogadores mostra o nome novo');
    await FD.evaluate(() => document.getElementById('tropasAba').scrollIntoView()); await w(200, Dp);
    await foto(Dp, 'tropas-mapa-dalmo');

    // ---------------- a veterania nas Fichas e a moral no mapa ----------------
    await M.locator('#tab-fichas').click(); await w(500);
    await FM.evaluate(() => { S.sel = 'pc_selene'; S.abaFicha = 'tropas'; render(); }); await w(400);
    await FM.locator('#tropasAba [data-trvet="un_b"]').selectOption('2'); await w(400);
    ok(await ate(async () => { const e = await exeDoc(); return e && e.exe.unid.find(x => x.id === 'un_b').vet === 2; }, 30000), 'o mestre faz dos Arqueiros Veteranos, nas Fichas: o exército recebe (com o Mapa-múndi em outra aba)');
    ok(await ate(async () => { const p = await pubDe(); return p && p.vet === 2.5; }), 'a média dos jogadores: 2,5');
    await M.locator('#tab-mundo').click(); await w(400);
    await W.evaluate(() => __mundo.App.mudar('mudar a moral', m => { m.objs.find(o => o.id === 'ga').exe.moral = 9; }));
    ok(await ate(async () => (await tropa()).moral === 9), 'a moral que muda no mapa (9) chega à ficha');

    // ---------------- a batalha ----------------
    const antes = await tropa();
    await W.evaluate(() => window.MundoGuerraPainel.abrirBatalha({ a: 'ga', b: 'gb' })); await w(400);
    await W.evaluate(() => { let i = 0; const v = [0.95, 0.1]; __mundo.App.rng = () => v[i++ % v.length]; });
    await W.locator('dialog.gb [data-k="gb:d100"]').click(); await w(400);
    const bonusTxt = await W.evaluate(() => ((document.querySelector('dialog.gb') || {}).innerText || '').replace(/\s+/g, ' '));
    const cmdV = Math.floor(emb / 3);
    ok(!cmdV || bonusTxt.includes('Comandante +' + cmdV), 'na batalha, o comandante pela ficha soma (+' + cmdV + ')');
    await W.locator('dialog.gb [data-k="gb:depois"]').click(); await w(400);
    await W.locator('dialog.gb [data-k="gb:aplicar"]').click(); await w(800);
    let dep = null;
    ok(await ate(async () => { dep = await tropa(); const e0 = dep.diario[0]; return e0 && e0.k === 'bat' && e0.r === 'v' && /Guarda de Selene × Hoste de Garret/.test(e0.t) && e0.b > 0; }, 30000), 'a batalha aplicada: a linha no diário da tropa (vitória, com as baixas): ' + j(dep && dep.diario[0]));
    const ua0 = antes.unid.find(u => u.id === 'un_a'), ua1 = dep.unid.find(u => u.id === 'un_a'), ex1 = await exeDoc();
    ok(ua1 && ua1.bat === ua0.bat + 1 && ua1.tropas === ex1.exe.unid.find(u => u.id === 'un_a').tropas && ua1.baixas === ua0.baixas + (ua0.tropas - ua1.tropas) && ua1.tropas < ua0.tropas,
      'as Lanças: uma batalha a mais, as tropas como as do mapa (' + ua0.tropas + ' → ' + (ua1 && ua1.tropas) + ') e as baixas somadas');
    await W.locator('#toasts .toast button', { hasText: 'Desfazer' }).first().click(); await w(800);
    let dd = null;
    ok(await ate(async () => { const d = dd = await tropa(); const u = d.unid.find(x => x.id === 'un_a'); return d.diario[0].k !== 'bat' && u.tropas === ua0.tropas && u.bat === ua0.bat && u.baixas === ua0.baixas; }, 30000), 'o Desfazer da batalha: o diário, as tropas, as batalhas e as baixas voltam — ' + j(dd && { d0: dd.diario[0], u: dd.unid.find(x => x.id === 'un_a'), ua0: { t: ua0.tropas, b: ua0.bat, bx: ua0.baixas } }));

    // ---------------- o mestre só nas Fichas: o Mapa-múndi abre escondido ----------------
    await M.evaluate(() => TC.dados.pendentes === 0);
    await M.goto(t.base + '?debug#/fichas', { waitUntil: 'load' }); await w(1500);
    ok(await ate(async () => !!(await M.evaluate(() => { const f = document.getElementById('f-mundo'); return f && f.hidden; })), 40000), 'com o mestre nas Fichas (página nova), o Mapa-múndi abre escondido (há uma tropa ligada)');
    let W2 = null;
    ok(await ate(async () => { W2 = await quadro(M, /\/mundo\//); return W2 && await W2.evaluate(() => !!window.__mundo && __mundo.App.pronto); }, 40000), '(o Mapa-múndi escondido está pronto)');
    await FD.locator('#tropasAba .tr-carta[data-trunid="un_b"] [data-tresc]').click(); await w(300, Dp);
    await FD.locator('.tr-janela [data-trnome]').fill('Arqueiros do Bosque'); await FD.locator('.tr-janela [data-jok]').click();
    ok(await ate(async () => { const e = await exeDoc(); return e && e.exe.unid.find(x => x.id === 'un_b').nome === 'Arqueiros do Bosque'; }, 30000), 'o Dalmo renomeia os Arqueiros: o mapa recebe, sem o mestre abrir o Mapa-múndi');

    // ---------------- desligar ----------------
    await M.locator('#tab-mundo').click(); await w(500);
    await W2.click('#tab-selecao'); await w(200);
    await W2.evaluate(id => { __mundo.App.trocarMapa(id); __mundo.App.selecionar(['ga']); }, mapaId); await w(400);
    await W2.locator('#pane [data-k="o:ga:tropa"]').selectOption(''); await w(600);
    ok(await ate(async () => { const e = await exeDoc(), d = await tropa(); return e && !e.exe.tropa && !d.lig && e.exe.unid.length === 2 && d.unid.length === 2; }), 'desligar: o exército e a tropa da ficha seguem, cada um com as suas unidades, sem a ligação');

    await apagarMesaTela(M, nomeMesa); apagada = true;
  } catch (e) {
    ok(false, 'parou: ' + String((e && e.message) || e).split('\n')[0]);
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = errosDeFora();
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})();
