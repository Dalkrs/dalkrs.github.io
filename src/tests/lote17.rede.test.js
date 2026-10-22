// Lote 17 numa mesa (rede): o mestre e dois jogadores (a facção dos jogadores é Aldar, em guerra com o Vale).
//   · quem joga vê a zona de guerra automática (pronta, na projeção), as setas da facção dele e a seta da marcha do
//     exército dele; a seta do Vale, só depois de o mestre mostrar;
//   · a caneta: o jogador desenha (o documento dele, "mundo:rabisco:<usuário>", que precisa do SQL 0020) e todos veem;
//     o mestre desenha com a que some, e ela some para todos; o outro jogador vê, não apaga o do primeiro (nem pelo banco),
//     e "Limpar os meus" só limpa o dele; o mestre limpa o de todos ("Limpar desenhos"), com Desfazer.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
const mapa = { id: 'mp_guerra', nome: 'Guerra do Vau', larg: 2000, alt: 1400, grade: { tam: 50, x: 25, y: 25 },
  faccoes: [{ id: 'fa', nome: 'Aldar', cor: '#3f7fbf', jog: true, rel: { fb: 'guerra' } }, { id: 'fb', nome: 'Vale', cor: '#c0503a' }],
  objs: [
    { k: 'r', id: 'r1', nome: 'Aldar', pts: [[0, 0], [1000, 0], [1000, 1400], [0, 1400]], fac: 'fa' },
    { k: 'r', id: 'r2', nome: 'Vale', pts: [[1000, 0], [2000, 0], [2000, 1400], [1000, 1400]], fac: 'fb' },
    { k: 'a', id: 'st_a', pts: [[600, 400], [900, 450], [1200, 400]], fac: 'fa' },
    { k: 'a', id: 'st_b', pts: [[1500, 900], [1200, 950], [900, 900]], fac: 'fb' },
    { k: 't', id: 't1', pts: [[300, 700], [900, 700], [1300, 900]], esc: true, oculto: true },
    { k: 'g', id: 'g1', nome: 'Hoste de Aldar', x: 300, y: 700, fac: 'fa', tipo: 'exercito', rota: 't1', seta: { ver: false } },
  ] };

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await entrar(d.page, c.jog2, c.senha, 'Bia'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', w: 1400, h: 900, seed: { 'tinycats:aba': 'fichas' } })).page;
  const J = (await t.device({ name: 'jog1', w: 1300, h: 900, seed: { 'tinycats:aba': 'mundo' } })).page;
  const K = (await t.device({ name: 'jog2', w: 1300, h: 900, seed: { 'tinycats:aba': 'mundo' } })).page;
  for (const p of [M, J, K]) p.setDefaultTimeout(10000);
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re) => { for (let i = 0; i < 80; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 15000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* a moldura pode estar recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const docM = (p, id) => p.evaluate(id => { const d = TC.dados.col('documentos').pegar(id); return d ? JSON.parse(JSON.stringify(d)) : null; }, id);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const foto = async (p, nome) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await p.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  // arrastar pelo mapa (em unidades do mapa), na moldura do Mapa-múndi da página p
  const arrastar = async (p, F, pts) => {
    const q = [];
    for (const [x, y] of pts) q.push(await F.evaluate(([x, y]) => { const z = window.MundoTela.zoom, r = document.querySelector('#mundo').getBoundingClientRect(); return [r.left + x * z, r.top + y * z]; }, [x, y]));
    const fr = await (await F.frameElement()).boundingBox();
    await p.mouse.move(fr.x + q[0][0], fr.y + q[0][1]); await p.mouse.down();
    for (const [x, y] of q.slice(1)) await p.mouse.move(fr.x + x, fr.y + y, { steps: 6 });
    await p.mouse.up(); await w(250, p);
  };
  const tracos = F => F.evaluate(() => __mundo.App.rabiscosDe(__mundo.App.mapa.id).map(x => ({ c: x.c, s: x.s })));
  // os traços desenhados no mapa (a camada da caneta, sem o traço que a pessoa está fazendo agora)
  const desenhados = F => F.evaluate(() => document.querySelectorAll('.c-rab .rab:not(.rab-vivo)').length);
  let MM = null, JM = null, KM = null, uJ = null, uK = null;

  await passo('a mesa, o mapa e os jogadores', async () => {
    await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
    await loginTela(M, c.mestre, c.senha);
    const codigo = await criarMesaTela(M, 'Lote 17 ' + Date.now().toString(36));
    await M.evaluate(m => TC.dados.col('documentos').gravar('mundo:mapa:' + m.id, { dados: m, vis: 'mestre' }), mapa);
    await M.locator('#tab-mundo').click();
    ok(await ate(async () => { MM = await quadro(M, /\/mundo\//); return MM && await MM.evaluate(() => !!window.__mundo && __mundo.App.pronto && !!__mundo.App.mapa && __mundo.App.mapa.id === 'mp_guerra') && !!(await docM(M, 'mundo:pub:mp_guerra')); }, 40000), '(o mestre abre o Mapa-múndi: a projeção vai para a mesa)');
    await MM.evaluate(() => __mundo.App.mostrarAosJogadores && __mundo.App.mostrarAosJogadores('mp_guerra')); await w(500);
    for (const [P, conta, nome] of [[J, c.jog1, 'Dalmo'], [K, c.jog2, 'Bia']]) {
      await P.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, P);
      await loginTela(P, conta, c.senha); await entrarMesaTela(P, codigo, nome);
    }
    ok(await ate(async () => { JM = await quadro(J, /\/mundo\//); KM = await quadro(K, /\/mundo\//); return !!JM && !!KM && await JM.evaluate(() => !!window.__mundo && __mundo.App.pronto && !!__mundo.App.mapa && __mundo.App.mapa.id === 'mp_guerra') && await KM.evaluate(() => !!window.__mundo && __mundo.App.pronto && !!__mundo.App.mapa); }, 40000), '(os dois jogadores entram e veem o mapa)');
    uJ = await JM.evaluate(() => __mundo.App.eu); uK = await KM.evaluate(() => __mundo.App.eu);
    ok(!!uJ && !!uK && uJ !== uK, '(cada um com o seu usuário)');
  });

  await passo('o que o jogador vê da guerra', async () => {
    ok(await ate(async () => JM.evaluate(() => document.querySelectorAll('.c-zag .zag-hex').length > 0 && document.querySelectorAll('.c-zag .zag-front').length > 0)), 'a zona de guerra automática e a linha do front (prontas, na projeção)');
    const v = await JM.evaluate(() => ({ a: !!document.querySelector('.c-set [data-id="st_a"]'), b: !!document.querySelector('.c-set [data-id="st_b"]'), marcha: !!document.querySelector('.c-setg [data-de="g1"]'), rota: !!document.querySelector('[data-id="t1"]') }));
    ok(v.a && !v.b && v.marcha && !v.rota, 'a seta da facção dele e a da marcha do exército dele (sem a rota escondida); a do Vale, não: ' + j(v));
    await MM.evaluate(() => __mundo.App.mudar('mostrar', m => { m.objs.find(o => o.id === 'st_b').ver = true; }));
    ok(await ate(async () => JM.evaluate(() => !!document.querySelector('.c-set [data-id="st_b"]'))), 'o mestre mostra a seta do Vale: ela aparece para o jogador');
    await foto(J, 'l17-jogador-guerra');
  });

  await passo('a caneta de quem joga', async () => {
    ok(await JM.locator('#zCaneta').isVisible() && !(await JM.locator('#rail').isVisible()), 'quem joga tem a caneta no canto do mapa (sem o trilho do mestre)');
    await JM.locator('#zCaneta').click(); await w(200, J);
    await JM.locator('#opts .chip', { hasText: 'Fica até limpar' }).click(); await w(150, J);
    ok(!(await JM.locator('#opts .chip', { hasText: 'Limpar desenhos' }).count()), '(só quem mestra tem "Limpar desenhos")');
    await arrastar(J, JM, [[300, 300], [450, 330], [600, 300]]);
    ok(await ate(async () => { const d = await docM(J, 'mundo:rabisco:' + uJ); return !!d && d.vis === 'mesa' && d.dono_id === uJ && d.dados.t.length === 1 && await parado(J); }), 'o traço vai para o documento dele, na mesa (dele, que a mesa inteira lê) — precisa do SQL 0020');
    ok(await ate(async () => (await tracos(MM)).length === 1 && (await tracos(KM)).length === 1 && await desenhados(MM) === 1 && await desenhados(KM) === 1), 'o mestre e o outro jogador veem o traço (desenhado no mapa deles, na hora)');
    const cor = (await tracos(MM))[0].c;
    ok(/^#[0-9a-f]{6}$/i.test(cor) && cor === (await tracos(JM))[0].c, '(na cor de quem desenhou: ' + cor + ')');
    await foto(M, 'l17-mestre-ve-caneta');
  });

  await passo('a caneta que some, do mestre', async () => {
    await MM.locator('#zCaneta').click(); await w(200);
    ok(await MM.locator('#opts .chip', { hasText: 'Some em segundos' }).getAttribute('aria-pressed') === 'true', '(o mestre na caneta que some)');
    await arrastar(M, MM, [[300, 1000], [600, 1050]]);
    ok(await ate(async () => (await tracos(JM)).some(x => x.s === 1)), 'o traço do mestre chega aos jogadores');
    ok(await ate(async () => !(await tracos(JM)).some(x => x.s === 1) && !(await tracos(MM)).some(x => x.s === 1), 20000), 'e some sozinho, para todos');
  });

  await passo('o outro jogador não apaga o traço do primeiro', async () => {
    await KM.locator('#zCaneta').click(); await w(200, K);
    ok(await KM.locator('#opts .chip', { hasText: 'Limpar os meus' }).isDisabled(), 'sem traços dele, "Limpar os meus" fica parado');
    await arrastar(K, KM, [[300, 500], [600, 520]]);
    await KM.locator('#opts .chip', { hasText: 'Fica até limpar' }).click(); await w(150, K);
    await arrastar(K, KM, [[300, 600], [600, 620]]);
    ok(await ate(async () => (await tracos(MM)).filter(x => x.s === 0).length === 2 && await parado(K)), '(a Bia desenha também: o mestre vê os dois traços que ficam)');
    await KM.locator('#opts .chip', { hasText: 'Limpar os meus' }).click(); await w(500, K);
    ok(await ate(async () => (await tracos(MM)).filter(x => x.s === 0).length === 1 && (await tracos(KM)).filter(x => x.s === 0).length === 1), '"Limpar os meus" só limpa os dela: o do Dalmo fica');
    // pelo banco, direto: o documento do Dalmo não é dela (nem para mudar, nem para criar um com o nome de outra pessoa)
    const mesa = await M.evaluate(() => TC.mesas.atual.id);
    const tenta = await K.evaluate(async ([mesa, id, idFalso]) => {
      const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave);
      const r = await a.from('documentos').update({ dados: { v: 1, t: [] } }).eq('mesa_id', mesa).eq('id', id).select('id');
      const n = await a.from('documentos').insert({ mesa_id: mesa, id: idFalso, dados: { v: 1, t: [] }, vis: 'mesa', dono_id: (await a.auth.getUser()).data.user.id }).select('id');
      const v = await a.from('documentos').insert({ mesa_id: mesa, id: 'mundo:rabisco:x' + Date.now(), dados: { v: 1, t: [] }, vis: 'mesa', dono_id: (await a.auth.getUser()).data.user.id }).select('id');
      return { mudou: (r.data || []).length, criouFalso: !n.error, criouOutro: !v.error };
    }, [mesa, 'mundo:rabisco:' + uJ, 'mundo:rabisco:' + uJ + 'x']);
    const d = await M.evaluate(async ([mesa, id]) => { const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave); const r = await a.from('documentos').select('dados').eq('mesa_id', mesa).eq('id', id).maybeSingle(); return r.data ? r.data.dados : null; }, [mesa, 'mundo:rabisco:' + uJ]);
    ok(tenta.mudou === 0 && !tenta.criouFalso && !tenta.criouOutro && d && d.t.length === 1, 'nem pelo banco direto: ela não muda a caneta de outra pessoa nem cria uma com outro nome: ' + j(tenta));
  });

  await passo('o mestre limpa os desenhos', async () => {
    await MM.locator('#opts .chip', { hasText: 'Limpar desenhos' }).click(); await w(400);
    ok(await ate(async () => (await tracos(JM)).length === 0 && (await tracos(KM)).length === 0 && await parado(M)), '"Limpar desenhos" (do mestre) apaga os de todos, para todos');
    await MM.locator('#toasts .toast', { hasText: 'desenhos deste mapa foram limpos' }).locator('button', { hasText: 'Desfazer' }).click();
    ok(await ate(async () => (await tracos(JM)).length === 1), 'o aviso deixa desfazer: o traço do Dalmo volta');
    await JM.locator('#opts .chip', { hasText: 'Desfazer o meu último' }).click();
    ok(await ate(async () => (await tracos(MM)).length === 0), 'o Dalmo desfaz o último traço dele: some para o mestre também');
  });

  const erros = t.errs.filter(e => !/favicon|ERR_|net::|Failed to load resource|row-level security|42501|GoTrueClient/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
