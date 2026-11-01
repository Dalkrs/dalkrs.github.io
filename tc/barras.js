/* =======================================================================
   TC.barras — as barras de raça, classe e linhagem (lote 34) — e a Toxicidade da Yanato (lote 55: a escola que tem
   barra, a do cinto de poções; ESCOLAS_COM_BARRA).

   Elas são barras comuns da ficha (recursos, como o HP e o SP), não barras especiais: a árvore de raça, de classe ou
   de linhagem cria a barra dela na ficha quando entra (equipar a raça, a classe; o mestre dar a Linhagem). O mestre
   define a barra na própria árvore, na Oficina (a.barraDef); sem isso, vale o guia de barras de 28/10 (PADRAO, pelo id
   da árvore — o nome pode mudar); sem os dois, o que o texto da árvore diz ("Fúria (barra): máximo 10; começa em 0.").

     navegador   <script src="tc/barras.js"></script> (junto de tc/rules.js) → window.TC.barras
     Node        const B = require('./tc/barras.js')

   A barra de uma árvore (defDaArvore devolve sempre assim, ou null):
     { nome, min (0 ou negativo: até onde desce), max, inicio (onde começa o combate; null: não mexe), comb ('inicio':
       ao começar o combate vai para o início; 'fica': o combate não mexe nela — a Fome do Vampiro; 'pergunta': o mestre
       diz onde começa — a Barra Bestial do Licantropo), fim, teto, enche, obs (textos do guia), cat ('raca' | 'classe'
       | 'linhagem'), de: 'arvore' | 'guia' | 'texto' }
   Na ficha, a barra vira um recurso: { id, nome, fml: '<max>', comeca: '<inicio>', piso?: '<−min>', arvs: [ids das
   árvores], cat, comb }. Duas árvores com a barra de mesmo nome dividem uma (as três Oradoras: as Palavras); o início,
   aí, é o maior. Os nós podem somar ao início ("+1/+2/+4 de Calor inicial": TC.rules.inicioDoGrau), e o início nunca
   passa de 10 (TC.rules.TETO_INICIO) — a barra que já começa acima disso (os Membros do Mãzier'na, 20) fica como é.
   ======================================================================= */
(function (root) {
  'use strict';
  const CATS = Object.freeze(['raca', 'classe', 'linhagem']);
  const NOME_CAT = Object.freeze({ raca: 'raça', classe: 'classe', linhagem: 'linhagem', escola: 'escola' });
  // (lote 55) as escolas que criam barra (as outras não criam): a Yanato, a Toxicidade do cinto de poções
  const ESCOLAS_COM_BARRA = Object.freeze(['a5ufrdl1er']);
  // a ordem das barras na ficha: raça → classe → linhagem → escola
  const ORDEM = Object.freeze(CATS.concat('escola'));
  const COMBS = Object.freeze(['inicio', 'fica', 'pergunta']);
  // as árvores que não criam barra mesmo sendo de outra categoria (a Bênção de Selene usa a Geada da Kitsune Selene)
  const SEM_BARRA = Object.freeze(['aq0onsk37x', 'arcjszyt59']);
  // as fases da noite que o mestre escolhe para a Barra Bestial (o início): "Dia" é sem barra (fica em 0)
  const FASES = Object.freeze([{ k: 'dia', n: 'Dia', v: 0, semBonus: true }, { k: '0', n: '0', v: 0 }, { k: '5', n: '5', v: 5 }, { k: '10', n: '10', v: 10 }, { k: '15', n: '15 (lua cheia)', v: 15, semBonus: true }]);
  /* O guia de barras (28/10), pelo id da árvore. */
  const PADRAO = {
    "aaj23w9sif": {"nome": "Calor da Forja", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 golpe com arma própria; +1 bloqueio/aparada com escudo ou armadura próprios; +2 consertar/aprimorar equipamento na luta"}, // Anão da Forja
    "angbo2nlfl": {"nome": "Veio", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 resistir a empurrão/derrubada/prisão; +1 golpe sem sair da cédula; +1 por habilidade do ramo Pedra; +1 no 1º ganho da rodada em terreno de pedra", "obs": "Perde 2 ao ser empurrado, puxado ou arrastado"}, // Anão da Rocha
    "a8rlqfeak2": {"nome": "Barganha", "min": 0, "max": 20, "inicio": 6, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 por Truque (1x/rodada); +1 trocar ou emprestar item com aliado; +1 quando um Truque faz o inimigo perder ação ou reação"}, // Anão Mercador
    "av03t4oglm": {"nome": "Corrente", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 terminar o movimento no alto ou no ar; +1 mergulho sobre um alvo; +1 por Rajada"}, // Antro Aviário
    "an3234zua9": {"nome": "Carga", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 golpe com arma grande; +1 levantar/carregar alguém ou objeto grande (1x/turno); +2 arremessar inimigo; +1 aguentar golpe de 20%+ do HP"}, // Antro Bovino
    "ay0wracl0f": {"nome": "Faro", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 marcar inimigo; +1 achar algo escondido; +1 em duelo, acertar o Marcado ou ele errar"}, // Antro Canino
    "aqimzbe980": {"nome": "Ímpeto", "min": 0, "max": 20, "inicio": 4, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "Investida (3+ cédulas em linha e atacar/empurrar): +1 (+2 se andou 6+); +1 se deixar Caído", "obs": "Perde 3 se terminar o turno tendo andado menos de 2 cédulas"}, // Antro Equino
    "a438cnd1ok": {"nome": "Astúcia", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 esquivar; +1 roubar/desarmar/trocar item sem ser visto; +1 manobra acrobática"}, // Antro Felino
    "a2tw2rzi61": {"nome": "Esperteza", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 por item usado; +1 por inimigo que falha contra frasco dele; +1 esquivar"}, // Antro Roedor
    "a8vs3ucivi": {"nome": "Membros", "min": 0, "max": 20, "inicio": 20, "comb": "inicio", "fim": "volta a 20, menos 4 por parte média e 8 por parte grande que falte", "teto": "5 (2 por ação; devorar fora do teto por ação)", "enche": "Começa cheia e DESCE: cada habilidade gasta partes do corpo; devorar devolve 4", "obs": "Barra que desce: o 'cheio' é o normal"}, // Ghoul Mãzier'na
    "a6u9yzd4xi": {"nome": "Contágio", "min": 0, "max": 20, "inicio": 4, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "No começo do turno, +1 por condição negativa nele (máx. +3); +1 aplicar praga nova", "obs": "Perde 2 por condição que cura/purificação tirar dele"}, // Ghoul Necrosado
    "agw5w9xxpr": {"nome": "Fome", "min": 0, "max": 20, "inicio": 4, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 mordida que acerta; +2 engolir habilidade; +2 devorar de verdade", "obs": "Com 12+ anda 1 a menos; 16+ Lento; 20 sem reação e −2 em tudo"}, // Ghoul Panso'na
    "a4zodzwwhi": {"nome": "Força das Sombras", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+2 ataque furtivo que acerta; +1 deixar inimigo com condição negativa; +1 começar o turno Oculto", "obs": "Luz forte tira 2 no começo do turno"}, // Humano Ayto
    "aohh40xs89": {"nome": "Engenho", "min": 0, "max": 20, "inicio": 6, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 cada ação de tipo diferente da anterior"}, // Humano Espenas
    "ai8t15wy5m": {"nome": "Gelo Firme", "min": 0, "max": 20, "inicio": 6, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 proteger aliado; +1 defesa com sucesso; +1 sofrer golpe de 20%+ do HP"}, // Humano Natuphas
    "a09cgc4afv": {"nome": "Ressonância", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 alternar golpe e magia da árvore; +1 a mais se as duas acertaram"}, // Humano Sarep
    "avubcjih3z": {"nome": "Brasa", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 causar dano com golpe; +1 sofrer dano", "obs": "Perde 3 se terminar o turno sem atacar nem ser atacado; zera se recuar ou fugir"}, // Humano Vas
    "axxkqof2k8": {"nome": "Sombras de Razier", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5", "enche": "+1 começar o turno Oculta; +2 acertar em brecha (1x/rodada); +3 derrubar sem ser vista", "obs": "Não enche se vista por inimigo a até 3 cédulas fora de Oculta"}, // Kitsune Ayto
    "a3wu21kjf6": {"nome": "Noite Escura", "min": 0, "max": 20, "inicio": 4, "comb": "inicio", "fim": "volta ao início", "teto": "5", "enche": "+2 inimigo cai num engano; +1 atacar/agir contra ilusão dela; +1 falhar em teste contra ela"}, // Kitsune Hayune
    "atrwp3vplm": {"nome": "Compasso", "min": -10, "max": 10, "inicio": 0, "comb": "inicio", "fim": "volta a 0", "teto": "—", "enche": "Balança, não enche: posturas de Giro empurram para +, de Passos para −, Fôlego puxa de volta a 0", "obs": "Eixo −3 a +3 (bônus); Beira 8 ou 9 (−4); Queda em 10 (cai a postura e volta a 5 do mesmo lado)"}, // Kitsune Karê - Dançarina
    "aijv2xkz3l": {"nome": "Palavras", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5 (ganhos extras +1/rodada)", "enche": "+1 por palavra depois da primeira; +2 pelo Amém", "obs": "Barra compartilhada pelas 3 Oradoras: o início não soma (vale o maior)"}, // Kitsune Karê - Oradora · Paciência
    "a24nmazt4x": {"nome": "Palavras", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5 (ganhos extras +1/rodada)", "enche": "+1 por palavra depois da primeira; +2 pelo Amém", "obs": "Mesma barra das outras Oradoras"}, // Kitsune Karê - Oradora · Rast
    "a0j41dk16b": {"nome": "Palavras", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5 (ganhos extras +1/rodada)", "enche": "+1 por palavra depois da primeira; +2 pelo Amém", "obs": "Mesma barra das outras Oradoras"}, // Kitsune Karê - Oradora · Ventania
    "abn117rgrd": {"nome": "Foco Espiritual", "min": 0, "max": 20, "inicio": 3, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 por sensação provocada ou tirada de aliado (+2 em chefe)"}, // Kitsune Lótus
    "anc7t74pn8": {"nome": "Dança Crescente", "min": 0, "max": 20, "inicio": 2, "comb": "inicio", "fim": "volta ao início", "teto": "5", "enche": "Numa postura de Merunê, +1 por condição da postura cumprida (+2 as marcadas), 1x/rodada cada", "obs": "Postura quebrada: perde metade; laço quebrado: perde 3"}, // Kitsune Merunê
    "abivun83nh": {"nome": "Mãe Natureza", "min": 0, "max": 20, "inicio": 4, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 curar ou proteger aliado (+2 se ele estava abaixo da metade); +1 por rodada em ambiente natural", "obs": "Em cidade ou lugar corrompido, ganha metade"}, // Kitsune Nirus
    "atehaqx1sg": {"nome": "Geada de Selene", "min": 0, "max": 20, "inicio": 4, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 no fim do turno em que lutou com calma; +1 ao deixar inimigo Congelado", "obs": "Também usada pela Bênção de Selene (aq0onsk37x); o nó Lua Cheia da Bênção sobe o máximo (+2/+4)"}, // Kitsune Selene
    "at5llfbjwm": {"nome": "Voz Manipuladora", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 por oração; +1 por sentença", "obs": "Zera se desobedecer o deus ou um Mandado"}, // Konaitos
    "a6uy0qcbys": {"nome": "Favor Espiritual", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "Oferendas, uma de cada por rodada: item +2, vida (10% HP) +2, inimigo derrotado perto +2"}, // Orc Magi'Ritu
    "aes6lsap36": {"nome": "Permafrost", "min": 0, "max": 20, "inicio": 6, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 sofrer dano e ficar no lugar; +1 resistir a empurrão/derrubada/prisão; +1 retaliação que acerta"}, // Orc Natuphas
    "awbw94n05o": {"nome": "Frenesi", "min": 0, "max": 20, "inicio": 6, "comb": "inicio", "fim": "volta ao início", "teto": "6 (sem teto por ação)", "enche": "+1 por golpe dado (acertando ou não) e por golpe sofrido", "obs": "NPC (não jogável). Em 20: Descontrole por 2 rodadas e depois cai para 10"}, // Orc Rastoroni
    "a2vms52foj": {"nome": "Fúria", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+2 derrubar inimigo; +1 grito (1x/rodada); +1 golpe com aliado adjacente a ele ou ao alvo", "obs": "Sem aliado a até 3 cédulas, golpes não rendem"}, // Orc Vas
    "a847813eqe": {"nome": "Trama", "min": 0, "max": 20, "inicio": 6, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 conjurar magia; +1 resistir ou anular magia inimiga; +1 sofrer rebote"}, // Silk
    "aiwzp5pvi4": {"nome": "Desgaste", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 criar Terra Morta numa cédula nova (1x por habilidade); +1 sugar vida de terreno vivo"}, // Taekeir Magi'atach
    "avi6wkp0m9": {"nome": "Maré", "min": 0, "max": 20, "inicio": 6, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 por canto; +1 no começo do turno na água ou a até 2 cédulas dela", "obs": "Rodada ímpar (Enchente) começa com +2; rodada par (Vazante) com −2"}, // Taekeir Marítimo
    "a2fjc1iqaf": {"nome": "Essência", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 acertar a presa Marcada; +1 armadilha dele dispara; +2 colher de criatura abatida", "obs": "Usa também o item Ingredientes (até 6)"}, // Taekeir Nistus'atach
    "abtaqznjap": {"nome": "Sangue", "min": 0, "max": 20, "inicio": 5, "comb": "inicio", "fim": "volta ao início", "teto": "5 (2 por ação)", "enche": "+1 deixar inimigo Sangrando ou feri-lo com habilidade de sangue; +2 se ferir de propósito (10% HP, 1x/rodada); +1 inimigo com Marca de Sangue sofre dano de aliado"}, // Taekeir Zier'Asurper
    "atohfasuni": {"nome": "Égide", "min": 0, "max": 20, "inicio": 0, "comb": "inicio", "fim": "zera", "teto": "5", "enche": "No começo do turno: +2 juramento de pé e aliado a até 2 cédulas; +1 por proteger aliado; +1 cumprir o pedido do juramento", "obs": "Quebrar o juramento zera"}, // Aégis
    "adoo8p4p2n": {"nome": "Mira", "min": 0, "max": 20, "inicio": 0, "comb": "inicio", "fim": "zera", "teto": "5", "enche": "No começo do turno: +2 se não andou no turno anterior; +1 por crítico; +1 por tiro que acertou a 6+ cédulas", "obs": "Flechas especiais são munição (item)"}, // Arqueiro
    "aasemzgk9a": {"nome": "Ira", "min": 0, "max": 20, "inicio": 0, "comb": "inicio", "fim": "zera", "teto": "5", "enche": "No começo do turno: +2 se acertou golpe ou sofreu dano; +1 golpe de Risco que acertou; +1 inimigo caído a até 2 cédulas; +1 ferida aberta"}, // Bárbaro
    "ax7d6o6jfd": {"nome": "Palco", "min": 0, "max": 20, "inicio": 0, "comb": "inicio", "fim": "zera", "teto": "5 (2 por ação)", "enche": "No começo do turno: +2 se se apresentou; +1 por acontecimento (Floreios rendem +1)"}, // Bardo
    "aej0y5ctxn": {"nome": "Dreno", "min": 0, "max": 20, "inicio": 0, "comb": "inicio", "fim": "zera", "teto": "5", "enche": "No começo do turno: +2 se drenou um componente; +1 por magia de nulificação que pegou", "obs": "Usa também Componentes (itens) e Sanidade 0–100 (controlada pelo mestre)"}, // Bruxo
    "aaev0tstw0": {"nome": "Guarda", "min": 0, "max": 20, "inicio": 0, "comb": "inicio", "fim": "zera", "teto": "5", "enche": "No começo do turno: +2 se terminou o turno em guarda; +1 por bloqueio/aparada com sucesso; +1 por guarda inimiga quebrada", "obs": "Perde 1 na hora por golpe que passa"}, // Espadachim
    "azmmfke45i": {"nome": "Dívida", "min": 0, "max": 20, "inicio": 0, "comb": "inicio", "fim": "zera", "teto": "5", "enche": "No começo do turno: +2 com pacto ativo; +1 por preço pago; +1 se cumpriu a Exigência", "obs": "Zera ao trocar de pacto ou ficar Inconsciente"}, // Feiticeiro
    "ae54tu1fze": {"nome": "Preparo", "min": 0, "max": 20, "inicio": 0, "comb": "inicio", "fim": "zera", "teto": "6", "enche": "No começo do turno +3; preparar com o movimento +1, com a ação inteira +3 (Concentrando)", "obs": "Dano Concentrando: teste de CAN ou perde metade"}, // Mago
    "aepre92qit": {"nome": "Qi", "min": 0, "max": 20, "inicio": 0, "comb": "inicio", "fim": "zera", "teto": "5", "enche": "No começo do turno: +2 em postura de monge; +1 por golpe desarmado que acertou; +1 por esquiva/aparada com sucesso"}, // Monge
    "a9mhyqvyl5": {"nome": "Graça", "min": 0, "max": 20, "inicio": 0, "comb": "inicio", "fim": "zera", "teto": "5", "enche": "No começo do turno: +2 se curou, protegeu ou rezou; +1 por condição tirada de aliado; +1 se feriu força Ayto"}, // Sacerdote
    "azavpm5qd8": {"nome": "Postura", "min": 0, "max": 20, "inicio": 0, "comb": "inicio", "fim": "zera", "teto": "5", "enche": "No começo do turno: +2 numa postura de samurai; +1 pelo que a família pediu; +1 pelo que a postura pediu", "obs": "A postura cai se a barra chega a 0"}, // Samurai
    "abuxa4zrpg": {"nome": "Malícia", "min": 0, "max": 20, "inicio": 0, "comb": "inicio", "fim": "zera", "teto": "5", "enche": "No começo do turno: +2 se terminou Oculto ou ninguém o atacou; +1 por furto, ataque sigiloso que acertou ou truque que pegou", "obs": "Com armadura pesada ou escudo grande não enche"}, // Shaji
    "ayfvz27k70": {"nome": "Fome", "min": 0, "max": 20, "inicio": null, "comb": "fica", "fim": "fica (não volta: é o estado do vampiro)", "teto": "5 (ao se alimentar)", "enche": "Alimentar-se: mordida +3, frasco +3, servo +3, aliado que aceita +5", "obs": "Fora de combate cai 3 por dia sem comer. Estágios: Sedento 0–4, Faminto 5–9, Alimentado 10–14, Saciado 15–20"}, // Vampiro
    "a5ufrdl1er": {"nome": "Toxicidade", "min": 0, "max": 20, "inicio": 0, "comb": "fica", "fim": "fica; zera no descanso longo", "teto": "—", "enche": "Cada poção do cinto soma a toxicidade dela; −1 no começo de cada turno", "obs": "10+ Enjoado (−2 em ataque e esquiva); 15+ Intoxicado (−2 em tudo, −5% do HP por turno); 20: o corpo cede (Atordoado, depois cai para 15)"}, // Yanato (escola: o cinto de poções)
    "a7va7rq14q": {"nome": "Barra Bestial", "min": 0, "max": 20, "inicio": 0, "comb": "pergunta", "fim": "some (só existe à noite, no combate)", "teto": "5 (6 com vampiro a até 6 cédulas; habilidades +N fora do teto)", "enche": "No começo do turno: +1 golpe brutal dado; +1 golpe sofrido; +1 presa que fugiu ou sangue jorrando", "obs": "Só à noite. Início: 0 (lua cheia 15; outras fases o mestre diz 0, 5 ou 10). Patamares 5 Desperto, 10 Garras, 15 Fera; 20 = Fera Solta. Comer baixa 5"}, // Licantropo
  };
  Object.keys(PADRAO).forEach(k => Object.freeze(PADRAO[k]));
  Object.freeze(PADRAO);

  const R = () => (root.TC && root.TC.rules) || (typeof require === 'function' ? require('./rules.js') : null);
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const inteiro = (v, a, b) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : null; };
  const texto = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
  function normNome(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }

  /* A barra arrumada (o que o mestre digitou na Oficina, ou o guia): → { nome, min, max, inicio, comb, fim, teto, enche,
     obs } ou null (sem nome). { nenhuma: true } — a árvore não cria barra — volta assim. */
  function limpar(x) {
    if (!ehObj(x)) return null;
    if (x.nenhuma) return { nenhuma: true };
    const nome = texto(x.nome, 30);
    if (!nome) return null;
    let max = inteiro(x.max, 1, 999); if (max == null) max = 20;
    let min = inteiro(x.min, -999, 0); if (min == null) min = 0;
    const ini = x.inicio === '' || x.inicio == null ? null : inteiro(x.inicio, min, max);
    const comb = COMBS.includes(x.comb) ? x.comb : (ini == null ? 'fica' : 'inicio');
    const o = { nome, min, max, inicio: ini, comb };
    for (const k of ['fim', 'teto']) o[k] = texto(x[k], 120);
    for (const k of ['enche', 'obs']) o[k] = texto(x[k], 400);
    return o;
  }
  /* O que o texto da árvore diz (o jeito de antes, do lote 28): "Compasso: uma balança de −10 a +10 que começa em 0" vale
     de −10 a 10. Sem o máximo no texto, 20 (o tamanho de quase todas). */
  function doTexto(a) {
    const Rr = R(), d = Rr && Rr.defBarraEspecial ? Rr.defBarraEspecial(a) : null;
    if (!d) return null;
    let min = 0, max = d.max;
    const fx = /([−-]?\d{1,3})\s+a\s+\+?(\d{1,3})/.exec(String(d.faixa || ''));
    if (max == null && fx) { min = Math.min(0, Number(fx[1].replace('−', '-'))); max = Number(fx[2]); }
    if (max == null) max = 20;
    let ini = d.inicio;
    if (ini == null) { const t = /come[çc]a\s+(?:em|com)\s+([−-]?\d{1,3})/i.exec(textoDaArvore(a)); if (t) ini = Number(t[1].replace('−', '-')); }
    if (ini == null) ini = a.categoria === 'classe' ? 0 : null;
    return limpar({ nome: d.nome, min, max, inicio: ini });
  }
  const textoDaArvore = a => ((a && a.nodes) || []).slice(0, 4).map(n => (n && n.desc) || '').join('\n');
  const barraDaArvore = a => !!a && (CATS.includes(a.categoria) || (a.categoria === 'escola' && ESCOLAS_COM_BARRA.includes(a.id))) && !SEM_BARRA.includes(a.id);
  /* A barra que a árvore cria na ficha, ou null (a árvore não é de raça, classe ou linhagem; ou o mestre disse que ela
     não cria barra; ou não há o que ler). */
  function defDaArvore(a) {
    if (!barraDaArvore(a)) return null;
    let d = null, de = null;
    if (ehObj(a.barraDef)) { d = limpar(a.barraDef); de = 'arvore'; if (d && d.nenhuma) return null; }
    if (!d && PADRAO[a.id]) { d = limpar(PADRAO[a.id]); de = 'guia'; }
    if (!d) { d = doTexto(a); de = 'texto'; }
    return d ? Object.assign(d, { cat: a.categoria, de }) : null;
  }
  // o guia para esta árvore (o que a Oficina mostra antes de o mestre mexer), ou null
  const doGuia = a => (a && PADRAO[a.id] ? limpar(PADRAO[a.id]) : null);

  /* As barras que as árvores equipadas criam: [{ nome, min, max, inicio, comb, cat, arvs: [ids], defs: [{ a, d }] }], na
     ordem raça → classe → linhagem (e, em cada uma, a ordem das árvores equipadas). Barras de mesmo nome viram uma só
     (o início é o maior; a faixa, a mais larga). arvPorId: id → árvore. */
  function doPersonagem(equipadas, arvPorId) {
    const out = [];
    for (const id of (Array.isArray(equipadas) ? equipadas : [])) {
      const a = typeof id === 'string' ? arvPorId(id) : null, d = a ? defDaArvore(a) : null;
      if (!d) continue;
      const igual = out.find(x => normNome(x.nome) === normNome(d.nome));
      if (igual) {
        if (!igual.arvs.includes(a.id)) igual.arvs.push(a.id);
        igual.defs.push({ a, d });
        igual.max = Math.max(igual.max, d.max); igual.min = Math.min(igual.min, d.min);
        if (d.inicio != null) igual.inicio = igual.inicio == null ? d.inicio : Math.max(igual.inicio, d.inicio);
        continue;
      }
      out.push({ nome: d.nome, min: d.min, max: d.max, inicio: d.inicio, comb: d.comb, cat: d.cat, arvs: [a.id], defs: [{ a, d }] });
    }
    return out.sort((x, y) => ORDEM.indexOf(x.cat) - ORDEM.indexOf(y.cat));
  }
  // o recurso da ficha para uma barra (de doPersonagem); id: o id que ele vai ter
  function recurso(b, id) {
    const r = { id, nome: b.nome, fml: String(b.max), comeca: b.inicio == null ? '' : String(b.inicio), arvs: b.arvs.slice(), cat: b.cat, comb: b.comb };
    if (b.min < 0) r.piso = String(-b.min);
    return r;
  }
  // o recurso é uma barra de árvore (de raça, classe ou linhagem)?
  const ehDeArvore = r => !!r && Array.isArray(r.arvs) && r.arvs.length > 0;
  /* Os recursos em ordem: o HP e o SP primeiro, logo depois as barras das árvores (raça → classe → linhagem), depois o
     resto, como estava. → uma lista nova (o mesmo objeto de cada recurso). */
  function ordenar(recursos) {
    const l = Array.isArray(recursos) ? recursos.slice() : [];
    const arv = l.filter(ehDeArvore).sort((x, y) => ORDEM.indexOf(x.cat) - ORDEM.indexOf(y.cat)), resto = l.filter(r => !ehDeArvore(r));
    let p = 0;
    resto.forEach((r, i) => { const n = normNome(r && r.nome); if (n === 'hp' || n === 'sp') p = i + 1; });
    return resto.slice(0, p).concat(arv, resto.slice(p));
  }
  // "0 a 20, começa em 5" / "−10 a 10, começa em 0" / "0 a 20 (o combate não mexe)"
  function faixaTexto(b) {
    const f = (b.min < 0 ? '−' + Math.abs(b.min) : String(b.min)) + ' a ' + b.max;
    if (b.comb === 'fica') return f + ', o combate não mexe nela';
    if (b.comb === 'pergunta') return f + ', o mestre diz onde começa';
    return b.inicio == null ? f : f + ', começa em ' + (b.inicio < 0 ? '−' + Math.abs(b.inicio) : b.inicio);
  }

  const api = { CATS, NOME_CAT, ESCOLAS_COM_BARRA, ORDEM, COMBS, SEM_BARRA, FASES, PADRAO, limpar, doTexto, doGuia, defDaArvore, barraDaArvore, doPersonagem, recurso, ehDeArvore, ordenar, faixaTexto, normNome };
  (root.TC || (root.TC = {})).barras = api;
  if (typeof window !== 'undefined' && window && window !== root) (window.TC || (window.TC = root.TC)).barras = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
