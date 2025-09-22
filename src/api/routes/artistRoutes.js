const express = require('express');
const ArtistController = require('../controllers/artistController');

const router = express.Router();

router.get('/', ArtistController.getAllArtists);
router.post('/', ArtistController.createArtist);
router.put('/:id', ArtistController.updateArtist);
router.delete('/:id', ArtistController.deleteArtist);

module.exports = router;