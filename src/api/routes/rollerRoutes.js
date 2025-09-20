const express = require('express');
const RollerController = require('../controllers/rollerController');

const router = express.Router();

router.post('/start', RollerController.startNewDraw);
router.get('/', RollerController.getCurrentDraw);
router.put('/locker/:id', RollerController.updateLockerDetails);
router.delete('/clear', RollerController.clearCurrentDraw);
router.get('/history', RollerController.getDrawHistory);

module.exports = router;