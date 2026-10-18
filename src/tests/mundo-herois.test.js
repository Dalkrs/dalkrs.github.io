// Mapa-múndi, lote 9 (parte 5), pela interface: os heróis na Guerra (a página sozinha, com as fichas da mesa postas à
// mão — o que a mesa daria: as linhas de personagens, com as contas das regras de verdade).
//   · no exército: a seção Heróis (pôr uma ficha, o bônus sugerido pela ficha — nível e maior atributo —, escrever outro,
//     voltar ao sugerido, tirar);
//   · na batalha: os heróis de cada lado (os do exército e os só desta batalha), a soma com o teto de +10 por lado, a
//     linha na comparação, o bônus "Heróis" na Virada; a ação heroica num momento-chave (o atributo da ficha contra a
//     dificuldade: o dobro +10, falhou −2; tirar a ação); no depois, os ferimentos de cada herói (o HP da ficha, antes e
//     depois, pelo tamanho do resultado), aplicar (na ficha), o Desfazer e o Refazer (o do aviso e o de cima: o mapa e
//     o HP das fichas, a partir do HP de agora); sem "Ferir os heróis", as fichas ficam como estão.
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;

async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const A = (a, fn, arg) => a.F.evaluate(fn, arg);
const campo = (a, k) => a.F.locator(`#pane [data-k="${k}"]`);
async function aba(a, id) { await a.F.click('#tab-' + id); await a.F.waitForTimeout(180); }
async function botao(a, k) { await campo(a, k).click(); await a.F.waitForTimeout(220); }
const obj = (a, id) => A(a, id => { const o = __mundo.App.mapa.objs.find(o => o.id === id); return o ? JSON.parse(JSON.stringify(o)) : null; }, id);
const semAvisos = a => A(a, () => document.getElementById('toasts').replaceChildren());
const avisos = a => A(a, () => [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' | '));
const gb = (a, k) => a.F.locator(`dialog.gb [data-k="${k}"]`);
async function naBatalha(a, k) { await gb(a, k).click(); await a.F.waitForTimeout(230); }
const textoBatalha = a => A(a, () => { const c = document.querySelector('dialog.gb .gb-corpo'); return c ? c.innerText.replace(/\s+/g, ' ') : null; });
const bat = a => A(a, () => { const b = window.MundoGuerraPainel.batalha; return b ? JSON.parse(JSON.stringify(b)) : null; });
const d20 = k => (k - 0.5) / 20;
const dados = (a, v) => A(a, v => { let i = 0; __mundo.App.rng = () => v[i++ % v.length]; }, v);
const Y = 346.41;

// as fichas: Ana (nível 30, maior atributo 91: +6 e +7 → +7), Dain (nível 50, 130: +10) e Sombra (nível 10, 26: +2)
function ficha(nome, level, maior) {
  const pc = Object.assign(R.personagemPadrao(nome), { nome, level, modoAtr: 'livre', atrLivre: { FOR: maior, DES: 10, VIT: 10, CAN: 10, AGI: 10 }, recursos: [{ id: 'hp', nome: 'HP', fml: '100' }] });
  delete pc.id;
  return pc;
}
const FICHAS = [
  { id: 'pc1', nome: 'Ana', ficha: ficha('Ana', 30, 91), skills: {}, estado: { rec: { hp: 80 } }, campanha: null, ordem: 1 },
  { id: 'pc2', nome: 'Dain', ficha: ficha('Dain', 50, 130), skills: {}, estado: {}, campanha: null, ordem: 2 },
  { id: 'npc1', nome: 'Sombra', ficha: ficha('Sombra', 10, 26), skills: {}, estado: { rec: { hp: 50 } }, campanha: null, ordem: 3 },
];

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'herois', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame() };
  const foto = async nome => { if (process.env.TC_SCRATCH) await L.P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };

  await passo('o mapa, os exércitos e as fichas', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    await A(L, Y => {
      const { App, N } = __mundo;
      App.mudar('montar', m => {
        m.grade.tam = 40;
        m.faccoes.push({ id: 'fa', nome: 'Aldar', cor: '#3f7fbf' }, { id: 'fb', nome: 'Vale', cor: '#8a2a2a' });
        m.objs.push(Object.assign(N.objNovo('g', { x: 400, y: Y, sigla: 'EXE' }), { id: 'ga', nome: 'Hoste de Aldar', tipo: 'exercito', fac: 'fa', exe: { cmd: { nome: 'Rei', b: 0 }, moral: 5, mant: 50, unid: [{ id: 'u1', nome: 'Lanceiros', tropas: 500, atq: 3, def: 3 }] } }),
          Object.assign(N.objNovo('g', { x: 440, y: Y, sigla: 'EXE' }), { id: 'gb', nome: 'Legião do Vale', tipo: 'exercito', fac: 'fb', exe: { cmd: { nome: 'Duque', b: 0 }, moral: 5, mant: 50, unid: [{ id: 'u2', nome: 'Espadas', tropas: 500, atq: 3, def: 3 }] } }));
      });
    }, Y);
    // a mesa (o que ela daria): as fichas, com o gravar guardando o que mudou
    ok(await A(L, () => !!(window.TC && TC.rules && TC.dice)), '(as regras e os dados do site estão na página)');
    await A(L, fichas => {
      const linhas = new Map(fichas.map(l => [l.id, JSON.parse(JSON.stringify(l))])), gravados = [];
      window.__gravados = gravados; window.__linhas = linhas;
      const colP = { pronta: Promise.resolve(), todas: () => [...linhas.values()], pegar: id => linhas.get(id) || null,
        gravar: (id, campos) => { const l = Object.assign({}, linhas.get(id) || { id }, JSON.parse(JSON.stringify(campos))); linhas.set(id, l); gravados.push([id, JSON.parse(JSON.stringify(campos))]); return l; } };
      const colD = { pronta: Promise.resolve(), todas: () => [], pegar: () => null };
      TC.dados = { disponivel: () => true, col: n => (n === 'personagens' ? colP : colD) };
      __mundo.App.naMesa = true;
    }, FICHAS);
  });

  await passo('os heróis do exército', async () => {
    await aba(L, 'selecao');
    await A(L, () => __mundo.App.selecionar(['ga'])); await espera(300);
    ok(await campo(L, 'o:ga:heroi-novo').count() === 1 && /Os heróis lutam junto/.test(await A(L, () => document.getElementById('pane').innerText)), 'o exército tem a seção Heróis, com "+ Herói (uma ficha da mesa)…"');
    await campo(L, 'o:ga:heroi-novo').selectOption('pc1'); await espera(300);
    ok(j((await obj(L, 'ga')).exe.herois) === j([{ ficha: 'pc1' }]), 'pôr Ana: ela fica no exército');
    const linha = await A(L, () => (document.querySelector('#pane [data-k="o:ga:heroi:pc1"]') || {}).innerText || '');
    ok(/Ana/.test(linha) && /sugerido \+7 \(nível 30, maior atributo 91\)/.test(linha) && await campo(L, 'o:ga:heroi-b:pc1').getAttribute('placeholder') === '+7', 'o bônus sugerido pela ficha: +7 (nível 30: +6; maior atributo 91: +7): ' + linha.replace(/\s+/g, ' '));
    await campo(L, 'o:ga:heroi-b:pc1').fill('9'); await campo(L, 'o:ga:heroi-b:pc1').press('Enter'); await espera(250);
    ok((await obj(L, 'ga')).exe.herois[0].b === 9 && /vale o seu, \+9/.test(await A(L, () => (document.querySelector('#pane [data-k="o:ga:heroi:pc1"]') || {}).innerText || '')), 'escrever outro bônus (+9): fica no herói ("vale o seu, +9")');
    await campo(L, 'o:ga:heroi-b:pc1').fill(''); await campo(L, 'o:ga:heroi-b:pc1').press('Enter'); await espera(250);
    ok(!('b' in (await obj(L, 'ga')).exe.herois[0]), 'vazio: volta ao sugerido pela ficha');
    await campo(L, 'o:ga:heroi-novo').selectOption('npc1'); await espera(300);
    await botao(L, 'o:ga:heroi-x:npc1');
    ok(j((await obj(L, 'ga')).exe.herois) === j([{ ficha: 'pc1' }]), '"Tirar": o herói sai do exército');
    await foto('l9-herois-exercito');
  });

  await passo('os heróis na batalha', async () => {
    await A(L, () => __mundo.App.mudar('Ana nos dois', m => { m.objs.find(o => o.id === 'gb').exe.herois = [{ ficha: 'pc1' }]; }));   // (a mesma ficha nos dois exércitos)
    await botao(L, 'o:ga:batalha');
    ok(await A(L, () => !!document.querySelector('dialog.gb[open]')), '(a janela da batalha)');
    let txt = await textoBatalha(L);
    ok(/Ana \+7 pela ficha · do exército/.test(txt) && /Somam \+7 na Virada/.test(txt), 'os heróis do lado A: Ana (+7, do exército): ' + (txt.match(/Heróis.{0,200}/) || [''])[0]);
    ok(await gb(L, 'gb:heroi:a:pc1').count() === 1 && await gb(L, 'gb:heroi:b:pc1').count() === 0, 'a mesma ficha nos dois exércitos luta só do lado A');
    await gb(L, 'gb:heroi-novo:a').selectOption('pc2'); await espera(250);
    await gb(L, 'gb:heroi-novo:b').selectOption('npc1'); await espera(250);
    txt = await textoBatalha(L);
    ok(/Dain só nesta batalha/.test(txt) && await gb(L, 'gb:heroi-b:a:pc2').getAttribute('placeholder') === '+10' && await gb(L, 'gb:heroi-b:a:pc2').inputValue() === '' && /Somam \+10 \(passaram de \+17: o teto é \+10\) na Virada/.test(txt) && await gb(L, 'gb:heroi-b:b:npc1').getAttribute('placeholder') === '+2', 'Dain só nesta batalha (+10 pela ficha): o lado A soma +17, mas o teto é +10; Sombra no lado B (+2)');
    await gb(L, 'gb:heroi-b:a:pc2').fill('2'); await gb(L, 'gb:heroi-b:a:pc2').press('Enter'); await espera(250);
    txt = await textoBatalha(L);
    ok((await bat(L)).herois.a[0].b === 2 && /Somam \+9 na Virada/.test(txt), 'o bônus de Dain só nesta batalha, à mão (+2): o lado A soma +9');
    await gb(L, 'gb:heroi-b:a:pc2').fill('30'); await gb(L, 'gb:heroi-b:a:pc2').press('Enter'); await espera(250);
    ok((await bat(L)).herois.a[0].b === 2, '+30 não vale (de −20 a 20): fica o +2');
    await gb(L, 'gb:heroi-b:a:pc2').fill(''); await gb(L, 'gb:heroi-b:a:pc2').press('Enter'); await espera(250);
    txt = await textoBatalha(L);
    ok(!('b' in (await bat(L)).herois.a[0]) && /Somam \+10 \(passaram de \+17/.test(txt), 'vazio: volta ao da ficha (+10)');
    await naBatalha(L, 'gb:heroi-x:a:pc2');
    ok((await bat(L)).herois.a.length === 0 && await gb(L, 'gb:heroi:a:pc2').count() === 0 && /Somam \+7 na Virada/.test(await textoBatalha(L)), 'o × tira Dain desta batalha (o lado A volta a +7)');
    await gb(L, 'gb:heroi-novo:a').selectOption('pc2'); await espera(250);
    ok(/Heróis 2 \(\+10\) 1 \(\+2\)/.test(txt), 'na comparação, a linha dos heróis');
    ok(j((await bat(L)).herois) === j({ a: [{ ficha: 'pc2' }], b: [{ ficha: 'npc1' }] }) && j((await obj(L, 'ga')).exe.herois) === j([{ ficha: 'pc1' }]), 'os só desta batalha não vão para o exército');
    // a detalhada: a Abertura com um 1 (momento-chave) — a ação heroica de Dain
    await dados(L, [d20(1), d20(12)]);
    await naBatalha(L, 'gb:d20');
    let b = await bat(L);
    ok(b.moms[0].chave && await gb(L, 'gb:mom-heroica:0').count() === 1, 'no momento-chave: "Ação heroica…"');
    const ta0 = b.moms[0].ta;
    await naBatalha(L, 'gb:mom-heroica:0');
    ok(await gb(L, 'gb:fh-form').count() === 1, 'o formulário da ação heroica, dentro do momento');
    await gb(L, 'gb:fh-heroi').selectOption('pc2'); await espera(150);
    ok(/Força 130/.test(await gb(L, 'gb:fh-attr').innerText()), 'os atributos vêm da ficha (Força 130)');
    await gb(L, 'gb:fh-dif').fill('30');
    await semAvisos(L); await foto('l9-herois-form');
    await A(L, () => { window.__dados = TC.dice; TC.dice = Object.assign({}, TC.dice, { rollFixaMais: (v, f) => ({ ok: true, total: 75, dieValue: 60, fixa: 15, atributo: v }) }); }); // (o TC.dice é congelado: troca-se o objeto)
    await naBatalha(L, 'gb:fh-rolar');
    b = await bat(L);
    ok(b.acoes.length === 1 && b.acoes[0].v === 10 && b.acoes[0].ficha === 'pc2' && b.acoes[0].mom === 'ab' && b.moms[0].ta === ta0 + 10 && b.moms[0].da === 1, 'Dain rola Força contra 30 e tira 75 (o dobro): +10 na Abertura (o dado fica)');
    txt = await textoBatalha(L);
    ok(/Ação heroica de Dain: FOR 130 \(d115 60 \+ 15 = 75\) contra 30 — passou pelo dobro: \+10/.test(txt), 'o momento mostra a ação heroica: ' + (txt.match(/Ação heroica de Dain[^—]*—[^+−]*[+−]\d+/) || [''])[0]);
    await semAvisos(L); await foto('l9-herois-acao');
    await naBatalha(L, 'gb:acao-x:0');
    ok((await bat(L)).acoes.length === 0 && (await bat(L)).moms[0].ta === ta0, 'tirar a ação: volta');
    await naBatalha(L, 'gb:mom-heroica:0');
    await gb(L, 'gb:fh-heroi').selectOption('pc1'); await gb(L, 'gb:fh-dif').fill('30');
    await A(L, () => { TC.dice = Object.assign({}, window.__dados, { rollFixaMais: (v, f) => ({ ok: true, total: 20, dieValue: 5, fixa: 15, atributo: v }) }); });
    await naBatalha(L, 'gb:fh-rolar');
    b = await bat(L);
    ok(b.acoes.length === 1 && b.acoes[0].v === -2 && b.moms[0].ta === ta0 - 2, 'Ana falha (20 contra 30): −2');
    await A(L, () => { TC.dice = window.__dados; });
    // o Choque, a Virada (os heróis somam) e o Desfecho
    await dados(L, [d20(10), d20(10)]);
    await naBatalha(L, 'gb:proximo'); await naBatalha(L, 'gb:proximo');
    b = await bat(L);
    const vi = b.moms[2];
    ok(vi.k === 'vi' && vi.ba.some(x => x.k === 'herois' && x.v === 10) && vi.bb.some(x => x.k === 'herois' && x.v === 2) && !b.moms[1].ba.some(x => x.k === 'herois'), 'na Virada, "Heróis": +10 (o teto) para A e +2 para B; no Choque, não');
    await naBatalha(L, 'gb:proximo');
    b = await bat(L);
    ok(!!b.fim, '(a batalha acabou: ' + j(b.fim) + ')');
  });

  await passo('os ferimentos dos heróis', async () => {
    const b0 = await bat(L);
    await naBatalha(L, 'gb:depois');
    const vence = b0.fim.vence, pctA = vence === 'a' ? [5, 10, 7, 5, 3][b0.fim.tam] : vence === 'b' ? [5, 10, 20, 30, 40][b0.fim.tam] : 5, pctB = vence === 'b' ? [5, 10, 7, 5, 3][b0.fim.tam] : vence === 'a' ? [5, 10, 20, 30, 40][b0.fim.tam] : 5;
    const linhas = await A(L, () => [...document.querySelectorAll('dialog.gb [data-k^="gb:dep:heroi:"]')].map(e => e.innerText.replace(/\s+/g, ' ')));
    const dA = Math.round(100 * pctA / 100), dB = Math.round(100 * pctB / 100);
    ok(linhas.length === 3 && linhas.some(x => x.includes('Ana') && x.includes('80 → ' + (80 - dA)) && x.includes('−' + dA + ' (' + pctA + '%)')) && linhas.some(x => x.includes('Dain') && x.includes('100 → ' + (100 - dA))) && linhas.some(x => x.includes('Sombra') && x.includes('50 → ' + (50 - dB))),
      'no depois, o HP de cada herói, antes e depois (' + pctA + '% e ' + pctB + '% do HP máximo, pelo resultado): ' + j(linhas));
    ok(await gb(L, 'gb:ferir').isChecked(), '"Ferir os heróis (no HP da ficha)" vem marcado');
    await semAvisos(L); await foto('l9-herois-depois');
    await semAvisos(L);
    await naBatalha(L, 'gb:aplicar');
    const grav = await A(L, () => window.__gravados.map(([id, c]) => [id, c.estado && c.estado.rec ? c.estado.rec.hp : null]));
    ok(j(grav) === j([['pc1', 80 - dA], ['pc2', 100 - dA], ['npc1', 50 - dB]]), 'aplicar: o HP novo vai para a ficha de cada um: ' + j(grav));
    ok(/3 heróis feridos \(na ficha\)/.test(await avisos(L)), 'o aviso diz: ' + await avisos(L));
    const notas = await A(L, () => { const bs = __mundo.App.mapa.guerra.bats; return bs[bs.length - 1].notas; });
    ok(notas.length === 1 && /Ação heroica de Ana: FOR 91 .* contra 30 — falhou: −2 \(Abertura\)\./.test(notas[0]), 'a ação heroica vai para o histórico da batalha: ' + j(notas));
    const hpDe = () => A(L, () => ['pc1', 'pc2', 'npc1'].map(id => { const l = window.__linhas.get(id); return [id, l.estado && l.estado.rec ? l.estado.rec.hp : null]; }));
    const nBats = () => A(L, () => (__mundo.App.mapa.guerra || { bats: [] }).bats.length);
    await L.F.locator('#toasts .toast button', { hasText: 'Desfazer' }).first().click(); await espera(400);
    ok(j(await hpDe()) === j([['pc1', 80], ['pc2', 100], ['npc1', 50]]) && await nBats() === 0, 'o Desfazer do aviso: o mapa volta e o HP das fichas também: ' + j(await hpDe()));
    await A(L, () => __mundo.App.refazer()); await espera(300);
    ok(j(await hpDe()) === j([['pc1', 80 - dA], ['pc2', 100 - dA], ['npc1', 50 - dB]]) && await nBats() === 1, 'Refazer: a batalha volta, e os ferimentos também: ' + j(await hpDe()));
    // um dano numa cena, depois da batalha: o Desfazer devolve só o que a batalha tirou
    await A(L, () => { const l = window.__linhas.get('pc1'); TC.dados.col('personagens').gravar('pc1', { estado: Object.assign({}, l.estado, { rec: { hp: 30 } }) }); });
    await L.F.click('#btDesfazer'); await espera(400);
    ok(j(await hpDe()) === j([['pc1', 30 + dA], ['pc2', 100], ['npc1', 50]]) && await nBats() === 0, 'o Desfazer de cima também volta as fichas — e o dano que veio depois fica (Ana: 30 + ' + dA + '): ' + j(await hpDe()));
  });

  await passo('sem ferir os heróis', async () => {
    await A(L, () => { window.__gravados.length = 0; });
    await aba(L, 'guerra');
    await A(L, () => window.MundoGuerraPainel.abrirBatalha({ a: 'ga', b: 'gb' })); await espera(300);
    await dados(L, [0.5, 0.2]);
    await naBatalha(L, 'gb:d100');
    await naBatalha(L, 'gb:depois');
    await gb(L, 'gb:ferir').uncheck(); await espera(200);
    await naBatalha(L, 'gb:aplicar');
    ok((await A(L, () => window.__gravados.length)) === 0 && !/feridos/.test(await avisos(L)), 'sem "Ferir os heróis": as fichas ficam como estão');
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
