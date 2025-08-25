const db = require('../../config/database');

class BanRequestModel {
    static async create({ song_id, user_id, ban_period }) {
        const [result] = await db.execute(
            'INSERT INTO ban_requests (song_id, user_id, ban_period) VALUES (?, ?, ?)',
            [song_id, user_id, ban_period]
        );
        return { id: result.insertId, song_id, user_id, ban_period };
    }

    static async findAllByStatus({ status, month, year }) {
        let sql = `
            SELECT 
                br.id, 
                br.status, 
                br.ban_period, 
                br.created_at,
                s.title AS song_title,
                a.name AS artist_name,
                u.username AS user_name
            FROM ban_requests br
            JOIN songs s ON br.song_id = s.id
            JOIN artists a ON s.artist_id = a.id
            JOIN users u ON br.user_id = u.id
        `;
        
        const params = [];
        const whereClauses = [];

        if (status) {
            whereClauses.push('br.status = ?');
            params.push(status);

            if (status !== 'pendente' && month && year) {
                whereClauses.push('MONTH(br.created_at) = ? AND YEAR(br.created_at) = ?');
                params.push(month, year);
            }
        }

        if (whereClauses.length > 0) {
            sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        sql += ' ORDER BY br.created_at DESC';

        const [rows] = await db.execute(sql, params);
        return rows;
    }

    static async updateStatus(id, newStatus) {
        const [result] = await db.execute(
            'UPDATE ban_requests SET status = ? WHERE id = ?',
            [newStatus, id]
        );
        return result.affectedRows;
    }

    static async delete(id) {
        const [result] = await db.execute('DELETE FROM ban_requests WHERE id = ?', [id]);
        return result.affectedRows;
    }
}

module.exports = BanRequestModel;