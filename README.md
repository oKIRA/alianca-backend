# 🙏 Sistema Aliança - Backend

Backend do Sistema de Gestão Eclesiástica Aliança (Modelo G12)

## 🚀 Tecnologias

- Node.js 20+
- TypeScript
- Express
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Zod Validation

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Copiar .env
cp .env.example .env

# Configurar banco de dados no .env
# DATABASE_URL="postgresql://usuario:senha@localhost:5432/alianca_db"

# Gerar Prisma Client
npm run prisma:generate

# Rodar migrations
npm run prisma:migrate

# Popular banco (seed)
npm run prisma:seed
```

## 🏃 Executar

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

## 📚 Documentação

### Credenciais Padrão (após seed)
- **ADM:** admin@alianca.com / admin123
- **PASTOR:** pastor@alianca.com / pastor123
- **LÍDER:** lider@alianca.com / lider123

### Endpoints Principais

#### Autenticação
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Dados do usuário logado
- `POST /api/auth/logout` - Logout

#### Usuários
- `GET /api/usuarios` - Listar usuários
- `GET /api/usuarios/:id` - Detalhes de usuário
- `POST /api/usuarios` - Criar usuário
- `PUT /api/usuarios/:id` - Atualizar usuário
- `PATCH /api/usuarios/:id/funcao` - Promover/Rebaixar
- `DELETE /api/usuarios/:id` - Desativar usuário

#### Dashboard
- `GET /api/dashboard/estatisticas` - Estatísticas gerais
- `GET /api/dashboard/hierarquia` - Árvore hierárquica

#### Ministérios
- `GET /api/ministerios` - Listar ministérios
- `POST /api/ministerios` - Criar ministério (ADM)
- `PUT /api/ministerios/:id` - Atualizar ministério
- `DELETE /api/ministerios/:id` - Desativar ministério

#### Estudos
- `GET /api/estudos` - Listar estudos
- `GET /api/estudos/:id` - Detalhes de estudo
- `POST /api/estudos` - Criar estudo
- `PATCH /api/estudos/:id/favorito` - Favoritar
- `DELETE /api/estudos/:id` - Deletar estudo

## 🔐 Autenticação

Todas as rotas exceto `/api/auth/login` requerem token JWT:

```
Authorization: Bearer {token}
```

## 🗄️ Banco de Dados

O sistema usa PostgreSQL com Prisma ORM. Veja `prisma/schema.prisma` para o modelo completo.

### Prisma Studio
```bash
npm run prisma:studio
```

## 📝 Estrutura do Projeto

```
src/
├── application/        # Casos de uso
├── domain/            # Entidades e regras de negócio
├── infrastructure/    # Implementações (DB, HTTP)
├── shared/            # Utilitários
├── config/            # Configurações
└── server.ts          # Entry point
```

## 🧪 Testes

```bash
npm test
npm run test:watch
npm run test:coverage
```

## 📄 Licença

MIT
