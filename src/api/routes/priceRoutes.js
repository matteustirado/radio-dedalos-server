const express = require('express');
const PriceController = require('../controllers/priceController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/:locationSlug', PriceController.getPricesByLocation);

const adminRoles = ['master', 'adm-tabela-sp', 'adm-tabela-bh'];
router.put('/:locationSlug', authMiddleware, roleMiddleware(adminRoles), PriceController.updatePricesByLocation);

module.exports = router;