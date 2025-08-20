const db = require('../../config/database');

class BannedSongModel {
    static async findAllActive() {
        const sql = `
            SELECT 
                bs.song_id,
                s.title,
                a.name as artist_name,
                bs.ban_type
            FROM banned_songs bs
            JOIN songs s ON bs.song_id = s.id
            JOIN artists a ON s.artist_id = a.id
            WHERE bs.expires_at > NOW() OR bs.expires_at IS NULL
            ORDER BY bs.banned_at DESC
        `;
        const [rows] = await db.execute(sql);
        return rows;
    }

    static async remove(songId) {
        const [result] = await db.execute('DELETE FROM banned_songs WHERE song_id = ?', [songId]);
        return result.affectedRows;
    }
}

module.exports = BannedSongModel;