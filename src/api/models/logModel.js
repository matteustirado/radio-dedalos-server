const db = require('../../config/database');

class LogModel {
    static async findAll() {
        const [rows] = await db.execute('SELECT * FROM action_logs ORDER BY created_at DESC LIMIT 100');
        return rows;
    }
}

module.exports = LogModel;