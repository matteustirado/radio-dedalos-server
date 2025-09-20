const express = require('express');
const PlaylistController = require('../controllers/playlistController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

const viewRoles = ['admin', 'master', 'playlist_creator', 'dj'];
const modificationRoles = ['admin', 'master', 'playlist_creator'];
const activationRoles = ['admin', 'master', 'dj'];

router.get('/current', PlaylistController.getCurrentSong);

router.get('/', authMiddleware, roleMiddleware(viewRoles), PlaylistController.getAllPlaylists);
router.get('/:id', authMiddleware, roleMiddleware(viewRoles), PlaylistController.getPlaylistDetails);

router.post('/', authMiddleware, roleMiddleware(modificationRoles), PlaylistController.createPlaylist);
router.post('/:id/activate', authMiddleware, roleMiddleware(activationRoles), PlaylistController.activatePlaylist);
router.put('/:id', authMiddleware, roleMiddleware(modificationRoles), PlaylistController.updatePlaylist);
router.delete('/:id', authMiddleware, roleMiddleware(modificationRoles), PlaylistController.deletePlaylist);
router.post('/:id/items', authMiddleware, roleMiddleware(modificationRoles), PlaylistController.managePlaylistItems);

module.exports = router;