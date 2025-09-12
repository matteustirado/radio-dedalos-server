const express = require('express');
const AuthController = require('../controllers/authController');

const router = express.Router();

router.post('/login', AuthController.login);

router.get('/profile', (request, response) => {
    
    const user = {
        id: 1,
        role: 'master',
        username: 'master'
    };
    response.status(200).json({
        message: 'Você está vendo uma rota que antes era protegida!',
        user: user
    });
});

module.exports = router;