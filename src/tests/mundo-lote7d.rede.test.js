// Mapa-múndi, lote 7 (parte 5c), numa mesa de verdade (banco local de ensaio ou o projeto real):
//   · a zona de perigo no "Próximo dia": a proposta com a equipe (o personagem do jogador marcado, com o antes e o
//     depois), "Aplicar" mexendo na ficha de verdade e o Desfazer voltando;
//   · o clima de hoje do mapa mostrado aos jogadores no Acampamento (aparece; "Usar na cena"; a noite de chuva no
//     descanso longo, marcada, mexendo na prévia do Conforto) e na Meditação ("Usar no fundo da cena").
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const j = JSON.stringify;
const pc = (id, nome, lvl, estado) => ({ id, nome, raca: 'Humano', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: lvl, tiers: { FOR: 'A', DES: 'C', AGI: 'D', VIT: 'B', CAN: 'E' }, pctProprio: null,
  poderes: [], skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 10, DFM: 4 }, rol: { fixa: 20, fonte: 'total' }, ultRol: null,
  disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 }, estaque: { a: '', b: '' }, habilidades: [], itens: [],
  recursos: [{ id: 'hp' + id, nome: 'HP', fml: 'VIT*8 + LVL*5' }], notas: '', estado });
const local = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_dain', 'Dain X', 5, { san: 60, conf: 30 }), pc('pc_ogro', 'Ogro', 6, {})], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { urgm_calc_atributos_v1: local, 'tinycats:aba': 'fichas' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1250, h: 820, seed: { 'tinycats:aba': 'mundo' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re) => { for (let i = 0; i < 60; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const linha = (p, id) => p.evaluate(id => TC.dados.col('personagens').pegar(id), id);
  const semPendencia = p => p.evaluate(() => TC.dados.pendentes === 0);
  let nomeMesa = null;
  try {
    // ---------- a mesa, as fichas e o jogador ----------
    await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
    await loginTela(M, c.mestre, c.senha);
    nomeMesa = 'Clima E2E ' + Date.now().toString(36);
    const codigo = await criarMesaTela(M, nomeMesa);
    let F = null;
    ok(await ate(async () => { F = await quadro(M, /\/fichas\//); return F && (await F.locator('#ofertaSim').count()) === 1; }), '(a mesa nova oferece trazer as fichas)');
    await F.locator('#ofertaSim').click(); await w(600);
    ok(await ate(async () => await M.evaluate(() => TC.dados.col('personagens').todas().length === 2 && TC.dados.pendentes === 0)), '(as duas fichas sobem)');
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    const jogId = await J.evaluate(() => TC.conta.usuario.id);
    ok(await ate(async () => (await F.locator('#f_dono option').allInnerTexts()).join('|').includes('Dalmo')), '(o jogador entra na mesa)');
    await F.locator('#f_dono').selectOption({ label: 'Dalmo' }); await w(500);
    ok(await ate(async () => { const l = await linha(M, 'pc_dain'); return l.dono_id === jogId && await semPendencia(M); }), '(o Dain X é do jogador)');

    // ---------- o mapa: a zona de frio, o grupo dentro e a chuva certa hoje ----------
    await M.locator('#tab-mundo').click();
    let W = null;
    ok(await ate(async () => { W = await quadro(M, /\/mundo\//); return W && await W.evaluate(() => !!window.__mundo && __mundo.App.pronto && __mundo.App.naMesa && __mundo.App.papel === 'mestre'); }), 'o mestre abre o Mapa-múndi da mesa');
    const ids = await W.evaluate(() => {
      const { App, N } = __mundo, out = {};
      App.criarMapa('Terras Frias');
      App.mudar('montar', m => {
        m.grade.tam = 40;
        m.clima = { tab: m.cal.meses.map(() => ({ chuva: 100 })) };
        const z = N.objNovo('z', { tipo: 'frio', pts: [[100, 100], [500, 100], [500, 500], [100, 500]], ini: m.cal.dia, nome: '' });
        const g = Object.assign(N.objNovo('g', { x: 300, y: 300, sigla: 'HER' }), { nome: 'Os Heróis' });
        m.objs.push(z, g); out.z = z.id; out.g = g.id; out.mapa = m.id;
      });
      return out;
    });
    ok(!!(ids.z && ids.g), '(a zona de frio e Os Heróis dentro dela)');

    // ---------- o Próximo dia: a proposta ----------
    await W.locator('#diaMais').click();
    ok(await ate(async () => (await W.locator('dialog.mundo-dl[open]').count()) === 1, 8000), 'no Próximo dia, a proposta abre');
    const dl = W.locator('dialog.mundo-dl[open]'), txt = (await dl.innerText()).replace(/\s+/g, ' ');
    const marcado = await dl.locator('input[type="checkbox"][value="pc_dain"]').isChecked(), ogro = await dl.locator('input[value="pc_ogro"]').count();
    ok(/Um dia em "Frio extremo" — Os Heróis/.test(txt) && /Fadiga −1 passo, Conforto −10/.test(txt) && /Dain X: Fadiga Descansado → Disposto · Conforto 30 → 20/.test(txt) && marcado && ogro === 0,
      'a proposta: o que um dia no frio faz, o Dain X (do jogador) marcado, com o antes e o depois; o Ogro (do mestre) não: ' + txt.slice(0, 300));
    await dl.locator('button[type="submit"]').click(); await w(400);
    ok(await ate(async () => { const l = await linha(M, 'pc_dain'); return l.estado.conf === 20 && l.estado.fad === 4 && l.estado.san === 60 && await semPendencia(M); }), '"Aplicar" muda a ficha de verdade (Conforto 20, Fadiga um passo mais cansado)');
    const aviso = await W.evaluate(() => [...document.querySelectorAll('#toasts .toast')].map(x => x.textContent).join(' | '));
    ok(/Feito: Fadiga −1 passo, Conforto −10 para Dain X — um dia em "Frio extremo"\./.test(aviso), 'o aviso diz o que mudou: ' + aviso);
    await W.locator('#toasts .toast', { hasText: 'Feito:' }).locator('button').click(); await w(400);
    ok(await ate(async () => { const l = await linha(M, 'pc_dain'); return l.estado.conf === 30 && !(l.estado.fad < 5) && await semPendencia(M); }), 'o Desfazer volta a ficha');

    // ---------- o clima no Acampamento e na Meditação (com o mapa mostrado) ----------
    await W.evaluate(id => { __mundo.App.mudar('o grupo fora da zona', m => { const g = m.objs.find(o => o.k === 'g'); g.x = 900; g.y = 300; }); __mundo.App.mostrarAosJogadores(id); }, ids.mapa);
    ok(await ate(async () => await M.evaluate(id => { const d = TC.dados.col('documentos'), i = d.pegar('mundo:indice'), p = d.pegar('mundo:pub:' + id); return !!(i && i.dados && i.dados.mostrado === id && p && p.dados && p.dados.clima && p.dados.clima.hoje === 'chuva') && TC.dados.pendentes === 0; }, ids.mapa)),
      'o mapa mostrado leva o clima de hoje pronto (chuva)');
    await M.locator('#tab-acampamento').click();
    let A = null;
    ok(await ate(async () => { A = await quadro(M, /\/acampamento\//); return A && await A.evaluate(() => !!window.__acamp && __acamp.pronto && __acamp.modo === 'mesa' && __acamp.papel === 'mestre'); }), 'o mestre abre o Acampamento');
    ok(await ate(async () => /Hoje no Mapa-múndi: Chuva — a noite mexe no Conforto \(−5\)/.test(await A.locator('#clima-mundo').innerText().catch(() => ''))), 'em "A cena": o clima de hoje do Mapa-múndi, e a noite');
    await A.locator('#clima-usar').click(); await w(400);
    ok(await A.evaluate(() => __acamp.camp.clima) === 'chuva' && await A.locator('#clima-usar').count() === 0, '"Usar na cena": a chuva no desenho do acampamento');
    await A.evaluate(() => { if (!__acamp.camp.presentes.includes('pc_dain')) __acamp.mudar('chamar', c => { c.presentes.push('pc_dain'); }); }); await w(300);
    await A.locator('#btLongo').click(); await w(400);
    const d1 = A.locator('dialog[open]'), com = (await d1.innerText()).replace(/\s+/g, ' ');
    const m1 = /30 → (\d+)/.exec(com);
    ok(await A.locator('#ds-clima').isChecked() && /A noite de chuva no Mapa-múndi: Conforto −5/.test(com), 'no descanso longo, a noite de chuva vem marcada');
    await A.locator('#ds-clima').click(); await w(300);
    const sem = (await d1.innerText()).replace(/\s+/g, ' '), m2 = /30 → (\d+)/.exec(sem);
    // (sem a noite de chuva, o Conforto pode nem mudar: a prévia mostra "—", e fica 30)
    const para2 = m2 ? Number(m2[1]) : 30;
    ok(m1 && para2 - Number(m1[1]) === 5, 'desmarcada, o Conforto da prévia sobe 5: ' + j([m1 && m1[1], para2]));
    await A.locator('dialog[open] .btn', { hasText: 'Cancelar' }).click(); await w(300);
    await M.locator('#tab-meditacao').click();
    let D = null;
    ok(await ate(async () => { D = await quadro(M, /\/meditacao\//); return D && await D.locator('[data-k="c:clima-mundo"]').count() === 1; }), 'na Meditação, quem mestra vê o clima de hoje do Mapa-múndi');
    ok(/Hoje no Mapa-múndi: Chuva\./.test(await D.locator('[data-k="c:clima-mundo"]').innerText()), '(chuva)');
    await D.locator('[data-k="c:clima-usar"]').click(); await w(500);
    ok(await ate(async () => await M.evaluate(() => { const d = TC.dados.col('documentos').pegar('medit:cena'); return !!(d && d.dados && d.dados.clima === 'chuva') && TC.dados.pendentes === 0; })), '"Usar no fundo da cena": a chuva na cena da Meditação');
  } finally {
    if (nomeMesa) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste:', e.message); } }
    const erros = (t.errs || []).filter(e => !/^\[prep\]/.test(e) && !/Multiple GoTrueClient instances/.test(e) && !/status of (400|401|403|409)/.test(e));
    if (erros.length) console.log(erros.slice(0, 8).join('\n'));
    ok(erros.length === 0, 'sem erros inesperados no console');
    await t.close();
    end();
  }
})().catch(e => { console.error(e); process.exit(1); });
