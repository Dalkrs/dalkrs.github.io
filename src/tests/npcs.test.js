// O lote 32 fora de uma mesa (tudo neste navegador):
//   · o Escudo → NPCs: as raças (a lista, o estilo dos nomes, a aparência, a sub-raça), o gerador (três opções; a raça,
//     o papel, o gênero), ficar com uma, o editor (o nome e os outros nomes do estilo, sortear de novo um campo, o tier, os
//     atributos, as notas), a busca, pôr no roteiro (o passo ligado ao NPC: o clique abre o NPC), apagar com Desfazer;
//   · o Escudo → Encontros: a tabela de um bioma (a chance, os resultados com o peso e a porcentagem, os tipos), testar;
//   · o Mapa-múndi: sem a tabela da região, o sorteio usa a do bioma do hexágono (a floresta); o resultado (o evento, o
//     NPC — guardado nos NPCs), a região com a tabela dela manda; a sugestão de sortear quando o grupo anda.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;
const espera = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const t = await start();
  const { page: p } = await t.device({ name: 'npcs', w: 1440, h: 900 });
  p.setDefaultTimeout(8000);
  const w = ms => p.waitForTimeout(ms);
  const foto = async nome => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const ev = (fn, a) => p.evaluate(fn, a);
  const avisos = () => ev(() => [...document.querySelectorAll('#toasts .toast')].map(x => x.textContent).join(' | '));
  await p.goto(t.base + 'escudo/?debug'); await w(700);
  ok(await ev(() => !!window.__escudo && __escudo.pronto && !__escudo.naMesa), '(o Escudo abre fora de uma mesa)');

  let rid = null, nid = null;
  await passo('as raças', async () => {
    await p.click('[data-k="aba:npcs"]'); await w(150);
    ok(await p.locator('text=Os NPCs').count() > 0, 'sem NPC: o convite para gerar o primeiro');
    await p.click('[data-k="npc:racas"]'); await w(150);
    ok(await p.locator('dialog[open] >> text=Nenhuma raça ainda').count() === 1, 'a lista de raças começa vazia');
    await p.click('[data-k="rc:nova"]'); await w(100);
    await p.fill('[data-k="rc:0:nome"]', 'Anão');
    await p.selectOption('[data-k="rc:0:estilo"]', 'anao');
    await p.fill('[data-k="rc:0:ap"]', 'barba trançada, nariz largo');
    await p.click('[data-k="rc:0:nova-sub"]'); await w(100);
    await p.fill('[data-k="rc:0:s0:nome"]', 'da Montanha');
    await p.fill('[data-k="rc:0:s0:ap"]', 'pele cinzenta');
    await p.click('[data-k="rc:nova"]'); await w(100);
    await p.fill('[data-k="rc:1:nome"]', 'Elfo'); await p.selectOption('[data-k="rc:1:estilo"]', 'elfico');
    await p.click('[data-k="rc:nova"]'); await w(100);          // (uma sem nome: não entra)
    await foto('npc-racas');
    await p.click('[data-k="rc:ok"]'); await w(200);
    const rs = await ev(() => __escudo.A.dadosDe('escudo:racas'));
    ok(rs && rs.lista.length === 2 && rs.lista[0].nome === 'Anão' && rs.lista[0].estilo === 'anao' && rs.lista[0].subs[0].nome === 'da Montanha' && rs.lista[1].estilo === 'elfico', 'as raças guardadas (a sem nome ficou de fora): ' + j(rs && rs.lista.map(r => r.nome)));
    rid = rs.lista[0].id;
  });

  await passo('o gerador: três opções', async () => {
    await p.click('[data-k="npc:gerar2"]'); await w(200);
    ok(await p.locator('.npc-op').count() === 3, 'gerar: saem três opções');
    await p.selectOption('[data-k="g:raca"]', rid);
    await p.selectOption('[data-k="g:papel"]', 'guarda');
    await p.selectOption('[data-k="g:gen"]', 'f');
    await p.click('[data-k="g:gerar"]'); await w(200);
    const ops = await ev(() => __escudo.NP.ger.opcoes.map(n => ({ nome: n.nome, raca: n.raca && n.raca.nome, papel: n.papel, gen: n.gen, estilo: n.estilo })));
    const N = require('../../tc/npc.js');
    ok(ops.length === 3 && ops.every(x => x.raca === 'Anão' && x.papel === 'guarda' && x.gen === 'f' && x.estilo === 'anao'), 'as três: anãs, guardas (o que foi escolhido): ' + j(ops.map(x => x.nome)));
    ok(ops.every(x => N.ESTILOS.anao.f.includes(x.nome.split(' ')[0])), 'os nomes no estilo dos anões');
    const txt = await p.locator('.npc-op').first().innerText();
    ok(/Aparência:/.test(txt) && /Jeito:/.test(txt) && /Quer:/.test(txt) && /Esconde:/.test(txt) && /Gancho:/.test(txt) && /Tier C · Lvl \d/.test(txt), 'cada opção: aparência, jeito, o que quer, o que esconde, o gancho e os números');
    await foto('npc-gerador');
    await p.click('[data-k="g:escolher1"]'); await w(250);
    nid = await ev(() => __escudo.NP.sel);
    ok(!!nid && await ev(() => __escudo.NP.modo) === 'lista' && (await p.inputValue('[data-k="n:nome"]')) === ops[1].nome, 'ficar com a segunda: ela vai para a lista e abre no editor');
    ok(/foi|guardad/.test(await avisos()), 'o aviso (com Desfazer): ' + await avisos());
  });

  await passo('o editor do NPC', async () => {
    await p.fill('[data-k="n:nome"]', 'Brunna Malho-Velho'); await w(150);
    ok(await ev(id => __escudo.NP.npc(id).nome, nid) === 'Brunna Malho-Velho', 'escrever o nome');
    await p.click('[data-k="n:nomes"]'); await w(150);
    const op = await p.locator('dialog[open] [data-k="nm:3"]').innerText();
    await p.click('dialog[open] [data-k="nm:3"]'); await w(150);
    ok(await ev(id => __escudo.NP.npc(id).nome, nid) === op, 'outros nomes do mesmo estilo: um clique troca (' + op + ')');
    const m0 = await ev(id => __escudo.NP.npc(id).marca, nid);
    await p.click('[data-k="n:marca:sortear"]'); await w(150);
    const m1 = await ev(id => __escudo.NP.npc(id).marca, nid);
    ok(m1 && m1 !== m0, 'sortear de novo a marca: ' + m0 + ' → ' + m1);
    await p.click('[data-k="n:tier:B"]'); await w(120);
    await p.selectOption('[data-k="n:at:CAN"]', 'A'); await w(120);
    await p.fill('[data-k="n:nivel"]', '7'); await p.press('[data-k="n:nivel"]', 'Tab'); await w(150);
    const f = await ev(id => __escudo.NP.npc(id).ficha, nid);
    ok(f.tier === 'B' && f.tiers.CAN === 'A' && f.nivel === 7, 'os números de ficha: tier, um atributo e o level: ' + j(f));
    ok(/HP \d+/.test(await p.locator('[data-k="n:barras"]').innerText()), 'as barras pelas contas das fichas: ' + await p.locator('[data-k="n:barras"]').innerText());
    await p.click('[data-k="n:gen:m"]'); await w(150);
    const n2 = await ev(id => __escudo.NP.npc(id), nid);
    ok(n2.gen === 'm' && !n2.tracos.some(x => /a$/.test(x) && !/(alegre|leal|gentil|sentimental|paciente|impaciente|falante|covarde)$/.test(x) && /(osa|ada|ida|ica|ona|ora|ena)$/.test(x)), 'trocar o gênero acerta os traços: ' + n2.tracos.join(', '));
    await p.fill('[data-k="n:notas"]', 'Deve um favor ao barão.'); await w(150);
    await p.selectOption('[data-k="n:sub"]', ''); await w(150);
    await p.selectOption('[data-k="n:sub"]', 'da Montanha'); await w(150);
    ok((await ev(id => __escudo.NP.npc(id).raca, nid)).sub === 'da Montanha' && /da Montanha/.test(await p.locator('.quem-g').innerText()), 'a sub-raça');
    await foto('npc-editor');
    const pl = await ev(() => __escudo.pilha().slice(-3));
    await p.click('[data-k="desfazer"]'); await w(150);
    ok(!(await ev(id => __escudo.NP.npc(id).raca, nid)).sub, 'o Desfazer volta a sub-raça: ' + j(pl) + ' ' + j(await ev(id => __escudo.NP.npc(id).raca, nid)));
  });

  await passo('a lista: a busca e mais um', async () => {
    await p.click('[data-k="npc:gerar"]'); await w(150);
    await p.selectOption('[data-k="g:raca"]', ''); await p.selectOption('[data-k="g:papel"]', 'comerciante'); await p.selectOption('[data-k="g:gen"]', '');
    await p.click('[data-k="g:gerar"]'); await w(150);
    await p.click('[data-k="g:escolher0"]'); await w(200);
    ok(await p.locator('nav.lista .item').count() === 2, 'dois NPCs na lista');
    await p.fill('[data-k="npc:busca"]', 'comerciante'); await w(200);
    ok(await p.locator('nav.lista .item').count() === 1, 'a busca acha pelo papel');
    await p.fill('[data-k="npc:busca"]', ''); await w(150);
  });

  await passo('pôr no roteiro', async () => {
    await p.click('[data-k="npc:' + nid + '"]'); await w(150);
    await p.click('[data-k="n:roteiro"]'); await w(200);
    const ss = await ev(() => __escudo.A.sessoes().map(x => ({ id: x.id, passos: x.s.passos })));
    const ps = ss.length ? ss[0].passos : [];
    ok(ss.length === 1 && ps.length === 1 && ps[0].liga.k === 'npc' && ps[0].liga.id === nid && /^Encontrar /.test(ps[0].txt), 'sem sessão: uma nova, com o passo ligado ao NPC: ' + j(ps));
    await p.click('[data-k="aba:roteiro"]'); await w(150);
    ok(/Ver o NPC/.test(await p.locator('[data-k="p:' + ps[0].id + ':ir"]').innerText()), 'no roteiro, o passo tem "Ver o NPC"');
    await p.click('[data-k="p:' + ps[0].id + ':ir"]'); await w(200);
    ok(await ev(() => __escudo.aba) === 'npcs' && await ev(() => __escudo.NP.sel) === nid, 'o clique abre o NPC');
    await p.click('[data-k="n:ficha"]'); await w(150);
    ok(/Numa mesa/.test(await avisos()), 'fora de uma mesa, "Virar ficha" explica que é numa mesa: ' + await avisos());
  });

  await passo('os encontros por bioma', async () => {
    await p.click('[data-k="aba:encontros"]'); await w(150);
    await p.click('[data-k="bioma:floresta"]'); await w(100);
    ok(await p.locator('text=A tabela está vazia').count() === 1, 'a tabela começa vazia');
    await p.fill('[data-k="b:chance"]', '100'); await p.press('[data-k="b:chance"]', 'Tab'); await w(150);
    await p.click('[data-k="b:novo:evento"]'); await w(200);
    const it = await ev(() => { const d = __escudo.A.dadosDe('escudo:biomas'); return d.tabelas.floresta.itens[0]; });
    await p.fill('[data-k="b:i:' + it.id + ':txt"]', 'Rastros frescos de lobo'); await w(150);
    await p.click('[data-k="b:novo:npc"]'); await w(200);
    await p.click('[data-k="b:novo:nada"]'); await w(200);
    const t0 = await ev(() => __escudo.A.dadosDe('escudo:biomas').tabelas.floresta);
    ok(t0.chance === 100 && j(t0.itens.map(x => x.k)) === j(['evento', 'npc', 'nada']) && t0.itens[0].txt === 'Rastros frescos de lobo', 'a chance e três resultados: ' + j(t0.itens.map(x => x.k)));
    const pcts = await p.locator('.res .pct').allInnerTexts();
    ok(j(pcts) === j(['28.6%', '28.6%', '42.9%']), 'a porcentagem de cada um pelo peso: ' + j(pcts));
    const npcIt = t0.itens[1];
    await p.selectOption('[data-k="b:i:' + npcIt.id + ':papel"]', 'mercenario'); await w(150);
    ok((await ev(() => __escudo.A.dadosDe('escudo:biomas').tabelas.floresta.itens[1].papel)) === 'mercenario', 'o NPC da tabela com o papel');
    const vistos = new Set();
    for (let i = 0; i < 14; i++) { await p.click('[data-k="b:testar"]'); await w(60); vistos.add(await p.locator('.cartao.teste .publico').first().innerText()); }
    const txt = await p.locator('.cartao.teste').innerText();
    ok(/É só um teste/.test(txt), 'testar: o resultado aparece aqui, sem ir para a mesa');
    ok(vistos.size >= 2, 'testando várias vezes, sai mais de um resultado: ' + j([...vistos]));
    await foto('npc-encontros');
    await p.selectOption('[data-k="b:sugerir"]', 'tempo'); await w(150);
    ok((await ev(() => __escudo.A.dadosDe('escudo:biomas').sugerir)) === 'tempo', 'a sugestão no Mapa-múndi: a cada tempo');
  });

  ok(await ev(() => __escudo.pilha().length) > 15, 'cada mudança foi um passo do Desfazer');

  // ---- o Mapa-múndi: a tabela do bioma ----
  const L = { P: p, F: p.mainFrame() };
  const A = (fn, a) => p.evaluate(fn, a);
  const Y = 346.41;
  await passo('o Mapa-múndi: a tabela do bioma', async () => {
    await p.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await p.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await w(250);
    await p.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await p.click('#vazio [data-k="vz:papel"]'); await w(300);
    await p.click('#tab-terreno'); await w(150);
    await p.fill('#pane [data-k="ter:tam"]', '40'); await p.press('#pane [data-k="ter:tam"]', 'Enter'); await w(200);
    await A(Y => __mundo.App.mudar('preparar', m => {
      const N = __mundo.N;
      m.objs.push(Object.assign(N.objNovo('t', { pts: [[200, Y], [1000, Y]] }), { id: 'rt', nome: 'Trilha' }));
      m.objs.push(Object.assign(N.objNovo('g', { x: 200, y: Y, rota: 'rt', pt: 5, sigla: 'HER' }), { id: 'g', nome: 'Os Heróis' }));
      // os hexágonos da fileira, de floresta
      m.hexes = m.hexes || {};
      for (let x = 160; x <= 1040; x += 20) { const hx = N.hexDe(m, x, Y); m.hexes[hx.q + ',' + hx.r] = 'fl'; }
    }), Y);
    await w(300);
    const b = await A(() => { const N = __mundo.N, m = __mundo.App.mapa, g = m.objs.find(o => o.id === 'g'), hx = N.hexDe(m, g.x, g.y); return N.hexParaCena(m, hx.q, hx.r).ter; });
    ok(b === 'floresta', '(o grupo está num hexágono de floresta)');
    await A(() => __mundo.App.selecionar(['g'])); await w(250);
    await p.click('#tab-selecao'); await w(150);
    await A(() => document.getElementById('toasts').replaceChildren());
    // a tabela da floresta: só o evento, 100%
    await A(() => { const k = 'tinycats:escudo:local', d = JSON.parse(localStorage.getItem(k)); d['escudo:biomas'].dados.tabelas.floresta.itens = d['escudo:biomas'].dados.tabelas.floresta.itens.filter(x => x.k === 'evento'); localStorage.setItem(k, JSON.stringify(d)); });
    await p.click('#pane [data-k="o:sortear"]'); await w(250);
    const c1 = await A(() => { const c = document.querySelector('#pane .cartao'); return c ? c.innerText.replace(/\s+/g, ' ') : ''; });
    ok(/Encontro!/.test(c1) && /Rastros frescos de lobo/.test(c1) && /Floresta \(a tabela do bioma, no Escudo\)/.test(c1), 'sem região, vale a tabela da floresta: ' + c1);
    await foto('npc-mundo-evento');
    // o NPC: guardar nos NPCs
    await A(() => { const k = 'tinycats:escudo:local', d = JSON.parse(localStorage.getItem(k)); d['escudo:biomas'].dados.tabelas.floresta.itens = [{ id: 'iNpc', k: 'npc', p: 1, papel: 'mercenario', raca: '' }]; localStorage.setItem(k, JSON.stringify(d)); });
    await p.click('#pane [data-k="enc:de-novo"]'); await w(250);
    const c2 = await A(() => { const c = document.querySelector('#pane .cartao'); return c ? c.innerText.replace(/\s+/g, ' ') : ''; });
    ok(/Quer: .*Esconde: /.test(c2) && /Gancho: /.test(c2) && /(mercenário|mercenária)/i.test(c2), 'o NPC sorteado na hora, mercenário: ' + c2.slice(0, 160));
    await foto('npc-mundo-npc');
    const nome = await A(() => __mundo && document.querySelector('#pane .cartao .publico').textContent.split(' — ')[0]);
    await p.click('#pane [data-k="enc:npc-guardar"]'); await w(250);
    const guardados = await A(() => Object.values(JSON.parse(localStorage.getItem('tinycats:escudo:local'))).filter(l => l.id.startsWith('escudo:npc:')).map(l => l.dados.nome));
    ok(guardados.includes(nome) && guardados.length === 3, 'guardar nos NPCs: ele vai para a lista do Escudo (' + nome + ')');
    ok(await p.locator('#pane [data-k="enc:npc-abrir"]').count() === 1, '(o botão vira "Abrir nos NPCs")');
    // a região com a tabela dela manda
    await A(() => __mundo.App.mudar('a região', m => { const N = __mundo.N; m.objs.push(Object.assign(N.objNovo('r', { pts: [[0, 0], [1400, 0], [1400, 1000], [0, 1000]], enc: { chance: 100, itens: [{ p: 1, txt: 'Lobos da região' }] } }), { id: 'rg', nome: 'Vale' })); }));
    await A(() => __mundo.App.selecionar(['g'])); await w(250);
    await p.click('#pane [data-k="o:sortear"]'); await w(250);
    const c3 = await A(() => { const c = document.querySelector('#pane .cartao'); return c ? c.innerText.replace(/\s+/g, ' ') : ''; });
    ok(/Lobos da região/.test(c3) && /Vale/.test(c3), 'a região com tabela manda: ' + c3.slice(0, 120));
    // a região sem tabela: vale o bioma de novo
    await A(() => __mundo.App.mudar('sem tabela', m => { m.objs.find(o => o.id === 'rg').enc = { chance: 0, itens: [] }; }));
    await p.click('#pane [data-k="o:sortear"]'); await w(250);
    const c4 = await A(() => { const c = document.querySelector('#pane .cartao'); return c ? c.innerText.replace(/\s+/g, ' ') : ''; });
    ok(/a tabela do bioma/.test(c4), 'a região sem tabela: vale a do bioma');
  });

  await passo('o Mapa-múndi: os inimigos do Bestiário (neste navegador)', async () => {
    await A(() => {
      localStorage.setItem('tinycats:bestiario:local', JSON.stringify({ docs: { 'best:i:gob': { v: 1, nome: 'Goblin', tags: ['Floresta'], ficha: { tier: 'D', level: 2 } } } }));
      const k = 'tinycats:escudo:local', d = JSON.parse(localStorage.getItem(k)); d['escudo:biomas'].dados.tabelas.floresta.itens = [{ id: 'iGob', k: 'inimigo', p: 1, ref: 'gob', dados: '2d4' }]; localStorage.setItem(k, JSON.stringify(d));
    });
    await p.click('#pane [data-k="enc:de-novo"]'); await w(250);
    const n0 = Number(await p.locator('#pane .enc-n').first().innerText());
    const c = await A(() => document.querySelector('#pane .cartao').innerText.replace(/\s+/g, ' '));
    ok(n0 >= 2 && n0 <= 8 && /× Goblin/.test(c) && /\(2d4 = \d\+\d = \d\)/.test(c), 'os goblins, na quantidade dos dados (2d4): ' + c.slice(0, 120));
    await p.click('#pane [data-k="enc:l:0:menos"]'); await w(150);
    ok(Number(await p.locator('#pane .enc-n').first().innerText()) === n0 - 1, 'o − tira um antes de puxar');
    ok(/Numa mesa, a dificuldade/.test(await A(() => document.querySelector('#pane [data-k="enc:dif"]').textContent)), 'fora de uma mesa, a dificuldade explica que sai na mesa');
    await foto('npc-mundo-inimigos');
  });

  await passo('o Mapa-múndi: a sugestão quando o grupo anda', async () => {
    await A(() => { const k = 'tinycats:escudo:local', d = JSON.parse(localStorage.getItem(k)); d['escudo:biomas'].dados.tabelas.floresta.itens = [{ id: 'iEv', k: 'evento', p: 1, txt: 'Uma ponte caída' }]; localStorage.setItem(k, JSON.stringify(d)); });
    await p.click('#pane [data-k="enc:fechar"]'); await w(150);
    await A(() => document.getElementById('toasts').replaceChildren());
    await p.click('#pane [data-k="o:andar"]'); await w(1200);
    const av = await A(() => [...document.querySelectorAll('#toasts .toast')].map(x => x.textContent).join(' | '));
    ok(/Os Heróis andou: sortear um encontro\?/.test(av), 'o grupo andou: o aviso pergunta se sorteia (a cada tempo): ' + av);
    await p.locator('#toasts .toast', { hasText: 'sortear um encontro' }).locator('button').click(); await w(300);
    const c5 = await A(() => { const c = document.querySelector('#pane .cartao'); return c ? c.innerText.replace(/\s+/g, ' ') : ''; });
    ok(/Uma ponte caída/.test(c5), '"Sortear" no aviso sorteia: ' + c5.slice(0, 120));
    await foto('npc-mundo-sugestao');
    // "nunca": sem aviso
    await A(() => { const k = 'tinycats:escudo:local', d = JSON.parse(localStorage.getItem(k)); d['escudo:biomas'].dados.sugerir = 'nunca'; localStorage.setItem(k, JSON.stringify(d)); });
    await A(() => document.getElementById('toasts').replaceChildren());
    await p.click('#pane [data-k="o:andar"]'); await w(1200);
    ok(!/sortear um encontro/.test(await A(() => document.getElementById('toasts').innerText)), '"Não sugerir": o grupo anda sem o aviso');
  });

  const erros = t.errs;
  if (erros.length) console.log('CONSOLE:\n' + erros.slice(0, 12).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close(); end();
})();
