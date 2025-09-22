const express = require('express');
const ReportController = require('../controllers/reportController');

const router = express.Router();

router.post('/', ReportController.createReport);
router.get('/', ReportController.getAllReports);
router.put('/:id', ReportController.updateReportStatus);

module.exports = router;