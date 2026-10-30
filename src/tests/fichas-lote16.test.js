// Fichas, lote 16 (sem mesa, tudo neste navegador):
//   · a ficha em abas (Atributos · Bolsas e itens · Social · Skills · Notas) com o resumo fixo em cima: as barras (que
//     se editam ali), os atributos e as defesas, os lapros, a caixinha, os ferimentos, a Sanidade e o Conforto; os selos
//     levam à aba certa; a aba é lembrada (também ao recarregar); a ficha nova abre em Atributos;
//   · o aniversário, no calendário do mundo (sem mapa, os meses de começo): o dia, o mês e o ano opcional; o dia que
//     não cabe no mês avisa; apagar tudo tira;
//   · a caixinha do grupo (sem mesa, nesta tela): a prévia antes, os botões que não valem apagados, pôr, pegar, o achado
//     e a despesa (sem mesa, quem usa é o mestre), o extrato, o Desfazer; a ficha sem grupo explica;
//   · a aba Skills como resumo: os cartões do que foi aprendido na árvore e das skills únicas (com o bônus contando nos
//     atributos); "Passar para skills únicas…" com a prévia (as inativas desmarcadas) e o Desfazer; sem mesa, sem o
//     "Abrir na Árvore".
// (Na mesa — o elenco em dois blocos, a caixinha pelo banco — é o lote16.rede.test.js.)
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const bib = { nome: 'Bib', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 10 }], usos: [{ id: 'passiva', nome: 'Passiva', sigla: 'Pa' }, { id: 'ativa', nome: 'Ativa', sigla: 'At' }, { id: 'reacao', nome: 'Reação', sigla: 'Re' }], naturezas: [], tipos: {},
  arvores: [{ id: 'a1', nome: 'Monge', categoria: 'classe', nodes: [
    { id: 'n1', nome: 'Origem', tipo: 'keystone', pais: [], usos: [], desc: 'Ponto de partida.', graus: [{ custos: {}, texto: '' }] },
    { id: 'n2', nome: 'Punho de Titânio', tipo: 'notavel', pais: ['n1'], usos: ['passiva'], desc: 'Golpes desarmados causam {FOR*2} de dano.', graus: [{ custos: { p1: 1 }, texto: '+2 dano', bonus: { FOR: 2 } }, { custos: { p1: 2 }, texto: '+4 dano' }] }] }] };
const pc = (id, nome, extra) => Object.assign(R.personagemPadrao(nome), { id, nome, level: 8, recursos: [{ id: 'hp' + id, nome: 'HP', fml: '100' }] }, extra);
const dain = pc('pc_dain', 'Dain X', { grupo: 'Heróis', estado: { lapros: 50, rec: { hppc_dain: 70 }, san: 80, conf: 60, fer: { f1: { p: 'bracoE', g: 2, k: 'DES', v: -2, s: {} } } },
  habilidades: [{ id: 'h1', nome: 'Faro aguçado', desc: 'Sente cheiros a 100 m.', tipo: 'Passivo' }, { id: 'h2', nome: 'Grito de guerra', desc: 'Aliados +1.', tipo: 'Ativo' }, { id: 'h3', nome: 'Velho truque', desc: '', tipo: 'Inativo' }],
  skills: { arvores: ['a1'], pontos: { p1: 10 }, alocados: { n1: 1, n2: 2 }, unicas: [{ id: 'u1', nome: 'Sangue do dragão', desc: 'Cura {VIT*2} de HP.', bonus: { VIT: 3 }, uso: [{ b: 'SP', v: '10' }], usos: ['ativa'] }] } });
const lia = pc('pc_lia', 'Lia', { grupo: 'Heróis', estado: { lapros: 5 } });
const solo = pc('pc_solo', 'Andarilho', { grupo: '' });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [dain, lia, solo], situacoes: [], tabelas: [], log: [], bib, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: ['Heróis'] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas-l16', w: 1300, h: 900, seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms);
  const j = JSON.stringify;
  const S0 = fn => P.evaluate(fn);
  const foto = async nome => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png'), fullPage: true }); } };
  const toast = () => S0(() => [...document.querySelectorAll('.toast')].map(x => x.textContent).join(' | '));
  const visiveis = () => S0(() => [...document.querySelectorAll('#ficha [data-abafichac]')].filter(x => !x.hidden).map(x => x.dataset.abafichac).join(','));
  const abrir = async nome => { await P.locator('#lista .pc', { has: P.locator('.nm', { hasText: new RegExp('^' + nome + '$') }) }).click(); await w(300); };
  const aba = async k => { await P.locator('#ficha [data-abaficha="' + k + '"]').click(); await w(200); };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);

  await passo('as abas e o resumo', async () => {
    const abas = await P.locator('#ficha [data-abaficha]').allInnerTexts();
    ok(j(abas.map(x => x.replace(/\d+$/, '').trim().toUpperCase())) === j(['ATRIBUTOS', 'BOLSAS E ITENS', 'SOCIAL', 'SKILLS', 'NOTAS']) && await visiveis() === 'atributos', 'cinco abas; abre em Atributos: ' + j(abas));
    ok(/^SKILLS\s*6$/i.test((await P.locator('#ficha [data-abaficha="skills"]').innerText()).trim()), 'a aba Skills diz quantas: 2 da árvore + 1 única + 3 escritas à mão = 6');
    const rs = P.locator('#resumo');
    ok(await rs.locator('[data-resatual="hppc_dain"]').inputValue() === '70' && await rs.locator('.rsnums').count() === 1 && await rs.locator('#f_lapros').inputValue() === '50', 'no resumo: a barra de HP (70), os atributos e as defesas, os lapros (50)');
    ok(/Caixinha\s*0/.test(await rs.locator('.cxchip').innerText()) && /ferimento/.test(await rs.locator('.rschip.ruim').innerText()) && await rs.locator('.rschip.mente-san').count() === 1 && await rs.locator('.rschip.mente-conf').count() === 1, 'e os selos: a caixinha do grupo, o ferimento aberto, a Sanidade e o Conforto');
    await rs.locator('[data-resatual="hppc_dain"]').fill('-10%'); await rs.locator('[data-resatual="hppc_dain"]').press('Enter'); await w(300);
    ok(await S0(() => S.personagens[0].estado.rec.hppc_dain) === 60, 'a barra se edita ali mesmo (−10% → 60)');
    await aba('social');
    ok(await visiveis() === 'social' && await rs.isVisible() && await P.locator('#painelMente').isVisible(), 'trocar de aba: só a aba escolhida aparece; o resumo continua em cima');
    await rs.locator('.rschip.ruim').click(); await w(300);
    ok(await visiveis() === 'atributos' && await P.locator('#painelCorpo').isVisible(), 'o selo do ferimento leva a Atributos, ao corpo');
    await rs.locator('.cxchip').click(); await w(300);
    ok(await visiveis() === 'bolsas' && await P.locator('#painelCaixa').isVisible(), 'o selo da caixinha leva a Bolsas e itens');
    await P.reload({ waitUntil: 'load' }); await w(1000);
    ok(await visiveis() === 'bolsas', 'a aba fica lembrada ao recarregar');
    await abrir('Lia');
    ok(await visiveis() === 'bolsas', 'e ao trocar de personagem');
    await P.locator('#btnNew').click(); await w(400);
    ok(await visiveis() === 'atributos', 'a ficha nova abre em Atributos (o "Quem é")');
    await S0(() => { S.personagens = S.personagens.filter(p => p.nome !== 'Novo personagem'); S.sel = 'pc_dain'; save(); render(); }); await w(300);
  });

  await passo('o aniversário', async () => {
    await aba('atributos');
    ok(await P.locator('#anivBox').count() === 1 && (await P.locator('#f_aniv_m option').count()) === 13 && /No calendário do mundo/.test(await P.locator('#anivBox').innerText()), 'em Atributos, o aniversário: o dia, os 12 meses de começo (sem mapa) e o ano opcional');
    await P.locator('#f_aniv_d').fill('31'); await P.locator('#f_aniv_d').dispatchEvent('change'); await w(150);
    await P.locator('#f_aniv_m').selectOption({ label: 'Degelo' }); await w(300);
    ok(j(await S0(() => S.personagens[0].aniv)) === j({ d: 31, m: 1 }) && /Degelo tem 30 dias/.test(await P.locator('#anivInfo').innerText()), 'dia 31 de Degelo (que tem 30): fica escrito, e o aviso diz');
    await P.locator('#f_aniv_d').fill('12'); await P.locator('#f_aniv_d').dispatchEvent('change'); await w(150);
    await P.locator('#f_aniv_a').fill('277'); await P.locator('#f_aniv_a').dispatchEvent('change'); await w(300);
    ok(j(await S0(() => S.personagens[0].aniv)) === j({ d: 12, m: 1, a: 277 }) && /nasceu no ano 277/.test(await P.locator('#anivInfo').innerText()), '12 de Degelo, do ano 277 (sem a data do mundo, só isso)');
    await P.locator('#f_aniv_d').fill(''); await P.locator('#f_aniv_d').dispatchEvent('change'); await w(100);
    await P.locator('#f_aniv_m').selectOption(''); await w(100);
    await P.locator('#f_aniv_a').fill(''); await P.locator('#f_aniv_a').dispatchEvent('change'); await w(250);
    ok(await S0(() => S.personagens[0].aniv === undefined), 'apagado tudo, a ficha fica sem aniversário');
  });

  await passo('a caixinha', async () => {
    await aba('bolsas');
    const cx = P.locator('#painelCaixa');
    ok(/Heróis/.test(await cx.locator('.cxg').innerText()) && await P.locator('#cxTotal').innerText() === '0' && await P.locator('[data-cx="por"]').isDisabled() && await P.locator('[data-cx="achado"]').count() === 1, 'a caixinha do grupo Heróis, vazia; sem quantia, os botões apagados; sem mesa, também o Achado e a Despesa');
    await P.locator('#cx_q').fill('80'); await w(150);
    ok(/Pôr 80: Dain X tem só 50/.test(await P.locator('#cxPrev').innerText()) && await P.locator('[data-cx="por"]').isDisabled() && await P.locator('[data-cx="pegar"]').isDisabled() && await P.locator('[data-cx="achado"]').isEnabled(), '80: mais do que a ficha e a caixinha têm — só o Achado vale');
    await P.locator('#cx_q').fill('30'); await P.locator('#cx_nota').fill('a pousada'); await w(150);
    await P.locator('[data-cx="por"]').click(); await w(300);
    let st = await S0(() => [S.personagens[0].estado.lapros, S.caixas.g['Heróis']]);
    ok(st[0] === 20 && st[1].q === 30 && st[1].ext[0].quem === 'Dain X' && st[1].ext[0].nota === 'a pousada', 'pôs 30: a ficha com 20, a caixinha com 30, a linha no extrato');
    ok(/Dain X pôs 30 · a pousada/.test(await cx.locator('.cxext li').first().innerText()) && await P.locator('#cx_q').inputValue() === '', 'o extrato mostra; o campo fica limpo');
    await P.locator('.toast button').click(); await w(300);
    st = await S0(() => [S.personagens[0].estado.lapros, S.caixas.g['Heróis'].q]);
    ok(st[0] === 50 && st[1] === 0, 'o Desfazer devolve (a ficha com 50, a caixinha com 0)');
    await P.locator('#cx_q').fill('200'); await P.locator('[data-cx="achado"]').click(); await w(300);
    await P.locator('#cx_q').fill('15'); await P.locator('[data-cx="despesa"]').click(); await w(300);
    await P.locator('#cx_q').fill('25'); await P.locator('[data-cx="pegar"]').click(); await w(300);
    st = await S0(() => [S.personagens[0].estado.lapros, S.caixas.g['Heróis'].q, S.caixas.g['Heróis'].ext.slice(0, 3).map(e => [e.quem, e.q, e.saldo])]);
    ok(st[0] === 75 && st[1] === 160 && j(st[2]) === j([['Dain X', -25, 160], ['', -15, 185], ['', 200, 200]]), 'achado 200, despesa 15, pegou 25: a caixinha com 160, a ficha com 75: ' + j(st));
    await abrir('Lia');
    ok(await P.locator('#cxTotal').innerText() === '160' && /Caixinha\s*160/.test(await P.locator('#resumo .cxchip').innerText()), 'a Lia, do mesmo grupo, vê a mesma caixinha (160)');
    await abrir('Andarilho');
    ok(/Esta ficha está sem grupo/.test(await P.locator('#painelCaixa').innerText()) && await P.locator('#resumo .cxchip').count() === 0, 'a ficha sem grupo explica, e o resumo fica sem o selo');
    await abrir('Dain X');
  });

  await passo('a aba Skills', async () => {
    await aba('skills');
    // (lote 43: uma linha por skill; "Abrir todas" mostra o texto inteiro de cada uma)
    await P.locator('[data-sklabrirtodas]').click(); await w(200);
    const cards = await P.locator('#habsDaArvore .skl').evaluateAll(l => l.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
    ok(cards.length === 3 && /Punho de Titânio grau 2\/2/.test(cards[0]) && /Golpes desarmados causam \d+ de dano/.test(cards[0]) && /Na ficha: FOR \+2/.test(cards[0]) && /Sangue do dragão Skill única (Ativa )?Cura \d+ de HP\. Na ficha: VIT \+3 Custo de uso: 10 SP/i.test(cards[2]),
      'um cartão para cada aprendida (o grau, o texto com a conta do personagem, o bônus) e para a skill única: ' + j(cards));
    ok(await S0(() => calcular(S.personagens[0]).tot.VIT - calcular(Object.assign({}, S.personagens[0], { skills: Object.assign({}, S.personagens[0].skills, { unicas: [] }) })).tot.VIT) === 3, 'o +3 de VIT da skill única conta nos atributos');
    ok(await P.locator('[data-skabrir]').count() === 0 && await P.locator('#habsDaArvore input, #habsDaArvore textarea, #habsDaArvore select').count() === 0 && await P.locator('#habsDaArvore button:not([data-sklabrir]):not([data-skfav])').count() === 0, 'sem mesa, sem o "Abrir na Árvore"; as linhas são só leitura (abrir e a estrela)');
    await foto('l16-ficha-skills');
    await P.locator('[data-habunicas]').click(); await w(300);
    ok(j(await P.locator('.puop input').evaluateAll(l => l.map(i => i.checked))) === j([true, true, false]) && /Passivo → uso “Passiva”/.test(await P.locator('.puops').innerText()) && /Inativo → sem tipo de uso/.test(await P.locator('.puops').innerText()), 'a prévia: cada uma com o tipo de uso que ganha; a inativa desmarcada');
    await P.locator('.puop input').nth(1).uncheck(); await w(150);
    ok(/Passar 1 habilidade/.test(await P.locator('[data-puok]').innerText()), 'desmarcando, o botão acompanha ("Passar 1 habilidade")');
    await P.locator('[data-puok]').click(); await w(400);
    let s = await S0(() => [S.personagens[0].habilidades.map(h => h.nome), S.personagens[0].skills.unicas.map(u => u.nome + ':' + (u.usos || []).join())]);
    ok(j(s) === j([['Grito de guerra', 'Velho truque'], ['Sangue do dragão:ativa', 'Faro aguçado:passiva']]) && /1 habilidade virou skill única de Dain X/.test(await toast()), 'o Faro vira skill única (Passiva); as outras continuam escritas à mão: ' + j(s));
    ok((await P.locator('#habsDaArvore .skl.unica').count()) === 2, 'e já aparece nas aprendidas');
    await P.locator('.toast button').click(); await w(300);
    s = await S0(() => [S.personagens[0].habilidades.map(h => h.nome), S.personagens[0].skills.unicas.map(u => u.nome)]);
    ok(j(s) === j([['Faro aguçado', 'Grito de guerra', 'Velho truque'], ['Sangue do dragão']]), 'o Desfazer põe tudo como estava');
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
