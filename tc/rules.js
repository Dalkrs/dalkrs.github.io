/* =======================================================================
   TC.rules — regras de personagem de Urgm (atributos, fórmulas, recursos)

   Sem DOM, sem dependências, sem build. Script clássico:
     navegador   <script src="tc/rules.js"></script>    → window.TC.rules
     Node        const rules = require('./tc/rules.js')   (e também TC.rules)

   O miolo veio da Calculadora de Atributos (src/legado/calculadora-urgm.html)
   sem mudar o comportamento: os blocos marcados "da calculadora" são o código
   de lá, só que a configuração chega por parâmetro em vez de sair do S.cfg
   global. Com `extra` vazio, calcular(pc, cfg) devolve o mesmo que o
   calcular(pc) original em todos os campos que ele tinha —
   src/tests/rules.test.js confere isso contra o arquivo legado.

   Formatos
     pc      a ficha como a calculadora salva (ver personagemPadrao), mais
             ini: fórmula da iniciativa
             modoAtr: 'livre' + atrLivre:{FOR,DES,VIT,CAN,AGI} — ficha de jogador, que
             distribui os próprios pontos em vez de seguir tiers e percentuais
     cfg     { niveis:[{lvl,pts}], tiersPersonagem:[{t,m}], pct:{A..E},
               arredondar:'floor'|'round'|'ceil'|'none' }  (ver cfgPadrao;
             se faltar, vale o padrão)
     extra   { arvore:{ FOR:2, HP:10, ... } } — o que os nódulos alocados da
             árvore somam (sai de bonusDaArvore). Chave que é uma das
             CHAVES_BONUS soma no atributo; qualquer outra é nome de recurso.
     estado  { rec:{ [idDoRecurso]: valorAtual } } — faltando = no valor inicial
             da barra (cheia, se ela não tem "começa em")
             sob:{ [idDoRecurso]: sobrevida } — pontos por cima do recurso, que
             absorvem o dano antes dele (faltando = nenhuma)
             tmp:{ [id]: { n: nome, k: chave, v: valor, d: duração (texto), off, t } }
             — bônus temporários (comida, poção): somam enquanto não estão desligados
             qtd:{ [idDoItemDaBolsa]: quantidade } — faltando = 0

   O que entrou depois (nada disto muda as contas de quem não usa):
     recurso   comeca: onde a barra começa e para onde volta ao "encher" e no
               descanso longo (número ou fórmula; MAX = o máximo da barra);
               piso: até quanto abaixo de zero ela pode ir (número ou fórmula)
     item      rec:{ [idDoRecurso]: n } soma no máximo da barra; def:{ FOGO: n }
               soma numa das defesas específicas
     pc        defEsp:{ FOGO: n, ... } a base digitada das 13 defesas específicas;
               bolsa:[{ id, t:'pocao'|'bomba'|'runa'|'municao'|'material', nome,
               nota, e nas poções: rec (id da barra), val ("30", "-10", "2d6+3"),
               bk/bv/bd (bônus temporário: chave, valor, duração) }]
     extra     temp: o estado.tmp do personagem (resumo() passa sozinho)

   E depois ainda (relacionamentos com romance, ferimentos e missões):
     estado    rels:{ [id]: { alvo, nome, v, rom, oc, o } } — o que o personagem sente por cada um:
               v de −100 a +100; rom, a trilha de romance, de −10 (dez corações partidos) a +10 (dez
               cheios), ausente = sem trilha; oc: o valor está escondido do jogador (aí v e rom não
               ficam aqui: ficam com o mestre); o: a ordem na lista. O formato antigo, a lista
               rel:[{ id, alvo, nome, v }], continua sendo lido.
               fer:{ [id]: { p: parte do corpo, t: tipo, g: gravidade 1–3, s:{ sg, en, su, ta, inf },
               n: nota, k/v: penalidade (chave e valor, sempre ≤ 0), c: quando } } — ferimentos
               abertos; a penalidade soma como um bônus temporário enquanto o ferimento existir
               mis:{ [id]: missão } — as missões do personagem (ver missoes)
               xp:{ v, min, max } — a barra de XP: sem mínimo guardado, 0; sem máximo guardado,
               10 por nível. O XP não fica abaixo do mínimo, mas pode passar do máximo (ver xpDe)
     extra     fer: o estado.fer do personagem (resumo() passa sozinho)
     seg       o que o mestre guarda de um personagem, fora da ficha (documento só dele):
               { [idDaLinha]: { v, rom } } para a linha de valor escondido, ou a linha inteira
               { l: 1, alvo, nome, v, rom, o } quando ela nem aparece na ficha (é o caso dos NPCs)
   ======================================================================= */
(function (root) {
  'use strict';

  /* ---------- atributos do sistema (da calculadora) ---------- */
  const ATRIBS = [
    {k:'FOR', nome:'Força',             aliases:['FORCA','FORÇA']},
    {k:'DES', nome:'Destreza',          aliases:['DESTREZA']},
    {k:'VIT', nome:'Vitalidade',        aliases:['VITALIDADE']},
    {k:'CAN', nome:'Canalização Mágica',aliases:['CANALIZACAO','CANALIZAÇÃO','CM','MAG']},
    {k:'AGI', nome:'Agilidade',         aliases:['AGILIDADE']},
  ];
  /* Derivados: não recebem pontos. Somam atributos BASE (sem equipamento) mais o
     campo especial do próprio derivado nos equipamentos. Metades arredondam pra baixo. */
  const DERIV = [
    {k:'ESQ', nome:'Esquiva',     desc:'AGI',           calc:b=>b.AGI,
     aliases:['ESQUIVA']},
    {k:'FUR', nome:'Furtividade', desc:'AGI + DES/2',   calc:b=>b.AGI+Math.floor(b.DES/2),
     aliases:['FURTIVIDADE']},
    {k:'PER', nome:'Percepção',   desc:'DES + CAN/2',   calc:b=>b.DES+Math.floor(b.CAN/2),
     aliases:['PERCEPCAO','PERCEPÇÃO']},
    // o Embate (lote 6): a metade da Vitalidade base, para baixo, mais o Bloqueio inteiro (o valor próprio, os itens,
    // a árvore e os bônus dele) — `d` são as defesas já calculadas
    {k:'EMB', nome:'Embate',      desc:'VIT/2 + BLOQ',  calc:(b,d)=>Math.floor(b.VIT/2)+((d&&d.BLQ)||0),
     aliases:['EMBATE']},
  ];
  const ehDerivado = k => DERIV.some(d=>d.k===k);
  /* Defesas: valor manual por personagem (varia por raça) + o que os equipamentos somam.
     Não entram na distribuição de pontos do level. O Bloqueio (lote 5) segue a mesma regra — valor próprio + itens,
     árvore e bônus — e rola como a Esquiva; na ficha, fica junto dos atributos secundários. */
  const DEFESAS = [
    {k:'DFF', nome:'Defesa Física', rot:'DEF F', aliases:['DEFF','DEFESAFISICA']},
    {k:'DFM', nome:'Defesa Mágica', rot:'DEF M', aliases:['DEFM','DEFESAMAGICA']},
    {k:'BLQ', nome:'Bloqueio',      rot:'BLOQ',  aliases:['BLOQUEIO','BLOQ']},
  ];
  const ehDefesa = k => DEFESAS.some(d=>d.k===k);
  const TIERS_ATR = ['A','B','C','D','E'];

  /* Defesas específicas: contra um elemento ou um tipo de golpe. Base digitada na ficha + o que os equipamentos e
     os bônus temporários somam. Ficam à parte das dez chaves: a árvore não as conhece (lá, "Gelo" é nome de barra). */
  const DEFESAS_ESP = [
    {k:'FOGO',   nome:'Fogo',        tipo:'elemento'},
    {k:'AGUA',   nome:'Água',        tipo:'elemento'},
    {k:'PEDRA',  nome:'Pedra',       tipo:'elemento'},
    {k:'GELO',   nome:'Gelo',        tipo:'elemento'},
    {k:'TROVAO', nome:'Trovão',      tipo:'elemento'},
    {k:'PLANTA', nome:'Planta',      tipo:'elemento'},
    {k:'VENTO',  nome:'Vento',       tipo:'elemento'},
    {k:'LUZ',    nome:'Luz',         tipo:'elemento'},
    {k:'SOMBRAS',nome:'Sombras',     tipo:'elemento'},
    {k:'PSI',    nome:'Psicológico', tipo:'mente'},
    {k:'CORTE',  nome:'Corte',       tipo:'golpe'},
    {k:'PERF',   nome:'Perfuração',  tipo:'golpe'},
    {k:'CONT',   nome:'Contusão',    tipo:'golpe'},
  ];
  const CHAVES_ESP = DEFESAS_ESP.map(d => d.k);
  const ehDefesaEsp = k => CHAVES_ESP.indexOf(k) >= 0;
  /* os tipos de item que uma bolsa guarda */
  const BOLSAS = [
    {t:'pocao',    nome:'Poções',    um:'Poção'},
    {t:'bomba',    nome:'Bombas',    um:'Bomba'},
    {t:'runa',     nome:'Runas',     um:'Runa'},
    {t:'municao',  nome:'Munições',  um:'Munição'},
    {t:'material', nome:'Materiais', um:'Material'},
  ];

  /* As condições que um token pode ter (as mesmas das Cenas: o id, o nome e o grupo). Aqui, para a ficha escolher a
     condição que uma poção põe no token. As Cenas conferem que as duas listas batem. */
  const COND_GRUPOS = [
    {id:'dano', n:'Dano e elementos'},
    {id:'controle', n:'Controle'},
    {id:'combate', n:'Combate'},
    {id:'mente', n:'Mente e magia'},
    {id:'corpo', n:'Corpo e sentidos'},
    {id:'ritmo', n:'Ritmo e movimento'},
    {id:'bencao', n:'Bênçãos e cura'},
    {id:'racas', n:'Das raças'},
    {id:'classes', n:'Das classes'}
  ];
  const CONDICOES = [
    // (lote 7: as 20 novas no fim da categoria de cada uma, na mesma ordem das Cenas)
    {id:'veneno', n:'Envenenado', g:'dano'}, {id:'sangue', n:'Sangrando', g:'dano'}, {id:'hemorragia', n:'Hemorragia', g:'dano'},
    {id:'fogo', n:'Queimando', g:'dano'}, {id:'gelo', n:'Congelado', g:'dano'}, {id:'resfriado', n:'Resfriado', g:'dano'},
    {id:'molhado', n:'Molhado', g:'dano'}, {id:'oleo', n:'Óleo', g:'dano'}, {id:'eletrizado', n:'Eletrizado', g:'dano'},
    {id:'corroido', n:'Corroído', g:'dano'}, {id:'enregelado', n:'Enregelado', g:'dano'}, {id:'ventania', n:'Ventania', g:'dano'},
    {id:'atordoado', n:'Atordoado', g:'controle'}, {id:'paralisia', n:'Paralisado', g:'controle'}, {id:'emaranhado', n:'Emaranhado', g:'controle'},
    {id:'agarrado', n:'Agarrado', g:'controle'}, {id:'caido', n:'Caído', g:'controle'}, {id:'inconsciente', n:'Inconsciente', g:'controle'},
    {id:'petrificado', n:'Petrificado', g:'controle'}, {id:'adormecido', n:'Adormecido', g:'controle'}, {id:'enraizado', n:'Enraizado', g:'controle'},
    {id:'furia', n:'Fúria', g:'combate'}, {id:'grito', n:'Grito de Batalha', g:'combate'}, {id:'provocado', n:'Provocado', g:'combate'},
    {id:'defendendo', n:'Defendendo', g:'combate'}, {id:'desarmado', n:'Desarmado', g:'combate'}, {id:'foco', n:'Concentrando', g:'combate'},
    {id:'vulneravel', n:'Vulnerável', g:'combate'}, {id:'determinado', n:'Determinado', g:'combate'}, {id:'medo', n:'Amedrontado', g:'mente'},
    {id:'paranoico', n:'Paranoico', g:'mente'}, {id:'confuso', n:'Confuso', g:'mente'}, {id:'enfeiticado', n:'Enfeitiçado', g:'mente'},
    {id:'silencio', n:'Silenciado', g:'mente'}, {id:'maldicao', n:'Amaldiçoado', g:'mente'}, {id:'marcado', n:'Marcado', g:'mente'},
    {id:'transformado', n:'Transformado', g:'mente'}, {id:'artefato', n:'Artefato Ativado', g:'mente'}, {id:'possuido', n:'Possuído', g:'mente'},
    {id:'refletindo', n:'Refletindo', g:'mente'}, {id:'enlouquecido', n:'Enlouquecido', g:'mente'}, {id:'qibloq', n:'Qi bloqueado', g:'mente'},
    {id:'qidesvio', n:'Desvio de Qi', g:'mente'}, {id:'clone', n:'Clone', g:'mente'}, {id:'duplicado', n:'Duplicado', g:'mente'}, {id:'cego', n:'Cego', g:'corpo'}, {id:'surdo', n:'Surdo', g:'corpo'},
    {id:'fraco', n:'Fraquejado', g:'corpo'}, {id:'exausto', n:'Exausto', g:'corpo'}, {id:'doente', n:'Doente', g:'corpo'},
    {id:'faminto', n:'Faminto', g:'corpo'}, {id:'bebado', n:'Bêbado', g:'corpo'}, {id:'morto', n:'Morto', g:'corpo'},
    {id:'sufocando', n:'Sufocando', g:'corpo'}, {id:'ofuscado', n:'Ofuscado', g:'corpo'}, {id:'agigantado', n:'Agigantado', g:'corpo'},
    {id:'encolhido', n:'Encolhido', g:'corpo'}, {id:'ferida', n:'Ferida permanente', g:'corpo'}, {id:'lento', n:'Lento', g:'ritmo'}, {id:'acelerado', n:'Acelerado', g:'ritmo'},
    {id:'voando', n:'Voando', g:'ritmo'}, {id:'oculto', n:'Oculto', g:'ritmo'}, {id:'invisivel', n:'Invisível', g:'ritmo'},
    {id:'etereo', n:'Etéreo', g:'ritmo'}, {id:'escudo', n:'Protegido', g:'bencao'}, {id:'bencao', n:'Abençoado', g:'bencao'},
    {id:'inspirado', n:'Inspirado', g:'bencao'}, {id:'regen', n:'Regeneração', g:'bencao'}, {id:'tratado', n:'Tratado', g:'bencao'},
    {id:'escudado', n:'Escudado', g:'bencao'},
    // (lote 19) as das raças, num grupo só, em ordem alfabética (as mesmas das Cenas)
    {id:'ancestralEncarnado', n:'Ancestral Encarnado', g:'racas'}, {id:'armaVitrine', n:'Arma de Vitrine', g:'racas'}, {id:'armaRachada', n:'Arma Rachada', g:'racas'},
    {id:'armaduraGelo', n:'Armadura de Gelo', g:'racas'}, {id:'bracoPerdido', n:'Braço Perdido', g:'racas'}, {id:'cargaTrovao', n:'Carga de trovão', g:'racas'},
    {id:'cercado', n:'Cercado', g:'racas'}, {id:'coma', n:'Coma', g:'racas'}, {id:'comprado', n:'Comprado', g:'racas'},
    {id:'contagem', n:'Contagem', g:'racas'}, {id:'costelasAbertas', n:'Costelas Abertas', g:'racas'}, {id:'couracaGelo', n:'Couraça de Gelo', g:'racas'},
    {id:'debaixoTerra', n:'Debaixo da Terra', g:'racas'}, {id:'descontrole', n:'Descontrole', g:'racas'}, {id:'dividaEspiritual', n:'Dívida Espiritual', g:'racas'},
    {id:'domDevorado', n:'Dom Devorado', g:'racas'}, {id:'dor', n:'Dor', g:'racas'}, {id:'emBrasa', n:'Em Brasa', g:'racas'},
    {id:'encanto', n:'Encanto', g:'racas'}, {id:'endurecido', n:'Endurecido', g:'racas'}, {id:'enxertado', n:'Enxertado', g:'racas'},
    {id:'enxerto', n:'Enxerto', g:'racas'}, {id:'erguido', n:'Erguido', g:'racas'}, {id:'exposto', n:'Exposto', g:'racas'},
    {id:'farejado', n:'Farejado', g:'racas'}, {id:'frio', n:'Frio', g:'racas'}, {id:'gosto', n:'Gosto', g:'racas'},
    {id:'guardaNatural', n:'Guarda Natural', g:'racas'}, {id:'habilidadeEngolida', n:'Habilidade Engolida', g:'racas'}, {id:'jurado', n:'Jurado', g:'racas'},
    {id:'laco', n:'Laço', g:'racas'}, {id:'licao', n:'Lição', g:'racas'}, {id:'magiaEngatilhada', n:'Magia Engatilhada', g:'racas'},
    {id:'mandado', n:'Mandado', g:'racas'}, {id:'maoPerdida', n:'Mão Perdida', g:'racas'}, {id:'naPanca', n:'Na Pança', g:'racas'},
    {id:'noOmbro', n:'No Ombro', g:'racas'}, {id:'pePerdido', n:'Pé Perdido', g:'racas'}, {id:'perdido', n:'Perdido', g:'racas'},
    {id:'pernaPerdida', n:'Perna Perdida', g:'racas'}, {id:'praga', n:'Praga', g:'racas'}, {id:'procurado', n:'Procurado', g:'racas'},
    {id:'reboteAdiado', n:'Rebote Adiado', g:'racas'}, {id:'recusaMorte', n:'Recusa da Morte', g:'racas'}, {id:'rendido', n:'Rendido', g:'racas'},
    {id:'seloOcre', n:'Selo de Ocre', g:'racas'}, {id:'semeado', n:'Semeado', g:'racas'}, {id:'sentenca', n:'Sentença', g:'racas'},
    {id:'sobra', n:'Sobra', g:'racas'}, {id:'transeRubro', n:'Transe Rubro', g:'racas'}, {id:'tregua', n:'Trégua', g:'racas'},
    {id:'vinculoSangue', n:'Vínculo de Sangue', g:'racas'}, {id:'vozVolkhum', n:'Voz de Volkhum\'Pansar', g:'racas'},
    // (lote 20) as das classes, num grupo só, em ordem alfabética
    {id:'alvoDuelo', n:'Alvo do Duelo', g:'classes'}, {id:'armaduraRachada', n:'Armadura Rachada', g:'classes'}, {id:'assombrado', n:'Assombrado', g:'classes'},
    {id:'clausula', n:'Cláusula', g:'classes'}, {id:'cobranca', n:'Cobrança', g:'classes'}, {id:'dancando', n:'Dançando', g:'classes'},
    {id:'definhando', n:'Definhando', g:'classes'}, {id:'desguarnecido', n:'Desguarnecido', g:'classes'}, {id:'devedor', n:'Devedor', g:'classes'},
    {id:'eloLuz', n:'Elo de Luz', g:'classes'}, {id:'escudoPlantado', n:'Escudo Plantado', g:'classes'}, {id:'escudoRachado', n:'Escudo Rachado', g:'classes'},
    {id:'extremamenteFerido', n:'Extremamente Ferido', g:'classes'}, {id:'ginga', n:'Ginga', g:'classes'}, {id:'guardaQuebrada', n:'Guarda Quebrada', g:'classes'},
    {id:'levementeFerido', n:'Levemente Ferido', g:'classes'}, {id:'mortalmenteFerido', n:'Mortalmente Ferido', g:'classes'}, {id:'pacto', n:'Pacto', g:'classes'},
    {id:'perjuro', n:'Perjuro', g:'classes'}, {id:'portaAberta', n:'Porta Aberta', g:'classes'}, {id:'seloLushmania', n:'Selo de Lushmânia', g:'classes'},
    {id:'sobEgide', n:'Sob a Égide', g:'classes'}, {id:'sobExorcismo', n:'Sob Exorcismo', g:'classes'}, {id:'tutelado', n:'Tutelado', g:'classes'}
  ];

  /* O corpo, em 12 partes (esquerda e direita são as do personagem), e o que se anota de um ferimento. */
  const PARTES = [
    {k:'cabeca',  nome:'Cabeça'},        {k:'pescoco', nome:'Pescoço'},
    {k:'peito',   nome:'Peito'},         {k:'abdomen', nome:'Abdômen'},
    {k:'bracoE',  nome:'Braço esquerdo'},{k:'bracoD',  nome:'Braço direito'},
    {k:'maoE',    nome:'Mão esquerda'},  {k:'maoD',    nome:'Mão direita'},
    {k:'pernaE',  nome:'Perna esquerda'},{k:'pernaD',  nome:'Perna direita'},
    {k:'peE',     nome:'Pé esquerdo'},   {k:'peD',     nome:'Pé direito'},
  ];
  const TIPOS_FER = [
    {k:'corte', nome:'Corte',      f:false}, {k:'perf',  nome:'Perfuração', f:true},
    {k:'cont',  nome:'Contusão',   f:true},  {k:'queim', nome:'Queimadura', f:true},
    {k:'frat',  nome:'Fratura',    f:true},  {k:'mord',  nome:'Mordida',    f:true},
  ];
  const GRAVIDADES = [{k:1, nome:'Leve', m:'leve', f:'leve'}, {k:2, nome:'Médio', m:'médio', f:'média'}, {k:3, nome:'Grave', m:'grave', f:'grave'}];
  const ESTADOS_FER = [
    {k:'sg',  nome:'Sangrando'}, {k:'en', nome:'Enfaixado'}, {k:'su', nome:'Suturado'},
    {k:'ta',  nome:'Com tala'},  {k:'inf', nome:'Infeccionado'},
  ];
  const ROM_MAX = 10;                       // a trilha de romance vai de −10 a +10
  const MIS_ESTADOS = [{k:'ativa', nome:'Ativa'}, {k:'feita', nome:'Concluída'}, {k:'falhou', nome:'Falhou'}];

  /* as dez chaves que um equipamento (e a árvore) pode somar, e o nome de cada uma */
  const CHAVES_BONUS = [].concat(ATRIBS, DERIV, DEFESAS).map(x => x.k);
  const NOMES = {};
  [].concat(ATRIBS, DERIV, DEFESAS).forEach(x => { NOMES[x.k] = x.nome; });
  /* o nome de qualquer chave que recebe bônus: as dez de sempre e as 13 defesas específicas ("Defesa: Fogo") */
  const NOMES_BONUS = Object.assign({}, NOMES);
  DEFESAS_ESP.forEach(d => { NOMES_BONUS[d.k] = 'Defesa: ' + d.nome; });
  /* "Todos os atributos": uma chave só, que soma nos cinco atributos de uma vez. Vale onde o bônus é escolhido numa
     lista — bônus temporário, poção, penalidade de ferimento. (Não é uma das dez de CHAVES_BONUS: equipamento e
     árvore continuam com um campo por atributo.) */
  const CHAVE_TODOS = 'ATR';
  NOMES_BONUS[CHAVE_TODOS] = 'Todos os atributos';
  // a chave como é guardada, ou '' se não é uma chave de bônus
  const chaveDeBonus = k => (k === CHAVE_TODOS || CHAVES_BONUS.indexOf(k) >= 0 || CHAVES_ESP.indexOf(k) >= 0 ? k : '');
  // soma v onde a chave manda: nas dez (soma), nas 13 específicas (esp), ou nos cinco atributos de uma vez
  const somarBonus = (soma, esp, k, v) => {
    if (k === CHAVE_TODOS) ATRIBS.forEach(a => { soma[a.k] += v; });
    else if (CHAVES_ESP.indexOf(k) >= 0) esp[k] += v;
    else soma[k] += v;
  };

  /* são tabelas compartilhadas por todos os apps: ninguém altera por engano */
  const congelar = o => {
    Object.keys(o).forEach(k => { if (o[k] && typeof o[k] === 'object') congelar(o[k]); });
    return Object.freeze(o);
  };
  [ATRIBS, DERIV, DEFESAS, TIERS_ATR, CHAVES_BONUS, NOMES, DEFESAS_ESP, CHAVES_ESP, BOLSAS, NOMES_BONUS, PARTES, TIPOS_FER, GRAVIDADES, ESTADOS_FER, MIS_ESTADOS, COND_GRUPOS, CONDICOES].forEach(congelar);

  /* ---------- FORMULA ENGINE (parser próprio, sem eval) — da calculadora ---------- */
  /* ##PARSER_START## */
  function tokenize(src){
    const t=[]; let i=0;
    const isD=c=>c>='0'&&c<='9';
    const isA=c=>/[A-Za-zÀ-ÿ_]/.test(c);
    while(i<src.length){
      const c=src[i];
      if(c===' '||c==='\t'||c==='\n'){i++;continue}
      if(isD(c)||(c==='.'&&isD(src[i+1]))){
        let j=i; while(j<src.length&&(isD(src[j])||src[j]==='.'))j++;
        t.push({t:'num',v:parseFloat(src.slice(i,j))}); i=j; continue;
      }
      if(isA(c)){
        let j=i; while(j<src.length&&(isA(src[j])||isD(src[j])))j++;
        t.push({t:'id',v:src.slice(i,j)}); i=j; continue;
      }
      if('><=!'.includes(c)){
        const dois=src.slice(i,i+2);
        if(['>=','<=','==','!='].includes(dois)){t.push({t:'cmp',v:dois});i+=2;continue}
        if(c==='>'||c==='<'){t.push({t:'cmp',v:c});i++;continue}
        if(c==='='){t.push({t:'cmp',v:'=='});i++;continue}
        throw new Error('Use >, <, >=, <=, == ou !=');
      }
      if(';'===c){t.push({t:','});i++;continue}
      if('+-*/%^(),'.includes(c)){t.push({t:c});i++;continue}
      throw new Error('Caractere inválido: "'+c+'"');
    }
    return t;
  }
  const FUNCS={
    min:Math.min, max:Math.max, floor:Math.floor, ceil:Math.ceil,
    round:Math.round, abs:Math.abs, sqrt:Math.sqrt, pow:Math.pow,
    arredondar:Math.round, teto:Math.ceil, piso:Math.floor, raiz:Math.sqrt,
    se:(c,a,b)=>c?a:b
  };
  function evalFormula(src, vars){
    if(src==null||String(src).trim()==='') return null;
    if(vars==null) vars={};          // único acréscimo: sem variáveis, toda variável é desconhecida
    const tk=tokenize(String(src)); let p=0;
    const peek=()=>tk[p], next=()=>tk[p++];
    function comparacao(){
      let v=expr();
      while(peek()&&peek().t==='cmp'){
        const o=next().v, r=expr();
        v = (o==='>'?v>r : o==='<'?v<r : o==='>='?v>=r : o==='<='?v<=r : o==='=='?v===r : v!==r) ? 1 : 0;
      }
      return v;
    }
    function expr(){
      let v=term();
      while(peek()&&(peek().t==='+'||peek().t==='-')){ const o=next().t; const r=term(); v = o==='+'? v+r : v-r; }
      return v;
    }
    function term(){
      let v=unary();
      while(peek()&&(peek().t==='*'||peek().t==='/'||peek().t==='%')){
        const o=next().t; const r=unary();
        if(o==='*')v=v*r; else if(o==='/'){ if(r===0) throw new Error('Divisão por zero'); v=v/r; } else { if(r===0) throw new Error('Divisão por zero'); v=v%r; }
      }
      return v;
    }
    function unary(){
      if(peek()&&peek().t==='-'){next();return -unary()}
      if(peek()&&peek().t==='+'){next();return unary()}
      return power();
    }
    function power(){
      const b=atom();
      if(peek()&&peek().t==='^'){next(); return Math.pow(b,unary())}
      return b;
    }
    function atom(){
      const tok=next();
      if(!tok) throw new Error('Fórmula incompleta');
      if(tok.t==='num') return tok.v;
      if(tok.t==='('){ const v=comparacao(); if(!peek()||next().t!==')') throw new Error('Falta fechar ")"'); return v; }
      if(tok.t==='id'){
        const nm=tok.v;
        if(peek()&&peek().t==='('){
          next();
          const f=FUNCS[nm.toLowerCase()];
          if(!f) throw new Error('Função desconhecida: '+nm);
          const args=[];
          if(peek()&&peek().t===')'){next()}
          else{
            for(;;){ args.push(comparacao()); const s=next(); if(!s) throw new Error('Falta fechar ")"'); if(s.t===')')break; if(s.t!==',') throw new Error('Esperado "," ou ")"'); }
          }
          return f.apply(null,args);
        }
        const key=nm.toUpperCase();
        if(key in vars) return vars[key];
        throw new Error('Variável desconhecida: '+nm);
      }
      throw new Error('Trecho inesperado na fórmula');
    }
    const out=comparacao();
    if(p<tk.length) throw new Error('Sobrou conteúdo depois da fórmula');
    if(!isFinite(out)) throw new Error('Resultado inválido');
    return out;
  }
  /* ##PARSER_END## */

  /* ---------- padrões (da calculadora) ---------- */
  function tabelaNiveisPadrao(){
    const t=[]; for(let l=1;l<=50;l++) t.push({lvl:l, pts: l===50?445:45+(l-1)*8});
    return t;
  }
  /* a parte cfg do estadoPadrao() de lá; cada chamada devolve uma cópia nova */
  function cfgPadrao(){
    return {
      niveis:tabelaNiveisPadrao(),
      tiersPersonagem:[{t:'S',m:1.12},{t:'A',m:1.08},{t:'B',m:1.04},{t:'C',m:1.00},{t:'D',m:0.85},{t:'E',m:0.75}],
      pct:{A:0.30,B:0.26,C:0.22,D:0.17,E:0.05},
      arredondar:'floor'
    };
  }
  const CFG_PADRAO = cfgPadrao();      // só leitura aqui dentro: é o que vale quando ninguém passa cfg
  function uid(){return Math.random().toString(36).slice(2,10)}
  /* a ficha em branco que o botão "novo personagem" da calculadora cria, com o id
     vindo de fora quando houver (o do banco, por exemplo) e o campo novo `ini` */
  function personagemPadrao(nome,id){
    return {
      id: id!=null&&id!=='' ? id : uid(), nome:nome||'Novo personagem', raca:'', lado:'Aliado', grupo:'', tags:[],
      tier:'C', level:1,
      tiers: {FOR:'A',DES:'B',AGI:'C',VIT:'D',CAN:'E'},
      pctProprio:null,
      poderes:[],
      skills:{arvores:[], pontos:{}, alocados:{}},
      defesas:{DFF:0, DFM:0, BLQ:0},
      rol:{fixa:0, fonte:'total'}, ultRol:null,
      disputa:{atrA:'FOR', alvoId:'', atrB:'FOR', fixaB:0, valorB:40},
      estaque:{a:'', b:''},
      habilidades:[],
      itens:[],
      recursos:[
        {id:uid(), nome:'HP', fml:'VIT*8 + LVL*5'},
        {id:uid(), nome:'SP', fml:'CAN*6 + LVL*3'}
      ],
      ini:'',
      notas:''
    };
  }

  /* ---------- miudezas das extensões ---------- */
  const tem = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  /* grava como propriedade própria: nada herdado atrapalha e "__proto__" é uma chave como outra */
  function por(o, k, v) {
    Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });
  }
  const somar = (o, k, v) => por(o, k, (tem(o, k) ? o[k] : 0) + v);
  /* número finito ou null. Texto numérico vale ("2" → 2); vazio, null, NaN e infinito não. */
  function numFinito(v) {
    if (typeof v === 'string') v = v.trim() === '' ? NaN : +v;
    return typeof v === 'number' && isFinite(v) ? v : null;
  }
  /* soma sem tocar no valor quando não há o que somar (mantém até o −0 do original) */
  const mais = (a, b) => (b ? a + b : a);
  /* nome de recurso para comparação: sem maiúsculas, sem acentos, sem espaços nas pontas */
  function normNome(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }
  /* "for", " FOR " → 'FOR'; qualquer outra coisa → null (é nome de recurso) */
  function codigoBonus(ch) {
    const c = String(ch == null ? '' : ch).trim().toUpperCase();
    return CHAVES_BONUS.indexOf(c) >= 0 ? c : null;
  }
  /* separa o mapa de bônus da árvore: arv (as dez chaves, zero quando não vem)
     e arvRec (nome de recurso normalizado → bônus) */
  function separarArvore(mapa) {
    const arv = {}, arvRec = {};
    CHAVES_BONUS.forEach(k => { arv[k] = 0; });
    if (mapa && typeof mapa === 'object') {
      Object.keys(mapa).forEach(ch => {
        const v = numFinito(mapa[ch]);
        if (v == null) return;
        const cod = codigoBonus(ch);
        if (cod) { arv[cod] += v; return; }
        const n = normNome(ch);
        if (n) somar(arvRec, n, v);
      });
    }
    return { arv, arvRec };
  }

  /* ---------- o que entrou depois: itens que dão barra e defesa, bônus temporários ---------- */
  /* o que os itens equipados somam no máximo das barras (por id do recurso) e nas defesas específicas */
  function bonusExtras(pc) {
    const rec = {}, esp = {};
    CHAVES_ESP.forEach(k => { esp[k] = 0; });
    (pc.itens || []).forEach(it => {
      if (!itemAtivo(it, pc.itens)) return;               // (o complementar sem o que ele precisa não soma)
      if (it.rec && typeof it.rec === 'object') Object.keys(it.rec).forEach(id => { const v = numFinito(it.rec[id]); if (v) somar(rec, id, v); });
      if (it.def && typeof it.def === 'object') CHAVES_ESP.forEach(k => { const v = numFinito(tem(it.def, k) ? it.def[k] : null); if (v) esp[k] += v; });
    });
    return { rec, esp };
  }
  /* Os bônus temporários do estado (estado.tmp), dos mais antigos para os mais novos, e a soma dos que estão ligados.
     → { lista: [{ id, n, k, v, d, off, t, r, ate }], soma: { as dez chaves }, esp: { as 13 defesas específicas } }
     Um bônus com chave desconhecida ou valor zero continua na lista (dá para consertar na ficha), só não soma.
     A duração pode ser uma anotação (d), "até o próximo descanso" (ate: 'descanso' — o descanso do Acampamento tira)
     ou um contador de rodadas (r, que o mestre desconta na mão): com 0 rodadas o bônus acabou e não soma mais. */
  function temporarios(mapa) {
    const soma = {}, esp = {}, lista = [];
    CHAVES_BONUS.forEach(k => { soma[k] = 0; });
    CHAVES_ESP.forEach(k => { esp[k] = 0; });
    if (mapa && typeof mapa === 'object' && !Array.isArray(mapa)) {
      Object.keys(mapa).forEach(id => {
        const b = mapa[id];
        if (!b || typeof b !== 'object') return;
        const k = String(b.k == null ? '' : b.k).toUpperCase(), v = numFinito(b.v), r = numFinito(b.r);
        lista.push({ id, n: String(b.n == null ? '' : b.n), k: chaveDeBonus(k), v: v == null ? 0 : v,
          d: String(b.d == null ? '' : b.d), off: !!b.off, t: numFinito(b.t) || 0,
          r: r == null ? null : Math.max(0, Math.round(r)), ate: b.ate === 'descanso' ? 'descanso' : '' });
      });
      lista.sort((a, b) => (a.t - b.t) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      lista.forEach(b => { if (b.off || !b.k || !b.v || b.r === 0) return; somarBonus(soma, esp, b.k, b.v); });
    }
    return { lista, soma, esp };
  }

  /* ---------- ferimentos ---------- */
  const ehObjeto = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const inteiroEntre = (v, a, b) => { const n = numFinito(v); return n == null ? 0 : Math.max(a, Math.min(b, Math.round(n))); };
  const porChave = lista => { const o = {}; lista.forEach(x => { o[x.k] = x; }); return o; };
  const PARTE = porChave(PARTES), TIPO_FER = porChave(TIPOS_FER);
  const porOrdem = (campo) => (a, b) => (a[campo] - b[campo]) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  /* Os ferimentos abertos (estado.fer), dos mais antigos para os mais novos, e o que as penalidades deles somam.
     → { lista: [{ id, p, t, g, s:{ sg, en, su, ta, inf }, n, k, v, c }], soma: { as dez chaves }, esp: { as 13 } }
     A penalidade é sempre para menos (v ≤ 0). Ferimento numa parte que não existe não entra. */
  function ferimentos(mapa) {
    const soma = {}, esp = {}, lista = [];
    CHAVES_BONUS.forEach(k => { soma[k] = 0; });
    CHAVES_ESP.forEach(k => { esp[k] = 0; });
    if (ehObjeto(mapa)) {
      Object.keys(mapa).forEach(id => {
        const f = mapa[id];
        if (!ehObjeto(f) || !tem(PARTE, f.p)) return;
        const k = String(f.k == null ? '' : f.k).toUpperCase(), v = numFinito(f.v), s = {};
        ESTADOS_FER.forEach(e => { s[e.k] = !!(ehObjeto(f.s) && f.s[e.k]); });
        lista.push({ id, p: f.p, t: tem(TIPO_FER, f.t) ? f.t : 'corte', g: inteiroEntre(f.g == null ? 1 : f.g, 1, 3), s,
          n: String(f.n == null ? '' : f.n).slice(0, 200), k: chaveDeBonus(k),
          v: v ? -Math.abs(v) : 0, c: numFinito(f.c) || 0 });
      });
      lista.sort(porOrdem('c'));
      lista.forEach(f => { if (!f.k || !f.v) return; somarBonus(soma, esp, f.k, f.v); });
    }
    return { lista, soma, esp };
  }
  /* "Corte grave · Braço esquerdo · sangrando, enfaixado · −2 Destreza" (as partes que houver) */
  function textoDoFerimento(f, semParte) {
    const t = TIPO_FER[f.t] || TIPOS_FER[0], g = GRAVIDADES[(f.g || 1) - 1] || GRAVIDADES[0];
    const partes = [t.nome + ' ' + (t.f ? g.f : g.m)];
    if (!semParte && PARTE[f.p]) partes.push(PARTE[f.p].nome);
    const est = ESTADOS_FER.filter(e => f.s && f.s[e.k]).map(e => e.nome.toLowerCase());
    if (est.length) partes.push(est.join(', '));
    if (f.k && f.v) partes.push('−' + Math.abs(f.v) + ' ' + (f.k === CHAVE_TODOS ? 'em todos os atributos' : NOMES_BONUS[f.k] || f.k));
    return partes.join(' · ');
  }
  /* As partes amputadas (lote 6): um estado permanente do membro, à parte dos ferimentos abertos — estado.amp:
     { [parte]: { c: quando, n: anotação } }. Só os membros (braços, mãos, pernas, pés). A parte de baixo vai junto:
     sem o braço, sem a mão; sem a perna, sem o pé. Não é ferimento: não pesa nas contas nem põe o sinal de ferido no
     token. → { [parte]: { c, n, de } } — de: a parte de cima que levou esta junto (null quando foi esta a marcada) */
  const AMPUTAVEIS = ['bracoE', 'bracoD', 'maoE', 'maoD', 'pernaE', 'pernaD', 'peE', 'peD'];
  const ABAIXO = { bracoE: 'maoE', bracoD: 'maoD', pernaE: 'peE', pernaD: 'peD' };
  Object.freeze(AMPUTAVEIS); Object.freeze(ABAIXO);
  function amputados(estado) {
    const amp = ehObjeto(estado && estado.amp) ? estado.amp : {}, out = {};
    AMPUTAVEIS.forEach(k => {
      if (!tem(amp, k) || !amp[k]) return;
      const x = ehObjeto(amp[k]) ? amp[k] : {};
      out[k] = { c: numFinito(x.c) || 0, n: String(x.n == null ? '' : x.n).slice(0, 200), de: null };
    });
    Object.keys(ABAIXO).forEach(k => { const b = ABAIXO[k]; if (out[k] && !out[b]) out[b] = { c: out[k].c, n: '', de: k }; });
    return out;
  }
  /* O que o token mostra: quantos ferimentos, o mais grave, e se algum sangra ou está infeccionado. */
  function sinalDeFerido(mapa) {
    const l = ferimentos(mapa).lista;
    return { n: l.length, grave: l.reduce((m, f) => Math.max(m, f.g), 0), sangra: l.some(f => f.s.sg), inf: l.some(f => f.s.inf) };
  }

  /* ---------- cálculo (da calculadora, com cfg por parâmetro) ---------- */
  function ptsDoLevel(cfg,lvl){
    const t=cfg.niveis||[], row=t.find(r=>+r.lvl===+lvl);
    if(row) return +row.pts;
    if(!t.length) return 0;
    const last=t[t.length-1], first=t[0];
    if(+lvl>+last.lvl) return +last.pts;      // acima da tabela: trava no último
    return +first.pts;
  }
  function multTier(cfg,tier){
    const r=(cfg.tiersPersonagem||[]).find(x=>x.t===tier);
    return r? +r.m : 1;
  }
  function pctDe(pc,cfg,tier){
    const tab = pc.pctProprio || cfg.pct || {};
    const v = tab[tier];
    return v==null?0:+v;
  }
  function arred(cfg,n){
    if(n==null||isNaN(n))return n;
    switch(cfg.arredondar){
      case 'floor': return Math.floor(n);
      case 'ceil':  return Math.ceil(n);
      case 'round': return Math.round(n);
      default:      return Math.round(n*1000)/1000;
    }
  }
  function bonusItens(pc){
    const b={}; ATRIBS.forEach(a=>b[a.k]=0); DERIV.forEach(d=>b[d.k]=0); DEFESAS.forEach(d=>b[d.k]=0);
    (pc.itens||[]).forEach(it=>{ if(itemAtivo(it, pc.itens)){
      ATRIBS.forEach(a=>{ b[a.k]+= (+it.bonus?.[a.k]||0); });
      DERIV.forEach(d=>{ b[d.k]+= (+it.bonus?.[d.k]||0); });
      DEFESAS.forEach(d=>{ b[d.k]+= (+it.bonus?.[d.k]||0); });
    }});
    return b;
  }
  /* Devolve {mult,total,totalAnt,base,ant,tot,eq,der,derAnt,def,vars,recursos} como a
     calculadora, mais nat, arv e arvRec.

     A árvore (extra.arvore) entra assim:
       atributos   nat = o que vem de level, tier e percentuais (a "base" de lá)
                   base = nat + arv      a árvore faz parte da BASE
                   tot  = base + eq
       derivados   continuam saindo dos atributos BASE (agora com a árvore) e somam o
                   próprio campo do equipamento e o da árvore: ESQ = base.AGI + eq.ESQ + arv.ESQ
       defesas     manual + eq + arv
       ant/derAnt  o level anterior com a mesma árvore e o mesmo equipamento, então
                   base − ant continua sendo só o ganho do level
       recursos    val = fórmula + bônus da árvore para aquele nome; sem fórmula (ou com
                   erro) val fica null e nada é somado. Cada recurso ganha arv (quanto
                   entrou em val) e max (val no arredondamento da configuração).
       variáveis   as de sempre, com a base nova; mais X_ARV nas dez chaves e X_NAT nos
                   cinco atributos (os apelidos dos atributos também: FORCA_ARV, ...)

     Distribuição livre (pc.modoAtr === 'livre', fichas de jogador): nat vem de
     pc.atrLivre — os pontos que a pessoa pôs em cada atributo — em vez de tiers e
     percentuais; o total do level vira só a referência de quantos pontos há para
     distribuir. O resultado ganha livre (true), usados (soma dos pontos postos) e
     limite (pontos do level, inteiros). Sem atrLivre ainda (ninguém distribuiu),
     os números continuam os da tabela até a primeira mudança. ant = base (não há
     "level anterior" numa distribuição feita à mão).

     O que entrou depois (com extra.temp vazio e sem os campos novos na ficha, nada acima muda):
       temporários tmp = a soma dos bônus temporários ligados (extra.temp). Entram como um
                   equipamento: tot = base + eq + tmp; derivados e defesas somam o próprio tmp.
                   Variáveis X_TMP nas dez chaves.
       defesas     defEsp = base digitada (pc.defEsp) + itens (it.def) + temporários, nas 13
       específicas defesas específicas; eqEsp e tmpEsp dizem quanto veio de cada lado.
                   Variáveis DEF_FOGO, DEF_AGUA…
       recursos    val soma também o que os itens equipados dão àquela barra (it.rec, por id);
                   cada recurso ganha eq (quanto), min (até onde desce: 0 ou negativo),
                   inicio (onde começa; null = cheia) e errMin/errInicio (fórmula com erro). */
  /* Os limites de uma barra além do máximo. `piso` e `comeca` aceitam número ou fórmula, com as variáveis de
     sempre e MAX (o máximo da barra). */
  function limitesDoRecurso(r, max, vars, cfg) {
    const o = { min: 0, inicio: null, errMin: null, errInicio: null };
    const m = numFinito(max);
    if (m == null) return o;
    let v2 = null;
    const conta = txt => {
      const t = String(txt == null ? '' : txt).trim();
      if (t === '') return null;
      if (!v2) v2 = Object.assign({}, vars, { MAX: m });
      return evalFormula(t, v2);
    };
    try { const p = conta(r.piso); if (p != null) { const a = arred(cfg, Math.abs(p)); o.min = a > 0 ? -a : 0; } } catch (e) { o.errMin = e.message; }
    try { const i = conta(r.comeca); if (i != null) { const a = arred(cfg, i); o.inicio = Math.min(m, Math.max(o.min, a === 0 ? 0 : a)); } } catch (e) { o.errInicio = e.message; }
    return o;
  }
  function pontosLivres(pc){
    if(pc.modoAtr!=='livre' || !pc.atrLivre || typeof pc.atrLivre!=='object') return null;
    const o={};
    ATRIBS.forEach(a=>{ const v=numFinito(tem(pc.atrLivre,a.k)?pc.atrLivre[a.k]:null); o[a.k]=v==null?0:Math.max(0,Math.round(v)); });
    return o;
  }
  function calcular(pc,cfg,extra){
    cfg=cfg||CFG_PADRAO;
    const mult=multTier(cfg,pc.tier);
    const total    = ptsDoLevel(cfg,pc.level)*mult;
    const totalAnt = ptsDoLevel(cfg,Math.max(1,(+pc.level)-1))*mult;
    const eq=bonusItens(pc);
    const ext=bonusExtras(pc), tp=temporarios(extra&&extra.temp), tmp=tp.soma;
    const fp=ferimentos(extra&&extra.fer);           // as penalidades dos ferimentos abertos contam junto
    if(fp.lista.length){ CHAVES_BONUS.forEach(k=>{ tmp[k]+=fp.soma[k]; }); CHAVES_ESP.forEach(k=>{ tp.esp[k]+=fp.esp[k]; }); }
    const {arv,arvRec}=separarArvore(extra&&extra.arvore);
    const tiers=pc.tiers||{};
    const livres=pontosLivres(pc);
    const nat={},base={},ant={},tot={};
    ATRIBS.forEach(a=>{
      const p=pctDe(pc,cfg,tiers[a.k]);
      nat[a.k] =livres? livres[a.k] : arred(cfg,total*p);
      base[a.k]=mais(nat[a.k],arv[a.k]);
      ant[a.k] =livres? base[a.k] : mais(arred(cfg,totalAnt*p),arv[a.k]);
      tot[a.k] =mais(base[a.k]+eq[a.k],tmp[a.k]);
    });
    const def={};                                   // manual da ficha + equipamentos + árvore (+ temporários)
    DEFESAS.forEach(d=>{ def[d.k]=mais(mais((+((pc.defesas||{})[d.k])||0)+eq[d.k],arv[d.k]),tmp[d.k]); });
    const der={}, derAnt={};                       // sempre a partir dos valores BASE (o Embate usa também o Bloqueio)
    DERIV.forEach(d=>{
      der[d.k]   =mais(mais(d.calc(base,def)+eq[d.k],arv[d.k]),tmp[d.k]);
      derAnt[d.k]=mais(mais(d.calc(ant,def)+eq[d.k],arv[d.k]),tmp[d.k]);
    });
    const defEsp={}, baseEsp={};                    // as 13 específicas: digitada + itens + temporários
    DEFESAS_ESP.forEach(d=>{
      const b=numFinito(pc.defEsp&&tem(pc.defEsp,d.k)?pc.defEsp[d.k]:null)||0;
      baseEsp[d.k]=b; defEsp[d.k]=b+ext.esp[d.k]+tp.esp[d.k];
    });
    const vars={LVL:+pc.level, NIVEL:+pc.level, MULT:mult, PTS:arred(cfg,total), TOTAL:arred(cfg,total)};
    DERIV.forEach(d=>{
      vars[d.k]=der[d.k]; vars[d.k+'_B']=d.calc(base,def); vars[d.k+'_EQ']=eq[d.k];
      d.aliases.forEach(al=>{vars[al]=der[d.k]});
    });
    DEFESAS.forEach(d=>{
      vars[d.k]=def[d.k]; vars[d.k+'_B']=+((pc.defesas||{})[d.k])||0; vars[d.k+'_EQ']=eq[d.k];
      d.aliases.forEach(al=>{vars[al]=def[d.k]});
    });
    ATRIBS.forEach(a=>{
      vars[a.k]=tot[a.k];               // com equipamento
      vars[a.k+'_B']=base[a.k];         // base, sem equipamento
      vars[a.k+'_EQ']=eq[a.k];          // só o bônus
      a.aliases.forEach(al=>{vars[al]=tot[a.k]; vars[al+'_B']=base[a.k]; vars[al+'_EQ']=eq[a.k];});
    });
    /* variáveis novas, depois das originais para não mexer na ordem delas */
    CHAVES_BONUS.forEach(k=>{ vars[k+'_ARV']=arv[k]; });            // só o que a árvore soma
    ATRIBS.forEach(a=>{
      vars[a.k+'_NAT']=nat[a.k];                                    // level + tier, antes da árvore
      a.aliases.forEach(al=>{vars[al+'_ARV']=arv[a.k]; vars[al+'_NAT']=nat[a.k];});
    });
    CHAVES_BONUS.forEach(k=>{ vars[k+'_TMP']=tmp[k]; });            // só os bônus temporários
    DEFESAS_ESP.forEach(d=>{ vars['DEF_'+d.k]=defEsp[d.k]; });
    const recursos=(pc.recursos||[]).map(r=>{
      let val=null,err=null;
      try{ val=evalFormula(r.fml,vars); }catch(e){ err=e.message; }
      const n=val==null?'':normNome(r.nome);
      const b=n&&tem(arvRec,n)?arvRec[n]:0;
      if(b) val=val+b;
      const q=val!=null&&tem(ext.rec,r.id)?ext.rec[r.id]:0;  // o que os itens equipados somam nesta barra
      if(q) val=val+q;
      const max=arred(cfg,val);
      const o={...r, val, err, arv:b, max:max===0?0:max};     // o teste com 0 tira o −0 (teto(-0.3))
      o.eq=q;
      return Object.assign(o, limitesDoRecurso(r, o.max, vars, cfg));
    });
    const r={mult,total,totalAnt,base,ant,tot,eq,der,derAnt,def,vars,recursos,nat,arv,arvRec,
      tmp, temporarios:tp.lista, defEsp, baseEsp, eqEsp:ext.esp, tmpEsp:tp.esp, eqRec:ext.rec,
      ferimentos:fp.lista, fer:fp.soma, ferEsp:fp.esp};
    if(pc.modoAtr==='livre'){
      r.livre=true;
      r.usados=ATRIBS.reduce((s,a)=>s+(+nat[a.k]||0),0);
      r.limite=Math.floor(total+1e-9);
    }
    return r;
  }
  function somaPercentuaisUsados(pc,cfg){
    cfg=cfg||CFG_PADRAO;
    const tiers=pc.tiers||{};
    return ATRIBS.reduce((s,a)=>s+pctDe(pc,cfg,tiers[a.k]),0);
  }
  /* o número que se rola: c é o resultado de calcular(); fonte 'base' só muda os cinco atributos */
  function valorDoAtributo(c,atr,fonte){
    if(ehDefesaEsp(atr)) return c.defEsp[atr];      // defesa específica: digitada + itens + temporários
    if(ehDefesa(atr))   return c.def[atr];          // defesa: manual + equipamento + árvore
    if(ehDerivado(atr)) return c.der[atr];          // derivados têm valor único
    return fonte==='base'? c.base[atr] : c.tot[atr];
  }

  /* ---------- os caminhos trancados da árvore (lote 6) ----------
     O mestre tranca um nódulo da árvore (n.tranca): ele e o que só se alcança através dele somem para quem o mestre
     não abriu o caminho. Alcançar é pela regra de cada nódulo, dentro da árvore dele — "e": todos os de antes; "ou":
     um deles; sem nenhum antes (a raiz, ou só com requisitos de outra árvore): sempre. Só a biblioteca do mestre tem
     trancas: o pacote dos jogadores vai com o que todos alcançam (visiveis(b, [])). Abrir o caminho para um
     personagem põe uma cópia do ramo nas skills dele:
       skills.ramos = { idDoNódulo: { a: id da árvore, nodes: [...], defs: { pools, naturezas, usos }, em } }
     A biblioteca que vale para o personagem (bibComRamos) é a de todos, só com o que ele alcança, mais os ramos dele
     que dá para alcançar: os nódulos que já estão nela ficam como estão (no aparelho do mestre, que tem tudo, a cópia
     não muda nada), e o ramo de uma árvore que não está na biblioteca (uma árvore secreta ainda trancada) fica de fora. */
  const temTranca = b => ehObjeto(b) && Array.isArray(b.arvores) && b.arvores.some(a => ehObjeto(a) && Array.isArray(a.nodes) && a.nodes.some(n => ehObjeto(n) && n.tranca));
  // → um conjunto de ids por árvore (na ordem de b.arvores): o que se alcança com as trancas `abertos` abertas
  function visiveis(biblioteca, abertos) {
    if (!ehObjeto(biblioteca) || !Array.isArray(biblioteca.arvores)) return [];
    const ab = new Set(abertos || []);
    return biblioteca.arvores.map(a => {
      const nodes = ehObjeto(a) && Array.isArray(a.nodes) ? a.nodes.filter(n => ehObjeto(n) && typeof n.id === 'string') : [];
      const ids = new Set(nodes.map(n => n.id)), vis = new Set();
      const pais = nodes.map(n => (Array.isArray(n.pais) ? n.pais : []).filter(p => p !== n.id && ids.has(p)));
      for (let mudou = true; mudou;) {
        mudou = false;
        nodes.forEach((n, i) => {
          if (vis.has(n.id) || (n.tranca && !ab.has(n.id))) return;
          const ps = pais[i];
          if (!ps.length || (n.regra === 'ou' ? ps.some(p => vis.has(p)) : ps.every(p => vis.has(p)))) { vis.add(n.id); mudou = true; }
        });
      }
      return vis;
    });
  }
  // a biblioteca só com o que se alcança com as trancas `abertos` (a mesma, se ela não tem trancas ou nada sai)
  function bibVisivel(biblioteca, abertos) {
    if (!temTranca(biblioteca)) return biblioteca;
    const vs = visiveis(biblioteca, abertos);
    let tirou = false;
    const arvores = biblioteca.arvores.map((a, i) => {
      if (!ehObjeto(a) || !Array.isArray(a.nodes)) return a;
      const fica = a.nodes.filter(n => ehObjeto(n) && vs[i].has(n.id));
      if (fica.length === a.nodes.length) return a;
      tirou = true;
      return Object.assign({}, a, { nodes: fica });
    });
    return tirou ? Object.assign({}, biblioteca, { arvores }) : biblioteca;
  }
  function ramosDe(skills) {
    const r = skills && ehObjeto(skills.ramos) ? skills.ramos : null, out = [];
    if (!r) return out;
    for (const k of Object.keys(r)) {
      const x = r[k];
      if (!k || k === '__proto__' || !ehObjeto(x) || typeof x.a !== 'string' || !x.a || !Array.isArray(x.nodes)) continue;
      out.push({ id: k, a: x.a, nodes: x.nodes.filter(n => ehObjeto(n) && typeof n.id === 'string' && n.id), defs: ehObjeto(x.defs) ? x.defs : {} });
    }
    return out;
  }
  function bibComRamos(biblioteca, skills) {
    if (!ehObjeto(biblioteca) || !Array.isArray(biblioteca.arvores)) return biblioteca;
    const rs = ramosDe(skills);
    // (na biblioteca do mestre, que tem as trancas, fica só o que este personagem alcança; a dos jogadores já vem assim)
    const base = bibVisivel(biblioteca, rs.map(r => r.id));
    if (!rs.length) return base;
    const naBase = new Set(), arvs = new Set();
    base.arvores.forEach(a => { if (!ehObjeto(a)) return; arvs.add(a.id); (Array.isArray(a.nodes) ? a.nodes : []).forEach(n => { if (ehObjeto(n)) naBase.add(n.id); }); });
    const novos = [], vistos = new Set();                  // [nódulo, id da árvore] que podem entrar
    for (const r of rs) {
      if (!arvs.has(r.a)) continue;
      for (const n of r.nodes) {
        if (naBase.has(n.id) || vistos.has(n.id)) continue;
        vistos.add(n.id); novos.push([n, r.a]);
      }
    }
    /* Um nódulo do ramo só entra se dá para chegar nele (pela regra dele): o que vem antes está na biblioteca ou entra
       também. Fica de fora, assim, o ramo de dentro de outro ainda fechado, o que pede também outro caminho trancado e
       o que fica numa escola secreta que o jogador ainda não abriu. */
    const entra = new Set(), tem = p => naBase.has(p) || entra.has(p);
    for (let mudou = true; mudou;) {
      mudou = false;
      for (const [n] of novos) {
        if (entra.has(n.id)) continue;
        const ps = (Array.isArray(n.pais) ? n.pais : []).filter(p => p !== n.id);
        if (!ps.length || (n.regra === 'ou' ? ps.some(tem) : ps.every(tem))) { entra.add(n.id); mudou = true; }
      }
    }
    const extra = new Map();                               // id da árvore → nódulos que entram
    for (const [n, a] of novos) if (entra.has(n.id)) { if (!extra.has(a)) extra.set(a, []); extra.get(a).push(n); }
    // os tipos de ponto, as naturezas e os tipos de uso que só o ramo usa vêm com ele (só os dos nódulos que entraram)
    const usa = { pools: new Set(), naturezas: new Set(), usos: new Set() };
    extra.forEach(ns => ns.forEach(n => {
      (Array.isArray(n.graus) ? n.graus : []).forEach(g => { if (g && ehObjeto(g.custos)) Object.keys(g.custos).forEach(k => usa.pools.add(k)); });
      if (n.natureza) usa.naturezas.add(n.natureza);
      (Array.isArray(n.usos) ? n.usos : []).forEach(u => usa.usos.add(u));
    }));
    const defs = {};
    for (const k of ['pools', 'naturezas', 'usos']) {
      const ja = new Set((Array.isArray(base[k]) ? base[k] : []).filter(ehObjeto).map(x => x.id)), mais = [];
      for (const r of rs) for (const x of Array.isArray(r.defs[k]) ? r.defs[k] : []) if (ehObjeto(x) && typeof x.id === 'string' && usa[k].has(x.id) && !ja.has(x.id)) { ja.add(x.id); mais.push(x); }
      if (mais.length) defs[k] = (Array.isArray(base[k]) ? base[k] : []).concat(mais);
    }
    if (!extra.size && !Object.keys(defs).length) return base;
    return Object.assign({}, base, defs, {
      arvores: base.arvores.map(a => (ehObjeto(a) && extra.has(a.id) ? Object.assign({}, a, { nodes: (Array.isArray(a.nodes) ? a.nodes : []).concat(extra.get(a.id)) }) : a)),
    });
  }

  /* ---------- contas entre chaves no texto das habilidades (lote 6) ----------
     "{FOR*2 + 10}" vira o número do personagem: as variáveis são as das fórmulas da ficha (FOR, DES, AGI, VIT, CAN, as
     defesas, os derivados, LVL…), e o resultado é arredondado como a mesa manda. Sem personagem (vars nulo), a conta
     fica como está escrita. → [{ t: 'txt', s }, { t: 'conta', expr, v, erro, usa: [[variável, valor]] }] */
  const CONTA_RE = /\{([^{}\n]{1,160})\}/g;
  function variaveisDaConta(expr, vars) {
    const out = [];
    let tk = [];
    try { tk = tokenize(String(expr)); } catch (e) { return out; }
    for (let i = 0; i < tk.length; i++) {
      const x = tk[i];
      if (x.t !== 'id' || (tk[i + 1] && tk[i + 1].t === '(')) continue;
      const k = String(x.v).toUpperCase();
      if (vars && k in vars && !out.some(o => o[0] === k)) out.push([k, vars[k]]);
    }
    return out;
  }
  function umaConta(expr, vars, cfg) {
    const e = String(expr == null ? '' : expr).trim();
    let v = null, erro = null;
    if (!e) erro = 'Conta vazia';
    else if (!vars) erro = null;
    else {
      try { v = evalFormula(e, vars); if (v == null || !isFinite(v)) { v = null; erro = 'Conta vazia'; } else { v = arred(cfg || CFG_PADRAO, v); if (Object.is(v, -0)) v = 0; } }
      catch (er) { v = null; erro = er.message; }
    }
    return { t: 'conta', expr: e, v, erro, usa: variaveisDaConta(e, vars) };
  }
  function partesComContas(texto, vars, cfg) {
    const s = String(texto == null ? '' : texto), out = [];
    let i = 0, m;
    CONTA_RE.lastIndex = 0;
    while ((m = CONTA_RE.exec(s))) {
      if (m.index > i) out.push({ t: 'txt', s: s.slice(i, m.index) });
      out.push(umaConta(m[1], vars, cfg));
      i = m.index + m[0].length;
    }
    if (i < s.length) out.push({ t: 'txt', s: s.slice(i) });
    return out;
  }
  // o texto com as contas feitas ("Causa 62 de dano"); a conta que não deu (ou sem personagem) fica como estava
  function textoComContas(texto, vars, cfg) {
    return partesComContas(texto, vars, cfg).map(x => (x.t === 'txt' ? x.s : x.v != null ? String(x.v) : '{' + x.expr + '}')).join('');
  }
  // "FOR×2 + 10 · FOR 26": a conta, para quem passar o mouse
  function explicarConta(c) {
    const vs = (c.usa || []).map(([k, v]) => k + ' ' + v).join(', ');
    return c.erro ? 'Conta: ' + c.expr + ' — ' + c.erro : 'Conta: ' + c.expr + (vs ? ' · ' + vs : '');
  }

  /* ---------- o custo de usar a habilidade (lote 6) ----------
     Em cada grau, uma lista de { b: nome da barra (SP, Energia, uma barra especial), v: quanto — um número ou uma conta
     como "CAN/2" }. Só aparece: quem usa desconta à mão. */
  const MAX_USO = 4;
  /* (lote 21) A barra especial de uma árvore e a marca de cada nó nela (o símbolo ▲ soma / ▼ gasta, na Árvore e na
     ficha). A barra vem do nó que a define ("Preparo (barra): máximo 20…", "Geada: máximo 20…"); a marca é lida do
     texto do nó ("+1 de Preparo", "ganha 2 de Geada", "recupera…" somam; "gasta…", "custa 3 de Ira", "perde metade do
     Preparo", "a Ira zera" gastam — "não gasta", "custa 1 a menos" não). O mestre corrige no nó: no.barra = 'soma',
     'gasta', 'ambas' ou 'nada' (sem o campo, vale a leitura do texto). */
  const LETRA = 'A-Za-zÀ-ÖØ-öø-ÿ';
  const RE_DEF_BARRA = new RegExp('(?:^|\\n)\\s*([A-ZÀ-ÖØ-Þ][' + LETRA + "'’ ]{1,28}?)\\s*(?:\\([^)\\n]{0,90}\\))?\\s*:\\s*(?:m[áa]ximo\\s+\\d+|uma balança|de\\s+[−-]?\\d+\\s+a\\s+[+]?\\d+)");
  const MARCAS_BARRA = ['soma', 'gasta', 'ambas', 'nada'];
  const textoDoNo = n => [n && n.desc].concat(((n && n.graus) || []).map(g => g && g.texto)).filter(x => typeof x === 'string' && x).join('\n');
  const defineBarra = n => { const m = RE_DEF_BARRA.exec(textoDoNo(n)); return m ? m[1].trim() : null; };
  function barraEspecial(arvore) {
    if (!arvore || !Array.isArray(arvore.nodes)) return null;
    if (typeof arvore.barra === 'string' && arvore.barra.trim()) return arvore.barra.trim().slice(0, 30);
    const raizes = arvore.nodes.filter(n => n && !(Array.isArray(n.pais) && n.pais.length));
    for (const n of raizes.concat(arvore.nodes.slice(0, 3))) { const b = defineBarra(n); if (b) return b; }
    return null;
  }
  const escRe = t => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cacheMarca = new Map();
  function lerMarcaDoTexto(txt, barra) {
    const ch = barra + '\u0001' + txt;
    if (cacheMarca.has(ch)) return cacheMarca.get(ch);
    const r = lerMarcaDoTexto0(txt, barra);
    if (cacheMarca.size > 6000) cacheMarca.clear();
    cacheMarca.set(ch, r);
    return r;
  }
  function lerMarcaDoTexto0(txt, barra) {
    const B = '(?<![' + LETRA + '])' + escRe(barra) + '(?![' + LETRA + '])', tem = new RegExp(B);
    const soma1 = new RegExp('\\+\\s*\\d+(?:d\\d+)?\\s*(?:de\\s+)?' + B);
    const soma2 = new RegExp('(?<!não )(?<!nem )\\b(?:ganha|ganham|ganhar|ganhando|recupera|recuperam|recuperar|enche|enchem|encher|rende|rendem|render|soma|somam)\\b[^.;\\n]{0,30}?' + B, 'i');
    const gasta1 = new RegExp('(?<!não )(?<!nem )\\b(?:gasta|gastam|gastar|gastando|paga|pagam|pagar|pagando|perde|perdem|perder|consome|consomem|custa|custam|custar)\\b[^.;\\n]{0,30}?' + B, 'i');
    const gasta2 = new RegExp(B + '\\s+(?:zera|zeram|cai pela metade|volta a 0)', 'i'), gasta3 = new RegExp('[−-]\\s*\\d+\\s*(?:de\\s+)?' + B);
    let soma = false, gasta = false;
    for (const fr of String(txt).split(/[.;\n]+|\bEm troca\b/)) {
      if (!tem.test(fr)) continue;
      if (soma1.test(fr) || soma2.test(fr)) soma = true;
      if (!/\ba menos\b|mais barat/i.test(fr) && (gasta1.test(fr) || gasta2.test(fr) || gasta3.test(fr))) gasta = true;
    }
    return soma || gasta ? { soma, gasta } : null;
  }
  // → { soma, gasta, mao } ou null. barra: o nome (barraEspecial da árvore do nó)
  function marcaDaBarra(no, barra) {
    if (!no) return null;
    if (MARCAS_BARRA.includes(no.barra)) return no.barra === 'nada' ? null : { soma: no.barra !== 'gasta', gasta: no.barra !== 'soma', mao: true };
    if (!barra || defineBarra(no)) return null;                                   // (o nó que define a barra não ganha marca)
    const m = lerMarcaDoTexto(textoDoNo(no), barra);
    return m ? { soma: m.soma, gasta: m.gasta, mao: false } : null;
  }
  const textoDaMarca = (m, barra) => (!m ? '' : m.soma && m.gasta ? 'Soma e gasta ' + barra : m.soma ? 'Soma na barra ' + barra : 'Gasta da barra ' + barra);
  function usoLimpo(lista) {
    if (!Array.isArray(lista)) return null;
    const out = [];
    for (const x of lista) {
      if (out.length >= MAX_USO || !ehObjeto(x)) continue;
      const b = String(x.b == null ? '' : x.b).replace(/\s+/g, ' ').trim().slice(0, 30), v = String(x.v == null ? '' : x.v).replace(/[{}]/g, '').trim().slice(0, 60);
      if (b && v) out.push({ b, v });
    }
    return out.length ? out : null;
  }
  // → [{ barra, v (número, ou null se não deu a conta), expr, erro, usa, conta (é uma conta, não um número) }]
  function custoDeUso(lista, vars, cfg) {
    return (usoLimpo(lista) || []).map(x => {
      const num = /^-?\d+(?:[.,]\d+)?$/.test(x.v) ? Number(x.v.replace(',', '.')) : null;
      if (num != null) return { barra: x.b, v: num, expr: x.v, erro: null, usa: [], conta: false };
      const c = umaConta(x.v, vars, cfg);
      return { barra: x.b, v: c.v, expr: c.expr, erro: c.erro, usa: c.usa, conta: true };
    });
  }
  // "10 SP · 13 Energia" (a conta sem personagem aparece escrita: "CAN/2 Energia")
  function textoDoCusto(lista, vars, cfg) {
    return custoDeUso(lista, vars, cfg).map(c => (c.v != null ? String(c.v) : c.expr) + ' ' + c.barra).join(' · ');
  }

  /* ---------- árvore de habilidades → bônus ---------- */
  /* Soma o `bonus` dos graus comprados e devolve o mapa plano de extra.arvore.
       skills      { arvores:[idsEquipados], pontos:{}, alocados:{ idDoNódulo: grau } }
       biblioteca  { arvores:[{ id, nodes:[{ id, graus:[{ custos, texto, bonus? }] }] }] }
     Como os custos, os bônus acumulam: quem está no grau g leva graus[0..g-1].
     Só contam nódulos que existem na biblioteca e cuja árvore está equipada. Código
     de atributo sai em maiúsculas; nome de recurso sai na primeira grafia que
     aparecer, juntando as que só diferem em maiúsculas, acentos ou espaços nas
     pontas. Valor que não é número finito é ignorado. */
  function bonusDaArvore(skills, biblioteca) {
    const out = {};
    const sk = skills || {};
    const equipadas = Array.isArray(sk.arvores) ? sk.arvores : [];
    const al = sk.alocados || {};
    // (com os ramos trancados que o mestre abriu para este personagem)
    const bc = bibComRamos(biblioteca, sk), arvores = bc && Array.isArray(bc.arvores) ? bc.arvores : [];
    /* mesmo índice da calculadora (indexarArvores): com id repetido vale a última definição,
       assim cada nódulo alocado conta uma vez só, do jeito que os custos contam */
    const porId = new Map(), arvDe = new Map();
    arvores.forEach(a => ((a && a.nodes) || []).forEach(n => {
      if (n) { porId.set(n.id, n); arvDe.set(n.id, a); }
    }));
    const grafia = new Map();                    // nome normalizado → primeira grafia
    arvores.forEach(a => {
      if (!a || equipadas.indexOf(a.id) < 0) return;
      (a.nodes || []).forEach(n => {
        if (!n || porId.get(n.id) !== n || arvDe.get(n.id) !== a || !tem(al, n.id)) return;
        const graus = Array.isArray(n.graus) ? n.graus : [];
        const g = Math.min(+al[n.id], graus.length);
        for (let k = 0; k < g; k++) {
          const b = graus[k] && graus[k].bonus;
          if (!b || typeof b !== 'object') continue;
          Object.keys(b).forEach(ch => {
            const v = numFinito(b[ch]);
            if (v == null) return;
            const cod = codigoBonus(ch);
            if (cod) { somar(out, cod, v); return; }
            const nm = normNome(ch);
            if (!nm) return;
            if (!grafia.has(nm)) grafia.set(nm, String(ch).trim());
            somar(out, grafia.get(nm), v);
          });
        }
      });
    });
    // (lote 16) e as skills únicas do personagem, que vêm já aprendidas
    unicasDe(sk).forEach(u => {
      if (!u.bonus) return;
      Object.keys(u.bonus).forEach(ch => {
        const v = numFinito(u.bonus[ch]);
        if (v == null) return;
        const cod = codigoBonus(ch);
        if (cod) { somar(out, cod, v); return; }
        const nm = normNome(ch);
        if (!nm) return;
        if (!grafia.has(nm)) grafia.set(nm, String(ch).trim());
        somar(out, grafia.get(nm), v);
      });
    });
    return out;
  }
  /* (lote 16) As skills únicas de um personagem: o mestre cria só para ele, e elas vêm já aprendidas (sem árvore e sem
     custo de pontos). skills.unicas: [{ id, nome, desc, bonus?: { FOR: 2, HP: 10 }, uso?: [{ b, v }] (o custo de usar),
     usos?: [id do tipo de uso da biblioteca], cor? }]. Devolve a lista limpa (sem repetidos, sem as sem nome). */
  const MAX_UNICAS = 60;
  function unicasDe(skills) {
    const l = skills && Array.isArray(skills.unicas) ? skills.unicas : [], out = [], vistos = new Set();
    for (const u of l) {
      if (out.length >= MAX_UNICAS || !ehObjeto(u)) continue;
      const id = typeof u.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(u.id) ? u.id : null, nome = String(u.nome == null ? '' : u.nome).replace(/\s+/g, ' ').trim().slice(0, 80);
      if (!id || vistos.has(id) || !nome) continue;
      vistos.add(id);
      const x = { id, nome, desc: String(u.desc == null ? '' : u.desc).slice(0, 2000) };
      if (ehObjeto(u.bonus)) {
        const b = {};
        for (const k of Object.keys(u.bonus)) { const v = numFinito(u.bonus[k]), nm = String(k).trim().slice(0, 30); if (nm && v != null && v !== 0) b[nm] = v; }
        if (Object.keys(b).length) x.bonus = b;
      }
      const uso = usoLimpo(u.uso); if (uso) x.uso = uso;
      if (Array.isArray(u.usos)) { const us = u.usos.filter(v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v)).slice(0, 4); if (us.length) x.usos = [...new Set(us)]; }
      if (typeof u.cor === 'string' && /^#[0-9a-fA-F]{6}$/.test(u.cor)) x.cor = u.cor;
      out.push(x);
    }
    return out;
  }

  /* ---------- iniciativa ---------- */
  function iniDe(pc, vars) {
    let val = 0, err = null;
    try {
      const v = evalFormula(pc.ini, vars);
      if (v != null) val = Math.floor(v) || 0;   // pra baixo; o "|| 0" tira o −0
    } catch (e) { err = e.message; }
    return { val, err };
  }
  /* pc.ini é uma fórmula com as mesmas variáveis dos recursos ("AGI/5", "3").
     → { val: inteiro (0 se vazia ou com erro), err: mensagem ou null } */
  function iniciativa(pc, cfg, extra) {
    return iniDe(pc, calcular(pc, cfg, extra).vars);
  }

  /* ---------- valor atual dos recursos ---------- */
  /* dentro de min..max (min é 0, ou negativo na barra que pode ficar negativa); com max negativo (fórmula
     estranha) fica no próprio max */
  const limitar = (v, max, min) => Math.min(max, Math.max(numFinito(min) || 0, v));
  function atualDe(guardado, max, min, inicio) { // max: número finito ou null
    const g = numFinito(guardado);
    if (max == null) return g;                   // sem máximo não há "cheio" nem limite
    if (g == null) { const i = numFinito(inicio); return i == null ? max : limitar(i, max, min); }   // nada anotado: no começo da barra
    return limitar(g, max, min);
  }
  /* (lote 8) A ferida permanente: a ponta da barra apodrece (estado.podre: { id: quanto }). A cura — até a total —
     não passa do teto (o máximo menos o podre), até o mestre tirar a ferida. O podre fica entre 0 e o máximo.
     → quanto apodreceu (0 se nada) */
  function podreDe(estado, id, max) {
    const pd = estado && estado.podre, v = numFinito(pd && typeof pd === 'object' && tem(pd, id) ? pd[id] : null), m = numFinito(max);
    if (v == null || !(v > 0) || m == null || !(m > 0)) return 0;
    return Math.round(Math.min(v, m) * 10) / 10;
  }
  /* → [{id, nome, max, min, inicio, atual, sobre, podre}] na ordem da ficha. max vem de calc (null se o recurso
     não tem fórmula ou ela deu erro); min é até onde a barra desce (0, ou negativo); inicio é onde ela
     começa (null = cheia). atual é o guardado em estado.rec — no começo da barra quando não há nada
     guardado — e só é preso em min..max quando existe max (com a ferida permanente, em min..teto: o máximo menos
     o podre). sobre é a sobrevida guardada em estado.sob (0 quando não há); podre, o que a ferida apodreceu. */
  function estadoRecursos(pc, calc, estado) {
    const rec = (estado && estado.rec) || {};
    const sob = (estado && estado.sob) || {};
    const sobreDe = id => { const v = numFinito(tem(sob, id) ? sob[id] : null); return v == null || v < 0 ? 0 : v; };
    const calcs = (calc && calc.recursos) || [];
    return ((pc && pc.recursos) || []).map((r, i) => {
      const c = calcs[i] && calcs[i].id === r.id ? calcs[i] : calcs.find(x => x.id === r.id);
      const max = c ? numFinito(c.max) : null, min = c ? Math.min(0, numFinito(c.min) || 0) : 0, inicio = c ? numFinito(c.inicio) : null;
      const podre = podreDe(estado, r.id, max), teto = max == null ? null : Math.max(min, max - podre);
      return { id: r.id, nome: r.nome, max, min, inicio, atual: atualDe(tem(rec, r.id) ? rec[r.id] : null, teto, min, inicio), sobre: sobreDe(r.id), podre };
    });
  }
  /* → um estado NOVO com o recurso somado de delta (dano negativo, cura positiva),
     preso em min..max (min: 0 se não vier). Quem ainda não tem valor guardado parte do
     começo da barra (inicio; cheia se não vier). O estado recebido não é alterado. */
  function aplicarDelta(estado, id, max, delta, min, inicio) {
    const rec = (estado && estado.rec) || {};
    const m0 = numFinito(max), m = m0 == null ? null : Math.max(numFinito(min) || 0, m0 - podreDe(estado, id, m0));    // (a ferida permanente: o teto)
    const atual = atualDe(tem(rec, id) ? rec[id] : null, m, min, inicio);
    let novo = (atual == null ? 0 : atual) + (numFinito(delta) || 0);
    if (m != null) novo = limitar(novo, m, min);
    const rec2 = Object.assign({}, rec);
    por(rec2, id, novo);
    return Object.assign({}, estado, { rec: rec2 });
  }

  /* ---------- barras especiais (os antigos "poderes divinos") ----------
     A lista mora na ficha (ficha.poderes: [{ id, nome, max, atual, rec, qc, ql }]); o valor de agora, no estado
     (estado.pd: { id: n }): a ficha, o token e o acampamento mexem nele sem um desfazer o do outro (o estado se junta
     campo a campo). Sem nada anotado no estado, vale o `atual` que a ficha guardava antes.
     Cada barra tem a sua regra de recuperação (lote 6), que o mestre escolhe (rec):
       longo     enche no descanso longo (o padrão: era o que valia para todas antes)
       qualquer  enche em qualquer descanso, longo ou curto
       quantia   recupera uma quantia: qc no descanso curto e ql no longo, sem passar do limite
       manual    só à mão: o descanso não mexe nela
     → [{ id, nome, atual, max, rec, qc, ql }] na ordem da ficha — max 0 é "sem limite"; atual fica entre 0 e o máximo */
  const ESPECIAL_PADRAO = 'Barra especial';
  const REC_ESPECIAL = [
    {k:'longo',    nome:'Enche no descanso longo'},
    {k:'qualquer', nome:'Enche em qualquer descanso'},
    {k:'quantia',  nome:'Recupera uma quantia'},
    {k:'manual',   nome:'Só à mão'},
  ];
  REC_ESPECIAL.forEach(Object.freeze); Object.freeze(REC_ESPECIAL);
  const QC_PADRAO = 1, QL_PADRAO = 2;          // a quantia que vem escrita quando o mestre escolhe "Recupera uma quantia"
  const recDoEspecial = k => (REC_ESPECIAL.some(r => r.k === k) ? k : 'longo');
  function especiais(ficha, estado) {
    const pd = ehObjeto(estado && estado.pd) ? estado.pd : {};
    return (Array.isArray(ficha && ficha.poderes) ? ficha.poderes : []).filter(x => ehObjeto(x) && x.id != null && x.id !== '').map(x => {
      const id = String(x.id), max = Math.max(0, Math.round(numFinito(x.max) || 0));
      const g = numFinito(tem(pd, id) ? pd[id] : null), a = Math.max(0, Math.round(g != null ? g : numFinito(x.atual) || 0));
      return { id, nome: String(x.nome == null ? '' : x.nome).trim().slice(0, 60) || ESPECIAL_PADRAO, atual: max > 0 ? Math.min(a, max) : a, max,
        rec: recDoEspecial(x.rec), qc: inteiroEntre(x.qc == null ? QC_PADRAO : x.qc, 0, 999), ql: inteiroEntre(x.ql == null ? QL_PADRAO : x.ql, 0, 999) };
    });
  }
  /* A regra de uma barra (do jeito que especiais() devolve), por extenso: "enche no descanso longo", "+1 no descanso
     curto · +2 no longo", "só à mão"… */
  function textoRecEspecial(b) {
    const rec = recDoEspecial(b && b.rec);
    if (rec === 'qualquer') return 'enche em qualquer descanso';
    if (rec === 'manual') return 'só à mão (o descanso não mexe nela)';
    if (rec === 'quantia') {
      const qc = inteiroEntre(b.qc == null ? QC_PADRAO : b.qc, 0, 999), ql = inteiroEntre(b.ql == null ? QL_PADRAO : b.ql, 0, 999), p = [];
      if (qc) p.push('+' + qc + ' no descanso curto');
      if (ql) p.push('+' + ql + (qc ? ' no longo' : ' no descanso longo'));
      return p.length ? p.join(' · ') : 'o descanso não devolve nada';
    }
    return 'enche no descanso longo';
  }
  /* → um estado NOVO com a barra especial `id` valendo `v` (presa entre 0 e o máximo, quando ele existe). O recebido não muda. */
  function mudarEspecial(estado, id, v, max) {
    const m = Math.max(0, Math.round(numFinito(max) || 0)), n = Math.max(0, Math.round(numFinito(v) || 0));
    const pd = Object.assign({}, ehObjeto(estado && estado.pd) ? estado.pd : {});
    por(pd, String(id), m > 0 ? Math.min(n, m) : n);
    return Object.assign({}, estado, { pd });
  }

  /* ---------- os tipos de equipamento (lote 7) ----------
     A lista pronta e os tipos que quem mestra cria (cfg.tiposItem: [{ id: "tp_…", nome }], na configuração da mesa).
     O item guarda o id (it.tipo); sem tipo — ou com um tipo que saiu da lista —, ele fica em "Sem tipo". */
  const TIPOS_ITEM = Object.freeze([
    { id: 'arma', nome: 'Arma', sec: 'Armas' }, { id: 'armadura', nome: 'Armadura', sec: 'Armaduras' }, { id: 'escudo', nome: 'Escudo', sec: 'Escudos' },
    { id: 'acessorio', nome: 'Acessório', sec: 'Acessórios' }, { id: 'vestimenta', nome: 'Vestimenta', sec: 'Vestimentas' },
    { id: 'ferramenta', nome: 'Ferramenta', sec: 'Ferramentas' }, { id: 'outro', nome: 'Outro', sec: 'Outros' }
  ].map(t => Object.freeze(t)));
  const TIPOS_MAX = 30;
  // os tipos criados pela mesa, arrumados: id "tp_…", nome de 1 a 30 letras, sem repetir nome (nem o de um pronto)
  function tiposCriados(cfg) {
    const l = ehObjeto(cfg) && Array.isArray(cfg.tiposItem) ? cfg.tiposItem : [], out = [];
    const nomes = new Set(TIPOS_ITEM.flatMap(t => [normNome(t.nome), normNome(t.sec)]));
    for (const t of l) {
      if (!ehObjeto(t) || typeof t.id !== 'string' || !/^tp_[a-z0-9_-]{1,40}$/i.test(t.id) || out.some(x => x.id === t.id)) continue;
      const nome = String(t.nome == null ? '' : t.nome).replace(/\s+/g, ' ').trim().slice(0, 30);
      if (!nome || nomes.has(normNome(nome))) continue;
      nomes.add(normNome(nome));
      out.push({ id: t.id, nome, sec: nome, criado: true });
      if (out.length >= TIPOS_MAX) break;
    }
    return out;
  }
  // a ordem das seções: os prontos (menos o Outro), os criados pela mesa e, por último, o Outro
  function tiposDeItem(cfg) { return TIPOS_ITEM.slice(0, -1).concat(tiposCriados(cfg), [TIPOS_ITEM[TIPOS_ITEM.length - 1]]); }
  function tipoDoItem(it, tipos) {
    const id = ehObjeto(it) && typeof it.tipo === 'string' ? it.tipo : '';
    return id ? (tipos || TIPOS_ITEM).find(t => t.id === id) || null : null;
  }
  /* As seções da lista de equipamentos: [{ tipo (null: "Sem tipo"), itens }], na ordem dos tipos, só as que têm item.
     Dentro de cada uma, os equipados primeiro e depois os guardados — cada grupo na ordem da ficha. */
  function secoesDeItens(itens, cfg) {
    const tipos = tiposDeItem(cfg), por = new Map();
    for (const it of (Array.isArray(itens) ? itens : []).filter(ehObjeto)) {
      const t = tipoDoItem(it, tipos), k = t ? t.id : '';
      if (!por.has(k)) por.set(k, []);
      por.get(k).push(it);
    }
    const ordem = l => l.filter(x => x.equipado !== false).concat(l.filter(x => x.equipado === false));
    return tipos.filter(t => por.has(t.id)).map(t => ({ tipo: t, itens: ordem(por.get(t.id)) }))
      .concat(por.has('') ? [{ tipo: null, itens: ordem(por.get('')) }] : []);
  }
  /* Um palpite do tipo pelo nome ("Katana de gelo Nv2" → "arma"), para "Separar por tipo…": a primeira palavra do nome
     que diz alguma coisa decide ("Martelo de ferreiro" é arma; "Kit de ferreiro", ferramenta). null: sem palpite. */
  const PALPITES = [
    ['escudo', 'escudo escudos broquel paves egide rodela'],
    ['armadura', 'armadura armaduras couraca cota malha peitoral elmo capacete manopla manoplas grevas greva bracadeira bracadeiras ombreira ombreiras brigantina gibao loriga perneira perneiras gorjal placas'],
    ['arma', 'espada espadas katana sabre adaga adagas punhal faca facas machado machadinha lanca arco besta cajado bastao maca martelo clava mangual foice alabarda tridente chicote rapieira cimitarra florete glaive kunai shuriken shurikens nunchaku tonfa wakizashi nodachi odachi naginata pistola mosquete funda zarabatana dardo dardos azagaia chakram garra garras varinha lamina gladio montante claymore arma armas flecha flechas virote virotes estilete kama kusarigama yari tessen'],
    ['acessorio', 'anel aneis amuleto colar pingente brinco brincos bracelete pulseira broche tiara coroa diadema talisma medalhao cinto cinturao gema joia orbe relicario insignia emblema sinete rosario tornozeleira monoculo oculos bainha aljava'],
    ['vestimenta', 'manto capa tunica robe roupa roupas veste vestes vestido quimono kimono hakama chapeu botas bota sapato sapatos sandalia sandalias luva luvas calca calcas camisa cachecol faixa mascara veu capuz casaco jaqueta colete avental sobretudo gorro turbante lenco haori uniforme traje'],
    ['ferramenta', 'corda kit ferramenta ferramentas lanterna lampiao tocha picareta gazua gazuas mochila cantil mapa bussola instrumento flauta alaude tambor lira harpa violino panela barraca pederneira isqueiro agulha frasco pergaminho grimorio livro tomo diario pena tinteiro serrote anzol rede armadilha algema algemas espelho apito sino chave cadeado pinca bisturi lupa balanca ampulheta luneta']
  ].map(([id, ps]) => [id, new Set(ps.split(' '))]);
  function tipoPeloNome(nome) {
    for (const w of normNome(nome).split(/[^a-z0-9]+/)) {
      if (!w) continue;
      for (const [id, ps] of PALPITES) if (ps.has(w)) return id;
    }
    return null;
  }

  /* ---------- itens com níveis (lote 7) ----------
     Um item pode ter níveis (it.niveis: [{ bonus, rec, def, efeito }, …], de 2 a 10) e o nível de agora (it.nv, de 1
     em diante). Os números e as passivas do nível de agora ficam também no próprio item (it.bonus, it.rec, it.def,
     it.efeito): o espelho — as contas, as Cenas e quem ainda tem a versão de antes do site leem dali. A fonte é a
     lista. Com menos de dois níveis, o item é um item comum. */
  const NIVEIS_MAX = 10;
  const temNiveis = it => ehObjeto(it) && Array.isArray(it.niveis) && it.niveis.filter(ehObjeto).length >= 2;
  function nivelDoItem(it) {
    if (!temNiveis(it)) return 1;
    const n = Math.min(NIVEIS_MAX, it.niveis.filter(ehObjeto).length), v = Math.round(numFinito(it.nv) || 1);
    return Math.max(1, Math.min(n, v));
  }
  const soNumeros = o => { const out = {}; if (ehObjeto(o)) for (const k of Object.keys(o)) { const v = numFinito(o[k]); if (v != null) out[k] = v; } return out; };
  // um nível arrumado: as três listas de números e a passiva
  const normNivel = n => ({ bonus: soNumeros(n && n.bonus), rec: soNumeros(n && n.rec), def: soNumeros(n && n.def), efeito: String(n && n.efeito != null ? n.efeito : '') });
  // os níveis do item, arrumados (um item comum tem um nível só: o dele)
  function niveisDoItem(it) {
    if (!ehObjeto(it)) return [];
    return temNiveis(it) ? it.niveis.filter(ehObjeto).slice(0, NIVEIS_MAX).map(normNivel) : [normNivel(it)];
  }
  // o item no nível nv (preso entre 1 e o último): uma cópia, com o espelho daquele nível no próprio item
  function itemNoNivel(it, nv) {
    if (!temNiveis(it)) return it;
    const lista = it.niveis.filter(ehObjeto).slice(0, NIVEIS_MAX), n = Math.max(1, Math.min(lista.length, Math.round(numFinito(nv) || 1)));
    const l = normNivel(lista[n - 1]), out = Object.assign({}, it, { niveis: lista, nv: n, bonus: l.bonus });
    for (const k of ['rec', 'def']) { if (Object.keys(l[k]).length) out[k] = l[k]; else delete out[k]; }
    if (l.efeito) out.efeito = l.efeito; else delete out.efeito;
    return out;
  }
  // os mesmos números? (um zero e a falta da chave contam igual)
  function mesmosNumeros(a, b) {
    const x = soNumeros(a), y = soNumeros(b);
    return Object.keys(Object.assign({}, x, y)).every(k => (x[k] || 0) === (y[k] || 0));
  }
  /* O espelho do item confere com o nível de agora? Se não (alguém mexeu só no item, com a versão de antes), refaz
     a partir da lista — numa cópia. O item que já confere volta o mesmo (abrir a ficha não a regrava). */
  function espelharItem(it) {
    if (!temNiveis(it)) return it;
    const nv = nivelDoItem(it), l = normNivel(it.niveis.filter(ehObjeto)[nv - 1]);
    const ok = numFinito(it.nv) === nv && mesmosNumeros(it.bonus, l.bonus) && mesmosNumeros(it.rec, l.rec) && mesmosNumeros(it.def, l.def)
      && String(it.efeito == null ? '' : it.efeito) === l.efeito && it.niveis.length <= NIVEIS_MAX && it.niveis.every(ehObjeto);
    return ok ? it : itemNoNivel(it, nv);
  }
  /* Um nível a mais, igual ao último (o item comum vira um item de dois níveis, os dois com os números dele; ele fica
     no nível 1). Com 10 níveis, nada muda (volta o mesmo item). */
  function itemComNivelNovo(it) {
    if (!ehObjeto(it)) return it;
    const ls = niveisDoItem(it);
    if (ls.length >= NIVEIS_MAX) return it;
    const novo = JSON.parse(JSON.stringify(ls[ls.length - 1]));
    return itemNoNivel(Object.assign({}, it, { niveis: ls.concat([novo]) }), temNiveis(it) ? nivelDoItem(it) : 1);
  }
  /* Sem o nível k: quem estava acima desce um; se era o de agora, fica o de baixo (ou o 1). Sobrando um nível só, o item
     volta a ser comum, com os números daquele nível. */
  function itemSemNivel(it, k) {
    if (!temNiveis(it)) return it;
    const ls = niveisDoItem(it), i = Math.round(numFinito(k) || 0) - 1;
    if (i < 0 || i >= ls.length) return it;
    const nv = nivelDoItem(it), resto = ls.filter((_, j) => j !== i);
    const para = nv - 1 > i ? nv - 1 : nv - 1 === i ? Math.max(1, nv - 1) : nv;
    if (resto.length >= 2) return itemNoNivel(Object.assign({}, it, { niveis: resto }), para);
    // sobrou um nível: o item comum, com os números e a passiva dele
    const l = resto[0], out = Object.assign({}, it, { bonus: l.bonus });
    delete out.niveis; delete out.nv;
    for (const c of ['rec', 'def']) { if (Object.keys(l[c]).length) out[c] = l[c]; else delete out[c]; }
    if (l.efeito) out.efeito = l.efeito; else delete out.efeito;
    return out;
  }
  // "Katana de gelo: Nv 2 → Nv 3" (para o aviso e a mesa ao vivo)
  const textoDoNivel = (it, de, para) => (String((it && it.nome) || '').trim() || 'Item sem nome') + ': Nv ' + de + ' → Nv ' + para;

  /* ---------- grupos de troca dos equipamentos (lote 6) ----------
     Um item pode estar num grupo de troca (it.troca: um nome, como "Arma principal" ou "Espada de gelo" — sem diferença
     de maiúsculas e acentos): dos itens do mesmo grupo, um só fica equipado. Equipar um guarda os outros do grupo; os
     itens sem grupo não mudam. A relíquia (it.reliquia) é só um destaque: não muda conta nenhuma.
     → { itens: uma lista nova (os itens que mudam são cópias; o recebido não muda), guardados: [ids que foram guardados] } */
  const grupoDeTroca = it => String(it == null || it.troca == null ? '' : it.troca).trim().slice(0, 40);
  /* ---------- itens complementares (lote 6) ----------
     Um item pode depender de outro (it.req): "i:<id>" (aquele item) ou "g:<grupo>" (qualquer item daquele grupo de
     troca — a bainha serve para qualquer nível da espada). Ele só vale (soma nas contas) com o que ele precisa
     equipado e valendo também. Um requisito que não está mais na ficha (o item apagado, o grupo vazio) não prende
     ninguém; A precisa de B que precisa de A: basta os dois estarem equipados.
     (lote 7) it.req pode ser também uma lista: o item vale com QUALQUER um deles. E "i:<id>@<n>" pede aquele item do
     nível n para cima (um item com níveis: "só com a Katana de gelo Nv 2 ou mais"). */
  function lerReq(r) {
    if (typeof r !== 'string') return null;
    if (r.startsWith('i:') && r.length > 2) {
      const m = /^i:(.+?)(?:@(\d{1,2}))?$/.exec(r), nv = m && m[2] ? Math.min(NIVEIS_MAX, +m[2]) : 0;
      return !m ? null : nv >= 2 ? { t: 'i', id: m[1], nv } : { t: 'i', id: m[1] };
    }
    if (r.startsWith('g:') && normNome(r.slice(2))) return { t: 'g', g: r.slice(2).trim().slice(0, 40) };
    return null;
  }
  // tudo o que o item aceita, arrumado e sem repetir: [{ t: 'i', id, nv? } | { t: 'g', g }]
  function reqsDoItem(it) {
    if (!ehObjeto(it)) return [];
    const bruto = Array.isArray(it.req) ? it.req : typeof it.req === 'string' ? [it.req] : [], out = [], vistos = new Set();
    for (const r of bruto.slice(0, 20)) {
      const q = lerReq(r);
      if (!q) continue;
      const chave = q.t === 'i' ? 'i:' + q.id : 'g:' + normNome(q.g);
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      out.push(q);
    }
    return out;
  }
  // o primeiro (como era quando o item aceitava um só) — ou null
  function reqDoItem(it) { const l = reqsDoItem(it); return l.length ? l[0] : null; }
  // os itens da ficha que um requisito indica (o item; os do grupo, menos o próprio item) — [] se não está mais lá
  function alvosDoReq(q, it, lista) {
    if (q.t === 'i') { const a = lista.find(x => ehObjeto(x) && String(x.id) === q.id); return a ? [a] : []; }
    const g = normNome(q.g);
    return lista.filter(x => ehObjeto(x) && x !== it && normNome(grupoDeTroca(x)) === g);
  }
  const nivelServe = (q, x) => !q.nv || nivelDoItem(x) >= q.nv;
  function reqAtendido(it, itens, visto) {
    const rs = reqsDoItem(it);
    if (!rs.length) return true;
    const lista = Array.isArray(itens) ? itens : [], v = visto || new Set();
    if (v.has(it)) return true;
    v.add(it);
    let algum = false;
    for (const q of rs) {
      const alvos = alvosDoReq(q, it, lista);
      if (!alvos.length) continue;                       // (o que saiu da ficha não conta, nem prende)
      algum = true;
      if (alvos.some(x => x.equipado !== false && nivelServe(q, x) && reqAtendido(x, lista, new Set(v)))) return true;
    }
    return !algum;
  }
  // o item soma nas contas? (equipado, e com o que ele precisa)
  function itemAtivo(it, itens) { return ehObjeto(it) && it.equipado !== false && reqAtendido(it, itens); }
  /* o nome do que o item precisa, para a tela: "Espada do Gelo de Selene", "Espada de gelo" (o grupo),
     "Katana de gelo (Nv 2 ou mais)" ou, com vários, "Katana de gelo, Sabre ou Espada longa" — ou '' */
  function nomeDoReq(it, itens) {
    const lista = Array.isArray(itens) ? itens : [], partes = [];
    for (const q of reqsDoItem(it)) {
      if (q.t === 'g') { partes.push(q.g); continue; }
      const alvo = lista.find(x => ehObjeto(x) && String(x.id) === q.id);
      if (alvo) partes.push((String(alvo.nome || '').trim() || 'item sem nome') + (q.nv ? ' (Nv ' + q.nv + ' ou mais)' : ''));
    }
    return partes.length < 2 ? partes.join('') : partes.slice(0, -1).join(', ') + ' ou ' + partes[partes.length - 1];
  }
  /* Equipar (on) ou guardar um item. Acerta tudo de uma vez, numa lista nova (os itens recebidos não mudam):
       · dos itens do mesmo grupo de troca, um só fica equipado: equipar um guarda os outros;
       · equipar um item sem o que ele precisa equipa o requisito junto (num grupo de troca, o que foi usado por
         último — it.uso guarda a ordem em que os itens foram equipados);
       · guardar o requisito guarda os que dependem dele e os marca (it.volta): quando o requisito (ou outro item do
         grupo dele) for equipado de novo, eles voltam junto — se o grupo de troca deles deixar;
       · mexer à mão num item tira a marca dele.
     → { itens, guardados: [ids guardados além do clicado], trocados: [os guardados pelo grupo de troca],
         equipados: [ids equipados além do clicado (o requisito, os que voltaram)], trocas: [{ por, saiu }] } */
  function equiparItem(itens, id, on) {
    const lista = Array.isArray(itens) ? itens : [];
    if (!lista.some(x => ehObjeto(x) && String(x.id) === String(id))) return { itens: lista.slice(), guardados: [], trocados: [], equipados: [], trocas: [] };
    const out = lista.map(x => (ehObjeto(x) ? Object.assign({}, x) : x));
    const itensDe = () => out.filter(ehObjeto), por = i => itensDe().find(x => String(x.id) === String(i));
    const antes = new Map(itensDe().map(x => [x, x.equipado !== false]));
    let uso = itensDe().reduce((m, x) => Math.max(m, Number.isFinite(+x.uso) ? +x.uso : 0), 0);
    const trocados = [], trocas = [];
    // (lote 7) dos itens que servem ao requisito de x (de qualquer um da lista, no nível pedido), o usado por último
    const melhorPara = x => {
      let m = null;
      for (const q of reqsDoItem(x)) for (const a of alvosDoReq(q, x, itensDe())) if (nivelServe(q, a) && (!m || (+a.uso || 0) > (+m.uso || 0))) m = a;
      return m;
    };
    const ligar = (x, visto) => {
      if (!x || visto.has(x)) return;
      visto.add(x);
      if (reqsDoItem(x).length && !reqAtendido(x, out)) ligar(melhorPara(x), visto);
      x.equipado = true; x.uso = ++uso; delete x.volta;
      const g = normNome(grupoDeTroca(x));
      if (g) for (const y of itensDe()) if (y !== x && y.equipado !== false && normNome(grupoDeTroca(y)) === g) { y.equipado = false; delete y.volta; trocados.push(y.id); trocas.push({ por: x.id, saiu: y.id }); }
    };
    const alvo = por(id);
    if (on) ligar(alvo, new Set());
    else { alvo.equipado = false; delete alvo.volta; }
    // as dependências, até parar: quem ficou sem o requisito sai (marcado para voltar); quem saiu por isso e agora o
    // tem de novo volta (o clicado fica como foi pedido)
    for (let k = 0; k < 50; k++) {
      let mudou = false;
      for (const x of itensDe()) {
        if (x === alvo || !reqDoItem(x)) continue;
        if (x.equipado !== false && !reqAtendido(x, out)) { x.equipado = false; x.volta = true; mudou = true; }
        else if (x.equipado === false && x.volta && reqAtendido(x, out)) {
          const g = normNome(grupoDeTroca(x));
          delete x.volta;
          if (g && itensDe().some(y => y !== x && y.equipado !== false && normNome(grupoDeTroca(y)) === g)) continue;
          x.equipado = true; x.uso = ++uso; mudou = true;
        }
      }
      if (!mudou) break;
    }
    const guardados = [], equipados = [];
    for (const x of itensDe()) {
      if (x === alvo) continue;
      const a = antes.get(x), d = x.equipado !== false;
      if (a && !d) guardados.push(x.id); else if (!a && d) equipados.push(x.id);
    }
    // o que não mudou continua o mesmo objeto (só os que mudam viram cópia)
    const mesmo = (x, o) => x.equipado === o.equipado && x.volta === o.volta && x.uso === o.uso;
    const final = out.map((x, i) => (ehObjeto(x) && x !== alvo && mesmo(x, lista[i]) ? lista[i] : x));
    return { itens: final, guardados, trocados: trocados.filter((i, k) => guardados.includes(i) && trocados.indexOf(i) === k), equipados, trocas: trocas.filter(t => guardados.includes(t.saiu)) };
  }
  // O aviso de um "equipar"/"guardar", com o que mudou junto: "Equipou Bainha de Selene; junto: Espada do Gelo de Selene."
  function textoDoEquipar(itens, r, id, on) {
    const lista = Array.isArray(itens) ? itens : [];
    const nome = i => { const x = lista.find(y => ehObjeto(y) && String(y.id) === String(i)); return (x && String(x.nome || '').trim()) || 'item sem nome'; };
    const e = l => (l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]);
    const trocas = (r && r.trocas) || [], troc = (r && r.trocados) || [], outros = ((r && r.guardados) || []).filter(i => !troc.includes(i)), eq = (r && r.equipados) || [];
    // (quem saiu pelo grupo de troca aparece junto de quem entrou no lugar dele)
    const noLugar = i => { const s = trocas.filter(x => String(x.por) === String(i)).map(x => nome(x.saiu)); return s.length ? e(s) : ''; };
    let t = (on ? 'Equipou ' : 'Guardou ') + nome(id);
    if (noLugar(id)) t += ' no lugar de ' + noLugar(id);
    if (eq.length) t += '; junto: ' + e(eq.map(i => nome(i) + (noLugar(i) ? ' (no lugar de ' + noLugar(i) + ')' : '')));
    if (outros.length) t += (eq.length ? '; e guardou ' : '; guardou junto: ') + e(outros.map(nome));
    return t + '.';
  }

  /* ---------- a fadiga (lote 6) ----------
     Uma pilha de 5 a 0, como a bateria do celular: cheia (5) é descansado; vazia (0), esgotado. Mora no estado
     (estado.fad); sem nada anotado, a pilha está cheia. O mestre e quem controla a ficha mexem nela à mão; o descanso do
     Acampamento a enche de volta (o longo, toda; o curto, um). Está em uso na ficha de um jogador da mesa e na que já
     tem a fadiga anotada (um NPC, quando o mestre liga). */
  const FAD_MAX = 5;
  const FADIGA = ['Esgotado', 'Exausto', 'Muito cansado', 'Cansado', 'Disposto', 'Descansado'];     // de 0 a 5
  Object.freeze(FADIGA);
  const fadiga = estado => { const n = numFinito(estado && estado.fad); return n == null ? FAD_MAX : Math.max(0, Math.min(FAD_MAX, Math.round(n))); };
  const usaFadiga = (estado, deJogador) => !!deJogador || (ehObjeto(estado) && estado.fad != null && numFinito(estado.fad) != null);
  /* → um estado NOVO com a fadiga valendo v (presa entre 0 e 5). O recebido não muda. */
  function mudarFadiga(estado, v) {
    const n = numFinito(v);
    return Object.assign({}, estado, { fad: n == null ? FAD_MAX : Math.max(0, Math.min(FAD_MAX, Math.round(n))) });
  }
  /* (lote 7) "Mexer em todos" (o Acampamento e as Cenas): soma (ou tira, com sinal de menos) d.fad passos na Fadiga
     (a pilha de 0 a 5), d.conf no Conforto e d.san na Sanidade (de 0 a 100) do estado de uma ficha. usa: o que a ficha
     usa ({ mente, fadiga }) — o que ela não usa não muda. Os valores ficam nos limites (Conforto 0 continua 0).
     → { estado (o mesmo objeto, se nada mudou), so (as chaves que mudaram), antes, depois ({ conf, san, fad }) } */
  function mexerNaMente(estado, d, usa) {
    const est = ehObjeto(estado) ? estado : {}, dd = ehObjeto(d) ? d : {}, u = ehObjeto(usa) ? usa : {};
    const val = (v, padrao) => { const n = numFinito(v); return n == null ? padrao : Math.max(0, Math.min(100, Math.round(n))); };
    const passo = k => { const n = numFinito(dd[k]); return n == null ? 0 : Math.trunc(n); };
    const antes = { conf: u.mente ? val(est.conf, 50) : null, san: u.mente ? val(est.san, 100) : null, fad: u.fadiga ? fadiga(est) : null };
    const depois = Object.assign({}, antes), so = [];
    if (u.mente && passo('conf')) { depois.conf = Math.max(0, Math.min(100, antes.conf + passo('conf'))); if (depois.conf !== antes.conf) so.push('conf'); }
    if (u.mente && passo('san')) { depois.san = Math.max(0, Math.min(100, antes.san + passo('san'))); if (depois.san !== antes.san) so.push('san'); }
    if (u.fadiga && passo('fad')) { depois.fad = Math.max(0, Math.min(FAD_MAX, antes.fad + passo('fad'))); if (depois.fad !== antes.fad) so.push('fad'); }
    if (!so.length) return { estado, so, antes, depois };
    const novo = Object.assign({}, est);
    for (const k of so) novo[k] = depois[k];
    return { estado: novo, so, antes, depois };
  }

  /* ---------- bolsas: poções, bombas, runas, munições e materiais ---------- */
  const TIPOS_BOLSA = BOLSAS.map(b => b.t);
  const numTxt = n => String(Math.round(n * 100) / 100).replace('-', '−');
  /* Os efeitos de uma poção (lote 5: uma poção pode fazer várias coisas de uma vez). Cada efeito:
       { k:'barra', rec, val }   mexe numa barra — rec: o id do recurso da ficha (HP, SP…) ou "pd:<id>", uma barra especial;
                                 val: quanto, escrito "30", "+30", "−10", "2d6+3" ou "−1d4"
       { k:'sob', rec, val }     sobrevida numa barra (se a barra já tem sobrevida, fica a maior das duas)
       { k:'bonus', bk, bv, dur, r, bd }   bônus temporário. dur: '' (dura o que a anotação bd disser), 'descanso' (até o
                                 próximo descanso do Acampamento) ou 'rodadas' (r rodadas, que o mestre desconta na ficha)
       { k:'cond', c, r }        uma condição no token de quem recebe (só vale pela cena): c, o id dela; r, rodadas (0: sem contador)
     A poção de antes (rec/val e bk/bv/bd soltos no item) é lida como a lista equivalente. No máximo 8 efeitos. */
  const FX_KS = ['barra', 'sob', 'bonus', 'cond'];
  const FX_DURS = ['', 'descanso', 'rodadas'];
  const FX_MAX = 8;
  function efeitoLimpo(e) {
    if (!ehObjeto(e) || FX_KS.indexOf(e.k) < 0) return null;
    if (e.k === 'barra' || e.k === 'sob') return { k: e.k, rec: e.rec ? String(e.rec).slice(0, 80) : '', val: String(e.val == null ? '' : e.val).trim().slice(0, 30) };
    if (e.k === 'bonus') {
      const k = String(e.bk == null ? '' : e.bk).toUpperCase(), dur = FX_DURS.indexOf(e.dur) >= 0 ? e.dur : '';
      return { k: 'bonus', bk: chaveDeBonus(k), bv: numFinito(e.bv) || 0, dur, r: dur === 'rodadas' ? inteiroEntre(e.r == null ? 1 : e.r, 1, 999) : 0, bd: dur ? '' : String(e.bd == null ? '' : e.bd).slice(0, 40) };
    }
    return { k: 'cond', c: String(e.c == null ? '' : e.c).slice(0, 40), r: inteiroEntre(e.r, 0, 999) };
  }
  function efeitosDoItem(it) {
    if (!ehObjeto(it)) return [];
    if (Array.isArray(it.fx)) return it.fx.map(efeitoLimpo).filter(Boolean).slice(0, FX_MAX);
    const out = [];
    if (it.rec) out.push({ k: 'barra', rec: String(it.rec).slice(0, 80), val: String(it.val == null ? '' : it.val).trim().slice(0, 30) });
    const k = String(it.bk == null ? '' : it.bk).toUpperCase();
    if (k) out.push({ k: 'bonus', bk: chaveDeBonus(k), bv: numFinito(it.bv) || 0, dur: '', r: 0, bd: String(it.bd == null ? '' : it.bd).slice(0, 40) });
    return out;
  }
  /* A bolsa da ficha, arrumada: só itens com id, cada um com a quantidade que o estado guarda (0 se não guarda).
     → [{ id, t, nome, nota, qtd, fx, rec, val, bk, bv, bd }] na ordem da ficha. fx: os efeitos (só as poções têm);
     rec/val e bk/bv/bd são o primeiro efeito de barra e o primeiro bônus, do jeito de antes, para quem ainda lê assim. */
  function bolsa(pc, estado) {
    const q = (estado && estado.qtd) || {};
    return (Array.isArray(pc && pc.bolsa) ? pc.bolsa : []).filter(it => it && typeof it === 'object' && it.id != null && it.id !== '').map(it => {
      const id = String(it.id), n = numFinito(tem(q, id) ? q[id] : null), t = TIPOS_BOLSA.indexOf(it.t) >= 0 ? it.t : 'material';
      const fx = t === 'pocao' ? efeitosDoItem(it) : [], b1 = fx.find(e => e.k === 'barra'), o1 = fx.find(e => e.k === 'bonus');
      return { id, t, nome: String(it.nome == null ? '' : it.nome), nota: String(it.nota == null ? '' : it.nota),
        qtd: n == null || n < 0 ? 0 : Math.floor(n), fx,
        rec: b1 ? b1.rec : '', val: b1 ? b1.val : '', bk: o1 ? o1.bk : '', bv: o1 ? o1.bv : 0, bd: o1 ? o1.bd : '' };
    });
  }
  /* O efeito de uma poção numa barra, do jeito que foi escrito: "30", "+30", "-10", "2d6+3", "-1d4".
     → null (vazio) · { erro } · { fixo: n } · { sinal: 1|-1, dados: "2d6+3" } — o sinal na frente vale para a conta
     inteira, e quem chama é que rola os dados. */
  function lerEfeito(txt) {
    let s = String(txt == null ? '' : txt).replace(/\s+/g, '').replace(/[−–—]/g, '-').replace(',', '.').toLowerCase();
    if (s === '') return null;
    let sinal = 1;
    if (s[0] === '+') s = s.slice(1); else if (s[0] === '-') { sinal = -1; s = s.slice(1); }
    if (/^\d+(\.\d+)?$/.test(s)) return { fixo: sinal * Number(s) };
    if (/^\d*d\d+([+-](\d*d\d+|\d+))*$/.test(s)) return { sinal, dados: s };
    return { erro: 'Escreva um valor (30) ou dados (2d6+3).' };
  }
  /* De quanto a quanto um efeito pode dar: "30" → [30, 30]; "2d6+3" → [5, 15]; "−1d4" → [−4, −1]. null se não dá
     para ler. (Serve para conferir um valor rolado em outro aparelho.) */
  function faixaDoEfeito(txt) {
    const ef = lerEfeito(txt);
    if (!ef || ef.erro) return null;
    if (ef.fixo != null) return [ef.fixo, ef.fixo];
    let lo = 0, hi = 0;
    const re = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/g;
    let m;
    while ((m = re.exec(ef.dados))) {
      if (m[3] != null) { const sg = m[1] === '-' ? -1 : 1, n = m[2] === '' ? 1 : +m[2], f = +m[3]; if (sg > 0) { lo += n; hi += n * f; } else { lo -= n * f; hi -= n; } }
      else { const sg = m[4] === '-' ? -1 : 1; lo += sg * +m[5]; hi += sg * +m[5]; }
    }
    return ef.sinal < 0 ? [-hi, -lo] : [lo, hi];
  }
  /* A barra de um efeito em quem recebe a poção. No próprio personagem, pelo id; em outro, pelo nome (sem diferença de
     maiúsculas e acentos): a poção de "HP" mexe no "HP" de quem bebe. quem = { pc, calc, estado }.
     → { tipo: 'rec' | 'pd', id, nome, max, min, inicio, atual, sobre } ou null (quem recebe não tem essa barra) */
  function barraDe(quem, rec, nomeDaOrigem, mesmo) {
    const pd = typeof rec === 'string' && rec.indexOf('pd:') === 0;
    if (pd) {
      const l = especiais(quem.pc, quem.estado);
      const x = mesmo ? l.find(e => 'pd:' + e.id === rec) : l.find(e => normNome(e.nome) === normNome(nomeDaOrigem));
      return x ? { tipo: 'pd', id: x.id, nome: x.nome, max: x.max, min: 0, inicio: null, atual: x.atual, sobre: 0 } : null;
    }
    const l = estadoRecursos(quem.pc, quem.calc, quem.estado);
    const x = mesmo ? l.find(r => r.id === rec) : l.find(r => normNome(r.nome) === normNome(nomeDaOrigem));
    return x ? Object.assign({ tipo: 'rec' }, x) : null;
  }
  // o nome da barra de um efeito, na ficha de quem tem a poção (para achar a mesma barra em outro personagem)
  function nomeDaBarra(pc, calc, estado, rec) {
    const b = barraDe({ pc, calc, estado }, rec, '', true);
    return b ? b.nome : '';
  }
  const durTxt = e => (e.dur === 'descanso' ? 'até o próximo descanso' : e.dur === 'rodadas' ? (e.r === 1 ? '1 rodada' : e.r + ' rodadas') : e.bd || '');
  /* Usar um item da bolsa: gasta uma unidade e, se for poção, faz o que ela faz — em quem usa ou em outro personagem.
       rolado   o total dos dados de cada efeito que rola: uma lista, na ordem dos efeitos (ou um número só, que vale
                para o primeiro efeito com dados — o jeito de antes)
       agora    a hora (ms), para o bônus novo entrar no fim da lista · novoId: o id dele (o segundo bônus ganha "_1"…)
       alvo     { pc, calc, estado } de quem recebe, se não for quem usa (as barras são achadas pelo nome)
     → { ok:false, erro } ou { ok:true, estado (de quem usa: a bolsa com uma a menos — e o efeito, se foi nele mesmo),
         estadoAlvo (de quem recebe; o mesmo objeto, quando é o próprio), mesmo, item, sobra,
         efeitos: [{ k:'barra', tipo, id, nome, de, para, delta } | { k:'sob', id, nome, de, para, v } | { k:'bonus', id, n, bk, bv, dur, r, bd }],
         conds: [{ c, r }] (as condições: quem chama põe no token), faltam: ['HP', …] (barras que quem recebe não tem),
         barra (o primeiro efeito de barra comum) e bonus ({ id, n, k, v, d }: o primeiro bônus), do jeito de antes }
     Nada recebido é alterado. */
  function usarItem(pc, calc, estado, idItem, rolado, agora, novoId, alvo) {
    const it = bolsa(pc, estado).find(x => x.id === idItem);
    if (!it) return { ok: false, erro: 'Este item não está mais na bolsa.' };
    if (it.qtd < 1) return { ok: false, erro: 'Não há mais ' + (it.nome || 'deste item') + ' na bolsa.' };
    const mesmo = !alvo || !alvo.pc || (pc && alvo.pc.id != null && alvo.pc.id === pc.id);
    let est = Object.assign({}, estado);
    const qtd = Object.assign({}, (estado && estado.qtd) || {});
    por(qtd, it.id, it.qtd - 1); est.qtd = qtd;
    let ea = mesmo ? est : Object.assign({}, alvo.estado || {});
    const quem = mesmo ? { pc, calc } : { pc: alvo.pc, calc: alvo.calc };
    const efeitos = [], conds = [], faltam = [];
    let dadoAntigo = numFinito(rolado), nb = 0;
    it.fx.forEach((e, i) => {
      quem.estado = ea;
      if (e.k === 'barra' || e.k === 'sob') {
        const ef = lerEfeito(e.val);
        if (!e.rec || !ef || ef.erro) return;
        const nome = nomeDaBarra(pc, calc, estado, e.rec), b = barraDe(quem, e.rec, nome, mesmo);
        if (!b || (b.tipo === 'rec' && b.max == null) || (e.k === 'sob' && b.tipo !== 'rec')) { if (nome || !mesmo) faltam.push(nome || 'barra'); return; }
        let r = Array.isArray(rolado) ? numFinito(rolado[i]) : null;
        if (!Array.isArray(rolado) && ef.dados && dadoAntigo != null) { r = dadoAntigo; dadoAntigo = null; }
        const n = Math.round((ef.fixo != null ? ef.fixo : ef.sinal * (r || 0)) * 10) / 10;
        if (e.k === 'barra') {
          if (b.tipo === 'pd') {
            ea = mudarEspecial(ea, b.id, b.atual + n, b.max);
            efeitos.push({ k: 'barra', tipo: 'pd', id: b.id, nome: b.nome, de: b.atual, para: ea.pd[b.id], delta: n });
          } else {
            ea = aplicarDelta(ea, b.id, b.max, n, b.min, b.inicio);
            efeitos.push({ k: 'barra', tipo: 'rec', id: b.id, nome: b.nome, de: b.atual, para: ea.rec[b.id], delta: n });
          }
        } else {
          const v = Math.max(0, n), novo = Math.max(b.sobre, v);
          if (novo !== b.sobre) { const sob = Object.assign({}, ea.sob || {}); por(sob, b.id, novo); ea = Object.assign({}, ea, { sob }); }
          efeitos.push({ k: 'sob', id: b.id, nome: b.nome, de: b.sobre, para: novo, v });
        }
      } else if (e.k === 'bonus') {
        if (!e.bk || !e.bv) return;
        const id = (novoId || ('t' + uid())) + (nb ? '_' + nb : ''); nb++;
        const tmp = Object.assign({}, ea.tmp || {}), b = { n: it.nome || 'Poção', k: e.bk, v: e.bv, t: numFinito(agora) || 0 };
        if (e.dur === 'descanso') b.ate = 'descanso'; else if (e.dur === 'rodadas') b.r = e.r; else if (e.bd) b.d = e.bd;
        por(tmp, id, b); ea = Object.assign({}, ea, { tmp });
        efeitos.push({ k: 'bonus', id, n: b.n, bk: e.bk, bv: e.bv, dur: e.dur, r: e.r, bd: e.bd });
      } else if (e.k === 'cond' && e.c) conds.push({ c: e.c, r: e.r });
    });
    if (mesmo) est = ea;
    const b1 = efeitos.find(x => x.k === 'barra' && x.tipo === 'rec'), o1 = efeitos.find(x => x.k === 'bonus');
    return { ok: true, estado: est, estadoAlvo: ea, mesmo, item: it, sobra: it.qtd - 1, efeitos, conds, faltam,
      barra: b1 ? { id: b1.id, nome: b1.nome, de: b1.de, para: b1.para, delta: b1.delta } : null,
      bonus: o1 ? { id: o1.id, n: o1.n, k: o1.bk, v: o1.bv, d: durTxt(o1) } : null };
  }
  /* O nome de uma condição, pelo id (as mesmas das Cenas). */
  const nomeDaCondicao = c => { const x = CONDICOES.find(y => y.id === c); return x ? x.n : c; };
  /* O que usar este item vai fazer, em palavras, antes de usar (só as poções fazem alguma coisa sozinhas). Com `alvo`
     ({ pc, calc, estado, nome }), o que faz em outro personagem. opt.semCena: as condições só valem pela cena.
     opt.semValores: sem os valores de agora de quem recebe (o jogador não vê a vida de um inimigo): "HP +30".
     ["HP 20 → 50 (+30)"] · ["HP 20 + 2d6+3, rolado na hora"] · ["Força +4 (3 turnos)"] · ["Sobrevida 15 em HP"] · [] (só gasta) */
  function previaDoUso(pc, calc, estado, it, alvo, opt) {
    const p = [];
    if (!it || it.t !== 'pocao') return p;
    const mesmo = !alvo || !alvo.pc || (pc && alvo.pc.id != null && alvo.pc.id === pc.id);
    const quem = mesmo ? { pc, calc, estado } : { pc: alvo.pc, calc: alvo.calc, estado: alvo.estado || {} };
    for (const e of efeitosDoItem(it.fx ? { fx: it.fx } : it)) {
      if (e.k === 'barra' || e.k === 'sob') {
        const ef = lerEfeito(e.val);
        if (!e.rec || !ef || ef.erro) continue;
        const nome = nomeDaBarra(pc, calc, estado, e.rec), b = barraDe(quem, e.rec, nome, mesmo);
        if (!b || (b.tipo === 'rec' && b.max == null) || (e.k === 'sob' && b.tipo !== 'rec')) { if (nome) p.push(nome + ': ' + (mesmo ? 'a barra não tem máximo' : (alvo.nome || 'quem recebe') + ' não tem essa barra')); continue; }
        if (e.k === 'barra' && opt && opt.semValores) p.push(b.nome + ' ' + (ef.fixo != null ? (ef.fixo < 0 ? '−' : '+') + numTxt(Math.abs(ef.fixo)) : (ef.sinal < 0 ? '− ' : '+ ') + ef.dados + ', rolado na hora'));
        else if (e.k === 'barra') {
          const teto = b.tipo === 'pd' ? (b.max > 0 ? b.max : Infinity) : b.max;
          if (ef.fixo != null) p.push(b.nome + ' ' + numTxt(b.atual) + ' → ' + numTxt(Math.min(teto, Math.max(b.tipo === 'pd' ? 0 : Math.min(0, b.min || 0), b.atual + ef.fixo))) + ' (' + (ef.fixo < 0 ? '−' : '+') + numTxt(Math.abs(ef.fixo)) + ')');
          else p.push(b.nome + ' ' + numTxt(b.atual) + (ef.sinal < 0 ? ' − ' : ' + ') + ef.dados + ', rolado na hora');
        } else if (ef.fixo != null) p.push('Sobrevida ' + numTxt(Math.max(0, ef.fixo)) + ' em ' + b.nome + (!(opt && opt.semValores) && b.sobre > Math.max(0, ef.fixo) ? ' (fica a que já tem: ' + numTxt(b.sobre) + ')' : ''));
        else p.push('Sobrevida ' + ef.dados + ' em ' + b.nome + ', rolada na hora' + (!(opt && opt.semValores) && b.sobre ? ' (fica a maior: já tem ' + numTxt(b.sobre) + ')' : ''));
      } else if (e.k === 'bonus') {
        if (e.bk && e.bv) p.push((NOMES_BONUS[e.bk] || e.bk) + ' ' + (e.bv > 0 ? '+' : '−') + numTxt(Math.abs(e.bv)) + (durTxt(e) ? ' (' + durTxt(e) + ')' : ''));
      } else if (e.k === 'cond' && e.c) p.push('Condição: ' + nomeDaCondicao(e.c) + (e.r ? ' (' + (e.r === 1 ? '1 rodada' : e.r + ' rodadas') + ')' : '') + (opt && opt.semCena ? ' — só pela cena, no token' : ''));
    }
    return p;
  }
  /* O resultado de um uso, numa linha (para o aviso e para a mesa ao vivo):
     "HP 20 → 29 (+9) · Força +3 (3 turnos) · Abençoado · restam 2". opt.semValores: sem os valores de quem recebeu
     ("HP +9"), para a mesa não ficar sabendo da vida de um inimigo. opt.semCena: usada fora da cena, a condição não foi
     para token nenhum ("Abençoado: só pela cena"). */
  function textoDoUso(u, opt) {
    const p = [], sv = !!(opt && opt.semValores);
    for (const e of u.efeitos || []) {
      if (e.k === 'barra' && sv) p.push(e.nome + ' ' + (e.delta < 0 ? '−' : '+') + numTxt(Math.abs(e.delta)));
      else if (e.k === 'barra') p.push(e.nome + ' ' + numTxt(e.de) + ' → ' + numTxt(e.para) + (e.delta ? ' (' + (e.delta > 0 ? '+' : '−') + numTxt(Math.abs(e.delta)) + ')' : ''));
      else if (e.k === 'sob') p.push('Sobrevida ' + numTxt(sv ? e.v : e.para) + ' em ' + e.nome);
      else if (e.k === 'bonus') p.push((NOMES_BONUS[e.bk] || e.bk) + ' ' + (e.bv > 0 ? '+' : '−') + numTxt(Math.abs(e.bv)) + (durTxt(e) ? ' (' + durTxt(e) + ')' : ''));
    }
    for (const c of u.conds || []) p.push(nomeDaCondicao(c.c) + (opt && opt.semCena ? ': só pela cena' : c.r ? ' (' + (c.r === 1 ? '1 rodada' : c.r + ' rodadas') + ')' : ''));
    if (u.faltam && u.faltam.length) p.push('sem ' + u.faltam.join(', '));
    p.push(u.sobra === 0 ? 'era a última unidade' : u.sobra === 1 ? 'resta 1' : 'restam ' + u.sobra);
    return p.join(' · ');
  }

  /* ---------- relacionamentos (com romance, e com o que o mestre esconde) ---------- */
  const copiaJ = x => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const romDe = v => (v == null || v === '' || numFinito(v) == null ? null : inteiroEntre(v, -ROM_MAX, ROM_MAX));
  function umaRelacao(id, e, ordem) {
    const o = numFinito(e.o);
    return { id: String(id), alvo: e.alvo ? String(e.alvo) : null, nome: String(e.nome == null ? '' : e.nome).slice(0, 80),
      v: inteiroEntre(e.v, -100, 100), rom: romDe(e.rom), oc: !!e.oc, o: o == null ? ordem : o };
  }
  /* As linhas que estão na ficha, em ordem. Numa linha de valor escondido (oc) o v e o rom vêm zerados: não estão ali. */
  function relacoes(estado) {
    const out = [];
    if (estado && ehObjeto(estado.rels)) Object.keys(estado.rels).forEach((id, i) => { const e = estado.rels[id]; if (ehObjeto(e)) out.push(umaRelacao(id, e, i)); });
    else if (estado && Array.isArray(estado.rel)) estado.rel.forEach((e, i) => { if (ehObjeto(e) && e.id) out.push(umaRelacao(e.id, e, i)); });
    out.forEach(e => { if (e.oc) { e.v = 0; e.rom = null; } });
    return out.sort(porOrdem('o'));
  }
  const temRelacoes = estado => relacoes(estado).length > 0;
  // a ficha ainda guarda os relacionamentos no formato antigo (a lista)?
  const relLegado = estado => !!estado && Array.isArray(estado.rel) && !ehObjeto(estado.rels);
  function visaoDoMestre(lista, seg, tudoDoMestre) {
    const out = [], vistos = {};
    lista.forEach(e => {
      por(vistos, e.id, true);
      const s = ehObjeto(seg) && tem(seg, e.id) && ehObjeto(seg[e.id]) ? seg[e.id] : null;
      if (e.oc) out.push(Object.assign({}, e, { v: s ? inteiroEntre(s.v, -100, 100) : 0, rom: s ? romDe(s.rom) : null, modo: 'valor' }));
      else out.push(Object.assign({}, e, { modo: tudoDoMestre ? 'mestre' : 'aberta' }));
    });
    if (ehObjeto(seg)) Object.keys(seg).forEach((id, i) => {
      const s = seg[id];
      if (tem(vistos, id) || !ehObjeto(s) || !s.l) return;
      out.push(Object.assign(umaRelacao(id, s, 1e6 + i), { oc: false, modo: 'mestre' }));
    });
    return out.sort(porOrdem('o'));
  }
  /* O que o mestre vê: as linhas da ficha (as de valor escondido, com o valor que ele guarda) e as que só ele tem.
     Cada linha ganha `modo`: 'aberta' (está toda na ficha), 'valor' (o nome na ficha, o valor com o mestre) ou
     'mestre' (a linha inteira com o mestre).
     `npc`: a ficha não é de jogador. Os relacionamentos de um NPC são do mestre; os que ainda estão na ficha no
     formato antigo contam como dele (e passam para ele na primeira mudança — ver mexerRelacao). */
  function relacoesDoMestre(estado, seg, npc) {
    return visaoDoMestre(relacoes(estado), seg, !!npc && relLegado(estado));
  }
  // o estado com as linhas dadas, no formato novo (o antigo sai)
  function comRelacoes(estado, lista) {
    const e = Object.assign({}, estado), m = {};
    lista.forEach(x => {
      const o = { nome: x.nome, o: x.o };
      if (x.alvo) o.alvo = x.alvo;
      if (x.oc) o.oc = 1; else { o.v = x.v; if (x.rom != null) o.rom = x.rom; }
      por(m, x.id, o);
    });
    delete e.rel;
    if (lista.length) e.rels = m; else delete e.rels;
    return e;
  }
  const linhaDoMestre = x => { const o = { l: 1, nome: x.nome, v: x.v, o: x.o }; if (x.alvo) o.alvo = x.alvo; if (x.rom != null) o.rom = x.rom; return o; };
  const valorDoMestre = x => { const o = { v: x.v }; if (x.rom != null) o.rom = x.rom; return o; };
  /* Uma mudança nos relacionamentos de um personagem → { estado, seg, mudou }, sem alterar o que recebeu.
     `seg` é o que o mestre guarda desse personagem (quem não é o mestre passa null: só mexe nas linhas abertas).
     op.t:
       'nova'      { id, alvo, nome, v, rom, o, comMestre }   cria (com o mestre, se comMestre; senão, aberta na ficha)
       'valor'     { id, v }      'rom' { id, rom }  (rom null tira a trilha)      'nome' { id, nome }
       'esconder'  { id }   aberta → valor escondido          'revelar' { id }   valor escondido → aberta
       'guardar'   { id }   aberta → só com o mestre          'abrir'   { id }   só com o mestre → aberta
       'tirar'     { id }
       'guardar-legado'  {}   (só com op.npc) passa para o mestre o que a ficha de um NPC tem no formato antigo
     op.npc: a ficha é de um NPC. Antes de qualquer mudança do mestre, o que ela tem no formato antigo passa para ele. */
  function mexerRelacao(estado, seg, op) {
    const mestre = seg !== null && seg !== undefined, t = op && op.t;
    const s = ehObjeto(seg) ? copiaJ(seg) : {};
    let lista = relacoes(estado), mudouE = false, mudouS = false;
    if (mestre && op && op.npc && relLegado(estado)) {
      lista.forEach(e => { if (!(tem(s, e.id) && ehObjeto(s[e.id]) && s[e.id].l)) por(s, e.id, linhaDoMestre(e)); });
      lista = []; mudouE = mudouS = true;
    }
    const todas = mestre ? visaoDoMestre(lista, s, false) : lista.map(e => Object.assign({}, e, { modo: e.oc ? 'valor' : 'aberta' }));
    const achar = id => todas.find(e => e.id === String(id)) || null;
    const naFicha = id => lista.find(e => e.id === String(id)) || null;
    const proxima = () => todas.reduce((m, e) => Math.max(m, e.o < 1e6 ? e.o : -1), -1) + 1;
    const fim = () => ({ estado: mudouE ? comRelacoes(estado, lista) : estado, seg: mudouS ? s : seg, mudou: mudouE || mudouS });
    if (t === 'guardar-legado') return fim();
    if (t === 'nova') {
      const id = String(op.id || uid());
      if (achar(id)) return fim();
      const e = umaRelacao(id, { alvo: op.alvo, nome: op.nome, v: op.v || 0, rom: op.rom, o: numFinito(op.o) == null ? proxima() : op.o }, 0);
      if (op.comMestre && mestre) { por(s, id, linhaDoMestre(e)); mudouS = true; }
      else { lista.push(e); mudouE = true; }
      return fim();
    }
    const e = achar(op && op.id);
    if (!e) return fim();
    const f = naFicha(e.id);
    if (t === 'valor' || t === 'rom' || t === 'nome') {
      const antes = { v: e.v, rom: e.rom, nome: e.nome };
      if (t === 'valor') e.v = inteiroEntre(op.v, -100, 100);
      else if (t === 'rom') e.rom = romDe(op.rom);
      else e.nome = String(op.nome == null ? '' : op.nome).slice(0, 80);
      if (antes.v === e.v && antes.rom === e.rom && antes.nome === e.nome) return fim();
      if (e.modo === 'aberta') { Object.assign(f, { v: e.v, rom: e.rom, nome: e.nome }); mudouE = true; }
      else if (!mestre) return fim();                                         // o valor não está com quem pediu
      else if (e.modo === 'valor') { if (t === 'nome') { f.nome = e.nome; mudouE = true; } else { por(s, e.id, valorDoMestre(e)); mudouS = true; } }
      else { por(s, e.id, linhaDoMestre(e)); mudouS = true; }
    } else if (t === 'tirar') {
      if (e.modo !== 'aberta' && !mestre) return fim();
      if (f) { lista = lista.filter(x => x.id !== e.id); mudouE = true; }
      if (tem(s, e.id)) { delete s[e.id]; mudouS = true; }
    } else if (!mestre) return fim();
    else if (t === 'esconder' && e.modo === 'aberta') { por(s, e.id, valorDoMestre(e)); f.oc = true; mudouE = mudouS = true; }
    else if (t === 'revelar' && e.modo === 'valor') { Object.assign(f, { oc: false, v: e.v, rom: e.rom }); delete s[e.id]; mudouE = mudouS = true; }
    else if (t === 'guardar' && e.modo !== 'mestre') { por(s, e.id, linhaDoMestre(e)); lista = lista.filter(x => x.id !== e.id); mudouE = mudouS = true; }
    else if (t === 'abrir' && e.modo === 'mestre') { lista.push(Object.assign(umaRelacao(e.id, e, e.o), { oc: false })); delete s[e.id]; mudouE = mudouS = true; }
    return fim();
  }
  // a linha (na visão de quem pede) do que o personagem sente por `alvo`
  function relacaoCom(estado, seg, alvo, npc) {
    const l = seg === null || seg === undefined ? relacoes(estado) : relacoesDoMestre(estado, seg, npc);
    return l.find(e => e.alvo === alvo) || null;
  }

  /* ---------- missões ---------- */
  /* As missões de um mapa { [id]: { t: título, d: descrição, r: recompensa, e: estado, de: 'm' | 'j' (quem criou),
     c: quando, o:{ [id]: { t: texto, ok, n: ordem } } } } → lista em ordem (as ativas primeiro, cada grupo pela criação),
     com os objetivos em ordem e a conta de quantos estão feitos. */
  function missoes(mapa) {
    const out = [];
    if (ehObjeto(mapa)) Object.keys(mapa).forEach(id => {
      const m = mapa[id];
      if (!ehObjeto(m)) return;
      const objs = [];
      if (ehObjeto(m.o)) Object.keys(m.o).forEach((oid, i) => { const o = m.o[oid]; if (ehObjeto(o)) objs.push({ id: oid, t: String(o.t == null ? '' : o.t).slice(0, 200), ok: !!o.ok, n: numFinito(o.n) == null ? i : numFinito(o.n) }); });
      objs.sort(porOrdem('n'));
      out.push({ id, t: String(m.t == null ? '' : m.t).slice(0, 120), d: String(m.d == null ? '' : m.d).slice(0, 2000), r: String(m.r == null ? '' : m.r).slice(0, 300),
        e: MIS_ESTADOS.some(x => x.k === m.e) ? m.e : 'ativa', de: m.de === 'j' ? 'j' : 'm', c: numFinito(m.c) || 0,
        objs, feitos: objs.filter(o => o.ok).length, total: objs.length });
    });
    const peso = { ativa: 0, feita: 1, falhou: 2 };
    return out.sort((a, b) => (peso[a.e] - peso[b.e]) || (a.c - b.c) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  /* ---------- a barra de XP ---------- */
  const XP_PASSO = 10;                      // a cada nível o máximo cresce isto (sem máximo digitado, vale isto × nível)
  /* estado.xp → { v, min, max, falta, fracao (0 a 1), cheia, minProprio, maxProprio }.
     minProprio / maxProprio: o limite foi digitado (está guardado); senão é o de costume. */
  function xpDe(estado, nivel) {
    const x = estado && ehObjeto(estado.xp) ? estado.xp : {};
    const minP = numFinito(x.min), maxP = numFinito(x.max), lv = Math.max(1, Math.round(numFinito(nivel) || 1));
    const min = minP == null ? 0 : minP, max = Math.max(min, maxP == null ? XP_PASSO * lv : maxP);
    const vP = numFinito(x.v), v = Math.max(min, vP == null ? min : vP), faixa = max - min;
    return { v, min, max, falta: Math.max(0, max - v), fracao: faixa > 0 ? Math.max(0, Math.min(1, (v - min) / faixa)) : 1, cheia: v >= max,
      minProprio: minP != null, maxProprio: maxP != null };
  }
  /* O estado depois de subir de nível (de `nivel` para o seguinte): o que passou do máximo fica, o mínimo não muda,
     o máximo ganha XP_PASSO (o digitado é somado; o de costume acompanha o nível sozinho). Não altera o que recebeu. */
  /* (lote 16) O aniversário do personagem, no calendário do mundo. A ficha guarda ficha.aniv = { d (o dia do mês), m (o
     mês, de 0), a (o ano de nascimento; opcional) }; meses: os do calendário ([{ nome, dias }]).
     anivOk: o aniversário que vale (o dia preso ao tamanho do mês), ou null.
     aniversario: → { hoje (é hoje), faltam (os dias até o próximo; 0 hoje), idade (os anos que tem — os que faz, se é
     hoje; null sem o ano) } ou null (sem aniversário, ou sem o dia de hoje do mundo). */
  function anivOk(v, meses) {
    if (!ehObjeto(v)) return null;
    const ms = Array.isArray(meses) && meses.length ? meses : null, m = numFinito(v.m), d = numFinito(v.d);
    if (m == null || d == null) return null;
    const mi = Math.round(m);
    if (mi < 0 || (ms && mi >= ms.length) || mi > 99) return null;
    const lim = ms ? Math.max(1, Math.round(numFinito(ms[mi] && ms[mi].dias) || 30)) : 99, di = Math.round(d);
    if (di < 1 || di > lim) return null;
    const o = { d: di, m: mi }, a = numFinito(v.a);
    if (a != null && Math.abs(a) <= 1e6) o.a = Math.round(a);
    return o;
  }
  function aniversario(aniv, hoje, meses) {
    const ms = Array.isArray(meses) && meses.length ? meses : null, x = anivOk(aniv, ms);
    if (!x || !ms || !ehObjeto(hoje)) return null;
    const dias = ms.map(mm => Math.max(1, Math.round(numFinito(mm && mm.dias) || 30))), total = dias.reduce((s, n) => s + n, 0);
    const pos = (m, d) => dias.slice(0, m).reduce((s, n) => s + n, 0) + d - 1;
    const pa = pos(x.m, x.d), ph = pos(Math.max(0, Math.min(ms.length - 1, Math.round(+hoje.m || 0))), Math.max(1, Math.round(+hoje.d || 1)));
    const faltam = ((pa - ph) % total + total) % total;
    const idade = x.a == null || !Number.isFinite(+hoje.a) ? null : Math.round(+hoje.a) - x.a - (ph < pa ? 1 : 0);
    return { hoje: faltam === 0, faltam, idade };
  }
  function subirNivelXp(estado, nivel) {
    const x = xpDe(estado, nivel), e = Object.assign({}, estado), novo = Object.assign({}, estado && ehObjeto(estado.xp) ? estado.xp : {});
    novo.v = x.min + Math.max(0, x.v - x.max);
    if (x.maxProprio) novo.max = x.max + XP_PASSO;
    e.xp = novo;
    return e;
  }

  /* ---------- resumo para os outros apps ---------- */
  /* objeto pequeno e plano (vai bem em JSON) com o que a mesa, o rolador e as cenas
     precisam de uma ficha sem ter de recalcular */
  function resumo(pc, cfg, extra, estado) {
    // os bônus temporários moram no estado: entram sozinhos, a não ser que quem chama já os tenha passado
    const ex = Object.assign({}, extra);
    if (ex.temp === undefined && estado) ex.temp = estado.tmp;
    if (ex.fer === undefined && estado) ex.fer = estado.fer;
    const c = calcular(pc, cfg, ex);
    const attrs = {}, base = {}, der = {}, def = {}, defEsp = {};
    ATRIBS.forEach(a => { attrs[a.k] = c.tot[a.k]; base[a.k] = c.base[a.k]; });
    DERIV.forEach(d => { der[d.k] = c.der[d.k]; });
    DEFESAS.forEach(d => { def[d.k] = c.def[d.k]; });
    DEFESAS_ESP.forEach(d => { defEsp[d.k] = c.defEsp[d.k]; });
    return {
      nome: pc.nome || '', lado: pc.lado || 'Aliado',
      attrs, base, der, def, defEsp,
      recursos: estadoRecursos(pc, c, estado),
      ini: iniDe(pc, c.vars).val,
      fixa: (pc.rol && pc.rol.fixa) || 0,
      fonte: (pc.rol && pc.rol.fonte) || 'total'
    };
  }

  const api = {
    ATRIBS, DERIV, DEFESAS, TIERS_ATR, CHAVES_BONUS, NOMES, ehDerivado, ehDefesa,
    cfgPadrao, personagemPadrao,
    evalFormula, calcular, valorDoAtributo, somaPercentuaisUsados,
    bonusDaArvore, unicasDe, iniciativa, estadoRecursos, aplicarDelta, podreDe, resumo,
    ESPECIAL_PADRAO, REC_ESPECIAL, especiais, mudarEspecial, textoRecEspecial,
    FAD_MAX, FADIGA, fadiga, usaFadiga, mudarFadiga, mexerNaMente, grupoDeTroca, equiparItem, reqDoItem, reqsDoItem, reqAtendido, itemAtivo, nomeDoReq, textoDoEquipar,
    TIPOS_ITEM, TIPOS_MAX, tiposCriados, tiposDeItem, tipoDoItem, secoesDeItens, tipoPeloNome,
    NIVEIS_MAX, temNiveis, nivelDoItem, niveisDoItem, itemNoNivel, espelharItem, itemComNivelNovo, itemSemNivel, textoDoNivel,
    MARCAS_BARRA, barraEspecial, marcaDaBarra, textoDaMarca,
    temTranca, visiveis, bibVisivel, ramosDe, bibComRamos, partesComContas, textoComContas, explicarConta, MAX_USO, usoLimpo, custoDeUso, textoDoCusto,
    normNome,
    DEFESAS_ESP, CHAVES_ESP, ehDefesaEsp, NOMES_BONUS, CHAVE_TODOS, BOLSAS,
    temporarios, bolsa, lerEfeito, usarItem, previaDoUso, textoDoUso, efeitosDoItem, faixaDoEfeito, nomeDaBarra, COND_GRUPOS, CONDICOES, nomeDaCondicao,
    PARTES, TIPOS_FER, GRAVIDADES, ESTADOS_FER, ferimentos, textoDoFerimento, sinalDeFerido, AMPUTAVEIS, ABAIXO, amputados,
    ROM_MAX, relacoes, temRelacoes, relacoesDoMestre, mexerRelacao, relacaoCom,
    MIS_ESTADOS, missoes,
    XP_PASSO, xpDe, subirNivelXp, anivOk, aniversario
  };

  (root.TC || (root.TC = {})).rules = api;
  /* em página de verdade window é o próprio global; em teste pode ser um objeto à parte */
  if (typeof window !== 'undefined' && window && window !== root) (window.TC || (window.TC = root.TC)).rules = api;
  if (typeof module !== 'undefined' && module && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
