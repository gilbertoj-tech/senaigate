# SenaiGate: autorizações de circulação, entrada e saída (SENAI)

React (Vite) + Node.js (Express) + PostgreSQL. Consulta sem login; assinar exige NIF e senha individual.

## Preview sem servidor (dados de demonstração)
`npm run install:all && npm run build:demo` gera `client/dist` com tudo em memória (pode ir para o GitHub Pages).

## Fase de testes: GitHub + Supabase
1. Supabase: crie o projeto e copie a connection string em Project Settings > Database (use o **Session pooler**).
2. Suba este repositório no GitHub (o `.gitignore` já protege o `.env`).
3. O Supabase hospeda só o banco. O app Node precisa de uma hospedagem (Render, Railway, Fly.io...), que já entrega HTTPS.
   - Build: `npm run install:all && npm run build`
   - Start: `npm start`
   - Variáveis: `DATABASE_URL`, `DB_SSL=true`, `ADMIN_NIF`, `ADMIN_NOME`, `ADMIN_SENHA`
4. As tabelas e o administrador inicial são criados na primeira execução. O RLS fica ligado nas tabelas, o que bloqueia a API pública do Supabase.

## Produção na intranet
- O administrador inicial (NIF `sn1077068`) é criado pelo `schema.sql`, com a senha gravada só como hash e troca exigida no primeiro uso. Não deixe a senha em texto no GitHub.
- `DB_SSL=false` e `DATABASE_URL` do PostgreSQL local.
- HTTPS: coloque nginx/IIS na frente com certificado da CA interna, ou use `SSL_KEY_FILE` e `SSL_CERT_FILE` para o Node servir HTTPS direto.
- `node --env-file=server/.env server/index.js` (Node 20+). Desenvolvimento: `npm run dev:server` e `npm run dev:client`.

## Regras
- Encarregado e Responsável legal: Coordenação, OPP, QV e Secretaria. Docente assina só como Docente. Administrador assina tudo.
- Responsável é exigido apenas para menor de idade em saída.
- Troca de senha: o administrador marca o usuário; na próxima autorização o sistema pede a nova senha e continua a autorização. Há também "Alterar senha" voluntária.
