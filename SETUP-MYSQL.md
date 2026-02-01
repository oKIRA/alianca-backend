# 🗄️ Guia de Instalação - MySQL

## 📥 1. Baixar e Instalar MySQL

### Opção 1: MySQL Installer (Recomendado)

1. **Baixe o MySQL Installer:**
   - Acesse: https://dev.mysql.com/downloads/installer/
   - Escolha: **mysql-installer-community** (Windows)
   - Clique em "Download" (não precisa criar conta, clique em "No thanks, just start my download")

2. **Execute o instalador:**
   - Escolha: **Developer Default** (instala MySQL Server + Workbench)
   - Ou escolha: **Server only** (só o banco)

3. **Configure durante a instalação:**
   - **Tipo de configuração:** Development Computer
   - **Porta:** 3306 (padrão)
   - **Senha do root:** Defina uma senha (ex: `root123` ou `mysql123`)
   - **ANOTE ESSA SENHA!** Você vai precisar dela

4. **Verifique a instalação:**
   ```powershell
   mysql --version
   ```

### Opção 2: XAMPP (Mais Simples - Inclui MySQL + phpMyAdmin)

1. **Baixe XAMPP:**
   - Acesse: https://www.apachefriends.org/pt_br/download.html
   - Baixe a versão mais recente

2. **Instale o XAMPP:**
   - Execute o instalador
   - Marque: **MySQL** (pode desmarcar Apache se não precisar)

3. **Inicie o MySQL:**
   - Abra o XAMPP Control Panel
   - Clique em "Start" ao lado de MySQL
   - Senha padrão do root geralmente é vazia ou `root`

---

## 🔧 2. Criar o Banco de Dados

### Via MySQL Workbench (Interface Gráfica)

1. Abra o **MySQL Workbench**
2. Conecte ao servidor local (localhost)
3. Execute este comando:
   ```sql
   CREATE DATABASE alianca_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### Via Terminal/PowerShell

```powershell
# Conectar ao MySQL (vai pedir a senha do root)
mysql -u root -p

# Dentro do MySQL, executar:
CREATE DATABASE alianca_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Verificar se foi criado:
SHOW DATABASES;

# Sair
exit;
```

### Via XAMPP (phpMyAdmin)

1. Abra o navegador em: http://localhost/phpmyadmin
2. Clique em "New" (ou "Novo")
3. Nome do banco: `alianca_db`
4. Collation: `utf8mb4_unicode_ci`
5. Clique em "Create"

---

## ⚙️ 3. Configurar o .env

Edite o arquivo `.env` na raiz do projeto:

```env
# Database - MySQL
# Altere 'sua_senha' para a senha que você definiu
DATABASE_URL="mysql://root:sua_senha@localhost:3306/alianca_db"

# Exemplos:
# Se a senha for 'root123':
# DATABASE_URL="mysql://root:root123@localhost:3306/alianca_db"

# Se a senha for vazia (XAMPP padrão):
# DATABASE_URL="mysql://root:@localhost:3306/alianca_db"
```

**⚠️ IMPORTANTE:** Altere também o `JWT_SECRET`:
```env
JWT_SECRET="gere_uma_chave_aleatoria_com_pelo_menos_32_caracteres"
```

Para gerar uma chave aleatória:
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

---

## 🚀 4. Executar Migrations

Agora que o banco está configurado:

```powershell
# 1. Gerar o Prisma Client
npm run prisma:generate

# 2. Criar as tabelas (migrations)
npm run prisma:migrate
```

Quando pedir um nome para a migration, digite: `init` e pressione Enter.

**O que acontece:**
- Prisma cria todas as tabelas no MySQL
- Cria os relacionamentos e índices
- Salva a migration em `prisma/migrations/`

---

## 📊 5. Popular o Banco (Dados de Teste)

```powershell
npm run prisma:seed
```

Isso cria:
- Usuário Administrador
- Usuário Pastor
- Alguns usuários de exemplo
- Ministérios

---

## ▶️ 6. Rodar a Aplicação

```powershell
npm run dev
```

Você deve ver:
```
✅ Conexão com banco de dados estabelecida
🚀 Servidor rodando na porta 3000
```

---

## 🧪 7. Testar

Abra o navegador em: http://localhost:3000/health

Deve retornar:
```json
{"status":"ok","timestamp":"...","environment":"development"}
```

---

## 🐛 Problemas Comuns

### Erro: "Can't reach database server"

**Verifique:**
1. MySQL está rodando?
   ```powershell
   # Windows Services
   Get-Service -Name MySQL*
   ```
   Ou no XAMPP Control Panel, veja se MySQL está "Running"

2. Senha correta no `.env`?

3. Porta 3306 disponível?
   ```powershell
   netstat -an | findstr 3306
   ```

### Erro: "Unknown database 'alianca_db'"

Crie o banco:
```powershell
mysql -u root -p
CREATE DATABASE alianca_db;
exit;
```

### Erro: "Access denied for user 'root'"

A senha no `.env` está incorreta. Verifique:
- XAMPP geralmente usa senha vazia: `root:@localhost`
- MySQL Installer: use a senha que você definiu

---

## 📋 Checklist

- [ ] MySQL instalado e rodando
- [ ] Banco `alianca_db` criado
- [ ] `.env` configurado com senha correta
- [ ] `npm run prisma:generate` executado
- [ ] `npm run prisma:migrate` executado
- [ ] `npm run prisma:seed` executado
- [ ] `npm run dev` rodando sem erros
- [ ] http://localhost:3000/health funcionando

---

## 💡 Dicas

**Ver dados no banco:**
```powershell
# Abrir Prisma Studio (interface visual)
npm run prisma:studio
```

**Ou usar MySQL Workbench / phpMyAdmin**

---

## 🎉 Pronto!

Agora você tem:
- ✅ MySQL instalado
- ✅ Banco de dados criado
- ✅ Aplicação rodando
- ✅ Dados de teste no banco

Comece a testar a API! 🚀
