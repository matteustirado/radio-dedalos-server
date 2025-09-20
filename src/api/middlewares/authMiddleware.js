const jwt = require('jsonwebtoken');

function authMiddleware(request, response, next) {
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return response.status(401).json({
            message: 'Acesso negado. Token não fornecido ou mal formatado.'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        request.user = decoded;
        next();
    } catch (error) {
        return response.status(403).json({
            message: 'Token inválido ou expirado.'
        });
    }
}

module.exports = authMiddleware;