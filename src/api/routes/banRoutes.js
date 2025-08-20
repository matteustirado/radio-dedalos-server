const express = require('express');
const BanController = require('../controllers/banController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(authMiddleware, roleMiddleware(['admin', 'master', 'dj']));

router.get('/', BanController.getActiveBans);
router.delete('/:song_id', BanController.removeBan);

module.exports = router;