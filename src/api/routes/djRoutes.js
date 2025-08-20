const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const DjController = require('../controllers/djController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

const overlayDir = path.resolve(__dirname, '../../../public/assets/uploads/overlay');
if (!fs.existsSync(overlayDir)) {
    fs.mkdirSync(overlayDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, overlayDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + path.extname(file.originalname);
        cb(null, 'overlay-' + uniqueSuffix);
    }
});

const upload = multer({ storage: storage });

router.get('/queue', DjController.getLiveQueue);

router.use(authMiddleware, roleMiddleware(['dj', 'admin', 'master']));

router.post('/control/overlay', upload.single('overlayImage'), DjController.uploadOverlay);
router.get('/info', DjController.getPlaylistInfo);
router.post('/control/play', DjController.play);
router.post('/control/skip', DjController.skip);
router.post('/control/toggle-pause', DjController.togglePause);
router.post('/control/set-volume', DjController.setVolume);
router.post('/control/add-priority', DjController.addPriority);
router.post('/control/activate-playlist/:id', DjController.activatePlaylist);
router.post('/control/reorder-queue', DjController.reorderQueue);
router.post('/control/ban', DjController.banSong);
router.post('/control/promote', DjController.promoteRequest);
router.post('/control/play-commercial', DjController.playCommercial);

module.exports = router;