const db = require('../../config/database');

class PlaylistModel {
    static async create(playlistData) {
        const { name, type, special_type, status, weekday, scheduled_date, scheduled_time } = playlistData;
        const sql = 'INSERT INTO playlists (name, type, special_type, status, weekday, scheduled_date, scheduled_time) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const params = [
            name,
            type,
            special_type || null,
            status || 'rascunho',
            weekday || null,
            scheduled_date || null,
            scheduled_time || null
        ];
        const [result] = await db.execute(sql, params);
        return this.findById(result.insertId);
    }

    static async findAll(status = null) {
        let sql = `
            SELECT
                p.*,
                COUNT(pi.song_id) AS song_count,
                COALESCE(SUM(s.duration_seconds), 0) AS total_duration
            FROM 
                playlists p
            LEFT JOIN 
                playlist_items pi ON p.id = pi.playlist_id
            LEFT JOIN 
                songs s ON pi.song_id = s.id
        `;
        const params = [];
        if (status) {
            sql += ' WHERE p.status = ?';
            params.push(status);
        }
        sql += ' GROUP BY p.id ORDER BY p.id DESC';

        const [playlists] = await db.execute(sql, params);
        return playlists;
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM playlists WHERE id = ?', [id]);
        if (!rows[0]) return null;

        const playlist = rows[0];
        if (playlist.type === 'especial' || playlist.type === 'diaria') {
            const [dates] = await db.execute('SELECT play_date FROM playlist_dates WHERE playlist_id = ? ORDER BY play_date ASC', [id]);
            playlist.special_dates = dates.map(d => new Date(d.play_date));
        }

        const items = await this.getPlaylistItems(id);
        playlist.items = items;

        return playlist;
    }

    static async update(id, playlistData) {
        const { name, type, special_type, status, weekday, scheduled_date, scheduled_time } = playlistData;
        const sql = 'UPDATE playlists SET name = ?, type = ?, special_type = ?, status = ?, weekday = ?, scheduled_date = ?, scheduled_time = ? WHERE id = ?';
        const params = [
            name,
            type,
            special_type || null,
            status,
            weekday || null,
            scheduled_date || null,
            scheduled_time || null,
            id
        ];
        await db.execute(sql, params);
        return this.findById(id);
    }

    static async manageSpecialDates(playlistId, dates) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('DELETE FROM playlist_dates WHERE playlist_id = ?', [playlistId]);
            if (dates && dates.length > 0) {
                const values = dates.map(date => [playlistId, new Date(date).toISOString().split('T')[0]]);
                await connection.query('INSERT INTO playlist_dates (playlist_id, play_date) VALUES ?', [values]);
            }
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async delete(id) {
        const [result] = await db.execute('DELETE FROM playlists WHERE id = ?', [id]);
        return result.affectedRows;
    }

    static async getPlaylistItems(playlistId) {
        const sql = `
            SELECT 
                pi.sequence_order, 
                s.id as song_id, 
                s.title, 
                s.album,
                s.director,
                s.filename,
                s.duration_seconds,
                a.name as artist_name,
                rl.name as record_label_name
            FROM playlist_items pi
            JOIN songs s ON pi.song_id = s.id
            JOIN artists a ON s.artist_id = a.id
            LEFT JOIN record_labels rl ON s.record_label_id = rl.id
            WHERE pi.playlist_id = ?
            ORDER BY pi.sequence_order ASC
        `;
        const [rows] = await db.execute(sql, [playlistId]);
        return rows;
    }

    static async managePlaylistItems(playlistId, items) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('DELETE FROM playlist_items WHERE playlist_id = ?', [playlistId]);
            if (items && items.length > 0) {
                const values = items.map(item => [playlistId, item.song_id, item.sequence_order]);
                await connection.query('INSERT INTO playlist_items (playlist_id, song_id, sequence_order) VALUES ?', [values]);
            }
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async findPlaylistsForScheduler(weekday, date, time) {
        const specificSql = `
            SELECT p.*
            FROM playlists p
            LEFT JOIN playlist_dates pd ON p.id = pd.playlist_id
            WHERE
                p.status = 'publicada'
                AND p.scheduled_time = ?
                AND (
                    (p.type = 'diaria' AND pd.play_date = ?)
                    OR
                    (p.type = 'padrao' AND p.weekday = ?)
                    OR
                    (p.type = 'especial' AND p.special_type = 'semanal' AND p.weekday = ?)
                )
            ORDER BY FIELD(p.type, 'diaria', 'especial', 'padrao')
            LIMIT 1
        `;
        const [specificRows] = await db.execute(specificSql, [time, date, weekday, weekday]);
        const specificPlaylist = specificRows[0] ? await this.findById(specificRows[0].id) : null;

        const fallbackSql = `
            SELECT p.*
            FROM playlists p
            WHERE
                p.status = 'publicada'
                AND p.type = 'padrao'
                AND p.weekday = ?
            LIMIT 1
        `;
        const [fallbackRows] = await db.execute(fallbackSql, [weekday]);
        const fallbackPlaylist = fallbackRows[0] ? await this.findById(fallbackRows[0].id) : null;
        
        return { specificPlaylist, fallbackPlaylist };
    }
}

module.exports = PlaylistModel;