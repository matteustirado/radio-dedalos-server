const express = require('express');
const multer = require('multer');
const SongController = require('../controllers/songController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', SongController.getAllSongs);
router.get('/:id', SongController.getSongById);

router.post('/extract-metadata', authMiddleware, roleMiddleware(['admin', 'master']), upload.single('mediaFile'), SongController.extractMetadata);

router.post('/', authMiddleware, roleMiddleware(['admin', 'master']), upload.single('mediaFile'), SongController.createSong);
router.put('/:id', authMiddleware, roleMiddleware(['admin', 'master']), upload.single('mediaFile'), SongController.updateSong);
router.delete('/:id', authMiddleware, roleMiddleware(['admin', 'master']), SongController.deleteSong);

router.post('/:id/categories', authMiddleware, roleMiddleware(['admin', 'master']), SongController.manageSongCategories);
router.post('/:id/weekdays', authMiddleware, roleMiddleware(['admin', 'master']), SongController.manageSongWeekdays);

router.post('/:id/featuring', authMiddleware, roleMiddleware(['admin', 'master']), async (request, response) => {
    try {
        const {
            id
        } = request.params;
        const {
            artistIds
        } = request.body;

        const SongModel = require('../models/songModel');

        await SongModel.manageFeaturingArtists(id, artistIds);

        response.status(200).json({
            message: 'Artistas participantes atualizados com sucesso.'
        });
    } catch (error) {
        response.status(500).json({
            message: 'Erro ao gerenciar artistas participantes.',
            error: error.message
        });
    }
});

module.exports = router;