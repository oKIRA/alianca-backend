# 🧪 Guia de Testes da API

## 📋 Endpoints Disponíveis

### 🔓 Autenticação (Públicos)
- `POST /api/auth/login` - Login

### 🔐 Autenticação (Protegidos)
- `GET /api/auth/me` - Dados do usuário logado
- `POST /api/auth/logout` - Logout

### 👥 Usuários
- `GET /api/usuarios` - Listar usuários
- `GET /api/usuarios/:id` - Buscar usuário
- `POST /api/usuarios` - Criar usuário
- `PUT /api/usuarios/:id` - Atualizar usuário
- `DELETE /api/usuarios/:id` - Desativar usuário
- `PATCH /api/usuarios/:id/promover` - Promover usuário
- `PATCH /api/usuarios/:id/senha` - Alterar senha

### 📊 Dashboard
- `GET /api/dashboard/estatisticas` - Estatísticas
- `GET /api/dashboard/hierarquia` - Hierarquia

---

## 🚀 Testando com PowerShell

### 1. Health Check (Verificar se servidor está rodando)

```powershell
Invoke-RestMethod -Uri http://localhost:3000/health
```

---

### 2. Login (Obter Token)

```powershell
# Login como Admin
$loginBody = @{
    email = "admin@alianca.com"
    senha = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri http://localhost:3000/api/auth/login -Method Post -Body $loginBody -ContentType "application/json"

# Salvar o token
$token = $loginResponse.token
Write-Host "✅ Token obtido: $token" -ForegroundColor Green

# Ver dados do usuário
$loginResponse.usuario
```

**Resultado esperado:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": "uuid-aqui",
    "nome": "Administrador",
    "email": "admin@alianca.com",
    "funcao": "ADM",
    "fotoUrl": null,
    "ministerio": null
  }
}
```

---

### 3. Obter Dados do Usuário Logado

```powershell
# Usar o token do login anterior
$headers = @{
    "Authorization" = "Bearer $token"
}

$meResponse = Invoke-RestMethod -Uri http://localhost:3000/api/auth/me -Method Get -Headers $headers
$meResponse
```

---

### 4. Listar Todos os Usuários

```powershell
# Listar com paginação
$usuarios = Invoke-RestMethod -Uri "http://localhost:3000/api/usuarios?page=1&limit=10" -Method Get -Headers $headers
$usuarios

# Ver apenas os nomes
$usuarios.data | ForEach-Object { $_.nome }

# Filtrar por função
$pastores = Invoke-RestMethod -Uri "http://localhost:3000/api/usuarios?funcao=PASTOR" -Method Get -Headers $headers
$pastores.data
```

---

### 5. Criar Novo Usuário

```powershell
$novoUsuario = @{
    nome = "João Silva"
    email = "joao@alianca.com"
    senha = "Senha@123"
    telefone = "(11) 98765-4321"
    genero = "M"
    funcao = "DISCIPULO"
    batizado = $true
    universidadeVida = $false
} | ConvertTo-Json

$usuarioCriado = Invoke-RestMethod -Uri http://localhost:3000/api/usuarios -Method Post -Body $novoUsuario -Headers $headers -ContentType "application/json"
$usuarioCriado

# Salvar o ID para usar depois
$joaoId = $usuarioCriado.id
```

---

### 6. Buscar Usuário por ID

```powershell
$usuario = Invoke-RestMethod -Uri "http://localhost:3000/api/usuarios/$joaoId" -Method Get -Headers $headers
$usuario
```

---

### 7. Atualizar Usuário

```powershell
$atualizacao = @{
    telefone = "(11) 91234-5678"
    batizado = $true
    universidadeVida = $true
} | ConvertTo-Json

$usuarioAtualizado = Invoke-RestMethod -Uri "http://localhost:3000/api/usuarios/$joaoId" -Method Put -Body $atualizacao -Headers $headers -ContentType "application/json"
$usuarioAtualizado
```

---

### 8. Promover Usuário

```powershell
$promocao = @{
    novaFuncao = "DISCIPULADOR"
    motivo = "Demonstrou liderança e compromisso"
} | ConvertTo-Json

$usuarioPromovido = Invoke-RestMethod -Uri "http://localhost:3000/api/usuarios/$joaoId/promover" -Method Patch -Body $promocao -Headers $headers -ContentType "application/json"
$usuarioPromovido
```

---

### 9. Alterar Senha

```powershell
$novaSenha = @{
    senhaAtual = "Senha@123"
    novaSenha = "NovaSenha@456"
} | ConvertTo-Json

$senhaAlterada = Invoke-RestMethod -Uri "http://localhost:3000/api/usuarios/$joaoId/senha" -Method Patch -Body $novaSenha -Headers $headers -ContentType "application/json"
$senhaAlterada
```

---

### 10. Dashboard - Estatísticas

```powershell
$estatisticas = Invoke-RestMethod -Uri http://localhost:3000/api/dashboard/estatisticas -Method Get -Headers $headers
$estatisticas

# Ver totais
$estatisticas.totais

# Ver métricas espirituais
$estatisticas.espirituais

# Ver demografia
$estatisticas.demograficos
```

---

### 11. Dashboard - Hierarquia

```powershell
$hierarquia = Invoke-RestMethod -Uri http://localhost:3000/api/dashboard/hierarquia -Method Get -Headers $headers
$hierarquia

# Ver discípulos diretos
$hierarquia.discipulos_diretos
```

---

### 12. Desativar Usuário (Soft Delete)

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/usuarios/$joaoId" -Method Delete -Headers $headers
Write-Host "✅ Usuário desativado com sucesso" -ForegroundColor Green
```

---

## 🛠️ Script Completo de Teste

Copie e cole no PowerShell:

```powershell
# ========================================
# SCRIPT DE TESTE COMPLETO DA API
# ========================================

Write-Host "🧪 Iniciando testes da API Aliança" -ForegroundColor Cyan
Write-Host ""

# 1. Health Check
Write-Host "1️⃣ Testando Health Check..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri http://localhost:3000/health
Write-Host "✅ Status: $($health.status)" -ForegroundColor Green
Write-Host ""

# 2. Login
Write-Host "2️⃣ Fazendo login..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@alianca.com"
    senha = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri http://localhost:3000/api/auth/login -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token
Write-Host "✅ Login realizado com sucesso!" -ForegroundColor Green
Write-Host "   Usuário: $($loginResponse.usuario.nome)" -ForegroundColor White
Write-Host ""

# 3. Headers com token
$headers = @{
    "Authorization" = "Bearer $token"
}

# 4. Buscar dados do usuário logado
Write-Host "3️⃣ Buscando dados do usuário logado..." -ForegroundColor Yellow
$me = Invoke-RestMethod -Uri http://localhost:3000/api/auth/me -Method Get -Headers $headers
Write-Host "✅ Email: $($me.email) | Função: $($me.funcao)" -ForegroundColor Green
Write-Host ""

# 5. Listar usuários
Write-Host "4️⃣ Listando usuários..." -ForegroundColor Yellow
$usuarios = Invoke-RestMethod -Uri "http://localhost:3000/api/usuarios?page=1&limit=10" -Method Get -Headers $headers
Write-Host "✅ Total de usuários: $($usuarios.total)" -ForegroundColor Green
Write-Host "   Usuários na página: $($usuarios.data.Count)" -ForegroundColor White
$usuarios.data | ForEach-Object { Write-Host "   - $($_.nome) ($($_.funcao))" -ForegroundColor Gray }
Write-Host ""

# 6. Criar novo usuário
Write-Host "5️⃣ Criando novo usuário..." -ForegroundColor Yellow
$novoUsuario = @{
    nome = "Teste Silva"
    email = "teste@alianca.com"
    senha = "Teste@123"
    telefone = "(11) 98765-4321"
    genero = "M"
    funcao = "DISCIPULO"
    batizado = $false
} | ConvertTo-Json

try {
    $usuarioCriado = Invoke-RestMethod -Uri http://localhost:3000/api/usuarios -Method Post -Body $novoUsuario -Headers $headers -ContentType "application/json"
    $testeId = $usuarioCriado.id
    Write-Host "✅ Usuário criado: $($usuarioCriado.nome)" -ForegroundColor Green
    Write-Host ""

    # 7. Buscar usuário criado
    Write-Host "6️⃣ Buscando usuário criado..." -ForegroundColor Yellow
    $usuario = Invoke-RestMethod -Uri "http://localhost:3000/api/usuarios/$testeId" -Method Get -Headers $headers
    Write-Host "✅ Usuário encontrado: $($usuario.nome)" -ForegroundColor Green
    Write-Host ""

    # 8. Dashboard - Estatísticas
    Write-Host "7️⃣ Buscando estatísticas..." -ForegroundColor Yellow
    $stats = Invoke-RestMethod -Uri http://localhost:3000/api/dashboard/estatisticas -Method Get -Headers $headers
    Write-Host "✅ Estatísticas obtidas:" -ForegroundColor Green
    Write-Host "   - Total discípulos: $($stats.totais.discipulos)" -ForegroundColor White
    Write-Host "   - Batizados: $($stats.espirituais.batizados)" -ForegroundColor White
    Write-Host "   - Homens: $($stats.demograficos.homens) | Mulheres: $($stats.demograficos.mulheres)" -ForegroundColor White
    Write-Host ""

    # 9. Dashboard - Hierarquia
    Write-Host "8️⃣ Buscando hierarquia..." -ForegroundColor Yellow
    $hierarquia = Invoke-RestMethod -Uri http://localhost:3000/api/dashboard/hierarquia -Method Get -Headers $headers
    Write-Host "✅ Hierarquia obtida:" -ForegroundColor Green
    Write-Host "   - Discípulos diretos: $($hierarquia.discipulos_diretos.Count)" -ForegroundColor White
    Write-Host ""

    # 10. Limpar - Desativar usuário de teste
    Write-Host "9️⃣ Limpando usuário de teste..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri "http://localhost:3000/api/usuarios/$testeId" -Method Delete -Headers $headers
    Write-Host "✅ Usuário de teste removido" -ForegroundColor Green
    Write-Host ""

} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 409) {
        Write-Host "⚠️ Usuário teste@alianca.com já existe" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "🎉 Testes concluídos com sucesso!" -ForegroundColor Green
```

---

## 🔧 Ferramentas Recomendadas

### 1. **Postman** (Recomendado)
- Download: https://www.postman.com/downloads/
- Interface gráfica intuitiva
- Salva requisições
- Testa facilmente

### 2. **Insomnia**
- Download: https://insomnia.rest/download
- Alternativa ao Postman
- Mais leve

### 3. **Thunder Client** (Extensão VS Code)
- Instale no VS Code
- Teste diretamente no editor
- Muito prático

### 4. **REST Client** (Extensão VS Code)
- Crie arquivos `.http` com as requisições
- Execute direto do VS Code

---

## 📝 Exemplo de Arquivo .http (REST Client)

Crie um arquivo `api-tests.http`:

```http
### Health Check
GET http://localhost:3000/health

### Login
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@alianca.com",
  "senha": "admin123"
}

### Me (substitua o token)
GET http://localhost:3000/api/auth/me
Authorization: Bearer SEU_TOKEN_AQUI

### Listar Usuários
GET http://localhost:3000/api/usuarios?page=1&limit=10
Authorization: Bearer SEU_TOKEN_AQUI

### Criar Usuário
POST http://localhost:3000/api/usuarios
Content-Type: application/json
Authorization: Bearer SEU_TOKEN_AQUI

{
  "nome": "Novo Usuário",
  "email": "novo@alianca.com",
  "senha": "Senha@123",
  "genero": "M",
  "funcao": "DISCIPULO"
}

### Dashboard Estatísticas
GET http://localhost:3000/api/dashboard/estatisticas
Authorization: Bearer SEU_TOKEN_AQUI
```

---

## 🎯 Próximos Passos

1. ✅ Execute o script completo de teste
2. ✅ Instale o Postman ou Thunder Client
3. ✅ Teste todos os endpoints
4. ✅ Explore o Prisma Studio: `npm run prisma:studio`
5. ✅ Comece a desenvolver seu frontend!

---

## 📞 Dicas

- Use `Write-Host` no PowerShell para formatar a saída
- Salve o token em uma variável para reutilizar
- Use try/catch para tratar erros
- Verifique os logs do servidor no terminal
