import rateLimit from 'express-rate-limit';
import { env } from '@config/env';

export const loginRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 5, // 5 tentativas por minuto
  message: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Muitas requisições. Tente novamente em alguns minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});
