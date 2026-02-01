-- CreateTable
CREATE TABLE `usuarios` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha_hash` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(191) NULL,
    `data_nascimento` DATETIME(3) NULL,
    `genero` ENUM('M', 'F') NOT NULL,
    `funcao` ENUM('ADM', 'PASTOR', 'DISCIPULADOR', 'DISCIPULO') NOT NULL DEFAULT 'DISCIPULO',
    `supervisor_id` VARCHAR(191) NULL,
    `foto_url` VARCHAR(191) NULL,
    `batizado` BOOLEAN NOT NULL DEFAULT false,
    `universidade_vida` BOOLEAN NOT NULL DEFAULT false,
    `capacitacao_destino_1` BOOLEAN NOT NULL DEFAULT false,
    `capacitacao_destino_2` BOOLEAN NOT NULL DEFAULT false,
    `capacitacao_destino_3` BOOLEAN NOT NULL DEFAULT false,
    `nivel_atividade` INTEGER NOT NULL DEFAULT 3,
    `ministerio_id` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `data_cadastro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_atualizacao` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_email_key`(`email`),
    INDEX `usuarios_supervisor_id_idx`(`supervisor_id`),
    INDEX `usuarios_funcao_idx`(`funcao`),
    INDEX `usuarios_email_idx`(`email`),
    INDEX `usuarios_ativo_idx`(`ativo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ministerios` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `cor` VARCHAR(191) NULL,
    `icone` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `data_cadastro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ministerios_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estudos` (
    `id` VARCHAR(191) NOT NULL,
    `tema` VARCHAR(191) NOT NULL,
    `conteudo` TEXT NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `visualizacoes` INTEGER NOT NULL DEFAULT 0,
    `favorito` BOOLEAN NOT NULL DEFAULT false,

    INDEX `estudos_usuario_id_idx`(`usuario_id`),
    INDEX `estudos_data_criacao_idx`(`data_criacao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historico_funcoes` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `funcao_anterior` ENUM('ADM', 'PASTOR', 'DISCIPULADOR', 'DISCIPULO') NOT NULL,
    `funcao_nova` ENUM('ADM', 'PASTOR', 'DISCIPULADOR', 'DISCIPULO') NOT NULL,
    `alterado_por_id` VARCHAR(191) NOT NULL,
    `data_alteracao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `motivo` VARCHAR(191) NULL,

    INDEX `historico_funcoes_usuario_id_idx`(`usuario_id`),
    INDEX `historico_funcoes_data_alteracao_idx`(`data_alteracao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_supervisor_id_fkey` FOREIGN KEY (`supervisor_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_ministerio_id_fkey` FOREIGN KEY (`ministerio_id`) REFERENCES `ministerios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estudos` ADD CONSTRAINT `estudos_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historico_funcoes` ADD CONSTRAINT `historico_funcoes_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historico_funcoes` ADD CONSTRAINT `historico_funcoes_alterado_por_id_fkey` FOREIGN KEY (`alterado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
