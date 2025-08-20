const UserModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const logService = require('../../services/logService');

class AuthController {
    static async login(request, response) {
        const {
            username,
            password
        } = request.body;

        if (!username || !password) {
            return response.status(400).json({
                message: 'Usuário e senha são obrigatórios.'
            });
        }

        try {
            const user = await UserModel.findByUsername(username);

            if (!user) {
                return response.status(401).json({
                    message: 'Credenciais inválidas.'
                });
            }

            const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);

            if (!isPasswordCorrect) {
                return response.status(401).json({
                    message: 'Credenciais inválidas.'
                });
            }

            const token = jwt.sign({
                id: user.id,
                role: user.role,
                username: user.username
            },
            process.env.JWT_SECRET, {
                expiresIn: '8h'
            });

            request.user = {
                id: user.id,
                username: user.username
            };
            await logService.logAction(request, 'LOGIN_SUCCESS');

            response.status(200).json({
                message: 'Login bem-sucedido!',
                token: token
            });

        } catch (error) {
            response.status(500).json({
                message: 'Erro interno do servidor.'
            });
        }
    }
}

module.exports = AuthController;