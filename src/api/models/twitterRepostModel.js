const db = require('../../config/database');

class TwitterRepostModel {
    static async findAllByLocation(locationSlug) {
        const [rows] = await db.execute('SELECT * FROM twitter_reposts WHERE location_slug = ? ORDER BY created_at DESC', [locationSlug]);
        return rows;
    }

    static async create(repostData) {
        const { author, date, text, profile_photo_url, image_url, location_slug } = repostData;
        const sql = 'INSERT INTO twitter_reposts (author, date, text, profile_photo_url, image_url, location_slug) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await db.execute(sql, [author, date, text, profile_photo_url, image_url, location_slug]);
        return { id: result.insertId, ...repostData };
    }

    static async delete(id) {
        const [result] = await db.execute('DELETE FROM twitter_reposts WHERE id = ?', [id]);
        return result.affectedRows;
    }

    static async deleteOldReposts() {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        const [result] = await db.execute('DELETE FROM twitter_reposts WHERE created_at < ?', [twoDaysAgo]);
        return result.affectedRows;
    }
}

module.exports = TwitterRepostModel;