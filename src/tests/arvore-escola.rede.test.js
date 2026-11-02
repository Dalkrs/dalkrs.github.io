// Os pontos da escola numa mesa (rede): o jogador gasta na Árvore e recarrega a página — o que ele fez continua lá.
//   · uma árvore de escola com nódulos de vários graus, custando pontos do tipo "Escola";
//   · o jogador sobe um grau (e mais um), muda o total de pontos e recarrega: a mesa e a Árvore guardam tudo;
//   · (2026.11.02-2) com o site aberto em duas abas: a outra aba guarda no navegador um documento velho — a Árvore
//     desta aba não troca o que mostra por ele, e a gravação seguinte não desfaz na mesa o total e o nó novo.
const { start, checker } = require('./lib');
const { contas, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const j = JSON.stringify;
const no = (id, nome, pais, graus, extra) => Object.assign({ id, pais, regra: 'e', nome, tipo: 'pequeno', forma: 'circulo', glifo: '', cor: '', natureza: '', usos: ['ativa'], desc: '', exclusivo: '', escola: null, graus: graus.map(c => ({ custos: c ? { pe: c } : {}, texto: '' })) }, extra);
const BIB = { nome: 'Urgm', pools: [{ id: 'p1', nome: 'Raça', cor: '#5FA37A', padrao: 4 }, { id: 'pe', nome: 'Escola', cor: '#C9894B', padrao: 1 }], naturezas: [],
  usos: [{ id: 'passiva', nome: 'Passiva', sigla: 'Pa' }, { id: 'ativa', nome: 'Ativa', sigla: 'At' }],
  tipos: { pequeno: { nome: 'Pequeno', raio: 10, custo: 1, forma: 'circulo' }, notavel: { nome: 'Notável', raio: 18, custo: 2, forma: 'circulo' }, keystone: { nome: 'Keystone', raio: 27, custo: 4, forma: 'hexagono' } },
  arvores: [{ id: 'a_yan', nome: 'Yanato', categoria: 'escola', secreta: false, senha: '', nodes: [
    no('n_yan', 'Yanato', [], [0], { tipo: 'keystone', forma: 'hexagono' }),
    no('n_lobo', 'Escola do Lobo', ['n_yan'], [2], { tipo: 'notavel' }),
    no('n_lam', 'Lâmina na Manga', ['n_lobo'], [1, 1]),
    no('n_pul', 'Pulso de Mola', ['n_lam'], [1, 1, 2]),
    no('n_bri', 'Briga de Taverna', ['n_lobo'], [1]),
    no('n_cus', 'Cuspir a Lâmina', ['n_lam'], [1, 1])] }], cofres: [] };
const arvLocal = JSON.stringify({ formato: 'urgm-skilltree-doc', versao: 4, biblioteca: BIB, personagens: [] });
const ficha = nome => Object.assign(R.personagemPadrao(nome), { level: 6, recursos: [{ id: 'hp', nome: 'HP', fml: '100' }] });

(async () => {
  const t = await start({ net: true });
  const c = contas();
  const M = (await t.device({ name: 'mestre', w: 1400, h: 900, seed: { 'urgm.arvore.v4': arvLocal, 'tinycats:aba': 'arvore', 'tinycats-tour': '1' } })).page;
  const J = (await t.device({ name: 'dalmo', w: 1300, h: 900, seed: { 'tinycats:aba': 'arvore', 'tinycats-tour': '1' } })).page;
  M.setDefaultTimeout(10000); J.setDefaultTimeout(10000);
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const skillsNa = (p, id) => p.evaluate(id => { const l = TC.dados.col('personagens').pegar(id); return l ? JSON.parse(JSON.stringify(l.skills || {})) : null; }, id);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const foto = async (p, nome) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await p.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  // a Árvore do jogador, aberta no Dain
  const noDain = async () => {
    let B = null;
    const foi = await ate(async () => {
      B = await quadro(J, /\/arvore\//); if (!B || !(await B.evaluate(() => { if (ui.modo !== 'jogador' && typeof trocarModo === 'function') trocarModo('jogador'); return ui.modo === 'jogador' && doc.personagens.some(p => p.id === 'pc_dain'); }))) return false;
      await B.evaluate(() => { if (personagemAtual().id !== 'pc_dain') trocarPersonagem('pc_dain'); });
      return await B.evaluate(() => personagemAtual().id === 'pc_dain');
    }, 40000);
    return foi ? B : null;
  };
  const subir = async (B, id) => { await B.evaluate(id => { selecionado = id; pintarPainel(); desenhar(); }, id); await w(250, J); await B.locator('#btSubir').click(); await w(500, J); };
  const ord = o => Object.fromEntries(Object.entries(o || {}).sort((a, b) => (a[0] < b[0] ? -1 : 1)));
  const naTela = B => B.evaluate(() => { const p = personagemAtual(); return { pontos: p.pontos.pe, alocados: p.alocados }; }).then(d => ({ pontos: d.pontos, alocados: ord(d.alocados) }));

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Escola ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let apagada = false, A = null, B = null;
  try {
    await passo('a biblioteca e o pacote', async () => {
      ok(await ate(async () => { A = await quadro(M, /\/arvore\//); return A && (await A.locator('#ofertaSim').count()) === 1; }, 40000), '(a Árvore oferece trazer a árvore do navegador)');
      await A.locator('#ofertaSim').click();
      ok(await ate(async () => await M.evaluate(() => { const D = TC.dados.col('documentos'); return !!D.pegar('arvore:biblioteca') && !!D.pegar('arvore:pacote') && TC.dados.pendentes === 0; }), 30000), '(a biblioteca e o pacote sobem para a mesa)');
    });

    await passo('o jogador e o Dain', async () => {
      await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
      await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
      const dalmo = await J.evaluate(() => TC.conta.usuario.id);
      await M.evaluate(([f, d]) => {
        TC.dados.col('personagens').gravar('pc_dain', { nome: 'Dain', ficha: f, skills: { arvores: ['a_yan'], pontos: { p1: 4, pe: 3 }, alocados: { n_yan: 1, n_lobo: 1 } }, estado: {}, dono_id: d, vis: 'mesa', ordem: 0 });
      }, [ficha('Dain'), dalmo]);
      ok(await ate(() => parado(M)), '(o Dain, do Dalmo, sobe para a mesa)');
      await J.locator('#tab-arvore').click();
      B = await noDain();
      ok(!!B, '(o Dalmo abre a Árvore, no Dain)');
    });

    await passo('gastar e recarregar', async () => {
      await subir(B, 'n_lam');
      ok(j((await naTela(B)).alocados) === j(ord({ n_yan: 1, n_lobo: 1, n_lam: 1 })), 'a Lâmina na Manga, grau 1: ' + j(await naTela(B)));
      ok(await ate(async () => (await skillsNa(J, 'pc_dain')).alocados.n_lam === 1 && await parado(J)), 'sobe para a mesa');
      await J.reload({ waitUntil: 'load' }); await w(1500, J);
      B = await noDain();
      ok(!!B && j((await naTela(B)).alocados) === j(ord({ n_yan: 1, n_lobo: 1, n_lam: 1 })), 'depois de recarregar, a Lâmina continua no grau 1: ' + j(B && await naTela(B)));
    });

    await passo('mudar o total, subir dois graus e recarregar', async () => {
      await B.locator('#tot_pe').fill('6'); await B.locator('#tot_pe').dispatchEvent('change'); await w(500, J);
      ok((await naTela(B)).pontos === 6, 'o total de Escola vai a 6');
      await subir(B, 'n_lam');
      await subir(B, 'n_pul');
      ok(j((await naTela(B)).alocados) === j(ord({ n_yan: 1, n_lobo: 1, n_lam: 2, n_pul: 1 })), 'a Lâmina no grau 2 e o Pulso no grau 1: ' + j(await naTela(B)));
      ok(await ate(async () => { const s = await skillsNa(J, 'pc_dain'); return s.pontos.pe === 6 && s.alocados.n_lam === 2 && s.alocados.n_pul === 1 && await parado(J); }), 'sobe para a mesa: ' + j(await skillsNa(J, 'pc_dain')));
      ok(await ate(async () => { const s = await skillsNa(M, 'pc_dain'); return s.pontos.pe === 6 && s.alocados.n_lam === 2 && s.alocados.n_pul === 1; }), 'o mestre recebe: ' + j(await skillsNa(M, 'pc_dain')));
      await foto(J, 'escola-antes');
      await J.reload({ waitUntil: 'load' }); await w(1500, J);
      B = await noDain();
      const d = B && await naTela(B);
      ok(!!d && d.pontos === 6 && j(d.alocados) === j(ord({ n_yan: 1, n_lobo: 1, n_lam: 2, n_pul: 1 })), 'depois de recarregar, tudo continua: ' + j(d));
      await foto(J, 'escola-depois');
      await w(3000, J);
      ok(j(await skillsNa(M, 'pc_dain')) === j(await skillsNa(J, 'pc_dain')) && (await skillsNa(M, 'pc_dain')).alocados.n_pul === 1, 'e a mesa também, alguns segundos depois: ' + j(await skillsNa(M, 'pc_dain')));
    });

    await passo('duas abas do mesmo navegador', async () => {
      const J2 = await J.context().newPage();
      await J2.goto(t.base + '?debug', { waitUntil: 'load' }); await J2.waitForTimeout(2500);
      await J2.locator('#tab-arvore').click().catch(() => {}); await J2.waitForTimeout(800);
      let B2 = null;
      ok(await ate(async () => { B2 = J2.frame({ url: /\/arvore\// }); if (!B2) return false; return await B2.evaluate(() => { if (ui.modo !== 'jogador') return false; if (!doc.personagens.some(p => p.id === 'pc_dain')) return false; if (personagemAtual().id !== 'pc_dain') trocarPersonagem('pc_dain'); return personagemAtual().id === 'pc_dain'; }); }, 40000), '(a segunda aba, na Árvore do Dain)');
      // (a outra aba guardou no navegador o documento de antes — como uma aba esquecida, que ficou para trás)
      const velho = await B2.evaluate(() => localStorage.getItem(CHAVE_DOC));
      // aba 1: muda o total e pega um nó novo
      await B.locator('#tot_pe').fill('8'); await B.locator('#tot_pe').dispatchEvent('change'); await w(400, J);
      await subir(B, 'n_cus');
      ok(await ate(async () => { const s = await skillsNa(M, 'pc_dain'); return s.pontos.pe === 8 && s.alocados.n_cus === 1 && await parado(J); }), 'a mesa recebe o total 8 e o Cuspir a Lâmina');
      // a aba esquecida grava o documento velho no navegador (é o que ela faz ao abrir a Árvore, ou ao receber algo da mesa)
      await B2.evaluate(v => localStorage.setItem(CHAVE_DOC, v), velho);
      await w(800, J);
      ok((await naTela(B)).alocados.n_cus === 1 && (await naTela(B)).pontos === 8, 'a aba 1 não troca o que mostra pelo documento velho da outra aba: ' + j(await naTela(B)));
      // aba 1: outra coisa qualquer (favoritar)
      await B.evaluate(() => { selecionado = 'n_lobo'; pintarPainel(); desenhar(); }); await w(300, J);
      await B.locator('#btFav').click(); await w(600, J);
      await w(3000, J);
      const s = await skillsNa(M, 'pc_dain');
      ok(s.pontos.pe === 8 && s.alocados.n_cus === 1 && s.alocados.n_lam === 2 && j(s.fav) === j(['n_lobo']), 'a mesa continua com o total 8 e o Cuspir a Lâmina (e ganha a favorita): ' + j(s));
      await J.reload({ waitUntil: 'load' }); await w(2000, J);
      B = await noDain();
      const d = B && await naTela(B);
      ok(!!d && d.pontos === 8 && d.alocados.n_cus === 1, 'depois de recarregar, tudo continua: ' + j(d));
      await J2.close();
    });

    await ate(async () => await M.evaluate(() => TC.dados.pendentes === 0));
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409)/.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 10).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
