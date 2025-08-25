const db = require('../../config/database');

class RequestHistoryModel {
    static async create({ song_id, requester_type, requester_identifier }) {
        const sql = 'INSERT INTO request_history (song_id, requester_type, requester_identifier) VALUES (?, ?, ?)';
        const [result] = await db.execute(sql, [song_id, requester_type, requester_identifier]);
        return { id: result.insertId, song_id, requester_type, requester_identifier };
    }

    static async findAll({ month, year }) {
        let filterMonth = month;
        let filterYear = year;

        
        if (!filterMonth || !filterYear) {
            const now = new Date();
            filterMonth = now.getMonth() + 1; 
            filterYear = now.getFullYear();
        }

        const sql = `
            SELECT 
                rh.id,
                rh.requester_type,
                rh.requester_identifier,
                rh.created_at,
                s.title AS song_title,
                a.name AS artist_name
            FROM request_history rh
            JOIN songs s ON rh.song_id = s.id
            JOIN artists a ON s.artist_id = a.id
            WHERE MONTH(rh.created_at) = ? AND YEAR(rh.created_at) = ?
            ORDER BY rh.created_at DESC
        `;
        
        const params = [filterMonth, filterYear];
        const [rows] = await db.execute(sql, params);
        return rows;
    }
}

module.exports = RequestHistoryModel;