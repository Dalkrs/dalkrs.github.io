// Mapa-múndi, lote 7 (parte 5a), pela interface (a página sozinha, no navegador): os 24 eventos novos e o peso deles
// na viagem.
//   · a ferramenta Evento com os 36 tipos; o evento novo nasce com o peso de começo do tipo; o painel "Na viagem" (pesa
//     ou não, os cubos a mais por hexágono, a chance de encontro, fecha a passagem, voltar ao de começo); trocar o tipo
//     leva o peso do tipo novo; o evento de antes (sem peso) não pesa até o mestre ligar;
//   · a viagem com o "+1 tempo": a tempestade deixa mais caros os hexágonos dela, o grupo para antes da ponte caída
//     (sem sair do lugar nos tempos seguintes), os avisos ("agora dentro de", "parado") e a lista "Os eventos na
//     viagem" da aba Hoje; tudo com Desfazer;
//   · o "Sortear encontro" com os eventos: a chance da região somada à dos eventos onde o grupo está, no cartão;
//   · o desenho: cada tipo novo com o desenho dele (os animados com as classes de animação), a chave "Animar os eventos
//     (neste aparelho)" e o evento fora da data parado;
//   · quem joga: os eventos sem o peso, sem "Na viagem" e sem a lista.
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;

const ate = async (fn, ms = 6000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await espera(100); } };
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const A = (a, fn, arg) => a.F.evaluate(fn, arg);
async function semAvisos(a) { await A(a, () => document.getElementById('toasts').replaceChildren()); }
const campo = (a, k) => a.F.locator(`#pane [data-k="${k}"]`);
async function escrever(a, k, v) { const c = campo(a, k); await c.fill(v); await c.press('Enter'); await a.F.waitForTimeout(160); }
async function escolher(a, k, v) { await campo(a, k).selectOption(v); await a.F.waitForTimeout(200); }
async function marcar(a, k) { await campo(a, k).click(); await a.F.waitForTimeout(200); }
async function botao(a, k) { await semAvisos(a); await a.F.click(`#pane [data-k="${k}"]`); await a.F.waitForTimeout(220); }
async function aba(a, id) { await a.F.click('#tab-' + id); await a.F.waitForTimeout(160); }
async function naTela(a, x, y) { const [px, py] = await A(a, ([x, y]) => { const m = __mundo.App.vista(), r = document.querySelector('#mundo svg.camadas').getBoundingClientRect(); return [r.left + x * r.width / m.larg, r.top + y * r.height / m.alt]; }, [x, y]); return [px, py]; }
async function arrastar(a, de, para) {
  await semAvisos(a);
  const [x0, y0] = await naTela(a, de[0], de[1]), [x1, y1] = await naTela(a, para[0], para[1]);
  await a.P.mouse.move(x0, y0); await a.P.mouse.down(); await a.P.mouse.move(x1, y1, { steps: 10 }); await a.P.mouse.up(); await a.F.waitForTimeout(200);
}
async function pairar(a, x, y) { const [px, py] = await naTela(a, x, y); await a.P.mouse.move(px, py, { steps: 3 }); await a.F.waitForTimeout(150); }
async function ferramenta(a, f) { await a.F.click(`#rail .tool[data-f="${f}"]`); await a.F.waitForTimeout(120); }
const mapa = a => A(a, () => __mundo.App.mapa);
const rotulo = a => A(a, () => __mundo.App.rotuloDesfazer());
const obj = (a, id) => A(a, id => (__mundo.App.mapa && __mundo.App.mapa.objs.find(o => o.id === id)) || null, id);
const sel = a => A(a, () => __mundo.App.sel[0] || null);
const textoDoAviso = a => A(a, () => [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' | '));
const desfazer = async a => { await A(a, () => __mundo.App.desfazer()); await espera(250); };
const Y = 346.41;          // a fileira de hexágonos r = 10 (em pé, de 40 unidades)

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'lote7b', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame() };
  const foto = async nome => { if (process.env.TC_SCRATCH) await L.P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };

  await passo('o mapa e a grade', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    await aba(L, 'terreno');
    await escrever(L, 'ter:tam', '40');
    ok((await mapa(L)).grade.tam === 40, '(a grade de 40 unidades)');
  });

  let ev = null;
  await passo('o evento novo e o peso dele', async () => {
    await ferramenta(L, 'e');
    const tipos = await A(L, () => [...document.querySelectorAll('#opts select[aria-label="Evento"] option')].map(o => o.value));
    ok(tipos.length === 36 && tipos.includes('ponte') && tipos.includes('colheita') && tipos[0] === 'guerra', 'a ferramenta Evento com os 36 tipos: ' + tipos.length);
    await L.F.selectOption('#opts select[aria-label="Evento"]', 'ponte'); await espera(100);
    await arrastar(L, [500, 600], [560, 600]);
    ev = await sel(L);
    await aba(L, 'selecao');
    let o = await obj(L, ev);
    ok(o && o.tipo === 'ponte' && j(o.peso) === j({ custo: 0, enc: 0, fecha: true }), 'o evento novo (a ponte caída) nasce com o peso do tipo: fecha a passagem — ' + j(o && o.peso));
    const painel = await A(L, () => document.getElementById('pane').innerText);
    ok(/Na viagem/i.test(painel) && await campo(L, `o:${ev}:pesa`).isChecked() && await campo(L, `o:${ev}:pfecha`).isChecked() && await campo(L, `o:${ev}:pcusto`).inputValue() === '0', 'o painel "Na viagem": pesa, fecha a passagem, nenhum cubo a mais');
    await escolher(L, `o:${ev}:tipo`, 'tempestade');
    o = await obj(L, ev);
    ok(j(o.peso) === j({ custo: 5, enc: 0, fecha: false }) && await rotulo(L) === 'mudar o tipo do evento', 'trocar o tipo leva o peso do tipo novo (a tempestade: +5 cubos)');
    await escrever(L, `o:${ev}:pcusto`, '7,5');
    o = await obj(L, ev);
    ok(o.peso.custo === 7.5 && await rotulo(L) === 'mudar o custo do evento' && await campo(L, `o:${ev}:ppadrao`).count() === 1, 'os cubos a mais (7,5, com vírgula); aparece "Voltar ao de começo do tipo"');
    await escrever(L, `o:${ev}:penc`, '25');
    await botao(L, `o:${ev}:ppadrao`);
    o = await obj(L, ev);
    ok(j(o.peso) === j({ custo: 5, enc: 0, fecha: false }) && await campo(L, `o:${ev}:ppadrao`).count() === 0, 'voltar ao de começo do tipo');
    await marcar(L, `o:${ev}:pesa`);
    o = await obj(L, ev);
    ok(!('peso' in o) && await rotulo(L) === 'o evento não pesa na viagem' && await campo(L, `o:${ev}:pcusto`).count() === 0, 'desligado: o evento não pesa (e os números somem)');
    ok(/Ligado, vale o de começo do tipo: \+5 cubos por hexágono\./.test(await A(L, () => document.getElementById('pane').innerText)), 'a dica diz o que vale ao ligar');
    await marcar(L, `o:${ev}:pesa`);
    ok(j((await obj(L, ev)).peso) === j({ custo: 5, enc: 0, fecha: false }), 'ligado de novo: o de começo do tipo');
    await desfazer(L);
    ok(!('peso' in (await obj(L, ev))), 'com Desfazer');
    await A(L, id => __mundo.App.mudar('apagar', m => { m.objs = m.objs.filter(x => x.id !== id); }), ev);
  });

  await passo('a viagem: o custo, a passagem fechada e os avisos', async () => {
    // a rota na fileira r = 10, de x = 200 a 1000 (hexágonos de 40: o caminho tem 21), o grupo a 5 cubos por tempo; a
    // tempestade cobre de x = 360 a 440 (+5 cubos); a ponte caída cobre o hexágono de x = 720
    await A(L, Y => __mundo.App.mudar('preparar', m => {
      const N = __mundo.N;
      m.objs.push(Object.assign(N.objNovo('t', { pts: [[200, Y], [1000, Y]] }), { id: 'rt', nome: 'Estrada do Norte' }));
      m.objs.push(Object.assign(N.objNovo('g', { x: 200, y: Y, rota: 'rt', pt: 5, sigla: 'HER' }), { id: 'g', nome: 'Os Heróis' }));
      m.objs.push(Object.assign(N.objNovo('e', { x: 400, y: Y, tipo: 'tempestade', r: 45, ini: m.cal.dia, peso: N.pesoPadrao('tempestade') }), { id: 'tp' }));
      m.objs.push(Object.assign(N.objNovo('e', { x: 720, y: Y, tipo: 'ponte', r: 15, ini: m.cal.dia, peso: N.pesoPadrao('ponte') }), { id: 'pc' }));
      m.objs.push(Object.assign(N.objNovo('e', { x: 400, y: Y, tipo: 'guerra', r: 45, ini: m.cal.dia }), { id: 'gu' }));
    }), Y);
    await espera(300);
    const v = await A(L, () => { const N = __mundo.N, m = __mundo.App.mapa, g = m.objs.find(o => o.id === 'g'); return N.viagem(m, g).acum; });
    ok(v[4] - v[3] === 10 && v[5] - v[4] === 10 && v[2] - v[1] === 5 && v[8] - v[7] === 5, 'os hexágonos da tempestade custam 10 (5 + 5); a guerra de antes, sem peso, não muda nada: ' + j(v.slice(0, 9)));
    // a dica do Terreno, sobre o hexágono: os cubos a mais dos eventos e o que fecha a passagem
    await ferramenta(L, 'h');
    await pairar(L, 400, Y); const d1 = await L.F.locator('#dica').innerText();
    await pairar(L, 720, Y); const d2 = await L.F.locator('#dica').innerText();
    await pairar(L, 560, Y); const d3 = await L.F.locator('#dica').innerText();
    ok(/Aqui: sem terreno · 10 cubos \(sem terreno; \+5 dos eventos\)\./.test(d1) && /Aqui: sem terreno · 5 cubos \(sem terreno\)\. Fechado: "Ponte caída"\./.test(d2) && /Aqui: sem terreno · 5 cubos \(sem terreno\)\.(?! Fechado)/.test(d3),
      'a dica do Terreno diz os cubos a mais dos eventos e o que fecha a passagem: ' + j([d1, d2, d3]));
    await ferramenta(L, 'sel');
    const avisos = [];
    for (let k = 0; k < 7; k++) { await semAvisos(L); await L.F.click('#tempoMais'); await espera(250); avisos.push(await textoDoAviso(L)); }
    ok(avisos.some(x => /Os Heróis — agora dentro de "Tempestade" \(\+5 cubos por hexágono\)\./.test(x)), 'o aviso de quem entra no evento que pesa: ' + avisos.find(x => /Tempestade/.test(x)));
    for (let k = 0; k < 20; k++) { const g = await obj(L, 'g'); if (g.x >= 679) break; await semAvisos(L); await L.F.click('#tempoMais'); await espera(200); }
    let g = await obj(L, 'g');
    ok(Math.abs(g.x - 680) < 1, 'o grupo chega ao hexágono de antes da ponte: x = ' + g.x);
    await semAvisos(L); await L.F.click('#tempoMais'); await espera(250);
    const aviso = await textoDoAviso(L);
    g = await obj(L, 'g');
    ok(Math.abs(g.x - 680) < 1 && /Os Heróis — parado: "Ponte caída" fecha a passagem\./.test(aviso) && !/grupo andou/.test(aviso), 'parado antes da ponte caída: o tempo passa, o grupo não sai do lugar, e o aviso diz: ' + aviso);
    await aba(L, 'hoje');
    const lista = await A(L, () => { const s = [...document.querySelectorAll('#pane .sec')].find(x => /Os eventos na viagem/i.test(x.innerText)); return s ? s.innerText.replace(/\s+/g, ' ') : ''; });
    ok(/Os Heróis parado: "Ponte caída" fecha a passagem/i.test(lista), 'a aba Hoje: "Os eventos na viagem" mostra o grupo parado — ' + lista);
    await foto('lote7b-viagem');
    // abrir a passagem (o mestre tira o "fecha"): o grupo segue
    await A(L, () => __mundo.App.mudar('abrir', m => { m.objs.find(o => o.id === 'pc').peso.fecha = false; }));
    await semAvisos(L); await L.F.click('#tempoMais'); await espera(250);
    ok((await obj(L, 'g')).x > 681 || (await obj(L, 'g')).prog > 0, 'com a passagem aberta, o grupo segue');
    await desfazer(L); await desfazer(L);
    ok(Math.abs((await obj(L, 'g')).x - 680) < 1 && (await obj(L, 'pc')).peso.fecha === true, 'com Desfazer, tudo volta');
  });

  await passo('o encontro com os eventos', async () => {
    await A(L, Y => __mundo.App.mudar('preparar o encontro', m => {
      const N = __mundo.N;
      m.objs.push(Object.assign(N.objNovo('r', { pts: [[0, 0], [1400, 0], [1400, 1000], [0, 1000]], enc: { chance: 10, itens: [{ p: 1, txt: 'Lobos' }] } }), { id: 'rg', nome: 'Vale' }));
      m.objs.push(Object.assign(N.objNovo('e', { x: 680, y: Y, tipo: 'bandidos', r: 60, ini: m.cal.dia, peso: N.pesoPadrao('bandidos') }), { id: 'bd' }));
    }), Y);
    await A(L, () => __mundo.App.selecionar(['g'])); await espera(300);
    await aba(L, 'selecao');
    await botao(L, 'o:sortear');
    const cartao = await A(L, () => { const c = document.querySelector('#pane .cartao'); return c ? c.innerText.replace(/\s+/g, ' ') : ''; });
    ok(/Com os eventos: 10% da região, "Bandidos na estrada" \+30% = 40%\./.test(cartao), 'o cartão do encontro mostra a chance com os eventos: ' + cartao);
    ok(/chance 40%/.test(cartao) || /precisava de 40 ou menos/.test(cartao), '(o d100 contra os 40%)');
  });

  await passo('o desenho dos eventos novos e a animação', async () => {
    const tipos = await A(L, () => Object.keys(__mundo.N.EVENTOS).slice(12));
    await A(L, tipos => __mundo.App.mudar('os novos', m => {
      const N = __mundo.N;
      tipos.forEach((tp, i) => m.objs.push(Object.assign(N.objNovo('e', { x: 150 + (i % 8) * 150, y: 600 + Math.floor(i / 8) * 130, tipo: tp, r: 55, ini: m.cal.dia, peso: N.pesoPadrao(tp) }), { id: 'n_' + tp })));
      m.objs.push(Object.assign(N.objNovo('e', { x: 1300, y: 150, tipo: 'meteoros', r: 55, ini: m.cal.dia + 30 }), { id: 'futuro' }));
    }), tipos);
    await espera(500);
    const d = await A(L, tipos => { const out = {}; for (const tp of tipos) { const g = [...document.querySelectorAll(`#mundo [data-id="n_${tp}"]`)].find(x => x.querySelector('.eve-area')); out[tp] = g ? [g.querySelectorAll('.eve-arte').length, g.querySelectorAll('.eve-anim').length] : null; } return out; }, tipos);
    ok(Object.values(d).every(x => x && x[0] > 0), 'cada tipo novo tem o desenho dele dentro da área: ' + j(d));
    ok(d.meteoros[1] === 6 && d.tribulacao[1] === 3 && d.inverno[1] === 14 && d.seca[1] === 0 && d.ponte[1] === 0, 'os animados (os meteoros, os raios, a neve) e os parados (a seca, a ponte caída)');
    const fut = await A(L, () => { const g = [...document.querySelectorAll('#mundo [data-id="futuro"]')].find(x => x.querySelector('.eve-area')); return g ? { inativo: g.classList.contains('inativo'), anim: g.querySelectorAll('.eve-anim').length } : null; });
    const anim = () => A(L, () => { const svg = document.querySelector('#mundo svg.camadas'), el = document.querySelector('#mundo .eve-risca'); return { sem: svg.classList.contains('sem-anima'), nome: el ? getComputedStyle(el).animationName : '' }; });
    const a0 = await anim();
    ok(fut && fut.inativo && !a0.sem && a0.nome === 'eve-risca', 'animado de começo (o evento fora da data fica parado): ' + j([fut, a0]));
    await foto('lote7b-desenhos');
    await aba(L, 'hoje');
    await marcar(L, 'hoje:animar');
    const a1 = await anim(), guardado = await A(L, () => JSON.parse(localStorage.getItem('tinycats:mundo:painel') || '{}').animar);
    ok(a1.sem && a1.nome === 'none' && guardado === false, '"Animar os eventos (neste aparelho)" desligado: tudo parado, e o aparelho lembra');
    await marcar(L, 'hoje:animar');
    ok(!(await anim()).sem, 'ligado de novo');
  });

  await passo('quem joga', async () => {
    await A(L, () => { __mundo.App.comoJogador = true; }); await espera(400);
    const pub = await A(L, () => { const m = __mundo.App.vista(); return (m.objs || []).filter(o => o.k === 'e').map(o => 'peso' in o); });
    await aba(L, 'hoje');
    const txt = await A(L, () => document.getElementById('pane').innerText);
    ok(pub.length > 0 && pub.every(x => !x) && !/Os eventos na viagem/i.test(txt), 'quem joga vê os eventos sem o peso e sem a lista da viagem');
    await A(L, () => { __mundo.App.comoJogador = false; }); await espera(300);
  });

  const erros = t.errs.filter(e => !/favicon|WebSocket|realtime/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
