const express = require('express');
const ReportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.post('/', ReportController.createReport);
router.get('/', authMiddleware, roleMiddleware('master'), ReportController.getAllReports);
router.put('/:id', authMiddleware, roleMiddleware('master'), ReportController.updateReportStatus);

module.exports = router;