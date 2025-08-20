const express = require('express');
const ArtistController = require('../controllers/artistController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', ArtistController.getAllArtists);

router.post('/', authMiddleware, roleMiddleware(['admin', 'master']), ArtistController.createArtist);
router.put('/:id', authMiddleware, roleMiddleware(['admin', 'master']), ArtistController.updateArtist);
router.delete('/:id', authMiddleware, roleMiddleware(['admin', 'master']), ArtistController.deleteArtist);

module.exports = router;