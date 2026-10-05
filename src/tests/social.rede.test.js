// A parte "social" das fichas numa mesa de verdade (projeto real):
//  · romance (a trilha de corações) e o valor de um relacionamento escondido do jogador — escondido de verdade:
//    o valor não fica na ficha, fica num documento que só o mestre recebe;
//  · os relacionamentos de um NPC, que ficam só com o mestre mesmo com a ficha aberta aos jogadores;
//  · missões do grupo, de um personagem e pessoais, e a missão escondida até o mestre revelar;
//  · ferimentos marcados pelos dois ao mesmo tempo, com a penalidade contando nos atributos;
//  · o quadro de Ascensão (o mestre dá pontos enquanto o jogador gasta os dele) e a barra de XP.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const pc = (id, nome, lvl) => ({ id, nome, raca: 'Humano', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: lvl, tiers: { FOR: 'A', DES: 'C', AGI: 'D', VIT: 'B', CAN: 'E' }, pctProprio: null, poderes: [],
  skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 10, DFM: 4 }, rol: { fixa: 20, fonte: 'total' }, ultRol: null, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 },
  estaque: { a: '', b: '' }, habilidades: [], itens: [], recursos: [{ id: 'hp' + id, nome: 'HP', fml: 'VIT*8 + LVL*5' }], notas: '' });
const local = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_dain', 'Dain X', 5), pc('pc_lia', 'Lia', 3), pc('pc_ogro', 'Ogro do pântano', 6)], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });
const bib = { nome: 'Árvores de teste', pools: [{ id: 'pr', nome: 'Raça', cor: '#4E8C7D', padrao: 0 }, { id: 'pc', nome: 'Classe', cor: '#D9A441', padrao: 0 }], naturezas: [], usos: [], tipos: { pequeno: { nome: 'Pequeno', custo: 1 } },
  arvores: [{ id: 'a1', nome: 'Humano', categoria: 'raca', nodes: [{ id: 'n1', nome: 'Teimosia', pais: [], usos: [], graus: [{ custos: { pr: 1 }, texto: 'x' }] }, { id: 'n2', nome: 'Fôlego', pais: [], usos: [], graus: [{ custos: { pr: 1 }, texto: 'y' }] }] }] };

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { urgm_calc_atributos_v1: local, 'tinycats:aba': 'fichas' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1250, h: 820, seed: { 'tinycats:aba': 'fichas' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const fichas = async p => { for (let i = 0; i < 40; i++) { const f = p.frame({ url: /\/fichas\// }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 15000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const j = JSON.stringify;
  const linha = (p, id) => p.evaluate(id => TC.dados.col('personagens').pegar(id), id);
  const docDe = (p, id) => p.evaluate(id => { const d = TC.dados.col('documentos').pegar(id); return d && !d.apagado ? { vis: d.vis, v: d.dados && d.dados.v } : null; }, id);
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const abrir = async (f, nome, p) => { await f.locator('#lista .pc', { has: f.locator('.nm', { hasText: new RegExp('^' + nome + '$') }) }).click(); await w(350, p); };
  // o que está no banco, lido com a conta de quem pergunta (o jogador só recebe o que as regras de acesso deixam)
  const noBanco = (p, tabela, id, mesa) => p.evaluate(async ([tabela, id, mesa]) => { const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave); const { data, error } = await a.from(tabela).select('*').eq('mesa_id', mesa).eq('id', id); return error ? 'erro: ' + error.message : (data || [])[0] || null; }, [tabela, id, mesa]);

  // ---------- a mesa: três fichas; a do Dain é do jogador ----------
  await M.goto(t.base, { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Social E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let F = null;
  ok(await ate(async () => { F = await fichas(M); return F && (await F.locator('#ofertaSim').count()) === 1; }), 'a mesa nova oferece trazer as fichas do navegador');
  await F.locator('#ofertaSim').click(); await w(600);
  ok(await ate(async () => await M.evaluate(() => TC.dados.col('personagens').todas().length === 3 && TC.dados.pendentes === 0)), 'as três fichas sobem para a mesa');
  const mesa = await M.evaluate(() => TC.mesas.atual.id);
  await J.goto(t.base, { waitUntil: 'load' }); await w(1500, J);
  await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
  let G = null;
  ok(await ate(async () => { G = await fichas(J); return !!G; }) && await ate(async () => (await F.locator('#f_dono option').allInnerTexts()).join('|').includes('Dalmo')), 'o jogador entra na mesa');
  await F.locator('#f_dono').selectOption({ label: 'Dalmo' }); await w(500);
  ok(await ate(async () => (await G.locator('#lista .pc .nm').allInnerTexts()).join('|') === 'Dain X'), 'e recebe a ficha do Dain');
  await abrir(G, 'Dain X', J);

  // ---------- romance: a trilha de corações, mexida pelo jogador ----------
  await F.locator('#relNovo').selectOption({ label: 'Lia' }); await w(400);
  const rid = await F.evaluate(() => TC.rules.relacoes(S.personagens[0].estado)[0].id);
  ok(await ate(async () => { const l = await linha(J, 'pc_dain'); return R.relacoes(l.estado).length === 1 && R.relacoes(l.estado)[0].alvo === 'pc_lia'; }) && await ate(async () => (await G.locator('.relrow').count()) === 1), 'o mestre acrescenta o relacionamento do Dain com a Lia, e o jogador o vê');
  ok(await F.locator(`[data-relolho="${rid}"]`).count() === 1 && await G.locator('[data-relolho]').count() === 0, 'só o mestre tem o olho da linha');
  for (let i = 0; i < 6; i++) await G.locator(`[data-relstep="${rid}|5"]`).click();
  await G.locator(`[data-romadd="${rid}"]`).click(); await w(250, J);
  await G.locator(`[data-rom="${rid}|4"]`).click(); await w(400, J);
  ok(await ate(async () => { const e = R.relacoes((await linha(M, 'pc_dain')).estado)[0]; return e.v === 30 && e.rom === 4 && await parado(J); }), 'o jogador sobe o valor para +30 e acende quatro corações: chega à mesa');
  ok(await ate(async () => (await F.locator('.romrow .cor.cheio').count()) === 4 && (await F.locator(`[data-relval="${rid}"]`).inputValue()) === '30'), 'e aparece para o mestre');

  // ---------- o mestre esconde o valor: ele sai da ficha de verdade ----------
  await F.locator(`[data-relolho="${rid}"]`).click(); await w(500);
  ok(await ate(async () => { const b = await noBanco(M, 'personagens', 'pc_dain', mesa), s = await noBanco(M, 'documentos', 'fichas:segredos', mesa); const e = b.estado.rels[rid];
    return e && e.oc === 1 && !('v' in e) && !('rom' in e) && e.nome === 'Lia' && s && s.vis === 'mestre' && s.dono_id === null && j(s.dados.v.rel.pc_dain[rid]) === j({ v: 30, rom: 4 }); }), 'escondido: na ficha (no banco) fica só o nome; o valor e os corações vão para um documento só do mestre');
  ok(await ate(async () => (await G.locator('.relrow.sovalor').count()) === 1 && (await G.locator('.relsegredo').innerText()).includes('guardado com o mestre')) && await G.locator(`[data-relval="${rid}"]`).count() === 0 && await G.locator('.romrow').count() === 0 && await G.locator(`[data-reldel="${rid}"]`).count() === 0,
    'o jogador continua vendo com quem é, sem número, sem corações e sem poder tirar a linha');
  const visaoJ = await J.evaluate(() => ({ linha: JSON.stringify(TC.dados.col('personagens').pegar('pc_dain').estado), docs: TC.dados.col('documentos').todas().map(d => d.id) }));
  ok(!/"v":30/.test(visaoJ.linha) && !/"rom"/.test(visaoJ.linha) && !visaoJ.docs.includes('fichas:segredos'), 'no aparelho do jogador o valor não existe: nem na ficha, nem em documento nenhum — ' + j(visaoJ.docs));
  ok((await noBanco(J, 'documentos', 'fichas:segredos', mesa)) === null, 'e o banco não entrega esse documento à conta do jogador');
  ok(await F.locator('.relrow.guardada .tagseg').innerText() === 'valor escondido'.toUpperCase() || (await F.locator('.relrow.guardada .tagseg').innerText()).toLowerCase() === 'valor escondido', 'para o mestre, a linha fica marcada como "valor escondido" (e ele continua vendo tudo)');
  // o mestre muda o valor escondido: a ficha nem é tocada
  const revAntes = (await noBanco(M, 'personagens', 'pc_dain', mesa)).rev;
  await F.locator(`[data-relstep="${rid}|5"]`).click(); await F.locator(`[data-romstep="${rid}|-1"]`).click(); await w(600);
  ok(await ate(async () => { const s = await noBanco(M, 'documentos', 'fichas:segredos', mesa); return j(s.dados.v.rel.pc_dain[rid]) === j({ v: 35, rom: 3 }) && await parado(M); }) && (await noBanco(M, 'personagens', 'pc_dain', mesa)).rev === revAntes, 'o mestre muda o valor escondido (+35, três corações): só o documento dele muda; a ficha do jogador nem é gravada');
  // revelar pergunta antes
  await F.locator(`[data-relolho="${rid}"]`).click(); await w(300);
  ok(await F.locator('.relconf').count() === 1 && /Revelar a Dalmo o valor \(\+35 · 3 corações\)\?/.test(await F.locator('.relconf').innerText()), 'revelar pergunta antes: "' + (await F.locator('.relconf span').first().innerText()) + '"');
  await F.locator('[data-relnao]').click(); await w(300);
  ok(await F.locator('.relconf').count() === 0 && (await noBanco(M, 'personagens', 'pc_dain', mesa)).estado.rels[rid].oc === 1, '"Cancelar" não revela nada');
  await F.locator(`[data-relolho="${rid}"]`).click(); await w(250); await F.locator(`[data-relsim="${rid}"]`).click(); await w(500);
  ok(await ate(async () => { const b = await noBanco(M, 'personagens', 'pc_dain', mesa), s = await noBanco(M, 'documentos', 'fichas:segredos', mesa); const e = b.estado.rels[rid]; return e.v === 35 && e.rom === 3 && !e.oc && !(s.dados.v.rel && s.dados.v.rel.pc_dain); }), 'revelado: o valor (o de agora) volta para a ficha, e o mestre deixa de guardá-lo');
  ok(await ate(async () => (await G.locator(`[data-relval="${rid}"]`).count()) === 1 && (await G.locator(`[data-relval="${rid}"]`).inputValue()) === '35' && (await G.locator('.romrow .cor.cheio').count()) === 3), 'e o jogador vê +35 e três corações');

  // ---------- os relacionamentos de um NPC ficam só com o mestre ----------
  await abrir(F, 'Lia');
  await F.locator('[data-mente="usar"]').click(); await w(300);
  await F.locator('#relNovo').selectOption({ label: 'Dain X' }); await w(400);
  const lid = await F.evaluate(() => FichasMesa.relsDe(S.personagens.find(p => p.id === 'pc_lia'))[0].id);
  for (let i = 0; i < 4; i++) await F.locator(`[data-relstep="${lid}|-5"]`).click();
  await w(500);
  ok(await ate(async () => { const b = await noBanco(M, 'personagens', 'pc_lia', mesa), s = await noBanco(M, 'documentos', 'fichas:segredos', mesa), e = s.dados.v.rel.pc_lia && s.dados.v.rel.pc_lia[lid];
    return !b.estado.rels && !b.estado.rel && e && e.l === 1 && e.alvo === 'pc_dain' && e.v === -20 && await parado(M); }), 'o que a Lia (NPC) sente pelo Dain (−20) não vai para a ficha dela: fica inteiro com o mestre');
  ok((await F.locator('.relrow.guardada .tagseg').innerText()).toLowerCase() === 'só você vê' && /ficam só com você/.test(await F.locator('.relhd .hint').innerText()), 'na tela do mestre a linha diz "só você vê"');
  await F.locator('#lista .olho[data-olho="pc_lia"]').click(); await w(400);
  ok(await ate(async () => (await G.locator('#lista .pc .nm').allInnerTexts()).join('|') === 'Dain X|Lia'), 'o mestre abre a ficha da Lia aos jogadores');
  await abrir(G, 'Lia', J);
  ok(await G.locator('#painelMente .mcard').count() === 2 && await G.locator('.relrow').count() === 0 && !R.temRelacoes((await linha(J, 'pc_lia')).estado), 'o jogador vê a ficha dela (Sanidade e Conforto), mas nenhum relacionamento');
  // abrir uma linha do NPC pergunta antes; aberta, passa a estar na ficha
  await F.locator(`[data-relolho="${lid}"]`).click(); await w(250);
  ok(/Mostrar esta linha a quem vê a ficha\?/.test(await F.locator('.relconf').innerText()), 'mostrar uma linha do NPC também pergunta antes');
  await F.locator(`[data-relsim="${lid}"]`).click(); await w(500);
  ok(await ate(async () => (await G.locator('.relrow').count()) === 1 && (await G.locator(`[data-relval="${lid}"]`).inputValue()) === '-20' && await G.locator(`[data-relval="${lid}"]`).isDisabled()), 'aberta, a linha aparece para o jogador (só para consulta)');
  await F.locator(`[data-relolho="${lid}"]`).click(); await w(500);
  ok(await ate(async () => (await G.locator('.relrow').count()) === 0 && !R.temRelacoes((await linha(J, 'pc_lia')).estado)), 'e o mestre a guarda de novo com um clique (esconder não pergunta)');
  // uma ficha de NPC que ainda guarda os relacionamentos do jeito antigo (dentro da ficha): ao ser aberta, passam para o mestre
  await M.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_ogro'); P.gravar('pc_ogro', { estado: Object.assign({}, l.estado, { san: 50, rel: [{ id: 'velho1', alvo: 'pc_dain', nome: 'Dain X', v: 15 }] }) }); });
  ok(await ate(async () => { const b = await noBanco(M, 'personagens', 'pc_ogro', mesa); return b.estado.rel && b.estado.rel.length === 1 && await parado(M); }), '(o Ogro, NPC escondido, tem um relacionamento guardado do jeito antigo, dentro da ficha)');
  await abrir(F, 'Ogro do pântano');
  ok(await ate(async () => (await F.locator('.relrow').count()) === 1 && (await F.locator('.relrow .tagseg').innerText()).toLowerCase() === 'só você vê'), 'o mestre já o vê como "só você vê" (a ficha está escondida)');
  ok((await noBanco(M, 'personagens', 'pc_ogro', mesa)).estado.rel.length === 1, 'e só de olhar nada é regravado');
  await F.locator('#lista .olho[data-olho="pc_ogro"]').click(); await w(500);
  ok(await ate(async () => { const b = await noBanco(M, 'personagens', 'pc_ogro', mesa), s = await noBanco(M, 'documentos', 'fichas:segredos', mesa); const e = s.dados.v.rel.pc_ogro && s.dados.v.rel.pc_ogro.velho1;
    return b.vis === 'mesa' && !b.estado.rel && !b.estado.rels && e && e.l === 1 && e.v === 15 && e.alvo === 'pc_dain'; }), 'ao abrir a ficha do Ogro aos jogadores, o relacionamento antigo sai da ficha e fica com o mestre, com o mesmo valor');
  ok(await ate(async () => (await G.locator('#lista .pc .nm').allInnerTexts()).join('|').includes('Ogro')) && !R.temRelacoes((await linha(J, 'pc_ogro')).estado) && !(await linha(J, 'pc_ogro')).estado.rel, 'o jogador recebe a ficha do Ogro sem relacionamento nenhum');

  // ---------- missões ----------
  await abrir(F, 'Dain X'); await abrir(G, 'Dain X', J);
  await F.locator('#ficha [data-sub="missoes"]').click(); await w(300);
  await G.locator('#ficha [data-sub="missoes"]').click(); await w(300, J);
  ok(await F.locator('[data-misnova="g"]').count() === 1 && await F.locator('[data-misnova="p"]').count() === 1 && await G.locator('[data-misnova="g"]').count() === 0 && (await G.locator('[data-misnova="p"]').innerText()).includes('Missão pessoal'), 'o mestre cria missões do grupo e do personagem; o jogador, só as pessoais dele');
  await F.locator('[data-misnova="g"]').click(); await w(300);
  const gid = await F.evaluate(() => Object.keys(S.segredos.mis.g)[0]);
  await F.locator(`[data-mist="g|${gid}"]`).fill('Escoltar a caravana'); await F.locator(`[data-mist="g|${gid}"]`).press('Tab'); await w(200);
  await F.locator(`[data-misoadd="g|${gid}"]`).click(); await w(250);
  const oid = await F.evaluate(g => Object.keys(S.segredos.mis.g[g].o)[0], gid);
  await F.locator(`[data-misot="g|${gid}|${oid}"]`).fill('Sair ao amanhecer'); await w(600);
  ok(await ate(async () => { const s = await noBanco(M, 'documentos', 'fichas:segredos', mesa), m = s.dados.v.mis && s.dados.v.mis.g && s.dados.v.mis.g[gid]; return m && m.t === 'Escoltar a caravana' && m.o[oid].t === 'Sair ao amanhecer' && await parado(M); }) && (await noBanco(M, 'documentos', 'fichas:missoes', mesa)) === null,
    'a missão do grupo nasce escondida: fica com o mestre, e o documento das missões do grupo ainda nem existe');
  ok(await F.locator(`[data-mis="g|${gid}"] .tagseg`).count() === 1 && await G.locator('.miscard').count() === 0 && (await docDe(J, 'fichas:missoes')) === null, 'o mestre a vê marcada como escondida; o jogador não vê nada');
  await F.locator(`[data-misrevelar="g|${gid}"]`).click(); await w(500);
  ok(await ate(async () => { const d = await noBanco(M, 'documentos', 'fichas:missoes', mesa), s = await noBanco(M, 'documentos', 'fichas:segredos', mesa); return d && d.vis === 'mesa' && d.dados.v[gid].t === 'Escoltar a caravana' && !(s.dados.v.mis.g || {})[gid]; }), 'revelada: passa para o documento que a mesa toda lê');
  ok(await ate(async () => (await G.locator(`[data-mis="g|${gid}"]`).count()) === 1 && (await G.locator(`[data-mis="g|${gid}"] .misprog`).innerText()) === '0/1'), 'e aparece para o jogador');
  await G.locator(`[data-misabrir="g|${gid}"]`).click(); await w(300, J);
  ok(await G.locator(`[data-mis="g|${gid}"] input, [data-mis="g|${gid}"] textarea, [data-mis="g|${gid}"] select`).count() === 0 && (await G.locator(`[data-mis="g|${gid}"] ul.misobjs li`).innerText()).includes('Sair ao amanhecer'), 'aberta, ele só lê (objetivos sem caixinha para marcar)');
  const invasao = await J.evaluate(async mesa => { const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave); const r = await a.from('documentos').update({ dados: { v: {} } }).eq('mesa_id', mesa).eq('id', 'fichas:missoes').select('id'); return (r.data || []).length; }, mesa);
  ok(invasao === 0 && (await noBanco(M, 'documentos', 'fichas:missoes', mesa)).dados.v[gid].t === 'Escoltar a caravana', 'e o banco não aceita mudança do jogador nas missões do grupo');
  await F.locator(`[data-misok="g|${gid}|${oid}"]`).check(); await w(400);
  ok(await ate(async () => (await G.locator(`[data-mis="g|${gid}"] .misprog`).innerText()) === '1/1' && (await G.locator(`[data-mis="g|${gid}"] ul.misobjs li.ok`).count()) === 1), 'o mestre marca o objetivo e o jogador vê: 1/1');
  // do personagem: dada pelo mestre (escondida, depois revelada) e criada pelo jogador
  await F.locator('[data-misnova="p"]').click(); await w(300);
  const pid = await F.evaluate(() => Object.keys(S.segredos.mis.p.pc_dain)[0]);
  await F.locator(`[data-mist="p|${pid}"]`).fill('Vingar o mestre de armas'); await F.locator(`[data-mist="p|${pid}"]`).press('Tab'); await w(500);
  ok(await ate(async () => { const s = await noBanco(M, 'documentos', 'fichas:segredos', mesa); return s.dados.v.mis.p.pc_dain[pid].t === 'Vingar o mestre de armas' && await parado(M); }) && !(await noBanco(M, 'personagens', 'pc_dain', mesa)).estado.mis && await G.locator('[data-mis^="p|"]').count() === 0, 'a missão que o mestre dá ao Dain também nasce escondida (fora da ficha)');
  ok((await F.locator(`[data-misrevelar="p|${pid}"]`).innerText()) === 'Revelar a Dalmo', 'o botão diz a quem ela será revelada');
  await F.locator(`[data-misrevelar="p|${pid}"]`).click(); await w(500);
  ok(await ate(async () => { const b = await noBanco(M, 'personagens', 'pc_dain', mesa); return b.estado.mis && b.estado.mis[pid].t === 'Vingar o mestre de armas' && b.estado.mis[pid].de === 'm'; }) && await ate(async () => (await G.locator(`[data-mis="p|${pid}"]`).count()) === 1), 'revelada, vai para a ficha do Dain e o jogador a vê');
  await G.locator(`[data-misabrir="p|${pid}"]`).click(); await w(300, J);
  ok(await G.locator(`[data-mis="p|${pid}"] input`).count() === 0, 'missão dada pelo mestre: o jogador lê, não muda');
  await G.locator('[data-misnova="p"]').click(); await w(300, J);
  const jid = await G.evaluate(p => Object.keys(S.personagens.find(x => x.id === 'pc_dain').estado.mis).find(k => k !== p), pid);
  await G.locator(`[data-mist="p|${jid}"]`).fill('Aprender a ler runas'); await G.locator(`[data-mist="p|${jid}"]`).press('Tab'); await w(200, J);
  await G.locator(`[data-misoadd="p|${jid}"]`).click(); await w(250, J);
  const joid = await G.evaluate(k => Object.keys(S.personagens.find(x => x.id === 'pc_dain').estado.mis[k].o)[0], jid);
  await G.locator(`[data-misot="p|${jid}|${joid}"]`).fill('Achar um professor'); await w(600, J);
  ok(await ate(async () => { const b = await noBanco(M, 'personagens', 'pc_dain', mesa), m = b.estado.mis[jid]; return m && m.t === 'Aprender a ler runas' && m.de === 'j' && m.o[joid].t === 'Achar um professor' && await parado(J); }), 'o jogador cria a missão pessoal dele, com um objetivo: fica na ficha');
  ok(await ate(async () => (await F.locator(`[data-mis="p|${jid}"] .misde`).count()) === 1 && (await F.locator(`[data-mis="p|${jid}"] .mistit`).innerText()) === 'Aprender a ler runas'), 'o mestre a vê na ficha do Dain, marcada como pessoal');
  // os dois ao mesmo tempo, cada um numa missão: as duas mudanças ficam
  await F.locator(`[data-misabrir="p|${pid}"]`).click().catch(() => {}); await w(250);
  if (!(await F.locator(`[data-mise="p|${pid}"]`).count())) { await F.locator(`[data-misabrir="p|${pid}"]`).click(); await w(250); }
  await Promise.all([F.locator(`[data-mise="p|${pid}"]`).selectOption('feita'), G.locator(`[data-misok="p|${jid}|${joid}"]`).check()]);
  await w(700);
  ok(await ate(async () => { const b = await noBanco(M, 'personagens', 'pc_dain', mesa); return b.estado.mis[pid].e === 'feita' && b.estado.mis[jid].o[joid].ok === 1 && await parado(M) && await parado(J); }), 'o mestre conclui uma missão enquanto o jogador marca o objetivo de outra: as duas mudanças ficam no banco');
  ok(await ate(async () => (await G.locator(`[data-mis="p|${pid}"] .misest`).innerText()).toLowerCase() === 'concluída' && (await F.locator(`[data-mis="p|${jid}"] .misprog`).innerText()) === '1/1'), 'e cada um vê a do outro');
  ok(await ate(async () => (await G.locator('#ficha [data-sub="missoes"] .mk').innerText()) === '2'), 'a aba mostra quantas missões ativas o personagem tem (a do grupo e a pessoal): 2');

  // o mestre copia uma missão para outro personagem (e pode desfazer); a cópia de uma escondida continua escondida
  const misDe = async id => Object.values(((await noBanco(M, 'personagens', id, mesa)).estado || {}).mis || {});
  await F.locator(`[data-miscopiar="p|${pid}"]`).selectOption('pc_lia'); await w(400);
  ok(/Missão copiada para Lia\./.test(await F.locator('.toast').last().innerText()) && await ate(async () => { const l = await misDe('pc_lia'); return l.length === 1 && l[0].t === 'Vingar o mestre de armas' && l[0].e === 'feita' && await parado(M); }), 'copiar a missão do Dain para a Lia: ela ganha uma cópia na ficha dela');
  ok((await misDe('pc_dain')).length === 2, '(a do Dain continua onde estava)');
  await F.locator('.toast.comacao button').click(); await w(400);
  ok(await ate(async () => (await misDe('pc_lia')).length === 0 && await parado(M)), 'e o Desfazer tira a cópia');
  await F.locator('[data-misnova="p"]').click(); await w(300);
  const sid = await F.evaluate(() => Object.keys(S.segredos.mis.p.pc_dain)[0]);
  await F.locator(`[data-mist="p|${sid}"]`).fill('Descobrir quem é o traidor'); await w(300);
  await F.locator(`[data-miscopiar="p|${sid}"]`).selectOption('pc_lia'); await w(400);
  ok(/Missão copiada para Lia \(também escondida\)\./.test(await F.locator('.toast').last().innerText()) && await ate(async () => { const v = (await noBanco(M, 'documentos', 'fichas:segredos', mesa)).dados.v.mis.p; return Object.values(v.pc_lia || {}).some(m => m.t === 'Descobrir quem é o traidor') && v.pc_dain[sid].t === 'Descobrir quem é o traidor' && await parado(M); }) && (await misDe('pc_lia')).length === 0,
    'a cópia de uma missão ainda escondida também fica só com o mestre (nada vai para a ficha da Lia)');
  await F.locator('.toast.comacao button').click(); await w(400);
  await F.locator(`[data-misdel="p|${sid}"]`).click(); await w(400);
  ok(await ate(async () => { const v = (await noBanco(M, 'documentos', 'fichas:segredos', mesa)).dados.v.mis.p; return !Object.keys(v.pc_lia || {}).length && !(v.pc_dain || {})[sid] && await parado(M); }), '(desfeita a cópia e excluída a original, o mestre não guarda mais nenhuma das duas)');

  // ---------- ferimentos: os dois marcam ao mesmo tempo; a penalidade conta nos atributos ----------
  const desAntes = await F.evaluate(() => calcular(S.personagens.find(p => p.id === 'pc_dain')).tot.DES);
  ok(await G.locator('#painelCorpo svg .parte').count() === 12 && await F.locator('#painelCorpo svg .parte').count() === 12, 'a ficha do jogador já vem com o corpo: 12 partes');
  await G.locator('[data-parte="bracoE"]').click(); await w(200, J);
  await F.locator('[data-parte="pernaD"]').click(); await w(200);
  await Promise.all([G.locator('[data-fernovo]').click(), F.locator('[data-fernovo]').click()]);
  await w(700);
  ok(await ate(async () => { const b = await noBanco(M, 'personagens', 'pc_dain', mesa), fs = R.ferimentos(b.estado.fer).lista; return fs.length === 2 && fs.some(f => f.p === 'bracoE') && fs.some(f => f.p === 'pernaD') && await parado(M) && await parado(J); }), 'jogador e mestre marcam um ferimento cada, no mesmo instante: os dois ficam (braço esquerdo e perna direita)');
  const fJ = await G.evaluate(() => Object.keys(S.personagens.find(x => x.id === 'pc_dain').estado.fer).find(k => S.personagens.find(x => x.id === 'pc_dain').estado.fer[k].p === 'bracoE'));
  if (!(await G.locator(`[data-ferg="${fJ}"]`).count())) { await G.locator(`[data-ferabrir="${fJ}"]`).click(); await w(250, J); }
  await G.locator(`[data-ferg="${fJ}"]`).selectOption('3'); await w(250, J);
  await G.locator(`[data-fers="${fJ}|sg"]`).check(); await w(250, J);
  await G.locator(`[data-ferk="${fJ}"]`).selectOption('DES'); await w(300, J);
  await G.locator(`[data-ferv="${fJ}"]`).fill('2'); await G.locator(`[data-ferv="${fJ}"]`).press('Tab'); await w(600, J);
  ok(await ate(async () => { const b = await noBanco(M, 'personagens', 'pc_dain', mesa), f = b.estado.fer[fJ]; return f.g === 3 && f.s.sg === 1 && f.k === 'DES' && f.v === -2 && await parado(J); }), 'o jogador descreve o dele: corte grave, sangrando, −2 de Destreza');
  ok(await ate(async () => await F.evaluate(n => calcular(S.personagens.find(p => p.id === 'pc_dain')).tot.DES === n, desAntes - 2)) && await G.evaluate(n => calcular(S.personagens.find(p => p.id === 'pc_dain')).tot.DES === n, desAntes - 2), 'a penalidade conta na Destreza, nas duas telas (' + desAntes + ' → ' + (desAntes - 2) + ')');
  ok(await ate(async () => (await F.locator('#painelTmp .chipfer').count()) === 1 && (await F.locator('#painelTmp .chipfer').innerText()).includes('−2 Destreza')), 'e o quadro de bônus temporários diz de onde ela vem');
  ok(await ate(async () => (await F.locator('#painelCorpo [data-parte="bracoE"].g3').count()) === 1 && (await F.locator('#painelCorpo [data-parte="bracoE"] .pn').textContent()) === '1'), 'no boneco do mestre, o braço esquerdo aparece ferido (grave), com a conta');
  await F.locator('[data-fertodos]').click().catch(() => {}); await w(250);
  await F.locator(`[data-fercura="${fJ}"]`).click(); await w(600);
  ok(await ate(async () => { const b = await noBanco(M, 'personagens', 'pc_dain', mesa); return !b.estado.fer[fJ] && R.ferimentos(b.estado.fer).lista.length === 1; }) && await ate(async () => await G.evaluate(n => calcular(S.personagens.find(p => p.id === 'pc_dain')).tot.DES === n, desAntes)), '"Curado" (pelo mestre) tira o ferimento, e a Destreza volta');
  await F.locator('.toast.comacao button').click(); await w(600);
  ok(await ate(async () => { const b = await noBanco(M, 'personagens', 'pc_dain', mesa); return b.estado.fer[fJ] && b.estado.fer[fJ].v === -2; }), 'e o Desfazer o devolve');

  // ---------- Ascensão: o mestre dá pontos enquanto o jogador gasta os dele ----------
  await M.evaluate(b => { const D = TC.dados.col('documentos'); D.gravar('arvore:biblioteca', { dados: b, vis: 'mestre' }); D.gravar('arvore:pacote', { dados: b, vis: 'mesa' }); }, bib);
  ok(await ate(async () => (await F.locator('#painelAsc .ascrow').count()) === 2 && (await G.locator('#painelAsc .ascrow').count()) === 2, 20000), 'com as árvores da mesa, o quadro de Ascensão mostra os tipos de ponto (Raça e Classe) nas duas telas');
  await F.locator('[data-asctot="pr"]').fill('3'); await F.locator('[data-asctot="pr"]').press('Tab'); await w(600);
  ok(await ate(async () => (await noBanco(M, 'personagens', 'pc_dain', mesa)).skills.pontos.pr === 3 && await parado(M)) && await ate(async () => (await G.locator('#painelAsc [data-asc="pr"] .ascconta').innerText()).includes('3 livres')), 'o mestre dá 3 pontos de Raça: o jogador vê "3 livres"');
  // no mesmo instante: o mestre dá mais um; o jogador equipa a árvore e pega um nódulo
  await Promise.all([
    F.locator('[data-ascstep="pr|1"]').click(),
    G.evaluate(() => { const p = S.personagens.find(x => x.id === 'pc_dain'); p.skills.arvores = ['a1']; p.skills.alocados = Object.assign({}, p.skills.alocados, { n1: 1 }); save(); })]);
  await w(900);
  ok(await ate(async () => { const b = await noBanco(M, 'personagens', 'pc_dain', mesa); return b.skills.pontos.pr === 4 && b.skills.alocados.n1 === 1 && j(b.skills.arvores) === '["a1"]' && await parado(M) && await parado(J); }), 'o ponto a mais do mestre e o nódulo do jogador, gravados no mesmo instante, ficam os dois no banco');
  ok(await ate(async () => (await F.locator('#painelAsc [data-asc="pr"] .ascconta').innerText()).replace(/\s+/g, ' ').includes('1 gasto · 3 livres') && (await F.locator('[data-asctot="pr"]').inputValue()) === '4'), 'o quadro do mestre mostra 4 pontos, 1 gasto, 3 livres');
  await F.locator('[data-ascstep="pr|-1"]').click(); await w(300);
  ok((await F.locator('.toast.comacao span').innerText()).includes('4 → 3') && await ate(async () => (await noBanco(M, 'personagens', 'pc_dain', mesa)).skills.pontos.pr === 3), 'tirar um ponto avisa a conta ("4 → 3") e grava');
  await F.locator('.toast.comacao button').click(); await w(500);
  ok(await ate(async () => (await noBanco(M, 'personagens', 'pc_dain', mesa)).skills.pontos.pr === 4), 'e o Desfazer devolve');

  // ---------- XP: o mestre lança, o jogador sobe de nível ----------
  ok(await F.locator('#xpBox').count() === 1 && await G.locator('#xpBox').count() === 1 && (await G.locator('#f_xpmax').inputValue()) === '50', 'a ficha do jogador tem a barra de XP; no nível 5, o máximo de costume é 50');
  await F.locator('#f_xp').fill('+48'); await F.locator('#f_xp').press('Enter'); await w(600);
  ok(await ate(async () => (await noBanco(M, 'personagens', 'pc_dain', mesa)).estado.xp.v === 48 && await parado(M)) && await ate(async () => (await G.locator('#f_xp').inputValue()) === '48' && (await G.locator('.xpfalta').innerText()) === 'faltam 2'), 'o mestre lança +48 de XP: o jogador vê 48 de 50, faltam 2');
  await G.locator('#f_xp').fill('+7'); await G.locator('#f_xp').press('Enter'); await w(500, J);
  ok(await ate(async () => (await G.locator('#xpSubir').count()) === 1 && (await G.locator('.xpbar.cheia').count()) === 1), 'o jogador lança +7 (55 de 50): a barra enche e aparece "Subir de nível"');
  await G.locator('#xpSubir').click(); await w(300, J);
  ok(/do nível 5 para o 6\? O XP fica em 5 \(o que passou de 50\) e o máximo passa a 60/.test(await G.locator('#xpBox .relconf').innerText()), 'subir pergunta antes, dizendo o que vai mudar: "' + (await G.locator('#xpBox .relconf span').first().innerText()) + '"');
  await G.locator('#xpSim').click(); await w(800, J);
  ok(await ate(async () => { const b = await noBanco(M, 'personagens', 'pc_dain', mesa); return b.ficha.level === 6 && b.estado.xp.v === 5 && !('max' in b.estado.xp) && await parado(J); }), 'confirmado: nível 6, XP 5 (a sobra), e o máximo de costume acompanha o nível');
  ok(await ate(async () => (await F.locator('#f_level').inputValue()) === '6' && (await F.locator('#f_xpmax').inputValue()) === '60' && (await F.locator('#f_xp').inputValue()) === '5'), 'o mestre vê o nível 6, com 5 de 60');
  await F.locator('#f_xpmax').fill('5'); await F.locator('#f_xpmax').press('Tab'); await w(600);
  ok(await ate(async () => (await noBanco(M, 'personagens', 'pc_dain', mesa)).estado.xp.max === 5) && await ate(async () => (await G.locator('#xpSubir').count()) === 1), 'o mestre digita outro máximo (5): a barra enche de novo');
  await F.locator('#xpSubir').click(); await w(250); await F.locator('#xpSim').click(); await w(800);
  ok(await ate(async () => { const b = await noBanco(M, 'personagens', 'pc_dain', mesa); return b.ficha.level === 7 && b.estado.xp.v === 0 && b.estado.xp.max === 15 && (b.estado.xp.min === undefined); }), 'com máximo digitado, subir de nível soma +10 a ele (5 → 15); o XP volta ao mínimo, que continua 0');
  await F.locator('.toast.comacao button').click(); await w(800);
  ok(await ate(async () => { const b = await noBanco(M, 'personagens', 'pc_dain', mesa); return b.ficha.level === 6 && b.estado.xp.v === 5 && b.estado.xp.max === 5; }), 'e o Desfazer devolve o nível 6, com 5 de 5');

  // ---------- limpeza ----------
  await apagarMesaTela(M, nomeMesa);
  const errs = t.errs.filter(e => !/^\[prep\]/.test(e) && !/Multiple GoTrueClient instances/.test(e) && !/status of (400|401|403|404|406|409)/.test(e));
  if (errs.length) console.log(errs.slice(0, 10).join('\n'));
  ok(errs.length === 0, 'sem erros inesperados no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
