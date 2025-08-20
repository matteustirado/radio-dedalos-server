const express = require('express');
const CommercialController = require('../controllers/commercialController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(authMiddleware, roleMiddleware(['dj', 'admin', 'master']));
router.get('/', CommercialController.getAllCommercials);

module.exports = router;