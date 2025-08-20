const db = require('../../config/database');

class SuggestionModel {
    static async findAll() {
        const [rows] = await db.execute(
            'SELECT * FROM suggestions ORDER BY created_at DESC'
        );
        return rows;
    }

    static async delete(id) {
        const [result] = await db.execute('DELETE FROM suggestions WHERE id = ?', [id]);
        return result.affectedRows;
    }
}

module.exports = SuggestionModel;