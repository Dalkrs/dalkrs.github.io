# Caderno do Alquimista — Teoria Yara

> Registro digital de ensaios da Teoria Yara: pauta visual, banco de minérios e exportação de partituras.

Aplicação web de página única para forjadores yarianos registrarem seus ensaios. Funciona inteiramente no navegador — sem servidor, sem cadastro, sem custo. Os dados ficam salvos localmente no próprio navegador do alquimista.

## Funcionalidades

- **Banco de Minérios** — cadastro livre de minerais com nome, classificação (Puro / Reativo / Incerto), propriedade e assinatura Yara.
- **Pauta Yara visual** — pauta de cinco harmônicos (H0–H4) com larguras de coluna proporcionais à duração de cada nota e índices de ocorrência automáticos para harmônicos repetidos (H1¹, H1², H1³).
- **Sequência de marteladas com repetição** — cada clique numa nota adiciona uma martelada à sequência. A mesma nota pode ser batida múltiplas vezes; a ordem é registrada.
- **Histórico filtrável** — todos os ensaios em ordem cronológica, com filtros por minério, gesto, resultado e status.
- **Exportação** — Excel (.xlsx) com três abas (minérios, ensaios, resumo), PDF formatado em estilo de compêndio, e backup completo em JSON.
- **Persistência local** — os dados são gravados no `localStorage` do navegador e nunca saem da máquina do usuário.

## Como usar

1. Abra `index.html` em qualquer navegador moderno (Firefox, Chrome, Edge, Safari).
2. Na primeira aba, clique em **"Carregar os 7 conhecidos"** para popular o banco com minerais de exemplo, ou cadastre os seus.
3. Vá para **"Novo Ensaio"**, selecione um minério e construa o caminho de marteladas clicando nas notas da pauta.
4. Registre o resultado e confirme.
5. Em **"Exportar"**, baixe a planilha ou o PDF com seus registros.

## Fundamentação teórica

Este caderno implementa a notação revisada da Teoria Yara, com índices de ocorrência (H1¹, H1²) e o princípio do gesto: o efeito de uma forja não é determinado pelo conjunto de notas batidas, mas pela sequência ordenada — o gesto que essa sequência reproduz no mundo.

A repetição é parte essencial da notação: bater na mesma nota duas vezes consecutivas não é redundância, é parte do gesto.

## Tecnologia

- HTML, CSS e JavaScript puros, em arquivo único.
- [SheetJS](https://sheetjs.com/) para exportação em Excel.
- [jsPDF](https://github.com/parallax/jsPDF) e jsPDF-AutoTable para geração de PDF.
- Tipografia: EB Garamond, Cormorant Garamond, IM Fell English SC e Special Elite (via Google Fonts).

## Licença

MIT — veja [LICENSE](LICENSE). Use livremente, modifique, distribua. Se publicar uma versão derivada, gentileza preservar a referência ao projeto original.

---

❦ *Que você ouça a música antes de pegar o martelo.* ❦
