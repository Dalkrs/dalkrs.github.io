// O Escudo do mestre numa mesa de verdade (banco local de ensaio ou o projeto real): o mestre (Bruno), o Dalmo e a Ana.
//   · a carta à mesa toda: a janela na tela de quem recebe, a aba Pistas que aparece, o trecho escondido (que nem chega
//     ao aparelho dos jogadores) e o "Revelar";
//   · o puzzle só para o Dalmo (a Ana nem recebe): errar faz o relógio ligado andar (o vigia do mestre, com o aviso);
//     acertar revela a outra carta, abre a porta ligada nas Cenas e a Mesa ao vivo diz que foi resolvido;
//   · os relógios à vista no cantinho das Cenas do Dalmo;
//   · as runas à mesa: o lance de um aparece para o outro, e a Ana termina;
//   · a imagem com uma área escondida, só para a Ana: ela recebe a imagem já coberta;
//   · o painel do roteiro na barra de cima (abrir a sessão, o +1 do passo, marcar); o Mapa-múndi sugere avançar o
//     relógio ao passar o dia; fechar a sessão (o resumo) e levar ao Jornal;
//   · tirar dos jogadores (some das Pistas) e o Desfazer (volta).
const path = require('path');
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, codigoDaMesa, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
function resolverLuzes(l, n) {
  const N = n * n, M = [];
  for (let i = 0; i < N; i++) { const row = Array(N + 1).fill(0); for (let k = 0; k < N; k++) { const x = k % n, y = Math.floor(k / n), xi = i % n, yi = Math.floor(i / n); if (Math.abs(x - xi) + Math.abs(y - yi) <= 1) row[k] = 1; } row[N] = l[i] === '1' ? 0 : 1; M.push(row); }
  let r = 0; const piv = [];
  for (let c = 0; c < N && r < N; c++) { let p = r; while (p < N && !M[p][c]) p++; if (p === N) continue; [M[r], M[p]] = [M[p], M[r]]; for (let i = 0; i < N; i++) if (i !== r && M[i][c]) for (let k = c; k <= N; k++) M[i][k] ^= M[r][k]; piv.push(c); r++; }
  const x = Array(N).fill(0); piv.forEach((c, i) => { x[c] = M[i][N]; }); return x;
}

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await entrar(d.page, c.jog2, c.senha, 'Ana'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', w: 1500, h: 950, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const Dp = (await t.device({ name: 'dalmo', w: 1300, h: 900, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const Ap = (await t.device({ name: 'ana', w: 1200, h: 850, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 30000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const fecharJanela = p => p.evaluate(() => { const d = document.querySelector('dialog[open]'); if (d) d.close(); });
  const errosDeFora = () => t.errs.filter(e => !/status of (400|401|409)/.test(e));

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Escudo E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  let apagada = false;
  try {
    const codigo = await codigoDaMesa(M);
    for (const [p, cc, n] of [[Dp, c.jog1, 'Dalmo'], [Ap, c.jog2, 'Ana']]) { await p.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, p); await loginTela(p, cc, c.senha); await entrarMesaTela(p, codigo, n); }
    await M.evaluate(() => TC.dados.col('documentos').gravar('mundo:mapa:mp_teste', { dados: { v: 1, id: 'mp_teste', nome: 'Mundo de teste', grade: { x: 0, y: 0, on: true, tam: 10, orient: 'pe' }, terrenos: [], hexes: {}, objs: [] }, vis: 'mestre' }));
    ok(await Dp.evaluate(() => document.getElementById('tab-pistas').hidden) && await Dp.evaluate(() => !document.getElementById('tab-escudo') || document.getElementById('tab-escudo').hidden), 'sem pistas, o Dalmo não vê a aba Pistas (nem a do Escudo)');

    // as Cenas do mestre (para a porta) e o Escudo
    let CF = null, EF = null;
    await M.locator('#tab-cenas').click();
    ok(await ate(async () => { CF = await quadro(M, /\/cenas\//); return CF && await CF.evaluate(() => !!window.__tc && __tc.Nuvem.mestre() && !!__tc.Store.S.current); }, 40000), '(as Cenas do mestre)');
    await M.locator('#tab-escudo').click();
    ok(await ate(async () => { EF = await quadro(M, /\/escudo\//); return EF && await EF.evaluate(() => !!window.__escudo && __escudo.pronto && __escudo.naMesa && __escudo.bancoOk === true); }, 40000), 'o Escudo do mestre abre na mesa (o banco tem a atualização 0025)');
    const ids = await EF.evaluate(() => {
      const A = __escudo.A, E = __escudo.E;
      const rid = A.relogioNovo({ nome: 'O culto desperta', vista: true, porDia: 1, gomos: 6, consequencia: 'O Devorador acorda.' });
      const segredo = A.handoutNovo('carta', { nome: 'O segredo', texto: 'O tesouro está {{sob a ponte velha}}.' });
      const cadeado = A.handoutNovo('puzzle', { nome: 'O cadeado', puzzle: { tipo: 'cadeado', dif: 'facil', seed: 4242 }, liga: { acerto: [{ k: 'revelar', h: segredo, trechos: null, areas: null }], erro: { relogio: rid, gomos: 1 } } });
      const runas = A.handoutNovo('puzzle', { nome: 'As runas', puzzle: { tipo: 'luzes', dif: 'facil', seed: 777 } });
      const sid = A.sessaoNova(null);
      const s = A.sessao(sid); s.passos.push(E.normPasso({ txt: 'A tensão sobe', liga: { k: 'relogio', id: rid, n: 1 } }), E.normPasso({ txt: 'O jantar no castelo' })); A.gravarSessao(sid, s);
      __escudo.irAba('handouts');
      return { rid, segredo, cadeado, runas, sid, resp: E.montarPuzzle(A.handout(cadeado).puzzle).resposta.split(',').map(Number) };
    });
    const entregar = async (hid, so) => {
      await EF.evaluate(id => { __escudo.HO.selecionar(id); __escudo.pintar(); }, hid); await w(300);
      await EF.click('[data-k="h:entregar"]'); await w(200);
      if (so) { await EF.click('[data-k="en:alguns"]'); await w(150); for (const n of so) await EF.locator('.jogadores label', { hasText: n }).locator('input').check(); }
      await EF.click('[data-k="en:ok"]');
      return ate(() => EF.evaluate(id => !!__escudo.A.handout(id).entregue, hid));
    };

    await passo('o painel do roteiro', async () => {
      await M.click('#btnRoteiro');
      ok(await ate(() => M.evaluate(() => !document.getElementById('roteiro').hidden && !!document.querySelector('[data-k="rt:abrir"]'))), 'o botão da barra abre o painel ao lado, com a sessão planejada');
      await M.click('[data-k="rt:abrir"]'); await w(400);
      ok(await ate(() => EF.evaluate(sid => __escudo.A.sessao(sid).estado === 'aberta', ids.sid)), '“Abrir a sessão” pelo painel');
      const p0 = await EF.evaluate(sid => __escudo.A.sessao(sid).passos[0].id, ids.sid);
      await M.click('[data-k="rt:ir:' + p0 + '"]');
      ok(await ate(() => EF.evaluate(rid => __escudo.A.relogio(rid).cheio === 1, ids.rid)), 'o +1 do passo avança o relógio');
      await M.click('[data-k="rt:p:' + p0 + '"]');
      ok(await ate(() => EF.evaluate(sid => __escudo.A.sessao(sid).passos[0].feito, ids.sid)), 'marcar o passo pelo painel');
      await foto(M, 'escudo-rede-painel');
    });

    let PD = null;
    await passo('a carta à mesa toda', async () => {
      await EF.click('[data-k="h:novo:carta"]'); await w(300);
      await EF.fill('[data-k="h:nome"]', 'A carta do barão');
      await EF.fill('[data-k="h:texto"]', 'Caro amigo,\n\nA chave está {{no poço da praça}}. Venha à meia-noite.'); await w(500);
      const carta = await EF.evaluate(() => __escudo.HO.sel);
      ok(await entregar(carta), 'o mestre entrega a carta à mesa toda');
      ok(await ate(() => Dp.evaluate(() => !!document.querySelector('dialog[open] .pista-janela .mancha')), 40000) && await ate(() => Ap.evaluate(() => !!document.querySelector('dialog[open] .pista-janela')), 40000), 'o Dalmo e a Ana recebem a janela, com o trecho escondido como mancha');
      ok(await Dp.evaluate(() => { const l = TC.dados.col('documentos').todas().find(x => x.id.startsWith('pista:') && !x.apagado && x.dados && x.dados.nome === 'A carta do barão'); return !!l && !JSON.stringify(l.dados).includes('poço'); }), 'o trecho escondido nem chega ao aparelho do Dalmo');
      ok(!(await Dp.evaluate(() => document.getElementById('tab-pistas').hidden)), 'a aba Pistas aparece');
      await foto(Dp, 'escudo-rede-janela');
      await Dp.click('[data-k="pj:abrir"]');
      ok(await ate(async () => { PD = await quadro(Dp, /\/pistas\//); return PD && await PD.evaluate(() => !!window.__pistas && __pistas.pronto && !!__pistas.sel); }, 30000), '“Abrir nas Pistas” leva à carta');
      await fecharJanela(Ap);
      await EF.click('[data-k^="h:tr:"]');
      ok(await ate(() => PD.evaluate(() => document.body.innerText.includes('no poço da praça')), 40000), '“Revelar”: o Dalmo vê o trecho');
    });

    await passo('o puzzle só para o Dalmo', async () => {
      ok(await entregar(ids.segredo), '(o segredo, com o trecho escondido, à mesa)');
      await CF.evaluate(pid => { const S = __tc.Store; S.tx('porta', () => S.add('walls', { id: 'w_porta', k: 'door', x1: 128, y1: 128, x2: 192, y2: 128, open: false, locked: true, secret: false, pz: pid })); __tc.UI.renderAll(); }, ids.cadeado);
      // (o painel da porta, nas Cenas do mestre: "Abre com um puzzle")
      await M.locator('#tab-cenas').click(); await w(600);
      await CF.evaluate(() => { __tc.setSel([{ c: 'walls', id: 'w_porta' }]); __tc.UI.renderAll(); }); await w(300);
      const op = await CF.evaluate(() => { const s_ = document.getElementById('wl-pz'); return s_ ? { v: s_.value, o: [...s_.options].map(o => o.textContent), nota: document.querySelector('#side').innerText } : null; });
      ok(!!op && op.v === ids.cadeado && op.o.includes('O cadeado') && /Quando os jogadores resolverem “O cadeado”, a porta abre/.test(op.nota), 'no painel da porta: “Abre com um puzzle” — O cadeado, com a explicação');
      await foto(M, 'escudo-rede-porta');
      await CF.evaluate(() => __tc.setSel([]));
      await M.locator('#tab-escudo').click(); await w(500);
      ok(await entregar(ids.cadeado, ['Dalmo']), 'o cadeado só para o Dalmo');
      ok(await ate(() => PD.evaluate(() => __pistas.pistas().some(x => x.p.tipo === 'puzzle')), 40000), 'o Dalmo recebe o puzzle');
      await w(3000, Ap);
      ok(await Ap.evaluate(() => !TC.dados.col('documentos').todas().some(l => l.id.startsWith('pista:') && !l.apagado && l.dados && l.dados.nome === 'O cadeado')), 'a Ana não recebe (o banco não entrega a ela)');
      await fecharJanela(Dp);
      const pz = await PD.evaluate(() => __pistas.pistas().find(x => x.p.tipo === 'puzzle').id);
      await PD.evaluate(id => __pistas.escolher(id), pz); await w(400, Dp);
      if (ids.resp.some(x => x !== 0)) {
        await PD.click('[data-k="pz:abrir"]');
        ok(await ate(() => PD.evaluate(id => { const jg = __pistas.jogo(id); return jg && jg.erros === 1; }, pz)), 'errar conta um erro');
        ok(await ate(() => EF.evaluate(rid => __escudo.A.relogio(rid).cheio === 2, ids.rid), 30000) && await ate(() => M.evaluate(() => [...document.querySelectorAll('.toast')].some(x => /Erraram “O cadeado”: o relógio O culto desperta andou/.test(x.innerText))), 10000), 'o erro faz o relógio ligado andar, com o aviso para o mestre');
      }
      for (let i = 0; i < ids.resp.length; i++) for (let k = 0; k < ids.resp[i]; k++) { await PD.click('[data-k="pz:d' + i + '-"]'); await w(120, Dp); }
      await w(800, Dp);
      await PD.click('[data-k="pz:abrir"]');
      ok(await ate(() => PD.evaluate(id => { const jg = __pistas.jogo(id); return jg && !!jg.resolvido; }, pz)), 'a combinação certa: resolvido (o banco conferiu)');
      await foto(Dp, 'escudo-rede-cadeado');
      ok(await ate(() => PD.evaluate(() => __pistas.pistas().some(x => x.p.nome === 'O segredo' && x.p.partes.join('').includes('sob a ponte velha'))), 40000), 'ao acertar, o segredo se revela (o vigia do mestre)');
      ok(await ate(() => CF.evaluate(() => { const w_ = __tc.Store.scene().walls.find(x => x.id === 'w_porta'); return !!w_ && w_.open && !w_.locked && w_.pzOk === 1; }), 30000), 'e a porta ligada ao puzzle abre e destranca nas Cenas');
      ok(await ate(() => M.evaluate(() => [...document.querySelectorAll('#feed li')].some(li => /Puzzle resolvido/.test(li.innerText) && /O cadeado/.test(li.innerText))), 30000), 'a Mesa ao vivo diz que o puzzle foi resolvido');
      await foto(M, 'escudo-rede-mestre');
    });

    await passo('os relógios nas Cenas do Dalmo', async () => {
      await Dp.locator('#tab-cenas').click();
      let DC = null;
      ok(await ate(async () => { DC = await quadro(Dp, /\/cenas\//); return DC && await DC.evaluate(() => { const r = document.querySelector('#relCanto:not([hidden]) .relcanto-r'); return !!r && /O culto desperta/.test(r.innerText) && /2 de 6/.test(r.innerText); }); }, 40000), 'o relógio à vista aparece no cantinho das Cenas (o nome e os gomos; a consequência, não)');
      ok(await DC.evaluate(() => !document.body.innerText.includes('Devorador')), '(a consequência não aparece para ele)');
      await foto(Dp, 'escudo-rede-cenas');
      await Dp.locator('#tab-pistas').click(); await w(400, Dp);
    });

    await passo('as runas, juntos', async () => {
      ok(await entregar(ids.runas), 'as runas à mesa toda');
      await ate(() => Ap.evaluate(() => !document.getElementById('tab-pistas').hidden), 40000);
      await fecharJanela(Ap); await fecharJanela(Dp);
      await Ap.locator('#tab-pistas').click();
      let PA = null;
      await ate(async () => { PA = await quadro(Ap, /\/pistas\//); return PA && await PA.evaluate(() => !!window.__pistas && __pistas.pronto && __pistas.pistas().some(x => x.p.nome === 'As runas')); }, 40000);
      await ate(() => PD.evaluate(() => __pistas.pistas().some(x => x.p.nome === 'As runas')), 40000);
      const idD = await PD.evaluate(() => __pistas.pistas().find(x => x.p.nome === 'As runas').id), idA = await PA.evaluate(() => __pistas.pistas().find(x => x.p.nome === 'As runas').id);
      await PD.evaluate(id => __pistas.escolher(id), idD); await PA.evaluate(id => __pistas.escolher(id), idA); await w(400);
      const l0 = await PD.evaluate(id => __pistas.jogo(id).estado.l, idD), toques = resolverLuzes(l0, 3).map((v, i) => (v ? i : -1)).filter(i => i >= 0);
      await PD.click('[data-k="pz:l' + toques[0] + '"]');
      ok(await ate(() => PA.evaluate(id => { const jg = __pistas.jogo(id); return !!jg && !!jg.ultimo && /tocou uma runa/.test(jg.ultimo.txt) && jg.estado.l !== null; }, idA), 30000), 'o lance do Dalmo aparece para a Ana');
      await foto(Ap, 'escudo-rede-runas');
      for (const i of toques.slice(1)) { await PA.click('[data-k="pz:l' + i + '"]'); await w(700, Ap); }
      ok(await ate(() => PD.evaluate(id => { const jg = __pistas.jogo(id); return !!jg && !!jg.resolvido; }, idD), 30000), 'a Ana termina: resolvido para os dois');
    });

    await passo('a imagem com uma área escondida, só para a Ana', async () => {
      await EF.click('[data-k="h:novo:imagem"]'); await w(300);
      const im = await EF.evaluate(() => __escudo.HO.sel);
      const [fc] = await Promise.all([M.waitForEvent('filechooser'), EF.click('[data-k="h:img"]')]);
      await fc.setFiles(path.join(__dirname, 'shot-casca-400.png'));
      ok(await ate(() => EF.evaluate(id => !!__escudo.A.handout(id).img, im)), 'a imagem sobe para a pasta da mesa');
      await ate(() => EF.evaluate(() => { const i = document.querySelector('[data-k="h:img-ed"] img'); return !!i && i.complete && i.naturalWidth > 0 && i.getBoundingClientRect().height > 100; }));
      const bb = await EF.locator('[data-k="h:img-ed"]').boundingBox();
      await M.mouse.move(bb.x + bb.width * 0.2, bb.y + bb.height * 0.2); await M.mouse.down(); await M.mouse.move(bb.x + bb.width * 0.7, bb.y + bb.height * 0.5, { steps: 6 }); await M.mouse.up();
      ok(await ate(() => EF.evaluate(id => __escudo.A.handout(id).areas.length === 1, im)), 'a área escondida');
      await Ap.locator('#tab-fichas').click(); await w(500, Ap);          // (nas Pistas, a nova só aparece na lista; fora delas, a janela)
      ok(await entregar(im, ['Ana']), 'entregue só à Ana');
      const u = await EF.evaluate(id => { const A = __escudo.A, h = A.handout(id), p = A.pistaDoHandout(id, h); return { orig: h.img, pub: p && p.img }; }, im);
      ok(!!u.pub && u.pub !== u.orig, 'os jogadores recebem outra imagem: a já coberta');
      ok(await ate(() => Ap.evaluate(() => { const i = document.querySelector('dialog[open] .pista-janela img'); return !!i && i.complete && i.naturalWidth > 0; }), 40000), 'a Ana vê a imagem na janela');
      await foto(Ap, 'escudo-rede-imagem');
      await fecharJanela(Ap);
    });

    await passo('o Mapa-múndi sugere avançar o relógio', async () => {
      await M.locator('#tab-mundo').click();
      let MF = null;
      await ate(async () => { MF = await quadro(M, /\/mundo\//); return MF && await MF.evaluate(() => !!document.querySelector('#tab-hoje')); }, 40000);
      await MF.click('#tab-hoje'); await w(300);
      await MF.click('#pane [data-k="hoje:+1"]');
      ok(await ate(() => MF.evaluate(() => [...document.querySelectorAll('.toast')].some(x => /relógios do Escudo andam com os dias: O culto desperta \(\+1\)/.test(x.innerText)))), 'passar o dia: o aviso sugere avançar o relógio marcado');
      await foto(M, 'escudo-rede-mundo');
      await MF.locator('.toast', { hasText: 'relógios do Escudo' }).locator('button').click();
      ok(await ate(() => EF.evaluate(rid => __escudo.A.relogio(rid).cheio === 3, ids.rid)), '“Avançar”: o relógio anda');
    });

    await passo('fechar a sessão', async () => {
      await M.locator('#tab-escudo').click(); await w(400);
      await EF.evaluate(sid => { __escudo.irAba('roteiro'); __escudo.escolher(sid); }, ids.sid); await w(300);
      await EF.click('[data-k="s:fechar"]'); await w(300);
      await EF.click('[data-k="fc:ok"]'); await w(500);
      const r = await EF.evaluate(sid => __escudo.A.sessao(sid).resumo, ids.sid);
      ok(/O que aconteceu:\n- A tensão sobe/.test(r) && /O culto desperta: 0 → 3 de 6/.test(r) && /Pistas:/.test(r) && /O cadeado: resolvido por Dalmo/.test(r) && /As runas: resolvido por Ana/.test(r) && /Ficou para depois:\n- O jantar no castelo/.test(r), 'o resumo: os passos, as pistas, os puzzles (quem resolveu) e o relógio — ' + j(r));
      await foto(M, 'escudo-rede-resumo');
      await EF.click('[data-k="s:jornal"]');
      ok(await ate(() => M.evaluate(() => { const d = TC.dados.col('documentos').pegar('jornal:rascunho'); return !!d && !!d.dados && d.dados.materias.some(m => /^Sessão 1/.test(m.tit) && /O cadeado/.test(m.txt)); })), '“Levar ao Jornal”: o resumo vira uma matéria do rascunho');
    });

    await passo('tirar dos jogadores', async () => {
      await EF.evaluate(id => { __escudo.irAba('handouts'); __escudo.HO.selecionar(id); __escudo.pintar(); }, ids.segredo); await w(300);
      await EF.click('[data-k="h:recolher"]'); await w(200); await EF.click('[data-k="dl:sim"]');
      ok(await ate(() => PD.evaluate(() => !__pistas.pistas().some(x => x.p.nome === 'O segredo')), 40000), '“Tirar dos jogadores”: some das Pistas do Dalmo');
      await EF.click('[data-k="desfazer"]');
      ok(await ate(() => PD.evaluate(() => __pistas.pistas().some(x => x.p.nome === 'O segredo')), 40000), 'o Desfazer devolve');
    });

    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = errosDeFora();
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})();
