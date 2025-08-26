const db = require('../../config/database');

class BannedModel {
    static async create({ song_id, user_id, ban_period }) {
        let expires_at = null;
        if (ban_period === 'today') {
            expires_at = new Date();
            expires_at.setHours(23, 59, 59, 999);
        } else if (ban_period === 'week') {
            const now = new Date();
            expires_at = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }

        const [result] = await db.execute(
            'INSERT INTO song_bans (song_id, user_id, ban_period, expires_at) VALUES (?, ?, ?, ?)',
            [song_id, user_id, ban_period, expires_at]
        );
        return { id: result.insertId, song_id, user_id, ban_period };
    }

    static async deactivate(banId) {
        const [result] = await db.execute(
            'UPDATE song_bans SET is_active = FALSE WHERE id = ?',
            [banId]
        );
        return result.affectedRows;
    }

    static async findAllForManager({ manager_status, month, year }) {
        let sql = `
            SELECT 
                sb.id, 
                sb.manager_status, 
                sb.ban_period, 
                sb.banned_at,
                sb.is_active,
                s.title AS song_title,
                a.name AS artist_name,
                u.username AS user_name
            FROM song_bans sb
            JOIN songs s ON sb.song_id = s.id
            JOIN artists a ON s.artist_id = a.id
            LEFT JOIN users u ON sb.user_id = u.id
        `;
        
        const params = [];
        const whereClauses = [];

        if (manager_status) {
            whereClauses.push('sb.manager_status = ?');
            params.push(manager_status);
        }

        if (month && year) {
            whereClauses.push('MONTH(sb.banned_at) = ? AND YEAR(sb.banned_at) = ?');
            params.push(month, year);
        }

        if (whereClauses.length > 0) {
            sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        sql += ' ORDER BY sb.banned_at DESC';

        const [rows] = await db.execute(sql, params);
        return rows;
    }

    static async findAllActive() {
        const sql = `
            SELECT 
                sb.id, 
                sb.song_id,
                sb.ban_period,
                s.title as song_title,
                a.name as artist_name
            FROM song_bans sb
            JOIN songs s ON sb.song_id = s.id
            JOIN artists a ON s.artist_id = a.id
            WHERE 
                sb.is_active = TRUE 
                AND (sb.expires_at > NOW() OR sb.expires_at IS NULL)
        `;
        const [rows] = await db.execute(sql);
        return rows;
    }

    static async updateManagerStatus(id, newStatus) {
        const [result] = await db.execute(
            'UPDATE song_bans SET manager_status = ? WHERE id = ?',
            [newStatus, id]
        );
        return result.affectedRows;
    }
}

module.exports = BannedModel;