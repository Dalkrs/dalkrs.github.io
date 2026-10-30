// Lote 43 numa mesa (rede): os ícones e as favoritas, entre a Árvore e as Fichas, com o mestre e um jogador.
//   · a biblioteca sobe com papel e barraEfeito; o pacote dos jogadores leva os dois (o SQL do Dalmo preenche assim);
//   · na Árvore do jogador, o ícone no nó; no painel da habilidade que ele tem, "Favoritar" grava skills.fav na mesa;
//   · nas Fichas do jogador, a favorita no topo, com o ícone; a estrela dali também grava; a Árvore acompanha;
//   · o mestre mexe nas skills do mesmo personagem (sobe um grau, pela Árvore dele): as favoritas não se perdem.
const { start, checker } = require('./lib');
const { contas, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const j = JSON.stringify;
const no = (id, nome, pais, extra) => Object.assign({ id, pais, regra: 'e', nome, tipo: 'notavel', forma: 'circulo', glifo: '', cor: '', natureza: '', usos: ['ativa'], desc: '', exclusivo: '', escola: null, graus: [{ custos: { p1: 1 }, texto: '' }] }, extra);
const uso = (b, v) => ({ graus: [{ custos: { p1: 1 }, texto: '', uso: [{ b, v }] }] });
const BIB = { nome: 'Urgm', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 20 }], naturezas: [],
  usos: [{ id: 'passiva', nome: 'Passiva', sigla: 'Pa' }, { id: 'ativa', nome: 'Ativa', sigla: 'At' }, { id: 'reacao', nome: 'Reação', sigla: 'Re' }, { id: 'postura', nome: 'Postura', sigla: 'Po' }],
  tipos: { pequeno: { nome: 'Pequeno', raio: 10, custo: 1, forma: 'circulo' }, notavel: { nome: 'Notável', raio: 18, custo: 2, forma: 'circulo' }, keystone: { nome: 'Keystone', raio: 27, custo: 4, forma: 'hexagono' } },
  arvores: [{ id: 'a_sel', nome: 'Kitsune Selene', categoria: 'outra', secreta: false, senha: '', nodes: [
    no('n_raiz', 'Origem', [], { tipo: 'keystone', forma: 'hexagono', glifo: '道', usos: [], graus: [{ custos: {}, texto: '' }] }),
    no('n_veu', 'Véu de Neve', ['n_raiz'], Object.assign({ papel: 'suporte', usos: ['reacao'], desc: 'Quando um aliado vai sofrer um golpe, ele ganha Escudado.' }, uso('Geada de Selene', '2'))),
    no('n_garra', 'Garra Dupla', ['n_raiz'], Object.assign({ papel: 'ofensiva', desc: 'Dois golpes rápidos.' }, uso('Barra Bestial', '+2'))),
    no('n_lucro', 'Lucro Rápido', ['n_raiz'], { papel: 'utilidade', usos: ['passiva'], barraEfeito: 'enche', desc: 'Cada furto rende barra.' }),
    no('n_lamina', 'Lâmina Gélida', ['n_raiz'], Object.assign({ papel: 'ofensiva', desc: 'Gelo na arma.' }, uso('Geada de Selene', '2')))] }], cofres: [] };
const arvLocal = JSON.stringify({ formato: 'urgm-skilltree-doc', versao: 4, biblioteca: BIB, personagens: [] });
const ficha = nome => Object.assign(R.personagemPadrao(nome), { level: 6, recursos: [{ id: 'hp', nome: 'HP', fml: '100' }] });

(async () => {
  const t = await start({ net: true });
  const c = contas();
  const M = (await t.device({ name: 'mestre', w: 1400, h: 900, seed: { 'urgm.arvore.v4': arvLocal, 'tinycats:aba': 'arvore', 'tinycats-tour': '1' } })).page;
  const J = (await t.device({ name: 'dalmo', w: 1300, h: 900, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  M.setDefaultTimeout(10000); J.setDefaultTimeout(10000);
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const skillsNa = (p, id) => p.evaluate(id => { const l = TC.dados.col('personagens').pegar(id); return l ? JSON.parse(JSON.stringify(l.skills || {})) : null; }, id);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const foto = async (p, nome) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await p.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Lote 43 ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let apagada = false, A = null, B = null, G = null;
  try {
    await passo('a biblioteca e o pacote', async () => {
      ok(await ate(async () => { A = await quadro(M, /\/arvore\//); return A && (await A.locator('#ofertaSim').count()) === 1; }, 40000), '(a Árvore oferece trazer a árvore do navegador)');
      await A.locator('#ofertaSim').click();
      ok(await ate(async () => await M.evaluate(() => { const D = TC.dados.col('documentos'); return !!D.pegar('arvore:biblioteca') && !!D.pegar('arvore:pacote') && TC.dados.pendentes === 0; })), '(a biblioteca e o pacote sobem para a mesa)');
      const pac = await M.evaluate(() => TC.dados.col('documentos').pegar('arvore:pacote').dados.arvores[0].nodes.map(n => [n.id, n.papel || '', n.barraEfeito || '']));
      ok(j(pac) === j([['n_raiz', '', ''], ['n_veu', 'suporte', ''], ['n_garra', 'ofensiva', ''], ['n_lucro', 'utilidade', 'enche'], ['n_lamina', 'ofensiva', '']]), 'o pacote dos jogadores leva o papel e o barraEfeito de cada nó: ' + j(pac));
    });

    await passo('o jogador e a Selene', async () => {
      await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
      await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
      const dalmo = await J.evaluate(() => TC.conta.usuario.id);
      await M.evaluate(([f, d]) => {
        TC.dados.col('personagens').gravar('pc_selene', { nome: 'Selene', ficha: f, skills: { arvores: ['a_sel'], pontos: { p1: 20 }, alocados: { n_raiz: 1, n_veu: 1, n_garra: 1 } }, estado: {}, dono_id: d, vis: 'mesa', ordem: 0 });
      }, [ficha('Selene'), dalmo]);
      ok(await ate(() => parado(M)), '(a Selene, do Dalmo, sobe para a mesa)');
      await J.locator('#tab-arvore').click();
      // (o jogador que entra sem personagem ganha uma ficha nova; a Selene é a segunda)
      const naSelene = await ate(async () => { B = await quadro(J, /\/arvore\//); if (!B || !(await B.evaluate(() => ui.modo === 'jogador' && doc.personagens.some(p => p.id === 'pc_selene')))) return false; await B.evaluate(() => { if (personagemAtual().id !== 'pc_selene') trocarPersonagem('pc_selene'); }); return await B.evaluate(() => personagemAtual().id === 'pc_selene'); }, 40000);
      ok(naSelene, '(o Dalmo abre a Árvore, na Selene)');
      ok(await ate(async () => await B.evaluate(() => { const g = document.querySelector('#nos .no[data-id="n_veu"]'); return !!g && !!g.querySelector('.icone-papel[data-papel="suporte"]') && !!g.querySelector('.marca-tempo.reacao'); })), 'na Árvore do jogador, o Véu de Neve com a cruz e o raio da reação (do pacote)');
    });

    await passo('favoritar pela Árvore', async () => {
      await B.evaluate(() => { selecionado = 'n_veu'; pintarPainel(); desenhar(); }); await w(300, J);
      ok(await B.locator('#btFav').count() === 1 && (await B.locator('#btFav').innerText()).trim() === 'Favoritar', 'no painel da habilidade que a Selene tem: "Favoritar"');
      await B.locator('#btFav').click(); await w(400, J);
      ok(await ate(async () => j((await skillsNa(M, 'pc_selene')).fav) === j(['n_veu']) && await parado(J)), 'grava skills.fav na mesa: ["n_veu"]');
      ok((await B.locator('#btFav').getAttribute('aria-pressed')) === 'true', 'o botão fica “Favorita”');
      await foto(J, 'l43-rede-arvore-favorita');
      await B.evaluate(() => { selecionado = 'n_lucro'; pintarPainel(); }); await w(200, J);
      ok(await B.locator('#btFav').count() === 0, '(na que ela ainda não tem, não há estrela)');
    });

    await passo('nas Fichas', async () => {
      await J.locator('#tab-fichas').click(); await w(500, J);
      ok(await ate(async () => { G = await quadro(J, /\/fichas\//); return G && (await G.locator('#lista .pc', { has: G.locator('.nm', { hasText: /^Selene$/ }) }).count()) === 1; }), '(as Fichas do Dalmo, com a Selene)');
      await G.locator('#lista .pc', { has: G.locator('.nm', { hasText: /^Selene$/ }) }).click(); await w(300, J);
      await G.locator('#ficha [data-abaficha="skills"]').click(); await w(400, J);
      ok(await ate(async () => { const k = await G.evaluate(() => [...document.querySelectorAll('#habsDaArvore .skl')].map(x => x.dataset.skkey + (x.classList.contains('fav') ? '*' : ''))); return k[0] === 'n_veu*'; }), 'a favorita no topo da aba Skills');
      ok((await G.locator('#habsDaArvore .skl[data-skkey="n_veu"] .tci-quadro').getAttribute('aria-label')) === 'Suporte, reação, gasta 2 Geada de Selene', 'com o ícone, a marca e a etiqueta (do pacote)');
      await G.locator('#habsDaArvore .skl[data-skkey="n_garra"] [data-skfav]').click(); await w(400, J);
      ok(await ate(async () => j((await skillsNa(M, 'pc_selene')).fav) === j(['n_veu', 'n_garra']) && await parado(J)), 'a estrela da ficha grava também: ["n_veu","n_garra"]');
      await J.locator('#tab-arvore').click(); await w(400, J);
      await B.evaluate(() => { selecionado = 'n_garra'; pintarPainel(); }); await w(200, J);
      ok(await ate(async () => { await B.evaluate(() => pintarPainel()); return (await B.locator('#btFav').getAttribute('aria-pressed')) === 'true'; }), 'e a Árvore acompanha (a Garra aparece como favorita)');
    });

    await passo('o mestre mexe nas mesmas skills', async () => {
      await A.evaluate(() => { trocarModo('jogador'); trocarPersonagem('pc_selene'); selecionado = 'n_lamina'; pintarPainel(); desenhar(); }); await w(400);
      await A.locator('#btSubir').click(); await w(600);
      ok(await ate(async () => { const s = await skillsNa(J, 'pc_selene'); return s.alocados && s.alocados.n_lamina === 1 && j(s.fav) === j(['n_veu', 'n_garra']); }, 25000), 'o mestre dá a Lâmina à Selene pela Árvore dele: as favoritas continuam ["n_veu","n_garra"]');
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
