const express = require('express');
const RankingController = require('../controllers/rankingController');

const router = express.Router();

router.post('/vote', RankingController.createVote);
router.get('/', RankingController.getRankings);

module.exports = router;