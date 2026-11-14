/* ---------------------------------------------------------------
   10b2. AS NOVIDADES DO GERADOR (lote 157) — um passeio que abre as telas de verdade e acende cada novidade dos lotes
   146 a 156, com um texto curto. Toca uma vez para o mestre, ao abrir as Cenas (depois do tutorial de primeiro uso);
   fica no menu ⋯ ("Rever as novidades do gerador"). Usa o mesmo cartão do Tour; o que ele abre, ele fecha no fim.
   (lote 158) mais quatro cartões: os objetos do tema, os climas novos, as salas novas e o "Pôr objetos de um tema…".
   Quem já tinha visto o passeio do 157 vê, sozinho, só os quatro novos; pelo menu ⋯, o passeio inteiro.
   --------------------------------------------------------------- */
const Novidades = (() => {
  const VERSAO = 158, CHAVE = 'tinycats-novidades-gerador';
  const vistaAte = () => { let v = Store.S.prefs.novidades || 0; try { v = Math.max(v, Number(localStorage.getItem(CHAVE) || 0)); } catch (e) { /* sem armazenamento */ } return v; };
  const vistas = () => vistaAte() >= VERSAO;
  const marcar = () => { Store.S.prefs.novidades = VERSAO; Persist.meta(); try { localStorage.setItem(CHAVE, String(VERSAO)); } catch (e) { /* sem armazenamento */ } };
  const rect = sel => () => { const n = document.querySelector(sel); if (!n) return null; const r = n.getBoundingClientRect(); return r.width > 4 && r.height > 4 ? r : null; };
  // abre (ou troca para) o lugar do gerador, e abre o bloco pedido
  function abrir(lugar, bloco, foco) {
    const v = Gerador.vivo();
    if (!v || v.lugar !== lugar) { UI.closeModal(); Gerador.abrir(lugar); }
    const d = bloco ? document.getElementById('ger-bl-' + bloco) : null;
    if (d) d.open = true;
    const n = document.querySelector(foco || ('#ger-bl-' + bloco));
    if (n) n.scrollIntoView({ block: 'center' });
  }
  const passo = (title, text, o) => Object.assign({ title, text, semRender: true }, o || {});
  // (lote 158) os cartões novos: os objetos do tema, os climas, as salas e a cena pronta
  function novos158() {
    return [
      passo('Objetos do tema', 'São 15 categorias novas de objetos: taverna, escola de magia, prisão, fazenda, treino, ruínas, inverno, deserto, pântano, esgoto, acampamento militar, portais, teatro, convés e natureza fantástica. "Combina com o lugar" escolhe sozinho. Ou escolha uma, e quantos (Poucos, Alguns, Muitos).',
        { enter: () => abrir('vila', 'tema'), target: rect('#ger-bl-tema'), side: 'left' }),
      passo('Climas novos', 'Agora são 23 climas, em grupos. Os novos: tempestade com raios, garoa, granizo, nevasca, tempestade de areia, calor e miragem, sombras de nuvens, névoa rasteira, aurora, estrelas cadentes, chuva de sangue, chuva da corrupção, esporos brilhantes, debaixo d\'água e fagulhas arcanas. Os raios piscam: na aba Cena, dá para desligar os clarões.',
        { enter: () => abrir('vila', 'amb', '#ger-clima'), target: rect('#ger-clima'), side: 'left' }),
      passo('Salas novas', 'Nas casas (Sob medida, Furtividade e as Zonas à mão), seis usos novos de sala: salão da taverna, sala de magia, interrogatório, treino, portal e teatro. Cada uma já vem mobiliada com os objetos novos.',
        { enter: () => abrir('casarao', 'zonas'), target: rect('#ger-bl-zonas'), side: 'left' }),
      passo('Numa cena pronta', 'No menu das cenas, "Pôr objetos de um tema…" espalha os objetos de um tema na cena aberta. O Desfazer tira todos de uma vez. E todos os objetos novos estão também no painel dos Objetos, para pôr à mão.',
        { enter: () => { UI.closeModal(); }, target: rect('#sceneBtn'), side: 'below' }),
    ];
  }
  function passos() {
    return [
      passo('Novidades no gerador de mapas', 'São 16 novidades. Eu abro cada tela e mostro onde fica. Você só lê e avança: nada muda nas cenas.', { next: 'Começar' }),
      passo('Gerar um lugar…', 'Tudo começa aqui: no menu das cenas, "Gerar um lugar…". Na coluna da esquerda, os lugares. Dois são novos: Sob medida e Por exemplo.',
        { enter: () => abrir('sobmedida', 'lugar', '#ger-lugar'), target: rect('#ger-lugar'), side: 'right' }),
      passo('Descrever com a IA', 'Escreva o lugar do seu jeito. A IA escolhe o gerador, preenche a ficha e agora também desenha a planta: onde fica a casa, cada cômodo, o lago, a mata. Depois dá para mudar tudo.',
        { enter: () => abrir('sobmedida', 'ia'), target: rect('#ger-bl-ia'), side: 'left' }),
      passo('Sob medida', 'A ficha da casa: o terreno, o muro, o porte, as salas do térreo, os andares e os anexos do quintal (piscina, estufa, estábulo…).',
        { enter: () => abrir('sobmedida', 'lugar'), target: rect('#ger-bl-lugar'), side: 'left' }),
      passo('Por exemplo', 'Mostre um exemplo pequeno e o gerador faz um mapa grande do mesmo jeito. O exemplo pode ser um pronto, um desenho seu (12 × 12) ou uma cena que você já tem.',
        { enter: () => abrir('exemplo', 'lugar', '#ex-fonte'), target: rect('#ger-bl-lugar'), side: 'left' }),
      passo('Zonas à mão', 'Ligue "Desenhar na prévia" e arraste: onde fica a casa, os cômodos (com o uso), um lago, uma mata, um pátio ou uma área vazia. O gerador obedece.',
        { enter: () => abrir('casarao', 'zonas'), target: rect('#ger-bl-zonas'), side: 'left' }),
      passo('Outra versão do cômodo', 'Clique num cômodo da prévia: os móveis dele são sorteados de novo, e o resto fica igual. Na cena pronta, é pelo botão direito dentro do cômodo.',
        { enter: () => abrir('casarao', null, '#ger-prev'), target: rect('#ger-prev'), side: 'right' }),
      passo('A dificuldade medida', 'Nos lugares de Furtividade: escolha Fácil, Médio, Difícil ou Muito difícil, e o gerador põe ou tira guardas até bater. "Ver o calor" mostra onde os guardas olham e os caminhos até o alvo.',
        { enter: () => abrir('casarao', 'lugar', '#fur-dific'), target: rect('#fur-dific'), side: 'left' }),
      passo('A história da missão', 'Os passos até o alvo: uma porta trancada e a chave em outro cômodo, um diário com a combinação, uma alavanca, um puzzle do Escudo, e o atalho de volta.',
        { enter: () => abrir('casarao', 'trama'), target: rect('#ger-bl-trama'), side: 'left' }),
      passo('O tempo', 'O lugar pode sair Usado, Abandonado ou Em ruínas, e com as marcas do que houve: incêndio, saque, batalha ou inundação. Uma nota e uma pista ficam escondidas.',
        { enter: () => abrir('casarao', 'tempo'), target: rect('#ger-bl-tempo'), side: 'left' }),
      passo('A erosão', 'Na Região livre, no Encontro e nas cavernas: a água da chuva gasta o relevo. Saem vales, encostas riscadas e areia onde a água para.',
        { enter: () => abrir('regiao', 'lugar', '#reg-erosao'), target: rect('#reg-erosao'), side: 'left' }),
      passo('A aba Guardas', 'Para cada jogador, o cone e a rota separados. E também: o calor dos guardas, a lista da história da missão e os segredos com três pistas.',
        { enter: () => { UI.closeModal(); App.tab = 'guard'; App.sideOpen = true; UI.renderAll(); }, target: rect('#tab-guard'), side: 'below' }),
      passo('O menu das cenas', '"Envelhecer esta cena…" faz uma cópia anos depois. "O tempo passou…" muda a cena nela mesma entre uma sessão e outra: a guarda reage, as portas são consertadas, os corpos saem.',
        { enter: () => { UI.closeModal(); }, target: rect('#sceneBtn'), side: 'below' }),
      passo('Do Mapa-múndi', 'O "Gerar a cena aqui" agora traz o reino dono da região (as cores e o nome nos guardas) e o que está por perto, numa nota só sua.',
        { enter: () => { UI.closeModal(); } }),
    ].concat(novos158(), [
      passo('Pronto', 'Para ver de novo: menu ⋯ › "Rever as novidades do gerador".', { next: 'Concluir', enter: () => { UI.closeModal(); } })]);
  }
  // o:{ auto: true } (o que toca sozinho): quem já viu o passeio do lote 157 vê só os cartões novos
  function start(o) {
    if (!isGM()) return;
    const so = !!(o && o.auto) && vistaAte() >= 157;
    const ps = so ? [passo('Novidades: objetos e climas', 'São 4 novidades. Eu abro cada tela e mostro onde fica. Você só lê e avança.', { next: 'Começar' })].concat(novos158(), [passo('Pronto', 'Para ver tudo de novo: menu ⋯ › "Rever as novidades do gerador".', { next: 'Concluir', enter: () => { UI.closeModal(); } })]) : passos();
    Tour.start({ passos: ps, aoFim: () => UI.closeModal(), marcar });
  }
  return { start, vistas, marcar, VERSAO };
})();
