// Mapa-múndi, lote 18 (numa moldura que faz o papel da casca, sem mesa): o campo de batalha.
//   · na janela da Batalha, "Abrir no campo de batalha…" manda para as Cenas a cena do hexágono da batalha e os dois
//     exércitos (as unidades, a cor da facção, o lado de cada um, a ficha do comandante e a do governante), com o id da
//     cena que vai nascer; depois, o botão vira "Ir ao campo de batalha";
//   · a leitura do campo, de volta das Cenas: a batalha abre com os bônus sugeridos; "Somar" vira um bônus do mestre (que
//     dá para tirar); "Somar todas";
//   · no "Depois", "Levar as perdas aos blocos" (ligado de começo): ao aplicar, as perdas de cada lado vão para as Cenas.
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;
const espera = ms => new Promise(r => setTimeout(r, ms));
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }

(async () => {
  const t = await start();
  const d = await t.device({ name: 'moldura-l18', w: 1400, h: 900 });
  const P = d.page;
  P.setDefaultTimeout(8000);
  await P.goto(t.base + 'src/tests/vazio.html', { waitUntil: 'load' });
  await P.evaluate(() => {
    window.__irs = [];
    addEventListener('message', e => {
      const m = e.data && e.data.tinycats;
      if (!m) return;
      if (m.t === 'ola') e.source.postMessage({ tinycats: { t: 'estado', v: 4, mesa: null, papel: null, cargo: null, jogando: false, mestra: null, segredo: false, eu: null, campanha: null, campanhas: [], temCampanhas: false, membros: [] } }, location.origin);
      if (m.t === 'ir') window.__irs.push({ aba: m.aba, alvo: m.alvo });
    });
    const f = document.createElement('iframe'); f.id = 'mf'; f.src = '/mundo/?debug'; f.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0'; document.body.append(f);
  });
  let F = null;
  for (let i = 0; i < 80 && !F; i++) { F = P.frames().find(f => f !== P.mainFrame() && /\/mundo\//.test(f.url())) || null; if (!F) await espera(100); }
  await F.waitForFunction(() => window.__mundo && __mundo.App.pronto, null, { timeout: 15000 });
  if (await F.locator('#vazio [data-k="vz:nome"]').count()) { await F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await F.click('#vazio [data-k="vz:papel"]'); await espera(300); }
  const A = (fn, arg) => F.evaluate(fn, arg);
  const foto = async nome => { if (process.env.TC_SCRATCH) { require('fs').mkdirSync(path.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const pedidos = () => P.evaluate(() => window.__irs.splice(0));
  const gb = k => F.locator(`dialog[open] [data-k="${k}"]`);
  const bat = () => A(() => JSON.parse(JSON.stringify(window.MundoGuerraPainel.batalha)));
  const mandar = alvo => P.evaluate(a => document.getElementById('mf').contentWindow.postMessage({ tinycats: { t: 'alvo', alvo: a } }, location.origin), alvo);

  let mapaId = null;
  await passo('o mapa e os exércitos', async () => {
    mapaId = await A(() => {
      const { App, N } = __mundo;
      if (!App.mapa) App.criarMapa('Campo');
      const un = (id, nome, tropas, magos, maq) => ({ id, nome, tipo: null, tropas, hpT: 1, atq: 0, def: 0, magos: magos || 0, maq: maq || {}, equip: [] });
      App.mudar('montar', m => {
        m.grade = Object.assign({}, m.grade, { tam: 50, x: 25, y: 25, on: true });
        m.faccoes.push({ id: 'fa', nome: 'Aldar', cor: '#3f7fbf' }, { id: 'fb', nome: 'Vale', cor: '#c0503a' });
        for (let q = 0; q < 12; q++) for (let r = 0; r < 12; r++) m.hexes[q + ',' + r] = 'pl';
        const ka = N.hexDe(m, 300, 300), kb = N.hexDe(m, 350, 300);
        m.objs.push(Object.assign(N.objNovo('g', { x: N.centroHex(m, ka.q, ka.r).x, y: N.centroHex(m, ka.q, ka.r).y }), { id: 'ea', nome: 'Hoste de Aldar', fac: 'fa', tipo: 'exercito',
          exe: { cmd: { nome: 'Ana', b: 2, ficha: 'ch_ana' }, moral: 6, mant: 10, fome: 0, unid: [un('ua1', 'Lanceiros', 250, 5), un('ua2', 'Catapultas', 20, 0, { catapulta: 2 })] } }));
        m.objs.push(Object.assign(N.objNovo('g', { x: N.centroHex(m, kb.q, kb.r).x, y: N.centroHex(m, kb.q, kb.r).y }), { id: 'eb', nome: 'Legião do Vale', fac: 'fb', tipo: 'exercito',
          exe: { cmd: { nome: '', b: 0 }, moral: 5, mant: 10, fome: 0, unid: [un('ub1', 'Espadas', 300)] } }));
      });
      return App.mapa.id;
    });
    ok(!!mapaId, '(o mapa montado)');
  });

  await passo('abrir no campo de batalha', async () => {
    await A(() => window.MundoGuerraPainel.abrirBatalha({ a: 'ea', b: 'eb' })); await espera(400);
    ok(await gb('gb:campo').count() === 1 && await gb('gb:campo-abrir').innerText() === 'Abrir no campo de batalha…', 'a janela da Batalha tem a parte do campo de batalha, com "Abrir no campo de batalha…"');
    await foto('l18-mundo-batalha-campo');
    await gb('gb:campo-abrir').click(); await espera(300);
    const l = await pedidos(), al = l[0] && l[0].alvo, c = al && al.campo;
    ok(l.length === 1 && l[0].aba === 'cenas' && /^cena_campo_[a-z0-9]+$/.test(al.cena), 'o pedido vai para as Cenas, com o id da cena que vai nascer: ' + j(l.map(x => [x.aba, x.alvo && x.alvo.cena])));
    ok(c && c.mapa === mapaId && c.por === 100 && c.ladoA === 'o' && c.a.g === 'ea' && c.b.g === 'eb' && c.a.cor === '#3f7fbf' && c.b.cor === '#c0503a' && c.a.cmd === 'ch_ana' && c.b.cmd === null,
      'os dois exércitos (a cor da facção, a ficha do comandante), Aldar a oeste: ' + j(c && { ladoA: c.ladoA, a: [c.a.g, c.a.cor, c.a.cmd], b: [c.b.g, c.b.cor] }));
    ok(c && j(c.a.unid) === j([{ nome: 'Lanceiros', tipo: '', tropas: 250, magos: 5, maq: 0 }, { nome: 'Catapultas', tipo: '', tropas: 20, magos: 0, maq: 2 }]) && c.b.unid.length === 1, 'as unidades (as tropas, os magos e as máquinas): ' + j(c && c.a.unid));
    ok(c && c.pedido && c.pedido.hex && c.pedido.hex.ter === 'campo' && c.nome === 'Campo de batalha: Hoste de Aldar × Legião do Vale', 'a cena do hexágono da batalha (o terreno dele) e o nome: ' + j(c && [c.pedido && c.pedido.hex && c.pedido.hex.ter, c.nome]));
    ok(await gb('gb:campo-abrir').innerText() === 'Ir ao campo de batalha', 'depois, o botão leva ao campo (o mesmo id)');
    await gb('gb:campo-abrir').click(); await espera(250);
    const l2 = await pedidos();
    ok(l2.length === 1 && l2[0].alvo.cena === al.cena, '(o mesmo id de cena)');
    await A(() => window.MundoGuerraPainel.batalha && (window.MundoGuerraPainel.batalha.campo.cena = 'cena_campo_t9'));
  });

  await passo('a leitura do campo', async () => {
    await mandar({ mapa: mapaId, campo: { cena: 'cena_campo_t9', a: 'ea', b: 'eb', sug: { a: [{ k: 'flanco', v: 2, txt: '2 blocos inimigos atacados pelo lado' }, { k: 'reserva', v: 1, txt: '1 bloco na reserva' }], b: [{ k: 'alto', v: 1, txt: '1 bloco no alto' }, { k: 'xx', v: 3 }] } } });
    await espera(500);
    let b = await bat();
    ok(b && b.campoSug && b.campoSug.a.length === 2 && b.campoSug.b.length === 1 && b.campo.cena === 'cena_campo_t9', 'a batalha abre com o que o campo sugere (o que não vale fica de fora): ' + j(b && b.campoSug));
    const txt = await gb('gb:campo').innerText();
    ok(/Hoste de Aldar: Flanco \+2 — 2 blocos inimigos atacados pelo lado/.test(txt) && /Legião do Vale: Terreno alto \+1/.test(txt), 'as sugestões, cada uma com o "Somar": ' + txt.replace(/\s+/g, ' '));
    await foto('l18-mundo-campo-sugere');
    await gb('gb:campo-somar:a:0').click(); await espera(250);
    b = await bat();
    ok(b.mestre.length === 1 && j(b.mestre[0]) === j({ lado: 'a', tipo: 'tatica', v: 2, mom: null, txt: 'Campo: flanco — 2 blocos inimigos atacados pelo lado' }) && b.campoSug.a[0].usada, '"Somar": vira um bônus do mestre (tática +2): ' + j(b.mestre));
    ok(await gb('gb:mestre-x:0').count() === 1 && /somado/.test(await gb('gb:campo-s:a:0').innerText()), 'o bônus aparece entre os do mestre (dá para tirar); a sugestão fica "somado"');
    await gb('gb:campo-todas').click(); await espera(250);
    b = await bat();
    ok(b.mestre.length === 3 && b.mestre.map(x => x.lado + ':' + x.tipo + x.v).join() === 'a:tatica2,a:reforco1,b:terreno1', '"Somar todas": as que faltavam (a reserva vira reforço; o terreno alto, terreno): ' + b.mestre.map(x => x.lado + ':' + x.tipo + x.v).join());
  });

  await passo('as perdas voltam aos blocos', async () => {
    await A(() => { let i = 0; const v = [0.795, 0.205]; __mundo.App.rng = () => v[i++ % v.length]; });
    await gb('gb:d100').click(); await espera(300);
    await gb('gb:depois').click(); await espera(300);
    ok(await gb('gb:campo-perdas').isChecked(), 'no "Depois", "Levar as perdas aos blocos de soldados do campo" (ligado de começo)');
    await foto('l18-mundo-depois-campo');
    await pedidos();
    await gb('gb:aplicar').click(); await espera(500);
    const l = await pedidos(), p = l[0] && l[0].alvo;
    ok(l.length === 1 && l[0].aba === 'cenas' && p.cena === 'cena_campo_t9' && p.campoPerdas && p.campoPerdas.a.g === 'ea' && p.campoPerdas.b.g === 'eb', 'ao aplicar, as perdas vão para o campo: ' + j(p));
    ok(p && p.campoPerdas.a.t0 === 270 && p.campoPerdas.a.t1 <= 270 && p.campoPerdas.b.t0 === 300 && p.campoPerdas.b.t1 < 300, 'as tropas de antes e de depois de cada lado: ' + j(p && p.campoPerdas));
  });

  const errs = t.errs.filter(e => !/favicon/i.test(e));
  if (errs.length) console.log(errs.slice(0, 10).join('\n'));
  ok(errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
