// Mapa-múndi, lote 11, pela interface:
//   · (parte 1a, SO=corte) a aba Corte (vazia, com o que ela é; as sete abas cabem); a casa nova (a janela; criar,
//     desfazer); o personagem novo (o cartão: o gênero, a casa, a facção e o cargo dela, o nascimento pela data do mundo,
//     o lugar, "os jogadores conhecem", o texto e a nota; os erros das datas); a lista por casa (a idade, o cargo, onde
//     está, "conhecido"); o filho (os pais; morto: em "Mortos", recolhido, e continua aberto); os cônjuges (dos dois
//     lados; tirar dos dois); os pais sem os descendentes; a casa (o chefe, o brasão com o editor do Clã, Cancelar); os
//     cargos da corte (renomear, criar, tirar — quem tinha fica sem —, voltar aos de começo); o filtro de facção; "Quem
//     está aqui" na cidade e no grupo; quem joga (só os conhecidos, os laços entre eles, sem a nota; quem está aqui);
//     tirar o personagem e a casa (com Desfazer); no celular.
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;

async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const A = (a, fn, arg) => a.F.evaluate(fn, arg);
const campo = (a, k) => a.F.locator(`#pane [data-k="${k}"]`);
async function aba(a, id) { await a.F.click('#tab-' + id); await a.F.waitForTimeout(180); }
async function semAvisos(a) { await A(a, () => document.getElementById('toasts').replaceChildren()); }
async function botao(a, k) { await semAvisos(a); await a.F.click(`#pane [data-k="${k}"]`); await a.F.waitForTimeout(220); }
const selecionar = async (a, id) => { await A(a, x => __mundo.App.selecionar(x ? [x] : []), id); await espera(250); };
const avisos = a => A(a, () => document.getElementById('toasts').innerText);
const SO = (process.env.SO || '').split(',').filter(Boolean), parte = k => !SO.length || SO.includes(k);
const textoPane = a => A(a, () => document.getElementById('pane').innerText.replace(/\s+/g, ' '));
const comoJogador = async (a, sim) => { await A(a, s => { __mundo.App.comoJogador = s; __mundo.App.emit('muda', { origem: 'fora' }); }, sim); await espera(400); };
const corte = a => A(a, () => JSON.parse(JSON.stringify(__mundo.App.mapa.corte || null)));
const dlg = s => 'dialog.mundo-dl[open] ' + s;

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'lote11', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame() };
  const foto = async nome => { if (process.env.TC_SCRATCH) await L.P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };

  await passo('o mapa', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    await A(L, () => {
      const { App, N } = __mundo;
      App.mudar('montar', m => {
        m.cal.dia = 0;
        m.faccoes.push({ id: 'fa', nome: 'Aldar', cor: '#3f7fbf' }, { id: 'fb', nome: 'Vale', cor: '#8a2a2a' });
        m.objs.push(Object.assign(N.objNovo('m', { x: 400, y: 400, ic: 'cidade' }), { id: 'c1', nome: 'Vila Alta' }),
          Object.assign(N.objNovo('g', { x: 700, y: 500, sigla: 'HO' }), { id: 'g1', nome: 'Hoste' }));
      });
    });
    ok(await A(L, () => !!__mundo.App.mapa && __mundo.App.mapa.objs.length === 2), '(o mapa: duas facções, uma cidade e um grupo)');
  });

  if (parte('corte')) await passo('a corte', async () => {
    // a aba
    ok((await L.F.locator('#tab-corte').innerText()).trim() === 'Corte', 'a aba Corte, depois de Reinos');
    ok(await A(L, () => { const t0 = document.getElementById('tabs'); return t0.scrollWidth <= t0.clientWidth + 1; }), 'as sete abas cabem na largura do painel');
    await aba(L, 'corte');
    ok(/^Corte \+ Personagem \+ Casa Cargos da corte… Ninguém ainda\. Os personagens do mundo/.test(await textoPane(L)), 'vazia: os botões e o que é a corte');
    // a casa nova
    await botao(L, 'corte:casa-nova'); await L.F.waitForSelector('dialog.cs-dl[open]');
    ok(await A(L, () => document.querySelector('dialog.cs-dl[open] [data-k="cs:chefe"]').disabled), 'a casa nova: sem membros, sem chefe para escolher');
    await L.F.click(dlg('[data-k="cs:ok"]')); await espera(150);
    ok(await A(L, () => document.querySelector('dialog.cs-dl[open] .err').textContent) === 'Escreva o nome da casa.', 'sem o nome: não cria (e diz por quê)');
    await L.F.fill(dlg('[data-k="cs:nome"]'), 'Casa do Vale'); await L.F.fill(dlg('[data-k="cs:lema"]'), 'Firmes como a pedra');
    await L.F.click(dlg('[data-k="cs:ok"]')); await espera(350);
    const c1 = await corte(L);
    ok(c1 && c1.casas.length === 1 && c1.casas[0].nome === 'Casa do Vale' && c1.casas[0].lema === 'Firmes como a pedra' && /A casa Casa do Vale entrou na corte\./.test(await avisos(L)), 'criar: a casa entra (com o aviso)');
    const idCasa = c1.casas[0].id;
    ok(/Casa do Vale “Firmes como a pedra” · 0 pessoas Editar… Ninguém nesta casa ainda\./.test(await textoPane(L)), 'na lista: a casa, o lema, quantas pessoas e "Editar…"');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    ok(!(await corte(L)), 'desfazer: a casa sai');
    await A(L, () => __mundo.App.refazer()); await espera(300);
    // o personagem novo
    await botao(L, 'corte:nova'); await L.F.waitForSelector('dialog.ps-dl[open]');
    ok(await A(L, () => document.querySelector('dialog.ps-dl[open] [data-k="ps:cargo"]').disabled), 'o cartão novo: sem facção, o cargo fica travado');
    await L.F.fill(dlg('[data-k="ps:nome"]'), 'Ana do Vale');
    await L.F.selectOption(dlg('[data-k="ps:gen"]'), 'm');
    await L.F.selectOption(dlg('[data-k="ps:casa"]'), idCasa);
    await L.F.selectOption(dlg('[data-k="ps:fac"]'), 'fa');
    const cargos = await A(L, () => [...document.querySelectorAll('dialog.ps-dl[open] [data-k="ps:cargo"] option')].map(o => o.textContent));
    ok(j(cargos) === j(['Nenhum', 'Conselheiro', 'Marechal', 'Tesoureiro', 'Espião-mestre', 'Sacerdote', 'Embaixador']), 'com a facção: os cargos de começo dela: ' + j(cargos));
    await L.F.selectOption(dlg('[data-k="ps:cargo"]'), 'marechal');
    // as datas: os erros
    await L.F.fill(dlg('[data-k="ps:nasc:dia"]'), '5'); await L.F.click(dlg('[data-k="ps:ok"]')); await espera(120);
    const errDe = () => A(L, () => document.querySelector('dialog.ps-dl[open] .err').textContent);
    ok(await errDe() === 'O nascimento: escreva o ano.', 'o dia sem o ano: não passa');
    await L.F.fill(dlg('[data-k="ps:nasc:ano"]'), '-30'); await L.F.click(dlg('[data-k="ps:ok"]')); await espera(120);
    ok(await errDe() === 'O nascimento: o dia precisa do mês.', 'o dia sem o mês: não passa');
    await L.F.selectOption(dlg('[data-k="ps:nasc:mes"]'), '1'); await L.F.fill(dlg('[data-k="ps:nasc:dia"]'), '99'); await L.F.click(dlg('[data-k="ps:ok"]')); await espera(120);
    ok(/^O nascimento: o dia vai de 1 a \d+\.$/.test(await errDe()), 'o dia fora do mês: não passa: ' + await errDe());
    await L.F.fill(dlg('[data-k="ps:nasc:dia"]'), '5');
    await L.F.selectOption(dlg('[data-k="ps:onde"]'), 'm:c1');
    await L.F.check(dlg('[data-k="ps:ver"]'));
    await L.F.fill(dlg('[data-k="ps:txt"]'), 'A marechal de Aldar.'); await L.F.fill(dlg('[data-k="ps:nota"]'), 'Trama contra o rei.');
    await L.F.click(dlg('[data-k="ps:ok"]')); await espera(350);
    const ana = (await corte(L)).pessoas[0];
    ok(ana && ana.nome === 'Ana do Vale' && ana.gen === 'm' && ana.casa === idCasa && ana.fac === 'fa' && ana.cargo === 'marechal' && j(ana.nasc) === j({ a: -30, m: 1, d: 5 }) && j(ana.onde) === j({ t: 'm', id: 'c1' }) && ana.ver === true && ana.nota === 'Trama contra o rei.'
      && /Ana do Vale entrou na corte\./.test(await avisos(L)), 'criar: o personagem com tudo o que foi escolhido: ' + j(ana));
    const idade = await A(L, id => window.MundoCorte.idadeDe(__mundo.App.mapa, window.MundoCorte.pessoaDe(__mundo.App.mapa, id)), ana.id);
    const linhaAna = await A(L, id => document.querySelector('#pane [data-k="p:' + id + '"]').innerText.replace(/\s+/g, ' '), ana.id);
    ok(linhaAna === 'Ana do Vale ' + idade + ' anos · Marechal de Aldar · em Vila Alta conhecido', 'na lista: o nome, a idade, o cargo, onde está e "conhecido": ' + linhaAna);
    // o filho (morto) e o cônjuge
    const novo = async (nome, campos) => {
      await botao(L, 'corte:nova'); await L.F.waitForSelector('dialog.ps-dl[open]');
      await L.F.fill(dlg('[data-k="ps:nome"]'), nome);
      for (const [k, v] of campos) { if (k.endsWith(':ano') || k.endsWith(':dia') || k === 'ps:txt') await L.F.fill(dlg('[data-k="' + k + '"]'), v); else if (k === 'ps:morreu' || k === 'ps:ver') await L.F.check(dlg('[data-k="' + k + '"]')); else await L.F.selectOption(dlg('[data-k="' + k + '"]'), v); }
      await L.F.click(dlg('[data-k="ps:ok"]')); await espera(350);
      return (await corte(L)).pessoas.find(p => p.nome === nome);
    };
    await botao(L, 'corte:nova'); await L.F.waitForSelector('dialog.ps-dl[open]');
    await L.F.fill(dlg('[data-k="ps:nome"]'), 'Bento'); await L.F.fill(dlg('[data-k="ps:nasc:ano"]'), '-2');
    await L.F.check(dlg('[data-k="ps:morreu"]')); await L.F.fill(dlg('[data-k="ps:morte:ano"]'), '-5'); await L.F.click(dlg('[data-k="ps:ok"]')); await espera(120);
    ok(await errDe() === 'A morte vem antes do nascimento.', 'a morte antes do nascimento: não passa');
    await L.F.click(dlg('[data-k="ps:nao"]')); await espera(200);
    const bento = await novo('Bento', [['ps:gen', 'h'], ['ps:casa', idCasa], ['ps:pai0', ana.id], ['ps:nasc:ano', '-2'], ['ps:morreu', ''], ['ps:morte:ano', '0']]);
    ok(bento && j(bento.pais) === j([ana.id]) && j(bento.morte) === j({ a: 0 }), 'o filho: a mãe escolhida, morto no ano 0');
    const mortos = () => A(L, k => { const d = document.querySelector('#pane [data-k="casa:' + k + ':mortos"]'); return d ? { aberto: d.open, txt: d.innerText.replace(/\s+/g, ' ') } : null; }, idCasa);
    ok((await mortos()) && !(await mortos()).aberto && /^Mortos \(1\)/.test((await mortos()).txt), 'o morto fica em "Mortos (1)", recolhido');
    await L.F.click('#pane [data-k="casa:' + idCasa + ':mortos"] > summary'); await espera(150);
    await A(L, () => __mundo.App.emit('muda', { origem: 'fora' })); await espera(250);
    ok((await mortos()).aberto && /Bento † ano 0 \(aos 2 anos\)/.test((await mortos()).txt), 'aberto, mostra o morto (a data e a idade na morte) e continua aberto quando o painel se refaz: ' + (await mortos()).txt);
    // o cônjuge: dos dois lados (e tirar, dos dois)
    await botao(L, 'corte:nova'); await L.F.waitForSelector('dialog.ps-dl[open]');
    await L.F.fill(dlg('[data-k="ps:nome"]'), 'Caio'); await L.F.selectOption(dlg('[data-k="ps:gen"]'), 'h'); await L.F.selectOption(dlg('[data-k="ps:fac"]'), 'fb');
    await L.F.click(dlg('[data-k="ps:conj-novo"]')); await L.F.selectOption(dlg('[data-k="ps:conj"]'), ana.id);
    await L.F.selectOption(dlg('[data-k="ps:onde"]'), 'g:g1'); await L.F.check(dlg('[data-k="ps:ver"]'));
    await L.F.click(dlg('[data-k="ps:ok"]')); await espera(350);
    let cc = await corte(L), caio = cc.pessoas.find(p => p.nome === 'Caio');
    ok(caio && j(caio.conj) === j([ana.id]) && j(cc.pessoas.find(p => p.id === ana.id).conj) === j([caio.id]), 'o cônjuge escolhido no cartão do Caio vale dos dois lados');
    await L.F.click('#pane [data-k="p:' + caio.id + '"]'); await L.F.waitForSelector('dialog.ps-dl[open]');
    await L.F.click(dlg('[data-k="ps:conj-x"]')); await L.F.click(dlg('[data-k="ps:ok"]')); await espera(350);
    cc = await corte(L);
    ok(!cc.pessoas.find(p => p.id === caio.id).conj.length && !cc.pessoas.find(p => p.id === ana.id).conj.length, 'tirar o cônjuge: sai dos dois lados');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    ok((await corte(L)).pessoas.find(p => p.id === ana.id).conj.includes(caio.id), '(desfazer: casados de novo)');
    // os pais: sem os descendentes (ninguém é antepassado de si mesmo)
    await L.F.click('#pane [data-k="p:' + ana.id + '"]'); await L.F.waitForSelector('dialog.ps-dl[open]');
    const opPais = await A(L, () => [...document.querySelectorAll('dialog.ps-dl[open] [data-k="ps:pai0"] option')].map(o => o.textContent));
    ok(!opPais.some(t0 => /Bento/.test(t0)) && !opPais.some(t0 => /Ana/.test(t0)) && opPais.some(t0 => /Caio/.test(t0)), 'no cartão da Ana, os pais não oferecem ela mesma nem o filho dela: ' + j(opPais));
    await L.F.click(dlg('[data-k="ps:nao"]')); await espera(200);
    // a casa: o chefe e o brasão (com o editor do Clã); Cancelar não muda
    await botao(L, 'casa:' + idCasa + ':editar'); await L.F.waitForSelector('dialog.cs-dl[open]');
    const opChefe = await A(L, () => [...document.querySelectorAll('dialog.cs-dl[open] [data-k="cs:chefe"] option')].map(o => o.textContent));
    ok(j(opChefe) === j(['Ninguém', 'Ana do Vale', 'Bento (†)']), 'o chefe: um dos membros (o morto marcado): ' + j(opChefe));
    await L.F.selectOption(dlg('[data-k="cs:chefe"]'), ana.id);
    await L.F.click(dlg('[data-k="cs:br-editar"]')); await L.F.waitForSelector('dialog.band-dl[open]');
    ok(await A(L, () => document.querySelector('dialog.band-dl[open] h2').textContent) === 'O brasão de Casa do Vale' && await A(L, () => document.querySelector('dialog.band-dl[open] [data-k="band:ok"]').textContent) === 'Criar o brasão',
      '"Criar o brasão…": o editor do Clã, com o nome da casa');
    await L.F.click('dialog.band-dl[open] [data-simb="torre"]'); await L.F.click('dialog.band-dl[open] [data-k="band:ok"]'); await espera(250);
    ok(await A(L, () => !!document.querySelector('dialog.cs-dl[open] [data-k="cs:br"] svg') && document.querySelector('dialog.cs-dl[open] [data-k="cs:br-editar"]').textContent === 'Editar o brasão…'), 'o brasão aparece na janela da casa (nada salvo ainda)');
    ok(!(await corte(L)).casas[0].br, '(nada mudou na casa ainda)');
    await L.F.click(dlg('[data-k="cs:ok"]')); await espera(350);
    const casa1 = (await corte(L)).casas[0];
    ok(casa1.chefe === ana.id && casa1.br && casa1.br.simb === 'torre' && /Casa do Vale: salva\./.test(await avisos(L)), 'salvar: o chefe e o brasão (com a torre)');
    ok(await A(L, k => !!document.querySelector('#pane [data-k="casa:' + k + '"] .corte-br svg'), idCasa) && /Casa do Vale “Firmes como a pedra” · chefe: Ana do Vale · 2 pessoas/.test(await textoPane(L)), 'na lista: o brasão, o lema, o chefe e as pessoas');
    await botao(L, 'casa:' + idCasa + ':editar'); await L.F.waitForSelector('dialog.cs-dl[open]');
    await L.F.fill(dlg('[data-k="cs:nome"]'), 'Outro nome'); await L.F.click(dlg('[data-k="cs:nao"]')); await espera(250);
    ok((await corte(L)).casas[0].nome === 'Casa do Vale', 'Cancelar: nada muda');
    await semAvisos(L); await foto('l11-corte-lista');
    // os cargos da corte
    await botao(L, 'corte:cargos'); await L.F.waitForSelector('dialog.cg-dl[open]');
    ok(await A(L, () => document.querySelector('dialog.cg-dl[open] [data-k="cg:fac"]').value) === 'fa' && await A(L, () => document.querySelectorAll('dialog.cg-dl[open] [data-k="cg:nome"]').length) === 6, 'os cargos de Aldar: os 6 de começo');
    await L.F.locator(dlg('[data-k="cg:nome"]')).nth(1).fill('Grão-marechal');
    await L.F.locator(dlg('[data-k="cg:x"]')).nth(5).click();
    await L.F.click(dlg('[data-k="cg:novo"]')); await L.F.locator(dlg('[data-k="cg:nome"]')).last().fill('Bobo da corte');
    await L.F.click(dlg('[data-k="cg:ok"]')); await espera(350);
    const cg = (await corte(L)).cargos.fa || [];
    ok(j(cg.map(x => x.nome)) === j(['Conselheiro', 'Grão-marechal', 'Tesoureiro', 'Espião-mestre', 'Sacerdote', 'Bobo da corte']) && cg[1].id === 'marechal', 'salvar: renomeado, tirado e criado (o marechal continua o mesmo cargo): ' + j(cg.map(x => x.nome)));
    ok(/Grão-marechal de Aldar/.test(await A(L, id => document.querySelector('#pane [data-k="p:' + id + '"]').innerText, ana.id)), 'a Ana com o nome novo do cargo');
    await botao(L, 'corte:cargos'); await L.F.waitForSelector('dialog.cg-dl[open]');
    await L.F.locator(dlg('[data-k="cg:x"]')).nth(1).click(); await L.F.click(dlg('[data-k="cg:ok"]')); await espera(350);
    ok((await corte(L)).pessoas.find(p => p.id === ana.id).cargo === null, 'tirar o cargo dela: a Ana fica sem cargo');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    await botao(L, 'corte:cargos'); await L.F.waitForSelector('dialog.cg-dl[open]');
    await L.F.click(dlg('[data-k="cg:comeco"]')); await L.F.click(dlg('[data-k="cg:ok"]')); await espera(350);
    ok(!((await corte(L)).cargos.fa) && (await corte(L)).pessoas.find(p => p.id === ana.id).cargo === 'marechal' && /Marechal de Aldar/.test(await textoPane(L)), '"Voltar aos de começo": a lista guardada sai (a Ana volta a ser Marechal)');
    // o filtro de facção
    await campo(L, 'corte:fac').selectOption('fb'); await espera(300);
    const filtrada = await textoPane(L);
    ok(/Sem casa .*Caio/.test(filtrada) && !/Casa do Vale/.test(filtrada) && !/Ana do Vale/.test(filtrada), 'o filtro do Vale: só o Caio (a casa sem gente do Vale some)');
    await campo(L, 'corte:fac').selectOption(''); await espera(300);
    // quem está aqui (na cidade e no grupo)
    await aba(L, 'selecao'); await selecionar(L, 'c1');
    ok(/QUEM ESTÁ AQUI Ana do Vale/i.test(await textoPane(L)) && await campo(L, 'o:c1:aqui').count() === 1, 'na cidade: "Quem está aqui", com a Ana');
    await botao(L, 'aqui:' + ana.id); await L.F.waitForSelector('dialog.ps-dl[open]');
    ok(await A(L, () => document.querySelector('dialog.ps-dl[open] h2').textContent) === 'Ana do Vale', 'clicar abre o cartão dela');
    await L.F.click(dlg('[data-k="ps:nao"]')); await espera(200);
    await selecionar(L, 'g1');
    ok(/QUEM ESTÁ AQUI Caio/i.test(await textoPane(L)), 'no grupo: o Caio');
    await aba(L, 'corte');
    const abasW = await A(L, () => { const t0 = document.getElementById('tabs'); return [t0.scrollWidth, t0.clientWidth, !document.querySelector('#tab-selecao .n').hidden]; });
    ok(abasW[0] <= abasW[1] + 1 && abasW[2], 'as sete abas cabem também com o número da seleção: ' + j(abasW));
    await aba(L, 'selecao');
    // quem joga: só os conhecidos
    await comoJogador(L, true);
    await aba(L, 'corte');
    const pj = await textoPane(L);
    ok(/Ana do Vale/.test(pj) && /Caio/.test(pj) && !/Bento/.test(pj) && !/Trama/.test(pj) && /esposa de Caio/.test(pj) && /A marechal de Aldar\./.test(pj) && !/\+ Personagem/.test(pj),
      'quem joga: só os conhecidos (sem o Bento), os laços entre eles, o texto público, sem a nota nem os botões: ' + pj.slice(0, 260));
    await semAvisos(L); await foto('l11-corte-jogador');
    await aba(L, 'selecao'); await selecionar(L, 'c1');
    ok(/QUEM ESTÁ AQUI Ana do Vale/i.test(await textoPane(L)), 'quem joga, na cidade: quem está aqui');
    await comoJogador(L, false);
    // tirar o personagem e a casa (com Desfazer)
    await aba(L, 'corte');
    await L.F.click('#pane [data-k="casa:' + idCasa + ':mortos"] > summary').catch(() => {});
    await espera(150);
    if (!(await A(L, k => document.querySelector('#pane [data-k="casa:' + k + ':mortos"]').open, idCasa))) await L.F.click('#pane [data-k="casa:' + idCasa + ':mortos"] > summary');
    await L.F.click('#pane [data-k="p:' + bento.id + '"]'); await L.F.waitForSelector('dialog.ps-dl[open]');
    await L.F.click(dlg('[data-k="ps:tirar"]')); await espera(250);
    ok(/Tirar Bento da corte\?/.test(await A(L, () => document.querySelector('dialog.mundo-dl[open]').innerText)), 'tirar: pergunta antes');
    await L.F.click('dialog.mundo-dl[open] button[type="submit"]'); await espera(350);
    ok(!(await corte(L)).pessoas.some(p => p.id === bento.id) && /Bento saiu da corte\./.test(await avisos(L)), 'confirmado: o Bento sai (com o aviso)');
    await L.F.locator('#toasts button', { hasText: 'Desfazer' }).click(); await espera(350);
    ok((await corte(L)).pessoas.some(p => p.id === bento.id), 'Desfazer: ele volta');
    await botao(L, 'casa:' + idCasa + ':editar'); await L.F.waitForSelector('dialog.cs-dl[open]');
    await L.F.click(dlg('[data-k="cs:tirar"]')); await espera(250);
    ok(/As 2 pessoas dela ficam sem casa \(continuam na corte\)\./.test(await A(L, () => document.querySelector('dialog.mundo-dl[open]').innerText)), 'tirar a casa: diz que as pessoas ficam sem casa');
    await L.F.click('dialog.mundo-dl[open] button[type="submit"]'); await espera(350);
    cc = await corte(L);
    ok(!cc.casas.length && cc.pessoas.every(p => p.casa === null) && /A casa Casa do Vale saiu\./.test(await avisos(L)), 'confirmado: a casa sai e os membros ficam sem casa');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    ok((await corte(L)).casas.length === 1 && (await corte(L)).pessoas.find(p => p.id === ana.id).casa === idCasa, 'Desfazer: a casa e os membros de volta');
    // no celular: o cartão cabe
    await L.P.setViewportSize({ width: 400, height: 820 }); await espera(400);
    await A(L, id => { window.MundoCortePainel.janelaPessoa(id); }, ana.id); await L.F.waitForSelector('dialog.ps-dl[open]');
    ok(await A(L, () => { const d = document.querySelector('dialog.ps-dl[open]'); return d.scrollWidth <= d.clientWidth + 1 && d.getBoundingClientRect().width <= window.innerWidth; }), 'no celular, o cartão cabe na largura');
    await semAvisos(L); await foto('l11-corte-celular');
    await L.F.click(dlg('[data-k="ps:nao"]')); await espera(200);
    await L.P.setViewportSize({ width: 1400, height: 900 }); await espera(300);
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
