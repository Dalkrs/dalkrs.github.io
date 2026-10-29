/* Tiny Cats · o gerador de NPC (lote 32): a conta pura (sem página, sem DOM). Roda igual no navegador (window.TC.npc,
   no Escudo do mestre e no Mapa-múndi) e no Node (testes).
   Os documentos da mesa:
     escudo:npc:<id>   um NPC guardado: o nome, a raça, a aparência, o jeito, o que quer e esconde, o gancho, os números
                       de ficha (tier, nível, os atributos), onde vive e de que lado está — e a ficha, se virou uma
     escudo:racas      as raças da mesa (que o mestre monta): cada uma com as sub-raças, o estilo dos nomes e os traços
                       típicos da aparência
   Os nomes saem de estilos de cultura (nórdico, oriental, élfico, anão, desértico, latino, eslavo, celta, tribal e o do
   povo pequeno): prenome, e sobrenome, epíteto ou nome de família, como cada estilo faz. Tudo sai de uma semente: a
   mesma semente dá o mesmo NPC. */
(() => {
  'use strict';
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v, p) => { const n = Number(v); return Number.isFinite(n) ? n : p; };
  const int = (v, p, a, b) => clamp(Math.round(num(v, p)), a, b);
  const linha = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 80);
  const texto = (v, max) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').slice(0, max || 2000);
  const idOk = v => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) && !(v in Object.prototype) ? v : null);
  function mulberry(a) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const sortear = (l, r) => l[Math.floor(r() * l.length)];
  const embaralhar = (l, r) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; };
  let seq = 0;
  const novoId = pre => { seq = (seq + 1) % 1296; return pre + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5) + seq.toString(36); };
  const novaSemente = () => 1 + Math.floor(Math.random() * 2147483000);
  const sem = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  // [masculino, feminino] → o do gênero ('m' | 'f')
  const g = (par, gen) => (Array.isArray(par) ? par[gen === 'f' ? 1 : 0] : par);

  /* ---------------- os estilos dos nomes ----------------
     m, f: os prenomes; sob: os sobrenomes (ou nomes de família); modo: como o nome completo se forma —
       'sob'   prenome + sobrenome
       'pai'   prenome + filho/filha do pai (nórdico: -sson / -sdóttir)
       'ibn'   prenome + ibn/bint + o pai (desértico)
       'mac'   prenome + Mac/Ní + o pai, ou O' + família (celta)
       'gen'   o sobrenome muda com o gênero (eslavo: -ov/-ova, -ski/-ska)
       'epi'   prenome + epíteto (tribal)
     (o epíteto — "o Ruivo", "Mão-Leve" — pode vir em qualquer estilo, de vez em quando, no lugar do sobrenome) */
  const ESTILOS = {
    nordico: { nome: 'Nórdico', modo: 'pai',
      m: ['Bjorn', 'Erik', 'Ragnar', 'Leif', 'Sigurd', 'Ulf', 'Halvar', 'Torstein', 'Gunnar', 'Ivar', 'Knut', 'Orm', 'Snorri', 'Thorvald', 'Vidar', 'Asger', 'Einar', 'Hakon', 'Ketil', 'Rolf', 'Sten', 'Brand', 'Egil', 'Grim', 'Hrolf', 'Arnulf', 'Geirmund', 'Toke'],
      f: ['Astrid', 'Freydis', 'Gudrun', 'Helga', 'Ingrid', 'Sigrid', 'Thora', 'Ylva', 'Brynja', 'Ragnhild', 'Solveig', 'Hilda', 'Dagny', 'Eira', 'Gunnhild', 'Ronja', 'Saga', 'Runa', 'Tove', 'Vigdis', 'Aslaug', 'Hervor'],
      sob: [] },
    oriental: { nome: 'Oriental', modo: 'sob', familiaAntes: true,
      m: ['Haruto', 'Kenji', 'Takeshi', 'Ryo', 'Daichi', 'Hiroshi', 'Kaito', 'Masaru', 'Renji', 'Shin', 'Sora', 'Taro', 'Akira', 'Daisuke', 'Goro', 'Isamu', 'Jiro', 'Kazuo', 'Noboru', 'Tetsuo', 'Hayato', 'Ichiro'],
      f: ['Akane', 'Aiko', 'Chiyo', 'Emi', 'Hana', 'Kaede', 'Mei', 'Naomi', 'Rin', 'Sakura', 'Sayuri', 'Tomoe', 'Yumi', 'Kiku', 'Michiko', 'Nanami', 'Ayame', 'Haruka', 'Midori', 'Shizuka', 'Yuki', 'Hotaru'],
      sob: ['Takeda', 'Hayashi', 'Mori', 'Kuroda', 'Shimizu', 'Ishikawa', 'Fujiwara', 'Kobayashi', 'Matsuda', 'Nakamura', 'Ogawa', 'Sakai', 'Tanaka', 'Yamada', 'Kanzaki', 'Hoshino', 'Kirishima', 'Tsukino', 'Amane', 'Shirogane', 'Kaneda', 'Arashi'] },
    elfico: { nome: 'Élfico', modo: 'sob',
      m: ['Aelar', 'Caelan', 'Elrion', 'Faelar', 'Galinor', 'Ilyas', 'Nerion', 'Saelis', 'Thalion', 'Varis', 'Aerendil', 'Erevan', 'Ivellios', 'Laucian', 'Mythir', 'Quarion', 'Rolen', 'Soveliss', 'Theren', 'Aethril', 'Lirien', 'Orelas'],
      f: ['Aeliana', 'Caelynn', 'Elara', 'Faelwen', 'Ilyana', 'Lianna', 'Mirethil', 'Naivara', 'Sariel', 'Thalia', 'Vaelith', 'Ielenia', 'Meriel', 'Nuala', 'Shava', 'Valanthe', 'Ithriel', 'Elowen', 'Sylwen', 'Aravel'],
      sob: ['Folha-de-Prata', 'Canção-do-Vento', 'Ramo-Antigo', 'Orvalho-Claro', 'da Lua Alta', 'Estrela-Fria', 'Brisa-Lenta', 'Raiz-Funda', 'do Bosque Velho', 'Pena-Branca', 'Neblina-Azul', 'Flor-do-Inverno', 'Olhar-de-Lince', 'Cálice-de-Orvalho'] },
    anao: { nome: 'Anão', modo: 'sob',
      m: ['Brottor', 'Eberk', 'Harbek', 'Kildrak', 'Morgran', 'Orsik', 'Rurik', 'Taklinn', 'Vondal', 'Barend', 'Durgan', 'Grumli', 'Haldor', 'Korgan', 'Murdok', 'Torgar', 'Ulfgar', 'Fargrim', 'Bardin', 'Thrain'],
      f: ['Artin', 'Bardryn', 'Dagnal', 'Eldeth', 'Gunnloda', 'Hlin', 'Kathra', 'Mardred', 'Riswynn', 'Torbera', 'Vistra', 'Brunna', 'Dorna', 'Hilde', 'Ketra', 'Morna', 'Tova', 'Ulla', 'Yrsa', 'Sannl'],
      sob: ['Martelo-de-Pedra', 'Barba-de-Bronze', 'Veio-Fundo', 'Forja-Rubra', 'Escudo-Firme', 'Pedra-Funda', 'Malho-Velho', 'Picareta-Leve', 'Cinza-de-Carvão', 'Punho-de-Ferro', 'Bigorna-Torta', 'Mina-Escura', 'Elmo-Partido', 'Cerveja-Forte'] },
    deserto: { nome: 'Desértico', modo: 'ibn',
      m: ['Amir', 'Faris', 'Hakim', 'Jamal', 'Karim', 'Malik', 'Nasir', 'Omar', 'Rashid', 'Samir', 'Tariq', 'Zahir', 'Adil', 'Bashir', 'Idris', 'Khalil', 'Murad', 'Qasim', 'Yusuf', 'Zayed', 'Harun', 'Selim'],
      f: ['Amira', 'Dalia', 'Farah', 'Habiba', 'Jamila', 'Laila', 'Nadia', 'Rania', 'Samira', 'Yasmin', 'Zahra', 'Aziza', 'Leyla', 'Najma', 'Rasha', 'Salma', 'Soraya', 'Zainab', 'Inaya', 'Noor'],
      sob: ['al-Rashid', 'al-Qadir', 'al-Sahra', 'al-Najm', 'al-Hadid', 'al-Bahri', 'al-Jabal', 'al-Wadi', 'al-Fajr', 'al-Qamar', 'al-Rimal', 'al-Nur'] },
    latino: { nome: 'Latino', modo: 'sob',
      m: ['Aurélio', 'Cássio', 'Décimo', 'Lúcio', 'Marco', 'Otávio', 'Quinto', 'Tito', 'Valério', 'Adriano', 'Fábio', 'Horácio', 'Júlio', 'Lucano', 'Mário', 'Severo', 'Sílvio', 'Vito', 'Caio', 'Galeno'],
      f: ['Aurélia', 'Cássia', 'Cláudia', 'Flávia', 'Júlia', 'Lívia', 'Lucila', 'Marcela', 'Otávia', 'Valéria', 'Antônia', 'Camila', 'Cornélia', 'Domitila', 'Fausta', 'Hortênsia', 'Lavínia', 'Prisca', 'Severina', 'Vitória'],
      sob: ['Cornélio', 'Valentim', 'Marcial', 'Petrônio', 'Albino', 'Flaviano', 'Galério', 'Torquato', 'Lívio', 'Severiano', 'Aquila', 'Montano', 'Varrão', 'Crispim'] },
    eslavo: { nome: 'Eslavo', modo: 'gen',
      m: ['Bogdan', 'Dragan', 'Milos', 'Radek', 'Stanislav', 'Vadim', 'Yaroslav', 'Zoran', 'Boris', 'Dobromir', 'Ivan', 'Kazimir', 'Lech', 'Miroslav', 'Oleg', 'Pavel', 'Radomir', 'Svetozar', 'Vlad', 'Zdenek'],
      f: ['Bogna', 'Darina', 'Jelena', 'Katya', 'Lada', 'Milena', 'Nadezhda', 'Olga', 'Radka', 'Svetlana', 'Vesna', 'Zora', 'Agata', 'Dobrava', 'Ludmila', 'Marina', 'Nevena', 'Stanislava', 'Vera', 'Yelena'],
      sob: [['Volkov', 'Volkova'], ['Petrov', 'Petrova'], ['Morozov', 'Morozova'], ['Kowalski', 'Kowalska'], ['Zielinski', 'Zielinska'], ['Novak', 'Novak'], ['Dvorak', 'Dvorak'], ['Horvat', 'Horvat'], ['Sokolov', 'Sokolova'], ['Belov', 'Belova'], ['Orlov', 'Orlova'], ['Chernov', 'Chernova'], ['Lebedev', 'Lebedeva'], ['Gorski', 'Gorska'], ['Barinov', 'Barinova'], ['Kozak', 'Kozak']] },
    celta: { nome: 'Celta', modo: 'mac',
      m: ['Aodh', 'Bran', 'Cian', 'Dermot', 'Eoin', 'Fionn', 'Lorcan', 'Niall', 'Oisin', 'Ronan', 'Tadhg', 'Alastar', 'Cathal', 'Daire', 'Eamon', 'Fergus', 'Kieran', 'Padraig', 'Ruairi', 'Seamus'],
      f: ['Aine', 'Brigid', 'Caoimhe', 'Deirdre', 'Eithne', 'Fiona', 'Grainne', 'Maeve', 'Niamh', 'Orla', 'Roisin', 'Saoirse', 'Aisling', 'Clodagh', 'Eilis', 'Fionnuala', 'Mairead', 'Nuala', 'Siobhan', 'Una'],
      sob: ['Brennan', 'Callaghan', 'Donnell', 'Flaherty', 'Keefe', 'Malley', 'Neill', 'Riordan', 'Sullivan', 'Toole', 'Connor', 'Dwyer'] },
    tribal: { nome: 'Tribal (orcs e brutos)', modo: 'epi',
      m: ['Grusk', 'Krag', 'Morg', 'Throk', 'Urzog', 'Durk', 'Gorath', 'Kruul', 'Narg', 'Rokk', 'Skarn', 'Varg', 'Brok', 'Dragg', 'Gnarl', 'Hrom', 'Lugg', 'Mog', 'Thrak', 'Zug'],
      f: ['Agra', 'Baggi', 'Grisha', 'Murka', 'Ovak', 'Shuna', 'Vorga', 'Yevra', 'Zharra', 'Drega', 'Gurma', 'Hulka', 'Karra', 'Lagga', 'Mazza', 'Ruka', 'Skara', 'Tusha', 'Urka', 'Bolga'],
      sob: ['Racha-Crânio', 'Dente-Quebrado', 'Olho-de-Fogo', 'Punho-Sangrento', 'Mata-Lobos', 'Pele-de-Pedra', 'Machado-Rubro', 'Uiva-à-Lua', 'Osso-Duro', 'Cicatriz-Funda', 'Rosna-Trovão', 'Pé-de-Rocha'] },
    pequeno: { nome: 'Povo pequeno', modo: 'sob',
      m: ['Alton', 'Cade', 'Eldon', 'Lyle', 'Milo', 'Osborn', 'Perrin', 'Roscoe', 'Wellby', 'Benny', 'Corrin', 'Dobbin', 'Fennick', 'Hob', 'Jory', 'Merric', 'Pip', 'Tobin', 'Tibbe', 'Wim'],
      f: ['Andry', 'Bree', 'Callie', 'Cora', 'Euphemia', 'Jillian', 'Kithri', 'Merla', 'Nedda', 'Paela', 'Portia', 'Seraphina', 'Shaena', 'Verna', 'Wynn', 'Rosie', 'Daisy', 'Poppy', 'Hollis', 'Tansy'],
      sob: ['Pé-Ligeiro', 'Morro-Verde', 'Bolso-Fundo', 'Chaleira', 'Bom-Barril', 'Toca-Funda', 'Feno-Doce', 'Ventania', 'Cardo', 'Maçã-Torta', 'Pão-Quente', 'Riacho-Manso', 'Sino-Pequeno', 'Torta-de-Amora'] },
  };
  const ORDEM_ESTILOS = Object.keys(ESTILOS);
  const EPITETOS = [['o Ruivo', 'a Ruiva'], ['o Velho', 'a Velha'], ['o Calado', 'a Calada'], ['o Manco', 'a Manca'], ['o Belo', 'a Bela'], ['o Moço', 'a Moça'],
    'Mão-Leve', 'Olho-de-Corvo', 'Língua-de-Prata', ['o Pescador', 'a Pescadora'], 'da Ponte', 'do Porto', ['o Sem-Terra', 'a Sem-Terra'], 'Meia-Orelha', 'Dente-de-Ouro', ['o Torto', 'a Torta'], ['o Sortudo', 'a Sortuda'], 'Barba-Rala'];

  /* ---------------- o jeito ---------------- */
  const TRACOS = [['desconfiado', 'desconfiada'], ['generoso', 'generosa'], ['ganancioso', 'gananciosa'], 'leal', ['covarde', 'covarde'], ['orgulhoso', 'orgulhosa'], ['curioso', 'curiosa'],
    ['mal-humorado', 'mal-humorada'], 'alegre', ['supersticioso', 'supersticiosa'], ['ambicioso', 'ambiciosa'], 'paciente', 'impaciente', ['sarcástico', 'sarcástica'], 'gentil', ['teimoso', 'teimosa'],
    ['falante', 'falante'], ['calado', 'calada'], ['vaidoso', 'vaidosa'], ['honesto', 'honesta'], ['mentiroso', 'mentirosa'], ['nervoso', 'nervosa'], ['corajoso', 'corajosa'], ['preguiçoso', 'preguiçosa'],
    ['devoto', 'devota'], ['cínico', 'cínica'], ['ingênuo', 'ingênua'], ['bajulador', 'bajuladora'], ['rancoroso', 'rancorosa'], ['brincalhão', 'brincalhona'], ['frio', 'fria'], 'sentimental',
    ['distraído', 'distraída'], ['meticuloso', 'meticulosa'], ['mandão', 'mandona'], ['tímido', 'tímida'], ['galanteador', 'galanteadora'], ['prestativo', 'prestativa'], ['ressentido', 'ressentida'], ['sonhador', 'sonhadora']];
  const MANEIRISMOS = ['estala os dedos quando pensa', 'fala de si na terceira pessoa', 'nunca olha nos olhos', 'conta moedas sem parar', 'assobia uma música antiga', 'repete a última palavra de quem fala',
    'mastiga um graveto', 'ri de nervoso', 'coça o queixo quando mente', 'anota tudo num caderninho', 'chama todo mundo de “meu jovem”', 'cheira a comida antes de comer', 'bate na mesa para dar ênfase',
    'faz um sinal de proteção ao ouvir o nome de um deus', 'sempre senta de costas para a parede', 'conversa com o próprio animal', 'esfrega as mãos o tempo todo', 'corrige o jeito de falar dos outros',
    'cita um avô que ninguém conheceu', 'gira um anel no dedo', 'olha para a porta o tempo todo', 'brinca com uma faca', 'pede desculpa por tudo', 'faz perguntas demais', 'tamborila os dedos',
    'sussurra mesmo quando não precisa', 'exagera em tudo', 'nunca tira o chapéu', 'chupa os dentes antes de responder', 'arruma as coisas da mesa em fila'];
  const FALAS = ['fala baixo e devagar', 'fala rápido, atropelando as palavras', 'tem um sotaque carregado do norte', 'tem a voz rouca', 'usa provérbios para tudo', 'fala difícil, com palavras rebuscadas',
    'gagueja sob pressão', 'fala alto, como se todos fossem surdos', 'usa gírias de marinheiro', 'rima sem perceber', 'tem a voz doce e calma', 'responde perguntas com perguntas', 'nunca termina as frases',
    'solta palavrões criativos', 'fala pouco, só o necessário', 'tem uma risada estrondosa', 'fala como um pregador', 'conta histórias longas demais', 'trata todos com formalidade exagerada',
    'mistura palavras de outra língua', 'imita a voz dos outros'];

  /* ---------------- a aparência ---------------- */
  const IDADES = [['jovem', 16, 25], ['adulto', 26, 45], ['maduro', 46, 60], ['idoso', 61, 88]];
  const IDADE_NOME = { jovem: ['jovem', 'jovem'], adulto: ['adulto', 'adulta'], maduro: ['maduro', 'madura'], idoso: ['idoso', 'idosa'] };
  const CORPOS = [['alto e magro', 'alta e magra'], ['baixo e robusto', 'baixa e robusta'], ['de estatura mediana', 'de estatura mediana'], ['corpulento', 'corpulenta'], ['esguio', 'esguia'],
    ['musculoso', 'musculosa'], ['franzino', 'franzina'], ['barrigudo', 'barriguda'], ['curvado', 'curvada'], ['de ombros largos', 'de ombros largos']];
  const CABELOS = ['cabelo preso numa trança longa', 'careca reluzente', 'cabelo grisalho bem curto', 'cabelo ruivo desgrenhado', 'cabelo negro e liso até os ombros', 'cachos castanhos', 'cabeça raspada dos lados',
    'cabelo loiro quase branco', 'cabelo sempre escondido num lenço', 'cabelo cheio de contas e fitas', 'cabelo ralo penteado para o lado', 'um coque apertado'];
  const MARCAS = ['uma cicatriz que corta a sobrancelha', 'olhos de cores diferentes', 'dedos manchados de tinta', 'um dente de ouro', 'tatuagens de runas nos braços', 'um tapa-olho de couro', 'sardas por todo o rosto',
    'uma orelha cortada', 'mãos calejadas e enormes', 'um nariz que já foi quebrado', 'unhas pintadas de preto', 'um sinal escuro na bochecha', 'cheiro forte de ervas', 'um brinco de osso',
    'queimaduras antigas nas mãos', 'uma voz grave demais para o tamanho', 'sobrancelhas grossas e unidas', 'um sorriso que falta dentes', 'anéis em todos os dedos', 'pele queimada de sol',
    'uma pena presa atrás da orelha', 'o rosto pintado de branco', 'um olho leitoso', 'mãos que tremem um pouco', 'uma marca de nascença no pescoço', 'um corvo que vive no ombro'];

  /* ---------------- o que quer, o que esconde, o gancho ----------------
     (as frases que mudam com o gênero vêm aos pares: [de homem, de mulher])
     {lugar}: onde o NPC vive (ou "a cidade"); {faccao}: a facção ou o clã dele (ou "a guilda"). */
  const MOTIVACOES = ['pagar uma dívida antiga com {faccao}', 'achar um irmão que sumiu', 'juntar dinheiro para ir embora de {lugar}', 'vingar a família', ['provar que é melhor que o pai', 'provar que é melhor que a mãe'],
    'conseguir o remédio para um filho doente', 'subir na hierarquia de {faccao}', 'esquecer o passado', 'reencontrar um amor perdido', 'achar o tesouro que a família perdeu', 'ser lembrado depois de morrer',
    'manter {lugar} em paz', 'derrubar quem manda em {lugar}', 'aprender um segredo proibido', 'escapar de quem persegue a família', 'conseguir um título de nobreza', 'reconstruir o que perdeu num incêndio',
    'cumprir uma promessa feita a um morto', 'descobrir quem é o verdadeiro pai', 'ganhar o respeito de {faccao}', 'salvar a colheita deste ano', 'achar a cura de uma maldição', 'manter um segredo enterrado',
    'ver o mar pela primeira vez', 'fazer fortuna rápido', 'proteger {lugar} de uma ameaça que ninguém mais percebe'];
  const SEGREDOS = ['trabalha às escondidas para {faccao}', 'matou alguém e enterrou no quintal', 'deve muito dinheiro a gente perigosa', 'o nome que usa é falso', 'sabe onde está o tesouro de {lugar}',
    'tem um filho que ninguém conhece', 'lutou no exército inimigo', 'roubou a relíquia do templo', ['é um espião', 'é uma espiã'], 'usa magia proibida às escondidas', 'carrega uma maldição que esconde de todos',
    ['é herdeiro de uma família nobre caída', 'é herdeira de uma família nobre caída'], 'envenena aos poucos alguém da própria casa', 'fugiu de uma prisão', 'tem um amor proibido', 'viu o que não devia na noite do crime', 'vende informações aos dois lados',
    'esconde uma criatura no porão', 'falsifica moedas', 'é membro de um culto', 'traiu os antigos companheiros', 'tem pavor do escuro e nunca admite', 'sabe a verdade sobre a morte do antigo senhor de {lugar}',
    'guarda um mapa que não sabe ler', ['é muito mais velho do que parece', 'é muito mais velha do que parece'], ['já foi aventureiro e perdeu todos os amigos', 'já foi aventureira e perdeu todos os amigos'], 'tem uma dívida com uma bruxa', 'escreve cartas anônimas', 'contrabandeia armas', 'não sabe ler e esconde isso'];
  const GANCHOS = ['Pede ajuda: alguém da família sumiu perto de {lugar}.', 'Oferece um bom pagamento para escoltar uma carga até a próxima cidade.', 'Tem uma carta que precisa chegar a {faccao} — e não pode ser aberta.',
    ['Está sendo seguido e pede proteção por uma noite.', 'Está sendo seguida e pede proteção por uma noite.'], 'Vende um mapa que jura ser verdadeiro.', 'Precisa de alguém para recuperar algo que roubaram dele.', 'Conta um boato sobre {lugar} que pode render ouro.',
    'Quer contratar alguém para dar uma lição num rival.', ['Está desesperado: amanhã vencem as dívidas.', 'Está desesperada: amanhã vencem as dívidas.'], 'Viu uma criatura estranha na estrada e ninguém acredita.', 'Tem um objeto amaldiçoado e quer se livrar dele.',
    'Pede para entregar um presente a alguém de {faccao}, sem dizer de quem é.', 'Precisa de testemunhas num julgamento.', 'Está organizando uma caçada e precisa de braços.', 'Desafia um dos heróis para uma aposta.',
    'Sabe de uma entrada secreta em {lugar}.', 'Quer que alguém investigue mortes estranhas no bairro.', 'Tem um parente preso injustamente.', 'Precisa de alguém de confiança para guardar um baú por uma semana.',
    'Ouviu os planos de um assalto e não sabe a quem contar.'];

  /* ---------------- os papéis ----------------
     o nome (masculino e feminino), as roupas, o tier e o nível de costume, os atributos fortes (letras de A a E, como no
     Bestiário: FOR, DES, AGI, VIT, CAN) e o lado. */
  const PAPEIS = {
    comerciante: { nome: ['Comerciante', 'Comerciante'], roupas: ['um casaco bem cortado com bolsos demais', 'roupas coloridas de viagem', 'um colete de couro com uma balança pendurada'], tier: 'D', lvl: [1, 4], tiers: { CAN: 'A', DES: 'B', AGI: 'C', VIT: 'D', FOR: 'E' } },
    guarda: { nome: ['Guarda', 'Guarda'], roupas: ['cota de malha e o tabardo da cidade', 'um gibão acolchoado e uma lança', 'armadura de couro gasta e um elmo amassado'], tier: 'C', lvl: [2, 6], tiers: { FOR: 'A', VIT: 'B', DES: 'C', AGI: 'D', CAN: 'E' }, lado: 'Neutro' },
    nobre: { nome: ['Nobre', 'Nobre'], roupas: ['veludo bordado a ouro', 'um manto com o brasão da família', 'roupas finas um pouco fora de moda'], tier: 'C', lvl: [1, 5], tiers: { CAN: 'A', AGI: 'B', DES: 'C', VIT: 'D', FOR: 'E' } },
    sacerdote: { nome: ['Sacerdote', 'Sacerdotisa'], roupas: ['túnica clara com um símbolo sagrado', 'vestes do templo, puídas na barra', 'um hábito escuro e um rosário de contas'], tier: 'C', lvl: [2, 7], tiers: { CAN: 'A', VIT: 'B', DES: 'C', AGI: 'D', FOR: 'E' } },
    campones: { nome: ['Camponês', 'Camponesa'], roupas: ['roupas de lã grossa sujas de terra', 'um chapéu de palha e tamancos', 'um avental remendado'], tier: 'E', lvl: [1, 2], tiers: { VIT: 'A', FOR: 'B', AGI: 'C', DES: 'D', CAN: 'E' } },
    ladrao: { nome: ['Ladrão', 'Ladra'], roupas: ['roupas escuras e sem barulho', 'um capuz e luvas sem dedos', 'roupas de um nobre que não são dele'], tier: 'C', lvl: [2, 6], tiers: { AGI: 'A', DES: 'B', CAN: 'C', VIT: 'D', FOR: 'E' }, lado: 'Neutro' },
    estudioso: { nome: ['Estudioso', 'Estudiosa'], roupas: ['túnica manchada de tinta', 'óculos remendados e uma bolsa cheia de pergaminhos', 'roupas simples e um cinto de bolsinhos'], tier: 'D', lvl: [1, 5], tiers: { CAN: 'A', DES: 'B', AGI: 'C', VIT: 'D', FOR: 'E' } },
    artesao: { nome: ['Artesão', 'Artesã'], roupas: ['avental de couro chamuscado', 'roupas práticas e ferramentas no cinto', 'mangas arregaçadas e um lenço na cabeça'], tier: 'D', lvl: [1, 4], tiers: { DES: 'A', FOR: 'B', VIT: 'C', AGI: 'D', CAN: 'E' } },
    taverneiro: { nome: ['Taverneiro', 'Taverneira'], roupas: ['avental manchado de cerveja', 'camisa larga e um pano no ombro', 'roupas confortáveis e um molho de chaves'], tier: 'D', lvl: [1, 4], tiers: { VIT: 'A', FOR: 'B', CAN: 'C', DES: 'D', AGI: 'E' } },
    mercenario: { nome: ['Mercenário', 'Mercenária'], roupas: ['armadura de placas desencontradas', 'um manto rasgado sobre a cota de malha', 'couro cravejado e várias armas'], tier: 'B', lvl: [4, 10], tiers: { FOR: 'A', VIT: 'B', AGI: 'C', DES: 'D', CAN: 'E' }, lado: 'Neutro' },
    curandeiro: { nome: ['Curandeiro', 'Curandeira'], roupas: ['um xale cheio de ervas penduradas', 'roupas simples e uma bolsa de couro com frascos', 'um avental branco manchado'], tier: 'D', lvl: [1, 5], tiers: { CAN: 'A', DES: 'B', VIT: 'C', AGI: 'D', FOR: 'E' } },
    artista: { nome: ['Artista', 'Artista'], roupas: ['roupas de cores berrantes e um chapéu de pena', 'um alaúde nas costas e botas gastas', 'um figurino de teatro remendado'], tier: 'C', lvl: [1, 5], tiers: { CAN: 'A', AGI: 'B', DES: 'C', VIT: 'D', FOR: 'E' } },
    cacador: { nome: ['Caçador', 'Caçadora'], roupas: ['peles e couro com cheiro de mato', 'um capuz verde e um arco', 'botas altas e uma faca larga'], tier: 'C', lvl: [2, 6], tiers: { DES: 'A', AGI: 'B', VIT: 'C', FOR: 'D', CAN: 'E' } },
    marinheiro: { nome: ['Marinheiro', 'Marinheira'], roupas: ['camisa listrada e calças enroladas', 'um casaco de lona impermeável', 'brincos de argola e tatuagens de âncora'], tier: 'D', lvl: [1, 5], tiers: { FOR: 'A', AGI: 'B', VIT: 'C', DES: 'D', CAN: 'E' } },
    mendigo: { nome: ['Mendigo', 'Mendiga'], roupas: ['trapos e um cobertor no ombro', 'roupas que já foram boas, há muito tempo', 'pés descalços e um chapéu furado'], tier: 'E', lvl: [1, 2], tiers: { VIT: 'A', AGI: 'B', CAN: 'C', DES: 'D', FOR: 'E' } },
    viajante: { nome: ['Viajante', 'Viajante'], roupas: ['um manto de viagem empoeirado', 'uma mochila enorme e um cajado', 'roupas de uma terra distante'], tier: 'C', lvl: [1, 6], tiers: { AGI: 'A', VIT: 'B', DES: 'C', CAN: 'D', FOR: 'E' } },
  };
  const ORDEM_PAPEIS = Object.keys(PAPEIS);
  const TIERS = ['S', 'A', 'B', 'C', 'D', 'E'], LETRAS = ['A', 'B', 'C', 'D', 'E'], ATRIBUTOS = ['FOR', 'DES', 'AGI', 'VIT', 'CAN'];
  const LADOS = ['Aliado', 'Neutro', 'Inimigo'];

  /* ---------------- as raças da mesa ---------------- */
  function normRaca(r, vistos) {
    if (!ehObj(r)) return null;
    let id = idOk(r.id) || novoId('rc');
    while (vistos.has(id)) id = novoId('rc');
    vistos.add(id);
    const subs = [], vs = new Set();
    for (const s of Array.isArray(r.subs) ? r.subs : []) {
      if (!ehObj(s) || subs.length >= 12) continue;
      const nome = linha(s.nome, 50);
      if (!nome) continue;
      let sid = idOk(s.id) || novoId('sb');
      while (vs.has(sid)) sid = novoId('sb');
      vs.add(sid);
      subs.push({ id: sid, nome, estilo: Object.prototype.hasOwnProperty.call(ESTILOS, s.estilo) ? s.estilo : null, aparencia: texto(s.aparencia, 300) });
    }
    return { id, nome: linha(r.nome, 50) || 'Raça', estilo: Object.prototype.hasOwnProperty.call(ESTILOS, r.estilo) ? r.estilo : 'latino', aparencia: texto(r.aparencia, 300), subs };
  }
  function normRacas(d) {
    d = ehObj(d) ? d : {};
    const vistos = new Set();
    return { v: 1, lista: (Array.isArray(d.lista) ? d.lista : []).map(r => normRaca(r, vistos)).filter(Boolean).slice(0, 40) };
  }
  // as raças que aparecem nas fichas (o texto livre de cada uma), para começar a lista: sem repetir, sem acento a mais
  function racasDasFichas(fichas) {
    const out = [], vistos = new Set();
    for (const f of fichas || []) {
      const r = linha(f && f.raca, 50);
      if (!r || vistos.has(sem(r))) continue;
      vistos.add(sem(r));
      out.push(r);
    }
    return out.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }
  // o estilo de nome que combina com o nome de uma raça (para o começo; o mestre troca)
  function estiloPorNome(nome) {
    const s = sem(nome);
    if (/an[aã]o|anoes|dwar/.test(s)) return 'anao';
    if (/elf|elfo|elfa|silvan|feeric|fada/.test(s)) return 'elfico';
    if (/orc|ogro|troll|goblin|meio-orc|bruto/.test(s)) return 'tribal';
    if (/halfling|pequen|gnomo|hobbit/.test(s)) return 'pequeno';
    if (/kitsune|tengu|oni|oriental|samurai|raposa/.test(s)) return 'oriental';
    if (/nord|gigante|lobo|urs/.test(s)) return 'nordico';
    if (/desert|areia|djinn|genio/.test(s)) return 'deserto';
    return 'latino';
  }

  /* A raça para gerar: a escolhida (id; e a sub-raça, subId — '' sorteia uma das sub-raças dela, ou nenhuma), ou
     — sem id — uma da lista, sorteada. → { id, nome, estilo, aparencia, sub: { id, nome, estilo, aparencia } | null } | null */
  function escolherRaca(racas, id, subId, r) {
    const l = normRacas(racas).lista, rr = typeof r === 'function' ? r : Math.random;
    if (!l.length) return null;
    const x = id ? l.find(y => y.id === id) : sortear(l, rr);
    if (!x) return null;
    let sub = null;
    if (subId) sub = x.subs.find(y => y.id === subId) || null;
    else if (subId !== null && x.subs.length && rr() < 0.6) sub = sortear(x.subs, rr);
    return { id: x.id, nome: x.nome, estilo: x.estilo, aparencia: x.aparencia, sub: sub ? Object.assign({}, sub) : null };
  }

  /* ---------------- os nomes ---------------- */
  function nomeCompleto(estilo, gen, r) {
    const E = ESTILOS[estilo] || ESTILOS.latino;
    const pre = sortear(gen === 'f' ? E.f : E.m, r);
    const epi = () => g(sortear(EPITETOS, r), gen);
    if (r() < 0.12) return pre + ' ' + epi();             // (de vez em quando, um apelido no lugar do sobrenome)
    switch (E.modo) {
      case 'pai': { const pai = sortear(E.m, r); return pre + ' ' + pai + (gen === 'f' ? 'sdóttir' : 'sson'); }
      case 'ibn': { const pai = sortear(E.m, r); return r() < 0.5 ? pre + (gen === 'f' ? ' bint ' : ' ibn ') + pai : pre + ' ' + sortear(E.sob, r); }
      case 'mac': { if (r() < 0.5) { const pai = sortear(E.m, r); return pre + (gen === 'f' ? ' Ní ' : ' Mac ') + pai; } return pre + " O'" + sortear(E.sob, r); }
      case 'gen': return pre + ' ' + g(sortear(E.sob, r), gen);
      case 'epi': return pre + ' ' + sortear(E.sob, r);
      default: return E.familiaAntes && r() < 0.5 ? sortear(E.sob, r) + ' ' + pre : pre + ' ' + sortear(E.sob, r);
    }
  }
  function nomes(estilo, gen, n, seed) {
    const r = mulberry(int(seed, 1, 1, 2147483646)), out = [], vistos = new Set();
    for (let k = 0; out.length < n && k < n * 8; k++) {
      const gg = gen === 'f' || gen === 'm' ? gen : r() < 0.5 ? 'm' : 'f';
      const x = nomeCompleto(estilo, gg, r);
      if (!vistos.has(x)) { vistos.add(x); out.push(x); }
    }
    return out;
  }

  /* ---------------- o NPC ----------------
     opts: { raca: { id, nome, estilo, aparencia, sub: { id, nome, estilo, aparencia } } | null, estilo (o dos nomes, por
     cima do da raça), papel, gen ('m' | 'f' | ''), lugar: { mapa, obj, nome } | null, fac: { k: 'faccao' | 'cla', id, nome } | null, tier, nivel }. */
  // os corpos que combinam com o povo (anões e o povo pequeno não saem altos e magros; os brutos não saem franzinos)
  function corposDe(estilo) {
    if (estilo === 'anao' || estilo === 'pequeno') return CORPOS.filter(c => !/^alto|esguio|curvado/.test(c[0]));
    if (estilo === 'tribal') return CORPOS.filter(c => !/franzino|esguio/.test(c[0]));
    return CORPOS;
  }
  const maiuscula = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  // (com a preposição de antes: "chegar a a guilda" vira "chegar à guilda"; "de a cidade", "da cidade")
  const CONTRAI = { de: { a: 'da', o: 'do', as: 'das', os: 'dos' }, em: { a: 'na', o: 'no', as: 'nas', os: 'nos' }, a: { a: 'à', o: 'ao', as: 'às', os: 'aos' } };
  function preencher(s, ctx) {
    ctx = ctx || {};
    return String(s).replace(/(\b(?:de|em|a) )?\{(lugar|faccao)\}/g, (m, prep, k) => {
      const v = k === 'lugar' ? ctx.lugar || 'a cidade' : ctx.faccao || 'a guilda';
      if (!prep) return v;
      const x = /^(a|o|as|os) (.+)$/.exec(v);
      return x ? CONTRAI[prep.trim()][x[1]] + ' ' + x[2] : prep + v;
    });
  }
  function gerar(opts, seed) {
    opts = ehObj(opts) ? opts : {};
    const sd = int(seed, 1, 1, 2147483646), r = mulberry(sd * 31 + 7);
    const gen = opts.gen === 'm' || opts.gen === 'f' ? opts.gen : r() < 0.5 ? 'm' : 'f';
    const papelId = Object.prototype.hasOwnProperty.call(PAPEIS, opts.papel) ? opts.papel : sortear(ORDEM_PAPEIS, r);
    const P = PAPEIS[papelId];
    const raca = ehObj(opts.raca) ? opts.raca : null, sub = raca && ehObj(raca.sub) ? raca.sub : null;
    const estilo = (Object.prototype.hasOwnProperty.call(ESTILOS, opts.estilo) ? opts.estilo : null) || (sub && sub.estilo) || (raca && raca.estilo) || sortear(ORDEM_ESTILOS, r);
    const idade = sortear(IDADES, r), anos = idade[1] + Math.floor(r() * (idade[2] - idade[1] + 1));
    const tracos = embaralhar(TRACOS, r).slice(0, 2 + (r() < 0.4 ? 1 : 0)).map(x => g(x, gen));
    const tipicos = [sub && sub.aparencia, raca && raca.aparencia].filter(Boolean).join(', ').split(/[,;\n]/).map(x => linha(x, 80)).filter(Boolean);
    const marca = tipicos.length && r() < 0.5 ? sortear(tipicos, r) : sortear(MARCAS, r);
    const ctx = { lugar: opts.lugar && opts.lugar.nome, faccao: opts.fac && opts.fac.nome };
    const nivel = opts.nivel ? int(opts.nivel, 1, 1, 30) : P.lvl[0] + Math.floor(r() * (P.lvl[1] - P.lvl[0] + 1));
    return normNpc({
      nome: nomeCompleto(estilo, gen, r), gen, estilo, papel: papelId,
      raca: raca ? { id: raca.id || null, nome: raca.nome, sub: sub ? sub.nome : '' } : null,
      idade: anos, faixa: idade[0],
      corpo: g(sortear(corposDe(estilo), r), gen), cabelo: sortear(CABELOS, r), marca, roupa: sortear(P.roupas, r),
      tracos, maneirismo: sortear(MANEIRISMOS, r), fala: sortear(FALAS, r),
      motivacao: preencher(g(sortear(MOTIVACOES, r), gen), ctx), segredo: preencher(g(sortear(SEGREDOS, r), gen), ctx), gancho: preencher(g(sortear(GANCHOS, r), gen), ctx),
      ficha: { tier: TIERS.includes(opts.tier) ? opts.tier : P.tier, nivel, tiers: Object.assign({}, P.tiers), lado: P.lado || 'Aliado' },
      lugar: opts.lugar || null, fac: opts.fac || null, seed: sd,
    });
  }
  function normLugar(v) { if (!ehObj(v)) return null; const mapa = idOk(v.mapa), obj = idOk(v.obj); return mapa && obj ? { mapa, obj, nome: linha(v.nome, 60) } : null; }
  function normFac(v) { if (!ehObj(v) || !['faccao', 'cla'].includes(v.k)) return null; const id = idOk(v.id); return id ? { k: v.k, id, nome: linha(v.nome, 60), mapa: v.k === 'faccao' ? idOk(v.mapa) : null } : null; }
  function normNpc(d) {
    d = ehObj(d) ? d : {};
    const f = ehObj(d.ficha) ? d.ficha : {}, t0 = ehObj(f.tiers) ? f.tiers : {}, tiers = {};
    for (const k of ATRIBUTOS) tiers[k] = LETRAS.includes(t0[k]) ? t0[k] : 'C';
    const gen = d.gen === 'f' ? 'f' : 'm';
    return {
      v: 1,
      nome: linha(d.nome, 80) || 'NPC',
      gen,
      estilo: Object.prototype.hasOwnProperty.call(ESTILOS, d.estilo) ? d.estilo : 'latino',
      papel: Object.prototype.hasOwnProperty.call(PAPEIS, d.papel) ? d.papel : 'viajante',
      raca: ehObj(d.raca) && linha(d.raca.nome, 50) ? { id: idOk(d.raca.id), nome: linha(d.raca.nome, 50), sub: linha(d.raca.sub, 50) } : null,
      idade: int(d.idade, 30, 1, 2000), faixa: IDADES.some(x => x[0] === d.faixa) ? d.faixa : 'adulto',
      corpo: linha(d.corpo, 80), cabelo: linha(d.cabelo, 120), marca: linha(d.marca, 160), roupa: linha(d.roupa, 160),
      tracos: (Array.isArray(d.tracos) ? d.tracos : []).map(x => linha(x, 40)).filter(Boolean).slice(0, 5),
      maneirismo: linha(d.maneirismo, 160), fala: linha(d.fala, 160),
      motivacao: linha(d.motivacao, 240), segredo: linha(d.segredo, 240), gancho: linha(d.gancho, 300),
      ficha: { tier: TIERS.includes(f.tier) ? f.tier : 'C', nivel: int(f.nivel, 1, 1, 30), tiers, lado: LADOS.includes(f.lado) ? f.lado : 'Aliado' },
      lugar: normLugar(d.lugar), fac: normFac(d.fac),
      notas: texto(d.notas, 4000),
      pc: idOk(d.pc),                                   // a ficha (nas Fichas), se virou uma
      img: typeof d.img === 'string' && /^https:\/\/[^\s"'<>]+$/.test(d.img) && d.img.length <= 2000 ? d.img : null,
      camp: idOk(d.camp) || null,
      seed: int(d.seed, 1, 1, 2147483646),
      em: typeof d.em === 'string' && !Number.isNaN(Date.parse(d.em)) ? d.em : null,
    };
  }
  // o NPC em poucas linhas (o cartão)
  function descricao(n) {
    n = normNpc(n);
    const papel = g(PAPEIS[n.papel].nome, n.gen), quem = [n.raca ? n.raca.nome + (n.raca.sub ? ' (' + n.raca.sub + ')' : '') : '', papel.toLowerCase()].filter(Boolean).join(', ');
    return {
      quem: quem.charAt(0).toUpperCase() + quem.slice(1) + ', ' + n.idade + ' anos',
      aparencia: maiuscula([n.corpo, n.cabelo, n.marca].filter(Boolean).join('; ')) + (n.roupa ? '. Veste ' + n.roupa + '.' : '.'),
      jeito: maiuscula([n.tracos.join(', '), n.maneirismo, n.fala].filter(Boolean).join('; ')) + '.',
    };
  }
  // a ficha do NPC no formato do Bestiário (para as contas dos números e para virar inimigo ou ficha)
  function fichaBestiario(n) {
    n = normNpc(n);
    return { tier: n.ficha.tier, level: n.ficha.nivel, tiers: Object.assign({}, n.ficha.tiers), lado: n.ficha.lado };
  }

  const api = {
    ESTILOS, ORDEM_ESTILOS, EPITETOS, TRACOS, MANEIRISMOS, FALAS, IDADES, IDADE_NOME, CORPOS, CABELOS, MARCAS, MOTIVACOES, SEGREDOS, GANCHOS, PAPEIS, ORDEM_PAPEIS, TIERS, LETRAS, ATRIBUTOS, LADOS,
    PRE: 'escudo:npc:', RACAS: 'escudo:racas',
    ehObj, idOk, linha, sem, mulberry, novoId, novaSemente, g,
    normRaca, normRacas, escolherRaca, racasDasFichas, estiloPorNome, corposDe, maiuscula, nomeCompleto, nomes, gerar, normNpc, normLugar, normFac, descricao, fichaBestiario, preencher,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { window.TC = window.TC || {}; window.TC.npc = api; }
})();
