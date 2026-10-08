// Acampamento numa mesa de verdade (projeto real): a roda com os personagens dos jogadores, o descanso que mexe nas
// fichas (barras, Sanidade, Conforto, poderes) e gasta provisões, o Desfazer, o momento entre dois personagens,
// a imagem de fundo no banco — e o jogador vendo tudo sem poder mexer.
const { start, checker, BANCO } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const pc = (id, nome, lvl, estado) => ({ id, nome, raca: 'Humano', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: lvl, tiers: { FOR: 'A', DES: 'C', AGI: 'D', VIT: 'B', CAN: 'E' }, pctProprio: null,
  poderes: [{ id: 'pw' + id, nome: 'Cura', atual: 0, max: 2 }], skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 10, DFM: 4 }, rol: { fixa: 20, fonte: 'total' }, ultRol: null,
  disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 }, estaque: { a: '', b: '' }, habilidades: [], itens: [],
  recursos: [{ id: 'hp' + id, nome: 'HP', fml: 'VIT*8 + LVL*5' }, { id: 'sp' + id, nome: 'SP', fml: 'CAN*6 + LVL*3' }], notas: '', estado });
const local = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_dain', 'Dain X', 5, { rec: { hppc_dain: 40 }, san: 60, conf: 30 }), pc('pc_lia', 'Lia', 3, {}), pc('pc_ogro', 'Ogro', 6, { rec: { hppc_ogro: 10 } })], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { urgm_calc_atributos_v1: local, 'tinycats:aba': 'fichas' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1250, h: 820, seed: { 'tinycats:aba': 'acampamento' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re) => { for (let i = 0; i < 60; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 16000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const linha = (p, id) => p.evaluate(id => TC.dados.col('personagens').pegar(id), id);
  const doc = p => p.evaluate(() => { const d = TC.dados.col('documentos').pegar('acampamento'); return d ? { vis: d.vis, dados: d.dados, rev: d.rev } : null; });
  const semPendencia = p => p.evaluate(() => TC.dados.pendentes === 0);

  // ---------- o mestre monta a mesa ----------
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Acampamento E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let F = null;
  ok(await ate(async () => { F = await quadro(M, /\/fichas\//); return F && (await F.locator('#ofertaSim').count()) === 1; }), 'a mesa nova oferece trazer as fichas');
  await F.locator('#ofertaSim').click(); await w(600);
  ok(await ate(async () => await M.evaluate(() => TC.dados.col('personagens').todas().length === 3 && TC.dados.pendentes === 0)), 'as três fichas sobem');
  const mesaId = await M.evaluate(() => TC.mesas.atual.id);
  await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
  await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
  const jogId = await J.evaluate(() => TC.conta.usuario.id);
  ok(await ate(async () => (await F.locator('#f_dono option').allInnerTexts()).join('|').includes('Dalmo')), 'o jogador entra na mesa');
  await F.locator('#f_dono').selectOption({ label: 'Dalmo' }); await w(500);
  ok(await ate(async () => { const l = await linha(M, 'pc_dain'); return l.dono_id === jogId && await semPendencia(M); }), 'o Dain X é entregue ao jogador');

  // ---------- o acampamento do mestre ----------
  await M.locator('#tab-acampamento').click();
  let A = null;
  ok(await ate(async () => { A = await quadro(M, /\/acampamento\//); return A && await A.evaluate(() => !!window.__acamp && __acamp.pronto && __acamp.modo === 'mesa' && __acamp.papel === 'mestre'); }), 'o mestre abre o Acampamento da mesa');
  ok(await ate(async () => await A.evaluate(() => __acamp.camp.presentes.join() === 'pc_dain')), 'o personagem do jogador entra na roda sozinho');
  ok(await A.locator('#btMomento').isVisible(), 'na mesa, há o botão "Momento…"');
  await A.locator('#chamar').selectOption({ label: 'Ogro' }); await w(400);
  await A.evaluate(() => __acamp.mudar('preparar', c => { c.nome = 'Clareira do Vau'; c.provisoes = [{ id: 'pao', nome: 'Pão de viagem', qtd: 6 }]; c.melhorias = [{ id: 'fogao', nome: 'Fogão de pedra', desc: '', on: true, ef: { conf: 5, san: 0, rec: 0, prov: 0 } }]; }));
  ok(await ate(async () => { const d = await doc(M); return d && d.vis === 'mesa' && d.rev > 0 && d.dados.roda.length === 2 && d.dados.roda[0].dono === jogId && await semPendencia(M); }), 'o acampamento fica guardado na mesa, com a roda (nome, imagem e dono de cada um)');

  // ---------- o jogador vê, sem poder mexer ----------
  let B = null;
  ok(await ate(async () => { B = await quadro(J, /\/acampamento\//); return B && await B.evaluate(() => !!window.__acamp && __acamp.pronto && __acamp.papel === 'jogador' && __acamp.camp.nome === 'Clareira do Vau'); }), 'o jogador abre o Acampamento e recebe o da mesa');
  ok(await ate(async () => (await B.locator('#roda .pers').count()) === 2), 'ele vê a roda inteira: o personagem dele e o Ogro');
  ok(await B.locator('#roda .pers', { hasText: 'Dain X' }).locator('.b').count() === 4 && await B.locator('#roda .pers', { hasText: 'Ogro' }).locator('.b').count() === 0, 'com as barras só do personagem dele (a ficha do Ogro não é dele para ver)');
  ok(await B.locator('#acoes').isHidden() && await B.locator('#btDesfazer').isHidden() && await B.locator('#hora').isHidden() && await B.locator('#nome').evaluate(el => el.readOnly), 'sem os botões de descanso, a hora, o desfazer, nem como mudar o nome');
  await B.locator('#tab-provisoes').click(); await w(300, J);
  ok((await B.locator('#pane').innerText()).includes('6 rações guardadas') && await B.locator('#pv-novo').count() === 0 && await B.locator('#pane input:not([readonly]):not([disabled])').count() === 0, 'vê as provisões, mas não as edita');
  const invasor = await J.evaluate(async mesa => { const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave); const r = await a.from('documentos').update({ dados: { nome: 'invadido' } }).eq('mesa_id', mesa).eq('id', 'acampamento').select('id'); return { n: (r.data || []).length, erro: r.error ? r.error.message : null }; }, mesaId);
  ok(invasor.n === 0, 'e o banco não aceita mudança dele no acampamento: ' + JSON.stringify(invasor));

  // ---------- descanso longo: mexe nas fichas ----------
  await A.locator('#btLongo').click(); await w(400);
  const previa = (await A.locator('dialog[open]').innerText()).replace(/\s+/g, ' ');
  ok(previa.includes('gasta 2 de 6 rações') && /HP 40 → (\d+)\/\1/.test(previa) && previa.includes('60 → 65') && previa.includes('30 → 45') && previa.includes('Cura 0 → 2'), 'a prévia mostra o que vai mudar em cada ficha: ' + previa.slice(0, 260));
  const hpCheio = +/HP 40 → (\d+)\//.exec(previa)[1];
  await A.locator('#ds-ok').click(); await w(500);
  ok(await ate(async () => { const l = await linha(M, 'pc_dain'); return l.estado.rec.hppc_dain === hpCheio && l.estado.san === 65 && l.estado.conf === 45 && l.ficha.poderes[0].atual === 2 && await semPendencia(M); }), 'descansando, a ficha do Dain fica com HP cheio, Sanidade 65, Conforto 45 e o poder de volta');
  ok(await ate(async () => { const l = await linha(M, 'pc_ogro'); return l.estado.rec.hppc_ogro > 10 && l.estado.san === undefined && l.estado.conf === undefined; }), 'o Ogro recupera o HP e não ganha Sanidade nem Conforto (a ficha dele não usa)');
  ok(await ate(async () => { const d = await doc(M); return d.dados.provisoes[0].qtd === 4 && d.dados.diario.length === 1; }), 'as rações saem e o diário registra');
  ok(await ate(async () => (await M.locator('#feed .rol', { hasText: 'Descanso longo: 2 descansaram' }).count()) === 1), 'a mesa ao vivo avisa do descanso');
  ok(await M.locator('#feed .rol', { hasText: 'Descanso longo' }).locator('.or').innerText() === 'Acampamento', 'com a origem "Acampamento"');
  ok(await ate(async () => (await J.locator('#feed .rol', { hasText: 'Descanso longo: 2 descansaram' }).count()) === 1), 'e o jogador também recebe o aviso');
  ok(await ate(async () => { const l = await linha(J, 'pc_dain'); return l.estado.rec.hppc_dain === hpCheio && l.estado.san === 65; }), 'a ficha do jogador muda na tela dele');
  ok(await ate(async () => await B.evaluate(() => __acamp.camp.provisoes[0].qtd === 4)), 'e o acampamento dele mostra as rações que sobraram');

  // ---------- desfazer o descanso ----------
  ok(await A.locator('#btDesfazer').isEnabled() && (await A.locator('#btDesfazer').getAttribute('title')).includes('o descanso longo'), 'o botão Desfazer do acampamento aponta para o descanso');
  await A.locator('#btDesfazer').click(); await w(500);
  ok(await ate(async () => { const l = await linha(M, 'pc_dain'), o = await linha(M, 'pc_ogro'), d = await doc(M); return l.estado.rec.hppc_dain === 40 && l.estado.san === 60 && l.estado.conf === 30 && l.ficha.poderes[0].atual === 0 && o.estado.rec.hppc_ogro === 10 && d.dados.provisoes[0].qtd === 6 && d.dados.diario.length === 0 && await semPendencia(M); }), 'o Desfazer devolve as fichas, as rações e o diário como estavam');
  ok(await ate(async () => (await linha(J, 'pc_dain')).estado.rec.hppc_dain === 40), 'e o jogador vê a ficha de volta');
  ok(await ate(async () => (await M.locator('#feed .rol', { hasText: 'Desfeito: o descanso longo' }).count()) === 1), 'a mesa ao vivo avisa que foi desfeito');

  // ---------- barra que começa pela metade e barra negativa: o descanso respeita as duas ----------
  await M.evaluate(() => {
    const P = TC.dados.col('personagens'), l = P.pegar('pc_ogro'), f = JSON.parse(JSON.stringify(l.ficha));
    f.recursos[0].piso = '20';                                                     // o HP do Ogro pode ir até −20
    f.recursos.push({ id: 'furia', nome: 'Fúria', fml: '20', comeca: '4' });       // a Fúria começa em 4 de 20
    P.gravar('pc_ogro', { ficha: f, estado: Object.assign({}, l.estado, { rec: Object.assign({}, l.estado.rec, { hppc_ogro: -5, furia: 13 }) }) });
  });
  ok(await ate(async () => { const l = await linha(M, 'pc_ogro'); return l.estado.rec.furia === 13 && l.estado.rec.hppc_ogro === -5 && await semPendencia(M); }), '(o Ogro ganha uma Fúria que começa em 4 — agora em 13 — e fica com o HP em −5)');
  await w(600);
  await A.locator('#btCurto').click(); await w(400);
  const previaC = (await A.locator('dialog[open]').innerText()).replace(/\s+/g, ' ');
  ok(/HP -5 → \d+\/\d+/.test(previaC) && /Fúria 13\/20/.test(previaC) && !/volta ao começo/.test(previaC), 'descanso curto: o HP negativo recupera a partir de −5; a Fúria (que tem começo próprio) não muda — ' + (/Ogro.*$/.exec(previaC) || [''])[0].slice(0, 160));
  await A.locator('#ds-ok').click(); await w(500);
  ok(await ate(async () => { const l = await linha(M, 'pc_ogro'); return l.estado.rec.furia === 13 && l.estado.rec.hppc_ogro > -5 && await semPendencia(M); }), 'feito o descanso curto, a Fúria continua em 13 e o HP subiu');
  await A.locator('#btDesfazer').click(); await w(500);
  ok(await ate(async () => { const l = await linha(M, 'pc_ogro'); return l.estado.rec.hppc_ogro === -5 && l.estado.rec.furia === 13 && await semPendencia(M); }), '(desfeito)');
  await A.locator('#btLongo').click(); await w(400);
  const previaL = (await A.locator('dialog[open]').innerText()).replace(/\s+/g, ' ');
  ok(/HP -5 → (\d+)\/\1/.test(previaL) && /Fúria 13 → 4\/20 \(volta ao começo\)/.test(previaL), 'descanso longo: o HP enche (mesmo vindo de baixo de zero) e a Fúria volta ao começo dela — ' + (/Ogro.*$/.exec(previaL) || [''])[0].slice(0, 160));
  await A.locator('#ds-ok').click(); await w(500);
  ok(await ate(async () => { const l = await linha(M, 'pc_ogro'); return l.estado.rec.furia === undefined && l.estado.rec.hppc_ogro > 50 && await semPendencia(M); }), 'na ficha, a Fúria fica sem valor anotado (é o mesmo que "voltar ao começo") e o HP, cheio');
  ok(await A.evaluate(() => { const r = TC.rules, l = TC.dados.col('personagens').pegar('pc_ogro'); return r.resumo(Object.assign({}, l.ficha, { id: l.id, nome: l.nome }), null, null, l.estado).recursos.find(x => x.id === 'furia').atual; }) === 4, 'ou seja: a Fúria está em 4');
  await A.locator('#btDesfazer').click(); await w(500);
  ok(await ate(async () => { const l = await linha(M, 'pc_ogro'); return l.estado.rec.hppc_ogro === -5 && l.estado.rec.furia === 13 && await semPendencia(M); }), 'e Desfazer devolve o −5 e os 13');
  await M.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_ogro'), f = JSON.parse(JSON.stringify(l.ficha)); f.recursos = f.recursos.filter(r => r.id !== 'furia'); delete f.recursos[0].piso; P.gravar('pc_ogro', { ficha: f, estado: Object.assign({}, l.estado, { rec: { hppc_ogro: 10 } }) }); });
  ok(await ate(async () => { const l = await linha(M, 'pc_ogro'); return l.ficha.recursos.length === 2 && l.estado.rec.hppc_ogro === 10 && await semPendencia(M); }), '(o Ogro volta a ser como era)');

  // ---------- a ração com efeito e a estrutura só para alguns: o descanso põe na ficha ----------
  await M.evaluate(() => {
    const P = TC.dados.col('personagens'), l = P.pegar('pc_dain'), o = P.pegar('pc_ogro');
    P.gravar('pc_dain', { estado: Object.assign({}, l.estado, { rec: Object.assign({}, l.estado.rec, { sppc_dain: 1 }) }) });
    P.gravar('pc_ogro', { estado: Object.assign({}, o.estado, { sob: { hppc_ogro: 20 } }) });          // o Ogro já tem 20 de sobrevida
  });
  await A.evaluate(() => __acamp.mudar('rações com efeito', c => {
    c.provisoes = [{ id: 'ens', nome: 'Ensopado', qtd: 4, fx: [{ id: 'f1', t: 'bonus', k: 'FOR', v: 2, dur: 'descanso' }, { id: 'f2', t: 'barra', b: 'SP', val: '1d4+2' }, { id: 'f3', t: 'sob', b: 'HP', v: 12 }] }, { id: 'pao', nome: 'Pão de viagem', qtd: 6 }];
    c.servir = { longo: null, curto: 'ens' };
    c.melhorias = [{ id: 'forja', nome: 'Forja', desc: '', on: true, ef: { conf: 0, san: 0, rec: 0, prov: 0 }, alvo: { todos: false, pers: ['pc_ogro'], grupos: [] }, fx: [{ id: 'f4', t: 'bonus', k: 'DFF', v: 1, dur: 'rodadas', r: 3 }] }];
  }));
  ok(await ate(async () => { const l = await linha(M, 'pc_dain'), d = await doc(M); return l.estado.rec.sppc_dain === 1 && (await linha(M, 'pc_ogro')).estado.sob.hppc_ogro === 20 && d.dados.servir.curto === 'ens' && d.dados.melhorias[0].alvo.pers.join() === 'pc_ogro' && d.dados.provisoes[0].fx.length === 3 && await semPendencia(M); }),
    '(o Dain fica com 1 de SP; o descanso curto serve um ensopado que faz três coisas na ficha; a forja vale só para o Ogro)');
  await A.locator('#btCurto').click(); await w(400);
  ok(await A.locator('#ds-sv').inputValue() === 'ens', 'o descanso curto já vem servindo o ensopado');
  await A.locator('#ds-qtd').fill('1'); await A.locator('#ds-qtd').press('Enter'); await w(300);
  const pc2 = (await A.locator('dialog[open]').innerText()).replace(/\s+/g, ' ');
  const spDe = /SP 1 → (\d+)\/(\d+)/.exec(pc2), spPara = spDe ? +spDe[1] : 0, spMax = spDe ? +spDe[2] : 0;
  ok(spDe && /come Ensopado/.test(await A.locator('td[data-fx="pc_dain"]').innerText()) && /come Ensopado/.test(await A.locator('td[data-fx="pc_ogro"]').innerText()) && !/Defesa Física/.test(pc2) && /os bônus "até o próximo descanso" de antes acabam/.test(pc2),
    'a prévia: os dois comem o ensopado (a forja só vale no descanso longo) — ' + pc2.slice(0, 300));
  await A.locator('#ds-ok').click(); await w(500);
  ok(await ate(async () => { const l = await linha(M, 'pc_dain'), tmp = Object.values(l.estado.tmp || {}), sp = l.estado.rec.sppc_dain; return tmp.length === 1 && tmp[0].n === 'Ensopado' && tmp[0].k === 'FOR' && tmp[0].v === 2 && tmp[0].ate === 'descanso' && l.estado.sob && l.estado.sob.hppc_dain === 12 && sp >= Math.min(spMax, spPara + 3) && sp <= Math.min(spMax, spPara + 6) && await semPendencia(M); }),
    'na ficha do Dain: Força +2 até o próximo descanso, sobrevida 12 no HP e o SP rolado (1d4+2) a partir do que o descanso deu');
  ok(await ate(async () => { const l = await linha(M, 'pc_ogro'), tmp = Object.values(l.estado.tmp || {}); return tmp.length === 1 && tmp[0].k === 'FOR' && l.estado.sob && l.estado.sob.hppc_ogro === 20; }), 'o Ogro também comeu: Força +2; a sobrevida dele (20) fica — não soma com os 12 do ensopado: fica a maior');
  ok(await ate(async () => { const d = await doc(M); return d.dados.provisoes[0].qtd === 2 && /comeram Ensopado/.test(d.dados.diario[0].texto) && /^Na ficha — Dain X: Força \+2/.test(d.dados.diario[1].texto); }), 'o diário conta quem comeu e o que foi para cada ficha');
  ok(await ate(async () => (await M.locator('#feed .rol', { hasText: 'Na ficha — Dain X' }).count()) === 1), 'a mesa ao vivo também');
  ok(await ate(async () => { const l = await linha(J, 'pc_dain'); return R.temporarios(l.estado.tmp).soma.FOR === 2; }), 'no aparelho do jogador, a ficha do Dain soma a Força +2');
  await A.locator('#btLongo').click(); await w(400);
  await A.locator('#ds-sv').selectOption('pao'); await w(300);
  ok(/Defesa Física \+1 \(3 rodadas\)/.test(await A.locator('td[data-fx="pc_ogro"]').innerText()) && (await A.locator('td[data-fx="pc_dain"]').innerText()).trim() === '—', 'o longo, servindo o pão: a forja dá Defesa Física +1 por 3 rodadas só ao Ogro');
  await A.locator('#ds-ok').click(); await w(500);
  ok(await ate(async () => { const d = Object.values((await linha(M, 'pc_dain')).estado.tmp || {}), o = Object.values((await linha(M, 'pc_ogro')).estado.tmp || {}); return d.length === 0 && o.length === 1 && o[0].k === 'DFF' && o[0].r === 3 && !o[0].ate && await semPendencia(M); }),
    'descansando de novo, a Força +2 acaba (era até o próximo descanso) e o Ogro fica com Defesa Física +1 por 3 rodadas');
  ok((await linha(M, 'pc_dain')).estado.sob.hppc_dain === 12, 'a sobrevida continua (quem a gasta é o dano, não o descanso)');
  await A.locator('#btDesfazer').click(); await w(500);
  ok(await ate(async () => { const d = Object.values((await linha(M, 'pc_dain')).estado.tmp || {}), o = Object.values((await linha(M, 'pc_ogro')).estado.tmp || {}); return d.length === 1 && d[0].k === 'FOR' && o.length === 1 && o[0].k === 'FOR' && await semPendencia(M); }), 'o Desfazer devolve a Força +2 de cada um (e tira a Defesa Física)');
  await A.locator('#btDesfazer').click(); await w(500);
  ok(await ate(async () => { const l = await linha(M, 'pc_dain'), d = await doc(M); return !Object.keys(l.estado.tmp || {}).length && !(l.estado.sob && l.estado.sob.hppc_dain) && l.estado.rec.sppc_dain === 1 && d.dados.provisoes[0].qtd === 4 && await semPendencia(M); }),
    'e o outro Desfazer tira o que o ensopado pôs: sem bônus, sem sobrevida, o SP em 1 e as rações de volta');
  // a barra com começo próprio (a Fúria do Ogro começa em 4): o descanso longo a leva de volta ao começo, e a comida soma daí
  await M.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_ogro'), f = JSON.parse(JSON.stringify(l.ficha)); f.recursos.push({ id: 'furia', nome: 'Fúria', fml: '20', comeca: '4' }); P.gravar('pc_ogro', { ficha: f, estado: Object.assign({}, l.estado, { rec: Object.assign({}, l.estado.rec, { furia: 13 }) }) }); });
  await A.evaluate(() => __acamp.mudar('fúria', c => { c.provisoes[0].fx = [{ id: 'f5', t: 'barra', b: 'Fúria', val: '2' }]; c.servir.longo = 'ens'; }));
  ok(await ate(async () => (await linha(M, 'pc_ogro')).estado.rec.furia === 13 && await semPendencia(M)), '(o Ogro ganha uma Fúria que começa em 4 — agora em 13 —, e o ensopado passa a dar +2 de Fúria)');
  await A.locator('#btLongo').click(); await w(400);
  await A.locator('#ds-ok').click(); await w(500);
  ok(await ate(async () => (await linha(M, 'pc_ogro')).estado.rec.furia === 6 && await semPendencia(M)), 'no descanso longo, a Fúria volta ao começo (4) e o ensopado soma +2 a partir daí: 6');
  ok(await ate(async () => { const d = await doc(M); return /Dain X: sem a barra Fúria · Ogro: Fúria \+2/.test(d.dados.diario[1].texto); }), 'quem não tem a barra fica sem o efeito, e o diário diz');
  await A.locator('#btDesfazer').click(); await w(500);
  await M.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_ogro'), f = JSON.parse(JSON.stringify(l.ficha)), rec = Object.assign({}, l.estado.rec); f.recursos = f.recursos.filter(r => r.id !== 'furia'); delete rec.furia; P.gravar('pc_ogro', { ficha: f, estado: Object.assign({}, l.estado, { rec }) }); });
  ok(await ate(async () => { const l = await linha(M, 'pc_ogro'); return l.ficha.recursos.length === 2 && l.estado.rec.furia === undefined && !Object.keys(l.estado.tmp || {}).length && await semPendencia(M); }), '(desfeito; o Ogro sem a Fúria de novo)');

  // ---------- a aura: o jogador escolhe a emoção do personagem dele; todos veem ----------
  await B.locator('#tab-grupo').click(); await w(300, J);
  await B.locator('#pc-pc_dain').click(); await w(300, J);
  ok(await B.locator('#emo-pc_dain-alegre').count() === 1, 'o jogador pode escolher a emoção do personagem dele');
  await B.locator('#emo-pc_dain-alegre').click(); await w(500, J);
  ok(await ate(async () => (await linha(M, 'pc_dain')).estado.emo === 'alegre'), 'a emoção fica na ficha dele');
  ok(await ate(async () => (await A.locator('#roda .pers[data-id="pc_dain"][data-emo="alegre"] .aura').count()) === 1), 'o mestre vê a aura em volta do retrato do Dain');
  ok(await ate(async () => { const d = await doc(M), r = d.dados.roda.find(x => x.id === 'pc_dain'); return r && r.emo === 'alegre' && await semPendencia(M); }), 'e a roda guardada na mesa leva a emoção (para quem não vê a ficha dele)');
  // (a ficha do Ogro, um NPC, aberta para todos: o jogador a vê, mas a emoção dele não é do jogador para escolher)
  await M.evaluate(() => TC.dados.col('personagens').gravar('pc_ogro', { vis: 'mesa' }));
  ok(await ate(async () => !!(await linha(J, 'pc_ogro')) && await B.evaluate(() => { const p = __acamp.pessoa('pc_ogro'); return !!p && !p.semFicha; })), '(a ficha do Ogro passa a ser de todos: o jogador a vê)');
  await B.locator('#pc-pc_ogro').click(); await w(300, J);
  ok(await B.locator('#pc-pc_ogro .med').count() === 1 && await B.locator('#emo-pc_ogro-alegre').count() === 0, 'a do personagem dos outros, o jogador não escolhe — mesmo vendo a ficha');
  await M.evaluate(() => TC.dados.col('personagens').gravar('pc_ogro', { vis: 'mestre' }));
  ok(await ate(async () => !(await linha(J, 'pc_ogro')) && await B.evaluate(() => { const p = __acamp.pessoa('pc_ogro'); return !!p && p.semFicha; })), '(e volta a ser só do mestre)');
  await A.locator('#tab-grupo').click(); await w(300);
  await A.locator('#pc-pc_ogro').click(); await w(300);
  await A.locator('#emo-pc_ogro-raiva').click(); await w(500);
  ok(await ate(async () => (await B.locator('#roda .pers[data-id="pc_ogro"][data-emo="raiva"] .aura').count()) === 1), 'o mestre muda a do Ogro, e o jogador vê a aura dele (sem ver a ficha)');
  // enquanto isso, o jogador muda a do Dain: desfazer a do Ogro não pode levar junto a do Dain
  await B.locator('#pc-pc_dain').click(); await w(300, J);
  await B.locator('#emo-pc_dain-triste').click(); await w(500, J);
  ok(await ate(async () => { const d = await doc(M), r = d.dados.roda.find(x => x.id === 'pc_dain'); return r && r.emo === 'triste' && await semPendencia(M); }), '(o jogador muda a do Dain para "Triste")');
  await A.locator('#btDesfazer').click(); await w(500);
  ok(await ate(async () => !(await linha(M, 'pc_ogro')).estado.emo && (await B.locator('#roda .pers[data-id="pc_ogro"] .aura').count()) === 0), 'o Desfazer do mestre tira a emoção do Ogro (para todos)');
  ok(await ate(async () => { const d = await doc(M), r = d.dados.roda.find(x => x.id === 'pc_dain'); return r && r.emo === 'triste' && (await linha(M, 'pc_dain')).estado.emo === 'triste' && await semPendencia(M); }), 'e a do Dain, que o jogador mudou depois, continua "Triste" na roda');
  await M.evaluate(() => {
    const P = TC.dados.col('personagens'), l = P.pegar('pc_dain'), o = P.pegar('pc_ogro'), rec = Object.assign({}, l.estado.rec), eo = Object.assign({}, o.estado); delete rec.sppc_dain; delete eo.sob;
    P.gravar('pc_dain', { estado: Object.assign({}, l.estado, { rec }) }); P.gravar('pc_ogro', { estado: eo });
  });
  ok(await ate(async () => (await linha(M, 'pc_dain')).estado.rec.sppc_dain === undefined && !(await linha(M, 'pc_ogro')).estado.sob && await semPendencia(M)), '(o SP do Dain e a sobrevida do Ogro voltam a ser como eram)');

  // ---------- um momento entre dois personagens ----------
  await M.locator('#tab-fichas').click(); await w(500);
  await F.locator('#lista .pc', { has: F.locator('.nm', { hasText: /^Lia$/ }) }).click(); await w(300);
  await F.locator('#f_dono').selectOption({ label: 'Dalmo' }); await w(600);
  await M.locator('#tab-acampamento').click(); await w(500);
  ok(await ate(async () => await A.evaluate(() => __acamp.camp.presentes.includes('pc_lia'))), 'a Lia, agora de um jogador, entra na roda sozinha');
  await A.locator('#btMomento').click(); await w(400);
  const a0 = await A.locator('#mo-a').inputValue(), b0 = await A.locator('#mo-b').inputValue();
  await A.locator('#mo-a').selectOption(b0); await w(150);
  ok(a0 !== b0 && await A.locator('#mo-a').inputValue() === b0 && await A.locator('#mo-b').inputValue() === a0, 'escolher no primeiro quem está no segundo troca os dois de lugar');
  await A.locator('#mo-a').selectOption('pc_dain'); await w(150); await A.locator('#mo-b').selectOption('pc_lia'); await w(150);
  await A.locator('#mo-da').fill('8'); await A.locator('#mo-da').press('Tab'); await w(150);
  await A.locator('#mo-db').fill('-3'); await A.locator('#mo-db').press('Tab'); await w(150);
  await A.locator('#mo-txt').fill('Dain dividiu a última ração; Lia desconfiou do gesto.'); await w(100);
  await A.locator('#mo-ok').click(); await w(500);
  ok(await ate(async () => { const a = await linha(M, 'pc_dain'), b = await linha(M, 'pc_lia'); const ra = R.relacoes(a.estado).find(e => e.alvo === 'pc_lia'), rb = R.relacoes(b.estado).find(e => e.alvo === 'pc_dain'); return ra && ra.v === 8 && rb && rb.v === -3 && await semPendencia(M); }), 'o momento mexe no Relacionamento de cada um pelo outro (+8 e −3)');
  ok(await ate(async () => { const d = await doc(M); return d.dados.diario.length === 1 && d.dados.diario[0].texto.includes('Momento entre Dain X e Lia') && d.dados.diario[0].texto.includes('Dain X → Lia +8'); }), 'entra no diário');
  ok(await ate(async () => (await J.locator('#feed .rol', { hasText: 'Dain dividiu a última ração' }).count()) === 1), 'e na mesa ao vivo');

  // ---------- um momento com um NPC: o que o NPC sente fica guardado com o mestre, fora da ficha ----------
  const segredos = p => p.evaluate(() => { const d = TC.dados.col('documentos').pegar('fichas:segredos'); return d && !d.apagado ? { vis: d.vis, v: d.dados && d.dados.v } : null; });
  await A.locator('#btMomento').click(); await w(400);
  const temOgro = await A.locator('#mo-b option[value="pc_ogro"]').count();
  if (temOgro) {
    await A.locator('#mo-a').selectOption('pc_dain'); await w(150); await A.locator('#mo-b').selectOption('pc_ogro'); await w(150);
    await A.locator('#mo-da').fill('4'); await A.locator('#mo-da').press('Tab'); await w(150);
    await A.locator('#mo-db').fill('6'); await A.locator('#mo-db').press('Tab'); await w(150);
    await A.locator('#mo-ok').click(); await w(500);
  }
  ok(temOgro === 1 && await ate(async () => { const a = await linha(M, 'pc_dain'), o = await linha(M, 'pc_ogro'), sg = await segredos(M); const ra = R.relacoes(a.estado).find(e => e.alvo === 'pc_ogro'), so = sg && sg.v && sg.v.rel && sg.v.rel.pc_ogro ? Object.values(sg.v.rel.pc_ogro) : [];
    return ra && ra.v === 4 && !R.temRelacoes(o.estado) && so.length === 1 && so[0].l === 1 && so[0].alvo === 'pc_dain' && so[0].v === 6 && sg.vis === 'mestre' && await semPendencia(M); }), 'num momento com um NPC, o que o jogador sente vai para a ficha dele (+4); o que o NPC sente (+6) fica num documento só do mestre, e a ficha do NPC não ganha relacionamento nenhum');
  ok((await segredos(J)) === null, 'o aparelho do jogador não recebe esse documento');
  const lidoPeloJogador = await J.evaluate(async mesa => { const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave); const { data, error } = await a.from('documentos').select('id').eq('mesa_id', mesa).eq('id', 'fichas:segredos'); return error ? 'erro: ' + error.message : (data || []).length; }, mesaId);
  ok(lidoPeloJogador === 0, 'e, pedindo direto ao banco com a conta do jogador, ele não vem: ' + lidoPeloJogador);
  // de novo com o mesmo NPC: soma no que o mestre guarda
  await A.locator('#btMomento').click(); await w(400);
  await A.locator('#mo-a').selectOption('pc_dain'); await w(150); await A.locator('#mo-b').selectOption('pc_ogro'); await w(150);
  ok((await A.locator('dialog[open]').innerText()).replace(/\s+/g, ' ').includes('+6'), 'a janela do momento mostra o valor que o mestre guarda (o Ogro está em +6 pelo Dain)');
  await A.locator('#mo-da').fill('0'); await A.locator('#mo-da').press('Tab'); await w(150);
  await A.locator('#mo-db').fill('-10'); await A.locator('#mo-db').press('Tab'); await w(150);
  await A.locator('#mo-ok').click(); await w(500);
  ok(await ate(async () => { const sg = await segredos(M), so = sg && sg.v && sg.v.rel && sg.v.rel.pc_ogro ? Object.values(sg.v.rel.pc_ogro) : []; return so.length === 1 && so[0].v === -4 && R.relacoes((await linha(M, 'pc_dain')).estado).find(e => e.alvo === 'pc_ogro').v === 4 && await semPendencia(M); }), 'outro momento: o Ogro passa de +6 para −4 (no que o mestre guarda); o Dain não muda');
  await A.locator('.toast button', { hasText: 'Desfazer' }).first().click(); await w(600);
  ok(await ate(async () => { const sg = await segredos(M), so = sg && sg.v && sg.v.rel && sg.v.rel.pc_ogro ? Object.values(sg.v.rel.pc_ogro) : []; return so.length === 1 && so[0].v === 6 && await semPendencia(M); }), 'e o Desfazer devolve o +6');

  // ---------- a imagem de fundo vai para o banco ----------
  await A.evaluate(async () => {
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360;
    const cx = cv.getContext('2d'); cx.fillStyle = '#243a2c'; cx.fillRect(0, 0, 640, 360);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const dt = new DataTransfer(); dt.items.add(new File([blob], 'fundo.png', { type: 'image/png' }));
    const arq = document.querySelector('#arq'); arq.files = dt.files; arq.dispatchEvent(new Event('change', { bubbles: true }));
  });
  ok(await ate(async () => { const d = await doc(M); return d.dados.fundo && d.dados.fundo.url.startsWith(BANCO + '/storage/v1/object/public/mesas/' + mesaId + '/'); }, 25000), 'o fundo escolhido pelo mestre fica guardado no banco');
  ok(await ate(async () => (await B.locator('#cena16 img.fundo').count()) === 1 && await B.locator('#cena16 img.fundo').evaluate(el => el.naturalWidth === 640)), 'e aparece para o jogador');

  if (process.env.FOTOS) { await M.screenshot({ path: process.env.FOTOS + '/acamp-mestre.png' }); await J.locator('#tab-acampamento').click(); await w(400, J); await B.locator('#tab-grupo').click(); await w(300, J); await J.screenshot({ path: process.env.FOTOS + '/acamp-jogador.png' }); }
  await apagarMesaTela(M, nomeMesa);
  const errs = t.errs.filter(e => !/^\[prep\]/.test(e) && !/Multiple GoTrueClient instances/.test(e) && !/status of (400|401|403|409)/.test(e));
  if (errs.length) console.log(errs.slice(0, 10).join('\n'));
  ok(errs.length === 0, 'sem erros inesperados no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
