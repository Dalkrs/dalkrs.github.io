/* Tiny Cats · os mistérios (lote 53): a conta pura (sem página, sem DOM). Roda no Escudo do mestre (a aba Mistérios),
   nas Cenas (a cena do crime e as marcas de pista), nas Pistas (o mural de quem joga), na casca e no Node (testes).
   Os documentos da mesa:
     escudo:caso:<id>          o caso, como o mestre o vê: o tipo, a vítima, o culpado, o motivo, o método, os suspeitos
                               (com o álibi, o segredo e o que cada um sabe), as pistas de cada conclusão (três por
                               conclusão, de jeitos diferentes: a regra das três pistas), a pista falsa e a reviravolta
     escudo:mpub:<id>[@camp]   o caso aberto à mesa (vis 'mesa'): só o que o grupo já tem — as pistas entregues, os
                               suspeitos que o mestre mostrou (com as respostas do interrogatório) e o veredito
     mural:<id>[@camp]         o mural do grupo (vis 'mesa'; o SQL 0033 deixa quem joga mexer): onde está cada cartão,
                               os fios entre eles, as notas e a acusação. Em mapas por chave, para duas pessoas mexerem
                               ao mesmo tempo sem uma desfazer a outra (a gravação junta as duas)
   Tudo o que se sorteia sai de uma semente: a mesma semente, com as mesmas escolhas, dá o mesmo caso. */
(() => {
  'use strict';
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const int = (v, p, a, b) => { const n = Math.round(Number(v)); return clamp(Number.isFinite(n) ? n : p, a, b); };
  const linha = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 80);
  const texto = (v, max) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').slice(0, max || 1000);
  const idOk = v => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) && !(v in Object.prototype) ? v : null);
  const instante = v => (typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v)) ? v : null);
  function mulberry(a) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const sortear = (l, r) => l[Math.floor(r() * l.length) % l.length];
  const embaralhar = (l, r) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; };
  let seq = 0;
  const novoId = pre => { seq = (seq + 1) % 1296; return (pre || '') + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5) + seq.toString(36); };
  const novaSemente = () => 1 + Math.floor(Math.random() * 2147483000);
  const sem = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const maiuscula = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  const PRE = { caso: 'escudo:caso:', pub: 'escudo:mpub:', mural: 'mural:' };
  const idPub = (cid, camp) => PRE.pub + cid + (camp ? '@' + camp : '');
  const idMural = (cid, camp) => PRE.mural + cid + (camp ? '@' + camp : '');
  const cidDe = id => { if (typeof id !== 'string') return null; for (const p of [PRE.caso, PRE.pub, PRE.mural]) if (id.startsWith(p)) return idOk(id.slice(p.length).split('@')[0]); return null; };

  /* ---------------- as conclusões e os jeitos de pista ---------------- */
  const CONCLUSOES = { quem: 'Quem foi', como: 'Como foi', porque: 'Por quê', onde: 'Onde', oque: 'O que é', deter: 'Como deter' };
  const JEITOS = { fisica: 'Vestígio', testemunho: 'Testemunho', documento: 'Documento' };
  // onde uma pista física ou um documento costuma ficar (a cena do crime põe a marca perto disso)
  const ONDE = { corpo: 'junto do corpo', porta: 'na porta', janela: 'na janela', chao: 'no chão', mesa: 'sobre a mesa', bau: 'num baú', lareira: 'na lareira', jardim: 'do lado de fora', estante: 'na estante' };

  /* Os traços que entregam alguém: cada um com a marca na descrição do suspeito e as três pistas que apontam para ele. */
  const TRACOS = [
    { id: 'manca', d: 'manca da perna esquerda', p: [['fisica', 'chao', 'Pegadas no barro seco: um pé afunda mais que o outro, como de quem manca da perna esquerda.'], ['testemunho', null, 'Viram alguém sair pelos fundos arrastando a perna esquerda, com pressa.'], ['documento', 'mesa', 'Uma receita de unguento para dor no joelho esquerdo, esquecida dentro de um livro.']] },
    { id: 'canhoto', d: 'escreve e luta com a mão esquerda', p: [['fisica', 'corpo', 'A marca vem da esquerda: quem fez isso usa a mão esquerda.'], ['testemunho', null, '"Segurava a caneca com a mão errada", lembra quem serviu a mesa naquela noite.'], ['documento', 'mesa', 'Um bilhete com a letra inclinada para trás, borrada do lado esquerdo — de quem escreve com a esquerda.']] },
    { id: 'mirra', d: 'sempre cheira a incenso de mirra', p: [['fisica', 'chao', 'Um cheiro forte de mirra ainda está no ar, e há cinza de incenso no chão.'], ['testemunho', null, 'O vigia lembra do cheiro de incenso doce na pessoa que passou por ele.'], ['documento', 'bau', 'Um recibo do mercado: mirra, em quantidade grande, paga em prata.']] },
    { id: 'corvo', d: 'usa um anel de sinete com um corvo', p: [['fisica', 'mesa', 'Um lacre de cera ainda mole, com a marca de um corvo.'], ['testemunho', null, 'Alguém viu um anel com um pássaro preto na mão de quem entrou.'], ['documento', 'lareira', 'Uma carta meio queimada na lareira, lacrada com o sinete do corvo.']] },
    { id: 'tinta', d: 'tem os dedos manchados de tinta azul', p: [['fisica', 'porta', 'Manchas de tinta azul na maçaneta e na moldura da porta.'], ['testemunho', null, '"Tinha os dedos azuis, como de quem copia livros", diz uma testemunha.'], ['documento', 'estante', 'Uma página copiada à mão, com a tinta azul ainda fresca na margem.']] },
    { id: 'cravos', d: 'anda de botas altas com cravos de ferro', p: [['fisica', 'chao', 'Riscos de cravos de bota no assoalho, num vaivém de quem esperou ali.'], ['testemunho', null, 'Um barulho de ferro no chão de pedra, passos pesados de bota cravejada, foi o que a vizinha ouviu.'], ['documento', 'bau', 'A conta do sapateiro: um par de botas altas, com cravos de ferro na sola.']] },
    { id: 'cicatriz', d: 'tem uma cicatriz recente na palma da mão direita', p: [['fisica', 'janela', 'Uma luva rasgada presa no caixilho da janela, com sangue seco na palma direita.'], ['testemunho', null, 'O curandeiro costurou um corte fundo na mão direita de alguém, na manhã seguinte.'], ['documento', 'mesa', 'Uma anotação do curandeiro: "corte na palma direita, feito por vidro".']] },
    { id: 'cachimbo', d: 'fuma cachimbo e tem uma tosse seca', p: [['fisica', 'janela', 'Cinza de cachimbo no parapeito, e um cheiro de fumo doce.'], ['testemunho', null, 'Uma tosse seca, de quem fuma, vinha do beco naquela hora.'], ['documento', 'bau', 'Uma latinha de fumo de cereja, com a etiqueta da tabacaria da praça.']] },
    { id: 'lavanda', d: 'usa perfume de lavanda', p: [['fisica', 'corpo', 'Um lenço com cheiro de lavanda, caído perto da vítima.'], ['testemunho', null, '"Lavanda. A sala inteira cheirava a lavanda", diz quem chegou primeiro.'], ['documento', 'mesa', 'Um frasco de perfume de lavanda, com o nome de quem o comprou no rótulo do boticário.']] },
    { id: 'fuligem', d: 'tem fuligem nas roupas, de quem trabalha na forja', p: [['fisica', 'porta', 'Marcas de fuligem preta na porta, na altura de uma mão.'], ['testemunho', null, 'Alguém que cheirava a carvão comprou uma corda no fim da tarde, conta o vendedor.'], ['documento', 'bau', 'Uma encomenda da forja, com a data da noite do crime e uma assinatura apressada.']] },
  ];

  /* Os tipos de caso. con: as conclusões (a primeira é a mais importante). As tabelas de cada conclusão: cada opção
     tem o que ela é (o que o mestre lê) e as três pistas dela [jeito, onde, texto]. */
  const TIPOS = {
    assassinato: {
      n: 'Assassinato', con: ['quem', 'como', 'porque'], cenas: ['mansao', 'taverna', 'beco'],
      vitimas: ['o dono da casa, um mercador rico', 'a dona da taverna', 'um nobre em visita', 'o sacerdote da vila', 'uma herdeira recém-chegada', 'o cobrador de impostos'],
      como: [
        { d: 'veneno no vinho', p: [['fisica', 'mesa', 'A taça tem um resto amargo e esverdeado no fundo.'], ['testemunho', null, 'O cozinheiro conta que a vítima reclamou do gosto do vinho antes de passar mal.'], ['documento', 'estante', 'No livro do boticário: um frasco de beladona vendido dois dias antes, sem o nome de quem comprou.']] },
        { d: 'um punhal pelas costas', p: [['fisica', 'corpo', 'Um corte estreito e fundo, nas costas: um punhal fino, de lâmina dupla.'], ['testemunho', null, 'A criada ouviu um gemido curto, e depois nada — "ninguém gritou".'], ['documento', 'bau', 'A bainha vazia de um punhal, embrulhada num pano, dentro de um baú.']] },
        { d: 'estrangulamento com um cordão', p: [['fisica', 'corpo', 'Marcas roxas e finas no pescoço: um cordão de seda.'], ['testemunho', null, 'Um vizinho ouviu móveis sendo arrastados, como numa luta curta.'], ['documento', 'chao', 'Um pedaço de cordão de cortina, cortado, caído atrás do sofá.']] },
        { d: 'empurrado da escada', p: [['fisica', 'chao', 'No alto da escada, a madeira do corrimão está rachada, como se alguém tivesse se agarrado.'], ['testemunho', null, 'Duas vozes discutindo no andar de cima, e então um estrondo, conta a ajudante.'], ['documento', 'mesa', 'Um bilhete marcando um encontro "no alto, depois da ceia".']] },
      ],
      porque: [
        { d: 'a herança', p: [['documento', 'estante', 'Um testamento novo, ainda sem selo, que muda quem fica com tudo.'], ['testemunho', null, 'O tabelião diz que a vítima ia mudar o testamento nesta semana.'], ['fisica', 'lareira', 'Pedaços de um papel com o selo do tabelião, queimados pela metade.']] },
        { d: 'uma dívida que não podia ser paga', p: [['documento', 'bau', 'Um livro de contas: uma dívida enorme, com juros que dobram por mês.'], ['testemunho', null, 'Sabiam na taverna que a vítima ia cobrar tudo de uma vez, na frente de todos.'], ['fisica', 'mesa', 'Uma bolsa de moedas aberta e vazia, e as promissórias rasgadas.']] },
        { d: 'ciúme', p: [['documento', 'estante', 'Cartas de amor escondidas num livro, assinadas só com uma inicial.'], ['testemunho', null, '"Os dois brigaram feio por causa dela na semana passada", conta um vizinho.'], ['fisica', 'corpo', 'Um medalhão aberto na mão da vítima, com o retrato arrancado.']] },
        { d: 'um segredo que a vítima descobriu', p: [['documento', 'lareira', 'Anotações da vítima: nomes, datas e "contar ao conselho amanhã".'], ['testemunho', null, 'A vítima disse a um amigo que "sabia de tudo" e que ia falar.'], ['fisica', 'bau', 'Um baú arrombado, onde a vítima guardava os papéis; o fundo falso está aberto.']] },
        { d: 'vingança por uma morte antiga', p: [['documento', 'bau', 'Uma lista de nomes, a maioria riscada; o da vítima é o próximo.'], ['testemunho', null, 'Os mais velhos lembram de um incêndio, anos atrás, de que a vítima foi culpada.'], ['fisica', 'corpo', 'Um broche antigo, de uma família que todos achavam extinta, deixado sobre o peito da vítima.']] },
      ],
    },
    roubo: {
      n: 'Roubo ou sumiço', con: ['quem', 'como', 'onde'], cenas: ['mansao', 'taverna'],
      vitimas: ['o cálice sagrado do templo', 'as joias da família', 'o cofre da guilda', 'um mapa antigo', 'a espada do avô', 'um livro de magia trancado'],
      como: [
        { d: 'uma cópia da chave', p: [['fisica', 'porta', 'A fechadura está intacta: abriram com a chave.'], ['testemunho', null, 'O ferreiro fez uma cópia de chave na semana passada, "para alguém de confiança da casa".'], ['documento', 'mesa', 'Um molde de cera com o formato da chave, esquecido numa gaveta.']] },
        { d: 'a janela forçada', p: [['fisica', 'janela', 'Marcas de alavanca no caixilho da janela, de fora para dentro.'], ['testemunho', null, 'O guarda da rua viu uma escada encostada na parede, de madrugada.'], ['documento', 'jardim', 'Um desenho rabiscado da casa, com a janela marcada com um X.']] },
        { d: 'uma passagem escondida', p: [['fisica', 'estante', 'A estante range e tem pó só de um lado: ela se mexe.'], ['testemunho', null, 'Um velho criado conta da passagem que o avô mandou fazer, "e que ninguém mais usa".'], ['documento', 'bau', 'A planta antiga da casa, com uma passagem desenhada atrás da estante.']] },
        { d: 'a troca por uma cópia falsa', p: [['fisica', 'mesa', 'O objeto que ficou é leve demais: é uma cópia pintada.'], ['testemunho', null, 'Um artesão da cidade fez uma réplica igualzinha, sob encomenda, há um mês.'], ['documento', 'bau', 'Um recibo de um artesão: "réplica, pintada e envelhecida".']] },
      ],
      onde: [
        { d: 'enterrado no quintal', p: [['fisica', 'jardim', 'Terra revirada há pouco no canteiro, embaixo da roseira.'], ['testemunho', null, 'O vizinho ouviu uma pá, de madrugada, "achei que era o jardineiro".'], ['documento', 'mesa', 'Um bilhete: "embaixo das rosas, até a poeira baixar".']] },
        { d: 'escondido no porão de um cúmplice', p: [['documento', 'bau', 'Um acordo de divisão, com dois nomes, e o endereço de um porão.'], ['testemunho', null, 'Viram alguém carregando um embrulho pesado para a casa do outro lado da praça.'], ['fisica', 'chao', 'Um rastro de serragem que sai pela porta, de um caixote arrastado.']] },
        { d: 'já vendido a um receptador', p: [['documento', 'bau', 'Uma promissória de um receptador conhecido do porto.'], ['testemunho', null, 'No porto, falam de uma peça rara oferecida baratinho ontem à noite.'], ['fisica', 'mesa', 'Moedas estrangeiras novas, das que só os marinheiros usam.']] },
        { d: 'no fundo do poço', p: [['fisica', 'jardim', 'Uma corda nova amarrada na roldana do poço.'], ['testemunho', null, 'A lavadeira ouviu algo pesado cair na água do poço.'], ['documento', 'mesa', 'Um mapa da casa com o poço marcado.']] },
      ],
    },
    desaparecimento: {
      n: 'Desaparecimento', con: ['onde', 'quem', 'porque'], cenas: ['beco', 'taverna', 'clareira'],
      vitimas: ['a filha do moleiro', 'um aprendiz de mago', 'o filho do ferreiro', 'uma mensageira da guilda', 'o velho pastor', 'uma noiva, na véspera do casamento'],
      onde: [
        { d: 'preso no porão de uma casa abandonada', p: [['fisica', 'chao', 'Um pedaço de fita de cabelo preso na grade de um alçapão.'], ['testemunho', null, 'De noite, os vizinhos ouvem batidas que vêm de baixo da casa abandonada.'], ['documento', 'mesa', 'Uma lista de mantimentos — pão, água, cobertor — para "o de baixo".']] },
        { d: 'no moinho velho, fora da vila', p: [['fisica', 'porta', 'Farinha nas solas e nas marcas de mão: veio do moinho.'], ['testemunho', null, 'Um lenhador viu luz no moinho velho, que está parado há anos.'], ['documento', 'mesa', 'Um bilhete: "leve ao moinho quando a lua sumir".']] },
        { d: 'levado num barco para outra cidade', p: [['fisica', 'chao', 'Areia molhada e uma escama de peixe na roupa deixada para trás.'], ['testemunho', null, 'No cais, um barqueiro levou "uma pessoa encapuzada e muito quieta" ao amanhecer.'], ['documento', 'bau', 'Uma passagem de barco comprada em nome falso.']] },
        { d: 'numa caverna na floresta', p: [['fisica', 'jardim', 'Folhas e lama da floresta funda nas pegadas da porta.'], ['testemunho', null, 'Os caçadores falam de gritos perto da caverna da cachoeira.'], ['documento', 'mesa', 'Um mapa rabiscado da floresta, com uma caverna marcada.']] },
      ],
      porque: [
        { d: 'um resgate', p: [['documento', 'porta', 'Um bilhete de resgate pregado na porta: o preço e o prazo.'], ['testemunho', null, 'Alguém perguntou na taverna quanto a família tinha guardado.'], ['fisica', 'mesa', 'Um saco vazio, do tamanho certo para as moedas do resgate.']] },
        { d: 'um ritual que precisa dessa pessoa', p: [['documento', 'estante', 'Um livro aberto num ritual que pede "alguém nascido na lua cheia".'], ['testemunho', null, 'A parteira lembra: essa pessoa nasceu numa noite de lua cheia.'], ['fisica', 'chao', 'Um círculo de giz meio apagado e velas derretidas.']] },
        { d: 'fugiu por vontade própria, de um casamento arranjado', p: [['documento', 'bau', 'Cartas de amor escondidas, com um plano de fuga.'], ['testemunho', null, 'A melhor amiga confessa que sabia do plano.'], ['fisica', 'janela', 'Uma trouxa de roupas que faltam no armário, e a janela destrancada por dentro.']] },
        { d: 'viu algo que não devia', p: [['testemunho', null, 'Essa pessoa disse a um amigo que tinha visto "coisas no armazém do porto".'], ['documento', 'mesa', 'Um desenho do armazém, com caixotes marcados com um símbolo estranho.'], ['fisica', 'chao', 'Um caixote com o mesmo símbolo, largado no beco.']] },
      ],
    },
    maldicao: {
      n: 'Maldição ou assombração', con: ['quem', 'porque', 'deter'], cenas: ['cripta', 'mansao'],
      vitimas: ['a família da casa grande', 'os moradores da rua do poço', 'o novo dono da taverna', 'as crianças da vila', 'os pescadores do porto'],
      porque: [
        { d: 'um túmulo profanado', p: [['fisica', 'chao', 'Terra de cemitério e pedaços de lápide quebrada no porão.'], ['testemunho', null, 'O coveiro conta que um túmulo antigo foi aberto há um mês.'], ['documento', 'estante', 'Um diário: "ninguém vai sentir falta de um anel de morto".']] },
        { d: 'um objeto amaldiçoado que alguém trouxe', p: [['fisica', 'mesa', 'Um espelho de prata, frio ao toque, que mostra a sala um pouco diferente.'], ['testemunho', null, 'Tudo começou quando chegou aquela caixa do mercador estrangeiro, diz a criada.'], ['documento', 'bau', 'O recibo do objeto, com um aviso riscado: "não abrir".']] },
        { d: 'uma injustiça antiga, nunca vingada', p: [['documento', 'estante', 'Um processo antigo: alguém enforcado por um crime que não cometeu.'], ['testemunho', null, 'Os velhos dizem que a vítima daquele julgamento jurou voltar.'], ['fisica', 'porta', 'Uma corda de forca, velha e úmida, aparece pendurada na porta todas as noites.']] },
        { d: 'um pacto que não foi cumprido', p: [['documento', 'lareira', 'Um contrato escrito em sangue seco, com o prazo vencido.'], ['testemunho', null, 'Dizem que o avô "fez um trato" e ficou rico de repente.'], ['fisica', 'chao', 'Um símbolo queimado no assoalho, que volta mesmo depois de lixado.']] },
      ],
      deter: [
        { d: 'devolver o que foi tirado ao seu lugar', p: [['documento', 'estante', 'Uma lenda local: "o que é dos mortos, aos mortos volta".'], ['testemunho', null, 'O sacerdote diz que a assombração só quer o que é dela.'], ['fisica', 'mesa', 'Nas noites calmas, o objeto aparece sempre virado para o cemitério.']] },
        { d: 'enterrar os ossos em solo sagrado', p: [['fisica', 'chao', 'Ossos antigos emparedados no porão, atrás de tijolos novos.'], ['testemunho', null, 'O sacerdote ensina: o espírito descansa quando o corpo é abençoado.'], ['documento', 'estante', 'Um registro antigo: o corpo nunca foi enterrado.']] },
        { d: 'dizer o nome verdadeiro do espírito', p: [['documento', 'estante', 'Uma árvore da família com um nome riscado.'], ['testemunho', null, 'Uma velha lembra do nome de batismo de quem morreu ali.'], ['fisica', 'lareira', 'Letras queimadas na pedra da lareira: só um pedaço do nome.']] },
      ],
    },
    licantropo: {
      n: 'Licantropo', con: ['quem', 'como', 'deter'], cenas: ['clareira', 'taverna'],
      vitimas: ['os rebanhos dos pastores', 'um caçador da vila', 'a sentinela do portão', 'o filho do curtidor'],
      como: [
        { d: 'a mordida antiga, que vira fera na lua cheia', p: [['fisica', 'corpo', 'Marcas de mordida grandes demais para um lobo comum.'], ['testemunho', null, 'Os ataques só acontecem nas três noites de lua cheia, conta o caçador.'], ['documento', 'estante', 'O calendário do templo: todas as mortes caem na lua cheia.']] },
        { d: 'uma maldição de família, que passa de pai para filho', p: [['documento', 'estante', 'A árvore da família: os mesmos ataques, há duas gerações.'], ['testemunho', null, 'A avó conta, baixinho, que "o sangue dessa família é ruim".'], ['fisica', 'bau', 'Correntes velhas e arranhadas, guardadas no porão da família.']] },
      ],
      deter: [
        { d: 'prata', p: [['testemunho', null, 'Um velho caçador garante: só a prata fere de verdade a fera.'], ['documento', 'estante', 'Um bestiário com a página marcada: "teme a prata".'], ['fisica', 'chao', 'A fera derrubou um castiçal de prata e fugiu, ferida, deixando sangue escuro.']] },
        { d: 'acônito', p: [['documento', 'estante', 'Uma receita de chá de acônito "para acalmar o lobo do sangue".'], ['testemunho', null, 'A curandeira vende acônito escondida, para alguém que vem toda lua.'], ['fisica', 'jardim', 'Flores roxas de acônito arrancadas do canteiro da curandeira.']] },
      ],
    },
    vampiro: {
      n: 'Vampiro', con: ['quem', 'onde', 'deter'], cenas: ['cripta', 'mansao'],
      vitimas: ['jovens da vila, que acordam pálidos', 'o guarda da noite', 'a filha do prefeito', 'os viajantes da estalagem'],
      onde: [
        { d: 'a cripta da família, sob a capela', p: [['fisica', 'chao', 'Terra de cripta nas dobras de uma capa preta.'], ['testemunho', null, 'O coveiro diz que a cripta da família tem a porta sempre limpa, sem teia.'], ['documento', 'estante', 'A planta da capela, com uma escada sob o altar.']] },
        { d: 'a adega sob a taverna', p: [['fisica', 'chao', 'Pó de vinho velho e terra nas pegadas que saem da adega.'], ['testemunho', null, 'O taverneiro nunca deixa ninguém descer na adega.'], ['documento', 'bau', 'Uma conta de "terra do cemitério, três carroças", entregue na taverna.']] },
        { d: 'a torre abandonada do morro', p: [['fisica', 'janela', 'Morcegos saem todos da mesma direção ao anoitecer: a torre do morro.'], ['testemunho', null, 'Um pastor viu uma luz vermelha no alto da torre, que está vazia há anos.'], ['documento', 'mesa', 'Uma chave enorme, com uma etiqueta: "torre".']] },
      ],
      deter: [
        { d: 'a luz do sol', p: [['testemunho', null, 'Ninguém nunca viu essa pessoa de dia.'], ['documento', 'estante', 'Um diário antigo: "o sol o queima como fogo".'], ['fisica', 'janela', 'Todas as janelas da casa estão pregadas por dentro.']] },
        { d: 'uma estaca no coração, enquanto dorme', p: [['documento', 'estante', 'Um bestiário: "dorme de dia num caixão; a estaca o prende".'], ['testemunho', null, 'O sacerdote velho já viu isso uma vez, e sabe o que fazer.'], ['fisica', 'bau', 'Uma estaca de freixo e um martelo, embrulhados num pano, no baú do sacerdote antigo.']] },
      ],
    },
    incubo: {
      n: 'Íncubo ou súcubo', con: ['quem', 'porque', 'deter'], cenas: ['mansao', 'taverna'],
      vitimas: ['os que dormem na estalagem, cada vez mais fracos', 'o jovem nobre, que definha', 'a noiva do capitão', 'os noviços do templo'],
      porque: [
        { d: 'alguém o invocou, por amor', p: [['documento', 'estante', 'Um livro de invocação, com a página do "amante dos sonhos" marcada.'], ['testemunho', null, 'Alguém da casa andava perguntando sobre "feitiços de amor" ao mercador.'], ['fisica', 'chao', 'Um círculo de velas vermelhas debaixo da cama.']] },
        { d: 'um pacto antigo, cobrado agora', p: [['documento', 'lareira', 'Um contrato com uma assinatura em sangue e uma data que venceu ontem.'], ['testemunho', null, 'Os ataques começaram no mesmo dia em que o velho morreu.'], ['fisica', 'mesa', 'Um anel de ouro com um olho gravado, frio como gelo.']] },
      ],
      deter: [
        { d: 'o nome verdadeiro, dito em voz alta', p: [['documento', 'estante', 'Uma página arrancada de um grimório, com nomes de demônios.'], ['testemunho', null, 'A vítima murmura sempre o mesmo nome estranho durante o sono.'], ['fisica', 'chao', 'Letras queimadas no assoalho, ao lado da cama: o começo de um nome.']] },
        { d: 'destruir o objeto que o prende', p: [['fisica', 'mesa', 'Um espelho de mão que embaça sozinho, sempre perto da vítima.'], ['testemunho', null, 'Tudo começou quando ganhou aquele presente.'], ['documento', 'bau', 'Um bilhete: "olhe para ele todas as noites".']] },
      ],
    },
    sombras: {
      n: 'Criaturas sombrias', con: ['oque', 'onde', 'deter'], cenas: ['beco', 'cripta', 'clareira'],
      vitimas: ['os que andam sozinhos à noite', 'os mineiros do turno da noite', 'os guardas da ponte', 'os gatos e os cães da vila'],
      oque: [
        { d: 'sombras que comem a luz e o calor', p: [['fisica', 'chao', 'Geada no chão, no verão, e as tochas apagadas sem vento.'], ['testemunho', null, '"A minha sombra se mexeu sozinha", jura um sobrevivente, tremendo.'], ['documento', 'estante', 'Um bestiário: "as sombras famintas fogem da luz forte".']] },
        { d: 'espectros de soldados mortos numa batalha antiga', p: [['fisica', 'chao', 'Pontas de flecha antigas, enferrujadas, que aparecem limpas de manhã.'], ['testemunho', null, 'Ouvem tambores de guerra perto da ponte, de madrugada.'], ['documento', 'estante', 'Uma crônica: uma batalha sangrenta aconteceu ali, há cem anos.']] },
      ],
      onde: [
        { d: 'uma fenda aberta nas catacumbas', p: [['fisica', 'chao', 'Um frio que vem de baixo: o chão das catacumbas está rachado.'], ['testemunho', null, 'Os mineiros ouviram a terra "respirar" no túnel velho.'], ['documento', 'mesa', 'O relatório do mestre de obras: "uma fenda sem fundo, fechamos a passagem".']] },
        { d: 'um espelho antigo na casa abandonada', p: [['fisica', 'janela', 'A casa abandonada tem um espelho sem poeira, que não reflete ninguém.'], ['testemunho', null, 'As crianças não passam perto da casa do espelho.'], ['documento', 'bau', 'O inventário da casa: "espelho de obsidiana, trazido do sul".']] },
      ],
      deter: [
        { d: 'selar a passagem com sal e runas', p: [['documento', 'estante', 'Um ritual de selamento com sal, prata e três runas.'], ['testemunho', null, 'O sábio da torre conhece o ritual, mas tem medo de fazê-lo sozinho.'], ['fisica', 'chao', 'Restos de um círculo de sal antigo, quebrado bem no meio.']] },
        { d: 'luz forte e fogo sagrado', p: [['testemunho', null, 'As sombras fugiram quando o templo acendeu as tochas bentas.'], ['documento', 'estante', 'Uma oração antiga: "a chama abençoada queima o que não tem corpo".'], ['fisica', 'chao', 'Um círculo de chão limpo e quente onde uma tocha benta caiu.']] },
      ],
    },
  };
  const ORDEM_TIPOS = Object.keys(TIPOS);
  // os cenários da cena do crime (a aba das Cenas e o que cada tipo sugere)
  const CENAS = { mansao: 'Mansão', taverna: 'Taverna', beco: 'Beco', cripta: 'Cripta', clareira: 'Clareira da lua cheia' };

  const ALIBIS = ['Diz que estava na taverna até tarde, jogando dados.', 'Diz que dormiu cedo, sozinho, com dor de cabeça.', 'Diz que estava no templo, rezando.', 'Diz que estava viajando e só voltou de manhã.', 'Diz que passou a noite na casa de um amigo, do outro lado da vila.', 'Diz que estava trabalhando até a madrugada.', 'Diz que estava cuidando de um parente doente.'];
  const DESMENTE = ['Ninguém na taverna se lembra dessa pessoa naquela noite.', 'A cama nem foi desfeita.', 'O sacerdote fechou o templo cedo.', 'O cavalo voltou suado no meio da noite.', 'O amigo conta outra história.', 'A oficina estava escura e trancada.', 'O parente diz que ficou sozinho.'];
  const SEGREDOS_FALSA = ['estava com um amante às escondidas', 'roubava pequenas coisas da casa', 'devia dinheiro ao agiota', 'pratica magia proibida em casa', 'é contrabandista no porto', 'usa um nome que não é o seu'];
  const SEGREDO_CULPADO = {
    assassinato: 'É quem matou. Mente sobre onde estava naquela noite.', roubo: 'É quem levou. Mente sobre onde estava.',
    desaparecimento: 'É quem levou a pessoa (ou ajudou a sumir com ela).', maldicao: 'É quem trouxe a maldição — por descuido ou de propósito.',
    licantropo: 'É o licantropo. Nas noites de lua cheia, não se lembra do que faz.', vampiro: 'É o vampiro, escondido sob um nome comum.',
    incubo: 'É o íncubo (ou o súcubo) disfarçado — ou quem o chamou e agora não consegue mandá-lo embora.', sombras: '',
  };
  const REVIRAVOLTAS = [
    'Havia um cúmplice: alguém de confiança da vítima ajudou o culpado e ainda está por perto.',
    'O culpado também é vítima: alguém o chantageava para fazer isso, e esse alguém quer o grupo longe.',
    'A primeira suspeita estava certa, mas pela razão errada — o grupo vai ter que mudar a teoria.',
    'Uma segunda vítima aparece no meio da investigação, e muda o que o grupo achava do motivo.',
    'A pessoa que pediu ajuda ao grupo sabe mais do que contou, e esconde uma parte da verdade.',
    'O culpado tenta incriminar alguém do próprio grupo, plantando uma prova falsa.',
  ];

  // "de" + "o dono" → "do dono" (e "da", "dos", "das")
  const de = v => { const m = /^(o|a|os|as) (.+)$/.exec(v); return m ? 'd' + m[1] + ' ' + m[2] : 'de ' + v; };
  const TITULOS = {
    assassinato: v => 'A morte ' + de(v), roubo: v => 'O sumiço ' + de(v), desaparecimento: v => 'O desaparecimento ' + de(v),
    maldicao: v => 'A maldição sobre ' + v, licantropo: v => 'A fera que ataca ' + v, vampiro: v => 'A sede que caça ' + v,
    incubo: v => 'O visitante dos sonhos ' + de(v), sombras: v => 'O que espreita ' + v,
  };

  /* ---------------- gerar ---------------- */
  /* opts: { tipo, n (suspeitos, 3 a 5), falsa (true), reviravolta (true), lugar (o nome do lugar, para o título) }
     kit: { npc: TC.npc } (sem ele, os suspeitos têm nomes simples). → o caso (normCaso) */
  function gerarCaso(opts, seed, kit) {
    opts = ehObj(opts) ? opts : {};
    const sd = int(seed, 1, 1, 2147483646), r = mulberry(sd * 17 + 3);
    const tipo = TIPOS[opts.tipo] ? opts.tipo : sortear(ORDEM_TIPOS, r), T = TIPOS[tipo];
    const n = int(opts.n, 4, 3, 5);
    const N = kit && kit.npc;
    // os suspeitos: um culpado, um inocente que vai parecer culpado (a pista falsa) e os outros
    const tracos = embaralhar(TRACOS, r).slice(0, n);
    const papeis = ['comerciante', 'artesao', 'taverneiro', 'nobre', 'sacerdote', 'guarda', 'curandeiro', 'estudioso', 'campones', 'artista'];
    const susp = [];
    for (let i = 0; i < n; i++) {
      const s = { id: 's' + (i + 1), traco: tracos[i].id };
      if (N) {
        try {
          const x = N.gerar({ papel: sortear(papeis, r) }, 1 + Math.floor(r() * 2147483000)), ds = N.descricao(x);
          Object.assign(s, { nome: x.nome, quem: ds.quem, aparencia: ds.aparencia, segredo: x.segredo, npc: x });
        } catch (e) { /* sem o gerador de NPC: os nomes simples */ }
      }
      if (!s.nome) { s.nome = ['Aldo', 'Berta', 'Cássio', 'Dora', 'Elmo'][i]; s.quem = maiuscula(sortear(papeis, r)); s.aparencia = ''; s.segredo = ''; }
      susp.push(s);
    }
    // o traço de cada um fica à vista na aparência (é por ele que as pistas apontam alguém)
    for (const s of susp) { const tr = TRACOS.find(t => t.id === s.traco); s.aparencia = [s.aparencia, maiuscula(tr.d) + '.'].filter(Boolean).join(' '); }
    const temQuem = T.con.includes('quem');
    const ordem = embaralhar(susp.map((s, i) => i), r), culp = temQuem ? susp[ordem[0]] : null, inoc = temQuem && n > 2 ? susp[ordem[1]] : null;
    const alib = embaralhar(ALIBIS.map((a, i) => i), r);
    susp.forEach((s, i) => { s.alibi = ALIBIS[alib[i % ALIBIS.length]]; s.mente = false; s.desmente = ''; });
    if (culp) { culp.culpado = true; culp.mente = true; culp.desmente = DESMENTE[alib[susp.indexOf(culp) % ALIBIS.length]]; culp.segredo = SEGREDO_CULPADO[tipo]; }
    // as escolhas de cada conclusão
    const verdade = { vitima: sortear(T.vitimas, r) };
    const pistas = [];
    let pn = 0;
    const testemunhas = susp.filter(s => !s.culpado);
    const trCulp = culp ? TRACOS.find(t => t.id === culp.traco) : null;
    const pista = (con, [jeito, onde, txt], extra) => {
      const p = Object.assign({ id: 'p' + (++pn), con, jeito, onde: jeito === 'testemunho' ? null : onde || 'chao', txt, falsa: false, de: null, entregue: null }, extra || null);
      if (jeito === 'testemunho') p.de = (extra && extra.de) || (testemunhas.length ? sortear(testemunhas, r).id : null);
      pistas.push(p);
      return p;
    };
    for (const con of T.con) {
      if (con === 'quem') { verdade.quem = culp.id; for (const p of trCulp.p) pista('quem', p, { aponta: culp.id }); continue; }
      const op = sortear(T[con], r);
      verdade[con] = op.d;
      for (const p of op.p) pista(con, p);
    }
    // a pista falsa: o traço do inocente, num vestígio que parece ligar ele ao crime — e o segredo que explica
    let falsa = null;
    if (opts.falsa !== false && inoc) {
      const tr = TRACOS.find(t => t.id === inoc.traco), f = tr.p[0];
      falsa = pista('quem', f, { falsa: true, aponta: inoc.id });
      inoc.mente = true;
      inoc.segredo = 'Mente sobre onde estava porque ' + sortear(SEGREDOS_FALSA, r) + ' — é isso que a pista falsa esconde, não o crime.';
      inoc.desmente = 'A história não fecha, mas por outro motivo: o segredo dele.';
    }
    // quem sabe o quê (os testemunhos)
    for (const s of susp) s.sabe = pistas.filter(p => p.de === s.id).map(p => p.id);
    const caso = {
      v: 1, tipo, seed: sd,
      titulo: TITULOS[tipo](verdade.vitima) + (opts.lugar ? ' (' + linha(opts.lugar, 40) + ')' : ''),
      verdade, suspeitos: susp.map(s => ({ id: s.id, nome: s.nome, quem: s.quem, aparencia: s.aparencia, traco: s.traco, alibi: s.alibi, mente: s.mente, desmente: s.desmente, segredo: s.segredo, sabe: s.sabe, culpado: !!s.culpado, npc: s.npc || null })),
      pistas, reviravolta: opts.reviravolta !== false ? { txt: sortear(REVIRAVOLTAS, r), usada: false } : null,
      cena: sortear(T.cenas, r), estado: 'preparo', camp: null, aberto: false, em: null,
    };
    return normCaso(caso);
  }

  /* ---------------- normalizar ---------------- */
  function normSuspeito(s, vistos) {
    if (!ehObj(s)) return null;
    const id = idOk(s.id); if (!id || vistos.has(id)) return null; vistos.add(id);
    return {
      id, nome: linha(s.nome, 80) || 'Suspeito', quem: linha(s.quem, 160), aparencia: linha(s.aparencia, 300), traco: TRACOS.some(t => t.id === s.traco) ? s.traco : null,
      alibi: linha(s.alibi, 240), mente: !!s.mente, desmente: linha(s.desmente, 240), segredo: linha(s.segredo, 300),
      sabe: (Array.isArray(s.sabe) ? s.sabe : []).map(idOk).filter(Boolean).slice(0, 12), culpado: !!s.culpado,
      notas: texto(s.notas, 1200), npc: ehObj(s.npc) ? s.npc : null, mostrado: !!s.mostrado, respostas: (Array.isArray(s.respostas) ? s.respostas : []).map(x => linha(x, 300)).filter(Boolean).slice(0, 30),
    };
  }
  function normPistaCaso(p, vistos) {
    if (!ehObj(p)) return null;
    const id = idOk(p.id); if (!id || vistos.has(id)) return null; vistos.add(id);
    const jeito = JEITOS[p.jeito] ? p.jeito : 'fisica';
    return {
      id, con: CONCLUSOES[p.con] ? p.con : 'quem', jeito, onde: jeito === 'testemunho' ? null : (ONDE[p.onde] ? p.onde : 'chao'), txt: texto(p.txt, 600).trim() || 'Uma pista.',
      falsa: !!p.falsa, de: idOk(p.de), aponta: idOk(p.aponta), entregue: instante(p.entregue),
      cena: ehObj(p.cena) && idOk(p.cena.sc) && idOk(p.cena.tok) ? { sc: p.cena.sc, tok: p.cena.tok } : null,
    };
  }
  function normCaso(d) {
    d = ehObj(d) ? d : {};
    const tipo = TIPOS[d.tipo] ? d.tipo : 'assassinato';
    const vs = new Set(), vp = new Set();
    const suspeitos = (Array.isArray(d.suspeitos) ? d.suspeitos : []).map(s => normSuspeito(s, vs)).filter(Boolean).slice(0, 8);
    const pistas = (Array.isArray(d.pistas) ? d.pistas : []).map(p => normPistaCaso(p, vp)).filter(Boolean).slice(0, 40);
    const v0 = ehObj(d.verdade) ? d.verdade : {}, verdade = { vitima: linha(v0.vitima, 160) };
    for (const k of Object.keys(CONCLUSOES)) if (v0[k] != null) verdade[k] = linha(v0[k], 200);
    if (verdade.quem && !suspeitos.some(s => s.id === verdade.quem)) delete verdade.quem;
    const rv = ehObj(d.reviravolta) ? { txt: linha(d.reviravolta.txt, 400), usada: !!d.reviravolta.usada } : null;
    return {
      v: 1, tipo, seed: int(d.seed, 1, 1, 2147483646), titulo: linha(d.titulo, 100) || TIPOS[tipo].n,
      verdade, suspeitos, pistas, reviravolta: rv && rv.txt ? rv : null,
      cena: CENAS[d.cena] ? d.cena : TIPOS[tipo].cenas[0], estado: ['preparo', 'aberto', 'resolvido'].includes(d.estado) ? d.estado : 'preparo',
      camp: idOk(d.camp), aberto: !!d.aberto, notas: texto(d.notas, 4000), em: instante(d.em),
      cenaId: idOk(d.cenaId),
    };
  }
  const culpado = c => c.suspeitos.find(s => s.culpado) || null;
  const tracoDe = id => TRACOS.find(t => t.id === id) || null;
  const conclusoes = c => TIPOS[c.tipo].con;

  /* ---------------- o que a mesa vê ---------------- */
  function normPub(d) {
    d = ehObj(d) ? d : {};
    const vp = new Set(), vs = new Set();
    const pistas = [];
    for (const p of Array.isArray(d.pistas) ? d.pistas : []) {
      if (!ehObj(p)) continue; const id = idOk(p.id); if (!id || vp.has(id)) continue; vp.add(id);
      pistas.push({ id, txt: texto(p.txt, 600), jeito: JEITOS[p.jeito] ? p.jeito : 'fisica', de: linha(p.de, 80), em: instante(p.em) });
      if (pistas.length >= 40) break;
    }
    const suspeitos = [];
    for (const s of Array.isArray(d.suspeitos) ? d.suspeitos : []) {
      if (!ehObj(s)) continue; const id = idOk(s.id); if (!id || vs.has(id)) continue; vs.add(id);
      suspeitos.push({ id, nome: linha(s.nome, 80) || 'Suspeito', quem: linha(s.quem, 160), aparencia: linha(s.aparencia, 300), respostas: (Array.isArray(s.respostas) ? s.respostas : []).map(x => linha(x, 300)).filter(Boolean).slice(0, 30) });
      if (suspeitos.length >= 8) break;
    }
    const ve = ehObj(d.veredito) ? { ok: !!d.veredito.ok, sid: idOk(d.veredito.sid), txt: linha(d.veredito.txt, 400), em: instante(d.veredito.em) } : null;
    return { v: 1, cid: idOk(d.cid), titulo: linha(d.titulo, 100) || 'Caso', tipo: TIPOS[d.tipo] ? d.tipo : 'assassinato', pistas, suspeitos, veredito: ve, em: instante(d.em) };
  }
  // o documento público, feito do caso (o que já foi entregue e mostrado)
  function projetar(cid, caso, antes) {
    caso = normCaso(caso); antes = antes ? normPub(antes) : null;
    const nomeDe = sid => { const s = caso.suspeitos.find(x => x.id === sid); return s ? s.nome : ''; };
    return {
      v: 1, cid, titulo: caso.titulo, tipo: caso.tipo,
      pistas: caso.pistas.filter(p => p.entregue).sort((a, b) => a.entregue.localeCompare(b.entregue)).map(p => ({ id: p.id, txt: p.txt, jeito: p.jeito, de: p.jeito === 'testemunho' ? nomeDe(p.de) : '', em: p.entregue })),
      suspeitos: caso.suspeitos.filter(s => s.mostrado).map(s => ({ id: s.id, nome: s.nome, quem: s.quem, aparencia: s.aparencia, respostas: s.respostas.slice() })),
      veredito: antes ? antes.veredito : null, em: antes && antes.em ? antes.em : new Date().toISOString(),
    };
  }
  // entregar uma pista (marca no caso; o público se refaz com projetar)
  function entregar(caso, pid, quando) {
    caso = normCaso(caso);
    const p = caso.pistas.find(x => x.id === pid); if (!p) return caso;
    if (!p.entregue) p.entregue = instante(quando) || new Date().toISOString();
    if (p.de) { const s = caso.suspeitos.find(x => x.id === p.de); if (s && !s.mostrado) s.mostrado = true; }
    return caso;
  }
  function recolher(caso, pid) { caso = normCaso(caso); const p = caso.pistas.find(x => x.id === pid); if (p) p.entregue = null; return caso; }

  /* ---------------- o mural ---------------- */
  const chaveFio = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  const okCarta = k => typeof k === 'string' && /^(p|s|n):[A-Za-z0-9_-]{1,40}$/.test(k);
  function normMural(d) {
    d = ehObj(d) ? d : {};
    const cartas = {}, fios = {}, notas = {};
    const c0 = ehObj(d.cartas) ? d.cartas : {}, f0 = ehObj(d.fios) ? d.fios : {}, n0 = ehObj(d.notas) ? d.notas : {};
    for (const k of Object.keys(c0).slice(0, 80)) if (okCarta(k) && ehObj(c0[k])) cartas[k] = { x: clamp(Math.round(Number(c0[k].x) || 0), 0, 3000), y: clamp(Math.round(Number(c0[k].y) || 0), 0, 2000) };
    for (const k of Object.keys(f0).slice(0, 160)) { const [a, b] = k.split('|'); if (okCarta(a) && okCarta(b) && a !== b && chaveFio(a, b) === k && f0[k]) fios[k] = { por: linha(ehObj(f0[k]) ? f0[k].por : '', 60) }; }
    for (const k of Object.keys(n0).slice(0, 40)) { const id = idOk(k); if (id && ehObj(n0[k])) notas[id] = { x: clamp(Math.round(Number(n0[k].x) || 0), 0, 3000), y: clamp(Math.round(Number(n0[k].y) || 0), 0, 2000), txt: linha(n0[k].txt, 240), por: linha(n0[k].por, 60) }; }
    const a = ehObj(d.acusacao) && idOk(d.acusacao.sid) ? { sid: d.acusacao.sid, por: linha(d.acusacao.por, 60), txt: linha(d.acusacao.txt, 400), em: instante(d.acusacao.em) } : null;
    return { v: 1, cid: idOk(d.cid), cartas, fios, notas, acusacao: a };
  }

  const api = {
    PRE, TIPOS, ORDEM_TIPOS, CONCLUSOES, JEITOS, ONDE, TRACOS, CENAS, REVIRAVOLTAS,
    ehObj, idOk, linha, sem, mulberry, novoId, novaSemente, idPub, idMural, cidDe, chaveFio, okCarta,
    gerarCaso, normCaso, normPub, normMural, projetar, entregar, recolher, culpado, tracoDe, conclusoes,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { window.TC = window.TC || {}; window.TC.misterio = api; }
})();
