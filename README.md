Fort Xavier – Plataforma Imobiliária

Projeto desenvolvido em Next.js 15, integrado ao Supabase para banco de dados, autenticação e storage de imagens.
Toda estrutura está conectada ao repositório do GitHub e configurada para deploy automático na Vercel.

🚀 Tecnologias principais

Next.js 15 (App Router)

React 18

TypeScript

Tailwind CSS

Supabase (DB + Auth + Storage)

Vercel (Deploy)

🧩 Configuração inicial

Após clonar o repositório:

git clone https://github.com/fortxavier/site-fort-xavier.git
cd site-fort-xavier
npm install

🔐 Criar arquivo .env.local

Antes de rodar o projeto localmente, crie o arquivo:

.env.local


E adicione as credenciais:

NEXT_PUBLIC_SUPABASE_URL=https://hqbuctqeomaexlfvztkc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxYnVjdHFlb21hZXhsZnZ6dGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODgzNDMsImV4cCI6MjA3NTk2NDM0M30.r6gP-grTGI8-ixI4cZKIMknx30OHM0cO2xfApDD9qsg


Essas chaves permitem:

Acesso ao banco Supabase

Consulta aos registros dos imóveis

Upload e leitura de imagens no storage

🔑 Acesso administrativo

O sistema possui autenticação via RPC personalizado no Supabase.

Usuário Admin criado:

Username: admin
Senha: fxAdmin2025!


Esse login está registrado na tabela fx_user do Supabase, utilizando hashing bcrypt.

▶️ Rodar o projeto localmente

Após configurar o .env.local:

npm run dev


Acesse:

http://localhost:3000

🚀 Deploy automático (Vercel)

O projeto está configurado para:

Build automático a cada push no branch main

Uso do Next 15 + App Router

ESLint relaxado (não bloqueia builds)

Suporte a imagens externas (configurado via next.config.ts)

📦 Estrutura resumida
src/
  app/
    admin/
      imoveis/...
      leads/...
    empreendimentos/...
    contato/
    sobre/
    page.tsx
  lib/
    supabase.ts
    hooks/
public/
  assets/
eslint.config.mjs
next.config.ts
tailwind.config.js

🛠 Informações adicionais
✔ Storage de imagens

Todas as imagens estão no bucket Supabase.

Uploads de capa, card e galeria seguem padrão unificado via hooks internos.

✔ Banco de dados

Tabela principal: fx_properties

Tabela de usuários: fx_user

Função RPC: authenticate_user

✔ ESLint

Para evitar que erros de lint travem o deploy, o projeto usa:

Custom eslint.config.mjs

eslint.ignoreDuringBuilds: true no Next

📌 Checklist antes do deploy

 .env.local configurado localmente

 Vercel configurada com variáveis de produção

 Push feito para main

 Supabase com usuário admin ativo

 Storage configurado

📄 Licença

Projeto privado da Fort Xavier.
Uso e distribuição não autorizados.
