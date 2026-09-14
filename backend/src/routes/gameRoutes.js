const express = require('express');
const { requireAuth } = require('../middleware/auth');
const game = require('../controllers/gameController');

const router = express.Router();
router.use(requireAuth);
router.get('/estado', game.getState);
router.get('/eventos', game.getEvents);
router.get('/historial', game.listHistory);
router.post('/iniciar', game.startGame);
router.post('/finalizar', game.finalizeGame);
router.post('/abandonar', game.abandonGame);
router.post('/accion/escanear-paciente', game.scanPatient);
router.post('/accion/aplicar-tratamiento', game.applyTreatment);
router.post('/accion/confirmar-tratamiento', game.applyTreatment);
router.post('/accion/rechazar-paciente', game.rejectPatient);
router.post('/accion/admitir-paciente', game.admitPatient);
router.post('/accion/usar-taser', game.useTaser);
router.post('/accion/comprar-clase', game.buyClass);

module.exports = router;
