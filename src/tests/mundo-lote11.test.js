// Mapa-múndi, lote 11, pela interface:
//   · (parte 1a, SO=corte) a aba Corte (vazia, com o que ela é; as sete abas cabem); a casa nova (a janela; criar,
//     desfazer); o personagem novo (o cartão: o gênero, a casa, a facção e o cargo dela, o nascimento pela data do mundo,
//     o lugar, "os jogadores conhecem", o texto e a nota; os erros das datas); a lista por casa (a idade, o cargo, onde
//     está, "conhecido"); o filho (os pais; morto: em "Mortos", recolhido, e continua aberto); os cônjuges (dos dois
//     lados; tirar dos dois); os pais sem os descendentes; a casa (o chefe, o brasão com o editor do Clã, Cancelar); os
//     cargos da corte (renomear, criar, tirar — quem tinha fica sem —, voltar aos de começo); o filtro de facção; "Quem
//     está aqui" na cidade e no grupo; quem joga (só os conhecidos, os laços entre eles, sem a nota; quem está aqui);
//     tirar o personagem e a casa (com Desfazer); no celular.
//   · (parte 1b, SO=arvore) a árvore da família: a janela (as pessoas, os casais, os filhos; o morto e quem casou com
//     alguém da casa; as gerações), "−", "+" e "Ajustar", clicar abre o cartão (e salvar refaz a árvore), "Fechar",
//     quem joga (só os conhecidos, sem abrir o cartão), no celular.
//   · (parte 2a, SO=titulos) os títulos: "Casas | Títulos" na aba; os graus e a maioridade (renomear, subir, os erros,
//     voltar aos de começo); o título da região (o grau, a terra e o reino de começo, a prévia do nome, o titular e
//     desde quando), o da sub-região, o da facção (o governante em Reinos), o sem terra (os erros; o nome livre), o da
//     cidade (a titular menor de idade); trocar o titular (a caixa dos titulares de antes; o "desde" vira hoje;
//     desmarcada, não entra); o herdeiro escolhido, o regente, os pretendentes com o motivo, os titulares de antes e os
//     erros; o maior título junto do nome; os títulos no cartão do personagem; tirar um grau usado (o nome de antes);
//     o filtro; quem joga (só o que vai na projeção); tirar o título e tirar da corte a titular; no celular.
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
    ok(/^Corte Casas ?Títulos \+ Personagem \+ Casa Cargos da corte… Ninguém ainda\. Os personagens do mundo/.test(await textoPane(L)), 'vazia: os botões e o que é a corte');
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
    ok(/Casa do Vale “Firmes como a pedra” · 0 pessoas Árvore da família… Editar… Ninguém nesta casa ainda\./.test(await textoPane(L)) && await campo(L, 'casa:' + c1.casas[0].id + ':arvore').isDisabled(), 'na lista: a casa, o lema, quantas pessoas, "Árvore da família…" (sem ninguém, desligada) e "Editar…"');
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

  // ---------- (parte 1b) a árvore da família ----------
  if (parte('arvore')) await passo('a árvore da família', async () => {
    await A(L, () => {
      __mundo.App.mudar('uma família', m => {
        m.corte = { cargos: {}, casas: [{ id: 'ka', nome: 'Casa de Aldar', lema: 'Pela coroa', chefe: 'av' }],
          pessoas: [
            { id: 'av', nome: 'Rei Aldo', gen: 'h', casa: 'ka', fac: 'fa', nasc: { a: -60 }, morte: { a: -2 }, conj: ['ao'], ver: true },
            { id: 'ao', nome: 'Rainha Olga', gen: 'm', nasc: { a: -58 }, ver: true },
            { id: 'f1', nome: 'Príncipe Beto', gen: 'h', casa: 'ka', pais: ['av', 'ao'], nasc: { a: -30 }, conj: ['nr'], ver: true },
            { id: 'nr', nome: 'Nora Lia', gen: 'm', nasc: { a: -28 }, ver: false },
            { id: 'f2', nome: 'Princesa Cléo', gen: 'm', casa: 'ka', pais: ['av', 'ao'], nasc: { a: -27 }, ver: true },
            { id: 'n1', nome: 'Neto Davi', gen: 'h', casa: 'ka', pais: ['f1', 'nr'], nasc: { a: -5 }, ver: true },
            { id: 'n2', nome: 'Neta Eva', gen: 'm', casa: 'ka', pais: ['f1', 'nr'], nasc: { a: -3 }, ver: false }] };
      });
    });
    await aba(L, 'corte');
    await botao(L, 'casa:ka:arvore'); await L.F.waitForSelector('dialog.arv-dl[open]');
    const arv = () => A(L, () => { const d = document.querySelector('dialog.arv-dl[open]'); if (!d) return null; return { tit: d.querySelector('h2').textContent, caixas: [...d.querySelectorAll('.arv-p')].map(g => ({ id: g.dataset.p, cls: g.getAttribute('class'), txt: g.querySelector('.arv-nome').textContent + ' | ' + g.querySelector('.arv-anos').textContent })),
      casais: d.querySelectorAll('.arv-casal').length, filhos: d.querySelectorAll('.arv-filho').length, zoom: d.querySelector('[data-k="arv:zoom"]').textContent, w: Number(d.querySelector('svg.arv-svg').getAttribute('width')), cx: d.querySelector('[data-k="arv:caixa"]').clientWidth }; });
    let a0 = await arv();
    ok(a0.tit === 'Árvore da família: Casa de Aldar' && a0.caixas.length === 7 && a0.casais === 2 && a0.filhos === 4, '"Árvore da família…": a janela com as 7 pessoas (os membros e os cônjuges), os 2 casais e os 4 filhos: ' + j([a0.caixas.length, a0.casais, a0.filhos]));
    const cx = id => a0.caixas.find(c => c.id === id) || {};
    ok(/morto/.test(cx('av').cls) && cx('av').txt === '† Rei Aldo | -60 – -2' && cx('f1').txt === 'Príncipe Beto | n. -30' && /fora/.test(cx('ao').cls) && /fora/.test(cx('nr').cls) && !/fora/.test(cx('f1').cls),
      'o morto com a cruz e os anos; o vivo com o nascimento; quem casou com alguém da casa, de fora (borda tracejada): ' + j([cx('av').txt, cx('f1').txt]));
    const pos = await A(L, () => Object.fromEntries([...document.querySelectorAll('dialog.arv-dl[open] .arv-p')].map(g => [g.dataset.p, g.getAttribute('transform')])));
    const xy = id => (/translate\(([-\d.]+) ([-\d.]+)\)/.exec(pos[id]) || []).slice(1).map(Number);
    ok(xy('av')[1] === xy('ao')[1] && xy('f1')[1] > xy('av')[1] && xy('n1')[1] > xy('f1')[1] && xy('nr')[1] === xy('f1')[1] && Math.abs(xy('ao')[0] - xy('av')[0]) === 182,
      'as gerações de cima para baixo; o casal lado a lado (a nora na geração do príncipe)');
    ok(a0.w <= a0.cx && a0.zoom === '140%', 'de começo, ajustada à janela (a árvore pequena fica em 140%, o máximo do ajuste): ' + j([a0.w, a0.cx, a0.zoom]));
    await L.F.click('dialog.arv-dl[open] [data-k="arv:mais"]'); await L.F.click('dialog.arv-dl[open] [data-k="arv:mais"]'); await espera(100);
    const a1 = await arv();
    ok(parseInt(a1.zoom, 10) === parseInt(a0.zoom, 10) + 20 && a1.w > a0.w, '"+" duas vezes: 20% maior: ' + j([a0.zoom, a1.zoom]));
    await L.F.click('dialog.arv-dl[open] [data-k="arv:ajustar"]'); await espera(100);
    ok((await arv()).w <= (await arv()).cx && (await arv()).zoom === a0.zoom, '"Ajustar": volta ao tamanho que cabe');
    await semAvisos(L); await foto('l11-arvore');
    // clicar numa pessoa abre o cartão; salvar refaz a árvore (ela continua aberta)
    await L.F.click('dialog.arv-dl[open] .arv-p[data-p="n1"]'); await L.F.waitForSelector('dialog.ps-dl[open]');
    ok(await A(L, () => document.querySelector('dialog.ps-dl[open] h2').textContent) === 'Neto Davi', 'clicar no Davi abre o cartão dele (por cima da árvore)');
    await L.F.fill('dialog.ps-dl[open] [data-k="ps:nome"]', 'Neto Davi II'); await L.F.click('dialog.ps-dl[open] [data-k="ps:ok"]'); await espera(400);
    ok(await A(L, () => !!document.querySelector('dialog.arv-dl[open]') && /Neto Davi II/.test(document.querySelector('dialog.arv-dl[open] .arv-p[data-p="n1"]').textContent)), 'salvar: a árvore se refaz com o nome novo (e continua aberta)');
    await L.F.click('dialog.arv-dl[open] [data-k="arv:fechar"]'); await espera(250);
    ok(await A(L, () => !document.querySelector('dialog.arv-dl')), '"Fechar": a janela some');
    // quem joga: só os conhecidos, sem abrir o cartão
    await comoJogador(L, true);
    await aba(L, 'corte');
    await botao(L, 'casa:ka:arvore'); await L.F.waitForSelector('dialog.arv-dl[open]');
    const aj = await arv();
    ok(aj.caixas.length === 5 && !aj.caixas.some(c => c.id === 'nr' || c.id === 'n2') && aj.filhos === 3 && await A(L, () => !document.querySelector('dialog.arv-dl[open] .arv-p[role="button"]')) && /Só quem vocês conhecem\./.test(await A(L, () => document.querySelector('dialog.arv-dl[open] [data-k="arv:legenda"]').textContent)),
      'quem joga: a árvore só com os conhecidos (sem a nora nem a neta; o Davi pendurado só no pai), sem abrir cartão: ' + j(aj.caixas.map(c => c.id)));
    await L.F.click('dialog.arv-dl[open] [data-k="arv:fechar"]'); await espera(200);
    await comoJogador(L, false);
    // no celular: a janela cabe
    await L.P.setViewportSize({ width: 400, height: 820 }); await espera(400);
    await A(L, () => { window.MundoCortePainel.janelaArvore('ka'); }); await L.F.waitForSelector('dialog.arv-dl[open]');
    ok(await A(L, () => { const d = document.querySelector('dialog.arv-dl[open]'); return d.getBoundingClientRect().width <= window.innerWidth && d.scrollWidth <= d.clientWidth + 1; }), 'no celular, a janela da árvore cabe (a árvore rola por dentro)');
    await semAvisos(L); await foto('l11-arvore-celular');
    await L.F.click('dialog.arv-dl[open] [data-k="arv:fechar"]'); await espera(200);
    await L.P.setViewportSize({ width: 1400, height: 900 }); await espera(300);
  });

  // ---------- (parte 2a) os títulos ----------
  if (parte('titulos')) await passo('os títulos', async () => {
    await A(L, () => {
      const { App, N } = __mundo;
      App.mudar('títulos: o começo', m => {
        m.objs = m.objs.filter(o => o.k !== 'r');
        m.objs.push(Object.assign(N.objNovo('r', { pts: [[100, 100], [600, 100], [600, 600], [100, 600]] }), { id: 'r1', nome: 'Valmor', fac: 'fa' }),
          Object.assign(N.objNovo('r', { pts: [[150, 150], [300, 150], [300, 300]] }), { id: 'r2', nome: 'Pedra', pai: 'r1' }));
        m.corte = { cargos: {}, casas: [], titulos: [], pessoas: [
          { id: 'ana', nome: 'Ana do Vale', gen: 'm', fac: 'fa', nasc: { a: -30 }, onde: { t: 'm', id: 'c1' }, ver: true }, { id: 'caio', nome: 'Caio', gen: 'h', fac: 'fb', ver: true },
          { id: 'beto', nome: 'Beto', gen: 'h', ver: false }, { id: 'lia', nome: 'Lia', gen: 'm', nasc: { a: -5 }, ver: false }] };
      });
    });
    await aba(L, 'corte');
    const seg = await A(L, () => [...document.querySelectorAll('#pane [data-k^="corte:vista:"]')].map(b => b.textContent + ':' + b.getAttribute('aria-pressed')));
    ok(j(seg) === j(['Casas:true', 'Títulos:false']), 'no alto da aba: "Casas | Títulos" (de começo, as casas): ' + j(seg));
    await botao(L, 'corte:vista:titulos');
    ok(/^Corte Casas ?Títulos \+ Título Graus e maioridade… Nenhum título ainda\. Os títulos de nobreza/.test(await textoPane(L)) && await A(L, () => document.querySelector('#pane [data-k="corte:vista:titulos"]').getAttribute('aria-pressed')) === 'true',
      '"Títulos": vazio, com os botões e o que são os títulos: ' + (await textoPane(L)).slice(0, 160));
    // os graus e a maioridade
    await botao(L, 'tt:graus'); await L.F.waitForSelector('dialog.gr-dl[open]');
    const grs = () => A(L, () => [...document.querySelectorAll('dialog.gr-dl[open] .gr-lista .gr-linha')].map(l => [...l.querySelectorAll('input')].map(i => i.value).join('/')));
    ok(j(await grs()) === j(['Império/Imperador/Imperatriz/', 'Reino/Rei/Rainha/', 'Ducado/Duque/Duquesa/', 'Condado/Conde/Condessa/', 'Baronia/Barão/Baronesa/']) && await A(L, () => document.querySelector('dialog.gr-dl[open] [data-k="gr:maior"]').value) === '16',
      '"Graus e maioridade…": os de começo, do maior para o menor, e a maioridade (16)');
    const ultG = k => L.F.locator(dlg('.gr-lista .gr-linha')).last().locator('[data-k="' + k + '"]');
    await ultG('gr:nome').fill('Senhorio'); await ultG('gr:h').fill('Senhor'); await ultG('gr:m').fill('Senhora');
    await ultG('gr:sobe').click();
    await L.F.click(dlg('[data-k="gr:novo"]')); await L.F.click(dlg('[data-k="gr:ok"]')); await espera(120);
    const errGr = () => A(L, () => document.querySelector('dialog.gr-dl[open] .err').textContent);
    ok(await errGr() === 'Dê um nome a cada grau (ou tire o que está vazio).', 'o grau sem nome: não passa');
    await L.F.locator(dlg('.gr-lista .gr-linha')).last().locator('[data-k="gr:x"]').click();
    await L.F.fill(dlg('[data-k="gr:maior"]'), 'muitos'); await L.F.click(dlg('[data-k="gr:ok"]')); await espera(120);
    ok(await errGr() === 'A maioridade vai de 0 a 100 anos.', 'a maioridade que não é número: não passa');
    await L.F.fill(dlg('[data-k="gr:maior"]'), '18'); await L.F.click(dlg('[data-k="gr:ok"]')); await espera(350);
    let cc = await corte(L);
    ok(j((cc.graus || []).map(g => g.id + ':' + g.nome + ':' + g.h + ':' + g.m)) === j(['imperio:Império:Imperador:Imperatriz', 'reino:Reino:Rei:Rainha', 'ducado:Ducado:Duque:Duquesa', 'baronia:Senhorio:Senhor:Senhora', 'condado:Condado:Conde:Condessa'])
      && cc.maior === 18 && /Os graus estão salvos\./.test(await avisos(L)), 'salvar: a Baronia virou Senhorio e subiu um lugar; a maioridade 18: ' + j(cc.graus && cc.graus.map(g => g.nome)));
    await botao(L, 'tt:graus'); await L.F.waitForSelector('dialog.gr-dl[open]');
    ok(j(await grs()) === j(['Império/Imperador/Imperatriz/', 'Reino/Rei/Rainha/', 'Ducado/Duque/Duquesa/', 'Senhorio/Senhor/Senhora/', 'Condado/Conde/Condessa/']), 'de novo: os graus guardados, na ordem nova');
    await L.F.click(dlg('[data-k="gr:comeco"]')); await L.F.fill(dlg('[data-k="gr:maior"]'), '16'); await L.F.click(dlg('[data-k="gr:ok"]')); await espera(350);
    cc = await corte(L);
    ok(!('graus' in cc) && !('maior' in cc), '"Voltar aos de começo" e a maioridade de começo: nada fica guardado');
    // o título da região (no cartão dela)
    await aba(L, 'selecao'); await selecionar(L, 'r1');
    ok(/TÍTULO \+ Título desta região…/i.test(await textoPane(L)), 'no cartão da região: "Título", com "+ Título desta região…"');
    await botao(L, 'o:r1:titulo-novo'); await L.F.waitForSelector('dialog.tt-dl[open]');
    const ttv = k => A(L, x => document.querySelector('dialog.tt-dl[open] [data-k="' + x + '"]').value, k);
    const previa = () => A(L, () => document.querySelector('dialog.tt-dl[open] [data-k="tt:previa"]').textContent);
    ok(await ttv('tt:grau') === 'ducado' && await ttv('tt:preso') === 'r:r1' && await ttv('tt:fac') === 'fa' && await previa() === 'Ducado de Valmor · quem tem: Duque de Valmor ou Duquesa de Valmor',
      'o título novo da região: Ducado (a região de fora), preso a ela, do reino dela, com a prévia do nome: ' + await previa());
    ok(await A(L, () => document.querySelector('dialog.tt-dl[open] [data-k="tt:nome"]').closest('label').hidden && !document.querySelector('dialog.tt-dl[open] [data-k="tt:de"]').closest('label').hidden
      && document.querySelector('dialog.tt-dl[open] [data-k="tt:de"]').placeholder === 'de Valmor'), 'com grau: o "De quê" (vazio: "de Valmor"), sem o nome livre');
    await L.F.selectOption(dlg('[data-k="tt:tit"]'), 'ana');
    ok(await previa() === 'Ducado de Valmor · Ana do Vale: Duquesa de Valmor', 'a titular escolhida: a prévia com o título dela');
    await L.F.fill(dlg('[data-k="tt:desde:ano"]'), '-2');
    await L.F.click(dlg('[data-k="tt:ok"]')); await espera(350);
    cc = await corte(L);
    let t1 = cc.titulos[0];
    ok(t1 && t1.grau === 'ducado' && j(t1.preso) === j({ t: 'r', id: 'r1' }) && t1.fac === 'fa' && t1.tit === 'ana' && j(t1.desde) === j({ a: -2 }) && /O título Ducado de Valmor entrou na corte\./.test(await avisos(L)),
      'criar: o título com tudo o que foi escolhido: ' + j(t1));
    ok(/TÍTULO Ducado de Valmor Ana do Vale · desde ano -2/i.test(await textoPane(L)), 'no cartão da região: o título, a titular e desde quando');
    await semAvisos(L); await foto('l11-titulo-regiao');
    await selecionar(L, 'r2');
    await botao(L, 'o:r2:titulo-novo'); await L.F.waitForSelector('dialog.tt-dl[open]');
    ok(await ttv('tt:grau') === 'condado' && await ttv('tt:fac') === 'fa', 'a sub-região: Condado, do reino da região de fora');
    await L.F.click(dlg('[data-k="tt:nao"]')); await espera(200);
    ok((await corte(L)).titulos.length === 1, 'Cancelar: nada muda');
    // a lista dos títulos e o nome com o título
    await aba(L, 'corte');
    ok(/Aldar 1 título Ducado de Valmor Ana do Vale · desde ano -2/.test(await textoPane(L)), 'na lista dos títulos: por reino (Aldar), com a titular');
    await botao(L, 'corte:vista:casas');
    ok(/Ana do Vale, Duquesa de Valmor/.test(await textoPane(L)), 'nas casas: o maior título junto do nome');
    await botao(L, 'corte:vista:titulos');
    // trocar o titular: o de antes vai para os titulares de antes (a caixa, já marcada)
    await botao(L, 't:' + t1.id); await L.F.waitForSelector('dialog.tt-dl[open]');
    const caixaAntes = () => A(L, () => { const c0 = document.querySelector('dialog.tt-dl[open] [data-k="tt:antes"]'); return c0.closest('label').hidden ? null : { marcada: c0.checked, txt: c0.closest('label').textContent }; });
    ok(await caixaAntes() === null && await ttv('tt:desde:ano') === '-2', 'o cartão: a titular de sempre, sem a caixa dos titulares de antes');
    await L.F.selectOption(dlg('[data-k="tt:tit"]'), 'caio');
    const hj = await A(L, () => window.MundoCorte.hoje(__mundo.App.mapa)), ca = await caixaAntes();
    ok(ca && ca.marcada && ca.txt === 'Pôr Ana do Vale nos titulares de antes (até hoje)' && await ttv('tt:desde:ano') === String(hj.a) && await ttv('tt:desde:mes') === String(hj.m),
      'outro titular: a caixa (marcada) para pôr a Ana nos titulares de antes, e o "desde" vira hoje: ' + j(ca));
    await L.F.selectOption(dlg('[data-k="tt:tit"]'), 'ana');
    ok(await caixaAntes() === null && await ttv('tt:desde:ano') === '-2', 'de volta à Ana: a caixa some e o "desde" volta');
    await L.F.selectOption(dlg('[data-k="tt:tit"]'), 'caio');
    await L.F.click(dlg('[data-k="tt:ok"]')); await espera(350);
    t1 = (await corte(L)).titulos[0];
    ok(t1.tit === 'caio' && j(t1.desde) === j(hj) && t1.hist.length === 1 && t1.hist[0].p === 'ana' && j(t1.hist[0].de) === j({ a: -2 }) && j(t1.hist[0].ate) === j(hj),
      'salvar: o Caio, desde hoje; a Ana nos titulares de antes (de -2 até hoje): ' + j(t1.hist));
    await botao(L, 't:' + t1.id); await L.F.waitForSelector('dialog.tt-dl[open]');
    await L.F.click(dlg('[data-k="tt:ok"]')); await espera(350);
    ok(j((await corte(L)).titulos[0]) === j(t1), 'salvar de novo sem mexer: nada muda (o "até" da Ana guarda o mês e o dia)');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    t1 = (await corte(L)).titulos[0];
    ok(t1.tit === 'ana' && !t1.hist.length, 'desfazer: a Ana de volta, sem ninguém antes');
    await botao(L, 't:' + t1.id); await L.F.waitForSelector('dialog.tt-dl[open]');
    await L.F.selectOption(dlg('[data-k="tt:tit"]'), 'caio'); await L.F.uncheck(dlg('[data-k="tt:antes"]'));
    await L.F.click(dlg('[data-k="tt:ok"]')); await espera(350);
    t1 = (await corte(L)).titulos[0];
    ok(t1.tit === 'caio' && !t1.hist.length, 'a caixa desmarcada (foi só um engano): troca sem pôr a Ana nos titulares de antes');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    // o herdeiro escolhido, o regente, os pretendentes e os titulares de antes
    await botao(L, 't:' + t1.id); await L.F.waitForSelector('dialog.tt-dl[open]');
    const errTt = () => A(L, () => document.querySelector('dialog.tt-dl[open] .err').textContent);
    await L.F.selectOption(dlg('[data-k="tt:herd"]'), 'ana'); await L.F.click(dlg('[data-k="tt:ok"]')); await espera(120);
    ok(await errTt() === 'O herdeiro escolhido não pode ser o próprio titular.', 'o herdeiro escolhido não pode ser a própria titular');
    await L.F.selectOption(dlg('[data-k="tt:herd"]'), 'beto'); await L.F.selectOption(dlg('[data-k="tt:reg"]'), 'ana'); await L.F.click(dlg('[data-k="tt:ok"]')); await espera(120);
    ok(await errTt() === 'O regente não pode ser o próprio titular.', 'nem o regente');
    await L.F.selectOption(dlg('[data-k="tt:reg"]'), 'caio');
    await L.F.click(dlg('[data-k="tt:pret-novo"]')); await L.F.locator(dlg('[data-k="tt:pret"]')).last().selectOption('ana');
    await L.F.click(dlg('[data-k="tt:ok"]')); await espera(120);
    ok(await errTt() === 'O titular não pode ser pretendente do próprio título.', 'nem pretendente');
    await L.F.locator(dlg('[data-k="tt:pret"]')).last().selectOption('caio'); await L.F.locator(dlg('[data-k="tt:pret-mot"]')).last().fill('primo do duque');
    await L.F.click(dlg('[data-k="tt:pret-novo"]')); await L.F.locator(dlg('[data-k="tt:pret-mot"]')).last().fill('sem ninguém');
    await L.F.click(dlg('[data-k="tt:ok"]')); await espera(120);
    ok(await errTt() === 'Escolha quem é cada pretendente (ou tire a linha).', 'o motivo sem o pretendente: não passa');
    await L.F.locator(dlg('[data-k="tt:pret-x"]')).last().click();
    await L.F.click(dlg('[data-k="tt:hist-novo"]'));
    const hl = L.F.locator(dlg('.tt-hist')).last();
    ok(await hl.locator('[data-k="tt:hist-nome"]').isVisible(), 'o titular de antes novo: "Escrever o nome…", com a caixa do nome');
    await hl.locator('[data-k="tt:hist-de"]').fill('200'); await L.F.click(dlg('[data-k="tt:ok"]')); await espera(120);
    ok(await errTt() === 'Cada titular de antes precisa de um nome (ou tire a linha).', 'o titular de antes sem nome: não passa');
    await hl.locator('[data-k="tt:hist-nome"]').fill('Aldric I'); await hl.locator('[data-k="tt:hist-ate"]').fill('230');
    await L.F.fill(dlg('[data-k="tt:txt"]'), 'O velho ducado do rio.'); await L.F.fill(dlg('[data-k="tt:nota"]'), 'O Caio quer o ducado.');
    await L.F.click(dlg('[data-k="tt:ok"]')); await espera(350);
    t1 = (await corte(L)).titulos[0];
    ok(t1.herd === 'beto' && t1.reg === 'caio' && j(t1.pret) === j([{ p: 'caio', mot: 'primo do duque' }]) && j(t1.hist) === j([{ p: null, nome: 'Aldric I', de: { a: 200 }, ate: { a: 230 } }]) && t1.txt === 'O velho ducado do rio.' && t1.nota === 'O Caio quer o ducado.'
      && /Ducado de Valmor: salvo\./.test(await avisos(L)), 'salvar: o herdeiro escolhido, o regente, o pretendente com o motivo, o titular de antes (só o nome, com os anos), o texto e a nota: ' + j(t1));
    // o título da facção: o governante
    await aba(L, 'faccoes'); await L.F.click('#pane [data-k="fac:fa"]'); await espera(250);
    ok(/TÍTULOS DO REINO Nenhum título preso a esta facção\./i.test(await textoPane(L)), 'na facção: "Títulos do reino" (nenhum ainda)');
    await botao(L, 'f:fa:titulo-novo'); await L.F.waitForSelector('dialog.tt-dl[open]');
    ok(await ttv('tt:grau') === 'reino' && await ttv('tt:preso') === 'f:fa' && await ttv('tt:fac') === 'fa', 'o título novo da facção: Reino, preso a ela');
    await L.F.selectOption(dlg('[data-k="tt:tit"]'), 'ana'); await L.F.click(dlg('[data-k="tt:ok"]')); await espera(350);
    ok(/Governante: Ana do Vale, Rainha de Aldar/.test(await A(L, () => document.querySelector('#pane [data-k="fac:fa"]').innerText)), 'na lista dos reinos: o governante (quem tem o título da facção)');
    ok(/TÍTULOS DO REINO Reino de Aldar Ana do Vale/i.test(await textoPane(L)), 'e o título nos títulos do reino');
    await semAvisos(L); await foto('l11-titulos-reinos');
    // o título novo: o grau e o reino seguem a terra até a pessoa mexer neles
    await aba(L, 'corte');
    await botao(L, 'tt:novo'); await L.F.waitForSelector('dialog.tt-dl[open]');
    await L.F.selectOption(dlg('[data-k="tt:preso"]'), 'm:c1');
    ok(await ttv('tt:grau') === 'baronia' && await ttv('tt:fac') === 'fa', 'escolhida a cidade: Baronia, do reino dela');
    await L.F.selectOption(dlg('[data-k="tt:grau"]'), 'condado'); await L.F.selectOption(dlg('[data-k="tt:preso"]'), 'r:r1');
    ok(await ttv('tt:grau') === 'condado' && await ttv('tt:fac') === 'fa', 'o grau escolhido à mão não muda com a terra (o reino segue)');
    await L.F.selectOption(dlg('[data-k="tt:fac"]'), 'fb'); await L.F.selectOption(dlg('[data-k="tt:preso"]'), 'f:fa');
    ok(await ttv('tt:fac') === 'fb', 'nem o reino escolhido à mão');
    await L.F.click(dlg('[data-k="tt:nao"]')); await espera(200);
    // o título sem terra
    await botao(L, 'tt:novo'); await L.F.waitForSelector('dialog.tt-dl[open]');
    ok(await ttv('tt:grau') === '' && await ttv('tt:preso') === '' && await A(L, () => !document.querySelector('dialog.tt-dl[open] [data-k="tt:nome"]').closest('label').hidden), 'o título novo da lista: sem grau e sem terra (o nome livre)');
    await L.F.click(dlg('[data-k="tt:ok"]')); await espera(120);
    ok(await errTt() === 'Escreva o nome do título.', 'sem grau e sem nome: não passa');
    await L.F.selectOption(dlg('[data-k="tt:grau"]'), 'ducado'); await L.F.click(dlg('[data-k="tt:ok"]')); await espera(120);
    ok(await errTt() === 'Diga de quê é o título (ex.: “das Ilhas”) ou prenda-o a uma terra.', 'com grau, sem terra nem "de quê": não passa');
    await L.F.selectOption(dlg('[data-k="tt:grau"]'), ''); await L.F.fill(dlg('[data-k="tt:nome"]'), 'Grão-Mestre da Ordem');
    await L.F.selectOption(dlg('[data-k="tt:fac"]'), 'fb'); await L.F.selectOption(dlg('[data-k="tt:tit"]'), 'caio');
    ok(await previa() === 'Grão-Mestre da Ordem · Caio', 'a prévia do título sem grau: o nome e o titular');
    await L.F.click(dlg('[data-k="tt:ok"]')); await espera(350);
    ok(/Vale 1 título Grão-Mestre da Ordem Caio/.test(await textoPane(L)), 'na lista: no reino do Vale');
    // o título da cidade: a titular menor de idade
    await aba(L, 'selecao'); await selecionar(L, 'c1');
    ok(/QUEM ESTÁ AQUI Ana do Vale, Rainha de Aldar/i.test(await textoPane(L)), 'na cidade, "Quem está aqui": a Ana com o maior título');
    await botao(L, 'o:c1:titulo-novo'); await L.F.waitForSelector('dialog.tt-dl[open]');
    ok(await ttv('tt:grau') === 'baronia' && await ttv('tt:fac') === 'fa' && await previa() === 'Baronia de Vila Alta · quem tem: Barão de Vila Alta ou Baronesa de Vila Alta', 'o título novo da cidade: Baronia, do reino da região onde ela está: ' + await previa());
    await L.F.selectOption(dlg('[data-k="tt:tit"]'), 'lia'); await L.F.click(dlg('[data-k="tt:ok"]')); await espera(350);
    await aba(L, 'corte');
    ok(/Baronia de Vila Alta Lia menor/.test(await textoPane(L)), 'a titular menor de idade: "menor"');
    // o cartão do personagem: os títulos em que ele aparece
    await botao(L, 'corte:vista:casas');
    await L.F.click('#pane [data-k="p:ana"]'); await L.F.waitForSelector('dialog.ps-dl[open]');
    const tAna = await A(L, () => document.querySelector('dialog.ps-dl[open] [data-k="ps:titulos"]').innerText.replace(/\s+/g, ' '));
    ok(/^Títulos Rainha de Aldar Duquesa de Valmor \(desde ano -2\) Mudam no cartão de cada título/.test(tAna), 'no cartão da Ana: os títulos dela, do maior para o menor: ' + tAna);
    await L.F.click(dlg('[data-k="ps:nao"]')); await espera(200);
    await L.F.click('#pane [data-k="p:caio"]'); await L.F.waitForSelector('dialog.ps-dl[open]');
    const tCaio = await A(L, () => document.querySelector('dialog.ps-dl[open] [data-k="ps:titulos"]').innerText.replace(/\s+/g, ' '));
    ok(/Grão-Mestre da Ordem regente: Ducado de Valmor pretende: Ducado de Valmor \(primo do duque\)/.test(tCaio), 'no cartão do Caio: o título, a regência e a pretensão (com o motivo): ' + tCaio);
    await L.F.click(dlg('[data-k="ps:nao"]')); await espera(200);
    await L.F.click('#pane [data-k="p:beto"]'); await L.F.waitForSelector('dialog.ps-dl[open]');
    ok(/herdeiro escolhido: Ducado de Valmor/.test(await A(L, () => document.querySelector('dialog.ps-dl[open] [data-k="ps:titulos"]').innerText)), 'no cartão do Beto: herdeiro escolhido do ducado');
    await L.F.click(dlg('[data-k="ps:nao"]')); await espera(200);
    // tirar um grau usado: o título fica sem grau, com o nome de antes
    await botao(L, 'corte:vista:titulos');
    await botao(L, 'tt:graus'); await L.F.waitForSelector('dialog.gr-dl[open]');
    await L.F.locator(dlg('.gr-lista .gr-linha')).nth(2).locator('[data-k="gr:x"]').click();
    await L.F.click(dlg('[data-k="gr:ok"]')); await espera(350);
    const tv = (await corte(L)).titulos.find(x => x.id === t1.id);
    ok(tv.grau === null && tv.nome === 'Ducado de Valmor' && /Os graus estão salvos\. Um título ficou sem grau, com o nome de antes\./.test(await avisos(L)), 'tirar o grau Ducado: o título fica sem grau, com o nome de antes (e o aviso diz)');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    cc = await corte(L);
    ok(cc.titulos.find(x => x.id === t1.id).grau === 'ducado' && !('graus' in cc), 'desfazer: o grau de volta');
    // o filtro de facção
    await campo(L, 'corte:fac').selectOption('fb'); await espera(300);
    const filt = await textoPane(L);
    ok(/Grão-Mestre da Ordem/.test(filt) && !/Ducado de Valmor/.test(filt), 'o filtro do Vale: só os títulos do Vale');
    await campo(L, 'corte:fac').selectOption(''); await espera(300);
    await semAvisos(L); await foto('l11-titulos');
    await botao(L, 't:' + t1.id); await L.F.waitForSelector('dialog.tt-dl[open]');
    await semAvisos(L); await foto('l11-titulo-cartao');
    await L.F.click(dlg('[data-k="tt:nao"]')); await espera(200);
    // quem joga: os títulos das terras que eles veem e dos conhecidos; as pessoas só as conhecidas; sem a nota
    await comoJogador(L, true);
    await aba(L, 'corte');
    const pj = await textoPane(L);
    ok(/Ducado de Valmor Ana do Vale · desde ano -2 · regente: Caio pretendente: Caio \(primo do duque\) antes: Aldric I \(200 – 230\) O velho ducado do rio\./.test(pj) && !/quer o ducado/.test(pj) && !/Beto/.test(pj) && !/\+ Título/.test(pj),
      'quem joga: o título com a titular, o regente, o pretendente e os de antes (o herdeiro que eles não conhecem, não), o texto, sem a nota nem os botões: ' + pj.slice(0, 300));
    ok(/Baronia de Vila Alta sem titular conhecido/.test(pj) && /Reino de Aldar Ana do Vale/.test(pj) && /Grão-Mestre da Ordem Caio/.test(pj), 'a titular que eles não conhecem: "sem titular conhecido"; os outros títulos');
    await semAvisos(L); await foto('l11-titulos-jogador');
    await botao(L, 'corte:vista:casas');
    ok(/Ana do Vale, Rainha de Aldar/.test(await textoPane(L)), 'quem joga, nas casas: o maior título junto do nome');
    await aba(L, 'faccoes');
    ok(/Governante: Ana do Vale, Rainha de Aldar/.test(await textoPane(L)), 'quem joga vê o governante');
    await aba(L, 'selecao'); await selecionar(L, 'r1');
    const pr1 = await textoPane(L);
    ok(/TÍTULO Ducado de Valmor Ana do Vale/i.test(pr1) && !/\+ Título/.test(pr1), 'quem joga, no cartão da região: o título (sem o botão)');
    await comoJogador(L, false);
    // tirar o título (com Desfazer)
    await aba(L, 'corte'); await botao(L, 'corte:vista:titulos');
    const idBar = (await corte(L)).titulos.find(x => x.grau === 'baronia').id;
    await botao(L, 't:' + idBar); await L.F.waitForSelector('dialog.tt-dl[open]');
    await L.F.click(dlg('[data-k="tt:tirar"]')); await espera(250);
    ok(/Tirar o título Baronia de Vila Alta\?/.test(await A(L, () => document.querySelector('dialog.mundo-dl[open]').innerText)), 'tirar o título: pergunta antes');
    await L.F.click('dialog.mundo-dl[open] button[type="submit"]'); await espera(350);
    ok(!(await corte(L)).titulos.some(x => x.id === idBar) && /O título Baronia de Vila Alta saiu\./.test(await avisos(L)), 'confirmado: o título sai (com o aviso)');
    await L.F.locator('#toasts button', { hasText: 'Desfazer' }).click(); await espera(350);
    ok((await corte(L)).titulos.some(x => x.id === idBar), 'Desfazer: ele volta');
    // tirar da corte a titular: o título fica vago
    await botao(L, 'corte:vista:casas');
    await L.F.click('#pane [data-k="p:lia"]'); await L.F.waitForSelector('dialog.ps-dl[open]');
    await L.F.click(dlg('[data-k="ps:tirar"]')); await espera(250);
    ok(/Os títulos que tem ficam vagos\./.test(await A(L, () => document.querySelector('dialog.mundo-dl[open]').innerText)), 'tirar da corte quem tem título: avisa que os títulos ficam vagos');
    await L.F.click('dialog.mundo-dl[open] button[type="submit"]'); await espera(350);
    ok((await corte(L)).titulos.find(x => x.id === idBar).tit === null, 'confirmado: a baronia fica vaga');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    // no celular: as janelas cabem
    await L.P.setViewportSize({ width: 400, height: 820 }); await espera(400);
    await A(L, id => { window.MundoCortePainel.janelaTitulo(id); }, t1.id); await L.F.waitForSelector('dialog.tt-dl[open]');
    ok(await A(L, () => { const d = document.querySelector('dialog.tt-dl[open]'); return d.scrollWidth <= d.clientWidth + 1 && d.getBoundingClientRect().width <= window.innerWidth; }), 'no celular, o cartão do título cabe na largura');
    await semAvisos(L); await foto('l11-titulo-celular');
    await L.F.click(dlg('[data-k="tt:nao"]')); await espera(200);
    await A(L, () => { window.MundoCortePainel.janelaGraus(); }); await L.F.waitForSelector('dialog.gr-dl[open]');
    ok(await A(L, () => { const d = document.querySelector('dialog.gr-dl[open]'); return d.scrollWidth <= d.clientWidth + 1 && d.getBoundingClientRect().width <= window.innerWidth; }), 'no celular, os graus cabem na largura');
    await L.F.click(dlg('[data-k="gr:nao"]')); await espera(200);
    await L.P.setViewportSize({ width: 1400, height: 900 }); await espera(300);
    await aba(L, 'corte');
    if (await A(L, () => document.querySelector('#pane [data-k="corte:vista:casas"]').getAttribute('aria-pressed') !== 'true')) await botao(L, 'corte:vista:casas');
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
