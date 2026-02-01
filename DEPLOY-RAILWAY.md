# 🚂 Deploy no Railway - Guia Completo

## 📋 Pré-requisitos

- Conta no GitHub
- Conta no Railway (https://railway.app)
- Projeto commitado no Git

---

## 🚀 Passo 1: Preparar o Projeto

### 1.1 Criar arquivo `.gitignore` (se não existe)

```
node_modules/
dist/
.env
*.log
.DS_Store
```

### 1.2 Adicionar script de build no package.json

Verifique se existe:
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "postinstall": "prisma generate"
  }
}
```

### 1.3 Criar arquivo `railway.json` (opcional, mas recomendado)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## 📦 Passo 2: Subir Código para o GitHub

```bash
# Inicializar repositório Git (se ainda não fez)
git init

# Adicionar arquivos
git add .

# Commit
git commit -m "Initial commit - Backend Aliança"

# Criar repositório no GitHub e conectar
# Vá em: https://github.com/new
# Depois execute:
git remote add origin https://github.com/SEU-USUARIO/alianca-backend.git
git branch -M main
git push -u origin main
```

---

## 🗄️ Passo 3: Configurar MySQL no Railway

### 3.1 Acessar Railway
1. Entre em: https://railway.app
2. Clique em **"Start a New Project"**
3. Selecione **"Provision MySQL"**

### 3.2 Obter Credenciais do MySQL
1. Clique no serviço MySQL criado
2. Vá na aba **"Variables"**
3. Copie as variáveis (você vai precisar delas):
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLDATABASE`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`

### 3.3 Montar a DATABASE_URL

Formato:
```
mysql://MYSQLUSER:MYSQLPASSWORD@MYSQLHOST:MYSQLPORT/MYSQLDATABASE
```

Exemplo:
```
mysql://root:XkR9mPqL2nVw@mysql.railway.internal:3306/railway
```

⚠️ **IMPORTANTE:** Guarde essa URL, você vai usar no próximo passo!

---

## 🚀 Passo 4: Deploy do Backend

### 4.1 Adicionar Novo Serviço
1. No mesmo projeto do Railway, clique em **"+ New"**
2. Selecione **"GitHub Repo"**
3. Conecte sua conta do GitHub (se ainda não conectou)
4. Selecione o repositório **alianca-backend**

### 4.2 Configurar Variáveis de Ambiente

Clique no serviço do backend → Aba **"Variables"** → Adicione:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://user:pass@host:port/database
JWT_SECRET=sua_chave_secreta_super_forte_minimo_32_caracteres
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://seu-frontend.vercel.app
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

⚠️ **Substitua:**
- `DATABASE_URL` → Com a URL do MySQL que você montou no passo 3.3
- `JWT_SECRET` → Gere uma nova chave forte
- `FRONTEND_URL` → URL do seu frontend quando estiver no ar

### 4.3 Gerar JWT_SECRET Forte

Execute no PowerShell:
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
```

---

## 🔧 Passo 5: Configurar Build

### 5.1 Verificar Configuração de Build

O Railway deve detectar automaticamente, mas se precisar:

1. Vá em **Settings** do serviço
2. **Build Command:** `npm install && npm run build && npx prisma generate`
3. **Start Command:** `npx prisma migrate deploy && npm start`

---

## 🗃️ Passo 6: Executar Migrations

### Opção A: Via Start Command (Recomendado)

Já configuramos no passo 5.1: `npx prisma migrate deploy && npm start`

### Opção B: Via Railway CLI

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link ao projeto
railway link

# Executar migrations
railway run npx prisma migrate deploy

# Popular banco (seed)
railway run npm run prisma:seed
```

---

## 🌐 Passo 7: Obter URL Pública

1. Clique no serviço do backend
2. Vá em **"Settings"**
3. Role até **"Networking"**
4. Clique em **"Generate Domain"**
5. Copie a URL gerada (ex: `alianca-backend-production.up.railway.app`)

---

## ✅ Passo 8: Testar a API

```powershell
# Teste health check
Invoke-RestMethod -Uri https://seu-app.up.railway.app/health

# Teste login
$body = @{
    email = "admin@alianca.com"
    senha = "admin123"
} | ConvertTo-Json

Invoke-RestMethod -Uri https://seu-app.up.railway.app/api/auth/login -Method Post -Body $body -ContentType "application/json"
```

---

## 🔄 Atualizações Futuras

Para atualizar o backend:

```bash
# Fazer alterações no código
git add .
git commit -m "Sua mensagem"
git push

# Railway fará deploy automático! 🎉
```

---

## 🐛 Troubleshooting

### Erro: "Cannot connect to database"

**Solução:**
1. Verifique se o MySQL está rodando no Railway
2. Confirme a `DATABASE_URL` nas variáveis
3. Verifique se colocou `mysql://` no início

### Erro: "Prisma migrations failed"

**Solução:**
```bash
# Via Railway CLI
railway run npx prisma migrate reset
railway run npm run prisma:seed
```

### Ver Logs

1. No Railway, clique no serviço
2. Aba **"Deployments"**
3. Clique no deployment ativo
4. Veja os logs em tempo real

### Erro: "Module not found"

**Solução:**
Certifique-se que o `package.json` tem o script `postinstall`:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

---

## 💰 Custos

Railway oferece:
- ✅ **$5 de crédito grátis/mês** (suficiente para testar)
- ✅ **Plan Hobby:** $5/mês
- ✅ **Plan Pro:** $20/mês (mais recursos)

---

## 🔐 Segurança em Produção

Depois do deploy:

1. ✅ Gere novo `JWT_SECRET` forte
2. ✅ Configure `FRONTEND_URL` correto
3. ✅ Ative HTTPS (automático no Railway)
4. ✅ Monitore os logs regularmente
5. ✅ Faça backup do banco periodicamente

---

## 📊 Monitoramento

Railway oferece:
- 📈 Métricas de CPU e Memória
- 📝 Logs em tempo real
- 🔔 Alertas (no plano Pro)

---

## 🎉 Pronto!

Sua aplicação está no ar! 🚀

**URLs importantes:**
- Backend: `https://seu-app.up.railway.app`
- Health Check: `https://seu-app.up.railway.app/health`
- API: `https://seu-app.up.railway.app/api/*`

**Próximos passos:**
1. Configure o frontend para usar a URL do Railway
2. Teste todos os endpoints
3. Configure domínio customizado (opcional)
4. Configure CI/CD para testes automáticos

---

## 📞 Recursos Úteis

- 📚 Docs Railway: https://docs.railway.app
- 💬 Discord Railway: https://discord.gg/railway
- 🎓 Tutoriais: https://railway.app/learn
