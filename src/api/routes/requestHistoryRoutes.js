const express = require('express');
const RequestHistoryController = require('../controllers/requestHistoryController');

const router = express.Router();

router.get('/', RequestHistoryController.getHistory);
router.post('/', RequestHistoryController.createHistoryEntry);

module.exports = router;