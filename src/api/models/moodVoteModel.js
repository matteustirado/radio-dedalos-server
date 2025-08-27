const db = require('../../config/database');

class MoodVoteModel {
    static async create({ rating, comment, wristband_code, unit }) {
        const sql = 'INSERT INTO mood_votes (rating, comment, wristband_code, unit) VALUES (?, ?, ?, ?)';
        const [result] = await db.execute(sql, [rating, comment, wristband_code, unit]);
        return { id: result.insertId, rating, comment, wristband_code, unit };
    }
}

module.exports = MoodVoteModel;