# Jogos na TV ⚽

Site que mostra os jogos de futebol do dia e do dia seguinte com filtro por campeonato.
Dados extraídos automaticamente do mantosdofutebol.com.br.

---

## Como colocar no ar (passo a passo)

### 1. Criar conta no GitHub
- Acesse https://github.com e crie uma conta gratuita

### 2. Criar repositório
- Clique em "New repository"
- Dê o nome: `jogos-na-tv`
- Deixe como "Public"
- Clique em "Create repository"

### 3. Subir os arquivos
Na tela do repositório criado, clique em "uploading an existing file" e suba:
- A pasta `api/` com o arquivo `jogos.js` dentro
- A pasta `public/` com o arquivo `index.html` dentro
- O arquivo `vercel.json`

### 4. Criar conta no Vercel
- Acesse https://vercel.com
- Clique em "Sign Up" e entre com sua conta do GitHub

### 5. Importar o projeto
- No Vercel, clique em "Add New Project"
- Selecione o repositório `jogos-na-tv`
- Clique em "Deploy"

Pronto! Em 1-2 minutos o site estará no ar em um endereço tipo:
`https://jogos-na-tv.vercel.app`

---

## Como funciona a atualização automática

- A API (`/api/jogos`) acessa o Mantos do Futebol e extrai os jogos
- O Vercel guarda o resultado em cache por **1 hora**
- A página atualiza sozinha a cada 1 hora enquanto estiver aberta
- Você também pode clicar em "Atualizar" a qualquer momento

---

## Estrutura dos arquivos

```
jogos-na-tv/
├── api/
│   └── jogos.js       ← busca os jogos no site
├── public/
│   └── index.html     ← a página do site
└── vercel.json        ← configuração do Vercel
```
