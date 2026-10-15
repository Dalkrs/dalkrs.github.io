// Árvore de Habilidades, lote 6, sem mesa (tudo neste navegador):
//   · o caminho trancado: a chave "Trancado" no nódulo esconde ele e o que vem depois; "Aberto para" escolhe os
//     personagens (a cópia do ramo vai nas skills deles); no modo jogador, só o personagem aberto vê; Desfazer; o
//     pacote dos jogadores vai sem o caminho; a cópia acompanha o que o mestre muda; destrancar devolve o caminho a
//     todos;
//   · o custo de uso de cada grau (barra + quanto) no editor, e como ele aparece;
//   · as contas entre chaves ({FOR*2 + 10}): sem mesa não há ficha, então aparecem escritas.
// (Com a mesa — a ficha, o aviso só para o dono, o jogador recebendo o ramo — é o src/tests/arvore-lote6.rede.test.js.)
const { start, checker } = require('./lib');
const { ok, end } = checker();
const no = (id, nome, pais, extra) => Object.assign({ id, pais, regra: 'e', nome, tipo: 'pequeno', forma: 'circulo', glifo: '', cor: '', natureza: '', usos: [], desc: '', exclusivo: '', escola: null, graus: [{ custos: { p1: 1 }, texto: '' }] }, extra);
const doc = JSON.stringify({ formato: 'urgm-skilltree-doc', versao: 4,
  biblioteca: { nome: 'Urgm', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 20 }, { id: 'p2', nome: 'Lua', cor: '#9BB7C9', padrao: 5 }], naturezas: [], usos: [{ id: 'ativa', nome: 'Ativa', sigla: 'At' }],
    tipos: { pequeno: { nome: 'Pequeno', raio: 10, custo: 1, forma: 'circulo' }, notavel: { nome: 'Notável', raio: 18, custo: 2, forma: 'circulo' }, keystone: { nome: 'Keystone', raio: 27, custo: 4, forma: 'hexagono' } },
    arvores: [{ id: 'a_kit', nome: 'Kitsune Lunar', categoria: 'classe', secreta: false, senha: '', nodes: [
      no('n_origem', 'Origem', [], { tipo: 'keystone', forma: 'hexagono', graus: [{ custos: {}, texto: '' }] }),
      no('n_corpo', 'Corpo da Raposa', ['n_origem']),
      no('n_membro', 'Membro de Selene', ['n_origem'], { tipo: 'notavel', usos: ['ativa'] }),
      no('n_garra', 'Garra de Gelo', ['n_membro'], { desc: 'Causa {FOR*2 + 10} de dano.', escola: { nome: 'Gelo', cor: '#9BB7C9', secreta: false, senha: 'lua' },
        graus: [{ custos: { p2: 1 }, texto: '', uso: [{ b: 'SP', v: '10' }] }, { custos: { p2: 2 }, texto: '+{floor(CAN/2)} de gelo', uso: [{ b: 'SP', v: '15' }, { b: 'Energia', v: 'CAN/2' }] }] }),
    ] }], cofres: [] },
  personagens: [
    { id: 'c_selene', nome: 'Selene', arvores: ['a_kit'], arvoreAtual: 'a_kit', pontos: { p1: 20, p2: 5 }, alocados: {}, ordemLivre: true },
    { id: 'c_dain', nome: 'Dain', arvores: ['a_kit'], arvoreAtual: 'a_kit', pontos: { p1: 20, p2: 5 }, alocados: {}, ordemLivre: true }] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'arvore6', w: 1400, h: 900, seed: { 'urgm.arvore.v4': doc, 'urgm.arvore.ui.v4': JSON.stringify({ modo: 'mestre', tema: 'pedra' }) } });
  const w = ms => P.waitForTimeout(ms);
  const E = (fn, a) => P.evaluate(fn, a);
  const foto = async nome => { if (process.env.FOTOS) await P.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const j = JSON.stringify;
  const aviso = () => P.locator('#dica').innerText();
  const selecionar = async id => { await E(id => { selecionado = id; pintarPainel(); desenhar(); }, id); await w(150); };
  const naTela = () => E(() => [...document.querySelectorAll('#nos .no')].map(g => g.dataset.id).sort().join(','));
  const ramos = id => E(id => { const p = doc.personagens.find(x => x.id === id); return p && p.ramos ? p.ramos : null; }, id);
  const modo = async m => { await E(m => { trocarModo(m); }, m); await w(250); };
  const personagem = async id => { await E(id => { trocarPersonagem(id); }, id); await w(250); };
  const salvo = () => E(() => new Promise(r => setTimeout(() => r(JSON.parse(localStorage.getItem('urgm.arvore.v4'))), 450)));

  await P.goto(t.base + 'arvore/', { waitUntil: 'load' }); await w(1500);
  ok(await E(() => ui.modo) === 'mestre' && (await naTela()) === 'n_corpo,n_garra,n_membro,n_origem', 'o mestre abre a árvore com os quatro nódulos');

  // ---------- trancar ----------
  await selecionar('n_membro');
  ok(await P.locator('#eTranca').count() === 1 && !(await P.locator('#eTranca').isChecked()) && await P.locator('#abertoPara').count() === 0, 'no nódulo, a chave "Trancado" (desligada)');
  await P.locator('#eTranca').check(); await w(300);
  ok(await E(() => porId.get('n_membro').tranca === true) && await P.locator('#abertoPara [data-abrir]').count() === 2 && await P.locator('#abertoPara [data-abrir]:checked').count() === 0,
    'trancado: aparece "Aberto para", com os dois personagens (ninguém marcado)');
  ok(/Este nódulo e 1 nódulo que só existe através dele ficam escondidos dos jogadores/.test(await P.locator('#abertoPara .nota').innerText()), 'a nota diz o que fica escondido: ' + await P.locator('#abertoPara .nota').innerText());
  ok(await P.locator('#nos .no.trancado[data-id="n_membro"]').count() === 1 && await P.locator('#nos .no.trancado').count() === 1, 'no desenho do mestre, o cadeado no nódulo trancado');
  await foto('arvore6-01-trancado');
  // no modo jogador, ninguém vê o caminho
  await modo('jogador'); await personagem('c_selene');
  ok((await naTela()) === 'n_corpo,n_origem' && await E(() => doc.biblioteca.arvores[0].nodes.length === 4 && bib().arvores[0].nodes.length === 2), 'no modo jogador (Selene), o caminho some: o nódulo trancado e o que vem depois dele');
  ok(await P.locator('#nos .no.trancado').count() === 0, '(e no modo jogador não há cadeado)');
  await modo('mestre');

  // ---------- abrir para a Selene ----------
  await selecionar('n_membro');
  await P.locator('[data-abrir="c_selene"]').check(); await w(300);
  const r1 = await ramos('c_selene');
  ok(!!r1 && !!r1.n_membro && r1.n_membro.a === 'a_kit' && j(r1.n_membro.nodes.map(n => n.id)) === j(['n_membro', 'n_garra']) && !r1.n_membro.nodes.some(n => 'tranca' in n) && !!r1.n_membro.em,
    'abrir para a Selene põe a cópia do ramo nas skills dela (o nódulo e o que vem depois, sem a marca de trancado)');
  ok(r1.n_membro.nodes.find(n => n.id === 'n_garra').escola.senha === '' && await E(() => porId.get('n_garra').escola.senha) === 'lua', 'a cópia vai sem a senha da escola (a do mestre fica)');
  ok(j(r1.n_membro.defs.pools.map(p => p.id)) === j(['p1', 'p2']) && j(r1.n_membro.defs.usos.map(u => u.id)) === j(['ativa']), 'com os tipos de ponto e de uso que o ramo usa');
  ok(!(await ramos('c_dain')) && /Caminho “Membro de Selene” aberto para Selene\./.test(await aviso()), 'o Dain continua sem; o aviso diz o que aconteceu: ' + await aviso());
  await E(() => { desfazer(); }); await w(300);
  ok(!(await ramos('c_selene')) && await P.locator('[data-abrir="c_selene"]:checked').count() === 0, 'Desfazer fecha de novo');
  await E(() => { refazer(); }); await w(300);
  ok(!!(await ramos('c_selene')), '(Refazer abre)');
  await modo('jogador'); await personagem('c_selene');
  ok((await naTela()) === 'n_corpo,n_garra,n_membro,n_origem', 'a Selene vê o caminho');
  await personagem('c_dain');
  ok((await naTela()) === 'n_corpo,n_origem', 'o Dain, não');
  await personagem('c_selene');
  // a Selene aprende o Membro e a Garra
  await E(() => { subirGrau('n_origem'); subirGrau('n_membro'); subirGrau('n_garra'); }); await w(300);
  ok(await E(() => { const p = doc.personagens.find(x => x.id === 'c_selene'); return p.alocados.n_membro === 1 && p.alocados.n_garra === 1; }), 'ela aprende os nódulos do caminho aberto');

  // ---------- as contas e o custo de uso, no modo jogador ----------
  await selecionar('n_garra');
  const desc = await P.locator('#descJog').innerHTML();
  ok(/<span class="conta sem"[^>]*>FOR\*2 \+ 10<\/span>/.test(desc) && (await P.locator('#descJog').innerText()) === 'Causa FOR*2 + 10 de dano.', 'sem mesa não há ficha: a conta aparece escrita (passando o mouse, a explicação): ' + await P.locator('#descJog').innerText());
  const graus = await P.locator('.graus-lista').innerText();
  ok(/Lua: 1 · uso: 10 SP/.test(graus) && /Lua: 2 — \+floor\(CAN\/2\) de gelo · uso: 15 SP · CAN\/2 Energia/.test(graus), 'cada grau diz o custo de uso (a conta, escrita): ' + graus.replace(/\s+/g, ' '));
  await foto('arvore6-02-jogador');
  await modo('mestre');

  // ---------- o pacote dos jogadores vai sem o caminho ----------
  const pk = await E(async () => { const r = await montarPacote(); return r.pacote.arvores.map(a => a.nodes.map(n => n.id).join()).join('|'); });
  ok(pk === 'n_origem,n_corpo', 'o pacote dos jogadores vai sem o caminho trancado: ' + pk);
  ok(await E(() => ui.modo === 'mestre' && porId.has('n_garra')), '(e a tela do mestre continua com tudo)');

  // ---------- o custo de uso no editor ----------
  await selecionar('n_corpo');
  ok(await P.locator('.guso-mais').count() === 1 && await P.locator('.uso-l').count() === 0, 'no grau, "+ Custo de uso"');
  await P.locator('.guso-mais').click(); await w(250);
  ok(await P.locator('.uso-l').count() === 1 && await E(() => document.activeElement && document.activeElement.classList.contains('guso-v')), 'uma linha nova, com o cursor no "quanto"');
  await P.locator('.guso-v').fill('CAN + 2'); await P.locator('.guso-v').press('Tab'); await w(200);
  await P.locator('.guso-b').fill('Energia'); await P.locator('.guso-b').press('Tab'); await w(200);
  ok(j(await E(() => porId.get('n_corpo').graus[0].uso)) === j([{ b: 'Energia', v: 'CAN + 2' }]), 'o custo fica no grau: Energia, CAN + 2');
  ok(await P.locator('#barrasDaMesa option').count() === 3, '(sem mesa, a lista sugere HP, SP e Energia)');
  await P.locator('.guso-mais').click(); await w(200);
  await P.locator('.guso-v').nth(1).fill('{3}'); await P.locator('.guso-v').nth(1).press('Tab'); await w(200);
  ok(await E(() => porId.get('n_corpo').graus[0].uso[1].v) === '3', 'as chaves são tiradas (o custo já é uma conta)');
  await P.locator('.guso-x').nth(1).click(); await w(200);
  ok(await P.locator('.uso-l').count() === 1 && await E(() => porId.get('n_corpo').graus[0].uso.length) === 1, '× tira um custo');
  await E(() => { desfazer(); }); await w(250);
  ok(await E(() => porId.get('n_corpo').graus[0].uso.length) === 2, '(Desfazer devolve)');
  await E(() => { refazer(); }); await w(250);
  // mais um grau: o novo começa com o custo do anterior
  await P.locator('#grauMais').click(); await w(250);
  ok(j(await E(() => porId.get('n_corpo').graus.map(g => g.uso))) === j([[{ b: 'Energia', v: 'CAN + 2' }], [{ b: 'Energia', v: 'CAN + 2' }]]), 'o grau novo começa com o custo de uso do anterior');
  await foto('arvore6-03-custo-de-uso');

  // ---------- a cópia acompanha o mestre ----------
  await selecionar('n_garra');
  await P.locator('#eDesc').fill('Causa {FOR*3} de dano.'); await w(100);
  const s1 = await salvo();
  ok(s1.personagens.find(p => p.id === 'c_selene').ramos.n_membro.nodes.find(n => n.id === 'n_garra').desc === 'Causa {FOR*3} de dano.', 'o mestre muda a descrição: a cópia nas skills da Selene acompanha');
  await E(() => { const a = arvoreVisivel(); a.nodes.push(Object.assign(noNovo('pequeno', { pais: ['n_garra'] }), { id: 'n_uivo', nome: 'Uivo' })); salvar(); pintarTudo(); }); await w(100);
  const s2 = await salvo();
  ok(j(s2.personagens.find(p => p.id === 'c_selene').ramos.n_membro.nodes.map(n => n.id)) === j(['n_membro', 'n_garra', 'n_uivo']), 'um nódulo novo depois do caminho entra na cópia');
  // uma tranca dentro do caminho: o que vem depois dela vai à parte
  await selecionar('n_garra'); await P.locator('#eTranca').check(); await w(100);
  const s3 = await salvo();
  ok(j(s3.personagens.find(p => p.id === 'c_selene').ramos.n_membro.nodes.map(n => n.id)) === j(['n_membro']), 'trancar a Garra (dentro do caminho): a cópia do Membro fica sem ela e o que vem depois (vão à parte, quando o mestre abrir a Garra)');
  await modo('jogador'); await personagem('c_selene');
  ok((await naTela()) === 'n_corpo,n_membro,n_origem', 'a Selene vê o Membro, mas não a Garra');
  // a Garra aberta para o Dain, que não tem o Membro: ela não aparece solta (não dá para chegar nela)
  await modo('mestre'); await selecionar('n_garra');
  await P.locator('[data-abrir="c_dain"]').check(); await w(300);
  await modo('jogador'); await personagem('c_dain');
  ok((await naTela()) === 'n_corpo,n_origem' && !!(await ramos('c_dain')).n_garra, 'a Garra aberta para o Dain, sem o Membro: ela não aparece solta para ele (não dá para chegar nela)');
  await personagem('c_selene');
  await modo('mestre'); await selecionar('n_garra');
  await P.locator('[data-abrir="c_selene"]').check(); await w(300);
  await modo('jogador');
  ok((await naTela()) === 'n_corpo,n_garra,n_membro,n_origem,n_uivo', 'aberta a Garra também, ela vê tudo de novo');
  await modo('mestre');
  // destrancar o Membro: o caminho passa a ser de todos (a cópia sai)
  await selecionar('n_garra'); await P.locator('#eTranca').uncheck(); await w(100);
  await selecionar('n_membro'); await P.locator('#eTranca').uncheck(); await w(100);
  const s4 = await salvo();
  ok(!s4.personagens.find(p => p.id === 'c_selene').ramos && !s4.biblioteca.arvores[0].nodes.some(n => n.tranca), 'destrancados: as cópias saem das skills (o caminho é de todos)');
  await modo('jogador'); await personagem('c_dain');
  ok((await naTela()) === 'n_corpo,n_garra,n_membro,n_origem,n_uivo', 'e o Dain vê o caminho');
  await modo('mestre');
  // fechar para quem tinha nódulos ali: eles ficam guardados
  await selecionar('n_membro'); await P.locator('#eTranca').check(); await w(100);
  await P.locator('[data-abrir="c_selene"]').check(); await w(200);
  await P.locator('[data-abrir="c_selene"]').uncheck(); await w(200);
  ok(/Caminho “Membro de Selene” fechado para Selene\. Os 2 nódulos que ele tinha ali ficam guardados e voltam se o caminho abrir de novo\./.test(await aviso()) && await E(() => { const p = doc.personagens.find(x => x.id === 'c_selene'); return p.alocados.n_membro === 1 && p.alocados.n_garra === 1; }),
    'fechar para a Selene, que tinha nódulos ali: eles ficam guardados (o aviso diz): ' + await aviso());

  // ---------- recarregar: tudo continua ----------
  await P.locator('[data-abrir="c_selene"]').check(); await w(500);
  await P.reload({ waitUntil: 'load' }); await w(1500);
  ok(await E(() => porId.get('n_membro').tranca === true && !!doc.personagens.find(p => p.id === 'c_selene').ramos.n_membro && JSON.stringify(porId.get('n_corpo').graus[1].uso) === JSON.stringify([{ b: 'Energia', v: 'CAN + 2' }])), 'recarregando: a tranca, o caminho aberto e o custo de uso continuam');

  const inesperados = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 8).join('\n'));
  ok(inesperados.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
