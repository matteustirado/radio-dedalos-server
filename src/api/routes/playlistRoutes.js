const express = require('express');
const PlaylistController = require('../controllers/playlistController');

const router = express.Router();

router.get('/current', PlaylistController.getCurrentSong);

router.get('/', PlaylistController.getAllPlaylists);
router.get('/:id', PlaylistController.getPlaylistDetails);

router.post('/', PlaylistController.createPlaylist);
router.post('/:id/activate', PlaylistController.activatePlaylist);
router.put('/:id', PlaylistController.updatePlaylist);
router.delete('/:id', PlaylistController.deletePlaylist);
router.post('/:id/items', PlaylistController.managePlaylistItems);

module.exports = router;