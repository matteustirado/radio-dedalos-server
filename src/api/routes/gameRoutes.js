const express = require('express');
const GameController = require('../controllers/gameController');

const router = express.Router();

router.post('/trigger-vote', GameController.triggerVoteScreen);
router.get('/trigger-vote-manual', GameController.triggerVoteScreen);
router.post('/simulate-placard', GameController.simulatePlacard);

module.exports = router;