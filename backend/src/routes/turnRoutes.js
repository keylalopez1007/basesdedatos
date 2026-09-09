const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { listTurns, finalizeTurn } = require('../controllers/turnController');

const router = express.Router();
router.post('/:turnoId/finalizar', requireAuth, finalizeTurn);
router.get('/', requireAuth, listTurns);

module.exports = router;
