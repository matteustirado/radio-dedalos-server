const express = require('express');

const router = express.Router();

const TwitterRepostController = require('../controllers/twitterRepostController');

router.get('/:locationSlug', TwitterRepostController.getAllByLocation);
router.post('/scrape', TwitterRepostController.scrapeAndCreate);
router.delete('/:id', TwitterRepostController.deleteRepost);

module.exports = router;