const db = require('../../config/database');

class JukeboxModel {
    static async findAvailableSongsByWeekday(weekday) {
        const songSql = `
            SELECT s.*, a.id as artist_id, a.name AS artist_name
            FROM songs s
            JOIN artists a ON s.artist_id = a.id
            JOIN song_weekdays sw ON s.id = sw.song_id
            WHERE sw.weekday = ? AND a.name <> 'Comercial'
        `;
        const [songs] = await db.execute(songSql, [weekday]);

        if (songs.length === 0) {
            return [];
        }

        const songIds = songs.map(s => s.id);

        const featuringArtistsSql = `
            SELECT sfa.song_id, a.id, a.name
            FROM song_featuring_artists sfa
            JOIN artists a ON sfa.artist_id = a.id
            WHERE sfa.song_id IN (?)
        `;
        const [featuringArtists] = await db.execute(featuringArtistsSql, [songIds]);

        const featuringArtistsMap = featuringArtists.reduce((acc, current) => {
            const { song_id, ...artistData } = current;
            if (!acc[song_id]) {
                acc[song_id] = [];
            }
            acc[song_id].push(artistData);
            return acc;
        }, {});

        const enrichedSongs = songs.map(song => ({
            ...song,
            featuring_artists: featuringArtistsMap[song.id] || []
        }));

        return enrichedSongs;
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