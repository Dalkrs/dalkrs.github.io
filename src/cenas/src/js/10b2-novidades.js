/* ---------------------------------------------------------------
   10b2. AS NOVIDADES DO GERADOR (lote 157) — um passeio que abre as telas de verdade e acende cada novidade dos lotes
   146 a 156, com um texto curto. Toca uma vez para o mestre, ao abrir as Cenas (depois do tutorial de primeiro uso);
   fica no menu ⋯ ("Rever as novidades do gerador"). Usa o mesmo cartão do Tour; o que ele abre, ele fecha no fim.
   --------------------------------------------------------------- */
const Novidades = (() => {
  const VERSAO = 157, CHAVE = 'tinycats-novidades-gerador';
  const vistas = () => { if ((Store.S.prefs.novidades || 0) >= VERSAO) return true; try { return Number(localStorage.getItem(CHAVE) || 0) >= VERSAO; } catch (e) { return false; } };
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
  function passos() {
    return [
      passo('Novidades no gerador de mapas', 'São 12 novidades. Eu abro cada tela e mostro onde fica. Você só lê e avança: nada muda nas cenas.', { next: 'Começar' }),
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
      passo('Pronto', 'Para ver de novo: menu ⋯ › "Rever as novidades do gerador".', { next: 'Concluir', enter: () => { UI.closeModal(); } }),
    ];
  }
  function start() { if (!isGM()) return; Tour.start({ passos: passos(), aoFim: () => UI.closeModal(), marcar }); }
  return { start, vistas, marcar, VERSAO };
})();
