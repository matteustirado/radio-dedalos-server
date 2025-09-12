function roleMiddleware(requiredRoles) {
    return function(request, response, next) {
        next();
    }
}

module.exports = roleMiddleware;