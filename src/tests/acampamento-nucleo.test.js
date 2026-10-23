// Acampamento: a lógica pura (modelo, efeitos da estrutura, provisões e a conta do descanso).
const N = require('../../acampamento/nucleo.js');
let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FALHOU: ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' — esperado ' + JSON.stringify(b) + ', veio ' + JSON.stringify(a));

/* ---- modelo ---- */
{
  const v = N.normalizar(null);
  eq([v.nome, v.hora, v.fundo, v.cena, v.presentes, v.provisoes, v.melhorias, v.equipamentos, v.bonus, v.diario], ['Acampamento', 'noite', null, null, [], [], [], [], [], []], 'sem nada, sai um acampamento vazio e válido');
  eq(v.regras, N.REGRAS_PADRAO, 'com as regras padrão do descanso');
  eq(N.normalizar(N.normalizar({ nome: ' Clareira ', hora: 'amanhecer' })), N.normalizar({ nome: 'Clareira', hora: 'amanhecer' }), 'normalizar duas vezes dá no mesmo');
  const sujo = N.normalizar({ nome: 123, hora: 'meio-dia', fundo: { url: 'javascript:alert(1)' }, cena: '../x', presentes: ['a', 'a', '', 5, 'b c', 'ok_1'], lugares: { a: { x: 500, y: -3 }, 'b c': { x: 1, y: 1 }, c: { x: 'x', y: 1 } },
    provisoes: [{ nome: 'Pão', qtd: '3' }, { nome: 'Carne', qtd: -2 }, 'lixo', { id: 'p', nome: 'A', qtd: 2.6 }, { id: 'p', nome: 'B', qtd: 1 }],
    melhorias: [{ nome: 'Fogão', ef: { conf: '5', san: 'x', rec: 999, prov: -1000 } }], equipamentos: [{ nome: 'Barraca', on: false, qtd: 0 }], bonus: [{ nome: 'Moral', ateDescanso: 1 }],
    regras: { longo: { rec: 300, prov: -4, conf: 'a', tiraBonus: 0 }, semProv: { rec: -1 } }, diario: [{ texto: 'oi', t: -5 }] });
  eq([sujo.nome, sujo.hora, sujo.fundo, sujo.cena, sujo.presentes], ['123', 'noite', null, null, ['a', 'ok_1']], 'entrada estranha: nome vira texto, hora inválida vira noite, endereço perigoso e ids inválidos saem');
  eq(sujo.lugares, { a: { x: 88, y: 22 } }, 'lugares ficam dentro da área das pessoas; os inválidos saem');
  eq(sujo.provisoes.map(p => [p.nome, p.qtd]), [['Pão', 3], ['Carne', 0], ['A', 3], ['B', 1]], 'provisões: quantidade inteira, nunca negativa');
  ok(new Set(sujo.provisoes.map(p => p.id)).size === 4, 'ids repetidos ou faltando ganham ids únicos');
  eq(sujo.melhorias[0].ef, { conf: 5, san: 0, rec: 100, prov: -99 }, 'efeitos dentro dos limites');
  eq([sujo.equipamentos[0].on, sujo.equipamentos[0].qtd, sujo.bonus[0].ateDescanso], [false, 0, true], 'equipamento fora de uso e bônus "até o descanso" são guardados');
  eq([sujo.regras.longo, sujo.regras.semProv, sujo.regras.curto], [{ rec: 100, prov: 0, conf: 10, san: 5, tiraBonus: false }, { rec: 0, conf: -10 }, N.REGRAS_PADRAO.curto], 'regras dentro dos limites; o que não veio fica no padrão');
  eq(N.normalizar({ fundo: { url: 'https://x.supabase.co/a.png', w: 1 } }).fundo, { url: 'https://x.supabase.co/a.png' }, 'fundo com endereço https vale');
  eq(N.normalizar({ roda: [{ id: 'a', nome: 'Ana', img: 'data:image/png;base64,AAAA', dono: 'u1' }, { id: 'b', nome: 'Bia', img: 'https://x/y.webp' }, { nome: 'sem id' }] }).roda, [{ id: 'a', nome: 'Ana', img: null, dono: 'u1' }, { id: 'b', nome: 'Bia', img: 'https://x/y.webp', dono: null }], 'a roda guarda só imagens do banco (https)');
}

/* ---- estrutura e provisões ---- */
const camp = N.normalizar({
  provisoes: [{ id: 'pao', nome: 'Pão de viagem', qtd: 3 }, { id: 'carne', nome: 'Carne seca', qtd: 5 }, { id: 'vazio', nome: 'Frutas', qtd: 0 }],
  melhorias: [{ id: 'm1', nome: 'Fogão de pedra', ef: { conf: 5, rec: 0, san: 0, prov: -1 } }, { id: 'm2', nome: 'Desligada', on: false, ef: { conf: 50 } }],
  equipamentos: [{ id: 'e1', nome: 'Sacos de dormir', qtd: 4, ef: { conf: 10, san: 5, rec: 0, prov: 0 } }],
  bonus: [{ id: 'b1', nome: 'Moral alta', ateDescanso: true }, { id: 'b2', nome: 'Bênção do templo' }],
});
eq(N.efeitos(camp), { conf: 15, san: 5, rec: 0, prov: -1 }, 'os efeitos somam só o que está em uso');
eq(N.racoes(camp), 8, 'as rações são a soma das provisões');
eq(N.textoEfeitos(N.efeitos(camp)), 'Conforto +15 · Sanidade +5 · 1 ração a menos por descanso', 'os efeitos por extenso');
eq(N.textoEfeitos({ conf: -3, san: 0, rec: 20, prov: 2 }), 'Conforto −3 · recuperação +20% · 2 rações a mais por descanso', 'com sinal de menos de verdade e plural');

/* ---- descanso ---- */
const dain = { id: 'd', nome: 'Dain', recursos: [{ id: 'hp', nome: 'HP', max: 200, atual: 50 }, { id: 'sp', nome: 'SP', max: 39, atual: 39 }, { id: 'x', nome: 'Sem fórmula', max: null, atual: 3 }], san: 60, conf: 40, poderes: [{ id: 'p1', nome: 'Cura', atual: 0, max: 2 }, { id: 'p2', nome: 'Luz', atual: 1, max: 1 }] };
const lia = { id: 'l', nome: 'Lia', recursos: [{ id: 'hp', nome: 'HP', max: 90, atual: 0 }], san: 98, conf: 95, poderes: [] };
const ogro = { id: 'o', nome: 'Ogro', recursos: [{ id: 'hp', nome: 'HP', max: 300, atual: 299 }], san: null, conf: null, poderes: [] };
{
  const p = N.planejar(camp, 'longo', [dain, lia, ogro]);
  eq([p.tipo, p.n, p.custo, p.disponivel, p.gasto, p.falta, p.rec, p.conf, p.san], ['longo', 3, 2, 8, 2, 0, 100, 25, 10], 'descanso longo: 1 ração por personagem menos 1 do fogão; conforto 10 + 15; sanidade 5 + 5');
  eq(p.consumo, [{ id: 'pao', nome: 'Pão de viagem', qtd: 2 }], 'as rações saem da primeira provisão da lista');
  eq(p.linhas[0].recursos, [{ id: 'hp', nome: 'HP', max: 200, de: 50, para: 200 }, { id: 'sp', nome: 'SP', max: 39, de: 39, para: 39 }], 'recupera tudo; recurso sem máximo fica de fora');
  eq([p.linhas[0].san, p.linhas[0].conf], [{ de: 60, para: 70 }, { de: 40, para: 65 }], 'Sanidade e Conforto sobem');
  eq([p.linhas[1].san, p.linhas[1].conf], [{ de: 98, para: 100 }, { de: 95, para: 100 }], 'e não passam de 100');
  eq([p.linhas[2].san, p.linhas[2].conf], [null, null], 'ficha que não usa Sanidade e Conforto fica sem eles');
  eq(p.linhas[0].poderes, [{ id: 'p1', nome: 'Cura', de: 0, para: 2 }], 'os poderes gastos voltam (os cheios não entram na lista)');
  eq(N.resumoDescanso(p), 'Descanso longo: 3 descansaram · 2 rações gastas · recuperação de 100% · Conforto +25 · Sanidade +10', 'o resumo por extenso');
  const depois = N.aposDescanso(camp, p, 1000);
  eq(depois.provisoes.map(x => x.qtd), [1, 5, 0], 'depois do descanso as rações gastas saem');
  eq(depois.bonus.map(b => b.nome), ['Bênção do templo'], 'os bônus "até o descanso" acabam');
  eq([depois.diario.length, depois.diario[0].t, depois.diario[0].texto], [1, 1000, N.resumoDescanso(p)], 'e o diário ganha a linha');
  eq(camp.provisoes.map(x => x.qtd), [3, 5, 0], 'o acampamento recebido não é alterado');
}
{
  const p = N.planejar(camp, 'curto', [dain, lia]);
  eq([p.tipo, p.custo, p.gasto, p.rec, p.conf, p.san, p.consumo], ['curto', 0, 0, 25, 0, 0, []], 'descanso curto: sem provisões, sem a estrutura, 25%');
  eq([p.linhas[0].recursos[0], p.linhas[1].recursos[0]], [{ id: 'hp', nome: 'HP', max: 200, de: 50, para: 100 }, { id: 'hp', nome: 'HP', max: 90, de: 0, para: 23 }], '25% do máximo, arredondando para cima (90 → 23)');
  eq(p.linhas[0].poderes, [], 'o curto não devolve poderes');
  eq([p.linhas[0].san, p.linhas[0].conf], [{ de: 60, para: 60 }, { de: 40, para: 40 }], 'nem mexe em Sanidade e Conforto');
}
/* ---- (lote 6) cada barra especial com a sua regra; a fadiga; tirar ou não os bônus ---- */
{
  eq([N.REGRAS_PADRAO.longo.tiraBonus, N.REGRAS_PADRAO.curto.tiraBonus, 'poderes' in N.REGRAS_PADRAO.longo], [true, true, false], 'o descanso tira os bônus “até o próximo descanso” (longo e curto) — e a regra geral das barras especiais saiu (cada barra tem a sua)');
  const pw = [{ id: 'lg', nome: 'Longo', atual: 1, max: 3 }, { id: 'qq', nome: 'Qualquer', atual: 0, max: 2, rec: 'qualquer' }, { id: 'qt', nome: 'Quantia', atual: 1, max: 9, rec: 'quantia', qc: 2, ql: 5 },
    { id: 'mn', nome: 'Manual', atual: 0, max: 4, rec: 'manual' }, { id: 'inf', nome: 'Sem limite', atual: 3, max: 0, rec: 'quantia', qc: 1, ql: 4 }, { id: 'inf2', nome: 'Sem limite 2', atual: 3, max: 0 },
    { id: 'qt2', nome: 'Quase cheia', atual: 8, max: 9, rec: 'quantia', qc: 2, ql: 5 }, { id: 'pad', nome: 'Padrão', atual: 0, max: 9, rec: 'quantia' }];
  const ana = { id: 'a', nome: 'Ana', recursos: [], san: null, conf: null, poderes: pw, fad: 2, tmp: [{ id: 't1', n: 'Poção de força', k: 'FOR', v: 2 }] };
  const bia = { id: 'b', nome: 'Bia', recursos: [], san: null, conf: null, poderes: [], fad: null, tmp: [] };
  const L = N.planejar(camp, 'longo', [ana, bia]), C = N.planejar(camp, 'curto', [ana, bia]);
  eq(L.linhas[0].poderes, [{ id: 'lg', nome: 'Longo', de: 1, para: 3 }, { id: 'qq', nome: 'Qualquer', de: 0, para: 2 }, { id: 'qt', nome: 'Quantia', de: 1, para: 6 }, { id: 'inf', nome: 'Sem limite', de: 3, para: 7 },
    { id: 'qt2', nome: 'Quase cheia', de: 8, para: 9 }, { id: 'pad', nome: 'Padrão', de: 0, para: 2 }], 'no longo: enche a de "longo" e a de "qualquer", soma a quantia do longo (sem passar do limite); a manual e a sem limite que só enche ficam');
  eq(C.linhas[0].poderes, [{ id: 'qq', nome: 'Qualquer', de: 0, para: 2 }, { id: 'qt', nome: 'Quantia', de: 1, para: 3 }, { id: 'inf', nome: 'Sem limite', de: 3, para: 4 }, { id: 'qt2', nome: 'Quase cheia', de: 8, para: 9 }, { id: 'pad', nome: 'Padrão', de: 0, para: 1 }],
    'no curto: só a de "qualquer" enche; a quantia soma a do curto (sem quantia escrita: +1 no curto, +2 no longo)');
  eq([N.paraDaEspecial({ atual: 2, max: 3, rec: 'xyz' }, false), N.paraDaEspecial({ atual: 2, max: 3, rec: 'xyz' }, true), N.paraDaEspecial({ atual: '1', max: '4', rec: 'quantia', qc: '2' }, false), N.paraDaEspecial({ atual: 5, max: 3, rec: 'quantia', qc: 1 }, false)], [2, 3, 3, 5],
    'regra desconhecida é "longo"; números escritos como texto valem; quantia nunca diminui uma barra acima do limite');
  eq([L.linhas[0].fad, C.linhas[0].fad, L.linhas[1].fad, C.linhas[1].fad], [{ de: 2, para: 5 }, { de: 2, para: 3 }, null, null], 'a fadiga: o longo enche a pilha (5), o curto devolve um; a ficha que não usa fica sem');
  eq(N.planejar(camp, 'curto', [Object.assign({}, ana, { fad: 5 })]).linhas[0].fad, { de: 5, para: 5 }, 'a pilha cheia não passa de 5');
  eq(N.planejar(camp, 'longo', [Object.assign({}, ana, { fad: 'x' })]).linhas[0].fad, null, 'fadiga que não é número: a ficha não usa');
  eq([L.tiraBonus, L.linhas[0].saem, L.linhas[0].ficam, L.linhas[1].saem], [true, [{ id: 't1', n: 'Poção de força', k: 'FOR', v: 2 }], [], []], 'pela regra, o descanso tira os bônus: a prévia diz quais acabam');
  const F = N.planejar(camp, 'longo', [ana, bia], { tiraBonus: false });
  eq([F.tiraBonus, F.linhas[0].saem, F.linhas[0].ficam], [false, [], [{ id: 't1', n: 'Poção de força', k: 'FOR', v: 2 }]], 'o mestre desmarca na janela: só neste descanso, os bônus continuam');
  ok(N.resumoDescanso(F).endsWith(' · os bônus “até o próximo descanso” continuam') && !N.resumoDescanso(L).includes('continuam'), 'o diário anota quando o descanso não tirou os bônus: ' + N.resumoDescanso(F));
  eq(N.aposDescanso(camp, F, 5).bonus.map(b => b.nome), camp.bonus.map(b => b.nome), 'e os bônus “até o descanso” do acampamento também ficam');
  const semTirar = N.normalizar(Object.assign(N.copia(camp), { regras: { curto: { tiraBonus: false } } }));
  const C2 = N.planejar(semTirar, 'curto', [ana]), C3 = N.planejar(semTirar, 'curto', [ana], { tiraBonus: true });
  eq([C2.tiraBonus, C2.linhas[0].ficam.length, C3.tiraBonus, C3.linhas[0].saem.length, N.planejar(semTirar, 'longo', [ana]).tiraBonus], [false, 1, true, 1, true], 'a regra por tipo de descanso (o curto sem tirar), e a janela muda na hora para aquele descanso');
  eq(N.planejar(camp, 'longo', [Object.assign({}, ana, { tmp: [null, 'x', { id: 7, n: 'Sem chave', v: '3' }] })]).linhas[0].saem, [{ id: '7', n: 'Sem chave', k: '', v: 3 }], 'bônus esquisitos na lista: só os objetos entram, arrumados');
}
{
  const pouco = N.normalizar(Object.assign(N.copia(camp), { provisoes: [{ id: 'pao', nome: 'Pão', qtd: 1 }], melhorias: [] }));
  const p = N.planejar(pouco, 'longo', [dain, lia, ogro]);
  eq([p.custo, p.gasto, p.falta, p.rec, p.conf], [3, 1, 2, 50, 10], 'faltando rações: gasta o que tem, a recuperação cai pela metade e o Conforto perde 10 (10 + 10 dos sacos − 10)');
  eq(p.linhas[0].recursos[0].para, 150, '50% de 200 = +100');
  eq(N.resumoDescanso(p), 'Descanso longo: 3 descansaram · 1 ração gasta · faltaram 2 rações · recuperação de 50% · Conforto +10 · Sanidade +10', 'o resumo avisa o que faltou');
  const zero = N.planejar(N.normalizar({ regras: { longo: { rec: 0, conf: -200, san: -200 } } }), 'longo', [Object.assign({}, dain, { san: 5, conf: 3 })]);
  eq([zero.linhas[0].recursos[0].para, zero.linhas[0].san.para, zero.linhas[0].conf.para], [50, 0, 0], 'regra que tira: nada cai abaixo de zero, e a barra nunca diminui com o descanso');
  eq(N.planejar(camp, 'longo', []).custo, 0, 'ninguém descansando: nada é gasto');
  const um = N.planejar(camp, 'longo', [lia]);
  eq([um.custo, N.resumoDescanso(um)], [0, 'Descanso longo: Lia descansou · recuperação de 100% · Conforto +25 · Sanidade +10'], 'uma pessoa só, com o fogão: custo zero (não fica negativo), e o resumo diz o nome');
}

/* ---- barras que começam pela metade e barras negativas ---- */
{
  const selene = { id: 's', nome: 'Selene', san: null, conf: null, poderes: [], recursos: [
    { id: 'hp', nome: 'HP', max: 100, atual: -8, min: -10 },                       // pode ficar negativa até −10
    { id: 'gelo', nome: 'Gelo de Selene', max: 20, atual: 13, min: 0, inicio: 4 },   // começa em 4
    { id: 'furia', nome: 'Fúria', max: 10, atual: 0, inicio: 0 },                    // começa vazia
    { id: 'sp', nome: 'SP', max: 40, atual: 10, min: 0, inicio: null }] };
  const longo = N.planejar(camp, 'longo', [selene]).linhas[0].recursos;
  eq(longo, [{ id: 'hp', nome: 'HP', max: 100, de: -8, para: 100 }, { id: 'gelo', nome: 'Gelo de Selene', max: 20, de: 13, para: 4, inicio: 4 }, { id: 'furia', nome: 'Fúria', max: 10, de: 0, para: 0, inicio: 0 }, { id: 'sp', nome: 'SP', max: 40, de: 10, para: 40 }],
    'descanso longo: a barra negativa enche; a que começa em 4 volta a 4 (de cima para baixo também); a que começa vazia fica vazia');
  const curto = N.planejar(camp, 'curto', [selene]).linhas[0].recursos;
  eq(curto.map(r => [r.de, r.para]), [[-8, 17], [13, 13], [0, 0], [10, 20]], 'descanso curto (25%): soma 25% do máximo a partir do valor negativo, e não mexe nas barras que têm começo próprio');
  const abaixo = N.planejar(camp, 'longo', [{ id: 'g', nome: 'G', san: null, conf: null, poderes: [], recursos: [{ id: 'gelo', nome: 'Gelo', max: 20, atual: 1, inicio: 4 }, { id: 'sem', nome: 'Sem anotação', max: 20, atual: null, inicio: 6 }, { id: 'fora', nome: 'Fora', max: 20, atual: 3, inicio: 99, min: -5 }] }]).linhas[0].recursos;
  eq(abaixo.map(r => [r.de, r.para]), [[1, 4], [6, 6], [3, 20]], 'abaixo do começo, sobe até ele; sem valor anotado, já está nele; começo acima do máximo fica no máximo');
  const pouco = N.normalizar(Object.assign(N.copia(camp), { provisoes: [], melhorias: [] }));
  const semRacao = N.planejar(pouco, 'longo', [selene]).linhas[0].recursos;
  eq(semRacao.map(r => [r.de, r.para]), [[-8, 42], [13, 4], [0, 0], [10, 30]], 'faltando rações (50%): as barras comuns recuperam a metade; a que tem começo próprio volta a ele do mesmo jeito');
  const piso = N.planejar(N.normalizar({ regras: { curto: { rec: 1 } } }), 'curto', [{ id: 'p', nome: 'P', san: null, conf: null, poderes: [], recursos: [{ id: 'hp', nome: 'HP', max: 100, atual: -50, min: -30 }, { id: 'x', nome: 'X', max: 100, atual: -50 }] }]).linhas[0].recursos;
  eq(piso.map(r => [r.de, r.para]), [[-30, -29], [0, 1]], 'valor anotado abaixo do piso conta a partir do piso (e a barra sem piso, a partir de zero)');
}

/* ---- lugares em volta da fogueira ---- */
{
  eq(N.lugarPadrao(0, 1), { x: 50, y: 82 }, 'uma pessoa: de frente para o fogo');
  const tres = [0, 1, 2].map(i => N.lugarPadrao(i, 3));
  ok(tres[0].x < tres[1].x && tres[1].x < tres[2].x && tres[1].x === 50 && tres[0].y === tres[2].y && tres[1].y > tres[0].y, 'três: da esquerda para a direita, simétricos, o do meio mais à frente: ' + JSON.stringify(tres));
  const dentro = p => p.x >= N.AREA.x0 + 2 && p.x <= N.AREA.x1 - 2 && p.y >= N.AREA.y0 && p.y <= N.AREA.y1;
  for (let q = 2; q <= 14; q++) {
    const todos = Array.from({ length: q }, (_, i) => N.lugarPadrao(i, q));
    ok(todos.every(dentro) && N.folga(todos) >= 96, q + ' pessoas cabem na parte da cena que toda tela mostra, sem um retrato em cima do outro (folga ' + Math.round(N.folga(todos)) + ')');
    ok(todos.every(p => !(Math.abs(p.x - 50) < 8 && p.y < 72)), q + ' pessoas: ninguém em cima da fogueira');
    const frente = todos.filter(p => p.y >= 70);
    ok(frente.every((p, i) => Math.abs(p.x + frente[frente.length - 1 - i].x - 100) < 0.11 && Math.abs(p.y - frente[frente.length - 1 - i].y) < 0.11), q + ' pessoas: a fila da frente é simétrica');
  }
  const sete = Array.from({ length: 7 }, (_, i) => N.lugarPadrao(i, 7)), oito = Array.from({ length: 8 }, (_, i) => N.lugarPadrao(i, 8));
  ok(sete.every(p => p.y >= 70) && oito.filter(p => p.y === 61).length === 4 && oito.filter(p => p.y >= 72).length === 4, 'até sete, uma fila só; com oito, quatro na frente e quatro atrás');
  eq(N.folga([{ x: 50, y: 50 }, { x: 60, y: 50 }, { x: 50, y: 60 }]), 90, 'a folga é a menor distância, em px da cena');
  eq(N.folga([{ x: 50, y: 50 }]), Infinity, 'uma pessoa só: folga sem fim');
  const fora = N.normalizar({ lugares: { a: { x: 0, y: 100 }, b: { x: 99, y: 1 }, c: { x: 40, y: 60 } } }).lugares;
  eq(fora, { a: { x: 12, y: 86 }, b: { x: 88, y: 22 }, c: { x: 40, y: 60 } }, 'lugares guardados fora da área voltam para dentro dela');
  ok(N.item('provisoes', 'Pão').qtd === 1 && N.item('melhorias').on === true && N.item('equipamentos').qtd === 1 && N.item('bonus').ateDescanso === false && N.item('outro') === null, 'itens novos nascem com os padrões');
  eq([N.item('melhorias').alvo, N.item('provisoes').fx, N.item('fx').dur, N.item('veiculos').tipo, N.item('carga').veiculo], [{ todos: true, pers: [], grupos: [] }, [], 'descanso', 'carroca', null], 'e com "vale para todos", sem efeitos na ficha, e a carga sem veículo');
}

/* ---- rações com tipo e efeito ---- */
{
  const c = N.normalizar({
    provisoes: [{ id: 'carne', nome: 'Carne seca', qtd: 10 },
      { id: 'enso', nome: 'Ensopado de javali', qtd: 2, ef: { conf: 5, san: 2, rec: 10, prov: 9 }, fx: [{ id: 'f1', t: 'bonus', k: 'for', v: 2, dur: 'descanso' }, { id: 'f2', t: 'barra', b: ' Vida ', val: ' 2d6 + 3 ' }, { id: 'f3', t: 'sob', b: 'Vida', v: 10.04 }] },
      { id: 'lanche', nome: 'Lanche', qtd: 5, fx: [{ t: 'bonus', k: 'AGI', v: 1, dur: 'rodadas', r: 0 }, { t: 'xxx', k: 'DES', v: 5000 }, ...Array.from({ length: 9 }, () => ({ t: 'sob', b: 'SP', v: -3 }))] }],
    servir: { longo: 'enso', curto: 'sumiu' },
    regras: { curto: { prov: 1 } },
  });
  const [carne, enso, lanche] = c.provisoes;
  eq([carne.ef, carne.fx], [{ conf: 0, san: 0, rec: 0 }, []], 'provisão de antes: sem efeito');
  eq(enso.ef, { conf: 5, san: 2, rec: 10 }, 'a ração muda Conforto, Sanidade e recuperação (rações a mais não: isso é da estrutura)');
  eq(enso.fx, [{ id: 'f1', t: 'bonus', k: 'FOR', v: 2, dur: 'descanso' }, { id: 'f2', t: 'barra', b: 'Vida', val: '2d6+3' }, { id: 'f3', t: 'sob', b: 'Vida', v: 10 }], 'efeitos na ficha: bônus (chave em maiúsculas), barra (texto sem espaços) e sobrevida');
  eq([lanche.fx.length, lanche.fx[0].dur, lanche.fx[0].r, lanche.fx[1].t, lanche.fx[1].v, lanche.fx[2].v], [8, 'rodadas', 1, 'bonus', 999, 0], 'no máximo 8 efeitos; rodadas de 1 a 99; tipo estranho vira bônus; valores dentro dos limites; sobrevida nunca negativa');
  eq(c.servir, { longo: 'enso', curto: null }, 'cada descanso lembra a provisão que serve (a que sumiu da lista vira "a ordem da lista")');
  eq(N.normalizar({ servir: { longo: 'enso' }, provisoes: [] }).servir, { longo: null, curto: null }, 'sem a provisão, não serve nada');

  const ana = { id: 'a', nome: 'Ana', grupo: 'Heróis', recursos: [{ id: 'hp', nome: 'Vida', max: 100, atual: 40 }], san: 50, conf: 50, poderes: [] };
  const bia = { id: 'b', nome: 'Bia', grupo: 'Heróis', recursos: [{ id: 'hp', nome: 'Vida', max: 100, atual: 40 }], san: 50, conf: 50, poderes: [] };
  const cid = { id: 'c', nome: 'Cid', grupo: 'Vila', recursos: [{ id: 'hp', nome: 'Vida', max: 100, atual: 40 }], san: 50, conf: 50, poderes: [] };
  const p = N.planejar(Object.assign(N.copia(c), { regras: Object.assign(N.copia(c.regras), { longo: Object.assign({}, c.regras.longo, { rec: 50 }) }) }), 'longo', [ana, bia, cid]);
  eq([p.servida.id, p.servida.efeito, p.comem, p.custo, p.consumo], ['enso', true, 2, 3, [{ id: 'enso', nome: 'Ensopado de javali', qtd: 2 }, { id: 'carne', nome: 'Carne seca', qtd: 1 }]], 'o descanso longo serve o ensopado primeiro: dá para dois; o terceiro come da lista');
  eq(p.linhas.map(l => l.come.map(x => [x.id, x.qtd, x.efeito])), [[['enso', 1, true]], [['enso', 1, true]], [['carne', 1, false]]], 'quem come o ensopado são os primeiros da lista; o terceiro come a carne seca');
  eq(p.linhas.map(l => [l.rec, l.conf.para, l.san.para, l.recursos[0].para]), [[60, 65, 57, 100], [60, 65, 57, 100], [50, 60, 55, 90]], 'o efeito da ração vale só para quem comeu: recuperação +10%, Conforto +5, Sanidade +2');
  eq(p.linhas[0].fx.map(f => [f.de, f.t]), [['Ensopado de javali', 'bonus'], ['Ensopado de javali', 'barra'], ['Ensopado de javali', 'sob']], 'e o que vai para a ficha dela, com o nome de onde vem');
  eq(p.linhas[2].fx, [], 'quem não comeu a ração servida não ganha o efeito dela');
  ok(N.resumoDescanso(p).includes('2 comeram Ensopado de javali'), 'o resumo diz quem comeu a ração servida: ' + N.resumoDescanso(p));
  const naHora = N.planejar(c, 'longo', [ana, bia], { servir: null });
  eq([naHora.servida, naHora.comem, naHora.consumo, naHora.linhas[0].fx], [null, 0, [{ id: 'carne', nome: 'Carne seca', qtd: 2 }], []], 'escolher na hora "a ordem da lista": come da primeira provisão, sem efeito');
  const outra = N.planejar(c, 'longo', [ana], { servir: 'lanche', prov: 2 });
  eq([outra.servida.id, outra.prov, outra.custo, outra.comem, outra.linhas[0].fx.length], ['lanche', 2, 2, 1, 8], 'escolher na hora outra ração, e quantas cada um come neste descanso');
  const curto = N.planejar(c, 'curto', [ana]);
  eq([curto.servida, curto.custo, curto.consumo.length, curto.linhas[0].fx], [null, 1, 1, []], 'o curto, que serve "a ordem da lista": gasta 1 da primeira');
  const semRegra = N.planejar(N.normalizar(Object.assign(N.copia(c), { regras: { curto: { prov: 0 } }, servir: { curto: 'enso' } })), 'curto', [ana]);
  eq([semRegra.servida.id, semRegra.comem, semRegra.custo, semRegra.linhas[0].fx], ['enso', 0, 0, []], 'descanso que não gasta ração: ninguém come, e não há efeito');
  // pela ordem da lista: quem come uma ração com efeito ganha o efeito, servida ou não
  const lista = N.normalizar({ provisoes: [{ id: 'enso', nome: 'Ensopado', qtd: 3, ef: { conf: 5 } }, { id: 'carne', nome: 'Carne seca', qtd: 9 }, { id: 'doce', nome: 'Pão doce', qtd: 9, ef: { san: 3 }, fx: [{ id: 'g', t: 'sob', b: 'Vida', v: 4 }] }] });
  const pl = N.planejar(lista, 'longo', [ana, bia, cid]);
  eq([pl.servida, pl.comem, pl.linhas.map(l => l.conf.para), pl.comidas], [null, 0, [65, 65, 65], [{ id: 'enso', nome: 'Ensopado', n: 3 }]], 'sem servir nada, a lista de cima para baixo: o ensopado (o primeiro) dá para os três, e o efeito vale');
  const dois = N.planejar(lista, 'longo', [ana, bia], { prov: 2 });
  eq(dois.linhas.map(l => [l.come.map(x => x.id + '×' + x.qtd).join(' '), l.conf.para]), [['enso×2', 65], ['enso×1 carne×1', 65]], 'duas rações cada: a Bia come o último ensopado e uma carne seca — e ganha o efeito do ensopado (uma vez só)');
  const doce = N.planejar(lista, 'longo', [ana, bia], { servir: 'doce', prov: 1 });
  eq([doce.comem, doce.linhas.map(l => [l.san.para, l.fx.map(f => f.de + ':' + f.t).join()]), N.resumoDescanso(doce).includes('comeram Pão doce')], [2, [[58, 'Pão doce:sob'], [58, 'Pão doce:sob']], true], 'servindo o pão doce: os dois comem e ganham o efeito dele (o resumo diz)');
  const misto = N.planejar(N.normalizar(Object.assign(N.copia(lista), { provisoes: [Object.assign({}, lista.provisoes[0], { qtd: 1 }), lista.provisoes[1], lista.provisoes[2]] })), 'longo', [ana, bia], { servir: 'doce' });
  eq(misto.comidas, [{ id: 'doce', nome: 'Pão doce', n: 2 }], '(só o que foi comido entra no resumo)');
  const fim = N.planejar(N.normalizar({ provisoes: [{ id: 'enso', nome: 'Ensopado', qtd: 1, ef: { conf: 5 } }, { id: 'doce', nome: 'Pão doce', qtd: 1, ef: { san: 3 } }] }), 'longo', [ana, bia, cid]);
  eq([fim.falta, fim.linhas.map(l => l.come.map(x => x.id).join()), fim.comidas.map(x => x.nome + ':' + x.n), N.resumoDescanso(fim).includes('1 comeu Ensopado · 1 comeu Pão doce')], [1, ['enso', 'doce', ''], ['Ensopado:1', 'Pão doce:1'], true], 'faltando ração: o último não come nada (nem ganha efeito), e o resumo conta cada ração com efeito');
  const textos = enso.fx.map(f => N.textoFx(Object.assign({ de: 'x' }, f), { FOR: 'Força' }));
  eq(textos, ['Força +2 (até o próximo descanso)', 'Vida +2d6+3', 'Sobrevida 10 em Vida'], 'os efeitos por extenso');
  eq([N.textoFx({ t: 'bonus', k: 'AGI', v: -1, dur: 'rodadas', r: 1 }), N.textoFx({ t: 'barra', b: 'SP', val: '-5' })], ['AGI −1 (1 rodada)', 'SP −5'], 'com sinal de menos e no singular');
  eq([N.tmpDoFx({ de: 'Ensopado', t: 'bonus', k: 'FOR', v: 2, dur: 'descanso' }, 7), N.tmpDoFx({ de: 'Fogueira', t: 'bonus', k: 'AGI', v: 1, dur: 'rodadas', r: 3 }, 8)],
    [{ n: 'Ensopado', k: 'FOR', v: 2, d: 'até o próximo descanso', t: 7, ate: 'descanso' }, { n: 'Fogueira', k: 'AGI', v: 1, d: '3 rodadas', t: 8, r: 3 }], 'o bônus que vai para a ficha: até o próximo descanso, ou por rodadas');
  eq([N.barraPeloNome([{ id: 'x', nome: 'Saúde' }], 'saude'), N.barraPeloNome([{ id: 'x', nome: 'HP' }], 'Vida')], [{ id: 'x', nome: 'Saúde' }, null], 'a barra pelo nome, sem diferença de maiúsculas e acentos');
}

/* ---- melhorias e equipamentos para alguns ---- */
{
  const c = N.normalizar({
    melhorias: [{ id: 'm1', nome: 'Fogueira grande', ef: { conf: 5 } },
      { id: 'm2', nome: 'Forja', ef: { conf: 10, rec: 20, prov: -1 }, alvo: { todos: false, pers: ['a', 'a', '../x'], grupos: [' Vila ', ''] }, fx: [{ t: 'bonus', k: 'FOR', v: 3, dur: 'rodadas', r: 3 }] },
      { id: 'm3', nome: 'Desligada', on: false, ef: { conf: 50 }, alvo: { todos: false, pers: ['a'] }, fx: [{ t: 'sob', b: 'Vida', v: 5 }] }],
    equipamentos: [{ id: 'e1', nome: 'Rede', ef: { san: 4 }, alvo: { todos: false, grupos: ['Heróis'] } }],
    provisoes: [{ id: 'p', nome: 'Pão', qtd: 9 }],
  });
  eq(c.melhorias[1].alvo, { todos: false, pers: ['a'], grupos: ['Vila'] }, 'para quem vale: personagens (sem repetir) e grupos');
  eq(c.melhorias[0].alvo, { todos: true, pers: [], grupos: [] }, 'sem dizer, vale para todos');
  eq(N.efeitos(c), { conf: 5, san: 0, rec: 0, prov: -1 }, 'o que vale para todos: só o das que são de todos — e as rações de todas (são do acampamento)');
  ok(N.temParaAlguns(c) && !N.temParaAlguns(N.normalizar({ melhorias: [{ alvo: { todos: false } , on: false }] })), 'sabe dizer quando há estrutura em uso só para alguns');
  const ana = { id: 'a', nome: 'Ana', grupo: 'Heróis' }, cid = { id: 'c', nome: 'Cid', grupo: 'Vila' }, zé = { id: 'z', nome: 'Zé', grupo: '' };
  eq([N.efeitosDe(c, ana), N.efeitosDe(c, cid), N.efeitosDe(c, zé)], [{ conf: 15, san: 4, rec: 20 }, { conf: 15, san: 0, rec: 20 }, { conf: 5, san: 0, rec: 0 }], 'cada um recebe o que o alcança: Ana pelo nome e pelo grupo Heróis, Cid pelo grupo Vila, Zé só o de todos');
  eq([N.fxDe(c, ana).map(f => f.de + ':' + f.k), N.fxDe(c, zé)], [['Forja:FOR'], []], 'o que vai para a ficha também (a desligada não conta)');
  const vida = { recursos: [{ id: 'hp', nome: 'Vida', max: 100, atual: 0 }], san: 50, conf: 50, poderes: [] };
  const p = N.planejar(N.normalizar(Object.assign(N.copia(c), { regras: { longo: { rec: 50 } } })), 'longo', [Object.assign({}, vida, ana), Object.assign({}, vida, zé)]);
  eq([p.custo, p.conf, p.linhas.map(l => [l.recursos[0].para, l.conf.para, l.san.para, l.fx.length])], [1, 15, [[70, 75, 59, 1], [50, 65, 55, 0]]], 'no descanso longo: a forja (só para Ana) a faz recuperar 70% e ganhar o bônus; o pão economizado vale para todos');
  eq(N.planejar(c, 'curto', [Object.assign({}, vida, ana)]).linhas[0].fx, [], 'o descanso curto não usa a estrutura');
}

/* ---- emoções e caravana ---- */
{
  const c = N.normalizar({ emo: { a: 'alegre', b: 'nada', 'x y': 'triste' }, roda: [{ id: 'a', nome: 'Ana', emo: 'raiva' }, { id: 'b', nome: 'Bia', emo: 'xx' }] });
  eq([c.emo, c.roda], [{ a: 'alegre' }, [{ id: 'a', nome: 'Ana', img: null, dono: null, emo: 'raiva' }, { id: 'b', nome: 'Bia', img: null, dono: null }]], 'só emoções da lista, e só na roda de quem tem uma');
  ok(N.EMOCOES.length === 10 && N.EMOCOES.every(e => /^#[0-9a-f]{6}$/.test(e.cor) && e.nome) && N.emocao('medo').nome === 'Com medo' && N.emocao('xx') === null, 'dez emoções, cada uma com nome e cor');
  const cv = N.normalizar({ caravana: {
    veiculos: [{ id: 'v1', nome: 'Carroça grande', tipo: 'carroca', cap: 500, estado: 'roda bamba' }, { id: 'v2', nome: 'Mula', tipo: 'xx', cap: -4 }],
    carga: [{ nome: 'Barris', qtd: 3, peso: 40, veiculo: 'v1' }, { nome: 'Corda', qtd: 2, peso: 2.555, veiculo: 'sumiu' }, { nome: 'Pedras', qtd: -1, peso: 9 }],
    gente: [{ nome: 'Tobias', papel: 'cocheiro', veiculo: 'v1' }, { nome: 'Guarda', veiculo: 'v9' }],
    vai: { a: 'v2', b: 'v9', '../x': 'v1' } } }).caravana;
  eq(cv.veiculos.map(v => [v.nome, v.tipo, v.cap]), [['Carroça grande', 'carroca', 500], ['Mula', 'carroca', 0]], 'veículos: tipo da lista, capacidade nunca negativa');
  eq(cv.carga.map(k => [k.nome, k.qtd, k.peso, k.veiculo]), [['Barris', 3, 40, 'v1'], ['Corda', 2, 2.56, null], ['Pedras', 0, 9, null]], 'carga: veículo que não existe vira "sem lugar"; peso com centésimos');
  eq([cv.gente.map(g => g.veiculo), cv.vai], [['v1', null], { a: 'v2' }], 'quem viaja: só em veículo que existe');
  eq(N.cargaDe({ caravana: cv }), { por: { v1: 120, v2: 0 }, semLugar: 5.12, total: 125.12, cap: 500 }, 'o peso em cada veículo, o sem lugar, o total e a capacidade');
  eq(N.normalizar(null).caravana, { veiculos: [], carga: [], gente: [], vai: {} }, 'sem caravana, uma vazia');
}
/* ---- lote 5: lugar, clima, áreas, construções do catálogo, quanto cada um come, quem mexe no quê ---- */
{
  const v = N.normalizar(null);
  eq([v.lugar, v.clima, v.verCaravana, v.area, v.comer], ['floresta', 'limpo', true, {}, { racas: {}, pers: {} }], 'sem nada: na floresta, tempo bom, a caravana à vista, todos na fogueira e ninguém com ração própria');
  const s = N.normalizar({ lugar: 'lua', clima: 'granizo', verCaravana: 0, area: { a: 'oficinas', b: 'fogueira', c: 'telhado', 'x y': 'guarda', d: 'guarda' },
    comer: { racas: { ' Anã ': '2', 'ELFO': 0, orc: 150, '': 3, fada: 'x' }, pers: { p1: 3, 'a b': 1, p2: -4 } } });
  eq([s.lugar, s.clima, s.verCaravana, s.area], ['floresta', 'limpo', true, { a: 'oficinas', d: 'guarda' }], 'lugar e clima fora da lista voltam ao padrão; só áreas da lista (a fogueira é o padrão: não se anota)');
  eq(s.comer, { racas: { ana: 2, elfo: 0, orc: 99 }, pers: { p1: 3, p2: 0 } }, 'as rações por raça (sem acento e sem diferença de maiúsculas) e por personagem, de 0 a 99');
  eq([N.normalizar({ verCaravana: false }).verCaravana, N.normalizar({ lugar: 'caverna', clima: 'neve' }).lugar, N.normalizar({ clima: 'neve' }).clima], [false, 'caverna', 'neve'], 'esconder a caravana, e os valores da lista ficam');
  ok(N.LUGARES.length === 6 && N.CLIMAS.length === 6 && N.AREAS.map(a => a[0]).join() === 'fogueira,oficinas,convivio,guarda,caca' && N.CATEGORIAS.length === 4 && N.NIVEIS.join() === 'Simples,Boa,Excelente', 'seis lugares, seis tempos, cinco áreas (com a Caça, lote 18), quatro categorias, três níveis');
  ok(N.ESTRUTURAS.length >= 12 && N.ESTRUTURAS.every(e => N.CATEGORIAS.some(c => c[0] === e.cat) && N.AREAS.some(a => a[0] === e.area) && e.nv.length === 3 && e.nome && e.desc) && new Set(N.ESTRUTURAS.map(e => e.k)).size === N.ESTRUTURAS.length && Object.isFrozen(N.ESTRUTURAS),
    'o catálogo: cada tipo com categoria, área, nome, descrição e três níveis');
  ok(N.CATEGORIAS.every(c => N.ESTRUTURAS.some(e => e.cat === c[0])) && N.AREAS.every(a => N.ESTRUTURAS.some(e => e.area === a[0])), 'toda categoria tem construções, e toda área tem o que desenhar');
}
{
  // uma construção nova: no nível simples, com o que cada nível faz por padrão
  const f = N.item('construcao', 'forja');
  ok(f && f.tipo === 'forja' && f.nivel === 1 && f.nome === 'Forja' && f.nv.length === 3 && f.on && f.alvo.todos && f.fx.length === 1 && f.fx[0].k === 'DFF' && f.fx[0].v === 1, 'a forja nova: nível simples, DFF +1 até o descanso');
  ok(N.item('construcao', 'nada') === null, 'tipo fora do catálogo: nada');
  const c = N.normalizar({ melhorias: [Object.assign(N.copia(f), { nivel: 2 }), { id: 'k', tipo: 'bardo', nivel: 3, ef: { conf: 1 } }, { id: 'z', tipo: 'xx', nome: 'Poço', nivel: 2, nv: [1], ef: { conf: 4 } }, { id: 'h', tipo: 'horta', nivel: '9' }] });
  const [forja, bardo, poco, horta] = c.melhorias;
  ok(forja.nivel === 2 && forja.fx[0].v === 2 && JSON.stringify(forja.fx) === JSON.stringify(forja.nv[1].fx) && JSON.stringify(forja.ef) === JSON.stringify(forja.nv[1].ef), 'trocar o nível troca os efeitos: no nível bom, DFF +2 (o ef e o fx são sempre os do nível)');
  ok(bardo.nivel === 3 && bardo.ef.conf === 1 && bardo.nv[2].ef.conf === 1 && bardo.nv[0].ef.san === 2 && bardo.nv[1].ef.san === 4, 'construção gravada sem a lista dos níveis: o nível em que ela está fica com o que veio; os outros, com o padrão');
  eq([poco.tipo, poco.nivel, poco.nv, poco.ef.conf], [undefined, undefined, undefined, 4], 'tipo fora do catálogo: uma melhoria comum (sem nível, sem desenho)');
  ok(horta.nivel === 3 && horta.ef.prov === -2, 'nível fora de 1 a 3 fica no limite (a horta excelente economiza 2 rações)');
  const meu = N.normalizar({ melhorias: [Object.assign(N.copia(f), { nv: [{ ef: { conf: 9 } }, f.nv[1], f.nv[2]] })] }).melhorias[0];
  ok(meu.ef.conf === 9 && meu.fx.length === 0 && meu.nv[1].fx[0].v === 2, 'o mestre muda o que um nível faz: vale para aquele nível (os outros ficam)');
  eq(N.efeitos(c), { conf: 1 + 4 + 1, san: 0, rec: 5, prov: -2 }, 'nos efeitos do descanso, cada construção conta o nível em que está (o bardo como veio, a horta excelente pelo padrão)');
  eq([N.construcoes(c, 'oficinas').map(m => m.id), N.construcoes(c, 'convivio').map(m => m.id), N.construcoes(c, 'guarda').map(m => m.tipo), N.construcoes(c, 'fogueira')], [[forja.id], ['k'], ['horta'], []], 'as construções de cada área (a melhoria comum não é desenhada)');
  const off = N.normalizar({ melhorias: [Object.assign(N.copia(f), { on: false })] });
  eq(N.construcoes(off, 'oficinas'), [], 'a desligada não aparece');
  eq([N.areaDe(N.normalizar({ area: { a: 'convivio' } }), 'a'), N.areaDe(N.normalizar(null), 'a')], ['convivio', 'fogueira'], 'a área de cada um (sem nada: a fogueira)');
}
{
  // quanto cada um come: por personagem > por raça > a regra (só no descanso longo)
  const c = N.normalizar({ provisoes: [{ id: 'pao', nome: 'Pão', qtd: 20 }], comer: { racas: { anão: 2, fada: 0 }, pers: { z: 3 } } });
  const anao = { id: 'a', nome: 'Gimli', raca: 'Anão', recursos: [] }, fada = { id: 'f', nome: 'Pip', raca: ' FADA', recursos: [] }, zé = { id: 'z', nome: 'Zé', raca: 'Anão', recursos: [] }, hum = { id: 'h', nome: 'Ana', raca: 'Humana', recursos: [] };
  eq([anao, fada, zé, hum].map(p => N.quantoCome(c, 'longo', p)), [2, 0, 3, 1], 'anão come 2, fada 0, o Zé (anão) tem a dele: 3; sem nada anotado, a regra (1)');
  eq([anao, zé].map(p => N.quantoCome(c, 'curto', p)), [0, 0], 'no descanso curto, a regra do curto para todos');
  eq(N.quantoCome(c, 'longo', hum, 4), 4, 'com outro padrão neste descanso, quem não tem nada anotado segue ele');
  const p = N.planejar(c, 'longo', [anao, fada, zé, hum]);
  eq([p.custo, p.gasto, p.linhas.map(l => [l.quer, l.come.reduce((s, x) => s + x.qtd, 0)])], [6, 6, [[2, 2], [0, 0], [3, 3], [1, 1]]], 'o descanso gasta 2 + 0 + 3 + 1 = 6, e cada um come o seu');
  const q = N.planejar(c, 'longo', [anao, fada, zé, hum], { prov: 2, porPessoa: { f: 1, h: 'x' } });
  eq([q.custo, q.linhas.map(l => l.quer)], [8, [2, 1, 3, 2]], 'na hora: a fada come 1 (mudado só neste descanso) e quem segue o padrão come o novo (2)');
  const pouco = N.normalizar(Object.assign(N.copia(c), { provisoes: [{ id: 'pao', nome: 'Pão', qtd: 4 }] }));
  const r = N.planejar(pouco, 'longo', [anao, zé, hum]);
  eq([r.custo, r.gasto, r.falta, r.linhas.map(l => l.come.reduce((s, x) => s + x.qtd, 0))], [6, 4, 2, [2, 1, 1]], 'faltando, as rações saem em rodízio, na ordem da roda: uma para cada, depois mais uma para cada (o Zé fica sem duas das dele)');
  eq(N.planejar(N.normalizar({ provisoes: [{ id: 'p', qtd: 9 }] }), 'longo', [hum, hum]).custo, 2, 'sem nada anotado, como antes: a regra por pessoa');
  eq(N.chaveRaca('  Elfa  da   Floresta '), 'elfa da floresta', 'a chave de uma raça');
}
{
  // quem mexe no quê: o jogador com o acampamento mexe em quase tudo; as partes do mestre vão como estão no banco
  const antes = N.normalizar({ nome: 'Clareira', hora: 'noite', provisoes: [{ id: 'p', nome: 'Pão', qtd: 2 }] });
  const soProv = N.normalizar(Object.assign(N.copia(antes), { provisoes: [{ id: 'p', nome: 'Pão', qtd: 3 }], lugares: { a: { x: 30, y: 50 } }, area: { a: 'oficinas' }, diario: [{ id: 'd', t: 1, texto: 'oi' }] }));
  ok(!N.mexeNoMestre(antes, soProv), 'provisões, lugares, áreas e diário: são do jogador com o acampamento');
  ok(['nome', 'hora', 'regras', 'presentes', 'bonus', 'lugar', 'clima'].every(k => { const d = N.copia(antes); d[k] = k === 'presentes' ? ['x'] : k === 'regras' ? Object.assign({}, d.regras, { longo: Object.assign({}, d.regras.longo, { rec: 1 }) }) : k === 'bonus' ? [{ id: 'b', nome: 'B', desc: '', ateDescanso: false }] : k === 'lugar' ? 'deserto' : k === 'clima' ? 'chuva' : k === 'hora' ? 'amanhecer' : 'Outro'; return N.mexeNoMestre(antes, N.normalizar(d)); }),
    'nome, hora, regras, quem está no acampamento, bônus, lugar e clima: só o mestre');
  const cru = { v: 1, nome: 'Clareira', hora: 'noite', presentes: ['a'], roda: [{ id: 'a', nome: 'Ana', extra: 'de outra versão' }], provisoes: [] };
  const sai = N.paraJogador(cru, soProv);
  ok(JSON.stringify(sai.roda) === JSON.stringify(cru.roda) && sai.nome === 'Clareira' && !('lugar' in sai) && sai.provisoes[0].qtd === 3 && sai.area.a === 'oficinas' && JSON.stringify(sai.presentes) === '["a"]', 'o que o jogador grava: as partes do mestre exatamente como estão no banco (até o que esta versão arrumaria diferente); as dele, novas');
  ok(cru.provisoes.length === 0, 'e o documento de lá não é alterado');
  // (a lista é a mesma do gatilho do banco, privado.acamp_guarda: as duas andam juntas)
  eq(N.SO_MESTRE, ['nome', 'hora', 'fundo', 'cena', 'presentes', 'autoVistos', 'roda', 'regras', 'bonus', 'emo', 'lugar', 'clima'], 'as partes que só o mestre muda');
  ok(N.SO_MESTRE.every(k => { const d = N.copia(antes); d[k] = 'outra coisa'; return N.mexeNoMestre(antes, d); }), 'mexer em qualquer uma delas é mexer no que é do mestre');
}
{
  // lote 6: a comida especial se espalha em rodízio; a de banquete vale para todos que descansam
  const pessoas = ['dain', 'lia', 'ogro'].map(id => ({ id, nome: id, recursos: [] }));
  const luxo = { id: 'luxo', nome: 'Luxo', qtd: 3, ef: { conf: 20, san: 5, rec: 0 }, fx: [{ t: 'bonus', k: 'FOR', v: 2, dur: 'descanso' }] };
  const longa = { id: 'longa', nome: 'Longa', qtd: 40 };
  const c = N.normalizar({ provisoes: [luxo, longa], regras: { longo: { prov: 10 } } });
  const p = N.planejar(c, 'longo', pessoas);
  eq(p.linhas.map(l => [l.come.map(x => x.id + ':' + x.qtd).join(','), l.fx.length]), [['luxo:1,longa:9', 1], ['luxo:1,longa:9', 1], ['luxo:1,longa:9', 1]],
    'com 10 rações por pessoa e 3 de Luxo na frente, cada um come uma de Luxo (rodízio) — e os três ganham o efeito, não só o primeiro da roda');
  eq(p.comidas, [{ id: 'luxo', nome: 'Luxo', n: 3 }], 'o diário conta que os três comeram o Luxo');
  const um = N.normalizar({ provisoes: [Object.assign({}, luxo, { qtd: 1 }), longa], regras: { longo: { prov: 10 } } });
  const q = N.planejar(um, 'longo', pessoas);
  eq(q.linhas.map(l => l.fx.length), [1, 0, 0], 'com uma só de Luxo (sem banquete), só quem a comeu ganha o efeito');
  const banq = N.normalizar({ provisoes: [Object.assign({}, luxo, { qtd: 1, todos: true }), longa], regras: { longo: { prov: 10, conf: 0 } } });
  ok(banq.provisoes[0].todos === true && N.normalizar({ provisoes: [{ id: 'a', todos: 'sim' }] }).provisoes[0].todos === false && N.item('provisoes').todos === false, 'banquete: só com todos === true (a provisão nova não é de banquete)');
  const b = N.planejar(banq, 'longo', pessoas.map(x => Object.assign({ conf: 10 }, x)));
  eq([b.linhas.map(l => [l.fx.length, l.fx[0] && l.fx[0].de, l.conf.para]), b.comidas, b.servida], [[[1, 'Luxo', 30], [1, 'Luxo', 30], [1, 'Luxo', 30]], [{ id: 'luxo', nome: 'Luxo', n: 3, todos: true }], null],
    'banquete: uma ração de Luxo comida (pelo primeiro), e o efeito (Conforto +20, FOR +2) vale para os três');
  ok(/banquete de Luxo para todos/.test(N.resumoDescanso(b)), 'e o diário diz: ' + N.resumoDescanso(b));
  const vazio = N.normalizar({ provisoes: [Object.assign({}, luxo, { qtd: 0, todos: true }), longa] });
  eq(N.planejar(vazio, 'longo', pessoas).linhas.map(l => l.fx.length), [0, 0, 0], 'banquete que ninguém comeu (acabou) não dá efeito a ninguém');
  const servido = N.planejar(banq, 'longo', pessoas, { servir: 'luxo' });
  eq([servido.servida.todos, servido.comem], [true, 1], 'servido, o plano diz que é de banquete (a prévia não avisa que "não dá para todos")');
}
{
  // os desenhos do acampamento (desenhos.js): cada construção em três níveis, a caravana só na fogueira
  const D = require('../../acampamento/desenhos.js');
  const semNivel = s => s.replace(/ data-nivel="\d"/g, '');
  ok(N.ESTRUTURAS.every(e => D.tipos.includes(e.k)), 'toda construção do catálogo tem desenho');
  ok(N.ESTRUTURAS.every(e => { const a = semNivel(D.construcao(e.k, 1)), b = semNivel(D.construcao(e.k, 2)), c = semNivel(D.construcao(e.k, 3)); return a && a !== b && b !== c && a !== c; }), 'e o desenho muda em cada nível');
  ok(/data-nivel="3"/.test(D.construcao('forja', 9)) && /data-nivel="1"/.test(D.construcao('forja', 0)) && D.construcao('nada', 1) === '', 'o nível fica entre 1 e 3; tipo sem desenho: nada');
  const car = [{ tipo: 'carroca' }, { tipo: 'montaria' }];
  ok((D.cena({ area: 'fogueira', caravana: car }).match(/class="veiculo"/g) || []).length === 2 && !/class="veiculo"/.test(D.cena({ area: 'oficinas', caravana: car })), 'a caravana aparece na fogueira, não nas outras áreas');
  ok((D.caravana(Array.from({ length: 9 }, () => ({ tipo: 'animal' })), 'floresta').match(/class="veiculo"/g) || []).length === 6, 'no máximo seis veículos e animais na cena');
  ok(!/transform/.test(D.caravana([{ tipo: 'barco' }], 'mar')) && /transform/.test(D.caravana([{ tipo: 'barco' }], 'floresta')), 'o barco fica no mar, na beira-mar; longe do mar, vai numa carreta');
  // muitas construções numa área: todas cabem na cena (encolhem juntas)
  const guarda = N.ESTRUTURAS.filter(e => e.area === 'guarda').map(e => ({ tipo: e.k, nivel: 3 }));
  const xs = [...D.cena({ area: 'guarda', construcoes: guarda }).matchAll(/class="construcao" data-tipo="(\w+)" data-nivel="\d" transform="translate\(([-\d.]+) /g)].map(m => +m[2]);
  ok(xs.length === guarda.length - 1 && xs.every(x => x >= 0 && x <= 1600), 'as ' + guarda.length + ' da Guarda e Cuidado no nível excelente cabem na cena (a paliçada vai ao fundo, na largura toda) — ' + xs.join(', '));
}

/* ---- (lote 7, parte 5c) a noite no clima do Mapa-múndi ---- */
{
  const M = require('../../mundo/nucleo.js');
  ok(Object.keys(M.CLIMAS).every(k => N.CLIMA_MUNDO[k] && N.CLIMA_MUNDO[k].nome === M.CLIMAS[k].nome && N.CLIMA_MUNDO[k].conf === M.CLIMAS[k].conf && N.CLIMA_MUNDO[k].acamp === M.CLIMAS[k].acamp) && Object.keys(N.CLIMA_MUNDO).length === Object.keys(M.CLIMAS).length
    && Object.values(N.CLIMA_MUNDO).every(c => N.CLIMAS.some(x => x[0] === c.acamp)), 'os climas do Mapa-múndi, iguais aos de lá (o nome, o Conforto da noite e o desenho daqui)');
  const camp = N.normalizar({ provisoes: [{ id: 'p1', nome: 'Pão', qtd: 10 }] });
  const ana = { id: 'a', nome: 'Ana', recursos: [], san: 80, conf: 40, poderes: [], fad: null, tmp: [] };
  const sem = N.planejar(camp, 'longo', [ana]), com = N.planejar(camp, 'longo', [ana], { clima: { k: 'chuva', conf: -5 } }), curto = N.planejar(camp, 'curto', [ana], { clima: { k: 'chuva', conf: -5 } });
  eq([com.conf, com.linhas[0].conf.para, com.clima], [sem.conf - 5, sem.linhas[0].conf.para - 5, { k: 'chuva', nome: 'Chuva', conf: -5 }], 'a noite de chuva: −5 no Conforto do descanso longo');
  ok(/noite de chuva/.test(N.resumoDescanso(com)) && !/noite de/.test(N.resumoDescanso(sem)), 'o resumo do descanso diz a noite de chuva');
  eq([curto.clima, curto.conf], [null, N.planejar(camp, 'curto', [ana]).conf], 'o descanso curto não é a noite: o clima não conta');
  eq(N.planejar(camp, 'longo', [ana], { clima: { k: 'xyz', conf: -50 } }).clima, null, 'clima que não existe: nada');
}
console.log(bad ? `${n - bad} verificações passaram, ${bad} falharam` : `${n} verificações passaram`);
process.exit(bad ? 1 : 0);
