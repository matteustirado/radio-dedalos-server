const db = require('../../config/database');

class JukeboxModel {
    static async findAvailableSongsByWeekday(weekday) {
        const sql = `
            SELECT s.id, s.title, a.name AS artist_name
            FROM songs s
            JOIN artists a ON s.artist_id = a.id
            JOIN song_weekdays sw ON s.id = sw.song_id
            WHERE sw.weekday = ? AND a.name <> 'Comercial'
        `;
        const [rows] = await db.execute(sql, [weekday]);
        return rows;
    }

    static async createSuggestion(suggestionData) {
        const {
            artist_name,
            song_title,
            requester_info
        } = suggestionData;
        const sql = 'INSERT INTO suggestions (artist_name, song_title, requester_info) VALUES (?, ?, ?)';
        const [result] = await db.execute(sql, [artist_name, song_title, requester_info || null]);
        return {
            id: result.insertId,
            ...suggestionData
        };
    }
}

module.exports = JukeboxModel;