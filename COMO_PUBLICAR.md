# Como Publicar no GitHub Pages

Este guia mostra como hospedar o Caderno do Alquimista gratuitamente no GitHub Pages, gerando um link público que você pode compartilhar com outros jogadores.

**Tempo total: cerca de 5 minutos.** Nenhum custo. Você só precisa de uma conta no GitHub (também gratuita).

---

## Passo 1 — Criar conta no GitHub (se ainda não tiver)

1. Vá para [github.com](https://github.com) e clique em **Sign up**.
2. Escolha um nome de usuário, e-mail e senha.
3. Confirme o e-mail.

O nome de usuário vai aparecer no link final. Por exemplo, se seu usuário for `dain-garret`, o link do site será `https://dain-garret.github.io/caderno-yara/`.

---

## Passo 2 — Criar o repositório

1. Logado no GitHub, clique no **+** no canto superior direito → **New repository**.
2. Preencha:
   - **Repository name**: `caderno-yara` (ou outro nome de sua escolha — sem espaços, sem acentos)
   - **Description** (opcional): "Caderno do Alquimista — Teoria Yara"
   - Marque **Public** (obrigatório para GitHub Pages gratuito)
   - **Não marque** "Add a README file" — vamos enviar o nosso
   - **Não marque** "Add .gitignore" nem "Choose a license" pelo mesmo motivo
3. Clique em **Create repository**.

---

## Passo 3 — Enviar os arquivos

Você verá uma tela com instruções. Use a opção **"uploading an existing file"** (link azul no meio da página, na seção "Quick setup").

1. Clique em **"uploading an existing file"**.
2. Descompacte o `caderno-yara.zip` em uma pasta no seu computador.
3. **Selecione todos os arquivos da pasta** (incluindo a pasta oculta `.github` — ative "mostrar arquivos ocultos" no seu sistema se necessário) e arraste-os para a área de upload do GitHub.
   - Arquivos esperados: `index.html`, `README.md`, `LICENSE`, `.gitignore`, e a pasta `.github/workflows/pages.yml`.
4. Role para baixo, na caixa **"Commit changes"**:
   - Em **"Commit message"**, escreva: `versão inicial`
   - Mantenha "Commit directly to the main branch" selecionado
5. Clique em **Commit changes**.

Aguarde o upload. Você verá os arquivos na página principal do repositório.

---

## Passo 4 — Ativar o GitHub Pages

1. No seu repositório, clique em **Settings** (no menu superior do repositório, à direita).
2. No menu lateral esquerdo, role e clique em **Pages**.
3. Em **Source**, selecione **"GitHub Actions"** no menu suspenso (não "Deploy from a branch").
4. Pronto. Não precisa fazer mais nada nessa tela.

A configuração já está feita. O arquivo `.github/workflows/pages.yml` que enviamos junto vai cuidar da publicação automaticamente.

---

## Passo 5 — Aguardar a publicação

1. Clique na aba **Actions** (no menu superior do repositório).
2. Você verá um workflow chamado **"Publicar no GitHub Pages"** rodando — geralmente leva de 30 segundos a 2 minutos.
3. Quando ficar com um ✅ verde, está no ar.

---

## Passo 6 — Pegar o link

Volte a **Settings** → **Pages**. No topo da página, você verá:

> **Your site is live at https://SEU-USUARIO.github.io/caderno-yara/**

Esse é o link para compartilhar com outros jogadores. Funciona em qualquer navegador e em qualquer dispositivo (computador, tablet, celular).

---

## Atualizando o site no futuro

Sempre que quiser atualizar o site (corrigir um bug, adicionar uma feature):

1. Abra o repositório no GitHub.
2. Clique no arquivo que quer modificar (ex: `index.html`).
3. Clique no ícone de lápis (✏️) no canto superior direito do arquivo.
4. Faça as alterações no editor.
5. Role até embaixo, escreva uma mensagem em "Commit changes" e clique no botão.

A publicação automática rodará de novo, e em 1–2 minutos o site estará atualizado. Os jogadores podem dar F5 e verão a versão nova.

Como alternativa, você pode editar o arquivo no seu computador, deletar o `index.html` antigo no GitHub e enviar a nova versão pelo mesmo "uploading an existing file" do Passo 3.

---

## Custos

**Zero.** GitHub Pages é gratuito para repositórios públicos sem limite prático para projetos pequenos:
- Tráfego: até 100 GB/mês (suficiente para milhares de jogadores).
- Builds: até 10 por hora (mais do que suficiente).
- Espaço: até 1 GB por repositório (este projeto usa cerca de 60 KB).

Não há cobrança escondida. Você só pagaria se eventualmente migrasse para um plano pago do GitHub para outras funcionalidades (privacidade, organizações, etc.) — o que não tem nada a ver com este projeto.

---

## Em caso de problemas

- **O workflow falhou?** Em **Actions**, clique no workflow vermelho e veja o erro. O mais comum é a aba **Settings → Pages** ainda não estar configurada como "GitHub Actions" — refaça o Passo 4.
- **O link dá 404?** Aguarde mais 1 minuto. A primeira publicação demora um pouco mais.
- **Quer apagar tudo e recomeçar?** Em **Settings → Pages**, role até o fim e clique em "Delete this repository". Volte ao Passo 2.

---

❦ *Boa forja.* ❦
