// Clã (lote 85): a foto padrão por cargo, sem mesa (a página sozinha — quem abre é o mestre):
//   · no cartão de cada cargo (Geral), o botão da foto padrão: quem do cargo não tem foto aparece com ela;
//   · "Foto padrão do clã" (Membros): a de quem não tem foto nem a do cargo (lote 88: vale também para quem tem cargo);
//   · a foto do próprio membro (ou da ficha) continua valendo por cima da padrão;
//   · trocar e tirar pelo menu pequeno; Desfazer;
//   · o núcleo guarda só as fotos de cargos que existem (e '_sem').
// TC_SCRATCH=<pasta> guarda capturas.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const PNG = c => Buffer.from({
  r: 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGO4o6GBFTEMLQkAe3tLAfuiUfAAAAAASUVORK5CYII=',
  b: 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGPQCLiDFTEMLQkACbdVAfTkR+4AAAAASUVORK5CYII=',
}[c], 'base64');

(async () => {
  const t = await start();
  const dv = await t.device({ name: 'cla-lote85', w: 1440, h: 950 });
  const P = dv.page;
  P.setDefaultTimeout(8000);
  const A = (fn, arg) => P.evaluate(fn, arg);
  const k = s => P.locator(`[data-k="${s}"]`);
  const clicar = async sel => { await P.click(sel); await espera(200); };
  const cla = () => A(() => __cla.doc('cla:c:' + __cla.sel));
  const foto = async (nome, sel) => { if (process.env.TC_SCRATCH) { const f = path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png'); if (sel) await P.locator(sel).first().screenshot({ path: f }); else await P.screenshot({ path: f }); } };
  const pid = nome => A(n => { const m = window.ClaNucleo.membrosDe(__cla.doc('cla:c:' + __cla.sel)).find(x => x.pessoa.nome === n); return m ? m.pid : null; }, nome);
  const escolher = async (sel, cor) => { const [esc] = await Promise.all([P.waitForEvent('filechooser'), P.click(sel)]); await esc.setFiles({ name: cor + '.png', mimeType: 'image/png', buffer: PNG(cor) }); };
  const ate = async (fn, ms = 6000) => { const t0 = Date.now(); for (;;) { if (await fn()) return true; if (Date.now() - t0 > ms) return false; await espera(200); } };
  const novoMembro = async (nome, cargo) => {
    await clicar('[data-k="rol:novo"]');
    await P.fill('#dlg [data-k="dl:nome"]', nome);
    if (cargo) await P.selectOption('#dlg [data-k="dl:cargo"]', cargo);
    await clicar('#dlg [data-k="dl:sim"]');
  };

  await passo('o clã com 3 membros', async () => {
    await P.goto(t.base + 'cla/?debug&tudo', { waitUntil: 'load' });
    await P.waitForFunction(() => window.__cla && __cla.pronto, null, { timeout: 15000 }); await espera(300);
    await clicar('[data-k="novo-cla"]');
    await P.fill('#dlg [data-k="dl:nome"]', 'Lâmina do Crepúsculo'); await clicar('#dlg [data-k="dl:sim"]');
    await A(() => __cla.irAba('membros')); await espera(200);
    await novoMembro('Brida', 'lider');
    await novoMembro('Oswin');
    await novoMembro('Tamsin');
    const c = await cla();
    ok(c.cargos.lider.gente.length === 1 && c.membros.avulsos.length === 2, '(a Brida lidera; Oswin e Tamsin sem cargo)');
  });

  await passo('a foto padrão do líder', async () => {
    await A(() => __cla.irAba('geral')); await espera(250);
    ok(await k('fcg:lider').count() === 1, 'o cartão do Líder tem o botão da foto padrão');
    await escolher('[data-k="fcg:lider"]', 'r');
    ok(await ate(async () => /^data:image\/png/.test(((await cla()).membros.imgCargo || {}).lider || '')), 'a foto padrão do Líder fica guardada no clã (membros.imgCargo)');
    const brida = await pid('Brida');
    ok(await ate(async () => (await P.locator(`[data-pessoa="${brida}"] .av img`).count()) === 1), 'a Brida, sem foto, aparece com a foto padrão do cargo');
    ok(await P.locator('[data-k="fcg:lider"] img').count() === 1, 'o botão mostra a foto escolhida');
    await foto('l85-cargo', '[data-cargo="lider"]');
  });

  await passo('a foto dos sem cargo', async () => {
    await A(() => __cla.irAba('membros')); await espera(250);
    const oswin = await pid('Oswin');
    ok(await P.locator(`[data-rol="${oswin}"] .av img`).count() === 0, 'antes: Oswin sem foto (as iniciais)');
    await escolher('[data-k="fcg:_sem"]', 'b');
    ok(await ate(async () => /^data:image\/png/.test(((await cla()).membros.imgCargo || {})._sem || '')), '"Foto dos sem cargo" guardada');
    ok(await ate(async () => (await P.locator(`[data-rol="${oswin}"] .av img`).count()) >= 1), 'Oswin (sem cargo) aparece com ela');
    ok(await P.locator('[data-k="fcg:_sem"] img').count() === 1, 'o botão "Foto padrão do clã" mostra a foto escolhida');
    // a foto do próprio membro vale por cima
    const tamsin = await pid('Tamsin');
    await clicar(`[data-rol="${tamsin}"]`).catch(() => {});
    if (await k('rol:foto:' + tamsin).count()) {
      await escolher(`[data-k="rol:foto:${tamsin}"]`, 'r');
      ok(await ate(async () => { const c = await cla(); return !!(c.membros.dados[tamsin] || {}).img; }), 'a Tamsin ganha a foto dela');
      const srcs = await A(([o, tm]) => [o, tm].map(id => { const im = document.querySelector(`[data-rol="${id}"] .av img`); return im ? im.src : null; }), [oswin, tamsin]);
      ok(srcs[1] && srcs[0] && srcs[0] !== srcs[1], 'a foto da Tamsin é a dela, não a padrão');
    } else ok(false, '(o botão da foto da Tamsin não apareceu)');
    await foto('l85-membros', '[data-k="sec:rol"]');
  });

  await passo('trocar, tirar e desfazer', async () => {
    await A(() => __cla.irAba('geral')); await espera(250);
    await clicar('[data-k="fcg:lider"]');
    ok(await k('fcg-trocar').count() === 1 && await k('fcg-tirar').count() === 1, 'com foto, o botão abre o menu: trocar ou tirar');
    await clicar('[data-k="fcg-tirar"]');
    ok(await ate(async () => !((await cla()).membros.imgCargo || {}).lider), 'tirar: a foto padrão do Líder sai');
    const brida = await pid('Brida');
    // (lote 88) sem a foto do cargo, ela fica com a foto padrão do clã (a dos sem cargo)
    const srcB = await A(id => { const im = document.querySelector(`[data-pessoa="${id}"] .av img`); return im ? im.src : null; }, brida);
    const sem = ((await cla()).membros.imgCargo || {})._sem;
    ok(srcB && srcB === sem, '(lote 88) e a Brida passa para a foto padrão do clã');
    await clicar('#btDesfazer');
    ok(await ate(async () => !!((await cla()).membros.imgCargo || {}).lider), 'Desfazer devolve a foto padrão');
  });

  await passo('o núcleo', async () => {
    const r = await A(() => { const N = window.ClaNucleo, c = N.normCla({ nome: 'x', cargos: { lider: { nome: 'Líder', gente: [] }, cg_a: { nome: 'Batedores', pai: 'lider', gente: [] } },
      membros: { avulsos: [], imgCargo: { lider: 'https://x.y/a.png', cg_a: 'javascript:alert(1)', cg_nao: 'https://x.y/b.png', _sem: 'https://x.y/c.png' } } }); return c.membros.imgCargo; });
    ok(JSON.stringify(r) === JSON.stringify({ lider: 'https://x.y/a.png', _sem: 'https://x.y/c.png' }), 'o núcleo guarda só imagens válidas de cargos que existem (e a dos sem cargo): ' + JSON.stringify(r));
  });

  const fora = t.errs.filter(e => !/favicon|fonts\.g/i.test(e));
  ok(fora.length === 0, 'sem erros no console: ' + fora.slice(0, 3).join(' | '));
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
