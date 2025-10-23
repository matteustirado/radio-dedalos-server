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

    static async getVoteCounts(unit) {
        const sql = `
            SELECT option_label, COUNT(*) as vote_count
            FROM game_votes
            WHERE unit = ?
            GROUP BY option_label
            ORDER BY vote_count DESC
        `;
        const [rows] = await db.execute(sql, [unit]);
        
        const voteCounts = {};
        rows.forEach(row => {
            voteCounts[row.option_label] = parseInt(row.vote_count, 10);
        });
        
        return voteCounts;
    }
    
    static async clearVotes(unit) {
        const [result] = await db.execute('DELETE FROM game_votes WHERE unit = ?', [unit]);
        return result.affectedRows;
    }
}

module.exports = GameVoteModel;