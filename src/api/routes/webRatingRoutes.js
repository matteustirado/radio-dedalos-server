const express = require('express');
const WebRatingController = require('../controllers/webRatingController');

const router = express.Router();

router.get('/reviews/:locationSlug', WebRatingController.getGoogleReviews);
router.get('/tweets/:locationSlug', WebRatingController.getTwitterReposts);

module.exports = router;