import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Criar ADM
  const adminHash = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@alianca.com' },
    update: {},
    create: {
      nome: 'Administrador Sistema',
      email: 'admin@alianca.com',
      senhaHash: adminHash,
      telefone: '(11) 99999-9999',
      dataNascimento: new Date('1980-01-01'),
      genero: 'M',
      funcao: 'ADM',
      batizado: true,
      universidadeVida: true,
      capacitacaoDestino1: true,
      capacitacaoDestino2: true,
      capacitacaoDestino3: true,
      nivelAtividade: 5,
    },
  });

  console.log('✅ ADM criado:', admin.email);

  // Criar ministérios
  const ministerios = [
    { nome: 'Louvor', descricao: 'Ministério de Música e Adoração', cor: '#FF6B6B', icone: 'music' },
    { nome: 'Intercessão', descricao: 'Ministério de Oração', cor: '#4ECDC4', icone: 'hand-heart' },
    { nome: 'Infantil', descricao: 'Ministério com Crianças', cor: '#FFE66D', icone: 'baby' },
    { nome: 'Jovens', descricao: 'Ministério com Jovens', cor: '#95E1D3', icone: 'users' },
    { nome: 'Comunicação', descricao: 'Mídias e Comunicação', cor: '#A8E6CF', icone: 'megaphone' },
    { nome: 'Administrativo', descricao: 'Gestão e Administração', cor: '#FDCAE1', icone: 'briefcase' },
    { nome: 'Células', descricao: 'Coordenação de Células', cor: '#B4A7D6', icone: 'home' },
  ];

  for (const m of ministerios) {
    await prisma.ministerio.upsert({
      where: { nome: m.nome },
      update: {},
      create: m,
    });
  }

  console.log(`✅ ${ministerios.length} ministérios criados`);

  // Criar um pastor de exemplo
  const pastorHash = await bcrypt.hash('pastor123', 10);
  const louvorMinisterio = await prisma.ministerio.findUnique({ where: { nome: 'Louvor' } });
  
  const pastor = await prisma.usuario.upsert({
    where: { email: 'pastor@alianca.com' },
    update: {},
    create: {
      nome: 'Pastor João Silva',
      email: 'pastor@alianca.com',
      senhaHash: pastorHash,
      telefone: '(11) 98888-8888',
      dataNascimento: new Date('1975-05-15'),
      genero: 'M',
      funcao: 'PASTOR',
      supervisorId: admin.id,
      ministerioId: louvorMinisterio?.id,
      batizado: true,
      universidadeVida: true,
      capacitacaoDestino1: true,
      capacitacaoDestino2: true,
      nivelAtividade: 5,
    },
  });

  console.log('✅ Pastor criado:', pastor.email);

  // Criar um líder de exemplo
  const liderHash = await bcrypt.hash('lider123', 10);
  
  const lider = await prisma.usuario.upsert({
    where: { email: 'lider@alianca.com' },
    update: {},
    create: {
      nome: 'Líder Maria Santos',
      email: 'lider@alianca.com',
      senhaHash: liderHash,
      telefone: '(11) 97777-7777',
      dataNascimento: new Date('1990-08-20'),
      genero: 'F',
      funcao: 'DISCIPULADOR',
      supervisorId: pastor.id,
      batizado: true,
      universidadeVida: true,
      capacitacaoDestino1: true,
      nivelAtividade: 4,
    },
  });

  console.log('✅ Líder criado:', lider.email);

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('\n📧 Credenciais de acesso:');
  console.log('   ADM: admin@alianca.com / admin123');
  console.log('   PASTOR: pastor@alianca.com / pastor123');
  console.log('   LÍDER: lider@alianca.com / lider123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
