const db = require('../../config/database');

class GameVoteModel {
    static async create({ unit, pulseiraId, optionLabel }) {
        const sql = `
            INSERT INTO game_votes (unit, pulseira_id, option_label) 
            VALUES (?, ?, ?)
        `;
        const [result] = await db.execute(sql, [unit, pulseiraId, optionLabel]);
        return { id: result.insertId, unit, pulseiraId, optionLabel };
    }
}

module.exports = GameVoteModel;