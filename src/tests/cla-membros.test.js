// Clã (lote 56): o rol dos membros, pela interface, sem mesa (a página sozinha — quem abre é o mestre):
//   · "+ Membro": um nome com a raça, a classe, o nascimento (na janela do calendário do mundo) e o cargo, ou sem cargo;
//   · no rol: mudar a raça, a classe, o cargo (e a liderança, que tem um lugar só), o nascimento e tirar do clã;
//   · a janela do calendário: o mês, a fita dos meses, o ano, os dias, a data em palavras e a idade; Esc desiste;
//   · o respeito dos membros conta também quem não tem cargo;
//   · o salão: a aba Membros com o rol (o nome, a raça e a classe, o cargo e a idade).
// TC_SCRATCH=<pasta> guarda capturas.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }

(async () => {
  const t = await start();
  const dv = await t.device({ name: 'cla-membros', w: 1440, h: 950 });
  const P = dv.page;
  P.setDefaultTimeout(8000);
  const A = (fn, arg) => P.evaluate(fn, arg);
  const k = s => P.locator(`[data-k="${s}"]`);
  const clicar = async sel => { await P.click(sel); await espera(180); };
  const cla = () => A(() => __cla.doc('cla:c:' + __cla.sel));
  const foto = async (nome, sel) => { if (process.env.TC_SCRATCH) { if (sel) await P.locator(sel).first().screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); else await P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const pid = nome => A(n => { const N = window.ClaNucleo, m = N.membrosDe(__cla.doc('cla:c:' + __cla.sel)).find(x => x.pessoa.nome === n); return m ? m.pid : null; }, nome);

  await passo('o clã', async () => {
    await P.goto(t.base + 'cla/?debug', { waitUntil: 'load' });
    await P.waitForFunction(() => window.__cla && __cla.pronto, null, { timeout: 15000 }); await espera(300);
    await clicar('[data-k="novo-cla"]');
    await P.fill('#dlg [data-k="dl:nome"]', 'Lâmina do Crepúsculo'); await clicar('#dlg [data-k="dl:sim"]');
    ok(await k('sec:rol').isVisible() && /Ninguém no clã ainda/.test(await k('sec:rol').innerText()), 'o cartão Membros, vazio, com “+ Membro”');
  });

  await passo('+ Membro com o calendário', async () => {
    await clicar('[data-k="rol:novo"]');
    await P.fill('#dlg [data-k="dl:nome"]', 'Oswin');
    await P.fill('#dlg [data-k="dl:racan"]', 'Humano');
    await P.fill('#dlg [data-k="dl:classen"]', 'Arqueiro');
    await clicar('#dlg [data-k="dl:nasc"]');
    ok(await P.locator('.tcc').isVisible() && await P.locator('.tcc-fita button').count() === 12 && await P.locator('.tcc-dia').count() === 30, 'a janela do calendário: os doze meses na fita e os trinta dias');
    await clicar('.tcc [data-c="mes+"]'); await clicar('.tcc [data-c="mes+"]');
    ok(await P.locator('.tcc-mes b').innerText() === 'Semeadura', 'as setas trocam o mês');
    await P.fill('.tcc [data-c="ano"]', '380'); await P.locator('.tcc [data-c="ano"]').dispatchEvent('change'); await espera(120);
    await clicar('.tcc-dia[data-d="12"]');
    ok(/12 de Semeadura, ano 380/.test(await P.locator('.tcc-diz').innerText()), 'a data em palavras: ' + await P.locator('.tcc-diz').innerText());
    await foto('l55-calendario', '.tcc');
    await clicar('.tcc [data-c="ok"]');
    ok(/12 de Semeadura, ano 380/.test(await P.locator('#dlg [data-k="dl:nasc"]').innerText()), 'a data volta para a janela do membro');
    await clicar('#dlg [data-k="dl:sim"]');
    const c = await cla();
    const membros = await A(() => window.ClaNucleo.membrosDe(__cla.doc('cla:c:' + __cla.sel)).map(x => ({ n: x.pessoa.nome, cargo: x.cargo, d: x.dados })));
    ok(membros.length === 1 && membros[0].n === 'Oswin' && membros[0].cargo === null && JSON.stringify(membros[0].d) === JSON.stringify({ racaN: 'Humano', classeN: 'Arqueiro', nasc: { d: 12, m: 2, a: 380 } }) && c.membros.avulsos.length === 1,
      'Oswin entrou sem cargo, com a raça, a classe e o nascimento: ' + JSON.stringify(membros));
  });

  await passo('o rol', async () => {
    // mais dois: a líder (num cargo) e um sem nascimento
    await clicar('[data-k="rol:novo"]'); await P.fill('#dlg [data-k="dl:nome"]', 'Bruna Vel'); await P.fill('#dlg [data-k="dl:racan"]', 'Elfa'); await P.selectOption('#dlg [data-k="dl:cargo"]', 'lider'); await clicar('#dlg [data-k="dl:sim"]');
    await clicar('[data-k="rol:novo"]'); await P.fill('#dlg [data-k="dl:nome"]', 'Tomas'); await clicar('#dlg [data-k="dl:sim"]');
    const lider = await A(() => __cla.doc('cla:c:' + __cla.sel).cargos.lider.gente.map(p => p.nome));
    ok(JSON.stringify(lider) === JSON.stringify(['Bruna Vel']), 'Bruna Vel entrou direto na liderança');
    const ps = await pid('Tomas');
    await P.fill(`[data-k="rol:classen:${ps}"]`, 'Ferreiro'); await k('rol:classen:' + ps).dispatchEvent('change'); await espera(160);
    ok((await cla()).membros.dados[ps].classeN === 'Ferreiro', 'a classe muda no rol');
    await P.selectOption(`[data-k="rol:cargo:${ps}"]`, 'lider'); await espera(200);
    ok(/um lugar só/.test(await A(() => [...document.querySelectorAll('#toasts .toast')].map(x => x.innerText).join(' '))) && (await cla()).cargos.lider.gente.length === 1, 'a liderança tem um lugar só: o aviso, e nada muda');
    // o respeito de quem não tem cargo
    ok(await k('mb:mais:' + ps).count() === 1, 'o respeito dos membros conta também quem não tem cargo');
    const po = await pid('Oswin');
    await clicar(`[data-k="rol:x:${ps}"]`);
    ok(!(await pid('Tomas')) && (await cla()).respGuardado[ps] === 0, 'tirar do clã (o respeito fica guardado)');
    await foto('l55-rol-mestre', '[data-k="sec:rol"]');
    ok(!!po, 'Oswin continua');
  });

  // (lote 59) a foto do membro: clicar no avatar escolhe a imagem; o × tira
  await passo('a foto', async () => {
    const po = await pid('Oswin');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGM4Y+yCFTEMLQkAr5lQwWMa+ZsAAAAASUVORK5CYII=', 'base64');
    const [esc] = await Promise.all([P.waitForEvent('filechooser'), P.click(`[data-k="rol:foto:${po}"]`)]);
    await esc.setFiles({ name: 'oswin.png', mimeType: 'image/png', buffer: png }); await espera(1200);
    let img = null;
    for (let t = 0; t < 20 && !img; t++) { img = await A(id => { const d = __cla.doc('cla:c:' + __cla.sel).membros.dados[id]; return d && d.img; }, po); if (!img) await espera(250); }
    await espera(200);
    ok(/^data:image\/png;base64,/.test(img || '') && await P.locator(`[data-rol="${po}"] .av img`).count() >= 1 && await k('rol:sem-foto:' + po).count() === 1, 'a foto do Oswin: guardada no clã, no avatar, com o × para tirar — ' + String(img).slice(0, 40) + ' · ' + (await P.locator(`[data-rol="${po}"] .av img`).count()) + ' · ' + (await k('rol:sem-foto:' + po).count()) + ' · ' + (await P.locator('#toasts').innerText().catch(() => '')));
    await foto('l59-foto-membro', '[data-k="sec:rol"]');
  });

  await passo('o salão', async () => {
    await clicar('[data-vista="salao"]');
    await clicar('#escolhaCla [data-cla="' + await A(() => __cla.sel) + '"]').catch(() => {});
    await clicar('#abas [data-aba="membros"]');
    const txt = (await P.locator('#parte').innerText()).replace(/\s+/g, ' ');
    ok(/Bruna Vel/.test(txt) && /Elfa/.test(txt) && /Oswin/.test(txt) && /Humano · Arqueiro/.test(txt) && /sem cargo/.test(txt), 'a aba Membros: o rol com a raça, a classe e o cargo — ' + txt.slice(0, 200));
    ok(/12 de Semeadura, ano 380/.test(txt), 'a data de nascimento no rol');
    await foto('l55-rol-salao');
  });

  const erros = dv.errs ? dv.errs.filter(e => !/favicon|fonts\.g/.test(e)) : [];
  ok(!erros.length, 'sem erros no console: ' + erros.slice(0, 3).join(' | '));
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
