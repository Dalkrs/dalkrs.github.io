// Administração, lote 27, sem rede: a página admin/ dentro de uma casca de mentira (TC.conta.admin responde daqui).
//   · as contas (com as mesas e as marcas), a busca, o lado da conta: trocar a senha (com a confirmação), editar,
//     apagar (bloqueado para o dono de mesa, o administrador e a própria conta);
//   · as mesas, o cadastro (abrir/fechar e o teto) e o registro.
const { start, checker } = require('./lib');
const { ok, end } = checker();
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'admin27', w: 1300, h: 850 });
  const w = ms => P.waitForTimeout(ms);
  const E = (fn, a) => P.evaluate(fn, a);
  const F = () => P.frame({ url: /\/admin\// });
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await P.goto(t.base + 'versao.json'); await w(100);
  await E(base => {
    window.__ped = [];
    const contas = [
      { id: 'u1', email: 'dono@x.com', nome: 'Dalmo', criada: '2026-01-01T10:00:00Z', acesso: '2026-10-24T10:00:00Z', trocar: false, admin: true, donoDe: 1, mesas: [{ id: 'm1', nome: 'Urgm', papel: 'mestre', nomeNaMesa: 'Dalmo' }] },
      { id: 'u2', email: 'hydradraven@gmail.com', nome: 'HEN RAZOR', criada: '2026-02-01T10:00:00Z', acesso: '2026-10-22T10:00:00Z', trocar: true, admin: false, donoDe: 0, mesas: [{ id: 'm1', nome: 'Urgm', papel: 'jogador', nomeNaMesa: 'HEN RAZOR' }] },
      { id: 'u3', email: 'bruno@x.com', nome: 'Bruno', criada: '2026-02-01T10:00:00Z', acesso: '2026-10-23T10:00:00Z', trocar: false, admin: false, donoDe: 2, mesas: [] },
      { id: 'u4', email: 'dravenezac@gmail.com', nome: 'hen', criada: '2026-10-24T10:00:00Z', acesso: '2026-10-24T19:00:00Z', trocar: false, admin: false, donoDe: 0, mesas: [] }];
    const resumo = { contas, mesas: [{ id: 'm1', nome: 'Urgm', criada: '2026-01-01', dono: 'Dalmo', donoEmail: 'dono@x.com', membros: [{ nome: 'Dalmo', papel: 'mestre' }, { nome: 'HEN RAZOR', papel: 'jogador' }], visto: '2026-10-24' }],
      cadastro: { aberto: true, teto: 300 }, registro: [{ em: '2026-10-24T12:00:00Z', admin_email: 'dono@x.com', acao: 'senha', alvo: 'HEN RAZOR <hydradraven@gmail.com>', detalhe: {} }], eu: 'u1' };
    const mesa = { id: 'm1', nome: 'Urgm', dono_id: 'u1', criada: '2026-01-01', codigo: 'ABC-DEF', campanhas: [{ id: 'c1', nome: 'Sangue e Cinzas', encerrada: false }],
      membros: [{ usuario_id: 'u1', nome: 'Dalmo', papel: 'mestre', email: 'dono@x.com', campanhas: [], visto_em: null }, { usuario_id: 'u2', nome: 'HEN RAZOR', papel: 'jogador', email: 'hydradraven@gmail.com', campanhas: ['c1'], visto_em: null }],
      fichas: { total: 5, deJogadores: 2, npcs: 3 }, documentos: { Cenas: 10, 'Mapa-múndi': 2 }, registro: 300, ultimaFala: null, ultimaMudanca: null, arquivos: { total: 4, bytes: 2048000 }, auditoria: null };
    window.__abriu = null;
    window.TC = { mesas: { abrir: async (id, o) => { window.__abriu = [id, o]; } },
      conta: { admin: async (acao, a) => { window.__ped.push([acao, a]); if (acao === 'resumo') return JSON.parse(JSON.stringify(resumo)); if (acao === 'mesa') return JSON.parse(JSON.stringify(mesa)); if (acao === 'copia') return { formato: 'tinycats-mesa', mesa: { nome: 'Urgm' } }; if (acao === 'apagar' && a.id === 'u3') throw new Error('Essa conta é dona de 2 mesas.'); return { ok: true }; } } };
    const f = document.createElement('iframe'); f.src = base + 'admin/'; f.style.cssText = 'width:1280px;height:820px;border:0';
    document.body.replaceChildren(f);
  }, t.base);
  await w(1200);

  await passo('as contas', async () => {
    const f = F();
    ok(await f.locator('tr.linha').count() === 4, 'as quatro contas na lista');
    ok(/administrador/.test(await f.locator('tr[data-conta="u1"]').innerText()) && /trocar a senha/.test(await f.locator('tr[data-conta="u2"]').innerText()), 'com as marcas (administrador, trocar a senha)');
    await f.locator('#busca').fill('hydra'); await w(150);
    ok(await f.locator('tr.linha').count() === 1, 'a busca pelo e-mail');
    await f.locator('#busca').fill(''); await w(100);
  });

  await passo('trocar a senha', async () => {
    const f = F();
    await f.locator('tr[data-conta="u2"]').click(); await w(150);
    ok(/HEN RAZOR/.test(await f.locator('.lado h2').innerText()), 'clicar abre a conta do lado');
    await f.locator('#c-senha').fill('rpg1234'); await f.locator('#c-trocar').click(); await w(150);
    ok(await f.locator('.dlg').count() === 1, 'pergunta antes');
    await f.locator('#dlg-ok').click(); await w(300);
    ok(JSON.stringify(await E(() => window.__ped.find(p => p[0] === 'senha'))) === JSON.stringify(['senha', { id: 'u2', senha: 'rpg1234' }]), 'manda a senha provisória para a conta certa');
    ok(/Senha trocada/.test(await f.locator('#recado').innerText()), 'e avisa');
  });

  await passo('editar e apagar', async () => {
    const f = F();
    await f.locator('#c-nome').fill('Hen Razor'); await f.locator('#c-salvar').click(); await w(300);
    ok(await E(() => { const p = window.__ped.find(x => x[0] === 'editar'); return p && p[1].nome === 'Hen Razor' && p[1].id === 'u2'; }), 'editar o nome');
    await f.locator('tr[data-conta="u1"]').click(); await w(150);
    ok(await f.locator('#c-apagar').isDisabled() && /sua conta/.test(await f.locator('.lado').innerText()), 'a própria conta não se apaga');
    await f.locator('tr[data-conta="u3"]').click(); await w(150);
    ok(await f.locator('#c-apagar').isDisabled() && /dona de 2 mesas/.test(await f.locator('.lado').innerText()), 'o dono de mesa também não (diz por quê)');
    await f.locator('tr[data-conta="u4"]').click(); await w(150);
    await f.locator('#c-apagar').click(); await w(100); await f.locator('#dlg-ok').click(); await w(300);
    ok(await E(() => window.__ped.some(p => p[0] === 'apagar' && p[1].id === 'u4')), 'apagar a conta extra (com a confirmação)');
  });

  await passo('mesas: detalhes, participantes, cópia, auditoria e apagar', async () => {
    const f = F();
    await f.locator('#aba-mesas').click(); await w(150);
    ok(await f.locator('.card').count() === 1 && /HEN RAZOR · jogador/.test(await f.locator('.card').innerText()), 'as mesas com os participantes');
    await f.locator('.card[data-mesa="m1"]').click(); await w(300);
    const lado = await f.locator('.lado').innerText();
    ok(/5 fichas/.test(lado) && /2,0 MB/.test(lado) && /Cenas · 10/.test(lado) && /Sangue e Cinzas/.test(lado), 'o que há na mesa: fichas, arquivos, documentos e campanhas');
    ok(await f.locator('.part[data-usuario="u1"] .part-acoes').count() === 0 && await f.locator('.part[data-usuario="u2"] .part-acoes').count() === 1, 'o dono não tem as ações; os outros, sim');
    await f.locator('.part[data-usuario="u2"] select').selectOption('auxiliar'); await w(300);
    ok(await E(() => window.__ped.some(p => p[0] === 'papel' && p[1].usuario === 'u2' && p[1].papel === 'auxiliar')), 'mudar o papel para mestre auxiliar');
    await f.locator('.part[data-usuario="u2"] button', { hasText: 'Passar a mesa' }).click(); await w(100); await f.locator('#dlg-ok').click(); await w(300);
    ok(await E(() => window.__ped.some(p => p[0] === 'dono' && p[1].usuario === 'u2')), 'passar a mesa (com a pergunta)');
    await f.locator('.part[data-usuario="u2"] button', { hasText: 'Tirar' }).click(); await w(100); await f.locator('#dlg-ok').click(); await w(300);
    ok(await E(() => window.__ped.some(p => p[0] === 'tirar' && p[1].usuario === 'u2')), 'tirar da mesa');
    const [baixa] = await Promise.all([P.waitForEvent('download', { timeout: 5000 }), f.locator('#m-copia').click()]);
    ok(/^mesa-urgm-\d{4}-\d\d-\d\d\.json$/.test(baixa.suggestedFilename()), 'a cópia baixa um .json: ' + baixa.suggestedFilename());
    ok(await f.locator('#m-apagar').isDisabled(), 'apagar só libera com o nome da mesa');
    await f.locator('#m-apagar-nome').fill('Urgm'); await w(80);
    await f.locator('#m-apagar').click(); await w(100); await f.locator('#dlg-ok').click(); await w(300);
    ok(await E(() => window.__ped.some(p => p[0] === 'apagar-mesa' && p[1].nome === 'Urgm')), 'apagar a mesa (o nome vai junto, e o servidor confere)');
    await f.locator('.card[data-mesa="m1"]').click(); await w(300);
    await f.locator('#m-ver').click(); await w(300);
    ok(await E(() => window.__ped.some(p => p[0] === 'entrar' && p[1].modo === 'ver')) && JSON.stringify(await E(() => window.__abriu)) === JSON.stringify(['m1', { auditoria: 'ver' }]), 'entrar só para olhar: abre a sessão e a mesa na casca, em modo auditoria');
  });

  await passo('cadastro e registro', async () => {
    const f = F();
    await f.locator('#aba-cadastro').click(); await w(150);
    await f.locator('#cad-aberto').uncheck(); await f.locator('#cad-teto').fill('50'); await f.locator('#cad-salvar').click(); await w(300);
    ok(await E(() => { const p = window.__ped.find(x => x[0] === 'cadastro'); return p && p[1].aberto === false && p[1].teto === 50; }), 'fechar o cadastro e mudar o teto');
    await f.locator('#aba-registro').click(); await w(150);
    ok(/Trocou a senha/.test(await f.locator('.tab').innerText()), 'o registro');
  });

  await passo('a casca: a aba e o "Esqueci minha senha"', async () => {
    const { page: C } = await t.device({ name: 'casca27', w: 1300, h: 850 });
    await C.goto(t.base, { waitUntil: 'load' }); await C.waitForTimeout(1500);
    ok(await C.locator('#tab-admin').count() === 1 && !(await C.locator('#tab-admin').isVisible()), 'sem ser administrador, a aba Administração não aparece');
    await C.locator('#btnConta').click(); await C.locator('#f-conta').waitFor();
    await C.locator('#c-email').fill('alguem@x.com');
    await C.locator('#c-esqueci').click(); await C.locator('#f-esqueci').waitFor();
    ok(await C.locator('#e-email').inputValue() === 'alguem@x.com', '"Esqueci minha senha" abre a janela, com o e-mail já escrito');
    await C.locator('#f-esqueci button', { hasText: 'Voltar' }).click(); await C.locator('#f-conta').waitFor();
    ok(true, 'e "Voltar" volta para Entrar');
  });

  if (t.errs.length) console.log(t.errs.slice(0, 10).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
