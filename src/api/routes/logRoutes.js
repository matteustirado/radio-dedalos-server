const express = require('express');
const LogController = require('../controllers/logController');

const router = express.Router();

router.get('/', LogController.getAllLogs);

module.exports = router;