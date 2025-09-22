const express = require('express');
const PriceController = require('../controllers/priceController');

const router = express.Router();

router.get('/:locationSlug', PriceController.getPricesByLocation);
router.put('/:locationSlug', PriceController.updatePricesByLocation);

module.exports = router;