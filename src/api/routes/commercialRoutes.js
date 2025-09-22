const express = require('express');
const CommercialController = require('../controllers/commercialController');

const router = express.Router();

router.get('/', CommercialController.getAllCommercials);

module.exports = router;