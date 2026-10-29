// O Bestiário do clã (lote 36) numa mesa de verdade (o banco local de ensaio), com o mestre (Bruno), o Dalmo (dono da
// Selene, nos cargos do Garret) e a Lia (dona da Brisa, fora do clã) em aparelhos separados:
//   · o banco (SQL 0027): ninguém escreve o que o clã vê (nem o mestre: é o banco que monta); o livro inteiro só com
//     quem mestra; com o livro trancado ou a página escondida, nada para o clã; liberado, a capa e a página com só o
//     revelado — a mesma conta da página (projetar) —, sem o texto escondido; quem está nos cargos lê, quem não está não;
//     entrar no clã passa a ler (o banco "toca" o livro), sair deixa de ler; as anotações (livro_nota): assinadas com o
//     nome do personagem, só quem é do clã escreve, só quem escreveu muda, o mestre apaga qualquer uma;
//   · na tela: o mestre monta a página e libera; a aba "Bestiário" aparece para o Dalmo (e não para a Lia); ele lê,
//     com o escondido borrado, e anota na margem; o mestre vê a anotação e a apaga.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const N = require('../../livro/nucleo.js');
const { ok, end } = checker();
const j = JSON.stringify;
// o JSON com as chaves em ordem (para comparar a conta da página com a do banco)
const ficha = nome => ({ nome, raca: 'Kitsune', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'C', AGI: 'C', VIT: 'D', CAN: 'B' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, defEsp: {}, rol: { fixa: 5, fonte: 'total' }, ini: 'AGI/5', disputa: {}, estaque: { a: '', b: '' }, habilidades: [], notas: '', itens: [],
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }, { id: 'sp', nome: 'SP', fml: '60' }] });
const canon = x => (Array.isArray(x) ? '[' + x.map(canon).join(',') + ']' : x && typeof x === 'object' ? '{' + Object.keys(x).sort().map(k => j(k) + ':' + canon(x[k])).join(',') + '}' : j(x));
const CLA = (gente) => ({ v: 1, nome: 'Garret', lema: 'Pela caça', ordem: 1, jogadores: true, ver: {}, brasao: { cores: ['#24305e', '#d9a441'] },
  cargos: { lider: { nome: 'Líder', pai: null, ordem: 0, gente: gente.slice(0, 1) }, k1: { nome: 'Batedores', pai: 'lider', ordem: 0, gente: gente.slice(1) } } });
const SELENE = { id: 'g1', pc: 'pc_selene', nome: 'Selene', resp: 0 }, BRISA = { id: 'g2', pc: 'pc_brisa', nome: 'Brisa', resp: 0 }, TOBIAS = { id: 'g3', pc: null, nome: 'Tobias', resp: 0 };
const LOBO = { v: 1, nome: 'Lobo da Névoa', img: 'https://exemplo.test/lobo.webp', legenda: 'Avistado em Merunê', desc: 'Caça em bando nas manhãs de neblina.', nums: [{ n: 'Vida', v: '~120' }, { n: 'Perigo', v: '●●●○○' }],
  fraq: [{ nome: 'Fogo', tipo: 'fraco' }], saque: ['Pele de névoa'], de: null, mao: {}, ver: { pag: true, img: true, desc: false, nums: true, fraq: false, saque: false }, enviado: null };

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await entrar(d.page, c.jog2, c.senha, 'Lia'); await d.ctx.close(); }
  const errosDeFora = () => t.errs.filter(e => !/^\[sonda-/.test(e) || !/status of (400|401|403|409)/.test(e)).filter(e => !/status of (400|401|409)/.test(e));
  const M = (await t.device({ name: 'mestre', w: 1440, h: 950, seed: { 'tinycats:aba': 'cla', 'tinycats-tour': '1' } })).page;
  const Dp = (await t.device({ name: 'dalmo', w: 1440, h: 900, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const Lp = (await t.device({ name: 'lia', w: 1360, h: 900, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const abas = p => p.evaluate(() => [...document.querySelectorAll('.tab')].filter(x => !x.hidden).map(x => x.id.slice(4)).join(','));
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const foto = async (p, nome) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await p.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Livro E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let apagada = false;
  const sondas = [];
  try {
    const mesa = await M.evaluate(() => TC.mesas.atual.id);
    await Dp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Dp);
    await loginTela(Dp, c.jog1, c.senha); await entrarMesaTela(Dp, codigo, 'Dalmo');
    const dalmo = await Dp.evaluate(() => TC.conta.usuario.id);
    await Lp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Lp);
    await loginTela(Lp, c.jog2, c.senha); await entrarMesaTela(Lp, codigo, 'Lia');
    const lia = await Lp.evaluate(() => TC.conta.usuario.id);
    await M.evaluate(([d, l, cla, fs, fb]) => {
      const P = TC.dados.col('personagens'), D = TC.dados.col('documentos');
      P.gravar('pc_selene', { nome: 'Selene', ficha: fs, skills: {}, estado: {}, dono_id: d, vis: 'mesa', ordem: 0 });
      P.gravar('pc_brisa', { nome: 'Brisa', ficha: fb, skills: {}, estado: {}, dono_id: l, vis: 'mesa', ordem: 1 });
      D.gravar('cla:c:lv_gar', { dados: cla, vis: 'mestre' });
    }, [dalmo, lia, CLA([SELENE, TOBIAS]), ficha('Selene'), ficha('Brisa')]);
    ok(await ate(() => parado(M)), '(a Selene, do Dalmo, e a Brisa, da Lia; o Garret, com a Selene na liderança e o Tobias, sem personagem)');

    // ---------------- o banco ----------------
    const sonda = async (email, nome) => { const d = await t.device({ name: 'sonda-' + nome }); sondas.push(d); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, email, c.senha, nome); return d.page; };
    const sB = await sonda(c.mestre, 'Bruno'), sD = await sonda(c.jog1, 'Dalmo'), sL = await sonda(c.jog2, 'Lia');
    const ler = (s, id) => s.evaluate(async ([mesa, id]) => { const r = await sb.from('documentos').select('dados, apagado, vis, rev').eq('mesa_id', mesa).eq('id', id).maybeSingle(); return r.error || !r.data ? null : r.data; }, [mesa, id]);
    const ids = s => s.evaluate(async mesa => { const r = await sb.from('documentos').select('id').eq('mesa_id', mesa).eq('apagado', false).like('id', 'cla:l%'); return r.error ? 'erro: ' + r.error.message : r.data.map(x => x.id).sort().join(','); }, mesa);
    const criar = (s, linha) => s.evaluate(async ([mesa, linha]) => { const r = await sb.from('documentos').upsert(Object.assign({ mesa_id: mesa, dados: {}, apagado: false }, linha)); return r.error ? 'recusado' : 'ok'; }, [mesa, linha]);
    const mudar = (s, id, campos) => s.evaluate(async ([mesa, id, campos]) => { const r = await sb.from('documentos').update(campos).eq('mesa_id', mesa).eq('id', id).select('id'); return r.error ? 'recusado' : (r.data || []).length ? 'ok' : 'nada'; }, [mesa, id, campos]);
    const nota = (s, a) => s.evaluate(async ([mesa, a]) => { const r = await sb.rpc('livro_nota', Object.assign({ p_mesa: mesa, p_cla: 'lv_gar' }, a)); return r.error ? r.error.message : r.data; }, [mesa, a]);
    // a conta da página contra o que o banco montou
    const confere = async (rotulo, pag) => {
      const p = await ler(sB, 'cla:livro:lv_gar:p:' + pag), capa = await ler(sB, 'cla:livro:lv_gar'), pub = await ler(sB, 'cla:lpub:lv_gar:p:' + pag);
      const a = N.projetar(p && !p.apagado ? p.dados : null, capa && !capa.apagado ? capa.dados : null), b = pub && !pub.apagado ? pub.dados : null;
      ok(canon(a) === canon(b), 'o que o banco montou para o clã é a mesma conta da página (' + rotulo + ')' + (canon(a) === canon(b) ? '' : ' — página ' + canon(a) + ' · banco ' + canon(b)));
    };

    ok(await criar(sD, { id: 'cla:livro:lv_gar', vis: 'mestre', dados: { v: 1, on: true } }) === 'recusado' && await criar(sL, { id: 'cla:lpub:lv_gar', vis: 'mestre', dados: { v: 1, titulo: 'x' } }) === 'recusado',
      'os jogadores não escrevem o livro nem o que o clã vê');
    ok(await criar(sB, { id: 'cla:lpub:lv_gar:p:falsa', vis: 'mestre', dados: { v: 1, nome: 'x', oc: [] } }) === 'recusado' && await criar(sB, { id: 'cla:livro:lv_gar:p:aberta', vis: 'mesa', dados: LOBO }) === 'recusado'
      && await criar(sB, { id: 'cla:livro:lv_gar:p:dada', vis: 'mestre', dono_id: dalmo, dados: LOBO }) === 'recusado',
      'nem o mestre escreve o que o clã vê (o banco monta), nem deixa o livro inteiro para a mesa ou para um jogador');
    ok(await criar(sB, { id: 'cla:livro:lv_gar', vis: 'mestre', dados: { v: 1, on: false, titulo: 'Bestiário de Garret' } }) === 'ok' && await criar(sB, { id: 'cla:livro:lv_gar:p:lobo', vis: 'mestre', dados: LOBO }) === 'ok'
      && await criar(sB, { id: 'cla:livro:lv_gar:p:aranha', vis: 'mestre', dados: Object.assign({}, LOBO, { nome: 'Aranha de Cinzas', ver: { pag: false, img: true } }) }) === 'ok',
      'o mestre escreve a capa (trancada) e duas páginas (a Aranha, escondida)');
    ok(await ids(sD) === '' && await ids(sL) === '', 'com o livro trancado, nada para o clã');
    await confere('trancado', 'lobo');
    ok(await mudar(sB, 'cla:livro:lv_gar', { dados: { v: 1, on: true, titulo: 'Bestiário de Garret' } }) === 'ok', 'o mestre libera o livro');
    ok(await ids(sD) === 'cla:lpub:lv_gar,cla:lpub:lv_gar:p:lobo', 'o Dalmo (a Selene está nos cargos) lê a capa e a página do Lobo — nem a Aranha escondida, nem o livro inteiro: ' + await ids(sD));
    ok(await ids(sL) === '', 'a Lia (a Brisa não está no clã) não lê nada do livro');
    await confere('liberado', 'lobo'); await confere('a página escondida', 'aranha');
    const pubD = await ler(sD, 'cla:lpub:lv_gar:p:lobo');
    ok(!!pubD && j(pubD.dados.oc) === j(['desc', 'fraq', 'saque']) && !/Caça em bando|Fogo|Pele de névoa/.test(j(pubD.dados)) && pubD.dados.nums.length === 2 && (await ler(sD, 'cla:lpub:lv_gar')).dados.titulo === 'Bestiário de Garret',
      'o que chega ao Dalmo: o nome, a ilustração e os números; a descrição, as fraquezas e o saque só como "escondidos" (sem o texto)');
    // revelar mais, mudar o texto
    ok(await mudar(sB, 'cla:livro:lv_gar:p:lobo', { dados: Object.assign({}, LOBO, { desc: 'Some no nevoeiro.', ver: Object.assign({}, LOBO.ver, { fraq: true, desc: true }) }) }) === 'ok'
      && /Some no nevoeiro/.test(j((await ler(sD, 'cla:lpub:lv_gar:p:lobo')).dados)) && /Fogo/.test(j((await ler(sD, 'cla:lpub:lv_gar:p:lobo')).dados)), 'o mestre revela a descrição e as fraquezas: chegam ao Dalmo');
    await confere('mais revelado', 'lobo');
    // quem entra e quem sai do clã
    const revAntes = (await ler(sB, 'cla:lpub:lv_gar:p:lobo')).rev;
    ok(await mudar(sB, 'cla:c:lv_gar', { dados: CLA([SELENE, TOBIAS, BRISA]) }) === 'ok' && (await ler(sB, 'cla:lpub:lv_gar:p:lobo')).rev > revAntes && await ids(sL) === 'cla:lpub:lv_gar,cla:lpub:lv_gar:p:lobo',
      'a Brisa entra nos Batedores: o banco toca o livro (a revisão sobe, para o aparelho da Lia buscar) e a Lia passa a ler');
    const revDepois = (await ler(sB, 'cla:lpub:lv_gar:p:lobo')).rev;
    ok(await mudar(sB, 'cla:c:lv_gar', { dados: Object.assign(CLA([SELENE, TOBIAS, BRISA]), { lema: 'Outro lema' }) }) === 'ok' && (await ler(sB, 'cla:lpub:lv_gar:p:lobo')).rev === revDepois, 'mudar o lema (sem mexer em quem está): o livro não é tocado');
    ok(await mudar(sB, 'cla:c:lv_gar', { dados: CLA([BRISA, TOBIAS]) }) === 'ok' && await ids(sD) === '' && await ids(sL) === 'cla:lpub:lv_gar,cla:lpub:lv_gar:p:lobo', 'a Selene sai do clã (a Brisa lidera): o Dalmo deixa de ler na hora');
    ok(await mudar(sB, 'cla:c:lv_gar', { apagado: true }) === 'ok' && await ids(sL) === '' && await mudar(sB, 'cla:c:lv_gar', { apagado: false }) === 'ok' && await ids(sL) === 'cla:lpub:lv_gar,cla:lpub:lv_gar:p:lobo',
      'o clã apagado: ninguém lê o livro; de volta, a Lia volta a ler');
    // as anotações
    const n1 = await nota(sL, { p_pag: 'lobo', p_op: 'criar', p_texto: '  O fogo espantou dois deles.  ' });
    ok(n1 && Array.isArray(n1.notas) && n1.notas.length === 1 && n1.notas[0].nome === 'Brisa' && n1.notas[0].texto === 'O fogo espantou dois deles.' && n1.notas[0].autor === lia && n1.notas[0].pc === 'pc_brisa',
      'a Lia anota: o banco assina com o nome da Brisa — ' + j(n1));
    ok(/Só quem é do clã/.test(await nota(sD, { p_pag: 'lobo', p_op: 'criar', p_texto: 'oi' })), 'o Dalmo, fora do clã agora, não anota');
    ok(await mudar(sB, 'cla:c:lv_gar', { dados: CLA([BRISA, TOBIAS, SELENE]) }) === 'ok', '(a Selene volta, nos Batedores)');
    const n2 = await nota(sD, { p_pag: 'lobo', p_op: 'criar', p_texto: 'Fareja o medo.' });
    const idL = n1.notas[0].id, idD = n2 && n2.notas ? n2.notas[1].id : null;
    ok(!!idD && n2.notas[1].nome === 'Selene', 'de volta ao clã, o Dalmo anota (como Selene)');
    ok(/Só quem escreveu muda/.test(await nota(sD, { p_pag: 'lobo', p_op: 'mudar', p_nota: idL, p_texto: 'troquei' })) && /Só quem escreveu \(ou o mestre\) apaga/.test(await nota(sD, { p_pag: 'lobo', p_op: 'apagar', p_nota: idL })),
      'o Dalmo não muda nem apaga a anotação da Lia');
    const n3 = await nota(sL, { p_pag: 'lobo', p_op: 'mudar', p_nota: idL, p_texto: 'O fogo espantou três deles.' });
    ok(n3 && n3.notas && n3.notas[0].texto === 'O fogo espantou três deles.' && !!n3.notas[0].ed, 'a Lia muda a dela (fica marcada como editada)');
    ok(/As anotações são de quem é do clã/.test(await nota(sB, { p_pag: 'lobo', p_op: 'criar', p_texto: 'do mestre' })) && /não está no livro/.test(await nota(sL, { p_pag: 'aranha', p_op: 'criar', p_texto: 'x' }))
      && /Escreva alguma coisa/.test(await nota(sL, { p_pag: 'lobo', p_op: 'criar', p_texto: '   ' })) && /Pedido desconhecido/.test(await nota(sL, { p_pag: 'lobo', p_op: 'roubar' })),
      'o mestre não anota (escreve na página); ninguém anota na página escondida; nem vazio; nem pedido inventado');
    ok(await mudar(sL, 'cla:lpub:lv_gar:n:lobo', { dados: { v: 1, notas: [] } }) !== 'ok' && await criar(sD, { id: 'cla:lpub:lv_gar:n:lobo', vis: 'mestre', dados: { v: 1, notas: [] } }) === 'recusado', 'as anotações só mudam pela função (ninguém reescreve o documento)');
    const n4 = await nota(sB, { p_pag: 'lobo', p_op: 'apagar', p_nota: idL });
    ok(n4 && n4.notas && n4.notas.length === 1 && n4.notas[0].id === idD && ((await ler(sD, 'cla:lpub:lv_gar:n:lobo')) || { dados: {} }).dados.notas.length === 1, 'o mestre apaga a anotação da Lia (a do Dalmo fica)');
    // esconder a página, trancar o livro
    ok(await mudar(sB, 'cla:livro:lv_gar:p:lobo', { dados: Object.assign({}, LOBO, { ver: { pag: false } }) }) === 'ok' && (await ler(sD, 'cla:lpub:lv_gar:p:lobo')).apagado === true && !/Lobo/.test(j((await ler(sD, 'cla:lpub:lv_gar:p:lobo')).dados)),
      'o mestre esconde a página: ela some (sem o conteúdo)');
    await confere('escondida de novo', 'lobo');
    ok(await mudar(sB, 'cla:livro:lv_gar:p:lobo', { dados: LOBO }) === 'ok' && await mudar(sB, 'cla:livro:lv_gar', { dados: { v: 1, on: false, titulo: 'Bestiário de Garret' } }) === 'ok' && await ids(sD) === 'cla:lpub:lv_gar:n:lobo',
      'o livro trancado: a capa e as páginas somem do clã (as anotações ficam guardadas para quando voltar)');
    ok(await mudar(sB, 'cla:livro:lv_gar', { dados: { v: 1, on: true, titulo: 'Bestiário de Garret' } }) === 'ok' && await ids(sD) === 'cla:lpub:lv_gar,cla:lpub:lv_gar:n:lobo,cla:lpub:lv_gar:p:lobo', '(liberado de novo)');
    await confere('no fim', 'lobo');

    // ---------------- na tela ----------------
    await M.locator('#tab-livro').click();
    let LM = null;
    ok(await ate(async () => { LM = await quadro(M, /\/livro\//); return LM && await LM.evaluate(() => !!window.__livro && __livro.pronto && __livro.naMesa && __livro.mestre); }, 40000), '(o mestre abre o Bestiário do clã)');
    ok(await ate(async () => (await LM.locator('#nome').innerText()) === 'Aranha de Cinzas' || (await LM.locator('#nome').innerText()) === 'Lobo da Névoa'), 'o livro do Garret, com as páginas que o banco tem');
    await LM.locator('#indice [data-letra="L"]').click(); await w(300);
    ok(/Fareja o medo/.test(await LM.locator('#pagEsq').innerText()) && /Selene/.test(await LM.locator('#pagEsq').innerText()), 'o mestre vê a anotação do Dalmo, assinada pela Selene');
    // o Dalmo: a aba aparece; ele lê e anota
    ok(await ate(async () => (await abas(Dp)).split(',').includes('livro'), 40000) && (await Dp.locator('#tab-livro').innerText()) === 'Bestiário', 'a aba "Bestiário" aparece para o Dalmo (o livro do clã dele foi liberado)');
    ok(await ate(async () => (await abas(Lp)).split(',').includes('livro'), 30000), 'e para a Lia (a Brisa voltou a liderar o Garret)');
    await Dp.locator('#tab-livro').click();
    let LD = null;
    ok(await ate(async () => { LD = await quadro(Dp, /\/livro\//); return LD && await LD.evaluate(() => !!window.__livro && __livro.pronto && __livro.naMesa && !__livro.mestre); }, 40000), '(o Dalmo abre o livro, como jogador)');
    ok(await ate(async () => (await LD.locator('#nome').innerText()) === 'Lobo da Névoa') && await LD.locator('#ctl').isHidden() && await LD.locator('.tg').count() === 0 && (await LD.locator('#contagem').innerText()) === '1 página',
      'o Dalmo vê a página do Lobo (só ela), sem os controles do mestre');
    ok(await LD.locator('[data-parte="desc"] .borrado').count() === 1 && await LD.locator('[data-parte="fraq"] .borrado').count() === 1 && await LD.locator('.quadro dt').count() === 2 && await LD.evaluate(() => !!document.querySelector('.foto img')),
      'a descrição e as fraquezas borradas; os números e a ilustração à vista');
    await LD.locator('#btAnotar').click(); await w(200, Dp);
    await LD.locator('#nt-texto').fill('Uiva antes de atacar.'); await LD.locator('#nt-ok').click();
    ok(await ate(async () => /Uiva antes de atacar/.test(await LD.locator('#pagEsq').innerText()) && /Selene/.test(await LD.locator('#pagEsq').innerText())), 'o Dalmo anota na margem: a anotação aparece com o nome da Selene');
    ok(await ate(async () => /Uiva antes de atacar/.test(await LM.locator('#pagEsq').innerText()), 30000), 'e chega ao mestre');
    await foto(Dp, 'livro-rede-dalmo');
    // o mestre apaga a anotação do Dalmo (pela tela)
    const idUiva = await LM.evaluate(() => { const L = __livro.livro(); const x = L.pags.find(y => y.p.nome === 'Lobo da Névoa'); return x.notas.find(n => /Uiva/.test(n.texto)).id; });
    await LM.locator(`[data-nota="${idUiva}"] [data-k="nota-apagar"]`).click(); await w(200);
    await LM.locator('#nt-apagar').click();
    ok(await ate(async () => !/Uiva antes de atacar/.test(await LD.locator('#pagEsq').innerText()), 30000), 'o mestre apaga a anotação: ela some para o Dalmo');
    await foto(M, 'livro-rede-mestre');

    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    for (const d of sondas) { try { await d.ctx.close(); } catch (e) { /* já fechada */ } }
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = errosDeFora();
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})();
