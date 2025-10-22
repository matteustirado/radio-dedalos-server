const express = require('express');
const multer =require('multer');
const path = require('path');
const fs = require('fs');
const GameConfigController = require('../controllers/gameConfigController');

const router = express.Router();

const tempDir = path.join(__dirname, '../../../uploads/temp_game_options');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}
const upload = multer({ dest: tempDir });


router.get('/:unit', GameConfigController.getGameConfig);

router.put(
    '/:unit',
    upload.any(), 
    GameConfigController.updateGameConfig
);

module.exports = router;