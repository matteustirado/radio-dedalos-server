const express = require('express');
const MoodVoteController = require('../controllers/moodVoteController');

const router = express.Router();

router.post('/', MoodVoteController.createVote);

module.exports = router;