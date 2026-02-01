import { z } from 'zod';

// Auth
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

// Usuario
export const createUsuarioSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  telefone: z.string().optional(),
  dataNascimento: z.string().datetime().optional(),
  genero: z.enum(['M', 'F']),
  funcao: z.enum(['ADM', 'PASTOR', 'DISCIPULADOR', 'DISCIPULO']).default('DISCIPULO'),
  supervisorId: z.string().uuid().optional(),
  ministerioId: z.string().uuid().optional(),
  batizado: z.boolean().optional(),
  universidadeVida: z.boolean().optional(),
  capacitacaoDestino1: z.boolean().optional(),
  capacitacaoDestino2: z.boolean().optional(),
  capacitacaoDestino3: z.boolean().optional(),
  nivelAtividade: z.number().min(1).max(5).optional(),
});

export const updateUsuarioSchema = createUsuarioSchema.partial().omit({ senha: true });

export const promoverUsuarioSchema = z.object({
  novaFuncao: z.enum(['PASTOR', 'DISCIPULADOR', 'DISCIPULO']),
  motivo: z.string().optional(),
});

// Estudo
export const createEstudoSchema = z.object({
  tema: z.string().min(5, 'Tema deve ter no mínimo 5 caracteres'),
  conteudo: z.string().min(50, 'Conteúdo deve ter no mínimo 50 caracteres'),
});

// Ministerio
export const createMinisterioSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  descricao: z.string().optional(),
  cor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor deve estar em formato hexadecimal').optional(),
  icone: z.string().optional(),
});

export const updateMinisterioSchema = createMinisterioSchema.partial();
