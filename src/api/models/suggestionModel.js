const db = require('../../config/database');

class SuggestionModel {
    static async create({ song_title, artist_name, requester_info }) {
        const [result] = await db.execute(
            'INSERT INTO suggestions (song_title, artist_name, requester_info) VALUES (?, ?, ?)',
            [song_title, artist_name, requester_info]
        );
        return { id: result.insertId, song_title, artist_name, requester_info };
    }

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