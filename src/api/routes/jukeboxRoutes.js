const express = require('express');
const JukeboxController = require('../controllers/jukeboxController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/songs', JukeboxController.getAvailableSongs);

router.post('/request', JukeboxController.makeRequest);

router.post('/suggest', JukeboxController.makeSuggestion);

module.exports = router;