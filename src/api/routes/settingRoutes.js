const express = require('express');
const SettingController = require('../controllers/settingController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

const allowedRoles = ['dj', 'admin', 'master'];

router.get('/active-overlay', SettingController.getActiveOverlay);

router.get('/:key', authMiddleware, roleMiddleware(allowedRoles), SettingController.getSetting);
router.put('/:key', authMiddleware, roleMiddleware(allowedRoles), SettingController.updateSetting);

module.exports = router;