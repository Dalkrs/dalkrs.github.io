/* Tiny Cats · Mapa-múndi · a ajuda da batalha (os "?" da janela da batalha).
   O guia de como a batalha funciona — a resumida e a detalhada, os quatro momentos, cada bônus, o resultado, o depois e
   os heróis —, em palavras simples e com os números da batalha aberta ("Nesta batalha: …"); a fórmula de cada coisa
   fica escondida em "Ver a conta". Aqui só se monta o conteúdo: a janela da batalha (guerra-painel.js) abre o painel ao
   lado e leva até a parte pedida (data-sec).
   As partes: modos (resumida, detalhada), momentos (m:ab, m:ch, m:vi, m:de, chave), bonus (b:numeros, b:qualidade, …),
   resultado, depois, herois. */
(() => {
  'use strict';
  const G = () => window.MundoGuerra;
  const MOM = { ab: 'Abertura', ch: 'Choque', vi: 'Virada', de: 'Desfecho' };
  const EM = { ab: 'na', ch: 'no', vi: 'na', de: 'no' };
  const SECOES = [['modos', 'Resumida ou detalhada'], ['momentos', 'Os quatro momentos'], ['bonus', 'Os bônus'], ['resultado', 'O resultado'], ['depois', 'Depois da batalha'], ['herois', 'Os heróis']];
  const BONUS = ['numeros', 'qualidade', 'tipos', 'moral', 'comandante', 'herois', 'magia', 'distancia', 'estrutura', 'fome', 'mestre', 'heroica'];
  const NOME_B = { numeros: 'Números', qualidade: 'ATQ contra DEF', tipos: 'Tipos de tropa', moral: 'Moral', comandante: 'Comandante', herois: 'Heróis', magia: 'Magos',
    distancia: 'À distância', estrutura: 'Fortificação', fome: 'Sem mantimentos', mestre: 'Do mestre', heroica: 'Ação heroica' };
  // o "?" pede uma parte; algumas moram dentro de outra
  const ondeMora = id => (SECOES.some(([s]) => s === id) || /^(m|b):/.test(id) || ['resumida', 'detalhada', 'chave', 'parar'].includes(id) ? id : 'modos');

  /* d: { h, fmt, plural, sinal, textoMoral, nomeA, nomeB, A, B (os lados, de MundoGuerra.lado), ctx (o contexto: a
     fortificação, os bônus do mestre, os heróis, as ações), modo, res, moms, fim, fort: { lado, nome, def, cons, hp,
     hpMax } | null, herois: { a, b: [{ nome, v }] }, mestre: [{ lado, tipo, v, mom, txt }] } → os nós do guia */
  function montar(d) {
    const { h, fmt, sinal } = d, g = G();
    const nome = q => (q === 'a' ? d.nomeA : d.nomeB);
    const p = (...k) => h('p', null, ...k);
    const ex = (...k) => h('p', { class: 'aj-ex' }, h('b', { text: 'Nesta batalha: ' }), ...k);
    const conta = (...linhas) => h('details', { class: 'aj-conta' }, h('summary', { text: 'Ver a conta' }), linhas.map(t => h('p', { text: t })));
    const sec = (id, titulo, ...kids) => h('section', { class: 'aj-sec', 'data-sec': id }, h('h3', { text: titulo }), kids);
    const sub = (id, titulo, ...kids) => h('div', { class: 'aj-sub', 'data-sec': id }, h('h4', { text: titulo }), kids);
    const lista = itens => h('ul', null, itens.map(t => h('li', null, t)));
    // os bônus de cada lado na resumida (todos) e num momento
    const bs = (q, mom) => (q === 'a' ? g.bonus(d.A, d.B, d.ctx, 'a', mom) : g.bonus(d.B, d.A, d.ctx, 'b', mom));
    const val = (q, k) => { const b = bs(q, 'd100').find(x => x.k === k); return b ? b.v : 0; };
    const txtBs = l => (l.length ? l.map(b => b.nome + ' ' + sinal(b.v)).join(', ') : 'nenhum');
    const vezes = r => fmt(r, r < 10 ? 2 : 1) + (r >= 2 ? ' vezes' : ' vez');
    const out = [];

    // o índice
    out.push(h('div', { class: 'aj-intro' },
      p('Cada lado soma as suas vantagens (os bônus) e rola um dado; ganha quem fizer mais. Os bônus estão na escala do d20: um +2 vale 2 pontos no d20 (ou 10 no d100).'),
      h('nav', { class: 'aj-indice', 'aria-label': 'As partes do guia' }, SECOES.map(([id, t]) => h('button', { type: 'button', class: 'btn sm', 'data-aj': id, text: t })))));

    // 1. resumida ou detalhada
    {
      const ta = g.total(bs('a', 'd100')), tb = g.total(bs('b', 'd100'));
      const r = d.res, placar = (d.moms || []).reduce((s, x) => s + x.m, 0);
      out.push(sec('modos', 'Resumida ou detalhada',
        p('São duas formas de resolver a mesma batalha. As duas usam os mesmos bônus; muda o dado e como eles entram.'),
        sub('resumida', 'Resumida (d100)',
          p('Uma rolagem só: cada lado rola um d100 e soma 5 vezes os seus bônus. Quem tirar mais vence, e a diferença (a margem) diz o tamanho da vitória. É rápida: boa para batalhas pequenas ou longe do grupo.'),
          ex(nome('a') + ' soma ' + sinal(ta) + ' (' + sinal(5 * ta) + ' no d100) e ' + nome('b') + ', ' + sinal(tb) + ' (' + sinal(5 * tb) + ' no d100).' +
            (r ? ' Saiu: ' + nome('a') + ' tirou ' + r.da + ' no d100, ' + sinal(5 * g.total(r.ba)) + ' de bônus = ' + r.ta + '; ' + nome('b') + ' tirou ' + r.db + ', ' + sinal(5 * g.total(r.bb)) + ' = ' + r.tb + ' — margem ' + Math.abs(r.m) + '.' : '')),
          conta('Total = d100 + 5 × bônus. Margem = total de um lado − total do outro.',
            'Margem menor que 8: empate. De 8 a 24: vitória apertada. De 25 a 49: vitória. De 50 a 79: vitória clara. 80 ou mais: vitória esmagadora.')),
        sub('detalhada', 'Detalhada (d20, em momentos)',
          p('A batalha anda em quatro momentos: Abertura, Choque, Virada e Desfecho. Em cada um, cada lado rola um d20 e soma só os bônus daquele momento; quem fizer mais leva o momento, pela diferença. No fim, as diferenças se somam (o placar), e o placar diz o tamanho da vitória.'),
          p('É mais demorada e mais dramática: entre um momento e outro dá para mudar um bônus, rolar de novo, escrever o que aconteceu ou parar a batalha.'),
          (d.moms || []).length ? ex('placar ' + sinal(placar) + ' (' + (placar > 0 ? 'para ' + nome('a') : placar < 0 ? 'para ' + nome('b') : 'empatado') + ') depois ' + ((d.moms.length === 1) ? 'do primeiro momento.' : 'de ' + d.moms.length + ' momentos.')) : null,
          conta('Total do momento = d20 + os bônus do momento. Placar = a soma das margens dos momentos (a favor de um lado, positiva; do outro, negativa).',
            'Placar menor que 4: empate. De 4 a 11: vitória apertada. De 12 a 23: vitória. De 24 a 35: vitória clara. 36 ou mais: vitória esmagadora.'))));
    }

    // 2. os quatro momentos
    {
      const TXT = {
        ab: 'as primeiras flechas e feitiços, antes de as linhas se encontrarem. Pesam os magos e as tropas que lutam à distância.',
        ch: 'as linhas se chocam. Pesam os números, o ATQ contra a DEF, os tipos de tropa, a fortificação e a falta de mantimentos.',
        vi: 'a hora em que a batalha pode virar: um lado hesita, o outro avança. Pesam a moral, o comandante e os heróis.',
        de: 'quem aguenta até o fim. Pesam de novo os números, a moral e a falta de mantimentos.',
      };
      const momentos = g.MOMENTOS.map(k => {
        const la = bs('a', k), lb = bs('b', k), x = (d.moms || []).find(y => y.k === k);
        return sub('m:' + k, MOM[k], p(MOM[k] + ': ' + TXT[k]),
          ex(nome('a') + ' ' + sinal(g.total(la)) + ' (' + txtBs(la) + '); ' + nome('b') + ' ' + sinal(g.total(lb)) + ' (' + txtBs(lb) + ').' +
            (x ? ' Saiu: ' + nome('a') + ' tirou ' + x.da + ' no d20, ' + sinal(g.total(x.ba)) + ' de bônus = ' + x.ta + '; ' + nome('b') + ' tirou ' + x.db + ', ' + sinal(g.total(x.bb)) + ' = ' + x.tb +
              (x.m ? ' — ' + nome(x.m > 0 ? 'a' : 'b') + ' leva ' + EM[k] + ' ' + MOM[k] + ' por ' + Math.abs(x.m) + '.' : ' — empatado.') : '')));
      });
      out.push(sec('momentos', 'Os quatro momentos', p('Na detalhada, cada momento é uma parte da batalha, e em cada um pesa uma coisa diferente.'), momentos,
        sub('chave', 'Momento-chave',
          p('Quando a disputa de um momento fica apertada (diferença de 2 ou menos) ou alguém tira 1 ou 20 no dado, ele vira um momento-chave. Antes de seguir, você pode mudar um bônus, rolar de novo, tentar uma ação heroica (com heróis na batalha), escrever o que aconteceu ou parar a batalha.')),
        conta('Abertura: Magos e À distância. Choque: Números, ATQ contra DEF, Tipos de tropa, Fortificação e Sem mantimentos. Virada: Moral, Comandante e Heróis. Desfecho: Números, Moral e Sem mantimentos.',
          'O bônus do mestre vale no momento que você escolher (ou em todos). A resumida soma todos os bônus, uma vez só.')));
    }

    // 3. os bônus
    {
      const lado2 = (fa, fb) => nome('a') + ': ' + fa + '; ' + nome('b') + ': ' + fb + '.';
      const A = d.A, B = d.B, vA = k => val('a', k), vB = k => val('b', k);
      const itens = {};
      // os números
      {
        const max = Math.max(A.forca, B.forca), min = Math.min(A.forca, B.forca), qM = A.forca >= B.forca ? 'a' : 'b';
        itens.numeros = [p('O lado com mais força ganha +4 a cada vez que dobra a força do outro (até +10); o menor não ganha nada. A força são as tropas (o HP de cada tropa só faz a unidade durar mais).'),
          ex(!(max > 0) ? 'nenhum dos lados tem tropas.' : !(min > 0) ? nome(qM) + ' luta sozinho: +10.' : A.forca === B.forca ? 'as forças são iguais (' + fmt(max, 0) + '): ninguém ganha.'
            : nome(qM) + ' tem força ' + fmt(max, 0) + ' contra ' + fmt(min, 0) + ' — ' + vezes(max / min) + ' — e ganha ' + sinal(qM === 'a' ? vA('numeros') : vB('numeros')) + '.'),
          conta('Bônus = 4 × log₂(força maior ÷ força menor), arredondado, até 10.', 'Força = a soma das tropas de cada unidade (a tropa ferida conta).')];
      }
      itens.qualidade = [p('O ATQ médio de um lado (com os equipamentos) contra a DEF média do outro: quem bate mais forte do que o outro se defende ganha. Vai de −6 a +6.'),
        ex(lado2('ATQ ' + fmt(A.atq, 1) + ' contra DEF ' + fmt(B.def, 1) + ' → ' + sinal(vA('qualidade')), 'ATQ ' + fmt(B.atq, 1) + ' contra DEF ' + fmt(A.def, 1) + ' → ' + sinal(vB('qualidade')))),
        conta('Bônus = ATQ médio − DEF média do outro lado, arredondado, de −6 a +6.', 'As médias pesam cada unidade pela força dela; os equipamentos somam no ATQ e na DEF da unidade.')];
      {
        const temVant = (A.tipos || []).some(t => t.vant && Object.keys(t.vant).length);
        itens.tipos = [p('As vantagens entre os tipos de tropa (aba Guerra, Tipos de tropa: a cavalaria contra os arqueiros, os lanceiros contra a cavalaria…), pela parte que cada tipo tem em cada exército.'),
          ex(temVant ? lado2(sinal(vA('tipos')), sinal(vB('tipos'))) : 'nenhum tipo de tropa tem vantagem sobre outro (dá para pôr na aba Guerra).'),
          conta('Bônus = a soma, para cada par de tipos (um deste lado, um do outro), de: parte do tipo aqui × parte do tipo lá × a vantagem de um contra o outro; arredondado.', 'A parte de um tipo é a força das unidades dele ÷ a força do exército.')];
      }
      itens.moral = [p('A moral vai de 0 (em fuga) a 10 (inabalável); 5 é o normal. Moral 7 dá +2; moral 3 dá −2.'),
        ex(lado2('moral ' + A.moral + ' (' + d.textoMoral(A.moral) + ') → ' + sinal(A.moral - 5), 'moral ' + B.moral + ' (' + d.textoMoral(B.moral) + ') → ' + sinal(B.moral - 5))),
        conta('Bônus = moral − 5.')];
      itens.comandante = [p('O bônus que você escreveu no comandante do exército (no painel do exército, na aba Seleção).'),
        ex(lado2((A.cmdNome || 'sem nome') + ' ' + sinal(A.cmd), (B.cmdNome || 'sem nome') + ' ' + sinal(B.cmd)))];
      {
        const hs = q => (d.herois[q] || []), txtH = q => (hs(q).length ? hs(q).map(x => x.nome + ' ' + sinal(x.v)).join(', ') + ' → ' + sinal(q === 'a' ? vA('herois') : vB('herois')) : 'nenhum');
        itens.herois = [p('A soma dos bônus dos heróis do lado (o sugerido pela ficha, ou o que você escreveu), até +10. Vale na Virada e na resumida.'),
          ex(lado2(txtH('a'), txtH('b'))), conta('Bônus = a soma dos bônus dos heróis, de −10 a +10.')];
      }
      itens.magia = [p('Os magos do lado: 1 mago dá +1, 4 dão +2, 9 dão +3… até +6 (com 36 magos ou mais). Vale na Abertura (e na resumida).'),
        ex(lado2(fmt(A.magos, 0) + ' magos → ' + sinal(vA('magia')), fmt(B.magos, 0) + ' magos → ' + sinal(vB('magia')))),
        conta('Bônus = a raiz quadrada do número de magos, arredondada, até 6.')];
      itens.distancia = [p('As tropas que lutam à distância (os tipos marcados assim na aba Guerra). Se só um lado tem, ele ganha +3; se os dois têm, ganha quem tem mais, como nos números (até +6). Vale na Abertura (e na resumida).'),
        ex(lado2('força à distância ' + fmt(A.dist, 0) + ' → ' + sinal(vA('distancia')), 'força à distância ' + fmt(B.dist, 0) + ' → ' + sinal(vB('distancia')))),
        conta('Só um lado com tropas à distância: +3. Os dois: 4 × log₂(maior ÷ menor), arredondado, até 6.')];
      {
        const f = d.fort, cerco = f ? (f.lado === 'a' ? B.cerco : A.cerco) : 0, base = f ? Math.round(f.def * (f.hpMax ? Math.max(0, Math.min(1, f.hp / f.hpMax)) : 1)) : 0;
        itens.estrutura = [p('Quem defende uma fortificação (escolhida no alto da janela) ganha a DEF dela. Danificada, ela protege menos; as máquinas de cerco do outro lado tiram dela. As construções de defesa do assentamento (a Paliçada, a Muralha) somam na DEF. Vale no Choque (e na resumida).'),
          ex(f ? nome(f.lado) + ' defende ' + f.nome + ': DEF ' + f.def + (f.cons ? ' (' + f.cons + ' das construções)' : '') + (f.hpMax && f.hp < f.hpMax ? ', com ' + f.hp + ' de ' + f.hpMax + ' de HP: protege ' + base : '') +
            (cerco ? '; as máquinas de cerco de ' + nome(f.lado === 'a' ? 'b' : 'a') + ' tiram ' + fmt(cerco, 0) : '') + ' → ' + sinal(f.lado === 'a' ? vA('estrutura') : vB('estrutura')) + '.' : 'ninguém defende uma fortificação.'),
          conta('Bônus = DEF × (HP ÷ HP máx.), arredondado, − as máquinas de cerco do outro lado (nunca abaixo de 0).', 'A DEF é a da fortificação mais a defesa das construções do assentamento (até 20).')];
      }
      itens.fome = [p('O exército sem mantimentos perde 1 por dia sem eles, até −3. Vale no Choque e no Desfecho (e na resumida).'),
        ex(lado2(A.fome ? 'sem mantimentos há ' + A.fome + (A.fome === 1 ? ' dia' : ' dias') + ' → ' + sinal(vA('fome')) : 'com mantimentos → 0', B.fome ? 'sem mantimentos há ' + B.fome + (B.fome === 1 ? ' dia' : ' dias') + ' → ' + sinal(vB('fome')) : 'com mantimentos → 0')),
        conta('Bônus = −(dias sem mantimentos), até −3.')];
      {
        const ms = d.mestre || [];
        itens.mestre = [p('Os bônus que você põe ("Pôr um bônus…" ou "Mudar um bônus", num momento): uma tática, o terreno, um reforço que chegou, uma magia. De −10 a +10, na batalha toda ou num momento só. Mudar um bônus depois de rolar muda o resultado na hora (o dado fica).'),
          ex(ms.length ? ms.map(b => nome(b.lado) + ': ' + (g.BONUS_MESTRE[b.tipo] || 'Outro') + ' ' + sinal(b.v) + ' (' + (b.mom ? 'só ' + EM[b.mom] + ' ' + MOM[b.mom] : 'a batalha toda') + ')').join('; ') + '.' : 'nenhum bônus do mestre.')];
      }
      itens.heroica = [p('Num momento-chave, um herói pode rolar um atributo da ficha contra a dificuldade que você escolhe: passou, +5; passou pelo dobro, +10; falhou, −2. Vale só naquele momento e fica fora do teto de +10 dos heróis.'),
        conta('Passou: o total chega na dificuldade. Pelo dobro: chega no dobro dela.')];
      out.push(sec('bonus', 'Os bônus', p('Cada bônus mede uma vantagem de um lado sobre o outro. Na resumida entram todos; na detalhada, cada momento soma só os dele.'),
        BONUS.map(k => sub('b:' + k, NOME_B[k], itens[k]))));
    }

    // 4. o resultado
    {
      out.push(sec('resultado', 'O resultado',
        p('O tamanho da vitória decide o depois (as perdas, a moral, a frente): empate, vitória apertada, vitória, vitória clara ou vitória esmagadora.'),
        sub('parar', 'Parar a batalha', p('No menu "Parar a batalha…", a qualquer momento:'),
          lista(['Recuo: quem recua perde, por pouco (vitória apertada do outro).', 'Rendição: quem se rende perde feio (vitória clara do outro).', 'Trégua: ninguém vence.'])),
        d.fim ? ex(g.textoFim(d.fim, d.nomeA, d.nomeB) + '.') : null,
        conta('Resumida, pela margem: menos de 8, empate; até 24, apertada; até 49, vitória; até 79, clara; 80 ou mais, esmagadora.', 'Detalhada, pelo placar: menos de 4, empate; até 11, apertada; até 23, vitória; até 35, clara; 36 ou mais, esmagadora.')));
    }

    // 5. o depois
    {
      const pct = x => Math.round(x * 100) + '%', f = d.fim;
      let exDep = null;
      if (f) {
        const pr = g.perdas(f), ma = g.moralDepois(f, 'a', d.A.moral), mb = g.moralDepois(f, 'b', d.B.moral);
        const fr = f.vence ? ' A frente pode andar ' + g.AVANCO[f.tam] + (g.AVANCO[f.tam] === 1 ? ' hexágono' : ' hexágonos') + ' para o lado de ' + nome(f.vence === 'a' ? 'b' : 'a') + '.' : '';
        exDep = ex(nome('a') + ' perde ' + pct(pr.a || 0) + ' e ' + nome('b') + ' ' + pct(pr.b || 0) + ' do HP de cada unidade (as tropas morrem uma a uma). A moral de ' + nome('a') + ' vai de ' + d.A.moral + ' para ' + ma + '; a de ' + nome('b') + ', de ' + d.B.moral + ' para ' + mb + '.' + fr);
      }
      const P = g.PERDA_PERDEDOR, V = g.PERDA_VENCEDOR, MP = g.MORAL_PERDEDOR || [0, 1, 2, 3, 4], MV = g.MORAL_VENCEDOR || [0, 0, 1, 1, 2], DE = g.DANO_ESTRUTURA || [0, 2, 4, 7, 10];
      out.push(sec('depois', 'Depois da batalha',
        p('"Ver o depois…" mostra o que muda; nada muda no mapa até "Aplicar" (e dá para desfazer).'),
        lista(['As perdas: cada unidade perde a mesma parte do HP dela (a soma do HP das tropas), pelo resultado: as tropas morrem uma a uma, e a que fica ferida conta como viva. A unidade que fica sem tropas sai do exército.',
          'A moral: quem vence pode subir; quem perde cai, mais quanto maior a derrota.',
          'Os mantimentos: um dia de batalha gasta um dia de mantimentos.',
          'A fortificação: as máquinas de cerco de quem ataca sempre batem; se quem ataca vence, batem mais.',
          'A frente: anda para o lado de quem perdeu, perto da batalha (você escolhe quanto).',
          'O hexágono da batalha pode ficar destruído ou corrompido (você escolhe).',
          'Os heróis podem sair feridos (veja Os heróis).']),
        exDep,
        conta('Quem perde perde ' + P.slice(1).map(pct).join(', ') + ' (da apertada à esmagadora); quem vence, ' + V.slice(1).map(pct).join(', ') + '. Empate: ' + pct(P[0]) + ' cada; recuo: 10% quem recua e 3% o outro; rendição: 35% e 2%; trégua: 3% cada.',
          'Moral de quem perde: −' + MP.slice(1).join(', −') + '; de quem vence: +' + MV.slice(1).join(', +') + '. Recuo: −1 para quem recua; rendição: −3 para quem se rende e +1 para o outro.',
          'Dano na fortificação: as máquinas de cerco de quem ataca; se ele vence, o dobro delas + ' + DE.slice(1).join(', ') + ' pelo tamanho da vitória.',
          'A frente anda ' + g.AVANCO.slice(1).join(', ') + ' hexágonos, da apertada à esmagadora.')));
    }

    // 6. os heróis
    {
      const hs = q => d.herois[q] || [];
      const txt = q => (hs(q).length ? hs(q).map(x => x.nome + ' ' + sinal(x.v)).join(', ') : 'nenhum');
      out.push(sec('herois', 'Os heróis',
        p('Os heróis são personagens com ficha (os do grupo, NPCs) que lutam junto: os do exército (no painel do exército) e os que você põe só nesta batalha.'),
        lista(['O bônus de cada um vem da ficha (o nível e o maior atributo); você pode escrever outro. Os de um lado somam até +10, na Virada (e na resumida).',
          'A ação heroica: num momento-chave, um herói rola um atributo da ficha contra a dificuldade — passou, +5; pelo dobro, +10; falhou, −2.',
          'Os ferimentos: depois da batalha, cada herói perde HP na ficha — quem perde, de 10% a 40% do HP máximo, pelo tamanho da derrota; quem vence, até 10%; empate ou trégua, 5%. Dá para não ferir (no depois).']),
        ex(nome('a') + ': ' + txt('a') + '; ' + nome('b') + ': ' + txt('b') + '.'),
        conta('Bônus sugerido = a média de dois números: o nível ÷ 5 (até 10) e o maior atributo ÷ 13 (até 10), arredondada.')));
    }
    return out;
  }

  window.MundoGuerraAjuda = { SECOES, BONUS, NOME_B, ondeMora, montar };
})();
