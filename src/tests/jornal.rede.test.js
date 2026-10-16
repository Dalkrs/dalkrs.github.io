// Jornal numa mesa de verdade (banco local de ensaio ou o projeto real), com o mestre (Bruno), o Dalmo (dono da
// Selene) e a Lia em aparelhos separados:
//   · a aba Jornal é a primeira, para todos; antes da primeira edição, os jogadores leem "ainda não saiu" e já mandam
//     cartas (o Dalmo, assinada pela Selene; a Lia, anônima) — e o mestre, escrevendo no editor, vê as cartas chegarem
//     sem perder o que escrevia;
//   · o mestre põe a carta do Dalmo no jornal e não publica a da Lia: ela vê "Não saiu" (a carta fica guardada em
//     "Não saíram"); a do Dalmo continua "Esperando o mestre" até sair;
//   · o mestre escreve (o nome, a data do mapa, o clima, uma matéria) e publica: o Dalmo, nas Fichas, vê o Jornal abrir
//     sozinho (com "Voltar para Fichas"); a Lia, escrevendo na mesa ao vivo, ganha só a bolinha e o aviso com "Ler";
//     a carta do Dalmo sai assinada pela Selene, e ele vê "Saiu no jornal"; o mestre não ganha bolinha;
//   · desfazer a publicação: o jornal volta a "ainda não saiu" para todos, e a carta do Dalmo volta a esperar;
//   · publicar com o site da Lia em segundo plano: nada troca de aba enquanto ela não olha — o Jornal abre quando ela volta;
//   · uma edição nova com o site do Dalmo fechado: quando ele volta, o Jornal abre;
//   · o Dalmo, mestre auxiliar com a aba Jornal: abre o editor (o rascunho da mesa), e a edição nova não abre sozinha
//     para ele nem acende a bolinha;
//   · o banco (SQL 0016): quem lê e quem escreve cada documento do Jornal (e o mestre auxiliar com e sem a aba Jornal).
// SO=banco roda só a parte do banco, numa mesa criada direto pelo banco (é o que os mutantes do SQL usam).
// (Sem mesa — o editor, a folha, desfazer, publicar —: src/tests/jornal.test.js.) FOTOS=<pasta> guarda capturas.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
// uma ficha completa (como a das Fichas), para o personagem do Dalmo
const ficha = nome => ({ nome, raca: 'Kitsune', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'C', AGI: 'C', VIT: 'D', CAN: 'B' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, defEsp: {}, rol: { fixa: 5, fonte: 'total' }, ini: 'AGI/5', disputa: {}, estaque: { a: '', b: '' }, habilidades: [], notas: '', itens: [],
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }, { id: 'sp', nome: 'SP', fml: '60' }] });

// O banco (SQL 0016): quem lê e quem escreve cada documento do Jornal. doZero: a mesa ainda não tem nada do Jornal —
// cada um cria os seus documentos aqui (e as recusas de criar vêm antes, enquanto o documento certo ainda não existe).
async function sondarBanco(t, c, mesa, dalmo, lia, doZero) {
  const sonda = async (email, nome) => { const d = await t.device({ name: 'sonda-' + nome }); await d.page.goto(t.base + 'src/tests/vazio.html'); const r = await entrar(d.page, email, c.senha, nome); return { d, p: d.page, uid: r.uid }; };
  const sB = await sonda(c.mestre, 'Bruno'), sD = await sonda(c.jog1, 'Dalmo'), sL = await sonda(c.jog2, 'Lia');
  const ids = s => s.p.evaluate(async mesa => { const r = await sb.from('documentos').select('id').eq('mesa_id', mesa).like('id', 'jornal:%'); return r.error ? 'erro: ' + r.error.message : r.data.map(x => x.id).sort().join(','); }, mesa);
  const criar = (s, linha) => s.p.evaluate(async ([mesa, linha]) => { const r = await sb.from('documentos').insert(Object.assign({ mesa_id: mesa, dados: {} }, linha)); return r.error ? 'recusado' : 'ok'; }, [mesa, linha]);
  const mudar = (s, id, campos) => s.p.evaluate(async ([mesa, id, campos]) => { const r = await sb.from('documentos').update(campos).eq('mesa_id', mesa).eq('id', id).select('id'); return r.error ? 'recusado' : (r.data || []).length ? 'ok' : 'nada'; }, [mesa, id, campos]);
  const rpc = (s, f, a) => s.p.evaluate(async ([f, a]) => { const r = await sb.rpc(f, a); return r.error ? r.error.message : 'ok'; }, [f, a]);
  const lista = (...x) => x.sort().join(',');
  const TODOS = lista('jornal:cartas:' + dalmo, 'jornal:cartas:' + lia, 'jornal:pub', 'jornal:rascunho', 'jornal:resp:' + dalmo, 'jornal:resp:' + lia);
  try {
    if (doZero) {
      ok(await criar(sB, { id: 'jornal:rascunho', vis: 'mestre', dados: { v: 1, nome: 'O Arauto' } }) === 'ok' && await criar(sB, { id: 'jornal:pub', vis: 'mesa', dados: { v: 1, nome: 'O Arauto', n: 1, em: new Date().toISOString() } }) === 'ok',
        'o mestre cria o rascunho e o publicado');
      ok(await criar(sL, { id: 'jornal:cartas:' + dalmo, dono_id: lia, vis: 'mestre' }) === 'recusado', 'a Lia não cria as cartas do Dalmo (nem sendo ela a dona)');
      ok(await criar(sL, { id: 'jornal:cartas:' + lia, dono_id: lia, vis: 'mesa' }) === 'recusado', 'nem as dela para a mesa toda ver');
      ok(await criar(sL, { id: 'jornal:cartas:' + lia, vis: 'mestre' }) === 'recusado', 'nem as dela sem ser a dona');
      ok(await criar(sL, { id: 'jornal:cartas:' + lia, dono_id: lia, vis: 'mestre', dados: { cartas: [{ id: 'ca_1', txt: 'Oi' }] } }) === 'ok'
        && await criar(sD, { id: 'jornal:cartas:' + dalmo, dono_id: dalmo, vis: 'mestre', dados: { cartas: [{ id: 'ca_2', txt: 'Olá' }] } }) === 'ok', 'cada um cria as próprias cartas, só para o mestre ver');
      ok(await criar(sB, { id: 'jornal:resp:' + dalmo, dono_id: dalmo, vis: 'mestre', dados: { st: { ca_2: 'saiu' } } }) === 'ok' && await criar(sB, { id: 'jornal:resp:' + lia, dono_id: lia, vis: 'mestre', dados: { st: { ca_1: 'nao' } } }) === 'ok',
        'o mestre escreve o que houve com as cartas de cada um (com ele como dono)');
    }
    const vL = await ids(sL), vD = await ids(sD), vB = await ids(sB);
    ok(vL === lista('jornal:cartas:' + lia, 'jornal:pub', 'jornal:resp:' + lia), 'no banco, a Lia lê o publicado, as cartas dela e o que houve com elas — não o rascunho, nem nada do Dalmo: ' + vL);
    ok(vD === lista('jornal:cartas:' + dalmo, 'jornal:pub', 'jornal:resp:' + dalmo), 'o Dalmo, o mesmo, com as dele: ' + vD);
    ok(vB === TODOS, 'o mestre lê tudo: ' + vB);
    ok(await mudar(sL, 'jornal:pub', { dados: { nome: 'Pichado' } }) !== 'ok' && await mudar(sL, 'jornal:rascunho', { dados: {} }) !== 'ok', 'a Lia não escreve o publicado nem o rascunho');
    ok(await criar(sL, { id: 'jornal:cartas:' + dalmo, dono_id: lia, vis: 'mestre' }) === 'recusado' && await criar(sL, { id: 'jornal:cartas:' + dalmo, dono_id: dalmo, vis: 'mestre' }) === 'recusado', 'nem cria as cartas do Dalmo');
    ok(await criar(sL, { id: 'jornal:outro', dono_id: lia, vis: 'mestre' }) === 'recusado' && await criar(sL, { id: 'jornal:resp:x', dono_id: lia, vis: 'mestre' }) === 'recusado', 'nem outro documento do Jornal');
    ok(await mudar(sD, 'jornal:cartas:' + dalmo, { vis: 'mesa' }) === 'recusado' && await mudar(sD, 'jornal:cartas:' + dalmo, { dono_id: lia }) === 'recusado', 'o Dalmo não mostra as cartas dele à mesa nem as passa a outra pessoa');
    // o mestre auxiliar: com a aba Jornal, mestra o Jornal; sem ela, lê como jogador
    ok(await rpc(sB, 'definir_auxiliar', { p_mesa: mesa, p_usuario: dalmo, p_auxiliar: true, p_abas: ['jornal'] }) === 'ok', 'o mestre faz do Dalmo mestre auxiliar só com a aba Jornal');
    {
      const v = await ids(sD);
      ok(v === TODOS && await mudar(sD, 'jornal:pub', { dados: { v: 1, nome: 'O Arauto do Dalmo' } }) === 'ok' && await mudar(sD, 'jornal:rascunho', { dados: { v: 1, nome: 'Rascunho do Dalmo' } }) === 'ok',
        'com a aba Jornal, o Dalmo lê tudo do Jornal e escreve o publicado e o rascunho: ' + v);
    }
    ok(await rpc(sB, 'definir_auxiliar', { p_mesa: mesa, p_usuario: dalmo, p_auxiliar: true }) === 'ok' && await ids(sD) === TODOS, 'nomeado sem dizer as abas (todas), também mestra o Jornal');
    ok(await rpc(sB, 'definir_auxiliar', { p_mesa: mesa, p_usuario: dalmo, p_auxiliar: true, p_abas: ['cenas'] }) === 'ok' && await ids(sD) === lista('jornal:cartas:' + dalmo, 'jornal:pub', 'jornal:resp:' + dalmo)
      && await mudar(sD, 'jornal:pub', { dados: { v: 1, nome: 'De novo' } }) !== 'ok', 'auxiliar sem a aba Jornal: lê e escreve como jogador');
    ok(await rpc(sB, 'definir_auxiliar', { p_mesa: mesa, p_usuario: dalmo, p_auxiliar: false }) === 'ok', '(o Dalmo volta a ser jogador)');
    ok(await mudar(sD, 'jornal:cartas:' + dalmo, { dados: { cartas: [] } }) === 'ok', 'e muda o que escreveu (as cartas são dele)');
  } finally {
    for (const s of [sB, sD, sL]) await s.d.ctx.close();
  }
}

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await entrar(d.page, c.jog2, c.senha, 'Lia'); await d.ctx.close(); }
  const errosDeFora = () => t.errs.filter(e => !/^\[sonda-/.test(e) || !/status of (400|401|403|409)/.test(e)).filter(e => !/status of (400|401|409)/.test(e));
  if (process.env.SO === 'banco') {
    // só o banco: a mesa e os dois jogadores direto pelo banco; cada um cria os seus documentos do Jornal
    const d = await t.device({ name: 'banco' }); await d.page.goto(t.base + 'src/tests/vazio.html');
    const um = async (email, nome, codigo) => d.page.evaluate(async ([email, senha, nome, codigo]) => {
      const e = await sb.auth.signInWithPassword({ email, password: senha }); if (e.error) return { erro: e.error.message };
      const uid = e.data.user.id;
      if (!codigo) {
        const r = await sb.rpc('criar_mesa', { p_nome: 'Jornal banco ' + Date.now().toString(36), p_meu_nome: nome }); if (r.error) return { erro: r.error.message };
        const cv = await sb.from('mesa_convites').select('codigo').eq('mesa_id', r.data.id).single();
        return { uid, mesa: r.data.id, codigo: cv.data && cv.data.codigo };
      }
      const r = await sb.rpc('entrar_na_mesa', { p_codigo: codigo, p_meu_nome: nome }); return r.error ? { erro: r.error.message } : { uid };
    }, [email, c.senha, nome, codigo || null]);
    const b = await um(c.mestre, 'Bruno'), dj = await um(c.jog1, 'Dalmo', b.codigo), lj = await um(c.jog2, 'Lia', b.codigo);
    ok(b.mesa && dj.uid && lj.uid, '(a mesa e os dois jogadores, direto pelo banco) ' + JSON.stringify([b.erro, dj.erro, lj.erro]));
    try { await sondarBanco(t, c, b.mesa, dj.uid, lj.uid, true); }
    finally {
      await d.page.evaluate(async ([email, senha, mesa]) => { await sb.auth.signInWithPassword({ email, password: senha }); await sb.from('mesas').delete().eq('id', mesa); }, [c.mestre, c.senha, b.mesa]);
      await d.ctx.close();
    }
    const fora = errosDeFora();
    if (fora.length) console.log('CONSOLE:\n' + fora.join('\n'));
    ok(fora.length === 0, 'sem erros inesperados no console');
    await t.close(); end(); return;
  }
  const M = (await t.device({ name: 'mestre', w: 1400, h: 900, seed: { 'tinycats:aba': 'jornal', 'tinycats-tour': '1' } })).page;
  const Dp = (await t.device({ name: 'dalmo', w: 1300, h: 860, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const Lp = (await t.device({ name: 'lia', w: 1300, h: 860, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const abaAtiva = p => p.evaluate(() => { const x = document.querySelector('.tab[aria-selected="true"]'); return x ? x.id.slice(4) : ''; });
  const abas = p => p.evaluate(() => [...document.querySelectorAll('.tab')].filter(x => !x.hidden).map(x => x.id.slice(4)).join(','));
  const bolinha = p => p.evaluate(() => document.getElementById('tab-jornal').classList.contains('novo'));
  const toasts = p => p.evaluate(() => [...document.querySelectorAll('#toasts .toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const docDe = (p, id) => p.evaluate(id => { const l = TC.dados.col('documentos').pegar(id); return l && !l.apagado ? JSON.parse(JSON.stringify(l.dados)) : null; }, id);
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const jornalPronto = f => f.evaluate(() => !!window.__jornal && __jornal.pronto && __jornal.naMesa);
  const leitura = f => f.locator('#leitura').innerText();
  const tag = (f, id) => f.locator(`[data-minha="${id}"] .tag`).innerText();
  async function escrever(f, k, v) { const el = f.locator(`[data-k="${k}"]`); await el.fill(v); await el.dispatchEvent('change'); await f.waitForTimeout(200); }
  async function publicar(f) { await f.locator('#btPublicar').click(); await f.waitForTimeout(300); const txt = await f.locator('#dlg').innerText(); await f.locator('[data-k="dl:sim"]').click(); await f.waitForTimeout(400); return txt; }
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Jornal E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let apagada = false;
  try {
    // ---------- a aba: a primeira; o mestre abre o editor ----------
    ok(await abas(M) === 'jornal,cenas,mundo,acampamento,fichas,arvore,meditacao,cla,rolador' && await abaAtiva(M) === 'jornal', 'a aba Jornal é a primeira (o mestre está nela): ' + await abas(M));
    let JM = null;
    ok(await ate(async () => { JM = await quadro(M, /\/jornal\//); return JM && await jornalPronto(JM) && await JM.evaluate(() => __jornal.mestre); }, 40000), '(na mesa, o mestre abre o Jornal como quem mestra)');
    ok(await JM.locator('#ed').isVisible() && await JM.locator('#btPublicar').isVisible() && /ainda não publicado/.test(await JM.locator('#salvo').innerText()) && /a mesa ainda não tem mapa/.test(await JM.locator('[data-k="j:mapa"]').innerText()),
      'o editor e o Publicar; sem mapa na mesa, o jornal fica sem data');

    // ---------- os jogadores entram ----------
    await Dp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Dp);
    await loginTela(Dp, c.jog1, c.senha); await entrarMesaTela(Dp, codigo, 'Dalmo');
    const dalmo = await Dp.evaluate(() => TC.conta.usuario.id);
    await Lp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Lp);
    await loginTela(Lp, c.jog2, c.senha); await entrarMesaTela(Lp, codigo, 'Lia');
    const lia = await Lp.evaluate(() => TC.conta.usuario.id);
    ok(await abas(Dp) === 'jornal,cenas,mundo,acampamento,fichas,arvore,meditacao,cla' && await abaAtiva(Dp) === 'fichas' && !(await bolinha(Dp)), 'para os jogadores, o Jornal também é a primeira aba (sem bolinha: nada saiu ainda)');
    // o mestre: a ficha da Selene, do Dalmo, e um mapa com calendário (é dele que vem a data do jornal)
    await M.evaluate(([d, f]) => {
      TC.dados.col('personagens').gravar('pc_selene', { nome: 'Selene', ficha: f, skills: {}, estado: {}, dono_id: d, vis: 'mesa', ordem: 0 });
      TC.dados.col('documentos').gravar('mundo:mapa:mp_vale', { dados: { id: 'mp_vale', nome: 'Vale de Brenn', cal: { dia: 2, ano0: 1 } }, vis: 'mestre' });
    }, [dalmo, ficha('Selene')]);
    ok(await ate(() => parado(M)), '(a ficha da Selene, do Dalmo, e um mapa com calendário sobem para a mesa)');
    // o mestre começa a escrever o nome (sem terminar): as cartas que chegarem não podem atrapalhar
    await JM.locator('[data-k="j:nome"]').fill('O Arauto de Brenn');

    // ---------- antes da primeira edição: os jogadores leem "ainda não saiu" e mandam cartas ----------
    await Dp.locator('#tab-jornal').click();
    let JD = null;
    ok(await ate(async () => { JD = await quadro(Dp, /\/jornal\//); return JD && await jornalPronto(JD) && (await JD.locator('[data-k="cj:ass"] option').count()) === 2; }, 40000), '(o Dalmo abre o Jornal, com a Selene para assinar)');
    ok(/O jornal ainda não saiu/.test(await leitura(JD)) && await JD.locator('#ed').isHidden() && await JD.locator('#btPublicar').isHidden() && await JD.locator('#modos').isHidden(),
      'para o jogador: "O jornal ainda não saiu", sem editor nem Publicar');
    ok((await JD.locator('[data-k="cj:ass"] option').allInnerTexts()).join('|') === 'Assinada por Selene|Anônima', 'a carta: assinada por um personagem dele (a Selene) ou anônima');
    await JD.locator('[data-k="cj:txt"]').fill('Caro editor, a ponte de Brenn caiu e ninguém fala nisso!');
    await JD.locator('[data-k="cj:mandar"]').click(); await w(500, Dp);
    ok(/Carta mandada ao jornal/.test(await JD.locator('#toasts').innerText()) && await JD.locator('.minha').count() === 1 && await JD.locator('[data-k="cj:txt"]').inputValue() === '', 'o Dalmo manda a carta: ela aparece em "Suas cartas" (e o campo esvazia)');
    const cD = await JD.locator('.minha').getAttribute('data-minha');
    ok(await tag(JD, cD) === 'Esperando o mestre', '"Esperando o mestre"');
    await Lp.locator('#tab-jornal').click();
    let JL = null;
    ok(await ate(async () => { JL = await quadro(Lp, /\/jornal\//); return JL && await jornalPronto(JL); }, 40000), '(a Lia abre o Jornal)');
    ok((await JL.locator('[data-k="cj:ass"] option').allInnerTexts()).join('|') === 'Anônima', 'a Lia não tem personagem: a carta dela vai anônima');
    await JL.locator('[data-k="cj:txt"]').fill('Alguém viu meu gato preto? Atende por Fuligem.');
    await JL.locator('[data-k="cj:mandar"]').click(); await w(500, Lp);
    const cL = await JL.locator('.minha').getAttribute('data-minha');
    ok(!!cL && await tag(JL, cL) === 'Esperando o mestre', 'a Lia manda a dela');
    // os dois voltam às Fichas; a Lia começa a escrever na mesa ao vivo
    await Dp.locator('#tab-fichas').click(); await Lp.locator('#tab-fichas').click();
    await Lp.locator('#msg').click(); await Lp.locator('#msg').pressSequentially('Já volto, pessoal');

    // ---------- o mestre recebe as cartas ----------
    const chega = id => JM.locator(`#sec-cartas > .lista [data-ch="${id}"]`);
    ok(await ate(async () => (await chega(dalmo + '/' + cD).count()) === 1 && (await chega(lia + '/' + cL).count()) === 1, 30000), 'as duas cartas chegam ao mestre, em "Chegaram"');
    ok(await JM.evaluate(() => document.activeElement.dataset.k === 'j:nome' && document.activeElement.value === 'O Arauto de Brenn'), 'enquanto ele escrevia o nome: o campo continua com o cursor e o que ele escrevia');
    ok(/Selene · mandada por Dalmo/.test(await chega(dalmo + '/' + cD).innerText()) && /Anônima · mandada por Lia/.test(await chega(lia + '/' + cL).innerText()), 'cada carta com a assinatura e quem mandou');
    await JM.locator('[data-k="j:nome"]').dispatchEvent('change'); await w(200);
    await JM.locator(`[data-k="ch:${dalmo}/${cD}:por"]`).click(); await w(400);
    ok(await JM.evaluate(([d, id]) => { const c = __jornal.ras.cartas; return c.length === 1 && c[0].ass === 'Selene' && c[0].de === d && c[0].ref === id && /ponte de Brenn caiu/.test(c[0].txt); }, [dalmo, cD])
      && /Carta de Dalmo/i.test(await JM.locator('#sec-cartas [data-carta]').innerText()) && (await chega(dalmo + '/' + cD).count()) === 0, '"Pôr no jornal": a carta do Dalmo entra no rascunho, assinada pela Selene (e sai de "Chegaram")');
    await JM.locator(`[data-k="ch:${lia}/${cL}:nao"]`).click(); await w(400);
    ok(/A carta não vai sair\. Lia vê que ela não saiu/.test(await JM.locator('#toasts').innerText()) && (await JM.locator('details.dobra summary').allInnerTexts()).join('|') === 'Não saíram (1)' && (await chega(lia + '/' + cL).count()) === 0,
      '"Não publicar": a da Lia vai para "Não saíram" (guardada)');
    ok(await ate(async () => await tag(JL, cL) === 'Não saiu', 30000), 'a Lia vê que a carta dela não saiu');
    ok(await tag(JD, cD) === 'Esperando o mestre', 'a do Dalmo continua esperando (sai quando o jornal for publicado)');

    // ---------- o mestre escreve e publica ----------
    await JM.locator('[data-k="j:mapa"]').selectOption('mp_vale'); await w(250);
    ok(/Hoje no mundo: 3 de Alvorada, ano 1\./.test(await JM.locator('#ed').innerText()), 'a data do mundo vem do calendário do mapa escolhido: 3 de Alvorada, ano 1');
    await JM.locator('[data-k="j:clima"]').selectOption('chuva'); await w(200);
    await escrever(JM, 'j:frase', 'Chuva fina sobre o vale');
    await JM.locator('[data-k="m:nova"]').click(); await w(300);
    const m1 = await JM.evaluate(() => __jornal.ras.materias[0].id);
    await escrever(JM, `m:${m1}:tit`, 'A ponte de Brenn desaba');
    await escrever(JM, `m:${m1}:txt`, 'A velha ponte **desabou** de madrugada.');
    const pergunta = await publicar(JM);
    ok(/Os jogadores vão ler esta versão, e o Jornal abre para eles\. Ele sai com a data 3 de Alvorada, ano 1\./.test(pergunta), 'Publicar pergunta antes (e diz a data com que ele sai)');
    ok(/Publicado: os jogadores já veem o jornal\./.test(await JM.locator('#toasts').innerText()), 'publicado');
    ok(await ate(async () => { const p = await docDe(M, 'jornal:pub'); return p && p.n === 1 && p.data === '3 de Alvorada, ano 1' && p.nome === 'O Arauto de Brenn' && p.cartas.length === 1 && await parado(M); }), 'na mesa, o publicado: o número 1, com a data do mundo e a carta');
    ok(await ate(async () => { const r = await docDe(M, 'jornal:resp:' + dalmo); return !!r && r.st[cD] === 'saiu'; }), 'e, para o Dalmo, a resposta: a carta dele saiu');
    await M.locator('#tab-cenas').click(); await w(300);

    // ---------- os jogadores: o Dalmo, nas Fichas, vê o Jornal abrir; a Lia, escrevendo, ganha a bolinha ----------
    ok(await ate(async () => await abaAtiva(Dp) === 'jornal', 30000), 'para o Dalmo, nas Fichas, o Jornal abre sozinho');
    ok(/Saiu o Jornal\./.test(await toasts(Dp)) && await Dp.locator('#toasts .toast button', { hasText: 'Voltar para Fichas' }).count() === 1 && !(await bolinha(Dp)), 'com o aviso "Saiu o Jornal." e "Voltar para Fichas" (lido: sem bolinha) — ' + await toasts(Dp));
    ok(await ate(async () => /O Arauto de Brenn/.test(await leitura(JD)) && await tag(JD, cD) === 'Saiu no jornal'), 'o Dalmo lê o jornal; a carta dele: "Saiu no jornal"');
    {
      const f = JD.locator('#leitura .folha');
      ok((await f.locator('.faixa .data').innerText()) === '3 de Alvorada, ano 1' && /Chuva · Chuva fina sobre o vale/.test(await f.locator('.faixa .clima').innerText()) && (await f.locator('.manchete h2').innerText()) === 'A ponte de Brenn desaba'
        && (await f.locator('.manchete b').innerText()) === 'desabou' && (await f.locator('.cartas .carta .ass').innerText()) === 'Selene' && /a ponte de Brenn caiu/.test(await f.locator('.cartas .carta').innerText()),
        'a folha: a data do mundo, o clima, a manchete (com o negrito) e a carta do Dalmo, assinada pela Selene');
    }
    await foto(Dp, 'jornal-rede-dalmo');
    await Dp.locator('#toasts .toast button', { hasText: 'Voltar para Fichas' }).click(); await w(300, Dp);
    ok(await abaAtiva(Dp) === 'fichas', '"Voltar para Fichas" volta');
    ok(await ate(async () => await bolinha(Lp), 30000) && await abaAtiva(Lp) === 'fichas' && /Saiu o Jornal\./.test(await toasts(Lp)) && await Lp.locator('#toasts .toast button', { hasText: 'Ler' }).count() === 1
      && await Lp.locator('#msg').inputValue() === 'Já volto, pessoal' && await Lp.evaluate(() => document.activeElement.id) === 'msg',
      'a Lia, escrevendo na mesa ao vivo: o Jornal não abre por cima — a aba ganha a bolinha e o aviso tem "Ler" (o que ela escrevia continua lá)');
    await foto(Lp, 'jornal-rede-bolinha');
    await Lp.locator('#toasts .toast button', { hasText: 'Ler' }).click(); await w(500, Lp);
    ok(await abaAtiva(Lp) === 'jornal' && !(await bolinha(Lp)), '"Ler" abre o Jornal, e a bolinha some');
    ok(await ate(async () => /A ponte de Brenn desaba/.test(await leitura(JL))) && !/Fuligem/.test(await JL.locator('#leitura .folha').innerText()) && await tag(JL, cL) === 'Não saiu', 'a Lia lê o jornal (sem a carta dela, que não saiu)');
    ok(await abaAtiva(M) === 'cenas' && !(await bolinha(M)), 'o mestre, nas Cenas: o Jornal não abre sozinho nem ganha bolinha (quem publica já viu)');

    // ---------- desfazer a publicação ----------
    await M.locator('#tab-jornal').click(); await w(400);
    await JM.locator('#btDesfazer').click(); await w(400);
    ok(/Desfeito: publicar o jornal\./.test(await JM.locator('#toasts').innerText()), 'o mestre desfaz a publicação');
    ok(await ate(async () => !(await docDe(M, 'jornal:pub')) && await parado(M)), 'o publicado sai da mesa');
    ok(await ate(async () => /O jornal ainda não saiu/.test(await leitura(JD)) && await tag(JD, cD) === 'Esperando o mestre', 30000), 'para o Dalmo, o jornal volta a "ainda não saiu", e a carta dele volta a esperar');
    ok(await ate(async () => /O jornal ainda não saiu/.test(await leitura(JL))) && !(await bolinha(Dp)), 'para a Lia também (e nenhuma bolinha)');

    // ---------- de novo (a Lia com o site em segundo plano); e uma edição nova com o site do Dalmo fechado ----------
    const segundoPlano = (p, sim) => p.evaluate(sim => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => sim }); document.dispatchEvent(new Event('visibilitychange')); }, sim);
    await Lp.locator('#tab-fichas').click(); await w(300, Lp);
    await segundoPlano(Lp, true);
    await publicar(JM);
    ok(await ate(async () => await abaAtiva(Dp) === 'jornal' && /O Arauto de Brenn/.test(await leitura(JD)) && await tag(JD, cD) === 'Saiu no jornal', 30000), 'publicado de novo: o Jornal abre para o Dalmo, e a carta dele saiu');
    ok(await ate(async () => await bolinha(Lp), 30000) && await abaAtiva(Lp) === 'fichas', 'para a Lia, com o site em segundo plano: só a bolinha (nada troca de aba enquanto ela não está olhando)');
    await segundoPlano(Lp, false);
    ok(await ate(async () => await abaAtiva(Lp) === 'jornal', 8000) && await Lp.locator('#toasts .toast button', { hasText: 'Voltar para Fichas' }).count() === 1 && !(await bolinha(Lp)), 'quando ela volta ao site, o Jornal abre (com "Voltar para Fichas")');
    await Dp.locator('#tab-fichas').click(); await w(300, Dp);
    ok(await ate(() => parado(Dp)), '(o Dalmo não tem nada por subir)');
    await Dp.goto('about:blank');
    await escrever(JM, `m:${m1}:tit`, 'A ponte de Brenn será reconstruída');
    await publicar(JM);
    ok(await ate(async () => { const p = await docDe(M, 'jornal:pub'); return p && p.n === 2 && await parado(M); }), '(com o site do Dalmo fechado, o mestre publica a edição 2)');
    await Dp.goto(t.base + '?debug', { waitUntil: 'load' });
    ok(await ate(async () => await abaAtiva(Dp) === 'jornal', 40000), 'o Dalmo volta ao site (estava nas Fichas): com uma edição que ele não leu, o Jornal abre');
    let JD2 = null;
    ok(await ate(async () => { JD2 = await quadro(Dp, /\/jornal\//); return JD2 && /A ponte de Brenn será reconstruída/.test(await leitura(JD2)); }, 30000) && !(await bolinha(Dp)), 'com a edição nova');

    // ---------- o Dalmo, mestre auxiliar com a aba Jornal: mestra o Jornal (sem bolinha, nada abre sozinho) ----------
    await M.evaluate(d => TC.mesas.definirAuxiliar(d, true, ['jornal']), dalmo);
    let JA = null;
    ok(await ate(async () => { JA = await quadro(Dp, /\/jornal\//); return JA && await jornalPronto(JA) && await JA.evaluate(() => __jornal.mestre && __jornal.ras.nome === 'O Arauto de Brenn') && await JA.locator('#ed').isVisible(); }, 40000),
      'o mestre faz do Dalmo mestre auxiliar com a aba Jornal: ele abre o editor, com o rascunho da mesa');
    await Dp.locator('#tab-fichas').click(); await w(300, Dp);
    await escrever(JM, `m:${m1}:tit`, 'A ponte de Brenn ganha data para reabrir');
    await publicar(JM);
    const chegou3 = await ate(async () => { const p = await docDe(Dp, 'jornal:pub'); return !!p && p.n === 3; }, 30000);
    await w(1500, Dp);
    ok(chegou3 && await abaAtiva(Dp) === 'fichas' && !(await bolinha(Dp)), 'a edição 3 chega ao Dalmo, que mestra o Jornal: nada abre sozinho e a aba fica sem bolinha');
    await M.evaluate(d => TC.mesas.definirAuxiliar(d, false), dalmo);
    ok(await ate(async () => await Dp.evaluate(() => TC.mesas.atual && TC.mesas.atual.cargo === 'jogador')), '(o Dalmo volta a ser jogador)');

    // ---------- o banco ----------
    await sondarBanco(t, c, await M.evaluate(() => TC.mesas.atual.id), dalmo, lia);

    // (antes de apagar a mesa, o que falta subir termina de subir)
    await ate(() => parado(M));
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  // (as recusas da sonda do banco aparecem no console dela como respostas de erro: são o que se esperava)
  const fora = errosDeFora();
  if (fora.length) console.log('CONSOLE:\n' + fora.join('\n') + '\nRESPOSTAS DE ERRO:\n' + t.ruins.join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
