// Fichas, lote 43 (sem mesa: cada um é o mestre): os ícones das habilidades e as favoritas, na aba Skills.
//   · as aprendidas viram linhas (o guia de 30/10): o ícone do papel num quadrado, com a marca de tempo no canto; o
//     nome, o texto em uma linha e a árvore; à direita, as etiquetas da barra (▼ 3 Geada — o número do grau comprado;
//     ▲ enche, com "+"; ⇄ balança) e a estrela;
//   · tocar na linha abre o texto inteiro; "Abrir todas" / "Fechar todas";
//   · o filtro de um toque: Todas · Reações · os papéis desta ficha · Favoritas, somando com os de antes (e as escritas
//     à mão: Reativo conta como reação); cada ficha lembra;
//   · a estrela: a favorita vai para o topo (skills.fav), com Desfazer; a ordem das favoritas muda arrastando a alça
//     ou com Alt e as setas;
//   · "Distribuir pontos" mostra o ícone e as etiquetas pequenas; no celular, cabe.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const j = JSON.stringify;

const g = (uso, texto) => ({ custos: { p1: 1 }, texto: texto || '', uso });
const no = (id, nome, extra) => Object.assign({ id, nome, tipo: 'notavel', pais: ['n_raiz'], usos: ['ativa'], desc: '', graus: [g(null)] }, extra);
const bib = { nome: 'Bib', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 20 }], naturezas: [],
  usos: [{ id: 'passiva', nome: 'Passiva', sigla: 'Pa' }, { id: 'ativa', nome: 'Ativa', sigla: 'At' }, { id: 'reacao', nome: 'Reação', sigla: 'Re' }, { id: 'postura', nome: 'Postura', sigla: 'Po' }],
  arvores: [{ id: 'a_sel', nome: 'Kitsune Selene', categoria: 'outra', nodes: [
    { id: 'n_raiz', nome: 'Origem', tipo: 'keystone', pais: [], usos: [], desc: 'O começo.', graus: [{ custos: {}, texto: '' }] },
    no('n_lamina', 'Lâmina Gélida', { papel: 'ofensiva', desc: 'Lâmina de gelo sobre a arma: dano de gelo e 1 acúmulo de frio por golpe que acerta, até o fim da cena.',
      graus: [g([{ b: 'Geada de Selene', v: '2' }, { b: 'SP', v: '3' }], 'Dano +2'), g([{ b: 'Geada de Selene', v: '3' }], 'Dano +4')] }),
    no('n_veu', 'Véu de Neve', { papel: 'suporte', usos: ['reacao'], desc: 'Quando um aliado a até 3 cédulas vai sofrer um golpe, ele ganha Escudado.', graus: [g([{ b: 'Geada de Selene', v: '2' }])] }),
    no('n_garra', 'Garra Dupla', { papel: 'ofensiva', desc: 'Dois golpes de garra rápidos.', graus: [g([{ b: 'Barra Bestial', v: '+2' }])] }),
    no('n_lucro', 'Lucro Rápido', { papel: 'utilidade', usos: ['passiva'], barraEfeito: 'enche', desc: 'Cada furto rende barra no começo do próximo turno.' }),
    no('n_dreno', 'Dreno Frio', { papel: 'controle', barraEfeito: 'ambos', desc: 'Prende o alvo e devolve parte do frio.', graus: [g([{ b: 'Geada de Selene', v: '4' }])] }),
    no('n_comp', 'Passo do Compasso', { papel: 'movimento', usos: ['postura'], barraEfeito: 'balanca', desc: 'Gira e anda duas cédulas.', graus: [g([{ b: 'Compasso', v: '3' }])] }),
    no('n_nada', 'Olhar Atento', { desc: 'Vê o que está escondido.' })] }] };
const pc = Object.assign(R.personagemPadrao('Selene'), { id: 'pc_s', level: 8, recursos: [{ id: 'hp1', nome: 'HP', fml: '100' }],
  habilidades: [{ id: 'h1', nome: 'Contra-golpe', desc: 'Revida.', tipo: 'Reativo' }, { id: 'h2', nome: 'Faro', desc: 'Sente cheiros.', tipo: 'Passivo' }],
  skills: { arvores: ['a_sel'], pontos: { p1: 20 }, alocados: { n_raiz: 1, n_lamina: 2, n_veu: 1, n_garra: 1, n_lucro: 1, n_dreno: 1, n_comp: 1, n_nada: 1 },
    unicas: [{ id: 'u1', nome: 'Sopro Protetor', desc: 'Cura um aliado.', papel: 'suporte', uso: [{ b: 'Geada', v: '1' }], usos: ['ativa'] }] } });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc], situacoes: [], tabelas: [], log: [], bib, sel: 'pc_s', selSit: null, aba: 'fichas', grupos: [], abaFicha: 'skills' });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas-l43', w: 1300, h: 940, seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const foto = async (nome, cheia) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png'), fullPage: !!cheia }); } };
  // as linhas: [chave, nome, o nome por extenso do ícone, as etiquetas] (só as que aparecem)
  const linhas = () => P.evaluate(() => [...document.querySelectorAll('#habsDaArvore .skl')].filter(x => !x.hidden).map(x => ({
    k: x.dataset.skkey, nome: x.querySelector('.skl-nome').firstChild.textContent.trim(), ic: (x.querySelector('.tci-quadro') || {}).getAttribute ? x.querySelector('.tci-quadro').getAttribute('aria-label') || '' : '',
    etq: [...x.querySelectorAll('.tci-chip')].map(c => c.textContent.replace(/\s+/g, ' ').trim()), fav: x.classList.contains('fav') })));
  const mao = () => P.evaluate(() => [...document.querySelectorAll('#painelHabs [data-habmao]')].filter(x => !x.hidden).map(x => x.querySelector('[data-habnome]').value));
  const fav = () => P.evaluate(() => JSON.parse(JSON.stringify(S.personagens[0].skills.fav || [])));
  const L = k => P.locator('#habsDaArvore .skl[data-skkey="' + k + '"]');
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1400);
  if (!(await P.locator('#habsDaArvore').count())) { await P.locator('#ficha [data-abaficha="skills"]').click(); await w(300); }

  await passo('as linhas', async () => {
    const l = await linhas(), por = Object.fromEntries(l.map(x => [x.k, x]));
    ok(j(l.map(x => x.k)) === j(['n_lucro', 'n_dreno', 'n_garra', 'n_lamina', 'n_nada', 'n_veu', 'n_comp', 'n_raiz', 'u:u1']), 'uma linha por skill, na ordem de sempre (pelo tipo de uso, depois o nome), e a única no fim: ' + j(l.map(x => x.k)));
    ok(por.n_lamina.ic === 'Ofensiva, gasta 3 Geada de Selene' && j(por.n_lamina.etq) === j(['▼3 Geada de Selene']), 'Lâmina Gélida (grau 2): a espada e "▼ 3 Geada de Selene" — o número do grau comprado; o SP não conta: ' + j(por.n_lamina));
    ok(por.n_veu.ic === 'Suporte, reação, gasta 2 Geada de Selene', 'Véu de Neve: a cruz com o raio da reação');
    ok(j(por.n_garra.etq) === j(['▲2 Barra Bestial']) && j(por.n_lucro.etq) === j(['▲Geada de Selene']), '"+2": ▲ 2 Barra Bestial; a passiva que enche, sem custo: ▲ e o nome da barra da árvore');
    ok(j(por.n_dreno.etq) === j(['▼4 Geada de Selene', '▲Geada de Selene']) && j(por.n_comp.etq) === j(['⇄3 Compasso']), 'os dois: ▼ 4 e ▲; balança: ⇄ 3 Compasso');
    ok(por.n_nada.ic === '' && !por.n_nada.etq.length && por['u:u1'].ic === 'Suporte, gasta 1 Geada', 'sem papel: o quadrado vazio, sem etiqueta; a skill única com o papel dela');
    const d = await L('n_lamina').evaluate(x => { const s = x.querySelector('.skl-desc'); return { umaLinha: s.scrollWidth > s.clientWidth || s.getBoundingClientRect().height < 24, de: x.querySelector('.skl-de').textContent, corpo: x.querySelector('.skl-corpo').hidden }; });
    ok(d.umaLinha && d.de === 'Kitsune Selene' && d.corpo, 'o texto em uma linha só, a árvore embaixo; o resto, fechado');
    await foto('l43-ficha-lista');
  });

  await passo('abrir e fechar', async () => {
    await L('n_lamina').locator('.skl-linha').click(); await w(150);
    const a = await L('n_lamina').evaluate(x => ({ exp: x.querySelector('.skl-linha').getAttribute('aria-expanded'), corpo: !x.querySelector('.skl-corpo').hidden, txt: x.querySelector('.skl-corpo').innerText }));
    ok(a.exp === 'true' && a.corpo && /Dano \+4/.test(a.txt) && /Custo de uso: 3 Geada de Selene/.test(a.txt), 'tocar abre o texto inteiro (o grau, o custo de uso): ' + a.txt.replace(/\s+/g, ' ').slice(0, 120));
    await L('n_lamina').locator('.skl-linha').click(); await w(150);
    ok(await L('n_lamina').locator('.skl-corpo').isHidden(), 'tocar de novo fecha');
    const bt = P.locator('[data-sklabrirtodas]');
    ok((await bt.innerText()) === 'Abrir todas', '"Abrir todas" no cabeçalho');
    await bt.click(); await w(150);
    ok(await P.locator('#habsDaArvore .skl-corpo:not([hidden])').count() === 9 && (await bt.innerText()) === 'Fechar todas', '"Abrir todas" abre as nove; o botão vira "Fechar todas"');
    await foto('l43-ficha-abertas', true);
    await bt.click(); await w(150);
    ok(await P.locator('#habsDaArvore .skl-corpo:not([hidden])').count() === 0, '"Fechar todas" fecha');
  });

  await passo('o filtro de um toque', async () => {
    const bts = await P.locator('#skf-rapido [data-skfp]').allInnerTexts();
    ok(j(bts.map(x => x.trim())) === j(['Todas', 'Reações', 'Ofensivas', 'Suporte', 'Controle', 'Movimento', 'Utilidade']), 'a fileira: Todas, Reações e os papéis desta ficha (sem Favoritas ainda): ' + j(bts));
    await P.locator('#skf-rapido [data-skfp="reacao"]').click(); await w(200);
    ok(j((await linhas()).map(x => x.k)) === j(['n_veu']) && j(await mao()) === j(['Contra-golpe']), 'Reações: o Véu de Neve e a escrita à mão "Reativo"');
    await P.locator('#skf-rapido [data-skfp="ofensiva"]').click(); await w(200);
    ok(j((await linhas()).map(x => x.k)) === j(['n_garra', 'n_lamina']) && (await mao()).length === 0, 'Ofensivas: a Garra e a Lâmina (as escritas à mão somem)');
    await P.locator('#skf-busca').fill('garra'); await w(250);
    ok(j((await linhas()).map(x => x.k)) === j(['n_garra']), 'soma com a busca ("garra")');
    await P.locator('#skf-busca').fill(''); await w(250);
    await P.reload({ waitUntil: 'load' }); await w(1200);
    if (!(await P.locator('#habsDaArvore').count())) { await P.locator('#ficha [data-abaficha="skills"]').click(); await w(300); }
    ok(await P.locator('#skf-rapido [data-skfp="ofensiva"][aria-pressed="true"]').count() === 1 && (await linhas()).length === 2, 'a ficha lembra (depois de recarregar, Ofensivas continua)');
    await foto('l43-ficha-filtro');
    await P.locator('#skf-rapido [data-skfp="ofensiva"]').click(); await w(200);
    ok((await linhas()).length === 9 && await P.locator('#skf-rapido [data-skfp=""][aria-pressed="true"]').count() === 1, 'tocar de novo no que está ligado volta para Todas');
  });

  await passo('as favoritas', async () => {
    await L('n_comp').locator('[data-skfav]').click(); await w(300);
    ok(j(await fav()) === j(['n_comp']) && (await linhas())[0].k === 'n_comp' && (await linhas())[0].fav, 'a estrela: o Passo do Compasso vai para o topo (skills.fav)');
    ok(await P.locator('.toast button', { hasText: 'Desfazer' }).count() > 0, 'o aviso traz o Desfazer');
    await L('n_dreno').locator('[data-skfav]').click(); await w(300);
    ok(j(await fav()) === j(['n_comp', 'n_dreno']) && j((await linhas()).slice(0, 2).map(x => x.k)) === j(['n_comp', 'n_dreno']), 'a segunda favorita entra depois da primeira');
    ok(await P.locator('#skf-rapido [data-skfp="fav"]').count() === 1, '"Favoritas" aparece na fileira');
    await P.locator('#skf-rapido [data-skfp="fav"]').click(); await w(200);
    ok(j((await linhas()).map(x => x.k)) === j(['n_comp', 'n_dreno']), 'Favoritas: só as duas');
    await P.locator('#skf-rapido [data-skfp=""]').click(); await w(200);
    // Alt e as setas
    await L('n_dreno').locator('[data-skalca]').focus();
    await P.keyboard.press('Alt+ArrowUp'); await w(300);
    ok(j(await fav()) === j(['n_dreno', 'n_comp']) && await P.evaluate(() => document.activeElement && document.activeElement.dataset.skalca) === 'n_dreno', 'Alt e ↑ na alça: o Dreno sobe (o foco fica na alça)');
    // arrastar
    const de = await L('n_comp').locator('[data-skalca]').boundingBox(), para = await L('n_dreno').boundingBox();
    await P.mouse.move(de.x + de.width / 2, de.y + de.height / 2); await P.mouse.down();
    await P.mouse.move(de.x + de.width / 2, para.y + 4, { steps: 6 }); await w(80);
    await P.mouse.up(); await w(300);
    ok(j(await fav()) === j(['n_comp', 'n_dreno']), 'arrastar a alça do Compasso para cima do Dreno: a ordem volta');
    await foto('l43-ficha-favoritas');
    await L('n_comp').locator('[data-skfav]').click(); await w(300);
    const f1 = await fav();
    ok(j(f1) === j(['n_dreno']), 'tocar na estrela de novo tira das favoritas: ' + j(f1));
    await P.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(300);
    ok(j(await fav()) === j(['n_comp', 'n_dreno']), 'Desfazer: volta como estava');
  });

  await passo('distribuir pontos', async () => {
    if (!(await P.locator('.skno').count())) { await P.locator('[data-skui="distribuir"]').click(); await w(300); }
    const ic = await P.locator('.skno .sknome', { hasText: 'Véu de Neve' }).locator('.sk-ic').getAttribute('aria-label');
    const ch = await P.locator('.skno .sknome', { hasText: 'Garra Dupla' }).locator('.tci-chip').innerText();
    ok(ic === 'Suporte, reação, gasta 2 Geada de Selene' && /▲\s*2 Barra Bestial/.test(ch), '"Distribuir pontos": o ícone e as etiquetas pequenas (' + ch.replace(/\s+/g, ' ') + ')');
    await foto('l43-ficha-distribuir', true);
  });

  await passo('tema claro e celular', async () => {
    await P.evaluate(() => { document.documentElement.setAttribute('data-tema', 'claro'); }); await w(200);
    await foto('l43-ficha-claro');
    const cor = await L('n_lamina').locator('.tci-chip').evaluate(x => getComputedStyle(x).color);
    ok(cor === 'rgb(217, 98, 43)', 'no tema claro, o ▼ é o laranja do guia (#D9622B): ' + cor);
    await P.evaluate(() => { document.documentElement.setAttribute('data-tema', 'pedra'); });
    await P.setViewportSize({ width: 400, height: 860 }); await w(300);
    const r = await P.evaluate(() => ({ larg: document.documentElement.scrollWidth, chips: (() => { const a = document.querySelector('.skl[data-skkey="n_lamina"] .skl-dir').getBoundingClientRect(), b = document.querySelector('.skl[data-skkey="n_lamina"] .skl-linha').getBoundingClientRect(); return a.top >= b.bottom - 2; })() }));
    ok(r.larg <= 400 && r.chips, 'no celular, cabe; as etiquetas vão embaixo do nome: ' + j(r));
    await foto('l43-ficha-celular', true);
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
