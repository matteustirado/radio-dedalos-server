const express = require('express');
const LogController = require('../controllers/logController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(authMiddleware, roleMiddleware('master'));
router.get('/', LogController.getAllLogs);

module.exports = router;