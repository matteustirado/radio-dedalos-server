const db = require('../config/database');

const logService = {
    logAction: async (request, action, details = null) => {
        try {
            const userId = request.user ? request.user.id : null;
            const username = request.user ? request.user.username : 'Sistema';
            const ipAddress = request.ip || request.connection.remoteAddress;

            const sql = 'INSERT INTO action_logs (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)';
            await db.execute(sql, [userId, username, action, JSON.stringify(details), ipAddress]);
        } catch (error) {
            console.error('Falha ao registrar log de ação:', error);
        }
    }
};

module.exports = logService;