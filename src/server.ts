import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from '@config/env';
import { router } from '@infrastructure/http/routes';
import { errorHandler } from '@infrastructure/http/middlewares/errorHandler';
import { db } from '@infrastructure/database/firebase/client';

const app = express();

// Middlewares globais
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Muitas requisições deste IP, tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Rotas da API
app.use('/api', router);

// Handler de erros (deve ser o último middleware)
app.use(errorHandler);

// Inicialização do servidor
const PORT = env.PORT;

const server = app.listen(PORT, async () => {
  try {
    // Testar conectividade com o Firestore
    await db.collection('_health').limit(1).get();
    console.log('✅ Conexão com Firebase/Firestore estabelecida');
  } catch (error) {
    console.error('❌ Erro ao conectar com Firebase:', error);
    process.exit(1);
  }

  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📝 Ambiente: ${env.NODE_ENV}`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('\\n🛑 Encerrando servidor...');
  
  server.close(() => {
    console.log('✅ Servidor HTTP fechado');
    process.exit(0);
  });

  // Força o encerramento após 10 segundos
  setTimeout(() => {
    console.error('⚠️ Forçando encerramento do servidor...');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export { app };
