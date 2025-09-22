const express = require('express');
const BanController = require('../controllers/banController');

const router = express.Router();

router.post('/', BanController.createBan);
router.delete('/:id', BanController.deactivateBan);
router.get('/active', BanController.getActiveBans);
router.get('/', BanController.getAllBansForManager);
router.put('/:id/status', BanController.updateBanManagerStatus);

module.exports = router;