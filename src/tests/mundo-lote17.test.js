// Mapa-múndi, lote 17 (a página sozinha, no navegador; sem mesa, quem usa é o mestre):
//   · a zona de guerra automática (os hexágonos ocupados e a fronteira entre facções em guerra, com a linha do front), o
//     pincel do ajuste (pôr e tirar hexágonos, voltar ao automático) e a seção dela na aba Guerra;
//   · as setas de ofensiva: a livre (a ferramenta Frente, "Seta de ofensiva") e a da marcha de um grupo;
//   · as viagens por mar: ligar dois portos (os dias), a linha no mapa, o "Traçar entre dois marcadores" que vai por mar;
//   · os recursos por hexágono (o pincel da ferramenta Terreno), que somam na produção da região;
//   · os lugares que produzem (a mina, a fazenda…) e o castelo e o forte na fortificação; a tabela da defesa e o terreno
//     na batalha (de onde veio o bônus);
//   · os terrenos e os ícones novos; a terra devastada sugerida no Próximo dia;
//   · a caneta: as duas canetas (a que some, a que fica), a cor, desfazer e limpar.
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'mundo-l17', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const P = dl.page, F = P.mainFrame();
  const A = (fn, arg) => F.evaluate(fn, arg);
  const foto = async nome => { if (process.env.TC_SCRATCH) { require('fs').mkdirSync(path.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const campo = k => F.locator(`#pane [data-k="${k}"]`);
  const opts = () => F.locator('#opts');
  const rotulo = () => A(() => { const p = __mundo.App; return p.podeDesfazer() ? ((document.querySelector('#btDesfazer') || {}).title || '').replace(/ \(Ctrl\+Z\)$/, '') : ''; });
  const naTela = (x, y) => A(([x, y]) => { const T = window.MundoTela, z = T.zoom, r = document.querySelector('#mundo').getBoundingClientRect(); return [r.left + x * z, r.top + y * z]; }, [x, y]);

  await passo('o mapa', async () => {
    await P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    await A(() => {
      const { App, N } = __mundo;
      App.mudar('montar', m => {
        m.grade = Object.assign({}, m.grade, { tam: 50, x: 25, y: 25, on: true });
        m.faccoes.push({ id: 'fa', nome: 'Aldar', cor: '#3f7fbf', jog: true, rel: { fb: 'guerra' } }, { id: 'fb', nome: 'Vale', cor: '#c0503a' }, { id: 'fc', nome: 'Neutros', cor: '#3f9a5c' });
        const poe = (k, campos, extra) => m.objs.push(Object.assign(N.objNovo(k, campos), extra));
        poe('r', { pts: [[0, 0], [1000, 0], [1000, 1400], [0, 1400]] }, { id: 'r1', nome: 'Aldar', fac: 'fa' });
        poe('r', { pts: [[1000, 0], [2000, 0], [2000, 1400], [1000, 1400]] }, { id: 'r2', nome: 'Vale', fac: 'fb' });
        poe('r', { pts: [[1300, 200], [1600, 200], [1600, 500], [1300, 500]] }, { id: 'r3', nome: 'Marca', pai: 'r2', ocup: { fac: 'fa', d: 0 } });
        poe('m', { x: 200, y: 300, ic: 'porto' }, { id: 'p1', nome: 'Porto Alto' });
        poe('m', { x: 1800, y: 1100, ic: 'porto' }, { id: 'p2', nome: 'Porto Baixo' });
        poe('m', { x: 400, y: 1000, ic: 'mina' }, { id: 'mn', nome: 'Mina Funda' });
        poe('m', { x: 1500, y: 900, ic: 'castelo' }, { id: 'cs', nome: 'Castelo do Vale' });
      });
    });
    await espera(400);
    ok(await A(() => __mundo.App.mapa.objs.length === 7), '(o mapa montado)');
  });

  await passo('a zona de guerra automática', async () => {
    const z = await A(() => { const C = document.querySelector('.c-zag'); return { hex: C.querySelectorAll('.zag-hex').length, borda: C.querySelectorAll('.zag-borda').length, front: C.querySelectorAll('.zag-front').length }; });
    ok(z.hex >= 2 && z.borda === 1 && z.front >= 2, 'a zona aparece: os hexágonos listrados (por par de facções), a borda e a linha do front: ' + j(z));
    await foto('l17-zona');
  });

  // arrastar o mouse pelo mapa (em unidades do mapa)
  const arrastar = async (pts, passos) => {
    const q = []; for (const [x, y] of pts) q.push(await naTela(x, y));
    await P.mouse.move(q[0][0], q[0][1]); await P.mouse.down();
    for (const [x, y] of q.slice(1)) await P.mouse.move(x, y, { steps: passos || 6 });
    await P.mouse.up(); await espera(250);
  };
  const clicar = async (x, y) => { const [a, b] = await naTela(x, y); await P.mouse.click(a, b); await espera(120); };
  const chip = tx => F.locator('#opts .chip', { hasText: tx }).first();
  const hexDe = (x, y) => A(([x, y]) => { const h = __mundo.N.hexDe(__mundo.App.mapa, x, y); return h.q + ',' + h.r; }, [x, y]);
  const nZona = () => A(() => { const z = __mundo.N.zonaDeGuerra(__mundo.App.mapa); return z ? z.h.size : 0; });

  await passo('o ajuste da zona', async () => {
    const n0 = await nZona(), kBorda = await hexDe(1000, 700), kLonge = await hexDe(300, 300);
    ok(await A(k => __mundo.N.zonaDeGuerra(__mundo.App.mapa).h.has(k), kBorda) && !(await A(k => __mundo.N.zonaDeGuerra(__mundo.App.mapa).h.has(k), kLonge)), '(o hexágono da fronteira está na zona; o do meio de Aldar, não)');
    await A(() => __mundo.App.usarFerramenta('f')); await espera(150);
    await chip('Ajustar a zona').click(); await espera(150);
    ok(await chip('Pôr na zona').getAttribute('aria-pressed') === 'true' && await chip('Tirar da zona').isVisible() && await chip('Automático').isVisible(), 'a ferramenta Frente, "Ajustar a zona": pôr (o de começo), tirar e automático');
    await chip('Tirar da zona').click(); await espera(150);
    await arrastar([[1000, 700], [1000, 760]]);
    const z1 = await A(() => __mundo.App.mapa.guerra.zona);
    ok(z1 && z1.tira && z1.tira.includes(kBorda) && !z1.add && await nZona() < n0 && await rotulo() === 'Desfazer: tirar hexágonos da zona de guerra', 'pintar tira os hexágonos da zona (um passo de desfazer): ' + j(z1) + ' · ' + await rotulo());
    await A(() => __mundo.App.desfazer()); await espera(250);
    ok(!(await A(() => __mundo.App.mapa.guerra && __mundo.App.mapa.guerra.zona)) && await nZona() === n0, 'Desfazer volta a zona como era');
    await chip('Pôr na zona').click(); await espera(150);
    await arrastar([[300, 300], [302, 302]]);
    ok(await A(k => (__mundo.App.mapa.guerra.zona.add || []).includes(k) && __mundo.N.zonaDeGuerra(__mundo.App.mapa).h.has(k), kLonge), 'pôr: o hexágono entra na zona');
    await A(() => { __mundo.App.usarFerramenta('sel'); __mundo.Painel.abrirAba('guerra'); }); await espera(300);
    ok(/Seu ajuste: 1 hexágono posto à mão/.test(await campo('gu:zona-ajuste').innerText()) && await campo('gu:zona-auto').isVisible(), 'a aba Guerra mostra o ajuste e "Voltar ao automático"');
    await campo('gu:zona-auto').click(); await espera(250);
    ok(!(await A(() => __mundo.App.mapa.guerra && __mundo.App.mapa.guerra.zona)) && await nZona() === n0, '"Voltar ao automático" tira o ajuste');
    await campo('gu:zona-on').uncheck(); await espera(250);
    ok(await A(() => __mundo.App.mapa.guerra.zona.off === true && document.querySelectorAll('.c-zag .zag-hex').length === 0), 'desmarcar "Mostrar a zona de guerra automática": a zona some do mapa');
    await A(() => __mundo.App.desfazer()); await espera(250);
    ok(await A(() => document.querySelectorAll('.c-zag .zag-hex').length > 0), 'e volta (desfazer)');
  });

  await passo('a seta de ofensiva', async () => {
    await A(() => __mundo.App.usarFerramenta('f')); await espera(150);
    await chip('Seta de ofensiva').click(); await espera(150);
    await F.selectOption('#opts select[aria-label="Facção"]', 'fb'); await espera(100);
    for (const [x, y] of [[1400, 1000], [1100, 950], [800, 800]]) await clicar(x, y);
    await P.keyboard.press('Enter'); await espera(300);
    const st = await A(() => __mundo.App.mapa.objs.find(o => o.k === 'a'));
    ok(st && st.fac === 'fb' && st.pts.length === 3 && !st.ver, 'três pontos e Enter: a seta da facção Vale, que os jogadores não veem: ' + j(st));
    const el = await A(id => { const g = document.querySelector('.c-set [data-id="' + id + '"]'); return g ? { linha: !!g.querySelector('.set-linha.set-anda'), cor: g.querySelector('.set-linha').getAttribute('stroke'), ponta: !!g.querySelector('.set-ponta') } : null; }, st.id);
    ok(el && el.linha && el.ponta && el.cor === '#c0503a', 'no mapa: a linha curva andando, na cor da facção, com a ponta: ' + j(el));
    ok(/só você vê/.test(await F.locator('#pane .sub').first().innerText()) && await campo('o:' + st.id + ':sver').isVisible(), 'o painel da seta diz quem vê e tem "Os jogadores veem"');
    ok(await A(id => !__mundo.N.projetar(__mundo.App.mapa).objs.some(o => o.id === id), st.id), 'a projeção (o que os jogadores recebem) não leva a seta da outra facção');
    await campo('o:' + st.id + ':sver').check(); await espera(250);
    ok(await A(id => __mundo.N.projetar(__mundo.App.mapa).objs.some(o => o.id === id), st.id), 'marcada, ela vai para os jogadores');
    await foto('l17-seta');
  });

  await passo('a seta da marcha', async () => {
    await A(() => {
      const { App, N } = __mundo;
      App.mudar('o exército', m => {
        m.objs.push(N.objNovo('t', { id: 't1', pts: [[300, 700], [900, 700], [1300, 900]] }));
        m.objs.push(Object.assign(N.objNovo('g', { x: 300, y: 700 }), { id: 'g1', nome: 'Hoste', fac: 'fa', tipo: 'exercito', rota: 't1' }));
      });
      App.selecionar(['g1']);
    });
    await espera(300);
    await campo('o:g1:seta').check(); await espera(300);
    const sg = await A(() => { const g = document.querySelector('.c-setg [data-de="g1"]'); return g ? { linha: !!g.querySelector('.set-linha'), cor: g.querySelector('.set-linha').getAttribute('stroke') } : null; });
    ok(sg && sg.linha && sg.cor === '#3f7fbf' && await A(() => __mundo.App.mapa.objs.find(o => o.id === 'g1').seta.ver === false), '"Mostrar a marcha como seta": a seta da rota, na cor da facção do exército: ' + j(sg));
    ok(await campo('o:g1:seta-ver').isDisabled() && await campo('o:g1:seta-ver').isChecked(), 'o grupo é da facção dos jogadores: eles sempre veem (a caixa fica marcada e parada)');
    const sp = await A(() => __mundo.N.projetar(__mundo.App.mapa).objs.find(o => o.id === 'g1').sp);
    ok(j(sp) === j([[300, 700], [900, 700], [1300, 900]]), 'a projeção leva os pontos da seta prontos: ' + j(sp));
    await A(() => __mundo.App.mudar('andar', m => { const g = m.objs.find(o => o.id === 'g1'); g.x = 975; g.y = 743.01; g.prog = 70; })); await espera(250);
    const sp2 = await A(() => __mundo.N.setaDaMarcha(__mundo.App.mapa, __mundo.App.mapa.objs.find(o => o.id === 'g1')));
    ok(sp2 && sp2.length === 2 && sp2[0][0] === 975 && j(sp2[1]) === j([1300, 900]), 'o grupo andou: a seta sai de onde ele está, até o fim da rota: ' + j(sp2));
  });

  await passo('vendo como jogador', async () => {
    const st = await A(() => __mundo.App.mapa.objs.find(o => o.k === 'a').id);
    await F.locator('#comoJog').check(); await espera(400);
    const v = await A(id => ({ zag: document.querySelectorAll('.c-zag .zag-hex').length, front: document.querySelectorAll('.c-zag .zag-front').length, seta: !!document.querySelector('.c-set [data-id="' + id + '"]'), marcha: !!document.querySelector('.c-setg [data-de="g1"]'), zauto: !!__mundo.App.vista().guerra.zauto }), st);
    ok(v.zauto && v.zag > 0 && v.front > 0 && v.seta && v.marcha, 'como jogador: a zona (pronta, da projeção), a seta mostrada e a da marcha da facção deles: ' + j(v));
    await F.locator('#comoJog').uncheck(); await espera(200);
    await A(id => __mundo.App.mudar('esconder', m => { m.objs.find(o => o.id === id).ver = false; }), st); await espera(150);
    await F.locator('#comoJog').check(); await espera(400);
    ok(await A(id => !document.querySelector('.c-set [data-id="' + id + '"]'), st), 'a seta de outra facção, sem "mostrar", não aparece para eles');
    ok(await F.locator('#zCaneta').isVisible() && !(await F.locator('#rail').isVisible()) || await F.locator('#zCaneta').isVisible(), 'a caneta continua à mão (o botão no canto)');
    await F.locator('#comoJog').uncheck(); await espera(300);
  });

  await passo('as viagens por mar', async () => {
    await A(() => { __mundo.App.usarFerramenta('sel'); __mundo.App.selecionar(['p1']); __mundo.Painel.abrirAba('selecao'); }); await espera(300);
    ok(/Ligue este porto a outro/.test(await F.locator('#pane').innerText()) && await campo('o:p1:mar-novo').isVisible(), 'o porto tem a seção "Viagens por mar", com "Ligar a outro porto…"');
    await campo('o:p1:mar-novo').click(); await espera(250);
    const dlg = F.locator('dialog[open]');
    await dlg.locator('#dl-p').selectOption('p2'); await dlg.locator('#dl-d').fill('3');
    await dlg.locator('button[type="submit"]').click(); await espera(300);
    ok(j(await A(() => __mundo.App.mapa.objs.find(o => o.id === 'p1').mar)) === j([{ p: 'p2', d: 3 }]) && /^Desfazer: ligar os portos por mar/.test(await rotulo()), 'a janela liga os dois portos: 3 dias de viagem');
    const lan = await A(() => ({ n: document.querySelectorAll('.c-mlan .mar-rota').length, txt: [...document.querySelectorAll('.c-mlan text')].map(x => x.textContent) }));
    ok(lan.n === 1 && j(lan.txt) === j(['3 dias de mar']), 'no mapa: a linha tracejada entre os portos, com os dias: ' + j(lan));
    ok(await campo('o:p1:mar-d:p2').isVisible() && await campo('o:p1:mar-x:p2').isVisible(), 'a ligação aparece no porto, com os dias (dá para mudar) e "Desligar"');
    await A(() => { __mundo.App.selecionar(['p2']); }); await espera(250);
    ok(await campo('o:p2:mar-d:p1').isVisible(), 'e no outro porto também (a ligação vale para os dois)');
    // o "Traçar entre dois marcadores" vai por mar
    await A(() => { const { App, N } = __mundo; App.mudar('a caravana', m => { m.objs.push(Object.assign(N.objNovo('g', { x: 200, y: 300 }), { id: 'g2', nome: 'Navegantes', pt: 3 })); }); App.selecionar(['g2']); }); await espera(250);
    await campo('o:g2:tracar').click(); await espera(200);
    await F.selectOption('#pane [data-k="tr:de"]', 'p1'); await F.selectOption('#pane [data-k="tr:para"]', 'p2'); await espera(150);
    await campo('tr:ver').click(); await espera(300);
    const txt = await F.locator('#pane [data-k="tracar:g2"]').innerText();
    ok(/3 dias de mar/.test(txt), 'o caminho vai por mar, com os dias da ligação: ' + txt.split('\n')[0]);
    await campo('tr:usar').click(); await espera(300);
    const v = await A(() => { const { App, N } = __mundo, g = App.mapa.objs.find(o => o.id === 'g2'); const vg = N.viagem(App.mapa, g); return { total: vg.total, mar: vg.mar, rot: document.querySelectorAll('.c-rot .rot-mar').length }; });
    ok(v.mar && v.mar.length === 1 && v.mar[0].d === 3 && Math.abs(v.total - 90) < 0.01 && v.rot === 1, 'a rota usa a travessia: 3 dias no passo do grupo (3 cubos por tempo, 10 tempos: 90 cubos), azul no mapa: ' + j(v));
    await foto('l17-mar');
  });

  await passo('os recursos por hexágono', async () => {
    await A(() => __mundo.App.mudar('ligar a economia', m => { window.MundoReino.ligarEconomia(m); })); await espera(250);
    await A(() => { __mundo.App.selecionar([]); __mundo.App.usarFerramenta('h'); if (!__mundo.App.opt) __mundo.App.opt = {}; __mundo.App.opt.terPincel = 'hex'; }); await espera(200);
    await A(() => __mundo.Tela.redesenhar()); await espera(150);
    await F.selectOption('#opts select[aria-label="O que o pincel faz"]', 'rec'); await espera(200);
    ok(await F.locator('#opts select[aria-label="O recurso que o pincel põe"]').isVisible(), 'com a economia ligada, o pincel "Recurso…" pede o recurso e quanto');
    await F.selectOption('#opts select[aria-label="O recurso que o pincel põe"]', 'madeira'); await espera(150);
    await F.locator('#opts input[aria-label="Quanto o hexágono produz por semana"]').fill('3'); await F.locator('#opts input[aria-label="Quanto o hexágono produz por semana"]').press('Tab'); await espera(150);
    const k1 = await hexDe(600, 300);
    const antes = await A(() => (window.MundoReino.producaoPropria(__mundo.App.mapa, __mundo.App.mapa.objs.find(o => o.id === 'r1')).terreno.madeira || 0));
    await arrastar([[600, 300], [602, 301]]);
    const hr = await A(() => __mundo.App.mapa.eco.hexr);
    const depois = await A(() => (window.MundoReino.producaoPropria(__mundo.App.mapa, __mundo.App.mapa.objs.find(o => o.id === 'r1')).terreno.madeira || 0));
    ok(hr && j(hr[k1]) === j({ madeira: 3 }) && depois === antes + 3 && /^Desfazer: pôr Madeira nos hexágonos/.test(await rotulo()), 'pintar põe 3 de Madeira no hexágono: soma na produção da região (' + antes + ' → ' + depois + ')');
    ok(await A(() => [...document.querySelectorAll('.c-hexr .hexr-txt')].map(x => x.textContent).includes('+3 Madeira')), 'com o pincel nesse modo, o hexágono mostra o que tem');
    await foto('l17-recursos');
    await F.selectOption('#opts select[aria-label="O que o pincel faz"]', 'semrec'); await espera(150);
    await arrastar([[600, 300], [602, 301]]);
    ok(!(await A(() => __mundo.App.mapa.eco.hexr)), '"Tirar os recursos" limpa o hexágono');
    await A(() => __mundo.App.usarFerramenta('sel')); await espera(150);
  });

  await passo('o lugar que produz e a defesa dos lugares', async () => {
    await A(() => { __mundo.App.selecionar(['mn']); __mundo.Painel.abrirAba('selecao'); }); await espera(300);
    await campo('o:mn:pr-novo').click(); await espera(250);
    const pr = await A(() => __mundo.App.mapa.objs.find(o => o.id === 'mn').pr), lug = await A(() => window.MundoReino.producaoPropria(__mundo.App.mapa, __mundo.App.mapa.objs.find(o => o.id === 'r1')).lugar);
    ok(j(pr) === j({ orith: 5 }) && j(lug) === j({ orith: 5 }) && /Vai para Aldar, que controla a região/.test(await campo('o:mn:pr-dono').innerText()), 'a mina: "Produzir…" começa com 5 de Orith (o metal) por semana, para quem controla a região: ' + j(pr));
    const ej = await A(() => __mundo.N.projetar(__mundo.App.mapa).ecoJ.prod.lugar);
    ok(j(ej) === j({ orith: 5 }), 'os jogadores (Aldar) veem a produção dos lugares na economia deles: ' + j(ej));
    ok(!(await A(() => __mundo.N.projetar(__mundo.App.mapa).objs.find(o => o.id === 'mn').pr)), '(a produção do marcador é do mestre: não vai na projeção)');
    await A(() => { __mundo.App.selecionar(['cs']); }); await espera(250);
    ok(/O ícone \(Castelo\) soma \+3 de defesa: quem defende aqui já ganha isso na batalha/.test(await F.locator('#pane').innerText()), 'o castelo soma +3 na defesa de quem defende ali (a tabela de começo)');
    await A(() => __mundo.Painel.abrirAba('guerra')); await espera(300);
    ok(/Montanha \+3/.test(await campo('gu:def-ter').innerText()) && /Castelo \+3 · Forte \+2/.test(await campo('gu:def-ic').innerText()), 'a aba Guerra mostra a tabela da defesa: ' + await campo('gu:def-ter').innerText());
    await campo('gu:def-mudar').click(); await espera(250);
    await F.locator('dialog[open] [data-k="gd:t:mo"]').fill('4'); await F.locator('dialog[open] [data-k="gd:i:castelo"]').fill('5');
    await F.locator('dialog[open] [data-k="gd:ok"]').click(); await espera(300);
    const def = await A(() => __mundo.App.mapa.guerra.def);
    ok(def && def.ter.mo === 4 && def.ter.df === 3 && def.ic.castelo === 5 && def.ic.forte === 2 && /^Desfazer: mudar a tabela da defesa/.test(await rotulo()), 'mudar a tabela: Montanha +4, Castelo +5 (o resto como estava): ' + j(def));
    await foto('l17-aba-guerra');
  });

  await passo('o terreno na batalha', async () => {
    await A(() => {
      const { App, N } = __mundo;
      const un = (id, tropas) => ({ id, nome: id, tipo: null, tropas, hpT: 1, atq: 0, def: 0, magos: 0, maq: {}, equip: [] });
      const exe = u => ({ cmd: { nome: '', b: 0 }, moral: 5, mant: 10, fome: 0, unid: [u] });
      App.mudar('a batalha', m => {
        const ka = N.hexDe(m, 700, 1200), kb = N.hexDe(m, 750, 1200);
        m.hexes[kb.q + ',' + kb.r] = 'mo';
        m.objs.push(Object.assign(N.objNovo('g', { x: N.centroHex(m, ka.q, ka.r).x, y: N.centroHex(m, ka.q, ka.r).y }), { id: 'ea', nome: 'Hoste A', fac: 'fa', tipo: 'exercito', exe: exe(un('ua', 500)) }));
        m.objs.push(Object.assign(N.objNovo('g', { x: N.centroHex(m, kb.q, kb.r).x, y: N.centroHex(m, kb.q, kb.r).y }), { id: 'eb', nome: 'Hoste B', fac: 'fb', tipo: 'exercito', exe: exe(un('ub', 500)) }));
      });
    });
    await espera(300);
    await A(() => window.MundoGuerraPainel.abrirBatalha({ a: 'ea', b: 'eb' })); await espera(400);
    const lin = await F.locator('dialog[open] [data-k="gb:terreno"]');
    ok(await lin.isVisible() && /Quem defende: Hoste B \(o atacado\)/.test(await lin.locator('option').first().innerText()), 'a batalha num hexágono de montanha: a linha do terreno, com quem defende (o lado atacado)');
    ok(/Terreno: Montanha \(\+4\)/.test(await F.locator('dialog[open]').innerText()), 'e de onde vem o bônus: Terreno: Montanha (+4)');
    const ctx = await F.locator('dialog[open]').innerText();
    ok(/Hoste B: \+4\s*Terreno \(Montanha\) \+4/.test(ctx) && /Hoste A: 0\s*nenhum/.test(ctx), 'na lista dos bônus, "Terreno (Montanha) +4" no lado que defende (o B); o A, nada');
    await foto('l17-batalha');
    await F.locator('dialog[open] [data-k="gb:terreno"]').selectOption('a'); await espera(250);
    ok(/Hoste A: \+4\s*Terreno \(Montanha\) \+4/.test(await F.locator('dialog[open]').innerText()), 'trocar quem defende o terreno: o bônus passa para o A');
    await F.locator('dialog[open] [data-k="gb:terreno"]').selectOption('-'); await espera(250);
    ok(!/Terreno \(Montanha\) \+4/.test(await F.locator('dialog[open]').innerText()), '"Ninguém (campo aberto)": o terreno não conta');
    await P.keyboard.press('Escape'); await espera(250);
    // o castelo (sem fortificação escrita) protege quem defende ali: aparece como a fortificação da batalha
    await A(() => __mundo.App.mudar('perto do castelo', m => { const N = __mundo.N, h = N.hexDe(m, 1500, 900), c = N.centroHex(m, h.q, h.r), ea = m.objs.find(o => o.id === 'ea'), eb = m.objs.find(o => o.id === 'eb'); eb.x = c.x; eb.y = c.y; ea.x = c.x - 50; ea.y = c.y; })); await espera(250);
    await A(() => window.MundoGuerraPainel.abrirBatalha({ a: 'ea', b: 'eb' })); await espera(400);
    ok(/Hoste B defende Castelo do Vale/.test(await F.locator('dialog[open] [data-k="gb:estr"]').innerText().catch(() => '')) && /Hoste B: \+5\s*Fortificação \+5/.test(await F.locator('dialog[open]').innerText()), 'perto do castelo: ele é a fortificação de quem defende (o Castelo +5 da tabela, sem muralha escrita)');
    await P.keyboard.press('Escape'); await espera(250);
  });

  await passo('os terrenos e os ícones novos', async () => {
    const ts = await A(() => __mundo.N.mapaNovo('x').terrenos.map(t => t.id));
    ok(ts.length === 29 && ['ar', 'md', 'df', 'gl', 'fm', 'oa', 'ch', 'td'].every(id => ts.includes(id)), 'um mapa novo já vem com os oito terrenos novos (lote 57: 29 ao todo)');
    const ics = await A(() => Object.keys(__mundo.N.ICONES));
    ok(['fazenda', 'pedreira', 'serraria', 'forte', 'farol', 'estalagem', 'mercado', 'cemiterio', 'portal', 'ninho'].every(k => ics.includes(k)), 'os dez ícones novos');
    await A(() => __mundo.App.mudar('pintar', m => { const ids = ['ar', 'md', 'df', 'gl', 'fm', 'oa', 'ch', 'td']; ids.forEach((id, i) => { const h = __mundo.N.hexDe(m, 120 + i * 60, 1300); m.hexes[h.q + ',' + h.r] = id; }); })); await espera(400);
    const d = await A(() => (document.querySelector('canvas.hex-desenho') || {}).dataset || {});
    ok(['ar', 'md', 'gl', 'fm', 'oa', 'ch', 'td'].every(id => new RegExp('(^|,)' + id + ':').test(d.ters || '')), 'pintados, aparecem no mapa (a tinta de cada um; lote 57: o desfiladeiro é rede, desenhado por cima do terreno da margem): ' + (d.ters || ''));
    await A(() => { __mundo.Tela.zoom = 1.8; }); await espera(300); await A(() => { __mundo.Tela.centrar({ x: 330, y: 1300 }); }); await espera(600);
    // (para a foto: a aba Terreno aberta nos terrenos novos, com os nomes)
    await F.click('#tab-terreno'); await espera(300);
    await A(() => { const el = [...document.querySelectorAll('#pane input, #pane .nome, #pane span, #pane div')].find(e => (e.value || (e.children.length ? '' : e.textContent) || '').trim() === 'Água rasa'); if (el) el.scrollIntoView({ block: 'start' }); }); await espera(600);
    await foto('l17-terrenos');
    await F.click('#tab-selecao'); await espera(250);
    await A(() => __mundo.Tela.caber()); await espera(300);
    await A(() => { __mundo.App.selecionar(['mn']); __mundo.Painel.abrirAba('selecao'); }); await espera(250);
    ok(await F.locator('#pane [data-k="ic:mn:ninho"]').isVisible() && await F.locator('#pane [data-k="ic:mn:fazenda"]').isVisible(), 'a grade de ícones do marcador tem os novos');
  });

  await passo('a terra devastada', async () => {
    await A(() => __mundo.App.mudar('uma batalha antes', m => { const kb = __mundo.N.hexDe(m, 750, 1200); m.guerra.bats.push({ id: 'bt1', d: m.cal.dia, nome: 'Batalha do Vau', a: { g: 'ea', nome: 'A' }, b: { g: 'eb', nome: 'B' }, hex: kb.q + ',' + kb.r, fim: { vence: 'a', tam: 2 } }); })); await espera(200);
    const kb = await hexDe(750, 1200);
    await A(() => __mundo.App.mudar('o dia passa', m => { m.cal.dia += 1; })); await espera(150);
    const p = A(() => window.MundoGuerraPainel.proporMantimentos(1));
    await F.locator('dialog[open] [data-k="dia:devs"]').waitFor(); await espera(150);
    const cb = F.locator('dialog[open] [data-k="dia:dev:' + kb + '"]');
    ok(await cb.isVisible() && !(await cb.isChecked()) && /Marcar como Terra devastada o hexágono da batalha “Batalha do Vau”/.test(await F.locator('dialog[open] [data-k="dia:devs"]').innerText()), 'o dia da campanha sugere a terra devastada onde houve batalha — desmarcada');
    await cb.check(); await espera(150);
    await foto('l17-devastada');
    await F.locator('dialog[open] [data-k="dia:ok"]').click(); await p; await espera(300);
    ok(await A(k => __mundo.App.mapa.hexes[k] === 'td', kb), 'marcada e aplicada: o hexágono vira Terra devastada');
  });

  await passo('a caneta', async () => {
    ok(await F.locator('#zCaneta').isVisible() && await F.locator('#rail [data-f="w"]').isVisible(), 'a caneta: no trilho e na caixa do zoom');
    // (o aviso do dia da campanha, embaixo, cobre a caixa do zoom por alguns segundos: espera ele sair)
    await A(() => new Promise(r => { const t0 = Date.now(), v = () => (!document.querySelector('.toast') || Date.now() - t0 > 15000 ? r() : setTimeout(v, 200)); v(); }));
    await F.locator('#zCaneta').click(); await espera(200);
    ok(await A(() => __mundo.App.ferramenta === 'w') && await F.locator('#zCaneta').getAttribute('aria-pressed') === 'true' && await chip('Some em segundos').getAttribute('aria-pressed') === 'true', 'o botão liga a caneta (a que some, de começo)');
    const id0 = await A(() => __mundo.App.mapa.id);
    await arrastar([[300, 500], [400, 520], [500, 480]], 8);
    let r = await A(id => __mundo.App.rabiscosDe(id), id0);
    ok(r.length === 1 && r[0].s === 1 && r[0].p.length >= 2 && await A(() => document.querySelectorAll('.c-rab .rab-some').length === 1) && !(await A(() => __mundo.App.podeDesfazer() && /caneta|traço/.test(document.querySelector('#btDesfazer').title))), 'um traço: aparece no mapa (e não entra no desfazer do mapa)');
    await foto('l17-caneta');
    await espera(8600);
    r = await A(id => __mundo.App.rabiscosDe(id), id0);
    ok(r.length === 0 && await A(() => document.querySelectorAll('.c-rab .rab').length === 0), 'a caneta que some: depois de alguns segundos, o traço sumiu');
    await chip('Fica até limpar').click(); await espera(150);
    await F.locator('#opts .cor-caneta').nth(2).click(); await espera(150);
    await arrastar([[300, 600], [500, 650]]);
    await arrastar([[300, 700], [500, 750]]);
    r = await A(id => __mundo.App.rabiscosDe(id), id0);
    ok(r.length === 2 && r.every(x => x.s === 0 && x.c === '#7fbf7a'), 'a que fica, na cor escolhida (a terceira): ' + j(r.map(x => [x.s, x.c])));
    await chip('Desfazer o meu último').click(); await espera(200);
    r = await A(id => __mundo.App.rabiscosDe(id), id0);
    ok(r.length === 1 && Math.abs(r[0].p[0][1] - 600) < 3, '"Desfazer o meu último" tira o último traço (fica o primeiro)');
    await chip('Limpar desenhos').click(); await espera(250);
    ok((await A(id => __mundo.App.rabiscosDe(id), id0)).length === 0, '"Limpar desenhos" (do mestre) limpa tudo');
    await F.locator('#toasts .toast', { hasText: 'desenhos deste mapa foram limpos' }).locator('button', { hasText: 'Desfazer' }).click(); await espera(250);
    ok((await A(id => __mundo.App.rabiscosDe(id), id0)).length === 1, 'o aviso deixa desfazer');
    await P.reload({ waitUntil: 'load' }); await F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(400);
    ok((await A(id => __mundo.App.rabiscosDe(id), id0)).length === 1 && await A(() => __mundo.App.rabModo() === 'fica'), 'sem mesa, os traços que ficam ficam neste navegador (e a caneta escolhida também)');
    await P.keyboard.press('Escape');
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
