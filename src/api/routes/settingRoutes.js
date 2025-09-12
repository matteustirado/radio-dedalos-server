const express = require('express');
const SettingController = require('../controllers/settingController');

const router = express.Router();

router.get('/active-overlay', SettingController.getActiveOverlay);
router.get('/:key', SettingController.getSetting);
router.put('/:key', SettingController.updateSetting);

module.exports = router;