const db = require('../../config/database');

class SuggestionModel {
    static async create({ song_title, artist_name, requester_info, unit }) {
        const [result] = await db.execute(
            'INSERT INTO suggestions (song_title, artist_name, requester_info, unit) VALUES (?, ?, ?, ?)',
            [song_title, artist_name, requester_info, unit]
        );
        return { id: result.insertId, song_title, artist_name, requester_info, unit };
    }

    static async findAllByStatus({ status, month, year }) {
        let sql = 'SELECT * FROM suggestions WHERE status = ?';
        const params = [status];

        if (status !== 'pendente' && month && year) {
            sql += ' AND MONTH(created_at) = ? AND YEAR(created_at) = ?';
            params.push(month, year);
        }

        sql += ' ORDER BY created_at DESC';

        const [rows] = await db.execute(sql, params);
        return rows;
    }

    static async updateStatus(id, newStatus) {
        const [result] = await db.execute(
            'UPDATE suggestions SET status = ? WHERE id = ?',
            [newStatus, id]
        );
        return result.affectedRows;
    }

    static async delete(id) {
        const [result] = await db.execute('DELETE FROM suggestions WHERE id = ?', [id]);
        return result.affectedRows;
    }
}

module.exports = SuggestionModel;