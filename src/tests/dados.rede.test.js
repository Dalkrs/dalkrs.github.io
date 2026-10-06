// "Dados", numa mesa de verdade (projeto real): a telinha de dados da mesa ao vivo, o som e o efeito das rolagens,
// a iniciativa que o mestre anota na ordem de turnos e o auditor dos dados (no Rolador).
//   · o jogador rola pela ficha sem digitar comando: atributo com fixa e iniciativa; o mestre, por qualquer ficha;
//   · cada rolagem guarda os dados que sorteou (dd), para o auditor;
//   · som e efeito: uma chave para cada um, por aparelho, valendo para as rolagens de todos;
//   · nada é anotado sozinho na ordem de turnos: o mestre é quem aceita.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const R = require('../../tc/rules.js');
const { ok, end } = checker();
const ficha = (nome, extra) => Object.assign({ nome, raca: 'Elfa da neve', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 5, fonte: 'total' }, ini: 'AGI/5', disputa: {}, estaque: { a: '', b: '' }, habilidades: [], itens: [], notas: '', recursos: [{ id: 'hp', nome: 'HP', fml: '100' }] }, extra);
const selene = ficha('Selene'), goblin = ficha('Goblin batedor', { lado: 'Inimigo', level: 1, ini: '1' });
/* um som de mentira: conta as batidas (cada som da mesa são quatro) */
const somFalso = () => {
  window.__batidas = 0;
  class FalsoAudio {
    constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; }
    createGain() { return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    createBuffer(c, n) { return { getChannelData() { return new Float32Array(n); } }; }
    createBufferSource() { return { connect() {}, start() { window.__batidas++; }, stop() {} }; }
    createBiquadFilter() { return { frequency: { value: 0 }, Q: { value: 0 }, connect() {} }; }
    resume() { return Promise.resolve(); }
  }
  window.AudioContext = FalsoAudio;
};
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const dM = await t.device({ name: 'mestre', seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } }), M = dM.page;
  const dJ = await t.device({ name: 'jogador', w: 1250, h: 820, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } }), J = dJ.page;
  await dM.ctx.addInitScript(somFalso); await dJ.ctx.addInitScript(somFalso);
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 60) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const rolagens = p => p.evaluate(() => TC.aoVivo.itens.filter(l => l.tipo === 'rolagem').map(l => ({ id: l.id, autor: l.autor_nome, secreta: l.secreta, d: l.dados })));
  const ultima = async p => (await rolagens(p)).pop();
  const botoes = p => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#dadosBotoes button[data-k]')].map(b => [b.dataset.k, b.querySelector('b').textContent])));
  const batidas = p => p.evaluate(() => window.__batidas);
  const cartao = (p, id) => p.evaluate(id => { const el = document.querySelector('#feed [data-id="' + CSS.escape(id) + '"]'); return el ? el.className : null; }, id);

  // ---------- a mesa, as fichas ----------
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Dados E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {      // (se algo quebrar no meio, a mesa de teste é apagada do mesmo jeito: ver o "finally")
  ok(await M.evaluate(() => document.getElementById('dados').hidden), 'numa mesa sem fichas, a telinha de dados não aparece');
  await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
  await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
  const jogId = await J.evaluate(() => TC.conta.usuario.id);
  ok(await J.evaluate(() => document.getElementById('dados').hidden), 'o jogador sem personagem também não vê a telinha');
  await M.evaluate(([f, g, uid]) => { const P = TC.dados.col('personagens'); P.gravar('pc_selene', { nome: 'Selene', ficha: f, skills: { arvores: [], pontos: {}, alocados: {} }, estado: {}, dono_id: uid, vis: 'mesa', ordem: 0 }); P.gravar('pc_gob', { nome: 'Goblin batedor', ficha: g, skills: { arvores: [], pontos: {}, alocados: {} }, estado: {}, dono_id: null, vis: 'mestre', ordem: 1 }); }, [selene, goblin, jogId]);
  ok(await ate(() => M.evaluate(() => TC.dados.pendentes === 0)), '(as fichas sobem para a mesa)');

  // ---------- a telinha do jogador ----------
  ok(await ate(() => J.evaluate(() => !document.getElementById('dados').hidden && document.querySelectorAll('#dadosBotoes button[data-k]').length === 11)), 'o mestre entrega uma ficha: a telinha de dados aparece para o jogador, sem recarregar');
  const esperado = (() => { const cc = R.calcular(Object.assign({}, selene, { id: 'pc_selene' }), R.cfgPadrao(), {}); const o = {}; for (const k of ['FOR', 'DES', 'VIT', 'CAN', 'AGI', 'ESQ', 'FUR', 'PER', 'DFF', 'DFM']) o[k] = String(Math.round(R.valorDoAtributo(cc, k, 'total'))); o.INI = '1d20 + ' + R.iniciativa(Object.assign({}, selene, { id: 'pc_selene' }), R.cfgPadrao(), {}).val; return o; })();
  const vistos = await botoes(J);
  ok(JSON.stringify(vistos) === JSON.stringify(esperado), 'os números são os da ficha (as mesmas contas): ' + JSON.stringify(vistos) + ' × ' + JSON.stringify(esperado));
  ok(await J.evaluate(() => !document.getElementById('dadosCorpo').hidden && document.getElementById('dadosFixa').value === '5' && [...document.querySelectorAll('#dadosPc option')].map(o => o.textContent).join() === 'Selene' && document.getElementById('dadosQuem').textContent.includes('Selene')),
    'para o jogador a telinha já vem aberta, com o personagem dele e a fixa da ficha (5); só os personagens dele estão na lista');
  const FOR = Number(esperado.FOR);
  ok(await J.evaluate(v => document.querySelector('#dadosBotoes button[data-k="FOR"]').title === 'Força ' + v + ' — 1d' + (v - 5) + ' + 5', FOR), 'cada botão diz o que vai rolar (Força ' + FOR + ' — 1d' + (FOR - 5) + ' + 5)');

  // ---------- rolar um atributo: chega a todos, com os dados guardados ----------
  await J.locator('#dadosBotoes button[data-k="FOR"]').click();
  ok(await ate(async () => (await rolagens(M)).length === 1), 'o jogador clica em FOR: a rolagem chega à mesa do mestre');
  let r = await ultima(M);
  ok(r.autor === 'Dalmo' && r.d.titulo === 'Selene · Força' && r.d.k === 'fixa' && r.d.como === 'Selene' && r.d.total >= 6 && r.d.total <= FOR && JSON.stringify(r.d.dd) === JSON.stringify([[FOR - 5, r.d.total - 5]]) && r.d.resumo.includes('no d' + (FOR - 5)),
    'a linha diz de quem é ("Selene · Força"), o total cabe na regra da fixa e os dados ficam guardados (dd): ' + JSON.stringify(r.d));
  ok(/\brolou\b/.test(await cartao(M, r.id)) && await batidas(M) === 0, 'no aparelho do mestre a rolagem chega com o efeito (ligado de início) e sem som (desligado de início)');
  ok(await M.evaluate(() => document.getElementById('chaveSom').getAttribute('aria-pressed') === 'false' && document.getElementById('chaveEfeito').getAttribute('aria-pressed') === 'true' && /desligado neste aparelho/.test(document.getElementById('chaveSom').title)), 'as duas chaves ficam no topo da mesa ao vivo, e dizem como estão');

  // ---------- som e efeito: uma chave para cada um, por aparelho ----------
  await M.locator('#chaveSom').click(); await w(300);
  ok(await batidas(M) === 4 && await M.evaluate(() => localStorage.getItem('tinycats:som') === '1' && document.getElementById('chaveSom').getAttribute('aria-pressed') === 'true'), 'o mestre liga o som: toca uma amostra, e a escolha fica guardada neste aparelho');
  await J.locator('#dadosBotoes button[data-k="DES"]').click();
  ok(await ate(async () => (await rolagens(M)).length === 2 && (await batidas(M)) === 8), 'a rolagem seguinte do jogador toca no aparelho do mestre');
  ok(await batidas(J) === 0, 'e não no do jogador, que não ligou o som (cada aparelho tem a sua chave)');
  await M.locator('#chaveEfeito').click(); await w(300);
  await J.locator('#dadosBotoes button[data-k="AGI"]').click();
  ok(await ate(async () => (await rolagens(M)).length === 3 && (await batidas(M)) === 12), '(mais uma rolagem, com o efeito desligado no aparelho do mestre)');
  r = await ultima(M);
  ok(!/\brolou\b/.test(await cartao(M, r.id)) && /\bnovo\b/.test(await cartao(M, r.id)) && /\brolou\b/.test(await cartao(J, r.id)), 'sem a chave do efeito, o cartão chega sem ele no aparelho do mestre; no do jogador, que a deixou ligada, com ele');
  // várias rolagens juntas (a iniciativa de todos, por exemplo): um som só
  const antes = await batidas(M);
  await J.evaluate(async () => { const pc = TC.aoVivo.personagem('pc_selene'); await Promise.all([TC.aoVivo.rolarAtributo(pc, 'Um', 20, 0), TC.aoVivo.rolarAtributo(pc, 'Dois', 20, 0), TC.aoVivo.rolarAtributo(pc, 'Três', 20, 0)]); });
  ok(await ate(async () => (await rolagens(M)).length === 6), '(três rolagens no mesmo instante)');
  await w(800);
  ok(await batidas(M) - antes === 4, 'três rolagens chegando juntas tocam um som só: ' + ((await batidas(M)) - antes) / 4);
  await M.locator('#chaveEfeito').click(); await w(200);       // (o efeito volta a ficar ligado)

  // ---------- a fixa da telinha é deste aparelho: não muda a ficha ----------
  await J.locator('#dadosFixa').fill('0'); await w(300, J);
  ok(await J.evaluate(v => document.querySelector('#dadosBotoes button[data-k="FOR"]').title === 'Força ' + v + ' — 1d' + v, FOR), 'o jogador zera a fixa na telinha: o botão passa a dizer 1d' + FOR);
  await J.locator('#dadosBotoes button[data-k="FOR"]').click();
  ok(await ate(async () => (await rolagens(M)).length === 7), '(rolagem sem fixa)');
  r = await ultima(M);
  ok(r.d.dd[0][0] === FOR && r.d.total === r.d.dd[0][1] && /sem fixa/.test(r.d.resumo), 'a rolagem sai com o dado inteiro: ' + JSON.stringify(r.d.dd) + ' · ' + r.d.resumo);
  await w(1500);
  ok(await M.evaluate(() => TC.dados.col('personagens').pegar('pc_selene').ficha.rol.fixa === 5) && await J.evaluate(() => TC.dados.pendentes === 0), 'e a fixa da ficha continua 5: a da telinha fica só neste aparelho');
  await J.locator('#dadosFixa').fill(''); await w(300, J);
  ok(await J.evaluate(v => document.querySelector('#dadosBotoes button[data-k="FOR"]').title === 'Força ' + v + ' — 1d' + (v - 5) + ' + 5' && document.getElementById('dadosFixa').placeholder === '5', FOR), 'com o campo vazio, vale a fixa da ficha de novo');
  await J.locator('#dadosFixa').fill('3'); await w(300, J);

  // ---------- os números acompanham a ficha na hora ----------
  await M.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_selene'); P.gravar('pc_selene', { estado: Object.assign({}, l.estado, { tmp: { b1: { n: 'Bênção', k: 'FOR', v: 7, t: 1 } } }) }); });
  ok(await ate(async () => (await botoes(J)).FOR === String(FOR + 7), 15000), 'o mestre dá um bônus temporário de +7 em Força: o botão da telinha do jogador passa a ' + (FOR + 7) + ', sem recarregar');
  await M.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_selene'); P.gravar('pc_selene', { estado: Object.assign({}, l.estado, { tmp: {} }) }); });
  ok(await ate(async () => (await botoes(J)).FOR === String(FOR), 15000), '(e volta quando o bônus sai)');

  // ---------- recarregando, a telinha lembra o que a pessoa deixou ----------
  await J.reload({ waitUntil: 'load' });
  ok(await ate(() => J.evaluate(() => !document.getElementById('dados').hidden && document.querySelectorAll('#dadosBotoes button[data-k]').length === 11 && document.getElementById('dadosFixa').value === '3'), 30000), 'depois de recarregar, a telinha volta com a fixa que o jogador tinha deixado (3)');

  // ---------- as Cenas do mestre: a iniciativa do jogador pode ser anotada na ordem de turnos ----------
  await M.locator('#tab-cenas').click();
  let C = null;
  ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'mestre' && __tc.Fichas.on() && !!__tc.Fichas.get('pc_selene') && __tc.Store.S.players.length > 0); }, 40000), '(o mestre está nas Cenas, com as fichas da mesa)');
  const tok = await C.evaluate(() => { const u = __tc, sc = u.Store.scene(); const a = u.newToken(sc, sc.cell * 3, sc.cell * 3, { name: 'Boneco' }), b = u.newToken(sc, sc.cell * 5, sc.cell * 3, { name: 'Guarda' }); u.Store.tx('Criar', () => { u.Store.add('tokens', a); u.Store.add('tokens', b); }); u.Fichas.link(u.Store.get('tokens', a.id), 'pc_selene'); u.Act.turnAdd([u.Store.get('tokens', a.id), u.Store.get('tokens', b.id)]); u.UI.openTab('turn'); return { a: a.id, b: b.id }; });
  await w(600);
  ok(await C.locator('.turn').count() === 2 && await C.locator('.turn-mesa').count() === 0, 'a ordem de turnos tem os dois tokens, sem iniciativa, e nada oferecido ainda');
  await J.locator('#dadosBotoes button[data-k="INI"]').click();
  ok(await ate(async () => { const u = await ultima(M); return u && u.d.k === 'iniciativa'; }), 'o jogador clica em Iniciativa: a rolagem chega à mesa');
  r = await ultima(M);
  const ini = Number(esperado.INI.replace('1d20 + ', ''));
  ok(r.d.titulo === 'Iniciativa · Selene' && r.d.dd[0][0] === 20 && r.d.dd[0][1] >= 1 && r.d.dd[0][1] <= 20 && r.d.total === r.d.dd[0][1] + ini && r.d.sis && r.d.sis.t === 'ini' && r.d.sis.c === 'pc_selene' && r.d.sis.v === r.d.total && r.d.resumo === '1d20 (' + r.d.dd[0][1] + ') + ' + ini,
    'é 1d20 + a iniciativa da ficha (' + ini + '), com o dado entre 1 e 20, e leva o recado para as Cenas: ' + JSON.stringify(r.d));
  ok(await ate(async () => (await C.locator('.turn-mesa').count()) === 1, 15000), 'nas Cenas do mestre aparece, ao lado do token dela na ordem de turnos, a iniciativa que ela rolou');
  ok((await C.locator('.turn-mesa').innerText()).trim() === String(r.d.total) && await C.evaluate(id => __tc.Store.scene().turn.list.find(e => e.token === id).init == null, tok.a) && (await C.locator('.toast', { hasText: 'Selene rolou iniciativa: ' + r.d.total }).count()) === 1,
    'com o valor dela (' + r.d.total + ') e um aviso — e nada foi anotado sozinho');
  await C.locator('.turn-mesa').click(); await w(400);
  ok(await C.evaluate(([id, v]) => { const e = __tc.Store.scene().turn.list.find(x => x.token === id); return e.init === v && !!e.roll && e.roll.d + e.roll.b === v && __tc.Store.scene().turn.list[0].token === id; }, [tok.a, r.d.total]) && await C.locator('.turn-mesa').count() === 0,
    'o mestre clica: a iniciativa fica anotada na entrada dela (com o dado e o bônus), a ordem é arrumada e a oferta some');
  await C.evaluate(() => __tc.Tools.undo()); await w(300);
  ok(await C.evaluate(id => __tc.Store.scene().turn.list.find(x => x.token === id).init == null, tok.a), 'e Desfazer tira a anotação');
  // o d20 da iniciativa vai de 1 a 20: com o sorteio do navegador trocado por um controlado, a face mais baixa e a mais alta
  {
    const forcada = v => J.evaluate(async v => {
      const real = Object.getOwnPropertyDescriptor(window.crypto, 'getRandomValues');
      window.crypto.getRandomValues = buf => { buf[0] = v; return buf; };
      let p; try { p = TC.aoVivo.rolarIniciativa(TC.aoVivo.personagem('pc_selene'), 2); } finally { if (real) Object.defineProperty(window.crypto, 'getRandomValues', real); else delete window.crypto.getRandomValues; }
      return p;      // (o dado é sorteado antes de a rolagem viajar: o sorteio de verdade já voltou)
    }, v);
    const baixa = await forcada(0), alta = await forcada(19);
    ok(baixa.d === 1 && baixa.total === 3 && alta.d === 20 && alta.total === 22, 'iniciativa pela telinha: o d20 vai de 1 (' + JSON.stringify(baixa) + ') a 20 (' + JSON.stringify(alta) + ')');
    ok(await ate(async () => { const u = await rolagens(M); return u.filter(l => l.d.k === 'iniciativa' && l.d.sis).length === 3; }), '(as duas chegam à mesa)');
    await w(600);
    await C.evaluate(() => { __tc.App.iniRolls.clear(); __tc.UI.refresh(); });      // (o mestre não usa essas ofertas: a próxima parte começa sem nenhuma)
  }
  // quem não é o dono da ficha não consegue mandar iniciativa por ela
  // (o token do Guarda passa a seguir a ficha do Goblin, que é do mestre, e já está na ordem de turnos)
  await C.evaluate(() => { const u = __tc, sc = u.Store.scene(); const g = sc.tokens.find(k => k.name === 'Guarda'); u.Fichas.link(g, 'pc_gob'); }); await w(600);
  await J.evaluate(() => TC.aoVivo.rolagem({ k: 'iniciativa', titulo: 'Iniciativa · Goblin', total: 21, resumo: '1d20 (20) + 1', sis: { t: 'ini', c: 'pc_gob', v: 21, d: 20, b: 1 } }, { quem: null }));
  ok(await ate(async () => (await ultima(M)).d.titulo === 'Iniciativa · Goblin'), '(o jogador manda, à mão, uma "iniciativa" em nome da ficha de um NPC)');
  await w(2500);
  ok(await C.locator('.turn-mesa').count() === 0 && await C.evaluate(() => !__tc.App.iniRolls.has('pc_gob')), 'as Cenas do mestre não oferecem nada: quem rolou não é o dono daquela ficha');
  // (a mesma coisa, rolada pelo mestre na telinha dele, é oferecida: o que barrou acima foi quem rolou)
  await M.evaluate(() => TC.aoVivo.rolarIniciativa(TC.aoVivo.personagem('pc_gob'), 1));
  ok(await ate(async () => (await C.locator('.turn-mesa').count()) === 1 && await C.evaluate(() => __tc.App.iniRolls.has('pc_gob')), 15000), 'já a iniciativa que o próprio mestre rola pelo Goblin é oferecida ao lado do token dele');
  await C.evaluate(() => { __tc.App.iniRolls.clear(); __tc.UI.refresh(); });

  // ---------- a telinha do mestre: recolhida de início, todas as fichas, e o "em segredo" vale ----------
  ok(await M.evaluate(() => !document.getElementById('dados').hidden && document.getElementById('dadosCorpo').hidden && document.getElementById('dadosAbre').getAttribute('aria-expanded') === 'false'), 'para o mestre a telinha começa recolhida (uma linha só, acima do campo de mensagem)');
  await M.locator('#dadosAbre').click(); await w(300);
  ok(await M.evaluate(() => !document.getElementById('dadosCorpo').hidden && [...document.querySelectorAll('#dadosPc option')].map(o => o.textContent).join('|') === 'Selene|Goblin batedor'), 'aberta, lista todas as fichas da mesa');
  await M.locator('#dadosPc').selectOption({ label: 'Goblin batedor' }); await w(300);
  await M.locator('#segredo').click(); await w(300);
  ok(await ate(async () => (await rolagens(J)).some(l => l.autor === 'Bruno' && l.d.k === 'iniciativa' && l.d.sis && l.d.sis.c === 'pc_gob')), '(a iniciativa que o mestre rolou às claras pelo Goblin chegou ao jogador)');
  const nAntes = (await rolagens(J)).length;
  await M.locator('#dadosBotoes button[data-k="FOR"]').click();
  ok(await ate(async () => { const u = await ultima(M); return u && u.d.titulo === 'Goblin batedor · Força' && u.secreta === true; }), 'o mestre rola pelo Goblin com "Em segredo" ligado: a rolagem é secreta');
  await w(5000, J);
  ok((await rolagens(J)).length === nAntes, 'e o jogador não a recebe');
  await M.locator('#segredo').click(); await w(200);
  await M.reload({ waitUntil: 'load' });
  ok(await ate(() => M.evaluate(() => !document.getElementById('dados').hidden && !document.getElementById('dadosCorpo').hidden && document.getElementById('dadosPc').value === 'pc_gob' && document.getElementById('chaveSom').getAttribute('aria-pressed') === 'true'), 30000), 'recarregando, a telinha do mestre continua aberta, no Goblin, e o som continua ligado');

  // ---------- todo caminho de rolagem guarda os dados que sorteou (dd) ----------
  {
    const comDd = async (que, achar, conf) => {
      let l = null;
      const chegou = await ate(async () => { l = (await rolagens(M)).filter(achar).pop(); return !!l; }, 20000);
      const dd = l && l.d.dd, forma = Array.isArray(dd) && dd.length > 0 && dd.every(x => Array.isArray(x) && x.length === 2 && Number.isInteger(x[0]) && Number.isInteger(x[1]) && x[1] >= 1 && x[1] <= x[0]);
      ok(chegou && forma && (!conf || conf(l.d)), que + ': ' + (l ? JSON.stringify({ dd, total: l.d.total, resumo: l.d.resumo }) : 'não chegou'));
    };
    // pelo chat da mesa
    await J.locator('#msg').fill('/r 2d6+3'); await J.locator('#msg').press('Enter');
    await comDd('/r 2d6+3 pelo chat', l => /^2d6 \+ 3 →/.test(l.d.resumo || ''), d => d.dd.length === 2 && d.dd.every(x => x[0] === 6) && d.total === d.dd[0][1] + d.dd[1][1] + 3);
    await J.locator('#msg').fill('/fixa 60 20'); await J.locator('#msg').press('Enter');
    await comDd('/fixa 60 20 pelo chat', l => /no d40 \+ 20 de fixa/.test(l.d.resumo || ''), d => d.dd.length === 1 && d.dd[0][0] === 40 && d.total === d.dd[0][1] + 20);
    // pela ficha: rolagem rápida, iniciativa (de 1 a 20) e disputa
    let F = null;
    ok(await ate(async () => { F = await quadro(J, /\/fichas\//); return F && (await F.locator('#ficha .rolbox [data-rolar="FOR"]').count()) === 1; }, 30000), '(o jogador está na ficha dele)');
    await F.locator('#ficha .rolbox [data-rolar="DES"]').click();
    await comDd('rolagem rápida da ficha', l => /^DES \d+ · 1d\d+/.test(l.d.resumo || ''), d => d.dd.length === 1 && d.total === d.dd[0][1] + 5);
    await F.locator('#btnIni').click();
    await comDd('iniciativa pela ficha', l => /^Iniciativa · 1d20 \(\d+\)/.test(l.d.resumo || '') && l.d.k === 'ficha' && !/\(0\)/.test(l.d.resumo), d => d.dd.length === 1 && d.dd[0][0] === 20 && d.total === d.dd[0][1] + ini && d.resumo.includes('(' + d.dd[0][1] + ')'));
    await F.locator('#btnDisputa').click(); await w(300, J);
    await F.locator('#disRolar').click(); await w(300, J);
    await comDd('disputa da ficha', l => /^Disputa · Selene/.test(l.d.titulo || ''), d => d.dd.length >= 1 && d.dd.length <= 2 && !!d.veredito);
    await F.locator('#disFechar').click(); await w(200, J);
    // pelas Cenas do mestre: atributo pelo token e iniciativa pela ordem de turnos
    await M.locator('#tab-cenas').click(); await w(500);
    C = await quadro(M, /\/cenas\//);
    await C.evaluate(id => { const u = __tc; u.Fichas.rolar(u.Store.get('tokens', id), 'AGI', 4); u.Act.turnRoll(u.Store.scene().turn.list.filter(e => e.token === id).map(e => e.id)); }, tok.a);
    await comDd('atributo pelo token (Cenas)', l => l.d.titulo === 'Selene · Agilidade' && /\+ 4 de fixa/.test(l.d.resumo || ''), d => d.dd.length === 1 && d.total === d.dd[0][1] + 4);
    await comDd('iniciativa pela ordem de turnos (Cenas)', l => l.d.k === 'iniciativa' && !l.d.sis && /^1d20 \(/.test(l.d.resumo || ''), d => d.dd[0][0] === 20 && d.total === d.dd[0][1] + ini);
  }

  // ---------- o auditor dos dados (Rolador, só o mestre) ----------
  ok(await J.evaluate(() => TC.aoVivo.historico().then(() => 'leu', e => e.message)) === 'Só o mestre abre o auditor dos dados.', 'o jogador não lê o histórico inteiro da mesa');
  await J.evaluate(() => TC.aoVivo.rolagem({ k: 'ficha', titulo: 'Selene', total: 2, resumo: 'Iniciativa · 1d20 (0) + 2' }, { origem: 'ficha', quem: null }));      // (uma rolagem como as do botão antigo da ficha)
  ok(await ate(async () => (await rolagens(M)).some(x => x.d.resumo === 'Iniciativa · 1d20 (0) + 2')), '(chega ao mestre uma rolagem como as do botão antigo da ficha: um zero num d20)');
  await M.locator('#tab-rolador').click();
  let Ro = null;
  ok(await ate(async () => { Ro = await quadro(M, /\/rolador\//); return Ro && (await Ro.locator('#saveStatus').innerText()).includes('Salvo na mesa'); }, 40000), '(o mestre abre o Rolador da mesa)');
  if (await Ro.locator('#bringDlg').evaluate(d => d.open)) { await Ro.locator('#bringDlg [data-close]').click(); await w(300); }
  await Ro.locator('#fAtr').fill('60'); await Ro.locator('#fFixa').fill('20'); await Ro.locator('#rollBtn').click();
  ok(await ate(async () => { const u = (await rolagens(M)).filter(l => /no d40 \+ 20 de fixa/.test(l.d.resumo || '')); return u.length === 2 && Array.isArray(u[1].d.dd) && u[1].d.dd[0][0] === 40 && u[1].d.total === u[1].d.dd[0][1] + 20; }, 20000), 'uma rolagem pelo Rolador do mestre também chega à mesa com os dados guardados');
  await Ro.locator('#menuBtn').click(); await w(250);
  await Ro.locator('#mainMenu .dd-item', { hasText: 'Auditor dos dados' }).click();
  ok(await ate(async () => (await Ro.locator('#audVeredito').count()) === 1, 20000), 'Menu → Auditor dos dados: a janela abre e lê as rolagens da mesa');
  const total = (await rolagens(M)).length;
  const intro = await Ro.locator('#audIntro').innerText();
  ok(new RegExp('\\b' + total + ' rolagens\\b').test(intro) && /dados conferidos/.test(intro), 'diz quantas rolagens leu (' + total + ', com a secreta do mestre): ' + intro.slice(0, 160));
  ok(await Ro.locator('#audVeredito').getAttribute('data-nivel') === 'pouco' && /poucas rolagens/.test(await Ro.locator('#audVeredito').innerText()), 'com tão poucas rolagens, o veredito é "ainda são poucas para julgar": ' + (await Ro.locator('#audVeredito').innerText()).replace(/\s+/g, ' ').slice(0, 200));
  ok(/1 dado trouxe um valor que ele não tem/.test(await Ro.locator('#audImpossiveis').innerText()) && /0 num d20 \(Dalmo, Fichas/.test(await Ro.locator('#audImpossiveis').innerText()), 'o zero num d20 é apontado como defeito, com quem rolou e de onde: ' + (await Ro.locator('#audImpossiveis').innerText()).replace(/\s+/g, ' ').slice(0, 220));
  ok(await Ro.locator('#audGrafico svg rect.aud-barra').count() === 10 && await Ro.locator('#audPessoas tbody tr').count() === 2 && (await Ro.locator('#audPessoa option').allInnerTexts()).some(x => /^Dalmo \(\d+\)$/.test(x)) && (await Ro.locator('#audDado option').allInnerTexts()).some(x => /^d20 \(\d+\)$/.test(x)),
    'o gráfico tem as dez faixas, a tabela tem uma linha por pessoa, e dá para escolher a pessoa e o dado');
  await Ro.locator('#audDado').selectOption({ label: (await Ro.locator('#audDado option').allInnerTexts()).find(x => /^d20 /.test(x)) }); await w(300);
  ok(await Ro.locator('#audGrafico svg rect.aud-barra').count() === 20 && /face do d20/.test(await Ro.locator('#audGrafico').innerText()), 'escolhendo o d20, o gráfico passa a ter uma barra por face');
  await Ro.locator('#audPessoas .aud-link', { hasText: 'Dalmo' }).click(); await w(300);
  ok(await Ro.locator('#audPessoa').inputValue() === jogId && await Ro.locator('#audPessoas tr.atual').count() === 1, 'clicando numa pessoa da tabela, o auditor mostra só as rolagens dela');
  const antesAud = (await rolagens(M)).length;
  await Ro.locator('#audDlg [data-close]').click(); await w(200);
  ok((await rolagens(M)).length === antesAud && await M.evaluate(() => TC.dados.pendentes === 0), 'o auditor só lê: nada foi escrito na mesa');

  // ---------- limpeza ----------
  await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await M.keyboard.press('Escape'); await M.evaluate(async () => { if (TC.mesas.atual) await TC.mesas.apagar(); }); } catch (e) { console.log('(a mesa de teste não pôde ser apagada: ' + String(e.message).split('\n')[0] + ')'); } }
  }
  const inesperados = t.errs.filter(e => !/WebSocket|realtime|ERR_|Failed to load resource/i.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 10).join('\n'));
  ok(inesperados.length === 0, 'sem erros inesperados no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
