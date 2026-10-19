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
//   · (parte 2b, SO=sucessao) a sucessão: a regra do reino na facção (guardar, desfazer, "o mestre escolhe" trava o
//     gênero, a de começo não fica guardada); no cartão do título, a regra (a do reino com o nome) e a linha de sucessão
//     que muda na hora (homens primeiro, o herdeiro escolhido, "o mestre escolhe", antiguidade); a morte de quem não tem
//     título (sem prévia); a morte do rei (a prévia sozinha: os herdeiros, a partilha, a chefia, a caixa do Jornal;
//     "Agora não"); "Fazer a sucessão…" no cartão do título (a herdeira menor de idade, com regente), aplicar (os
//     titulares de antes, a chefia, a notícia no rascunho do Jornal), desfazer e refazer (com o Jornal), "Fazer a
//     sucessão…" no cartão do morto, no celular.
//   · (parte 3a, SO=diplomacia) as abas em duas fileiras (o mapa e a política; cabem; quem joga, as dele); a aba
//     Diplomacia: os pares de facções, a relação (dos dois lados), a opinião de cada lado (os motivos com o prazo, a soma
//     na hora, os erros), os tratados (o novo, os erros, três partes, o vencido), os tipos (renomear, criar, voltar aos
//     de começo), encerrar e reabrir, tirar com Desfazer, o filtro, quem joga (a relação, os públicos, sem a opinião nem
//     a facção escondida), no celular.
//   · (parte 3b, SO=vassalagem) a vassalagem: a janela (os erros: sem as facções, a mesma, o círculo, a que já é vassala,
//     o tributo sem quantidade), criar com o tributo (na lista, no par, em Reinos), mudar, Desfazer; as trocas por semana no
//     cartão do tratado (a troca nova, os erros, a facção que sai e volta; na lista); a prévia da semana (a coluna
//     "Trocas", o tributo que não dá para pagar inteiro, desmarcar refaz as contas; o tratado que vence: renovar, o erro
//     do prazo; o motivo que vence; aplicar num passo de Desfazer); quem joga (a vassalagem sem o tributo, "vassala de" em
//     Reinos, o tributo e as trocas no Livro do reino); tirar a vassalagem; no celular.
//   · (parte 3c, SO=guerrapaz) os motivos de guerra (a sugestão pelo pretendente, "Usar…", os erros, "não vale mais",
//     mudar); "Declarar guerra…" (quem declara e o motivo dele, os tratados de paz marcados para acabar, o aviso da
//     vassalagem, a notícia no rascunho do Jornal; Desfazer com o Jornal); "Fazer a paz…" (a relação, o tratado com
//     prazo, o erro do prazo, a notícia); assinar um tratado com a notícia; quem joga (sem os motivos nem os botões); no
//     celular.
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
    ok(await A(L, () => { const t0 = document.getElementById('tabs'); return t0.scrollWidth <= t0.clientWidth + 1; }), 'as oito abas cabem na largura do painel (em duas fileiras)');
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
    ok(abasW[0] <= abasW[1] + 1 && abasW[2], 'as oito abas cabem também com o número da seleção: ' + j(abasW));
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

  // ---------- (parte 2b) a sucessão ----------
  if (parte('sucessao')) await passo('a sucessão', async () => {
    await A(L, () => {
      __mundo.App.mudar('sucessão: a família', m => {
        m.corte = { cargos: {}, casas: [{ id: 'ka', nome: 'Casa de Aldar', chefe: 'rei' }],
          pessoas: [
            { id: 'av', nome: 'Aldo', gen: 'h', casa: 'ka', nasc: { a: -60 }, morte: { a: -20 } },
            { id: 'rei', nome: 'Rui', gen: 'h', casa: 'ka', fac: 'fa', nasc: { a: -40 }, pais: ['av'], ver: true },
            { id: 'tio', nome: 'Tito', gen: 'h', casa: 'ka', nasc: { a: -35 }, pais: ['av'] },
            { id: 'f1', nome: 'Fábia', gen: 'm', casa: 'ka', nasc: { a: -15 }, pais: ['rei'], ver: true },
            { id: 'f2', nome: 'Fred', gen: 'h', casa: 'ka', nasc: { a: -12 }, pais: ['rei'] },
            { id: 'n1', nome: 'Nina', gen: 'm', casa: 'ka', nasc: { a: -5 }, pais: ['f1', 'gx'] },
            { id: 'gx', nome: 'Gil', gen: 'h', nasc: { a: -18 } }],
          titulos: [
            { id: 't1', grau: 'reino', preso: { t: 'f', id: 'fa' }, fac: 'fa', tit: 'rei', desde: { a: -10 } },
            { id: 't2', grau: 'ducado', de: 'de Valmor', fac: 'fa', tit: 'rei', regra: { forma: 'partilha', gen: 'igual' } },
            { id: 't3', grau: 'condado', de: 'de Pedra', fac: 'fa', tit: 'rei', regra: { forma: 'partilha', gen: 'igual' } }] };
      });
    });
    // a regra do reino (na facção)
    await aba(L, 'faccoes');
    if (!(await A(L, () => !!document.querySelector('#pane [data-k="f:fa:suc-forma"]')))) await L.F.click('#pane [data-k="fac:fa"]');
    await espera(250);
    ok(/SUCESSÃO Forma/i.test(await textoPane(L)) && await campo(L, 'f:fa:suc-forma').inputValue() === 'primo' && await campo(L, 'f:fa:suc-gen').inputValue() === 'igual',
      'na facção, "Sucessão": de começo, primogenitura, homens e mulheres por igual');
    await campo(L, 'f:fa:suc-gen').selectOption('homens'); await espera(300);
    ok(j((await corte(L)).regras) === j({ fa: { forma: 'primo', gen: 'homens' } }), 'homens primeiro: a regra do reino fica guardada');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    ok(!('regras' in (await corte(L))), 'desfazer: de volta à de começo (nada guardado)');
    await campo(L, 'f:fa:suc-forma').selectOption('eletiva'); await espera(300);
    ok(j((await corte(L)).regras) === j({ fa: { forma: 'eletiva', gen: 'igual' } }) && await campo(L, 'f:fa:suc-gen').isDisabled(), '"O mestre escolhe": o gênero fica travado');
    await campo(L, 'f:fa:suc-forma').selectOption('primo'); await espera(300);
    ok(!('regras' in (await corte(L))), 'de volta à primogenitura por igual: igual à de começo, nada guardado');
    // a regra e a linha no cartão do título
    await aba(L, 'corte'); await botao(L, 'corte:vista:titulos');
    await botao(L, 't:t1'); await L.F.waitForSelector('dialog.tt-dl[open]');
    const linhaT = () => A(L, () => [...document.querySelectorAll('dialog.tt-dl[open] [data-k="tt:linha"] li')].map(li => li.textContent));
    const ttv = k => A(L, x => document.querySelector('dialog.tt-dl[open] [data-k="' + x + '"]').value, k);
    const opRegra = await A(L, () => document.querySelector('dialog.tt-dl[open] [data-k="tt:regra"] option').textContent);
    let lt = await linhaT();
    ok(opRegra === 'A do reino: Primogenitura · por igual' && await ttv('tt:regra') === '' && await A(L, () => document.querySelector('dialog.tt-dl[open] [data-k="tt:regra-gen"]').disabled),
      'no cartão do título: a regra do reino (com o nome dela), o gênero travado');
    ok(j(lt.slice(0, 4)) === j(['Fábia (filha, 16 anos)', 'Nina (neta, 6 anos)', 'Fred (filho, 13 anos)', 'Tito (irmão, 36 anos)']), 'a linha de sucessão: a filha mais velha e a linha dela, o filho, o irmão: ' + j(lt));
    await L.F.selectOption(dlg('[data-k="tt:regra"]'), 'primo'); await L.F.selectOption(dlg('[data-k="tt:regra-gen"]'), 'homens');
    lt = await linhaT();
    ok(lt[0] === 'Fred (filho, 13 anos)' && lt[1] === 'Fábia (filha, 16 anos)', 'a regra do título, homens primeiro: a linha muda na hora: ' + j(lt.slice(0, 3)));
    await L.F.selectOption(dlg('[data-k="tt:herd"]'), 'tio');
    ok((await linhaT())[0] === 'Tito (herdeiro escolhido, 36 anos)', 'o herdeiro escolhido passa na frente');
    await L.F.selectOption(dlg('[data-k="tt:regra"]'), 'eletiva'); await L.F.selectOption(dlg('[data-k="tt:herd"]'), '');
    ok(j(await linhaT()) === j(['O mestre escolhe na hora.']), '"O mestre escolhe": ninguém na linha');
    await L.F.selectOption(dlg('[data-k="tt:regra"]'), 'antig');
    ok((await linhaT())[0] === 'Tito (da casa, 36 anos)', 'antiguidade: o mais velho da casa');
    await L.F.click(dlg('[data-k="tt:ok"]')); await espera(350);
    ok(j((await corte(L)).titulos.find(x => x.id === 't1').regra) === j({ forma: 'antig', gen: 'homens' }), 'salvar: a regra do título fica guardada');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    await semAvisos(L);
    // marcar a morte de quem tem títulos: a prévia abre sozinha
    await botao(L, 'corte:vista:casas');
    await L.F.click('#pane [data-k="p:gx"]'); await L.F.waitForSelector('dialog.ps-dl[open]');
    await L.F.check(dlg('[data-k="ps:morreu"]')); await L.F.fill(dlg('[data-k="ps:morte:ano"]'), '1'); await L.F.click(dlg('[data-k="ps:ok"]')); await espera(500);
    ok(await A(L, () => !document.querySelector('dialog.suc-dl')), 'a morte de quem não tem título nem é chefe: sem prévia');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    await L.F.click('#pane [data-k="p:rei"]'); await L.F.waitForSelector('dialog.ps-dl[open]');
    await L.F.check(dlg('[data-k="ps:morreu"]')); await L.F.fill(dlg('[data-k="ps:morte:ano"]'), '1'); await L.F.click(dlg('[data-k="ps:ok"]'));
    await L.F.waitForSelector('dialog.suc-dl[open]');
    const suc = () => A(L, () => { const d = document.querySelector('dialog.suc-dl[open]'); return d ? { tit: d.querySelector('h2').textContent, txt: d.innerText.replace(/\s+/g, ' '),
      v: Object.fromEntries([...d.querySelectorAll('select[data-k^="suc:"]')].map(s0 => [s0.dataset.k, s0.value])), reg: Object.fromEntries([...d.querySelectorAll('.suc-reg')].map(l0 => [l0.querySelector('select').dataset.k, !l0.hidden])), jornal: !!d.querySelector('[data-k="suc:jornal"]') } : null; });
    let sv = await suc();
    ok(sv.tit === 'A sucessão de Rui' && /Rui, Rei de Aldar morreu \(ano 1\)\./.test(sv.txt), 'marcar a morte do Rui (e salvar): a prévia da sucessão abre sozinha: ' + sv.txt.slice(0, 120));
    ok(sv.v['suc:t1'] === 'f1' && sv.v['suc:t2'] === 'f1' && sv.v['suc:t3'] === 'f2' && sv.v['suc:chefe'] === 'f1', 'o reino para a Fábia; a partilha divide o ducado e o condado entre os filhos (o maior com a mais velha); a chefia da casa para quem herda o reino: ' + j(sv.v));
    ok(/Primogenitura · por igual/.test(sv.txt) && /Partilha · por igual/.test(sv.txt) && sv.jornal && !(await A(L, () => document.querySelector('dialog.suc-dl[open] [data-k="suc:jornal"]').checked)),
      'cada título com a regra; a caixa do Jornal, desmarcada');
    ok(!sv.reg['suc:t1:reg'] && sv.reg['suc:t3:reg'] && sv.v['suc:t3:reg'] === '', 'o reino sem regente (a Fábia tem 16 anos); o condado com a caixa do regente (o Fred tem 13), sem sugestão (o pai é o morto)');
    await L.F.click('dialog.suc-dl[open] [data-k="suc:nao"]'); await espera(350);
    let cc = await corte(L);
    ok(cc.titulos.every(x => x.tit === 'rei') && cc.pessoas.find(p0 => p0.id === 'rei').morte && cc.casas[0].chefe === 'rei', '"Agora não": o Rui morto, ainda com os títulos e a chefia');
    await botao(L, 'corte:vista:titulos');
    ok(/Reino de Aldar Rui \(† o titular morreu\)/.test(await textoPane(L)), 'na lista: o titular morreu');
    // depois: "Fazer a sucessão…" no cartão do título; a herdeira menor de idade, com regente
    await botao(L, 't:t1'); await L.F.waitForSelector('dialog.tt-dl[open]');
    await L.F.click(dlg('[data-k="tt:sucessao"]')); await L.F.waitForSelector('dialog.suc-dl[open]');
    await L.F.selectOption('dialog.suc-dl[open] [data-k="suc:t1"]', 'n1'); await espera(100);
    sv = await suc();
    ok(sv.reg['suc:t1:reg'] && sv.v['suc:t1:reg'] === 'f1', 'a herdeira menor de idade (a Nina): a caixa do regente, com a mãe dela de começo');
    await L.F.selectOption('dialog.suc-dl[open] [data-k="suc:t1:reg"]', 'gx');
    await semAvisos(L); await foto('l11-sucessao');
    await L.F.check('dialog.suc-dl[open] [data-k="suc:jornal"]');
    await L.F.click('dialog.suc-dl[open] [data-k="suc:ok"]'); await espera(500);
    cc = await corte(L);
    const T = id => cc.titulos.find(x => x.id === id);
    ok(T('t1').tit === 'n1' && T('t1').reg === 'gx' && j(T('t1').desde) === j({ a: 1 }) && j(T('t1').hist[T('t1').hist.length - 1]) === j({ p: 'rei', nome: 'Rui', de: { a: -10 }, ate: { a: 1 } }),
      'aplicar: o reino para a Nina, com o regente, desde a morte; o Rui nos titulares de antes: ' + j(T('t1')));
    ok(T('t2').tit === 'f1' && T('t3').tit === 'f2' && cc.casas[0].chefe === 'f1' && /A sucessão de Rui está feita\. A notícia foi para o rascunho do Jornal\./.test(await avisos(L)), 'o ducado e o condado divididos; a nova chefe da casa; o aviso');
    const ras = () => A(L, () => { try { return JSON.parse(localStorage.getItem('tinycats:jornal:rascunho') || 'null'); } catch (e) { return null; } });
    let r0 = await ras(), mat = r0 && r0.materias.find(x => /^Morreu /.test(x.tit));
    ok(mat && mat.tit === 'Morreu Rui, Rei de Aldar' && /\*\*Reino de Aldar:\*\* Nina, Rainha de Aldar \(regente: Gil\)/.test(mat.txt) && /\*\*Chefe \(Casa de Aldar\):\*\* Fábia/.test(mat.txt), 'a notícia no rascunho do Jornal: ' + j(mat));
    await A(L, () => __mundo.App.desfazer()); await espera(400);
    cc = await corte(L); r0 = await ras();
    ok(cc.titulos.every(x => x.tit === 'rei') && cc.casas[0].chefe === 'rei' && !(r0 && r0.materias.some(x => /^Morreu /.test(x.tit))), 'desfazer: os títulos e a chefia de volta ao Rui, e a notícia sai do Jornal');
    await A(L, () => __mundo.App.refazer()); await espera(400);
    cc = await corte(L); r0 = await ras();
    ok(cc.titulos.find(x => x.id === 't1').tit === 'n1' && r0 && r0.materias.some(x => x.tit === 'Morreu Rui, Rei de Aldar'), 'refazer: a sucessão e a notícia de novo');
    await A(L, () => __mundo.App.desfazer()); await espera(400);
    // no cartão de quem morreu: "Fazer a sucessão…"
    await botao(L, 'corte:vista:casas');
    if (!(await A(L, () => { const d = document.querySelector('#pane [data-k="casa:ka:mortos"]'); return !d || d.open; }))) await L.F.click('#pane [data-k="casa:ka:mortos"] > summary');
    await espera(150);
    await L.F.click('#pane [data-k="p:rei"]'); await L.F.waitForSelector('dialog.ps-dl[open]');
    await L.F.click(dlg('[data-k="ps:sucessao"]')); await L.F.waitForSelector('dialog.suc-dl[open]');
    ok((await suc()).tit === 'A sucessão de Rui', 'no cartão do Rui (morto, com títulos): "Fazer a sucessão…" abre a prévia');
    // no celular: a prévia cabe
    await L.P.setViewportSize({ width: 400, height: 820 }); await espera(400);
    ok(await A(L, () => { const d = document.querySelector('dialog.suc-dl[open]'); return d.scrollWidth <= d.clientWidth + 1 && d.getBoundingClientRect().width <= window.innerWidth; }), 'no celular, a prévia cabe na largura');
    await semAvisos(L); await foto('l11-sucessao-celular');
    await L.F.click('dialog.suc-dl[open] [data-k="suc:nao"]'); await espera(250);
    await L.P.setViewportSize({ width: 1400, height: 900 }); await espera(300);
    await aba(L, 'corte'); await botao(L, 'corte:vista:titulos');
    await botao(L, 't:t1'); await L.F.waitForSelector('dialog.tt-dl[open]');
    await semAvisos(L); await foto('l11-sucessao-linha');
    await L.F.click(dlg('[data-k="tt:nao"]')); await espera(200);
    await botao(L, 'corte:vista:casas');
  });

  // ---------- (parte 3a) as abas em duas fileiras e a diplomacia ----------
  if (parte('diplomacia')) await passo('a diplomacia', async () => {
    await A(L, () => {
      __mundo.App.mudar('diplomacia: as facções', m => {
        if (!m.faccoes.some(f => f.id === 'fc')) m.faccoes.push({ id: 'fc', nome: 'Ilhas', cor: '#2f8f8f' }, { id: 'fd', nome: 'Culto', cor: '#5b3fb5', oculta: true });
        for (const f of m.faccoes) f.rel = {};
        delete m.dipl;
      });
    });
    // as abas: duas fileiras, por assunto
    const filas = await A(L, () => [...document.querySelectorAll('#tabs .tabs-fila')].map(f => [...f.querySelectorAll('.tab:not([hidden])')].map(b => b.textContent.replace(/\d+$/, ''))));
    ok(j(filas) === j([['Seleção', 'Hoje', 'Terreno', 'Mapa'], ['Reinos', 'Corte', 'Diplomacia', 'Guerra']]), 'as abas em duas fileiras: o mapa em cima, a política embaixo: ' + j(filas));
    const cabe = () => A(L, () => [...document.querySelectorAll('#tabs, #tabs .tabs-fila')].every(e => e.scrollWidth <= e.clientWidth + 1));
    ok(await cabe(), 'as duas fileiras cabem no painel');
    await aba(L, 'diplomacia');
    const pd = await textoPane(L);
    ok(/^Diplomacia \+ Tratado \+ Vassalagem Tipos de tratado… Facção Todas as facções.* RELAÇÕES/i.test(pd) && await A(L, () => document.querySelectorAll('#pane .dp-par').length) === 6, 'a aba Diplomacia: os botões, o filtro e os seis pares de facções (com a escondida, para o mestre): ' + pd.slice(0, 140));
    // a relação (a mesma da aba Reinos)
    await campo(L, 'dprel:fa:fb').selectOption('guerra'); await espera(300);
    ok(await A(L, () => { const m = __mundo.App.mapa, f = id => m.faccoes.find(x => x.id === id); return f('fa').rel.fb === 'guerra' && f('fb').rel.fa === 'guerra'; }), 'a relação entre Aldar e Vale: Guerra, dos dois lados');
    // a opinião de cada lado
    await botao(L, 'op:fa:fb'); await L.F.waitForSelector('dialog.op-dl[open]');
    const ladoAB = s0 => dlg('[data-k="op-lado:fa:fb"] ' + s0), ladoBA = s0 => dlg('[data-k="op-lado:fb:fa"] ' + s0);
    await L.F.click(ladoAB('[data-k="op-novo:fa:fb"]')); await L.F.locator(ladoAB('[data-k="op:txt"]')).last().fill('tomaram Valmor'); await L.F.locator(ladoAB('[data-k="op:v"]')).last().fill('-30');
    await L.F.locator(ladoAB('[data-k="op:ate:ano"]')).last().fill('2');
    await L.F.click(ladoAB('[data-k="op-novo:fa:fb"]')); await L.F.locator(ladoAB('[data-k="op:txt"]')).last().fill('aliança antiga'); await L.F.locator(ladoAB('[data-k="op:v"]')).last().fill('20');
    ok(await A(L, () => document.querySelector('dialog.op-dl[open] [data-k="opt:fa:fb"]').textContent) === '−10', 'a soma dos motivos, na hora: −10');
    await L.F.click(ladoBA('[data-k="op-novo:fb:fa"]')); await L.F.locator(ladoBA('[data-k="op:v"]')).last().fill('150');
    await L.F.click(dlg('[data-k="op:ok"]')); await espera(120);
    const errOp = () => A(L, () => document.querySelector('dialog.op-dl[open] .err').textContent);
    ok(await errOp() === 'Escreva cada motivo (ou tire a linha).', 'o motivo sem texto: não passa');
    await L.F.locator(ladoBA('[data-k="op:txt"]')).last().fill('a ofensa na corte');
    await L.F.click(dlg('[data-k="op:ok"]')); await espera(120);
    ok(await errOp() === 'O valor de cada motivo vai de −100 a +100.', 'o valor fora de −100 a +100: não passa');
    await L.F.locator(ladoBA('[data-k="op:v"]')).last().fill('-50');
    await semAvisos(L); await A(L, () => { document.querySelector('dialog.op-dl[open] .err').textContent = ''; }); await foto('l11-dipl-opiniao');
    await L.F.click(dlg('[data-k="op:ok"]')); await espera(350);
    const dp = () => A(L, () => JSON.parse(JSON.stringify(__mundo.App.mapa.dipl || null)));
    let d = await dp();
    const ab = d && d.opin.find(o => o.de === 'fa' && o.sobre === 'fb'), ba = d && d.opin.find(o => o.de === 'fb' && o.sobre === 'fa');
    ok(ab && j(ab.motivos.map(x => [x.txt, x.v, x.ate])) === j([['tomaram Valmor', -30, { a: 2 }], ['aliança antiga', 20, null]]) && ba && ba.motivos[0].v === -50 && /A opinião entre Aldar e Vale está salva\./.test(await avisos(L)),
      'salvar: os motivos de cada lado (com o prazo): ' + j(d && d.opin));
    ok(/opinião: Aldar → −10 · Vale → −50/.test(await A(L, () => document.querySelector('#pane [data-k="par:fa:fb"]').innerText)), 'no par: a opinião de cada lado');
    // os tratados
    await botao(L, 'dp:novo'); await L.F.waitForSelector('dialog.tr-dl[open]');
    const errTr = () => A(L, () => document.querySelector('dialog.tr-dl[open] .err').textContent);
    ok(await A(L, () => document.querySelector('dialog.tr-dl[open] [data-k="tr:tipo"]').value) === 'alianca' && await A(L, () => document.querySelector('dialog.tr-dl[open] [data-k="tr:ini:ano"]').value) === '1'
      && await A(L, () => document.querySelector('dialog.tr-dl[open] [data-k="tr:fim:ano"]').closest('.ps-data').hidden), 'o tratado novo: Aliança, começando hoje, sem prazo');
    await L.F.check(dlg('[data-k="tr:parte:fa"]')); await L.F.click(dlg('[data-k="tr:ok"]')); await espera(120);
    ok(await errTr() === 'Escolha pelo menos duas facções.', 'uma facção só: não passa');
    await L.F.check(dlg('[data-k="tr:parte:fc"]')); await L.F.check(dlg('[data-k="tr:prazo"]')); await L.F.fill(dlg('[data-k="tr:fim:ano"]'), '0'); await L.F.click(dlg('[data-k="tr:ok"]')); await espera(120);
    ok(await errTr() === 'O prazo vem antes do começo.', 'o prazo antes do começo: não passa');
    await L.F.fill(dlg('[data-k="tr:fim:ano"]'), '3'); await L.F.check(dlg('[data-k="tr:pub"]')); await L.F.fill(dlg('[data-k="tr:txt"]'), 'Um defende o outro.'); await L.F.fill(dlg('[data-k="tr:nota"]'), 'As Ilhas querem sair.');
    await semAvisos(L); await A(L, () => { document.querySelector('dialog.tr-dl[open] .err').textContent = ''; }); await foto('l11-dipl-tratado');
    await L.F.click(dlg('[data-k="tr:ok"]')); await espera(350);
    d = await dp();
    const t1 = d.tratados[0];
    ok(t1 && t1.tipo === 'alianca' && j(t1.partes) === j(['fa', 'fc']) && j(t1.ini) === j({ a: 1, m: 0, d: 1 }) && j(t1.fim) === j({ a: 3 }) && t1.pub && t1.txt === 'Um defende o outro.' && t1.nota === 'As Ilhas querem sair.' && t1.enc === null
      && /O tratado Aliança: Aldar, Ilhas entrou na diplomacia\./.test(await avisos(L)), 'criar: o tratado com tudo o que foi escolhido: ' + j(t1));
    ok(/Aliança: Aldar, Ilhas desde 1 de Alvorada, ano 1 · até ano 3 público/.test(await textoPane(L)) && /tratados: Aliança/.test(await A(L, () => document.querySelector('#pane [data-k="par:fa:fc"]').innerText)),
      'na lista: o tipo, as partes, as datas e "público"; no par, o tratado em vigor');
    const novoTratado = async (tipo, partes, o) => {
      await botao(L, 'dp:novo'); await L.F.waitForSelector('dialog.tr-dl[open]');
      await L.F.selectOption(dlg('[data-k="tr:tipo"]'), tipo);
      for (const f of partes) await L.F.check(dlg('[data-k="tr:parte:' + f + '"]'));
      if (o && o.ini != null) { await L.F.fill(dlg('[data-k="tr:ini:ano"]'), String(o.ini)); await L.F.selectOption(dlg('[data-k="tr:ini:mes"]'), ''); await L.F.fill(dlg('[data-k="tr:ini:dia"]'), ''); }
      if (o && o.fim != null) { await L.F.check(dlg('[data-k="tr:prazo"]')); await L.F.fill(dlg('[data-k="tr:fim:ano"]'), String(o.fim)); }
      if (o && o.pub) await L.F.check(dlg('[data-k="tr:pub"]'));
      await L.F.click(dlg('[data-k="tr:ok"]')); await espera(350);
      return (await dp()).tratados.slice(-1)[0];
    };
    const t2 = await novoTratado('comercio', ['fa', 'fb', 'fc']);
    ok(t2 && j(t2.partes) === j(['fa', 'fb', 'fc']) && /Comércio: Aldar, Vale, Ilhas desde 1 de Alvorada, ano 1 · sem prazo/.test(await textoPane(L)), 'um tratado de três facções, sem prazo');
    const t3 = await novoTratado('paz', ['fb', 'fc'], { ini: -3, fim: -1, pub: true });
    ok(/Paz ou trégua: Vale, Ilhas desde ano -3 · até ano -1 vencido/.test(await textoPane(L)), 'o tratado que passou do prazo: "vencido"');
    const t4 = await novoTratado('passagem', ['fa', 'fd'], { pub: true });
    // os tipos de tratado
    await botao(L, 'dp:tipos'); await L.F.waitForSelector('dialog.cg-dl[open]');
    ok(j(await A(L, () => [...document.querySelectorAll('dialog.cg-dl[open] [data-k="tp:nome"]')].map(i => i.value))) === j(['Aliança', 'Paz ou trégua', 'Comércio', 'Passagem livre']), 'os tipos de começo');
    await L.F.locator(dlg('[data-k="tp:nome"]')).nth(2).fill('Rota comercial');
    await L.F.click(dlg('[data-k="tp:novo"]')); await L.F.click(dlg('[data-k="tp:ok"]')); await espera(120);
    ok(await A(L, () => document.querySelector('dialog.cg-dl[open] .err').textContent) === 'Dê um nome a cada tipo (ou tire o que está vazio).', 'o tipo sem nome: não passa');
    await L.F.locator(dlg('[data-k="tp:nome"]')).last().fill('Casamento');
    await L.F.click(dlg('[data-k="tp:ok"]')); await espera(350);
    d = await dp();
    ok(j((d.tipos || []).map(x => x.nome)) === j(['Aliança', 'Paz ou trégua', 'Rota comercial', 'Passagem livre', 'Casamento']) && /Rota comercial: Aldar, Vale, Ilhas/.test(await textoPane(L)), 'renomear e criar: o tratado de comércio com o nome novo');
    await botao(L, 'dp:tipos'); await L.F.waitForSelector('dialog.cg-dl[open]');
    await L.F.click(dlg('[data-k="tp:comeco"]')); await L.F.click(dlg('[data-k="tp:ok"]')); await espera(350);
    ok(!('tipos' in (await dp())), '"Voltar aos de começo": a lista guardada sai');
    // encerrar e reabrir
    await botao(L, 'tr:' + t1.id); await L.F.waitForSelector('dialog.tr-dl[open]');
    await L.F.click(dlg('[data-k="tr:encerrar"]')); await espera(250);
    ok(/Encerrar o tratado Aliança: Aldar, Ilhas\?/.test(await A(L, () => document.querySelector('dialog.mundo-dl[open]').innerText)), 'encerrar: pergunta antes');
    await L.F.click('dialog.mundo-dl[open] button[type="submit"]'); await espera(350);
    d = await dp();
    ok(j(d.tratados.find(x => x.id === t1.id).enc) === j({ a: 1, m: 0, d: 1 }) && /Encerrados \(1\)/.test(await textoPane(L)) && !(await A(L, () => document.querySelector('#pane [data-k="dp:encerrados"]').open)),
      'encerrado hoje: vai para "Encerrados", recolhido');
    await L.F.click('#pane [data-k="dp:encerrados"] > summary'); await espera(150);
    await botao(L, 'tr:' + t1.id); await L.F.waitForSelector('dialog.tr-dl[open]');
    ok(/Este tratado está encerrado \(1 de Alvorada, ano 1\)\./.test(await A(L, () => document.querySelector('dialog.tr-dl[open]').innerText)), 'o cartão do encerrado diz desde quando');
    await L.F.click(dlg('[data-k="tr:reabrir"]')); await espera(350);
    ok((await dp()).tratados.find(x => x.id === t1.id).enc === null && /O tratado Aliança: Aldar, Ilhas voltou a valer\./.test(await avisos(L)), '"Reabrir": volta a valer');
    // tirar (com Desfazer)
    await botao(L, 'tr:' + t3.id); await L.F.waitForSelector('dialog.tr-dl[open]');
    await L.F.click(dlg('[data-k="tr:tirar"]')); await espera(250);
    await L.F.click('dialog.mundo-dl[open] button[type="submit"]'); await espera(350);
    ok(!(await dp()).tratados.some(x => x.id === t3.id) && /O tratado Paz ou trégua: Vale, Ilhas saiu\./.test(await avisos(L)), 'tirar o tratado (pergunta antes)');
    await L.F.locator('#toasts button', { hasText: 'Desfazer' }).click(); await espera(350);
    ok((await dp()).tratados.some(x => x.id === t3.id), 'Desfazer: ele volta');
    // o filtro
    await campo(L, 'dp:fac').selectOption('fd'); await espera(300);
    ok(await A(L, () => document.querySelectorAll('#pane .dp-par').length) === 3 && /Passagem livre: Aldar, Culto/.test(await textoPane(L)) && !/Rota comercial|Comércio: Aldar/.test(await textoPane(L)), 'o filtro do Culto: os três pares dele e o tratado dele');
    await campo(L, 'dp:fac').selectOption(''); await espera(300);
    await semAvisos(L); await foto('l11-dipl');
    // quem joga: as relações (não neutras) e os tratados públicos; sem a opinião, sem a facção escondida
    await comoJogador(L, true);
    await aba(L, 'diplomacia');
    const pj = await textoPane(L);
    ok(/Aldar ⇄ Vale Guerra/.test(pj) && !/Aldar ⇄ Ilhas/.test(pj) && /Aliança: Aldar, Ilhas desde 1 de Alvorada, ano 1 · até ano 3 Um defende o outro\./.test(pj) && /Paz ou trégua: Vale, Ilhas/.test(pj) && !/Comércio/.test(pj) && !/Culto/.test(pj) && !/opinião|Valmor|querem sair/.test(pj) && !/\+ Tratado/.test(pj),
      'quem joga: a guerra, os tratados públicos (sem o de comércio, sem o do Culto escondido), sem a opinião, a nota e os botões: ' + pj.slice(0, 300));
    await semAvisos(L); await foto('l11-dipl-jogador');
    const filasJ = await A(L, () => [...document.querySelectorAll('#tabs .tabs-fila:not([hidden])')].map(f => [...f.querySelectorAll('.tab:not([hidden])')].map(b => b.textContent.replace(/\d+$/, ''))));
    ok(j(filasJ) === j([['Seleção', 'Hoje'], ['Reinos', 'Corte', 'Diplomacia']]), 'quem joga: as abas dele, nas mesmas fileiras: ' + j(filasJ));
    await comoJogador(L, false);
    // no celular: as abas e as janelas cabem
    await L.P.setViewportSize({ width: 400, height: 820 }); await espera(400);
    if (await L.F.locator('#side.fechado').count()) { await L.F.click('#btPainel'); await espera(250); }
    await A(L, () => __mundo.App.selecionar(['c1'])); await espera(250);
    ok(await cabe() && await A(L, () => !document.querySelector('#tab-selecao .n').hidden || __mundo.App.sel.length === 0), 'no celular, as duas fileiras de abas cabem');
    await semAvisos(L); await foto('l11-abas-celular');
    await A(L, () => __mundo.App.selecionar([])); await espera(150);
    await A(L, () => { window.MundoDiplomaciaPainel.janelaTratado(window.MundoDiplomacia.diplDe(__mundo.App.mapa).tratados[0].id); }); await L.F.waitForSelector('dialog.tr-dl[open]');
    ok(await A(L, () => { const dd = document.querySelector('dialog.tr-dl[open]'); return dd.scrollWidth <= dd.clientWidth + 1 && dd.getBoundingClientRect().width <= window.innerWidth; }), 'no celular, o cartão do tratado cabe');
    await L.F.click(dlg('[data-k="tr:nao"]')); await espera(200);
    await A(L, () => { window.MundoDiplomaciaPainel.janelaOpiniao('fa', 'fb'); }); await L.F.waitForSelector('dialog.op-dl[open]');
    ok(await A(L, () => { const dd = document.querySelector('dialog.op-dl[open]'); return dd.scrollWidth <= dd.clientWidth + 1 && dd.getBoundingClientRect().width <= window.innerWidth; }), 'no celular, a opinião cabe');
    await semAvisos(L); await foto('l11-dipl-celular');
    await L.F.click(dlg('[data-k="op:nao"]')); await espera(200);
    await L.P.setViewportSize({ width: 1400, height: 900 }); await espera(300);
  });

  // ---------- (parte 3b) a vassalagem, o tributo e as trocas na semana ----------
  if (parte('vassalagem')) await passo('a vassalagem', async () => {
    await L.P.setViewportSize({ width: 1400, height: 900 }); await espera(200);
    if (await L.F.locator('#side.fechado').count()) { await L.F.click('#btPainel'); await espera(250); }
    // o mundo: quatro facções (o Culto escondido), a economia ligada (hoje é segunda), o Vale com 4 Lapros e Aldar com 10 de Madeira
    await A(L, () => {
      __mundo.App.mudar('vassalagem: o mundo', m => {
        if (!m.faccoes.some(f => f.id === 'fc')) m.faccoes.push({ id: 'fc', nome: 'Ilhas', cor: '#2f8f8f' }, { id: 'fd', nome: 'Culto', cor: '#5b3fb5', oculta: true });
        for (const f of m.faccoes) { f.rel = {}; f.jog = false; }
        delete m.dipl;
        if (!m.eco || !m.eco.on) window.MundoReino.ligarEconomia(m);
        const F = id => m.faccoes.find(f => f.id === id);
        for (const f of m.faccoes) for (const r of f.rec) r.n = 0;
        F('fb').rec.find(r => r.id === 'lapros').n = 4; F('fa').rec.find(r => r.id === 'madeira').n = 10;
      });
    });
    const dp = () => A(L, () => JSON.parse(JSON.stringify(__mundo.App.mapa.dipl || null)));
    const hojeDt = await A(L, () => window.MundoCorte.hoje(__mundo.App.mapa));
    await aba(L, 'diplomacia');
    ok(/VASSALAGEM Nenhuma facção é vassala de outra\./i.test(await textoPane(L)), 'a aba: a seção da vassalagem, vazia');
    // a janela: os erros
    await botao(L, 'dp:vas-novo'); await L.F.waitForSelector('dialog.vs-dl[open]');
    const errVs = () => A(L, () => document.querySelector('dialog.vs-dl[open] .err').textContent);
    ok(await A(L, () => document.querySelector('dialog.vs-dl[open] [data-k="vs:trib-campos"]').hidden) && await A(L, () => document.querySelector('dialog.vs-dl[open] [data-k="vs:desde:ano"]').value) === String(hojeDt.a),
      'a vassalagem nova: desde hoje, sem tributo (os campos dele escondidos)');
    await L.F.click(dlg('[data-k="vs:ok"]')); await espera(120);
    ok(await errVs() === 'Escolha a vassala e a suserana.', 'sem as facções: não passa');
    await L.F.selectOption(dlg('[data-k="vs:vas"]'), 'fb'); await L.F.selectOption(dlg('[data-k="vs:sus"]'), 'fb'); await L.F.click(dlg('[data-k="vs:ok"]')); await espera(120);
    ok(await errVs() === 'A suserana tem de ser outra facção.', 'a mesma facção: não passa');
    await L.F.selectOption(dlg('[data-k="vs:sus"]'), 'fa'); await L.F.check(dlg('[data-k="vs:trib"]'));
    ok(!(await A(L, () => document.querySelector('dialog.vs-dl[open] [data-k="vs:trib-campos"]').hidden)), '"Paga tributo": os campos aparecem');
    await L.F.selectOption(dlg('[data-k="vs:rec"]'), 'lapros'); await L.F.click(dlg('[data-k="vs:ok"]')); await espera(120);
    ok(await errVs() === 'O tributo: a quantidade por semana é maior que zero.', 'o tributo sem quantidade: não passa');
    await L.F.fill(dlg('[data-k="vs:q"]'), '10');
    await semAvisos(L); await foto('l11-vassalagem');
    await L.F.click(dlg('[data-k="vs:ok"]')); await espera(350);
    let d = await dp();
    ok(d && j(d.vassalos) === j([{ vas: 'fb', sus: 'fa', desde: hojeDt, trib: { rec: 'lapros', q: 10 } }]) && /Vale é vassala de Aldar\./.test(await avisos(L)), 'criar: o Vale vassalo de Aldar, desde hoje, com 10 Lapros de tributo por semana: ' + j(d && d.vassalos));
    ok(/Vale é vassala de Aldar desde .+ · tributo: 10 Lapros por semana/.test(await A(L, () => document.querySelector('#pane [data-k="vas:fb"]').innerText.replace(/\s+/g, ' '))) && /Vale é vassala de Aldar/.test(await A(L, () => document.querySelector('#pane [data-k="par:fa:fb"]').innerText)),
      'na lista (desde quando, o tributo) e no par Aldar ⇄ Vale');
    // o círculo e a que já é vassala
    await botao(L, 'dp:vas-novo'); await L.F.waitForSelector('dialog.vs-dl[open]');
    await L.F.selectOption(dlg('[data-k="vs:vas"]'), 'fa'); await L.F.selectOption(dlg('[data-k="vs:sus"]'), 'fb'); await L.F.click(dlg('[data-k="vs:ok"]')); await espera(120);
    ok(await errVs() === 'Assim fecharia um círculo: Vale já é vassala de Aldar (direto ou pela cadeia).', 'Aldar vassala do Vale: fecharia um círculo');
    await L.F.selectOption(dlg('[data-k="vs:vas"]'), 'fb'); await L.F.selectOption(dlg('[data-k="vs:sus"]'), 'fc'); await L.F.click(dlg('[data-k="vs:ok"]')); await espera(120);
    ok(await errVs() === 'Vale já é vassala de Aldar (abra a vassalagem dela).', 'o Vale já tem suserana: não passa');
    await L.F.click(dlg('[data-k="vs:nao"]')); await espera(150);
    // mudar (e Desfazer)
    await botao(L, 'vas:fb'); await L.F.waitForSelector('dialog.vs-dl[open]');
    ok(await A(L, () => document.querySelector('dialog.vs-dl[open] [data-k="vs:q"]').value) === '10' && await L.F.locator(dlg('[data-k="vs:trib"]')).isChecked(), 'o cartão da vassalagem: o tributo como estava');
    await L.F.fill(dlg('[data-k="vs:q"]'), '6'); await L.F.click(dlg('[data-k="vs:ok"]')); await espera(350);
    ok((await dp()).vassalos[0].trib.q === 6 && /Vale é vassala de Aldar: salvo\./.test(await avisos(L)), 'mudar o tributo para 6');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    ok((await dp()).vassalos[0].trib.q === 10, 'Desfazer: volta a 10');
    await A(L, () => __mundo.App.refazer()); await espera(300);
    // trocar os lados no cartão (a vassalagem que muda não conta para o círculo)
    await botao(L, 'vas:fb'); await L.F.waitForSelector('dialog.vs-dl[open]');
    await L.F.selectOption(dlg('[data-k="vs:vas"]'), 'fa'); await L.F.selectOption(dlg('[data-k="vs:sus"]'), 'fb'); await L.F.click(dlg('[data-k="vs:ok"]')); await espera(350);
    ok(j((await dp()).vassalos.map(x => x.vas + '>' + x.sus)) === j(['fa>fb']), 'trocar os lados no cartão: Aldar vassala do Vale (sem acusar círculo)');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    ok(j((await dp()).vassalos.map(x => x.vas + '>' + x.sus + ':' + x.trib.q)) === j(['fb>fa:6']), 'Desfazer: o Vale volta a ser o vassalo');
    // em Reinos: "vassala de Aldar"
    await aba(L, 'faccoes');
    ok(await A(L, () => { const e = document.querySelector('#pane [data-k="fac:vas:fb"]'); return e ? e.textContent : ''; }) === 'vassala de Aldar' && await L.F.locator('#pane [data-k="fac:vas:fa"]').count() === 0, 'em Reinos: o Vale, "vassala de Aldar"');
    // o filtro
    await aba(L, 'diplomacia');
    await campo(L, 'dp:fac').selectOption('fc'); await espera(300);
    ok(/VASSALAGEM Nenhuma facção é vassala de outra\./i.test(await textoPane(L)), 'o filtro das Ilhas: nenhuma vassalagem');
    await campo(L, 'dp:fac').selectOption('fa'); await espera(300);
    ok(await campo(L, 'vas:fb').count() === 1, 'o filtro de Aldar: a vassalagem do Vale');
    await campo(L, 'dp:fac').selectOption(''); await espera(300);
    // as trocas por semana no cartão do tratado
    await botao(L, 'dp:novo'); await L.F.waitForSelector('dialog.tr-dl[open]');
    await L.F.selectOption(dlg('[data-k="tr:tipo"]'), 'comercio');
    ok(await L.F.locator(dlg('[data-k="tr:troca-nova"]')).isDisabled(), 'sem duas facções marcadas, "+ Troca" fica travado');
    await L.F.check(dlg('[data-k="tr:parte:fa"]')); await L.F.check(dlg('[data-k="tr:parte:fb"]'));
    await L.F.click(dlg('[data-k="tr:troca-nova"]')); await espera(100);
    ok(await A(L, () => { const r = document.querySelector('dialog.tr-dl[open] .tt-troca'); return [r.querySelector('[data-k="tr:troca:de"]').value, r.querySelector('[data-k="tr:troca:para"]').value].join(); }) === 'fa,fb', 'a troca nova: de Aldar para o Vale (as duas marcadas)');
    await L.F.selectOption(dlg('[data-k="tr:troca:rec"]'), 'madeira');
    await L.F.click(dlg('[data-k="tr:ok"]')); await espera(120);
    const errTr = () => A(L, () => document.querySelector('dialog.tr-dl[open] .err').textContent);
    ok(await errTr() === 'A quantidade de cada troca é maior que zero.', 'a troca sem quantidade: não passa');
    await L.F.fill(dlg('[data-k="tr:troca:q"]'), '3');
    await L.F.uncheck(dlg('[data-k="tr:parte:fb"]')); await espera(80);
    ok(await A(L, () => document.querySelector('dialog.tr-dl[open] [data-k="tr:troca:para"]').value) === '', 'o Vale sai do tratado: a troca fica sem ele ("—")');
    await L.F.check(dlg('[data-k="tr:parte:fc"]')); await L.F.click(dlg('[data-k="tr:ok"]')); await espera(120);
    ok(await errTr() === 'Cada troca vai de uma facção do tratado para outra.', 'a troca sem o "para": não passa');
    await L.F.uncheck(dlg('[data-k="tr:parte:fc"]')); await L.F.check(dlg('[data-k="tr:parte:fb"]')); await espera(80);
    ok(await A(L, () => document.querySelector('dialog.tr-dl[open] [data-k="tr:troca:para"]').value) === 'fb', 'o Vale volta: a troca volta a ser para ele');
    await semAvisos(L); await A(L, () => { document.querySelector('dialog.tr-dl[open] .err').textContent = ''; }); await foto('l11-trocas');
    await L.F.click(dlg('[data-k="tr:ok"]')); await espera(350);
    d = await dp();
    const tc = d.tratados[0];
    ok(tc && tc.tipo === 'comercio' && j(tc.trocas) === j([{ de: 'fa', para: 'fb', rec: 'madeira', q: 3 }]), 'criar: o tratado de comércio com a troca: ' + j(tc));
    ok(/Comércio: Aldar, Vale desde .+ por semana: Aldar → Vale: 3 Madeira/.test(await A(L, id => document.querySelector('#pane [data-k="tr:' + id + '"]').innerText.replace(/\s+/g, ' '), tc.id)), 'na lista: as trocas por semana');
    // um tratado de paz que vence nesta semana (com uma troca do Vale para as Ilhas) e um motivo de opinião que vence nela
    await A(L, () => {
      const { App } = __mundo, C = window.MundoCorte, dt = k => C.hoje(Object.assign({}, App.mapa, { cal: Object.assign({}, App.mapa.cal, { dia: App.mapa.cal.dia + k }) }));
      App.mudar('vassalagem: a paz e o motivo', m => {
        m.dipl.tratados.push({ id: 'tpz', tipo: 'paz', partes: ['fb', 'fc'], fim: dt(3), pub: true, trocas: [{ de: 'fb', para: 'fc', rec: 'madeira', q: 2 }] });
        m.dipl.opin.push({ de: 'fa', sobre: 'fb', motivos: [{ id: 'mi', txt: 'o insulto', v: -10, ate: dt(2) }, { id: 'mf', txt: 'para sempre', v: 5 }] });
      });
    });
    // a semana: o calendário passa para a outra segunda e a prévia abre
    await aba(L, 'hoje'); await semAvisos(L);
    await L.F.click('#pane [data-k="hoje:+7"]');
    await L.F.waitForSelector('dialog.sem-dl[open]', { timeout: 4000 });
    const sd = s0 => 'dialog.sem-dl[open] ' + s0;
    const cab = await A(L, () => [...document.querySelector('dialog.sem-dl[open] [data-k="sem:fac:fb"] thead tr').children].map(x => x.textContent).join('|'));
    ok(cab === 'Recurso|Estoque|Produção|Manutenção|Trocas|Fica|Falta', 'a prévia: a coluna "Trocas": ' + cab);
    const celulas = (fac, rec) => A(L, ([f0, r0]) => { const tr = document.querySelector(`dialog.sem-dl[open] [data-k="sem:fac:${f0}"] tr[data-rec="${r0}"]`); if (!tr) return null; const td = tr.querySelector('[data-k="sem:troca"]'); return [td.textContent, td.nextElementSibling.textContent]; }, [fac, rec]);
    ok(j(await celulas('fb', 'lapros')) === j(['−4', '0']) && j(await celulas('fa', 'lapros')) === j(['+4', '4']) && j(await celulas('fa', 'madeira')) === j(['−3', '7']) && j(await celulas('fb', 'madeira')) === j(['+3', '3']),
      'o Vale paga os 4 Lapros que tem; Aldar manda 3 de Madeira: ' + j([await celulas('fb', 'lapros'), await celulas('fa', 'lapros'), await celulas('fa', 'madeira'), await celulas('fb', 'madeira')]));
    const flx = await A(L, () => [...document.querySelectorAll('dialog.sem-dl[open] [data-k="sem:fluxos"] label')].map(l => l.innerText.replace(/\s+/g, ' ').trim()));
    ok(j(flx) === j(['Vale paga 6 Lapros de tributo a Aldar. Só tem 4: paga isso.', 'Aldar manda 3 Madeira para Vale (Comércio).', 'Vale manda 2 Madeira para Ilhas (Paz ou trégua). Não tem: não manda nada.']),
      'o tributo e as trocas, cada um com a caixa (o que não dá para pagar inteiro, avisado): ' + j(flx));
    await L.F.locator(sd('[data-k="sem:f:trib:fb"]')).uncheck(); await espera(150);
    ok(j(await celulas('fb', 'lapros')) === j(['—', '4']) && j(await celulas('fa', 'lapros')) === j(['—', '0']) && /^Vale paga 6 Lapros de tributo a Aldar\.$/.test(await A(L, () => document.querySelector('dialog.sem-dl[open] [data-k="sem:fl:trib:fb"]').innerText.trim())),
      'desmarcar o tributo: as contas mudam na hora (o Vale fica com os 4; a linha de Aldar continua no lugar)');
    ok(await A(L, () => document.querySelector('dialog.sem-dl[open] [data-k="sem:tr:tpz:encerrar"]').checked) && /Paz ou trégua: Vale, Ilhas o prazo: .+/.test(await A(L, () => document.querySelector('dialog.sem-dl[open] [data-k="sem:tr:tpz"]').innerText.replace(/\s+/g, ' '))),
      'o tratado que vence: "Encerrar" de começo');
    ok(await L.F.locator(sd('[data-k="sem:mo:fa:fb:mi"]')).isChecked() && /Tirar: Aldar sobre Vale, “o insulto” \(−10\)\./.test(await A(L, () => document.querySelector('dialog.sem-dl[open] [data-k="sem:motivos"]').innerText)) && !/para sempre/.test(await A(L, () => document.querySelector('dialog.sem-dl[open] [data-k="sem:motivos"]').innerText)),
      'o motivo que vence, para tirar (marcado); o sem prazo não aparece');
    // aplicar com "Encerrar" (de começo): o tratado acaba no prazo dele; Desfazer volta tudo num passo
    const antes = await A(L, () => JSON.stringify(__mundo.App.mapa)), fimPz = (await dp()).tratados.find(t0 => t0.id === 'tpz').fim;
    await semAvisos(L); await L.F.click(sd('[data-k="sem:aplicar"]')); await espera(500);
    ok(j((await dp()).tratados.find(t0 => t0.id === 'tpz').enc) === j(fimPz) && /Semana fechada \(até .+\)\. 1 tratado encerrado\./.test(await avisos(L)), 'aplicar com "Encerrar": o tratado acaba no prazo dele (e o aviso diz)');
    await A(L, () => __mundo.App.desfazer()); await espera(500);
    ok(await A(L, () => JSON.stringify(__mundo.App.mapa)) === antes, 'Desfazer: tudo volta num passo (os estoques, o tratado, o motivo, a semana)');
    if (!(await A(L, () => !!document.querySelector('dialog.sem-dl[open]')))) await A(L, () => { window.MundoReinoPainel.janelaSemana(); });
    await L.F.waitForSelector('dialog.sem-dl[open]', { timeout: 4000 });
    await L.F.locator(sd('[data-k="sem:f:trib:fb"]')).uncheck(); await espera(150);
    // renovar: o prazo novo (o erro antes)
    await L.F.fill(sd('[data-k="sem:tr:tpz:ate:ano"]'), String(hojeDt.a - 1)); await espera(50);
    ok(await A(L, () => document.querySelector('dialog.sem-dl[open] [data-k="sem:tr:tpz:renovar"]').checked), 'escrever o prazo novo marca "Renovar até"');
    await L.F.click(sd('[data-k="sem:aplicar"]')); await espera(150);
    ok(await A(L, () => document.querySelector('dialog.sem-dl[open] [data-k="sem:err"]').textContent) === 'O prazo novo (Paz ou trégua: Vale, Ilhas) tem de ser depois desta semana.', 'o prazo novo antes da semana: não aplica');
    await L.F.fill(sd('[data-k="sem:tr:tpz:ate:ano"]'), String(hojeDt.a + 4)); await L.F.selectOption(sd('[data-k="sem:tr:tpz:ate:mes"]'), ''); await L.F.fill(sd('[data-k="sem:tr:tpz:ate:dia"]'), '');
    await semAvisos(L); await foto('l11-semana-dipl');
    await L.F.click(sd('[data-k="sem:aplicar"]')); await espera(500);
    const est = () => A(L, () => { const m = __mundo.App.mapa, f = id => Object.fromEntries(m.faccoes.find(x => x.id === id).rec.filter(r => r.n).map(r => [r.id, r.n])); return [f('fa'), f('fb'), f('fc')]; });
    d = await dp();
    ok(j(await est()) === j([{ madeira: 7 }, { lapros: 4, madeira: 3 }, {}]) && j(d.tratados.find(t0 => t0.id === 'tpz').fim) === j({ a: hojeDt.a + 4 }) && j(d.opin[0].motivos.map(x => x.id)) === j(['mf'])
      && /Semana fechada \(até .+\)\. 1 tratado renovado\./.test(await avisos(L)), 'aplicar: o tributo desmarcado não foi, a troca foi; o tratado renovado; o motivo tirado: ' + j(await est()));
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    ok(await A(L, () => JSON.stringify(__mundo.App.mapa)) === antes, 'Desfazer a renovação: tudo volta de novo');
    await A(L, () => __mundo.App.refazer()); await espera(300);
    if (await A(L, () => !!document.querySelector('dialog.sem-dl[open]'))) { await L.F.click('dialog.sem-dl[open] button.btn:not(.pri)'); await espera(250); }
    // quem joga (o Vale): a vassalagem sem o tributo; em Reinos, "vassala de" e o tributo e as trocas no Livro do reino
    await A(L, () => __mundo.App.mudar('vassalagem: a facção dos jogadores', m => { m.faccoes.find(f => f.id === 'fb').jog = true; }));
    await comoJogador(L, true);
    await aba(L, 'diplomacia');
    const pj = await textoPane(L);
    ok(/VASSALAGEM Vale é vassala de Aldar desde /i.test(pj) && !/tributo/i.test(pj) && !/por semana/.test(pj), 'quem joga: a vassalagem, sem o tributo e sem as trocas: ' + pj.slice(0, 260));
    await aba(L, 'faccoes');
    ok(await A(L, () => { const e = document.querySelector('#pane [data-k="fac:vas:fb"]'); return e ? e.textContent : ''; }) === 'vassala de Aldar', 'quem joga, em Reinos: "vassala de Aldar"');
    await L.F.click('#pane [data-k="livro:j:de-onde"] > summary'); await espera(200);
    const lj = await A(L, () => { const e = document.querySelector('#pane [data-k="livro:j:trocas"]'); return e ? e.textContent : ''; });
    ok(lj === 'Tributo e trocas, por semana: tributo a Aldar: −6 Lapros · troca com Aldar: +3 Madeira · troca com Ilhas: −2 Madeira (quando a semana fecha).', 'no Livro do reino deles: o tributo e as trocas, por semana: ' + lj);
    await semAvisos(L); await foto('l11-vas-jogador');
    await comoJogador(L, false);
    // tirar a vassalagem (pergunta antes; Desfazer)
    await aba(L, 'diplomacia');
    await botao(L, 'vas:fb'); await L.F.waitForSelector('dialog.vs-dl[open]');
    await L.F.click(dlg('[data-k="vs:tirar"]')); await espera(250);
    ok(/Tirar a vassalagem\?/.test(await A(L, () => document.querySelector('dialog.mundo-dl[open]').innerText)), 'tirar: pergunta antes');
    await L.F.click('dialog.mundo-dl[open] button[type="submit"]'); await espera(350);
    ok((await dp()).vassalos.length === 0 && /Vale não é mais vassala de Aldar\./.test(await avisos(L)), 'tirar: a vassalagem sai');
    await L.F.locator('#toasts button', { hasText: 'Desfazer' }).click(); await espera(350);
    ok((await dp()).vassalos.length === 1, 'Desfazer: ela volta');
    // no celular: a janela da vassalagem e a prévia da semana cabem
    await L.P.setViewportSize({ width: 400, height: 820 }); await espera(400);
    await A(L, () => { window.MundoDiplomaciaPainel.janelaVassalagem('fb'); }); await L.F.waitForSelector('dialog.vs-dl[open]');
    const cabeDl = s0 => A(L, x => { const dd = document.querySelector(x); return dd.scrollWidth <= dd.clientWidth + 1 && dd.getBoundingClientRect().width <= window.innerWidth; }, s0);
    ok(await cabeDl('dialog.vs-dl[open]'), 'no celular, a vassalagem cabe');
    await semAvisos(L); await foto('l11-vas-celular');
    await L.F.click(dlg('[data-k="vs:nao"]')); await espera(200);
    await A(L, () => __mundo.App.mudar('vassalagem: mais uma semana', m => { m.cal.dia += 7; }));
    await L.F.waitForSelector('dialog.sem-dl[open]', { timeout: 4000 });
    ok(await cabeDl('dialog.sem-dl[open]'), 'no celular, a prévia da semana (com a diplomacia) cabe');
    await semAvisos(L); await foto('l11-semana-celular');
    await L.F.click('dialog.sem-dl[open] button.btn:not(.pri)'); await espera(250);
    await L.P.setViewportSize({ width: 1400, height: 900 }); await espera(300);
  });

  // ---------- (parte 3c) os motivos de guerra, declarar a guerra e fazer a paz ----------
  if (parte('guerrapaz')) await passo('a guerra e a paz', async () => {
    await L.P.setViewportSize({ width: 1400, height: 900 }); await espera(200);
    if (await L.F.locator('#side.fechado').count()) { await L.F.click('#btPainel'); await espera(250); }
    await A(L, () => {
      __mundo.App.mudar('guerra e paz: o mundo', m => {
        if (!m.faccoes.some(f => f.id === 'fc')) m.faccoes.push({ id: 'fc', nome: 'Ilhas', cor: '#2f8f8f' }, { id: 'fd', nome: 'Culto', cor: '#5b3fb5', oculta: true });
        for (const f of m.faccoes) { f.rel = {}; f.jog = false; }
        m.dipl = { tratados: [{ id: 'tgp', tipo: 'paz', partes: ['fa', 'fb'], pub: true }, { id: 'tgc', tipo: 'comercio', partes: ['fa', 'fb'] }], opin: [], vassalos: [{ vas: 'fb', sus: 'fa' }], motivosGuerra: [] };
        if (!m.corte) m.corte = { pessoas: [], casas: [], cargos: {}, titulos: [] };
        m.corte.pessoas.push({ id: 'gp1', nome: 'Isolda', gen: 'm', fac: 'fa' }, { id: 'gp2', nome: 'Otão', gen: 'h', fac: 'fb' });
        m.corte.titulos.push({ id: 'gt1', grau: 'reino', de: 'do Vale Alto', fac: 'fb', tit: 'gp2', pret: [{ p: 'gp1', mot: 'pela avó' }] });
      });
    });
    const dp = () => A(L, () => JSON.parse(JSON.stringify(__mundo.App.mapa.dipl || null)));
    const ras = () => A(L, () => { try { return JSON.parse(localStorage.getItem('tinycats:jornal:rascunho') || 'null'); } catch (e) { return null; } });
    const materia = async re => { const r = await ras(); return r && r.materias ? r.materias.find(x => re.test(x.tit)) || null : null; };
    const hojeDt = await A(L, () => window.MundoCorte.hoje(__mundo.App.mapa)), hojeTxt = await A(L, () => window.MundoCorte.dataTxt(__mundo.App.mapa, window.MundoCorte.hoje(__mundo.App.mapa)));
    await aba(L, 'diplomacia');
    const secMg = () => A(L, () => { const e = document.querySelector('#pane [data-k="mg:novo"]'); return e ? e.closest('.sec').innerText.replace(/\s+/g, ' ') : ''; });
    ok(/MOTIVOS DE GUERRA \+ Motivo de guerra Nenhum motivo de guerra ainda\. Sugestões pelos pretendentes Aldar contra Vale Isolda pretende Reino do Vale Alto \(pela avó\) Usar… Só você vê os motivos de guerra\./i.test(await secMg()),
      'a seção dos motivos de guerra: vazia, com a sugestão pela pretendente: ' + await secMg());
    await semAvisos(L); await A(L, () => document.querySelector('#pane [data-k="mg:novo"]').closest('.sec').scrollIntoView()); await espera(150); await foto('l11-motivos-sugestao');
    // usar a sugestão
    await botao(L, 'mg:usar:gt1:gp1'); await L.F.waitForSelector('dialog.mg-dl[open]');
    ok(await A(L, () => { const d0 = document.querySelector('dialog.mg-dl[open]'); return [d0.querySelector('[data-k="mg:de"]').value, d0.querySelector('[data-k="mg:contra"]').value, d0.querySelector('[data-k="mg:txt"]').value, d0.querySelector('[data-k="mg:vale"]').checked].join('|'); }) === 'fa|fb|Isolda pretende Reino do Vale Alto (pela avó)|true',
      '"Usar…": a janela começa com a sugestão (Aldar contra Vale, o texto, "Ainda vale")');
    await L.F.click(dlg('[data-k="mg:ok"]')); await espera(350);
    let d = await dp();
    ok(d.motivosGuerra.length === 1 && j(d.motivosGuerra[0]) === j({ id: d.motivosGuerra[0].id, de: 'fa', contra: 'fb', txt: 'Isolda pretende Reino do Vale Alto (pela avó)', vale: true, tit: 'gt1', p: 'gp1' }) && /O motivo de guerra de Aldar contra Vale entrou na lista\./.test(await avisos(L)),
      'criar: o motivo com o título e a pretendente de onde veio: ' + j(d.motivosGuerra));
    ok(!/Sugestões pelos pretendentes/.test(await secMg()) && /Aldar contra Vale Isolda pretende/.test(await secMg()), 'a sugestão usada sai; o motivo aparece com Aldar');
    // um motivo novo: os erros, "não vale mais", mudar
    await botao(L, 'mg:novo'); await L.F.waitForSelector('dialog.mg-dl[open]');
    const errMg = () => A(L, () => document.querySelector('dialog.mg-dl[open] .err').textContent);
    await L.F.click(dlg('[data-k="mg:ok"]')); await espera(120);
    ok(await errMg() === 'Escolha a facção e contra quem.', 'sem as facções: não passa');
    await L.F.selectOption(dlg('[data-k="mg:de"]'), 'fb'); await L.F.selectOption(dlg('[data-k="mg:contra"]'), 'fb'); await L.F.click(dlg('[data-k="mg:ok"]')); await espera(120);
    ok(await errMg() === 'O motivo é contra outra facção.', 'contra si mesma: não passa');
    await L.F.selectOption(dlg('[data-k="mg:contra"]'), 'fa'); await L.F.click(dlg('[data-k="mg:ok"]')); await espera(120);
    ok(await errMg() === 'Escreva o motivo.', 'sem o motivo: não passa');
    await L.F.fill(dlg('[data-k="mg:txt"]'), 'a fronteira do rio'); await L.F.uncheck(dlg('[data-k="mg:vale"]'));
    await L.F.click(dlg('[data-k="mg:ok"]')); await espera(350);
    d = await dp();
    const mgB = d.motivosGuerra.find(x => x.de === 'fb');
    const itemB = () => A(L, id => { const e = document.querySelector('#pane [data-k="mg:' + id + '"]'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; }, mgB && mgB.id);
    ok(mgB && mgB.contra === 'fa' && mgB.txt === 'a fronteira do rio' && mgB.vale === false && await itemB() === 'contra Aldar a fronteira do rio não vale mais' && await campo(L, 'mg:fac:fb').count() === 1,
      'o motivo do Vale (no grupo dele), que não vale mais (com a etiqueta): ' + await itemB());
    await botao(L, 'mg:' + mgB.id); await L.F.waitForSelector('dialog.mg-dl[open]');
    await L.F.check(dlg('[data-k="mg:vale"]')); await L.F.click(dlg('[data-k="mg:ok"]')); await espera(350);
    ok((await dp()).motivosGuerra.find(x => x.id === mgB.id).vale === true && /O motivo de guerra está salvo\./.test(await avisos(L)), 'mudar: volta a valer');
    // o filtro; tirar (com Desfazer)
    await campo(L, 'dp:fac').selectOption('fc'); await espera(300);
    ok(/MOTIVOS DE GUERRA \+ Motivo de guerra Nenhum motivo de guerra ainda\. Só você vê/i.test(await secMg()), 'o filtro das Ilhas: nenhum motivo');
    await campo(L, 'dp:fac').selectOption(''); await espera(300);
    await botao(L, 'mg:' + mgB.id); await L.F.waitForSelector('dialog.mg-dl[open]');
    await L.F.click(dlg('[data-k="mg:tirar"]')); await espera(250);
    ok(/Tirar o motivo de guerra\?/.test(await A(L, () => document.querySelector('dialog.mundo-dl[open]').innerText)), 'tirar: pergunta antes');
    await L.F.click('dialog.mundo-dl[open] button[type="submit"]'); await espera(350);
    ok(!(await dp()).motivosGuerra.some(x => x.id === mgB.id) && /O motivo de guerra saiu\./.test(await avisos(L)), 'tirar: o motivo sai');
    await L.F.locator('#toasts button', { hasText: 'Desfazer' }).click(); await espera(350);
    ok((await dp()).motivosGuerra.some(x => x.id === mgB.id), 'Desfazer: ele volta');
    // um motivo que não vale mais não aparece na hora de declarar
    await A(L, () => __mundo.App.mudar('guerra e paz: um rancor velho', m => { m.dipl.motivosGuerra.push({ id: 'mgv', de: 'fa', contra: 'fb', txt: 'um rancor velho', vale: false }); }));
    // declarar a guerra
    await botao(L, 'gu:fa:fb'); await L.F.waitForSelector('dialog.gu-dl[open]');
    const gd = s0 => 'dialog.gu-dl[open] ' + s0;
    const motivos = () => A(L, () => [...document.querySelectorAll('dialog.gu-dl[open] [data-k="gu:motivo"] option')].map(o => o.textContent));
    ok(await L.F.locator(gd('[data-k="gu:de:fa"]')).isChecked() && j(await motivos()) === j(['Isolda pretende Reino do Vale Alto (pela avó)', 'Sem motivo']), 'quem declara: Aldar, com os motivos dela contra o Vale: ' + j(await motivos()));
    ok(await L.F.locator(gd('[data-k="gu:enc:tgp"]')).isChecked() && !(await L.F.locator(gd('[data-k="gu:enc:tgc"]')).isChecked())
      && /A relação entre Aldar e Vale: Neutra → Guerra \(dos dois lados\)\./.test(await A(L, () => document.querySelector('dialog.gu-dl[open] [data-k="gu:rel"]').textContent))
      && /Vale é vassala de Aldar: a vassalagem continua/.test(await A(L, () => document.querySelector('dialog.gu-dl[open] [data-k="gu:vas"]').textContent)),
      'o que muda: a relação; o tratado de paz marcado para acabar (o de comércio, não); o aviso da vassalagem');
    await L.F.check(gd('[data-k="gu:de:fb"]')); await espera(80);
    ok(j(await motivos()) === j(['a fronteira do rio', 'Sem motivo']), 'o Vale declara: os motivos dele');
    await L.F.check(gd('[data-k="gu:de:fa"]')); await espera(80);
    ok(!(await L.F.locator(gd('[data-k="gu:jornal"]')).isChecked()), 'a caixa do Jornal, desmarcada');
    await L.F.check(gd('[data-k="gu:jornal"]')); await L.F.click(gd('[data-k="gu:jornal:ver"] > summary')); await espera(120);
    const notG = await A(L, () => document.querySelector('dialog.gu-dl[open] [data-k="gu:jornal:txt"]').innerText.replace(/\s+/g, ' ').trim());
    ok(notG === 'Aldar declara guerra a Vale Aldar declarou guerra a Vale (' + hojeTxt + '). O motivo: Isolda pretende Reino do Vale Alto (pela avó). Os tratados que acabaram: Paz ou trégua.', 'a prévia da notícia: ' + notG);
    await semAvisos(L); await foto('l11-guerra');
    await L.F.click(gd('[data-k="gu:ok"]')); await espera(450);
    d = await dp();
    const rels = () => A(L, () => { const m = __mundo.App.mapa, f = id => m.faccoes.find(x => x.id === id); return [f('fa').rel.fb || 'neutra', f('fb').rel.fa || 'neutra']; });
    ok(j(await rels()) === j(['guerra', 'guerra']) && j(d.tratados.find(x => x.id === 'tgp').enc) === j(hojeDt) && d.tratados.find(x => x.id === 'tgc').enc === null
      && /Aldar declarou guerra a Vale\. 1 tratado acabou\. A notícia foi para o rascunho do Jornal\./.test(await avisos(L)), 'declarar: Guerra dos dois lados; a paz acaba hoje (o comércio, não); o aviso');
    const mg1 = await materia(/^Aldar declara guerra a Vale$/);
    ok(mg1 && /^Aldar declarou guerra a Vale \(.+\)\.\n\n\*\*O motivo:\*\* Isolda pretende/.test(mg1.txt), 'a notícia no rascunho do Jornal: ' + j(mg1));
    await A(L, () => __mundo.App.desfazer()); await espera(400);
    ok(j(await rels()) === j(['neutra', 'neutra']) && (await dp()).tratados.find(x => x.id === 'tgp').enc === null && !(await materia(/^Aldar declara guerra/)), 'Desfazer: a relação, a paz e a notícia voltam como estavam');
    await A(L, () => __mundo.App.refazer()); await espera(400);
    ok(j(await rels()) === j(['guerra', 'guerra']) && !!(await materia(/^Aldar declara guerra/)), 'Refazer: a guerra e a notícia de novo');
    // fazer a paz
    ok(await campo(L, 'paz:fa:fb').count() === 1 && await campo(L, 'gu:fa:fb').count() === 0, 'em guerra, o par mostra "Fazer a paz…"');
    await botao(L, 'paz:fa:fb'); await L.F.waitForSelector('dialog.paz-dl[open]');
    const pz = s0 => 'dialog.paz-dl[open] ' + s0;
    ok(await L.F.locator(pz('[data-k="paz:rel:neutra"]')).isChecked() && await A(L, () => document.querySelector('dialog.paz-dl[open] [data-k="paz:tipo"]').value) === 'paz' && await L.F.locator(pz('[data-k="paz:pub"]')).isChecked()
      && await A(L, () => document.querySelector('dialog.paz-dl[open] [data-k="paz:fim:ano"]').closest('.ps-data').hidden) && !(await L.F.locator(pz('[data-k="paz:jornal"]')).isChecked()),
      'a paz: Neutra, o tratado de Paz ou trégua, público, sem prazo; a caixa do Jornal desmarcada');
    await L.F.check(pz('[data-k="paz:rel:tensao"]')); await L.F.check(pz('[data-k="paz:prazo"]')); await L.F.fill(pz('[data-k="paz:fim:ano"]'), String(hojeDt.a - 1));
    await L.F.click(pz('[data-k="paz:ok"]')); await espera(120);
    ok(await A(L, () => document.querySelector('dialog.paz-dl[open] .err').textContent) === 'O prazo já passou.', 'o prazo que já passou: não passa');
    await L.F.fill(pz('[data-k="paz:fim:ano"]'), String(hojeDt.a + 2)); await L.F.fill(pz('[data-k="paz:txt"]'), 'Fim da guerra do rio.');
    await L.F.check(pz('[data-k="paz:jornal"]')); await L.F.click(pz('[data-k="paz:jornal:ver"] > summary')); await espera(120);
    const notP = await A(L, () => document.querySelector('dialog.paz-dl[open] [data-k="paz:jornal:txt"]').innerText.replace(/\s+/g, ' ').trim());
    ok(notP === 'Aldar e Vale fazem a paz Aldar e Vale fizeram a paz (' + hojeTxt + '). O tratado: Paz ou trégua, até ano ' + (hojeDt.a + 2) + '. Fim da guerra do rio.', 'a prévia da notícia da paz (acompanha o que muda): ' + notP);
    await semAvisos(L); await A(L, () => { document.querySelector('dialog.paz-dl[open] .err').textContent = ''; }); await foto('l11-paz');
    await L.F.click(pz('[data-k="paz:ok"]')); await espera(450);
    d = await dp();
    const tz = d.tratados[d.tratados.length - 1];
    ok(j(await rels()) === j(['tensao', 'tensao']) && tz.tipo === 'paz' && j(tz.partes) === j(['fa', 'fb']) && j(tz.ini) === j(hojeDt) && j(tz.fim) === j({ a: hojeDt.a + 2 }) && tz.pub && tz.txt === 'Fim da guerra do rio.' && tz.enc === null
      && /Aldar e Vale fizeram a paz\. A notícia foi para o rascunho do Jornal\./.test(await avisos(L)) && !!(await materia(/^Aldar e Vale fazem a paz$/)),
      'a paz: Tensão dos dois lados; o tratado de paz desde hoje, com o prazo e os termos; a notícia: ' + j(tz));
    // assinar um tratado com a notícia
    await botao(L, 'dp:novo'); await L.F.waitForSelector('dialog.tr-dl[open]');
    ok(!(await L.F.locator(dlg('[data-k="tr:jornal"]')).isChecked()), 'o tratado novo: a caixa do Jornal, desmarcada');
    await L.F.check(dlg('[data-k="tr:parte:fa"]')); await L.F.check(dlg('[data-k="tr:parte:fc"]')); await L.F.check(dlg('[data-k="tr:jornal"]'));
    await L.F.click(dlg('[data-k="tr:ok"]')); await espera(450);
    const mt = await materia(/^Aldar e Ilhas assinam um tratado$/);
    ok(/O tratado Aliança: Aldar, Ilhas entrou na diplomacia\. A notícia foi para o rascunho do Jornal\./.test(await avisos(L)) && mt && /^Aldar e Ilhas assinaram um tratado de Aliança \(.+\)\.$/.test(mt.txt), 'assinar: a notícia no rascunho do Jornal: ' + j(mt));
    await botao(L, 'tr:tgc'); await L.F.waitForSelector('dialog.tr-dl[open]');
    ok(await L.F.locator(dlg('[data-k="tr:jornal"]')).count() === 0, 'o cartão de um tratado que já existe: sem a caixa do Jornal');
    await L.F.click(dlg('[data-k="tr:nao"]')); await espera(150);
    // quem joga: sem os motivos de guerra e sem os botões
    await comoJogador(L, true);
    await aba(L, 'diplomacia');
    const pj = await textoPane(L);
    ok(!/MOTIVOS DE GUERRA|Isolda pretende|fronteira do rio|Declarar guerra|Fazer a paz/i.test(pj), 'quem joga: sem os motivos de guerra e sem os botões');
    await comoJogador(L, false);
    // no celular: as janelas cabem
    await L.P.setViewportSize({ width: 400, height: 820 }); await espera(400);
    const cabeDl = s0 => A(L, x => { const dd = document.querySelector(x); return dd.scrollWidth <= dd.clientWidth + 1 && dd.getBoundingClientRect().width <= window.innerWidth; }, s0);
    // (quem declara, de começo: a outra do par, quando só ela tem motivo que vale)
    await A(L, () => __mundo.App.mudar('guerra e paz: o motivo do Culto', m => { m.dipl.motivosGuerra.push({ id: 'mgc', de: 'fd', contra: 'fa', txt: 'a heresia' }); }));
    await A(L, () => { window.MundoDiplomaciaPainel.janelaGuerra('fa', 'fd'); }); await L.F.waitForSelector('dialog.gu-dl[open]');
    ok(await L.F.locator('dialog.gu-dl[open] [data-k="gu:de:fd"]').isChecked() && await cabeDl('dialog.gu-dl[open]'), 'no celular, a declaração de guerra cabe (e quem declara, de começo, é o Culto: só ele tem motivo)');
    await semAvisos(L); await foto('l11-guerra-celular');
    await L.F.click('dialog.gu-dl[open] [data-k="gu:nao"]'); await espera(200);
    await A(L, () => { window.MundoDiplomaciaPainel.janelaPaz('fa', 'fb'); }); await L.F.waitForSelector('dialog.paz-dl[open]');
    ok(await cabeDl('dialog.paz-dl[open]'), 'no celular, a paz cabe');
    await L.F.click('dialog.paz-dl[open] [data-k="paz:nao"]'); await espera(200);
    await L.P.setViewportSize({ width: 1400, height: 900 }); await espera(300);
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
