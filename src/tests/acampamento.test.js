// Acampamento sem mesa (tudo neste navegador) e os atalhos entre os sistemas, dentro da casca:
// provisões, estrutura, bônus, diário, descanso (prévia, gasto de rações, Desfazer), a roda em volta da fogueira,
// e Mapa-múndi ⇄ Cenas ⇄ Acampamento.
const zlib = require('zlib');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function png(w, h, cor) {
  const pedaco = (tipo, dados) => { const tam = Buffer.alloc(4), td = Buffer.concat([Buffer.from(tipo, 'latin1'), dados]), c = Buffer.alloc(4); tam.writeUInt32BE(dados.length); c.writeUInt32BE(crc32(td)); return Buffer.concat([tam, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const linha = 1 + w * 3, cru = Buffer.alloc(linha * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = cor(x, y), i = y * linha + 1 + x * 3; cru[i] = r; cru[i + 1] = g; cru[i + 2] = b; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pedaco('IHDR', ihdr), pedaco('IDAT', zlib.deflateSync(cru)), pedaco('IEND', Buffer.alloc(0))]);
}
const pc = (id, nome, lvl, estado) => ({ id, nome, raca: 'Humano', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: lvl, tiers: { FOR: 'A', DES: 'C', AGI: 'D', VIT: 'B', CAN: 'E' }, pctProprio: null,
  poderes: [{ id: 'pw' + id, nome: 'Cura', atual: 0, max: 2 }], skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 10, DFM: 4 }, rol: { fixa: 20, fonte: 'total' }, ultRol: null,
  disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 }, estaque: { a: '', b: '' }, habilidades: [], itens: [],
  recursos: [{ id: 'hp' + id, nome: 'HP', fml: 'VIT*8 + LVL*5' }, { id: 'sp' + id, nome: 'SP', fml: 'CAN*6 + LVL*3' }], notas: '', estado });
const fichas = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_dain', 'Dain X', 5, { rec: { hppc_dain: 40 }, san: 60, conf: 30 }), pc('pc_lia', 'Lia', 3, { san: 95, conf: 96 }), pc('pc_ogro', 'Ogro', 6, {})], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });

(async () => {
  const t = await start();
  // ================= a página do Acampamento, sozinha =================
  {
    const { page: P } = await t.device({ name: 'acamp', seed: { urgm_calc_atributos_v1: fichas } });
    const w = ms => P.waitForTimeout(ms || 160);
    const A = fn => P.evaluate(fn);
    const aba = async id => { await P.locator('#tab-' + id).click(); await w(); };
    const toast = () => P.locator('#toasts .toast span').first().innerText().catch(() => '');
    await P.goto(t.base + 'acampamento/?debug', { waitUntil: 'load' }); await w(900);
    ok(await A(() => __acamp.pronto && __acamp.modo === 'local' && __acamp.papel === 'mestre'), 'o Acampamento abre sozinho, sem mesa');
    ok(await P.locator('#cenario .chama').count() === 3 && await P.locator('#cenario .estrela').count() > 30, 'a cena tem a fogueira e o céu');
    ok(await P.locator('#vazio').isVisible() && (await P.locator('#vazio').innerText()).includes('aba Grupo'), 'sem ninguém, a cena explica como chamar os personagens');
    ok(await P.locator('#btCena').isHidden() && await P.locator('#btMundo').isHidden() && await P.locator('#btMomento').isHidden(), 'fora do site não há atalhos para os outros sistemas; sem mesa, não há "Momento"');

    // ---------- chamar os personagens (as fichas deste navegador) ----------
    await P.locator('#chamar').selectOption({ label: 'Dain X' }); await w();
    await P.locator('#chamar').selectOption({ label: 'Lia' }); await w();
    await P.locator('#chamar').selectOption({ label: 'Ogro' }); await w();
    ok(await P.locator('#roda .pers').count() === 3 && await P.locator('#vazio').isHidden(), 'os três chamados aparecem em volta da fogueira');
    const lugares = await A(() => Array.from(document.querySelectorAll('#roda .pers')).map(e => [parseFloat(e.style.left), parseFloat(e.style.top)]));
    ok(lugares[0][0] < lugares[1][0] && lugares[1][0] < lugares[2][0] && lugares[1][1] > lugares[0][1], 'em arco na frente do fogo: ' + JSON.stringify(lugares));
    ok(await P.locator('#roda .pers').first().locator('.b').count() === 4, 'quem usa Sanidade e Conforto mostra as quatro barrinhas (HP, SP, Sanidade, Conforto)');
    ok(await P.locator('#roda .pers').nth(2).locator('.b').count() === 2, 'quem não usa mostra só HP e SP');
    await P.locator('#roda .pers').first().click(); await w();
    ok((await P.locator('.pcard.sel .med').innerText()).replace(/\s+/g, ' ').includes('HP 40/') && (await P.locator('.pcard.sel .med').innerText()).includes('Sanidade') && (await P.locator('.pcard.sel .med').innerText()).includes('Cura'), 'clicar em alguém abre os detalhes no painel (barras, Sanidade, Conforto, poderes)');
    // arrastar para outro lugar
    const caixa = await P.locator('#roda .pers').first().boundingBox();
    await P.mouse.move(caixa.x + caixa.width / 2, caixa.y + 40); await P.mouse.down(); await P.mouse.move(caixa.x + caixa.width / 2 - 120, caixa.y - 30, { steps: 6 }); await P.mouse.up(); await w(250);
    ok(await A(() => !!__acamp.camp.lugares.pc_dain && __acamp.camp.lugares.pc_dain.x < 30), 'o mestre arrasta alguém para outro lugar e o lugar fica guardado');
    await P.keyboard.press('Control+z'); await w(250);
    ok(await A(() => !__acamp.camp.lugares.pc_dain), 'Ctrl+Z devolve ao lugar de antes');

    // ---------- provisões ----------
    await aba('provisoes');
    await P.locator('#pv-novo').click(); await w();
    ok(await P.evaluate(() => document.activeElement && document.activeElement.id.startsWith('pv-n-')), 'provisão nova já vem com o cursor no nome');
    await P.keyboard.type('Pão de viagem'); await P.keyboard.press('Enter'); await w();
    const idPao = await A(() => __acamp.camp.provisoes[0].id);
    for (let i = 0; i < 2; i++) { await P.locator('#pv-p-' + idPao).click(); await w(90); }
    await P.locator('#pv-novo').click(); await w(); await P.keyboard.type('Carne seca'); await P.keyboard.press('Enter'); await w();
    const idCarne = await A(() => __acamp.camp.provisoes[1].id);
    await P.locator('#pv-q-' + idCarne).fill('5'); await P.locator('#pv-q-' + idCarne).press('Enter'); await w();
    ok(await A(() => JSON.stringify(__acamp.camp.provisoes.map(p => [p.nome, p.qtd]))) === '[["Pão de viagem",3],["Carne seca",5]]', 'provisões com nome e quantidade');
    ok((await P.locator('#chipRacoes').innerText()).replace(/\s+/g, ' ') === 'Rações 8' && (await P.locator('#provResumo').innerText()).includes('8 rações guardadas') && (await P.locator('#provResumo').innerText()).includes('gasta 3'), 'a barra e o resumo contam as rações e o custo do descanso: ' + await P.locator('#provResumo').innerText());
    await P.locator('#pv-dn-' + idPao).click(); await w();
    ok(await A(() => __acamp.camp.provisoes[0].nome) === 'Carne seca', 'as setas mudam a ordem em que as rações são gastas');
    await P.locator('#pv-up-' + idPao).click(); await w();

    // ---------- estrutura: melhorias e equipamentos ----------
    await aba('estrutura');
    await P.locator('#ml-novo').click(); await w(); await P.keyboard.type('Fogão de pedra'); await P.keyboard.press('Enter'); await w();
    const idM = await A(() => __acamp.camp.melhorias[0].id);
    await P.locator(`#ml-conf-${idM}`).fill('5'); await P.locator(`#ml-conf-${idM}`).press('Enter'); await w();
    await P.locator(`#ml-prov-${idM}`).fill('-1'); await P.locator(`#ml-prov-${idM}`).press('Enter'); await w();
    await P.locator('#eq-novo').click(); await w(); await P.keyboard.type('Sacos de dormir'); await P.keyboard.press('Enter'); await w();
    const idE = await A(() => __acamp.camp.equipamentos[0].id);
    await P.locator(`#eq-conf-${idE}`).fill('10'); await P.locator(`#eq-conf-${idE}`).press('Enter'); await w();
    await P.locator(`#eq-san-${idE}`).fill('5'); await P.locator(`#eq-san-${idE}`).press('Enter'); await w();
    await P.locator(`#eq-q-${idE}`).fill('4'); await P.locator(`#eq-q-${idE}`).press('Enter'); await w();
    ok((await P.locator('#estResumo').innerText()).includes('Conforto +15 · Sanidade +5 · 1 ração a menos por descanso'), 'a estrutura soma os efeitos do que está em uso: ' + await P.locator('#estResumo').innerText());
    ok((await P.locator('#avisosCena').innerText()).includes('Conforto +15'), 'e a cena mostra o resumo');
    await P.locator(`#eq-on-${idE}`).uncheck(); await w();
    ok((await P.locator('#estResumo').innerText()).includes('Conforto +5') && !(await P.locator('#estResumo').innerText()).includes('Sanidade'), 'equipamento fora de uso deixa de contar');
    await P.locator(`#eq-on-${idE}`).check(); await w();

    // ---------- bônus ----------
    await aba('grupo');
    await P.locator('#bn-novo').click(); await w(); await P.keyboard.type('Moral alta'); await P.keyboard.press('Enter'); await w();
    const idB = await A(() => __acamp.camp.bonus[0].id);
    await P.locator('#bn-a-' + idB).check(); await w();
    ok((await P.locator('#avisosCena').innerText()).includes('Moral alta') && (await P.locator('#avisosCena').innerText()).includes('até o descanso'), 'o bônus aparece na cena, marcado "até o descanso"');

    // ---------- descanso longo: prévia ----------
    await P.locator('#btLongo').click(); await w(300);
    ok(await P.locator('dialog[open] h2').innerText() === 'Descanso longo', 'o descanso abre uma prévia antes de mexer em qualquer coisa');
    const previa = (await P.locator('dialog[open]').innerText()).replace(/\s+/g, ' ');
    ok(previa.includes('gasta 2 de 8 rações (Pão de viagem −2). Sobram 6.'), 'a prévia diz quais rações saem (3 personagens − 1 do fogão): ' + (await P.locator('#ds-prov').innerText()));
    ok(/HP 40 → \d+\/\d+/.test(previa) && previa.includes('60 → 70') && previa.includes('30 → 55') && previa.includes('Cura 0 → 2'), 'e o que cada um recupera: barras, Sanidade (+10), Conforto (+25) e poderes');
    ok(previa.includes('95 → 100') && previa.includes('96 → 100'), 'sem passar de 100');
    ok(previa.includes('Sem mesa aberta, as fichas não são alteradas'), 'sem mesa, avisa que as fichas não mudam');
    await P.locator('#ds-pc_ogro').uncheck(); await w(200);
    ok((await P.locator('#ds-prov').innerText()).includes('gasta 1 de 8'), 'tirando alguém do descanso, a conta das rações muda');
    await P.locator('#ds-pc_ogro').check(); await w(200);
    await P.locator('#ds-ok').click(); await w(300);
    ok(await A(() => JSON.stringify(__acamp.camp.provisoes.map(p => p.qtd))) === '[1,5]' && await A(() => __acamp.camp.bonus.length === 0), 'descansando, as rações saem e o bônus "até o descanso" acaba');
    ok((await toast()).startsWith('Descanso longo: 3 descansaram · 2 rações gastas'), 'com um aviso do que aconteceu: ' + await toast());
    await aba('diario');
    ok((await P.locator('#diario .dl').first().innerText()).includes('Descanso longo: 3 descansaram'), 'e o diário ganha a linha');
    ok(JSON.parse(await P.evaluate(() => localStorage.getItem('urgm_calc_atributos_v1'))).personagens[0].estado.rec.hppc_dain === 40, 'sem mesa, a ficha não foi alterada');
    await P.locator('#toasts .toast button').click(); await w(250);
    ok(await A(() => JSON.stringify(__acamp.camp.provisoes.map(p => p.qtd))) === '[3,5]' && await A(() => __acamp.camp.bonus.length === 1 && __acamp.camp.diario.length === 0), 'o Desfazer do aviso devolve as rações, o bônus e tira a linha do diário');

    // ---------- faltando rações ----------
    await aba('provisoes');
    await P.locator('#pv-q-' + idCarne).fill('0'); await P.locator('#pv-q-' + idCarne).press('Enter'); await w();
    await P.locator('#pv-q-' + idPao).fill('1'); await P.locator('#pv-q-' + idPao).press('Enter'); await w();
    ok(await P.locator('#chipRacoes.pouco').count() === 1, 'com menos rações do que o descanso pede, a barra avisa');
    await P.locator('#btLongo').click(); await w(300);
    ok(await P.locator('#ds-prov.ruim').count() === 1 && (await P.locator('#ds-prov').innerText()).includes('Faltam 1 ração'), 'a prévia avisa que faltam rações: ' + await P.locator('#ds-prov').innerText());
    ok((await P.locator('dialog[open]').innerText()).replace(/\s+/g, ' ').includes('30 → 45'), 'e o Conforto sobe menos (+25 − 10)');
    await P.keyboard.press('Escape'); await w(200);
    ok(await P.locator('dialog[open]').count() === 0 && await A(() => __acamp.camp.provisoes[0].qtd === 1), 'Esc fecha a prévia sem mudar nada');

    // ---------- descanso curto e regras ----------
    await P.locator('#btCurto').click(); await w(300);
    const curto = (await P.locator('dialog[open]').innerText()).replace(/\s+/g, ' ');
    ok(curto.includes('HP 40 → ') && !curto.includes('Faltam') && curto.includes('Cura 0/2') === false, 'o descanso curto recupera um quarto e não gasta provisões');
    await P.keyboard.press('Escape'); await w(200);
    await aba('diario');
    await P.locator('#regras summary').click(); await w();
    await P.locator('#rg-curto-rec').fill('50'); await P.locator('#rg-curto-rec').press('Enter'); await w();
    ok(await A(() => __acamp.camp.regras.curto.rec === 50), 'o mestre muda as regras do descanso');
    await P.locator('#rg-padrao').click(); await w();
    ok(await A(() => __acamp.camp.regras.curto.rec === 25), '"Voltar às regras padrão" desfaz as mudanças');
    await P.locator('#di-txt').fill('Lia ensinou uma canção antiga.'); await P.locator('#di-txt').press('Enter'); await w();
    ok((await P.locator('#diario .dl').first().innerText()).includes('canção antiga'), 'dá para anotar no diário');
    // limpar o Diário inteiro: pede confirmação, e dá para desfazer
    await P.locator('#di-txt').fill('Choveu a noite toda.'); await P.locator('#di-txt').press('Enter'); await w();
    const nDiario = await A(() => __acamp.camp.diario.length);
    await P.locator('#di-limpar').click(); await w();
    ok(nDiario >= 2 && (await P.locator('#dlg h2').innerText()) === 'Limpar o Diário?' && (await P.locator('#dlg .dl-b').innerText()).includes(nDiario + ' anotações'), 'limpar o Diário pede confirmação, dizendo quantas anotações saem');
    await P.locator('#dlg .btn', { hasText: 'Cancelar' }).click(); await w();
    ok(await A(() => __acamp.camp.diario.length) === nDiario, 'cancelando, nada muda');
    await P.locator('#di-limpar').click(); await w(); await P.locator('#di-limpar-ok').click(); await w();
    ok(await A(() => __acamp.camp.diario.length) === 0 && (await P.locator('#diario').innerText()).includes('Nada anotado ainda') && await P.locator('#di-limpar').count() === 0, 'confirmando, o Diário fica vazio (e o botão some: não há o que limpar)');
    await P.locator('.toast button', { hasText: 'Desfazer' }).click(); await w();
    ok(await A(() => __acamp.camp.diario.length) === nDiario && (await P.locator('#diario .dl').first().innerText()).includes('Choveu a noite toda'), '"Desfazer" traz as anotações de volta');

    // ---------- nome, hora e fundo ----------
    await P.locator('#nome').fill('Clareira do Vau'); await P.locator('#nome').press('Enter'); await w();
    await P.locator('#hora button', { hasText: 'Amanhecer' }).click(); await w();
    ok(await A(() => __acamp.camp.nome === 'Clareira do Vau' && __acamp.camp.hora === 'amanhecer') && await P.locator('#palco.hora-amanhecer').count() === 1, 'nome e hora do acampamento');
    await aba('grupo');
    await P.locator('#arq').setInputFiles({ name: 'fundo.png', mimeType: 'image/png', buffer: png(800, 450, (x, y) => [30 + (y >> 2), 50, 90 - (y >> 3)]) });
    ok(await (async () => { for (let i = 0; i < 40; i++) { if (await A(() => !!__acamp.camp.fundo)) return true; await w(150); } return false; })(), 'o mestre troca o fundo por uma imagem');
    ok(await P.locator('#cena16 img.fundo').count() === 1 && await P.locator('#cenario').isHidden() && await P.locator('#roda .pers').count() === 3, 'a imagem entra no lugar da ilustração e as pessoas continuam por cima');
    // ---------- o palco em telas de vários formatos ----------
    /* O que tem de valer em qualquer tela: as pessoas inteiras dentro do palco (retrato, nome e barrinhas), sem ninguém
       debaixo dos botões de descanso, o nome num tamanho que dá para ler e a cena sem buraco dos lados. */
    const medir = () => A(() => {
      const r = e => e.getBoundingClientRect(), pa = r(document.getElementById('palco')), c = r(document.getElementById('cena16')), ac = r(document.getElementById('acoes'));
      const gente = Array.from(document.querySelectorAll('#roda .pers')).map(r), nomes = Array.from(document.querySelectorAll('#roda .pers .nm')).map(e => r(e).height);
      const cl = document.getElementById('palco').classList, vis = s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; };
      return {
        dentro: gente.every(g => g.top >= pa.top - 0.5 && g.bottom <= pa.bottom + 0.5 && g.left >= pa.left - 0.5 && g.right <= pa.right + 0.5),
        livres: gente.every(g => g.bottom <= ac.top + 0.5), nome: Math.min(...nomes), cobre: c.left <= pa.left + 0.5 && c.right >= pa.right - 0.5 && c.bottom >= pa.bottom - pa.height / 3,
        faixa: cl.contains('com-faixa'), alto: c.top <= pa.top + 0.5, cima: vis('#cena16 .longe.cima'), baixo: vis('#cena16 .longe.baixo'), vao: cl.contains('com-vao'),
        mascara: (() => { const f = document.querySelector('#cena16 img.fundo'); if (!f) return null; const cs = getComputedStyle(f); return (cs.maskImage || cs.webkitMaskImage || 'none') !== 'none'; })(),
      };
    });
    const telas = [[1600, 900, 'larga'], [1440, 900, 'de notebook'], [1100, 800, 'quase quadrada'], [760, 860, 'estreita e alta'], [1500, 520, 'larga e baixa'], [390, 780, 'de celular']];
    const gaveta = async aberta => { if (await A(() => document.getElementById('side').classList.contains('fechado')) === aberta) { await P.locator('#btPainel').click(); await w(300); } };
    for (const [tw, th, nome] of telas) {
      await P.setViewportSize({ width: tw, height: th }); await gaveta(tw > 720); await w(350);     // no celular o painel é uma gaveta por cima do palco: fechada
      const m = await medir();
      ok(m.dentro && m.livres && m.cobre, 'tela ' + nome + ' (' + tw + '×' + th + '), com a imagem: todos inteiros dentro do palco, fora dos botões, e a cena de lado a lado: ' + JSON.stringify(m));
      ok(m.nome >= 15, 'tela ' + nome + ': o nome de cada um continua de um tamanho que dá para ler (' + m.nome.toFixed(1) + ' px de altura)');
      ok(m.faixa === !m.alto && m.cima === m.faixa && m.baixo === m.vao && m.mascara === (m.faixa || m.vao), 'tela ' + nome + ': onde a imagem não chega, ela continua desfocada (em cima: ' + m.cima + ', embaixo: ' + m.baixo + ') e se desfaz na continuação');
      if (nome === 'estreita e alta') ok(m.faixa && m.cima, 'na tela estreita e alta a cena não chega ao alto do palco, e a imagem do mestre continua por cima em vez de sobrar uma faixa lisa');
      if (nome === 'larga') ok(!m.faixa && !m.vao && !m.mascara, 'na tela larga a imagem cobre o palco inteiro, sem continuação nem desfeito');
    }
    await P.setViewportSize({ width: 1440, height: 900 }); await gaveta(true); await w(350);
    await P.locator('#fundoTirar').click(); await w();
    ok(await A(() => __acamp.camp.fundo === null) && await P.locator('#cenario').isVisible() && await P.locator('#cena16 .longe').count() === 0, '"Voltar à ilustração" devolve a fogueira');
    for (const [tw, th, nome] of telas) {
      await P.setViewportSize({ width: tw, height: th }); await gaveta(tw > 720); await w(350);
      const m = await medir();
      ok(m.dentro && m.livres && m.cobre && m.nome >= 15, 'tela ' + nome + ', com a ilustração: todos inteiros, fora dos botões, nome legível: ' + JSON.stringify(m));
    }
    await P.setViewportSize({ width: 1440, height: 900 }); await gaveta(true); await w(350);

    // ---------- tudo continua lá ao recarregar ----------
    await P.reload({ waitUntil: 'load' }); await w(900);
    ok(await A(() => __acamp.camp.nome === 'Clareira do Vau' && __acamp.camp.presentes.length === 3 && __acamp.camp.melhorias.length === 1 && __acamp.camp.equipamentos[0].qtd === 4 && __acamp.camp.diario.length === 2), 'recarregando, o acampamento continua como estava (com as duas anotações do Diário)');
    await P.setViewportSize({ width: 390, height: 780 }); await w(400);
    ok(await P.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1) && await P.locator('#roda .pers').first().isVisible(), 'no celular a página não rola para o lado e a roda continua à vista');
  }

  // ================= dentro da casca: atalhos entre os sistemas =================
  {
    const { page: S } = await t.device({ name: 'casca', seed: { urgm_calc_atributos_v1: fichas, 'tinycats:aba': 'cenas', 'tinycats-tour': '1' } });
    const w = ms => S.waitForTimeout(ms || 250);
    const quadro = async re => { for (let i = 0; i < 60; i++) { const f = S.frame({ url: re }); if (f) return f; await S.waitForTimeout(200); } return null; };
    const ate = async (fn, ms = 12000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* carregando */ } if (Date.now() - t0 > ms) return false; await S.waitForTimeout(250); } };
    const abaAtiva = () => S.evaluate(() => (document.querySelector('.tab[aria-selected="true"]') || {}).id);
    await S.goto(t.base + '?debug', { waitUntil: 'load' });
    ok(await ate(async () => (await abaAtiva()) === 'tab-cenas', 15000), 'a casca abre nas Cenas');
    ok(await S.locator('.tab:visible').count() === 6 && (await S.locator('#tab-acampamento').innerText()).trim() === 'Acampamento', 'a casca tem a aba Acampamento');
    const C = await quadro(/\/cenas\//);
    ok(await ate(async () => await C.evaluate(() => !!window.__tc && __tc.Store.S.order.length >= 1)), 'as Cenas carregam');
    const idPonte = await C.evaluate(() => { const u = __tc, sc = u.newScene('Emboscada na ponte'); u.Store.addScene(sc); u.Persist.scene(sc.id); return sc.id; });
    ok(await ate(async () => JSON.parse(await S.evaluate(() => localStorage.getItem('tinycats:cenas:lista') || '[]')).some(c => c.nome === 'Emboscada na ponte')), 'as Cenas publicam a lista de cenas para os outros sistemas');

    // ---------- Mapa-múndi: marcador com atalho ----------
    await S.locator('#tab-mundo').click();
    const M = await quadro(/\/mundo\//);
    ok(await ate(async () => await M.evaluate(() => !!window.__mundo && __mundo.App.pronto)), 'o Mapa-múndi abre');
    ok(await M.locator('#atalhos').isVisible(), 'dentro do site, a barra do mapa tem os atalhos para as Cenas e o Acampamento');
    const idMar = await M.evaluate(() => { const { App, N } = __mundo; App.criarMapa('Terras'); const o = N.objNovo('m', { x: 400, y: 300, nome: 'Vau do Corvo' }); App.mudar('marcador', m => { m.objs.push(o); }); App.selecionar(o.id); return o.id; });
    await w(400);
    ok(await M.locator(`[data-k="o:${idMar}:liga"] option`).count() >= 3 && (await M.locator(`[data-k="o:${idMar}:liga"]`).innerText()).includes('Cena · Emboscada na ponte'), 'o marcador tem o campo "Atalho", com o Acampamento e as cenas');
    await M.locator(`[data-k="o:${idMar}:liga"]`).selectOption('cena:' + idPonte); await w(400);
    ok(await M.evaluate(id => { const o = __mundo.App.mapa.objs.find(x => x.id === id); return o.liga && o.liga.t === 'cena' && o.liga.nome === 'Emboscada na ponte'; }, idMar), 'o atalho para a cena fica guardado no marcador');
    ok(await M.locator('.mar.com-liga .liga-bola').count() === 1, 'e o marcador ganha a setinha de atalho no mapa');
    await M.locator(`[data-k="o:${idMar}:seguir"]`).click();
    ok(await ate(async () => (await abaAtiva()) === 'tab-cenas' && await C.evaluate(id => __tc.Store.S.current === id, idPonte)), '"Abrir a cena" leva para as Cenas, já na cena certa');
    await S.locator('#tab-mundo').click(); await w(300);
    await M.locator(`[data-k="o:${idMar}:liga"]`).selectOption('acampamento'); await w(400);
    const caixa = await M.locator('.mar.com-liga').boundingBox();
    await S.mouse.dblclick(caixa.x + caixa.width / 2, caixa.y + 14);
    ok(await ate(async () => (await abaAtiva()) === 'tab-acampamento'), 'dois cliques no marcador seguem o atalho: abre o Acampamento');

    // ---------- Acampamento → mapa tático nas Cenas ----------
    const A = await quadro(/\/acampamento\//);
    ok(await ate(async () => await A.evaluate(() => !!window.__acamp && __acamp.pronto)), 'o Acampamento abre dentro do site');
    ok(await A.locator('#btCena').isVisible() && await A.locator('#btMundo').isVisible(), 'com os botões "Mapa tático" e "Mapa-múndi"');
    await A.locator('#nome').fill('Acampamento do Vau'); await A.locator('#nome').press('Enter'); await w(200);
    await A.locator('#btCena').click(); await w(300);
    ok((await A.locator('#menuCena').innerText()).includes('Emboscada na ponte') && await A.locator('#cenaNova').count() === 1, 'sem mapa ligado, o botão pergunta qual cena é o mapa do acampamento (ou cria uma)');
    await A.locator('#cenaNova').click();
    ok(await ate(async () => (await abaAtiva()) === 'tab-cenas' && await C.evaluate(() => __tc.Store.scene().name === 'Acampamento do Vau' && __tc.Store.scene().tone === 'noite')), 'criar leva às Cenas, numa cena nova com o nome do acampamento, de noite');
    const idCamp = await C.evaluate(() => __tc.Store.S.current);
    ok(await A.evaluate(id => __acamp.camp.cena === id, idCamp), 'e o acampamento guarda qual é o mapa dele');
    await C.evaluate(id => __tc.UI.switchScene(id), idPonte); await w(300);
    await S.locator('#tab-acampamento').click(); await w(300);
    await A.locator('#btCena').click();
    ok(await ate(async () => (await abaAtiva()) === 'tab-cenas' && await C.evaluate(id => __tc.Store.S.current === id, idCamp)), 'da próxima vez, "Mapa tático" vai direto para o mapa do acampamento');
    await S.locator('#tab-acampamento').click(); await w(300);
    await A.locator('#btMundo').click();
    ok(await ate(async () => (await abaAtiva()) === 'tab-mundo'), '"Mapa-múndi" volta para o mapa');
    await M.locator('#irAcamp').click();
    ok(await ate(async () => (await abaAtiva()) === 'tab-acampamento'), 'e o botão "Acampamento" do mapa vai para o acampamento');

    // ---------- Acampamento → ficha ----------
    await A.locator('#chamar').selectOption({ label: 'Lia' }); await w(300);
    await A.locator('#roda .pers').first().click(); await w(300);
    await A.locator('.cartao .btn', { hasText: 'Abrir a ficha' }).click();
    const F = await quadro(/\/fichas\//);
    ok(await ate(async () => (await abaAtiva()) === 'tab-fichas' && F && (await F.locator('#f_nome').inputValue()) === 'Lia'), '"Abrir a ficha" leva às Fichas, já na ficha da pessoa');
  }

  if (t.errs.length) console.log(t.errs.slice(0, 10).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
