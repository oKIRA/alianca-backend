# 🚀 Guia de Configuração do Banco de Dados

## 📝 Índice
1. [Instalar PostgreSQL](#1-instalar-postgresql)
2. [Criar o Banco de Dados](#2-criar-o-banco-de-dados)
3. [Configurar Variáveis de Ambiente](#3-configurar-variáveis-de-ambiente)
4. [Executar Migrations](#4-executar-migrations)
5. [Popular o Banco (Seed)](#5-popular-o-banco-seed)
6. [Rodar a Aplicação](#6-rodar-a-aplicação)
7. [Testar a API](#7-testar-a-api)

---

## 1. Instalar PostgreSQL

### Opção 1: Instalação Direta (Recomendado para Windows)

1. **Baixe o PostgreSQL:**
   - Acesse: https://www.postgresql.org/download/windows/
   - Baixe a versão mais recente (14 ou superior)

2. **Execute o instalador:**
   - Mantenha as configurações padrão
   - **IMPORTANTE:** Anote a senha que você definir para o usuário `postgres`
   - Porta padrão: `5432`
   - Instale também o pgAdmin 4 (interface gráfica)

3. **Verifique a instalação:**
   ```powershell
   psql --version
   ```

### Opção 2: Docker (Se você já usa Docker)

```powershell
# Criar container PostgreSQL
docker run --name alianca-postgres -e POSTGRES_PASSWORD=senha123 -e POSTGRES_DB=alianca_db -p 5432:5432 -d postgres:14

# Verificar se está rodando
docker ps
```

---

## 2. Criar o Banco de Dados

### Via psql (Terminal)

```powershell
# Conectar ao PostgreSQL (vai pedir a senha)
psql -U postgres

# Dentro do psql, criar o banco:
CREATE DATABASE alianca_db;

# Sair do psql
\q
```

### Via pgAdmin 4 (Interface Gráfica)

1. Abra o pgAdmin 4
2. Conecte ao servidor local (localhost)
3. Clique com botão direito em "Databases"
4. Escolha "Create" → "Database"
5. Nome: `alianca_db`
6. Clique em "Save"

---

## 3. Configurar Variáveis de Ambiente

Já criamos o arquivo `.env` para você. **EDITE-O COM SEUS DADOS:**

```env
# .env
NODE_ENV=development
PORT=3000

# Database - ALTERE AQUI!
# Formato: postgresql://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO?schema=public
DATABASE_URL="postgresql://postgres:SUA_SENHA_AQUI@localhost:5432/alianca_db?schema=public"

# JWT Configuration - ALTERE PARA UMA CHAVE SEGURA!
JWT_SECRET="gere_uma_chave_aleatoria_com_pelo_menos_32_caracteres_1234567890"
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### ⚠️ IMPORTANTE - Substitua:
- `SUA_SENHA_AQUI` → Senha do PostgreSQL que você definiu
- `JWT_SECRET` → Gere uma chave aleatória forte

**Dica para gerar JWT_SECRET:**
```powershell
# No PowerShell, execute:
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

---

## 4. Executar Migrations

As migrations criam as tabelas no banco de dados:

```powershell
# Gerar o Prisma Client (se ainda não foi feito)
npm run prisma:generate

# Criar e executar as migrations
npm run prisma:migrate

# Você verá algo assim:
# √ Enter a name for the new migration: » init
```

Digite um nome para a migration (ex: `init` ou `initial_setup`) e pressione Enter.

**O que isso faz?**
- Cria as tabelas: `usuarios`, `ministerios`, `estudos`, `historico_funcao`
- Configura relacionamentos e índices
- Salva a migration em `prisma/migrations/`

---

## 5. Popular o Banco (Seed)

Execute o seed para criar dados iniciais de teste:

```powershell
npm run prisma:seed
```

**Dados criados:**
- Usuário Administrador
- Usuário Pastor
- Alguns usuários de exemplo
- Ministérios

### Credenciais Padrão (após o seed):

Verifique no arquivo `prisma/seed.ts` as credenciais. Geralmente são:

```
Admin:
Email: admin@alianca.com
Senha: Admin@123

Pastor:
Email: pastor@alianca.com
Senha: Pastor@123
```

---

## 6. Rodar a Aplicação

```powershell
# Modo desenvolvimento (com hot reload)
npm run dev
```

**Você verá:**
```
✅ Conexão com banco de dados estabelecida
🚀 Servidor rodando na porta 3000
📝 Ambiente: development
🔗 http://localhost:3000
🏥 Health check: http://localhost:3000/health
```

---

## 7. Testar a API

### Testar Health Check

Abra o navegador ou use curl/PowerShell:

```powershell
# Via PowerShell
Invoke-WebRequest -Uri http://localhost:3000/health | Select-Object -ExpandProperty Content

# Deve retornar:
# {"status":"ok","timestamp":"2026-01-31T...","environment":"development"}
```

### Testar Login

**Via PowerShell:**

```powershell
$body = @{
    email = "admin@alianca.com"
    senha = "Admin@123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri http://localhost:3000/api/auth/login -Method Post -Body $body -ContentType "application/json"

$response
```

**Via cURL (se tiver instalado):**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@alianca.com\",\"senha\":\"Admin@123\"}"
```

### Usar Ferramentas de Teste (Recomendado)

**Opções:**
1. **Postman** - https://www.postman.com/downloads/
2. **Insomnia** - https://insomnia.rest/download
3. **Thunder Client** - Extensão do VS Code
4. **REST Client** - Extensão do VS Code

---

## 🔍 Comandos Úteis

```powershell
# Ver logs do Prisma Studio (interface visual do banco)
npm run prisma:studio

# Criar uma nova migration após alterar o schema
npm run prisma:migrate

# Resetar o banco (CUIDADO: apaga todos os dados!)
npx prisma migrate reset

# Ver status das migrations
npx prisma migrate status

# Formatar o schema.prisma
npx prisma format

# Ver dados no banco via terminal
npx prisma db pull
```

---

## 🐛 Troubleshooting

### Erro: "Can't reach database server"

**Verifique:**
1. PostgreSQL está rodando?
   ```powershell
   # Windows - Verificar serviço
   Get-Service -Name postgresql*
   ```
2. Credenciais corretas no `.env`?
3. Porta 5432 está disponível?
   ```powershell
   netstat -an | findstr 5432
   ```

### Erro: "Database alianca_db does not exist"

Execute:
```powershell
psql -U postgres
CREATE DATABASE alianca_db;
\q
```

### Erro: "JWT_SECRET deve ter no mínimo 32 caracteres"

Gere uma nova chave:
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Cole no `.env`:
```env
JWT_SECRET="sua_chave_gerada_aqui"
```

### Erro ao executar migrations

```powershell
# Resetar e recriar tudo
npx prisma migrate reset
npm run prisma:seed
```

---

## 📊 Verificar se está tudo OK

Execute este checklist:

- [ ] PostgreSQL instalado e rodando
- [ ] Banco `alianca_db` criado
- [ ] Arquivo `.env` configurado com senha correta
- [ ] `npm install` executado
- [ ] `npm run prisma:generate` executado
- [ ] `npm run prisma:migrate` executado
- [ ] `npm run prisma:seed` executado
- [ ] `npm run dev` rodando sem erros
- [ ] http://localhost:3000/health retorna `{"status":"ok"}`
- [ ] Login com admin@alianca.com funciona

---

## 🎉 Próximos Passos

Após tudo configurado:

1. **Teste todos os endpoints** usando Postman/Insomnia
2. **Leia a documentação da API** no README.md
3. **Explore o banco** com `npm run prisma:studio`
4. **Comece a desenvolver** novas features!

---

## 📞 Precisa de Ajuda?

Se encontrar problemas:
1. Verifique os logs do terminal
2. Confira o arquivo `.env`
3. Teste a conexão com o banco via psql ou pgAdmin
4. Verifique se todas as dependências foram instaladas

**Comando para reinstalar tudo:**
```powershell
rm -r node_modules
rm package-lock.json
npm install
npm run prisma:generate
```
