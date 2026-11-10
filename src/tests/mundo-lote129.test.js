// Mapa-múndi, lote 129: a missão ligada à aba Missões, com o tipo (principal ou secundária) e o objetivo opcional.
//   · a janela "Marcar missão" lista as missões da aba Missões (a principal com ★) e, logo abaixo de cada uma, os objetivos
//     opcionais dela; escolher um opcional guarda o objetivo (oid) no marcador;
//   · a marca no ícone: a principal dourada, a secundária azul-prata (tp-secundaria), o opcional menor e tracejado (op);
//     a dica diz "Missão principal", "Missão secundária" ou "Opcional de “…”";
//   · o opcional marcado na aba Missões vira ✓ no mapa; a projeção leva o tipo e o opcional (com o nome da missão).
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const A = (a, fn, arg) => a.F.evaluate(fn, arg);
const campo = (a, k) => a.F.locator(`#pane [data-k="${k}"]`);
async function aba(a, id) { await a.F.click('#tab-' + id); await a.F.waitForTimeout(180); }
async function botao(a, k) { await A(a, () => document.getElementById('toasts').replaceChildren()); await a.F.click(`#pane [data-k="${k}"]`); await a.F.waitForTimeout(220); }
const selecionar = async (a, id) => { await A(a, x => __mundo.App.selecionar(x ? [x] : []), id); await espera(220); };
const obj = (a, id) => A(a, id => { const o = __mundo.App.mapa && __mundo.App.mapa.objs.find(o => o.id === id); return o ? JSON.parse(JSON.stringify(o)) : null; }, id);
const marca = (a, id) => A(a, id => {
  const g = document.querySelector(`#mundo svg [data-id="${id}"] .missao`);
  if (!g) return null;
  const t = g.querySelector('title'), cls = g.getAttribute('class');
  return { cls, dica: t ? t.textContent : '' };
}, id);
async function janela(a, f) {
  await a.F.waitForSelector('dialog.mundo-dl[open]', { timeout: 4000 });
  await f(a.F.locator('dialog.mundo-dl[open]'));
  await a.F.locator('dialog.mundo-dl[open] button[type="submit"]').click(); await espera(300);
}

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'lote129', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame() };
  const erros = [];
  L.P.on('pageerror', e => erros.push(String(e.message)));

  await passo('o mapa', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    ok(await A(L, () => !!__mundo.App.mapa && !!(window.TC && TC.missoes)), '(o mapa em branco, com as Missões carregadas)');
  });

  await passo('o tipo e o opcional', async () => {
    // as missões como a mesa as daria (aqui, postas à mão): uma principal com um opcional, uma secundária
    await A(L, () => {
      const F = new Map([
        ['m1', { t: 'O cálice do barão', e: 'ativa', oculta: false, camp: null, tp: 'principal', ops: [{ id: 'o1', t: 'Roubar o cálice', e: 'ativa' }] }],
        ['m2', { t: 'Ratos no porão', e: 'ativa', oculta: false, camp: null, tp: 'secundaria', ops: [] }]]);
      window.__F = F;
      __mundo.App.missaoDaFicha = (id, oid) => {
        const f = F.get(id); if (!f) return null;
        if (oid) { const o = f.ops.find(x => x.id === oid); return o ? Object.assign({}, f, { t: o.t, e: o.e, de: f.t, op: true }) : null; }
        return Object.assign({}, f);
      };
      __mundo.App.missoesDasFichas = () => [...F].map(([id, f]) => Object.assign({ id }, f));
      const { App, N } = __mundo;
      App.mudar('montar', m => {
        m.objs.push(Object.assign(N.objNovo('m', { x: 400, y: 600, ic: 'cidade' }), { id: 'vila', nome: 'Vila Alta' }),
          Object.assign(N.objNovo('m', { x: 700, y: 600, ic: 'cidade' }), { id: 'porto', nome: 'Porto' }),
          Object.assign(N.objNovo('m', { x: 1000, y: 600, ic: 'cidade' }), { id: 'casa', nome: 'Mansão' }));
      });
    });
    await aba(L, 'selecao');
    // a principal, inteira
    await selecionar(L, 'vila'); await botao(L, 'o:vila:mis');
    await janela(L, async d => {
      const txt = await d.locator('#dl-f').innerText();
      ok(/★ O cálice do barão/.test(txt) && /Opcional: Roubar o cálice/.test(txt) && /Ratos no porão/.test(txt) && !/★ Ratos/.test(txt), 'a janela: a principal com ★ e o opcional logo abaixo dela: ' + j(txt));
      await d.locator('input[name="dl-modo"][value="f"]').check();
      await d.locator('#dl-f').selectOption('m1');
    });
    let o = await obj(L, 'vila'), mk = await marca(L, 'vila');
    ok(j(o.mis) === j({ t: '', ref: 'm1' }) && mk && !/tp-secundaria|\bop\b/.test(mk.cls) && /tp-principal/.test(mk.cls) && /^Missão principal: O cálice do barão/.test(mk.dica), 'a principal: dourada, com "Missão principal" na dica: ' + j([o.mis, mk]));
    ok(/Missão principal/.test(await L.F.locator('#pane').innerText()), 'o painel diz o tipo');
    // a secundária
    await selecionar(L, 'porto'); await botao(L, 'o:porto:mis');
    await janela(L, async d => { await d.locator('input[name="dl-modo"][value="f"]').check(); await d.locator('#dl-f').selectOption('m2'); });
    mk = await marca(L, 'porto');
    ok(mk && /tp-secundaria/.test(mk.cls) && /^Missão secundária: Ratos no porão/.test(mk.dica), 'a secundária: azul-prata, com "Missão secundária" na dica: ' + j(mk));
    // o objetivo opcional
    await selecionar(L, 'casa'); await botao(L, 'o:casa:mis');
    await janela(L, async d => { await d.locator('input[name="dl-modo"][value="f"]').check(); await d.locator('#dl-f').selectOption('m1|o1'); });
    o = await obj(L, 'casa'); mk = await marca(L, 'casa');
    ok(j(o.mis) === j({ t: '', ref: 'm1', oid: 'o1' }) && mk && /\bop\b/.test(mk.cls) && /tp-principal/.test(mk.cls) && /^Opcional de “O cálice do barão”: Roubar o cálice/.test(mk.dica), 'o opcional: guarda o objetivo; a marca menor e tracejada, com a missão na dica: ' + j([o.mis, mk]));
    ok(/Opcional de “O cálice do barão”/.test(await L.F.locator('#pane').innerText()), 'o painel diz de que missão ele é');
    // trocar mantém o opcional escolhido
    await botao(L, 'o:casa:mis-trocar');
    await janela(L, async d => { ok(await d.locator('#dl-f').inputValue() === 'm1|o1', 'Trocar: a janela abre no opcional escolhido'); });
    // cumprido na aba Missões: vira ✓
    await A(L, () => { __F.get('m1').ops[0].e = 'feita'; __mundo.App.emit('muda', { origem: 'fora' }); }); await espera(300);
    mk = await marca(L, 'casa');
    ok(mk && /m-feita/.test(mk.cls) && /\(concluída\)/.test(mk.dica) && /m-ativa/.test((await marca(L, 'vila')).cls), 'o opcional cumprido vira ✓ (a missão continua ativa): ' + j(mk));
    if (process.env.FOTO) { await A(L, () => { window.MundoTela.zoom = 2.2; }); await espera(600); await L.P.screenshot({ path: process.env.FOTO }); }
    // a projeção: o tipo e o opcional vão para os jogadores (mostrada)
    await campo(L, 'o:casa:mis-ver').check(); await espera(300);
    const pub = await A(L, () => { const N = __mundo.N, p = N.projetar(__mundo.App.mapa), o = p.objs.find(x => x.id === 'casa'); return o ? o.mis : null; });
    ok(pub && pub.ref === 'm1' && pub.oid === 'o1', '(a projeção do núcleo leva a ligação; quem projeta na mesa troca pelo nome e a situação)');
    const norm = await A(L, () => __mundo.N.normalizarMapa({ v: 1, objs: [{ id: 'x', k: 'm', x: 1, y: 1, ic: 'cidade', mis: { t: 'Roubar o cálice', ref: null, ver: true, e: 'feita', tp: 'principal', op: true, de: 'O cálice do barão' } }] }).objs[0].mis);
    ok(norm && norm.tp === 'principal' && norm.op === true && norm.de === 'O cálice do barão' && norm.e === 'feita', 'o que os jogadores recebem guarda o tipo, o opcional e a missão: ' + j(norm));
  });

  ok(!erros.length, 'sem erros na página: ' + erros.join(' | '));
  await t.close();
  end();
})();
