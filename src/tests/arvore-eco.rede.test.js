// (lote 76) A Árvore aberta no mestre e no jogador ao mesmo tempo: o que o jogador aprende não pode voltar
// (o relato: "na hora que o Bruno entra, a árvore dá um rollback para a versão anterior").
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const no = (id, nome, pais, extra) => Object.assign({ id, pais, regra: 'e', nome, tipo: 'pequeno', forma: 'circulo', glifo: '', cor: '', natureza: '', usos: [], desc: '', exclusivo: '', escola: null, graus: [{ custos: { p1: 1 }, texto: '' }] }, extra);
const BIB = { nome: 'Urgm', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 20 }], naturezas: [], usos: [],
  tipos: { pequeno: { nome: 'Pequeno', raio: 10, custo: 1, forma: 'circulo' }, notavel: { nome: 'Notável', raio: 18, custo: 2, forma: 'circulo' }, keystone: { nome: 'Keystone', raio: 27, custo: 4, forma: 'hexagono' } },
  arvores: [{ id: 'a_kit', nome: 'Kitsune', categoria: 'classe', secreta: false, senha: '', nodes: [
    no('n_origem', 'Origem', [], { tipo: 'keystone', forma: 'hexagono', graus: [{ custos: {}, texto: '' }] }),
    no('n_a', 'A', ['n_origem']), no('n_b', 'B', ['n_a']), no('n_c', 'C', ['n_b']), no('n_d', 'D', ['n_c']) ] }], cofres: [] };
const arvLocal = JSON.stringify({ formato: 'urgm-skilltree-doc', versao: 4, biblioteca: BIB, personagens: [{ id: 'c_local', nome: 'Rascunho', arvores: ['a_kit'], arvoreAtual: 'a_kit', pontos: { p1: 20 }, alocados: {}, ordemLivre: true }] });
const ficha = nome => ({ nome, raca: 'Kitsune', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'C', AGI: 'C', VIT: 'D', CAN: 'B' }, pctProprio: null, poderes: [], defesas: { DFF: 3, DFM: 6 }, defEsp: {}, rol: { fixa: 5, fonte: 'total' }, ini: 'AGI/5', disputa: {}, estaque: { a: '', b: '' }, habilidades: [], notas: '', itens: [], recursos: [] });
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const dM = await t.device({ name: 'mestre', seed: { 'urgm.arvore.v4': arvLocal, 'tinycats:aba': 'arvore', 'tinycats-tour': '1' } }), M = dM.page;
  const J = (await t.device({ name: 'dalmo', w: 1300, h: 860, seed: { 'tinycats:aba': 'arvore', 'tinycats-tour': '1' } })).page;
  const envios = [];
  for (const [p, q] of [[M, 'BRUNO'], [J, 'DALMO']]) p.on('request', r => { if (/personagem_juntar/.test(r.url())) { const b = r.postData() || ''; if (!/__sonda/.test(b)) envios.push(q + ' ' + b); } });
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 60) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const skills = (p, id) => p.evaluate(id => { const l = TC.dados.col('personagens').pegar(id); return l ? JSON.parse(JSON.stringify(l.skills || {})) : null; }, id);
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Árvore eco ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let apagada = false;
  try {
    let A = null;
    ok(await ate(async () => { A = await quadro(M, /\/arvore\//); return A && (await A.locator('#ofertaSim').count()) === 1; }, 40000), '(a oferta)');
    await A.locator('#ofertaSim').click();
    ok(await ate(() => M.evaluate(() => !!TC.dados.col('documentos').pegar('arvore:pacote') && TC.dados.pendentes === 0)), '(a biblioteca sobe)');
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    const dalmo = await J.evaluate(() => TC.conta.usuario.id);
    await M.evaluate(([f, d]) => TC.dados.col('personagens').gravar('pc_dain', { nome: 'Dain', ficha: f, skills: { arvores: ['a_kit'], pontos: { p1: 20 }, alocados: { n_origem: 1 } }, estado: {}, dono_id: d, vis: 'mesa', ordem: 0 }), [ficha('Dain'), dalmo]);
    ok(await ate(() => M.evaluate(() => TC.dados.pendentes === 0)), '(o Dain do Dalmo)');
    await J.reload({ waitUntil: 'load' }); await w(1500, J);
    let B = null;
    ok(await ate(async () => { B = await quadro(J, /\/arvore\//); return B && await B.evaluate(() => typeof doc === 'object' && !!personagemAtual() && personagemAtual().id === 'pc_dain'); }, 40000), '(o Dalmo abre a Árvore no Dain)');
    await w(3000); envios.length = 0;
    // 1) os dois com a Árvore aberta: o Dalmo aprende A e B
    await B.evaluate(async () => { await subirGrau('n_a'); await subirGrau('n_b'); }); await w(6000, J);
    let s = await skills(M, 'pc_dain');
    ok(s.alocados.n_a === 1 && s.alocados.n_b === 1, 'com o mestre de Árvore aberta, o que o Dalmo aprendeu fica: ' + JSON.stringify(s.alocados));
    console.log('ENVIOS 1:\n  ' + envios.join('\n  ')); envios.length = 0;
    // 2) o mestre sai e entra de novo (recarrega), com o Dalmo aprendendo antes
    await M.goto(t.base + 'src/tests/vazio.html'); await w(500);
    await B.evaluate(async () => { await subirGrau('n_c'); }); await w(3000, J);
    await M.goto(t.base + '?debug', { waitUntil: 'load' });
    ok(await ate(async () => { A = await quadro(M, /\/arvore\//); return A && await A.evaluate(() => typeof doc === 'object' && doc.personagens.some(p => p.id === 'pc_dain')); }, 40000), '(o mestre entra de novo, na Árvore)');
    await w(8000);
    s = await skills(J, 'pc_dain');
    ok(s.alocados.n_c === 1 && s.alocados.n_b === 1, 'o mestre entrar não volta o que o Dalmo aprendeu: ' + JSON.stringify(s.alocados));
    ok(await B.evaluate(() => personagemAtual().alocados.n_c === 1), 'e na Árvore do Dalmo continua');
    console.log('ENVIOS 2:\n  ' + envios.join('\n  ')); envios.length = 0;
    // 3) o mestre noutra aba (Fichas) e entra na Árvore
    await M.evaluate(() => document.getElementById('tab-fichas').click()); await w(1500);
    await B.evaluate(async () => { await subirGrau('n_d'); }); await w(3000, J);
    await M.evaluate(() => document.getElementById('tab-arvore').click()); await w(8000);
    s = await skills(J, 'pc_dain');
    ok(s.alocados.n_d === 1, 'trocar de aba e voltar à Árvore não volta: ' + JSON.stringify(s.alocados));
    console.log('ENVIOS 3:\n  ' + envios.join('\n  '));
    // 4) o navegador do mestre cheio (a biblioteca grande) e, guardada nele, uma cópia velha da Árvore: abrir não pode
    //    voltar o Dain para ela (era o que acontecia: a cópia nova não cabia, a Árvore lia a velha e "mandava o que mudou")
    const chave = await A.evaluate(() => CHAVE_DOC);
    // (a biblioteca da mesa fica grande: 400 mil letras numa descrição)
    await M.evaluate(() => { const D = TC.dados.col('documentos'), b = JSON.parse(JSON.stringify(D.pegar('arvore:biblioteca').dados)); b.arvores[0].nodes[1].desc = 'd'.repeat(400000); D.gravar('arvore:biblioteca', { dados: b }); });
    ok(await ate(() => M.evaluate(() => TC.dados.pendentes === 0)), '(a biblioteca grande sobe)');
    await M.evaluate(() => document.getElementById('tab-fichas').click()); await w(1000);
    await M.evaluate(ch => {
      const velho = JSON.parse(localStorage.getItem(ch) || '{}');
      const d = velho.biblioteca ? velho : { biblioteca: null, personagens: [] };
      d.personagens = (d.personagens || []).map(p => (p.id === 'pc_dain' ? Object.assign({}, p, { arvores: [], pontos: { p1: 3 }, alocados: { n_origem: 1 } }) : p));
      if (!d.personagens.some(p => p.id === 'pc_dain')) d.personagens.push({ id: 'pc_dain', nome: 'Dain', arvores: [], pontos: { p1: 3 }, alocados: { n_origem: 1 }, ordemLivre: true });
      if (!d.biblioteca) d.biblioteca = JSON.parse(localStorage.getItem('urgm.arvore.v4')).biblioteca;
      d.biblioteca.arvores.forEach(a => a.nodes.forEach(n => { n.desc = ''; }));   // (a cópia velha é menor que a de agora: a nova não cabe no lugar dela)
      localStorage.setItem(ch, JSON.stringify(d));
      // (enche o resto do navegador, até não caber nem a cópia nova da Árvore — nem a pequena deste teste)
      localStorage.setItem('teste:folga', 'f'.repeat(150000));
      let k = 0; for (const passo of [500000, 50000, 5000, 500, 50]) for (;;) { try { localStorage.setItem('teste:enchimento:' + (k++), 'x'.repeat(passo)); } catch (e) { break; } }
      localStorage.removeItem('teste:folga');            // (sobra lugar para o site, mas não para a cópia nova da Árvore)
    }, chave);
    await M.reload({ waitUntil: 'load' }); await w(1500);
    await M.evaluate(() => document.getElementById('tab-arvore').click());
    ok(await ate(async () => { A = await quadro(M, /\/arvore\//); return A && await A.evaluate(() => typeof doc === 'object' && doc.personagens.some(p => p.id === 'pc_dain')); }, 40000), '(o mestre, com o navegador cheio, abre a Árvore)');
    await w(6000);
    s = await skills(J, 'pc_dain');
    ok(s.alocados.n_d === 1 && s.alocados.n_c === 1 && (s.arvores || []).includes('a_kit') && s.pontos.p1 === 20, 'com o navegador cheio e uma cópia velha guardada, abrir a Árvore não volta o Dain: ' + JSON.stringify(s));
    ok(await A.evaluate(() => doc.personagens.find(p => p.id === 'pc_dain').alocados.n_d === 1), 'e a Árvore do mestre mostra o Dain de agora');
    console.log('ENVIOS 4:\n  ' + envios.join('\n  '));
    await M.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('teste:enchimento')) localStorage.removeItem(k); });
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally { if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('mesa: ' + e.message); } } }
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
