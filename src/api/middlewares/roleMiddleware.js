function roleMiddleware(requiredRoles) {
    const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    return function(request, response, next) {
        const userRole = request.user.role;

        if (!allowedRoles.includes(userRole)) {
            return response.status(403).json({
                message: 'Acesso negado. Você não tem permissão para realizar esta ação.'
            });
        }

        next();
    }
}

module.exports = roleMiddleware;