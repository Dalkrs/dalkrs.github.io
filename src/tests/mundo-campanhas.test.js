// Mapa-múndi numa mesa com campanhas, com a casca falsa (casca-falsa.html) em vários aparelhos: o mestre com a
// campanha A em vista, o mestre (outro aparelho) com a B, e jogadores só da A, só da B, das duas e de nenhuma.
// O Node faz o papel do banco: guarda os documentos e repassa a cada aparelho o que mudou nos outros — e a casca
// falsa de cada um só deixa passar o que aquele jogador pode ver (os mapas do mundo e os das campanhas dele).
// Confere: de que campanha nasce cada mapa, o que vai no índice (só os nomes dos mapas do mundo), a quem a projeção
// chega, os atalhos entre mapas de campanhas diferentes, trocar as campanhas de um mapa (e desfazer), o mapa em duas
// campanhas, e que nada de uma campanha chega a quem não participa dela. A rede de fora não é usada.
const { start, checker } = require('./lib');
const { ok, end } = checker();

const MESA = 'mesa_camp';
const PRE_MAPA = 'mundo:mapa:', PRE_PUB = 'mundo:pub:', INDICE = 'mundo:indice';
const CAMPS = [{ id: 'ca', nome: 'Geração do Dain', encerrada: false }, { id: 'cb', nome: 'Geração da Lira', encerrada: false }];
const SEG_A = 'Q41ZA', SEG_B = 'Q41ZB';                 // vão no nome de mapas que são só da campanha A / só da B
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;
const ate = async (fn, ms = 6000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await espera(100); } };
async function pronto(F) { await F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await F.waitForTimeout(250); }
async function passo(nome, fn) {
  try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); }
}
const A = (a, fn, arg) => a.F.evaluate(fn, arg);
const mesmas = (x, y) => Array.isArray(x) && x.length === y.length && y.every(c => x.includes(c));

(async () => {
  const t = await start();
  const id = {};
  const banco = { personagens: new Map(), documentos: new Map(), rev: 0, log: [] };
  const aparelhos = [], pendentes = [];
  function gravou(origem, col, linha) {
    const c = banco[col];
    if (!c || !linha || !linha.id) return null;
    linha = Object.assign({}, linha, { rev: ++banco.rev });
    if (linha.apagado) c.delete(linha.id); else c.set(linha.id, linha);
    banco.log.push({ col, id: linha.id, apagado: !!linha.apagado, de: origem.nome });
    for (const b of aparelhos) if (b !== origem && !b.P.isClosed()) pendentes.push(b.P.evaluate(([c, l]) => window.__chegou && window.__chegou(c, l), [col, linha]).catch(() => null));
    return linha;
  }
  // o: { camp: a campanha em vista, minhas: as do jogador, semCampanhas: uma mesa sem campanha nenhuma }
  async function naCasca(nome, papel, eu, o = {}) {
    const d = await t.device({ name: nome });
    d.page.setDefaultTimeout(8000);
    const a = { P: d.page, F: null, nome, papel, eu };
    await a.P.exposeFunction('__tcLer', col => [...(banco[col] || new Map()).values()]);
    await a.P.exposeFunction('__tcGravou', (col, linha) => gravou(a, col, linha));
    aparelhos.push(a);
    const q = `papel=${papel}&eu=${eu}&mesa=${MESA}` + (o.cargo ? '&cargo=' + o.cargo : '') + (o.semCampanhas ? '' : `&camps=${encodeURIComponent(j(CAMPS))}&minhas=${(o.minhas || []).join(',')}&camp=${o.camp || ''}`);
    await a.P.goto(t.base + 'src/tests/casca-falsa.html?' + q, { waitUntil: 'load' });
    for (let i = 0; i < 80 && !a.F; i++) { a.F = a.P.frames().find(f => f !== a.P.mainFrame() && /\/mundo\//.test(f.url())) || null; if (!a.F) await espera(100); }
    await pronto(a.F);
    return a;
  }
  const doc = k => banco.documentos.get(k) || null;
  const casca = (a, fn) => a.P.evaluate(fn);
  const entregue = async a => j(await casca(a, () => window.__entregues));
  const lista = a => A(a, () => __mundo.App.mapas.map(m => m.nome));
  const aberto = a => A(a, () => (__mundo.App.mapa ? __mundo.App.mapa.nome : null));
  const avisos = a => A(a, () => [...document.querySelectorAll('#toasts .toast')].map(x => x.textContent).join(' | '));
  const semAvisos = a => A(a, () => document.getElementById('toasts').replaceChildren());
  // os títulos e os itens do menu de mapas, como aparecem
  async function menu(a) {
    await a.F.click('#btMapa'); await a.F.waitForTimeout(150);
    const r = await A(a, () => [...document.querySelectorAll('#menuMapas > *')].map(e => (e.classList.contains('menu-tit') ? '# ' + e.textContent : e.getAttribute('role') === 'menuitemradio' ? '· ' + e.querySelector('span').textContent + (e.querySelector('small') ? ' [' + e.querySelector('small').textContent + ']' : '') : null)).filter(Boolean));
    await a.P.keyboard.press('Escape'); await a.F.waitForTimeout(120);
    return r;
  }
  async function menuMapa(a, texto) {
    await a.F.click('#btMapa'); await a.F.waitForTimeout(150);
    await a.F.locator('#menuMapas button').filter({ hasText: texto }).first().click(); await a.F.waitForTimeout(250);
  }
  // a janela "Campanhas deste mapa…": marca exatamente as campanhas pedidas e guarda
  async function campanhasDoMapa(a, quais) {
    await menuMapa(a, 'Campanhas deste mapa…');
    const d = a.F.locator('dialog.mundo-dl[open]'); await d.waitFor();
    for (const c of CAMPS) await d.locator(`input[type="checkbox"][value="${c.id}"]`).setChecked(quais.includes(c.id));
    await d.locator('button[type="submit"]').click(); await a.F.waitForTimeout(300);
  }
  const novoMapa = (a, nome) => A(a, n => { const m = __mundo.App.criarMapa(n, { larg: 1000, alt: 700 }); return m && m.id; }, nome);
  const mostrarEste = a => A(a, () => __mundo.App.esconderMapa(__mundo.App.mapa.id, false));     // tira do esconderijo (sem "mostrar")

  /* ================= 1. o mestre, com a campanha A em vista ================= */
  const M = await naCasca('mestre-A', 'mestre', 'u_mestre', { camp: 'ca' });
  await passo('o mapa novo nasce na campanha em vista', async () => {
    ok(await A(M, () => { const a = __mundo.App; return a.campanha() === 'ca' && a.campanhas().length === 2 && a.mapa === null; }), 'o mestre abre com a campanha A em vista e as duas campanhas da mesa');
    await M.F.fill('#vazio [data-k="vz:nome"]', 'Reino ' + SEG_A);
    await M.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    id.reino = await A(M, () => __mundo.App.mapa && __mundo.App.mapa.id);
    ok(!!id.reino && await ate(() => !!doc(PRE_MAPA + id.reino)), 'mapa criado pelo estado vazio');
    const d = doc(PRE_MAPA + id.reino);
    ok(d.vis === 'mestre' && mesmas(d.campanhas, ['ca']) && d.dados.oculto === true, 'o documento do mapa é da campanha A (e nasce escondido): ' + j(d.campanhas));
    ok(!doc(PRE_PUB + id.reino) && !doc(INDICE), 'escondido: sem projeção e sem índice');
    ok(mesmas(await A(M, () => __mundo.App.campanhasDoMapa()), ['ca']) && j(await A(M, () => __mundo.App.mapas.map(x => x.camps))) === j([['ca']]), 'a lista do mestre diz de que campanha é cada mapa');
    await M.F.click('#tab-mapa'); await espera(150);
    const p = await M.F.locator('#pane').innerText();
    ok(/Este mapa é da campanha Geração do Dain\./.test(p) && await M.F.locator('#pane [data-k="mapa:campanhas"]').isVisible(), 'a aba Mapa diz de que campanha é o mapa e oferece "Campanhas deste mapa…"');
  });

  await passo('mostrar um mapa de campanha: a projeção é dela e o índice não leva o nome', async () => {
    await semAvisos(M);
    await M.F.click('#pane [data-k="mapa:mostrar"]'); await espera(300);
    ok(await ate(() => !!doc(PRE_PUB + id.reino) && !!doc(INDICE)), 'mostrado: a projeção e o índice existem');
    const p = doc(PRE_PUB + id.reino), i = doc(INDICE);
    ok(p.vis === 'mesa' && mesmas(p.campanhas, ['ca']), 'a projeção leva as campanhas do mapa: ' + j(p.campanhas));
    ok(i.vis === 'mesa' && mesmas(i.campanhas || [], []) && j(i.dados) === j({ mapas: [], mostrado: id.reino }), 'o índice (da mesa inteira) não tem o nome do mapa de campanha, só diz qual está sendo mostrado: ' + j(i.dados));
    ok(/Os jogadores da campanha Geração do Dain agora veem: Reino/.test(await avisos(M)), 'o aviso diz quem passa a ver: ' + await avisos(M));
    ok(/Os jogadores da campanha Geração do Dain estão vendo este mapa agora\./.test(await M.F.locator('#pane').innerText()), 'a aba Mapa diz quem está vendo');
  });

  /* ================= 2. os jogadores ================= */
  const JA = await naCasca('jog-A', 'jogador', 'u_a', { minhas: ['ca'], camp: 'ca' });
  const JB = await naCasca('jog-B', 'jogador', 'u_b', { minhas: ['cb'], camp: 'cb' });
  const JN = await naCasca('jog-nenhuma', 'jogador', 'u_n', { minhas: [] });
  await passo('só quem é da campanha recebe o mapa dela', async () => {
    ok(await aberto(JA) === 'Reino ' + SEG_A && j(await lista(JA)) === j(['Reino ' + SEG_A]) && await A(JA, () => __mundo.App.mostrado === __mundo.App.mapa.id), 'o jogador da campanha A abre o mapa mostrado');
    ok(j(await menu(JA)) === j(['# Mapas · Geração do Dain', '· Reino ' + SEG_A + ' [o mestre mostra]']), 'o menu dele: ' + j(await menu(JA)));
    for (const [x, quem] of [[JB, 'da campanha B'], [JN, 'de nenhuma campanha']]) {
      ok(await aberto(x) === null && (await lista(x)).length === 0 && await A(x, () => __mundo.App.mostrado === null), `o jogador ${quem} não tem mapa nenhum (o mapa mostrado não é para ele)`);
      ok(!(await entregue(x)).includes(SEG_A), `nada do mapa da campanha A chegou ao jogador ${quem}`);
    }
    ok(await A(JN, () => __mundo.App.campanha() === null && __mundo.App.campanhas().length === 0), 'quem não está em campanha nenhuma não vê as campanhas');
  });

  /* ================= 3. um mapa do mundo ================= */
  await passo('um mapa do mundo aparece em todas as campanhas (e é o único com nome no índice)', async () => {
    id.mundo = await novoMapa(M, 'Mundo conhecido');
    ok(await ate(() => mesmas((doc(PRE_MAPA + id.mundo) || {}).campanhas, ['ca'])), 'o segundo mapa também nasce na campanha em vista');
    await semAvisos(M);
    await campanhasDoMapa(M, []);
    ok(await ate(() => mesmas(doc(PRE_MAPA + id.mundo).campanhas, [])), 'desmarcadas todas as campanhas, o mapa passa a ser do mundo');
    ok(/"Mundo conhecido" agora é do mundo: aparece em todas as campanhas\./.test(await avisos(M)) && await aberto(M) === 'Mundo conhecido', 'o aviso diz que é do mundo (e ele continua na lista daqui): ' + await avisos(M));
    await mostrarEste(M); await espera(300);
    const p = doc(PRE_PUB + id.mundo), i = doc(INDICE);
    ok(!!p && mesmas(p.campanhas, []) && j(i.dados) === j({ mapas: [{ id: id.mundo, nome: 'Mundo conhecido' }], mostrado: id.reino }), 'a projeção dele é do mundo e o índice leva o nome dele: ' + j(i.dados));
    ok(j(await menu(M)) === j(['# Mapas · Geração do Dain', '· Reino ' + SEG_A + ' [mostrando]', '# Do mundo', '· Mundo conhecido']), 'o menu do mestre separa os da campanha em vista dos do mundo: ' + j(await menu(M)));
    ok(await ate(async () => j(await lista(JA)) === j(['Mundo conhecido', 'Reino ' + SEG_A])) && await aberto(JA) === 'Reino ' + SEG_A, 'o jogador da A ganha o mapa do mundo na lista e continua no que o mestre mostra');
    ok(j(await menu(JA)) === j(['# Mapas · Geração do Dain', '· Reino ' + SEG_A + ' [o mestre mostra]', '# Do mundo', '· Mundo conhecido']), 'o menu do jogador da A: ' + j(await menu(JA)));
    for (const [x, quem] of [[JB, 'da B'], [JN, 'de nenhuma campanha']]) {
      ok(await ate(async () => (await aberto(x)) === 'Mundo conhecido') && j(await lista(x)) === j(['Mundo conhecido']), `o jogador ${quem} abre o mapa do mundo (o único que ele tem)`);
      ok(!(await entregue(x)).includes(SEG_A), `…e continua sem receber nada do mapa da campanha A`);
    }
    ok(j(await menu(JN)) === j(['# Mapas da mesa', '· Mundo conhecido']), 'quem não tem campanha vê a lista simples: ' + j(await menu(JN)));
  });

  /* ================= 4. atalhos entre mapas de campanhas diferentes ================= */
  await passo('atalho para um mapa que nem todos veem não vai na projeção', async () => {
    // no mapa do mundo, um marcador com atalho para o mapa da campanha A
    await A(M, r => { const N = __mundo.N; __mundo.App.mudar('novo marcador', m => { m.objs.push(N.objNovo('m', { x: 300, y: 300, nome: 'Passagem', liga: { t: 'mapa', id: r, nome: 'Reino' } })); }); }, id.reino);
    ok(await ate(() => { const p = doc(PRE_PUB + id.mundo); return !!p && p.dados.objs.some(o => o.nome === 'Passagem'); }), 'o marcador chega à projeção do mapa do mundo');
    const o = doc(PRE_PUB + id.mundo).dados.objs.find(x => x.nome === 'Passagem');
    ok(o.liga === null && !j(doc(PRE_PUB + id.mundo)).includes(SEG_A), 'mas sem o atalho: o mapa do mundo é de todos, e o alvo é só da campanha A');
    ok(doc(PRE_MAPA + id.mundo).dados.objs.find(x => x.nome === 'Passagem').liga.id === id.reino, 'no mapa do mestre o atalho continua lá');
    ok(await ate(async () => (await A(JB, () => __mundo.App.mapa.objs.some(x => x.nome === 'Passagem')))) && !(await entregue(JB)).includes(SEG_A), 'o jogador da B recebe o marcador, sem o nome do mapa da A');
    // no mapa da campanha A, um atalho para o mapa do mundo: esse todos os que veem o mapa podem seguir
    await A(M, r => __mundo.App.trocarMapa(r), id.reino);
    await A(M, w => { const N = __mundo.N; __mundo.App.mudar('novo marcador', m => { m.objs.push(N.objNovo('m', { x: 200, y: 200, nome: 'Saída', liga: { t: 'mapa', id: w, nome: 'Mundo conhecido' } })); }); }, id.mundo);
    ok(await ate(() => { const p = doc(PRE_PUB + id.reino); const s = p && p.dados.objs.find(x => x.nome === 'Saída'); return !!s && !!s.liga && s.liga.id === id.mundo; }), 'o atalho de um mapa de campanha para um mapa do mundo vai na projeção');
  });

  /* ================= 5. duplicar, passar para outra campanha, desfazer ================= */
  await passo('a cópia fica nas campanhas do original; passar para outra campanha tira da lista daqui', async () => {
    await semAvisos(M);
    id.copia = await A(M, () => { const c = __mundo.App.duplicarMapa(); return c && c.id; });
    await espera(300);
    await A(M, n => __mundo.App.renomearMapa(n), 'Cópia ' + SEG_B);
    ok(await ate(() => { const d = doc(PRE_MAPA + id.copia); return !!d && d.dados.nome === 'Cópia ' + SEG_B && mesmas(d.campanhas, ['ca']) && d.dados.oculto === true; }), 'a cópia de um mapa da campanha A é da campanha A, e nasce escondida');
    await mostrarEste(M); await espera(300);
    ok(mesmas((doc(PRE_PUB + id.copia) || {}).campanhas, ['ca']) && await ate(async () => (await lista(JA)).includes('Cópia ' + SEG_B)), 'à vista, a cópia chega ao jogador da A');
    ok(!(await entregue(JB)).includes(SEG_B), 'e não ao da B');
    await semAvisos(M);
    await campanhasDoMapa(M, ['cb']);
    ok(await ate(() => mesmas(doc(PRE_MAPA + id.copia).campanhas, ['cb']) && mesmas(doc(PRE_PUB + id.copia).campanhas, ['cb'])), 'passada para a campanha B: o mapa e a projeção são da B');
    const av = await avisos(M);
    ok(/agora é da campanha Geração da Lira\. Saiu desta lista: está na daquela campanha\./.test(av), 'o aviso diz para onde foi e que saiu da lista: ' + av);
    ok(!(await lista(M)).includes('Cópia ' + SEG_B) && await aberto(M) !== 'Cópia ' + SEG_B && await aberto(M) !== null, 'saiu da lista do mestre (campanha A em vista) e outro mapa ficou aberto: ' + await aberto(M));
    ok(await ate(async () => !(await lista(JA)).includes('Cópia ' + SEG_B)), 'saiu da lista do jogador da A');
    ok(await ate(async () => (await lista(JB)).includes('Cópia ' + SEG_B)), 'e entrou na do jogador da B');
    ok(!(await entregue(JN)).includes(SEG_B), 'quem não tem campanha continua sem receber');
    // desfazer pelo aviso: volta para a campanha A e reabre
    await M.F.locator('#toasts .toast button', { hasText: 'Desfazer' }).click(); await espera(400);
    ok(mesmas(doc(PRE_MAPA + id.copia).campanhas, ['ca']) && mesmas(doc(PRE_PUB + id.copia).campanhas, ['ca']) && await aberto(M) === 'Cópia ' + SEG_B, '"Desfazer" devolve o mapa à campanha A e o reabre');
    ok(await ate(async () => (await lista(JA)).includes('Cópia ' + SEG_B) && !(await lista(JB)).includes('Cópia ' + SEG_B)), 'e os jogadores voltam a ver como antes');
    // de novo para a B, agora para ficar
    await campanhasDoMapa(M, ['cb']);
    ok(await ate(() => mesmas(doc(PRE_PUB + id.copia).campanhas, ['cb'])), 'de novo na campanha B');
  });

  /* ================= 6. o mestre com a campanha B em vista (outro aparelho) ================= */
  const M2 = await naCasca('mestre-B', 'mestre', 'u_mestre', { camp: 'cb' });
  await passo('cada campanha em vista tem a sua lista; mapa de outra campanha não se abre por atalho', async () => {
    ok(j(await lista(M2)) === j(['Cópia ' + SEG_B, 'Mundo conhecido']), 'com a B em vista: os mapas da B e os do mundo: ' + j(await lista(M2)));
    ok(j(await menu(M2)) === j(['# Mapas · Geração da Lira', '· Cópia ' + SEG_B, '# Do mundo', '· Mundo conhecido']), 'o menu com a B em vista: ' + j(await menu(M2)));
    ok(await A(M2, () => __mundo.App.mostradoDeFora()), 'o mapa mostrado é de outra campanha (não está na lista daqui)');
    await A(M2, () => __mundo.App.trocarMapa(__mundo.App.mapas.find(m => m.nome === 'Mundo conhecido').id));
    await M2.F.click('#tab-mapa'); await espera(150);
    ok(/mas você está mostrando outro \(de outra campanha\)\./.test(await M2.F.locator('#pane').innerText()), 'a aba Mapa diz que o mostrado é de outra campanha');
    await semAvisos(M2);
    ok(await A(M2, r => __mundo.App.trocarMapa(r), id.reino) === false && /Este mapa é da campanha Geração do Dain: para abri-lo, troque de campanha no menu da mesa\./.test(await avisos(M2)), 'abrir (por um atalho) um mapa da campanha A com a B em vista: o aviso manda trocar de campanha: ' + await avisos(M2));
    id.lira = await novoMapa(M2, 'Vale ' + SEG_B);
    ok(await ate(() => mesmas((doc(PRE_MAPA + id.lira) || {}).campanhas, ['cb'])), 'o mapa criado com a B em vista é da B');
    ok(await ate(async () => !(await lista(M)).includes('Vale ' + SEG_B)) && !(await lista(M)).includes('Vale ' + SEG_B), 'e não entra na lista do mestre com a A em vista');
  });

  await passo('mostrar um mapa da outra campanha: quem não o recebe continua onde está', async () => {
    await A(M2, c => __mundo.App.trocarMapa(c), id.copia);
    await A(M2, () => __mundo.App.mostrarAosJogadores());
    ok(await ate(() => doc(INDICE).dados.mostrado === id.copia), 'o índice passa a apontar o mapa da B');
    ok(j(doc(INDICE).dados.mapas) === j([{ id: id.mundo, nome: 'Mundo conhecido' }]), 'e continua só com o nome do mapa do mundo');
    ok(await ate(async () => (await aberto(JB)) === 'Cópia ' + SEG_B) && /O mestre mostrou: Cópia/.test(await avisos(JB)), 'o jogador da B é levado ao mapa mostrado');
    await espera(600);
    ok(await aberto(JA) === 'Reino ' + SEG_A && await A(JA, () => __mundo.App.mostrado === null), 'o jogador da A continua no mapa dele (para ele, nenhum está sendo mostrado)');
    ok(await aberto(JN) === 'Mundo conhecido' && !(await entregue(JN)).includes(SEG_B) && !(await entregue(JA)).includes('Vale'), 'e nada da B chegou a quem não é dela');
    ok(await ate(() => A(M, () => __mundo.App.mostradoDeFora())), 'no aparelho com a A em vista, o mostrado agora é "de outra campanha"');
  });

  /* ================= 7. um mapa em duas campanhas; quem joga nas duas ================= */
  await passo('um mapa pode ser de duas campanhas', async () => {
    await A(M, r => __mundo.App.trocarMapa(r), id.reino);
    await semAvisos(M);
    await campanhasDoMapa(M, ['ca', 'cb']);
    ok(await ate(() => mesmas(doc(PRE_MAPA + id.reino).campanhas, ['ca', 'cb']) && mesmas(doc(PRE_PUB + id.reino).campanhas, ['ca', 'cb'])), 'o mapa e a projeção passam a ser das duas');
    ok(/agora é das campanhas Geração do Dain e Geração da Lira\./.test(await avisos(M)), 'o aviso: ' + await avisos(M));
    ok((await menu(M)).includes('· Reino ' + SEG_A + ' [em 2 campanhas]'), 'o menu do mestre marca o mapa que está em duas campanhas: ' + j(await menu(M)));
    ok(await ate(async () => (await lista(JB)).includes('Reino ' + SEG_A)) && await aberto(JB) === 'Cópia ' + SEG_B, 'o jogador da B passa a ter o mapa na lista (e continua no que o mestre mostra)');
    ok(await ate(async () => (await lista(M2)).includes('Reino ' + SEG_A)), 'e ele entra na lista do mestre com a B em vista');
    ok(!(await entregue(JN)).includes(SEG_A), 'quem não tem campanha continua sem ele');
    // agora o atalho do mapa do mundo para o Reino continua fora da projeção: o Reino não é de TODOS (não é do mundo)
    ok(doc(PRE_PUB + id.mundo).dados.objs.find(x => x.nome === 'Passagem').liga === null, 'o atalho do mapa do mundo para ele continua fora da projeção (ele não é do mundo)');
    // e um atalho de um mapa só da B para ele vale: todos os que veem aquele veem este
    await A(M2, ([c, r]) => { __mundo.App.trocarMapa(c); const N = __mundo.N; __mundo.App.mudar('novo marcador', m => { m.objs.push(N.objNovo('m', { x: 150, y: 150, nome: 'Ponte', liga: { t: 'mapa', id: r, nome: 'Reino' } })); }); }, [id.copia, id.reino]);
    ok(await ate(() => { const s = doc(PRE_PUB + id.copia).dados.objs.find(x => x.nome === 'Ponte'); return !!s && !!s.liga && s.liga.id === id.reino; }), 'o atalho de um mapa da B para um mapa que é da A e da B vai na projeção');
    // tirado da B, o atalho some da projeção do mapa da B junto
    await campanhasDoMapa(M, ['ca']);
    ok(await ate(() => mesmas(doc(PRE_PUB + id.reino).campanhas, ['ca']) && doc(PRE_PUB + id.copia).dados.objs.find(x => x.nome === 'Ponte').liga === null), 'de volta só à A: o atalho do mapa da B para ele sai da projeção');
    ok(await ate(async () => !(await lista(JB)).includes('Reino ' + SEG_A)), 'e ele sai da lista do jogador da B');
  });

  const JAB = await naCasca('jog-AB', 'jogador', 'u_ab', { minhas: ['ca', 'cb'], camp: 'cb' });
  await passo('quem joga nas duas vê os mapas da campanha em vista (e os do mundo)', async () => {
    ok(await A(JAB, () => __mundo.App.campanha() === 'cb' && __mundo.App.campanhas().length === 2), 'ele participa das duas e está com a B em vista');
    ok(j(await lista(JAB)) === j(['Cópia ' + SEG_B, 'Mundo conhecido']), 'a lista dele: os da B (à vista dos jogadores) e os do mundo: ' + j(await lista(JAB)));
    ok(await aberto(JAB) === 'Cópia ' + SEG_B, 'e abre no mapa que o mestre mostra (que é da B)');
    ok((await entregue(JAB)).includes(SEG_A), '(os mapas da A chegam ao aparelho dele — ele participa dela —, só não entram na lista da B)');
  });

  /* ================= 8. apagar e desfazer; nada foi gravado por jogador ================= */
  await passo('apagar um mapa de campanha e desfazer: ele volta na mesma campanha', async () => {
    await A(M, c => __mundo.App.trocarMapa(c), id.reino);
    await semAvisos(M);
    await A(M, () => __mundo.App.apagarMapa());
    ok(await ate(() => !doc(PRE_MAPA + id.reino) && !doc(PRE_PUB + id.reino)), 'apagado: o mapa e a projeção saem da mesa');
    ok(await ate(async () => !(await lista(JA)).includes('Reino ' + SEG_A)), 'e ele sai da lista do jogador da A');
    await M.F.locator('#toasts .toast button', { hasText: 'Desfazer' }).click(); await espera(400);
    ok(await ate(() => { const d = doc(PRE_MAPA + id.reino), p = doc(PRE_PUB + id.reino); return !!d && mesmas(d.campanhas, ['ca']) && !!p && mesmas(p.campanhas, ['ca']); }), '"Desfazer" traz o mapa de volta na campanha A (com a projeção dela)');
    ok(await ate(async () => (await lista(JA)).includes('Reino ' + SEG_A)), 'e ele volta à lista do jogador da A');
  });

  /* ================= o mestre auxiliar: mestra os mapas da campanha, mas não diz de que campanha é cada um ================= */
  await passo('o mestre auxiliar não passa mapa de uma campanha para outra', async () => {
    const X = await naCasca('auxiliar-A', 'mestre', 'u_aux', { camp: 'ca', cargo: 'auxiliar' });
    ok(await A(X, () => __mundo.App.papel === 'mestre' && __mundo.App.organizaCampanhas() === false && !!__mundo.App.mapa), 'no Mapa-múndi ele mestra (tem um mapa da campanha aberto), mas não organiza as campanhas');
    const k = await A(X, () => __mundo.App.mapa.id), nome0 = await aberto(X), campsAntes = j((doc(PRE_MAPA + k) || {}).campanhas || []);
    await X.F.click('#btMapa'); await espera(150);
    ok(!/Campanhas deste mapa/.test(await X.F.locator('#menuMapas').innerText()), 'o menu de mapas dele não oferece "Campanhas deste mapa…"');
    await X.P.keyboard.press('Escape');
    await X.F.click('#tab-mapa'); await espera(150);
    ok(await X.F.locator('#pane [data-k="mapa:campanhas"]').count() === 0, 'nem a aba Mapa (que continua dizendo de que campanha o mapa é)');
    ok(await A(X, () => __mundo.App.definirCampanhas(null, ['cb'])) === false && j(doc(PRE_MAPA + k).campanhas || []) === campsAntes, 'e, pedido por dentro, nada muda');
    // mexer num mapa que já existe: a gravação não diz a campanha (o banco recusaria a gravação inteira se ela viesse diferente)
    const n0 = await casca(X, () => window.__gravacoes.length);
    await A(X, n => __mundo.App.renomearMapa(n + ' (aux)'), nome0);
    ok(await ate(() => (doc(PRE_MAPA + k).dados || {}).nome === nome0 + ' (aux)'), 'ele renomeia o mapa (mestrar o mapa é com ele)');
    await espera(500);
    let gravs = await casca(X, n => window.__gravacoes.slice(n), n0);
    ok(gravs.some(g => g.id === PRE_MAPA + k) && gravs.filter(g => g.id.startsWith(PRE_MAPA)).every(g => !('campanhas' in g.campos)) && j(doc(PRE_MAPA + k).campanhas || []) === campsAntes,
      'a gravação do mapa não leva a coluna das campanhas, e o mapa continua nas mesmas: ' + j(gravs.filter(g => g.id.startsWith(PRE_MAPA)).map(g => Object.keys(g.campos))));
    await A(X, n => __mundo.App.renomearMapa(n), nome0); await ate(() => (doc(PRE_MAPA + k).dados || {}).nome === nome0);
    // um mapa novo nasce na campanha em vista (criar é mestrar dentro dela)
    const novo = await A(X, () => __mundo.App.criarMapa('Do auxiliar', { larg: 800, alt: 600 }).id);
    ok(await ate(() => mesmas((doc(PRE_MAPA + novo) || {}).campanhas, ['ca'])), 'o mapa que ele cria nasce na campanha em vista');
    await A(X, id => __mundo.App.apagarMapa(id), novo); await espera(400);
    await X.P.close();
  });

  await passo('fim: jogador nenhum gravou; o que é de uma campanha não chegou a quem não é dela', async () => {
    for (const x of [JA, JB, JN, JAB]) ok(await casca(x, () => window.__gravacoes.length) === 0, x.nome + ': não mandou nenhum dados.gravar');
    ok(!(await entregue(JN)).includes(SEG_A) && !(await entregue(JN)).includes(SEG_B), 'quem não tem campanha nunca recebeu nada das campanhas A e B');
    ok(!(await entregue(JA)).includes('Vale ' + SEG_B), 'o jogador da A nunca recebeu o mapa criado na B');
    const fora = [...banco.documentos.values()].filter(l => l.id.startsWith(PRE_PUB) && !mesmas(l.campanhas || [], (doc(PRE_MAPA + l.id.slice(PRE_PUB.length)) || {}).campanhas || ['?']));
    ok(fora.length === 0, 'toda projeção tem as mesmas campanhas do mapa dela' + (fora.length ? ': ' + fora.map(l => l.id + ' ' + j(l.campanhas)).join(', ') : ''));
    const noIndice = doc(INDICE).dados.mapas.map(m => m.id), deCampanha = noIndice.filter(k => ((doc(PRE_MAPA + k) || {}).campanhas || []).length > 0);
    ok(deCampanha.length === 0, 'no índice só há mapas do mundo');
  });

  /* ================= 9. uma mesa sem campanhas não ganha coluna nem rótulo ================= */
  await passo('mesa sem campanhas: nada muda', async () => {
    banco.documentos.clear(); banco.log.length = 0;
    const S = await naCasca('mestre-sem', 'mestre', 'u_mestre', { semCampanhas: true });
    ok(await A(S, () => __mundo.App.campanha() === null && __mundo.App.campanhas().length === 0), 'sem campanhas: nenhuma em vista');
    await S.F.fill('#vazio [data-k="vz:nome"]', 'Mapa simples');
    await S.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    const k = await A(S, () => __mundo.App.mapa.id);
    await A(S, () => __mundo.App.mostrarAosJogadores()); await espera(300);
    const d = doc(PRE_MAPA + k), p = doc(PRE_PUB + k), i = doc(INDICE);
    ok(!!d && !('campanhas' in d) && !!p && !('campanhas' in p) && !('campanhas' in i), 'os documentos não levam a coluna das campanhas');
    ok(j(i.dados) === j({ mapas: [{ id: k, nome: 'Mapa simples' }], mostrado: k }), 'o índice é o de sempre: ' + j(i.dados));
    ok(j(await A(S, () => __mundo.App.mapas)) === j([{ id: k, nome: 'Mapa simples', oculto: false }]), 'a lista é a de sempre (sem campanhas em cada item)');
    ok(j(await menu(S)) === j(['# Mapas', '· Mapa simples [mostrando]']), 'o menu é o de sempre: ' + j(await menu(S)));
    await S.F.click('#btMapa'); await espera(150);
    ok(!/Campanhas deste mapa/.test(await S.F.locator('#menuMapas').innerText()), 'sem "Campanhas deste mapa…" no menu');
    await S.P.keyboard.press('Escape');
    await S.F.click('#tab-mapa'); await espera(150);
    ok(!/campanha/i.test(await S.F.locator('#pane').innerText()), 'e a aba Mapa não fala em campanha');
    ok(/Os jogadores agora veem: Mapa simples/.test(await avisos(S)), 'o aviso de mostrar é o de sempre: ' + await avisos(S));
  });

  await Promise.all(pendentes);
  if (t.errs.length) console.log('CONSOLE:\n' + t.errs.join('\n'));
  ok(t.errs.length === 0, 'nenhum erro (nem aviso) no console em todo o teste');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
