const db = require('../../config/database');

class SongModel {
    static async findAll(options = {}) {
        const { includeCommercials = false, excludeBanned = false } = options;

        let bannedSongIds = [];
        if (excludeBanned) {
            const [bannedRows] = await db.execute(`
                SELECT song_id FROM song_bans 
                WHERE is_active = TRUE AND (expires_at > NOW() OR expires_at IS NULL)
            `);
            bannedSongIds = bannedRows.map(row => row.song_id);
        }

        let songsSql = `
            SELECT s.*, a.name as artist_name, rl.name as record_label_name 
            FROM songs s
            LEFT JOIN record_labels rl ON s.record_label_id = rl.id
            JOIN artists a ON s.artist_id = a.id
        `;

        const whereClauses = [];
        const params = [];

        if (!includeCommercials) {
            whereClauses.push(`a.name <> ?`);
            params.push('Comercial');
        }

        if (excludeBanned && bannedSongIds.length > 0) {
            whereClauses.push(`s.id NOT IN (?)`);
            params.push(bannedSongIds);
        }
        
        if (whereClauses.length > 0) {
            songsSql += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        const [songs] = await db.query(songsSql, params);

        if (songs.length === 0) {
            return [];
        }

        const songIds = songs.map(s => s.id);

        const featuringSql = `
            SELECT sfa.song_id, a.id, a.name 
            FROM song_featuring_artists sfa
            JOIN artists a ON sfa.artist_id = a.id
            WHERE sfa.song_id IN (?)
        `;
        const [featuring] = await db.query(featuringSql, [songIds]);

        const categoriesSql = `
            SELECT sc.song_id, c.id, c.name 
            FROM song_categories sc
            JOIN categories c ON sc.category_id = c.id
            WHERE sc.song_id IN (?)
        `;
        const [categories] = await db.query(categoriesSql, [songIds]);

        const weekdaysSql = `
            SELECT song_id, weekday 
            FROM song_weekdays 
            WHERE song_id IN (?)
        `;
        const [weekdays] = await db.query(weekdaysSql, [songIds]);

        const featuringMap = new Map();
        featuring.forEach(feat => {
            if (!featuringMap.has(feat.song_id)) {
                featuringMap.set(feat.song_id, []);
            }
            featuringMap.get(feat.song_id).push({
                id: feat.id,
                name: feat.name
            });
        });
        
        const categoryMap = new Map();
        categories.forEach(cat => {
            if (!categoryMap.has(cat.song_id)) {
                categoryMap.set(cat.song_id, []);
            }
            categoryMap.get(cat.song_id).push({
                id: cat.id,
                name: cat.name
            });
        });

        const weekdayMap = new Map();
        weekdays.forEach(day => {
            if (!weekdayMap.has(day.song_id)) {
                weekdayMap.set(day.song_id, []);
            }
            weekdayMap.get(day.song_id).push(day.weekday);
        });

        songs.forEach(song => {
            song.featuring_artists = featuringMap.get(song.id) || [];
            song.categories = categoryMap.get(song.id) || [];
            song.weekdays = weekdayMap.get(song.id) || [];
        });

        return songs;
    }

    static async findAllCommercials() {
        const sql = `
            SELECT s.* FROM songs s
            JOIN artists a ON s.artist_id = a.id
            WHERE a.name = 'Comercial'
        `;
        const [rows] = await db.execute(sql);
        return rows;
    }

    static async findById(id) {
        const songSql = `
            SELECT s.*, a.name as artist_name, rl.name as record_label_name
            FROM songs s
            JOIN artists a ON s.artist_id = a.id
            LEFT JOIN record_labels rl ON s.record_label_id = rl.id
            WHERE s.id = ?
        `;
        const [songRows] = await db.execute(songSql, [id]);
        if (!songRows[0]) return null;

        const song = songRows[0];

        const featuringSql = `
            SELECT a.id, a.name 
            FROM artists a
            JOIN song_featuring_artists sfa ON a.id = sfa.artist_id
            WHERE sfa.song_id = ?
        `;
        const [featuringRows] = await db.execute(featuringSql, [id]);
        song.featuring_artists = featuringRows;

        const weekdaysSql = `SELECT weekday FROM song_weekdays WHERE song_id = ?`;
        const [weekdayRows] = await db.execute(weekdaysSql, [id]);
        song.weekdays = weekdayRows.map(row => row.weekday);
        
        const categoriesSql = `
            SELECT c.id, c.name 
            FROM categories c
            JOIN song_categories sc ON c.id = sc.category_id
            WHERE sc.song_id = ?
        `;
        const [categoryRows] = await db.execute(categoriesSql, [id]);
        song.categories = categoryRows;

        return song;
    }

    static async create(songData) {
        const {
            title,
            artist_id,
            record_label_id,
            album,
            release_year,
            director,
            filename,
            duration_seconds
        } = songData;
        const finalYear = (release_year === '' || release_year === undefined || release_year === null) ? null : release_year;

        const sql = 'INSERT INTO songs (title, artist_id, record_label_id, album, release_year, director, filename, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        const [result] = await db.execute(sql, [title, artist_id, record_label_id || null, album, finalYear, director, filename, duration_seconds]);
        return {
            id: result.insertId,
            ...songData
        };
    }

    static async update(id, songData) {
        const fields = [];
        const values = [];

        const columnMap = {
            releaseYear: 'release_year',
            label_id: 'record_label_id',
        };

        Object.keys(songData).forEach(key => {
            const dbKey = columnMap[key] || key;
            if (songData[key] !== undefined) {
                fields.push(`${dbKey} = ?`);
                if (dbKey === 'release_year' && (songData[key] === '' || songData[key] === null)) {
                    values.push(null);
                } else {
                    values.push(songData[key]);
                }
            }
        });

        if (fields.length === 0) {
            return 1;
        }

        const sql = `UPDATE songs SET ${fields.join(', ')} WHERE id = ?`;
        values.push(id);

        const [result] = await db.execute(sql, values);
        return result.affectedRows;
    }

    static async delete(id) {
        const [result] = await db.execute('DELETE FROM songs WHERE id = ?', [id]);
        return result.affectedRows;
    }

    static async linkDriveFile(songId, googleDriveFileId) {
        const sql = 'UPDATE songs SET google_drive_file_id = ? WHERE id = ?';
        const [result] = await db.execute(sql, [googleDriveFileId, songId]);
        return result.affectedRows;
    }

    static async manageCategories(songId, categoryIds) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('DELETE FROM song_categories WHERE song_id = ?', [songId]);
            if (categoryIds && categoryIds.length > 0) {
                const values = categoryIds.map(categoryId => [songId, categoryId]);
                await connection.query('INSERT INTO song_categories (song_id, category_id) VALUES ?', [values]);
            }
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async manageWeekdays(songId, weekdays) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('DELETE FROM song_weekdays WHERE song_id = ?', [songId]);
            if (weekdays && weekdays.length > 0) {
                const values = weekdays.map(day => [songId, day]);
                await connection.query('INSERT INTO song_weekdays (song_id, weekday) VALUES ?', [values]);
            }
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async manageFeaturingArtists(songId, artistIds) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('DELETE FROM song_featuring_artists WHERE song_id = ?', [songId]);
            if (artistIds && artistIds.length > 0) {
                const values = artistIds.map(artistId => [songId, artistId]);
                await connection.query('INSERT INTO song_featuring_artists (song_id, artist_id) VALUES ?', [values]);
            }
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = SongModel;