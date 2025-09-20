const express = require('express');
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/login', AuthController.login);

router.get('/profile', authMiddleware, (request, response) => {
    response.status(200).json({
        message: 'Você está vendo uma rota protegida!',
        user: request.user
    });
});

module.exports = router;