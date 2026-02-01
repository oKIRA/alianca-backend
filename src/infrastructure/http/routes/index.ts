import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { UsuarioController } from '../controllers/UsuarioController';
import { DashboardController } from '../controllers/DashboardController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Instanciar controllers
const authController = new AuthController();
const usuarioController = new UsuarioController();
const dashboardController = new DashboardController();

// Rotas públicas - Auth
router.post('/auth/login', (req, res, next) => authController.login(req, res, next));

// Rotas autenticadas
router.use(authMiddleware);

// Auth
router.get('/auth/me', (req, res, next) => authController.me(req, res, next));
router.post('/auth/logout', (req, res, next) => authController.logout(req, res));

// Usuários
router.get('/usuarios', (req, res, next) => usuarioController.list(req, res, next));
router.get('/usuarios/:id', (req, res, next) => usuarioController.getById(req, res, next));
router.post('/usuarios', (req, res, next) => usuarioController.create(req, res, next));
router.put('/usuarios/:id', (req, res, next) => usuarioController.update(req, res, next));
router.patch('/usuarios/:id/promover', (req, res, next) => usuarioController.promover(req, res, next));
router.delete('/usuarios/:id', (req, res, next) => usuarioController.delete(req, res, next));
router.patch('/usuarios/:id/senha', (req, res, next) => usuarioController.updateSenha(req, res, next));

// Dashboard
router.get('/dashboard/estatisticas', (req, res, next) => dashboardController.getEstatisticas(req, res, next));
router.get('/dashboard/hierarquia', (req, res, next) => dashboardController.getHierarquia(req, res, next));

export { router };
