const db = require('../../config/database');

class RankingModel {
    static async createVote({ artist_name, wristband_code, unit }) {
        const sql = 'INSERT INTO artist_votes (artist_name, wristband_code, unit) VALUES (?, ?, ?)';
        const [result] = await db.execute(sql, [artist_name, wristband_code, unit]);
        return { id: result.insertId, artist_name };
    }

    static async getRankings(timePeriod, unit) {
        let startDate, endDate;
        const now = new Date();
        const dayOfWeek = now.getDay(); 
        const dayDiff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        const mondayOfThisWeek = new Date();
        mondayOfThisWeek.setDate(now.getDate() - dayDiff);
        mondayOfThisWeek.setHours(0, 0, 0, 0);

        if (timePeriod === 'previous_week') {
            endDate = new Date(mondayOfThisWeek.getTime());
            startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else { 
            startDate = mondayOfThisWeek;
            endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
        
        const sql = `
            SELECT artist_name, COUNT(*) as vote_count
            FROM artist_votes
            WHERE unit = ? AND voted_at >= ? AND voted_at < ?
            GROUP BY artist_name
            ORDER BY vote_count DESC
        `;
        
        const params = [unit, startDate, endDate];
        const [rows] = await db.execute(sql, params);
        return rows;
    }
}

module.exports = RankingModel;