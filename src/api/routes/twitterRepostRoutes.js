const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

const TwitterRepostController = require('../controllers/twitterRepostController');

const managementRoles = ['admin', 'master', 'playlist_creator', 'musics'];

router.get('/:locationSlug', TwitterRepostController.getAllByLocation);
router.post('/scrape', authMiddleware, roleMiddleware(managementRoles), TwitterRepostController.scrapeAndCreate);
router.delete('/:id', authMiddleware, roleMiddleware(managementRoles), TwitterRepostController.deleteRepost);

module.exports = router;