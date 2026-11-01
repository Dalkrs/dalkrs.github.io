// O cinto de poções da Yanato (lote 55), a lógica pura (tc/barras-painel.js e tc/barras.js):
//   · a escola Yanato cria a barra de Toxicidade (0 a 20, começa em 0, o combate não mexe, zera no descanso longo);
//   · o cinto: 3 laços (+1 por grau do Bornal de Cinza, +até 3 que o mestre dá, no máximo 8), um vidro por laço;
//     o cinto novo vem com 3 Frascos de Cinza cheios; o vidro que se põe num laço chega vazio;
//   · tocar num frasco o gasta; beber uma poção soma a Toxicidade e põe o efeito com as rodadas; a Branca limpa tudo;
//     a Cinza Brilhante, uma por combate; o descanso longo enche o cinto e zera a Toxicidade;
//   · os patamares (10 Enjoado, 15 Intoxicado, 20 o corpo cede: Atordoado e depois 15); −1 por turno; os lembretes;
//   · o fim do combate: a Toxicidade fica; o cinto, os laços e o Bornal ficam; os efeitos e a Cinza da luta vão embora.
const { checker } = require('./lib');
const { ok, end } = checker();
const PB = require('../../tc/barras-painel.js');
const B = require('../../tc/barras.js');
const j = JSON.stringify;

// ---------- a barra comum da ficha (tc/barras.js) ----------
const yan = B.defDaArvore({ id: 'a5ufrdl1er', categoria: 'escola', nodes: [] });
ok(yan && yan.nome === 'Toxicidade' && yan.min === 0 && yan.max === 20 && yan.inicio === 0 && yan.comb === 'fica' && yan.cat === 'escola', 'a escola Yanato: a Toxicidade, 0 a 20, começa em 0, o combate não mexe — ' + j(yan));
ok(B.defDaArvore({ id: 'outra', nome: 'Outra Escola', categoria: 'escola', nodes: [{ pais: [], desc: 'Cinza: máximo 3.' }] }) === null, 'as outras escolas continuam sem barra');
ok(B.ESCOLAS_COM_BARRA.includes('a5ufrdl1er') && B.ORDEM[B.ORDEM.length - 1] === 'escola', 'a escola vem depois de raça, classe e linhagem — ' + j(B.ORDEM));
{
  const arvs = { y: { id: 'a5ufrdl1er', nome: 'Yanato', categoria: 'escola', nodes: [] }, ra: { id: 'aaj23w9sif', nome: 'Anão da Forja', categoria: 'raca', nodes: [] }, cl: { id: 'aasemzgk9a', nome: 'Bárbaro', categoria: 'classe', nodes: [] } };
  const porId = id => Object.values(arvs).find(a => a.id === id) || null;
  const dp = B.doPersonagem(['a5ufrdl1er', 'aasemzgk9a', 'aaj23w9sif'], porId);
  ok(j(dp.map(b => b.nome)) === j(['Calor da Forja', 'Ira', 'Toxicidade']), 'a ficha: a raça, a classe e por último a Toxicidade da escola — ' + j(dp.map(b => b.nome)));
}

// ---------- o painel: o cinto ----------
ok(PB.YANATO === 'a5ufrdl1er' && PB.barraDaArvore('a5ufrdl1er') === 'yanato' && PB.barraDaArvore({ nome: 'Yanato' }) === 'yanato', 'a árvore da Yanato (pelo id e pelo nome) liga a barra do cinto');
const d = PB.BARRA.yanato;
ok(d && d.cat === 'escola' && d.barra === 'Toxicidade' && d.fim === 'fica' && d.teto === null, 'a barra do painel: Toxicidade, da escola, sem teto por rodada, fica no fim do combate');
const cores = PB.POCOES.map(p => p.nomeCor);
ok(j(cores) === j(['Vermelha', 'Laranja', 'Amarela', 'Verde', 'Azul', 'Preta', 'Branca', 'Cinza Brilhante']), 'as 8 poções, uma por cor — ' + j(cores));
ok(PB.POCOES.every(p => p.nome && p.efeito && p.curto && /^#[0-9A-F]{6}$/i.test(p.cor) && p.tox >= 0 && p.tox <= 10 && (p.dur === 'combate' || (Number.isInteger(p.dur) && p.dur >= 0 && p.dur <= 5))), 'toda poção tem nome, efeito, cor, toxicidade (0 a 10) e duração (até 5 rodadas, ou o combate)');

const linhas = [];
let rodada = 1;
const novoAtor = (v, guard) => ({ nome: 'Ilka', dono: 'jogador', barras: [PB.instancia('yanato', v, guard || null, { min: 0, max: 20 })], aba: 0, aberto: true, logar: m => linhas.push(m), rodada: () => rodada });
const ult = () => linhas[linhas.length - 1] || '';
const tocar = (a, k) => { const b = a.barras[0]; PB.mexer(a, b, ctx => d.clique.call(d, b.s, k, ctx)); };
const fazer = (a, ac, val) => { const b = a.barras[0]; PB.mexer(a, b, ctx => d.acao.call(d, b.s, ac, ctx, val, { value: val, dataset: {} })); };
const cinto = a => a.barras[0].s.lacos.map(x => x.k + (x.cheio ? '' : '·')).join(' ');

let a = novoAtor();
let b = a.barras[0];
ok(b.v === 0, 'começa em 0');
let h = PB.painelHTML(a, { papel: 'jogador' }).html;
ok(j(PB.lacosDe(b.s).map(x => [x.k, x.cheio])) === j([['frasco', true], ['frasco', true], ['frasco', true]]), 'o cinto novo: 3 Frascos de Cinza, cheios');
ok((h.match(/data-k="l\d"/g) || []).length === 3 && /Arrumar o cinto/.test(h) && /Descanso longo/.test(h), 'o painel: um vidro por laço (3) e os botões Arrumar o cinto e Descanso longo');
ok(/3 de 3 vidros cheios/.test(h) && /Limpo/.test(h), 'a linha de estado: Limpo; 3 de 3 vidros cheios');

// o Bornal e os laços extras
b.s.bornal = 2;
ok(PB.lacosDe(b.s).length === 5 && b.s.lacos.slice(3).every(x => x.k === 'frasco' && !x.cheio), 'o Bornal de Cinza no 2º grau: 5 laços; os 2 novos chegam vazios');
fazer(a, 'arrumar');
fazer(a, 'maislaco'); fazer(a, 'maislaco'); fazer(a, 'maislaco'); fazer(a, 'maislaco');
ok(b.s.extra === 3 && b.s.lacos.length === 8, 'os laços que o mestre dá: até 3 (o 4º não entra), 8 no total — ' + b.s.extra + ' extra, ' + b.s.lacos.length + ' laços');
fazer(a, 'menoslaco'); fazer(a, 'menoslaco'); fazer(a, 'menoslaco');
ok(b.s.extra === 0 && b.s.lacos.length === 5, '−1 laço tira os extras (de volta a 5)');

// arrumar: o vidro novo chega vazio
tocar(a, 'l3');
ok(b.s.sel === 3 && b.v === 0, 'arrumando, tocar num laço só escolhe o laço');
h = PB.painelHTML(a, { papel: 'jogador' }).html;
ok(/<select data-a="poe"/.test(h) && (h.match(/<option /g) || []).length === 9, 'a escolha do laço: o Frasco de Cinza e as 8 poções');
fazer(a, 'poe', 'vermelha'); tocar(a, 'l4'); fazer(a, 'poe', 'branca'); tocar(a, 'l2'); fazer(a, 'poe', 'cinza');
ok(cinto(a) === 'frasco frasco cinza· vermelha· branca·', 'o vidro posto chega vazio (até o próximo descanso) — ' + cinto(a));
fazer(a, 'pronto');
ok(!b.s.arrumar && /Ilka arrumou o cinto: 2 Frascos de Cinza, Cinza Brilhante, Vermelha e Branca\./.test(ult()), 'Pronto: a mesa ao vivo diz como ficou o cinto — ' + ult());

// o descanso longo enche tudo
b.v = 6;
fazer(a, 'descanso');
ok(b.v === 0 && b.s.lacos.every(x => x.cheio) && /^Descanso longo: cinto de Ilka cheio \(.*\); Toxicidade 6 → 0\.$/.test(ult()), 'Descanso longo: o cinto enche e a Toxicidade vai a 0 — ' + ult());

// usar
tocar(a, 'l0');
ok(!b.s.lacos[0].cheio && b.v === 0 && /tirou um Frasco de Cinza do cinto \(1 resta\)/.test(ult()), 'o Frasco de Cinza: tocar gasta (não mexe na Toxicidade) — ' + ult());
tocar(a, 'l0');
ok(/vazio/.test(b.aviso) && b.v === 0, 'o laço vazio só avisa — ' + b.aviso);
tocar(a, 'l3');
ok(b.v === 4 && j(b.s.efeitos) === j([{ p: 'vermelha', r: 4 }]) && /Ilka bebeu a Vermelha \(Sangue de Vas: regenera 5% do HP por turno, 4 rodadas\)\. Toxicidade 0 → 4\./.test(ult()), 'beber a Vermelha: +4 de Toxicidade e a regeneração por 4 rodadas — ' + ult());
ok(linhas.every(l => l.length <= 120), 'as linhas da mesa ao vivo cabem nos 120 caracteres');
tocar(a, 'l2');
ok(b.v === 14 && b.s.cinzaUsada && b.s.efeitos.some(e => e.p === 'cinza' && e.r === 'combate'), 'a Cinza Brilhante: +10 e vale até o fim do combate');
b.aviso = '';   // (o aviso do laço vazio, lá de cima, já foi visto)
h = PB.painelHTML(a, { papel: 'jogador' }).html;
ok(/Enjoado/.test(h) && /Valendo: Sangue de Vas \(4 rodadas\), Cinza Viva \(até o fim do combate\)/.test(h), 'a linha de estado: o patamar (Enjoado, de 10 a 14) e o que está valendo');
b.s.lacos[2].cheio = true; b.aviso = '';
tocar(a, 'l2');
ok(b.v === 14 && b.s.lacos[2].cheio && /só uma por combate/.test(b.aviso), 'a segunda Cinza Brilhante no mesmo combate não desce — ' + b.aviso);

// o começo do turno: −1, os lembretes e as rodadas
linhas.length = 0;
PB.comecarTurno(a);
ok(b.v === 13 && b.s.efeitos.find(e => e.p === 'vermelha').r === 3 && linhas.some(l => /Ilka, começo do turno: Sangue de Vas, recupera 5% do HP máximo\./.test(l)), 'o começo do turno: −1 de Toxicidade; o lembrete da regeneração; uma rodada a menos — ' + j(linhas));
PB.comecarTurno(a); PB.comecarTurno(a); linhas.length = 0; PB.comecarTurno(a);
ok(b.v === 10 && !b.s.efeitos.some(e => e.p === 'vermelha') && b.s.efeitos.some(e => e.p === 'cinza') && linhas.some(l => /Ilka: Sangue de Vas acabou\./.test(l)), 'a regeneração acaba depois de 4 rodadas; a Cinza fica — ' + j(linhas));

// o corpo cede
b.v = 17; linhas.length = 0;
PB.comecarTurno(a);
ok(b.v === 16 && linhas.some(l => /Ilka está Intoxicado/.test(l)), 'Intoxicado (15 a 19): o lembrete do HP no começo do turno');
b.s.lacos[1].k = 'laranja'; b.s.lacos[1].cheio = true;
tocar(a, 'l1');
ok(b.v === 20 && b.s.cedeu && linhas.some(l => /O corpo de Ilka cede: Atordoado/.test(l)), 'chegou a 20: o corpo cede (Atordoado) — ' + ult());
linhas.length = 0;
PB.comecarTurno(a);
ok(b.v === 15 && !b.s.cedeu && /Atordoado/.test(b.aviso), 'no começo do turno seguinte: Atordoado e a Toxicidade cai para 15');

// a Branca limpa
b.s.lacos[4].cheio = true;
tocar(a, 'l4');
ok(b.v === 0 && b.s.efeitos.length === 0 && /Ilka bebeu a Branca \(Sal de Yana\): Toxicidade 15 → 0; os efeitos das outras poções acabam\./.test(ult()), 'a Branca: Toxicidade a 0 e os efeitos acabam — ' + ult());

// o fim do combate
b.v = 7; b.s.efeitos = [{ p: 'amarela', r: 2 }]; b.s.cinzaUsada = true; b.s.extra = 1; PB.lacosDe(b.s);
const antes = j(b.s.lacos);
PB.fimDoCombate(a, b);
ok(b.v === 7 && /Fim do combate: Toxicidade de Ilka fica em 7\./.test(ult()), 'fim do combate: a Toxicidade fica — ' + ult());
ok(j(b.s.lacos) === antes && b.s.extra === 1 && b.s.bornal === 2 && b.s.lacos.length === 6, 'o cinto, os laços extras e o Bornal ficam');
ok(b.s.efeitos.length === 0 && !b.s.cinzaUsada, 'os efeitos da luta e a Cinza da luta vão embora (a próxima luta tem Cinza de novo)');

// guardar e voltar (é o que vai para o estado do personagem)
const g = JSON.parse(j(PB.guardar(b)));
const a2 = novoAtor(b.v, g);
ok(j(a2.barras[0].s.lacos) === antes && a2.barras[0].v === 7, 'guardar e voltar: o cinto volta igual');

// o descanso longo do Acampamento enche o cinto (no estado guardado: estado.pb.yanato)
{
  const N = require('../../acampamento/nucleo.js');
  b.s.efeitos = [{ p: 'azul', r: 2 }]; b.s.cinzaUsada = true; b.s.lacos[0].cheio = false; b.s.lacos[3].cheio = false;
  const est = { rec: { tox: 9 }, pb: { yanato: JSON.parse(j(PB.guardar(b))), samurai: { s: { atual: 'alta' } } } };
  ok(N.encherCinto(est) === true && est.pb.yanato.s.lacos.every(x => x.cheio) && est.pb.yanato.s.lacos.length === 6 && est.pb.yanato.s.efeitos.length === 0 && !est.pb.yanato.s.cinzaUsada && est.pb.samurai.s.atual === 'alta',
    'o descanso longo do Acampamento: o cinto enche (todos os laços), sem efeitos, a Cinza de volta; o resto do painel fica');
  ok(N.encherCinto({ rec: {} }) === false && N.encherCinto({ pb: { samurai: {} } }) === false, 'quem não tem cinto: nada muda');
}

// o NPC sem ficha: o cinto padrão, e a face desenha o NPC também
const n = novoAtor(); n.dono = 'mestre';
const hn = PB.painelHTML(n, { papel: 'mestre' }).html;
ok((hn.match(/data-k="l\d"/g) || []).length === 3 && /<svg/.test(hn), 'o NPC do mestre: o mesmo cinto de 3 laços');
const selo = PB.seloHTML ? PB.seloHTML(n) : '';
ok(!PB.seloHTML || /Toxicidade|<svg/.test(selo), 'o selo do mestre mostra a Toxicidade');

end();
