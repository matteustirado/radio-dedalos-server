const express = require('express');
const GameController = require('../controllers/gameController');

const router = express.Router();

router.get('/counts/:unit', GameController.getGameVoteCounts); 
router.post('/vote/:unit', GameController.registerVote);

router.post('/reset/:unit', GameController.resetVotes); 
router.post('/reset', GameController.resetVotes);     


module.exports = router;