const db = require('../../config/database');

class SettingModel {
    static async find(key) {
        const [rows] = await db.execute('SELECT setting_value FROM settings WHERE setting_key = ?', [key]);
        return rows[0];
    }

    static async upsert(key, value) {
        const sql = 'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?';
        const [result] = await db.execute(sql, [key, value, value]);
        return result.affectedRows;
    }
}

module.exports = SettingModel;