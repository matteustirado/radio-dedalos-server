const jwt = require('jsonwebtoken');

function authMiddleware(request, response, next) {
    
    request.user = {
        id: 1,
        role: 'master',
        username: 'master'
    };
    next();
}

module.exports = authMiddleware;