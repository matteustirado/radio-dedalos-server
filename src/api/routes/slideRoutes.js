const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const SlideController = require('../controllers/slideController');

const router = express.Router();

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const dir = path.join('public/assets/uploads/', req.params.locationSlug);
        fs.mkdirSync(dir, {
            recursive: true
        });
        cb(null, dir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Por favor, envie apenas arquivos de imagem.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter
});

router.get('/:locationSlug/:dayOfWeek', SlideController.getSlidesByDay);
router.get('/:locationSlug', SlideController.getAllSlidesGrouped);
router.post(
    '/:locationSlug',
    upload.array('slideImages', 12),
    SlideController.uploadSlides
);
router.delete(
    '/:slideId',
    SlideController.deleteSlide
);

module.exports = router;