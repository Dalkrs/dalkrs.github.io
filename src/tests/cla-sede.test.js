// A Sede do clã (lote 30), na aba Clã, sem mesa (a página sozinha: quem abre é o mestre, tudo fica neste navegador):
//   · o cartão da Sede no painel do clã; "Montar a Sede" abre a tela (as plantas prontas, o terreno, o painel);
//   · pôr um prédio: clicar na planta e no terreno, e arrastar da planta até o terreno; o que não cabe não entra (o aviso);
//     o prédio liga sozinho à construção do clã do mesmo tipo (o nome dela);
//   · mover arrastando (encaixa; em cima de outro, volta); o painel: o nome, a construção, o nível (a planta troca), a
//     sugestão quando a construção do Clã está em outro nível, girar, outra planta, tirar; Desfazer em cada passo;
//   · em volta: a muralha (pontos e Enter), o portão, o poço e o jardim; Esc cancela;
//   · o terreno (o tamanho; diminuir com peça de fora não deixa), o chão, o estilo, "os jogadores veem";
//   · o salão (como os jogadores veem): a parte Sede, com a planta, só quando os jogadores a veem;
//   · recarregar guarda; o documento cla:sede:<id> passa pela normalização (tc/sede.js).
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const N = require('../../cla/nucleo.js');
const S = require('../../tc/sede.js');
const j = JSON.stringify;
const espera = ms => new Promise(r => setTimeout(r, ms));
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }

const lobos = N.claNovo('Lobos de Urgm', 0, true);
lobos.construcoes = N.normConstrucoes([{ id: 'ct_forja', nome: 'Forja do clã', ico: 'forja', nivel: 2 }, { id: 'ct_salao', nome: 'Salão dos Lobos', ico: 'salao', nivel: 1 }]);
const corvos = N.claNovo('Corvos', 1, false);
const local = j({ 'cla:c:cl_lobos': lobos, 'cla:c:cl_corvos': corvos });

(async () => {
  const t = await start();
  const dv = await t.device({ name: 'sede', w: 1500, h: 980, seed: { 'tinycats:cla:local': local, 'tinycats:cla:vista': 'mestre' } });
  const P = dv.page;
  P.setDefaultTimeout(8000);
  const A = (fn, arg) => P.evaluate(fn, arg);
  const k = s => P.locator(`[data-k="${s}"]`);
  const foto = async nome => { if (process.env.TC_SCRATCH) await P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };
  const sede = () => A(() => __cla.doc('cla:sede:cl_lobos'));
  const rotulo = () => A(() => { const p = __cla.pilha; return p.length ? p[p.length - 1] : null; });
  const avisos = () => A(() => [...document.querySelectorAll('#toasts .toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const limpar = () => A(() => document.getElementById('toasts').replaceChildren());
  // o ponto da tela de um quadrado (x, y) do terreno
  const tela = async (x, y) => A(([x, y]) => { const s = document.querySelector('[data-k="sede:mapa"] > svg'), r = s.getBoundingClientRect(), vb = s.viewBox.baseVal; return { x: r.left + x * 20 / vb.width * r.width, y: r.top + y * 20 / vb.height * r.height }; }, [x, y]);
  const clicarEm = async (x, y) => { const p = await tela(x, y); await P.mouse.click(p.x, p.y); await espera(250); };

  await P.goto(t.base + 'cla/?debug&tudo', { waitUntil: 'load' });
  await P.waitForFunction(() => window.__cla && __cla.pronto, null, { timeout: 15000 }); await espera(300);

  await passo('o cartão e a tela', async () => {
    await P.click('[data-cla="cl_lobos"]'); await espera(250);
    ok(await k('sec:sede').count() === 1 && /Montar a Sede/.test(await k('sede:abrir').innerText()), 'o painel do clã tem o cartão da Sede (sem sede ainda: “Montar a Sede”)');
    await k('sede:abrir').click(); await espera(300);
    ok(await A(() => __cla.sedeAberta) === 'cl_lobos' && await k('sede-ed:cl_lobos').count() === 1, 'abre a tela da Sede');
    const plantas = await A(() => [...document.querySelectorAll('.planta-card .pc-tx b')].map(x => x.textContent));
    ok(j(plantas) === j(['Salão do clã', 'Quartel', 'Forja', 'Templo', 'Estábulo', 'Torre']), 'as plantas prontas: ' + j(plantas));
    ok(j(await A(() => [...document.querySelectorAll('.pc-chips .chip-b')].map(x => x.textContent))) === j(['Muralha', 'Portão', 'Estrada', 'Poço', 'Jardim']), 'e o que vai em volta');
    ok(await k('sede:tam').count() === 1 && await k('sede:chao').count() === 1 && await k('sede:estilo').count() === 1, 'sem nada escolhido, o painel do terreno');
    ok(await k('sede:cenas').isDisabled(), '“Ver nas Cenas” só dentro do site');
  });

  await passo('pôr um prédio', async () => {
    await k('pl:forja:n2').click(); await espera(150);
    await k('pl:forja:pegar').click(); await espera(200);
    ok(await k('sede:dica').count() === 1 && /Forja \(nível 2\)/.test(await k('sede:dica').innerText()), 'clicar na planta: a dica diz o que vai entrar');
    await clicarEm(8, 8);
    const s = await sede();
    ok(s && s.predios.length === 1 && s.predios[0].tipo === 'forja' && s.predios[0].nivel === 2 && s.predios[0].planta.W === 9, 'clicar no terreno põe a Forja (nível 2, 9 × 7)');
    ok(s.predios[0].cons === 'ct_forja' && s.predios[0].nome === 'Forja do clã', 'ligada sozinha à construção do clã do mesmo tipo (com o nome dela)');
    ok(s.predios[0].x === 4 && s.predios[0].y === 5, 'centrada onde clicou (encaixada nos quadrados): ' + j([s.predios[0].x, s.predios[0].y]));
    ok(await rotulo() === 'pôr forja na sede' && /Forja do clã entrou na sede\./.test(await avisos()), 'um passo de desfazer, com o aviso');
    ok(await k('pr:nome').inputValue() === 'Forja do clã', 'o prédio novo fica escolhido (o painel dele)');
    await limpar();
    // arrastar da planta até o terreno
    const de = await k('pl:salao:pegar').boundingBox(), para = await tela(26, 14);
    await P.mouse.move(de.x + 30, de.y + 15); await P.mouse.down(); await P.mouse.move(para.x - 40, para.y, { steps: 6 }); await P.mouse.move(para.x, para.y, { steps: 4 });
    ok(await A(() => !!document.querySelector('.sede-svg .fantasma')), 'arrastando: a sombra do prédio segue o mouse');
    await P.mouse.up(); await espera(300);
    const s2 = await sede();
    ok(s2.predios.length === 2 && s2.predios[1].tipo === 'salao' && s2.predios[1].cons === 'ct_salao', 'soltar no terreno põe o Salão (ligado ao Salão dos Lobos)');
    // em cima de outro: não entra
    await k('pl:quartel:pegar').click(); await espera(150);
    const forja = (await sede()).predios[0];
    await clicarEm(forja.x + 4, forja.y + 3);
    ok((await sede()).predios.length === 2 && /Não cabe aí/.test(await avisos()), 'em cima de outro prédio não entra (o aviso)');
    await P.keyboard.press('Escape'); await espera(150);
    ok(await k('sede:dica').count() === 0, 'Esc cancela');
    await foto('sede-dois-predios');
  });

  await passo('mover', async () => {
    const f = (await sede()).predios[0];
    const a = await tela(f.x + 2, f.y + 2), b = await tela(f.x + 2 + 3, f.y + 2 + 12);
    await P.mouse.move(a.x, a.y); await P.mouse.down(); await P.mouse.move(b.x, b.y, { steps: 8 }); await P.mouse.up(); await espera(300);
    const f2 = (await sede()).predios[0];
    ok(f2.x === f.x + 3 && f2.y === f.y + 12 && await rotulo() === 'mover na sede', 'arrastar move (encaixado): ' + j([f.x, f.y, f2.x, f2.y]));
    const sal = (await sede()).predios[1], c = await tela(f2.x + 2, f2.y + 2), d = await tela(sal.x + 3, sal.y + 3);
    await P.mouse.move(c.x, c.y); await P.mouse.down(); await P.mouse.move(d.x, d.y, { steps: 8 }); await P.mouse.up(); await espera(300);
    const f3 = (await sede()).predios[0];
    ok(f3.x === f2.x && f3.y === f2.y && /voltou para onde estava/.test(await avisos()), 'em cima de outro: volta');
    await limpar();
  });

  await passo('o painel do prédio', async () => {
    const f = (await sede()).predios[0];
    await clicarEm(f.x + 1, f.y + 1);
    await k('pr:nome').fill('Forja Velha'); await k('pr:nome').dispatchEvent('change'); await espera(200);
    ok((await sede()).predios[0].nome === 'Forja Velha', 'renomear');
    ok(await k('pr:sugestao').count() === 0, 'a Forja do clã está no nível 2, como a planta: sem sugestão');
    await k('pr:nivel:3').click(); await espera(250);
    const f2 = (await sede()).predios[0];
    ok(f2.nivel === 3 && f2.planta.W === 12 && f2.planta.H === 8, 'o nível 3: a planta troca (12 × 8)');
    ok(await k('pr:sugestao').count() === 1 && /nível 2/.test(await k('pr:sugestao').innerText()) && await A(() => !!document.querySelector('.sede-svg .sobe')), 'a construção do Clã está no nível 2: a sugestão (no painel e um selo na planta)');
    await k('pr:usar-sug').click(); await espera(250);
    ok((await sede()).predios[0].nivel === 2 && await k('pr:sugestao').count() === 0, '“Usar a planta do nível 2” troca de volta');
    const antes = (await sede()).predios[0].planta;
    await k('pr:girar').click(); await espera(250);
    const gp = (await sede()).predios[0].planta;
    ok(gp.W === antes.H && gp.H === antes.W && gp.porta.lado === 'o', 'girar: a planta deita (a porta vai para a esquerda)');
    const seed0 = (await sede()).predios[0].seed;
    await k('pr:outra').click(); await espera(250);
    ok((await sede()).predios[0].seed !== seed0, '“Outra planta” sorteia outra');
    await A(() => document.querySelector('[data-k="btDesfazer"], #btDesfazer').click()); await espera(250);
    ok((await sede()).predios[0].seed === seed0, 'Desfazer volta a planta');
    await foto('sede-painel-predio');
  });

  await passo('o construtor', async () => {
    const pr = (await sede()).predios[0];
    await k('pr:construtor').click(); await espera(300);
    ok(await A(() => !!document.getElementById('construtor') && !document.getElementById('construtor').hidden) && await k('cs:andar:t').count() === 1, 'abre o construtor, no térreo');
    // o ponto da tela de uma casa (i, j) da planta
    const cel = async (i, jj, fx, fy) => A(([i, jj, fx, fy]) => { const s = document.querySelector('[data-k="cs:svg"]'), r = s.getBoundingClientRect(), vb = s.viewBox.baseVal; return { x: r.left + ((i + (fx == null ? 0.5 : fx)) * 34 - vb.x) / vb.width * r.width, y: r.top + ((jj + (fy == null ? 0.5 : fy)) * 34 - vb.y) / vb.height * r.height }; }, [i, jj, fx, fy]);
    const clicarCel = async (i, jj, fx, fy) => { const p = await cel(i, jj, fx, fy); await P.mouse.click(p.x, p.y); await espera(220); };
    const planta = async () => (await sede()).predios.find(x => x.id === pr.id).planta;
    const andar = async id => (await planta()).andares.find(a => a.id === id);
    // uma casa livre (num cômodo, sem móvel nem escada, longe das portas)
    const livre = async id => { const a = await andar(id), pl = await planta(); for (const q of a.salas) for (let jj = q.y + 1; jj < q.y + q.h - 1; jj++) for (let i = q.x + 1; i < q.x + q.w - 1; i++) if (!a.moveis.some(m => i >= m.x && i < m.x + m.s && jj >= m.y && jj < m.y + m.s) && !a.escadas.some(e => e.x === i && e.y === jj)) return [i, jj]; return null; };
    // um móvel
    await k('cs:f:movel').click(); await espera(150);
    await k('cs:m:bau').click(); await espera(120);
    const n0 = (await andar('t')).moveis.length, [bi, bj] = await livre('t');
    await clicarCel(bi, bj);
    const t1 = await andar('t');
    ok(t1.moveis.length === n0 + 1 && t1.moveis.some(m => m.id === 'bau' && m.x === bi && m.y === bj) && await rotulo() === 'pôr baú', 'Móvel: o baú entra onde clicou');
    // escolher, arrastar e girar
    await k('cs:f:sel').click(); await espera(120);
    const [li, lj] = await livre('t');
    const de = await cel(bi, bj), para = await cel(li, lj);
    await P.mouse.move(de.x, de.y); await P.mouse.down(); await P.mouse.move(para.x, para.y, { steps: 6 }); await P.mouse.up(); await espera(300);
    ok((await andar('t')).moveis.some(m => m.id === 'bau' && m.x === li && m.y === lj), 'Escolher: arrastar move o baú');
    await P.keyboard.press('r'); await espera(250);
    ok((await andar('t')).moveis.find(m => m.id === 'bau' && m.x === li && m.y === lj).rot === 90, 'R gira (90°)');
    // uma porta numa parede de dentro (põe e tira)
    const S0 = require('../../tc/sede.js'), pl0 = await planta(), paredes = S0.paredes(pl0.andares.find(a => a.id === 't'), pl0.W, pl0.H);
    const dentro = paredes.find(w => !w.fora && w.k === 'wall' && (w.x2 - w.x1 + w.y2 - w.y1) >= 2);
    if (dentro) {
      await k('cs:f:porta').click(); await espera(120);
      const hz = dentro.y1 === dentro.y2, ii = hz ? dentro.x1 : dentro.x1, jj = hz ? dentro.y1 : dentro.y1;
      await clicarCel(ii, jj, hz ? 0.5 : 0, hz ? 0 : 0.5);
      const ab = (await andar('t')).aberturas.find(o => o.x1 === ii && o.y1 === jj && o.k === 'door');
      ok(!!ab && await rotulo() === 'pôr uma porta', 'Porta: clicar numa parede põe a porta');
      await clicarCel(ii, jj, hz ? 0.5 : 0, hz ? 0 : 0.5);
      ok(!(await andar('t')).aberturas.some(o => o.x1 === ii && o.y1 === jj && o.x2 === (hz ? ii + 1 : ii)), 'clicar de novo tira');
    } else ok(false, '(a planta devia ter uma parede de dentro)');
    // o piso
    await k('cs:f:piso').click(); await espera(120);
    await k('cs:piso:ladrilho').click(); await espera(120);
    const q0 = (await andar('t')).salas[0];
    await clicarCel(q0.x + 1, q0.y + 1);
    ok((await andar('t')).salas[0].piso === 'ladrilho', 'Piso: o cômodo ganha o ladrilho');
    // um andar novo (com a escada)
    await k('cs:mais-andar').click(); await espera(300);
    const pl1 = await planta(), um = pl1.andares.find(a => a.id === '1'), ter = pl1.andares.find(a => a.id === 't');
    ok(!!um && um.salas.length === ter.salas.length && um.escadas.length === 1 && um.escadas[0].para === 't' && ter.escadas.some(e => e.para === '1' && e.x === um.escadas[0].x && e.y === um.escadas[0].y), '+ Andar: o 1º andar, com os cômodos do térreo e a escada ligando os dois no mesmo lugar');
    ok(await k('cs:andar:1').getAttribute('aria-pressed') === 'true', 'e o construtor vai para o 1º andar');
    // apagar um cômodo e fazer outro no lugar (encostado no vizinho: a porta sai sozinha)
    const vitima = um.salas.find(q => !q.x) || um.salas[0];
    await k('cs:f:apagar').click(); await espera(120);
    await clicarCel(vitima.x + Math.floor(vitima.w / 2), vitima.y + Math.floor(vitima.h / 2));
    ok((await andar('1')).salas.length === um.salas.length - 1, 'Apagar: o cômodo sai');
    await k('cs:f:comodo').click(); await espera(120);
    const a0 = await cel(vitima.x, vitima.y), a1 = await cel(vitima.x + vitima.w - 1, vitima.y + vitima.h - 1);
    await P.mouse.move(a0.x, a0.y); await P.mouse.down(); await P.mouse.move(a1.x, a1.y, { steps: 6 }); await P.mouse.up(); await espera(300);
    const um2 = await andar('1'), novo = um2.salas.find(q => q.x === vitima.x && q.y === vitima.y && q.w === vitima.w && q.h === vitima.h);
    ok(!!novo && novo.papel === 'vazio' && await rotulo() === 'fazer um cômodo', 'Cômodo: arrastar faz o cômodo de novo');
    ok(um2.aberturas.length >= 1, 'e a parede com o vizinho ganha a porta');
    await foto('sede-construtor');
    // salvar como planta
    await k('cs:salvar').click(); await espera(200);
    await P.fill('#dlg [data-k="dl:nome"]', 'Forja com sótão'); await P.click('#dlg [data-k="dl:sim"]'); await espera(300);
    const salvas = await A(() => __cla.doc('cla:plantas'));
    ok(salvas && salvas.lista.length === 1 && salvas.lista[0].nome === 'Forja com sótão' && salvas.lista[0].planta.andares.length === 2, 'Salvar como planta: fica na mesa (com os dois andares)');
    // Desfazer dentro do construtor
    const antesU = (await andar('1')).salas.length;
    await k('cs:desfazer').click(); await espera(250);
    ok(await rotulo() !== 'salvar a planta Forja com sótão', '(Desfazer tira o último passo)');
    await k('cs:fechar').click(); await espera(300);
    ok(await A(() => document.getElementById('construtor').hidden) && (await sede()).predios[0].mexido === true, 'Fechar: de volta à Sede; a planta ficou marcada como mexida');
    ok(antesU >= 1, '(o 1º andar tinha cômodos)');
    // a planta salva em "Minhas plantas" (desfeita, ela some; refeita pelo nome de novo)
    await k('pr:construtor').click(); await espera(250);
    await k('cs:salvar').click(); await espera(200);
    await P.fill('#dlg [data-k="dl:nome"]', 'Forja com sótão'); await P.click('#dlg [data-k="dl:sim"]'); await espera(300);
    await k('cs:fechar').click(); await espera(300);
    const idSalva = (await A(() => __cla.doc('cla:plantas'))).lista[0].id;
    ok(await k('ps:' + idSalva).count() === 1, 'a planta salva aparece em “Minhas plantas”, na Sede');
    await limpar();
  });

  await passo('em volta', async () => {
    await k('pl:muralha').click(); await espera(150);
    for (const [x, y] of [[1, 1], [39, 1], [39, 29]]) await clicarEm(x, y);
    await P.keyboard.press('Enter'); await espera(250);
    const m = (await sede()).estruturas.find(e => e.k === 'muralha');
    ok(m && j(m.pts) === j([[1, 1], [39, 1], [39, 29]]) && await rotulo() === 'pôr a muralha na sede', 'a muralha: os pontos e Enter');
    await k('pl:poco').click(); await espera(120); await clicarEm(20, 26);
    await k('pl:jardim').click(); await espera(120); await clicarEm(32, 25);
    await k('pl:portao').click(); await espera(120); await clicarEm(20, 1);
    const es = (await sede()).estruturas.map(e => e.k);
    ok(j(es) === j(['muralha', 'poco', 'jardim', 'portao']), 'o poço, o jardim e o portão: ' + j(es));
    await foto('sede-em-volta');
  });

  await passo('o terreno', async () => {
    await A(() => { const b = document.querySelector('[data-k="pr:soltar"], [data-k="es:soltar"]'); if (b) b.click(); }); await espera(200);
    await k('sede:tam').selectOption('32x24'); await espera(250);
    ok((await sede()).W === 40 && /Não dá para diminuir/.test(await avisos()), 'diminuir com peças que ficariam de fora não deixa');
    await k('sede:tam').selectOption('60x44'); await espera(250);
    ok((await sede()).W === 60 && (await sede()).H === 44, 'o terreno Grande (60 × 44)');
    await k('sede:chao').selectOption('neve'); await espera(200);
    await k('sede:estilo').selectOption('nordico'); await espera(200);
    const s = await sede();
    ok(s.terreno === 'neve' && s.estilo === 'nordico', 'o chão e o estilo');
    ok(await k('sede:jog').count() === 1, 'no clã dos jogadores, eles veem a planta (o aviso)');
  });

  await passo('o salão', async () => {
    await k('sede:voltar').click(); await espera(250);
    ok(await A(() => __cla.sedeAberta) === null && await k('sede:mini').count() === 1 && /Abrir a Sede/.test(await k('sede:abrir').innerText()), 'de volta ao painel: a miniatura da sede');
    await P.click('[data-vista="salao"]'); await espera(300);
    ok(await P.locator('#abas [data-aba="sede"]').count() === 1, 'no salão, a parte Sede (os jogadores veem)');
    await P.click('#abas [data-aba="sede"]'); await espera(250);
    ok(await k('sede-ver').count() === 1 && await k('sede-ver-svg').count() === 1 && !(await k('sede:cenas').count()), 'a planta, só para ver');
    await foto('sede-salao');
    await P.click('[data-cla="cl_corvos"]'); await espera(250);
    ok(await P.locator('#abas [data-aba="sede"]').count() === 0, 'um clã sem sede: sem a parte Sede');
    await P.click('[data-vista="mestre"]'); await espera(250);
  });

  await passo('recarregar', async () => {
    await P.reload({ waitUntil: 'load' }); await P.waitForFunction(() => window.__cla && __cla.pronto, null, { timeout: 15000 }); await espera(300);
    const s = await sede();
    ok(s && s.predios.length === 2 && s.estruturas.length === 4 && s.W === 60 && j(S.normSede(s)) === j(s), 'recarregada, a sede volta inteira (e já normalizada)');
  });

  const erros = (dv.errs || []).filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
